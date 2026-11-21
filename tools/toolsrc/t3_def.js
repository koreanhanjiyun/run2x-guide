/* ============================================================
   도구 3 제동 시스템 사이징  — docs/TOOLS-PLAN.md 5절
   - 질량 · 무게중심 · 타이어 μ 로 이상 제동 배분, 마스터실린더 · 밸런스 바 · 캘리퍼 · 패드 · 디스크로 실제 배분 · 라인 압력 · 제동력,
     잠김 순서 · 첫 잠김 감속도 · 네 바퀴 잠김 답력 (규정 제동 시험: 네 바퀴가 모두 잠겨야 함)
   - 기본값: 질량 · 무게중심은 다른 도구와 같은 예시, 유압 부품은 2024 Run2X 제동 시트 (마스터실린더 15.875 mm, 캘리퍼 피스톤 31.242 mm 한쪽 1 개,
     패드 μ 0.32, 디스크 187 mm, 페달비 2.73, 답력 981 N, 밸런스 앞 73.6 %, 하중 반경 236 mm, 패드 높이 0 = 시트처럼 바깥 반지름에서 마찰)
   - 나중에: 디스크 온도 (시트의 열 계산), 페달 기하 (각도 보정), 프로포셔닝 밸브, 항력 · 동적 하중 이동
   ============================================================ */
function t3Fig(I, R){ if(!R || !R.fig) return ''; const F = R.fig, o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  const W = 520, H = 330, ox = 56, oy = H - 40, xm = Math.max(...F.id.map(p => p[0]), F.fmax[0]) * 1.08, ym = Math.max(...F.id.map(p => p[1]), F.fmax[1]) * 1.25;
  const X = x => ox + x / xm * (W - ox - 16), Y = y => oy - y / ym * (oy - 16);
  const pl = pts => pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
  const ax = n => Array.from({length:n + 1}, (_, i) => i);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="t5-svg" role="img" aria-label="이상 · 실제 제동 배분">`;
  ax(5).forEach(i => { const x = xm * i / 5, y = ym * i / 5; s += `<line x1="${X(x)}" x2="${X(x)}" y1="${oy}" y2="16" stroke="#e3e6eb"/><text x="${X(x)}" y="${oy + 14}" text-anchor="middle" class="t5-tx">${wbFmt(x, 0)}</text>
    <line x1="${ox}" x2="${W - 16}" y1="${Y(y)}" y2="${Y(y)}" stroke="#e3e6eb"/><text x="${ox - 6}" y="${Y(y) + 4}" text-anchor="end" class="t5-tx">${wbFmt(y, 0)}</text>`; });
  s += `<polyline points="${pl(F.id)}" fill="none" stroke="#c2410c" stroke-width="2.5"/>`;
  const ex = Math.min(xm, ym * F.beta / (1 - F.beta)); s += `<polyline points="${pl([[0, 0], [ex, ex * (1 - F.beta) / F.beta]])}" fill="none" stroke="#1d5f9a" stroke-width="2"/>`;
  s += `<circle cx="${X(F.lock[0]).toFixed(1)}" cy="${Y(F.lock[1]).toFixed(1)}" r="5" fill="#1d5f9a"/><text x="${(X(F.lock[0]) - 8).toFixed(1)}" y="${(Y(F.lock[1]) + 36).toFixed(1)}" text-anchor="end" class="t5-tx b">${o.lock_first === 1 ? '앞' : '뒤'} 먼저 잠김 ${f(o.a_lock, 2)} g</text>`;
  s += `<circle cx="${X(F.fmax[0]).toFixed(1)}" cy="${Y(F.fmax[1]).toFixed(1)}" r="4" fill="#c2410c"/><text x="${(X(F.fmax[0]) - 6).toFixed(1)}" y="${(Y(F.fmax[1]) - 8).toFixed(1)}" text-anchor="end" class="t5-tx">네 바퀴 ${f(o.a_max, 2)} g</text>`;
  s += `<text x="${(ox + W - 16) / 2}" y="${H - 6}" text-anchor="middle" class="t5-tx">앞축 제동력 [N]</text><text x="14" y="${(oy + 16) / 2}" transform="rotate(-90 14 ${(oy + 16) / 2})" text-anchor="middle" class="t5-tx">뒤축 제동력 [N]</text></svg>`;
  return `<div class="t5-figs">${`<figure class="t5-fig"><figcaption>이상 · 실제 제동 배분</figcaption>${s}</figure>`}</div>
    <p class="muted t5-note">주황 = 이상 배분 (두 축이 같은 비율 μ 를 쓰며 감속 0 → μ g), 파랑 = 지금 유압이 주는 배분 (밸런스 바 · 마스터실린더 · 캘리퍼 · 디스크로 정해지는 직선). 파랑이 주황을 처음 만나는 점에서 그 축이 먼저 잠깁니다. 파랑이 주황 아래 (뒤가 적음) 면 앞이, 위면 뒤가 먼저 잠깁니다.</p>`; }
const M3TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 코드 · 검증(손계산 비교), 내보내기 · 가져오기, 대시보드에 반영이 있습니다.'],
  ['#wb .wb-in', '입력', '차(질량 · 무게중심 · 휠베이스 · 타이어 μ · 하중 반경, 다운포스는 시험 차속에서), 페달(설계 답력 · 페달비 · 밸런스 바), 유압(마스터실린더 · 캘리퍼 피스톤 면적), 마찰(패드 μ · 디스크 · 패드 높이)입니다.'],
  ['#wb #wbmain', '제동 배분 선도', '이상 배분 곡선과 지금 유압의 배분 직선, 먼저 잠기는 점을 그립니다.'],
  ['#wb .wb-sig', '답력–감속도', '가로축 = 답력. 감속도 · 앞뒤 제동력 · 라인 압력입니다. 한 축이 잠기면 그 축 제동력은 μ F_z 에 묶이고 기울기가 꺾입니다.'],
  ['#wb #wbout', '결과', '이상 · 실제 배분, 설계 답력의 라인 압력 · 제동력 · 감속도, 먼저 잠기는 축 · 그 감속도 · 답력, 네 바퀴 잠김 답력(규정 제동 시험) · 최소 페달비입니다.'],
];
const T3G = {car:'차 (도구 1 · 2P 값)', ped:'페달', hyd:'마스터실린더 · 캘리퍼 · 패드', disc:'디스크', cprobe:'답력 곡선', cdn:'다운포스', th:'디스크 온도'};
/* 편집 배치 (2026-11-11): 다른 도구 값 / 부품 / 계산 조건 (보고자 하는 계산 대상별) */
const T3LAY = () => [{h:'다른 도구에서 오는 차 값', n:1, cards:[{g:T3G.car, k:3}]}, {h:'브레이크 부품', n:4, cards:[{g:T3G.ped}, {g:T3G.hyd, span:2, k:2}, {g:T3G.disc}]}, {h:'계산 조건', n:3, cards:[{g:T3G.cprobe}, {g:T3G.cdn}, {g:T3G.th}]}];
WB_TOOLS['3'] = {
  no:'3', stage:'P1 · P3-8', name:'제동 시스템 사이징 ',
  x:{n:'답력', u:'N'}, mainTitle:'제동 배분 선도', mainMeta:'이상 곡선 · 실제 직선',
  edLay: T3LAY,
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:T3G.car}, {k:'fr', dk:'fr', n:'앞 하중 비율', v:47.5, d:1, g:T3G.car}, {k:'h', dk:'h', v:290, d:0, g:T3G.car}, {k:'L', dk:'L', v:1550, d:0, g:T3G.car},
    {k:'mu', dk:'mu', v:1.5, d:2, g:T3G.car}, {k:'r_load', dk:'r_load', v:236, d:0, g:T3G.car},
    {k:'cla', dk:'cla', v:3, d:2, g:T3G.car}, {k:'xcop', dk:'xcop', v:775, d:0, g:T3G.car}, {k:'v_b', n:'시험 차속 (다운포스만)', u:'km/h', v:0, d:0, g:T3G.cdn},
    {k:'f_ped', n:'설계 답력 (드라이버가 낼 수 있는 힘)', u:'N', v:981, d:0, g:T3G.ped}, {k:'pedal_ratio', dk:'pedal_ratio', v:2.73, d:2, g:T3G.ped}, {k:'brake_bias', dk:'brake_bias', n:'밸런스 바 앞 몫', v:73.6, d:1, g:T3G.ped},
    {k:'eta_b', n:'페달 · 유압 기계 효율', u:'%', v:100, d:0, g:T3G.ped},
    {k:'mc_f', dk:'mc_f', v:15.875, d:3, g:T3G.hyd}, {k:'mc_r', dk:'mc_r', v:15.875, d:3, g:T3G.hyd},
    {k:'cal_area_f', dk:'cal_area_f', n:'캘리퍼 피스톤 면적 (앞, 한쪽 합)', v:766.6, d:1, g:T3G.hyd}, {k:'cal_area_r', dk:'cal_area_r', n:'캘리퍼 피스톤 면적 (뒤, 한쪽 합)', v:766.6, d:1, g:T3G.hyd},
    {k:'pad_mu', dk:'pad_mu', v:0.32, d:2, g:T3G.hyd}, {k:'disc_d_f', dk:'disc_d_f', v:187, d:0, g:T3G.disc}, {k:'disc_d_r', dk:'disc_d_r', v:187, d:0, g:T3G.disc},
    {k:'pad_h', n:'패드 높이 (유효 반지름 = 바깥 반지름 − 패드 높이 ÷ 2)', u:'mm', v:0, d:1, g:T3G.hyd},
    {k:'v_stop', n:'정지 시작 차속 (디스크 온도)', u:'km/h', v:100, d:0, g:T3G.th}, {k:'n_stop', n:'연속 정지 횟수 (사이 냉각 없음)', u:'회', v:5, d:0, g:T3G.th},
    {k:'m_disc_f', n:'디스크 하나 질량 (앞)', u:'kg', v:0.45, d:3, g:T3G.disc}, {k:'m_disc_r', n:'디스크 하나 질량 (뒤)', u:'kg', v:0.45, d:3, g:T3G.disc},
    {k:'c_disc', n:'디스크 비열 (강 460)', u:'J/(kg·K)', v:460, d:0, g:T3G.disc},
    {k:'disc_t', dk:'disc_t', u:'mm', d:1, g:T3G.disc, opt:true},   /* 공유 기록 (계산에 안 씀, 2026-11-12) */
    {k:'f_probe', n:'탐침 답력 (곡선 위 한 점)', u:'N', v:1200, d:0, g:T3G.cprobe},
  ],
  outputs:[
    {k:'ideal_f', n:'이상 배분 (앞, 네 바퀴 동시 잠김)', u:'%', d:1, g:'배분'}, {k:'act_f', n:'실제 배분 (앞, 유압)', u:'%', d:1, g:'배분'}, {k:'a_max', n:'최대 감속도 (이상 배분)', u:'g', d:2, g:'배분'},
    {k:'p_f', n:'라인 압력 (앞, 설계 답력)', u:'bar', d:1, g:'설계 답력에서'}, {k:'p_r', n:'라인 압력 (뒤, 설계 답력)', u:'bar', d:1, g:'설계 답력에서'},
    {k:'fx_f', n:'앞축 제동력', u:'N', d:0, g:'설계 답력에서'}, {k:'fx_r', n:'뒤축 제동력', u:'N', d:0, g:'설계 답력에서'}, {k:'a_ped', n:'감속도 (잠기기 전까지)', u:'g', d:2, g:'설계 답력에서'},
    {k:'lock_first', n:'먼저 잠기는 축', u:'', d:0, g:'잠김', fmt:v => `<b>${v === 1 ? '앞' : v === 2 ? '뒤' : '—'}</b>`}, {k:'a_lock', n:'첫 잠김 감속도', u:'g', d:2, g:'잠김'}, {k:'f_lock1', n:'첫 잠김 답력', u:'N', d:0, g:'잠김'},
    {k:'eff_b', n:'제동 효율 (첫 잠김 ÷ 최대 감속도)', u:'%', d:1, g:'잠김'},
    {k:'pedal_force', dk:'pedal_force', n:'네 바퀴 잠김 답력 (규정 제동 시험)', d:0, g:'규정 제동 시험'}, {k:'rule_lock', n:'설계 답력으로 네 바퀴 잠김', u:'', d:0, g:'규정 제동 시험', fmt:v => v === 1 ? '<b class="ok">가능</b>' : v === 0 ? '<b class="wb-err">못 잠금</b>' : '—'},
    {k:'pr_min', n:'최소 페달비 (설계 답력으로 네 바퀴 잠김)', u:'', d:2, g:'규정 제동 시험'},
    {k:'bb_ideal', n:'이상 배분이 되는 밸런스 바 앞 몫', u:'%', d:1, g:'배분'},
    {k:'e_stop', n:'한 번 정지 운동 에너지', u:'kJ', d:1, g:'디스크 온도'}, {k:'dt_f', n:'온도 상승 · 한 번 (앞 디스크)', u:'K', d:1, g:'디스크 온도'}, {k:'dt_r', n:'온도 상승 · 한 번 (뒤 디스크)', u:'K', d:1, g:'디스크 온도'},
    {k:'dt_fn', n:'온도 상승 · 연속 (앞)', u:'K', d:0, g:'디스크 온도'}, {k:'dt_rn', n:'온도 상승 · 연속 (뒤)', u:'K', d:0, g:'디스크 온도'},
    {k:'a_probe', n:'탐침 답력 감속도', u:'g', d:3, g:'설계 답력에서'}, {k:'st_probe', n:'탐침 답력 잠김 (0 없음 · 1 앞 · 2 뒤 · 3 둘 다)', u:'', d:0, g:'설계 답력에서', hide:true},
    {k:'kf', n:'답력 1 N 당 앞축 제동력', u:'N/N', d:3, g:'잠김', hide:true}, {k:'kr', n:'답력 1 N 당 뒤축 제동력', u:'N/N', d:3, g:'잠김', hide:true},
  ],
  sigs:[{k:'a', n:'감속도', u:'g', d:3}, {k:'ff', n:'앞축 제동력', u:'N', d:0}, {k:'fr', n:'뒤축 제동력', u:'N', d:0}, {k:'pf', n:'라인 압력 (앞)', u:'bar', d:1}, {k:'prr', n:'라인 압력 (뒤)', u:'bar', d:1},
        {k:'st', n:'잠김 (0 없음 · 1 앞 · 2 뒤 · 3 둘 다)', u:'', d:0}],
  sigOn:['a'],
  figure: t3Fig, tour: M3TOUR,
  verifyBase:{v_b:0, pad_h:0, eta_b:100, v_stop:100, n_stop:5, m_disc_f:0.45, m_disc_r:0.45, c_disc:460},
  verify: /*@@VERIFY@@*/,
  code: /*@@CODE@@*/
};
