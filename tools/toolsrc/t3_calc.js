// ================================================================
// 도구 3 제동 시스템 사이징 — 계산 코드 (정상 감속: 이상 배분 · 유압 · 잠김 순서 · 답력–감속도 곡선 · 밸런스 바 맞춤 · 디스크 온도)
// ================================================================
// 입력 I : m [kg], fr [%] 앞 하중, h [mm] 무게중심, L [mm] 휠베이스, mu [-] 타이어 μ, r_load [mm] 바퀴 하중 반경 (제동 토크 → 접지 힘),
//          cla [m²] · xcop [mm] (뒤축에서 앞으로 압력중심) · v_b [km/h] 시험 차속 (다운포스만, 항력은 넣지 않음),
//          f_ped [N] 설계 답력, pedal_ratio [-], brake_bias [%] 밸런스 바 앞 몫, mc_f · mc_r [mm] 마스터실린더 지름,
//          cal_area_f · cal_area_r [mm²] 캘리퍼 한쪽 피스톤 면적 합, pad_mu [-], disc_d_f · disc_d_r [mm] 디스크 바깥 지름, pad_h [mm] 패드 높이, eta_b [%] 기계 효율
// 식 (Limpert, Brake Design and Safety 7 장 · 2024 Run2X 제동 시트와 같은 꼴):
//   축 하중 (감속 a): F_zf = W_f + D_f + m a h ÷ L,  F_zr = W_r + D_r − m a h ÷ L   (D = ½ρ C_L·A v², 앞 몫 = xcop ÷ L)
//   이상 배분 (두 축이 함께 잠김, a = μ (W + D) ÷ m): 앞 몫 = F_zf ÷ (F_zf + F_zr)
//   유압: p_f = F_답력 × 페달비 × 밸런스 앞 몫 × η ÷ A_mc,f,  축 제동력 = 2 바퀴 × p × A_캘리퍼 × 2 패드 × μ_패드 × r_디스크 ÷ r_load,  r_디스크 = 바깥 반지름 − 패드 높이 ÷ 2
//   실제 배분 β = F_f ÷ (F_f + F_r) (답력과 상관없이 일정, 프로포셔닝 밸브 없음)
//   잠김 감속: 앞 β m a = μ F_zf(a) → a_f = μ (W_f + D_f) ÷ (m (β − μ h ÷ L)),  뒤 (1 − β) m a = μ F_zr(a) → a_r = μ (W_r + D_r) ÷ (m (1 − β + μ h ÷ L))
//   먼저 잠기는 축 = 작은 쪽, 그때 답력 = m a ÷ (축 제동력 합 ÷ 답력).  네 바퀴 잠김 (a = μ g 쪽) 답력 = max(μ F_zf* ÷ k_f, μ F_zr* ÷ k_r)  (k = 답력 1 N 당 축 제동력)
//   답력–감속도 (잠긴 축은 μ F_z 로 묶임): 안 잠김 m a = (k_f + k_r) F,  앞 잠김 m a = μ (W_f + m a h ÷ L) + k_r F → a = (μ W_f + k_r F) ÷ (m (1 − μ h ÷ L)),
//     뒤 잠김 m a = k_f F + μ (W_r − m a h ÷ L) → a = (k_f F + μ W_r) ÷ (m (1 + μ h ÷ L)),  둘 다 → a = μ W ÷ m
//   밸런스 바 맞춤 (실제 = 이상): β(b) = b K_f ÷ (b K_f + (1 − b) K_r), K = A_캘리퍼 r_디스크 ÷ A_mc → b = β* K_r ÷ (K_f (1 − β*) + β* K_r)
//   디스크 온도 (한 번 정지, 단열 · 보수적): E = ½ m v² (차속 v_stop → 0), 디스크 하나 = E × (앞 β, 뒤 1 − β) ÷ 2,  ΔT = E_디스크 ÷ (m_디스크 c),  c = 강 460 J/(kg·K)
//     연속 정지 n_stop 번 (사이 냉각 없음) = n × ΔT  (FMVSS 135 페이드 시험처럼 보수적 상한)
const g = 9.81, RHO = 1.225;
function calc(I) {
  const pos = (v, nm) => { if (!(v > 0)) throw new Error(nm + ' 는 0 보다 커야 합니다.'); return v; };
  const m = pos(I.m, '질량'), L = pos(I.L, '휠베이스') / 1000, h = Math.max(0, I.h) / 1000, fs = I.fr / 100, mu = pos(I.mu, '타이어 μ'), rl = pos(I.r_load, '하중 반경') / 1000;
  const v = Math.max(0, I.v_b || 0) / 3.6, D = 0.5 * RHO * Math.max(0, I.cla || 0) * v * v, fa = I.L > 0 && isFinite(I.xcop) ? I.xcop / I.L : fs;
  const Wf = m * g * fs + D * fa, Wr = m * g * (1 - fs) + D * (1 - fa), W = Wf + Wr;   // 정지 축 하중 + 다운포스 [N]
  const amax = mu * W / m, Fzf = a => Wf + m * a * h / L, Fzr = a => Wr - m * a * h / L;
  const ideal = Fzf(amax) / W;                                                                // 이상 배분 앞 몫
  // 유압 · 제동력 (답력 1 N 당)
  const Amf = Math.PI * pos(I.mc_f, '앞 마스터실린더 지름') ** 2 / 4, Amr = Math.PI * pos(I.mc_r, '뒤 마스터실린더 지름') ** 2 / 4;   // [mm²]
  const bb = I.brake_bias / 100; if (!(bb > 0 && bb < 1)) throw new Error('밸런스 바 앞 몫은 0 ~ 100 % 사이여야 합니다.');
  const eta = (I.eta_b > 0 ? I.eta_b : 100) / 100, PR = pos(I.pedal_ratio, '페달비');
  const rd = (d, nm) => { const r = (pos(d, nm) / 2 - Math.max(0, I.pad_h || 0) / 2) / 1000; if (!(r > 0)) throw new Error('패드 높이가 디스크보다 큽니다.'); return r; };
  const rdf = rd(I.disc_d_f, '앞 디스크 지름'), rdr = rd(I.disc_d_r, '뒤 디스크 지름'), mp = pos(I.pad_mu, '패드 μ');
  const pf1 = PR * bb * eta / Amf, pr1 = PR * (1 - bb) * eta / Amr;                            // 답력 1 N 당 압력 [N/mm² = MPa]
  const kf = 2 * pf1 * pos(I.cal_area_f, '앞 캘리퍼 면적') * 2 * mp * rdf / rl, kr = 2 * pr1 * pos(I.cal_area_r, '뒤 캘리퍼 면적') * 2 * mp * rdr / rl;   // 답력 1 N 당 축 제동력 [N/N]
  const beta = kf / (kf + kr);
  // 잠김
  const af = beta - mu * h / L > 0 ? mu * Wf / (m * (beta - mu * h / L)) : Infinity, ar = mu * Wr / (m * (1 - beta + mu * h / L));
  const first = af <= ar ? 1 : 2, aL = Math.min(af, ar, amax), Fp1 = m * aL / (kf + kr);
  const Fall = Math.max(mu * Fzf(amax) / kf, mu * Fzr(amax) / kr);
  const Fp = pos(I.f_ped, '설계 답력'), aP = Math.min((kf + kr) * Fp / m, aL);             // 설계 답력에서 감속 (잠기기 전까지 [m/s²])
  // 답력 F 에서 감속 (잠김 반영) · 축 제동력
  const decel = F => { const a0 = (kf + kr) * F / m, Ff0 = kf * F, Fr0 = kr * F;
    const lockF = Ff0 > mu * Fzf(a0) + 1e-9, lockR = Fr0 > mu * Math.max(0, Fzr(a0)) + 1e-9;
    if (!lockF && !lockR) return { a: a0, ff: Ff0, fr: Fr0, st: 0 };
    let a = lockF ? (mu * Wf + kr * F) / (m * (1 - mu * h / L)) : (kf * F + mu * Wr) / (m * (1 + mu * h / L));
    if (lockF && kr * F > mu * Fzr(a) - 1e-9) return { a: amax, ff: mu * Fzf(amax), fr: mu * Fzr(amax), st: 3 };
    if (lockR && kf * F > mu * Fzf(a) - 1e-9) return { a: amax, ff: mu * Fzf(amax), fr: mu * Fzr(amax), st: 3 };
    if (!(a > 0) || a > amax) a = amax;
    return { a, ff: lockF ? mu * Fzf(a) : kf * F, fr: lockF ? kr * F : mu * Fzr(a), st: lockF ? 1 : 2 }; };
  // 밸런스 바 맞춤
  const KF = I.cal_area_f * rdf / Amf, KR = I.cal_area_r * rdr / Amr, bbI = ideal * KR / (KF * (1 - ideal) + ideal * KR);
  // 디스크 온도
  const vs = Math.max(0, I.v_stop || 0) / 3.6, E = 0.5 * m * vs * vs, cD = I.c_disc > 0 ? I.c_disc : 460, ns = Math.max(1, Math.round(I.n_stop || 1));
  const dTf = I.m_disc_f > 0 ? E * beta / 2 / (I.m_disc_f * cD) : NaN, dTr = I.m_disc_r > 0 ? E * (1 - beta) / 2 / (I.m_disc_r * cD) : NaN;
  const pr = decel(Math.max(0, I.f_probe || 0));
  const out = {
    ideal_f: ideal * 100, act_f: beta * 100, a_max: amax / g,
    p_f: pf1 * Fp * 10, p_r: pr1 * Fp * 10,                                                   // 설계 답력의 라인 압력 [bar]
    fx_f: Math.min(kf * Fp, mu * Fzf(aP)), fx_r: Math.min(kr * Fp, Math.max(0, mu * Fzr(aP))), a_ped: aP / g,
    lock_first: first, a_lock: aL / g, f_lock1: Fp1, pedal_force: Fall, rule_lock: Fp >= Fall - 1e-9 ? 1 : 0,
    pr_min: PR * Fall / Fp, eff_b: aL / amax * 100,
    kf, kr, fzf_max: Fzf(amax), fzr_max: Fzr(amax),
    bb_ideal: bbI * 100, e_stop: E / 1000, dt_f: dTf, dt_r: dTr, dt_fn: dTf * ns, dt_rn: dTr * ns,
    a_probe: pr.a / g, st_probe: pr.st,
  };
  // 답력–감속도 곡선 (0 ~ 네 바퀴 잠김 답력 × 1.3, 설계 답력 포함)
  const Fm = Math.max(Fall * 1.3, Fp * 1.1), xs = [], sg = { a: [], ff: [], fr: [], pf: [], prr: [], st: [] };
  for (let i = 0; i <= 60; i++) { const F = Fm * i / 60, q = decel(F); xs.push(+F.toFixed(2)); sg.a.push(q.a / g); sg.ff.push(q.ff); sg.fr.push(q.fr); sg.pf.push(pf1 * F * 10); sg.prr.push(pr1 * F * 10); sg.st.push(q.st); }
  // 이상 곡선 (a = 0 ~ a_max) · 실제 직선 (그림용)
  const id = Array.from({ length: 41 }, (_, i) => { const a = amax * i / 40, u = a * m / W; return [u * Fzf(a), u * Fzr(a)]; });   // 두 축 모두 같은 μ 사용 u
  return { out, x: { d: xs }, sig: sg, fig: { id, beta, lock: [beta * m * aL, (1 - beta) * m * aL], fmax: [mu * Fzf(amax), mu * Fzr(amax)] } };
}
