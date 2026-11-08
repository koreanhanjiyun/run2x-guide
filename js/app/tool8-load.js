/* ============================================================
   도구 8 하중 산출 (3D) — docs/TOOLS-PLAN.md 5절
   - 정상 상태 하중 경우 5 개 (정지 · 최대 선회 · 최대 제동 · 가속 · 조합) 의 바깥 바퀴 접지력과, 앞 · 뒤 서스 부재력 (3D 정적 평형):
     팔 다리 축력 (두 힘 부재) · 푸시로드가 붙은 팔의 안쪽 점 힘 · 볼조인트 힘 · 타이로드 (토 링크) · 푸시로드 축력
   - 기본 점 = 2024 REF4 STEP (도구 5 의 K3D_HP), 하중 이동 배분 기본 = 도구 7 기본 결과. 수직 배율 nz 로 범프 · 노면 충격을 대신
   - 나중에: 동적 하중 (댐퍼 · 관성), 변형 반영, 뒤 안쪽 바퀴
   ============================================================ */
const T8N = {lf:'아래 팔 앞 다리', lr:'아래 팔 뒤 다리', uf:'위 팔 앞 다리', ur:'위 팔 뒤 다리', ti:'타이로드', pu:'푸시로드', lo:'아래 볼조인트 힘', uo:'위 볼조인트 힘'};
const T8C = {s:'정지', c:'최대 선회', b:'최대 제동', a:'가속', x:'조합'};
function t8Fig(I, R){ if(!R || !R.tab) return ''; const T = R.tab, f = v => isFinite(v) ? wbFmt(Math.abs(v) < 0.5 ? 0 : v, 0) : '—';
  const one = (s, nm, up) => { const two = up ? ['lf', 'lr'] : ['uf', 'ur'], jt = up ? ['uf', 'ur'] : ['lf', 'lr'];
    const lab = q => (s === 'r' && q === 'ti') ? '토 링크' : (jt.includes(q) ? T8N[q].replace('다리', '안쪽 점 힘') : T8N[q]);
    const rows = ['lf', 'lr', 'uf', 'ur', 'ti', 'pu', 'lo', 'uo'].map(q => { const sgn = two.includes(q) || q === 'ti' || q === 'pu', vals = T.cases.map(k => T.tab[k][s === 'f' ? 'F' : 'R'][q]);
      const mx = Math.max(...vals.map(Math.abs));
      return `<tr><th>${lab(q)}${sgn ? '' : ' <span class="muted">(크기)</span>'}</th>${vals.map(v => `<td class="${sgn ? (v >= 0 ? 't8-t' : 't8-c') : ''}${Math.abs(v) === mx ? ' t8-mx' : ''}">${f(v)}</td>`).join('')}</tr>`; }).join('');
    return `<section class="t8-sec"><h4>${nm} <span class="muted">(푸시로드 = ${up ? '위' : '아래'} 팔)</span></h4><div class="t4-tw"><table class="dvi-t t8-tab"><thead><tr><th>부재 [N]</th>${T.cases.map(k => `<th>${T8C[k]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`; };
  return `<style>.t8-tab td{text-align:right;font-variant-numeric:tabular-nums}.t8-t{color:#1d5f9a}.t8-c{color:#c2410c}.t8-mx{font-weight:700;text-decoration:underline}.t8-sec h4{margin:4px 0 6px;font-size:13px}</style>
    ${one('f', '앞 바깥 바퀴', T.upF)}${one('r', '뒤 바깥 바퀴', T.upR)}
    <p class="muted t5-note">파랑 = 인장 (+), 주황 = 압축 (−), 굵은 밑줄 = 그 부재의 경우 중 최대. 푸시로드가 붙은 팔은 굽힘을 받아 안쪽 두 점 힘을 크기로 보입니다 (회전축 방향 몫은 반씩 나눈 가정).</p>`; }
const M8TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '차(질량 · 무게중심 · 윤거 · 하중 이동 배분 · 타이어 μ · 다운포스 · 수직 배율)와 앞 · 뒤 하드포인트(도구 5 와 같은 좌표, 푸시로드 두 끝 포함)입니다.'],
  ['#wb #wbmain', '부재력 표', '하중 경우마다 앞 · 뒤 바깥 바퀴의 부재력입니다. 부재마다 가장 큰 경우가 굵게 표시됩니다.'],
  ['#wb #wbout', '결과', '하중 경우마다 앞 · 뒤 바깥 바퀴 접지력(F_z · F_y · F_x)과 부재마다 설계 하중(경우 중 절댓값 최대, 부호 그대로)입니다.'],
];
const T8G = {car:'차 (1번 · 7번 도구)'};
const t8Pt = ['lf', 'lr', 'lo', 'uf', 'ur', 'uo', 'ti', 'to', 'pa', 'pr'];
document.addEventListener('click', e => { if(WB.id!=='8' || !e.target.closest) return;
  const a = e.target.closest('[data-t8pa]'); if(a){ const [s, v] = a.dataset.t8pa.split(':'); WB.I['pa_arm_' + s] = +v; wbSave(); wbPaint(['in']); wbCalcSoon(); } });
const t8Case = [['s', '정지'], ['c', '최대 선회 (a_y = μ g)'], ['b', '최대 제동 (a_x = μ g)'], ['a', '가속 (뒤 구동 접지 한계)'], ['x', '조합 (제동 + 선회, 마찰원 45°)']];
WB_TOOLS['8'] = {
  no:'8', stage:'P4-1', name:'하중 산출 (3D)',
  noSig:true, mainTitle:'부재력 표', mainMeta:'바깥 바퀴 · 경우별',
  inOpt(k){ const pm = /^([fr])_pa_x$/.exec(k); if(!pm) return ''; const s = pm[1], cur = s + ':' + (WB.I['pa_arm_' + s] === 1 ? 1 : 0);
    return `<span class="t2-inopt"><span class="dc-seg" role="group">${[[s + ':0', '아래 팔'], [s + ':1', '위 팔']].map(([v, t]) => `<button type="button" data-t8pa="${v}" aria-pressed="${cur===v}">${t}</button>`).join('')}</span></span>`; },
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:T8G.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T8G.car}, {k:'h', dk:'h', v:290, d:0, g:T8G.car}, {k:'L', dk:'L', v:1550, d:0, g:T8G.car},
    {k:'tf', dk:'tf', v:1200, d:0, g:T8G.car}, {k:'tr', dk:'tr', v:1180, d:0, g:T8G.car}, {k:'lltd', dk:'lltd', v:49.5, d:1, g:T8G.car}, {k:'mu', dk:'mu', v:1.5, d:2, g:T8G.car},
    {k:'cla', dk:'cla', v:3, d:2, g:T8G.car}, {k:'xcop', dk:'xcop', v:775, d:0, g:T8G.car}, {k:'v_c', n:'하중 경우 차속 (다운포스)', u:'km/h', v:0, d:0, g:T8G.car},
    {k:'nz', n:'수직 하중 배율 (범프 · 노면 충격, 1 = 정적)', u:'', v:1, d:2, g:T8G.car},
    {k:'r_load', dk:'r_load', v:236, d:0, g:T8G.car}, {k:'camber_f', dk:'camber_f', v:-3, d:2, g:T8G.car}, {k:'camber_r', dk:'camber_r', v:-2, d:2, g:T8G.car},
    {k:'pa_arm_f', n:'앞 푸시로드가 붙은 팔 (1 = 위, 0 = 아래)', u:'', v:1, d:0, g:T8G.car, ui:'none'}, {k:'pa_arm_r', n:'뒤 푸시로드가 붙은 팔 (1 = 위, 0 = 아래)', u:'', v:0, d:0, g:T8G.car, ui:'none'},
    ...k3dIn('f', t8Pt), ...k3dIn('r', t8Pt),
  ],
  outputs:[
    ...t8Case.flatMap(([k, nm]) => [
      {k:k + '_fz_f', n:'앞 바깥 F_z', u:'N', d:0, g:nm}, {k:k + '_fy_f', n:'앞 바깥 F_y (안쪽으로)', u:'N', d:0, g:nm}, {k:k + '_fx_f', n:'앞 바깥 F_x (앞 +)', u:'N', d:0, g:nm},
      {k:k + '_fz_r', n:'뒤 바깥 F_z', u:'N', d:0, g:nm}, {k:k + '_fy_r', n:'뒤 바깥 F_y (안쪽으로)', u:'N', d:0, g:nm}, {k:k + '_fx_r', n:'뒤 바깥 F_x (앞 +)', u:'N', d:0, g:nm}]),
    {k:'c_fz_fi', n:'최대 선회 안쪽 앞 F_z (0 아래 = 들림)', u:'N', d:0, g:t8Case[1][1]}, {k:'c_fz_ri', n:'최대 선회 안쪽 뒤 F_z', u:'N', d:0, g:t8Case[1][1]},
    {k:'a_acc', n:'가속 경우 종가속도', u:'g', d:3, g:t8Case[3][1]},
    ...['f', 'r'].flatMap(s => ['lf', 'lr', 'uf', 'ur', 'ti', 'pu', 'lo', 'uo'].map(q => ({k:`e_${s}_${q}`, n:(s === 'r' && q === 'ti' ? '토 링크' : T8N[q]) + (q === 'lo' || q === 'uo' ? '' : ' (+ 인장)'), u:'N', d:0, g:(s === 'f' ? '앞' : '뒤') + ' 설계 하중 (경우 중 최대)'}))),
    ...t8Case.flatMap(([k]) => ['f', 'r'].flatMap(s => ['lf', 'lr', 'uf', 'ur', 'ti', 'pu', 'lo', 'uo'].map(q => ({k:`${k}_${s}_${q}`, n:`${T8C[k]} · ${s === 'f' ? '앞' : '뒤'} · ${T8N[q]}`, u:'N', d:0, g:'경우별 부재력', hide:true})))),
    {k:'lift', n:'안쪽 앞바퀴 들림 (1 = 예)', u:'', d:0, g:t8Case[1][1], hide:true},
  ],
  figure: t8Fig, tour: M8TOUR,
  verifyBase:{v_c:0, nz:1, camber_f:0, camber_r:0, r_load:236},
  verify: [
    {n:'정지 손계산 · 수평 팔 (앞뒤 다리 ±175) · 수직 푸시로드 (위 팔 y 350), 접지 y 550, F_z = 1000 N', I:{m:407.7472, fr:50, h:0, tf:1100, pa_arm_f:1,
       f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:500, f_lo_z:100, f_uf_x:175, f_uf_y:250, f_uf_z:300, f_ur_x:-175, f_ur_y:250, f_ur_z:300, f_uo_x:0, f_uo_y:450, f_uo_z:300,
       f_ti_x:-70, f_ti_y:200, f_ti_z:200, f_to_x:-70, f_to_y:480, f_to_z:200, f_pa_x:0, f_pa_y:350, f_pa_z:300, f_pr_x:0, f_pr_y:350, f_pr_z:500},
     expect:{s_fz_f:1000, s_f_lf:289.425916, s_f_lr:289.425916, s_f_pu:-2000, s_f_uo:1118.033989, s_f_uf:559.016994, s_f_ur:559.016994, s_f_ti:0},
     src:'정면: 위 볼조인트 둘레 모멘트 → 아래 팔 합 500 N 인장 → 다리마다 250 × 347.31 ÷ 300 = 289.43 N. 위 팔 안쪽 둘레 → 푸시로드 −2000 N, 위 볼조인트 |(500, −1000)| = 1118 N, 안쪽 반력 |(500, 1000)| 을 앞뒤 반씩 559 N. F_z 와 킹핀축이 한 평면 → 타이로드 0'},
    {n:'제동 → 타이로드 축력 (킹핀 수직 y 500, 스크럽 50, 너클암 70 mm 뒤, F_x = −1000 N)', I:{m:407.7472, fr:50, h:0, tf:1100, mu:1, pa_arm_f:1,
       f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:500, f_lo_z:100, f_uf_x:175, f_uf_y:250, f_uf_z:300, f_ur_x:-175, f_ur_y:250, f_ur_z:300, f_uo_x:0, f_uo_y:500, f_uo_z:300,
       f_ti_x:-70, f_ti_y:200, f_ti_z:200, f_to_x:-70, f_to_y:500, f_to_z:200, f_pa_x:0, f_pa_y:350, f_pa_z:300, f_pr_x:0, f_pr_y:350, f_pr_z:500},
     expect:{b_fz_f:1000, b_fx_f:-1000, b_f_ti:-714.285714},
     src:'킹핀축 (z 축, y = 500) 둘레 모멘트: 제동력 −1000 N × 팔 50 mm + 타이로드 t × 70 mm = 0 → t = −714.29 N (압축). 볼조인트 힘은 킹핀축 위라 모멘트 없음'},
    {n:'가속 (안쪽 구동 → 바퀴 중심 236 에 F_x = +1000 N) · 뒤 토 링크 · 위 팔 다리 (푸시로드 = 아래 팔)', I:{m:407.7472, fr:50, h:0, tr:1100, mu:1, pa_arm_r:0, r_load:236,
       r_lf_x:175, r_lf_y:200, r_lf_z:100, r_lr_x:-175, r_lr_y:200, r_lr_z:100, r_lo_x:0, r_lo_y:500, r_lo_z:100, r_uf_x:175, r_uf_y:300, r_uf_z:300, r_ur_x:-175, r_ur_y:300, r_ur_z:300, r_uo_x:0, r_uo_y:500, r_uo_z:300,
       r_ti_x:-70, r_ti_y:200, r_ti_z:200, r_to_x:-70, r_to_y:500, r_to_z:200, r_pa_x:0, r_pa_y:350, r_pa_z:100, r_pr_x:0, r_pr_y:350, r_pr_z:300},
     expect:{a_fz_r:1000, a_fx_r:1000, a_r_ti:714.285714, a_r_uf:-919.697437, a_r_ur:112.945299},
     src:'a_x = μ W_r ÷ m = 0.5 g → 바퀴마다 1000 N. 킹핀 둘레: −50 × 1000 + 70 t = 0 → t = 714.29 N. 아래 볼조인트 지나는 y 축 둘레: 136 × 1000 + 200 F_ux = 0 → F_ux = −680, x 축 둘레: 50 × 1000 + 100 t − 200 F_uy = 0 → F_uy = 607.14. 다리 (±175, −200): u1 − u2 = −680 × 265.75 ÷ 175, u1 + u2 = −607.14 × 265.75 ÷ 200'},
    {n:'수직 하중 배율 2 · 정지 → 접지력 · 부재력 2 배 (선형)', I:{nz:2}, expect:{s_fz_f:1397.924},
     src:'정지 앞 바퀴 698.962 × 2'}
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
`
};
