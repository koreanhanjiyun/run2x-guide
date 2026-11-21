/* ============================================================
   도구 2P — 랩타임 시뮬레이터 (QSS, 감속비 고르기 포함) · docs/TOOLS-PLAN.md 5절 · docs/HANDOFF.md 4-2절
   - 코스: 내 코스(사용자가 만든 코스) · 오토크로스 · 내구레이스 · 가속 · 스키드패드 (공식 4개는 고칠 수 없는 기본 코스)
     공식 내구 코스 = js/data/fsk2026-course.js (FSK26), 모터 기본값 = js/data/emrax228.js (EMRAX228)
   - 차량 모델: 점질량 준정적 + 앞뒤 · 좌우 하중 이동 + 타이어 하중 감도(직선 또는 맵) + 뒤축 구동,
     모터 곡선(전압 보정) · 열(1점 모델) · 디레이팅, 효율(상수 또는 맵), 축전지(내부저항 · SOC)
   - 탭: [시뮬레이션] 결과 · 구동력 선도(프로브) · 코스 지도(확대 · 프로브) · 신호 그래프 / [편집] 코스 · 차량 제원 · 타이어 · 에어로 · 모터 · 인버터 · 구동계 · 축전지 (상수 + 표), · 모터 · 효율 · 타이어 표
   - 결과: [내 감속비 | 최적 감속비] (두 모드 미리 계산) · 감속비 · 종목 기록(가장 빠른 기록 대비) · 차량 한계 / 고른 코스 · 축전지 · 모터 · 에너지
   ============================================================ */
const T2KEY = 'run2x.wb.2.ext.v2';
/* 예시 내 코스 (내부 글 양식: 첫 행 = 열 이름, 빈칸 = 윗 행 폭 · 콘 없음) */
/* 슬라럼 구간 폭 10 m = 공식 내구 코스 콘 자료(FSK26)의 슬라럼 콘 둘레 ±4 m 폭 중앙값 10.0 m (다른 구간 3.9 m), 2026-11-11 */
const T2TRACK_EX = ['종류, 길이 m, 반경 m, 왼쪽 폭 m, 오른쪽 폭 m, 슬라럼 콘 간격 m',
  '직선, 25, , 2, 2  # 출발 직선', '직선, 60, , 5, 5, 10  # 슬라럼 (콘 간격 10 m · 폭 10 m)', '직선, 20', '왼쪽, 31.42, 20, 3, 2  # 왼쪽 90° (지름 40 m · 바깥 넓음)', '직선, 40, , 2, 2',
  '오른쪽, 7.85, 10  # 시케인', '왼쪽, 7.85, 10', '왼쪽, 7.85, 10', '오른쪽, 7.85, 10', '직선, 30', '왼쪽, 15.71, 5  # 왼쪽 헤어핀 (지름 10 m)', '직선, 35',
  '오른쪽, 47.12, 30, 5, 5, 8  # 곡선 위 슬라럼 (반경 30 m · 콘 간격 8 m · 폭 10 m)', '직선, 36, , 5, 5, 6  # 짧은 슬라럼 (콘 간격 6 m · 폭 10 m)', '직선, 40', '오른쪽, 17.28, 5.5', '직선, 25', '왼쪽, 23.56, 15', '직선, 50', '오른쪽, 31.42, 10', '직선, 30'].join('\n');
/* 화면 상태 (이 브라우저에 저장). free.text = 내 코스 표를 글로 (한 행에 한 구간) */
const T2 = { tab:'sim', etab:'course', course:'end', lap:{end:'1', free:'1'}, free:{text:'', laps:1, s0:0, end:0}, mtext:'', eM:'', eI:'', tire:'', bO:'', bR:'', bC:'', grMode:'my',
             menu:'', paste:'', zoom:{k:1, cx:.5, cy:.5}, zoomE:{k:1, cx:.5, cy:.5}, timer:0,
             ecourse:'end', use:{mt:'tab', eM:'const', eI:'const', tire:'const', bO:'const', bR:'const', bC:'const', rqM:'const', rqI:'const', rqB:'const', eD:'const', dM:'const', dI:'const'}, rqM:'', rqI:'', rqB:'' };   // ecourse = 편집 탭에서 보는 코스 (시뮬레이션 코스와 따로), use = 맵마다 [아래 표 · 위 상수]
const T2ET = {course:'코스', mt:'모터 토크 곡선', eM:'모터 효율 맵', eI:'인버터 효율 맵', tire:'타이어 하중 감도', bO:'셀 OCV 표', bR:'셀 내부저항 표', bC:'셀 용량 표', eD:'구동계 효율 맵', dM:'모터 디레이팅 표', dI:'인버터 디레이팅 표', rqM:'모터 회로 라디 표', rqI:'인버터 회로 라디 표', rqB:'축전지 회로 라디 표'};   // 표 이름 (붙여넣기 창 · 메뉴)
/* 편집 탭 항목 (위 단추). 모터 · 인버터는 안에서 표 고름 (etab = mt · eM · eI) */
const T2EI = [['model', '모델 단계'], ['course', '코스'], ['car', '차량 제원'], ['sus', '서스 · 조향'], ['tire', '타이어'], ['aero', '에어로'], ['mot', '모터 · 인버터'], ['cool', '냉각'], ['dt', '구동계'], ['bat', '축전지']];
/* 조향각 표 기본값 = 2024 REF4 STEP 링크 기하 (도구 6 3D, 랙 31.74 mm = 핸들 127°: 안쪽 33.97° · 바깥 32.12°, 최소 회전 반경 2.50 m) — 2026-11-10 관리자 '알아서' → 100 % 애커먼 (2.99 m) 대신 실제 기하 */
const T2STAB_DEF = [[3.174, 0.781, 0.78], [6.348, 1.563, 1.559], [9.522, 2.346, 2.338], [12.696, 3.131, 3.116], [15.87, 3.918, 3.893], [19.044, 4.706, 4.67], [22.218, 5.496, 5.447], [25.392, 6.288, 6.225], [28.566, 7.082, 7.002], [31.74, 7.879, 7.78], [34.914, 8.678, 8.558], [38.088, 9.48, 9.336], [41.262, 10.284, 10.116], [44.436, 11.092, 10.896], [47.61, 11.903, 11.678], [50.784, 12.718, 12.46], [53.958, 13.536, 13.245], [57.132, 14.358, 14.03], [60.306, 15.184, 14.818], [63.48, 16.014, 15.607], [66.654, 16.849, 16.398], [69.828, 17.688, 17.192], [73.002, 18.533, 17.988], [76.176, 19.383, 18.786], [79.35, 20.238, 19.588], [82.524, 21.099, 20.393], [85.698, 21.966, 21.2], [88.872, 22.84, 22.012], [92.046, 23.72, 22.827], [95.22, 24.608, 23.646], [98.394, 25.503, 24.469], [101.568, 26.405, 25.296], [104.742, 27.316, 26.129], [107.916, 28.236, 26.966], [111.09, 29.165, 27.809], [114.264, 30.103, 28.658], [117.438, 31.052, 29.512], [120.612, 32.012, 30.373], [123.786, 32.983, 31.241], [126.96, 33.965, 32.116]];
T2.stab = [];   /* 모드를 읽을 때 정함 (t2ModeReset): 예제 = 위 STEP 표 · 새 파일 = 빈 표 (100 % 애커먼) */
const T2MOT = ['mt', 'eM', 'eI', 'dM', 'dI'], T2DT = ['eD'], T2BAT = ['bO', 'bR', 'bC'], T2RAD = ['rqM', 'rqI', 'rqB'];   // 라디 표 (부품별 독립 회로: 코어 풍속 × 냉각수 유량 → 방열량)   // 축전지 표: 셀 OCV (SOC × 온도) · 내부저항 (SOC × 온도) · 용량 (온도)
const t2Grp = et => T2MOT.includes(et) ? 'mot' : T2DT.includes(et) ? 'dt' : T2BAT.includes(et) ? 'bat' : T2RAD.includes(et) ? 'cool' : et;   // etab → 위 단추
/* 모드마다 처음 상태: 예제 = 예시 코스 · EMRAX 228 토크 · 효율 맵 · STEP 조향표 · 도구 9 기본 회로, 새 파일 = 모두 빈칸 (사이트는 차량 데이터를 주지 않음) */
function t2ModeReset(m){ const ex = m==='ex', EM = typeof EMRAX228!=='undefined' ? EMRAX228 : null;
  Object.assign(T2, {course:'end', ecourse:'end', lap:{end:'1', free:'1'}, free:{text:ex ? T2TRACK_EX : '', laps:1, s0:0, end:0}, mtext:ex && EM ? EM.torque : '', eM:ex && EM ? EM.eff : '', eI:'', tire:'', bO:'', bR:'', bC:'', rqM:'', rqI:'', rqB:'', eD:'', dM:'', dI:'', eD:'', dM:'', dI:'',
    grMode:'my', use:{mt:'tab', eM:'const', eI:'const', tire:'const', bO:'const', bR:'const', bC:'const', rqM:'const', rqI:'const', rqB:'const', eD:'const', dM:'const', dI:'const'}, stab:ex ? T2STAB_DEF.map(r => r.slice()) : [], cwc:null, cwcN:0, coolOld:null, menu:'', tab:'sim', etab:'course'}); }
const T2COURSES = ['free', 'ax', 'end', 'acc', 'skid'];
/* 예시 코스 판 (글의 해시). 예제 저장본이 예전 예시 코스 판이면 그 코스 글은 버리고 지금 예시로 (71차 슬라럼 폭 등이 옛 저장본에 가려지던 문제, 2026-11-12) */
const T2EXV = (s => { let h = 0; for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); })(T2TRACK_EX);
function t2Load(s){ if(!s || typeof s!=='object') return;
  if(T2COURSES.includes(s.course)) T2.course = s.course; T2.ecourse = T2COURSES.includes(s.ecourse) ? s.ecourse : T2.course;
  if(s.use && typeof s.use==='object') ['mt', 'eM', 'eI', 'tire', 'bO', 'bR', 'bC', 'rqM', 'rqI', 'rqB', 'eD', 'dM', 'dI'].forEach(k => { if(s.use[k]==='tab' || s.use[k]==='const') T2.use[k] = s.use[k]; }); ['rqM', 'rqI', 'rqB', 'eD', 'dM', 'dI'].forEach(k => { if(typeof s[k]==='string') T2[k] = s[k]; }); if(s.lap && typeof s.lap==='object') Object.assign(T2.lap, s.lap);
  if(s.free && typeof s.free.text==='string' && !(s.fromLS && WBMODE==='ex' && s.exv!==T2EXV)) Object.assign(T2.free, {text:s.free.text, laps:Math.max(1, Math.round(+s.free.laps || 1)), s0:Math.max(0, +s.free.s0 || 0), end:s.free.end === 1 ? 1 : 0});
  if(s.cwc && s.cwc.cool && Array.isArray(s.cwc.cool.circuits)) T2.cwc = {cool:s.cwc.cool};   // 도구 2P 자체 냉각 회로 (도구 9 와 따로)
  if(s.cool && Array.isArray(s.cool.circuits)) T2.coolOld = s.cool;   // 예전 저장본의 냉각 배치 → 도구 9 가 처음 열 때 가져감
  if(typeof s.mtext==='string') T2.mtext = s.mtext; if(typeof s.eM==='string') T2.eM = s.eM; if(typeof s.eI==='string') T2.eI = s.eI; if(typeof s.tire==='string') T2.tire = s.tire; if(Array.isArray(s.stab)) T2.stab = s.stab;   /* [] = 지운 것 (100 % 애커먼) */ ['bO', 'bR', 'bC'].forEach(k => { if(typeof s[k]==='string') T2[k] = s[k]; });
  if(s.grMode==='my' || s.grMode==='opt') T2.grMode = s.grMode; if(['sim', 'edit'].includes(s.tab)) T2.tab = s.tab; if(T2ET[s.etab] || T2EI.some(([k]) => k===s.etab && k!=='mot' && k!=='bat')) T2.etab = s.etab;
  /* 69차부터 [아래 표] = 빈 표여도 표를 씀(필수). 예전 저장본에 빈 표인데 'tab' 이 남아 있으면 [위 상수]로 (2026-11-11) */
  Object.keys(T2.use).forEach(k => { if(k!=='mt' && T2.use[k]==='tab' && !String(T2[k] || '').trim()) T2.use[k] = 'const'; }); }
/* 예전에 저장된 예시 효율 맵: 기본 맵과 크기가 같고 몇 칸(8칸 이하)만 3 %p 넘게 낮은 '구멍'이면 지금 기본 맵으로 바꿈 */
wbModeReg(m => { t2ModeReset(m); try{ t2Load({...JSON.parse(localStorage.getItem(wbMK(T2KEY)) || '{}'), fromLS:1}); }catch(e){} });
/* 도구 2P 자체 냉각 회로 (편집 탭 [냉각], 도구 9 와 같은 편집기 · 같은 형식). 처음엔 도구 9 의 기본 배치, [도구 9 에서 가져오기]는 복사 */
function t2Cwc(){ if(!T2.cwc) T2.cwc = {cool: typeof T9COOL_DEF==='function' ? (wbEx() ? T9COOL_DEF() : T9COOL_NEW()) : {circuits:[]}};
  if(!T2.cwcN && typeof t9CoolNorm==='function'){ t9CoolNorm(T2.cwc.cool, !wbEx()); T2.cwcN = 1; }   /* 공랭 덕트 입구 · 출구 보장, 새 파일의 예전 기본 블럭 정리 */
  return T2.cwc; }
/* 저장 · 내보내기에 같은 상태 (t2State). 화면 위치(tab · etab)는 저장만 */
const t2State = () => JSON.parse(JSON.stringify({...(T2.coolOld ? {cool:T2.coolOld} : {}), ...(T2.cwc ? {cwc:{cool:T2.cwc.cool}} : {}), course:T2.course, lap:T2.lap, free:T2.free, mtext:T2.mtext, eM:T2.eM, eI:T2.eI, tire:T2.tire, bO:T2.bO, bR:T2.bR, bC:T2.bC, rqM:T2.rqM, rqI:T2.rqI, rqB:T2.rqB, eD:T2.eD, dM:T2.dM, dI:T2.dI, stab:T2.stab || null, grMode:T2.grMode, ecourse:T2.ecourse, use:T2.use}));
const t2Save = () => { try{ localStorage.setItem(wbMK(T2KEY), JSON.stringify({...t2State(), tab:T2.tab, etab:T2.etab, exv:T2EXV})); }catch(e){} };

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
/* 모터 토크 표: 1열 = 회전수 rpm, 2열 = 피크 토크, 3열 = 연속 토크 [N·m] (둘 중 하나는 비워도 됨). 숫자가 없는 첫 행 = 열 이름 */
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
/* 셀 표 (도구 2P 축전지 · 도구 4 같이 씀): 2차원 = 첫 행 셀 온도 °C, 첫 열 SOC %, 칸 = 값 (OCV V · 내부저항 mΩ) → {n:[온도], t:[SOC], e:[[값]]} (계산 bil(M, 온도, SOC)) */
function t2GridParse(txt, u){ const L = t2Lines(txt).filter(l => l.cells.length); if(!L.length) return {map:null, msg:''};
  const head = L[0].cells.slice(1).map(Number); if(!head.length || !head.every(isFinite)) return {map:null, msg:'<span class="wb-err">첫 행(셀 온도 °C)을 읽지 못했습니다</span>'};
  const t = [], e = []; L.slice(1).forEach(l => { const r = l.cells.map(Number); if(isFinite(r[0]) && r.slice(1, head.length + 1).length===head.length && r.slice(1, head.length + 1).every(isFinite)){ t.push(r[0]); e.push(r.slice(1, head.length + 1)); } });
  if(!t.length) return {map:null, msg:'<span class="wb-err">SOC 행을 읽지 못했습니다</span>'};
  const n = head.length===1 ? [head[0], head[0] + 1] : head, ee = head.length===1 ? e.map(r => [r[0], r[0]]) : e, tt = t.length===1 ? [t[0], t[0] + 1] : t, E2 = t.length===1 ? [ee[0], ee[0]] : ee;
  const o = t.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), so = n.map((v, j) => [v, j]).sort((a, b) => a[0] - b[0]);
  const map = t.length===1 ? {n, t:tt, e:E2} : {n:so.map(x => x[0]), t:o.map(x => x[0]), e:o.map(([, i]) => so.map(([, j]) => ee[i][j]))};
  const all = map.e.flat(); return {map, msg:`표 ${t.length} × ${head.length} (SOC ${wbFmt(Math.min(...t), 0)} ~ ${wbFmt(Math.max(...t), 0)} %, 온도 ${wbFmt(Math.min(...head), 0)} ~ ${wbFmt(Math.max(...head), 0)} °C, 값 ${wbFmt(Math.min(...all), 3)} ~ ${wbFmt(Math.max(...all), 3)}${u ? ' ' + u : ''})`}; }
/* 셀 용량 표: 한 행에 셀 온도 °C · 용량 Ah → [[온도, Ah]] (숫자 하나면 온도와 상관없는 용량) */
/* 디레이팅 표: 한 행에 온도 °C · 디레이팅 % (0 = 피크 그대로 · 100 = 연속까지). 0 도 받음 → {map:{t, r}} */
function t2DerParse(txt){ const rows = []; t2Lines(txt).forEach(L => { const n = L.cells.map(c => c==='' ? NaN : +c); if(n.length >= 2 && isFinite(n[0]) && isFinite(n[1]) && n[1] >= 0) rows.push([n[0], n[1]]); });
  if(!rows.length) return {map:null, msg:''}; rows.sort((a, b) => a[0] - b[0]);
  return {map:{t:rows.map(r => r[0]), r:rows.map(r => r[1])}, msg:`${rows.length}점 · 온도 ${wbFmt(rows[0][0], 0)} ~ ${wbFmt(rows[rows.length-1][0], 0)} °C · 디레이팅 ${wbFmt(Math.min(...rows.map(r => r[1])), 0)} ~ ${wbFmt(Math.max(...rows.map(r => r[1])), 0)} %`}; }
function t2PairParse(txt){ const rows = []; t2Lines(txt).forEach(L => { const n = L.cells.map(c => c==='' ? NaN : +c); if(n.length >= 2 && isFinite(n[0]) && isFinite(n[1]) && n[1] > 0) rows.push([n[0], n[1]]); else if(n.length===1 && isFinite(n[0]) && n[0] > 0) rows.push([25, n[0]]); });
  if(!rows.length) return {map:null, msg:''}; rows.sort((a, b) => a[0] - b[0]);
  return {map:rows, msg: rows.length===1 ? `일정 ${wbFmt(rows[0][1], 2)} Ah` : `${rows.length}점 · 온도 ${wbFmt(rows[0][0], 0)} ~ ${wbFmt(rows[rows.length-1][0], 0)} °C · ${wbFmt(Math.min(...rows.map(r => r[1])), 2)} ~ ${wbFmt(Math.max(...rows.map(r => r[1])), 2)} Ah`}; }
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
const T2SLW = 5;   // 슬라럼 콘에서 양쪽 폭 [m]
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
  // 슬라럼 구간: 실제 대회에는 슬라럼 옆 좌우 콘이 없음 → 묶음(콘 간격 20 m 안)의 첫 콘 ~ 끝 콘 사이 좌우 콘은 빼고,
  //   경계 = 슬라럼 콘마다 콘 옆 거리 ± T2SLW m (그 구간 차 움직임에 영향이 없을 만큼 넓게) 를 경계 점으로 넣음.
  //   슬라럼 앞 마지막 좌우 콘 → 첫 슬라럼 콘, 끝 슬라럼 콘 → 뒤 첫 좌우 콘 사이는 직선으로 이어짐 (경계가 늘 좌우 콘을 지남, 2026-11-09 관리자 결정)
  const sS = sl.map(([k, , ds]) => S[k] + ds), zones = [];
  sl.forEach((q, j) => { const z = zones[zones.length - 1]; if(z && sS[j] - z.e < 20){ z.e = sS[j]; z.c.push([sS[j], q[1]]); } else zones.push({b:sS[j], e:sS[j], c:[[sS[j], q[1]]]}); });
  const inZ = s => zones.find(z => s > z.b && s < z.e);
  side.L = side.L.filter(([s0]) => !inZ(s0)); side.R = side.R.filter(([s0]) => !inZ(s0));
  zones.forEach(z => z.c.forEach(([s0, lat]) => { side.L.push([s0, lat + T2SLW]); side.R.push([s0, T2SLW - lat]); }));
  side.L.sort((p, q) => p[0] - q[0]); side.R.sort((p, q) => p[0] - q[0]);
  const WL = [], WR = []; for(let i = 0; i < N; i++){ const l = interp(side.L, S[i]), r = interp(side.R, S[i]); WL.push(isFinite(l) ? l : FSK26.WL[i]); WR.push(isFinite(r) ? r : FSK26.WR[i]); }
  return T2CW = {WL, WR, slalom:sl.map(q => q[0]), slat:sl.map(q => q[1]), sds:sl.map(q => q[2])}; }
const t2ExtraI = () => ({ wc_on: 1,   /* 차 크기는 2P 에서 항상 고려 (검증표만 끔) */
  tr_ks: 2, v_test: 60, ay_test: 0.4,   /* 고정값 (설계 변수 아님, 2026-11-09 관리자 결정): 곡률 다듬기 거리 [m] · 계단 조향 시험 차속 [km/h] · 정상 횡가속도 [g] */
  stab: Array.isArray(T2.stab) && T2.stab.length ? T2.stab : null,   /* 도구 6 조향각 표 [[핸들 °, 안쪽 °, 바깥 °]] (도구 6 에서 보냄) */
  end: typeof FSK26!=='undefined' ? (() => { const B = t2ConeBounds(); return {seg:FSK26.seg, laps:FSK26.laps, stint:FSK26.stint, WL:B.WL, WR:B.WR, slalom:B.slalom, slat:B.slat, sds:B.sds}; })() : {seg:[]},
  /* 맵: [위 상수]를 고르면 표가 있어도 넘기지 않음 */
  free:(() => { const P = t2Track(T2.free.text); return {seg:P.segs, wl:P.rows.map(r => isFinite(r.wl) ? r.wl : null), wr:P.rows.map(r => isFinite(r.wr) ? r.wr : null),
                                                       sl:P.rows.map(r => isFinite(r.sl) ? r.sl : null), laps:T2.free.laps, s0:T2.free.s0, end:T2.free.end === 1 ? 1 : 0}; })(), motor:t2MotorParse(T2.mtext).pts, motorC:t2MotorParse(T2.mtext).ptsC, motorReq:1,   /* 모터 곡선은 늘 표 */
  effM:T2.use.eM==='const' ? null : t2EffParse(T2.eM).map, effI:T2.use.eI==='const' ? null : t2EffParse(T2.eI).map, tireMap:T2.use.tire==='const' ? null : t2TireParse(T2.tire).map,
  effD:T2.use.eD==='const' ? null : t2EffParse(T2.eD).map, derM:T2.use.dM==='const' ? null : t2DerParse(T2.dM).map, derI:T2.use.dI==='const' ? null : t2DerParse(T2.dI).map,   /* 구동계 효율 맵 · 디레이팅 표 (2026-11-11) */
  bOcv:T2.use.bO==='const' ? null : t2GridParse(T2.bO).map, bRes:T2.use.bR==='const' ? null : t2GridParse(T2.bR).map, bCap:T2.use.bC==='const' ? null : t2PairParse(T2.bC).map,
  ...Object.fromEntries(['rqM', 'rqI', 'rqB'].map(k => [k, T2.use[k]==='const' ? null : t2GridParse(T2[k]).map])),   /* 라디 표 (부품별 독립): {n 유량, t 풍속, e kW} */   /* 셀 표 (비우면 직선 · 상수) */ course:T2.course, lap:T2.lap[T2.course] || '1', grMode:T2.grMode,
  cw9: WB.I && WB.I.cw_mode === 1 && typeof t2Net9==='function' ? (t2Net9() || {net:null}).net : null });   /* 냉각 회로 (수랭 방식 1): 도구 2P 자체 배치 */

/* ---------- 파일 가져오기 · 양식 받기 ---------- */
async function t2ReadCells(file){ const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(ext==='xlsx') return await t2Xlsx(await file.arrayBuffer());
  if(['csv', 'txt', 'tsv'].includes(ext)) return (await file.text()).split(/\r?\n/).map(l => l.split(/[,;\t]/));
  throw new Error(`읽을 수 없는 파일입니다 (.${ext || '확장자 없음'}). .xlsx · .csv 를 올리거나, 엑셀 .xls 는 [다른 이름으로 저장 → .xlsx]로 저장해 올려 주십시오.`); }
async function t2Import(file, what){ try{ const cells = await t2ReadCells(file), txt = cells.map(r => r.map(c => String(c ?? '').trim()).join(', ').replace(/(, )+$/, '')).filter(l => l.replace(/[, ]/g, '')).join('\n');
    if(what==='track'){ const P = t2Track(txt); if(!P.rows.length) throw new Error('구간을 찾지 못했습니다. 첫 행에 열 이름(종류 · 길이 m · 반경 m …), 그 아래 한 행에 한 구간이 있어야 합니다.');
      T2.free.text = t2RowsText(P.rows); toast(`${file.name}: 구간 ${P.rows.length}개 읽음${P.bad.length ? ` · ${P.bad.slice(0, 5).join(', ')}번째 행은 숫자가 없어 건너뜀` : ''}`); }
    else if(what==='motor'){ const P = t2MotorParse(txt); if(!P.pts.length && !P.ptsC.length) throw new Error('회전수 · 토크 행을 찾지 못했습니다.'); T2.mtext = txt; toast(`${file.name}: ${Math.max(P.pts.length, P.ptsC.length)}점${P.pts.length && P.ptsC.length ? ' · 피크 · 연속 토크' : P.pts.length ? ' · 피크 토크만' : ' · 연속 토크만'}`); }
    else if(what==='tire'){ const P = t2TireParse(txt); if(!P.map) throw new Error('하중 · μ 행을 찾지 못했습니다.'); T2.tire = txt; toast(`${file.name}: ${P.msg}`); }
    else if(what==='bO' || what==='bR'){ const P = t2GridParse(txt); if(!P.map) throw new Error('표를 읽지 못했습니다. 첫 행 = 셀 온도 °C, 첫 열 = SOC %.'); T2[what] = txt; toast(`${file.name}: ${P.msg.replace(/<[^>]+>/g, '')}`); }
    else if(what==='bC'){ const P = t2PairParse(txt); if(!P.map) throw new Error('온도 · 용량 행을 찾지 못했습니다.'); T2.bC = txt; toast(`${file.name}: ${P.msg}`); }
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
    ['# 모터 토크 곡선 양식 — 1열 회전수 rpm · 2열 피크 토크 N·m · 3열 연속 토크 N·m (한 열은 비워도 됨: 도구의 연속 ÷ 피크 비율로 채움)'], ['# 도구 위 [모터 표 기준 전압]에서 잰 곡선을 넣음 · # 행은 건너뜀'],
    ['회전수 rpm', '피크 토크 N·m', '연속 토크 N·m'], [0, 230, 110], [4800, 230, 112], [6500, 180, 92]]},
  der:{name:'디레이팅_양식', rows:[
    ['# 디레이팅 양식 — 1열 부품 온도 °C · 2열 디레이팅 % (0 = 피크 토크 · 전류 그대로, 100 = 연속까지 내림), 표 사이는 직선, 끝 밖은 끝 값'], ['# # 로 시작하는 행은 건너뜀'],
    ['온도 °C', '디레이팅 %'], [100, 0], [120, 50], [140, 100]]},
  eff:{name:'효율맵_양식', rows:[
    ['# 효율 양식 — 숫자 하나만 쓰면 상수 효율 % · 표면 맵'], ['# 맵: 첫 행 = 회전수 rpm · 첫 열 = 토크 N·m · 칸 = 효율 % (0 ~ 1 비율로 써도 됨)'], ['# # 행은 건너뜀'],
    ['토크 N·m \\ 회전수 rpm', 0, 2000, 4000], [50, 88, 93, 92], [150, 90, 95, 94], [230, 87, 93, 92]]} };
T2TPL.tire = {name:'타이어하중감도_양식', rows:[
  ['# 타이어 하중 감도 양식 — 한 행에 바퀴 하나 수직 하중 N · 그때 μ (행 사이는 직선 보간 · 범위 밖은 끝값)'], ['# 숫자 하나만 쓰면 하중과 상관없는 μ · # 행은 건너뜀'],
  ['하중 N', 'μ'], [0, 1.8], [1000, 1.6], [2000, 1.45]]};
T2TPL.bocv = {name:'셀OCV_양식', rows:[['# 셀 개방 전압(OCV) 양식 — 첫 행 = 셀 온도 °C · 첫 열 = SOC % · 칸 = 셀 OCV V (사이는 이중선형, 범위 밖은 끝값)'], ['# 도구 2P 축전지 · 도구 4 축전지 팩 계산기 같이 씀 · # 행은 건너뜀'],
  ['SOC % \\ 셀 온도 °C', 0, 25, 45], [0, 3.0, 3.05, 3.07], [20, 3.5, 3.55, 3.56], [50, 3.66, 3.7, 3.71], [80, 3.92, 3.95, 3.96], [100, 4.15, 4.2, 4.2]]};
T2TPL.bres = {name:'셀내부저항_양식', rows:[['# 셀 내부저항 양식 — 첫 행 = 셀 온도 °C · 첫 열 = SOC % · 칸 = 셀 내부저항 mΩ'], ['# 도구 2P 는 표의 모양만 씀 (팩 내부저항 = 팩 내부저항 칸 × R(SOC, 온도) ÷ R(50 %, 25 °C)) · 도구 4 는 값 그대로'],
  ['SOC % \\ 셀 온도 °C', 0, 25, 45], [0, 60, 30, 24], [50, 45, 22, 18], [100, 50, 24, 20]]};
T2TPL.rad = {name:'라디방열표_양식', rows:[['# 라디에이터 방열량 양식 — 첫 행 = 냉각수 유량 L/min · 첫 열 = 코어 풍속 m/s · 칸 = 방열량 kW (스펙 시트, 표를 잰 입구 온도차는 [표의 입구 온도차] 칸에)'], ['코어 풍속 m/s \\ 유량 L/min', 4, 8, 12], [2, 2.4, 3.0, 3.3], [5, 4.1, 5.4, 6.0], [8, 5.2, 7.0, 7.9]]};
T2TPL.bcap = {name:'셀용량_양식', rows:[['# 셀 용량 양식 — 한 행에 셀 온도 °C · 용량 Ah (사이는 직선, 범위 밖은 끝값) · 숫자 하나면 온도와 상관없는 용량'], ['셀 온도 °C', '용량 Ah'], [0, 3.6], [25, 4.0], [45, 4.05]]};
function t2Template(kind, fmt){ const T0 = T2TPL[kind]; let blob, hd = false;
  /* 양식에는 열 이름만 (예시 행은 # 주석으로: 읽을 때 건너뜀 → 데이터로 들어가지 않음) */
  const T = {name:T0.name, rows:T0.rows.map(r => { if(String(r[0]).startsWith('#')) return r; if(!hd){ hd = true; return r; } return ['# 예) ' + r.filter(v => v!=='').join(' · ')]; })};
  if(fmt==='xlsx') blob = t2XlsxBlob(T.rows); else blob = new Blob(['﻿' + T.rows.map(r => r.join(',')).join('\r\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${T.name}.${fmt}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

