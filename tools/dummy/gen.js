/* 더미 팀 만들기 — 페이지 안에서 돎 (make.js 가 시안 화면에 넣어 실행). 사이트의 항목 · 대시보드 키 · 도구 예제를 그대로 씀.
   결과 = 팀 백업 형식(run2x-team-backup) + members(시안 전용, 실제 [가져오기]는 무시) */
async (opt) => {
  const SEASONS = ['2025', '2026'], NOW = '2026', iso = d => new Date(Date.UTC(2026, 10, 10) - d*864e5).toISOString();
  let seed = 7; const rnd = () => (seed = (seed*16807) % 2147483647) / 2147483647;   /* 늘 같은 결과 */
  /* ---------- 사람: 회장 · 팀장(샤시 · 전기) · 파트마다 파트장 · 팀원 (졸업생 2025만 · 신입 2026만) ---------- */
  const M = {};
  const put = (uid, name, email, role, parts, seasons) => { M[uid] = {role, parts, name, email, seasons}; };
  const both = r => ({'2025': r, '2026': r});
  put('u1', '한회장(회장)', 'admin@demo.run2x', 'admin', [], both({role:'admin', parts:[]}));
  put('u5', '최샤시(팀장)', 'chassis@demo.run2x', 'head', ['샤시'], both({role:'head', parts:['샤시']}));
  put('u6', '정전기(팀장)', 'elec@demo.run2x', 'head', ['전기', '회로'], both({role:'head', parts:['전기', '회로']}));
  put('u3', '박서스(파트장)', 'lead@demo.run2x', 'lead', ['서스', '조향'], both({role:'lead', parts:['서스', '조향']}));
  put('u4', '이배터리(파트장)', 'bat@demo.run2x', 'lead', ['배터리', '냉각'], both({role:'lead', parts:['배터리', '냉각']}));
  put('u2', '김팀원(팀원)', 'member@demo.run2x', 'member', [], both({role:'member', parts:[]}));
  const F = '김이박최정강조윤장임한오서신권황안송류홍', G = ['민준','서연','도윤','하은','시우','지아','주원','서준','예린','건우','수아','현우','지호','유나','은우','채원','준서','다인','태윤','소율'];
  const LEADP = ['프레임', '제동', '구동계', '모터컨트롤러', '회로', '데이터로거', '에어로'].filter(p => Object.values(PCODE).includes(p));
  const nm = k => F[k % F.length] + G[(k*7) % G.length];
  LEADP.forEach((p, i) => put('l' + i, nm(i + 3) + '(파트장)', `l${i}@demo.run2x`, 'lead', [p], both({role:'lead', parts:[p]})));
  for(let k = 0; k < 36; k++){ const grad = k % 6 === 5, fresh = k % 7 === 3, r = {role:'member', parts:[]}, s = {};
    if(!fresh) s['2025'] = r; if(!grad) s['2026'] = r;
    put('x' + k, nm(k + 11), `m${k}@demo.run2x`, 'member', [], s); }
  const leadOf = p => (Object.entries(M).find(([u, m]) => m.role === 'lead' && m.parts.includes(p)) || ['u1'])[0];
  const pick = a => a[Math.floor(rnd()*a.length)];
  const memNow = Object.keys(M).filter(u => M[u].seasons['2026'] && M[u].role === 'member'), mem25 = Object.keys(M).filter(u => M[u].seasons['2025'] && M[u].role === 'member');
  /* ---------- 대시보드 설계값 (dv): 도구 예제 입력값, 없으면 아래 표 (FS 차량 기준 그럴듯한 값) ---------- */
  const BASE = {m_s:240, left:50.2, a_cg:835, iyy:95, ride_h_f:40, ride_h_r:45, fw_gap:35, gc_min:30, score_goal:650, t_acc:4.2, t_ax:62, t_end:1500, ay_max:1.6, ay_max_sim:1.65, k_us:0.3, k_us_meas:0.35,
    rim_d:10, rim_in:25, c_alpha_f:650, c_alpha_r:700, scrub:20, kpi:7, caster:5, trail:18, camber_gain_f:0.8, camber_gain_r:0.6, anti_dive:15, anti_squat:20, roll_grad:1.0, kw_f:22, kw_r:26, f_ride_f:3.2, f_ride_r:3.5,
    k_heave:40, zeta:0.7, dh_max:20, margin_camber:0.5, margin_toe:0.1, meas_camber_load:0.2, meas_toe_load:0.05, rmin:3.2, ackermann:60, knuckle_l:70, sw_d:260, sw_torque_max:8, disc_t:4, pv_knee:30, pv_slope:0.5,
    pedal_force:650, aero_bal:45, dh_sens:0.5, has_drs:0, cla_drs:2.0, cda_drs:0.9, xcop_drs:900, vmax:120, lsd_preload:10, lsd_ramp_acc:45, lsd_ramp_dec:60, slip_target:10, p_endur:35, e_lap:0.3, e_pack:7.4, v_pack:400,
    m_pack:42, driver_k:0.95, q_cool:6, cool_c:15000, cool_ua0:60, cool_ua60:250, k_tors:2500, dist_goal:22};
  const SRC = {}; Object.entries(WB_TOOLS).forEach(([id, T]) => (T.inputs || []).forEach(d => { if(d.dk && isFinite(d.v) && !(d.dk in BASE)){ BASE[d.dk] = d.v; SRC[d.dk] = `도구 ${T.no || id} ${T.name || ''}`.trim(); } }));
  Object.entries(WB_TOOLS).forEach(([id, T]) => (T.outputs || []).forEach(d => { if(d.dk && !SRC[d.dk]) SRC[d.dk] = T.name; }));   /* 계산값: 낸 도구 (src) → 그 도구 입력이 검토 중이면 따라서 검토 중 */
  const rd = (v, ref) => { const a = Math.abs(ref); const dg = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : 3; return +v.toFixed(dg); };
  const dv = {}, SHOWN = new Set(DASH.GROUPS.flatMap(g => g[1].map(r => r[0])));
  DKEYS.forEach((d, i) => { const b = BASE[d.k]; if(!isFinite(b)) return; const s = {};
    SEASONS.forEach((se, j) => { if(se === NOW && rnd() < 0.3 && !d.calc && !SHOWN.has(d.k)) return;   /* 이번 시즌은 70 % 쯤만 (대시보드 화면 칸은 다 채움 → 그림이 그려짐) */
      const v = d.u === '예/아니오' ? b : rd(se === NOW ? b : b*(1 + (rnd() - 0.5)*0.08), b);
      const st = se === NOW && !d.calc && rnd() < 0.2 ? 'rev' : 'ok';   /* 확정 · 검토 중 (2026 만 20 % 검토 중). 계산값은 kind 'calc' — 쓰는 값이 검토 중이면 따라서 검토 중으로 보임 */
      s[se] = {v, st, kind: d.calc ? 'calc' : 'in', src: SRC[d.k] || '', by: leadOf(d.p), at: iso(se === NOW ? 3 + i % 25 : 230 + i % 60)}; });
    if(Object.keys(s).length) dv[`${PCODE_OF[d.p] || 'all'}__${d.k}`] = {s}; });
  /* ---------- 진행 상태: 2025 거의 끝 · 2026 앞 단계 위주 ---------- */
  const status = {}, its = ITEMS.slice().sort((a, b) => (SIDX[a.s] || 0) - (SIDX[b.s] || 0));
  its.forEach((it, i) => { const f = i/its.length, by = leadOf(it.p);
    const v25 = f < 0.86 ? 'done' : f < 0.92 ? 'skip' : f < 0.96 ? 'doing' : null;
    const v26 = f < 0.22 ? 'done' : f < 0.34 ? (i % 3 === 0 ? 'doing' : 'done') : f < 0.42 ? (i % 4 === 0 ? 'doing' : null) : (i % 17 === 0 ? 'doing' : null);
    if(v25) status[`2025-${it.id}`] = {v:v25, season:'2025', item:it.id, part:it.p, by, at:iso(300 - i % 40)};
    if(v26) status[`2026-${it.id}`] = {v:v26, season:'2026', item:it.id, part:it.p, by, at:iso(30 - i % 28)}; });
  /* ---------- 우리 팀 값 (항목 칸 글): 2025 은 실측, 2026 은 목표 · 시뮬 ---------- */
  const val = {}; let nv = 0;
  Object.keys(ACT).forEach(id => { const labs = (ACT[id] || [])[2]; if(!labs || !labs.length || nv >= 24) return; const it = ITEMS.find(x => x.id === id); if(!it) return; nv++;
    const s = {'2025': {}, '2026': {}};
    labs.slice(0, 3).forEach((l, j) => { s['2025'][l] = {v:`(더미) 2025 확정 ${j + 1}`, why:'2025 차량 실측'}; if(nv % 3) s['2026'][l] = {v:`(더미) 2026 목표 ${j + 1}`, why: j ? '랩 시뮬레이션 결과' : '작년 실측 + 개선 목표'}; });
    if(!Object.keys(s['2026']).length) delete s['2026'];
    val[id] = {s, part:it.p, by:leadOf(it.p), at:iso(5 + nv)}; });
  /* ---------- 도구별 팀 프리셋 (tp): 도구 예제 입력을 두 시즌 모두 ---------- */
  const tp = {};
  for(const id of Object.keys(WBTPART)){ if(!WB_TOOLS[id]) continue;
    try{ wbModeSet('ex'); try{ localStorage.removeItem(wbStoreKey(id)); }catch(e){} wbOpen(id, null, 'ex'); await new Promise(r => setTimeout(r, id === '2' ? 6000 : 1500));
      const s = {}; SEASONS.forEach((se, j) => { const doc = Object.assign(wbDoc(), {season:se, at:iso(j ? 6 : 240)}); const lead = leadOf(WBTPART[id]);
        s[se] = {name:`${se} 팀 기준안`, at:doc.at, json:JSON.stringify(doc), by:lead, byName:(M[lead] || {}).name || ''}; });
      tp[wbTpId(id)] = {s}; }catch(e){ console.warn('tp', id, e); }
    try{ wbClose(); }catch(e){} }
  /* ---------- 논의 (qa): 여러 역할 · 두 시즌, 답글 포함 ---------- */
  const qa = {}; let nq = 0;
  const Q = (item, text, by, d, parent) => { const id = 'dq' + (++nq); qa[id] = {v:2, item, parent:parent || '', text, by, at:iso(d)}; return id; };
  const itP = p => (its.find(x => x.p === p) || its[0]).id;
  let r = Q(its[0].id, '배점 비중은 작년 결과 기준으로 잡나요, 올해 규정 기준으로 잡나요?', 'u2', 9); Q(its[0].id, '올해 규정 기준으로 잡고, 작년 결과는 참고 칸에 적어 둡시다.', 'u1', 8, r);
  r = Q(its[3].id, '무게 목표 240 kg은 배터리 팩 무게가 확정된 뒤에 다시 봐야 할 것 같습니다.', 'u3', 7); Q(its[3].id, '팩은 다음 주 셀 사양 정해지면 알려 드릴게요.', 'u4', 6, r);
  r = Q(itP('서스'), '하드포인트 좌표는 작년 차에서 바꾼 점만 표시해 두면 좋겠습니다.', 'u3', 5); Q(itP('서스'), '도구 5 프리셋에 2025 기준안 올려 두었습니다.', pick(memNow), 4, r);
  r = Q(itP('제동'), '디스크 두께 4 mm로 열 용량이 충분한지 도구 3 결과 같이 봐 주세요.', leadOf('제동'), 4); Q(itP('제동'), '내구 10 랩 기준으로 여유 있습니다.', pick(memNow), 3, r);
  r = Q(itP('냉각'), '라디에이터 하나로 될지, 둘로 나눌지 정해야 합니다.', 'u4', 3); Q(itP('냉각'), '도구 9 에서 둘 다 계산해 보고 정합시다.', 'u6', 2, r);
  Q(itP('조향'), '애커먼 60 %는 작년 값 그대로입니다. 바꿀 근거 있으면 알려 주세요.', 'u3', 2);
  Q(itP('프레임'), '비틀림 강성 측정 지그 일정 잡아야 합니다.', 'u5', 1);
  Q(itP('에어로'), '(2025) 윙 탈착 시간 측정 결과 정리했습니다.', pick(mem25), 260);
  Q(itP('구동계'), '(2025) 감속비 3.6 으로 확정, 가속 기록 4.3 s.', leadOf('구동계'), 250);
  /* ---------- 시즌 설정 · 대회 기록 ---------- */
  const meta = {season:{season:NOW}, records:{'2025':{'보고서':142,'가속':61,'스키드패드':55,'오토크로스':118,'내구':190,'효율':31,'순위':'7위'},'2024':{'보고서':120,'가속':48,'스키드패드':40,'오토크로스':96,'내구':0,'효율':0,'순위':'14위 (내구 미완주)'},'2022':{'보고서':98,'가속':35,'스키드패드':30,'오토크로스':70,'내구':120,'효율':18,'순위':'18위'}}};
  return {format:'run2x-team-backup', version:2, team:'Run2X 데모팀', exportedAt:iso(0),
    note:'시험용 더미 팀 (tools/dummy/make.js 로 만듦). 실제 팀 [가져오기]에서는 members 를 쓰지 않음',
    members:M, data:{status, val, dv, tp, qa, meta}};
}
