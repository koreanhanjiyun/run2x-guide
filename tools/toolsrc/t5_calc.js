// ================================================================
// 도구 5 서스 기하 (3D 기구학) — 계산 코드. 엔진 K3D 는 위 (공통)
// ================================================================
// 입력 I : 축마다 (f 앞 · r 뒤) 하드포인트 8 점 (K3D 머리말), 윤거 tf · tr, 하중 반경 r_load, 정적 캠버 camber_f · r, 정적 토 toe_f · r,
//          무게중심 h · 휠베이스 L · 밸런스 바 앞 몫 brake_bias (안티 % 용), 그래프 트래블 범위 s_max [mm]
// 결과 (정지 자세, 작은 움직임): 롤센터 · 정면 순간중심 · FVSA, 범프 캠버 게인 [deg/mm], 롤 캠버 게인 (바깥 바퀴 · 지면 기준) = 1 + 범프 게인 × (t/2) × π/180 [deg/deg],
//   KPI · 캐스터 · 스크럽 (접지점 y − 킹핀축 지면 y) · 트레일 (킹핀축 지면 x − 접지점 x), 바퀴 중심 킹핀 옵셋,
//   범프 스티어 [deg/mm, 토인 +], 롤 스티어 (바깥 바퀴) = 범프 스티어 × (t/2) × π/180 [deg/deg],
//   측면 순간중심 · 안티다이브 (앞, 바깥 브레이크) = tanθ × L/h × 앞 제동 몫, 안티리프트 (뒤, 바깥 브레이크) = tanθ × L/h × 뒤 몫, 안티스쿼트 (뒤, 안쪽 구동) = tanθ_WC × L/h
// 그래프: 휠 트래블 −s_max ~ +s_max 에서 캠버 · 토 · 롤센터 (양쪽 같이 오르내림) · 윤거 반 변화 · 캐스터 · KPI
function calc(I) {
  const ax = (s, t, cam, toe) => K3D.axle(I, s, t, I.r_load, cam, toe);
  const F = ax('f', I.tf, I.camber_f, I.toe_f), R = ax('r', I.tr, I.camber_r, I.toe_r);
  const mF = K3D.metrics(F), mR = K3D.metrics(R), D = K3D.D, h = I.h, L = I.L, bb = (I.brake_bias || 0) / 100;
  if (!(h > 0) || !(L > 0)) throw new Error('무게중심 높이 · 휠베이스는 0 보다 커야 합니다.');
  const rg = (m, t) => 1 + m.cgb * (t / 2) * D, rs = (m, t) => m.bs * (t / 2) * D, fin = x => isFinite(x) ? x : NaN;
  const out = {
    rc_f: mF.rc, ic_y_f: mF.icy, ic_z_f: mF.icz, fvsa_f: fin(mF.fvsa), cgb_f: mF.cgb, camber_gain_f: rg(mF, I.tf),
    kpi: mF.kpi, caster: mF.caster, scrub: mF.scrub, trail: mF.trail, kpo_f: mF.kpo, bs_f: mF.bs, rs_f: rs(mF, I.tf),
    sv_x_f: mF.icx, sv_z_f: mF.icz_sv, anti_dive: mF.v[0] / mF.v[2] * L / h * bb * 100,
    rc_r: mR.rc, ic_y_r: mR.icy, ic_z_r: mR.icz, fvsa_r: fin(mR.fvsa), cgb_r: mR.cgb, camber_gain_r: rg(mR, I.tr),
    kpi_r: mR.kpi, caster_r: mR.caster, scrub_r: mR.scrub, trail_r: mR.trail, kpo_r: mR.kpo, bs_r: mR.bs, rs_r: rs(mR, I.tr),
    sv_x_r: mR.icx, sv_z_r: mR.icz_sv, anti_lift: -mR.v[0] / mR.v[2] * L / h * (1 - bb) * 100, anti_squat: -mR.vw[0] / mR.vw[2] * L / h * 100,
    camber_f_o: I.camber_f, camber_r_o: I.camber_r, toe_f_o: I.toe_f, toe_r_o: I.toe_r,
  };
  // 트래블 곡선
  const sm = Math.max(5, I.s_max || 40), n = 40, xs = [], sig = { cf: [], cr: [], tf_: [], tr_: [], rcf: [], rcr: [], yf: [], yr: [], kf: [], cs: [] };
  const XF0 = K3D.plain(mF.X), XR0 = K3D.plain(mR.X);
  for (let i = 0; i <= n; i++) { const s = -sm + 2 * sm * i / n; xs.push(+s.toFixed(3));
    const a = K3D.metrics(F, s), b = K3D.metrics(R, s);
    sig.cf.push(a.X.cam); sig.cr.push(b.X.cam); sig.tf_.push(-(a.X.head - XF0.head) + (I.toe_f || 0)); sig.tr_.push(-(b.X.head - XR0.head) + (I.toe_r || 0));
    sig.rcf.push(a.rc - a.X.CP[2]); sig.rcr.push(b.rc - b.X.CP[2]); sig.yf.push(a.X.CP[1] - XF0.CP[1]); sig.yr.push(b.X.CP[1] - XR0.CP[1]); sig.kf.push(a.kpi); sig.cs.push(a.caster); }
  const geo = { F: { P: F.P, X: XF0, t: I.tf, ic: [mF.icy, mF.icz], sv: [mF.icx, mF.icz_sv] }, R: { P: R.P, X: XR0, t: I.tr, ic: [mR.icy, mR.icz], sv: [mR.icx, mR.icz_sv] } };
  return { out, x: { d: xs }, sig, geo };
}
