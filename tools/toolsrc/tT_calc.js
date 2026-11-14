// ================================================================
// 도구 T 타이어 모델 — 계산 코드
// ================================================================
// TTC 같은 시험 데이터가 없을 때 쓰는 순수 횡슬립 모델 (바퀴 하나):
//   Magic Formula 꼴 (Pacejka, Tire and Vehicle Dynamics 4장):  F_y(α) = D sin(C atan(Bα − E(Bα − atan Bα)))
//     D = μ(F_z) F_z,           μ(F_z) = μ₀ − s (F_z − F_z0) ÷ 1000          (하중 감도 s [1/kN], 기준 하중 F_z0 [N])
//     B C D = C_α(F_z),         C_α(F_z) = C_α0 (F_z ÷ F_z0)^n               (코너링 강성 [N/rad], 하중 지수 n)
//     C = 모양 계수 (횡 1.3 안팎), E = 굽음 계수 (≤ 1)
//   E = 0 이면 최대 횡력 슬립각 α_peak = tan(π ÷ (2C)) ÷ B,  α → ∞ 에서 F_y → D sin(Cπ/2)
//   이완 길이 σ [m]: 슬립각이 바뀐 뒤 횡력이 따라오는 거리 (과도 응답, 차량 모델 3) — 시간 상수 = σ ÷ v
//   종 방향 (같은 꼴, 슬립률 κ): F_x(κ) = D_x sin(C_x atan(B_x κ − E_x(B_x κ − atan B_x κ))),  D_x = μ_x(F_z) F_z (μ_x = 비 mux × μ(F_z)),  B_x C_x D_x = C_κ = ck0 × F_z
//   조합 슬립 (Pacejka 2012 4.3.2 의 코사인 가중 꼴): F_x = F_x0(κ) G_xα,  G_xα = cos(atan(B_xα α)),  F_y = F_y0(α) G_yκ,  G_yκ = cos(atan(B_yκ κ))
//   스키드패드 기록 → μ: v = 2πR ÷ t, a_y = v² ÷ R, μ_유효 = m a_y ÷ (m g + D),  하중 감도를 넣은 기준 μ₀ = (m a_y + s Σ (F_zi − F_z0) F_zi ÷ 1000) ÷ ΣF_zi
//     (F_zi = 정지 + 다운포스 몫 ± 횡하중 이동: 앞 ± m a_y h LLTD ÷ t_f, 뒤 ± m a_y h (1 − LLTD) ÷ t_r)
// 입력 I : mu, mu_s, fz0, ca0 [N/deg], cn, tc, te, relax [m] · 종 mux, ck0 [1/슬립], tcx, tex · 조합 bxa [1/rad], byk · 차 m [kg], fr [%] · 탐침 a_p [deg], fz_p [N], k_p [%]
//          스키드패드 t_sk [s, 한 바퀴], r_sk [m, 주행 반경], h, tf, tr [mm], lltd [%], cla [m²], xcop [mm]
const RAD = Math.PI / 180, g = 9.81;
function tyre(I) {
  const mu = Fz => Math.max(0.05, I.mu - (I.mu_s || 0) * (Fz - I.fz0) / 1000);
  const Ca = Fz => I.ca0 / RAD * Math.pow(Math.max(0, Fz) / I.fz0, I.cn);   // [N/rad]
  const C = I.tc, E = Math.min(1, I.te);
  const Fy = (aDeg, Fz) => { if (Fz <= 0) return 0; const D = mu(Fz) * Fz, B = Ca(Fz) / (C * D), x = B * aDeg * RAD;
    return D * Math.sin(C * Math.atan(x - E * (x - Math.atan(x)))); };
  const Fx = (k, Fz) => { if (Fz <= 0) return 0; const D = (I.mux > 0 ? I.mux : 1) * mu(Fz) * Fz, Cx = I.tcx > 0 ? I.tcx : 1.65, Ex = Math.min(1, I.tex || 0), B = (I.ck0 > 0 ? I.ck0 : 20) * Fz / (Cx * D), x = B * k;
    return D * Math.sin(Cx * Math.atan(x - Ex * (x - Math.atan(x)))); };
  const Gxa = aDeg => Math.cos(Math.atan((I.bxa || 0) * aDeg * RAD)), Gyk = k => Math.cos(Math.atan((I.byk || 0) * k));
  return { mu, Ca, Fy, Fx, Gxa, Gyk, C, E };
}
function calc(I) {
  if (!(I.fz0 > 0) || !(I.ca0 > 0) || !(I.tc > 0) || !(I.tc < 2) || !(I.mu > 0)) throw new Error('기준 하중 · 코너링 강성 · μ 는 0 보다 크고, 모양 계수 C 는 0 ~ 2 사이로 넣으세요.');
  const T = tyre(I);
  const Ff = I.m * g * I.fr / 100 / 2, Fr = I.m * g * (1 - I.fr / 100) / 2;      // 정지 바퀴 하나 하중 [N]
  // 최대 횡력 슬립각: 수치로 (0.01° 간격 뒤 황금분할), E = 0 이면 닫힌 식과 같음
  const peak = Fz => { let best = 0, bv = -Infinity; for (let a = 0.01; a <= 40; a += 0.01) { const f = T.Fy(a, Fz); if (f > bv) { bv = f; best = a; } }
    let lo = Math.max(0, best - 0.01), hi = best + 0.01; for (let i = 0; i < 60; i++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (T.Fy(m1, Fz) < T.Fy(m2, Fz)) lo = m1; else hi = m2; }
    const a = (lo + hi) / 2; return { a, F: T.Fy(a, Fz) }; };
  const pf = peak(Ff), pr = peak(Fr), p0 = peak(I.fz0);
  // 종 방향 최대 (슬립률, 0.0001 간격 뒤 황금분할)
  const peakX = Fz => { let best = 0, bv = -Infinity; for (let k = 0.0005; k <= 1; k += 0.0005) { const f = T.Fx(k, Fz); if (f > bv) { bv = f; best = k; } }
    let lo = Math.max(0, best - 0.0005), hi = best + 0.0005; for (let i = 0; i < 60; i++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (T.Fx(m1, Fz) < T.Fx(m2, Fz)) lo = m1; else hi = m2; }
    const k = (lo + hi) / 2; return { k, F: T.Fx(k, Fz) }; };
  const px0 = peakX(I.fz0), kp = (I.k_p || 0) / 100;
  // 스키드패드 → μ
  let sk = { ay: NaN, mue: NaN, mu0: NaN };
  if (I.t_sk > 0 && I.r_sk > 0) { const v = 2 * Math.PI * I.r_sk / I.t_sk, ay = v * v / I.r_sk, D = 0.5 * 1.225 * Math.max(0, I.cla || 0) * v * v, fa = I.L > 0 && isFinite(I.xcop) ? I.xcop / I.L : I.fr / 100;
    const fs = I.fr / 100, h = (I.h || 0) / 1000, ld = (isFinite(I.lltd) ? I.lltd : 50) / 100, tf = (I.tf || 1200) / 1000, tr = (I.tr || 1200) / 1000;
    const Wf = (I.m * g * fs + D * fa) / 2, Wr = (I.m * g * (1 - fs) + D * (1 - fa)) / 2, dF = I.m * ay * h * ld / tf, dR = I.m * ay * h * (1 - ld) / tr;
    const Z = [Wf + dF, Wf - dF, Wr + dR, Wr - dR], SZ = Z.reduce((a, b) => a + b, 0), s = I.mu_s || 0;
    sk = { ay: ay / g, mue: I.m * ay / SZ, mu0: (I.m * ay + s * Z.reduce((a, z) => a + (z - I.fz0) * z, 0) / 1000) / SZ, v: v * 3.6 }; }
  const xs = []; for (let a = 0; a <= 20 + 1e-9; a += 0.1) xs.push(+a.toFixed(2));
  const L = [0.5, 1, 1.5].map(k => k * I.fz0);
  const sig = { x05: xs.map(k => T.Fx(k / 100, L[0])), x10: xs.map(k => T.Fx(k / 100, L[1])), x15: xs.map(k => T.Fx(k / 100, L[2])), yk: xs.map(a => T.Fy(a, L[1]) * T.Gyk(kp)), xa: xs.map(k => T.Fx(k / 100, L[1]) * T.Gxa(I.a_p)),
                f05: xs.map(a => T.Fy(a, L[0])), f10: xs.map(a => T.Fy(a, L[1])), f15: xs.map(a => T.Fy(a, L[2])),
                ff: xs.map(a => T.Fy(a, Ff)), fr: xs.map(a => T.Fy(a, Fr)), mf: xs.map(a => T.Fy(a, Ff) / Ff), mr: xs.map(a => T.Fy(a, Fr) / Fr) };
  const out = {
    fz_f: Ff, fz_r: Fr,
    c_alpha_f: T.Ca(Ff) * RAD, c_alpha_r: T.Ca(Fr) * RAD,                         // 정지 바퀴 하중의 코너링 강성 [N/deg]
    mu_f: T.mu(Ff), mu_r: T.mu(Fr), a_pk_f: pf.a, a_pk_r: pr.a, a_pk0: p0.a,       // μ · 최대 횡력 슬립각 [deg]
    fy_pk_f: pf.F, fy_pk_r: pr.F, fy_pk0: p0.F,                                     // 최대 횡력 [N]
    fy_p: T.Fy(I.a_p, I.fz_p), mu_p: T.Fy(I.a_p, I.fz_p) / I.fz_p,                  // 탐침 (슬립각 a_p, 하중 fz_p)
    fy_inf: I.te === 0 ? T.mu(I.fz0) * I.fz0 * Math.sin(I.tc * Math.PI / 2) : NaN,  // E = 0 일 때 큰 슬립각 끝 값 [N]
    tau_60: I.relax / (60 / 3.6),
    c_kappa0: (I.ck0 > 0 ? I.ck0 : 20) * I.fz0, k_pk0: px0.k * 100, fx_pk0: px0.F,                                  // 종 방향 (기준 하중)
    fx_p: T.Fx(kp, I.fz_p) * T.Gxa(I.a_p), fy_pc: T.Fy(I.a_p, I.fz_p) * T.Gyk(kp), g_yk: T.Gyk(kp), g_xa: T.Gxa(I.a_p),   // 조합 탐침
    sk_v: sk.v, sk_ay: sk.ay, sk_mue: sk.mue, sk_mu0: sk.mu0,                                                    // 60 km/h 에서 이완 시간 상수 [s]
    mu_o: I.mu, mu_s_o: I.mu_s || 0, fz0_o: I.fz0, ca0_o: I.ca0, cn_o: I.cn, tc_o: I.tc, te_o: I.te, relax_o: I.relax,   // 대시보드 반영 (모델 값 그대로)
  };
  return { out, x: { d: xs }, sig };
}
