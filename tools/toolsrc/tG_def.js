/* ============================================================
   도구 2 목표 · 요구값 (경량 시뮬) — 설계 초반 (도구 1 직후) 목표 정하기
   - 입력은 그때 정해진 것만 (질량 · 무게중심 · 휠베이스 · 트레드 · 바퀴 반경 · 모터 토크 선도 · 감속비). 아직 안 정해진 계통 (축전지 · 인버터 · 서스 · 열)은 이상화하고
     다른 파트 값 (C_L·A · 질량 · 모터 토크 · 타이어 μ · 무게중심 높이 · 무게 배분 · 감속비) 은 손잡이로 훑어 '목표 기록 → 요구값' 그래프로 보임
   - 계산은 도구 2P 계산 코드 그대로 (차량 모델 0, 줄여 셈). 정밀 확인은 도구 2P 에서
   ============================================================ */
const GG = {car:'차 (도구 1 · 치수)', tire:'타이어 · 구동계', mot:'모터', aero:'에어로 (기본 · 묶음)', drv:'운전자 (현실 범위)', tg:'목표'};
const GTGN = [['0', '가속'], ['1', '스키드패드'], ['2', '오토크로스'], ['3', '내구'], ['4', '출발 g'], ['5', '횡 g'], ['6', '내구 에너지']];
/* 가로축 목표의 이름 · 단위 (계산 코드 GTG 와 같은 순서) */
const GTGU = [['목표 기록 · 가속', 's', 3], ['목표 기록 · 스키드패드', 's', 3], ['목표 기록 · 오토크로스', 's', 2], ['목표 기록 · 내구', 's', 0],
              ['목표 출발 종가속도', 'g', 3], ['목표 스키드패드 횡가속도', 'g', 3], ['목표 내구 에너지', 'kWh', 2]];
const gTgU = () => GTGU[Math.max(0, Math.min(GTGU.length - 1, Math.round((typeof WB!=='undefined' && WB.I && WB.I.tg) || 0)))];
document.addEventListener('click', e => { if(WB.id!=='G' || !e.target.closest) return;
  const gm = e.target.closest('[data-gtgm]'); if(gm){ WB.I.tgv_m = +gm.dataset.gtgm; wbSave(); wbPaint(['in']); wbCalcSoon(); return; }
  const a = e.target.closest('[data-gtg]'); if(a){ WB.I.tg = +a.dataset.gtg; WB.I.tgv_m = 0; wbSave(); wbPaint(['in']); wbCalcSoon(); return; }
  const c = e.target.closest('[data-gcop]'); if(c){ WB.I.cop_m = +c.dataset.gcop; wbSave(); wbPaint(['in']); wbCalcSoon(); } });
const MGTOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기가 있습니다.'],
  ['#wb .wb-in', '입력', '설계 초반에 정해진 것(도구 1 질량 · 무게중심, 치수, 모터 토크)만 넣습니다. 축전지 · 인버터 · 서스 · 열은 이상화하고(축전지 = 이상 전원), 다운포스는 양항비로 항력과 묶습니다. 맨 위 [목표]에서 가로축(종목 기록 · 출발 종가속도 · 스키드패드 횡가속도 · 내구 에너지)을 고르고, 목표값을 넣으면 그 값의 요구값이 결과에 나옵니다.'],
  ['#wb #wbout', '결과', '기본값 차의 종목 기록과, 목표값에서 손잡이마다 필요한 값(나머지는 기본값 그대로일 때)입니다. 빈칸은 그 손잡이 하나로는 닿지 못하는 목표입니다.'],
  ['#wb .wb-sig', '목표 → 요구값', '가로축 = 고른 목표(종목 기록 · 가속도 · 내구 에너지). 손잡이마다 그 기록을 내는 데 필요한 값과, 그때 딸려 바뀌는 값(다운포스 · 항력 · 내구 에너지 · 평균 출력 · 바퀴 토크)입니다. 신호를 여러 개 켜 같은 목표에서 비교합니다.'],
];
WB_TOOLS['G'] = {
  no:'2', stage:'P0', name:'목표 · 요구값 (경량 시뮬)',
  x:{ get n(){ return gTgU()[0]; }, get u(){ return gTgU()[1]; } }, xiStart:'mid',
  extraI: () => ({ base: typeof t2PartInputs === 'function' ? t2PartInputs() : {} }),
  /* 새 파일: 기본 차 값 (대시보드 설계값 · 도구 2P 새 파일 저장값) 이 비어 있으면 계산 안 함 */
  needExt(){ if(wbEx() || typeof t2PartInputs!=='function') return []; const B = t2PartInputs(), n = WB_TOOLS['2'].inputs.filter(d => d.ui!=='none' && d.dk && !isFinite(B[d.k])).length;
    return n ? [{k:'g:base', n:`기본 차 값 ${n}개 (대시보드 설계값 · 도구 2P 새 파일)`, g:'기본 차'}] : []; },
  inEff(k){ if(k==='tg_v'){ const o = WB.R && WB.R.out; return o && isFinite(o.tg_v_o) ? o.tg_v_o : null; } return null; },
  inLock(k){ if(k==='tg_v' && WB.I.tgv_m !== 1) return '기본 차 값'; if(k==='xcop') return WB.I.cop_m !== 0 ? '무게 배분과 같게' : ''; return ''; },
  inOpt(k){ const seg = (attr, cur, items) => `<span class="t2-inopt"><span class="dc-seg" role="group">${items.map(([v, t]) => `<button type="button" ${attr}="${v}" aria-pressed="${String(cur)===v}">${t}</button>`).join('')}</span></span>`;
    if(k==='tg_v') return seg('data-gtg', Math.round(WB.I.tg || 0), GTGN) + seg('data-gtgm', WB.I.tgv_m===1 ? 1 : 0, [['0', '기본 차 값'], ['1', '값 입력']]);   /* 목표값: 숫자 0 을 '기본 차 값' 스위치로 쓰지 않음 (2026-11-11) */
    if(k==='xcop') return seg('data-gcop', WB.I.cop_m !== 0 ? 1 : 0, [['1', '무게 배분'], ['0', '값 입력']]);
    return ''; },
  inputs:[
    {k:'tg', n:'가로축 목표 (0 가속 · 1 스키드패드 · 2 오토크로스 · 3 내구 · 4 출발 종가속도 · 5 횡가속도 · 6 내구 에너지)', u:'', v:1, d:0, g:GG.tg, ui:'none'},
    {k:'tgv_m', n:'목표값 정하기 (0 = 기본 차 값, 1 = 직접)', u:'', v:0, d:0, g:GG.tg, ui:'none'}, {k:'tg_v', n:'목표값', get u(){ return gTgU()[1]; }, v:0, d:3, g:GG.tg},
    {k:'m', dk:'m', v:300, d:0, g:GG.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:GG.car}, {k:'h', dk:'h', v:290, d:0, g:GG.car},
    {k:'L', dk:'L', v:1550, d:0, g:GG.car}, {k:'tf', dk:'tf', v:1200, d:0, g:GG.car}, {k:'tr', dk:'tr', v:1180, d:0, g:GG.car},
    {k:'r_eff', dk:'r_eff', n:'바퀴 유효 반경 (타이어 외경에서)', v:229, d:0, g:GG.tire}, {k:'mu', dk:'mu', n:'타이어 μ (문헌 · 예전 차)', v:1.5, d:2, g:GG.tire},
    {k:'mu_s', dk:'mu_s', n:'μ 하중 감도', v:0.246, d:3, g:GG.tire}, {k:'crr', dk:'crr', v:0.015, d:3, g:GG.tire},
    {k:'gr', dk:'gr', v:3.55, d:2, g:GG.tire}, {k:'eta_dt', dk:'eta_dt', v:95, d:0, g:GG.tire},
    {k:'tmax', dk:'tmax', n:'모터 최대 토크 (토크 표가 있으면 표)', v:230, d:0, g:GG.mot}, {k:'nmax', dk:'nmax', v:6500, d:0, g:GG.mot}, {k:'pmax', dk:'pmax', n:'최고 출력 (규정 상한)', v:80, d:0, g:GG.mot},
    {k:'eta_mot', n:'모터 효율 (상수)', u:'%', v:95, d:1, g:GG.mot}, {k:'eta_inv', n:'인버터 효율 (상수)', u:'%', v:97, d:1, g:GG.mot},
    {k:'cla', dk:'cla', n:'기본 C<sub>L</sub>·A (훑기 기준점)', v:3.0, d:2, g:GG.aero}, {k:'ld', n:'양항비 L/D (다운포스 ÷ 날개 항력)', u:'', v:2.5, d:2, g:GG.aero},
    {k:'cda0', n:'차체 C<sub>D</sub>·A (날개 없이)', u:'m²', v:0.2, d:2, g:GG.aero},
    {k:'cop_m', n:'압력중심 (1 = 무게 배분과 같게, 0 = 직접)', u:'', v:1, d:0, g:GG.aero, ui:'none'}, {k:'xcop', dk:'xcop', n:'압력중심 위치 (뒤축부터 앞으로)', v:698, d:0, g:GG.aero},
    {k:'dr_ks', n:'현실 운전자 그립 사용률 k_s', u:'', v:0.95, d:2, g:GG.drv, keep:true}, {k:'dr_ke', n:'현실 운전자 내구 페이스 k_e', u:'', v:0.7, d:2, g:GG.drv, keep:true},
    /* 팀 목표 기록 (2026-11-12): 계산에는 안 씀, 비워도 됨 (opt). 대시보드로 반영 · 가져오기만 */
    {k:'score_goal', dk:'score_goal', u:'점', d:0, g:'팀 목표 (대시보드)', opt:true}, {k:'t_acc', dk:'t_acc', u:'s', d:3, g:'팀 목표 (대시보드)', opt:true}, {k:'t_skid', dk:'t_skid', u:'s', d:3, g:'팀 목표 (대시보드)', opt:true},
    {k:'t_ax', dk:'t_ax', u:'s', d:2, g:'팀 목표 (대시보드)', opt:true}, {k:'t_end', dk:'t_end', u:'s', d:1, g:'팀 목표 (대시보드)', opt:true}, {k:'dist_goal', dk:'dist_goal', u:'km', d:0, g:'팀 목표 (대시보드)', opt:true},
  ],
  outputs:[
    {k:'b_acc', n:'가속', u:'s', d:3, g:'기본 차 기록 (이상 운전자)'}, {k:'b_skid', n:'스키드패드 (좌우 합)', u:'s', d:3, g:'기본 차 기록 (이상 운전자)'},
    {k:'b_ax', n:'오토크로스', u:'s', d:2, g:'기본 차 기록 (이상 운전자)'}, {k:'b_end', n:'내구 (3 랩 근사)', u:'s', d:0, g:'기본 차 기록 (이상 운전자)'},
    {k:'b_end_r', n:'내구 · 현실 운전자', u:'s', d:0, g:'기본 차 기록 (이상 운전자)'},
    {k:'b_e', n:'내구 단자 에너지', u:'kWh', d:2, g:'기본 차 요구값'}, {k:'b_e_r', n:'내구 단자 에너지 · 현실 운전자', u:'kWh', d:2, g:'기본 차 요구값'},
    {k:'b_p', n:'내구 평균 출력 (단자)', u:'kW', d:1, g:'기본 차 요구값'}, {k:'i_avg', n:'내구 평균 전류 (모터 기준 전압)', u:'A', d:0, g:'기본 차 요구값'},
    {k:'q_heat', n:'모터 + 인버터 평균 발열', u:'kW', d:2, g:'기본 차 요구값'}, {k:'b_tw', n:'바퀴 최대 구동력 (모터 토크 × 감속비)', u:'N', d:0, g:'기본 차 요구값'},
    {k:'b_ay', n:'스키드패드 횡가속도', u:'g', d:2, g:'기본 차 요구값'}, {k:'b_ax0', n:'출발 종가속도 (정지에서 최대)', u:'g', d:2, g:'기본 차 요구값'}, {k:'b_df', n:'다운포스 (100 km/h)', u:'N', d:0, g:'기본 차 요구값'},
    {k:'b_dr', n:'항력 (100 km/h)', u:'N', d:0, g:'기본 차 요구값'}, {k:'b_cda', n:'C_D·A (차체 + 날개)', u:'m²', d:2, g:'기본 차 요구값'}, {k:'b_xcop', n:'압력중심 (뒤축부터)', u:'mm', d:0, g:'기본 차 요구값'},
    {k:'tg_v_o', n:'목표값', get u(){ return gTgU()[1]; }, d:3, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'},
    {k:'p_cla', n:'C_L·A', u:'m²', d:2, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'}, {k:'p_df', n:'→ 다운포스 (100 km/h)', u:'N', d:0, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'},
    {k:'p_cda', n:'→ C_D·A', u:'m²', d:2, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'}, {k:'p_e', n:'→ 내구 에너지', u:'kWh', d:2, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'},
    {k:'p_m', n:'질량', u:'kg', d:0, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'}, {k:'p_tq', n:'모터 토크 배율', u:'%', d:0, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'},
    {k:'p_mu', n:'타이어 μ', u:'', d:2, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'}, {k:'p_h', n:'무게중심 높이', u:'mm', d:0, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'},
    {k:'p_fr', n:'앞 무게 비율', u:'%', d:1, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'}, {k:'p_gr', n:'감속비', u:'', d:2, g:'목표값에서 손잡이마다 필요한 값 (하나만 움직일 때)'},
  ],
  sigs:[
    {k:'q_cla', n:'필요 C_L·A', u:'m²', d:2}, {k:'q_clam', n:'필요 C_L·A · CoP 5 %p 뒤로', u:'m²', d:2}, {k:'q_clap', n:'필요 C_L·A · CoP 5 %p 앞으로', u:'m²', d:2},
    {k:'df_cla', n:'다운포스 100 km/h (C_L·A 로 낼 때)', u:'N', d:0}, {k:'dr_cla', n:'항력 100 km/h (C_L·A 로 낼 때)', u:'N', d:0},
    {k:'e_cla', n:'내구 에너지 (C_L·A 로 낼 때)', u:'kWh', d:2}, {k:'er_cla', n:'내구 에너지 · 현실 (C_L·A 로 낼 때)', u:'kWh', d:2}, {k:'p_cla', n:'내구 평균 출력 (C_L·A 로 낼 때)', u:'kW', d:1},
    {k:'ay_cla', n:'스키드패드 횡가속도 (C_L·A 로 낼 때)', u:'g', d:2},
    {k:'q_m', n:'필요 질량', u:'kg', d:0}, {k:'e_m', n:'내구 에너지 (질량으로 낼 때)', u:'kWh', d:2},
    {k:'q_tq', n:'필요 모터 토크 배율', u:'%', d:0}, {k:'tw_tq', n:'바퀴 최대 구동력 (토크로 낼 때)', u:'N', d:0}, {k:'e_tq', n:'내구 에너지 (토크로 낼 때)', u:'kWh', d:2}, {k:'p_tq', n:'내구 평균 출력 (토크로 낼 때)', u:'kW', d:1},
    {k:'q_mu', n:'필요 타이어 μ', u:'', d:2}, {k:'q_h', n:'필요 무게중심 높이', u:'mm', d:0}, {k:'q_fr', n:'필요 앞 무게 비율', u:'%', d:1}, {k:'q_gr', n:'필요 감속비', u:'', d:2},
  ],
  sigOn:['q_cla', 'q_m', 'q_tq'],
  tour: MGTOUR,
  verifyBase:{tg:1, tg_v:0, tgv_m:NaN, mu_s:0, crr:0, cop_m:1, cda0:0, ld:1e9,
    base: Object.assign(Object.fromEntries(WB_TOOLS['2'].inputs.map(d => [d.k, d.v])), WB_TOOLS['2'].verifyBase)},   // 검증: 도구 2P 기본값 · 검증 기본 (코스 없음)
  verify: /*@@VERIFY@@*/,
  code: /*@@CODE@@*/
};
