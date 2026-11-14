// ================================================================
// 도구 2 목표 · 요구값 (경량 시뮬) — 계산 코드. 위는 도구 2P 계산 코드 그대로 (calc → calcT2)
// ================================================================
// 목적: 설계 초반 (도구 1 직후: 질량 · 무게중심 · 휠베이스 · 트레드 · 타이어 외경 · 모터 토크 선도만 있을 때) 종목 목표를 정하면
//       그 목표를 내려면 다른 파트가 무엇을 얼마나 해야 하는지 (요구값) 를 목표 축 위에 함께 보임.
// 이상화 (아직 정해지지 않은 계통): 축전지 = 이상 전원 (전압 = 모터 기준 전압, 내부 저항 0, 전류 한계 없음, 에너지 상한 없음) → 필요한 에너지 · 출력 · 전류를 결과로,
//   인버터 전류 한계 없음, 열 모델 끔, 차량 모델 0, 주행선 = 최소 곡률 선, 효율 = 상수. 다운포스 → 항력은 양항비 LD 로 묶음 (C_D·A = 차체 C_D·A + C_L·A ÷ LD)
// 계산: 설계 손잡이 (C_L·A · 질량 · 모터 토크 배율 · 타이어 μ · 무게중심 높이 · 앞 무게 비율 · 감속비) 를 하나씩 기본값에서 훑어 (나머지는 기본값)
//   매 점의 종목 기록 (도구 2P 줄여 셈: 내구 3 랩 근사) · 내구 에너지 · 평균 출력 등을 기록 → 가로축을 고른 종목 기록으로 뒤집어 (단조 구간 선형 보간)
//   '이 기록을 내려면 그 손잡이가 얼마여야 하나' 를 목표 격자 위에 모든 손잡이 같이 그림. 닿지 못하는 목표는 빈칸.
//   스키드패드 목표에는 CoP 를 무게 배분에서 ±5 %p 옮긴 C_L·A 곡선을 같이 (한쪽 축이 먼저 한계 → 다운포스가 더 필요)
// 현실 운전자 (도구 2P 와 같은 k_s · k_e) 의 내구 시간 · 에너지를 같이 계산 (범위)
const RHO_G = 1.225;
const GLV = [
  ['cla', 'C_L·A', 'm²', I => { const a = []; for (let x = 0; x <= 6.0001; x += 0.5) a.push(+x.toFixed(2)); return a; }],
  ['m', '질량', 'kg', I => [-60, -45, -30, -15, 0, 15, 30, 45].map(d => I.m + d)],
  ['tq', '모터 토크 배율', '%', I => [50, 60, 70, 80, 90, 100, 115, 130, 150]],
  ['mu', '타이어 μ', '', I => [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]],
  ['h', '무게중심 높이', 'mm', I => [200, 225, 250, 275, 300, 325, 350]],
  ['fr', '앞 무게 비율', '%', I => [35, 40, 45, 47.5, 50, 55]],
  ['gr', '감속비', '', I => [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]],
];
// 가로축 목표: [키, 이름, 단위, 좋은 쪽 (−1 = 작을수록 · +1 = 클수록)]
const GTG = [['acc', '가속', 's', -1], ['skid', '스키드패드 (좌우 합)', 's', -1], ['ax', '오토크로스', 's', -1], ['end', '내구 (이상 운전자)', 's', -1],
             ['ax0', '출발 종가속도 (정지에서 최대)', 'g', 1], ['ay', '스키드패드 횡가속도', 'g', 1], ['e_end', '내구 단자 에너지 (이상 운전자)', 'kWh', -1]];
function gBase(I) {
  const B = I.base || {}, X = { ...B };
  ['m', 'fr', 'h', 'L', 'tf', 'tr', 'r_eff', 'mu', 'mu_s', 'crr', 'gr', 'eta_dt', 'eta_mot', 'eta_inv', 'pmax', 'nmax', 'tmax', 'xcop', 'hcop', 'lltd', 'j_eq', 'dr_ks', 'dr_ke'].forEach(k => { if (isFinite(I[k])) X[k] = I[k]; });
  if (Array.isArray(I.motor)) X.motor = I.motor;
  const cl = Math.max(0, I.cla || 0), ld = I.ld > 0 ? I.ld : 2.5;
  X.cla = cl; X.cda = Math.max(0, I.cda0 || 0) + cl / ld;
  // 이상 전원 · 계통 끔
  const vr = X.v_ref > 0 ? X.v_ref : 400, ns = X.n_s > 0 ? X.n_s : 100;
  Object.assign(X, { sk_mid: 1, md: 0, rl_on: 1, th_on: 0, in_on: 0, bt_on: 0, cw_on: 0, rg_on: 0, drv: 0, e_lim: 0, dr_real: 0, dl_on: 0, wc_on: 0,
    c_vmax: vr / ns, c_vmin: vr / ns, c_vnom: vr / ns, n_s: ns, r_pack: 0, i_bms_max: 1e6, i_pk: 1e6, ict_m: 1, i_ct: 1e6, effM: null, effI: null, eff_mg: 0,
    motorC: [], course: 'end', grMode: 'my', _sweep: 0, _probe: 0 });
  return X;
}
// xcop: 뒤축에서 앞으로 거리 [mm] (도구 2P 정의). CoP = 무게 배분이면 앞축 몫 = 앞 무게 비율 → 뒤축에서 L × 앞 몫
const copW = X => X.L * X.fr / 100;
function gEval(X, real) {
  VC = new Map(); VCF = new Map();
  prepLines(X, true); prepBody(X, true); prepTrans(X, true);
  const E = events(X, X.gr, true), EN = E.EN, C = E.C;
  const r = { acc: E.acc, skid: E.skid, ax: E.ax, end: EN ? EN.T : NaN, e_end: EN ? EN.Et / 3.6e6 : NaN,
    p_avg: EN && EN.T > 0 ? EN.Et / EN.T / 1000 : NaN, ay: E.vs > 0 ? E.vs * E.vs / SK_R / g : NaN,
    df100: 0.5 * RHO_G * X.cla * (100 / 3.6) ** 2, dr100: 0.5 * RHO_G * X.cda * (100 / 3.6) ** 2,
    tw: (X.tmax || 0) * X.gr * (X.eta_dt / 100) / (X.r_eff / 1000),
    ax0: C && C.aDrive ? C.aDrive(0, 0, 0, C.Voc(1), C.Tinit) / g : NaN };   // 출발 종가속도: 정지에서 구동 한계 (접지 · 토크 중 작은 쪽, 도구 2P 의 ax_0 와 같은 식)
  if (real) { VC = new Map(); VCF = new Map(); const R = runEnd({ ...X, dr_real: 1 }, X.gr, false); r.end_r = R ? R.T : NaN; r.e_end_r = R ? R.Et / 3.6e6 : NaN; }
  return r;
}
// 손잡이 값 → 입력
function gSet(X0, k, v) { const X = { ...X0 };
  if (k === 'cla') { X.cla = v; X.cda = X0.__cda0 + v / X0.__ld; }
  else if (k === 'tq') { X.tmax = X0.tmax * v / 100; X.motor = (X0.motor || []).map(([n, t]) => [n, t * v / 100]); }
  else X[k] = v;
  if (X0.__copw && (k === 'fr' || k === 'cla')) X.xcop = copW(X) + X0.__copd;
  return X; }
// 단조 구간 역보간: 목표 y → 손잡이 x (xs 오름차순, ys 기록). 기록이 늘거나 줄거나 한쪽이어야 (아니면 처음 단조 구간만)
function gInv(xs, ys, y, x0) {
  let best = NaN;
  for (let i = 0; i < xs.length - 1; i++) { const a = ys[i], b = ys[i + 1]; if (!isFinite(a) || !isFinite(b) || a === b) continue;
    if ((y - a) * (y - b) <= 0) { const x = xs[i] + (xs[i + 1] - xs[i]) * (y - a) / (b - a); if (!isFinite(best) || (isFinite(x0) && Math.abs(x - x0) < Math.abs(best - x0))) best = x; } }
  return best; }   // 해가 여럿이면 (기록이 손잡이에 대해 오르내림) 기본값에 가장 가까운 것
const gInterp = (xs, ys, x) => { if (!isFinite(x)) return NaN; for (let i = 0; i < xs.length - 1; i++) if ((x - xs[i]) * (x - xs[i + 1]) <= 0) { const t = (x - xs[i]) / ((xs[i + 1] - xs[i]) || 1); return ys[i] + (ys[i + 1] - ys[i]) * t; } return NaN; };
function calc(I) {
  const X0 = gBase(I);
  X0.__ld = I.ld > 0 ? I.ld : 2.5; X0.__cda0 = Math.max(0, I.cda0 || 0); X0.__copw = I.cop_m !== 0; X0.__copd = 0;
  if (X0.__copw) X0.xcop = copW(X0);
  if (!(X0.m > 0) || !(X0.L > 0)) throw new Error('질량 · 휠베이스는 0 보다 커야 합니다.');
  checkIn(X0);
  prog(0.02, '주행선 (최소 곡률) 준비 중');
  prepLines(X0, false);
  const base = gEval(X0, true);
  const TG = GTG[Math.max(0, Math.min(GTG.length - 1, Math.round(I.tg || 0)))], tg = TG[0];
  // 손잡이마다 앞으로 훑기
  const SW = {}; let done = 0; const tot = GLV.reduce((a, L) => a + L[3](X0).length + 1, 0) + 2 * 13;
  const bx = k => k === 'tq' ? 100 : X0[k];   // 기본값 (손잡이 격자에 넣음)
  for (const [k, nm, u, rng] of GLV) { const xs = [...new Set([...rng(X0), bx(k)])].sort((p, q) => p - q), rows = [];
    for (const v of xs) { rows.push(gEval(gSet(X0, k, v), k === 'cla' || k === 'm' || k === 'tq')); prog(0.05 + 0.9 * (++done) / tot, `훑는 중 · ${nm}`); }
    SW[k] = { xs, rows }; }
  // CoP ±5 %p (C_L·A 훑기)
  const SWc = {};
  if (X0.__copw) for (const dp of [-5, 5]) { const xs = GLV[0][3](X0), rows = [];
    for (const v of xs) { const X = gSet({ ...X0, __copd: X0.L * dp / 100 }, 'cla', v); rows.push(gEval(X, false)); prog(0.05 + 0.9 * (++done) / tot, 'CoP 옮겨 훑는 중'); }
    SWc[dp] = { xs, rows }; }
  // 목표 격자: 모든 손잡이가 닿는 기록 범위 (기본 기록 ± 일부)
  const all = Object.values(SW).flatMap(s => s.rows.map(r => r[tg])).filter(isFinite);
  const lo = Math.min(...all), hi = Math.max(...all), y0 = base[tg];
  // 시간 · 에너지 (작을수록 좋음) = 기본의 0.75 ~ 1.15 배, 가속도 (클수록 좋음) = 0.85 ~ 1.25 배
  const a = Math.max(lo, y0 * (TG[3] > 0 ? 0.85 : 0.75)), b = Math.min(hi, y0 * (TG[3] > 0 ? 1.25 : 1.15)), N = 60, ys = [];
  for (let i = 0; i <= N; i++) ys.push(a + (b - a) * i / N);
  const sig = {};
  for (const [k] of GLV) { const s = SW[k], rec = s.rows.map(r => r[tg]); sig['q_' + k] = ys.map(y => gInv(s.xs, rec, y, bx(k))); }
  for (const dp of [-5, 5]) { const s = SWc[dp]; if (!s) continue; const rec = s.rows.map(r => r[tg]); sig['q_cla' + (dp < 0 ? 'm' : 'p')] = ys.map(y => gInv(s.xs, rec, y, X0.cla)); }
  // 딸린 값: 그 손잡이로 목표를 낼 때
  const side = (k, f) => { const s = SW[k]; return sig['q_' + k].map(x => gInterp(s.xs, s.rows.map(f), x)); };
  sig.df_cla = side('cla', r => r.df100); sig.dr_cla = side('cla', r => r.dr100);
  sig.e_cla = side('cla', r => r.e_end); sig.er_cla = side('cla', r => r.e_end_r); sig.p_cla = side('cla', r => r.p_avg);
  sig.e_tq = side('tq', r => r.e_end); sig.tw_tq = side('tq', r => r.tw); sig.p_tq = side('tq', r => r.p_avg);
  sig.e_m = side('m', r => r.e_end); sig.ay_cla = side('cla', r => r.ay);
  // 목표 탐침 (입력한 목표값에서 각 손잡이 요구값)
  const pv = (Number.isFinite(I.tgv_m) ? I.tgv_m === 1 : I.tg_v > 0) ? I.tg_v : y0, out = {};   // 목표값 = 고르는 값 tgv_m (없으면 예전: 0 보다 크면 그 값)
  for (const [k] of GLV) { const s = SW[k]; out['p_' + k] = gInv(s.xs, s.rows.map(r => r[tg]), pv, bx(k)); }
  out.p_df = isFinite(out.p_cla) ? 0.5 * RHO_G * out.p_cla * (100 / 3.6) ** 2 : NaN;
  out.p_cda = isFinite(out.p_cla) ? X0.__cda0 + out.p_cla / X0.__ld : NaN;
  out.p_e = gInterp(SW.cla.xs, SW.cla.rows.map(r => r.e_end), out.p_cla);
  Object.assign(out, { b_acc: base.acc, b_skid: base.skid, b_ax: base.ax, b_end: base.end, b_e: base.e_end, b_end_r: base.end_r, b_e_r: base.e_end_r,
    b_p: base.p_avg, b_ay: base.ay, b_df: base.df100, b_dr: base.dr100, b_cda: X0.cda, b_xcop: X0.xcop, b_tw: base.tw, b_ax0: base.ax0,
    q_heat: base.p_avg * (1 - (X0.eta_mot / 100) * (X0.eta_inv / 100)), i_avg: base.p_avg * 1000 / (X0.n_s * X0.c_vnom), tg_v_o: pv });
  prog(1, '');
  return { out, x: { d: ys }, sig };
}
