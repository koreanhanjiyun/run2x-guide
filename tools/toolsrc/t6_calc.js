// ================================================================
// 도구 6 조향 (3D 기구학) — 계산 코드. 엔진 K3D 는 위 (공통)
// ================================================================
// 입력 I : 앞축 하드포인트 8 점 (f_…), 윤거 tf · 하중 반경 r_load · 정적 캠버 camber_f · 토 toe_f, 휠베이스 L, 앞 하중 비율 fr,
//          랙 이송비 rack_c [mm/rev], 랙 최대 이송 rack_travel [mm, 가운데에서 한쪽], 기준 조향각 d_ref [deg, 두 바퀴 평균]
// 조향: 타이로드 안쪽 점을 y 로 s 만큼 옮기고 (휠 트래블 0 = 바퀴 중심 높이 고정) 업라이트 자세를 풂. 바퀴 조향각 = 지면에서 본 진행 방향 변화.
//   오른쪽 바퀴 (거울) 의 조향각 (랙 s) = −(왼쪽 바퀴, 랙 −s). 조향각 + = 위에서 반시계 (왼쪽 선회)
// 결과: 조향비 = 핸들 각 ÷ 두 바퀴 평균 조향각 (s → 0),  핸들 각 = s ÷ rack_c × 360
//   애커먼 % = (δ안 − δ바깥) ÷ (δ안,완전 − δ바깥) × 100,  완전: cot δ바깥 − cot δ안 = 2 y_G ÷ L  (y_G = 킹핀축이 지면과 만나는 y)
//   최소 회전 반경 (CG 경로, 아주 느리게): 자전거 등가 cot δe = (cot δ안 + cot δ바깥) ÷ 2 → 뒤축 가운데 R = L cot δe, CG = √(R² + (L × 앞 무게 몫)²), 바깥 앞바퀴 = √((R + t/2)² + L²)
//   유효 너클암 = 킹핀축 둘레 타이로드 힘의 팔 = |((TO − LO) × u_타이로드) · k|,  너클암 (직선) = 킹핀축에서 TO 까지 거리 |k × (TO − LO)|
//   최대 조향에서 캠버 (차체 기준) · 잭킹 (접지점이 차체에 대해 내려가는 양 = 그 바퀴에서 차체가 들리는 양, 바퀴 중심 높이 고정일 때)
function calc(I) {
  if (!(I.rack_c > 0) || !(I.rack_travel > 0) || !(I.L > 0)) throw new Error('랙 이송비 · 최대 이송 · 휠베이스는 0 보다 커야 합니다.');
  const A = K3D.axle(I, 'f', I.tf, I.r_load, I.camber_f, I.toe_f), X0 = K3D.pose(A, 0, 0), D = K3D.D;
  const { sub, cross, dot, norm, unit, mul, add } = K3D;
  const k = X0.kp, tg = -X0.LO[2] / k[2], yG = X0.LO[1] + k[1] * tg;
  const ut = unit(sub(X0.TO, X0.TI)), r0 = sub(X0.TO, X0.LO);
  const kn = Math.abs(dot(cross(r0, ut), k)), arm = norm(cross(k, r0)), Ltr = norm(sub(X0.TO, X0.TI));
  // 왼쪽 바퀴 랙 s → 자세 (앞 결과를 시작값으로)
  // 랙 s 까지 2 mm 씩 이어 풂 (뉴턴 시작값 = 앞 자세). 기구가 못 가는 이송이면 NaN
  const L1 = s => { const n = Math.max(1, Math.ceil(Math.abs(s) / 2)); let q = null, X;
    try { for (let j = 1; j <= n; j++) { X = K3D.pose(A, 0, s * j / n, q); q = X.q; } } catch (e) { return { d: NaN, cam: NaN, jack: NaN }; }
    return { d: X.head - X0.head, cam: X.cam, jack: X0.CP[2] - X.CP[2] }; };
  const both = s => { const l = L1(s), rr = L1(-s); return { l: l.d, r: -rr.d, lc: l.cam, rc: rr.cam, lj: l.jack, rj: rr.jack }; };
  const ds = 0.01, c0 = both(ds), dm = (c0.l + c0.r) / 2, ratio = (ds / I.rack_c * 360) / Math.abs(dm);
  const turnLeft = dm > 0;
  // 안쪽 · 바깥 (왼쪽 선회면 왼쪽 바퀴가 안쪽), 캠버 · 잭킹
  const io = s => { const w = both(turnLeft ? s : -s);   // 늘 왼쪽 선회 쪽으로
    return { i: Math.abs(w.l), o: Math.abs(w.r), ci: w.lc, co: w.rc, ji: w.lj, jo: w.rj }; };
  const cot = x => 1 / Math.tan(x * D), acotd = x => Math.atan2(1, x) / D;
  const ideal = o => acotd(cot(o) - 2 * yG / I.L), ack = q => (q.i - q.o) / (ideal(q.o) - q.o) * 100;
  let lo = 0, hi = I.rack_travel * 3; const mean = s => { const q = io(s); return (q.i + q.o) / 2; };
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (mean(m) < I.d_ref) lo = m; else hi = m; }   // 못 가는 이송 (NaN) 은 '넘음' 쪽
  const qr = io((lo + hi) / 2), qm = io(I.rack_travel);
  if (!isFinite(qm.i) || !isFinite(qm.o)) throw new Error('랙 최대 이송까지 기구가 움직이지 못합니다 (타이로드 · 너클암이 일직선을 넘음). 랙 최대 이송을 줄이세요.');
  const Rr = q => I.L / 1000 / Math.tan(acotd((cot(q.i) + cot(q.o)) / 2) * D), lr = I.L / 1000 * I.fr / 100, R0 = Rr(qm);
  const m5 = K3D.metrics(A);
  const xs = [], sg = { di: [], dout: [], dideal: [], ack: [], ci: [], co: [], ji: [], jo: [] };
  for (let j = 0; j <= 40; j++) { const s = I.rack_travel * j / 40, q = io(s); xs.push(s / I.rack_c * 360);
    sg.di.push(q.i); sg.dout.push(q.o); sg.dideal.push(j ? ideal(q.o) : 0); sg.ack.push(j ? ack(q) : NaN); sg.ci.push(q.ci); sg.co.push(q.co); sg.ji.push(q.ji); sg.jo.push(q.jo); }
  const out = {
    tie_l: Ltr, arm_l: arm, knuckle_l: kn, steer_ratio: ratio, hw_max: I.rack_travel / I.rack_c * 360,
    d_in_ref: qr.i, d_out_ref: qr.o, d_ideal_ref: ideal(qr.o), ackermann: ack(qr),
    delta_max: qm.i, d_out_max: qm.o, ack_max: ack(qm), r_axle: R0, rmin: Math.sqrt(R0 * R0 + lr * lr), r_outer: Math.sqrt((R0 + I.tf / 2000) ** 2 + (I.L / 1000) ** 2),
    cam_in_max: qm.ci, cam_out_max: qm.co, jack_in: qm.ji, jack_out: qm.jo, y_g: yG,
    kpi_o: m5.kpi, caster_o: m5.caster, trail_o: m5.trail, scrub_o: m5.scrub, bs_o: m5.bs,
    rack_c_o: I.rack_c, rack_travel_o: I.rack_travel,
  };
  return { out, x: { d: xs }, sig: sg };
}
