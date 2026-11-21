/* ============================================================
   도구 7 액추에이션 · 스프링 — docs/TOOLS-PLAN.md 5절
   - 모션비: [기하] 3D 하드포인트 + 푸시로드 · 로커 · 댐퍼 점으로 휠 트래블마다 모션비 곡선 (엔진 K3D, 기본 점 = 2024 REF4 STEP) · [상수] 직접 입력
   - 휠 · 라이드 레이트, 라이드 주파수, 롤강성 · 롤 구배,
     횡하중 이동 배분(LLTD) · 롤강성 배분(RSD), 감쇠비 · 롤 감쇠를 계산
   - 대시보드로 kw · f_ride · k_roll · roll_grad · lltd · rsd · c_roll 을 보내면 도구 2P 차량 모델 1 · 2 · 3 이 받아 씀
   ============================================================ */
const M7TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '차 질량 · 무게중심 · 현가하질량(1번 도구), 롤센터(5번 도구), 스프링 · 모션비 · ARB · 타이어 수직 강성 · 댐퍼입니다. 모션비는 스프링 ÷ 바퀴(바퀴 1 mm 에 스프링이 줄어드는 양)이고, [기하]를 고르면 아래 푸시로드 · 로커 · 댐퍼 점(도구 5 와 같은 좌표)으로 셈합니다.'],
  ['#wb .wb-sig', '모션비 곡선', '가로축 = 휠 트래블(바퀴 중심이 차체에 대해 오르면 +). 기하 모션비 · 휠 레이트 · 댐퍼 줄어듦 · 로커 회전입니다. 상수 모션비면 평평합니다.'],
  ['#wb #wbout', '결과', '레이트 · 주파수, 롤(롤강성 · 롤 구배 · 롤 축 높이), 하중 이동(LLTD · RSD · 1 g 바퀴 하나 이동량), 감쇠입니다. LLTD 는 롤센터 경로 · 스프링 경로 · 현가하 몫을 모두 더한 전체 횡하중 이동의 앞 몫이고, RSD 는 롤강성만의 앞 몫입니다.'],
];
const T7G = {car:'차 (1번 · 5번 도구)', spr:'스프링 · ARB · 타이어', dmp:'댐퍼', geo:'기하 모션비 (바퀴)'};
const t7Pt = ['lf', 'lr', 'lo', 'uf', 'ur', 'uo', 'ti', 'to', 'pa', 'pr', 'rp', 'rq', 'dr', 'db'];
const T7GEO = new RegExp('^[fr]_(' + t7Pt.join('|') + ')_[xyz]$');
document.addEventListener('click', e => { if(WB.id!=='7' || !e.target.closest) return; const t = e.target;
  const m = t.closest('[data-t7mr]'); if(m){ WB.I.mr_m = +m.dataset.t7mr; wbSave(); wbPaint(['in']); wbCalcSoon(); return; }
  const a = t.closest('[data-t7pa]'); if(a){ const [s, v] = a.dataset.t7pa.split(':'); WB.I['pa_arm_' + s] = +v; wbSave(); wbPaint(['in']); wbCalcSoon(); return; } });
WB_TOOLS['7'] = {
  share:'hp', no:'7', stage:'P3-6~7', name:'액추에이션 · 스프링',
  x:{n:'휠 트래블', u:'mm'}, xiStart:'mid',
  inLock(k){ if((k==='mr_f' || k==='mr_r') && WB.I.mr_m === 1) return '기하로 셈'; if(WB.I.mr_m !== 1 && (T7GEO.test(k) || /^sh_[ls]_[fr]$/.test(k))) return '상수 모션비'; return ''; },
  inEff(k){ const o = WB.R && !WB.err && WB.R.out; if(k==='mr_f') return o ? o.mr_f_o : '…'; if(k==='mr_r') return o ? o.mr_r_o : '…'; return undefined; },
  inOpt(k){ const seg = (attr, cur, items) => `<span class="dc-seg" role="group">${items.map(([v, t]) => `<button type="button" ${attr}="${v}" aria-pressed="${cur===v}">${t}</button>`).join('')}</span>`;
    if(k==='mr_f') return `<span class="t2-inopt">${seg('data-t7mr', WB.I.mr_m === 1 ? 1 : 0, [[1, '기하'], [0, '상수']])}</span>`;
    const pm = /^([fr])_pa_x$/.exec(k); if(pm){ const s = pm[1], cur = s + ':' + (WB.I['pa_arm_' + s] === 1 ? 1 : 0); return `<span class="t2-inopt">${seg('data-t7pa', cur, [[s + ':0', '아래 팔'], [s + ':1', '위 팔']])}</span>`; }
    return ''; },
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:T7G.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T7G.car}, {k:'h', dk:'h', v:290, d:0, g:T7G.car}, {k:'h_s', dk:'h_s', v:300, d:0, g:T7G.car},
    {k:'L', dk:'L', v:1550, d:0, g:T7G.car}, {k:'tf', dk:'tf', v:1200, d:0, g:T7G.car}, {k:'tr', dk:'tr', v:1180, d:0, g:T7G.car},
    {k:'m_us_f', dk:'m_us_f', v:12, d:1, g:T7G.car}, {k:'m_us_r', dk:'m_us_r', v:12, d:1, g:T7G.car}, {k:'r_load', dk:'r_load', n:'현가하 CG 높이 (하중 반경)', v:236, d:0, g:T7G.car},
    {k:'rc_f', dk:'rc_f', v:30, d:0, g:T7G.car}, {k:'rc_r', dk:'rc_r', v:50, d:0, g:T7G.car}, {k:'ixx', dk:'ixx', n:'롤 관성 모멘트 (롤 감쇠비용)', v:30, d:1, g:T7G.car},
    {k:'ks_f', dk:'ks_f', v:45, d:1, g:T7G.spr}, {k:'ks_r', dk:'ks_r', v:50, d:1, g:T7G.spr}, {k:'mr_f', dk:'mr_f', v:0.9, d:3, g:T7G.spr}, {k:'mr_r', dk:'mr_r', v:0.9, d:3, g:T7G.spr},
    {k:'karb_f', dk:'karb_f', v:150, d:0, g:T7G.spr}, {k:'karb_r', dk:'karb_r', v:100, d:0, g:T7G.spr}, {k:'kt', dk:'kt_tire', v:100, d:0, g:T7G.spr},
    {k:'cd_f', dk:'cd_f', v:1500, d:0, g:T7G.dmp}, {k:'cd_r', dk:'cd_r', v:1500, d:0, g:T7G.dmp},
    /* 댐퍼 규격 (예제 = Fox DHX 2023 신품 (관리자) → 2022+ DHX 눈-눈 규격에서 CAD 정지 길이 202.4 · 185.0 mm 바로 위: 앞 210 · 뒤 190, 스트로크는 확인 못 함 → 가정 앞 55 · 뒤 45) */
    {k:'sh_l_f', dk:'damper_len', n:'댐퍼 규격 길이 (앞, 다 늘어난 눈 사이)', u:'mm', v:210, d:1, g:T7G.dmp}, {k:'sh_s_f', dk:'damper_stroke', n:'댐퍼 스트로크 (앞)', u:'mm', v:55, d:1, g:T7G.dmp},
    {k:'sh_l_r', dk:'damper_len', n:'댐퍼 규격 길이 (뒤, 다 늘어난 눈 사이)', u:'mm', v:190, d:1, g:T7G.dmp}, {k:'sh_s_r', dk:'damper_stroke', n:'댐퍼 스트로크 (뒤)', u:'mm', v:45, d:1, g:T7G.dmp},
    /* 공유 기록 (2026-11-12): 계산에는 안 씀, 비워도 됨 (opt). 대시보드로 반영 · 가져오기만 */
    {k:'k_heave', dk:'k_heave', u:'N/mm', d:1, g:'공유 기록 (대시보드)', opt:true}, {k:'zeta', dk:'zeta', u:'', d:2, g:'공유 기록 (대시보드)', opt:true}, {k:'dh_max', dk:'dh_max', u:'mm', d:1, g:'공유 기록 (대시보드)', opt:true},
    {k:'mr_m', n:'모션비 (1 = 기하, 0 = 상수)', u:'', v:0, d:0, g:T7G.spr, ui:'none'},
    {k:'camber_f', dk:'camber_f', v:-3, d:2, g:T7G.geo}, {k:'camber_r', dk:'camber_r', v:-2, d:2, g:T7G.geo}, {k:'s_max', n:'그래프 트래블 범위 (±)', u:'mm', v:30, d:0, g:T7G.geo},
    {k:'pa_arm_f', n:'앞 푸시로드가 붙은 팔 (1 = 위, 0 = 아래)', u:'', v:1, d:0, g:T7G.geo, ui:'none'}, {k:'pa_arm_r', n:'뒤 푸시로드가 붙은 팔 (1 = 위, 0 = 아래)', u:'', v:0, d:0, g:T7G.geo, ui:'none'},
    ...k3dIn('f', t7Pt), ...k3dIn('r', t7Pt),
  ],
  outputs:[
    {k:'kw_f', dk:'kw_f', d:2, g:'레이트 · 주파수'}, {k:'kw_r', dk:'kw_r', d:2, g:'레이트 · 주파수'}, {k:'kr_f', n:'라이드 레이트 (앞, 타이어 직렬)', u:'N/mm', d:2, g:'레이트 · 주파수'},
    {k:'kr_r', n:'라이드 레이트 (뒤, 타이어 직렬)', u:'N/mm', d:2, g:'레이트 · 주파수'}, {k:'mc_f', n:'현가상 코너 질량 (앞)', u:'kg', d:1, g:'레이트 · 주파수'}, {k:'mc_r', n:'현가상 코너 질량 (뒤)', u:'kg', d:1, g:'레이트 · 주파수'},
    {k:'f_ride_f', dk:'f_ride_f', d:2, g:'레이트 · 주파수'}, {k:'f_ride_r', dk:'f_ride_r', d:2, g:'레이트 · 주파수'},
    {k:'kphi_f', n:'롤강성 (앞축)', u:'N·m/°', d:1, g:'롤'}, {k:'kphi_r', n:'롤강성 (뒤축)', u:'N·m/°', d:1, g:'롤'}, {k:'k_roll', dk:'k_roll', d:1, g:'롤'},
    {k:'h_ra', n:'롤 축 높이 (현가상 CG 자리)', u:'mm', d:1, g:'롤'}, {k:'h_arm', n:'롤 팔 (현가상 CG − 롤 축)', u:'mm', d:1, g:'롤'}, {k:'roll_grad', dk:'roll_grad', d:3, g:'롤'},
    {k:'lltd', dk:'lltd', d:1, g:'하중 이동'}, {k:'rsd', dk:'rsd', d:1, g:'하중 이동'}, {k:'dfz_f', n:'1 g 횡하중 이동 (앞 바퀴 하나)', u:'N', d:0, g:'하중 이동'}, {k:'dfz_r', n:'1 g 횡하중 이동 (뒤 바퀴 하나)', u:'N', d:0, g:'하중 이동'},
    {k:'z_f', n:'라이드 감쇠비 (앞)', u:'', d:3, g:'감쇠'}, {k:'z_r', n:'라이드 감쇠비 (뒤)', u:'', d:3, g:'감쇠'}, {k:'c_roll', dk:'c_roll', d:2, g:'감쇠'}, {k:'z_roll', n:'롤 감쇠비', u:'', d:3, g:'감쇠'},
    {k:'mr_f_g', n:'모션비 (앞, 정지)', u:'mm/mm', d:3, g:'모션비 (기하)'}, {k:'mr_r_g', n:'모션비 (뒤, 정지)', u:'mm/mm', d:3, g:'모션비 (기하)'},
    {k:'prog_f', n:'모션비 변화 (앞, −s ~ +s, 정지 대비)', u:'%', d:1, g:'모션비 (기하)'}, {k:'prog_r', n:'모션비 변화 (뒤, −s ~ +s, 정지 대비)', u:'%', d:1, g:'모션비 (기하)'},
    {k:'ld0_f', n:'댐퍼 길이 (앞, 정지 · 눈 중심 사이)', u:'mm', d:1, g:'모션비 (기하)'}, {k:'ld0_r', n:'댐퍼 길이 (뒤, 정지)', u:'mm', d:1, g:'모션비 (기하)'},
    {k:'sh_sag_f', n:'댐퍼 정지 눌림 (앞, 규격 길이 − 정지 길이)', u:'mm', d:1, g:'댐퍼 트래블'}, {k:'sh_sag_r', n:'댐퍼 정지 눌림 (뒤)', u:'mm', d:1, g:'댐퍼 트래블'},
    {k:'sh_bump_f', n:'바퀴 범프 여유 (앞, 댐퍼 바닥까지)', u:'mm', d:1, g:'댐퍼 트래블'}, {k:'sh_bump_r', n:'바퀴 범프 여유 (뒤, 댐퍼 바닥까지)', u:'mm', d:1, g:'댐퍼 트래블'},
    {k:'sh_reb_f', n:'바퀴 리바운드 여유 (앞, 댐퍼 끝까지 늘어남)', u:'mm', d:1, g:'댐퍼 트래블'}, {k:'sh_reb_r', n:'바퀴 리바운드 여유 (뒤, 댐퍼 끝까지 늘어남)', u:'mm', d:1, g:'댐퍼 트래블'},
    {k:'dl_f', n:'댐퍼 줄어듦 (앞, +s 범프)', u:'mm', d:1, g:'모션비 (기하)'}, {k:'dl_r', n:'댐퍼 줄어듦 (뒤, +s 범프)', u:'mm', d:1, g:'모션비 (기하)'},
    {k:'rk_f', n:'로커 회전 (앞, +s 범프)', u:'°', d:2, g:'모션비 (기하)'}, {k:'rk_r', n:'로커 회전 (뒤, +s 범프)', u:'°', d:2, g:'모션비 (기하)'},
    {k:'ks_f_o', dk:'ks_f', d:1, g:'감쇠', hide:true}, {k:'ks_r_o', dk:'ks_r', d:1, g:'감쇠', hide:true}, {k:'mr_f_o', dk:'mr_f', d:3, g:'감쇠', hide:true}, {k:'mr_r_o', dk:'mr_r', d:3, g:'감쇠', hide:true},
    {k:'karb_f_o', dk:'karb_f', d:0, g:'감쇠', hide:true}, {k:'karb_r_o', dk:'karb_r', d:0, g:'감쇠', hide:true}, {k:'cd_f_o', dk:'cd_f', d:0, g:'감쇠', hide:true}, {k:'cd_r_o', dk:'cd_r', d:0, g:'감쇠', hide:true},
  ],
  sigs:[{k:'mrf', n:'모션비 (앞)', u:'mm/mm', d:3}, {k:'mrr', n:'모션비 (뒤)', u:'mm/mm', d:3}, {k:'kwf', n:'휠 레이트 (앞)', u:'N/mm', d:2}, {k:'kwr', n:'휠 레이트 (뒤)', u:'N/mm', d:2},
        {k:'dlf', n:'댐퍼 줄어듦 (앞)', u:'mm', d:2}, {k:'dlr', n:'댐퍼 줄어듦 (뒤)', u:'mm', d:2}, {k:'rkf', n:'로커 회전 (앞)', u:'°', d:2}, {k:'rkr', n:'로커 회전 (뒤)', u:'°', d:2}],
  sigOn:['mrf', 'mrr'],
  tour: M7TOUR,
  verifyBase:{mr_m:0, r_load:220},   // 예전 손계산 (모션비 상수) 그대로, 기하 경우는 mr_m 1 로 따로
  verify: /*@@VERIFY@@*/,
  code: /*@@CODE@@*/
};
