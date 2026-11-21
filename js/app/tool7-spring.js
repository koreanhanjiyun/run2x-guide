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
  verify: [
    {n:'휠 레이트 = 스프링 × 모션비², 타이어가 아주 단단하면 라이드 레이트 = 휠 레이트', I:{ks_f:40, mr_f:0.8, kt:1e9}, expect:{kw_f:25.6, kr_f:25.6},
     src:'40 × 0.8² = 25.6 N/mm, 25.6 × k_t ÷ (25.6 + k_t) → 25.6 (k_t → ∞)'},
    {n:'기본값 · 라이드 주파수 · 총 롤강성 · 롤 구배 · LLTD · 감쇠 (손계산 식, t7_hand.py)', I:{}, expect:{kr_f:26.713082, f_ride_f:3.379387, f_ride_r:3.307378, k_roll:807.884692, rsd:50.721377, h_ra:40.595238, roll_grad:0.804928, lltd:48.736727, z_f:0.482881, c_roll:30.031584, z_roll:0.730086},
     src:'휠 36.45 N/mm 와 타이어 100 N/mm 직렬 = 26.713 N/mm, 현가상 앞 코너 59.25 kg → 3.379 Hz. 축 롤강성 = (k_w t²/2 + ARB) 와 k_t t²/2 직렬, 합 807.88 N·m/°. 롤 축 높이 = (30 × 118.5 + 50 × 133.5) ÷ 252 = 40.595 mm, 롤 구배 = m_s g h′ ÷ (ΣK − m_s g h′) = 0.8049 °/g. LLTD = 앞 (현가상 앞 몫 + 탄성 몫 + 현가하) × t ÷ 합 = 48.737 %'},
    {n:'롤센터 0 · 현가하 거의 0 · 같은 윤거 · 단단한 타이어 → LLTD = 롤강성 배분', I:{rc_f:0, rc_r:0, m_us_f:0.001, m_us_r:0.001, tr:1200, kt:1e9, h_s:290}, expect:{lltd:49.963278, rsd:49.963278, h_ra:0},
     src:'기하 몫 · 현가하 몫이 0 이면 횡하중 이동은 탄성 몫뿐 → 앞 몫 = K_φf ÷ ΣK_φ (Milliken 18 장)'},
    {n:'1 g 앞 바퀴 하나 횡하중 이동 합 = m h g 와 맞음 (기본값, 앞 바퀴)', I:{}, expect:{dfz_f:343.281035},
     src:'ΔF_f = [118.5 × 9.81 × 0.03 + 252 × 9.81 × 0.2594 × 0.5072 + 2 × 12 × 9.81 × 0.22] ÷ 1.2 = 343.28 N'},
    {n:'기하 모션비 손계산 (팔 평행 · 같은 길이 360, 푸시로드가 아래 팔 y 400 에서 수직, 로커 팔 100 · 100 직각, 댐퍼 수평)', I:{mr_m:1, pa_arm_f:0, camber_f:0, tf:1200, r_load:236, ks_f:45, f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uf_x:175, f_uf_y:200, f_uf_z:300, f_ur_x:-175, f_ur_y:200, f_ur_z:300, f_uo_x:0, f_uo_y:560, f_uo_z:300, f_ti_x:-70, f_ti_y:200, f_ti_z:100, f_to_x:-70, f_to_y:560, f_to_z:100, f_pa_x:0, f_pa_y:400, f_pa_z:100, f_pr_x:0, f_pr_y:400, f_pr_z:300, f_rp_x:0, f_rp_y:300, f_rp_z:300, f_rq_x:100, f_rq_y:300, f_rq_z:300, f_dr_x:0, f_dr_y:300, f_dr_z:400, f_db_x:0, f_db_y:100, f_db_z:400}, expect:{mr_f_g:0.555556, kw_f:13.888889},
     src:'바퀴 1 mm 오름 → 아래 팔 끝 (반경 360) 1 mm → 푸시로드 점 (반경 200) 200/360 mm 위로 → 로커 (팔 100) 회전 200/360 ÷ 100 rad → 댐퍼 점 (팔 100) 200/360 mm 수평 → MR = 0.5556, 휠 레이트 = 45 × 0.5556² = 13.889 N/mm'},
    {n:'댐퍼 규격 손계산 (같은 기하 · 규격 210 · 스트로크 50 → 정지 눌림 10, 바닥 = 댐퍼 160 · 끝 = 210 mm 에서 로커 각 → 푸시로드 원 교점 → 바퀴 360 sin φ)', I:{sh_l_f:210, sh_s_f:50, mr_m:1, pa_arm_f:0, camber_f:0, tf:1200, r_load:236, ks_f:45, f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uf_x:175, f_uf_y:200, f_uf_z:300, f_ur_x:-175, f_ur_y:200, f_ur_z:300, f_uo_x:0, f_uo_y:560, f_uo_z:300, f_ti_x:-70, f_ti_y:200, f_ti_z:100, f_to_x:-70, f_to_y:560, f_to_z:100, f_pa_x:0, f_pa_y:400, f_pa_z:100, f_pr_x:0, f_pr_y:400, f_pr_z:300, f_rp_x:0, f_rp_y:300, f_rp_z:300, f_rq_x:100, f_rq_y:300, f_rq_z:300, f_dr_x:0, f_dr_y:300, f_dr_z:400, f_db_x:0, f_db_y:100, f_db_z:400}, expect:{sh_sag_f:10, sh_bump_f:72.486715, sh_reb_f:17.998640}, src:'ld(β) = |(200 − 100 sin β, 100 cos β − 100)|, |pa(φ) − pr(β)| = 200 (닫힌 식 원 교점, Python 확인)'},
    {n:'기본 점 (2024 STEP) 기하 모션비 · 독립 구현 비교', I:{mr_m:1, pa_arm_f:1, pa_arm_r:0, camber_f:-3, camber_r:-2, tf:1200, tr:1180, r_load:236}, expect:{mr_f_g:0.901663, mr_r_g:0.869474},
     src:'업라이트 6 자유도를 거리 구속 6 개로 따로 푼 Python (scipy root lm) → 볼조인트 위치에서 팔 각 → 로커 각 (brentq) → 댐퍼 길이 중앙 차분 (±0.5 mm)'}
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
// 도구 7 액추에이션 · 스프링 — 계산 코드. 엔진 K3D 는 위 (공통)
// ================================================================
// 입력 I : m [kg], fr [%], h · h_s [mm], L · tf · tr [mm], m_us_f · m_us_r [kg, 바퀴 하나], r_load [mm] (현가하 CG ≈ 바퀴 중심 높이),
//          rc_f · rc_r [mm] 롤센터, ks_f · ks_r [N/mm] 스프링, mr_f · mr_r [-] 모션비 (스프링 ÷ 바퀴), karb_f · karb_r [N·m/deg] ARB (바퀴 위치 롤강성),
//          kt [N/mm] 타이어 수직 강성, cd_f · cd_r [N·s/m] 댐퍼 감쇠 (댐퍼 위치), ixx [kg·m²] 롤 관성 (현가상, 롤 감쇠비용)
//          mr_m = 1 이면 모션비를 기하로: 축마다 하드포인트 8 점 + 푸시로드 팔 쪽 pa (붙은 팔 pa_arm_f · r: 0 아래 · 1 위) · 로커 쪽 pr, 로커 회전 중심 rp · 축 위 다른 점 rq,
//          댐퍼 로커 쪽 dr · 차체 쪽 db, 윤거 · 하중 반경 r_load · 정적 캠버 (바퀴 중심 자리), 그래프 트래블 범위 s_max
// 기하 모션비 (Milliken 17 장 · 가상일): 휠 트래블 s 마다 K3D 로 팔 각 θ 를 풀고, 팔에 붙은 푸시로드 끝 PA(θ) → 푸시로드 길이 일정 |PA − PR(β)| = L_p 로 로커 각 β (뉴턴),
//   댐퍼 길이 l_d(s) = |DB − DR(β)|, 모션비 MR(s) = −dl_d/ds (바퀴가 1 mm 오를 때 댐퍼가 줄어드는 양, 중앙 차분). 정지 자세 MR 을 아래 식에 씀.
//   휠 레이트 곡선 k_w(s) = k_s MR(s)² (스프링 힘 × dMR/ds 항은 뺌 — 예압이 작을 때 근사)
// 식 (Milliken & Milliken, Race Car Vehicle Dynamics 16 · 18 장):
//   휠 레이트 k_w = k_s × MR²,  라이드 레이트 k_r = k_w k_t ÷ (k_w + k_t)  (타이어와 직렬)
//   현가상 코너 질량 m_c = (축 질량 − 2 m_us) ÷ 2,  라이드 주파수 f = √(k_r ÷ m_c) ÷ 2π
//   축 롤강성 (바퀴 위치) K_φ = (k_w t² ÷ 2 + K_ARB) 와 타이어 k_t t² ÷ 2 의 직렬 [N·m/rad]
//   롤 축 높이 (현가상 CG 자리) h_ra = rc_f + (rc_r − rc_f) × a_s ÷ L,  a_s = 앞축에서 현가상 CG 까지 = L × (현가상 뒤 몫)
//   롤 구배 = m_s g (h_s − h_ra) ÷ (K_φf + K_φr − m_s g (h_s − h_ra))  [rad/g → deg/g]
//   횡하중 이동 (바퀴 하나, ay = 1 g): ΔF_f = [m_s,f a rc_f + m_s a (h_s − h_ra) K_φf ÷ ΣK_φ + 2 m_us,f a r_load] ÷ t_f  (현가상 앞 몫 · 탄성 몫 · 현가하)
//   LLTD (앞 몫) = ΔF_f t_f ÷ (ΔF_f t_f + ΔF_r t_r),  RSD = K_φf ÷ ΣK_φ
//   감쇠: 바퀴 위치 c_w = c_d × MR², 라이드 감쇠비 ζ = c_w ÷ (2 √(k_r m_c)) (타이어 직렬 근사 무시 · 휠 레이트 기준이면 k_w), 롤 감쇠 C_φ = c_w t² ÷ 2 (앞 + 뒤),
//         롤 감쇠비 ζ_φ = ΣC_φ ÷ (2 √(ΣK_φ I_xx))
const g = 9.81, D = Math.PI / 180;
function mrGeo(I, s, t, cam) {
  const A = K3D.axle(I, s, t, I.r_load, cam, 0, ['pa', 'pr', 'rp', 'rq', 'dr', 'db']), P = A.P, { sub, norm, unit, rotAbout } = K3D;
  const up = I['pa_arm_' + s] === 1, piv = up ? P.uf : P.lf, kA = unit(sub(up ? P.ur : P.lr, piv)), n = unit(sub(P.rq, P.rp));
  const Lp = norm(sub(P.pr, P.pa)), ld0 = norm(sub(P.db, P.dr));
  if (!(norm(sub(P.rq, P.rp)) > 0) || !(Lp > 0) || !(ld0 > 0)) throw new Error((s === 'f' ? '앞' : '뒤') + ' 로커 축 · 푸시로드 · 댐퍼 점이 겹칩니다.');
  let q = null, b = 0;
  const at = sz => { const X = K3D.pose(A, sz, 0, q); q = X.q; const PA = rotAbout(P.pa, piv, kA, up ? X.q[1] : X.q[0]);
    const g = bb => norm(sub(PA, rotAbout(P.pr, P.rp, n, bb))) - Lp;
    for (let i = 0; i < 40; i++) { const f = g(b), d = (g(b + 1e-7) - g(b - 1e-7)) / 2e-7; if (!(Math.abs(d) > 1e-12)) throw new Error('로커가 푸시로드 방향으로 돌지 못합니다 (점 배치 확인).'); const db = -f / d; b += db; if (Math.abs(db) < 1e-13) break; }
    return { ld: norm(sub(P.db, rotAbout(P.dr, P.rp, n, b))), b }; };
  const mr = sz => { const h = 0.01, qq = q, bq = b, p = at(sz + h), m = at(sz - h); q = qq; b = bq; return -(p.ld - m.ld) / (2 * h); };
  const mr0 = mr(0);
  /* 댐퍼 길이가 tgt 가 되는 바퀴 트래블 [mm] (dir +1 범프 · −1 리바운드). 0 에서 1 mm 씩 이어 풀다 지나치면 반으로 나눠 좁힘, 200 mm 안에 없으면 NaN */
  const reach = (tgt, dir) => { q = null; b = 0; let pl = ld0, ps = 0;
    for (let s = 1; s <= 200; s++) { const l = at(dir * s).ld;
      if ((l - tgt) * (pl - tgt) <= 0) { let a = ps, c = s, la = pl; for (let k = 0; k < 40; k++) { const m = (a + c) / 2, lm = at(dir * m).ld; if ((lm - tgt) * (la - tgt) <= 0) c = m; else { a = m; la = lm; } } return (a + c) / 2; }
      pl = l; ps = s; }
    return NaN; };
  return { mr0, ld0, at, mr, reach, curve(sm, nn) { const xs = [], m = [], dl = [], rk = []; q = null; b = 0; const z = at(0);
    for (let i = 0; i <= nn; i++) { const sz = -sm + 2 * sm * i / nn; q = null; b = 0;
      // 0 에서 sz 까지 이어 풂
      const st = Math.max(1, Math.ceil(Math.abs(sz) / 5)); let r; for (let j = 1; j <= st; j++) r = at(sz * j / st);
      xs.push(+sz.toFixed(3)); m.push(mr(sz)); dl.push(ld0 - r.ld); rk.push((r.b - z.b) / K3D.D); }
    return { xs, m, dl, rk }; } };
}
function calc(I) {
  const geo = I.mr_m === 1, sm = Math.max(5, I.s_max || 30);
  let GF = null, GR = null, mrf = I.mr_f, mrr = I.mr_r;
  if (geo) { GF = mrGeo(I, 'f', I.tf, I.camber_f); GR = mrGeo(I, 'r', I.tr, I.camber_r); mrf = GF.mr0; mrr = GR.mr0;
    if (!(mrf > 0) || !(mrr > 0)) throw new Error('기하 모션비가 0 이하입니다 (바퀴가 오를 때 댐퍼가 늘어남). 점 배치를 확인하세요.'); }
  I = Object.assign({}, I, { mr_f: mrf, mr_r: mrr });
  const L = I.L / 1000, tf = I.tf / 1000, tr = I.tr / 1000, h = I.h / 1000, hs = (I.h_s > 0 ? I.h_s : I.h) / 1000, rl = I.r_load / 1000;
  const rf = I.rc_f / 1000, rr = I.rc_r / 1000, fs = I.fr / 100, muf = I.m_us_f, mur = I.m_us_r;
  const ms = I.m - 2 * muf - 2 * mur, msf = I.m * fs - 2 * muf, msr = I.m * (1 - fs) - 2 * mur;
  if (!(ms > 0) || !(msf > 0) || !(msr > 0)) throw new Error('현가하질량(바퀴 하나 × 2)이 축 질량보다 큽니다.');
  const kt = I.kt * 1000;
  const kw = (ks, mr) => ks * 1000 * mr * mr, ser = (a, b) => a > 0 && b > 0 ? a * b / (a + b) : 0;
  const kwf = kw(I.ks_f, I.mr_f), kwr = kw(I.ks_r, I.mr_r), krf = ser(kwf, kt), krr = ser(kwr, kt);   // [N/m]
  const mcf = msf / 2, mcr = msr / 2, fr_ = (k, mc) => Math.sqrt(k / mc) / (2 * Math.PI);
  const Kax = (kwx, t, karb) => ser(kwx * t * t / 2 + karb / D, kt * t * t / 2);                        // [N·m/rad]
  const Kf = Kax(kwf, tf, I.karb_f), Kr = Kax(kwr, tr, I.karb_r), K = Kf + Kr;
  const as = L * msr / ms, hra = rf + (rr - rf) * as / L, hp = hs - hra;                               // 현가상 CG 자리 롤 축 높이 · 롤 팔
  const rg = ms * g * hp / (K - ms * g * hp);                                                          // [rad/g]
  const dFf = (msf * g * rf + ms * g * hp * Kf / K + 2 * muf * g * rl) / tf, dFr = (msr * g * rr + ms * g * hp * Kr / K + 2 * mur * g * rl) / tr;   // [N/g] 바퀴 하나
  const lltd = dFf * tf / (dFf * tf + dFr * tr);
  const cwf = I.cd_f * I.mr_f * I.mr_f, cwr = I.cd_r * I.mr_r * I.mr_r;                                // [N·s/m] 바퀴 위치
  const Cphi = cwf * tf * tf / 2 + cwr * tr * tr / 2;                                                  // [N·m·s/rad]
  const out = {
    kw_f: kwf / 1000, kw_r: kwr / 1000, kr_f: krf / 1000, kr_r: krr / 1000,                           // [N/mm]
    mc_f: mcf, mc_r: mcr, f_ride_f: fr_(krf, mcf), f_ride_r: fr_(krr, mcr),
    kphi_f: Kf * D, kphi_r: Kr * D, k_roll: K * D, rsd: Kf / K * 100,                                 // [N·m/deg] · [%]
    h_ra: hra * 1000, h_arm: hp * 1000, roll_grad: rg / D, lltd: lltd * 100,
    dfz_f: dFf, dfz_r: dFr,                                                                            // 1 g 에서 바퀴 하나 횡하중 이동 [N]
    z_f: cwf / (2 * Math.sqrt(krf * mcf)), z_r: cwr / (2 * Math.sqrt(krr * mcr)), c_roll: Cphi * D,   // 감쇠비 · [N·m·s/deg]
    z_roll: I.ixx > 0 ? Cphi / (2 * Math.sqrt(K * I.ixx)) : NaN,
    ms: ms, ks_f_o: I.ks_f, ks_r_o: I.ks_r, mr_f_o: I.mr_f, mr_r_o: I.mr_r, karb_f_o: I.karb_f, karb_r_o: I.karb_r, cd_f_o: I.cd_f, cd_r_o: I.cd_r,
  };
  out.mr_geo = geo ? 1 : 0; out.mr_f_g = geo ? mrf : NaN; out.mr_r_g = geo ? mrr : NaN;
  if (!geo) { const xs = [], N = 30; for (let i = 0; i <= N; i++) xs.push(+(-sm + 2 * sm * i / N).toFixed(3)); const cst = v => xs.map(() => v), dl = (m) => xs.map(x => m * x);
    return { out, x: { d: xs }, sig: { mrf: cst(mrf), mrr: cst(mrr), kwf: cst(I.ks_f * mrf * mrf), kwr: cst(I.ks_r * mrr * mrr), dlf: dl(mrf), dlr: dl(mrr), rkf: cst(NaN), rkr: cst(NaN) } }; }
  const cF = GF.curve(sm, 30), cR = GR.curve(sm, 30), pr = (c) => (c.m[c.m.length - 1] - c.m[0]) / c.m[(c.m.length - 1) / 2] * 100;
  /* 댐퍼 규격 (다 늘어난 눈 사이 길이 Lf · 스트로크 S): 정지 눌림 = Lf − ld0, 범프 여유 = 댐퍼가 S − 눌림 만큼 더 줄어드는 바퀴 트래블 (바닥), 리바운드 여유 = 댐퍼가 Lf 까지 늘어나는 바퀴 트래블 (끝까지 늘어남) */
  const shk = (G, Lf, S) => { const sag = Lf - G.ld0; if (!(Lf > 0) || !(S > 0)) return [NaN, NaN, NaN];
    return [sag, sag < S ? G.reach(Lf - S, 1) : 0, sag > 0 ? G.reach(Lf, -1) : 0]; };
  { const [sf, bf, rf2] = shk(GF, I.sh_l_f, I.sh_s_f), [sr, br, rr2] = shk(GR, I.sh_l_r, I.sh_s_r);
    Object.assign(out, { sh_sag_f: sf, sh_bump_f: bf, sh_reb_f: rf2, sh_sag_r: sr, sh_bump_r: br, sh_reb_r: rr2 }); }
  Object.assign(out, { prog_f: pr(cF), prog_r: pr(cR), ld0_f: GF.ld0, ld0_r: GR.ld0, dl_f: cF.dl[cF.dl.length - 1], dl_r: cR.dl[cR.dl.length - 1], rk_f: cF.rk[cF.rk.length - 1], rk_r: cR.rk[cR.rk.length - 1] });
  return { out, x: { d: cF.xs }, sig: { mrf: cF.m, mrr: cR.m, kwf: cF.m.map(m => I.ks_f * m * m), kwr: cR.m.map(m => I.ks_r * m * m), dlf: cF.dl, dlr: cR.dl, rkf: cF.rk, rkr: cR.rk } };
}
`
};
