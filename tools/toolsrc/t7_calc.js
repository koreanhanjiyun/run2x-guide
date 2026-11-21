// ================================================================
// 도구 7 액추에이션 · 스프링 — 계산 코드. 엔진 K3D 는 위 (공통)
// ================================================================
// 입력 I : m [kg], fr [%], h · h_s [mm], L · tf · tr [mm], m_us_f · m_us_r [kg, 바퀴 하나], r_load [mm] (현가하 CG ≈ 바퀴 중심 높이),
//          rc_f · rc_r [mm] 롤센터, ks_f · ks_r [N/mm] 스프링, mr_f · mr_r [-] 모션비 (스프링 ÷ 바퀴), karb_f · karb_r [N·m/deg] ARB (바퀴 위치 롤강성),
//          kt [N/mm] 타이어 수직 강성, cd_f · cd_r [N·s/m] 댐퍼 감쇠 (댐퍼 위치), ixx [kg·m²] 롤 관성 (현가상, 롤 감쇠비용)
//          mr_m = 1 이면 모션비를 기하로: 축마다 하드포인트 8 점 + 푸시로드 팔 쪽 pa (붙은 팔 pa_arm_f · r: 0 아래 · 1 위) · 로커 쪽 pr, 로커 회전 중심 rp · 축 위 다른 점 rq,
//          댐퍼 로커 쪽 dr · 차체 쪽 db, 윤거 · 하중 반경 r_load · 정적 캠버 (바퀴 중심 자리), 그래프 트래블 범위 s_max
// 기하 모션비 (Milliken 17 장 · 가상일): 휠 트래블 s 마다 K3D 로 팔 각 θ 를 풀고, 팔에 붙은 푸시로드 끝 PA(θ) → 푸시로드 길이 일정 |PA − PR(β)| = L_p 로 로커 각 β (뉴턴),
//   댐퍼 길이 l_d(s) = |DB − DR(β)|, 모션비 MR(s) = −dl_d/ds (바퀴가 1 mm 오를 때 댐퍼가 줄어드는 양, 중앙 차분). 정지 자세 MR 을 아래 식에 씀.
//   휠 레이트 곡선 k_w(s) = k_s MR(s)² (스프링 힘 × dMR/ds 항은 뺌 — 예압이 작을 때 근사)
// 식 (Milliken & Milliken, Race Car Vehicle Dynamics 16 · 18 장):
//   휠 레이트 k_w = k_s × MR²,  라이드 레이트 k_r = k_w k_t ÷ (k_w + k_t)  (타이어와 직렬)
//   현가상 코너 질량 m_c = (축 질량 − 2 m_us) ÷ 2,  라이드 주파수 f = √(k_r ÷ m_c) ÷ 2π
//   축 롤강성 (바퀴 위치) K_φ = (k_w t² ÷ 2 + K_ARB) 와 타이어 k_t t² ÷ 2 의 직렬 [N·m/rad]
//   롤 축 높이 (현가상 CG 자리) h_ra = rc_f + (rc_r − rc_f) × a_s ÷ L,  a_s = 앞축에서 현가상 CG 까지 = L × (현가상 뒤 몫)
//   롤 구배 = m_s g (h_s − h_ra) ÷ (K_φf + K_φr − m_s g (h_s − h_ra))  [rad/g → deg/g]
//   횡하중 이동 (바퀴 하나, ay = 1 g): ΔF_f = [m_s,f a rc_f + m_s a (h_s − h_ra) K_φf ÷ ΣK_φ + 2 m_us,f a r_load] ÷ t_f  (현가상 앞 몫 · 탄성 몫 · 현가하)
//   LLTD (앞 몫) = ΔF_f t_f ÷ (ΔF_f t_f + ΔF_r t_r),  RSD = K_φf ÷ ΣK_φ
//   감쇠: 바퀴 위치 c_w = c_d × MR², 라이드 감쇠비 ζ = c_w ÷ (2 √(k_r m_c)) (타이어 직렬 근사 무시 · 휠 레이트 기준이면 k_w), 롤 감쇠 C_φ = c_w t² ÷ 2 (앞 + 뒤),
//         롤 감쇠비 ζ_φ = ΣC_φ ÷ (2 √(ΣK_φ I_xx))
const g = 9.81, D = Math.PI / 180;
function mrGeo(I, s, t, cam) {
  const A = K3D.axle(I, s, t, I.r_load, cam, 0, ['pa', 'pr', 'rp', 'rq', 'dr', 'db']), P = A.P, { sub, norm, unit, rotAbout } = K3D;
  const up = I['pa_arm_' + s] === 1, piv = up ? P.uf : P.lf, kA = unit(sub(up ? P.ur : P.lr, piv)), n = unit(sub(P.rq, P.rp));
  const Lp = norm(sub(P.pr, P.pa)), ld0 = norm(sub(P.db, P.dr));
  if (!(norm(sub(P.rq, P.rp)) > 0) || !(Lp > 0) || !(ld0 > 0)) throw new Error((s === 'f' ? '앞' : '뒤') + ' 로커 축 · 푸시로드 · 댐퍼 점이 겹칩니다.');
  let q = null, b = 0;
  const at = sz => { const X = K3D.pose(A, sz, 0, q); q = X.q; const PA = rotAbout(P.pa, piv, kA, up ? X.q[1] : X.q[0]);
    const g = bb => norm(sub(PA, rotAbout(P.pr, P.rp, n, bb))) - Lp;
    for (let i = 0; i < 40; i++) { const f = g(b), d = (g(b + 1e-7) - g(b - 1e-7)) / 2e-7; if (!(Math.abs(d) > 1e-12)) throw new Error('로커가 푸시로드 방향으로 돌지 못합니다 (점 배치 확인).'); const db = -f / d; b += db; if (Math.abs(db) < 1e-13) break; }
    return { ld: norm(sub(P.db, rotAbout(P.dr, P.rp, n, b))), b }; };
  const mr = sz => { const h = 0.01, qq = q, bq = b, p = at(sz + h), m = at(sz - h); q = qq; b = bq; return -(p.ld - m.ld) / (2 * h); };
  const mr0 = mr(0);
  /* 댐퍼 길이가 tgt 가 되는 바퀴 트래블 [mm] (dir +1 범프 · −1 리바운드). 0 에서 1 mm 씩 이어 풀다 지나치면 반으로 나눠 좁힘, 200 mm 안에 없으면 NaN */
  const reach = (tgt, dir) => { q = null; b = 0; let pl = ld0, ps = 0;
    for (let s = 1; s <= 200; s++) { const l = at(dir * s).ld;
      if ((l - tgt) * (pl - tgt) <= 0) { let a = ps, c = s, la = pl; for (let k = 0; k < 40; k++) { const m = (a + c) / 2, lm = at(dir * m).ld; if ((lm - tgt) * (la - tgt) <= 0) c = m; else { a = m; la = lm; } } return (a + c) / 2; }
      pl = l; ps = s; }
    return NaN; };
  return { mr0, ld0, at, mr, reach, curve(sm, nn) { const xs = [], m = [], dl = [], rk = []; q = null; b = 0; const z = at(0);
    for (let i = 0; i <= nn; i++) { const sz = -sm + 2 * sm * i / nn; q = null; b = 0;
      // 0 에서 sz 까지 이어 풂
      const st = Math.max(1, Math.ceil(Math.abs(sz) / 5)); let r; for (let j = 1; j <= st; j++) r = at(sz * j / st);
      xs.push(+sz.toFixed(3)); m.push(mr(sz)); dl.push(ld0 - r.ld); rk.push((r.b - z.b) / K3D.D); }
    return { xs, m, dl, rk }; } };
}
function calc(I) {
  const geo = I.mr_m === 1, sm = Math.max(5, I.s_max || 30);
  let GF = null, GR = null, mrf = I.mr_f, mrr = I.mr_r;
  if (geo) { GF = mrGeo(I, 'f', I.tf, I.camber_f); GR = mrGeo(I, 'r', I.tr, I.camber_r); mrf = GF.mr0; mrr = GR.mr0;
    if (!(mrf > 0) || !(mrr > 0)) throw new Error('기하 모션비가 0 이하입니다 (바퀴가 오를 때 댐퍼가 늘어남). 점 배치를 확인하세요.'); }
  I = Object.assign({}, I, { mr_f: mrf, mr_r: mrr });
  const L = I.L / 1000, tf = I.tf / 1000, tr = I.tr / 1000, h = I.h / 1000, hs = (I.h_s > 0 ? I.h_s : I.h) / 1000, rl = I.r_load / 1000;
  const rf = I.rc_f / 1000, rr = I.rc_r / 1000, fs = I.fr / 100, muf = I.m_us_f, mur = I.m_us_r;
  const ms = I.m - 2 * muf - 2 * mur, msf = I.m * fs - 2 * muf, msr = I.m * (1 - fs) - 2 * mur;
  if (!(ms > 0) || !(msf > 0) || !(msr > 0)) throw new Error('현가하질량(바퀴 하나 × 2)이 축 질량보다 큽니다.');
  const kt = I.kt * 1000;
  const kw = (ks, mr) => ks * 1000 * mr * mr, ser = (a, b) => a > 0 && b > 0 ? a * b / (a + b) : 0;
  const kwf = kw(I.ks_f, I.mr_f), kwr = kw(I.ks_r, I.mr_r), krf = ser(kwf, kt), krr = ser(kwr, kt);   // [N/m]
  const mcf = msf / 2, mcr = msr / 2, fr_ = (k, mc) => Math.sqrt(k / mc) / (2 * Math.PI);
  const Kax = (kwx, t, karb) => ser(kwx * t * t / 2 + karb / D, kt * t * t / 2);                        // [N·m/rad]
  const Kf = Kax(kwf, tf, I.karb_f), Kr = Kax(kwr, tr, I.karb_r), K = Kf + Kr;
  const as = L * msr / ms, hra = rf + (rr - rf) * as / L, hp = hs - hra;                               // 현가상 CG 자리 롤 축 높이 · 롤 팔
  const rg = ms * g * hp / (K - ms * g * hp);                                                          // [rad/g]
  const dFf = (msf * g * rf + ms * g * hp * Kf / K + 2 * muf * g * rl) / tf, dFr = (msr * g * rr + ms * g * hp * Kr / K + 2 * mur * g * rl) / tr;   // [N/g] 바퀴 하나
  const lltd = dFf * tf / (dFf * tf + dFr * tr);
  const cwf = I.cd_f * I.mr_f * I.mr_f, cwr = I.cd_r * I.mr_r * I.mr_r;                                // [N·s/m] 바퀴 위치
  const Cphi = cwf * tf * tf / 2 + cwr * tr * tr / 2;                                                  // [N·m·s/rad]
  const out = {
    kw_f: kwf / 1000, kw_r: kwr / 1000, kr_f: krf / 1000, kr_r: krr / 1000,                           // [N/mm]
    mc_f: mcf, mc_r: mcr, f_ride_f: fr_(krf, mcf), f_ride_r: fr_(krr, mcr),
    kphi_f: Kf * D, kphi_r: Kr * D, k_roll: K * D, rsd: Kf / K * 100,                                 // [N·m/deg] · [%]
    h_ra: hra * 1000, h_arm: hp * 1000, roll_grad: rg / D, lltd: lltd * 100,
    dfz_f: dFf, dfz_r: dFr,                                                                            // 1 g 에서 바퀴 하나 횡하중 이동 [N]
    z_f: cwf / (2 * Math.sqrt(krf * mcf)), z_r: cwr / (2 * Math.sqrt(krr * mcr)), c_roll: Cphi * D,   // 감쇠비 · [N·m·s/deg]
    z_roll: I.ixx > 0 ? Cphi / (2 * Math.sqrt(K * I.ixx)) : NaN,
    ms: ms, ks_f_o: I.ks_f, ks_r_o: I.ks_r, mr_f_o: I.mr_f, mr_r_o: I.mr_r, karb_f_o: I.karb_f, karb_r_o: I.karb_r, cd_f_o: I.cd_f, cd_r_o: I.cd_r,
  };
  out.mr_geo = geo ? 1 : 0; out.mr_f_g = geo ? mrf : NaN; out.mr_r_g = geo ? mrr : NaN;
  if (!geo) { const xs = [], N = 30; for (let i = 0; i <= N; i++) xs.push(+(-sm + 2 * sm * i / N).toFixed(3)); const cst = v => xs.map(() => v), dl = (m) => xs.map(x => m * x);
    return { out, x: { d: xs }, sig: { mrf: cst(mrf), mrr: cst(mrr), kwf: cst(I.ks_f * mrf * mrf), kwr: cst(I.ks_r * mrr * mrr), dlf: dl(mrf), dlr: dl(mrr), rkf: cst(NaN), rkr: cst(NaN) } }; }
  const cF = GF.curve(sm, 30), cR = GR.curve(sm, 30), pr = (c) => (c.m[c.m.length - 1] - c.m[0]) / c.m[(c.m.length - 1) / 2] * 100;
  /* 댐퍼 규격 (다 늘어난 눈 사이 길이 Lf · 스트로크 S): 정지 눌림 = Lf − ld0, 범프 여유 = 댐퍼가 S − 눌림 만큼 더 줄어드는 바퀴 트래블 (바닥), 리바운드 여유 = 댐퍼가 Lf 까지 늘어나는 바퀴 트래블 (끝까지 늘어남) */
  const shk = (G, Lf, S) => { const sag = Lf - G.ld0; if (!(Lf > 0) || !(S > 0)) return [NaN, NaN, NaN];
    return [sag, sag < S ? G.reach(Lf - S, 1) : 0, sag > 0 ? G.reach(Lf, -1) : 0]; };
  { const [sf, bf, rf2] = shk(GF, I.sh_l_f, I.sh_s_f), [sr, br, rr2] = shk(GR, I.sh_l_r, I.sh_s_r);
    Object.assign(out, { sh_sag_f: sf, sh_bump_f: bf, sh_reb_f: rf2, sh_sag_r: sr, sh_bump_r: br, sh_reb_r: rr2 }); }
  Object.assign(out, { prog_f: pr(cF), prog_r: pr(cR), ld0_f: GF.ld0, ld0_r: GR.ld0, dl_f: cF.dl[cF.dl.length - 1], dl_r: cR.dl[cR.dl.length - 1], rk_f: cF.rk[cF.rk.length - 1], rk_r: cR.rk[cR.rk.length - 1] });
  return { out, x: { d: cF.xs }, sig: { mrf: cF.m, mrr: cR.m, kwf: cF.m.map(m => I.ks_f * m * m), kwr: cR.m.map(m => I.ks_r * m * m), dlf: cF.dl, dlr: cR.dl, rkf: cF.rk, rkr: cR.rk } };
}
