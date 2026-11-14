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
  share:'hp', no:'8', stage:'P4-1', name:'하중 산출 (3D)',
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
  verify: /*@@VERIFY@@*/,
  code: /*@@CODE@@*/
};
