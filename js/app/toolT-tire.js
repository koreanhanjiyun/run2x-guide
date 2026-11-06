/* ============================================================
   도구 T 타이어 모델 (선택 도구) — docs/TOOLS-PLAN.md 5절 '선택 · 타이어 모델'
   - 팀에 TTC 시험 데이터가 없으므로 Magic Formula 꼴 순수 횡슬립 모델을 직접 넣는 값(μ · 하중 감도 · 코너링 강성 · 하중 지수 · 모양 · 굽음 계수)으로 만듦
   - 결과: 하중별 슬립각–횡력 곡선, 정지 하중의 코너링 강성(앞 · 뒤), 최대 횡력 슬립각, 이완 길이
   - 대시보드로 모델 값을 보내면 도구 2 차량 모델 2 · 3 이 받아 씀 (도구 2 는 받기만)
   ============================================================ */
const MTTOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영(타이어 모델 값 · 앞뒤 코너링 강성)이 있습니다.'],
  ['#wb .wb-in', '입력', '시험 데이터가 없을 때는 문헌 · 비슷한 타이어 값으로 시작하고, 실주행(스키드패드 횡가속도 · 조향각)으로 맞춥니다. μ 는 기준 하중에서 값, 하중 감도는 하중 1 kN 이 늘 때 μ 가 줄어드는 양입니다.'],
  ['#wb #wbout', '결과', '정지 바퀴 하중(차 질량 · 앞 무게 비율)에서 코너링 강성 · μ · 최대 횡력 슬립각입니다. 탐침은 아무 슬립각 · 하중의 횡력을 보는 칸입니다.'],
  ['#wb .wb-sig', '슬립각–횡력 곡선', '기준 하중의 0.5 · 1 · 1.5 배와 앞 · 뒤 정지 하중의 곡선입니다. 신호를 골라 μ(횡력 ÷ 하중) 곡선도 볼 수 있습니다.'],
];
const TTG = {mf:'모델 값 (바퀴 하나)', car:'정지 하중 (차)', pr:'탐침'};
WB_TOOLS['T'] = {
  no:'T', stage:'P1', name:'타이어 모델',
  x:{n:'슬립각', u:'°'},
  sweepFirst:'ca0',
  inputs:[
    {k:'mu', dk:'mu', v:1.5, d:2, g:TTG.mf}, {k:'mu_s', dk:'mu_s', v:0, d:3, g:TTG.mf}, {k:'fz0', dk:'tire_fz0', v:700, d:0, g:TTG.mf},
    {k:'ca0', dk:'tire_ca0', v:450, d:0, g:TTG.mf}, {k:'cn', dk:'tire_cn', v:0.8, d:2, g:TTG.mf}, {k:'tc', dk:'tire_c', v:1.3, d:2, g:TTG.mf}, {k:'te', dk:'tire_e', v:0, d:2, g:TTG.mf},
    {k:'relax', dk:'tire_relax', v:0.3, d:2, g:TTG.mf},
    {k:'m', dk:'m', v:300, d:0, g:TTG.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:TTG.car},
    {k:'a_p', n:'탐침 슬립각', u:'°', v:4, d:1, g:TTG.pr}, {k:'fz_p', n:'탐침 하중', u:'N', v:900, d:0, g:TTG.pr},
  ],
  outGroups:{'대시보드 반영 (모델 값)':{note:'입력 그대로. [대시보드에 반영]으로 도구 2 가 받아 씀'}},
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
    {k:'mu_o', dk:'mu', d:2, g:'대시보드 반영 (모델 값)', hide:true}, {k:'mu_s_o', dk:'mu_s', d:3, g:'대시보드 반영 (모델 값)', hide:true}, {k:'fz0_o', dk:'tire_fz0', d:0, g:'대시보드 반영 (모델 값)', hide:true},
    {k:'ca0_o', dk:'tire_ca0', d:0, g:'대시보드 반영 (모델 값)', hide:true}, {k:'cn_o', dk:'tire_cn', d:2, g:'대시보드 반영 (모델 값)', hide:true}, {k:'tc_o', dk:'tire_c', d:2, g:'대시보드 반영 (모델 값)', hide:true},
    {k:'te_o', dk:'tire_e', d:2, g:'대시보드 반영 (모델 값)', hide:true}, {k:'relax_o', dk:'tire_relax', d:2, g:'대시보드 반영 (모델 값)', hide:true},
  ],
  sigs:[
    {k:'f05', n:'횡력 · 기준 하중 × 0.5', u:'N', d:0}, {k:'f10', n:'횡력 · 기준 하중', u:'N', d:0}, {k:'f15', n:'횡력 · 기준 하중 × 1.5', u:'N', d:0},
    {k:'ff', n:'횡력 · 앞 정지 하중', u:'N', d:0}, {k:'fr', n:'횡력 · 뒤 정지 하중', u:'N', d:0}, {k:'mf', n:'횡력 ÷ 하중 · 앞', u:'', d:3}, {k:'mr', n:'횡력 ÷ 하중 · 뒤', u:'', d:3},
  ],
  sigOn:['f05', 'f10', 'f15'],
  tour: MTTOUR,
  verifyBase:{mu:1.5, mu_s:0, fz0:700, ca0:450, cn:0.8, tc:1.3, te:0, relax:0.3, m:300, fr:47.5, a_p:4, fz_p:900},
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
     src:'0.3 ÷ 16.667 = 0.018 s'}
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
// 입력 I : mu, mu_s, fz0, ca0 [N/deg], cn, tc, te, relax [m] · 차 m [kg], fr [%] (정지 바퀴 하중) · 그래프 · 탐침 a_p [deg], fz_p [N]
const RAD = Math.PI / 180, g = 9.81;
function tyre(I) {
  const mu = Fz => Math.max(0.05, I.mu - (I.mu_s || 0) * (Fz - I.fz0) / 1000);
  const Ca = Fz => I.ca0 / RAD * Math.pow(Math.max(0, Fz) / I.fz0, I.cn);   // [N/rad]
  const C = I.tc, E = Math.min(1, I.te);
  const Fy = (aDeg, Fz) => { if (Fz <= 0) return 0; const D = mu(Fz) * Fz, B = Ca(Fz) / (C * D), x = B * aDeg * RAD;
    return D * Math.sin(C * Math.atan(x - E * (x - Math.atan(x)))); };
  return { mu, Ca, Fy, C, E };
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
  const xs = []; for (let a = 0; a <= 20 + 1e-9; a += 0.1) xs.push(+a.toFixed(2));
  const L = [0.5, 1, 1.5].map(k => k * I.fz0);
  const sig = { f05: xs.map(a => T.Fy(a, L[0])), f10: xs.map(a => T.Fy(a, L[1])), f15: xs.map(a => T.Fy(a, L[2])),
                ff: xs.map(a => T.Fy(a, Ff)), fr: xs.map(a => T.Fy(a, Fr)), mf: xs.map(a => T.Fy(a, Ff) / Ff), mr: xs.map(a => T.Fy(a, Fr) / Fr) };
  const out = {
    fz_f: Ff, fz_r: Fr,
    c_alpha_f: T.Ca(Ff) * RAD, c_alpha_r: T.Ca(Fr) * RAD,                         // 정지 바퀴 하중의 코너링 강성 [N/deg]
    mu_f: T.mu(Ff), mu_r: T.mu(Fr), a_pk_f: pf.a, a_pk_r: pr.a, a_pk0: p0.a,       // μ · 최대 횡력 슬립각 [deg]
    fy_pk_f: pf.F, fy_pk_r: pr.F, fy_pk0: p0.F,                                     // 최대 횡력 [N]
    fy_p: T.Fy(I.a_p, I.fz_p), mu_p: T.Fy(I.a_p, I.fz_p) / I.fz_p,                  // 탐침 (슬립각 a_p, 하중 fz_p)
    fy_inf: I.te === 0 ? T.mu(I.fz0) * I.fz0 * Math.sin(I.tc * Math.PI / 2) : NaN,  // E = 0 일 때 큰 슬립각 끝 값 [N]
    tau_60: I.relax / (60 / 3.6),                                                    // 60 km/h 에서 이완 시간 상수 [s]
    mu_o: I.mu, mu_s_o: I.mu_s || 0, fz0_o: I.fz0, ca0_o: I.ca0, cn_o: I.cn, tc_o: I.tc, te_o: I.te, relax_o: I.relax,   // 대시보드 반영 (모델 값 그대로)
  };
  return { out, x: { d: xs }, sig };
}
`
};
