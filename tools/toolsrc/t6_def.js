/* ============================================================
   도구 6 조향 (3D 기구학) — docs/TOOLS-PLAN.md 5절
   - 앞축 3D 하드포인트(도구 5 와 같은 8 점, 엔진 K3D)로 랙을 옮기며 업라이트 자세를 풀어 바퀴 조향각(안 · 바깥), 조향비, 애커먼 %, 최대 조향각, 최소 회전 반경,
     최대 조향에서 캠버 · 잭킹, 유효 너클암, 범프 스티어
   - 기본 점 = 2024 REF4 STEP (도구 5 의 K3D_HP). 킹핀이 수직 · 링크가 한 평면이면 예전 윗면 2D 결과와 같아짐 (검증표)
   - 대시보드로 steer_ratio · ackermann · delta_max · rmin · knuckle_l 을 보냄. [도구 2P 로 조향각 표 보내기] = 핸들 각 → 안 · 바깥 바퀴 각 곡선을 도구 2P 로 복사 (도구 2P 가 링크 기하로 계산)
   ============================================================ */
const M6TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, [도구 연결 ▾](도구 2P 로 조향각 표 보내기), [하드포인트 ▾](5 · 6 · 7 · 8 공통 하드포인트 파일), 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '앞 왼쪽 바퀴의 하드포인트 8 점(도구 5 와 같은 좌표: x 앞 +, y 바깥 +, z 지면 위 +)과 랙 이송비 · 최대 이송입니다. 타이로드 안쪽 점이 랙 끝(볼)입니다. 오른쪽 바퀴는 거울로 셈합니다.'],
  ['#wb #wbout', '결과', '링크 길이 · 조향비, 기준 조향각(두 바퀴 평균)에서 안 · 바깥 각과 애커먼 %, 최대 이송에서 최대 조향각 · 최소 회전 반경입니다. 최소 회전 반경은 아주 느릴 때(슬립 없음) 자전거 등가 각으로 셈합니다. 캠버 · 잭킹은 바퀴 중심 높이를 고정하고 본 값입니다.'],
  ['#wb .wb-sig', '조향각 곡선', '가로축 = 핸들 각. 안쪽 · 바깥 바퀴 각과 완전 애커먼일 때 안쪽 각, 애커먼 %, 조향에 따른 캠버 · 잭킹입니다. 작은 각에서는 애커먼 % 가 크게 흔들립니다.'],
];
const T6G = {car:'차 · 바퀴', rack:'랙 · 기준'};
/* 도구 2P 로 조향각 표 보내기: 결과 곡선 (핸들 각 0 ~ 최대, 41 점) 의 [핸들 각, 안쪽 바퀴, 바깥 바퀴] → 도구 2P 가 기하 조향각 · 최대 조향각 · 조향비 · 최소 회전 반경 · 핸들 속도에 씀 */
const t6Rows = () => { const R = WB.R; if(!R || !R.x || !R.sig) return []; return R.x.d.map((h, j) => [h, R.sig.di[j], R.sig.dout[j]]).filter(r => r.every(Number.isFinite) && r[0] > 0 && r[1] > 0 && r[2] > 0); };
/* 조향각 표를 계산할 때마다 저장 (도구 2P [도구 연결]이 가져감, 다른 도구로 보내기는 없음 2026-11-12) */
const t6RowsSave = () => { const rows = t6Rows(); if(rows.length < 2) return; try{ localStorage.setItem(wbMK('run2x.t6.rows'), JSON.stringify({rows:rows.map(r => r.map(x => +x.toFixed(4))), hw:WB.R.out.hw_max})); }catch(e){} };
const t6Pt = ['lf', 'lr', 'lo', 'uf', 'ur', 'uo', 'ti', 'to'];
WB_TOOLS['6'] = {
  share:'hp', no:'6', stage:'P3-4~5', name:'조향 (3D 기구학)',
  x:{n:'핸들 각', u:'°'},
  sweepFirst:'ay',
  inputs:[
    {k:'L', dk:'L', v:1550, d:0, g:T6G.car}, {k:'tf', dk:'tf', v:1200, d:0, g:T6G.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T6G.car},
    {k:'r_load', dk:'r_load', v:236, d:0, g:T6G.car}, {k:'camber_f', dk:'camber_f', v:-3, d:2, g:T6G.car}, {k:'toe_f', dk:'toe_f', v:0, d:2, g:T6G.car},
    {k:'rack_c', dk:'rack_c', v:90, d:1, g:T6G.rack}, {k:'rack_travel', dk:'rack_travel', v:31.74, d:2, g:T6G.rack}, {k:'d_ref', n:'애커먼 기준 조향각 (두 바퀴 평균)', u:'°', v:15, d:1, g:T6G.rack},
    ...k3dIn('f', t6Pt),
  ],
  outputs:[
    {k:'tie_l', n:'타이로드 길이', u:'mm', d:1, g:'링크 · 조향비'}, {k:'arm_l', n:'너클암 (킹핀축 ~ 타이로드 바깥 볼)', u:'mm', d:1, g:'링크 · 조향비'}, {k:'knuckle_l', dk:'knuckle_l', d:1, g:'링크 · 조향비'},
    {k:'steer_ratio', dk:'steer_ratio', d:2, g:'링크 · 조향비'}, {k:'hw_max', n:'핸들 최대 각 (한쪽)', u:'°', d:0, g:'링크 · 조향비'},
    {k:'d_in_ref', n:'안쪽 바퀴', u:'°', d:2, g:'기준 조향각에서'}, {k:'d_out_ref', n:'바깥 바퀴', u:'°', d:2, g:'기준 조향각에서'}, {k:'d_ideal_ref', n:'완전 애커먼 안쪽 각', u:'°', d:2, g:'기준 조향각에서'},
    {k:'ackermann', dk:'ackermann', d:1, g:'기준 조향각에서'},
    {k:'delta_max', dk:'delta_max', d:2, g:'최대 이송에서'}, {k:'d_out_max', n:'최대 조향각 (바깥 바퀴)', u:'°', d:2, g:'최대 이송에서'}, {k:'ack_max', n:'애커먼 (최대 이송)', u:'%', d:1, g:'최대 이송에서'},
    {k:'r_axle', n:'뒤축 가운데 회전 반경', u:'m', d:2, g:'최대 이송에서'}, {k:'rmin', dk:'rmin', d:2, g:'최대 이송에서'}, {k:'r_outer', n:'바깥 앞바퀴 회전 반경', u:'m', d:2, g:'최대 이송에서'},
    {k:'cam_in_max', n:'캠버 · 안쪽 바퀴 (차체 기준)', u:'°', d:2, g:'최대 이송에서'}, {k:'cam_out_max', n:'캠버 · 바깥 바퀴 (차체 기준)', u:'°', d:2, g:'최대 이송에서'},
    {k:'jack_in', n:'잭킹 · 안쪽 바퀴 (차체가 들림 +)', u:'mm', d:2, g:'최대 이송에서'}, {k:'jack_out', n:'잭킹 · 바깥 바퀴 (차체가 들림 +)', u:'mm', d:2, g:'최대 이송에서'},
    {k:'y_g', n:'킹핀축 지면 y (애커먼 기준 반 윤거)', u:'mm', d:1, g:'킹핀 (도구 5 와 같은 식)'}, {k:'kpi_o', n:'KPI', u:'°', d:2, g:'킹핀 (도구 5 와 같은 식)'}, {k:'caster_o', n:'캐스터', u:'°', d:2, g:'킹핀 (도구 5 와 같은 식)'},
    {k:'trail_o', n:'트레일', u:'mm', d:1, g:'킹핀 (도구 5 와 같은 식)'}, {k:'scrub_o', n:'스크럽', u:'mm', d:1, g:'킹핀 (도구 5 와 같은 식)'}, {k:'bs_o', n:'범프 스티어 (토인 +)', u:'°/mm', d:4, g:'킹핀 (도구 5 와 같은 식)'},
    {k:'rack_c_o', dk:'rack_c', d:1, g:'링크 · 조향비', hide:true}, {k:'rack_travel_o', dk:'rack_travel', d:1, g:'링크 · 조향비', hide:true},
  ],
  sigs:[{k:'di', n:'안쪽 바퀴 조향각', u:'°', d:2}, {k:'dout', n:'바깥 바퀴 조향각', u:'°', d:2}, {k:'dideal', n:'완전 애커먼 안쪽 각', u:'°', d:2}, {k:'ack', n:'애커먼', u:'%', d:1},
        {k:'ci', n:'캠버 · 안쪽 바퀴', u:'°', d:2}, {k:'co', n:'캠버 · 바깥 바퀴', u:'°', d:2}, {k:'ji', n:'잭킹 · 안쪽 바퀴', u:'mm', d:2}, {k:'jo', n:'잭킹 · 바깥 바퀴', u:'mm', d:2}],
  sigOn:['di', 'dout', 'dideal'], xiStart:'end', onResult(){ t6RowsSave(); },
  tour: M6TOUR,
  verifyBase:{camber_f:0, toe_f:0, tf:1200, r_load:236, L:1550, fr:47.5, rack_c:90, rack_travel:30, d_ref:15,
    f_lf_x:175, f_lf_y:200, f_lf_z:100, f_lr_x:-175, f_lr_y:200, f_lr_z:100, f_lo_x:0, f_lo_y:560, f_lo_z:100, f_uf_x:175, f_uf_y:200, f_uf_z:300, f_ur_x:-175, f_ur_y:200, f_ur_z:300, f_uo_x:0, f_uo_y:560, f_uo_z:300, f_ti_x:-70, f_ti_y:200, f_ti_z:200, f_to_x:-70, f_to_y:545, f_to_z:200},   // 검증 기본 = 킹핀 수직 · 링크 한 평면 (예전 윗면 2D 와 같은 꼴)
  verify: /*@@VERIFY@@*/,
  code: /*@@CODE@@*/
};
