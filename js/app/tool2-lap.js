/* ============================================================
   도구 2 — 랩타임 시뮬레이터 (QSS, 감속비 고르기 포함) · docs/TOOLS-PLAN.md 5절 · docs/HANDOFF.md 4-2절
   - 코스: 내 코스(사용자가 만든 코스) · 오토크로스 · 내구레이스 · 가속 · 스키드패드 (공식 4개는 고칠 수 없는 기본 코스)
     공식 내구 코스 = js/data/fsk2026-course.js (FSK26), 모터 기본값 = js/data/emrax228.js (EMRAX228)
   - 차량 모델: 점질량 준정적 + 앞뒤 · 좌우 하중 이동 + 타이어 하중 감도 + 뒤축 구동, 모터 곡선(전압 보정) · 효율(상수 또는 맵) · 축전지(내부저항 · SOC)
   - 결과: [내 감속비 | 최적 감속비] 기준 종목 기록(가장 빠른 기록 대비), 종목별 가장 빠른 감속비와 배점 가중 제안,
     고른 코스 · 볼 랩의 기록 · 축전지 · 모터 · 에너지, 내구 에너지 제한
   ============================================================ */
const T2KEY = 'run2x.wb.2.ext.v2';
const T2TRACK_EX = '25, 0   # 출발 직선\n5, 25   # 슬라럼 (파일런 간격 10 m)\n10, -25\n10, 25\n10, -25\n10, 25\n10, -25\n10, 25\n5, -25\n20, 0\n31.42, 20   # 왼쪽 90° (지름 40 m)\n40, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n30, 0\n15.71, 5   # 왼쪽 헤어핀 (지름 10 m)\n35, 0\n17.28, -5.5   # 오른쪽 헤어핀 (지름 11 m)\n35, 0\n23.56, 15   # 왼쪽 90° (지름 30 m)\n50, 0\n20.94, 30   # 완만한 굽이\n20.94, -30\n40, 0\n21.82, 25   # 반경이 줄어드는 왼쪽 회전\n8.38, 12\n42.32, 0\n15.71, 5   # 왼쪽 헤어핀\n30, 0\n17.28, -5.5   # 오른쪽 헤어핀\n25, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n20, 0\n28.27, 18   # 왼쪽 90° (지름 36 m)\n12.99, 0   # 결승 직선';
const T2TRACK_PH = '한 줄에 한 구간 — 종류, 길이 m, 반경 m\n직선, 54.0\n왼쪽, 2.2, 2.6\n오른쪽, 9.9, 18.1\n\n엑셀에서 열을 복사해 붙여 넣어도 됩니다.\n종류 대신 반경 부호도 됨: 왼쪽 +, 오른쪽 −, 직선 0 (예: 25, 0 · 15.7, -5)\n# 뒤는 메모';
const T2MOTOR_PH = '첫 줄은 열 이름, 그 아래 한 줄에 회전수와 토크\n회전수 rpm, 최대 토크 N·m, 연속 토크 N·m\n0, 230, 110\n4800, 230, 112\n6500, 180, 92\n\n토크 열이 여럿이면 위에서 쓸 열을 고릅니다.';
const T2EFF_PH = '비우면 왼쪽 입력 칸의 상수 효율을 씁니다.\n숫자 하나 = 상수 효율 [%] (예: 97)\n맵 = 첫 줄은 회전수, 첫 열은 토크, 칸은 효율 %\n토크 N·m \\ 회전수 rpm, 0, 2000, 4000\n50, 88, 93, 92\n150, 90, 95, 94\n230, 87, 93, 92';
/* 화면 상태 (이 브라우저에 저장). free.text = 내 코스 표를 글로 (한 줄에 한 구간) */
const T2 = { tab:'course', course:'end', lap:{end:'1', free:'1'}, free:{text:'', laps:1, s0:0}, mtext:'', mcol:1, eM:'', eI:'', grMode:'my', mtab:'mt', menu:'', paste:'', timer:0 };
T2.free.text = T2TRACK_EX.split('\n').map(l => l).join('\n');
T2.mtext = (typeof EMRAX228!=='undefined' ? EMRAX228.torque : ''); T2.eM = (typeof EMRAX228!=='undefined' ? EMRAX228.eff : '');
const T2COURSES = ['free', 'ax', 'end', 'acc', 'skid'];
function t2Load(s){ if(!s || typeof s!=='object') return;
  if(T2COURSES.includes(s.course)) T2.course = s.course; if(s.lap && typeof s.lap==='object') Object.assign(T2.lap, s.lap);
  if(s.free && typeof s.free.text==='string') Object.assign(T2.free, {text:s.free.text, laps:Math.max(1, Math.round(+s.free.laps || 1)), s0:Math.max(0, +s.free.s0 || 0)});
  if(typeof s.mtext==='string') T2.mtext = s.mtext; if(s.mcol >= 1) T2.mcol = Math.round(s.mcol); if(typeof s.eM==='string') T2.eM = s.eM; if(typeof s.eI==='string') T2.eI = s.eI;
  if(s.grMode==='my' || s.grMode==='opt') T2.grMode = s.grMode; if(['course', 'motor'].includes(s.tab)) T2.tab = s.tab; if(['mt', 'eM', 'eI'].includes(s.mtab)) T2.mtab = s.mtab; }
try{ t2Load(JSON.parse(localStorage.getItem(T2KEY) || '{}')); }catch(e){}
const t2Save = () => { try{ localStorage.setItem(T2KEY, JSON.stringify({course:T2.course, lap:T2.lap, free:T2.free, mtext:T2.mtext, mcol:T2.mcol, eM:T2.eM, eI:T2.eI, grMode:T2.grMode, tab:T2.tab, mtab:T2.mtab})); }catch(e){} };

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
function t2Track(txt){ const rows = [], bad = [];   // bad = 숫자가 없는 줄 (첫 구간 앞 머리줄은 빼고)
  t2Lines(txt).forEach(L => { if(!L.cells.length) return; const r = t2CellsToRows([L.cells]); if(r.length){ if(L.note) r[0].note = (r[0].note ? r[0].note + ' ' : '') + L.note; rows.push(r[0]); } else if(rows.length) bad.push(L.i); });
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
  free:{seg:t2Track(T2.free.text).segs, laps:T2.free.laps, s0:T2.free.s0}, motor:t2MotorParse(T2.mtext).pts,
  effM:t2EffParse(T2.eM).map, effI:t2EffParse(T2.eI).map, course:T2.course, lap:T2.lap[T2.course] || '1', grMode:T2.grMode });

/* ---------- 파일 가져오기 · 양식 받기 ---------- */
async function t2ReadCells(file){ const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(ext==='xlsx') return await t2Xlsx(await file.arrayBuffer());
  if(['csv', 'txt', 'tsv'].includes(ext)) return (await file.text()).split(/\r?\n/).map(l => l.split(/[,;\t]/));
  throw new Error(`읽을 수 없는 파일입니다 (.${ext || '확장자 없음'}). .xlsx · .csv 를 올리거나, 엑셀 .xls 는 [다른 이름으로 저장 → .xlsx]로 저장해 올려 주십시오.`); }
async function t2Import(file, what){ try{ const cells = await t2ReadCells(file), txt = cells.map(r => r.map(c => String(c ?? '').trim()).join(', ').replace(/(, )+$/, '')).filter(l => l.replace(/[, ]/g, '')).join('\n');
    if(what==='track'){ const P = t2Track(txt); if(!P.rows.length) throw new Error('구간을 찾지 못했습니다. 한 줄에 길이 m, 반경 m 두 숫자(또는 종류, 길이, 반경)가 있어야 합니다.');
      T2.free.text = t2RowsText(P.rows); toast(`${file.name}: 구간 ${P.rows.length}개 읽음${P.bad.length ? ` · ${P.bad.slice(0, 5).join(', ')}번째 줄은 숫자가 없어 건너뜀` : ''}`); }
    else if(what==='motor'){ T2.mtext = txt; const P = t2MotorParse(txt); if(!P.pts.length) throw new Error('회전수 · 토크 줄을 찾지 못했습니다.'); toast(`${file.name}: ${P.pts.length}점 · 토크 열 ${P.cols.length}개`); }
    else { const P = t2EffParse(txt); if(!P.map) throw new Error('효율 맵을 읽지 못했습니다. 첫 줄 = 회전수, 첫 열 = 토크.'); if(what==='eM') T2.eM = txt; else T2.eI = txt; toast(`${file.name}: ${P.msg.replace(/<[^>]+>/g, '')}`); }
    t2Save(); t2Repaint(); wbRefresh(); t2PartDirty(); }
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
/* 양식: '#' 로 시작하는 줄은 안내 (읽을 때 건너뜀). 쉼표 대신 · 를 씀 (csv 칸 나눔과 섞이지 않게) */
const T2TPL = {
  track:{name:'내코스_양식', rows:[
    ['# 내 코스 양식 — 한 줄에 한 구간 · 위에서부터 달리는 순서'], ['# 종류: 직선 · 왼쪽 · 오른쪽 (영어 Straight · Left · Right 도 됨)'],
    ['# 길이 m · 반경 m (차 중심선 기준). 직선은 반경을 비움'], ['# 종류 칸 없이 길이 · 반경만 써도 됨: 반경 왼쪽 + · 오른쪽 − · 직선 0'],
    ['# 숫자가 없는 줄(머리줄)과 # 줄은 건너뜀 · 옵티멈랩 구간 표(Type · Length · Radius)도 그대로 읽음 · 엑셀 .xls 는 .xlsx 로 저장해 올림'],
    ['종류', '길이 m', '반경 m', '메모'], ['직선', 54, '', '출발 직선'], ['왼쪽', 2.2, 2.6, ''], ['오른쪽', 9.9, 18.1, ''], ['직선', 30, '', '']]},
  motor:{name:'모터토크_양식', rows:[
    ['# 모터 토크 곡선 양식 — 첫 열 회전수 rpm · 다음 열부터 토크 N·m (열이 여럿이면 도구에서 쓸 열을 고름)'], ['# 도구 왼쪽 [모터 표 기준 전압]에서 잰 곡선을 넣음 · # 줄은 건너뜀'],
    ['회전수 rpm', '최대 토크 N·m', '연속 토크 N·m'], [0, 230, 110], [4800, 230, 112], [6500, 180, 92]]},
  eff:{name:'효율맵_양식', rows:[
    ['# 효율 양식 — 숫자 하나만 쓰면 상수 효율 % · 표면 맵'], ['# 맵: 첫 줄 = 회전수 rpm · 첫 열 = 토크 N·m · 칸 = 효율 % (0 ~ 1 비율로 써도 됨)'], ['# # 줄은 건너뜀'],
    ['토크 N·m \\ 회전수 rpm', 0, 2000, 4000], [50, 88, 93, 92], [150, 90, 95, 94], [230, 87, 93, 92]]} };
function t2Template(kind, fmt){ const T = T2TPL[kind]; let blob;
  if(fmt==='xlsx') blob = t2XlsxBlob(T.rows); else blob = new Blob(['﻿' + T.rows.map(r => r.join(',')).join('\r\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${T.name}.${fmt}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }


/* ============================================================ 작업창 위: [코스] · [모터 · 효율] 탭
   두 탭 모두 같은 모양: 위 설정 줄 + 왼쪽 표(높이 고정, 넘치면 스크롤) + 오른쪽 그림.
   표는 칸을 눌러 고치고, [입력하기]로 붙여넣기 · 파일 가져오기 · 양식 받기. 공식 코스는 고칠 수 없음(비활성) */
const T2CN = {free:'내 코스', ax:'오토크로스', end:'내구레이스', acc:'가속', skid:'스키드패드'};
const T2MT = {mt:'토크 곡선', eM:'모터 효율', eI:'인버터 효율'};
const t2Sum = a => a.reduce((x, y) => x + y, 0);
const t2Closed = () => T2.free.laps > 1 || T2.free.s0 > 0;      // 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스

function t2ExtHTML(){ const tabs = [['course', '코스'], ['motor', '모터 · 효율']];
  return `<section class="wb-sec t2-ext" aria-label="코스 · 모터"><div class="wb-h t2-h"><div class="m1-tabs" role="tablist">${tabs.map(([k, t]) => `<button type="button" role="tab" data-t2tab="${k}" aria-selected="${T2.tab===k}">${t}</button>`).join('')}</div>
      ${T2.tab==='course' ? `<span class="t2-vw"><span class="muted">코스</span><span class="dc-seg" role="group" aria-label="코스 고르기">${T2COURSES.map(k => `<button type="button" data-t2course="${k}" aria-pressed="${T2.course===k}">${T2CN[k]}</button>`).join('')}</span></span>`
        : `<span class="t2-vw"><span class="dc-seg" role="group" aria-label="표 고르기">${Object.entries(T2MT).map(([k, t]) => `<button type="button" data-t2mt="${k}" aria-pressed="${T2.mtab===k}">${t}</button>`).join('')}</span></span>`}</div>
    ${T2.tab==='course' ? t2CourseHTML() : t2MotorHTML()}${t2PasteHTML()}</section>`; }

/* ---------- [입력하기 ▾] 메뉴: 표 k = track · mt · eM · eI */
function t2MenuHTML(k, label, on){ const tpl = k==='track' ? 'track' : k==='mt' ? 'motor' : 'eff';
  const items = [`<button type="button" data-t2act="paste" data-t2k="${k}">붙여넣기</button>`, `<label class="t2-mi">파일 가져오기 (.xlsx · .csv)<input type="file" accept=".xlsx,.csv,.txt,.tsv" data-t2file="${k}" hidden></label>`,
    `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.xlsx">양식 받기 (.xlsx)</button>`, `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.csv">양식 받기 (.csv)</button>`,
    k==='track' ? `<button type="button" data-t2act="ex" data-t2k="track">예시 코스로</button>` : '',
    k==='mt' || k==='eM' ? `<button type="button" data-t2act="ex" data-t2k="${k}">EMRAX 228 데이터시트 값으로</button>` : '',
    k==='eM' || k==='eI' ? `<button type="button" data-t2act="clear" data-t2k="${k}">비우기 (왼쪽 상수 칸 사용)</button>` : ''].filter(Boolean);
  return `<div class="t2-menu"><button type="button" class="btn small" data-t2menu="${k}" aria-expanded="${T2.menu===k}"${on ? '' : ' disabled'}>${label} ▾</button>${T2.menu===k ? `<div class="t2-mn" role="menu">${items.join('')}</div>` : ''}</div>`; }

/* ---------- 붙여넣기 창 (넣으면 표를 덮어씀) */
function t2PasteHTML(){ const k = T2.paste; if(!k) return '';
  const ph = k==='track' ? T2TRACK_PH : k==='mt' ? T2MOTOR_PH : T2EFF_PH, nm = k==='track' ? '내 코스 구간' : T2MT[k];
  return `<div class="t2-pm" role="dialog" aria-label="${nm} 붙여넣기"><div class="t2-pmb"><h4>${nm} 붙여넣기</h4>
      <textarea id="t2pta" spellcheck="false" rows="12" placeholder="${wbEsc(ph)}"></textarea>
      <p class="muted">[넣기]를 누르면 지금 표를 덮어씁니다.</p>
      <div class="t2-btns"><button type="button" class="btn small primary" data-t2pok>넣기</button><button type="button" class="btn small" data-t2px>닫기</button></div></div></div>`; }

/* ============================================================ 코스 탭 */
/* 공식 코스 설명 (고칠 수 없음) */
const T2INFO = {
  free: () => '랩 수가 2 이상이거나 출발 위치가 0이 아니면 끝을 처음에 이어 붙인 닫힌 코스로 계산합니다. 1번째 랩은 정지 출발, 2번째부터 앞 랩 끝 속도를 이어받습니다.',
  ax:   () => `공식 내구 코스를 거꾸로 한 바퀴, 정지 출발.`,
  end:  () => `FSK 2026 공식 코스 × ${FSK26.laps}랩 = ${wbFmt(FSK26.len*FSK26.laps/1000, 2)} km. 드라이버당 ${FSK26.stint}랩, 각 드라이버 정지 출발(1 · ${FSK26.stint + 1}번째 랩), 교체 시간 제외. 랩마다 SOC가 줄어 축전지 전압이 떨어집니다.`,
  acc:  () => '직선 75 m, 정지 출발.',
  skid: () => '8자 코스 (두 원 중심 거리 18.25 m, 안쪽 지름 15.25 m, 차로 폭 3 m), 주행 반경 9.125 m. 기록 = 오른쪽 2번째 · 왼쪽 2번째 바퀴 평균 (일정 반경이라 정상 선회 속도로 계산).' };
/* 코스 → 표 행 {l 길이 m, R 반경 m (왼쪽 +), note} */
function t2CourseRows(c){
  if(c==='free') return t2Track(T2.free.text).rows;
  if(c==='end') return FSK26.seg.map(([l, R]) => ({l, R, note:''}));
  if(c==='ax')  return FSK26.seg.slice().reverse().map(([l, R]) => ({l, R:-R, note:''}));
  if(c==='acc') return [{l:75, R:0, note:'가속 구간'}];
  const C2 = 2*Math.PI*9.125;
  return [{l:15, R:0, note:'진입'}, {l:C2, R:-9.125, note:'오른쪽 1바퀴'}, {l:C2, R:-9.125, note:'오른쪽 2바퀴 (기록)'}, {l:C2, R:9.125, note:'왼쪽 1바퀴'}, {l:C2, R:9.125, note:'왼쪽 2바퀴 (기록)'}, {l:15, R:0, note:'탈출'}]; }
const t2LapsOf = c => c==='free' ? T2.free.laps : c==='end' ? FSK26.laps : 1;
function t2LapSel(){ const c = T2.course, n = t2LapsOf(c), cur = n > 1 ? (T2.lap[c] || '1') : '1';
  const o = n > 1 ? [...Array.from({length:n}, (_, i) => [String(i + 1), `${i + 1}번째 랩${c==='end' && (i===0 || i===FSK26.stint) ? ' (정지 출발)' : ''}`]), ['all', `전체 ${n}랩 이어서`]] : [['1', '1번째 랩']];
  return `<select data-t2lap${n > 1 ? '' : ' disabled'}>${o.map(([k, t]) => `<option value="${k}"${cur===k ? ' selected' : ''}>${t}</option>`).join('')}</select>`; }
function t2CourseHTML(){ const c = T2.course, own = c==='free', rows = t2CourseRows(c);
  return `<div class="t2-set">
      <label>랩 수 <input type="number" min="1" step="1" data-t2o="laps" value="${t2LapsOf(c)}"${own ? '' : ' disabled'}></label>
      <label>출발 위치 <input type="number" min="0" step="any" data-t2o="s0" value="${own ? T2.free.s0 : 0}"${own ? '' : ' disabled'}> m</label>
      <label>볼 랩 <span id="t2lapw">${t2LapSel()}</span></label>
      <span class="t2-sum" id="t2sum">${t2SumText(rows)}</span>
      ${t2MenuHTML('track', '코스 입력하기', own)}</div>
    <p class="t2-rule muted">${own ? '' : '<b>공식 코스 · 고칠 수 없음.</b> '}${T2INFO[c]()}</p>
    <div class="t2-tr"><div class="t2-tw" id="t2tt">${t2TrackTable(rows, own)}</div>
      <figure class="t2-map"><div id="t2map">${t2MapSVG()}</div><figcaption class="muted" id="t2mcap"></figcaption></figure></div>`; }
function t2SumText(rows){ if(!rows.length) return '<span class="wb-err">구간 없음</span>';
  const len = t2Sum(rows.map(r => r.l)); return `한 바퀴 <b>${wbFmt(len, 1)}</b> m · 구간 ${rows.length}개`; }
/* 구간 표. own = 내 코스 (칸을 눌러 고침 · × 지우기 · + 구간) */
function t2TrackTable(rows, own){ const ed = (i, k, v, cls) => own ? `<td class="t2-e${cls ? ' ' + cls : ''}" data-t2e="${i},${k}" tabindex="0">${v}</td>` : `<td${cls ? ` class="${cls}"` : ''}>${v}</td>`;
  const body = rows.map((r, i) => `<tr>${ed(i, 'no', i + 1, 'muted')}${ed(i, 'type', r.R ? (r.R > 0 ? '왼쪽' : '오른쪽') : '직선')}${ed(i, 'l', wbFmt(r.l, 2), 'n')}${ed(i, 'R', r.R ? wbFmt(Math.abs(r.R), 2) : '', 'n')}${ed(i, 'ang', r.R ? wbFmt(r.l/Math.abs(r.R)*180/Math.PI, 1) : '', 'n')}${ed(i, 'note', wbEsc(r.note || ''), 'muted')}${own ? `<td><button type="button" class="t2-x" data-t2del="${i}" aria-label="${i + 1}번 구간 지우기">×</button></td>` : ''}</tr>`).join('');
  return `<table class="t2-tt"><thead><tr><th>#</th><th>종류</th><th>길이 m</th><th>반경 m</th><th>각도 °</th><th>메모</th>${own ? '<th></th>' : ''}</tr></thead>
    <tbody>${body || `<tr><td colspan="7" class="muted">구간이 없습니다. [코스 입력하기]로 붙여 넣거나 파일을 가져오십시오.</td></tr>`}</tbody></table>
    ${own ? '<button type="button" class="btn small t2-add" data-t2add>+ 구간</button>' : ''}`; }
/* 표 → 글 (저장 · 내보내기 형식) */
const t2RowsText = rows => rows.map(r => `${r.R ? (r.R > 0 ? '왼쪽' : '오른쪽') : '직선'}, ${+r.l.toFixed(4)}${r.R ? ', ' + +Math.abs(r.R).toFixed(4) : ''}${r.note ? '  # ' + r.note.replace(/#/g, '') : ''}`).join('\n');
/* 칸 고치기: k = no(번호 → 그 자리로 옮기고 뒤를 밀어냄) · type · l · R · ang(각도 → 길이) · note */
function t2Edit(i, k, v){ const rows = t2Track(T2.free.text).rows, r = rows[i]; if(!r) return; const x = parseFloat(v);
  if(k==='no'){ if(!isFinite(x)) return; const n = Math.max(1, Math.min(rows.length, Math.round(x))); rows.splice(i, 1); rows.splice(n - 1, 0, r); }
  else if(k==='type'){ const R0 = Math.abs(r.R) || 10; r.R = v==='직선' ? 0 : v==='왼쪽' ? R0 : -R0; }
  else if(k==='l'){ if(!(x > 0)) return; r.l = x; }
  else if(k==='R'){ if(!(x > 0) || !r.R) return; r.R = Math.sign(r.R)*x; }
  else if(k==='ang'){ if(!(x > 0) || !r.R) return; r.l = Math.abs(r.R)*x*Math.PI/180; }
  else if(k==='note') r.note = String(v).replace(/#/g, '').trim();
  t2SetRows(rows); }
function t2SetRows(rows){ T2.free.text = t2RowsText(rows); t2Repaint(); t2Soon(); }
/* 칸을 누르면 입력칸으로 바뀜 (Enter · 칸 밖 누름 = 반영, Esc = 취소) */
function t2CellOpen(td){ if(td.querySelector('input,select')) return; const [i, k] = td.dataset.t2e.split(','), now = td.textContent.trim(); let f;
  if(k==='type'){ f = document.createElement('select'); ['직선', '왼쪽', '오른쪽'].forEach(o => { const op = document.createElement('option'); op.textContent = o; if(o===now) op.selected = true; f.appendChild(op); }); }
  else { f = document.createElement('input'); f.type = k==='note' ? 'text' : 'number'; f.step = 'any'; f.value = k==='note' ? now : String(now).replace(/,/g, ''); }
  f.className = 't2-ci'; td.textContent = ''; td.appendChild(f); f.focus(); if(f.select) f.select(); let done = false;
  const commit = ok => { if(done) return; done = true; if(ok && f.value!==now) (td.dataset.t2g ? t2GridEdit : t2Edit)(+i, td.dataset.t2g ? +k : k, f.value); else t2Repaint(); };
  f.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); commit(true); } else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); commit(false); } });
  f.addEventListener('blur', () => commit(true)); if(k==='type') f.addEventListener('change', () => commit(true)); }

/* ============================================================ 모터 · 효율 탭 */
/* 글 ↔ 칸 (첫 줄이 숫자가 아니면 머리줄) */
const t2Grid = txt => t2Lines(txt).filter(l => l.cells.length).map(l => l.cells);
const t2GridText = g => g.map(r => r.join(', ')).join('\n');
const t2MtText = k => k==='mt' ? T2.mtext : T2[k];
function t2MtSet(k, txt){ if(k==='mt') T2.mtext = txt; else T2[k] = txt; t2Repaint(); t2Soon(); }
function t2GridEdit(r, c, v){ const k = T2.mtab, g = t2Grid(t2MtText(k)); if(!g[r]) return; g[r][c] = String(v).trim(); t2MtSet(k, t2GridText(g)); }
function t2MotorHTML(){ const k = T2.mtab, txt = t2MtText(k), M = k==='mt' ? t2MotorParse(txt) : null, E = k==='mt' ? null : t2EffParse(txt);
  const msg = k==='mt' ? t2MotorMsg(M) : (E.msg || `비어 있음 → 왼쪽 [${k==='eM' ? '모터' : '인버터'} 효율] 상수 칸`);
  return `<div class="t2-set">
      ${k==='mt' && M.cols.length > 1 ? `<label>쓸 토크 열 <select data-t2mcol>${M.cols.map((c, i) => `<option value="${i + 1}"${M.col===i + 1 ? ' selected' : ''}>${wbEsc(c)}</option>`).join('')}</select></label>` : ''}
      <span class="t2-sum" id="t2msum">${msg}</span>${t2MenuHTML(k, '입력하기', true)}</div>
    <p class="t2-rule muted">${k==='mt' ? '왼쪽 [모터 표 기준 전압]에서 잰 곡선. 축전지 단자 전압과 유도 전압 비에 맞춰 회전수 축을 늘이고 줄입니다. 비면 [모터 최대 토크] 일정.'
      : '숫자 하나 = 상수 효율 %, 표 = 맵 (첫 줄 회전수 rpm, 첫 열 토크 N·m, 칸 효율 %). 모터 × 인버터 효율을 곱해 쓰므로, 합친 맵을 모터에 넣고 인버터를 100 으로 둬도 같습니다.'}</p>
    <div class="t2-tr"><div class="t2-tw" id="t2tt">${t2GridTable(k, txt)}</div><figure class="t2-mc" id="t2mc">${t2MotorPlots()}</figure></div>`; }
function t2MotorMsg(M){ return M.pts.length ? `${M.pts.length}점 · ${wbFmt(M.pts[0][0], 0)} ~ ${wbFmt(M.pts[M.pts.length-1][0], 0)} rpm · 최대 ${wbFmt(Math.max(...M.pts.map(p => p[1])), 1)} N·m` : '비어 있음 → 왼쪽 [모터 최대 토크] 일정'; }
/* 칸 표: 토크 곡선은 행 추가 · 지우기, 효율은 칸만 고침 (행 · 열을 바꾸려면 [입력하기]) */
function t2GridTable(k, txt){ const g = t2Grid(txt); if(!g.length) return '<p class="muted t2-empty">비어 있습니다. [입력하기]로 붙여 넣거나 파일을 가져오십시오.</p>';
  const head = !isFinite(parseFloat(g[0][0])) || (k!=='mt' && g.length > 1), rows = head ? g.slice(1) : g, add = k==='mt', off = head ? 1 : 0, nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  const cell = (r, c, v, th) => `<${th ? 'th' : 'td'} class="t2-e${c===0 && k!=='mt' && !th ? ' t2-rh' : ''}" data-t2e="${r},${c}" data-t2g="1" tabindex="0">${wbEsc(v ?? '')}</${th ? 'th' : 'td'}>`;
  return `<table class="t2-tt t2-gtab${k!=='mt' ? ' map' : ''}">${head ? `<thead><tr>${Array.from({length:nc}, (_, c) => cell(0, c, g[0][c], true)).join('')}${add ? '<th></th>' : ''}</tr></thead>` : ''}
    <tbody>${rows.map((r, i) => `<tr>${Array.from({length:nc}, (_, c) => cell(i + off, c, r[c])).join('')}${add ? `<td><button type="button" class="t2-x" data-t2gdel="${i + off}" aria-label="${i + 1}번 줄 지우기">×</button></td>` : ''}</tr>`).join('')}</tbody></table>
    ${add ? '<button type="button" class="btn small t2-add" data-t2gadd>+ 줄</button>' : ''}`; }
/* 오른쪽 그림: 토크 곡선 · 구동력 선도 (토크 탭) / 효율 맵 색 지도 (효율 탭) */
function t2MotorPlots(){ const R = WB.id==='2' ? WB.R : null; if(!R || !R.motor) return '<p class="wb-empty">계산 중…</p>'; const M = R.motor, F = R.ft, I = WB.I, k = T2.mtab;
  if(k!=='mt'){ const E = t2EffParse(t2MtText(k)); if(!E.map) return `<p class="muted">맵이 없어 왼쪽 [${k==='eM' ? '모터' : '인버터'} 효율] ${wbFmt(I[k==='eM' ? 'eta_mot' : 'eta_inv'], 1)} % 를 씁니다.</p>`;
    if(t2Grid(t2MtText(k)).length < 2) return `<p class="muted">상수 ${E.msg.replace(/^상수 /, '')} 를 씁니다.</p>`;
    return `<div class="t2-hm"><b>${T2MT[k]} 맵</b>${t2Heat(E.map)}</div>`; }
  return wbPlot({id:'t2m', w:560, h:240, x:{d:M.n, n:'모터 회전수', u:'rpm'}, ys:[{k:'a', d:M.tref, c:'#9aa0ab', n:'표 그대로', u:'N·m', dd:0}, {k:'b', d:M.tnom, c:WB_COL[0], n:'축전지 공칭', u:'N·m', dd:0}, {k:'c', d:M.tload, c:WB_COL[3], n:'최대 전류 때', u:'N·m', dd:0}], yn:{'N·m':'모터 최대 토크'}, label:'모터 토크 곡선'})
    + `<div class="wb-leg"><span><i style="background:#9aa0ab"></i>표 그대로 (팀 모터로 ${wbFmt(I.v_ref*(I.ke_ratio || 1), 0)} V 상당)</span><span><i style="background:${WB_COL[0]}"></i>축전지 공칭 ${wbFmt(I.n_s*I.c_vnom, 0)} V</span><span><i style="background:${WB_COL[3]}"></i>최대 전류 때 ${wbFmt(R.out.v_load, 0)} V</span><span class="muted">기저 회전수 ${wbFmt(R.out.n_base, 0)} rpm</span></div>`
    + wbPlot({id:'t2ft', w:560, h:240, x:{d:F.v, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:F.f_m, c:WB_COL[0], n:'모터 구동력', u:'N', dd:0}, {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}], yn:{'N':'바퀴 힘'}, label:'구동력 선도'})
    + `<div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴, SOC 100 %, 감속비 ${wbFmt(R.out.gr_use, 2)})</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항</span></div>`; }
/* 효율 맵 색 지도 (확인용) */
function t2Heat(M){ const W = 520, H = 220, L = 46, B = 30, T = 8, R = 8, pw = W - L - R, ph = H - T - B, n0 = M.n[0], n1 = M.n[M.n.length-1], t0 = M.t[0], t1 = M.t[M.t.length-1];
  const all = M.e.flat(), lo = Math.min(...all), hi = Math.max(...all); let s = `<svg viewBox="0 0 ${W} ${H}" class="t2-heat" role="img" aria-label="효율 맵">`;
  for(let i = 0; i < M.t.length; i++) for(let j = 0; j < M.n.length; j++){ const x0 = L + ((j ? (M.n[j-1] + M.n[j])/2 : n0) - n0)/(n1 - n0)*pw, x1 = L + ((j < M.n.length-1 ? (M.n[j] + M.n[j+1])/2 : n1) - n0)/(n1 - n0)*pw;
    const y1 = T + ph - ((i ? (M.t[i-1] + M.t[i])/2 : t0) - t0)/(t1 - t0)*ph, y0 = T + ph - ((i < M.t.length-1 ? (M.t[i] + M.t[i+1])/2 : t1) - t0)/(t1 - t0)*ph, f = hi > lo ? (M.e[i][j] - lo)/(hi - lo) : .5;
    s += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0 + .5).toFixed(1)}" height="${(y1 - y0 + .5).toFixed(1)}" fill="hsl(${(230 - 230*f).toFixed(0)} 70% ${(55 - 10*f).toFixed(0)}%)"><title>${wbFmt(M.n[j], 0)} rpm · ${wbFmt(M.t[i], 0)} N·m · ${wbFmt(M.e[i][j], 1)} %</title></rect>`; }
  s += `<text x="${L + pw/2}" y="${H - 4}" class="wb-tl" text-anchor="middle">모터 회전수 [rpm] · ${wbFmt(n0, 0)} ~ ${wbFmt(n1, 0)}</text><text x="12" y="${T + ph/2}" class="wb-tl" text-anchor="middle" transform="rotate(-90 12 ${T + ph/2})">토크 [N·m]</text>`;
  return s + `</svg><div class="wb-leg"><span class="muted">파랑 ${wbFmt(lo, 1)} % → 빨강 ${wbFmt(hi, 1)} % · 칸에 마우스를 올리면 값</span></div>`; }

/* ============================================================ 코스 지도 */
/* 구간 → 점 (계산의 grid 와 같은 나눔: 구간마다 ceil(길이 ÷ ds) 칸) */
function t2Pts(segs, ds, x, y, h){ const X = [x], Y = [y];
  segs.forEach(([l, R]) => { const n = Math.max(1, Math.ceil(l/ds - 1e-9)), st = l/n;
    for(let i = 0; i < n; i++){ if(!R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/R; x += R*(Math.sin(h + dh) - Math.sin(h)); y -= R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } X.push(x); Y.push(y); } });
  return {X, Y, h}; }
function t2Rot(segs, s0){ const len = t2Sum(segs.map(r => r[0])); s0 = ((s0 % len) + len) % len; if(s0 < 1e-9) return segs.slice();
  let c = 0; for(let i = 0; i < segs.length; i++){ const [l, R] = segs[i]; if(s0 < c + l - 1e-9){ const a = s0 - c, head = a > 1e-9 ? [[a, R]] : []; return [[l - a, R], ...segs.slice(i + 1), ...segs.slice(0, i), ...head]; } c += l; } return segs.slice(); }
/* 내 코스 지도: 원래 코스 위, 출발 위치부터 (계산과 같은 0.5 m 나눔) */
function t2FreeXY(){ const segs = t2Track(T2.free.text).segs; if(!segs.length) return null; const closed = t2Closed(), s0 = closed ? T2.free.s0 % Math.max(1e-9, t2Sum(segs.map(r => r[0]))) : 0;
  let x = 0, y = 0, h = 0, c = 0; for(const [l, R] of segs){ if(c + l >= s0 - 1e-9){ const P = t2Pts([[s0 - c, R]], 1e9, x, y, h); x = P.X[1] ?? x; y = P.Y[1] ?? y; h = P.h; break; } const P = t2Pts([[l, R]], 1e9, x, y, h); x = P.X[1]; y = P.Y[1]; h = P.h; c += l; }
  return t2Pts(closed ? t2Rot(segs, s0) : segs, 0.5, x, y, h); }
function t2MapSVG(){ const c = T2.course, R = WB.id==='2' ? WB.R : null, mp = R && R.map; let G, extra = '', P = 0, rev = false, vc = null, close = false;
  if(c==='ax' || c==='end'){ if(typeof FSK26==='undefined') return ''; G = {X:[...FSK26.X, FSK26.X[0]], Y:[...FSK26.Y, FSK26.Y[0]]}; close = true; rev = c==='ax';
    if(mp && mp.vc){ vc = mp.vc; P = mp.P; } }
  else if(c==='free'){ G = t2FreeXY(); if(!G) return '<p class="muted">구간이 없습니다.</p>'; close = t2Closed(); if(mp && mp.vc){ vc = mp.vc; P = mp.P; } }
  else if(c==='acc'){ G = t2Pts([[75, 0]], 0.5, 0, 0, 0); if(mp && mp.acc) vc = R.sig.v; }
  else { const SR = 9.125, C2 = 2*Math.PI*SR; G = t2Pts([[15, 0], [C2, -SR], [C2, -SR], [C2, SR], [C2, SR], [15, 0]], 0.5, 0, -15, Math.PI/2); if(mp && mp.skid) vc = R.sig.v;
    [[SR, 0], [-SR, 0]].forEach(([cx, cy]) => [7.625, 10.625].forEach(rr => { extra += `<circle data-c="${cx},${cy},${rr}" class="t2-sk"/>`; })); }
  /* 화면 맞춤 */
  const xs = G.X, ys = G.Y, x0 = Math.min(...xs) - (c==='skid' ? 3 : 0), x1 = Math.max(...xs) + (c==='skid' ? 3 : 0), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 22, W = 420, H = 300;
  const s = Math.min((W - 2*pad)/Math.max(1, x1 - x0), (H - 2*pad)/Math.max(1, y1 - y0)), ox = (W - (x1 - x0)*s)/2, oy = (H - (y1 - y0)*s)/2;
  const tx = x => ox + (x - x0)*s, ty = y => H - oy - (y - y0)*s, Pt = i => [tx(xs[i]), ty(ys[i])];
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="t2-msvg" role="img" aria-label="${T2CN[c]} 코스 지도">`;
  svg += extra.replace(/<circle data-c="([^,]+),([^,]+),([^"]+)" class="t2-sk"\/>/g, (_, a, b, r) => `<circle cx="${tx(+a).toFixed(1)}" cy="${ty(+b).toFixed(1)}" r="${(+r*s).toFixed(1)}" class="t2-sk"/>`);
  if((c==='ax' || c==='end') && FSK26.cones) FSK26.cones.forEach(([cx, cy, sd]) => { svg += `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="1.6" class="t2-cone ${sd}"/>`; });
  const N = xs.length, leg = '<span class="t2-mleg"><i class="sl"></i>출발 <i class="fin"></i>결승 <i class="arr">▶</i>주행 방향</span>';
  let cap = '';
  if(vc){ const V = vc.filter(isFinite), lo = Math.min(...V), hi = Math.max(...V), st = Math.max(1, Math.floor(N/700));
    for(let i = 0; i + st < N; i += st){ const kk = rev ? N - 1 - i : i, k = vc.length===N ? kk : Math.min(vc.length - 1, Math.round(kk*(vc.length - 1)/(N - 1))), vi = vc[k], f = hi > lo && isFinite(vi) ? (vi - lo)/(hi - lo) : .5, a = Pt(i), b = Pt(Math.min(N - 1, i + st));
      svg += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="hsl(${(230 - 230*f).toFixed(0)} 75% 45%)" stroke-width="4" stroke-linecap="round"/>`; }
    const lp = T2.lap[c]; cap = `느림 ${wbFmt(lo, 0)} km/h <i class="t2-grad"></i> 빠름 ${wbFmt(hi, 0)} km/h${(c==='end' || c==='free') && t2LapsOf(c) > 1 ? ` · ${lp==='all' ? '2번째' : lp + '번째'} 랩` : ''} · 작은 점 = 커서 ${leg}`; }
  else { svg += `<polyline points="${xs.map((_, i) => Pt(i).map(v => v.toFixed(1)).join(',')).join(' ')}" class="t2-line"/>`; cap = (R ? '' : '계산이 끝나면 차속 색으로 칠합니다. ') + leg; }
  setTimeout(() => { const cp = $('#t2mcap'); if(cp) cp.innerHTML = cap; }, 0);
  /* 출발선(초록) · 결승선(빨강) · 주행 방향 화살표. 닫힌 코스는 같은 자리라 결승선을 살짝 앞에 */
  const ix = i => close ? ((Math.round(i) % (N - 1)) + (N - 1)) % (N - 1) : Math.max(0, Math.min(N - 1, Math.round(i)));
  const line = (i, j, cls) => { const a = Pt(ix(i)), b = Pt(ix(j)), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy/d*9, ny = dx/d*9;
    return `<line x1="${(a[0] + nx).toFixed(1)}" y1="${(a[1] + ny).toFixed(1)}" x2="${(a[0] - nx).toFixed(1)}" y2="${(a[1] - ny).toFixed(1)}" class="${cls}"/>`; };
  const i0 = rev ? N - 1 : 0, dir = rev ? -1 : 1, step = Math.max(2, Math.round(N/120));
  if(c==='skid'){ const k = Math.round(15/0.5); svg += line(k, k + step, 't2-fin') + line(k - 2, k - 2 + step, 't2-sl'); }
  else { const ie = close ? i0 - dir*Math.max(2, Math.round(N/200)) : (rev ? 0 : N - 1); svg += line(ie, ie + dir*step, 't2-fin') + line(i0, i0 + dir*step, 't2-sl'); }
  { const ia = c==='skid' ? 4 : i0, a = Pt(ia), b = Pt(Math.max(0, Math.min(N - 1, ia + dir*step*2))), ang = Math.atan2(b[1] - a[1], b[0] - a[0])*180/Math.PI;
    svg += `<path d="M0,-5 L11,0 L0,5 z" class="t2-arr" transform="translate(${((a[0] + b[0])/2).toFixed(1)},${((a[1] + b[1])/2).toFixed(1)}) rotate(${ang.toFixed(1)})"/>`; }
  /* 커서: 신호 그래프의 거리 위치 (여러 랩이면 한 랩 안의 위치) */
  if(R && R.x && WB.xi != null){ let k = WB.xi;
    if((c==='end' || c==='free') && P) k = WB.xi % P === 0 && WB.xi ? P : WB.xi % P; else if(c==='ax' && P) k = P - Math.min(P, WB.xi);
    k = Math.max(0, Math.min(N - 1, k)); const q = Pt(k); svg += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4" class="t2-cur"/>`; }
  return svg + '</svg>'; }

/* ============================================================ 고치기 · 이벤트 */
function t2Soon(){ t2Save(); clearTimeout(T2.timer); T2.timer = setTimeout(() => { wbRefresh(); t2PartDirty(); }, 350); }
/* 탭 다시 그리기 (표 스크롤 위치 유지) */
function t2Repaint(){ const tw = $('#t2tt'), st = tw ? tw.scrollTop : 0, sl = tw ? tw.scrollLeft : 0; wbPaint(['ext']); const t2 = $('#t2tt'); if(t2){ t2.scrollTop = st; t2.scrollLeft = sl; } }
function t2SetCourse(c){ T2.course = c; T2.menu = ''; t2Save(); WB.xi = 0; wbSelReset(['v', 'pw']); WB.act = ''; if(!WB.xa.startsWith('in:')) WB.xa = ''; wbPaint(['ext']); wbRefresh(); }
function t2SetGrMode(m){ T2.grMode = m; t2Save(); WB.xi = 0; wbRefresh(); t2PartDirty(); }
document.addEventListener('input', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2o]')){ const k = t.dataset.t2o, v = parseFloat(t.value); if(!isFinite(v) || v < 0) return; T2.free[k] = k==='laps' ? Math.max(1, Math.round(v)) : v;
    const lw = $('#t2lapw'); if(lw) lw.innerHTML = t2LapSel(); const mp = $('#t2map'); if(mp) mp.innerHTML = t2MapSVG(); t2Soon(); } });
document.addEventListener('change', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2file]')){ const f = t.files && t.files[0], k = t.dataset.t2file; t.value = ''; T2.menu = ''; if(f) t2Import(f, k==='mt' ? 'motor' : k); else t2Repaint(); return; }
  if(t.matches('[data-t2lap]')){ T2.lap[T2.course] = t.value; t2Save(); WB.xi = 0; t.blur(); wbRefresh(); return; }
  if(t.matches('[data-t2mcol]')){ T2.mcol = +t.value; t.blur(); t2Repaint(); t2Soon(); } });
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return;
  const gm = t.closest('#wbout [data-t2gm]'); if(gm){ t2SetGrMode(gm.dataset.t2gm); return; }
  if(!t.closest('#wbext')){ if(T2.menu && WB.id==='2'){ T2.menu = ''; t2Repaint(); } return; }
  const mn = t.closest('[data-t2menu]'); if(mn){ T2.menu = T2.menu===mn.dataset.t2menu ? '' : mn.dataset.t2menu; t2Repaint(); return; }
  const ac = t.closest('[data-t2act]'); if(ac){ const a = ac.dataset.t2act, k = ac.dataset.t2k; T2.menu = '';
    if(a==='paste'){ T2.paste = k; t2Repaint(); setTimeout(() => { const ta = $('#t2pta'); if(ta) ta.focus(); }, 0); return; }
    if(a==='tpl'){ const [kk, f] = ac.dataset.t2tpl.split('.'); t2Template(kk, f); t2Repaint(); return; }
    if(a==='ex'){ if(k==='track'){ T2.free.text = T2TRACK_EX; T2.free.s0 = 0; T2.free.laps = 1; } else if(k==='mt'){ T2.mtext = EMRAX228.torque; T2.mcol = 1; } else T2.eM = EMRAX228.eff; }
    if(a==='clear') T2[k] = '';
    t2Repaint(); t2Soon(); return; }
  if(t.closest('.t2-mi') || t.closest('.t2-mn')) return;
  if(T2.menu){ T2.menu = ''; t2Repaint(); }
  if(t.closest('[data-t2px]')){ T2.paste = ''; t2Repaint(); return; }
  if(t.closest('[data-t2pok]')){ const ta = $('#t2pta'), v = ta ? ta.value : '', k = T2.paste;
    if(k==='track'){ const P = t2Track(v); if(!P.rows.length){ toast('구간을 읽지 못했습니다. 한 줄에 종류, 길이, 반경(또는 길이, 반경) 숫자가 있어야 합니다.'); return; } T2.free.text = t2RowsText(P.rows); toast(`구간 ${P.rows.length}개를 넣었습니다${P.bad.length ? ` · ${P.bad.slice(0, 5).join(', ')}번째 줄은 숫자가 없어 건너뜀` : ''}`); }
    else if(k==='mt'){ if(!t2MotorParse(v).pts.length){ toast('회전수 · 토크 줄을 읽지 못했습니다.'); return; } T2.mtext = v; }
    else { if(v.trim() && !t2EffParse(v).map){ toast('효율을 읽지 못했습니다. 숫자 하나 또는 맵(첫 줄 회전수, 첫 열 토크)이어야 합니다.'); return; } T2[k] = v; }
    T2.paste = ''; t2Repaint(); t2Soon(); return; }
  const tb = t.closest('[data-t2tab]'); if(tb){ T2.tab = tb.dataset.t2tab; t2Save(); wbPaint(['ext']); return; }
  const cs = t.closest('[data-t2course]'); if(cs){ t2SetCourse(cs.dataset.t2course); return; }
  const mt = t.closest('[data-t2mt]'); if(mt){ T2.mtab = mt.dataset.t2mt; t2Save(); wbPaint(['ext']); return; }
  const dl = t.closest('[data-t2del]'); if(dl){ const rows = t2Track(T2.free.text).rows; rows.splice(+dl.dataset.t2del, 1); t2SetRows(rows); return; }
  if(t.closest('[data-t2add]')){ const rows = t2Track(T2.free.text).rows; rows.push({l:10, R:0, note:''}); t2SetRows(rows); const tw = $('#t2tt'); if(tw) tw.scrollTop = tw.scrollHeight; return; }
  const gd = t.closest('[data-t2gdel]'); if(gd){ const g = t2Grid(T2.mtext); g.splice(+gd.dataset.t2gdel, 1); t2MtSet('mt', t2GridText(g)); return; }
  if(t.closest('[data-t2gadd]')){ const g = t2Grid(T2.mtext), last = g[g.length - 1] || ['0', '0']; g.push(last.map(() => '')); t2MtSet('mt', t2GridText(g)); return; }
  const ce = t.closest('td[data-t2e], th[data-t2e]'); if(ce){ t2CellOpen(ce); return; } });
document.addEventListener('keydown', e => { const ce = e.target.closest && e.target.closest('#wbext td[data-t2e], #wbext th[data-t2e]'); if(ce && e.key==='Enter' && !e.target.matches('input,select')){ e.preventDefault(); t2CellOpen(ce); }
  if(e.key==='Escape' && WB.id==='2' && (T2.paste || T2.menu)){ e.preventDefault(); e.stopImmediatePropagation(); T2.paste = ''; T2.menu = ''; t2Repaint(); } }, true);

/* ============================================================ 결과 칸 (도구가 직접 그림)
   1행 감속비 (모드와 무관) · 2행 종목 기록 · 차량 한계 (모드의 감속비) · 3행 고른 코스 · 축전지 · 모터 · 에너지 */
const t2F = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
const t2MS = s => { if(!isFinite(s)) return '—'; const m = Math.floor(s/60), r = s - 60*m; return `${m}분 ${r.toFixed(1).padStart(4, '0')}초`; };
/* 가장 빠른 기록 대비 차이: 같거나 빠르면 초록, 느리면 빨강 */
const t2Dt = (d, best) => !isFinite(d) ? '' : `<span class="t2-dt ${d > 0.0005 ? 'bad' : 'ok'}">${d > 0.0005 ? '+' + wbFmt(d, 3) + ' s' : '가장 빠름'} <em>(가장 빠른 기록 ${t2F(best, best > 100 ? 1 : 3)} s 대비)</em></span>`;
const t2Row = (n, v, u, sub) => `<div class="wb-or"><span class="wb-on">${n}</span><span class="wb-ov"><b>${v}</b>${u ? ` <i>${u}</i>` : ''}</span>${sub ? `<span class="t2-sub">${sub}</span>` : ''}</div>`;
const t2Card = (title, note, body, cls) => `<div class="wb-oc${cls ? ' ' + cls : ''}"><h4>${title}${note ? `<span>${note}</span>` : ''}</h4><div class="wb-ol">${body}</div></div>`;
function t2OutHTML(R){ const o = R.out, opt = T2.grMode==='opt', hasFree = isFinite(o.t_free), c = T2.course;
  const mode = `<div class="t2-gm"><span class="muted">기준 감속비</span><span class="dc-seg" role="group" aria-label="기준 감속비"><button type="button" data-t2gm="my" aria-pressed="${!opt}">내 감속비 ${t2F(WB.I.gr, 2)}</button><button type="button" data-t2gm="opt" aria-pressed="${opt}">최적 감속비 ${t2F(o.gr_opt, 2)}</button></span>
      <span class="muted">${opt ? '최적 = 배점 가중 제안 감속비로 모든 종목 계산 · 아래 고른 코스는 그 코스에서 가장 빠른 감속비' : '왼쪽 [최종 감속비] 입력으로 모든 종목 계산'}</span></div>`;
  /* 1행: 감속비 */
  const gcols = [['제안 (배점 가중)', o.gr_opt, null, null], ['가속', o.gr_acc, o.tb_acc, 3], ['오토크로스', o.gr_ax, o.tb_ax, 2], ['내구', o.gr_end, o.tb_end, 1], ...(hasFree ? [['내 코스', o.gr_free, o.tb_free, 2]] : [])];
  const r1 = `<div class="wb-oc t2-grc"><h4>감속비<span>2.5 ~ 7.0 에서 종목마다 가장 빠른 감속비와 그때 기록 · 제안 = 배점(가속 100 · 오토크로스 200 · 내구 350) 가중 · 스키드패드는 감속비와 거의 상관없어 뺌</span></h4>
      <table class="t2-grt"><thead><tr><th></th>${gcols.map(g => `<th>${g[0]}</th>`).join('')}</tr></thead><tbody>
        <tr><th>감속비</th>${gcols.map(g => `<td><b>${t2F(g[1], 2)}</b></td>`).join('')}</tr>
        <tr><th>그때 기록</th>${gcols.map(g => `<td>${g[2]==null ? '<span class="muted">—</span>' : `<b>${g[3]===1 ? t2MS(g[2]) : t2F(g[2], g[3]) + ' s'}</b>`}</td>`).join('')}</tr></tbody></table></div>`;
  /* 2행: 종목 기록 · 차량 한계 */
  const gN = `감속비 ${t2F(o.gr_use, 2)} (${opt ? '최적' : '내 감속비'})`;
  const multi = (pre, t1, ta, tt, d, best) => t2Row(`${pre} 1번째 랩`, t2F(t1, 2), 's') + t2Row(`${pre} 평균 랩`, t2F(ta, 2), 's', '정지 출발 랩을 뺀 평균') + t2Row(`${pre} 총 시간`, t2MS(tt), '', t2Dt(d, best));
  const rec = t2Row('가속 (75 m)', t2F(o.t_acc_s, 3), 's', t2Dt(o.d_acc, o.tb_acc)) + t2Row('스키드패드 (한 바퀴)', t2F(o.t_skid_s, 3), 's', '<span class="muted">감속비와 거의 상관없음</span>')
    + t2Row('오토크로스', t2F(o.t_ax_s, 2), 's', t2Dt(o.d_ax, o.tb_ax)) + multi(`내구 ${t2F(o.n_lap, 0)}랩 ·`, o.t_end1, o.t_endavg, o.t_end_s, o.d_end, o.tb_end)
    + (hasFree ? (o.n_free > 1 ? multi(`내 코스 ${o.n_free}랩 ·`, o.t_free1, o.t_freeavg, o.t_free, o.d_free, o.tb_free) : t2Row('내 코스', t2F(o.t_free, 2), 's', t2Dt(o.d_free, o.tb_free))) : '');
  const lim = t2Row('최고 차속 (회전수 한계)', t2F(o.vmax, 1), 'km/h') + t2Row('오토크로스 최고 차속', t2F(o.v_top, 1), 'km/h') + t2Row('출발 종가속도', t2F(o.ax_0, 2), 'g')
    + t2Row('스키드패드 횡가속도', t2F(o.ay_skid, 2), 'g') + t2Row('스키드패드 목표에 필요한 C_L·A', o.g_skid > 0 ? t2F(o.cla_req, 2) : '—', 'm²', o.g_skid > 0 ? `목표 ${t2F(o.g_skid, 3)} s · 지금 ${t2F(WB.I.cla, 2)} m²${!isFinite(o.cla_req) ? ' · 15 m² 로도 모자람' : ''}` : '왼쪽 [목표 기록 (스키드패드)]를 넣으면 계산');
  /* 3행: 고른 코스 */
  const cn = T2CN[c] + (o.c_n > 1 ? ` · ${T2.lap[c]==='all' ? `전체 ${o.c_n}랩` : `${o.c_lap}번째 랩`}` : '');
  const grLab = opt ? (c==='skid' ? '감속비 (스키드패드는 상관없어 최적 감속비)' : '감속비 (이 코스에서 가장 빠른 값)') : '감속비 (입력)';
  const crec = c==='skid' ? t2Row('기록 (한 바퀴)', t2F(o.t_skid_s, 3), 's') + t2Row('8자 전체 주행 (진입 ~ 탈출)', t2F(o.c_ttot, 2), 's')
    : o.c_n > 1 ? (T2.lap[c]==='all' ? '' : t2Row(`${o.c_lap}번째 랩`, t2F(o.c_t, 2), 's')) + t2Row('1번째 랩', t2F(o.c_t1, 2), 's') + t2Row('평균 랩', t2F(o.c_tavg, 2), 's', '정지 출발 랩을 뺀 평균') + t2Row('총 시간', t2MS(o.c_ttot), '')
    : t2Row('기록', t2F(o.c_t, c==='acc' ? 3 : 2), 's');
  const r3a = t2Row(grLab, t2F(o.c_gr, 2), '') + crec + t2Row('최고 차속', t2F(o.c_vtop, 1), 'km/h');
  const r3b = t2Row('최고 모터 회전수', t2F(o.c_rpm, 0), 'rpm') + t2Row('최대 모터 토크', t2F(o.c_tq, 1), 'N·m') + t2Row('최대 단자 출력', t2F(o.c_pbat, 1), 'kW') + t2Row('가장 낮은 단자 전압', t2F(o.c_vmin, 1), 'V')
    + t2Row('최대 전류 때 단자 전압 (SOC 100 %)', t2F(o.v_load, 1), 'V') + t2Row('단자 출력 상한 (규정 · 전류 한계)', t2F(o.p_max, 2), 'kW') + t2Row('모터 기저 회전수 (공칭 전압)', t2F(o.n_base, 0), 'rpm');
  const one = o.c_n > 1 && T2.lap[c]!=='all' ? `${o.c_lap}번째 랩 ` : '';
  const r3c = t2Row(`${one}단자 에너지`, t2F(o.c_et, 3), 'kWh') + t2Row(`${one}소비 (저항 손실 포함)`, t2F(o.c_ec, 3), 'kWh') + t2Row(one ? `${o.c_lap}번째 랩 끝 SOC` : '끝 SOC', t2F(o.c_soc, 1), '%')
    + (c==='end' ? t2Row('쓸 수 있는 에너지', t2F(o.c_cap, 2), 'kWh', '왼쪽 [에너지 목표 · 상한], 0 = 팩 전체') + t2Row('출력 상한 비율', o.c_plim >= 99.95 ? '제한 없음' : t2F(o.c_plim, 1), o.c_plim >= 99.95 ? '' : '%', o.c_plim < 99.95 ? '<span class="t2-dt bad">쓸 수 있는 에너지에 맞추려고 단자 출력 상한을 낮춤</span>' : '')
       + t2Row('보정 에너지 소비량 (CO₂)', t2F(o.c_co2, 2), 'kg/100 km', o.c_co2 > 60.06 ? '<span class="t2-dt bad">실격 기준 60.06 초과</span>' : '<span class="muted">실격 기준 60.06 이하 · 1.3 kg/kWh</span>') : '');
  return mode + `<div class="t2-out">${r1}
    <div class="t2-orow">${t2Card('종목 기록', gN, rec)}${t2Card('차량 한계', gN, lim)}</div>
    <div class="t2-orow three">${t2Card('고른 코스', cn, r3a)}${t2Card('축전지 · 모터', cn, r3b)}${t2Card('에너지 (회생 제외)', cn, r3c)}</div></div>`; }

/* 입력 옆 '모양 보기': 하중 감도 → 바퀴 하중에 따른 μ 와 낼 수 있는 횡력 */
function t2VizMus(I){ const Z = Array.from({length:61}, (_, i) => i*50), mu = Z.map(z => Math.max(0, I.mu - I.mu_s*z/1000)), Fy = Z.map((z, i) => mu[i]*z);
  return {x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:'', dd:2}, {k:'fy', d:Fy, c:WB_COL[2], n:'낼 수 있는 횡력 μ·Fz', u:'N', dd:0}], act:'mu',
    note:`정지 때 바퀴 하나 평균 하중 약 ${wbFmt(I.m*9.81/4, 0)} N. μ·Fz 가 꺾여 내려가기 시작하면 하중을 더 실어도 그 바퀴 힘이 늘지 않습니다.`}; }

/* ============================================================ 이 탭 사용법 */
function t2TourTab(tab, course){ if(!T2.tourUndo && typeof tgUndo==='function'){ const t0 = T2.tab, c0 = T2.course; T2.tourUndo = true; tgUndo(() => { T2.tourUndo = false; const ch = T2.tab!==t0 || T2.course!==c0; T2.tab = t0; if(T2.course!==c0) t2SetCourse(c0); else if(ch) wbPaint(['ext']); }); }
  if(course && T2.course!==course) t2SetCourse(course); if(T2.tab!==tab){ T2.tab = tab; wbPaint(['ext']); } }
const t2TT = (tab, course) => ({click:{sel:`#wb [data-t2tab="${tab}"]`, need:() => T2.tab!==tab || (course && T2.course!==course), run:() => t2TourTab(tab, course)}, inner:'#wb .wb-right'});
const M2TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 해석해 비교표), 입력 내보내기 · 가져오기(코스 · 모터 · 효율 표 포함), 대시보드에 반영입니다.', t2TT('course')],
  ['#wb .wb-in', '입력', '차량 · 타이어 · 에어로 · 모터 · 구동계 · 축전지 · 목표 기록입니다. 칸 앞 점은 값의 출처입니다: 색 점 = 대시보드 값(색은 확정 · 검토 중 · 가정 · 계산값 · 예시값), 고리 = 직접 고친 값, 회색 네모 = 대시보드에 없는 도구 기본값.', t2TT('course')],
  ['#wb .t2-vw', '코스 고르기', '내 코스 · 오토크로스 · 내구레이스 · 가속 · 스키드패드 중 아래 그래프와 [고른 코스] 결과로 볼 코스를 고릅니다. 다섯 코스 모두 같은 화면이고, 공식 코스 4개는 대회 코스 그대로라 표를 고칠 수 없습니다.', t2TT('course', 'end')],
  ['#wb .t2-set', '랩 수 · 출발 위치 · 볼 랩', '내구는 26랩(드라이버당 13랩) 고정이고 볼 랩만 고릅니다. 내 코스는 랩 수 · 출발 위치를 정합니다 — 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스로 계산합니다.', t2TT('course', 'end')],
  ['#wb .t2-map', '코스 지도', '초록 = 출발선, 빨강 = 결승선, 삼각형 = 주행 방향, 작은 점 = 그래프의 커서 위치입니다. 공식 코스는 콘(파랑 = 오른쪽, 노랑 = 왼쪽)도 그립니다. 계산이 끝나면 차속 색(느림 파랑 → 빠름 빨강)으로 칠합니다.', t2TT('course', 'end')],
  ['#wb .t2-tw', '내 코스 표', '칸을 눌러 바로 고칩니다. # 칸에 다른 번호를 쓰면 그 자리로 옮기고 뒤 구간을 밀어냅니다. 각도를 고치면 길이가 바뀝니다. × 로 지우고 [+ 구간]으로 추가합니다. [코스 입력하기]에서 붙여넣기 · 파일 가져오기 · 양식 받기(안내가 양식 안에 있음)를 고릅니다. 붙여 넣거나 가져오면 표를 덮어씁니다.', t2TT('course', 'free')],
  ['#wb .t2-tr', '모터 · 효율', '토크 곡선 · 모터 효율 · 인버터 효율을 같은 모양의 표로 넣습니다. 효율은 숫자 하나(상수) 또는 맵(회전수 × 토크)이고, 비우면 왼쪽 상수 칸을 씁니다. 오른쪽은 축전지 전압에 맞춘 토크 곡선 · 구동력 선도 또는 효율 맵입니다.', t2TT('motor')],
  ['#wb .wb-sec[aria-label="결과"]', '결과', '맨 위 [내 감속비 | 최적 감속비]로 기준 감속비를 고릅니다. 1행 = 종목마다 가장 빠른 감속비와 그때 기록, 배점 가중 제안. 2행 = 기준 감속비의 종목 기록(가장 빠른 기록 대비 차이)과 차량 한계. 3행 = 위에서 고른 코스 · 볼 랩의 기록, 축전지 · 모터, 에너지.', {inner:'#wb .wb-right'}],
  ['#wbsl', '신호 선택 그래프', '고른 코스 · 볼 랩의 신호입니다. 처음에는 차속과 바퀴 출력을 띄우고, 코너 한계 속도 · 종가속도 · 바퀴 하중 · 모터 회전수 · 토크 · 축전지 출력 · 전압 · 효율 등을 더 골라 봅니다. 그래프를 누르거나 끌면 커서와 지도의 점이 따라갑니다. [+ 칸]으로 최대 3칸, 가로축을 [입력 훑기]로 바꾸면 입력에 따른 기록 변화를 봅니다.', {inner:'#wb .wb-right'}]
];

/* ============================================================ 도구 정의 */
const T2G = {car:'질량 · 무게중심', tire:'타이어 · 하중 이동', aero:'에어로', mot:'모터 · 인버터', dt:'구동계', bat:'축전지', goal:'스키드패드 목표 (0 = 정하지 않음)'};
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
    {k:'t_skid', dk:'t_skid', v:0, d:3, g:T2G.goal}
  ],
  /* 결과 칸은 outHTML 이 그림. outputs = 대시보드 반영 · 입력 훑기 · 검증표 이름 */
  outHTML: t2OutHTML,
  outputs:[
    {k:'t_acc_s', n:'가속 기록', u:'s', d:3}, {k:'t_skid_s', n:'스키드패드 기록', u:'s', d:3}, {k:'t_ax_s', n:'오토크로스 기록', u:'s', d:2}, {k:'t_end_s', n:'내구 총 시간', u:'s', d:1},
    {k:'e_use', n:'내구 소비 에너지', u:'kWh', d:2}, {k:'p_lim', n:'내구 출력 상한 비율', u:'%', d:1},
    {k:'vmax', dk:'vmax', d:1}, {k:'ay_skid', dk:'ay_max_sim', d:2},
    {k:'gr_opt', dk:'gr', n:'제안 감속비 (배점 가중)', d:2, hide:true}, {k:'e_lap', dk:'e_lap', d:3, hide:true},
    {k:'t_free1', n:'내 코스 1번째 랩', u:'s', d:2, hide:true}, {k:'t_free2', n:'내 코스 2번째 랩', u:'s', d:4, hide:true}, {k:'t_freeavg', n:'내 코스 평균 랩', u:'s', d:4, hide:true},
    {k:'n_free', n:'내 코스 랩 수', u:'랩', d:0, hide:true}, {k:'e_free', n:'내 코스 2번째 랩 단자 에너지', u:'kWh', d:5, hide:true},
    {k:'ax_0', n:'출발 종가속도', u:'g', d:2, hide:true}, {k:'cla_req', n:'필요 C_L·A', u:'m²', d:2, hide:true},
    {k:'v_load', n:'최대 전류 때 단자 전압', u:'V', d:1, hide:true}, {k:'p_max', n:'단자 출력 상한', u:'kW', d:3, hide:true}, {k:'n_base', n:'모터 기저 회전수', u:'rpm', d:0, hide:true},
    {k:'n_lap', n:'내구 랩 수', u:'랩', d:0, hide:true}, {k:'n_st1', n:'첫 드라이버 랩 수', u:'랩', d:0, hide:true}, {k:'e_ok', n:'에너지 한도 안 (1 = 예)', u:'', d:0, hide:true}
  ],
  sigs:[
    {k:'v', n:'차속', u:'km/h', d:1}, {k:'pw', n:'바퀴 출력 (구동 +, 제동 −)', u:'kW', d:1}, {k:'vlim', n:'코너 한계 속도', u:'km/h', d:1}, {k:'ax', n:'종가속도', u:'g', d:2}, {k:'ay', n:'횡가속도', u:'g', d:2},
    {k:'fz_fo', n:'앞 바깥 바퀴 하중', u:'N', d:0}, {k:'fz_fi', n:'앞 안쪽 바퀴 하중', u:'N', d:0}, {k:'fz_ro', n:'뒤 바깥 바퀴 하중', u:'N', d:0}, {k:'fz_ri', n:'뒤 안쪽 바퀴 하중', u:'N', d:0},
    {k:'rpm', n:'모터 회전수', u:'rpm', d:0}, {k:'tq', n:'모터 토크', u:'N·m', d:1}, {k:'pbat', n:'축전지 단자 출력 (회생 제외)', u:'kW', d:1}, {k:'vbat', n:'축전지 단자 전압', u:'V', d:1},
    {k:'eta', n:'모터 × 인버터 효율', u:'%', d:1}, {k:'grip', n:'그립 사용률 (차 전체)', u:'%', d:0}, {k:'t', n:'경과 시간', u:'s', d:2}, {k:'ecum', n:'누적 단자 에너지', u:'Wh', d:0}
  ],
  sigOn:['v', 'pw'],
  extHTML: t2ExtHTML, extraI: t2ExtraI,
  extGet: () => ({course:T2.course, lap:{...T2.lap}, free:{...T2.free}, mtext:T2.mtext, mcol:T2.mcol, eM:T2.eM, eI:T2.eI, grMode:T2.grMode}),
  extSet(d){ if(!d || typeof d!=='object') return; t2Load(d); t2Save(); wbPaint(['ext']); },
  onResult(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(); const c = $('#t2mc'); if(c) c.innerHTML = t2MotorPlots(); },
  onCursor(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(); },
  tour: M2TOUR,
  verifyBase:{end:{seg:[], laps:26, stint:13}, free:{seg:[], laps:1, s0:0}, motor:[], effM:null, effI:null, r_pack:0, i_bms_max:1e9, pmax:1e6, eta_mot:100, eta_inv:100, course:'acc', lap:'2', grMode:'my'},
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
    {n:'내 코스 · 평균 랩 = 정지 출발 랩을 뺀 평균', I:{mu:1.5, crr:0, cla:0, cda:0, free:{seg:[[57.33407, 9.125]], laps:3, s0:0}}, expect:{t_freeavg:4.947846, n_free:3}, src:'2 · 3번째 랩은 일정 차속 원 = 2π × 9.125 ÷ √(μ g R) (랩 수 2 이상이면 닫힌 코스)'},
    {n:'직선 1 km · 최고속 일정 · 효율 상수', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_mot:100, eta_inv:100, nmax:6500, gr:3.55, r_eff:229, free:{seg:[[1000, 0]], closed:true, laps:2, s0:0}}, expect:{t_free2:22.77461, e_free:0.0122625}, src:'1000 ÷ 43.909 m/s, 한 바퀴 단자 에너지 = 0.015 × 300 × 9.81 × 1000 J'},
    {n:'효율 맵 (전부 80 %) = 상수 80 %', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_inv:100, effM:{n:[0, 10000], t:[0, 500], e:[[80, 80], [80, 80]]}, nmax:6500, gr:3.55, r_eff:229, free:{seg:[[1000, 0]], closed:true, laps:2, s0:0}}, expect:{e_free:0.01532813}, src:'0.0122625 ÷ 0.8'},
    {n:'축전지 · 최대 전류 때 단자 전압', I:{n_s:72, c_vmax:4.2, r_pack:180, i_bms_max:270}, expect:{v_load:253.8}, src:'72 × 4.2 − 270 × 0.18'},
    {n:'축전지 · 단자 출력 상한', I:{n_s:72, c_vmax:4.2, r_pack:180, i_bms_max:270, pmax:80}, expect:{p_max:68.526}, src:'min(80 kW, 253.8 V × 270 A) = 68.53 kW'},
    {n:'모터 · 기저 회전수가 전압에 비례', I:{motor:[[0, 200], [3000, 200], [6000, 100]], v_ref:300, ke_ratio:1, n_s:50, c_vnom:3, nmax:9000, tmax:250}, expect:{n_base:1565}, src:'표 기준 300 V 에서 3000 rpm 부터 줄어듦 → 150 V 면 1500 rpm 부터. 98 % (196 N·m) 는 1560 rpm, 그 아래로 처음 내려가는 5 rpm 칸 = 1565'},
    {n:'내구 · 26랩 = 드라이버 13 + 13', I:{end:{seg:[[100, 0]], laps:26, stint:13}}, expect:{n_lap:26, n_st1:13}, src:'대회 공식'},
    {n:'내구 · 에너지 제한이 걸리면 소비 ≤ 한도', I:{end:{seg:[[400, 0], [31.4159, 10], [400, 0], [31.4159, 10]], laps:26, stint:13}, e_target:3, pmax:80}, expect:{e_ok:1}, src:'한도 3 kWh 로 줄이면 출력 상한을 낮춰 맞춤'}
],
  code:`// ================================================================
// 도구 2 랩타임 시뮬레이터 — 계산 코드
// ================================================================
// 입력 I : 왼쪽 입력 칸 (단위 그대로: kg, mm, %, 1/kN, rpm, N·m, kW, V, Ah, mΩ, A, kWh, s)과 작업창 위 표
//   I.end   = {seg:[[길이 m, 반경 m], …], laps, stint}   공식 내구 코스 (오토크로스 = 거꾸로 한 바퀴)
//   I.free  = {seg, laps, s0}                           내 코스 (반경: 왼쪽 회전 +, 오른쪽 −, 직선 0)
//   I.motor = [[회전수 rpm, 토크 N·m], …]                모터 토크 곡선 (기준 전압 I.v_ref 에서. 비면 최대 토크 일정)
//   I.effM · I.effI = 효율 맵 {n:[rpm], t:[N·m], e:[[%]]} 또는 null (→ 상수 I.eta_mot · I.eta_inv)
//   I.grMode = 'my'(입력한 감속비) | 'opt'(제안 감속비),  I.course = 고른 코스,  I.lap = 볼 랩('1' … | 'all')
//   I._sweep = 입력 훑기 중 (줄여 셈)
//
// 모델 : 점질량 준정적(QSS)
//   - 앞뒤 하중 이동 (종가속 · 항력 높이 · 다운포스 앞뒤 몫), 좌우 하중 이동 (앞 몫 = lltd)
//   - 바퀴마다 μ = μ0 − 하중 감도 × 하중 [kN] → 축이 낼 수 있는 힘 = Σ μ·Fz.  횡력은 무게 배분대로 앞뒤에 나눔
//   - 뒤축 구동 (모터 1개, 축 단위 마찰원).  제동은 이상 배분 가정 (제동 장치 한계는 도구 3).  롤 · 회생 · 디퍼렌셜 없음
//   - 모터 : 토크 곡선의 회전수 축을 (단자 전압 ÷ 기준 전압) ÷ 유도 전압 비 로 늘이고 줄임
//   - 축전지 : 개방 전압 = 직렬 수 × (셀 최소 + (셀 최대 − 셀 최소) × SOC) (선형 근사),  단자 전압 = 개방 − 전류 × 저항
//   - 단자 출력 ≤ min(규정 출력 상한, 전류 한계).  모터 축 출력 = 단자 출력 × 모터 효율 × 인버터 효율
//   - 내구 에너지 제한 : 소비 (개방 전압 × 전류, 저항 손실 포함)가 쓸 수 있는 에너지를 넘으면 단자 출력 상한을 같은 비율로 낮춤

const g = 9.81;      // 중력가속도 [m/s²]
const RHO = 1.225;   // 공기 밀도 [kg/m³]
let VC = null;       // 곡률별 코너 한계 속도 기억 (감속비 · 전압과 상관없음)


// ---------------------------------------------------------------- 보간
// 1차원 표 t = [[x, y], …] 직선 보간 (범위 밖은 끝값)
const tab1 = (t, x) => {
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (x <= t[i][0]) {
      const a = t[i - 1], b = t[i];
      return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1);
    }
  }
  return t[t.length - 1][1];
};

// 2차원 맵 M = {n:[회전수], t:[토크], e:[[효율 %]]} 쌍선형 보간
function bil(M, n, T) {
  const f = (a, x) => {
    if (x <= a[0]) return [0, 0, 0];
    const k = a.length - 1;
    if (x >= a[k]) return [k, k, 0];
    let i = 0;
    while (a[i + 1] < x) i++;
    return [i, i + 1, (x - a[i]) / (a[i + 1] - a[i])];
  };
  const [j0, j1, u] = f(M.n, n), [i0, i1, w] = f(M.t, T), e = M.e;
  return (e[i0][j0] * (1 - u) + e[i0][j1] * u) * (1 - w) + (e[i1][j0] * (1 - u) + e[i1][j1] * u) * w;
}


// ================================================================ 차량 (감속비 gr, 출력 상한 배율 kP)
function car(I, gr, kP) {

  // ---------- 차체 · 타이어 · 에어로 (mm → m, % → 비율)
  const m   = I.m;                          // 차량 질량 [kg]
  const L   = I.L / 1000;                   // 휠베이스 [m]
  const h   = I.h / 1000;                   // 무게중심 높이 [m]
  const fs  = I.fr / 100;                   // 앞 무게 비율 [-]
  const fa  = 1 - I.xcop / I.L;             // 다운포스 앞 몫 [-]
  const hc  = I.hcop / 1000;                // 항력 작용 높이 [m]
  const r   = I.r_eff / 1000;               // 바퀴 유효 반경 [m]
  const tf  = I.tf / 1000, tr = I.tr / 1000; // 앞 · 뒤 윤거 [m]
  const lt  = I.lltd / 100;                 // 횡하중 이동 앞 몫 [-]
  const mu  = I.mu;                         // 타이어 μ [-]
  const mus = I.mu_s || 0;                  // μ 하중 감도 [1/kN]
  const crr = I.crr;                        // 구름 저항 계수 [-]
  const cl  = 0.5 * RHO * I.cla;            // 다운포스 = cl × v² [N]
  const cd  = 0.5 * RHO * I.cda;            // 항력     = cd × v² [N]
  const eta = I.eta_dt / 100;               // 구동계 효율 [-]
  const meff = m + I.j_eq / (r * r);        // 회전부 포함 등가 질량 [kg]  (J ÷ r²)

  // ---------- 축전지
  const Ns    = I.n_s;                                   // 직렬 수
  const Rb    = Math.max(0, I.r_pack) / 1000;            // 팩 저항 [Ω]
  const Imax  = I.i_bms_max;                             // 방전 전류 한계 [A]
  const Pmax  = I.pmax * 1000;                           // 규정 출력 상한 [W]
  const kk    = kP || 1;                                 // 에너지 제한 배율 [-]
  const Voc   = soc => Ns * (I.c_vmin + (I.c_vmax - I.c_vmin) * Math.max(0, Math.min(1, soc)));   // 개방 전압 [V]
  const Epack = Ns * I.n_p * I.c_ah * I.c_vnom * 3600;   // 팩 공칭 에너지 [J]  (SOC 기준)
  const Ecap  = I.e_target > 0 ? I.e_target * 3.6e6 : Epack;   // 내구에 쓸 수 있는 에너지 [J]  (0 = 팩 전체)

  // 단자 출력 P [W] 를 낼 때 전류 [A] · 단자 전압 [V]  (P = (V0 − I·R)·I 의 작은 근)
  function term(P, V0) {
    if (P <= 0) return { I: 0, V: V0 };
    if (Rb <= 0) return { I: P / V0, V: V0 };
    const D = V0 * V0 - 4 * Rb * P;
    if (D < 0) return null;
    const i = (V0 - Math.sqrt(D)) / (2 * Rb);
    return { I: i, V: V0 - i * Rb };
  }
  // 단자 출력 상한 [W] = 배율 × min(규정 상한, 전류 한계 때 출력)
  function ptMax(V0) {
    const iI = Math.min(Imax, Rb > 0 ? V0 / (2 * Rb) : Infinity);
    return kk * Math.min(Pmax, (V0 - iI * Rb) * iI);
  }

  // ---------- 모터
  const tq   = (I.motor || []).slice().sort((a, b) => a[0] - b[0]);   // 토크 곡선 [[rpm, N·m]]
  const ke   = I.ke_ratio > 0 ? I.ke_ratio : 1;                       // 유도 전압 비 (팀 모터 ÷ 표 모터)
  const nmax = I.nmax;                                                // 최대 회전수 [rpm]

  // 단자 전압 V 에서 회전수 n 의 최대 토크 [N·m]  (곡선 끝 너머는 출력 일정)
  function Tcurve(n, V) {
    if (n > nmax) return 0;
    if (!tq.length) return I.tmax;
    const sf = (V / I.v_ref) / ke, nt = n / sf, z = tq[tq.length - 1];
    return Math.min(nt <= z[0] ? tab1(tq, nt) : z[1] * z[0] / nt, I.tmax);
  }
  const eM  = (n, T) => (I.effM ? bil(I.effM, n, Math.abs(T)) : I.eta_mot) / 100;   // 모터 효율 [-]
  const eI  = (n, T) => (I.effI ? bil(I.effI, n, Math.abs(T)) : I.eta_inv) / 100;   // 인버터 효율 [-]
  const rpm = v => v / r * gr * 60 / (2 * Math.PI);                                  // 차속 [m/s] → 모터 [rpm]
  const vtop = nmax / gr * 2 * Math.PI / 60 * r * (1 - 1e-9);                        // 회전수 한계 최고속 [m/s]

  // ---------- 바퀴 구동력 [N]: 모터 곡선과 (단자 출력 상한 × 효율) 중 작은 쪽. 단자 전압이 전류로 떨어지므로 3번 되풀이
  const DM = new Map();   // 기억: 차속 0.01 m/s · 전압 0.1 V 단위
  function drive(v, V0) {
    const key = Math.round(v * 100) * 65536 + Math.round(V0 * 10);
    let o = DM.get(key);
    if (!o) { o = drive_(v, V0); DM.set(key, o); }
    return o;
  }
  function drive_(v, V0) {
    const n = rpm(v), w = n * 2 * Math.PI / 60, Pt = ptMax(V0);
    let V = V0, T = Tcurve(n, V0);
    for (let it = 0; it < 3; it++) {
      const e = eM(n, T) * eI(n, T);
      T = Tcurve(n, V);
      if (w > 0) T = Math.min(T, Pt * e / w);
      const tr_ = term(T * w / e, V0);
      V = tr_ ? tr_.V : V0 / 2;
    }
    return { T, F: T * gr * eta / r, V };
  }

  // ---------- 저항 · 하중 [N]
  const Fres = v => cd * v * v + crr * (m * g + cl * v * v);                       // 항력 + 구름 저항 (무게 + 다운포스)
  const Fzf  = (v, ax) => m * g * fs + cl * v * v * fa - m * ax * h / L - cd * v * v * hc / L;           // 앞축 하중
  const Fzr  = (v, ax) => m * g * (1 - fs) + cl * v * v * (1 - fa) + m * ax * h / L + cd * v * v * hc / L; // 뒤축 하중
  const dF   = (ay, front) => front ? lt * m * ay * h / tf : (1 - lt) * m * ay * h / tr;                 // 좌우 하중 이동 (바퀴 하나)
  const wheels = (Fz, d) => {                                                       // 축 하중 → [바깥, 안쪽] 바퀴
    let o = Fz / 2 + d, i = Fz / 2 - d;
    if (i < 0) { o = Fz; i = 0; }
    return [Math.max(0, o), i];
  };
  const cap = (Fz, d) => {                                                          // 축이 낼 수 있는 힘 Σ μ·Fz
    if (!mus) return mu * Math.max(0, Fz);
    const [o, i] = wheels(Fz, d), f = z => Math.max(0, mu - mus * z / 1000) * z;
    return f(o) + f(i);
  };
  const capF = (v, ax, ay) => cap(Fzf(v, ax), dF(ay, true));
  const capR = (v, ax, ay) => cap(Fzr(v, ax), dF(ay, false));

  // ---------- 코너 한계 속도 [m/s] (곡률 k [1/m])
  function vCorner(k) {
    k = Math.abs(k);
    if (k < 1e-9) return Infinity;
    if (VC && VC.has(k)) return VC.get(k);
    let v;
    if (!mus) {                       // μ 일정: 앞 · 뒤 축 각각 닫힌 식
      let v2 = Infinity;
      const cf = m * k * fs - mu * (cl * fa - cd * hc / L);
      const cr = m * k * (1 - fs) - mu * (cl * (1 - fa) + cd * hc / L);
      if (fs > 0 && cf > 0) v2 = Math.min(v2, mu * m * g * fs / cf);
      if (fs < 1 && cr > 0) v2 = Math.min(v2, mu * m * g * (1 - fs) / cr);
      v = Math.sqrt(v2);
    } else {                          // 하중 감도: 이분법
      const ok = u => {
        const ay = u * u * k;
        return m * ay * fs <= capF(u, 0, ay) + 1e-9 && m * ay * (1 - fs) <= capR(u, 0, ay) + 1e-9;
      };
      let lo = 0, hi = 150;
      if (ok(hi)) v = Infinity;
      else {
        for (let i = 0; i < 50; i++) { const md = (lo + hi) / 2; if (ok(md)) lo = md; else hi = md; }
        v = lo;
      }
    }
    if (VC) VC.set(k, v);
    return v;
  }

  // ---------- 가속 [m/s²]: 뒤축 마찰원 · 모터 힘, 앞축 횡력이 모자라면 줄임
  function aDrive(v, k, a0, V0) {
    const ay = v * v * Math.abs(k), Fyr = m * ay * (1 - fs), Fyf = m * ay * fs, Fm = drive(v, V0).F;
    let ax = a0 || 0;
    for (let it = 0; it < 4; it++) {
      const N = capR(v, ax, ay), Fx = Math.sqrt(Math.max(0, N * N - Fyr * Fyr));
      ax = (Math.min(Fm, Fx) - Fres(v)) / meff;
    }
    if (Fyf > 0 && h > 0 && capF(v, ax, ay) < Fyf) {
      let lo = -3 * g, hi = ax;
      if (capF(v, lo, ay) >= Fyf) {
        for (let i = 0; i < 40; i++) { const md = (lo + hi) / 2; if (capF(v, md, ay) >= Fyf) lo = md; else hi = md; }
        ax = lo;
      }
    }
    return ax;
  }

  // ---------- 감속 [m/s²]: 네 바퀴 마찰원 (이상 배분)
  function aBrake(v, k) {
    const ay = v * v * Math.abs(k);
    let d = 0;
    for (let it = 0; it < 3; it++) {
      const N = capF(v, -d, ay) + capR(v, -d, ay), Fx = Math.sqrt(Math.max(0, N * N - (m * ay) * (m * ay)));
      d = (Fx + Fres(v)) / meff;
    }
    return d;
  }

  // ---------- 한 칸의 전기: 바퀴 힘 F [N] → 모터 토크 [N·m] · 효율 · 단자 출력 [W] · 전류 [A] · 단자 전압 [V]
  function elec(F, v, V0) {
    if (F <= 0) return { T: 0, e: 1, P: 0, I: 0, V: V0 };
    const n = rpm(v), w = n * 2 * Math.PI / 60, T = F * r / (gr * eta), e = eM(n, T) * eI(n, T), P = T * w / e;
    const tr_ = term(P, V0) || { I: Math.min(Imax, V0 / (2 * Math.max(Rb, 1e-9))), V: V0 / 2 };
    return { T, e, P, I: tr_.I, V: tr_.V };
  }

  return { m, meff, r, gr, eta, fs, h, nmax, vtop, rpm, Fres, Fzr, Fzf, dF, wheels, capF, capR,
           vCorner, aDrive, aBrake, drive, elec, Tcurve, Voc, Epack, Ecap, ptMax, Rb, Imax };
}


// ================================================================ 코스
// 구간 → 점 (간격 ds [m] 이하).  k[j] = j번째 칸의 곡률 [1/m]
function grid(segs, ds) {
  const s = [0], k = [];
  for (const [l, R] of segs) {
    const n = Math.max(1, Math.ceil(l / ds - 1e-9)), st = l / n;
    for (let i = 0; i < n; i++) { k.push(R ? 1 / R : 0); s.push(s[s.length - 1] + st); }
  }
  return { s, k };
}

// 닫힌 코스를 출발 위치 s0 [m] 부터 시작하게 돌림
function rotate(segs, s0) {
  const len = segs.reduce((a, r) => a + r[0], 0);
  s0 = ((s0 % len) + len) % len;
  if (s0 < 1e-9) return segs.slice();
  let c = 0;
  for (let i = 0; i < segs.length; i++) {
    const [l, R] = segs[i];
    if (s0 < c + l - 1e-9) {
      const a = s0 - c, head = a > 1e-9 ? [[a, R]] : [];
      return [[l - a, R], ...segs.slice(i + 1), ...segs.slice(0, i), ...head];
    }
    c += l;
  }
  return segs.slice();
}

// 거꾸로 달리기 (구간 순서 반대, 회전 방향 반대)
const reverse = segs => segs.slice().reverse().map(([l, R]) => [l, -R]);


// ================================================================ 주행
// 차속 [m/s]: 코너 한계 → 앞으로 가속 (정지 출발) → 뒤에서 제동.  V0[i] = 칸마다 개방 전압 [V]
function speed(C, G, V0) {
  const N = G.s.length, v = new Array(N), lim = new Array(N);
  for (let i = 0; i < N; i++) {
    lim[i] = Math.min(C.vCorner(Math.max(Math.abs(G.k[i - 1] || 0), Math.abs(G.k[i] || 0))), C.vtop);
  }
  v[0] = 0;
  let a = 0;
  for (let i = 0; i < N - 1; i++) {                       // 앞으로: 가속
    a = C.aDrive(v[i], G.k[i], a, V0[i]);
    v[i + 1] = Math.min(lim[i + 1], Math.sqrt(Math.max(0, v[i] * v[i] + 2 * a * (G.s[i + 1] - G.s[i]))));
  }
  for (let i = N - 2; i >= 0; i--) {                      // 뒤로: 제동
    const b = C.aBrake(v[i + 1], G.k[i]);
    v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * b * (G.s[i + 1] - G.s[i])));
  }
  return { v, lim };
}

// 차속 → 누적 시간 [s] · 단자 에너지 et [J] · 소비 에너지 ec [J] (저항 손실 포함).  rec 이면 그래프 신호도
function walk(C, G, v, V0, rec) {
  const N = v.length, tc = [0], et = [0], ec = [0];
  const S = rec ? { pw: [], ax: [], ay: [], rpm: [], tq: [], pbat: [], vbat: [], eta: [], grip: [], fz_fo: [], fz_fi: [], fz_ro: [], fz_ri: [] } : null;
  let vmin = Infinity;
  for (let i = 0; i < N - 1; i++) {
    const ds = G.s[i + 1] - G.s[i], vm = (v[i] + v[i + 1]) / 2, dt = vm > 0 ? ds / vm : Infinity;
    const ax = (v[i + 1] * v[i + 1] - v[i] * v[i]) / (2 * ds);   // 종가속도 [m/s²]
    const F = C.meff * ax + C.Fres(vm);                            // 바퀴 힘 [N] (제동 중 −)
    const E = C.elec(F, vm, V0[i]);
    tc.push(tc[i] + dt);
    et.push(et[i] + E.P * dt);
    ec.push(ec[i] + V0[i] * E.I * dt);
    if (E.V < vmin) vmin = E.V;
    if (rec) {
      const ay = vm * vm * Math.abs(G.k[i]);
      const [fo, fi] = C.wheels(C.Fzf(vm, ax), C.dF(ay, true)), [ro, ri] = C.wheels(C.Fzr(vm, ax), C.dF(ay, false));
      S.pw.push(F * vm / 1000);        // 바퀴 출력 [kW]
      S.ax.push(ax / g);               // [g]
      S.ay.push(ay / g);               // [g]
      S.rpm.push(C.rpm(v[i]));         // [rpm]
      S.tq.push(E.T);                  // [N·m]
      S.pbat.push(E.P / 1000);         // 단자 출력 [kW]
      S.vbat.push(E.V);                // 단자 전압 [V]
      S.eta.push(E.P > 0 ? E.e * 100 : NaN);   // [%]
      S.grip.push(Math.hypot(C.m * ax, C.m * ay) / Math.max(1e-9, C.capF(vm, ax, ay) + C.capR(vm, ax, ay)) * 100);   // [%]
      S.fz_fo.push(fo); S.fz_fi.push(fi); S.fz_ro.push(ro); S.fz_ri.push(ri);   // 바퀴 하중 [N]
    }
  }
  if (rec) for (const k in S) S[k].push(S[k][S[k].length - 1]);
  return { tc, et, ec, S, vmin };
}

// 랩 m개를 이어서 정지 출발.  랩마다 SOC → 개방 전압 (두 번: 처음은 SOC 그대로, 다음은 앞 랩 소비만큼 낮춤)
//   fixedV 를 주면 전압 고정 (SOC 계산 안 함, 줄여 셈)
function laps(C, segs, m, ds, soc0, fixedV) {
  const P = grid(segs, ds).s.length - 1, rep = [];
  for (let j = 0; j < m; j++) rep.push(...segs);
  const G = grid(rep, ds), N = G.s.length;
  let V0 = new Array(N).fill(fixedV || C.Voc(soc0)), sp, W, socs = [];
  for (let pass = 0; pass < (fixedV ? 1 : 2); pass++) {
    sp = speed(C, G, V0);
    W = walk(C, G, sp.v, V0, false);
    if (fixedV) break;
    socs = [];
    let soc = soc0;
    for (let j = 0; j < m; j++) { socs.push(soc); soc -= (W.ec[(j + 1) * P] - W.ec[j * P]) / C.Epack; }
    V0 = G.s.map((_, i) => C.Voc(socs[Math.min(m - 1, Math.floor(i / P))]));
  }
  const t = [], Et = [], Ec = [];                         // 랩별 시간 [s] · 단자 에너지 [J] · 소비 [J]
  for (let j = 0; j < m; j++) {
    t.push(W.tc[(j + 1) * P] - W.tc[j * P]);
    Et.push(W.et[(j + 1) * P] - W.et[j * P]);
    Ec.push(W.ec[(j + 1) * P] - W.ec[j * P]);
  }
  const soc1 = soc0 - Ec.reduce((a, b) => a + b, 0) / C.Epack;
  return { G, v: sp.v, lim: sp.lim, V0, P, t, Et, Ec, socs, vmin: W.vmin, soc1 };
}

const sum = a => a.reduce((x, y) => x + y, 0);


// ================================================================ 종목
const ACC_L = 75;               // 가속 구간 [m]
const SK_R  = 9.125;            // 스키드패드 주행 반경 [m] = 안쪽 원 7.625 + 차로 폭 절반 1.5
const SK_IN = 15;               // 스키드패드 진입 · 탈출 직선 [m] (근사)
const SK_C  = 2 * Math.PI * SK_R;
const SKID  = [[SK_IN, 0], [SK_C, -SK_R], [SK_C, -SK_R], [SK_C, SK_R], [SK_C, SK_R], [SK_IN, 0]];   // 오른쪽 2바퀴 → 왼쪽 2바퀴
const W_PT  = { acc: 100, ax: 200, end: 350 };   // 감속비 제안에 쓰는 배점 (스키드패드는 감속비와 거의 상관없어 뺌)

// 가속: 75 m 정지 출발, SOC 100 %  → 시간 [s]
function runAcc(C) {
  const G = grid([[ACC_L, 0]], 0.5), V = new Array(G.s.length).fill(C.Voc(1)), sp = speed(C, G, V), W = walk(C, G, sp.v, V, false);
  const Ec = W.ec.at(-1);
  return { G, v: sp.v, lim: sp.lim, V0: V, P: G.s.length - 1, t: [W.tc.at(-1)], Et: [W.et.at(-1)], Ec: [Ec], socs: [1], soc1: 1 - Ec / C.Epack };
}

// 스키드패드: 일정 반경에서 가장 빠른 일정 차속 [m/s] (앞축 횡력 · 뒤축 마찰원 · 모터 힘) → 이분법
function skidV(C, R, V0) {
  const m = C.m, fs = C.fs;
  const ok = v => {
    const ay = v * v / R, Fx = C.Fres(v);
    if (C.drive(v, V0).F < Fx) return false;
    if (m * ay * fs > C.capF(v, 0, ay) + 1e-9) return false;
    const N = C.capR(v, 0, ay);
    return (m * ay * (1 - fs)) ** 2 + Fx * Fx <= N * N;
  };
  let lo = 0, hi = C.vtop;
  if (ok(hi)) return hi;
  for (let i = 0; i < 60; i++) { const md = (lo + hi) / 2; if (ok(md)) lo = md; else hi = md; }
  return lo;
}

// 오토크로스: 내구 코스를 거꾸로 한 바퀴, 정지 출발, SOC 100 %
function runAx(I, C, ds) {
  const segs = (I.end && I.end.seg) || [];
  return segs.length ? laps(C, reverse(segs), 1, ds, 1, C.Voc(1)) : null;
}

// 내구: 드라이버 2명이 n1 · n2 랩을 각각 정지 출발로 이어서 (교체 시간 제외)
//   full = 랩을 모두 계산 (SOC 반영),  아니면 3랩으로 줄여 셈 (SOC 중간값 고정, 감속비 찾기용)
function endurance(I, C, full, ds) {
  const E = I.end || {}, segs = E.seg || [], n = E.laps || 26, n1 = E.stint || Math.floor(n / 2), n2 = n - n1;
  if (!segs.length) return null;
  if (full) {
    const A = laps(C, segs, n1, ds, 1), B = laps(C, segs, n2, ds, A.soc1);
    const t = [...A.t, ...B.t], et = [...A.Et, ...B.Et], ec = [...A.Ec, ...B.Ec];
    return { T: sum(t), Et: sum(et), Ec: sum(ec), A, B, n, n1, t, et, ec, soc: [...A.socs, ...B.socs], soc1: B.soc1, vmin: Math.min(A.vmin, B.vmin) };
  }
  const Vm = C.Voc(1 - 0.5 * Math.min(1, C.Ecap / C.Epack));
  const L3 = laps(C, segs, 3, ds, 1, Vm);
  const st = (k, a) => k <= 0 ? 0 : k === 1 ? a[0] : a[0] + (k - 2) * a[1] + a[2];   // 첫 랩 + 중간 랩 × (k−2) + 끝 랩
  return { T: st(n1, L3.t) + st(n2, L3.t), Et: st(n1, L3.Et) + st(n2, L3.Et), Ec: st(n1, L3.Ec) + st(n2, L3.Ec), n, n1 };
}

// 내구 에너지 제한: 소비가 쓸 수 있는 에너지를 넘으면 단자 출력 상한 배율 k 를 찾음 (할선법, 줄여 셈)
function powerCut(I, gr) {
  const C1 = car(I, gr, 1), E1 = endurance(I, C1, false, 3);
  if (!E1 || E1.Ec <= C1.Ecap) return 1;
  const over = k => endurance(I, car(I, gr, k), false, 3).Ec - C1.Ecap;
  let k0 = 1, e0 = E1.Ec - C1.Ecap;
  let k1 = Math.max(0.05, Math.min(0.95, C1.Ecap / E1.Ec)), e1 = over(k1);
  for (let i = 0; i < 5 && Math.abs(e1) > 0.002 * C1.Ecap; i++) {
    const k2 = Math.max(0.05, Math.min(1, k1 - e1 * (k1 - k0) / ((e1 - e0) || 1e-9)));
    k0 = k1; e0 = e1; k1 = k2; e1 = over(k1);
  }
  return e1 > 0 ? k1 * 0.995 : k1;
}

// 내구 (에너지 제한 포함). full 이면 줄여 셈과 다 셈의 차이를 한 번 더 맞춤
function runEnd(I, gr, full) {
  const C = car(I, gr, 1);
  let k = powerCut(I, gr), CE = k < 1 ? car(I, gr, k) : C, EN = endurance(I, CE, full, full ? 1 : 3);
  if (full && EN && EN.Ec > C.Ecap) {
    k *= Math.pow(C.Ecap / EN.Ec, 1.5);
    CE = car(I, gr, k);
    EN = endurance(I, CE, true, 1);
  }
  return EN ? { ...EN, k, CE } : null;
}

// 내 코스: 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스 (끝 = 처음)
function freeSegs(I) {
  const F = I.free || {}, segs0 = (F.seg || []).filter(r => r[0] > 0);
  if (!segs0.length) return null;
  const m = Math.max(1, Math.round(F.laps || 1)), s0 = F.s0 || 0;
  const closed = F.closed != null ? F.closed !== false : (m > 1 || s0 > 0);
  return { segs: closed ? rotate(segs0, s0) : segs0, m: closed ? m : 1 };
}
function runFree(I, C, ds, fast) {
  const F = freeSegs(I);
  if (!F) return null;
  if (!fast || F.m <= 3) return { ...laps(C, F.segs, F.m, ds, 1, fast ? C.Voc(1) : undefined), m: F.m };
  const L3 = laps(C, F.segs, 3, ds, 1, C.Voc(1));          // 줄여 셈: 첫 랩 + 중간 랩 × (m−2) + 끝 랩
  return { t: [L3.t[0], ...Array(F.m - 2).fill(L3.t[1]), L3.t[2]], m: F.m };
}

// 랩 기록 정리: 정지 출발 랩(stand)을 뺀 평균 랩 [s]
function lapStat(t, stand) {
  const rest = t.filter((_, i) => !stand.includes(i));
  return { total: sum(t), first: t[0], avg: rest.length ? sum(rest) / rest.length : NaN, n: t.length };
}

// 종목 기록 한 벌 (감속비 gr).  fast = 줄여 셈 (감속비 찾기 · 입력 훑기)
function events(I, gr, fast) {
  const ds = fast ? 3 : 1, C = car(I, gr, 1);
  const vs = skidV(C, SK_R, C.Voc(1)), X = runAx(I, C, ds), EN = runEnd(I, gr, !fast);
  return { C, acc: runAcc(C).t[0], skid: SK_C / vs, vs, ax: X ? X.t[0] : NaN, X, EN, end: EN ? EN.T : NaN };
}


// ================================================================ 감속비 찾기
// 2.5 ~ 7.0 을 0.5 간격으로 보고, 가장 좋은 곳 ± 0.4 를 0.1 간격으로 다시 봄
function scanGr(score) {
  let b = 2.5;
  for (let x = 2.5; x <= 7.0001; x += 0.5) if (score(x) > score(b)) b = x;
  const b0 = b;
  for (let x = Math.max(2.5, b0 - 0.4); x <= Math.min(7, b0 + 0.4) + 1e-9; x += 0.1) if (score(x) > score(b) + 1e-12) b = x;
  return Math.round(b * 100) / 100;
}

// 종목별 가장 빠른 감속비 + 배점 가중 제안
//   제안 = Σ 배점 × (입력 감속비 기록 − 그 감속비 기록) ÷ 입력 감속비 기록 이 가장 큰 감속비
function bestGr(I) {
  const memo = new Map();
  const ev = gg => { gg = Math.round(gg * 100) / 100; if (!memo.has(gg)) memo.set(gg, events(I, gg, true)); return memo.get(gg); };
  const E0 = ev(I.gr);
  const J = E => Object.keys(W_PT).reduce((a, k) => a + (isFinite(E0[k]) && isFinite(E[k]) ? W_PT[k] * (E0[k] - E[k]) / E0[k] : 0), 0);
  const out = {};
  for (const k of ['acc', 'ax', 'end']) out[k] = scanGr(x => { const t = ev(x)[k]; return isFinite(t) ? -t : -Infinity; });
  out.opt = scanGr(x => J(ev(x)));
  return out;
}

// 내 코스에서 가장 빠른 감속비 (모든 랩 합, 줄여 셈)
function bestGrFree(I) {
  if (!freeSegs(I)) return NaN;
  const memo = new Map();
  return scanGr(x => {
    const k = Math.round(x * 100) / 100;
    if (!memo.has(k)) { const R = runFree(I, car(I, k, 1), 1, true); memo.set(k, R ? -sum(R.t) : -Infinity); }
    return memo.get(k);
  });
}


// ================================================================ 그 밖의 결과
// 스키드패드 목표 기록 → 필요한 C_L·A [m²] (공력 중심 위치는 그대로, 크기만)
function claNeed(I, gr) {
  if (!(I.t_skid > 0)) return NaN;
  const keep = VC;
  const tAt = c => { VC = new Map(); const C = car({ ...I, cla: c }, gr, 1); return SK_C / skidV(C, SK_R, C.Voc(1)); };
  let r;
  if (tAt(0) <= I.t_skid) r = 0;
  else if (tAt(15) > I.t_skid) r = NaN;
  else {
    let lo = 0, hi = 15;
    for (let i = 0; i < 40; i++) { const md = (lo + hi) / 2; if (tAt(md) > I.t_skid) lo = md; else hi = md; }
    r = hi;
  }
  VC = keep;
  return r;
}

// 모터 기저 회전수 [rpm]: 토크 곡선이 최대의 98 % 아래로 처음 내려가는 회전수 (공칭 개방 전압)
function nBase(I, C) {
  const V = I.n_s * I.c_vnom, T0 = C.Tcurve(1, V);
  for (let n = 0; n <= I.nmax; n += 5) if (C.Tcurve(n, V) < 0.98 * T0) return n;
  return NaN;
}


// ================================================================ 고른 코스 (그래프 · 지도 · 아래 결과 3칸)
// 감속비 gr 로 고른 코스를 다 계산.  {L: 랩 결과, C: 차량, stand: 정지 출발 랩, rev: 지도 방향, k: 출력 상한 배율}
function runCourse(I, c, gr) {
  const C = car(I, gr, 1);
  if (c === 'acc')  return { L: runAcc(C), C, stand: [0] };
  if (c === 'skid') return { L: laps(C, SKID, 1, 0.5, 1, C.Voc(1)), C, stand: [0], skid: true };
  if (c === 'ax')   { const X = runAx(I, C, 1); return X && { L: X, C, stand: [0], rev: true }; }
  if (c === 'free') { const F = runFree(I, C, 0.5, false); return F && { L: F, C, stand: [0] }; }
  const EN = runEnd(I, gr, true);
  return EN && { EN, C: EN.CE, k: EN.k, stand: [0, EN.n1] };
}


// ================================================================ 계산
function calc(I) {
  VC = new Map();

  // ---------- 입력 훑기: 입력 감속비로 종목 기록만 (줄여 셈)
  if (I._sweep) {
    const E = events(I, I.gr, true);
    return { out: { t_acc_s: E.acc, t_skid_s: E.skid, t_ax_s: E.ax, t_end_s: E.end, e_use: E.EN ? E.EN.Ec / 3.6e6 : NaN,
                    p_lim: E.EN ? E.EN.k * 100 : NaN, vmax: E.C.vtop * 3.6, ay_skid: E.vs * E.vs / SK_R / g } };
  }

  // ---------- 1행: 감속비 (종목별 가장 빠른 값 · 제안)
  const B  = bestGr(I);
  const BF = bestGrFree(I);
  const fast = {                                          // 가장 빠른 감속비에서 다 계산한 기록 [s]
    acc: runAcc(car(I, B.acc, 1)).t[0],
    ax:  (runAx(I, car(I, B.ax, 1), 1) || { t: [NaN] }).t[0],
    end: (runEnd(I, B.end, true) || { T: NaN }).T,
    free: isFinite(BF) ? sum(runFree(I, car(I, BF, 1), 0.5, false).t) : NaN,
  };

  // ---------- 2행: 종목 기록 · 차량 한계 (모드의 감속비 하나)
  const opt = I.grMode === 'opt';
  const G2  = opt ? B.opt : I.gr;
  const E   = events(I, G2, false), C = E.C, EN = E.EN;
  const FR  = runFree(I, C, 0.5, false);
  const end = EN ? lapStat(EN.t, [0, EN.n1]) : null;
  const fr  = FR ? lapStat(FR.t, [0]) : null;

  // ---------- 3행: 고른 코스 (감속비: 내 감속비 모드 = 입력, 최적 모드 = 그 코스에서 가장 빠른 값)
  const c  = I.course;
  const G3 = !opt ? I.gr : ({ acc: B.acc, ax: B.ax, end: B.end, free: BF, skid: G2 })[c];
  const K  = runCourse(I, c, isFinite(G3) ? G3 : G2);

  const out = {
    // 1행
    gr_opt: B.opt, gr_acc: B.acc, gr_ax: B.ax, gr_end: B.end, gr_free: BF,
    tb_acc: fast.acc, tb_ax: fast.ax, tb_end: fast.end, tb_free: fast.free,
    // 2행 · 종목 기록
    gr_use: G2,
    t_acc_s: E.acc, t_skid_s: E.skid, t_ax_s: E.ax, t_end_s: E.end,
    t_end1: end ? end.first : NaN, t_endavg: end ? end.avg : NaN, n_lap: EN ? EN.n : NaN, n_st1: EN ? EN.n1 : NaN,
    t_free: fr ? fr.total : NaN, t_free1: fr ? fr.first : NaN, t_freeavg: fr ? fr.avg : NaN, n_free: FR ? FR.m : NaN,
    t_free2: FR && FR.t.length > 1 ? FR.t[1] : NaN,
    e_free: FR ? FR.Et[Math.min(1, FR.Et.length - 1)] / 3.6e6 : NaN,
    d_acc: E.acc - fast.acc, d_ax: E.ax - fast.ax, d_end: E.end - fast.end, d_free: fr ? fr.total - fast.free : NaN,
    // 2행 · 차량 한계
    vmax: C.vtop * 3.6, v_top: E.X ? Math.max(...E.X.v) * 3.6 : NaN, ay_skid: E.vs * E.vs / SK_R / g,
    ax_0: C.aDrive(0, 0, 0, C.Voc(1)) / g, cla_req: claNeed(I, G2),
    // 축전지 · 모터 (감속비와 상관없음)
    n_base: nBase(I, C),
    v_load: C.Voc(1) - Math.min(C.Imax, C.Voc(1) / (2 * Math.max(C.Rb, 1e-9))) * C.Rb,
    p_max: C.ptMax(C.Voc(1)) / 1000,
    // 내구 (2행 감속비) — 대시보드 반영 · 검증용
    e_cap: C.Ecap / 3.6e6, e_ok: EN ? (EN.Ec <= C.Ecap * 1.01 ? 1 : 0) : NaN,
    e_lap: EN ? lapStat(EN.et, [0, EN.n1]).avg / 3.6e6 : NaN,
    g_skid: I.t_skid,
  };

  // ---------- 모터 탭 그림: 토크 곡선 (표 기준 전압 · 공칭 · 최대 전류 때)과 구동력 선도 (2행 감속비)
  const Vn = I.n_s * I.c_vnom;
  const NN = Array.from({ length: 131 }, (_, i) => I.nmax * i / 130);
  const VV = Array.from({ length: 121 }, (_, i) => C.vtop * i / 120);
  const motor = { n: NN,
    tref:  NN.map(n => C.Tcurve(n, I.v_ref * (I.ke_ratio > 0 ? I.ke_ratio : 1))),
    tnom:  NN.map(n => C.Tcurve(n, Vn)),
    tload: NN.map(n => C.Tcurve(n, out.v_load)) };
  const ft = { v: VV.map(x => x * 3.6), f_m: VV.map(x => C.drive(x, C.Voc(1)).F), f_x: VV.map(x => C.capR(x, 0, 0)), f_res: VV.map(C.Fres) };

  if (!K) return { out, x: { d: [0] }, sig: {}, map: null, motor, ft };

  // ---------- 고른 코스: 볼 랩 고르기 → 그래프 신호
  let G, v, lim, V0, from = 0, to, map;
  const L = K.EN ? null : K.L;
  if (K.EN) {                                             // 내구: 드라이버 A · B 두 줄을 이어 붙임
    const A = K.EN.A, Bq = K.EN.B, off = A.G.s.at(-1), P = A.P;
    G   = { s: [...A.G.s, ...Bq.G.s.slice(1).map(x => x + off)], k: [...A.G.k, ...Bq.G.k] };
    v   = [...A.v, ...Bq.v.slice(1)];
    lim = [...A.lim, ...Bq.lim.slice(1)];
    V0  = [...A.V0, ...Bq.V0.slice(1)];
    const j = I.lap === 'all' ? -1 : Math.max(1, Math.min(K.EN.n, parseInt(I.lap) || 1)) - 1;
    if (j >= 0) { from = j * P; to = (j + 1) * P; } else to = G.s.length - 1;
    const jm = j >= 0 ? j : 1;
    map = { P, vc: v.slice(jm * P, (jm + 1) * P + 1).map(a => a * 3.6) };
  } else {
    G = L.G; v = L.v; lim = L.lim; V0 = L.V0;
    const n = L.t.length, P = L.P;
    const j = I.lap === 'all' || n === 1 ? -1 : Math.max(1, Math.min(n, parseInt(I.lap) || 1)) - 1;
    if (j >= 0) { from = j * P; to = (j + 1) * P; } else to = G.s.length - 1;
    const jm = j >= 0 ? j : (n > 1 ? 1 : 0);
    map = K.skid ? { skid: true } : c === 'acc' ? { acc: true }
        : { P, rev: !!K.rev, vc: v.slice(jm * P, (jm + 1) * P + 1).map(a => a * 3.6) };
  }
  const sl = a => a.slice(from, to + 1);
  const Gs = { s: sl(G.s).map(x => x - G.s[from]), k: G.k.slice(from, to) }, vv = sl(v);
  const W  = walk(K.C, Gs, vv, sl(V0), true);

  // ---------- 3행 결과: 고른 코스 · 볼 랩
  const lt = K.EN ? K.EN.t : L.t, le = K.EN ? K.EN.et : L.Et, lc = K.EN ? K.EN.ec : L.Ec;
  const ls = lapStat(lt, K.stand), one = I.lap !== 'all' && lt.length > 1;
  const jj = one ? Math.max(1, Math.min(lt.length, parseInt(I.lap) || 1)) - 1 : -1;
  const pick = a => jj >= 0 ? a[jj] : sum(a);
  const socEnd = K.EN ? K.EN.soc1 : (L.soc1 != null ? L.soc1 : NaN);
  Object.assign(out, {
    c_gr: K.C.gr, c_n: lt.length, c_lap: jj + 1,
    c_t: lt.length > 1 ? (jj >= 0 ? lt[jj] : ls.total) : lt[0], c_t1: ls.first, c_tavg: ls.avg, c_ttot: ls.total,
    c_vtop: Math.max(...vv) * 3.6,
    c_rpm: Math.max(...W.S.rpm), c_tq: Math.max(...W.S.tq), c_pbat: Math.max(...W.S.pbat), c_vmin: Math.min(...W.S.vbat),
    c_et: pick(le) / 3.6e6, c_ec: pick(lc) / 3.6e6,
    c_soc: (jj >= 0 ? ((K.EN ? K.EN.soc : L.socs)[jj + 1] ?? socEnd) : socEnd) * 100,
    c_plim: K.k != null ? K.k * 100 : NaN,
    c_cap: K.EN ? K.C.Ecap / 3.6e6 : NaN,
    c_co2: K.EN ? (K.EN.Et / 3.6e6) * 1.3 / (K.EN.n * sum(I.end.seg.map(r => r[0])) / 1000) * 100 : NaN,
  });

  return {
    out, x: { d: Gs.s },
    sig: { v: vv.map(a => a * 3.6), vlim: sl(lim).map(a => a * 3.6), t: W.tc, ecum: W.et.map(e => e / 3600), ...W.S },
    map, motor, ft,
  };
}
`
};

/* ============================================================ 대시보드 '파트별 > 차량 목표 · 파워트레인'
   대시보드 값으로 도구 2를 돌린 결과 (읽기 전용, 내 감속비 = 대시보드 감속비) */
const T2P = { R:null, key:'', busy:false, w:null };
const T2ONLY = ['v_ref', 'ke_ratio', 'eta_mot', 'eta_inv', 'c_vmax', 'c_vmin', 'c_vnom', 'c_ah'];   // 대시보드에 없는 입력: 도구에 저장된 값을 씀
const T2GOAL = ['t_acc', 't_skid', 't_ax', 't_end'];                                                    // 목표 기록 (대시보드 '차량 목표')
function t2PartInputs(){ const I = {}; WB_TOOLS['2'].inputs.forEach(d => { const db = wbDash(d.dk); I[d.k] = db ? db.v : d.v; });
  T2GOAL.forEach(k => { const db = wbDash(k); I[k] = db ? db.v : 0; });
  try{ const s = JSON.parse(localStorage.getItem(wbStoreKey('2')) || '{}') || {}; T2ONLY.forEach(k => { if(typeof s[k]==='number' && isFinite(s[k])) I[k] = s[k]; }); }catch(e){}
  return {...I, ...t2ExtraI(), course:'acc', lap:'1', grMode:'my'}; }
function t2PartDirty(){ T2P.key = ''; if(typeof DASH!=='undefined' && (DASH.part==='goal' || DASH.part==='pt') && $('#t2part')) t2PartRun(); }
function t2PartRun(){ const I = t2PartInputs(), key = JSON.stringify(I); if(key===T2P.key || T2P.busy) return; T2P.busy = true;
  try{ if(!T2P.w) T2P.w = new Worker(URL.createObjectURL(new Blob([WB_TOOLS['2'].code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false}); } };'], {type:'text/javascript'}))); }catch(e){ T2P.busy = false; return; }
  T2P.w.onmessage = e => { T2P.busy = false; T2P.key = key; if(e.data.ok){ T2P.R = e.data.r; const b = $('#t2part'); if(b) b.innerHTML = t2PartBody(DASH.part, I, T2P.R); } };
  T2P.w.postMessage(I); }
function t2PartHTML(kind){ setTimeout(t2PartRun, 0);
  return `<div class="t2-part"><p class="dp-note">대시보드 설계값과 도구 2의 코스 · 모터 · 효율 표로 계산한 결과입니다. 표를 바꾸려면 <button type="button" class="lnk" data-wb="2">도구 2 랩타임 시뮬레이터</button>를 엽니다.</p><div id="t2part">${T2P.R ? t2PartBody(kind, t2PartInputs(), T2P.R) : '<p class="muted">계산 중…</p>'}</div></div>`; }
function t2PartBody(kind, I, R){ const o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  if(kind==='goal'){ const rows = [['가속', I.t_acc, o.t_acc_s, 3], ['스키드패드', I.t_skid, o.t_skid_s, 3], ['오토크로스', I.t_ax, o.t_ax_s, 2], ['내구', I.t_end, o.t_end_s, 1]];
    return `<table class="dvi-t t2-gt"><thead><tr><th>종목</th><th>예상 기록</th><th>목표 기록</th><th>차이</th></tr></thead><tbody>${rows.map(([n, g0, t, d]) => { const has = g0 > 0, df = t - g0;
        return `<tr><td>${n}</td><td><b>${f(t, d)}</b> s</td><td>${has ? f(g0, d) + ' s' : '<span class="muted">정하지 않음</span>'}</td><td class="${has && isFinite(df) ? (df > 0 ? 'wb-err' : 'ok') : ''}">${has && isFinite(df) ? (df > 0 ? '+' : '−') + wbFmt(Math.abs(df), d) + ' s' : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="dp-note">대시보드 감속비 ${f(I.gr, 2)}로 계산. 목표 기록은 대시보드 '차량 목표'(공통) 값이고, 차이가 + 면 목표보다 느립니다. 도구 2의 제안 감속비는 ${f(o.gr_opt, 2)}.</p>`; }
  const F = R.ft; return `<div class="dp-plots">${wbPlot({id:'t2ft', w:640, h:280, x:{d:F.v, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:F.f_m, c:WB_COL[0], n:'모터 구동력', u:'N', dd:0}, {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}], yn:{'N':'바퀴 힘'}, label:'구동력 선도'})}</div>
    <div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴, SOC 100 %)</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진 · 일정 속도)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항 (항력 + 구름)</span></div>
    <p class="dp-note">감속비 ${f(I.gr, 2)} · 회전수 한계 최고속 ${f(o.vmax, 1)} km/h · 단자 출력 상한 ${f(o.p_max, 1)} kW. 모터 구동력이 접지 한계보다 큰 구간은 바퀴가 미끄러지므로 접지 한계가 가속을 정합니다. 제안 감속비 ${f(o.gr_opt, 2)}, 내구 평균 랩 단자 에너지 ${f(o.e_lap, 3)} kWh.</p>`; }
