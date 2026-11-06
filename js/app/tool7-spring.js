/* ============================================================
   도구 7 액추에이션 · 스프링 (간이판) — docs/TOOLS-PLAN.md 5절
   - 모션비를 상수로 넣고(로커 · 푸시로드 기하로 모션비 곡선을 구하는 것은 5번 3D 엔진과 함께 나중에) 휠 · 라이드 레이트, 라이드 주파수, 롤강성 · 롤 구배,
     횡하중 이동 배분(LLTD) · 롤강성 배분(RSD), 감쇠비 · 롤 감쇠를 계산
   - 대시보드로 kw · f_ride · k_roll · roll_grad · lltd · rsd · c_roll 을 보내면 도구 2 차량 모델 1 · 2 · 3 이 받아 씀
   ============================================================ */
const M7TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '차 질량 · 무게중심 · 현가하질량(1번 도구), 롤센터(5번 도구), 스프링 · 모션비 · ARB · 타이어 수직 강성 · 댐퍼입니다. 모션비는 스프링 ÷ 바퀴(바퀴 1 mm 에 스프링이 줄어드는 양)입니다.'],
  ['#wb #wbout', '결과', '레이트 · 주파수, 롤(롤강성 · 롤 구배 · 롤 축 높이), 하중 이동(LLTD · RSD · 1 g 바퀴 하나 이동량), 감쇠입니다. LLTD 는 롤센터 경로 · 스프링 경로 · 현가하 몫을 모두 더한 전체 횡하중 이동의 앞 몫이고, RSD 는 롤강성만의 앞 몫입니다.'],
];
const T7G = {car:'차 (1번 · 5번 도구)', spr:'스프링 · ARB · 타이어', dmp:'댐퍼'};
WB_TOOLS['7'] = {
  no:'7', stage:'P3-6~7', name:'액추에이션 · 스프링',
  noSig:true,
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:T7G.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T7G.car}, {k:'h', dk:'h', v:290, d:0, g:T7G.car}, {k:'h_s', dk:'h_s', v:300, d:0, g:T7G.car},
    {k:'L', dk:'L', v:1550, d:0, g:T7G.car}, {k:'tf', dk:'tf', v:1200, d:0, g:T7G.car}, {k:'tr', dk:'tr', v:1180, d:0, g:T7G.car},
    {k:'m_us_f', dk:'m_us_f', v:12, d:1, g:T7G.car}, {k:'m_us_r', dk:'m_us_r', v:12, d:1, g:T7G.car}, {k:'r_load', dk:'r_load', n:'현가하 CG 높이 (하중 반경)', v:220, d:0, g:T7G.car},
    {k:'rc_f', dk:'rc_f', v:30, d:0, g:T7G.car}, {k:'rc_r', dk:'rc_r', v:50, d:0, g:T7G.car}, {k:'ixx', dk:'ixx', n:'롤 관성 모멘트 (롤 감쇠비용)', v:30, d:1, g:T7G.car},
    {k:'ks_f', dk:'ks_f', v:45, d:1, g:T7G.spr}, {k:'ks_r', dk:'ks_r', v:50, d:1, g:T7G.spr}, {k:'mr_f', dk:'mr_f', v:0.9, d:3, g:T7G.spr}, {k:'mr_r', dk:'mr_r', v:0.9, d:3, g:T7G.spr},
    {k:'karb_f', dk:'karb_f', v:150, d:0, g:T7G.spr}, {k:'karb_r', dk:'karb_r', v:100, d:0, g:T7G.spr}, {k:'kt', dk:'kt_tire', v:100, d:0, g:T7G.spr},
    {k:'cd_f', dk:'cd_f', v:1500, d:0, g:T7G.dmp}, {k:'cd_r', dk:'cd_r', v:1500, d:0, g:T7G.dmp},
  ],
  outputs:[
    {k:'kw_f', dk:'kw_f', d:2, g:'레이트 · 주파수'}, {k:'kw_r', dk:'kw_r', d:2, g:'레이트 · 주파수'}, {k:'kr_f', n:'라이드 레이트 (앞, 타이어 직렬)', u:'N/mm', d:2, g:'레이트 · 주파수'},
    {k:'kr_r', n:'라이드 레이트 (뒤, 타이어 직렬)', u:'N/mm', d:2, g:'레이트 · 주파수'}, {k:'mc_f', n:'현가상 코너 질량 (앞)', u:'kg', d:1, g:'레이트 · 주파수'}, {k:'mc_r', n:'현가상 코너 질량 (뒤)', u:'kg', d:1, g:'레이트 · 주파수'},
    {k:'f_ride_f', dk:'f_ride_f', d:2, g:'레이트 · 주파수'}, {k:'f_ride_r', dk:'f_ride_r', d:2, g:'레이트 · 주파수'},
    {k:'kphi_f', n:'롤강성 (앞축)', u:'N·m/°', d:1, g:'롤'}, {k:'kphi_r', n:'롤강성 (뒤축)', u:'N·m/°', d:1, g:'롤'}, {k:'k_roll', dk:'k_roll', d:1, g:'롤'},
    {k:'h_ra', n:'롤 축 높이 (현가상 CG 자리)', u:'mm', d:1, g:'롤'}, {k:'h_arm', n:'롤 팔 (현가상 CG − 롤 축)', u:'mm', d:1, g:'롤'}, {k:'roll_grad', dk:'roll_grad', d:3, g:'롤'},
    {k:'lltd', dk:'lltd', d:1, g:'하중 이동'}, {k:'rsd', dk:'rsd', d:1, g:'하중 이동'}, {k:'dfz_f', n:'1 g 횡하중 이동 (앞 바퀴 하나)', u:'N', d:0, g:'하중 이동'}, {k:'dfz_r', n:'1 g 횡하중 이동 (뒤 바퀴 하나)', u:'N', d:0, g:'하중 이동'},
    {k:'z_f', n:'라이드 감쇠비 (앞)', u:'', d:3, g:'감쇠'}, {k:'z_r', n:'라이드 감쇠비 (뒤)', u:'', d:3, g:'감쇠'}, {k:'c_roll', dk:'c_roll', d:2, g:'감쇠'}, {k:'z_roll', n:'롤 감쇠비', u:'', d:3, g:'감쇠'},
    {k:'ks_f_o', dk:'ks_f', d:1, g:'감쇠', hide:true}, {k:'ks_r_o', dk:'ks_r', d:1, g:'감쇠', hide:true}, {k:'mr_f_o', dk:'mr_f', d:3, g:'감쇠', hide:true}, {k:'mr_r_o', dk:'mr_r', d:3, g:'감쇠', hide:true},
    {k:'karb_f_o', dk:'karb_f', d:0, g:'감쇠', hide:true}, {k:'karb_r_o', dk:'karb_r', d:0, g:'감쇠', hide:true}, {k:'cd_f_o', dk:'cd_f', d:0, g:'감쇠', hide:true}, {k:'cd_r_o', dk:'cd_r', d:0, g:'감쇠', hide:true},
  ],
  tour: M7TOUR,
  verifyBase:{},
  verify: [
    {n:'휠 레이트 = 스프링 × 모션비², 타이어가 아주 단단하면 라이드 레이트 = 휠 레이트', I:{ks_f:40, mr_f:0.8, kt:1e9}, expect:{kw_f:25.6, kr_f:25.6},
     src:'40 × 0.8² = 25.6 N/mm, 25.6 × k_t ÷ (25.6 + k_t) → 25.6 (k_t → ∞)'},
    {n:'기본값 · 라이드 주파수 · 총 롤강성 · 롤 구배 · LLTD · 감쇠 (손계산 식, t7_hand.py)', I:{}, expect:{kr_f:26.713082, f_ride_f:3.379387, f_ride_r:3.307378, k_roll:807.884692, rsd:50.721377, h_ra:40.595238, roll_grad:0.804928, lltd:48.736727, z_f:0.482881, c_roll:30.031584, z_roll:0.730086},
     src:'휠 36.45 N/mm 와 타이어 100 N/mm 직렬 = 26.713 N/mm, 현가상 앞 코너 59.25 kg → 3.379 Hz. 축 롤강성 = (k_w t²/2 + ARB) 와 k_t t²/2 직렬, 합 807.88 N·m/°. 롤 축 높이 = (30 × 118.5 + 50 × 133.5) ÷ 252 = 40.595 mm, 롤 구배 = m_s g h′ ÷ (ΣK − m_s g h′) = 0.8049 °/g. LLTD = 앞 (현가상 앞 몫 + 탄성 몫 + 현가하) × t ÷ 합 = 48.737 %'},
    {n:'롤센터 0 · 현가하 거의 0 · 같은 윤거 · 단단한 타이어 → LLTD = 롤강성 배분', I:{rc_f:0, rc_r:0, m_us_f:0.001, m_us_r:0.001, tr:1200, kt:1e9, h_s:290}, expect:{lltd:49.963278, rsd:49.963278, h_ra:0},
     src:'기하 몫 · 현가하 몫이 0 이면 횡하중 이동은 탄성 몫뿐 → 앞 몫 = K_φf ÷ ΣK_φ (Milliken 18 장)'},
    {n:'1 g 앞 바퀴 하나 횡하중 이동 합 = m h g 와 맞음 (기본값, 앞 바퀴)', I:{}, expect:{dfz_f:343.281035},
     src:'ΔF_f = [118.5 × 9.81 × 0.03 + 252 × 9.81 × 0.2594 × 0.5072 + 2 × 12 × 9.81 × 0.22] ÷ 1.2 = 343.28 N'}
  ],
  code: `// ================================================================
// 도구 7 액추에이션 · 스프링 — 계산 코드 (간이판: 모션비는 상수로 넣음, 로커 기하로 구하는 것은 나중에)
// ================================================================
// 입력 I : m [kg], fr [%], h · h_s [mm], L · tf · tr [mm], m_us_f · m_us_r [kg, 바퀴 하나], r_load [mm] (현가하 CG ≈ 바퀴 중심 높이),
//          rc_f · rc_r [mm] 롤센터, ks_f · ks_r [N/mm] 스프링, mr_f · mr_r [-] 모션비 (스프링 ÷ 바퀴), karb_f · karb_r [N·m/deg] ARB (바퀴 위치 롤강성),
//          kt [N/mm] 타이어 수직 강성, cd_f · cd_r [N·s/m] 댐퍼 감쇠 (댐퍼 위치), ixx [kg·m²] 롤 관성 (현가상, 롤 감쇠비용)
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
function calc(I) {
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
  return { out };
}
`
};
