// ================================================================
// 도구 8 하중 산출 (3D) — 계산 코드. 엔진 K3D 는 위 (공통)
// ================================================================
// 입력 I : m [kg], fr [%], h · L · tf · tr [mm], lltd [%] 앞 횡하중 이동 배분 (도구 7), mu [-] 하중 경우 가속도 크기, cla [m²] · xcop [mm] · v_c [km/h] 다운포스,
//          nz [-] 수직 하중 배율 (범프 · 노면 충격), r_load [mm] · camber_f · r [deg] (바퀴 중심 · 접지점 자리),
//          축마다 하드포인트 8 점 + 푸시로드 팔 쪽 pa · 로커 쪽 pr (붙은 팔 pa_arm_f · r: 1 위 · 0 아래)
// 하중 경우 (Milliken 18 장 · 정상 상태, 바깥 = 왼쪽 바퀴 · 오른쪽 선회): 정지 s · 최대 선회 c (a_y = μ g) · 최대 제동 b (a_x = μ g) · 가속 a (뒤 구동 접지 한계) · 조합 x (마찰원 45°, 제동 + 선회)
//   축 하중 F_zf = n_z W_f + D_f + m a_x h ÷ L (감속 +), 바깥 바퀴 F_z = 축 ÷ 2 + m a_y h × (앞 LLTD ÷ t_f, 뒤 (1 − LLTD) ÷ t_r)
//   횡력 축 = m a_y × 무게 비, 바퀴 = 축 × F_z 비.  제동력 = m a_x × F_z ÷ ΣF_z (바깥 브레이크 → 접지점).  가속 a_x = μ (n_z W_r + D_r) ÷ (m (1 − μ h ÷ L)) (≤ μ g), 뒤 바퀴마다 m a_x ÷ 2 (안쪽 구동 → 바퀴 중심에 걸림)
// 부재력 (정지 자세 3D 정적 평형, 힘 + = 인장):
//   업라이트 6 식 (힘 · 모멘트) ← 미지수 6: 푸시로드가 안 붙은 팔의 두 다리 축력 2 (두 힘 부재), 푸시로드가 붙은 팔의 볼조인트 힘 3, 타이로드 (토 링크) 축력 1
//   푸시로드가 붙은 팔: 회전축 (안쪽 두 점) 둘레 모멘트 = 0 → 푸시로드 축력, 안쪽 두 점 힘 = 나머지 힘 · 모멘트 평형 (축 방향 몫은 반씩 나눔 — 부정정이라 가정)
function solveN(A, b) {
  const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < n + 1; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]);
}
function members(A, up, Fcp, Fwc) {
  const { sub, add, mul, cross, dot, unit, norm } = K3D, P = A.P, CP = A.CP0, WC = A.WC0;
  const tw = up ? ['lf', 'lr', 'lo'] : ['uf', 'ur', 'uo'], ar = up ? ['uf', 'ur', 'uo'] : ['lf', 'lr', 'lo'];
  const e1 = unit(sub(P[tw[0]], P[tw[2]])), e2 = unit(sub(P[tw[1]], P[tw[2]])), B2 = P[tw[2]], BA = P[ar[2]], et = unit(sub(P.ti, P.to));
  // 미지수 [l1, l2, Fx, Fy, Fz, t] 의 열: 힘 (3) · 원점 둘레 모멘트 (3)
  const col = (r, f) => f.concat(cross(r, f)), cols = [col(B2, e1), col(B2, e2), col(BA, [1, 0, 0]), col(BA, [0, 1, 0]), col(BA, [0, 0, 1]), col(P.to, et)];
  const ec = col(CP, Fcp), ew = col(WC, Fwc || [0, 0, 0]), ext = ec.map((v, i) => v + ew[i]), A6 = [0, 1, 2, 3, 4, 5].map(i => cols.map(c => c[i]));
  const x = solveN(A6, ext.map(v => -v)); if (!x) throw new Error('부재력을 정할 수 없습니다 (팔 · 타이로드 방향이 겹침).');
  const [l1, l2, , , , t] = x, FB = [x[2], x[3], x[4]];
  // 푸시로드가 붙은 팔
  const F0 = P[ar[0]], d = sub(P[ar[1]], F0), n = unit(d), ep = unit(sub(P.pr, P.pa));
  const den = dot(n, cross(sub(P.pa, F0), ep)); if (Math.abs(den) < 1e-9) throw new Error('푸시로드가 팔 회전축을 지나 축력을 정할 수 없습니다.');
  const p = dot(n, cross(sub(BA, F0), FB)) / den;
  const S = sub(FB, mul(ep, p)), Mv = sub(cross(sub(BA, F0), FB), cross(sub(P.pa, F0), mul(ep, p)));
  const dd = dot(d, d), f2 = add(mul(cross(Mv, d), 1 / dd), mul(d, dot(S, n) / (2 * norm(d)))), f1 = sub(S, f2);
  const r = { ti: t, pu: p, [tw[0]]: l1, [tw[1]]: l2, [ar[0]]: norm(f1), [ar[1]]: norm(f2), [tw[2]]: norm(add(mul(e1, l1), mul(e2, l2))), [ar[2]]: norm(FB) };
  return r;
}
const T8M = ['lf', 'lr', 'uf', 'ur', 'ti', 'pu', 'lo', 'uo'];
function calc(I) {
  const g = 9.81, RHO = 1.225, pos = (v, nm) => { if (!(v > 0)) throw new Error(nm + ' 는 0 보다 커야 합니다.'); return v; };
  const m = pos(I.m, '질량'), L = pos(I.L, '휠베이스') / 1000, h = Math.max(0, I.h) / 1000, fs = I.fr / 100, tf = pos(I.tf, '앞 윤거') / 1000, tr = pos(I.tr, '뒤 윤거') / 1000;
  const ld = I.lltd / 100, mu = pos(I.mu, '타이어 μ'), nz = pos(I.nz, '수직 하중 배율');
  const v = Math.max(0, I.v_c || 0) / 3.6, D = 0.5 * RHO * Math.max(0, I.cla || 0) * v * v, fa = isFinite(I.xcop) ? I.xcop / I.L : fs;
  const AF = K3D.axle(I, 'f', I.tf, I.r_load, I.camber_f, 0, ['pa', 'pr']), AR = K3D.axle(I, 'r', I.tr, I.r_load, I.camber_r, 0, ['pa', 'pr']);
  const upF = I.pa_arm_f === 1, upR = I.pa_arm_r === 1;
  const Wf = nz * m * g * fs + D * fa, Wr = nz * m * g * (1 - fs) + D * (1 - fa);
  const aa = Math.min(mu * g, mu * h / L < 1 ? mu * Wr / (m * (1 - mu * h / L)) : Infinity);       // 가속 (뒤 접지 한계)
  const cases = [['s', 0, 0, 0], ['c', mu, 0, 0], ['b', 0, mu, 0], ['a', 0, 0, aa / g], ['x', mu / Math.SQRT2, mu / Math.SQRT2, 0]];   // [키, a_y, a_x 제동, a_x 가속] [g]
  const out = {}, tab = {};
  for (const [k, ayg, axg, acg] of cases) {
    const ay = ayg * g, ax = axg * g - acg * g;                                                      // ax: 감속 +
    const Fzf = Wf + m * ax * h / L, Fzr = Wr - m * ax * h / L;
    const fo = Fzf / 2 + m * ay * h * ld / tf, ro = Fzr / 2 + m * ay * h * (1 - ld) / tr;
    const yo = m * ay * fs * fo / Fzf, yr = m * ay * (1 - fs) * ro / Fzr;
    const xo = axg > 0 ? m * axg * g * fo / (Fzf + Fzr) : 0, xr = axg > 0 ? m * axg * g * ro / (Fzf + Fzr) : 0, dr = acg > 0 ? m * acg * g / 2 : 0;
    const MF = members(AF, upF, [-xo, -yo, fo]), MR = members(AR, upR, [-xr, -yr, ro], [dr, 0, 0]);
    Object.assign(out, { [k + '_fz_f']: fo, [k + '_fy_f']: yo, [k + '_fx_f']: -xo, [k + '_fz_r']: ro, [k + '_fy_r']: yr, [k + '_fx_r']: dr - xr });
    for (const q of T8M) { out[k + '_f_' + q] = MF[q]; out[k + '_r_' + q] = MR[q]; }
    if (k === 'c') { out.c_fz_fi = Fzf - fo; out.c_fz_ri = Fzr - ro; }
    tab[k] = { F: MF, R: MR };
  }
  // 경우 중 절댓값 최대 (부호 그대로)
  for (const s of ['f', 'r']) for (const q of T8M) { let best = 0; for (const [k] of cases) { const v = out[k + '_' + s + '_' + q]; if (Math.abs(v) > Math.abs(best)) best = v; } out['e_' + s + '_' + q] = best; }
  for (const k in out) out[k] += 0;                                                                   // −0 → 0
  for (const k in tab) for (const s of ['F', 'R']) for (const q in tab[k][s]) tab[k][s][q] += 0;
  out.lift = out.c_fz_fi < 0 ? 1 : 0; out.a_acc = aa / g;
  return { out, tab: { cases: cases.map(c => c[0]), upF, upR, tab } };
}
