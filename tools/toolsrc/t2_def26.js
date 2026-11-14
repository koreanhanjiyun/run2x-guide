
/* ============================================================ 이 탭 사용법 */
function t2TourTab(tab, et, course){ if(!T2.tourUndo && typeof tgUndo==='function'){ const t0 = T2.tab, e0 = T2.etab, c0 = T2.course; T2.tourUndo = true;
    tgUndo(() => { T2.tourUndo = false; T2.tab = t0; T2.etab = e0; if(T2.course!==c0) t2SetCourse(c0); else wbPaint(['ext', 'mid']); }); }
  if(course && T2.course!==course) t2SetCourse(course); if(T2.tab!==tab || (et && T2.etab!==et)){ T2.tab = tab; if(et) T2.etab = et; wbPaint(['ext', 'mid']); } }
const t2TT = (tab, et, course) => ({click:{sel:`#wb [data-t2tab="${tab}"]`, need:() => T2.tab!==tab || (et && T2.etab!==et) || (course && T2.course!==course), run:() => t2TourTab(tab, et, course)}, inner:'#wb .wb-right'});
const M2TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 해석해 비교표), 입력 내보내기 · 가져오기(맵 편집 표 포함), [도구 연결 ▾](도구 9 · 4 에서 냉각 회로 · 셀 표 가져오기, 도구 9 로 평균 발열 · 차속 보내기 — 덮어쓸 곳을 표로 보고 체크), 대시보드에 반영(제안 감속비 · 최고 차속 · 횡가속도 · 랩 에너지)입니다.', t2TT('sim')],
  ['#wb .wb-in', '입력', '입력 칸은 위 [편집] 탭에 항목별로 있습니다(자주 바꿔 보는 값만 나중에 이곳으로 꺼낼 예정). 여기에는 칸 앞 표시의 뜻이 있습니다: ● 대시보드 값 · ◎ 대시보드와 다름 · ◌ 대시보드 비어 있음 · ■ 이 도구 전용. 대시보드 값은 윗줄 [도구 연결 ▾]에서 가져옵니다.', t2TT('sim')],
  ['#wb [data-t2tab="edit"]', '편집 탭', '모든 입력을 항목별로 넣는 탭입니다: 모델 단계 · 코스 · 차량 제원 · 서스 · 조향 · 타이어 · 에어로 · 모터 · 인버터 · 구동계 · 축전지. 항목마다 위에 상수 칸(비슷한 값끼리 상자), 아래에 표 · 그림이 있습니다. 여기서 고치는 동안은 계산하지 않고, [시뮬레이션] 탭으로 가면 한 번 계산합니다. 코스 단추는 시뮬레이션 코스와 따로입니다.', t2TT('edit', 'course')],
  ['#wb .t2-coolq', '냉각', '수랭 방식을 고릅니다. [부품별 독립 회로] = 수랭 부품마다 자기 냉각수 · 라디 (부품별 회로 값 칸). [냉각 회로] = 이 탭의 편집기로 그린 배치(직렬 · 병렬 · 라디 여러 개 · 공랭 덕트)로 앞 부품이 데운 냉각수를 뒤 부품이 받습니다. 배치는 이 도구에만 저장됩니다. 도구 9 에서 배치를 가져오거나, 시뮬레이션 탭에서 계산한 뒤 평균 손실 · 차속을 도구 9 로 보내는 것은 윗줄 [도구 연결 ▾]에서 합니다.', t2TT('edit', 'cool')],
  ['#wb .t2-model', '모델 단계', '차량 모델(0 기본 · 1 롤센터 · 롤)과 열 모델(모터 열 · 인버터 온도 · 축전지 온도 · 냉각수 온도를 각각 켜고 끔, 부품마다 공랭 · 수랭, 냉각수 온도는 수랭 부품이 있어야 계산)을 눌러 조합합니다. 단추마다 계산하는 것과 쓰는 입력(어느 항목에 있는지)이 적혀 있고, 그 단계에서 안 쓰는 입력 칸은 막힙니다. 계산에 쓴 조합은 시뮬레이션 탭 위에 보입니다. 대시보드 반영은 늘 차량 0 · 열 모터 열만.', t2TT('edit', 'model')],
  ['#wb .t2-sens', '감도', '입력을 하나씩 조금(기본 +5 %) 바꿔 종목 기록 · 내구 에너지가 몇 % 바뀌는지(탄력도) 봅니다. [감도 계산]을 누르면 지금 입력 · 모델 단계로 계산하고, 열 이름을 눌러 그 종목 순으로 정렬합니다. 종합이 큰 입력이 자주 바꿔 비교할 핵심 입력 후보입니다.', t2TT('sens')],
  ['#wb .t2-cg', '상수인가, 표인가', '모터 토크는 늘 표로 셉니다 (피크 · 연속 중 한 열은 비워도 됨). 효율 · 타이어 표가 비어 있으면 위 상수 칸(모터 효율 · 인버터 효율 · μ · 하중 감도)을 쓰고, 그림 위에 "상수 칸을 씁니다"가 뜹니다. 표 제목 옆 [계산에 쓸 값]에서 [아래 표 · 위 상수]를 고릅니다. 표를 쓰면 그 상수 칸은 막힙니다("아래 표 사용"). 숫자 하나만 넣어도 상수 표가 됩니다.', t2TT('edit', 'eM')],
  ['#wb .t2-tw', '표 고치기', '칸을 눌러 고치고 Enter(반영) · Esc(취소). 표 맨 아래 [+ 행] 행, 효율 맵은 오른쪽 [+ 열] 열로 늘리고, 행 끝 × 로 행을, 맵 맨 아래 × 로 열을 지웁니다. 빈 표에서 누르면 머리 행부터 만듭니다. 토크 표는 1열 회전수 · 2열 최대 토크 · 3열 연속 토크(디레이팅 하한)입니다.', t2TT('edit', 'mt')],
  ['#wb .t2-menu', '입력하기', '엑셀에서 여러 칸을 복사해 표를 누르고 Ctrl+V 하면 표 전체를 바꿈 (모든 표 같음) · 파일 가져오기(.xlsx 첫 시트 · .csv) · 양식 받기(쓰는 법이 양식 맨 위 # 행에 있음) · 예시로 · 비우기.', t2TT('edit', 'mt')],
  ['#wb .t2-fbox', '그림으로 틀린 칸 찾기', '오른쪽 그림은 표로 그린 것입니다. 효율 맵에서 혼자 색이 튀는 칸, 곡선이 꺾인 곳, 코스가 엉뚱하게 꺾인 곳을 누르면 표에서 그 칸(행)으로 가서 강조합니다.', t2TT('edit', 'eM')],
  ['#wb .t2-tr', '코스', '공식 코스(오토크로스 · 내구 · 가속 · 스키드패드)는 회색 표로 보기만 합니다. 내 코스는 칸 고치기 · # 번호로 옮기기 · 각도 → 길이, 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스입니다. 비워 두면 계산하지 않습니다. 초록 = 출발(주행 방향 오른쪽), 빨강 = 결승(왼쪽), 화살표 = 방향. 내 코스는 구간마다 왼쪽 · 오른쪽 폭(빈칸 = 윗 행 값, 경계 콘은 지도에 자동)과 슬라럼 콘 간격(그 구간 가운데 선 위 콘, 직선 · 곡선 모두)을 넣을 수 있고, 엑셀에서 여러 칸을 복사해 표에 Ctrl+V 하면 표 전체가 바뀝니다.', t2TT('edit', 'course', 'free')],
  ['#wb [data-t2tab="sim"]', '시뮬레이션 탭', '편집 탭의 입력으로 기록을 계산해 보는 탭입니다. 위에서 아래로: 기준 감속비 · 볼 랩 · 코스 → 결과 → 구동력 선도 · 코스 지도 → 신호 그래프.', t2TT('sim', null, 'end')],
  ['#wb .t2-gm', '기준 감속비', '내 감속비 = 편집 탭 [구동계]의 [최종 감속비], 최적 감속비 = 배점(가속 100 · 오토크로스 200 · 내구 350)을 가중해 고른 하나. 두 모드를 미리 계산해 두어 누르면 바로 바뀝니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-vw', '볼 랩 · 코스', '코스를 고르면 결과 2행 · 구동력 선도 · 코스 지도 · 신호 그래프가 그 코스로 바뀝니다. 내구는 24랩(드라이버당 12랩) 중 볼 랩을 고르고, [전체]는 26랩을 이어서 봅니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-orow', '결과 1행', '감속비(종목마다 가장 빠른 감속비와 그때 기록) · 종목 기록(기준 감속비) · 차량 한계. 같은 종목이 같은 높이라 옆으로 비교합니다. ± = 가장 빠른 기록 대비, 초록은 빠름 · 빨강은 느림.', t2TT('sim', null, 'end')],
  ['#wb .t2-orow + .t2-orow', '결과 2행', '고른 코스 · 볼 랩의 기록, 축전지 · 모터(회전수 · 토크 · 출력 · 전압 · 모터 온도), 에너지(단자 · 소비 · SOC, 내구는 에너지 제한 · CO₂). 내구는 24랩 전체 단자 · 소비 에너지와, 출력 상한 없이 달렸을 때의 에너지(축전지 용량 가늠용)도 보입니다. 최적 모드에서 감속비는 그 코스에서 가장 빠른 값입니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-ftw', '구동력 선도', '코스 프로브 지점의 전압 · 모터 온도 · 횡가속도로 다시 그린 선도입니다(보기만, 눌러도 프로브는 안 움직임). 세로선 = 그 점의 차속. 아래 글이 그 점의 구동력을 무엇이 정했는지(모터 곡선 · 출력 상한 · 뒤축 접지), 제동 한계, 앞축 여유를 알려 줍니다.', t2TT('sim', null, 'end')],
  ['#wb .t2-mapw', '코스 지도', '한 번 눌러 휠 확대를 켠 뒤(박스 테두리 강조, 박스 밖을 누르거나 Esc = 끔) 휠로 확대, 휠 버튼을 누른 채 끌면 이동(박스 밖으로 나가도 됨), 왼쪽 버튼으로 누르거나 누른 채 끌면 프로브가 따라갑니다. 색 = 차속(여러 랩이면 모든 랩 통틀어 같은 범위), 주황 콘 = 슬라럼. 색 선 = 계산한 주행선(기본 레코드 라인: 코스 폭 안에서 가장 덜 휘는 라인을 구한 뒤 랩타임이 줄어드는 쪽으로 조금씩 다듬은 라인. 슬라럼은 첫 콘을 왼쪽으로, 번갈아 비켜 감), 점선 = 코스 중심선. 주행선(레코드 라인 · 최소 곡률 라인 · 중심 라인)과 여유는 편집 탭 [코스], 차 전폭은 [차량 제원]에서 바꿉니다. 다듬기는 입력이 바뀔 때마다 다시 해서 계산이 몇 초 걸립니다.', t2TT('sim', null, 'end')],
  ['#wbsl', '신호 고르기', '그래프를 누르면 그 칸이 강조되고, 여기 체크가 그 칸에 그릴 신호를 고릅니다. 이름을 누르면 그 신호의 눈금이 앞으로. 축 · 눈금 · 제목 · 값 글자는 선 색과 같습니다.', t2TT('sim')],
  ['#wbsig', '그래프 칸', '칸마다 상자 하나. 위 오른쪽 단추줄: [프로브] 누르거나 끌면 프로브(←/→ 한 칸씩) · [이동] 끌어서 보기 범위 옮김 · [영역 확대] 끌어서 사각형 확대 · 더블클릭 = 처음 범위. 가로 범위는 모든 칸이 같이 움직이고 세로는 칸마다. 칸을 한 번 누르면 휠 = 가로 확대, Shift + 휠 = 세로 확대. 상자 아래 [+ 그래프 칸]으로 최대 3칸, × 로 지우고, 칸 아래 경계를 끌어 높이를 바꿉니다.', t2TT('sim')],
  ['#wbsl [data-wbxa]', '입력 훑기', '가로축을 [입력 훑기 → 최종 감속비] 등으로 바꾸면 그 입력을 바꿔 가며 다시 계산한 종목 기록 변화를 봅니다 (나머지 입력은 지금 값).', t2TT('sim')]
];

/* ============================================================ 도구 정의 */
/* 입력 묶음 (편집 탭 항목마다 그림: T2EG). ui:'edit' = 편집 탭에만, ui:'none' = 다른 곳(단추 · 결과 카드)에서 고침 → 왼쪽 입력 칸은 비움 */
const T2G = {thm:'외기', cool:'냉각수 · 라디에이터 (열 모델 냉각수 온도)', bth:'축전지 열 (열 모델 축전지 온도)', inv:'인버터 열 (열 모델 인버터 온도)', car:'차량 제원', rc:'롤센터 · 롤 (차량 모델 1)', steer:'조향', tire:'타이어 · 하중 이동', aero:'에어로', mot:'모터 · 인버터', th:'모터 · 인버터 디레이팅', mth:'모터 열 (열 모델 모터 온도)', dt:'구동계', bat:'축전지', drv:'운전자 (현실 운전자 그립 사용률)', rl:'주행선 여유 · 경계', goal:'스키드패드 목표 (0 = 정하지 않음)'};
const T2EG = {course:[T2G.rl], car:[T2G.car], sus:[T2G.steer, T2G.rc], tire:[T2G.tire], aero:[T2G.aero], mot:[T2G.mot, T2G.th], cool:[T2G.thm, T2G.cool, T2G.mth, T2G.inv, T2G.bth], dt:[T2G.dt], bat:[T2G.bat], model:[]};
WB_TOOLS['2'] = {
  no:'2P', stage:'P0', name:'랩타임 시뮬레이터 (정밀)',
  x:{n:'거리', u:'m'},
  sweepFirst:'gr',
  inputs:[
    // sb = 편집 탭에서 한 상자로 묶는 이름 (비슷한 값끼리 한 열), n = 이 도구에서 보이는 이름 (대시보드 키 이름과 다르게 맞춘 것)
    {k:'m', dk:'m', v:300, d:0, g:T2G.car, sb:'질량 · 무게중심'}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T2G.car, sb:'질량 · 무게중심'}, {k:'h', dk:'h', v:290, d:0, g:T2G.car, sb:'질량 · 무게중심'},
    {k:'L', dk:'L', v:1550, d:0, g:T2G.car, sb:'치수'}, {k:'tf', dk:'tf', v:1200, d:0, g:T2G.car, sb:'치수'}, {k:'tr', dk:'tr', v:1180, d:0, g:T2G.car, sb:'치수'},
    {k:'w_car', n:'차 전폭 (타이어 · 윙 포함)', u:'m', v:1.41, d:2, g:T2G.car, sb:'치수'},
    {k:'oh_f', n:'앞 오버행 (앞축 ~ 차 앞 끝)', u:'m', v:0.92, d:2, g:T2G.car, sb:'치수'}, {k:'oh_r', n:'뒤 오버행 (뒤축 ~ 차 뒤 끝)', u:'m', v:0.44, d:2, g:T2G.car, sb:'치수'},
    {k:'mu', dk:'mu', n:'타이어 μ (기준 하중)', v:1.5, d:2, g:T2G.tire, sb:'마찰 · 하중 이동'}, {k:'mu_s', dk:'mu_s', n:'μ 하중 감도', v:0.246, d:3, g:T2G.tire, sb:'마찰 · 하중 이동'},
    {k:'r_eff', dk:'r_eff', n:'바퀴 유효 반경 (동반경)', v:229, d:0, g:T2G.tire, sb:'바퀴'}, {k:'crr', dk:'crr', v:0.015, d:3, g:T2G.tire, sb:'바퀴'},
    {k:'cla', dk:'cla', n:'C<sub>L</sub>·A (다운포스)', v:3.0, d:2, g:T2G.aero, sb:'공력 계수'}, {k:'cda', dk:'cda', n:'C<sub>D</sub>·A (항력)', v:1.4, d:2, g:T2G.aero, sb:'공력 계수'},
    {k:'xcop', dk:'xcop', n:'압력중심 위치 (뒤축부터 앞으로)', v:698, d:0, g:T2G.aero, sb:'압력중심'}, {k:'hcop', dk:'hcop', n:'압력중심 높이 (항력 작용)', v:420, d:0, g:T2G.aero, sb:'압력중심'},
    {k:'pmax', dk:'pmax', n:'최고 출력 (규정 상한)', v:80, d:0, g:T2G.mot, sb:'모터 한계'}, {k:'rg_tmax', dk:'regen_tmax', n:'회생 토크 상한 (모터 축)', v:230, d:0, g:T2G.mot, sb:'회생'}, {k:'tmax', dk:'tmax', n:'모터 최대 토크 (토크 표 최댓값)', v:230, d:0, g:T2G.mot, sb:'모터 한계'}, {k:'nmax', dk:'nmax', v:6500, d:0, g:T2G.mot, sb:'모터 한계'},
    {k:'v_ref', n:'토크 표 기준 전압 (표를 잰 전압)', u:'V', v:710, d:0, g:T2G.mot, sb:'토크 표 환산'},
    {k:'ke_ratio', n:'유도 전압 비 (팀 모터 ÷ 표 모터)', u:'', v:0.6523, d:4, g:T2G.mot, sb:'토크 표 환산'},
    {k:'eta_mot', n:'모터 효율 (상수)', u:'%', v:95, d:1, g:T2G.mot, sb:'효율 상수'}, {k:'eta_inv', n:'인버터 효율 (상수)', u:'%', v:97, d:1, g:T2G.mot, sb:'효율 상수'},
    {k:'eff_mg', n:'효율 (0 = 모터 · 인버터 따로, 1 = 모터 맵에 인버터 합침)', u:'', v:0, d:0, g:T2G.mot, ui:'none'}, {k:'inv_r', n:'합친 손실 중 인버터 몫', u:'%', v:30, d:0, g:T2G.mot, sb:'효율 상수'},
    {k:'c_pct', n:'연속 ÷ 피크 토크 비율 (표에 한 열만 있을 때)', u:'%', v:100, d:0, g:T2G.mot, sb:'토크 표 환산'},
    {k:'dr_t0', dk:'derate_t0', n:'모터 디레이팅 시작 온도 (피크 토크)', v:80, d:0, g:T2G.th, sb:'모터 디레이팅'}, {k:'dr_t1', dk:'derate_t1', n:'모터 디레이팅 끝 온도 (연속 토크)', v:100, d:0, g:T2G.th, sb:'모터 디레이팅'},
    {k:'kt', n:'모터 토크 상수 K<sub>t</sub> (상전류 A<sub>rms</sub> 당)', u:'N·m/A', v:0.64, d:3, g:T2G.mot, sb:'모터 한계'},
    {k:'i_pk', n:'인버터 피크 상전류', u:'A', v:400, d:0, g:T2G.mot, sb:'인버터 전류 한계'}, {k:'i_ct', n:'인버터 연속 상전류', u:'A', v:200, d:0, g:T2G.mot, sb:'인버터 전류 한계'},
    {k:'ict_m', n:'인버터 연속 상전류 (1 = 값 입력, 0 = 피크 × 비율)', u:'', v:1, d:0, g:T2G.mot, ui:'none'},
    {k:'i_cpct', n:'인버터 연속 ÷ 피크 전류 비율 (연속을 비율로 정할 때)', u:'%', v:100, d:0, g:T2G.mot, sb:'인버터 전류 한계'},
    {k:'di_t0', dk:'inv_derate_t0', n:'인버터 디레이팅 시작 온도 (피크 전류)', v:50, d:0, g:T2G.th, sb:'인버터 디레이팅'}, {k:'di_t1', dk:'inv_derate_t1', n:'인버터 디레이팅 끝 온도 (연속 전류)', v:85, d:0, g:T2G.th, sb:'인버터 디레이팅'},
    {k:'th_c', n:'모터 열용량', u:'J/K', v:6000, d:0, g:T2G.mth, sb:'모터 열'}, {k:'th_r', n:'모터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.02, d:4, g:T2G.mth, sb:'모터 열'},
    {k:'m_ha0', n:'모터 공랭 hA (정지)', u:'W/K', v:10, d:1, g:T2G.mth, sb:'모터 공랭'}, {k:'m_ha60', n:'모터 공랭 hA (60 km/h)', u:'W/K', v:40, d:1, g:T2G.mth, sb:'모터 공랭'},
    {k:'th_cool', n:'냉각수 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값, 냉각 회로)', u:'°C', v:40, d:0, g:T2G.cool, sb:'냉각수 온도'},
    /* 부품별 독립 수랭: 회로마다 냉각수 온도 · 비열 · 밀도 (2026-11-11). 냉각 회로 방식이면 위 한 칸 (th_cool) */
    {k:'cw_tw', n:'모터 냉각수 · 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값)', u:'°C', v:40, d:0, g:T2G.cool, sb:'모터 냉각수'}, {k:'cw_cp', n:'모터 냉각수 · 비열', u:'kJ/(kg·K)', v:4.18, d:2, g:T2G.cool, sb:'모터 냉각수'}, {k:'cw_rho', n:'모터 냉각수 · 밀도', u:'kg/m³', v:1000, d:0, g:T2G.cool, sb:'모터 냉각수'},
    {k:'i_wtw', n:'인버터 냉각수 · 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값)', u:'°C', v:40, d:0, g:T2G.cool, sb:'인버터 냉각수'}, {k:'i_wcp', n:'인버터 냉각수 · 비열', u:'kJ/(kg·K)', v:4.18, d:2, g:T2G.cool, sb:'인버터 냉각수'}, {k:'i_wrho', n:'인버터 냉각수 · 밀도', u:'kg/m³', v:1000, d:0, g:T2G.cool, sb:'인버터 냉각수'},
    {k:'b_wtw', n:'축전지 냉각수 · 온도 (냉각수 온도 끔 = 고정, 켬 = 출발 값)', u:'°C', v:40, d:0, g:T2G.cool, sb:'축전지 냉각수'}, {k:'b_wcp', n:'축전지 냉각수 · 비열', u:'kJ/(kg·K)', v:4.18, d:2, g:T2G.cool, sb:'축전지 냉각수'}, {k:'b_wrho', n:'축전지 냉각수 · 밀도', u:'kg/m³', v:1000, d:0, g:T2G.cool, sb:'축전지 냉각수'}, {k:'th_init', n:'모터 출발 온도', u:'°C', v:40, d:0, g:T2G.mth, sb:'모터 열'},
    {k:'gr', dk:'gr', v:3.55, d:2, g:T2G.dt, sb:'구동계', sw:[2.5, 7]}, {k:'eta_dt', dk:'eta_dt', v:95, d:0, g:T2G.dt, sb:'구동계'}, {k:'j_eq', dk:'j_eq', n:'회전부 등가 관성 (바퀴 축 기준)', v:0.5, d:2, g:T2G.dt, sb:'구동계'},
    {k:'pk_dir', n:'팩 값 (0 = 셀로 계산, 1 = 팩 값 직접)', u:'', v:0, d:0, g:T2G.bat, ui:'none'}, {k:'n_s', dk:'n_s', n:'직렬 수', v:70, d:0, g:T2G.bat, sb:'셀 구성'}, {k:'n_p', dk:'n_p', v:7, d:0, g:T2G.bat, sb:'셀 구성'},
    {k:'c_vmax', dk:'c_vmax', n:'셀 최대 전압 (만충)', u:'V', v:4.2, d:2, g:T2G.bat, sb:'셀 전압'}, {k:'c_vnom', dk:'c_vnom', n:'셀 공칭 전압', u:'V', v:3.6, d:2, g:T2G.bat, sb:'셀 전압'},
    {k:'c_vmin', dk:'c_vmin', n:'셀 최소 전압 (방전 종지)', u:'V', v:2.5, d:2, g:T2G.bat, sb:'셀 전압'},
    {k:'c_ah', dk:'c_ah', n:'셀 용량', u:'Ah', v:4.0, d:2, g:T2G.bat, sb:'셀 용량 · 팩'}, {k:'r_pack', dk:'r_pack', v:120, d:0, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'p_vmax', n:'팩 최대 전압 (만충)', u:'V', v:294, d:1, g:T2G.bat, sb:'팩'}, {k:'p_vnom', n:'팩 공칭 전압', u:'V', v:252, d:1, g:T2G.bat, sb:'팩'},
    {k:'p_vmin', n:'팩 최소 전압 (방전 종지)', u:'V', v:175, d:1, g:T2G.bat, sb:'팩'}, {k:'p_ah', n:'팩 용량', u:'Ah', v:28, d:2, g:T2G.bat, sb:'팩'},
    {k:'i_bms_max', dk:'i_bms_max', n:'팩 방전 전류 한계 (BMS 설정 · 셀 허용 × 병렬 수 중 작은 값)', v:245, d:0, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'i_chg', dk:'i_chg', n:'팩 충전 전류 한계 (회생, 셀 충전 허용 × 병렬 수)', v:42, d:0, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'e_target', dk:'e_target', n:'내구 에너지 상한', v:0, d:2, g:T2G.bat, sb:'셀 용량 · 팩'},
    {k:'e_lim', n:'내구 에너지 상한 (0 = 제한 없음, 1 = 제원 용량, 2 = 임의 상한)', u:'', v:0, d:0, g:T2G.bat, ui:'none'},
    {k:'drv', n:'에너지 상한에 맞추는 방법 (0 = 출력 낮춤, 1 = 타력)', u:'', v:0, d:0, g:T2G.bat, ui:'none'},
    {k:'dr_real', n:'운전 실력 (0 = 이상, 1 = 현실)', u:'', v:0, d:0, g:T2G.drv, ui:'none'},
    {k:'dr_ks', n:'기본 그립 사용률 k_s (스키드패드 · 오토크로스 · 내구)', u:'', v:0.95, d:2, g:T2G.drv, keep:true},
    {k:'dr_ke', n:'내구 페이스 k_e (내구에만 더 곱함)', u:'', v:0.7, d:2, g:T2G.drv, keep:true},
    {k:'rg_on', n:'회생 제동 (1 = 켬, 0 = 끔)', u:'', v:0, d:0, g:T2G.mot, ui:'none'},
    {k:'wc_on', n:'차 크기 고려 (2P 화면에서는 항상 1, 검증표만 0 으로 끔)', u:'', v:1, d:0, g:T2G.car, ui:'none'},
    {k:'dl_on', n:'조향 한계 (1 = 고려, 0 = 고려 안 함)', u:'', v:0, d:0, g:T2G.steer, ui:'none'},
    {k:'fz0_m', n:'타이어 기준 하중 (1 = 값 입력, 0 = 정지 평균 하중 · μ 는 하중 0 기준)', u:'', v:0, d:0, g:T2G.tire, ui:'none'},
    {k:'rl_on', n:'주행선 (2 = 레코드 라인, 1 = 최소 곡률 라인, 0 = 중심 라인)', u:'', v:0, d:0, g:T2G.rl, ui:'none'},
    {k:'rl_m', n:'여유 (차 옆면 ↔ 코스 경계 · 콘, 차 크기 고려일 때)', u:'m', v:0.2, d:2, g:T2G.rl, sb:'여유'},
    {k:'rl_b', n:'경계 · 콘에서 차 중심까지 최소 거리 (차 크기 고려 안 함일 때)', u:'m', v:1.0, d:2, g:T2G.rl, sb:'여유'},
    {k:'md', n:'차량 모델 단계 (0 = 기본, 1 = 롤센터 · 롤, 2 = 비선형 타이어, 3 = 과도)', u:'', v:0, d:0, g:T2G.rc, ui:'none'},
    {k:'th_on', n:'열 모델 · 모터 열 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'}, {k:'cw_on', n:'열 모델 · 냉각수 온도 (1 = 켬, 수랭 부품이 있을 때)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'in_on', n:'열 모델 · 인버터 온도 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'m_cool', n:'모터 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:0, d:0, g:T2G.thm, ui:'none'}, {k:'i_cool', n:'인버터 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:0, d:0, g:T2G.thm, ui:'none'}, {k:'b_cool', n:'축전지 냉각 (0 = 공랭, 1 = 수랭)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'i_c', n:'인버터 열용량', u:'J/K', v:2000, d:0, g:T2G.inv, sb:'인버터 열'}, {k:'i_r', n:'인버터 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T2G.inv, sb:'인버터 열'}, {k:'i_init', n:'인버터 출발 온도', u:'°C', v:40, d:0, g:T2G.inv, sb:'인버터 열'},
    {k:'i_ha0', n:'인버터 공랭 hA (정지)', u:'W/K', v:5, d:1, g:T2G.inv, sb:'인버터 공랭'}, {k:'i_ha60', n:'인버터 공랭 hA (60 km/h)', u:'W/K', v:20, d:1, g:T2G.inv, sb:'인버터 공랭'},
    {k:'bt_on', n:'열 모델 · 축전지 온도 (1 = 켬)', u:'', v:0, d:0, g:T2G.thm, ui:'none'},
    {k:'t_amb', n:'외기 온도', u:'°C', v:25, d:0, g:T2G.thm},
    // 냉각수 등가 기본값 = 도구 9 기본 배치(라디 0.06 m² · UA 250 · 팬 0.08, 펌프 8 L/min, 인버터 → 모터)를 줄인 값
    {k:'cw_mode', n:'수랭 방식 (0 = 부품별 독립 회로, 1 = 냉각 회로)', u:'', v:0, d:0, g:T2G.cool, ui:'none'},
    {k:'cw_v', n:'모터 회로 · 냉각수 양 (라디 · 배관 · 재킷 합)', u:'L', v:1.2, d:2, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'}, {k:'cw_q', n:'모터 회로 · 펌프 유량', u:'L/min', v:8, d:1, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'cw_ra', n:'모터 회로 라디 · 코어 앞면 면적', u:'m²', v:0.06, d:3, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'}, {k:'cw_kd', n:'모터 회로 라디 · 주행풍 중 코어 통과 비율', u:'', v:0.3, d:2, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'cw_fan', n:'모터 회로 라디 · 팬 유량', u:'m³/s', v:0.08, d:3, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'}, {k:'cw_fm', n:'모터 회로 라디 · 팬 켜기 (0 = 늘 켬, 1 = 냉각수 온도로)', u:'', v:0, d:0, g:T2G.cool, ui:'none'}, {k:'cw_fon', n:'모터 회로 라디 · 팬 켜는 냉각수 온도 (3 K 아래로 내려가면 끔)', u:'°C', v:50, d:0, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'cw_ua', n:'모터 회로 라디 · UA (코어 풍속 5 m/s, 다른 풍속은 × (풍속 ÷ 5)^0.6)', u:'W/K', v:250, d:0, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'}, {k:'cw_itd', n:'모터 회로 라디 · 표의 입구 온도차 (냉각수 입구 − 공기 입구)', u:'K', v:60, d:0, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'cw_cm', n:'모터 회로 라디 · 금속 열용량 (알루미늄 kg × 0.9)', u:'kJ/K', v:0, d:2, g:T2G.cool, sb:'모터 수랭 회로 (부품별 독립)'},
    {k:'i_wv', n:'인버터 회로 · 냉각수 양 (라디 · 배관 · 재킷 합)', u:'L', v:1.2, d:2, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'}, {k:'i_wq', n:'인버터 회로 · 펌프 유량', u:'L/min', v:8, d:1, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'i_wra', n:'인버터 회로 라디 · 코어 앞면 면적', u:'m²', v:0.06, d:3, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'}, {k:'i_wkd', n:'인버터 회로 라디 · 주행풍 중 코어 통과 비율', u:'', v:0.3, d:2, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'i_wfan', n:'인버터 회로 라디 · 팬 유량', u:'m³/s', v:0.08, d:3, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'}, {k:'i_wfm', n:'인버터 회로 라디 · 팬 켜기 (0 = 늘 켬, 1 = 냉각수 온도로)', u:'', v:0, d:0, g:T2G.cool, ui:'none'}, {k:'i_wfon', n:'인버터 회로 라디 · 팬 켜는 냉각수 온도 (3 K 아래로 내려가면 끔)', u:'°C', v:50, d:0, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'i_wua', n:'인버터 회로 라디 · UA (코어 풍속 5 m/s, 다른 풍속은 × (풍속 ÷ 5)^0.6)', u:'W/K', v:250, d:0, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'}, {k:'i_witd', n:'인버터 회로 라디 · 표의 입구 온도차 (냉각수 입구 − 공기 입구)', u:'K', v:60, d:0, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'i_wcm', n:'인버터 회로 라디 · 금속 열용량 (알루미늄 kg × 0.9)', u:'kJ/K', v:0, d:2, g:T2G.cool, sb:'인버터 수랭 회로 (부품별 독립)'},
    {k:'b_wv', n:'축전지 회로 · 냉각수 양 (라디 · 배관 · 재킷 합)', u:'L', v:1.2, d:2, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'}, {k:'b_wq', n:'축전지 회로 · 펌프 유량', u:'L/min', v:8, d:1, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_wra', n:'축전지 회로 라디 · 코어 앞면 면적', u:'m²', v:0.06, d:3, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'}, {k:'b_wkd', n:'축전지 회로 라디 · 주행풍 중 코어 통과 비율', u:'', v:0.3, d:2, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_wfan', n:'축전지 회로 라디 · 팬 유량', u:'m³/s', v:0.08, d:3, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'}, {k:'b_wfm', n:'축전지 회로 라디 · 팬 켜기 (0 = 늘 켬, 1 = 냉각수 온도로)', u:'', v:0, d:0, g:T2G.cool, ui:'none'}, {k:'b_wfon', n:'축전지 회로 라디 · 팬 켜는 냉각수 온도 (3 K 아래로 내려가면 끔)', u:'°C', v:50, d:0, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_wua', n:'축전지 회로 라디 · UA (코어 풍속 5 m/s, 다른 풍속은 × (풍속 ÷ 5)^0.6)', u:'W/K', v:250, d:0, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'}, {k:'b_witd', n:'축전지 회로 라디 · 표의 입구 온도차 (냉각수 입구 − 공기 입구)', u:'K', v:60, d:0, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_wcm', n:'축전지 회로 라디 · 금속 열용량 (알루미늄 kg × 0.9)', u:'kJ/K', v:0, d:2, g:T2G.cool, sb:'축전지 수랭 회로 (부품별 독립)'},
    {k:'b_c', n:'축전지 열용량', u:'J/K', v:30000, d:0, g:T2G.bth, sb:'축전지 열'}, {k:'b_ha', n:'축전지 공랭 hA (정지)', u:'W/K', v:15, d:1, g:T2G.bth, sb:'축전지 공랭'}, {k:'b_ha60', n:'축전지 공랭 hA (60 km/h)', u:'W/K', v:15, d:1, g:T2G.bth, sb:'축전지 공랭'},
    {k:'b_r', n:'축전지 → 냉각수 열저항 (수랭)', u:'K/W', v:0.05, d:4, g:T2G.bth, sb:'축전지 열'},
    {k:'b_t0', n:'축전지 출발 온도', u:'°C', v:25, d:0, g:T2G.bth, sb:'축전지 열'}, {k:'b_alpha', n:'내부저항 온도 계수 (25 °C 기준)', u:'1/°C', v:0.01, d:3, g:T2G.bat, sb:'내부저항 (온도)'},
    {k:'h_rcf', dk:'rc_f', n:'롤센터 앞 높이', u:'mm', v:30, d:0, g:T2G.rc, sb:'롤센터 · 롤'}, {k:'h_rcr', dk:'rc_r', n:'롤센터 뒤 높이', u:'mm', v:50, d:0, g:T2G.rc, sb:'롤센터 · 롤'},
    {k:'k_roll', dk:'k_roll', n:'롤강성 합 (앞 + 뒤, 롤각 신호용)', u:'N·m/°', v:500, d:0, g:T2G.rc, sb:'롤센터 · 롤'}, {k:'rsd', dk:'rsd', n:'롤강성 앞 몫 (RSD, 탄성 하중 이동 배분)', v:50, d:1, g:T2G.rc, sb:'롤센터 · 롤'},
    // 차량 모델 2 · 3 (도구 T · 6 · 7 · 1 에서 받음)
    {k:'tire_fz0', dk:'tire_fz0', n:'타이어 기준 하중 (μ · 코너링 강성을 잰 하중)', v:736, d:0, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_ca0', dk:'tire_ca0', v:450, d:0, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'}, {k:'tire_cn', dk:'tire_cn', v:0.8, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_c', dk:'tire_c', v:1.3, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'}, {k:'tire_e', dk:'tire_e', v:0, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tire_relax', dk:'tire_relax', v:0.3, d:2, g:T2G.tire, sb:'타이어 곡선 (모델 2 · 3)'},
    {k:'tr_ks', n:'경로 곡률 다듬기 거리 (고정 2 m, 화면에 없음)', u:'m', v:2, d:1, g:T2G.rc, sb:'과도 (모델 3)', ui:'none'},
    {k:'steer_ratio', dk:'steer_ratio', n:'조향비 (핸들 각 ÷ 바퀴 각, 가운데)', v:5, d:2, g:T2G.steer, sb:'최대 조향각'}, {k:'delta_max', dk:'delta_max', n:'최대 조향각 (안쪽 바퀴, 최소 회전 반경도 이 값으로)', v:34, d:1, g:T2G.steer, sb:'최대 조향각'},
    {k:'izz', dk:'izz', v:70, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'ixx', dk:'ixx', v:30, d:1, g:T2G.rc, sb:'과도 (모델 3)'},
    {k:'m_us_f', dk:'m_us_f', v:12, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'m_us_r', dk:'m_us_r', v:12, d:1, g:T2G.rc, sb:'과도 (모델 3)'}, {k:'c_roll', dk:'c_roll', v:30, d:1, g:T2G.rc, sb:'과도 (모델 3)'},
    {k:'v_test', n:'계단 조향 시험 차속 (고정 60 km/h, 화면에 없음)', u:'km/h', v:60, d:0, g:T2G.rc, sb:'과도 (모델 3)', ui:'none'}, {k:'ay_test', n:'계단 조향 정상 횡가속도 (고정 0.4 g, 화면에 없음)', u:'g', v:0.4, d:2, g:T2G.rc, sb:'과도 (모델 3)', ui:'none'},
    {k:'t_skid', dk:'t_skid', v:0, d:3, g:T2G.goal, ui:'none'}
  ],
  /* 결과 칸은 outHTML 이 그림. outputs = 대시보드 반영 · 입력 훑기 · 검증표 이름 */
  outHTML: t2OutHTML,
  outputs:[
    {k:'t_acc_s', n:'가속 기록', u:'s', d:3}, {k:'t_skid_s', n:'스키드패드 기록 (좌우 합)', u:'s', d:3}, {k:'sk_r', n:'스키드패드 주행 반경 (주행선 · 차 크기로)', u:'m', d:3}, {k:'t_ax_s', n:'오토크로스 기록', u:'s', d:2}, {k:'t_end_s', n:'내구 총 시간', u:'s', d:1},
    {k:'e_use', n:'내구 소비 에너지', u:'kWh', d:2}, {k:'e_reg', n:'내구 회생 회수 에너지', u:'kWh', d:3}, {k:'c_lam', n:'타력 (에너지 상한) 에너지 시간 값 λ', u:'s/kWh', d:1, hide:true}, {k:'e_nl_c', n:'내구 소비 에너지 (출력 상한 없이)', u:'kWh', d:2}, {k:'p_lim', n:'내구 출력 상한 비율', u:'%', d:1},
    {k:'vmax', dk:'vmax', d:1}, {k:'ay_skid', dk:'ay_max_sim', d:2},
    {k:'gr_opt', dk:'gr', n:'제안 감속비 (배점 가중)', d:2, hide:true}, {k:'e_lap', dk:'e_lap', d:3, hide:true},
    {k:'c_afmax', n:'최대 앞 슬립각', u:'°', d:2, hide:true}, {k:'c_armax', n:'최대 뒤 슬립각', u:'°', d:2, hide:true}, {k:'c_bmax', n:'최대 차체 각도 β', u:'°', d:2, hide:true},
    {k:'c_dwmax', n:'최대 바퀴 조향각', u:'°', d:2, hide:true}, {k:'c_swmax', n:'최대 핸들 각', u:'°', d:1, hide:true}, {k:'c_satn', n:'타이어 포화 점 수', u:'', d:0, hide:true}, {k:'c_dbad', n:'조향 한계로 느려진 거리', u:'m', d:1, hide:true}, {k:'c_bdlen', n:'차체가 경계에 닿지 않게 속도를 낮춘 거리', u:'m', d:1, hide:true}, {k:'c_bddv', n:'차체 경계로 가장 크게 낮춘 속도', u:'km/h', d:1, hide:true}, {k:'c_bdct', n:'아주 느려도 차체가 닿는 슬라럼 콘', u:'개', d:0, hide:true}, {k:'c_trdt', n:'과도로 늘어난 랩 시간', u:'s', d:3, hide:true}, {k:'c_trlen', n:'과도로 속도를 낮춘 거리', u:'m', d:1, hide:true}, {k:'c_trq', n:'정상보다 더 쓴 타이어 몫 최대 (과도)', u:'%', d:1, hide:true}, {k:'c_trit', n:'과도 되풀이 수', u:'', d:0, hide:true}, {k:'c_trok', n:'과도 상한 다 맞춤 (1)', u:'', d:0, hide:true},
    {k:'k_us_lin', n:'선형 언더스티어 구배 (모델 2)', u:'°/g', d:3, hide:true},
    {k:'tr_v', n:'시험 차속', u:'km/h', d:0, hide:true}, {k:'tr_del', n:'바퀴 조향각 (계단)', u:'°', d:3, hide:true}, {k:'tr_sw', n:'핸들 각 (계단)', u:'°', d:2, hide:true},
    {k:'tr_rss', n:'정상 요레이트 (해석해)', u:'°/s', d:3, hide:true}, {k:'tr_r', n:'요레이트 (3 s, 수치)', u:'°/s', d:3, hide:true}, {k:'tr_gain', n:'요레이트 이득 r/δ', u:'1/s', d:3, hide:true},
    {k:'tr_ay', n:'횡가속도 (3 s)', u:'g', d:3, hide:true}, {k:'tr_os', n:'요레이트 오버슈트', u:'%', d:1, hide:true}, {k:'tr_t90', n:'요레이트 응답 시간 (조향 50 % → 요레이트 90 %)', u:'s', d:3, hide:true},
    {k:'tr_wn', n:'고유진동수 (2 자유도)', u:'Hz', d:3, hide:true}, {k:'tr_zeta', n:'감쇠비 (2 자유도)', u:'', d:3, hide:true}, {k:'tr_beta', n:'차체 각도 β (3 s)', u:'°', d:3, hide:true},
    {k:'tr_phi', n:'롤각 (3 s, 수치)', u:'°', d:3, hide:true}, {k:'tr_phis', n:'롤각 (정상, 해석해)', u:'°', d:3, hide:true}, {k:'tr_kus', n:'언더스티어 구배 (축 코너링 강성)', u:'°/g', d:3, hide:true}, {k:'tmax_o', n:'모터 최대 토크 (피크 토크 표 최댓값)', u:'N·m', d:1, hide:true}   /* 설정값이라 대시보드로 안 보냄 (2026-11-12) */, {k:'q_cool', dk:'q_cool', d:2, hide:true}, {k:'q_mot', dk:'q_mot', d:0, hide:true}, {k:'q_inv', dk:'q_inv', d:0, hide:true}, {k:'q_bat', dk:'q_bat', d:0, hide:true}, {k:'v_end_avg', dk:'v_end_avg', d:1, hide:true},
    {k:'t_free1', n:'내 코스 1번째 랩', u:'s', d:2, hide:true}, {k:'t_free2', n:'내 코스 2번째 랩', u:'s', d:4, hide:true}, {k:'t_freeavg', n:'내 코스 평균 랩', u:'s', d:4, hide:true},
    {k:'n_free', n:'내 코스 랩 수', u:'랩', d:0, hide:true}, {k:'e_free', n:'내 코스 2번째 랩 단자 에너지', u:'kWh', d:5, hide:true},
    {k:'ax_0', n:'가속 출발 종가속도', u:'g', d:2, hide:true}, {k:'ax_max', n:'가속 최대 종가속도', u:'g', d:2, hide:true}, {k:'v_endtop', n:'내구 최고 차속', u:'km/h', d:1, hide:true}, {k:'skid_roll', n:'스키드패드 롤각 (모델 단계 1)', u:'°', d:3, hide:true}, {k:'c_tw', n:'냉각수 끝 온도', u:'°C', d:3, hide:true}, {k:'c_tb', n:'축전지 끝 온도', u:'°C', d:3, hide:true}, {k:'cla_req', n:'필요 C_L·A', u:'m²', d:2, hide:true},
    {k:'v_load', n:'최대 전류 때 단자 전압', u:'V', d:1, hide:true}, {k:'p_max', n:'단자 출력 상한', u:'kW', d:3, hide:true}, {k:'n_base', n:'모터 기저 회전수', u:'rpm', d:0, hide:true},
    {k:'n_lap', n:'내구 랩 수', u:'랩', d:0, hide:true}, {k:'n_st1', n:'첫 드라이버 랩 수', u:'랩', d:0, hide:true}, {k:'e_ok', n:'에너지 한도 안 (1 = 예)', u:'', d:0, hide:true}, {k:'c_tm', n:'고른 코스 끝 모터 온도', u:'°C', d:3, hide:true}
  ],
  sigs:[
    {k:'v', g:'주행', n:'차속', u:'km/h', d:1}, {k:'pw', g:'주행', n:'바퀴 출력 (구동 +, 제동 −)', u:'kW', d:1}, {k:'vlim', g:'주행', n:'코너 한계 속도', u:'km/h', d:1}, {k:'ax', g:'주행', n:'종가속도', u:'g', d:2}, {k:'ay', g:'주행', n:'횡가속도 (왼쪽 선회 +)', u:'g', d:2},
    {k:'fz_fl', g:'바퀴 하중 · 롤', n:'앞왼 바퀴 하중', u:'N', d:0}, {k:'fz_fr', g:'바퀴 하중 · 롤', n:'앞오 바퀴 하중', u:'N', d:0}, {k:'fz_rl', g:'바퀴 하중 · 롤', n:'뒤왼 바퀴 하중', u:'N', d:0}, {k:'fz_rr', g:'바퀴 하중 · 롤', n:'뒤오 바퀴 하중', u:'N', d:0}, {k:'roll', g:'바퀴 하중 · 롤', n:'롤각 (모델 단계 1, 왼쪽 선회 +)', u:'°', d:2}, {k:'tcool', g:'온도 (열 모델)', n:'냉각수 온도 (열 모델 냉각수 온도)', u:'°C', d:1}, {k:'tbat', g:'온도 (열 모델)', n:'축전지 온도 (열 모델 축전지 온도)', u:'°C', d:1}, {k:'tinv', g:'온도 (열 모델)', n:'인버터 온도 (열 모델 인버터 온도)', u:'°C', d:1},
    {k:'rpm', g:'모터 · 축전지', n:'모터 회전수', u:'rpm', d:0}, {k:'tq', g:'모터 · 축전지', n:'모터 토크', u:'N·m', d:1}, {k:'pbat', g:'모터 · 축전지', n:'축전지 단자 출력 (회생 −)', u:'kW', d:1}, {k:'vbat', g:'모터 · 축전지', n:'축전지 단자 전압', u:'V', d:1},
    {k:'eta', g:'모터 · 축전지', n:'모터 × 인버터 효율', u:'%', d:1}, {k:'tmot', g:'온도 (열 모델)', n:'모터 온도', u:'°C', d:1}, {k:'tlim', g:'모터 · 축전지', n:'모터 토크 한계 (디레이팅 포함)', u:'N·m', d:1}, {k:'grip', g:'주행', n:'그립 사용률 (차 전체)', u:'%', d:0}, {k:'t', g:'주행', n:'경과 시간', u:'s', d:2}, {k:'ecum', g:'모터 · 축전지', n:'누적 단자 에너지', u:'Wh', d:0},
    {k:'af', g:'차량 모델 2 (조향 · 슬립)', n:'앞 슬립각 (모델 2, 왼쪽 선회 +)', u:'°', d:2}, {k:'ar', g:'차량 모델 2 (조향 · 슬립)', n:'뒤 슬립각 (모델 2)', u:'°', d:2}, {k:'beta', g:'차량 모델 2 (조향 · 슬립)', n:'차체 각도 β (모델 2)', u:'°', d:2}, {k:'dw', g:'차량 모델 2 (조향 · 슬립)', n:'바퀴 조향각 (모델 2, 두 바퀴 평균)', u:'°', d:2}, {k:'sw', g:'차량 모델 2 (조향 · 슬립)', n:'핸들 각 (모델 2)', u:'°', d:1},
  ],
  sigGroups:['주행', '모터 · 축전지', '온도 (열 모델)', '바퀴 하중 · 롤', '차량 모델 2 (조향 · 슬립)'],   /* 신호 고르기 창의 묶음 순서 */
  sigOn:['v', 'pw'],
  extHTML: t2ExtHTML, midHTML: t2MidHTML, extraI: t2ExtraI, inLock: t2InLock, inEff: t2InEff, inOpt: t2InOpt, inExt: true, inPanel: false, deferCalc: () => T2.tab!=='sim',   /* 편집 탭에서는 계산하지 않음 → 시뮬레이션 탭으로 갈 때 */
  inEmpty: '<p class="muted wb-inempty">입력은 위 [편집] 탭에 항목별로 있습니다. 자주 바꿔 보는 값은 나중에 이곳으로 꺼낼 예정입니다.</p>',
  extGet: () => t2State(),   /* 저장과 같은 범위 (코스 · 모든 표 · 조향각 표 · 냉각 회로 · [표 | 상수]) */
  exReset(){ try{ localStorage.removeItem(wbMK(T2KEY)); }catch(e){} t2ModeReset('ex'); },
  /* 새 파일: 칸 말고 채워야 하는 표 · 배치 (k = 화면 표시 [data-wbneed]) */
  needExt(){ const L = [], P = t2MotorParse(T2.mtext || ''), th = t2Th(), C = T2.cwc && T2.cwc.cool;
    if(!P.pts.length && !P.ptsC.length) L.push({k:'t2:mt', n:'모터 토크 곡선 표', g:'모터 · 인버터', tab:'mt'});
    if(T2.course==='free' && !String(T2.free.text || '').replace(/^.*\n/, '').trim()) L.push({k:'t2:track', n:'내 코스 표', g:'코스', tab:'course'});
    if(th.w && WB.I.cw_mode===1 && !(C && (C.circuits || []).some(c => (c.blocks || []).length))) L.push({k:'t2:cool', n:'냉각 회로 배치', g:'냉각', tab:'cool'});
    /* 회로의 빈칸 (빨간 점선 블럭 · 호스 · 냉각수) 도 필수 (2026-11-12) */
    if(th.w && WB.I.cw_mode===1 && C && !wbEx() && typeof t9Blank==='function') (C.circuits || []).filter(c => (c.blocks || []).length && t9Blank(c).length).forEach(c => L.push({k:'t9:' + c.id, n:`${c.name} 빈칸`, g:'냉각', tab:'cool'}));
    /* [아래 표]를 골랐는데 빈 표 (라디 표는 부품별 독립 수랭일 때만 보임) */
    [...T2MOT.slice(1), 'tire', 'eD', ...T2BAT, ...(WB.I.cw_mode===1 ? [] : T2RAD)].forEach(k => { if(T2.use[k]==='tab' && !t2HasMap(k) && !t2MapOff(k)) L.push({k:'t2:' + k, n:T2ET[k], g:{mot:'모터 · 인버터', bat:'축전지', cool:'냉각', dt:'구동계', tire:'타이어'}[t2Grp(k)] || '', tab:k}); });
    return L; },
  /* 편집 탭 위 단추: 빈 필수 칸이 있는 묶음을 빨강 */
  onNeedOpen(){ T2.tab = 'edit'; },
  /* [도구 연결 ▾]: 도구 9 · 4 에서 가져오기, 도구 9 로 보내기 (2026-11-11) */
  links(){ const o = WB.R && WB.R.out, rd = id => { try{ return JSON.parse(localStorage.getItem(wbStoreKey(id)) || '{}') || {}; }catch(e){ return {}; } }, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
    const cs = cool => { const C = (cool && cool.circuits) || []; return C.some(c => (c.blocks || []).length) ? `수랭 회로 ${C.filter(c => c.kind==='water').length}개 · 공랭 덕트 ${C.filter(c => c.kind!=='water').length}개` : ''; };
    const c9 = typeof T9!=='undefined' ? cs(T9.cool) : '', C4 = typeof t4CellGet==='function' ? t4CellGet() || {} : {};
    const tb = (k, src, unit, P) => ({tool:'도구 4', n:T2ET[k], cat:'축전지', to:`축전지 › ${T2ET[k]}`, now:t2HasMap(k) ? P(t2MtText(k)).msg || '있음' : '비어 있음', val:src ? P(src).msg || '있음' : '', ok:!!src, why:'도구 4 [셀 표]가 비어 있음',
      run(){ const had = t2HasMap(k); T2[k] = src; t2UseAuto(k, had); t2Save(); wbSrcSet('2', ['t2:' + k], '도구 4'); return T2ET[k]; }});
    const s9 = rd('9'), U = k => ((WB_TOOLS['9'] && WB_TOOLS['9'].inputs.find(d => d.k===k)) || {}).u || '', ok2 = !!(o && isFinite(o.c_qm)), why2 = '랩 시뮬 탭에서 계산한 뒤 보낼 수 있음';
    return {
      get:[{tool:'도구 9', n:'냉각 회로 배치 + 부품 수랭 / 공랭', cat:'냉각', to:'편집 › 냉각 › 냉각 회로 (수랭 방식 = [냉각 회로], 냉각수 온도 계산 켬)', now:cs(t2Cwc().cool) || '비어 있음',
          val:c9 ? `${c9} · ${['m', 'i', 'b'].map((p, j) => `${['모터', '인버터', '축전지'][j]} ${t9IsWater(p) ? '수랭' : '공랭'}`).join(' · ')}` : '', ok:!!c9, why:'도구 9 에 배치가 없음',
          run(){ t2Cwc().cool = JSON.parse(JSON.stringify(T9.cool)); Object.assign(WB.I, {cw_mode:1, m_cool:t9IsWater('m'), i_cool:t9IsWater('i'), b_cool:t9IsWater('b'), cw_on:1}); t2Save(); wbSrcSet('2', ['t2:cool'], '도구 9'); return '냉각 회로 배치'; }},
        {tool:'도구 9', n:'외기 온도', cat:'환경', to:'입력 › 외기 온도', now:`${f(WB.I.t_amb, 0)} °C`, val:isFinite(s9.t_amb) ? `${f(s9.t_amb, 0)} °C` : '', ok:isFinite(s9.t_amb), why:'도구 9 의 외기 온도가 비어 있음',
          run(){ WB.I.t_amb = s9.t_amb; wbSrcSet('2', ['t_amb'], '도구 9'); return '외기 온도'; }},
        (() => { const R6 = (() => { try{ return JSON.parse(localStorage.getItem(wbMK('run2x.t6.rows')) || 'null'); }catch(e){ return null; } })(), n6 = R6 && Array.isArray(R6.rows) ? R6.rows.length : 0, S = Array.isArray(T2.stab) ? T2.stab : [];
          return {tool:'도구 6', n:'조향각 표 (핸들 각 → 안쪽 · 바깥 바퀴 각)', cat:'조향', to:'편집 › 서스 · 조향 › 조향 기하 (최대 조향각 · 조향비 칸은 이 표 값으로 잠김)', now:S.length ? `조향각 표 ${S.length}점` : '없음 (100 % 애커먼 · 일정 조향비)',
            val:n6 >= 2 ? `핸들 각 0 ~ ${wbFmt(R6.hw, 0)}° · ${n6}점 (도구 6 마지막 계산)` : '', ok:n6 >= 2, why:'도구 6 을 한 번 계산하면 가져올 수 있음',
            run(){ T2.stab = R6.rows.map(r => r.slice()); t2Save(); wbSrcSet('2', ['t2:stab'], '도구 6'); return `조향각 표 ${n6}점`; }}; })(),
        tb('bO', C4.o, 'V', t => t2GridParse(t, 'V')), tb('bR', C4.r, 'mΩ', t => t2GridParse(t, 'mΩ')), tb('bC', C4.c, '', t2PairParse)],
      info:[] }; },
  /* 뒤로가기 · 앞으로가기: 랩 시뮬 / 편집 탭 · 편집 묶음 · 코스 편집 쪽 */
  navGet: () => ({t:T2.tab, e:T2.etab, c:T2.ecourse}),
  navSet(s){ const tc = T2.tab!==s.t; T2.etab = s.e || T2.etab; T2.ecourse = s.c || T2.ecourse; T2.tab = s.t || T2.tab; T2.menu = ''; t2Save(); wbPaint(['ext']);
    if(tc){ if(T2.tab==='sim'){ t2MapRepaint(); t2PfSoon(); if(WB.dirty || (WB.need || []).length){ WB.dirty = false; wbCalc(); } } else wbNeedMark(); } },   /* 새 파일 빈칸이면 편집 탭에서 시작 */
  needMark(L){ const gs = new Set(L.map(x => x.tab ? t2Grp(x.tab) : (d => d && Object.keys(T2EG).find(e => (T2EG[e] || []).includes(d.g)))(WB_TOOLS['2'].inputs.find(o => o.k===x.k))).filter(Boolean));
    document.querySelectorAll('#wb [data-t2eg]').forEach(b => b.classList.toggle('need', gs.has(b.dataset.t2eg))); document.querySelectorAll('#wb [data-t2tab="edit"]').forEach(b => b.classList.toggle('need', gs.size > 0));
    const ts = new Set(L.map(x => x.tab).filter(Boolean)); document.querySelectorAll('#wb [data-t2et]').forEach(b => b.classList.toggle('need', ts.has(b.dataset.t2et))); },
  /* 목록에서 고른 칸: 편집 탭의 그 묶음 (표는 그 표) */
  needGo(k, tab){ let et = tab; if(!et){ const d = WB_TOOLS['2'].inputs.find(o => o.k===k); et = d && Object.keys(T2EG).find(e => (T2EG[e] || []).includes(d.g)); }
    if(!et) return false; T2.tab = 'edit'; T2.etab = et; t2Save(); wbPaint(['ext']); return true; },
  extSet(d){ if(!d || typeof d!=='object') return; t2Load(d); t2Save(); wbPaint(['ext', 'mid', 'in']); },
  /* 결과가 오면: 고른 모드를 꺼내 씀 (두 모드 모두 들어 있음) → 위 줄 · 지도 · 구동력 선도 */
  onResult(R){ if(R && R.modes) Object.assign(R, R.modes[T2.grMode]);
    /* 시뮬 결과 중 도구 9 가 가져가는 값 (도구 9 [도구 연결]이 읽음, 2026-11-12) */
    { const o = R && R.out; if(o && isFinite(o.c_qm)) try{ localStorage.setItem(wbMK('run2x.t2.res'), JSON.stringify({c_qm:o.c_qm, c_qi:o.c_qi, c_qb:o.c_qb, c_vavg:o.c_vavg, c_trun:o.c_trun})); }catch(e){} }
    if(T2.tab==='sim'){ const hr = $('#wbext .t2-hr'); if(hr) wbPaint(['ext']); t2MapRepaint(); t2PfSoon(); }
    else if(T2.etab==='mt'){ const c = $('#t2mc'); if(c) c.innerHTML = t2EditPlot('mt'); const f = $('#wbext .t2-fcap'); if(f) f.innerHTML = t2EditCap('mt'); } },
  onCursor(){ t2MapRepaint(); t2PfSoon(); },
  tour: M2TOUR,
  verifyBase:{cw_mode:0, cw9:null, bOcv:null, bRes:null, bCap:null, mu_s:0, tire_fz0:0, fz0_m:0, delta_max:0, dl_on:0, drv:0, dr_real:0, dr_ks:0.9, dr_ke:0.7, rg_on:0, wc_on:0, ict_m:1, i_init:40, end:{seg:[], laps:26, stint:13}, free:{seg:[], laps:1, s0:0}, motor:[], motorC:[], effM:null, effI:null, tireMap:null, r_pack:0, i_bms_max:1e9, pmax:1e6, eta_mot:100, eta_inv:100,
              dr_t0:80, dr_t1:100, c_pct:100, kt:0.64, i_pk:1e9, i_ct:1e9, i_cpct:100, di_t0:50, di_t1:85, th_c:6000, th_r:0.02, th_cool:40, cw_tw:NaN, i_wtw:NaN, b_wtw:NaN, cw_fm:NaN, i_wfm:NaN, b_wfm:NaN, cw_fon:0, i_wfon:0, b_wfon:0, pk_dir:NaN, th_init:40, rl_on:0, rl_b:1, w_car:0, oh_f:0, oh_r:0, rl_m:0.2, e_lim:1, md:0, th_on:1, cw_on:0, bt_on:0, in_on:0, m_cool:1, i_cool:1, b_cool:0, eff_mg:0, m_ha60:null, i_ha60:null, b_ha60:null, h_rcf:0, h_rcr:0, k_roll:500, course:'acc', lap:'2', grMode:'my'},
  verify:/*@@VERIFY@@*/,
  calcLimit: 60,   /* 한 번 계산 제한 시간 [s] (주행선 다듬기 포함) */
  code:/*@@CODE@@*/
};

/* ============================================================ 대시보드 '파트별 > 차량 목표 · 파워트레인'
   대시보드 값으로 도구 2P를 돌린 결과 (읽기 전용, 내 감속비 = 대시보드 감속비) */
const T2P = { R:null, key:'', busy:false, w:null };
const T2ONLY = ['p_vmax', 'p_vnom', 'p_vmin', 'p_ah', 'v_ref', 'ke_ratio', 'eta_mot', 'eta_inv', 'c_vmax', 'c_vmin', 'c_vnom', 'c_ah', 'c_pct', 'kt', 'i_pk', 'i_ct', 'i_cpct', 'i_init', 'tr_ks', 'th_c', 'th_r', 'th_cool', 'th_init', 'rl_on', 'w_car', 'oh_f', 'oh_r', 'rl_m', 'rl_b', 'e_lim', 'md', 'th_on', 'cw_on', 'in_on', 'm_cool', 'i_cool', 'b_cool', 'eff_mg', 'inv_r', 'm_ha0', 'm_ha60', 'i_c', 'i_r', 'i_ha0', 'i_ha60', 'b_ha60', 'b_r', 'bt_on', 't_amb', 'cw_v', 'cw_q', 'cw_ra', 'cw_kd', 'cw_fan', 'cw_fon', 'cw_ua', 'cw_itd', 'cw_cm', 'i_wv', 'i_wq', 'i_wra', 'i_wkd', 'i_wfan', 'i_wfon', 'i_wua', 'i_witd', 'i_wcm', 'b_wv', 'b_wq', 'b_wra', 'b_wkd', 'b_wfan', 'b_wfon', 'b_wua', 'b_witd', 'b_wcm', 'cw_mode', 'b_c', 'b_ha', 'b_t0', 'b_alpha', 'h_rcf', 'h_rcr', 'k_roll'];   // 대시보드에 없는 입력: 도구에 저장된 값을 씀
const T2SET = ['md', 'th_on', 'in_on', 'bt_on', 'cw_on', 'cw_mode', 'm_cool', 'i_cool', 'b_cool', 'eff_mg', 'rl_on', 'e_lim', 'drv', 'dr_real', 'rg_on', 'dl_on', 'fz0_m', 'ict_m', 'cw_fm', 'i_wfm', 'b_wfm', 'pk_dir'];   // 이 도구에서 고른 계산 설정 (대시보드 파트 결과도 같은 설정으로)
const T2GOAL = ['t_acc', 't_skid', 't_ax', 't_end'];                                                    // 목표 기록 (대시보드 '차량 목표')
function t2PartInputs(){ const I = {}; WB_TOOLS['2'].inputs.forEach(d => { const db = wbDash(d.dk); I[d.k] = db ? db.v : (wbEx() || d.ui==='none' || d.keep ? d.v : NaN); });   /* 새 파일 · 파트 페이지 = 대시보드 · 2P 저장값만 */
  T2GOAL.forEach(k => { const db = wbDash(k); I[k] = db ? db.v : 0; });
  try{ const s = JSON.parse(localStorage.getItem(wbStoreKey('2')) || '{}') || {}; [...T2ONLY, ...T2SET].forEach(k => { if(typeof s[k]==='number' && isFinite(s[k])) I[k] = s[k]; }); }catch(e){}
  return {...I, ...t2ExtraI(), course:'acc', lap:'1', grMode:'my'}; }   // 모델 단계 · 열 모델 켜고 끔은 이 도구에서 고른 설정 그대로 (화면 결과와 같은 기준)
function t2PartDirty(){ T2P.key = ''; if(typeof DASH!=='undefined' && (DASH.part==='goal' || DASH.part==='pt') && $('#t2part')) t2PartRun(); }
function t2PartRun(){ const I = t2PartInputs(), key = JSON.stringify(I); if(key===T2P.key || T2P.busy) return; T2P.busy = true;
  try{ if(!T2P.w) T2P.w = new Worker(URL.createObjectURL(new Blob([WB_TOOLS['2'].code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false}); } };'], {type:'text/javascript'}))); }catch(e){ T2P.busy = false; return; }
  T2P.w.onmessage = e => { T2P.busy = false; T2P.key = key; if(e.data.ok){ T2P.R = e.data.r; const b = $('#t2part'); if(b) b.innerHTML = t2PartBody(DASH.part, I, T2P.R); } };
  T2P.w.postMessage(I); }
function t2PartHTML(kind){ setTimeout(t2PartRun, 0);
  return `<div class="t2-part"><p class="dp-note">대시보드 설계값과 도구 2P의 코스 · 모터 · 효율 표로 계산한 결과입니다. 표를 바꾸려면 <span class="wb-mpick wb-mpi" tabindex="-1"><span class="lnk">도구 2P 랩타임 시뮬레이터</span>${wbModeBtns('2', '도구 2P')}</span>를 엽니다.</p><div id="t2part">${T2P.R ? t2PartBody(kind, t2PartInputs(), T2P.R) : '<p class="muted">계산 중…</p>'}</div></div>`; }
function t2PartBody(kind, I, R){ const o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  if(kind==='goal'){ const rows = [['가속', I.t_acc, o.t_acc_s, 3], ['스키드패드 (좌우 합)', I.t_skid, o.t_skid_s, 3], ['오토크로스', I.t_ax, o.t_ax_s, 2], ['내구', I.t_end, o.t_end_s, 1]];
    return `<table class="dvi-t t2-gt"><thead><tr><th>종목</th><th>예상 기록</th><th>목표 기록</th><th>차이</th></tr></thead><tbody>${rows.map(([n, g0, t, d]) => { const has = g0 > 0, df = t - g0;
        return `<tr><td>${n}</td><td><b>${f(t, d)}</b> s</td><td>${has ? f(g0, d) + ' s' : '<span class="muted">정하지 않음</span>'}</td><td class="${has && isFinite(df) ? (df > 0 ? 'wb-err' : 'ok') : ''}">${has && isFinite(df) ? (df > 0 ? '+' : '−') + wbFmt(Math.abs(df), d) + ' s' : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="dp-note">대시보드 감속비 ${f(I.gr, 2)}로 계산. 목표 기록은 대시보드 '차량 목표'(공통) 값이고, 차이가 + 면 목표보다 느립니다. 도구 2P의 제안 감속비는 ${f(o.gr_opt, 2)}.</p>`; }
  const F = R.ft; return `<div class="dp-plots">${wbPlot({id:'t2ft', w:640, h:280, x:{d:F.v, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:F.f_m, c:WB_COL[0], n:'모터 구동력', u:'N', dd:0}, {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}], yn:{'N':'바퀴 힘'}, hit:false, label:'구동력 선도'})}</div>
    <div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴, SOC 100 %)</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진 · 일정 속도)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항 (항력 + 구름)</span></div>
    <p class="dp-note">감속비 ${f(I.gr, 2)} · 회전수 한계 최고속 ${f(o.vmax, 1)} km/h · 단자 출력 상한 ${f(o.p_max, 1)} kW. 모터 구동력이 접지 한계보다 큰 구간은 바퀴가 미끄러지므로 접지 한계가 가속을 정합니다. 제안 감속비 ${f(o.gr_opt, 2)}, 내구 평균 랩 단자 에너지 ${f(o.e_lap, 3)} kWh.</p>`; }
