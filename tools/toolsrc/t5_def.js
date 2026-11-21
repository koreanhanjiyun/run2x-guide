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
/* 2024 REF4 STEP 왼쪽 바퀴 (STEP 좌표 X 바깥 · Y 위 (지면 −74) · Z 앞 → 차 좌표 x = Z − 바퀴 중심 Z (앞 929.8 · 뒤 −650), y = X, z = Y + 74). 댐퍼 차체 쪽 눈 db = 몸통 끝 눈 고리의 원 맞춤 중심 (62차, 64차에 실측으로 되돌림). 정지 눈 사이 앞 202.4 · 뒤 185.0 mm. 쇽 = Fox DHX (2023 신품, 관리자) → 규격(다 늘어난 길이) 앞 210 · 뒤 190 mm 로 추정, CAD = 차 무게가 실린 정지 상태로 봄 (앞 7.6 · 뒤 5.0 mm 눌림), 스트로크 미확인 */
const K3D_HP = {
  f:{lf:[170.2, 212.7, 131.3], lr:[-179.8, 212.7, 131.3], lo:[2.0, 561.6, 151.2], uf:[170.2, 246.7, 288.0], ur:[-179.8, 246.7, 288.0], uo:[-11.6, 516.6, 346.0],
     ti:[12.2, 220.7, 169.5], to:[56.3, 550.1, 199.9], pa:[-4.8, 462.2, 361.4], pr:[-4.8, 314.0, 566.2], rp:[-4.8, 253.0, 551.0], rq:[95.2, 253.0, 551.0], dr:[-4.8, 250.8, 619.9], db:[-4.8, 48.6, 610.3]},
  r:{lf:[100, 218.1, 154.1], lr:[-25, 218.1, 154.1], lo:[-1, 539.6, 169.2], uf:[100, 251.6, 309.6], ur:[-25, 251.6, 309.6], uo:[-25, 501.5, 365.5],
     ti:[160, 218.1, 154.1], to:[59, 539.2, 169.1], pa:[5, 488.4, 193.3], pr:[5, 260.4, 401.0], rp:[5, 218.0, 362.0], rq:[105, 218.0, 362.0], dr:[5, 201.6, 439.1], db:[5, 21.9, 395.2]}};
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
  share:'hp', no:'5', stage:'P3-1~3', name:'서스 기하 (3D 기구학)',
  mainTitle:'정면 · 측면 기하', mainMeta:'왼쪽 바퀴 · 같은 축척',
  x:{n:'휠 트래블', u:'mm'}, xiStart:'mid',
  inputs:[
    {k:'tf', dk:'tf', v:1200, d:0, g:T5G.car}, {k:'tr', dk:'tr', v:1180, d:0, g:T5G.car}, {k:'r_load', dk:'r_load', v:236, d:0, g:T5G.car},
    {k:'camber_f', dk:'camber_f', v:-3, d:2, g:T5G.car}, {k:'camber_r', dk:'camber_r', v:-2, d:2, g:T5G.car}, {k:'toe_f', dk:'toe_f', v:0, d:2, g:T5G.car}, {k:'toe_r', dk:'toe_r', v:0, d:2, g:T5G.car},
    {k:'h', dk:'h', v:290, d:0, g:T5G.car}, {k:'L', dk:'L', v:1550, d:0, g:T5G.car}, {k:'brake_bias', dk:'brake_bias', v:73.6, d:1, g:T5G.car},
    {k:'s_max', n:'그래프 트래블 범위 (±)', u:'mm', v:40, d:0, g:T5G.car},
    {k:'margin_camber', dk:'margin_camber', u:'°', d:2, g:'공유 기록 (대시보드)', opt:true}, {k:'margin_toe', dk:'margin_toe', u:'°', d:2, g:'공유 기록 (대시보드)', opt:true},   /* 공유 기록 (계산에 안 씀, 2026-11-12) */
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
  figure: t5Fig, editFig:true, tour: M5TOUR,
  verifyBase:{camber_f:0, camber_r:0, toe_f:0, toe_r:0, tf:1200, tr:1200, h:290, L:1550, brake_bias:73.6},
  verify: /*@@VERIFY@@*/,
  code: /*@@CODE@@*/
};
