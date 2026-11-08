/* ============================================================
   도구 T 타이어 모델 (선택 도구) — docs/TOOLS-PLAN.md 5절 '선택 · 타이어 모델'
   - 팀에 TTC 시험 데이터가 없으므로 Magic Formula 꼴 모델(횡 · 종 순수 슬립 + 코사인 가중 조합 슬립)을 직접 넣는 값으로 만들고, 스키드패드 기록으로 μ 를 거꾸로 셈
   - 결과: 하중별 슬립각–횡력 곡선, 정지 하중의 코너링 강성(앞 · 뒤), 최대 횡력 슬립각, 이완 길이
   - 대시보드로 모델 값을 보내면 도구 2P 차량 모델 2 · 3 이 받아 씀 (도구 2P 는 받기만)
   ============================================================ */
const MTTOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영(타이어 모델 값 · 앞뒤 코너링 강성)이 있습니다.'],
  ['#wb .wb-in', '입력', '시험 데이터가 없을 때는 문헌 · 비슷한 타이어 값으로 시작하고, 실주행(스키드패드 횡가속도 · 조향각)으로 맞춥니다. μ 는 기준 하중에서 값, 하중 감도는 하중 1 kN 이 늘 때 μ 가 줄어드는 양입니다. 스키드패드 기록을 넣으면 그 기록을 내는 μ 를 거꾸로 셈합니다.'],
  ['#wb #wbout', '결과', '정지 바퀴 하중(차 질량 · 앞 무게 비율)에서 코너링 강성 · μ · 최대 횡력 슬립각입니다. 탐침은 아무 슬립각 · 하중의 횡력을 보는 칸입니다.'],
  ['#wb .wb-sig', '슬립 곡선', '기준 하중의 0.5 · 1 · 1.5 배와 앞 · 뒤 정지 하중의 슬립각–횡력 곡선입니다. 종력 곡선을 고르면 같은 가로 눈금을 슬립률 % 로 읽습니다. 조합 곡선은 탐침 슬립률 · 슬립각과 함께일 때입니다.'],
];
const TTG = {mf:'모델 값 (바퀴 하나)', lx:'종 방향 · 조합 슬립', car:'정지 하중 (차)', pr:'탐침', sk:'스키드패드 기록 → 겉보기 μ (운전자 포함)'};
WB_TOOLS['T'] = {
  no:'T', stage:'P1', name:'타이어 모델',
  x:{n:'슬립각 (°) · 종력 곡선은 슬립률 (%)', u:''},
  sweepFirst:'ca0',
  inputs:[
    {k:'mu', dk:'mu', v:1.5, d:2, g:TTG.mf}, {k:'mu_s', dk:'mu_s', v:0.246, d:3, g:TTG.mf}, {k:'fz0', dk:'tire_fz0', v:736, d:0, g:TTG.mf},
    {k:'ca0', dk:'tire_ca0', v:450, d:0, g:TTG.mf}, {k:'cn', dk:'tire_cn', v:0.8, d:2, g:TTG.mf}, {k:'tc', dk:'tire_c', v:1.3, d:2, g:TTG.mf}, {k:'te', dk:'tire_e', v:0, d:2, g:TTG.mf},
    {k:'relax', dk:'tire_relax', v:0.3, d:2, g:TTG.mf},
    {k:'mux', n:'종 μ ÷ 횡 μ', u:'', v:1, d:2, g:TTG.lx}, {k:'ck0', n:'종 슬립 강성 ÷ 하중 (C_κ ÷ F_z)', u:'1/슬립', v:20, d:1, g:TTG.lx},
    {k:'tcx', n:'종 모양 계수 C_x', u:'', v:1.65, d:2, g:TTG.lx}, {k:'tex', n:'종 굽음 계수 E_x', u:'', v:0, d:2, g:TTG.lx},
    {k:'bxa', n:'조합 가중 B_xα (슬립각이 종력을 줄임)', u:'1/rad', v:8, d:1, g:TTG.lx}, {k:'byk', n:'조합 가중 B_yκ (슬립률이 횡력을 줄임)', u:'', v:8, d:1, g:TTG.lx},
    {k:'m', dk:'m', v:300, d:0, g:TTG.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:TTG.car},
    {k:'a_p', n:'탐침 슬립각', u:'°', v:4, d:1, g:TTG.pr}, {k:'fz_p', n:'탐침 하중', u:'N', v:900, d:0, g:TTG.pr}, {k:'k_p', n:'탐침 슬립률', u:'%', v:5, d:1, g:TTG.pr},
    {k:'t_sk', n:'스키드패드 한 바퀴 기록', u:'s', v:5.086, d:3, g:TTG.sk}, {k:'r_sk', n:'주행 반경 (코스 중심선)', u:'m', v:9.125, d:3, g:TTG.sk},
    {k:'h', dk:'h', v:290, d:0, g:TTG.sk}, {k:'L', dk:'L', v:1550, d:0, g:TTG.sk}, {k:'tf', dk:'tf', v:1200, d:0, g:TTG.sk}, {k:'tr', dk:'tr', v:1180, d:0, g:TTG.sk},
    {k:'lltd', dk:'lltd', v:49.5, d:1, g:TTG.sk}, {k:'cla', dk:'cla', v:3, d:2, g:TTG.sk}, {k:'xcop', dk:'xcop', v:775, d:0, g:TTG.sk},
  ],
  outGroups:{'대시보드 반영 (모델 값)':{note:'입력 그대로. [대시보드에 반영]으로 도구 2P 가 받아 씀'}},
  outputs:[
    {k:'fz_f', n:'앞 바퀴 하나 정지 하중', u:'N', d:1, g:'정지 하중에서'}, {k:'fz_r', n:'뒤 바퀴 하나 정지 하중', u:'N', d:1, g:'정지 하중에서'},
    {k:'c_alpha_f', dk:'c_alpha_f', d:1, g:'정지 하중에서'}, {k:'c_alpha_r', dk:'c_alpha_r', d:1, g:'정지 하중에서'},
    {k:'mu_f', n:'μ (앞 정지 하중)', u:'', d:3, g:'정지 하중에서'}, {k:'mu_r', n:'μ (뒤 정지 하중)', u:'', d:3, g:'정지 하중에서'},
    {k:'a_pk_f', n:'최대 횡력 슬립각 (앞)', u:'°', d:2, g:'정지 하중에서'}, {k:'a_pk_r', n:'최대 횡력 슬립각 (뒤)', u:'°', d:2, g:'정지 하중에서'},
    {k:'fy_pk_f', n:'최대 횡력 (앞 바퀴 하나)', u:'N', d:0, g:'정지 하중에서'}, {k:'fy_pk_r', n:'최대 횡력 (뒤 바퀴 하나)', u:'N', d:0, g:'정지 하중에서'},
    {k:'a_pk0', n:'최대 횡력 슬립각 (기준 하중)', u:'°', d:2, g:'기준 하중 · 탐침'}, {k:'fy_pk0', n:'최대 횡력 (기준 하중)', u:'N', d:0, g:'기준 하중 · 탐침'},
    {k:'fy_inf', n:'큰 슬립각 끝 횡력 (E = 0 일 때)', u:'N', d:0, g:'기준 하중 · 탐침'},
    {k:'fy_p', n:'탐침 횡력', u:'N', d:1, g:'기준 하중 · 탐침'}, {k:'mu_p', n:'탐침 횡력 ÷ 하중', u:'', d:3, g:'기준 하중 · 탐침'},
    {k:'tau_60', n:'이완 시간 상수 (60 km/h)', u:'s', d:3, g:'기준 하중 · 탐침'},
    {k:'c_kappa0', n:'종 슬립 강성 (기준 하중)', u:'N/슬립', d:0, g:'종 방향 · 조합'}, {k:'k_pk0', n:'최대 종력 슬립률 (기준 하중)', u:'%', d:2, g:'종 방향 · 조합'}, {k:'fx_pk0', n:'최대 종력 (기준 하중)', u:'N', d:0, g:'종 방향 · 조합'},
    {k:'fx_p', n:'탐침 종력 (슬립률 · 슬립각 함께)', u:'N', d:1, g:'종 방향 · 조합'}, {k:'fy_pc', n:'탐침 횡력 (슬립률 · 슬립각 함께)', u:'N', d:1, g:'종 방향 · 조합'},
    {k:'g_yk', n:'횡력 가중 G_yκ (탐침 슬립률)', u:'', d:4, g:'종 방향 · 조합'}, {k:'g_xa', n:'종력 가중 G_xα (탐침 슬립각)', u:'', d:4, g:'종 방향 · 조합'},
    {k:'sk_v', n:'스키드패드 평균 차속', u:'km/h', d:2, g:'스키드패드 기록 → 겉보기 μ (운전자 포함)'}, {k:'sk_ay', n:'횡가속도', u:'g', d:3, g:'스키드패드 기록 → 겉보기 μ (운전자 포함)'},
    {k:'sk_mue', n:'겉보기 유효 μ (횡력 합 ÷ 하중 합, 운전자 포함)', u:'', d:3, g:'스키드패드 기록 → 겉보기 μ (운전자 포함)'}, {k:'sk_mu0', n:'겉보기 기준 하중 μ₀ (하중 감도 반영, 운전자 포함)', u:'', d:3, g:'스키드패드 기록 → 겉보기 μ (운전자 포함)'},
    {k:'mu_o', dk:'mu', d:2, g:'대시보드 반영 (모델 값)', hide:true}, {k:'mu_s_o', dk:'mu_s', d:3, g:'대시보드 반영 (모델 값)', hide:true}, {k:'fz0_o', dk:'tire_fz0', d:0, g:'대시보드 반영 (모델 값)', hide:true},
    {k:'ca0_o', dk:'tire_ca0', d:0, g:'대시보드 반영 (모델 값)', hide:true}, {k:'cn_o', dk:'tire_cn', d:2, g:'대시보드 반영 (모델 값)', hide:true}, {k:'tc_o', dk:'tire_c', d:2, g:'대시보드 반영 (모델 값)', hide:true},
    {k:'te_o', dk:'tire_e', d:2, g:'대시보드 반영 (모델 값)', hide:true}, {k:'relax_o', dk:'tire_relax', d:2, g:'대시보드 반영 (모델 값)', hide:true},
  ],
  sigs:[
    {k:'x05', n:'종력 · 기준 하중 × 0.5 (가로 = 슬립률 %)', u:'N', d:0}, {k:'x10', n:'종력 · 기준 하중 (가로 = 슬립률 %)', u:'N', d:0}, {k:'x15', n:'종력 · 기준 하중 × 1.5 (가로 = 슬립률 %)', u:'N', d:0},
    {k:'yk', n:'횡력 · 기준 하중 · 탐침 슬립률과 함께', u:'N', d:0}, {k:'xa', n:'종력 · 기준 하중 · 탐침 슬립각과 함께 (가로 = 슬립률 %)', u:'N', d:0},
    {k:'f05', n:'횡력 · 기준 하중 × 0.5', u:'N', d:0}, {k:'f10', n:'횡력 · 기준 하중', u:'N', d:0}, {k:'f15', n:'횡력 · 기준 하중 × 1.5', u:'N', d:0},
    {k:'ff', n:'횡력 · 앞 정지 하중', u:'N', d:0}, {k:'fr', n:'횡력 · 뒤 정지 하중', u:'N', d:0}, {k:'mf', n:'횡력 ÷ 하중 · 앞', u:'', d:3}, {k:'mr', n:'횡력 ÷ 하중 · 뒤', u:'', d:3},
  ],
  sigOn:['f05', 'f10', 'f15'],
  tour: MTTOUR,
  verifyBase:{mu:1.5, mu_s:0, fz0:700, ca0:450, cn:0.8, tc:1.3, te:0, relax:0.3, m:300, fr:47.5, a_p:4, fz_p:900, mux:1, ck0:20, tcx:1.65, tex:0, bxa:8, byk:8, k_p:5, t_sk:5.086, r_sk:9.125, h:290, L:1550, tf:1200, tr:1180, lltd:49.5, cla:3, xcop:775},
  verify: [
    {n:'기준 하중 · 최대 횡력 = μ F_z, 최대 슬립각 = tan(π/2C) ÷ B (E = 0)', I:{mu:1.5, mu_s:0, fz0:700, ca0:450, cn:0.8, tc:1.3, te:0}, expect:{fy_pk0:1050, a_pk0:7.998243, fy_inf:935.556850},
     src:'D = 1.5 × 700 = 1050 N, B = C_α ÷ (C D) = (450 × 180/π) ÷ (1.3 × 1050) = 18.8887 /rad → α = tan(π ÷ 2.6) ÷ 18.8887 = 0.13959 rad = 7.9982°, 끝 값 = 1050 × sin(1.3 × π/2) = 935.557 N'},
    {n:'정지 바퀴 하중의 코너링 강성 = C_α0 (F_z ÷ F_z0)^n (300 kg, 앞 47.5 %)', I:{m:300, fr:47.5, fz0:700, ca0:450, cn:0.8}, expect:{fz_f:698.9625, fz_r:772.5375, c_alpha_f:449.466349, c_alpha_r:486.933594},
     src:'앞 = 300 × 9.81 × 0.475 ÷ 2 = 698.96 N → 450 × (698.96/700)^0.8 = 449.466, 뒤 = 772.54 N → 486.934 N/deg'},
    {n:'작은 슬립각 기울기 = 코너링 강성 (0.01°, 기준 하중)', I:{fz0:700, ca0:450, a_p:0.01, fz_p:700, te:0}, expect:{fy_p:4.499970},
     src:'F_y ≈ C_α α = 450 × 0.01 = 4.5 N (사인 · 아크탄젠트 3차 항만큼 작음: 4.49997)'},
    {n:'탐침 · 하중 감도 0.15 /kN · 굽음 계수 E = 0.5 (4°, 900 N)', I:{mu:1.5, mu_s:0.15, fz0:700, ca0:450, cn:0.8, tc:1.3, te:0.5, a_p:4, fz_p:900}, expect:{fy_p:1166.246555, mu_p:1.295830},
     src:'μ = 1.5 − 0.15 × 0.2 = 1.47 → D = 1323 N, C_α = 450 × (900/700)^0.8 °→rad, B = C_α ÷ (1.3 D), x = B × 4° → F_y = D sin(1.3 atan(x − 0.5 (x − atan x))) = 1166.25 N'},
    {n:'이완 시간 상수 = σ ÷ v (σ 0.3 m, 60 km/h)', I:{relax:0.3}, expect:{tau_60:0.018},
     src:'0.3 ÷ 16.667 = 0.018 s'},
    {n:'종 방향 최대 (E_x = 0): 최대 종력 = μ_x F_z, 슬립률 = tan(π ÷ 2C_x) ÷ B_x', I:{}, expect:{fx_pk0:1050, k_pk0:17.378256, c_kappa0:14000},
     src:'D_x = 1.5 × 700 = 1050 N, C_κ = 20 × 700 = 14000 N, B_x = 14000 ÷ (1.65 × 1050) = 8.0808 → κ = tan(π ÷ 3.3) ÷ 8.0808 = 0.17378'},
    {n:'조합 가중 (B_yκ = 8 · 슬립률 5 %, B_xα = 8 /rad · 슬립각 4°)', I:{}, expect:{g_yk:0.928477, g_xa:0.873062},
     src:'G_yκ = cos(atan(8 × 0.05)) = 1 ÷ √1.16 = 0.92848, G_xα = cos(atan(8 × 0.069813)) = 1 ÷ √1.31193 = 0.87306'},
    {n:'스키드패드 기록 → μ (2026 E-Formula 순수 기록 10.172 s 의 한 바퀴 5.086 s, 반경 9.125 m, C_L·A 3)', I:{}, expect:{sk_v:40.582508, sk_ay:1.419616, sk_mue:1.315259, sk_mu0:1.315259},
     src:'v = 2π × 9.125 ÷ 5.086 = 11.273 m/s, a_y = v² ÷ R = 13.926 m/s², D = ½ × 1.225 × 3 × v² = 233.5 N, μ = 300 × 13.926 ÷ (2943 + 233.5) = 1.3153 (하중 감도 0 이면 μ₀ 같음)'},
    {n:'스키드패드 → 기준 하중 μ₀ (하중 감도 0.246 /kN, 하중 이동 LLTD 49.5 %)', I:{mu_s:0.246}, expect:{sk_mu0:1.419166},
     src:'바퀴 하중 1257.1 · 257.6 · 1349.4 · 312.4 N (정지 + 다운포스 ± m a_y h × 몫 ÷ 윤거) → μ₀ = (m a_y + 0.246 × Σ (F_z − 700) F_z ÷ 1000) ÷ ΣF_z = 1.4192'}
  ],
  code: `// ================================================================
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
`
};
