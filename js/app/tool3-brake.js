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
  verify: [
    {n:'이상 배분 · 네 바퀴 동시 잠김 (μ = 1.5, 다운포스 없음)', I:{}, expect:{ideal_f:75.564516, a_max:1.5},
     src:'앞 몫 = 앞 하중 비 + μ h ÷ L = 0.475 + 1.5 × 290 ÷ 1550 = 0.755645, 최대 감속 = μ g'},
    {n:'실제 배분 · 라인 압력 (앞 · 뒤 같은 마스터실린더 · 캘리퍼 · 디스크 → 배분 = 밸런스 바 몫)', I:{}, expect:{act_f:73.6, p_f:99.584585},
     src:'β = k_f ÷ (k_f + k_r), k ∝ 밸런스 몫 ÷ A_mc × A_캘리퍼 × r_디스크 → 같은 부품이면 β = 73.6 %. p_f = 981 × 2.73 × 0.736 ÷ (π × 15.875² ÷ 4 = 197.93 mm²) = 9.958 MPa = 99.58 bar'},
    {n:'잠김 순서 · 뒤 먼저 (β = 73.6 % < 이상 75.56 %)', I:{}, expect:{lock_first:2, a_lock:1.445896, f_lock1:793.603336},
     src:'a_뒤 = μ W_r ÷ (m (1 − β + μ h ÷ L)) = 1.5 × 1545.08 ÷ (300 × 0.54465) = 14.184 m/s² = 1.4459 g (a_앞 = 1.5647 g 보다 작음). 답력 = m a ÷ (k_f + k_r), k_f + k_r = 5.36196 N/N (2 바퀴 × p × 766.6 mm² × 2 패드 × 0.32 × 93.5 mm ÷ 236 mm)'},
    {n:'네 바퀴 잠김 답력 · 최소 페달비', I:{}, expect:{pedal_force:845.274801, rule_lock:1, pr_min:2.352294},
     src:'a = μ g 에서 F_zf* = 1396.9 + 300 × 14.715 × 0.290 ÷ 1.550 = 2222.84 N, F_zr* = 720.10 N → 답력 max(1.5 × 2222.84 ÷ k_f, 1.5 × 720.10 ÷ k_r) = max(844.9, 763.1) → 845.27 N (k_f = 3.9464, k_r = 1.4156). 최소 페달비 = 2.73 × 845.27 ÷ 981'},
    {n:'밸런스 앞 85 % · 앞 먼저 잠김', I:{brake_bias:85}, expect:{lock_first:1, a_lock:1.251416, pedal_force:1341.18138},
     src:'a_앞 = μ W_f ÷ (m (β − μ h ÷ L)) = 1.5 × 1397.93 ÷ (300 × (0.85 − 0.28065)) = 12.276 m/s² = 1.2514 g. 네 바퀴는 뒤가 정함 = 1.5 × 720.10 ÷ k_r (k_r = 0.80535)'},
    {n:'다운포스 (60 km/h, C_L·A 3, 압력중심 휠베이스 가운데)', I:{v_b:60}, expect:{a_max:1.760151, ideal_f:75.934017},
     src:'D = ½ × 1.225 × 3 × 16.667² = 510.42 N (앞뒤 절반), 최대 감속 = μ (W + D) ÷ m = 1.5 × 3453.42 ÷ 300 = 17.267 m/s² = 1.7602 g, 앞 몫 = (W_f + D/2 + m a h ÷ L) ÷ (W + D)'},
    {n:'패드 높이 30 mm → 유효 반지름 78.5 mm', I:{pad_h:30}, expect:{pedal_force:1006.792279},
     src:'제동력이 93.5 ÷ 78.5 배 줄어 답력은 845.27 × 93.5 ÷ 78.5 = 1006.79 N'},
    {n:'밸런스 바 맞춤 (앞뒤 같은 부품 → 이상 배분 몫 그대로)', I:{}, expect:{bb_ideal:75.564516},
     src:'K_f = K_r 이면 b = β* = 75.56 %'},
    {n:'답력–감속도 · 뒤 잠김 뒤 구간 (답력 820 N: 첫 잠김 793.6 N 과 네 바퀴 845.3 N 사이)', I:{f_probe:820}, expect:{a_probe:1.473535, st_probe:2},
     src:'a = (k_f F + μ W_r) ÷ (m (1 + μ h ÷ L)) = (3.94640 × 820 + 1.5 × 1545.08) ÷ (300 × 1.28065) = 14.455 m/s² = 1.4735 g, 앞은 k_f F = 3236 < μ F_zf'},
    {n:'디스크 온도 (100 km/h → 0, 디스크 0.45 kg, 강 460 J/(kg·K), 5 번 연속)', I:{}, expect:{e_stop:115.740741, dt_f:205.761317, dt_r:73.80569, dt_fn:1028.806584},
     src:'E = ½ × 300 × 27.778² = 115.74 kJ, 앞 디스크 = 0.736 × E ÷ 2 ÷ (0.45 × 460) = 205.76 K, 뒤 = 0.264 × … = 73.81 K, 5 번 = 1028.8 K'}
  ],
  code: `// ================================================================
// 도구 3 제동 시스템 사이징 — 계산 코드 (정상 감속: 이상 배분 · 유압 · 잠김 순서 · 답력–감속도 곡선 · 밸런스 바 맞춤 · 디스크 온도)
// ================================================================
// 입력 I : m [kg], fr [%] 앞 하중, h [mm] 무게중심, L [mm] 휠베이스, mu [-] 타이어 μ, r_load [mm] 바퀴 하중 반경 (제동 토크 → 접지 힘),
//          cla [m²] · xcop [mm] (뒤축에서 앞으로 압력중심) · v_b [km/h] 시험 차속 (다운포스만, 항력은 넣지 않음),
//          f_ped [N] 설계 답력, pedal_ratio [-], brake_bias [%] 밸런스 바 앞 몫, mc_f · mc_r [mm] 마스터실린더 지름,
//          cal_area_f · cal_area_r [mm²] 캘리퍼 한쪽 피스톤 면적 합, pad_mu [-], disc_d_f · disc_d_r [mm] 디스크 바깥 지름, pad_h [mm] 패드 높이, eta_b [%] 기계 효율
// 식 (Limpert, Brake Design and Safety 7 장 · 2024 Run2X 제동 시트와 같은 꼴):
//   축 하중 (감속 a): F_zf = W_f + D_f + m a h ÷ L,  F_zr = W_r + D_r − m a h ÷ L   (D = ½ρ C_L·A v², 앞 몫 = xcop ÷ L)
//   이상 배분 (두 축이 함께 잠김, a = μ (W + D) ÷ m): 앞 몫 = F_zf ÷ (F_zf + F_zr)
//   유압: p_f = F_답력 × 페달비 × 밸런스 앞 몫 × η ÷ A_mc,f,  축 제동력 = 2 바퀴 × p × A_캘리퍼 × 2 패드 × μ_패드 × r_디스크 ÷ r_load,  r_디스크 = 바깥 반지름 − 패드 높이 ÷ 2
//   실제 배분 β = F_f ÷ (F_f + F_r) (답력과 상관없이 일정, 프로포셔닝 밸브 없음)
//   잠김 감속: 앞 β m a = μ F_zf(a) → a_f = μ (W_f + D_f) ÷ (m (β − μ h ÷ L)),  뒤 (1 − β) m a = μ F_zr(a) → a_r = μ (W_r + D_r) ÷ (m (1 − β + μ h ÷ L))
//   먼저 잠기는 축 = 작은 쪽, 그때 답력 = m a ÷ (축 제동력 합 ÷ 답력).  네 바퀴 잠김 (a = μ g 쪽) 답력 = max(μ F_zf* ÷ k_f, μ F_zr* ÷ k_r)  (k = 답력 1 N 당 축 제동력)
//   답력–감속도 (잠긴 축은 μ F_z 로 묶임): 안 잠김 m a = (k_f + k_r) F,  앞 잠김 m a = μ (W_f + m a h ÷ L) + k_r F → a = (μ W_f + k_r F) ÷ (m (1 − μ h ÷ L)),
//     뒤 잠김 m a = k_f F + μ (W_r − m a h ÷ L) → a = (k_f F + μ W_r) ÷ (m (1 + μ h ÷ L)),  둘 다 → a = μ W ÷ m
//   밸런스 바 맞춤 (실제 = 이상): β(b) = b K_f ÷ (b K_f + (1 − b) K_r), K = A_캘리퍼 r_디스크 ÷ A_mc → b = β* K_r ÷ (K_f (1 − β*) + β* K_r)
//   디스크 온도 (한 번 정지, 단열 · 보수적): E = ½ m v² (차속 v_stop → 0), 디스크 하나 = E × (앞 β, 뒤 1 − β) ÷ 2,  ΔT = E_디스크 ÷ (m_디스크 c),  c = 강 460 J/(kg·K)
//     연속 정지 n_stop 번 (사이 냉각 없음) = n × ΔT  (FMVSS 135 페이드 시험처럼 보수적 상한)
const g = 9.81, RHO = 1.225;
function calc(I) {
  const pos = (v, nm) => { if (!(v > 0)) throw new Error(nm + ' 는 0 보다 커야 합니다.'); return v; };
  const m = pos(I.m, '질량'), L = pos(I.L, '휠베이스') / 1000, h = Math.max(0, I.h) / 1000, fs = I.fr / 100, mu = pos(I.mu, '타이어 μ'), rl = pos(I.r_load, '하중 반경') / 1000;
  const v = Math.max(0, I.v_b || 0) / 3.6, D = 0.5 * RHO * Math.max(0, I.cla || 0) * v * v, fa = I.L > 0 && isFinite(I.xcop) ? I.xcop / I.L : fs;
  const Wf = m * g * fs + D * fa, Wr = m * g * (1 - fs) + D * (1 - fa), W = Wf + Wr;   // 정지 축 하중 + 다운포스 [N]
  const amax = mu * W / m, Fzf = a => Wf + m * a * h / L, Fzr = a => Wr - m * a * h / L;
  const ideal = Fzf(amax) / W;                                                                // 이상 배분 앞 몫
  // 유압 · 제동력 (답력 1 N 당)
  const Amf = Math.PI * pos(I.mc_f, '앞 마스터실린더 지름') ** 2 / 4, Amr = Math.PI * pos(I.mc_r, '뒤 마스터실린더 지름') ** 2 / 4;   // [mm²]
  const bb = I.brake_bias / 100; if (!(bb > 0 && bb < 1)) throw new Error('밸런스 바 앞 몫은 0 ~ 100 % 사이여야 합니다.');
  const eta = (I.eta_b > 0 ? I.eta_b : 100) / 100, PR = pos(I.pedal_ratio, '페달비');
  const rd = (d, nm) => { const r = (pos(d, nm) / 2 - Math.max(0, I.pad_h || 0) / 2) / 1000; if (!(r > 0)) throw new Error('패드 높이가 디스크보다 큽니다.'); return r; };
  const rdf = rd(I.disc_d_f, '앞 디스크 지름'), rdr = rd(I.disc_d_r, '뒤 디스크 지름'), mp = pos(I.pad_mu, '패드 μ');
  const pf1 = PR * bb * eta / Amf, pr1 = PR * (1 - bb) * eta / Amr;                            // 답력 1 N 당 압력 [N/mm² = MPa]
  const kf = 2 * pf1 * pos(I.cal_area_f, '앞 캘리퍼 면적') * 2 * mp * rdf / rl, kr = 2 * pr1 * pos(I.cal_area_r, '뒤 캘리퍼 면적') * 2 * mp * rdr / rl;   // 답력 1 N 당 축 제동력 [N/N]
  const beta = kf / (kf + kr);
  // 잠김
  const af = beta - mu * h / L > 0 ? mu * Wf / (m * (beta - mu * h / L)) : Infinity, ar = mu * Wr / (m * (1 - beta + mu * h / L));
  const first = af <= ar ? 1 : 2, aL = Math.min(af, ar, amax), Fp1 = m * aL / (kf + kr);
  const Fall = Math.max(mu * Fzf(amax) / kf, mu * Fzr(amax) / kr);
  const Fp = pos(I.f_ped, '설계 답력'), aP = Math.min((kf + kr) * Fp / m, aL);             // 설계 답력에서 감속 (잠기기 전까지 [m/s²])
  // 답력 F 에서 감속 (잠김 반영) · 축 제동력
  const decel = F => { const a0 = (kf + kr) * F / m, Ff0 = kf * F, Fr0 = kr * F;
    const lockF = Ff0 > mu * Fzf(a0) + 1e-9, lockR = Fr0 > mu * Math.max(0, Fzr(a0)) + 1e-9;
    if (!lockF && !lockR) return { a: a0, ff: Ff0, fr: Fr0, st: 0 };
    let a = lockF ? (mu * Wf + kr * F) / (m * (1 - mu * h / L)) : (kf * F + mu * Wr) / (m * (1 + mu * h / L));
    if (lockF && kr * F > mu * Fzr(a) - 1e-9) return { a: amax, ff: mu * Fzf(amax), fr: mu * Fzr(amax), st: 3 };
    if (lockR && kf * F > mu * Fzf(a) - 1e-9) return { a: amax, ff: mu * Fzf(amax), fr: mu * Fzr(amax), st: 3 };
    if (!(a > 0) || a > amax) a = amax;
    return { a, ff: lockF ? mu * Fzf(a) : kf * F, fr: lockF ? kr * F : mu * Fzr(a), st: lockF ? 1 : 2 }; };
  // 밸런스 바 맞춤
  const KF = I.cal_area_f * rdf / Amf, KR = I.cal_area_r * rdr / Amr, bbI = ideal * KR / (KF * (1 - ideal) + ideal * KR);
  // 디스크 온도
  const vs = Math.max(0, I.v_stop || 0) / 3.6, E = 0.5 * m * vs * vs, cD = I.c_disc > 0 ? I.c_disc : 460, ns = Math.max(1, Math.round(I.n_stop || 1));
  const dTf = I.m_disc_f > 0 ? E * beta / 2 / (I.m_disc_f * cD) : NaN, dTr = I.m_disc_r > 0 ? E * (1 - beta) / 2 / (I.m_disc_r * cD) : NaN;
  const pr = decel(Math.max(0, I.f_probe || 0));
  const out = {
    ideal_f: ideal * 100, act_f: beta * 100, a_max: amax / g,
    p_f: pf1 * Fp * 10, p_r: pr1 * Fp * 10,                                                   // 설계 답력의 라인 압력 [bar]
    fx_f: Math.min(kf * Fp, mu * Fzf(aP)), fx_r: Math.min(kr * Fp, Math.max(0, mu * Fzr(aP))), a_ped: aP / g,
    lock_first: first, a_lock: aL / g, f_lock1: Fp1, pedal_force: Fall, rule_lock: Fp >= Fall - 1e-9 ? 1 : 0,
    pr_min: PR * Fall / Fp, eff_b: aL / amax * 100,
    kf, kr, fzf_max: Fzf(amax), fzr_max: Fzr(amax),
    bb_ideal: bbI * 100, e_stop: E / 1000, dt_f: dTf, dt_r: dTr, dt_fn: dTf * ns, dt_rn: dTr * ns,
    a_probe: pr.a / g, st_probe: pr.st,
  };
  // 답력–감속도 곡선 (0 ~ 네 바퀴 잠김 답력 × 1.3, 설계 답력 포함)
  const Fm = Math.max(Fall * 1.3, Fp * 1.1), xs = [], sg = { a: [], ff: [], fr: [], pf: [], prr: [], st: [] };
  for (let i = 0; i <= 60; i++) { const F = Fm * i / 60, q = decel(F); xs.push(+F.toFixed(2)); sg.a.push(q.a / g); sg.ff.push(q.ff); sg.fr.push(q.fr); sg.pf.push(pf1 * F * 10); sg.prr.push(pr1 * F * 10); sg.st.push(q.st); }
  // 이상 곡선 (a = 0 ~ a_max) · 실제 직선 (그림용)
  const id = Array.from({ length: 41 }, (_, i) => { const a = amax * i / 40, u = a * m / W; return [u * Fzf(a), u * Fzr(a)]; });   // 두 축 모두 같은 μ 사용 u
  return { out, x: { d: xs }, sig: sg, fig: { id, beta, lock: [beta * m * aL, (1 - beta) * m * aL], fmax: [mu * Fzf(amax), mu * Fzr(amax)] } };
}
`
};
