/* ============================================================
   도구 6 조향 (간이판: 윗면 2D 링크) — docs/TOOLS-PLAN.md 5절
   - 랙 · 타이로드 · 너클암 평면 링크로 바퀴 조향각(안 · 바깥), 조향비, 애커먼 %, 최대 조향각, 최소 회전 반경(CG 경로 · 바깥 앞바퀴)
   - 3D 킹핀축 · 범프 스티어 · 롤 스티어 · 슬립 반영은 5번 3D 엔진과 함께 나중에
   - 대시보드로 steer_ratio · ackermann · delta_max · rmin · knuckle_l 을 보내면 도구 2 가 받아 씀 (rmin = 주행선 제약, steer_ratio = 차량 모델 2 · 3 핸들 각)
   ============================================================ */
const M6TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '위에서 본 왼쪽 바퀴 기준 점입니다(오른쪽은 거울). 킹핀은 중심선에서 y, 너클암 끝은 킹핀에서 (앞 +, 바깥 +), 랙 볼은 차 기준(앞 +, 중심선에서). 너클암이 차축 뒤면 x 가 − 입니다.'],
  ['#wb #wbout', '결과', '링크 길이 · 조향비, 기준 조향각(두 바퀴 평균)에서 안 · 바깥 각과 애커먼 %, 최대 이송에서 최대 조향각 · 최소 회전 반경입니다. 최소 회전 반경은 아주 느릴 때(슬립 없음) 자전거 등가 각으로 셈합니다.'],
  ['#wb .wb-sig', '조향각 곡선', '가로축 = 핸들 각. 안쪽 · 바깥 바퀴 각과 완전 애커먼일 때 안쪽 각, 애커먼 % 입니다. 작은 각에서는 애커먼 % 가 크게 흔들립니다.'],
];
const T6G = {car:'차', geo:'링크 (위에서, 왼쪽 바퀴, mm)', rack:'랙 · 기준'};
WB_TOOLS['6'] = {
  no:'6', stage:'P3-4~5', name:'조향 (윗면 2D 간이판)',
  x:{n:'핸들 각', u:'°'},
  sweepFirst:'ay',
  inputs:[
    {k:'L', dk:'L', v:1550, d:0, g:T6G.car}, {k:'tf', dk:'tf', v:1200, d:0, g:T6G.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T6G.car},
    {k:'kp_y', n:'킹핀 y (중심선에서, 지면 높이)', u:'mm', v:560, d:0, g:T6G.geo}, {k:'ax', n:'너클암 끝 x (킹핀에서, 앞 +)', u:'mm', v:-70, d:1, g:T6G.geo},
    {k:'ay', n:'너클암 끝 y (킹핀에서, 바깥 +)', u:'mm', v:-15, d:1, g:T6G.geo}, {k:'rx', n:'랙 볼 x (차축에서, 앞 +)', u:'mm', v:-70, d:1, g:T6G.geo}, {k:'ry', n:'랙 볼 y (중심선에서)', u:'mm', v:200, d:1, g:T6G.geo},
    {k:'rack_c', dk:'rack_c', v:90, d:1, g:T6G.rack}, {k:'rack_travel', dk:'rack_travel', v:30, d:1, g:T6G.rack}, {k:'d_ref', n:'애커먼 기준 조향각 (두 바퀴 평균)', u:'°', v:15, d:1, g:T6G.rack},
  ],
  outputs:[
    {k:'tie_l', n:'타이로드 길이', u:'mm', d:1, g:'링크 · 조향비'}, {k:'arm_l', n:'너클암 (킹핀 ~ 볼 직선)', u:'mm', d:1, g:'링크 · 조향비'}, {k:'knuckle_l', dk:'knuckle_l', d:1, g:'링크 · 조향비'},
    {k:'steer_ratio', dk:'steer_ratio', d:2, g:'링크 · 조향비'}, {k:'hw_max', n:'핸들 최대 각 (한쪽)', u:'°', d:0, g:'링크 · 조향비'},
    {k:'d_in_ref', n:'안쪽 바퀴', u:'°', d:2, g:'기준 조향각에서'}, {k:'d_out_ref', n:'바깥 바퀴', u:'°', d:2, g:'기준 조향각에서'}, {k:'d_ideal_ref', n:'완전 애커먼 안쪽 각', u:'°', d:2, g:'기준 조향각에서'},
    {k:'ackermann', dk:'ackermann', d:1, g:'기준 조향각에서'},
    {k:'delta_max', dk:'delta_max', d:2, g:'최대 이송에서'}, {k:'d_out_max', n:'최대 조향각 (바깥 바퀴)', u:'°', d:2, g:'최대 이송에서'}, {k:'ack_max', n:'애커먼 (최대 이송)', u:'%', d:1, g:'최대 이송에서'},
    {k:'r_axle', n:'뒤축 가운데 회전 반경', u:'m', d:2, g:'최대 이송에서'}, {k:'rmin', dk:'rmin', d:2, g:'최대 이송에서'}, {k:'r_outer', n:'바깥 앞바퀴 회전 반경', u:'m', d:2, g:'최대 이송에서'},
    {k:'rack_c_o', dk:'rack_c', d:1, g:'링크 · 조향비', hide:true}, {k:'rack_travel_o', dk:'rack_travel', d:1, g:'링크 · 조향비', hide:true},
  ],
  sigs:[{k:'di', n:'안쪽 바퀴 조향각', u:'°', d:2}, {k:'dout', n:'바깥 바퀴 조향각', u:'°', d:2}, {k:'dideal', n:'완전 애커먼 안쪽 각', u:'°', d:2}, {k:'ack', n:'애커먼', u:'%', d:1}],
  sigOn:['di', 'dout', 'dideal'], xiStart:'end',
  tour: M6TOUR,
  verifyBase:{},
  verify: [
    {n:'조향비 (가운데) = 2π × 너클암 길이 ÷ 랙 이송비', I:{}, expect:{knuckle_l:70, steer_ratio:4.886922},
     src:'타이로드가 옆으로 곧고 너클암 수직 거리 70 mm → 작은 각에서 δ = s ÷ 70 [rad], 핸들 = s ÷ 90 × 360° → 조향비 = 360 × 70 ÷ (90 × 180/π) = 4.8869'},
    {n:'링크 길이 (너클암 끝 −70, −15 · 랙 볼 −70, 200 · 킹핀 560)', I:{}, expect:{tie_l:345, arm_l:71.589105},
     src:'타이로드 = |(−70, 545) − (−70, 200)| = 345 mm, 너클암 = √(70² + 15²) = 71.589 mm'},
    {n:'완전 애커먼 안쪽 각 · 최소 회전 반경 식 (링크로 구한 안쪽 27.1688° · 바깥 24.1895°)', I:{}, expect:{d_ideal_ref:17.700383, r_axle:3.235308, rmin:3.318023, r_outer:4.136676},
     src:'완전: cot δ안 = cot 14.5389° − 1120 ÷ 1550 → 17.7004°. 최대: cot δe = (cot 27.1688° + cot 24.1895°) ÷ 2 → 뒤축 반경 1.55 cot δe = 3.2353 m, CG = √(3.2353² + (1.55 × 0.475)²) = 3.3180 m, 바깥 앞바퀴 = √((3.2353 + 0.6)² + 1.55²) = 4.1367 m'},
    {n:'핸들 최대 각 = 랙 최대 이송 ÷ 이송비 × 360°', I:{rack_travel:30, rack_c:90}, expect:{hw_max:120},
     src:'30 ÷ 90 × 360 = 120°'}
  ],
  code: `// ================================================================
// 도구 6 조향 (간이판: 윗면 2D 링크) — 계산 코드
// ================================================================
// 입력 I : L · tf [mm], fr [%] (무게중심 앞뒤), 킹핀 y kp_y [mm] (중심선에서), 너클암 끝 (킹핀 기준) ax · ay [mm] (x 앞 +, y 바깥 +),
//          랙 안쪽 볼 (차 기준) rx [mm] (앞 +) · ry [mm] (중심선에서), 랙 이송비 rack_c [mm/rev], 랙 최대 이송 rack_travel [mm] (가운데에서 한쪽), 기준 조향각 d_ref [deg]
// 링크: 왼쪽 바퀴 킹핀 K = (0, kp_y), 너클암 끝 A₀ = K + (ax, ay), 랙 볼 B₀ = (rx, ry), 타이로드 길이 = |A₀ − B₀| (오른쪽은 거울)
//   랙이 왼쪽(+y)으로 s 움직이면 B = (rx, ±ry + s), 바퀴는 |A(δ) − B| = 타이로드 길이 가 되는 δ (직진에서 이어지는 해, 이분법)
//   조향각 + = 위에서 반시계 (왼쪽 선회)
// 결과: 조향비 = 핸들 각 ÷ 두 바퀴 평균 조향각 (s → 0),  핸들 각 = s ÷ rack_c × 360
//   애커먼 % = (δ_안 − δ_바깥) ÷ (δ_안,완전 − δ_바깥) × 100,  완전: cot δ_바깥 − cot δ_안 = 2 kp_y ÷ L (회전 중심이 뒤축 연장선)
//   최소 회전 반경 (CG 경로, 아주 느리게): 자전거 등가 cot δ_e = (cot δ_안 + cot δ_바깥) ÷ 2 → 뒤축 가운데 반경 R = L cot δ_e, CG = √(R² + (L × 앞 무게 몫)²)
//     바깥 앞바퀴 반경 = √((R + t/2)² + L²)
//   너클암 길이 = 킹핀에서 타이로드 선까지 수직 거리 (직진)
const D = Math.PI / 180;
function calc(I) {
  const kp = I.kp_y, A0 = [I.ax, kp + I.ay], Ltr = Math.hypot(A0[0] - I.rx, A0[1] - I.ry), arm = Math.hypot(I.ax, I.ay);
  if (!(arm > 0) || !(Ltr > 0) || !(I.rack_c > 0)) throw new Error('너클암 · 타이로드 길이와 랙 이송비는 0 보다 커야 합니다.');
  // 한쪽 바퀴: 킹핀 (0, sgn·kp), 너클암 (ax, sgn·ay), 랙 볼 (rx, sgn·ry + s)
  const wheel = (sgn, s) => { const K = [0, sgn * kp], a = [I.ax, sgn * I.ay], B = [I.rx, sgn * I.ry + s];
    const f = d => { const c = Math.cos(d), n = Math.sin(d), A = [K[0] + c * a[0] - n * a[1], K[1] + n * a[0] + c * a[1]]; return Math.hypot(A[0] - B[0], A[1] - B[1]) - Ltr; };
    // 직진(0)에서 양쪽으로 0.1° 씩 넓혀 가며 먼저 부호가 바뀌는 쪽 (직진에서 이어지는 가까운 해)
    const flo = f(0); if (Math.abs(flo) < 1e-12) return 0;
    let pp = [0, flo], pm = [0, flo];
    const bis = (x, y, fx) => { for (let i = 0; i < 80; i++) { const m = (x + y) / 2, fm = f(m); if (fx * fm <= 0) y = m; else { x = m; fx = fm; } } return (x + y) / 2 / D; };
    for (let k = 1; k <= 1200; k++) { const a2 = k * 0.1 * D, fp = f(a2), fm = f(-a2);
      if (pp[1] * fp <= 0) return bis(pp[0], a2, pp[1]); if (pm[1] * fm <= 0) return bis(pm[0], -a2, pm[1]); pp = [a2, fp]; pm = [-a2, fm]; }
    return NaN; };
  const both = s => { const l = wheel(1, s), r = wheel(-1, s); return { l, r }; };
  // 조향비 (가운데)
  const ds = 0.01, c0 = both(ds), dm = (c0.l + c0.r) / 2, hw = ds / I.rack_c * 360;
  const ratio = hw / Math.abs(dm);
  const turnLeft = dm > 0;                                   // 랙 +y 가 왼쪽 선회인가
  // 바깥 · 안쪽 (왼쪽 선회면 왼쪽 바퀴가 안쪽)
  const io = s => { const w = both(s); const i = Math.abs(turnLeft ? w.l : w.r), o = Math.abs(turnLeft ? w.r : w.l); return { i, o, s }; };
  const cot = x => 1 / Math.tan(x * D), acotd = x => Math.atan2(1, x) / D;
  const ideal = o => acotd(cot(o) - 2 * kp / I.L);           // 바깥 각 → 완전 애커먼 안쪽 각
  const ack = q => (q.i - q.o) / (ideal(q.o) - q.o) * 100;
  // 기준 조향각: 두 바퀴 평균이 d_ref 인 랙 이송
  let lo = 0, hi = Math.max(1, I.rack_travel * 3);
  const mean = s => { const q = io(s); return (q.i + q.o) / 2; };
  for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (mean(m) < I.d_ref) lo = m; else hi = m; }
  const qr = io((lo + hi) / 2), qm = io(I.rack_travel);
  const Rr = q => I.L / 1000 / Math.tan(acotd((cot(q.i) + cot(q.o)) / 2) * D);          // 뒤축 가운데 반경 [m]
  const lr = I.L / 1000 * I.fr / 100, R0 = Rr(qm);
  // 직진 너클암 길이: 킹핀 (0, kp) 에서 타이로드 선 (A₀ → B₀) 까지 수직 거리
  const ux = (I.rx - A0[0]) / Ltr, uy = (I.ry - A0[1]) / Ltr, kn = Math.abs((0 - A0[0]) * uy - (kp - A0[1]) * ux);
  // 그래프: 랙 이송 0 ~ 최대에서 안쪽 · 바깥 · 완전 애커먼 안쪽 각
  const xs = [], si = [], so = [], sid = [], sa = [];
  for (let k = 0; k <= 60; k++) { const s = I.rack_travel * k / 60, q = io(s); xs.push(s / I.rack_c * 360); si.push(q.i); so.push(q.o); sid.push(k ? ideal(q.o) : 0); sa.push(k ? ack(q) : NaN); }
  const out = {
    tie_l: Ltr, arm_l: arm, knuckle_l: kn, steer_ratio: ratio, hw_max: I.rack_travel / I.rack_c * 360,
    d_in_ref: qr.i, d_out_ref: qr.o, d_ideal_ref: ideal(qr.o), ackermann: ack(qr),
    delta_max: qm.i, d_out_max: qm.o, ack_max: ack(qm), r_axle: R0, rmin: Math.sqrt(R0 * R0 + lr * lr), r_outer: Math.sqrt((R0 + I.tf / 2000) ** 2 + (I.L / 1000) ** 2),
    rack_c_o: I.rack_c, rack_travel_o: I.rack_travel,
  };
  return { out, x: { d: xs }, sig: { di: si, dout: so, dideal: sid, ack: sa } };
}
`
};
