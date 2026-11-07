/* ============================================================
   도구 5 서스 기하 (3D 기구학) — docs/TOOLS-PLAN.md 5절
   - 더블 위시본 3D 하드포인트(축마다 8 점)로 업라이트 자세를 풀어 롤센터 · 순간중심 · 캠버 게인 · KPI · 캐스터 · 스크럽 · 트레일 ·
     범프 / 롤 스티어 · 안티다이브 · 안티리프트 · 안티스쿼트, 휠 트래블 곡선(캠버 · 토 · 롤센터 · 윤거 · KPI · 캐스터)
   - 기본 점 = 2024 REF4 STEP(`REF4_Assy_07.22.STEP`) 왼쪽 바퀴 로드엔드 볼 중심 (차 좌표로 옮김: x = 앞 +, 바퀴 중심 0 · y = 바깥 + · z = 지면 위 +)
   - 공통 엔진 K3D (계산 코드 맨 앞) 는 도구 6 · 7 · 8 도 같이 씀. 입력 칸 만드는 k3dIn · 기본 점 K3D_HP 도 여기서 정의 (도구 6 · 7 · 8 이 뒤에 읽힘)
   ============================================================ */
const K3D_PN = {lf:'아래 팔 안쪽 앞', lr:'아래 팔 안쪽 뒤', lo:'아래 볼조인트', uf:'위 팔 안쪽 앞', ur:'위 팔 안쪽 뒤', uo:'위 볼조인트', ti:'타이로드 안쪽', to:'타이로드 바깥',
  pa:'푸시로드 팔 쪽', pr:'푸시로드 로커 쪽', rp:'로커 회전 중심', rq:'로커 회전축 위 다른 점', dr:'댐퍼 로커 쪽', db:'댐퍼 차체 쪽'};
const K3D_PNR = {ti:'토 링크 안쪽', to:'토 링크 바깥'};
/* 2024 REF4 STEP 왼쪽 바퀴 (STEP 좌표 X 바깥 · Y 위 (지면 −74) · Z 앞 → 차 좌표 x = Z − 바퀴 중심 Z (앞 929.8 · 뒤 −650), y = X, z = Y + 74) */
const K3D_HP = {
  f:{lf:[170.2, 212.7, 131.3], lr:[-179.8, 212.7, 131.3], lo:[2.0, 561.6, 151.2], uf:[170.2, 246.7, 288.0], ur:[-179.8, 246.7, 288.0], uo:[-11.6, 516.6, 346.0],
     ti:[12.2, 220.7, 169.5], to:[56.3, 550.1, 199.9], pa:[-4.8, 462.2, 361.4], pr:[-4.8, 314.0, 566.2], rp:[-4.8, 253.0, 551.0], rq:[95.2, 253.0, 551.0], dr:[-4.8, 250.8, 619.9], db:[-4.8, 51.0, 610.5]},
  r:{lf:[100, 218.1, 154.1], lr:[-25, 218.1, 154.1], lo:[-1, 539.6, 169.2], uf:[100, 251.6, 309.6], ur:[-25, 251.6, 309.6], uo:[-25, 501.5, 365.5],
     ti:[160, 218.1, 154.1], to:[59, 539.2, 169.1], pa:[5, 488.4, 193.3], pr:[5, 260.4, 401.0], rp:[5, 218.0, 362.0], rq:[105, 218.0, 362.0], dr:[5, 201.6, 439.1], db:[5, 7.4, 391.3]}};
/* 입력 칸: 축 s 의 점 목록 pts → 점마다 x · y · z (묶음 이름 = '앞 · 점 이름') */
function k3dIn(s, pts){ const ax = s === 'f' ? '앞' : '뒤';
  return pts.flatMap(p => { const nm = (s === 'r' && K3D_PNR[p]) || K3D_PN[p], g = `${ax} · ${nm} (x 앞 · y 바깥 · z 위)`;
    return ['x', 'y', 'z'].map((c, j) => ({k:`${s}_${p}_${c}`, n:`${nm} ${c}`, u:'mm', v:K3D_HP[s][p][j], d:1, g})); }); }
/* 정면 · 측면 그림: 축마다 (정면 = y–z, 오른쪽 절반 · 측면 = x–z) */
function k3dView(G, nm, mode, extra){ const f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—', P = G.P, X = G.X;
  const W = 360, H = 260, fr = mode === 'front', sc = fr ? 0.42 : 0.42, ox = fr ? 20 : W / 2, oy = H - 28;
  const pj = p => fr ? [ox + p[1] * sc, oy - p[2] * sc] : [ox + p[0] * sc, oy - p[2] * sc];
  const ln = (a, b, c, w, dash) => { const A = pj(a), B = pj(b); return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="${c}" stroke-width="${w}"${dash ? ' stroke-dasharray="5 4"' : ''}/>`; };
  const dt = (p, c) => { const A = pj(p); return `<circle cx="${A[0].toFixed(1)}" cy="${A[1].toFixed(1)}" r="3.2" fill="#fff" stroke="${c || '#26303c'}" stroke-width="1.4"/>`; };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="t5-svg" role="img" aria-label="${nm}"><line x1="0" x2="${W}" y1="${oy}" y2="${oy}" stroke="#8a8f99"/>`;
  if(fr) s += `<line x1="${ox}" x2="${ox}" y1="10" y2="${oy}" stroke="#b9bec8" stroke-dasharray="3 4"/><text x="${ox + 4}" y="20" class="t5-tx">중심선</text>`;
  else s += `<line x1="${ox}" x2="${ox}" y1="10" y2="${oy}" stroke="#b9bec8" stroke-dasharray="3 4"/><text x="${ox + 4}" y="20" class="t5-tx">바퀴 중심 · 앞 →</text>`;
  // 바퀴 (정면: 사각형 근사 · 측면: 원)
  const wc = pj(X.WC), rr = G.X.WC[2] * sc;
  s += fr ? `<rect x="${(wc[0] - 90 * sc).toFixed(1)}" y="${(wc[1] - rr).toFixed(1)}" width="${(180 * sc).toFixed(1)}" height="${(2 * rr).toFixed(1)}" rx="6" fill="#e9ecf1" stroke="#9aa3b5" transform="rotate(${(X.cam).toFixed(2)} ${wc[0].toFixed(1)} ${wc[1].toFixed(1)})"/>`
          : `<circle cx="${wc[0].toFixed(1)}" cy="${wc[1].toFixed(1)}" r="${rr.toFixed(1)}" fill="#e9ecf1" stroke="#9aa3b5"/>`;
  // 순간중심 선
  const ic = fr ? G.ic : G.sv, cp = X.CP;
  if(isFinite(ic[0]) && isFinite(ic[1])){ const I3 = fr ? [0, ic[0], ic[1]] : [ic[0], 0, ic[1]]; s += ln(cp, I3, '#6A4294', 1.2, true); }
  s += ln(P.lf, X.LO, '#1d5f9a', 2.6) + ln(P.lr, X.LO, '#1d5f9a', 2.6) + ln(P.uf, X.UO, '#c2410c', 2.6) + ln(P.ur, X.UO, '#c2410c', 2.6) + ln(X.LO, X.UO, '#5f6973', 2) + ln(X.TI, X.TO, '#2e7d32', 2);
  // 킹핀축 지면까지
  const k = X.kp, tg = -X.LO[2] / k[2], Gp = [X.LO[0] + k[0] * tg, X.LO[1] + k[1] * tg, 0]; s += ln(X.UO, Gp, '#26303c', 1, true);
  if(extra) s += extra(pj, ln, dt);
  [P.lf, P.lr, X.LO, P.uf, P.ur, X.UO, X.TI, X.TO].forEach(p => s += dt(p));
  const C = pj(cp); s += `<circle cx="${C[0].toFixed(1)}" cy="${oy}" r="3.2" fill="#26303c"/>`;
  return `<figure class="t5-fig" style="max-width:440px"><figcaption>${nm}</figcaption>${s}</svg></figure>`; }
function t5Fig(I, R){ if(!R || !R.geo) return ''; const G = R.geo, o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  const rcm = rc => (pj) => { if(!isFinite(rc)) return ''; const A = pj([0, 0, rc]); return `<circle cx="${A[0].toFixed(1)}" cy="${A[1].toFixed(1)}" r="4.5" fill="#6A4294"/><text x="${(A[0] + 7).toFixed(1)}" y="${(A[1] - 6).toFixed(1)}" class="t5-tx b">롤센터 ${f(rc, 1)}</text>`; };
  return `<div class="t5-figs">${k3dView(G.F, '앞축 정면', 'front', rcm(o.rc_f))}${k3dView(G.R, '뒤축 정면', 'front', rcm(o.rc_r))}${k3dView(G.F, '앞축 측면 (왼쪽 바퀴)', 'side')}${k3dView(G.R, '뒤축 측면 (왼쪽 바퀴)', 'side')}</div>
    <p class="muted t5-note">파랑 = 아래 팔 (두 다리), 주황 = 위 팔, 초록 = 타이로드 · 토 링크, 회색 점선 = 킹핀축 (지면까지), 보라 점선 = 접지점 → 순간중심 (정면 · 측면, 그림 밖에 있을 수 있음). 같은 축척.</p>`; }
const M5TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '축마다 하드포인트 8 점(아래 · 위 팔 안쪽 앞 · 뒤 · 볼조인트, 타이로드(뒤는 토 링크) 두 끝)을 3D 로 넣습니다. x 는 그 축의 바퀴 중심에서 앞 +, y 는 중심선에서 바깥 +, z 는 지면에서 위 + [mm]. 기본값은 2024 REF4 STEP 의 로드엔드 볼 중심입니다.'],
  ['#wb #wbmain', '그림', '정면 · 측면에서 팔 · 킹핀축 · 순간중심 선 · 롤센터를 그립니다.'],
  ['#wb #wbout', '결과', '정지 자세의 롤센터 · 캠버 게인 · KPI · 캐스터 · 스크럽 · 트레일 · 범프 / 롤 스티어 · 안티 지오메트리입니다. 작은 움직임(접선) 값이고, 큰 움직임은 아래 곡선에서 봅니다.'],
  ['#wb .wb-sig', '트래블 곡선', '가로축 = 휠 트래블(바퀴 중심이 차체에 대해 오르면 +). 캠버 · 토 · 롤센터(양쪽 같이 오르내릴 때) · 윤거 반 변화 · KPI · 캐스터입니다.'],
];
const T5G = {car:'차 · 바퀴'};
const t5Cv = ['lf', 'lr', 'lo', 'uf', 'ur', 'uo', 'ti', 'to'];
WB_TOOLS['5'] = {
  no:'5', stage:'P3-1~3', name:'서스 기하 (3D 기구학)',
  mainTitle:'정면 · 측면 기하', mainMeta:'왼쪽 바퀴 · 같은 축척',
  x:{n:'휠 트래블', u:'mm'}, xiStart:'mid',
  inputs:[
    {k:'tf', dk:'tf', v:1200, d:0, g:T5G.car}, {k:'tr', dk:'tr', v:1180, d:0, g:T5G.car}, {k:'r_load', dk:'r_load', v:236, d:0, g:T5G.car},
    {k:'camber_f', dk:'camber_f', v:-3, d:2, g:T5G.car}, {k:'camber_r', dk:'camber_r', v:-2, d:2, g:T5G.car}, {k:'toe_f', dk:'toe_f', v:0, d:2, g:T5G.car}, {k:'toe_r', dk:'toe_r', v:0, d:2, g:T5G.car},
    {k:'h', dk:'h', v:290, d:0, g:T5G.car}, {k:'L', dk:'L', v:1550, d:0, g:T5G.car}, {k:'brake_bias', dk:'brake_bias', v:73.6, d:1, g:T5G.car},
    {k:'s_max', n:'그래프 트래블 범위 (±)', u:'mm', v:40, d:0, g:T5G.car},
    ...k3dIn('f', t5Cv), ...k3dIn('r', t5Cv),
  ],
  outputs:[
    {k:'rc_f', dk:'rc_f', d:1, g:'앞축 정면'}, {k:'ic_y_f', n:'정면 순간중심 y', u:'mm', d:0, g:'앞축 정면'}, {k:'ic_z_f', n:'정면 순간중심 z', u:'mm', d:0, g:'앞축 정면'}, {k:'fvsa_f', n:'정면 스윙암 (FVSA)', u:'mm', d:0, g:'앞축 정면'},
    {k:'cgb_f', n:'범프 캠버 게인 (차체 기준)', u:'°/mm', d:4, g:'앞축 정면'}, {k:'camber_gain_f', dk:'camber_gain_f', d:3, g:'앞축 정면'},
    {k:'kpi', dk:'kpi', d:2, g:'앞축 킹핀 · 조향'}, {k:'caster', dk:'caster', d:2, g:'앞축 킹핀 · 조향'}, {k:'scrub', dk:'scrub', d:1, g:'앞축 킹핀 · 조향'}, {k:'trail', dk:'trail', d:1, g:'앞축 킹핀 · 조향'},
    {k:'kpo_f', n:'바퀴 중심 킹핀 옵셋', u:'mm', d:1, g:'앞축 킹핀 · 조향'}, {k:'bs_f', n:'범프 스티어 (토인 +)', u:'°/mm', d:4, g:'앞축 킹핀 · 조향'}, {k:'rs_f', n:'롤 스티어 (바깥 바퀴, 토인 +)', u:'°/°', d:3, g:'앞축 킹핀 · 조향'},
    {k:'sv_x_f', n:'측면 순간중심 x', u:'mm', d:0, g:'앞축 킹핀 · 조향'}, {k:'sv_z_f', n:'측면 순간중심 z', u:'mm', d:0, g:'앞축 킹핀 · 조향'}, {k:'anti_dive', dk:'anti_dive', d:1, g:'앞축 킹핀 · 조향'},
    {k:'rc_r', dk:'rc_r', d:1, g:'뒤축 정면'}, {k:'ic_y_r', n:'정면 순간중심 y', u:'mm', d:0, g:'뒤축 정면'}, {k:'ic_z_r', n:'정면 순간중심 z', u:'mm', d:0, g:'뒤축 정면'}, {k:'fvsa_r', n:'정면 스윙암 (FVSA)', u:'mm', d:0, g:'뒤축 정면'},
    {k:'cgb_r', n:'범프 캠버 게인 (차체 기준)', u:'°/mm', d:4, g:'뒤축 정면'}, {k:'camber_gain_r', dk:'camber_gain_r', d:3, g:'뒤축 정면'},
    {k:'kpi_r', n:'킹핀 경사각 (뒤)', u:'°', d:2, g:'뒤축 킹핀 · 토'}, {k:'caster_r', n:'캐스터 (뒤)', u:'°', d:2, g:'뒤축 킹핀 · 토'}, {k:'scrub_r', n:'스크럽 (뒤)', u:'mm', d:1, g:'뒤축 킹핀 · 토'}, {k:'trail_r', n:'트레일 (뒤)', u:'mm', d:1, g:'뒤축 킹핀 · 토'},
    {k:'kpo_r', n:'바퀴 중심 킹핀 옵셋 (뒤)', u:'mm', d:1, g:'뒤축 킹핀 · 토'}, {k:'bs_r', n:'범프 스티어 (토인 +)', u:'°/mm', d:4, g:'뒤축 킹핀 · 토'}, {k:'rs_r', n:'롤 스티어 (바깥 바퀴, 토인 +)', u:'°/°', d:3, g:'뒤축 킹핀 · 토'},
    {k:'sv_x_r', n:'측면 순간중심 x', u:'mm', d:0, g:'뒤축 킹핀 · 토'}, {k:'sv_z_r', n:'측면 순간중심 z', u:'mm', d:0, g:'뒤축 킹핀 · 토'},
    {k:'anti_lift', n:'안티리프트 (뒤, 제동)', u:'%', d:1, g:'뒤축 킹핀 · 토'}, {k:'anti_squat', dk:'anti_squat', d:1, g:'뒤축 킹핀 · 토'},
    {k:'camber_f_o', dk:'camber_f', d:2, g:'앞축 정면', hide:true}, {k:'camber_r_o', dk:'camber_r', d:2, g:'앞축 정면', hide:true}, {k:'toe_f_o', dk:'toe_f', d:2, g:'앞축 정면', hide:true}, {k:'toe_r_o', dk:'toe_r', d:2, g:'앞축 정면', hide:true},
  ],
  sigs:[{k:'cf', n:'캠버 (앞)', u:'°', d:3}, {k:'cr', n:'캠버 (뒤)', u:'°', d:3}, {k:'tf_', n:'토 (앞, 토인 +)', u:'°', d:3}, {k:'tr_', n:'토 (뒤, 토인 +)', u:'°', d:3},
        {k:'rcf', n:'롤센터 (앞, 양쪽 같이)', u:'mm', d:1}, {k:'rcr', n:'롤센터 (뒤, 양쪽 같이)', u:'mm', d:1}, {k:'yf', n:'윤거 반 변화 (앞)', u:'mm', d:2}, {k:'yr', n:'윤거 반 변화 (뒤)', u:'mm', d:2},
        {k:'kf', n:'KPI (앞)', u:'°', d:2}, {k:'cs', n:'캐스터 (앞)', u:'°', d:2}],
  sigOn:['cf', 'cr'],
  figure: t5Fig, tour: M5TOUR,
  verifyBase:{camber_f:0, camber_r:0, toe_f:0, toe_r:0, tf:1200, tr:1200, h:290, L:1550, brake_bias:73.6},
  verify: [
    {n:'위 · 아래 팔 수평 평행 (앞뒤 다리 ±175) → 롤센터 = 지면, 롤 캠버 게인 1', I:{f_lf_x:175, f_lf_y:200, f_lf_z:120, f_lr_x:-175, f_lr_y:200, f_lr_z:120, f_lo_x:0, f_lo_y:560, f_lo_z:120, f_uf_x:175, f_uf_y:250, f_uf_z:300, f_ur_x:-175, f_ur_y:250, f_ur_z:300, f_uo_x:0, f_uo_y:550, f_uo_z:300, f_ti_x:-70, f_ti_y:200, f_ti_z:120, f_to_x:-70, f_to_y:560, f_to_z:120}, expect:{rc_f:0, camber_gain_f:1, cgb_f:0},
     src:'정면 투영이 평행 → 순간중심 무한대 → 접지점에서 수평선 → 중심선 높이 0. 롤 1° 에 바깥 바퀴 지면 기준 +1° (3D 에서 앞뒤 다리가 대칭이면 2D 와 같음)'},
    {n:'정면 순간중심 작도 (아래 수평 z = 100, 위 기울기 40/300)', I:{f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uf_x:175, f_uf_y:250, f_uf_z:300, f_ur_x:-175, f_ur_y:250, f_ur_z:300, f_uo_x:0, f_uo_y:550, f_uo_z:340, f_ti_x:-70, f_ti_y:200, f_ti_z:100, f_to_x:-70, f_to_y:560, f_to_z:100}, expect:{ic_y_f:-1250, ic_z_f:100, fvsa_f:1850, rc_f:32.432432, camber_gain_f:0.675676, cgb_f:-0.030971},
     src:'위 팔 z = 300 + (y − 250) × 0.1333 = 100 → y = −1250. FVSA = 600 + 1250 = 1850, 롤센터 = 100 × 600 ÷ 1850, 롤 캠버 = 1 − 600 ÷ 1850, 범프 = −(1 ÷ 1850) rad/mm = −0.03097 °/mm'},
    {n:'킹핀 경사각 · 스크럽 (아래 볼조인트 y 560, z 100 · 위 y 550, z 340)', I:{f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uo_x:0, f_uo_y:550, f_uo_z:340}, expect:{kpi:2.385944, scrub:35.833333, caster:0, trail:0},
     src:'KPI = atan(10 ÷ 240) = 2.3859°, 킹핀축 지면 y = 560 + 10/240 × 100 = 564.17 → 스크럽 = 600 − 564.17 = 35.833 mm, 볼조인트 x 같음 → 캐스터 · 트레일 0'},
    {n:'캐스터 · 트레일 (위 볼조인트가 20 mm 뒤)', I:{f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uo_x:-20, f_uo_y:560, f_uo_z:340}, expect:{caster:4.763642, trail:8.333333, kpi:0, scrub:40},
     src:'캐스터 = atan(20 ÷ 240) = 4.7636°, 킹핀축 지면 x = 0 + 20/240 × 100 = 8.333 mm 앞 → 트레일 8.333 mm, 스크럽 = 600 − 560'},
    {n:'팔이 평행하게 기울면 (뒤, 기울기 0.1) → 롤센터 = −0.1 × t/2', I:{r_lf_x:175, r_lf_y:200, r_lf_z:100, r_lr_x:-175, r_lr_y:200, r_lr_z:100, r_lo_x:0, r_lo_y:560, r_lo_z:136, r_uf_x:175, r_uf_y:250, r_uf_z:300, r_ur_x:-175, r_ur_y:250, r_ur_z:300, r_uo_x:0, r_uo_y:550, r_uo_z:330, r_ti_x:-70, r_ti_y:200, r_ti_z:100, r_to_x:-70, r_to_y:560, r_to_z:136}, expect:{rc_r:-60},
     src:'순간중심 무한대 → 접지점 (600, 0) 에서 기울기 0.1 직선 → y = 0 에서 z = −60 mm'},
    {n:'안티다이브 (앞: 위 팔 회전축이 측면에서 기울기 0.2, 아래 수평)', I:{f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uf_x:175, f_uf_y:250, f_uf_z:335, f_ur_x:-175, f_ur_y:250, f_ur_z:265, f_uo_x:0, f_uo_y:560, f_uo_z:300, f_ti_x:-70, f_ti_y:200, f_ti_z:100, f_to_x:-70, f_to_y:560, f_to_z:100}, expect:{sv_x_f:-1000, sv_z_f:100, anti_dive:39.337931},
     src:'볼조인트는 측면에서 회전축과 평행하게 움직임 → 측면 순간중심 = 아래 선 z = 100 과 위 선 z = 300 + 0.2 x 의 교점 (−1000, 100). tanθ = 100 ÷ 1000, 안티다이브 = 0.1 × 1550 ÷ 290 × 0.736 = 39.338 %'},
    {n:'안티리프트 · 안티스쿼트 (뒤: 위 팔 기울기 −0.2 → 순간중심 (1000, 100), 바퀴 중심 236)', I:{r_lf_x:175, r_lf_y:200, r_lf_z:100, r_lr_x:-175, r_lr_y:200, r_lr_z:100, r_lo_x:0, r_lo_y:560, r_lo_z:100, r_uf_x:175, r_uf_y:250, r_uf_z:265, r_ur_x:-175, r_ur_y:250, r_ur_z:335, r_uo_x:0, r_uo_y:560, r_uo_z:300, r_ti_x:-70, r_ti_y:200, r_ti_z:100, r_to_x:-70, r_to_y:560, r_to_z:100, r_load:236}, expect:{sv_x_r:1000, sv_z_r:100, anti_lift:14.110345, anti_squat:-72.689655},
     src:'안티리프트 (접지점 기준) = 0.1 × 1550 ÷ 290 × 0.264 = 14.110 %, 안티스쿼트 (안쪽 구동 → 바퀴 중심 기준) tanθ = (100 − 236) ÷ 1000 = −0.136 → −0.136 × 1550 ÷ 290 = −72.69 %'},
    {n:'범프 스티어 (팔 평행 · 같은 길이 360, 킹핀 수직, 타이로드 안쪽이 50 mm 높음, 너클암 70 mm 뒤)', I:{f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uf_x:175, f_uf_y:200, f_uf_z:300, f_ur_x:-175, f_ur_y:200, f_ur_z:300, f_uo_x:0, f_uo_y:560, f_uo_z:300, f_ti_x:-70, f_ti_y:200, f_ti_z:250, f_to_x:-70, f_to_y:560, f_to_z:200}, expect:{bs_f:0.113682, rs_f:1.190476},
     src:'업라이트 평행 이동 (ω = 0) + 킹핀 둘레 ψ. 타이로드 길이 일정: 2 × 360 × (−70 dψ/ds) + 2 × (s − 50) = 0 (s = 0) → dψ/ds = −100 ÷ 50400 rad/mm → 토인 +0.11368 °/mm, 롤 스티어 = 0.11368 × 600 × π/180 = 1.1905 °/°'}
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
// 도구 5 서스 기하 (3D 기구학) — 계산 코드. 엔진 K3D 는 위 (공통)
// ================================================================
// 입력 I : 축마다 (f 앞 · r 뒤) 하드포인트 8 점 (K3D 머리말), 윤거 tf · tr, 하중 반경 r_load, 정적 캠버 camber_f · r, 정적 토 toe_f · r,
//          무게중심 h · 휠베이스 L · 밸런스 바 앞 몫 brake_bias (안티 % 용), 그래프 트래블 범위 s_max [mm]
// 결과 (정지 자세, 작은 움직임): 롤센터 · 정면 순간중심 · FVSA, 범프 캠버 게인 [deg/mm], 롤 캠버 게인 (바깥 바퀴 · 지면 기준) = 1 + 범프 게인 × (t/2) × π/180 [deg/deg],
//   KPI · 캐스터 · 스크럽 (접지점 y − 킹핀축 지면 y) · 트레일 (킹핀축 지면 x − 접지점 x), 바퀴 중심 킹핀 옵셋,
//   범프 스티어 [deg/mm, 토인 +], 롤 스티어 (바깥 바퀴) = 범프 스티어 × (t/2) × π/180 [deg/deg],
//   측면 순간중심 · 안티다이브 (앞, 바깥 브레이크) = tanθ × L/h × 앞 제동 몫, 안티리프트 (뒤, 바깥 브레이크) = tanθ × L/h × 뒤 몫, 안티스쿼트 (뒤, 안쪽 구동) = tanθ_WC × L/h
// 그래프: 휠 트래블 −s_max ~ +s_max 에서 캠버 · 토 · 롤센터 (양쪽 같이 오르내림) · 윤거 반 변화 · 캐스터 · KPI
function calc(I) {
  const ax = (s, t, cam, toe) => K3D.axle(I, s, t, I.r_load, cam, toe);
  const F = ax('f', I.tf, I.camber_f, I.toe_f), R = ax('r', I.tr, I.camber_r, I.toe_r);
  const mF = K3D.metrics(F), mR = K3D.metrics(R), D = K3D.D, h = I.h, L = I.L, bb = (I.brake_bias || 0) / 100;
  if (!(h > 0) || !(L > 0)) throw new Error('무게중심 높이 · 휠베이스는 0 보다 커야 합니다.');
  const rg = (m, t) => 1 + m.cgb * (t / 2) * D, rs = (m, t) => m.bs * (t / 2) * D, fin = x => isFinite(x) ? x : NaN;
  const out = {
    rc_f: mF.rc, ic_y_f: mF.icy, ic_z_f: mF.icz, fvsa_f: fin(mF.fvsa), cgb_f: mF.cgb, camber_gain_f: rg(mF, I.tf),
    kpi: mF.kpi, caster: mF.caster, scrub: mF.scrub, trail: mF.trail, kpo_f: mF.kpo, bs_f: mF.bs, rs_f: rs(mF, I.tf),
    sv_x_f: mF.icx, sv_z_f: mF.icz_sv, anti_dive: mF.v[0] / mF.v[2] * L / h * bb * 100,
    rc_r: mR.rc, ic_y_r: mR.icy, ic_z_r: mR.icz, fvsa_r: fin(mR.fvsa), cgb_r: mR.cgb, camber_gain_r: rg(mR, I.tr),
    kpi_r: mR.kpi, caster_r: mR.caster, scrub_r: mR.scrub, trail_r: mR.trail, kpo_r: mR.kpo, bs_r: mR.bs, rs_r: rs(mR, I.tr),
    sv_x_r: mR.icx, sv_z_r: mR.icz_sv, anti_lift: -mR.v[0] / mR.v[2] * L / h * (1 - bb) * 100, anti_squat: -mR.vw[0] / mR.vw[2] * L / h * 100,
    camber_f_o: I.camber_f, camber_r_o: I.camber_r, toe_f_o: I.toe_f, toe_r_o: I.toe_r,
  };
  // 트래블 곡선
  const sm = Math.max(5, I.s_max || 40), n = 40, xs = [], sig = { cf: [], cr: [], tf_: [], tr_: [], rcf: [], rcr: [], yf: [], yr: [], kf: [], cs: [] };
  let qF = null, qR = null; const XF0 = K3D.plain(mF.X), XR0 = K3D.plain(mR.X);
  for (let i = 0; i <= n; i++) { const s = -sm + 2 * sm * i / n; xs.push(+s.toFixed(3));
    const a = K3D.metrics(F, s), b = K3D.metrics(R, s);
    sig.cf.push(a.X.cam); sig.cr.push(b.X.cam); sig.tf_.push(-(a.X.head - XF0.head) + (I.toe_f || 0)); sig.tr_.push(-(b.X.head - XR0.head) + (I.toe_r || 0));
    sig.rcf.push(a.rc - a.X.CP[2]); sig.rcr.push(b.rc - b.X.CP[2]); sig.yf.push(a.X.CP[1] - XF0.CP[1]); sig.yr.push(b.X.CP[1] - XR0.CP[1]); sig.kf.push(a.kpi); sig.cs.push(a.caster); }
  const geo = { F: { P: F.P, X: XF0, t: I.tf, ic: [mF.icy, mF.icz], sv: [mF.icx, mF.icz_sv] }, R: { P: R.P, X: XR0, t: I.tr, ic: [mR.icy, mR.icz], sv: [mR.icx, mR.icz_sv] } };
  return { out, x: { d: xs }, sig, geo };
}
`
};
