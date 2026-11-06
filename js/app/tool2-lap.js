/* ============================================================
   도구 2 — 랩타임 시뮬레이터 (QSS, 감속비 고르기 포함) · docs/TOOLS-PLAN.md 5절 · docs/HANDOFF.md 4-2절
   - 코스: 내 코스(사용자가 만든 코스) · 오토크로스 · 내구레이스 · 가속 · 스키드패드 (공식 4개는 고칠 수 없는 기본 코스)
     공식 내구 코스 = js/data/fsk2026-course.js (FSK26), 모터 기본값 = js/data/emrax228.js (EMRAX228)
   - 차량 모델: 점질량 준정적 + 앞뒤 · 좌우 하중 이동 + 타이어 하중 감도(직선 또는 맵) + 뒤축 구동,
     모터 곡선(전압 보정) · 열(1점 모델) · 디레이팅, 효율(상수 또는 맵), 축전지(내부저항 · SOC)
   - 탭: [시뮬레이션] 결과 · 구동력 선도(프로브) · 코스 지도(확대 · 프로브) · 신호 그래프 / [맵 편집] 코스 · 모터 · 효율 · 타이어 표
   - 결과: [내 감속비 | 최적 감속비] (두 모드 미리 계산) · 감속비 · 종목 기록(가장 빠른 기록 대비) · 차량 한계 / 고른 코스 · 축전지 · 모터 · 에너지
   ============================================================ */
const T2KEY = 'run2x.wb.2.ext.v2';
const T2TRACK_EX = '25, 0   # 출발 직선\n5, 25   # 슬라럼 (파일런 간격 10 m)\n10, -25\n10, 25\n10, -25\n10, 25\n10, -25\n10, 25\n5, -25\n20, 0\n31.42, 20   # 왼쪽 90° (지름 40 m)\n40, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n30, 0\n15.71, 5   # 왼쪽 헤어핀 (지름 10 m)\n35, 0\n17.28, -5.5   # 오른쪽 헤어핀 (지름 11 m)\n35, 0\n23.56, 15   # 왼쪽 90° (지름 30 m)\n50, 0\n20.94, 30   # 완만한 굽이\n20.94, -30\n40, 0\n21.82, 25   # 반경이 줄어드는 왼쪽 회전\n8.38, 12\n42.32, 0\n15.71, 5   # 왼쪽 헤어핀\n30, 0\n17.28, -5.5   # 오른쪽 헤어핀\n25, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n20, 0\n28.27, 18   # 왼쪽 90° (지름 36 m)\n12.99, 0   # 결승 직선';
const T2TRACK_PH = '한 줄에 한 구간 — 종류, 길이 m, 반경 m\n직선, 54.0\n왼쪽, 2.2, 2.6\n오른쪽, 9.9, 18.1\n\n엑셀에서 열을 복사해 붙여 넣어도 됩니다.\n종류 대신 반경 부호도 됨: 왼쪽 +, 오른쪽 −, 직선 0 (예: 25, 0 · 15.7, -5)\n# 뒤는 메모';
const T2MOTOR_PH = '첫 줄은 열 이름, 그 아래 한 줄에 회전수 · 최대 토크 · 연속 토크\n회전수 rpm, 최대 토크 N·m, 연속 토크 N·m\n0, 230, 110\n4800, 230, 112\n6500, 180, 92\n\n연속 토크는 디레이팅의 하한 (없으면 0 까지 깎임).';
const T2TIRE_PH = '비우면 왼쪽 [타이어 마찰계수] · [μ 하중 감도]를 씁니다.\n숫자 하나 = 하중과 상관없는 μ\n표 = 한 줄에 바퀴 하나 수직 하중 N, μ\n하중 N, μ\n0, 1.8\n1000, 1.6\n2000, 1.45';
const T2EFF_PH = '비우면 왼쪽 입력 칸의 상수 효율을 씁니다.\n숫자 하나 = 상수 효율 [%] (예: 97)\n맵 = 첫 줄은 회전수, 첫 열은 토크, 칸은 효율 %\n토크 N·m \\ 회전수 rpm, 0, 2000, 4000\n50, 88, 93, 92\n150, 90, 95, 94\n230, 87, 93, 92';
/* 화면 상태 (이 브라우저에 저장). free.text = 내 코스 표를 글로 (한 줄에 한 구간) */
const T2 = { tab:'sim', etab:'course', course:'end', lap:{end:'1', free:'1'}, free:{text:'', laps:1, s0:0}, mtext:'', eM:'', eI:'', tire:'', grMode:'my',
             menu:'', paste:'', zoom:{k:1, cx:.5, cy:.5}, timer:0 };
const T2ET = {course:'코스', mt:'모터 토크 곡선', eM:'모터 효율 맵', eI:'인버터 효율 맵', tire:'타이어 하중 감도'};   // 맵 편집 항목
T2.free.text = T2TRACK_EX.split('\n').map(l => l).join('\n');
T2.mtext = (typeof EMRAX228!=='undefined' ? EMRAX228.torque : ''); T2.eM = (typeof EMRAX228!=='undefined' ? EMRAX228.eff : '');
const T2COURSES = ['free', 'ax', 'end', 'acc', 'skid'];
function t2Load(s){ if(!s || typeof s!=='object') return;
  if(T2COURSES.includes(s.course)) T2.course = s.course; if(s.lap && typeof s.lap==='object') Object.assign(T2.lap, s.lap);
  if(s.free && typeof s.free.text==='string') Object.assign(T2.free, {text:s.free.text, laps:Math.max(1, Math.round(+s.free.laps || 1)), s0:Math.max(0, +s.free.s0 || 0)});
  if(typeof s.mtext==='string') T2.mtext = s.mtext; if(typeof s.eM==='string') T2.eM = s.eM; if(typeof s.eI==='string') T2.eI = s.eI; if(typeof s.tire==='string') T2.tire = s.tire;
  if(s.grMode==='my' || s.grMode==='opt') T2.grMode = s.grMode; if(['sim', 'edit'].includes(s.tab)) T2.tab = s.tab; if(T2ET[s.etab]) T2.etab = s.etab; }
try{ t2Load(JSON.parse(localStorage.getItem(T2KEY) || '{}')); }catch(e){}
const t2Save = () => { try{ localStorage.setItem(T2KEY, JSON.stringify({course:T2.course, lap:T2.lap, free:T2.free, mtext:T2.mtext, eM:T2.eM, eI:T2.eI, tire:T2.tire, grMode:T2.grMode, tab:T2.tab, etab:T2.etab})); }catch(e){} };

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
/* 모터 토크 표: 1열 = 회전수 rpm, 2열 = 최대 토크, 3열 = 연속 토크 (디레이팅 하한) [N·m]. 숫자가 없는 첫 줄 = 열 이름 */
function t2MotorParse(txt){ let names = [], rows = [], bad = [];
  t2Lines(txt).forEach(L => { if(!L.cells.length) return; const nums = L.cells.map(c => c==='' ? NaN : +c);
    if(nums.filter(isFinite).length >= 2 && isFinite(nums[0])) rows.push(nums); else if(!rows.length && !names.length) names = L.cells; else bad.push(L.i); });
  const nc = rows.reduce((a, r) => Math.max(a, r.length), 0) - 1, cols = Array.from({length:Math.max(0, nc)}, (_, j) => names[j + 1] || `토크 열 ${j + 1}`);
  const col = c => rows.filter(r => isFinite(r[c]) && r[0] >= 0 && r[c] >= 0).map(r => [r[0], r[c]]).sort((a, b) => a[0] - b[0]);
  return {cols, bad, pts: col(1), ptsC: nc >= 2 ? col(2) : []}; }
/* 타이어 하중 감도: 비면 null(→ 왼쪽 μ · 감도), 숫자 하나 = 일정 μ, 표 = [[바퀴 하중 N, μ]] */
function t2TireParse(txt){ const rows = []; t2Lines(txt).forEach(L => { const n = L.cells.map(c => c==='' ? NaN : +c); if(n.length >= 2 && isFinite(n[0]) && isFinite(n[1]) && n[0] >= 0 && n[1] >= 0) rows.push([n[0], n[1]]); else if(n.length===1 && isFinite(n[0])) rows.push([0, n[0]]); });
  if(!rows.length) return {map:null, msg:''}; rows.sort((a, b) => a[0] - b[0]);
  return {map:rows, msg: rows.length===1 ? `일정 μ ${wbFmt(rows[0][1], 2)}` : `${rows.length}점 · 하중 ${wbFmt(rows[0][0], 0)} ~ ${wbFmt(rows[rows.length-1][0], 0)} N · μ ${wbFmt(Math.min(...rows.map(r => r[1])), 2)} ~ ${wbFmt(Math.max(...rows.map(r => r[1])), 2)}`}; }
/* 효율: 비면 null(→ 상수 칸), 숫자 하나면 상수 맵, 2차원 표면 맵 {n:[회전수], t:[토크], e:[[%]]}. 값이 모두 1.5 이하면 비율로 보고 × 100 */
function t2EffParse(txt){ const L = t2Lines(txt).filter(l => l.cells.length); if(!L.length) return {map:null, msg:''};
  const flat = L.flatMap(l => l.cells).filter(c => c!=='' && isFinite(+c)).map(Number);
  if(L.length===1 && flat.length===1){ const v = flat[0] <= 1.5 ? flat[0]*100 : flat[0]; return {map:{n:[0, 1e6], t:[0, 1e6], e:[[v, v], [v, v]]}, msg:`상수 ${wbFmt(v, 1)} %`}; }
  const head = L[0].cells.slice(1).map(Number); if(head.length < 2 || !head.every(isFinite)) return {map:null, msg:'<span class="wb-err">맵의 첫 줄(회전수)을 읽지 못했습니다</span>'};
  const t = [], e = []; L.slice(1).forEach(l => { const r = l.cells.map(Number); if(isFinite(r[0]) && r.slice(1, head.length + 1).every(isFinite)){ t.push(r[0]); e.push(r.slice(1, head.length + 1)); } });
  if(t.length < 2) return {map:null, msg:'<span class="wb-err">맵의 토크 줄을 2줄 이상 읽지 못했습니다</span>'};
  const sc = Math.max(...e.flat()) <= 1.5 ? 100 : 1, map = {n:head, t, e:e.map(r => r.map(v => v*sc))};
  return {map, msg:`맵 ${t.length} × ${head.length} (토크 ${wbFmt(t[0], 0)} ~ ${wbFmt(t[t.length-1], 0)} N·m, 회전수 ${wbFmt(head[0], 0)} ~ ${wbFmt(head[head.length-1], 0)} rpm, 효율 ${wbFmt(Math.min(...map.e.flat()), 1)} ~ ${wbFmt(Math.max(...map.e.flat()), 1)} %)`}; }
const t2ExtraI = () => ({ end: typeof FSK26!=='undefined' ? {seg:FSK26.seg, laps:FSK26.laps, stint:FSK26.stint, WL:FSK26.WL, WR:FSK26.WR, slalom:FSK26.slalom || []} : {seg:[]},
  free:{seg:t2Track(T2.free.text).segs, laps:T2.free.laps, s0:T2.free.s0}, motor:t2MotorParse(T2.mtext).pts, motorC:t2MotorParse(T2.mtext).ptsC,
  effM:t2EffParse(T2.eM).map, effI:t2EffParse(T2.eI).map, tireMap:t2TireParse(T2.tire).map, course:T2.course, lap:T2.lap[T2.course] || '1', grMode:T2.grMode });

/* ---------- 파일 가져오기 · 양식 받기 ---------- */
async function t2ReadCells(file){ const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(ext==='xlsx') return await t2Xlsx(await file.arrayBuffer());
  if(['csv', 'txt', 'tsv'].includes(ext)) return (await file.text()).split(/\r?\n/).map(l => l.split(/[,;\t]/));
  throw new Error(`읽을 수 없는 파일입니다 (.${ext || '확장자 없음'}). .xlsx · .csv 를 올리거나, 엑셀 .xls 는 [다른 이름으로 저장 → .xlsx]로 저장해 올려 주십시오.`); }
async function t2Import(file, what){ try{ const cells = await t2ReadCells(file), txt = cells.map(r => r.map(c => String(c ?? '').trim()).join(', ').replace(/(, )+$/, '')).filter(l => l.replace(/[, ]/g, '')).join('\n');
    if(what==='track'){ const P = t2Track(txt); if(!P.rows.length) throw new Error('구간을 찾지 못했습니다. 한 줄에 길이 m, 반경 m 두 숫자(또는 종류, 길이, 반경)가 있어야 합니다.');
      T2.free.text = t2RowsText(P.rows); toast(`${file.name}: 구간 ${P.rows.length}개 읽음${P.bad.length ? ` · ${P.bad.slice(0, 5).join(', ')}번째 줄은 숫자가 없어 건너뜀` : ''}`); }
    else if(what==='motor'){ const P = t2MotorParse(txt); if(!P.pts.length) throw new Error('회전수 · 토크 줄을 찾지 못했습니다.'); T2.mtext = txt; toast(`${file.name}: ${P.pts.length}점${P.ptsC.length ? ' · 연속 토크 포함' : ''}`); }
    else if(what==='tire'){ const P = t2TireParse(txt); if(!P.map) throw new Error('하중 · μ 줄을 찾지 못했습니다.'); T2.tire = txt; toast(`${file.name}: ${P.msg}`); }
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
    ['# 모터 토크 곡선 양식 — 1열 회전수 rpm · 2열 최대 토크 N·m · 3열 연속 토크 N·m (디레이팅 하한 · 없으면 비움)'], ['# 도구 왼쪽 [모터 표 기준 전압]에서 잰 곡선을 넣음 · # 줄은 건너뜀'],
    ['회전수 rpm', '최대 토크 N·m', '연속 토크 N·m'], [0, 230, 110], [4800, 230, 112], [6500, 180, 92]]},
  eff:{name:'효율맵_양식', rows:[
    ['# 효율 양식 — 숫자 하나만 쓰면 상수 효율 % · 표면 맵'], ['# 맵: 첫 줄 = 회전수 rpm · 첫 열 = 토크 N·m · 칸 = 효율 % (0 ~ 1 비율로 써도 됨)'], ['# # 줄은 건너뜀'],
    ['토크 N·m \\ 회전수 rpm', 0, 2000, 4000], [50, 88, 93, 92], [150, 90, 95, 94], [230, 87, 93, 92]]} };
T2TPL.tire = {name:'타이어하중감도_양식', rows:[
  ['# 타이어 하중 감도 양식 — 한 줄에 바퀴 하나 수직 하중 N · 그때 μ (줄 사이는 직선 보간 · 범위 밖은 끝값)'], ['# 숫자 하나만 쓰면 하중과 상관없는 μ · # 줄은 건너뜀'],
  ['하중 N', 'μ'], [0, 1.8], [1000, 1.6], [2000, 1.45]]};
function t2Template(kind, fmt){ const T = T2TPL[kind]; let blob;
  if(fmt==='xlsx') blob = t2XlsxBlob(T.rows); else blob = new Blob(['﻿' + T.rows.map(r => r.join(',')).join('\r\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${T.name}.${fmt}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }


/* ============================================================ 작업창 위 탭: [시뮬레이션] · [맵 편집]
   시뮬레이션: 위 줄(기준 감속비 · 볼 랩 · 코스) → 결과 → 구동력 선도 · 코스 지도 (프로브) → 신호 선택 그래프
   맵 편집   : 항목(코스 · 모터 토크 곡선 · 모터 효율 맵 · 인버터 효율 맵 · 타이어 하중 감도) → 왼쪽 표 + 오른쪽 그림
               표에 값이 있으면 왼쪽 입력의 상수 칸을 막고 표를 씀. 비우면 다시 상수 */
const T2CN = {free:'내 코스', ax:'오토크로스', end:'내구레이스', acc:'가속', skid:'스키드패드'};
const t2Sum = a => a.reduce((x, y) => x + y, 0);
const t2Closed = () => T2.free.laps > 1 || T2.free.s0 > 0;      // 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스
const t2Seg = (attr, cur, items) => `<span class="dc-seg" role="group">${items.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${cur===k}">${t}</button>`).join('')}</span>`;

function t2ExtHTML(){ const sim = T2.tab==='sim', w = $('#wb'); if(w) w.classList.toggle('t2-edit', !sim);
  const R = WB.id==='2' ? WB.R : null, go = R && R.modes ? R.modes.opt.out.gr_use : NaN;
  const bar = sim
    ? `<span class="t2-gm"><span class="muted">기준 감속비</span>${t2Seg('data-t2gm', T2.grMode, [['my', `내 감속비 ${wbFmt(WB.I.gr, 2)}`], ['opt', `최적 감속비 ${isFinite(go) ? wbFmt(go, 2) : '…'}`]])}</span>
       <span class="t2-vw"><label class="t2-lapl">볼 랩 <span id="t2lapw">${t2LapSel()}</span></label><span class="muted">코스</span>${t2Seg('data-t2course', T2.course, T2COURSES.map(k => [k, T2CN[k]]))}</span>`
    : `<span class="t2-vw"><span class="muted">편집할 표</span>${t2Seg('data-t2et', T2.etab, Object.entries(T2ET))}</span>`;
  return `<section class="wb-sec t2-ext" aria-label="시뮬레이션 · 맵 편집"><div class="wb-h t2-h"><div class="m1-tabs" role="tablist">${[['sim', '시뮬레이션'], ['edit', '맵 편집']].map(([k, t]) => `<button type="button" role="tab" data-t2tab="${k}" aria-selected="${T2.tab===k}">${t}</button>`).join('')}</div></div>
    <div class="t2-hr${sim ? '' : ' left'}">${bar}</div>
    ${sim ? '' : T2.etab==='course' ? t2CourseEdit() : t2MapEdit(T2.etab)}${t2PasteHTML()}</section>`; }

/* ---------- [입력하기 ▾] 메뉴: 표 k = track · mt · eM · eI · tire.  on = false 면 회색으로 막음 */
function t2MenuHTML(k, label, on){ const tpl = k==='track' ? 'track' : k==='mt' ? 'motor' : k==='tire' ? 'tire' : 'eff';
  const items = [`<button type="button" data-t2act="paste" data-t2k="${k}">붙여넣기</button>`, `<label class="t2-mi">파일 가져오기 (.xlsx · .csv)<input type="file" accept=".xlsx,.csv,.txt,.tsv" data-t2file="${k}" hidden></label>`,
    `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.xlsx">양식 받기 (.xlsx)</button>`, `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.csv">양식 받기 (.csv)</button>`,
    k==='track' ? `<button type="button" data-t2act="ex" data-t2k="track">예시 코스로</button>` : '',
    k==='mt' ? `<button type="button" data-t2act="ex" data-t2k="mt">예시 곡선으로</button>` : '', k==='eM' ? `<button type="button" data-t2act="ex" data-t2k="eM">예시 효율 맵으로</button>` : '',
    `<button type="button" data-t2act="clear" data-t2k="${k}">${k==='track' ? '비우기 (내 코스 없음)' : '비우기 (왼쪽 상수 칸 사용)'}</button>`].filter(Boolean);
  return `<div class="t2-menu"><button type="button" class="btn small" data-t2menu="${k}" aria-expanded="${T2.menu===k}"${on ? '' : ' disabled title="공식 코스는 고칠 수 없습니다"'}>${label} ▾</button>${T2.menu===k && on ? `<div class="t2-mn" role="menu">${items.join('')}</div>` : ''}</div>`; }

/* ---------- 붙여넣기 창 (넣으면 표를 덮어씀) */
function t2PasteHTML(){ const k = T2.paste; if(!k) return '';
  const ph = k==='track' ? T2TRACK_PH : k==='mt' ? T2MOTOR_PH : k==='tire' ? T2TIRE_PH : T2EFF_PH, nm = k==='track' ? '내 코스 구간' : T2ET[k];
  return `<div class="t2-pm" role="dialog" aria-label="${nm} 붙여넣기"><div class="t2-pmb"><h4>${nm} 붙여넣기</h4>
      <textarea id="t2pta" spellcheck="false" rows="12" placeholder="${wbEsc(ph)}"></textarea>
      <p class="muted">[넣기]를 누르면 지금 표를 덮어씁니다.</p>
      <div class="t2-btns"><button type="button" class="btn small primary" data-t2pok>넣기</button><button type="button" class="btn small" data-t2px>닫기</button></div></div></div>`; }

/* ============================================================ 맵 편집: 코스 */
const T2INFO = {
  free: () => '랩 수가 2 이상이거나 출발 위치가 0이 아니면 끝을 처음에 이어 붙인 닫힌 코스로 계산합니다. 1번째 랩은 정지 출발, 2번째부터 앞 랩 끝 속도를 이어받습니다.',
  ax:   () => '공식 내구 코스를 거꾸로 한 바퀴, 정지 출발.',
  end:  () => `FSK 2026 공식 코스 × ${FSK26.laps}랩 = ${wbFmt(FSK26.len*FSK26.laps/1000, 2)} km. 드라이버당 ${FSK26.stint}랩, 각 드라이버 정지 출발(1 · ${FSK26.stint + 1}번째 랩), 교체 시간 제외. 랩마다 SOC가 줄고 모터 온도가 오릅니다.`,
  acc:  () => '직선 75 m, 정지 출발.',
  skid: () => '8자 코스 (두 원 중심 거리 18.25 m, 안쪽 지름 15.25 m, 차로 폭 3 m), 주행 반경 9.125 m. 기록 = 오른쪽 한 바퀴 + 왼쪽 한 바퀴 (일정 반경이라 정상 선회 속도로 계산).' };
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
function t2CourseEdit(){ const c = T2.course, own = c==='free', rows = t2CourseRows(c);
  return `<div class="t2-set">${t2Seg('data-t2course', c, T2COURSES.map(k => [k, T2CN[k]]))}
      <label>랩 수 <input type="number" min="1" step="1" data-t2o="laps" value="${t2LapsOf(c)}"${own ? '' : ' disabled'}></label>
      <label>출발 위치 <input type="number" min="0" step="any" data-t2o="s0" value="${own ? T2.free.s0 : 0}"${own ? '' : ' disabled'}> m</label>
      <span class="t2-sum" id="t2sum">${t2SumText(rows)}</span></div>
    <p class="t2-rule muted">${own ? '' : '<b>공식 코스 · 보기만 (고칠 수 없음).</b> '}${T2INFO[c]()}</p>
    ${t2Pair(t2MenuHTML('track', '코스 입력하기', own), `<div class="t2-tw${own ? '' : ' ro'}" id="t2tt">${t2TrackTable(rows, own)}</div>`,
      '<span class="muted">그림을 누르면 표에서 그 구간으로 갑니다</span>', `<div class="t2-fbox" id="t2emap">${t2MapSVG(true)}</div>`,
      '<span class="t2-mleg"><i class="sl"></i>출발 (주행 방향 오른쪽) <i class="fin"></i>결승 (왼쪽) <i class="arr">→</i>주행 방향</span>')}`; }
/* 맵 편집 한 줄: 왼쪽 [위 줄 + 표 상자], 오른쪽 [위 줄 + 그림 상자 + 아래 글]. 두 상자는 같은 높이 */
const t2Pair = (lt, lbox, rt, rbox, rcap) => `<div class="t2-tr"><div class="t2-col"><div class="t2-top">${lt}</div>${lbox}</div><div class="t2-col"><div class="t2-top">${rt}</div>${rbox}${rcap ? `<div class="t2-fcap muted">${rcap}</div>` : ''}</div></div>`;
function t2SumText(rows){ if(!rows.length) return '<span class="wb-err">구간 없음</span>';
  return `한 바퀴 <b>${wbFmt(t2Sum(rows.map(r => r.l)), 1)}</b> m · 구간 ${rows.length}개`; }
/* 구간 표. own = 내 코스 (칸을 눌러 고침 · × 지우기 · + 구간) */
function t2TrackTable(rows, own){ const ed = (i, k, v, cls) => own ? `<td class="t2-e${cls ? ' ' + cls : ''}" data-t2e="${i},${k}" tabindex="0">${v}</td>` : `<td${cls ? ` class="${cls}"` : ''}>${v}</td>`;
  const body = rows.map((r, i) => `<tr>${ed(i, 'no', i + 1, 'muted')}${ed(i, 'type', r.R ? (r.R > 0 ? '왼쪽' : '오른쪽') : '직선')}${ed(i, 'l', wbFmt(r.l, 2), 'n')}${ed(i, 'R', r.R ? wbFmt(Math.abs(r.R), 2) : '', 'n')}${ed(i, 'ang', r.R ? wbFmt(r.l/Math.abs(r.R)*180/Math.PI, 1) : '', 'n')}${ed(i, 'note', wbEsc(r.note || ''), 'muted')}${own ? `<td><button type="button" class="t2-x" data-t2del="${i}" aria-label="${i + 1}번 구간 지우기">×</button></td>` : ''}</tr>`).join('');
  return `<table class="t2-tt"><thead><tr><th>#</th><th>종류</th><th>길이 m</th><th>반경 m</th><th>각도 °</th><th>메모</th>${own ? '<th></th>' : ''}</tr></thead>
    <tbody>${body || `<tr><td colspan="7" class="muted">구간이 없습니다. [+ 구간] 또는 [코스 입력하기]로 넣으십시오. 비워 두면 내 코스는 계산하지 않습니다.</td></tr>`}</tbody></table>
    ${own ? '<div class="t2-adds"><button type="button" class="btn small" data-t2add>+ 구간</button></div>' : ''}`; }
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
  if(k==='type' && !td.dataset.t2g){ f = document.createElement('select'); ['직선', '왼쪽', '오른쪽'].forEach(o => { const op = document.createElement('option'); op.textContent = o; if(o===now) op.selected = true; f.appendChild(op); }); }
  else { f = document.createElement('input'); f.type = k==='note' || td.dataset.t2g ? 'text' : 'number'; f.step = 'any'; f.value = k==='note' || td.dataset.t2g ? now : String(now).replace(/,/g, ''); }
  f.className = 't2-ci'; td.textContent = ''; td.appendChild(f); f.focus(); if(f.select) f.select(); let done = false;
  const commit = ok => { if(done) return; done = true; if(ok && f.value!==now) (td.dataset.t2g ? t2GridEdit : t2Edit)(+i, td.dataset.t2g ? +k : k, f.value); else t2Repaint(); };
  f.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); commit(true); } else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); commit(false); } });
  f.addEventListener('blur', () => commit(true)); if(f.tagName==='SELECT') f.addEventListener('change', () => commit(true)); }

/* ============================================================ 맵 편집: 모터 토크 곡선 · 효율 맵 · 타이어 하중 감도 */
const t2Grid = txt => t2Lines(txt).filter(l => l.cells.length).map(l => l.cells);
const t2GridText = g => g.map(r => r.join(', ')).join('\n');
const t2MtText = k => k==='mt' ? T2.mtext : T2[k];
function t2MtSet(k, txt){ if(k==='mt') T2.mtext = txt; else T2[k] = txt; t2Repaint(); t2Soon(); wbPaint(['in']); }
function t2GridEdit(r, c, v){ const k = T2.etab, g = t2Grid(t2MtText(k)); if(!g[r]) return; g[r][c] = String(v).trim(); t2MtSet(k, t2GridText(g)); }
const T2ERULE = {
  mt:   '1열 회전수 rpm · 2열 최대 토크 · 3열 연속 토크 N·m. 왼쪽 [모터 표 기준 전압]에서 잰 곡선을 축전지 단자 전압과 유도 전압 비로 늘이고 줄입니다. 연속 토크는 디레이팅 하한입니다. 비면 [모터 최대 토크] 일정.',
  eM:   '첫 줄 = 회전수 rpm, 첫 열 = 토크 N·m, 칸 = 효율 %. 숫자 하나면 상수. 비우면 왼쪽 [모터 효율] 상수 칸. 모터 손실(열)은 이 효율로 계산합니다.',
  eI:   '첫 줄 = 회전수 rpm, 첫 열 = 토크 N·m, 칸 = 효율 %. 숫자 하나면 상수. 비우면 왼쪽 [인버터 효율] 상수 칸. 모터 × 인버터 효율을 곱해 쓰므로, 합친 맵을 모터에 넣고 인버터를 100 으로 둬도 같습니다.',
  tire: '한 줄에 바퀴 하나 수직 하중 N · 그때 μ (사이는 직선 보간, 범위 밖은 끝값). 숫자 하나면 하중과 상관없는 μ. 비우면 왼쪽 [타이어 마찰계수] · [μ 하중 감도].' };
function t2MapEdit(k){ const txt = t2MtText(k), empty = !t2Grid(txt).length;
  const msg = k==='mt' ? t2MotorMsg(t2MotorParse(txt)) : k==='tire' ? (t2TireParse(txt).msg || '비어 있음') : (t2EffParse(txt).msg || '비어 있음');
  return `<div class="t2-set"><span class="t2-sum" id="t2msum">${msg}</span></div><p class="t2-rule muted">${T2ERULE[k]}</p>
    ${t2Pair(t2MenuHTML(k, '입력하기', true), `<div class="t2-tw" id="t2tt">${t2GridTable(k, txt)}</div>`,
      empty ? `<span class="t2-const">표가 비어 있어 왼쪽 입력 상수를 씁니다 · ${t2ConstNote(k)}</span>` : '<span class="muted">그림을 누르면 표에서 그 칸으로 갑니다</span>',
      `<div class="t2-fbox" id="t2mc">${t2EditPlot(k)}</div>`, t2EditCap(k))}`; }
/* 표가 비었을 때 쓰는 상수 */
function t2ConstNote(k){ const I = WB.I;
  return k==='mt' ? `모터 최대 토크 ${wbFmt(I.tmax, 0)} N·m 일정` : k==='eM' ? `모터 효율 ${wbFmt(I.eta_mot, 1)} %` : k==='eI' ? `인버터 효율 ${wbFmt(I.eta_inv, 1)} %` : `μ ${wbFmt(I.mu, 2)} · 하중 감도 ${wbFmt(I.mu_s, 3)} 1/kN`; }
function t2MotorMsg(M){ return M.pts.length ? `${M.pts.length}점 · ${wbFmt(M.pts[0][0], 0)} ~ ${wbFmt(M.pts[M.pts.length-1][0], 0)} rpm · 최대 ${wbFmt(Math.max(...M.pts.map(p => p[1])), 1)} N·m${M.ptsC.length ? ` · 연속 ${wbFmt(Math.max(...M.ptsC.map(p => p[1])), 1)} N·m` : ' · 연속 토크 없음'}` : '비어 있음 → 왼쪽 [모터 최대 토크] 일정'; }
/* 칸 표: 토크 곡선 · 타이어는 줄 추가 · 지우기, 효율 맵은 칸만 고침 (행 · 열을 바꾸려면 [입력하기]) */
function t2GridTable(k, txt){ const g = t2Grid(txt), map = k==='eM' || k==='eI';
  const adds = `<div class="t2-adds">${map ? '<button type="button" class="btn small" data-t2gadd="row">+ 행 (토크)</button><button type="button" class="btn small" data-t2gadd="col">+ 열 (회전수)</button>' : '<button type="button" class="btn small" data-t2gadd="row">+ 줄</button>'}</div>`;
  if(!g.length) return `<p class="muted t2-empty">비어 있습니다. 아래 [${map ? '+ 행' : '+ 줄'}]로 바로 만들거나 [입력하기]로 붙여 넣기 · 파일 가져오기.</p>` + adds;
  const head = !isFinite(parseFloat(g[0][0])) || (map && g.length > 1), rows = head ? g.slice(1) : g, off = head ? 1 : 0, nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  const cell = (r, c, v, th) => `<${th ? 'th' : 'td'} class="t2-e${c===0 && map && !th ? ' t2-rh' : ''}" data-t2e="${r},${c}" data-t2g="1" tabindex="0">${wbEsc(v ?? '')}</${th ? 'th' : 'td'}>`;
  return `<table class="t2-tt t2-gtab${map ? ' map' : ''}">${head ? `<thead><tr>${Array.from({length:nc}, (_, c) => cell(0, c, g[0][c], true)).join('')}${map ? '' : '<th></th>'}</tr></thead>` : ''}
    <tbody>${rows.map((r, i) => `<tr data-t2row="${i + off}">${Array.from({length:nc}, (_, c) => cell(i + off, c, r[c])).join('')}${map ? '' : `<td><button type="button" class="t2-x" data-t2gdel="${i + off}" aria-label="${i + 1}번 줄 지우기">×</button></td>`}</tr>`).join('')}</tbody></table>` + adds; }
/* 빈 표에 [+ 줄 · 행 · 열]: 머리줄부터 만듦 */
const T2HEAD = {mt:['회전수 rpm', '최대 토크 N·m', '연속 토크 N·m'], tire:['하중 N', 'μ'], eM:['토크 N·m \\ 회전수 rpm', '0'], eI:['토크 N·m \\ 회전수 rpm', '0']};
function t2GridAdd(k, what){ const g = t2Grid(t2MtText(k)); if(!g.length) g.push(T2HEAD[k].slice());
  const nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  if(what==='col'){ g.forEach((r, i) => { while(r.length < nc) r.push(''); r.push(i ? '' : ''); }); }
  else g.push(Array.from({length:nc}, () => ''));
  t2MtSet(k, t2GridText(g)); const tw = $('#t2tt'); if(tw){ if(what==='col') tw.scrollLeft = tw.scrollWidth; else tw.scrollTop = tw.scrollHeight; } }
/* 오른쪽 그림 */
function t2EditPlot(k){ const R = WB.id==='2' ? WB.R : null, I = WB.I;
  if(k==='tire'){ const M = t2TireParse(T2.tire).map, Z = Array.from({length:61}, (_, i) => i*50), mu = Z.map(z => M ? tab1j(M, z) : Math.max(0, I.mu - I.mu_s*z/1000));
    return wbPlot({id:'t2tire', w:560, h:330, hit:'t2-pick', x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:'', dd:2}, {k:'fy', d:Z.map((z, i) => mu[i]*z), c:WB_COL[2], n:'낼 수 있는 힘 μ·Fz', u:'N', dd:0}], label:'타이어 하중 감도'}); }
  if(k==='eM' || k==='eI'){ const E = t2EffParse(t2MtText(k)); if(!E.map || t2Grid(t2MtText(k)).length < 2) return `<div class="t2-fconst">${E.map ? E.msg : `${k==='eM' ? '모터' : '인버터'} 효율 ${wbFmt(I[k==='eM' ? 'eta_mot' : 'eta_inv'], 1)} %`}<br><span class="muted">회전수 · 토크와 상관없이 일정</span></div>`;
    return t2Heat(E.map); }
  if(!R || !R.motor) return '<p class="wb-empty">계산 중…</p>'; const M = R.motor, kw = T => M.n.map((n, i) => T[i]*n*2*Math.PI/60/1000);
  return wbPlot({id:'t2m', w:560, h:330, hit:'t2-pick', x:{d:M.n, n:'모터 회전수', u:'rpm'}, ys:[{k:'a', d:M.tref, c:'#9aa0ab', n:'표 그대로', u:'N·m', dd:0}, {k:'b', d:M.tnom, c:WB_COL[0], n:'축전지 공칭', u:'N·m', dd:0}, {k:'c', d:M.tload, c:WB_COL[3], n:'최대 전류 때', u:'N·m', dd:0},
    {k:'pb', d:kw(M.tnom), c:WB_COL[5], n:'출력 (공칭)', u:'kW', dd:1}, {k:'pc', d:kw(M.tload), c:WB_COL[4], n:'출력 (최대 전류 때)', u:'kW', dd:1}], yn:{'N·m':'모터 최대 토크', 'kW':'모터 출력'}, label:'모터 토크 · 출력 곡선'}); }
/* 그림 아래 글 */
function t2EditCap(k){ const R = WB.id==='2' ? WB.R : null, I = WB.I;
  if(k==='mt') return R && R.out ? `<span><i style="background:#9aa0ab"></i>표 그대로 (팀 모터로 ${wbFmt(I.v_ref*(I.ke_ratio || 1), 0)} V 상당)</span> <span><i style="background:${WB_COL[0]}"></i>축전지 공칭 ${wbFmt(I.n_s*I.c_vnom, 0)} V</span> <span><i style="background:${WB_COL[3]}"></i>최대 전류(${wbFmt(I.i_bms_max, 0)} A) 때 단자 전압 ${wbFmt(R.out.v_load, 0)} V</span> <span>실선 토크 · 분홍 · 갈색 출력</span>` : '';
  if(k==='tire') return `정지 때 바퀴 하나 평균 하중 약 ${wbFmt(I.m*9.81/4, 0)} N. μ·Fz 가 꺾여 내려가면 하중을 더 실어도 그 바퀴 힘이 늘지 않습니다.`;
  const E = t2EffParse(t2MtText(k)); return E.map && t2Grid(t2MtText(k)).length >= 2 ? t2HeatCap(E.map) : ''; }
const tab1j = (t, x) => { if(x <= t[0][0]) return t[0][1]; for(let i = 1; i < t.length; i++) if(x <= t[i][0]){ const a = t[i-1], b = t[i]; return a[1] + (b[1] - a[1])*(x - a[0])/((b[0] - a[0]) || 1); } return t[t.length-1][1]; };
/* 효율 맵 색 지도 (확인용) */
function t2Heat(M){ const W = 560, H = 330, L = 50, B = 34, T = 8, R = 8, pw = W - L - R, ph = H - T - B, n0 = M.n[0], n1 = M.n[M.n.length-1], t0 = M.t[0], t1 = M.t[M.t.length-1];
  const all = M.e.flat(), lo = Math.min(...all), hi = Math.max(...all); let s = `<svg viewBox="0 0 ${W} ${H}" class="t2-heat" role="img" aria-label="효율 맵">`;
  for(let i = 0; i < M.t.length; i++) for(let j = 0; j < M.n.length; j++){ const x0 = L + ((j ? (M.n[j-1] + M.n[j])/2 : n0) - n0)/(n1 - n0)*pw, x1 = L + ((j < M.n.length-1 ? (M.n[j] + M.n[j+1])/2 : n1) - n0)/(n1 - n0)*pw;
    const y1 = T + ph - ((i ? (M.t[i-1] + M.t[i])/2 : t0) - t0)/(t1 - t0)*ph, y0 = T + ph - ((i < M.t.length-1 ? (M.t[i] + M.t[i+1])/2 : t1) - t0)/(t1 - t0)*ph, f = hi > lo ? (M.e[i][j] - lo)/(hi - lo) : .5;
    s += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0 + .5).toFixed(1)}" height="${(y1 - y0 + .5).toFixed(1)}" fill="hsl(${(230 - 230*f).toFixed(0)} 70% ${(55 - 10*f).toFixed(0)}%)" data-ij="${i},${j}"><title>${wbFmt(M.n[j], 0)} rpm · ${wbFmt(M.t[i], 0)} N·m · ${wbFmt(M.e[i][j], 1)} %</title></rect>`; }
  s += `<text x="${L + pw/2}" y="${H - 4}" class="wb-tl" text-anchor="middle">모터 회전수 [rpm] · ${wbFmt(n0, 0)} ~ ${wbFmt(n1, 0)}</text><text x="12" y="${T + ph/2}" class="wb-tl" text-anchor="middle" transform="rotate(-90 12 ${T + ph/2})">토크 [N·m]</text>`;
  return s + `</svg>`; }
const t2HeatCap = M => { const all = M.e.flat(); return `파랑 ${wbFmt(Math.min(...all), 1)} % → 빨강 ${wbFmt(Math.max(...all), 1)} % · 칸에 마우스를 올리면 값, 누르면 표의 그 칸`; };

/* ============================================================ 시뮬레이션: 결과 아래 [구동력 선도 | 코스 지도] */
function t2MidHTML(){ if(T2.tab!=='sim') return '';
  return `<div class="t2-mid">
      <section class="wb-sec t2-ftw" aria-label="구동력 선도"><div class="wb-h"><h3>구동력 선도</h3><span class="wb-meta">코스 커서 지점의 선도 (커서를 멈추고 0.4초 뒤 다시 계산) · 보기만</span></div>
        <div class="t2-fbox t2-ftbox"><div id="t2ft">${T2.pf.html || '<p class="wb-empty">계산 중…</p>'}</div><div class="t2-ftov" id="t2ftov" hidden></div></div><div id="t2ftv" class="t2-ftv">${T2.pf.note || ''}</div></section>
      <section class="wb-sec t2-mapw" aria-label="코스 지도"><div class="wb-h"><h3>코스 지도</h3><span class="wb-meta">휠 = 확대 · 끌기 = 이동 · 누르기 = 그 위치로 커서</span>
          <span class="t2-zb"><button type="button" class="btn small" data-t2z="in" aria-label="확대">+</button><button type="button" class="btn small" data-t2z="out" aria-label="축소">−</button><button type="button" class="btn small" data-t2z="fit">맞춤</button></span></div>
        <div class="t2-fbox" id="t2map">${t2MapSVG(false)}</div><div class="t2-ftv muted" id="t2mcap"></div></section></div>`; }

/* ---------- 구동력 선도 프로브: 커서가 멈추면 그 점의 상태로 선도를 다시 계산 (계산은 별도 Worker) */
T2.pf = { html:'', note:'', timer:0, busy:false, want:null, w:null, src:'' };
function t2PfOverlay(t){ const o = $('#t2ftov'); if(!o) return; o.hidden = !t; o.textContent = t || ''; }
function t2PfSoon(){ clearTimeout(T2.pf.timer); if(T2.tab!=='sim') return; t2PfOverlay('프로브 이동 중…'); T2.pf.timer = setTimeout(t2PfRun, 400); }
function t2PfRun(){ const R = WB.R, S = R && R.sig; if(!S || !S.v || !S.voc){ t2PfOverlay(''); return; }
  const i = Math.max(0, Math.min(S.v.length - 1, WB.xi || 0)), g = 9.81;
  const st = {i, v:S.v[i], gr:R.out.c_gr, V:S.voc[i], Tm:S.tmot[i], ay:S.ay[i]*g, ax:S.ax[i]*g, axg:S.ax[i], tq:S.tq[i], tlim:S.tlim[i]};
  T2.pf.want = st; if(T2.pf.busy) return; t2PfOverlay('계산 중…');
  const code = wbCode(); if(!T2.pf.w || T2.pf.src!==code){ if(T2.pf.w) T2.pf.w.terminate(); T2.pf.src = code;
    T2.pf.w = new Worker(URL.createObjectURL(new Blob([code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false, e:String(err)}); } };'], {type:'text/javascript'}))); }
  T2.pf.busy = true; const ask = T2.pf.want;
  T2.pf.w.onmessage = e => { T2.pf.busy = false; if(e.data.ok) t2PfDraw(ask, e.data.r.ft); if(T2.pf.want!==ask) t2PfRun(); else t2PfOverlay(''); };
  T2.pf.w.postMessage({...wbInputs(), _probe:{gr:st.gr, V:st.V, Tm:st.Tm, ay:st.ay, ax:st.ax}}); }
function t2PfDraw(st, F){ let xi = 0; F.v.forEach((v, j) => { if(Math.abs(v - st.v) < Math.abs(F.v[xi] - st.v)) xi = j; });
  const fm = F.f_m[xi], fx = F.f_x[xi], fr = F.f_res[xi], fb = F.f_b[xi], net = Math.min(fm, fx) - fr, need = F.fy_need[xi], cap = F.fy_cap[xi];
  const lim = fm <= fx ? (F.f_mt[xi] <= F.f_mp[xi] + 1 ? '모터 토크 곡선' : '단자 출력 상한') : '뒤축 접지';
  T2.pf.html = wbPlot({id:'t2pft', w:560, h:330, hit:false, x:{d:F.v, n:'차속', u:'km/h'}, xi, ys:[
      {k:'f_mt', d:F.f_mt, c:WB_COL[0], n:'모터 토크 곡선 한계', u:'N', dd:0}, {k:'f_mp', d:F.f_mp, c:WB_COL[5], n:'단자 출력 상한', u:'N', dd:0},
      {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_b', d:F.f_b, c:WB_COL[1], n:'제동 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}],
    yn:{'N':'바퀴 힘'}, label:'구동력 선도 (코스 커서 지점)'});
  T2.pf.note = `<div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 토크 곡선 한계 (디레이팅 포함)</span><span><i style="background:${WB_COL[5]}"></i>단자 출력 상한 (규정 · 전류 · 에너지) × 효율</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계</span><span><i style="background:${WB_COL[1]}"></i>제동 접지 한계 (−)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항</span></div>
    <p class="t2-cap">커서 ${wbFmt(WB.R.x.d[st.i], 1)} m · <b>${wbFmt(st.v, 1)} km/h</b>(세로선) · 개방 전압 ${wbFmt(st.V, 1)} V · 모터 ${wbFmt(st.Tm, 1)} °C · 횡가속도 ${wbFmt(st.ay/9.81, 2)} g · 감속비 ${wbFmt(st.gr, 2)}<br>
      구동 min(모터 ${wbFmt(fm, 0)}, 뒤축 ${wbFmt(fx, 0)}) − 저항 ${wbFmt(fr, 0)} = <b>${wbFmt(net, 0)} N</b> (${lim}이 정함) → 가속 여유 ${wbFmt(net/F.meff/9.81, 2)} g · 제동 한계 ${wbFmt(fb, 0)} N<br>
      앞축 횡력 필요 ${wbFmt(need, 0)} N / 낼 수 있는 힘 ${wbFmt(cap, 0)} N${need > cap ? ' <span class="t2-dt bad">앞축 한계 → 가속을 줄임</span>' : ''} · 실제 종가속도 <b>${wbFmt(st.axg, 2)} g</b>${st.axg < -0.02 ? ' (제동 중)' : ''}</p>`;
  const b = $('#t2ft'); if(b) b.innerHTML = T2.pf.html; const n = $('#t2ftv'); if(n) n.innerHTML = T2.pf.note; }

/* ============================================================ 코스 지도 (확대 · 이동 · 프로브) */
function t2Pts(segs, ds, x, y, h){ const X = [x], Y = [y];
  segs.forEach(([l, R]) => { const n = Math.max(1, Math.ceil(l/ds - 1e-9)), st = l/n;
    for(let i = 0; i < n; i++){ if(!R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/R; x += R*(Math.sin(h + dh) - Math.sin(h)); y -= R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } X.push(x); Y.push(y); } });
  return {X, Y, h}; }
function t2Rot(segs, s0){ const len = t2Sum(segs.map(r => r[0])); s0 = ((s0 % len) + len) % len; if(s0 < 1e-9) return segs.slice();
  let c = 0; for(let i = 0; i < segs.length; i++){ const [l, R] = segs[i]; if(s0 < c + l - 1e-9){ const a = s0 - c, head = a > 1e-9 ? [[a, R]] : []; return [[l - a, R], ...segs.slice(i + 1), ...segs.slice(0, i), ...head]; } c += l; } return segs.slice(); }
function t2FreeXY(){ const segs = t2Track(T2.free.text).segs; if(!segs.length) return null; const closed = t2Closed(), s0 = closed ? T2.free.s0 % Math.max(1e-9, t2Sum(segs.map(r => r[0]))) : 0;
  let x = 0, y = 0, h = 0, c = 0; for(const [l, R] of segs){ if(c + l >= s0 - 1e-9){ const P = t2Pts([[s0 - c, R]], 1e9, x, y, h); x = P.X[1] ?? x; y = P.Y[1] ?? y; h = P.h; break; } const P = t2Pts([[l, R]], 1e9, x, y, h); x = P.X[1]; y = P.Y[1]; h = P.h; c += l; }
  return t2Pts(closed ? t2Rot(segs, s0) : segs, 0.5, x, y, h); }
/* 코스 점 (지도 좌표) · 계산 칸과의 대응. plain = 맵 편집 (색 없음 · 확대 없음) */
function t2Geo(){ const c = T2.course; let G, close = false, rev = false, extra = [];
  if(c==='ax' || c==='end'){ G = {X:[...FSK26.X, FSK26.X[0]], Y:[...FSK26.Y, FSK26.Y[0]]}; close = true; rev = c==='ax'; }
  else if(c==='free'){ G = t2FreeXY(); close = t2Closed(); }
  else if(c==='acc') G = t2Pts([[75, 0]], 0.5, 0, 0, 0);
  else { const SR = 9.125, C2 = 2*Math.PI*SR; G = t2Pts([[15, 0], [C2, -SR], [C2, -SR], [C2, SR], [C2, SR], [15, 0]], 0.5, 0, -15, Math.PI/2); [[SR, 0], [-SR, 0]].forEach(([cx, cy]) => [7.625, 10.625].forEach(rr => extra.push([cx, cy, rr]))); }
  return G && {...G, close, rev, extra}; }
const T2MW = 440, T2MH = 330;
/* 가운데 선 점 → 옆으로 e 만큼 (코스 원래 방향의 왼쪽 +). rl = {s: 가운데 선 거리 [m], e: 옆 거리 [m]} (계산 결과) */
function t2Offset(X, Y, rl){ const n = X.length, S = [0]; for(let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]));
  const f = rl.s.at(-1) / (S[n - 1] || 1), eAt = s => { const a = rl.s; let lo = 0, hi = a.length - 1; if(s <= a[0]) return rl.e[0]; if(s >= a[hi]) return rl.e[hi];
    while(hi - lo > 1){ const m = (lo + hi) >> 1; if(a[m] <= s) lo = m; else hi = m; } const t = (s - a[lo]) / ((a[hi] - a[lo]) || 1); return rl.e[lo] + t*(rl.e[hi] - rl.e[lo]); };
  const OX = [], OY = [];
  for(let i = 0; i < n; i++){ const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = X[b] - X[a], dy = Y[b] - Y[a], d = Math.hypot(dx, dy) || 1, e = eAt(S[i]*f);
    OX.push(X[i] - dy/d*e); OY.push(Y[i] + dx/d*e); }   // 왼쪽 법선 = (−ty, tx)
  return {X:OX, Y:OY}; }
function t2MapSVG(plain){ const c = T2.course, R = WB.id==='2' && !plain ? WB.R : null, mp = R && R.map, G = t2Geo(); if(!G) return '<p class="muted">구간이 없습니다.</p>';
  const {X:xc, Y:yc, close, rev} = G, N = xc.length, pad = 22, W = T2MW, H = T2MH;
  const RLp = mp && mp.rl ? t2Offset(xc, yc, mp.rl) : null, xs = RLp ? RLp.X : xc, ys = RLp ? RLp.Y : yc;   // 주행선이 있으면 그 선을 칠함 (가운데 선은 점선)
  const x0 = Math.min(...xc) - (c==='skid' ? 3 : 0), x1 = Math.max(...xc) + (c==='skid' ? 3 : 0), y0 = Math.min(...yc), y1 = Math.max(...yc);
  const s = Math.min((W - 2*pad)/Math.max(1, x1 - x0), (H - 2*pad)/Math.max(1, y1 - y0)), ox = (W - (x1 - x0)*s)/2, oy = (H - (y1 - y0)*s)/2;
  const tx = x => ox + (x - x0)*s, ty = y => H - oy - (y - y0)*s, Pt = i => [tx(xs[i]), ty(ys[i])];
  T2[plain ? 'mpE' : 'mp'] = {N, pts:xs.map((_, i) => Pt(i))};   // 누르기 → 가장 가까운 점
  const Z = plain ? {k:1, cx:.5, cy:.5} : T2.zoom, vw = W/Z.k, vh = H/Z.k, vx = Z.cx*W - vw/2, vy = Z.cy*H - vh/2, sz = 1/Z.k;   // 확대 = viewBox 를 줄임 (선 굵기는 그대로)
  let svg = `<svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" class="t2-msvg${plain ? '' : ' live'}" role="img" aria-label="${T2CN[c]} 코스 지도">`;
  G.extra.forEach(([cx, cy, rr]) => { svg += `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="${(rr*s).toFixed(1)}" class="t2-sk" vector-effect="non-scaling-stroke"/>`; });
  if((c==='ax' || c==='end') && FSK26.cones) FSK26.cones.forEach(([cx, cy, sd]) => { svg += `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="${(1.6*Math.max(sz, .35)).toFixed(2)}" class="t2-cone ${sd}"/>`; });
  if(RLp) svg += `<polyline points="${xc.map((_, i) => [tx(xc[i]), ty(yc[i])].map(v => v.toFixed(1)).join(',')).join(' ')}" class="t2-cl" vector-effect="non-scaling-stroke"/>`;
  let vc = null, P = 0; if(mp){ vc = mp.vc || (mp.acc || mp.skid ? R.sig.v : null); P = mp.P || 0; }
  const leg = '<span class="t2-mleg"><i class="sl"></i>출발 <i class="fin"></i>결승 <i class="arr">→</i>주행 방향</span>'; let cap = '';
  if(vc){ const lo = isFinite(mp.lo) ? mp.lo : Math.min(...vc.filter(isFinite)), hi = isFinite(mp.hi) ? mp.hi : Math.max(...vc.filter(isFinite)), st = Math.max(1, Math.floor(N/900));
    for(let i = 0; i + st < N; i += st){ const kk = rev ? N - 1 - i : i, k = vc.length===N ? kk : Math.min(vc.length - 1, Math.round(kk*(vc.length - 1)/(N - 1))), vi = vc[k], f = hi > lo && isFinite(vi) ? Math.max(0, Math.min(1, (vi - lo)/(hi - lo))) : .5, a = Pt(i), b = Pt(Math.min(N - 1, i + st));
      svg += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="hsl(${(230 - 230*f).toFixed(0)} 75% 45%)" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`; }
    const lp = T2.lap[c], multi = t2LapsOf(c) > 1; cap = `느림 ${wbFmt(lo, 0)} km/h <i class="t2-grad"></i> 빠름 ${wbFmt(hi, 0)} km/h${multi ? ` (모든 랩 통틀어) · ${lp==='all' ? '2번째' : lp + '번째'} 랩` : ''} · 작은 점 = 커서 ${leg}`; }
  else { svg += `<polyline points="${xs.map((_, i) => Pt(i).map(v => v.toFixed(1)).join(',')).join(' ')}" class="t2-line" vector-effect="non-scaling-stroke"/>`; cap = (plain || R ? '' : '계산이 끝나면 차속 색으로 칠합니다. ') + leg; }
  if(!plain) setTimeout(() => { const cp = $('#t2mcap'); if(cp) cp.innerHTML = cap; }, 0);
  /* 출발선(초록) = 주행 방향 오른쪽 절반, 결승선(빨강) = 왼쪽 절반 → 같은 자리여도 겹치지 않음. 화살표는 출발선 끝에서 코스와 나란히 */
  const ix = i => close ? ((Math.round(i) % (N - 1)) + (N - 1)) % (N - 1) : Math.max(0, Math.min(N - 1, Math.round(i)));
  const q = 10*Math.max(sz, .3), i0 = rev ? N - 1 : 0, dir = rev ? -1 : 1, step = Math.max(2, Math.round(N/150));
  const dirAt = i => { const a = Pt(ix(i)), b = Pt(ix(i + dir*step)), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return {a, ux:dx/d, uy:dy/d, rx:-dy/d, ry:dx/d}; };   // 화면 좌표(y 아래)에서 오른쪽 = (−uy, ux)
  const half = (i, cls, side) => { const D = dirAt(i); return `<line x1="${D.a[0].toFixed(1)}" y1="${D.a[1].toFixed(1)}" x2="${(D.a[0] + side*D.rx*q).toFixed(1)}" y2="${(D.a[1] + side*D.ry*q).toFixed(1)}" class="${cls}" vector-effect="non-scaling-stroke"/>`; };
  const iS = c==='skid' ? Math.round(15/0.5) : i0, iF = c==='skid' ? Math.round(15/0.5) : close ? i0 : (rev ? 0 : N - 1);
  svg += half(iS, 't2-sl', 1) + half(iF, 't2-fin', -1);
  { const D = dirAt(iS), ox = D.a[0] + D.rx*q, oy = D.a[1] + D.ry*q, L = 2.2*q, ex = ox + D.ux*L, ey = oy + D.uy*L, ang = Math.atan2(D.uy, D.ux)*180/Math.PI;
    svg += `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" class="t2-arrl" vector-effect="non-scaling-stroke"/><path d="M-6,-4 L0,0 L-6,4" class="t2-arrh" vector-effect="non-scaling-stroke" transform="translate(${ex.toFixed(1)},${ey.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${Math.max(sz, .35).toFixed(2)})"/>`; }
  /* 커서: 신호 그래프의 거리 위치 (여러 랩이면 한 랩 안의 위치) */
  if(R && R.x && WB.xi != null){ const k = t2SigToMap(WB.xi, N, P), q = Pt(k); svg += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(4*Math.max(sz, .35)).toFixed(2)}" class="t2-cur" vector-effect="non-scaling-stroke"/>`; }
  return svg + '</svg>'; }
/* 신호 칸 ↔ 지도 점: 공식 코스는 지도 점(대회 JSON)과 계산 칸 수가 달라 거리 비율로 맞춤, 오토크로스는 반대 방향 */
function t2SigToMap(xi, N, P){ const c = T2.course; let k = xi;
  if(P){ k = xi % P === 0 && xi ? P : xi % P; if(c==='end' || c==='ax'){ k = Math.round(k*(N - 1)/P); if(c==='ax') k = N - 1 - k; } }
  return Math.max(0, Math.min(N - 1, k)); }
function t2MapToSig(i){ const R = WB.R, mp = R && R.map, c = T2.course; if(!R || !R.x || !T2.mp) return null; const N = T2.mp.N, P = mp && mp.P || 0, n = R.x.d.length;
  if(!P) return Math.min(n - 1, i);
  let k = c==='end' || c==='ax' ? Math.round((c==='ax' ? N - 1 - i : i)*P/(N - 1)) : i; const base = Math.floor((WB.xi || 0)/P)*P;
  return Math.max(0, Math.min(n - 1, (n - 1 > P ? base : 0) + Math.min(P, k))); }
function t2MapRepaint(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(false); }
/* 휠 확대 (커서 둘레) · 끌기 이동 · 누르기 프로브 */
function t2SvgPt(svg, e){ const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function t2ZoomAt(f, px, py){ const Z = T2.zoom, k = Math.max(1, Math.min(40, Z.k*f)); if(px != null){ const a = px/T2MW, b = py/T2MH; Z.cx = a - (a - Z.cx)*Z.k/k; Z.cy = b - (b - Z.cy)*Z.k/k; } Z.k = k;
  if(k===1){ Z.cx = .5; Z.cy = .5; } const h = .5/k; Z.cx = Math.max(h, Math.min(1 - h, Z.cx)); Z.cy = Math.max(h, Math.min(1 - h, Z.cy)); t2MapRepaint(); }
document.addEventListener('wheel', e => { const svg = e.target.closest && e.target.closest('#t2map svg'); if(!svg) return; e.preventDefault(); const p = t2SvgPt(svg, e); t2ZoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y); }, {passive:false});
let T2DRAG = null;
document.addEventListener('pointerdown', e => { const svg = e.target.closest && e.target.closest('#t2map svg'); if(!svg || e.button) return; T2DRAG = {x:e.clientX, y:e.clientY, cx:T2.zoom.cx, cy:T2.zoom.cy, w:svg.getBoundingClientRect().width, moved:false}; });
document.addEventListener('pointermove', e => { if(!T2DRAG) return; const dx = e.clientX - T2DRAG.x, dy = e.clientY - T2DRAG.y; if(!T2DRAG.moved && Math.hypot(dx, dy) < 4) return; T2DRAG.moved = true;
  const Z = T2.zoom, f = 1/(T2DRAG.w*Z.k), h = .5/Z.k; Z.cx = Math.max(h, Math.min(1 - h, T2DRAG.cx - dx*f)); Z.cy = Math.max(h, Math.min(1 - h, T2DRAG.cy - dy*f*T2MW/T2MH)); t2MapRepaint(); });
document.addEventListener('pointerup', e => { const d = T2DRAG; T2DRAG = null; if(!d || d.moved) return; const svg = document.querySelector('#t2map svg'); if(!svg || !T2.mp) return;
  const p = t2SvgPt(svg, e); let bi = 0, bd = Infinity; T2.mp.pts.forEach(([x, y], i) => { const dd = (x - p.x)**2 + (y - p.y)**2; if(dd < bd){ bd = dd; bi = i; } });
  const xi = t2MapToSig(bi); if(xi != null) wbCursor('sig', xi); });

/* ============================================================ 그림 → 표 칸 찾기 (그림에서 튀는 곳을 누르면 표의 그 칸으로) */
function t2Hl(el){ document.querySelectorAll('#t2tt .t2-hl').forEach(x => x.classList.remove('t2-hl')); if(!el) return; el.classList.add('t2-hl');
  const tw = $('#t2tt'); if(!tw) return; const a = tw.getBoundingClientRect(), b = el.getBoundingClientRect();
  tw.scrollTop += (b.top - a.top) - (a.height - b.height)/2; tw.scrollLeft += (b.left - a.left) - (a.width - b.width)/2; }
/* 코스 그림의 점 i → 표의 구간 행 (표 순서 = 달리는 순서) */
function t2PtToRow(i){ const c = T2.course, rows = t2CourseRows(c), M = T2.mpE; if(!rows.length || !M) return -1; let s;
  if(c==='end' || c==='ax'){ const fr = i/(M.N - 1), len = t2Sum(rows.map(r => r.l)); s = (c==='ax' ? 1 - fr : fr)*len; }
  else { s = i*0.5; if(c==='free' && t2Closed()){ const len = t2Sum(rows.map(r => r.l)); s = (s + T2.free.s0) % len; } }
  let a = 0; for(let r = 0; r < rows.length; r++){ a += rows[r].l; if(s < a) return r; } return rows.length - 1; }
function t2PickX(svg, e){ const hit = svg.querySelector('.t2-pick'); if(!hit) return NaN; const rc = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (e.clientX - rc.left)/rc.width*vb.width;
  return +hit.dataset.wbx0 + (px - +hit.dataset.wbl)/(+hit.dataset.wbw)*(+hit.dataset.wbx1 - +hit.dataset.wbx0); }
document.addEventListener('click', e => { const t = e.target; if(!t.closest || !t.closest('#wbext .t2-fbox')) return;
  const em = t.closest('#t2emap svg'); if(em && T2.mpE){ const p = t2SvgPt(em, e); let bi = 0, bd = Infinity; T2.mpE.pts.forEach(([x, y], i) => { const d = (x - p.x)**2 + (y - p.y)**2; if(d < bd){ bd = d; bi = i; } });
    const r = t2PtToRow(bi); if(r >= 0) t2Hl($(`#t2tt tbody tr:nth-child(${r + 1})`)); return; }
  const rc = t.closest('#t2mc rect[data-ij]'); if(rc){ const [i, j] = rc.dataset.ij.split(',').map(Number); t2Hl($(`#t2tt [data-t2e="${i + 1},${j + 1}"]`)); return; }
  const sv = t.closest('#t2mc svg'); if(sv && sv.querySelector('.t2-pick')){ const x = t2PickX(sv, e), g = t2Grid(t2MtText(T2.etab)); let best = -1;
    g.forEach((r, i) => { const v = parseFloat(r[0]); if(isFinite(v) && (best < 0 || Math.abs(v - x) < Math.abs(parseFloat(g[best][0]) - x))) best = i; });
    if(best >= 0) t2Hl($(`#t2tt tr[data-t2row="${best}"]`)); } });

/* ============================================================ 고치기 · 이벤트 */
function t2Soon(){ t2Save(); clearTimeout(T2.timer); T2.timer = setTimeout(() => { wbRefresh(); t2PartDirty(); }, 350); }
function t2Repaint(){ const tw = $('#t2tt'), st = tw ? tw.scrollTop : 0, sl = tw ? tw.scrollLeft : 0; wbPaint(['ext']); const t2 = $('#t2tt'); if(t2){ t2.scrollTop = st; t2.scrollLeft = sl; } }
function t2SetCourse(c){ T2.course = c; T2.menu = ''; T2.zoom = {k:1, cx:.5, cy:.5}; t2Save(); WB.xi = 0; wbSelReset(['v', 'pw']); WB.act = ''; if(!WB.xa.startsWith('in:')) WB.xa = ''; wbPaint(['ext']); wbRefresh(); }
/* 기준 감속비 전환: 두 모드를 미리 계산해 두었으므로 결과만 바꿔 끼움 */
function t2SetGrMode(m){ T2.grMode = m; t2Save(); const R = WB.R; if(R && R.modes){ Object.assign(R, R.modes[m]); if(R.x && WB.xi >= R.x.d.length) WB.xi = R.x.d.length - 1; wbPaint(['ext', 'out', 'sig']); t2PfSoon(); } else wbRefresh(); }
document.addEventListener('input', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2o]')){ const k = t.dataset.t2o, v = parseFloat(t.value); if(!isFinite(v) || v < 0) return; T2.free[k] = k==='laps' ? Math.max(1, Math.round(v)) : v;
    const mp = $('#t2emap'); if(mp) mp.innerHTML = t2MapSVG(true); t2Soon(); } });
document.addEventListener('change', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2file]')){ const f = t.files && t.files[0], k = t.dataset.t2file; t.value = ''; T2.menu = ''; if(f) t2Import(f, k==='mt' ? 'motor' : k); else t2Repaint(); return; }
  if(t.matches('[data-t2lap]')){ T2.lap[T2.course] = t.value; t2Save(); WB.xi = 0; t.blur(); wbRefresh(); } });
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return;
  const zb = t.closest('#wbmid [data-t2z]'); if(zb){ const z = zb.dataset.t2z; if(z==='fit'){ T2.zoom = {k:1, cx:.5, cy:.5}; t2MapRepaint(); } else t2ZoomAt(z==='in' ? 1.5 : 1/1.5); return; }
  if(!t.closest('#wbext')){ if(T2.menu && WB.id==='2'){ T2.menu = ''; t2Repaint(); } return; }
  const gm = t.closest('[data-t2gm]'); if(gm){ t2SetGrMode(gm.dataset.t2gm); return; }
  const mn = t.closest('[data-t2menu]'); if(mn){ if(mn.disabled) return; T2.menu = T2.menu===mn.dataset.t2menu ? '' : mn.dataset.t2menu; t2Repaint(); return; }
  const ac = t.closest('[data-t2act]'); if(ac){ const a = ac.dataset.t2act, k = ac.dataset.t2k; T2.menu = '';
    if(a==='paste'){ T2.paste = k; t2Repaint(); setTimeout(() => { const ta = $('#t2pta'); if(ta) ta.focus(); }, 0); return; }
    if(a==='tpl'){ const [kk, f] = ac.dataset.t2tpl.split('.'); t2Template(kk, f); t2Repaint(); return; }
    if(a==='ex'){ if(k==='track'){ T2.free.text = T2TRACK_EX; T2.free.s0 = 0; T2.free.laps = 1; } else if(k==='mt') T2.mtext = EMRAX228.torque; else T2.eM = EMRAX228.eff; }
    if(a==='clear'){ if(k==='track') T2.free.text = ''; else if(k==='mt') T2.mtext = ''; else T2[k] = ''; }
    t2Repaint(); t2Soon(); wbPaint(['in']); return; }
  if(t.closest('.t2-mi') || t.closest('.t2-mn')) return;
  if(T2.menu){ T2.menu = ''; t2Repaint(); }
  if(t.closest('[data-t2px]')){ T2.paste = ''; t2Repaint(); return; }
  if(t.closest('[data-t2pok]')){ const ta = $('#t2pta'), v = ta ? ta.value : '', k = T2.paste;
    if(k==='track'){ const P = t2Track(v); if(!P.rows.length){ toast('구간을 읽지 못했습니다. 한 줄에 종류, 길이, 반경(또는 길이, 반경) 숫자가 있어야 합니다.'); return; } T2.free.text = t2RowsText(P.rows); toast(`구간 ${P.rows.length}개를 넣었습니다${P.bad.length ? ` · ${P.bad.slice(0, 5).join(', ')}번째 줄은 숫자가 없어 건너뜀` : ''}`); }
    else if(k==='mt'){ if(!t2MotorParse(v).pts.length){ toast('회전수 · 토크 줄을 읽지 못했습니다.'); return; } T2.mtext = v; }
    else if(k==='tire'){ if(v.trim() && !t2TireParse(v).map){ toast('하중 · μ 줄을 읽지 못했습니다.'); return; } T2.tire = v; }
    else { if(v.trim() && !t2EffParse(v).map){ toast('효율을 읽지 못했습니다. 숫자 하나 또는 맵(첫 줄 회전수, 첫 열 토크)이어야 합니다.'); return; } T2[k] = v; }
    T2.paste = ''; t2Repaint(); t2Soon(); wbPaint(['in']); return; }
  const tb = t.closest('[data-t2tab]'); if(tb){ T2.tab = tb.dataset.t2tab; T2.menu = ''; t2Save(); wbPaint(['ext']); if(T2.tab==='sim'){ t2MapRepaint(); t2PfSoon(); } return; }
  const cs = t.closest('[data-t2course]'); if(cs){ t2SetCourse(cs.dataset.t2course); return; }
  const et = t.closest('[data-t2et]'); if(et){ T2.etab = et.dataset.t2et; T2.menu = ''; t2Save(); wbPaint(['ext']); return; }
  const dl = t.closest('[data-t2del]'); if(dl){ const rows = t2Track(T2.free.text).rows; rows.splice(+dl.dataset.t2del, 1); t2SetRows(rows); return; }
  if(t.closest('[data-t2add]')){ const rows = t2Track(T2.free.text).rows; rows.push({l:10, R:0, note:''}); t2SetRows(rows); const tw = $('#t2tt'); if(tw) tw.scrollTop = tw.scrollHeight; return; }
  const gd = t.closest('[data-t2gdel]'); if(gd){ const k = T2.etab, g = t2Grid(t2MtText(k)); g.splice(+gd.dataset.t2gdel, 1); t2MtSet(k, t2GridText(g)); return; }
  const ga = t.closest('[data-t2gadd]'); if(ga){ t2GridAdd(T2.etab, ga.dataset.t2gadd); return; }
  const ce = t.closest('td[data-t2e], th[data-t2e]'); if(ce){ t2CellOpen(ce); return; } });
document.addEventListener('keydown', e => { const ce = e.target.closest && e.target.closest('#wbext td[data-t2e], #wbext th[data-t2e]'); if(ce && e.key==='Enter' && !e.target.matches('input,select')){ e.preventDefault(); t2CellOpen(ce); }
  if(e.key==='Escape' && WB.id==='2' && (T2.paste || T2.menu)){ e.preventDefault(); e.stopImmediatePropagation(); T2.paste = ''; T2.menu = ''; t2Repaint(); } }, true);
/* 맵 편집에 표가 있으면 그 입력 칸은 막음 */
function t2InLock(k){ const L = '맵 편집 탭 표 사용';
  if(k==='eta_mot') return T2.eM.trim() ? L : ''; if(k==='eta_inv') return T2.eI.trim() ? L : '';
  if(k==='mu' || k==='mu_s') return t2TireParse(T2.tire).map ? L : '';
  if(k==='rl_b') return WB.I.w_car > 0 ? '차 전폭으로 계산' : ''; if(k==='rl_m') return WB.I.w_car > 0 ? '' : '전폭이 0 이면 안 씀';
  return ''; }
/* 차 전폭을 바꾸면 그 자리에서 '최소 거리' · '여유' 칸 막힘을 다시 맞춤 (입력 칸 전체를 다시 그리면 글자 넣던 칸을 놓침) */
function t2RlLock(){ ['rl_b', 'rl_m'].forEach(k => { const i = document.querySelector(`#wb [data-wbi="${k}"]`); if(!i) return; const r = i.closest('.wb-ir'), lk = t2InLock(k);
  i.disabled = !!lk; r.classList.toggle('lock', !!lk); let s = r.querySelector('.wb-lk'); if(lk && !s){ s = document.createElement('span'); s.className = 'wb-lk'; i.parentNode.insertBefore(s, i.nextSibling.nextSibling); }
  if(s){ if(lk) s.textContent = lk; else s.remove(); } }); }
document.addEventListener('input', e => { if(WB.id==='2' && e.target.matches && e.target.matches('[data-wbi="w_car"]')) setTimeout(t2RlLock, 0); });

/* ============================================================ 결과 칸 (도구가 직접 그림)
   1행: 감속비 · 종목 기록 · 차량 한계 (감속비 칸과 종목 기록 칸은 같은 종목이 같은 높이)
   2행: 고른 코스 · 축전지 · 모터 · 에너지 (위에서 고른 코스 · 볼 랩) */
const t2F = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
const t2T = (s, d) => { if(!isFinite(s)) return '—'; if(s < 60) return `${s.toFixed(d)}s`; const m = Math.floor(s/60); return `${m}m ${(s - 60*m).toFixed(1)}s`; };   // 60초 넘으면 25m 17.2s
const t2Dt = d => !isFinite(d) ? '' : d > 0.0005 ? `<span class="t2-dt bad">+${d.toFixed(3)}s</span>` : `<span class="t2-dt ok">−${Math.abs(d).toFixed(3)}s</span>`;
const t2R  = (n, v, x, cls) => `<div class="t2-r${cls ? ' ' + cls : ''}"><span class="n">${n}</span><span class="d">${x || ''}</span><span class="v">${v}</span></div>`;   // 이름 · 메모 · 수치 (수치는 늘 오른쪽 끝)
const t2Box = (title, note, body, cls) => `<div class="wb-oc t2-oc${cls ? ' ' + cls : ''}"><h4>${title}${note ? `<span>${note}</span>` : ''}</h4><div class="t2-rs">${body}</div></div>`;
function t2OutHTML(R){ const o = R.out, opt = T2.grMode==='opt', c = T2.course;
  const G = (n, g, t) => t2R(n, t, g);   // 감속비 칸: 이름 · 감속비 · 그때 기록
  const gear = t2Box('감속비', '종목마다 가장 빠른 감속비 (2.5 ~ 7.0) · 그때 기록',
      t2R('제안 (배점 가중)', `<b>${t2F(o.gr_opt, 2)}</b>`, '<span class="muted">가속 100 · 오토 200 · 내구 350</span>')
    + G('가속', `<b>${t2F(o.gr_acc, 2)}</b>`, `<b>${t2T(o.tb_acc, 3)}</b>`) + t2R('스키드패드', '<b>—</b>', '<span class="muted">감속비와 거의 상관없음</span>')
    + G('오토크로스', `<b>${t2F(o.gr_ax, 2)}</b>`, `<b>${t2T(o.tb_ax, 2)}</b>`) + G('내구 첫 랩 (정지 출발)', `<b>${t2F(o.gr_end, 2)}</b>`, `<b>${t2T(o.tb_end1, 2)}</b>`)
    + G('내구 평균 랩 (정지 출발 랩 제외)', '', `<b>${t2T(o.tb_endavg, 2)}</b>`) + G('내구 총합', '', `<b>${t2T(o.tb_end, 1)}</b>`), 'g');
  const rec = t2Box('종목 기록', `감속비 ${t2F(o.gr_use, 2)} (${opt ? '최적' : '내 감속비'}) · ± = 가장 빠른 기록 대비`,
      t2R('기준 감속비', `<b>${t2F(o.gr_use, 2)}</b>`, `<span class="muted">${opt ? '최적 감속비' : '왼쪽 입력'}</span>`)
    + t2R('가속', `<b>${t2T(o.t_acc_s, 3)}</b>`, t2Dt(o.d_acc)) + t2R('스키드패드 (좌우 합)', `<b>${t2T(o.t_skid_s, 3)}</b>`, `<span class="muted">우 ${t2F(o.t_skid_r, 3)} · 좌 ${t2F(o.t_skid_l, 3)}</span>`)
    + t2R('오토크로스', `<b>${t2T(o.t_ax_s, 2)}</b>`, t2Dt(o.d_ax)) + t2R('내구 첫 랩 (정지 출발)', `<b>${t2T(o.t_end1, 2)}</b>`, '')
    + t2R('내구 평균 랩 (정지 출발 랩 제외)', `<b>${t2T(o.t_endavg, 2)}</b>`, '') + t2R('내구 총합', `<b>${t2T(o.t_end_s, 1)}</b>`, t2Dt(o.d_end)));
  const cla = o.g_skid > 0 ? `<b>${isFinite(o.cla_req) ? (o.cla_req > 0 ? '' : '') + t2F(o.cla_req, 2) : '±15 밖'}</b> <i>m²</i>` : '—';
  const lim = t2Box('차량 한계', `감속비 ${t2F(o.gr_use, 2)}`,
      t2R('최고 차속 (회전수 한계)', `<b>${t2F(o.vmax, 1)}</b> <i>km/h</i>`, '') + t2R('오토크로스 최고 차속', `<b>${t2F(o.v_top, 1)}</b> <i>km/h</i>`, '')
    + t2R('출발 종가속도', `<b>${t2F(o.ax_0, 2)}</b> <i>g</i>`, '') + t2R('스키드패드 횡가속도', `<b>${t2F(o.ay_skid, 2)}</b> <i>g</i>`, '')
    + t2R('스키드패드 목표에 필요한 C_L·A', cla, o.g_skid > 0 ? `<span class="muted">목표 ${t2F(o.g_skid, 3)}s (좌우 합) · 지금 ${t2F(WB.I.cla, 2)}${isFinite(o.cla_req) && o.cla_req < WB.I.cla ? ' · 남음' : ''}</span>` : '<span class="muted">왼쪽 [스키드패드 목표] 입력</span>'));
  /* 2행 */
  const cn = T2CN[c] + (o.c_n > 1 ? ` · ${T2.lap[c]==='all' ? `전체 ${o.c_n}랩` : `${o.c_lap}번째 랩`}` : '');
  const grLab = !opt ? '감속비 (입력)' : c==='skid' ? '감속비 (상관없어 최적 감속비)' : '감속비 (이 코스에서 가장 빠른 값)';
  const crec = c==='skid' ? t2R('기록 (좌우 한 바퀴 합)', `<b>${t2T(o.c_t, 3)}</b>`, '') + t2R('8자 전체 주행 (진입 ~ 탈출)', `<b>${t2T(o.c_ttot, 2)}</b>`, '')
    : o.c_n > 1 ? (T2.lap[c]==='all' ? '' : t2R(`${o.c_lap}번째 랩`, `<b>${t2T(o.c_t, 2)}</b>`, '')) + t2R('첫 랩 (정지 출발)', `<b>${t2T(o.c_t1, 2)}</b>`, '') + t2R('평균 랩 (정지 출발 랩 제외)', `<b>${t2T(o.c_tavg, 2)}</b>`, '') + t2R('총합', `<b>${t2T(o.c_ttot, 1)}</b>`, '')
    : t2R('기록', `<b>${t2T(o.c_t, c==='acc' ? 3 : 2)}</b>`, '');
  const r1 = t2R(grLab, `<b>${t2F(o.c_gr, 2)}</b>`, '') + crec + t2R('최고 차속', `<b>${t2F(o.c_vtop, 1)}</b> <i>km/h</i>`, '')
    + (isFinite(o.c_len) ? t2R('한 랩 거리', `<b>${t2F(o.c_len, 1)}</b> <i>m</i>`, `<span class="muted">${!o.c_rl ? '가운데 선' : `${o.c_rl === 2 ? `다듬은 선 −${t2F(o.c_rlg, 2)} s` : '최소 곡률'} · 여유 ${t2F(o.c_rlb, 2)} m${WB.I.w_car > 0 ? ` (${t2F(WB.I.w_car, 2)} ÷ 2 + ${t2F(Math.max(0, WB.I.rl_m || 0), 2)})` : ''}`}</span>`) : '');
  const r2 = t2R('최고 모터 회전수', `<b>${t2F(o.c_rpm, 0)}</b> <i>rpm</i>`, '') + t2R('최대 모터 토크', `<b>${t2F(o.c_tq, 1)}</b> <i>N·m</i>`, '') + t2R('최대 단자 출력', `<b>${t2F(o.c_pbat, 1)}</b> <i>kW</i>`, '')
    + t2R('가장 낮은 단자 전압', `<b>${t2F(o.c_vmin, 1)}</b> <i>V</i>`, '') + t2R('모터 최고 온도', `<b>${t2F(o.c_tmax, 1)}</b> <i>°C</i>`, `<span class="muted">끝 ${t2F(o.c_tm, 1)} °C</span>`)
    + t2R('최대 전류 때 단자 전압 (SOC 100 %)', `<b>${t2F(o.v_load, 1)}</b> <i>V</i>`, '') + t2R('단자 출력 상한 (규정 · 전류 한계)', `<b>${t2F(o.p_max, 2)}</b> <i>kW</i>`, '') + t2R('모터 기저 회전수 (공칭 전압)', `<b>${t2F(o.n_base, 0)}</b> <i>rpm</i>`, '');
  const one = o.c_n > 1 && T2.lap[c]!=='all' ? `${o.c_lap}번째 랩 ` : '';
  const r3 = t2R(`${one}단자 에너지`, `<b>${t2F(o.c_et, 3)}</b> <i>kWh</i>`, '') + t2R(`${one}소비 (저항 손실 포함)`, `<b>${t2F(o.c_ec, 3)}</b> <i>kWh</i>`, '') + t2R(one ? `${o.c_lap}번째 랩 끝 SOC` : '끝 SOC', `<b>${t2F(o.c_soc, 1)}</b> <i>%</i>`, '')
    + (c==='end' ? t2R('내구 전체 (단자 / 소비)', `<b>${t2F(o.e_end_t, 2)}</b> <i>/</i> <b>${t2F(o.e_end_c, 2)}</b> <i>kWh</i>`, `<span class="muted">${o.n_lap}랩</span>`)
       + t2R('출력 상한 없이 (단자 / 소비)', `<b>${t2F(o.e_nl_t, 2)}</b> <i>/</i> <b>${t2F(o.e_nl_c, 2)}</b> <i>kWh</i>`, '<span class="muted">용량 가늠용</span>')
       + t2R('쓸 수 있는 에너지', `<b>${t2F(o.c_cap, 2)}</b> <i>kWh</i>`, '<span class="muted">0 = 팩 전체</span>')
       + t2R('출력 상한 비율', o.c_plim >= 99.95 ? '<b>제한 없음</b>' : `<b>${t2F(o.c_plim, 1)}</b> <i>%</i>`, o.c_plim < 99.95 ? '<span class="t2-dt bad">에너지에 맞추려고 낮춤</span>' : '')
       + t2R('보정 에너지 소비량 (CO₂)', `<b>${t2F(o.c_co2, 2)}</b> <i>kg/100 km</i>`, o.c_co2 > 60.06 ? '<span class="t2-dt bad">실격 기준 60.06 초과</span>' : '<span class="muted">실격 기준 60.06 이하</span>') : '');
  return `<div class="t2-out"><div class="t2-orow three">${gear}${rec}${lim}</div>
    <div class="t2-orow three">${t2Box('고른 코스', cn, r1)}${t2Box('축전지 · 모터', cn, r2)}${t2Box('에너지 (회생 제외)', cn, r3)}</div></div>`; }

/* 입력 옆 '모양 보기': 하중 감도 → 바퀴 하중에 따른 μ 와 낼 수 있는 횡력 */
function t2VizMus(I){ const Z = Array.from({length:61}, (_, i) => i*50), mu = Z.map(z => Math.max(0, I.mu - I.mu_s*z/1000)), Fy = Z.map((z, i) => mu[i]*z);
  return {x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:'', dd:2}, {k:'fy', d:Fy, c:WB_COL[2], n:'낼 수 있는 횡력 μ·Fz', u:'N', dd:0}], act:'mu',
    note:`정지 때 바퀴 하나 평균 하중 약 ${wbFmt(I.m*9.81/4, 0)} N. μ·Fz 가 꺾여 내려가기 시작하면 하중을 더 실어도 그 바퀴 힘이 늘지 않습니다.`}; }

/* ============================================================ 이 탭 사용법 */
function t2TourTab(tab, et, course){ if(!T2.tourUndo && typeof tgUndo==='function'){ const t0 = T2.tab, e0 = T2.etab, c0 = T2.course; T2.tourUndo = true;
    tgUndo(() => { T2.tourUndo = false; T2.tab = t0; T2.etab = e0; if(T2.course!==c0) t2SetCourse(c0); else wbPaint(['ext', 'mid']); }); }
  if(course && T2.course!==course) t2SetCourse(course); if(T2.tab!==tab || (et && T2.etab!==et)){ T2.tab = tab; if(et) T2.etab = et; wbPaint(['ext', 'mid']); } }
const t2TT = (tab, et, course) => ({click:{sel:`#wb [data-t2tab="${tab}"]`, need:() => T2.tab!==tab || (et && T2.etab!==et) || (course && T2.course!==course), run:() => t2TourTab(tab, et, course)}, inner:'#wb .wb-right'});
const M2TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 해석해 비교표), 입력 내보내기 · 가져오기(맵 편집 표 포함), 대시보드에 반영(제안 감속비 · 최고 차속 · 횡가속도 · 랩 에너지)입니다.', t2TT('sim')],
  ['#wb .wb-in', '입력', '차량 · 타이어 · 에어로 · 모터 · 모터 열 · 구동계 · 축전지 · 스키드패드 목표입니다. 칸 앞 점 = 값의 출처: 색 점은 대시보드 값(확정 · 검토 중 · 가정 · 계산값 · 예시값), 고리는 직접 고친 값, 회색 네모는 도구 기본값. [대시보드 값으로 채우기]로 팀 설계값을 넣습니다.', t2TT('sim')],
  ['#wb [data-t2tab="edit"]', '맵 편집 탭', '숫자 하나로 안 되는 값 — 코스 · 모터 토크 곡선 · 모터 효율 맵 · 인버터 효율 맵 · 타이어 하중 감도 — 을 표로 넣는 탭입니다. 시뮬레이션 전에 여기서 표를 확인합니다.', t2TT('edit', 'course')],
  ['#wb .t2-hr', '상수인가, 맵인가', '표가 비어 있으면 왼쪽 입력의 상수(모터 최대 토크 · 모터 효율 · 인버터 효율 · μ · 하중 감도)를 쓰고, 그림 위에 "왼쪽 입력 상수를 씁니다"가 뜹니다. 표에 값이 있으면 표를 쓰고 그 상수 칸은 막힙니다("맵 편집 탭 표 사용"). 숫자 하나만 넣어도 상수 표가 됩니다.', t2TT('edit', 'eM')],
  ['#wb .t2-tw', '표 고치기', '칸을 눌러 고치고 Enter(반영) · Esc(취소). 표 아래 [+ 줄] · [+ 행] · [+ 열]로 바로 늘리고 × 로 지웁니다. 빈 표에서 누르면 머리줄부터 만듭니다. 토크 표는 1열 회전수 · 2열 최대 토크 · 3열 연속 토크(디레이팅 하한)입니다.', t2TT('edit', 'mt')],
  ['#wb .t2-menu', '입력하기', '붙여넣기(창에 붙여 넣으면 표를 덮어씀) · 파일 가져오기(.xlsx 첫 시트 · .csv) · 양식 받기(쓰는 법이 양식 맨 위 # 줄에 있음) · 예시로 · 비우기.', t2TT('edit', 'mt')],
  ['#wb .t2-fbox', '그림으로 틀린 칸 찾기', '오른쪽 그림은 표로 그린 것입니다. 효율 맵에서 혼자 색이 튀는 칸, 곡선이 꺾인 곳, 코스가 엉뚱하게 꺾인 곳을 누르면 표에서 그 칸(행)으로 가서 강조합니다.', t2TT('edit', 'eM')],
  ['#wb .t2-tr', '코스', '공식 코스(오토크로스 · 내구 · 가속 · 스키드패드)는 회색 표로 보기만 합니다. 내 코스는 칸 고치기 · # 번호로 옮기기 · 각도 → 길이, 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스입니다. 비워 두면 계산하지 않습니다. 초록 = 출발(주행 방향 오른쪽), 빨강 = 결승(왼쪽), 화살표 = 방향.', t2TT('edit', 'course', 'free')],
  ['#wb [data-t2tab="sim"]', '시뮬레이션 탭', '맵 편집과 왼쪽 입력으로 기록을 계산해 보는 탭입니다. 위에서 아래로: 기준 감속비 · 볼 랩 · 코스 → 결과 → 구동력 선도 · 코스 지도 → 신호 그래프.', t2TT('sim', null, 'end')],
  ['#wb .t2-gm', '기준 감속비', '내 감속비 = 왼쪽 [최종 감속비] 입력, 최적 감속비 = 배점(가속 100 · 오토크로스 200 · 내구 350)을 가중해 고른 하나. 두 모드를 미리 계산해 두어 누르면 바로 바뀝니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-vw', '볼 랩 · 코스', '코스를 고르면 결과 2행 · 구동력 선도 · 코스 지도 · 신호 그래프가 그 코스로 바뀝니다. 내구는 26랩(드라이버당 13랩) 중 볼 랩을 고르고, [전체]는 26랩을 이어서 봅니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-orow', '결과 1행', '감속비(종목마다 가장 빠른 감속비와 그때 기록) · 종목 기록(기준 감속비) · 차량 한계. 같은 종목이 같은 높이라 옆으로 비교합니다. ± = 가장 빠른 기록 대비, 초록은 빠름 · 빨강은 느림.', t2TT('sim', null, 'end')],
  ['#wb .t2-orow + .t2-orow', '결과 2행', '고른 코스 · 볼 랩의 기록, 축전지 · 모터(회전수 · 토크 · 출력 · 전압 · 모터 온도), 에너지(단자 · 소비 · SOC, 내구는 에너지 제한 · CO₂). 내구는 26랩 전체 단자 · 소비 에너지와, 출력 상한 없이 달렸을 때의 에너지(축전지 용량 가늠용)도 보입니다. 최적 모드에서 감속비는 그 코스에서 가장 빠른 값입니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-ftw', '구동력 선도', '코스 커서 지점의 전압 · 모터 온도 · 횡가속도로 다시 그린 선도입니다(보기만, 눌러도 커서는 안 움직임). 세로선 = 그 점의 차속. 아래 글이 그 점의 구동력을 무엇이 정했는지(모터 곡선 · 출력 상한 · 뒤축 접지), 제동 한계, 앞축 여유를 알려 줍니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-mapw', '코스 지도', '휠로 확대, 끌어서 이동, 누르면 그 위치로 커서가 옮겨 갑니다. 색 = 차속(여러 랩이면 모든 랩 통틀어 같은 범위), 주황 콘 = 슬라럼. 색 선 = 계산한 주행선(코스 폭 안에서 곡률이 가장 작은 선을 구한 뒤, 랩타임이 줄어드는 쪽으로 조금씩 옮겨 다듬은 선. 슬라럼 콘은 번갈아 비켜 감), 점선 = 코스 가운데 선. 입력의 \'주행선\' 묶음에서 방식(2 · 1 · 0)과 차 전폭 · 여유를 바꿀 수 있습니다. 다듬기는 입력이 바뀔 때마다 다시 해서 계산이 몇 초 걸립니다.', t2TT('sim', null, 'end')],
  ['#wbsl', '신호 고르기', '그래프를 누르면 그 칸이 강조되고, 여기 체크가 그 칸에 그릴 신호를 고릅니다. 이름을 누르면 그 신호의 눈금이 앞으로. 축 · 눈금 · 제목 · 값 글자는 선 색과 같습니다.', t2TT('sim')],
  ['#wbsig', '그래프 칸', '그래프를 누르거나 끌면 커서(←/→ 한 칸씩). 아래 [+ 그래프 칸]으로 최대 3칸, 칸 오른쪽 위 × 로 지우고, 칸 아래 경계를 끌어 높이를 바꿉니다.', t2TT('sim')],
  ['#wbsl [data-wbxa]', '입력 훑기', '가로축을 [입력 훑기 → 최종 감속비] 등으로 바꾸면 그 입력을 바꿔 가며 다시 계산한 종목 기록 변화를 봅니다 (나머지 입력은 지금 값).', t2TT('sim')]
];

/* ============================================================ 도구 정의 */
const T2G = {car:'질량 · 무게중심', tire:'타이어 · 하중 이동', aero:'에어로', mot:'모터 · 인버터', th:'모터 열 · 디레이팅', dt:'구동계', bat:'축전지', rl:'주행선', goal:'스키드패드 목표 (0 = 정하지 않음)'};
WB_TOOLS['2'] = {
  no:'2', stage:'P0', name:'랩타임 시뮬레이터',
  x:{n:'거리', u:'m'},
  sweepFirst:'gr',
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:T2G.car}, {k:'fr', dk:'fr', v:47.5, d:1, g:T2G.car}, {k:'h', dk:'h', v:290, d:0, g:T2G.car},
    {k:'L', dk:'L', v:1550, d:0, g:T2G.car}, {k:'tf', dk:'tf', v:1200, d:0, g:T2G.car}, {k:'tr', dk:'tr', v:1180, d:0, g:T2G.car},
    {k:'mu', dk:'mu', v:1.5, d:2, g:T2G.tire}, {k:'mu_s', dk:'mu_s', v:0, d:3, g:T2G.tire}, {k:'lltd', dk:'lltd', v:50, d:1, g:T2G.tire},
    {k:'r_eff', dk:'r_eff', v:229, d:0, g:T2G.tire}, {k:'crr', dk:'crr', v:0.015, d:3, g:T2G.tire},
    {k:'cla', dk:'cla', v:3.0, d:2, g:T2G.aero}, {k:'cda', dk:'cda', v:1.4, d:2, g:T2G.aero}, {k:'xcop', dk:'xcop', v:852, d:0, g:T2G.aero}, {k:'hcop', dk:'hcop', v:420, d:0, g:T2G.aero},
    {k:'pmax', dk:'pmax', v:80, d:0, g:T2G.mot}, {k:'tmax', dk:'tmax', v:230, d:0, g:T2G.mot}, {k:'nmax', dk:'nmax', v:6500, d:0, g:T2G.mot},
    {k:'v_ref', n:'모터 표 기준 전압 (표를 잰 전압)', u:'V', v:710, d:0, g:T2G.mot},
    {k:'ke_ratio', n:'유도 전압 비 (팀 모터 ÷ 표 모터)', u:'', v:0.6523, d:4, g:T2G.mot},
    {k:'eta_mot', n:'모터 효율 (효율 맵이 없을 때)', u:'%', v:95, d:1, g:T2G.mot}, {k:'eta_inv', n:'인버터 효율 (효율 맵이 없을 때)', u:'%', v:97, d:1, g:T2G.mot},
    {k:'th_k', n:'디레이팅 계수 (0 = 항상 최대 토크)', u:'N·m/°C', v:0, d:2, g:T2G.th}, {k:'th_t0', n:'디레이팅 시작 모터 온도', u:'°C', v:100, d:0, g:T2G.th},
    {k:'th_c', n:'모터 열용량', u:'J/K', v:6000, d:0, g:T2G.th}, {k:'th_r', n:'모터 → 냉각수 열저항', u:'K/W', v:0.02, d:4, g:T2G.th},
    {k:'th_cool', n:'냉각수 온도', u:'°C', v:40, d:0, g:T2G.th}, {k:'th_init', n:'출발 때 모터 온도', u:'°C', v:40, d:0, g:T2G.th},
    {k:'gr', dk:'gr', v:3.55, d:2, g:T2G.dt, sw:[2.5, 7]}, {k:'eta_dt', dk:'eta_dt', v:95, d:0, g:T2G.dt}, {k:'j_eq', dk:'j_eq', v:0.5, d:2, g:T2G.dt},
    {k:'n_s', dk:'n_s', v:72, d:0, g:T2G.bat}, {k:'n_p', dk:'n_p', v:6, d:0, g:T2G.bat},
    {k:'c_vmax', n:'셀 최대 전압 (만충)', u:'V', v:4.2, d:2, g:T2G.bat}, {k:'c_vmin', n:'셀 방전 종지 전압', u:'V', v:2.5, d:2, g:T2G.bat},
    {k:'c_vnom', n:'셀 공칭 전압', u:'V', v:3.6, d:2, g:T2G.bat}, {k:'c_ah', n:'셀 용량', u:'Ah', v:4.5, d:2, g:T2G.bat},
    {k:'r_pack', dk:'r_pack', v:180, d:0, g:T2G.bat}, {k:'i_bms_max', dk:'i_bms_max', v:270, d:0, g:T2G.bat}, {k:'e_target', dk:'e_target', v:0, d:2, g:T2G.bat},
    {k:'rl_on', n:'주행선 (2 = 랩타임으로 다듬음, 1 = 최소 곡률, 0 = 가운데 선)', u:'', v:2, d:0, g:T2G.rl},
    {k:'w_car', n:'차 전폭 (타이어 · 윙 포함 가장 넓은 곳, 0 = 입력 안 함)', u:'m', v:0, d:2, g:T2G.rl},
    {k:'rl_m', n:'여유 (차 옆면 ↔ 코스 경계 · 콘, 전폭이 있을 때)', u:'m', v:0.2, d:2, g:T2G.rl},
    {k:'rl_b', n:'경계 · 콘에서 차 중심까지 최소 거리 (전폭이 0 일 때)', u:'m', v:1.0, d:2, g:T2G.rl},
    {k:'w_free', n:'내 코스 폭 (가운데 선 양쪽 같게)', u:'m', v:3.5, d:2, g:T2G.rl},
    {k:'t_skid', dk:'t_skid', v:0, d:3, g:T2G.goal}
  ],
  /* 결과 칸은 outHTML 이 그림. outputs = 대시보드 반영 · 입력 훑기 · 검증표 이름 */
  outHTML: t2OutHTML,
  outputs:[
    {k:'t_acc_s', n:'가속 기록', u:'s', d:3}, {k:'t_skid_s', n:'스키드패드 기록 (좌우 합)', u:'s', d:3}, {k:'t_ax_s', n:'오토크로스 기록', u:'s', d:2}, {k:'t_end_s', n:'내구 총 시간', u:'s', d:1},
    {k:'e_use', n:'내구 소비 에너지', u:'kWh', d:2}, {k:'e_nl_c', n:'내구 소비 에너지 (출력 상한 없이)', u:'kWh', d:2}, {k:'p_lim', n:'내구 출력 상한 비율', u:'%', d:1},
    {k:'vmax', dk:'vmax', d:1}, {k:'ay_skid', dk:'ay_max_sim', d:2},
    {k:'gr_opt', dk:'gr', n:'제안 감속비 (배점 가중)', d:2, hide:true}, {k:'e_lap', dk:'e_lap', d:3, hide:true},
    {k:'t_free1', n:'내 코스 1번째 랩', u:'s', d:2, hide:true}, {k:'t_free2', n:'내 코스 2번째 랩', u:'s', d:4, hide:true}, {k:'t_freeavg', n:'내 코스 평균 랩', u:'s', d:4, hide:true},
    {k:'n_free', n:'내 코스 랩 수', u:'랩', d:0, hide:true}, {k:'e_free', n:'내 코스 2번째 랩 단자 에너지', u:'kWh', d:5, hide:true},
    {k:'ax_0', n:'출발 종가속도', u:'g', d:2, hide:true}, {k:'cla_req', n:'필요 C_L·A', u:'m²', d:2, hide:true},
    {k:'v_load', n:'최대 전류 때 단자 전압', u:'V', d:1, hide:true}, {k:'p_max', n:'단자 출력 상한', u:'kW', d:3, hide:true}, {k:'n_base', n:'모터 기저 회전수', u:'rpm', d:0, hide:true},
    {k:'n_lap', n:'내구 랩 수', u:'랩', d:0, hide:true}, {k:'n_st1', n:'첫 드라이버 랩 수', u:'랩', d:0, hide:true}, {k:'e_ok', n:'에너지 한도 안 (1 = 예)', u:'', d:0, hide:true}, {k:'c_tm', n:'고른 코스 끝 모터 온도', u:'°C', d:3, hide:true}
  ],
  sigs:[
    {k:'v', n:'차속', u:'km/h', d:1}, {k:'pw', n:'바퀴 출력 (구동 +, 제동 −)', u:'kW', d:1}, {k:'vlim', n:'코너 한계 속도', u:'km/h', d:1}, {k:'ax', n:'종가속도', u:'g', d:2}, {k:'ay', n:'횡가속도', u:'g', d:2},
    {k:'fz_fo', n:'앞 바깥 바퀴 하중', u:'N', d:0}, {k:'fz_fi', n:'앞 안쪽 바퀴 하중', u:'N', d:0}, {k:'fz_ro', n:'뒤 바깥 바퀴 하중', u:'N', d:0}, {k:'fz_ri', n:'뒤 안쪽 바퀴 하중', u:'N', d:0},
    {k:'rpm', n:'모터 회전수', u:'rpm', d:0}, {k:'tq', n:'모터 토크', u:'N·m', d:1}, {k:'pbat', n:'축전지 단자 출력 (회생 제외)', u:'kW', d:1}, {k:'vbat', n:'축전지 단자 전압', u:'V', d:1},
    {k:'eta', n:'모터 × 인버터 효율', u:'%', d:1}, {k:'tmot', n:'모터 온도', u:'°C', d:1}, {k:'tlim', n:'모터 토크 한계 (디레이팅 포함)', u:'N·m', d:1}, {k:'grip', n:'그립 사용률 (차 전체)', u:'%', d:0}, {k:'t', n:'경과 시간', u:'s', d:2}, {k:'ecum', n:'누적 단자 에너지', u:'Wh', d:0}
  ],
  sigOn:['v', 'pw'],
  extHTML: t2ExtHTML, midHTML: t2MidHTML, extraI: t2ExtraI, inLock: t2InLock,
  extGet: () => ({course:T2.course, lap:{...T2.lap}, free:{...T2.free}, mtext:T2.mtext, eM:T2.eM, eI:T2.eI, tire:T2.tire, grMode:T2.grMode}),
  extSet(d){ if(!d || typeof d!=='object') return; t2Load(d); t2Save(); wbPaint(['ext', 'mid', 'in']); },
  /* 결과가 오면: 고른 모드를 꺼내 씀 (두 모드 모두 들어 있음) → 위 줄 · 지도 · 구동력 선도 */
  onResult(R){ if(R && R.modes) Object.assign(R, R.modes[T2.grMode]);
    if(T2.tab==='sim'){ const hr = $('#wbext .t2-hr'); if(hr) wbPaint(['ext']); t2MapRepaint(); t2PfSoon(); }
    else if(T2.etab==='mt'){ const c = $('#t2mc'); if(c) c.innerHTML = t2EditPlot('mt'); const f = $('#wbext .t2-fcap'); if(f) f.innerHTML = t2EditCap('mt'); } },
  onCursor(){ t2MapRepaint(); t2PfSoon(); },
  tour: M2TOUR,
  verifyBase:{end:{seg:[], laps:26, stint:13}, free:{seg:[], laps:1, s0:0}, motor:[], motorC:[], effM:null, effI:null, tireMap:null, r_pack:0, i_bms_max:1e9, pmax:1e6, eta_mot:100, eta_inv:100,
              th_k:0, th_t0:100, th_c:6000, th_r:0.02, th_cool:40, th_init:40, rl_on:0, rl_b:1, w_car:0, rl_m:0.2, w_free:3.5, course:'acc', lap:'2', grMode:'my'},
  verify:[
    {n:'가속 · 접지 한계만 (μ = 1, CG 뒤축 위)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5}, expect:{t_acc_s:3.910309, ax_0:1}, src:'a = μg → t = √(2 × 75 ÷ 9.81)'},
    {n:'가속 · 회전부 관성 J ÷ r²', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100}, expect:{t_acc_s:5.477226}, src:'F = 100 × 4 ÷ 0.25 = 1600 N, 등가 질량 300 + 1.25 ÷ 0.25² = 320 kg → a = 5'},
    {n:'가속 · 구름 저항 무게 항', I:{m:300, fr:50, h:0, mu:10, crr:0.02, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100}, expect:{t_acc_s:5.580840}, src:'a = (1600 − 0.02 × 300 × 9.81) ÷ 320 = 4.8161'},
    {n:'회전수 한계 최고속', I:{nmax:6500, gr:3.55, r_eff:229}, expect:{vmax:158.0708}, src:'6500 ÷ 3.55 × 2π ÷ 60 × 0.229 × 3.6'},
    {n:'스키드패드 · 에어로 없음', I:{mu:1.5, crr:0, cla:0, cda:0}, expect:{t_skid_s:9.895692, ay_skid:1.5}, src:'v = √(μgR), R = 9.125 → 오른쪽 · 왼쪽 한 바퀴씩 합 = 2 × 2πR ÷ v'},
    {n:'스키드패드 · 다운포스 (앞뒤 몫 = 무게 배분)', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:3, cda:0}, expect:{t_skid_s:9.471806}, src:'mv²/R = μ(mg + ½ρC_LA v²) → v² = μmg ÷ (m/R − μ½ρC_LA), 좌우 한 바퀴씩 합'},
    {n:'스키드패드 목표 기록 → 필요 C_L·A', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:0, cda:0, t_skid:9.471806}, expect:{cla_req:3}, src:'위 경우를 거꾸로: 9.4718 s 에 필요한 C_L·A = 3'},
    {n:'스키드패드 목표가 느리면 필요 C_L·A 는 − (줄여도 됨)', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:0, cda:0, t_skid:10.302152}, expect:{cla_req:-3}, src:'C_L·A = −3 (양력)이면 v² = μmg·½ ÷ (m/R·½ − μ·½ρ(−3)·½) → 좌우 합 10.3022 s'},
    {n:'하중 감도 0 → 횡하중 이동 배분과 상관없음', I:{mu:1.5, mu_s:0, lltd:20, crr:0, cla:0, cda:0}, expect:{t_skid_s:9.895692}, src:'μ 일정이면 축 힘 = μ × 축 하중 (좌우로 옮겨도 합은 같음)'},
    {n:'하중 감도 · 스키드패드', I:{m:300, fr:50, h:300, tf:1200, tr:1200, lltd:50, mu:1.5, mu_s:0.1, crr:0, cla:0, cda:0}, expect:{t_skid_s:10.276676, ay_skid:1.390843}, src:'축 하나: m·ay/2 = μ0·W/2 − μs(2(W/4)² + 2ΔF²), ΔF = ½·m·ay·h/t 를 ay 에 대해 풂 (좌우 합)'},
    {n:'타이어 하중 감도 맵 = 같은 직선의 감도', I:{m:300, fr:50, h:300, tf:1200, tr:1200, lltd:50, mu:1.5, mu_s:0, tireMap:[[0, 1.5], [10000, 0.5]], crr:0, cla:0, cda:0}, expect:{t_skid_s:10.276676, ay_skid:1.390843}, src:'맵 μ(Fz) = 1.5 − 0.1 × Fz[kN] 은 위 하중 감도 0.1 과 같음'},
    {n:'내 코스 · 원 2번째 바퀴 = 스키드패드', I:{mu:1.5, crr:0, cla:0, cda:0, free:{seg:[[57.33407, 9.125]], closed:true, laps:2, s0:0}}, expect:{t_free2:4.947846}, src:'달리는 중 한 바퀴 = 2πR ÷ √(μgR)'},
    {n:'내 코스 · 출발 위치가 달라도 원은 같음', I:{mu:1.5, crr:0, cla:0, cda:0, free:{seg:[[57.33407, 9.125]], closed:true, laps:2, s0:20}}, expect:{t_free2:4.947846}, src:'원 위 모든 점이 같으므로 2번째 바퀴는 그대로'},
    {n:'내 코스 · 평균 랩 = 정지 출발 랩을 뺀 평균', I:{mu:1.5, crr:0, cla:0, cda:0, free:{seg:[[57.33407, 9.125]], laps:3, s0:0}}, expect:{t_freeavg:4.947846, n_free:3}, src:'2 · 3번째 랩은 일정 차속 원 = 2π × 9.125 ÷ √(μ g R) (랩 수 2 이상이면 닫힌 코스)'},
    {n:'직선 1 km · 최고속 일정 · 효율 상수', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_mot:100, eta_inv:100, nmax:6500, gr:3.55, r_eff:229, free:{seg:[[1000, 0]], closed:true, laps:2, s0:0}}, expect:{t_free2:22.77461, e_free:0.0122625}, src:'1000 ÷ 43.909 m/s, 한 바퀴 단자 에너지 = 0.015 × 300 × 9.81 × 1000 J'},
    {n:'효율 맵 (전부 80 %) = 상수 80 %', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_inv:100, effM:{n:[0, 10000], t:[0, 500], e:[[80, 80], [80, 80]]}, nmax:6500, gr:3.55, r_eff:229, free:{seg:[[1000, 0]], closed:true, laps:2, s0:0}}, expect:{e_free:0.01532813}, src:'0.0122625 ÷ 0.8'},
    {n:'모터 열 · 일정 손실이면 냉각수 + 손실 × 열저항', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_mot:80, eta_inv:100, nmax:6500, gr:3.55, r_eff:229, th_k:0, th_c:100, th_r:0.01, th_cool:50, th_init:50, course:'free', lap:'2', free:{seg:[[1000, 0]], laps:2, s0:0}}, expect:{c_tm:54.845857}, src:'2번째 랩은 최고속 일정: 손실 = F·v × (1 ÷ 0.8 − 1) = 484.6 W → 50 + 484.6 × 0.01 (시상수 1 s ≪ 22.8 s)'},
    {n:'모터 디레이팅 · 최대 − 계수 × (온도 − 시작 온도)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, tmax:1e5, motor:[[0, 200], [10000, 200]], motorC:[[0, 100], [10000, 100]], v_ref:300, ke_ratio:1, th_k:10, th_t0:40, th_init:45, th_c:1e9, th_r:1e9, th_cool:45}, expect:{t_acc_s:4.330127}, src:'토크 200 − 10 × (45 − 40) = 150 N·m → F = 2400 N, a = 8 → t = √(2 × 75 ÷ 8)'},
    {n:'축전지 · 최대 전류 때 단자 전압', I:{n_s:72, c_vmax:4.2, r_pack:180, i_bms_max:270}, expect:{v_load:253.8}, src:'72 × 4.2 − 270 × 0.18'},
    {n:'축전지 · 단자 출력 상한', I:{n_s:72, c_vmax:4.2, r_pack:180, i_bms_max:270, pmax:80}, expect:{p_max:68.526}, src:'min(80 kW, 253.8 V × 270 A) = 68.53 kW'},
    {n:'모터 · 기저 회전수가 전압에 비례', I:{motor:[[0, 200], [3000, 200], [6000, 100]], v_ref:300, ke_ratio:1, n_s:50, c_vnom:3, nmax:9000, tmax:250}, expect:{n_base:1565}, src:'표 기준 300 V 에서 3000 rpm 부터 줄어듦 → 150 V 면 1500 rpm 부터. 98 % (196 N·m) 는 1560 rpm, 그 아래로 처음 내려가는 5 rpm 칸 = 1565'},
    {n:'내구 · 26랩 = 드라이버 13 + 13', I:{end:{seg:[[100, 0]], laps:26, stint:13}}, expect:{n_lap:26, n_st1:13}, src:'대회 공식'},
    {n:'내구 · 에너지 제한이 걸리면 소비 ≤ 한도', I:{end:{seg:[[400, 0], [31.4159, 10], [400, 0], [31.4159, 10]], laps:26, stint:13}, e_target:3, pmax:80}, expect:{e_ok:1}, src:'한도 3 kWh 로 줄이면 출력 상한을 낮춰 맞춤'},
    {n:'주행선 · 슬라럼 콘 2개 (곧은 80 m 닫힌 코스, 폭 6 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[3, 3, 3, 3], WR:[3, 3, 3, 3], slalom:[1, 3]}}, expect:{c_len:80.119760},
     src:"Σ(e'')² 최소, e(20) = +1, e(60) = −1, 주기 80 → 2계 차분이 콘 사이에서 직선 → e(u) = a·u + c·u³ (u = x − 40, 1 m 간격), c = 1 ÷ (2·20³ + 20), a = −(3·20² + 1)·c → 길이 = Σ√(1 + Δe²)"},
    {n:'주행선 · 둥근 코스 + 안쪽 콘 (반경 20 m, 폭 6 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[125.663706, 20]], laps:1, stint:1, WL:[3], WR:[3], slalom:[0]}}, expect:{c_len:119.380521},
     src:'곡률 일정이면 Σ(k0 + e″)² 는 e 가 일정할 때 가장 작음 → 콘 때문에 e = +1 (안쪽 1 m) → 반경 19 m, 길이 = 2π × 19'},
    {n:'주행선 · 차 전폭으로 여유 (전폭 1.6 m + 여유 0.2 m)', I:{course:'end', rl_on:1, rl_b:5, w_car:1.6, rl_m:0.2, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[3, 3, 3, 3], WR:[3, 3, 3, 3], slalom:[1, 3]}}, expect:{c_len:80.119760, c_rlb:1},
     src:'b = 1.6 ÷ 2 + 0.2 = 1.0 (최소 거리 칸 5 m 는 안 씀) → 위 슬라럼 경우와 같은 길이'},
    {n:'주행선 다듬기 · 둥근 코스는 안쪽 경계가 가장 빠름 (반경 20 m, 폭 6 m, 두 번째 랩)', I:{course:'free', lap:'2', rl_on:2, rl_b:1, w_free:6, mu:1, mu_s:0, crr:0, cla:0, cda:0, tmax:1e5, free:{seg:[[125.663706, 20]], closed:true, laps:2, s0:0}}, expect:{c_t:8.511020, c_len:113.097336},
     src:'일정 반경 r 을 v = √(μgr) 로 돌면 한 바퀴 2πr ÷ √(μgr) ∝ √r → 가장 작은 r = 20 − (3 − 1) = 18 m: 2π·18 ÷ √(9.81·18) = 8.5110 s, 길이 2π·18 (최소 곡률은 가운데 선 8.9714 s)'},
    {n:'내구 · 출력 상한 없이 달렸을 때 에너지 (상한이 걸려도)', I:{crr:0.015, cla:0, cda:0, m:300, j_eq:0, eta_dt:100, nmax:6500, gr:3.55, r_eff:229, e_target:0.3, end:{seg:[[1000, 0]], laps:26, stint:13}}, expect:{e_nl_t:0.479488, e_nl_c:0.479488},
     src:'드라이버 2명 정지 출발 → 최고속 43.909 m/s (회전수 한계): 2 × ½ × 300 × 43.909² + 0.015 × 300 × 9.81 × 26 km = 1.7262 MJ = 0.4795 kWh (효율 100 %, 저항 0)'},
  ],
  calcLimit: 60,   /* 한 번 계산 제한 시간 [s] (주행선 다듬기 포함) */
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
  const tmap = I.tireMap && I.tireMap.length ? I.tireMap.slice().sort((a, b) => a[0] - b[0]) : null;   // 맵: [[바퀴 하중 N, μ]] (있으면 μ · 감도 대신)
  const nonlin = !!tmap || !!mus;           // μ 가 하중에 따라 바뀜 → 이분법
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
  const tq   = (I.motor || []).slice().sort((a, b) => a[0] - b[0]);   // 최대 토크 곡선 [[rpm, N·m]]
  const tqC  = (I.motorC || []).slice().sort((a, b) => a[0] - b[0]);  // 연속 토크 곡선 [[rpm, N·m]] (디레이팅 하한)
  const ke   = I.ke_ratio > 0 ? I.ke_ratio : 1;                       // 유도 전압 비 (팀 모터 ÷ 표 모터)
  const nmax = I.nmax;                                                // 최대 회전수 [rpm]

  // 표 하나에서 단자 전압 V · 회전수 n 의 토크 [N·m]  (회전수 축을 전압비로 늘이고 줄임, 곡선 끝 너머는 출력 일정)
  const fromTab = (t, n, V) => {
    const sf = (V / I.v_ref) / ke, nt = n / sf, z = t[t.length - 1];
    return nt <= z[0] ? tab1(t, nt) : z[1] * z[0] / nt;
  };

  // ---------- 모터 열 · 디레이팅: 모터 온도 Tm [°C] 가 시작 온도를 넘으면 최대 토크를 계수 [N·m/°C] 만큼 깎음 (연속 곡선 아래로는 안 감)
  const thK  = I.th_k > 0 ? I.th_k : 0;               // 디레이팅 계수 [N·m/°C]  (0 = 항상 최대 토크)
  const thT0 = I.th_t0;                               // 디레이팅 시작 온도 [°C]
  const thC  = Math.max(1, I.th_c);                   // 열용량 [J/K]
  const thR  = Math.max(1e-9, I.th_r);                // 냉각까지 열저항 [K/W]
  const thCo = I.th_cool;                             // 냉각수 온도 [°C]
  const tmNext = (Tm, Ploss, dt) => {                 // 한 칸 뒤 모터 온도: C·dT/dt = 손실 − (Tm − 냉각수) ÷ R  (지수 적분, dt 가 커도 안정)
    const Tinf = thCo + Ploss * thR, tau = thR * thC;
    return Tinf + (Tm - Tinf) * Math.exp(-dt / tau);
  };

  // 단자 전압 V · 모터 온도 Tm 에서 회전수 n 의 최대 토크 [N·m]
  function Tcurve(n, V, Tm) {
    if (n > nmax) return 0;
    if (!tq.length) return I.tmax;
    let T = fromTab(tq, n, V);
    if (thK && Tm > thT0) {
      const floor = tqC.length ? fromTab(tqC, n, V) : 0;
      T = Math.max(Math.min(T, floor), T - thK * (Tm - thT0));
    }
    return Math.min(T, I.tmax);
  }
  const eM  = (n, T) => (I.effM ? bil(I.effM, n, Math.abs(T)) : I.eta_mot) / 100;   // 모터 효율 [-]
  const eI  = (n, T) => (I.effI ? bil(I.effI, n, Math.abs(T)) : I.eta_inv) / 100;   // 인버터 효율 [-]
  const rpm = v => v / r * gr * 60 / (2 * Math.PI);                                  // 차속 [m/s] → 모터 [rpm]
  const vtop = nmax / gr * 2 * Math.PI / 60 * r * (1 - 1e-9);                        // 회전수 한계 최고속 [m/s]

  // ---------- 바퀴 구동력 [N]: 모터 곡선과 (단자 출력 상한 × 효율) 중 작은 쪽. 단자 전압이 전류로 떨어지므로 3번 되풀이
  const DM = new Map();   // 기억: 차속 0.01 m/s · 전압 0.1 V · 모터 온도 0.5 °C 단위 (디레이팅이 없으면 온도 무시)
  function drive(v, V0, Tm) {
    const tk = thK && Tm > thT0 ? Math.round(Tm * 2) : 0;
    const key = (Math.round(v * 100) * 65536 + Math.round(V0 * 10)) * 4096 + tk;
    let o = DM.get(key);
    if (!o) { o = drive_(v, V0, tk / 2); DM.set(key, o); }
    return o;
  }
  function drive_(v, V0, Tm) {
    const n = rpm(v), w = n * 2 * Math.PI / 60, Pt = ptMax(V0);
    let V = V0, T = Tcurve(n, V0, Tm);
    for (let it = 0; it < 3; it++) {
      const e = eM(n, T) * eI(n, T);
      T = Tcurve(n, V, Tm);
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
    if (!nonlin) return mu * Math.max(0, Fz);
    const [o, i] = wheels(Fz, d), f = z => Math.max(0, tmap ? tab1(tmap, z) : mu - mus * z / 1000) * z;
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
    if (!nonlin) {                    // μ 일정: 앞 · 뒤 축 각각 닫힌 식
      let v2 = Infinity;
      const cf = m * k * fs - mu * (cl * fa - cd * hc / L);
      const cr = m * k * (1 - fs) - mu * (cl * (1 - fa) + cd * hc / L);
      if (fs > 0 && cf > 0) v2 = Math.min(v2, mu * m * g * fs / cf);
      if (fs < 1 && cr > 0) v2 = Math.min(v2, mu * m * g * (1 - fs) / cr);
      v = Math.sqrt(v2);
    } else {                          // 하중 감도 · 맵: 이분법
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
  function aDrive(v, k, a0, V0, Tm) {
    const ay = v * v * Math.abs(k), Fyr = m * ay * (1 - fs), Fyf = m * ay * fs, Fm = drive(v, V0, Tm).F;
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

  // ---------- 한 칸의 전기: 바퀴 힘 F [N] → 모터 토크 [N·m] · 효율 · 단자 출력 [W] · 전류 [A] · 단자 전압 [V] · 모터 손실 [W]
  function elec(F, v, V0) {
    if (F <= 0) return { T: 0, e: 1, P: 0, I: 0, V: V0, L: 0 };
    const n = rpm(v), w = n * 2 * Math.PI / 60, T = F * r / (gr * eta), em = eM(n, T), e = em * eI(n, T), P = T * w / e;
    const tr_ = term(P, V0) || { I: Math.min(Imax, V0 / (2 * Math.max(Rb, 1e-9))), V: V0 / 2 };
    return { T, e, P, I: tr_.I, V: tr_.V, L: T * w * (1 / em - 1) };   // 모터 손실 = 축 출력 × (1 ÷ 모터 효율 − 1)
  }

  return { m, meff, r, gr, eta, fs, h, nmax, vtop, rpm, Fres, Fzr, Fzf, dF, wheels, capF, capR,
           vCorner, aDrive, aBrake, drive, elec, Tcurve, Voc, Epack, Ecap, ptMax, Rb, Imax, tmNext, thK, Tinit: I.th_init };
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


// ================================================================ 주행선 (최소 곡률)
// 가운데 선에서 옆으로 e [m] (왼쪽 +) 만큼 옮긴 경로를 찾음 (Heilmeier 외 2020 의 최소 곡률 경로를 곡선 좌표로)
//   경로 곡률 ≈ k0 + e''  → Σ h (k0 + e'')² 가 가장 작은 e (이차 계획법, Heilmeier 와 같은 1차 근사)
//      옆으로 옮겨서 생기는 곡률 변화 k0² e 는 뺌: 넣으면 긴 원호에서 바깥 경계로만 밀려
//      FSK 2026 내구 기록이 오히려 느려짐 (1487 → 1524 s, 오토크로스 53.9 → 56.2 s)
//   경계: −(오른쪽 폭 − b) ≤ e ≤ 왼쪽 폭 − b  (b = 경계 · 콘에서 차 중심까지 최소 거리)
//   슬라럼 콘(가운데 선 위): 콘 자리에서 e ≥ b 또는 e ≤ −b 를 번갈아 (첫 콘 방향은 제약 없이 푼 경로 쪽)
//   풀이: ADMM + 원시-쌍대 능동 집합법, 5대각 행렬 분해. 닫힌 코스는 처음 ↔ 끝을 이어 주기 조건으로 풂
//   결과: 1 m 안팎 조각의 [길이 m, 반경 m] — 길이 = h (1 − k0 e) √(1 + e'²), 곡률 = (k0 + e'') ÷ (1 − k0 e)
const RLC = new Map();   // 코스마다 한 번만 (차량 입력과 상관없음)

// 대칭 행렬 풀이: 대각 d0 + 띠(한 칸 · 두 칸 옆 d1, d2) + 띠 밖 몇 칸 (닫힌 코스의 처음 ↔ 끝 연결)
//   띠 부분 B 는 LDLᵀ 분해, 띠 밖 몇 칸은 Woodbury 식으로 보정: x = y − Z (I + M Pᵀ Z)⁻¹ M Pᵀ y   (y = B⁻¹b, Z = B⁻¹P)
//   ext = [[a, b, 값]] (a < b, b − a > 2).  반환: b → x 풀이 함수 (한 번 분해, 여러 번 풂)
function symSolver(d0, d1, d2, ext) {
  const n = d0.length, D = new Float64Array(n), L1 = new Float64Array(n), L2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    D[i] = d0[i] - (i > 0 ? L1[i - 1] * L1[i - 1] * D[i - 1] : 0) - (i > 1 ? L2[i - 2] * L2[i - 2] * D[i - 2] : 0);
    if (i < n - 1) L1[i] = (d1[i] - (i > 0 ? L1[i - 1] * L2[i - 1] * D[i - 1] : 0)) / D[i];
    if (i < n - 2) L2[i] = d2[i] / D[i];
  }
  const band = b => { const x = Float64Array.from(b);
    for (let i = 1; i < n; i++) x[i] -= L1[i - 1] * x[i - 1] + (i > 1 ? L2[i - 2] * x[i - 2] : 0);
    for (let i = 0; i < n; i++) x[i] /= D[i];
    for (let i = n - 2; i >= 0; i--) x[i] -= L1[i] * x[i + 1] + (i < n - 2 ? L2[i] * x[i + 2] : 0);
    return x; };
  if (!ext || !ext.length) return band;
  // ---------- 띠 밖: 관련 점 K, 그 사이 값 M (k × k)
  const K = [...new Set(ext.flatMap(([a, b]) => [a, b]))], k = K.length, at = new Map(K.map((v, i) => [v, i]));
  const Mx = Array.from({ length: k }, () => new Float64Array(k));
  ext.forEach(([a, b, v]) => { Mx[at.get(a)][at.get(b)] += v; Mx[at.get(b)][at.get(a)] += v; });
  const Z = K.map(j => { const e = new Float64Array(n); e[j] = 1; return band(e); });          // Z[c] = B⁻¹ 의 j 번째 열
  const S = Array.from({ length: k }, (_, r) => Float64Array.from({ length: k }, (_, c) => (r === c ? 1 : 0) + Mx[r].reduce((acc, m, t) => acc + m * Z[c][K[t]], 0)));
  const lu = luDense(S);
  return b => { const y = band(b), w = lu(Mx.map(row => row.reduce((acc, m, t) => acc + m * y[K[t]], 0)));
    for (let c = 0; c < k; c++) if (w[c]) for (let i = 0; i < n; i++) y[i] -= Z[c][i] * w[c];
    return y; };
}
// 작은 밀집 행렬 LU (부분 피벗) → 풀이 함수
function luDense(A0) {
  const n = A0.length, A = A0.map(r => Float64Array.from(r)), p = [...Array(n).keys()];
  for (let c = 0; c < n; c++) {
    let m = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
    [A[c], A[m]] = [A[m], A[c]]; [p[c], p[m]] = [p[m], p[c]];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; A[r][c] = f; for (let j = c + 1; j < n; j++) A[r][j] -= f * A[c][j]; }
  }
  return b => { const x = p.map(i => b[i]);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) x[i] -= A[i][j] * x[j];
    for (let i = n - 1; i >= 0; i--) { for (let j = i + 1; j < n; j++) x[i] -= A[i][j] * x[j]; x[i] /= A[i][i]; }
    return x; };
}

// 상자 제약 이차 계획: min ½ eᵀQe + gᵀe,  lo ≤ e ≤ hi
//   Q = 5대각 + (닫힌 코스면) 처음 ↔ 끝 연결: Q[i][i] = q0[i], Q[i][i+1] = q1[i], Q[i][i+2] = q2[i]  (번호는 n 으로 나눈 나머지)
//   1) ADMM (Boyd 외 2011) 으로 어느 점이 경계에 붙는지 대강 잡고
//        x = (Q + ρI)⁻¹ (ρ(z − u) − g),  z = [x + u] 를 상자 안으로,  u ← u + x − z   ((Q + ρI) 는 한 번만 분해)
//   2) 원시-쌍대 능동 집합법 (Hintermüller 외 2002) 으로 마무리: 경계에 붙은 점은 고정, 나머지는 방정식을 정확히 풂
//   3) 최적 조건 (KKT) 이 맞을 때까지 되풀이
function boxQP(q0, q1, q2, g, lo, hi, z0) {
  const n = q0.length, rho = 1, W = i => ((i % n) + n) % n;
  const nb = []; for (let i = 0; i < n; i++) { if (q1[i]) nb.push([i, W(i + 1), q1[i]]); if (q2[i]) nb.push([i, W(i + 2), q2[i]]); }   // 위 삼각 성분
  const Qg = (x, i) => g[i] + q0[i] * x[i] + q1[i] * x[W(i + 1)] + q1[W(i - 1)] * x[W(i - 1)] + q2[i] * x[W(i + 2)] + q2[W(i - 2)] * x[W(i - 2)];
  // 부분 행렬 (점 목록 F, 순서대로) 풀이 함수: 띠 + 띠 밖
  const subSolver = (F, add) => { const m = F.length, pos = new Int32Array(n).fill(-1); F.forEach((i, a) => { pos[i] = a; });
    const d0 = Float64Array.from(F, i => q0[i] + add), d1 = new Float64Array(m), d2 = new Float64Array(m), ext = [];
    nb.forEach(([i, j, v]) => { const a = pos[i], b = pos[j]; if (a < 0 || b < 0) return; const lo_ = Math.min(a, b), hi_ = Math.max(a, b);
      if (hi_ - lo_ === 1) d1[lo_] += v; else if (hi_ - lo_ === 2) d2[lo_] += v; else ext.push([lo_, hi_, v]); });
    return symSolver(d0, d1, d2, ext); };
  const all = [...Array(n).keys()], solve = subSolver(all, rho);
  const e = new Float64Array(n), u = new Float64Array(n), r = new Float64Array(n), mu = new Float64Array(n), act = new Int8Array(n);
  for (let i = 0; i < n; i++) e[i] = Math.max(lo[i], Math.min(hi[i], z0 ? z0[i] : 0));
  for (let round = 0; round < 6; round++) {
    // ---------- 1) ADMM
    for (let it = 0; it < 600; it++) {
      for (let i = 0; i < n; i++) r[i] = rho * (e[i] - u[i]) - g[i];
      const x = solve(r); let res = 0;
      for (let i = 0; i < n; i++) { const zn = Math.max(lo[i], Math.min(hi[i], x[i] + u[i])); res = Math.max(res, Math.abs(zn - e[i]), Math.abs(x[i] - zn)); e[i] = zn; u[i] += x[i] - zn; }
      if (res < 1e-6) break;
    }
    // ---------- 2) 능동 집합 마무리
    for (let i = 0; i < n; i++) mu[i] = -rho * u[i];        // 경계가 미는 힘 ≈ Qe + g
    let prev = '';
    for (let it = 0; it < 30; it++) {
      for (let i = 0; i < n; i++) act[i] = lo[i] >= hi[i] ? -1 : mu[i] - (e[i] - lo[i]) > 0 ? -1 : mu[i] - (e[i] - hi[i]) < 0 ? 1 : 0;
      const key = act.join(''); if (key === prev) break; prev = key;
      const F = []; for (let i = 0; i < n; i++) { if (act[i] < 0) e[i] = lo[i]; else if (act[i] > 0) e[i] = hi[i]; else F.push(i); }
      if (F.length) {                                       // 자유 점만의 방정식 (고정 점은 오른쪽으로)
        const fr = new Int8Array(n); F.forEach(i => { fr[i] = 1; });
        const rhs = F.map(i => { const y = Qg(e, i) - q0[i] * e[i]; let free = 0;
          [[1, q1[i]], [-1, q1[W(i - 1)]], [2, q2[i]], [-2, q2[W(i - 2)]]].forEach(([d, v]) => { const j = W(i + d); if (fr[j]) free += v * e[j]; });
          return -(y - free); });                           // −(g + 고정 점 몫)
        const x = subSolver(F, 0)(rhs); F.forEach((i, a) => { e[i] = x[a]; });
      }
      for (let i = 0; i < n; i++) mu[i] = act[i] ? Qg(e, i) : 0;
    }
    // ---------- 3) 최적 조건 확인: 맞으면 끝, 아니면 ADMM 부터 다시
    let kkt = 0;
    for (let i = 0; i < n; i++) { const y = Qg(e, i), l = e[i] <= lo[i] + 1e-9, h = e[i] >= hi[i] - 1e-9;
      kkt = Math.max(kkt, l && h ? 0 : e[i] < lo[i] - 1e-9 || e[i] > hi[i] + 1e-9 ? 1 : l ? -y : h ? y : Math.abs(y)); }
    for (let i = 0; i < n; i++) { e[i] = Math.max(lo[i], Math.min(hi[i], e[i])); u[i] = -mu[i] / rho; }
    boxQP.kkt = kkt;
    if (kkt < 1e-8) break;
  }
  return e;
}

// 옆 거리 e (점마다) → 달리는 조각 [길이, 반경]:  길이 = h (1 − k0 e) √(1 + e'²),  곡률 = (k0 + e'') ÷ (1 − k0 e)
//   geo = {h, k0 (조각마다), cyc (닫힌 코스), n (점 수), M (조각 수), segNode (원래 구간 시작 점), lo, hi (점마다 경계)}
function lineOut(e, geo) {
  const { h, k0, cyc, n, M } = geo, W = i => ((i % n) + n) % n;
  const hA = i => h[cyc ? W(i) : Math.max(0, Math.min(M - 1, i))];
  const E = i => cyc ? e[W(i)] : e[Math.max(0, Math.min(n - 1, i))];
  const D2 = i => { const hm = hA(i - 1), hp = hA(i), hn = (hm + hp) / 2; return ((E(i + 1) - E(i)) / hp - (E(i) - E(i - 1)) / hm) / hn; };
  const out = [], eNode = [];
  for (let i = 0; i < M; i++) {
    const em = (E(i) + E(i + 1)) / 2, de = (E(i + 1) - E(i)) / h[i];
    const dd = cyc ? (D2(i) + D2(i + 1)) / 2 : (i > 0 ? D2(i) : 0) / 2 + (i + 1 < n - 1 ? D2(i + 1) : 0) / 2;
    const k = (k0[i] + dd) / (1 - k0[i] * em), l = h[i] * (1 - k0[i] * em) * Math.sqrt(1 + de * de);
    out.push([l, Math.abs(k) > 1e-5 ? 1 / k : 0]); eNode.push(E(i));
  }
  eNode.push(E(M));
  const sN = [0]; h.forEach(x => sN.push(sN.at(-1) + x));
  return { segs: out, e: geo.segNode.map(j => eNode[j]), len: out.reduce((a, r) => a + r[0], 0),   // e: 원래 구간 시작점마다 [m]
           sN, eN: eNode, eAll: Float64Array.from(e), geo };                                      // 그림용: 가운데 선 거리 [m] → 옆 거리 [m]
}

// segs = [[길이, 반경]], o = {closed, wl(i), wr(i) [m], b [m], cones: [점 번호 = 그 구간 시작], key}
function racingLine(segs, o) {
  if (o.key && RLC.has(o.key)) return RLC.get(o.key);
  // ---------- 1 m 안팎 조각으로 나눔
  const h = [], k0 = [], wl = [], wr = [], segNode = [];
  segs.forEach(([l, R], i) => { const n = Math.max(1, Math.ceil(l / 1.05 - 1e-9)); segNode.push(h.length);
    for (let j = 0; j < n; j++) { h.push(l / n); k0.push(R ? 1 / R : 0); wl.push(o.wl(i)); wr.push(o.wr(i)); } });
  const M = h.length, cyc = o.closed && M >= 6, n = cyc ? M : M + 1;          // 점 수: 닫힌 코스는 마지막 점 = 처음 점
  const W = i => cyc ? ((i % n) + n) % n : i;
  const hA = i => h[cyc ? W(i) : Math.max(0, Math.min(M - 1, i))];          // 점 i 와 i+1 사이 조각
  const kA = i => k0[cyc ? W(i) : Math.max(0, Math.min(M - 1, i))];
  // ---------- 점마다 경계 · 슬라럼 제약 (점 양쪽 조각 폭의 평균)
  const lo = new Float64Array(n), hi = new Float64Array(n);
  for (let i = 0; i < n; i++) { const a = cyc ? W(i) : Math.min(M - 1, i), b = cyc ? W(i - 1) : Math.max(0, i - 1);
    const L = (wl[a] + wl[b]) / 2 - o.b, Rr = (wr[a] + wr[b]) / 2 - o.b; lo[i] = -Rr; hi[i] = L; if (lo[i] > hi[i]) lo[i] = hi[i] = (L - Rr) / 2; }
  if (!cyc) { lo[0] = hi[0] = 0; lo[n - 1] = hi[n - 1] = 0; }                // 열린 코스: 출발 · 끝은 가운데
  // ---------- 목적: Σ hn (kn + D2e)²  (D2e = 점 i 의 2계 차분) → ½ eᵀQe + gᵀe
  const q0 = new Float64Array(n), q1 = new Float64Array(n), q2 = new Float64Array(n), g = new Float64Array(n);
  const addQ = (i, j, v) => { const d = cyc ? W(j - i) : j - i; if (d === 0) q0[i] += v; else if (d === 1) q1[i] += v; else if (d === 2) q2[i] += v;
    else if (d === n - 1) q1[j] += v; else q2[j] += v; };                     // 닫힌 코스: 처음 ↔ 끝 연결
  for (let i = cyc ? 0 : 1; i < (cyc ? n : n - 1); i++) {
    const hm = hA(i - 1), hp = hA(i), hn = (hm + hp) / 2, kn = (kA(i - 1) * hm + kA(i) * hp) / (hm + hp);
    const c = [1 / (hm * hn), -(1 / hm + 1 / hp) / hn, 1 / (hp * hn)], idx = [W(i - 1), i, W(i + 1)];
    for (let a = 0; a < 3; a++) { g[idx[a]] += hn * kn * c[a];
      for (let b = a; b < 3; b++) addQ(idx[a], idx[b], hn * c[a] * c[b]); }
  }
  for (let i = 0; i < n; i++) q0[i] += 1e-9;                                    // 곧은 코스에서도 풀리게 (아주 작은 가운데 쪽 당김)
  // ---------- 1차: 슬라럼 없이 → 첫 콘 방향을 정하고, 2차: 슬라럼 넣어서
  let e = boxQP(q0, q1, q2, g, lo, hi);
  const cones = (o.cones || []).slice().sort((a, b) => a - b);
  if (cones.length) {
    const groups = []; cones.forEach(c => { const gl = groups[groups.length - 1]; if (gl && c - gl[gl.length - 1] < 20) gl.push(c); else groups.push([c]); });
    groups.forEach(gp => { const sgn0 = e[segNode[gp[0]]] >= 0 ? 1 : -1;   // 묶음의 첫 콘 = 제약 없이 푼 경로 쪽
      gp.forEach((c, j) => { const i = segNode[c], sg = j % 2 ? -sgn0 : sgn0; if (sg > 0) lo[i] = Math.max(lo[i], o.b); else hi[i] = Math.min(hi[i], -o.b); if (lo[i] > hi[i]) lo[i] = hi[i]; }); });
    e = boxQP(q0, q1, q2, g, lo, hi, e);
  }
  const res = lineOut(e, { h, k0, cyc, n, M, segNode, lo, hi });
  if (o.key) RLC.set(o.key, res);
  return res;
}

// 경계 · 콘에서 차 중심까지 최소 거리 b [m]: 차 전폭이 있으면 전폭 ÷ 2 + 여유, 없으면 (0 · 빈칸) 직접 넣은 최소 거리
const rlB = I => I.w_car > 0 ? I.w_car / 2 + Math.max(0, I.rl_m || 0) : Math.max(0, I.rl_b);

// ================================================================ 주행선 다듬기 (랩타임 직접 줄이기, I.rl_on = 2)
// 최소 곡률 주행선에서 출발해, 경로를 조금씩 옮겨 보고 준정상 랩타임이 줄면 받아들임 (줄지 않으면 버림 → 최소 곡률보다 느려지지 않음)
//   옮기는 모양: ① 코스 전체 (한쪽으로 · 긴 물결 4개) → ② 3 m 간격 종 모양 (폭 3 m), 크기 0.2 → 0.1 → 0.05 → 0.025 m
//   경계 · 슬라럼 콘 제약은 그대로 (넘으면 경계로 자름)
//   랩타임: 개방 전압 · 모터 온도 고정, 1 m 칸.  flying = 두 바퀴 이어 달린 두 번째 바퀴 (내구 · 여러 랩), 아니면 정지 출발 한 바퀴
//   (Kapania 외 2016 의 '경로 → 속도 → 경로' 반복과 같은 목적. 경로를 정하는 단계만 볼록 문제 대신 랩타임 직접 비교)
// 다듬기용 빠른 랩타임: 조각 하나 = 계산 칸 하나, 바뀐 곳 둘레만 앞 · 뒤 계산을 다시 함 (나머지 칸 속도는 그대로라 같은 값)
//   flying (달리던 랩): 한계 속도가 가장 낮은 점(가장 느린 코너)에서 그 속도로 출발해 한 바퀴 → 이어 달린 랩과 거의 같음
//   아니면 조각 0 에서 정지 출발 한 바퀴
function lapModel(C, M, V, flying) {
  const N = M + 1, L = new Float64Array(M), K = new Float64Array(M);
  const lim = new Float64Array(N), vf = new Float64Array(N), af = new Float64Array(N), v = new Float64Array(N);
  const S = { lim: new Float64Array(N), vf: new Float64Array(N), af: new Float64Array(N), v: new Float64Array(N) };
  let st = 0, v0 = 0, T = 0;                             // 출발 조각 · 출발 속도
  const pc = i => (i + st) % M;                          // 칸 i → 조각
  const kAt = i => i < 0 || i >= M ? (flying ? K[pc(((i % M) + M) % M)] : 0) : K[pc(i)], lAt = i => L[pc(i)];
  const limAt = i => Math.min(C.vCorner(Math.max(Math.abs(kAt(i - 1)), Math.abs(kAt(i)))), C.vtop);
  const vm = (vv, i) => (vv[i] + vv[i + 1]) / 2;
  const m = {
    L, K,
    full() {
      if (flying) { let b = 0, bv = Infinity; st = 0; for (let i = 0; i < M; i++) { const x = limAt(i); if (x < bv) { bv = x; b = i; } } st = b; v0 = bv; }
      for (let i = 0; i < N; i++) lim[i] = limAt(i);
      vf[0] = Math.min(lim[0], v0); let a = 0;
      for (let i = 0; i < N - 1; i++) { a = C.aDrive(vf[i], kAt(i), a, V, C.Tinit); af[i] = a; vf[i + 1] = Math.min(lim[i + 1], Math.sqrt(Math.max(0, vf[i] * vf[i] + 2 * a * lAt(i)))); }
      v[N - 1] = flying ? Math.min(vf[N - 1], v0) : vf[N - 1];
      for (let i = N - 2; i >= 0; i--) { const b = C.aBrake(v[i + 1], kAt(i)); v[i] = Math.min(vf[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * b * lAt(i))); }
      T = 0; for (let i = 0; i < M; i++) { const u = vm(v, i); T += u > 0 ? lAt(i) / u : 0; }
      return T;
    },
    get T() { return T; },
    // 조각 js 를 새 [길이, 곡률] (nl, nk) 로 바꾸면 랩타임이 얼마? (받아들이면 apply)
    trial(js, nl, nk) {
      const oL = js.map(j => L[j]), oK = js.map(j => K[j]);
      js.forEach((j, q) => { L[j] = nl[q]; K[j] = nk[q]; });
      S.lim.set(lim); S.vf.set(vf); S.af.set(af); S.v.set(v);
      const cell = j => (j - st + M) % M;
      let lo = N, hi = -1;
      for (const j of js) { const i = cell(j); for (const k of [i, i + 1]) { S.lim[k] = limAt(k); lo = Math.min(lo, k); hi = Math.max(hi, k); }
        if (flying && i === 0) { S.lim[N - 1] = limAt(N - 1); hi = N - 1; } if (flying && i === M - 1) { S.lim[0] = limAt(0); lo = 0; } }
      // 앞으로 (가속): lo − 1 부터, hi 를 지나 예전 값과 같아지면 멈춤
      let i = Math.max(0, lo - 1), fEnd = hi, a = i > 0 ? S.af[i - 1] : 0;
      if (lo === 0) S.vf[0] = Math.min(S.lim[0], v0);
      for (; i < N - 1; i++) {
        a = C.aDrive(S.vf[i], kAt(i), a, V, C.Tinit); S.af[i] = a;
        const nv = Math.min(S.lim[i + 1], Math.sqrt(Math.max(0, S.vf[i] * S.vf[i] + 2 * a * lAt(i))));
        // 예전과 같아지면 멈춤 (가속도 a 는 다음 칸 반복 계산의 첫 값으로만 쓰여 아주 작은 차이는 무시)
        if (i + 1 > hi && Math.abs(nv - vf[i + 1]) <= 1e-12 * (1 + nv) && Math.abs(a - af[i]) <= 1e-7) { S.vf[i + 1] = vf[i + 1]; S.af[i] = af[i]; fEnd = i + 1; break; }
        S.vf[i + 1] = nv; fEnd = i + 1;
      }
      // 뒤로 (제동): fEnd 부터, lo 앞에서 예전 값과 같아지면 멈춤
      if (fEnd >= N - 1) S.v[N - 1] = flying ? Math.min(S.vf[N - 1], v0) : S.vf[N - 1];
      let k = Math.min(N - 2, fEnd), bLo = 0;
      for (; k >= 0; k--) { const b = C.aBrake(S.v[k + 1], kAt(k)), nv = Math.min(S.vf[k], Math.sqrt(S.v[k + 1] * S.v[k + 1] + 2 * b * lAt(k)));
        if (k < lo - 1 && nv === v[k]) { S.v[k] = nv; bLo = k; break; } S.v[k] = nv; bLo = k; }
      // 시간 차이: 속도가 바뀐 칸 [bLo, fEnd) + 길이만 바뀐 칸 (예전 시간은 예전 길이로)
      const oLen = new Map(); js.forEach((j, q) => oLen.set(j, oL[q]));
      const cells = new Set(); for (let q = bLo; q < Math.min(M, fEnd + 1); q++) cells.add(q); js.forEach(j => cells.add(cell(j)));
      let d = 0;
      cells.forEach(q => { const j = pc(q), un = vm(S.v, q), uo = vm(v, q); d += (un > 0 ? L[j] / un : 0) - (uo > 0 ? (oLen.has(j) ? oLen.get(j) : L[j]) / uo : 0); });
      js.forEach((j, q) => { L[j] = oL[q]; K[j] = oK[q]; });   // 되돌려 둠
      return { T: T + d, apply: () => { js.forEach((j, q) => { L[j] = nl[q]; K[j] = nk[q]; }); lim.set(S.lim); vf.set(S.vf); af.set(S.af); v.set(S.v); T += d; } };
    },
  };
  return m;
}
function improveLine(RL, C, V, flying, prog) {
  const geo = RL.geo, n = geo.n, lo = geo.lo, hi = geo.hi, cyc = geo.cyc, h = geo.h, k0 = geo.k0, M = geo.M;
  let e = Float64Array.from(RL.eAll);
  // 조각 j 의 [길이, 곡률] (lineOut 과 같은 식)
  const W = i => ((i % n) + n) % n, hA = i => h[cyc ? ((i % M) + M) % M : Math.max(0, Math.min(M - 1, i))];
  const E = (x, i) => cyc ? x(W(i)) : x(Math.max(0, Math.min(n - 1, i)));   // x = 점 번호 → 옆 거리
  const D2 = (x, i) => { const hm = hA(i - 1), hp = hA(i), hn = (hm + hp) / 2; return ((E(x, i + 1) - E(x, i)) / hp - (E(x, i) - E(x, i - 1)) / hm) / hn; };
  const piece = (x, j) => { const em = (E(x, j) + E(x, j + 1)) / 2, de = (E(x, j + 1) - E(x, j)) / h[j];
    const dd = cyc ? (D2(x, j) + D2(x, j + 1)) / 2 : (j > 0 ? D2(x, j) : 0) / 2 + (j + 1 < n - 1 ? D2(x, j + 1) : 0) / 2;
    return [h[j] * (1 - k0[j] * em) * Math.sqrt(1 + de * de), (k0[j] + dd) / (1 - k0[j] * em)]; };
  const mdl = lapModel(C, M, V, flying);
  for (let j = 0; j < M; j++) { const [l, k] = piece(i => e[i], j); mdl.L[j] = l; mdl.K[j] = Math.abs(k) > 1e-5 ? k : 0; }
  const t0 = mdl.full();
  let evals = 1;
  // 점 몇 개를 옮겨 보고 랩타임이 줄면 받아들임.  pts = [[점, 옮길 양]]
  const tryMove = pts => {
    const y = new Map(); pts.forEach(([i, d]) => { const v = Math.max(lo[i], Math.min(hi[i], e[i] + d)); if (v !== e[i]) y.set(i, v); });
    if (!y.size) return false;
    const js = new Set(); y.forEach((_, i) => { for (let j = i - 2; j <= i + 1; j++) { const q = cyc ? ((j % M) + M) % M : j; if (q >= 0 && q < M) js.add(q); } });
    const X = i => y.has(i) ? y.get(i) : e[i];
    const J = [...js], nl = [], nk = []; J.forEach(j => { const [l, k] = piece(X, j); nl.push(l); nk.push(Math.abs(k) > 1e-5 ? k : 0); });
    const r = mdl.trial(J, nl, nk); evals++;
    if (r.T < mdl.T - 1e-5) { r.apply(); y.forEach((v, i) => { e[i] = v; }); return true; }
    return false;
  };
  // ① 코스 전체를 옮기는 모양 (한쪽으로 · 물결 k = 1 ~ 4)
  const shapes = [i => 1];
  for (let k = 1; k <= 4; k++) for (const ph of [0, Math.PI / 2]) shapes.push(i => cyc ? Math.cos(2 * Math.PI * k * i / n + ph) : Math.sin(Math.PI * k * i / (n - 1) + ph));
  const all = Array.from({ length: n }, (_, i) => i);
  for (const a of [0.2, 0.05]) for (const f of shapes) for (const sg of [1, -1]) { let m = 0; while (m++ < 40 && tryMove(all.map(i => [i, sg * a * f(i)]))); }
  // ② 3 m 간격 종 모양 (폭 3 m)
  const SP = 3, WID = 3, cs = []; for (let c = 0; c < n; c += SP) cs.push(c);
  const bump = (c, a) => { const r = []; for (let d = -4 * WID; d <= 4 * WID; d++) { let i = c + d; if (cyc) i = W(i); else if (i < 0 || i >= n) continue; r.push([i, a * Math.exp(-0.5 * (d / WID) ** 2)]); } return r; };
  const amps = [0.2, 0.1, 0.05, 0.025];
  amps.forEach((a, ai) => {
    let live = cs.map((_, j) => j);
    for (let pass = 0; pass < 4 && live.length; pass++) {
      const t1 = mdl.T, hit = [];
      for (const j of live) for (const sg of [1, -1]) if (tryMove(bump(cs[j], sg * a))) { hit.push(j); break; }
      if (prog) prog((ai + (pass + 1) / 4) / amps.length);
      if (t1 - mdl.T < 0.002) break;
      const nx = new Set(); hit.forEach(j => { for (let d = -3; d <= 3; d++) nx.add(((j + d) % cs.length + cs.length) % cs.length); });   // 받아들인 곳 둘레만 다시
      live = [...nx].sort((p, q) => p - q);
    }
  });
  const res = lineOut(e, geo);
  res.gain = t0 - mdl.T; res.evals = evals;
  return res;
}

let RLI = {}, RLI_LAST = {};   // 다듬은 주행선: 이번 계산 (코스별) · 마지막 전체 계산 (입력 훑기용)
const rlKey = I => JSON.stringify(I, (k, v) => ['course', 'lap', 'grMode', '_sweep', '_probe'].includes(k) ? undefined : v);
// 이번 입력으로 내구 · 오토크로스 · 내 코스 주행선을 다듬어 둠 (차량 · 감속비 = 입력 감속비, 같은 입력이면 다시 안 함)
function prepLines(I, sweep) {
  RLI = {};
  if (!(I.rl_on >= 2)) return;
  if (sweep) { RLI = RLI_LAST; return; }            // 입력 훑기: 지금 입력으로 다듬은 선을 그대로 (훑는 값마다 다시 다듬지 않음)
  const key = rlKey(I);
  if (RLI_LAST.key === key) { RLI = RLI_LAST; return; }
  const C = car(I, I.gr, 1), V = C.Voc(1), E = I.end || {}, F = freeSegs({ ...I, rl_on: 1 });
  const jobs = [];
  if ((E.seg || []).length) jobs.push(['end', '내구', () => drivenSegs({ ...I, rl_on: 1 }, 'end', E.seg, true), true],
                                      ['ax', '오토크로스', () => drivenSegs({ ...I, rl_on: 1 }, 'ax', reverse(E.seg), true), false]);
  if (F && F.rl && F.rl.eN) jobs.push(['free', '내 코스', () => F.rl, F.m > 1]);
  const out = { key };
  jobs.forEach(([w, name, base, fly], k) => {
    const pg = typeof wbProg === 'function' ? f => wbProg((k + f) / (jobs.length + 1), \`주행선 다듬는 중 · \${name}\`) : null;
    if (pg) pg(0);
    out[w] = improveLine(base(), C, V, fly, pg);
  });
  if (typeof wbProg === 'function') wbProg(jobs.length / (jobs.length + 1), '기록 계산 중');
  RLI = RLI_LAST = out;
}

// 코스 구간 → 실제로 달리는 구간 (I.rl_on = 1 이면 최소 곡률 주행선, 2 면 그것을 랩타임으로 다듬은 선, 0 이면 가운데 선)
function drivenSegs(I, which, segs, closed) {
  if (!(I.rl_on > 0) || !segs.length) return { segs, e: null, len: sum(segs.map(r => r[0])) };
  if (I.rl_on >= 2 && RLI[which]) return RLI[which];
  const E = I.end || {}, b = rlB(I);
  if (which === 'end' || which === 'ax') {
    const N = segs.length, wl = E.WL || [], wr = E.WR || [], rev = which === 'ax';
    const W = (arr, i) => arr.length ? (arr[i] + arr[(i + 1) % arr.length]) / 2 : 1.75;
    const o = { closed: true, b, key: \`\${which}|\${b}|\${JSON.stringify(segs)}|\${JSON.stringify(E.slalom || [])}|\${JSON.stringify(wl)}|\${JSON.stringify(wr)}\`,
      wl: i => rev ? W(wr, N - 1 - i) : W(wl, i), wr: i => rev ? W(wl, N - 1 - i) : W(wr, i),
      cones: (E.slalom || []).map(j => rev ? (N - j) % N : j) };   // 거꾸로 달리면 왼쪽 · 오른쪽 폭이 바뀌고, 점 j = 거꾸로 구간 N − j 의 시작
    return racingLine(segs, o);
  }
  const w = Math.max(0, I.w_free) / 2;                                    // 내 코스: 폭 입력 (가운데에서 양쪽 같게)
  return racingLine(segs, { closed, b, wl: () => w, wr: () => w, key: \`free|\${b}|\${w}|\${closed}|\${JSON.stringify(segs)}\` });
}


// ================================================================ 주행
// 차속 [m/s]: 코너 한계 → 앞으로 가속 (정지 출발) → 뒤에서 제동.  V0[i] = 칸마다 개방 전압 [V], TM[i] = 모터 온도 [°C]
function speed(C, G, V0, TM) {
  const N = G.s.length, v = new Array(N), lim = new Array(N);
  for (let i = 0; i < N; i++) {
    lim[i] = Math.min(C.vCorner(Math.max(Math.abs(G.k[i - 1] || 0), Math.abs(G.k[i] || 0))), C.vtop);
  }
  v[0] = 0;
  let a = 0;
  for (let i = 0; i < N - 1; i++) {                       // 앞으로: 가속
    a = C.aDrive(v[i], G.k[i], a, V0[i], TM ? TM[i] : C.Tinit);
    v[i + 1] = Math.min(lim[i + 1], Math.sqrt(Math.max(0, v[i] * v[i] + 2 * a * (G.s[i + 1] - G.s[i]))));
  }
  for (let i = N - 2; i >= 0; i--) {                      // 뒤로: 제동
    const b = C.aBrake(v[i + 1], G.k[i]);
    v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * b * (G.s[i + 1] - G.s[i])));
  }
  return { v, lim };
}

// 차속 → 누적 시간 [s] · 단자 에너지 et [J] · 소비 에너지 ec [J] (저항 손실 포함) · 모터 온도 tm [°C] (출발 T0).  rec 이면 그래프 신호도
function walk(C, G, v, V0, rec, T0) {
  const N = v.length, tc = [0], et = [0], ec = [0], tm = [T0 != null ? T0 : C.Tinit];
  const S = rec ? { pw: [], ax: [], ay: [], rpm: [], tq: [], tlim: [], pbat: [], vbat: [], voc: [], eta: [], tmot: [], grip: [],
                    fz_fo: [], fz_fi: [], fz_ro: [], fz_ri: [] } : null;
  let vmin = Infinity;
  for (let i = 0; i < N - 1; i++) {
    const ds = G.s[i + 1] - G.s[i], vm = (v[i] + v[i + 1]) / 2, dt = vm > 0 ? ds / vm : Infinity;
    const ax = (v[i + 1] * v[i + 1] - v[i] * v[i]) / (2 * ds);   // 종가속도 [m/s²]
    const F = C.meff * ax + C.Fres(vm);                            // 바퀴 힘 [N] (제동 중 −)
    const E = C.elec(F, vm, V0[i]);
    tc.push(tc[i] + dt);
    et.push(et[i] + E.P * dt);
    ec.push(ec[i] + V0[i] * E.I * dt);
    tm.push(C.tmNext(tm[i], E.L, isFinite(dt) ? dt : 0));        // 모터 온도: 손실로 오르고 냉각으로 내림
    if (E.V < vmin) vmin = E.V;
    if (rec) {
      const ay = vm * vm * Math.abs(G.k[i]);
      const [fo, fi] = C.wheels(C.Fzf(vm, ax), C.dF(ay, true)), [ro, ri] = C.wheels(C.Fzr(vm, ax), C.dF(ay, false));
      S.pw.push(F * vm / 1000);        // 바퀴 출력 [kW]
      S.ax.push(ax / g);               // [g]
      S.ay.push(ay / g);               // [g]
      S.rpm.push(C.rpm(v[i]));         // [rpm]
      S.tq.push(E.T);                  // [N·m]
      S.tlim.push(C.Tcurve(C.rpm(v[i]), V0[i], tm[i]));   // 그 순간 토크 한계 (디레이팅 포함) [N·m]
      S.tmot.push(tm[i]);              // 모터 온도 [°C]
      S.voc.push(V0[i]);               // 개방 전압 [V] (구동력 선도 프로브용)
      S.pbat.push(E.P / 1000);         // 단자 출력 [kW]
      S.vbat.push(E.V);                // 단자 전압 [V]
      S.eta.push(E.P > 0 ? E.e * 100 : NaN);   // [%]
      S.grip.push(Math.hypot(C.m * ax, C.m * ay) / Math.max(1e-9, C.capF(vm, ax, ay) + C.capR(vm, ax, ay)) * 100);   // [%]
      S.fz_fo.push(fo); S.fz_fi.push(fi); S.fz_ro.push(ro); S.fz_ri.push(ri);   // 바퀴 하중 [N]
    }
  }
  if (rec) for (const k in S) S[k].push(S[k][S[k].length - 1]);
  return { tc, et, ec, tm, S, vmin };
}

// 랩 m개를 이어서 정지 출발.  랩마다 SOC → 개방 전압, 칸마다 모터 온도 (두 번: 처음은 출발 값 그대로, 다음은 앞 계산으로 고침)
//   fixedV 를 주면 전압 고정 (SOC 계산 안 함, 줄여 셈).  T0 = 출발 모터 온도 [°C]
function laps(C, segs, m, ds, soc0, fixedV, T0) {
  const P = grid(segs, ds).s.length - 1, rep = [];
  for (let j = 0; j < m; j++) rep.push(...segs);
  const G = grid(rep, ds), N = G.s.length, t0 = T0 != null ? T0 : C.Tinit;
  let V0 = new Array(N).fill(fixedV || C.Voc(soc0)), TM = null, sp, W, socs = [];
  const passes = fixedV && !C.thK ? 1 : 2;               // 디레이팅이 있으면 온도를 반영해 한 번 더
  for (let pass = 0; pass < passes; pass++) {
    sp = speed(C, G, V0, TM);
    W = walk(C, G, sp.v, V0, false, t0);
    if (C.thK) TM = W.tm;
    if (fixedV) continue;
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
  return { G, v: sp.v, lim: sp.lim, V0, TM: W.tm, T0: t0, P, t, Et, Ec, socs, vmin: W.vmin, soc1, T1: W.tm.at(-1) };
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
  const G = grid([[ACC_L, 0]], 0.5), V = new Array(G.s.length).fill(C.Voc(1)), sp = speed(C, G, V, null), W = walk(C, G, sp.v, V, false);
  const Ec = W.ec.at(-1);
  return { G, v: sp.v, lim: sp.lim, V0: V, TM: W.tm, T0: C.Tinit, P: G.s.length - 1, t: [W.tc.at(-1)], Et: [W.et.at(-1)], Ec: [Ec], socs: [1],
           soc1: 1 - Ec / C.Epack, T1: W.tm.at(-1) };
}

// 스키드패드: 일정 반경 R [m] 에서 가장 빠른 일정 차속 [m/s] (앞축 횡력 · 뒤축 마찰원 · 모터 힘) → 이분법
//   R 부호 = 방향 (+ 왼쪽 · − 오른쪽). 지금 모델은 좌우 대칭이라 같은 값 (좌우 무게 배분은 나중에)
function skidV(C, R, V0) {
  R = Math.abs(R);
  const m = C.m, fs = C.fs;
  const ok = v => {
    const ay = v * v / R, Fx = C.Fres(v);
    if (C.drive(v, V0, C.Tinit).F < Fx) return false;
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
  return segs.length ? laps(C, drivenSegs(I, 'ax', reverse(segs), true).segs, 1, ds, 1, C.Voc(1)) : null;
}

// 내구: 드라이버 2명이 n1 · n2 랩을 각각 정지 출발로 이어서 (교체 시간 제외)
//   full = 랩을 모두 계산 (SOC 반영),  아니면 3랩으로 줄여 셈 (SOC 중간값 고정, 감속비 찾기용)
function endurance(I, C, full, ds) {
  const E = I.end || {}, n = E.laps || 26, n1 = E.stint || Math.floor(n / 2), n2 = n - n1;
  const segs = drivenSegs(I, 'end', E.seg || [], true).segs;
  if (!segs.length) return null;
  if (full) {
    const A = laps(C, segs, n1, ds, 1), B = laps(C, segs, n2, ds, A.soc1, undefined, A.T1);   // 모터 온도는 교체 뒤에도 이어짐
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
  const sg = closed ? rotate(segs0, s0) : segs0;
  const D = drivenSegs(I, 'free', sg, closed);
  return { segs: D.segs, m: closed ? m : 1, rl: D };
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
//   스키드패드 기록 = 오른쪽 한 바퀴 + 왼쪽 한 바퀴 [s]
function events(I, gr, fast) {
  const ds = fast ? 3 : 1, C = car(I, gr, 1);
  const vR = skidV(C, -SK_R, C.Voc(1)), vL = skidV(C, SK_R, C.Voc(1));
  const X = runAx(I, C, ds), EN = runEnd(I, gr, !fast);
  return { C, acc: runAcc(C).t[0], skid: SK_C / vR + SK_C / vL, tR: SK_C / vR, tL: SK_C / vL, vs: Math.min(vR, vL),
           ax: X ? X.t[0] : NaN, X, EN, end: EN ? EN.T : NaN };
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
// 스키드패드 목표 기록 (좌우 한 바퀴 합) → 필요한 C_L·A [m²] (공력 중심 위치는 그대로, 크기만)
//   지금보다 남으면 − 까지 (그만큼 줄여도 됨).  ±15 m² 를 넘으면 NaN
function claNeed(I, gr) {
  if (!(I.t_skid > 0)) return NaN;
  const keep = VC;
  const tAt = c => { VC = new Map(); const C = car({ ...I, cla: c }, gr, 1), V = C.Voc(1); return SK_C / skidV(C, -SK_R, V) + SK_C / skidV(C, SK_R, V); };
  let r, lo = -15, hi = 15;
  if (tAt(hi) > I.t_skid || tAt(lo) < I.t_skid) r = NaN;
  else {
    for (let i = 0; i < 45; i++) { const md = (lo + hi) / 2; if (tAt(md) > I.t_skid) lo = md; else hi = md; }
    r = (lo + hi) / 2;
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


// ================================================================ 한 모드의 결과 (감속비 G2 로 종목 기록 · 차량 한계, 고른 코스는 G3)
function modeRun(I, G2, G3, fast) {
  const E   = events(I, G2, false);
  const C   = E.C, EN = E.EN;
  const end = EN ? lapStat(EN.t, [0, EN.n1]) : null;
  const out = {
    // 종목 기록
    gr_use: G2,
    t_acc_s: E.acc, t_skid_s: E.skid, t_skid_r: E.tR, t_skid_l: E.tL, t_ax_s: E.ax, t_end_s: E.end,
    t_end1: end ? end.first : NaN, t_endavg: end ? end.avg : NaN, n_lap: EN ? EN.n : NaN, n_st1: EN ? EN.n1 : NaN,
    d_acc: E.acc - fast.acc, d_ax: E.ax - fast.ax, d_end: E.end - fast.end,
    // 차량 한계
    vmax: C.vtop * 3.6, v_top: E.X ? Math.max(...E.X.v) * 3.6 : NaN, ay_skid: E.vs * E.vs / SK_R / g,
    ax_0: C.aDrive(0, 0, 0, C.Voc(1), C.Tinit) / g, cla_req: claNeed(I, G2),
    // 내구 (대시보드 반영 · 검증용)
    e_ok: EN ? (EN.Ec <= C.Ecap * 1.01 ? 1 : 0) : NaN, e_use: EN ? EN.Ec / 3.6e6 : NaN, p_lim: EN ? EN.k * 100 : NaN,
    e_lap: EN ? lapStat(EN.et, [0, EN.n1]).avg / 3.6e6 : NaN,
    // 내구 전체 에너지 [kWh]: 지금 설정 그대로 (에너지 상한이 걸리면 출력을 낮춘 값) · 출력 상한 없이 (배율 1) 달렸을 때
    e_end_t: EN ? EN.Et / 3.6e6 : NaN, e_end_c: EN ? EN.Ec / 3.6e6 : NaN,
    ...(() => { if (!EN) return { e_nl_t: NaN, e_nl_c: NaN };
                const F = EN.k < 1 ? endurance(I, car(I, G2, 1), true, 1) : EN;
                return { e_nl_t: F.Et / 3.6e6, e_nl_c: F.Ec / 3.6e6 }; })(),
  };

  // ---------- 고른 코스 (감속비 G3)
  const c = I.course, K = runCourse(I, c, G3);
  if (!K) return { out, x: { d: [0] }, sig: {}, map: null };

  // 볼 랩 고르기: 내구는 드라이버 A · B 두 줄을 이어 붙임
  let G, v, lim, V0, TM, from = 0, to, P, n;
  if (K.EN) {
    const A = K.EN.A, B = K.EN.B, off = A.G.s.at(-1);
    G   = { s: [...A.G.s, ...B.G.s.slice(1).map(x => x + off)], k: [...A.G.k, ...B.G.k] };
    v   = [...A.v, ...B.v.slice(1)];
    lim = [...A.lim, ...B.lim.slice(1)];
    V0  = [...A.V0, ...B.V0.slice(1)];
    TM  = [...A.TM, ...B.TM.slice(1)];
    P = A.P; n = K.EN.n;
  } else {
    ({ G, v, lim, V0, TM, P } = K.L); n = K.L.t.length;
  }
  const j = I.lap === 'all' || n === 1 ? -1 : Math.max(1, Math.min(n, parseInt(I.lap) || 1)) - 1;
  if (j >= 0) { from = j * P; to = (j + 1) * P; } else to = G.s.length - 1;
  const jm = j >= 0 ? j : (n > 1 ? 1 : 0);                // 지도에 칠할 랩 ('전체'면 2번째)
  const vk = v.map(a => a * 3.6);
  const map = K.skid ? { skid: true } : c === 'acc' ? { acc: true } : { P, rev: !!K.rev, vc: vk.slice(jm * P, (jm + 1) * P + 1) };
  map.lo = Math.min(...vk); map.hi = Math.max(...vk);     // 색 범위 = 모든 랩 통틀어 (어느 랩을 봐도 같은 색 = 같은 차속)
  // 주행선: 지도에 그릴 옆 거리 (코스 원래 방향 기준, 왼쪽 +) · 한 랩 길이
  const segE = (I.end && I.end.seg) || [];
  const RL = c === 'end' ? drivenSegs(I, 'end', segE, true) : c === 'ax' ? drivenSegs(I, 'ax', reverse(segE), true) : c === 'free' ? freeSegs(I).rl : null;
  if (RL && RL.eN) {
    const Lc = RL.sN.at(-1);                               // 오토크로스는 거꾸로 달리므로 거리 · 좌우를 되돌림
    map.rl = c === 'ax' ? { s: RL.sN.map(x => Lc - x).reverse(), e: RL.eN.map(x => -x).reverse() } : { s: RL.sN, e: RL.eN };
  }

  const sl = a => a.slice(from, to + 1);
  const Gs = { s: sl(G.s).map(x => x - G.s[from]), k: G.k.slice(from, to) }, vv = sl(v);
  const W  = walk(K.C, Gs, vv, sl(V0), true, TM[from]);

  // ---------- 고른 코스 결과 (볼 랩)
  const lt = K.EN ? K.EN.t : K.L.t, le = K.EN ? K.EN.et : K.L.Et, lc = K.EN ? K.EN.ec : K.L.Ec, soc = K.EN ? K.EN.soc : K.L.socs;
  const ls = lapStat(lt, K.stand), jj = I.lap !== 'all' && lt.length > 1 ? j : -1;
  const pick = a => jj >= 0 ? a[jj] : sum(a);
  const socEnd = K.EN ? K.EN.soc1 : (K.L.soc1 != null ? K.L.soc1 : NaN);
  Object.assign(out, {
    c_gr: G3, c_n: lt.length, c_lap: jj + 1, c_len: RL ? RL.len : NaN, c_rl: RL && RL.eN ? (RL.gain != null ? 2 : 1) : 0, c_rlg: RL && RL.gain != null ? RL.gain : NaN, c_rlb: rlB(I),
    c_t: c === 'skid' ? E.skid : lt.length > 1 ? (jj >= 0 ? lt[jj] : ls.total) : lt[0],
    c_t1: ls.first, c_tavg: ls.avg, c_ttot: ls.total,
    c_vtop: Math.max(...vv) * 3.6,
    c_rpm: Math.max(...W.S.rpm), c_tq: Math.max(...W.S.tq), c_pbat: Math.max(...W.S.pbat), c_vmin: Math.min(...W.S.vbat),
    c_tm: W.tm.at(-1), c_tmax: Math.max(...W.tm),
    c_et: pick(le) / 3.6e6, c_ec: pick(lc) / 3.6e6,
    c_soc: (jj >= 0 ? (soc[jj + 1] ?? socEnd) : socEnd) * 100,
    c_plim: K.k != null ? K.k * 100 : NaN,
    c_cap: K.EN ? K.C.Ecap / 3.6e6 : NaN,
    c_co2: K.EN ? (K.EN.Et / 3.6e6) * 1.3 / (K.EN.n * sum(I.end.seg.map(r => r[0])) / 1000) * 100 : NaN,
  });
  return {
    out, x: { d: Gs.s },
    sig: { v: vv.map(a => a * 3.6), vlim: sl(lim).map(a => a * 3.6), t: W.tc, ecum: W.et.map(e => e / 3600), ...W.S },
    map,
  };
}

// 구동력 선도 [N] (차속 0 ~ 최고속): 그 점의 전압 V · 모터 온도 Tm · 횡가속도 ay · 종가속도 ax [m/s²] 에서
//   f_mt  = 모터 토크 곡선 한계 (디레이팅 포함) → 바퀴 힘
//   f_mp  = 단자 출력 상한 (규정 · 전류 · 에너지 제한) × 효율 → 바퀴 힘
//   f_m   = 실제 모터 구동력 = 둘 중 작은 쪽 (전압 강하 반영)
//   f_x   = 뒤축 접지 한계 (마찰원에서 횡력을 뺀 나머지),  f_b = 제동 접지 한계 (네 바퀴, −),  f_res = 주행 저항
function tractive(I, gr, V, Tm, ay, ax) {
  const C  = car(I, gr, 1);
  const VV = Array.from({ length: 121 }, (_, i) => C.vtop * i / 120);
  const Fyr = C.m * ay * (1 - C.fs), Fy = C.m * ay;
  const toF = T => T * gr * C.eta / C.r;
  const f_mt = VV.map(x => toF(C.Tcurve(C.rpm(x), V, Tm)));
  const f_mp = VV.map(x => { const n = C.rpm(x), w = n * 2 * Math.PI / 60, T = C.Tcurve(n, V, Tm), e = C.elec(toF(T), x, V).e;
                             return w > 0 ? toF(C.ptMax(V) * e / w) : NaN; });
  const f_b = VV.map(x => { let d = 0;
    for (let it = 0; it < 3; it++) { const N = C.capF(x, -d, ay) + C.capR(x, -d, ay); d = Math.sqrt(Math.max(0, N * N - Fy * Fy)) / C.meff; }
    return -d * C.meff; });
  // 그 점의 앞축: 필요한 횡력 · 낼 수 있는 힘 (차속은 그래프의 커서 차속을 UI 가 고름)
  const front = VV.map(x => ({ need: C.m * ay * C.fs, cap: C.capF(x, ax, ay) }));
  const cap = 1.3 * Math.max(...f_mt);                    // 출력 상한 곡선은 저속에서 무한대로 커지므로 토크 곡선의 1.3배에서 자름
  return { v: VV.map(x => x * 3.6), f_mt, f_mp: f_mp.map(f => f > cap ? NaN : f),
           f_m: VV.map(x => C.drive(x, V, Tm).F),
           f_x: VV.map(x => Math.sqrt(Math.max(0, C.capR(x, ax, ay) ** 2 - Fyr * Fyr))),
           f_b, f_res: VV.map(C.Fres), meff: C.meff, fy_need: front.map(f => f.need), fy_cap: front.map(f => f.cap) };
}


// ================================================================ 계산
function calc(I) {
  VC = new Map();

  // ---------- 구동력 선도 프로브: 그 점의 감속비 · 전압 · 모터 온도 · 가속도로 선도만
  if (I._probe) { RLI = {}; const p = I._probe; return { out: {}, ft: tractive(I, p.gr, p.V, p.Tm, p.ay, p.ax) }; }

  // ---------- 입력 훑기: 입력 감속비로 종목 기록만 (줄여 셈)
  if (I._sweep) {
    prepLines(I, true);
    const E = events(I, I.gr, true);
    const NL = E.EN ? (E.EN.k < 1 ? endurance(I, car(I, I.gr, 1), false, 3) : E.EN) : null;   // 출력 상한 없이 (줄여 셈)
    return { out: { t_acc_s: E.acc, t_skid_s: E.skid, t_ax_s: E.ax, t_end_s: E.end, e_use: E.EN ? E.EN.Ec / 3.6e6 : NaN, e_nl_c: NL ? NL.Ec / 3.6e6 : NaN,
                    p_lim: E.EN ? E.EN.k * 100 : NaN, vmax: E.C.vtop * 3.6, ay_skid: E.vs * E.vs / SK_R / g } };
  }

  // ---------- 주행선 다듬기 (I.rl_on = 2): 입력이 바뀌었을 때만
  prepLines(I, false);

  // ---------- 감속비 (두 모드 공통): 종목별 가장 빠른 값 · 배점 가중 제안, 그 감속비에서 다 계산한 기록
  const B = bestGr(I);
  const ENb  = runEnd(I, B.end, true);                   // 내구가 가장 빠른 감속비에서 다 계산
  const endb = ENb ? lapStat(ENb.t, [0, ENb.n1]) : null;
  const fast = {
    acc: runAcc(car(I, B.acc, 1)).t[0],
    ax:  (runAx(I, car(I, B.ax, 1), 1) || { t: [NaN] }).t[0],
    end: ENb ? ENb.T : NaN,
  };
  const BF = I.course === 'free' ? bestGrFree(I) : NaN;   // 내 코스: 최적 모드에서 고른 코스 감속비

  // ---------- 두 모드를 미리 계산 (전환은 다시 계산 없이)
  const my = modeRun(I, I.gr, I.gr, fast);
  const G3 = ({ acc: B.acc, ax: B.ax, end: B.end, free: BF, skid: B.opt })[I.course];
  const g3  = isFinite(G3) ? G3 : B.opt;
  const opt = B.opt === I.gr && g3 === I.gr ? { ...my, out: { ...my.out } } : modeRun(I, B.opt, g3, fast);
  const common = {
    gr_opt: B.opt, gr_acc: B.acc, gr_ax: B.ax, gr_end: B.end,
    tb_acc: fast.acc, tb_ax: fast.ax, tb_end: fast.end, tb_end1: endb ? endb.first : NaN, tb_endavg: endb ? endb.avg : NaN,
    n_base: nBase(I, car(I, I.gr, 1)),
  };
  const C = car(I, I.gr, 1);
  Object.assign(common, {
    v_load: C.Voc(1) - Math.min(C.Imax, C.Voc(1) / (2 * Math.max(C.Rb, 1e-9))) * C.Rb,   // 최대 전류 때 단자 전압 [V]
    p_max: C.ptMax(C.Voc(1)) / 1000,                                                       // 단자 출력 상한 [kW]
    e_cap: C.Ecap / 3.6e6, g_skid: I.t_skid,
  });
  Object.assign(my.out, common); Object.assign(opt.out, common);

  // ---------- 내 코스 (검증 · 대시보드용, 입력 감속비)
  const FR = runFree(I, C, 0.5, false);
  if (FR) {
    const fr = lapStat(FR.t, [0]);
    const fo = { t_free: fr.total, t_free1: fr.first, t_freeavg: fr.avg, n_free: FR.m, t_free2: FR.t.length > 1 ? FR.t[1] : NaN,
                 e_free: FR.Et[Math.min(1, FR.Et.length - 1)] / 3.6e6 };
    Object.assign(my.out, fo); Object.assign(opt.out, fo);
  }

  // ---------- 모터 · 효율 그림 (입력 감속비, SOC 100 %, 출발 모터 온도)
  const Vn = I.n_s * I.c_vnom, NN = Array.from({ length: 131 }, (_, i) => I.nmax * i / 130);
  const motor = { n: NN,
    tref:  NN.map(n => C.Tcurve(n, I.v_ref * (I.ke_ratio > 0 ? I.ke_ratio : 1))),
    tnom:  NN.map(n => C.Tcurve(n, Vn)),
    tload: NN.map(n => C.Tcurve(n, common.v_load)) };
  const ft = tractive(I, I.gr, C.Voc(1), C.Tinit, 0, 0);

  const cur = I.grMode === 'opt' ? opt : my;
  return { ...cur, modes: { my, opt }, motor, ft };
}
`
};

/* ============================================================ 대시보드 '파트별 > 차량 목표 · 파워트레인'
   대시보드 값으로 도구 2를 돌린 결과 (읽기 전용, 내 감속비 = 대시보드 감속비) */
const T2P = { R:null, key:'', busy:false, w:null };
const T2ONLY = ['v_ref', 'ke_ratio', 'eta_mot', 'eta_inv', 'c_vmax', 'c_vmin', 'c_vnom', 'c_ah', 'th_k', 'th_t0', 'th_c', 'th_r', 'th_cool', 'th_init', 'rl_on', 'w_car', 'rl_m', 'rl_b', 'w_free'];   // 대시보드에 없는 입력: 도구에 저장된 값을 씀
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
  if(kind==='goal'){ const rows = [['가속', I.t_acc, o.t_acc_s, 3], ['스키드패드 (좌우 합)', I.t_skid, o.t_skid_s, 3], ['오토크로스', I.t_ax, o.t_ax_s, 2], ['내구', I.t_end, o.t_end_s, 1]];
    return `<table class="dvi-t t2-gt"><thead><tr><th>종목</th><th>예상 기록</th><th>목표 기록</th><th>차이</th></tr></thead><tbody>${rows.map(([n, g0, t, d]) => { const has = g0 > 0, df = t - g0;
        return `<tr><td>${n}</td><td><b>${f(t, d)}</b> s</td><td>${has ? f(g0, d) + ' s' : '<span class="muted">정하지 않음</span>'}</td><td class="${has && isFinite(df) ? (df > 0 ? 'wb-err' : 'ok') : ''}">${has && isFinite(df) ? (df > 0 ? '+' : '−') + wbFmt(Math.abs(df), d) + ' s' : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="dp-note">대시보드 감속비 ${f(I.gr, 2)}로 계산. 목표 기록은 대시보드 '차량 목표'(공통) 값이고, 차이가 + 면 목표보다 느립니다. 도구 2의 제안 감속비는 ${f(o.gr_opt, 2)}.</p>`; }
  const F = R.ft; return `<div class="dp-plots">${wbPlot({id:'t2ft', w:640, h:280, x:{d:F.v, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:F.f_m, c:WB_COL[0], n:'모터 구동력', u:'N', dd:0}, {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}], yn:{'N':'바퀴 힘'}, hit:false, label:'구동력 선도'})}</div>
    <div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴, SOC 100 %)</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진 · 일정 속도)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항 (항력 + 구름)</span></div>
    <p class="dp-note">감속비 ${f(I.gr, 2)} · 회전수 한계 최고속 ${f(o.vmax, 1)} km/h · 단자 출력 상한 ${f(o.p_max, 1)} kW. 모터 구동력이 접지 한계보다 큰 구간은 바퀴가 미끄러지므로 접지 한계가 가속을 정합니다. 제안 감속비 ${f(o.gr_opt, 2)}, 내구 평균 랩 단자 에너지 ${f(o.e_lap, 3)} kWh.</p>`; }
