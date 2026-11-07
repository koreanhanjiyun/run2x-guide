/* ============================================================
   도구 2 — 랩타임 시뮬레이터 (QSS, 감속비 고르기 포함) · docs/TOOLS-PLAN.md 5절 · docs/HANDOFF.md 4-2절
   - 코스: 내 코스(사용자가 만든 코스) · 오토크로스 · 내구레이스 · 가속 · 스키드패드 (공식 4개는 고칠 수 없는 기본 코스)
     공식 내구 코스 = js/data/fsk2026-course.js (FSK26), 모터 기본값 = js/data/emrax228.js (EMRAX228)
   - 차량 모델: 점질량 준정적 + 앞뒤 · 좌우 하중 이동 + 타이어 하중 감도(직선 또는 맵) + 뒤축 구동,
     모터 곡선(전압 보정) · 열(1점 모델) · 디레이팅, 효율(상수 또는 맵), 축전지(내부저항 · SOC)
   - 탭: [시뮬레이션] 결과 · 구동력 선도(프로브) · 코스 지도(확대 · 프로브) · 신호 그래프 / [편집] 코스 · 차량 제원 · 타이어 · 에어로 · 모터 · 인버터 · 구동계 · 축전지 (상수 + 표), · 모터 · 효율 · 타이어 표
   - 결과: [내 감속비 | 최적 감속비] (두 모드 미리 계산) · 감속비 · 종목 기록(가장 빠른 기록 대비) · 차량 한계 / 고른 코스 · 축전지 · 모터 · 에너지
   ============================================================ */
const T2KEY = 'run2x.wb.2.ext.v2';
/* 예시 내 코스 (내부 글 양식: 첫 행 = 열 이름, 빈칸 = 윗 행 폭 · 콘 없음) */
const T2TRACK_EX = ['종류, 길이 m, 반경 m, 왼쪽 폭 m, 오른쪽 폭 m, 슬라럼 콘 간격 m',
  '직선, 25, , 2, 2  # 출발 직선', '직선, 60, , , , 10  # 슬라럼 (콘 간격 10 m)', '직선, 20', '왼쪽, 31.42, 20, 3, 2  # 왼쪽 90° (지름 40 m · 바깥 넓음)', '직선, 40, , 2, 2',
  '오른쪽, 7.85, 10  # 시케인', '왼쪽, 7.85, 10', '왼쪽, 7.85, 10', '오른쪽, 7.85, 10', '직선, 30', '왼쪽, 15.71, 5  # 왼쪽 헤어핀 (지름 10 m)', '직선, 35',
  '오른쪽, 47.12, 30, , , 8  # 곡선 위 슬라럼 (반경 30 m · 콘 간격 8 m)', '직선, 36, , , , 6  # 짧은 슬라럼 (콘 간격 6 m)', '직선, 40', '오른쪽, 17.28, 5.5', '직선, 25', '왼쪽, 23.56, 15', '직선, 50', '오른쪽, 31.42, 10', '직선, 30'].join('\n');
const T2MOTOR_PH = '첫 행은 열 이름, 그 아래 한 행에 회전수 · 최대 토크 · 연속 토크\n회전수 rpm, 최대 토크 N·m, 연속 토크 N·m\n0, 230, 110\n4800, 230, 112\n6500, 180, 92\n\n연속 토크는 디레이팅의 하한 (없으면 0 까지 깎임).';
const T2TIRE_PH = '비우면 위 [타이어 마찰계수] · [μ 하중 감도]를 씁니다.\n숫자 하나 = 하중과 상관없는 μ\n표 = 한 행에 바퀴 하나 수직 하중 N, μ\n하중 N, μ\n0, 1.8\n1000, 1.6\n2000, 1.45';
const T2EFF_PH = '비우면 위 상수 칸의 효율을 씁니다.\n숫자 하나 = 상수 효율 [%] (예: 97)\n맵 = 첫 행은 회전수, 첫 열은 토크, 칸은 효율 %\n토크 N·m \\ 회전수 rpm, 0, 2000, 4000\n50, 88, 93, 92\n150, 90, 95, 94\n230, 87, 93, 92';
/* 화면 상태 (이 브라우저에 저장). free.text = 내 코스 표를 글로 (한 행에 한 구간) */
const T2 = { tab:'sim', etab:'course', course:'end', lap:{end:'1', free:'1'}, free:{text:'', laps:1, s0:0}, mtext:'', eM:'', eI:'', tire:'', grMode:'my',
             menu:'', paste:'', zoom:{k:1, cx:.5, cy:.5}, zoomE:{k:1, cx:.5, cy:.5}, timer:0,
             ecourse:'end', use:{mt:'tab', eM:'tab', eI:'tab', tire:'tab'} };   // ecourse = 편집 탭에서 보는 코스 (시뮬레이션 코스와 따로), use = 맵마다 [아래 표 · 위 상수]
const T2ET = {course:'코스', mt:'모터 토크 곡선', eM:'모터 효율 맵', eI:'인버터 효율 맵', tire:'타이어 하중 감도'};   // 표 이름 (붙여넣기 창 · 메뉴)
/* 편집 탭 항목 (위 단추). 모터 · 인버터는 안에서 표 고름 (etab = mt · eM · eI) */
const T2EI = [['model', '모델 단계'], ['course', '코스'], ['car', '차량 제원'], ['sus', '서스 · 조향'], ['tire', '타이어'], ['aero', '에어로'], ['mot', '모터 · 인버터'], ['cool', '냉각'], ['dt', '구동계'], ['bat', '축전지']];
const T2MOT = ['mt', 'eM', 'eI'];
const t2Grp = et => T2MOT.includes(et) ? 'mot' : et;   // etab → 위 단추
T2.free.text = T2TRACK_EX.split('\n').map(l => l).join('\n');
T2.mtext = (typeof EMRAX228!=='undefined' ? EMRAX228.torque : ''); T2.eM = (typeof EMRAX228!=='undefined' ? EMRAX228.eff : '');
const T2COURSES = ['free', 'ax', 'end', 'acc', 'skid'];
function t2Load(s){ if(!s || typeof s!=='object') return;
  if(T2COURSES.includes(s.course)) T2.course = s.course; T2.ecourse = T2COURSES.includes(s.ecourse) ? s.ecourse : T2.course;
  if(s.use && typeof s.use==='object') ['mt', 'eM', 'eI', 'tire'].forEach(k => { if(s.use[k]==='tab' || s.use[k]==='const') T2.use[k] = s.use[k]; }); if(s.lap && typeof s.lap==='object') Object.assign(T2.lap, s.lap);
  if(s.free && typeof s.free.text==='string') Object.assign(T2.free, {text:s.free.text, laps:Math.max(1, Math.round(+s.free.laps || 1)), s0:Math.max(0, +s.free.s0 || 0)});
  if(s.cool && Array.isArray(s.cool.circuits)) T2.coolOld = s.cool;   // 예전 저장본의 냉각 배치 → 도구 9 가 처음 열 때 가져감
  if(typeof s.mtext==='string') T2.mtext = s.mtext; if(typeof s.eM==='string') T2.eM = s.eM; if(typeof s.eI==='string') T2.eI = s.eI; if(typeof s.tire==='string') T2.tire = s.tire;
  if(s.grMode==='my' || s.grMode==='opt') T2.grMode = s.grMode; if(['sim', 'edit'].includes(s.tab)) T2.tab = s.tab; if(T2ET[s.etab] || T2EI.some(([k]) => k===s.etab && k!=='mot')) T2.etab = s.etab; }
/* 예전에 저장된 예시 효율 맵: 기본 맵과 크기가 같고 몇 칸(8칸 이하)만 3 %p 넘게 낮은 '구멍'이면 지금 기본 맵으로 바꿈 */
function t2EffFix(txt){ try{ if(typeof EMRAX228==='undefined' || txt===EMRAX228.eff) return txt; const A = t2EffParse(txt).map, B = t2EffParse(EMRAX228.eff).map; if(!A || !B) return txt;
  if(A.n.length!==B.n.length || A.t.length!==B.t.length || A.n.some((v, j) => v!==B.n[j]) || A.t.some((v, i) => v!==B.t[i])) return txt;
  let d = 0, low = true; A.e.forEach((r, i) => r.forEach((v, j) => { const x = B.e[i][j]; if(Math.abs(v - x) > 1e-6){ d++; if(!(v < x - 3)) low = false; } }));
  return d > 0 && d <= 8 && low ? EMRAX228.eff : txt; }catch(e){ return txt; } }
try{ t2Load(JSON.parse(localStorage.getItem(T2KEY) || '{}')); }catch(e){}
const t2Save = () => { try{ localStorage.setItem(T2KEY, JSON.stringify({...(T2.coolOld ? {cool:T2.coolOld} : {}), course:T2.course, lap:T2.lap, free:T2.free, mtext:T2.mtext, eM:T2.eM, eI:T2.eI, tire:T2.tire, grMode:T2.grMode, ecourse:T2.ecourse, use:T2.use, tab:T2.tab, etab:T2.etab})); }catch(e){} };

/* ---------- 글 · 파일 → 표 ---------- */
/* ---------- 파일 가져오기: .csv · .txt · .xlsx ---------- */
/* 표의 한 줄(칸 배열) → 구간. 숫자 칸 두 개 = 길이 · 반경. '직선 · straight' 글자가 있으면 반경 0, '오른 · right · R' 글자가 있으면 반경을 −로. 숫자가 없는 행(머리말)은 건너뜀 */
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
/* 내 코스 글 → 구간 {l 길이, R 반경 (왼쪽 +), wl · wr 왼쪽 · 오른쪽 폭, sl 슬라럼 콘 간격 (빈칸 = NaN), note}
   열 이름 줄(종류 · 길이 · 반경 · 왼쪽 폭 · 오른쪽 폭 · 슬라럼 콘 간격 · 메모)이 있으면 그 열 위치로 읽고, 없으면 예전 방식(숫자 순서: 길이 · 반경) */
const T2W0 = 1.75;   // 첫 행 폭이 비었을 때 채우는 값 [m] (양쪽 합 3.5 m)
const T2COLS = [['type', /종류|type/i], ['l', /길이|length/i], ['R', /반경|radius/i], ['wl', /왼쪽\s*폭|left\s*width/i], ['wr', /오른쪽\s*폭|right\s*width/i],
                ['sl', /슬라럼|slalom|콘\s*간격/i], ['note', /메모|note|comment/i]];
function t2HeadMap(cells){ if(cells.some(c => c!=='' && isFinite(+c))) return null; const m = {};
  cells.forEach((c, j) => { const hit = T2COLS.find(([k, re]) => re.test(c) && m[k]==null && !(k==='type' && /폭|간격/.test(c))); if(hit) m[hit[0]] = j; });
  return m.l!=null ? m : null; }
function t2Track(txt){ const rows = [], bad = []; let H = null;   // bad = 숫자가 없는 행 (첫 구간 앞 머리 행은 빼고)
  const num = c => { const s = String(c ?? '').trim(); return s!=='' && isFinite(+s) ? +s : NaN; };
  t2Lines(txt).forEach(L => { if(!L.cells.length) return;
    const h = !rows.length || !H ? t2HeadMap(L.cells) : null; if(h){ H = h; return; }
    let r = null;
    if(H){ const c = k => H[k]!=null ? L.cells[H[k]] : '', tp = String(c('type') || ''), l = num(c('l')); let R0 = num(c('R'));
      if(l > 0){ if(/직선|straight/i.test(tp) || !isFinite(R0)) R0 = 0; else if(/오른|right|^\s*r\s*$/i.test(tp)) R0 = -Math.abs(R0); else if(/왼|left|^\s*l\s*$/i.test(tp)) R0 = Math.abs(R0);
        r = {l, R:R0, wl:num(c('wl')), wr:num(c('wr')), sl:num(c('sl')), note:String(c('note') || '').trim()}; } }
    else { const q = t2CellsToRows([L.cells]); if(q.length) r = {...q[0], wl:NaN, wr:NaN, sl:NaN}; }
    if(r){ if(!(r.wl >= 0)) r.wl = NaN; if(!(r.wr >= 0)) r.wr = NaN; if(!(r.sl > 0)) r.sl = NaN;
      if(L.note) r.note = (r.note ? r.note + ' ' : '') + L.note; rows.push(r); }
    else if(rows.length) bad.push(L.i); });
  if(rows.length){ if(!isFinite(rows[0].wl)) rows[0].wl = T2W0; if(!isFinite(rows[0].wr)) rows[0].wr = T2W0; }   // 첫 행 폭은 늘 적혀 있게 (예전 코스 · 빈칸)
  return {rows, bad, segs: rows.map(r => [r.l, r.R]), len: rows.reduce((a, r) => a + r.l, 0)}; }
/* 빈 폭 칸 = 윗 행 값 (첫 행은 읽을 때 1.75 m 로 채움 → 숨은 기본값 없음) */
function t2Widths(rows){ let a = T2W0, b = a; return rows.map(r => { if(isFinite(r.wl)) a = r.wl; if(isFinite(r.wr)) b = r.wr; return [a, b]; }); }
/* 모터 토크 표: 1열 = 회전수 rpm, 2열 = 최대 토크, 3열 = 연속 토크 (디레이팅 하한) [N·m]. 숫자가 없는 첫 행 = 열 이름 */
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
  const head = L[0].cells.slice(1).map(Number); if(head.length < 2 || !head.every(isFinite)) return {map:null, msg:'<span class="wb-err">맵의 첫 행(회전수)을 읽지 못했습니다</span>'};
  const t = [], e = []; L.slice(1).forEach(l => { const r = l.cells.map(Number); if(isFinite(r[0]) && r.slice(1, head.length + 1).every(isFinite)){ t.push(r[0]); e.push(r.slice(1, head.length + 1)); } });
  if(t.length < 2) return {map:null, msg:'<span class="wb-err">맵의 토크 행을 2행 이상 읽지 못했습니다</span>'};
  const sc = Math.max(...e.flat()) <= 1.5 ? 100 : 1, map = {n:head, t, e:e.map(r => r.map(v => v*sc))};
  return {map, msg:`맵 ${t.length} × ${head.length} (토크 ${wbFmt(t[0], 0)} ~ ${wbFmt(t[t.length-1], 0)} N·m, 회전수 ${wbFmt(head[0], 0)} ~ ${wbFmt(head[head.length-1], 0)} rpm, 효율 ${wbFmt(Math.min(...map.e.flat()), 1)} ~ ${wbFmt(Math.max(...map.e.flat()), 1)} %)`}; }
/* 공식 코스 경계 = 실제 콘 위치 (대회 데이터 FSK26.cones).  콘을 가운데 선(점 X · Y, 닫힘)에 투영해 거리 s · 옆 거리 (왼쪽 +) 를 구하고,
   점마다 왼쪽 · 오른쪽 폭 = 그 쪽 콘 두 개 사이 옆 거리를 거리로 직선 보간 (콘 사이를 직선으로 이은 경계).
   슬라럼 콘 (C) = 가장 가까운 점 번호 · 그 옆 거리 (가운데 선 위가 아닐 수 있음) */
let T2CW = null;
const T2SLP = 5, T2SLW = 5;   // 슬라럼 구간: 첫 · 끝 콘 앞뒤로 넓힐 거리 [m], 슬라럼 콘에서 양쪽 폭 [m]
function t2ConeBounds(){ if(T2CW) return T2CW; const X = FSK26.X, Y = FSK26.Y, N = X.length, S = [0];
  for(let i = 1; i <= N; i++) S.push(S[i - 1] + Math.hypot(X[i % N] - X[i - 1], Y[i % N] - Y[i - 1]));
  const Ltot = S[N], proj = (x, y) => { let best = null;
    for(let j = 0; j < N; j++){ const k = (j + 1) % N, dx = X[k] - X[j], dy = Y[k] - Y[j], l2 = dx*dx + dy*dy || 1, t = Math.max(0, Math.min(1, ((x - X[j])*dx + (y - Y[j])*dy)/l2)),
      px = X[j] + t*dx, py = Y[j] + t*dy, d = Math.hypot(x - px, y - py); if(!best || d < best.d){ const l = Math.sqrt(l2); best = {d, s:S[j] + t*l, lat:((x - X[j])*(-dy) + (y - Y[j])*dx)/l}; } }
    return best; };
  const side = {L:[], R:[]}, sl = [];
  (FSK26.cones || []).forEach(([x, y, t]) => { const p = proj(x, y); if(t==='L') side.L.push([p.s, p.lat]); else if(t==='R') side.R.push([p.s, -p.lat]); else if(t==='C'){
    let k = 0, dm = Infinity; for(let i = 0; i < N; i++){ const d = Math.min(Math.abs(S[i] - p.s), Ltot - Math.abs(S[i] - p.s)); if(d < dm){ dm = d; k = i; } }
    let ds = p.s - S[k]; if(ds > Ltot/2) ds -= Ltot; else if(ds < -Ltot/2) ds += Ltot; sl.push([k, p.lat, ds]); } });   // ds = 콘이 그 점에서 앞뒤로 떨어진 거리 [m]
  const interp = (A, s) => { if(!A.length) return NaN; const n = A.length; let j = 0; while(j < n && A[j][0] <= s) j++;
    const a = A[(j - 1 + n) % n], b = A[j % n], sa = a[0] - (j === 0 ? Ltot : 0), sb = b[0] + (j === n ? Ltot : 0), f = sb > sa ? (s - sa)/(sb - sa) : 0;
    return a[1] + f*(b[1] - a[1]); };
  sl.sort((p, q) => p[0] - q[0]);
  // 슬라럼 구간: 실제 대회에는 슬라럼 옆 좌우 콘이 없음 → 묶음(콘 간격 20 m 안)의 첫 콘 앞 T2SLP m ~ 끝 콘 뒤 T2SLP m 은 좌우 콘을 경계로 쓰지 않고,
  //   폭 = 슬라럼 콘 옆 거리(콘 사이 직선 보간) ± T2SLW m (그 구간 차 움직임에 영향이 없을 만큼 넓게)
  const sS = sl.map(([k, , ds]) => S[k] + ds), zones = [];
  sl.forEach((q, j) => { const z = zones[zones.length - 1]; if(z && sS[j] - z.e < 20){ z.e = sS[j]; z.c.push([sS[j], q[1]]); } else zones.push({b:sS[j], e:sS[j], c:[[sS[j], q[1]]]}); });
  const inZ = s => zones.find(z => s >= z.b - T2SLP && s <= z.e + T2SLP);
  side.L = side.L.filter(([s0]) => !inZ(s0)); side.R = side.R.filter(([s0]) => !inZ(s0));
  side.L.sort((p, q) => p[0] - q[0]); side.R.sort((p, q) => p[0] - q[0]);
  const WL = [], WR = []; for(let i = 0; i < N; i++){ const l = interp(side.L, S[i]), r = interp(side.R, S[i]); WL.push(isFinite(l) ? l : FSK26.WL[i]); WR.push(isFinite(r) ? r : FSK26.WR[i]);
    const z = inZ(S[i]); if(z){ const C = z.c; let lat = C[0][1]; if(S[i] >= C[C.length - 1][0]) lat = C[C.length - 1][1]; else for(let j = 1; j < C.length; j++) if(S[i] <= C[j][0]){ const f = (S[i] - C[j - 1][0])/((C[j][0] - C[j - 1][0]) || 1); lat = C[j - 1][1] + Math.max(0, f)*(C[j][1] - C[j - 1][1]); break; }
      WL[i] = lat + T2SLW; WR[i] = T2SLW - lat; } }
  return T2CW = {WL, WR, slalom:sl.map(q => q[0]), slat:sl.map(q => q[1]), sds:sl.map(q => q[2])}; }
const t2ExtraI = () => ({ end: typeof FSK26!=='undefined' ? (() => { const B = t2ConeBounds(); return {seg:FSK26.seg, laps:FSK26.laps, stint:FSK26.stint, WL:B.WL, WR:B.WR, slalom:B.slalom, slat:B.slat, sds:B.sds}; })() : {seg:[]},
  /* 맵: [위 상수]를 고르면 표가 있어도 넘기지 않음 */
  free:(() => { const P = t2Track(T2.free.text); return {seg:P.segs, wl:P.rows.map(r => isFinite(r.wl) ? r.wl : null), wr:P.rows.map(r => isFinite(r.wr) ? r.wr : null),
                                                       sl:P.rows.map(r => isFinite(r.sl) ? r.sl : null), laps:T2.free.laps, s0:T2.free.s0}; })(), motor:T2.use.mt==='const' ? [] : t2MotorParse(T2.mtext).pts, motorC:T2.use.mt==='const' ? [] : t2MotorParse(T2.mtext).ptsC,
  effM:T2.use.eM==='const' ? null : t2EffParse(T2.eM).map, effI:T2.use.eI==='const' ? null : t2EffParse(T2.eI).map, tireMap:T2.use.tire==='const' ? null : t2TireParse(T2.tire).map, course:T2.course, lap:T2.lap[T2.course] || '1', grMode:T2.grMode });

/* ---------- 파일 가져오기 · 양식 받기 ---------- */
async function t2ReadCells(file){ const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(ext==='xlsx') return await t2Xlsx(await file.arrayBuffer());
  if(['csv', 'txt', 'tsv'].includes(ext)) return (await file.text()).split(/\r?\n/).map(l => l.split(/[,;\t]/));
  throw new Error(`읽을 수 없는 파일입니다 (.${ext || '확장자 없음'}). .xlsx · .csv 를 올리거나, 엑셀 .xls 는 [다른 이름으로 저장 → .xlsx]로 저장해 올려 주십시오.`); }
async function t2Import(file, what){ try{ const cells = await t2ReadCells(file), txt = cells.map(r => r.map(c => String(c ?? '').trim()).join(', ').replace(/(, )+$/, '')).filter(l => l.replace(/[, ]/g, '')).join('\n');
    if(what==='track'){ const P = t2Track(txt); if(!P.rows.length) throw new Error('구간을 찾지 못했습니다. 첫 행에 열 이름(종류 · 길이 m · 반경 m …), 그 아래 한 행에 한 구간이 있어야 합니다.');
      T2.free.text = t2RowsText(P.rows); toast(`${file.name}: 구간 ${P.rows.length}개 읽음${P.bad.length ? ` · ${P.bad.slice(0, 5).join(', ')}번째 행은 숫자가 없어 건너뜀` : ''}`); }
    else if(what==='motor'){ const P = t2MotorParse(txt); if(!P.pts.length) throw new Error('회전수 · 토크 행을 찾지 못했습니다.'); T2.mtext = txt; toast(`${file.name}: ${P.pts.length}점${P.ptsC.length ? ' · 연속 토크 포함' : ''}`); }
    else if(what==='tire'){ const P = t2TireParse(txt); if(!P.map) throw new Error('하중 · μ 행을 찾지 못했습니다.'); T2.tire = txt; toast(`${file.name}: ${P.msg}`); }
    else { const P = t2EffParse(txt); if(!P.map) throw new Error('효율 맵을 읽지 못했습니다. 첫 행 = 회전수, 첫 열 = 토크.'); if(what==='eM') T2.eM = txt; else T2.eI = txt; toast(`${file.name}: ${P.msg.replace(/<[^>]+>/g, '')}`); }
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
    ['# 내 코스 양식 — 한 행에 한 구간 · 위에서부터 달리는 순서 · 첫 행(# 아닌 행)은 열 이름 (열 순서는 바꿔도 됨, 이름으로 읽음)'],
    ['# 종류: 직선 · 왼쪽 · 오른쪽 (영어 Straight · Left · Right 도 됨) · 길이 · 반경 m 는 코스 가운데 선 기준 · 직선은 반경을 비움'],
    ['# 왼쪽 · 오른쪽 폭 m = 가운데 선에서 그 쪽 경계까지 · 비우면 윗 행 값 (첫 행은 꼭 적음 · 비우면 1.75 m 로 채움) · 경계 콘은 지도에 자동으로 그림'],
    ['# 슬라럼 콘 간격 m = 그 구간 가운데 선 위에 콘을 이 간격으로 (첫 콘은 구간 시작에서 간격 ÷ 2 뒤) · 직선 · 곡선 모두 됨 · 비우면 콘 없음'],
    ['# # 로 시작하는 행은 건너뜀 · 엑셀 .xls 는 .xlsx 로 저장해 올림 · 표에서 Ctrl+V 로 여러 칸을 바로 붙여도 됨'],
    ['종류', '길이 m', '반경 m', '왼쪽 폭 m', '오른쪽 폭 m', '슬라럼 콘 간격 m', '메모'], ['직선', 54, '', 2, 2, '', '출발 직선'], ['직선', 60, '', '', '', 10, '슬라럼'],
    ['왼쪽', 31.42, 20, 3, 2, '', '바깥 넓음'], ['오른쪽', 47.12, 30, '', '', 8, '곡선 위 슬라럼'], ['직선', 30, '', '', '', '', '']]},
  motor:{name:'모터토크_양식', rows:[
    ['# 모터 토크 곡선 양식 — 1열 회전수 rpm · 2열 최대 토크 N·m · 3열 연속 토크 N·m (디레이팅 하한 · 없으면 비움)'], ['# 도구 위 [모터 표 기준 전압]에서 잰 곡선을 넣음 · # 행은 건너뜀'],
    ['회전수 rpm', '최대 토크 N·m', '연속 토크 N·m'], [0, 230, 110], [4800, 230, 112], [6500, 180, 92]]},
  eff:{name:'효율맵_양식', rows:[
    ['# 효율 양식 — 숫자 하나만 쓰면 상수 효율 % · 표면 맵'], ['# 맵: 첫 행 = 회전수 rpm · 첫 열 = 토크 N·m · 칸 = 효율 % (0 ~ 1 비율로 써도 됨)'], ['# # 행은 건너뜀'],
    ['토크 N·m \\ 회전수 rpm', 0, 2000, 4000], [50, 88, 93, 92], [150, 90, 95, 94], [230, 87, 93, 92]]} };
T2TPL.tire = {name:'타이어하중감도_양식', rows:[
  ['# 타이어 하중 감도 양식 — 한 행에 바퀴 하나 수직 하중 N · 그때 μ (행 사이는 직선 보간 · 범위 밖은 끝값)'], ['# 숫자 하나만 쓰면 하중과 상관없는 μ · # 행은 건너뜀'],
  ['하중 N', 'μ'], [0, 1.8], [1000, 1.6], [2000, 1.45]]};
function t2Template(kind, fmt){ const T = T2TPL[kind]; let blob;
  if(fmt==='xlsx') blob = t2XlsxBlob(T.rows); else blob = new Blob(['﻿' + T.rows.map(r => r.join(',')).join('\r\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${T.name}.${fmt}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
T2.eM = t2EffFix(T2.eM);   // 예전 예시 맵의 '구멍' 정리 (t2Lines · t2EffParse 정의 뒤)

/* ============================================================ 작업창 위 탭: [시뮬레이션] · [편집]
   시뮬레이션: 위 줄(기준 감속비 · 볼 랩 · 코스) → 결과 → 구동력 선도 · 코스 지도 (프로브) → 신호 선택 그래프
   편집      : 항목(코스 · 차량 제원 · 타이어 · 에어로 · 모터 · 인버터 · 구동계 · 축전지) → 상수 칸(왼쪽 입력 칸과 같은 부품) + 표 · 그림
               표에 값이 있으면 그 상수 칸을 막고 표를 씀. 비우면 다시 상수. 왼쪽 입력 칸은 비워 둠 (자주 바꾸는 값은 나중에) */
const T2CN = {free:'내 코스', ax:'오토크로스', end:'내구레이스', acc:'가속', skid:'스키드패드'};
const t2Sum = a => a.reduce((x, y) => x + y, 0);
const t2Closed = () => T2.free.laps > 1 || T2.free.s0 > 0;      // 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스
const t2Seg = (attr, cur, items) => `<span class="dc-seg" role="group">${items.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${cur===k}">${t}</button>`).join('')}</span>`;

function t2ExtHTML(){ const sim = T2.tab==='sim', w = $('#wb'); if(w) w.classList.toggle('t2-edit', !sim);
  const R = WB.id==='2' ? WB.R : null, go = R && R.modes ? R.modes.opt.out.gr_use : NaN;
  const bar = sim
    ? `<span class="t2-mdl" title="계산에 쓴 모델 단계 (편집 탭 [모델 단계]에서 바꿈)">모델 · 차량 ${Math.max(0, Math.min(3, Math.round(WB.I.md || 0)))} · 열 ${t2ThName()}</span><span class="t2-gm"><span class="muted">기준 감속비</span>${t2Seg('data-t2gm', T2.grMode, [['my', `내 감속비 ${wbFmt(WB.I.gr, 2)}`], ['opt', `최적 감속비 ${isFinite(go) ? wbFmt(go, 2) : '…'}`]])}</span>
       <span class="t2-vw"><label class="t2-lapl">볼 랩 <span id="t2lapw">${t2LapSel()}</span></label><span class="muted">코스</span>${t2Seg('data-t2course', T2.course, T2COURSES.map(k => [k, T2CN[k]]))}</span>`
    : `<span class="t2-vw"><span class="muted">편집할 항목</span>${t2Seg('data-t2eg', t2Grp(T2.etab), T2EI)}</span>
`;
  return `<section class="wb-sec t2-ext" aria-label="시뮬레이션 · 편집"><div class="wb-h t2-h"><div class="m1-tabs" role="tablist">${[['sim', '시뮬레이션'], ['edit', '편집']].map(([k, t]) => `<button type="button" role="tab" data-t2tab="${k}" aria-selected="${T2.tab===k}">${t}</button>`).join('')}</div></div>
    <div class="t2-hr${sim ? '' : ' left'}">${bar}</div>
    ${sim ? '' : t2EditBody()}${t2PasteHTML()}</section>`; }
/* 편집 탭 본문: 항목의 상수 칸 (왼쪽 입력과 같은 칸, 비슷한 값끼리 작은 상자 = sb) + 표 · 그림 */
const T2CNOTE = {bat:'셀 값 · 직렬 · 병렬 수 · 팩 내부저항 · 방전 전류 한계는 도구 4 축전지 팩 계산기에서 정해 대시보드로 받습니다 (왼쪽 [대시보드 값으로 채우기]). 이 도구는 받은 값으로 팩 개방 전압(셀 전압 × 직렬 수, SOC 에 직선) · 공칭 에너지만 셈하고, 규정(세그먼트 120 V · 6 MJ · 12 kg) · 질량은 도구 4 에서 봅니다. <button type="button" class="lnk" data-t2to4>도구 4 열기</button>',
  mot:'아래 표에서 [아래 표]를 고르면 [모터 최대 토크] · [모터 · 인버터 효율 (상수)] 대신 회전수별 토크 곡선 · 효율 맵을 씁니다.',
                 tire:'아래 표에서 [아래 표]를 고르면 [타이어 μ] · [μ 하중 감도] 대신 하중별 μ 표를 씁니다.'};
function t2Consts(grp){ const gs = T2EG[grp] || [], list = WB_TOOLS['2'].inputs.filter(d => gs.includes(d.g) && d.ui!=='none'); if(!list.length) return '';
  const groups = []; list.forEach(d => { let G = groups.find(x => x.g===d.g); if(!G){ G = {g:d.g, sb:[]}; groups.push(G); } let B = G.sb.find(x => x.n===d.sb); if(!B){ B = {n:d.sb, ds:[]}; G.sb.push(B); } B.ds.push(d); });
  return `<div class="t2-cg">${groups.map(G => `<div class="wb-ig">${wbEsc(G.g)}</div><div class="t2-sbs">${G.sb.map(B => `<div class="t2-sb">${B.n ? `<div class="t2-sbh">${wbEsc(B.n)}</div>` : ''}${t2SbTop(B.n)}${wbInRows(B.ds, false)}</div>`).join('')}</div>`).join('')}
    ${T2CNOTE[grp] ? `<p class="t2-cnote muted">${T2CNOTE[grp]}</p>` : ''}</div>`; }
const T2RL = {2:['레코드 라인', '최소 곡률 라인에서 출발해 우리 차 랩타임이 줄도록 조금씩 다듬은 라인 (차량 입력이 바뀌면 다시 다듬음)'],
              1:['최소 곡률 라인', '코스 폭 안에서 가장 덜 휘는 라인 (차량 성능과 상관없이 코스만으로 정함)'],
              0:['중심 라인', '코스 중심선을 그대로 따라감 (슬라럼 콘도 비켜 가지 않음)']};
const t2RlOf = () => WB.I.rl_on >= 2 ? 2 : WB.I.rl_on >= 1 ? 1 : 0;
/* 상자 맨 위에 넣는 옵션 행 (상자 이름으로 고름) */
function t2SbTop(n){ if(n!=='여유') return ''; const r = t2RlOf();
  return `<div class="t2-optrow"><span class="t2-optn">주행선</span>${t2Seg('data-t2rl', String(r), [2, 1, 0].map(k => [String(k), T2RL[k][0]]))}
    <p class="muted t2-optd">${T2RL[r][1]} · 슬라럼은 첫 콘을 왼쪽으로 지나감</p></div>`; }
/* 입력 행 안 옵션 단추 (이름과 값 사이) */
/* 팩 제원 용량 [kWh] = 직렬 × 병렬 × 셀 용량 × 셀 공칭 전압 */
const t2Epack = () => { const I = WB.I; return I.n_s*I.n_p*I.c_ah*I.c_vnom/1000; };
const T2EL = {0:'출력 상한을 낮추지 않고 끝까지 전력으로 달림 (소비가 팩 에너지를 넘어도)', 1:'내구 소비가 팩 제원 용량을 넘으면 출력 상한을 낮춰 맞춤', 2:'내구 소비가 아래 칸에 넣은 값을 넘으면 출력 상한을 낮춰 맞춤'};
const t2ElOf = () => WB.I.e_lim === 0 ? 0 : WB.I.e_lim === 2 ? 2 : 1;
function t2InOpt(k){ if(WB.id!=='2') return '';
  if(k==='rmin'){ const on = WB.I.rm_on !== 0; return `<span class="t2-inopt" title="${on ? '주행선 |곡률| ≤ 1/최소 회전 반경 을 제약으로 풂 (폭 · 콘 때문에 못 지키면 결과에 급한 구간으로 알림)' : '주행선 반경을 제한하지 않음'}">${t2Seg('data-t2rm', on ? '1' : '0', [['1', '고려'], ['0', '고려 안 함']])}</span>`; }
  if(k==='eta_inv'){ const mg = WB.I.eff_mg === 1; return `<span class="t2-inopt" title="${mg ? '모터 효율(맵)이 모터 + 인버터 합친 값. 합친 손실을 [합친 손실 중 인버터 몫]으로 나눠 인버터 열로' : '모터 · 인버터 효율을 따로 넣음'}">${t2Seg('data-t2mg', mg ? '1' : '0', [['0', '따로'], ['1', '모터 맵에 합침']])}</span>`; }
  if(k!=='e_target') return ''; const m = t2ElOf();
  return `<span class="t2-inopt" title="${T2EL[m]}">${t2Seg('data-t2el', String(m), [['1', `제원 용량 ${wbFmt(t2Epack(), 2)} kWh`], ['2', '임의 상한'], ['0', '제한 없음']])}</span>`; }
/* 모델 단계: 차량 · 열 두 축을 따로 고름 */
const T2MDV = [[0, '0 기본', '무게중심 높이 전체로 좌우 하중 이동을 계산합니다. 롤은 계산하지 않습니다.', '차량 제원 (무게중심 높이 · 트레드) · 타이어 (μ · 하중 감도)'],
               [1, '1 롤센터 · 롤', '앞 · 뒤 롤센터 높이로 하중 이동을 기하 몫(롤센터에서 바로 전달)과 탄성 몫(스프링 · 안티롤바)으로 나누고, 롤 강성으로 롤각을 계산합니다.', '차량 제원 · 서스 · 조향 › 롤센터 · 롤 (앞 · 뒤 롤센터 높이, 롤 강성)'],
               [2, '2 비선형 타이어', '모델 1 에 더해, 도구 T 의 타이어 곡선(Magic Formula 꼴)으로 코스 위 점마다 앞 · 뒤 슬립각을 풀어 차체 각도 β · 바퀴 조향각 · 핸들 각 · 언더스티어 구배를 계산합니다. 기록(접지 한계)은 모델 1 과 같습니다.', '타이어 › 타이어 곡선 (모델 2 · 3) · 서스 · 조향 › 조향비 · 최대 조향각'],
               [3, '3 과도 (요 · 롤 운동)', '모델 2 에 더해, 일정 차속에서 계단 조향을 넣었을 때 요레이트 · 횡가속도 · 롤각이 따라오는 시간 응답을 3 자유도(옆 · 요 · 롤) + 타이어 이완으로 계산합니다 (ISO 7401 꼴).', '서스 · 조향 › 과도 (모델 3: 요 · 롤 관성, 현가하질량, 롤 감쇠, 시험 차속 · 횡가속도) · 타이어 이완 길이']];
/* 열 모델: 노드마다 켜고 끔 (k = 입력 키), 부품마다 냉각 방식 [공랭 · 수랭] (c = 입력 키). 냉각수 온도는 수랭으로 열을 넣는 부품이 있어야 계산 */
const T2MDT = [['th_on', 'm_cool', '모터 열', '모터 손실로 모터 온도가 오르고, 수랭이면 냉각수로 · 공랭이면 외기로 열을 내보냅니다. 디레이팅 계수가 0 이 아니면 온도로 최대 토크를 깎습니다. 끄면 모터 온도는 출발 온도 그대로이고 디레이팅도 없습니다.', '모터 · 인버터 › 모터 열 · 디레이팅 (열용량 · 출발 온도 · 디레이팅, 수랭 열저항 또는 공랭 hA)'],
               ['in_on', 'i_cool', '인버터 온도', '인버터 손실로 인버터 온도가 오르고, 수랭이면 냉각수로 · 공랭이면 외기로 열을 내보냅니다. 끄면 온도는 계산하지 않고, 수랭이면 손실을 냉각수에 바로 넣습니다. 출발 온도는 모터 출발 온도와 같게 둡니다.', '모터 · 인버터 › 인버터 열 (열용량, 수랭 열저항 또는 공랭 hA)'],
               ['bt_on', 'b_cool', '축전지 온도', '팩 내부저항 손실로 축전지 온도가 오르고, 공랭이면 외기로 · 수랭이면 냉각수로 열을 내보냅니다. 내부저항은 온도가 낮을수록 커집니다 (손실 · 전압 강하 · 발열에 반영). 끄면 내부저항은 일정합니다.', '축전지 › 축전지 열 (팩 열용량, 시작 온도, 저항 온도 계수, 공랭 hA 또는 수랭 열저항)'],
               ['cw_on', '', '냉각수 온도', '수랭 부품에서 들어온 열을 라디에이터가 외기로 내보냅니다 (방열 능력은 차속에 따라 커짐). 수랭으로 열을 넣는 부품이 있을 때만 계산하고, 끄면 냉각수 온도는 고정값입니다.', '모터 · 인버터 › 냉각수 · 라디에이터 (열용량, 정지 · 60 km/h 방열 능력) · 모터 열 › 냉각수 온도']];
/* 지금 켜진 노드 (냉각수는 실제로 계산되는지까지) */
const t2Th = () => { const I = WB.I, m = I.th_on !== 0, i = I.in_on === 1, b = I.bt_on === 1, mW = I.m_cool !== 0, iW = I.i_cool !== 0, bW = I.b_cool === 1;
  const src = (m && mW) || iW || (b && bW); return {m, i, b, mW, iW, bW, src, w: I.cw_on === 1 && src}; };
const t2ThName = () => { const t = t2Th(), a = [t.m && '모터', t.i && '인버터', t.b && '축전지', t.w && '냉각수'].filter(Boolean); return a.length ? a.join(' · ') : '없음'; };
function t2ModelPage(){ const md = Math.max(0, Math.min(3, Math.round(WB.I.md || 0))), th = t2Th(), on = {th_on:th.m, in_on:th.i, bt_on:th.b, cw_on:WB.I.cw_on === 1};
  const head = (nm, note) => `<div class="t2-mdh">${nm}<span class="muted t2-mdhn">${note}</span></div>`;
  const veh = `<div class="t2-mdax">${head('차량 모델', '하나 고름')}<div class="t2-mdops">${T2MDV.map(([k, t, d, u]) => { const off = false;
      return `<button type="button" class="t2-mdop" data-t2md="${k}" aria-pressed="${md===k}"${off ? ' disabled' : ''}><b>${t}</b><span class="t2-mdd">${d}</span><span class="t2-mdu">${off ? '준비 중' : `쓰는 입력: ${u}`}</span></button>`; }).join('')}</div></div>`;
  const thm = `<div class="t2-mdax">${head('열 모델', '온도마다 켜고 끔 · 부품마다 공랭 / 수랭 (수랭 부품은 같은 냉각수 한 덩어리, 회로 설계는 도구 9) · 냉각수 온도는 수랭 부품이 있어야 계산')}<div class="t2-mdops four">${T2MDT.map(([k, c, t, d, u]) => {
      const cw = k==='cw_on', dead = cw && on[k] && !th.src;
      return `<div class="t2-mdop tg${on[k] ? ' on' : ''}"><b><button type="button" class="t2-tgb" data-t2th="${k}" aria-pressed="${on[k]}">${on[k] ? '켬' : '끔'}</button>${t}</b>
        ${c ? (() => { const wv = c==='b_cool' ? (WB.I.b_cool === 1 ? 1 : 0) : (WB.I[c] !== 0 ? 1 : 0); return `<span class="t2-mdc"><span class="muted">냉각</span><span class="dc-seg" role="group">${[[0, '공랭'], [1, '수랭']].map(([q, nm]) => `<button type="button" data-t2cool-${c}="${q}" aria-pressed="${wv===q}">${nm}</button>`).join('')}</span></span>`; })() : `<span class="t2-mdc muted">${th.src ? '수랭 부품 있음' : '수랭 부품 없음 → 계산 안 함'}${dead ? ' (켜 두었지만 고정값 사용)' : ''}</span>`}
        <span class="t2-mdd">${d}</span><span class="t2-mdu">쓰는 입력: ${u}</span></div>`; }).join('')}</div></div>`;
  return `<div class="t2-model"><p class="muted t2-mdnote">차량 모델은 하나를 고르고, 열 모델은 계통마다 켜고 끕니다. 계산에 쓴 조합은 시뮬레이션 탭 위에 [모델 · 차량 N · 열 …]으로 보입니다. 대시보드로 보내는 값은 늘 차량 0 · 열 모델 모터 열만으로 계산합니다. 차가 차지하는 폭(전장 · 저속 선회 때 차체 각도 β = atan(l_r ÷ R))은 기하라서 단계와 상관없이 늘 넣습니다 (차량 제원 › 치수, 전폭이 0 이면 안 씀).</p>
    ${veh}${thm}${t2Consts('model')}</div>`; }
/* 편집 탭 [냉각]: 외기 · 냉각수 등가값 + 도구 9 와 주고받기 (회로 설계는 도구 9 냉각 계통 계산기) */
function t2CoolLite(){ const o = WB.id==='2' && WB.R && WB.R.out, ok = o && isFinite(o.c_qm), f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—', lp = T2.lap[T2.course] || '1';
  return `<div class="t2-coolq">${t2Consts('cool')}
    <div class="t2-cq"><b>냉각 회로 설계 → 도구 9 냉각 계통 계산기</b>
      <p class="muted">수랭 회로 · 라디에이터 · 펌프 · 공랭 덕트 배치와 부품 정상 온도는 도구 9 에서 계산합니다. 이 도구는 수랭 부품(모델 단계에서 고름)의 냉각수를 한 덩어리로 보고 위 등가값만 씁니다. 도구 9 의 [도구 2 에 등가값 넣기]가 이 칸 · 부품별 공랭 / 수랭을 채웁니다.</p>
      <div class="t2-cqb"><button type="button" class="btn small" data-t2to9="send"${ok ? '' : ' disabled title="시뮬레이션 탭에서 계산한 뒤 보낼 수 있음"'}>평균 발열 · 차속을 도구 9 로 보내기</button><button type="button" class="btn small" data-t2to9="open">도구 9 열기</button></div>
      ${ok ? `<p class="muted">보낼 값 (${T2CN[T2.course] || ''}${lp==='all' ? ' · 전체 랩' : ` · ${lp}번째 랩`} 평균): 모터 손실 ${f(o.c_qm, 0)} W · 인버터 손실 ${f(o.c_qi, 0)} W · 축전지 발열 ${f(o.c_qb, 0)} W · 차속 ${f(o.c_vavg, 1)} km/h · 주행 시간 ${f(o.c_trun, 0)} s</p>` : ''}</div></div>`; }
document.addEventListener('click', e => { if(WB.id==='2' && e.target.closest && e.target.closest('[data-t2to4]') && WB_TOOLS['4']) wbOpen('4'); });
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return; const b = e.target.closest('[data-t2to9]'); if(!b || b.disabled) return;
  if(b.dataset.t2to9==='send'){ const o = WB.R && WB.R.out; if(!o || !isFinite(o.c_qm)) return; let s = {}; try{ s = JSON.parse(localStorage.getItem(wbStoreKey('9')) || '{}') || {}; }catch(err){ s = {}; }
    Object.assign(s, {L_m:+o.c_qm.toFixed(1), L_i:+o.c_qi.toFixed(1), L_b:+o.c_qb.toFixed(1), v:+o.c_vavg.toFixed(2), t_run:Math.round(o.c_trun), t_amb:WB.I.t_amb});
    try{ localStorage.setItem(wbStoreKey('9'), JSON.stringify(s)); }catch(err){} }
  if(WB_TOOLS['9']) wbOpen('9'); });
function t2EditBody(){ const et = T2.etab, grp = t2Grp(et);
  if(grp==='model') return t2ModelPage();
  if(grp==='cool') return t2CoolLite();
  if(grp==='course') return `${t2Consts('course')}${t2CourseEdit()}`;
  if(grp==='mot') return t2Consts('mot') + `<div class="t2-sub"><span class="muted">표</span>${t2Seg('data-t2et', et, T2MOT.map(k => [k, T2ET[k]]))}</div>` + t2MapEdit(et);
  if(grp==='tire') return t2Consts('tire') + t2MapEdit('tire');
  return t2Consts(grp); }

/* ---------- [입력하기 ▾] 메뉴: 표 k = track · mt · eM · eI · tire.  on = false 면 회색으로 막음 */
function t2MenuHTML(k, label, on){ const tpl = k==='track' ? 'track' : k==='mt' ? 'motor' : k==='tire' ? 'tire' : 'eff';
  const items = [k==='track' ? '' : `<button type="button" data-t2act="paste" data-t2k="${k}">붙여넣기</button>`, `<label class="t2-mi">파일 가져오기 (.xlsx · .csv)<input type="file" accept=".xlsx,.csv,.txt,.tsv" data-t2file="${k}" hidden></label>`,
    `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.xlsx">양식 받기 (.xlsx)</button>`, `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.csv">양식 받기 (.csv)</button>`,
    k==='track' ? `<button type="button" data-t2act="ex" data-t2k="track">예시 코스로</button>` : '',
    k==='mt' ? `<button type="button" data-t2act="ex" data-t2k="mt">예시 곡선으로</button>` : '', k==='eM' ? `<button type="button" data-t2act="ex" data-t2k="eM">예시 효율 맵으로</button>` : '',
    `<button type="button" data-t2act="clear" data-t2k="${k}">${k==='track' ? '비우기 (내 코스 없음)' : '비우기 (왼쪽 상수 칸 사용)'}</button>`].filter(Boolean);
  return `<div class="t2-menu"><button type="button" class="btn small" data-t2menu="${k}" aria-expanded="${T2.menu===k}"${on ? '' : ' disabled title="공식 코스는 고칠 수 없습니다"'}>${label} ▾</button>${T2.menu===k && on ? `<div class="t2-mn" role="menu">${items.join('')}</div>` : ''}</div>`; }

/* ---------- 붙여넣기 창 (넣으면 표를 덮어씀) */
function t2PasteHTML(){ const k = T2.paste; if(!k) return '';
  const ph = k==='mt' ? T2MOTOR_PH : k==='tire' ? T2TIRE_PH : T2EFF_PH, nm = T2ET[k];
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
  const B = t2ConeBounds(), N = FSK26.seg.length, W = (a, i) => (a[i] + a[(i + 1) % N]) / 2, sl = new Set(B.slalom);   // 공식 코스: 폭 = 실제 콘 위치로 잡은 경계 (구간 양 끝 평균), 콘 = 구간 시작 부근 슬라럼 콘
  if(c==='end') return FSK26.seg.map(([l, R], i) => ({l, R, wl:W(B.WL, i), wr:W(B.WR, i), cone:sl.has(i), note:''}));
  if(c==='ax')  return FSK26.seg.map((_, k) => { const i = N - 1 - k, [l, R] = FSK26.seg[i]; return {l, R:-R, wl:W(B.WR, i), wr:W(B.WL, i), cone:sl.has((i + 1) % N), note:''}; });
  if(c==='acc') return [{l:75, R:0, note:'가속 구간'}];
  const C2 = 2*Math.PI*9.125;
  return [{l:15, R:0, note:'진입'}, {l:C2, R:-9.125, note:'오른쪽 1바퀴'}, {l:C2, R:-9.125, note:'오른쪽 2바퀴 (기록)'}, {l:C2, R:9.125, note:'왼쪽 1바퀴'}, {l:C2, R:9.125, note:'왼쪽 2바퀴 (기록)'}, {l:15, R:0, note:'탈출'}]; }
const t2LapsOf = c => c==='free' ? T2.free.laps : c==='end' ? FSK26.laps : 1;
function t2LapSel(){ const c = T2.course, n = t2LapsOf(c), cur = n > 1 ? (T2.lap[c] || '1') : '1';
  const o = n > 1 ? [['all', '전체'], ...Array.from({length:n}, (_, i) => [String(i + 1), `${i + 1}번째 랩${c==='end' && (i===0 || i===FSK26.stint) ? ' (정지 출발)' : ''}`])] : [['1', '1번째 랩']];
  return `<select data-t2lap${n > 1 ? '' : ' disabled'}>${o.map(([k, t]) => `<option value="${k}"${cur===k ? ' selected' : ''}>${t}</option>`).join('')}</select>`; }
function t2CourseEdit(){ const c = T2.ecourse, own = c==='free', rows = t2CourseRows(c);   // 편집 탭 코스 = 시뮬레이션 코스와 따로 (바꿔도 계산 안 함)
  return `<div class="t2-set">${t2Seg('data-t2ecourse', c, T2COURSES.map(k => [k, T2CN[k]]))}
      <label>랩 수 <input type="number" min="1" step="1" data-t2o="laps" value="${t2LapsOf(c)}"${own ? '' : ' disabled'}></label>
      <label>출발 위치 <input type="number" min="0" step="any" data-t2o="s0" value="${own ? T2.free.s0 : 0}"${own ? '' : ' disabled'}> m</label>
      <span class="t2-sum" id="t2sum">${t2SumText(rows, own)}</span></div>
    <p class="t2-rule muted">${own ? '' : '<b>공식 코스 · 보기만 (고칠 수 없음).</b> '}${T2INFO[c]()}</p>
    ${t2Pair(t2MenuHTML('track', '코스 입력하기', own), `<div class="t2-tw${own ? '' : ' ro'}" id="t2tt">${t2TrackTable(rows, own)}</div>`,
      `<span class="muted">그림을 누르면 표에서 그 구간으로 갑니다</span>${T2ZB}`, `<div class="t2-fbox" id="t2emap" data-zoombox="t2emap">${t2MapSVG(true)}</div>`,
      '<span class="t2-mleg"><i class="sl"></i>출발 (주행 방향 오른쪽) <i class="fin"></i>결승 (왼쪽) <i class="arr">→</i>주행 방향</span>')}`; }
/* 맵 편집 한 줄: 왼쪽 [위 줄 + 표 상자], 오른쪽 [위 줄 + 그림 상자 + 아래 글]. 두 상자는 같은 높이 */
const t2Pair = (lt, lbox, rt, rbox, rcap) => `<div class="t2-tr"><div class="t2-col"><div class="t2-top">${lt}</div>${lbox}</div><div class="t2-col"><div class="t2-top">${rt}</div>${rbox}${rcap ? `<div class="t2-fcap muted">${rcap}</div>` : ''}</div></div>`;
function t2SumText(rows, own){ if(!rows.length) return '<span class="wb-err">구간 없음</span>';
  const nc = own ? t2FreeCones().filter(c => c[2]==='C').length : rows.filter(r => r.cone).length, tight = own ? t2SlalomTight(rows) : [];
  return `한 바퀴 <b>${wbFmt(t2Sum(rows.map(r => r.l)), 1)}</b> m · 구간 ${rows.length}개${nc ? ` · 슬라럼 콘 ${nc}개` : ''}${tight.length ? ` · <span class="wb-err">${tight.slice(0, 5).join(', ')}번 구간: 폭이 차 중심 여유 × 2 보다 좁아 콘을 번갈아 비켜 갈 수 없음</span>` : ''}`; }
/* 구간 표. own = 내 코스 (칸을 눌러 고침 · × 지우기 · + 구간 · Ctrl+V 로 여러 칸 붙이기)
   폭 빈칸은 윗 행 값을 흐리게 보여 줌 (첫 행은 늘 적혀 있음) */
function t2TrackTable(rows, own){ const ed = (i, k, v, cls, raw) => own ? `<td class="t2-e${cls ? ' ' + cls : ''}" data-t2e="${i},${k}"${raw!=null ? ` data-t2v="${raw}"` : ''} tabindex="0">${v}</td>` : `<td${cls ? ` class="${cls}"` : ''}>${v}</td>`;
  const W = own ? t2Widths(rows) : rows.map(r => [r.wl, r.wr]), f2 = x => wbFmt(x, 2);
  const wc = (i, k, v, eff) => ed(i, k, isFinite(v) ? f2(v) : `<span class="t2-inh">${f2(eff)}</span>`, 'n', isFinite(v) ? +v : '');
  const body = rows.map((r, i) => `<tr>${ed(i, 'no', i + 1, 'muted')}${ed(i, 'type', r.R ? (r.R > 0 ? '왼쪽' : '오른쪽') : '직선')}${ed(i, 'l', f2(r.l), 'n')}${ed(i, 'R', r.R ? f2(Math.abs(r.R)) : '', 'n')}${ed(i, 'ang', r.R ? wbFmt(r.l/Math.abs(r.R)*180/Math.PI, 1) : '', 'n')}`
    + `${own ? wc(i, 'wl', r.wl, W[i][0]) + wc(i, 'wr', r.wr, W[i][1]) : `<td class="n">${f2(r.wl)}</td><td class="n">${f2(r.wr)}</td>`}`
    + `${own ? ed(i, 'sl', isFinite(r.sl) ? f2(r.sl) : '', 'n', isFinite(r.sl) ? +r.sl : '') : `<td class="n">${r.cone ? '<span class="t2-cdot" title="구간 시작에 가운데 콘"></span>' : ''}</td>`}`
    + `${ed(i, 'note', wbEsc(r.note || ''), 'muted')}${own ? `<td><button type="button" class="t2-x" data-t2del="${i}" aria-label="${i + 1}번 구간 지우기">×</button></td>` : ''}</tr>`).join('');
  return `<table class="t2-tt"><thead><tr><th>#</th><th>종류</th><th>길이 m</th><th>반경 m</th><th>각도 °</th><th title="가운데 선에서 왼쪽 경계까지 (빈칸 = 윗 행 값)">왼쪽 폭 m</th><th title="가운데 선에서 오른쪽 경계까지 (빈칸 = 윗 행 값)">오른쪽 폭 m</th><th title="${own ? '구간 가운데 선 위 콘 간격 (첫 콘 = 시작 + 간격 ÷ 2, 빈칸 = 콘 없음)' : '구간 시작에 가운데 콘'}">${own ? '슬라럼 콘 간격 m' : '슬라럼 콘'}</th><th>메모</th>${own ? '<th></th>' : ''}</tr></thead>
    <tbody>${body || `<tr><td colspan="10" class="muted">구간이 없습니다. [+ 구간] 또는 [코스 입력하기]로 넣으십시오. 엑셀에서 여러 칸을 복사해 이 표에 Ctrl+V 해도 됩니다. 비워 두면 내 코스는 계산하지 않습니다.</td></tr>`}
    ${own ? '<tr class="t2-addr"><td colspan="10"><button type="button" data-t2add>+ 구간 (행)</button></td></tr>' : ''}</tbody></table>
    ${own ? '<p class="muted t2-pvh">엑셀에서 여러 칸을 복사해 표에 Ctrl+V = 표 전체를 바꿈 (양식과 같은 열 순서)</p>' : ''}`; }
const T2HDR = '종류, 길이 m, 반경 m, 왼쪽 폭 m, 오른쪽 폭 m, 슬라럼 콘 간격 m';
const t2RowsText = rows => [T2HDR, ...rows.map(r => { const n = x => isFinite(x) ? String(+(+x).toFixed(4)) : '';
  return [r.R ? (r.R > 0 ? '왼쪽' : '오른쪽') : '직선', n(r.l), r.R ? n(Math.abs(r.R)) : '', n(r.wl), n(r.wr), n(r.sl)].join(', ').replace(/(, )+$/, '') + (r.note ? '  # ' + r.note.replace(/#/g, '') : ''); })].join('\n');
/* 칸 고치기: k = no(번호 → 그 자리로 옮기고 뒤를 밀어냄) · type · l · R · ang(각도 → 길이) · note */
function t2Edit(i, k, v){ const rows = t2Track(T2.free.text).rows, r = rows[i]; if(!r) return; const x = parseFloat(v);
  if(k==='no'){ if(!isFinite(x)) return; const n = Math.max(1, Math.min(rows.length, Math.round(x))); rows.splice(i, 1); rows.splice(n - 1, 0, r); }
  else if(k==='type'){ const R0 = Math.abs(r.R) || 10; r.R = v==='직선' ? 0 : v==='왼쪽' ? R0 : -R0; }
  else if(k==='l'){ if(!(x > 0)) return; r.l = x; }
  else if(k==='R'){ if(!(x > 0) || !r.R) return; r.R = Math.sign(r.R)*x; }
  else if(k==='ang'){ if(!(x > 0) || !r.R) return; r.l = Math.abs(r.R)*x*Math.PI/180; }
  else if(k==='wl' || k==='wr'){ if(String(v).trim()===''){ r[k] = NaN; } else if(x >= 0) r[k] = x; else return; }   // 빈칸 = 윗 행 값
  else if(k==='sl'){ if(String(v).trim()==='' || x===0){ r.sl = NaN; } else if(x > 0) r.sl = x; else return; }   // 빈칸 · 0 = 콘 없음
  else if(k==='note') r.note = String(v).replace(/#/g, '').trim();
  t2SetRows(rows); }
function t2SetRows(rows){ T2.free.text = t2RowsText(rows); t2Repaint(); t2Soon(); }
/* 칸을 누르면 입력칸으로 바뀜 (Enter · 칸 밖 누름 = 반영, Esc = 취소) */
function t2CellOpen(td){ if(td.querySelector('input,select')) return; const [i, k] = td.dataset.t2e.split(','), now = td.textContent.trim(); let f;
  if(k==='type' && !td.dataset.t2g){ f = document.createElement('select'); ['직선', '왼쪽', '오른쪽'].forEach(o => { const op = document.createElement('option'); op.textContent = o; if(o===now) op.selected = true; f.appendChild(op); }); }
  else { f = document.createElement('input'); f.type = k==='note' || td.dataset.t2g ? 'text' : 'number'; f.step = 'any'; f.value = td.dataset.t2v!=null ? td.dataset.t2v : k==='note' || td.dataset.t2g ? now : String(now).replace(/,/g, ''); }
  f.className = 't2-ci'; td.textContent = ''; td.appendChild(f); f.focus(); if(f.select) f.select(); let done = false;
  const was = td.dataset.t2v!=null ? td.dataset.t2v : now;
  const commit = ok => { if(done) return; done = true; if(ok && f.value!==was) (td.dataset.t2g ? t2GridEdit : t2Edit)(+i, td.dataset.t2g ? +k : k, f.value); else t2Repaint(); };
  f.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); commit(true); } else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); commit(false); } });
  f.addEventListener('blur', () => commit(true)); if(f.tagName==='SELECT') f.addEventListener('change', () => commit(true)); }

/* ============================================================ 맵 편집: 모터 토크 곡선 · 효율 맵 · 타이어 하중 감도 */
const t2Grid = txt => t2Lines(txt).filter(l => l.cells.length).map(l => l.cells);
const t2GridText = g => g.map(r => r.join(', ')).join('\n');
const t2MtText = k => k==='mt' ? T2.mtext : T2[k];
function t2MtSet(k, txt){ if(k==='mt') T2.mtext = txt; else T2[k] = txt; t2Repaint(); t2Soon(); wbPaint(['in']); }
function t2GridEdit(r, c, v){ const k = T2.etab, g = t2Grid(t2MtText(k)); if(!g[r]) return; g[r][c] = String(v).trim(); t2MtSet(k, t2GridText(g)); }
const T2ERULE = {
  mt:   '1열 회전수 rpm · 2열 최대 토크 · 3열 연속 토크 N·m. 위 [모터 표 기준 전압]에서 잰 곡선을 축전지 단자 전압과 유도 전압 비로 늘이고 줄입니다. 연속 토크는 디레이팅 하한입니다. 비면 [모터 최대 토크] 일정.',
  eM:   '첫 행 = 회전수 rpm, 첫 열 = 토크 N·m, 칸 = 효율 %. 숫자 하나면 상수. 비우면 위 [모터 효율] 상수 칸. 모터 손실(열)은 이 효율로 계산합니다.',
  eI:   '첫 행 = 회전수 rpm, 첫 열 = 토크 N·m, 칸 = 효율 %. 숫자 하나면 상수. 비우면 위 [인버터 효율] 상수 칸. 모터 × 인버터 효율을 곱해 쓰므로, 합친 맵을 모터에 넣고 인버터를 100 으로 둬도 같습니다.',
  tire: '한 행에 바퀴 하나 수직 하중 N · 그때 μ (사이는 직선 보간, 범위 밖은 끝값). 숫자 하나면 하중과 상관없는 μ. 비우면 위 [타이어 마찰계수] · [μ 하중 감도].' };
/* 맵에 읽을 값이 있는지 (머리 행만 남은 표도 '비어 있음') · 계산에 표를 쓰는지 */
const t2HasMap = k => { const t = t2MtText(k); return k==='mt' ? t2MotorParse(t).pts.length > 0 : k==='tire' ? !!t2TireParse(t).map : !!t2EffParse(t).map; };
const t2UseMap = k => t2HasMap(k) && T2.use[k]!=='const';
const T2MTITLE = {mt:'모터 토크 곡선 표 — 채우고 [아래 표]를 고르면 위 [모터 최대 토크] 대신 씀', eM:'모터 효율 맵 — 채우고 [아래 표]를 고르면 위 [모터 효율 (상수)] 대신 씀',
                  eI:'인버터 효율 맵 — 채우고 [아래 표]를 고르면 위 [인버터 효율 (상수)] 대신 씀', tire:'타이어 하중 감도 표 — 채우고 [아래 표]를 고르면 위 [타이어 μ] · [μ 하중 감도] 대신 씀'};
function t2MapEdit(k){ const txt = t2MtText(k), has = t2HasMap(k), empty = !t2UseMap(k);
  const msg = k==='mt' ? t2MotorMsg(t2MotorParse(txt)) : k==='tire' ? (t2TireParse(txt).msg || '비어 있음') : (t2EffParse(txt).msg || '비어 있음');
  const useSeg = `<span class="t2-use"><span class="muted">계산에 쓸 값</span>${t2Seg('data-t2use', has && T2.use[k]!=='const' ? 'tab' : 'const', [['tab', '아래 표'], ['const', '위 상수']])}</span>`;
  return `<div class="t2-mth"><b>${T2MTITLE[k].split(' — ')[0]}</b><span class="muted"> — ${T2MTITLE[k].split(' — ')[1]}</span>${useSeg}</div>
    <div class="t2-set"><span class="t2-sum" id="t2msum">${msg}</span></div><p class="t2-rule muted">${T2ERULE[k]}</p>
    ${t2Pair(t2MenuHTML(k, '입력하기', true), `<div class="t2-tw" id="t2tt">${t2GridTable(k, txt)}</div>`,
      empty ? `<span class="t2-const">${has ? '[위 상수]를 골라' : '표가 비어 있어'} 위 상수 칸을 씁니다 · ${t2ConstNote(k)}</span>` : '<span class="muted">그림을 누르면 표에서 그 칸으로 갑니다</span>',
      `<div class="t2-fbox" id="t2mc">${t2EditPlot(k)}</div>`, t2EditCap(k))}`; }
/* 표가 비었을 때 쓰는 상수 */
function t2ConstNote(k){ const I = WB.I;
  return k==='mt' ? `모터 최대 토크 ${wbFmt(I.tmax, 0)} N·m 일정` : k==='eM' ? `모터 효율 ${wbFmt(I.eta_mot, 1)} %` : k==='eI' ? `인버터 효율 ${wbFmt(I.eta_inv, 1)} %` : `μ ${wbFmt(I.mu, 2)} · 하중 감도 ${wbFmt(I.mu_s, 3)} 1/kN`; }
function t2MotorMsg(M){ return M.pts.length ? `${M.pts.length}점 · ${wbFmt(M.pts[0][0], 0)} ~ ${wbFmt(M.pts[M.pts.length-1][0], 0)} rpm · 최대 ${wbFmt(Math.max(...M.pts.map(p => p[1])), 1)} N·m${M.ptsC.length ? ` · 연속 ${wbFmt(Math.max(...M.ptsC.map(p => p[1])), 1)} N·m` : ' · 연속 토크 없음'}` : '비어 있음 → 위 [모터 최대 토크] 일정'; }
/* 칸 표: 행 지우기 ×(행 끝) · [+ 행](표 아래 한 행) · 맵은 열 지우기 ×(맨 아래 행) · [+ 열](표 오른쪽 한 열) */
function t2GridTable(k, txt){ const g = t2Grid(txt), map = k==='eM' || k==='eI';
  const addRow = n => `<tr class="t2-addr"><td colspan="${n}"><button type="button" data-t2gadd="row">+ 행${map ? ' (토크)' : ''}</button></td></tr>`;
  if(!g.length) return `<table class="t2-tt t2-gtab"><tbody><tr><td class="t2-empty muted">비어 있습니다. 아래 [+ 행]으로 바로 만들거나 [입력하기]로 붙여 넣기 · 파일 가져오기.</td></tr>${addRow(1)}</tbody></table>`;
  const head = !isFinite(parseFloat(g[0][0])) || (map && g.length > 1), rows = head ? g.slice(1) : g, off = head ? 1 : 0, nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  const cell = (r, c, v, th) => `<${th ? 'th' : 'td'} class="t2-e${c===0 && map && !th ? ' t2-rh' : ''}" data-t2e="${r},${c}" data-t2g="1" tabindex="0">${wbEsc(v ?? '')}</${th ? 'th' : 'td'}>`;
  const nr = (head ? 1 : 0) + rows.length + (map ? 1 : 0);
  const addCol = map ? `<th class="t2-addc" rowspan="${nr}"><button type="button" data-t2gadd="col">+ 열<br><span>(회전수)</span></button></th>` : '';
  const x = (i, lab) => `<td class="t2-xc"><button type="button" class="t2-x" data-t2gdel="${i}" aria-label="${lab} 지우기" title="${lab} 지우기">×</button></td>`;
  // 머리 행도 tbody 안에 둠: [+ 열] 칸의 rowspan 이 행 묶음(thead · tbody)을 넘지 못하므로
  return `<table class="t2-tt t2-gtab${map ? ' map' : ''}"><tbody>${head ? `<tr class="t2-hrow">${Array.from({length:nc}, (_, c) => cell(0, c, g[0][c], true)).join('')}<th class="t2-xc"></th>${addCol}</tr>` : ''}
    ${rows.map((r, i) => `<tr data-t2row="${i + off}">${Array.from({length:nc}, (_, c) => cell(i + off, c, r[c])).join('')}${x(i + off, `${i + 1}번 행`)}${!head && i===0 ? addCol : ''}</tr>`).join('')}
    ${map ? `<tr class="t2-delc"><td class="t2-xc"></td>${Array.from({length:nc - 1}, (_, c) => `<td class="t2-xc"><button type="button" class="t2-x" data-t2gdelc="${c + 1}" aria-label="${c + 1}번 열 지우기" title="${c + 1}번 열 (${wbEsc(g[0][c + 1] ?? '')} rpm) 지우기">×</button></td>`).join('')}<td class="t2-xc"></td></tr>` : ''}
    ${addRow(nc + 1 + (map ? 1 : 0))}</tbody></table>`; }
/* 빈 표에 [+ 행 · 열]: 머리 행부터 만듦 */
const T2HEAD = {mt:['회전수 rpm', '최대 토크 N·m', '연속 토크 N·m'], tire:['하중 N', 'μ'], eM:['토크 N·m \\ 회전수 rpm', '0'], eI:['토크 N·m \\ 회전수 rpm', '0']};
function t2GridAdd(k, what){ const g = t2Grid(t2MtText(k)); if(!g.length) g.push(T2HEAD[k].slice());
  const nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  if(what==='col'){ g.forEach(r => { while(r.length < nc) r.push(''); r.push(''); }); }
  else g.push(Array.from({length:nc}, () => ''));
  t2MtSet(k, t2GridText(g)); const tw = $('#t2tt'); if(tw){ if(what==='col') tw.scrollLeft = tw.scrollWidth; else tw.scrollTop = tw.scrollHeight; } }
function t2GridDelCol(k, c){ const g = t2Grid(t2MtText(k)); if(c < 1) return; g.forEach(r => { if(r.length > c) r.splice(c, 1); }); t2MtSet(k, t2GridText(g.filter(r => r.some(v => String(v).trim()!=='')))); }
/* 오른쪽 그림 */
function t2EditPlot(k){ const R = WB.id==='2' ? WB.R : null, I = WB.I;
  if(k==='tire'){ const M = t2TireParse(T2.tire).map, Z = t2TireZ(M), mu = Z.map(z => M ? tab1j(M, z) : Math.max(0, I.mu - I.mu_s*z/1000));
    return wbPlot({id:'t2tire', w:560, h:330, hit:'t2-pick', x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:'', dd:2}, {k:'fy', d:Z.map((z, i) => mu[i]*z), c:WB_COL[2], n:'낼 수 있는 힘 μ·Fz', u:'N', dd:0}], label:'타이어 하중 감도'}); }
  if(k==='eM' || k==='eI'){ const E = t2EffParse(t2MtText(k)); if(!E.map || t2Grid(t2MtText(k)).length < 2) return `<div class="t2-fconst">${E.map ? E.msg : `${k==='eM' ? '모터' : '인버터'} 효율 ${wbFmt(I[k==='eM' ? 'eta_mot' : 'eta_inv'], 1)} %`}<br><span class="muted">회전수 · 토크와 상관없이 일정</span></div>`;
    return t2Heat(E.map); }
  if(!R || !R.motor) return '<p class="wb-empty">계산 중…</p>'; const M = R.motor, kw = T => M.n.map((n, i) => T[i]*n*2*Math.PI/60/1000);
  return wbPlot({id:'t2m', w:560, h:330, hit:'t2-pick', x:{d:M.n, n:'모터 회전수', u:'rpm'}, ys:[{k:'a', d:M.tref, c:'#9aa0ab', n:'표 그대로', u:'N·m', dd:0}, {k:'b', d:M.tnom, c:WB_COL[0], n:'축전지 공칭', u:'N·m', dd:0}, {k:'c', d:M.tload, c:WB_COL[3], n:'최대 전류 때', u:'N·m', dd:0},
    {k:'pb', d:kw(M.tnom), c:WB_COL[5], n:'출력 (공칭)', u:'kW', dd:1}, {k:'pc', d:kw(M.tload), c:WB_COL[4], n:'출력 (최대 전류 때)', u:'kW', dd:1}], yn:{'N·m':'모터 최대 토크', 'kW':'모터 출력'}, label:'모터 토크 · 출력 곡선'}); }
/* 하중 감도 그림 가로 범위: 표 끝 하중 · 계산된 바퀴 하중 최댓값 중 큰 값 × 1.1 (계산 전이면 정지 때 바퀴 하중 × 3) */
function t2TireZ(M){ const R = WB.id==='2' ? WB.R : null, S = R && R.sig; let zmax = M ? M[M.length-1][0] : 0, zs = 0;
  if(S) ['fz_fl', 'fz_fr', 'fz_rl', 'fz_rr'].forEach(k => { const a = S[k]; if(a && a.length) for(let i = 0; i < a.length; i++) if(a[i] > zs) zs = a[i]; });
  if(!(zs > 0)) zs = 3*WB.I.m*9.81/4; zmax = Math.max(zmax, zs)*1.1; const st = wbTicks(0, zmax, 6).t, step = (st[1] - st[0])/10 || 50, n = Math.ceil(zmax/step);
  return Array.from({length:n + 1}, (_, i) => +(i*step).toPrecision(10)); }
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
  const xt = wbTicksIn(n0, n1, 8).t, yt = wbTicksIn(t0, t1, 6).t, X = n => L + (n - n0)/(n1 - n0)*pw, Y = t => T + ph - (t - t0)/(t1 - t0)*ph;
  s += xt.map(n => `<line x1="${X(n).toFixed(1)}" x2="${X(n).toFixed(1)}" y1="${T}" y2="${T + ph + 4}" class="t2-hg"/><text x="${X(n).toFixed(1)}" y="${T + ph + 15}" class="wb-tx" text-anchor="middle">${wbFmt(n, 0)}</text>`).join('')
     + yt.map(t => `<line x1="${L - 4}" x2="${L + pw}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" class="t2-hg"/><text x="${L - 6}" y="${(Y(t) + 3.5).toFixed(1)}" class="wb-tx" text-anchor="end">${wbFmt(t, 0)}</text>`).join('')
     + `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="t2-hf"/>`;
  s += `<text x="${L + pw/2}" y="${H - 4}" class="wb-tl" text-anchor="middle">모터 회전수 [rpm]</text><text x="12" y="${T + ph/2}" class="wb-tl" text-anchor="middle" transform="rotate(-90 12 ${T + ph/2})">토크 [N·m]</text>`;
  return s + `</svg>`; }
const t2HeatCap = M => { const all = M.e.flat(); return `파랑 ${wbFmt(Math.min(...all), 1)} % → 빨강 ${wbFmt(Math.max(...all), 1)} % · 칸에 마우스를 올리면 값, 누르면 표의 그 칸`; };

/* ============================================================ 시뮬레이션: 결과 아래 [구동력 선도 | 코스 지도] */
const T2ZB = '<span class="t2-zb"><button type="button" class="btn small" data-t2z="in" aria-label="확대">+</button><button type="button" class="btn small" data-t2z="out" aria-label="축소">−</button><button type="button" class="btn small" data-t2z="fit">맞춤</button></span>';
function t2MidHTML(){ if(T2.tab!=='sim') return '';
  return `<div class="t2-mid">
      <section class="wb-sec t2-ftw" aria-label="구동력 선도"><div class="wb-h"><h3>구동력 선도</h3></div>
        <div class="t2-fbox t2-ftbox"><div id="t2ft">${T2.pf.html || '<p class="wb-empty">계산 중…</p>'}</div><div class="t2-ftov" id="t2ftov" hidden></div></div><div id="t2ftv" class="t2-ftv">${T2.pf.note || ''}</div></section>
      <section class="wb-sec t2-mapw" aria-label="코스 지도"><div class="wb-h"><h3>코스 지도</h3>${T2ZB}</div>
        <div class="t2-fbox" id="t2map" data-zoombox="t2map">${t2MapSVG(false)}</div><div class="t2-ftv muted" id="t2mcap"></div></section></div>`; }

/* ---------- 구동력 선도 프로브: 프로브가 멈추면 그 점의 상태로 선도를 다시 계산 (계산은 별도 Worker) */
T2.pf = { html:'', note:'', timer:0, busy:false, want:null, w:null, src:'' };
function t2PfOverlay(t){ const o = $('#t2ftov'); if(!o) return; o.hidden = !t; o.textContent = t || ''; }
function t2PfSoon(){ clearTimeout(T2.pf.timer); if(T2.tab!=='sim') return; t2PfOverlay('프로브 이동 중…'); T2.pf.timer = setTimeout(t2PfRun, 400); }
function t2PfRun(){ const R = WB.R, S = R && R.sig; if(!S || !S.v || !S.voc){ t2PfOverlay(''); return; }
  const i = Math.max(0, Math.min(S.v.length - 1, WB.xi || 0)), g = 9.81;
  const st = {i, v:S.v[i], gr:R.out.c_gr, V:S.voc[i], Tm:S.tmot[i], ay:Math.abs(S.ay[i])*g, ax:S.ax[i]*g, axg:S.ax[i], tq:S.tq[i], tlim:S.tlim[i]};
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
    yn:{'N':'바퀴 힘'}, label:'구동력 선도 (코스 프로브 지점)'});
  T2.pf.note = `<div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 토크 곡선 한계 (디레이팅 포함)</span><span><i style="background:${WB_COL[5]}"></i>단자 출력 상한 (규정 · 전류 · 에너지) × 효율</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계</span><span><i style="background:${WB_COL[1]}"></i>제동 접지 한계 (−)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항</span></div>
    <p class="t2-cap">프로브 ${wbFmt(WB.R.x.d[st.i], 1)} m · <b>${wbFmt(st.v, 1)} km/h</b>(세로선) · 개방 전압 ${wbFmt(st.V, 1)} V · 모터 ${wbFmt(st.Tm, 1)} °C · 횡가속도 ${wbFmt(st.ay/9.81, 2)} g · 감속비 ${wbFmt(st.gr, 2)}<br>
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
function t2Geo(c){ let G, close = false, rev = false, extra = [];
  if(c==='ax' || c==='end'){ G = {X:[...FSK26.X, FSK26.X[0]], Y:[...FSK26.Y, FSK26.Y[0]]}; close = true; rev = c==='ax'; }
  else if(c==='free'){ G = t2FreeXY(); close = t2Closed(); }
  else if(c==='acc') G = t2Pts([[75, 0]], 0.5, 0, 0, 0);
  else { const SR = 9.125, C2 = 2*Math.PI*SR; G = t2Pts([[15, 0], [C2, -SR], [C2, -SR], [C2, SR], [C2, SR], [15, 0]], 0.5, 0, -15, Math.PI/2); [[SR, 0], [-SR, 0]].forEach(([cx, cy]) => [7.625, 10.625].forEach(rr => extra.push([cx, cy, rr]))); }
  return G && {...G, close, rev, extra}; }
const T2MW = 440, T2MH = 330;
/* 내 코스 콘 (지도용): 경계 콘 3 m 간격 (왼쪽 노랑 L · 오른쪽 파랑 R), 슬라럼 콘 (가운데 주황 C). 출발 위치와 상관없이 같은 자리 (코스 원점에서 그림) */
function t2FreeCones(){ const rows = t2Track(T2.free.text).rows; if(!rows.length) return []; const W = t2Widths(rows), out = [];
  let x = 0, y = 0, h = 0, s = 0, nb = 0;
  rows.forEach((r, k) => { const n = Math.max(1, Math.ceil(r.l/0.25)), st = r.l/n, cs = [];
    if(isFinite(r.sl)) for(let p = r.sl/2; p < r.l - 1e-6; p += r.sl) cs.push(p);
    let a = 0, ci = 0;
    const put = (wl, wr, side) => { const nx = -Math.sin(h), ny = Math.cos(h); if(side!=='R') out.push([x + nx*wl, y + ny*wl, 'L']); if(side!=='L') out.push([x - nx*wr, y - ny*wr, 'R']); };
    for(let i = 0; i <= n; i++){
      if(i && i <= n){ if(!r.R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/r.R; x += r.R*(Math.sin(h + dh) - Math.sin(h)); y -= r.R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } a += st; s += st; }
      if(i < n && s >= nb - 1e-9){ put(W[k][0], W[k][1]); nb += 3; }
      while(ci < cs.length && a >= cs[ci] - 1e-9){ out.push([x, y, 'C']); ci++; } } });
  return out; }
/* 코스 폭 경계 (지도 칠하기용): 왼쪽 · 오른쪽 경계 점 [[x, y]] (m). 공식 코스 = 실제 콘으로 잡은 폭 (t2ConeBounds), 내 코스 = 행마다 폭 (0.5 m 간격) */
function t2Bounds(c){
  if(c==='end' || c==='ax'){ const X = FSK26.X, Y = FSK26.Y, N = X.length, B = t2ConeBounds(), Lp = [], Rp = [];
    for(let i = 0; i < N; i++){ const a = (i - 1 + N) % N, b = (i + 1) % N, dx = X[b] - X[a], dy = Y[b] - Y[a], d = Math.hypot(dx, dy) || 1, nx = -dy/d, ny = dx/d;
      Lp.push([X[i] + nx*B.WL[i], Y[i] + ny*B.WL[i]]); Rp.push([X[i] - nx*B.WR[i], Y[i] - ny*B.WR[i]]); }
    return {L:Lp, R:Rp, close:true}; }
  if(c==='free'){ const rows = t2Track(T2.free.text).rows; if(!rows.length) return null; const W = t2Widths(rows), Lp = [], Rp = [];
    let x = 0, y = 0, h = 0;
    rows.forEach((r, k) => { const n = Math.max(1, Math.ceil(r.l/0.5)), st = r.l/n;
      for(let i = 0; i <= n; i++){
        if(i){ if(!r.R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/r.R; x += r.R*(Math.sin(h + dh) - Math.sin(h)); y -= r.R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } }
        if(i < n || k === rows.length - 1){ const nx = -Math.sin(h), ny = Math.cos(h); Lp.push([x + nx*W[k][0], y + ny*W[k][0]]); Rp.push([x - nx*W[k][1], y - ny*W[k][1]]); } } });
    return {L:Lp, R:Rp, close:t2Closed()}; }
  return null; }
/* 슬라럼 콘 자리에서 비켜 갈 폭이 모자란 곳 (양쪽 모두 폭 ≥ 2 × 차 중심 여유 여야 번갈아 비켜 감) */
function t2SlalomTight(rows){ const I = WB.I, b = I.w_car > 0 ? I.w_car/2 + Math.max(0, I.rl_m || 0) : Math.max(0, I.rl_b), W = t2Widths(rows);
  return rows.map((r, i) => isFinite(r.sl) && (W[i][0] < 2*b - 1e-9 || W[i][1] < 2*b - 1e-9) ? i + 1 : 0).filter(Boolean); }
/* 내 코스 표에 Ctrl+V: 엑셀에서 복사한 여러 칸(탭 · 줄바꿈)이면 표 전체를 바꿈. 첫 행에 열 이름이 있으면 그 이름으로, 없으면 양식 열 순서로 읽음 */
document.addEventListener('paste', e => { if(WB.id!=='2' || T2.tab!=='edit' || T2.etab!=='course' || T2.ecourse!=='free') return;
  const tw = e.target.closest && e.target.closest('#t2tt'); if(!tw) return; const txt = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
  if(!/[\t\n]/.test(txt.trim())) return;                       // 한 칸 붙이기는 그 칸 입력에 그대로
  e.preventDefault(); const lines = txt.replace(/\r/g, '').split('\n').filter(l => l.trim()).map(l => l.split('\t').map(c => c.trim()).join(', '));
  const first = (lines[0] || '').split(', '), head = t2HeadMap(first), legacy = !head && isFinite(parseFloat(first[0]));
  const P = t2Track((head || legacy ? '' : T2HDR + ', 메모\n') + lines.join('\n'));
  if(!P.rows.length){ toast('붙인 내용에서 구간을 찾지 못했습니다. 양식과 같은 열 순서(종류 · 길이 · 반경 · 왼쪽 폭 · 오른쪽 폭 · 슬라럼 콘 간격 · 메모)로 복사해 주십시오.'); return; }
  T2.free.text = t2RowsText(P.rows); t2Repaint(); t2Soon(); toast(`붙인 내용으로 구간 ${P.rows.length}개를 넣었습니다 (표 전체를 바꿈)${P.bad.length ? ` · ${P.bad.length}행은 숫자가 없어 건너뜀` : ''}`); });
/* 가운데 선 점 → 옆으로 e 만큼 (코스 원래 방향의 왼쪽 +). rl = {s: 가운데 선 거리 [m], e: 옆 거리 [m]} (계산 결과) */
function t2Offset(X, Y, rl){ const n = X.length, S = [0]; for(let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]));
  const f = rl.s.at(-1) / (S[n - 1] || 1), eAt = s => { const a = rl.s; let lo = 0, hi = a.length - 1; if(s <= a[0]) return rl.e[0]; if(s >= a[hi]) return rl.e[hi];
    while(hi - lo > 1){ const m = (lo + hi) >> 1; if(a[m] <= s) lo = m; else hi = m; } const t = (s - a[lo]) / ((a[hi] - a[lo]) || 1); return rl.e[lo] + t*(rl.e[hi] - rl.e[lo]); };
  const OX = [], OY = [];
  for(let i = 0; i < n; i++){ const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = X[b] - X[a], dy = Y[b] - Y[a], d = Math.hypot(dx, dy) || 1, e = eAt(S[i]*f);
    OX.push(X[i] - dy/d*e); OY.push(Y[i] + dx/d*e); }   // 왼쪽 법선 = (−ty, tx)
  return {X:OX, Y:OY}; }
function t2MapSVG(plain){ const c = plain ? T2.ecourse : T2.course, R = WB.id==='2' && !plain ? WB.R : null, mp = R && R.map, G = t2Geo(c); if(!G) return '<p class="muted">구간이 없습니다.</p>';
  const {X:xc, Y:yc, close, rev} = G, N = xc.length, pad = 22, W = T2MW, H = T2MH;
  const RLp = mp && mp.rl ? t2Offset(xc, yc, mp.rl) : null, xs = RLp ? RLp.X : xc, ys = RLp ? RLp.Y : yc;   // 주행선이 있으면 그 선을 칠함 (가운데 선은 점선)
  const x0 = Math.min(...xc) - (c==='skid' ? 3 : 0), x1 = Math.max(...xc) + (c==='skid' ? 3 : 0), y0 = Math.min(...yc), y1 = Math.max(...yc);
  const s = Math.min((W - 2*pad)/Math.max(1, x1 - x0), (H - 2*pad)/Math.max(1, y1 - y0)), ox = (W - (x1 - x0)*s)/2, oy = (H - (y1 - y0)*s)/2;
  const tx = x => ox + (x - x0)*s, ty = y => H - oy - (y - y0)*s, Pt = i => [tx(xs[i]), ty(ys[i])];
  T2[plain ? 'mpE' : 'mp'] = {N, pts:xs.map((_, i) => Pt(i))};   // 누르기 → 가장 가까운 점
  const Z = plain ? T2.zoomE : T2.zoom, vw = W/Z.k, vh = H/Z.k, vx = Z.cx*W - vw/2, vy = Z.cy*H - vh/2, sz = 1/Z.k;   // 확대 = viewBox 를 줄임 (선 굵기는 그대로)
  let svg = `<svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" class="t2-msvg${plain ? '' : ' live'}" role="img" aria-label="${T2CN[c]} 코스 지도">`;
  G.extra.forEach(([cx, cy, rr]) => { svg += `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="${(rr*s).toFixed(1)}" class="t2-sk" vector-effect="non-scaling-stroke"/>`; });
  const cones = c==='ax' || c==='end' ? FSK26.cones || [] : c==='free' ? t2FreeCones() : [];
  const cone = ([cx, cy, sd]) => `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="${((sd==='C' ? 2.2 : 1.6)*Math.max(sz, .35)).toFixed(2)}" class="t2-cone ${sd}"/>`;
  if(plain){ const BD = t2Bounds(c); if(BD){ const pts = A => A.map(([x, y]) => `${tx(x).toFixed(1)},${ty(y).toFixed(1)}`).join(' L');   // 편집 탭: 좌우 경계 안을 반투명 어두운 색으로
    svg += BD.close ? `<path d="M${pts(BD.L)}Z M${pts(BD.R)}Z" class="t2-corr" fill-rule="evenodd"/>` : `<path d="M${pts(BD.L)} L${pts(BD.R.slice().reverse())}Z" class="t2-corr"/>`; } }
  cones.forEach(q => { if(q[2]!=='C') svg += cone(q); });                     // 경계 콘은 선 아래, 슬라럼 콘(가운데)은 선 위에 (아래 '출발선' 앞에서)
  if(!plain && R && WB.I.w_car > 0) svg += t2Sweep(xs, ys, close, rev, tx, ty);   // 차가 지나간 영역 (반투명 회색)
  if(RLp) svg += `<polyline points="${xc.map((_, i) => [tx(xc[i]), ty(yc[i])].map(v => v.toFixed(1)).join(',')).join(' ')}" class="t2-cl" vector-effect="non-scaling-stroke"/>`;
  let vc = null, P = 0; if(mp){ vc = mp.vc || (mp.acc || mp.skid ? R.sig.v : null); P = mp.P || 0; }
  const leg = '<span class="t2-mleg"><i class="sl"></i>출발 <i class="fin"></i>결승 <i class="arr">→</i>주행 방향</span>'; let cap = '';
  if(vc){ const lo = isFinite(mp.lo) ? mp.lo : Math.min(...vc.filter(isFinite)), hi = isFinite(mp.hi) ? mp.hi : Math.max(...vc.filter(isFinite)), st = Math.max(1, Math.floor(N/900));
    for(let i = 0; i + st < N; i += st){ const kk = rev ? N - 1 - i : i, k = vc.length===N ? kk : Math.min(vc.length - 1, Math.round(kk*(vc.length - 1)/(N - 1))), vi = vc[k], f = hi > lo && isFinite(vi) ? Math.max(0, Math.min(1, (vi - lo)/(hi - lo))) : .5, a = Pt(i), b = Pt(Math.min(N - 1, i + st));
      svg += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="hsl(${(230 - 230*f).toFixed(0)} 75% 45%)" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`; }
    const lp = T2.lap[c], multi = t2LapsOf(c) > 1; cap = `느림 ${wbFmt(lo, 0)} km/h <i class="t2-grad"></i> 빠름 ${wbFmt(hi, 0)} km/h${multi ? ` (모든 랩 통틀어) · ${lp==='all' ? '2번째' : lp + '번째'} 랩` : ''} · 작은 점 = 프로브 ${leg}`; }
  else { svg += `<polyline points="${xs.map((_, i) => Pt(i).map(v => v.toFixed(1)).join(',')).join(' ')}" class="t2-line" vector-effect="non-scaling-stroke"/>`; cap = (plain || R ? '' : '계산이 끝나면 차속 색으로 칠합니다. ') + leg; }
  if(mp && mp.rbad && mp.rbad.length && RLp){   // 최소 회전 반경보다 급한 곳: 빨간 굵은 테두리
    const S0 = [0]; for(let i = 1; i < N; i++) S0.push(S0[i - 1] + Math.hypot(xc[i] - xc[i - 1], yc[i] - yc[i - 1])); const f = mp.rl.s.at(-1)/(S0[N - 1] || 1);
    const bad = i => { const s = S0[i]*f; return mp.rbad.some(([a, b]) => s >= a - 0.5 && s <= b + 0.5); };
    for(let i = 0; i + 1 < N; i++) if(bad(i) || bad(i + 1)){ const a = Pt(i), b = Pt(i + 1); svg += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" class="t2-rbad" vector-effect="non-scaling-stroke"/>`; }
    cap += ' · <span class="t2-rbadl">빨간 테두리 = 최소 회전 반경보다 급한 곳</span>'; }
  if(!plain && R && WB.I.w_car > 0) cap += ' · <span class="t2-swl"><i></i>차가 지나간 영역 (전폭 · 전장 · 저속 차체 각도)</span>';
  if(!plain) setTimeout(() => { const cp = $('#t2mcap'); if(cp) cp.innerHTML = cap; }, 0);
  cones.forEach(q => { if(q[2]==='C') svg += cone(q); });
  /* 출발선(초록) = 주행 방향 오른쪽 절반, 결승선(빨강) = 왼쪽 절반 → 같은 자리여도 겹치지 않음. 화살표는 출발선 끝에서 코스와 나란히 */
  const ix = i => close ? ((Math.round(i) % (N - 1)) + (N - 1)) % (N - 1) : Math.max(0, Math.min(N - 1, Math.round(i)));
  const q = 10*Math.max(sz, .3), i0 = rev ? N - 1 : 0, dir = rev ? -1 : 1, step = Math.max(2, Math.round(N/150));
  const dirAt = i => { const a = Pt(ix(i)), b = Pt(ix(i + dir*step)), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return {a, ux:dx/d, uy:dy/d, rx:-dy/d, ry:dx/d}; };   // 화면 좌표(y 아래)에서 오른쪽 = (−uy, ux)
  const half = (i, cls, side) => { const D = dirAt(i); return `<line x1="${D.a[0].toFixed(1)}" y1="${D.a[1].toFixed(1)}" x2="${(D.a[0] + side*D.rx*q).toFixed(1)}" y2="${(D.a[1] + side*D.ry*q).toFixed(1)}" class="${cls}" vector-effect="non-scaling-stroke"/>`; };
  const iS = c==='skid' ? Math.round(15/0.5) : i0, iF = c==='skid' ? Math.round(15/0.5) : close ? i0 : (rev ? 0 : N - 1);
  svg += half(iS, 't2-sl', 1) + half(iF, 't2-fin', -1);
  { const D = dirAt(iS), ox = D.a[0] + D.rx*q, oy = D.a[1] + D.ry*q, L = 2.2*q, ex = ox + D.ux*L, ey = oy + D.uy*L, ang = Math.atan2(D.uy, D.ux)*180/Math.PI;
    svg += `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" class="t2-arrl" vector-effect="non-scaling-stroke"/><path d="M-6,-4 L0,0 L-6,4" class="t2-arrh" vector-effect="non-scaling-stroke" transform="translate(${ex.toFixed(1)},${ey.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${Math.max(sz, .35).toFixed(2)})"/>`; }
  /* 프로브: 신호 그래프의 거리 위치 (여러 랩이면 한 랩 안의 위치) */
  if(R && R.x && WB.xi != null){ const k = t2SigToMap(WB.xi, N, P), q = Pt(k); svg += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(4*Math.max(sz, .35)).toFixed(2)}" class="t2-cur" vector-effect="non-scaling-stroke"/>`; }
  return svg + '</svg>'; }
/* 차가 지나간 영역: 지도 선(차 중심 경로, m) 점마다 차 사각형 (뒤 끝 ~ 앞 끝 × 전폭). 차체 방향 = 진행 방향 − β,  β = atan(l_r · κ) (저속 기구학 선회)
   κ = 세 점 곡률을 앞뒤 2 점씩 평균.  거꾸로 달리는 코스(오토크로스)는 진행 방향 · 곡률 부호를 뒤집음.  묶음 전체에 투명도를 한 번 걸어 겹친 곳도 같은 진하기 */
function t2Sweep(xs, ys, close, rev, tx, ty){ const I = WB.I, L = I.L/1000, lr = L*I.fr/100, xf = (L - lr) + Math.max(0, I.oh_f || 0), xr = lr + Math.max(0, I.oh_r || 0), hw = I.w_car/2;
  const N = xs.length, m = close ? N - 1 : N, ix = i => close ? ((i % m) + m) % m : Math.max(0, Math.min(N - 1, i)), dir = rev ? -1 : 1;
  const k3 = i => { const a = ix(i - 1), b = ix(i), c = ix(i + 1), x0 = xs[a], y0 = ys[a], x1 = xs[b], y1 = ys[b], x2 = xs[c], y2 = ys[c];
    const d = Math.hypot(x1 - x0, y1 - y0)*Math.hypot(x2 - x1, y2 - y1)*Math.hypot(x2 - x0, y2 - y0); return d > 1e-9 ? 2*((x1 - x0)*(y2 - y0) - (y1 - y0)*(x2 - x0))/d : 0; };
  const kr = Array.from({length:N}, (_, i) => k3(i)), K = i => { let s = 0, n = 0; for(let d = -2; d <= 2; d++){ const j = ix(i + d); s += kr[j]; n++; } return s/n; };
  let g = '<g class="t2-sweep">';
  for(let i = 0; i < m; i++){ const a = ix(i - 1), b = ix(i + 1); let ux = (xs[b] - xs[a])*dir, uy = (ys[b] - ys[a])*dir; const u = Math.hypot(ux, uy) || 1; ux /= u; uy /= u;
    const beta = Math.atan(lr*K(i)*dir), th = Math.atan2(uy, ux) - beta, c = Math.cos(th), s = Math.sin(th);
    const P = [[xf, hw], [xf, -hw], [-xr, -hw], [-xr, hw]].map(([x, y]) => `${tx(xs[i] + c*x - s*y).toFixed(1)},${ty(ys[i] + s*x + c*y).toFixed(1)}`);
    g += `<polygon points="${P.join(' ')}"/>`; }
  return g + '</g>'; }
/* 신호 칸 ↔ 지도 점: 공식 코스는 지도 점(대회 JSON)과 계산 칸 수가 달라 거리 비율로 맞춤, 오토크로스는 반대 방향 */
function t2SigToMap(xi, N, P){ const c = T2.course; let k = xi;
  if(P){ k = xi % P === 0 && xi ? P : xi % P; if(c==='end' || c==='ax'){ k = Math.round(k*(N - 1)/P); if(c==='ax') k = N - 1 - k; } }
  return Math.max(0, Math.min(N - 1, k)); }
function t2MapToSig(i){ const R = WB.R, mp = R && R.map, c = T2.course; if(!R || !R.x || !T2.mp) return null; const N = T2.mp.N, P = mp && mp.P || 0, n = R.x.d.length;
  if(!P) return Math.min(n - 1, i);
  let k = c==='end' || c==='ax' ? Math.round((c==='ax' ? N - 1 - i : i)*P/(N - 1)) : i; const base = Math.floor((WB.xi || 0)/P)*P;
  return Math.max(0, Math.min(n - 1, (n - 1 > P ? base : 0) + Math.min(P, k))); }
function t2MapRepaint(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(false); }
function t2EMapRepaint(){ const m = $('#t2emap'); if(m) m.innerHTML = t2MapSVG(true); }
/* 지도 두 개: 시뮬레이션 (#t2map, T2.zoom) · 편집 코스 (#t2emap, T2.zoomE)
   휠 확대 = 박스를 한 번 눌러 켠 뒤에만 (wbZoomOn, 스크롤하다 박스 위를 지나가도 확대되지 않게)
   끌기 이동 = 포인터를 박스에 잡아 둠 → 박스 밖으로 나가도 놓을 때까지 지도만 움직임 · 누르기 = 시뮬레이션은 프로브, 편집은 표의 그 구간 */
const t2MapOf = el => { const box = el && el.closest && el.closest('#t2map, #t2emap'); return box ? {box, edit:box.id==='t2emap'} : null; };
function t2SvgPt(svg, e){ const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function t2ZoomAt(f, px, py, edit){ const Z = edit ? T2.zoomE : T2.zoom, k = Math.max(1, Math.min(40, Z.k*f)); if(px != null){ const a = px/T2MW, b = py/T2MH; Z.cx = a - (a - Z.cx)*Z.k/k; Z.cy = b - (b - Z.cy)*Z.k/k; } Z.k = k;
  if(k===1){ Z.cx = .5; Z.cy = .5; } const h = .5/k; Z.cx = Math.max(h, Math.min(1 - h, Z.cx)); Z.cy = Math.max(h, Math.min(1 - h, Z.cy)); edit ? t2EMapRepaint() : t2MapRepaint(); }
document.addEventListener('wheel', e => { const M = t2MapOf(e.target); if(!M || !wbZoomOn(M.box)) return; const svg = M.box.querySelector('svg'); if(!svg) return;
  e.preventDefault(); const p = t2SvgPt(svg, e); t2ZoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y, M.edit); }, {passive:false});
let T2DRAG = null;
document.addEventListener('pointerdown', e => { const M = t2MapOf(e.target); if(!M || e.button || e.target.closest('button')) return; const svg = M.box.querySelector('svg'); if(!svg) return;
  e.preventDefault();   // 끌기 중 글자 선택 막음
  const Z = M.edit ? T2.zoomE : T2.zoom; try{ M.box.setPointerCapture(e.pointerId); }catch(err){}
  document.body.classList.add('wb-dragging'); T2DRAG = {box:M.box, edit:M.edit, id:e.pointerId, x:e.clientX, y:e.clientY, cx:Z.cx, cy:Z.cy, w:svg.getBoundingClientRect().width, moved:false}; });
document.addEventListener('pointermove', e => { const d = T2DRAG; if(!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if(!d.moved && Math.hypot(dx, dy) < 4) return; d.moved = true; e.preventDefault();
  const Z = d.edit ? T2.zoomE : T2.zoom, f = 1/(d.w*Z.k), h = .5/Z.k; Z.cx = Math.max(h, Math.min(1 - h, d.cx - dx*f)); Z.cy = Math.max(h, Math.min(1 - h, d.cy - dy*f*T2MW/T2MH)); d.edit ? t2EMapRepaint() : t2MapRepaint(); });
const t2DragEnd = e => { const d = T2DRAG; T2DRAG = null; document.body.classList.remove('wb-dragging'); if(!d) return; try{ d.box.releasePointerCapture(d.id); }catch(err){}
  if(d.moved || e.type==='pointercancel') return; const svg = d.box.querySelector('svg'), M = d.edit ? T2.mpE : T2.mp; if(!svg || !M) return;
  const p = t2SvgPt(svg, e); let bi = 0, bd = Infinity; M.pts.forEach(([x, y], i) => { const dd = (x - p.x)**2 + (y - p.y)**2; if(dd < bd){ bd = dd; bi = i; } });
  if(d.edit){ const r = t2PtToRow(bi); if(r >= 0) t2Hl($(`#t2tt tbody tr:nth-child(${r + 1})`)); }
  else { const xi = t2MapToSig(bi); if(xi != null) wbCursor('sig', xi); } };
document.addEventListener('pointerup', t2DragEnd); document.addEventListener('pointercancel', t2DragEnd);

/* ============================================================ 그림 → 표 칸 찾기 (그림에서 튀는 곳을 누르면 표의 그 칸으로) */
function t2Hl(el){ document.querySelectorAll('#t2tt .t2-hl').forEach(x => x.classList.remove('t2-hl')); if(!el) return; el.classList.add('t2-hl');
  const tw = $('#t2tt'); if(!tw) return; const a = tw.getBoundingClientRect(), b = el.getBoundingClientRect();
  tw.scrollTop += (b.top - a.top) - (a.height - b.height)/2; tw.scrollLeft += (b.left - a.left) - (a.width - b.width)/2; }
/* 코스 그림의 점 i → 표의 구간 행 (표 순서 = 달리는 순서) */
function t2PtToRow(i){ const c = T2.ecourse, rows = t2CourseRows(c), M = T2.mpE; if(!rows.length || !M) return -1; let s;
  if(c==='end' || c==='ax'){ const fr = i/(M.N - 1), len = t2Sum(rows.map(r => r.l)); s = (c==='ax' ? 1 - fr : fr)*len; }
  else { s = i*0.5; if(c==='free' && t2Closed()){ const len = t2Sum(rows.map(r => r.l)); s = (s + T2.free.s0) % len; } }
  let a = 0; for(let r = 0; r < rows.length; r++){ a += rows[r].l; if(s < a) return r; } return rows.length - 1; }
function t2PickX(svg, e){ const hit = svg.querySelector('.t2-pick'); if(!hit) return NaN; const rc = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (e.clientX - rc.left)/rc.width*vb.width;
  return +hit.dataset.wbx0 + (px - +hit.dataset.wbl)/(+hit.dataset.wbw)*(+hit.dataset.wbx1 - +hit.dataset.wbx0); }
document.addEventListener('click', e => { const t = e.target; if(!t.closest || !t.closest('#wbext .t2-fbox')) return;
  const rc = t.closest('#t2mc rect[data-ij]'); if(rc){ const [i, j] = rc.dataset.ij.split(',').map(Number); t2Hl($(`#t2tt [data-t2e="${i + 1},${j + 1}"]`)); return; }
  const sv = t.closest('#t2mc svg'); if(sv && sv.querySelector('.t2-pick')){ const x = t2PickX(sv, e), g = t2Grid(t2MtText(T2.etab)); let best = -1;
    g.forEach((r, i) => { const v = parseFloat(r[0]); if(isFinite(v) && (best < 0 || Math.abs(v - x) < Math.abs(parseFloat(g[best][0]) - x))) best = i; });
    if(best >= 0) t2Hl($(`#t2tt tr[data-t2row="${best}"]`)); } });

/* ============================================================ 고치기 · 이벤트 */
function t2Soon(){ t2Save(); clearTimeout(T2.timer); T2.timer = setTimeout(() => { wbRefresh(); t2PartDirty(); }, 350); }
function t2Repaint(){ const tw = $('#t2tt'), st = tw ? tw.scrollTop : 0, sl = tw ? tw.scrollLeft : 0; wbPaint(['ext']); const t2 = $('#t2tt'); if(t2){ t2.scrollTop = st; t2.scrollLeft = sl; } }
function t2SetCourse(c){ T2.course = c; T2.menu = ''; WB.zx = null; WB.zy = []; T2.zoom = {k:1, cx:.5, cy:.5}; T2.zoomE = {k:1, cx:.5, cy:.5}; t2Save(); WB.xi = 0; wbSelReset(['v', 'pw']); WB.act = ''; if(!WB.xa.startsWith('in:')) WB.xa = ''; wbPaint(['ext']); wbRefresh(); }
/* 기준 감속비 전환: 두 모드를 미리 계산해 두었으므로 결과만 바꿔 끼움 */
function t2SetGrMode(m){ T2.grMode = m; t2Save(); const R = WB.R; if(R && R.modes){ Object.assign(R, R.modes[m]); if(R.x && WB.xi >= R.x.d.length) WB.xi = R.x.d.length - 1; wbPaint(['ext', 'out', 'sig']); t2PfSoon(); } else wbRefresh(); }
document.addEventListener('input', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2o]')){ const k = t.dataset.t2o, v = parseFloat(t.value); if(!isFinite(v) || v < 0) return; T2.free[k] = k==='laps' ? Math.max(1, Math.round(v)) : v;
    t2EMapRepaint(); t2Soon(); } });
/* 결과 칸 '스키드패드 목표' 입력: Enter · 칸 밖 누름에 반영 (입력 칸은 계산 중 다시 그려도 됨) */
document.addEventListener('change', e => { const t = e.target; if(WB.id!=='2' || !t.matches || !t.matches('[data-t2skid]')) return;
  const v = parseFloat(t.value); WB.I.t_skid = isFinite(v) && v > 0 ? v : 0; wbSave(); wbCalcSoon(); });
document.addEventListener('change', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2file]')){ const f = t.files && t.files[0], k = t.dataset.t2file; t.value = ''; T2.menu = ''; if(f) t2Import(f, k==='mt' ? 'motor' : k); else t2Repaint(); return; }
  if(t.matches('[data-t2lap]')){ T2.lap[T2.course] = t.value; t2Save(); WB.xi = 0; t.blur(); wbRefresh(); } });
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return;
  const zb = t.closest('[data-t2z]'); if(zb){ const z = zb.dataset.t2z, ed = !!zb.closest('#wbext'); if(z==='fit'){ T2[ed ? 'zoomE' : 'zoom'] = {k:1, cx:.5, cy:.5}; ed ? t2EMapRepaint() : t2MapRepaint(); } else t2ZoomAt(z==='in' ? 1.5 : 1/1.5, null, null, ed); return; }
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
    if(k==='track'){ T2.paste = ''; t2Repaint(); return; }   // 내 코스는 붙여넣기 창 없음 (표에 Ctrl+V)
    else if(k==='mt'){ if(!t2MotorParse(v).pts.length){ toast('회전수 · 토크 행을 읽지 못했습니다.'); return; } T2.mtext = v; }
    else if(k==='tire'){ if(v.trim() && !t2TireParse(v).map){ toast('하중 · μ 행을 읽지 못했습니다.'); return; } T2.tire = v; }
    else { if(v.trim() && !t2EffParse(v).map){ toast('효율을 읽지 못했습니다. 숫자 하나 또는 맵(첫 행 회전수, 첫 열 토크)이어야 합니다.'); return; } T2[k] = v; }
    T2.paste = ''; t2Repaint(); t2Soon(); wbPaint(['in']); return; }
  const tb = t.closest('[data-t2tab]'); if(tb){ T2.tab = tb.dataset.t2tab; T2.menu = ''; t2Save(); wbPaint(['ext']);
    if(T2.tab==='sim'){ t2MapRepaint(); t2PfSoon(); if(WB.dirty){ WB.dirty = false; wbCalc(); } } return; }   // 편집에서 바꾼 것이 있으면 이제 계산
  const ec = t.closest('[data-t2ecourse]'); if(ec){ T2.ecourse = ec.dataset.t2ecourse; T2.menu = ''; T2.zoomE = {k:1, cx:.5, cy:.5}; t2Save(); wbPaint(['ext']); return; }
  const us = t.closest('[data-t2use]'); if(us){ T2.use[T2.etab] = us.dataset.t2use; t2Save(); wbPaint(['ext']); t2Soon(); return; }
  const rmb = t.closest('[data-t2rm]'); if(rmb){ WB.I.rm_on = +rmb.dataset.t2rm; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const el = t.closest('[data-t2el]'); if(el){ WB.I.e_lim = +el.dataset.t2el; if(WB.I.e_lim===2 && !(WB.I.e_target > 0)) WB.I.e_target = Math.round(t2Epack()*100)/100; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const cs = t.closest('[data-t2course]'); if(cs){ t2SetCourse(cs.dataset.t2course); return; }
  const et = t.closest('[data-t2et]'); if(et){ T2.etab = et.dataset.t2et; if(T2MOT.includes(T2.etab)) T2.emot = T2.etab; T2.menu = ''; t2Save(); wbPaint(['ext']); return; }
  const eg = t.closest('[data-t2eg]'); if(eg){ const g = eg.dataset.t2eg; T2.etab = g==='mot' ? (T2MOT.includes(T2.etab) ? T2.etab : (T2.emot || 'mt')) : g; T2.menu = ''; t2Save(); wbPaint(['ext']); return; }
  const rl = t.closest('[data-t2rl]'); if(rl){ WB.I.rl_on = +rl.dataset.t2rl; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const mdb = t.closest('[data-t2md]'); if(mdb){ if(mdb.disabled) return; WB.I.md = +mdb.dataset.t2md; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const cb = t.closest('[data-t2cool-m_cool],[data-t2cool-i_cool],[data-t2cool-b_cool]'); if(cb){ const k = ['m_cool', 'i_cool', 'b_cool'].find(q => cb.hasAttribute('data-t2cool-' + q)); WB.I[k] = +cb.getAttribute('data-t2cool-' + k); wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const mgb = t.closest('[data-t2mg]'); if(mgb){ WB.I.eff_mg = +mgb.dataset.t2mg; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const thb = t.closest('[data-t2th]'); if(thb){ const k = thb.dataset.t2th, now = k==='th_on' ? WB.I.th_on !== 0 : WB.I[k] === 1, v = now ? 0 : 1;
    WB.I[k] = v;
    wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const dl = t.closest('[data-t2del]'); if(dl){ const rows = t2Track(T2.free.text).rows; rows.splice(+dl.dataset.t2del, 1); t2SetRows(rows); return; }
  if(t.closest('[data-t2add]')){ const rows = t2Track(T2.free.text).rows; rows.push({l:10, R:0, wl:NaN, wr:NaN, sl:NaN, note:''}); t2SetRows(rows); const tw = $('#t2tt'); if(tw) tw.scrollTop = tw.scrollHeight; return; }
  const gd = t.closest('[data-t2gdel]'); if(gd){ const k = T2.etab, g = t2Grid(t2MtText(k)); g.splice(+gd.dataset.t2gdel, 1); t2MtSet(k, t2GridText(g)); return; }
  const gc = t.closest('[data-t2gdelc]'); if(gc){ t2GridDelCol(T2.etab, +gc.dataset.t2gdelc); return; }
  const ga = t.closest('[data-t2gadd]'); if(ga){ t2GridAdd(T2.etab, ga.dataset.t2gadd); return; }
  const ce = t.closest('td[data-t2e], th[data-t2e]'); if(ce){ t2CellOpen(ce); return; } });
document.addEventListener('keydown', e => { const ce = e.target.closest && e.target.closest('#wbext td[data-t2e], #wbext th[data-t2e]'); if(ce && e.key==='Enter' && !e.target.matches('input,select')){ e.preventDefault(); t2CellOpen(ce); }
  if(e.key==='Escape' && WB.id==='2' && (T2.paste || T2.menu)){ e.preventDefault(); e.stopImmediatePropagation(); T2.paste = ''; T2.menu = ''; t2Repaint(); } }, true);
/* 편집 탭에 표가 있으면 그 상수 칸은 막음 */
function t2InLock(k){ const L = '아래 표 사용';
  if(k==='eta_mot') return t2UseMap('eM') ? L : ''; if(k==='eta_inv') return WB.I.eff_mg === 1 ? '모터 맵에 합침' : t2UseMap('eI') ? L : ''; if(k==='tmax') return t2UseMap('mt') ? '아래 토크 곡선 사용' : '';
  if(k==='mu' || k==='mu_s') return t2UseMap('tire') ? L : '';
  if(k==='rmin') return WB.I.rm_on === 0 ? '고려 안 함' : '';
  if(k==='e_target') return t2ElOf()===2 ? '' : t2ElOf()===1 ? '제원 용량 사용' : '제한 없음';
  if(k==='rl_b') return WB.I.w_car > 0 ? '차 전폭으로 계산' : ''; if(k==='rl_m' || k==='oh_f' || k==='oh_r') return WB.I.w_car > 0 ? '' : '전폭이 0 이면 안 씀';
  if(['h_rcf', 'h_rcr', 'k_roll', 'rsd'].includes(k)) return WB.I.md >= 1 ? '' : '차량 모델 1 에서 씀';
  if(['tire_ca0', 'tire_cn', 'tire_c', 'tire_e', 'steer_ratio', 'delta_max'].includes(k)) return WB.I.md >= 2 ? '' : '차량 모델 2 에서 씀';
  if(['tire_relax', 'izz', 'ixx', 'm_us_f', 'm_us_r', 'c_roll', 'v_test', 'ay_test'].includes(k)) return WB.I.md >= 3 ? '' : '차량 모델 3 에서 씀';
  { const th = t2Th();
    if(['th_k', 'th_t0', 'th_c', 'th_init'].includes(k)) return th.m ? '' : '모터 열 끔';
    if(k==='th_r') return !th.m ? '모터 열 끔' : th.mW ? '' : '모터 공랭';
    if(k==='m_ha0' || k==='m_ha60') return !th.m ? '모터 열 끔' : th.mW ? '모터 수랭' : '';
    if(k==='i_c') return th.i ? '' : '인버터 온도 끔';
    if(k==='i_r') return !th.i ? '인버터 온도 끔' : th.iW ? '' : '인버터 공랭';
    if(k==='i_ha0' || k==='i_ha60') return !th.i ? '인버터 온도 끔' : th.iW ? '인버터 수랭' : '';
    if(['b_c', 'b_t0', 'b_alpha'].includes(k)) return th.b ? '' : '축전지 온도 끔';
    if(k==='b_ha' || k==='b_ha60') return !th.b ? '축전지 온도 끔' : th.bW ? '축전지 수랭' : '';
    if(k==='b_r') return !th.b ? '축전지 온도 끔' : th.bW ? '' : '축전지 공랭';
    if(['cw_c', 'ua0', 'ua60'].includes(k)) return th.w ? '' : WB.I.cw_on === 1 ? '수랭 부품 없음' : '냉각수 온도 끔';
    if(k==='th_cool') return (th.m && th.mW) || (th.i && th.iW) || (th.b && th.bW) || th.w ? '' : '수랭 부품 없음';
    if(k==='t_amb') return th.w || (th.m && !th.mW) || (th.i && !th.iW) || (th.b && !th.bW) ? '' : '외기로 식는 것 없음';
    if(k==='inv_r') return WB.I.eff_mg === 1 ? '' : '효율 따로';
    if(k==='eta_inv' && WB.I.eff_mg === 1) return '모터 맵에 합침'; }
  return ''; }
/* 잠긴 칸에 보일 값 (작업창 wbEffVal): 숫자 = 계산에 실제로 쓰는 값, null = 쓰지 않음 (—). 잠기지 않은 칸은 부르지 않음 */
function t2InEff(k){ const I = WB.I;
  if(k==='th_k') return 0;                                                   // 모터 열 끔 → 디레이팅 없음
  if(k==='tmax'){ const P = t2MotorParse(T2.mtext || ''); const t = P.pts.map(q => q[1]).filter(Number.isFinite); return t.length ? Math.max(...t) : null; }   // 토크 곡선 최댓값 (기준 전압)
  if(k==='e_target') return t2ElOf()===1 ? t2Epack() : null;                 // 제원 용량 · 제한 없음
  if(k==='rl_b') return I.w_car > 0 ? I.w_car / 2 + Math.max(0, I.rl_m || 0) : null;   // 전폭으로 계산한 직선 여유 b
  if(k==='eta_inv' && I.eff_mg !== 1 && t2UseMap('eI')) return null;
  return null; }
/* 차 전폭을 바꾸면 그 자리에서 '최소 거리' · '여유' 칸 막힘을 다시 맞춤 (입력 칸 전체를 다시 그리면 글자 넣던 칸을 놓침) */
function t2RlLock(){ ['rl_b', 'rl_m', 'oh_f', 'oh_r'].forEach(k => { const i = document.querySelector(`#wb [data-wbi="${k}"]`); if(!i) return; const r = i.closest('.wb-ir'), lk = t2InLock(k);
  i.disabled = !!lk; r.classList.toggle('lock', !!lk); { const d = WB_TOOLS['2'].inputs.find(q => q.k===k), ev = lk ? wbEffVal(WB_TOOLS['2'], d) : {v:isFinite(WB.I[k]) ? WB.I[k] : '', ph:'', cls:'', t:''}; i.value = ev.v; i.placeholder = ev.ph; i.className = ev.cls; i.title = ev.t; }
  let s = r.querySelector('.wb-lk'); if(lk && !s){ s = document.createElement('span'); s.className = 'wb-lk'; i.parentNode.insertBefore(s, i.nextSibling.nextSibling); }
  if(s){ if(lk) s.textContent = lk; else s.remove(); } }); }
document.addEventListener('input', e => { if(WB.id==='2' && e.target.matches && e.target.matches('[data-wbi="w_car"]')) setTimeout(t2RlLock, 0); });
/* 셀 구성 · 용량 · 전압을 바꾸면 [제원 용량 X kWh] 글자를 그 자리에서 맞춤 */
document.addEventListener('input', e => { if(WB.id!=='2' || !e.target.matches || !e.target.matches('[data-wbi="n_s"],[data-wbi="n_p"],[data-wbi="c_ah"],[data-wbi="c_vnom"]')) return;
  setTimeout(() => { const b = document.querySelector('#wb [data-t2el="1"]'); if(b) b.textContent = `제원 용량 ${wbFmt(t2Epack(), 2)} kWh`; wbEffRefresh(); }, 0); });

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
      t2R('기준 감속비', `<b>${t2F(o.gr_use, 2)}</b>`, `<span class="muted">${opt ? '최적 감속비' : '편집 탭 [구동계]'}</span>`)
    + t2R('가속', `<b>${t2T(o.t_acc_s, 3)}</b>`, t2Dt(o.d_acc)) + t2R('스키드패드 (좌우 합)', `<b>${t2T(o.t_skid_s, 3)}</b>`, `<span class="muted">우 ${t2F(o.t_skid_r, 3)} · 좌 ${t2F(o.t_skid_l, 3)}</span>`)
    + t2R('오토크로스', `<b>${t2T(o.t_ax_s, 2)}</b>`, t2Dt(o.d_ax)) + t2R('내구 첫 랩 (정지 출발)', `<b>${t2T(o.t_end1, 2)}</b>`, '')
    + t2R('내구 평균 랩 (정지 출발 랩 제외)', `<b>${t2T(o.t_endavg, 2)}</b>`, '') + t2R('내구 총합', `<b>${t2T(o.t_end_s, 1)}</b>`, t2Dt(o.d_end)));
  // 스키드패드 목표 (좌우 합) 를 여기서 고침 → 필요 C_L·A · 지금 C_L·A · 조절 ±
  const gs = o.g_skid > 0, dcl = o.cla_req - WB.I.cla;
  const claWhy = gs && !isFinite(o.cla_req) ? (o.g_skid < o.t_skid_s ? '목표가 너무 빠름 (한 바퀴 기록이 아닌 좌우 합인지 확인)' : '목표가 너무 느림') : '';
  const cla = !gs ? '<b>—</b>' : isFinite(o.cla_req) ? `<b>${t2F(o.cla_req, 2)}</b> <i>m²</i>` : '<b>±15 밖</b>';
  const claM = !gs ? '<span class="muted">위 목표를 넣으면 계산</span>' : claWhy ? `<span class="t2-dt bad">${claWhy}</span>`
    : `<span class="muted">지금 ${t2F(WB.I.cla, 2)} · 조절</span> <span class="t2-dp ${dcl > 0 ? 'up' : 'dn'}">${dcl > 0 ? '+' : '−'}${t2F(Math.abs(dcl), 2)}</span>`;
  const lim = t2Box('차량 한계', `감속비 ${t2F(o.gr_use, 2)}`,
      t2R('최고 차속 (회전수 한계)', `<b>${t2F(o.vmax, 1)}</b> <i>km/h</i>`, '')
    + t2R('오토크로스 · 내구 최고 차속', `<b>${t2F(o.v_top, 1)}</b> <i>/</i> <b>${t2F(o.v_endtop, 1)}</b> <i>km/h</i>`, '')
    + t2R('가속 출발 종가속도', `<b>${t2F(o.ax_0, 2)}</b> <i>g</i>`, '') + t2R('가속 최대 종가속도', `<b>${t2F(o.ax_max, 2)}</b> <i>g</i>`, '')
    + t2R('스키드패드 횡가속도', `<b>${t2F(o.ay_skid, 2)}</b> <i>g</i>`, '<span class="muted">기록 바퀴 평균</span>')
    + t2R('스키드패드 목표 (좌우 합)', `<input type="number" step="any" min="0" class="t2-ski" data-t2skid value="${gs ? o.g_skid : ''}" placeholder="0" aria-label="스키드패드 목표 좌우 합 s"> <i>s</i>`,
          `<span class="muted">${gs ? `한 바퀴 평균 ${t2F(o.g_skid/2, 3)} s` : '0 = 정하지 않음'}</span>`)
    + t2R('목표에 필요한 C_L·A', cla, claM));
  /* 2행 */
  const cn = T2CN[c] + (o.c_n > 1 ? ` · ${T2.lap[c]==='all' ? `전체 ${o.c_n}랩` : `${o.c_lap}번째 랩`}` : '');
  const grLab = !opt ? '감속비 (입력)' : c==='skid' ? '감속비 (상관없어 최적 감속비)' : '감속비 (이 코스에서 가장 빠른 값)';
  const crec = c==='skid' ? t2R('기록 (좌우 한 바퀴 합)', `<b>${t2T(o.c_t, 3)}</b>`, '') + t2R('8자 전체 주행 (진입 ~ 탈출)', `<b>${t2T(o.c_ttot, 2)}</b>`, '')
    : o.c_n > 1 ? (T2.lap[c]==='all' ? '' : t2R(`${o.c_lap}번째 랩`, `<b>${t2T(o.c_t, 2)}</b>`, '')) + t2R('첫 랩 (정지 출발)', `<b>${t2T(o.c_t1, 2)}</b>`, '') + t2R('평균 랩 (정지 출발 랩 제외)', `<b>${t2T(o.c_tavg, 2)}</b>`, '') + t2R('총합', `<b>${t2T(o.c_ttot, 1)}</b>`, '')
    : t2R('기록', `<b>${t2T(o.c_t, c==='acc' ? 3 : 2)}</b>`, '');
  const r1 = t2R(grLab, `<b>${t2F(o.c_gr, 2)}</b>`, '') + crec + t2R('최고 차속', `<b>${t2F(o.c_vtop, 1)}</b> <i>km/h</i>`, '')
    + (isFinite(o.c_rmn) ? t2R('가장 작은 반경', `<b>${t2F(o.c_rmn, 2)}</b> <i>m</i>`, WB.I.rm_on !== 0 && WB.I.rmin > 0 ? (o.c_rbad > 0 ? `<span class="t2-dt bad">${t2F(WB.I.rmin, 1)} m 보다 급한 곳 ${t2F(o.c_rbad, 1)} m</span>` : `<span class="muted">최소 회전 반경 ${t2F(WB.I.rmin, 1)} m 지킴</span>`) : '<span class="muted">최소 회전 반경 고려 안 함</span>') : '')
    + (o.c_ctight > 0 ? t2R('여유를 못 지킨 콘', `<b>${o.c_ctight}</b> <i>개</i>`, `<span class="t2-dt bad">콘 ↔ 경계 틈 &lt; 2 × ${t2F(o.c_rlb, 2)} m</span>`) : '')
    + (isFinite(o.c_bo) ? t2R('가장 급한 곳 차 여유', `<b>${t2F(o.c_bo, 2)}</b> <i>/</i> <b>${t2F(o.c_bi, 2)}</b> <i>m</i>`, '<span class="muted">바깥 / 안쪽 (전장 · 차체 각도 포함)</span>') : '')
    + (isFinite(o.c_len) ? t2R('한 랩 거리', `<b>${t2F(o.c_len, 1)}</b> <i>m</i>`, `<span class="muted">${!o.c_rl ? '중심 라인' : `${o.c_rl === 2 ? `레코드 라인 −${t2F(o.c_rlg, 2)} s` : '최소 곡률 라인'} · 여유 ${t2F(o.c_rlb, 2)} m${WB.I.w_car > 0 ? ` (${t2F(WB.I.w_car, 2)} ÷ 2 + ${t2F(Math.max(0, WB.I.rl_m || 0), 2)})` : ''}`}</span>`) : '')
    + (isFinite(o.c_ltot) && o.c_n > 1 ? t2R('총 거리', o.c_ltot >= 1000 ? `<b>${t2F(o.c_ltot/1000, 2)}</b> <i>km</i>` : `<b>${t2F(o.c_ltot, 0)}</b> <i>m</i>`, `<span class="muted">한 랩 × ${o.c_n}랩</span>`) : '');
  const r2 = t2R('최고 모터 회전수', `<b>${t2F(o.c_rpm, 0)}</b> <i>rpm</i>`, '') + t2R('최대 모터 토크', `<b>${t2F(o.c_tq, 1)}</b> <i>N·m</i>`, '') + t2R('최대 단자 출력', `<b>${t2F(o.c_pbat, 1)}</b> <i>kW</i>`, '')
    + t2R('가장 낮은 단자 전압', `<b>${t2F(o.c_vmin, 1)}</b> <i>V</i>`, '') + t2R('모터 최고 온도', `<b>${t2F(o.c_tmax, 1)}</b> <i>°C</i>`, `<span class="muted">${isFinite(o.c_tmax) ? `끝 ${t2F(o.c_tm, 1)} °C` : '모터 열 켜면 계산'}</span>`)
    + t2R('냉각수 최고 온도', `<b>${t2F(o.c_twmax, 1)}</b> <i>°C</i>`, `<span class="muted">${isFinite(o.c_twmax) ? `끝 ${t2F(o.c_tw, 1)} °C` : '냉각수 온도 켜면 계산 (수랭 부품 필요)'}</span>`)
    + t2R('인버터 최고 온도', `<b>${t2F(o.c_timax, 1)}</b> <i>°C</i>`, `<span class="muted">${isFinite(o.c_timax) ? `끝 ${t2F(o.c_ti, 1)} °C` : '인버터 온도 켜면 계산'}</span>`)
    + t2R('축전지 최고 온도', `<b>${t2F(o.c_tbmax, 1)}</b> <i>°C</i>`, `<span class="muted">${isFinite(o.c_tbmax) ? `끝 ${t2F(o.c_tb, 1)} °C` : '축전지 온도 켜면 계산'}</span>`)
    + t2R('최대 전류 때 단자 전압 (SOC 100 %)', `<b>${t2F(o.v_load, 1)}</b> <i>V</i>`, '') + t2R('단자 출력 상한 (규정 · 전류 한계)', `<b>${t2F(o.p_max, 2)}</b> <i>kW</i>`, '') + t2R('모터 기저 회전수 (공칭 전압)', `<b>${t2F(o.n_base, 0)}</b> <i>rpm</i>`, '');
  const one = o.c_n > 1 && T2.lap[c]!=='all' ? `${o.c_lap}번째 랩 ` : '';
  // 에너지 칸: 모든 코스 같은 줄 (해당 없으면 —)
  const kw = (a, b) => `<b>${t2F(a, 3)}</b> <i>/</i> <b>${t2F(b, 3)}</b> <i>kWh</i>`, NA = '<b>—</b>', en = c==='end';
  const r3 = t2R(`${one || '볼 랩 '}단자 / 소비`, kw(o.c_et, o.c_ec), '<span class="muted">소비 = 저항 손실 포함</span>')
    + t2R(one ? `${o.c_lap}번째 랩 끝 SOC` : '끝 SOC', `<b>${t2F(o.c_soc, 1)}</b> <i>%</i>`, '')
    + t2R('전체 (단자 / 소비)', kw(o.c_all_t, o.c_all_c), `<span class="muted">${o.c_n > 1 ? `${o.c_n}랩` : '한 번'}</span>`)
    + t2R('출력 상한 없이 (단자 / 소비)', kw(o.c_nl_t, o.c_nl_c), `<span class="muted">${en ? '용량 가늠용' : '상한 없음 (내구만 걸림)'}</span>`)
    + t2R('쓸 수 있는 에너지', !en ? NA : isFinite(o.c_cap) ? `<b>${t2F(o.c_cap, 2)}</b> <i>kWh</i>` : '<b>제한 안 함</b>', en ? `<span class="muted">${isFinite(o.c_cap) ? (t2ElOf()===2 ? '임의 상한' : '제원 용량') : '편집 탭 [축전지]'}</span>` : '<span class="muted">내구만</span>')
    + t2R('출력 상한 비율', !en ? NA : o.c_plim >= 99.95 ? '<b>제한 없음</b>' : `<b>${t2F(o.c_plim, 1)}</b> <i>%</i>`, en ? (o.c_plim < 99.95 ? '<span class="t2-dt bad">에너지에 맞추려고 낮춤</span>' : '') : '<span class="muted">내구만</span>')
    + t2R('보정 에너지 소비량 (CO₂)', en ? `<b>${t2F(o.c_co2, 2)}</b> <i>kg/100 km</i>` : NA, !en ? '<span class="muted">내구만</span>' : o.c_co2 > 60.06 ? '<span class="t2-dt bad">실격 기준 60.06 초과</span>' : '<span class="muted">실격 기준 60.06 이하</span>');
  return `<div class="t2-out"><div class="t2-orow three">${gear}${rec}${lim}</div>
    <div class="t2-orow three">${t2Box('고른 코스', cn, r1)}${t2Box('축전지 · 모터', cn, r2)}${t2Box('에너지 (회생 제외)', cn, r3)}</div>${t2DynHTML(R, cn)}</div>`; }
/* 차량 모델 2 · 3 결과: 정상 선회 (고른 코스) · 계단 조향 과도 응답 (그래프) */
function t2DynHTML(R, cn){ const o = R.out, md = WB.I.md || 0; if(md < 2) return '';
  const r4 = t2R('최대 슬립각 (앞 / 뒤)', `<b>${t2F(o.c_afmax, 2)}</b> <i>/</i> <b>${t2F(o.c_armax, 2)}</b> <i>°</i>`, '')
    + t2R('최대 차체 각도 β', `<b>${t2F(o.c_bmax, 2)}</b> <i>°</i>`, '<span class="muted">신호 그래프에 β</span>')
    + t2R('최대 바퀴 조향각 · 핸들 각', `<b>${t2F(o.c_dwmax, 2)}</b> <i>°</i> · <b>${t2F(o.c_swmax, 0)}</b> <i>°</i>`, `<span class="muted">조향비 ${t2F(WB.I.steer_ratio, 2)}</span>`)
    + t2R('최대 조향각을 넘는 거리', isFinite(o.c_dbad) ? `<b>${t2F(o.c_dbad, 1)}</b> <i>m</i>` : '<b>—</b>', isFinite(o.c_dbad) ? (o.c_dbad > 0 ? `<span class="t2-dt bad">최대 ${t2F(WB.I.delta_max, 1)}° 보다 더 꺾어야 함</span>` : `<span class="muted">최대 ${t2F(WB.I.delta_max, 1)}° 안</span>`) : '<span class="muted">최대 조향각 0 = 확인 안 함</span>')
    + t2R('타이어 포화 점', `<b>${t2F(o.c_satn, 0)}</b> <i>개</i>`, '<span class="muted">축마다 따로 보면 곡선 최대를 넘겨야 하는 점 (제동 · 가속 중 하중 이동, 기록은 차 전체 마찰원으로 셈)</span>')
    + t2R('선형 언더스티어 구배', `<b>${t2F(o.k_us_lin, 3)}</b> <i>°/g</i>`, `<span class="muted">${o.k_us_lin > 0 ? '+ = 언더' : '− = 오버'} (정지 하중 코너링 강성)</span>`);
  let r5 = '';
  if(md >= 3 && R.tr){ const T = R.tr;
    r5 = t2R('시험', `<b>${t2F(o.tr_v, 0)}</b> <i>km/h</i> · <b>${t2F(o.tr_sw, 1)}</b> <i>° 핸들</i>`, `<span class="muted">바퀴 ${t2F(o.tr_del, 2)}°, 0.1 s 동안</span>`)
      + t2R('정상 요레이트 (해석해 / 3 s)', `<b>${t2F(o.tr_rss, 2)}</b> <i>/</i> <b>${t2F(o.tr_r, 2)}</b> <i>°/s</i>`, `<span class="muted">이득 ${t2F(o.tr_gain, 2)} 1/s</span>`)
      + t2R('요레이트 응답 시간 · 오버슈트', `<b>${t2F(o.tr_t90, 3)}</b> <i>s</i> · <b>${t2F(Math.max(0, o.tr_os), 1)}</b> <i>%</i>`, '<span class="muted">조향 50 % → 요레이트 90 %</span>')
      + t2R('고유진동수 · 감쇠비 (2 자유도)', `<b>${t2F(o.tr_wn, 2)}</b> <i>Hz</i> · <b>${t2F(o.tr_zeta, 3)}</b>`, '')
      + t2R('롤각 (정상 해석해 / 3 s)', `<b>${t2F(o.tr_phis, 3)}</b> <i>/</i> <b>${t2F(o.tr_phi, 3)}</b> <i>°</i>`, `<span class="muted">β ${t2F(o.tr_beta, 2)}°</span>`)
      + `<div class="t2-trp">${wbPlot({id:'t2tr', w:520, h:220, x:{d:T.t, n:'시간', u:'s'}, ys:[{k:'r', d:T.r, c:WB_COL[0], n:'요레이트', u:'°/s', dd:2}, {k:'ay', d:T.ay, c:WB_COL[2], n:'횡가속도', u:'g', dd:3}, {k:'phi', d:T.phi, c:WB_COL[3], n:'롤각', u:'°', dd:3}, {k:'sw', d:T.sw, c:WB_COL[7], n:'핸들 각', u:'°', dd:1}], hit:false, label:'계단 조향 응답'})}</div>`; }
  return `<div class="t2-orow${r5 ? ' two' : ''}">${t2Box('차량 거동 · 모델 2 (정상 선회)', cn, r4)}${r5 ? t2Box('과도 응답 · 모델 3 (계단 조향)', 'ISO 7401 꼴 · 3 자유도 + 타이어 이완', r5) : ''}</div>`; }

/* 입력 옆 '모양 보기': 하중 감도 → 바퀴 하중에 따른 μ 와 낼 수 있는 횡력 */
function t2VizMus(I){ const Z = Array.from({length:61}, (_, i) => i*50), mu = Z.map(z => Math.max(0, I.mu - I.mu_s*(z - (I.tire_fz0 > 0 ? I.tire_fz0 : 0))/1000)), Fy = Z.map((z, i) => mu[i]*z);
  return {x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:'', dd:2}, {k:'fy', d:Fy, c:WB_COL[2], n:'낼 수 있는 횡력 μ·Fz', u:'N', dd:0}], act:'mu',
    note:`정지 때 바퀴 하나 평균 하중 약 ${wbFmt(I.m*9.81/4, 0)} N. μ·Fz 가 꺾여 내려가기 시작하면 하중을 더 실어도 그 바퀴 힘이 늘지 않습니다.`}; }

/* ============================================================ 이 탭 사용법 */
function t2TourTab(tab, et, course){ if(!T2.tourUndo && typeof tgUndo==='function'){ const t0 = T2.tab, e0 = T2.etab, c0 = T2.course; T2.tourUndo = true;
    tgUndo(() => { T2.tourUndo = false; T2.tab = t0; T2.etab = e0; if(T2.course!==c0) t2SetCourse(c0); else wbPaint(['ext', 'mid']); }); }
  if(course && T2.course!==course) t2SetCourse(course); if(T2.tab!==tab || (et && T2.etab!==et)){ T2.tab = tab; if(et) T2.etab = et; wbPaint(['ext', 'mid']); } }
const t2TT = (tab, et, course) => ({click:{sel:`#wb [data-t2tab="${tab}"]`, need:() => T2.tab!==tab || (et && T2.etab!==et) || (course && T2.course!==course), run:() => t2TourTab(tab, et, course)}, inner:'#wb .wb-right'});
const M2TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 해석해 비교표), 입력 내보내기 · 가져오기(맵 편집 표 포함), 대시보드에 반영(제안 감속비 · 최고 차속 · 횡가속도 · 랩 에너지)입니다.', t2TT('sim')],
  ['#wb .wb-in', '입력', '입력 칸은 위 [편집] 탭에 항목별로 있습니다(자주 바꿔 보는 값만 나중에 이곳으로 꺼낼 예정). 여기에는 [대시보드 값으로 채우기]와 칸 앞 점의 뜻이 있습니다: 색 점 = 대시보드 값(확정 · 검토 중 · 가정 · 계산값 · 예시값), 고리 = 직접 고친 값, 회색 네모 = 도구 기본값.', t2TT('sim')],
  ['#wb [data-t2tab="edit"]', '편집 탭', '모든 입력을 항목별로 넣는 탭입니다: 모델 단계 · 코스 · 차량 제원 · 서스 · 조향 · 타이어 · 에어로 · 모터 · 인버터 · 구동계 · 축전지. 항목마다 위에 상수 칸(비슷한 값끼리 상자), 아래에 표 · 그림이 있습니다. 여기서 고치는 동안은 계산하지 않고, [시뮬레이션] 탭으로 가면 한 번 계산합니다. 코스 단추는 시뮬레이션 코스와 따로입니다.', t2TT('edit', 'course')],
  ['#wb .t2-coolq', '냉각', '이 도구는 수랭 부품의 냉각수를 한 덩어리로 보고 열용량 · 라디에이터 UA(정지 · 60 km/h) 등가값만 씁니다. 회로 배치 · 라디에이터 · 펌프 선정은 도구 9 냉각 계통 계산기에서 하고, 그곳의 [도구 2 에 넣기]로 이 칸을 채웁니다. 시뮬레이션 탭에서 계산한 뒤 [평균 발열 · 차속을 도구 9 로 보내기]를 누르면 이 결과의 평균 손실이 도구 9 입력으로 갑니다.', t2TT('edit', 'cool')],
  ['#wb .t2-model', '모델 단계', '차량 모델(0 기본 · 1 롤센터 · 롤)과 열 모델(모터 열 · 인버터 온도 · 축전지 온도 · 냉각수 온도를 각각 켜고 끔, 부품마다 공랭 · 수랭, 냉각수 온도는 수랭 부품이 있어야 계산)을 눌러 조합합니다. 단추마다 계산하는 것과 쓰는 입력(어느 항목에 있는지)이 적혀 있고, 그 단계에서 안 쓰는 입력 칸은 막힙니다. 계산에 쓴 조합은 시뮬레이션 탭 위에 보입니다. 대시보드 반영은 늘 차량 0 · 열 모터 열만.', t2TT('edit', 'model')],
  ['#wb .t2-cg', '상수인가, 표인가', '표가 비어 있으면 위 상수 칸(모터 최대 토크 · 모터 효율 · 인버터 효율 · μ · 하중 감도)을 쓰고, 그림 위에 "상수 칸을 씁니다"가 뜹니다. 표 제목 옆 [계산에 쓸 값]에서 [아래 표 · 위 상수]를 고릅니다. 표를 쓰면 그 상수 칸은 막힙니다("아래 표 사용"). 숫자 하나만 넣어도 상수 표가 됩니다.', t2TT('edit', 'eM')],
  ['#wb .t2-tw', '표 고치기', '칸을 눌러 고치고 Enter(반영) · Esc(취소). 표 맨 아래 [+ 행] 행, 효율 맵은 오른쪽 [+ 열] 열로 늘리고, 행 끝 × 로 행을, 맵 맨 아래 × 로 열을 지웁니다. 빈 표에서 누르면 머리 행부터 만듭니다. 토크 표는 1열 회전수 · 2열 최대 토크 · 3열 연속 토크(디레이팅 하한)입니다.', t2TT('edit', 'mt')],
  ['#wb .t2-menu', '입력하기', '붙여넣기(창에 붙여 넣으면 표를 덮어씀 · 내 코스는 창 대신 표에 Ctrl+V) · 파일 가져오기(.xlsx 첫 시트 · .csv) · 양식 받기(쓰는 법이 양식 맨 위 # 행에 있음) · 예시로 · 비우기.', t2TT('edit', 'mt')],
  ['#wb .t2-fbox', '그림으로 틀린 칸 찾기', '오른쪽 그림은 표로 그린 것입니다. 효율 맵에서 혼자 색이 튀는 칸, 곡선이 꺾인 곳, 코스가 엉뚱하게 꺾인 곳을 누르면 표에서 그 칸(행)으로 가서 강조합니다.', t2TT('edit', 'eM')],
  ['#wb .t2-tr', '코스', '공식 코스(오토크로스 · 내구 · 가속 · 스키드패드)는 회색 표로 보기만 합니다. 내 코스는 칸 고치기 · # 번호로 옮기기 · 각도 → 길이, 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스입니다. 비워 두면 계산하지 않습니다. 초록 = 출발(주행 방향 오른쪽), 빨강 = 결승(왼쪽), 화살표 = 방향. 내 코스는 구간마다 왼쪽 · 오른쪽 폭(빈칸 = 윗 행 값, 경계 콘은 지도에 자동)과 슬라럼 콘 간격(그 구간 가운데 선 위 콘, 직선 · 곡선 모두)을 넣을 수 있고, 엑셀에서 여러 칸을 복사해 표에 Ctrl+V 하면 표 전체가 바뀝니다.', t2TT('edit', 'course', 'free')],
  ['#wb [data-t2tab="sim"]', '시뮬레이션 탭', '편집 탭의 입력으로 기록을 계산해 보는 탭입니다. 위에서 아래로: 기준 감속비 · 볼 랩 · 코스 → 결과 → 구동력 선도 · 코스 지도 → 신호 그래프.', t2TT('sim', null, 'end')],
  ['#wb .t2-gm', '기준 감속비', '내 감속비 = 편집 탭 [구동계]의 [최종 감속비], 최적 감속비 = 배점(가속 100 · 오토크로스 200 · 내구 350)을 가중해 고른 하나. 두 모드를 미리 계산해 두어 누르면 바로 바뀝니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-vw', '볼 랩 · 코스', '코스를 고르면 결과 2행 · 구동력 선도 · 코스 지도 · 신호 그래프가 그 코스로 바뀝니다. 내구는 24랩(드라이버당 12랩) 중 볼 랩을 고르고, [전체]는 26랩을 이어서 봅니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-orow', '결과 1행', '감속비(종목마다 가장 빠른 감속비와 그때 기록) · 종목 기록(기준 감속비) · 차량 한계. 같은 종목이 같은 높이라 옆으로 비교합니다. ± = 가장 빠른 기록 대비, 초록은 빠름 · 빨강은 느림.', t2TT('sim', null, 'end')],
  ['#wb .t2-orow + .t2-orow', '결과 2행', '고른 코스 · 볼 랩의 기록, 축전지 · 모터(회전수 · 토크 · 출력 · 전압 · 모터 온도), 에너지(단자 · 소비 · SOC, 내구는 에너지 제한 · CO₂). 내구는 24랩 전체 단자 · 소비 에너지와, 출력 상한 없이 달렸을 때의 에너지(축전지 용량 가늠용)도 보입니다. 최적 모드에서 감속비는 그 코스에서 가장 빠른 값입니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-ftw', '구동력 선도', '코스 프로브 지점의 전압 · 모터 온도 · 횡가속도로 다시 그린 선도입니다(보기만, 눌러도 프로브는 안 움직임). 세로선 = 그 점의 차속. 아래 글이 그 점의 구동력을 무엇이 정했는지(모터 곡선 · 출력 상한 · 뒤축 접지), 제동 한계, 앞축 여유를 알려 줍니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-mapw', '코스 지도', '한 번 눌러 휠 확대를 켠 뒤(박스 테두리 강조, 박스 밖을 누르거나 Esc = 끔) 휠로 확대, 끌어서 이동(박스 밖으로 나가도 됨), 누르면 그 위치로 프로브가 옮겨 갑니다. 색 = 차속(여러 랩이면 모든 랩 통틀어 같은 범위), 주황 콘 = 슬라럼. 색 선 = 계산한 주행선(기본 레코드 라인: 코스 폭 안에서 가장 덜 휘는 라인을 구한 뒤 랩타임이 줄어드는 쪽으로 조금씩 다듬은 라인. 슬라럼은 첫 콘을 왼쪽으로, 번갈아 비켜 감), 점선 = 코스 중심선. 주행선(레코드 라인 · 최소 곡률 라인 · 중심 라인)과 여유는 편집 탭 [코스], 차 전폭은 [차량 제원]에서 바꿉니다. 다듬기는 입력이 바뀔 때마다 다시 해서 계산이 몇 초 걸립니다.', t2TT('sim', null, 'end')],
  ['#wbsl', '신호 고르기', '그래프를 누르면 그 칸이 강조되고, 여기 체크가 그 칸에 그릴 신호를 고릅니다. 이름을 누르면 그 신호의 눈금이 앞으로. 축 · 눈금 · 제목 · 값 글자는 선 색과 같습니다.', t2TT('sim')],
  ['#wbsig', '그래프 칸', '칸마다 상자 하나. 위 오른쪽 단추줄: [프로브] 누르거나 끌면 프로브(←/→ 한 칸씩) · [이동] 끌어서 보기 범위 옮김 · [영역 확대] 끌어서 사각형 확대 · 더블클릭 = 처음 범위. 가로 범위는 모든 칸이 같이 움직이고 세로는 칸마다. 칸을 한 번 누르면 휠 = 가로 확대, Shift + 휠 = 세로 확대. 상자 아래 [+ 그래프 칸]으로 최대 3칸, × 로 지우고, 칸 아래 경계를 끌어 높이를 바꿉니다.', t2TT('sim')],
  ['#wbsl [data-wbxa]', '입력 훑기', '가로축을 [입력 훑기 → 최종 감속비] 등으로 바꾸면 그 입력을 바꿔 가며 다시 계산한 종목 기록 변화를 봅니다 (나머지 입력은 지금 값).', t2TT('sim')]
];

/* ============================================================ 도구 정의 */
/* 입력 묶음 (편집 탭 항목마다 그림: T2EG). ui:'edit' = 편집 탭에만, ui:'none' = 다른 곳(단추 · 결과 카드)에서 고침 → 왼쪽 입력 칸은 비움 */
const T2G = {thm:'외기', cool:'냉각수 · 라디에이터 (열 모델 냉각수 온도)', bth:'축전지 열 (열 모델 축전지 온도)', inv:'인버터 열 (열 모델 인버터 온도)', car:'차량 제원', rc:'롤센터 · 롤 (차량 모델 1)', steer:'조향', tire:'타이어 · 하중 이동', aero:'에어로', mot:'모터 · 인버터', th:'모터 열 · 디레이팅', dt:'구동계', bat:'축전지', rl:'주행선 여유 · 경계', goal:'스키드패드 목표 (0 = 정하지 않음)'};
const T2EG = {course:[T2G.rl], car:[T2G.car], sus:[T2G.steer, T2G.rc], tire:[T2G.tire], aero:[T2G.aero], mot:[T2G.mot, T2G.th, T2G.inv], cool:[T2G.thm, T2G.cool], dt:[T2G.dt], bat:[T2G.bat, T2G.bth], model:[]};
WB_TOOLS['2'] = {
  no:'2', stage:'P0', name:'랩타임 시뮬레이터',
  x:{n:'거리', u:'m'},
  sweepFirst:'gr',
  inputs:[
    // sb = 편집 탭에서 한 상자로 묶는 이름 (비슷한 값끼리 한 열), n = 이 도구에서 보이는 이름 (대시보드 키 이름과 다르게 맞춘 것)
    {k:'m', dk:'m', v:300, d:0, g:T2G.car, sb:'질량 · 무게중심'}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T2G.car, sb:'질량 · 무게중심'}, {k:'h', dk:'h', v:290, d:0, g:T2G.car, sb:'질량 · 무게중심'},
    {k:'L', dk:'L', v:1550, d:0, g:T2G.car, sb:'치수'}, {k:'tf', dk:'tf', v:1200, d:0, g:T2G.car, sb:'치수'}, {k:'tr', dk:'tr', v:1180, d:0, g:T2G.car, sb:'치수'},
    {k:'w_car', n:'차 전폭 (타이어 · 윙 포함, 0 = 입력 안 함)', u:'m', v:1.4, d:2, g:T2G.car, sb:'치수'},
    {k:'oh_f', n:'앞 오버행 (앞축 ~ 차 앞 끝)', u:'m', v:0.6, d:2, g:T2G.car, sb:'치수'}, {k:'oh_r', n:'뒤 오버행 (뒤축 ~ 차 뒤 끝)', u:'m', v:0.4, d:2, g:T2G.car, sb:'치수'},
    {k:'mu', dk:'mu', n:'타이어 μ (기준 하중)', v:1.5, d:2, g:T2G.tire, sb:'마찰 · 하중 이동'}, {k:'mu_s', dk:'mu_s', n:'μ 하중 감도', v:0, d:3, g:T2G.tire, sb:'마찰 · 하중 이동'},
    {k:'r_eff', dk:'r_eff', n:'바퀴 유효 반경 (동반경)', v:229, d:0, g:T2G.tire, sb:'바퀴'}, {k:'crr', dk:'crr', v:0.015, d:3, g:T2G.tire, sb:'바퀴'},
    {k:'cla', dk:'cla', n:'C<sub>L</sub>·A (다운포스)', v:3.0, d:2, g:T2G.aero, sb:'공력 계수'}, {k:'cda', dk:'cda', n:'C<sub>D</sub>·A (항력)', v:1.4, d:2, g:T2G.aero, sb:'공력 계수'},
    {k:'xcop', dk:'xcop', n:'압력중심 위치 (뒤축부터 앞으로)', v:698, d:0, g:T2G.aero, sb:'압력중심'}, {k:'hcop', dk:'hcop', n:'압력중심 높이 (항력 작용)', v:420, d:0, g:T2G.aero, sb:'압력중심'},
    {k:'pmax', dk:'pmax', n:'최고 출력 (규정 상한)', v:80, d:0, g:T2G.mot, sb:'모터 한계'}, {k:'tmax', dk:'tmax', v:230, d:0, g:T2G.mot, sb:'모터 한계'}, {k:'nmax', dk:'nmax', v:6500, d:0, g:T2G.mot, sb:'모터 한계'},
    {k:'v_ref', n:'토크 표 기준 전압 (표를 잰 전압)', u:'V', v:710, d:0, g:T2G.mot, sb:'토크 표 환산'},
    {k:'ke_ratio', n:'유도 전압 비 (팀 모터 ÷ 표 모터)', u:'', v:0.6523, d:4, g:T2G.mot, sb:'토크 표 환산'},
    {k:'eta_mot', n:'모터 효율 (상수)', u:'%', v:95, d:1, g:T2G.mot, sb:'효율 상수'}, {k:'eta_inv', n:'인버터 효율 (상수)', u:'%', v:97, d:1, g:T2G.mot, sb:'효율 상수'},
    {k:'eff_mg', n:'효율 (0 = 모터 · 인버터 따로, 1 = 모터 맵에 인버터 합침)', u:'', v:0, d:0, g:T2G.mot, ui:'none'}, {k:'inv_r', n:'합친 손실 중 인버터 몫', u:'%', v:30, d:0, g:T2G.mot, sb:'효율 상수'},
    {k:'th_k', n:'디레이팅 계수 (0 = 항상 최대 토크)', u:'N·m/°C', v:0, d:2, g:T2G.th, sb:'디레이팅'}, {k:'th_t0', n:'디레이팅 시작 온도', u:'°C', v:100, d:0, g:T2G.th, sb:'디레이팅'},
    {k:'th_c', n:'모터 열용량', u:'J/K', v:6000, d:0, g:T2G.th, sb:'모터 열'}, {k:'th_r', n:'모터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.02, d:4, g:T2G.th, sb:'모터 열'},
    {k:'m_ha0', n:'모터 공랭 hA (정지)', u:'W/K', v:10, d:1, g:T2G.th, sb:'모터 공랭'}, {k:'m_ha60', n:'모터 공랭 hA (60 km/h)', u:'W/K', v:40, d:1, g:T2G.th, sb:'모터 공랭'},
    {k:'th_cool', n:'냉각수 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값, 모든 수랭 회로)', u:'°C', v:40, d:0, g:T2G.th, sb:'모터 열'}, {k:'th_init', n:'모터 출발 온도', u:'°C', v:40, d:0, g:T2G.th, sb:'모터 열'},
    {k:'gr', dk:'gr', v:3.55, d:2, g:T2G.dt, sb:'구동계', sw:[2.5, 7]}, {k:'eta_dt', dk:'eta_dt', v:95, d:0, g:T2G.dt, sb:'구동계'}, {k:'j_eq', dk:'j_eq', n:'회전부 등가 관성 (바퀴 축 기준)', v:0.5, d:2, g:T2G.dt, sb:'구동계'},
    {k:'n_s', dk:'n_s', v:72, d:0, g:T2G.bat, sb:'셀 구성'}, {k:'n_p', dk:'n_p', v:6, d:0, g:T2G.bat, sb:'셀 구성'},
    {k:'c_vmax', dk:'c_vmax', n:'셀 최대 전압 (만충)', u:'V', v:4.2, d:2, g:T2G.bat, sb:'셀 전압'}, {k:'c_vnom', dk:'c_vnom', n:'셀 공칭 전압', u:'V', v:3.6, d:2, g:T2G.bat, sb:'셀 전압'},
    {k:'c_vmin', dk:'c_vmin', n:'셀 최소 전압 (방전 종지)', u:'V', v:2.5, d:2, g:T2G.bat, sb:'셀 전압'},
    {k:'c_ah', dk:'c_ah', n:'셀 용량', u:'Ah', v:4.5, d:2, g:T2G.bat, sb:'셀 용량 · 팩'}, {k:'r_pack', dk:'r_pack', v:180, d:0, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'i_bms_max', dk:'i_bms_max', n:'팩 방전 전류 한계 (BMS 설정 · 셀 허용 × 병렬 수 중 작은 값)', v:270, d:0, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'e_target', dk:'e_target', n:'내구 에너지 상한', v:0, d:2, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'e_lim', n:'내구 에너지 상한 (0 = 제한 없음, 1 = 제원 용량, 2 = 임의 상한)', u:'', v:1, d:0, g:T2G.bat, ui:'none'},
    {k:'rl_on', n:'주행선 (2 = 레코드 라인, 1 = 최소 곡률 라인, 0 = 중심 라인)', u:'', v:2, d:0, g:T2G.rl, ui:'none'},
    {k:'rmin', dk:'rmin', n:'최소 회전 반경 (CG 경로)', u:'m', v:3.0, d:1, g:T2G.steer, sb:'최소 회전 반경'},
    {k:'rm_on', n:'최소 회전 반경 고려 (1 = 고려, 0 = 고려 안 함)', u:'', v:1, d:0, g:T2G.steer, ui:'none'},
    {k:'rl_m', n:'여유 (차 옆면 ↔ 코스 경계 · 콘, 전폭이 있을 때)', u:'m', v:0.2, d:2, g:T2G.rl, sb:'여유'},
    {k:'rl_b', n:'경계 · 콘에서 차 중심까지 최소 거리 (전폭이 0 일 때)', u:'m', v:1.0, d:2, g:T2G.rl, sb:'여유'},
    {k:'md', n:'차량 모델 단계 (0 = 기본, 1 = 롤센터 · 롤, 2 = 비선형 타이어, 3 = 과도)', u:'', v:0, d:0, g:T2G.rc, ui:'none'},
    {k:'th_on', n:'열 모델 · 모터 열 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'}, {k:'cw_on', n:'열 모델 · 냉각수 온도 (1 = 켬, 수랭 부품이 있을 때)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'in_on', n:'열 모델 · 인버터 온도 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'m_cool', n:'모터 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:1, d:0, g:T2G.thm, ui:'none'}, {k:'i_cool', n:'인버터 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:1, d:0, g:T2G.thm, ui:'none'}, {k:'b_cool', n:'축전지 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'i_c', n:'인버터 열용량', u:'J/K', v:2000, d:0, g:T2G.inv, sb:'인버터 열'}, {k:'i_r', n:'인버터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T2G.inv, sb:'인버터 열'},
    {k:'i_ha0', n:'인버터 공랭 hA (정지)', u:'W/K', v:5, d:1, g:T2G.inv, sb:'인버터 공랭'}, {k:'i_ha60', n:'인버터 공랭 hA (60 km/h)', u:'W/K', v:20, d:1, g:T2G.inv, sb:'인버터 공랭'},
    {k:'bt_on', n:'열 모델 · 축전지 온도 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'t_amb', n:'외기 온도', u:'°C', v:25, d:0, g:T2G.thm},
    // 냉각수 등가 기본값 = 도구 9 기본 배치(라디 0.06 m² · UA 250 · 팬 0.08, 펌프 8 L/min, 인버터 → 모터)를 줄인 값
    {k:'cw_c', dk:'cool_c', n:'냉각수 열용량 (모든 수랭 부품이 같은 냉각수, 도구 9 등가값)', u:'J/K', v:5016, d:0, g:T2G.cool, sb:'냉각수 · 라디에이터 (등가)'},
    {k:'ua0', dk:'cool_ua0', n:'라디에이터 UA 등가 (정지)', u:'W/K', v:65, d:0, g:T2G.cool, sb:'냉각수 · 라디에이터 (등가)'}, {k:'ua60', dk:'cool_ua60', n:'라디에이터 UA 등가 (60 km/h)', u:'W/K', v:188, d:0, g:T2G.cool, sb:'냉각수 · 라디에이터 (등가)'},
    {k:'b_c', n:'축전지 열용량', u:'J/K', v:30000, d:0, g:T2G.bth, sb:'축전지 열'}, {k:'b_ha', n:'축전지 공랭 hA (정지)', u:'W/K', v:15, d:1, g:T2G.bth, sb:'축전지 공랭'}, {k:'b_ha60', n:'축전지 공랭 hA (60 km/h)', u:'W/K', v:15, d:1, g:T2G.bth, sb:'축전지 공랭'},
    {k:'b_r', n:'축전지 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T2G.bth, sb:'축전지 열'},
    {k:'b_t0', n:'축전지 출발 온도', u:'°C', v:25, d:0, g:T2G.bth, sb:'축전지 열'}, {k:'b_alpha', n:'내부저항 온도 계수 (25 °C 기준)', u:'1/°C', v:0.01, d:3, g:T2G.bth, sb:'축전지 열'},
    {k:'h_rcf', dk:'rc_f', n:'롤센터 앞 높이', u:'mm', v:30, d:0, g:T2G.rc, sb:'롤센터 · 롤'}, {k:'h_rcr', dk:'rc_r', n:'롤센터 뒤 높이', u:'mm', v:50, d:0, g:T2G.rc, sb:'롤센터 · 롤'},
    {k:'k_roll', dk:'k_roll', n:'롤강성 합 (앞 + 뒤, 롤각 신호용)', u:'N·m/°', v:500, d:0, g:T2G.rc, sb:'롤센터 · 롤'}, {k:'rsd', dk:'rsd', n:'롤강성 앞 몫 (RSD, 탄성 하중 이동 배분)', v:50, d:1, g:T2G.rc, sb:'롤센터 · 롤'},
    // 차량 모델 2 · 3 (도구 T · 6 · 7 · 1 에서 받음)
    {k:'tire_fz0', dk:'tire_fz0', n:'타이어 기준 하중 (0 = μ 는 하중 0 의 값, 코너링 강성은 정지 평균 하중 기준)', v:0, d:0, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_ca0', dk:'tire_ca0', v:450, d:0, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'}, {k:'tire_cn', dk:'tire_cn', v:0.8, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_c', dk:'tire_c', v:1.3, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'}, {k:'tire_e', dk:'tire_e', v:0, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_relax', dk:'tire_relax', v:0.3, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'steer_ratio', dk:'steer_ratio', v:5, d:2, g:T2G.steer, sb:'조향비 · 최대 조향각 (모델 2)'}, {k:'delta_max', dk:'delta_max', n:'최대 조향각 (안쪽 바퀴, 0 = 확인 안 함)', v:0, d:1, g:T2G.steer, sb:'조향비 · 최대 조향각 (모델 2)'},
    {k:'izz', dk:'izz', v:70, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'ixx', dk:'ixx', v:30, d:1, g:T2G.rc, sb:'과도 (모델 3)'},
    {k:'m_us_f', dk:'m_us_f', v:12, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'m_us_r', dk:'m_us_r', v:12, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'c_roll', dk:'c_roll', v:30, d:1, g:T2G.rc, sb:'과도 (모델 3)'},
    {k:'v_test', n:'계단 조향 시험 차속', u:'km/h', v:60, d:0, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'ay_test', n:'계단 조향 정상 횡가속도', u:'g', v:0.4, d:2, g:T2G.rc, sb:'과도 (모델 3)'},
    {k:'t_skid', dk:'t_skid', v:0, d:3, g:T2G.goal, ui:'none'}
  ],
  /* 결과 칸은 outHTML 이 그림. outputs = 대시보드 반영 · 입력 훑기 · 검증표 이름 */
  outHTML: t2OutHTML,
  outputs:[
    {k:'t_acc_s', n:'가속 기록', u:'s', d:3}, {k:'t_skid_s', n:'스키드패드 기록 (좌우 합)', u:'s', d:3}, {k:'t_ax_s', n:'오토크로스 기록', u:'s', d:2}, {k:'t_end_s', n:'내구 총 시간', u:'s', d:1},
    {k:'e_use', n:'내구 소비 에너지', u:'kWh', d:2}, {k:'e_nl_c', n:'내구 소비 에너지 (출력 상한 없이)', u:'kWh', d:2}, {k:'p_lim', n:'내구 출력 상한 비율', u:'%', d:1},
    {k:'vmax', dk:'vmax', d:1}, {k:'ay_skid', dk:'ay_max_sim', d:2},
    {k:'gr_opt', dk:'gr', n:'제안 감속비 (배점 가중)', d:2, hide:true}, {k:'e_lap', dk:'e_lap', d:3, hide:true},
    {k:'c_afmax', n:'최대 앞 슬립각', u:'°', d:2, hide:true}, {k:'c_armax', n:'최대 뒤 슬립각', u:'°', d:2, hide:true}, {k:'c_bmax', n:'최대 차체 각도 β', u:'°', d:2, hide:true},
    {k:'c_dwmax', n:'최대 바퀴 조향각', u:'°', d:2, hide:true}, {k:'c_swmax', n:'최대 핸들 각', u:'°', d:1, hide:true}, {k:'c_satn', n:'타이어 포화 점 수', u:'', d:0, hide:true}, {k:'c_dbad', n:'최대 조향각을 넘는 거리', u:'m', d:1, hide:true},
    {k:'k_us_lin', n:'선형 언더스티어 구배 (모델 2)', u:'°/g', d:3, hide:true},
    {k:'tr_v', n:'시험 차속', u:'km/h', d:0, hide:true}, {k:'tr_del', n:'바퀴 조향각 (계단)', u:'°', d:3, hide:true}, {k:'tr_sw', n:'핸들 각 (계단)', u:'°', d:2, hide:true},
    {k:'tr_rss', n:'정상 요레이트 (해석해)', u:'°/s', d:3, hide:true}, {k:'tr_r', n:'요레이트 (3 s, 수치)', u:'°/s', d:3, hide:true}, {k:'tr_gain', n:'요레이트 이득 r/δ', u:'1/s', d:3, hide:true},
    {k:'tr_ay', n:'횡가속도 (3 s)', u:'g', d:3, hide:true}, {k:'tr_os', n:'요레이트 오버슈트', u:'%', d:1, hide:true}, {k:'tr_t90', n:'요레이트 응답 시간 (조향 50 % → 요레이트 90 %)', u:'s', d:3, hide:true},
    {k:'tr_wn', n:'고유진동수 (2 자유도)', u:'Hz', d:3, hide:true}, {k:'tr_zeta', n:'감쇠비 (2 자유도)', u:'', d:3, hide:true}, {k:'tr_beta', n:'차체 각도 β (3 s)', u:'°', d:3, hide:true},
    {k:'tr_phi', n:'롤각 (3 s, 수치)', u:'°', d:3, hide:true}, {k:'tr_phis', n:'롤각 (정상, 해석해)', u:'°', d:3, hide:true}, {k:'tr_kus', n:'언더스티어 구배 (축 코너링 강성)', u:'°/g', d:3, hide:true}, {k:'q_cool', dk:'q_cool', d:2, hide:true}, {k:'q_mot', dk:'q_mot', d:0, hide:true}, {k:'q_inv', dk:'q_inv', d:0, hide:true}, {k:'q_bat', dk:'q_bat', d:0, hide:true}, {k:'v_end_avg', dk:'v_end_avg', d:1, hide:true},
    {k:'t_free1', n:'내 코스 1번째 랩', u:'s', d:2, hide:true}, {k:'t_free2', n:'내 코스 2번째 랩', u:'s', d:4, hide:true}, {k:'t_freeavg', n:'내 코스 평균 랩', u:'s', d:4, hide:true},
    {k:'n_free', n:'내 코스 랩 수', u:'랩', d:0, hide:true}, {k:'e_free', n:'내 코스 2번째 랩 단자 에너지', u:'kWh', d:5, hide:true},
    {k:'ax_0', n:'가속 출발 종가속도', u:'g', d:2, hide:true}, {k:'ax_max', n:'가속 최대 종가속도', u:'g', d:2, hide:true}, {k:'v_endtop', n:'내구 최고 차속', u:'km/h', d:1, hide:true}, {k:'skid_roll', n:'스키드패드 롤각 (모델 단계 1)', u:'°', d:3, hide:true}, {k:'c_tw', n:'냉각수 끝 온도', u:'°C', d:3, hide:true}, {k:'c_tb', n:'축전지 끝 온도', u:'°C', d:3, hide:true}, {k:'cla_req', n:'필요 C_L·A', u:'m²', d:2, hide:true},
    {k:'v_load', n:'최대 전류 때 단자 전압', u:'V', d:1, hide:true}, {k:'p_max', n:'단자 출력 상한', u:'kW', d:3, hide:true}, {k:'n_base', n:'모터 기저 회전수', u:'rpm', d:0, hide:true},
    {k:'n_lap', n:'내구 랩 수', u:'랩', d:0, hide:true}, {k:'n_st1', n:'첫 드라이버 랩 수', u:'랩', d:0, hide:true}, {k:'e_ok', n:'에너지 한도 안 (1 = 예)', u:'', d:0, hide:true}, {k:'c_tm', n:'고른 코스 끝 모터 온도', u:'°C', d:3, hide:true}
  ],
  sigs:[
    {k:'af', n:'앞 슬립각 (모델 2, 왼쪽 선회 +)', u:'°', d:2}, {k:'ar', n:'뒤 슬립각 (모델 2)', u:'°', d:2}, {k:'beta', n:'차체 각도 β (모델 2)', u:'°', d:2}, {k:'dw', n:'바퀴 조향각 (모델 2, 두 바퀴 평균)', u:'°', d:2}, {k:'sw', n:'핸들 각 (모델 2)', u:'°', d:1},
    {k:'v', n:'차속', u:'km/h', d:1}, {k:'pw', n:'바퀴 출력 (구동 +, 제동 −)', u:'kW', d:1}, {k:'vlim', n:'코너 한계 속도', u:'km/h', d:1}, {k:'ax', n:'종가속도', u:'g', d:2}, {k:'ay', n:'횡가속도 (왼쪽 선회 +)', u:'g', d:2},
    {k:'fz_fl', n:'앞왼 바퀴 하중', u:'N', d:0}, {k:'fz_fr', n:'앞오 바퀴 하중', u:'N', d:0}, {k:'fz_rl', n:'뒤왼 바퀴 하중', u:'N', d:0}, {k:'fz_rr', n:'뒤오 바퀴 하중', u:'N', d:0}, {k:'roll', n:'롤각 (모델 단계 1, 왼쪽 선회 +)', u:'°', d:2}, {k:'tcool', n:'냉각수 온도 (열 모델 냉각수 온도)', u:'°C', d:1}, {k:'tbat', n:'축전지 온도 (열 모델 축전지 온도)', u:'°C', d:1}, {k:'tinv', n:'인버터 온도 (열 모델 인버터 온도)', u:'°C', d:1},
    {k:'rpm', n:'모터 회전수', u:'rpm', d:0}, {k:'tq', n:'모터 토크', u:'N·m', d:1}, {k:'pbat', n:'축전지 단자 출력 (회생 제외)', u:'kW', d:1}, {k:'vbat', n:'축전지 단자 전압', u:'V', d:1},
    {k:'eta', n:'모터 × 인버터 효율', u:'%', d:1}, {k:'tmot', n:'모터 온도', u:'°C', d:1}, {k:'tlim', n:'모터 토크 한계 (디레이팅 포함)', u:'N·m', d:1}, {k:'grip', n:'그립 사용률 (차 전체)', u:'%', d:0}, {k:'t', n:'경과 시간', u:'s', d:2}, {k:'ecum', n:'누적 단자 에너지', u:'Wh', d:0}
  ],
  sigOn:['v', 'pw'],
  extHTML: t2ExtHTML, midHTML: t2MidHTML, extraI: t2ExtraI, inLock: t2InLock, inEff: t2InEff, inOpt: t2InOpt, inExt: true, inPanel: false, deferCalc: () => T2.tab==='edit',   /* 편집 탭에서는 계산하지 않음 → 시뮬레이션 탭으로 갈 때 */
  inEmpty: '<p class="muted wb-inempty">입력은 위 [편집] 탭에 항목별로 있습니다. 자주 바꿔 보는 값은 나중에 이곳으로 꺼낼 예정입니다.</p>',
  extGet: () => ({course:T2.course, lap:{...T2.lap}, free:{...T2.free}, mtext:T2.mtext, eM:T2.eM, eI:T2.eI, tire:T2.tire, grMode:T2.grMode}),
  extSet(d){ if(!d || typeof d!=='object') return; t2Load(d); t2Save(); wbPaint(['ext', 'mid', 'in']); },
  /* 결과가 오면: 고른 모드를 꺼내 씀 (두 모드 모두 들어 있음) → 위 줄 · 지도 · 구동력 선도 */
  onResult(R){ if(R && R.modes) Object.assign(R, R.modes[T2.grMode]);
    if(T2.tab==='sim'){ const hr = $('#wbext .t2-hr'); if(hr) wbPaint(['ext']); t2MapRepaint(); t2PfSoon(); }
    else if(T2.etab==='mt'){ const c = $('#t2mc'); if(c) c.innerHTML = t2EditPlot('mt'); const f = $('#wbext .t2-fcap'); if(f) f.innerHTML = t2EditCap('mt'); } },
  onCursor(){ t2MapRepaint(); t2PfSoon(); },
  tour: M2TOUR,
  verifyBase:{end:{seg:[], laps:26, stint:13}, free:{seg:[], laps:1, s0:0}, motor:[], motorC:[], effM:null, effI:null, tireMap:null, r_pack:0, i_bms_max:1e9, pmax:1e6, eta_mot:100, eta_inv:100,
              th_k:0, th_t0:100, th_c:6000, th_r:0.02, th_cool:40, th_init:40, rl_on:0, rl_b:1, w_car:0, oh_f:0, oh_r:0, rl_m:0.2, e_lim:1, rmin:0, md:0, th_on:1, cw_on:0, bt_on:0, in_on:0, m_cool:1, i_cool:1, b_cool:0, eff_mg:0, m_ha60:null, i_ha60:null, b_ha60:null, h_rcf:0, h_rcr:0, k_roll:500, course:'acc', lap:'2', grMode:'my'},
  verify:[
    {n:'가속 · 접지 한계만 (μ = 1, CG 뒤축 위)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5}, expect:{t_acc_s:3.910309, ax_0:1}, src:'a = μg → t = √(2 × 75 ÷ 9.81)'},
    {n:'가속 · 회전부 관성 J ÷ r²', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100}, expect:{t_acc_s:5.477226}, src:'F = 100 × 4 ÷ 0.25 = 1600 N, 등가 질량 300 + 1.25 ÷ 0.25² = 320 kg → a = 5'},
    {n:'가속 · 구름 저항 무게 항', I:{m:300, fr:50, h:0, mu:10, crr:0.02, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100}, expect:{t_acc_s:5.580840}, src:'a = (1600 − 0.02 × 300 × 9.81) ÷ 320 = 4.8161'},
    {n:'회전수 한계 최고속', I:{nmax:6500, gr:3.55, r_eff:229}, expect:{vmax:158.0708}, src:'6500 ÷ 3.55 × 2π ÷ 60 × 0.229 × 3.6'},
    {n:'스키드패드 · 에어로 없음', I:{mu:1.5, crr:0, cla:0, cda:0}, expect:{t_skid_s:9.895692, ay_skid:1.5}, src:'v = √(μgR), R = 9.125 → 오른쪽 · 왼쪽 한 바퀴씩 합 = 2 × 2πR ÷ v'},
    {n:'스키드패드 · 다운포스 (앞뒤 몫 = 무게 배분)', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:3, cda:0}, expect:{t_skid_s:9.471806}, src:'mv²/R = μ(mg + ½ρC_LA v²) → v² = μmg ÷ (m/R − μ½ρC_LA), 좌우 한 바퀴씩 합'},
    {n:'스키드패드 목표 기록 → 필요 C_L·A', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:0, cda:0, t_skid:9.471806}, expect:{cla_req:3}, src:'위 경우를 거꾸로: 9.4718 s 에 필요한 C_L·A = 3'},
    {n:'스키드패드 목표가 느리면 필요 C_L·A 는 − (줄여도 됨)', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:0, cda:0, t_skid:10.302152}, expect:{cla_req:-3}, src:'C_L·A = −3 (양력)이면 v² = μmg·½ ÷ (m/R·½ − μ·½ρ(−3)·½) → 좌우 합 10.3022 s'},
    {n:'하중 감도 0 → 좌우 하중 이동 배분(모델 0 = 무게 배분)과 상관없음', I:{mu:1.5, mu_s:0, fr:30, crr:0, cla:0, cda:0}, expect:{t_skid_s:9.895692}, src:'μ 일정이면 축 힘 = μ × 축 하중 (좌우로 옮겨도 합은 같음), 횡력 합 = μ m g'},
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
    {n:'내구 · 에너지 제한이 걸리면 소비 ≤ 한도', I:{end:{seg:[[400, 0], [31.4159, 10], [400, 0], [31.4159, 10]], laps:26, stint:13}, e_target:3, e_lim:2, pmax:80}, expect:{e_ok:1}, src:'한도 3 kWh 로 줄이면 출력 상한을 낮춰 맞춤'},
    {n:'주행선 · 슬라럼 콘 2개 (곧은 80 m 닫힌 코스, 폭 6 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[3, 3, 3, 3], WR:[3, 3, 3, 3], slalom:[1, 3]}}, expect:{c_len:80.119760},
     src:"Σ(e'')² 최소, e(20) = +1, e(60) = −1, 주기 80 → 2계 차분이 콘 사이에서 직선 → e(u) = a·u + c·u³ (u = x − 40, 1 m 간격), c = 1 ÷ (2·20³ + 20), a = −(3·20² + 1)·c → 길이 = Σ√(1 + Δe²)"},
    {n:'주행선 · 둥근 코스 + 안쪽 콘 (반경 20 m, 폭 6 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[125.663706, 20]], laps:1, stint:1, WL:[3], WR:[3], slalom:[0]}}, expect:{c_len:119.380521},
     src:'곡률 일정이면 Σ(k0 + e″)² 는 e 가 일정할 때 가장 작음 → 콘 때문에 e = +1 (안쪽 1 m) → 반경 19 m, 길이 = 2π × 19'},
    {n:'주행선 · 차 전폭으로 여유 (전폭 1.6 m + 여유 0.2 m)', I:{course:'end', rl_on:1, rl_b:5, w_car:1.6, rl_m:0.2, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[3, 3, 3, 3], WR:[3, 3, 3, 3], slalom:[1, 3]}}, expect:{c_len:80.119760, c_rlb:1},
     src:'b = 1.6 ÷ 2 + 0.2 = 1.0 (최소 거리 칸 5 m 는 안 씀) → 위 슬라럼 경우와 같은 길이'},
    {n:'주행선 다듬기 · 둥근 코스는 안쪽 경계가 가장 빠름 (반경 20 m, 폭 6 m, 두 번째 랩)', I:{course:'free', lap:'2', rl_on:2, rl_b:1, mu:1, mu_s:0, crr:0, cla:0, cda:0, tmax:1e5, free:{seg:[[125.663706, 20]], wl:[3], wr:[3], closed:true, laps:2, s0:0}}, expect:{c_t:8.511020, c_len:113.097336},
     src:'일정 반경 r 을 v = √(μgr) 로 돌면 한 바퀴 2πr ÷ √(μgr) ∝ √r → 가장 작은 r = 20 − (3 − 1) = 18 m: 2π·18 ÷ √(9.81·18) = 8.5110 s, 길이 2π·18 (최소 곡률은 가운데 선 8.9714 s)'},
    {n:'내구 · 출력 상한 없이 달렸을 때 에너지 (상한이 걸려도)', I:{crr:0.015, cla:0, cda:0, m:300, j_eq:0, eta_dt:100, nmax:6500, gr:3.55, r_eff:229, e_target:0.3, e_lim:2, end:{seg:[[1000, 0]], laps:26, stint:13}}, expect:{e_nl_t:0.479488, e_nl_c:0.479488},
     src:'드라이버 2명 정지 출발 → 최고속 43.909 m/s (회전수 한계): 2 × ½ × 300 × 43.909² + 0.015 × 300 × 9.81 × 26 km = 1.7262 MJ = 0.4795 kWh (효율 100 %, 저항 0)'},
    {n:'내 코스 · 슬라럼 콘 간격 (곧은 40 m 닫힌 코스, 간격 20 m, 폭 6 m)', I:{course:'free', rl_on:1, rl_b:1, free:{seg:[[40, 0]], wl:[3], wr:[3], sl:[20], closed:true, laps:1, s0:0}}, expect:{c_len:40.238099},
     src:"콘 = 10 m (+1) · 30 m (−1). Σ(e'')² 최소 → e(u) = a·u + c·u³ (u = x − 20), c = 1 ÷ (2·10³ + 10), a = −(3·10² + 1)·c → 길이 = Σ√(1 + Δe²)"},
    {n:'내 코스 · 구간마다 폭 (반경 20 m 왼쪽 원, 왼쪽 4 m · 오른쪽 1 m)', I:{course:'free', lap:'2', rl_on:2, rl_b:1, mu:1, mu_s:0, crr:0, cla:0, cda:0, tmax:1e5, free:{seg:[[125.663706, 20]], wl:[4], wr:[1], closed:true, laps:2, s0:0}}, expect:{c_t:8.271225, c_len:106.814150},
     src:'안쪽(왼쪽) 경계 = 4 − 1 = 3 m 안 → r = 17 m: 2π·17 ÷ √(9.81·17) = 8.2712 s, 길이 2π·17'},
    {n:'모델 단계 1 · 롤센터 = 무게중심 높이 → 하중 이동은 축 질량 몫 (롤강성 배분과 상관없음)', I:{md:1, h_rcf:300, h_rcr:300, m:300, fr:50, h:300, tf:1200, tr:1200, lltd:20, mu:1.5, mu_s:0.1, crr:0, cla:0, cda:0}, expect:{t_skid_s:10.276676},
     src:'탄성 몫 = 0 → 앞 ΔF = m·0.5·ay·h ÷ t = 단계 0 에서 횡하중 이동 배분 50 % 와 같음 → [하중 감도 · 스키드패드] 경우와 같은 10.2767 s'},
    {n:'모델 단계 1 · 롤각 (스키드패드)', I:{md:1, h_rcf:100, h_rcr:100, k_roll:1000, m:300, fr:50, h:300, mu:1.5, mu_s:0, crr:0, cla:0, cda:0}, expect:{ay_skid:1.5, skid_roll:0.882900},
     src:'ay = μg = 14.715 m/s² → φ = m·ay·(h − 롤축 높이) ÷ 롤강성 = 300 × 14.715 × 0.2 ÷ 1000 = 0.8829°'},
    {n:'스키드패드 횡가속도 = 기록 바퀴 평균 · 가속 최대 종가속도 (μ = 1)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5}, expect:{ax_max:1, ay_skid:1},
     src:'접지 한계만이면 종가속도 = μg 일정 → 최대 1 g, 일정 반경 선회 ay = μg → 1 g'},
    {n:'내구 · 에너지 상한 제한 안 함 → 출력 상한 100 %', I:{end:{seg:[[400, 0], [31.4159, 10], [400, 0], [31.4159, 10]], laps:26, stint:13}, e_target:3, e_lim:0, pmax:80}, expect:{p_lim:100},
     src:'상한을 끄면 소비와 상관없이 출력 배율 1 (위 경우와 같은 코스 · 한도에서 제한만 끔)'},
    {n:'열 모델 모터 · 냉각수 · 축전지 · 정상 온도 (직선 20 km, 최고속 일정, 효율 90 · 95 %)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, th_on:1, cw_on:1, bt_on:1, t_amb:25, cw_c:2000, ua0:200, ua60:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0}, expect:{c_tm:30.951053, c_tw:26.643624, c_tb:25.385101},
     src:'F = 0.015·300·9.81 = 44.15 N, v = 43.909 m/s → 축 1938.4 W, 모터 손실 215.4 W, 인버터 손실 113.4 W. 냉각수 = 25 + 328.7 ÷ 200 = 26.644, 모터 = 냉각수 + 215.4 × 0.02 = 30.951, 축전지 I = 8.776 A → 25 + I²·0.1 ÷ 20 = 25.385 °C'},
    {n:'열 모델 축전지 · 내부저항 온도 의존 (α = 0.02 /°C)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, th_on:1, cw_on:1, bt_on:1, t_amb:25, cw_c:2000, ua0:200, ua60:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0.02}, expect:{c_tb:25.382138},
     src:'T = 25 + I(T)²·R(T) ÷ 20, R(T) = 0.1 (1 + 0.02 (25 − T)) 를 고정점 반복으로 풂 → 25.3821 °C'},
    {n:'최소 회전 반경 · 레코드 라인이 안쪽으로 가다 멈춤 (반경 20 m, 폭 6 m, rmin 19 m)', I:{course:'free', lap:'2', rl_on:2, rl_b:1, rmin:19, mu:1, mu_s:0, crr:0, cla:0, cda:0, tmax:1e5, free:{seg:[[125.663706, 20]], wl:[3], wr:[3], closed:true, laps:2, s0:0}}, expect:{c_t:8.744242, c_len:119.380521, c_rbad:0},
     src:'제약이 없으면 안쪽 경계 18 m. 반경 19 m 아래로는 못 가므로 r = 19: 2π·19 ÷ √(9.81·19) = 8.7442 s, 길이 2π·19'},
    {n:'최소 회전 반경 · 최소 곡률 라인을 바깥으로 밀어 맞춤 (반경 20 m, 폭 6 m, rmin 21 m)', I:{course:'free', lap:'1', rl_on:1, rl_b:1, rmin:21, free:{seg:[[125.663706, 20]], wl:[3], wr:[3], closed:true, laps:1, s0:0}}, expect:{c_rbad:0},
     src:'제약이 없으면 가운데 선 20 m (어긋남). 원에서는 반경 21 ~ 22 m 가 모두 목적 함수 값이 같아 반경 하나로 정해지지 않으므로, 제약을 지켰는지(급한 구간 0 m)만 봄'},
    {n:'최소 회전 반경 고려 안 함 → 제약 없는 레코드 라인 (반경 20 m, 폭 6 m, rmin 19 m)', I:{course:'free', lap:'2', rl_on:2, rl_b:1, rmin:19, rm_on:0, mu:1, mu_s:0, crr:0, cla:0, cda:0, tmax:1e5, free:{seg:[[125.663706, 20]], wl:[3], wr:[3], closed:true, laps:2, s0:0}}, expect:{c_t:8.511020, c_len:113.097336, c_rbad:0},
     src:'고려 안 함이면 안쪽 경계 18 m 까지 감 (고려하면 19 m): 2π·18 ÷ √(9.81·18) = 8.5110 s, 급한 구간도 세지 않음'},
    {n:'최소 회전 반경 · 폭 안에서 못 맞추면 알림 (반경 2.5 m, 폭 3.5 m, rmin 4 m)', I:{course:'free', lap:'1', rl_on:1, rl_b:1, rmin:4, free:{seg:[[15.707963, 2.5]], wl:[1.75], wr:[1.75], closed:true, laps:1, s0:0}}, expect:{c_rmn:3.25, c_rbad:20.420352},
     src:'가장 큰 반경 = 바깥 경계 2.5 + (1.75 − 1) = 3.25 m < 4 m → 한 바퀴 전부 급함: 2π·3.25 = 20.4204 m'},
    {n:'최소 회전 반경 · 가운데 선은 그대로 두고 알림 (반경 2.5 m, rmin 3 m)', I:{course:'free', lap:'1', rl_on:0, rmin:3, free:{seg:[[15.707963, 2.5]], wl:[1.75], wr:[1.75], closed:true, laps:1, s0:0}}, expect:{c_rmn:2.5, c_rbad:15.707963},
     src:'가운데 선을 그대로 달리므로 반경 2.5 m, 급한 길이 = 한 바퀴 2π·2.5 = 15.7080 m'},
    {n:'열 모델 모터 열 끔 → 디레이팅 없음', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, tmax:1e5, motor:[[0, 200], [10000, 200]], motorC:[[0, 100], [10000, 100]], v_ref:300, ke_ratio:1, th_k:10, th_t0:40, th_init:45, th_c:1e9, th_r:1e9, th_cool:45, th_on:0}, expect:{t_acc_s:3.75},
     src:'모터 열을 끄면 온도로 토크를 깎지 않음: 200 N·m → F = 3200 N, a = 10.667 → t = √(2 × 75 ÷ 10.667) = 3.75 s (켜면 4.3301 s)'},
    {n:'열 모델 모터 · 축전지 (냉각수 계통 끔 → 냉각수 온도 고정)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, th_on:1, cw_on:0, bt_on:1, t_amb:25, cw_c:2000, ua0:200, ua60:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0}, expect:{c_tm:29.307429, c_tb:25.385101},
     src:'모터 = 고정 냉각수 25 + 손실 215.37 W × 0.02 = 29.3074 °C, 축전지는 냉각수와 이어져 있지 않아 세 계통 모두 켤 때와 같은 25.3851 °C'},
    {n:'주행선 · 슬라럼 콘이 가운데 선에서 벗어남 (곧은 80 m 닫힌 코스, 콘 옆 거리 +0.5 · −0.5 m, 폭 6 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[3, 3, 3, 3], WR:[3, 3, 3, 3], slalom:[1, 3], slat:[0.5, -0.5], sds:[0, 0]}}, expect:{c_len:80.269101, c_ctight:0},
     src:"콘 자리 제약이 e ≥ 0.5 + 1 · e ≤ −0.5 − 1 → 가운데 콘 경우의 해 × 1.5: e(u) = 1.5 (a·u + c·u³) → 길이 = Σ√(1 + Δe²) = 80.2691 m (가운데 콘이면 80.1198 m)"},
    {n:'주행선 · 콘과 경계 사이가 좁으면 알림 (왼쪽 폭 1.5 m, b = 1 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[1.5, 1.5, 1.5, 1.5], WR:[3, 3, 3, 3], slalom:[1, 3]}}, expect:{c_ctight:1},
     src:'첫 콘은 왼쪽으로 지나가야 하는데 콘 ↔ 왼쪽 경계 1.5 m < 2b = 2 m → 1개. 두 번째 콘(오른쪽, 3 m)은 지킴'},
    {n:'차 여유 · 전장과 저속 차체 각도 (반경 10 m 원, 전폭 1.4 m, 휠베이스 1.6 m, 앞 50 %, 앞 · 뒤 오버행 0.5 · 0.3 m, 여유 0.2 m)', I:{course:'free', lap:'1', rl_on:0, w_car:1.4, rl_m:0.2, oh_f:0.5, oh_r:0.3, L:1600, fr:50, free:{seg:[[62.831853, 10]], wl:[3], wr:[3], closed:true, laps:1, s0:0}}, expect:{c_rmn:10, c_bo:1.072678, c_bi:0.932051},
     src:'l_r = 0.8 m, 뒤축 반경 R_r = √(10² − 0.8²) = 9.9679. 바깥 = √(2.1² + (R_r + 0.7)²) − 10 + 0.2 = 1.0727 m (앞 끝 = 뒤축에서 1.6 + 0.5), 안쪽 = 10 − (R_r − 0.7) + 0.2 = 0.9321 m (곧은 길이면 둘 다 0.9 m)'},
    {n:'열 모델 · 모두 수랭 + 인버터 · 축전지 온도 (정상 온도)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_c:2000, ua0:200, ua60:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:1, i_cool:1, b_cool:1, i_c:500, i_r:0.05, b_r:0.05}, expect:{c_tw:26.682134, c_tm:30.989563, c_ti:32.349804, c_tb:27.067235},
     src:'냉각수 = 25 + (모터 215.371 + 인버터 113.353 + 축전지 7.702 W) ÷ 200 = 26.6821, 모터 = 냉각수 + 215.371 × 0.02, 인버터 = 냉각수 + 113.353 × 0.05, 축전지 = 냉각수 + 7.702 × 0.05'},
    {n:'열 모델 · 모두 공랭 (냉각수 계통에 넣는 부품 없음)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_c:2000, ua0:200, ua60:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:0, i_cool:0, b_cool:0, m_ha0:20, m_ha60:20, i_c:500, i_ha0:10, i_ha60:10, b_ha:20, b_ha60:20}, expect:{c_tm:35.768572, c_ti:36.335339, c_tb:25.385101},
     src:'모터 = 25 + 215.371 ÷ 20 = 35.7686, 인버터 = 25 + 113.353 ÷ 10 = 36.3353, 축전지 = 25 + 7.702 ÷ 20 = 25.3851 (냉각수는 켜도 넣는 열이 없어 고정)'},
    {n:'효율 · 모터 맵에 인버터를 합침 (합친 효율 85.5 %, 인버터 몫 30 %)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_c:2000, ua0:200, ua60:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:0, m_cool:1, i_cool:1, i_c:500, i_r:0.05, eta_mot:85.5, eta_inv:50, eff_mg:1, inv_r:30}, expect:{c_tw:26.643624, c_tm:31.245772, c_ti:31.574497},
     src:'합친 손실 = 1938.343 × (1 ÷ 0.855 − 1) = 328.725 W (따로 넣을 때 모터 + 인버터와 같음, 인버터 효율 칸 50 % 는 안 씀). 냉각수 = 25 + 328.725 ÷ 200, 모터 = 냉각수 + 0.7 × 328.725 × 0.02, 인버터 = 냉각수 + 0.3 × 328.725 × 0.05'},
    {n:'열 모델 · 공랭 방열 능력이 차속에 따라 (축전지 정지 10 · 60 km/h 30 W/K)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_c:2000, ua0:200, ua60:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:0, bt_on:1, b_cool:0, b_ha:10, b_ha60:30}, expect:{c_tb:25.122858},
     src:'v = 43.909 m/s → hA = 10 + (30 − 10) × 43.909 ÷ 16.667 = 62.690 W/K → 축전지 = 25 + 7.702 ÷ 62.690 = 25.1229 °C'},
    {n:'μ 기준 하중 · μ(F_z) = μ − 감도 (F_z − F_z0): 기준 735.75 N 에서 μ 1.426425 = 위 하중 감도 경우와 같은 직선', I:{m:300, fr:50, h:300, tf:1200, tr:1200, lltd:50, mu:1.426425, mu_s:0.1, tire_fz0:735.75, crr:0, cla:0, cda:0}, expect:{t_skid_s:10.276676, ay_skid:1.390843},
     src:'1.426425 − 0.1 × (F_z − 0.73575 kN) = 1.5 − 0.1 × F_z → 하중 감도 · 스키드패드 경우와 같은 μ(F_z)'},
    {n:'모델 단계 1 · 탄성 몫은 롤강성 배분 rsd (롤센터 0, rsd 50 % · lltd 20 % → lltd 50 % 단계 0 과 같음)', I:{md:1, h_rcf:0, h_rcr:0, rsd:50, lltd:20, m:300, fr:50, h:300, tf:1200, tr:1200, mu:1.5, mu_s:0.1, crr:0, cla:0, cda:0}, expect:{t_skid_s:10.276676},
     src:'롤센터 0 → 하중 이동 = rsd × m ay h ÷ t (앞) → 단계 0 lltd 50 % 하중 감도 경우와 같음'},
    {n:'모델 2 · 일정 원 (반경 200 m, 최고속 13.51 m/s) 슬립각 · 차체 각도 · 조향각 (MF 역함수, E = 0)', I:{md:2, tire_fz0:700, tire_ca0:450, tire_cn:0.8, tire_c:1.3, tire_e:0, steer_ratio:5, course:'free', lap:'2', rl_on:0, m:300, fr:47.5, h:0, mu:1.5, mu_s:0, crr:0, cla:0, cda:0, nmax:2000, gr:3.55, r_eff:229, free:{seg:[[1256.637061, 200]], closed:true, laps:2, s0:0}}, expect:{c_afmax:0.144877, c_armax:0.147806, c_bmax:0.063114, c_dwmax:0.441113, c_swmax:2.205566},
     src:'v = 2000 rpm × 2π/60 × 0.229 ÷ 3.55 = 13.510 m/s, a_y = v²/200. 바퀴 하나 F_y = m a_y × 앞 몫 ÷ 2 → α = tan(asin(F_y ÷ D) ÷ C) ÷ B. β = 1.55 × 0.475 ÷ 200 − α_r = 0.0631°, δ = 1.55 ÷ 200 + α_f − α_r = 0.4411°, 핸들 = × 5'},
    {n:'모델 2 · 선형 언더스티어 구배 = W_f ÷ C_αf − W_r ÷ C_αr (정지 하중 코너링 강성)', I:{md:2, tire_fz0:700, tire_ca0:450, tire_cn:0.8, tire_c:1.3, tire_e:0, m:300, fr:47.5}, expect:{k_us_lin:-0.031441},
     src:'C_α(F_z) = 450 (F_z ÷ 700)^0.8 N/° → (300 × 9.81 × 0.475 ÷ (2 × 449.47) − 300 × 9.81 × 0.525 ÷ (2 × 486.93)) = −0.03144 °/g'},
    {n:'모델 3 · 계단 조향 (60 km/h, 0.4 g, 롤 팔 0, 이완 0) → 수치 적분 정상 요레이트 = 해석해 V δ ÷ (L + K V²)', I:{md:3, tire_fz0:700, tire_ca0:450, tire_cn:0.8, tire_c:1.3, tire_e:0, tire_relax:0, m:300, fr:47.5, h:300, h_rcf:300, h_rcr:300, izz:70, v_test:60, ay_test:0.4}, expect:{tr_r:13.489718, tr_rss:13.489718, tr_del:1.241967, tr_ay:0.4, tr_wn:5.448057, tr_zeta:1.119155, tr_kus:-0.031441},
     src:'C_f = 2 × 449.47 · C_r = 2 × 486.93 N/° , K = m (b ÷ C_f − a ÷ C_r) ÷ L, δ = 0.4 g (L + K V²) ÷ V² = 1.2420°, r = V δ ÷ (L + K V²) = 13.490 °/s, ω_n = 5.448 Hz, ζ = 1.1192 (2 자유도 해석해)'},
    {n:'모델 3 · 롤 (롤센터 30 / 50 mm, 무게중심 290 mm, 현가하 12 kg × 4, 롤강성 800 N·m/°, 롤 감쇠 30, I_xx 30, 이완 0.3 m) → 정상 롤각 = m_s h′ a_y ÷ (K_φ − m_s g h′)', I:{md:3, tire_fz0:700, tire_ca0:450, tire_cn:0.8, tire_c:1.3, tire_e:0, tire_relax:0.3, m:300, fr:47.5, h:290, h_rcf:30, h_rcr:50, m_us_f:12, m_us_r:12, k_roll:800, c_roll:30, ixx:30, izz:70, v_test:60, ay_test:0.4}, expect:{tr_phi:0.312603, tr_phis:0.312603, tr_ay:0.4},
     src:'h_ra = 30 + 20 × 0.525 = 40.5 mm → h′ = 0.2495 m, m_s = 252 kg, φ = 252 × 0.2495 × 0.4 g ÷ (800 × 180/π − 252 g × 0.2495) = 0.3126°. 정상 상태 횡가속도는 롤 · 이완과 상관없이 0.4 g'}
  ],
  calcLimit: 60,   /* 한 번 계산 제한 시간 [s] (주행선 다듬기 포함) */
  code:`// ================================================================
// 도구 2 랩타임 시뮬레이터 — 계산 코드
// ================================================================
// 입력 I : 왼쪽 입력 칸 (단위 그대로: kg, mm, %, 1/kN, rpm, N·m, kW, V, Ah, mΩ, A, kWh, s)과 작업창 위 표
//   I.end   = {seg:[[길이 m, 반경 m], …], laps, stint, WL · WR (점마다 폭, 공식 코스는 실제 콘 위치로), slalom (콘 점 번호), slat (콘 옆 거리)}   공식 내구 코스 (오토크로스 = 거꾸로 한 바퀴)
//   I.th_on · I.in_on · I.bt_on · I.cw_on = 열 모델 켜기 (모터 열 · 인버터 · 축전지 · 냉각수 온도), I.m_cool · I.i_cool · I.b_cool = 0 공랭 · 1 수랭, I.eff_mg = 1 이면 모터 맵에 인버터 합침 (손실 중 인버터 몫 I.inv_r %), I.md = 차량 모델 단계 (0 · 1 롤센터)
//   I.rmin  = 최소 회전 반경 [m], I.rm_on = 고려 (1) · 안 함 (0) (주행선 |곡률| ≤ 1/rmin 을 제약으로 풀고, 못 지킨 구간은 c_rbad 로 알림; 0 = 제약 없음),  I.e_lim = 내구 에너지 상한 (0 없음 · 1 제원 용량 · 2 임의 e_target)
//   I.free  = {seg, wl, wr, sl, laps, s0}               내 코스 (반경: 왼쪽 회전 +, 오른쪽 −, 직선 0 · 구간마다 왼쪽 · 오른쪽 폭 [m], 슬라럼 콘 간격 [m], null = 빈칸)
//   I.motor = [[회전수 rpm, 토크 N·m], …]                모터 토크 곡선 (기준 전압 I.v_ref 에서. 비면 최대 토크 일정)
//   I.effM · I.effI = 효율 맵 {n:[rpm], t:[N·m], e:[[%]]} 또는 null (→ 상수 I.eta_mot · I.eta_inv)
//   I.grMode = 'my'(입력한 감속비) | 'opt'(제안 감속비),  I.course = 고른 코스,  I.lap = 볼 랩('1' … | 'all')
//   I._sweep = 입력 훑기 중 (줄여 셈)
//
// 모델 : 점질량 준정적(QSS)
//   - 앞뒤 하중 이동 (종가속 · 항력 높이 · 다운포스 앞뒤 몫), 좌우 하중 이동 (모델 0: 넘기려는 모멘트를 축 무게 몫대로, 모델 1 이상: 롤센터 · 롤강성 배분)
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
  const fa  = I.xcop / I.L;                 // 다운포스 앞 몫 [-]  (xcop = 뒤축에서 앞으로 압력중심까지 [mm])
  const hc  = I.hcop / 1000;                // 항력 작용 높이 [m]
  const r   = I.r_eff / 1000;               // 바퀴 유효 반경 [m]
  const tf  = I.tf / 1000, tr = I.tr / 1000; // 앞 · 뒤 윤거 [m]
  const mu  = I.mu;                         // 타이어 μ [-]
  const mus = I.mu_s || 0;                  // μ 하중 감도 [1/kN]
  const fz0 = I.tire_fz0 > 0 ? I.tire_fz0 : 0;   // μ 기준 하중 [N]: μ(F_z) = mu − mu_s (F_z − F_z0) ÷ 1000  (0 이면 mu = 하중 0 의 μ, 예전 방식)
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
  const Ecap  = I.e_lim === 0 ? Infinity : I.e_lim === 2 && I.e_target > 0 ? I.e_target * 3.6e6 : Epack;   // 내구에 쓸 수 있는 에너지 [J]  (e_lim 0 = 제한 없음, 1 = 제원 용량 Epack, 2 = 임의 상한 e_target; 2 인데 0 이면 제원 용량)

  // 단자 출력 P [W] 를 낼 때 전류 [A] · 단자 전압 [V]  (P = (V0 − I·R)·I 의 작은 근)
  //   rs = 내부저항 배율 (열 모델 2: 축전지 온도에 따라, 그 밖에는 1)
  function term(P, V0, rs = 1) {
    const Rx = Rb * rs;
    if (P <= 0) return { I: 0, V: V0 };
    if (Rx <= 0) return { I: P / V0, V: V0 };
    const D = V0 * V0 - 4 * Rx * P;
    if (D < 0) return null;
    const i = (V0 - Math.sqrt(D)) / (2 * Rx);
    return { I: i, V: V0 - i * Rx };
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
  // 열 모델 켜기: 모터 열 · 인버터 온도 · 축전지 온도 · 냉각수 온도.  냉각 방식 (0 = 공랭, 1 = 수랭): 모터 · 인버터 기본 수랭, 축전지 기본 공랭
  const mW = I.m_cool !== 0, iW = I.i_cool !== 0, bW = I.b_cool === 1;
  const thOn = I.th_on !== 0, inOn = I.in_on === 1, btOn = I.bt_on === 1;
  // 냉각수는 한 덩어리 (모든 수랭 부품이 같은 냉각수): 열용량 cw_c, 라디에이터 UA(v). 회로 구성 · 라디 · 펌프 선정은 도구 9 냉각 계통 계산기 (그 등가값을 여기에 넣음)
  const cwOn = I.cw_on === 1 && ((thOn && mW) || iW || (btOn && bW));   // 냉각수 온도: 켰고 수랭으로 열을 넣는 부품이 있을 때만 (아니면 고정값)
  const thK  = thOn && I.th_k > 0 ? I.th_k : 0;       // 디레이팅 계수 [N·m/°C]  (0 = 항상 최대 토크, 모터 열을 끄면 디레이팅도 없음)
  const thT0 = I.th_t0;                               // 디레이팅 시작 온도 [°C]
  const thC  = Math.max(1, I.th_c);                   // 열용량 [J/K]
  const thR  = Math.max(1e-9, I.th_r);                // 냉각까지 열저항 [K/W]
  const thCo = I.th_cool;                             // 냉각수 온도 [°C]
  // ---------- 열 모델 (켜고 끔 · 부품마다 공랭 / 수랭)
  //   모터    : C_m dT_m/dt = 모터 손실 − 냉각.  수랭 (T_m − T_w) ÷ R_m,  공랭 hA_m(v) (T_m − T_외기).  끄면 출발 온도 그대로 · 디레이팅 없음
  //   인버터  : C_i dT_i/dt = 인버터 손실 − 냉각.  수랭 (T_i − T_w) ÷ R_i,  공랭 hA_i(v) (T_i − T_외기).  끄면 온도는 안 셈 (수랭이면 손실을 냉각수에 바로)
  //   축전지  : C_b dT_b/dt = I² R(T_b) − 냉각.  공랭 hA_b(v) (T_b − T_외기),  수랭 (T_b − T_w) ÷ R_b.  R(T) = R_25 (1 + α (25 − T)) (0.3 R_25 아래로는 안 감)
  //   냉각수  : C_w dT_w/dt = 수랭 부품에서 들어오는 열 − UA(v) (T_w − T_외기).  끄면 냉각수 온도 고정
  //   방열 능력은 모두 h(v) = h_0 + (h_60 − h_0) × v ÷ 60 km/h (정지 값 · 60 km/h 값, 선형; 팬이면 정지 값을 크게, 주행풍이면 60 km/h 값을 크게)
  //   칸마다 지수 적분 (그 칸 동안 다른 노드 온도 · 손실은 고정) → dt 가 커도 안정
  const Tamb = isFinite(I.t_amb) ? I.t_amb : 25;                         // 외기 온도 [°C]
  const Cw   = Math.max(1, I.cw_c || 1), ua0 = Math.max(0, I.ua0 || 0), ua60 = Math.max(0, I.ua60 || 0);   // 냉각수 열용량 [J/K] · 라디에이터 UA [W/K]
  const Cb   = Math.max(1, I.b_c || 1), alp = I.b_alpha || 0, Rbt = Math.max(1e-9, I.b_r || 0.05);         // 축전지 열용량 [J/K] · 저항 온도 계수 [1/°C] · 수랭 열저항 [K/W]
  const Ci   = Math.max(1, I.i_c || 1), Ri = Math.max(1e-9, I.i_r || 0.05);                                   // 인버터 열용량 [J/K] · 수랭 열저항 [K/W]
  const hV   = (h0, h60, v) => Math.max(0, (h0 || 0) + ((Number.isFinite(h60) ? h60 : (h0 || 0)) - (h0 || 0)) * v / (60 / 3.6));   // 방열 능력 [W/K] (60 km/h 값이 없으면 일정)
  const rS   = Tb => btOn ? Math.max(0.3, 1 + alp * (25 - Tb)) : 1;  // 내부저항 배율
  const toward = (T, Teq, k, dt) => Teq + (T - Teq) * Math.exp(-k * dt);   // dT/dt = k (Teq − T) 의 해
  const air = (T, Q, h, C, dt) => h > 0 ? toward(T, Tamb + Q / h, h / C, dt) : T + Q * dt / C;          // 외기로 식는 노드
  function thStep(st, Lm, Li, Ib, v, dt) {
    const Tw = cwOn ? st.w : thCo, Qb = Ib * Ib * Rb * rS(st.b);
    const m = !thOn ? st.m : mW ? toward(st.m, Tw + Lm * thR, 1 / (thR * thC), dt) : air(st.m, Lm, hV(I.m_ha0, I.m_ha60, v), thC, dt);
    const i = !inOn ? st.i : iW ? toward(st.i, Tw + Li * Ri, 1 / (Ri * Ci), dt) : air(st.i, Li, hV(I.i_ha0, I.i_ha60, v), Ci, dt);
    const b = !btOn ? st.b : bW ? toward(st.b, Tw + Qb * Rbt, 1 / (Rbt * Cb), dt) : air(st.b, Qb, hV(I.b_ha, I.b_ha60, v), Cb, dt);
    let w = thCo;
    if (cwOn) { const UA = Math.max(1e-6, hV(ua0, ua60, v)),
                      Q = (thOn && mW ? (st.m - st.w) / thR : 0) + (iW ? (inOn ? (st.i - st.w) / Ri : Li) : 0) + (btOn && bW ? (st.b - st.w) / Rbt : 0);
                w = toward(st.w, Tamb + Q / UA, UA / Cw, dt); }
    return { m, i, w, b };
  }
  const tmNext = (Tm, Ploss, dt) => thStep({ m: Tm, i: Tm, w: thCo, b: 25 }, Ploss, 0, 0, 0, dt).m;   // 예전 이름 (모터만)

  // 단자 전압 V · 모터 온도 Tm 에서 회전수 n 의 최대 토크 [N·m]
  function Tcurve(n, V, Tm) {
    if (n > nmax) return 0;
    if (!tq.length) return I.tmax;
    let T = fromTab(tq, n, V);
    if (thK && Tm > thT0) {
      const floor = tqC.length ? fromTab(tqC, n, V) : 0;
      T = Math.max(Math.min(T, floor), T - thK * (Tm - thT0));
    }
    return T;                                     // 표가 있으면 표만 (모터 최대 토크 입력은 표가 없을 때의 일정 토크)
  }
  const eM  = (n, T) => (I.effM ? bil(I.effM, n, Math.abs(T)) : I.eta_mot) / 100;   // 모터 효율 [-]
  const effMg = I.eff_mg === 1, rInv = Math.max(0, Math.min(1, (isFinite(I.inv_r) ? I.inv_r : 30) / 100));   // 모터 맵에 인버터를 합쳤으면 인버터 효율 = 1, 손실 중 인버터 몫 rInv
  const eI  = (n, T) => effMg ? 1 : (I.effI ? bil(I.effI, n, Math.abs(T)) : I.eta_inv) / 100;   // 인버터 효율 [-]
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
  // 좌우 하중 이동 (바퀴 하나) [N]
  //   모델 단계 0: 무게중심 높이 전체를 횡하중 이동 배분(앞 몫)으로 나눔
  //   모델 단계 1 이상: 롤센터 높이로 나눔 (Milliken & Milliken 18장) — 기하 몫 = 축 질량 × ay × 롤센터 높이 ÷ 윤거,
  //               탄성 몫 = m × ay × (무게중심 − 롤축 높이) × 롤강성 앞 몫(rsd, 도구 7) ÷ 윤거.  롤센터가 0 이고 rsd = lltd 면 단계 0 과 같음
  const md   = I.md >= 1 ? 1 : 0;                                                    // 모델 단계 (롤센터 · 롤 켬)
  const rsd  = Number.isFinite(I.rsd) ? I.rsd / 100 : fs;                            // 롤강성 앞 몫 [-] (없으면 무게 배분)
  const hrf  = md ? (I.h_rcf || 0) / 1000 : 0, hrr = md ? (I.h_rcr || 0) / 1000 : 0;  // 롤센터 높이 앞 · 뒤 [m]
  const hra  = hrf + (hrr - hrf) * (1 - fs);                                           // 무게중심 자리 롤축 높이 [m]  (앞축에서 L(1 − fs))
  const le   = md ? rsd : fs;                                                          // 탄성 몫 앞 비율 (단계 0 = 롤 정보 없음 → 무게 배분, 기하 몫과 합쳐 앞 몫 = 무게 배분)
  const dF   = (ay, front) => front ? (m * fs * ay * hrf + le * m * ay * (h - hra)) / tf
                                    : (m * (1 - fs) * ay * hrr + (1 - le) * m * ay * (h - hra)) / tr;
  const kRoll = Math.max(1e-9, I.k_roll || 0);                                         // 롤강성 합 [N·m/°]
  const rollAng = ay => md ? m * ay * (h - hra) / kRoll : NaN;                         // 롤각 [°] (스프링 위 · 아래 질량 구분 없음)
  const wheels = (Fz, d) => {                                                       // 축 하중 → [바깥, 안쪽] 바퀴
    let o = Fz / 2 + d, i = Fz / 2 - d;
    if (i < 0) { o = Fz; i = 0; }
    return [Math.max(0, o), i];
  };
  const muZ = z => Math.max(0, tmap ? tab1(tmap, z) : mu - mus * (z - fz0) / 1000);   // 바퀴 하중 z [N] 의 μ
  const cap = (Fz, d) => {                                                          // 축이 낼 수 있는 힘 Σ μ·Fz
    if (!nonlin) return mu * Math.max(0, Fz);
    const [o, i] = wheels(Fz, d), f = z => muZ(z) * z;
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
  function elec(F, v, V0, rs = 1) {
    if (F <= 0) return { T: 0, e: 1, P: 0, I: 0, V: V0, L: 0, Li: 0 };
    const n = rpm(v), w = n * 2 * Math.PI / 60, T = F * r / (gr * eta), em = eM(n, T), e = effMg ? em : em * eI(n, T), P = T * w / e;
    const tr_ = term(P, V0, rs) || { I: Math.min(Imax, V0 / (2 * Math.max(Rb * rs, 1e-9))), V: V0 / 2 };
    if (effMg) { const tot = P - T * w; return { T, e, P, I: tr_.I, V: tr_.V, L: (1 - rInv) * tot, Li: rInv * tot }; }   // 합친 맵: 합친 손실을 비율로 나눔
    return { T, e, P, I: tr_.I, V: tr_.V, L: T * w * (1 / em - 1),       // 모터 손실 = 축 출력 × (1 ÷ 모터 효율 − 1)
             Li: P - T * w / em };                                       // 인버터 손실 = 단자 출력 − 모터 입력
  }

  // ---------- 차량 모델 2: 비선형 타이어 (도구 T 의 Magic Formula 꼴, 바퀴 하나) — 정상 선회 슬립각 · 차체 각도 β · 조향각 (기록은 위 μ 한계 그대로)
  //   F_y(α) = D sin(C atan(Bα − E(Bα − atan Bα))),  D = μ(F_z) F_z (위 muZ 와 같음),  BCD = C_α(F_z) = C_α0 (F_z ÷ F_zr)^n
  //   축 횡력 (요 모멘트 평형) 앞 = m ay × 앞 무게 몫, 뒤 = 나머지 → 두 바퀴 같은 슬립각으로 이 힘이 되는 α (이분법, 최대를 넘으면 최대 자리 = 포화)
  //   β = l_r ÷ R − α_r,  바퀴 조향각 δ = L ÷ R + α_f − α_r (Milliken 5 장, 작은 각),  핸들 각 = δ × 조향비
  const md2 = I.md >= 2, Dg = Math.PI / 180;
  const fzr = I.tire_fz0 > 0 ? I.tire_fz0 : m * g / 4;                                // 코너링 강성 기준 하중 [N]
  const tC = I.tire_c > 0 ? I.tire_c : 1.3, tE = Number.isFinite(I.tire_e) ? Math.min(1, I.tire_e) : 0, ca0 = (I.tire_ca0 > 0 ? I.tire_ca0 : 450) / Dg, cn = Number.isFinite(I.tire_cn) ? I.tire_cn : 0.8;
  const Ca = z => ca0 * Math.pow(Math.max(0, z) / fzr, cn);                           // [N/rad]
  const FyT = (aDeg, z) => { if (z <= 0) return 0; const D = muZ(z) * z; if (D <= 0) return 0; const B = Ca(z) / (tC * D), x = B * aDeg * Dg; return D * Math.sin(tC * Math.atan(x - tE * (x - Math.atan(x)))); };
  function slipA(zo, zi, Fy) {                                                        // 두 바퀴 하중 → 축 횡력 Fy 가 되는 슬립각 [deg], 포화 여부
    const G = a => FyT(a, zo) + FyT(a, zi); let ap = 0, gp = 0;
    for (let a = 0.25; a <= 40; a += 0.25) { const v = G(a); if (v > gp) { gp = v; ap = a; } else if (v < gp * 0.999) break; }
    let lo = Math.max(0, ap - 0.25), hi = ap + 0.25; for (let i = 0; i < 40; i++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (G(m1) < G(m2)) lo = m1; else hi = m2; }
    ap = (lo + hi) / 2; gp = G(ap);
    if (Fy >= gp) return { a: ap, sat: Fy > gp * 1.0005 };
    lo = 0; hi = ap; for (let i = 0; i < 50; i++) { const md_ = (lo + hi) / 2; if (G(md_) < Fy) lo = md_; else hi = md_; }
    return { a: (lo + hi) / 2, sat: false }; }
  const kUs = (m * g * fs / (2 * Ca(m * g * fs / 2)) - m * g * (1 - fs) / (2 * Ca(m * g * (1 - fs) / 2))) / Dg;   // 선형 언더스티어 구배 [deg/g] (정지 하중 코너링 강성)

  return { m, meff, r, gr, eta, fs, h, nmax, vtop, rpm, Fres, Fzr, Fzf, dF, wheels, capF, capR, rollAng, md2, slipA, Ca, kUs, L, hra, tf, tr, muZ, FyT, sr: I.steer_ratio > 0 ? I.steer_ratio : 5,
           vCorner, aDrive, aBrake, drive, elec, Tcurve, Voc, Epack, Ecap, ptMax, Rb, Imax, tmNext, thStep, rS, thOn, cwOn, btOn, inOn, thK, Tinit: I.th_init,
           TH0: { m: I.th_init, i: I.th_init, w: I.th_cool, b: isFinite(I.b_t0) ? I.b_t0 : 25 } };   // 출발 온도 (모터 · 인버터 (= 모터 출발 온도) · 냉각수 · 축전지)
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
    const [l, ...rest] = segs[i];                        // rest = [반경, …] (내 코스는 [반경, 왼쪽 폭, 오른쪽 폭, 시작 콘, 행 번호])
    if (s0 < c + l - 1e-9) {
      const a = s0 - c, head = a > 1e-9 ? [[a, ...rest]] : [], tail = [l - a, ...rest];
      if (a > 1e-9 && tail.length > 4) tail[4] = 0;         // 구간 중간에서 시작하면 그 구간 시작 콘은 앞 조각(맨 끝으로 감)에 남음
      return [tail, ...segs.slice(i + 1), ...segs.slice(0, i), ...head];
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
//   슬라럼 콘 (옆 거리 c, 내 코스는 가운데 선 위 c = 0): 콘 자리에서 e ≥ c + b 또는 e ≤ c − b 를 번갈아 (묶음의 첫 콘은 왼쪽으로 지나감 = e ≥ b)
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

// 곡률 제약 이차 계획: min ½ eᵀQe + gᵀe + Σ 벌점 w_r · (넘은 양),  lo ≤ e ≤ hi (반드시),  행 r: a_rᵀ e ≤ u_r (넘으면 벌점)
//   rows = [{i: [점 3개], a: [계수 3개], u, w}] — 최소 회전 반경 |κ| ≤ 1/rmin 을 선형 부등식 두 줄로 (racingLine 참고)
//   벌점은 넘은 양에 비례 (정확한 벌점): 지킬 수 있으면 w 가 충분히 클 때 제약을 정확히 지키고, 폭 · 콘 때문에 못 지키면 가능한 만큼만 줄임
//   풀이: ADMM (Boyd 외 2011).  x = (Q + ρ(I + AᵀA))⁻¹ (ρ(z_e − u_e) + ρAᵀ(z_a − u_a) − g)  — 행이 이웃 3점만 써서 AᵀA 도 5대각
function curvQP(q0, q1, q2, g, lo, hi, rows, z0) {
  const n = q0.length, rho = 1, W = i => ((i % n) + n) % n;
  const d0 = Float64Array.from(q0, v => v + rho), d1 = Float64Array.from(q1), d2 = Float64Array.from(q2);
  const add = (i, j, v) => { const d = W(j - i); if (d === 0) d0[i] += v; else if (d === 1) d1[i] += v; else if (d === 2) d2[i] += v; else if (d === n - 1) d1[j] += v; else d2[j] += v; };
  rows.forEach(r => { for (let p = 0; p < 3; p++) for (let q = p; q < 3; q++) { const v = rho * r.a[p] * r.a[q]; if (p === q) add(r.i[p], r.i[p], v); else add(r.i[p], r.i[q], v); } });
  const ext = [], e1 = new Float64Array(n), e2 = new Float64Array(n);
  for (let i = 0; i < n; i++) { if (d1[i]) { if (i + 1 < n) e1[i] = d1[i]; else ext.push([0, n - 1, d1[i]]); }
                                if (d2[i]) { if (i + 2 < n) e2[i] = d2[i]; else ext.push([W(i + 2), i, d2[i]]); } }
  const solve = symSolver(d0, e1, e2, ext.map(([a, b, v]) => [Math.min(a, b), Math.max(a, b), v]));
  const m = rows.length, ze = new Float64Array(n), ue = new Float64Array(n), za = new Float64Array(m), ua = new Float64Array(m), r = new Float64Array(n);
  for (let i = 0; i < n; i++) ze[i] = Math.max(lo[i], Math.min(hi[i], z0 ? z0[i] : 0));
  const Ax = (x, k) => { const R = rows[k]; return R.a[0] * x[R.i[0]] + R.a[1] * x[R.i[1]] + R.a[2] * x[R.i[2]]; };
  for (let k = 0; k < m; k++) za[k] = Ax(ze, k);
  for (let it = 0; it < 6000; it++) {
    for (let i = 0; i < n; i++) r[i] = rho * (ze[i] - ue[i]) - g[i];
    for (let k = 0; k < m; k++) { const R = rows[k], c = rho * (za[k] - ua[k]); r[R.i[0]] += R.a[0] * c; r[R.i[1]] += R.a[1] * c; r[R.i[2]] += R.a[2] * c; }
    const x = solve(r); let res = 0;
    for (let i = 0; i < n; i++) { const v = x[i] + ue[i], z = Math.max(lo[i], Math.min(hi[i], v)); res = Math.max(res, Math.abs(z - ze[i]), Math.abs(x[i] - z)); ze[i] = z; ue[i] = v - z; }
    for (let k = 0; k < m; k++) { const ax = Ax(x, k), v = ax + ua[k], U = rows[k].u, z = v <= U ? v : Math.max(U, v - rows[k].w / rho);   // 벌점 몫만큼 경계 쪽으로
      res = Math.max(res, Math.abs(z - za[k]), Math.abs(ax - z)); za[k] = z; ua[k] = v - z; }
    if (res < 1e-8 && it > 20) break;
  }
  return ze;
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
  // ---------- 점마다 폭 (점 양쪽 조각 폭의 평균)
  const lo = new Float64Array(n), hi = new Float64Array(n), wlN = new Float64Array(n), wrN = new Float64Array(n);
  for (let i = 0; i < n; i++) { const a = cyc ? W(i) : Math.min(M - 1, i), b = cyc ? W(i - 1) : Math.max(0, i - 1); wlN[i] = (wl[a] + wl[b]) / 2; wrN[i] = (wr[a] + wr[b]) / 2; }
  // 여유 [왼쪽, 오른쪽] = 곡률 k 에서 차 왼쪽 · 오른쪽이 차 중심 선보다 나가는 거리 + 여유 (o.bk 없으면 양쪽 o.b)
  const bAt = k => o.bk ? o.bk(k) : [o.b, o.b];
  // ---------- 목적: Σ hn (kn + D2e)²  (D2e = 점 i 의 2계 차분) → ½ eᵀQe + gᵀe
  const q0 = new Float64Array(n), q1 = new Float64Array(n), q2 = new Float64Array(n), g = new Float64Array(n);
  const addQ = (i, j, v) => { const d = cyc ? W(j - i) : j - i; if (d === 0) q0[i] += v; else if (d === 1) q1[i] += v; else if (d === 2) q2[i] += v;
    else if (d === n - 1) q1[j] += v; else q2[j] += v; };                     // 닫힌 코스: 처음 ↔ 끝 연결
  // 점 i 의 곡률 ≈ kn + D2e = kn + Σ c[a]·e[idx[a]]
  const node = i => { const hm = hA(i - 1), hp = hA(i), hn = (hm + hp) / 2, kn = (kA(i - 1) * hm + kA(i) * hp) / (hm + hp);
    return { hn, kn, c: [1 / (hm * hn), -(1 / hm + 1 / hp) / hn, 1 / (hp * hn)], idx: [W(i - 1), i, W(i + 1)] }; };
  const i0 = cyc ? 0 : 1, i1 = cyc ? n : n - 1;
  const build = () => { q0.fill(0); q1.fill(0); q2.fill(0); g.fill(0);
    for (let i = i0; i < i1; i++) { const { hn, kn, c, idx } = node(i);
      for (let a = 0; a < 3; a++) { g[idx[a]] += hn * kn * c[a];
        for (let b = a; b < 3; b++) addQ(idx[a], idx[b], hn * c[a] * c[b]); }
    }
    for (let i = 0; i < n; i++) q0[i] += 1e-9; };                               // 곧은 코스에서도 풀리게 (아주 작은 가운데 쪽 당김)
  build();
  // ---------- 경계 · 슬라럼 콘 제약: 점 곡률 kN 에서의 차 여유로 (곧은 선 → 풀린 선의 곡률로 다시 → 몇 번)
  const tight = new Set();   // 콘과 경계 사이가 좁아 여유를 못 지키는 콘 (구간 번호)
  const cones = (o.cones || []).slice().sort((a, b) => a - b);
  const groups = o.groups && o.groups.length ? o.groups.map(g => g.slice()) : [];
  // 콘 묶음: 주어지면 그대로 (내 코스 = 행마다), 아니면 구간 번호가 20 안쪽으로 이어지는 콘 (공식 코스 = 1 m 구간 → 약 20 m)
  if (!groups.length) cones.forEach(c => { const gl = groups[groups.length - 1]; if (gl && c - gl[gl.length - 1] < 20) gl.push(c); else groups.push([c]); });
  const bounds = kN => { tight.clear();
    for (let i = 0; i < n; i++) { const [bL, bR] = bAt(kN[i]), L = wlN[i] - bL, Rr = wrN[i] - bR; lo[i] = -Rr; hi[i] = L; if (lo[i] > hi[i]) lo[i] = hi[i] = (L - Rr) / 2; }
    if (!cyc) { lo[0] = hi[0] = 0; lo[n - 1] = hi[n - 1] = 0; }              // 열린 코스: 출발 · 끝은 가운데
    groups.forEach(gp => { const sgn0 = 1;   // 묶음의 첫 콘은 차가 왼쪽으로 지나감 (FSK 공식 코스 규칙, 내 코스도 같게) → 콘은 차 오른쪽
      gp.forEach((c, j) => { const i = segNode[c], sg = j % 2 ? -sgn0 : sgn0, cl = o.coneLat && o.coneLat.has(c) ? o.coneLat.get(c) : 0;   // cl = 콘의 옆 거리 (내 코스 = 가운데 선 위 0)
        // 콘 = 반지름 b 원 (콘 자리 = 점 i 에서 앞뒤로 cd 만큼, b = 콘 쪽 차 여유): 콘을 사이에 둔 두 점은 옆으로 b, 그 밖의 점은 앞뒤 거리 ds 일 때 √(b² − ds²) 이상
        const cd = o.coneDs && o.coneDs.has(c) ? o.coneDs.get(c) : 0;
        for (let d = -8; d <= 8; d++) { const q = i + d, k = cyc ? W(q) : q; if (k < 0 || k >= n) continue;
          const bc = bAt(kN[k])[sg > 0 ? 1 : 0];
          let s = -cd; if (d > 0) for (let t = 0; t < d; t++) s += hA(i + t); else for (let t = 1; t <= -d; t++) s -= hA(i - t);
          const br = d === 0 || (Math.abs(cd) > 1e-9 && d === Math.sign(cd)); if (!br && Math.abs(s) >= bc) continue;
          const off = br ? bc : Math.sqrt(bc * bc - s * s);
          if (sg > 0) lo[k] = Math.max(lo[k], cl + off); else hi[k] = Math.min(hi[k], cl - off);
          if (lo[k] > hi[k]) { lo[k] = hi[k]; tight.add(c); } } }); }); };
  const kNode = x => { const kN = new Float64Array(n); for (let i = i0; i < i1; i++) { const { kn, c, idx } = node(i); kN[i] = (kn + c[0] * x[idx[0]] + c[1] * x[idx[1]] + c[2] * x[idx[2]]) / (1 - kn * x[i]); }
    if (!cyc) { kN[0] = kN[1]; kN[n - 1] = kN[n - 2]; } return kN; };
  bounds(new Float64Array(n));
  let e = boxQP(q0, q1, q2, g, lo, hi);
  if (o.bk) for (let it = 0; it < 3; it++) { bounds(kNode(e)); e = boxQP(q0, q1, q2, g, lo, hi, e); }   // 차 길이 · 저속 차체 각도: 곡률에 따라 여유가 바뀜
  // ---------- 최소 회전 반경: 곡률이 1/rmin 을 넘는 점에 벌점(10 → 100 → …)을 붙여 다시 풂 (최대 8 번, 폭 안에서 못 맞추면 남김 → 결과에 경고)
  // ---------- 최소 회전 반경 |κ| ≤ 1/rmin.  곡률 κ = (kn + D2e) ÷ (1 − kn·e) 이므로 (1 − kn·e > 0)
  //   kn + D2e ≤ kmax (1 − kn·e)  과  −(kn + D2e) ≤ kmax (1 − kn·e)  두 줄 모두 e 에 대해 선형 → 곡률 제약 QP 로 다시 풂 (어긴 점이 있을 때만)
  const kmax = o.kmax > 0 ? o.kmax : 0;
  if (kmax) {
    const kOf = i => { const { kn, c, idx } = node(i); return (kn + c[0] * e[idx[0]] + c[1] * e[idx[1]] + c[2] * e[idx[2]]) / (1 - kn * e[i]); };
    let any = false; for (let i = i0; i < i1 && !any; i++) if (Math.abs(kOf(i)) > kmax * (1 + 1e-9)) any = true;
    if (any) {
      // 점 곡률로 제약을 걸고, 달리는 조각 곡률(이웃 두 점 평균, lineOut)이 그래도 넘으면 점 제약을 그 비만큼 조여 다시 풂 (최대 4 번, 합쳐 10 % 까지)
      const e0 = e, pk = x => { let m = 0; lineOut(x, { h, k0, cyc, n, M, segNode, lo, hi }).segs.forEach(([, R]) => { if (R) m = Math.max(m, 1 / Math.abs(R)); }); return m; };
      let kq = kmax;
      for (let t = 0; t < 4; t++) {
        const rows = [];
        for (let i = i0; i < i1; i++) { const { hn, kn, c, idx } = node(i), w = 1e3 * hn;
          rows.push({ i: idx, a: [c[0], c[1] + kq * kn, c[2]], u: kq - kn, w });          //  κ ≤ kq
          rows.push({ i: idx, a: [-c[0], -c[1] + kq * kn, -c[2]], u: kq + kn, w }); }     // −κ ≤ kq
        e = curvQP(q0, q1, q2, g, lo, hi, rows, e0);
        const kp = pk(e); if (kp <= kmax * (1 + 1e-4) || kq <= kmax * 0.9) break;
        kq = Math.max(kmax * 0.9, kq * kmax / kp);
      }
    }
  }
  const res = lineOut(e, { h, k0, cyc, n, M, segNode, lo, hi, kmax, wlN, wrN, bk: o.bk || null });
  res.ctight = tight.size;
  if (o.key) RLC.set(o.key, res);
  return res;
}

// 경계 · 콘에서 차 중심까지 최소 거리 b [m]: 차 전폭이 있으면 전폭 ÷ 2 + 여유, 없으면 (0 · 빈칸) 직접 넣은 최소 거리
// 최소 회전 반경 rmin [m] → 주행선 최대 곡률 [1/m] (0 · 빈칸 = 제약 없음)
const rkMax = I => I.rm_on !== 0 && I.rmin > 0 ? 1 / I.rmin : 0;   // rm_on 0 = 최소 회전 반경 고려 안 함
// 달리는 선에서 최소 회전 반경보다 급한 구간: {r: 가장 작은 반경 [m], bad: 급한 구간 길이 합 [m]}
function rTight(segs, rmin) { let r = Infinity, bad = 0;
  (segs || []).forEach(([l, R]) => { if (!R) return; const a = Math.abs(R); if (a < r) r = a; if (rmin > 0 && a < rmin * (1 - 1e-3)) bad += l; });
  return { r, bad }; }
const rlB = I => I.w_car > 0 ? I.w_car / 2 + Math.max(0, I.rl_m || 0) : Math.max(0, I.rl_b);
// 차 여유 (기하, 차량 모델 단계와 상관없이): 차 = 전폭 w × (앞 끝 ~ 뒤 끝) 사각형, 저속 기구학 선회 (뒷바퀴 옆 미끄럼 없음)
//   회전 중심 O 는 뒤축 연장선 위, 뒤축 중심 반경 R_r = √(R² − l_r²)  (R = CG 경로 반경, l_r = CG ~ 뒤축) → 차체가 CG 경로에 대해 β = atan(l_r / R) 만큼 비스듬
//   바깥 여유 = 바깥 모서리 (앞 끝 · 뒤 끝) 중 O 에서 가장 먼 거리 − R,  안쪽 여유 = R − 안쪽 옆면에서 O 까지 가장 가까운 거리  (+ 여유 rl_m)
//   곡률 k > 0 (왼쪽 회전) 이면 [왼쪽, 오른쪽] = [안쪽, 바깥], 곧은 길이면 둘 다 w/2 + 여유.  전폭이 0 이면 쓰지 않음 (양쪽 rl_b)
function bodyBk(I) {
  if (!(I.w_car > 0)) return null;
  const w = I.w_car, mg = Math.max(0, I.rl_m || 0), L = I.L / 1000, lr = L * I.fr / 100;   // fr = 앞축 하중 % → CG 는 뒤축에서 L·fr 앞
  const xF = L + Math.max(0, I.oh_f || 0), xR = -Math.max(0, I.oh_r || 0);                  // 뒤축 기준 차 앞 끝 · 뒤 끝 [m]
  const C = new Map();
  return k => { const a = Math.abs(k); if (a < 1e-4) return [w / 2 + mg, w / 2 + mg];
    const key = Math.round(a * 1e4); if (C.has(key) && k > 0 === C.get(key)[2]) return C.get(key).slice(0, 2);
    const R = 1 / a, Rr = Math.sqrt(Math.max(R * R - lr * lr, 1e-6));
    const out = Math.max(Math.hypot(xF, Rr + w / 2), Math.hypot(xR, Rr + w / 2)) - R;
    const din = xR <= 0 && xF >= 0 ? Math.abs(Rr - w / 2) : Math.min(Math.hypot(xF, Rr - w / 2), Math.hypot(xR, Rr - w / 2));
    const bo = out + mg, bi = Math.max(0, R - din) + mg, r = k > 0 ? [bi, bo] : [bo, bi];
    C.set(key, [r[0], r[1], k > 0]); return r; };
}
const bodyKey = I => I.w_car > 0 ? [I.w_car, I.oh_f || 0, I.oh_r || 0, I.L, I.fr, I.rl_m].join(',') : '';

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
  // 점 곡률 (kn + e″) ÷ (1 − kn·e): 조각 곡률은 이웃 두 점 평균이라 한 점만 튀는 뾰족한 꺾임(경계 · 콘에 잘린 옮김)을 못 봄 → 점 곡률로 따로 막음
  const kA = i => k0[cyc ? ((i % M) + M) % M : Math.max(0, Math.min(M - 1, i))];
  const nodeK = (x, i) => { const hm = hA(i - 1), hp = hA(i), kn = (kA(i - 1) * hm + kA(i) * hp) / (hm + hp); return (kn + D2(x, i)) / (1 - kn * E(x, i)); };
  let kRef = 0; for (let j = 0; j < M; j++) kRef = Math.max(kRef, Math.abs(mdl.K[j]));
  const kLim = geo.kmax ? geo.kmax : 2 * kRef;   // 점 곡률 한계: 최소 회전 반경이 있으면 1/rmin, 없으면 처음 선의 가장 급한 곡률 × 2
  const t0 = mdl.full();
  let evals = 1;
  // 점 몇 개를 옮겨 보고 랩타임이 줄면 받아들임.  pts = [[점, 옮길 양]]
  const tryMove = pts => {
    const y = new Map(); pts.forEach(([i, d]) => { const v = Math.max(lo[i], Math.min(hi[i], e[i] + d)); if (v !== e[i]) y.set(i, v); });
    if (!y.size) return false;
    const js = new Set(); y.forEach((_, i) => { for (let j = i - 2; j <= i + 1; j++) { const q = cyc ? ((j % M) + M) % M : j; if (q >= 0 && q < M) js.add(q); } });
    const X = i => y.has(i) ? y.get(i) : e[i];
    const J = [...js], nl = [], nk = []; J.forEach(j => { const [l, k] = piece(X, j); nl.push(l); nk.push(Math.abs(k) > 1e-5 ? k : 0); });
    if (geo.bk) for (const i of y.keys()) { const [bL, bR] = geo.bk(nodeK(X, i)), v = X(i);   // 옮긴 점의 새 곡률에서 차 여유로 경계 확인
      if ((v > geo.wlN[i] - bL + 1e-9 && v > e[i]) || (v < -(geo.wrN[i] - bR) - 1e-9 && v < e[i])) return false; }
    for (const i of y.keys()) for (let d = -1; d <= 1; d++) { const p = cyc ? W(i + d) : i + d; if (!cyc && (p <= 0 || p >= n - 1)) continue;
      const kNew = Math.abs(nodeK(X, p)); if (kNew > kLim * (1 + 1e-6) && kNew > Math.abs(nodeK(i => e[i], p)) + 1e-12) return false; }   // 뾰족한 꺾임을 만드는 옮김은 버림
    if (geo.kmax) for (let q = 0; q < J.length; q++) { const ko = Math.abs(mdl.K[J[q]]), kn = Math.abs(nk[q]);
      if (kn > geo.kmax * (1 + 1e-6) && kn > ko + 1e-12) return false; }   // 최소 회전 반경보다 급하게 만드는 옮김은 버림
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
  res.gain = t0 - mdl.T; res.evals = evals; res.ctight = RL.ctight || 0;
  return res;
}

// 진행 막대 (작업창 Worker 안에서만): 주행선 다듬기가 [0, PG0), 나머지 계산이 [PG0, 1]
let PG0 = 0;
const prog = (f, msg) => { if (typeof wbProg === 'function') wbProg(f, msg); };
let RLI = {}, RLI_LAST = {};   // 다듬은 주행선: 이번 계산 (코스별) · 마지막 전체 계산 (입력 훑기용)
const rlKey = I => JSON.stringify(I, (k, v) => ['course', 'lap', 'grMode', '_sweep', '_probe'].includes(k) ? undefined : v);
// 이번 입력으로 내구 · 오토크로스 · 내 코스 주행선을 다듬어 둠 (차량 · 감속비 = 입력 감속비, 같은 입력이면 다시 안 함)
function prepLines(I, sweep) {
  RLI = {}; PG0 = 0;
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
  PG0 = jobs.length / (jobs.length + 1);
  RLI = RLI_LAST = out;
}

// 코스 구간 → 실제로 달리는 구간 (I.rl_on = 1 이면 최소 곡률 주행선, 2 면 그것을 랩타임으로 다듬은 선, 0 이면 가운데 선)
function drivenSegs(I, which, segs, closed, fx) {
  if (!(I.rl_on > 0) || !segs.length) return { segs, e: null, len: sum(segs.map(r => r[0])) };
  if (I.rl_on >= 2 && RLI[which]) return RLI[which];
  const E = I.end || {}, b = rlB(I);
  if (which === 'end' || which === 'ax') {
    const N = segs.length, wl = E.WL || [], wr = E.WR || [], rev = which === 'ax';
    const W = (arr, i) => arr.length ? (arr[i] + arr[(i + 1) % arr.length]) / 2 : 1.75;
    const o = { closed: true, b, bk: bodyBk(I), kmax: rkMax(I), key: \`\${which}|\${b}|\${bodyKey(I)}|\${rkMax(I)}|\${JSON.stringify(segs)}|\${JSON.stringify(E.slalom || [])}|\${JSON.stringify(E.slat || [])}|\${JSON.stringify(E.sds || [])}|\${JSON.stringify(wl)}|\${JSON.stringify(wr)}\`,
      wl: i => rev ? W(wr, N - 1 - i) : W(wl, i), wr: i => rev ? W(wl, N - 1 - i) : W(wr, i),
      cones: (E.slalom || []).map(j => rev ? (N - j) % N : j),
      coneLat: new Map((E.slalom || []).map((j, q) => [rev ? (N - j) % N : j, (rev ? -1 : 1) * ((E.slat || [])[q] || 0)])),
      coneDs: new Map((E.slalom || []).map((j, q) => [rev ? (N - j) % N : j, (rev ? -1 : 1) * ((E.sds || [])[q] || 0)])) };   // 콘이 점에서 앞뒤로 떨어진 거리 (거꾸로면 부호 반대)   // 슬라럼 콘의 옆 거리 (가운데 선에서, 거꾸로면 부호 반대)   // 거꾸로 달리면 왼쪽 · 오른쪽 폭이 바뀌고, 점 j = 거꾸로 구간 N − j 의 시작
    return racingLine(segs, o);
  }
  // 내 코스: 구간마다 폭 (fx 없으면 [내 코스 폭] 을 양쪽 같게) · 슬라럼 콘 묶음
  const w = FREE_W, X = fx || { wl: [], wr: [], groups: [] };
  return racingLine(segs, { closed, b, bk: bodyBk(I), kmax: rkMax(I), wl: i => X.wl[i] != null ? X.wl[i] : w, wr: i => X.wr[i] != null ? X.wr[i] : w, groups: X.groups,
                            key: \`free|\${b}|\${bodyKey(I)}|\${rkMax(I)}|\${w}|\${closed}|\${JSON.stringify(segs)}|\${JSON.stringify(X)}\` });
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
//   T0 = 출발 온도 {m, w, b} (모터 · 냉각수 · 축전지, 숫자면 모터만) [°C]
const th0 = (C, T0) => T0 == null ? { ...C.TH0 } : typeof T0 === 'number' ? { ...C.TH0, m: T0 } : { ...T0 };
function walk(C, G, v, V0, rec, T0) {
  const t0 = th0(C, T0), N = v.length, tc = [0], et = [0], ec = [0], tm = [t0.m], ti = [t0.i], tw = [t0.w], tb = [t0.b];
  let qm = 0, qi = 0, qb = 0, tq = 0;   // 손실 · 발열 시간 적분 [J] (도구 9 냉각 계통 계산기에 넘길 평균 발열), 그 시간 [s]
  const S = rec ? { pw: [], ax: [], ay: [], rpm: [], tq: [], tlim: [], pbat: [], vbat: [], voc: [], eta: [], tmot: [], grip: [],
                    roll: [], tcool: [], tbat: [], tinv: [], fz_fl: [], fz_fr: [], fz_rl: [], fz_rr: [], af: [], ar: [], beta: [], sw: [], dw: [], sat: [] } : null;
  let vmin = Infinity;
  for (let i = 0; i < N - 1; i++) {
    const ds = G.s[i + 1] - G.s[i], vm = (v[i] + v[i + 1]) / 2, dt = vm > 0 ? ds / vm : Infinity;
    const ax = (v[i + 1] * v[i + 1] - v[i] * v[i]) / (2 * ds);   // 종가속도 [m/s²]
    const F = C.meff * ax + C.Fres(vm);                            // 바퀴 힘 [N] (제동 중 −)
    const E = C.elec(F, vm, V0[i], C.rS(tb[i]));
    tc.push(tc[i] + dt);
    et.push(et[i] + E.P * dt);
    ec.push(ec[i] + V0[i] * E.I * dt);
    const st = C.thStep({ m: tm[i], i: ti[i], w: tw[i], b: tb[i] }, E.L, E.Li, E.I, vm, isFinite(dt) ? dt : 0);   // 온도: 손실로 오르고 냉각으로 내림
    tm.push(st.m); ti.push(st.i); tw.push(st.w); tb.push(st.b);
    if (isFinite(dt)) { qm += E.L * dt; qi += E.Li * dt; qb += E.I * E.I * C.Rb * C.rS(tb[i]) * dt; tq += dt; }
    if (E.V < vmin) vmin = E.V;
    if (rec) {
      const ays = vm * vm * G.k[i], ay = Math.abs(ays);           // 횡가속도 [m/s²] (왼쪽 선회 +, ISO 8855) · 크기
      const [fo, fi] = C.wheels(C.Fzf(vm, ax), C.dF(ay, true)), [ro, ri] = C.wheels(C.Fzr(vm, ax), C.dF(ay, false));
      const lft = ays > 0;                                         // 왼쪽 선회 → 오른쪽 바퀴가 바깥
      S.pw.push(F * vm / 1000);        // 바퀴 출력 [kW]
      S.ax.push(ax / g);               // [g]
      S.ay.push(ays / g);              // [g] (왼쪽 +)
      S.roll.push(C.rollAng(ays));     // 롤각 [°] (모델 단계 1, 왼쪽 선회 +)
      S.rpm.push(C.rpm(v[i]));         // [rpm]
      S.tq.push(E.T);                  // [N·m]
      S.tlim.push(C.Tcurve(C.rpm(v[i]), V0[i], tm[i]));   // 그 순간 토크 한계 (디레이팅 포함) [N·m]
      S.tmot.push(C.thOn ? tm[i] : NaN);   // 모터 온도 [°C] (모터 열 켬)
      S.tcool.push(C.cwOn ? tw[i] : NaN);   // 냉각수 온도 [°C] (냉각수 계통 켬)
      S.tbat.push(C.btOn ? tb[i] : NaN);    // 축전지 온도 [°C] (축전지 온도 켬)
      S.tinv.push(C.inOn ? ti[i] : NaN);    // 인버터 온도 [°C] (인버터 온도 켬)
      S.voc.push(V0[i]);               // 개방 전압 [V] (구동력 선도 프로브용)
      S.pbat.push(E.P / 1000);         // 단자 출력 [kW]
      S.vbat.push(E.V);                // 단자 전압 [V]
      S.eta.push(E.P > 0 ? E.e * 100 : NaN);   // [%]
      S.grip.push(Math.hypot(C.m * ax, C.m * ay) / Math.max(1e-9, C.capF(vm, ax, ay) + C.capR(vm, ax, ay)) * 100);   // [%]
      S.fz_fl.push(lft ? fi : fo); S.fz_fr.push(lft ? fo : fi); S.fz_rl.push(lft ? ri : ro); S.fz_rr.push(lft ? ro : ri);   // 바퀴 하중 [N] 앞왼 · 앞오 · 뒤왼 · 뒤오
      if (C.md2) { const sg = ays >= 0 ? 1 : -1, K = Math.abs(G.k[i]), F = C.slipA(fo, fi, C.m * ay * C.fs), Rr = C.slipA(ro, ri, C.m * ay * (1 - C.fs));   // 모델 2: 슬립각 · β · 조향각
        const be = K * C.L * C.fs - Rr.a * Math.PI / 180, dl = K * C.L + (F.a - Rr.a) * Math.PI / 180;
        S.af.push(sg * F.a); S.ar.push(sg * Rr.a); S.beta.push(sg * be * 180 / Math.PI); S.dw.push(sg * dl * 180 / Math.PI); S.sw.push(sg * dl * 180 / Math.PI * C.sr); S.sat.push(F.sat || Rr.sat ? 1 : 0); }
      else { S.af.push(NaN); S.ar.push(NaN); S.beta.push(NaN); S.dw.push(NaN); S.sw.push(NaN); S.sat.push(0); }
    }
  }
  if (rec) for (const k in S) S[k].push(S[k][S[k].length - 1]);
  return { tc, et, ec, tm, ti, tw, tb, S, vmin, Q: { m: qm, i: qi, b: qb, t: tq }, T1: { m: tm.at(-1), i: ti.at(-1), w: tw.at(-1), b: tb.at(-1) } };
}

// 랩 m개를 이어서 정지 출발.  랩마다 SOC → 개방 전압, 칸마다 모터 온도 (두 번: 처음은 출발 값 그대로, 다음은 앞 계산으로 고침)
//   fixedV 를 주면 전압 고정 (SOC 계산 안 함, 줄여 셈).  T0 = 출발 모터 온도 [°C]
function laps(C, segs, m, ds, soc0, fixedV, T0) {
  const P = grid(segs, ds).s.length - 1, rep = [];
  for (let j = 0; j < m; j++) rep.push(...segs);
  const G = grid(rep, ds), N = G.s.length, t0 = th0(C, T0);
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
  return { G, v: sp.v, lim: sp.lim, V0, TM: W.tm, TI: W.ti, TW: W.tw, TB: W.tb, T0: t0, P, t, Et, Ec, socs, vmin: W.vmin, soc1, T1: W.T1, Q: W.Q, len: G.s.at(-1) };
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
  return { G, v: sp.v, lim: sp.lim, V0: V, TM: W.tm, TI: W.ti, TW: W.tw, TB: W.tb, T0: { ...C.TH0 }, P: G.s.length - 1, t: [W.tc.at(-1)], Et: [W.et.at(-1)], Ec: [Ec], socs: [1],
           soc1: 1 - Ec / C.Epack, T1: W.T1 };
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
    const Q = { m: A.Q.m + B.Q.m, i: A.Q.i + B.Q.i, b: A.Q.b + B.Q.b, t: A.Q.t + B.Q.t, s: A.len + B.len };   // 내구 전체 손실 · 발열 적분 [J], 시간 [s], 거리 [m]
    return { T: sum(t), Et: sum(et), Ec: sum(ec), A, B, n, n1, t, et, ec, soc: [...A.socs, ...B.socs], soc1: B.soc1, vmin: Math.min(A.vmin, B.vmin), Q };
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
//   구간마다 폭 (빈칸 = 윗줄 값, 첫 줄도 비면 1.75 m = 전체 3.5 m), 슬라럼 콘 간격이 있는 구간은 콘 자리에서 쪼갬 (첫 콘 = 시작 + 간격 ÷ 2)
//   조각 = [길이, 반경, 왼쪽 폭, 오른쪽 폭, 시작에 콘 (1/0), 원래 행 번호]
const FREE_W = 1.75;   // 폭을 하나도 안 적은 내 코스: 가운데 선에서 양쪽 1.75 m [m]
function freeSegs(I) {
  const F = I.free || {}, seg = F.seg || [], hw = FREE_W;
  let wl = hw, wr = hw;
  const items = [];
  seg.forEach(([l, R], k) => {
    const a = F.wl && F.wl[k], b = F.wr && F.wr[k], d = F.sl && F.sl[k];
    if (a != null && a >= 0) wl = a;
    if (b != null && b >= 0) wr = b;
    if (!(l > 0)) return;
    const cut = [0];
    if (d > 0) for (let p = d / 2; p < l - 1e-6; p += d) cut.push(p);
    cut.push(l);
    for (let j = 0; j + 1 < cut.length; j++) items.push([cut[j + 1] - cut[j], R, wl, wr, j > 0 ? 1 : 0, k]);
  });
  if (!items.length) return null;
  const m = Math.max(1, Math.round(F.laps || 1)), s0 = F.s0 || 0;
  const closed = F.closed != null ? F.closed !== false : (m > 1 || s0 > 0);
  const it = closed ? rotate(items, s0) : items;
  const sg = it.map(r => [r[0], r[1]]);
  // 콘 묶음: 같은 행에서 나온 콘이 이어져 있으면 한 묶음 (묶음 안에서 번갈아 비켜 감)
  const groups = []; let last = -1;
  it.forEach((r, i) => { if (!r[4]) return; const g = groups[groups.length - 1]; if (g && r[5] === last) g.push(i); else groups.push([i]); last = r[5]; });
  const D = drivenSegs(I, 'free', sg, closed, { wl: it.map(r => r[2]), wr: it.map(r => r[3]), groups });
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

// 스키드패드 횡가속도 [g]: 기록 바퀴 (오른쪽 · 왼쪽 일정 반경 한 바퀴씩) 의 시간 평균 — 진입 · 탈출은 넣지 않음
const skidAy = E => (E.vR * E.vR * E.tR + E.vL * E.vL * E.tL) / (E.tR + E.tL) / SK_R / g;
// 가속: 최대 종가속도 [g] (칸마다 (v₂² − v₁²) ÷ 2Δs)
const accMax = A => { let a = 0; for (let i = 0; i + 1 < A.v.length; i++) a = Math.max(a, (A.v[i + 1] ** 2 - A.v[i] ** 2) / (2 * (A.G.s[i + 1] - A.G.s[i]))); return a / g; };

// 종목 기록 한 벌 (감속비 gr).  fast = 줄여 셈 (감속비 찾기 · 입력 훑기)
//   스키드패드 기록 = 오른쪽 한 바퀴 + 왼쪽 한 바퀴 [s]
function events(I, gr, fast) {
  const ds = fast ? 3 : 1, C = car(I, gr, 1);
  const vR = skidV(C, -SK_R, C.Voc(1)), vL = skidV(C, SK_R, C.Voc(1));
  const X = runAx(I, C, ds), EN = runEnd(I, gr, !fast);
  const A = runAcc(C);
  return { C, acc: A.t[0], A, skid: SK_C / vR + SK_C / vL, tR: SK_C / vR, tL: SK_C / vL, vs: Math.min(vR, vL), vR, vL,
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
function bestGr(I, pg) {
  const memo = new Map();
  const ev = gg => { gg = Math.round(gg * 100) / 100; if (!memo.has(gg)) { memo.set(gg, events(I, gg, true)); if (pg) pg(Math.min(1, memo.size / 30)); } return memo.get(gg); };   // 감속비 약 30 개를 훑음
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
    vmax: C.vtop * 3.6, v_top: E.X ? Math.max(...E.X.v) * 3.6 : NaN,
    v_endtop: EN ? Math.max(...EN.A.v, ...EN.B.v) * 3.6 : NaN,                                       // 내구 최고 차속 [km/h]
    ay_skid: skidAy(E),                                                                               // 기록 바퀴 평균 [g]
    ax_0: C.aDrive(0, 0, 0, C.Voc(1), C.Tinit) / g, ax_max: accMax(E.A),                              // 가속: 출발 · 최대 종가속도 [g]
    cla_req: claNeed(I, G2), skid_roll: C.rollAng(skidAy(E) * g),
    // 내구 (대시보드 반영 · 검증용)
    e_ok: EN ? (EN.Ec <= C.Ecap * 1.01 ? 1 : 0) : NaN, e_use: EN ? EN.Ec / 3.6e6 : NaN, p_lim: EN ? EN.k * 100 : NaN,
    e_lap: EN ? lapStat(EN.et, [0, EN.n1]).avg / 3.6e6 : NaN,
    // 내구 평균 발열 · 차속 (도구 9 냉각 계통 계산기 입력): 손실 시간 적분 ÷ 주행 시간 [W], 거리 ÷ 시간 [km/h], 방열량 목표 = 모터 + 인버터 [kW]
    ...(() => { const Q = EN && EN.Q; if (!Q || !(Q.t > 0)) return { q_mot: NaN, q_inv: NaN, q_bat: NaN, v_end_avg: NaN, q_cool: NaN };
                return { q_mot: Q.m / Q.t, q_inv: Q.i / Q.t, q_bat: Q.b / Q.t, v_end_avg: Q.s / Q.t * 3.6, q_cool: (Q.m + Q.i) / Q.t / 1000 }; })(),
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
  let G, v, lim, V0, TM, TI, TW, TB, from = 0, to, P, n;
  if (K.EN) {
    const A = K.EN.A, B = K.EN.B, off = A.G.s.at(-1);
    G   = { s: [...A.G.s, ...B.G.s.slice(1).map(x => x + off)], k: [...A.G.k, ...B.G.k] };
    v   = [...A.v, ...B.v.slice(1)];
    lim = [...A.lim, ...B.lim.slice(1)];
    V0  = [...A.V0, ...B.V0.slice(1)];
    TM  = [...A.TM, ...B.TM.slice(1)];
    TW  = [...A.TW, ...B.TW.slice(1)];
    TB  = [...A.TB, ...B.TB.slice(1)];
    TI  = [...A.TI, ...B.TI.slice(1)];
    P = A.P; n = K.EN.n;
  } else {
    ({ G, v, lim, V0, TM, TI, TW, TB, P } = K.L); n = K.L.t.length;
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
    // 최소 회전 반경보다 급한 조각: 가운데 선 거리 [시작, 끝] (코스 원래 방향)
    const rmE = I.rm_on !== 0 && I.rmin > 0 ? I.rmin : 0, iv = [];
    if (rmE) RL.segs.forEach(([, R], j) => { if (R && Math.abs(R) < rmE * (1 - 1e-3)) iv.push([RL.sN[j], RL.sN[j + 1]]); });
    map.rbad = c === 'ax' ? iv.map(([a, b]) => [Lc - b, Lc - a]) : iv;
  }

  const sl = a => a.slice(from, to + 1);
  const Gs = { s: sl(G.s).map(x => x - G.s[from]), k: G.k.slice(from, to) }, vv = sl(v);
  const W  = walk(K.C, Gs, vv, sl(V0), true, { m: TM[from], i: TI[from], w: TW[from], b: TB[from] });

  // ---------- 고른 코스 결과 (볼 랩)
  const lt = K.EN ? K.EN.t : K.L.t, le = K.EN ? K.EN.et : K.L.Et, lc = K.EN ? K.EN.ec : K.L.Ec, soc = K.EN ? K.EN.soc : K.L.socs;
  const ls = lapStat(lt, K.stand), jj = I.lap !== 'all' && lt.length > 1 ? j : -1;
  const pick = a => jj >= 0 ? a[jj] : sum(a);
  const socEnd = K.EN ? K.EN.soc1 : (K.L.soc1 != null ? K.L.soc1 : NaN);
  Object.assign(out, {
    c_gr: G3, c_n: lt.length, c_lap: jj + 1, c_len: RL ? RL.len : NaN, c_ltot: RL ? RL.len * lt.length : NaN, c_rl: RL && RL.eN ? (RL.gain != null ? 2 : 1) : 0, c_rlg: RL && RL.gain != null ? RL.gain : NaN, c_rlb: rlB(I),   // 한 랩 · 총 거리 [m]
    ...(() => { const rmE = I.rm_on !== 0 ? I.rmin : 0, T = RL ? rTight(RL.segs, rmE) : c === 'skid' ? rTight([[1, 9.125]], rmE) : { r: Infinity, bad: 0 };
                const bk = bodyBk(I), bb = bk && isFinite(T.r) ? bk(1 / T.r) : [NaN, NaN];
                return { c_rmn: isFinite(T.r) ? T.r : NaN, c_rbad: T.bad, c_ctight: RL && RL.ctight ? RL.ctight : 0,
                         c_bo: Math.max(bb[0], bb[1]), c_bi: Math.min(bb[0], bb[1]) }; })(),   // 가장 급한 곳에서 차 바깥 · 안쪽 여유 [m] (전폭이 있을 때)   // c_ctight = 여유를 못 지킨 콘 수                       // 달리는 선 가장 작은 반경 · 최소 회전 반경보다 급한 길이 [m]
    // 차량 모델 2: 보는 랩의 최대 슬립각 · 차체 각도 · 조향각, 포화 점 수, 최대 조향각을 넘는 거리 [m]
    ...(() => { const S = W.S, M = a => a.length && a.some(Number.isFinite) ? Math.max(...a.filter(Number.isFinite).map(Math.abs)) : NaN; if (!K.C.md2) return { c_afmax: NaN, c_armax: NaN, c_bmax: NaN, c_swmax: NaN, c_dwmax: NaN, c_satn: NaN, c_dbad: NaN };
                let bad = 0; if (I.delta_max > 0) for (let i = 0; i < S.dw.length; i++) if (Math.abs(S.dw[i]) > I.delta_max) bad += Gs.s[i + 1] - Gs.s[i];
                return { c_afmax: M(S.af), c_armax: M(S.ar), c_bmax: M(S.beta), c_swmax: M(S.sw), c_dwmax: M(S.dw), c_satn: S.sat.reduce((a, b) => a + b, 0), c_dbad: I.delta_max > 0 ? bad : NaN }; })(),
    c_t: c === 'skid' ? E.skid : lt.length > 1 ? (jj >= 0 ? lt[jj] : ls.total) : lt[0],
    c_t1: ls.first, c_tavg: ls.avg, c_ttot: ls.total,
    c_vtop: Math.max(...vv) * 3.6,
    c_rpm: Math.max(...W.S.rpm), c_tq: Math.max(...W.S.tq), c_pbat: Math.max(...W.S.pbat), c_vmin: Math.min(...W.S.vbat),
    c_tm: K.C.thOn ? W.tm.at(-1) : NaN, c_tmax: K.C.thOn ? Math.max(...W.tm) : NaN,
    c_tw: K.C.cwOn ? W.tw.at(-1) : NaN, c_twmax: K.C.cwOn ? Math.max(...W.tw) : NaN,       // 냉각수 끝 · 최고 [°C]
    c_tb: K.C.btOn ? W.tb.at(-1) : NaN, c_tbmax: K.C.btOn ? Math.max(...W.tb) : NaN,       // 축전지 끝 · 최고 [°C]
    c_ti: K.C.inOn ? W.ti.at(-1) : NaN, c_timax: K.C.inOn ? Math.max(...W.ti) : NaN,       // 인버터 끝 · 최고 [°C]
    // 도구 9 냉각 계통 계산기로 넘기는 값: 보는 랩(또는 전체)의 평균 모터 손실 · 인버터 손실 · 축전지 발열 [W], 평균 차속 [km/h], 그 시간 [s]
    c_qm: W.Q.t > 0 ? W.Q.m / W.Q.t : NaN, c_qi: W.Q.t > 0 ? W.Q.i / W.Q.t : NaN, c_qb: W.Q.t > 0 ? W.Q.b / W.Q.t : NaN,
    c_vavg: W.Q.t > 0 ? Gs.s.at(-1) / W.Q.t * 3.6 : NaN, c_trun: W.Q.t,
    c_et: pick(le) / 3.6e6, c_ec: pick(lc) / 3.6e6,
    // 에너지 카드 (모든 코스 같은 줄): 그 코스 전체 랩 합 · 출력 상한 없이 (내구 말고는 상한이 없어 전체와 같음) [kWh]
    c_all_t: sum(le) / 3.6e6, c_all_c: sum(lc) / 3.6e6,
    c_nl_t: c === 'end' ? out.e_nl_t : sum(le) / 3.6e6, c_nl_c: c === 'end' ? out.e_nl_c : sum(lc) / 3.6e6,
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
  // 그 점의 앞축: 필요한 횡력 · 낼 수 있는 힘 (차속은 그래프의 프로브 차속을 UI 가 고름)
  const front = VV.map(x => ({ need: C.m * ay * C.fs, cap: C.capF(x, ax, ay) }));
  const cap = 1.3 * Math.max(...f_mt);                    // 출력 상한 곡선은 저속에서 무한대로 커지므로 토크 곡선의 1.3배에서 자름
  return { v: VV.map(x => x * 3.6), f_mt, f_mp: f_mp.map(f => f > cap ? NaN : f),
           f_m: VV.map(x => C.drive(x, V, Tm).F),
           f_x: VV.map(x => Math.sqrt(Math.max(0, C.capR(x, ax, ay) ** 2 - Fyr * Fyr))),
           f_b, f_res: VV.map(C.Fres), meff: C.meff, fy_need: front.map(f => f.need), fy_cap: front.map(f => f.cap) };
}


// ================================================================ 계산
// ================================================================ 차량 모델 3: 계단 조향 과도 응답 (ISO 7401 꼴, 일정 차속)
//   선형 3 자유도 (옆 속도 v_y, 요레이트 r, 롤 φ — Segel 꼴, 롤 축 둘레) + 타이어 이완 (1 차 지연):
//     m (v̇_y + V r) − m_s h′ φ̈ = F_f + F_r,   I_zz ṙ = a F_f − b F_r,   I_xx φ̈ − m_s h′ (v̇_y + V r) = (m_s g h′ − K_φ) φ − C_φ φ̇
//     α_f = δ − (v_y + a r) ÷ V,  α_r = −(v_y − b r) ÷ V,   Ḟ = (V ÷ σ)(C_α α − F)  (σ → 0 이면 F = C_α α)
//   C_α = 축 (두 바퀴) 코너링 강성 (정지 하중), a · b = 무게중심에서 앞 · 뒤 축, h′ = 무게중심 − 롤 축 높이, m_s = 현가상질량
//   조향: 0.1 s 에서 0.1 s 동안 바퀴 각 δ 까지 (정상 횡가속도가 ay_test 가 되는 δ = ay (L + K V²) ÷ V², K = m (b/C_f − a/C_r) ÷ L)
//   해석해 (롤 · 이완 없이 2 자유도): 정상 요레이트 이득 r/δ = V ÷ (L + K V²),  ω_n² = (C_f C_r L² ÷ (m I_zz V²)) (1 + K V² ÷ L),  2 ζ ω_n = (C_f + C_r) ÷ (m V) + (a² C_f + b² C_r) ÷ (I_zz V)
//   롤 정상각 φ = m_s h′ a_y ÷ (K_φ − m_s g h′)
function stepSteer(I, C) {
  const m = I.m, L = C.L, a = L * (1 - C.fs), b = L * C.fs, V = Math.max(1, (I.v_test || 60) / 3.6), Dg = Math.PI / 180;
  const Cf = 2 * C.Ca(m * g * C.fs / 2), Cr = 2 * C.Ca(m * g * (1 - C.fs) / 2), Iz = Math.max(1, I.izz || 70), Ix = Math.max(0.1, I.ixx || 30);
  const ms = Math.max(1, m - 2 * (I.m_us_f || 0) - 2 * (I.m_us_r || 0)), hp = C.h - C.hra, Kp = (I.k_roll || 0) / Dg, Cp = (I.c_roll || 0) / Dg, sig = Math.max(0, I.tire_relax || 0);
  const K = m * (b / Cf - a / Cr) / L, ayT = (I.ay_test || 0.4) * g, del = ayT * (L + K * V * V) / (V * V);
  const wn = Math.sqrt(Math.max(0, Cf * Cr * L * L / (m * Iz * V * V) * (1 + K * V * V / L))), ze = ((Cf + Cr) / (m * V) + (a * a * Cf + b * b * Cr) / (Iz * V)) / (2 * wn);
  const dl = t => t < 0.1 ? 0 : t < 0.2 ? del * (t - 0.1) / 0.1 : del;
  const det = m * Ix - (ms * hp) ** 2;
  const f = (t, x) => { const [vy, r, ph, pd, Ff, Fr] = x, af = dl(t) - (vy + a * r) / V, ar = -(vy - b * r) / V;
    const Ffe = sig > 1e-6 ? Ff : Cf * af, Fre = sig > 1e-6 ? Fr : Cr * ar, Fy = Ffe + Fre, M = (ms * g * hp - Kp) * ph - Cp * pd;
    const u = (Fy * Ix + ms * hp * M) / det, pdd = (m * M + ms * hp * Fy) / det;
    return [u - V * r, (a * Ffe - b * Fre) / Iz, pd, pdd, sig > 1e-6 ? V / sig * (Cf * af - Ff) : 0, sig > 1e-6 ? V / sig * (Cr * ar - Fr) : 0, u]; };
  const h = 0.0005, T = 3, n = Math.round(T / h), S = { t: [], r: [], ay: [], beta: [], phi: [], sw: [] };
  let x = [0, 0, 0, 0, 0, 0], ay = 0;
  for (let k = 0; k <= n; k++) { const t = k * h;
    if (k % 10 === 0) { const d = f(t, x); ay = d[6]; S.t.push(t); S.r.push(x[1] / Dg); S.ay.push(ay / g); S.beta.push(Math.atan2(x[0], V) / Dg); S.phi.push(x[2] / Dg); S.sw.push(dl(t) / Dg * C.sr); }
    if (k === n) break;
    const k1 = f(t, x), k2 = f(t + h / 2, x.map((v, i) => v + h / 2 * k1[i])), k3 = f(t + h / 2, x.map((v, i) => v + h / 2 * k2[i])), k4 = f(t + h, x.map((v, i) => v + h * k3[i]));
    x = x.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); }
  const rss = del * V / (L + K * V * V), rEnd = x[1], pk = Math.max(...S.r) * Dg;
  let t50 = NaN, t90 = NaN; for (let i = 0; i < S.t.length; i++) { if (!isFinite(t50) && S.sw[i] >= 0.5 * del / Dg * C.sr) t50 = S.t[i]; if (!isFinite(t90) && S.r[i] * Dg >= 0.9 * rss) { t90 = S.t[i]; break; } }
  const out = { tr_v: V * 3.6, tr_del: del / Dg, tr_sw: del / Dg * C.sr, tr_rss: rss / Dg, tr_r: rEnd / Dg, tr_gain: rss / del, tr_ay: S.ay.at(-1), tr_os: (pk / rss - 1) * 100,
                tr_t90: t90 - t50, tr_wn: wn / (2 * Math.PI), tr_zeta: ze, tr_beta: S.beta.at(-1), tr_phi: S.phi.at(-1),
                tr_phis: Kp - ms * g * hp > 0 ? ms * hp * ayT / (Kp - ms * g * hp) / Dg : NaN, tr_kus: K * g / Dg };   // tr_kus = 2 자유도 언더스티어 구배 [deg/g] (축 코너링 강성)
  return { out, s: S };
}

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
                    p_lim: E.EN ? E.EN.k * 100 : NaN, vmax: E.C.vtop * 3.6, ay_skid: skidAy(E) } };
  }

  // ---------- 주행선 다듬기 (I.rl_on = 2): 입력이 바뀌었을 때만
  prog(0, '준비 중');                                   // 진행 막대를 바로 숫자로 (흐르는 막대로 바뀌지 않게)
  prepLines(I, false);

  // ---------- 진행: 남은 [PG0, 1] 을 감속비 훑기 60 % · 가장 빠른 감속비 내구 10 % · 두 모드 20 % · 내 코스 10 % 로
  const P = (a, msg) => prog(PG0 + (1 - PG0) * a, msg);
  P(0, '감속비 훑는 중');
  // ---------- 감속비 (두 모드 공통): 종목별 가장 빠른 값 · 배점 가중 제안, 그 감속비에서 다 계산한 기록
  const B = bestGr(I, f => P(0.6 * f, '감속비 훑는 중'));
  P(0.6, '기록 계산 중');
  const ENb  = runEnd(I, B.end, true);                   // 내구가 가장 빠른 감속비에서 다 계산
  const endb = ENb ? lapStat(ENb.t, [0, ENb.n1]) : null;
  const fast = {
    acc: runAcc(car(I, B.acc, 1)).t[0],
    ax:  (runAx(I, car(I, B.ax, 1), 1) || { t: [NaN] }).t[0],
    end: ENb ? ENb.T : NaN,
  };
  const BF = I.course === 'free' ? bestGrFree(I) : NaN;   // 내 코스: 최적 모드에서 고른 코스 감속비

  // ---------- 두 모드를 미리 계산 (전환은 다시 계산 없이)
  P(0.7, '기록 계산 중 · 내 감속비');
  const my = modeRun(I, I.gr, I.gr, fast);
  P(0.8, '기록 계산 중 · 최적 감속비');
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
  if (C.md2) common.k_us_lin = C.kUs;                                                     // 모델 2 이상: 선형 언더스티어 구배 [deg/g]
  const TR = I.md === 3 ? stepSteer(I, C) : null;                                        // 모델 3: 계단 조향 과도 응답 (감속비와 상관없음)
  if (TR) Object.assign(common, TR.out);
  Object.assign(my.out, common); Object.assign(opt.out, common);
  if (TR) { my.tr = TR.s; opt.tr = TR.s; }

  // ---------- 내 코스 (검증 · 대시보드용, 입력 감속비)
  P(0.9, '기록 계산 중 · 내 코스');
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
  P(1, '마무리');
  return { ...cur, modes: { my, opt }, motor, ft };
}
`
};

/* ============================================================ 대시보드 '파트별 > 차량 목표 · 파워트레인'
   대시보드 값으로 도구 2를 돌린 결과 (읽기 전용, 내 감속비 = 대시보드 감속비) */
const T2P = { R:null, key:'', busy:false, w:null };
const T2ONLY = ['v_ref', 'ke_ratio', 'eta_mot', 'eta_inv', 'c_vmax', 'c_vmin', 'c_vnom', 'c_ah', 'th_k', 'th_t0', 'th_c', 'th_r', 'th_cool', 'th_init', 'rl_on', 'w_car', 'oh_f', 'oh_r', 'rl_m', 'rl_b', 'e_lim', 'rm_on', 'md', 'th_on', 'cw_on', 'in_on', 'm_cool', 'i_cool', 'b_cool', 'eff_mg', 'inv_r', 'm_ha0', 'm_ha60', 'i_c', 'i_r', 'i_ha0', 'i_ha60', 'b_ha60', 'b_r', 'bt_on', 't_amb', 'cw_c', 'ua0', 'ua60', 'b_c', 'b_ha', 'b_t0', 'b_alpha', 'h_rcf', 'h_rcr', 'k_roll'];   // 대시보드에 없는 입력: 도구에 저장된 값을 씀
const T2SET = ['md', 'th_on', 'in_on', 'bt_on', 'cw_on', 'm_cool', 'i_cool', 'b_cool', 'eff_mg', 'rl_on', 'rm_on', 'e_lim'];   // 이 도구에서 고른 계산 설정 (대시보드 파트 결과도 같은 설정으로)
const T2GOAL = ['t_acc', 't_skid', 't_ax', 't_end'];                                                    // 목표 기록 (대시보드 '차량 목표')
function t2PartInputs(){ const I = {}; WB_TOOLS['2'].inputs.forEach(d => { const db = wbDash(d.dk); I[d.k] = db ? db.v : d.v; });
  T2GOAL.forEach(k => { const db = wbDash(k); I[k] = db ? db.v : 0; });
  try{ const s = JSON.parse(localStorage.getItem(wbStoreKey('2')) || '{}') || {}; [...T2ONLY, ...T2SET].forEach(k => { if(typeof s[k]==='number' && isFinite(s[k])) I[k] = s[k]; }); }catch(e){}
  return {...I, ...t2ExtraI(), course:'acc', lap:'1', grMode:'my'}; }   // 모델 단계 · 열 모델 켜고 끔은 이 도구에서 고른 설정 그대로 (화면 결과와 같은 기준)
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
