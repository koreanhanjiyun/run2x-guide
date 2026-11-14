/* ============================================================
   도구 9 냉각 계통 계산기 — docs/TOOLS-PLAN.md 5절 (설계 단계 P4-5 라디에이터 · 펌프 선정, 냉각 열부하 · 축전지 냉각)
   - 수랭 회로 · 공랭 덕트를 블럭으로 배치하고, 주행 평균 발열 · 차속에서 부품 · 냉각수 정상 온도와 출발 온도에서 주행 시간 동안의 온도를 계산
   - 도구 2P 랩타임 시뮬레이터는 냉각수를 한 덩어리로 보므로, 이 회로를 줄인 등가값(열용량 · 라디에이터 UA 정지 · 60 km/h)을 넘김 [도구 2P 에 넣기]
   - 도구 2P [편집 › 냉각]에서 그 결과의 평균 발열 · 차속을 이 도구 입력으로 보낼 수 있음
   - 배치는 이 브라우저에 기억 (run2x.t9), 예전 도구 2P 저장본에 배치가 있으면 처음 한 번 가져옴
   ============================================================ */
const T9KEY = 'run2x.t9';
/* 냉각 회로 기본 배치 (FS 전기차에서 흔한 구성): 수랭 = 라디 → 펌프 → 인버터 → 모터 → 라디 (인버터가 더 낮은 냉각수 온도를 요구해 먼저), 공랭 덕트 = 입구 → 축전지 → 출구
   값: 펌프 8 L/min (모터 컨트롤러 최소 유량 8 L/min 예, 인버터 냉각판 10 L/min 예), 라디 코어 0.06 m² (오토바이용 라디 크기), 주행풍 중 코어 통과 비율 0.3, 팬 0.08 m³/s,
        UA 250 W/K (코어 풍속 5 m/s, 60 km/h 에서 약 2 kW 방열이 되게), 냉각수 = 물 (4180 J/kg·K, 1000 kg/m³), 블럭 안 냉각수 양 0.2 ~ 0.6 L · 배관 · 탱크 0.5 L, 호스 안지름 10 mm · 길이 0.5 m (점도 1 mPa·s = 물 20 °C 근처), 덕트 입구 0.02 m² · 비율 0.5 · 팬 0.03 m³/s */
const T9COOL_DEF = () => ({ circuits:[
  {id:'w1', kind:'water', name:'수랭 회로 1', p:{cp:4180, rho:1000, mu:1, Vh:0.5}, sel:'', blocks:[
    {id:'k1', t:'rad', x:40, y:70, p:{A:0.06, kd:0.3, fan:0.08, UA:250, V:0.6}}, {id:'k2', t:'pump', x:280, y:67, p:{flow:8}},
    {id:'k3', t:'i', x:440, y:70, p:{V:0.2}}, {id:'k4', t:'m', x:670, y:70, p:{V:0.3}}],
   links:[['k1', 'k2'], ['k2', 'k3'], ['k3', 'k4'], ['k4', 'k1']]},
  {id:'a1', kind:'air', name:'공랭 덕트 1', p:{}, sel:'', blocks:[
    {id:'k5', t:'in', x:40, y:67, p:{A:0.02, kd:0.5, fan:0.03}}, {id:'k6', t:'b', x:360, y:70, p:{}}, {id:'k7', t:'out', x:680, y:67, p:{}}],
   links:[['k5', 'k6'], ['k6', 'k7']]}] });
const T9 = { cool:T9COOL_DEF() };
/* 새 파일 = 회로 틀(수랭 회로 1 · 공랭 덕트 1)만, 블럭 · 호스 · 냉각수 값 없음 */
const T9COOL_NEW = () => ({ circuits:T9COOL_DEF().circuits.map(c => ({...c, p:{}, sel:'', blocks:c.kind==='air' ? c.blocks.filter(b => b.t==='in' || b.t==='out').map(b => ({...b, p:{}})) : [], links:[]})) });   /* 공랭 덕트는 입구 · 출구 블럭은 늘 있음 (값은 빈칸) */
/* 저장본 정리 (2026-11-11): 공랭 덕트에는 입구 · 출구가 늘 1개씩 (빼지도 더하지도 못함). 새 파일(nf)에 남은 예전 기본 블럭
   (기본 배치 id k1 ~ k4 · k6, 값 없음) 은 지움 → 새 파일 회로에 부품이 미리 들어가 있지 않게 */
function t9CoolNorm(cool, nf){ if(!cool || !Array.isArray(cool.circuits)) return cool; const DEFB = Object.fromEntries(T9COOL_DEF().circuits.flatMap(c => c.blocks).filter(b => b.t!=='in' && b.t!=='out').map(b => [b.id, b]));   // 기본 배치 블럭 (id · 종류 · 자리 모두 같아야 예전 기본으로 봄)
  cool.circuits.forEach(c => { if(!Array.isArray(c.blocks)) c.blocks = []; if(!Array.isArray(c.links)) c.links = [];
    if(nf){ const dead = new Set(c.blocks.filter(b => { const d = DEFB[b.id]; return d && d.t===b.t && d.x===b.x && d.y===b.y && !Object.keys(b.p || {}).length; }).map(b => b.id)); if(dead.size){ c.blocks = c.blocks.filter(b => !dead.has(b.id)); c.links = c.links.filter(([a, b]) => !dead.has(a) && !dead.has(b)); } }
    c.blocks.forEach(b => { if(b.t==='rad' && b.p && b.p.fm==null && +b.p.fon > 0) b.p.fm = 1; });   /* 예전 '0 = 늘 켬' 저장본 → 팬 켜기 선택 */
    if(c.kind!=='air') return; const uid = s => { let id = c.id + s, n = 0; while(c.blocks.some(b => b.id===id)) id = c.id + s + (++n); return id; };
    if(!c.blocks.some(b => b.t==='in')) c.blocks.unshift({id:uid('i'), t:'in', x:40, y:67, p:{}});
    if(!c.blocks.some(b => b.t==='out')) c.blocks.push({id:uid('o'), t:'out', x:680, y:67, p:{}});
    if(c.blocks.length===2 && !c.links.length) c.links.push([c.blocks.find(b => b.t==='in').id, c.blocks.find(b => b.t==='out').id]); });
  return cool; }
wbModeReg(m => { T9.cool = m==='ex' ? T9COOL_DEF() : T9COOL_NEW(); try{ const s = JSON.parse(localStorage.getItem(wbMK(T9KEY)) || 'null'); if(s && s.cool && Array.isArray(s.cool.circuits)) T9.cool = t9CoolNorm(s.cool, m!=='ex'); }catch(e){} });
const t9Save = () => { try{ localStorage.setItem(wbMK(T9KEY), JSON.stringify({cool:T9.cool})); }catch(e){} };
