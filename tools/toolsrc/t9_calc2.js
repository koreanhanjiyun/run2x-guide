// ================================================================
// 도구 9 냉각 계통 계산기 — 계산 코드
// ================================================================
// 입력 I : 왼쪽 입력 칸과 작업창 위 냉각 배치
//   t_amb 외기 [°C], v 평균 차속 [km/h], t_run 주행 시간 [s], t0 출발 온도 (모든 부품 · 냉각수) [°C]
//   L_m · L_i · L_b = 모터 손실 · 인버터 손실 · 축전지 발열 (주행 평균, 일정하다고 봄) [W]  (도구 2P [냉각] 탭에서 보낼 수 있음)
//   부품: 열용량 th_c · i_c · b_c [J/K], 냉각수까지 열저항 th_r · i_r · b_r [K/W], 공랭 hA (정지 · 60 km/h) m_ha0 · m_ha60 · i_ha0 · i_ha60 · b_ha · b_ha60 [W/K]
//   I.cool = {water: [{nodes: [{t, part, C, q, ins, UA, A, kd, fan}], Cc, hyd}], air: [{A, kd, fan, nodes: [{part, q, ins}]}]}   (배치 → 계산용, 작업창이 만듦; hyd 가 있으면 갈래 몫을 호스 압력 강하로 다시 풂, coolPrep)
//     water 점 = 위상 정렬 순서 (0 번 = 기준 라디), C = 그 점 냉각수 열용량 [J/K], q = 그 점을 지나는 흐름 몫, ins = [[앞 점, 흐름 몫]], Cc = 펌프 유량 × ρ × c_p [W/K]
//
// 모델 (도구 2P 와 같은 덩어리 열 모델, 회로를 블럭으로):
//   부품 p   : C_p dT_p/dt = L_p − (T_p − T_k) ÷ R_p (수랭, T_k = 그 부품 냉각수 점) · − G (T_p − T_공기) (공랭 덕트) · − hA(v) (T_p − T_외기) (어디에도 없음)
//   냉각수 점 k (잘 섞인 덩어리): C_k dT_k/dt = q_k C_c (T_섞임 − T_k) + (T_p − T_k) ÷ R_p,   T_섞임 = Σ f_j T_j ÷ Σ f_j (들어오는 호스 흐름 몫 f)
//   라디에이터 점: C_k dT_k/dt = q_k C_c (T_섞임 − T_k) − ε C_min (T_섞임 − T_외기)   (교차류 양쪽 안 섞임 ε-NTU, 라디마다 자기 공기 쪽 값, 그 라디 흐름 q_k C_c 기준)
//     공기 C_a = ρ_a c_pa (A k_d v + 팬 유량), 코어 풍속 = 공기 유량 ÷ A, UA = UA_5 (코어 풍속 ÷ 5 m/s)^0.6
//   공랭 덕트: 공기 C_a 가 블럭 순서대로 지나감, 부품 → 공기 G = C_a (1 − e^(−hA ÷ C_a)), 공기 온도 += G (T_p − T_공기) ÷ C_a (앞 부품 열로 데워짐)
//   방열 능력 h(v) = h_0 + (h_60 − h_0) × v ÷ 60 km/h
// 정상 상태 (dT/dt = 0, 바로 풂):
//   수랭 부품 점 T_k = T_섞임 + L_p ÷ (q_k C_c),  펌프 점 T_k = T_섞임,  라디 점 T_k = T_섞임 − a_k (T_섞임 − T_외기), a_k = ε C_min ÷ (q_k C_c)
//   → 회로마다 점 온도에 대한 1차 연립식 (가우스 소거). 부품 = 그 점 + L_p R_p
//   공랭 덕트 j 번째 부품: T_공기,입 = T_외기 + Σ(앞 부품 L) ÷ C_a,  T_p = T_공기,입 + L_p ÷ G_p.  어디에도 없는 부품: T_p = T_외기 + L_p ÷ hA(v)
// 도구 2P 등가값 (냉각수 한 덩어리로 줄임): 열용량 = 모든 수랭 회로 점 열용량 합,
//   UA_등가(v) = Q_냉각수 ÷ (T̄ − T_외기),  Q_냉각수 = 수랭 부품 손실 합,  T̄ = 수랭 부품이 붙은 점 온도를 손실로 가중 평균 (정지 · 60 km/h 에서 각각)
//   → 도구 2P 의 냉각수 온도 = T_외기 + Q ÷ UA = T̄, 부품 = T̄ + L R (수랭 부품이 하나면 이 계산기와 같음)

function calc(I) {
  const Ta = isFinite(I.t_amb) ? I.t_amb : 25, NET = coolPrep(I.cool && typeof I.cool === 'object' ? I.cool : { water: [], air: [] });
  const RHOA = 1.2, CPA = 1005;
  const L = { m: Math.max(0, I.L_m || 0), i: Math.max(0, I.L_i || 0), b: Math.max(0, I.L_b || 0) };
  const hV = (h0, h60, v) => Math.max(0, (h0 || 0) + ((Number.isFinite(h60) ? h60 : (h0 || 0)) - (h0 || 0)) * v / (60 / 3.6));
  const PR = { m: Math.max(1e-9, I.th_r), i: Math.max(1e-9, I.i_r), b: Math.max(1e-9, I.b_r) };       // 냉각수까지 열저항 [K/W]
  const PC = { m: Math.max(1, I.th_c), i: Math.max(1, I.i_c), b: Math.max(1, I.b_c) };              // 열용량 [J/K]
  const PH = { m: v => hV(I.m_ha0, I.m_ha60, v), i: v => hV(I.i_ha0, I.i_ha60, v), b: v => hV(I.b_ha, I.b_ha60, v) };   // 공랭 hA [W/K]
  const W = NET.water || [], A = NET.air || [];
  const where = {};   // 부품 → {w: 회로 번호, k: 점 번호} · {a: 덕트 번호, j: 덕트 안 순서}
  W.forEach((C, w) => C.nodes.forEach((nd, k) => { if (nd.part) where[nd.part] = { w, k }; }));
  A.forEach((D, a) => D.nodes.forEach((n, j) => { if (!where[n.part]) where[n.part] = { a, j }; }));
  // 라디 점 k 가 섞인 냉각수 열 중 외기로 버리는 몫 a_k = ε C_min ÷ F (coolRadA: 표 UA · 팬 켬 · 끔 포함, cool_net)
  const radA = (C, nd, v, fan) => coolRadA(C, nd, v, fan);
  const mixOf = (nd, c, k, N) => { const ins = nd.ins || [[(k - 1 + N) % N, 1]]; let fs = 0, ft = 0; ins.forEach(([j, f]) => { fs += f; ft += f * c[j]; }); return fs > 0 ? ft / fs : c[k]; };

  // ---------- 정상 상태 (차속 v [m/s])
  //   팬 켜는 온도가 있는 라디: 꺼진 채 풀어 라디로 들어오는 냉각수가 켜는 온도 이상이면 켠 채 다시 풂 (켠 정상 상태를 결과로)
  function steady(v) { let fan = W.map(C => C.nodes.map(coolFanOn0)), r = null;
    for (let it = 0; it < 4; it++) { r = steady1(v, fan); let ch = false;
      fan = fan.map((f, w) => f.map((on, k) => { const nd = W[w].nodes[k]; if (on || nd.t !== 'rad' || !r.cs[w]) return on; const Tin = mixOf(nd, r.cs[w], k, nd.ins ? W[w].nodes.length : W[w].nodes.length);
        if (Tin >= nd.fon) { ch = true; return true; } return false; }));
      if (!ch) break; }
    r.fan = fan; return r; }
  function steady1(v, fan) {
    const T = { m: NaN, i: NaN, b: NaN }, cs = [], rin = [];
    W.forEach((C, w) => { const N = C.nodes.length, M = C.nodes.map(() => new Array(N + 1).fill(0));   // M c = 오른쪽 (마지막 열)
      C.nodes.forEach((nd, k) => { const ins = nd.ins || [[(k - 1 + N) % N, 1]], fs = ins.reduce((a, [, f]) => a + f, 0);
        const a = nd.t === 'rad' ? radA(C, nd, v, fan[w][k]) : 0, Fk = (nd.q || 1) * C.Cc;
        // T_k − (1 − a) Σ (f_j ÷ fs) T_j = a T_외기 + (부품 손실 ÷ F)
        M[k][k] += 1; ins.forEach(([j, f]) => { M[k][j] -= (1 - a) * f / fs; });
        M[k][N] = a * Ta + (nd.part && Fk > 0 ? L[nd.part] / Fk : 0); });
      const c = gauss(M, N); cs.push(c); rin.push(c ? mixOf(C.nodes[0], c, 0, N) : NaN); });
    let Qw = 0, Sw = 0; const TA = {};
    A.forEach(D => coolAir(D, RHOA * CPA * Math.max(0, D.A * D.kd * v + D.fan), Ta, TA, L, p => PH[p](v), true));   // 공랭 덕트 정상 온도 (갈래 · 합침)
    for (const p of ['m', 'i', 'b']) { const wh = where[p];
      if (wh && wh.w != null) { const c = cs[wh.w]; const Tk = c ? c[wh.k] : NaN; T[p] = Tk + L[p] * PR[p]; Qw += L[p]; Sw += L[p] * Tk; }
      else if (wh && wh.a != null) T[p] = TA[p];
      else { const h = PH[p](v); T[p] = h > 0 ? Ta + L[p] / h : (L[p] > 0 ? Infinity : Ta); } }
    const Tbar = Qw > 0 ? Sw / Qw : NaN;
    return { T, cs, rin, Qw, Tbar, UA: Qw > 0 && isFinite(Tbar) ? (Tbar - Ta > 1e-12 ? Qw / (Tbar - Ta) : Infinity) : NaN };
  }
  // 가우스 소거 (부분 피벗). 풀 수 없으면 (외기로 버릴 길이 없음) null
  function gauss(M, N) { const a = M.map(r => r.slice());
    for (let c = 0; c < N; c++) { let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < 1e-12) return null; [a[c], a[p]] = [a[p], a[c]];
      for (let r = 0; r < N; r++) { if (r === c) continue; const f = a[r][c] / a[c][c]; if (f) for (let q = c; q <= N; q++) a[r][q] -= f * a[c][q]; } }
    return a.map((r, k) => r[N] / r[k]); }

  // ---------- 시간에 따라 (출발 온도에서 t_run 동안, 손실 · 차속 일정): 칸마다 지수 적분, 흐름 순서대로 (도구 2P 와 같은 방식)
  const toward = (T, Teq, k, dt) => Teq + (T - Teq) * Math.exp(-k * dt);
  const v0 = Math.max(0, I.v || 0) / 3.6, tEnd = Math.max(0, I.t_run || 0), t0 = isFinite(I.t0) ? I.t0 : Ta;
  const h = 0.25, nStep = Math.min(400000, Math.ceil(tEnd / h)), every = Math.max(1, Math.round(nStep / 600));
  const T = { m: t0, i: t0, b: t0 }, c = W.map(C => C.nodes.map(() => t0));
  const fanS = W.map(C => C.nodes.map(coolFanOn0)), aOf = (w, k) => radA(W[w], W[w].nodes[k], v0, fanS[w][k]);   // 팬 상태 (켜는 온도 · 히스테리시스)
  const aK = W.map((C, w) => C.nodes.map((nd, k) => nd.t === 'rad' ? aOf(w, k) : 0));
  const xs = [0], S = { tm: [t0], ti: [t0], tb: [t0], w1: [W[0] ? t0 : NaN], w2: [W[1] ? t0 : NaN], w3: [W[2] ? t0 : NaN] };
  const rinOf = w => W[w] ? mixOf(W[w].nodes[0], c[w], 0, W[w].nodes.length) : NaN;
  for (let s = 1; s <= nStep; s++) { const dt = Math.min(h, tEnd - (s - 1) * h);
    W.forEach((C, w) => { const N = C.nodes.length;
      for (let k = 0; k < N; k++) { const nd = C.nodes[k], mix = mixOf(nd, c[w], k, N), F = (nd.q || 1) * C.Cc;
        if (nd.t === 'rad') { const on = coolFanNext(nd, fanS[w][k], mix); if (on !== fanS[w][k]) { fanS[w][k] = on; aK[w][k] = aOf(w, k); }
          c[w][k] = toward(c[w][k], mix - aK[w][k] * (mix - Ta), F / coolC(nd), dt); continue; }
        const p = nd.part, G = p ? 1 / PR[p] : 0;
        c[w][k] = F + G > 0 ? toward(c[w][k], (F * mix + G * (p ? T[p] : 0)) / (F + G), (F + G) / coolC(nd), dt) : c[w][k]; } });
    for (const p of ['m', 'i', 'b']) { const wh = where[p];
      if (wh && wh.w != null) T[p] = toward(T[p], c[wh.w][wh.k] + L[p] * PR[p], 1 / (PR[p] * PC[p]), dt);
      else if (!wh) { const hh = PH[p](v0); T[p] = hh > 0 ? toward(T[p], Ta + L[p] / hh, hh / PC[p], dt) : T[p] + L[p] * dt / PC[p]; } }
    A.forEach(D => coolAir(D, RHOA * CPA * Math.max(0, D.A * D.kd * v0 + D.fan), Ta, T, L, p => PH[p](v0), false, dt, PC, null, toward));
    if (s % every === 0 || s === nStep) { xs.push(Math.min(tEnd, s * h)); S.tm.push(T.m); S.ti.push(T.i); S.tb.push(T.b); S.w1.push(rinOf(0)); S.w2.push(rinOf(1)); S.w3.push(rinOf(2)); } }

  const ss = steady(v0), s0 = steady(0), s60 = steady(60 / 3.6), r0 = ss.cs[0], fin = x => isFinite(x) ? x : NaN;
  const Lsum = L.m + L.i + L.b;
  const out = {
    s_tm: fin(ss.T.m), s_ti: fin(ss.T.i), s_tb: fin(ss.T.b),                         // 정상 온도 [°C] (평균 차속)
    s_win: W[0] ? fin(ss.rin[0]) : NaN, s_wout: W[0] && r0 ? fin(r0[0]) : NaN,         // 첫 수랭 회로 기준 라디 입구 (섞인 온도) · 출구 [°C]
    s_qw: ss.Qw, s_qa: Lsum - ss.Qw,                                                   // 냉각수로 · 공기로 바로 버리는 열 [W]
    e_tm: T.m, e_ti: T.i, e_tb: T.b, e_win: rinOf(0),                                  // 주행 시간 뒤 [°C]
    w_q: W.length ? W[0].Cc / (W[0].rcp || 4.18e6) * 60000 : NaN,   // 수랭 회로 1 유량 [L/min] (곡선 펌프면 풀린 값)
    q_cw: W.reduce((s, C) => s + C.nodes.reduce((a, nd) => a + coolC(nd), 0), 0),     // 냉각수 · 라디 금속 열용량 합 [J/K]
    q_ua0: s0.Qw > 0 ? fin(s0.UA) : NaN, q_ua60: s60.Qw > 0 ? fin(s60.UA) : NaN,       // 도구 2P 라디에이터 UA (정지 · 60 km/h) [W/K]
    n_w: W.length, n_a: A.length,
  };
  if (!W.length) out.q_cw = NaN;
  return { out, x: { d: xs }, sig: S };
}
