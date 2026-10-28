const CHIP = {
 g_score:"목표 종합점수·종목별 기록", g_mass:"질량·현가하 질량·CG 높이·앞뒤 배분·휠베이스·트레드", g_balance:"언더스티어 구배 K", g_ay:"설계 횡가속도 a_y",
 g_energy:"에너지·발열 목표", g_cool:"방열량 목표", g_aero:"공력 채택·목표 C_LA", ae_height:"목표 차고 범위 (z)",
 p_tire:"림 치수·타이어 반경 R·특성", p_damper:"댐퍼 스트로크·장착 길이", p_rack:"랙 이송비·최대 이송", p_brake:"MC 지름·캘리퍼·패드 사양",
 p_lsd:"LSD 조정 범위·치수", p_ratio:"최종 감속비", p_motor:"모터 토크 맵·치수", p_cell:"팩 용량·전압·치수",
 l_driver:"콕핏 폭·페달·핸들 위치 (x, z)", l_struct:"규정 부재 위치", l_bat:"배터리 박스 위치 (x, y, z)", l_pt:"모터·디퍼렌셜 위치 (x, z)",
 l_cool:"라디에이터·펌프 위치", l_hv:"배선 경로", b_pedal:"페달박스 위치 (x, z)",
 b_package:"캘리퍼·디스크 위치 → 볼조인트 남는 공간", s_bjzone:"볼조인트 가능 영역 (y, z)",
 s_scrub:"아래 볼조인트 y·z (잠정)", s_kpi:"위 볼조인트 y·z (잠정)", s_caster:"킹핀축 측면 기울기 ν (잠정)",
 s_trail:"위·아래 볼조인트 x (잠정) → 볼조인트 (x, y, z) 결정",
 s_rollgrad:"목표 롤 구배·총 롤강성", s_static:"정적 캠버·토", s_fvsa:"정면 IC 가로 위치 (y)", s_rc:"정면 IC 높이 (z)",
 f_zone:"인보드 후보 영역 (y, z)", s_inboard_f:"인보드 등가 피벗점 (y, z)",
 s_anti:"안티다이브·스쿼트 %", s_pivot:"인보드 앞·뒤 4점 (x, y, z)", st_caster_fix:"캐스터·트레일 최종값",
 st_maxsteer:"최대 조향각", st_arm:"타이로드 아웃보드 점 (x, y, z) (잠정)", st_ack:"너클암 각도 (평면도)", st_rack:"타이로드 인보드 점 (x, y, z)",
 v_bumpsteer:"토 변화 곡선 확인", v_3d:"기구학·간섭 검증", v_outboard:"아웃보드 조정 범위 판정",
 a_path:"푸시로드 하단점·로커 후보 (x, y, z)", f_space:"로커·댐퍼 공간",
 fz1_hp:"동결: 인보드 하드포인트·타이로드 인보드 점", u_outboard:"확정: 볼조인트·타이로드·푸시로드 하단점 (x, y, z)", fz1_node:"노드·브래킷 방식", fz1_jig:"노칭·지그 기준점",
 a_wheelrate:"앞·뒤 휠 레이트", a_mr:"모션비 곡선·로커 형상", a_spring:"스프링·ARB 강성", a_damp:"댐퍼 세팅", a_bump:"범프스톱 접촉 위치",
 b_regen:"회생·유압 블렌딩", b_dist:"제동 배분·마스터실린더 조합", ae_balance:"압력 중심 x 위치",
 d_torque:"출력 제한·토크 한계", d_regen:"회생 토크 상한", d_ramp:"LSD 램프각·프리로드", d_tc:"목표 슬립률·요 오차 한계",
 fz2_mount:"동결: 로커 피벗·댐퍼·ARB 마운트 (x, y, z)", fz2_rack:"동결: 랙·페달박스 고정점", fz2_motor:"동결: 모터·디퍼렌셜 고정점",
 fz2_bat:"동결: 배터리 박스 고정점", ae_mount:"동결: 윙 마운트 고정점", fz2_frame:"브래킷 도면·지그 발주",
 ld_case:"하중 케이스·배수", ld_hp:"링크 축력·하드포인트 하중 (Fx, Fy, Fz)",
 u_upright:"업라이트·허브 도면", u_shaft:"CV·플런지 범위", u_arm:"위시본 튜브·로드엔드 규격·도면", u_rocker:"로커·푸시로드 도면",
 st_link:"너클암·타이로드 도면", st_column:"칼럼·UJ 배치", st_sensor:"조향각 센서 방식", b_disc:"디스크 재질·두께·형상", b_pedalbox:"페달비·페달박스 도면",
 f_tube:"튜브 사이즈", f_bracket:"브래킷·하중 경로",
 pt_mount:"모터 마운트·체인 부품 도면", bat_box:"배터리 박스 도면", cool_sel:"라디에이터·펌프 모델", e_hv:"회로도·회로 부품", e_sensor:"센서 목록·배선",
 ae_wing:"윙·플로어 형상", ae_duct:"덕트 형상", w_fea:"안전계수·해석 결과", w_cg:"실제 무게·CG", dw_draw:"제작 방법·공차·도면",
 x_int:"확정 도면", r_sef:"SEF·IA", r_esf:"ESF·FMEA", r_bat:"축전지 보고서", m_build:"완성 차량",
 t_static:"실측 기하·코너 하중", t_skid:"실측 K·슬립 특성", t_log:"보정된 에너지 목표", t_tune:"튜닝 기록", t_report:"설계 보고서",
 a_heave:"히브·피치 요구 휠 레이트·서드 스프링 강성 (미적용 0)", d_launch:"목표 슬립률·출발 토크 램프",
 g_lapsim:"점수 민감도 (설계 변수별)", d_apps:"페달 맵·APPS 타당성 판정", d_derate:"온도별 토크 상한 곡선", d_effic:"내구 출력 상한·랩별 에너지 예산",
 e_harness:"배선 경로·커넥터 사양", e_daq:"측정 채널·로거 구성", e_telem:"실시간 채널·무선 구성", e_dashui:"대시 화면 배치", t_setup:"조정 감도표·기준 셋업", t_precheck:"검차 불합격 요소 0",
 t_endur:"누적 주행거리 목표·고장 기록", t_cost:"비용 보고서", t_judge:"예상 질문·근거 목록",
 d_inv:"인버터 설정값 (모드별)", st_wheel:"조향휠 지름·그립·버튼 배치", bat_elec:"직병렬·세그먼트·버스바 단면", bat_cool:"냉각 방식·팬(펌프)·유로",
 bat_bms:"BMS 한계·보정·SOC 설정", w_compl:"허용 토·캠버 변화", w_light:"경량화 순서", t_driver:"드라이버·훈련 계획"
};
const chipTxt = t => t.replace(/a_y/g,'a<sub>y</sub>').replace(/C_LA/g,'C<sub>L</sub>A').replace(/F([xyz])/g,'F<sub>$1</sub>').replace(/\(잠정\)/g,'<i class="fxp">잠정</i>');
const PTREE = [
 {sys:"서스", parts:[
  {n:"업라이트·허브", d:"u_upright", why:"바퀴·브레이크·조향을 위시본에 잇는다", p:[["아래 볼조인트 (x, y, z)","s_scrub","s_trail"],["위 볼조인트 (x, y, z)","s_kpi","s_trail"],["타이로드 아웃보드 점 (x, y, z)","st_arm"],["캘리퍼·디스크 위치 (x, y, z)","b_package"],["림·허브 치수","p_tire"],["볼조인트·캘리퍼 하중 (F<sub>x</sub>, F<sub>y</sub>, F<sub>z</sub>)","ld_hp"]]},
  {n:"위시본 (상·하)", d:"u_arm", why:"바퀴 궤적(기구학)을 만든다", p:[["인보드 앞·뒤 4점 (x, y, z)","s_inboard_f","s_pivot"],["아웃보드 볼조인트 2점 (x, y, z)","s_scrub","s_kpi","s_trail"],["푸시로드 하단점 (x, y, z)","a_path"],["링크 축력","ld_hp"]]},
  {n:"푸시로드·로커", d:"u_rocker", why:"바퀴 움직임을 스프링·댐퍼로 전달한다", p:[["푸시로드 하단점 (x, y, z)","a_path"],["로커 피벗 (x, y, z)","fz2_mount"],["모션비·로커 형상","a_mr"],["푸시로드 축력","ld_hp"]]},
  {n:"스프링·댐퍼·ARB", d:"a_spring", why:"차체 자세와 접지 하중을 조절한다", p:[["휠 레이트·롤강성 배분","a_wheelrate"],["히브·피치 요구 강성·서드 스프링","a_heave"],["스프링·ARB 강성","a_spring"],["댐퍼 세팅","a_damp"],["댐퍼 모델","p_damper"],["마운트 위치","fz2_mount"]]},
  {n:"드라이브샤프트·CV", d:"u_shaft", why:"구동력을 뒷바퀴로 전달한다", p:[["허브 위치·트래블","v_3d"],["디퍼렌셜 위치","l_pt"]]}]},
 {sys:"조향", parts:[
  {n:"너클암·타이로드", d:"st_link", why:"랙 이동을 조향각으로 바꾼다", p:[["너클암 길이·각도","st_ack"],["타이로드 아웃보드 점 (x, y, z)","st_arm"],["타이로드 인보드 점 (x, y, z)","st_rack"],["타이로드 축력","ld_hp"]]},
  {n:"랙", d:"p_rack", why:"핸들 회전을 직선 이동으로 바꾼다", p:[["이송비·최대 이송","p_rack"],["랙 위치","st_rack"],["고정점","fz2_rack"]]},
  {n:"칼럼·핸들·센서", d:"st_column", why:"드라이버 입력을 랙에 전달한다", p:[["핸들 위치","l_driver"],["유격 규정","st_column"],["조향각 센서","st_sensor"]]}]},
 {sys:"제동", parts:[
  {n:"디스크·캘리퍼", d:"b_disc", why:"제동력을 만든다", p:[["캘리퍼 모델","p_brake"],["휠 안 배치","b_package"],["열 용량","b_disc"]]},
  {n:"페달박스·마스터실린더", d:"b_pedalbox", why:"페달 힘을 유압으로 바꾼다", p:[["페달박스 위치","b_pedal"],["제동 배분·마스터실린더","b_dist"],["고정점","fz2_rack"]]}]},
 {sys:"프레임", parts:[
  {n:"프레임 튜브", d:"f_tube", why:"모든 부품을 붙이고 하중을 받는다", p:[["규정 부재 위치","l_struct"],["하드포인트 후보 영역","f_zone"],["비틀림 강성 목표","f_tube"]]},
  {n:"브래킷·노드", d:"f_bracket", why:"하드포인트·마운트 하중을 튜브로 보낸다", p:[["인보드 하드포인트","fz1_hp"],["노드·브래킷 방식","fz1_node"],["마운트 위치","fz2_mount"],["마운트 하중","ld_hp"]]},
  {n:"지그", d:"fz2_frame", why:"프레임을 도면대로 용접한다", p:[["노칭·지그 기준점","fz1_jig"],["모든 마운트","fz2_frame"]]}]},
 {sys:"구동계", parts:[
  {n:"모터·인버터", d:"p_motor", why:"구동 토크를 만든다", p:[["모델","p_motor"],["배치","l_pt"],["출력 제한 로직","d_torque"]]},
  {n:"감속·LSD·체인", d:"pt_mount", why:"토크를 좌우 바퀴로 나눈다", p:[["감속비","p_ratio"],["LSD 모델","p_lsd"],["램프각·프리로드","d_ramp"],["모터 고정점","fz2_motor"]]}]},
 {sys:"배터리", parts:[
  {n:"셀·팩", d:"p_cell", why:"에너지를 저장한다", p:[["셀·직병렬","p_cell"],["에너지 목표","g_energy"]]},
  {n:"배터리 박스", d:"bat_box", why:"팩을 고정·보호한다", p:[["박스 위치","l_bat"],["고정점·하중","fz2_bat"]]}]},
 {sys:"냉각", parts:[
  {n:"라디에이터·펌프·덕트", d:"cool_sel", why:"모터·인버터·배터리 열을 버린다", p:[["방열량 목표","g_cool"],["위치","l_cool"],["덕트","ae_duct"]]}]},
 {sys:"회로", parts:[
  {n:"HV·LV 회로·센서", d:"e_hv", why:"차를 안전하게 켜고 끄며 측정한다", p:[["배선 경로","l_hv"],["센서 목록","e_sensor"]]}]},
 {sys:"데이터로거", parts:[
  {n:"로거·텔레메트리·대시보드", d:"e_daq", why:"주행 데이터를 기록·전송하고 드라이버에게 보여 준다", p:[["측정 채널·로거","e_daq"],["실시간 전송","e_telem"],["대시 화면","e_dashui"]]}]},
 {sys:"에어로", parts:[
  {n:"윙·플로어", d:"ae_wing", why:"다운포스로 그립을 늘린다", p:[["채택·목표 C_LA","g_aero"],["목표 차고","ae_height"],["압력 중심","ae_balance"],["마운트","ae_mount"]]}]},
 {sys:"제어", c:"모터컨트롤러", parts:[
  {n:"VCU 로직", d:"d_tc", why:"토크를 그립·규정 안으로 제한한다", p:[["출력 제한","d_torque"],["회생","d_regen"],["TC·안정성","d_tc"],["런치","d_launch"]]}]}
];
const PART_OF = {}; PTREE.forEach(g=>g.parts.forEach(pt=>{ [pt.d, ...pt.p.flatMap(x=>x.slice(1))].forEach(id=>{ (PART_OF[id]=PART_OF[id]||[]); if(!PART_OF[id].includes(pt.n)) PART_OF[id].push(pt.n); }); }));
