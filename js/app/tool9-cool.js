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
        UA 250 W/K (코어 풍속 5 m/s, 60 km/h 에서 약 2 kW 방열이 되게), 냉각수 = 물 (4180 J/kg·K, 1000 kg/m³), 블럭 안 냉각수 양 0.1 ~ 0.6 L, 덕트 입구 0.02 m² · 비율 0.5 · 팬 0.03 m³/s */
const T9COOL_DEF = () => ({ circuits:[
  {id:'w1', kind:'water', name:'수랭 회로 1', p:{cp:4180, rho:1000}, sel:'', blocks:[
    {id:'k1', t:'rad', x:40, y:70, p:{A:0.06, kd:0.3, fan:0.08, UA:250, V:0.6}}, {id:'k2', t:'pump', x:250, y:70, p:{flow:8, V:0.1}},
    {id:'k3', t:'i', x:460, y:70, p:{V:0.2}}, {id:'k4', t:'m', x:670, y:70, p:{V:0.3}}],
   links:[['k1', 'k2'], ['k2', 'k3'], ['k3', 'k4'], ['k4', 'k1']]},
  {id:'a1', kind:'air', name:'공랭 덕트 1', p:{}, sel:'', blocks:[
    {id:'k5', t:'in', x:40, y:70, p:{A:0.02, kd:0.5, fan:0.03}}, {id:'k6', t:'b', x:360, y:70, p:{}}, {id:'k7', t:'out', x:680, y:70, p:{}}],
   links:[['k5', 'k6'], ['k6', 'k7']]}] });
const T9 = { cool:T9COOL_DEF() };
try{ const s = JSON.parse(localStorage.getItem(T9KEY) || 'null'); if(s && s.cool && Array.isArray(s.cool.circuits)) T9.cool = s.cool; else if(typeof T2!=='undefined' && T2.coolOld && Array.isArray(T2.coolOld.circuits)) T9.cool = T2.coolOld; }catch(e){}
const t9Save = () => { try{ localStorage.setItem(T9KEY, JSON.stringify({cool:T9.cool})); }catch(e){} };

/* ---------- 냉각 블럭 배치 (시뮬링크처럼 블럭을 놓고 선으로 이음, 2026-11-06 도구 2P 편집 탭에서 옮겨 옴)
   수랭 회로 (최대 3개): 라디에이터 · 펌프 · 모터 · 인버터 · 축전지 블럭을 라디에서 나와 라디로 돌아오게 이음 (라디 · 펌프 1개 이상, 처음 라디가 기준, 선 방향 = 냉각수 흐름, 갈라짐 · 합쳐짐 가능)
   펌프가 여럿이면: 모두 전체 흐름이 지나가는 자리(직렬)면 회로 유량 = 그중 큰 유량 (펌프 곡선 · 배관 저항이 없으므로 같은 유량을 낸다고 보고 큰 쪽이 정함),
                   한 곳에서 갈라진 갈래마다 펌프가 바로 붙어 있으면(병렬) 회로 유량 = 유량 합, 그 갈래 비율 = 펌프 유량 비 (호스 비율 입력 대신). 둘을 섞으면 오류
   공랭 덕트 (최대 3개): 입구 → 부품 … → 출구 로 이음 (선 방향 = 공기 흐름, 앞 부품 열로 공기가 데워짐)
   부품(모터 · 인버터 · 축전지)은 전체에서 한 번만 놓을 수 있고, 어디에도 없으면 외기로 바로 식음 (부품 hA) */
const T9CB = { rad:['라디에이터', 'rad'], pump:['펌프', 'pump'], m:['모터', 'part'], i:['인버터', 'part'], b:['축전지', 'part'], in:['공기 입구', 'io'], out:['공기 출구', 'io'] };
const T9CP = {   // 블럭 입력 [키, 이름, 단위, 소수, 기본값]
  rad:[['A', '코어 앞면 면적', 'm²', 3, 0.06], ['kd', '주행풍 중 코어 통과 비율', '', 2, 0.3], ['fan', '팬 유량 (정지 때도)', 'm³/s', 3, 0.08], ['UA', 'UA (코어 풍속 5 m/s)', 'W/K', 0, 250], ['V', '안의 냉각수 양', 'L', 2, 0.6]],
  pump:[['flow', '유량', 'L/min', 1, 8], ['V', '안의 냉각수 양', 'L', 2, 0.1]],
  partW:[['V', '안의 냉각수 양 (재킷 · 냉각판)', 'L', 2, 0.3]],
  in:[['A', '입구 면적', 'm²', 3, 0.02], ['kd', '주행풍 중 들어오는 비율', '', 2, 0.5], ['fan', '팬 유량 (정지 때도)', 'm³/s', 3, 0.03]],
  water:[['cp', '냉각수 비열', 'J/kg·K', 0, 4180], ['rho', '냉각수 밀도', 'kg/m³', 0, 1000]] };
const t9CParams = (C, B) => B.t==='rad' ? T9CP.rad : B.t==='pump' ? T9CP.pump : B.t==='in' ? T9CP.in : C.kind==='water' && T9CB[B.t][1]==='part' ? T9CP.partW : [];
const t9CV = (o, def) => { const r = {}; def.forEach(([k, , , , v]) => { r[k] = isFinite(+((o || {})[k])) && (o || {})[k] !== '' ? +o[k] : v; }); return r; };
/* 수랭 회로 → 계산용: 갈라지고 합쳐지는 배관 가능. 라디에이터에서 나가는 흐름 = 1, 갈라지는 곳은 호스마다 비율(합 1), 합쳐지는 곳은 더함.
   라디로 들어오는 호스를 빼면 순환 없는 흐름이어야 함 → 그 순서(위상 정렬)로 점을 늘어놓음 (라디 = 0 번). 펌프는 전체 흐름이 지나가야 함 */
function t9CWater(C, by){ const E = [], P = t9CV(C.p, T9CP.water), rads = C.blocks.filter(b => b.t==='rad'), pumps = C.blocks.filter(b => b.t==='pump');
  if(!rads.length) E.push('라디에이터가 1개 이상 있어야 함'); if(!pumps.length) E.push('펌프가 1개 이상 있어야 함'); if(E.length) return {E};   // 라디가 여럿이면 처음 놓은 라디가 회로의 시작점
  const R0 = rads[0].id, L = C.links.filter(([a, b]) => by.has(a) && by.has(b)), outs = id => L.filter(l => l[0]===id), ins = id => L.filter(l => l[1]===id);
  C.blocks.forEach(b => { const nm = T9CB[b.t][0]; if(!outs(b.id).length) E.push(`${nm}에서 나가는 호스가 없음`); if(!ins(b.id).length) E.push(`${nm}로 들어오는 호스가 없음`); });
  if(E.length) return {E};
  const flow = id => t9CV(by.get(id).p, T9CP.pump).flow, isPump = id => by.get(id).t==='pump';
  const pSplit = t9PumpSplit(C, by);   // 갈래마다 펌프가 붙은 갈라짐 (있으면 그 비율 = 펌프 유량 비)
  const fr = l => { const o = outs(l[0]); if(o.length < 2) return 1;
    if(pSplit && l[0]===pSplit){ const s = o.reduce((a, x) => a + flow(x[1]), 0); return s > 0 ? flow(l[1])/s : 1/o.length; }
    const w = o.map(x => isFinite(+x[2]) && +x[2] > 0 ? +x[2] : 1/o.length), s = w.reduce((a, b) => a + b, 0); return w[o.indexOf(l)]/s; };
  // 위상 정렬 (라디로 들어오는 호스 빼고)
  const deg = new Map(C.blocks.map(b => [b.id, ins(b.id).filter(l => l[1]!==R0).length])); deg.set(R0, 0); const order = [], Q = [R0];
  while(Q.length){ const id = Q.shift(); order.push(id); outs(id).forEach(l => { if(l[1]===R0) return; deg.set(l[1], deg.get(l[1]) - 1); if(deg.get(l[1])===0) Q.push(l[1]); }); }
  if(order.length!==C.blocks.length) return {E:['라디를 거치지 않고 도는 고리가 있거나 라디에서 이어지지 않는 블럭이 있음']};
  const ix = new Map(order.map((id, k) => [id, k])), q = new Map([[R0, 1]]);
  order.forEach(id => { if(id!==R0) q.set(id, ins(id).reduce((a, l) => a + q.get(l[0])*fr(l), 0)); });
  const qr = ins(R0).reduce((a, l) => a + q.get(l[0])*fr(l), 0);
  if(Math.abs(qr - 1) > 1e-6) E.push('라디로 돌아오는 흐름이 1 이 아님');
  // 펌프 규칙: 직렬(모두 전체 흐름) → 큰 유량, 한 갈라짐의 갈래마다 하나씩(병렬) → 유량 합
  const full = pumps.filter(b => Math.abs(q.get(b.id) - 1) < 1e-6), part = pumps.filter(b => Math.abs(q.get(b.id) - 1) >= 1e-6);
  let Vt = 0, mode = '';
  if(!part.length){ Vt = Math.max(...full.map(b => flow(b.id))); mode = full.length > 1 ? `직렬 펌프 ${full.length}개 → 큰 유량 ${Vt} L/min` : ''; }
  else if(!full.length && pSplit && part.every(b => ins(b.id).length===1 && ins(b.id)[0][0]===pSplit) && Math.abs(q.get(pSplit) - 1) < 1e-6 && part.length===outs(pSplit).length){
    Vt = part.reduce((a, b) => a + flow(b.id), 0); mode = `병렬 펌프 ${part.length}개 → 유량 합 ${+Vt.toFixed(2)} L/min`; }
  else E.push('펌프는 모두 전체 흐름이 지나가는 자리(직렬)에 두거나, 한 곳에서 갈라진 갈래마다 바로 하나씩(병렬) 두어야 함');
  if(!(Vt > 0) && !E.length) E.push('펌프 유량이 0');
  if(E.length) return {E};
  const nodes = order.map(id => { const B = by.get(id), v = t9CV(B.p, t9CParams(C, B));
    return {t:B.t==='rad' ? 'rad' : B.t==='pump' ? 'pump' : 'part', part:T9CB[B.t][1]==='part' ? B.t : undefined, C:Math.max(1, v.V/1000*P.rho*P.cp), q:id===R0 ? 1 : q.get(id),
            ins:ins(id).map(l => [ix.get(l[0]), q.get(l[0])*fr(l)]), ...(B.t==='rad' ? {UA:v.UA, A:v.A, kd:v.kd, fan:v.fan} : {})}; });   // 라디마다 공기 쪽 값
  const rr = t9CV(rads[0].p, T9CP.rad);
  return {E, net:{nodes, Cc:Vt/60000*P.rho*P.cp, UA:rr.UA, A:rr.A, kd:rr.kd, fan:rr.fan}, q, fr, mode}; }
/* 갈래마다 펌프가 바로 붙은 갈라짐 블럭 id (나가는 호스가 둘 이상이고 모두 펌프로 감), 없으면 '' */
function t9PumpSplit(C, by){ const L = C.links.filter(([a, b]) => by.has(a) && by.has(b));
  for(const B of C.blocks){ const o = L.filter(l => l[0]===B.id); if(o.length >= 2 && o.every(l => by.get(l[1]).t==='pump')) return B.id; } return ''; }
/* 배치 → 계산용 회로 + 오류 */
function t9CoolCompile(){ const out = {water:[], air:[]}, err = {}, used = {}, mode = {};
  (T9.cool.circuits || []).forEach(C => { const E = [], by = new Map(C.blocks.map(b => [b.id, b])), nx = new Map(), pv = new Map();
    C.links.forEach(([a, b]) => { if(by.has(a) && by.has(b)){ nx.set(a, b); pv.set(b, a); } });
    C.blocks.forEach(b => { if(T9CB[b.t] && T9CB[b.t][1]==='part'){ if(used[b.t]) E.push(`${T9CB[b.t][0]}이 다른 회로에도 있음`); used[b.t] = true; } });
    if(C.kind==='water'){ const r = t9CWater(C, by); E.push(...r.E); if(!r.E.length){ out.water.push(r.net); if(r.mode) mode[C.id] = r.mode; } }
    else { const ins = C.blocks.filter(b => b.t==='in'), outs = C.blocks.filter(b => b.t==='out'), parts = [];
      if(ins.length!==1 || outs.length!==1) E.push('입구 · 출구는 1개씩');
      else { let cur = nx.get(ins[0].id); const seen = new Set();
        while(cur && cur!==outs[0].id && !seen.has(cur)){ seen.add(cur); parts.push(by.get(cur).t); cur = nx.get(cur); }
        if(cur!==outs[0].id) E.push('입구에서 출구까지 이어져야 함'); else if(seen.size!==C.blocks.length - 2) E.push('이어지지 않은 블럭이 있음'); }
      if(!E.length){ const q = t9CV(ins[0].p, T9CP.in); out.air.push({A:q.A, kd:q.kd, fan:q.fan, parts}); } }
    if(E.length) err[C.id] = E; });
  return {net:out, err, mode}; }
/* 부품이 어디서 식는지: 'w1' 처럼 회로 id + 종류, 없으면 null (오류 회로는 안 침) */
function t9CoolWhere(p){ const ok = t9CoolCompile().err; for(const C of T9.cool.circuits){ if(ok[C.id]) continue; if(C.blocks.some(b => b.t===p)) return C; } return null; }
const T9CBW = 150, T9CBH = 58;   // 블럭 크기 (그림 좌표)
/* 꺾은선 → 꺾이는 곳을 반지름 r 로 둥글게 한 경로 */
function t9Ortho(P, r){ let d = `M${P[0][0]},${P[0][1]}`;
  for(let k = 1; k < P.length - 1; k++){ const [ax, ay] = P[k - 1], [bx, by] = P[k], [cx, cy] = P[k + 1], l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), q = Math.min(r, l1/2, l2/2);
    if(q < 0.5){ d += ` L${bx},${by}`; continue; }
    d += ` L${(bx - (bx - ax)/l1*q).toFixed(1)},${(by - (by - ay)/l1*q).toFixed(1)} Q${bx},${by} ${(bx + (cx - bx)/l2*q).toFixed(1)},${(by + (cy - by)/l2*q).toFixed(1)}`; }
  const e = P[P.length - 1]; return d + ` L${e[0]},${e[1]}`; }
const T9CSC = 1.25;   // 그림 1 단위 = 1.25 px (블럭이 많아 그림이 넓어지면 상자 안에서 가로 · 세로로 넘겨 봄)
function t9CoolSVG(C){ const by = new Map(C.blocks.map(b => [b.id, b])), W = Math.max(900, ...C.blocks.map(b => b.x + T9CBW + 60)), H = Math.max(200, ...C.blocks.map(b => b.y + T9CBH + 20));
  const pin = b => [b.x, b.y + T9CBH/2], pout = b => [b.x + T9CBW, b.y + T9CBH/2];
  let s = `<svg viewBox="0 0 ${W} ${H}" class="t9-csvg" data-t9csvg="${C.id}" style="width:${Math.round(W*T9CSC)}px">`;
  // 선 = 수평 · 수직만 (꺾이는 곳은 둥글게), 그림은 호스(수랭) · 덕트(공랭): 바깥 테두리 + 안쪽 색 + 흐름 방향으로 움직이는 무늬
  const lane = Math.max(...C.blocks.map(q => q.y + T9CBH)) + 22, H2 = Math.max(H, lane + 14);
  // 냉각수 색: 라디 출구 = 차가운 파랑, 열을 받는 블럭(모터 · 인버터 · 축전지)을 지날 때마다 붉어짐 (펌프는 그대로)
  const heat = id => { const B = by.get(id); return B && T9CB[B.t][1]==='part' ? 1 : 0; }, rk = new Map(C.blocks.map(b => [b.id, 0]));
  if(C.kind==='water') for(let it = 0; it < C.blocks.length + 1; it++) C.links.forEach(([a, b]) => { const B = by.get(b); if(!B || B.t==='rad') return; rk.set(b, Math.max(rk.get(b) || 0, (rk.get(a) || 0) + heat(a))); });
  const lv = l => (rk.get(l[0]) || 0) + heat(l[0]), mx = Math.max(1, ...C.links.map(lv));
  const col = f => { const c0 = [63, 134, 209], c1 = [217, 65, 43]; return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v)*f)).join(',')})`; };
  const nOut = id => C.links.filter(l => l[0]===id).length; let bad = '';   // 번호 동그라미는 모든 호스 위에
  // 같은 블럭에서 갈라지는 호스는 나가자마자 한 점(T 이음)에서, 같은 블럭으로 합쳐지는 호스는 들어가기 직전 한 점에서 만남 → 한 호스가 갈라지고 합쳐지는 모양
  const nIn = id => C.links.filter(l => l[1]===id).length, layers = {o:'', i:'', f:'', h:''}; let tees = '';
  C.links.forEach((l, j) => { const [a, b] = l, A = by.get(a), B = by.get(b); if(!A || !B) return; const [x1, y1] = pout(A), [x2, y2] = pin(B);
    const js = nOut(a) > 1 ? x1 + 26 : null, jm = nIn(b) > 1 ? x2 - 26 : null;                       // 갈라지는 · 합쳐지는 T 이음 자리
    let P;
    if(x2 >= (js ?? x1) + 20){ const xm = js != null ? js : jm != null ? Math.max(jm, x1 + 12) : (x1 + x2)/2;   // 갈라지면 T 이음에서 바로 내려가 들어갈 높이로, 합쳐지면 T 이음 앞에서 꺾음
      P = [[x1, y1], [xm, y1], [xm, y2], [x2, y2]]; }
    else P = [[x1, y1], [js ?? x1 + 18, y1], [js ?? x1 + 18, lane], [jm ?? x2 - 18, lane], [jm ?? x2 - 18, y2], [x2, y2]];   // 뒤로: 블럭 아래 길로
    const d = t9Ortho(P, 10), sel = C.selL===j, ic = C.kind==='water' ? ` style="stroke:${col(lv(l)/mx)}"` : '';
    layers.o += `<path d="${d}" class="o${sel ? ' sel' : ''}"/>`; layers.i += `<path d="${d}" class="i"${ic}/>`; layers.f += `<path d="${d}" class="f"/>`;
    layers.h += `<path d="${d}" class="t9-clhit" data-t9clink="${C.id}:${j}"><title>누르면 이 호스를 고름 (비율 · 지우기)</title></path>`;
    if(js != null) tees += `<circle cx="${js}" cy="${y1}" r="4.5" class="t9-tee ${C.kind}"/>`; if(jm != null) tees += `<circle cx="${jm}" cy="${y2}" r="4.5" class="t9-tee ${C.kind}"/>`;
    if(nOut(a) > 1){ const k = C.links.filter(q => q[0]===a).indexOf(l) + 1; let best = null;   // 번호는 그 갈래만 지나는 가장 긴 토막 가운데
      for(let q = 1; q < P.length - 2; q++){ const L2 = Math.hypot(P[q + 1][0] - P[q][0], P[q + 1][1] - P[q][1]); if(!best || L2 > best[0]) best = [L2, (P[q][0] + P[q + 1][0])/2, (P[q][1] + P[q + 1][1])/2]; }
      if(!best || best[0] < 24) best = [0, x2 - 30, y2];
      bad += `<g class="t9-cbadge${sel ? ' sel' : ''}" data-t9clink="${C.id}:${j}" transform="translate(${best[1]},${best[2]})"><circle r="10"/><text y="4" text-anchor="middle">${k}</text></g>`; } });
  s += `<g class="t9-hose ${C.kind}">${layers.o}${layers.i}${layers.f}</g>${tees}${layers.h}`;   // 테두리를 모두 먼저, 안쪽 색을 그 위에 → 겹친 곳에 경계가 안 보임
  s += bad;
  s = s.replace(`viewBox="0 0 ${W} ${H}"`, `viewBox="0 0 ${W} ${H2}"`);   // 아래로 돌아가는 호스 길까지
  C.blocks.forEach(b => { const [nm, kind] = T9CB[b.t], q = t9CV(b.p, t9CParams(C, b)), sel = C.sel===b.id;
    const sub = b.t==='rad' ? `${q.A} m² · UA ${q.UA}` : b.t==='pump' ? `${q.flow} L/min` : b.t==='in' ? `${q.A} m² · 팬 ${q.fan}` : kind==='part' ? (C.kind==='water' ? `냉각수 ${q.V} L` : '부품 hA') : '';
    s += `<g class="t9-cb ${kind}${sel ? ' sel' : ''}" data-t9cb="${C.id}:${b.id}" transform="translate(${b.x},${b.y})"><rect width="${T9CBW}" height="${T9CBH}" rx="7"/>
      <text x="${T9CBW/2}" y="24" text-anchor="middle" class="t9-cbn">${nm}</text><text x="${T9CBW/2}" y="42" text-anchor="middle" class="t9-cbs">${sub}</text>
      ${b.t!=='in' ? `<circle cx="0" cy="${T9CBH/2}" r="6" class="t9-cpi"/>` : ''}${b.t!=='out' ? `<circle cx="${T9CBW}" cy="${T9CBH/2}" r="7" class="t9-cpo" data-t9cpo="${C.id}:${b.id}"><title>끌어서 다음 블럭에 이음</title></circle>` : ''}</g>`; });
  if(T9CG && T9CG.cid===C.id){ if(T9CG.gx!=null) s += `<line x1="${T9CG.gx}" x2="${T9CG.gx}" y1="0" y2="${H2}" class="t9-cguide"/>`; if(T9CG.gy!=null) s += `<line y1="${T9CG.gy}" y2="${T9CG.gy}" x1="0" x2="${W}" class="t9-cguide"/>`; }   // 정렬 안내선
  return s + `<g class="t9-hose ${C.kind} drag" style="display:none"><path class="o"/><path class="i"/><path class="f"/></g><circle class="t9-cend ${C.kind}" r="9" style="display:none"/></svg>`; }   // 끄는 중인 호스 · 끝 (커서 따라감)
function t9CoolPage(){ const CC = T9.cool.circuits, nw = CC.filter(c => c.kind==='water').length, na = CC.filter(c => c.kind==='air').length, comp = t9CoolCompile(), used = new Set(CC.flatMap(c => c.blocks.map(b => b.t)));
  const card = C => { const E = comp.err[C.id], B = C.blocks.find(b => b.id===C.sel), pal = C.kind==='water' ? ['rad', 'pump', 'm', 'i', 'b'] : ['m', 'i', 'b'];
    const form = (title, def, obj, attr) => `<div class="t9-cform"><b>${title}</b>${def.map(([k, n, u, d]) => { const v = t9CV(obj, def)[k];
        return `<label class="t9-cfi"><span>${n}</span><input type="number" step="any" value="${v}" ${attr} name="${k}"><i>${u}</i></label>`; }).join('')}</div>`;
    return `<div class="t9-cc" data-t9cc="${C.id}"><div class="t9-cch"><b>${wbEsc(C.name)}</b><span class="muted">${C.kind==='water' ? '선 방향 = 냉각수 흐름 · 라디에서 나와 라디로 (갈라짐 · 합쳐짐 가능)' : '선 방향 = 공기 흐름 · 입구 → 출구'}</span>
        <span class="t9-cpal"><span class="muted">블럭 넣기</span>${pal.map(t => { const here = C.blocks.some(b => b.t===t), other = T9CB[t][1]==='part' && !here && used.has(t) ? T9.cool.circuits.find(c => c!==C && c.blocks.some(b => b.t===t)) : null, one = T9CB[t][1]==='part' && here;
      return `<button type="button" class="btn small" data-t9cadd="${C.id}:${t}"${one ? ` disabled title="${T9CB[t][0]}은 이 회로에 이미 있음 (부품은 한 곳에만)"` : other ? ` title="${wbEsc(other.name)}에서 이 회로로 옮김"` : ''}>+ ${T9CB[t][0]}${other ? ' (옮김)' : ''}</button>`; }).join('')}</span>
        <button type="button" class="btn small t9-cdel" data-t9cdel="${C.id}">회로 지우기</button></div>
      ${C.kind==='water' ? form('냉각수', T9CP.water, C.p, `data-t9cwp="${C.id}"`) : ''}
      <div class="t9-cbox">${t9CoolSVG(C)}</div>
      <p class="t9-cmsg ${E ? 'bad' : 'ok'}">${E ? '계산에서 빠짐: ' + E.join(' · ') : '이어짐 · 계산에 씀' + (comp.mode[C.id] ? ' · ' + comp.mode[C.id] : '')}</p>
      ${C.selL >= 0 && C.links[C.selL] ? (() => { const l = C.links[C.selL], A = C.blocks.find(b => b.id===l[0]), Bt = C.blocks.find(b => b.id===l[1]), o = C.links.filter(q => q[0]===l[0]);
          return `<div class="t9-csel"><div class="t9-cform"><b>호스</b><span>${T9CB[A.t][0]} → ${T9CB[Bt.t][0]}</span>${o.length > 1 && t9PumpSplit(C, new Map(C.blocks.map(b => [b.id, b])))===l[0] ? (() => { const fl = o.map(q => t9CV(C.blocks.find(b => b.id===q[1]).p, T9CP.pump).flow), sf = fl.reduce((a, b) => a + b, 0) || 1;
                return o.map((q, k) => `<span class="t9-cfi"><span>${k + 1}번 (→ 펌프 ${fl[k]} L/min)</span><b>${(fl[k]/sf*100).toFixed(1)} %</b></span>`).join('') + '<span class="muted">갈래마다 펌프 → 비율 = 펌프 유량 비</span>'; })()
            : o.length > 1 ? o.map(q => { const k = o.indexOf(q) + 1, jj = C.links.indexOf(q), Bq = C.blocks.find(b => b.id===q[1]);
              return `<label class="t9-cfi"><span>${k}번 (→ ${T9CB[Bq.t][0]}) 비율</span><input type="number" step="any" min="1" max="99" value="${(+(q[2] || 1/o.length)*100).toFixed(1)}" data-t9crat="${C.id}:${jj}"><i>%</i></label>`; }).join('') : '<span class="muted">갈라지지 않은 호스 (흐름 100 %)</span>'}</div>
            <button type="button" class="btn small" data-t9clx="${C.id}">호스 지우기</button></div>`; })() : ''}
      ${B ? `<div class="t9-csel">${t9CParams(C, B).length ? form(`${T9CB[B.t][0]} 블럭`, t9CParams(C, B), B.p, `data-t9cbp="${C.id}:${B.id}"`) : `<div class="t9-cform"><b>${T9CB[B.t][0]} 블럭</b><span class="muted">${T9CB[B.t][1]==='part' ? '부품 쪽 값(열용량 · 열저항 · hA)은 그 부품 항목에 있습니다.' : '입력 없음'}</span></div>`}
        ${B.t!=='in' && B.t!=='out' ? `<button type="button" class="btn small" data-t9cbx="${C.id}:${B.id}">블럭 지우기</button>` : ''}</div>` : (C.selL >= 0 ? '' : `<p class="muted t9-cmsg">블럭 · 호스를 누르면 입력이 여기 나옵니다 (Delete 키로 지우기). 블럭은 끌어서 옮기고, 오른쪽 점을 끌어 다른 블럭에 놓으면 이어집니다.${C.kind==='water' ? ' 한 블럭에서 호스를 둘 이상 끌어내면 갈라지고(번호 · 비율), 한 블럭으로 여러 호스가 들어오면 합쳐집니다.' : ''}</p>`)}</div>`; };
  const free = ['m', 'i', 'b'].filter(p => !used.has(p)).map(p => T9CB[p][0]);
  return `<div class="t9-cool"><div class="t9-cbar"><button type="button" class="btn small" data-t9cnew="water"${nw >= 3 ? ' disabled' : ''}>+ 수랭 회로</button><button type="button" class="btn small" data-t9cnew="air"${na >= 3 ? ' disabled' : ''}>+ 공랭 덕트</button>
      <span class="muted">수랭 · 공랭 각각 최대 3개. ${free.length ? `회로에 없는 부품(${free.join(' · ')})은 외기로 바로 식습니다 (부품 hA).` : ''} 라디에이터 · 펌프는 여러 개 넣을 수 있습니다. 처음 넣은 라디에이터가 회로의 기준(출발점)이고, 펌프가 모두 직렬이면 큰 유량, 한 곳에서 갈라진 갈래마다 하나씩이면 유량 합(갈래 비율 = 펌프 유량 비)입니다.</span></div>
    ${CC.map(card).join('')}</div>`; }
/* 고친 뒤: 저장 · 다시 그림 · (시뮬레이션 탭으로 갈 때) 계산 */
const t9CoolSet = (paint = true) => { t9Save(); if(paint) wbPaint(['ext']); wbCalcSoon(); };
const t9CC = id => T9.cool.circuits.find(c => c.id===id);
const t9Cid = (C, p) => { let k = 1; while(C.some(x => x.id===p + k)) k++; return p + k; };
document.addEventListener('click', e => { if(WB.id!=='9' || !e.target.closest) return; const t = e.target;
  const nw = t.closest('[data-t9cnew]'); if(nw){ const kind = nw.dataset.t9cnew, CC = T9.cool.circuits, n = CC.filter(c => c.kind===kind).length + 1, id = t9Cid(CC, kind==='water' ? 'w' : 'a');
    CC.push(kind==='water' ? {id, kind, name:`수랭 회로 ${n}`, p:{cp:4180, rho:1000}, sel:'', blocks:[{id:id + 'r', t:'rad', x:40, y:70, p:{}}, {id:id + 'p', t:'pump', x:300, y:70, p:{}}], links:[[id + 'r', id + 'p'], [id + 'p', id + 'r']]}
                           : {id, kind, name:`공랭 덕트 ${n}`, p:{}, sel:'', blocks:[{id:id + 'i', t:'in', x:40, y:70, p:{}}, {id:id + 'o', t:'out', x:680, y:70, p:{}}], links:[[id + 'i', id + 'o']]});
    t9CoolSet(); return; }
  const dl = t.closest('[data-t9cdel]'); if(dl){ T9.cool.circuits = T9.cool.circuits.filter(c => c.id!==dl.dataset.t9cdel); t9CoolSet(); return; }
  const ad = t.closest('[data-t9cadd]'); if(ad && !ad.disabled){ const [cid, ty] = ad.dataset.t9cadd.split(':'), C = t9CC(cid), id = t9Cid(T9.cool.circuits.flatMap(c => c.blocks), 'k');
    if(T9CB[ty][1]==='part') T9.cool.circuits.forEach(c => { if(c===C) return; const ids = c.blocks.filter(b => b.t===ty).map(b => b.id); if(!ids.length) return;   // 부품은 한 곳에만: 다른 회로에 있으면 빼 옴
      c.blocks = c.blocks.filter(b => !ids.includes(b.id)); c.links = c.links.filter(([a, b]) => !ids.includes(a) && !ids.includes(b)); });
    const xr = C.blocks.length ? Math.max(...C.blocks.map(b => b.x)) + T9CBW + 50 : 40, y0 = C.blocks.length ? C.blocks[0].y : 70;   // 맨 오른쪽 블럭 옆에 (그림이 넓어짐)
    C.blocks.push({id, t:ty, x:xr, y:y0, p:{}}); C.sel = id; t9CoolSet(); return; }
  const bx = t.closest('[data-t9cbx]'); if(bx){ const [cid, bid] = bx.dataset.t9cbx.split(':'), C = t9CC(cid); C.blocks = C.blocks.filter(b => b.id!==bid); C.links = C.links.filter(([a, b]) => a!==bid && b!==bid); C.sel = ''; t9CoolSet(); return; }
  const lk = t.closest('[data-t9clink]'); if(lk){ const [cid, j] = lk.dataset.t9clink.split(':'), C = t9CC(cid); C.selL = C.selL===+j ? -1 : +j; C.sel = ''; t9CoolSet(); return; }
  const lx = t.closest('[data-t9clx]'); if(lx){ t9CDelLink(t9CC(lx.dataset.t9clx)); return; } });
/* 고른 호스 지우기 (갈라진 곳의 나머지 비율은 다시 합 1 로) */
function t9CDelLink(C){ if(!C || !(C.selL >= 0)) return; const [l] = C.links.splice(C.selL, 1); C.selL = -1; const o = C.links.filter(q => q[0]===l[0]);
  const s = o.reduce((a, q) => a + (+q[2] > 0 ? +q[2] : 0), 0); o.forEach(q => { q[2] = o.length > 1 ? (s > 0 && +q[2] > 0 ? +q[2]/s : 1/o.length) : undefined; }); t9CoolSet(); }
/* Delete · Backspace: 고른 블럭 · 호스 지우기 (입력 칸에서는 안 함) */
document.addEventListener('keydown', e => { if(WB.id!=='9' || !['Delete', 'Backspace'].includes(e.key) || (e.target.matches && e.target.matches('input,textarea,select'))) return;
  const C = T9.cool.circuits.find(c => c.selL >= 0 || c.sel); if(!C) return; e.preventDefault();
  if(C.selL >= 0){ t9CDelLink(C); return; } const B = C.blocks.find(b => b.id===C.sel); if(!B || B.t==='in' || B.t==='out') return;
  C.blocks = C.blocks.filter(b => b.id!==B.id); C.links = C.links.filter(([a, b]) => a!==B.id && b!==B.id); C.sel = ''; t9CoolSet(); });
/* 갈라진 호스 비율 입력 (%): 하나를 바꾸면 나머지를 그 비율대로 줄이거나 늘려 합 100 % */
document.addEventListener('change', e => { if(WB.id!=='9' || !e.target.matches || !e.target.matches('[data-t9crat]')) return; const [cid, j] = e.target.dataset.t9crat.split(':'), C = t9CC(cid), l = C.links[+j];
  const o = C.links.filter(q => q[0]===l[0]), r = Math.max(0.01, Math.min(0.99, (+e.target.value || 0)/100)), rest = o.filter(q => q!==l), rs = rest.reduce((a, q) => a + (+q[2] || 0), 0);
  l[2] = r; rest.forEach(q => { q[2] = rs > 0 ? (+q[2] || 0)/rs*(1 - r) : (1 - r)/rest.length; }); t9CoolSet(); });
document.addEventListener('change', e => { if(WB.id!=='9' || !e.target.matches) return; const t = e.target;
  if(t.matches('[data-t9cbp]')){ const [cid, bid] = t.dataset.t9cbp.split(':'), B = t9CC(cid).blocks.find(b => b.id===bid); B.p = B.p || {}; B.p[t.name] = +t.value; }
  else if(t.matches('[data-t9cwp]')){ const C = t9CC(t.dataset.t9cwp); C.p = C.p || {}; C.p[t.name] = +t.value; }
  else return; t9CoolSet(); });
/* 블럭 끌기 · 선 잇기 (포인터): 블럭을 끌면 호스도 같이 따라오고, 오른쪽 점을 끌면 그 블럭의 호스가 빠져나와 커서를 따라옴 → 다른 블럭 위에서 놓으면 이어짐 */
let T9CD = null, T9CG = null;   // 끄는 중 · 정렬 안내선 {cid, gx, gy}
const t9CPt = (svg, e) => { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return [(e.clientX - r.left)/r.width*vb.width, (e.clientY - r.top)/r.height*vb.height]; };
function t9CoolRe(cid){ const old = document.querySelector(`svg[data-t9csvg="${cid}"]`); if(!old) return null; const tmp = document.createElement('div'); tmp.innerHTML = t9CoolSVG(t9CC(cid)); const n = tmp.firstElementChild; old.replaceWith(n); return n; }
const t9CTarget = (e, cid, from) => { const el = document.elementFromPoint(e.clientX, e.clientY), g = el && el.closest && el.closest('[data-t9cb]'), to = g && g.dataset.t9cb.split(':');
  if(!to || to[0]!==cid || to[1]===from) return null; const B = t9CC(cid).blocks.find(b => b.id===to[1]); return B && B.t!=='in' ? {g, id:to[1]} : null; };
document.addEventListener('pointerdown', e => { if(WB.id!=='9' || !e.target.closest) return; const svg = e.target.closest('svg[data-t9csvg]'); if(!svg) return;
  const po = e.target.closest('[data-t9cpo]');
  if(po){ const [cid, bid] = po.dataset.t9cpo.split(':'), C = t9CC(cid), old = C.kind==='air' ? C.links.filter(([a]) => a===bid) : [];
    if(C.kind==='air') C.links = C.links.filter(([a]) => a!==bid);               // 공랭 덕트(직렬): 나가던 덕트를 빼서 끌고 다님. 수랭: 새 호스를 하나 더 (갈라짐)
    T9CD = {mode:'link', cid, bid, old, svg:t9CoolRe(cid)}; t9CDrag(e); e.preventDefault(); return; }
  const g = e.target.closest('[data-t9cb]'); if(!g) return; const [cid, bid] = g.dataset.t9cb.split(':'), B = t9CC(cid).blocks.find(b => b.id===bid), [px, py] = t9CPt(svg, e);
  T9CD = {mode:'move', cid, bid, svg, dx:px - B.x, dy:py - B.y, moved:false, raf:0, sx:e.clientX, sy:e.clientY}; e.preventDefault(); });
function t9CDrag(e){ const D = T9CD, C = t9CC(D.cid), B = C.blocks.find(b => b.id===D.bid), svg = D.svg; if(!svg) return; const [px, py] = t9CPt(svg, e);
  const x1 = B.x + T9CBW, y1 = B.y + T9CBH/2, xm = Math.max(x1 + 16, (x1 + px)/2), d = t9Ortho([[x1, y1], [xm, y1], [xm, py], [px, py]], 10);
  const hg = svg.querySelector('.t9-hose.drag'), ce = svg.querySelector('.t9-cend'); hg.style.display = ''; hg.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
  ce.style.display = ''; ce.setAttribute('cx', px); ce.setAttribute('cy', py);
  svg.querySelectorAll('.t9-cb.tgt').forEach(g => g.classList.remove('tgt')); const T = t9CTarget(e, D.cid, D.bid); if(T) T.g.classList.add('tgt'); }
document.addEventListener('pointermove', e => { if(!T9CD) return; const D = T9CD;
  if(D.mode==='link'){ t9CDrag(e); return; }
  if(!D.moved && Math.hypot(e.clientX - D.sx, e.clientY - D.sy) < 5) return;   // 5 px 안쪽은 누르기 (고르기)
  const [px, py] = t9CPt(D.svg, e), C = t9CC(D.cid), B = C && C.blocks.find(b => b.id===D.bid); if(!B) return;
  // 정렬: 다른 블럭과 가운데가 8 안쪽이면 같은 수평 · 수직선에 붙이고 안내선을 그림, 아니면 10 칸 격자에 맞춤
  let x = Math.max(0, Math.min(4000, px - D.dx)), y = Math.max(0, Math.min(1500, py - D.dy)), gx = null, gy = null;
  C.blocks.forEach(o => { if(o===B) return; if(gy==null && Math.abs(y - o.y) < 8){ y = o.y; gy = o.y + T9CBH/2; } if(gx==null && Math.abs(x - o.x) < 8){ x = o.x; gx = o.x + T9CBW/2; } });
  if(gx==null) x = Math.round(x/10)*10; if(gy==null) y = Math.round(y/10)*10;
  B.x = x; B.y = y; D.moved = true; T9CG = {cid:D.cid, gx, gy};   // 오른쪽 · 아래로 끌면 그림이 넓어짐
  if(!D.raf) D.raf = requestAnimationFrame(() => { D.raf = 0; const n = t9CoolRe(D.cid); if(n) D.svg = n; }); });   // 호스도 같이 다시 그림
document.addEventListener('pointerup', e => { if(!T9CD) return; const D = T9CD, C = t9CC(D.cid); T9CD = null; if(!C) return;
  T9CG = null;
  if(D.mode==='move'){ if(D.raf) cancelAnimationFrame(D.raf); if(!D.moved){ C.sel = C.sel===D.bid ? '' : D.bid; C.selL = -1; } t9CoolSet(); return; }
  const T = t9CTarget(e, D.cid, D.bid);
  if(T){ if(C.kind==='air') C.links = C.links.filter(([, b]) => b!==T.id);                 // 공랭은 직렬: 들어오던 덕트는 하나만
          if(!C.links.some(([a, b]) => a===D.bid && b===T.id)) C.links.push([D.bid, T.id]);
          const o = C.links.filter(l => l[0]===D.bid); if(o.length > 1) o.forEach(l => { l[2] = 1/o.length; }); C.selL = -1; }   // 갈라지면 처음엔 똑같이 나눔
  else C.links.push(...D.old);                                                            // 블럭 위가 아니면 원래대로
  t9CoolSet(); });

/* ---------- 도구 2P 와 주고받기 */
const T9PART = ['th_c', 'th_r', 'm_ha0', 'm_ha60', 'i_c', 'i_r', 'i_ha0', 'i_ha60', 'b_c', 'b_r', 'b_ha', 'b_ha60', 't_amb'];   // 도구 2P 와 같은 키 (부품 열 값 · 외기)
const t9Read = id => { try{ return JSON.parse(localStorage.getItem(wbStoreKey(id)) || '{}') || {}; }catch(e){ return {}; } };
/* 부품이 수랭 회로에 있으면 1 (도구 2P 수랭), 아니면 0 (공랭 덕트 · 회로 밖 → 도구 2P 공랭 = 부품 hA) */
const t9IsWater = p => { const C = t9CoolWhere(p); return C && C.kind==='water' ? 1 : 0; };
function t9ExtHTML(){ const w = $('#wb'); if(w) w.classList.remove('t2-edit');   // 도구 2P 에서 바로 넘어온 경우
  return `<div class="t9-x">${t9XBar()}
    ${t9CoolPage()}</div>`; }
/* 주고받기 줄 (계산 결과가 바뀌면 이것만 다시 그림: onResult) */
function t9XBar(){ const o = WB.R && WB.R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—', nW = T9.cool.circuits.filter(c => c.kind==='water').length;
  return `<div class="t9-xbar"><b>도구 2P 와 주고받기</b>
      <button type="button" class="btn small" data-t9x="get" title="도구 2P 에 저장된 부품 열용량 · 열저항 · 공랭 hA · 외기 온도를 왼쪽 칸으로">도구 2P 부품 열 값 가져오기</button>
      <button type="button" class="btn small pri" data-t9x="put"${o && (o.n_w > 0 || o.n_a > 0) ? '' : ' disabled title="수랭 회로나 공랭 덕트가 계산에 들어가야 씀"'} title="도구 2P 의 수랭 방식을 [도구 9 회로]로 바꿈 (이 배치를 그대로, 바꾸면 도구 2P 다음 계산부터 반영)">도구 2P 에서 이 회로 쓰기</button>
      <span class="muted">${o && (o.n_w > 0 || o.n_a > 0) ? `도구 2P 가 쓸 배치: 수랭 회로 ${o.n_w}개 · 공랭 덕트 ${o.n_a}개 · 모터 ${t9IsWater('m') ? '수랭' : '공랭'} · 인버터 ${t9IsWater('i') ? '수랭' : '공랭'} · 축전지 ${t9IsWater('b') ? '수랭' : '공랭'} (직렬 · 병렬 · 회로 여러 개 그대로)` : '도구 2P [편집 › 냉각]의 [평균 발열 · 차속을 도구 9 로 보내기]로 왼쪽 발열 · 차속을 채울 수 있습니다.'}</span></div>`; }
document.addEventListener('click', e => { if(WB.id!=='9' || !e.target.closest) return; const b = e.target.closest('[data-t9x]'); if(!b || b.disabled) return;
  if(b.dataset.t9x==='get'){ const s = t9Read('2'), D = WB_TOOLS['2'] ? WB_TOOLS['2'].inputs : []; let n = 0;
    T9PART.forEach(k => { const d = D.find(q => q.k===k), v = typeof s[k]==='number' && isFinite(s[k]) ? s[k] : d ? d.v : NaN; if(Number.isFinite(v)){ WB.I[k] = v; n++; } });
    wbSave(); wbPaint(['in']); wbCalcSoon(); toast(`도구 2P 의 부품 열 값 ${n}개를 가져왔습니다.`); return; }
  if(b.dataset.t9x==='put'){ const o = WB.R && WB.R.out; if(!o || !(o.n_w > 0 || o.n_a > 0)) return; const s = t9Read('2');
    Object.assign(s, {cw_mode:1, m_cool:t9IsWater('m'), i_cool:t9IsWater('i'), b_cool:t9IsWater('b'), cw_on:1, t_amb:WB.I.t_amb});   /* 공랭 / 수랭 단추도 맞춰 둠 (부품별 독립으로 돌아갈 때) */
    try{ localStorage.setItem(wbStoreKey('2'), JSON.stringify(s)); toast('도구 2P 가 이 회로 배치를 씁니다 (수랭 방식 = 도구 9 회로, 냉각수 온도 계산 켬). 배치를 바꾸면 도구 2P 다음 계산부터 반영됩니다.'); }catch(err){ toast('저장하지 못했습니다.'); } } });

/* ============================================================ 이 탭 사용법 */
const M9TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 손계산 비교표), 입력 내보내기 · 가져오기입니다. 냉각 배치는 이 브라우저에 기억됩니다.'],
  ['#wb .wb-in', '입력', '주행 조건(외기 · 평균 차속 · 주행 시간 · 출발 온도), 주행 평균 발열(모터 · 인버터 손실, 축전지 발열), 부품 열 값(열용량 · 냉각수까지 열저항 · 공랭 hA)입니다. 발열은 일정하다고 봅니다. 도구 2P 에서 보내거나 [도구 2P 부품 열 값 가져오기]로 채웁니다.'],
  ['#wb .t9-xbar', '도구 2P 와 주고받기', '[도구 2P 에서 이 회로 쓰기]를 누르면 도구 2P 랩타임 시뮬레이터가 이 배치(수랭 회로 · 라디 · 펌프 · 공랭 덕트)를 그대로 써서 주행 중 온도를 셉니다 (수랭 방식 = 도구 9 회로). [도구 2P 에서 가져오기]는 도구 2P 의 부품 열 값을 이 도구로 가져옵니다. 결과의 등가값은 회로를 냉각수 하나로 줄인 참고값 (대시보드 냉각 값)입니다.'],
  ['#wb .t9-cool', '냉각 배치', '수랭 회로 · 공랭 덕트를 블럭으로 놓고 오른쪽 점을 끌어 다음 블럭에 이어 줍니다(선 방향 = 냉각수 · 공기 흐름). 블럭은 끌어서 옮기고(다른 블럭과 줄이 맞으면 붙음), 누르면 입력(라디 면적 · UA · 팬, 펌프 유량, 냉각수 양)이 나옵니다. 한 블럭에서 호스를 둘 이상 끌어내면 갈라지고(번호 · 비율 %), 여러 호스가 한 블럭으로 들어오면 합쳐집니다. 호스 · 블럭을 누르고 Delete 키로 지웁니다. 수랭은 라디에이터 1개 이상(처음 넣은 라디가 기준) · 펌프 1개, 공랭은 입구 → 부품 → 출구. 회로에 없는 부품은 외기로 바로 식습니다.'],
  ['#wb #wbout', '결과', '정상 온도(평균 차속에서 발열이 계속될 때), 주행 시간 뒤 온도(출발 온도에서), 도구 2P 등가값입니다. 수랭 회로 1 의 라디 입구는 들어오는 냉각수가 섞인 온도, 출구는 기준 라디에서 나가는 온도입니다.'],
  ['#wb .wb-sig', '온도 그래프', '출발 온도에서 주행 시간 동안 부품 · 냉각수(회로마다 라디 입구) 온도입니다. 가로축을 입력 훑기로 바꾸면 평균 차속 · 발열 등을 바꿔 가며 정상 온도를 볼 수 있습니다.'],
];

/* ============================================================ 도구 정의 */
const T9G = {run:'주행 조건', heat:'발열 (주행 평균, 일정)', m:'모터 열', i:'인버터 열', b:'축전지 열'};
WB_TOOLS['9'] = {
  no:'9', stage:'P4-5', name:'냉각 계통 계산기',
  x:{n:'시간', u:'s'},
  sweepFirst:'v',
  inputs:[
    {k:'t_amb', n:'외기 온도', u:'°C', v:25, d:0, g:T9G.run}, {k:'v', dk:'v_end_avg', n:'평균 차속', u:'km/h', v:53, d:1, g:T9G.run, sw:[0, 120]},
    {k:'t_run', n:'주행 시간', u:'s', v:1390, d:0, g:T9G.run}, {k:'t0', n:'출발 온도', u:'°C', v:25, d:0, g:T9G.run},
    {k:'L_m', dk:'q_mot', n:'모터 손실', u:'W', v:750, d:0, g:T9G.heat}, {k:'L_i', dk:'q_inv', n:'인버터 손실', u:'W', v:490, d:0, g:T9G.heat}, {k:'L_b', dk:'q_bat', n:'축전지 발열', u:'W', v:1180, d:0, g:T9G.heat},
    {k:'th_c', n:'모터 열용량', u:'J/K', v:6000, d:0, g:T9G.m}, {k:'th_r', n:'모터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.02, d:4, g:T9G.m},
    {k:'m_ha0', n:'모터 공랭 hA (정지)', u:'W/K', v:10, d:1, g:T9G.m}, {k:'m_ha60', n:'모터 공랭 hA (60 km/h)', u:'W/K', v:40, d:1, g:T9G.m},
    {k:'i_c', n:'인버터 열용량', u:'J/K', v:2000, d:0, g:T9G.i}, {k:'i_r', n:'인버터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T9G.i},
    {k:'i_ha0', n:'인버터 공랭 hA (정지)', u:'W/K', v:5, d:1, g:T9G.i}, {k:'i_ha60', n:'인버터 공랭 hA (60 km/h)', u:'W/K', v:20, d:1, g:T9G.i},
    {k:'b_c', n:'축전지 열용량', u:'J/K', v:30000, d:0, g:T9G.b}, {k:'b_r', n:'축전지 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T9G.b},
    {k:'b_ha', n:'축전지 공랭 hA (정지)', u:'W/K', v:15, d:1, g:T9G.b}, {k:'b_ha60', n:'축전지 공랭 hA (60 km/h)', u:'W/K', v:15, d:1, g:T9G.b},
  ],
  outGroups:{'한 덩어리로 줄인 등가값 (대시보드 · 참고)':{note:'회로를 냉각수 하나로 줄인 값 (UA = 냉각수로 버린 열 ÷ (손실 가중 평균 냉각수 온도 − 외기)). 도구 2P 는 [도구 9 회로] 방식이면 배치를 그대로 쓰고, 이 값은 대시보드 냉각 값으로만 씀'}},
  outputs:[
    {k:'s_tm', n:'모터', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_ti', n:'인버터', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_tb', n:'축전지', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'s_win', n:'라디 입구 (수랭 회로 1, 섞인 온도)', u:'°C', d:2, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_wout', n:'라디 출구 (수랭 회로 1 기준 라디)', u:'°C', d:2, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'s_qw', n:'냉각수로 버리는 열', u:'W', d:0, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_qa', n:'공기로 바로 버리는 열', u:'W', d:0, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'e_tm', n:'모터', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'}, {k:'e_ti', n:'인버터', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'}, {k:'e_tb', n:'축전지', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'},
    {k:'e_win', n:'라디 입구 (수랭 회로 1)', u:'°C', d:2, g:'주행 시간 뒤 (출발 온도에서)'},
    {k:'q_cw', dk:'cool_c', n:'냉각수 열용량 (모든 수랭 회로)', u:'J/K', d:0, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'}, {k:'q_ua0', dk:'cool_ua0', n:'라디에이터 UA 등가 (정지)', u:'W/K', d:1, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'},
    {k:'q_ua60', dk:'cool_ua60', n:'라디에이터 UA 등가 (60 km/h)', u:'W/K', d:1, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'},
    {k:'n_w', n:'수랭 회로 수', u:'', d:0, g:'정상 온도 (평균 차속, 발열 일정)', hide:true}, {k:'n_a', n:'공랭 덕트 수', u:'', d:0, g:'정상 온도 (평균 차속, 발열 일정)', hide:true},
  ],
  sigs:[
    {k:'tm', n:'모터 온도', u:'°C', d:1}, {k:'ti', n:'인버터 온도', u:'°C', d:1}, {k:'tb', n:'축전지 온도', u:'°C', d:1},
    {k:'w1', n:'수랭 회로 1 라디 입구', u:'°C', d:2}, {k:'w2', n:'수랭 회로 2 라디 입구', u:'°C', d:2}, {k:'w3', n:'수랭 회로 3 라디 입구', u:'°C', d:2},
  ],
  sigOn:['tm', 'ti', 'tb', 'w1'],
  xiStart:'end',
  onResult(){ const x = document.querySelector('#wbext .t9-xbar'); if(x) x.outerHTML = t9XBar(); },
  extHTML: t9ExtHTML, extraI: () => ({cool: t9CoolCompile().net}),
  tour: M9TOUR,
  verifyBase:{cool:{water:[], air:[]}, t_run:0, t0:25, t_amb:25},
  verify: [
    {n:'수랭 직렬 · 라디 → 펌프 → 인버터 → 모터 (펌프 8 L/min, 라디 0.06 m² · UA 250 W/K @ 5 m/s, 주행풍 비율 0.3, 158.07 km/h)', I:{v:158.0724, L_m:215.371, L_i:113.353, L_b:0, th_r:0.02, i_r:0.05, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[3, 1]], UA:250, A:0.06, kd:0.3, fan:0}, {t:'pump', C:418, q:1, ins:[[0, 1]]}, {t:'part', part:'i', C:836, q:1, ins:[[1, 1]]}, {t:'part', part:'m', C:1254, q:1, ins:[[2, 1]]}], Cc:557.3333333333334}], air:[]}}, expect:{s_win:26.256943, s_wout:25.667127, s_ti:31.538161, s_tm:30.564363},
     src:'C_c = 8 L/min × 1000 × 4180 = 557.33 W/K. 공기 = 0.06 × 0.3 × 43.909 = 0.790 m³/s → C_a = 953.2 W/K, 코어 풍속 13.17 m/s → UA = 250 × (13.17 ÷ 5)^0.6 = 447.05 W/K, NTU = 0.802, C_r = 0.585 → ε C_min = 261.527 W/K. 라디 입구 = 25 + 328.724 ÷ 261.527 = 26.2569, 출구 = 25 + (1 − 261.527 ÷ 557.33) × 1.2569 = 25.6671, 인버터 점 = + 113.353 ÷ 557.33 → 인버터 = + 113.353 × 0.05 = 31.5382, 모터 점 = + 215.371 ÷ 557.33 = 26.2569 → 모터 = + 215.371 × 0.02 = 30.5644'},
    {n:'수랭 병렬 · 펌프 뒤 인버터 40 % · 모터 60 % 로 갈라져 라디 앞에서 합쳐짐', I:{v:158.0724, L_m:215.371, L_i:113.353, L_b:0, th_r:0.02, i_r:0.05, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[2, 0.4], [3, 0.6]], UA:250, A:0.06, kd:0.3, fan:0}, {t:'pump', C:418, q:1, ins:[[0, 1]]}, {t:'part', part:'i', C:836, q:0.4, ins:[[1, 0.4]]}, {t:'part', part:'m', C:1254, q:0.6, ins:[[1, 0.6]]}], Cc:557.3333333333334}], air:[]}}, expect:{s_win:26.256943, s_ti:31.843238, s_tm:30.618599},
     src:'라디 입구 (섞인 온도) = 직렬과 같은 25 + 328.724 ÷ (ε C_min) = 26.2569, 출구 25.6671. 인버터 점 = 25.6671 + 113.353 ÷ (0.4 × 557.33) → 인버터 = + 113.353 × 0.05 = 31.8432, 모터 점 = 25.6671 + 215.371 ÷ (0.6 × 557.33) → 모터 = + 215.371 × 0.02 = 30.6186'},
    {n:'수랭 라디 두 개 직렬 (라디 1 → 라디 2 → 펌프 → 모터, 라디 2 = 0.04 m² · UA 150 · 팬 0.05 m³/s, 50 km/h, 모터 600 W) · 도구 2P 등가값', I:{v:50, L_m:600, L_i:0, L_b:0, th_r:0.02, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[3, 1]], UA:250, A:0.06, kd:0.3, fan:0}, {t:'rad', C:1672, q:1, ins:[[0, 1]], UA:150, A:0.04, kd:0.3, fan:0.05}, {t:'pump', C:418, q:1, ins:[[1, 1]]}, {t:'part', part:'m', C:1254, q:1, ins:[[2, 1]]}], Cc:557.3333333333334}], air:[]}}, expect:{s_tm:39.774050, s_win:27.774050, q_ua60:235.993669, q_cw:5852},
     src:'라디마다 버리는 몫 a = ε C_min ÷ C_c: a₁ = 0.245361, a₂ = 0.189123. 모터 점 − 외기 = (600 ÷ 557.33) ÷ (1 − (1 − a₁)(1 − a₂)) = 2.7741 → 모터 = 27.7741 + 600 × 0.02 = 39.7741. 60 km/h 에서 같은 식 → UA 등가 = 600 ÷ (모터 점 − 외기) = 235.994 W/K. 열용량 = (0.6 + 0.4 + 0.1 + 0.3) L × 1000 × 4180 = 5852 J/K'},
    {n:'공랭 덕트 · 인버터 → 축전지 (입구 0.02 m², 주행풍 비율 0.5, 팬 0.03 m³/s, 40 km/h, 인버터 300 W · 축전지 200 W)', I:{v:40, L_m:0, L_i:300, L_b:200, i_ha0:5, i_ha60:20, b_ha:15, b_ha60:30, cool:{water:[], air:[{A:0.02, kd:0.5, fan:0.03, parts:['i', 'b']}]}}, expect:{s_ti:45.894366, s_tb:35.364834, s_qa:500},
     src:'공기 = 0.02 × 0.5 × 11.111 + 0.03 = 0.1411 m³/s → C_a = 170.18 W/K. hA(40 km/h): 인버터 5 + 15 × 40 ÷ 60 = 15, 축전지 15 + 15 × 40 ÷ 60 = 25 W/K → G = C_a (1 − e^(−hA ÷ C_a)). 인버터 = 25 + 300 ÷ G_i = 45.8944, 축전지 = 25 + 300 ÷ 170.18 (앞 부품이 데운 공기) + 200 ÷ G_b = 35.3648'},
    {n:'회로 밖 부품 · 외기로 바로 (모터 hA 정지 10 · 60 km/h 40 W/K, 30 km/h, 500 W) · 시간에 따라 (열용량 6000 J/K, 600 s)', I:{v:30, L_m:500, L_i:0, L_b:0, m_ha0:10, m_ha60:40, th_c:6000, t_run:600, t0:25, cool:{water:[], air:[]}}, expect:{s_tm:45, e_tm:43.358300},
     src:'hA = 10 + (40 − 10) × 30 ÷ 60 = 25 W/K → 정상 = 25 + 500 ÷ 25 = 45 °C, 600 s 뒤 = 25 + 20 × (1 − e^(−25 × 600 ÷ 6000)) = 43.3583 °C'},
    {n:'도구 2P 등가값 · 팬 라디 (라디 → 펌프 → 인버터, 팬 0.08 m³/s, 정지 · 60 km/h)', I:{v:50, L_m:0, L_i:400, L_b:0, i_r:0.05, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[2, 1]], UA:250, A:0.06, kd:0.3, fan:0.08}, {t:'pump', C:418, q:1, ins:[[0, 1]]}, {t:'part', part:'i', C:836, q:1, ins:[[1, 1]]}], Cc:557.3333333333334}], air:[]}}, expect:{q_ua0:63.210299, q_ua60:174.316836},
     src:'부품이 하나면 냉각수 점 − 외기 = Q ÷ (ε C_min) → UA 등가 = ε C_min. 정지: 공기 = 팬 0.08 m³/s → C_a = 96.48 W/K, 코어 풍속 1.333 m/s → UA = 250 × (1.333 ÷ 5)^0.6 → ε C_min = 63.210 W/K. 60 km/h: 공기 = 0.06 × 0.3 × 16.667 + 0.08 = 0.38 m³/s → ε C_min = 174.317 W/K'},
    {n:'시간에 따라 · 오래 달리면 정상 온도에 닿음 (직렬 회로, 출발 25 °C, 20000 s)', I:{v:158.0724, L_m:215.371, L_i:113.353, L_b:0, th_r:0.02, i_r:0.05, th_c:500, i_c:500, t_run:20000, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[3, 1]], UA:250, A:0.06, kd:0.3, fan:0}, {t:'pump', C:418, q:1, ins:[[0, 1]]}, {t:'part', part:'i', C:836, q:1, ins:[[1, 1]]}, {t:'part', part:'m', C:1254, q:1, ins:[[2, 1]]}], Cc:557.3333333333334}], air:[]}}, expect:{e_tm:30.564363, e_ti:31.538161, e_win:26.256943},
     src:'칸마다 지수 적분한 냉각수 · 부품 온도가 시상수(냉각수 전체 5016 J/K ÷ ε C_min 261.5 W/K ≈ 19 s)보다 아주 긴 시간 뒤 첫째 경우의 손계산 정상 온도와 같아짐'},
    {n:'병렬 펌프 · 라디 → (펌프 8 L/min → 인버터) · (펌프 4 L/min → 모터) → 라디 (회로 유량 = 합 12 L/min, 갈래 비율 = 펌프 유량 비 2/3 · 1/3)', I:{v:158.0724, L_m:215.371, L_i:113.353, L_b:0, th_r:0.02, i_r:0.05, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[3, 2/3], [4, 1/3]], UA:250, A:0.06, kd:0.3, fan:0}, {t:'pump', C:418, q:2/3, ins:[[0, 2/3]]}, {t:'pump', C:418, q:1/3, ins:[[0, 1/3]]}, {t:'part', part:'i', C:836, q:2/3, ins:[[1, 2/3]]}, {t:'part', part:'m', C:1254, q:1/3, ins:[[2, 1/3]]}], Cc:836}], air:[]}}, expect:{s_win:26.160986, s_ti:31.638810, s_tm:30.848058},
     src:'C_c = 12 L/min × 1000 × 4180 ÷ 60000 = 836 W/K → ε C_min = 283.142 W/K (C_a = 953.2, NTU = 1.79). 라디 입구 = 25 + 328.724 ÷ 283.142 = 26.1610, 출구 = 25 + (1 − 283.142 ÷ 836) × 1.1610. 인버터 점 = 출구 + 113.353 ÷ (2/3 × 836) → 인버터 = + 113.353 × 0.05 = 31.6388, 모터 점 = 출구 + 215.371 ÷ (1/3 × 836) → 모터 = + 215.371 × 0.02 = 30.8481'}
  ],
  code: `// ================================================================
// 도구 9 냉각 계통 계산기 — 계산 코드
// ================================================================
// 입력 I : 왼쪽 입력 칸과 작업창 위 냉각 배치
//   t_amb 외기 [°C], v 평균 차속 [km/h], t_run 주행 시간 [s], t0 출발 온도 (모든 부품 · 냉각수) [°C]
//   L_m · L_i · L_b = 모터 손실 · 인버터 손실 · 축전지 발열 (주행 평균, 일정하다고 봄) [W]  (도구 2P [냉각] 탭에서 보낼 수 있음)
//   부품: 열용량 th_c · i_c · b_c [J/K], 냉각수까지 열저항 th_r · i_r · b_r [K/W], 공랭 hA (정지 · 60 km/h) m_ha0 · m_ha60 · i_ha0 · i_ha60 · b_ha · b_ha60 [W/K]
//   I.cool = {water: [{nodes: [{t, part, C, q, ins, UA, A, kd, fan}], Cc}], air: [{A, kd, fan, parts}]}   (배치 → 계산용, 작업창이 만듦)
//     water 점 = 위상 정렬 순서 (0 번 = 기준 라디), C = 그 점 냉각수 열용량 [J/K], q = 그 점을 지나는 흐름 몫, ins = [[앞 점, 흐름 몫]], Cc = 펌프 유량 × ρ × c_p [W/K]
//
// 모델 (도구 2P 와 같은 덩어리 열 모델, 회로를 블럭으로):
//   부품 p   : C_p dT_p/dt = L_p − (T_p − T_k) ÷ R_p (수랭, T_k = 그 부품 냉각수 점) · − G (T_p − T_공기) (공랭 덕트) · − hA(v) (T_p − T_외기) (어디에도 없음)
//   냉각수 점 k (잘 섞인 덩어리): C_k dT_k/dt = q_k C_c (T_섞임 − T_k) + (T_p − T_k) ÷ R_p,   T_섞임 = Σ f_j T_j ÷ Σ f_j (들어오는 호스 흐름 몫 f)
//   라디에이터 점: C_k dT_k/dt = q_k C_c (T_섞임 − T_k) − ε C_min (T_섞임 − T_외기)   (교차류 양쪽 안 섞임 ε-NTU, 라디마다 자기 공기 쪽 값, 그 라디 흐름 q_k C_c 기준)
//     공기 C_a = ρ_a c_pa (A k_d v + 팬 유량), 코어 풍속 = 공기 유량 ÷ A, UA = UA_5 (코어 풍속 ÷ 5 m/s)^0.6
//   공랭 덕트: 공기 C_a 가 블럭 순서대로 지나감, 부품 → 공기 G = C_a (1 − e^(−hA ÷ C_a)), 공기 온도 += G (T_p − T_공기) ÷ C_a (앞 부품 열로 데워짐)
//   방열 능력 h(v) = h_0 + (h_60 − h_0) × v ÷ 60 km/h
// 정상 상태 (dT/dt = 0, 바로 풂):
//   수랭 부품 점 T_k = T_섞임 + L_p ÷ (q_k C_c),  펌프 점 T_k = T_섞임,  라디 점 T_k = T_섞임 − a_k (T_섞임 − T_외기), a_k = ε C_min ÷ (q_k C_c)
//   → 회로마다 점 온도에 대한 1차 연립식 (가우스 소거). 부품 = 그 점 + L_p R_p
//   공랭 덕트 j 번째 부품: T_공기,입 = T_외기 + Σ(앞 부품 L) ÷ C_a,  T_p = T_공기,입 + L_p ÷ G_p.  어디에도 없는 부품: T_p = T_외기 + L_p ÷ hA(v)
// 도구 2P 등가값 (냉각수 한 덩어리로 줄임): 열용량 = 모든 수랭 회로 점 열용량 합,
//   UA_등가(v) = Q_냉각수 ÷ (T̄ − T_외기),  Q_냉각수 = 수랭 부품 손실 합,  T̄ = 수랭 부품이 붙은 점 온도를 손실로 가중 평균 (정지 · 60 km/h 에서 각각)
//   → 도구 2P 의 냉각수 온도 = T_외기 + Q ÷ UA = T̄, 부품 = T̄ + L R (수랭 부품이 하나면 이 계산기와 같음)

function calc(I) {
  const Ta = isFinite(I.t_amb) ? I.t_amb : 25, NET = I.cool && typeof I.cool === 'object' ? I.cool : { water: [], air: [] };
  const RHOA = 1.2, CPA = 1005;
  const L = { m: Math.max(0, I.L_m || 0), i: Math.max(0, I.L_i || 0), b: Math.max(0, I.L_b || 0) };
  const hV = (h0, h60, v) => Math.max(0, (h0 || 0) + ((Number.isFinite(h60) ? h60 : (h0 || 0)) - (h0 || 0)) * v / (60 / 3.6));
  const PR = { m: Math.max(1e-9, I.th_r), i: Math.max(1e-9, I.i_r), b: Math.max(1e-9, I.b_r) };       // 냉각수까지 열저항 [K/W]
  const PC = { m: Math.max(1, I.th_c), i: Math.max(1, I.i_c), b: Math.max(1, I.b_c) };              // 열용량 [J/K]
  const PH = { m: v => hV(I.m_ha0, I.m_ha60, v), i: v => hV(I.i_ha0, I.i_ha60, v), b: v => hV(I.b_ha, I.b_ha60, v) };   // 공랭 hA [W/K]
  const W = NET.water || [], A = NET.air || [];
  const where = {};   // 부품 → {w: 회로 번호, k: 점 번호} · {a: 덕트 번호, j: 덕트 안 순서}
  W.forEach((C, w) => C.nodes.forEach((nd, k) => { if (nd.part) where[nd.part] = { w, k }; }));
  A.forEach((D, a) => D.parts.forEach((p, j) => { if (!where[p]) where[p] = { a, j }; }));
  const epsX = (NTU, Cr) => NTU <= 0 ? 0 : Cr < 1e-9 ? 1 - Math.exp(-NTU) : 1 - Math.exp(Math.pow(NTU, 0.22) / Cr * (Math.exp(-Cr * Math.pow(NTU, 0.78)) - 1));
  // 라디 점 k 가 섞인 냉각수 열 중 외기로 버리는 몫 a_k = ε C_min ÷ F  (F = 이 라디 흐름 q_k C_c)
  function radA(C, nd, v) {
    const F = (nd.q || 1) * C.Cc, qa = Math.max(0, nd.A * nd.kd * v + nd.fan), Ca = RHOA * CPA * qa, Vf = nd.A > 0 ? qa / nd.A : 0;
    const UA = Vf > 0 ? nd.UA * Math.pow(Vf / 5, 0.6) : 0, Cm = Math.min(Ca, F), Cx = Math.max(Ca, F), e = Cm > 0 && F > 0 ? epsX(UA / Cm, Cm / Cx) : 0;
    return F > 0 ? e * Cm / F : 0; }
  const mixOf = (nd, c, k, N) => { const ins = nd.ins || [[(k - 1 + N) % N, 1]]; let fs = 0, ft = 0; ins.forEach(([j, f]) => { fs += f; ft += f * c[j]; }); return fs > 0 ? ft / fs : c[k]; };

  // ---------- 정상 상태 (차속 v [m/s])
  function steady(v) {
    const T = { m: NaN, i: NaN, b: NaN }, cs = [], rin = [];
    W.forEach((C, w) => { const N = C.nodes.length, M = C.nodes.map(() => new Array(N + 1).fill(0));   // M c = 오른쪽 (마지막 열)
      C.nodes.forEach((nd, k) => { const ins = nd.ins || [[(k - 1 + N) % N, 1]], fs = ins.reduce((a, [, f]) => a + f, 0);
        const a = nd.t === 'rad' ? radA(C, nd, v) : 0, Fk = (nd.q || 1) * C.Cc;
        // T_k − (1 − a) Σ (f_j ÷ fs) T_j = a T_외기 + (부품 손실 ÷ F)
        M[k][k] += 1; ins.forEach(([j, f]) => { M[k][j] -= (1 - a) * f / fs; });
        M[k][N] = a * Ta + (nd.part && Fk > 0 ? L[nd.part] / Fk : 0); });
      const c = gauss(M, N); cs.push(c); rin.push(c ? mixOf(C.nodes[0], c, 0, N) : NaN); });
    let Qw = 0, Sw = 0;
    for (const p of ['m', 'i', 'b']) { const wh = where[p];
      if (wh && wh.w != null) { const c = cs[wh.w]; const Tk = c ? c[wh.k] : NaN; T[p] = Tk + L[p] * PR[p]; Qw += L[p]; Sw += L[p] * Tk; }
      else if (wh && wh.a != null) { const D = A[wh.a], Ca = RHOA * CPA * Math.max(0, D.A * D.kd * v + D.fan), hp = PH[p](v), G = Ca > 0 ? Ca * (1 - Math.exp(-hp / Ca)) : 0;
        const pre = D.parts.slice(0, wh.j).reduce((s, q) => s + L[q], 0), Tin = Ca > 0 ? Ta + pre / Ca : Infinity;
        T[p] = G > 0 ? Tin + L[p] / G : (L[p] > 0 ? Infinity : Tin); }
      else { const h = PH[p](v); T[p] = h > 0 ? Ta + L[p] / h : (L[p] > 0 ? Infinity : Ta); } }
    const Tbar = Qw > 0 ? Sw / Qw : NaN;
    return { T, cs, rin, Qw, Tbar, UA: Qw > 0 && isFinite(Tbar) ? (Tbar - Ta > 1e-12 ? Qw / (Tbar - Ta) : Infinity) : NaN };
  }
  // 가우스 소거 (부분 피벗). 풀 수 없으면 (외기로 버릴 길이 없음) null
  function gauss(M, N) { const a = M.map(r => r.slice());
    for (let c = 0; c < N; c++) { let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < 1e-12) return null; [a[c], a[p]] = [a[p], a[c]];
      for (let r = 0; r < N; r++) { if (r === c) continue; const f = a[r][c] / a[c][c]; if (f) for (let q = c; q <= N; q++) a[r][q] -= f * a[c][q]; } }
    return a.map((r, k) => r[N] / r[k]); }

  // ---------- 시간에 따라 (출발 온도에서 t_run 동안, 손실 · 차속 일정): 칸마다 지수 적분, 흐름 순서대로 (도구 2P 와 같은 방식)
  const toward = (T, Teq, k, dt) => Teq + (T - Teq) * Math.exp(-k * dt);
  const v0 = Math.max(0, I.v || 0) / 3.6, tEnd = Math.max(0, I.t_run || 0), t0 = isFinite(I.t0) ? I.t0 : Ta;
  const h = 0.25, nStep = Math.min(400000, Math.ceil(tEnd / h)), every = Math.max(1, Math.round(nStep / 600));
  const T = { m: t0, i: t0, b: t0 }, c = W.map(C => C.nodes.map(() => t0));
  const aK = W.map(C => C.nodes.map(nd => nd.t === 'rad' ? radA(C, nd, v0) : 0));
  const xs = [0], S = { tm: [t0], ti: [t0], tb: [t0], w1: [W[0] ? t0 : NaN], w2: [W[1] ? t0 : NaN], w3: [W[2] ? t0 : NaN] };
  const rinOf = w => W[w] ? mixOf(W[w].nodes[0], c[w], 0, W[w].nodes.length) : NaN;
  for (let s = 1; s <= nStep; s++) { const dt = Math.min(h, tEnd - (s - 1) * h);
    W.forEach((C, w) => { const N = C.nodes.length;
      for (let k = 0; k < N; k++) { const nd = C.nodes[k], mix = mixOf(nd, c[w], k, N), F = (nd.q || 1) * C.Cc;
        if (nd.t === 'rad') { c[w][k] = toward(c[w][k], mix - aK[w][k] * (mix - Ta), F / nd.C, dt); continue; }
        const p = nd.part, G = p ? 1 / PR[p] : 0;
        c[w][k] = F + G > 0 ? toward(c[w][k], (F * mix + G * (p ? T[p] : 0)) / (F + G), (F + G) / nd.C, dt) : c[w][k]; } });
    for (const p of ['m', 'i', 'b']) { const wh = where[p];
      if (wh && wh.w != null) T[p] = toward(T[p], c[wh.w][wh.k] + L[p] * PR[p], 1 / (PR[p] * PC[p]), dt);
      else if (!wh) { const hh = PH[p](v0); T[p] = hh > 0 ? toward(T[p], Ta + L[p] / hh, hh / PC[p], dt) : T[p] + L[p] * dt / PC[p]; } }
    A.forEach(D => { const Ca = RHOA * CPA * Math.max(0, D.A * D.kd * v0 + D.fan); let Tair = Ta;
      D.parts.forEach(p => { const G = Ca > 0 ? Ca * (1 - Math.exp(-PH[p](v0) / Ca)) : 0;
        T[p] = G > 0 ? toward(T[p], Tair + L[p] / G, G / PC[p], dt) : T[p] + L[p] * dt / PC[p]; if (Ca > 0) Tair += G * (T[p] - Tair) / Ca; }); });
    if (s % every === 0 || s === nStep) { xs.push(Math.min(tEnd, s * h)); S.tm.push(T.m); S.ti.push(T.i); S.tb.push(T.b); S.w1.push(rinOf(0)); S.w2.push(rinOf(1)); S.w3.push(rinOf(2)); } }

  const ss = steady(v0), s0 = steady(0), s60 = steady(60 / 3.6), r0 = ss.cs[0], fin = x => isFinite(x) ? x : NaN;
  const Lsum = L.m + L.i + L.b;
  const out = {
    s_tm: fin(ss.T.m), s_ti: fin(ss.T.i), s_tb: fin(ss.T.b),                         // 정상 온도 [°C] (평균 차속)
    s_win: W[0] ? fin(ss.rin[0]) : NaN, s_wout: W[0] && r0 ? fin(r0[0]) : NaN,         // 첫 수랭 회로 기준 라디 입구 (섞인 온도) · 출구 [°C]
    s_qw: ss.Qw, s_qa: Lsum - ss.Qw,                                                   // 냉각수로 · 공기로 바로 버리는 열 [W]
    e_tm: T.m, e_ti: T.i, e_tb: T.b, e_win: rinOf(0),                                  // 주행 시간 뒤 [°C]
    q_cw: W.reduce((s, C) => s + C.nodes.reduce((a, nd) => a + nd.C, 0), 0),           // 도구 2P 냉각수 열용량 [J/K]
    q_ua0: s0.Qw > 0 ? fin(s0.UA) : NaN, q_ua60: s60.Qw > 0 ? fin(s60.UA) : NaN,       // 도구 2P 라디에이터 UA (정지 · 60 km/h) [W/K]
    n_w: W.length, n_a: A.length,
  };
  if (!W.length) out.q_cw = NaN;
  return { out, x: { d: xs }, sig: S };
}
`
};
