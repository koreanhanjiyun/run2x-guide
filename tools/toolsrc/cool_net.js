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
