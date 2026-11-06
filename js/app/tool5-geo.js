/* ============================================================
   도구 5 서스 기하 (간이판: 정면 2D) — docs/TOOLS-PLAN.md 5절
   - 더블 위시본 정면 하드포인트(축마다 4점)로 순간중심 · 롤센터 · 정면 스윙암 · 캠버 게인(범프 · 롤) · 킹핀 경사각 · 스크럽
   - 3D 기구학 엔진(측면 안티 지오메트리, 범프 · 롤 스티어, 큰 움직임)은 나중에. 입출력 키는 3D 판과 같게 둠
   - 대시보드로 rc_f · rc_r · camber_gain_f · camber_gain_r · kpi · scrub 를 보내면 도구 7 · 도구 2 차량 모델 1 이 받아 씀
   ============================================================ */
/* 정면 그림: 축마다 오른쪽 절반 (중심선 왼쪽 끝), 위 · 아래 팔, 접지점 → 순간중심 선, 롤센터 */
function t5Fig(I, R){ if(!R || !R.geo) return ''; const f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  const one = (G, nm, rc) => { const W = 360, H = 250, sc = 0.42, ox = 20, oy = H - 30, X = y => ox + y*sc, Y = z => oy - z*sc;
    const line = (P, c, w, dash) => `<line x1="${X(P[0][0]).toFixed(1)}" y1="${Y(P[0][1]).toFixed(1)}" x2="${X(P[1][0]).toFixed(1)}" y2="${Y(P[1][1]).toFixed(1)}" stroke="${c}" stroke-width="${w}"${dash ? ' stroke-dasharray="5 4"' : ''}/>`;
    const tw = 180, tr = 230;   // 바퀴 폭 · 반경 (그림용)
    let s = `<svg viewBox="0 0 ${W} ${H}" class="t5-svg" role="img" aria-label="${nm} 정면 기하"><line x1="0" x2="${W}" y1="${oy}" y2="${oy}" stroke="#8a8f99"/>
      <line x1="${X(0)}" x2="${X(0)}" y1="10" y2="${oy}" stroke="#b9bec8" stroke-dasharray="3 4"/><text x="${X(0) + 4}" y="20" class="t5-tx">중심선</text>
      <rect x="${X(G.h - tw/2).toFixed(1)}" y="${Y(2*tr).toFixed(1)}" width="${(tw*sc).toFixed(1)}" height="${(2*tr*sc).toFixed(1)}" rx="6" fill="#e9ecf1" stroke="#9aa3b5"/>`;
    // 접지점 → IC (그림 안까지), 롤센터
    const cp = [G.h, 0];
    if(G.ic){ s += line([cp, G.ic], '#6A4294', 1.2, true); s += line([G.L1[0], G.ic], '#c2c7d0', 1, true) + line([G.L2[0], G.ic], '#c2c7d0', 1, true); }
    s += line(G.L1, '#1d5f9a', 3) + line(G.L2, '#c2410c', 3) + line([G.L1[1], G.L2[1]], '#5f6973', 2);
    [G.L1[0], G.L1[1], G.L2[0], G.L2[1]].forEach(P => { s += `<circle cx="${X(P[0]).toFixed(1)}" cy="${Y(P[1]).toFixed(1)}" r="3.5" fill="#fff" stroke="#26303c" stroke-width="1.5"/>`; });
    if(isFinite(rc)) s += `<circle cx="${X(0)}" cy="${Y(rc).toFixed(1)}" r="5" fill="#6A4294"/><text x="${X(0) + 8}" y="${(Y(rc) - 6).toFixed(1)}" class="t5-tx b">롤센터 ${f(rc, 1)} mm</text>`;
    s += `<circle cx="${X(cp[0]).toFixed(1)}" cy="${oy}" r="3.5" fill="#26303c"/><text x="${X(cp[0]) - 10}" y="${oy + 16}" class="t5-tx">접지점</text>`;
    return `<figure class="t5-fig"><figcaption>${nm}</figcaption>${s}</svg></figure>`; };
  return `<div class="t5-figs">${one(R.geo.F, '앞축', R.out.rc_f)}${one(R.geo.R, '뒤축', R.out.rc_r)}</div>
    <p class="muted t5-note">파랑 = 아래 팔, 주황 = 위 팔, 보라 점선 = 접지점 → 순간중심 (그림 밖에 있을 수 있음). 오른쪽 절반만, 축척 같음. 순간중심 · 롤센터는 대칭 · 작은 움직임 근사입니다.</p>`; }
const M5TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '축마다 위 · 아래 팔의 안쪽 · 바깥 점을 정면에서 넣습니다. y 는 차 중심선에서 바깥으로, z 는 지면에서 위로 [mm]. 바깥 점은 업라이트 볼조인트 중심입니다.'],
  ['#wb #wbmain', '정면 그림', '팔 · 접지점 → 순간중심 선 · 롤센터를 그립니다.'],
  ['#wb #wbout', '결과', '롤센터 높이, 순간중심, 정면 스윙암(FVSA), 범프 캠버 게인(°/mm) · 롤 캠버 게인(°/°, 바깥 바퀴 지면 기준), 킹핀 경사각 · 스크럽입니다.'],
];
const T5G = {f:'앞축 정면 점 (y 바깥 +, z 위 +)', r:'뒤축 정면 점 (y 바깥 +, z 위 +)', t:'윤거'};
const t5P = (s, G, v) => [['ly_i', '아래 팔 안쪽 y'], ['lz_i', '아래 팔 안쪽 z'], ['ly_o', '아래 팔 바깥 y'], ['lz_o', '아래 팔 바깥 z'], ['uy_i', '위 팔 안쪽 y'], ['uz_i', '위 팔 안쪽 z'], ['uy_o', '위 팔 바깥 y'], ['uz_o', '위 팔 바깥 z']]
  .map(([k, n], j) => ({k:s + '_' + k, n, u:'mm', v:v[j], d:0, g:G}));
WB_TOOLS['5'] = {
  no:'5', stage:'P3-1~3', name:'서스 기하 (정면 2D 간이판)',
  noSig:true, mainTitle:'정면 기하', mainMeta:'오른쪽 절반 · 같은 축척',
  inputs:[
    {k:'tf', dk:'tf', v:1200, d:0, g:T5G.t}, {k:'tr', dk:'tr', v:1180, d:0, g:T5G.t},
    ...t5P('f', T5G.f, [200, 120, 560, 130, 250, 290, 540, 330]), ...t5P('r', T5G.r, [200, 120, 555, 130, 250, 290, 535, 325]),
  ],
  outputs:[
    {k:'rc_f', dk:'rc_f', d:1, g:'앞축'}, {k:'ic_y_f', n:'순간중심 y', u:'mm', d:0, g:'앞축'}, {k:'ic_z_f', n:'순간중심 z', u:'mm', d:0, g:'앞축'}, {k:'fvsa_f', n:'정면 스윙암 (FVSA, 평행이면 —)', u:'mm', d:0, g:'앞축'},
    {k:'cgb_f', n:'범프 캠버 게인 (차체 기준)', u:'°/mm', d:4, g:'앞축'}, {k:'camber_gain_f', dk:'camber_gain_f', d:3, g:'앞축'}, {k:'kpi', dk:'kpi', d:2, g:'앞축'}, {k:'scrub', dk:'scrub', d:1, g:'앞축'},
    {k:'rc_r', dk:'rc_r', d:1, g:'뒤축'}, {k:'ic_y_r', n:'순간중심 y', u:'mm', d:0, g:'뒤축'}, {k:'ic_z_r', n:'순간중심 z', u:'mm', d:0, g:'뒤축'}, {k:'fvsa_r', n:'정면 스윙암 (FVSA, 평행이면 —)', u:'mm', d:0, g:'뒤축'},
    {k:'cgb_r', n:'범프 캠버 게인 (차체 기준)', u:'°/mm', d:4, g:'뒤축'}, {k:'camber_gain_r', dk:'camber_gain_r', d:3, g:'뒤축'}, {k:'kpi_r', n:'킹핀 경사각 (뒤)', u:'°', d:2, g:'뒤축'}, {k:'scrub_r', n:'스크럽 (뒤)', u:'mm', d:1, g:'뒤축'},
  ],
  figure: t5Fig, tour: M5TOUR,
  verifyBase:{},
  verify: [
    {n:'위 · 아래 팔 수평 평행 → 롤센터 = 지면, 롤 캠버 게인 1 (바퀴가 차체와 같이 기욺)', I:{f_ly_i:200, f_lz_i:120, f_ly_o:560, f_lz_o:120, f_uy_i:250, f_uz_i:300, f_uy_o:550, f_uz_o:300}, expect:{rc_f:0, camber_gain_f:1, cgb_f:0},
     src:'IC 무한대 → 접지점에서 수평선 → 중심선 높이 0. FVSA 무한대 → 범프 캠버 변화 0, 롤 1° 에 바깥 바퀴 지면 기준 +1°'},
    {n:'순간중심 작도 (아래 수평 z = 100, 위 기울기 40/300, 윤거 1200)', I:{tf:1200, f_ly_i:200, f_lz_i:100, f_ly_o:560, f_lz_o:100, f_uy_i:250, f_uz_i:300, f_uy_o:550, f_uz_o:340}, expect:{ic_y_f:-1250, ic_z_f:100, fvsa_f:1850, rc_f:32.432432, camber_gain_f:0.675676, cgb_f:-0.030971},
     src:'위 팔 z = 300 + (y − 250) × 0.1333 = 100 → y = −1250. FVSA = 600 + 1250 = 1850, 롤센터 = 100 × 600 ÷ 1850 = 32.432 mm, 롤 캠버 = 1 − 600 ÷ 1850 = 0.6757, 범프 = −(1 ÷ 1850) rad/mm = −0.03097 °/mm'},
    {n:'킹핀 경사각 · 스크럽 (아래 바깥 560, 100 · 위 바깥 550, 340)', I:{tf:1200, f_ly_o:560, f_lz_o:100, f_uy_o:550, f_uz_o:340}, expect:{kpi:2.385944, scrub:35.833333},
     src:'KPI = atan(10 ÷ 240) = 2.3859°, 킹핀축 지면 y = 560 + 10/240 × 100 = 564.17 → 스크럽 = 600 − 564.17 = 35.833 mm'},
    {n:'팔이 평행하게 기울면 (기울기 0.1) → 롤센터 = −0.1 × t/2', I:{tr:1200, r_ly_i:200, r_lz_i:100, r_ly_o:560, r_lz_o:136, r_uy_i:250, r_uz_i:300, r_uy_o:550, r_uz_o:330}, expect:{rc_r:-60},
     src:'IC 무한대 → 접지점 (600, 0) 에서 기울기 0.1 직선 → y = 0 에서 z = −60 mm'}
  ],
  code: `// ================================================================
// 도구 5 서스 기하 (간이판: 정면 2D) — 계산 코드
// ================================================================
// 입력 I : 축마다 (앞 f · 뒤 r) 더블 위시본 정면 점 [mm] — y = 차 중심선에서 바깥으로 +, z = 지면에서 위로 +
//          아래 팔 안쪽 (ly_i, lz_i) · 바깥 (ly_o, lz_o), 위 팔 안쪽 (uy_i, uz_i) · 바깥 (uy_o, uz_o), 윤거 tf · tr (접지점 y = t/2, z = 0)
// 식 (Milliken & Milliken 17 장, 정면 순간중심 작도 — 대칭 · 작은 움직임 근사):
//   순간중심 IC = 위 · 아래 팔 직선의 교점 (평행이면 무한대)
//   롤센터 높이 = 접지점과 IC 를 이은 직선이 중심선 (y = 0) 과 만나는 높이 = z_IC × (t/2) ÷ (t/2 − y_IC)   (평행이면 접지점에서 팔 기울기로)
//   정면 스윙암 FVSA = 접지점에서 IC 까지 수평 거리 = t/2 − y_IC (IC 가 안쪽이면 +)
//   범프 캠버 게인 = −1 ÷ FVSA [rad/m] (바퀴가 오르면 IC 가 안쪽일 때 − 캠버, 차체 기준)
//   롤 캠버 게인 (바깥 바퀴, 지면 기준) = 1 − (t/2) ÷ FVSA [deg/deg]  (롤 φ 에 바깥 바퀴가 φ t/2 오름 + 차체가 φ 기욺)
//   킹핀 경사각 KPI = atan((y_아래바깥 − y_위바깥) ÷ (z_위바깥 − z_아래바깥)),  스크럽 = 접지점 y − 킹핀축이 지면과 만나는 y
const D = Math.PI / 180;
function axle(I, s, t) {
  const L1 = [[I[s + '_ly_i'], I[s + '_lz_i']], [I[s + '_ly_o'], I[s + '_lz_o']]], L2 = [[I[s + '_uy_i'], I[s + '_uz_i']], [I[s + '_uy_o'], I[s + '_uz_o']]];
  const h = t / 2, d1 = [L1[1][0] - L1[0][0], L1[1][1] - L1[0][1]], d2 = [L2[1][0] - L2[0][0], L2[1][1] - L2[0][1]], den = d1[0] * d2[1] - d1[1] * d2[0];
  let ic = null, rc, fvsa;
  if (Math.abs(den) < 1e-9 * Math.hypot(...d1) * Math.hypot(...d2)) {                    // 평행: IC 무한대 → 접지점에서 팔 방향 직선
    const sl = d1[1] / d1[0]; rc = -sl * h; fvsa = Infinity;
  } else {
    const u = ((L2[0][0] - L1[0][0]) * d2[1] - (L2[0][1] - L1[0][1]) * d2[0]) / den;
    ic = [L1[0][0] + u * d1[0], L1[0][1] + u * d1[1]]; fvsa = h - ic[0];
    rc = Math.abs(fvsa) < 1e-9 ? NaN : ic[1] * h / fvsa;
  }
  const kpi = Math.atan2(L1[1][0] - L2[1][0], L2[1][1] - L1[1][1]) / D;                   // 위로 갈수록 안쪽이면 +
  const yk0 = L1[1][0] + (L1[1][0] - L2[1][0]) / (L2[1][1] - L1[1][1]) * L1[1][1];          // 킹핀축의 지면 y
  return { ic, rc, fvsa, cgb: isFinite(fvsa) ? -1 / fvsa / D : 0, cgr: isFinite(fvsa) ? 1 - h / fvsa : 1, kpi, scrub: h - yk0, L1, L2, h };
}
function calc(I) {
  const F = axle(I, 'f', I.tf), R = axle(I, 'r', I.tr), fin = x => isFinite(x) ? x : NaN;
  const out = {
    rc_f: fin(F.rc), rc_r: fin(R.rc), fvsa_f: fin(F.fvsa), fvsa_r: fin(R.fvsa),   // 평행 팔 = 스윙암 무한대 (—)
    ic_y_f: F.ic ? F.ic[0] : NaN, ic_z_f: F.ic ? F.ic[1] : NaN, ic_y_r: R.ic ? R.ic[0] : NaN, ic_z_r: R.ic ? R.ic[1] : NaN,
    cgb_f: F.cgb, cgb_r: R.cgb, camber_gain_f: F.cgr, camber_gain_r: R.cgr,     // 범프 [deg/mm] · 롤 [deg/deg]
    kpi: F.kpi, scrub: F.scrub, kpi_r: R.kpi, scrub_r: R.scrub,
  };
  return { out, geo: { F, R } };
}
`
};
