/* ---------- 냉각 블럭 배치 (시뮬링크처럼, 2026-11-06 도구 2P 편집 탭에서 옮겨 옴 · 2026-11-09 조작을 시뮬링크식으로)
   수랭 회로 (최대 3개): 라디에이터 · 펌프 · 모터 · 인버터 · 축전지 블럭을 라디에서 나와 라디로 돌아오게 이음 (라디 · 펌프 1개 이상, 처음 라디가 기준, 선 방향 = 냉각수 흐름, 갈라짐 · 합쳐짐 가능)
     갈래 유량 = 호스 안지름 · 길이와 블럭 압력 강하로 계산 (coolHydSolve), 펌프가 여럿이면: 모두 전체 흐름이 지나가는 자리(직렬) = 회로 유량은 그중 큰 유량,
     한 곳에서 갈라진 갈래마다 펌프가 바로 붙어 있으면(병렬) = 회로 유량은 유량 합, 갈래 유량 = 펌프 유량. 둘을 섞으면 오류
   공랭 덕트 (최대 3개): 입구 → 부품 … → 출구 (선 방향 = 공기 흐름, 앞 부품 열로 공기가 데워짐, 갈라짐 · 합쳐짐 가능 · 갈래 비율은 입력)
   부품(모터 · 인버터 · 축전지)은 전체에서 한 번만 놓을 수 있고, 어디에도 없으면 외기로 바로 식음 (부품 hA)
   호스 = [앞 블럭, 뒤 블럭, 갈래 비율 (공랭), {d 안지름 mm, len 길이 m, pts 꺾임점}] */
const T9CB = { rad:['라디에이터', 'rad'], pump:['펌프', 'pump'], m:['모터', 'part'], i:['인버터', 'part'], b:['축전지', 'part'], in:['공기 입구', 'io'], out:['공기 출구', 'io'], j:['합류 · 분기점', 'node'] };   /* j = 호스 · 덕트 위에 이어 붙이면 생기는 점 (블럭 넣기 목록에는 없음) */
const T9CP = {   // 블럭 입력 [키, 이름, 단위, 소수, 기본값]
  rad:[['A', '코어 앞면 면적', 'm²', 3, 0.06], ['kd', '주행풍 중 코어 통과 비율', '', 2, 0.3], ['fan', '팬 유량', 'm³/s', 3, 0.08], ['fm', '팬 켜기 (0 늘 · 1 냉각수 온도로)', '', 0, 0], ['fon', '팬 켜는 냉각수 온도 (3 K 아래로 내려가면 끔)', '°C', 0, 50],
       ['UA', 'UA (코어 풍속 5 m/s, × (풍속 ÷ 5)^0.6)', 'W/K', 0, 250], ['itd', '방열 표의 입구 온도차', 'K', 0, 60], ['V', '안의 냉각수 양', 'L', 2, 0.6], ['Cm', '금속 열용량', 'kJ/K', 2, 0],
       ['dp', '압력 강하', 'kPa', 1, 0], ['dq', '압력 강하를 잰 유량', 'L/min', 1, 8]],
  pump:[['flow', '유량', 'L/min', 1, 8], ['pc', '유량 정하기 (0 고정 · 1 곡선)', '', 0, 0], ['h0', '막힘 압력 (유량 0)', 'kPa', 1, 50], ['qmax', '최대 유량 (압력 0)', 'L/min', 1, 20]],
  partW:[['V', '안의 냉각수 양 (재킷 · 냉각판)', 'L', 2, 0.3], ['dp', '압력 강하', 'kPa', 1, 0], ['dq', '압력 강하를 잰 유량', 'L/min', 1, 8]],
  hose:[['d', '안지름', 'mm', 1, 10], ['len', '길이', 'm', 2, 0.5]],
  in:[['A', '입구 면적', 'm²', 3, 0.02], ['kd', '주행풍 중 들어오는 비율', '', 2, 0.5], ['fan', '팬 유량 (정지 때도)', 'm³/s', 3, 0.03]],
  water:[['cp', '냉각수 비열', 'J/kg·K', 0, 4180], ['rho', '냉각수 밀도', 'kg/m³', 0, 1000], ['mu', '냉각수 점도', 'mPa·s', 2, 1], ['Vh', '배관 · 탱크 냉각수 양', 'L', 2, 0.5]] };
/* 라디 방열 표 (스펙 시트): B.p.rq = 글자 (첫 행 냉각수 유량 L/min, 첫 열 코어 풍속 m/s, 칸 kW), B.p.rqUse = 'tab' | 'const' (UA). 계산은 점마다 ε-NTU 로 UA 를 거꾸로 구해 보간 */
/* [표 | UA] 고름 (2026-11-12): 고른 적 없으면 표가 차 있을 때 표. [표]인데 비어 있으면 빈칸 (필수) */
const t9RqUse = B => B && B.p && (B.p.rqUse==='tab' || B.p.rqUse==='const') ? B.p.rqUse : B && B.p && String(B.p.rq || '').trim() ? 'tab' : 'const';
const t9RadTab = B => B && B.t==='rad' && t9RqUse(B)==='tab' && typeof t2GridParse==='function' && B.p.rq ? t2GridParse(B.p.rq).map : null;
const t9RqMiss = B => B && B.t==='rad' && t9RqUse(B)==='tab' && !t9RadTab(B);
const t9LX = l => (l[3] && typeof l[3]==='object') ? l[3] : (l[3] = {});   // 호스 값 · 꺾임점
const t9CParams = (C, B) => B.t==='rad' ? T9CP.rad.filter(([k]) => k!=='fm') : B.t==='pump' ? T9CP.pump.filter(([k]) => k!=='pc' && (t9CV(B.p, T9CP.pump).pc===1 ? k!=='flow' : k==='flow')) : B.t==='in' ? T9CP.in : C.kind==='water' && T9CB[B.t][1]==='part' ? T9CP.partW : [];
/* 블럭 값: 넣은 값, 없으면 예제 = 기본값 · 새 파일 = 빈칸 (NaN, 펌프 방식 pc 같은 고르기만 기본) */
/* 수랭 회로 냉각수 칸: 도구 2P (시간 따라 계산) 는 회로마다 냉각수 온도 (고정 · 출발 값) 를 더 받음. 도구 9 는 정상 상태라 안 받음 (2026-11-11) */
const T9CPW = () => WB.id==='2' ? [['Tw', '냉각수 온도 (고정 · 출발)', '°C', 0, 40], ...T9CP.water] : T9CP.water;
/* 블럭 그림에 쓰는 값 = 그 블럭의 모든 값 (고르는 값 포함) */
const t9CAll = (C, B) => B.t==='rad' ? T9CP.rad : B.t==='pump' ? T9CP.pump : B.t==='in' ? T9CP.in : C.kind==='water' && T9CB[B.t] && T9CB[B.t][1]==='part' ? T9CP.partW : [];
const T9CHOICE = ['pc', 'fm'];   /* 고르는 값 (숫자 칸 아님) */
const t9CV = (o, def) => { const r = {}; def.forEach(([k, , , , v]) => { const x = (o || {})[k]; r[k] = x !== '' && x != null && isFinite(+x) ? +x : (wbEx() || T9CHOICE.includes(k) ? v : NaN); }); return r; };
/* 새 파일: 회로에 쓰는 블럭 · 호스 · 냉각수 값 중 빈칸 */
/* 블럭에 빈 값이 있나 (그림에서 빨간 테두리) */
const t9BMiss = (C, b) => !wbEx() && (t9RqMiss(b) || t9CParams(C, b).some(([k]) => !(b.t==='rad' && (t9RqUse(b)==='tab' ? k==='UA' : k==='itd')) && !(b.t==='rad' && k==='fon' && t9CV(b.p, T9CP.rad).fm!==1) && !isFinite(t9CV(b.p, t9CParams(C, b))[k])));
function t9Blank(C){ const L = [], nm = (b) => T9CB[b.t] ? T9CB[b.t][0] : b.t, miss = (o, def, skip = {}) => def.filter(([k]) => !skip[k] && !isFinite(t9CV(o, def)[k])).map(([, n]) => n);
  if(C.kind==='water'){ const m = miss(C.p, T9CPW()); if(m.length) L.push(`냉각수: ${m.join(' · ')}`);
    C.links.forEach(l => { const m2 = miss(t9LX(l), T9CP.hose); if(m2.length) L.push(`호스 ${nm({t:(C.blocks.find(b => b.id===l[0]) || {}).t})} → ${nm({t:(C.blocks.find(b => b.id===l[1]) || {}).t})}: ${m2.join(' · ')}`); }); }
  C.blocks.forEach(b => { const m = miss(b.p, t9CParams(C, b), b.t==='rad' ? {...(t9RqUse(b)==='tab' ? {UA:1} : {itd:1}), ...(t9CV(b.p, T9CP.rad).fm===1 ? {} : {fon:1})} : {}); if(t9RqMiss(b)) m.push('방열 표'); if(m.length) L.push(`${nm(b)}: ${m.join(' · ')}`); });
  return L.map(s => s + ' 비어 있음'); }
/* 수랭 회로 → 계산용: 갈라지고 합쳐지는 배관 가능. 라디에이터에서 나가는 흐름 = 1, 합쳐지는 곳은 더함.
   라디로 들어오는 호스를 빼면 순환 없는 흐름이어야 함 → 그 순서(위상 정렬)로 점을 늘어놓음 (라디 = 0 번).
   구조 확인(펌프가 전체 흐름 자리인지)은 똑같이 나눈 몫으로, 실제 갈래 몫은 hyd (호스 · 블럭 압력 강하)로 계산 (coolPrep).
   배관 · 탱크 냉각수 양은 점마다 똑같이 나눠 더함 */
/* '로 / 으로': 받침 있고 ㄹ 받침이 아니면 '으로' */
const t9Bat = s => { const c = String(s).charCodeAt(String(s).length - 1) - 0xAC00; return c >= 0 && c < 11172 ? c % 28 : 0; };   // 끝 글자 받침 번호 (0 = 없음, 8 = ㄹ)
const t9Ro = s => s + (t9Bat(s) && t9Bat(s)!==8 ? '으로' : '로'), t9Jo = (s, a, b) => s + (t9Bat(s) ? a : b);   // t9Jo(s, '이', '가') · (s, '은', '는')
function t9CWater(C, by){ const E = [], P = t9CV(C.p, T9CP.water), rads = C.blocks.filter(b => b.t==='rad'), pumps = C.blocks.filter(b => b.t==='pump');
  if(!rads.length) E.push('라디에이터가 1개 이상 있어야 함'); if(!pumps.length) E.push('펌프가 1개 이상 있어야 함'); if(E.length) return {E};   // 라디가 여럿이면 처음 놓은 라디가 회로의 시작점
  const R0 = rads[0].id, L = C.links.filter(([a, b]) => by.has(a) && by.has(b)), outs = id => L.filter(l => l[0]===id), ins = id => L.filter(l => l[1]===id);
  C.blocks.forEach(b => { const nm = T9CB[b.t][0]; if(!outs(b.id).length) E.push(`${nm}에서 나가는 호스가 없음`); if(!ins(b.id).length) E.push(`${t9Ro(nm)} 들어오는 호스가 없음`); });
  if(E.length) return {E};
  const pv = id => t9CV(by.get(id).p, T9CP.pump), isCrv = id => pv(id).pc===1, flow = id => isCrv(id) ? pv(id).qmax : pv(id).flow, isPump = id => by.get(id).t==='pump';   // 곡선 펌프는 구조 확인에 최대 유량을 씀 (실제 유량은 hyd 로 풂)
  const pSplit = t9PumpSplit(C, by);   // 갈래마다 펌프가 붙은 갈라짐 (있으면 그 비율 = 펌프 유량 비)
  const fr = l => { const o = outs(l[0]); if(o.length < 2) return 1;
    if(pSplit && l[0]===pSplit){ const s = o.reduce((a, x) => a + flow(x[1]), 0); return s > 0 ? flow(l[1])/s : 1/o.length; }
    return 1/o.length; };   // 구조 확인용 (실제 몫은 hyd)
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
  const Vsh = Math.max(0, P.Vh)/order.length, li = l => L.indexOf(l);
  const nodes = order.map(id => { const B = by.get(id), v = t9CV(B.p, t9CParams(C, B));
    return {t:B.t==='rad' ? 'rad' : B.t==='pump' ? 'pump' : 'part', part:T9CB[B.t][1]==='part' ? B.t : undefined, C:Math.max(1, ((B.t==='pump' || B.t==='j' ? 0 : v.V) + Vsh)/1000*P.rho*P.cp), q:id===R0 ? 1 : q.get(id),
            ins:ins(id).map(l => [ix.get(l[0]), q.get(l[0])*fr(l), li(l)]), ...(B.t==='rad' ? {UA:v.UA, A:v.A, kd:v.kd, fan:v.fan, fon:v.fm===1 ? v.fon : 0, Cm:v.Cm, ...(t9RadTab(B) ? {rq:t9RadTab(B), itd:v.itd} : {})} : {})}; });   // 라디마다 공기 쪽 값 · 팬 · 금속 · 방열 표
  const hyd = {Vt, rho:P.rho, mu:P.mu/1000, links:L.map(l => { const h = t9CV(t9LX(l), T9CP.hose); return {a:ix.get(l[0]), b:ix.get(l[1]), d:h.d, len:h.len}; }),
               blk:order.map(id => { const B = by.get(id); if(B.t==='pump' || B.t==='j') return {}; const v = t9CV(B.p, t9CParams(C, B)); return {dp:v.dp, dq:v.dq}; }),
               src:pumps.filter(b => !isCrv(b.id)).map(b => ({k:ix.get(b.id), flow:part.length ? flow(b.id) : Vt})), crv:pumps.filter(b => isCrv(b.id)).map(b => ({k:ix.get(b.id), h0:pv(b.id).h0, qmax:pv(b.id).qmax}))};
  const rr = t9CV(rads[0].p, T9CP.rad), net = {nodes, Cc:Vt/60000*P.rho*P.cp, rcp:P.rho*P.cp, ...(WB.id==='2' && isFinite(t9CV(C.p, T9CPW()).Tw) ? {tw0:t9CV(C.p, T9CPW()).Tw} : {}), UA:rr.UA, A:rr.A, kd:rr.kd, fan:rr.fan, hyd};
  const hf = coolHydSolve(hyd); if(!hf) return {E:['호스 유량을 풀지 못함 (호스 값 확인)']};
  if(hyd.crv.length){ Vt = hf.Vt; hyd.Vt = Vt; net.Cc = Vt/60000*P.rho*P.cp; mode = (mode ? mode + ' · ' : '') + `펌프 곡선 → 회로 유량 ${Vt.toFixed(2)} L/min`; }
  const lq = new Map(L.map((l, k) => [l, hf[k]]));   // 호스 → 유량 몫 (화면 표시용)
  return {E, net, q, fr, mode, lq, Vt}; }
/* 갈래마다 펌프가 바로 붙은 갈라짐 블럭 id (나가는 호스가 둘 이상이고 모두 펌프로 감), 없으면 '' */
function t9PumpSplit(C, by){ const L = C.links.filter(([a, b]) => by.has(a) && by.has(b));
  for(const B of C.blocks){ const o = L.filter(l => l[0]===B.id); if(o.length >= 2 && o.every(l => by.get(l[1]).t==='pump')) return B.id; } return ''; }
/* 공랭 덕트 → 계산용: 입구 → 부품 … → 출구, 갈라지면 호스 비율(합 1), 합쳐지면 더함. 점 = 부품 (흐름 순서), 들어오는 몫 [앞 점, 몫] (−1 = 입구) */
function t9CAir(C, by){ const E = [], ins = C.blocks.filter(b => b.t==='in'), outs = C.blocks.filter(b => b.t==='out');
  if(ins.length!==1 || outs.length!==1) return {E:['입구 · 출구는 1개씩']};
  const I0 = ins[0].id, O0 = outs[0].id, L = C.links.filter(([a, b]) => by.has(a) && by.has(b)), lo = id => L.filter(l => l[0]===id), li = id => L.filter(l => l[1]===id);
  C.blocks.forEach(b => { const nm = T9CB[b.t][0]; if(b.t!=='out' && !lo(b.id).length) E.push(`${nm}에서 나가는 덕트가 없음`); if(b.t!=='in' && !li(b.id).length) E.push(`${t9Ro(nm)} 들어오는 덕트가 없음`); });
  if(E.length) return {E};
  const fr = l => { const o = lo(l[0]); if(o.length < 2) return 1; const w = o.map(x => isFinite(+x[2]) && +x[2] > 0 ? +x[2] : 1/o.length), s = w.reduce((a, b) => a + b, 0); return w[o.indexOf(l)]/s; };
  const deg = new Map(C.blocks.map(b => [b.id, li(b.id).length])), order = [], Q = [I0];
  while(Q.length){ const id = Q.shift(); order.push(id); lo(id).forEach(l => { deg.set(l[1], deg.get(l[1]) - 1); if(deg.get(l[1])===0) Q.push(l[1]); }); }
  if(order.length!==C.blocks.length) return {E:['덕트가 고리를 이루거나 입구에서 이어지지 않는 블럭이 있음']};
  const q = new Map([[I0, 1]]); order.forEach(id => { if(id!==I0) q.set(id, li(id).reduce((s, l) => s + q.get(l[0])*fr(l), 0)); });
  if(Math.abs(q.get(O0) - 1) > 1e-6) return {E:['출구로 나가는 공기가 1 이 아님']};
  const parts = order.filter(id => id!==I0 && id!==O0), ix = new Map(parts.map((id, k) => [id, k])), qi = t9CV(ins[0].p, T9CP.in);
  const nodes = parts.map(id => ({part:by.get(id).t==='j' ? undefined : by.get(id).t, q:q.get(id), ins:li(id).map(l => [l[0]===I0 ? -1 : ix.get(l[0]), q.get(l[0])*fr(l)])}));
  return {E, net:{A:qi.A, kd:qi.kd, fan:qi.fan, parts:nodes.map(n => n.part).filter(Boolean), nodes}, q, fr}; }
/* 배치 → 계산용 회로 + 오류 */
function t9CoolCompile(S){ S = S || t9S(); const out = {water:[], air:[]}, err = {}, used = {}, mode = {}, lq = {};
  (S.cool.circuits || []).forEach(C => { const E = [], by = new Map(C.blocks.map(b => [b.id, b])), nx = new Map(), pv = new Map();
    C.links.forEach(([a, b]) => { if(by.has(a) && by.has(b)){ nx.set(a, b); pv.set(b, a); } });
    C.blocks.forEach(b => { if(T9CB[b.t] && T9CB[b.t][1]==='part'){ if(used[b.t]) E.push(`${t9Jo(T9CB[b.t][0], '이', '가')} 다른 회로에도 있음`); used[b.t] = true; } });
    if(!wbEx() && C.blocks.length){ const bl = t9Blank(C); if(bl.length){ E.push('빈칸 있음'); err[C.id] = E; return; } }
    if(C.kind==='water'){ const r = t9CWater(C, by); E.push(...r.E); if(!r.E.length){ out.water.push(r.net); if(r.mode) mode[C.id] = r.mode; lq[C.id] = {m:r.lq, Vt:r.Vt}; } }
    else { const r = t9CAir(C, by); E.push(...r.E); if(!r.E.length) out.air.push(r.net); }
    if(E.length) err[C.id] = E; });
  return {net:out, err, mode, lq}; }
/* 부품이 어디서 식는지: 'w1' 처럼 회로 id + 종류, 없으면 null (오류 회로는 안 침) */
function t9CoolWhere(p){ const ok = t9CoolCompile().err; for(const C of t9S().cool.circuits){ if(ok[C.id]) continue; if(C.blocks.some(b => b.t===p)) return C; } return null; }
/* 편집기 상태: 도구 9 = T9 (run2x.t9), 도구 2P = 2P 자체 회로 (T2 저장, 도구 9 와 따로). 편집기가 화면에 있을 때만 단추 · 끌기 · 키를 받음 */
function t9S(){ return typeof WB!=='undefined' && WB.id==='2' && typeof t2Cwc==='function' ? t2Cwc() : T9; }
function t9On(){ return typeof WB!=='undefined' && (WB.id==='9' || WB.id==='2') && !!document.querySelector('#wb .t9-cool'); }
/* ---------- 편집기 그림 · 조작 (시뮬링크식)
   왼쪽 끌기: 블럭 = 옮기기 (고른 블럭이 여럿이면 같이) · 빈 곳 = 영역 고르기 (걸치기만 해도) · 오른쪽 점 = 호스 새로 끌어 다른 블럭에 이음 ·
     호스 토막 = 수직 토막은 좌우, 수평 토막은 상하로 옮김.
   블럭 출구 · 입구에는 호스 하나만. 가르기 · 합치기는 합류 · 분기점 블럭으로만 (호스 위에 새 호스를 놓아도 그 자리에 생김) (2026-11-12)
   점 끌기 (2026-11-12): 빈 점 = 새 호스 (파랑 ↔ 흰 점만) · 이어진 점이나 호스 끝 가까이 = 그 끝을 옮김 (빈 곳에 놓으면 제자리)
   휠 = 확대 · 축소 (커서 자리 기준, 그림을 한 번 누른 뒤에만 — 스크롤하다 지나가도 확대 안 됨) · 휠 버튼 끌기 = 화면 이동 · Shift + 누르기 = 더해 고르기 · Delete · Backspace = 고른 것 지우기 · Esc = 고르기 풀기
   두 번 누르기: 빈 곳 = 전체 보기, 호스 = 자동 경로로 되돌림 */
const T9CBW = 150, T9CBH = 58, T9CR = 64, T9VA = 0.36;   // 네모 블럭 · 동그라미 블럭(펌프 · 공기 입구 · 출구) 크기, 그림 세로 ÷ 가로
const t9Rd = b => b.t==='pump' || b.t==='in' || b.t==='out';
const t9BW = b => b.t==='j' ? 22 : t9Rd(b) ? T9CR : T9CBW, t9BH = b => b.t==='j' ? 22 : t9Rd(b) ? T9CR : T9CBH;
const t9Pin = b => b.t==='j' ? [b.x + 11, b.y + 11] : [b.x, b.y + t9BH(b)/2], t9Pout = b => b.t==='j' ? [b.x + 11, b.y + 11] : [b.x + t9BW(b), b.y + t9BH(b)/2];   // 합류 · 분기점은 가운데로 드나듦
const t9OutFull = (C, b) => b.t!=='j' && C.links.some(l => l[0]===b.id), t9InFull = (C, b) => b.t!=='j' && C.links.some(l => l[1]===b.id);
/* 고른 것: C.selB (블럭 id 들) · C.selL (호스 번호들). 예전 저장본 (sel 글자 · selL 숫자) 은 여기서 바꿈 */
function t9Sel(C){ if(!Array.isArray(C.selB)){ C.selB = typeof C.sel==='string' && C.sel ? [C.sel] : []; } if(!Array.isArray(C.selL)) C.selL = typeof C.selL==='number' && C.selL >= 0 ? [C.selL] : [];
  delete C.sel; C.selB = C.selB.filter(id => C.blocks.some(b => b.id===id)); C.selL = C.selL.filter(j => j < C.links.length); return C; }
/* 꺾은선 → 꺾이는 곳을 반지름 r 로 둥글게 한 경로 */
function t9Ortho(P, r){ let d = `M${P[0][0]},${P[0][1]}`;
  for(let k = 1; k < P.length - 1; k++){ const [ax, ay] = P[k - 1], [bx, by] = P[k], [cx, cy] = P[k + 1], l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), q = Math.min(r, l1/2, l2/2);
    if(q < 0.5){ d += ` L${bx},${by}`; continue; }
    d += ` L${(bx - (bx - ax)/l1*q).toFixed(1)},${(by - (by - ay)/l1*q).toFixed(1)} Q${bx},${by} ${(bx + (cx - bx)/l2*q).toFixed(1)},${(by + (cy - by)/l2*q).toFixed(1)}`; }
  const e = P[P.length - 1]; return d + ` L${e[0]},${e[1]}`; }
/* 호스 경로 (수평 · 수직만): 꺾임점을 넣었으면 그대로 (첫 · 끝 꺾임점 높이는 양 끝 높이에 맞춤), 아니면 자동.
   자동: 갈라지는 호스는 갈래마다, 합쳐지는 호스는 들어가는 순서마다 수직 토막을 10 씩 비켜 따로 보이고 따로 누를 수 있게. 뒤로 가는 호스는 블럭 아래 길로 (호스마다 12 씩 아래) */
function t9Route(C, j, by){ const l = C.links[j], A = by.get(l[0]), B = by.get(l[1]); if(!A || !B) return null;
  const [x1, y1] = t9Pout(A), [x2, y2] = t9Pin(B), pts = t9LX(l).pts;
  if(Array.isArray(pts) && pts.length >= 2){ const P = pts.map(p => p.slice()); P[0][1] = y1; P[P.length - 1][1] = y2; return [[x1, y1], ...P, [x2, y2]]; }
  const xs = x1 + 18, xe = x2 - 18, ja = A.t==='j', jb = B.t==='j';
  if(x2 >= x1 + 24 || (ja && x2 >= x1 + 8)){   // 앞으로: 분기점에서 나가면 먼저 위아래로, 분기점으로 들어가면 마지막에 위아래로 (갈래가 점에서 바로 갈라져 보임)
    if(ja && !jb) return [[x1, y1], [x1, y2], [x2, y2]]; if(jb && !ja) return [[x1, y1], [x2, y1], [x2, y2]];
    const xm = (x1 + x2)/2; return [[x1, y1], [xm, y1], [xm, y2], [x2, y2]]; }
  const back = C.links.filter(q => { const a = by.get(q[0]), b = by.get(q[1]); return a && b && t9Pin(b)[0] < t9Pout(a)[0] + 24; }), bt = [...new Set(back.map(q => q[1]))], kb = bt.indexOf(l[1]);   // 같은 곳으로 돌아가는 호스는 같은 아래 길
  const lane = Math.max(...C.blocks.map(b => b.y + t9BH(b))) + 24 + 12*Math.max(0, kb);
  const xa = ja ? x1 : xs, xb = jb ? x2 : xe; return [[x1, y1], [xa, y1], [xa, lane], [xb, lane], [xb, y2], [x2, y2]]; }
/* 토막 끌기: 링크 j 의 꺾은선에서 점 (px, py) 에 가장 가까운 토막 번호 (양 끝 토막 = 포트에 붙어 못 옮김 → −1) */
function t9SegAt(P, px, py){ let best = -1, bd = Infinity; for(let q = 0; q < P.length - 1; q++){ const [ax, ay] = P[q], [bx, by] = P[q + 1], dx = bx - ax, dy = by - ay, L2 = dx*dx + dy*dy, t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax)*dx + (py - ay)*dy)/L2)) : 0, d = Math.hypot(ax + t*dx - px, ay + t*dy - py); if(d < bd){ bd = d; best = q; } }
  return best >= 1 && best <= P.length - 3 ? best : -1; }
/* 보는 자리 (그림 좌표 viewBox): 없으면 모든 블럭이 보이게 */
function t9Fit(C){ const B = C.blocks.length ? C.blocks : [{x:0, y:0, t:'rad'}], x0 = Math.min(...B.map(b => b.x)) - 50, x1 = Math.max(...B.map(b => b.x + t9BW(b))) + 50;
  const y0 = Math.min(...B.map(b => b.y)) - 40, y1 = Math.max(...B.map(b => b.y + t9BH(b))) + 40 + 12*Math.max(1, C.links.length);
  const w = Math.max(600, x1 - x0, (y1 - y0)/T9VA); return {x:(x0 + x1)/2 - w/2, y:(y0 + y1)/2 - w*T9VA/2, w}; }
const t9View = C => (C.view && isFinite(C.view.w) && C.view.w > 0) ? C.view : (C.view = t9Fit(C));
const t9VB = v => `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${(v.w*T9VA).toFixed(1)}`;
function t9CoolSVG(C){ t9Sel(C); const by = new Map(C.blocks.map(b => [b.id, b])), v = t9View(C), sB = new Set(C.selB), sL = new Set(C.selL);
  let s = `<svg viewBox="${t9VB(v)}" class="t9-csvg" data-t9csvg="${C.id}" preserveAspectRatio="xMidYMid meet">`;
  // 냉각수 색: 라디 출구 = 차가운 파랑, 열을 받는 블럭(모터 · 인버터 · 축전지)을 지날 때마다 붉어짐 (펌프는 그대로)
  const heat = id => { const B = by.get(id); return B && T9CB[B.t][1]==='part' ? 1 : 0; }, rk = new Map(C.blocks.map(b => [b.id, 0]));
  if(C.kind==='water') for(let it = 0; it < C.blocks.length + 1; it++) C.links.forEach(([a, b]) => { const B = by.get(b); if(!B || B.t==='rad') return; rk.set(b, Math.max(rk.get(b) || 0, (rk.get(a) || 0) + heat(a))); });
  const lv = l => (rk.get(l[0]) || 0) + heat(l[0]), mx = Math.max(1, ...C.links.map(lv));
  const col = f => { const c0 = [63, 134, 209], c1 = [217, 65, 43]; return `rgb(${c0.map((q, k) => Math.round(q + (c1[k] - q)*f)).join(',')})`; };
  const layers = {o:'', i:'', f:'', h:''}; let dots = '', bad = '', hdl = '';
  C.links.forEach((l, j) => { const P = t9Route(C, j, by); if(!P) return; const d = t9Ortho(P, 10), sel = sL.has(j), ic = C.kind==='water' ? ` style="stroke:${col(lv(l)/mx)}"` : '';
    layers.o += `<path d="${d}" class="o${sel ? ' sel' : ''}"/>`; layers.i += `<path d="${d}" class="i"${ic}/>`; layers.f += `<path d="${d}" class="f"/>`;
    layers.h += `<path d="${d}" class="t9-clhit" data-t9clink="${C.id}:${j}"/>`;
    const oo = C.links.filter(q => q[0]===l[0]), ii = C.links.filter(q => q[1]===l[1]);
    /* 갈라짐 · 합쳐짐 점은 그리지 않음 (관리자 지시 2026-11-11: 호스가 만나는 모양으로 충분) */
    if(oo.length > 1){ const k = oo.indexOf(l) + 1; let best = null;   // 갈래 번호: 그 갈래 가장 긴 토막 가운데
      for(let q = 1; q < P.length - 2; q++){ const L2 = Math.hypot(P[q + 1][0] - P[q][0], P[q + 1][1] - P[q][1]); if(!best || L2 > best[0]) best = [L2, (P[q][0] + P[q + 1][0])/2, (P[q][1] + P[q + 1][1])/2]; }
      if(!best || best[0] < 24) best = [0, P[P.length - 1][0] - 30, P[P.length - 1][1]];
      bad += `<g class="t9-cbadge${sel ? ' sel' : ''}" data-t9clink="${C.id}:${j}" transform="translate(${best[1]},${best[2]})"><circle r="10"/><text y="4" text-anchor="middle">${k}</text></g>`; } });
  s += `<g class="t9-hose ${C.kind}">${layers.o}${layers.i}${layers.f}</g>${dots}${layers.h}${bad}`;   // 테두리를 모두 먼저, 안쪽 색을 그 위에 → 겹친 곳에 경계가 안 보임
  C.blocks.forEach(b => { if(b.t==='j'){ const sel = sB.has(b.id);   /* 합류 · 분기점: 작은 점 (드나드는 점은 양옆) */
      s += `<g class="t9-cb t9-cj ${C.kind}${sel ? ' sel' : ''}" data-t9cb="${C.id}:${b.id}" transform="translate(${b.x},${b.y})"><circle cx="11" cy="11" r="8"/><circle cx="21" cy="1" r="4.5" class="t9-cpo" data-t9cpt="${C.id}:${b.id}:o"/></g>`; return; }
    const [nm, kind] = T9CB[b.t], q = Object.fromEntries(Object.entries(t9CV(b.p, t9CAll(C, b))).map(([k, v]) => [k, typeof v==='number' && !isFinite(v) ? '—' : v])), sel = sB.has(b.id), w = t9BW(b), h = t9BH(b), rd = t9Rd(b);
    const sub = b.t==='pump' && q.pc===1 ? `곡선 ${q.h0} kPa` : b.t==='rad' ? `${q.A} m² · ${t9RadTab(b) ? '방열 표' : `UA ${q.UA}`}${q.fm===1 && q.fon > 0 ? ` · 팬 ${q.fon} °C` : ''}` : b.t==='pump' ? `${q.flow} L/min` : b.t==='in' ? `${q.A} m² · 팬 ${q.fan}` : kind==='part' ? (C.kind==='water' ? `냉각수 ${q.V} L` : '부품 hA') : '';
    const shape = rd ? `<circle cx="${w/2}" cy="${h/2}" r="${w/2}"/>` : `<rect width="${w}" height="${h}" rx="7"/>`;
    const txt = rd ? `<text x="${w/2}" y="${sub ? h/2 - 2 : h/2 + 4}" text-anchor="middle" class="t9-cbn sm">${b.t==='in' ? '입구' : b.t==='out' ? '출구' : nm}</text>${sub ? `<text x="${w/2}" y="${h/2 + 13}" text-anchor="middle" class="t9-cbs sm">${b.t==='in' ? `${q.A} m²` : sub}</text>` : ''}`
                   : `<text x="${w/2}" y="24" text-anchor="middle" class="t9-cbn">${nm}</text><text x="${w/2}" y="42" text-anchor="middle" class="t9-cbs">${sub}</text>`;
    s += `<g class="t9-cb ${kind}${rd ? ' rd' : ''}${sel ? ' sel' : ''}${t9BMiss(C, b) ? ' need' : ''}" data-t9cb="${C.id}:${b.id}" transform="translate(${b.x},${b.y})">${shape}${txt}
      ${b.t!=='in' ? `<circle cx="0" cy="${h/2}" r="6" class="t9-cpi" data-t9cpt="${C.id}:${b.id}:i"/>` : ''}${b.t!=='out' ? `<circle cx="${w}" cy="${h/2}" r="7" class="t9-cpo" data-t9cpt="${C.id}:${b.id}:o"/>` : ''}</g>`; });
  s += hdl;
  if(T9CG && T9CG.cid===C.id){ if(T9CG.gx!=null) s += `<line x1="${T9CG.gx}" x2="${T9CG.gx}" y1="${v.y - 2000}" y2="${v.y + 4000}" class="t9-cguide"/>`; if(T9CG.gy!=null) s += `<line y1="${T9CG.gy}" y2="${T9CG.gy}" x1="${v.x - 4000}" x2="${v.x + 8000}" class="t9-cguide"/>`; }   // 정렬 안내선
  return s + `<rect class="t9-cmq" style="display:none"/><g class="t9-hose ${C.kind} drag" style="display:none"><path class="o"/><path class="i"/><path class="f"/></g><circle class="t9-cend ${C.kind}" r="9" style="display:none"/></svg>`; }   // 영역 고르기 · 끄는 중인 호스
function t9CoolPage(){ const CC = t9S().cool.circuits, nw = CC.filter(c => c.kind==='water').length, na = CC.filter(c => c.kind==='air').length, comp = t9CoolCompile(), used = new Set(CC.flatMap(c => c.blocks.map(b => b.t)));
  const card = C => { t9Sel(C); const E = comp.err[C.id], pal = C.kind==='water' ? ['rad', 'pump', 'm', 'i', 'b', 'j'] : ['m', 'i', 'b', 'j'], by = new Map(C.blocks.map(b => [b.id, b]));
    const form = (title, def, obj, attr, lock = {}) => `<div class="t9-cform"><b>${title}</b>${def.map(([k, n, u, d]) => { const v = t9CV(obj, def)[k];
        return `<label class="t9-cfi${!lock[k] && !isFinite(v) ? ' need' : ''}"><span>${n}</span><input type="number" step="any" value="${isFinite(v) ? v : ''}" ${attr} name="${k}"${lock[k] ? ` disabled title="${lock[k]}"` : ''}><i>${u}</i>${lock[k] ? `<em class="t9-clk">${lock[k]}</em>` : ''}</label>`; }).join('')}</div>`;
    const radTab = B => { const use = t9RqUse(B), id = `${C.id}:${B.id}`;
      /* 2P 칸 표 그대로 (WBGRID 'rq:회로:블럭') · 고르기 [아래 표 | 위 상수] · 표 꺼짐 줄도 2P 와 같음 (2026-11-12) */
      const gk = 'rq:' + id; WBGRID[gk] = {get:() => (t9RadB(id).p || {}).rq || '', set(txt){ const R = t9RadB(id); R.p = R.p || {}; R.p.rq = txt; R.p.rqUse = 'tab'; t9CoolSet(); }, repaint:() => t9CoolUI(),
        head:['코어 풍속 m/s \\ 유량 L/min', '8'], map:true, rl:'코어 풍속', cl:'유량', cu:'L/min', parse:txt => t2GridParse(txt), bad:'표를 읽지 못했습니다. 첫 행 = 냉각수 유량 L/min, 첫 열 = 코어 풍속 m/s, 칸 = 방열량 kW.'};
      const seg = `<span class="t2-use"><span class="muted">계산에 쓸 값</span><span class="dc-seg" role="group">${[['tab', '아래 표'], ['const', '위 상수']].map(([q, nm]) => `<button type="button" data-t9crqu="${id}:${q}" aria-pressed="${use===q}">${nm}</button>`).join('')}</span></span>`;
      const ua = t9CV(B.p || {}, t9CParams(C, B)).UA;
      if(use==='const') return `<div class="t9-cform t9-crqb off"><b>방열 표 (스펙 시트)</b>${seg}<div class="t2-mfold off"><b>표 꺼짐</b><span>UA ${isFinite(ua) ? wbFmt(ua, 0) : '—'} W/K (코어 풍속 5 m/s) × (풍속 ÷ 5)^0.6</span></div></div>`;   /* [위 상수]면 표는 안 그림 */
      const M = B.p && B.p.rq ? t2GridParse(B.p.rq).map : null, msg = B.p && B.p.rq ? t2RadMsg(B.p.rq) : '';
      return `<div class="t9-cform t9-crqb${t9RqMiss(B) && !wbEx() ? ' need' : ''}"><b>방열 표 (스펙 시트)</b>${seg}
        <span class="t2-use">${msg ? `<span class="muted">${M ? msg : '<span class="wb-err">읽지 못함</span>'}</span>` : ''}${B.p && B.p.rq ? `<button type="button" class="btn small" data-t9crqx="${id}">표 지우기</button>` : ''}</span>
        <div class="t2-tw t9-gw">${t2GridTable(gk, B.p && B.p.rq || '')}</div></div>`; };
    const B = C.selB.length===1 && !C.selL.length ? by.get(C.selB[0]) : null, Lj = C.selL.length===1 && !C.selB.length ? C.selL[0] : -1;
    const hose = () => { const l = C.links[Lj], A = by.get(l[0]), Bt = by.get(l[1]); if(!A || !Bt) return ''; const o = C.links.filter(q => q[0]===l[0]), k = o.indexOf(l) + 1;
      let info = '';
      if(C.kind==='water'){ const r = comp.lq[C.id], f = r && r.m ? r.m.get(l) : null, h = t9CV(t9LX(l), T9CP.hose), P = t9CV(C.p, T9CP.water);
        if(f != null){ const Q = f*r.Vt/60000, D = h.d/1000, u = Q/(Math.PI*D*D/4), Re = P.rho*u*D/(P.mu/1000);
          info = `<span class="t9-cfi"><span>흐름</span><b>${(f*100).toFixed(1)} %</b><i>${(f*r.Vt).toFixed(2)} L/min · ${u.toFixed(2)} m/s · Re ${Math.round(Re)}</i></span>`; }
        const ps = o.length > 1 && t9PumpSplit(C, by)===l[0];
        return `<div class="t9-csel">${form(`호스 ${T9CB[A.t][0]} → ${T9CB[Bt.t][0]}${o.length > 1 ? ` (${k}번 갈래)` : ''}`, T9CP.hose, t9LX(l), `data-t9chp="${C.id}:${Lj}"`)}
          <div class="t9-cform">${info}<span class="muted">${ps ? '갈래마다 펌프 → 갈래 유량 = 펌프 유량' : o.length > 1 || C.links.filter(q => q[1]===l[1]).length > 1 ? '갈래 유량 = 갈래마다 압력 강하가 같아지게 (호스 · 블럭 압력 강하)' : '갈라지지 않은 호스'}</span></div></div>`; }
      const jj = o.map(q => C.links.indexOf(q));
      return `<div class="t9-csel"><div class="t9-cform"><b>덕트 ${T9CB[A.t][0]} → ${T9CB[Bt.t][0]}</b>${o.length > 1 ? o.map((q, m) => { const Bq = by.get(q[1]);
          return `<label class="t9-cfi"><span>${m + 1}번 (→ ${T9CB[Bq.t][0]}) 비율</span><input type="number" step="any" min="1" max="99" value="${(+(q[2] || 1/o.length)*100).toFixed(1)}" data-t9crat="${C.id}:${jj[m]}"><i>%</i></label>`; }).join('') : '<span class="muted">갈라지지 않은 덕트 (공기 100 %)</span>'}</div></div>`; };
    const panel = Lj >= 0 ? hose()
      : B ? `<div class="t9-csel">${t9CParams(C, B).length ? form(`${T9CB[B.t][0]} 블럭`, t9CParams(C, B), B.p, `data-t9cbp="${C.id}:${B.id}"`, B.t==='rad' ? {...(t9RqUse(B)==='tab' ? {UA:'표 사용'} : {itd:'UA 사용'}), ...(t9CV(B.p, T9CP.rad).fm===1 ? {} : {fon:'팬 늘 켬'})} : {}) + (B.t==='rad' ? `<div class="t9-cform"><b>팬 켜기</b><span class="dc-seg" role="group">${[[0, '팬 늘 켬'], [1, '냉각수 온도로']].map(([q, nm]) => `<button type="button" data-t9cfm="${C.id}:${B.id}:${q}" aria-pressed="${t9CV(B.p, T9CP.rad).fm===q}">${nm}</button>`).join('')}</span></div>` + radTab(B) : '') + (B.t==='pump' ? `<div class="t9-cform"><b>유량 정하기</b><span class="dc-seg" role="group">${[[0, '유량 고정'], [1, '펌프 곡선']].map(([q, nm]) => `<button type="button" data-t9cpm="${C.id}:${B.id}:${q}" aria-pressed="${t9CV(B.p, T9CP.pump).pc===q}">${nm}</button>`).join('')}</span><span class="muted">${t9CV(B.p, T9CP.pump).pc===1 ? '올리는 압력 = 막힘 압력 × (1 − (유량 ÷ 최대 유량)²), 호스 · 블럭 압력 강하와 만나는 점에서 유량이 정해짐 (펌프 스펙 시트의 곡선 양 끝)' : '회로 압력 강하와 상관없이 이 유량'}</span></div>` : '') : `<div class="t9-cform"><b>${T9CB[B.t][0]} 블럭</b><span class="muted">${T9CB[B.t][1]==='part' ? '부품 쪽 값(열용량 · 열저항 · hA)은 그 부품 항목에 있습니다.' : '입력 없음'}</span></div>`}</div>`
      : C.selB.length + C.selL.length ? `<p class="muted t9-cmsg">블럭 ${C.selB.length}개 · ${C.kind==='water' ? '호스' : '덕트'} ${C.selL.length}개 고름 · 끌면 같이 옮겨지고 Delete 로 지움</p>`
      : (h => `<ul class="muted t9-cmsg t9-chelp"><li><b>끌기</b> 블럭 옮기기 · 빈 곳 = 영역 고르기 (Shift = 더해 고르기)</li><li><b>잇기</b> 파란 점 ↔ 흰 점 끌어 놓기 · 호스 끝을 끌면 옮김</li><li><b>가르기 · 합치기</b> 합류 · 분기점 (${C.kind==='water' ? '호스' : '덕트'} 위에 놓아도 생김)${C.kind==='water' ? '' : ' · 갈래 비율 입력'}</li><li><b>${h} 토막</b> 끌어서 옮김 · 두 번 누르면 자동 경로</li><li><b>보기</b> 휠 = 확대 · 축소 (그림을 한 번 누른 뒤) · 휠 버튼 끌기 = 이동 · 빈 곳 두 번 = 전체</li><li><b>지우기</b> Delete</li></ul>`)(C.kind==='water' ? '호스' : '덕트');
    return `<div class="t9-cc" data-t9cc="${C.id}" data-wbneed="t9:${C.id}"><div class="t9-cch"><b>${wbEsc(C.name)}</b>
        <span class="t9-cpal"><span class="muted">블럭 넣기</span>${pal.map(t => { const here = C.blocks.some(b => b.t===t), other = T9CB[t][1]==='part' && !here && used.has(t) ? t9S().cool.circuits.find(c => c!==C && c.blocks.some(b => b.t===t)) : null, one = T9CB[t][1]==='part' && here;
      return `<button type="button" class="btn small" data-t9cadd="${C.id}:${t}"${one ? ` disabled title="${t9Jo(T9CB[t][0], '은', '는')} 이 회로에 이미 있음 (부품은 한 곳에만)"` : other ? ` title="${wbEsc(other.name)}에서 이 회로로 옮김"` : ''}>+ ${T9CB[t][0]}${other ? ' (옮김)' : ''}</button>`; }).join('')}</span>
        <button type="button" class="btn small t9-cdel" data-t9cdel="${C.id}">회로 지우기</button></div>
      <div class="t9-cmain"><div class="t9-cleft"><div class="t9-cbox" data-zoombox="t9c-${C.id}">${t9CoolSVG(C)}</div>
        <p class="t9-cmsg ${E ? 'bad' : 'ok'}">${E ? '계산에서 빠짐 · ' + E.join(' · ') : '이어짐 · 계산에 씀' + (comp.mode[C.id] ? ' · ' + comp.mode[C.id] : '')}</p></div>
      <div class="t9-cright">${C.kind==='water' ? form('냉각수', T9CPW(), C.p, `data-t9cwp="${C.id}"`) : ''}${panel}</div></div></div>`; };   /* 편집기 왼쪽 · 입력 칸 오른쪽 (2026-11-11) */
  const free = ['m', 'i', 'b'].filter(p => !used.has(p)).map(p => T9CB[p][0]);
  return `<div class="t9-cool"><div class="t9-cbar"><button type="button" class="btn small" data-t9cnew="water"${nw >= 3 ? ' disabled' : ''}>+ 수랭 회로</button><button type="button" class="btn small" data-t9cnew="air"${na >= 3 ? ' disabled' : ''}>+ 공랭 덕트</button>
      </div>
    ${CC.map(card).join('')}</div>`; }
/* 고친 뒤: 저장 · 다시 그림 · (시뮬레이션 탭으로 갈 때) 계산.  t9CoolUI = 고르기 · 보기만 바뀜 (계산 안 함) */
const t9CoolSave = () => { if(WB.id==='2' && typeof t2Save==='function') t2Save(); else t9Save(); };
const t9CoolSet = (paint = true) => { t9CoolSave(); if(paint) wbPaint(['ext']); wbCalcSoon(); };
const t9CoolUI = () => { t9CoolSave(); wbPaint(['ext']); };
const t9CC = id => t9S().cool.circuits.find(c => c.id===id);
const t9Cid = (C, p) => { let k = 1; while(C.some(x => x.id===p + k)) k++; return p + k; };
document.addEventListener('click', e => { if(!t9On() || !e.target.closest) return; const t = e.target;
  const nw = t.closest('[data-t9cnew]'); if(nw){ const kind = nw.dataset.t9cnew, CC = t9S().cool.circuits, n = CC.filter(c => c.kind===kind).length + 1, id = t9Cid(CC, kind==='water' ? 'w' : 'a');
    CC.push(kind==='water' ? {id, kind, name:`수랭 회로 ${n}`, p:{cp:4180, rho:1000, mu:1, Vh:0.5}, selB:[], selL:[], blocks:[{id:id + 'r', t:'rad', x:40, y:70, p:{}}, {id:id + 'p', t:'pump', x:300, y:67, p:{}}], links:[[id + 'r', id + 'p'], [id + 'p', id + 'r']]}
                           : {id, kind, name:`공랭 덕트 ${n}`, p:{}, selB:[], selL:[], blocks:[{id:id + 'i', t:'in', x:40, y:67, p:{}}, {id:id + 'o', t:'out', x:680, y:67, p:{}}], links:[[id + 'i', id + 'o']]});
    t9CoolSet(); return; }
  const dl = t.closest('[data-t9cdel]'); if(dl){ t9S().cool.circuits = t9S().cool.circuits.filter(c => c.id!==dl.dataset.t9cdel); t9CoolSet(); return; }
  const ad = t.closest('[data-t9cadd]'); if(ad && !ad.disabled){ const [cid, ty] = ad.dataset.t9cadd.split(':'), C = t9Sel(t9CC(cid)), id = t9Cid(t9S().cool.circuits.flatMap(c => c.blocks), 'k');
    if(T9CB[ty][1]==='part') t9S().cool.circuits.forEach(c => { if(c===C) return; const ids = c.blocks.filter(b => b.t===ty).map(b => b.id); if(!ids.length) return;   // 부품은 한 곳에만: 다른 회로에 있으면 빼 옴
      c.blocks = c.blocks.filter(b => !ids.includes(b.id)); c.links = c.links.filter(([a, b]) => !ids.includes(a) && !ids.includes(b)); t9Sel(c); c.selB = []; c.selL = []; });
    const v = t9View(C), nb = {id, t:ty, x:0, y:0, p:{}}; nb.x = Math.round((v.x + v.w/2 - t9BW(nb)/2)/10)*10; nb.y = Math.round((v.y + v.w*T9VA/2 - t9BH(nb)/2)/10)*10;   // 지금 보는 화면 가운데
    C.blocks.push(nb); C.selB = [id]; C.selL = []; t9CoolSet(); return; } });
document.addEventListener('dblclick', e => { if(!t9On() || !e.target.closest) return; const svg = e.target.closest('svg[data-t9csvg]'); if(!svg) return; const C = t9CC(svg.dataset.t9csvg); if(!C) return;
  const lk = e.target.closest('[data-t9clink]'); if(lk){ const j = +lk.dataset.t9clink.split(':')[1]; if(C.links[j]) delete t9LX(C.links[j]).pts; t9CoolUI(); return; }   // 호스: 자동 경로
});
/* 고른 것 지우기 (갈라진 공랭 덕트의 나머지 비율은 다시 합 1 로) */
function t9CDelSel(C){ t9Sel(C); const dead = new Set(C.selB.filter(id => { const B = C.blocks.find(b => b.id===id); return B && B.t!=='in' && B.t!=='out'; })), dl = new Set(C.selL);
  if(!dead.size && !dl.size) return false; const from = new Set();
  C.links = C.links.filter((l, j) => { const x = dl.has(j) || dead.has(l[0]) || dead.has(l[1]); if(x) from.add(l[0]); return !x; });
  C.blocks = C.blocks.filter(b => !dead.has(b.id)); C.selB = []; C.selL = [];
  from.forEach(a => { const o = C.links.filter(q => q[0]===a), s = o.reduce((t, q) => t + (+q[2] > 0 ? +q[2] : 0), 0); o.forEach(q => { q[2] = o.length > 1 ? (s > 0 && +q[2] > 0 ? +q[2]/s : 1/o.length) : undefined; }); });
  t9CoolSet(); return true; }
/* Esc: 고른 것이 있으면 풀기만 (작업창 닫기보다 먼저 받음 — capture) */
document.addEventListener('keydown', e => { if(e.key!=='Escape' || !t9On() || (e.target.matches && e.target.matches('input,textarea,select'))) return;
  let ch = false; t9S().cool.circuits.forEach(C => { t9Sel(C); if(C.selB.length || C.selL.length){ C.selB = []; C.selL = []; ch = true; } });
  if(ch){ e.preventDefault(); e.stopImmediatePropagation(); t9CoolUI(); } }, true);
document.addEventListener('keydown', e => { if(!t9On() || (e.target.matches && e.target.matches('input,textarea,select'))) return;
  if(!['Delete', 'Backspace'].includes(e.key)) return; const C = t9S().cool.circuits.find(c => { t9Sel(c); return c.selB.length || c.selL.length; }); if(!C) return;
  e.preventDefault(); t9CDelSel(C); });
/* 라디 방열 표: 글자 ↔ 칸 (첫 칸은 머리), 빈 표면 2 × 2 빈칸 */
/* 라디 방열 표: 표 / 상수 고르기 · 지우기 (칸 고치기 · 붙여넣기 · 행 · 열은 2P 칸 표 공통 처리) */
const t9RadB = id => { const [cid, bid] = id.split(':'); return t9CC(cid).blocks.find(b => b.id===bid); };
document.addEventListener('click', e => { if(!t9On() || !e.target.closest) return;
  const u = e.target.closest('[data-t9crqu]'); if(u){ const a = u.dataset.t9crqu.split(':'), B = t9RadB(a[0] + ':' + a[1]); B.p.rqUse = a[2]; t9CoolSet(); return; }
  const x = e.target.closest('[data-t9crqx]'); if(x){ const B = t9RadB(x.dataset.t9crqx); delete B.p.rq; B.p.rqUse = 'tab'; t9CoolSet(); return; }
  const fmb = e.target.closest('[data-t9cfm]'); if(fmb){ const a = fmb.dataset.t9cfm.split(':'), B = t9RadB(a[0] + ':' + a[1]); B.p = B.p || {}; B.p.fm = +a[2]; t9CoolSet(); return; }
  const pm = e.target.closest('[data-t9cpm]'); if(pm){ const a = pm.dataset.t9cpm.split(':'), B = t9RadB(a[0] + ':' + a[1]); B.p = B.p || {}; B.p.pc = +a[2]; t9CoolSet(); } });
/* 갈라진 덕트 비율 입력 (%): 하나를 바꾸면 나머지를 그 비율대로 줄이거나 늘려 합 100 % */
document.addEventListener('change', e => { if(!t9On() || !e.target.matches || !e.target.matches('[data-t9crat]')) return; const [cid, j] = e.target.dataset.t9crat.split(':'), C = t9CC(cid), l = C.links[+j];
  const o = C.links.filter(q => q[0]===l[0]), r = Math.max(0.01, Math.min(0.99, (+e.target.value || 0)/100)), rest = o.filter(q => q!==l), rs = rest.reduce((a, q) => a + (+q[2] || 0), 0);
  l[2] = r; rest.forEach(q => { q[2] = rs > 0 ? (+q[2] || 0)/rs*(1 - r) : (1 - r)/rest.length; }); t9CoolSet(); });
document.addEventListener('change', e => { if(!t9On() || !e.target.matches) return; const t = e.target;
  if(t.matches('[data-t9cbp]')){ const [cid, bid] = t.dataset.t9cbp.split(':'), B = t9CC(cid).blocks.find(b => b.id===bid); B.p = B.p || {}; B.p[t.name] = +t.value; }
  else if(t.matches('[data-t9cwp]')){ const C = t9CC(t.dataset.t9cwp); C.p = C.p || {}; C.p[t.name] = +t.value; }
  else if(t.matches('[data-t9chp]')){ const [cid, j] = t.dataset.t9chp.split(':'), l = t9CC(cid).links[+j]; if(l) t9LX(l)[t.name] = +t.value; }
  else return; t9CoolSet(); });
/* 포인터: 끄는 중 T9CD = {mode: 'move' 블럭 · 'link' 새 호스 · 'mq' 영역 · 'pan' 화면 · 'seg' 호스 토막, …}, 정렬 안내선 T9CG = {cid, gx, gy} */
let T9CD = null, T9CG = null;
/* 호스 k 의 한 끝 잡기: end 'o' = 나가는 쪽 끝 · 'i' = 들어가는 쪽 끝. 끄는 동안 빼 두고 놓을 때 다시 넣음 */
function t9Grab(C, k, end, svg){ const L = C.links[k], X = t9LX(L), pts = X.pts; delete X.pts; C.links.splice(k, 1); C.selB = []; C.selL = [];
  T9CD = {mode:'link', cid:C.id, svg, re:{k, L, a:L[0], b:L[1], pts}, bid:end==='o' ? L[1] : L[0], side:end==='o' ? 'i' : 'o'}; t9CoolRe(C.id); T9CD.svg = document.querySelector(`svg[data-t9csvg="${C.id}"]`); }
const t9CPt = (svg, e) => { const m = svg.getScreenCTM(); if(!m) return [0, 0]; const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(m.inverse()); return [q.x, q.y]; };
function t9CoolRe(cid){ const old = document.querySelector(`svg[data-t9csvg="${cid}"]`); if(!old) return null; const d = document.createElement('div'); d.innerHTML = t9CoolSVG(t9CC(cid)); const n = d.firstElementChild; old.replaceWith(n); return n; }
const t9CTarget = (e, cid, from, need = 'i') => { const ok = B => B.t==='j' || (need==='i' ? B.t!=='in' && !t9InFull(t9CC(cid), B) : B.t!=='out' && !t9OutFull(t9CC(cid), B)); const el = document.elementFromPoint(e.clientX, e.clientY), g = el && el.closest && el.closest('[data-t9cb]'), to = g && g.dataset.t9cb.split(':');
  if(!g){ const lk = el && el.closest && el.closest('[data-t9clink]'), a = lk && lk.dataset.t9clink.split(':');   /* 호스 · 덕트 위에 놓으면 그 줄이 들어가는 블럭 입력으로 합쳐짐 (시뮬링크처럼, 2026-11-11) */
    if(a && a[0]===cid){ const L = t9CC(cid).links[+a[1]], dest = L && L[1], B = dest && t9CC(cid).blocks.find(b => b.id===dest); if(B && dest!==from && L[0]!==from) return {g:lk, id:dest, via:+a[1]}; } return null; }
  if(!to || to[0]!==cid || to[1]===from) return null; const B = t9CC(cid).blocks.find(b => b.id===to[1]); return B && ok(B) ? {g, id:to[1]} : null; };
document.addEventListener('mousedown', e => { if(e.button===1 && t9On() && e.target.closest && e.target.closest('svg[data-t9csvg]')) e.preventDefault(); });   // 휠 버튼 자동 스크롤 막기
document.addEventListener('pointerdown', e => { if(!t9On() || !e.target.closest) return; const svg = e.target.closest('svg[data-t9csvg]'); if(!svg) return;
  const cid = svg.dataset.t9csvg, C = t9Sel(t9CC(cid)); if(!C) return;
  if(e.button===1){ T9CD = {mode:'pan', cid, svg, sx:e.clientX, sy:e.clientY, v0:{...t9View(C)}}; e.preventDefault(); return; }
  if(e.button!==0) return;
  /* 점 누르기 (2026-11-12): 빈 점 = 새 호스 (파랑 → 흰 점 · 흰 점 → 파랑만), 이어진 점 = 그 호스 끝을 잡아 옮김 (사양 그대로, 빈 곳에 놓으면 제자리) */
  const po = e.target.closest('[data-t9cpt]');
  if(po){ const [, bid, side] = po.dataset.t9cpt.split(':'), B = C.blocks.find(b => b.id===bid), k = B.t==='j' ? -1 : C.links.findIndex(l => l[side==='o' ? 0 : 1]===bid);
    if(k >= 0) t9Grab(C, k, side, svg); else T9CD = {mode:'link', cid, bid, svg, side};
    t9CDrag(e); e.preventDefault(); return; }
  const g = e.target.closest('[data-t9cb]'), lk = e.target.closest('[data-t9clink]'), [px, py] = t9CPt(svg, e);
  if(g){ const bid = g.dataset.t9cb.split(':')[1], was = C.selB.includes(bid);
    if(e.shiftKey){ C.selB = was ? C.selB.filter(x => x!==bid) : [...C.selB, bid]; }
    else if(!was){ C.selB = [bid]; C.selL = []; }
    const grp = C.selB.includes(bid) ? C.selB.slice() : [bid], B = C.blocks.find(b => b.id===bid);
    T9CD = {mode:'move', cid, bid, svg, grp, was, shift:e.shiftKey, px, py, x0:new Map(C.blocks.filter(b => grp.includes(b.id)).map(b => [b.id, [b.x, b.y]])),
            pts0:new Map(C.links.map((l, j) => [j, grp.includes(l[0]) && grp.includes(l[1]) && Array.isArray(t9LX(l).pts) ? t9LX(l).pts.map(p => p.slice()) : null])), bx0:B.x, by0:B.y, moved:false, raf:0, sx:e.clientX, sy:e.clientY};
    t9CoolRe(cid); T9CD.svg = document.querySelector(`svg[data-t9csvg="${cid}"]`); e.preventDefault(); return; }
  if(lk){ const j = +lk.dataset.t9clink.split(':')[1];
    { const P = t9Route(C, j, new Map(C.blocks.map(b => [b.id, b]))), Z = P && P[P.length - 1];   // 호스 끝 (분기점 쪽 포함) 가까이 누르면 그 끝을 잡음
      const end = !P || e.shiftKey ? '' : Math.hypot(px - P[0][0], py - P[0][1]) < 24 ? 'o' : Math.hypot(px - Z[0], py - Z[1]) < 24 ? 'i' : '';
      if(end){ t9Grab(C, j, end, svg); t9CDrag(e); e.preventDefault(); return; } }
    if(e.shiftKey) C.selL = C.selL.includes(j) ? C.selL.filter(x => x!==j) : [...C.selL, j]; else { C.selL = [j]; C.selB = []; }
    const by = new Map(C.blocks.map(b => [b.id, b])), P = t9Route(C, j, by), q = P ? t9SegAt(P, px, py) : -1;
    if(q >= 0 && !e.shiftKey){ const vert = Math.abs(P[q][0] - P[q + 1][0]) < 0.5, fix = vert ? P[q][0] : P[q][1], lo = Math.min(P[q][vert ? 1 : 0], P[q + 1][vert ? 1 : 0]), hi = Math.max(P[q][vert ? 1 : 0], P[q + 1][vert ? 1 : 0]);
      const grp = [[j, q, P.slice(1, -1).map(p => p.slice())]];
      T9CD = {mode:'seg', cid, svg, j, q, vert, fix, grp, px, py, sx:e.clientX, sy:e.clientY, moved:false, raf:0}; }
    t9CoolRe(cid); if(T9CD) T9CD.svg = document.querySelector(`svg[data-t9csvg="${cid}"]`); else t9CoolUI(); e.preventDefault(); return; }
  const now = Date.now(), L2 = T9DC; T9DC = {t:now, x:e.clientX, y:e.clientY, cid};
  if(L2 && L2.cid===cid && now - L2.t < 400 && Math.hypot(e.clientX - L2.x, e.clientY - L2.y) < 6){ T9DC = null; C.view = t9Fit(C); t9CoolUI(); e.preventDefault(); return; }   // 빈 곳 두 번 = 전체 보기
  T9CD = {mode:'mq', cid, svg, px, py, sx:e.clientX, sy:e.clientY, shift:e.shiftKey, moved:false}; e.preventDefault(); });
let T9DC = null;   // 빈 곳 두 번 누르기 확인
function t9CDrag(e){ const D = T9CD, C = t9CC(D.cid), B = C.blocks.find(b => b.id===D.bid), svg = D.svg; if(!svg) return; const [px, py] = t9CPt(svg, e);
  let d; if(D.side==='i'){ const [x2, y2] = t9Pin(B), xm = Math.min(x2 - 16, (x2 + px)/2); d = t9Ortho([[px, py], [xm, py], [xm, y2], [x2, y2]], 10); }
  else { const [x1, y1] = t9Pout(B), xm = Math.max(x1 + 16, (x1 + px)/2); d = t9Ortho([[x1, y1], [xm, y1], [xm, py], [px, py]], 10); }
  const hg = svg.querySelector('.t9-hose.drag'), ce = svg.querySelector('.t9-cend'); hg.style.display = ''; hg.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
  ce.style.display = ''; ce.setAttribute('cx', px); ce.setAttribute('cy', py);
  svg.querySelectorAll('.t9-cb.tgt').forEach(g => g.classList.remove('tgt')); const T = t9CTarget(e, D.cid, D.bid, D.side==='i' ? 'o' : 'i'); if(T) T.g.classList.add('tgt'); }
document.addEventListener('pointermove', e => { if(!T9CD) return; const D = T9CD, C = t9CC(D.cid); if(!C) return;
  if(D.mode==='link'){ t9CDrag(e); return; }
  if(D.mode==='pan'){ const r = D.svg.getBoundingClientRect(), k = D.v0.w/Math.max(1, r.width); C.view = {x:D.v0.x - (e.clientX - D.sx)*k, y:D.v0.y - (e.clientY - D.sy)*k, w:D.v0.w}; D.svg.setAttribute('viewBox', t9VB(C.view)); return; }
  if(!D.moved && Math.hypot(e.clientX - D.sx, e.clientY - D.sy) < 5) return;   // 5 px 안쪽은 누르기
  D.moved = true; const [px, py] = t9CPt(D.svg, e);
  if(D.mode==='mq'){ const m = D.svg.querySelector('.t9-cmq'), x = Math.min(px, D.px), y = Math.min(py, D.py); m.style.display = ''; m.setAttribute('x', x); m.setAttribute('y', y); m.setAttribute('width', Math.abs(px - D.px)); m.setAttribute('height', Math.abs(py - D.py)); D.r = [x, y, x + Math.abs(px - D.px), y + Math.abs(py - D.py)]; return; }
  if(D.mode==='seg'){ const to = Math.round((D.fix + (D.vert ? px - D.px : py - D.py))/5)*5;   // 끄는 토막의 새 좌표 (5 칸 격자)
    D.grp.forEach(([k, s, p0]) => { const X = t9LX(C.links[k]); X.pts = p0.map(p => p.slice()); [s - 1, s].forEach(m => { if(X.pts[m]) X.pts[m][D.vert ? 0 : 1] = to; }); });
    if(!D.raf) D.raf = requestAnimationFrame(() => { D.raf = 0; const n = t9CoolRe(D.cid); if(n) D.svg = n; }); return; }
  // 블럭 옮기기: 끄는 블럭 기준으로 다른 블럭과 가운데가 8 안쪽이면 붙이고 안내선, 아니면 10 칸 격자 → 고른 블럭 모두 같은 만큼
  const B = C.blocks.find(b => b.id===D.bid); let x = D.bx0 + (px - D.px), y = D.by0 + (py - D.py), gx = null, gy = null;
  C.blocks.forEach(o => { if(D.grp.includes(o.id)) return; const cy = o.y + t9BH(o)/2, cx = o.x + t9BW(o)/2;
    if(gy==null && Math.abs(y + t9BH(B)/2 - cy) < 8){ y = cy - t9BH(B)/2; gy = cy; } if(gx==null && Math.abs(x + t9BW(B)/2 - cx) < 8){ x = cx - t9BW(B)/2; gx = cx; } });
  if(gx==null) x = Math.round(x/10)*10; if(gy==null) y = Math.round(y/10)*10;
  const dx = x - D.bx0, dy = y - D.by0;
  C.blocks.forEach(b => { const p0 = D.x0.get(b.id); if(p0){ b.x = p0[0] + dx; b.y = p0[1] + dy; } });
  C.links.forEach((l, j) => { const p0 = D.pts0.get(j); if(p0) t9LX(l).pts = p0.map(([qx, qy]) => [qx + dx, qy + dy]); });   // 양 끝을 같이 옮기면 꺾임점도
  T9CG = {cid:D.cid, gx, gy};
  if(!D.raf) D.raf = requestAnimationFrame(() => { D.raf = 0; const n = t9CoolRe(D.cid); if(n) D.svg = n; }); });
document.addEventListener('pointerup', e => { if(!T9CD) return; const D = T9CD, C = t9CC(D.cid); T9CD = null; T9CG = null; if(!C) return; if(D.raf) cancelAnimationFrame(D.raf);
  if(D.mode==='pan'){ t9CoolSave(); return; }
  if(D.mode==='seg'){ if(!D.moved){ t9CoolUI(); return; } t9CoolSet(); return; }
  if(D.mode==='mq'){ if(!D.moved || !D.r){ if(!D.shift && (C.selB.length || C.selL.length)){ C.selB = []; C.selL = []; t9CoolUI(); } return; }
    const [x0, y0, x1, y1] = D.r, inR = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, by = new Map(C.blocks.map(b => [b.id, b]));
    // 걸치기만 해도 고름 (시뮬링크): 블럭 사각형이 영역과 겹치거나, 호스 토막 하나라도 영역을 지나면
    const bs = C.blocks.filter(b => b.x <= x1 && b.x + t9BW(b) >= x0 && b.y <= y1 && b.y + t9BH(b) >= y0).map(b => b.id);
    const segHit = (a, b) => { if(inR(...a) || inR(...b)) return true; const vert = Math.abs(a[0] - b[0]) < 0.5; return vert ? a[0] >= x0 && a[0] <= x1 && Math.min(a[1], b[1]) <= y1 && Math.max(a[1], b[1]) >= y0 : a[1] >= y0 && a[1] <= y1 && Math.min(a[0], b[0]) <= x1 && Math.max(a[0], b[0]) >= x0; };
    const ls = C.links.map((l, j) => j).filter(j => { const P = t9Route(C, j, by); if(!P) return false; for(let q = 0; q < P.length - 1; q++) if(segHit(P[q], P[q + 1])) return true; return false; });
    C.selB = D.shift ? [...new Set([...C.selB, ...bs])] : bs; C.selL = D.shift ? [...new Set([...C.selL, ...ls])] : ls; t9CoolUI(); return; }
  if(D.mode==='move'){ if(!D.moved){ if(!D.shift && D.was){ C.selB = [D.bid]; C.selL = []; } t9CoolUI(); return; } t9CoolSet(); return; }
  const T = t9CTarget(e, D.cid, D.bid, D.side==='i' ? 'o' : 'i'), R = D.re, pair = id => D.side==='i' ? [id, D.bid] : [D.bid, id];   // 새 호스 · 옮긴 호스
  const back = () => { if(R.pts) t9LX(R.L).pts = R.pts; C.links.splice(R.k, 0, R.L); };
  const put = (a, b) => { if(R){ if(a===R.a && b===R.b) return back(); R.L[0] = a; R.L[1] = b; C.links.splice(R.k, 0, R.L); } else C.links.push([a, b]); };
  let done = false;
  if(T && T.via != null){   /* 호스 · 덕트 위에 놓음: 그 자리에 합류점을 만들고 줄을 둘로 나눔 (토막마다 사양 따로, 길이는 반씩) (2026-11-11) */
    const Lk = C.links[T.via], [a0, b0] = Lk, [px, py] = t9CPt(D.svg, e), jid = t9Cid(t9S().cool.circuits.flatMap(c => c.blocks), 'k'), x = {...t9LX(Lk)}; delete x.pts;
    const half = isFinite(+x.len) && x.len !== '' ? {...x, len:+(+x.len/2).toFixed(3)} : {...x};
    C.blocks.push({id:jid, t:'j', x:Math.round(px - 11), y:Math.round(py - 11), p:{}});
    C.links.splice(T.via, 1, [a0, jid, Lk[2], {...half}], [jid, b0, undefined, {...half}]);
    if(R && R.k > T.via) R.k++; put(...pair(jid)); done = true; }
  else if(T){ const [a, b] = pair(T.id); if(!C.links.some(l => l[0]===a && l[1]===b)){ put(a, b); done = true; } }
  if(!done && R) back();   // 빈 곳에 놓음 → 제자리 (꺾임점도)
  if(C.kind==='air') [...new Set(C.links.map(l => l[0]))].forEach(a => { const o = C.links.filter(l => l[0]===a), s = o.reduce((t, q) => t + (+q[2] > 0 ? +q[2] : 0), 0);   // 갈래 비율 합 1
    o.forEach(q => { q[2] = o.length > 1 ? (s > 0 && +q[2] > 0 && o.every(z => +z[2] > 0) ? +q[2]/s : 1/o.length) : undefined; }); });
  C.selB = []; C.selL = []; t9CoolSet(); });
/* 휠 = 확대 · 축소 (커서 자리를 그대로 둠) */
document.addEventListener('wheel', e => { if(!t9On() || !e.target.closest) return; const svg = e.target.closest('svg[data-t9csvg]'); if(!svg || !wbZoomOn(svg.closest('[data-zoombox]'))) return; e.preventDefault();
  const C = t9CC(svg.dataset.t9csvg); if(!C) return; const v = t9View(C), [px, py] = t9CPt(svg, e), k = Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY*0.0015))), w = Math.max(150, Math.min(8000, v.w*k)), f = w/v.w;
  C.view = {x:px - (px - v.x)*f, y:py - (py - v.y)*f, w}; svg.setAttribute('viewBox', t9VB(C.view)); clearTimeout(T9VT); T9VT = setTimeout(t9CoolSave, 400); }, {passive:false});
let T9VT = 0;
