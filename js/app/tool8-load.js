/* ============================================================
   도구 8 하중 산출 (간이판) — docs/TOOLS-PLAN.md 5절
   - 정상 상태 하중 경우 4 개 (정지 · 최대 선회 · 최대 제동 · 조합) 의 바퀴 접지력 (F_z · F_y · F_x, 바깥 앞 · 뒤 바퀴)
   - 앞 바깥 바퀴의 정면 2D 부재력: 아래 팔 축력, 푸시로드 축력 (위 팔에 붙음), 위 볼조인트 힘, 위 팔 안쪽 반력
   - 기본 정면 점 = 2024 REF4 STEP 의 앞 왼쪽 로드엔드 볼 중심 (지면 = 타이어 아래 끝), 하중 이동 배분 = 도구 7 기본 결과 48.7 %
   - 나중에: 3D (A 암 두 다리 · 타이로드 · 종력), 범프 · 동적 하중 (수직 배율로만 대신), 뒤 서스 부재력
   ============================================================ */
function t8Fig(I, R){ if(!R || !R.geo) return ''; const G = R.geo, o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  const W = 700, H = 420, sc = 0.62, ox = 40, oy = H - 34, X = y => ox + y*sc, Y = z => oy - z*sc;
  const ln = (A, B, c, w, lab, up) => { const mx = (X(A[0]) + X(B[0])) / 2, my = (Y(A[1]) + Y(B[1])) / 2;
    return `<line x1="${X(A[0]).toFixed(1)}" y1="${Y(A[1]).toFixed(1)}" x2="${X(B[0]).toFixed(1)}" y2="${Y(B[1]).toFixed(1)}" stroke="${c}" stroke-width="${w}"/>${lab ? `<text x="${mx.toFixed(1)}" y="${(my + (up ? -8 : 14)).toFixed(1)}" text-anchor="middle" class="t5-tx b" style="font-size:13px">${lab}</text>` : ''}`; };
  const tc = v => v >= 0 ? '#1d5f9a' : '#c2410c', tl = v => `${f(Math.abs(v), 0)} N ${v >= 0 ? '인장' : '압축'}`;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="t5-svg" role="img" aria-label="앞 바깥 바퀴 정면 부재력 (최대 선회)"><line x1="0" x2="${W}" y1="${oy}" y2="${oy}" stroke="#8a8f99"/>
    <line x1="${X(0)}" x2="${X(0)}" y1="10" y2="${oy}" stroke="#b9bec8" stroke-dasharray="3 4"/><text x="${X(0) + 4}" y="20" class="t5-tx" style="font-size:12px">중심선</text>`;
  s += ln(G.Li, G.Lo, tc(o.c_fl), 3, '아래 팔 ' + tl(o.c_fl), false) + ln(G.Ui, G.Uo, '#5f6973', 3, '', true) + ln(G.Pa, G.Pr, tc(o.c_fp), 3, '푸시로드 ' + tl(o.c_fp), true) + ln(G.Lo, G.Uo, '#26303c', 2, '', false);
  [G.Li, G.Lo, G.Ui, G.Uo, G.Pa, G.Pr].forEach(P => { s += `<circle cx="${X(P[0]).toFixed(1)}" cy="${Y(P[1]).toFixed(1)}" r="3.5" fill="#fff" stroke="#26303c" stroke-width="1.5"/>`; });
  const c = [X(G.C[0]), oy], kz = 0.03, kx = 0.03;
  s += `<line x1="${c[0]}" y1="${oy}" x2="${c[0]}" y2="${(oy - o.c_fz_f * kz).toFixed(1)}" stroke="#2e7d32" stroke-width="2.5"/><line x1="${c[0]}" y1="${oy}" x2="${(c[0] - o.c_fy_f * kx).toFixed(1)}" y2="${oy}" stroke="#2e7d32" stroke-width="2.5"/>
    <text x="${c[0] + 6}" y="${(oy - o.c_fz_f * kz).toFixed(1)}" class="t5-tx" style="font-size:13px">F<tspan baseline-shift="sub">z</tspan> ${f(o.c_fz_f, 0)} N</text><text x="${(c[0] - o.c_fy_f * kx).toFixed(1)}" y="${oy + 16}" class="t5-tx" style="font-size:13px" text-anchor="middle">F<tspan baseline-shift="sub">y</tspan> ${f(o.c_fy_f, 0)} N</text></svg>`;
  return `<div class="t5-figs"><figure class="t5-fig" style="max-width:760px"><figcaption>앞 바깥 바퀴 · 최대 선회 (a<sub>y</sub> = ${f(I.mu, 2)} g)</figcaption>${s}</figure></div>
    <p class="muted t5-note">파랑 = 인장, 주황 = 압축, 회색 = 위 팔 (푸시로드가 붙어 세 힘 부재), 초록 = 접지력. 정면 성분만 (A 암 두 다리 합), 오른쪽 절반, 같은 축척.</p>`; }
const M8TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '차(질량 · 무게중심 · 윤거 · 하중 이동 배분 · 타이어 μ · 다운포스 · 수직 배율)와 앞 서스 정면 점(아래 · 위 팔 안쪽 · 바깥, 푸시로드 두 끝)입니다. 정면 점은 도구 5 와 같은 좌표(y 바깥 +, z 지면에서 위 +)입니다.'],
  ['#wb #wbmain', '정면 부재력', '최대 선회일 때 앞 바깥 바퀴의 팔 · 푸시로드 힘을 그립니다.'],
  ['#wb #wbout', '결과', '하중 경우마다 앞 · 뒤 바깥 바퀴 접지력(F_z · F_y · F_x)과 앞 바깥 바퀴 부재력(아래 팔 · 푸시로드 축력, 위 볼조인트 · 위 팔 안쪽 반력)입니다. 축력 + = 인장, − = 압축.'],
];
const T8G = {car:'차 (1번 · 7번 도구)', f:'앞 정면 점 (y 바깥 +, z 위 +)'};
const t8P = [['l_yi', '아래 팔 안쪽 y', 212.7], ['l_zi', '아래 팔 안쪽 z', 131.3], ['l_yo', '아래 팔 바깥 y (볼조인트)', 561.6], ['l_zo', '아래 팔 바깥 z', 151.2],
             ['u_yi', '위 팔 안쪽 y', 246.7], ['u_zi', '위 팔 안쪽 z', 288.0], ['u_yo', '위 팔 바깥 y (볼조인트)', 516.6], ['u_zo', '위 팔 바깥 z', 346.0],
             ['p_ya', '푸시로드 위 팔 쪽 y', 462.2], ['p_za', '푸시로드 위 팔 쪽 z', 361.4], ['p_yr', '푸시로드 로커 쪽 y', 314.0], ['p_zr', '푸시로드 로커 쪽 z', 566.2]]
  .map(([k, n, v]) => ({k, n, u:'mm', v, d:1, g:T8G.f}));
const t8Case = [['s', '정지'], ['c', '최대 선회 (a_y = μ g)'], ['b', '최대 제동 (a_x = μ g)'], ['x', '조합 (마찰원 45°)']];
WB_TOOLS['8'] = {
  no:'8', stage:'P4-1', name:'하중 산출 (간이판)',
  noSig:true, mainTitle:'정면 부재력', mainMeta:'앞 바깥 바퀴 · 최대 선회',
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:T8G.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T8G.car}, {k:'h', dk:'h', v:290, d:0, g:T8G.car}, {k:'L', dk:'L', v:1550, d:0, g:T8G.car},
    {k:'tf', dk:'tf', v:1200, d:0, g:T8G.car}, {k:'tr', dk:'tr', v:1180, d:0, g:T8G.car}, {k:'lltd', dk:'lltd', v:48.7, d:1, g:T8G.car}, {k:'mu', dk:'mu', v:1.5, d:2, g:T8G.car},
    {k:'cla', dk:'cla', v:3, d:2, g:T8G.car}, {k:'xcop', dk:'xcop', v:775, d:0, g:T8G.car}, {k:'v_c', n:'하중 경우 차속 (다운포스)', u:'km/h', v:0, d:0, g:T8G.car},
    {k:'nz', n:'수직 하중 배율 (범프 · 노면 충격, 1 = 정적)', u:'', v:1, d:2, g:T8G.car},
    ...t8P,
  ],
  outputs:[
    ...t8Case.flatMap(([k, nm]) => [
      {k:k + '_fz_f', n:'앞 바깥 F_z', u:'N', d:0, g:nm}, {k:k + '_fy_f', n:'앞 바깥 F_y', u:'N', d:0, g:nm}, {k:k + '_fx_f', n:'앞 바깥 F_x (제동)', u:'N', d:0, g:nm},
      {k:k + '_fz_r', n:'뒤 바깥 F_z', u:'N', d:0, g:nm}, {k:k + '_fy_r', n:'뒤 바깥 F_y', u:'N', d:0, g:nm}, {k:k + '_fx_r', n:'뒤 바깥 F_x (제동)', u:'N', d:0, g:nm},
      {k:k + '_fl', n:'아래 팔 축력 (+ 인장)', u:'N', d:0, g:nm}, {k:k + '_fp', n:'푸시로드 축력 (+ 인장)', u:'N', d:0, g:nm},
      {k:k + '_u', n:'위 볼조인트 힘', u:'N', d:0, g:nm}, {k:k + '_r', n:'위 팔 안쪽 반력', u:'N', d:0, g:nm}]),
    {k:'c_fz_fi', n:'최대 선회 안쪽 앞 F_z (0 아래 = 들림)', u:'N', d:0, g:t8Case[1][1]}, {k:'lift', n:'안쪽 앞바퀴 들림 (1 = 예)', u:'', d:0, g:t8Case[1][1], hide:true},
  ],
  figure: t8Fig, tour: M8TOUR,
  verifyBase:{v_c:0, nz:1},
  verify: [
    {n:'부재력 손계산 · 수평 팔 · 수직 푸시로드 (아래 200 ~ 500 · z 100, 위 250 ~ 450 · z 300, 푸시로드 y 350 위로, 접지 y 550, F_z = 1000 N)', I:{m:407.7472, fr:50, h:0, tf:1100, l_yi:200, l_zi:100, l_yo:500, l_zo:100, u_yi:250, u_zi:300, u_yo:450, u_zo:300, p_ya:350, p_za:300, p_yr:350, p_zr:500}, expect:{s_fz_f:1000, s_fl:500, s_fp:-2000, s_u:1118.033989, s_r:1118.033989},
     src:'업라이트: 위 볼조인트 둘레 모멘트 50 × 0 − (−200)(−F_L) + 100 × 1000 = 0 → F_L = 500 N 인장, U = (500, −1000). 위 팔: 안쪽 둘레 200 × 1000 + 100 F_P = 0 → F_P = −2000 N (압축), R = U − F_P e_P = (500, 1000) → |R| = 1118 N'},
    {n:'바퀴 하중 · 최대 선회 (μ = 1.5, LLTD 48.7 %)', I:{}, expect:{c_fz_f:1218.512, c_fy_f:1827.769, c_fz_r:1329.101, s_fz_f:698.962},
     src:'앞 바깥 = 300 × 9.81 × 0.475 ÷ 2 + 300 × 14.715 × 0.29 × 0.487 ÷ 1.2 = 698.96 + 519.55, 횡력 = 300 × 14.715 × 0.475 × 1218.51 ÷ 1397.93, 뒤 바깥 = 772.54 + 300 × 14.715 × 0.29 × 0.513 ÷ 1.18'},
    {n:'바퀴 하중 · 최대 제동 (종 하중 이동 m a h ÷ L, 제동력은 F_z 비례)', I:{}, expect:{b_fz_f:1111.932, b_fx_f:1667.898, b_fz_r:359.568},
     src:'앞축 = 1397.93 + 300 × 14.715 × 0.29 ÷ 1.55 = 2223.86 → 바퀴 1111.93, F_x = 300 × 14.715 × 1111.93 ÷ 2943'},
    {n:'기본 정면 점 (2024 STEP) · 최대 선회 부재력', I:{}, expect:{c_fl:-2693.701, c_fp:-1471.895, c_u:1620.001, c_r:1733.761},
     src:'같은 식을 기본 점에 (접지력 F_y 1827.77 N 안쪽, F_z 1218.51 N): 아래 팔 2694 N 압축, 푸시로드 1472 N 압축'},
    {n:'수직 하중 배율 2 · 정지 → 접지력 · 부재력 2 배', I:{nz:2}, expect:{s_fz_f:1397.924, s_fp:-1849.452},
     src:'정지 앞 바퀴 698.962 × 2, 푸시로드 −924.726 × 2 (선형)'}
  ],
  code: `// ================================================================
// 도구 8 하중 산출 — 계산 코드 (간이판: 정상 상태 하중 경우 4 개, 바퀴 접지력 · 앞 바깥 바퀴 정면 2D 부재력)
// ================================================================
// 입력 I : m [kg], fr [%], h [mm], L [mm], tf · tr [mm], lltd [%] 앞 횡하중 이동 배분 (도구 7), mu [-] 타이어 μ (하중 경우의 가속도 크기),
//          cla [m²] · xcop [mm] · v_c [km/h] 다운포스 (시험 차속), nz [-] 수직 하중 배율 (범프 · 노면 충격, 1 = 정적)
//          앞 정면 점 [mm] (y = 차 중심선에서 바깥 +, z = 지면에서 위 +): 아래 팔 안쪽 · 바깥, 위 팔 안쪽 · 바깥 (바깥 = 볼조인트),
//          푸시로드 위 팔 쪽 끝 (p_ya, p_za) · 로커 쪽 끝 (p_yr, p_zr), 접지점 = (tf ÷ 2, 0)
// 하중 경우 (Milliken 18 장 · 정상 상태): 정지 (0, 0) · 최대 선회 (a_y = μ g) · 최대 제동 (a_x = μ g) · 조합 (마찰원 45°: a_x = a_y = μ g ÷ √2)
//   축 하중: F_zf = n_z W_f + D_f + m a_x h ÷ L,  F_zr = n_z W_r + D_r − m a_x h ÷ L   (a_x = 감속 +)
//   바깥 바퀴: F_z = 축 하중 ÷ 2 + m a_y h × (앞: LLTD ÷ t_f, 뒤: (1 − LLTD) ÷ t_r)
//   횡력: 축 = m a_y × (앞: 앞 무게 비, 뒤: 뒤 무게 비) (요 평형), 바퀴 = 축 횡력 × 바퀴 F_z ÷ 축 F_z.  종력 (제동): 바퀴 = m a_x × 바퀴 F_z ÷ ΣF_z
// 부재력 (정면 2D, 앞 바깥 바퀴): 업라이트 = 아래 팔 (두 힘 부재, 축력 F_L) · 위 볼조인트 힘 U · 접지력 C 의 평형, 위 팔 = U · 푸시로드 축력 F_P · 안쪽 반력 R 의 평형
//   위 볼조인트 둘레 모멘트로 F_L → U = −C − F_L e_L,  위 팔 안쪽 둘레 모멘트로 F_P → R = U − F_P e_P.  축력 + = 인장, − = 압축
//   (A 암 두 다리 합 · 정면 성분만. 종력 · 측면 기하 · 바퀴 무게 · 동적 하중은 넣지 않음 — 3D 엔진 (도구 5) 과 함께 나중에)
const g = 9.81, RHO = 1.225;
const cr = (a, b) => a[0] * b[1] - a[1] * b[0], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], unit = a => { const n = Math.hypot(a[0], a[1]); return [a[0] / n, a[1] / n]; };
function members(P, C) {
  const eL = unit(sub(P.Li, P.Lo)), eP = unit(sub(P.Pr, P.Pa));
  const rL = sub(P.Lo, P.Uo), rC = sub(P.C, P.Uo), k = cr(rL, eL);
  if (Math.abs(k) < 1e-9) throw new Error('아래 팔이 위 볼조인트를 지나 부재력을 정할 수 없습니다.');
  const FL = -cr(rC, C) / k, U = [-C[0] - FL * eL[0], -C[1] - FL * eL[1]];
  const mU = cr(sub(P.Uo, P.Ui), [-U[0], -U[1]]), kP = cr(sub(P.Pa, P.Ui), eP);
  if (Math.abs(kP) < 1e-9) throw new Error('푸시로드가 위 팔 안쪽 점을 지나 부재력을 정할 수 없습니다.');
  const FP = -mU / kP, R = [U[0] - FP * eP[0], U[1] - FP * eP[1]];
  return { FL, FP, U: Math.hypot(U[0], U[1]), R: Math.hypot(R[0], R[1]) };
}
function calc(I) {
  const pos = (v, nm) => { if (!(v > 0)) throw new Error(nm + ' 는 0 보다 커야 합니다.'); return v; };
  const m = pos(I.m, '질량'), L = pos(I.L, '휠베이스') / 1000, h = Math.max(0, I.h) / 1000, fs = I.fr / 100, tf = pos(I.tf, '앞 윤거') / 1000, tr = pos(I.tr, '뒤 윤거') / 1000;
  const ld = I.lltd / 100, mu = pos(I.mu, '타이어 μ'), nz = pos(I.nz, '수직 하중 배율');
  const v = Math.max(0, I.v_c || 0) / 3.6, D = 0.5 * RHO * Math.max(0, I.cla || 0) * v * v, fa = isFinite(I.xcop) ? I.xcop / I.L : fs;
  const P = { Li: [I.l_yi, I.l_zi], Lo: [I.l_yo, I.l_zo], Ui: [I.u_yi, I.u_zi], Uo: [I.u_yo, I.u_zo], Pa: [I.p_ya, I.p_za], Pr: [I.p_yr, I.p_zr], C: [I.tf / 2, 0] };
  const cases = [['s', 0, 0], ['c', mu, 0], ['b', 0, mu], ['x', mu / Math.SQRT2, mu / Math.SQRT2]];   // [키, a_y [g], a_x [g]]
  const out = {};
  for (const [k, ayg, axg] of cases) {
    const ay = ayg * g, ax = axg * g;
    const Fzf = nz * m * g * fs + D * fa + m * ax * h / L, Fzr = nz * m * g * (1 - fs) + D * (1 - fa) - m * ax * h / L;
    const fo = Fzf / 2 + m * ay * h * ld / tf, ro = Fzr / 2 + m * ay * h * (1 - ld) / tr;
    const Fyf = m * ay * fs, Fyr = m * ay * (1 - fs), yo = Fyf * fo / Fzf, yr = Fyr * ro / Fzr;
    const xo = m * ax * fo / (Fzf + Fzr), xr = m * ax * ro / (Fzf + Fzr);
    const M = members(P, [-yo, fo]);                                                    // 바깥 바퀴 횡력 = 안쪽 (−y) 방향
    Object.assign(out, { [k + '_fz_f']: fo, [k + '_fy_f']: yo, [k + '_fx_f']: xo, [k + '_fz_r']: ro, [k + '_fy_r']: yr, [k + '_fx_r']: xr,
                         [k + '_fl']: M.FL, [k + '_fp']: M.FP, [k + '_u']: M.U, [k + '_r']: M.R });
    if (k === 'c') out.c_fz_fi = Fzf - fo;                                              // 선회 안쪽 앞 바퀴 (0 아래면 들림)
  }
  out.lift = out.c_fz_fi < 0 ? 1 : 0;
  return { out, geo: P };
}
`
};
