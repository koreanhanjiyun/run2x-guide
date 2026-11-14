// ================================================================
// 3D 서스 기구학 엔진 (도구 5 · 6 · 7 · 8 공통) — 더블 위시본, 왼쪽 바퀴 (오른쪽 = 거울)
// ================================================================
// 좌표 [mm]: x = 앞 +, y = 차 중심선에서 바깥 (왼쪽) +, z = 지면에서 위 +. x = 0 은 그 축의 바퀴 중심.
// 점 (축 s = f · r): 아래 팔 안쪽 앞 LF · 뒤 LR, 바깥 (볼조인트) LO, 위 팔 UF · UR · UO, 타이로드 (뒤는 토 링크) 안쪽 TI · 바깥 TO
//   입력 이름 = s_점_x · s_점_y · s_점_z (예: f_lf_x). 바퀴: 윤거 t (정지 접지점 y = t/2, z = 0), 하중 반경 r (접지점 → 바퀴 중심),
//   정적 캠버 (위가 안쪽이면 −) · 정적 토 (토인 +) [deg]
// 풀이: 아래 팔 각 θL (LF–LR 축 둘레), 위 팔 각 θU (UF–UR 축 둘레), 업라이트 킹핀 둘레 각 ψ 를 미지수로
//   ① |UO − LO| = 처음 길이 (업라이트 강체)  ② |TO − (TI + 랙 이동)| = 타이로드 길이  ③ 바퀴 중심 z = 처음 + 휠 트래블
//   를 뉴턴법 (수치 야코비안) 으로 풂. 업라이트 위 점 P → LO + R (P₀ − LO₀),  R = (킹핀축 둘레 ψ) ∘ (킹핀축 방향을 맞추는 최소 회전)
// 순간 운동: 트래블 ±0.01 mm 중앙 차분으로 바퀴 중심 속도 · 업라이트 각속도 ω = ½ Σ eᵢ × ėᵢ → 업라이트에 붙은 접지점 속도 v = v_WC + ω × (CP − WC),
//   정면 순간중심 = CP − (0, v_z/ω_x, −v_y/ω_x),  롤센터 (대칭) = 접지점 → 순간중심 선이 y = 0 과 만나는 높이 = CP_z + CP_y v_y ÷ v_z
//   측면: 앞 안티다이브 tanθ = v_x ÷ v_z (접지점 경로, 바깥 브레이크), 뒤 안티리프트 tanθ = −v_x ÷ v_z, 뒤 안티스쿼트 tanθ = −v_x,WC ÷ v_z,WC (안쪽 구동)
const K3D = (() => {
  const D = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => Math.sqrt(dot(a, a)), unit = a => mul(a, 1 / norm(a));
  const rot = (v, k, th) => { const c = Math.cos(th), s = Math.sin(th); return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))); };
  const rotAbout = (P, O, k, th) => add(O, rot(sub(P, O), k, th));
  const PTS = ['lf', 'lr', 'lo', 'uf', 'ur', 'uo', 'ti', 'to'];
  // 입력 → 축 하드포인트 · 바퀴. ex = 같은 꼴의 덧점 (예: 푸시로드 pa · pr · 로커 rp · dr · db), 없으면 무시
  function axle(I, s, t, r, cam, toe, ex) {
    const P = {}; for (const n of PTS.concat(ex || [])) { const k = s + '_' + n; P[n] = [+I[k + '_x'], +I[k + '_y'], +I[k + '_z']];
      if (!P[n].every(isFinite)) throw new Error(k + ' 좌표가 비었습니다.'); }
    if (!(t > 0) || !(r > 0)) throw new Error('윤거 · 하중 반경은 0 보다 커야 합니다.');
    const c = (cam || 0) * D, q = (toe || 0) * D;
    // 바퀴 회전축 a (바깥 +): 캠버 − (위가 안쪽) → a_z = +sin(−캠버), 토인 → a_x = +sin(토)
    const a = unit([Math.sin(q) * Math.cos(c), Math.cos(q) * Math.cos(c), -Math.sin(c)]);
    const CP = [0, t / 2, 0], dn = unit(add([0, 0, -1], mul(a, a[2])));      // 바퀴 면 안 아래 방향
    const WC = sub(CP, mul(dn, r / -dn[2]));                                      // 바퀴 중심 높이 = r (캠버가 있으면 바퀴 면을 따라)
    const rw = norm(sub(WC, CP));
    return { P, a0: a, CP0: CP, WC0: WC, rw, t };
  }
  // 한 자세 풀이: sz = 바퀴 중심 위로 [mm] (차체 기준), rk = 랙 (타이로드 안쪽 점) y 이동 [mm]
  function pose(A, sz, rk, q0) {
    const P = A.P, kL = unit(sub(P.lr, P.lf)), kU = unit(sub(P.ur, P.uf)), d0 = norm(sub(P.uo, P.lo));
    const TI = add(P.ti, [0, rk || 0, 0]), Lt = norm(sub(P.to, P.ti)), e0 = unit(sub(P.uo, P.lo));
    const body = q => { const LO = rotAbout(P.lo, P.lf, kL, q[0]), UO = rotAbout(P.uo, P.uf, kU, q[1]), e = unit(sub(UO, LO));
      // 최소 회전 e0 → e, 다음 킹핀축 둘레 ψ
      const ax = cross(e0, e), sn = norm(ax), cs = dot(e0, e), R1 = v => sn < 1e-14 ? v : rot(v, mul(ax, 1 / sn), Math.atan2(sn, cs));
      const T = p => add(LO, rot(R1(sub(p, P.lo)), e, q[2]));
      return { LO, UO, T, e }; };
    const res = q => { const B = body(q); return [norm(sub(B.UO, B.LO)) - d0, norm(sub(B.T(P.to), TI)) - Lt, B.T(A.WC0)[2] - A.WC0[2] - sz]; };
    let q = q0 ? q0.slice() : [0, 0, 0];
    for (let it = 0; it < 40; it++) {
      const f = res(q); if (Math.abs(f[0]) + Math.abs(f[1]) + Math.abs(f[2]) < 1e-10) break;
      const J = [[], [], []], h = 1e-7;
      for (let j = 0; j < 3; j++) { const qp = q.slice(), qm = q.slice(); qp[j] += h; qm[j] -= h; const fp = res(qp), fm = res(qm); for (let i = 0; i < 3; i++) J[i][j] = (fp[i] - fm[i]) / (2 * h); }
      const dq = solve3(J, f.map(x => -x)); if (!dq) throw new Error('기구 자세를 풀 수 없습니다 (점 배치 · 트래블 · 랙 이동을 확인하세요).');
      q = add(q, dq);
      if (it === 39) throw new Error('기구 자세가 수렴하지 않습니다 (트래블 · 랙 이동이 너무 큼).');
    }
    const B = body(q), a = unit(sub(B.T(add(A.WC0, A.a0)), B.T(A.WC0))), WC = B.T(A.WC0);
    const dn = unit(add([0, 0, -1], mul(a, a[2]))), CP = add(WC, mul(dn, A.rw));
    return { q, LO: B.LO, UO: B.UO, TO: B.T(P.to), TI, WC, CP, a, T: B.T, kp: B.e,
      cam: -Math.asin(a[2]) / D, head: Math.atan2(-a[0], a[1]) / D };       // 캠버 (위가 안쪽 −) · 진행 방향 (왼쪽으로 +)
  }
  function solve3(A, b) {
    const M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < 3; c++) { let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-14) return null; [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; } }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  }
  // 업라이트 직교 3 축 (각속도 계산용)
  const triad = X => { const e1 = unit(sub(X.UO, X.LO)), e2 = unit(cross(e1, sub(X.TO, X.LO))); return [e1, e2, cross(e1, e2)]; };
  // 정지 자세 둘레 순간 운동 · 기하 값
  function metrics(A, sz0, rk) {
    const h = 0.01, X0 = pose(A, sz0 || 0, rk), Xp = pose(A, (sz0 || 0) + h, rk, X0.q), Xm = pose(A, (sz0 || 0) - h, rk, X0.q);
    const vw = mul(sub(Xp.WC, Xm.WC), 1 / (2 * h));
    const tp = triad(Xp), tm = triad(Xm), t0 = triad(X0);
    let w = [0, 0, 0]; for (let i = 0; i < 3; i++) w = add(w, cross(t0[i], mul(sub(tp[i], tm[i]), 1 / (2 * h))));
    w = mul(w, 0.5);                                                                     // [rad/mm]
    const v = add(vw, cross(w, sub(X0.CP, X0.WC)));                                    // 업라이트에 붙은 접지점 (바퀴가 업라이트와 함께 도는 점) 속도
    const CP = X0.CP, k = X0.kp;
    const fin = (x, lim) => Math.abs(x) > lim ? NaN : x;
    const icy = Math.abs(w[0]) > 1e-12 ? CP[1] - v[2] / w[0] : NaN, icz = Math.abs(w[0]) > 1e-12 ? CP[2] + v[1] / w[0] : NaN;
    const icx = Math.abs(w[1]) > 1e-12 ? CP[0] + v[2] / w[1] : NaN, icz2 = Math.abs(w[1]) > 1e-12 ? CP[2] - v[0] / w[1] : NaN;
    const rc = CP[2] + CP[1] * v[1] / v[2];
    // 킹핀축 지면 교점 G
    const tg = -X0.LO[2] / k[2], G = add(X0.LO, mul(k, tg));
    return { X: X0, v, vw, w, icy: fin(icy, 1e6), icz: fin(icz, 1e6), icx: fin(icx, 1e6), icz_sv: fin(icz2, 1e6), rc,
      fvsa: Math.abs(w[0]) > 1e-12 ? v[2] / w[0] : Infinity, svsa: Math.abs(w[1]) > 1e-12 ? -v[2] / w[1] : Infinity,
      cgb: -w[0] / D,                                                                 // 범프 캠버 게인 [deg/mm] (차체 기준, = −ω_x)
      bs: -(Xp.head - Xm.head) / (2 * h),                                             // 범프 스티어 [deg/mm] (토인 +)
      kpi: Math.atan2(-k[1], k[2]) / D, caster: Math.atan2(-k[0], k[2]) / D, scrub: CP[1] - G[1], trail: G[0] - CP[0],
      kpo: (() => { const s2 = (X0.WC[2] - X0.LO[2]) / k[2], Q = add(X0.LO, mul(k, s2)); return X0.WC[1] - Q[1]; })() };   // 바퀴 중심 높이 킹핀 옵셋 (정면)
  }
  const plain = X => { const o = {}; for (const k in X) if (typeof X[k] !== 'function') o[k] = X[k]; return o; };   // 작업자 → 화면으로 보낼 때 (함수 빼기)
  return { plain, D, add, sub, mul, dot, cross, norm, unit, rot, rotAbout, axle, pose, metrics, solve3, PTS };
})();
