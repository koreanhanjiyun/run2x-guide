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
// ================================================================ 냉각 회로 공통 (도구 9 · 도구 2P 계산과 냉각 편집기가 같이 씀)
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
    const Tin = fs > 0 ? ft / fs : Ta, Cq = Ca * (n.q > 0 ? n.q : 1), p = n.part;
    if (!p) { out[k] = Tin; return; }   // 합류 · 분기점 (부품 없음): 섞어서 그대로 넘김 (2026-11-11)
    const G = Cq > 0 ? Cq * (1 - Math.exp(-hA(p) / Cq)) : 0;
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
/* 라디 방열 표 (스펙 시트): B.p.rq = 글자 (첫 행 냉각수 유량 L/min, 첫 열 코어 풍속 m/s, 칸 kW), B.p.rqUse = 'const' 면 위 UA. 다른 표와 같은 규칙 (값이 있으면 표 · UA 칸 잠김) */
const t9RadTab = B => B && B.t==='rad' && B.p && B.p.rqUse!=='const' && typeof t2GridParse==='function' && B.p.rq ? t2GridParse(B.p.rq).map : null;
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
const t9BMiss = (C, b) => !wbEx() && t9CParams(C, b).some(([k]) => !(b.t==='rad' && (t9RadTab(b) ? k==='UA' : k==='itd')) && !(b.t==='rad' && k==='fon' && t9CV(b.p, T9CP.rad).fm!==1) && !isFinite(t9CV(b.p, t9CParams(C, b))[k]));
function t9Blank(C){ const L = [], nm = (b) => T9CB[b.t] ? T9CB[b.t][0] : b.t, miss = (o, def, skip = {}) => def.filter(([k]) => !skip[k] && !isFinite(t9CV(o, def)[k])).map(([, n]) => n);
  if(C.kind==='water'){ const m = miss(C.p, T9CPW()); if(m.length) L.push(`냉각수: ${m.join(' · ')}`);
    C.links.forEach(l => { const m2 = miss(t9LX(l), T9CP.hose); if(m2.length) L.push(`호스 ${nm({t:(C.blocks.find(b => b.id===l[0]) || {}).t})} → ${nm({t:(C.blocks.find(b => b.id===l[1]) || {}).t})}: ${m2.join(' · ')}`); }); }
  C.blocks.forEach(b => { const m = miss(b.p, t9CParams(C, b), b.t==='rad' ? {...(t9RadTab(b) ? {UA:1} : {itd:1}), ...(t9CV(b.p, T9CP.rad).fm===1 ? {} : {fon:1})} : {}); if(m.length) L.push(`${nm(b)}: ${m.join(' · ')}`); });
  return L.map(s => s + ' 비어 있음'); }
/* 수랭 회로 → 계산용: 갈라지고 합쳐지는 배관 가능. 라디에이터에서 나가는 흐름 = 1, 합쳐지는 곳은 더함.
   라디로 들어오는 호스를 빼면 순환 없는 흐름이어야 함 → 그 순서(위상 정렬)로 점을 늘어놓음 (라디 = 0 번).
   구조 확인(펌프가 전체 흐름 자리인지)은 똑같이 나눈 몫으로, 실제 갈래 몫은 hyd (호스 · 블럭 압력 강하)로 계산 (coolPrep).
   배관 · 탱크 냉각수 양은 점마다 똑같이 나눠 더함 */
/* '로 / 으로': 받침 있고 ㄹ 받침이 아니면 '으로' */
const t9Ro = s => { const c = s.charCodeAt(s.length - 1) - 0xAC00, k = c >= 0 && c < 11172 ? c % 28 : 0; return s + (k && k!==8 ? '으로' : '로'); };
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
    C.blocks.forEach(b => { if(T9CB[b.t] && T9CB[b.t][1]==='part'){ if(used[b.t]) E.push(`${T9CB[b.t][0]}이 다른 회로에도 있음`); used[b.t] = true; } });
    if(!wbEx() && C.blocks.length){ const bl = t9Blank(C); if(bl.length){ E.push(`빈칸 있음 (빨간 테두리 블럭 · ${C.kind==='water' ? '호스 · 냉각수' : '덕트'}를 눌러 채우기)`); err[C.id] = E; return; } }
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
      s += `<g class="t9-cb t9-cj ${C.kind}${sel ? ' sel' : ''}" data-t9cb="${C.id}:${b.id}" transform="translate(${b.x},${b.y})"><circle cx="11" cy="11" r="8"/><circle cx="22" cy="11" r="4.5" class="t9-cpo" data-t9cpo="${C.id}:${b.id}"><title>끌어서 다음 블럭에 이음</title></circle></g>`; return; }
    const [nm, kind] = T9CB[b.t], q = Object.fromEntries(Object.entries(t9CV(b.p, t9CAll(C, b))).map(([k, v]) => [k, typeof v==='number' && !isFinite(v) ? '—' : v])), sel = sB.has(b.id), w = t9BW(b), h = t9BH(b), rd = t9Rd(b);
    const sub = b.t==='pump' && q.pc===1 ? `곡선 ${q.h0} kPa` : b.t==='rad' ? `${q.A} m² · ${t9RadTab(b) ? '방열 표' : `UA ${q.UA}`}${q.fm===1 && q.fon > 0 ? ` · 팬 ${q.fon} °C` : ''}` : b.t==='pump' ? `${q.flow} L/min` : b.t==='in' ? `${q.A} m² · 팬 ${q.fan}` : kind==='part' ? (C.kind==='water' ? `냉각수 ${q.V} L` : '부품 hA') : '';
    const shape = rd ? `<circle cx="${w/2}" cy="${h/2}" r="${w/2}"/>` : `<rect width="${w}" height="${h}" rx="7"/>`;
    const txt = rd ? `<text x="${w/2}" y="${sub ? h/2 - 2 : h/2 + 4}" text-anchor="middle" class="t9-cbn sm">${b.t==='in' ? '입구' : b.t==='out' ? '출구' : nm}</text>${sub ? `<text x="${w/2}" y="${h/2 + 13}" text-anchor="middle" class="t9-cbs sm">${b.t==='in' ? `${q.A} m²` : sub}</text>` : ''}`
                   : `<text x="${w/2}" y="24" text-anchor="middle" class="t9-cbn">${nm}</text><text x="${w/2}" y="42" text-anchor="middle" class="t9-cbs">${sub}</text>`;
    s += `<g class="t9-cb ${kind}${rd ? ' rd' : ''}${sel ? ' sel' : ''}${t9BMiss(C, b) ? ' need' : ''}" data-t9cb="${C.id}:${b.id}" transform="translate(${b.x},${b.y})">${shape}${txt}
      ${b.t!=='in' ? `<circle cx="0" cy="${h/2}" r="6" class="t9-cpi"/>` : ''}${b.t!=='out' ? (t9OutFull(C, b) ? `<circle cx="${w}" cy="${h/2}" r="7" class="t9-cpo full"/>` : `<circle cx="${w}" cy="${h/2}" r="7" class="t9-cpo" data-t9cpo="${C.id}:${b.id}"><title>끌어서 다음 블럭에 이음</title></circle>`) : ''}</g>`; });
  s += hdl;
  if(T9CG && T9CG.cid===C.id){ if(T9CG.gx!=null) s += `<line x1="${T9CG.gx}" x2="${T9CG.gx}" y1="${v.y - 2000}" y2="${v.y + 4000}" class="t9-cguide"/>`; if(T9CG.gy!=null) s += `<line y1="${T9CG.gy}" y2="${T9CG.gy}" x1="${v.x - 4000}" x2="${v.x + 8000}" class="t9-cguide"/>`; }   // 정렬 안내선
  return s + `<rect class="t9-cmq" style="display:none"/><g class="t9-hose ${C.kind} drag" style="display:none"><path class="o"/><path class="i"/><path class="f"/></g><circle class="t9-cend ${C.kind}" r="9" style="display:none"/></svg>`; }   // 영역 고르기 · 끄는 중인 호스
function t9CoolPage(){ const CC = t9S().cool.circuits, nw = CC.filter(c => c.kind==='water').length, na = CC.filter(c => c.kind==='air').length, comp = t9CoolCompile(), used = new Set(CC.flatMap(c => c.blocks.map(b => b.t)));
  const card = C => { t9Sel(C); const E = comp.err[C.id], pal = C.kind==='water' ? ['rad', 'pump', 'm', 'i', 'b', 'j'] : ['m', 'i', 'b', 'j'], by = new Map(C.blocks.map(b => [b.id, b]));
    const form = (title, def, obj, attr, lock = {}) => `<div class="t9-cform"><b>${title}</b>${def.map(([k, n, u, d]) => { const v = t9CV(obj, def)[k];
        return `<label class="t9-cfi${!lock[k] && !isFinite(v) ? ' need' : ''}"><span>${n}</span><input type="number" step="any" value="${isFinite(v) ? v : ''}" ${attr} name="${k}"${lock[k] ? ` disabled title="${lock[k]}"` : ''}><i>${u}</i>${lock[k] ? `<em class="t9-clk">${lock[k]}</em>` : ''}</label>`; }).join('')}</div>`;
    const radTab = B => { const M = B.p && B.p.rq && typeof t2GridParse==='function' ? t2GridParse(B.p.rq).map : null, use = B.p && B.p.rqUse==='const' ? 'const' : 'tab', id = `${C.id}:${B.id}`;
      const G = t9RqGrid(B.p && B.p.rq);   // 칸마다 바로 고치는 표 (다른 표와 같음): 첫 행 = 유량, 첫 열 = 풍속
      return `<div class="t9-cform t9-crqb"><b>방열 표 (스펙 시트)</b><span class="muted">첫 행 = 냉각수 유량 L/min · 첫 열 = 코어 풍속 m/s · 칸 = 방열량 kW. 칸을 고치거나, 엑셀에서 여러 칸을 복사해 표를 누르고 Ctrl+V (표 전체를 바꿈). 값이 있으면 [UA] 대신 씀 (점마다 ε-NTU 로 UA 를 거꾸로 구해 보간)</span>
        <span class="t2-use">${M ? `<span class="muted">계산에 쓸 값</span><span class="dc-seg" role="group">${[['tab', '표'], ['const', 'UA']].map(([q, nm]) => `<button type="button" data-t9crqu="${id}:${q}" aria-pressed="${use===q}">${nm}</button>`).join('')}</span>` : '<span class="muted">비어 있음 → 위 UA 씀</span>'}
          <button type="button" class="btn small" data-t9crqa="${id}:row">+ 행 (풍속)</button><button type="button" class="btn small" data-t9crqa="${id}:col">+ 열 (유량)</button>${B.p && B.p.rq ? `<button type="button" class="btn small" data-t9crqx="${id}">표 지우기</button>` : ''}</span>
        <div class="t9-crq" data-t9crq="${id}"><table class="t2-tt t9-rqt">${G.map((r, ri) => `<tr>${r.map((v, ci) => ri===0 && ci===0 ? '<th class="muted">풍속 \\ 유량</th>' : `<td><input type="text" inputmode="decimal" value="${wbEsc(v)}" data-t9rqc="${id}:${ri}:${ci}"${ri===0 || ci===0 ? ' class="hd"' : ''}></td>`).join('')}</tr>`).join('')}</table></div></div>`; };
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
      : B ? `<div class="t9-csel">${t9CParams(C, B).length ? form(`${T9CB[B.t][0]} 블럭`, t9CParams(C, B), B.p, `data-t9cbp="${C.id}:${B.id}"`, B.t==='rad' ? {...(t9RadTab(B) ? {UA:'표 사용'} : {itd:'표 없음'}), ...(t9CV(B.p, T9CP.rad).fm===1 ? {} : {fon:'팬 늘 켬'})} : {}) + (B.t==='rad' ? `<div class="t9-cform"><b>팬 켜기</b><span class="dc-seg" role="group">${[[0, '늘 켬'], [1, '냉각수 온도로']].map(([q, nm]) => `<button type="button" data-t9cfm="${C.id}:${B.id}:${q}" aria-pressed="${t9CV(B.p, T9CP.rad).fm===q}">${nm}</button>`).join('')}</span></div>` + radTab(B) : '') + (B.t==='pump' ? `<div class="t9-cform"><b>유량 정하기</b><span class="dc-seg" role="group">${[[0, '유량 고정'], [1, '펌프 곡선']].map(([q, nm]) => `<button type="button" data-t9cpm="${C.id}:${B.id}:${q}" aria-pressed="${t9CV(B.p, T9CP.pump).pc===q}">${nm}</button>`).join('')}</span><span class="muted">${t9CV(B.p, T9CP.pump).pc===1 ? '올리는 압력 = 막힘 압력 × (1 − (유량 ÷ 최대 유량)²), 호스 · 블럭 압력 강하와 만나는 점에서 유량이 정해짐 (펌프 스펙 시트의 곡선 양 끝)' : '회로 압력 강하와 상관없이 이 유량'}</span></div>` : '') : `<div class="t9-cform"><b>${T9CB[B.t][0]} 블럭</b><span class="muted">${T9CB[B.t][1]==='part' ? '부품 쪽 값(열용량 · 열저항 · hA)은 그 부품 항목에 있습니다.' : '입력 없음'}</span></div>`}</div>`
      : C.selB.length + C.selL.length ? `<p class="muted t9-cmsg">블럭 ${C.selB.length}개 · ${C.kind==='water' ? '호스' : '덕트'} ${C.selL.length}개 고름 · 끌면 같이 옮겨지고 Delete 로 지움</p>`
      : (h => `<ul class="muted t9-cmsg t9-chelp"><li><b>끌기</b> 블럭 옮기기 · 빈 곳 = 영역 고르기 (Shift = 더해 고르기)</li><li><b>잇기</b> 블럭 오른쪽 점을 끌어 다른 블럭에 놓기</li><li><b>가르기 · 합치기</b> 합류 · 분기점 (${C.kind==='water' ? '호스' : '덕트'} 위에 놓아도 생김)${C.kind==='water' ? '' : ' · 갈래 비율 입력'}</li><li><b>${h} 토막</b> 끌어서 옮김 · 두 번 누르면 자동 경로</li><li><b>보기</b> 휠 = 확대 · 축소 (그림을 한 번 누른 뒤) · 휠 버튼 끌기 = 이동 · 빈 곳 두 번 = 전체</li><li><b>지우기</b> Delete</li></ul>`)(C.kind==='water' ? '호스' : '덕트');
    return `<div class="t9-cc" data-t9cc="${C.id}"><div class="t9-cch"><b>${wbEsc(C.name)}</b>
        <span class="t9-cpal"><span class="muted">블럭 넣기</span>${pal.map(t => { const here = C.blocks.some(b => b.t===t), other = T9CB[t][1]==='part' && !here && used.has(t) ? t9S().cool.circuits.find(c => c!==C && c.blocks.some(b => b.t===t)) : null, one = T9CB[t][1]==='part' && here;
      return `<button type="button" class="btn small" data-t9cadd="${C.id}:${t}"${one ? ` disabled title="${T9CB[t][0]}은 이 회로에 이미 있음 (부품은 한 곳에만)"` : other ? ` title="${wbEsc(other.name)}에서 이 회로로 옮김"` : ''}>+ ${T9CB[t][0]}${other ? ' (옮김)' : ''}</button>`; }).join('')}</span>
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
function t9RqGrid(txt){ const R = String(txt || '').replace(/\r/g, '').split('\n').filter(l => l.trim()).map(l => l.split(/[,\t]/).map(c => c.trim()));
  if(!R.length) return [['', ''], ['', '']]; const w = Math.max(...R.map(r => r.length)); return R.map(r => Array.from({length:w}, (_, k) => r[k] ?? '')); }
const t9RqText = G => G.map(r => r.join(', ')).join('\n');
document.addEventListener('change', e => { if(!t9On() || !e.target.matches || !e.target.matches('[data-t9rqc]')) return; const a = e.target.dataset.t9rqc.split(':'), B = t9RadB(a[0] + ':' + a[1]), G = t9RqGrid(B.p && B.p.rq);
  G[+a[2]][+a[3]] = e.target.value.trim(); B.p = B.p || {}; B.p.rq = t9RqText(G); if(!B.p.rqUse) B.p.rqUse = 'tab'; t9CoolSet(); });
/* 라디 방열 표: 붙여넣기 · 행 · 열 더하기 · 표 / UA 고르기 · 지우기 */
const t9RadB = id => { const [cid, bid] = id.split(':'); return t9CC(cid).blocks.find(b => b.id===bid); };
document.addEventListener('paste', e => { if(!t9On() || !e.target.closest) return; const t = e.target.closest('[data-t9crq]'); if(!t) return;
  const txt = (e.clipboardData && e.clipboardData.getData('text/plain')) || ''; if(!/[\t\n]/.test(txt.trim())) return; e.preventDefault();   // 한 칸이면 그 칸에 그대로
  const v = txt.replace(/\r/g, '').split('\n').filter(l => l.trim()).map(l => l.split('\t').map(c => c.trim()).join(', ')).join('\n');
  if(typeof t2GridParse!=='function' || !t2GridParse(v).map){ toast('표를 읽지 못했습니다. 첫 행 = 냉각수 유량 L/min, 첫 열 = 코어 풍속 m/s, 칸 = 방열량 kW.'); return; }
  const B = t9RadB(t.dataset.t9crq); B.p = B.p || {}; B.p.rq = v; B.p.rqUse = 'tab'; t9CoolSet(); toast('방열 표를 넣었습니다 (UA 대신 씀).'); });
document.addEventListener('click', e => { if(!t9On() || !e.target.closest) return;
  const u = e.target.closest('[data-t9crqu]'); if(u){ const a = u.dataset.t9crqu.split(':'), B = t9RadB(a[0] + ':' + a[1]); B.p.rqUse = a[2]; t9CoolSet(); return; }
  const x = e.target.closest('[data-t9crqx]'); if(x){ const B = t9RadB(x.dataset.t9crqx); delete B.p.rq; delete B.p.rqUse; t9CoolSet(); return; }
  const ad = e.target.closest('[data-t9crqa]'); if(ad){ const a = ad.dataset.t9crqa.split(':'), B = t9RadB(a[0] + ':' + a[1]), G = t9RqGrid(B.p && B.p.rq); if(a[2]==='row') G.push(G[0].map(() => '')); else G.forEach(r => r.push(''));
    B.p = B.p || {}; B.p.rq = t9RqText(G); t9CoolUI(); }
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
const t9CPt = (svg, e) => { const m = svg.getScreenCTM(); if(!m) return [0, 0]; const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(m.inverse()); return [q.x, q.y]; };
function t9CoolRe(cid){ const old = document.querySelector(`svg[data-t9csvg="${cid}"]`); if(!old) return null; const d = document.createElement('div'); d.innerHTML = t9CoolSVG(t9CC(cid)); const n = d.firstElementChild; old.replaceWith(n); return n; }
const t9CTarget = (e, cid, from) => { const el = document.elementFromPoint(e.clientX, e.clientY), g = el && el.closest && el.closest('[data-t9cb]'), to = g && g.dataset.t9cb.split(':');
  if(!g){ const lk = el && el.closest && el.closest('[data-t9clink]'), a = lk && lk.dataset.t9clink.split(':');   /* 호스 · 덕트 위에 놓으면 그 줄이 들어가는 블럭 입력으로 합쳐짐 (시뮬링크처럼, 2026-11-11) */
    if(a && a[0]===cid){ const L = t9CC(cid).links[+a[1]], dest = L && L[1], B = dest && t9CC(cid).blocks.find(b => b.id===dest); if(B && dest!==from && L[0]!==from && B.t!=='in') return {g:lk, id:dest, via:+a[1]}; } return null; }
  if(!to || to[0]!==cid || to[1]===from) return null; const C = t9CC(cid), B = C.blocks.find(b => b.id===to[1]); return B && B.t!=='in' && !t9InFull(C, B) ? {g, id:to[1]} : null; };
document.addEventListener('mousedown', e => { if(e.button===1 && t9On() && e.target.closest && e.target.closest('svg[data-t9csvg]')) e.preventDefault(); });   // 휠 버튼 자동 스크롤 막기
document.addEventListener('pointerdown', e => { if(!t9On() || !e.target.closest) return; const svg = e.target.closest('svg[data-t9csvg]'); if(!svg) return;
  const cid = svg.dataset.t9csvg, C = t9Sel(t9CC(cid)); if(!C) return;
  if(e.button===1){ T9CD = {mode:'pan', cid, svg, sx:e.clientX, sy:e.clientY, v0:{...t9View(C)}}; e.preventDefault(); return; }
  if(e.button!==0) return;
  const po = e.target.closest('[data-t9cpo]');
  if(po){ const bid = po.dataset.t9cpo.split(':')[1]; T9CD = {mode:'link', cid, bid, svg}; t9CDrag(e); e.preventDefault(); return; }
  const g = e.target.closest('[data-t9cb]'), lk = e.target.closest('[data-t9clink]'), [px, py] = t9CPt(svg, e);
  if(g){ const bid = g.dataset.t9cb.split(':')[1], was = C.selB.includes(bid);
    if(e.shiftKey){ C.selB = was ? C.selB.filter(x => x!==bid) : [...C.selB, bid]; }
    else if(!was){ C.selB = [bid]; C.selL = []; }
    const grp = C.selB.includes(bid) ? C.selB.slice() : [bid], B = C.blocks.find(b => b.id===bid);
    T9CD = {mode:'move', cid, bid, svg, grp, was, shift:e.shiftKey, px, py, x0:new Map(C.blocks.filter(b => grp.includes(b.id)).map(b => [b.id, [b.x, b.y]])),
            pts0:new Map(C.links.map((l, j) => [j, grp.includes(l[0]) && grp.includes(l[1]) && Array.isArray(t9LX(l).pts) ? t9LX(l).pts.map(p => p.slice()) : null])), bx0:B.x, by0:B.y, moved:false, raf:0, sx:e.clientX, sy:e.clientY};
    t9CoolRe(cid); T9CD.svg = document.querySelector(`svg[data-t9csvg="${cid}"]`); e.preventDefault(); return; }
  if(lk){ const j = +lk.dataset.t9clink.split(':')[1];
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
  const [x1, y1] = t9Pout(B), xm = Math.max(x1 + 16, (x1 + px)/2), d = t9Ortho([[x1, y1], [xm, y1], [xm, py], [px, py]], 10);
  const hg = svg.querySelector('.t9-hose.drag'), ce = svg.querySelector('.t9-cend'); hg.style.display = ''; hg.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
  ce.style.display = ''; ce.setAttribute('cx', px); ce.setAttribute('cy', py);
  svg.querySelectorAll('.t9-cb.tgt').forEach(g => g.classList.remove('tgt')); const T = t9CTarget(e, D.cid, D.bid); if(T) T.g.classList.add('tgt'); }
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
  const T = t9CTarget(e, D.cid, D.bid);   // 새 호스
  if(T && T.via != null){   /* 호스 · 덕트 위에 놓음: 그 자리에 합류점을 만들고 줄을 둘로 나눔 (토막마다 사양 따로, 길이는 반씩) (2026-11-11) */
    const Lk = C.links[T.via], [a0, b0] = Lk, [px, py] = t9CPt(D.svg, e), jid = t9Cid(t9S().cool.circuits.flatMap(c => c.blocks), 'k'), x = {...t9LX(Lk)}; delete x.pts;
    const half = isFinite(+x.len) && x.len !== '' ? {...x, len:+(+x.len/2).toFixed(3)} : {...x};
    C.blocks.push({id:jid, t:'j', x:Math.round(px - 11), y:Math.round(py - 11), p:{}});
    C.links.splice(T.via, 1, [a0, jid, Lk[2], {...half}], [jid, b0, undefined, {...half}]);
    C.links.push([D.bid, jid]); const o = C.links.filter(l => l[0]===D.bid); if(C.kind==='air' && o.length > 1) o.forEach(l => { l[2] = 1/o.length; }); C.selB = []; C.selL = []; }
  else if(T && !C.links.some(([a, b]) => a===D.bid && b===T.id)){ C.links.push([D.bid, T.id]); const o = C.links.filter(l => l[0]===D.bid); if(C.kind==='air' && o.length > 1) o.forEach(l => { l[2] = 1/o.length; }); C.selB = []; C.selL = []; }
  t9CoolSet(); });
/* 휠 = 확대 · 축소 (커서 자리를 그대로 둠) */
document.addEventListener('wheel', e => { if(!t9On() || !e.target.closest) return; const svg = e.target.closest('svg[data-t9csvg]'); if(!svg || !wbZoomOn(svg.closest('[data-zoombox]'))) return; e.preventDefault();
  const C = t9CC(svg.dataset.t9csvg); if(!C) return; const v = t9View(C), [px, py] = t9CPt(svg, e), k = Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY*0.0015))), w = Math.max(150, Math.min(8000, v.w*k)), f = w/v.w;
  C.view = {x:px - (px - v.x)*f, y:py - (py - v.y)*f, w}; svg.setAttribute('viewBox', t9VB(C.view)); clearTimeout(T9VT); T9VT = setTimeout(t9CoolSave, 400); }, {passive:false});
let T9VT = 0;

/* ---------- 도구 2P 와 주고받기 */
const T9PART = ['th_c', 'th_r', 'm_ha0', 'm_ha60', 'i_c', 'i_r', 'i_ha0', 'i_ha60', 'b_c', 'b_r', 'b_ha', 'b_ha60', 't_amb'];   // 도구 2P 와 같은 키 (부품 열 값 · 외기)
const t9Read = id => { try{ return JSON.parse(localStorage.getItem(wbStoreKey(id)) || '{}') || {}; }catch(e){ return {}; } };
/* 부품이 수랭 회로에 있으면 1 (도구 2P 수랭), 아니면 0 (공랭 덕트 · 회로 밖 → 도구 2P 공랭 = 부품 hA) */
const t9IsWater = p => { const C = t9CoolWhere(p); return C && C.kind==='water' ? 1 : 0; };
function t9ExtHTML(){ const w = $('#wb'); if(w) w.classList.remove('t2-edit');   // 도구 2P 에서 바로 넘어온 경우
  return `<div class="t9-x">${t9XBar()}
    ${t9CoolPage()}</div>`; }
/* 주고받기 줄 (계산 결과가 바뀌면 이것만 다시 그림: onResult) */
function t9XBar(){ return ''; }   /* 도구 2P 와 주고받기는 윗줄 [도구 연결 ▾] 로 옮김 (2026-11-11) */
/* [도구 연결 ▾]: 도구 2P 에서 부품 열 값 가져오기, 도구 2P 로 회로 보내기 */
function t9Links(){ const s2 = t9Read('2'), o = WB.R && WB.R.out, D = WB_TOOLS['9'].inputs, u = k => (D.find(d => d.k===k) || {}).u || '', fv = (v, k) => isFinite(v) ? `${+(+v).toPrecision(4)} ${u(k)}`.trim() : '—';
  const grp = (nm, keys) => { const has = keys.filter(k => typeof s2[k]==='number' && isFinite(s2[k]));
    return {tool:'도구 2P', n:nm, to:`입력 › ${nm} (${keys.length}칸)`, now:keys.map(k => fv(WB.I[k], k)).join(' · '), val:keys.map(k => fv(s2[k], k)).join(' · '), ok:has.length > 0, why:'도구 2P 에 저장된 값이 없음',
      run(){ has.forEach(k => { WB.I[k] = s2[k]; }); wbSrcSet('9', has, '도구 2P'); return nm; }}; };
  const okC = !!(o && (o.n_w > 0 || o.n_a > 0)), C2 = typeof t2Cwc==='function' ? ((t2Cwc().cool || {}).circuits || []) : [];
  const parts = ['m', 'i', 'b'].map((p, j) => `${['모터', '인버터', '축전지'][j]} ${t9IsWater(p) ? '수랭' : '공랭'}`).join(' · ');
  return {
    get:[grp('모터 열 값 (열용량 · 냉각수까지 열저항 · 공랭 hA 정지 · 60 km/h)', ['th_c', 'th_r', 'm_ha0', 'm_ha60']), grp('인버터 열 값', ['i_c', 'i_r', 'i_ha0', 'i_ha60']), grp('축전지 열 값', ['b_c', 'b_r', 'b_ha', 'b_ha60']), grp('외기 온도', ['t_amb'])],
    send:[{tool:'도구 2P', n:'냉각 회로 배치 + 부품 수랭 / 공랭', to:'도구 2P › 편집 › 냉각 › 냉각 회로, 수랭 방식 = [냉각 회로], 냉각수 온도 계산 켬', now:C2.some(c => (c.blocks || []).length) ? `수랭 회로 ${C2.filter(c => c.kind==='water').length}개 · 공랭 덕트 ${C2.filter(c => c.kind!=='water').length}개 · 수랭 방식 ${s2.cw_mode===1 ? '냉각 회로' : '부품별 독립'}` : '비어 있음',
        val:okC ? `수랭 회로 ${o.n_w}개 · 공랭 덕트 ${o.n_a}개 · ${parts} (직렬 · 병렬 · 회로 여러 개 그대로)` : '', ok:okC, why:'계산에 수랭 회로나 공랭 덕트가 들어가야 보낼 수 있음',
        run(){ const s = t9Read('2'); Object.assign(s, {cw_mode:1, m_cool:t9IsWater('m'), i_cool:t9IsWater('i'), b_cool:t9IsWater('b'), cw_on:1}); localStorage.setItem(wbStoreKey('2'), JSON.stringify(s));
          if(typeof t2Cwc==='function'){ t2Cwc().cool = JSON.parse(JSON.stringify(T9.cool)); t2Save(); } wbSrcSet('2', ['t2:cool'], '도구 9'); return '냉각 회로 배치'; }},
      {tool:'도구 2P', n:'외기 온도', to:'도구 2P › 외기 온도', now:fv(s2.t_amb, 't_amb'), val:fv(WB.I.t_amb, 't_amb'), ok:isFinite(WB.I.t_amb), why:'이 도구의 외기 온도가 비어 있음',
        run(){ const s = t9Read('2'); s.t_amb = WB.I.t_amb; localStorage.setItem(wbStoreKey('2'), JSON.stringify(s)); wbSrcSet('2', ['t_amb'], '도구 9'); return '외기 온도'; }}],
    info:['주행 평균 발열 · 평균 차속 · 주행 시간은 도구 2P 의 [도구 연결]에서 보냅니다 (도구 2P 랩 시뮬 결과라서).'] }; }
document.addEventListener('click', e => { if(WB.id!=='9' || !e.target.closest) return; const b = e.target.closest('[data-t9x]'); if(!b || b.disabled) return; if(b.dataset.t9x==='put' && wbExBlock()) return;
  if(b.dataset.t9x==='get'){ const s = t9Read('2'), D = WB_TOOLS['2'] ? WB_TOOLS['2'].inputs : []; let n = 0;
    T9PART.forEach(k => { const d = D.find(q => q.k===k), v = typeof s[k]==='number' && isFinite(s[k]) ? s[k] : d && wbEx() ? d.v : NaN; if(Number.isFinite(v)){ WB.I[k] = v; n++; } });
    wbSave(); wbPaint(['in']); wbCalcSoon(); toast(`도구 2P 의 부품 열 값 ${n}개를 가져왔습니다.`); return; }
  if(b.dataset.t9x==='put'){ const o = WB.R && WB.R.out; if(!o || !(o.n_w > 0 || o.n_a > 0)) return; const s = t9Read('2');
    Object.assign(s, {cw_mode:1, m_cool:t9IsWater('m'), i_cool:t9IsWater('i'), b_cool:t9IsWater('b'), cw_on:1, t_amb:WB.I.t_amb});   /* 공랭 / 수랭 단추도 맞춰 둠 (부품별 독립으로 돌아갈 때) */
    try{ localStorage.setItem(wbStoreKey('2'), JSON.stringify(s)); if(typeof t2Cwc==='function'){ t2Cwc().cool = JSON.parse(JSON.stringify(T9.cool)); t2Save(); }   /* 배치는 도구 2P 자체 회로로 복사 (그 뒤로는 따로) */
      toast('이 회로 배치를 도구 2P 로 복사했습니다 (수랭 방식 = 냉각 회로, 냉각수 온도 계산 켬). 도구 2P 에서 고쳐도 이 도구에는 영향이 없습니다.'); }catch(err){ toast('저장하지 못했습니다.'); } } });

/* ============================================================ 이 탭 사용법 */
const M9TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 손계산 비교표), 입력 내보내기 · 가져오기입니다. 냉각 배치는 이 브라우저에 기억됩니다.'],
  ['#wb .wb-in', '입력', '주행 조건(외기 · 평균 차속 · 주행 시간 · 출발 온도), 주행 평균 발열(모터 · 인버터 손실, 축전지 발열), 부품 열 값(열용량 · 냉각수까지 열저항 · 공랭 hA)입니다. 발열은 일정하다고 봅니다. 도구 2P 에서 보내거나 [도구 2P 부품 열 값 가져오기]로 채웁니다.'],
  ['#wb [data-wblink]', '도구 연결', '[도구 연결 ▾]에서 도구 2P 와 주고받습니다. 가져오기 = 도구 2P 의 모터 · 인버터 · 축전지 열 값 · 외기 온도를 이 도구 입력 칸으로, 보내기 = 이 배치(수랭 회로 · 라디 · 펌프 · 공랭 덕트)와 부품 수랭 / 공랭을 도구 2P 의 냉각 회로로. 무엇이 어디를 덮어쓰는지 표로 보고 체크한 것만 옮깁니다 (복사, 그 뒤로는 따로). 가져온 칸에는 "도구 2P에서" 표시가 붙습니다. 결과의 등가값은 회로를 냉각수 하나로 줄인 참고값 (대시보드 냉각 값)입니다.'],
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
  outGroups:{'한 덩어리로 줄인 등가값 (대시보드 · 참고)':{note:'회로를 냉각수 하나로 줄인 값 (UA = 냉각수로 버린 열 ÷ (손실 가중 평균 냉각수 온도 − 외기)). 도구 2P 는 [냉각 회로] 방식이면 배치를 그대로 쓰고, 이 값은 대시보드 냉각 값으로만 씀'}},
  outputs:[
    {k:'s_tm', n:'모터', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_ti', n:'인버터', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_tb', n:'축전지', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'s_win', n:'라디 입구 (수랭 회로 1, 섞인 온도)', u:'°C', d:2, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_wout', n:'라디 출구 (수랭 회로 1 기준 라디)', u:'°C', d:2, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'s_qw', n:'냉각수로 버리는 열', u:'W', d:0, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_qa', n:'공기로 바로 버리는 열', u:'W', d:0, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'e_tm', n:'모터', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'}, {k:'e_ti', n:'인버터', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'}, {k:'e_tb', n:'축전지', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'},
    {k:'e_win', n:'라디 입구 (수랭 회로 1)', u:'°C', d:2, g:'주행 시간 뒤 (출발 온도에서)'},
    {k:'w_q', n:'수랭 회로 1 유량', u:'L/min', d:2, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'}, {k:'q_cw', dk:'cool_c', n:'냉각수 열용량 (모든 수랭 회로)', u:'J/K', d:0, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'}, {k:'q_ua0', dk:'cool_ua0', n:'라디에이터 UA 등가 (정지)', u:'W/K', d:1, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'},
    {k:'q_ua60', dk:'cool_ua60', n:'라디에이터 UA 등가 (60 km/h)', u:'W/K', d:1, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'},
    {k:'n_w', n:'수랭 회로 수', u:'', d:0, g:'정상 온도 (평균 차속, 발열 일정)', hide:true}, {k:'n_a', n:'공랭 덕트 수', u:'', d:0, g:'정상 온도 (평균 차속, 발열 일정)', hide:true},
  ],
  sigs:[
    {k:'tm', n:'모터 온도', u:'°C', d:1}, {k:'ti', n:'인버터 온도', u:'°C', d:1}, {k:'tb', n:'축전지 온도', u:'°C', d:1},
    {k:'w1', n:'수랭 회로 1 라디 입구', u:'°C', d:2}, {k:'w2', n:'수랭 회로 2 라디 입구', u:'°C', d:2}, {k:'w3', n:'수랭 회로 3 라디 입구', u:'°C', d:2},
  ],
  sigOn:['tm', 'ti', 'tb', 'w1'],
  xiStart:'end',
  links: () => t9Links(),
  lnkKeys:['th_c', 'th_r', 'm_ha0', 'm_ha60', 'i_c', 'i_r', 'i_ha0', 'i_ha60', 'b_c', 'b_r', 'b_ha', 'b_ha60', 't_amb', 'L_m', 'L_i', 'L_b', 'v', 't_run'],
  extHTML: t9ExtHTML, extraI: () => ({cool: t9CoolCompile().net}),
  extGet: () => ({cool:JSON.parse(JSON.stringify(T9.cool))}),   /* .json 내보내기에 회로 배치도 */
  extSet(d){ if(d && d.cool && Array.isArray(d.cool.circuits)){ T9.cool = d.cool; t9Save(); wbPaint(['ext']); } },
  exReset(){ try{ localStorage.removeItem(wbMK(T9KEY)); }catch(e){} T9.cool = T9COOL_DEF(); },
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
     src:'C_c = 12 L/min × 1000 × 4180 ÷ 60000 = 836 W/K → ε C_min = 283.142 W/K (C_a = 953.2, NTU = 1.79). 라디 입구 = 25 + 328.724 ÷ 283.142 = 26.1610, 출구 = 25 + (1 − 283.142 ÷ 836) × 1.1610. 인버터 점 = 출구 + 113.353 ÷ (2/3 × 836) → 인버터 = + 113.353 × 0.05 = 31.6388, 모터 점 = 출구 + 215.371 ÷ (1/3 × 836) → 모터 = + 215.371 × 0.02 = 30.8481'},
    {n:'수랭 병렬 · 갈래 유량을 호스로 계산 (펌프 8 L/min 뒤 모터 갈래 호스 합 1.0 m · 인버터 갈래 2.0 m, 안지름 10 mm, 물 1 mPa·s)', I:{v:158.0724, L_m:215.371, L_i:113.353, L_b:0, th_r:0.02, i_r:0.05, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[2, 0.5, 3], [3, 0.5, 4]], UA:250, A:0.06, kd:0.3, fan:0}, {t:'pump', C:418, q:1, ins:[[0, 1, 0]]}, {t:'part', part:'m', C:1254, q:0.5, ins:[[1, 0.5, 1]]}, {t:'part', part:'i', C:836, q:0.5, ins:[[1, 0.5, 2]]}], Cc:557.3333333333334,
       hyd:{Vt:8, rho:1000, mu:0.001, links:[{a:0, b:1, d:10, len:0.5}, {a:1, b:2, d:10, len:0.5}, {a:1, b:3, d:10, len:1.5}, {a:2, b:0, d:10, len:0.5}, {a:3, b:0, d:10, len:0.5}], blk:[{}, {}, {}, {}], src:[{k:1, flow:8}]}}], air:[]}}, expect:{s_tm:30.621027, s_ti:31.840390},
     src:'두 갈래 모두 난류 (모터 갈래 Re ≈ 10150, 인버터 ≈ 6830 > 1188) → Blasius ΔP ∝ L Q^1.75, 갈래 압력 강하가 같으므로 Q_m ÷ Q_i = (2.0 ÷ 1.0)^(1/1.75) = 1.4860 → 모터 몫 0.597746, 인버터 0.402254. 라디 출구 25.6671 (직렬과 같음). 모터 점 = 25.6671 + 215.371 ÷ (0.597746 × 557.33) → 모터 = + 215.371 × 0.02 = 30.6210, 인버터 점 = 25.6671 + 113.353 ÷ (0.402254 × 557.33) → 인버터 = + 113.353 × 0.05 = 31.8404'},
    {n:'공랭 덕트 갈라짐 · 합쳐짐 · 입구 → (인버터 40 % · 축전지 60 %) → 모터 → 출구 (입구 0.02 m², 비율 0.5, 팬 0.03 m³/s, 40 km/h)', I:{v:40, L_m:150, L_i:300, L_b:200, i_ha0:5, i_ha60:20, b_ha:15, b_ha60:30, m_ha0:10, m_ha60:40, cool:{water:[], air:[{A:0.02, kd:0.5, fan:0.03, nodes:[{part:'i', q:0.4, ins:[[-1, 0.4]]}, {part:'b', q:0.6, ins:[[-1, 0.6]]}, {part:'m', q:1, ins:[[0, 0.4], [1, 0.6]]}]}]}}, expect:{s_ti:47.284411, s_tb:34.019279, s_tm:33.391717, s_qa:650},
     src:'C_a = 1.2 × 1005 × 0.1411 = 170.18 W/K. 갈래 공기 C_q = 0.4 C_a · 0.6 C_a, G = C_q (1 − e^(−hA ÷ C_q)): 인버터 = 25 + 300 ÷ G(68.07, 15) = 47.2844, 축전지 = 25 + 200 ÷ G(102.11, 25) = 34.0193. 합친 공기 = 25 + (300 + 200) ÷ 170.18 = 27.9381 → 모터 = 27.9381 + 150 ÷ G(170.18, 30) = 33.3917'},
    {n:'라디 방열 표 (스펙 시트) · 운전점이 표의 점 (코어 풍속 5 m/s · 8 L/min · 6.0 kW @ 입구 온도차 60 K)', I:{v:50, L_m:300, L_i:0, L_b:0, th_r:0.02, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[2, 1]], UA:9999, A:0.06, kd:0, fan:0.3, rq:{n:[4, 8, 12], t:[2, 5, 8], e:[[2.4, 3.0, 3.3], [4.1, 6.0, 6.6], [5.2, 7.0, 7.9]]}, itd:60}, {t:'pump', C:418, q:1, ins:[[0, 1]]}, {t:'part', part:'m', C:1254, q:1, ins:[[1, 1]]}], Cc:557.3333333333334, rcp:4180000}], air:[]}}, expect:{s_win:28, s_tm:34},
     src:'표의 점에서 ε C_min = 6000 W ÷ 60 K = 100 W/K (UA 칸 9999 는 안 씀). 정상: 라디가 버리는 열 = ε C_min (T_입구 − T_외기) = 모터 손실 300 W → 라디 입구 = 25 + 300 ÷ 100 = 28 °C, 모터 = 28 + 300 × 0.02 = 34 °C'},
    {n:'라디 팬 켜는 온도 35 °C · 정상에서 켜짐 (모터 2000 W, 60 km/h, 주행풍 0.3 m³/s + 팬 0.3)', I:{v:60, L_m:2000, L_i:0, L_b:0, th_r:0.02, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[2, 1]], UA:250, A:0.06, kd:0.3, fan:0.3, fon:35}, {t:'pump', C:418, q:1, ins:[[0, 1]]}, {t:'part', part:'m', C:1254, q:1, ins:[[1, 1]]}], Cc:557.3333333333334}], air:[]}}, expect:{s_win:33.873141, s_tm:73.873141},
     src:'팬 끔: 공기 0.3 m³/s (코어 5 m/s, UA 250) → ε C_min = 152.46 W/K → 입구 25 + 2000 ÷ 152.46 = 38.118 ≥ 35 → 켬. 팬 켬: 0.6 m³/s (코어 10 m/s, UA = 250 × 2^0.6 = 378.9) → ε C_min = 225.40 → 입구 25 + 2000 ÷ 225.40 = 33.873 (끄는 온도 32 보다 높아 켠 채), 모터 + 2000 × 0.02'},
    {n:'라디 팬 켜는 온도 35 °C · 정상에서 꺼짐 (모터 500 W, 위와 같은 라디)', I:{v:60, L_m:500, L_i:0, L_b:0, th_r:0.02, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[2, 1]], UA:250, A:0.06, kd:0.3, fan:0.3, fon:35}, {t:'pump', C:418, q:1, ins:[[0, 1]]}, {t:'part', part:'m', C:1254, q:1, ins:[[1, 1]]}], Cc:557.3333333333334}], air:[]}}, expect:{s_win:28.279556, s_tm:38.279556},
     src:'팬 끔: ε C_min = 152.46 W/K → 입구 25 + 500 ÷ 152.46 = 28.280 < 35 → 끈 채, 모터 + 500 × 0.02'},
    {n:'라디 금속 열용량 1 kJ/K · 식는 빠르기 (라디 한 점 고리, 60 °C 에서 100 s, 팬 0.3 m³/s)', I:{v:0, L_m:0, L_i:0, L_b:0, t0:60, t_run:100, cool:{water:[{nodes:[{t:'rad', C:2508, Cm:1, q:1, ins:[[0, 1]], UA:250, A:0.06, kd:0, fan:0.3}], Cc:557.3333333333334}], air:[]}}, expect:{e_win:25.482687, q_cw:3508},
     src:'열용량 C = 2508 + 1 × 1000 = 3508 J/K. 버리는 몫 a = ε C_min ÷ C_c = 0.273552. 0.25 s 칸마다 (적분 방식 그대로) ΔT ← ΔT × (1 − a (1 − e^(−C_c × 0.25 ÷ C))) → 400 칸 뒤 25 + 35 × 0.98173^400 = 25.4827 °C (금속을 빼면 C = 2508 → 25.09 °C)'},
    {n:'펌프 곡선 (막힘 30 kPa · 최대 20 L/min) × 호스 3개 (안지름 8 mm · 1 m) → 만나는 점의 유량', I:{v:0, L_m:300, L_i:0, L_b:0, th_r:0.02, cool:{water:[{nodes:[{t:'rad', C:2508, q:1, ins:[[2, 1, 2]], UA:250, A:0.06, kd:0, fan:0.3}, {t:'pump', C:418, q:1, ins:[[0, 1, 0]]}, {t:'part', part:'m', C:1254, q:1, ins:[[1, 1, 1]]}], Cc:1393.3333333333333, rcp:4180000,
       hyd:{Vt:20, rho:1000, mu:0.001, links:[{a:0, b:1, d:8, len:1}, {a:1, b:2, d:8, len:1}, {a:2, b:0, d:8, len:1}], blk:[{}, {}, {}], src:[], crv:[{k:1, h0:30, qmax:20}]}}], air:[]}}, expect:{w_q:6.865619, s_win:27.023019, s_tm:33.023019},
     src:'호스 3 m 압력 강하 = 3 × f (L ÷ D) ρ u² ÷ 2 (Blasius, Re ≈ 18200) = 펌프 30 kPa × (1 − (Q ÷ 20)²) 를 Q 로 풂 → Q = 6.8656 L/min (압력 26.46 kPa). C_c = 478.3 W/K, 라디 (코어 5 m/s, UA 250, C_a 361.8) ε C_min = 148.29 W/K → 라디 입구 25 + 300 ÷ 148.29 = 27.0230, 모터 + 300 × 0.02'}
  ],
  code: `// ================================================================ 냉각 회로 공통 (도구 9 · 도구 2P 계산과 냉각 편집기가 같이 씀)
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
    const Tin = fs > 0 ? ft / fs : Ta, Cq = Ca * (n.q > 0 ? n.q : 1), p = n.part;
    if (!p) { out[k] = Tin; return; }   // 합류 · 분기점 (부품 없음): 섞어서 그대로 넘김 (2026-11-11)
    const G = Cq > 0 ? Cq * (1 - Math.exp(-hA(p) / Cq)) : 0;
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
// 도구 9 냉각 계통 계산기 — 계산 코드
// ================================================================
// 입력 I : 왼쪽 입력 칸과 작업창 위 냉각 배치
//   t_amb 외기 [°C], v 평균 차속 [km/h], t_run 주행 시간 [s], t0 출발 온도 (모든 부품 · 냉각수) [°C]
//   L_m · L_i · L_b = 모터 손실 · 인버터 손실 · 축전지 발열 (주행 평균, 일정하다고 봄) [W]  (도구 2P [냉각] 탭에서 보낼 수 있음)
//   부품: 열용량 th_c · i_c · b_c [J/K], 냉각수까지 열저항 th_r · i_r · b_r [K/W], 공랭 hA (정지 · 60 km/h) m_ha0 · m_ha60 · i_ha0 · i_ha60 · b_ha · b_ha60 [W/K]
//   I.cool = {water: [{nodes: [{t, part, C, q, ins, UA, A, kd, fan}], Cc, hyd}], air: [{A, kd, fan, nodes: [{part, q, ins}]}]}   (배치 → 계산용, 작업창이 만듦; hyd 가 있으면 갈래 몫을 호스 압력 강하로 다시 풂, coolPrep)
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
  const Ta = isFinite(I.t_amb) ? I.t_amb : 25, NET = coolPrep(I.cool && typeof I.cool === 'object' ? I.cool : { water: [], air: [] });
  const RHOA = 1.2, CPA = 1005;
  const L = { m: Math.max(0, I.L_m || 0), i: Math.max(0, I.L_i || 0), b: Math.max(0, I.L_b || 0) };
  const hV = (h0, h60, v) => Math.max(0, (h0 || 0) + ((Number.isFinite(h60) ? h60 : (h0 || 0)) - (h0 || 0)) * v / (60 / 3.6));
  const PR = { m: Math.max(1e-9, I.th_r), i: Math.max(1e-9, I.i_r), b: Math.max(1e-9, I.b_r) };       // 냉각수까지 열저항 [K/W]
  const PC = { m: Math.max(1, I.th_c), i: Math.max(1, I.i_c), b: Math.max(1, I.b_c) };              // 열용량 [J/K]
  const PH = { m: v => hV(I.m_ha0, I.m_ha60, v), i: v => hV(I.i_ha0, I.i_ha60, v), b: v => hV(I.b_ha, I.b_ha60, v) };   // 공랭 hA [W/K]
  const W = NET.water || [], A = NET.air || [];
  const where = {};   // 부품 → {w: 회로 번호, k: 점 번호} · {a: 덕트 번호, j: 덕트 안 순서}
  W.forEach((C, w) => C.nodes.forEach((nd, k) => { if (nd.part) where[nd.part] = { w, k }; }));
  A.forEach((D, a) => D.nodes.forEach((n, j) => { if (!where[n.part]) where[n.part] = { a, j }; }));
  // 라디 점 k 가 섞인 냉각수 열 중 외기로 버리는 몫 a_k = ε C_min ÷ F (coolRadA: 표 UA · 팬 켬 · 끔 포함, cool_net)
  const radA = (C, nd, v, fan) => coolRadA(C, nd, v, fan);
  const mixOf = (nd, c, k, N) => { const ins = nd.ins || [[(k - 1 + N) % N, 1]]; let fs = 0, ft = 0; ins.forEach(([j, f]) => { fs += f; ft += f * c[j]; }); return fs > 0 ? ft / fs : c[k]; };

  // ---------- 정상 상태 (차속 v [m/s])
  //   팬 켜는 온도가 있는 라디: 꺼진 채 풀어 라디로 들어오는 냉각수가 켜는 온도 이상이면 켠 채 다시 풂 (켠 정상 상태를 결과로)
  function steady(v) { let fan = W.map(C => C.nodes.map(coolFanOn0)), r = null;
    for (let it = 0; it < 4; it++) { r = steady1(v, fan); let ch = false;
      fan = fan.map((f, w) => f.map((on, k) => { const nd = W[w].nodes[k]; if (on || nd.t !== 'rad' || !r.cs[w]) return on; const Tin = mixOf(nd, r.cs[w], k, nd.ins ? W[w].nodes.length : W[w].nodes.length);
        if (Tin >= nd.fon) { ch = true; return true; } return false; }));
      if (!ch) break; }
    r.fan = fan; return r; }
  function steady1(v, fan) {
    const T = { m: NaN, i: NaN, b: NaN }, cs = [], rin = [];
    W.forEach((C, w) => { const N = C.nodes.length, M = C.nodes.map(() => new Array(N + 1).fill(0));   // M c = 오른쪽 (마지막 열)
      C.nodes.forEach((nd, k) => { const ins = nd.ins || [[(k - 1 + N) % N, 1]], fs = ins.reduce((a, [, f]) => a + f, 0);
        const a = nd.t === 'rad' ? radA(C, nd, v, fan[w][k]) : 0, Fk = (nd.q || 1) * C.Cc;
        // T_k − (1 − a) Σ (f_j ÷ fs) T_j = a T_외기 + (부품 손실 ÷ F)
        M[k][k] += 1; ins.forEach(([j, f]) => { M[k][j] -= (1 - a) * f / fs; });
        M[k][N] = a * Ta + (nd.part && Fk > 0 ? L[nd.part] / Fk : 0); });
      const c = gauss(M, N); cs.push(c); rin.push(c ? mixOf(C.nodes[0], c, 0, N) : NaN); });
    let Qw = 0, Sw = 0; const TA = {};
    A.forEach(D => coolAir(D, RHOA * CPA * Math.max(0, D.A * D.kd * v + D.fan), Ta, TA, L, p => PH[p](v), true));   // 공랭 덕트 정상 온도 (갈래 · 합침)
    for (const p of ['m', 'i', 'b']) { const wh = where[p];
      if (wh && wh.w != null) { const c = cs[wh.w]; const Tk = c ? c[wh.k] : NaN; T[p] = Tk + L[p] * PR[p]; Qw += L[p]; Sw += L[p] * Tk; }
      else if (wh && wh.a != null) T[p] = TA[p];
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
  const fanS = W.map(C => C.nodes.map(coolFanOn0)), aOf = (w, k) => radA(W[w], W[w].nodes[k], v0, fanS[w][k]);   // 팬 상태 (켜는 온도 · 히스테리시스)
  const aK = W.map((C, w) => C.nodes.map((nd, k) => nd.t === 'rad' ? aOf(w, k) : 0));
  const xs = [0], S = { tm: [t0], ti: [t0], tb: [t0], w1: [W[0] ? t0 : NaN], w2: [W[1] ? t0 : NaN], w3: [W[2] ? t0 : NaN] };
  const rinOf = w => W[w] ? mixOf(W[w].nodes[0], c[w], 0, W[w].nodes.length) : NaN;
  for (let s = 1; s <= nStep; s++) { const dt = Math.min(h, tEnd - (s - 1) * h);
    W.forEach((C, w) => { const N = C.nodes.length;
      for (let k = 0; k < N; k++) { const nd = C.nodes[k], mix = mixOf(nd, c[w], k, N), F = (nd.q || 1) * C.Cc;
        if (nd.t === 'rad') { const on = coolFanNext(nd, fanS[w][k], mix); if (on !== fanS[w][k]) { fanS[w][k] = on; aK[w][k] = aOf(w, k); }
          c[w][k] = toward(c[w][k], mix - aK[w][k] * (mix - Ta), F / coolC(nd), dt); continue; }
        const p = nd.part, G = p ? 1 / PR[p] : 0;
        c[w][k] = F + G > 0 ? toward(c[w][k], (F * mix + G * (p ? T[p] : 0)) / (F + G), (F + G) / coolC(nd), dt) : c[w][k]; } });
    for (const p of ['m', 'i', 'b']) { const wh = where[p];
      if (wh && wh.w != null) T[p] = toward(T[p], c[wh.w][wh.k] + L[p] * PR[p], 1 / (PR[p] * PC[p]), dt);
      else if (!wh) { const hh = PH[p](v0); T[p] = hh > 0 ? toward(T[p], Ta + L[p] / hh, hh / PC[p], dt) : T[p] + L[p] * dt / PC[p]; } }
    A.forEach(D => coolAir(D, RHOA * CPA * Math.max(0, D.A * D.kd * v0 + D.fan), Ta, T, L, p => PH[p](v0), false, dt, PC, null, toward));
    if (s % every === 0 || s === nStep) { xs.push(Math.min(tEnd, s * h)); S.tm.push(T.m); S.ti.push(T.i); S.tb.push(T.b); S.w1.push(rinOf(0)); S.w2.push(rinOf(1)); S.w3.push(rinOf(2)); } }

  const ss = steady(v0), s0 = steady(0), s60 = steady(60 / 3.6), r0 = ss.cs[0], fin = x => isFinite(x) ? x : NaN;
  const Lsum = L.m + L.i + L.b;
  const out = {
    s_tm: fin(ss.T.m), s_ti: fin(ss.T.i), s_tb: fin(ss.T.b),                         // 정상 온도 [°C] (평균 차속)
    s_win: W[0] ? fin(ss.rin[0]) : NaN, s_wout: W[0] && r0 ? fin(r0[0]) : NaN,         // 첫 수랭 회로 기준 라디 입구 (섞인 온도) · 출구 [°C]
    s_qw: ss.Qw, s_qa: Lsum - ss.Qw,                                                   // 냉각수로 · 공기로 바로 버리는 열 [W]
    e_tm: T.m, e_ti: T.i, e_tb: T.b, e_win: rinOf(0),                                  // 주행 시간 뒤 [°C]
    w_q: W.length ? W[0].Cc / (W[0].rcp || 4.18e6) * 60000 : NaN,   // 수랭 회로 1 유량 [L/min] (곡선 펌프면 풀린 값)
    q_cw: W.reduce((s, C) => s + C.nodes.reduce((a, nd) => a + coolC(nd), 0), 0),     // 냉각수 · 라디 금속 열용량 합 [J/K]
    q_ua0: s0.Qw > 0 ? fin(s0.UA) : NaN, q_ua60: s60.Qw > 0 ? fin(s60.UA) : NaN,       // 도구 2P 라디에이터 UA (정지 · 60 km/h) [W/K]
    n_w: W.length, n_a: A.length,
  };
  if (!W.length) out.q_cw = NaN;
  return { out, x: { d: xs }, sig: S };
}
`
};
