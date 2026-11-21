/* ============================================================
   도구 6 조향 (3D 기구학) — docs/TOOLS-PLAN.md 5절
   - 앞축 3D 하드포인트(도구 5 와 같은 8 점, 엔진 K3D)로 랙을 옮기며 업라이트 자세를 풀어 바퀴 조향각(안 · 바깥), 조향비, 애커먼 %, 최대 조향각, 최소 회전 반경,
     최대 조향에서 캠버 · 잭킹, 유효 너클암, 범프 스티어
   - 기본 점 = 2024 REF4 STEP (도구 5 의 K3D_HP). 킹핀이 수직 · 링크가 한 평면이면 예전 윗면 2D 결과와 같아짐 (검증표)
   - 대시보드로 steer_ratio · ackermann · delta_max · rmin · knuckle_l 을 보냄. [도구 2P 로 조향각 표 보내기] = 핸들 각 → 안 · 바깥 바퀴 각 곡선을 도구 2P 로 복사 (도구 2P 가 링크 기하로 계산)
   ============================================================ */
const M6TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, [도구 연결 ▾](도구 2P 로 조향각 표 보내기), [하드포인트 ▾](5 · 6 · 7 · 8 공통 하드포인트 파일), 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '앞 왼쪽 바퀴의 하드포인트 8 점(도구 5 와 같은 좌표: x 앞 +, y 바깥 +, z 지면 위 +)과 랙 이송비 · 최대 이송입니다. 타이로드 안쪽 점이 랙 끝(볼)입니다. 오른쪽 바퀴는 거울로 셈합니다.'],
  ['#wb #wbout', '결과', '링크 길이 · 조향비, 기준 조향각(두 바퀴 평균)에서 안 · 바깥 각과 애커먼 %, 최대 이송에서 최대 조향각 · 최소 회전 반경입니다. 최소 회전 반경은 아주 느릴 때(슬립 없음) 자전거 등가 각으로 셈합니다. 캠버 · 잭킹은 바퀴 중심 높이를 고정하고 본 값입니다.'],
  ['#wb .wb-sig', '조향각 곡선', '가로축 = 핸들 각. 안쪽 · 바깥 바퀴 각과 완전 애커먼일 때 안쪽 각, 애커먼 %, 조향에 따른 캠버 · 잭킹입니다. 작은 각에서는 애커먼 % 가 크게 흔들립니다.'],
];
const T6G = {car:'차 · 바퀴', rack:'랙 · 기준'};
/* 도구 2P 로 조향각 표 보내기: 결과 곡선 (핸들 각 0 ~ 최대, 41 점) 의 [핸들 각, 안쪽 바퀴, 바깥 바퀴] → 도구 2P 가 기하 조향각 · 최대 조향각 · 조향비 · 최소 회전 반경 · 핸들 속도에 씀 */
const t6Rows = () => { const R = WB.R; if(!R || !R.x || !R.sig) return []; return R.x.d.map((h, j) => [h, R.sig.di[j], R.sig.dout[j]]).filter(r => r.every(Number.isFinite) && r[0] > 0 && r[1] > 0 && r[2] > 0); };
/* 조향각 표를 계산할 때마다 저장 (도구 2P [도구 연결]이 가져감, 다른 도구로 보내기는 없음 2026-11-12) */
const t6RowsSave = () => { const rows = t6Rows(); if(rows.length < 2) return; try{ localStorage.setItem(wbMK('run2x.t6.rows'), JSON.stringify({rows:rows.map(r => r.map(x => +x.toFixed(4))), hw:WB.R.out.hw_max})); }catch(e){} };
const t6Pt = ['lf', 'lr', 'lo', 'uf', 'ur', 'uo', 'ti', 'to'];
WB_TOOLS['6'] = {
  share:'hp', no:'6', stage:'P3-4~5', name:'조향 (3D 기구학)',
  x:{n:'핸들 각', u:'°'},
  sweepFirst:'ay',
  inputs:[
    {k:'L', dk:'L', v:1550, d:0, g:T6G.car}, {k:'tf', dk:'tf', v:1200, d:0, g:T6G.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T6G.car},
    {k:'r_load', dk:'r_load', v:236, d:0, g:T6G.car}, {k:'camber_f', dk:'camber_f', v:-3, d:2, g:T6G.car}, {k:'toe_f', dk:'toe_f', v:0, d:2, g:T6G.car},
    {k:'rack_c', dk:'rack_c', v:90, d:1, g:T6G.rack}, {k:'rack_travel', dk:'rack_travel', v:31.74, d:2, g:T6G.rack}, {k:'d_ref', n:'애커먼 기준 조향각 (두 바퀴 평균)', u:'°', v:15, d:1, g:T6G.rack},
    ...k3dIn('f', t6Pt),
  ],
  outputs:[
    {k:'tie_l', n:'타이로드 길이', u:'mm', d:1, g:'링크 · 조향비'}, {k:'arm_l', n:'너클암 (킹핀축 ~ 타이로드 바깥 볼)', u:'mm', d:1, g:'링크 · 조향비'}, {k:'knuckle_l', dk:'knuckle_l', d:1, g:'링크 · 조향비'},
    {k:'steer_ratio', dk:'steer_ratio', d:2, g:'링크 · 조향비'}, {k:'hw_max', n:'핸들 최대 각 (한쪽)', u:'°', d:0, g:'링크 · 조향비'},
    {k:'d_in_ref', n:'안쪽 바퀴', u:'°', d:2, g:'기준 조향각에서'}, {k:'d_out_ref', n:'바깥 바퀴', u:'°', d:2, g:'기준 조향각에서'}, {k:'d_ideal_ref', n:'완전 애커먼 안쪽 각', u:'°', d:2, g:'기준 조향각에서'},
    {k:'ackermann', dk:'ackermann', d:1, g:'기준 조향각에서'},
    {k:'delta_max', dk:'delta_max', d:2, g:'최대 이송에서'}, {k:'d_out_max', n:'최대 조향각 (바깥 바퀴)', u:'°', d:2, g:'최대 이송에서'}, {k:'ack_max', n:'애커먼 (최대 이송)', u:'%', d:1, g:'최대 이송에서'},
    {k:'r_axle', n:'뒤축 가운데 회전 반경', u:'m', d:2, g:'최대 이송에서'}, {k:'rmin', dk:'rmin', d:2, g:'최대 이송에서'}, {k:'r_outer', n:'바깥 앞바퀴 회전 반경', u:'m', d:2, g:'최대 이송에서'},
    {k:'cam_in_max', n:'캠버 · 안쪽 바퀴 (차체 기준)', u:'°', d:2, g:'최대 이송에서'}, {k:'cam_out_max', n:'캠버 · 바깥 바퀴 (차체 기준)', u:'°', d:2, g:'최대 이송에서'},
    {k:'jack_in', n:'잭킹 · 안쪽 바퀴 (차체가 들림 +)', u:'mm', d:2, g:'최대 이송에서'}, {k:'jack_out', n:'잭킹 · 바깥 바퀴 (차체가 들림 +)', u:'mm', d:2, g:'최대 이송에서'},
    {k:'y_g', n:'킹핀축 지면 y (애커먼 기준 반 윤거)', u:'mm', d:1, g:'킹핀 (도구 5 와 같은 식)'}, {k:'kpi_o', n:'KPI', u:'°', d:2, g:'킹핀 (도구 5 와 같은 식)'}, {k:'caster_o', n:'캐스터', u:'°', d:2, g:'킹핀 (도구 5 와 같은 식)'},
    {k:'trail_o', n:'트레일', u:'mm', d:1, g:'킹핀 (도구 5 와 같은 식)'}, {k:'scrub_o', n:'스크럽', u:'mm', d:1, g:'킹핀 (도구 5 와 같은 식)'}, {k:'bs_o', n:'범프 스티어 (토인 +)', u:'°/mm', d:4, g:'킹핀 (도구 5 와 같은 식)'},
    {k:'rack_c_o', dk:'rack_c', d:1, g:'링크 · 조향비', hide:true}, {k:'rack_travel_o', dk:'rack_travel', d:1, g:'링크 · 조향비', hide:true},
  ],
  sigs:[{k:'di', n:'안쪽 바퀴 조향각', u:'°', d:2}, {k:'dout', n:'바깥 바퀴 조향각', u:'°', d:2}, {k:'dideal', n:'완전 애커먼 안쪽 각', u:'°', d:2}, {k:'ack', n:'애커먼', u:'%', d:1},
        {k:'ci', n:'캠버 · 안쪽 바퀴', u:'°', d:2}, {k:'co', n:'캠버 · 바깥 바퀴', u:'°', d:2}, {k:'ji', n:'잭킹 · 안쪽 바퀴', u:'mm', d:2}, {k:'jo', n:'잭킹 · 바깥 바퀴', u:'mm', d:2}],
  sigOn:['di', 'dout', 'dideal'], xiStart:'end', onResult(){ t6RowsSave(); },
  tour: M6TOUR,
  verifyBase:{camber_f:0, toe_f:0, tf:1200, r_load:236, L:1550, fr:47.5, rack_c:90, rack_travel:30, d_ref:15,
    f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uf_x:175, f_uf_y:200, f_uf_z:300, f_ur_x:-175, f_ur_y:200, f_ur_z:300, f_uo_x:0, f_uo_y:560, f_uo_z:300, f_ti_x:-70, f_ti_y:200, f_ti_z:200, f_to_x:-70, f_to_y:545, f_to_z:200},   // 검증 기본 = 킹핀 수직 · 링크 한 평면 (예전 윗면 2D 와 같은 꼴)
  verify: [
    {n:'조향비 (가운데) = 2π × 너클암 길이 ÷ 랙 이송비', I:{}, expect:{knuckle_l:70, steer_ratio:4.886922},
     src:'타이로드가 옆으로 곧고 너클암 수직 거리 70 mm → 작은 각에서 δ = s ÷ 70 [rad], 핸들 = s ÷ 90 × 360° → 조향비 = 360 × 70 ÷ (90 × 180/π) = 4.8869'},
    {n:'링크 길이 (너클암 끝 −70, −15 · 랙 볼 −70, 200 · 킹핀 560)', I:{}, expect:{tie_l:345, arm_l:71.589105},
     src:'타이로드 = |(−70, 545) − (−70, 200)| = 345 mm, 너클암 = √(70² + 15²) = 71.589 mm'},
    {n:'완전 애커먼 안쪽 각 · 최소 회전 반경 식 (링크로 구한 안쪽 27.1688° · 바깥 24.1895°)', I:{}, expect:{d_ideal_ref:17.700383, r_axle:3.235308, rmin:3.318023, r_outer:4.136676},
     src:'완전: cot δ안 = cot 14.5389° − 1120 ÷ 1550 → 17.7004°. 최대: cot δe = (cot 27.1688° + cot 24.1895°) ÷ 2 → 뒤축 반경 1.55 cot δe = 3.2353 m, CG = √(3.2353² + (1.55 × 0.475)²) = 3.3180 m, 바깥 앞바퀴 = √((3.2353 + 0.6)² + 1.55²) = 4.1367 m'},
    {n:'핸들 최대 각 = 랙 최대 이송 ÷ 이송비 × 360°', I:{rack_travel:30, rack_c:90}, expect:{hw_max:120},
     src:'30 ÷ 90 × 360 = 120°'},
    {n:'3D → 2D: 킹핀 수직 (볼조인트 y 560) · 링크가 z 200 한 평면이면 예전 윗면 2D 결과 그대로', I:{}, expect:{y_g:560, kpi_o:0, caster_o:0, cam_in_max:0, jack_in:0, d_in_ref:15.46114, d_out_ref:14.53886},
     src:'예전 2D 도구 (킹핀 y 560 · 너클암 끝 (−70, −15) · 랙 볼 (−70, 200)) 의 기준 조향각 안 · 바깥 값과 같음, 캐스터 · KPI 0 → 캠버 · 잭킹 0'},
    {n:'캐스터 8.53° (위 볼조인트 30 mm 뒤) · 랙 30 mm → 안 · 바깥 조향각 · 캠버 · 잭킹 (독립 구현 비교)', I:{f_uo_x:-30, f_uf_x:145, f_ur_x:-205}, expect:{caster_o:8.530766, trail_o:15, delta_max:38.363619, d_out_max:30.555175, cam_in_max:5.318763, cam_out_max:-4.360661, jack_in:-1.016123, jack_out:-0.683175},
     src:'캐스터 = atan(30 ÷ 200), 트레일 = 30 × 100 ÷ 200 = 15 mm. 조향 값은 업라이트 6 자유도 (회전 벡터 + 이동) 를 거리 구속 6 개 (팔 다리 4 · 타이로드 · 바퀴 중심 높이) 로 따로 푼 Python (scipy fsolve) 결과. 캐스터 + 이면 안쪽 바퀴 캠버 +, 바깥 −'}
  ],
  code: `// ================================================================
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
`
};
