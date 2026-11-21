
/* ---------- 도구 2P 와 주고받기 */
const t9Read = id => { try{ return JSON.parse(localStorage.getItem(wbStoreKey(id)) || '{}') || {}; }catch(e){ return {}; } };
/* 부품이 수랭 회로에 있으면 1 (도구 2P 수랭), 아니면 0 (공랭 덕트 · 회로 밖 → 도구 2P 공랭 = 부품 hA) */
const t9IsWater = p => { const C = t9CoolWhere(p); return C && C.kind==='water' ? 1 : 0; };
function t9ExtHTML(){ const w = $('#wb'); if(w) w.classList.remove('t2-edit');   // 도구 2P 에서 바로 넘어온 경우
  return `<div class="t9-x">${t9XBar()}
    ${t9CoolPage()}</div>`; }
/* 주고받기 줄 (계산 결과가 바뀌면 이것만 다시 그림: onResult) */
function t9XBar(){ return ''; }   /* 도구 2P 와 주고받기는 윗줄 [도구 연결 ▾] 로 옮김 (2026-11-11) */
/* [도구 연결 ▾]: 도구 2P 시뮬 결과 (주행 평균 발열 · 평균 차속 · 주행 시간) 가져오기. 2P 의 설정값은 가져오지 않음, 다른 도구로 보내기도 없음 (2026-11-12):
   상세값은 바깥 도구 → 2P 로 모이고, 2P 는 시뮬 결과 (발열 · 평균 차속 · 주행 시간) 만 내보냄 (관리자 결정 2026-11-12). 2P 설정을 옮기려면 JSON 내보내기 · 가져오기 */
function t9Links(){ const s2 = t9Read('2'), o = WB.R && WB.R.out, D = WB_TOOLS['9'].inputs, u = k => (D.find(d => d.k===k) || {}).u || '', fv = (v, k) => isFinite(v) ? `${+(+v).toPrecision(4)} ${u(k)}`.trim() : '—';
  const C2 = typeof t2Cwc==='function' ? ((t2Cwc().cool || {}).circuits || []) : [];
  const parts = ['m', 'i', 'b'].map((p, j) => `${['모터', '인버터', '축전지'][j]} ${t9IsWater(p) ? '수랭' : '공랭'}`).join(' · ');
  return {
    get:(() => { const r = (() => { try{ return JSON.parse(localStorage.getItem(wbMK('run2x.t2.res')) || 'null'); }catch(e){ return null; } })(), ok = !!(r && isFinite(r.c_qm)), why = '도구 2P 랩 시뮬을 한 번 계산하면 가져올 수 있음';
      const row = (n, keys, vals, cat) => ({tool:'도구 2P', n, cat, to:`입력 › ${n}`, now:keys.map(k => fv(WB.I[k], k)).join(' · '), val:ok ? vals().map((v, i) => fv(v, keys[i])).join(' · ') : '', ok, why,
        run(){ const v = vals(); keys.forEach((k, i) => { WB.I[k] = v[i]; }); wbSrcSet('9', keys, '도구 2P'); return n; }});
      return [row('주행 평균 발열 (모터 손실 · 인버터 손실 · 축전지 발열)', ['L_m', 'L_i', 'L_b'], () => [+r.c_qm.toFixed(1), +r.c_qi.toFixed(1), +r.c_qb.toFixed(1)], '주행 조건'),
        row('평균 차속', ['v'], () => [+r.c_vavg.toFixed(2)], '주행 조건'), row('주행 시간', ['t_run'], () => [Math.round(r.c_trun)], '주행 조건')]; })(),
    info:[] }; }
/* (옛 [data-t9x] 주고받기 단추 처리는 2026-11-12 에 지움: 단추는 2026-11-11 에 [도구 연결 ▾] 로 옮겨 없음) */

/* ============================================================ 이 탭 사용법 */
const M9TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 손계산 비교표), 입력 내보내기 · 가져오기입니다. 냉각 배치는 이 브라우저에 기억됩니다.'],
  ['#wb .wb-in', '입력', '주행 조건(외기 · 평균 차속 · 주행 시간 · 출발 온도), 주행 평균 발열(모터 · 인버터 손실, 축전지 발열), 부품 열 값(열용량 · 냉각수까지 열저항 · 공랭 hA)입니다. 발열은 일정하다고 봅니다. 도구 2P 에서 보내거나 [도구 2P 부품 열 값 가져오기]로 채웁니다.'],
  ['#wb [data-wblink]', '도구 연결', '[도구 연결 ▾]에서 도구 2P 와 주고받습니다. 가져오기 = 도구 2P 의 모터 · 인버터 · 축전지 열 값 · 외기 온도를 이 도구 입력 칸으로, 보내기 = 이 배치(수랭 회로 · 라디 · 펌프 · 공랭 덕트)와 부품 수랭 / 공랭을 도구 2P 의 냉각 회로로. 무엇이 어디를 덮어쓰는지 표로 보고 체크한 것만 옮깁니다 (복사, 그 뒤로는 따로). 가져온 칸에는 "도구 2P에서" 표시가 붙습니다. 결과의 등가값은 회로를 냉각수 하나로 줄인 참고값 (대시보드 냉각 값)입니다.'],
  ['#wb .t9-cool', '냉각 배치', '수랭 회로 · 공랭 덕트를 블럭으로 놓고 오른쪽 점을 끌어 다음 블럭에 이어 줍니다(선 방향 = 냉각수 · 공기 흐름). 블럭은 끌어서 옮기고(다른 블럭과 줄이 맞으면 붙음), 누르면 입력(라디 면적 · UA · 팬, 펌프 유량, 냉각수 양)이 나옵니다. 한 블럭에서 호스를 둘 이상 끌어내면 갈라지고(번호 · 비율 %), 여러 호스가 한 블럭으로 들어오면 합쳐집니다. 호스 · 블럭을 누르고 Delete 키로 지웁니다. 수랭은 라디에이터 1개 이상(처음 넣은 라디가 기준) · 펌프 1개, 공랭은 입구 → 부품 → 출구. 회로에 없는 부품은 외기로 바로 식습니다.'],
  ['#wb #wbout', '결과', '정상 온도(평균 차속에서 발열이 계속될 때), 주행 시간 뒤 온도(출발 온도에서), 도구 2P 등가값입니다. 수랭 회로 1 의 라디 입구는 들어오는 냉각수가 섞인 온도, 출구는 기준 라디에서 나가는 온도입니다.'],
  ['#wb .wb-sig', '온도 그래프', '출발 온도에서 주행 시간 동안 부품 · 냉각수(회로마다 라디 입구) 온도입니다. 가로축을 입력 훑기로 바꾸면 평균 차속 · 발열 등을 바꿔 가며 정상 온도를 볼 수 있습니다.'],
];

/* ============================================================ 도구 정의 */
const T9G = {run:'주행 조건', heat:'발열 (주행 평균, 일정)', m:'모터 열', i:'인버터 열', b:'축전지 열'};
WB_TOOLS['9'] = {
  no:'9', stage:'P4-5', name:'냉각 계통 계산기',
  x:{n:'시간', u:'s'},
  sweepFirst:'v',
  inputs:[
    {k:'t_amb', n:'외기 온도', u:'°C', v:25, d:0, g:T9G.run}, {k:'v', dk:'v_end_avg', n:'평균 차속', u:'km/h', v:53, d:1, g:T9G.run, sw:[0, 120]},
    {k:'t_run', n:'주행 시간', u:'s', v:1390, d:0, g:T9G.run}, {k:'t0', n:'출발 온도', u:'°C', v:25, d:0, g:T9G.run},
    {k:'L_m', dk:'q_mot', n:'모터 손실', u:'W', v:750, d:0, g:T9G.heat}, {k:'L_i', dk:'q_inv', n:'인버터 손실', u:'W', v:490, d:0, g:T9G.heat}, {k:'L_b', dk:'q_bat', n:'축전지 발열', u:'W', v:1180, d:0, g:T9G.heat},
    {k:'th_c', n:'모터 열용량', u:'J/K', v:6000, d:0, g:T9G.m}, {k:'th_r', n:'모터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.02, d:4, g:T9G.m},
    {k:'m_ha0', n:'모터 공랭 hA (정지)', u:'W/K', v:10, d:1, g:T9G.m}, {k:'m_ha60', n:'모터 공랭 hA (60 km/h)', u:'W/K', v:40, d:1, g:T9G.m},
    {k:'i_c', n:'인버터 열용량', u:'J/K', v:2000, d:0, g:T9G.i}, {k:'i_r', n:'인버터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T9G.i},
    {k:'i_ha0', n:'인버터 공랭 hA (정지)', u:'W/K', v:5, d:1, g:T9G.i}, {k:'i_ha60', n:'인버터 공랭 hA (60 km/h)', u:'W/K', v:20, d:1, g:T9G.i},
    {k:'b_c', n:'축전지 열용량', u:'J/K', v:30000, d:0, g:T9G.b}, {k:'b_r', n:'축전지 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T9G.b},
    {k:'b_ha', n:'축전지 공랭 hA (정지)', u:'W/K', v:15, d:1, g:T9G.b}, {k:'b_ha60', n:'축전지 공랭 hA (60 km/h)', u:'W/K', v:15, d:1, g:T9G.b},
  ],
  outGroups:{'한 덩어리로 줄인 등가값 (대시보드 · 참고)':{note:'회로를 냉각수 하나로 줄인 값 (UA = 냉각수로 버린 열 ÷ (손실 가중 평균 냉각수 온도 − 외기)). 도구 2P 는 [냉각 회로] 방식이면 배치를 그대로 쓰고, 이 값은 대시보드 냉각 값으로만 씀'}},
  outputs:[
    {k:'s_tm', n:'모터', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_ti', n:'인버터', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_tb', n:'축전지', u:'°C', d:1, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'s_win', n:'라디 입구 (수랭 회로 1, 섞인 온도)', u:'°C', d:2, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_wout', n:'라디 출구 (수랭 회로 1 기준 라디)', u:'°C', d:2, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'s_qw', n:'냉각수로 버리는 열', u:'W', d:0, g:'정상 온도 (평균 차속, 발열 일정)'}, {k:'s_qa', n:'공기로 바로 버리는 열', u:'W', d:0, g:'정상 온도 (평균 차속, 발열 일정)'},
    {k:'e_tm', n:'모터', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'}, {k:'e_ti', n:'인버터', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'}, {k:'e_tb', n:'축전지', u:'°C', d:1, g:'주행 시간 뒤 (출발 온도에서)'},
    {k:'e_win', n:'라디 입구 (수랭 회로 1)', u:'°C', d:2, g:'주행 시간 뒤 (출발 온도에서)'},
    {k:'w_q', n:'수랭 회로 1 유량', u:'L/min', d:2, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'}, {k:'q_cw', dk:'cool_c', n:'냉각수 열용량 (모든 수랭 회로)', u:'J/K', d:0, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'}, {k:'q_ua0', dk:'cool_ua0', n:'라디에이터 UA 등가 (정지)', u:'W/K', d:1, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'},
    {k:'q_ua60', dk:'cool_ua60', n:'라디에이터 UA 등가 (60 km/h)', u:'W/K', d:1, g:'한 덩어리로 줄인 등가값 (대시보드 · 참고)'},
    {k:'n_w', n:'수랭 회로 수', u:'', d:0, g:'정상 온도 (평균 차속, 발열 일정)', hide:true}, {k:'n_a', n:'공랭 덕트 수', u:'', d:0, g:'정상 온도 (평균 차속, 발열 일정)', hide:true},
  ],
  sigs:[
    {k:'tm', n:'모터 온도', u:'°C', d:1}, {k:'ti', n:'인버터 온도', u:'°C', d:1}, {k:'tb', n:'축전지 온도', u:'°C', d:1},
    {k:'w1', n:'수랭 회로 1 라디 입구', u:'°C', d:2}, {k:'w2', n:'수랭 회로 2 라디 입구', u:'°C', d:2}, {k:'w3', n:'수랭 회로 3 라디 입구', u:'°C', d:2},
  ],
  sigOn:['tm', 'ti', 'tb', 'w1'],
  xiStart:'end',
  links: () => t9Links(),
  /* 회로의 빈칸 (빨간 점선 블럭 · 호스 · 냉각수) → 필수 목록 · 편집 탭 빨간 점 (2026-11-12) */
  needExt(){ if(wbEx()) return []; return ((T9.cool || {}).circuits || []).filter(C => C.blocks.length && t9Blank(C).length).map(C => ({k:'t9:' + C.id, n:`${C.name} 빈칸`, g:'냉각 회로'})); },
  lnkKeys:['L_m', 'L_i', 'L_b', 'v', 't_run'],   /* 도구 2P 시뮬 결과로 받는 칸 */
  extHTML: t9ExtHTML, extraI: () => ({cool: t9CoolCompile().net}),
  extGet: () => ({cool:JSON.parse(JSON.stringify(T9.cool))}),   /* .json 내보내기에 회로 배치도 */
  extSet(d){ if(d && d.cool && Array.isArray(d.cool.circuits)){ T9.cool = d.cool; t9Save(); wbPaint(['ext']); } },
  exReset(){ try{ localStorage.removeItem(wbMK(T9KEY)); }catch(e){} T9.cool = T9COOL_DEF(); },
  tour: M9TOUR,
  verifyBase:{cool:{water:[], air:[]}, t_run:0, t0:25, t_amb:25},
  verify: /*@@VERIFY@@*/,
  code: /*@@CODE@@*/
};
