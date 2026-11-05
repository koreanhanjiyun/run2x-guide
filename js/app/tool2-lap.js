/* ============================================================
   도구 2 — 랩타임 시뮬레이터 (QSS, 감속비 고르기 포함) · docs/TOOLS-PLAN.md 5절 · docs/HANDOFF.md 4-2절
   - 코스: 내 코스(사용자가 만든 코스) · 오토크로스 · 내구레이스 · 가속 · 스키드패드 (공식 4개는 고칠 수 없는 기본 코스)
     공식 내구 코스 = js/data/fsk2026-course.js (FSK26), 모터 기본값 = js/data/emrax228.js (EMRAX228)
   - 차량 모델: 점질량 준정적 + 앞뒤 · 좌우 하중 이동 + 타이어 하중 감도 + 뒤축 구동, 모터 곡선(전압 보정) · 효율(상수 또는 맵) · 축전지(내부저항 · SOC)
   - 결과: 종목별 기록과 팀 목표 기록 차이, 종목별 가장 빠른 감속비와 배점 가중 제안, 내구 에너지 제한
   ============================================================ */
const T2KEY = 'run2x.wb.2.ext.v2';
const T2TRACK_EX = '25, 0   # 출발 직선\n5, 25   # 슬라럼 (파일런 간격 10 m)\n10, -25\n10, 25\n10, -25\n10, 25\n10, -25\n10, 25\n5, -25\n20, 0\n31.42, 20   # 왼쪽 90° (지름 40 m)\n40, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n30, 0\n15.71, 5   # 왼쪽 헤어핀 (지름 10 m)\n35, 0\n17.28, -5.5   # 오른쪽 헤어핀 (지름 11 m)\n35, 0\n23.56, 15   # 왼쪽 90° (지름 30 m)\n50, 0\n20.94, 30   # 완만한 굽이\n20.94, -30\n40, 0\n21.82, 25   # 반경이 줄어드는 왼쪽 회전\n8.38, 12\n42.32, 0\n15.71, 5   # 왼쪽 헤어핀\n30, 0\n17.28, -5.5   # 오른쪽 헤어핀\n25, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n20, 0\n28.27, 18   # 왼쪽 90° (지름 36 m)\n12.99, 0   # 결승 직선';
const T2TRACK_PH = '한 줄에 한 구간 — 종류, 길이 m, 반경 m\n직선, 54.0\n왼쪽, 2.2, 2.6\n오른쪽, 9.9, 18.1\n\n엑셀에서 열을 복사해 붙여 넣어도 됩니다.\n종류 대신 반경 부호도 됨: 왼쪽 +, 오른쪽 −, 직선 0 (예: 25, 0 · 15.7, -5)\n# 뒤는 메모';
const T2MOTOR_PH = '첫 줄은 열 이름, 그 아래 한 줄에 회전수와 토크\n회전수 rpm, 최대 토크 N·m, 연속 토크 N·m\n0, 230, 110\n4800, 230, 112\n6500, 180, 92\n\n토크 열이 여럿이면 위에서 쓸 열을 고릅니다.';
const T2EFF_PH = '비우면 왼쪽 입력 칸의 상수 효율을 씁니다.\n숫자 하나 = 상수 효율 [%] (예: 97)\n맵 = 첫 줄은 회전수, 첫 열은 토크, 칸은 효율 %\n토크 N·m \\ 회전수 rpm, 0, 2000, 4000\n50, 88, 93, 92\n150, 90, 95, 94\n230, 87, 93, 92';
const T2 = { tab:'course', course:'end', lap:{end:'1', free:'1'}, free:{text:'', closed:true, laps:1, s0:0}, mtext:'', mcol:1, eM:'', eI:'', timer:0 };
T2.free.text = T2TRACK_EX.split('\n').map(l => l).join('\n');
T2.mtext = (typeof EMRAX228!=='undefined' ? EMRAX228.torque : ''); T2.eM = (typeof EMRAX228!=='undefined' ? EMRAX228.eff : '');
const T2COURSES = ['free', 'ax', 'end', 'acc', 'skid'];
try{ const s = JSON.parse(localStorage.getItem(T2KEY) || '{}') || {};
  if(T2COURSES.includes(s.course)) T2.course = s.course; if(s.lap && typeof s.lap==='object') Object.assign(T2.lap, s.lap);
  if(s.free && typeof s.free.text==='string') Object.assign(T2.free, {text:s.free.text, closed:s.free.closed!==false, laps:Math.max(1, Math.round(+s.free.laps || 1)), s0:Math.max(0, +s.free.s0 || 0)});
  if(typeof s.mtext==='string') T2.mtext = s.mtext; if(s.mcol >= 1) T2.mcol = Math.round(s.mcol); if(typeof s.eM==='string') T2.eM = s.eM; if(typeof s.eI==='string') T2.eI = s.eI; }catch(e){}
const t2Save = () => { try{ localStorage.setItem(T2KEY, JSON.stringify({course:T2.course, lap:T2.lap, free:T2.free, mtext:T2.mtext, mcol:T2.mcol, eM:T2.eM, eI:T2.eI})); }catch(e){} };

/* ---------- 글 · 파일 → 표 ---------- */
/* ---------- 파일 가져오기: .csv · .txt · .xlsx ---------- */
/* 표의 한 줄(칸 배열) → 구간. 숫자 칸 두 개 = 길이 · 반경. '직선 · straight' 글자가 있으면 반경 0, '오른 · right · R' 글자가 있으면 반경을 −로. 숫자가 없는 줄(머리말)은 건너뜀 */
function t2CellsToRows(cells){ const rows = [];
  cells.forEach(cs => { const txt = cs.join(' '), nums = cs.map(c => String(c).trim()).filter(c => c!=='' && isFinite(+c)).map(Number); if(!nums.length) return;
    const note = cs.filter(c => String(c).trim()!=='' && !isFinite(+c)).join(' ').replace(/직선|회전|코너|왼쪽|오른쪽|straight|corner|left|right/gi, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if(/직선|straight/i.test(txt)){ rows.push({l:nums[0], R:0, note}); return; }
    if(nums.length < 2) return; let R = nums[1]; if(R > 0 && /오른|right|(^|[^a-z])r([^a-z]|$)/i.test(txt.replace(/[\d.\-]+/g, ''))) R = -R;
    rows.push({l:nums[0], R, note}); });
  return rows.filter(r => r.l > 0); }
/* .xlsx = zip 안의 XML. 브라우저 내장 압축 풀기(DecompressionStream)로 첫 시트만 읽음 (라이브러리 없음) */
async function t2Xlsx(buf){ const u = new Uint8Array(buf), dv = new DataView(buf), td = new TextDecoder();
  let e = u.length - 22; while(e >= 0 && dv.getUint32(e, true)!==0x06054b50) e--; if(e < 0) throw new Error('xlsx 파일 구조를 읽지 못했습니다');
  const n = dv.getUint16(e + 10, true), files = {}; let p = dv.getUint32(e + 16, true);
  for(let i = 0; i < n && dv.getUint32(p, true)===0x02014b50; i++){ const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    files[td.decode(u.subarray(p + 46, p + 46 + nl))] = {meth:dv.getUint16(p + 10, true), size:dv.getUint32(p + 20, true), off:dv.getUint32(p + 42, true)}; p += 46 + nl + xl + cl; }
  const get = async name => { const f = files[name]; if(!f) return null; const st = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), d = u.subarray(st, st + f.size);
    if(f.meth===0) return td.decode(d); return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); };
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const ss = await get('xl/sharedStrings.xml'), strs = ss ? [...xml(ss).getElementsByTagName('si')].map(si => si.textContent) : [];
  const sheet = Object.keys(files).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)))[0];
  if(!sheet) throw new Error('xlsx 안에서 시트를 찾지 못했습니다');
  const col = r => { const m = /^([A-Z]+)/.exec(r || ''); if(!m) return -1; let c = 0; for(const ch of m[1]) c = c*26 + ch.charCodeAt(0) - 64; return c - 1; };
  return [...xml(await get(sheet)).getElementsByTagName('row')].map(rw => { const out = [];
    [...rw.getElementsByTagName('c')].forEach((c, i) => { const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], k = col(c.getAttribute('r'));
      out[k >= 0 ? k : i] = t==='s' ? (strs[+(v && v.textContent)] || '') : t==='inlineStr' ? c.textContent : (v ? v.textContent : ''); });
    return Array.from(out, x => x==null ? '' : x); }); }
/* 글 → 칸 배열 (쉼표 · 세미콜론 · 탭, 없으면 칸띄움으로 나눔). # 뒤는 메모 */
const t2Lines = txt => String(txt || '').split(/\r?\n/).map((ln, i) => { const m = ln.match(/^([^#]*)(?:#(.*))?$/), body = (m[1] || '').trim();
  return {i: i + 1, note: (m[2] || '').trim(), cells: body ? (/[,;\t]/.test(body) ? body.split(/[,;\t]/) : body.split(/\s+/)).map(c => c.trim()) : []}; });
function t2Track(txt){ const rows = [], bad = [];
  t2Lines(txt).forEach(L => { if(!L.cells.length) return; const r = t2CellsToRows([L.cells]); if(r.length){ if(L.note) r[0].note = (r[0].note ? r[0].note + ' ' : '') + L.note; rows.push(r[0]); } else bad.push(L.i); });
  return {rows, bad, segs: rows.map(r => [r.l, r.R]), len: rows.reduce((a, r) => a + r.l, 0)}; }
/* 모터 토크 표: 첫 칸 = 회전수, 나머지 숫자 칸 = 토크 곡선(여럿이면 고름). 숫자가 없는 첫 줄 = 열 이름 */
function t2MotorParse(txt){ let names = [], rows = [], bad = [];
  t2Lines(txt).forEach(L => { if(!L.cells.length) return; const nums = L.cells.map(c => c==='' ? NaN : +c);
    if(nums.filter(isFinite).length >= 2 && isFinite(nums[0])) rows.push(nums); else if(!rows.length && !names.length) names = L.cells; else bad.push(L.i); });
  const nc = rows.reduce((a, r) => Math.max(a, r.length), 0) - 1, col = Math.max(1, Math.min(nc, T2.mcol));
  const cols = Array.from({length:Math.max(0, nc)}, (_, j) => names[j + 1] || `토크 열 ${j + 1}`);
  return {cols, col, bad, pts: rows.filter(r => isFinite(r[col]) && r[0] >= 0 && r[col] >= 0).map(r => [r[0], r[col]]).sort((a, b) => a[0] - b[0])}; }
/* 효율: 비면 null(→ 상수 칸), 숫자 하나면 상수 맵, 2차원 표면 맵 {n:[회전수], t:[토크], e:[[%]]}. 값이 모두 1.5 이하면 비율로 보고 × 100 */
function t2EffParse(txt){ const L = t2Lines(txt).filter(l => l.cells.length); if(!L.length) return {map:null, msg:''};
  const flat = L.flatMap(l => l.cells).filter(c => c!=='' && isFinite(+c)).map(Number);
  if(L.length===1 && flat.length===1){ const v = flat[0] <= 1.5 ? flat[0]*100 : flat[0]; return {map:{n:[0, 1e6], t:[0, 1e6], e:[[v, v], [v, v]]}, msg:`상수 ${wbFmt(v, 1)} %`}; }
  const head = L[0].cells.slice(1).map(Number); if(head.length < 2 || !head.every(isFinite)) return {map:null, msg:'<span class="wb-err">맵의 첫 줄(회전수)을 읽지 못했습니다</span>'};
  const t = [], e = []; L.slice(1).forEach(l => { const r = l.cells.map(Number); if(isFinite(r[0]) && r.slice(1, head.length + 1).every(isFinite)){ t.push(r[0]); e.push(r.slice(1, head.length + 1)); } });
  if(t.length < 2) return {map:null, msg:'<span class="wb-err">맵의 토크 줄을 2줄 이상 읽지 못했습니다</span>'};
  const sc = Math.max(...e.flat()) <= 1.5 ? 100 : 1, map = {n:head, t, e:e.map(r => r.map(v => v*sc))};
  return {map, msg:`맵 ${t.length} × ${head.length} (토크 ${wbFmt(t[0], 0)} ~ ${wbFmt(t[t.length-1], 0)} N·m, 회전수 ${wbFmt(head[0], 0)} ~ ${wbFmt(head[head.length-1], 0)} rpm, 효율 ${wbFmt(Math.min(...map.e.flat()), 1)} ~ ${wbFmt(Math.max(...map.e.flat()), 1)} %)`}; }
const t2ExtraI = () => ({ end: typeof FSK26!=='undefined' ? {seg:FSK26.seg, laps:FSK26.laps, stint:FSK26.stint} : {seg:[]},
  free:{seg:t2Track(T2.free.text).segs, closed:T2.free.closed, laps:T2.free.laps, s0:T2.free.s0}, motor:t2MotorParse(T2.mtext).pts,
  effM:t2EffParse(T2.eM).map, effI:t2EffParse(T2.eI).map, course:T2.course, lap:T2.lap[T2.course] || '1' });

/* ---------- 파일 가져오기 · 양식 받기 ---------- */
async function t2ReadCells(file){ const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(ext==='xlsx') return await t2Xlsx(await file.arrayBuffer());
  if(['csv', 'txt', 'tsv'].includes(ext)) return (await file.text()).split(/\r?\n/).map(l => l.split(/[,;\t]/));
  throw new Error(`읽을 수 없는 파일입니다 (.${ext || '확장자 없음'}). .xlsx · .csv 를 올리거나, 엑셀 .xls 는 [다른 이름으로 저장 → .xlsx]로 저장해 올려 주십시오.`); }
async function t2Import(file, what){ try{ const cells = await t2ReadCells(file), txt = cells.map(r => r.map(c => String(c ?? '').trim()).join(', ').replace(/(, )+$/, '')).filter(l => l.replace(/[, ]/g, '')).join('\n');
    if(what==='track'){ const P = t2Track(txt); if(!P.rows.length) throw new Error('구간을 찾지 못했습니다. 한 줄에 길이 m, 반경 m 두 숫자(또는 종류, 길이, 반경)가 있어야 합니다.');
      T2.free.text = txt; toast(`${file.name}: 구간 ${P.rows.length}개 읽음${P.bad.length ? ` · ${P.bad.slice(0, 5).join(', ')}번째 줄은 숫자가 없어 건너뜀` : ''}`); }
    else if(what==='motor'){ T2.mtext = txt; const P = t2MotorParse(txt); if(!P.pts.length) throw new Error('회전수 · 토크 줄을 찾지 못했습니다.'); toast(`${file.name}: ${P.pts.length}점 · 토크 열 ${P.cols.length}개`); }
    else { const P = t2EffParse(txt); if(!P.map) throw new Error('효율 맵을 읽지 못했습니다. 첫 줄 = 회전수, 첫 열 = 토크.'); if(what==='eM') T2.eM = txt; else T2.eI = txt; toast(`${file.name}: ${P.msg.replace(/<[^>]+>/g, '')}`); }
    t2Save(); wbPaint(['ext']); wbRefresh(); t2PartDirty(); }
  catch(err){ toast((err && err.message) || '파일을 읽지 못했습니다.'); } }
/* .xlsx 만들기 (압축 없는 zip, 시트 하나, 글자는 inline) */
function t2XlsxBlob(rows){ const enc = new TextEncoder(), esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cn = i => { let s = ''; i++; while(i){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1)/26); } return s; };
  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + rows.map((r, i) => `<row r="${i+1}">` + r.map((c, j) => (c==='' || c==null) ? '' : (typeof c==='number' ? `<c r="${cn(j)}${i+1}"><v>${c}</v></c>` : `<c r="${cn(j)}${i+1}" t="inlineStr"><is><t>${esc(c)}</t></is></c>`)).join('') + '</row>').join('') + '</sheetData></worksheet>';
  const F = {'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml':sheet};
  const crcT = Array.from({length:256}, (_, n) => { let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xFFFFFFFF; for(const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const parts = [], cen = []; let off = 0;
  for(const [name, txt] of Object.entries(F)){ const nb = enc.encode(name), d = enc.encode(txt), c = crc(d), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nb.length, true);
    parts.push(new Uint8Array(h.buffer), nb, d); const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint32(16, c, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
    cen.push(new Uint8Array(ch.buffer), nb); off += 30 + nb.length + d.length; }
  const cl = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, 5, true); e.setUint16(10, 5, true); e.setUint32(12, cl, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); }
const T2TPL = {
  track:{name:'내코스_양식', rows:[['종류', '길이 m', '반경 m', '메모'], ['직선', 54, '', '출발 직선'], ['왼쪽', 2.2, 2.6, ''], ['오른쪽', 9.9, 18.1, ''], ['직선', 30, '', '']]},
  motor:{name:'모터토크_양식', rows:[['회전수 rpm', '최대 토크 N·m', '연속 토크 N·m'], [0, 230, 110], [4800, 230, 112], [6500, 180, 92]]},
  eff:{name:'효율맵_양식', rows:[['토크 N·m \\ 회전수 rpm', 0, 2000, 4000], [50, 88, 93, 92], [150, 90, 95, 94], [230, 87, 93, 92]]} };
function t2Template(kind, fmt){ const T = T2TPL[kind]; let blob;
  if(fmt==='xlsx') blob = t2XlsxBlob(T.rows); else blob = new Blob(['﻿' + T.rows.map(r => r.join(',')).join('\r\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${T.name}.${fmt}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

/* ---------- 작업창 위: 코스 · 모터 · 효율 ---------- */
const T2CN = {free:'내 코스', ax:'오토크로스', end:'내구레이스', acc:'가속', skid:'스키드패드'};
function t2LapOpts(){ const c = T2.course; let n = 0;
  if(c==='end') n = typeof FSK26!=='undefined' ? FSK26.laps : 26; else if(c==='free' && T2.free.closed && T2.free.laps > 1) n = T2.free.laps; if(!n) return '';
  const cur = T2.lap[c] || '1', o = [...Array.from({length:n}, (_, i) => [String(i + 1), `${i + 1}번째 랩${c==='end' && (i===0 || i===13) ? ' (정지 출발)' : ''}`]), ['all', `전체 ${n}랩 이어서`]];
  return `<label class="t2-lapsel">볼 랩 <select data-t2lap>${o.map(([k, t]) => `<option value="${k}"${cur===k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`; }
function t2ExtHTML(){ const tabs = [['course', '코스'], ['motor', '모터 · 효율']];
  return `<section class="wb-sec t2-ext" aria-label="코스 · 모터"><div class="wb-h t2-h"><div class="m1-tabs" role="tablist">${tabs.map(([k, t]) => `<button type="button" role="tab" data-t2tab="${k}" aria-selected="${T2.tab===k}">${t}</button>`).join('')}</div>
      <span class="t2-vw"><span class="muted">코스</span><span class="dc-seg" role="group" aria-label="코스 고르기">${T2COURSES.map(k => `<button type="button" data-t2course="${k}" aria-pressed="${T2.course===k}">${T2CN[k]}</button>`).join('')}</span><span id="t2lapw">${t2LapOpts()}</span></span></div>
    ${T2.tab==='course' ? t2CourseHTML() : t2MotorHTML()}</section>`; }
/* 공식 코스 설명 (고칠 수 없음) */
const T2INFO = {
  ax: () => `<b>오토크로스</b> · 공식 내구 코스를 거꾸로 한 바퀴, 정지 출발. 한 바퀴 ${wbFmt(FSK26.len, 1)} m.`,
  end: () => `<b>내구레이스</b> · FSK 2026 공식 코스 ${wbFmt(FSK26.len, 1)} m × ${FSK26.laps}랩 = ${wbFmt(FSK26.len*FSK26.laps/1000, 2)} km. 드라이버당 ${FSK26.stint}랩, 각 드라이버 정지 출발, 교체 시간 제외. 1번째 랩은 정지 출발, 2번째부터 앞 랩 끝 속도를 이어받음. 랩마다 SOC가 줄어 축전지 전압이 떨어집니다.`,
  acc: () => '<b>가속</b> · 직선 75 m, 정지 출발 (75 m 기준).',
  skid: () => '<b>스키드패드</b> · 8자 코스 (두 원 중심 거리 18.25 m, 안쪽 지름 15.25 m, 차로 폭 3 m). 주행 반경 9.125 m(차로 가운데). 진입 → 오른쪽 2바퀴 → 왼쪽 2바퀴 → 탈출, 기록 = 2번째 · 4번째 바퀴 평균. 일정 반경이라 기록은 정상 선회 속도로 계산합니다.' };
function t2CourseHTML(){ const c = T2.course;
  const left = c==='free' ? t2FreeHTML() : `<div class="t2-info"><p>${T2INFO[c]()}</p><p class="muted">대회가 정한 공식 코스라 고칠 수 없습니다. 코스를 바꿔 보려면 [내 코스]에서 만듭니다.</p>${c==='end' ? '<div id="t2laps">' + t2LapTable() + '</div>' : ''}</div>`;
  return `<div class="t2-tr">${left}<figure class="t2-map"><div id="t2map">${t2MapSVG()}</div><figcaption class="muted" id="t2mcap"></figcaption></figure></div>`; }
function t2FreeHTML(){ const F = T2.free, P = t2Track(F.text);
  return `<div class="t2-ed">
      <div class="t2-opt"><label><input type="checkbox" data-t2o="closed"${F.closed ? ' checked' : ''}> 닫힌 경로 (끝 = 처음)</label>
        <label>랩 수 <input type="number" min="1" step="1" data-t2o="laps" value="${F.laps}"${F.closed ? '' : ' disabled'}></label>
        <label>출발 위치 <input type="number" min="0" step="any" data-t2o="s0" value="${F.s0}"${F.closed ? '' : ' disabled'}> m <span class="muted">처음에서</span></label></div>
      <textarea id="t2trk" data-t2txt="track" spellcheck="false" rows="7" placeholder="${wbEsc(T2TRACK_PH)}" aria-label="내 코스 구간 (붙여넣기)">${wbEsc(F.text)}</textarea>
      <div class="t2-btns"><label class="btn small t2-file">파일 가져오기<input type="file" accept=".xlsx,.csv,.txt,.tsv" data-t2file="track" hidden></label>
        <span class="muted">양식</span><button type="button" class="lnk" data-t2tpl="track.csv">.csv</button><button type="button" class="lnk" data-t2tpl="track.xlsx">.xlsx</button>
        <button type="button" class="btn small" data-t2ex="track">예시 코스로</button></div>
      <details class="t2-fmt"><summary>양식 보기</summary><ul><li>한 줄에 한 구간: <b>종류, 길이 m, 반경 m</b> (종류: 직선 · 왼쪽 · 오른쪽, 영어 Straight · Left · Right 도 됨)</li><li>종류를 안 쓰면 <b>길이, 반경</b> 두 숫자만: 반경 왼쪽 +, 오른쪽 −, 직선 0</li><li>숫자가 없는 줄(머리줄)은 건너뜀 · 쉼표 · 탭 · 세미콜론 구분 모두 됨 · # 뒤는 메모</li><li>.xlsx 는 첫 시트만 읽음 · .xls 는 엑셀에서 .xlsx 로 저장해 올림 · 옵티멈랩 구간 형식(Type, Length, Radius)도 그대로 읽음</li></ul></details>
      <div class="t2-msg" id="t2tmsg">${t2TrackMsg(P)}</div>
      <div class="t2-tw" id="t2tt">${t2TrackTable(P)}</div>
      <div id="t2laps">${t2LapTable()}</div></div>`; }
function t2TrackMsg(P){ P = P || t2Track(T2.free.text); if(!P.rows.length) return '<span class="wb-err">구간이 없습니다. 붙여 넣거나 파일을 가져오십시오.</span>';
  const G = t2Geom(P.segs, 1); return `한 바퀴 <b>${wbFmt(P.len, 1)}</b> m · 구간 ${P.rows.length}개${T2.free.closed ? ` · 끝점이 출발점에서 ${wbFmt(G.gap, 1)} m${G.gap > 5 ? ' <span class="muted">(지도에서만 벌어져 보임, 계산은 끝과 처음을 이어서 함)</span>' : ''}` : ' · 열린 경로'}${P.bad.length ? ` · <span class="wb-err">${P.bad.slice(0, 5).join(', ')}번째 줄은 숫자가 없어 건너뜀</span>` : ''}`; }
function t2TrackTable(P){ if(!P.rows.length) return '';
  return `<table class="t2-tt"><thead><tr><th>#</th><th>종류</th><th>길이 m</th><th>반경 m</th><th>각도 °</th><th>메모</th></tr></thead><tbody>${P.rows.map((r, i) => `<tr><td class="muted">${i + 1}</td><td>${r.R ? (r.R > 0 ? '왼쪽' : '오른쪽') : '직선'}</td><td>${wbFmt(r.l, 2)}</td><td>${r.R ? wbFmt(Math.abs(r.R), 2) : ''}</td><td>${r.R ? wbFmt(r.l/Math.abs(r.R)*180/Math.PI, 1) : ''}</td><td class="muted">${wbEsc(r.note || '')}</td></tr>`).join('')}</tbody></table>`; }
/* 랩별 기록 표 (내구 · 내 코스) */
function t2LapTable(){ const R = WB.id==='2' ? WB.R : null, L = R && R.laps; if(!L || !L.t || L.t.length < 2) return '';
  const cur = T2.lap[T2.course] || '1';
  return `<div class="t2-lt" role="group" aria-label="랩별 기록">${L.t.map((t, i) => `<button type="button" data-t2lapgo="${i + 1}" class="${String(i + 1)===cur ? 'on' : ''}${L.n1 && i===L.n1 ? ' st' : ''}" title="${i + 1}번째 랩 · ${wbFmt(t, 2)} s · 단자 에너지 ${wbFmt(L.e[i]/3.6e6, 3)} kWh · 시작 SOC ${wbFmt(L.soc[i]*100, 1)} %"><i>${i + 1}</i>${wbFmt(t, 1)}</button>`).join('')}</div><p class="muted t2-ltn">랩을 누르면 그 랩을 그래프로 봅니다${L.n1 ? ` · ${L.n1 + 1}번째 랩부터 두 번째 드라이버(정지 출발)` : ''}.</p>`; }
function t2MotorHTML(){ const M = t2MotorParse(T2.mtext), eM = t2EffParse(T2.eM), eI = t2EffParse(T2.eI);
  const box = (k, label, txt, ph, msg, extra) => `<div class="t2-mb"><label for="t2${k}">${label}</label>
      <textarea id="t2${k}" data-t2txt="${k}" spellcheck="false" rows="6" placeholder="${wbEsc(ph)}">${wbEsc(txt)}</textarea>
      <div class="t2-btns"><label class="btn small t2-file">파일 가져오기<input type="file" accept=".xlsx,.csv,.txt,.tsv" data-t2file="${k}" hidden></label><span class="muted">양식</span><button type="button" class="lnk" data-t2tpl="${k==='mt' ? 'motor' : 'eff'}.csv">.csv</button><button type="button" class="lnk" data-t2tpl="${k==='mt' ? 'motor' : 'eff'}.xlsx">.xlsx</button>${extra || ''}</div>
      <div class="t2-msg" id="t2${k}msg">${msg}</div></div>`;
  return `<div class="t2-tr"><div class="t2-ed">
      ${box('mt', '모터 토크 곡선 <span class="muted">(왼쪽 [모터 표 기준 전압]에서의 값)</span>', T2.mtext, T2MOTOR_PH, t2MotorMsg(M), `<button type="button" class="btn small" data-t2ex="mt">EMRAX 228 데이터시트 값</button>`)}
      ${M.cols.length > 1 ? `<label class="t2-col">쓸 토크 열 <select data-t2mcol>${M.cols.map((c, i) => `<option value="${i + 1}"${M.col===i + 1 ? ' selected' : ''}>${wbEsc(c)}</option>`).join('')}</select></label>` : ''}
      ${box('eM', '모터 효율 <span class="muted">(상수 또는 맵)</span>', T2.eM, T2EFF_PH, eM.msg || '비어 있음 → 왼쪽 [모터 효율] 상수', `<button type="button" class="btn small" data-t2ex="eM">EMRAX 228 맵</button><button type="button" class="btn small" data-t2ex="eM0">비우기</button>`)}
      ${box('eI', '인버터 효율 <span class="muted">(상수 또는 맵)</span>', T2.eI, T2EFF_PH, eI.msg || '비어 있음 → 왼쪽 [인버터 효율] 상수', `<button type="button" class="btn small" data-t2ex="eI0">비우기</button>`)}
      <p class="muted t2-ltn">모터 효율 × 인버터 효율이 곱해지므로, 둘을 합친 맵을 모터 쪽에 넣고 인버터를 100 으로 둬도 같습니다.</p></div>
    <figure class="t2-mc" id="t2mc">${t2MotorPlots()}</figure></div>`; }
function t2MotorMsg(M){ return M.pts.length ? `${M.pts.length}점 · ${wbFmt(M.pts[0][0], 0)} ~ ${wbFmt(M.pts[M.pts.length-1][0], 0)} rpm · 최대 ${wbFmt(Math.max(...M.pts.map(p => p[1])), 1)} N·m${M.cols.length > 1 ? ` · 토크 열 ${M.cols.length}개 중 "${wbEsc(M.cols[M.col - 1])}"` : ''}${M.bad.length ? ` · <span class="wb-err">${M.bad.slice(0, 5).join(', ')}번째 줄 건너뜀</span>` : ''}`
  : '비어 있음 → 왼쪽 [모터 최대 토크] 일정 (회전수에 따라 줄지 않음)'; }
/* 모터 탭 그림: 토크 곡선 (표 기준 · 축전지 공칭 · 최대 전류 때) + 구동력 선도 + 효율 맵 */
function t2MotorPlots(){ const R = WB.id==='2' ? WB.R : null; if(!R || !R.motor) return '<p class="wb-empty">계산 중…</p>'; const M = R.motor, F = R.ft, I = WB.I;
  return wbPlot({id:'t2m', w:560, h:250, x:{d:M.n, n:'모터 회전수', u:'rpm'}, ys:[{k:'a', d:M.tref, c:'#9aa0ab', n:`표 그대로 (팀 모터로 ${wbFmt(I.v_ref*(I.ke_ratio || 1), 0)} V 상당)`, u:'N·m', dd:0}, {k:'b', d:M.tnom, c:WB_COL[0], n:`축전지 공칭 ${wbFmt(I.n_s*I.c_vnom, 0)} V`, u:'N·m', dd:0}, {k:'c', d:M.tload, c:WB_COL[3], n:`최대 전류 때 ${wbFmt(R.out.v_load, 0)} V`, u:'N·m', dd:0}], label:'모터 토크 곡선'})
    + `<div class="wb-leg"><span><i style="background:#9aa0ab"></i>표 그대로</span><span><i style="background:${WB_COL[0]}"></i>축전지 공칭 전압</span><span><i style="background:${WB_COL[3]}"></i>최대 전류 때 단자 전압</span><span class="muted">기저 회전수 ${wbFmt(R.out.n_base, 0)} rpm (공칭)</span></div>`
    + wbPlot({id:'t2ft', w:560, h:250, x:{d:F.v, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:F.f_m, c:WB_COL[0], n:'모터 구동력', u:'N', dd:0}, {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}], label:'구동력 선도'})
    + `<div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴, SOC 100 %)</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항</span></div>`
    + (t2EffParse(T2.eM).map && T2.eM.split('\n').length > 2 ? `<div class="t2-hm"><b>모터 효율 맵</b>${t2Heat(t2EffParse(T2.eM).map)}</div>` : ''); }
/* 효율 맵 색 지도 (작게, 확인용) */
function t2Heat(M){ const W = 520, H = 200, L = 46, B = 30, T = 8, R = 8, pw = W - L - R, ph = H - T - B, n0 = M.n[0], n1 = M.n[M.n.length-1], t0 = M.t[0], t1 = M.t[M.t.length-1];
  const all = M.e.flat(), lo = Math.min(...all), hi = Math.max(...all); let s = `<svg viewBox="0 0 ${W} ${H}" class="t2-heat" role="img" aria-label="효율 맵">`;
  for(let i = 0; i < M.t.length; i++) for(let j = 0; j < M.n.length; j++){ const x0 = L + ((j ? (M.n[j-1] + M.n[j])/2 : n0) - n0)/(n1 - n0)*pw, x1 = L + ((j < M.n.length-1 ? (M.n[j] + M.n[j+1])/2 : n1) - n0)/(n1 - n0)*pw;
    const y1 = T + ph - ((i ? (M.t[i-1] + M.t[i])/2 : t0) - t0)/(t1 - t0)*ph, y0 = T + ph - ((i < M.t.length-1 ? (M.t[i] + M.t[i+1])/2 : t1) - t0)/(t1 - t0)*ph, f = hi > lo ? (M.e[i][j] - lo)/(hi - lo) : .5;
    s += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0 + .5).toFixed(1)}" height="${(y1 - y0 + .5).toFixed(1)}" fill="hsl(${(230 - 230*f).toFixed(0)} 70% ${(55 - 10*f).toFixed(0)}%)"><title>${wbFmt(M.n[j], 0)} rpm · ${wbFmt(M.t[i], 0)} N·m · ${wbFmt(M.e[i][j], 1)} %</title></rect>`; }
  s += `<text x="${L + pw/2}" y="${H - 4}" class="wb-tl" text-anchor="middle">모터 회전수 [rpm] · ${wbFmt(n0, 0)} ~ ${wbFmt(n1, 0)}</text><text x="12" y="${T + ph/2}" class="wb-tl" text-anchor="middle" transform="rotate(-90 12 ${T + ph/2})">토크 [N·m]</text>`;
  return s + `</svg><div class="wb-leg"><span class="muted">파랑 ${wbFmt(lo, 1)} % → 빨강 ${wbFmt(hi, 1)} % · 칸에 마우스를 올리면 값</span></div>`; }

/* ---------- 코스 지도 ---------- */
/* 구간 → 점 (계산의 grid 와 같은 나눔: 구간마다 ceil(길이 ÷ ds) 칸) */
function t2Pts(segs, ds, x, y, h){ const X = [x], Y = [y];
  segs.forEach(([l, R]) => { const n = Math.max(1, Math.ceil(l/ds - 1e-9)), st = l/n;
    for(let i = 0; i < n; i++){ if(!R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/R; x += R*(Math.sin(h + dh) - Math.sin(h)); y -= R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } X.push(x); Y.push(y); } });
  return {X, Y, h}; }
function t2Geom(segs, ds){ const P = t2Pts(segs, ds, 0, 0, 0); return {X:P.X, Y:P.Y, gap:Math.hypot(P.X[P.X.length-1], P.Y[P.Y.length-1])}; }
function t2Rot(segs, s0){ const len = segs.reduce((a, r) => a + r[0], 0); s0 = ((s0 % len) + len) % len; if(s0 < 1e-9) return segs.slice();
  let c = 0; for(let i = 0; i < segs.length; i++){ const [l, R] = segs[i]; if(s0 < c + l - 1e-9){ const a = s0 - c, head = a > 1e-9 ? [[a, R]] : []; return [[l - a, R], ...segs.slice(i + 1), ...segs.slice(0, i), ...head]; } c += l; } return segs.slice(); }
/* 내 코스 지도: 원래 코스 위, 출발 위치부터 (계산과 같은 0.5 m 나눔) */
function t2FreeXY(){ const segs = t2Track(T2.free.text).segs; if(!segs.length) return null; const closed = T2.free.closed, s0 = closed ? T2.free.s0 % Math.max(1e-9, segs.reduce((a, r) => a + r[0], 0)) : 0;
  let x = 0, y = 0, h = 0, c = 0; for(const [l, R] of segs){ if(c + l >= s0 - 1e-9){ const P = t2Pts([[s0 - c, R]], 1e9, x, y, h); x = P.X[1] ?? x; y = P.Y[1] ?? y; h = P.h; break; } const P = t2Pts([[l, R]], 1e9, x, y, h); x = P.X[1]; y = P.Y[1]; h = P.h; c += l; }
  return t2Pts(closed ? t2Rot(segs, s0) : segs, 0.5, x, y, h); }
function t2MapSVG(){ const c = T2.course, R = WB.id==='2' ? WB.R : null, mp = R && R.map; let G, extra = '', P = 0, rev = false, vc = null, close = false;
  if(c==='ax' || c==='end'){ if(typeof FSK26==='undefined') return ''; G = {X:[...FSK26.X, FSK26.X[0]], Y:[...FSK26.Y, FSK26.Y[0]]}; close = true;
    if(mp && mp.vc){ vc = mp.vc; P = mp.P; rev = mp.rev; } }
  else if(c==='free'){ G = t2FreeXY(); if(!G) return ''; close = T2.free.closed; if(mp && mp.vc){ vc = mp.vc; P = mp.P; } }
  else if(c==='acc'){ G = t2Pts([[75, 0]], 0.5, 0, 0, 0); if(mp && mp.acc) vc = R.sig.v; }
  else { const SR = 9.125, C2 = 2*Math.PI*SR; G = t2Pts([[15, 0], [C2, -SR], [C2, -SR], [C2, SR], [C2, SR], [15, 0]], 0.5, 0, -15, Math.PI/2); if(mp && mp.skid) vc = R.sig.v;
    [[SR, 0], [-SR, 0]].forEach(([cx, cy]) => [7.625, 10.625].forEach(rr => { extra += `<circle data-c="${cx},${cy},${rr}" class="t2-sk"/>`; })); }
  /* 화면 맞춤 */
  const xs = G.X, ys = G.Y, x0 = Math.min(...xs) - (c==='skid' ? 3 : 0), x1 = Math.max(...xs) + (c==='skid' ? 3 : 0), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 22, W = 380, H = 270;
  const s = Math.min((W - 2*pad)/Math.max(1, x1 - x0), (H - 2*pad)/Math.max(1, y1 - y0)), ox = (W - (x1 - x0)*s)/2, oy = (H - (y1 - y0)*s)/2;
  const tx = x => ox + (x - x0)*s, ty = y => H - oy - (y - y0)*s, Pt = i => [tx(xs[i]), ty(ys[i])];
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="t2-msvg" role="img" aria-label="${T2CN[c]} 코스 지도">`;
  svg += extra.replace(/<circle data-c="([^,]+),([^,]+),([^"]+)" class="t2-sk"\/>/g, (_, a, b, r) => `<circle cx="${tx(+a).toFixed(1)}" cy="${ty(+b).toFixed(1)}" r="${(+r*s).toFixed(1)}" class="t2-sk"/>`);
  if((c==='ax' || c==='end') && FSK26.cones) FSK26.cones.forEach(([cx, cy, sd]) => { svg += `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="1.6" class="t2-cone ${sd}"/>`; });
  const N = xs.length, at = i => rev ? (N - 1) - i : i;
  if(vc){ const V = vc.filter(isFinite), lo = Math.min(...V), hi = Math.max(...V), st = Math.max(1, Math.floor(N/700));
    for(let i = 0; i + st < N; i += st){ const k = vc.length===N ? i : Math.min(vc.length - 1, Math.round(i*(vc.length - 1)/(N - 1))), vi = vc[k], f = hi > lo && isFinite(vi) ? (vi - lo)/(hi - lo) : .5, a = Pt(i), b = Pt(Math.min(N - 1, i + st));
      svg += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="hsl(${(230 - 230*f).toFixed(0)} 75% 45%)" stroke-width="4" stroke-linecap="round"/>`; }
    setTimeout(() => { const cp = $('#t2mcap'); if(cp) cp.innerHTML = `느림 ${wbFmt(lo, 0)} km/h <i class="t2-grad"></i> 빠름 ${wbFmt(hi, 0)} km/h${c==='ax' ? ' · 오토크로스는 내구 방향의 반대' : ''}${c==='end' ? ` · ${T2.lap.end==='all' ? '2번째' : T2.lap.end + '번째'} 랩 차속` : ''} · 작은 점 = 커서`; }, 0); }
  else { svg += `<polyline points="${xs.map((_, i) => Pt(i).map(v => v.toFixed(1)).join(',')).join(' ')}" class="t2-line"/>`; setTimeout(() => { const cp = $('#t2mcap'); if(cp) cp.textContent = R ? '' : '계산이 끝나면 차속 색으로 칠합니다.'; }, 0); }
  /* 출발선(초록) · 결승선(빨강) · 주행 방향 화살표. 닫힌 코스는 같은 자리라 결승선을 살짝 앞에 */
  const ix = i => close ? ((Math.round(i) % (N - 1)) + (N - 1)) % (N - 1) : Math.max(0, Math.min(N - 1, Math.round(i)));   // 닫힌 코스는 한 바퀴 돌려서
  const line = (i, j, cls) => { const a = Pt(ix(i)), b = Pt(ix(j)), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy/d*9, ny = dx/d*9;
    return `<line x1="${(a[0] + nx).toFixed(1)}" y1="${(a[1] + ny).toFixed(1)}" x2="${(a[0] - nx).toFixed(1)}" y2="${(a[1] - ny).toFixed(1)}" class="${cls}"/>`; };
  const i0 = rev ? N - 1 : 0, dir = rev ? -1 : 1, step = Math.max(2, Math.round(N/120));
  if(c==='skid'){ const k = Math.round(15/0.5); svg += line(k, k + step, 't2-fin') + line(k - 2, k - 2 + step, 't2-sl'); }
  else { const ie = close ? i0 - dir*Math.max(2, Math.round(N/200)) : (rev ? 0 : N - 1); svg += line(ie, ie + dir*step, 't2-fin') + line(i0, i0 + dir*step, 't2-sl'); }
  { const ia = c==='skid' ? 4 : i0, a = Pt(ia), b = Pt(Math.max(0, Math.min(N - 1, ia + dir*step*2))), ang = Math.atan2(b[1] - a[1], b[0] - a[0])*180/Math.PI;
    svg += `<path d="M0,-5 L11,0 L0,5 z" class="t2-arr" transform="translate(${((a[0] + b[0])/2).toFixed(1)},${((a[1] + b[1])/2).toFixed(1)}) rotate(${ang.toFixed(1)})"/>`; }
  /* 커서: 결과 그래프의 거리 위치 */
  if(R && R.x && WB.xi != null){ let k = WB.xi;
    if((c==='end' || c==='free') && P) k = WB.xi % P === 0 && WB.xi ? P : WB.xi % P; else if(c==='ax' && P) k = P - Math.min(P, WB.xi);
    else if(c==='acc' || c==='skid') k = Math.min(N - 1, WB.xi); k = Math.max(0, Math.min(N - 1, k)); const q = Pt(k); svg += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4" class="t2-cur"/>`; }
  return svg + `<g class="t2-mleg" transform="translate(8,${H - 10})"><line x1="0" y1="0" x2="12" y2="0" class="t2-sl"/><text x="16" y="4">출발</text><line x1="46" y1="0" x2="58" y2="0" class="t2-fin"/><text x="62" y="4">결승</text></g></svg>`; }

/* ---------- 고치기 ---------- */
function t2Changed(full){ t2Save(); clearTimeout(T2.timer);
  if(full) wbPaint(['ext']); else { const lw = $('#t2lapw'); if(lw) lw.innerHTML = t2LapOpts(); const m = $('#t2tmsg'); if(m) m.innerHTML = t2TrackMsg(); const mp = $('#t2map'); if(mp) mp.innerHTML = t2MapSVG(); }
  T2.timer = setTimeout(() => { wbRefresh(); t2PartDirty(); }, 350); }
function t2Text(k, v){ if(k==='track') T2.free.text = v; else if(k==='mt') T2.mtext = v; else T2[k] = v; t2Save(); clearTimeout(T2.timer);
  T2.timer = setTimeout(() => { if(k==='track'){ const P = t2Track(v); const m = $('#t2tmsg'); if(m) m.innerHTML = t2TrackMsg(P); const tt = $('#t2tt'); if(tt) tt.innerHTML = t2TrackTable(P); const mp = $('#t2map'); if(mp) mp.innerHTML = t2MapSVG(); }
    else if(k==='mt'){ const m = $('#t2mtmsg'); if(m) m.innerHTML = t2MotorMsg(t2MotorParse(v)); }
    else { const m = $(`#t2${k}msg`), P = t2EffParse(v); if(m) m.innerHTML = P.msg || `비어 있음 → 왼쪽 [${k==='eM' ? '모터' : '인버터'} 효율] 상수`; }
    wbRefresh(); t2PartDirty(); }, 400); }
function t2SetCourse(c){ T2.course = c; t2Save(); WB.xi = 0; wbSelReset(['v', 'pw']); WB.act = ''; if(!WB.xa.startsWith('in:')) WB.xa = ''; wbPaint(['ext']); wbRefresh(); }
document.addEventListener('input', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2txt]')){ t2Text(t.dataset.t2txt, t.value); return; }
  if(t.matches('[data-t2o]')){ const k = t.dataset.t2o; if(k==='closed') return; const v = parseFloat(t.value); if(!isFinite(v) || v < 0) return; T2.free[k] = k==='laps' ? Math.max(1, Math.round(v)) : v; t2Changed(false); } });
document.addEventListener('change', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2file]')){ const f = t.files && t.files[0], k = t.dataset.t2file; t.value = ''; if(f) t2Import(f, k==='mt' ? 'motor' : k); return; }
  if(t.matches('[data-t2lap]')){ T2.lap[T2.course] = t.value; t2Save(); WB.xi = 0; t.blur(); wbRefresh(); return; }
  if(t.matches('[data-t2mcol]')){ T2.mcol = +t.value; t2Save(); t.blur(); wbPaint(['ext']); wbRefresh(); t2PartDirty(); return; }
  if(t.matches('[data-t2o="closed"]')){ T2.free.closed = t.checked; t2Changed(true); } });
document.addEventListener('click', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  const tb = t.closest('[data-t2tab]'); if(tb){ T2.tab = tb.dataset.t2tab; wbPaint(['ext']); return; }
  const cs = t.closest('[data-t2course]'); if(cs){ t2SetCourse(cs.dataset.t2course); return; }
  const lg = t.closest('[data-t2lapgo]'); if(lg){ T2.lap[T2.course] = lg.dataset.t2lapgo; t2Save(); WB.xi = 0; wbPaint(['ext']); wbRefresh(); return; }
  const tp = t.closest('[data-t2tpl]'); if(tp){ const [k, f] = tp.dataset.t2tpl.split('.'); t2Template(k, f); return; }
  const ex = t.closest('[data-t2ex]'); if(ex){ const k = ex.dataset.t2ex;
    if(k==='track'){ T2.free.text = T2TRACK_EX; T2.free.closed = true; T2.free.s0 = 0; T2.free.laps = 1; } else if(k==='mt'){ T2.mtext = EMRAX228.torque; T2.mcol = 1; }
    else if(k==='eM') T2.eM = EMRAX228.eff; else if(k==='eM0') T2.eM = ''; else if(k==='eI0') T2.eI = '';
    t2Save(); wbPaint(['ext']); wbRefresh(); t2PartDirty(); } });

/* ---------- 결과 카드 도우미 ---------- */
const t2Rec = (gk, d) => (v, o) => { if(!isFinite(v)) return '<b>-</b>'; const g = o[gk], s = `<b>${wbFmt(v, d)}</b> <i>s</i>`;
  if(!(g > 0)) return s; const df = v - g; return s + `<span class="t2-gd${df > 0 ? ' over' : ''}">목표 ${wbFmt(g, d)} · ${df > 0 ? '+' : '−'}${wbFmt(Math.abs(df), d)}</span>`; };
const t2GrF = (tk, d) => (v, o) => isFinite(v) ? `<b>${wbFmt(v, 2)}</b><span class="t2-gd">그때 ${wbFmt(o[tk], d)} s</span>` : '<b>-</b>';
const t2Co2 = v => isFinite(v) ? `<b>${wbFmt(v, 2)}</b> <i>kg/100 km</i>${v > 60.06 ? ' <span class="wb-err">실격 기준 60.06 초과</span>' : ' <span class="muted">(실격 기준 60.06 이하)</span>'}` : '<b>-</b>';
const t2Lim = v => !isFinite(v) ? '<b>-</b>' : v >= 99.95 ? '<b>제한 없음</b>' : `<b>${wbFmt(v, 1)}</b> <i>%</i><span class="t2-gd over">에너지를 맞추려고 단자 출력 상한을 낮춤</span>`;
const t2Cla = (v, o) => !(o.g_skid > 0) ? '<span class="muted">스키드패드 목표 기록을 넣으면 계산</span>' : !isFinite(v) ? '<b>-</b> <span class="wb-err">C_L·A 15 m² 로도 모자람</span>' : `<b>${wbFmt(v, 2)}</b> <i>m²</i><span class="t2-gd${v > WB.I.cla ? ' over' : ''}">지금 ${wbFmt(WB.I.cla, 2)} · 목표 ${wbFmt(o.g_skid, 3)} s</span>`;
/* 입력 옆 '모양 보기': 하중 감도 → 바퀴 하중에 따른 μ 와 낼 수 있는 횡력 */
function t2VizMus(I){ const Z = Array.from({length:61}, (_, i) => i*50), mu = Z.map(z => Math.max(0, I.mu - I.mu_s*z/1000)), Fy = Z.map((z, i) => mu[i]*z);
  return {x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:'', dd:2}, {k:'fy', d:Fy, c:WB_COL[2], n:'낼 수 있는 횡력 μ·Fz', u:'N', dd:0}], act:'mu',
    note:`정지 때 바퀴 하나 평균 하중 약 ${wbFmt(I.m*9.81/4, 0)} N. μ·Fz 가 꺾여 내려가기 시작하면 하중을 더 실어도 그 바퀴 힘이 늘지 않습니다.`}; }

/* ---------- 이 탭 사용법 ---------- */
function t2TourTab(tab, course){ if(!T2.tourUndo && typeof tgUndo==='function'){ const t0 = T2.tab, c0 = T2.course; T2.tourUndo = true; tgUndo(() => { T2.tourUndo = false; const ch = T2.tab!==t0 || T2.course!==c0; T2.tab = t0; if(T2.course!==c0) t2SetCourse(c0); else if(ch) wbPaint(['ext']); }); }
  if(course && T2.course!==course) t2SetCourse(course); if(T2.tab!==tab){ T2.tab = tab; wbPaint(['ext']); } }
const t2TT = (tab, course) => ({click:{sel:`#wb [data-t2tab="${tab}"]`, need:() => T2.tab!==tab || (course && T2.course!==course), run:() => t2TourTab(tab, course)}, inner:'#wb .wb-right'});
const M2TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 해석해 비교표), 입력 내보내기 · 가져오기(코스 · 모터 · 효율 표 포함), 대시보드에 반영입니다.', t2TT('course')],
  ['#wb .wb-in', '입력', '차량 · 타이어 · 에어로 · 모터 · 구동계 · 축전지 · 목표 기록입니다. 칸 앞 점은 값의 출처입니다: 색 점 = 대시보드 값(색은 확정 · 검토 중 · 가정 · 계산값 · 예시값), 고리 = 직접 고친 값, 회색 네모 = 대시보드에 없는 도구 기본값. [대시보드 값으로 채우기]로 대시보드 설계값을 넣습니다.', t2TT('course')],
  ['#wb .t2-vw', '코스 고르기', '내 코스 · 오토크로스 · 내구레이스 · 가속 · 스키드패드 중 그래프로 볼 코스를 고릅니다. 공식 코스 4개는 대회 코스 그대로라 고칠 수 없습니다. 내구레이스는 볼 랩(1 ~ 26번째, 전체)을 고릅니다.', t2TT('course', 'end')],
  ['#wb .t2-map', '코스 지도', '초록 = 출발선, 빨강 = 결승선, 삼각형 = 주행 방향, 작은 점 = 그래프의 커서 위치입니다. 공식 코스는 콘(파랑 = 오른쪽, 노랑 = 왼쪽)도 그립니다. 계산이 끝나면 차속 색(느림 파랑 → 빠름 빨강)으로 칠합니다.', t2TT('course', 'end')],
  ['#wb .t2-lt', '랩별 기록', '내구 26랩의 랩별 기록입니다. 랩을 누르면 그 랩을 그래프로 봅니다. 14번째 랩은 두 번째 드라이버의 정지 출발입니다. 랩마다 SOC가 줄어 전압이 떨어집니다.', t2TT('course', 'end')],
  ['#wb .t2-ed', '내 코스', '구간을 한 줄씩 붙여 넣거나 .xlsx · .csv 파일을 가져옵니다. 빈 칸에 보이는 회색 글이 형식 안내이고, [양식 보기] · [양식 받기]로 자세한 형식과 빈 양식을 받습니다. 읽은 구간은 아래 표로 보여 줍니다. 닫힌 경로면 랩 수 · 출발 위치를 정합니다.', t2TT('course', 'free')],
  ['#wb .t2-mb', '모터 · 효율', '모터 토크 곡선(열이 여럿이면 쓸 열을 고름), 모터 효율, 인버터 효율을 넣습니다. 효율은 숫자 하나(상수) 또는 맵(회전수 × 토크)이고, 비우면 왼쪽 상수 칸을 씁니다. 오른쪽 그림은 축전지 전압에 맞춘 토크 곡선과 구동력 선도입니다.', t2TT('motor')],
  ['#wb .wb-sec[aria-label="결과"]', '결과', '종목별 예상 기록과 목표 기록 차이, 감속비(종목별 가장 빠른 값과 배점 가중 제안), 스키드패드 목표에 필요한 C_L·A, 내구 에너지(한도를 넘으면 출력 상한을 낮춘 비율)입니다.', {inner:'#wb .wb-right'}],
  ['#wbsl', '신호 선택 그래프', '위에서 고른 코스의 결과입니다. 처음에는 차속과 바퀴 출력을 띄우고, 코너 한계 속도 · 종가속도 · 횡가속도 · 바퀴 하중 · 모터 회전수 · 토크 · 축전지 출력 · 전압 · 효율 등을 더 골라 봅니다. 그래프를 누르거나 끌면 커서가 움직이고 코스 지도의 점도 따라갑니다. 단위가 둘이면 왼쪽 · 오른쪽 축, 셋 이상이면 축을 바깥으로 늘어놓습니다. [+ 그래프]로 최대 3칸까지 나눠 볼 수 있습니다. 가로축을 [입력 훑기 → 최종 감속비]로 바꾸면 감속비에 따른 기록 변화를 봅니다.', {inner:'#wb .wb-right'}]
];

/* ============================================================ 도구 정의 */
const T2G = {car:'질량 · 무게중심', tire:'타이어 · 하중 이동', aero:'에어로', mot:'모터 · 인버터', dt:'구동계', bat:'축전지', goal:'목표 기록 (0 = 정하지 않음)'};
WB_TOOLS['2'] = {
  no:'2', stage:'P0', name:'랩타임 시뮬레이터',
  x:{n:'거리', u:'m'},
  sweepFirst:'gr',
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:T2G.car}, {k:'fr', dk:'fr', v:47.5, d:1, g:T2G.car}, {k:'h', dk:'h', v:290, d:0, g:T2G.car},
    {k:'L', dk:'L', v:1550, d:0, g:T2G.car}, {k:'tf', dk:'tf', v:1200, d:0, g:T2G.car}, {k:'tr', dk:'tr', v:1180, d:0, g:T2G.car},
    {k:'mu', dk:'mu', v:1.5, d:2, g:T2G.tire}, {k:'mu_s', dk:'mu_s', v:0, d:3, g:T2G.tire, viz:t2VizMus}, {k:'lltd', dk:'lltd', v:50, d:1, g:T2G.tire},
    {k:'r_eff', dk:'r_eff', v:229, d:0, g:T2G.tire}, {k:'crr', dk:'crr', v:0.015, d:3, g:T2G.tire},
    {k:'cla', dk:'cla', v:3.0, d:2, g:T2G.aero}, {k:'cda', dk:'cda', v:1.4, d:2, g:T2G.aero}, {k:'xcop', dk:'xcop', v:852, d:0, g:T2G.aero}, {k:'hcop', dk:'hcop', v:420, d:0, g:T2G.aero},
    {k:'pmax', dk:'pmax', v:80, d:0, g:T2G.mot}, {k:'tmax', dk:'tmax', v:230, d:0, g:T2G.mot}, {k:'nmax', dk:'nmax', v:6500, d:0, g:T2G.mot},
    {k:'v_ref', n:'모터 표 기준 전압 (표를 잰 전압)', u:'V', v:710, d:0, g:T2G.mot},
    {k:'ke_ratio', n:'유도 전압 비 (팀 모터 ÷ 표 모터)', u:'', v:0.6523, d:4, g:T2G.mot},
    {k:'eta_mot', n:'모터 효율 (효율 맵이 없을 때)', u:'%', v:95, d:1, g:T2G.mot}, {k:'eta_inv', n:'인버터 효율 (효율 맵이 없을 때)', u:'%', v:97, d:1, g:T2G.mot},
    {k:'gr', dk:'gr', v:3.55, d:2, g:T2G.dt, sw:[2.5, 7]}, {k:'eta_dt', dk:'eta_dt', v:95, d:0, g:T2G.dt}, {k:'j_eq', dk:'j_eq', v:0.5, d:2, g:T2G.dt},
    {k:'n_s', dk:'n_s', v:72, d:0, g:T2G.bat}, {k:'n_p', dk:'n_p', v:6, d:0, g:T2G.bat},
    {k:'c_vmax', n:'셀 최대 전압 (만충)', u:'V', v:4.2, d:2, g:T2G.bat}, {k:'c_vmin', n:'셀 방전 종지 전압', u:'V', v:2.5, d:2, g:T2G.bat},
    {k:'c_vnom', n:'셀 공칭 전압', u:'V', v:3.6, d:2, g:T2G.bat}, {k:'c_ah', n:'셀 용량', u:'Ah', v:4.5, d:2, g:T2G.bat},
    {k:'r_pack', dk:'r_pack', v:180, d:0, g:T2G.bat}, {k:'i_bms_max', dk:'i_bms_max', v:270, d:0, g:T2G.bat}, {k:'e_target', dk:'e_target', v:0, d:2, g:T2G.bat},
    {k:'t_acc', dk:'t_acc', v:0, d:3, g:T2G.goal}, {k:'t_skid', dk:'t_skid', v:0, d:3, g:T2G.goal},
    {k:'t_ax', dk:'t_ax', v:0, d:2, g:T2G.goal}, {k:'t_end', dk:'t_end', v:0, d:1, g:T2G.goal}
  ],
  outGroups:{'종목 기록':{note:'예상 기록 · 목표 기록이 있으면 차이'}, '감속비':{note:'2.5 ~ 7.0 · 종목별 가장 빠른 값과 배점(가속 100 · 오토크로스 200 · 내구 350) 가중 제안. 스키드패드는 감속비와 거의 상관없어 뺌'},
    '내 코스':{note:'코스에서 [내 코스]로 만든 코스'}, '차량 한계':{}, '축전지 · 모터':{note:'SOC 100 % 기준'}, '내구 에너지 (회생 제외)':{note:'쓸 수 있는 에너지를 넘으면 단자 출력 상한을 같은 비율로 낮춤 · CO₂ 환산 1.3 kg/kWh'}},
  outputs:[
    {k:'t_acc_s', n:'가속 (75 m)', d:3, g:'종목 기록', fmt:t2Rec('g_acc', 3)}, {k:'t_skid_s', n:'스키드패드 (한 바퀴)', d:3, g:'종목 기록', fmt:t2Rec('g_skid', 3)},
    {k:'t_ax_s', n:'오토크로스 (정지 출발 한 바퀴)', d:2, g:'종목 기록', fmt:t2Rec('g_ax', 2)}, {k:'t_end_s', n:'내구 주행시간 (26랩, 교체 시간 제외)', d:1, g:'종목 기록', fmt:t2Rec('g_end', 1)},
    {k:'t_lap1', n:'내구 1번째 랩 (정지 출발)', u:'s', d:2, g:'종목 기록'}, {k:'t_fly', n:'내구 2번째 랩', u:'s', d:2, g:'종목 기록'},
    {k:'n_lap', n:'내구 랩 수', u:'랩', d:0, g:'종목 기록', hide:true}, {k:'n_st1', n:'첫 드라이버 랩 수', u:'랩', d:0, g:'종목 기록', hide:true},
    {k:'g_acc', n:'목표 가속', u:'s', d:3, hide:true}, {k:'g_skid', n:'목표 스키드패드', u:'s', d:3, hide:true}, {k:'g_ax', n:'목표 오토크로스', u:'s', d:2, hide:true}, {k:'g_end', n:'목표 내구', u:'s', d:1, hide:true},
    {k:'gr_opt', dk:'gr', n:'제안 감속비 (배점 가중)', d:2, g:'감속비'}, {k:'gr_acc', n:'가속이 가장 빠른 감속비', d:2, g:'감속비', fmt:t2GrF('tg_acc', 3)},
    {k:'gr_ax', n:'오토크로스가 가장 빠른 감속비', d:2, g:'감속비', fmt:t2GrF('tg_ax', 2)}, {k:'gr_end', n:'내구가 가장 빠른 감속비', d:2, g:'감속비', fmt:t2GrF('tg_end', 1)},
    {k:'tg_acc', n:'그때 가속', u:'s', d:3, hide:true}, {k:'tg_ax', n:'그때 오토크로스', u:'s', d:2, hide:true}, {k:'tg_end', n:'그때 내구', u:'s', d:1, hide:true},
    {k:'t_free1', n:'1번째 랩 (정지 출발)', u:'s', d:2, g:'내 코스'}, {k:'t_free2', n:'2번째 랩', u:'s', d:2, g:'내 코스'}, {k:'t_free', n:'모든 랩 합', u:'s', d:2, g:'내 코스'},
    {k:'n_free', n:'랩 수', u:'랩', d:0, g:'내 코스', hide:true}, {k:'e_free', n:'2번째 랩 단자 에너지 (한 랩이면 1번째)', u:'kWh', d:4, g:'내 코스'},
    {k:'vmax', dk:'vmax', d:1, g:'차량 한계'}, {k:'v_top', n:'오토크로스 최고 차속', u:'km/h', d:1, g:'차량 한계'}, {k:'ay_skid', dk:'ay_max_sim', d:2, g:'차량 한계'},
    {k:'ax_0', n:'출발 종가속도', u:'g', d:2, g:'차량 한계'}, {k:'cla_req', n:'스키드패드 목표에 필요한 C_L·A', u:'m²', d:2, g:'차량 한계', fmt:t2Cla},
    {k:'v_load', n:'최대 전류 때 단자 전압', u:'V', d:1, g:'축전지 · 모터'}, {k:'p_max', n:'단자 출력 상한 (규정 · 전류 한계)', u:'kW', d:2, g:'축전지 · 모터'}, {k:'n_base', n:'모터 기저 회전수 (공칭 전압)', u:'rpm', d:0, g:'축전지 · 모터'},
    {k:'e_cap', n:'쓸 수 있는 에너지', u:'kWh', d:2, g:'내구 에너지 (회생 제외)'}, {k:'e_use', n:'내구 소비 (저항 손실 포함)', u:'kWh', d:2, g:'내구 에너지 (회생 제외)'},
    {k:'p_lim', n:'출력 상한 비율', d:1, g:'내구 에너지 (회생 제외)', fmt:t2Lim}, {k:'e_ok', n:'한도 안', u:'', d:0, hide:true},
    {k:'soc_end', n:'끝 SOC', u:'%', d:1, g:'내구 에너지 (회생 제외)'}, {k:'v_min', n:'가장 낮은 단자 전압', u:'V', d:1, g:'내구 에너지 (회생 제외)'},
    {k:'e_end', n:'내구 단자 에너지', u:'kWh', d:2, g:'내구 에너지 (회생 제외)'}, {k:'e_lap', dk:'e_lap', d:3, g:'내구 에너지 (회생 제외)'}, {k:'co2_100', n:'보정 에너지 소비량', u:'kg/100 km', d:2, g:'내구 에너지 (회생 제외)', fmt:t2Co2}
  ],
  sigs:[
    {k:'v', n:'차속', u:'km/h', d:1}, {k:'pw', n:'바퀴 출력 (구동 +, 제동 −)', u:'kW', d:1}, {k:'vlim', n:'코너 한계 속도', u:'km/h', d:1}, {k:'ax', n:'종가속도', u:'g', d:2}, {k:'ay', n:'횡가속도', u:'g', d:2},
    {k:'fz_fo', n:'앞 바깥 바퀴 하중', u:'N', d:0}, {k:'fz_fi', n:'앞 안쪽 바퀴 하중', u:'N', d:0}, {k:'fz_ro', n:'뒤 바깥 바퀴 하중', u:'N', d:0}, {k:'fz_ri', n:'뒤 안쪽 바퀴 하중', u:'N', d:0},
    {k:'rpm', n:'모터 회전수', u:'rpm', d:0}, {k:'tq', n:'모터 토크', u:'N·m', d:1}, {k:'pbat', n:'축전지 단자 출력 (회생 제외)', u:'kW', d:1}, {k:'vbat', n:'축전지 단자 전압', u:'V', d:1},
    {k:'eta', n:'모터 × 인버터 효율', u:'%', d:1}, {k:'grip', n:'그립 사용률 (차 전체)', u:'%', d:0}, {k:'t', n:'경과 시간', u:'s', d:2}, {k:'ecum', n:'누적 단자 에너지', u:'Wh', d:0}
  ],
  sigOn:['v', 'pw'],
  extHTML: t2ExtHTML, extraI: t2ExtraI,
  extGet: () => ({course:T2.course, lap:{...T2.lap}, free:{...T2.free}, mtext:T2.mtext, mcol:T2.mcol, eM:T2.eM, eI:T2.eI}),
  extSet(d){ if(!d || typeof d!=='object') return;
    if(T2COURSES.includes(d.course)) T2.course = d.course; if(d.lap && typeof d.lap==='object') Object.assign(T2.lap, d.lap);
    if(d.free && typeof d.free.text==='string') Object.assign(T2.free, {text:d.free.text, closed:d.free.closed!==false, laps:Math.max(1, Math.round(+d.free.laps || 1)), s0:Math.max(0, +d.free.s0 || 0)});
    if(typeof d.mtext==='string') T2.mtext = d.mtext; if(d.mcol >= 1) T2.mcol = Math.round(d.mcol); if(typeof d.eM==='string') T2.eM = d.eM; if(typeof d.eI==='string') T2.eI = d.eI;
    t2Save(); wbPaint(['ext']); },
  onResult(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(); const c = $('#t2mc'); if(c) c.innerHTML = t2MotorPlots(); const l = $('#t2laps'); if(l) l.innerHTML = t2LapTable(); },
  onCursor(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(); },
  tour: M2TOUR,
  verifyBase:{end:{seg:[], laps:26, stint:13}, free:{seg:[], closed:true, laps:1, s0:0}, motor:[], effM:null, effI:null, r_pack:0, i_bms_max:1e9, pmax:1e6, eta_mot:100, eta_inv:100, course:'acc', lap:'2'},
  verify:[
    {n:'가속 · 접지 한계만 (μ = 1, CG 뒤축 위)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5}, expect:{t_acc_s:3.910309, ax_0:1}, src:'a = μg → t = √(2 × 75 ÷ 9.81)'},
    {n:'가속 · 회전부 관성 J ÷ r²', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100}, expect:{t_acc_s:5.477226}, src:'F = 100 × 4 ÷ 0.25 = 1600 N, 등가 질량 300 + 1.25 ÷ 0.25² = 320 kg → a = 5'},
    {n:'가속 · 구름 저항 무게 항', I:{m:300, fr:50, h:0, mu:10, crr:0.02, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100}, expect:{t_acc_s:5.580840}, src:'a = (1600 − 0.02 × 300 × 9.81) ÷ 320 = 4.8161'},
    {n:'회전수 한계 최고속', I:{nmax:6500, gr:3.55, r_eff:229}, expect:{vmax:158.0708}, src:'6500 ÷ 3.55 × 2π ÷ 60 × 0.229 × 3.6'},
    {n:'스키드패드 · 에어로 없음', I:{mu:1.5, crr:0, cla:0, cda:0}, expect:{t_skid_s:4.947846, ay_skid:1.5}, src:'v = √(μgR), R = 9.125 → T = 2πR ÷ v'},
    {n:'스키드패드 · 다운포스 (앞뒤 몫 = 무게 배분)', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:3, cda:0}, expect:{t_skid_s:4.735903}, src:'mv²/R = μ(mg + ½ρC_LA v²) → v² = μmg ÷ (m/R − μ½ρC_LA)'},
    {n:'스키드패드 목표 기록 → 필요 C_L·A', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:0, cda:0, t_skid:4.735903}, expect:{cla_req:3}, src:'위 경우를 거꾸로: 4.7359 s 에 필요한 C_L·A = 3'},
    {n:'하중 감도 0 → 횡하중 이동 배분과 상관없음', I:{mu:1.5, mu_s:0, lltd:20, crr:0, cla:0, cda:0}, expect:{t_skid_s:4.947846}, src:'μ 일정이면 축 힘 = μ × 축 하중 (좌우로 옮겨도 합은 같음)'},
    {n:'하중 감도 · 스키드패드', I:{m:300, fr:50, h:300, tf:1200, tr:1200, lltd:50, mu:1.5, mu_s:0.1, crr:0, cla:0, cda:0}, expect:{t_skid_s:5.138338, ay_skid:1.390843}, src:'축 하나: m·ay/2 = μ0·W/2 − μs(2(W/4)² + 2ΔF²), ΔF = ½·m·ay·h/t 를 ay 에 대해 풂'},
    {n:'내 코스 · 원 2번째 바퀴 = 스키드패드', I:{mu:1.5, crr:0, cla:0, cda:0, free:{seg:[[57.33407, 9.125]], closed:true, laps:2, s0:0}}, expect:{t_free2:4.947846}, src:'달리는 중 한 바퀴 = 2πR ÷ √(μgR)'},
    {n:'내 코스 · 출발 위치가 달라도 원은 같음', I:{mu:1.5, crr:0, cla:0, cda:0, free:{seg:[[57.33407, 9.125]], closed:true, laps:2, s0:20}}, expect:{t_free2:4.947846}, src:'원 위 모든 점이 같으므로 2번째 바퀴는 그대로'},
    {n:'직선 1 km · 최고속 일정 · 효율 상수', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_mot:100, eta_inv:100, nmax:6500, gr:3.55, r_eff:229, free:{seg:[[1000, 0]], closed:true, laps:2, s0:0}}, expect:{t_free2:22.77461, e_free:0.0122625}, src:'1000 ÷ 43.909 m/s, 한 바퀴 단자 에너지 = 0.015 × 300 × 9.81 × 1000 J'},
    {n:'효율 맵 (전부 80 %) = 상수 80 %', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_inv:100, effM:{n:[0, 10000], t:[0, 500], e:[[80, 80], [80, 80]]}, nmax:6500, gr:3.55, r_eff:229, free:{seg:[[1000, 0]], closed:true, laps:2, s0:0}}, expect:{e_free:0.01532813}, src:'0.0122625 ÷ 0.8'},
    {n:'축전지 · 최대 전류 때 단자 전압', I:{n_s:72, c_vmax:4.2, r_pack:180, i_bms_max:270}, expect:{v_load:253.8}, src:'72 × 4.2 − 270 × 0.18'},
    {n:'축전지 · 단자 출력 상한', I:{n_s:72, c_vmax:4.2, r_pack:180, i_bms_max:270, pmax:80}, expect:{p_max:68.526}, src:'min(80 kW, 253.8 V × 270 A) = 68.53 kW'},
    {n:'모터 · 기저 회전수가 전압에 비례', I:{motor:[[0, 200], [3000, 200], [6000, 100]], v_ref:300, ke_ratio:1, n_s:50, c_vnom:3, nmax:9000, tmax:250}, expect:{n_base:1565}, src:'표 기준 300 V 에서 3000 rpm 부터 줄어듦 → 150 V 면 1500 rpm 부터. 98 % (196 N·m) 는 1560 rpm, 그 아래로 처음 내려가는 5 rpm 칸 = 1565'},
    {n:'내구 · 26랩 = 드라이버 13 + 13', I:{end:{seg:[[100, 0]], laps:26, stint:13}}, expect:{n_lap:26, n_st1:13}, src:'대회 공식'},
    {n:'내구 · 에너지 제한이 걸리면 소비 ≤ 한도', I:{end:{seg:[[400, 0], [31.4159, 10], [400, 0], [31.4159, 10]], laps:26, stint:13}, e_target:3, pmax:80}, expect:{e_ok:1}, src:'한도 3 kWh 로 줄이면 출력 상한을 낮춰 맞춤'}
],
  code:`// 입력 I: 왼쪽 입력 칸(단위도 같음: kg, mm, %, 1/kN, rpm, N·m, kW, V, Ah, mΩ, A, kWh, s)과 작업창 위 표에서 온 값
//   I.end  = {seg:[[길이 m, 반경 m], …], laps, stint}  공식 내구 코스 (오토크로스 = 거꾸로 한 바퀴)
//   I.free = {seg, closed, laps, s0}                    내 코스 (반경: 왼쪽 회전 +, 오른쪽 −, 직선 0)
//   I.motor = [[회전수 rpm, 토크 N·m], …]  모터 토크 곡선 (기준 전압 I.v_ref 에서. 비면 최대 토크 일정)
//   I.effM · I.effI = 효율 맵 {n:[회전수], t:[토크], e:[[%]]} 또는 null(→ 상수 I.eta_mot · I.eta_inv)
//   I.course = 결과 그래프 코스('free' · 'ax' · 'end' · 'acc' · 'skid'), I.lap = 볼 바퀴('1' … · 'all'), I._sweep = 입력 훑기 중
// 모델: 점질량 준정적(QSS). 앞뒤 하중 이동(종가속 · 항력 높이 · 다운포스 앞뒤 몫), 좌우 하중 이동(앞 몫 = lltd),
//   바퀴마다 μ = μ0 − 하중 감도 × 하중(kN) → 축이 낼 수 있는 힘 = Σ μ·Fz. 횡력은 무게 배분대로 앞뒤 축에 나눔.
//   뒤축 구동(모터 1개, 축 단위 마찰원). 제동은 이상 배분 가정(제동 장치 한계는 도구 3). 롤 · 회생 제동 · 디퍼렌셜은 넣지 않음.
//   모터: 토크 곡선의 회전수 축을 (단자 전압 ÷ 기준 전압) ÷ (유도 전압 비)로 늘이고 줄임(약계자 구간이 전압에 비례한다는 1차 근사).
//   축전지: 개방 전압 = 직렬 수 × (셀 최소 + (셀 최대 − 셀 최소) × SOC) (선형 근사), 단자 전압 = 개방 전압 − 전류 × 팩 저항.
//   단자 출력 ≤ 규정 출력 상한 · 전류 한계. 모터 축 출력 = 단자 출력 × 모터 효율 × 인버터 효율.
//   내구 에너지 제한: 소비(개방 전압 × 전류, 저항 손실 포함)가 쓸 수 있는 에너지를 넘으면 단자 출력 상한을 같은 비율로 낮춰 맞춤.
const g = 9.81, RHO = 1.225;                                   // 중력가속도 [m/s²], 공기 밀도 [kg/m³]
let VC = null;                                                 // 곡률별 코너 한계 속도 (감속비 · 전압과 상관없음 → 계산 한 번에 한 번)
const tab1 = (t, x) => { if(x <= t[0][0]) return t[0][1]; for(let i = 1; i < t.length; i++) if(x <= t[i][0]){ const a = t[i-1], b = t[i]; return a[1] + (b[1] - a[1])*(x - a[0])/((b[0] - a[0]) || 1); } return t[t.length-1][1]; };
function bil(M, n, T){ const f = (a, x) => { if(x <= a[0]) return [0, 0, 0]; const k = a.length - 1; if(x >= a[k]) return [k, k, 0]; let i = 0; while(a[i+1] < x) i++; return [i, i+1, (x - a[i])/(a[i+1] - a[i])]; };
  const [j0, j1, u] = f(M.n, n), [i0, i1, w] = f(M.t, T), e = M.e;
  return (e[i0][j0]*(1-u) + e[i0][j1]*u)*(1-w) + (e[i1][j0]*(1-u) + e[i1][j1]*u)*w; }
function car(I, gr, kP){
  const m = I.m, L = I.L/1000, h = I.h/1000, fs = I.fr/100, fa = 1 - I.xcop/I.L, hc = I.hcop/1000, r = I.r_eff/1000, tf = I.tf/1000, tr = I.tr/1000, lt = I.lltd/100;
  const mu = I.mu, mus = I.mu_s || 0, crr = I.crr, cl = 0.5*RHO*I.cla, cd = 0.5*RHO*I.cda, eta = I.eta_dt/100;
  const meff = m + I.j_eq/(r*r);                               // 회전부 등가 질량 = J ÷ r² (J ÷ r 이 아님: 예전 계산기 오류)
  // 축전지
  const Ns = I.n_s, Rb = Math.max(0, I.r_pack)/1000, Imax = I.i_bms_max, Pmax = I.pmax*1000, kk = kP || 1;
  const Voc = soc => Ns*(I.c_vmin + (I.c_vmax - I.c_vmin)*Math.max(0, Math.min(1, soc)));
  const Epack = Ns*I.n_p*I.c_ah*I.c_vnom*3600;                // 팩 공칭 에너지 [J] (SOC 계산 기준)
  const Ecap = I.e_target > 0 ? I.e_target*3.6e6 : Epack;      // 내구에 쓸 수 있는 에너지 [J] (0 = 팩 공칭 전체)
  function term(P, V0){ if(P <= 0) return {I:0, V:V0}; if(Rb <= 0) return {I:P/V0, V:V0};
    const D = V0*V0 - 4*Rb*P; if(D < 0) return null; const i = (V0 - Math.sqrt(D))/(2*Rb); return {I:i, V:V0 - i*Rb}; }
  function ptMax(V0){ const iI = Math.min(Imax, Rb > 0 ? V0/(2*Rb) : Infinity); return kk*Math.min(Pmax, (V0 - iI*Rb)*iI); }   // kk = 에너지 제한 배율
  // 모터
  const tq = (I.motor || []).slice().sort((a, b) => a[0] - b[0]), ke = I.ke_ratio > 0 ? I.ke_ratio : 1, nmax = I.nmax;
  function Tcurve(n, V){ if(n > nmax) return 0; if(!tq.length) return I.tmax; const sf = (V/I.v_ref)/ke, nt = n/sf, z = tq[tq.length-1];
    return Math.min(nt <= z[0] ? tab1(tq, nt) : z[1]*z[0]/nt, I.tmax); }
  const eM = (n, T) => (I.effM ? bil(I.effM, n, Math.abs(T)) : I.eta_mot)/100, eI = (n, T) => (I.effI ? bil(I.effI, n, Math.abs(T)) : I.eta_inv)/100;
  const rpm = v => v/r*gr*60/(2*Math.PI);
  const vtop = nmax/gr*2*Math.PI/60*r*(1 - 1e-9);              // 회전수 한계 최고속 [m/s]
  // 바퀴 구동력: 모터 곡선(단자 전압으로 보정)과 단자 출력 한계(÷ 효율) 중 작은 쪽. 단자 전압은 그 출력의 전류로 떨어짐 → 3번 되풀이
  const DM = new Map();                                         // 구동력 기억 (차속 0.01 m/s · 전압 0.1 V 단위로 같은 값 다시 씀, 계산 시간)
  function drive(v, V0){ const key = Math.round(v*100)*65536 + Math.round(V0*10); let r_ = DM.get(key); if(!r_){ r_ = drive_(v, V0); DM.set(key, r_); } return r_; }
  function drive_(v, V0){ const n = rpm(v), w = n*2*Math.PI/60, Pt = ptMax(V0); let V = V0, T = Tcurve(n, V0);
    for(let it = 0; it < 3; it++){ const e = eM(n, T)*eI(n, T); T = Tcurve(n, V); if(w > 0) T = Math.min(T, Pt*e/w);
      const tr_ = term(T*w/e, V0); V = tr_ ? tr_.V : V0/2; }
    return {T, F:T*gr*eta/r, V}; }
  const Fres = v => cd*v*v + crr*(m*g + cl*v*v);               // 항력 + 구름 저항 (구름 저항 = 계수 × (무게 + 다운포스), 무게 항 포함)
  const Fzf = (v, ax) => m*g*fs + cl*v*v*fa - m*ax*h/L - cd*v*v*hc/L;
  const Fzr = (v, ax) => m*g*(1 - fs) + cl*v*v*(1 - fa) + m*ax*h/L + cd*v*v*hc/L;
  const dF = (ay, front) => front ? lt*m*ay*h/tf : (1 - lt)*m*ay*h/tr;
  const wheels = (Fz, d) => { let o = Fz/2 + d, i = Fz/2 - d; if(i < 0){ o = Fz; i = 0; } return [Math.max(0, o), i]; };
  const cap = (Fz, d) => { if(!mus) return mu*Math.max(0, Fz); const [o, i] = wheels(Fz, d), f = z => Math.max(0, mu - mus*z/1000)*z; return f(o) + f(i); };
  const capF = (v, ax, ay) => cap(Fzf(v, ax), dF(ay, true)), capR = (v, ax, ay) => cap(Fzr(v, ax), dF(ay, false));
  function vCorner(k){ k = Math.abs(k); if(k < 1e-9) return Infinity; if(VC && VC.has(k)) return VC.get(k); let v;
    if(!mus){ let v2 = Infinity; const cf = m*k*fs - mu*(cl*fa - cd*hc/L), cr = m*k*(1 - fs) - mu*(cl*(1 - fa) + cd*hc/L);
      if(fs > 0 && cf > 0) v2 = Math.min(v2, mu*m*g*fs/cf); if(fs < 1 && cr > 0) v2 = Math.min(v2, mu*m*g*(1 - fs)/cr); v = Math.sqrt(v2); }
    else { const ok = u => { const ay = u*u*k; return m*ay*fs <= capF(u, 0, ay) + 1e-9 && m*ay*(1 - fs) <= capR(u, 0, ay) + 1e-9; };
      let lo = 0, hi = 150; if(ok(hi)) v = Infinity; else { for(let i = 0; i < 50; i++){ const md = (lo + hi)/2; if(ok(md)) lo = md; else hi = md; } v = lo; } }
    if(VC) VC.set(k, v); return v; }
  function aDrive(v, k, a0, V0){ const ay = v*v*Math.abs(k), Fyr = m*ay*(1 - fs), Fyf = m*ay*fs, Fm = drive(v, V0).F; let ax = a0 || 0;
    for(let it = 0; it < 4; it++){ const N = capR(v, ax, ay), Fx = Math.sqrt(Math.max(0, N*N - Fyr*Fyr)); ax = (Math.min(Fm, Fx) - Fres(v))/meff; }
    if(Fyf > 0 && h > 0 && capF(v, ax, ay) < Fyf){ let lo = -3*g, hi = ax; if(capF(v, lo, ay) >= Fyf){ for(let i = 0; i < 40; i++){ const md = (lo + hi)/2; if(capF(v, md, ay) >= Fyf) lo = md; else hi = md; } ax = lo; } }
    return ax; }
  function aBrake(v, k){ const ay = v*v*Math.abs(k); let d = 0;
    for(let it = 0; it < 3; it++){ const N = capF(v, -d, ay) + capR(v, -d, ay), Fx = Math.sqrt(Math.max(0, N*N - (m*ay)*(m*ay))); d = (Fx + Fres(v))/meff; } return d; }
  // 한 칸의 전기: 바퀴 힘 F 를 낼 때 모터 토크 · 효율 · 단자 출력 · 전류 · 단자 전압
  function elec(F, v, V0){ if(F <= 0) return {T:0, e:1, P:0, I:0, V:V0}; const n = rpm(v), w = n*2*Math.PI/60, T = F*r/(gr*eta), e = eM(n, T)*eI(n, T), P = T*w/e;
    const tr_ = term(P, V0) || {I:Math.min(Imax, V0/(2*Math.max(Rb, 1e-9))), V:V0/2}; return {T, e, P, I:tr_.I, V:tr_.V}; }
  return {m, meff, r, gr, eta, fs, h, nmax, vtop, rpm, Fres, Fzr, Fzf, dF, wheels, capF, capR, vCorner, aDrive, aBrake, drive, elec, Tcurve, Voc, Epack, Ecap, ptMax, Rb, Imax};
}
// 코스 → 점 (간격 ds 이하). k[j] = j번째 칸의 곡률 [1/m]
function grid(segs, ds){ const s = [0], k = []; for(const [l, R] of segs){ const n = Math.max(1, Math.ceil(l/ds - 1e-9)), st = l/n; for(let i = 0; i < n; i++){ k.push(R ? 1/R : 0); s.push(s[s.length-1] + st); } } return {s, k}; }
function rotate(segs, s0){ const len = segs.reduce((a, r) => a + r[0], 0); s0 = ((s0 % len) + len) % len; if(s0 < 1e-9) return segs.slice();
  let c = 0; for(let i = 0; i < segs.length; i++){ const [l, R] = segs[i]; if(s0 < c + l - 1e-9){ const a = s0 - c, head = a > 1e-9 ? [[a, R]] : [];
      return [[l - a, R], ...segs.slice(i + 1), ...segs.slice(0, i), ...head]; } c += l; } return segs.slice(); }
const reverse = segs => segs.slice().reverse().map(([l, R]) => [l, -R]);
// 차속: 코너 한계 → 앞으로 가속(정지 출발) → 뒤에서 제동. V0[i] = 칸마다 개방 전압 (바퀴마다 SOC)
function speed(C, G, V0){ const N = G.s.length, v = new Array(N), lim = new Array(N);
  for(let i = 0; i < N; i++) lim[i] = Math.min(C.vCorner(Math.max(Math.abs(G.k[i-1] || 0), Math.abs(G.k[i] || 0))), C.vtop);
  v[0] = 0; let a = 0;
  for(let i = 0; i < N - 1; i++){ a = C.aDrive(v[i], G.k[i], a, V0[i]); v[i+1] = Math.min(lim[i+1], Math.sqrt(Math.max(0, v[i]*v[i] + 2*a*(G.s[i+1] - G.s[i])))); }
  for(let i = N - 2; i >= 0; i--){ const b = C.aBrake(v[i+1], G.k[i]); v[i] = Math.min(v[i], Math.sqrt(v[i+1]*v[i+1] + 2*b*(G.s[i+1] - G.s[i]))); }
  return {v, lim}; }
// 차속 → 누적 시간 · 에너지(단자 · 소비), rec 이면 신호
function walk(C, G, v, V0, rec){ const N = v.length, tc = [0], et = [0], ec = [0], S = rec ? {pw:[], ax:[], ay:[], rpm:[], tq:[], pbat:[], vbat:[], eta:[], grip:[], fz_fo:[], fz_fi:[], fz_ro:[], fz_ri:[]} : null; let vmin = Infinity;
  for(let i = 0; i < N - 1; i++){ const ds = G.s[i+1] - G.s[i], vm = (v[i] + v[i+1])/2, dt = vm > 0 ? ds/vm : Infinity, ax = (v[i+1]*v[i+1] - v[i]*v[i])/(2*ds);
    const F = C.meff*ax + C.Fres(vm), E = C.elec(F, vm, V0[i]); tc.push(tc[i] + dt); et.push(et[i] + E.P*dt); ec.push(ec[i] + V0[i]*E.I*dt); if(E.V < vmin) vmin = E.V;
    if(rec){ const ay = vm*vm*Math.abs(G.k[i]), [fo, fi] = C.wheels(C.Fzf(vm, ax), C.dF(ay, true)), [ro, ri] = C.wheels(C.Fzr(vm, ax), C.dF(ay, false));
      S.pw.push(F*vm/1000); S.ax.push(ax/g); S.ay.push(ay/g); S.rpm.push(C.rpm(v[i])); S.tq.push(E.T); S.pbat.push(E.P/1000); S.vbat.push(E.V); S.eta.push(E.P > 0 ? E.e*100 : NaN);
      S.grip.push(Math.hypot(C.m*ax, C.m*ay)/Math.max(1e-9, C.capF(vm, ax, ay) + C.capR(vm, ax, ay))*100); S.fz_fo.push(fo); S.fz_fi.push(fi); S.fz_ro.push(ro); S.fz_ri.push(ri); } }
  if(rec) for(const k in S) S[k].push(S[k][S[k].length-1]);
  return {tc, et, ec, S, vmin}; }
// 바퀴 m개를 이어서 정지 출발. 바퀴마다 SOC → 개방 전압 (두 번 계산: 첫 번은 SOC 그대로, 두 번째는 앞 바퀴들 소비만큼 낮춤)
function laps(C, segs, m, ds, soc0, fixedV){ const P = grid(segs, ds).s.length - 1, rep = []; for(let j = 0; j < m; j++) rep.push(...segs);
  const G = grid(rep, ds), N = G.s.length; let V0 = new Array(N).fill(fixedV || C.Voc(soc0)), sp, W, socs = [];
  for(let pass = 0; pass < (fixedV ? 1 : 2); pass++){ sp = speed(C, G, V0); W = walk(C, G, sp.v, V0, false);
    if(fixedV) break; socs = []; let soc = soc0; for(let j = 0; j < m; j++){ socs.push(soc); soc -= (W.ec[(j+1)*P] - W.ec[j*P])/C.Epack; }
    V0 = G.s.map((_, i) => C.Voc(socs[Math.min(m - 1, Math.floor(i/P))])); }
  const t = [], Et = [], Ec = []; for(let j = 0; j < m; j++){ t.push(W.tc[(j+1)*P] - W.tc[j*P]); Et.push(W.et[(j+1)*P] - W.et[j*P]); Ec.push(W.ec[(j+1)*P] - W.ec[j*P]); }
  return {G, v:sp.v, lim:sp.lim, V0, P, t, Et, Ec, socs, vmin:W.vmin, soc1: soc0 - Ec.reduce((a, b) => a + b, 0)/C.Epack}; }
// 스키드패드: 일정 반경 R 에서 낼 수 있는 가장 빠른 일정 차속 (앞축 횡력 · 뒤축 마찰원 · 모터 힘) → 이분법
function skidV(C, R, V0){ const m = C.m, fs = C.fs;
  const ok = v => { const ay = v*v/R, Fx = C.Fres(v); if(C.drive(v, V0).F < Fx) return false;
    if(m*ay*fs > C.capF(v, 0, ay) + 1e-9) return false; const N = C.capR(v, 0, ay); return (m*ay*(1 - fs))**2 + Fx*Fx <= N*N; };
  let lo = 0, hi = C.vtop; if(ok(hi)) return hi; for(let i = 0; i < 60; i++){ const md = (lo + hi)/2; if(ok(md)) lo = md; else hi = md; } return lo; }
const SK_R = 9.125, SK_IN = 15;                                // 스키드패드 주행 반경 = 안쪽 원 반지름 7.625 + 차로 폭 절반 1.5 [m] (제9조 ②), 진입 직선 길이(근사)
const SKID = [[SK_IN, 0], [2*Math.PI*SK_R, -SK_R], [2*Math.PI*SK_R, -SK_R], [2*Math.PI*SK_R, SK_R], [2*Math.PI*SK_R, SK_R], [SK_IN, 0]];   // 오른쪽 2바퀴 → 왼쪽 2바퀴
const ACC_L = 75;                                              // 가속 구간 [m] (규정에 숫자가 없어 75 m 기준)
// 내구: 드라이버 2명이 n1 · n2 바퀴를 각각 정지 출발로 이어서 (제11조 ⑦). full = 바퀴를 모두 계산(SOC 반영), 아니면 3바퀴로 줄여 셈(SOC 중간값 고정, 감속비 고르기용)
function endurance(I, C, full, ds){ const E = I.end || {}, segs = E.seg || [], n = E.laps || 26, n1 = E.stint || Math.floor(n/2), n2 = n - n1; if(!segs.length) return null;
  if(full){ const A = laps(C, segs, n1, ds, 1), B = laps(C, segs, n2, ds, A.soc1);
    return {T: A.t.reduce((a, b) => a + b, 0) + B.t.reduce((a, b) => a + b, 0), Et: [...A.Et, ...B.Et].reduce((a, b) => a + b, 0), Ec: [...A.Ec, ...B.Ec].reduce((a, b) => a + b, 0), A, B, n, n1, t:[...A.t, ...B.t], et:[...A.Et, ...B.Et], soc:[...A.socs, ...B.socs], soc1:B.soc1, vmin:Math.min(A.vmin, B.vmin)}; }
  const Vm = C.Voc(1 - 0.5*Math.min(1, C.Ecap/C.Epack)), L3 = laps(C, segs, 3, ds, 1, Vm), t = L3.t, et = L3.Et, ec = L3.Ec;
  const st = (k, a) => k <= 0 ? 0 : k===1 ? a[0] : a[0] + (k - 2)*a[1] + a[2];
  return {T: st(n1, t) + st(n2, t), Et: st(n1, et) + st(n2, et), Ec: st(n1, ec) + st(n2, ec), n, n1}; }
// 에너지 제한: 소비가 쓸 수 있는 에너지를 넘으면 단자 출력 상한 배율 k 를 찾음
function powerCut(I, gr){ const C1 = car(I, gr, 1), E1 = endurance(I, C1, false, 3); if(!E1 || E1.Ec <= C1.Ecap) return 1;
  // 소비 ≒ 출력 상한 배율 k 의 매끈한 함수 → 할선법(secant) 몇 번 (줄여 셈, 점 간격 3 m)
  let k0 = 1, e0 = E1.Ec - C1.Ecap, k1 = Math.max(0.05, Math.min(0.95, C1.Ecap/E1.Ec)), e1 = endurance(I, car(I, gr, k1), false, 3).Ec - C1.Ecap;
  for(let i = 0; i < 5 && Math.abs(e1) > 0.002*C1.Ecap; i++){ const k2 = Math.max(0.05, Math.min(1, k1 - e1*(k1 - k0)/((e1 - e0) || 1e-9))); k0 = k1; e0 = e1; k1 = k2; e1 = endurance(I, car(I, gr, k1), false, 3).Ec - C1.Ecap; }
  return e1 > 0 ? k1*0.995 : k1; }
// 종목 기록 (감속비 gr). 가속 · 오토크로스 · 스키드패드는 SOC 100 % 에서
function events(I, gr, fast){ const ds = fast ? 3 : 1, C = car(I, gr, 1), V1 = C.Voc(1);
  const GA = grid([[ACC_L, 0]], 0.5), A = speed(C, GA, new Array(GA.s.length).fill(V1)), WA = walk(C, GA, A.v, new Array(GA.s.length).fill(V1), false);
  const vs = skidV(C, SK_R, V1), segs = (I.end && I.end.seg) || [], X = segs.length ? laps(C, reverse(segs), 1, ds, 1, V1) : null;
  let k = powerCut(I, gr), CE = k < 1 ? car(I, gr, k) : C, EN = endurance(I, CE, !fast, ds);
  if(!fast && EN && EN.Ec > C.Ecap){ k *= Math.pow(C.Ecap/EN.Ec, 1.5); CE = car(I, gr, k); EN = endurance(I, CE, true, ds); }   // 줄여 셈과 다 셈의 차이를 한 번 더 맞춤
  return {C, CE, k, acc:WA.tc[WA.tc.length-1], skid:2*Math.PI*SK_R/vs, vs, ax: X ? X.t[0] : NaN, X, EN, end: EN ? EN.T : NaN}; }
// 감속비: 2.5 ~ 7.0 을 0.5 간격으로 보고 가장 좋은 곳 ± 0.4 를 0.1 간격으로 다시 봄. 종목별 가장 빠른 값 + 배점 가중 제안
//   제안 = Σ 배점 × (지금 기록 − 그 감속비 기록) ÷ 지금 기록 이 가장 큰 값 (가속 100 · 오토크로스 200 · 내구 350. 스키드패드는 감속비와 거의 상관없어 뺌)
function bestGr(I){ const W = {acc:100, ax:200, end:350}, memo = new Map(), ev = gg => { gg = Math.round(gg*100)/100; if(!memo.has(gg)) memo.set(gg, events(I, gg, true)); return memo.get(gg); };
  const E0 = ev(I.gr), J = E => Object.keys(W).reduce((a, k) => a + (isFinite(E0[k]) && isFinite(E[k]) ? W[k]*(E0[k] - E[k])/E0[k] : 0), 0);
  const pick = f => { let b = 2.5; for(let x = 2.5; x <= 7.0001; x += 0.5) if(f(ev(x)) > f(ev(b))) b = x; const b0 = b; for(let x = Math.max(2.5, b0 - 0.4); x <= Math.min(7, b0 + 0.4) + 1e-9; x += 0.1) if(f(ev(x)) > f(ev(b)) + 1e-12) b = x; return Math.round(b*100)/100; };
  const out = {}; ['acc', 'ax', 'end'].forEach(k => { const b = pick(E => isFinite(E[k]) ? -E[k] : -Infinity); out[k] = b; out['t_' + k] = ev(b)[k]; });
  out.opt = pick(J); out.Jopt = J(ev(out.opt)); return out; }
// 스키드패드 목표 기록에 필요한 C_L·A (공력 중심 위치는 그대로, 크기만)
function claNeed(I){ if(!(I.t_skid > 0)) return NaN; const tAt = c => { const J = {...I, cla:c}; VC = new Map(); const C = car(J, I.gr, 1); return 2*Math.PI*SK_R/skidV(C, SK_R, C.Voc(1)); };
  const keep = VC; let r = NaN; if(tAt(0) <= I.t_skid) r = 0; else if(tAt(15) > I.t_skid) r = NaN; else { let lo = 0, hi = 15; for(let i = 0; i < 40; i++){ const md = (lo + hi)/2; if(tAt(md) > I.t_skid) lo = md; else hi = md; } r = hi; }
  VC = keep; return r; }
// 모터 기저 회전수: 토크 곡선이 최대의 98 % 아래로 처음 내려가는 회전수 (공칭 개방 전압에서)
function nBase(I, C){ const V = I.n_s*I.c_vnom, T0 = C.Tcurve(1, V); for(let n = 0; n <= I.nmax; n += 5) if(C.Tcurve(n, V) < 0.98*T0) return n; return NaN; }
// 내 코스: 바퀴 수만큼 이어서 정지 출발 (닫힌 경로가 아니면 한 번)
function freeRun(I, C, ds){ const F = I.free || {}, segs0 = (F.seg || []).filter(r => r[0] > 0); if(!segs0.length) return null;
  const closed = F.closed !== false, segs = closed ? rotate(segs0, F.s0 || 0) : segs0, m = closed ? Math.max(1, Math.round(F.laps || 1)) : 1;
  return {...laps(C, segs, m, ds, 1), segs, m, closed}; }
function calc(I){ VC = new Map();
  const E = events(I, I.gr, !!I._sweep), C = E.C, B = I._sweep ? null : bestGr(I), FR = I._sweep ? null : freeRun(I, C, 0.5);   // 입력 훑기 중에는 줄여 셈만 (계산 시간)
  if(I._sweep) return {out:{t_acc_s:E.acc, t_skid_s:E.skid, t_ax_s:E.ax, t_end_s:E.end, e_use: E.EN ? E.EN.Ec/3.6e6 : NaN, p_lim:E.k*100, vmax:C.vtop*3.6, ay_skid:E.vs*E.vs/SK_R/g}};
  const EN = E.EN, km = EN ? EN.n*(I.end.seg.reduce((a, r) => a + r[0], 0))/1000 : NaN, kWh = EN ? EN.Et/3.6e6 : NaN;
  const out = { t_acc_s:E.acc, t_skid_s:E.skid, t_ax_s:E.ax, t_end_s:E.end, t_lap1: EN && EN.t ? EN.t[0] : NaN, t_fly: EN && EN.t ? EN.t[1] : NaN, n_lap: EN ? EN.n : NaN, n_st1: EN ? EN.n1 : NaN,
    g_acc:I.t_acc, g_skid:I.t_skid, g_ax:I.t_ax, g_end:I.t_end,
    t_free: FR ? FR.t.reduce((a, b) => a + b, 0) : NaN, t_free1: FR ? FR.t[0] : NaN, t_free2: FR && FR.t.length > 1 ? FR.t[1] : NaN, n_free: FR ? FR.m : NaN, e_free: FR ? FR.Et[Math.min(1, FR.Et.length - 1)]/3.6e6 : NaN,
    vmax:C.vtop*3.6, v_top: E.X ? Math.max(...E.X.v)*3.6 : NaN, ay_skid:E.vs*E.vs/SK_R/g, ax_0:C.aDrive(0, 0, 0, C.Voc(1))/g, cla_req: I._sweep ? NaN : claNeed(I),
    n_base:nBase(I, C), v_load:C.Voc(1) - Math.min(C.Imax, C.Voc(1)/(2*Math.max(C.Rb, 1e-9)))*C.Rb, p_max:C.ptMax(C.Voc(1))/1000,
    gr_opt: B ? B.opt : NaN, gr_acc: B ? B.acc : NaN, gr_ax: B ? B.ax : NaN, gr_end: B ? B.end : NaN, tg_acc: B ? B.t_acc : NaN, tg_ax: B ? B.t_ax : NaN, tg_end: B ? B.t_end : NaN,
    e_end:kWh, e_cap:C.Ecap/3.6e6, e_use: EN ? EN.Ec/3.6e6 : NaN, p_lim:E.k*100, e_ok: EN ? (EN.Ec <= C.Ecap*1.01 ? 1 : 0) : NaN, soc_end: EN ? EN.soc1*100 : NaN, v_min: EN ? EN.vmin : NaN,
    e_lap: EN && EN.et ? EN.et[1]/3.6e6 : NaN, co2_100: km > 0 ? kWh*1.3/km*100 : NaN };
  // 모터 탭 그림: 토크 곡선(표 기준 전압 · 팀 축전지 공칭 · 최대 전류 때 단자 전압)과 구동력 선도
  const Vn = I.n_s*I.c_vnom, NN = Array.from({length:131}, (_, i) => I.nmax*i/130), vt = C.vtop, V = Array.from({length:121}, (_, i) => vt*i/120);
  const motor = {n:NN, tref:NN.map(n => C.Tcurve(n, I.v_ref*(I.ke_ratio > 0 ? I.ke_ratio : 1))), tnom:NN.map(n => C.Tcurve(n, Vn)), tload:NN.map(n => C.Tcurve(n, out.v_load))};
  const ft = {v:V.map(x => x*3.6), f_m:V.map(x => C.drive(x, C.Voc(1)).F), f_x:V.map(x => C.capR(x, 0, 0)), f_res:V.map(C.Fres)};
  // 결과 그래프: 고른 코스
  let G, v, lim, V0, from = 0, to, map = null, laps_ = null;
  const pickLaps = (L, nL, off) => { const P = L.P, sel = I.lap; if(sel==='all') return [0, L.G.s.length - 1];
    const j = Math.max(1, Math.min(nL, parseInt(sel) || 1)) - 1 - (off || 0); return [j*P, (j + 1)*P]; };
  if(I.course==='end' && EN && EN.A){ const j = parseInt(I.lap) || 1, useB = I.lap!=='all' && j > EN.n1, L = useB ? EN.B : EN.A;
    G = L.G; v = L.v; lim = L.lim; V0 = L.V0; [from, to] = pickLaps(L, EN.n, useB ? EN.n1 : 0); laps_ = {t:EN.t, e:EN.et, soc:EN.soc, n1:EN.n1};
    if(I.lap==='all'){ const A = EN.A, Bq = EN.B, sA = A.G.s, sB = Bq.G.s, off = sA[sA.length-1];
      G = {s:[...sA, ...sB.slice(1).map(x => x + off)], k:[...A.G.k, ...Bq.G.k]}; v = [...A.v, ...Bq.v.slice(1)]; lim = [...A.lim, ...Bq.lim.slice(1)]; V0 = [...A.V0, ...Bq.V0.slice(1)]; from = 0; to = G.s.length - 1; }
    const P = EN.A.P, jj = I.lap==='all' ? 1 : (parseInt(I.lap) || 1) - 1, LL = jj >= EN.n1 ? EN.B : EN.A, o = (jj >= EN.n1 ? jj - EN.n1 : jj)*P;
    map = {P, rev:false, vc:LL.v.slice(o, o + P + 1).map(a => a*3.6)}; }
  else if(I.course==='ax' && E.X){ G = E.X.G; v = E.X.v; lim = E.X.lim; V0 = E.X.V0; to = G.s.length - 1; map = {P:E.X.P, rev:true, vc:E.X.v.slice().reverse().map(a => a*3.6)}; }
  else if(I.course==='free' && FR){ G = FR.G; v = FR.v; lim = FR.lim; V0 = FR.V0; [from, to] = pickLaps(FR, FR.m, 0); laps_ = {t:FR.t, e:FR.Et, soc:FR.socs};
    const jj = I.lap==='all' ? (FR.m > 1 ? 1 : 0) : Math.min(FR.m, parseInt(I.lap) || 1) - 1; map = {P:FR.P, rev:false, vc:FR.v.slice(jj*FR.P, (jj + 1)*FR.P + 1).map(a => a*3.6)}; }
  else if(I.course==='skid'){ const L = laps(C, SKID, 1, 0.5, 1, C.Voc(1)); G = L.G; v = L.v; lim = L.lim; V0 = L.V0; to = G.s.length - 1; map = {skid:true}; }
  else { const GA = grid([[ACC_L, 0]], 0.5), VA = new Array(GA.s.length).fill(C.Voc(1)), sp = speed(C, GA, VA); G = GA; v = sp.v; lim = sp.lim; V0 = VA; to = G.s.length - 1; map = {acc:true}; }
  const CW = I.course==='end' ? E.CE : C, sl = a => a.slice(from, to + 1), Gs = {s:sl(G.s).map(x => x - G.s[from]), k:G.k.slice(from, to)}, vv = sl(v), W = walk(CW, Gs, vv, sl(V0), true);
  return { out, x:{d:Gs.s}, sig:{v:vv.map(a => a*3.6), vlim:sl(lim).map(a => a*3.6), t:W.tc, ecum:W.et.map(e => e/3600), ...W.S}, map, laps:laps_, motor, ft };
}
`
};

/* ---------- 대시보드 '파트별 > 차량 목표 · 파워트레인': 대시보드 값으로 도구 2를 돌린 결과(읽기 전용) ---------- */
const T2P = { R:null, key:'', busy:false, w:null };
const T2ONLY = ['v_ref', 'ke_ratio', 'eta_mot', 'eta_inv', 'c_vmax', 'c_vmin', 'c_vnom', 'c_ah'];   // 대시보드에 없는 입력: 도구에 저장된 값을 씀
function t2PartInputs(){ const I = {}; WB_TOOLS['2'].inputs.forEach(d => { const db = wbDash(d.dk); I[d.k] = db ? db.v : d.v; });
  try{ const s = JSON.parse(localStorage.getItem(wbStoreKey('2')) || '{}') || {}; T2ONLY.forEach(k => { if(typeof s[k]==='number' && isFinite(s[k])) I[k] = s[k]; }); }catch(e){}
  return {...I, ...t2ExtraI(), course:'acc', lap:'1'}; }
function t2PartDirty(){ T2P.key = ''; if(typeof DASH!=='undefined' && (DASH.part==='goal' || DASH.part==='pt') && $('#t2part')) t2PartRun(); }
function t2PartRun(){ const I = t2PartInputs(), key = JSON.stringify(I); if(key===T2P.key || T2P.busy) return; T2P.busy = true;
  try{ if(!T2P.w) T2P.w = new Worker(URL.createObjectURL(new Blob([WB_TOOLS['2'].code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false}); } };'], {type:'text/javascript'}))); }catch(e){ T2P.busy = false; return; }
  T2P.w.onmessage = e => { T2P.busy = false; T2P.key = key; if(e.data.ok){ T2P.R = e.data.r; const b = $('#t2part'); if(b) b.innerHTML = t2PartBody(DASH.part, I, T2P.R); } };
  T2P.w.postMessage(I); }
function t2PartHTML(kind){ setTimeout(t2PartRun, 0);
  return `<div class="t2-part"><p class="dp-note">대시보드 설계값과 도구 2의 코스 · 모터 · 효율 표로 계산한 결과입니다. 표를 바꾸려면 <button type="button" class="lnk" data-wb="2">도구 2 랩타임 시뮬레이터</button>를 엽니다.</p><div id="t2part">${T2P.R ? t2PartBody(kind, t2PartInputs(), T2P.R) : '<p class="muted">계산 중…</p>'}</div></div>`; }
function t2PartBody(kind, I, R){ const o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  if(kind==='goal'){ const rows = [['가속', o.g_acc, o.t_acc_s, 3], ['스키드패드', o.g_skid, o.t_skid_s, 3], ['오토크로스', o.g_ax, o.t_ax_s, 2], ['내구', o.g_end, o.t_end_s, 1]];
    return `<table class="dvi-t t2-gt"><thead><tr><th>종목</th><th>예상 기록</th><th>목표 기록</th><th>차이</th></tr></thead><tbody>${rows.map(([n, g0, t, d]) => { const has = g0 > 0, df = t - g0;
        return `<tr><td>${n}</td><td><b>${f(t, d)}</b> s</td><td>${has ? f(g0, d) + ' s' : '<span class="muted">정하지 않음</span>'}</td><td class="${has && isFinite(df) ? (df > 0 ? 'wb-err' : 'ok') : ''}">${has && isFinite(df) ? (df > 0 ? '+' : '−') + wbFmt(Math.abs(df), d) + ' s' : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="dp-note">목표 기록은 대시보드 '차량 목표'(공통) 값입니다. 차이가 + 면 목표보다 느립니다. 제안 감속비 ${f(o.gr_opt, 2)} (지금 ${f(I.gr, 2)}).</p>`; }
  const F = R.ft; return `<div class="dp-plots">${wbPlot({id:'t2ft', w:640, h:280, x:{d:F.v, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:F.f_m, c:WB_COL[0], n:'모터 구동력', u:'N', dd:0}, {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}], label:'구동력 선도'})}</div>
    <div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴, SOC 100 %)</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진 · 일정 속도)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항 (항력 + 구름)</span></div>
    <p class="dp-note">감속비 ${f(I.gr, 2)} · 회전수 한계 최고속 ${f(o.vmax, 1)} km/h · 단자 출력 상한 ${f(o.p_max, 1)} kW. 모터 구동력이 접지 한계보다 큰 구간은 바퀴가 미끄러지므로 접지 한계가 가속을 정합니다. 제안 감속비 ${f(o.gr_opt, 2)}, 내구 한 랩 에너지 ${f(o.e_lap, 3)} kWh${o.p_lim < 99.95 ? `, 에너지 한도 때문에 출력 상한 ${f(o.p_lim, 1)} %` : ''}.</p>`; }
