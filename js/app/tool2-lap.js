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
const T2MOTOR_PH = '첫 행은 열 이름, 그 아래 한 행에 회전수 · 피크 토크 · 연속 토크\n회전수 rpm, 피크 토크 N·m, 연속 토크 N·m\n0, 230, 110\n4800, 230, 112\n6500, 180, 92\n\n한 열만 있으면 다른 열은 [연속 ÷ 피크 토크 비율]로 채움.';
const T2TIRE_PH = '비우면 위 [타이어 마찰계수] · [μ 하중 감도]를 씁니다.\n숫자 하나 = 하중과 상관없는 μ\n표 = 한 행에 바퀴 하나 수직 하중 N, μ\n하중 N, μ\n0, 1.8\n1000, 1.6\n2000, 1.45';
const T2EFF_PH = '비우면 위 상수 칸의 효율을 씁니다.\n숫자 하나 = 상수 효율 [%] (예: 97)\n맵 = 첫 행은 회전수, 첫 열은 토크, 칸은 효율 %\n토크 N·m \\ 회전수 rpm, 0, 2000, 4000\n50, 88, 93, 92\n150, 90, 95, 94\n230, 87, 93, 92';
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
function t2Load(s){ if(!s || typeof s!=='object') return;
  if(T2COURSES.includes(s.course)) T2.course = s.course; T2.ecourse = T2COURSES.includes(s.ecourse) ? s.ecourse : T2.course;
  if(s.use && typeof s.use==='object') ['mt', 'eM', 'eI', 'tire', 'bO', 'bR', 'bC', 'rqM', 'rqI', 'rqB', 'eD', 'dM', 'dI'].forEach(k => { if(s.use[k]==='tab' || s.use[k]==='const') T2.use[k] = s.use[k]; }); ['rqM', 'rqI', 'rqB', 'eD', 'dM', 'dI'].forEach(k => { if(typeof s[k]==='string') T2[k] = s[k]; }); if(s.lap && typeof s.lap==='object') Object.assign(T2.lap, s.lap);
  if(s.free && typeof s.free.text==='string') Object.assign(T2.free, {text:s.free.text, laps:Math.max(1, Math.round(+s.free.laps || 1)), s0:Math.max(0, +s.free.s0 || 0), end:s.free.end === 1 ? 1 : 0});
  if(s.cwc && s.cwc.cool && Array.isArray(s.cwc.cool.circuits)) T2.cwc = {cool:s.cwc.cool};   // 도구 2P 자체 냉각 회로 (도구 9 와 따로)
  if(s.cool && Array.isArray(s.cool.circuits)) T2.coolOld = s.cool;   // 예전 저장본의 냉각 배치 → 도구 9 가 처음 열 때 가져감
  if(typeof s.mtext==='string') T2.mtext = s.mtext; if(typeof s.eM==='string') T2.eM = s.eM; if(typeof s.eI==='string') T2.eI = s.eI; if(typeof s.tire==='string') T2.tire = s.tire; if(Array.isArray(s.stab)) T2.stab = s.stab;   /* [] = 지운 것 (100 % 애커먼) */ ['bO', 'bR', 'bC'].forEach(k => { if(typeof s[k]==='string') T2[k] = s[k]; });
  if(s.grMode==='my' || s.grMode==='opt') T2.grMode = s.grMode; if(['sim', 'edit'].includes(s.tab)) T2.tab = s.tab; if(T2ET[s.etab] || T2EI.some(([k]) => k===s.etab && k!=='mot' && k!=='bat')) T2.etab = s.etab;
  /* 69차부터 [아래 표] = 빈 표여도 표를 씀(필수). 예전 저장본에 빈 표인데 'tab' 이 남아 있으면 [위 상수]로 (2026-11-11) */
  Object.keys(T2.use).forEach(k => { if(k!=='mt' && T2.use[k]==='tab' && !String(T2[k] || '').trim()) T2.use[k] = 'const'; }); }
/* 예전에 저장된 예시 효율 맵: 기본 맵과 크기가 같고 몇 칸(8칸 이하)만 3 %p 넘게 낮은 '구멍'이면 지금 기본 맵으로 바꿈 */
function t2EffFix(txt){ try{ if(typeof EMRAX228==='undefined' || txt===EMRAX228.eff) return txt; const A = t2EffParse(txt).map, B = t2EffParse(EMRAX228.eff).map; if(!A || !B) return txt;
  if(A.n.length!==B.n.length || A.t.length!==B.t.length || A.n.some((v, j) => v!==B.n[j]) || A.t.some((v, i) => v!==B.t[i])) return txt;
  let d = 0, low = true; A.e.forEach((r, i) => r.forEach((v, j) => { const x = B.e[i][j]; if(Math.abs(v - x) > 1e-6){ d++; if(!(v < x - 3)) low = false; } }));
  return d > 0 && d <= 8 && low ? EMRAX228.eff : txt; }catch(e){ return txt; } }
wbModeReg(m => { t2ModeReset(m); try{ t2Load(JSON.parse(localStorage.getItem(wbMK(T2KEY)) || '{}')); }catch(e){} });
/* 도구 2P 자체 냉각 회로 (편집 탭 [냉각], 도구 9 와 같은 편집기 · 같은 형식). 처음엔 도구 9 의 기본 배치, [도구 9 에서 가져오기]는 복사 */
function t2Cwc(){ if(!T2.cwc) T2.cwc = {cool: typeof T9COOL_DEF==='function' ? (wbEx() ? T9COOL_DEF() : T9COOL_NEW()) : {circuits:[]}};
  if(!T2.cwcN && typeof t9CoolNorm==='function'){ t9CoolNorm(T2.cwc.cool, !wbEx()); T2.cwcN = 1; }   /* 공랭 덕트 입구 · 출구 보장, 새 파일의 예전 기본 블럭 정리 */
  return T2.cwc; }
/* 저장 · 내보내기에 같은 상태 (t2State). 화면 위치(tab · etab)는 저장만 */
const t2State = () => JSON.parse(JSON.stringify({...(T2.coolOld ? {cool:T2.coolOld} : {}), ...(T2.cwc ? {cwc:{cool:T2.cwc.cool}} : {}), course:T2.course, lap:T2.lap, free:T2.free, mtext:T2.mtext, eM:T2.eM, eI:T2.eI, tire:T2.tire, bO:T2.bO, bR:T2.bR, bC:T2.bC, rqM:T2.rqM, rqI:T2.rqI, rqB:T2.rqB, eD:T2.eD, dM:T2.dM, dI:T2.dI, stab:T2.stab || null, grMode:T2.grMode, ecourse:T2.ecourse, use:T2.use}));
const t2Save = () => { try{ localStorage.setItem(wbMK(T2KEY), JSON.stringify({...t2State(), tab:T2.tab, etab:T2.etab})); }catch(e){} };

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


/* ============================================================ 작업창 위 탭: [시뮬레이션] · [편집]
   시뮬레이션: 위 줄(기준 감속비 · 볼 랩 · 코스) → 결과 → 구동력 선도 · 코스 지도 (프로브) → 신호 선택 그래프
   편집      : 항목(코스 · 차량 제원 · 타이어 · 에어로 · 모터 · 인버터 · 구동계 · 축전지) → 상수 칸(왼쪽 입력 칸과 같은 부품) + 표 · 그림
               표에 값이 있으면 그 상수 칸을 막고 표를 씀. 비우면 다시 상수. 왼쪽 입력 칸은 비워 둠 (자주 바꾸는 값은 나중에) */
const T2CN = {free:'내 코스', ax:'오토크로스', end:'내구레이스', acc:'가속', skid:'스키드패드'};
const t2Sum = a => a.reduce((x, y) => x + y, 0);
const t2Closed = () => T2.free.laps > 1 || T2.free.s0 > 0;      // 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스
const t2Seg = (attr, cur, items) => `<span class="dc-seg" role="group">${items.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${cur===k}">${t}</button>`).join('')}</span>`;

function t2ExtHTML(){ const sim = T2.tab==='sim', sens = T2.tab==='sens', w = $('#wb'); if(w) w.classList.toggle('t2-edit', !sim);
  const R = WB.id==='2' ? WB.R : null, go = R && R.modes ? R.modes.opt.out.gr_use : NaN;
  const bar = sim
    ? `<span class="t2-mdl" title="계산에 쓴 모델 · 기능 (편집 탭 [모델 단계]에서 바꿈)">모델 · 차량 ${Math.max(0, Math.min(3, Math.round(WB.I.md || 0)))} · 운전자 ${WB.I.dr_real === 1 ? '현실' : '이상'}${WB.I.e_lim ? ` · 에너지 상한 ${WB.I.drv === 1 ? '타력' : '출력 낮춤'}` : ''} · 열 ${t2ThName()}${WB.I.rg_on === 1 ? ' · 회생' : ''}</span><span class="t2-gm"><span class="muted">기준 감속비</span>${t2Seg('data-t2gm', T2.grMode, [['my', `내 감속비 ${wbFmt(WB.I.gr, 2)}`], ['opt', `최적 감속비 ${isFinite(go) ? wbFmt(go, 2) : '…'}`]])}</span>
       <span class="t2-vw"><label class="t2-lapl">볼 랩 <span id="t2lapw">${t2LapSel()}</span></label><span class="muted">코스</span>${t2Seg('data-t2course', T2.course, T2COURSES.map(k => [k, T2CN[k]]))}</span>`
    : sens ? `<span class="t2-mdl">모델 · 차량 ${Math.max(0, Math.min(3, Math.round(WB.I.md || 0)))} · 운전자 ${WB.I.dr_real === 1 ? '현실' : '이상'}${WB.I.e_lim ? ` · 에너지 상한 ${WB.I.drv === 1 ? '타력' : '출력 낮춤'}` : ''} · 열 ${t2ThName()} · 내 감속비 ${wbFmt(WB.I.gr, 2)} (줄여 셈)</span>`
    : `<span class="t2-vw"><span class="muted">편집할 항목</span>${t2Seg('data-t2eg', t2Grp(T2.etab), T2EI)}</span>
`;
  return `<section class="wb-sec t2-ext" aria-label="시뮬레이션 · 편집"><div class="wb-h t2-h"><div class="m1-tabs" role="tablist">${[['sim', '시뮬레이션'], ['edit', '편집'], ['sens', '감도']].map(([k, t]) => `<button type="button" role="tab" data-t2tab="${k}" aria-selected="${T2.tab===k}">${t}</button>`).join('')}</div></div>
    <div class="t2-hr${sim ? '' : ' left'}">${bar}</div>
    ${sim ? '' : sens ? t2SensHTML() : t2EditBody()}</section>`; }
/* ---------- 감도 탭: 입력을 하나씩 조금 바꿔 (나머지는 지금 값) 종목 기록 · 내구 에너지가 얼마나 바뀌는지 (입력 훑기와 같은 줄여 셈, 내 감속비)
   바꾸는 양: 지금 값의 +δ % (온도 [°C] 는 +δ °C). 0 인 값 · 잠긴 칸 · 단추로 고르는 값 · 회로 순서는 건너뜀.
   영향 = 기록 변화율 (%) ÷ 입력 변화율 (%) (탄력도). 종합 = 네 종목 탄력도 절댓값 평균 → 큰 순서가 핵심 입력 후보 */
const T2S = {rel:5, rows:null, base:null, run:false, done:0, tot:0, sort:'all', err:'', at:''};
const T2SM = [['acc', '가속', 't_acc_s'], ['skid', '스키드패드', 't_skid_s'], ['ax', '오토크로스', 't_ax_s'], ['end', '내구', 't_end_s'], ['e', '내구 에너지', 'e_use']];
function t2SensKeys(){ return WB_TOOLS['2'].inputs.filter(d => d.ui!=='none' && !/^cw_o/.test(d.k) && Number.isFinite(WB.I[d.k]) && WB.I[d.k]!==0 && !t2InLock(d.k)); }
async function t2SensRun(){ if(T2S.run) return; const ds = t2SensKeys(), base = wbInputs(), rel = Math.max(0.5, Math.min(50, +T2S.rel || 5)) / 100;
  T2S.run = true; T2S.err = ''; T2S.rows = []; T2S.done = 0; T2S.tot = ds.length + 1; wbPaint(['ext']);
  const one = async Is => { const r = await wbRun(Is.map(I => ({...I, _sweep:true})), wbCode()); if(!r.ok) throw new Error(r.cancelled ? '멈춤' : r.err); return r.outs; };
  try{ T2S.base = (await one([base]))[0]; T2S.done = 1; wbPaint(['ext']);
    for(let i = 0; i < ds.length; i += 3){ const ch = ds.slice(i, i + 3), Is = ch.map(d => { const v = WB.I[d.k], dv = d.u==='°C' ? rel * 100 : v * rel; return {...base, [d.k]: d.u==='%' && v + dv > 100 ? v - dv : v + dv}; });   // % 값(효율 등)이 100 을 넘으면 반대로
      if(T2.tab!=='sens' || !T2S.run) throw new Error('멈춤');
      const outs = await one(Is);
      ch.forEach((d, j) => { const v = WB.I[d.k], nv = Is[j][d.k], px = (nv - v) / Math.max(d.u==='°C' ? 1 : 1e-12, Math.abs(v)) * 100, o = outs[j], el = {};
        T2SM.forEach(([k, , ok]) => { const b0 = T2S.base[ok], b1 = o[ok]; el[k] = Number.isFinite(b0) && Number.isFinite(b1) && b0 ? ((b1 - b0) / b0 * 100) / px : NaN; el['d_' + k] = b1 - b0; });
        const four = ['acc', 'skid', 'ax', 'end'].map(k => Math.abs(el[k])).filter(Number.isFinite); el.all = four.length ? four.reduce((a, b) => a + b, 0) / four.length : NaN;
        T2S.rows.push({k:d.k, n:d.n || (typeof DK!=='undefined' && DK[d.dk] ? DK[d.dk].n : d.k), u:d.u || (d.dk && typeof DK!=='undefined' && DK[d.dk] ? DK[d.dk].u : ''), g:d.g, dd:Number.isFinite(d.d) ? d.d : 3, v, nv, ...el}); });
      T2S.done = Math.min(T2S.tot, T2S.done + ch.length); wbPaint(['ext']); }
    T2S.at = new Date().toLocaleString(); }
  catch(err){ T2S.err = String(err.message || err); }
  T2S.run = false; wbPaint(['ext']); }
function t2SensHTML(){ const S = T2S, f = (v, d) => Number.isFinite(v) ? wbFmt(v, d) : '—', rows = (S.rows || []).slice();
  const key = S.sort, sg = x => Number.isFinite(x) ? x : -Infinity; rows.sort((a, b) => sg(Math.abs(b[key])) - sg(Math.abs(a[key])));
  const top = rows.filter(r => Number.isFinite(r.all)).sort((a, b) => b.all - a.all).slice(0, 10);
  const cell = (r, k) => { const x = r[k], c = !Number.isFinite(x) ? '' : Math.abs(x) >= 0.5 ? ' class="t2s-hi"' : Math.abs(x) >= 0.1 ? ' class="t2s-md"' : ''; return `<td${c}>${f(x, 3)}</td>`; };
  return `<div class="t2-sens">
    <div class="t2-cq"><b>입력 감도</b>
      <p class="muted">입력을 하나씩 지금 값의 +${f(+S.rel, 1)} % (온도는 +${f(+S.rel, 1)} °C, 효율처럼 100 % 를 넘게 되면 −${f(+S.rel, 1)} %) 바꾸고 나머지는 그대로 두어, 종목 기록 · 내구 에너지가 몇 % 바뀌는지 셉니다. 표의 숫자 = 기록 변화율 ÷ 입력 변화율 (탄력도: 1 이면 입력 1 % 에 기록 1 %, 음수 = 입력을 키우면 기록이 줄어듦 = 빨라짐). 계산은 입력 훑기와 같은 줄여 셈 · 내 감속비 · 지금 모델 단계이고, 잠긴 칸 · 0 인 값 · 단추로 고르는 값은 건너뜁니다.</p>
      <div class="t2-cqb"><label class="t2-lapl">바꾸는 양 <input type="number" class="t2s-rel" data-t2srel min="0.5" max="50" step="0.5" value="${S.rel}"> %</label>
        <button type="button" class="btn small pri" data-t2sens="run"${S.run ? ' disabled' : ''}>${S.run ? `계산 중 · ${S.done} / ${S.tot}` : `감도 계산 (입력 ${t2SensKeys().length}개)`}</button>
        ${S.run ? '<button type="button" class="btn small" data-t2sens="stop">멈춤</button>' : ''}${S.at && !S.run ? `<span class="muted">${wbEsc(S.at)} 계산 · 입력을 바꾸면 다시 계산하세요</span>` : ''}</div>
      ${S.err && S.err!=='멈춤' ? `<p class="wb-err">${wbEsc(S.err)}</p>` : S.err ? '<p class="muted">멈췄습니다 (그때까지 계산한 줄만 보임).</p>' : ''}</div>
    ${S.base ? `<p class="muted t2s-base">기준 (지금 입력, 줄여 셈): 가속 ${f(S.base.t_acc_s, 3)} s · 스키드패드 ${f(S.base.t_skid_s, 3)} s · 오토크로스 ${f(S.base.t_ax_s, 2)} s · 내구 ${f(S.base.t_end_s, 0)} s · 내구 에너지 ${f(S.base.e_use, 2)} kWh</p>` : ''}
    ${top.length ? `<div class="t2-cq"><b>핵심 입력 후보 (종합 탄력도 큰 순 10 개)</b><ol class="t2s-top">${top.map(r => `<li><b>${r.n}</b> <span class="muted">${wbEsc(r.g || '')} · 종합 ${f(r.all, 3)}</span></li>`).join('')}</ol>
      <p class="muted">자주 바꿔 비교할 입력을 고르는 참고입니다. 탄력도는 지금 값 근처에서만 맞고, 입력끼리 함께 바뀔 때(예: 질량과 무게중심)는 따로 봐야 합니다.</p></div>` : ''}
    ${rows.length ? `<div class="t2s-wrap"><table class="t2s-tab"><thead><tr><th>입력</th><th>지금 값</th><th>바꾼 값</th>${[['all', '종합']].concat(T2SM.map(([k, n]) => [k, n])).map(([k, n]) => `<th><button type="button" class="lnk" data-t2ssort="${k}" aria-pressed="${S.sort===k}">${n}${S.sort===k ? ' ▾' : ''}</button></th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.n}<span class="muted"> ${wbEsc(r.g || '')}</span></td><td>${f(r.v, r.dd)} ${r.u || ''}</td><td>${f(r.nv, r.dd + 1)}</td>${cell(r, 'all')}${T2SM.map(([k]) => cell(r, k)).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
  </div>`; }
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return;
  const s = e.target.closest('[data-t2sens]'); if(s){ if(s.dataset.t2sens==='run') t2SensRun(); else { T2S.run = false; if(typeof wbKill==='function') wbKill(); } return; }
  const o = e.target.closest('[data-t2ssort]'); if(o){ T2S.sort = o.dataset.t2ssort; wbPaint(['ext']); } });
document.addEventListener('change', e => { if(WB.id==='2' && e.target.matches && e.target.matches('[data-t2srel]')){ const v = +e.target.value; if(v > 0) T2S.rel = Math.min(50, v); } });
/* 편집 탭 본문: 항목의 상수 칸 (왼쪽 입력과 같은 칸, 비슷한 값끼리 작은 상자 = sb) + 표 · 그림 */
/* 탭 아래 짧은 안내 (글머리표, 2026-11-11 줄임) */
const T2CNOTE = {bat:['셀 · 팩 값은 도구 4 에서 정해 왼쪽 [대시보드 값으로 채우기]로 받음 <button type="button" class="lnk" data-t2to4>도구 4 열기</button>', '규정(세그먼트 120 V · 6 MJ · 12 kg) · 질량은 도구 4 에서 확인'],
  mot:['모터 토크는 아래 토크 표로만 셈']};
function t2Consts(grp){ const gs = T2EG[grp] || [], list = WB_TOOLS['2'].inputs.filter(d => gs.includes(d.g) && d.ui!=='none'); if(!list.length) return '';
  const groups = []; list.forEach(d => { let G = groups.find(x => x.g===d.g); if(!G){ G = {g:d.g, sb:[]}; groups.push(G); } let B = G.sb.find(x => x.n===d.sb); if(!B){ B = {n:d.sb, ds:[]}; G.sb.push(B); } B.ds.push(d); });
  groups.sort((a, b) => gs.indexOf(a.g) - gs.indexOf(b.g));   // 묶음 순서 = T2EG 순서 (냉각: 외기 → 냉각수 → 모터 · 인버터 · 축전지)
  return `<div class="t2-cg">${T2LAY(grp) ? t2Lay(grp, groups) : t2Board(groups)}
    ${T2CNOTE[grp] ? `<ul class="t2-cnote muted">${T2CNOTE[grp].map(x => `<li>${x}</li>`).join('')}</ul>` : ''}</div>`; }
/* 편집 배치 (2026-11-11): 같은 꼴 상자는 같은 크기로 한 행에.
   ① 한 묶음 안에서 부품 이름만 다른 상자 (모터 · 인버터 · 축전지 수랭 회로) = 같은 칸 너비로 한 행
   ② 이어진 묶음들이 같은 꼴 (모터 열 · 인버터 열 · 축전지 열 = [열 | 공랭]) = 묶음마다 한 열 (제목 + 상자 세로), 열 사이를 더 띄움
   ③ 나머지 상자는 앞 묶음의 남은 상자와 같은 행 (외기 + 냉각수 온도)
   상자 제목에 부품 이름이 있으면 안의 칸 이름에서 그 부품 · 회로 앞말을 뺌 (전체 이름은 마우스를 올리면) */
const T2PART = /^(모터|인버터|축전지)\s*/;
const t2BoxSig = B => String(B.n || '').replace(T2PART, '');
const t2PartOf = B => (String(B.n || '').match(T2PART) || [])[1] || '';
/* 편집 탭 배치 (관리자 지정, 2026-11-11): 행마다 n 열 격자, heads = [제목, 칸 수], cells = 상자 (g · sb 로 찾음, span 칸, k = 상자 안 열 수, col = 세로로 먼저 채움), wide = 다른 부품끼리 열 사이를 더 띄움.
   지정에 없는 상자는 끝에 예전 배치로 (빠지는 칸이 없게). 모터 · 인버터 · 축전지 탭은 나중에 다시 정함 (t2Board) */
const T2LAY = grp => ({
  car:[{n:3, heads:[[T2G.car, 3]], cells:[{sb:'질량 · 무게중심'}, {sb:'치수', span:2, k:2, col:1}]}],
  sus:[{n:3, heads:[[T2G.steer, 1], [T2G.rc, 2]], cells:[{sb:'최대 조향각'}, {sb:'롤센터 · 롤'}, {sb:'과도 (모델 3)'}]}],
  tire:[{n:2, heads:[[T2G.tire, 2]], cells:[{sb:'마찰 · 하중 이동'}, {sb:'바퀴'}]}, {n:1, cells:[{sb:'타이어 곡선 (모델 2 · 3)', k:2, col:1}]}],
  aero:[{n:2, heads:[[T2G.aero, 2]], cells:[{sb:'공력 계수'}, {sb:'압력중심'}]}],
  dt:[{n:1, heads:[[T2G.dt, 1]], cells:[{sb:'구동계', k:3}]}],
  cool:[{n:3, heads:[[T2G.thm, 1]], cells:[{g:T2G.thm}]},
        /* 부품별 독립 = 회로마다 냉각수 (온도 · 비열 · 밀도) + 회로 값, 냉각 회로 = 공통 냉각수 온도 한 칸만 (회로 값은 위 편집기) (2026-11-11) */
        ...(WB.I.cw_mode===1 ? [{n:3, wide:1, heads:[['수랭 회로', 3]], cells:[{sb:'냉각수 온도'}, {sb:'모터 냉각수', skip:1}, {sb:'인버터 냉각수', skip:1}, {sb:'축전지 냉각수', skip:1},
              {sb:'모터 수랭 회로 (부품별 독립)', skip:1}, {sb:'인버터 수랭 회로 (부품별 독립)', skip:1}, {sb:'축전지 수랭 회로 (부품별 독립)', skip:1}]}]
          : [{n:3, wide:1, heads:[['수랭 회로', 3]], cells:[{sb:'냉각수 온도', skip:1}, {sb:'모터 냉각수'}, {sb:'인버터 냉각수'}, {sb:'축전지 냉각수'}]},
             {n:3, wide:1, cells:[{sb:'모터 수랭 회로 (부품별 독립)'}, {sb:'인버터 수랭 회로 (부품별 독립)'}, {sb:'축전지 수랭 회로 (부품별 독립)'}]}]),
        {n:3, wide:1, heads:[['공랭 회로', 3]], cells:[{sb:'모터 공랭'}, {sb:'인버터 공랭'}, {sb:'축전지 공랭'}]},
        {n:3, wide:1, heads:[['열 모델', 3]], cells:[{sb:'모터 열'}, {sb:'인버터 열'}, {sb:'축전지 열'}]}] })[grp];   /* 함수: T2G 가 뒤 파일에서 정의됨 */
function t2Lay(grp, groups){ const all = []; groups.forEach(G => G.sb.forEach(B => all.push({...B, g:G.g}))); const used = new Set();
  const find = c => all.find(B => !used.has(B) && (c.g ? B.g===c.g && !B.n : B.n===c.sb));
  const rows = T2LAY(grp).map(R => { const cells = R.cells.map(c => { const B = find(c); if(!B) return ''; used.add(B); if(c.skip) return ''; return `<div style="grid-column:span ${c.span || 1}">${t2BoxHTML(B, c.k, c.col)}</div>`; }).join('');
    return (R.heads ? `<div class="t2-lay t2-layh${R.wide ? ' wide' : ''}" style="--n:${R.n}">${R.heads.map(([t, s]) => `<div class="wb-ig" style="grid-column:span ${s}">${wbEsc(t)}</div>`).join('')}</div>` : '') + `<div class="t2-lay${R.wide ? ' wide' : ''}" style="--n:${R.n}">${cells}</div>`; }).join('');
  const rest = groups.map(G => ({...G, sb:G.sb.filter(B => !all.some(A => used.has(A) && A.n===B.n && A.g===G.g))})).filter(G => G.sb.length);
  return rows + (rest.length ? t2Board(rest) : ''); }
function t2BoxHTML(B, k, col){ const P = t2PartOf(B), ds = P ? B.ds.map(d => { const n = wbInName(d), s = n.replace(new RegExp('^' + P + ' (회로 )?(· )?'), '').replace(/^라디 · /, '라디 · '); return s!==n && !/^[→·]/.test(s) ? {...d, n:s.charAt(0).toUpperCase() + s.slice(1), nFull:n} : d; }) : B.ds;
  const body = k > 1 ? `<div class="t2-bin${col ? ' col' : ''}" style="--k:${k};--r:${Math.ceil(ds.length / k)}">${wbInRows(ds, false)}</div>` : wbInRows(ds, false);
  return `<div class="t2-sb">${B.n ? `<div class="t2-sbh">${wbEsc(B.n)}</div>` : ''}${t2SbTop(B.n)}${body}</div>`; }
function t2Board(groups){ const rows = []; let pend = [];
  const flush = () => { if(pend.length===1){ const c = pend[0]; rows.push(`<div class="wb-ig">${wbEsc(c.t)}</div><div class="t2-sbs">${c.bs.map(B => t2BoxHTML(B)).join('')}</div>`); pend = []; } if(pend.length){ rows.push(`<div class="t2-brow t2-bcols" style="--n:${pend.length}">${pend.map(c => `<div class="t2-bcol">${c.t ? `<div class="wb-ig">${wbEsc(c.t)}</div>` : ''}${c.bs.map(B => t2BoxHTML(B)).join('')}</div>`).join('')}</div>`); pend = []; } };
  const skel = G => G.sb.map(t2BoxSig).join('|');
  for(let i = 0; i < groups.length; i++){ const G = groups[i];
    let j = i; while(j + 1 < groups.length && G.sb.length >= 2 && skel(groups[j + 1])===skel(G) && G.sb.every(B => t2PartOf(B))) j++;
    if(j > i){ flush(); rows.push(`<div class="t2-brow t2-bgrp" style="--n:${j - i + 1}">${groups.slice(i, j + 1).map(H => `<div class="t2-bcol"><div class="wb-ig">${wbEsc(H.g)}</div>${H.sb.map(B => t2BoxHTML(B)).join('')}</div>`).join('')}</div>`); i = j; continue; }
    const sig = {}; G.sb.forEach(B => { if(t2PartOf(B)) (sig[t2BoxSig(B)] = sig[t2BoxSig(B)] || []).push(B); });
    const set = Object.values(sig).find(a => a.length >= 2) || [], singles = G.sb.filter(B => !set.includes(B));
    /* ③ 상자 하나뿐인 묶음끼리만 한 행으로 (외기 + 냉각수 온도), 그 밖은 묶음 제목 + 상자 3칸 격자 (예전과 같음) */
    if(singles.length===1 && pend.every(c => c.bs.length===1)) pend.push({t:G.g, bs:singles});
    else { flush(); rows.push(`<div class="wb-ig">${wbEsc(G.g)}</div>` + (singles.length ? `<div class="t2-sbs">${singles.map(B => t2BoxHTML(B)).join('')}</div>` : '')); }
    if(set.length){ flush(); rows.push(`<div class="t2-brow t2-bset" style="--n:${set.length}">${set.map(B => t2BoxHTML(B)).join('')}</div>`); }
    if(pend.length >= 3) flush(); }
  flush(); return rows.join(''); }
const T2RL = {2:['레코드 라인', '최소 곡률 라인에서 출발해 우리 차 랩타임이 줄도록 조금씩 다듬은 라인 (차량 입력이 바뀌면 다시 다듬음)'],
              1:['최소 곡률 라인', '코스 폭 안에서 가장 덜 휘는 라인 (차량 성능과 상관없이 코스만으로 정함)'],
              0:['중심 라인', '코스 중심선을 그대로 따라감 (슬라럼 콘도 비켜 가지 않음)']};
const t2RlOf = () => WB.I.rl_on >= 2 ? 2 : WB.I.rl_on >= 1 ? 1 : 0;
/* 상자 맨 위에 넣는 옵션 행 (상자 이름으로 고름) */
function t2SbTop(n){ if(n==='최대 조향각'){ const S = t2Stab();
    return `<div class="t2-optrow"><span class="t2-optn">조향 기하</span>${S ? `<span>${JSON.stringify(T2.stab)===JSON.stringify(T2STAB_DEF) ? '기본 표 (2024 REF4 STEP 링크 기하, 도구 6 3D)' : '도구 6 조향각 표'}${wbSrcTag('2', 't2:stab')} ${S.n}행 · 핸들 최대 ${wbFmt(S.hw, 0)}° → 안쪽 ${wbFmt(S.di, 1)}° · 바깥 ${wbFmt(S.dout, 1)}° · 가운데 조향비 ${wbFmt(S.rc, 2)} · 최소 회전 반경 ${wbFmt(S.R, 2)} m</span> <button type="button" class="btn small" data-t2stabx>표 지우기</button>` : '<span class="muted">100 % 애커먼 · 일정 조향비 (도구 6 [도구 연결 ▾]에서 조향각 표를 보내면 링크 기하를 씀)</span>' + (wbEx() ? ' <button type="button" class="btn small" data-t2stabd>기본 표로 (STEP)</button>' : '')}</div>`; }
  if(n!=='여유') return ''; const r = t2RlOf();
  return `<div class="t2-optrow"><span class="t2-optn">주행선</span>${t2Seg('data-t2rl', String(r), [2, 1, 0].map(k => [String(k), T2RL[k][0]]))}
    <p class="muted t2-optd">${T2RL[r][1]} · 슬라럼은 첫 콘을 왼쪽으로 지나감</p></div>`; }
/* 입력 행 안 옵션 단추 (이름과 값 사이) */
/* 팩 제원 용량 [kWh] = 직렬 × 병렬 × 셀 용량 × 셀 공칭 전압 */
/* 축전지: 직렬 수가 있으면 셀 값으로 팩 값을 계산 (팩 칸 잠김), 직렬 수 0 이면 팩 칸 값을 씀 (셀 공칭 · 최소 · 병렬 · 셀 용량 잠김) — 계산 쪽 packCell 과 같은 식 */
const t2PkDir = () => WB.I.pk_dir===1;   // 팩 값 직접 (고르는 값, 직렬 수 0 으로 정하지 않음 · 2026-11-11)
const t2Cell = () => { const I = WB.I; if(!t2PkDir()) return {Ns:I.n_s, np:I.n_p, ah:I.c_ah, vmax:I.c_vmax, vnom:I.c_vnom, vmin:I.c_vmin};
  const cv = I.c_vmax > 0 ? I.c_vmax : 4.2, Ns = I.p_vmax / cv; return {Ns, np:1, ah:I.p_ah, vmax:cv, vnom:(I.p_vnom > 0 ? I.p_vnom : I.p_vmax)/Ns, vmin:(I.p_vmin > 0 ? I.p_vmin : I.p_vmax)/Ns}; };
const t2Epack = () => { const c = t2Cell(); return c.Ns*c.np*c.ah*c.vnom/1000; };
const T2PK = {p_vmax:c => c.Ns*c.vmax, p_vnom:c => c.Ns*c.vnom, p_vmin:c => c.Ns*c.vmin, p_ah:c => c.np*c.ah};
const T2EL = {0:'출력 상한을 낮추지 않고 끝까지 전력으로 달림 (소비가 팩 에너지를 넘어도)', 1:'내구 소비가 팩 제원 용량을 넘으면 출력 상한을 낮춰 맞춤', 2:'내구 소비가 아래 칸에 넣은 값을 넘으면 출력 상한을 낮춰 맞춤'};
const t2ElOf = () => WB.I.e_lim === 0 ? 0 : WB.I.e_lim === 2 ? 2 : 1;
function t2InOpt(k){ if(WB.id!=='2') return '';
  if(k==='n_s'){ const d = t2PkDir(); return `<span class="t2-inopt" title="${d ? '팩 전압 · 용량을 아래 팩 칸에 직접 넣음 (셀 칸 잠김)' : '셀 값 × 직렬 · 병렬 수로 팩 값을 계산 (팩 칸 잠김)'}">${t2Seg('data-t2pk', d ? '1' : '0', [['0', '셀로 계산'], ['1', '팩 값 직접']])}</span>`; }
  { const fm = {cw_fon:'cw_fm', i_wfon:'i_wfm', b_wfon:'b_wfm'}[k]; if(fm){ const on = WB.I[fm]===1; return `<span class="t2-inopt" title="${on ? '라디로 들어오는 냉각수가 이 온도 이상이면 팬을 켜고 3 K 아래로 내려가면 끔' : '팬은 늘 켜져 있음'}">${t2Seg('data-t2fm', on ? '1' : '0', [['0', '팬 늘 켬'], ['1', '냉각수 온도로']]).replace('<span class="dc-seg"', `<span class="dc-seg" data-t2fmk="${fm}"`)}</span>`; } }
  if(k==='i_ct'){ const on = WB.I.ict_m !== 0; return `<span class="t2-inopt" title="${on ? '연속 상전류를 값으로 넣음' : '연속 상전류 = 피크 × [연속 ÷ 피크 전류 비율] (모터 표에 연속 열이 없을 때와 같은 방식)'}">${t2Seg('data-t2ict', on ? '1' : '0', [['1', '값 입력'], ['0', '피크 × 비율']])}</span>`; }
  if(k==='tire_fz0'){ const on = WB.I.fz0_m !== 0; return `<span class="t2-inopt" title="${on ? 'μ · 코너링 강성을 잰 하중을 넣음' : 'μ 는 하중 0 의 값, 코너링 강성 기준은 정지 평균 하중 (바퀴 하나 = 차 무게 ÷ 4)'}">${t2Seg('data-t2fz0', on ? '1' : '0', [['1', '값 입력'], ['0', '정지 평균 하중']])}</span>`; }
  if(k==='eta_inv'){ const mg = WB.I.eff_mg === 1; return `<span class="t2-inopt" title="${mg ? '모터 효율(맵)이 모터 + 인버터 합친 값. 합친 손실을 [합친 손실 중 인버터 몫]으로 나눠 인버터 열로' : '모터 · 인버터 효율을 따로 넣음'}">${t2Seg('data-t2mg', mg ? '1' : '0', [['0', '따로'], ['1', '모터 맵에 합침']])}</span>`; }
  if(k!=='e_target') return ''; const m = t2ElOf();
  return `<span class="t2-inopt" title="${T2EL[m]}">${t2Seg('data-t2el', String(m), [['1', `제원 용량 ${wbFmt(t2Epack(), 2)} kWh`], ['2', '임의 상한'], ['0', '제한 없음']])}</span>`; }
/* ---------- 모델 단계 카드: 제목 · 핵심 한 줄 · 이 선택으로 달라지는 것 · (단추) · [자세히] · 쓰는 입력 · 아래 줄 (선택 표시 / 토글)
   o = {kind:'pick' 하나 고름 | 'tog' 켬 · 끔 | 'info' 안쪽 단추로 고름, attr, on, title, core, dif:[], ctl, more, use, onTxt, offTxt}
   카드 아무 곳이나 눌러 고르거나 켬 · 끔 (안쪽 단추 · [자세히] · 링크는 제외), Enter · Space 로도 */
function t2Card(o){ const tog = o.kind==='tog', pick = o.kind==='pick';
  const sw = tog ? `<span class="t2sw${o.on ? ' on' : ''}" aria-hidden="true"><i></i></span>` : '';
  return `<div class="t2c${o.on ? ' on' : ''}${pick ? ' pick' : ''}${tog ? ' tog' : ''}"${o.attr ? ` ${o.attr}` : ''}${pick || tog ? ` role="${pick ? 'radio' : 'switch'}" tabindex="0" aria-checked="${!!o.on}"` : ''}>
    <div class="t2c-h"><b>${o.title}</b>${tog ? `<span class="t2c-sw">${sw}</span>` : ''}</div>
    <div class="t2c-core">${o.core}</div>
    ${o.dif && o.dif.length ? `<ul class="t2c-dif">${o.dif.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${o.ctl || ''}
    ${o.more ? `<details class="t2c-more"><summary>자세히</summary><div>${o.more}</div></details>` : ''}
    <div class="t2c-foot">${o.use ? `<span class="t2c-use"><span class="muted">입력</span> ${o.use}</span>` : '<span></span>'}${pick ? `<span class="t2c-pk">${o.on ? '✓ 선택됨' : '선택'}</span>` : ''}</div></div>`; }
/* 차량 모델 단계: [키, 제목, 핵심, 달라지는 것, 자세히, 쓰는 입력] */
const T2MDV = [[0, '0 기본', '점질량 + 바퀴별 하중', ['좌우 하중 이동 = 무게중심 높이로', '바퀴마다 μ(하중): 하중 감도가 있으면 하중 이동이 그립 합을 줄임', '롤 없음'],
                '무게중심 높이 전체로 좌우 하중 이동을 계산하고, 바퀴마다 μ(하중) 로 그립을 셉니다 (하중 감도가 0 이면 하중 이동이 그립 합을 바꾸지 않음). 롤은 계산하지 않습니다.', '무게중심 높이 · 트레드 · μ · 하중 감도'],
               [1, '1 롤센터 · 롤', '+ 롤센터 · 롤', ['하중 이동 = 기하 몫 (롤센터) + 탄성 몫 (스프링 · ARB)', '롤각 계산'],
                '앞 · 뒤 롤센터 높이로 하중 이동을 기하 몫(롤센터에서 바로 전달)과 탄성 몫(스프링 · 안티롤바)으로 나누고, 롤 강성으로 롤각을 계산합니다.', '롤센터 높이 · 롤강성'],
               [2, '2 비선형 타이어', '+ 타이어 곡선 · 조향', ['축 횡 한계 = 두 바퀴가 같은 슬립각일 때 최댓값 (도구 T 곡선)', '최대 조향각을 넘는 코너는 감속', '슬립각 · 차체 각도 β · 조향각 · US 구배'],
                '도구 T 의 타이어 곡선(Magic Formula 꼴)으로 축 횡 한계를 두 바퀴가 같은 슬립각일 때의 최댓값으로 셉니다. 좌우 하중이 달라 두 바퀴 최고점 슬립각이 어긋나면 Σ μ·F<sub>z</sub> 보다 작아 코너 한계 속도가 낮아집니다. 최대 조향각을 넣으면 필요한 안쪽 바퀴 조향각(기하 + 슬립각 차)이 최대를 넘는 코너는 속도를 낮추고, 아주 느려도 못 도는 코너가 있으면 계산을 멈춥니다. 전폭을 넣으면 속도에 따른 차체 각도(저속 기구학 − 뒷바퀴 슬립각)로 차 사각형을 놓아 코스 경계나 슬라럼 콘(중심)에 닿는 곳은 속도를 낮춥니다.', '타이어 곡선 · 조향비 · 최대 조향각'],
               [3, '3 과도', '+ 요 · 롤 운동', ['곡률이 바뀌는 곳은 요 관성 · 타이어 지연만큼 감속', '선 다듬기도 이 한계로', '계단 조향 시간 응답 (ISO 7401 꼴)'],
                '주행선을 그대로 따라가는 데 드는 타이어 힘에 요 관성(요 가속도)과 타이어 이완 길이(힘이 늦게 따라옴)를 넣습니다. ① 곡률이 바뀌는 곳은 앞 · 뒤 축마다 등가 곡률로 코너 한계 속도를 낮추고, 주행선 다듬기도 이 한계로 랩타임을 비교해 모델 3 의 선을 따로 고릅니다. ② 속도가 바뀌며 생기는 몫은 정해진 선에서 한계를 넘는 곳만 속도를 더 낮추고 준정적을 다시 풉니다 (앞에서 더 일찍 감속). 내구 · 오토크로스 · 내 코스에 반영하고, 일정 차속 계단 조향의 시간 응답(3 자유도 + 타이어 이완, ISO 7401 꼴)도 따로 보여 줍니다.', '요 · 롤 관성 · 롤 감쇠 · 이완 길이 · 곡률 다듬기 거리']];
/* 열 모델: [켬 키, 냉각 방식 키, 제목, 핵심, 켬, 끔, 자세히, 쓰는 입력] */
const T2MDT = [['th_on', 'm_cool', '모터 온도', '모터 온도 → 토크 제한', '디레이팅 시작 ~ 끝 온도에서 피크 → 연속 토크로 줄임', '출발 온도 그대로 · 디레이팅 없음',
                '모터 손실로 모터 온도가 오르고, 수랭이면 냉각수로 · 공랭이면 외기로 열을 내보냅니다. 모터 온도가 디레이팅 시작 ~ 끝 온도 사이면 회전수마다 피크에서 연속 토크 쪽으로 같은 비율만큼 내려갑니다.', '열용량 · 출발 온도 · 디레이팅 온도 · 열저항 / hA'],
               ['in_on', 'i_cool', '인버터 온도', '인버터 온도 → 상전류 제한', '디레이팅 시작 ~ 끝 온도에서 상전류 상한 피크 → 연속', '출발 온도 그대로 · 디레이팅 없음 (수랭이면 손실은 냉각수로)',
                '인버터 손실로 인버터 온도가 오르고, 수랭이면 냉각수로 · 공랭이면 외기로 열을 내보냅니다. 인버터 온도가 디레이팅 시작 ~ 끝 온도 사이면 상전류 상한이 피크에서 연속 쪽으로 같은 비율만큼 내려갑니다 (모터와 같은 방식).', '열용량 · 출발 온도 · 디레이팅 온도 · 열저항 / hA'],
               ['bt_on', 'b_cool', '축전지 온도', '팩 온도 → 내부저항', '차가울수록 내부저항 ↑ → 손실 · 전압 강하 · 발열 ↑', '팩 온도 = 시작 온도로 고정',
                '팩 내부저항 손실로 축전지 온도가 오르고, 공랭이면 외기로 · 수랭이면 냉각수로 열을 내보냅니다. 내부저항은 셀 표(SOC × 온도)를 쓰면 표로, 아니면 온도 계수로 온도가 낮을수록 커집니다.', '팩 열용량 · 시작 온도 · 저항 온도 계수 또는 셀 표 · hA / 열저항'],
               ['cw_on', '', '냉각수 온도', '냉각수가 데워짐', '라디 방열 (차속에 따라) 로 냉각수 온도 계산', '냉각수 온도 고정',
                '수랭 부품에서 들어온 열을 라디에이터가 외기로 내보냅니다 (방열 능력은 차속에 따라 커짐). 부품별 독립 = 수랭 부품마다 자기 냉각수 · 라디. 냉각 회로 = 편집 탭 [냉각] 에서 그린 배치 (직렬 · 병렬 갈라짐 · 합침 · 라디 여러 개 · 공랭 덕트, 앞 부품이 데운 냉각수 · 공기를 뒤 부품이 받음). 수랭으로 열을 넣는 부품이 있을 때만 계산합니다.', '부품별 회로 값 또는 냉각 회로']];
/* 지금 켜진 노드 (냉각수는 실제로 계산되는지까지) */
/* 냉각 회로 (수랭 방식 1): 도구 2P 자체 배치 (편집 탭 [냉각]). 부품 → 'w1' (수랭 회로 번호) · 'a1' (공랭 덕트) · '' (외기) */
const t2Net9 = () => { try{ return typeof t9CoolCompile==='function' ? t9CoolCompile(t2Cwc()) : null; }catch(e){ return null; } };
const t2CoolSum = () => { const R = t2Net9(); return R ? `수랭 회로 ${R.net.water.length}개 · 공랭 덕트 ${(R.net.air || []).length}개${Object.keys(R.err || {}).length ? ` · 오류 ${Object.keys(R.err).length}개는 뺌` : ''}` : '회로 없음'; };
const t2Where9 = () => { const R = t2Net9(), W = {m:'', i:'', b:''}; if(!R) return W;
  R.net.water.forEach((C, w) => C.nodes.forEach(nd => { if(nd.part && !W[nd.part]) W[nd.part] = 'w' + (w + 1); }));
  (R.net.air || []).forEach((D, a) => D.parts.forEach(p => { if(!W[p]) W[p] = 'a' + (a + 1); })); return W; };
const t2Th = () => { const I = WB.I, m = I.th_on !== 0, i = I.in_on === 1, b = I.bt_on === 1, n9 = I.cw_mode === 1, P = n9 ? t2Where9() : null;
  const mW = n9 ? P.m[0]==='w' : I.m_cool !== 0, iW = n9 ? P.i[0]==='w' : I.i_cool !== 0, bW = n9 ? P.b[0]==='w' : I.b_cool === 1;
  const src = (m && mW) || iW || (b && bW); return {m, i, b, mW, iW, bW, src, n9, P, w: I.cw_on === 1 && src}; };
const t2ThName = () => { const t = t2Th(), a = [t.m && '모터', t.i && '인버터', t.b && '축전지', t.w && '냉각수'].filter(Boolean); return a.length ? a.join(' · ') : '없음'; };
function t2ModelPage(){ const md = Math.max(0, Math.min(3, Math.round(WB.I.md || 0))), th = t2Th(), on = {th_on:th.m, in_on:th.i, bt_on:th.b, cw_on:WB.I.cw_on === 1};
  const head = (nm, note, ctl = '') => `<div class="t2-mdh">${nm}<span class="muted t2-mdhn">${note}</span>${ctl}</div>`;
  const veh = `<div class="t2-mdax">${head('차량 모델', '수준 하나 고름 · 높은 수준은 낮은 수준을 모두 포함하고 더 많은 현상을 계산')}<div class="t2-mdops four">${T2MDV.map(([k, t, c, dif, more, use]) =>
      t2Card({kind:'pick', attr:`data-t2md="${k}"`, on:md===k, title:t, core:c, dif, more, use})).join('')}</div></div>`;
  const n9 = th.n9, pl = q => !q ? '외기' : q[0]==='w' ? `수랭 회로 ${q.slice(1)}` : `공랭 덕트 ${q.slice(1)}`;
  const thm = `<div class="t2-mdax">${head('열 모델', '계통마다 켬 · 끔 · 냉각수 온도는 수랭 부품이 있어야 계산', `<span class="t2-mdc t2-mdhc"><span class="muted">냉각 배치 (수랭 · 공랭)</span><span class="dc-seg" role="group">${[[0, '부품별 독립'], [1, '냉각 회로']].map(([q, nm]) => `<button type="button" data-t2cwm="${q}" aria-pressed="${(n9 ? 1 : 0)===q}">${nm}</button>`).join('')}</span>${n9 ? `<span class="muted">${t2CoolSum()} · <button type="button" class="lnk" data-t2gocool>회로 편집</button></span>` : ''}</span>`)}<div class="t2-mdops four">${T2MDT.map(([k, c, t, core, onT, offT, more, use]) => {
      const cw = k==='cw_on', dead = cw && on[k] && !th.src, p = c ? c[0] : '';
      const ctl = c ? (n9 ? `<span class="t2-mdc"><span class="muted">냉각 (회로)</span> ${pl(th.P[p])}</span>`
                        : (() => { const wv = c==='b_cool' ? (WB.I.b_cool === 1 ? 1 : 0) : (WB.I[c] !== 0 ? 1 : 0); return `<span class="t2-mdc"><span class="muted">냉각</span><span class="dc-seg" role="group">${[[0, '공랭'], [1, '수랭']].map(([q, nm]) => `<button type="button" data-t2cool-${c}="${q}" aria-pressed="${wv===q}">${nm}</button>`).join('')}</span></span>`; })())
        : `<span class="t2-mdc muted">${n9 ? '냉각 회로의 수랭 회로마다' : '수랭 부품마다 자기 냉각수 · 라디'}${th.src ? '' : ' · 수랭 부품 없음 → 계산 안 함'}${dead ? ' (고정값 사용)' : ''}</span>`;
      return t2Card({kind:'tog', attr:`data-t2th="${k}"`, on:on[k], title:t, core, dif:[`<b>켬</b> ${onT}`, `<b>끔</b> ${offT}`], ctl, more, use}); }).join('')}</div></div>`;
  const dr = WB.I.dr_real === 1 ? 1 : 0, ks = wbFmt(WB.I.dr_ks, 2), ke = wbFmt(WB.I.dr_ke, 2);
  const T2DRC = [[0, '이상', '그립 100 %', ['<span class="t2c-eq">쓰는 그립 = 그립</span> (마찰 타원 경계)', '차의 한계 성능'], '타이어가 낼 수 있는 힘을 모두 씁니다.', ''],
                 [1, '현실', '실제 FSK 기록 수준', ['<span class="t2c-eq">쓰는 그립 = 그립 × k<sub>s</sub> × k<sub>e</sub></span>', `k<sub>s</sub> = <b>${ks}</b> (가속 제외 모든 종목)`, `k<sub>e</sub> = <b>${ke}</b> (내구 · 내 코스 [내구 주행]) · 그 밖 1`, '조작 한계 (고정): 핸들 900 °/s (360° 를 0.4 s) · 페달 신호 0 → 100 % 0.2 s (양발)', '가속 = WOT, 배율 없음'],
                  'k<sub>s</sub> · k<sub>e</sub> 기본값은 2025 · 2026 E-Formula 완주 팀 기록 (오토크로스 중앙값, 내구 랩 ÷ 오토크로스 중앙값) 에 차량 모델 3 으로 맞춘 값입니다. 마찰 타원(종 · 횡 한계 모두)에 곱합니다. k<sub>e</sub> 는 장시간 · 추월 대기 · 피로 등 내구 페이스입니다.', '기본 그립 사용률 · 내구 페이스']];
  const drv = `<div class="t2-mdax">${head('운전자 모델', '하나 고름 · 에너지 상한에 맞추는 방법은 기능 설정 [내구 에너지 상한]')}<div class="t2-mdops two">${T2DRC.map(([k, t, c, dif, more, use]) =>
      t2Card({kind:'pick', attr:`data-t2drr="${k}"`, on:dr===k, title:t, core:c, dif, more, use})).join('')}</div></div>`;
  const fset = `<div class="t2-mdax">${head('기능 설정', '기능마다 고려 · 고려 안 함 (0 은 끔이 아니라 실제 0)')}<div class="t2-mdops four">${t2FsCards()}</div></div>`;
  return `<div class="t2-model"><p class="muted t2-mdnote">차량 · 운전자 모델은 하나 고름 · 열 · 기능은 하나씩 켬 · 끔 · 계산에 쓴 조합은 시뮬레이션 탭 위에 표시 · 대시보드로 보내는 값은 늘 차량 0 · 모터 온도로 계산</p>
    ${veh}${drv}${thm}${fset}${t2Consts('model')}</div>`; }
/* 내구 에너지 상한에 맞추는 방법: [키, 이름, 한 줄, 자세히] */
const T2DRV = [[0, '출력 낮춤', '출력 상한을 내구 전체에 같은 배율로 낮춤', '코너마다 한계까지 가속하고 최대로 제동합니다. 내구 에너지 상한에 걸리면 단자 출력 상한을 내구 전체에 같은 배율로 낮춰 맞춥니다.'],
               [1, '타력', '제동 앞에서 미리 페달을 뗌 (λ)', '출력을 깎지 않고 제동 앞에서 미리 가속 페달을 떼고 타력으로 달립니다. 제동 구간마다 [시간 + λ × 소비 에너지]가 가장 작은 곳에서 떼고, λ(에너지 1 kWh 의 시간 값)는 소비가 상한과 같아지게 정합니다 (에너지 제한 최소 시간 문제의 최대 구동 · 타력 · 제동 구조).']];
/* 기능 설정 카드 */
const T2RLS = {2:'최소 곡률에서 출발해 랩타임이 줄게 다듬은 선', 1:'코스 폭 안에서 가장 덜 휘는 선', 0:'코스 중심선 그대로'};
const T2ELS = {0:'끝까지 전력 (팩 에너지를 넘어도)', 1:'내구 소비 ≤ 팩 제원 용량', 2:'내구 소비 ≤ 넣은 상한'};
/* 도구 6 조향각 표 요약 (계산 쪽 steerGeo 와 같은 식): 행 수 · 핸들 최대 · 안쪽 최대 · 가운데 조향비 · 최소 회전 반경 */
const t2Stab = () => { const T = Array.isArray(T2.stab) ? T2.stab.filter(r => r[0] > 0 && r[1] > 0 && r[2] > 0).sort((a, b) => a[0] - b[0]) : []; if(T.length < 2) return null;
  const I = WB.I, D = Math.PI/180, L = I.L/1000, lr = L*I.fr/100, e = T.at(-1), Ra = L*((1/Math.tan(e[1]*D) + 1/Math.tan(e[2]*D))/2);
  return {n:T.length, hw:e[0], di:e[1], dout:e[2], rc:T[0][0]/((T[0][1] + T[0][2])/2), R:Math.sqrt(Ra*Ra + lr*lr)}; };
const t2RKin = () => { const I = WB.I; if(I.dl_on === 0) return NaN; const S = t2Stab(); if(S) return S.R; if(!(I.delta_max > 0)) return NaN; const L = I.L / 1000, lr = L * I.fr / 100, Rr = L / Math.tan(I.delta_max * Math.PI / 180) + I.tf / 2000; return Math.sqrt(Rr * Rr + lr * lr); };
function t2FsCards(){ const I = WB.I, md = I.md || 0, rl = t2RlOf(), el = t2ElOf(), dl = I.dl_on !== 0, rg = I.rg_on === 1, dv = I.drv === 1 ? 1 : 0;
  const tog = (k, on, title, core, onT, offT, more, use) => t2Card({kind:'tog', attr:`data-t2fs="${k}"`, on, title, core, dif:[`<b>고려</b> ${onT}`, `<b>고려 안 함</b> ${offT}`], more, use, onTxt:'고려', offTxt:'고려 안 함'});
  return [
    t2Card({kind:'info', on:true, title:'주행선', core:'어느 선으로 달리나', ctl:`<span class="t2-mdc">${t2Seg('data-t2rl', String(rl), [2, 1, 0].map(k => [String(k), T2RL[k][0]]))}</span>`, dif:[T2RLS[rl]], more:T2RL[rl][1] + '. 슬라럼은 첫 콘을 왼쪽으로 지나갑니다.', use:'여유 · 최소 거리'}),
    tog('dl_on', dl, '조향 한계', '최대 조향각으로 회전 제한', `주행선 |곡률| ≤ 1 ÷ R<sub>min</sub>${md >= 2 ? ' · 슬립각까지 더해 최대를 넘으면 감속' : ''}`, '조향각 · 회전 반경 제한 없음',
        `최소 회전 반경 R<sub>min</sub> = √((L ÷ tan δ<sub>max</sub> + t<sub>f</sub> ÷ 2)² + l<sub>r</sub>²) (아주 느리게 · 100 % 애커먼)${isFinite(t2RKin()) ? ` = <b>${wbFmt(t2RKin(), 2)} m</b>` : ''} 로 주행선을 만들고, 폭 · 콘 때문에 못 지키면 결과에 급한 구간으로 알립니다. 차량 모델 2 이상은 안쪽 바퀴 조향각 = 기하 + 슬립각 차이로 속도마다 확인해 넘으면 감속합니다 (아주 느리게도 못 돌면 멈춤).`, '최대 조향각'),
    t2Card({kind:'info', on:el !== 0, title:'내구 에너지 상한', core:'내구 소비를 얼마까지', ctl:`<span class="t2-mdc">${t2Seg('data-t2el', String(el), [['1', `제원 ${wbFmt(t2Epack(), 2)} kWh`], ['2', '임의 상한'], ['0', '제한 없음']])}</span>${el !== 0 ? `<span class="t2-mdc"><span class="muted">맞추는 방법</span>${t2Seg('data-t2drv', String(dv), [['0', '출력 낮춤'], ['1', '타력']])}</span>` : ''}`,
            dif:[T2ELS[el], ...(el !== 0 ? [`<b>${T2DRV[dv][1]}</b> ${T2DRV[dv][2]}`] : [])], more:el !== 0 ? T2DRV[dv][3] : '', use:'내구 에너지 상한'}),
    tog('rg_on', rg, '회생 제동', '제동 에너지 회수', '뒤축 제동 몫을 모터가 회수 (토크 · 충전 전류 한계)', '마찰 브레이크만', '모터 축 토크 ≤ min(회생 토크 상한, 그 회전수의 최대 토크 · 인버터 한계), 충전 전류 ≤ 팩 충전 전류 한계, 나머지는 마찰 브레이크. 저속 회생 차단 · 회생 토크 곡선은 넣지 않습니다.', '회생 토크 상한 · 충전 전류 한계'),
  ].join(''); }
/* 편집 탭 [냉각]: 외기 · 냉각수 등가값 + 도구 9 와 주고받기 (회로 설계는 도구 9 냉각 계통 계산기) */
function t2CoolLite(){ const o = WB.id==='2' && WB.R && WB.R.out, ok = o && isFinite(o.c_qm), f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—', lp = T2.lap[T2.course] || '1';
  const n9 = WB.I.cw_mode === 1;
  return `<div class="t2-coolq"><div class="t2-cq"><b>수랭 방식</b> <span class="dc-seg" role="group">${[[0, '부품별 독립'], [1, '냉각 회로']].map(([v, t]) => `<button type="button" data-t2cwm="${v}" aria-pressed="${(n9 ? 1 : 0)===v}">${t}</button>`).join('')}</span>
      <ul class="t2c-dif"><li><b>부품별 독립</b> 수랭 부품마다 자기 냉각수 · 라디 (아래 부품별 회로 값), 공랭 / 수랭은 모델 단계 카드에서</li>
        <li><b>냉각 회로</b> 아래 편집기로 그린 배치 (수랭 회로 · 직렬 · 병렬 갈라짐 · 합침 · 라디 여러 개 · 공랭 덕트). 앞 부품이 데운 냉각수 · 공기를 뒤 부품이 받음. 부품이 어디서 식는지도 배치가 정함</li></ul></div>
    ${n9 ? `<div class="t2-cq"><b>냉각 회로</b> <span class="muted">${t2CoolSum()} · 이 도구에만 저장 (도구 9 와 따로)</span>
      <div class="t2-cqb">${wbSrcGet('2', 't2:cool') ? `<span class="wb-src">${wbSrcGet('2', 't2:cool')}에서 복사함</span>` : ''}${wbEx() ? '<button type="button" class="btn small" data-t2cw9="def">기본 배치로</button>' : '<button type="button" class="btn small" data-t2cw9="def">비우기</button>'}</div>
      ${typeof t9CoolPage==='function' ? t9CoolPage() : ''}</div>` : ''}
    ${t2Consts('cool')}
    ${n9 ? '' : (rt => `<div class="t2-sub"><span class="muted">라디 표</span>${t2Seg('data-t2et', rt, T2RAD.map(k => [k, T2ET[k]]))}</div>${t2MapEdit(rt)}`)(T2RAD.includes(T2.etab) ? T2.etab : 'rqM')}
    <div class="t2-cq"><b>냉각 회로 설계 → 도구 9 냉각 계통 계산기</b>
      <p class="muted">같은 배치로 라디 · 펌프 선정 · 부품 정상 온도 계산. 주고받기는 윗줄 [도구 연결 ▾].</p>
      <div class="t2-cqb"><button type="button" class="btn small" data-t2to9="open">도구 9 열기</button></div>
      ${ok ? `<p class="muted">보낼 값 (${T2CN[T2.course] || ''}${lp==='all' ? ' · 전체 랩' : ` · ${lp}번째 랩`} 평균): 모터 손실 ${f(o.c_qm, 0)} W · 인버터 손실 ${f(o.c_qi, 0)} W · 축전지 발열 ${f(o.c_qb, 0)} W · 차속 ${f(o.c_vavg, 1)} km/h · 주행 시간 ${f(o.c_trun, 0)} s</p>` : ''}</div></div>`; }
document.addEventListener('click', e => { if(WB.id==='2' && e.target.closest && e.target.closest('[data-t2to4]') && WB_TOOLS['4']) wbOpen('4'); });
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return; const b = e.target.closest('[data-t2cwm]'); if(!b) return;
  e.stopPropagation(); WB.I.cw_mode = +b.dataset.t2cwm; wbSave(); wbPaint(['ext', 'in']); wbCalcSoon(); }, true);
/* 카드 (role=radio · switch): Enter · Space 로도 고름 · 켬 · 끔 */
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest || !e.target.closest('[data-t2stabx]')) return; T2.stab = []; wbSrcDel('2', 't2:stab'); t2Save(); wbPaint(['in', 'ext']); wbCalcSoon(); toast('조향각 표를 지웠습니다 (100 % 애커먼 · 일정 조향비로).'); });
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest || !e.target.closest('[data-t2stabd]')) return; T2.stab = T2STAB_DEF.map(r => r.slice()); wbSrcDel('2', 't2:stab'); t2Save(); wbPaint(['in', 'ext']); wbCalcSoon(); toast('조향각 표를 기본값 (2024 REF4 STEP 링크 기하) 으로 되돌렸습니다.'); });
document.addEventListener('keydown', e => { if(WB.id!=='2' || (e.key!=='Enter' && e.key!==' ') || !e.target.matches || !e.target.matches('.t2c[role]')) return; e.preventDefault(); e.target.click(); });
/* 냉각 회로: 도구 9 에서 복사 · 기본 배치, 카드의 [회로 편집] = 편집 탭 [냉각] 으로 */
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return;
  const g = e.target.closest('[data-t2gocool]'); if(g){ T2.tab = 'edit'; T2.etab = 'cool'; t2Save(); wbPaint(['ext']); return; }
  const b = e.target.closest('[data-t2cw9]'); if(!b) return;
  if(b.dataset.t2cw9==='get'){ if(typeof T9==='undefined') return; t2Cwc().cool = JSON.parse(JSON.stringify(T9.cool)); toast('도구 9 의 냉각 배치를 복사했습니다 (이제부터 따로 고침).'); }
  else if(typeof T9COOL_DEF==='function'){ t2Cwc().cool = wbEx() ? T9COOL_DEF() : T9COOL_NEW(); wbSrcDel('2', 't2:cool'); }
  t2Save(); wbPaint(['ext', 'in']); wbCalcSoon(); });
/* 축전지 셀 표: 도구 4 에서 복사 (그 뒤로는 따로) */
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest || !e.target.closest('[data-t2b4]')) return;
  const C4 = typeof t4CellGet==='function' ? t4CellGet() : null; if(!C4 || !(C4.o || C4.r || C4.c)){ toast('도구 4 에 셀 표가 없습니다 (도구 4 [셀 표]에서 넣으면 가져올 수 있음).'); return; }
  T2.bO = C4.o || ''; T2.bR = C4.r || ''; T2.bC = C4.c || ''; t2Save(); toast('도구 4 의 셀 표를 복사했습니다 (OCV · 내부저항 · 용량).'); wbPaint(['ext', 'in']); wbCalcSoon(); });
/* 내 코스 주행 성격: 기록 주행 (k_e = 1) / 내구 주행 (현실 운전자면 k_e 적용) */
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return; const b = e.target.closest('[data-t2fend]'); if(!b) return;
  T2.free.end = +b.dataset.t2fend === 1 ? 1 : 0; t2Save(); wbPaint(['ext']); wbCalcSoon(); });
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return; const b = e.target.closest('[data-t2to9]'); if(!b || b.disabled) return; if(b.dataset.t2to9==='send' && wbExBlock()) return;
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
  if(grp==='dt') return t2Consts('dt') + t2MapEdit('eD');   /* 구동계 효율: 상수 또는 맵 (모터 회전수 × 모터 토크) */
  if(grp==='bat'){ const bt = T2BAT.includes(et) ? et : 'bO';
    return t2Consts('bat') + `<div class="t2-sub"><span class="muted">셀 표</span>${t2Seg('data-t2et', bt, T2BAT.map(k => [k, T2ET[k]]))}</div>` + t2MapEdit(bt); }
  return t2Consts(grp); }

/* ---------- [입력하기 ▾] 메뉴: 표 k = track · mt · eM · eI · tire.  on = false 면 회색으로 막음 */
function t2MenuHTML(k, label, on){ const tpl = k==='track' ? 'track' : k==='mt' ? 'motor' : k==='tire' ? 'tire' : k==='bO' ? 'bocv' : k==='bR' ? 'bres' : k==='bC' ? 'bcap' : k==='dM' || k==='dI' ? 'der' : T2RAD.includes(k) ? 'rad' : 'eff';
  const items = [`<label class="t2-mi">파일 가져오기 (.xlsx · .csv)<input type="file" accept=".xlsx,.csv,.txt,.tsv" data-t2file="${k}" hidden></label>`,
    `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.xlsx">양식 받기 (.xlsx)</button>`, `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.csv">양식 받기 (.csv)</button>`,
    k==='track' && wbEx() ? `<button type="button" data-t2act="ex" data-t2k="track">예시 코스로</button>` : '',
    k==='mt' && wbEx() ? `<button type="button" data-t2act="ex" data-t2k="mt">예시 곡선으로</button>` : '', k==='eM' && wbEx() ? `<button type="button" data-t2act="ex" data-t2k="eM">예시 효율 맵으로</button>` : '',
    `<button type="button" data-t2act="clear" data-t2k="${k}">${k==='track' ? '비우기 (내 코스 없음)' : '비우기 (왼쪽 상수 칸 사용)'}</button>`].filter(Boolean);
  return `<div class="t2-menu"><button type="button" class="btn small" data-t2menu="${k}" aria-expanded="${T2.menu===k}"${on ? '' : ' disabled title="공식 코스는 고칠 수 없습니다"'}>${label} ▾</button>${T2.menu===k && on ? `<div class="t2-mn" role="menu">${items.join('')}</div>` : ''}</div>`; }

/* ============================================================ 맵 편집: 코스 */
const T2INFO = {
  free: () => '랩 수가 2 이상이거나 출발 위치가 0이 아니면 끝을 처음에 이어 붙인 닫힌 코스로 계산합니다. 1번째 랩은 정지 출발, 2번째부터 앞 랩 끝 속도를 이어받습니다. 주행 성격 = 현실 운전자의 내구 페이스 k<sub>e</sub> 적용 여부 (내구 주행만 적용).',
  ax:   () => '공식 내구 코스를 거꾸로 한 바퀴, 정지 출발.',
  end:  () => `FSK 2026 공식 코스 × ${FSK26.laps}랩 = ${wbFmt(FSK26.len*FSK26.laps/1000, 2)} km. 드라이버당 ${FSK26.stint}랩, 각 드라이버 정지 출발(1 · ${FSK26.stint + 1}번째 랩), 교체 시간 제외. 랩마다 SOC가 줄고 모터 온도가 오릅니다.`,
  acc:  () => '직선 75 m, 정지 출발.',
  skid: () => `8자 코스 (두 원 중심 거리 18.25 m, 안쪽 지름 15.25 m · 바깥 21.25 m, 주행로 폭 3 m, 콘 안쪽 16 · 바깥 13개, FSAE D.10.1). 주행 반경 ${wbFmt(t2SkR(), 2)} m = 주행선에 따라 (중심 9.125 m · 최소 곡률 = 바깥 끝 · 레코드 = 한 바퀴가 가장 빠른 반경, 차 폭 · 여유 안에서). 기록 = 오른쪽 한 바퀴 + 왼쪽 한 바퀴 (일정 반경이라 정상 선회 속도로 계산).` };
/* 코스 → 표 행 {l 길이 m, R 반경 m (왼쪽 +), note} */
function t2CourseRows(c){
  if(c==='free') return t2Track(T2.free.text).rows;
  const B = t2ConeBounds(), N = FSK26.seg.length, W = (a, i) => (a[i] + a[(i + 1) % N]) / 2, sl = new Set(B.slalom);   // 공식 코스: 폭 = 실제 콘 위치로 잡은 경계 (구간 양 끝 평균), 콘 = 구간 시작 부근 슬라럼 콘
  if(c==='end') return FSK26.seg.map(([l, R], i) => ({l, R, wl:W(B.WL, i), wr:W(B.WR, i), cone:sl.has(i), note:''}));
  if(c==='ax')  return FSK26.seg.map((_, k) => { const i = N - 1 - k, [l, R] = FSK26.seg[i]; return {l, R:-R, wl:W(B.WR, i), wr:W(B.WL, i), cone:sl.has((i + 1) % N), note:''}; });
  if(c==='acc') return [{l:75, R:0, note:'가속 구간'}];
  const SR = t2SkR(), C2 = 2*Math.PI*SR;
  return [{l:15, R:0, note:'진입'}, {l:C2, R:-SR, note:'오른쪽 1바퀴'}, {l:C2, R:-SR, note:'오른쪽 2바퀴 (기록)'}, {l:C2, R:SR, note:'왼쪽 1바퀴'}, {l:C2, R:SR, note:'왼쪽 2바퀴 (기록)'}, {l:15, R:0, note:'탈출'}]; }
/* 스키드패드 주행 반경: 계산 결과 (주행선 · 차 크기) 가 있으면 그 값, 없으면 가운데 9.125 m */
const t2SkR = () => { const o = WB.id==='2' && WB.R && WB.R.out; return o && isFinite(o.sk_r) ? o.sk_r : 9.125; };
const t2LapsOf = c => c==='free' ? T2.free.laps : c==='end' ? FSK26.laps : 1;
function t2LapSel(){ const c = T2.course, n = t2LapsOf(c), cur = n > 1 ? (T2.lap[c] || '1') : '1';
  const o = n > 1 ? [['all', '전체'], ...Array.from({length:n}, (_, i) => [String(i + 1), `${i + 1}번째 랩${c==='end' && (i===0 || i===FSK26.stint) ? ' (정지 출발)' : ''}`])] : [['1', '1번째 랩']];
  return `<select data-t2lap${n > 1 ? '' : ' disabled'}>${o.map(([k, t]) => `<option value="${k}"${cur===k ? ' selected' : ''}>${t}</option>`).join('')}</select>`; }
function t2CourseEdit(){ const c = T2.ecourse, own = c==='free', rows = t2CourseRows(c);   // 편집 탭 코스 = 시뮬레이션 코스와 따로 (바꿔도 계산 안 함)
  return `<div class="t2-set">${t2Seg('data-t2ecourse', c, T2COURSES.map(k => [k, T2CN[k]]))}
      <label>랩 수 <input type="number" min="1" step="1" data-t2o="laps" value="${t2LapsOf(c)}"${own ? '' : ' disabled'}></label>
      <label>출발 위치 <input type="number" min="0" step="any" data-t2o="s0" value="${own ? T2.free.s0 : 0}"${own ? '' : ' disabled'}> m</label>
      ${own ? `<span class="t2-fend" title="현실 운전자일 때: 기록 주행 = k_s 만, 내구 주행 = k_s × k_e"><span class="muted">주행 성격</span>${t2Seg('data-t2fend', T2.free.end === 1 ? '1' : '0', [['0', '기록 주행'], ['1', '내구 주행']])}</span>` : ''}
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
/* 표를 처음 채우면 그 표를 쓰도록 [표] 로 (기본은 상수, 2026-11-11) */
const t2UseAuto = (k, had) => { if(k!=='mt' && !had && t2HasMap(k)) T2.use[k] = 'tab'; };
function t2MtSet(k, txt){ const had = t2HasMap(k); wbSrcDel('2', 't2:' + k); if(k==='mt') T2.mtext = txt; else T2[k] = txt; t2UseAuto(k, had); t2Repaint(); t2Soon(); wbPaint(['in']); }
function t2GridEdit(r, c, v){ const k = T2.etab, g = t2Grid(t2MtText(k)); if(!g[r]) return; g[r][c] = String(v).trim(); t2MtSet(k, t2GridText(g)); }
const T2ERULE = {
  mt:   '1열 회전수 rpm · 2열 피크 토크 · 3열 연속 토크 N·m. 위 [모터 표 기준 전압]에서 잰 곡선을 축전지 단자 전압과 유도 전압 비로 늘이고 줄입니다. 한 열만 있으면 다른 열은 위 [연속 ÷ 피크 토크 비율]로 채웁니다 (100 % = 디레이팅 없음). 디레이팅은 모델 단계에서 모터 열을 켤 때만: 시작 온도에서 피크, 끝 온도부터 연속 토크, 그 사이는 회전수마다 같은 비율로 보간.',
  eM:   '첫 행 = 회전수 rpm, 첫 열 = 토크 N·m, 칸 = 효율 %. 숫자 하나면 상수. 비우면 위 [모터 효율] 상수 칸. 모터 손실(열)은 이 효율로 계산합니다.',
  eI:   '첫 행 = 회전수 rpm, 첫 열 = 토크 N·m, 칸 = 효율 %. 숫자 하나면 상수. 비우면 위 [인버터 효율] 상수 칸. 모터 × 인버터 효율을 곱해 쓰므로, 합친 맵을 모터에 넣고 인버터를 100 으로 둬도 같습니다.',
  bO:   '첫 행 = 셀 온도 °C, 첫 열 = SOC %, 칸 = 셀 개방 전압 V. 팩 개방 전압 = 직렬 수 × OCV(SOC, 축전지 온도). 비우면 위 셀 최대 · 최소 전압 사이 직선.',
  bR:   '첫 행 = 셀 온도 °C, 첫 열 = SOC %, 칸 = 셀 내부저항 mΩ. 팩 내부저항 = [팩 내부저항] × R(SOC, 온도) ÷ R(50 %, 25 °C) (표의 모양만 씀, 도구 4 추가 저항까지 같은 배율). 쓰면 축전지 열 모델의 [저항 온도 계수]는 안 씀. 비우면 위 팩 내부저항 (+ 온도 계수).',
  eD:   '첫 행 = 모터 회전수 rpm, 첫 열 = 모터 토크 N·m, 칸 = 구동계 효율 % (감속기 · 체인 · 등속 조인트 합). 표 사이는 선형 보간. 기어 손실은 토크에 비례하는 맞물림 손실 + 회전수에 따른 무부하 손실(오일 · 베어링 · 씰)이라 저토크 · 고회전에서 낮아짐.',
  dM:   '한 행에 모터 온도 °C · 디레이팅 % (0 = 피크 토크 곡선 그대로, 100 = 연속 토크 곡선까지 내림). 표 사이 직선, 끝 밖은 끝 값. 데이터시트의 온도별 허용 토크 곡선을 이 비율로 옮겨 넣음.',
  dI:   '한 행에 인버터 온도 °C · 디레이팅 % (0 = 피크 상전류 그대로, 100 = 연속 상전류까지 내림). 표 사이 직선, 끝 밖은 끝 값.',
  bC:   '한 행에 셀 온도 °C · 용량 Ah. SOC 가 줄어드는 양 = 소비 ÷ (직렬 × 병렬 × 용량(랩 시작 축전지 온도) × 공칭 전압). 에너지 상한 [제원 용량]은 위 셀 용량 그대로. 비우면 위 셀 용량.',
  ...Object.fromEntries(['rqM', 'rqI', 'rqB'].map(k => [k, '첫 행 = 냉각수 유량 L/min, 첫 열 = 코어 풍속 m/s (주행풍 + 팬 ÷ 코어 앞면 면적), 칸 = 방열량 kW (스펙 시트 값), 위 [표의 입구 온도차] = 그 표를 잰 냉각수 입구 − 공기 입구 온도. 점마다 ε = Q ÷ (C_min × 입구 온도차) → 교차류 ε-NTU 로 UA 를 거꾸로 구해 풍속 · 유량 사이를 이중선형 (범위 밖은 끝값). 비우면 위 [UA] × (풍속 ÷ 5)^0.6.'])),
  tire: '한 행에 바퀴 하나 수직 하중 N · 그때 μ (사이는 직선 보간, 범위 밖은 끝값). 숫자 하나면 하중과 상관없는 μ. 비우면 위 [타이어 마찰계수] · [μ 하중 감도].' };
/* 맵에 읽을 값이 있는지 (머리 행만 남은 표도 '비어 있음') · 계산에 표를 쓰는지 */
const t2HasMap = k => { const t = t2MtText(k); return k==='mt' ? (P => P.pts.length + P.ptsC.length > 0)(t2MotorParse(t)) : k==='tire' ? !!t2TireParse(t).map : k==='bO' || k==='bR' || T2RAD.includes(k) ? !!t2GridParse(t).map : k==='bC' ? !!t2PairParse(t).map : k==='dM' || k==='dI' ? !!t2DerParse(t).map : !!t2EffParse(t).map; };
const t2UseMap = k => t2HasMap(k) && (k==='mt' || T2.use[k]!=='const');
const t2UseSel = k => k==='mt' || T2.use[k]==='tab' ? 'tab' : 'const';   // 사용자가 고른 쪽 (표가 비어 있어도 [아래 표]면 'tab')   // 모터 토크는 늘 표
const T2MTITLE = {eD:'구동계 효율 맵 — 모터 회전수 × 모터 토크, 채우면 [아래 표]로 위 [구동계 효율] 대신 씀', dM:'모터 디레이팅 표 — 모터 온도별 디레이팅 %, 채우면 [아래 표]로 위 [디레이팅 시작 · 끝 온도] 직선 대신 씀', dI:'인버터 디레이팅 표 — 인버터 온도별 디레이팅 %, 채우면 [아래 표]로 위 직선 대신 씀', mt:'모터 토크 곡선 표 — 회전수별 피크 · 연속 토크 (모터 토크는 늘 이 표로 계산)', eM:'모터 효율 맵 — 채우고 [아래 표]를 고르면 위 [모터 효율 (상수)] 대신 씀',
                  eI:'인버터 효율 맵 — 채우고 [아래 표]를 고르면 위 [인버터 효율 (상수)] 대신 씀', tire:'타이어 하중 감도 표 — 채우고 [아래 표]를 고르면 위 [타이어 μ] · [μ 하중 감도] 대신 씀', bO:'셀 OCV 표 — SOC × 셀 온도, 채우고 [아래 표]를 고르면 셀 전압 직선 대신 씀',
                  bR:'셀 내부저항 표 — SOC × 셀 온도, 채우고 [아래 표]를 고르면 팩 내부저항에 이 모양을 곱함', bC:'셀 용량 표 — 셀 온도별 용량, 채우고 [아래 표]를 고르면 SOC 계산에 씀',
                  ...Object.fromEntries([['rqM', '모터'], ['rqI', '인버터'], ['rqB', '축전지']].map(([k, nm]) => [k, `${nm} 회로 라디 표 — 코어 풍속 × 냉각수 유량별 방열량 (스펙 시트), 채우고 [아래 표]를 고르면 위 [UA] 대신 씀`]))};
/* 이 표를 계산이 아예 안 쓰는 경우 (다른 선택 때문에): 까닭, 아니면 '' (2026-11-11) — 표 · [아래 표 | 위 상수] 모두 꺼짐, 필수에서도 빠짐 */
function t2MapOff(k){ const I = WB.I, th = t2Th();
  if(k==='eI' && I.eff_mg===1) return '인버터 효율을 모터 맵에 합침';
  if(k==='dM' && !th.m) return '모터 열 끔';
  if(k==='dI' && !th.i) return '인버터 온도 끔';
  if(T2RAD.includes(k)){ const p = {rqM:'m', rqI:'i', rqB:'b'}[k]; if(th.n9) return '냉각 회로 방식'; if(!th.w) return I.cw_on===1 ? '수랭 부품 없음' : '냉각수 온도 끔 (고정)';
    if(!(p==='m' ? th.m && th.mW : p==='i' ? th.iW : th.b && th.bW)) return {m:'모터', i:'인버터', b:'축전지'}[p] + ' 수랭 아님'; }
  return ''; }
function t2MapEdit(k){ const txt = t2MtText(k), has = t2HasMap(k), empty = !t2UseMap(k), off = k!=='mt' ? t2MapOff(k) : '';
  if(off) return `<div class="t2-mth"><b>${T2MTITLE[k].split(' — ')[0]}</b><span class="muted"> — ${T2MTITLE[k].split(' — ')[1]}</span></div><div class="t2-mfold off"><b>표 꺼짐</b><span>${off} → 이 표는 계산에 쓰지 않음${has ? ' (표 값은 남아 있음)' : ''}</span></div>`;
  const msg = k==='mt' ? t2MotorMsg(t2MotorParse(txt)) : k==='tire' ? (t2TireParse(txt).msg || '비어 있음') : T2RAD.includes(k) ? (t2GridParse(txt, 'kW').msg || '비어 있음').replace('셀 온도', '냉각수 유량').replace('SOC', '코어 풍속') : k==='bO' ? (t2GridParse(txt, 'V').msg || '비어 있음') : k==='bR' ? (t2GridParse(txt, 'mΩ').msg || '비어 있음') : k==='bC' ? (t2PairParse(txt).msg || '비어 있음') : k==='dM' || k==='dI' ? (t2DerParse(txt).msg || '비어 있음') : (t2EffParse(txt).msg || '비어 있음');
  const useSeg = k==='mt' ? '' : `<span class="t2-use"><span class="muted">계산에 쓸 값</span>${t2Seg('data-t2use', t2UseSel(k), [['tab', '아래 표'], ['const', '위 상수']]).replace('<span class="dc-seg"', `<span class="dc-seg" data-t2uk="${k}"`)}</span>`;
  /* 표가 비어 있으면 (위 상수를 씀) 아래 표 · 그림은 접어 둠 (2026-11-11). 모터 토크는 늘 표라 접지 않음 */
  /* [위 상수]를 고르면 아래 표 · 그림은 접음 (값이 있어도), [아래 표]를 고르면 펼침 (비어 있으면 새 파일에서 필수 칸) (2026-11-11) */
  const fold = k!=='mt' && t2UseSel(k)==='const', op = fold && (T2.mopen || {})[k];
  return `<div class="t2-mth"><b>${T2MTITLE[k].split(' — ')[0]}</b>${wbSrcTag('2', 't2:' + k)}<span class="muted"> — ${T2MTITLE[k].split(' — ')[1]}</span>${useSeg}</div>
    ${fold ? `<div class="t2-mfold off" data-t2mf="${k}"><b>표 꺼짐</b><span>[위 상수] 사용 중 · ${t2ConstNote(k)}${has ? ' · 표 값은 남아 있음 ([아래 표]를 누르면 다시 씀)' : ' · 표를 쓰려면 [아래 표]'}</span></div>` : `
    <div class="t2-set"><span class="t2-sum" id="t2msum">${msg}</span></div><p class="t2-rule muted">${T2ERULE[k]}</p>
    ${t2Pair(t2MenuHTML(k, '입력하기', true), `<div class="t2-tw" id="t2tt" data-wbneed="t2:${k}">${t2GridTable(k, txt)}</div>`,
      empty ? `<span class="t2-const">${k==='mt' ? '표가 비어 있어 계산할 수 없습니다 · 피크 또는 연속 토크 열을 채우세요' : (t2UseSel(k)==='tab' ? '[아래 표]를 골랐는데 표가 비어 있습니다 · 표를 채우거나 [위 상수]를 고르세요' : `[위 상수]를 골라 위 상수 칸을 씁니다 · ${t2ConstNote(k)}`)}</span>` : '<span class="muted">그림을 누르면 표에서 그 칸으로 갑니다</span>',
      `<div class="t2-fbox" id="t2mc">${t2EditPlot(k)}</div>`, t2EditCap(k))}`}`; }   /* [위 상수]면 표 · 그림은 아예 안 그림 (열 수도 없음, 2026-11-11) */
document.addEventListener('toggle', e => { const d = e.target; if(!d || !d.matches || !d.matches('details[data-t2mf]')) return; (T2.mopen = T2.mopen || {})[d.dataset.t2mf] = d.open; }, true);
/* 표가 비었을 때 쓰는 상수 */
function t2ConstNote(k){ const I = WB.I;
  if(T2RAD.includes(k)){ const P = {rqM:'cw_', rqI:'i_w', rqB:'b_w'}[k]; return `UA ${wbFmt(I[P + 'ua'], 0)} W/K (코어 풍속 5 m/s) × (풍속 ÷ 5)^0.6`; }
  if(k==='bO') return `셀 ${wbFmt(I.c_vmin, 2)} ~ ${wbFmt(I.c_vmax, 2)} V 직선 (SOC 0 ~ 100 %)`; if(k==='bR') return `팩 내부저항 ${wbFmt(I.r_pack, 0)} mΩ${WB.I.bt_on === 1 ? ` × 온도 계수 ${wbFmt(I.b_alpha, 3)} /°C` : ''}`; if(k==='bC') return `셀 용량 ${wbFmt(I.c_ah, 2)} Ah 일정`; if(k==='eD') return `구동계 효율 ${wbFmt(I.eta_dt, 1)} % 일정`; if(k==='dM') return `모터 ${wbFmt(I.dr_t0, 0)} → ${wbFmt(I.dr_t1, 0)} °C 사이 직선 (피크 → 연속)`; if(k==='dI') return `인버터 ${wbFmt(I.di_t0, 0)} → ${wbFmt(I.di_t1, 0)} °C 사이 직선 (피크 → 연속)`;
  return k==='mt' ? `모터 최대 토크 ${wbFmt(I.tmax, 0)} N·m 일정` : k==='eM' ? `모터 효율 ${wbFmt(I.eta_mot, 1)} %` : k==='eI' ? `인버터 효율 ${wbFmt(I.eta_inv, 1)} %` : `μ ${wbFmt(I.mu, 2)} · 하중 감도 ${wbFmt(I.mu_s, 3)} 1/kN`; }
function t2MotorMsg(M){ const P = M.pts.length ? M.pts : M.ptsC, c = Math.max(1, Math.min(100, WB.I.c_pct || 100)), mx = a => Math.max(...a.map(p => p[1]));
  if(!P.length) return '비어 있음 → 계산할 수 없음 (피크 또는 연속 토크를 넣으세요)';
  return `${P.length}점 · ${wbFmt(P[0][0], 0)} ~ ${wbFmt(P[P.length-1][0], 0)} rpm · ${M.pts.length ? `피크 ${wbFmt(mx(M.pts), 1)} N·m` : `피크 = 연속 ÷ ${wbFmt(c, 0)} %`} · ${M.ptsC.length ? `연속 ${wbFmt(mx(M.ptsC), 1)} N·m` : `연속 = 피크 × ${wbFmt(c, 0)} %`}`; }
/* 칸 표: 행 지우기 ×(행 끝) · [+ 행](표 아래 한 행) · 맵은 열 지우기 ×(맨 아래 행) · [+ 열](표 오른쪽 한 열) */
function t2GridTable(k, txt){ const g = t2Grid(txt), rd = T2RAD.includes(k), map = k==='eM' || k==='eI' || k==='eD' || k==='bO' || k==='bR' || rd, bm = k==='bO' || k==='bR';
  const addRow = n => `<tr class="t2-addr"><td colspan="${n}"><button type="button" data-t2gadd="row">+ 행${rd ? ' (코어 풍속)' : bm ? ' (SOC)' : map ? ' (토크)' : ''}</button></td></tr>`;
  if(!g.length) return `<table class="t2-tt t2-gtab" data-t2gk="${k}"><tbody><tr><td class="t2-empty muted">비어 있습니다. 엑셀 표를 복사해 이 표를 누르고 Ctrl+V, 또는 아래 [+ 행] · [입력하기]의 파일 가져오기.</td></tr>${addRow(1)}</tbody></table>`;
  const head = !isFinite(parseFloat(g[0][0])) || (map && g.length > 1), rows = head ? g.slice(1) : g, off = head ? 1 : 0, nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  const cell = (r, c, v, th) => `<${th ? 'th' : 'td'} class="t2-e${c===0 && map && !th ? ' t2-rh' : ''}" data-t2e="${r},${c}" data-t2g="1" tabindex="0">${wbEsc(v ?? '')}</${th ? 'th' : 'td'}>`;
  const nr = (head ? 1 : 0) + rows.length + (map ? 1 : 0);
  const addCol = map ? `<th class="t2-addc" rowspan="${nr}"><button type="button" data-t2gadd="col">+ 열<br><span>(${rd ? '유량' : bm ? '온도' : '회전수'})</span></button></th>` : '';
  const x = (i, lab) => `<td class="t2-xc"><button type="button" class="t2-x" data-t2gdel="${i}" aria-label="${lab} 지우기" title="${lab} 지우기">×</button></td>`;
  // 머리 행도 tbody 안에 둠: [+ 열] 칸의 rowspan 이 행 묶음(thead · tbody)을 넘지 못하므로
  return `<table class="t2-tt t2-gtab${map ? ' map' : ''}" data-t2gk="${k}"><tbody>${head ? `<tr class="t2-hrow">${Array.from({length:nc}, (_, c) => cell(0, c, g[0][c], true)).join('')}<th class="t2-xc"></th>${addCol}</tr>` : ''}
    ${rows.map((r, i) => `<tr data-t2row="${i + off}">${Array.from({length:nc}, (_, c) => cell(i + off, c, r[c])).join('')}${x(i + off, `${i + 1}번 행`)}${!head && i===0 ? addCol : ''}</tr>`).join('')}
    ${map ? `<tr class="t2-delc"><td class="t2-xc"></td>${Array.from({length:nc - 1}, (_, c) => `<td class="t2-xc"><button type="button" class="t2-x" data-t2gdelc="${c + 1}" aria-label="${c + 1}번 열 지우기" title="${c + 1}번 열 (${wbEsc(g[0][c + 1] ?? '')} ${rd ? 'L/min' : bm ? '°C' : 'rpm'}) 지우기">×</button></td>`).join('')}<td class="t2-xc"></td></tr>` : ''}
    ${addRow(nc + 1 + (map ? 1 : 0))}</tbody></table>`; }
/* 빈 표에 [+ 행 · 열]: 머리 행부터 만듦 */
const T2HEAD = {mt:['회전수 rpm', '피크 토크 N·m', '연속 토크 N·m'], tire:['하중 N', 'μ'], bO:['SOC % \\ 셀 온도 °C', '25'], bR:['SOC % \\ 셀 온도 °C', '25'], bC:['셀 온도 °C', '용량 Ah'], eM:['토크 N·m \\ 회전수 rpm', '0'], rqM:['코어 풍속 m/s \\ 유량 L/min', '8'], rqI:['코어 풍속 m/s \\ 유량 L/min', '8'], rqB:['코어 풍속 m/s \\ 유량 L/min', '8'], eI:['토크 N·m \\ 회전수 rpm', '0'], eD:['모터 토크 N·m \\ 모터 회전수 rpm', '0'], dM:['모터 온도 °C', '디레이팅 %'], dI:['인버터 온도 °C', '디레이팅 %']};
function t2GridAdd(k, what){ const g = t2Grid(t2MtText(k)); if(!g.length) g.push(T2HEAD[k].slice());
  const nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  if(what==='col'){ g.forEach(r => { while(r.length < nc) r.push(''); r.push(''); }); }
  else g.push(Array.from({length:nc}, () => ''));
  t2MtSet(k, t2GridText(g)); const tw = $('#t2tt'); if(tw){ if(what==='col') tw.scrollLeft = tw.scrollWidth; else tw.scrollTop = tw.scrollHeight; } }
function t2GridDelCol(k, c){ const g = t2Grid(t2MtText(k)); if(c < 1) return; g.forEach(r => { if(r.length > c) r.splice(c, 1); }); t2MtSet(k, t2GridText(g.filter(r => r.some(v => String(v).trim()!=='')))); }
/* 오른쪽 그림 */
function t2EditPlot(k){ const R = WB.id==='2' ? WB.R : null, I = WB.I;
  if(k==='bO' || k==='bR'){ const M = t2GridParse(t2MtText(k)).map, soc = Array.from({length:21}, (_, i) => i*5);
    if(!M) return `<div class="t2-fconst">${t2ConstNote(k)}</div>`;
    const bl = (Tc, s) => { const f = (a, x) => { if(x <= a[0]) return [0, 0, 0]; const q = a.length - 1; if(x >= a[q]) return [q, q, 0]; let i = 0; while(a[i + 1] < x) i++; return [i, i + 1, (x - a[i])/(a[i + 1] - a[i])]; };
      const [j0, j1, u2] = f(M.n, Tc), [i0, i1, w] = f(M.t, s), e = M.e; return (e[i0][j0]*(1 - u2) + e[i0][j1]*u2)*(1 - w) + (e[i1][j0]*(1 - u2) + e[i1][j1]*u2)*w; };
    return wbPlot({id:'t2bat', w:560, h:330, hit:false, x:{d:soc, n:'SOC', u:'%'}, ys:M.n.slice(0, 6).map((Tc, j) => ({k:'t' + j, d:soc.map(s => bl(Tc, s)), c:WB_COL[j % WB_COL.length], n:`${wbFmt(Tc, 0)} °C`, u:k==='bO' ? 'V' : 'mΩ', dd:k==='bO' ? 3 : 1})), label:T2ET[k]}); }
  if(T2RAD.includes(k)){ const M = t2GridParse(t2MtText(k)).map; if(!M) return `<div class="t2-fconst">${t2ConstNote(k)}</div>`;
    const vs = M.t.length > 1 ? Array.from({length:21}, (_, i) => M.t[0] + (M.t[M.t.length - 1] - M.t[0])*i/20) : M.t, bl = (f, v) => coolBil(M.t, M.n, M.e, v, f);
    return wbPlot({id:'t2rad', w:560, h:330, hit:false, x:{d:vs, n:'코어 풍속', u:'m/s'}, ys:M.n.slice(0, 6).map((f, j) => ({k:'q' + j, d:vs.map(v => bl(f, v)), c:WB_COL[j % WB_COL.length], n:`${wbFmt(f, 1)} L/min`, u:'kW', dd:2})), label:T2ET[k]}); }
  if(k==='dM' || k==='dI'){ const M = t2DerParse(t2MtText(k)).map; if(!M) return `<div class="t2-fconst">${t2ConstNote(k)}</div>`;
    const T = Array.from({length:41}, (_, i) => 20 + i*3), f = x => x <= M.t[0] ? M.r[0] : x >= M.t[M.t.length-1] ? M.r[M.r.length-1] : (j => M.r[j-1] + (M.r[j]-M.r[j-1])*(x-M.t[j-1])/(M.t[j]-M.t[j-1]))(M.t.findIndex(t => t >= x));
    return wbPlot({id:'t2der', w:560, h:330, hit:false, x:{d:T, n:k==='dM' ? '모터 온도' : '인버터 온도', u:'°C'}, ys:[{k:'r', d:T.map(f), c:WB_COL[0], n:'디레이팅 (0 = 피크 · 100 = 연속)', u:'%', dd:0}], label:T2ET[k]}); }
  if(k==='bC'){ const M = t2PairParse(t2MtText(k)).map; if(!M) return `<div class="t2-fconst">${t2ConstNote(k)}</div>`;
    const T = Array.from({length:31}, (_, i) => -10 + i*2); return wbPlot({id:'t2bcap', w:560, h:330, hit:false, x:{d:T, n:'셀 온도', u:'°C'}, ys:[{k:'c', d:T.map(x => tab1j(M, x)), c:WB_COL[0], n:'셀 용량', u:'Ah', dd:2}], label:'셀 용량'}); }
  if(k==='tire'){ const M = t2TireParse(T2.tire).map, Z = t2TireZ(M), mu = Z.map(z => M ? tab1j(M, z) : Math.max(0, I.mu - I.mu_s*z/1000));
    return wbPlot({id:'t2tire', w:560, h:330, hit:'t2-pick', x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:'', dd:2}, {k:'fy', d:Z.map((z, i) => mu[i]*z), c:WB_COL[2], n:'낼 수 있는 힘 μ·Fz', u:'N', dd:0}], label:'타이어 하중 감도'}); }
  if(k==='eM' || k==='eI' || k==='eD'){ const E = t2EffParse(t2MtText(k)); if(!E.map || t2Grid(t2MtText(k)).length < 2) return `<div class="t2-fconst">${E.map ? E.msg : `${k==='eM' ? '모터' : k==='eI' ? '인버터' : '구동계'} 효율 ${wbFmt(I[k==='eM' ? 'eta_mot' : k==='eI' ? 'eta_inv' : 'eta_dt'], 1)} %`}<br><span class="muted">회전수 · 토크와 상관없이 일정</span></div>`;
    return t2Heat(E.map); }
  if(!R || !R.motor) return wbSkel('plot'); const M = R.motor, kw = T => M.n.map((n, i) => T[i]*n*2*Math.PI/60/1000);
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
  if(T2BAT.includes(k) || T2RAD.includes(k)) return '';
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
        <div class="t2-fbox t2-ftbox"><div id="t2ft">${T2.pf.html || wbSkel('plot')}</div><div class="t2-ftov" id="t2ftov" hidden></div></div><div id="t2ftv" class="t2-ftv">${T2.pf.note || ''}</div></section>
      <section class="wb-sec t2-mapw" aria-label="코스 지도"><div class="wb-h"><h3>코스 지도</h3>${T2ZB}</div>
        <div class="t2-fbox" id="t2map" data-zoombox="t2map">${t2MapSVG(false)}</div><div class="t2-ftv muted" id="t2mcap"></div></section></div>`; }

/* ---------- 구동력 선도 프로브: 프로브가 멈추면 그 점의 상태로 선도를 다시 계산 (계산은 별도 Worker) */
T2.pf = { html:'', note:'', timer:0, busy:false, want:null, w:null, src:'' };
function t2PfOverlay(t){ const o = $('#t2ftov'); if(!o) return; o.hidden = !t; o.textContent = t || ''; }
/* 같은 결과 · 같은 프로브 위치를 이미 그렸으면 다시 계산하지 않음 (편집 탭에 갔다가 아무것도 안 바꾸고 돌아올 때) */
function t2PfSoon(){ clearTimeout(T2.pf.timer); if(T2.tab!=='sim') return;
  if(T2.pf.html && T2.pf.lastR===WB.R && T2.pf.lastI===(WB.xi || 0)){ t2PfOverlay(''); return; }
  t2PfOverlay('프로브 이동 중…'); T2.pf.timer = setTimeout(t2PfRun, 400); }
function t2PfRun(){ const R = WB.R, S = R && R.sig; if(!S || !S.v || !S.voc){ t2PfOverlay(''); return; }
  const i = Math.max(0, Math.min(S.v.length - 1, WB.xi || 0)), g = 9.81;
  const st = {i, v:S.v[i], gr:R.out.c_gr, V:S.voc[i], Tm:S.tmot[i], ay:Math.abs(S.ay[i])*g, ax:S.ax[i]*g, axg:S.ax[i], tq:S.tq[i], tlim:S.tlim[i]};
  T2.pf.want = st; if(T2.pf.busy) return; t2PfOverlay('계산 중…');
  const code = wbCode(); if(!T2.pf.w || T2.pf.src!==code){ if(T2.pf.w) T2.pf.w.terminate(); T2.pf.src = code;
    T2.pf.w = new Worker(URL.createObjectURL(new Blob([code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false, e:String(err)}); } };'], {type:'text/javascript'}))); }
  T2.pf.busy = true; const ask = T2.pf.want, aR = WB.R, aI = WB.xi || 0;
  T2.pf.w.onmessage = e => { T2.pf.busy = false; if(e.data.ok){ t2PfDraw(ask, e.data.r.ft); T2.pf.lastR = aR; T2.pf.lastI = aI; } if(T2.pf.want!==ask) t2PfRun(); else t2PfOverlay(''); };
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
  else { const SR = t2SkR(), C2 = 2*Math.PI*SR; G = t2Pts([[15, 0], [C2, -SR], [C2, -SR], [C2, SR], [C2, SR], [15, 0]], 0.5, 0, -15, Math.PI/2);
    /* 두 원 중심은 늘 ±9.125 (규정 배치), 주행 원만 반경 SR (FSAE D.10.1: 안쪽 지름 15.25 · 바깥 21.25 m, 진입 · 탈출 3 m 폭).
       경계선: 안쪽 원 전체 + 바깥 원은 다른 원의 주행로 · 직진로(폭 3 m 전체)에 들어가지 않는 호만 + 진입 · 탈출 직진로 양쪽 선.
       콘: 안쪽 16 · 바깥 13 (그 호 위에 고르게). 오른쪽 원(시계 방향)은 안쪽 = 주행 방향 오른쪽 R, 바깥 = 왼쪽 L; 왼쪽 원(반시계)은 반대.
       직진로 경계와 바깥 원이 만나는 꼭짓점 4곳과 진입 · 탈출 직진로는 작은 주황 (FSG 핸드북 DE7.5.1 "Exit and entry lanes ... small orange cones") (2026-11-11) */
    const RI = 7.625, RO = 10.625, HW = 1.5, CX = 9.125, YV = Math.sqrt(RO*RO - (CX - HW)**2), TV = Math.PI - Math.atan2(YV, CX - HW), pc = 0.15, cones = [];
    const arc = (cx, a0, a1, r, n) => ({pl:Array.from({length:n + 1}, (_, k) => { const a = a0 + (a1 - a0)*k/n; return [cx + r*Math.cos(a), r*Math.sin(a)]; })});
    [1, -1].forEach(sg => { const cx = sg*CX, aOff = sg > 0 ? 0 : Math.PI;   // 왼쪽 원은 각도를 π 돌려 같은 식
      extra.push([cx, 0, RI]); extra.push(arc(cx, aOff - TV, aOff + TV, RO, 120));
      for(let k = 0; k < 16; k++){ const a = aOff + Math.PI + 2*Math.PI*k/16; cones.push([cx + (RI - pc)*Math.cos(a), (RI - pc)*Math.sin(a), sg > 0 ? 'R' : 'L']); }
      for(let k = 0; k < 13; k++){ const a = aOff - TV + 2*TV*(k + 1)/14; cones.push([cx + (RO + pc)*Math.cos(a), (RO + pc)*Math.sin(a), sg > 0 ? 'L' : 'R']); } });
    [-1, 1].forEach(sx => [-1, 1].forEach(sy => { const y0 = sy*YV, y1 = sy*15, n = Math.ceil((15 - YV)/5);
      extra.push({pl:[[sx*HW, y0], [sx*HW, y1]]}); for(let k = 0; k <= n; k++) cones.push([sx*(HW + pc), y0 + (y1 - y0)*k/n, 'O']); }));
    G.cones = cones;
    /* 주행 원 반경이 가운데 (9.125) 와 다르면 두 원을 규정 중심 (±9.125) 으로 옮겨 그림 (진입 · 탈출 직선은 그대로, 이음매는 근사) */
    const dd = 9.125 - SR; if(Math.abs(dd) > 1e-6){ const n0 = Math.ceil(15/0.5 - 1e-9), n = Math.max(1, Math.ceil(C2/0.5 - 1e-9));
      G.X = G.X.map((x, i) => i > n0 && i <= n0 + 2*n ? x + dd : i > n0 + 2*n && i <= n0 + 4*n ? x - dd : x); } }
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
function t2SlalomTight(rows){ const I = WB.I, b = I.w_car/2 + Math.max(0, I.rl_m || 0),   /* 차 크기는 항상 고려 */ W = t2Widths(rows);
  return rows.map((r, i) => isFinite(r.sl) && (W[i][0] < 2*b - 1e-9 || W[i][1] < 2*b - 1e-9) ? i + 1 : 0).filter(Boolean); }
/* 내 코스 표에 Ctrl+V: 엑셀에서 복사한 여러 칸(탭 · 줄바꿈)이면 표 전체를 바꿈. 첫 행에 열 이름이 있으면 그 이름으로, 없으면 양식 열 순서로 읽음 */
/* 표에 Ctrl+V (모터 · 효율 · 타이어 · 셀 표): 엑셀 여러 칸이면 표 전체를 바꿈 (한 칸이면 그 칸 입력에 그대로). 붙여넣기 창은 없음 (48차 · 내 코스와 같게) */
function t2ApplyText(k, v){ const had0 = t2HasMap(k);
  if(k==='mt'){ if(!t2MotorParse(v).pts.length){ toast('회전수 · 토크 행을 읽지 못했습니다.'); return false; } T2.mtext = v; }
  else if(k==='tire'){ if(!t2TireParse(v).map){ toast('하중 · μ 행을 읽지 못했습니다.'); return false; } T2.tire = v; }
  else if(k==='bO' || k==='bR'){ if(!t2GridParse(v).map){ toast('표를 읽지 못했습니다. 첫 행 = 셀 온도 °C, 첫 열 = SOC %.'); return false; } T2[k] = v; }
  else if(T2RAD.includes(k)){ if(!t2GridParse(v).map){ toast('표를 읽지 못했습니다. 첫 행 = 냉각수 유량 L/min, 첫 열 = 코어 풍속 m/s, 칸 = 방열량 kW.'); return false; } T2[k] = v; }
  else if(k==='bC'){ if(!t2PairParse(v).map){ toast('온도 · 용량 행을 읽지 못했습니다.'); return false; } T2.bC = v; }
  else if(k==='dM' || k==='dI'){ if(!t2DerParse(v).map){ toast('온도 · 디레이팅 % 행을 읽지 못했습니다.'); return false; } T2[k] = v; }
  else if(k==='eM' || k==='eI' || k==='eD'){ if(!t2EffParse(v).map){ toast('효율을 읽지 못했습니다. 숫자 하나 또는 맵(첫 행 회전수, 첫 열 토크)이어야 합니다.'); return false; } T2[k] = v; }
  else return false;
  t2UseAuto(k, had0); wbSrcDel('2', 't2:' + k); t2Save(); t2Repaint(); t2Soon(); wbPaint(['in']); return true; }
document.addEventListener('paste', e => { if(WB.id!=='2' || T2.tab!=='edit' || !e.target.closest) return; const tb = e.target.closest('[data-t2gk]'); if(!tb) return;
  const txt = (e.clipboardData && e.clipboardData.getData('text/plain')) || ''; if(!/[\t\n]/.test(txt.trim())) return;   // 한 칸 붙이기는 그 칸 입력에 그대로
  e.preventDefault(); const v = txt.replace(/\r/g, '').split('\n').filter(l => l.trim()).map(l => l.split('\t').map(c => c.trim()).join(', ')).join('\n');
  if(t2ApplyText(tb.dataset.t2gk, v)) toast(`붙인 내용으로 ${T2ET[tb.dataset.t2gk] || '표'}를 바꿨습니다 (표 전체).`); });
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
  G.extra.forEach(e => { if(e.pl){ svg += `<polyline points="${e.pl.map(([x, y]) => `${tx(x).toFixed(1)},${ty(y).toFixed(1)}`).join(' ')}" class="t2-sk" vector-effect="non-scaling-stroke"/>`; return; } const [cx, cy, rr] = e; svg += `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="${(rr*s).toFixed(1)}" class="t2-sk" vector-effect="non-scaling-stroke"/>`; });
  const cones = c==='ax' || c==='end' ? FSK26.cones || [] : c==='free' ? t2FreeCones() : c==='skid' ? G.cones || [] : [];
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
  /* 스키드패드: 출발 위치 = 진입 직진로 시작 (정지 출발, 화살표), 두 원 중심을 잇는 선 = 계측선 (출발선 · 결승선, FSAE D.10.1.3b) */
  const iS = c==='skid' ? Math.round(15/0.5) : i0, iF = c==='skid' ? Math.round(15/0.5) : close ? i0 : (rev ? 0 : N - 1);
  if(c==='skid'){ const hl = (y, cls) => `<line x1="${tx(-1.5).toFixed(1)}" y1="${ty(y).toFixed(1)}" x2="${tx(1.5).toFixed(1)}" y2="${ty(y).toFixed(1)}" class="${cls}" vector-effect="non-scaling-stroke"/>`;
    svg += hl(-15, 't2-sl') + hl(0, 't2-fin'); }   /* 스키드패드: 출발(초록) = 진입 직진로 시작, 계측 · 결승(빨강) = 두 원 중심을 잇는 선, 둘 다 직진로 폭 3 m 가로 */
  else svg += half(iS, 't2-sl', 1) + half(iF, 't2-fin', -1);
  { const D = dirAt(c==='skid' ? i0 : iS), ox = D.a[0] + D.rx*q, oy = D.a[1] + D.ry*q, L = 2.2*q, ex = ox + D.ux*L, ey = oy + D.uy*L, ang = Math.atan2(D.uy, D.ux)*180/Math.PI;
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
  const sb = (WB.I.md || 0) >= 2 && WB.R && WB.R.sig && WB.R.sig.beta && WB.R.sig.beta.some(Number.isFinite) ? WB.R.sig.beta : null;
  let g = '<g class="t2-sweep">';
  for(let i = 0; i < m; i++){ const a = ix(i - 1), b = ix(i + 1); let ux = (xs[b] - xs[a])*dir, uy = (ys[b] - ys[a])*dir; const u = Math.hypot(ux, uy) || 1; ux /= u; uy /= u;
    const bs = sb ? sb[t2MapToSig(i)] : NaN, beta = Number.isFinite(bs) ? bs*Math.PI/180 : Math.atan(lr*K(i)*dir), th = Math.atan2(uy, ux) - beta, c = Math.cos(th), s = Math.sin(th);   // 차체 각도: 모델 2 이상은 계산한 값 (슬립각 포함), 아니면 저속 기구학
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
   왼쪽 누르기 · 끌기 = 프로브 (시뮬레이션) · 표의 그 구간 (편집), 휠 버튼 끌기 = 이동 (포인터를 박스에 잡아 둠) */
const t2MapOf = el => { const box = el && el.closest && el.closest('#t2map, #t2emap'); return box ? {box, edit:box.id==='t2emap'} : null; };
function t2SvgPt(svg, e){ const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function t2ZoomAt(f, px, py, edit){ const Z = edit ? T2.zoomE : T2.zoom, k = Math.max(1, Math.min(40, Z.k*f)); if(px != null){ const a = px/T2MW, b = py/T2MH; Z.cx = a - (a - Z.cx)*Z.k/k; Z.cy = b - (b - Z.cy)*Z.k/k; } Z.k = k;
  if(k===1){ Z.cx = .5; Z.cy = .5; } const h = .5/k; Z.cx = Math.max(h, Math.min(1 - h, Z.cx)); Z.cy = Math.max(h, Math.min(1 - h, Z.cy)); edit ? t2EMapRepaint() : t2MapRepaint(); }
document.addEventListener('wheel', e => { const M = t2MapOf(e.target); if(!M || !wbZoomOn(M.box)) return; const svg = M.box.querySelector('svg'); if(!svg) return;
  e.preventDefault(); const p = t2SvgPt(svg, e); t2ZoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y, M.edit); }, {passive:false});
/* 왼쪽 = 프로브 (누른 채 끌면 계속 따라감, 신호 그래프와 같음) · 휠 버튼 끌기 = 화면 이동 (냉각 편집기와 같음, 2026-11-10) */
let T2DRAG = null;
const t2MapProbe = (box, edit, e) => { const svg = box.querySelector('svg'), M = edit ? T2.mpE : T2.mp; if(!svg || !M) return;
  const p = t2SvgPt(svg, e); let bi = 0, bd = Infinity; M.pts.forEach(([x, y], i) => { const dd = (x - p.x)**2 + (y - p.y)**2; if(dd < bd){ bd = dd; bi = i; } });
  if(edit){ const r = t2PtToRow(bi); if(r >= 0) t2Hl($(`#t2tt tbody tr:nth-child(${r + 1})`)); }
  else { const xi = t2MapToSig(bi); if(xi != null) wbCursor('sig', xi); } };
document.addEventListener('mousedown', e => { if(e.button===1 && t2MapOf(e.target)) e.preventDefault(); });   // 휠 버튼 자동 스크롤 막기
document.addEventListener('pointerdown', e => { const M = t2MapOf(e.target); if(!M || (e.button!==0 && e.button!==1) || e.target.closest('button')) return; const svg = M.box.querySelector('svg'); if(!svg) return;
  e.preventDefault();   // 끌기 중 글자 선택 막음
  const Z = M.edit ? T2.zoomE : T2.zoom; try{ M.box.setPointerCapture(e.pointerId); }catch(err){}
  document.body.classList.add('wb-dragging'); T2DRAG = {box:M.box, edit:M.edit, id:e.pointerId, pan:e.button===1, x:e.clientX, y:e.clientY, cx:Z.cx, cy:Z.cy, w:svg.getBoundingClientRect().width};
  if(!T2DRAG.pan) t2MapProbe(M.box, M.edit, e); });
document.addEventListener('pointermove', e => { const d = T2DRAG; if(!d) return; e.preventDefault();
  if(!d.pan){ if(!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; if(T2DRAG===d) t2MapProbe(d.box, d.edit, d.ev); }); d.ev = e; return; }
  const dx = e.clientX - d.x, dy = e.clientY - d.y, Z = d.edit ? T2.zoomE : T2.zoom, f = 1/(d.w*Z.k), h = .5/Z.k; Z.cx = Math.max(h, Math.min(1 - h, d.cx - dx*f)); Z.cy = Math.max(h, Math.min(1 - h, d.cy - dy*f*T2MW/T2MH)); d.edit ? t2EMapRepaint() : t2MapRepaint(); });
const t2DragEnd = e => { const d = T2DRAG; T2DRAG = null; document.body.classList.remove('wb-dragging'); if(!d) return; try{ d.box.releasePointerCapture(d.id); }catch(err){} };
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
    if(a==='tpl'){ const [kk, f] = ac.dataset.t2tpl.split('.'); t2Template(kk, f); t2Repaint(); return; }
    if(a==='ex'){ if(k==='track'){ T2.free.text = T2TRACK_EX; T2.free.s0 = 0; T2.free.laps = 1; } else if(k==='mt') T2.mtext = EMRAX228.torque; else T2.eM = EMRAX228.eff; }
    if(a==='clear'){ if(k==='track') T2.free.text = ''; else if(k==='mt') T2.mtext = ''; else T2[k] = ''; }
    t2Repaint(); t2Soon(); wbPaint(['in']); return; }
  if(t.closest('.t2-mi') || t.closest('.t2-mn')) return;
  if(T2.menu){ T2.menu = ''; t2Repaint(); }

  const tb = t.closest('[data-t2tab]'); if(tb){ T2.tab = tb.dataset.t2tab; T2.menu = ''; t2Save(); wbPaint(['ext']);
    if(T2.tab==='sim'){ t2MapRepaint(); t2PfSoon(); if(WB.dirty || (WB.need || []).length){ WB.dirty = false; wbCalc(); } } else wbNeedMark(); return; }   // 편집에서 바꾼 것이 있으면 이제 계산 (빈 필수 칸이 있으면 그때 빨강)   // 편집에서 바꾼 것이 있으면 이제 계산
  const ec = t.closest('[data-t2ecourse]'); if(ec){ T2.ecourse = ec.dataset.t2ecourse; T2.menu = ''; T2.zoomE = {k:1, cx:.5, cy:.5}; t2Save(); wbPaint(['ext']); return; }
  const us = t.closest('[data-t2use]'); if(us){ const uk = (us.closest('[data-t2uk]') || {}).dataset?.t2uk || T2.etab; T2.use[uk] = us.dataset.t2use; if(us.dataset.t2use==='const') (T2.mopen = T2.mopen || {})[uk] = false; WB.need = wbNeed(); wbNeedMark(); t2Save(); wbPaint(['ext']); t2Soon(); return; }
  const el = t.closest('[data-t2el]'); if(el){ WB.I.e_lim = +el.dataset.t2el; if(WB.I.e_lim===2 && !(WB.I.e_target > 0)) WB.I.e_target = Math.round(t2Epack()*100)/100; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const cs = t.closest('[data-t2course]'); if(cs){ t2SetCourse(cs.dataset.t2course); return; }
  const et = t.closest('[data-t2et]'); if(et){ T2.etab = et.dataset.t2et; if(T2MOT.includes(T2.etab)) T2.emot = T2.etab; if(T2BAT.includes(T2.etab)) T2.ebat = T2.etab; T2.menu = ''; t2Save(); wbPaint(['ext']); return; }
  const eg = t.closest('[data-t2eg]'); if(eg){ const g = eg.dataset.t2eg; T2.etab = g==='mot' ? (T2MOT.includes(T2.etab) ? T2.etab : (T2.emot || 'mt')) : g==='bat' ? (T2BAT.includes(T2.etab) ? T2.etab : (T2.ebat || 'bO')) : g==='dt' ? 'eD' : g; T2.menu = ''; t2Save(); wbPaint(['ext']); return; }
  const rl = t.closest('[data-t2rl]'); if(rl){ WB.I.rl_on = +rl.dataset.t2rl; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const drr = t.closest('[data-t2drr]'); if(drr && !t.closest('a, input, select, label, summary, details')){ WB.I.dr_real = +drr.dataset.t2drr; wbSave(); wbPaint(['ext', 'in']); wbCalcSoon(); return; }
  const drb = t.closest('[data-t2drv]'); if(drb){ WB.I.drv = +drb.dataset.t2drv; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const fsb = t.closest('[data-t2fs]'); if(fsb && !t.closest('button, a, input, select, label, summary, details')){ const k = fsb.dataset.t2fs, on = k==='rg_on' ? WB.I[k] === 1 : WB.I[k] !== 0; WB.I[k] = on ? 0 : 1; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const pkb = t.closest('[data-t2pk]'); if(pkb){ WB.I.pk_dir = +pkb.dataset.t2pk; wbSave(); wbPaint(['in', 'ext']); wbCalcSoon(); return; }
  const fmb = t.closest('[data-t2fm]'); if(fmb){ const fk = (fmb.closest('[data-t2fmk]') || {}).dataset?.t2fmk; if(fk){ WB.I[fk] = +fmb.dataset.t2fm; wbSave(); wbPaint(['ext']); wbCalcSoon(); } return; }
  const icb = t.closest('[data-t2ict]'); if(icb){ WB.I.ict_m = +icb.dataset.t2ict; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const fzb = t.closest('[data-t2fz0]'); if(fzb){ WB.I.fz0_m = +fzb.dataset.t2fz0; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const mdb = t.closest('[data-t2md]'); if(mdb && !t.closest('a, input, select, label, summary, details')){ if(mdb.disabled) return; WB.I.md = +mdb.dataset.t2md; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const cb = t.closest('[data-t2cool-m_cool],[data-t2cool-i_cool],[data-t2cool-b_cool]'); if(cb){ const k = ['m_cool', 'i_cool', 'b_cool'].find(q => cb.hasAttribute('data-t2cool-' + q)); WB.I[k] = +cb.getAttribute('data-t2cool-' + k); wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const mgb = t.closest('[data-t2mg]'); if(mgb){ WB.I.eff_mg = +mgb.dataset.t2mg; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const thb = t.closest('[data-t2th]'); if(thb && !t.closest('button, a, input, select, label, summary, details')){ const k = thb.dataset.t2th, now = k==='th_on' ? WB.I.th_on !== 0 : WB.I[k] === 1, v = now ? 0 : 1;
    WB.I[k] = v;
    wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const dl = t.closest('[data-t2del]'); if(dl){ const rows = t2Track(T2.free.text).rows; rows.splice(+dl.dataset.t2del, 1); t2SetRows(rows); return; }
  if(t.closest('[data-t2add]')){ const rows = t2Track(T2.free.text).rows; rows.push({l:10, R:0, wl:NaN, wr:NaN, sl:NaN, note:''}); t2SetRows(rows); const tw = $('#t2tt'); if(tw) tw.scrollTop = tw.scrollHeight; return; }
  const gd = t.closest('[data-t2gdel]'); if(gd){ const k = T2.etab, g = t2Grid(t2MtText(k)); g.splice(+gd.dataset.t2gdel, 1); t2MtSet(k, t2GridText(g)); return; }
  const gc = t.closest('[data-t2gdelc]'); if(gc){ t2GridDelCol(T2.etab, +gc.dataset.t2gdelc); return; }
  const ga = t.closest('[data-t2gadd]'); if(ga){ t2GridAdd(T2.etab, ga.dataset.t2gadd); return; }
  const ce = t.closest('td[data-t2e], th[data-t2e]'); if(ce){ t2CellOpen(ce); return; } });
document.addEventListener('keydown', e => { const ce = e.target.closest && e.target.closest('#wbext td[data-t2e], #wbext th[data-t2e]'); if(ce && e.key==='Enter' && !e.target.matches('input,select')){ e.preventDefault(); t2CellOpen(ce); }
  if(e.key==='Escape' && WB.id==='2' && T2.menu){ e.preventDefault(); e.stopImmediatePropagation(); T2.menu = ''; t2Repaint(); } }, true);
/* 편집 탭에 표가 있으면 그 상수 칸은 막음 */
function t2InLock(k){ const L = '아래 표 사용';
  if(k==='eta_mot') return t2UseMap('eM') ? L : ''; if(k==='eta_dt') return t2UseMap('eD') ? L : ''; if((k==='dr_t0' || k==='dr_t1') && t2UseMap('dM')) return L; if((k==='di_t0' || k==='di_t1') && t2UseMap('dI')) return L; if(k==='eta_inv') return WB.I.eff_mg === 1 ? '모터 맵에 합침' : t2UseMap('eI') ? L : ''; if(k==='tmax') return '토크 표 최댓값';
  if(k==='c_pct') return (P => P.pts.length && P.ptsC.length ? '표에 두 열 다 있음' : '')(t2MotorParse(T2.mtext || ''));
  if(k==='i_ct') return WB.I.ict_m !== 0 ? '' : '피크 × 비율'; if(k==='i_cpct') return WB.I.ict_m !== 0 ? '연속 전류 입력 사용' : '';
  if(k==='tire_fz0') return WB.I.fz0_m !== 0 ? '' : '정지 평균 하중 사용';
  if(k==='rg_tmax' || k==='i_chg') return WB.I.rg_on === 1 ? '' : '회생 제동 고려 안 함';
  if(k==='dr_ks' || k==='dr_ke') return WB.I.dr_real === 1 ? '' : '이상 운전자';
  if(k==='delta_max') return t2Stab() ? '도구 6 표 사용' : WB.I.dl_on !== 0 ? '' : '조향 한계 고려 안 함';
  if(k==='steer_ratio') return t2Stab() ? '도구 6 표 사용' : WB.I.md >= 2 || WB.I.dr_real === 1 ? '' : '현실 운전자 · 차량 모델 2 에서 씀';
  if(k==='mu' || k==='mu_s') return t2UseMap('tire') ? L : '';
  if(k==='e_target') return t2ElOf()===2 ? '' : t2ElOf()===1 ? '제원 용량 사용' : '제한 없음';
  if(k==='rl_b') return '차 전폭으로 계산';
  if(T2PK[k]) return !t2PkDir() ? '셀 값으로 계산' : ''; if(['n_s', 'n_p', 'c_ah', 'c_vnom', 'c_vmin'].includes(k)) return !t2PkDir() ? '' : '팩 값 직접';
  if(['h_rcf', 'h_rcr', 'k_roll', 'rsd'].includes(k)) return WB.I.md >= 1 ? '' : '차량 모델 1 에서 씀';
  if(['tire_ca0', 'tire_cn', 'tire_c', 'tire_e'].includes(k)) return WB.I.md >= 2 ? '' : '차량 모델 2 에서 씀';
  if(['tire_relax', 'izz', 'ixx', 'm_us_f', 'm_us_r', 'c_roll', 'v_test', 'ay_test', 'tr_ks'].includes(k)) return WB.I.md >= 3 ? '' : '차량 모델 3 에서 씀';
  { const th = t2Th();
    if(['dr_t0', 'dr_t1', 'th_c', 'th_init'].includes(k)) return th.m ? '' : '모터 열 끔';
    if(k==='di_t0' || k==='di_t1' || k==='i_init') return th.i ? '' : '인버터 온도 끔';
    if(k==='th_r') return !th.m ? '모터 열 끔' : th.mW ? '' : '모터 공랭';
    if(k==='m_ha0' || k==='m_ha60') return !th.m ? '모터 열 끔' : th.mW ? '모터 수랭' : '';
    if(k==='i_c') return th.i ? '' : '인버터 온도 끔';
    if(k==='i_r') return !th.i ? '인버터 온도 끔' : th.iW ? '' : '인버터 공랭';
    if(k==='i_ha0' || k==='i_ha60') return !th.i ? '인버터 온도 끔' : th.iW ? '인버터 수랭' : '';
    if(['b_c', 'b_t0', 'b_alpha'].includes(k)) return th.b ? '' : '축전지 온도 끔';
    if(k==='b_ha' || k==='b_ha60') return !th.b ? '축전지 온도 끔' : th.bW ? '축전지 수랭' : '';
    if(k==='b_r') return !th.b ? '축전지 온도 끔' : th.bW ? '' : '축전지 공랭';
    { const tk = {cw_tw:'m', i_wtw:'i', b_wtw:'b'}[k]; if(tk){ if(th.n9) return '냉각 회로'; const wat = tk==='m' ? th.m && th.mW : tk==='i' ? th.iW : th.b && th.bW; return wat ? '' : {m:'모터 수랭 아님', i:'인버터 수랭 아님', b:'축전지 수랭 아님'}[tk]; } }   /* 회로 냉각수 온도: 냉각수 온도 끔이어도 (고정 값으로) 씀 */
    { const cwK = /^cw_(v|q|ra|kd|fan|fon|ua|itd|cm|rho|cp)$/.test(k) ? 'm' : /^i_w(v|q|ra|kd|fan|fon|ua|itd|cm|rho|cp)$/.test(k) ? 'i' : /^b_w(v|q|ra|kd|fan|fon|ua|itd|cm|rho|cp)$/.test(k) ? 'b' : '';
      if(cwK && /fon$/.test(k) && th.w && !th.n9 && WB.I[k.replace(/fon$/, 'fm')]!==1) return '팬 늘 켬';
      if(cwK){ if(!th.w) return WB.I.cw_on === 1 ? '수랭 부품 없음' : '냉각수 온도 끔'; if(th.n9) return '냉각 회로';
        const rk = {m:'rqM', i:'rqI', b:'rqB'}[cwK]; if(/ua$/.test(k) && t2UseMap(rk)) return '아래 표 사용'; if(/itd$/.test(k) && !t2UseMap(rk)) return '라디 표 없음';
        const wat = cwK==='m' ? th.m && th.mW : cwK==='i' ? th.iW : th.b && th.bW; if(!wat) return cwK==='m' ? '모터 수랭 아님' : cwK==='i' ? '인버터 수랭 아님' : '축전지 수랭 아님'; } }
    if(k==='th_cool' && !th.n9) return '회로마다 냉각수';
    if(k==='th_cool') return (th.m && th.mW) || (th.i && th.iW) || (th.b && th.bW) || th.w ? '' : '수랭 부품 없음';   // 냉각 회로 방식에서만 보임
    if(k==='t_amb') return th.w || (th.m && !th.mW) || (th.i && !th.iW) || (th.b && !th.bW) ? '' : '외기로 식는 것 없음';
    if(k==='inv_r') return WB.I.eff_mg === 1 ? '' : '효율 따로';
    if(k==='eta_inv' && WB.I.eff_mg === 1) return '모터 맵에 합침'; }
  return ''; }
/* 잠긴 칸에 보일 값 (작업창 wbEffVal): 숫자 = 계산에 실제로 쓰는 값, null = 쓰지 않음 (—). 잠기지 않은 칸은 부르지 않음 */
function t2InEff(k){ const I = WB.I;
  if(k==='tmax'){ const P = t2MotorParse(T2.mtext || ''), c = Math.max(1e-3, Math.min(100, I.c_pct || 100)) / 100; const t = P.pts.length ? P.pts.map(q => q[1]) : P.ptsC.map(q => q[1] / c); return t.length ? Math.max(...t) : null; }   // 피크 토크 표 최댓값 (기준 전압 · 피크가 없으면 연속 ÷ 비율)
  if(k==='i_cpct') return I.i_pk > 0 && I.i_ct >= 0 ? Math.min(100, I.i_ct / I.i_pk * 100) : null;   // 연속 전류 입력에서 나온 비율
  if(k==='i_ct') return I.i_pk > 0 ? I.i_pk * Math.max(0, Math.min(100, I.i_cpct || 0)) / 100 : null;    // 피크 × 비율
  if(k==='tire_fz0') return isFinite(I.m) ? I.m * 9.81 / 4 : null;
  if((k==='delta_max' || k==='steer_ratio') && t2Stab()){ const S = t2Stab(); return k==='delta_max' ? S.di : S.rc; }   // 도구 6 표: 안쪽 최대 · 가운데 조향비                                       // 정지 평균 하중 (코너링 강성 기준)
  if(k==='e_target') return t2ElOf()===1 ? t2Epack() : null;                 // 제원 용량 · 제한 없음
  if(k==='rl_b') return I.w_car / 2 + Math.max(0, I.rl_m || 0);
  if(T2PK[k] && !t2PkDir()){ const x = T2PK[k](t2Cell()); if(isFinite(x)) I[k] = Math.round(x*100)/100; return x; }   // 셀 값으로 계산 (직렬 수를 0 으로 바꾸면 이 값에서 시작하게 같이 저장)
  if(['n_s', 'n_p', 'c_ah', 'c_vnom', 'c_vmin'].includes(k) && t2PkDir()){ const c = t2Cell(); return k==='n_s' ? c.Ns : k==='n_p' ? 1 : k==='c_ah' ? c.ah : k==='c_vnom' ? c.vnom : c.vmin; }   // 전폭으로 계산한 직선 여유 b
  if(k==='eta_inv' && I.eff_mg !== 1 && t2UseMap('eI')) return null;
  return null; }
/* 차 전폭을 바꾸면 그 자리에서 '최소 거리' · '여유' 칸 막힘을 다시 맞춤 (입력 칸 전체를 다시 그리면 글자 넣던 칸을 놓침) */
function t2RlLock(ks = ['rl_b', 'rl_m', 'oh_f', 'oh_r']){ ks.forEach(k => { const i = document.querySelector(`#wb [data-wbi="${k}"]`); if(!i) return; const r = i.closest('.wb-ir'), lk = t2InLock(k);
  i.disabled = !!lk; r.classList.toggle('lock', !!lk); { const d = WB_TOOLS['2'].inputs.find(q => q.k===k), ev = lk ? wbEffVal(WB_TOOLS['2'], d) : {v:isFinite(WB.I[k]) ? WB.I[k] : '', ph:'', cls:'', t:''}; i.value = ev.v; i.placeholder = ev.ph; i.className = ev.cls; i.title = ev.t; }
  let s = r.querySelector('.wb-lk'); if(lk && !s){ s = document.createElement('span'); s.className = 'wb-lk'; i.parentNode.insertBefore(s, i.nextSibling.nextSibling); }
  if(s){ if(lk) s.textContent = lk; else s.remove(); } }); }
document.addEventListener('input', e => { if(WB.id==='2' && e.target.matches && e.target.matches('[data-wbi="w_car"]')) setTimeout(t2RlLock, 0); });
/* 셀 구성 · 용량 · 전압을 바꾸면 [제원 용량 X kWh] 글자를 그 자리에서 맞춤 */
document.addEventListener('input', e => { if(WB.id!=='2' || !e.target.matches || !e.target.matches('[data-wbi="n_s"],[data-wbi="n_p"],[data-wbi="c_ah"],[data-wbi="c_vnom"],[data-wbi="c_vmax"],[data-wbi="c_vmin"],[data-wbi^="p_"]')) return;
  setTimeout(() => { const b = document.querySelector('#wb [data-t2el="1"]'); if(b) b.textContent = `제원 용량 ${wbFmt(t2Epack(), 2)} kWh`; wbEffRefresh(); }, 0); });
/* 직렬 수를 0 ↔ 값으로 바꾸면 잠기는 칸이 바뀜 → 입력 칸을 다시 그림 */
document.addEventListener('change', e => { if(WB.id==='2' && e.target.matches && e.target.matches('[data-wbi="n_s"]')) setTimeout(() => wbPaint(['in']), 0); });

/* ============================================================ 결과 칸 (도구가 직접 그림)
   1행: 감속비 · 종목 기록 · 차량 한계 (감속비 칸과 종목 기록 칸은 같은 종목이 같은 높이)
   2행: 고른 코스 · 축전지 · 모터 · 에너지 (위에서 고른 코스 · 볼 랩) */
const t2F = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
const t2T = (s, d) => { if(!isFinite(s)) return '—'; if(s < 60) return `${s.toFixed(d)}s`; const m = Math.floor(s/60); return `${m}m ${(s - 60*m).toFixed(1)}s`; };   // 60초 넘으면 25m 17.2s
const t2Dt = d => !isFinite(d) ? '' : d > 0.0005 ? `<span class="t2-dt bad">+${d.toFixed(3)}s</span>` : `<span class="t2-dt ok">−${Math.abs(d).toFixed(3)}s</span>`;
const t2Tt = h => String(h || '').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;').trim();   // 잘린 글자 전체를 마우스 올리면 보임
const t2R  = (n, v, x, cls) => `<div class="t2-r${cls ? ' ' + cls : ''}"><span class="n" title="${t2Tt(n)}">${n}</span><span class="d"${x ? ` title="${t2Tt(x)}"` : ''}>${x || ''}</span><span class="v">${v}</span></div>`;   // 이름 · 메모 · 수치 (수치는 늘 오른쪽 끝)
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
    + (isFinite(o.c_vstr) ? t2R('핸들 속도 상한', `<b>${t2F(o.c_vstr, 1)}</b> <i>km/h</i>`, '<span class="muted">현실 운전자 · 핸들 900 °/s 로 곡률 변화를 따라갈 수 있는 가장 낮은 속도 (그 위로 달리면 핸들이 못 따라감)</span>') : '')
    + (isFinite(o.c_rmn) ? t2R('가장 작은 반경', `<b>${t2F(o.c_rmn, 2)}</b> <i>m</i>`, o.c_rkin > 0 ? (o.c_rbad > 0 ? `<span class="t2-dt bad">최소 회전 반경 ${t2F(o.c_rkin, 2)} m 보다 급한 곳 ${t2F(o.c_rbad, 1)} m</span>` : `<span class="muted">최소 회전 반경 ${t2F(o.c_rkin, 2)} m (최대 조향각에서) 지킴</span>`) : '<span class="muted">조향 한계 고려 안 함</span>') : '')
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
    + t2R('조향 한계로 느려진 거리', isFinite(o.c_dbad) ? `<b>${t2F(o.c_dbad, 1)}</b> <i>m</i>` : '<b>—</b>', isFinite(o.c_dbad) ? (o.c_dbad > 0 ? `<span class="t2-dt bad">최대 ${t2F(WB.I.delta_max, 1)}° 로 못 꺾어 코너 속도를 낮춤</span>` : `<span class="muted">최대 ${t2F(WB.I.delta_max, 1)}° 안</span>`) : '<span class="muted">최대 조향각 0 = 확인 안 함</span>')
    + t2R('차체가 경계에 닿아 느려진 거리', isFinite(o.c_bdlen) ? `<b>${t2F(o.c_bdlen, 1)}</b> <i>m</i>` : '<b>—</b>', isFinite(o.c_bdlen) ? (o.c_bdlen > 0 ? `<span class="t2-dt bad">가장 크게 ${t2F(o.c_bddv, 1)} km/h 낮춤</span>` : '<span class="muted">속도에 따른 차체 각도로도 경계 안</span>') : '<span class="muted">전폭 0 · 중심 라인 · 가속 · 스키드패드는 확인 안 함</span>')
    + (o.c_bdct > 0 ? t2R('아주 느려도 차체가 닿는 콘', `<b>${t2F(o.c_bdct, 0)}</b> <i>개</i>`, '<span class="t2-dt bad">속도로는 못 피함 · 주행선 여유 · 차 크기 · 콘 간격 확인</span>') : '')
    + t2R('타이어 포화 점', `<b>${t2F(o.c_satn, 0)}</b> <i>개</i>`, '<span class="muted">축마다 따로 보면 곡선 최대를 넘겨야 하는 점 (제동 · 가속 중 하중 이동, 기록은 차 전체 마찰원으로 셈)</span>')
    + t2R('선형 언더스티어 구배', `<b>${t2F(o.k_us_lin, 3)}</b> <i>°/g</i>`, `<span class="muted">${o.k_us_lin > 0 ? '+ = 언더' : '− = 오버'} (정지 하중 코너링 강성)</span>`);
  let r5 = '';
  if(md >= 3 && R.tr){ const T = R.tr, tr = isFinite(o.c_trok), NA = '<b>—</b>', nt = '<span class="muted">가속 · 스키드패드는 조향이 바뀌지 않아 과도 반영 없음</span>';
    r5 = t2R('과도로 늘어난 랩 시간', tr ? `<b>${t2F(o.c_trdt, 3)}</b> <i>s</i>` : NA, tr ? `<span class="muted">고른 코스 한 랩${WB.I.course==='end' ? ' (이어 달린 랩)' : ''} · 준정적 대비</span>` : nt)
      + t2R('과도로 속도를 낮춘 거리', tr ? `<b>${t2F(o.c_trlen, 0)}</b> <i>m</i>` : NA, tr ? `<span class="muted">정상보다 더 쓴 타이어 몫 최대 ${t2F(o.c_trq, 0)} %</span>` : '')
      + t2R('과도 상한 맞춤', tr ? `<b>${o.c_trok ? '다 맞춤' : '덜 맞춤'}</b> <i>· ${t2F(o.c_trit, 0)} 번</i>` : NA, tr && !o.c_trok ? '<span class="t2-dt bad">되풀이 한도 안에 다 맞추지 못함</span>' : '')
      + t2R('시험', `<b>${t2F(o.tr_v, 0)}</b> <i>km/h</i> · <b>${t2F(o.tr_sw, 1)}</b> <i>° 핸들</i>`, `<span class="muted">바퀴 ${t2F(o.tr_del, 2)}°, 0.1 s 동안</span>`)
      + t2R('정상 요레이트 (해석해 / 3 s)', `<b>${t2F(o.tr_rss, 2)}</b> <i>/</i> <b>${t2F(o.tr_r, 2)}</b> <i>°/s</i>`, `<span class="muted">이득 ${t2F(o.tr_gain, 2)} 1/s</span>`)
      + t2R('요레이트 응답 시간 · 오버슈트', `<b>${t2F(o.tr_t90, 3)}</b> <i>s</i> · <b>${t2F(Math.max(0, o.tr_os), 1)}</b> <i>%</i>`, '<span class="muted">조향 50 % → 요레이트 90 %</span>')
      + t2R('고유진동수 · 감쇠비 (2 자유도)', `<b>${t2F(o.tr_wn, 2)}</b> <i>Hz</i> · <b>${t2F(o.tr_zeta, 3)}</b>`, '')
      + t2R('롤각 (정상 해석해 / 3 s)', `<b>${t2F(o.tr_phis, 3)}</b> <i>/</i> <b>${t2F(o.tr_phi, 3)}</b> <i>°</i>`, `<span class="muted">β ${t2F(o.tr_beta, 2)}°</span>`)
      + `<div class="t2-trp">${wbPlot({id:'t2tr', w:520, h:220, x:{d:T.t, n:'시간', u:'s'}, ys:[{k:'r', d:T.r, c:WB_COL[0], n:'요레이트', u:'°/s', dd:2}, {k:'ay', d:T.ay, c:WB_COL[2], n:'횡가속도', u:'g', dd:3}, {k:'phi', d:T.phi, c:WB_COL[3], n:'롤각', u:'°', dd:3}, {k:'sw', d:T.sw, c:WB_COL[7], n:'핸들 각', u:'°', dd:1}], hit:false, label:'계단 조향 응답'})}</div>`; }
  // 참고용이라 처음엔 접어 둠 (열면 그 상태를 기억)
  return `<details class="t2-bmore" data-t2bmore${T2.bmore ? ' open' : ''}><summary>차량 거동 자세히 (모델 2 정상 선회${r5 ? ' · 모델 3 과도' : ''})</summary><div class="t2-orow${r5 ? ' two' : ''}">${t2Box('차량 거동 · 모델 2 (정상 선회)', cn, r4)}${r5 ? t2Box('과도 · 모델 3', '기록 반영 (요 관성 · 타이어 이완) · 계단 조향 ISO 7401 꼴', r5) : ''}</div></details>`; }
document.addEventListener('toggle', e => { if(e.target.matches && e.target.matches('[data-t2bmore]')) T2.bmore = e.target.open; }, true);

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
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 해석해 비교표), 입력 내보내기 · 가져오기(맵 편집 표 포함), [도구 연결 ▾](도구 9 · 4 에서 냉각 회로 · 셀 표 가져오기, 도구 9 로 평균 발열 · 차속 보내기 — 덮어쓸 곳을 표로 보고 체크), 대시보드에 반영(제안 감속비 · 최고 차속 · 횡가속도 · 랩 에너지)입니다.', t2TT('sim')],
  ['#wb .wb-in', '입력', '입력 칸은 위 [편집] 탭에 항목별로 있습니다(자주 바꿔 보는 값만 나중에 이곳으로 꺼낼 예정). 여기에는 [대시보드 값으로 채우기]와 칸 앞 점의 뜻이 있습니다: 색 점 = 대시보드 값(확정 · 검토 중 · 가정 · 계산값 · 예시값), 고리 = 직접 고친 값, 회색 네모 = 도구 기본값.', t2TT('sim')],
  ['#wb [data-t2tab="edit"]', '편집 탭', '모든 입력을 항목별로 넣는 탭입니다: 모델 단계 · 코스 · 차량 제원 · 서스 · 조향 · 타이어 · 에어로 · 모터 · 인버터 · 구동계 · 축전지. 항목마다 위에 상수 칸(비슷한 값끼리 상자), 아래에 표 · 그림이 있습니다. 여기서 고치는 동안은 계산하지 않고, [시뮬레이션] 탭으로 가면 한 번 계산합니다. 코스 단추는 시뮬레이션 코스와 따로입니다.', t2TT('edit', 'course')],
  ['#wb .t2-coolq', '냉각', '수랭 방식을 고릅니다. [부품별 독립 회로] = 수랭 부품마다 자기 냉각수 · 라디 (부품별 회로 값 칸). [냉각 회로] = 이 탭의 편집기로 그린 배치(직렬 · 병렬 · 라디 여러 개 · 공랭 덕트)로 앞 부품이 데운 냉각수를 뒤 부품이 받습니다. 배치는 이 도구에만 저장됩니다. 도구 9 에서 배치를 가져오거나, 시뮬레이션 탭에서 계산한 뒤 평균 손실 · 차속을 도구 9 로 보내는 것은 윗줄 [도구 연결 ▾]에서 합니다.', t2TT('edit', 'cool')],
  ['#wb .t2-model', '모델 단계', '차량 모델(0 기본 · 1 롤센터 · 롤)과 열 모델(모터 열 · 인버터 온도 · 축전지 온도 · 냉각수 온도를 각각 켜고 끔, 부품마다 공랭 · 수랭, 냉각수 온도는 수랭 부품이 있어야 계산)을 눌러 조합합니다. 단추마다 계산하는 것과 쓰는 입력(어느 항목에 있는지)이 적혀 있고, 그 단계에서 안 쓰는 입력 칸은 막힙니다. 계산에 쓴 조합은 시뮬레이션 탭 위에 보입니다. 대시보드 반영은 늘 차량 0 · 열 모터 열만.', t2TT('edit', 'model')],
  ['#wb .t2-sens', '감도', '입력을 하나씩 조금(기본 +5 %) 바꿔 종목 기록 · 내구 에너지가 몇 % 바뀌는지(탄력도) 봅니다. [감도 계산]을 누르면 지금 입력 · 모델 단계로 계산하고, 열 이름을 눌러 그 종목 순으로 정렬합니다. 종합이 큰 입력이 자주 바꿔 비교할 핵심 입력 후보입니다.', t2TT('sens')],
  ['#wb .t2-cg', '상수인가, 표인가', '모터 토크는 늘 표로 셉니다 (피크 · 연속 중 한 열은 비워도 됨). 효율 · 타이어 표가 비어 있으면 위 상수 칸(모터 효율 · 인버터 효율 · μ · 하중 감도)을 쓰고, 그림 위에 "상수 칸을 씁니다"가 뜹니다. 표 제목 옆 [계산에 쓸 값]에서 [아래 표 · 위 상수]를 고릅니다. 표를 쓰면 그 상수 칸은 막힙니다("아래 표 사용"). 숫자 하나만 넣어도 상수 표가 됩니다.', t2TT('edit', 'eM')],
  ['#wb .t2-tw', '표 고치기', '칸을 눌러 고치고 Enter(반영) · Esc(취소). 표 맨 아래 [+ 행] 행, 효율 맵은 오른쪽 [+ 열] 열로 늘리고, 행 끝 × 로 행을, 맵 맨 아래 × 로 열을 지웁니다. 빈 표에서 누르면 머리 행부터 만듭니다. 토크 표는 1열 회전수 · 2열 최대 토크 · 3열 연속 토크(디레이팅 하한)입니다.', t2TT('edit', 'mt')],
  ['#wb .t2-menu', '입력하기', '엑셀에서 여러 칸을 복사해 표를 누르고 Ctrl+V 하면 표 전체를 바꿈 (모든 표 같음) · 파일 가져오기(.xlsx 첫 시트 · .csv) · 양식 받기(쓰는 법이 양식 맨 위 # 행에 있음) · 예시로 · 비우기.', t2TT('edit', 'mt')],
  ['#wb .t2-fbox', '그림으로 틀린 칸 찾기', '오른쪽 그림은 표로 그린 것입니다. 효율 맵에서 혼자 색이 튀는 칸, 곡선이 꺾인 곳, 코스가 엉뚱하게 꺾인 곳을 누르면 표에서 그 칸(행)으로 가서 강조합니다.', t2TT('edit', 'eM')],
  ['#wb .t2-tr', '코스', '공식 코스(오토크로스 · 내구 · 가속 · 스키드패드)는 회색 표로 보기만 합니다. 내 코스는 칸 고치기 · # 번호로 옮기기 · 각도 → 길이, 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스입니다. 비워 두면 계산하지 않습니다. 초록 = 출발(주행 방향 오른쪽), 빨강 = 결승(왼쪽), 화살표 = 방향. 내 코스는 구간마다 왼쪽 · 오른쪽 폭(빈칸 = 윗 행 값, 경계 콘은 지도에 자동)과 슬라럼 콘 간격(그 구간 가운데 선 위 콘, 직선 · 곡선 모두)을 넣을 수 있고, 엑셀에서 여러 칸을 복사해 표에 Ctrl+V 하면 표 전체가 바뀝니다.', t2TT('edit', 'course', 'free')],
  ['#wb [data-t2tab="sim"]', '시뮬레이션 탭', '편집 탭의 입력으로 기록을 계산해 보는 탭입니다. 위에서 아래로: 기준 감속비 · 볼 랩 · 코스 → 결과 → 구동력 선도 · 코스 지도 → 신호 그래프.', t2TT('sim', null, 'end')],
  ['#wb .t2-gm', '기준 감속비', '내 감속비 = 편집 탭 [구동계]의 [최종 감속비], 최적 감속비 = 배점(가속 100 · 오토크로스 200 · 내구 350)을 가중해 고른 하나. 두 모드를 미리 계산해 두어 누르면 바로 바뀝니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-vw', '볼 랩 · 코스', '코스를 고르면 결과 2행 · 구동력 선도 · 코스 지도 · 신호 그래프가 그 코스로 바뀝니다. 내구는 24랩(드라이버당 12랩) 중 볼 랩을 고르고, [전체]는 26랩을 이어서 봅니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-orow', '결과 1행', '감속비(종목마다 가장 빠른 감속비와 그때 기록) · 종목 기록(기준 감속비) · 차량 한계. 같은 종목이 같은 높이라 옆으로 비교합니다. ± = 가장 빠른 기록 대비, 초록은 빠름 · 빨강은 느림.', t2TT('sim', null, 'end')],
  ['#wb .t2-orow + .t2-orow', '결과 2행', '고른 코스 · 볼 랩의 기록, 축전지 · 모터(회전수 · 토크 · 출력 · 전압 · 모터 온도), 에너지(단자 · 소비 · SOC, 내구는 에너지 제한 · CO₂). 내구는 24랩 전체 단자 · 소비 에너지와, 출력 상한 없이 달렸을 때의 에너지(축전지 용량 가늠용)도 보입니다. 최적 모드에서 감속비는 그 코스에서 가장 빠른 값입니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-ftw', '구동력 선도', '코스 프로브 지점의 전압 · 모터 온도 · 횡가속도로 다시 그린 선도입니다(보기만, 눌러도 프로브는 안 움직임). 세로선 = 그 점의 차속. 아래 글이 그 점의 구동력을 무엇이 정했는지(모터 곡선 · 출력 상한 · 뒤축 접지), 제동 한계, 앞축 여유를 알려 줍니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-mapw', '코스 지도', '한 번 눌러 휠 확대를 켠 뒤(박스 테두리 강조, 박스 밖을 누르거나 Esc = 끔) 휠로 확대, 휠 버튼을 누른 채 끌면 이동(박스 밖으로 나가도 됨), 왼쪽 버튼으로 누르거나 누른 채 끌면 프로브가 따라갑니다. 색 = 차속(여러 랩이면 모든 랩 통틀어 같은 범위), 주황 콘 = 슬라럼. 색 선 = 계산한 주행선(기본 레코드 라인: 코스 폭 안에서 가장 덜 휘는 라인을 구한 뒤 랩타임이 줄어드는 쪽으로 조금씩 다듬은 라인. 슬라럼은 첫 콘을 왼쪽으로, 번갈아 비켜 감), 점선 = 코스 중심선. 주행선(레코드 라인 · 최소 곡률 라인 · 중심 라인)과 여유는 편집 탭 [코스], 차 전폭은 [차량 제원]에서 바꿉니다. 다듬기는 입력이 바뀔 때마다 다시 해서 계산이 몇 초 걸립니다.', t2TT('sim', null, 'end')],
  ['#wbsl', '신호 고르기', '그래프를 누르면 그 칸이 강조되고, 여기 체크가 그 칸에 그릴 신호를 고릅니다. 이름을 누르면 그 신호의 눈금이 앞으로. 축 · 눈금 · 제목 · 값 글자는 선 색과 같습니다.', t2TT('sim')],
  ['#wbsig', '그래프 칸', '칸마다 상자 하나. 위 오른쪽 단추줄: [프로브] 누르거나 끌면 프로브(←/→ 한 칸씩) · [이동] 끌어서 보기 범위 옮김 · [영역 확대] 끌어서 사각형 확대 · 더블클릭 = 처음 범위. 가로 범위는 모든 칸이 같이 움직이고 세로는 칸마다. 칸을 한 번 누르면 휠 = 가로 확대, Shift + 휠 = 세로 확대. 상자 아래 [+ 그래프 칸]으로 최대 3칸, × 로 지우고, 칸 아래 경계를 끌어 높이를 바꿉니다.', t2TT('sim')],
  ['#wbsl [data-wbxa]', '입력 훑기', '가로축을 [입력 훑기 → 최종 감속비] 등으로 바꾸면 그 입력을 바꿔 가며 다시 계산한 종목 기록 변화를 봅니다 (나머지 입력은 지금 값).', t2TT('sim')]
];

/* ============================================================ 도구 정의 */
/* 입력 묶음 (편집 탭 항목마다 그림: T2EG). ui:'edit' = 편집 탭에만, ui:'none' = 다른 곳(단추 · 결과 카드)에서 고침 → 왼쪽 입력 칸은 비움 */
const T2G = {thm:'외기', cool:'냉각수 · 라디에이터 (열 모델 냉각수 온도)', bth:'축전지 열 (열 모델 축전지 온도)', inv:'인버터 열 (열 모델 인버터 온도)', car:'차량 제원', rc:'롤센터 · 롤 (차량 모델 1)', steer:'조향', tire:'타이어 · 하중 이동', aero:'에어로', mot:'모터 · 인버터', th:'모터 · 인버터 디레이팅', mth:'모터 열 (열 모델 모터 온도)', dt:'구동계', bat:'축전지', drv:'운전자 (현실 운전자 그립 사용률)', rl:'주행선 여유 · 경계', goal:'스키드패드 목표 (0 = 정하지 않음)'};
const T2EG = {course:[T2G.rl], car:[T2G.car], sus:[T2G.steer, T2G.rc], tire:[T2G.tire], aero:[T2G.aero], mot:[T2G.mot, T2G.th], cool:[T2G.thm, T2G.cool, T2G.mth, T2G.inv, T2G.bth], dt:[T2G.dt], bat:[T2G.bat], model:[]};
WB_TOOLS['2'] = {
  no:'2P', stage:'P0', name:'랩타임 시뮬레이터 (정밀)',
  x:{n:'거리', u:'m'},
  sweepFirst:'gr',
  inputs:[
    // sb = 편집 탭에서 한 상자로 묶는 이름 (비슷한 값끼리 한 열), n = 이 도구에서 보이는 이름 (대시보드 키 이름과 다르게 맞춘 것)
    {k:'m', dk:'m', v:300, d:0, g:T2G.car, sb:'질량 · 무게중심'}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T2G.car, sb:'질량 · 무게중심'}, {k:'h', dk:'h', v:290, d:0, g:T2G.car, sb:'질량 · 무게중심'},
    {k:'L', dk:'L', v:1550, d:0, g:T2G.car, sb:'치수'}, {k:'tf', dk:'tf', v:1200, d:0, g:T2G.car, sb:'치수'}, {k:'tr', dk:'tr', v:1180, d:0, g:T2G.car, sb:'치수'},
    {k:'w_car', n:'차 전폭 (타이어 · 윙 포함)', u:'m', v:1.41, d:2, g:T2G.car, sb:'치수'},
    {k:'oh_f', n:'앞 오버행 (앞축 ~ 차 앞 끝)', u:'m', v:0.92, d:2, g:T2G.car, sb:'치수'}, {k:'oh_r', n:'뒤 오버행 (뒤축 ~ 차 뒤 끝)', u:'m', v:0.44, d:2, g:T2G.car, sb:'치수'},
    {k:'mu', dk:'mu', n:'타이어 μ (기준 하중)', v:1.5, d:2, g:T2G.tire, sb:'마찰 · 하중 이동'}, {k:'mu_s', dk:'mu_s', n:'μ 하중 감도', v:0.246, d:3, g:T2G.tire, sb:'마찰 · 하중 이동'},
    {k:'r_eff', dk:'r_eff', n:'바퀴 유효 반경 (동반경)', v:229, d:0, g:T2G.tire, sb:'바퀴'}, {k:'crr', dk:'crr', v:0.015, d:3, g:T2G.tire, sb:'바퀴'},
    {k:'cla', dk:'cla', n:'C<sub>L</sub>·A (다운포스)', v:3.0, d:2, g:T2G.aero, sb:'공력 계수'}, {k:'cda', dk:'cda', n:'C<sub>D</sub>·A (항력)', v:1.4, d:2, g:T2G.aero, sb:'공력 계수'},
    {k:'xcop', dk:'xcop', n:'압력중심 위치 (뒤축부터 앞으로)', v:698, d:0, g:T2G.aero, sb:'압력중심'}, {k:'hcop', dk:'hcop', n:'압력중심 높이 (항력 작용)', v:420, d:0, g:T2G.aero, sb:'압력중심'},
    {k:'pmax', dk:'pmax', n:'최고 출력 (규정 상한)', v:80, d:0, g:T2G.mot, sb:'모터 한계'}, {k:'rg_tmax', dk:'regen_tmax', n:'회생 토크 상한 (모터 축)', v:230, d:0, g:T2G.mot, sb:'회생'}, {k:'tmax', dk:'tmax', n:'모터 최대 토크 (토크 표 최댓값)', v:230, d:0, g:T2G.mot, sb:'모터 한계'}, {k:'nmax', dk:'nmax', v:6500, d:0, g:T2G.mot, sb:'모터 한계'},
    {k:'v_ref', n:'토크 표 기준 전압 (표를 잰 전압)', u:'V', v:710, d:0, g:T2G.mot, sb:'토크 표 환산'},
    {k:'ke_ratio', n:'유도 전압 비 (팀 모터 ÷ 표 모터)', u:'', v:0.6523, d:4, g:T2G.mot, sb:'토크 표 환산'},
    {k:'eta_mot', n:'모터 효율 (상수)', u:'%', v:95, d:1, g:T2G.mot, sb:'효율 상수'}, {k:'eta_inv', n:'인버터 효율 (상수)', u:'%', v:97, d:1, g:T2G.mot, sb:'효율 상수'},
    {k:'eff_mg', n:'효율 (0 = 모터 · 인버터 따로, 1 = 모터 맵에 인버터 합침)', u:'', v:0, d:0, g:T2G.mot, ui:'none'}, {k:'inv_r', n:'합친 손실 중 인버터 몫', u:'%', v:30, d:0, g:T2G.mot, sb:'효율 상수'},
    {k:'c_pct', n:'연속 ÷ 피크 토크 비율 (표에 한 열만 있을 때)', u:'%', v:100, d:0, g:T2G.mot, sb:'토크 표 환산'},
    {k:'dr_t0', dk:'derate_t0', n:'모터 디레이팅 시작 온도 (피크 토크)', v:80, d:0, g:T2G.th, sb:'모터 디레이팅'}, {k:'dr_t1', dk:'derate_t1', n:'모터 디레이팅 끝 온도 (연속 토크)', v:100, d:0, g:T2G.th, sb:'모터 디레이팅'},
    {k:'kt', n:'모터 토크 상수 K<sub>t</sub> (상전류 A<sub>rms</sub> 당)', u:'N·m/A', v:0.64, d:3, g:T2G.mot, sb:'모터 한계'},
    {k:'i_pk', n:'인버터 피크 상전류', u:'A', v:400, d:0, g:T2G.mot, sb:'인버터 전류 한계'}, {k:'i_ct', n:'인버터 연속 상전류', u:'A', v:200, d:0, g:T2G.mot, sb:'인버터 전류 한계'},
    {k:'ict_m', n:'인버터 연속 상전류 (1 = 값 입력, 0 = 피크 × 비율)', u:'', v:1, d:0, g:T2G.mot, ui:'none'},
    {k:'i_cpct', n:'인버터 연속 ÷ 피크 전류 비율 (연속을 비율로 정할 때)', u:'%', v:100, d:0, g:T2G.mot, sb:'인버터 전류 한계'},
    {k:'di_t0', dk:'inv_derate_t0', n:'인버터 디레이팅 시작 온도 (피크 전류)', v:50, d:0, g:T2G.th, sb:'인버터 디레이팅'}, {k:'di_t1', dk:'inv_derate_t1', n:'인버터 디레이팅 끝 온도 (연속 전류)', v:85, d:0, g:T2G.th, sb:'인버터 디레이팅'},
    {k:'th_c', n:'모터 열용량', u:'J/K', v:6000, d:0, g:T2G.mth, sb:'모터 열'}, {k:'th_r', n:'모터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.02, d:4, g:T2G.mth, sb:'모터 열'},
    {k:'m_ha0', n:'모터 공랭 hA (정지)', u:'W/K', v:10, d:1, g:T2G.mth, sb:'모터 공랭'}, {k:'m_ha60', n:'모터 공랭 hA (60 km/h)', u:'W/K', v:40, d:1, g:T2G.mth, sb:'모터 공랭'},
    {k:'th_cool', n:'냉각수 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값, 냉각 회로)', u:'°C', v:40, d:0, g:T2G.cool, sb:'냉각수 온도'},
    /* 부품별 독립 수랭: 회로마다 냉각수 온도 · 비열 · 밀도 (2026-11-11). 냉각 회로 방식이면 위 한 칸 (th_cool) */
    {k:'cw_tw', n:'모터 냉각수 · 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값)', u:'°C', v:40, d:0, g:T2G.cool, sb:'모터 냉각수'}, {k:'cw_cp', n:'모터 냉각수 · 비열', u:'kJ/(kg·K)', v:4.18, d:2, g:T2G.cool, sb:'모터 냉각수'}, {k:'cw_rho', n:'모터 냉각수 · 밀도', u:'kg/m³', v:1000, d:0, g:T2G.cool, sb:'모터 냉각수'},
    {k:'i_wtw', n:'인버터 냉각수 · 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값)', u:'°C', v:40, d:0, g:T2G.cool, sb:'인버터 냉각수'}, {k:'i_wcp', n:'인버터 냉각수 · 비열', u:'kJ/(kg·K)', v:4.18, d:2, g:T2G.cool, sb:'인버터 냉각수'}, {k:'i_wrho', n:'인버터 냉각수 · 밀도', u:'kg/m³', v:1000, d:0, g:T2G.cool, sb:'인버터 냉각수'},
    {k:'b_wtw', n:'축전지 냉각수 · 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값)', u:'°C', v:40, d:0, g:T2G.cool, sb:'축전지 냉각수'}, {k:'b_wcp', n:'축전지 냉각수 · 비열', u:'kJ/(kg·K)', v:4.18, d:2, g:T2G.cool, sb:'축전지 냉각수'}, {k:'b_wrho', n:'축전지 냉각수 · 밀도', u:'kg/m³', v:1000, d:0, g:T2G.cool, sb:'축전지 냉각수'}, {k:'th_init', n:'모터 출발 온도', u:'°C', v:40, d:0, g:T2G.mth, sb:'모터 열'},
    {k:'gr', dk:'gr', v:3.55, d:2, g:T2G.dt, sb:'구동계', sw:[2.5, 7]}, {k:'eta_dt', dk:'eta_dt', v:95, d:0, g:T2G.dt, sb:'구동계'}, {k:'j_eq', dk:'j_eq', n:'회전부 등가 관성 (바퀴 축 기준)', v:0.5, d:2, g:T2G.dt, sb:'구동계'},
    {k:'pk_dir', n:'팩 값 (0 = 셀로 계산, 1 = 팩 값 직접)', u:'', v:0, d:0, g:T2G.bat, ui:'none'}, {k:'n_s', dk:'n_s', n:'직렬 수', v:70, d:0, g:T2G.bat, sb:'셀 구성'}, {k:'n_p', dk:'n_p', v:7, d:0, g:T2G.bat, sb:'셀 구성'},
    {k:'c_vmax', dk:'c_vmax', n:'셀 최대 전압 (만충)', u:'V', v:4.2, d:2, g:T2G.bat, sb:'셀 전압'}, {k:'c_vnom', dk:'c_vnom', n:'셀 공칭 전압', u:'V', v:3.6, d:2, g:T2G.bat, sb:'셀 전압'},
    {k:'c_vmin', dk:'c_vmin', n:'셀 최소 전압 (방전 종지)', u:'V', v:2.5, d:2, g:T2G.bat, sb:'셀 전압'},
    {k:'c_ah', dk:'c_ah', n:'셀 용량', u:'Ah', v:4.0, d:2, g:T2G.bat, sb:'셀 용량 · 팩'}, {k:'r_pack', dk:'r_pack', v:120, d:0, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'p_vmax', n:'팩 최대 전압 (만충)', u:'V', v:294, d:1, g:T2G.bat, sb:'팩'}, {k:'p_vnom', n:'팩 공칭 전압', u:'V', v:252, d:1, g:T2G.bat, sb:'팩'},
    {k:'p_vmin', n:'팩 최소 전압 (방전 종지)', u:'V', v:175, d:1, g:T2G.bat, sb:'팩'}, {k:'p_ah', n:'팩 용량', u:'Ah', v:28, d:2, g:T2G.bat, sb:'팩'},
    {k:'i_bms_max', dk:'i_bms_max', n:'팩 방전 전류 한계 (BMS 설정 · 셀 허용 × 병렬 수 중 작은 값)', v:245, d:0, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'i_chg', dk:'i_chg', n:'팩 충전 전류 한계 (회생, 셀 충전 허용 × 병렬 수)', v:42, d:0, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'e_target', dk:'e_target', n:'내구 에너지 상한', v:0, d:2, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'e_lim', n:'내구 에너지 상한 (0 = 제한 없음, 1 = 제원 용량, 2 = 임의 상한)', u:'', v:0, d:0, g:T2G.bat, ui:'none'},
    {k:'drv', n:'에너지 상한에 맞추는 방법 (0 = 출력 낮춤, 1 = 타력)', u:'', v:0, d:0, g:T2G.bat, ui:'none'},
    {k:'dr_real', n:'운전 실력 (0 = 이상, 1 = 현실)', u:'', v:0, d:0, g:T2G.drv, ui:'none'},
    {k:'dr_ks', n:'기본 그립 사용률 k_s (스키드패드 · 오토크로스 · 내구)', u:'', v:0.95, d:2, g:T2G.drv, keep:true},
    {k:'dr_ke', n:'내구 페이스 k_e (내구에만 더 곱함)', u:'', v:0.7, d:2, g:T2G.drv, keep:true},
    {k:'rg_on', n:'회생 제동 (1 = 켬, 0 = 끔)', u:'', v:0, d:0, g:T2G.mot, ui:'none'},
    {k:'wc_on', n:'차 크기 고려 (2P 화면에서는 항상 1, 검증표만 0 으로 끔)', u:'', v:1, d:0, g:T2G.car, ui:'none'},
    {k:'dl_on', n:'조향 한계 (1 = 고려, 0 = 고려 안 함)', u:'', v:0, d:0, g:T2G.steer, ui:'none'},
    {k:'fz0_m', n:'타이어 기준 하중 (1 = 값 입력, 0 = 정지 평균 하중 · μ 는 하중 0 기준)', u:'', v:0, d:0, g:T2G.tire, ui:'none'},
    {k:'rl_on', n:'주행선 (2 = 레코드 라인, 1 = 최소 곡률 라인, 0 = 중심 라인)', u:'', v:0, d:0, g:T2G.rl, ui:'none'},
    {k:'rl_m', n:'여유 (차 옆면 ↔ 코스 경계 · 콘, 차 크기 고려일 때)', u:'m', v:0.2, d:2, g:T2G.rl, sb:'여유'},
    {k:'rl_b', n:'경계 · 콘에서 차 중심까지 최소 거리 (차 크기 고려 안 함일 때)', u:'m', v:1.0, d:2, g:T2G.rl, sb:'여유'},
    {k:'md', n:'차량 모델 단계 (0 = 기본, 1 = 롤센터 · 롤, 2 = 비선형 타이어, 3 = 과도)', u:'', v:0, d:0, g:T2G.rc, ui:'none'},
    {k:'th_on', n:'열 모델 · 모터 열 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'}, {k:'cw_on', n:'열 모델 · 냉각수 온도 (1 = 켬, 수랭 부품이 있을 때)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'in_on', n:'열 모델 · 인버터 온도 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'m_cool', n:'모터 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:0, d:0, g:T2G.thm, ui:'none'}, {k:'i_cool', n:'인버터 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:0, d:0, g:T2G.thm, ui:'none'}, {k:'b_cool', n:'축전지 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'i_c', n:'인버터 열용량', u:'J/K', v:2000, d:0, g:T2G.inv, sb:'인버터 열'}, {k:'i_r', n:'인버터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T2G.inv, sb:'인버터 열'}, {k:'i_init', n:'인버터 출발 온도', u:'°C', v:40, d:0, g:T2G.inv, sb:'인버터 열'},
    {k:'i_ha0', n:'인버터 공랭 hA (정지)', u:'W/K', v:5, d:1, g:T2G.inv, sb:'인버터 공랭'}, {k:'i_ha60', n:'인버터 공랭 hA (60 km/h)', u:'W/K', v:20, d:1, g:T2G.inv, sb:'인버터 공랭'},
    {k:'bt_on', n:'열 모델 · 축전지 온도 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'t_amb', n:'외기 온도', u:'°C', v:25, d:0, g:T2G.thm},
    // 냉각수 등가 기본값 = 도구 9 기본 배치(라디 0.06 m² · UA 250 · 팬 0.08, 펌프 8 L/min, 인버터 → 모터)를 줄인 값
    {k:'cw_mode', n:'수랭 방식 (0 = 부품별 독립 회로, 1 = 냉각 회로)', u:'', v:0, d:0, g:T2G.cool, ui:'none'},
    {k:'cw_v', n:'모터 회로 · 냉각수 양 (라디 · 배관 · 재킷 합)', u:'L', v:1.2, d:2, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'}, {k:'cw_q', n:'모터 회로 · 펌프 유량', u:'L/min', v:8, d:1, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'cw_ra', n:'모터 회로 라디 · 코어 앞면 면적', u:'m²', v:0.06, d:3, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'}, {k:'cw_kd', n:'모터 회로 라디 · 주행풍 중 코어 통과 비율', u:'', v:0.3, d:2, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'cw_fan', n:'모터 회로 라디 · 팬 유량', u:'m³/s', v:0.08, d:3, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'}, {k:'cw_fm', n:'모터 회로 라디 · 팬 켜기 (0 = 늘 켬, 1 = 냉각수 온도로)', u:'', v:0, d:0, g:T2G.cool, ui:'none'}, {k:'cw_fon', n:'모터 회로 라디 · 팬 켜는 냉각수 온도 (3 K 아래로 내려가면 끔)', u:'°C', v:50, d:0, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'cw_ua', n:'모터 회로 라디 · UA (코어 풍속 5 m/s, 다른 풍속은 × (풍속 ÷ 5)^0.6)', u:'W/K', v:250, d:0, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'}, {k:'cw_itd', n:'모터 회로 라디 · 표의 입구 온도차 (냉각수 입구 − 공기 입구)', u:'K', v:60, d:0, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'cw_cm', n:'모터 회로 라디 · 금속 열용량 (알루미늄 kg × 0.9)', u:'kJ/K', v:0, d:2, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'i_wv', n:'인버터 회로 · 냉각수 양 (라디 · 배관 · 재킷 합)', u:'L', v:1.2, d:2, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'}, {k:'i_wq', n:'인버터 회로 · 펌프 유량', u:'L/min', v:8, d:1, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'i_wra', n:'인버터 회로 라디 · 코어 앞면 면적', u:'m²', v:0.06, d:3, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'}, {k:'i_wkd', n:'인버터 회로 라디 · 주행풍 중 코어 통과 비율', u:'', v:0.3, d:2, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'i_wfan', n:'인버터 회로 라디 · 팬 유량', u:'m³/s', v:0.08, d:3, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'}, {k:'i_wfm', n:'인버터 회로 라디 · 팬 켜기 (0 = 늘 켬, 1 = 냉각수 온도로)', u:'', v:0, d:0, g:T2G.cool, ui:'none'}, {k:'i_wfon', n:'인버터 회로 라디 · 팬 켜는 냉각수 온도 (3 K 아래로 내려가면 끔)', u:'°C', v:50, d:0, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'i_wua', n:'인버터 회로 라디 · UA (코어 풍속 5 m/s, 다른 풍속은 × (풍속 ÷ 5)^0.6)', u:'W/K', v:250, d:0, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'}, {k:'i_witd', n:'인버터 회로 라디 · 표의 입구 온도차 (냉각수 입구 − 공기 입구)', u:'K', v:60, d:0, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'i_wcm', n:'인버터 회로 라디 · 금속 열용량 (알루미늄 kg × 0.9)', u:'kJ/K', v:0, d:2, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'b_wv', n:'축전지 회로 · 냉각수 양 (라디 · 배관 · 재킷 합)', u:'L', v:1.2, d:2, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'}, {k:'b_wq', n:'축전지 회로 · 펌프 유량', u:'L/min', v:8, d:1, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_wra', n:'축전지 회로 라디 · 코어 앞면 면적', u:'m²', v:0.06, d:3, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'}, {k:'b_wkd', n:'축전지 회로 라디 · 주행풍 중 코어 통과 비율', u:'', v:0.3, d:2, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_wfan', n:'축전지 회로 라디 · 팬 유량', u:'m³/s', v:0.08, d:3, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'}, {k:'b_wfm', n:'축전지 회로 라디 · 팬 켜기 (0 = 늘 켬, 1 = 냉각수 온도로)', u:'', v:0, d:0, g:T2G.cool, ui:'none'}, {k:'b_wfon', n:'축전지 회로 라디 · 팬 켜는 냉각수 온도 (3 K 아래로 내려가면 끔)', u:'°C', v:50, d:0, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_wua', n:'축전지 회로 라디 · UA (코어 풍속 5 m/s, 다른 풍속은 × (풍속 ÷ 5)^0.6)', u:'W/K', v:250, d:0, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'}, {k:'b_witd', n:'축전지 회로 라디 · 표의 입구 온도차 (냉각수 입구 − 공기 입구)', u:'K', v:60, d:0, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_wcm', n:'축전지 회로 라디 · 금속 열용량 (알루미늄 kg × 0.9)', u:'kJ/K', v:0, d:2, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_c', n:'축전지 열용량', u:'J/K', v:30000, d:0, g:T2G.bth, sb:'축전지 열'}, {k:'b_ha', n:'축전지 공랭 hA (정지)', u:'W/K', v:15, d:1, g:T2G.bth, sb:'축전지 공랭'}, {k:'b_ha60', n:'축전지 공랭 hA (60 km/h)', u:'W/K', v:15, d:1, g:T2G.bth, sb:'축전지 공랭'},
    {k:'b_r', n:'축전지 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T2G.bth, sb:'축전지 열'},
    {k:'b_t0', n:'축전지 출발 온도', u:'°C', v:25, d:0, g:T2G.bth, sb:'축전지 열'}, {k:'b_alpha', n:'내부저항 온도 계수 (25 °C 기준)', u:'1/°C', v:0.01, d:3, g:T2G.bat, sb:'내부저항 (온도)'},
    {k:'h_rcf', dk:'rc_f', n:'롤센터 앞 높이', u:'mm', v:30, d:0, g:T2G.rc, sb:'롤센터 · 롤'}, {k:'h_rcr', dk:'rc_r', n:'롤센터 뒤 높이', u:'mm', v:50, d:0, g:T2G.rc, sb:'롤센터 · 롤'},
    {k:'k_roll', dk:'k_roll', n:'롤강성 합 (앞 + 뒤, 롤각 신호용)', u:'N·m/°', v:500, d:0, g:T2G.rc, sb:'롤센터 · 롤'}, {k:'rsd', dk:'rsd', n:'롤강성 앞 몫 (RSD, 탄성 하중 이동 배분)', v:50, d:1, g:T2G.rc, sb:'롤센터 · 롤'},
    // 차량 모델 2 · 3 (도구 T · 6 · 7 · 1 에서 받음)
    {k:'tire_fz0', dk:'tire_fz0', n:'타이어 기준 하중 (μ · 코너링 강성을 잰 하중)', v:736, d:0, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_ca0', dk:'tire_ca0', v:450, d:0, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'}, {k:'tire_cn', dk:'tire_cn', v:0.8, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_c', dk:'tire_c', v:1.3, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'}, {k:'tire_e', dk:'tire_e', v:0, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_relax', dk:'tire_relax', v:0.3, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tr_ks', n:'경로 곡률 다듬기 거리 (고정 2 m, 화면에 없음)', u:'m', v:2, d:1, g:T2G.rc, sb:'과도 (모델 3)', ui:'none'},
    {k:'steer_ratio', dk:'steer_ratio', n:'조향비 (핸들 각 ÷ 바퀴 각, 가운데)', v:5, d:2, g:T2G.steer, sb:'최대 조향각'}, {k:'delta_max', dk:'delta_max', n:'최대 조향각 (안쪽 바퀴, 최소 회전 반경도 이 값으로)', v:34, d:1, g:T2G.steer, sb:'최대 조향각'},
    {k:'izz', dk:'izz', v:70, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'ixx', dk:'ixx', v:30, d:1, g:T2G.rc, sb:'과도 (모델 3)'},
    {k:'m_us_f', dk:'m_us_f', v:12, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'m_us_r', dk:'m_us_r', v:12, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'c_roll', dk:'c_roll', v:30, d:1, g:T2G.rc, sb:'과도 (모델 3)'},
    {k:'v_test', n:'계단 조향 시험 차속 (고정 60 km/h, 화면에 없음)', u:'km/h', v:60, d:0, g:T2G.rc, sb:'과도 (모델 3)', ui:'none'}, {k:'ay_test', n:'계단 조향 정상 횡가속도 (고정 0.4 g, 화면에 없음)', u:'g', v:0.4, d:2, g:T2G.rc, sb:'과도 (모델 3)', ui:'none'},
    {k:'t_skid', dk:'t_skid', v:0, d:3, g:T2G.goal, ui:'none'}
  ],
  /* 결과 칸은 outHTML 이 그림. outputs = 대시보드 반영 · 입력 훑기 · 검증표 이름 */
  outHTML: t2OutHTML,
  outputs:[
    {k:'t_acc_s', n:'가속 기록', u:'s', d:3}, {k:'t_skid_s', n:'스키드패드 기록 (좌우 합)', u:'s', d:3}, {k:'sk_r', n:'스키드패드 주행 반경 (주행선 · 차 크기로)', u:'m', d:3}, {k:'t_ax_s', n:'오토크로스 기록', u:'s', d:2}, {k:'t_end_s', n:'내구 총 시간', u:'s', d:1},
    {k:'e_use', n:'내구 소비 에너지', u:'kWh', d:2}, {k:'e_reg', n:'내구 회생 회수 에너지', u:'kWh', d:3}, {k:'c_lam', n:'타력 (에너지 상한) 에너지 시간 값 λ', u:'s/kWh', d:1, hide:true}, {k:'e_nl_c', n:'내구 소비 에너지 (출력 상한 없이)', u:'kWh', d:2}, {k:'p_lim', n:'내구 출력 상한 비율', u:'%', d:1},
    {k:'vmax', dk:'vmax', d:1}, {k:'ay_skid', dk:'ay_max_sim', d:2},
    {k:'gr_opt', dk:'gr', n:'제안 감속비 (배점 가중)', d:2, hide:true}, {k:'e_lap', dk:'e_lap', d:3, hide:true},
    {k:'c_afmax', n:'최대 앞 슬립각', u:'°', d:2, hide:true}, {k:'c_armax', n:'최대 뒤 슬립각', u:'°', d:2, hide:true}, {k:'c_bmax', n:'최대 차체 각도 β', u:'°', d:2, hide:true},
    {k:'c_dwmax', n:'최대 바퀴 조향각', u:'°', d:2, hide:true}, {k:'c_swmax', n:'최대 핸들 각', u:'°', d:1, hide:true}, {k:'c_satn', n:'타이어 포화 점 수', u:'', d:0, hide:true}, {k:'c_dbad', n:'조향 한계로 느려진 거리', u:'m', d:1, hide:true}, {k:'c_bdlen', n:'차체가 경계에 닿지 않게 속도를 낮춘 거리', u:'m', d:1, hide:true}, {k:'c_bddv', n:'차체 경계로 가장 크게 낮춘 속도', u:'km/h', d:1, hide:true}, {k:'c_bdct', n:'아주 느려도 차체가 닿는 슬라럼 콘', u:'개', d:0, hide:true}, {k:'c_trdt', n:'과도로 늘어난 랩 시간', u:'s', d:3, hide:true}, {k:'c_trlen', n:'과도로 속도를 낮춘 거리', u:'m', d:1, hide:true}, {k:'c_trq', n:'정상보다 더 쓴 타이어 몫 최대 (과도)', u:'%', d:1, hide:true}, {k:'c_trit', n:'과도 되풀이 수', u:'', d:0, hide:true}, {k:'c_trok', n:'과도 상한 다 맞춤 (1)', u:'', d:0, hide:true},
    {k:'k_us_lin', n:'선형 언더스티어 구배 (모델 2)', u:'°/g', d:3, hide:true},
    {k:'tr_v', n:'시험 차속', u:'km/h', d:0, hide:true}, {k:'tr_del', n:'바퀴 조향각 (계단)', u:'°', d:3, hide:true}, {k:'tr_sw', n:'핸들 각 (계단)', u:'°', d:2, hide:true},
    {k:'tr_rss', n:'정상 요레이트 (해석해)', u:'°/s', d:3, hide:true}, {k:'tr_r', n:'요레이트 (3 s, 수치)', u:'°/s', d:3, hide:true}, {k:'tr_gain', n:'요레이트 이득 r/δ', u:'1/s', d:3, hide:true},
    {k:'tr_ay', n:'횡가속도 (3 s)', u:'g', d:3, hide:true}, {k:'tr_os', n:'요레이트 오버슈트', u:'%', d:1, hide:true}, {k:'tr_t90', n:'요레이트 응답 시간 (조향 50 % → 요레이트 90 %)', u:'s', d:3, hide:true},
    {k:'tr_wn', n:'고유진동수 (2 자유도)', u:'Hz', d:3, hide:true}, {k:'tr_zeta', n:'감쇠비 (2 자유도)', u:'', d:3, hide:true}, {k:'tr_beta', n:'차체 각도 β (3 s)', u:'°', d:3, hide:true},
    {k:'tr_phi', n:'롤각 (3 s, 수치)', u:'°', d:3, hide:true}, {k:'tr_phis', n:'롤각 (정상, 해석해)', u:'°', d:3, hide:true}, {k:'tr_kus', n:'언더스티어 구배 (축 코너링 강성)', u:'°/g', d:3, hide:true}, {k:'tmax_o', dk:'tmax', n:'모터 최대 토크 (피크 토크 표 최댓값)', d:1, hide:true}, {k:'q_cool', dk:'q_cool', d:2, hide:true}, {k:'q_mot', dk:'q_mot', d:0, hide:true}, {k:'q_inv', dk:'q_inv', d:0, hide:true}, {k:'q_bat', dk:'q_bat', d:0, hide:true}, {k:'v_end_avg', dk:'v_end_avg', d:1, hide:true},
    {k:'t_free1', n:'내 코스 1번째 랩', u:'s', d:2, hide:true}, {k:'t_free2', n:'내 코스 2번째 랩', u:'s', d:4, hide:true}, {k:'t_freeavg', n:'내 코스 평균 랩', u:'s', d:4, hide:true},
    {k:'n_free', n:'내 코스 랩 수', u:'랩', d:0, hide:true}, {k:'e_free', n:'내 코스 2번째 랩 단자 에너지', u:'kWh', d:5, hide:true},
    {k:'ax_0', n:'가속 출발 종가속도', u:'g', d:2, hide:true}, {k:'ax_max', n:'가속 최대 종가속도', u:'g', d:2, hide:true}, {k:'v_endtop', n:'내구 최고 차속', u:'km/h', d:1, hide:true}, {k:'skid_roll', n:'스키드패드 롤각 (모델 단계 1)', u:'°', d:3, hide:true}, {k:'c_tw', n:'냉각수 끝 온도', u:'°C', d:3, hide:true}, {k:'c_tb', n:'축전지 끝 온도', u:'°C', d:3, hide:true}, {k:'cla_req', n:'필요 C_L·A', u:'m²', d:2, hide:true},
    {k:'v_load', n:'최대 전류 때 단자 전압', u:'V', d:1, hide:true}, {k:'p_max', n:'단자 출력 상한', u:'kW', d:3, hide:true}, {k:'n_base', n:'모터 기저 회전수', u:'rpm', d:0, hide:true},
    {k:'n_lap', n:'내구 랩 수', u:'랩', d:0, hide:true}, {k:'n_st1', n:'첫 드라이버 랩 수', u:'랩', d:0, hide:true}, {k:'e_ok', n:'에너지 한도 안 (1 = 예)', u:'', d:0, hide:true}, {k:'c_tm', n:'고른 코스 끝 모터 온도', u:'°C', d:3, hide:true}
  ],
  sigs:[
    {k:'v', g:'주행', n:'차속', u:'km/h', d:1}, {k:'pw', g:'주행', n:'바퀴 출력 (구동 +, 제동 −)', u:'kW', d:1}, {k:'vlim', g:'주행', n:'코너 한계 속도', u:'km/h', d:1}, {k:'ax', g:'주행', n:'종가속도', u:'g', d:2}, {k:'ay', g:'주행', n:'횡가속도 (왼쪽 선회 +)', u:'g', d:2},
    {k:'fz_fl', g:'바퀴 하중 · 롤', n:'앞왼 바퀴 하중', u:'N', d:0}, {k:'fz_fr', g:'바퀴 하중 · 롤', n:'앞오 바퀴 하중', u:'N', d:0}, {k:'fz_rl', g:'바퀴 하중 · 롤', n:'뒤왼 바퀴 하중', u:'N', d:0}, {k:'fz_rr', g:'바퀴 하중 · 롤', n:'뒤오 바퀴 하중', u:'N', d:0}, {k:'roll', g:'바퀴 하중 · 롤', n:'롤각 (모델 단계 1, 왼쪽 선회 +)', u:'°', d:2}, {k:'tcool', g:'온도 (열 모델)', n:'냉각수 온도 (열 모델 냉각수 온도)', u:'°C', d:1}, {k:'tbat', g:'온도 (열 모델)', n:'축전지 온도 (열 모델 축전지 온도)', u:'°C', d:1}, {k:'tinv', g:'온도 (열 모델)', n:'인버터 온도 (열 모델 인버터 온도)', u:'°C', d:1},
    {k:'rpm', g:'모터 · 축전지', n:'모터 회전수', u:'rpm', d:0}, {k:'tq', g:'모터 · 축전지', n:'모터 토크', u:'N·m', d:1}, {k:'pbat', g:'모터 · 축전지', n:'축전지 단자 출력 (회생 −)', u:'kW', d:1}, {k:'vbat', g:'모터 · 축전지', n:'축전지 단자 전압', u:'V', d:1},
    {k:'eta', g:'모터 · 축전지', n:'모터 × 인버터 효율', u:'%', d:1}, {k:'tmot', g:'온도 (열 모델)', n:'모터 온도', u:'°C', d:1}, {k:'tlim', g:'모터 · 축전지', n:'모터 토크 한계 (디레이팅 포함)', u:'N·m', d:1}, {k:'grip', g:'주행', n:'그립 사용률 (차 전체)', u:'%', d:0}, {k:'t', g:'주행', n:'경과 시간', u:'s', d:2}, {k:'ecum', g:'모터 · 축전지', n:'누적 단자 에너지', u:'Wh', d:0},
    {k:'af', g:'차량 모델 2 (조향 · 슬립)', n:'앞 슬립각 (모델 2, 왼쪽 선회 +)', u:'°', d:2}, {k:'ar', g:'차량 모델 2 (조향 · 슬립)', n:'뒤 슬립각 (모델 2)', u:'°', d:2}, {k:'beta', g:'차량 모델 2 (조향 · 슬립)', n:'차체 각도 β (모델 2)', u:'°', d:2}, {k:'dw', g:'차량 모델 2 (조향 · 슬립)', n:'바퀴 조향각 (모델 2, 두 바퀴 평균)', u:'°', d:2}, {k:'sw', g:'차량 모델 2 (조향 · 슬립)', n:'핸들 각 (모델 2)', u:'°', d:1},
  ],
  sigGroups:['주행', '모터 · 축전지', '온도 (열 모델)', '바퀴 하중 · 롤', '차량 모델 2 (조향 · 슬립)'],   /* 신호 고르기 창의 묶음 순서 */
  sigOn:['v', 'pw'],
  extHTML: t2ExtHTML, midHTML: t2MidHTML, extraI: t2ExtraI, inLock: t2InLock, inEff: t2InEff, inOpt: t2InOpt, inExt: true, inPanel: false, deferCalc: () => T2.tab!=='sim',   /* 편집 탭에서는 계산하지 않음 → 시뮬레이션 탭으로 갈 때 */
  inEmpty: '<p class="muted wb-inempty">입력은 위 [편집] 탭에 항목별로 있습니다. 자주 바꿔 보는 값은 나중에 이곳으로 꺼낼 예정입니다.</p>',
  extGet: () => t2State(),   /* 저장과 같은 범위 (코스 · 모든 표 · 조향각 표 · 냉각 회로 · [표 | 상수]) */
  exReset(){ try{ localStorage.removeItem(wbMK(T2KEY)); }catch(e){} t2ModeReset('ex'); },
  /* 새 파일: 칸 말고 채워야 하는 표 · 배치 (k = 화면 표시 [data-wbneed]) */
  needExt(){ const L = [], P = t2MotorParse(T2.mtext || ''), th = t2Th(), C = T2.cwc && T2.cwc.cool;
    if(!P.pts.length && !P.ptsC.length) L.push({k:'t2:mt', n:'모터 토크 곡선 표', g:'모터 · 인버터', tab:'mt'});
    if(T2.course==='free' && !String(T2.free.text || '').replace(/^.*\n/, '').trim()) L.push({k:'t2:track', n:'내 코스 표', g:'코스', tab:'course'});
    if(th.w && WB.I.cw_mode===1 && !(C && (C.circuits || []).some(c => (c.blocks || []).length))) L.push({k:'t2:cool', n:'냉각 회로 배치', g:'냉각', tab:'cool'});
    /* [아래 표]를 골랐는데 빈 표 (라디 표는 부품별 독립 수랭일 때만 보임) */
    [...T2MOT.slice(1), 'tire', 'eD', ...T2BAT, ...(WB.I.cw_mode===1 ? [] : T2RAD)].forEach(k => { if(T2.use[k]==='tab' && !t2HasMap(k) && !t2MapOff(k)) L.push({k:'t2:' + k, n:T2ET[k], g:{mot:'모터 · 인버터', bat:'축전지', cool:'냉각', dt:'구동계', tire:'타이어'}[t2Grp(k)] || '', tab:k}); });
    return L; },
  /* 편집 탭 위 단추: 빈 필수 칸이 있는 묶음을 빨강 */
  onNeedOpen(){ T2.tab = 'edit'; },
  /* [도구 연결 ▾]: 도구 9 · 4 에서 가져오기, 도구 9 로 보내기 (2026-11-11) */
  links(){ const o = WB.R && WB.R.out, rd = id => { try{ return JSON.parse(localStorage.getItem(wbStoreKey(id)) || '{}') || {}; }catch(e){ return {}; } }, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
    const cs = cool => { const C = (cool && cool.circuits) || []; return C.some(c => (c.blocks || []).length) ? `수랭 회로 ${C.filter(c => c.kind==='water').length}개 · 공랭 덕트 ${C.filter(c => c.kind!=='water').length}개` : ''; };
    const c9 = typeof T9!=='undefined' ? cs(T9.cool) : '', C4 = typeof t4CellGet==='function' ? t4CellGet() || {} : {};
    const tb = (k, src, unit, P) => ({tool:'도구 4', n:T2ET[k], to:`축전지 › ${T2ET[k]}`, now:t2HasMap(k) ? P(t2MtText(k)).msg || '있음' : '비어 있음', val:src ? P(src).msg || '있음' : '', ok:!!src, why:'도구 4 [셀 표]가 비어 있음',
      run(){ const had = t2HasMap(k); T2[k] = src; t2UseAuto(k, had); t2Save(); wbSrcSet('2', ['t2:' + k], '도구 4'); return T2ET[k]; }});
    const s9 = rd('9'), U = k => ((WB_TOOLS['9'] && WB_TOOLS['9'].inputs.find(d => d.k===k)) || {}).u || '', ok2 = !!(o && isFinite(o.c_qm)), why2 = '랩 시뮬 탭에서 계산한 뒤 보낼 수 있음';
    const put9 = (keys, vals, nm) => () => { const s = rd('9'); keys.forEach((k, i) => { s[k] = vals()[i]; }); try{ localStorage.setItem(wbStoreKey('9'), JSON.stringify(s)); }catch(e){} wbSrcSet('9', keys, '도구 2P'); return nm; };
    return {
      get:[{tool:'도구 9', n:'냉각 회로 배치', to:'편집 › 냉각 › 냉각 회로 (수랭 방식이 [냉각 회로]일 때 씀)', now:cs(t2Cwc().cool) || '비어 있음', val:c9, ok:!!c9, why:'도구 9 에 배치가 없음',
          run(){ t2Cwc().cool = JSON.parse(JSON.stringify(T9.cool)); t2Save(); wbSrcSet('2', ['t2:cool'], '도구 9'); return '냉각 회로 배치'; }},
        tb('bO', C4.o, 'V', t => t2GridParse(t, 'V')), tb('bR', C4.r, 'mΩ', t => t2GridParse(t, 'mΩ')), tb('bC', C4.c, '', t2PairParse)],
      send:[{tool:'도구 9', n:'주행 평균 발열 (모터 손실 · 인버터 손실 · 축전지 발열)', to:'도구 9 › 주행 평균 발열 3칸', now:`${f(s9.L_m, 0)} · ${f(s9.L_i, 0)} · ${f(s9.L_b, 0)} W`, val:ok2 ? `${f(o.c_qm, 0)} · ${f(o.c_qi, 0)} · ${f(o.c_qb, 0)} W` : '', ok:ok2, why:why2,
          run:put9(['L_m', 'L_i', 'L_b'], () => [+o.c_qm.toFixed(1), +o.c_qi.toFixed(1), +o.c_qb.toFixed(1)], '주행 평균 발열')},
        {tool:'도구 9', n:'평균 차속', to:'도구 9 › 평균 차속', now:`${f(s9.v, 1)} ${U('v')}`, val:ok2 ? `${f(o.c_vavg, 1)} km/h` : '', ok:ok2, why:why2, run:put9(['v'], () => [+o.c_vavg.toFixed(2)], '평균 차속')},
        {tool:'도구 9', n:'주행 시간', to:'도구 9 › 주행 시간', now:`${f(s9.t_run, 0)} ${U('t_run')}`, val:ok2 ? `${f(o.c_trun, 0)} s` : '', ok:ok2, why:why2, run:put9(['t_run'], () => [Math.round(o.c_trun)], '주행 시간')},
        {tool:'도구 9', n:'외기 온도', to:'도구 9 › 외기 온도', now:`${f(s9.t_amb, 0)} °C`, val:`${f(WB.I.t_amb, 0)} °C`, ok:isFinite(WB.I.t_amb), why:'이 도구의 외기 온도가 비어 있음', run:put9(['t_amb'], () => [WB.I.t_amb], '외기 온도')}],
      info:['평균 발열 · 차속은 지금 랩 시뮬 결과 (고른 코스 · 랩) 의 평균입니다.',
        '조향각 표는 도구 6 의 [도구 연결]에서 보냅니다 (이 도구에서 가져오려면 도구 6 계산 결과가 필요해서).',
        '도구 1 · 4 · T 등의 설계값은 대시보드를 거쳐 왼쪽 [대시보드 값으로 채우기]로 받습니다.'] }; },
  /* 뒤로가기 · 앞으로가기: 랩 시뮬 / 편집 탭 · 편집 묶음 · 코스 편집 쪽 */
  navGet: () => ({t:T2.tab, e:T2.etab, c:T2.ecourse}),
  navSet(s){ const tc = T2.tab!==s.t; T2.etab = s.e || T2.etab; T2.ecourse = s.c || T2.ecourse; T2.tab = s.t || T2.tab; T2.menu = ''; t2Save(); wbPaint(['ext']);
    if(tc){ if(T2.tab==='sim'){ t2MapRepaint(); t2PfSoon(); if(WB.dirty || (WB.need || []).length){ WB.dirty = false; wbCalc(); } } else wbNeedMark(); } },   /* 새 파일 빈칸이면 편집 탭에서 시작 */
  needMark(L){ const gs = new Set(L.map(x => x.tab ? t2Grp(x.tab) : (d => d && Object.keys(T2EG).find(e => (T2EG[e] || []).includes(d.g)))(WB_TOOLS['2'].inputs.find(o => o.k===x.k))).filter(Boolean));
    document.querySelectorAll('#wb [data-t2eg]').forEach(b => b.classList.toggle('need', gs.has(b.dataset.t2eg))); document.querySelectorAll('#wb [data-t2tab="edit"]').forEach(b => b.classList.toggle('need', gs.size > 0));
    const ts = new Set(L.map(x => x.tab).filter(Boolean)); document.querySelectorAll('#wb [data-t2et]').forEach(b => b.classList.toggle('need', ts.has(b.dataset.t2et))); },
  /* 목록에서 고른 칸: 편집 탭의 그 묶음 (표는 그 표) */
  needGo(k, tab){ let et = tab; if(!et){ const d = WB_TOOLS['2'].inputs.find(o => o.k===k); et = d && Object.keys(T2EG).find(e => (T2EG[e] || []).includes(d.g)); }
    if(!et) return false; T2.tab = 'edit'; T2.etab = et; t2Save(); wbPaint(['ext']); return true; },
  extSet(d){ if(!d || typeof d!=='object') return; t2Load(d); t2Save(); wbPaint(['ext', 'mid', 'in']); },
  /* 결과가 오면: 고른 모드를 꺼내 씀 (두 모드 모두 들어 있음) → 위 줄 · 지도 · 구동력 선도 */
  onResult(R){ if(R && R.modes) Object.assign(R, R.modes[T2.grMode]);
    if(T2.tab==='sim'){ const hr = $('#wbext .t2-hr'); if(hr) wbPaint(['ext']); t2MapRepaint(); t2PfSoon(); }
    else if(T2.etab==='mt'){ const c = $('#t2mc'); if(c) c.innerHTML = t2EditPlot('mt'); const f = $('#wbext .t2-fcap'); if(f) f.innerHTML = t2EditCap('mt'); } },
  onCursor(){ t2MapRepaint(); t2PfSoon(); },
  tour: M2TOUR,
  verifyBase:{cw_mode:0, cw9:null, bOcv:null, bRes:null, bCap:null, mu_s:0, tire_fz0:0, fz0_m:0, delta_max:0, dl_on:0, drv:0, dr_real:0, dr_ks:0.9, dr_ke:0.7, rg_on:0, wc_on:0, ict_m:1, i_init:40, end:{seg:[], laps:26, stint:13}, free:{seg:[], laps:1, s0:0}, motor:[], motorC:[], effM:null, effI:null, tireMap:null, r_pack:0, i_bms_max:1e9, pmax:1e6, eta_mot:100, eta_inv:100,
              dr_t0:80, dr_t1:100, c_pct:100, kt:0.64, i_pk:1e9, i_ct:1e9, i_cpct:100, di_t0:50, di_t1:85, th_c:6000, th_r:0.02, th_cool:40, cw_tw:NaN, i_wtw:NaN, b_wtw:NaN, cw_fm:NaN, i_wfm:NaN, b_wfm:NaN, cw_fon:0, i_wfon:0, b_wfon:0, pk_dir:NaN, th_init:40, rl_on:0, rl_b:1, w_car:0, oh_f:0, oh_r:0, rl_m:0.2, e_lim:1, md:0, th_on:1, cw_on:0, bt_on:0, in_on:0, m_cool:1, i_cool:1, b_cool:0, eff_mg:0, m_ha60:null, i_ha60:null, b_ha60:null, h_rcf:0, h_rcr:0, k_roll:500, course:'acc', lap:'2', grMode:'my'},
  verify:[
    {n:'가속 · 접지 한계만 (μ = 1, CG 뒤축 위)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5}, expect:{t_acc_s:3.910309, ax_0:1}, src:'a = μg → t = √(2 × 75 ÷ 9.81)'},
    {n:'현실 운전자 · 가속 페달 신호 0 → 100 % 0.2 s (접지 한계 a = g, 정지 출발)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, dr_real:1, dr_ks:0.9, dr_ke:0.7}, expect:{t_acc_s:4.009883},
     src:'0.2 s 동안 a = g t ÷ 0.2 → v = 0.981, x = g × 0.2² ÷ 6 = 0.0654 m. 남은 74.935 m 는 a = g: t = 0.2 + (−0.981 + √(0.981² + 2g × 74.935)) ÷ g = 4.0099 s (= √(150 ÷ g) + 약 0.1 s)'},
    {n:'현실 운전자 · 제동 페달 신호 0 → 100 % 0.2 s · 가속 신호는 같이 내려감 (직선 60 m → 반경 100 m 원호 50 m, a = b = g)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, dr_real:1, dr_ks:1, dr_ke:1, course:'free', lap:'1', free:{seg:[[60, 0], [50, 100]], closed:false, laps:1, s0:0}}, expect:{c_t:5.201298},
     src:'원호 속도 √(g × 100) = 31.321. 제동 시작 s_on 에서 0.2 s 동안 가속도 = g (1 − t ÷ 0.2) − g t ÷ 0.2 → 속도는 그대로 v₀, 거리 v₀ × 0.2 + g × 0.2² ÷ 2 − 2g × 0.2² ÷ 6. 그 뒤 v₀² = 31.321² + 2g (60 − s₁) 를 풀면 s_on = 51.788 m, v₀ = 31.871. 시간 = 출발 (0.2 + …) 3.249 + 제동 0.256 + 원호 50 ÷ 31.321 = 5.2013 s (페달 즉시면 5.1008 s)'},
    {n:'가속 · 회전부 관성 J ÷ r²', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100}, expect:{t_acc_s:5.477226}, src:'F = 100 × 4 ÷ 0.25 = 1600 N, 등가 질량 300 + 1.25 ÷ 0.25² = 320 kg → a = 5'},
    {n:'가속 · 구름 저항 무게 항', I:{m:300, fr:50, h:0, mu:10, crr:0.02, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100}, expect:{t_acc_s:5.580840}, src:'a = (1600 − 0.02 × 300 × 9.81) ÷ 320 = 4.8161'},
    {n:'회전수 한계 최고속', I:{nmax:6500, gr:3.55, r_eff:229}, expect:{vmax:158.0708}, src:'6500 ÷ 3.55 × 2π ÷ 60 × 0.229 × 3.6'},
    {n:'스키드패드 · 에어로 없음', I:{mu:1.5, crr:0, cla:0, cda:0}, expect:{t_skid_s:9.895692, ay_skid:1.5}, src:'v = √(μgR), R = 9.125 → 오른쪽 · 왼쪽 한 바퀴씩 합 = 2 × 2πR ÷ v'},
    {n:'스키드패드 · 레코드 라인 = 주행로 안쪽 끝 (에어로 없음이면 한 바퀴 시간 ∝ √R → 가장 작은 R, 차 폭 1.4 · 여유 0.1 m)', I:{mu:1.5, crr:0, cla:0, cda:0, rl_on:2, wc_on:1, w_car:1.4, rl_m:0.1}, expect:{sk_r:8.425, t_skid_s:9.508559}, src:'R = 7.625 + 0.1 + 0.7 = 8.425 m (FSAE D.10.1 안쪽 지름 15.25 m) → 2 × 2πR ÷ √(μgR)'},
    {n:'스키드패드 · 최소 곡률 라인 = 주행로 바깥 끝 (차 크기 고려 안 함, 경계에서 차 중심 0.5 m)', I:{mu:1.5, crr:0, cla:0, cda:0, rl_on:1, wc_on:0, rl_b:0.5}, expect:{sk_r:10.125, t_skid_s:10.423828}, src:'R = 10.625 − 0.5 = 10.125 m (바깥 지름 21.25 m) → 2 × 2πR ÷ √(μgR)'},
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
    {n:'구동계 효율 맵 · 회전수에 따라 (0 rpm 90 % → 10000 rpm 70 %, 최고속 6500 rpm 에서 77 %)', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_mot:100, eta_inv:100, effD:{n:[0, 10000], t:[0, 500], e:[[90, 70], [90, 70]]}, nmax:6500, gr:3.55, r_eff:229, free:{seg:[[1000, 0]], closed:true, laps:2, s0:0}}, expect:{e_free:0.01592532}, src:'최고속 = 6500 rpm (43.909 m/s), 효율 90 + (70 − 90) × 0.65 = 77 % → 0.0122625 ÷ 0.77 = 0.0159253 kWh'},
    {n:'모터 열 · 일정 손실이면 냉각수 + 손실 × 열저항', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_mot:80, eta_inv:100, nmax:6500, gr:3.55, r_eff:229, th_c:100, th_r:0.01, th_cool:50, th_init:50, course:'free', lap:'2', free:{seg:[[1000, 0]], laps:2, s0:0}}, expect:{c_tm:54.845857}, src:'2번째 랩은 최고속 일정: 손실 = F·v × (1 ÷ 0.8 − 1) = 484.6 W → 50 + 484.6 × 0.01 (시상수 1 s ≪ 22.8 s)'},
    {n:'모터 디레이팅 · 피크 − r × (피크 − 연속), r = (온도 − 시작) ÷ (끝 − 시작)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, tmax:1e5, motor:[[0, 200], [10000, 200]], motorC:[[0, 100], [10000, 100]], v_ref:300, ke_ratio:1, dr_t0:40, dr_t1:60, th_init:45, th_c:1e9, th_r:1e9, th_cool:45}, expect:{t_acc_s:4.008919}, src:'r = (45 − 40) ÷ 20 = 0.25 → 토크 200 − 0.25 × 100 = 175 N·m → F = 175 × 4 ÷ 0.25 = 2800 N, a = 9.333 → t = √(2 × 75 ÷ 9.333)'},
    {n:'모터 디레이팅 표 · 꺾인 직선 (40 °C 0 % · 50 °C 60 % · 60 °C 100 %, 45 °C → 30 %)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, tmax:1e5, motor:[[0, 200], [10000, 200]], motorC:[[0, 100], [10000, 100]], v_ref:300, ke_ratio:1, dr_t0:40, dr_t1:60, derM:{t:[40, 50, 60], r:[0, 60, 100]}, th_init:45, th_c:1e9, th_r:1e9, th_cool:45}, expect:{t_acc_s:4.067446}, src:'r = 0 + 60 × (45 − 40) ÷ 10 = 30 % → 200 − 0.3 × 100 = 170 N·m → F = 170 × 4 ÷ 0.25 = 2720 N, a = 9.0667 → t = √(2 × 75 ÷ 9.0667) (표가 시작 · 끝 직선 대신)'},
    {n:'디레이팅 · 회전수마다 다른 연속 곡선 (같은 비율 r)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [5000, 200], [10000, 100]], motorC:[[0, 100], [5000, 80], [10000, 60]], tq_n:2500, tq_tm:50}, expect:{c_tqp:145}, src:'r = 0.5 · 2500 rpm: 피크 200, 연속 = 100 + (80 − 100) × 0.5 = 90 → 200 − 0.5 × 110 = 145 N·m'},
    {n:'디레이팅 · 꺾인 피크 구간', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [5000, 200], [10000, 100]], motorC:[[0, 100], [5000, 80], [10000, 60]], tq_n:7500, tq_tm:50}, expect:{c_tqp:110}, src:'7500 rpm: 피크 150, 연속 70 → 150 − 0.5 × 80 = 110 N·m'},
    {n:'디레이팅 · 단자 전압 절반이면 회전수 축이 절반으로 (두 곡선 같이)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [5000, 200], [10000, 100]], motorC:[[0, 100], [5000, 80], [10000, 60]], tq_n:2500, tq_tm:50, tq_V:150}, expect:{c_tqp:140}, src:'환산 회전수 5000: 피크 200, 연속 80 → 200 − 0.5 × 120 = 140 N·m'},
    {n:'연속 열이 비면 연속 = 피크 × 비율', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [10000, 200]], motorC:[], c_pct:60, tq_n:3000, tq_tm:50}, expect:{c_tqp:160}, src:'연속 = 200 × 0.6 = 120 → 200 − 0.5 × 80 = 160 N·m'},
    {n:'피크 열이 비면 피크 = 연속 ÷ 비율 (끝 온도 위 = 연속)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[], motorC:[[0, 120], [10000, 120]], c_pct:60, tq_n:3000, tq_tm:70}, expect:{c_tqp:120}, src:'r 은 1 에서 멈춤 → 연속 120 N·m'},
    {n:'피크 열이 비면 피크 = 연속 ÷ 비율 (시작 온도 아래 = 피크)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[], motorC:[[0, 120], [10000, 120]], c_pct:60, tq_n:3000, tq_tm:30}, expect:{c_tqp:200}, src:'120 ÷ 0.6 = 200 N·m'},
    {n:'모터 열 끔 → 온도가 높아도 피크', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [5000, 200], [10000, 100]], motorC:[[0, 100], [5000, 80], [10000, 60]], th_on:0, tq_n:2500, tq_tm:60}, expect:{c_tqp:200}, src:'모터 디레이팅은 모터 열을 켤 때만'},
    {n:'인버터 상전류 한계 · K_t × I_피크 (늘 적용)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [10000, 200]], motorC:[], kt:0.5, i_pk:300, i_ct:150, tq_n:3000, tq_tm:30}, expect:{c_tqp:150}, src:'인버터 온도 끔 → r_i = 0 → 0.5 × 300 = 150 N·m (< 피크 200)'},
    {n:'인버터 디레이팅 · 인버터 온도로 I_피크 → I_연속 (모터와 같은 방식)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [10000, 200]], motorC:[], kt:0.5, i_pk:300, i_ct:150, di_t0:50, di_t1:70, in_on:1, tq_n:3000, tq_tm:30, tq_ti:60}, expect:{c_tqp:112.5}, src:'r_i = (60 − 50) ÷ 20 = 0.5 → I = 300 − 0.5 × 150 = 225 A → 0.5 × 225 = 112.5 N·m'},
    {n:'인버터 디레이팅 표 (50 °C 0 % · 60 °C 80 % · 70 °C 100 %, 60 °C → 80 %)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [10000, 200]], motorC:[], kt:0.5, i_pk:300, i_ct:150, di_t0:50, di_t1:70, derI:{t:[50, 60, 70], r:[0, 80, 100]}, in_on:1, tq_n:3000, tq_tm:30, tq_ti:60}, expect:{c_tqp:90}, src:'r_i = 0.8 → I = 300 − 0.8 × 150 = 180 A → 0.5 × 180 = 90 N·m (표가 직선 0.5 대신)'},
    {n:'인버터 연속 전류를 피크 × 비율로', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [10000, 200]], motorC:[], kt:0.5, i_pk:300, ict_m:0, i_ct:0, i_cpct:50, di_t0:50, di_t1:70, in_on:1, tq_n:3000, tq_tm:30, tq_ti:80}, expect:{c_tqp:75}, src:'I_연속 = 300 × 0.5 = 150 A, r_i = 1 → 0.5 × 150 = 75 N·m'},
    {n:'모터 · 인버터 디레이팅이 함께면 작은 쪽', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [5000, 200], [10000, 100]], motorC:[[0, 100], [5000, 80], [10000, 60]], kt:0.5, i_pk:300, i_ct:150, di_t0:50, di_t1:70, in_on:1, tq_n:2500, tq_tm:50, tq_ti:70}, expect:{c_tqp:75}, src:'모터 145 N·m · 인버터 0.5 × 150 = 75 N·m → 75'},
    {n:'대시보드 모터 최대 토크 = 피크 표 최댓값 (피크가 없으면 연속 ÷ 비율)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, motor:[], motorC:[[0, 120], [5000, 114], [10000, 60]], c_pct:60}, expect:{tmax_o:200}, src:'연속 최댓값 120 ÷ 0.6 = 200 N·m'},
    {n:'축전지 · 최대 전류 때 단자 전압', I:{n_s:72, c_vmax:4.2, r_pack:180, i_bms_max:270}, expect:{v_load:253.8}, src:'72 × 4.2 − 270 × 0.18'},
    {n:'축전지 · 단자 출력 상한', I:{n_s:72, c_vmax:4.2, r_pack:180, i_bms_max:270, pmax:80}, expect:{p_max:68.526}, src:'min(80 kW, 253.8 V × 270 A) = 68.53 kW'},
    {n:'모터 · 기저 회전수가 전압에 비례', I:{motor:[[0, 200], [3000, 200], [6000, 100]], v_ref:300, ke_ratio:1, n_s:50, c_vnom:3, nmax:9000, tmax:250}, expect:{n_base:1565}, src:'표 기준 300 V 에서 3000 rpm 부터 줄어듦 → 150 V 면 1500 rpm 부터. 98 % (196 N·m) 는 1560 rpm, 그 아래로 처음 내려가는 5 rpm 칸 = 1565'},
    {n:'내구 · 26랩 = 드라이버 13 + 13', I:{end:{seg:[[100, 0]], laps:26, stint:13}}, expect:{n_lap:26, n_st1:13}, src:'대회 공식'},
    {n:'내구 · 에너지 제한이 걸리면 소비 ≤ 한도', I:{end:{seg:[[400, 0], [31.4159, 10], [400, 0], [31.4159, 10]], laps:26, stint:13}, e_target:3, e_lim:2, pmax:80}, expect:{e_ok:1}, src:'한도 3 kWh 로 줄이면 출력 상한을 낮춰 맞춤'},
    {n:'주행선 · 슬라럼 콘 2개 (곧은 80 m 닫힌 코스, 폭 6 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[3, 3, 3, 3], WR:[3, 3, 3, 3], slalom:[1, 3]}}, expect:{c_len:80.119760},
     src:"Σ(e'')² 최소, e(20) = +1, e(60) = −1, 주기 80 → 2계 차분이 콘 사이에서 직선 → e(u) = a·u + c·u³ (u = x − 40, 1 m 간격), c = 1 ÷ (2·20³ + 20), a = −(3·20² + 1)·c → 길이 = Σ√(1 + Δe²)"},
    {n:'주행선 · 둥근 코스 + 안쪽 콘 (반경 20 m, 폭 6 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[125.663706, 20]], laps:1, stint:1, WL:[3], WR:[3], slalom:[0]}}, expect:{c_len:119.380521},
     src:'곡률 일정이면 Σ(k0 + e″)² 는 e 가 일정할 때 가장 작음 → 콘 때문에 e = +1 (안쪽 1 m) → 반경 19 m, 길이 = 2π × 19'},
    {n:'주행선 · 차 전폭으로 여유 (전폭 1.6 m + 여유 0.2 m)', I:{wc_on:1, course:'end', rl_on:1, rl_b:5, w_car:1.6, rl_m:0.2, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[3, 3, 3, 3], WR:[3, 3, 3, 3], slalom:[1, 3]}}, expect:{c_len:80.119760, c_rlb:1},
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
    {n:'열 모델 모터 · 냉각수 · 축전지 · 정상 온도 (직선 20 km, 최고속 일정, 효율 90 · 95 %)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, th_on:1, cw_on:1, bt_on:1, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, cw_mode:0, i_cool:0}, expect:{c_tm:30.939432, c_tw:26.632012, c_tb:25.407582},
     src:'F = 0.015·300·9.81 = 44.15 N, v = 43.909 m/s → 축 1938.4 W, 모터 손실 215.371 W (인버터는 공랭 · 온도 끔 → 냉각수에 안 넣음). 모터 회로 [라디 → 펌프 → 모터]: 팬 0.3 m³/s ÷ 0.06 m² = 코어 5 m/s → UA 200, C_a 361.8 · C_c 557.33 W/K → ε C_min = 131.97 W/K, 라디 입구 (가장 뜨거움) = 25 + 215.371 ÷ 131.97 = 26.6320, 모터 = + 215.371 × 0.02 = 30.9394, 축전지: 단자 2267.1 W, 개방 70 × 3.6 = 252 V, R 0.1 Ω → I = 9.0286 A, 발열 I² R = 8.1516 W → 25 + 8.1516 ÷ 20 = 25.4076 °C'},
    {n:'부품별 독립 · 라디 방열 표 (코어 5 m/s · 8 L/min 에서 6.0 kW @ 입구 온도차 60 K)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, th_on:1, cw_on:1, bt_on:1, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:9999, cw_itd:60, rqM:{n:[4, 8, 12], t:[2, 5, 8], e:[[2.4, 3.0, 3.3], [4.1, 6.0, 6.6], [5.2, 7.0, 7.9]]}, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, cw_mode:0, i_cool:0}, expect:{c_tw:27.15371, c_tm:31.46113},
     src:'표의 점이므로 ε C_min = 6000 ÷ 60 = 100 W/K (UA 9999 는 안 씀) → 라디 입구 = 25 + 215.371 ÷ 100 = 27.1537, 모터 = + 215.371 × 0.02 = 31.4611'},
    {n:'열 모델 축전지 · 내부저항 온도 의존 (α = 0.02 /°C)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, th_on:1, cw_on:1, bt_on:1, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0.02}, expect:{c_tb:25.404263},
     src:'T = 25 + I(T)²·R(T) ÷ 20, R(T) = 0.1 (1 + 0.02 (25 − T)) 를 고정점 반복으로 풂 (셀 70 직렬 · 252 V) → 25.4043 °C'},
    {n:'팩 값 직접 입력 (직렬 수 0, 팩 252 V · 28 Ah) = 위와 같은 팩 (셀 3.6 V × 70 직렬)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, th_on:1, cw_on:1, bt_on:1, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:0, c_vmax:3.6, p_vmax:252, p_vnom:252, p_vmin:252, p_ah:28, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0.02}, expect:{c_tb:25.404263},
     src:'직렬 수 = 252 ÷ 3.6 = 70, 셀 공칭 · 최소 = 252 ÷ 70 = 3.6 V, 병렬 1 × 28 Ah = 7 × 4 Ah → 위 경우와 같은 팩이므로 같은 25.4043 °C'},
    {n:'최소 회전 반경 · 레코드 라인이 안쪽으로 가다 멈춤 (반경 20 m, 폭 6 m, 최대 조향각 4.8188° → R 19 m)', I:{course:'free', lap:'2', rl_on:2, rl_b:1, dl_on:1, delta_max:4.818897983525083, mu:1, mu_s:0, crr:0, cla:0, cda:0, tmax:1e5, free:{seg:[[125.663706, 20]], wl:[3], wr:[3], closed:true, laps:2, s0:0}}, expect:{c_t:8.744242, c_len:119.380521, c_rbad:0},
     src:'제약이 없으면 안쪽 경계 18 m. 반경 19 m 아래로는 못 가므로 r = 19: 2π·19 ÷ √(9.81·19) = 8.7442 s, 길이 2π·19'},
    {n:'최소 회전 반경 · 최소 곡률 라인을 바깥으로 밀어 맞춤 (반경 20 m, 폭 6 m, 최대 조향각 4.3477° → R 21 m)', I:{course:'free', lap:'1', rl_on:1, rl_b:1, dl_on:1, delta_max:4.347748314976781, free:{seg:[[125.663706, 20]], wl:[3], wr:[3], closed:true, laps:1, s0:0}}, expect:{c_rbad:0},
     src:'제약이 없으면 가운데 선 20 m (어긋남). 원에서는 반경 21 ~ 22 m 가 모두 목적 함수 값이 같아 반경 하나로 정해지지 않으므로, 제약을 지켰는지(급한 구간 0 m)만 봄'},
    {n:'조향 한계 고려 안 함 → 제약 없는 레코드 라인 (반경 20 m, 폭 6 m, 최대 조향각 4.8188°)', I:{course:'free', lap:'2', rl_on:2, rl_b:1, dl_on:0, delta_max:4.818897983525083, mu:1, mu_s:0, crr:0, cla:0, cda:0, tmax:1e5, free:{seg:[[125.663706, 20]], wl:[3], wr:[3], closed:true, laps:2, s0:0}}, expect:{c_t:8.511020, c_len:113.097336, c_rbad:0},
     src:'고려 안 함이면 안쪽 경계 18 m 까지 감 (고려하면 19 m): 2π·18 ÷ √(9.81·18) = 8.5110 s, 급한 구간도 세지 않음'},
    {n:'최소 회전 반경 · 폭 안에서 못 맞추면 알림 (반경 2.5 m, 폭 3.5 m, 최대 조향각 24.949° → R 4 m)', I:{course:'free', lap:'1', rl_on:1, rl_b:1, dl_on:1, delta_max:24.94944103198341, free:{seg:[[15.707963, 2.5]], wl:[1.75], wr:[1.75], closed:true, laps:1, s0:0}}, expect:{c_rmn:3.25, c_rbad:20.420352},
     src:'가장 큰 반경 = 바깥 경계 2.5 + (1.75 − 1) = 3.25 m < 4 m → 한 바퀴 전부 급함: 2π·3.25 = 20.4204 m'},
    {n:'최소 회전 반경 · 가운데 선은 그대로 두고 알림 (반경 2.5 m, 최대 조향각 33.881° → R 3 m)', I:{course:'free', lap:'1', rl_on:0, dl_on:1, delta_max:33.881498489414994, free:{seg:[[15.707963, 2.5]], wl:[1.75], wr:[1.75], closed:true, laps:1, s0:0}}, expect:{c_rmn:2.5, c_rbad:15.707963},
     src:'가운데 선을 그대로 달리므로 반경 2.5 m, 급한 길이 = 한 바퀴 2π·2.5 = 15.7080 m'},
    {n:'현실 운전자 · 핸들 속도 900 °/s 상한 (직선 → 반경 5 m, 다듬기 2 m, 조향비 5, 100 % 애커먼)', I:{course:'free', lap:'1', dr_real:1, dr_ks:0.9, dr_ke:0.7, tr_ks:2, steer_ratio:5, L:1550, fr:47.5, free:{seg:[[20, 0], [10, 5]], closed:false, laps:1, s0:0}}, expect:{c_vstr:74.121795},
     src:'곡률 계단 0 → 0.2 를 앞뒤 1 m 이동 평균 두 번 → 계단 점에서 κ = 0.1, κ\u2032 = 0.1 /m². 핸들 h = 5 × atan(L ÷ √(1/κ² − l_r²)) → dh/dκ = 437.118 °·m (l_r = 0.73625). v = 900 ÷ (437.118 × 0.1) = 20.589 m/s = 74.122 km/h (이웃 점 ±0.5 m: κ\u2032 = 0.075, 더 높음)'},
    {n:'도구 6 조향각 표 · 평행 조향 (안 = 바깥, 핸들 100° → 20°, 170° → 34°) → 최소 회전 반경 · 핸들 속도 상한', I:{course:'free', lap:'1', dr_real:1, dr_ks:0.9, dr_ke:0.7, tr_ks:2, dl_on:1, L:1550, fr:47.5, stab:[[100, 20, 20], [170, 34, 34]], free:{seg:[[20, 0], [10, 5]], closed:false, laps:1, s0:0}}, expect:{c_rkin:2.413033, c_vstr:74.969370},
     src:'자전거 등가 각 = 34° → R_뒤축 = 1.55 ÷ tan 34° = 2.29797, R = √(2.29797² + 0.73625²) = 2.4130 m. 20° 행 κ = 0.231387 → 0 ~ 0.2314 에서 dh/dκ = 100 ÷ 0.231387 = 432.177 °·m (직선 보간), 계단 점 κ\u2032 = 0.1 → v = 900 ÷ 43.2177 = 20.825 m/s = 74.969 km/h'},
    {n:'최소 회전 반경 = 최대 조향각에서 (δ 34°, L 1550 mm, t_f 1200 mm, 앞 하중 47.5 %)', I:{course:'free', lap:'1', rl_on:0, dl_on:1, delta_max:34, L:1550, tf:1200, fr:47.5, free:{seg:[[15.707963, 2.5]], wl:[1.75], wr:[1.75], closed:true, laps:1, s0:0}}, expect:{c_rkin:2.990032, c_rbad:15.707963},
     src:'R_뒤축 = 1.55 ÷ tan 34° + 0.6 = 2.297970 + 0.6 = 2.897970 m, l_r = 1.55 × 0.475 = 0.73625 m → R = √(2.897970² + 0.73625²) = 2.990032 m. 가운데 선 2.5 m < R → 한 바퀴 전부 급함 15.7080 m'},
    {n:'열 모델 모터 열 끔 → 디레이팅 없음', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, tmax:1e5, motor:[[0, 200], [10000, 200]], motorC:[[0, 100], [10000, 100]], v_ref:300, ke_ratio:1, dr_t0:40, dr_t1:60, th_init:45, th_c:1e9, th_r:1e9, th_cool:45, th_on:0}, expect:{t_acc_s:3.75},
     src:'모터 열을 끄면 온도로 토크를 깎지 않음: 200 N·m → F = 3200 N, a = 10.667 → t = √(2 × 75 ÷ 10.667) = 3.75 s (켜면 4.3301 s)'},
    {n:'열 모델 모터 · 축전지 (냉각수 계통 끔 → 냉각수 온도 고정)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, th_on:1, cw_on:0, bt_on:1, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0}, expect:{c_tm:29.307429, c_tb:25.407582},
     src:'모터 = 고정 냉각수 25 + 손실 215.37 W × 0.02 = 29.3074 °C, 축전지는 냉각수와 이어져 있지 않아 세 계통 모두 켤 때와 같은 25.4076 °C'},
    {n:'부품별 독립 · 회로마다 냉각수 온도 (모터 회로 35 °C, 공통 칸 25 °C 는 안 씀, 냉각수 계통 끔 → 고정)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, cw_tw:35, th_on:1, cw_on:0, bt_on:1, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0}, expect:{c_tm:39.307429, c_tb:25.407582},
     src:'모터 = 모터 회로 냉각수 35 + 손실 215.37 W × 0.02 = 39.3074 °C (위 경우와 손실 같음, 냉각수 온도만 +10 K), 축전지는 냉각수와 이어져 있지 않아 25.4076 °C 그대로'},
    {n:'주행선 · 슬라럼 콘이 가운데 선에서 벗어남 (곧은 80 m 닫힌 코스, 콘 옆 거리 +0.5 · −0.5 m, 폭 6 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[3, 3, 3, 3], WR:[3, 3, 3, 3], slalom:[1, 3], slat:[0.5, -0.5], sds:[0, 0]}}, expect:{c_len:80.269101, c_ctight:0},
     src:"콘 자리 제약이 e ≥ 0.5 + 1 · e ≤ −0.5 − 1 → 가운데 콘 경우의 해 × 1.5: e(u) = 1.5 (a·u + c·u³) → 길이 = Σ√(1 + Δe²) = 80.2691 m (가운데 콘이면 80.1198 m)"},
    {n:'주행선 · 콘과 경계 사이가 좁으면 알림 (왼쪽 폭 1.5 m, b = 1 m)', I:{course:'end', rl_on:1, rl_b:1, end:{seg:[[20, 0], [20, 0], [20, 0], [20, 0]], laps:1, stint:1, WL:[1.5, 1.5, 1.5, 1.5], WR:[3, 3, 3, 3], slalom:[1, 3]}}, expect:{c_ctight:1},
     src:'첫 콘은 왼쪽으로 지나가야 하는데 콘 ↔ 왼쪽 경계 1.5 m < 2b = 2 m → 1개. 두 번째 콘(오른쪽, 3 m)은 지킴'},
    {n:'차 여유 · 전장과 저속 차체 각도 (반경 10 m 원, 전폭 1.4 m, 휠베이스 1.6 m, 앞 50 %, 앞 · 뒤 오버행 0.5 · 0.3 m, 여유 0.2 m)', I:{wc_on:1, course:'free', lap:'1', rl_on:0, w_car:1.4, rl_m:0.2, oh_f:0.5, oh_r:0.3, L:1600, fr:50, free:{seg:[[62.831853, 10]], wl:[3], wr:[3], closed:true, laps:1, s0:0}}, expect:{c_rmn:10, c_bo:1.072678, c_bi:0.932051},
     src:'l_r = 0.8 m, 뒤축 반경 R_r = √(10² − 0.8²) = 9.9679. 바깥 = √(2.1² + (R_r + 0.7)²) − 10 + 0.2 = 1.0727 m (앞 끝 = 뒤축에서 1.6 + 0.5), 안쪽 = 10 − (R_r − 0.7) + 0.2 = 0.9321 m (곧은 길이면 둘 다 0.9 m)'},
    {n:'열 모델 · 모두 수랭, 부품별 독립 회로 (회로마다 라디 → 펌프 → 부품, UA 모터 200 · 인버터 100 · 축전지 100 W/K, 정상 온도)', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:1, i_cool:1, b_cool:1, i_c:500, i_r:0.05, b_r:0.05, cw_mode:0, i_wv:0.4785, i_wq:8, i_wra:0.06, i_wkd:0, i_wfan:0.3, i_wua:100, b_wv:0.1196, b_wq:8, b_wra:0.06, b_wkd:0, b_wfan:0.3, b_wua:100}, expect:{c_tw:26.632012, c_tm:30.939432, c_ti:32.10454, c_tb:25.510912},
     src:'회로마다 [라디 → 펌프 → 부품], 팬 0.3 m³/s ÷ 0.06 m² = 코어 5 m/s (UA = 입력값), C_a 361.8 · C_c 557.33 W/K → ε C_min 모터 (UA 200) 131.97 · 인버터 · 축전지 (UA 100) 78.888 W/K. 라디 입구 = 25 + 손실 ÷ ε C_min: 모터 26.6320 → + 215.371 × 0.02 = 30.9394, 인버터 25 + 113.353 ÷ 78.888 = 26.4369 → + 113.353 × 0.05 = 32.1045, 축전지 25 + 8.1516 ÷ 78.888 = 25.1033 → + 8.1516 × 0.05 = 25.5109. 냉각수 결과 = 가장 뜨거운 곳 (모터 회로 26.6320)'},
    {n:'부품별 독립 · 모터 회로 냉각수가 물이 아님 (밀도 1070 kg/m³ · 비열 3.3 kJ/(kg·K) → C_c 470.8 W/K, 나머지 위와 같음)', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:1, i_cool:1, b_cool:1, i_c:500, i_r:0.05, b_r:0.05, cw_mode:0, cw_rho:1070, cw_cp:3.3, i_wv:0.4785, i_wq:8, i_wra:0.06, i_wkd:0, i_wfan:0.3, i_wua:100, b_wv:0.1196, b_wq:8, b_wra:0.06, b_wkd:0, b_wfan:0.3, b_wua:100}, expect:{c_tw:26.677691, c_tm:30.985111, c_ti:32.10454, c_tb:25.510912},
     src:'모터 회로 C_c = 8 ÷ 60000 × 1070 × 3300 = 470.8 W/K (물 557.33), C_a 361.8 = C_min, C_r 0.7685, NTU 200 ÷ 361.8 → ε C_min 128.373 W/K. 라디 입구 = 25 + 215.371 ÷ 128.373 = 26.6777 → 모터 + 215.371 × 0.02 = 30.9851. 인버터 · 축전지 회로는 물 그대로'},
    {n:'열 모델 · 모두 공랭 (냉각수 계통에 넣는 부품 없음)', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:0, i_cool:0, b_cool:0, m_ha0:20, m_ha60:20, i_c:500, i_ha0:10, i_ha60:10, b_ha:20, b_ha60:20}, expect:{c_tm:35.768572, c_ti:36.335339, c_tb:25.407582},
     src:'모터 = 25 + 215.371 ÷ 20 = 35.7686, 인버터 = 25 + 113.353 ÷ 10 = 36.3353, 축전지 = 25 + 8.1516 ÷ 20 = 25.4076 (냉각수는 켜도 넣는 열이 없어 고정)'},
    {n:'효율 · 모터 맵에 인버터를 합침 (합친 효율 85.5 %, 인버터 몫 30 %)', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:0, m_cool:1, i_cool:1, i_c:500, i_r:0.05, eta_mot:85.5, eta_inv:50, eff_mg:1, inv_r:30, cw_mode:0, i_wv:0.4785, i_wq:8, i_wra:0.06, i_wkd:0, i_wfan:0.3, i_wua:200}, expect:{c_tw:26.743681, c_tm:31.345831, c_ti:30.678167},
     src:'합친 손실 = 1938.343 × (1 ÷ 0.855 − 1) = 328.725 W (따로 넣을 때 모터 + 인버터와 같음, 인버터 효율 칸 50 % 는 안 씀). 부품별 독립 회로 (모터 · 인버터 UA 200, 코어 5 m/s → ε C_min 131.97 W/K): 모터 라디 입구 = 25 + 0.7 × 328.725 ÷ 131.97 = 26.7437, 모터 = + 0.7 × 328.725 × 0.02 = 31.3458, 인버터 라디 입구 = 25 + 0.3 × 328.725 ÷ 131.97 = 25.7473, 인버터 = + 0.3 × 328.725 × 0.05 = 30.6782'},
    {n:'열 모델 · 공랭 방열 능력이 차속에 따라 (축전지 정지 10 · 60 km/h 30 W/K)', I:{m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:0, bt_on:1, b_cool:0, b_ha:10, b_ha60:30}, expect:{c_tb:25.130031},
     src:'v = 43.909 m/s → hA = 10 + (30 − 10) × 43.909 ÷ 16.667 = 62.690 W/K → 축전지 = 25 + 8.1516 ÷ 62.690 = 25.1300 °C'},
    {n:'μ 기준 하중 · μ(F_z) = μ − 감도 (F_z − F_z0): 기준 735.75 N 에서 μ 1.426425 = 위 하중 감도 경우와 같은 직선', I:{fz0_m:1, m:300, fr:50, h:300, tf:1200, tr:1200, lltd:50, mu:1.426425, mu_s:0.1, tire_fz0:735.75, crr:0, cla:0, cda:0}, expect:{t_skid_s:10.276676, ay_skid:1.390843},
     src:'1.426425 − 0.1 × (F_z − 0.73575 kN) = 1.5 − 0.1 × F_z → 하중 감도 · 스키드패드 경우와 같은 μ(F_z)'},
    {n:'모델 단계 1 · 탄성 몫은 롤강성 배분 rsd (롤센터 0, rsd 50 % · lltd 20 % → lltd 50 % 단계 0 과 같음)', I:{md:1, h_rcf:0, h_rcr:0, rsd:50, lltd:20, m:300, fr:50, h:300, tf:1200, tr:1200, mu:1.5, mu_s:0.1, crr:0, cla:0, cda:0}, expect:{t_skid_s:10.276676},
     src:'롤센터 0 → 하중 이동 = rsd × m ay h ÷ t (앞) → 단계 0 lltd 50 % 하중 감도 경우와 같음'},
    {n:'모델 2 · 일정 원 (반경 200 m, 최고속 13.51 m/s) 슬립각 · 차체 각도 · 조향각 (MF 역함수, E = 0)', I:{fz0_m:1, md:2, tire_fz0:700, tire_ca0:450, tire_cn:0.8, tire_c:1.3, tire_e:0, steer_ratio:5, course:'free', lap:'2', rl_on:0, m:300, fr:47.5, h:0, mu:1.5, mu_s:0, crr:0, cla:0, cda:0, nmax:2000, gr:3.55, r_eff:229, free:{seg:[[1256.637061, 200]], closed:true, laps:2, s0:0}}, expect:{c_afmax:0.144877, c_armax:0.147806, c_bmax:0.063114, c_dwmax:0.441113, c_swmax:2.205566},
     src:'v = 2000 rpm × 2π/60 × 0.229 ÷ 3.55 = 13.510 m/s, a_y = v²/200. 바퀴 하나 F_y = m a_y × 앞 몫 ÷ 2 → α = tan(asin(F_y ÷ D) ÷ C) ÷ B. β = 1.55 × 0.475 ÷ 200 − α_r = 0.0631°, δ = 1.55 ÷ 200 + α_f − α_r = 0.4411°, 핸들 = × 5'},
    {n:'모델 2 · 선형 언더스티어 구배 = W_f ÷ C_αf − W_r ÷ C_αr (정지 하중 코너링 강성)', I:{fz0_m:1, md:2, tire_fz0:700, tire_ca0:450, tire_cn:0.8, tire_c:1.3, tire_e:0, m:300, fr:47.5}, expect:{k_us_lin:-0.031441},
     src:'C_α(F_z) = 450 (F_z ÷ 700)^0.8 N/° → (300 × 9.81 × 0.475 ÷ (2 × 449.47) − 300 × 9.81 × 0.525 ÷ (2 × 486.93)) = −0.03144 °/g'},
    {n:'모델 3 · 계단 조향 (60 km/h, 0.4 g, 롤 팔 0, 이완 0) → 수치 적분 정상 요레이트 = 해석해 V δ ÷ (L + K V²)', I:{fz0_m:1, md:3, tire_fz0:700, tire_ca0:450, tire_cn:0.8, tire_c:1.3, tire_e:0, tire_relax:0, m:300, fr:47.5, h:300, h_rcf:300, h_rcr:300, izz:70, v_test:60, ay_test:0.4}, expect:{tr_r:13.489718, tr_rss:13.489718, tr_del:1.241967, tr_ay:0.4, tr_wn:5.448057, tr_zeta:1.119155, tr_kus:-0.031441},
     src:'C_f = 2 × 449.47 · C_r = 2 × 486.93 N/° , K = m (b ÷ C_f − a ÷ C_r) ÷ L, δ = 0.4 g (L + K V²) ÷ V² = 1.2420°, r = V δ ÷ (L + K V²) = 13.490 °/s, ω_n = 5.448 Hz, ζ = 1.1192 (2 자유도 해석해)'},
    {n:'모델 3 · 롤 (롤센터 30 / 50 mm, 무게중심 290 mm, 현가하 12 kg × 4, 롤강성 800 N·m/°, 롤 감쇠 30, I_xx 30, 이완 0.3 m) → 정상 롤각 = m_s h′ a_y ÷ (K_φ − m_s g h′)', I:{fz0_m:1, md:3, tire_fz0:700, tire_ca0:450, tire_cn:0.8, tire_c:1.3, tire_e:0, tire_relax:0.3, m:300, fr:47.5, h:290, h_rcf:30, h_rcr:50, m_us_f:12, m_us_r:12, k_roll:800, c_roll:30, ixx:30, izz:70, v_test:60, ay_test:0.4}, expect:{tr_phi:0.312603, tr_phis:0.312603, tr_ay:0.4},
     src:'h_ra = 30 + 20 × 0.525 = 40.5 mm → h′ = 0.2495 m, m_s = 252 kg, φ = 252 × 0.2495 × 0.4 g ÷ (800 × 180/π − 252 g × 0.2495) = 0.3126°. 정상 상태 횡가속도는 롤 · 이완과 상관없이 0.4 g'},
    {n:'모델 2 · 축 횡 한계 = 두 바퀴 같은 슬립각의 최댓값 (하중이 다르면 Σ μ F_z 보다 작음)', I:{md:2, m:300, fr:50, h:400, tf:1200, h_rcf:0, h_rcr:0, rsd:50, cla:0, cda:0, mu:1.5, mu_s:0, tire_ca0:450, tire_cn:0, tire_c:1.3, tire_e:0, tire_fz0:0, cp_v:10, cp_ay:10}, expect:{c_rho:0.988826}, src:'앞축 1471.5 N, 좌우 이동 = 150 × 10 × 0.4 ÷ 1.2 = 500 N → 바깥 1235.75 · 안 235.75 N. F_y = μ F_z sin(1.3 atan(Bα)), B = C_α ÷ (C μ F_z), C_α = 450 °/rad 일정 (하중 지수 0) → max_α Σ F_y ÷ (1.5 × 1471.5) (조밀한 탐색)'},
    {n:'모델 2 · 하중 지수 1 이면 두 바퀴 최고점 슬립각이 같아 Σ μ F_z', I:{md:2, m:300, fr:50, h:400, tf:1200, h_rcf:0, h_rcr:0, rsd:50, cla:0, cda:0, mu:1.5, mu_s:0, tire_ca0:450, tire_cn:1, tire_c:1.3, tire_e:0, tire_fz0:0, cp_v:10, cp_ay:10}, expect:{c_rho:1}, src:'C_α ∝ F_z → B 가 하중과 상관없음 → 같은 슬립각에서 두 바퀴 모두 최고'},
    {n:'모델 2 · 조향 한계 스키드패드 (안쪽 바퀴 각 = 기하 + α_f − α_r 이 최대에 닿는 차속)', I:{dl_on:1, md:2, m:300, fr:60, h:0, L:1550, tf:1200, cla:0, cda:0, crr:0, mu:1.5, mu_s:0, tire_ca0:450, tire_cn:0.5, tire_c:1.3, tire_e:0, tire_fz0:0, delta_max:11.38, course:'skid'}, expect:{t_skid_s:10.064735}, src:'기하 = atan(1.55 ÷ (√(9.125² − 0.93²) − 0.6)) = 10.361°. 축 힘 몫 p 에서 α = tan(asin p ÷ 1.3) ÷ B (B ∝ F_z^−0.5, 앞 882.9 · 뒤 588.6 N) → 10.361 + α_f − α_r = 11.38 → p = 0.96669 → v = √(p × 1.5 × 9.81 × 9.125) = 11.393 m/s → 2 × 2π × 9.125 ÷ v'},
    {n:'모델 3 · 과도 축 힘 (요 관성 · 이완 길이) · 일정 차속', I:{md:3, m:300, fr:50, L:1550, h:0, cla:0, cda:0, crr:0, mu:1.5, izz:70, tire_relax:0.3, tp_v:15, tp_k:0.05, tp_dk:0.01, tp_ddk:0}, expect:{c_tpf:1890.3629, c_tpr:1687.1371, c_tpu:0.733478}, src:'a_y = 11.25, ṙ = v² κ\' = 2.25 → F_f = (300 × 11.25 × 0.775 + 70 × 2.25) ÷ 1.55 = 1789.11, dF_f/ds = 300 × 225 × 0.01 × 0.775 ÷ 1.55 = 337.5 → F_ss = 1789.11 + 0.3 × 337.5. 뒤 = (2615.6 − 157.5) ÷ 1.55 + 101.25. 사용 = (1890.36 ÷ 2207.25)²'},
    {n:'모델 3 · 요 관성 · 이완 길이가 0 이면 과도 상한 없음 (모델 2 와 같음)', I:{md:3, izz:0, tire_relax:0, course:'free', free:{seg:[[30, 0], [31.4, 10], [30, 0]], laps:1, s0:0}}, expect:{c_trlen:0, c_trok:1}, src:'ṙ · dF/dt 항이 0 → 정상과 같은 힘'},
    {n:'모델 3 · 곡률이 바뀌는 코너의 한계 속도 (축마다 등가 곡률)', I:{md:3, m:300, fr:50, L:1550, h:0, cla:0, cda:0, crr:0, mu:1.5, izz:70, tire_relax:0.3, vp_k:0.05, vp_k1:0.01, vp_k2:0}, expect:{c_v3:16.20856}, src:'앞 κ_f = 0.05 + [70 × 0.01 + 0.3 (300 × 0.775 × 0.01)] ÷ (300 × 0.775) = 0.056011, 뒤 κ_r = 0.049989 → v = √(1.5 × 9.81 ÷ 0.056011) (하중 이동 0, μ 일정)'},
    {n:'모델 3 · κ\'\' 가 있으면 앞뒤 등가 곡률이 더 벌어짐', I:{md:3, m:300, fr:50, L:1550, h:0, cla:0, cda:0, crr:0, mu:1.5, izz:70, tire_relax:0.3, vp_k:0.05, vp_k1:0.01, vp_k2:0.004}, expect:{c_v3:16.156536}, src:'κ_f = 0.05 + [0.7 + 0.3 (2.325 + 0.28)] ÷ 232.5 = 0.056372 → v = √(14.715 ÷ 0.056372)'},
    {n:'차체 각도를 준 차 사각형의 옆 나감 (β = 8°, 왼쪽 반경 5 m)', I:{wc_on:1, w_car:1.4, L:1550, fr:50, oh_f:0.6, oh_r:0.4, bp_k:0.2, bp_b:8}, expect:{c_bdl:0.748660, c_bdr:1.018815}, src:'무게중심에서 앞 끝 1.375 · 뒤 끝 −1.175 m, 폭 ±0.7 m 를 −8° 돌림 → 회전 중심 (0, 5) 에서 가장 먼 모서리 − 5 (바깥), 5 − 사각형까지 가장 가까운 거리 (안쪽)'},
    {n:'노즈가 안쪽 (β = −3°, 속도가 붙어 뒷바퀴가 미끄러질 때) 이면 앞 안쪽 모서리가 안으로', I:{wc_on:1, w_car:1.4, L:1550, fr:50, oh_f:0.6, oh_r:0.4, bp_k:0.2, bp_b:-3}, expect:{c_bdl:0.706852, c_bdr:0.871625}, src:'같은 식, β = −3° (β = 0 이면 0.7 · 0.8635)'},
    {n:'차 사각형 ↔ 슬라럼 콘 거리 (옆에 있는 콘)', I:{wc_on:1, w_car:1.4, L:1550, fr:50, oh_f:0.6, oh_r:0.4, cq_n:0, cq_psi:0, cq_k:0, cq_dx:0, cq_dy:1.0}, expect:{c_cdp:0.3}, src:'콘이 무게중심 옆 1.0 m, 차 옆면 0.7 m → 0.3 m'},
    {n:'차 사각형 ↔ 콘 거리 (차체 10° · 옆 0.1 m · 곡률 0.05, 앞 모서리 앞쪽 콘)', I:{wc_on:1, w_car:1.4, L:1550, fr:50, oh_f:0.6, oh_r:0.4, cq_n:0.1, cq_psi:10, cq_k:0.05, cq_dx:1.6, cq_dy:0.9}, expect:{c_cdp:0.350724}, src:'콘을 차 좌표로: y = 0.9 + 0.05 × 1.6² ÷ 2 − 0.1 = 0.864, (1.6, 0.864) 를 −10° 돌림 → (1.7258, 0.5730) → 앞 끝 1.375 에서 앞으로 0.3508, 옆은 폭 안'},
    {n:'회생 · 제동 힘의 뒤축 몫 (h = 0 → 이상 배분 50 %)', I:{m:300, fr:50, h:0, mu:1, mu_s:0, crr:0, cla:0, cda:0, j_eq:0, eta_dt:100, nmax:20000, r_eff:229, gr:3.55, n_s:70, c_vmax:4.2, rg_on:1, rg_tmax:230, i_chg:1e9, free:{seg:[[400, 0], [5, 10]], laps:1, s0:0}}, expect:{e_free:0.057225}, src:'직선 400 m 뒤 반경 10 m: 가속 g/2 · 제동 g 가 만나는 점 s* = (v_c² + 2·400 g) ÷ (3g/2 · 2) = 270 m → 구동 m (g/2) s* = 397305 J, 회생 = ½ m g × (400 − 270) = 191295 J → 순 206010 J'},
    {n:'회생 · 회생 토크 상한 50 N·m', I:{m:300, fr:50, h:0, mu:1, mu_s:0, crr:0, cla:0, cda:0, j_eq:0, eta_dt:100, nmax:20000, r_eff:229, gr:3.55, n_s:70, c_vmax:4.2, rg_on:1, rg_tmax:50, i_chg:1e9, free:{seg:[[400, 0], [5, 10]], laps:1, s0:0}}, expect:{e_free:0.0823724}, src:'바퀴 회생 힘 = 50 × 3.55 ÷ 0.229 = 775.11 N (< 뒤축 몫 1471.5 N) → 회생 775.11 × 130 = 100764 J → 순 296541 J'},
    {n:'회생 · 팩 충전 전류 한계 10 A (단자 294 V)', I:{m:300, fr:50, h:0, mu:1, mu_s:0, crr:0, cla:0, cda:0, j_eq:0, eta_dt:100, nmax:20000, r_eff:229, gr:3.55, n_s:70, c_vmax:4.2, rg_on:1, rg_tmax:230, i_chg:10, free:{seg:[[400, 0], [5, 10]], laps:1, s0:0}}, expect:{e_free:0.1069026}, src:'회생 전력 = 294 × 10 = 2940 W 일정 (모든 차속에서 걸림) × 제동 시간 (51.4655 − 9.9045) ÷ g = 4.23659 s = 12455.6 J → 순 384849 J'},
    {n:'회생 끔 = 마찰 제동만', I:{m:300, fr:50, h:0, mu:1, mu_s:0, crr:0, cla:0, cda:0, j_eq:0, eta_dt:100, nmax:20000, r_eff:229, gr:3.55, n_s:70, c_vmax:4.2, rg_on:0, free:{seg:[[400, 0], [5, 10]], laps:1, s0:0}}, expect:{e_free:0.1103625}, src:'구동 m (g/2) × 270 = 397305 J'},
    {n:'타력 운전자 · 에너지 상한에 맞춘 페달 떼기 (저항 0 → 타력 = 일정 차속)', I:{m:300, fr:50, h:0, mu:1, mu_s:0, crr:0, cla:0, cda:0, j_eq:0, eta_dt:100, nmax:20000, r_eff:229, gr:3.55, n_s:70, c_vmax:4.2, end:{seg:[[400, 0], [31.4159, 10], [400, 0], [31.4159, 10]], laps:26, stint:13}, e_lim:2, e_target:1.745625, drv:1, course:'end'}, expect:{t_end_s:968.668, e_use:1.745625}, src:'구간마다 시간 + λ × 에너지 최소 → 일정 차속 u 로 순항: dT/dE = −(순항 거리) ÷ (m u³) 가 모든 구간에서 같음. 달리는 구간 50 개 u = 30.0105, 정지 출발 2 개 u = 29.7373 m/s 가 에너지 50 × ½m(u² − v_c²) + 2 × ½m u² = 1.745625 kWh 를 맞춤 → 시간 합 968.668 s'},
    {n:'인버터 연속 상전류 0 = 실제 0 (뜨거우면 토크 0)', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:0, r_eff:250, gr:4, eta_dt:100, nmax:10000, v_ref:300, ke_ratio:1, th_c:1e9, th_r:1e9, th_init:30, th_cool:30, dr_t0:40, dr_t1:60, tq_V:300, motor:[[0, 200], [10000, 200]], motorC:[], kt:0.5, i_pk:300, ict_m:1, i_ct:0, di_t0:50, di_t1:70, in_on:1, tq_n:3000, tq_tm:30, tq_ti:60}, expect:{c_tqp:75}, src:'r_i = 0.5 → I = 300 − 0.5 × 300 = 150 A → 0.5 × 150 = 75 N·m (비율이 아니라 0 A 쪽으로)'},
    {n:'현실 운전자 · 스키드패드 = 그립 k_s 배 → 시간 ÷ √k_s (k_s 0.81)', I:{mu:1.5, crr:0, cla:0, cda:0, dr_real:1, dr_ks:0.81, dr_ke:0.5}, expect:{t_skid_s:10.995213, ay_skid:1.215},
     src:'v = √(k_s μ g R) → 시간 = 9.895692 ÷ √0.81 = 10.9952 s, 횡가속도 = 0.81 × 1.5 g'},
    {n:'현실 운전자 · 가속은 k_s · k_e 배율 없음 (WOT, k_s · k_e 0.5 여도 그대로) · 페달 신호만 0.2 s', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, dr_real:1, dr_ks:0.5, dr_ke:0.5}, expect:{t_acc_s:4.009883, ax_0:1},
     src:'접지 한계 a = μg 그대로 (배율 없음), 페달 신호 0 → 100 % 0.2 s 만 → 아래 경우와 같은 4.0099 s'},
    {n:'현실 운전자 · 원 코스 (반경 10 m) 최고 차속: 오토크로스 √(k_s μ g R), 내구 √(k_s k_e μ g R)', I:{m:300, fr:50, h:0, mu:1.5, crr:0, cla:0, cda:0, rl_on:0, md:0, dr_real:1, dr_ks:0.81, dr_ke:0.5, end:{seg:[[62.831853, 10]], laps:4, stint:2}}, expect:{v_top:39.302969, v_endtop:27.791381},
     src:'오토크로스 √(0.81 × 1.5 × 9.81 × 10) = 10.9175 m/s = 39.30 km/h, 내구 √(0.405 × 1.5 × 9.81 × 10) = 7.7198 m/s = 27.79 km/h'},
    {n:'열 모델 · 냉각 회로, 직렬 라디 → 펌프 → 인버터 → 모터 (흐름 8 L/min, 팬 0.3 m³/s, 정상 온도)', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:1, i_cool:1, b_cool:1, i_c:500, i_r:0.05, b_r:0.05, b_ha60:20, cw_mode:1, cw9:{water:[{Cc:557.333333, nodes:[{t:'rad', C:500, q:1, UA:250, A:0.06, kd:0, fan:0.3}, {t:'pump', C:500, q:1}, {t:'inv', part:'i', C:500, q:1}, {t:'mot', part:'m', C:500, q:1}]}], air:[]}}, expect:{c_ti:32.437381, c_tm:31.463572, c_tw:27.156143, c_tb:25.407582},
     src:'도구 9 정상 식: 라디 a = ε C_min ÷ C_c = 0.421392 × 361.8 ÷ 557.33 = 0.273552 (팬만 · 코어 풍속 5 m/s → UA 250). 점 온도 1차 연립: 라디 26.5663, 펌프 26.5663, 인버터 점 = + 113.353 ÷ 557.33 = 26.7697 → 인버터 = + 113.353 × 0.05 = 32.4374, 모터 점 = + 215.371 ÷ 557.33 = 27.1561 (가장 뜨거움) → 모터 = + 215.371 × 0.02 = 31.4636. 축전지는 회로에 없음 → 외기 hA 20: 25 + 8.1516 ÷ 20 = 25.4076'},
    {n:'열 모델 · 냉각 회로, 병렬 (펌프 뒤 인버터 · 모터로 반씩 갈라져 라디 앞에서 합쳐짐)', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:1, i_cool:1, b_cool:1, i_c:500, i_r:0.05, b_r:0.05, b_ha60:20, cw_mode:1, cw9:{water:[{Cc:557.333333, nodes:[{t:'rad', C:500, q:1, UA:250, A:0.06, kd:0, fan:0.3, ins:[[2, 0.5], [3, 0.5]]}, {t:'pump', C:500, q:1, ins:[[0, 1]]}, {t:'inv', part:'i', C:500, q:0.5, ins:[[1, 1]]}, {t:'mot', part:'m', C:500, q:0.5, ins:[[1, 1]]}]}], air:[]}}, expect:{c_ti:32.640766, c_tm:31.646619, c_tw:27.33919, c_tb:25.407582},
     src:'갈래마다 흐름 0.5 C_c = 278.67 W/K: 인버터 점 = 26.5663 + 113.353 ÷ 278.67 = 26.9731 → 32.6408, 모터 점 = 26.5663 + 215.371 ÷ 278.67 = 27.3392 → 31.6466, 라디 입구 = 두 갈래 평균, 라디 = 입구 − a (입구 − 25) = 26.5663'},
    {n:'열 모델 · 냉각 회로, 병렬 (갈래 유량 = 호스: 인버터 갈래 2.0 m · 모터 갈래 1.0 m, 안지름 10 mm)', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:1, i_cool:1, b_cool:1, i_c:500, i_r:0.05, b_r:0.05, b_ha60:20, cw_mode:1, cw9:{water:[{Cc:557.333333, nodes:[{t:'rad', C:500, q:1, UA:250, A:0.06, kd:0, fan:0.3, ins:[[2, 0.5, 3], [3, 0.5, 4]]}, {t:'pump', C:500, q:1, ins:[[0, 1, 0]]}, {t:'inv', part:'i', C:500, q:0.5, ins:[[1, 0.5, 1]]}, {t:'mot', part:'m', C:500, q:0.5, ins:[[1, 0.5, 2]]}], hyd:{Vt:8, rho:1000, mu:0.001, links:[{a:0, b:1, d:10, len:0.5}, {a:1, b:2, d:10, len:1.5}, {a:1, b:3, d:10, len:0.5}, {a:2, b:0, d:10, len:0.5}, {a:3, b:0, d:10, len:0.5}], blk:[{}, {}, {}, {}], src:[{k:1, flow:8}]}}], air:[]}}, expect:{c_ti:32.739585, c_tm:31.520222, c_tw:27.212802, c_tb:25.407582},
     src:'Blasius 난류 → 모터 몫 = 2^(1/1.75) ÷ (1 + 2^(1/1.75)) = 0.597746, 인버터 0.402254. 라디 출구 26.5663 (반씩과 같음): 인버터 점 = + 113.353 ÷ (0.402254 × 557.33) = 27.0720 → 32.7396, 모터 점 = + 215.371 ÷ (0.597746 × 557.33) = 27.2128 (가장 뜨거움) → 31.5202'},
    {n:'열 모델 · 냉각 회로, 공랭 덕트 갈라짐 (팬 0.1 m³/s → 인버터 40 % · 모터 60 %, 수랭 없음)', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, cw_v:0.4785, cw_q:8, cw_ra:0.06, cw_kd:0, cw_fan:0.3, cw_ua:200, b_c:500, b_ha:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:1, cw_on:1, in_on:1, bt_on:1, m_cool:1, i_cool:1, b_cool:1, i_c:500, i_r:0.05, b_r:0.05, b_ha60:20, cw_mode:1, cw9:{water:[], air:[{A:0, kd:0, fan:0.1, nodes:[{part:'i', q:0.4, ins:[[-1, 0.4]]}, {part:'m', q:0.6, ins:[[-1, 0.6]]}]}]}, cw_on:0, m_ha0:30, m_ha60:30, i_ha0:15, i_ha60:15}, expect:{c_ti:33.792542, c_tm:33.769763, c_tb:25.407582},
     src:'C_a = 1.2 × 1005 × 0.1 = 120.6 W/K, 갈래 C_q = 48.24 · 72.36 W/K, G = C_q (1 − e^(−hA ÷ C_q)): 인버터 = 25 + 113.353 ÷ G(48.24, 15) = 33.7925, 모터 = 25 + 215.371 ÷ G(72.36, 30) = 33.7698. 축전지는 외기 hA 20 → 25.4076'},
    {n:'셀 표 · OCV 가 온도에 따라 (SOC 와 상관없이 3.5 + 0.004 T V) → 축전지 정상 온도 고정점', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, b_c:500, b_ha:20, b_ha60:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:0, cw_on:0, in_on:0, bt_on:1, b_cool:0, bOcv:{n:[0, 50], t:[0, 100], e:[[3.5, 3.7], [3.5, 3.7]]}}, expect:{c_tb:25.407211},
     src:'단자 2267.1 W, 팩 OCV = 70 × (3.5 + 0.004 T_b), R 0.1 Ω → I = (V − √(V² − 4 R P)) ÷ 2R, T_b = 25 + I² R ÷ 20 고정점 → 25.40721 °C (V = 252.114 V)'},
    {n:'셀 표 · 내부저항 SOC 의존 (SOC 0 → 2, 100 → 1, 기준 R(50 %, 25 °C) = 1.5) → 만충 팩 저항 = 0.1 × 1 ÷ 1.5', I:{i_init:25, m:300, crr:0.015, cla:0, cda:0, j_eq:0, eta_dt:100, eta_mot:90, eta_inv:95, nmax:6500, gr:3.55, r_eff:229, th_c:500, th_r:0.02, th_init:25, th_cool:25, t_amb:25, b_c:500, b_ha:20, b_ha60:20, b_t0:25, r_pack:100, n_s:70, c_vmax:3.6, c_vmin:3.6, c_vnom:3.6, course:'free', lap:'1', free:{seg:[[20000, 0]], closed:false, laps:1, s0:0}, b_alpha:0, th_on:0, cw_on:0, in_on:0, bt_on:1, b_cool:0, bRes:{n:[0, 50], t:[0, 100], e:[[2, 2], [1, 1]]}}, expect:{c_tb:25.27107},
     src:'1 랩이라 SOC = 1 (랩 시작 값) → 팩 저항 66.667 mΩ, V 252 → I = 9.01781 A, 발열 I² R = 5.4214 W → 25 + 5.4214 ÷ 20 = 25.27107 °C'},
    {n:'셀 표 · 용량이 온도에 따라 (0 °C 2 Ah · 50 °C 4 Ah → 25 °C 3 Ah) → 가속 뒤 SOC', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, pmax:1e5, i_bms_max:1e6, r_pack:0, eta_dt:100, eta_mot:100, eta_inv:100, n_s:70, n_p:7, c_vnom:3.6, b_t0:25, course:'acc', bCap:[[0, 2], [50, 4]]}, expect:{c_soc:98.841412},
     src:'a = μ g 일정 → 75 m 끝 운동 에너지 = m g × 75 = 220 725 J (효율 100 %, 저항 0). 팩 에너지 (25 °C) = 70 × 7 × 3.0 × 3.6 × 3600 = 19 051 200 J → SOC = 1 − 0.0115859 = 98.8414 %'},
    {n:'셀 표 없음 (같은 가속, 셀 용량 4 Ah)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, pmax:1e5, i_bms_max:1e6, r_pack:0, eta_dt:100, eta_mot:100, eta_inv:100, n_s:70, n_p:7, c_vnom:3.6, b_t0:25, course:'acc'}, expect:{c_soc:99.131059},
     src:'팩 에너지 = 70 × 7 × 4.0 × 3.6 × 3600 = 25 401 600 J → SOC = 1 − 220 725 ÷ 25 401 600 = 99.1311 %'}
  ],
  calcLimit: 60,   /* 한 번 계산 제한 시간 [s] (주행선 다듬기 포함) */
  code:`// ================================================================ 냉각 회로 공통 (도구 9 · 도구 2P 계산과 냉각 편집기가 같이 씀)
// 수랭 회로 갈래 유량 (회로에 hyd 가 있으면): 호스 · 블럭 압력 강하가 같아지게 유량이 나뉨 (밸브가 없으면 비율을 직접 정할 수 없으므로)
//   호스  : ΔP = f (L ÷ D) ρ u² ÷ 2,  u = Q ÷ (π D² ÷ 4),  Re = ρ u D ÷ μ,  f = max(64 ÷ Re, 0.3164 Re^(−1/4))   (층류 · 매끈한 관 Blasius 난류, Re ≈ 1188 에서 이어짐)
//   블럭  : ΔP = ΔP_기준 (Q ÷ Q_기준)²  (넣었을 때만, 0 = 없음)
//   펌프  : 유량 고정 = 유량을 정하는 원천 (직렬 = 회로 유량, 갈래마다 하나씩 = 자기 유량),
//           펌프 곡선 (H.crv) = 올리는 압력 H(Q) = H₀ (1 − (Q ÷ Q_max)²) (H₀ = 막힘 압력, Q_max = 압력 0 일 때 유량) → 회로 압력 강하와 만나는 점에서 유량이 정해짐
//   블럭마다 들어감 · 나감 두 이음점 (압력 강하가 없는 블럭은 한 점), 이음점마다 들어오는 유량 = 나가는 유량 → 이음점 압력을 뉴턴법으로 풂
//   hyd = {Vt [L/min], rho [kg/m³], mu [Pa·s], links: [{a, b, d [mm], len [m]}] (점 번호), blk: [{dp [kPa], dq [L/min]}] (점마다), src: [{k, flow [L/min]}] (펌프 점)}
//   돌려줌: 호스마다 유량 ÷ 회로 유량 (풀지 못하면 null), .Vt = 실제 회로 유량 [L/min] (라디 0 번에서 나가는 유량 합, 곡선 펌프면 풀어서 정해짐)
function coolHydSolve(H) {
  const N = H.blk.length, rho = H.rho > 0 ? H.rho : 1000, mu = H.mu > 0 ? H.mu : 1e-3, Vt = H.Vt / 60000;
  if (!(Vt > 0) || !N) return null;
  const pump = new Map((H.src || []).map(s => [s.k, s.flow / 60000])), crv = new Map((H.crv || []).map(s => [s.k, s]));
  // 이음점: 들어감 = 2k, 나감 = 2k + 1, 압력 강하도 펌프도 아닌 블럭은 같은 점
  const par = Array.from({ length: 2 * N }, (_, i) => i), fd = i => par[i] === i ? i : (par[i] = fd(par[i]));
  const hasDP = k => H.blk[k] && H.blk[k].dp > 0 && H.blk[k].dq > 0;
  for (let k = 0; k < N; k++) if (!hasDP(k) && !pump.has(k) && !crv.has(k)) par[fd(2 * k + 1)] = fd(2 * k);
  const ids = [...new Set(par.map((_, i) => fd(i)))], ix = new Map(ids.map((r, j) => [r, j])), M = ids.length, nd = i => ix.get(fd(i));
  // 저항 요소: [u, v, ΔP(Q) (Q ≥ 0, m³/s → Pa)]
  const E = [];
  H.links.forEach((l, li) => { const D = Math.max(1e-3, (l.d > 0 ? l.d : 10) / 1000), Lh = Math.max(1e-3, l.len > 0 ? l.len : 0.5), A = Math.PI * D * D / 4;
    E.push({ u: nd(2 * l.a + 1), v: nd(2 * l.b), li, dP: Q => { const u = Q / A, Re = rho * u * D / mu; if (Re <= 0) return 0;
      const f = Math.max(64 / Re, 0.3164 * Math.pow(Re, -0.25)); return f * Lh / D * rho * u * u / 2; } }); });
  // 곡선 펌프: 들어감 → 나감 요소, 압력 차 d = P_들어감 − P_나감 (= −올린 압력) → Q = Q_max √(1 + d ÷ H₀) (d 가 클수록 많이)
  const PC = [];
  crv.forEach((s, k) => { const H0 = Math.max(1, s.h0 * 1000), qm = Math.max(1e-9, s.qmax / 60000); PC.push({ u: nd(2 * k), v: nd(2 * k + 1), Q: d => qm * Math.sqrt(Math.max(0, 1 + d / H0)), G: d => qm / (2 * H0 * Math.sqrt(Math.max(1e-4, 1 + d / H0))) }); });
  for (let k = 0; k < N; k++) if (hasDP(k) && !pump.has(k) && !crv.has(k)) { const P0 = H.blk[k].dp * 1000, Q0 = H.blk[k].dq / 60000;
    E.push({ u: nd(2 * k), v: nd(2 * k + 1), li: -1, dP: Q => P0 * ((Q / Q0) ** 2 + 1e-3 * Q / Q0) }); }   // 아주 작은 1차 항: Q = 0 근처에서도 풀리게
  // ΔP → Q (단조 증가, 이분법)
  const inv = (e, p) => { if (p <= 0) return 0; let hi = Vt; while (e.dP(hi) < p && hi < 1e3) hi *= 2; let lo = 0;
    for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (e.dP(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
  const flow = (e, P) => { const d = P[e.u] - P[e.v]; return Math.sign(d) * inv(e, Math.abs(d)); };
  const cond = (e, Q) => { const q = Math.max(Math.abs(Q), 1e-6 * Vt), h = q * 1e-4; return 2 * h / Math.max(1e-30, e.dP(q + h) - e.dP(Math.max(0, q - h))); };   // dQ/dΔP
  const P = new Array(M).fill(0), ref = 0;
  const resid = (P, Qs) => { const r = new Array(M).fill(0); E.forEach((e, j) => { r[e.u] -= Qs[j]; r[e.v] += Qs[j]; });
    pump.forEach((q, k) => { r[nd(2 * k)] -= q; r[nd(2 * k + 1)] += q; }); PC.forEach(p => { const q = p.Q(P[p.u] - P[p.v]); r[p.u] -= q; r[p.v] += q; }); return r; };
  for (let it = 0; it < 200; it++) {
    const Qs = E.map(e => flow(e, P)), r = resid(P, Qs), err = Math.max(...r.map((x, j) => j === ref ? 0 : Math.abs(x)));
    if (err < 1e-10 * Vt) { const Va = H.links.reduce((s, l, li) => s + (l.a === 0 ? Qs[E.findIndex(e => e.li === li)] : 0), 0), Vu = PC.length ? Va : Vt;
      const out = H.links.map((_, li) => { const j = E.findIndex(e => e.li === li); return Qs[j] / Vu; }); out.Vt = Vu * 60000; return out; }
    // J ΔP = −r  (J = 이음점 사이 dQ/dΔP 로 만든 라플라스 행렬), 기준점 압력 0
    const n = M - 1, map = j => j < ref ? j : j - 1, J = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    const lap = (u, v, g) => [[u, v], [v, u]].forEach(([a, b]) => { if (a === ref) return; J[map(a)][map(a)] += g; if (b !== ref) J[map(a)][map(b)] -= g; });
    E.forEach((e, j) => lap(e.u, e.v, cond(e, Qs[j]))); PC.forEach(p => lap(p.u, p.v, p.G(P[p.u] - P[p.v])));
    for (let a = 0; a < M; a++) if (a !== ref) J[map(a)][n] = r[a];   // 들어오는 유량 합 − 나가는 합 → 압력을 올리면 나가는 유량이 늚
    const d = coolGauss(J, n); if (!d) return null;
    let s = 1; const Pn = () => P.map((p, a) => a === ref ? 0 : p + s * d[map(a)]);
    for (let b = 0; b < 30; b++) { const P2 = Pn(), Q2 = E.map(e => flow(e, P2)), r2 = resid(P2, Q2), e2 = Math.max(...r2.map((x, j) => j === ref ? 0 : Math.abs(x)));
      if (e2 < err || b === 29) { P.splice(0, M, ...P2); break; } s /= 2; }
  }
  return null;
}
function coolGauss(M, N) { const a = M.map(r => r.slice());
  for (let c = 0; c < N; c++) { let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-30) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < N; r++) { if (r === c) continue; const f = a[r][c] / a[c][c]; if (f) for (let q = c; q <= N; q++) a[r][q] -= f * a[c][q]; } }
  return a.map((r, k) => r[N] / r[k]); }
// 계산 앞 정리 (넘겨받은 회로를 고침):
//   수랭: hyd 가 있으면 호스 유량 몫으로 점마다 들어오는 몫 (ins 셋째 값 = 호스 번호) · 흐름 q 를 다시 정함
//   공랭: 예전 꼴 (parts = 직렬 순서) 이면 점 꼴로 — 점 = {part, q, ins: [[앞 점, 몫]]} (앞 점 −1 = 입구 외기), 흐름 순서대로
function coolPrep(NET) {
  if (!NET) return NET;
  (NET.water || []).forEach(C => { C.nodes.forEach(nd => { if (nd.t === 'rad' && nd.rq && Array.isArray(nd.rq.t) && nd.rq.t.length && Array.isArray(nd.rq.n) && nd.rq.n.length) nd.uaT = coolUAtab(nd, C.rcp || 4.18e6); });   // 라디 표 → UA 표
    if (!C.hyd) return; const fl = coolHydSolve(C.hyd); C.hydOk = !!fl; if (!fl) return;
    if (C.hyd.crv && C.hyd.crv.length && fl.Vt > 0) { C.hyd.Vt = fl.Vt; C.Cc = fl.Vt / 60000 * (C.rcp || 4.18e6); }   // 곡선 펌프: 회로 유량이 풀려서 정해짐
    C.nodes.forEach((nd, k) => { if (!nd.ins) return; nd.ins = nd.ins.map(x => x.length > 2 && x[2] >= 0 ? [x[0], fl[x[2]], x[2]] : x);
      if (k > 0) nd.q = nd.ins.reduce((s, x) => s + x[1], 0); }); });
  (NET.air || []).forEach(D => { if (!D.nodes) D.nodes = (D.parts || []).map((p, j) => ({ part: p, q: 1, ins: [[j - 1, 1]] })); D.parts = D.nodes.map(n => n.part); });
  return NET;
}
// 공랭 덕트 한 칸: 점마다 들어오는 공기 = 앞 점에서 나온 공기를 몫으로 섞음, 부품 → 공기 G = C_q (1 − e^(−hA ÷ C_q)) (C_q = 그 갈래 공기 열용량 흐름 = C_a q)
//   정상: 부품 = 들어온 공기 + L ÷ G,  나가는 공기 = 들어온 공기 + L ÷ C_q
//   시간: 부품 온도를 들어온 공기 + L ÷ G 쪽으로 지수 적분, 나가는 공기 = 들어온 공기 + G (부품 − 들어온 공기) ÷ C_q
//   ss = true 면 정상 온도를 T 에 넣음, 아니면 (T, h, PC, on, toward) 로 한 칸
function coolAir(D, Ca, Ta, T, L, hA, ss, h, PC, on, toward) {
  const out = [];
  D.nodes.forEach((n, k) => { let fs = 0, ft = 0; n.ins.forEach(([j, f]) => { fs += f; ft += f * (j < 0 ? Ta : out[j]); });
    const Tin = fs > 0 ? ft / fs : Ta, Cq = Ca * (n.q > 0 ? n.q : 1), p = n.part, G = Cq > 0 ? Cq * (1 - Math.exp(-hA(p) / Cq)) : 0;
    if (ss) { T[p] = G > 0 ? Tin + L[p] / G : (L[p] > 0 ? Infinity : Tin); out[k] = Cq > 0 ? Tin + L[p] / Cq : Infinity; return; }
    if (on && !on[p]) { out[k] = Tin; return; }
    T[p] = G > 0 ? toward(T[p], Tin + L[p] / G, G / PC[p], h) : T[p] + L[p] * h / PC[p];
    out[k] = Cq > 0 ? Tin + G * (T[p] - Tin) / Cq : Tin; });
  return out;
}
// ---------- 라디에이터 (도구 9 · 2P 같이)
//   공기 = 주행풍 A k_d v + 팬 (팬 켜는 온도 fon 이 있으면: 라디로 들어오는 냉각수가 fon 이상이면 켬, fon − COOL_FH 아래면 끔. 0 = 늘 켬)
//   UA: 표 (nd.rq = {n: 냉각수 유량 L/min, t: 코어 풍속 m/s, e: 방열량 kW}, nd.itd = 그 표의 입구 온도차 K) 가 있으면
//     표의 점마다 ε = Q ÷ (C_min × ITD) → 교차류 ε-NTU 를 거꾸로 풀어 UA = NTU × C_min (coolPrep 에서 한 번) → 코어 풍속 · 냉각수 유량으로 이중선형 (범위 밖은 끝값),
//     없으면 UA = UA₅ (V_f ÷ 5)^0.6 (코어 풍속 5 m/s 기준)
//   라디 금속 열용량 nd.Cm [kJ/K] 은 그 점 열용량에 더함 (정상 온도는 그대로, 오르내리는 빠르기만)
const COOL_RA = 1.2, COOL_CA = 1005, COOL_FH = 3;   // 공기 밀도 [kg/m³] · 비열 [J/kg·K] · 팬 끄는 온도 차 [K]
const coolEps = (NTU, Cr) => NTU <= 0 ? 0 : Cr < 1e-9 ? 1 - Math.exp(-NTU) : 1 - Math.exp(Math.pow(NTU, 0.22) / Cr * (Math.exp(-Cr * Math.pow(NTU, 0.78)) - 1));   // 교차류 (양쪽 안 섞임) 근사
function coolNTU(eps, Cr) { if (!(eps > 0)) return 0; let lo = 0, hi = 1; while (coolEps(hi, Cr) < eps && hi < 1e4) hi *= 2; if (coolEps(hi, Cr) < eps) return Infinity;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (coolEps(m, Cr) < eps) lo = m; else hi = m; } return (lo + hi) / 2; }
function coolUAtab(nd, rcp) { const M = nd.rq, itd = nd.itd > 0 ? nd.itd : 60;
  return M.t.map(vf => M.n.map((fl, j) => { const Ca = COOL_RA * COOL_CA * vf * nd.A, Cc = fl / 60000 * rcp, Cm = Math.min(Ca, Cc), Cx = Math.max(Ca, Cc);
    const row = M.t.indexOf(vf), Q = M.e[row][j] * 1000; if (!(Cm > 0) || !(Q > 0)) return 0;
    const NTU = coolNTU(Math.min(Q / (Cm * itd), 0.999 * coolEps(1e3, Cm / Cx)), Cm / Cx); return isFinite(NTU) ? NTU * Cm : 0; })); }
const coolBil = (ys, xs, Z, y, x) => { const f = (a, v) => { if (v <= a[0]) return [0, 0, 0]; const k = a.length - 1; if (v >= a[k]) return [k, k, 0]; let i = 0; while (a[i + 1] < v) i++; return [i, i + 1, (v - a[i]) / (a[i + 1] - a[i])]; };
  const [i0, i1, w] = f(ys, y), [j0, j1, u] = f(xs, x); return (Z[i0][j0] * (1 - u) + Z[i0][j1] * u) * (1 - w) + (Z[i1][j0] * (1 - u) + Z[i1][j1] * u) * w; };
function coolUA(nd, Vf, Lmin) { if (nd.uaT) return Vf > 0 ? coolBil(nd.rq.t, nd.rq.n, nd.uaT, Vf, Lmin) : 0; return Vf > 0 ? nd.UA * Math.pow(Vf / 5, 0.6) : 0; }
// 라디 점이 섞인 냉각수 열 중 외기로 버리는 몫 a = ε C_min ÷ F  (F = 이 라디 흐름 q C_c), fan = 팬이 도는지
function coolRadA(C, nd, v, fan) {
  const F = (nd.q || 1) * C.Cc, qa = Math.max(0, nd.A * nd.kd * v + (fan ? nd.fan : 0)), Ca = COOL_RA * COOL_CA * qa, Vf = nd.A > 0 ? qa / nd.A : 0;
  const UA = coolUA(nd, Vf, F / (C.rcp || 4.18e6) * 60000), Cm = Math.min(Ca, F), Cx = Math.max(Ca, F), e = Cm > 0 && F > 0 ? coolEps(UA / Cm, Cm / Cx) : 0;
  return F > 0 ? e * Cm / F : 0; }
const coolFanOn0 = nd => !(nd.fon > 0);                                                   // 출발: 켜는 온도가 있으면 꺼진 채
const coolFanNext = (nd, on, Tin) => !(nd.fon > 0) ? true : on ? Tin >= nd.fon - COOL_FH : Tin >= nd.fon;   // 히스테리시스
const coolC = nd => Math.max(1, (nd.C || 1) + (nd.Cm > 0 ? nd.Cm * 1000 : 0));          // 점 열용량 [J/K] (금속 포함)

// ================================================================
// 도구 2P 랩타임 시뮬레이터 — 계산 코드
// ================================================================
// 입력 I : 왼쪽 입력 칸 (단위 그대로: kg, mm, %, 1/kN, rpm, N·m, kW, V, Ah, mΩ, A, kWh, s)과 작업창 위 표
//   I.end   = {seg:[[길이 m, 반경 m], …], laps, stint, WL · WR (점마다 폭, 공식 코스는 실제 콘 위치로), slalom (콘 점 번호), slat (콘 옆 거리)}   공식 내구 코스 (오토크로스 = 거꾸로 한 바퀴)
//   I.th_on · I.in_on · I.bt_on · I.cw_on = 열 모델 켜기 (모터 열 · 인버터 · 축전지 · 냉각수 온도), I.m_cool · I.i_cool · I.b_cool = 0 공랭 · 1 수랭, I.eff_mg = 1 이면 모터 맵에 인버터 합침 (손실 중 인버터 몫 I.inv_r %), I.md = 차량 모델 단계 (0 · 1 롤센터)
//   최소 회전 반경 = 최대 조향각에서 (rKin, dl_on 1 이고 delta_max > 0 일 때, 모든 차량 모델: 주행선 |곡률| ≤ 1/R 을 제약으로 풀고, 못 지킨 구간은 c_rbad 로 알림),  I.e_lim = 내구 에너지 상한 (0 없음 · 1 제원 용량 · 2 임의 e_target)
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
//   - 현실 운전자 (dr_real 1): 마찰 타원 (종 · 횡 한계 모두) 에 그립 사용률을 곱함. 스키드패드 · 오토크로스 · 내 코스 [기록 주행] = k_s (dr_ks), 내 코스 [내구 주행] = k_s × k_e,
//     내구 = k_s × k_e (dr_ke, 장시간 · 추월 대기 · 피로 등 내구 페이스), 가속 = 1 (WOT, 운전자 요소 없음)
//     기본값 근거 (HANDOFF 41 ~ 42차, 모델 3): k_s = 오토크로스 E-Formula 완주 팀 중앙값 맞춤, k_e = 실제 기록끼리의 '내구 랩 ÷ 오토크로스' 중앙값 맞춤

const g = 9.81;      // 중력가속도 [m/s²]
const RHO = 1.225;   // 공기 밀도 [kg/m³]
let VC = null;       // 곡률별 코너 한계 속도 기억 (감속비 · 전압과 상관없음)
let VCF = new Map(), RTC = new Map();   // RTC = 모델 2 축 한계 비율 표 기억 (타이어 값마다) // 곡률별 조향 한계 표시 (0 없음 · 1 조향 한계로 느려짐 · 2 돌 수 없음, 모델 2)


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


// ================================================================ 부품별 독립 냉각 (cw_mode 0): 수랭 부품마다 [라디 → 펌프 → 부품] 회로 (냉각 회로와 같은 꼴, 2026-11-10 통일)
//   부품 p (모터 cw_ · 인버터 i_w · 축전지 b_w): 냉각수 양 v [L] (회로 전체, 세 점에 똑같이), 펌프 유량 q [L/min], 라디 코어 앞면 면적 ra [m²] · 주행풍 통과 비율 kd ·
//   팬 유량 fan [m³/s] · 팬 켜는 온도 fon [°C, 0 = 늘 켬] · UA (코어 풍속 5 m/s) ua [W/K] 또는 라디 표 (I.rq{M,I,B} = {n 유량, t 풍속, e kW}, 입구 온도차 itd [K]) · 라디 금속 열용량 cm [kJ/K]
//   수랭 여부: 모터 m_cool (기본 수랭) · 인버터 i_cool (기본 수랭) · 축전지 b_cool (기본 공랭). 냉각수 밀도 1000 kg/m³ · 비열 4180 J/kg·K
const T2CWP = { m: ['cw_', 'rqM'], i: ['i_w', 'rqI'], b: ['b_w', 'rqB'] };
function coolIndep(I) { const water = [];   // 냉각수 ρ c_p 는 회로마다 (밀도 kg/m³ × 비열 kJ/(kg·K) × 1000, 2026-11-11 · 예전 물 고정 1000 × 4180)
  const on = { m: I.m_cool !== 0, i: I.i_cool !== 0, b: I.b_cool === 1 };
  ['m', 'i', 'b'].forEach(p => { if (!on[p]) return; const [k, tk] = T2CWP[p], g = s => I[k + s], rcp = (g('rho') > 0 ? g('rho') : 1000) * (g('cp') > 0 ? g('cp') : 4.18) * 1000;
    const V = Math.max(1e-3, g('v') > 0 ? g('v') : 1.2), q = Math.max(1e-3, g('q') > 0 ? g('q') : 8), C = V / 1000 * rcp / 3, rq = I[tk] && Array.isArray(I[tk].t) ? I[tk] : null;
    water.push({ Cc: q / 60000 * rcp, rcp, tw0: Number.isFinite(g('tw')) ? g('tw') : I.th_cool, nodes: [   // tw0 = 이 회로 냉각수 온도 (고정 · 출발 값, 2026-11-11)
      { t: 'rad', C, q: 1, ins: [[2, 1]], UA: Math.max(0, g('ua') || 0), A: Math.max(1e-6, g('ra') || 0.06), kd: Math.max(0, g('kd') || 0), fan: Math.max(0, g('fan') || 0), fon: (Number.isFinite(g('fm')) ? g('fm') === 1 : g('fon') > 0) ? (g('fon') || 0) : 0, /* 팬 켜기 = 고르는 값 fm (없으면 예전 식) */ Cm: Math.max(0, g('cm') || 0), ...(rq ? { rq, itd: g('itd') } : {}) },
      { t: 'pump', C, q: 1, ins: [[0, 1]] },
      { t: 'part', part: p, C, q: 1, ins: [[1, 1]] }] }); });
  return { water, air: [] }; }

// ================================================================ 차량 (감속비 gr, 출력 상한 배율 kP)
function car(I, gr, kP, lam) {

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
  const fz0 = I.fz0_m !== 0 ? I.tire_fz0 : 0;   // μ 기준 하중 [N]: μ(F_z) = mu − mu_s (F_z − F_z0) ÷ 1000  (fz0_m 0 = 정지 평균 하중 쪽: μ 는 하중 0 의 값)
  const tmap = I.tireMap && I.tireMap.length ? I.tireMap.slice().sort((a, b) => a[0] - b[0]) : null;   // 맵: [[바퀴 하중 N, μ]] (있으면 μ · 감도 대신)
  const nonlin = !!tmap || !!mus;           // μ 가 하중에 따라 바뀜 → 이분법
  const crr = I.crr;                        // 구름 저항 계수 [-]
  const cl  = 0.5 * RHO * I.cla;            // 다운포스 = cl × v² [N]
  const cd  = 0.5 * RHO * I.cda;            // 항력     = cd × v² [N]
  const eta = I.eta_dt / 100;               // 구동계 효율 [-] (상수)
  const etaD = (n, T) => I.effD ? bil(I.effD, n, Math.abs(T)) / 100 : eta;   // 구동계 효율 맵 (모터 회전수 × 모터 토크, 2026-11-11) 또는 상수
  const meff = m + I.j_eq / (r * r);        // 회전부 포함 등가 질량 [kg]  (J ÷ r²)

  // ---------- 축전지
  const Ns    = I.n_s;                                   // 직렬 수
  const Rb    = Math.max(0, I.r_pack) / 1000;            // 팩 저항 [Ω]
  const Imax  = I.i_bms_max;                             // 방전 전류 한계 [A]
  const Pmax  = I.pmax * 1000;                           // 규정 출력 상한 [W]
  const kk    = kP || 1;                                 // 에너지 제한 배율 [-]
  // 셀 표 (도구 4 와 같은 형식, 비우면 아래 직선 · 상수): OCV [V] · 내부저항 [mΩ] = 2차원 표 (열 = 셀 온도 °C, 행 = SOC %, 사이는 이중선형 · 밖은 끝값),
  //   용량 = [[셀 온도 °C, Ah]] (사이는 직선). 팩 개방 전압 = 직렬 수 × OCV(SOC, 온도),
  //   팩 내부저항 = [팩 내부저항] × R(SOC, 온도) ÷ R(50 %, 25 °C)  (표는 모양, 크기는 팩 내부저항 칸 — 도구 4 의 추가 저항까지 같은 배율),
  //   SOC 가 줄어드는 양 = 소비 ÷ (직렬 × 병렬 × 용량(랩 시작 축전지 온도) × 공칭 전압)
  const bO = I.bOcv && Array.isArray(I.bOcv.n) ? I.bOcv : null, bR = I.bRes && Array.isArray(I.bRes.n) ? I.bRes : null, bC = Array.isArray(I.bCap) && I.bCap.length ? I.bCap : null;
  const TB0 = isFinite(I.b_t0) ? I.b_t0 : 25, cl01 = x => Math.max(0, Math.min(1, x)), Tok = Tb => Number.isFinite(Tb) ? Tb : TB0;
  const Voc   = (soc, Tb) => bO ? Ns * bil(bO, Tok(Tb), cl01(soc) * 100) : Ns * (I.c_vmin + (I.c_vmax - I.c_vmin) * cl01(soc));   // 개방 전압 [V]
  const Rref  = bR ? Math.max(1e-9, bil(bR, 25, 50)) : 1;
  const Epack = Ns * I.n_p * I.c_ah * I.c_vnom * 3600;   // 팩 공칭 에너지 [J]  (제원 용량 · 에너지 상한 기준)
  const EpackAt = Tb => bC ? Ns * I.n_p * Math.max(1e-6, tab1(bC, Tok(Tb))) * I.c_vnom * 3600 : Epack;   // SOC 계산용 팩 에너지 [J] (용량 표가 있으면 온도마다)
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
  const tqC  = (I.motorC || []).slice().sort((a, b) => a[0] - b[0]);  // 연속 토크 곡선 [[rpm, N·m]] (디레이팅 끝 온도에서 이 곡선)
  const ke   = I.ke_ratio > 0 ? I.ke_ratio : 1;                       // 유도 전압 비 (팀 모터 ÷ 표 모터)
  const nmax = I.nmax;                                                // 최대 회전수 [rpm]

  // 표 하나에서 단자 전압 V · 회전수 n 의 토크 [N·m]  (회전수 축을 전압비로 늘이고 줄임, 곡선 끝 너머는 출력 일정)
  const fromTab = (t, n, V) => {
    const sf = (V / I.v_ref) / ke, nt = n / sf, z = t[t.length - 1];
    return nt <= z[0] ? tab1(t, nt) : z[1] * z[0] / nt;
  };

  // ---------- 모터 열 · 디레이팅 (아래 '디레이팅' 참고)
  // 열 모델 켜기: 모터 열 · 인버터 온도 · 축전지 온도 · 냉각수 온도.
  // 수랭 방식 cw_mode: 0 = 부품별 독립 회로 (수랭 부품마다 자기 냉각수 · 라디, 냉각 방식은 m_cool · i_cool · b_cool),
  //                    1 = 냉각 회로 (I.cw9 = 도구 2P 자체 배치, 도구 9 와 같은 형식: 수랭 회로 여러 개 · 직렬 · 병렬 갈라짐 · 합침 · 라디 여러 개 · 공랭 덕트. 부품 위치도 도구 9 가 정함)
  //   부품별 독립 (cw_mode 0) 도 같은 점 모델: 수랭 부품마다 [라디 → 펌프 → 부품] 회로를 만듦 (coolIndep, 2026-11-10 통일)
  const NET = coolPrep(I.cw_mode === 1 && I.cw9 && Array.isArray(I.cw9.water) ? I.cw9 : coolIndep(I));   // 갈래 몫 (호스 압력 강하) · 라디 표 → UA · 공랭 덕트 점 꼴로
  const where = {};   // 부품 → {w 회로, k 점} · {a 덕트, j 순서}, 없으면 외기
  NET.water.forEach((Cc, w) => Cc.nodes.forEach((nd, k) => { if (nd.part) where[nd.part] = { w, k }; }));
  (NET.air || []).forEach((D, a) => D.nodes.forEach((n, j) => { if (!where[n.part]) where[n.part] = { a, j }; }));
  const inW = p => !!(where[p] && where[p].w != null);
  const mW = inW('m'), iW = inW('i'), bW = inW('b');
  const thOn = I.th_on !== 0, inOn = I.in_on === 1, btOn = I.bt_on === 1;
  const cwOn = I.cw_on === 1 && ((thOn && mW) || iW || (btOn && bW));   // 냉각수 온도: 켰고 수랭으로 열을 넣는 부품이 있을 때만 (아니면 고정값)
  // ---------- 디레이팅 (회전수마다 피크 ~ 연속 사이를 같은 비율 r 로)
  //   모터: r_m = (T_m − 시작) ÷ (끝 − 시작) 을 0 ~ 1 로 → T(n) = T_피크(n) − r_m (T_피크(n) − T_연속(n))   (모터 열을 켰을 때만, 끝 온도 위로는 연속 그대로)
  //   표에 연속 열이 없으면 T_연속 = T_피크 × 연속 비율, 피크 열이 없으면 T_피크 = T_연속 ÷ 연속 비율 (비율 100 % = 디레이팅 없음)
  //   인버터: 상전류 상한 I_lim = I_피크 − r_i (I_피크 − I_연속), r_i = (인버터 온도 − 시작) ÷ (끝 − 시작) (인버터 온도를 켰을 때만, 모터와 같은 방식) → 토크 ≤ K_t × I_lim (늘 적용)
  //   연속 상전류: ict_m 1 = 입력값, 0 = 피크 × 비율 i_cpct (모터 표에 연속 열이 없을 때 피크 × c_pct 와 같은 방식)
  const cpct = Math.max(1e-3, Math.min(1, (Number.isFinite(I.c_pct) ? I.c_pct : 100) / 100));     // 연속 비율 [-]
  const dr0 = I.dr_t0, dr1 = I.dr_t1, drM = thOn && dr1 > dr0;                                       // 모터 디레이팅 시작 · 끝 온도 [°C]
  const kt = I.kt, ipk = I.i_pk, invLim = true;                                                         // 토크 상수 [N·m/A] · 인버터 피크 상전류 [A] (calc 입구에서 > 0 확인)
  const ict = I.ict_m !== 0 ? Math.max(0, Math.min(I.i_ct, ipk)) : ipk * Math.max(0, Math.min(1, (Number.isFinite(I.i_cpct) ? I.i_cpct : 100) / 100));   // 인버터 연속 상전류 [A]
  const di0 = I.di_t0, di1 = I.di_t1;
  const r01 = x => Math.max(0, Math.min(1, x));
  /* 디레이팅 표 (2026-11-11): I.derM · I.derI = {t:[°C], r:[%]} (0 % = 피크 그대로 · 100 % = 연속까지), 표 사이 직선, 끝 밖은 끝 값. 없으면 시작 · 끝 온도 사이 직선 */
  const dTab = (D, x) => { const t = D.t, rr = D.r; if (x <= t[0]) return rr[0] / 100; if (x >= t[t.length - 1]) return rr[rr.length - 1] / 100; let i = 1; while (t[i] < x) i++; return (rr[i - 1] + (rr[i] - rr[i - 1]) * (x - t[i - 1]) / (t[i] - t[i - 1])) / 100; };
  const rM = Tm => !(thOn && Number.isFinite(Tm)) ? 0 : I.derM ? r01(dTab(I.derM, Tm)) : drM ? r01((Tm - dr0) / (dr1 - dr0)) : 0;
  const rI = Ti => !(inOn && ict < ipk && Number.isFinite(Ti)) ? 0 : I.derI ? r01(dTab(I.derI, Ti)) : di1 > di0 ? r01((Ti - di0) / (di1 - di0)) : 0;   // 인버터 온도 Ti [°C] (인버터 온도 끔 = 디레이팅 없음)   // 인버터 온도 Ti [°C] (인버터 온도 끔 = 디레이팅 없음)
  const drOn = (thOn && (drM || !!I.derM)) || (inOn && ict < ipk && (di1 > di0 || !!I.derI));                                              // 온도에 따라 토크 한계가 바뀜 → 온도를 반영해 한 번 더 셈
  const thC  = Math.max(1, I.th_c);                   // 열용량 [J/K]
  const thR  = Math.max(1e-9, I.th_r);                // 냉각까지 열저항 [K/W]
  const thCo = I.th_cool;                             // 냉각수 온도 [°C] (냉각 회로 방식 · 부품별 독립은 회로마다 tw0)
  // ---------- 열 모델 (켜고 끔 · 부품마다 공랭 / 수랭)
  //   모터    : C_m dT_m/dt = 모터 손실 − 냉각.  수랭 (T_m − T_w) ÷ R_m,  공랭 hA_m(v) (T_m − T_외기).  끄면 출발 온도 그대로 · 디레이팅 없음
  //   인버터  : C_i dT_i/dt = 인버터 손실 − 냉각.  수랭 (T_i − T_w) ÷ R_i,  공랭 hA_i(v) (T_i − T_외기).  끄면 온도는 안 셈 (수랭이면 손실을 냉각수에 바로)
  //   축전지  : C_b dT_b/dt = I² R(T_b) − 냉각.  공랭 hA_b(v) (T_b − T_외기),  수랭 (T_b − T_w) ÷ R_b.  R(T) = R_25 (1 + α (25 − T)) (0.3 R_25 아래로는 안 감)
  //   냉각수 · 부품별 독립 (cw_mode 0): 수랭 부품마다 자기 [라디 → 펌프 → 부품] 회로 (coolIndep) 를 아래 냉각 회로와 같은 식으로
  //   냉각수 · 냉각 회로 (cw_mode 1): 도구 9 와 같은 점 모델 — 점 k (잘 섞인 덩어리, 열용량 C_k): C_k dT_k/dt = q_k C_c (T_섞임 − T_k) + (T_부품 − T_k) ÷ R,
  //     라디 점: C_k dT_k/dt = q_k C_c (T_섞임 − T_k) − ε C_min (T_섞임 − T_외기) (교차류 ε-NTU, 공기 = 주행풍 A k_d v + 팬), 공랭 덕트는 흐름 순서대로 공기가 데워짐 (갈래 · 합침, coolAir).
//     갈래 유량 몫은 호스 안지름 · 길이와 블럭 압력 강하로 (coolHydSolve).
  //     점 · 부품을 흐름 순서대로 0.25 s 이하 작은 칸으로 나눠 지수 적분 (도구 9 와 같은 방식). 끄면 냉각수 온도 고정
  //   방열 능력은 모두 h(v) = h_0 + (h_60 − h_0) × v ÷ 60 km/h (정지 값 · 60 km/h 값, 선형; 팬이면 정지 값을 크게, 주행풍이면 60 km/h 값을 크게)
  //   칸마다 지수 적분 (그 칸 동안 다른 노드 온도 · 손실은 고정) → dt 가 커도 안정
  //   st.w = 가장 뜨거운 냉각수 온도 (신호 · 결과용), st.x = 냉각수 상태 (독립: [모터 · 인버터 · 축전지 회로], 도구 9: 회로마다 점 온도)
  const Tamb = isFinite(I.t_amb) ? I.t_amb : 25;                         // 외기 온도 [°C]
  const Cb   = Math.max(1, I.b_c || 1), alp = I.b_alpha || 0, Rbt = Math.max(1e-9, I.b_r || 0.05);         // 축전지 열용량 [J/K] · 저항 온도 계수 [1/°C] · 수랭 열저항 [K/W]
  const Ci   = Math.max(1, I.i_c || 1), Ri = Math.max(1e-9, I.i_r || 0.05);                                   // 인버터 열용량 [J/K] · 수랭 열저항 [K/W]
  const hV   = (h0, h60, v) => Math.max(0, (h0 || 0) + ((Number.isFinite(h60) ? h60 : (h0 || 0)) - (h0 || 0)) * v / (60 / 3.6));   // 방열 능력 [W/K] (60 km/h 값이 없으면 일정)
  const rS   = (Tb, soc) => bR ? Math.max(0.05, bil(bR, Tok(Tb), cl01(soc == null ? 1 : soc) * 100) / Rref) : btOn ? Math.max(0.3, 1 + alp * (25 - Tb)) : 1;  // 내부저항 배율 (셀 표가 있으면 표, 없으면 온도 계수)
  const toward = (T, Teq, k, dt) => Teq + (T - Teq) * Math.exp(-k * dt);   // dT/dt = k (Teq − T) 의 해
  const air = (T, Q, h, C, dt) => h > 0 ? toward(T, Tamb + Q / h, h / C, dt) : T + Q * dt / C;          // 외기로 식는 노드
  const PJ = ['m', 'i', 'b'], PR = { m: thR, i: Ri, b: Rbt }, PC = { m: thC, i: Ci, b: Cb }, PON = { m: thOn, i: inOn, b: btOn };
  const PH = { m: v => hV(I.m_ha0, I.m_ha60, v), i: v => hV(I.i_ha0, I.i_ha60, v), b: v => hV(I.b_ha, I.b_ha60, v) };
  const RHOA = COOL_RA, CPA = COOL_CA;
  const mixOf = (nd, c, k, N) => { const ins = nd.ins || [[(k - 1 + N) % N, 1]]; let fs = 0, ft = 0; ins.forEach(([j, f]) => { fs += f; ft += f * c[j]; }); return fs > 0 ? ft / fs : c[k]; };
  const twOf = Cc => Number.isFinite(Cc.tw0) ? Cc.tw0 : thCo;   // 회로 냉각수 온도 (부품별 독립 = 회로마다, 냉각 회로 = th_cool)
  const X0 = NET.water.map(Cc => Cc.nodes.map(() => twOf(Cc))); X0.fan = NET.water.map(Cc => Cc.nodes.map(coolFanOn0));   // 냉각수 점 온도 · 라디 팬 상태
  function thStep(st, Lm, Li, Ib, v, dt, soc) {
    const Qb = Ib * Ib * Rb * rS(st.b, soc), L = { m: Lm, i: Li, b: Qb }, x = st.x || X0;
    // 냉각 회로
    const T = { m: st.m, i: st.i, b: st.b }, c = x.map(a => a.slice()), n = Math.max(1, Math.ceil(dt / 0.25)), h = dt / n;
    const fan = (x.fan || X0.fan).map(a => a.slice()), aC = {}, aK = (w, k) => { const on = fan[w][k], key = w + ':' + k + ':' + on; return key in aC ? aC[key] : (aC[key] = coolRadA(NET.water[w], NET.water[w].nodes[k], v, on)); };
    for (let s = 0; s < n; s++) {
      if (cwOn) NET.water.forEach((Cc, w) => { const N = Cc.nodes.length;
        for (let k = 0; k < N; k++) { const nd = Cc.nodes[k], mix = mixOf(nd, c[w], k, N), F = (nd.q || 1) * Cc.Cc, Cn = coolC(nd);
          if (nd.t === 'rad') { fan[w][k] = coolFanNext(nd, fan[w][k], mix); c[w][k] = toward(c[w][k], mix - aK(w, k) * (mix - Tamb), F / Cn, h); continue; }
          const p = nd.part;
          if (p && PON[p]) { const G = 1 / PR[p]; c[w][k] = toward(c[w][k], (F * mix + G * T[p]) / (F + G), (F + G) / Cn, h); }
          else if (p === 'i' && F > 0) c[w][k] = toward(c[w][k], mix + Li / F, F / Cn, h);   // 인버터 온도 끔: 손실을 냉각수에 바로
          else if (F > 0) c[w][k] = toward(c[w][k], mix, F / Cn, h); } });
      for (const p of PJ) { if (!PON[p]) continue; const wh = where[p];
        if (wh && wh.w != null) T[p] = toward(T[p], (cwOn ? c[wh.w][wh.k] : twOf(NET.water[wh.w])) + L[p] * PR[p], 1 / (PR[p] * PC[p]), h);
        else if (!wh) T[p] = air(T[p], L[p], PH[p](v), PC[p], h); }
      (NET.air || []).forEach(D => coolAir(D, RHOA * CPA * Math.max(0, D.A * D.kd * v + D.fan), Tamb, T, L, p => PH[p](v), false, h, PC, PON, toward)); }   // 공랭 덕트 (갈래 · 합침, 앞 부품이 데운 공기)
    const w = cwOn && c.length ? Math.max(...c.map(a => Math.max(...a))) : NET.water.length ? Math.max(...NET.water.map(twOf)) : thCo; c.fan = fan;
    return { m: T.m, i: T.i, w, b: T.b, x: c };
  }
  const tmNext = (Tm, Ploss, dt) => thStep({ m: Tm, i: Tm, w: thCo, b: 25, x: X0 }, Ploss, 0, 0, 0, dt).m;   // 예전 이름 (모터만)

  // 단자 전압 V 에서 회전수 n 의 피크 · 연속 토크 [N·m]  (표가 둘 다 없으면 모터 최대 토크 일정 — 검증용, 화면에서는 표가 꼭 있음)
  if (I.motorReq === 1 && !tq.length && !tqC.length) throw new Error('모터 토크 표가 비어 있습니다. 편집 › 모터에서 피크 또는 연속 토크를 넣으세요.');
  const Tpk = (n, V) => tq.length ? fromTab(tq, n, V) : tqC.length ? fromTab(tqC, n, V) / cpct : I.tmax;
  const Tct = (n, V) => tqC.length ? Math.min(fromTab(tqC, n, V), Tpk(n, V)) : Tpk(n, V) * cpct;
  // 디레이팅 비율 rm (모터) · ri (인버터) 에서 최대 토크
  function TcR(n, V, rm, ri) {
    if (n > nmax) return 0;
    const P = Tpk(n, V); let T = rm > 0 ? P - rm * (P - Tct(n, V)) : P;
    if (invLim) T = Math.min(T, kt * (ipk - ri * (ipk - ict)));
    return T;
  }
  // 단자 전압 V · 모터 온도 Tm · 인버터 온도 Ti 에서 회전수 n 의 최대 토크 [N·m]
  const Tcurve = (n, V, Tm, Ti) => TcR(n, V, rM(Tm), rI(Ti));
  const eM  = (n, T) => (I.effM ? bil(I.effM, n, Math.abs(T)) : I.eta_mot) / 100;   // 모터 효율 [-]
  const effMg = I.eff_mg === 1, rInv = Math.max(0, Math.min(1, (isFinite(I.inv_r) ? I.inv_r : 30) / 100));   // 모터 맵에 인버터를 합쳤으면 인버터 효율 = 1, 손실 중 인버터 몫 rInv
  const eI  = (n, T) => effMg ? 1 : (I.effI ? bil(I.effI, n, Math.abs(T)) : I.eta_inv) / 100;   // 인버터 효율 [-]
  const rpm = v => v / r * gr * 60 / (2 * Math.PI);                                  // 차속 [m/s] → 모터 [rpm]
  const vtop = nmax / gr * 2 * Math.PI / 60 * r * (1 - 1e-9);                        // 회전수 한계 최고속 [m/s]

  // ---------- 바퀴 구동력 [N]: 모터 곡선과 (단자 출력 상한 × 효율) 중 작은 쪽. 단자 전압이 전류로 떨어지므로 3번 되풀이
  const DM = new Map();   // 기억: 차속 0.01 m/s · 전압 0.1 V · 모터 온도 0.5 °C 단위 (디레이팅이 없으면 온도 무시)
  function drive(v, V0, Tm, Ti) {
    const qm = Math.round(rM(Tm) * 400), qi = Math.round(rI(Ti) * 400);              // 비율을 1/400 단위로 묶어 기억
    const key = ((Math.round(v * 100) * 65536 + Math.round(V0 * 10)) * 401 + qm) * 401 + qi;
    let o = DM.get(key);
    if (!o) { o = drive_(v, V0, qm / 400, qi / 400); DM.set(key, o); }
    return o;
  }
  function drive_(v, V0, rm, ri) {
    const n = rpm(v), w = n * 2 * Math.PI / 60, Pt = ptMax(V0);
    let V = V0, T = TcR(n, V0, rm, ri);
    for (let it = 0; it < 3; it++) {
      const e = eM(n, T) * eI(n, T);
      T = TcR(n, V, rm, ri);
      if (w > 0) T = Math.min(T, Pt * e / w);
      const tr_ = term(T * w / e, V0);
      V = tr_ ? tr_.V : V0 / 2;
    }
    return { T, F: T * gr * etaD(n, T) / r, V };
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
  // 현실 운전자 그립 사용률 (가속 · 이상 운전자 = 1). 곡률별 코너 한계 속도 기억은 배율마다 따로 (같은 계산 안에서 종목마다 배율이 다름)
  const kG = I.dr_real === 1 && !I.__acc ? Math.max(0.05, I.dr_ks > 0 ? I.dr_ks : 1) * (I.__end ? Math.max(0.05, I.dr_ke > 0 ? I.dr_ke : 1) : 1) : 1;
  const vcOf = M => { if (!M) return null; const q = 'g' + kG; if (!M.has(q)) M.set(q, new Map()); return M.get(q); };
  const VCk = vcOf(VC), VCFk = vcOf(VCF);
  const capF = (v, ax, ay) => kG * cap(Fzf(v, ax), dF(ay, true));     // 축 종 방향 한계 Σ μ·F_z (바퀴마다 최고)
  const capR = (v, ax, ay) => kG * cap(Fzr(v, ax), dF(ay, false));
  const capFy = (v, ax, ay) => kG * capY(Fzf(v, ax), dF(ay, true));   // 축 횡 방향 한계 (모델 2 이상: 같은 슬립각 최댓값, 아니면 capF 와 같음)
  const capRy = (v, ax, ay) => kG * capY(Fzr(v, ax), dF(ay, false));

  // ---------- 코너 한계 속도 [m/s] (곡률 k [1/m])
  function vCorner(k) {
    k = Math.abs(k);
    if (k < 1e-9) return Infinity;
    if (VCk && VCk.has(k)) return VCk.get(k);
    let v;
    if (!nonlin && !md2) {            // μ 일정: 앞 · 뒤 축 각각 닫힌 식
      let v2 = Infinity;
      const cf = m * k * fs - (mu * kG) * (cl * fa - cd * hc / L);
      const cr = m * k * (1 - fs) - (mu * kG) * (cl * (1 - fa) + cd * hc / L);
      if (fs > 0 && cf > 0) v2 = Math.min(v2, (mu * kG) * m * g * fs / cf);
      if (fs < 1 && cr > 0) v2 = Math.min(v2, (mu * kG) * m * g * (1 - fs) / cr);
      v = Math.sqrt(v2);
    } else {                          // 하중 감도 · 맵: 이분법
      const ok = u => {
        const ay = u * u * k;
        return m * ay * fs <= capFy(u, 0, ay) + 1e-9 && m * ay * (1 - fs) <= capRy(u, 0, ay) + 1e-9;
      };
      let lo = 0, hi = 150;
      if (ok(hi)) v = Infinity;
      else {
        for (let i = 0; i < 50; i++) { const md = (lo + hi) / 2; if (ok(md)) lo = md; else hi = md; }
        v = lo;
      }
    }
    // 모델 2: 조향 한계 — 아주 느려도 안쪽 바퀴 조향각이 최대를 넘으면 돌 수 없음 (steerCheck 가 계산을 멈춤), 속도를 낮춰 들어가면 그 속도가 상한
    let fl = 0;
    if (md2 && dmx > 0) {
      if (dIn0(k) > dmx + 1e-6) { v = 0.5; fl = 2; }
      else if (dReq(Math.min(v, 150), k) > dmx) {
        let lo = 0, hi = Math.min(v, 150);
        for (let i = 0; i < 28; i++) { const u = (lo + hi) / 2; if (dReq(u, k) <= dmx) lo = u; else hi = u; }
        v = lo; fl = 1;
      }
    }
    if (VCk) { VCk.set(k, v); VCFk.set(k, fl); }
    return v;
  }
  // ---------- 모델 3: 주행선 곡률 변화로 생기는 과도 횡력을 축마다 '등가 곡률' 로 (일정 차속 역동역학)
  //   앞: κ_f = κ + [I_z κ' + σ (m l_r κ' + I_z κ'')] ÷ (m l_r),  뒤: κ_r = κ + [−I_z κ' + σ (m l_f κ' − I_z κ'')] ÷ (m l_f)   (κ' = dκ/ds, ' 는 곡률을 다듬기 거리로 고른 값)
  //   코너 한계 속도 = 앞 m v² κ_f l_r ÷ L ≤ 앞 횡 한계, 뒤 m v² κ_r l_f ÷ L ≤ 뒤 횡 한계 (하중 이동은 실제 κ) 와 모델 2 한계 중 작은 값.  속도 변화로 생기는 몫은 trCaps 가 따로
  const md3 = I.md === 3, IzT = md3 ? Math.max(0, Number.isFinite(I.izz) ? I.izz : 70) : 0, sgT = md3 ? Math.max(0, I.tire_relax || 0) : 0, ltR = L * fs, ltF = L * (1 - fs);
  const ksT = I.tr_ks > 0 ? I.tr_ks : 2;
  const kEff = (k, k1, k2) => [k + (IzT * k1 + sgT * (m * ltR * k1 + IzT * k2)) / (m * ltR), k + (-IzT * k1 + sgT * (m * ltF * k1 - IzT * k2)) / (m * ltF)];
  const V3 = new Map();
  function vCorner3(k, k1, k2) {
    const vs = vCorner(k); if (!md3 || (!k1 && !k2)) return vs;
    const [kf0, kr0] = kEff(k, k1, k2), ka = Math.abs(k), kf = Math.abs(kf0), kr = Math.abs(kr0);
    if (kf <= ka * (1 + 1e-9) && kr <= ka * (1 + 1e-9)) return vs;
    const key = \`\${k.toPrecision(9)}|\${k1.toPrecision(7)}|\${k2.toPrecision(7)}\`; if (V3.has(key)) return V3.get(key);
    const ok = u => { const ay = u * u * ka; return m * u * u * kf * ltR / L <= capFy(u, 0, ay) + 1e-9 && m * u * u * kr * ltF / L <= capRy(u, 0, ay) + 1e-9; };
    let lo = 0, hi = Math.min(isFinite(vs) ? vs : 150, 150), v;
    if (ok(hi)) v = isFinite(vs) ? vs : hi; else { for (let i = 0; i < 40; i++) { const u = (lo + hi) / 2; if (ok(u)) lo = u; else hi = u; } v = lo; }
    V3.set(key, v); return v;
  }
  const vFlag = k => { k = Math.abs(k); if (k < 1e-9) return 0; if (!(VCFk && VCFk.has(k))) vCorner(k); return VCFk && VCFk.has(k) ? VCFk.get(k) : 0; };   // 0 없음 · 1 조향 한계로 느려짐 · 2 돌 수 없음

  // ---------- 가속 [m/s²]: 뒤축 마찰원 · 모터 힘, 앞축 횡력이 모자라면 줄임
  function aDrive(v, k, a0, V0, Tm, Ti) {
    const ay = v * v * Math.abs(k), Fyr = m * ay * (1 - fs), Fyf = m * ay * fs, Fm = drive(v, V0, Tm, Ti).F;
    let ax = a0 || 0;
    for (let it = 0; it < 4; it++) {
      const N = capR(v, ax, ay), Ny = capRy(v, ax, ay), Fx = Ny > 0 ? N * Math.sqrt(Math.max(0, 1 - (Fyr / Ny) ** 2)) : 0;   // 마찰 타원: 종 N (바퀴마다 최고), 횡 Ny (모델 2: 같은 슬립각)
      ax = (Math.min(Fm, Fx) - Fres(v)) / meff;
    }
    if (Fyf > 0 && h > 0 && capFy(v, ax, ay) < Fyf) {
      let lo = -3 * g, hi = ax;
      if (capFy(v, lo, ay) >= Fyf) {
        for (let i = 0; i < 40; i++) { const md = (lo + hi) / 2; if (capFy(v, md, ay) >= Fyf) lo = md; else hi = md; }
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
      const N = capF(v, -d, ay) + capR(v, -d, ay), Ny = capFy(v, -d, ay) + capRy(v, -d, ay), Fx = Ny > 0 ? N * Math.sqrt(Math.max(0, 1 - (m * ay / Ny) ** 2)) : 0;
      d = (Fx + Fres(v)) / meff;
    }
    return d;
  }

  // ---------- 회생 제동 (rg_on): 제동 힘 중 뒤축 몫(이상 배분 = 뒤축 하중 비) 을 모터가 받음.  모터 축 토크 ≤ min(회생 토크 상한, 그 회전수의 최대 토크 곡선 · 인버터 한계)
  //   전기 = 축 출력 × 모터 효율 × 인버터 효율 (같은 맵), 충전 전류 ≤ i_chg → 단자 출력 ≤ (V0 + i_chg R) i_chg.  나머지 제동은 마찰 브레이크.  저속 회생 차단 · 회생 토크 곡선은 없음 (도구 2P 수준)
  const rgOn = I.rg_on === 1, rgT = Math.max(0, I.rg_tmax || 0), Ich = Math.max(0, I.i_chg || 0);
  function regen(F, v, V0, rs, ax, Tm, Ti) {
    const n = rpm(v), w = n * 2 * Math.PI / 60; if (!(w > 0) || n > nmax) return null;
    const zf = Fzf(v, ax), zr = Fzr(v, ax), sr = zf + zr > 0 ? Math.max(0, zr) / (zf + zr) : 0;   // 뒤축 제동 몫
    const T0r = -F * sr * r / gr, Tneed = T0r * etaD(n, T0r);                                      // 바퀴 → 모터 축 (구동계 효율만큼 덜 옴, 맵이면 그 점 효율)
    let T = Math.min(Tneed, rgT, TcR(n, V0, rM(Tm), rI(Ti)));
    const e = (I.effM ? bil(I.effM, n, T) : I.eta_mot) / 100 * (effMg ? 1 : (I.effI ? bil(I.effI, n, T) : I.eta_inv) / 100), Rx = Rb * rs;
    const Pch = (V0 + Ich * Rx) * Ich; if (T * w * e > Pch) T = Pch / (w * e);                    // 충전 전류 한계
    if (!(T > 0)) return null;
    const P = -T * w * e, i = Rx > 0 ? (V0 - Math.sqrt(V0 * V0 - 4 * Rx * P)) / (2 * Rx) : P / V0;   // P = (V0 − iR) i, i < 0
    const em = I.effM ? bil(I.effM, n, T) / 100 : I.eta_mot / 100;
    return { T: -T, e, P, I: i, V: V0 - i * Rx, L: effMg ? (1 - rInv) * T * w * (1 - e) : T * w * (1 - em), Li: effMg ? rInv * T * w * (1 - e) : T * w * em - (-P), Fw: T * gr / (r * etaD(n, T)) };
  }
  // ---------- 한 칸의 전기: 바퀴 힘 F [N] → 모터 토크 [N·m] · 효율 · 단자 출력 [W] · 전류 [A] · 단자 전압 [V] · 모터 손실 [W]  (ax · Tm · Ti 는 회생 몫 계산에만)
  function elec(F, v, V0, rs = 1, ax = 0, Tm, Ti) {
    if (F <= 0) { const G = rgOn && F < 0 ? regen(F, v, V0, rs, ax, Tm, Ti) : null; return G || { T: 0, e: 1, P: 0, I: 0, V: V0, L: 0, Li: 0 }; }
    const n = rpm(v), w = n * 2 * Math.PI / 60, T0 = F * r / gr, T = T0 / etaD(n, T0 / etaD(n, T0)), em = eM(n, T), e = effMg ? em : em * eI(n, T), P = T * w / e;
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
  const fzr = I.fz0_m !== 0 ? I.tire_fz0 : m * g / 4;                                // 코너링 강성 기준 하중 [N] (fz0_m 0 = 정지 평균 하중)
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
  // ---------- 모델 2: 축 횡력 한계 = 두 바퀴가 같은 슬립각일 때 F_y(α, 바깥) + F_y(α, 안쪽) 의 최댓값 (바퀴마다 최고점 슬립각이 하중에 따라 달라 Σ μ·F_z 보다 작음)
  //   바퀴 하나 최고점: C atan(Bα − E(Bα − atan Bα)) = π/2 → x − E(x − atan x) = tan(π ÷ 2C), α = x ÷ B.  두 최고점 사이를 훑고 황금분할
  //   한계 비율 ρ = 축 최댓값 ÷ Σ μ·F_z 를 (축 하중, 안쪽 몫) 격자에 미리 구해 쌍선형 보간 (종 방향 한계는 바퀴마다 최고 그대로 → 마찰 타원)
  const pkX = (() => { if (!(tC > 1)) return Infinity; const t = Math.tan(Math.PI / (2 * tC)); let lo = 0, hi = 1e4;
    for (let i = 0; i < 80; i++) { const x = (lo + hi) / 2; if ((1 - tE) * x + tE * Math.atan(x) < t) lo = x; else hi = x; } return (lo + hi) / 2; })();
  const pk1 = z => { const D = muZ(z) * z; if (!(D > 0) || !isFinite(pkX)) return 40; const B = Ca(z) / (tC * D); return Math.min(40, pkX / B / Dg); };   // [deg]
  function axPk(zo, zi) {
    if (!(zo > 0)) return 0; if (!(zi > 0)) return FyT(pk1(zo), zo);
    const G = a => FyT(a, zo) + FyT(a, zi), a1 = Math.min(pk1(zo), pk1(zi)), a2 = Math.max(pk1(zo), pk1(zi));
    let bA = a1, bG = G(a1); for (let j = 1; j <= 16; j++) { const a = a1 + (a2 - a1) * j / 16, v = G(a); if (v > bG) { bG = v; bA = a; } }
    let lo = Math.max(0, bA - (a2 - a1) / 16), hi = bA + (a2 - a1) / 16 + 1e-9;
    for (let i = 0; i < 50; i++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (G(m1) < G(m2)) lo = m1; else hi = m2; }
    return Math.max(bG, G((lo + hi) / 2)); }
  const NS = 80, NQ = 25, Smax = 1.2 * (m * g + cl * 60 * 60);   // 격자: 축 하중 0 ~ Smax [N] (차속 60 m/s 다운포스까지) × 안쪽 몫 0 ~ 0.5
  const rtKey = JSON.stringify([I.mu, mus, fz0, tmap, ca0, cn, tC, tE, fzr, Smax]);
  let RT = RTC.get(rtKey) || null;
  const rhoT = () => { if (RT) return RT; RT = []; RTC.set(rtKey, RT);
    for (let j = 0; j <= NS; j++) { const Sz = Math.max(1, Smax * j / NS), row = [];
      for (let q = 0; q <= NQ; q++) { const zi = Sz * 0.5 * q / NQ, zo = Sz - zi, nx = muZ(zo) * zo + muZ(zi) * zi; row.push(nx > 0 ? Math.min(1, axPk(zo, zi) / nx) : 1); }
      RT.push(row); }
    return RT; };
  const rho = (Sz, q) => { const T = rhoT(), x = Math.max(0, Math.min(NS, Sz / Smax * NS)), y = Math.max(0, Math.min(NQ, q / 0.5 * NQ)), j = Math.min(NS - 1, Math.floor(x)), k = Math.min(NQ - 1, Math.floor(y)), u = x - j, w = y - k;
    return (T[j][k] * (1 - w) + T[j][k + 1] * w) * (1 - u) + (T[j + 1][k] * (1 - w) + T[j + 1][k + 1] * w) * u; };
  const capY = (Fz, d) => { if (!md2) return cap(Fz, d); const [o, i] = wheels(Fz, d), Sz = o + i; if (!(Sz > 0)) return 0; return (muZ(o) * o + muZ(i) * i) * rho(Sz, i / Sz); };
  // ---------- 모델 2: 조향 — 안쪽 바퀴 조향각 [deg] = atan(L ÷ (R_뒤축 − t_f/2)) + (α_f − α_r)  (기하는 100 % 애커먼 근사, R_뒤축 = √(R² − l_r²), l_r = L × 앞 무게 몫)
  //   도구 6 조향각 표가 있으면 기하 조향각 · 최대 조향각 · 조향비는 그 표에서 (steerGeo)
  const SG = steerGeo(I);
  const dmx = md2 && I.dl_on !== 0 ? SG.dmax : 0;   // 조향 한계 (dl_on 1, calc 입구에서 > 0 확인)
  const dIn0 = k => SG.diOf(k);
  const dReq = (v, k) => { const ay = v * v * Math.abs(k), [fo, fi] = wheels(Fzf(v, 0), dF(ay, true)), [ro, ri] = wheels(Fzr(v, 0), dF(ay, false));
    return dIn0(k) + slipA(fo, fi, m * ay * fs).a - slipA(ro, ri, m * ay * (1 - fs)).a; };

  return { m, meff, r, gr, eta, etaD, fs, h, nmax, vtop, rpm, Fres, Fzr, Fzf, dF, wheels, capF, capR, capFy, capRy, axPk, vFlag, vCorner3, md3, ksT, dIn0, dReq, dmx, rollAng, md2, slipA, Ca, kUs, L, hra, tf, tr, muZ, FyT, sr: SG.rc, SG, drv: I.dr_real === 1,
           vCorner, aDrive, aBrake, drive, elec, Tcurve, Voc, Epack, EpackAt, Ecap, ptMax, Rb, Imax, tmNext, thStep, rS, thOn, cwOn, btOn, inOn, drOn, Tpk, Tct, Tinit: I.th_init, rgOn, lam: lam > 0 ? lam : 0,
           TH0: { m: I.th_init, i: Number.isFinite(I.i_init) ? I.i_init : I.th_init, w: NET.water.length ? Math.max(...NET.water.map(twOf)) : I.th_cool, b: isFinite(I.b_t0) ? I.b_t0 : 25, x: X0 } };   // 출발 온도 (모터 · 인버터 · 냉각수 · 축전지)
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
// 최소 회전 반경 [m] = 최대 조향각에서 (아주 느리게, 슬립각 0, 100 % 애커먼 — 모델 2 조향 한계 dIn0 의 역함수):
//   R_뒤축 = L ÷ tan δ_max + t_f ÷ 2,  R (CG 경로) = √(R_뒤축² + l_r²),  l_r = L × 앞 하중 비율   (조향 한계 고려 안 함 · δ_max 0 = 제약 없음)
//   도구 6 조향각 표 (I.stab = [[핸들 각 °, 안쪽 바퀴 °, 바깥 바퀴 °], …]) 가 있으면 그 표의 핸들 최대에서 (도구 6 최소 회전 반경과 같은 식, steerGeo)
const rKin = I => { if (I.dl_on === 0) return 0; const SG = steerGeo(I); return SG.kmax > 0 ? 1 / SG.kmax : 0; };
// ---------- 조향 기하: 곡률 κ (CG 경로) → 핸들 각 h [°] · 안쪽 바퀴 각 [°]  (아주 느리게, 슬립각 0)
//   도구 6 표가 있으면: 표의 행마다 자전거 등가 각 cot δe = (cot δ안 + cot δ바깥) ÷ 2 → R_뒤축 = L cot δe, κ = 1 ÷ √(R_뒤축² + l_r²),
//     κ 에 대해 핸들 각 · 안쪽 바퀴 각을 직선 보간 (링크 기하 · 애커먼 % 그대로), 가운데 조향비 = 첫 행 핸들 각 ÷ 두 바퀴 평균
//   표가 없으면: 100 % 애커먼 — δe = atan(L ÷ R_뒤축), 핸들 = 조향비 × δe, 안쪽 바퀴 = atan(L ÷ (R_뒤축 − t_f ÷ 2)), 최대 = 최대 조향각 (안쪽 바퀴)
function steerGeo(I) {
  const L = I.L / 1000, lr = L * I.fr / 100, tf = I.tf / 1000, D = Math.PI / 180;
  const T = Array.isArray(I.stab) ? I.stab.filter(r => Array.isArray(r) && r.length >= 3 && r.every(Number.isFinite) && r[0] > 0 && r[1] > 0 && r[2] > 0 && r[1] < 89 && r[2] < 89).sort((a, b) => a[0] - b[0]) : [];
  if (T.length >= 2) {
    const P = [[0, 0, 0]].concat(T.map(([h, di, dO]) => { const ce = (1 / Math.tan(di * D) + 1 / Math.tan(dO * D)) / 2, Ra = L * ce; return [1 / Math.sqrt(Ra * Ra + lr * lr), h, di]; }));
    for (let i = 1; i < P.length; i++) if (!(P[i][0] > P[i - 1][0])) throw new Error('도구 6 조향각 표: 핸들 각이 커질수록 회전 반경이 작아져야 합니다 (표 확인).');
    const seg = k => { let i = 1; while (i < P.length - 1 && P[i][0] < k) i++; return i; };
    const at = (k, c) => { const i = seg(k), [k0, ...a] = P[i - 1], [k1, ...b] = P[i]; return a[c] + (b[c] - a[c]) * (k - k0) / (k1 - k0); };
    const rc = T[0][0] / ((T[0][1] + T[0][2]) / 2);
    return ({ tab: true, n: T.length, kmax: P.at(-1)[0], dmax: T.at(-1)[1], hwMax: T.at(-1)[0], rc,
      hOf: k => at(Math.abs(k), 0), diOf: k => Math.abs(k) > P.at(-1)[0] * (1 + 1e-9) ? 90 : at(Math.abs(k), 1),
      hp: k => { const i = seg(Math.abs(k)); return (P[i][1] - P[i - 1][1]) / (P[i][0] - P[i - 1][0]); } });
  }
  const r = I.steer_ratio > 0 ? I.steer_ratio : 5, dm = I.delta_max;
  const Ra = k => { const R = 1 / Math.max(1e-9, Math.abs(k)); return Math.sqrt(Math.max(1e-9, R * R - lr * lr)); };
  const dE = k => Math.abs(k) < 1e-12 ? 0 : Math.atan(L / Ra(k)) / D;
  const kmax = dm > 0 && dm < 90 ? (Rr => 1 / Math.sqrt(Rr * Rr + lr * lr))(L / Math.tan(dm * D) + tf / 2) : 0;
  return ({ tab: false, kmax, dmax: dm, rc: r, hwMax: NaN,
    hOf: k => r * dE(k), diOf: k => { const Rr = Ra(k) - tf / 2; return Rr > 1e-6 ? Math.atan(L / Rr) / D : 90; },
    hp: k => { const a = Math.abs(k), e = Math.max(1e-6, a * 1e-4); return r * (dE(a + e) - dE(Math.max(0, a - e))) / (a + e - Math.max(0, a - e)); } });
}
const rkMax = I => { const R = rKin(I); return R > 0 ? 1 / R : 0; };   // 주행선 최대 곡률 [1/m] (0 = 제약 없음)
// 달리는 선에서 최소 회전 반경보다 급한 구간: {r: 가장 작은 반경 [m], bad: 급한 구간 길이 합 [m]}
function rTight(segs, rmin) { let r = Infinity, bad = 0;
  (segs || []).forEach(([l, R]) => { if (!R) return; const a = Math.abs(R); if (a < r) r = a; if (rmin > 0 && a < rmin * (1 - 1e-3)) bad += l; });
  return { r, bad }; }
const wcOn = I => I.wc_on !== 0;   // 차 크기(전폭 · 오버행) 고려 (calc 입구에서 전폭 > 0 확인)
const rlB = I => wcOn(I) ? I.w_car / 2 + Math.max(0, I.rl_m || 0) : Math.max(0, I.rl_b);
// 차 여유 (기하, 차량 모델 단계와 상관없이): 차 = 전폭 w × (앞 끝 ~ 뒤 끝) 사각형, 저속 기구학 선회 (뒷바퀴 옆 미끄럼 없음)
//   회전 중심 O 는 뒤축 연장선 위, 뒤축 중심 반경 R_r = √(R² − l_r²)  (R = CG 경로 반경, l_r = CG ~ 뒤축) → 차체가 CG 경로에 대해 β = atan(l_r / R) 만큼 비스듬
//   바깥 여유 = 바깥 모서리 (앞 끝 · 뒤 끝) 중 O 에서 가장 먼 거리 − R,  안쪽 여유 = R − 안쪽 옆면에서 O 까지 가장 가까운 거리  (+ 여유 rl_m)
//   곡률 k > 0 (왼쪽 회전) 이면 [왼쪽, 오른쪽] = [안쪽, 바깥], 곧은 길이면 둘 다 w/2 + 여유.  전폭이 0 이면 쓰지 않음 (양쪽 rl_b)
function bodyBk(I) {
  if (!wcOn(I)) return null;
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
// 차체 각도 β 를 준 차 사각형이 무게중심 경로보다 옆으로 나가는 거리 [왼쪽, 오른쪽] [m] (여유 없이, 닿는지 보는 용)
//   곡률 k (왼쪽 +) 의 회전 중심 O = 무게중심에서 왼쪽 1/k, 차체 방향 = 경로 방향 − β (β 왼쪽 선회에서 +, 저속 기구학 = asin(l_r k))
//   바깥 = 네 모서리 중 O 에서 가장 먼 거리 − R,  안쪽 = R − 차 사각형에서 O 까지 가장 가까운 거리
function bodyM(I, k, beta) {
  const w = I.w_car, L = I.L / 1000, lr = L * I.fr / 100, xF = L - lr + Math.max(0, I.oh_f || 0), xR = -(lr + Math.max(0, I.oh_r || 0));
  const a = Math.abs(k); if (a < 1e-4) return [w / 2, w / 2];
  const R = 1 / a, sg = Math.sign(k), th = -beta * sg, c = Math.cos(th), sn = Math.sin(th);   // 왼쪽 선회로 바꿔 셈 (오른쪽이면 거울)
  const P = [[xF, w / 2], [xF, -w / 2], [xR, -w / 2], [xR, w / 2]].map(([x, y]) => [c * x - sn * y, sn * x + c * y]), O = [0, R];
  const dO = q => Math.hypot(q[0] - O[0], q[1] - O[1]);
  const seg = (p1, p2) => { const dx = p2[0] - p1[0], dy = p2[1] - p1[1], t = Math.max(0, Math.min(1, ((O[0] - p1[0]) * dx + (O[1] - p1[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p1[0] + t * dx - O[0], p1[1] + t * dy - O[1]); };
  const out = Math.max(...P.map(dO)) - R, din = Math.min(...P.map((q, i) => seg(q, P[(i + 1) % 4])));
  const inn = R - din; return sg > 0 ? [inn, out] : [out, inn];
}
// 모델 2 이상 · 전폭이 있을 때: 속도에 따른 차체 각도 β(v) = asin(l_r κ) − α_r(v) (뒷바퀴 슬립각만큼 노즈가 안쪽으로) 로 차 사각형을 놓고
//   코스 경계 (주행선 점마다 왼쪽 · 오른쪽 경계까지 거리) 에 닿으면 그 점의 속도 상한 = 닿지 않는 가장 빠른 속도 (아주 느릴 때도 닿으면 주행선 문제라 상한 없음)
// 주행선 RL 위 코스 정보 (차체 · 콘 확인용): 주행 거리 sd, 점마다 왼쪽 · 오른쪽 경계까지 [m], 슬라럼 콘 (주행 거리 · 주행선에서 옆 거리, 왼쪽 +)
function lineCourse(I, which, RL) {
  const g = RL.geo, segs = RL.segs, M = segs.length, eN = RL.eN, sd = [0]; for (const [l] of segs) sd.push(sd.at(-1) + l);
  const roomL = Float64Array.from({ length: M + 1 }, (_, i) => g.wlN[Math.min(i, g.wlN.length - 1)] - eN[i]), roomR = Float64Array.from({ length: M + 1 }, (_, i) => g.wrN[Math.min(i, g.wrN.length - 1)] + eN[i]);
  const cones = [];
  if (which === 'end' || which === 'ax') { const E = I.end || {}, N = (E.seg || []).length, rev = which === 'ax';
    (E.slalom || []).forEach((j, q) => { const c = rev ? (N - j) % N : j, ic = g.segNode[c]; if (ic == null) return;
      const cl = (rev ? -1 : 1) * ((E.slat || [])[q] || 0), cd = (rev ? -1 : 1) * ((E.sds || [])[q] || 0);
      cones.push({ i: ic, s: sd[ic] + cd, y: cl - eN[ic] }); }); }
  return { sd, roomL, roomR, cones, len: sd[M], M };
}
// 차 사각형 (자세: 무게중심 옆 n, 주행선에 대한 차체 방향 ψ) 과 콘 점 (dx 앞, dy 왼쪽, 주행선 좌표) 사이 거리 [m] (안에 들면 −). 주행선 곡률 κ 로 휨 보정
function coneDist(I, C, n, psi, k, dx, dy) {
  const w = I.w_car, xF = C.L * (1 - C.fs) + Math.max(0, I.oh_f || 0), xR = -(C.L * C.fs + Math.max(0, I.oh_r || 0));
  const yy = dy + k * dx * dx / 2 - n, c = Math.cos(-psi), sn = Math.sin(-psi), x = c * dx - sn * yy, y = sn * dx + c * yy;
  const ox = Math.max(xR - x, 0, x - xF), oy = Math.max(-w / 2 - y, 0, y - w / 2);
  return ox > 0 || oy > 0 ? Math.hypot(ox, oy) : -Math.min(x - xR, xF - x, y + w / 2, w / 2 - y);
}
let BDC = new Map(), BDC_LAST = { key: '', m: new Map(), info: {} }, BDI = {};
function bodyCaps(I, C, RL, closed, LC) {
  const g = RL.geo, segs = RL.segs, M = segs.length, eN = RL.eN, sN = [0]; for (const [l] of segs) sN.push(sN.at(-1) + l);
  const rc = 0, near =   // 콘 = 점 (코스 경계와 같은 기준: 콘 중심)
    i => LC ? LC.cones.filter(q => Math.abs(q.s - sN[i]) <= 6) : [];   // 콘 반지름 · 그 점 둘레 콘
  let ctouch = 0; const ctSeen = new Set();
  const len = sN[M], cap = new Array(M + 1).fill(Infinity), lr = C.L * C.fs; let n = 0, dmax = 0;
  const kp = i => { const a = segs[Math.max(0, i - 1)][1], b = segs[Math.min(M - 1, i)][1], ka = a ? 1 / a : 0, kb = b ? 1 / b : 0; return Math.abs(ka) > Math.abs(kb) ? ka : kb; };
  const beta = (v, k) => { const a = Math.abs(k), ay = v * v * a, [ro, ri] = C.wheels(C.Fzr(v, 0), C.dF(ay, false));
    return Math.sign(k) * (Math.asin(Math.min(1, lr * a)) - C.slipA(ro, ri, C.m * ay * (1 - C.fs)).a * Math.PI / 180); };
  for (let i = 0; i < M; i++) {
    const k = kp(i);
    const roomL = g.wlN[i] - eN[i], roomR = g.wrN[i] + eN[i], cn = near(i);
    const psiOf = v => -beta(v, k);   // 주행선에 대한 차체 방향 = −β
    const fitsB = v => { const [bl, br] = bodyM(I, k, beta(v, k)); return bl <= roomL + 1e-6 && br <= roomR + 1e-6; };
    const fitsC = v => cn.every(q => coneDist(I, C, 0, psiOf(v), k, q.s - sN[i], q.y) >= rc - 1e-6);
    const fits = v => fitsB(v) && fitsC(v);
    if (Math.abs(k) < 1e-4 && !cn.length) continue;
    const v0 = Math.min(C.vCorner(Math.abs(k)), C.vtop);
    if (cn.length && !fitsC(0.3)) cn.forEach(q => { if (coneDist(I, C, 0, psiOf(0.3), k, q.s - sN[i], q.y) < rc - 1e-6 && !ctSeen.has(q)) { ctSeen.add(q); ctouch++; } });
    if (!isFinite(v0) || fits(v0) || !fits(0.3)) continue;
    let lo = 0.3, hi = v0; for (let q = 0; q < 30; q++) { const u = (lo + hi) / 2; if (fits(u)) lo = u; else hi = u; }
    cap[i] = lo; n += (segs[Math.min(M - 1, i)][0] + segs[Math.max(0, i - 1)][0]) / 2; dmax = Math.max(dmax, (v0 - lo) * 3.6);
  }
  const at = x => { x = closed ? ((x % len) + len) % len : Math.max(0, Math.min(len, x)); let lo = 0, hi = M; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (sN[md] <= x) lo = md; else hi = md; } return Math.min(cap[lo], cap[hi]); };
  return { at, info: { len: n, dv: dmax, ct: ctouch } };
}
function prepBody(I, sweep) {
  BDC = new Map(); BDI = {};
  if (!(I.md >= 2) || !wcOn(I) || !(I.rl_on > 0)) return;
  if (sweep) { BDC = BDC_LAST.m; BDI = BDC_LAST.info; return; }
  const key = rlKey(I); if (BDC_LAST.key === key) { BDC = BDC_LAST.m; BDI = BDC_LAST.info; return; }
  const C = car(I, I.gr, 1), E = I.end || {}, jobs = [];
  if ((E.seg || []).length) jobs.push(['end', drivenSegs(I, 'end', E.seg, true), true], ['ax', drivenSegs(I, 'ax', reverse(E.seg), true), true]);
  { const F = freeSegs(I); if (F && F.rl && F.rl.geo) jobs.push(['free', F.rl, F.m > 1]); }
  for (const [w, RL, closed] of jobs) { if (!RL || !RL.geo || !RL.eN) continue; const Cw = (w === 'end' || (w === 'free' && I.free && I.free.end === 1)) && I.dr_real === 1 ? car(endI(I), I.gr, 1) : C, B = bodyCaps(I, Cw, RL, closed, lineCourse(I, w, RL)); BDC.set(segKey(RL.segs), B); BDI[w] = B.info; }
  BDC_LAST = { key, m: BDC, info: BDI };
}
const bdAt = segs => { const B = BDC.get(segKey(segs)); return B ? B.at : null; };
const bodyKey = I => wcOn(I) ? [I.w_car, I.oh_f || 0, I.oh_r || 0, I.L, I.fr, I.rl_m].join(',') : '';

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
  // 점 i (조각 i−1 과 i 사이) 둘레 [a, b] [m] 의 곡률 적분 (모델 3 곡률 변화용, 조각을 따라 걸음)
  const intK = (i, a, b) => { let t = 0;
    if (b > 0) { let x = 0, j = i; while (x < b && j < i + 4 * M) { const l = lAt(j), x1 = x + l, lo = Math.max(a, x), hi = Math.min(b, x1); if (hi > lo) t += kAt(j) * (hi - lo); x = x1; j++; } }
    if (a < 0) { let x = 0, j = i - 1; while (x > a && j > i - 4 * M) { const l = lAt(j), x0 = x - l, lo = Math.max(a, x0), hi = Math.min(b, x); if (hi > lo) t += kAt(j) * (hi - lo); x = x0; j--; } }
    return t; };
  const hK = C.ksT / 2;
  const limAt = i => { const a = kAt(i - 1), b = kAt(i), kp = Math.abs(a) > Math.abs(b) ? a : b;
    if (!C.md3) return Math.min(C.vCorner(Math.abs(kp)), C.vtop);
    const c = intK(i, -hK, hK) / (2 * hK), cp = intK(i, 0, 2 * hK) / (2 * hK), cm = intK(i, -2 * hK, 0) / (2 * hK);
    return Math.min(C.vCorner3(kp, (cp - cm) / (2 * hK), (cp - 2 * c + cm) / (hK * hK)), C.vtop); };
  const vm = (vv, i) => (vv[i] + vv[i + 1]) / 2;
  let R3 = 0;   // 모델 3: 조각 하나가 바뀌면 둘레 몇 칸의 한계가 바뀌나 (곡률 변화 창 2 × 다듬기 거리)
  const m = {
    L, K,
    full() {
      if (C.md3 && !R3) { let mn = Infinity; for (let j = 0; j < M; j++) if (L[j] > 1e-6) mn = Math.min(mn, L[j]); R3 = Math.ceil(2 * C.ksT / Math.max(0.05, mn)) + 1; }
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
      for (const j of js) { const i = cell(j); for (let k = i - R3; k <= i + 1 + R3; k++) { if (k < 0 || k > N - 1) continue; S.lim[k] = limAt(k); lo = Math.min(lo, k); hi = Math.max(hi, k); }
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


// 곡률 변화 (모델 3): 칸 곡률 k[i] (i → i+1, 구간마다 일정) 를 앞뒤 h = ks/2 로 고른 κ_s, κ' = (κ_s(s+h) − κ_s(s−h)) ÷ 2h, κ'' = (κ_s(s+h) − 2κ_s + κ_s(s−h)) ÷ h²  (적분으로 정확히, 칸 크기와 상관없음)
function kDer(G, ks) {
  if (G._kd && G._kd.ks === ks) return G._kd;
  const N = G.s.length, Kc = new Float64Array(N); for (let i = 0; i < N - 1; i++) Kc[i + 1] = Kc[i] + G.k[i] * (G.s[i + 1] - G.s[i]);
  const S0 = G.s[0], S1 = G.s[N - 1], kA = G.k[0] || 0, kB = G.k[N - 2] || 0;
  let ip = 0;
  const KcAt = x => { if (x <= S0) return (x - S0) * kA; if (x >= S1) return Kc[N - 1] + (x - S1) * kB;
    if (G.s[ip] > x) { let lo = 0, hi = ip; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (G.s[md] <= x) lo = md; else hi = md; } ip = lo; }
    while (ip < N - 2 && G.s[ip + 1] <= x) ip++; return Kc[ip] + (x - G.s[ip]) * G.k[ip]; };
  const h = ks / 2, avg = x => (KcAt(x + h) - KcAt(x - h)) / (2 * h);
  const k1 = new Float64Array(N), k2 = new Float64Array(N), k0 = new Float64Array(N);
  for (let i = 0; i < N; i++) { const x = G.s[i], cm = avg(x - h), c = avg(x), cp = avg(x + h); k0[i] = c; k1[i] = (cp - cm) / (2 * h); k2[i] = (cp - 2 * c + cm) / (h * h); }
  return (G._kd = { ks, k0, k1, k2 });
}

// ================================================================ 주행
// 차속 [m/s]: 코너 한계 → 앞으로 가속 (정지 출발) → 뒤에서 제동.  V0[i] = 칸마다 개방 전압 [V], TM[i] = 모터 온도 [°C]
//   현실 운전자 (dr_real 1) 조작 한계 (고정값): 핸들 속도 HWR (핸들 360° 를 0.4 s), 페달 신호 0 → 100 % PEDT (양발 — 가속 · 제동 페달 따로, 전환 시간 없음)
//     조향: 핸들 각 h(s) 의 시간 변화 |dh/dt| = v |dh/ds| ≤ HWR → v ≤ 상한 (steerCap).  가속: 신호가 PEDT 동안 0 → 1 로 오름 (정지 출발 · 코너 탈출),
//     제동: 가속 신호가 내려가는 동안 제동 신호가 0 → 1 로 오름 → 제동 시작점이 그만큼 앞으로 (brakeRamp)
const HWR = 900, PEDT = 0.2;   // [°/s] · [s]
function speed(C, G, V0, TM, TI) {
  const N = G.s.length, v = new Array(N), lim = new Array(N), dts = new Float64Array(N).fill(NaN);
  const D3 = C.md3 ? kDer(G, C.ksT) : null;   // 모델 3: 점마다 곡률 변화 κ' · κ''
  const SC = C.drv ? steerCap(C, G) : null;   // 현실 운전자: 핸들 속도 상한
  for (let i = 0; i < N; i++) {
    const a = G.k[i - 1] || 0, b = G.k[i] || 0, kp = Math.abs(a) > Math.abs(b) ? a : b;
    lim[i] = Math.min(D3 ? C.vCorner3(kp, D3.k1[i], D3.k2[i]) : C.vCorner(Math.abs(kp)), C.vtop, G.vcap ? G.vcap[i] : Infinity, SC ? SC[i] : Infinity);   // vcap = 모델 3 과도 상한 (속도 변화 몫)
  }
  v[0] = 0;
  let a = 0, ut = 0;
  const uT = new Float64Array(N);                        // 칸 시작의 가속 신호 (현실 운전자)
  for (let i = 0; i < N - 1; i++) {                       // 앞으로: 가속
    const ds = G.s[i + 1] - G.s[i];
    a = C.aDrive(v[i], G.k[i], a, V0[i], TM ? TM[i] : C.Tinit, TI ? TI[i] : C.TH0.i); uT[i] = ut;
    if (!C.drv || ut >= 1) { v[i + 1] = Math.min(lim[i + 1], Math.sqrt(Math.max(0, v[i] * v[i] + 2 * a * ds))); if (C.drv && v[i + 1] < Math.sqrt(Math.max(0, v[i] * v[i] + 2 * a * ds)) - 1e-9) ut = pedalNeed(C, v[i], v[i + 1], ds, a); continue; }
    const ar = -C.Fres(v[i]) / C.meff, R = pedalRun(v[i], ut, -1, [ar, a, 0], ds);   // 신호를 올리며 이 칸을 감
    if (R.v > lim[i + 1]) { v[i + 1] = lim[i + 1]; ut = pedalNeed(C, v[i], v[i + 1], ds, a); }
    else { v[i + 1] = R.v; ut = R.ut; dts[i] = R.t; }
  }
  uT[N - 1] = ut;
  const vf = C.drv ? v.slice() : null;
  for (let i = N - 2; i >= 0; i--) {                      // 뒤로: 제동
    const b = C.aBrake(v[i + 1], G.k[i]);
    const vb = Math.sqrt(v[i + 1] * v[i + 1] + 2 * b * (G.s[i + 1] - G.s[i]));
    if (vb < v[i]) { v[i] = vb; dts[i] = NaN; if (i > 0) dts[i - 1] = NaN; }
  }
  if (C.drv) brakeRamp(C, G, v, vf, uT, dts, V0, TM, TI);   // 현실 운전자: 제동 신호를 PEDT 동안 올림 → 제동 시작이 앞으로
  if (C.lam > 0) coastLift(C, G, v, V0, TM, TI);          // 타력 운전자: 제동 앞에서 페달을 뗌
  v.dt = dts;                                             // 신호가 오르는 칸은 시간 적분으로 구한 칸 시간 (walk 가 씀)
  return { v, lim };
}
// 페달 신호를 PEDT 에 걸쳐 바꾸며 거리 ds 를 감 (시간으로 적분, 칸 안에서 가속 · 제동 능력은 일정):
//   가속도 = a_r + u_t (a_d − a_r) − u_b (d_b + a_r)  (a_r = 주행 저항만의 가속도 ≤ 0, a_d = 최대 구동 가속도, d_b = 최대 제동 감속도 > 0),
//   u_t 는 dir 쪽으로 (+1 오름 · −1 내림) 1 ÷ PEDT 속도, u_b 는 ub0 에서 1 까지 오름 (ub0 < 0 이면 제동 안 함)
//   돌려줌: 끝 속도 v, 걸린 시간 t, 끝 신호 ut · ub
function pedalRun(v0, ut0, ub0, A, ds) {
  const [ar, ad, db] = A, r = 1 / PEDT;
  let v = v0, x = 0, t = 0, ut = ut0, ub = ub0;
  const acc = (u, w) => ar + u * (ad - ar) - (w > 0 ? w * (db + ar) : 0);
  for (let it = 0; it < 4000 && x < ds - 1e-12; it++) {
    const tu = ub0 >= 0 ? Math.max(ut, 1 - Math.max(0, ub)) / r : (1 - ut) / r;            // 신호가 다 바뀌기까지 남은 시간
    if (tu <= 1e-12) { const a = acc(ub0 >= 0 ? 0 : 1, ub0 >= 0 ? 1 : 0), rem = ds - x, v2 = v * v + 2 * a * rem;   // 남은 칸은 일정 가속도
      if (v2 <= 0) { const tt = a < 0 ? v / -a : 0; return { v: 0, t: t + tt, ut: ub0 >= 0 ? 0 : 1, ub: ub0 >= 0 ? 1 : ub0, x: x + v * v / (2 * Math.max(1e-9, -a)) }; }
      const vn = Math.sqrt(v2); return { v: vn, t: t + (Math.abs(a) > 1e-12 ? (vn - v) / a : rem / Math.max(1e-9, v)), ut: ub0 >= 0 ? 0 : 1, ub: ub0 >= 0 ? 1 : ub0, x: ds }; }
    if (v <= 1e-9 && acc(ut, ub) <= 0 && ub0 < 0) { const h = Math.min(tu, PEDT / 50); t += h; ut = Math.min(1, ut + r * h); continue; }   // 정지: 구동이 저항을 넘을 때까지 그 자리 (뒤로 밀리지 않음)
    const h = Math.min(tu, PEDT / 50), a0 = acc(ut, ub), j = (acc(ub0 >= 0 ? Math.max(0, ut - r * h) : Math.min(1, ut + r * h), ub0 >= 0 ? Math.min(1, ub + r * h) : ub) - a0) / h;   // 이 작은 칸 동안 가속도는 시간에 직선 (저크 j)
    const X = q => v * q + a0 * q * q / 2 + j * q * q * q / 6, V = q => v + a0 * q + j * q * q / 2;
    let q = h; if (x + X(h) >= ds) { let lo = 0, hi = h; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (x + X(m) < ds) lo = m; else hi = m; } q = hi; }
    if (V(q) < 0) { let lo = 0, hi = q; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (V(m) > 0) lo = m; else hi = m; } return { v: 0, t: t + lo, ut, ub, x: x + X(lo) }; }   // 섬
    x += X(q); v = V(q); t += q;
    if (ub0 >= 0) { ut = Math.max(0, ut - r * q); ub = Math.min(1, ub + r * q); } else ut = Math.min(1, ut + r * q);
  }
  return { v, t, ut, ub, x };
}
// 코너 한계 등으로 막힌 칸: 그 속도를 내는 데 쓴 가속 신호 몫 (0 ~ 1) — 그 뒤로는 여기서부터 다시 오름
function pedalNeed(C, v0, v1, ds, ad) { const ar = -C.Fres(v0) / C.meff, aq = (v1 * v1 - v0 * v0) / (2 * ds); return ad - ar > 1e-9 ? Math.max(0, Math.min(1, (aq - ar) / (ad - ar))) : 1; }
// 제동 구간마다 (뒤 → 앞 제동이 앞 → 뒤 가속 곡선을 낮춘 곳) 시작점 s_on 을 앞당김: s_on 에서 가속 신호는 내려가고 제동 신호는 0 → 1 (PEDT),
//   다 오른 점의 속도가 제동 한계 곡선 이하가 되는 가장 늦은 s_on (이분법). 그 뒤는 원래 제동 곡선 (최대 제동끼리는 아래 곡선이 계속 아래)
function brakeRamp(C, G, v, vf, uT, dts, V0, TM, TI) {
  const N = v.length, inZ = i => v[i] < vf[i] - 1e-9;
  let i = 1, prevEnd = 0;
  while (i < N) {
    if (!inZ(i)) { i++; continue; }
    let i1 = i; while (i1 + 1 < N && inZ(i1 + 1)) i1++;
    const j0 = i - 1;                                     // 제동 없이 온 마지막 점 (원래 제동은 j0 ~ i 사이에서 시작)
    if (j0 < prevEnd || (prevEnd > 0 && j0 === prevEnd)) { prevEnd = i1; i = i1 + 1; continue; }   // 앞 제동 구간에 바로 이어짐 → 제동 신호가 이미 올라 있음
    const sim = (sOn, rec) => {                            // sOn 에서 시작해 신호가 다 바뀔 때까지 앞으로. 끝 점 (속도 − 제동 곡선) 과 지나간 점 속도
      let k = prevEnd; while (k < i - 1 && G.s[k + 1] <= sOn) k++;
      const f = (sOn - G.s[k]) / Math.max(1e-9, G.s[k + 1] - G.s[k]), vs = Math.sqrt(Math.max(0, vf[k] ** 2 + (vf[k + 1] ** 2 - vf[k] ** 2) * f));
      let x = sOn, vv = vs, ut = uT[k], ub = 0, out = [], T = 0;
      for (let q = k; q < N - 1; q++) {
        const s1 = G.s[q + 1], ds = s1 - x; if (ds <= 1e-12) continue;
        const ar = -C.Fres(vv) / C.meff, ad = Math.max(ar, C.aDrive(vv, G.k[q], 0, V0[q], TM ? TM[q] : C.Tinit, TI ? TI[q] : C.TH0.i)), db = C.aBrake(vv, G.k[q]);
        const R = pedalRun(vv, ut, ub, [ar, ad, db], ds);
        T += R.t; vv = R.v; ut = R.ut; ub = R.ub; x = s1;
        if (rec) out.push([q + 1, vv, x - (G.s[q + 1] - G.s[q]) >= sOn - 1e-9 ? R.t : NaN]);
        if (ub >= 1 || vv <= 0) return { d: vv - v[q + 1], out, q: q + 1 };
      }
      return { d: -1, out, q: N - 1 };
    };
    let lo = G.s[prevEnd], hi = G.s[i];
    if (sim(hi).d > 0) { if (sim(lo).d > 0) hi = lo; else for (let it = 0; it < 50; it++) { const m = (lo + hi) / 2; if (sim(m).d > 0) hi = m; else lo = m; } hi = Math.min(hi, lo); }
    const R = sim(hi, true);
    if (R.out.every(o => o[1] > 0)) R.out.forEach(([q, vv, t]) => { if (vv < v[q]) { v[q] = vv; dts[q - 1] = t; } else dts[q - 1] = NaN; });   // 멈춤까지 가는 시작점 (앞 제동과 겹침 등) 은 쓰지 않음
    for (let q = R.q; q < i1 && q < N - 1; q++) dts[q] = NaN;
    prevEnd = i1; i = i1 + 1;
  }
}
// 현실 운전자: 핸들 속도 상한 [m/s] (점마다). 핸들 각 h = h_기하(κ) + 조향비 × K_us × a_y ÷ g (모델 2 이상, 선형 언더스티어 구배 K_us [°/g]),
//   곡률은 다듬기 거리 (과도 다듬기 tr_ks) 로 고른 κ · κ' (kDer) →  v |κ'| (h'(κ) + 조향비 K_us v² ÷ g) ≤ HWR 를 v 에 대해 풂
function steerCap(C, G) {
  const D = kDer(G, C.ksT), N = G.s.length, out = new Array(N).fill(Infinity), B = C.md2 ? C.sr * C.kUs / g : 0;
  for (let i = 0; i < N; i++) { const kk = Math.abs(D.k0[i]), k1 = Math.abs(D.k1[i]); if (k1 < 1e-9) continue;
    const A = C.SG.hp(kk), f = u => u * k1 * Math.abs(A + (B > 0 ? B * u * u : 0)) - HWR;
    if (f(150) <= 0) continue; let lo = 0, hi = 150; for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (f(m) <= 0) lo = m; else hi = m; } out[i] = lo; }
  return out;
}

// ================================================================ 타력 운전자 (drv 1)
// 에너지 한도가 있는 최소 시간: 시간 + λ × 소비 에너지 를 최소로 (Pontryagin 최소 원리 → 최대 구동 · 타력 · 최대 제동).  λ [s/J] 는 내구 소비가 한도와 같아지게 (coastCut)
// 제동 구간마다 (가속이 끝나는 꼭대기 앞) 페달을 떼는 점 s_L 을 고름: 그 뒤는 구동 0 (구름 · 항력만으로 감속, dv²/ds = −2 F_res ÷ m_eff) → 원래 제동 곡선과 만나면 제동.
// 칸 안의 어느 점에서나 뗄 수 있음 (칸 끝 속도를 그 점부터 타력으로 셈) → λ 에 대해 연속.  구간마다 따로 고름 (모든 구간 같은 λ = 최적 조건)
function coastLift(C, G, v, V0, TM, TI) {
  const N = v.length, lam = C.lam, cost = new Array(N - 1);
  const cellE = (i, a, b) => { const ds = G.s[i + 1] - G.s[i], vm = Math.max(0.1, (a + b) / 2), ax = (b * b - a * a) / (2 * ds), F = C.meff * ax + C.Fres(vm);
    const E = C.elec(F, vm, V0[i], 1, ax, TM ? TM[i] : C.Tinit, TI ? TI[i] : C.TH0.i); return ds / vm + lam * V0[i] * E.I * ds / vm; };   // 시간 + λ × 소비 [s]
  for (let i = 0; i < N - 1; i++) cost[i] = cellE(i, v[i], v[i + 1]);
  // 타력 곡선: 칸 j 의 점 x (0 ~ 1) 에서 떼면 → {w: 바뀐 속도 (j+1 부터), d: 비용 변화}.  타력 칸은 구동 0 → 시간만 (에너지 0)
  const tryLift = (j, x) => {
    const ds0 = G.s[j + 1] - G.s[j], vL2 = v[j] * v[j] + (v[j + 1] * v[j + 1] - v[j] * v[j]) * x, w = [];
    let u2 = vL2 - 2 * C.Fres(Math.sqrt(Math.max(0, vL2))) / C.meff * ds0 * (1 - x);
    if (!(u2 < v[j + 1] * v[j + 1]) || u2 <= 0.25) return { w, d: 0 };
    let u = Math.sqrt(u2), d = cellE(j, v[j], u) - cost[j], k = j + 1;   // 떼는 칸: 앞쪽 가속 + 뒤쪽 타력 (칸 전체를 한 번에)
    w.push(u);
    while (k < N - 1) {
      const ds = G.s[k + 1] - G.s[k], n2 = u * u - 2 * C.Fres(u) / C.meff * ds;
      if (n2 >= v[k + 1] * v[k + 1]) { d += cellE(k, u, v[k + 1]) - cost[k]; return { w, d }; }   // 원래 제동 곡선과 만남
      if (n2 <= 0.25) return { w: [], d: Infinity };                  // 멈춰 버림 → 쓰지 않음
      const un = Math.sqrt(n2); d += 2 * ds / (u + un) - cost[k]; u = un; w.push(u); k++;
    }
    return { w, d };
  };
  let i = 1;
  while (i < N - 1) {
    if (!(v[i] > v[i - 1] && v[i] > v[i + 1])) { i++; continue; }    // 꼭대기 i (가속 → 제동)
    let a0 = i; while (a0 > 0 && v[a0] > v[a0 - 1]) a0--;              // 가속 시작
    const j0 = Math.max(a0, i - 600), st = Math.max(1, Math.floor((i - j0) / 24));   // 성기게 훑고 (약 24 점) 가장 좋은 곳 둘레를 황금 분할 (칸 안의 점까지)
    let best = { d: 0, j: -1, w: null };
    for (let j = j0; j < i; j += st) { const R = tryLift(j, 0); if (R.d < best.d) best = { d: R.d, j, w: R.w }; }
    if (best.j >= 0) {
      let lo = Math.max(j0, best.j - st), hi = Math.min(i, best.j + st);   // 위치 p = 칸 번호 + x
      const f = p => { const j = Math.min(i - 1, Math.floor(p)); return tryLift(j, p - j); };
      for (let it = 0; it < 24; it++) { const p1 = lo + (hi - lo) * 0.382, p2 = lo + (hi - lo) * 0.618; if (f(p1).d < f(p2).d) hi = p2; else lo = p1; }
      const p = (lo + hi) / 2, Rb = f(p); if (Rb.d < best.d) best = { d: Rb.d, j: Math.min(i - 1, Math.floor(p)), w: Rb.w };
      for (let q = 0; q < best.w.length; q++) v[best.j + 1 + q] = best.w[q];
      const e = best.j + 1 + best.w.length; for (let q = best.j; q < Math.min(N - 1, e + 1); q++) cost[q] = cellE(q, v[q], v[q + 1]);
      i = e + 1;
    } else i++;
  }
}

// 차속 → 누적 시간 [s] · 단자 에너지 et [J] · 소비 에너지 ec [J] (저항 손실 포함) · 모터 온도 tm [°C] (출발 T0).  rec 이면 그래프 신호도
//   T0 = 출발 온도 {m, w, b} (모터 · 냉각수 · 축전지, 숫자면 모터만) [°C]
const th0 = (C, T0) => T0 == null ? { ...C.TH0 } : typeof T0 === 'number' ? { ...C.TH0, m: T0 } : { ...T0 };
function walk(C, G, v, V0, rec, T0) {
  const t0 = th0(C, T0), N = v.length, tc = [0], et = [0], ec = [0], tm = [t0.m], ti = [t0.i], tw = [t0.w], tb = [t0.b], tx = [t0.x];
  let qm = 0, qi = 0, qb = 0, tq = 0, er = 0;   // 손실 · 발열 시간 적분 [J] (도구 9 냉각 계통 계산기에 넘길 평균 발열), 그 시간 [s]
  const S = rec ? { pw: [], ax: [], ay: [], rpm: [], tq: [], tlim: [], pbat: [], vbat: [], voc: [], eta: [], tmot: [], grip: [],
                    roll: [], tcool: [], tbat: [], tinv: [], fz_fl: [], fz_fr: [], fz_rl: [], fz_rr: [], af: [], ar: [], beta: [], sw: [], dw: [], sat: [], dst: [] } : null;
  let vmin = Infinity;
  for (let i = 0; i < N - 1; i++) {
    const ds = G.s[i + 1] - G.s[i], vm = (v[i] + v[i + 1]) / 2, dt = v.dt && Number.isFinite(v.dt[i]) ? v.dt[i] : vm > 0 ? ds / vm : Infinity;   // 페달 신호가 바뀌는 칸은 speed 가 적분한 시간
    const ax = (v[i + 1] * v[i + 1] - v[i] * v[i]) / (2 * ds);   // 종가속도 [m/s²]
    const F = C.meff * ax + C.Fres(vm);                            // 바퀴 힘 [N] (제동 중 −)
    const sc = V0.soc ? V0.soc[i] : 1;                             // 그 칸 SOC (셀 표 내부저항용)
    const E = C.elec(F, vm, V0[i], C.rS(tb[i], sc), ax, tm[i], ti[i]);
    tc.push(tc[i] + dt);
    et.push(et[i] + E.P * dt);
    ec.push(ec[i] + V0[i] * E.I * dt);
    if (E.I < 0 && isFinite(dt)) er -= V0[i] * E.I * dt;          // 회생으로 셀에 돌려준 에너지 [J]
    const st = C.thStep({ m: tm[i], i: ti[i], w: tw[i], b: tb[i], x: tx[i] }, E.L, E.Li, E.I, vm, isFinite(dt) ? dt : 0, sc);   // 온도: 손실로 오르고 냉각으로 내림
    tm.push(st.m); ti.push(st.i); tw.push(st.w); tb.push(st.b); tx.push(st.x);
    if (isFinite(dt)) { qm += E.L * dt; qi += E.Li * dt; qb += E.I * E.I * C.Rb * C.rS(tb[i], sc) * dt; tq += dt; }
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
      S.tlim.push(C.Tcurve(C.rpm(v[i]), V0[i], tm[i], ti[i]));   // 그 순간 토크 한계 (디레이팅 포함) [N·m]
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
        S.af.push(sg * F.a); S.ar.push(sg * Rr.a); S.beta.push(sg * be * 180 / Math.PI); S.dw.push(sg * dl * 180 / Math.PI); S.sw.push(sg * (C.SG.hOf(K) + (F.a - Rr.a) * C.sr)); /* 핸들 각 = 기하 (도구 6 표 또는 조향비 × 자전거 각) + 조향비 × 슬립각 차 */ S.sat.push(F.sat || Rr.sat ? 1 : 0); S.dst.push(C.vFlag(G.k[i])); }
      else { S.af.push(NaN); S.ar.push(NaN); S.beta.push(NaN); S.dw.push(NaN); S.sw.push(NaN); S.sat.push(0); S.dst.push(0); }
    }
  }
  if (rec) for (const k in S) S[k].push(S[k][S[k].length - 1]);
  return { tc, et, ec, tm, ti, tw, tb, tx, S, vmin, er, Q: { m: qm, i: qi, b: qb, t: tq }, T1: { m: tm.at(-1), i: ti.at(-1), w: tw.at(-1), b: tb.at(-1), x: tx.at(-1) } };
}

// 랩 m개를 이어서 정지 출발.  랩마다 SOC → 개방 전압, 칸마다 모터 온도 (두 번: 처음은 출발 값 그대로, 다음은 앞 계산으로 고침)
//   fixedV 를 주면 전압 고정 (SOC 계산 안 함, 줄여 셈).  T0 = 출발 모터 온도 [°C]
function laps(C, segs, m, ds, soc0, fixedV, T0) {
  const P = grid(segs, ds).s.length - 1, rep = [];
  for (let j = 0; j < m; j++) rep.push(...segs);
  const G = grid(rep, ds), N = G.s.length, t0 = th0(C, T0);
  { const T = TRC.get(segKey(segs)), B = bdAt(segs); if (T || B) G.vcap = G.s.map(x => Math.min(T ? T.at(x) : Infinity, B ? B(x) : Infinity)); }   // 모델 3 과도 · 모델 2 이상 차체가 경계에 닿지 않게 정한 속도 상한 (랩 위치마다)
  let V0 = new Array(N).fill(fixedV || C.Voc(soc0, t0.b)), TM = null, TI = null, sp, W, socs = [], soc1 = soc0;
  V0.soc = new Array(N).fill(fixedV ? 1 : soc0);
  const passes = fixedV && !C.drOn ? 1 : 2;              // 디레이팅이 있으면 온도를 반영해 한 번 더
  for (let pass = 0; pass < passes; pass++) {
    sp = speed(C, G, V0, TM, TI);
    W = walk(C, G, sp.v, V0, false, t0);
    if (C.drOn) { TM = W.tm; TI = W.ti; }
    if (fixedV) continue;
    socs = [];
    let soc = soc0;
    for (let j = 0; j < m; j++) { socs.push(soc); soc -= (W.ec[(j + 1) * P] - W.ec[j * P]) / C.EpackAt(W.tb[j * P]); }   // 랩 시작 축전지 온도의 용량
    soc1 = soc;
    const sP = G.s.map((_, i) => socs[Math.min(m - 1, Math.floor(i / P))]);
    V0 = G.s.map((_, i) => C.Voc(sP[i], W.tb[i])); V0.soc = sP;
  }
  const t = [], Et = [], Ec = [];                         // 랩별 시간 [s] · 단자 에너지 [J] · 소비 [J]
  for (let j = 0; j < m; j++) {
    t.push(W.tc[(j + 1) * P] - W.tc[j * P]);
    Et.push(W.et[(j + 1) * P] - W.et[j * P]);
    Ec.push(W.ec[(j + 1) * P] - W.ec[j * P]);
  }
  if (fixedV) soc1 = soc0 - Ec.reduce((a, b) => a + b, 0) / C.EpackAt(t0.b);
  return { G, v: sp.v, lim: sp.lim, V0, TM: W.tm, TI: W.ti, TW: W.tw, TB: W.tb, TX: W.tx, T0: t0, P, t, Et, Ec, socs, vmin: W.vmin, soc1, T1: W.T1, Q: W.Q, Er: W.er, len: G.s.at(-1) };
}

const sum = a => a.reduce((x, y) => x + y, 0);


// ================================================================ 차량 모델 3: 과도 — 주행선을 그대로 따라가는 데 드는 타이어 힘 (역동역학, 이상적인 운전자)
//   경로 곡률 κ(s) (다듬기 길이 tr_ks [m] 로 고르게), 준정적 차속 v(s) → 요레이트 r = v κ, 요 가속도 ṙ = dr/dt (차체 각도 변화율은 무시)
//   축 횡력 (요 관성 포함): F_f = (m a_y l_r + I_z ṙ) ÷ L,  F_r = (m a_y l_f − I_z ṙ) ÷ L   (l_f = 무게중심 → 앞축, l_r = 무게중심 → 뒤축, a_y = v² κ)
//   이완 길이 σ: 타이어 힘이 슬립각을 늦게 따라오므로 슬립각이 만들어야 하는 힘 F_ss = F + (σ ÷ v) dF/dt
//   한계: 축마다 마찰 타원 u = (F_x ÷ N_x)² + (F_ss ÷ N_y)² (준정적 종 방향 힘 · 모델 2 횡 한계),  모델 2 조향 (안쪽 바퀴 = 기하 + α_f − α_r, α = 같은 슬립각 축 곡선의 역)
//   과도 때문에 정상(ṙ = 0, dF/dt = 0) 보다 더 쓰게 되는 점 (u > max(1, u_정상)) 은 속도 상한 = v × (max(1, u_정상) ÷ u)^¼ × 0.995 (힘 ∝ v²) 로 낮추고 준정적을 다시 (되풀이)
//   닫힌 코스는 두 바퀴 (정지 출발 + 이어 달린 바퀴) 로 보고 상한은 랩 위치마다 작은 값
const TR_IT = 40, TR_TOL = 0.01;   // 과도 되풀이 최대 수 · 정상보다 1 % 넘게 더 쓸 때만 (미분 수치 오차 범위)
let TRC = new Map(), TRC_LAST = { key: '', m: new Map(), info: {} }, TRI = {};
const segKey = segs => { let h = 0, w = 0; for (let i = 0; i < segs.length; i++) { const [l, R] = segs[i]; h += l * (1 + i % 7) + (R || 0) * 1e-3 * (1 + i % 13); w += l; } return \`\${segs.length}|\${w.toFixed(6)}|\${h.toFixed(6)}\`; };
// 한 점: 차속 u · 종가속도 ax · 횡가속도 ay (부호 있음) · 축 횡력 F_f, F_r [N] 과 시간 미분 [N/s] → 슬립각이 만들어야 하는 힘 · 마찰 타원 사용 (과도 uT, 정상 uS)
function trPoint(C, sig, u, ax, ay, Ff, Fr, dFf, dFr) {
  const aY = Math.abs(ay), m = C.m, L = C.L, lf = L * (1 - C.fs), lr = L * C.fs;
  const Fsf = Ff + (sig > 0 ? sig / u * dFf : 0), Fsr = Fr + (sig > 0 ? sig / u * dFr : 0);
  const Nxf = C.capF(u, ax, aY), Nxr = C.capR(u, ax, aY), Nyf = C.capFy(u, ax, aY), Nyr = C.capRy(u, ax, aY);
  let Fxf = 0, Fxr = 0;
  if (ax >= 0) Fxr = C.meff * ax + C.Fres(u); else { const Fb = Math.max(0, -C.meff * ax - C.Fres(u)); Fxf = Fb * Nxf / Math.max(1e-9, Nxf + Nxr); Fxr = Fb - Fxf; }   // 제동은 축 한계 비율로 나눔
  const U = (Fx, Nx, Fy, Ny) => (Fx / Math.max(1e-9, Nx)) ** 2 + (Fy / Math.max(1e-9, Ny)) ** 2;
  return { Fsf, Fsr, uT: Math.max(U(Fxf, Nxf, Fsf, Nyf), U(Fxr, Nxr, Fsr, Nyr)), uS: Math.max(U(Fxf, Nxf, m * ay * lr / L, Nyf), U(Fxr, Nxr, m * ay * lf / L, Nyr)) };
}
function trCaps(I, C, segs, closed, V) {
  const ds = 0.5, P = grid(segs, ds), len = P.s.at(-1), NP = P.s.length, Dg = Math.PI / 180;
  const nl = closed ? 2 : 1, rep = []; for (let j = 0; j < nl; j++) rep.push(...segs);
  const G = grid(rep, ds), N = G.s.length, Bc = bdAt(segs), cap = P.s.map(x => Bc ? Bc(x) : Infinity);   // 차체 경계 상한에서 출발
  const sig = Math.max(0, I.tire_relax || 0), Iz = Math.max(0, Number.isFinite(I.izz) ? I.izz : 70), ks = I.tr_ks > 0 ? I.tr_ks : 2;
  const m = C.m, L = C.L, lf = L * (1 - C.fs), lr = L * C.fs;
  // 곡률을 점마다 (구간 k[i] 는 i → i+1) 고르게: 앞뒤 ks/2 이동 평균
  const k0 = G.s.map((_, i) => (G.k[Math.max(0, i - 1)] + G.k[Math.min(N - 2, i)]) / 2), W = Math.max(0, Math.round(ks / 2 / ds));
  const kS = k0.map((_, i) => { let a = 0, n = 0; for (let q = -W; q <= W; q++) { let j = i + q; if (closed) j = ((j % (N - 1)) + (N - 1)) % (N - 1); if (j < 0 || j >= N) continue; a += k0[j]; n++; } return a / n; });
  const lapJ = i => closed ? i % (NP - 1) : Math.min(i, NP - 1);
  const at = x => { x = closed ? ((x % len) + len) % len : Math.max(0, Math.min(len, x)); let lo = 0, hi = NP - 1; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (P.s[md] <= x) lo = md; else hi = md; } return Math.min(cap[lo], cap[hi]); };
  const lapT = v => { let t = 0; const i0 = closed ? NP - 1 : 0; for (let i = i0; i < N - 1; i++) t += (G.s[i + 1] - G.s[i]) / Math.max(1e-3, (v[i] + v[i + 1]) / 2); return t; };   // 닫힌 코스 = 두 번째 바퀴
  const V0 = new Array(N).fill(V);
  let it = 0, sp = null, t0 = NaN, qmax = 0, bad = 0;
  for (; it <= TR_IT; it++) {
    sp = speed(C, { s: G.s, k: G.k, vcap: G.s.map((x, i) => cap[lapJ(i)]) }, V0, null);
    const v = sp.v; if (it === 0) t0 = lapT(v);
    const T = [0]; for (let i = 0; i < N - 1; i++) T.push(T[i] + (G.s[i + 1] - G.s[i]) / Math.max(0.3, (v[i] + v[i + 1]) / 2));
    const r = v.map((u, i) => u * kS[i]), Wd = Math.max(1, W), d = (a, i) => { const p = Math.min(N - 1, i + Wd), q = Math.max(0, i - Wd); return (a[p] - a[q]) / Math.max(1e-6, T[p] - T[q]); };   // 시간 미분 (다듬기 길이 폭의 중심 차분)
    const ay = v.map((u, i) => u * u * kS[i]), rd = r.map((_, i) => d(r, i));
    const Ff = ay.map((a, i) => (m * a * lr + Iz * rd[i]) / L), Fr = ay.map((a, i) => (m * a * lf - Iz * rd[i]) / L);
    bad = 0; qmax = 0;
    for (let i = 0; i < N - 1; i++) {
      const u = Math.max(0.5, v[i]), axi = (v[i + 1] ** 2 - v[i] ** 2) / (2 * (G.s[i + 1] - G.s[i])), aY = Math.abs(ay[i]);
      const { uT, uS, Fsf, Fsr } = trPoint(C, sig, u, axi, ay[i], Ff[i], Fr[i], d(Ff, i), d(Fr, i));
      const lim = Math.max(1, uS);
      if (uS > 0.25) qmax = Math.max(qmax, Math.sqrt(uT / uS));
      let f = uT > lim * (1 + TR_TOL) ? Math.pow(lim / uT, 0.25) : 1;
      if (C.dmx > 0 && Math.abs(kS[i]) > 1e-9) {                                                                   // 조향: 과도 슬립각으로 안쪽 바퀴 각
        const sg = Math.sign(kS[i]), [fo, fi] = C.wheels(C.Fzf(u, axi), C.dF(aY, true)), [ro, ri] = C.wheels(C.Fzr(u, axi), C.dF(aY, false));
        const af = Math.sign(Fsf * sg) * C.slipA(fo, fi, Math.abs(Fsf)).a, ar = Math.sign(Fsr * sg) * C.slipA(ro, ri, Math.abs(Fsr)).a;
        if (C.dIn0(kS[i]) + af - ar > C.dmx + 1e-6) f = Math.min(f, 0.97);
      }
      if (f < 1) { bad++; const c = Math.max(0.5, u * f * 0.995); for (let q = -Wd; q <= Wd; q++) { const ii = i + q; if (ii < 0 || ii >= N) continue; const j = lapJ(ii); cap[j] = Math.min(cap[j], c); } }   // 이웃까지 같은 상한 (꺾임 줄임)
    }
    if (!bad) break;
  }
  let capd = 0; for (let j = 0; j < NP - 1; j++) if (cap[j] < (Bc ? Bc(P.s[j]) : Infinity)) capd += P.s[j + 1] - P.s[j];   // 과도로 (차체 상한보다 더) 낮춘 거리
  return { at, info: { it: Math.min(it, TR_IT), ok: bad ? 0 : 1, len: capd, q: (qmax - 1) * 100, dt: lapT(sp.v) - t0 } };
}
// 모델 3: 내구 · 오토크로스 · 내 코스의 과도 상한을 정해 둠 (입력 감속비 · 만충 전압, 같은 입력이면 다시 안 함). 가속 · 스키드패드는 조향이 바뀌지 않아 뺌
function prepTrans(I, sweep) {
  TRC = new Map(); TRI = {};
  if (I.md !== 3) return;
  if (sweep) { TRC = TRC_LAST.m; TRI = TRC_LAST.info; return; }
  const key = rlKey(I);
  if (TRC_LAST.key === key) { TRC = TRC_LAST.m; TRI = TRC_LAST.info; return; }
  const C = car(I, I.gr, 1), V = C.Voc(1), E = I.end || {}, jobs = [];
  if ((E.seg || []).length) jobs.push(['end', '내구', () => drivenSegs(I, 'end', E.seg, true).segs, true], ['ax', '오토크로스', () => drivenSegs(I, 'ax', reverse(E.seg), true).segs, false]);
  { const F = freeSegs(I); if (F && F.segs.length) jobs.push(['free', '내 코스', () => F.segs, F.m > 1]); }
  jobs.forEach(([w, name, segsF, closed], k) => { prog(PG0 + (1 - PG0) * 0.02 * k, \`과도 (요 관성 · 타이어 이완) 반영 중 · \${name}\`);
    const segs = segsF(), Cw = (w === 'end' || (w === 'free' && I.free && I.free.end === 1)) && I.dr_real === 1 ? car(endI(I), I.gr, 1) : C, R = trCaps(I, Cw, segs, closed, V); TRC.set(segKey(segs), R); TRI[w] = R.info; });
  TRC_LAST = { key, m: TRC, info: TRI };
}
// 모델 2 이상 · 최대 조향각이 있을 때: 아주 느려도 안쪽 바퀴 조향각이 최대를 넘는 코너가 있으면 계산을 멈춤 (다시 설계)
function steerCheck(I) {
  if (!(I.md >= 2) || I.dl_on === 0) return;
  const C = car(I, I.gr, 1), E = I.end || {}, list = [];
  if ((E.seg || []).length) list.push(['내구', drivenSegs(I, 'end', E.seg, true).segs], ['오토크로스', drivenSegs(I, 'ax', reverse(E.seg), true).segs]);
  { const F = freeSegs(I); if (F) list.push(['내 코스', F.segs]); }
  list.push(['스키드패드', skidSegs(skR(I, C))]);
  for (const [name, segs] of list) { let s0 = 0;
    for (const [l, R] of segs) { if (R && C.dIn0(1 / R) > C.dmx + 1e-6)
      throw new Error(\`\${name} \${wbN(s0)} m 지점 (반경 \${Math.abs(R).toFixed(2)} m): 아주 느리게 돌아도 안쪽 바퀴를 \${C.dIn0(1 / R).toFixed(1)}° 꺾어야 해서 최대 조향각 \${C.dmx}° 로는 돌 수 없습니다. 조향 (최대 조향각 · 휠베이스)을 다시 설계하십시오\${I.rm_on === 0 ? ' (또는 최소 회전 반경 제약을 켜서 주행선을 그 반경 안으로)' : \` (주행선은 최소 회전 반경 \${I.rmin} m 까지 휨 — 이 반경이 최대 조향각과 맞는지도 확인)\`}.\`);
      s0 += l; } }
}
const wbN = x => Math.round(x).toLocaleString('en-US');


// ================================================================ 종목
const ACC_L = 75;               // 가속 구간 [m]
const SK_R  = 9.125;            // 스키드패드 주행로 가운데 반경 [m] = 안쪽 원 7.625 + 주행로 폭 절반 1.5 (FSAE D.10.1: 안쪽 지름 15.25 · 바깥 21.25 · 폭 3.0 m)
const SK_RI = 7.625, SK_RO = 10.625;   // 안쪽 원 · 바깥 원 반경 [m]
const SK_IN = 15;               // 스키드패드 진입 · 탈출 직선 [m] (근사)
const SK_C  = 2 * Math.PI * SK_R;
const skidSegs = R => { const c = 2 * Math.PI * R; return [[SK_IN, 0], [c, -R], [c, -R], [c, R], [c, R], [SK_IN, 0]]; };   // 오른쪽 2바퀴 → 왼쪽 2바퀴
const SKID  = skidSegs(SK_R);
/* 스키드패드 주행 반경 (2026-11-11, 다른 코스와 같은 주행선 규칙): 중심 라인 = 9.125, 최소 곡률 = 바깥 끝, 레코드 = 주행로 안에서 한 바퀴 시간 2πR ÷ v(R) 가 가장 짧은 반경.
   주행로 안: 안쪽 R − 차 폭/2 ≥ 7.625 + 여유, 바깥 차 모서리 √((R + 폭/2)² + x²) ≤ 10.625 − 여유 (x = CG 에서 차 앞 · 뒤 끝 중 먼 쪽, 차 크기 고려일 때). 차 크기 고려 안 함 = 차 중심이 경계에서 rl_b */
function skR(I, C) { const rl = I.rl_on >= 2 ? 2 : I.rl_on >= 1 ? 1 : 0; if (rl === 0 || I.sk_mid === 1) return SK_R;   // sk_mid = 도구 G (스키드패드는 늘 가운데 9.125 m)
  let rin, rout;
  if (wcOn(I)) { const w = I.w_car / 2, mg = Math.max(0, I.rl_m || 0), L = I.L / 1000, lr = L * I.fr / 100, x = Math.max(L - lr + Math.max(0, I.oh_f || 0), lr + Math.max(0, I.oh_r || 0));
    rin = SK_RI + mg + w; const o = SK_RO - mg; rout = o > x ? Math.sqrt(o * o - x * x) - w : -Infinity; }
  else { const b = Math.max(0, I.rl_b || 0); rin = SK_RI + b; rout = SK_RO - b; }
  if (!(rout >= rin)) throw new Error(\`스키드패드 주행로 (폭 3 m) 에 차가 들어가지 않습니다 (안쪽 \${rin.toFixed(2)} m > 바깥 \${rout.toFixed(2)} m). 차 폭 · 길이 · 여유를 확인하세요.\`);
  if (rl === 1) return rout;
  const t = R => R / skidV(C, R, C.Voc(1));   // 한 바퀴 시간 ÷ 2π
  let a = rin, b = rout; const gr = (Math.sqrt(5) - 1) / 2; let x1 = b - gr * (b - a), x2 = a + gr * (b - a), f1 = t(x1), f2 = t(x2);
  for (let i = 0; i < 40 && b - a > 1e-6; i++) { if (f1 <= f2) { b = x2; x2 = x1; f2 = f1; x1 = b - gr * (b - a); f1 = t(x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + gr * (b - a); f2 = t(x2); } }
  const rm = (a + b) / 2, ends = [[rin, t(rin)], [rout, t(rout)], [rm, t(rm)]].sort((p, q) => p[1] - q[1]); return ends[0][0]; }
const W_PT  = { acc: 100, ax: 200, end: 350 };   // 감속비 제안에 쓰는 배점 (스키드패드는 감속비와 거의 상관없어 뺌)

// 가속: 75 m 정지 출발, SOC 100 %  → 시간 [s]
// 현실 운전자: 내구는 I 에 __end (k_s × k_e), 가속은 __acc (배율 없음)
const endI = I => I.dr_real === 1 ? { ...I, __end: 1 } : I, accI = I => I.dr_real === 1 ? { ...I, __acc: 1 } : I;
function runAcc(C) {
  const G = grid([[ACC_L, 0]], 0.5), V = new Array(G.s.length).fill(C.Voc(1)), sp = speed(C, G, V, null), W = walk(C, G, sp.v, V, false);
  const Ec = W.ec.at(-1);
  return { G, v: sp.v, lim: sp.lim, V0: V, TM: W.tm, TI: W.ti, TW: W.tw, TB: W.tb, TX: W.tx, T0: { ...C.TH0 }, P: G.s.length - 1, t: [W.tc.at(-1)], Et: [W.et.at(-1)], Ec: [Ec], socs: [1],
           soc1: 1 - Ec / C.EpackAt(C.TH0.b), T1: W.T1 };
}

// 스키드패드: 일정 반경 R [m] 에서 가장 빠른 일정 차속 [m/s] (앞축 횡력 · 뒤축 마찰원 · 모터 힘) → 이분법
//   R 부호 = 방향 (+ 왼쪽 · − 오른쪽). 지금 모델은 좌우 대칭이라 같은 값 (좌우 무게 배분은 나중에)
function skidV(C, R, V0) {
  R = Math.abs(R);
  const m = C.m, fs = C.fs;
  const ok = v => {
    const ay = v * v / R, Fx = C.Fres(v);
    if (C.drive(v, V0, C.Tinit).F < Fx) return false;
    if (m * ay * fs > C.capFy(v, 0, ay) + 1e-9) return false;
    if (C.dmx > 0 && C.dReq(v, 1 / R) > C.dmx) return false;     // 모델 2: 조향 한계
    const N = C.capR(v, 0, ay), Ny = C.capRy(v, 0, ay);
    return Ny > 0 && (m * ay * (1 - fs) / Ny) ** 2 + (Fx / N) ** 2 <= 1;
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
    return { T: sum(t), Et: sum(et), Ec: sum(ec), Er: A.Er + B.Er, A, B, n, n1, t, et, ec, soc: [...A.socs, ...B.socs], soc1: B.soc1, vmin: Math.min(A.vmin, B.vmin), Q };
  }
  const Vm = C.Voc(1 - 0.5 * Math.min(1, C.Ecap / C.Epack));
  const L3 = laps(C, segs, 3, ds, 1, Vm);
  const st = (k, a) => k <= 0 ? 0 : k === 1 ? a[0] : a[0] + (k - 2) * a[1] + a[2];   // 첫 랩 + 중간 랩 × (k−2) + 끝 랩
  return { T: st(n1, L3.t) + st(n2, L3.t), Et: st(n1, L3.Et) + st(n2, L3.Et), Ec: st(n1, L3.Ec) + st(n2, L3.Ec), n, n1 };
}

// 내구 에너지 제한: 소비가 쓸 수 있는 에너지를 넘으면 단자 출력 상한 배율 k 를 찾음 (할선법, 줄여 셈)
function powerCut(I, gr) {
  I = endI(I);
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

// 타력 운전자: 내구 소비가 한도와 같아지는 λ [s/J] (λ 가 클수록 일찍 뗌 → 소비 줄어듦).  줄여 셈으로 로그 이분법, full 이면 다 셈으로 할선 몇 번 더
//   타력만으로 한도에 못 미치면 (λ 최대에서도 넘음) 그 λ 에 출력 상한 배율을 더함
const LAM_MAX = 1;   // [s/J] = 3.6e6 s/kWh (사실상 끝까지 타력)
function coastCut(I, gr, full) {
  I = endI(I);
  const C1 = car(I, gr, 1), cap = C1.Ecap, E0 = endurance(I, C1, false, 3);
  if (!E0 || !(E0.Ec > cap)) return { lam: 0, k: 1 };
  const ec = (lam, f) => endurance(I, car(I, gr, 1, lam), f, f ? 1 : 3).Ec;
  let lo = 1e-9, hi = 1e-6;
  while (hi < LAM_MAX && ec(hi, false) > cap) { lo = hi; hi *= 8; }
  if (hi >= LAM_MAX && ec(LAM_MAX, false) > cap) return { lam: LAM_MAX, k: null };
  for (let i = 0; i < 18; i++) { const md = Math.sqrt(lo * hi); if (ec(md, false) > cap) lo = md; else hi = md; }
  let lam = hi;
  if (full) {                                                       // 다 셈: 로그 λ 에 대해 할선 (한도의 0.05 % 안으로)
    let l0 = Math.log(lam), e0 = ec(lam, true) - cap;
    if (Math.abs(e0) > 5e-4 * cap) {
      let l1 = l0 + (e0 > 0 ? 0.05 : -0.05), e1 = ec(Math.exp(l1), true) - cap;
      for (let i = 0; i < 6 && Math.abs(e1) > 5e-4 * cap; i++) { const l2 = l1 - e1 * (l1 - l0) / ((e1 - e0) || 1e-12); l0 = l1; e0 = e1; l1 = l2; e1 = ec(Math.exp(l1), true) - cap; }
      lam = Math.exp(l1);
    }
  }
  return { lam, k: 1 };
}

// 내구 (에너지 제한 포함). full 이면 줄여 셈과 다 셈의 차이를 한 번 더 맞춤.  drv 1 = 타력 운전자 (λ), 0 = 최대 운전자 (출력 상한 배율 k)
function runEnd(I, gr, full) {
  I = endI(I);
  const C = car(I, gr, 1);
  if (I.drv === 1 && isFinite(C.Ecap)) {
    const Q = coastCut(I, gr, full);
    let k = 1;
    if (Q.k === null) { const Ic = { ...I, drv: 0 }, C1 = car(I, gr, 1, Q.lam);   // 끝까지 타력해도 넘음 → 그 위에 출력 상한 배율
      const over = kk => endurance(I, car(I, gr, kk, Q.lam), false, 3).Ec - C1.Ecap; let a = 0.05, b = 1; for (let i = 0; i < 20; i++) { const md = (a + b) / 2; if (over(md) > 0) b = md; else a = md; } k = a; }
    const CE = car(I, gr, k, Q.lam), EN = endurance(I, CE, full, full ? 1 : 3);
    return EN ? { ...EN, k, lam: Q.lam, CE } : null;
  }
  let k = powerCut(I, gr), CE = k < 1 ? car(I, gr, k) : C, EN = endurance(I, CE, full, full ? 1 : 3);
  if (full && EN && EN.Ec > C.Ecap) {
    k *= Math.pow(C.Ecap / EN.Ec, 1.5);
    CE = car(I, gr, k);
    EN = endurance(I, CE, true, 1);
  }
  return EN ? { ...EN, k, lam: 0, CE } : null;
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
  if (I.dr_real === 1 && I.free && I.free.end === 1 && !I.__end) { I = endI(I); C = car(I, C.gr, 1); }   // 내 코스 [내구 주행]: 현실 운전자 k_s × k_e
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
const skidAy = E => (E.vR * E.vR * E.tR + E.vL * E.vL * E.tL) / (E.tR + E.tL) / (E.skR || SK_R) / g;
// 가속: 최대 종가속도 [g] (칸마다 (v₂² − v₁²) ÷ 2Δs)
const accMax = A => { let a = 0; for (let i = 0; i + 1 < A.v.length; i++) a = Math.max(a, (A.v[i + 1] ** 2 - A.v[i] ** 2) / (2 * (A.G.s[i + 1] - A.G.s[i]))); return a / g; };

// 종목 기록 한 벌 (감속비 gr).  fast = 줄여 셈 (감속비 찾기 · 입력 훑기)
//   스키드패드 기록 = 오른쪽 한 바퀴 + 왼쪽 한 바퀴 [s]
function events(I, gr, fast) {
  const ds = fast ? 3 : 1, C = car(I, gr, 1);
  const skr = skR(I, C), skc = 2 * Math.PI * skr, vR = skidV(C, -skr, C.Voc(1)), vL = skidV(C, skr, C.Voc(1));
  const X = runAx(I, C, ds), EN = runEnd(I, gr, !fast);
  const A = runAcc(I.dr_real === 1 ? car(accI(I), gr, 1) : C);
  return { C, acc: A.t[0], A, skid: skc / vR + skc / vL, tR: skc / vR, tL: skc / vL, vs: Math.min(vR, vL), vR, vL, skR: skr,
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
  const tAt = c => { VC = new Map(); VCF = new Map(); const C = car({ ...I, cla: c }, gr, 1), V = C.Voc(1), R = skR(I, C), L = 2 * Math.PI * R; return L / skidV(C, -R, V) + L / skidV(C, R, V); };
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
  if (c === 'acc')  { const CA = car(accI(I), gr, 1); return { L: runAcc(CA), C: CA, stand: [0] }; }
  if (c === 'skid') return { L: laps(C, skidSegs(skR(I, C)), 1, 0.5, 1, C.Voc(1)), C, stand: [0], skid: true };
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
    sk_r: E.skR,   // 스키드패드 주행 반경 [m]
    t_acc_s: E.acc, t_skid_s: E.skid, t_skid_r: E.tR, t_skid_l: E.tL, t_ax_s: E.ax, t_end_s: E.end,
    t_end1: end ? end.first : NaN, t_endavg: end ? end.avg : NaN, n_lap: EN ? EN.n : NaN, n_st1: EN ? EN.n1 : NaN,
    d_acc: E.acc - fast.acc, d_ax: E.ax - fast.ax, d_end: E.end - fast.end,
    // 차량 한계
    vmax: C.vtop * 3.6, v_top: E.X ? Math.max(...E.X.v) * 3.6 : NaN,
    v_endtop: EN ? Math.max(...EN.A.v, ...EN.B.v) * 3.6 : NaN,                                       // 내구 최고 차속 [km/h]
    ay_skid: skidAy(E),                                                                               // 기록 바퀴 평균 [g]
    ax_0: (CA => CA.aDrive(0, 0, 0, CA.Voc(1), CA.Tinit))(I.dr_real === 1 ? car(accI(I), G2, 1) : C) / g, ax_max: accMax(E.A),                              // 가속: 출발 · 최대 종가속도 [g]
    cla_req: claNeed(I, G2), skid_roll: C.rollAng(skidAy(E) * g),
    // 내구 (대시보드 반영 · 검증용)
    e_ok: EN ? (EN.Ec <= C.Ecap * 1.01 ? 1 : 0) : NaN, e_use: EN ? EN.Ec / 3.6e6 : NaN, p_lim: EN ? EN.k * 100 : NaN,
    e_reg: EN ? EN.Er / 3.6e6 : NaN, c_lam: EN ? EN.lam * 3.6e6 : NaN,                                 // 회생 회수 [kWh] · 타력 λ [s/kWh]
    e_lap: EN ? lapStat(EN.et, [0, EN.n1]).avg / 3.6e6 : NaN,
    // 내구 평균 발열 · 차속 (도구 9 냉각 계통 계산기 입력): 손실 시간 적분 ÷ 주행 시간 [W], 거리 ÷ 시간 [km/h], 방열량 목표 = 모터 + 인버터 [kW]
    ...(() => { const Q = EN && EN.Q; if (!Q || !(Q.t > 0)) return { q_mot: NaN, q_inv: NaN, q_bat: NaN, v_end_avg: NaN, q_cool: NaN };
                return { q_mot: Q.m / Q.t, q_inv: Q.i / Q.t, q_bat: Q.b / Q.t, v_end_avg: Q.s / Q.t * 3.6, q_cool: (Q.m + Q.i) / Q.t / 1000 }; })(),
    // 내구 전체 에너지 [kWh]: 지금 설정 그대로 (에너지 상한이 걸리면 출력을 낮춘 값) · 출력 상한 없이 (배율 1) 달렸을 때
    e_end_t: EN ? EN.Et / 3.6e6 : NaN, e_end_c: EN ? EN.Ec / 3.6e6 : NaN,
    ...(() => { if (!EN) return { e_nl_t: NaN, e_nl_c: NaN };
                const F = EN.k < 1 || EN.lam > 0 ? endurance(endI(I), car(endI(I), G2, 1), true, 1) : EN;
                return { e_nl_t: F.Et / 3.6e6, e_nl_c: F.Ec / 3.6e6 }; })(),
  };

  // ---------- 고른 코스 (감속비 G3)
  const c = I.course, K = runCourse(I, c, G3);
  if (!K) return { out, x: { d: [0] }, sig: {}, map: null };

  // 볼 랩 고르기: 내구는 드라이버 A · B 두 줄을 이어 붙임
  let G, v, lim, V0, TM, TI, TW, TB, TX, from = 0, to, P, n;
  if (K.EN) {
    const A = K.EN.A, B = K.EN.B, off = A.G.s.at(-1);
    G   = { s: [...A.G.s, ...B.G.s.slice(1).map(x => x + off)], k: [...A.G.k, ...B.G.k] };
    v   = [...A.v, ...B.v.slice(1)];
    lim = [...A.lim, ...B.lim.slice(1)];
    V0  = [...A.V0, ...B.V0.slice(1)]; V0.soc = [...(A.V0.soc || A.V0.map(() => 1)), ...(B.V0.soc || B.V0.map(() => 1)).slice(1)];
    TM  = [...A.TM, ...B.TM.slice(1)];
    TW  = [...A.TW, ...B.TW.slice(1)];
    TB  = [...A.TB, ...B.TB.slice(1)];
    TX  = [...A.TX, ...B.TX.slice(1)];
    TI  = [...A.TI, ...B.TI.slice(1)];
    P = A.P; n = K.EN.n;
  } else {
    ({ G, v, lim, V0, TM, TI, TW, TB, TX, P } = K.L); n = K.L.t.length;
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
    // 최소 회전 반경(최대 조향각에서)보다 급한 조각: 가운데 선 거리 [시작, 끝] (코스 원래 방향)
    const rmE = rKin(I), iv = [];
    if (rmE) RL.segs.forEach(([, R], j) => { if (R && Math.abs(R) < rmE * (1 - 1e-3)) iv.push([RL.sN[j], RL.sN[j + 1]]); });
    map.rbad = c === 'ax' ? iv.map(([a, b]) => [Lc - b, Lc - a]) : iv;
  }

  const sl = a => a.slice(from, to + 1);
  const Gs = { s: sl(G.s).map(x => x - G.s[from]), k: G.k.slice(from, to) }, vv = sl(v);
  const W  = walk(K.C, Gs, vv, sl(V0), true, { m: TM[from], i: TI[from], w: TW[from], b: TB[from], x: TX ? TX[from] : undefined });

  // ---------- 고른 코스 결과 (볼 랩)
  const lt = K.EN ? K.EN.t : K.L.t, le = K.EN ? K.EN.et : K.L.Et, lc = K.EN ? K.EN.ec : K.L.Ec, soc = K.EN ? K.EN.soc : K.L.socs;
  const ls = lapStat(lt, K.stand), jj = I.lap !== 'all' && lt.length > 1 ? j : -1;
  const pick = a => jj >= 0 ? a[jj] : sum(a);
  const socEnd = K.EN ? K.EN.soc1 : (K.L.soc1 != null ? K.L.soc1 : NaN);
  Object.assign(out, {
    c_gr: G3, c_n: lt.length, c_lap: jj + 1, c_len: RL ? RL.len : NaN, c_ltot: RL ? RL.len * lt.length : NaN, c_rl: RL && RL.eN ? (RL.gain != null ? 2 : 1) : 0, c_rlg: RL && RL.gain != null ? RL.gain : NaN, c_rlb: rlB(I),   // 한 랩 · 총 거리 [m]
    c_rkin: rKin(I) || NaN,   // 최대 조향각에서 정한 최소 회전 반경 [m]
    c_vstr: K.C && K.C.drv && G && G.k ? (x => isFinite(x) ? x * 3.6 : NaN)(Math.min(...steerCap(K.C, G))) : NaN,   // 현실 운전자: 핸들 속도 상한이 가장 낮은 곳 [km/h]
    ...(() => { const rmE = rKin(I), T = RL ? rTight(RL.segs, rmE) : c === 'skid' ? rTight([[1, skR(I, K.C)]], rmE) : { r: Infinity, bad: 0 };
                const bk = bodyBk(I), bb = bk && isFinite(T.r) ? bk(1 / T.r) : [NaN, NaN];
                return { c_rmn: isFinite(T.r) ? T.r : NaN, c_rbad: T.bad, c_ctight: RL && RL.ctight ? RL.ctight : 0,
                         c_bo: Math.max(bb[0], bb[1]), c_bi: Math.min(bb[0], bb[1]) }; })(),   // 가장 급한 곳에서 차 바깥 · 안쪽 여유 [m] (전폭이 있을 때)   // c_ctight = 여유를 못 지킨 콘 수                       // 달리는 선 가장 작은 반경 · 최소 회전 반경보다 급한 길이 [m]
    // 차량 모델 2: 보는 랩의 최대 슬립각 · 차체 각도 · 조향각, 포화 점 수, 최대 조향각을 넘는 거리 [m]
    ...(() => { const S = W.S, M = a => a.length && a.some(Number.isFinite) ? Math.max(...a.filter(Number.isFinite).map(Math.abs)) : NaN; if (!K.C.md2) return { c_afmax: NaN, c_armax: NaN, c_bmax: NaN, c_swmax: NaN, c_dwmax: NaN, c_satn: NaN, c_dbad: NaN };
                let bad = 0; if (K.C.dmx > 0) for (let i = 0; i < S.dst.length; i++) if (S.dst[i] === 1) bad += Gs.s[i + 1] - Gs.s[i];   // 조향 한계로 코너 속도 상한이 낮아진 거리 [m]
                return { c_afmax: M(S.af), c_armax: M(S.ar), c_bmax: M(S.beta), c_swmax: M(S.sw), c_dwmax: M(S.dw), c_satn: S.sat.reduce((a, b) => a + b, 0), c_dbad: K.C.dmx > 0 ? bad : NaN }; })(),
    c_t: c === 'skid' ? E.skid : lt.length > 1 ? (jj >= 0 ? lt[jj] : ls.total) : lt[0],
    c_t1: ls.first, c_tavg: ls.avg, c_ttot: ls.total,
    c_vtop: Math.max(...vv) * 3.6,
    c_rpm: Math.max(...W.S.rpm), c_tq: Math.max(...W.S.tq), c_pbat: Math.max(...W.S.pbat), c_vmin: Math.min(...W.S.vbat),
    tmax_o: (() => { const mx = t => Math.max(...t.map(q => q[1])); return I.motor && I.motor.length ? mx(I.motor) : I.motorC && I.motorC.length ? mx(I.motorC) / Math.max(1e-3, Math.min(1, (Number.isFinite(I.c_pct) ? I.c_pct : 100) / 100)) : I.tmax; })(),   // 모터 최대 토크 = 피크 표 최댓값 (기준 전압, 피크가 없으면 연속 ÷ 비율) → 대시보드 tmax
    ...(() => { const T = TRI[I.course]; return T ? { c_trok: T.ok, c_trit: T.it, c_trlen: T.len, c_trq: T.q, c_trdt: T.dt } : { c_trok: NaN, c_trit: NaN, c_trlen: NaN, c_trq: NaN, c_trdt: NaN }; })(),   // 모델 3 과도: 다 맞춤 (1) · 되풀이 수 · 속도를 낮춘 거리 [m] · 정상보다 더 쓴 타이어 몫 최대 [%] · 한 랩 시간 증가 [s] (닫힌 코스 = 이어 달린 바퀴)
    ...(() => { if (!Number.isFinite(I.tp_v)) return {};   // 검증용 탐침 (모델 3): 일정 차속 tp_v, 곡률 tp_k · dκ/ds tp_dk · d²κ/ds² tp_ddk 의 과도 축 힘 · 타이어 사용
      const C = K.C, v = I.tp_v, Iz = Math.max(0, Number.isFinite(I.izz) ? I.izz : 70), L = C.L, lf = L * (1 - C.fs), lr = L * C.fs, ay = v * v * I.tp_k, rd = v * v * I.tp_dk, rdd = v * v * v * (I.tp_ddk || 0);
      const Ff = (C.m * ay * lr + Iz * rd) / L, Fr = (C.m * ay * lf - Iz * rd) / L, dFf = (C.m * v * rd * lr + Iz * rdd) / L, dFr = (C.m * v * rd * lf - Iz * rdd) / L;   // d(a_y)/dt = v · v² κ' = v ṙ (일정 차속)
      const P = trPoint(C, Math.max(0, I.tire_relax || 0), v, 0, ay, Ff, Fr, dFf, dFr); return { c_tpf: P.Fsf, c_tpr: P.Fsr, c_tpu: P.uT }; })(),
    ...(() => { const B = BDI[I.course]; return { c_bdlen: B ? B.len : NaN, c_bddv: B ? B.dv : NaN, c_bdct: B ? B.ct : NaN }; })(),   // 차체가 경계에 닿지 않게 속도를 낮춘 거리 [m] · 가장 크게 낮춘 양 [km/h]
    ...(Number.isFinite(I.bp_k) && wcOn(I) ? (([l, r]) => ({ c_bdl: l, c_bdr: r }))(bodyM(I, I.bp_k, (I.bp_b || 0) * Math.PI / 180)) : {}),   // 검증용 탐침: 곡률 · 차체 각도의 차 옆 나감 [m]
    c_cdp: Number.isFinite(I.cq_dy) && wcOn(I) ? coneDist(I, K.C, I.cq_n || 0, (I.cq_psi || 0) * Math.PI / 180, I.cq_k || 0, I.cq_dx || 0, I.cq_dy) : NaN,   // 검증용 탐침: 차 사각형 ↔ 콘 점 거리 [m]
    c_v3: Number.isFinite(I.vp_k) ? K.C.vCorner3(I.vp_k, I.vp_k1 || 0, I.vp_k2 || 0) : NaN,   // 검증용 탐침 (모델 3): 곡률 κ · κ' · κ'' 의 코너 한계 속도 [m/s]
    c_rho: Number.isFinite(I.cp_v) ? K.C.capFy(I.cp_v, 0, I.cp_ay) / K.C.capF(I.cp_v, 0, I.cp_ay) : NaN,   // 검증용 탐침 (모델 2): 같은 슬립각 앞축 횡 한계 ÷ Σ μ F_z
    c_tqp: Number.isFinite(I.tq_n) ? K.C.Tcurve(I.tq_n, I.tq_V, I.tq_tm, I.tq_ti) : NaN,   // 검증용 탐침: 회전수 tq_n · 단자 전압 tq_V · 모터 온도 tq_tm · 인버터 온도 tq_ti 의 최대 토크 [N·m]
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
  const toF = (T, n) => T * gr * C.etaD(n, T) / C.r;
  const f_mt = VV.map(x => toF(C.Tcurve(C.rpm(x), V, Tm), C.rpm(x)));
  const f_mp = VV.map(x => { const n = C.rpm(x), w = n * 2 * Math.PI / 60, T = C.Tcurve(n, V, Tm), e = C.elec(toF(T, n), x, V).e;
                             return w > 0 ? toF(C.ptMax(V) * e / w, n) : NaN; });
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

// 입력 확인: 값은 실제 크기만 뜻함 (0 · 음수 = 계산 불가). 기능을 끄는 것은 각 단추
function checkIn(I) {
  const bad = (c, msg) => { if (c) throw new Error(msg); };
  bad(!(I.n_s > 0) || !(I.n_p > 0) || !(I.c_ah > 0) || !(I.c_vnom > 0), '축전지: 직렬 수 · 병렬 수 · 셀 용량 · 셀 공칭 전압이 0 보다 크거나, [팩 값 직접]이면 팩 최대 전압 · 팩 용량이 0 보다 커야 합니다 (축전지).');
  bad(!(I.i_pk > 0), '인버터 피크 상전류는 0 보다 커야 합니다 (모터 · 인버터 › 인버터 전류 한계).');
  bad(!(I.kt > 0), '모터 토크 상수 K_t 는 0 보다 커야 합니다 (모터 · 인버터 › 모터 한계).');
  bad(I.ict_m !== 0 && !(I.i_ct >= 0), '인버터 연속 상전류를 넣으세요.');
  bad(I.wc_on !== 0 && !(I.w_car > 0), '차 크기 고려가 켜져 있으면 차 전폭은 0 보다 커야 합니다 (차량 제원 › 치수).');
  bad(I.dl_on !== 0 && !steerGeo(I).tab && !(I.delta_max > 0), '조향 한계 고려가 켜져 있으면 최대 조향각은 0 보다 커야 합니다 (조향).');
  bad(I.fz0_m !== 0 && !(I.tire_fz0 > 0), '타이어 기준 하중을 값으로 쓰면 0 보다 커야 합니다 (타이어).');
  bad(I.rg_on === 1 && !(I.rg_tmax > 0), '회생 제동이 켜져 있으면 회생 토크 상한은 0 보다 커야 합니다.');
  bad(I.rg_on === 1 && !(I.i_chg > 0), '회생 제동이 켜져 있으면 팩 충전 전류 한계는 0 보다 커야 합니다.');
}

// 팩 값 직접 입력 (직렬 수 0): 팩 최대 · 공칭 · 최소 전압 [V] · 팩 용량 [Ah] → 같은 셀 값으로 바꿔 아래 계산을 그대로 씀
//   직렬 수 = 팩 최대 ÷ 셀 최대 (정수가 아니어도 됨, 셀 표 OCV 의 크기 기준), 셀 공칭 · 최소 = 팩 값 ÷ 직렬 수, 병렬 1 · 셀 용량 = 팩 용량
function packCell(I) { const dir = I.pk_dir === 1 || (I.pk_dir !== 0 && !(I.n_s > 0));   // 팩 값 직접 = 고르는 값 pk_dir (없으면 예전 저장본: 직렬 수 0)
  if (!dir || !(I.p_vmax > 0)) return I;
  const cv = I.c_vmax > 0 ? I.c_vmax : 4.2, Ns = I.p_vmax / cv;
  return Object.assign(I, { n_s: Ns, n_p: 1, c_vmax: cv, c_vnom: (I.p_vnom > 0 ? I.p_vnom : I.p_vmax) / Ns, c_vmin: (I.p_vmin > 0 ? I.p_vmin : I.p_vmax) / Ns, c_ah: I.p_ah }); }
function calc(I) {
  VC = new Map(); VCF = new Map(); packCell(I);
  if (!I._probe) checkIn(I);

  // ---------- 구동력 선도 프로브: 그 점의 감속비 · 전압 · 모터 온도 · 가속도로 선도만
  if (I._probe) { RLI = {}; const p = I._probe; return { out: {}, ft: tractive(I, p.gr, p.V, p.Tm, p.ay, p.ax) }; }

  // ---------- 입력 훑기: 입력 감속비로 종목 기록만 (줄여 셈)
  if (I._sweep) {
    prepLines(I, true); prepBody(I, true); prepTrans(I, true);
    const E = events(I, I.gr, true);
    const NL = E.EN ? (E.EN.k < 1 || E.EN.lam > 0 ? endurance(endI(I), car(endI(I), I.gr, 1), false, 3) : E.EN) : null;   // 출력 상한 · 타력 없이 (줄여 셈)
    return { out: { t_acc_s: E.acc, t_skid_s: E.skid, t_ax_s: E.ax, t_end_s: E.end, e_use: E.EN ? E.EN.Ec / 3.6e6 : NaN, e_nl_c: NL ? NL.Ec / 3.6e6 : NaN,
                    p_lim: E.EN ? E.EN.k * 100 : NaN, vmax: E.C.vtop * 3.6, ay_skid: skidAy(E) } };
  }

  // ---------- 주행선 다듬기 (I.rl_on = 2): 입력이 바뀌었을 때만
  prog(0, '준비 중');                                   // 진행 막대를 바로 숫자로 (흐르는 막대로 바뀌지 않게)
  prepLines(I, false);
  steerCheck(I);                                        // 모델 2 이상: 조향으로 못 도는 코너가 있으면 여기서 멈춤
  prepBody(I, false);                                   // 모델 2 이상: 차체가 경계에 닿지 않는 속도 상한
  prepTrans(I, false);                                  // 모델 3: 과도 상한

  // ---------- 진행: 남은 [PG0, 1] 을 감속비 훑기 60 % · 가장 빠른 감속비 내구 10 % · 두 모드 20 % · 내 코스 10 % 로
  const P = (a, msg) => prog(PG0 + (1 - PG0) * a, msg);
  P(0, '감속비 훑는 중');
  // ---------- 감속비 (두 모드 공통): 종목별 가장 빠른 값 · 배점 가중 제안, 그 감속비에서 다 계산한 기록
  const B = bestGr(I, f => P(0.6 * f, '감속비 훑는 중'));
  P(0.6, '기록 계산 중');
  const ENb  = runEnd(I, B.end, true);                   // 내구가 가장 빠른 감속비에서 다 계산
  const endb = ENb ? lapStat(ENb.t, [0, ENb.n1]) : null;
  const fast = {
    acc: runAcc(car(accI(I), B.acc, 1)).t[0],
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
   대시보드 값으로 도구 2P를 돌린 결과 (읽기 전용, 내 감속비 = 대시보드 감속비) */
const T2P = { R:null, key:'', busy:false, w:null };
const T2ONLY = ['p_vmax', 'p_vnom', 'p_vmin', 'p_ah', 'v_ref', 'ke_ratio', 'eta_mot', 'eta_inv', 'c_vmax', 'c_vmin', 'c_vnom', 'c_ah', 'c_pct', 'kt', 'i_pk', 'i_ct', 'i_cpct', 'i_init', 'tr_ks', 'th_c', 'th_r', 'th_cool', 'th_init', 'rl_on', 'w_car', 'oh_f', 'oh_r', 'rl_m', 'rl_b', 'e_lim', 'md', 'th_on', 'cw_on', 'in_on', 'm_cool', 'i_cool', 'b_cool', 'eff_mg', 'inv_r', 'm_ha0', 'm_ha60', 'i_c', 'i_r', 'i_ha0', 'i_ha60', 'b_ha60', 'b_r', 'bt_on', 't_amb', 'cw_v', 'cw_q', 'cw_ra', 'cw_kd', 'cw_fan', 'cw_fon', 'cw_ua', 'cw_itd', 'cw_cm', 'i_wv', 'i_wq', 'i_wra', 'i_wkd', 'i_wfan', 'i_wfon', 'i_wua', 'i_witd', 'i_wcm', 'b_wv', 'b_wq', 'b_wra', 'b_wkd', 'b_wfan', 'b_wfon', 'b_wua', 'b_witd', 'b_wcm', 'cw_mode', 'b_c', 'b_ha', 'b_t0', 'b_alpha', 'h_rcf', 'h_rcr', 'k_roll'];   // 대시보드에 없는 입력: 도구에 저장된 값을 씀
const T2SET = ['md', 'th_on', 'in_on', 'bt_on', 'cw_on', 'cw_mode', 'm_cool', 'i_cool', 'b_cool', 'eff_mg', 'rl_on', 'e_lim', 'drv', 'dr_real', 'rg_on', 'dl_on', 'fz0_m', 'ict_m', 'cw_fm', 'i_wfm', 'b_wfm', 'pk_dir'];   // 이 도구에서 고른 계산 설정 (대시보드 파트 결과도 같은 설정으로)
const T2GOAL = ['t_acc', 't_skid', 't_ax', 't_end'];                                                    // 목표 기록 (대시보드 '차량 목표')
function t2PartInputs(){ const I = {}; WB_TOOLS['2'].inputs.forEach(d => { const db = wbDash(d.dk); I[d.k] = db ? db.v : (wbEx() || d.ui==='none' || d.keep ? d.v : NaN); });   /* 새 파일 · 파트 페이지 = 대시보드 · 2P 저장값만 */
  T2GOAL.forEach(k => { const db = wbDash(k); I[k] = db ? db.v : 0; });
  try{ const s = JSON.parse(localStorage.getItem(wbStoreKey('2')) || '{}') || {}; [...T2ONLY, ...T2SET].forEach(k => { if(typeof s[k]==='number' && isFinite(s[k])) I[k] = s[k]; }); }catch(e){}
  return {...I, ...t2ExtraI(), course:'acc', lap:'1', grMode:'my'}; }   // 모델 단계 · 열 모델 켜고 끔은 이 도구에서 고른 설정 그대로 (화면 결과와 같은 기준)
function t2PartDirty(){ T2P.key = ''; if(typeof DASH!=='undefined' && (DASH.part==='goal' || DASH.part==='pt') && $('#t2part')) t2PartRun(); }
function t2PartRun(){ const I = t2PartInputs(), key = JSON.stringify(I); if(key===T2P.key || T2P.busy) return; T2P.busy = true;
  try{ if(!T2P.w) T2P.w = new Worker(URL.createObjectURL(new Blob([WB_TOOLS['2'].code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false}); } };'], {type:'text/javascript'}))); }catch(e){ T2P.busy = false; return; }
  T2P.w.onmessage = e => { T2P.busy = false; T2P.key = key; if(e.data.ok){ T2P.R = e.data.r; const b = $('#t2part'); if(b) b.innerHTML = t2PartBody(DASH.part, I, T2P.R); } };
  T2P.w.postMessage(I); }
function t2PartHTML(kind){ setTimeout(t2PartRun, 0);
  return `<div class="t2-part"><p class="dp-note">대시보드 설계값과 도구 2P의 코스 · 모터 · 효율 표로 계산한 결과입니다. 표를 바꾸려면 <span class="wb-mpick wb-mpi" tabindex="-1"><span class="lnk">도구 2P 랩타임 시뮬레이터</span>${wbModeBtns('2', '도구 2P')}</span>를 엽니다.</p><div id="t2part">${T2P.R ? t2PartBody(kind, t2PartInputs(), T2P.R) : '<p class="muted">계산 중…</p>'}</div></div>`; }
function t2PartBody(kind, I, R){ const o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  if(kind==='goal'){ const rows = [['가속', I.t_acc, o.t_acc_s, 3], ['스키드패드 (좌우 합)', I.t_skid, o.t_skid_s, 3], ['오토크로스', I.t_ax, o.t_ax_s, 2], ['내구', I.t_end, o.t_end_s, 1]];
    return `<table class="dvi-t t2-gt"><thead><tr><th>종목</th><th>예상 기록</th><th>목표 기록</th><th>차이</th></tr></thead><tbody>${rows.map(([n, g0, t, d]) => { const has = g0 > 0, df = t - g0;
        return `<tr><td>${n}</td><td><b>${f(t, d)}</b> s</td><td>${has ? f(g0, d) + ' s' : '<span class="muted">정하지 않음</span>'}</td><td class="${has && isFinite(df) ? (df > 0 ? 'wb-err' : 'ok') : ''}">${has && isFinite(df) ? (df > 0 ? '+' : '−') + wbFmt(Math.abs(df), d) + ' s' : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="dp-note">대시보드 감속비 ${f(I.gr, 2)}로 계산. 목표 기록은 대시보드 '차량 목표'(공통) 값이고, 차이가 + 면 목표보다 느립니다. 도구 2P의 제안 감속비는 ${f(o.gr_opt, 2)}.</p>`; }
  const F = R.ft; return `<div class="dp-plots">${wbPlot({id:'t2ft', w:640, h:280, x:{d:F.v, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:F.f_m, c:WB_COL[0], n:'모터 구동력', u:'N', dd:0}, {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}], yn:{'N':'바퀴 힘'}, hit:false, label:'구동력 선도'})}</div>
    <div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴, SOC 100 %)</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진 · 일정 속도)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항 (항력 + 구름)</span></div>
    <p class="dp-note">감속비 ${f(I.gr, 2)} · 회전수 한계 최고속 ${f(o.vmax, 1)} km/h · 단자 출력 상한 ${f(o.p_max, 1)} kW. 모터 구동력이 접지 한계보다 큰 구간은 바퀴가 미끄러지므로 접지 한계가 가속을 정합니다. 제안 감속비 ${f(o.gr_opt, 2)}, 내구 평균 랩 단자 에너지 ${f(o.e_lap, 3)} kWh.</p>`; }
