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
  const a = e.target.closest('[data-gtg]'); if(a){ WB.I.tg = +a.dataset.gtg; WB.I.tg_v = 0; wbSave(); wbPaint(['in']); wbCalcSoon(); return; }
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
  inLock(k){ if(k==='xcop') return WB.I.cop_m !== 0 ? '무게 배분과 같게' : ''; return ''; },
  inOpt(k){ const seg = (attr, cur, items) => `<span class="t2-inopt"><span class="dc-seg" role="group">${items.map(([v, t]) => `<button type="button" ${attr}="${v}" aria-pressed="${String(cur)===v}">${t}</button>`).join('')}</span></span>`;
    if(k==='tg_v') return seg('data-gtg', Math.round(WB.I.tg || 0), GTGN);
    if(k==='xcop') return seg('data-gcop', WB.I.cop_m !== 0 ? 1 : 0, [['1', '무게 배분'], ['0', '직접']]);
    return ''; },
  inputs:[
    {k:'tg', n:'가로축 목표 (0 가속 · 1 스키드패드 · 2 오토크로스 · 3 내구 · 4 출발 종가속도 · 5 횡가속도 · 6 내구 에너지)', u:'', v:1, d:0, g:GG.tg, ui:'none'},
    {k:'tg_v', n:'목표값 (0 = 기본 차 값)', get u(){ return gTgU()[1]; }, v:0, d:3, g:GG.tg},
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
  verifyBase:{tg:1, tg_v:0, mu_s:0, crr:0, cop_m:1, cda0:0, ld:1e9,
    base: Object.assign(Object.fromEntries(WB_TOOLS['2'].inputs.map(d => [d.k, d.v])), WB_TOOLS['2'].verifyBase)},   // 검증: 도구 2P 기본값 · 검증 기본 (코스 없음)
  verify: [
    {n:'기본 차 · 스키드패드 (에어로 없음, μ 1.5)', I:{cla:0, mu:1.5}, expect:{b_skid:9.895692, b_ay:1.5},
     src:'v = √(μgR), R = 9.125 m → 좌우 한 바퀴씩 합 = 2 × 2πR ÷ v (도구 2P 와 같은 식)'},
    {n:'목표 스키드패드 9.471806 s → 필요 C_L·A = 3 (CoP = 무게 배분, 항력 없음)', I:{cla:0, m:300, fr:50, L:1550, mu:1.5, tg_v:9.471806}, expect:{p_cla:3, p_df:1417.824074},
     src:'mv²/R = μ(mg + ½ρC_LA v²) 를 C_L·A = 3 에 대해 푼 기록 (도구 2P 검증과 같은 경우) → 거꾸로 3. 다운포스 = ½ × 1.225 × 3 × (100/3.6)² = 1417.82 N'},
    {n:'기본 차 · 가속 접지 한계만 (μ 1, CG 뒤축 위, 출력 · 토크 한계 없음)', I:{cla:0, m:300, fr:0, h:0, mu:1, j_eq:0, tmax:1e5, motor:[], pmax:1e4, tg:0}, expect:{b_acc:3.910309},
     src:'a = μg → t = √(2 × 75 ÷ 9.81)'},
    {n:'출발 종가속도 = μg (μ 1, CG 뒤축 위, 토크 한계 없음)', I:{cla:0, m:300, fr:0, h:0, mu:1, j_eq:0, tmax:1e5, motor:[], pmax:1e4, tg:0}, expect:{b_ax0:1},
     src:'뒤축에 무게 전부 · 하중 이동 없음 → 구동 한계 = μ m g → a = μ g = 1 g'},
    {n:'목표 스키드패드 횡가속도 1.637261 g → 필요 C_L·A = 3 (경우 2 와 같은 차)', I:{cla:0, m:300, fr:50, L:1550, mu:1.5, tg:5, tg_v:1.637261}, expect:{p_cla:3},
     src:'경우 2 의 기록 9.471806 s → v = 2 × 2π × 9.125 ÷ 9.471806 = 12.1063 m/s → a_y = v² ÷ (gR) = 1.637261 g. 가로축 = 횡가속도로 거꾸로 풀면 3'}
  ],
  code: `// ================================================================ 냉각 회로 공통 (도구 9 · 도구 2P 계산과 냉각 편집기가 같이 씀)
// 수랭 회로 갈래 유량 (회로에 hyd 가 있으면): 호스 · 블럭 압력 강하가 같아지게 유량이 나뉨 (밸브가 없으면 비율을 직접 정할 수 없으므로)
//   호스  : ΔP = f (L ÷ D) ρ u² ÷ 2,  u = Q ÷ (π D² ÷ 4),  Re = ρ u D ÷ μ,  f = max(64 ÷ Re, 0.3164 Re^(−1/4))   (층류 · 매끈한 관 Blasius 난류, Re ≈ 1188 에서 이어짐)
//   블럭  : ΔP = ΔP_기준 (Q ÷ Q_기준)²  (넣었을 때만, 0 = 없음)
//   펌프  : 유량 고정 = 유량을 정하는 원천 (직렬 = 회로 유량, 갈래마다 하나씩 = 자기 유량),
//           펌프 곡선 (H.crv) = 올리는 압력 H(Q) = H₀ (1 − (Q ÷ Q_max)²) (H₀ = 막힘 압력, Q_max = 압력 0 일 때 유량) → 회로 압력 강하와 만나는 점에서 유량이 정해짐
//   블럭마다 들어감 · 나감 두 이음점 (압력 강하가 없는 블럭은 한 점), 이음점마다 들어오는 유량 = 나가는 유량 → 이음점 압력을 뉴턴법으로 풂
//   hyd = {Vt [L/min], rho [kg/m³], mu [Pa·s], links: [{a, b, d [mm], len [m]}] (점 번호), blk: [{dp [kPa], dq [L/min]}] (점마다), src: [{k, flow [L/min]}] (펌프 점)}
//   돌려줌: 호스마다 유량 ÷ 회로 유량 (풀지 못하면 null), .Vt = 실제 회로 유량 [L/min] (라디 0 번에서 나가는 유량 합, 곡선 펌프면 풀어서 정해짐)
function coolHydSolve(H) {
  const N = H.blk.length, rho = H.rho > 0 ? H.rho : 1000, mu = H.mu > 0 ? H.mu : 1e-3, Vt = H.Vt / 60000;
  if (!(Vt > 0) || !N) return null;
  const pump = new Map((H.src || []).map(s => [s.k, s.flow / 60000])), crv = new Map((H.crv || []).map(s => [s.k, s]));
  // 이음점: 들어감 = 2k, 나감 = 2k + 1, 압력 강하도 펌프도 아닌 블럭은 같은 점
  const par = Array.from({ length: 2 * N }, (_, i) => i), fd = i => par[i] === i ? i : (par[i] = fd(par[i]));
  const hasDP = k => H.blk[k] && H.blk[k].dp > 0 && H.blk[k].dq > 0;
  for (let k = 0; k < N; k++) if (!hasDP(k) && !pump.has(k) && !crv.has(k)) par[fd(2 * k + 1)] = fd(2 * k);
  const ids = [...new Set(par.map((_, i) => fd(i)))], ix = new Map(ids.map((r, j) => [r, j])), M = ids.length, nd = i => ix.get(fd(i));
  // 저항 요소: [u, v, ΔP(Q) (Q ≥ 0, m³/s → Pa)]
  const E = [];
  H.links.forEach((l, li) => { const D = Math.max(1e-3, (l.d > 0 ? l.d : 10) / 1000), Lh = Math.max(1e-3, l.len > 0 ? l.len : 0.5), A = Math.PI * D * D / 4;
    E.push({ u: nd(2 * l.a + 1), v: nd(2 * l.b), li, dP: Q => { const u = Q / A, Re = rho * u * D / mu; if (Re <= 0) return 0;
      const f = Math.max(64 / Re, 0.3164 * Math.pow(Re, -0.25)); return f * Lh / D * rho * u * u / 2; } }); });
  // 곡선 펌프: 들어감 → 나감 요소, 압력 차 d = P_들어감 − P_나감 (= −올린 압력) → Q = Q_max √(1 + d ÷ H₀) (d 가 클수록 많이)
  const PC = [];
  crv.forEach((s, k) => { const H0 = Math.max(1, s.h0 * 1000), qm = Math.max(1e-9, s.qmax / 60000); PC.push({ u: nd(2 * k), v: nd(2 * k + 1), Q: d => qm * Math.sqrt(Math.max(0, 1 + d / H0)), G: d => qm / (2 * H0 * Math.sqrt(Math.max(1e-4, 1 + d / H0))) }); });
  for (let k = 0; k < N; k++) if (hasDP(k) && !pump.has(k) && !crv.has(k)) { const P0 = H.blk[k].dp * 1000, Q0 = H.blk[k].dq / 60000;
    E.push({ u: nd(2 * k), v: nd(2 * k + 1), li: -1, dP: Q => P0 * ((Q / Q0) ** 2 + 1e-3 * Q / Q0) }); }   // 아주 작은 1차 항: Q = 0 근처에서도 풀리게
  // ΔP → Q (단조 증가, 이분법)
  const inv = (e, p) => { if (p <= 0) return 0; let hi = Vt; while (e.dP(hi) < p && hi < 1e3) hi *= 2; let lo = 0;
    for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (e.dP(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
  const flow = (e, P) => { const d = P[e.u] - P[e.v]; return Math.sign(d) * inv(e, Math.abs(d)); };
  const cond = (e, Q) => { const q = Math.max(Math.abs(Q), 1e-6 * Vt), h = q * 1e-4; return 2 * h / Math.max(1e-30, e.dP(q + h) - e.dP(Math.max(0, q - h))); };   // dQ/dΔP
  const P = new Array(M).fill(0), ref = 0;
  const resid = (P, Qs) => { const r = new Array(M).fill(0); E.forEach((e, j) => { r[e.u] -= Qs[j]; r[e.v] += Qs[j]; });
    pump.forEach((q, k) => { r[nd(2 * k)] -= q; r[nd(2 * k + 1)] += q; }); PC.forEach(p => { const q = p.Q(P[p.u] - P[p.v]); r[p.u] -= q; r[p.v] += q; }); return r; };
  for (let it = 0; it < 200; it++) {
    const Qs = E.map(e => flow(e, P)), r = resid(P, Qs), err = Math.max(...r.map((x, j) => j === ref ? 0 : Math.abs(x)));
    if (err < 1e-10 * Vt) { const Va = H.links.reduce((s, l, li) => s + (l.a === 0 ? Qs[E.findIndex(e => e.li === li)] : 0), 0), Vu = PC.length ? Va : Vt;
      const out = H.links.map((_, li) => { const j = E.findIndex(e => e.li === li); return Qs[j] / Vu; }); out.Vt = Vu * 60000; return out; }
    // J ΔP = −r  (J = 이음점 사이 dQ/dΔP 로 만든 라플라스 행렬), 기준점 압력 0
    const n = M - 1, map = j => j < ref ? j : j - 1, J = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    const lap = (u, v, g) => [[u, v], [v, u]].forEach(([a, b]) => { if (a === ref) return; J[map(a)][map(a)] += g; if (b !== ref) J[map(a)][map(b)] -= g; });
    E.forEach((e, j) => lap(e.u, e.v, cond(e, Qs[j]))); PC.forEach(p => lap(p.u, p.v, p.G(P[p.u] - P[p.v])));
    for (let a = 0; a < M; a++) if (a !== ref) J[map(a)][n] = r[a];   // 들어오는 유량 합 − 나가는 합 → 압력을 올리면 나가는 유량이 늚
    const d = coolGauss(J, n); if (!d) return null;
    let s = 1; const Pn = () => P.map((p, a) => a === ref ? 0 : p + s * d[map(a)]);
    for (let b = 0; b < 30; b++) { const P2 = Pn(), Q2 = E.map(e => flow(e, P2)), r2 = resid(P2, Q2), e2 = Math.max(...r2.map((x, j) => j === ref ? 0 : Math.abs(x)));
      if (e2 < err || b === 29) { P.splice(0, M, ...P2); break; } s /= 2; }
  }
  return null;
}
function coolGauss(M, N) { const a = M.map(r => r.slice());
  for (let c = 0; c < N; c++) { let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-30) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < N; r++) { if (r === c) continue; const f = a[r][c] / a[c][c]; if (f) for (let q = c; q <= N; q++) a[r][q] -= f * a[c][q]; } }
  return a.map((r, k) => r[N] / r[k]); }
// 계산 앞 정리 (넘겨받은 회로를 고침):
//   수랭: hyd 가 있으면 호스 유량 몫으로 점마다 들어오는 몫 (ins 셋째 값 = 호스 번호) · 흐름 q 를 다시 정함
//   공랭: 예전 꼴 (parts = 직렬 순서) 이면 점 꼴로 — 점 = {part, q, ins: [[앞 점, 몫]]} (앞 점 −1 = 입구 외기), 흐름 순서대로
function coolPrep(NET) {
  if (!NET) return NET;
  (NET.water || []).forEach(C => { C.nodes.forEach(nd => { if (nd.t === 'rad' && nd.rq && Array.isArray(nd.rq.t) && nd.rq.t.length && Array.isArray(nd.rq.n) && nd.rq.n.length) nd.uaT = coolUAtab(nd, C.rcp || 4.18e6); });   // 라디 표 → UA 표
    if (!C.hyd) return; const fl = coolHydSolve(C.hyd); C.hydOk = !!fl; if (!fl) return;
    if (C.hyd.crv && C.hyd.crv.length && fl.Vt > 0) { C.hyd.Vt = fl.Vt; C.Cc = fl.Vt / 60000 * (C.rcp || 4.18e6); }   // 곡선 펌프: 회로 유량이 풀려서 정해짐
    C.nodes.forEach((nd, k) => { if (!nd.ins) return; nd.ins = nd.ins.map(x => x.length > 2 && x[2] >= 0 ? [x[0], fl[x[2]], x[2]] : x);
      if (k > 0) nd.q = nd.ins.reduce((s, x) => s + x[1], 0); }); });
  (NET.air || []).forEach(D => { if (!D.nodes) D.nodes = (D.parts || []).map((p, j) => ({ part: p, q: 1, ins: [[j - 1, 1]] })); D.parts = D.nodes.map(n => n.part); });
  return NET;
}
// 공랭 덕트 한 칸: 점마다 들어오는 공기 = 앞 점에서 나온 공기를 몫으로 섞음, 부품 → 공기 G = C_q (1 − e^(−hA ÷ C_q)) (C_q = 그 갈래 공기 열용량 흐름 = C_a q)
//   정상: 부품 = 들어온 공기 + L ÷ G,  나가는 공기 = 들어온 공기 + L ÷ C_q
//   시간: 부품 온도를 들어온 공기 + L ÷ G 쪽으로 지수 적분, 나가는 공기 = 들어온 공기 + G (부품 − 들어온 공기) ÷ C_q
//   ss = true 면 정상 온도를 T 에 넣음, 아니면 (T, h, PC, on, toward) 로 한 칸
function coolAir(D, Ca, Ta, T, L, hA, ss, h, PC, on, toward) {
  const out = [];
  D.nodes.forEach((n, k) => { let fs = 0, ft = 0; n.ins.forEach(([j, f]) => { fs += f; ft += f * (j < 0 ? Ta : out[j]); });
    const Tin = fs > 0 ? ft / fs : Ta, Cq = Ca * (n.q > 0 ? n.q : 1), p = n.part, G = Cq > 0 ? Cq * (1 - Math.exp(-hA(p) / Cq)) : 0;
    if (ss) { T[p] = G > 0 ? Tin + L[p] / G : (L[p] > 0 ? Infinity : Tin); out[k] = Cq > 0 ? Tin + L[p] / Cq : Infinity; return; }
    if (on && !on[p]) { out[k] = Tin; return; }
    T[p] = G > 0 ? toward(T[p], Tin + L[p] / G, G / PC[p], h) : T[p] + L[p] * h / PC[p];
    out[k] = Cq > 0 ? Tin + G * (T[p] - Tin) / Cq : Tin; });
  return out;
}
// ---------- 라디에이터 (도구 9 · 2P 같이)
//   공기 = 주행풍 A k_d v + 팬 (팬 켜는 온도 fon 이 있으면: 라디로 들어오는 냉각수가 fon 이상이면 켬, fon − COOL_FH 아래면 끔. 0 = 늘 켬)
//   UA: 표 (nd.rq = {n: 냉각수 유량 L/min, t: 코어 풍속 m/s, e: 방열량 kW}, nd.itd = 그 표의 입구 온도차 K) 가 있으면
//     표의 점마다 ε = Q ÷ (C_min × ITD) → 교차류 ε-NTU 를 거꾸로 풀어 UA = NTU × C_min (coolPrep 에서 한 번) → 코어 풍속 · 냉각수 유량으로 이중선형 (범위 밖은 끝값),
//     없으면 UA = UA₅ (V_f ÷ 5)^0.6 (코어 풍속 5 m/s 기준)
//   라디 금속 열용량 nd.Cm [kJ/K] 은 그 점 열용량에 더함 (정상 온도는 그대로, 오르내리는 빠르기만)
const COOL_RA = 1.2, COOL_CA = 1005, COOL_FH = 3;   // 공기 밀도 [kg/m³] · 비열 [J/kg·K] · 팬 끄는 온도 차 [K]
const coolEps = (NTU, Cr) => NTU <= 0 ? 0 : Cr < 1e-9 ? 1 - Math.exp(-NTU) : 1 - Math.exp(Math.pow(NTU, 0.22) / Cr * (Math.exp(-Cr * Math.pow(NTU, 0.78)) - 1));   // 교차류 (양쪽 안 섞임) 근사
function coolNTU(eps, Cr) { if (!(eps > 0)) return 0; let lo = 0, hi = 1; while (coolEps(hi, Cr) < eps && hi < 1e4) hi *= 2; if (coolEps(hi, Cr) < eps) return Infinity;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (coolEps(m, Cr) < eps) lo = m; else hi = m; } return (lo + hi) / 2; }
function coolUAtab(nd, rcp) { const M = nd.rq, itd = nd.itd > 0 ? nd.itd : 60;
  return M.t.map(vf => M.n.map((fl, j) => { const Ca = COOL_RA * COOL_CA * vf * nd.A, Cc = fl / 60000 * rcp, Cm = Math.min(Ca, Cc), Cx = Math.max(Ca, Cc);
    const row = M.t.indexOf(vf), Q = M.e[row][j] * 1000; if (!(Cm > 0) || !(Q > 0)) return 0;
    const NTU = coolNTU(Math.min(Q / (Cm * itd), 0.999 * coolEps(1e3, Cm / Cx)), Cm / Cx); return isFinite(NTU) ? NTU * Cm : 0; })); }
const coolBil = (ys, xs, Z, y, x) => { const f = (a, v) => { if (v <= a[0]) return [0, 0, 0]; const k = a.length - 1; if (v >= a[k]) return [k, k, 0]; let i = 0; while (a[i + 1] < v) i++; return [i, i + 1, (v - a[i]) / (a[i + 1] - a[i])]; };
  const [i0, i1, w] = f(ys, y), [j0, j1, u] = f(xs, x); return (Z[i0][j0] * (1 - u) + Z[i0][j1] * u) * (1 - w) + (Z[i1][j0] * (1 - u) + Z[i1][j1] * u) * w; };
function coolUA(nd, Vf, Lmin) { if (nd.uaT) return Vf > 0 ? coolBil(nd.rq.t, nd.rq.n, nd.uaT, Vf, Lmin) : 0; return Vf > 0 ? nd.UA * Math.pow(Vf / 5, 0.6) : 0; }
// 라디 점이 섞인 냉각수 열 중 외기로 버리는 몫 a = ε C_min ÷ F  (F = 이 라디 흐름 q C_c), fan = 팬이 도는지
function coolRadA(C, nd, v, fan) {
  const F = (nd.q || 1) * C.Cc, qa = Math.max(0, nd.A * nd.kd * v + (fan ? nd.fan : 0)), Ca = COOL_RA * COOL_CA * qa, Vf = nd.A > 0 ? qa / nd.A : 0;
  const UA = coolUA(nd, Vf, F / (C.rcp || 4.18e6) * 60000), Cm = Math.min(Ca, F), Cx = Math.max(Ca, F), e = Cm > 0 && F > 0 ? coolEps(UA / Cm, Cm / Cx) : 0;
  return F > 0 ? e * Cm / F : 0; }
const coolFanOn0 = nd => !(nd.fon > 0);                                                   // 출발: 켜는 온도가 있으면 꺼진 채
const coolFanNext = (nd, on, Tin) => !(nd.fon > 0) ? true : on ? Tin >= nd.fon - COOL_FH : Tin >= nd.fon;   // 히스테리시스
const coolC = nd => Math.max(1, (nd.C || 1) + (nd.Cm > 0 ? nd.Cm * 1000 : 0));          // 점 열용량 [J/K] (금속 포함)

// ================================================================
// 도구 2P 랩타임 시뮬레이터 — 계산 코드
// ================================================================
// 입력 I : 왼쪽 입력 칸 (단위 그대로: kg, mm, %, 1/kN, rpm, N·m, kW, V, Ah, mΩ, A, kWh, s)과 작업창 위 표
//   I.end   = {seg:[[길이 m, 반경 m], …], laps, stint, WL · WR (점마다 폭, 공식 코스는 실제 콘 위치로), slalom (콘 점 번호), slat (콘 옆 거리)}   공식 내구 코스 (오토크로스 = 거꾸로 한 바퀴)
//   I.th_on · I.in_on · I.bt_on · I.cw_on = 열 모델 켜기 (모터 열 · 인버터 · 축전지 · 냉각수 온도), I.m_cool · I.i_cool · I.b_cool = 0 공랭 · 1 수랭, I.eff_mg = 1 이면 모터 맵에 인버터 합침 (손실 중 인버터 몫 I.inv_r %), I.md = 차량 모델 단계 (0 · 1 롤센터)
//   최소 회전 반경 = 최대 조향각에서 (rKin, dl_on 1 이고 delta_max > 0 일 때, 모든 차량 모델: 주행선 |곡률| ≤ 1/R 을 제약으로 풀고, 못 지킨 구간은 c_rbad 로 알림),  I.e_lim = 내구 에너지 상한 (0 없음 · 1 제원 용량 · 2 임의 e_target)
//   I.free  = {seg, wl, wr, sl, laps, s0}               내 코스 (반경: 왼쪽 회전 +, 오른쪽 −, 직선 0 · 구간마다 왼쪽 · 오른쪽 폭 [m], 슬라럼 콘 간격 [m], null = 빈칸)
//   I.motor = [[회전수 rpm, 토크 N·m], …]                모터 토크 곡선 (기준 전압 I.v_ref 에서. 비면 최대 토크 일정)
//   I.effM · I.effI = 효율 맵 {n:[rpm], t:[N·m], e:[[%]]} 또는 null (→ 상수 I.eta_mot · I.eta_inv)
//   I.grMode = 'my'(입력한 감속비) | 'opt'(제안 감속비),  I.course = 고른 코스,  I.lap = 볼 랩('1' … | 'all')
//   I._sweep = 입력 훑기 중 (줄여 셈)
//
// 모델 : 점질량 준정적(QSS)
//   - 앞뒤 하중 이동 (종가속 · 항력 높이 · 다운포스 앞뒤 몫), 좌우 하중 이동 (모델 0: 넘기려는 모멘트를 축 무게 몫대로, 모델 1 이상: 롤센터 · 롤강성 배분)
//   - 바퀴마다 μ = μ0 − 하중 감도 × 하중 [kN] → 축이 낼 수 있는 힘 = Σ μ·Fz.  횡력은 무게 배분대로 앞뒤에 나눔
//   - 뒤축 구동 (모터 1개, 축 단위 마찰원).  제동은 이상 배분 가정 (제동 장치 한계는 도구 3).  롤 · 회생 · 디퍼렌셜 없음
//   - 모터 : 토크 곡선의 회전수 축을 (단자 전압 ÷ 기준 전압) ÷ 유도 전압 비 로 늘이고 줄임
//   - 축전지 : 개방 전압 = 직렬 수 × (셀 최소 + (셀 최대 − 셀 최소) × SOC) (선형 근사),  단자 전압 = 개방 − 전류 × 저항
//   - 단자 출력 ≤ min(규정 출력 상한, 전류 한계).  모터 축 출력 = 단자 출력 × 모터 효율 × 인버터 효율
//   - 내구 에너지 제한 : 소비 (개방 전압 × 전류, 저항 손실 포함)가 쓸 수 있는 에너지를 넘으면 단자 출력 상한을 같은 비율로 낮춤
//   - 현실 운전자 (dr_real 1): 마찰 타원 (종 · 횡 한계 모두) 에 그립 사용률을 곱함. 스키드패드 · 오토크로스 · 내 코스 [기록 주행] = k_s (dr_ks), 내 코스 [내구 주행] = k_s × k_e,
//     내구 = k_s × k_e (dr_ke, 장시간 · 추월 대기 · 피로 등 내구 페이스), 가속 = 1 (WOT, 운전자 요소 없음)
//     기본값 근거 (HANDOFF 41 ~ 42차, 모델 3): k_s = 오토크로스 E-Formula 완주 팀 중앙값 맞춤, k_e = 실제 기록끼리의 '내구 랩 ÷ 오토크로스' 중앙값 맞춤

const g = 9.81;      // 중력가속도 [m/s²]
const RHO = 1.225;   // 공기 밀도 [kg/m³]
let VC = null;       // 곡률별 코너 한계 속도 기억 (감속비 · 전압과 상관없음)
let VCF = new Map(), RTC = new Map();   // RTC = 모델 2 축 한계 비율 표 기억 (타이어 값마다) // 곡률별 조향 한계 표시 (0 없음 · 1 조향 한계로 느려짐 · 2 돌 수 없음, 모델 2)


// ---------------------------------------------------------------- 보간
// 1차원 표 t = [[x, y], …] 직선 보간 (범위 밖은 끝값)
const tab1 = (t, x) => {
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (x <= t[i][0]) {
      const a = t[i - 1], b = t[i];
      return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1);
    }
  }
  return t[t.length - 1][1];
};

// 2차원 맵 M = {n:[회전수], t:[토크], e:[[효율 %]]} 쌍선형 보간
function bil(M, n, T) {
  const f = (a, x) => {
    if (x <= a[0]) return [0, 0, 0];
    const k = a.length - 1;
    if (x >= a[k]) return [k, k, 0];
    let i = 0;
    while (a[i + 1] < x) i++;
    return [i, i + 1, (x - a[i]) / (a[i + 1] - a[i])];
  };
  const [j0, j1, u] = f(M.n, n), [i0, i1, w] = f(M.t, T), e = M.e;
  return (e[i0][j0] * (1 - u) + e[i0][j1] * u) * (1 - w) + (e[i1][j0] * (1 - u) + e[i1][j1] * u) * w;
}


// ================================================================ 부품별 독립 냉각 (cw_mode 0): 수랭 부품마다 [라디 → 펌프 → 부품] 회로 (냉각 회로와 같은 꼴, 2026-11-10 통일)
//   부품 p (모터 cw_ · 인버터 i_w · 축전지 b_w): 냉각수 양 v [L] (회로 전체, 세 점에 똑같이), 펌프 유량 q [L/min], 라디 코어 앞면 면적 ra [m²] · 주행풍 통과 비율 kd ·
//   팬 유량 fan [m³/s] · 팬 켜는 온도 fon [°C, 0 = 늘 켬] · UA (코어 풍속 5 m/s) ua [W/K] 또는 라디 표 (I.rq{M,I,B} = {n 유량, t 풍속, e kW}, 입구 온도차 itd [K]) · 라디 금속 열용량 cm [kJ/K]
//   수랭 여부: 모터 m_cool (기본 수랭) · 인버터 i_cool (기본 수랭) · 축전지 b_cool (기본 공랭). 냉각수 밀도 1000 kg/m³ · 비열 4180 J/kg·K
const T2CWP = { m: ['cw_', 'rqM'], i: ['i_w', 'rqI'], b: ['b_w', 'rqB'] };
function coolIndep(I) { const water = [];   // 냉각수 ρ c_p 는 회로마다 (밀도 kg/m³ × 비열 kJ/(kg·K) × 1000, 2026-11-11 · 예전 물 고정 1000 × 4180)
  const on = { m: I.m_cool !== 0, i: I.i_cool !== 0, b: I.b_cool === 1 };
  ['m', 'i', 'b'].forEach(p => { if (!on[p]) return; const [k, tk] = T2CWP[p], g = s => I[k + s], rcp = (g('rho') > 0 ? g('rho') : 1000) * (g('cp') > 0 ? g('cp') : 4.18) * 1000;
    const V = Math.max(1e-3, g('v') > 0 ? g('v') : 1.2), q = Math.max(1e-3, g('q') > 0 ? g('q') : 8), C = V / 1000 * rcp / 3, rq = I[tk] && Array.isArray(I[tk].t) ? I[tk] : null;
    water.push({ Cc: q / 60000 * rcp, rcp, nodes: [
      { t: 'rad', C, q: 1, ins: [[2, 1]], UA: Math.max(0, g('ua') || 0), A: Math.max(1e-6, g('ra') || 0.06), kd: Math.max(0, g('kd') || 0), fan: Math.max(0, g('fan') || 0), fon: g('fon') || 0, Cm: Math.max(0, g('cm') || 0), ...(rq ? { rq, itd: g('itd') } : {}) },
      { t: 'pump', C, q: 1, ins: [[0, 1]] },
      { t: 'part', part: p, C, q: 1, ins: [[1, 1]] }] }); });
  return { water, air: [] }; }

// ================================================================ 차량 (감속비 gr, 출력 상한 배율 kP)
function car(I, gr, kP, lam) {

  // ---------- 차체 · 타이어 · 에어로 (mm → m, % → 비율)
  const m   = I.m;                          // 차량 질량 [kg]
  const L   = I.L / 1000;                   // 휠베이스 [m]
  const h   = I.h / 1000;                   // 무게중심 높이 [m]
  const fs  = I.fr / 100;                   // 앞 무게 비율 [-]
  const fa  = I.xcop / I.L;                 // 다운포스 앞 몫 [-]  (xcop = 뒤축에서 앞으로 압력중심까지 [mm])
  const hc  = I.hcop / 1000;                // 항력 작용 높이 [m]
  const r   = I.r_eff / 1000;               // 바퀴 유효 반경 [m]
  const tf  = I.tf / 1000, tr = I.tr / 1000; // 앞 · 뒤 윤거 [m]
  const mu  = I.mu;                         // 타이어 μ [-]
  const mus = I.mu_s || 0;                  // μ 하중 감도 [1/kN]
  const fz0 = I.fz0_m !== 0 ? I.tire_fz0 : 0;   // μ 기준 하중 [N]: μ(F_z) = mu − mu_s (F_z − F_z0) ÷ 1000  (fz0_m 0 = 정지 평균 하중 쪽: μ 는 하중 0 의 값)
  const tmap = I.tireMap && I.tireMap.length ? I.tireMap.slice().sort((a, b) => a[0] - b[0]) : null;   // 맵: [[바퀴 하중 N, μ]] (있으면 μ · 감도 대신)
  const nonlin = !!tmap || !!mus;           // μ 가 하중에 따라 바뀜 → 이분법
  const crr = I.crr;                        // 구름 저항 계수 [-]
  const cl  = 0.5 * RHO * I.cla;            // 다운포스 = cl × v² [N]
  const cd  = 0.5 * RHO * I.cda;            // 항력     = cd × v² [N]
  const eta = I.eta_dt / 100;               // 구동계 효율 [-] (상수)
  const etaD = (n, T) => I.effD ? bil(I.effD, n, Math.abs(T)) / 100 : eta;   // 구동계 효율 맵 (모터 회전수 × 모터 토크, 2026-11-11) 또는 상수
  const meff = m + I.j_eq / (r * r);        // 회전부 포함 등가 질량 [kg]  (J ÷ r²)

  // ---------- 축전지
  const Ns    = I.n_s;                                   // 직렬 수
  const Rb    = Math.max(0, I.r_pack) / 1000;            // 팩 저항 [Ω]
  const Imax  = I.i_bms_max;                             // 방전 전류 한계 [A]
  const Pmax  = I.pmax * 1000;                           // 규정 출력 상한 [W]
  const kk    = kP || 1;                                 // 에너지 제한 배율 [-]
  // 셀 표 (도구 4 와 같은 형식, 비우면 아래 직선 · 상수): OCV [V] · 내부저항 [mΩ] = 2차원 표 (열 = 셀 온도 °C, 행 = SOC %, 사이는 이중선형 · 밖은 끝값),
  //   용량 = [[셀 온도 °C, Ah]] (사이는 직선). 팩 개방 전압 = 직렬 수 × OCV(SOC, 온도),
  //   팩 내부저항 = [팩 내부저항] × R(SOC, 온도) ÷ R(50 %, 25 °C)  (표는 모양, 크기는 팩 내부저항 칸 — 도구 4 의 추가 저항까지 같은 배율),
  //   SOC 가 줄어드는 양 = 소비 ÷ (직렬 × 병렬 × 용량(랩 시작 축전지 온도) × 공칭 전압)
  const bO = I.bOcv && Array.isArray(I.bOcv.n) ? I.bOcv : null, bR = I.bRes && Array.isArray(I.bRes.n) ? I.bRes : null, bC = Array.isArray(I.bCap) && I.bCap.length ? I.bCap : null;
  const TB0 = isFinite(I.b_t0) ? I.b_t0 : 25, cl01 = x => Math.max(0, Math.min(1, x)), Tok = Tb => Number.isFinite(Tb) ? Tb : TB0;
  const Voc   = (soc, Tb) => bO ? Ns * bil(bO, Tok(Tb), cl01(soc) * 100) : Ns * (I.c_vmin + (I.c_vmax - I.c_vmin) * cl01(soc));   // 개방 전압 [V]
  const Rref  = bR ? Math.max(1e-9, bil(bR, 25, 50)) : 1;
  const Epack = Ns * I.n_p * I.c_ah * I.c_vnom * 3600;   // 팩 공칭 에너지 [J]  (제원 용량 · 에너지 상한 기준)
  const EpackAt = Tb => bC ? Ns * I.n_p * Math.max(1e-6, tab1(bC, Tok(Tb))) * I.c_vnom * 3600 : Epack;   // SOC 계산용 팩 에너지 [J] (용량 표가 있으면 온도마다)
  const Ecap  = I.e_lim === 0 ? Infinity : I.e_lim === 2 && I.e_target > 0 ? I.e_target * 3.6e6 : Epack;   // 내구에 쓸 수 있는 에너지 [J]  (e_lim 0 = 제한 없음, 1 = 제원 용량 Epack, 2 = 임의 상한 e_target; 2 인데 0 이면 제원 용량)

  // 단자 출력 P [W] 를 낼 때 전류 [A] · 단자 전압 [V]  (P = (V0 − I·R)·I 의 작은 근)
  //   rs = 내부저항 배율 (열 모델 2: 축전지 온도에 따라, 그 밖에는 1)
  function term(P, V0, rs = 1) {
    const Rx = Rb * rs;
    if (P <= 0) return { I: 0, V: V0 };
    if (Rx <= 0) return { I: P / V0, V: V0 };
    const D = V0 * V0 - 4 * Rx * P;
    if (D < 0) return null;
    const i = (V0 - Math.sqrt(D)) / (2 * Rx);
    return { I: i, V: V0 - i * Rx };
  }
  // 단자 출력 상한 [W] = 배율 × min(규정 상한, 전류 한계 때 출력)
  function ptMax(V0) {
    const iI = Math.min(Imax, Rb > 0 ? V0 / (2 * Rb) : Infinity);
    return kk * Math.min(Pmax, (V0 - iI * Rb) * iI);
  }

  // ---------- 모터
  const tq   = (I.motor || []).slice().sort((a, b) => a[0] - b[0]);   // 최대 토크 곡선 [[rpm, N·m]]
  const tqC  = (I.motorC || []).slice().sort((a, b) => a[0] - b[0]);  // 연속 토크 곡선 [[rpm, N·m]] (디레이팅 끝 온도에서 이 곡선)
  const ke   = I.ke_ratio > 0 ? I.ke_ratio : 1;                       // 유도 전압 비 (팀 모터 ÷ 표 모터)
  const nmax = I.nmax;                                                // 최대 회전수 [rpm]

  // 표 하나에서 단자 전압 V · 회전수 n 의 토크 [N·m]  (회전수 축을 전압비로 늘이고 줄임, 곡선 끝 너머는 출력 일정)
  const fromTab = (t, n, V) => {
    const sf = (V / I.v_ref) / ke, nt = n / sf, z = t[t.length - 1];
    return nt <= z[0] ? tab1(t, nt) : z[1] * z[0] / nt;
  };

  // ---------- 모터 열 · 디레이팅 (아래 '디레이팅' 참고)
  // 열 모델 켜기: 모터 열 · 인버터 온도 · 축전지 온도 · 냉각수 온도.
  // 수랭 방식 cw_mode: 0 = 부품별 독립 회로 (수랭 부품마다 자기 냉각수 · 라디, 냉각 방식은 m_cool · i_cool · b_cool),
  //                    1 = 냉각 회로 (I.cw9 = 도구 2P 자체 배치, 도구 9 와 같은 형식: 수랭 회로 여러 개 · 직렬 · 병렬 갈라짐 · 합침 · 라디 여러 개 · 공랭 덕트. 부품 위치도 도구 9 가 정함)
  //   부품별 독립 (cw_mode 0) 도 같은 점 모델: 수랭 부품마다 [라디 → 펌프 → 부품] 회로를 만듦 (coolIndep, 2026-11-10 통일)
  const NET = coolPrep(I.cw_mode === 1 && I.cw9 && Array.isArray(I.cw9.water) ? I.cw9 : coolIndep(I));   // 갈래 몫 (호스 압력 강하) · 라디 표 → UA · 공랭 덕트 점 꼴로
  const where = {};   // 부품 → {w 회로, k 점} · {a 덕트, j 순서}, 없으면 외기
  NET.water.forEach((Cc, w) => Cc.nodes.forEach((nd, k) => { if (nd.part) where[nd.part] = { w, k }; }));
  (NET.air || []).forEach((D, a) => D.nodes.forEach((n, j) => { if (!where[n.part]) where[n.part] = { a, j }; }));
  const inW = p => !!(where[p] && where[p].w != null);
  const mW = inW('m'), iW = inW('i'), bW = inW('b');
  const thOn = I.th_on !== 0, inOn = I.in_on === 1, btOn = I.bt_on === 1;
  const cwOn = I.cw_on === 1 && ((thOn && mW) || iW || (btOn && bW));   // 냉각수 온도: 켰고 수랭으로 열을 넣는 부품이 있을 때만 (아니면 고정값)
  // ---------- 디레이팅 (회전수마다 피크 ~ 연속 사이를 같은 비율 r 로)
  //   모터: r_m = (T_m − 시작) ÷ (끝 − 시작) 을 0 ~ 1 로 → T(n) = T_피크(n) − r_m (T_피크(n) − T_연속(n))   (모터 열을 켰을 때만, 끝 온도 위로는 연속 그대로)
  //   표에 연속 열이 없으면 T_연속 = T_피크 × 연속 비율, 피크 열이 없으면 T_피크 = T_연속 ÷ 연속 비율 (비율 100 % = 디레이팅 없음)
  //   인버터: 상전류 상한 I_lim = I_피크 − r_i (I_피크 − I_연속), r_i = (인버터 온도 − 시작) ÷ (끝 − 시작) (인버터 온도를 켰을 때만, 모터와 같은 방식) → 토크 ≤ K_t × I_lim (늘 적용)
  //   연속 상전류: ict_m 1 = 입력값, 0 = 피크 × 비율 i_cpct (모터 표에 연속 열이 없을 때 피크 × c_pct 와 같은 방식)
  const cpct = Math.max(1e-3, Math.min(1, (Number.isFinite(I.c_pct) ? I.c_pct : 100) / 100));     // 연속 비율 [-]
  const dr0 = I.dr_t0, dr1 = I.dr_t1, drM = thOn && dr1 > dr0;                                       // 모터 디레이팅 시작 · 끝 온도 [°C]
  const kt = I.kt, ipk = I.i_pk, invLim = true;                                                         // 토크 상수 [N·m/A] · 인버터 피크 상전류 [A] (calc 입구에서 > 0 확인)
  const ict = I.ict_m !== 0 ? Math.max(0, Math.min(I.i_ct, ipk)) : ipk * Math.max(0, Math.min(1, (Number.isFinite(I.i_cpct) ? I.i_cpct : 100) / 100));   // 인버터 연속 상전류 [A]
  const di0 = I.di_t0, di1 = I.di_t1;
  const r01 = x => Math.max(0, Math.min(1, x));
  /* 디레이팅 표 (2026-11-11): I.derM · I.derI = {t:[°C], r:[%]} (0 % = 피크 그대로 · 100 % = 연속까지), 표 사이 직선, 끝 밖은 끝 값. 없으면 시작 · 끝 온도 사이 직선 */
  const dTab = (D, x) => { const t = D.t, rr = D.r; if (x <= t[0]) return rr[0] / 100; if (x >= t[t.length - 1]) return rr[rr.length - 1] / 100; let i = 1; while (t[i] < x) i++; return (rr[i - 1] + (rr[i] - rr[i - 1]) * (x - t[i - 1]) / (t[i] - t[i - 1])) / 100; };
  const rM = Tm => !(thOn && Number.isFinite(Tm)) ? 0 : I.derM ? r01(dTab(I.derM, Tm)) : drM ? r01((Tm - dr0) / (dr1 - dr0)) : 0;
  const rI = Ti => !(inOn && ict < ipk && Number.isFinite(Ti)) ? 0 : I.derI ? r01(dTab(I.derI, Ti)) : di1 > di0 ? r01((Ti - di0) / (di1 - di0)) : 0;   // 인버터 온도 Ti [°C] (인버터 온도 끔 = 디레이팅 없음)   // 인버터 온도 Ti [°C] (인버터 온도 끔 = 디레이팅 없음)
  const drOn = (thOn && (drM || !!I.derM)) || (inOn && ict < ipk && (di1 > di0 || !!I.derI));                                              // 온도에 따라 토크 한계가 바뀜 → 온도를 반영해 한 번 더 셈
  const thC  = Math.max(1, I.th_c);                   // 열용량 [J/K]
  const thR  = Math.max(1e-9, I.th_r);                // 냉각까지 열저항 [K/W]
  const thCo = I.th_cool;                             // 냉각수 온도 [°C]
  // ---------- 열 모델 (켜고 끔 · 부품마다 공랭 / 수랭)
  //   모터    : C_m dT_m/dt = 모터 손실 − 냉각.  수랭 (T_m − T_w) ÷ R_m,  공랭 hA_m(v) (T_m − T_외기).  끄면 출발 온도 그대로 · 디레이팅 없음
  //   인버터  : C_i dT_i/dt = 인버터 손실 − 냉각.  수랭 (T_i − T_w) ÷ R_i,  공랭 hA_i(v) (T_i − T_외기).  끄면 온도는 안 셈 (수랭이면 손실을 냉각수에 바로)
  //   축전지  : C_b dT_b/dt = I² R(T_b) − 냉각.  공랭 hA_b(v) (T_b − T_외기),  수랭 (T_b − T_w) ÷ R_b.  R(T) = R_25 (1 + α (25 − T)) (0.3 R_25 아래로는 안 감)
  //   냉각수 · 부품별 독립 (cw_mode 0): 수랭 부품마다 자기 [라디 → 펌프 → 부품] 회로 (coolIndep) 를 아래 냉각 회로와 같은 식으로
  //   냉각수 · 냉각 회로 (cw_mode 1): 도구 9 와 같은 점 모델 — 점 k (잘 섞인 덩어리, 열용량 C_k): C_k dT_k/dt = q_k C_c (T_섞임 − T_k) + (T_부품 − T_k) ÷ R,
  //     라디 점: C_k dT_k/dt = q_k C_c (T_섞임 − T_k) − ε C_min (T_섞임 − T_외기) (교차류 ε-NTU, 공기 = 주행풍 A k_d v + 팬), 공랭 덕트는 흐름 순서대로 공기가 데워짐 (갈래 · 합침, coolAir).
//     갈래 유량 몫은 호스 안지름 · 길이와 블럭 압력 강하로 (coolHydSolve).
  //     점 · 부품을 흐름 순서대로 0.25 s 이하 작은 칸으로 나눠 지수 적분 (도구 9 와 같은 방식). 끄면 냉각수 온도 고정
  //   방열 능력은 모두 h(v) = h_0 + (h_60 − h_0) × v ÷ 60 km/h (정지 값 · 60 km/h 값, 선형; 팬이면 정지 값을 크게, 주행풍이면 60 km/h 값을 크게)
  //   칸마다 지수 적분 (그 칸 동안 다른 노드 온도 · 손실은 고정) → dt 가 커도 안정
  //   st.w = 가장 뜨거운 냉각수 온도 (신호 · 결과용), st.x = 냉각수 상태 (독립: [모터 · 인버터 · 축전지 회로], 도구 9: 회로마다 점 온도)
  const Tamb = isFinite(I.t_amb) ? I.t_amb : 25;                         // 외기 온도 [°C]
  const Cb   = Math.max(1, I.b_c || 1), alp = I.b_alpha || 0, Rbt = Math.max(1e-9, I.b_r || 0.05);         // 축전지 열용량 [J/K] · 저항 온도 계수 [1/°C] · 수랭 열저항 [K/W]
  const Ci   = Math.max(1, I.i_c || 1), Ri = Math.max(1e-9, I.i_r || 0.05);                                   // 인버터 열용량 [J/K] · 수랭 열저항 [K/W]
  const hV   = (h0, h60, v) => Math.max(0, (h0 || 0) + ((Number.isFinite(h60) ? h60 : (h0 || 0)) - (h0 || 0)) * v / (60 / 3.6));   // 방열 능력 [W/K] (60 km/h 값이 없으면 일정)
  const rS   = (Tb, soc) => bR ? Math.max(0.05, bil(bR, Tok(Tb), cl01(soc == null ? 1 : soc) * 100) / Rref) : btOn ? Math.max(0.3, 1 + alp * (25 - Tb)) : 1;  // 내부저항 배율 (셀 표가 있으면 표, 없으면 온도 계수)
  const toward = (T, Teq, k, dt) => Teq + (T - Teq) * Math.exp(-k * dt);   // dT/dt = k (Teq − T) 의 해
  const air = (T, Q, h, C, dt) => h > 0 ? toward(T, Tamb + Q / h, h / C, dt) : T + Q * dt / C;          // 외기로 식는 노드
  const PJ = ['m', 'i', 'b'], PR = { m: thR, i: Ri, b: Rbt }, PC = { m: thC, i: Ci, b: Cb }, PON = { m: thOn, i: inOn, b: btOn };
  const PH = { m: v => hV(I.m_ha0, I.m_ha60, v), i: v => hV(I.i_ha0, I.i_ha60, v), b: v => hV(I.b_ha, I.b_ha60, v) };
  const RHOA = COOL_RA, CPA = COOL_CA;
  const mixOf = (nd, c, k, N) => { const ins = nd.ins || [[(k - 1 + N) % N, 1]]; let fs = 0, ft = 0; ins.forEach(([j, f]) => { fs += f; ft += f * c[j]; }); return fs > 0 ? ft / fs : c[k]; };
  const X0 = NET.water.map(Cc => Cc.nodes.map(() => I.th_cool)); X0.fan = NET.water.map(Cc => Cc.nodes.map(coolFanOn0));   // 냉각수 점 온도 · 라디 팬 상태
  function thStep(st, Lm, Li, Ib, v, dt, soc) {
    const Qb = Ib * Ib * Rb * rS(st.b, soc), L = { m: Lm, i: Li, b: Qb }, x = st.x || X0;
    // 냉각 회로
    const T = { m: st.m, i: st.i, b: st.b }, c = x.map(a => a.slice()), n = Math.max(1, Math.ceil(dt / 0.25)), h = dt / n;
    const fan = (x.fan || X0.fan).map(a => a.slice()), aC = {}, aK = (w, k) => { const on = fan[w][k], key = w + ':' + k + ':' + on; return key in aC ? aC[key] : (aC[key] = coolRadA(NET.water[w], NET.water[w].nodes[k], v, on)); };
    for (let s = 0; s < n; s++) {
      if (cwOn) NET.water.forEach((Cc, w) => { const N = Cc.nodes.length;
        for (let k = 0; k < N; k++) { const nd = Cc.nodes[k], mix = mixOf(nd, c[w], k, N), F = (nd.q || 1) * Cc.Cc, Cn = coolC(nd);
          if (nd.t === 'rad') { fan[w][k] = coolFanNext(nd, fan[w][k], mix); c[w][k] = toward(c[w][k], mix - aK(w, k) * (mix - Tamb), F / Cn, h); continue; }
          const p = nd.part;
          if (p && PON[p]) { const G = 1 / PR[p]; c[w][k] = toward(c[w][k], (F * mix + G * T[p]) / (F + G), (F + G) / Cn, h); }
          else if (p === 'i' && F > 0) c[w][k] = toward(c[w][k], mix + Li / F, F / Cn, h);   // 인버터 온도 끔: 손실을 냉각수에 바로
          else if (F > 0) c[w][k] = toward(c[w][k], mix, F / Cn, h); } });
      for (const p of PJ) { if (!PON[p]) continue; const wh = where[p];
        if (wh && wh.w != null) T[p] = toward(T[p], (cwOn ? c[wh.w][wh.k] : thCo) + L[p] * PR[p], 1 / (PR[p] * PC[p]), h);
        else if (!wh) T[p] = air(T[p], L[p], PH[p](v), PC[p], h); }
      (NET.air || []).forEach(D => coolAir(D, RHOA * CPA * Math.max(0, D.A * D.kd * v + D.fan), Tamb, T, L, p => PH[p](v), false, h, PC, PON, toward)); }   // 공랭 덕트 (갈래 · 합침, 앞 부품이 데운 공기)
    const w = cwOn && c.length ? Math.max(...c.map(a => Math.max(...a))) : thCo; c.fan = fan;
    return { m: T.m, i: T.i, w, b: T.b, x: c };
  }
  const tmNext = (Tm, Ploss, dt) => thStep({ m: Tm, i: Tm, w: thCo, b: 25, x: X0 }, Ploss, 0, 0, 0, dt).m;   // 예전 이름 (모터만)

  // 단자 전압 V 에서 회전수 n 의 피크 · 연속 토크 [N·m]  (표가 둘 다 없으면 모터 최대 토크 일정 — 검증용, 화면에서는 표가 꼭 있음)
  if (I.motorReq === 1 && !tq.length && !tqC.length) throw new Error('모터 토크 표가 비어 있습니다. 편집 › 모터에서 피크 또는 연속 토크를 넣으세요.');
  const Tpk = (n, V) => tq.length ? fromTab(tq, n, V) : tqC.length ? fromTab(tqC, n, V) / cpct : I.tmax;
  const Tct = (n, V) => tqC.length ? Math.min(fromTab(tqC, n, V), Tpk(n, V)) : Tpk(n, V) * cpct;
  // 디레이팅 비율 rm (모터) · ri (인버터) 에서 최대 토크
  function TcR(n, V, rm, ri) {
    if (n > nmax) return 0;
    const P = Tpk(n, V); let T = rm > 0 ? P - rm * (P - Tct(n, V)) : P;
    if (invLim) T = Math.min(T, kt * (ipk - ri * (ipk - ict)));
    return T;
  }
  // 단자 전압 V · 모터 온도 Tm · 인버터 온도 Ti 에서 회전수 n 의 최대 토크 [N·m]
  const Tcurve = (n, V, Tm, Ti) => TcR(n, V, rM(Tm), rI(Ti));
  const eM  = (n, T) => (I.effM ? bil(I.effM, n, Math.abs(T)) : I.eta_mot) / 100;   // 모터 효율 [-]
  const effMg = I.eff_mg === 1, rInv = Math.max(0, Math.min(1, (isFinite(I.inv_r) ? I.inv_r : 30) / 100));   // 모터 맵에 인버터를 합쳤으면 인버터 효율 = 1, 손실 중 인버터 몫 rInv
  const eI  = (n, T) => effMg ? 1 : (I.effI ? bil(I.effI, n, Math.abs(T)) : I.eta_inv) / 100;   // 인버터 효율 [-]
  const rpm = v => v / r * gr * 60 / (2 * Math.PI);                                  // 차속 [m/s] → 모터 [rpm]
  const vtop = nmax / gr * 2 * Math.PI / 60 * r * (1 - 1e-9);                        // 회전수 한계 최고속 [m/s]

  // ---------- 바퀴 구동력 [N]: 모터 곡선과 (단자 출력 상한 × 효율) 중 작은 쪽. 단자 전압이 전류로 떨어지므로 3번 되풀이
  const DM = new Map();   // 기억: 차속 0.01 m/s · 전압 0.1 V · 모터 온도 0.5 °C 단위 (디레이팅이 없으면 온도 무시)
  function drive(v, V0, Tm, Ti) {
    const qm = Math.round(rM(Tm) * 400), qi = Math.round(rI(Ti) * 400);              // 비율을 1/400 단위로 묶어 기억
    const key = ((Math.round(v * 100) * 65536 + Math.round(V0 * 10)) * 401 + qm) * 401 + qi;
    let o = DM.get(key);
    if (!o) { o = drive_(v, V0, qm / 400, qi / 400); DM.set(key, o); }
    return o;
  }
  function drive_(v, V0, rm, ri) {
    const n = rpm(v), w = n * 2 * Math.PI / 60, Pt = ptMax(V0);
    let V = V0, T = TcR(n, V0, rm, ri);
    for (let it = 0; it < 3; it++) {
      const e = eM(n, T) * eI(n, T);
      T = TcR(n, V, rm, ri);
      if (w > 0) T = Math.min(T, Pt * e / w);
      const tr_ = term(T * w / e, V0);
      V = tr_ ? tr_.V : V0 / 2;
    }
    return { T, F: T * gr * etaD(n, T) / r, V };
  }

  // ---------- 저항 · 하중 [N]
  const Fres = v => cd * v * v + crr * (m * g + cl * v * v);                       // 항력 + 구름 저항 (무게 + 다운포스)
  const Fzf  = (v, ax) => m * g * fs + cl * v * v * fa - m * ax * h / L - cd * v * v * hc / L;           // 앞축 하중
  const Fzr  = (v, ax) => m * g * (1 - fs) + cl * v * v * (1 - fa) + m * ax * h / L + cd * v * v * hc / L; // 뒤축 하중
  // 좌우 하중 이동 (바퀴 하나) [N]
  //   모델 단계 0: 무게중심 높이 전체를 횡하중 이동 배분(앞 몫)으로 나눔
  //   모델 단계 1 이상: 롤센터 높이로 나눔 (Milliken & Milliken 18장) — 기하 몫 = 축 질량 × ay × 롤센터 높이 ÷ 윤거,
  //               탄성 몫 = m × ay × (무게중심 − 롤축 높이) × 롤강성 앞 몫(rsd, 도구 7) ÷ 윤거.  롤센터가 0 이고 rsd = lltd 면 단계 0 과 같음
  const md   = I.md >= 1 ? 1 : 0;                                                    // 모델 단계 (롤센터 · 롤 켬)
  const rsd  = Number.isFinite(I.rsd) ? I.rsd / 100 : fs;                            // 롤강성 앞 몫 [-] (없으면 무게 배분)
  const hrf  = md ? (I.h_rcf || 0) / 1000 : 0, hrr = md ? (I.h_rcr || 0) / 1000 : 0;  // 롤센터 높이 앞 · 뒤 [m]
  const hra  = hrf + (hrr - hrf) * (1 - fs);                                           // 무게중심 자리 롤축 높이 [m]  (앞축에서 L(1 − fs))
  const le   = md ? rsd : fs;                                                          // 탄성 몫 앞 비율 (단계 0 = 롤 정보 없음 → 무게 배분, 기하 몫과 합쳐 앞 몫 = 무게 배분)
  const dF   = (ay, front) => front ? (m * fs * ay * hrf + le * m * ay * (h - hra)) / tf
                                    : (m * (1 - fs) * ay * hrr + (1 - le) * m * ay * (h - hra)) / tr;
  const kRoll = Math.max(1e-9, I.k_roll || 0);                                         // 롤강성 합 [N·m/°]
  const rollAng = ay => md ? m * ay * (h - hra) / kRoll : NaN;                         // 롤각 [°] (스프링 위 · 아래 질량 구분 없음)
  const wheels = (Fz, d) => {                                                       // 축 하중 → [바깥, 안쪽] 바퀴
    let o = Fz / 2 + d, i = Fz / 2 - d;
    if (i < 0) { o = Fz; i = 0; }
    return [Math.max(0, o), i];
  };
  const muZ = z => Math.max(0, tmap ? tab1(tmap, z) : mu - mus * (z - fz0) / 1000);   // 바퀴 하중 z [N] 의 μ
  const cap = (Fz, d) => {                                                          // 축이 낼 수 있는 힘 Σ μ·Fz
    if (!nonlin) return mu * Math.max(0, Fz);
    const [o, i] = wheels(Fz, d), f = z => muZ(z) * z;
    return f(o) + f(i);
  };
  // 현실 운전자 그립 사용률 (가속 · 이상 운전자 = 1). 곡률별 코너 한계 속도 기억은 배율마다 따로 (같은 계산 안에서 종목마다 배율이 다름)
  const kG = I.dr_real === 1 && !I.__acc ? Math.max(0.05, I.dr_ks > 0 ? I.dr_ks : 1) * (I.__end ? Math.max(0.05, I.dr_ke > 0 ? I.dr_ke : 1) : 1) : 1;
  const vcOf = M => { if (!M) return null; const q = 'g' + kG; if (!M.has(q)) M.set(q, new Map()); return M.get(q); };
  const VCk = vcOf(VC), VCFk = vcOf(VCF);
  const capF = (v, ax, ay) => kG * cap(Fzf(v, ax), dF(ay, true));     // 축 종 방향 한계 Σ μ·F_z (바퀴마다 최고)
  const capR = (v, ax, ay) => kG * cap(Fzr(v, ax), dF(ay, false));
  const capFy = (v, ax, ay) => kG * capY(Fzf(v, ax), dF(ay, true));   // 축 횡 방향 한계 (모델 2 이상: 같은 슬립각 최댓값, 아니면 capF 와 같음)
  const capRy = (v, ax, ay) => kG * capY(Fzr(v, ax), dF(ay, false));

  // ---------- 코너 한계 속도 [m/s] (곡률 k [1/m])
  function vCorner(k) {
    k = Math.abs(k);
    if (k < 1e-9) return Infinity;
    if (VCk && VCk.has(k)) return VCk.get(k);
    let v;
    if (!nonlin && !md2) {            // μ 일정: 앞 · 뒤 축 각각 닫힌 식
      let v2 = Infinity;
      const cf = m * k * fs - (mu * kG) * (cl * fa - cd * hc / L);
      const cr = m * k * (1 - fs) - (mu * kG) * (cl * (1 - fa) + cd * hc / L);
      if (fs > 0 && cf > 0) v2 = Math.min(v2, (mu * kG) * m * g * fs / cf);
      if (fs < 1 && cr > 0) v2 = Math.min(v2, (mu * kG) * m * g * (1 - fs) / cr);
      v = Math.sqrt(v2);
    } else {                          // 하중 감도 · 맵: 이분법
      const ok = u => {
        const ay = u * u * k;
        return m * ay * fs <= capFy(u, 0, ay) + 1e-9 && m * ay * (1 - fs) <= capRy(u, 0, ay) + 1e-9;
      };
      let lo = 0, hi = 150;
      if (ok(hi)) v = Infinity;
      else {
        for (let i = 0; i < 50; i++) { const md = (lo + hi) / 2; if (ok(md)) lo = md; else hi = md; }
        v = lo;
      }
    }
    // 모델 2: 조향 한계 — 아주 느려도 안쪽 바퀴 조향각이 최대를 넘으면 돌 수 없음 (steerCheck 가 계산을 멈춤), 속도를 낮춰 들어가면 그 속도가 상한
    let fl = 0;
    if (md2 && dmx > 0) {
      if (dIn0(k) > dmx + 1e-6) { v = 0.5; fl = 2; }
      else if (dReq(Math.min(v, 150), k) > dmx) {
        let lo = 0, hi = Math.min(v, 150);
        for (let i = 0; i < 28; i++) { const u = (lo + hi) / 2; if (dReq(u, k) <= dmx) lo = u; else hi = u; }
        v = lo; fl = 1;
      }
    }
    if (VCk) { VCk.set(k, v); VCFk.set(k, fl); }
    return v;
  }
  // ---------- 모델 3: 주행선 곡률 변화로 생기는 과도 횡력을 축마다 '등가 곡률' 로 (일정 차속 역동역학)
  //   앞: κ_f = κ + [I_z κ' + σ (m l_r κ' + I_z κ'')] ÷ (m l_r),  뒤: κ_r = κ + [−I_z κ' + σ (m l_f κ' − I_z κ'')] ÷ (m l_f)   (κ' = dκ/ds, ' 는 곡률을 다듬기 거리로 고른 값)
  //   코너 한계 속도 = 앞 m v² κ_f l_r ÷ L ≤ 앞 횡 한계, 뒤 m v² κ_r l_f ÷ L ≤ 뒤 횡 한계 (하중 이동은 실제 κ) 와 모델 2 한계 중 작은 값.  속도 변화로 생기는 몫은 trCaps 가 따로
  const md3 = I.md === 3, IzT = md3 ? Math.max(0, Number.isFinite(I.izz) ? I.izz : 70) : 0, sgT = md3 ? Math.max(0, I.tire_relax || 0) : 0, ltR = L * fs, ltF = L * (1 - fs);
  const ksT = I.tr_ks > 0 ? I.tr_ks : 2;
  const kEff = (k, k1, k2) => [k + (IzT * k1 + sgT * (m * ltR * k1 + IzT * k2)) / (m * ltR), k + (-IzT * k1 + sgT * (m * ltF * k1 - IzT * k2)) / (m * ltF)];
  const V3 = new Map();
  function vCorner3(k, k1, k2) {
    const vs = vCorner(k); if (!md3 || (!k1 && !k2)) return vs;
    const [kf0, kr0] = kEff(k, k1, k2), ka = Math.abs(k), kf = Math.abs(kf0), kr = Math.abs(kr0);
    if (kf <= ka * (1 + 1e-9) && kr <= ka * (1 + 1e-9)) return vs;
    const key = \`\${k.toPrecision(9)}|\${k1.toPrecision(7)}|\${k2.toPrecision(7)}\`; if (V3.has(key)) return V3.get(key);
    const ok = u => { const ay = u * u * ka; return m * u * u * kf * ltR / L <= capFy(u, 0, ay) + 1e-9 && m * u * u * kr * ltF / L <= capRy(u, 0, ay) + 1e-9; };
    let lo = 0, hi = Math.min(isFinite(vs) ? vs : 150, 150), v;
    if (ok(hi)) v = isFinite(vs) ? vs : hi; else { for (let i = 0; i < 40; i++) { const u = (lo + hi) / 2; if (ok(u)) lo = u; else hi = u; } v = lo; }
    V3.set(key, v); return v;
  }
  const vFlag = k => { k = Math.abs(k); if (k < 1e-9) return 0; if (!(VCFk && VCFk.has(k))) vCorner(k); return VCFk && VCFk.has(k) ? VCFk.get(k) : 0; };   // 0 없음 · 1 조향 한계로 느려짐 · 2 돌 수 없음

  // ---------- 가속 [m/s²]: 뒤축 마찰원 · 모터 힘, 앞축 횡력이 모자라면 줄임
  function aDrive(v, k, a0, V0, Tm, Ti) {
    const ay = v * v * Math.abs(k), Fyr = m * ay * (1 - fs), Fyf = m * ay * fs, Fm = drive(v, V0, Tm, Ti).F;
    let ax = a0 || 0;
    for (let it = 0; it < 4; it++) {
      const N = capR(v, ax, ay), Ny = capRy(v, ax, ay), Fx = Ny > 0 ? N * Math.sqrt(Math.max(0, 1 - (Fyr / Ny) ** 2)) : 0;   // 마찰 타원: 종 N (바퀴마다 최고), 횡 Ny (모델 2: 같은 슬립각)
      ax = (Math.min(Fm, Fx) - Fres(v)) / meff;
    }
    if (Fyf > 0 && h > 0 && capFy(v, ax, ay) < Fyf) {
      let lo = -3 * g, hi = ax;
      if (capFy(v, lo, ay) >= Fyf) {
        for (let i = 0; i < 40; i++) { const md = (lo + hi) / 2; if (capFy(v, md, ay) >= Fyf) lo = md; else hi = md; }
        ax = lo;
      }
    }
    return ax;
  }

  // ---------- 감속 [m/s²]: 네 바퀴 마찰원 (이상 배분)
  function aBrake(v, k) {
    const ay = v * v * Math.abs(k);
    let d = 0;
    for (let it = 0; it < 3; it++) {
      const N = capF(v, -d, ay) + capR(v, -d, ay), Ny = capFy(v, -d, ay) + capRy(v, -d, ay), Fx = Ny > 0 ? N * Math.sqrt(Math.max(0, 1 - (m * ay / Ny) ** 2)) : 0;
      d = (Fx + Fres(v)) / meff;
    }
    return d;
  }

  // ---------- 회생 제동 (rg_on): 제동 힘 중 뒤축 몫(이상 배분 = 뒤축 하중 비) 을 모터가 받음.  모터 축 토크 ≤ min(회생 토크 상한, 그 회전수의 최대 토크 곡선 · 인버터 한계)
  //   전기 = 축 출력 × 모터 효율 × 인버터 효율 (같은 맵), 충전 전류 ≤ i_chg → 단자 출력 ≤ (V0 + i_chg R) i_chg.  나머지 제동은 마찰 브레이크.  저속 회생 차단 · 회생 토크 곡선은 없음 (도구 2P 수준)
  const rgOn = I.rg_on === 1, rgT = Math.max(0, I.rg_tmax || 0), Ich = Math.max(0, I.i_chg || 0);
  function regen(F, v, V0, rs, ax, Tm, Ti) {
    const n = rpm(v), w = n * 2 * Math.PI / 60; if (!(w > 0) || n > nmax) return null;
    const zf = Fzf(v, ax), zr = Fzr(v, ax), sr = zf + zr > 0 ? Math.max(0, zr) / (zf + zr) : 0;   // 뒤축 제동 몫
    const T0r = -F * sr * r / gr, Tneed = T0r * etaD(n, T0r);                                      // 바퀴 → 모터 축 (구동계 효율만큼 덜 옴, 맵이면 그 점 효율)
    let T = Math.min(Tneed, rgT, TcR(n, V0, rM(Tm), rI(Ti)));
    const e = (I.effM ? bil(I.effM, n, T) : I.eta_mot) / 100 * (effMg ? 1 : (I.effI ? bil(I.effI, n, T) : I.eta_inv) / 100), Rx = Rb * rs;
    const Pch = (V0 + Ich * Rx) * Ich; if (T * w * e > Pch) T = Pch / (w * e);                    // 충전 전류 한계
    if (!(T > 0)) return null;
    const P = -T * w * e, i = Rx > 0 ? (V0 - Math.sqrt(V0 * V0 - 4 * Rx * P)) / (2 * Rx) : P / V0;   // P = (V0 − iR) i, i < 0
    const em = I.effM ? bil(I.effM, n, T) / 100 : I.eta_mot / 100;
    return { T: -T, e, P, I: i, V: V0 - i * Rx, L: effMg ? (1 - rInv) * T * w * (1 - e) : T * w * (1 - em), Li: effMg ? rInv * T * w * (1 - e) : T * w * em - (-P), Fw: T * gr / (r * etaD(n, T)) };
  }
  // ---------- 한 칸의 전기: 바퀴 힘 F [N] → 모터 토크 [N·m] · 효율 · 단자 출력 [W] · 전류 [A] · 단자 전압 [V] · 모터 손실 [W]  (ax · Tm · Ti 는 회생 몫 계산에만)
  function elec(F, v, V0, rs = 1, ax = 0, Tm, Ti) {
    if (F <= 0) { const G = rgOn && F < 0 ? regen(F, v, V0, rs, ax, Tm, Ti) : null; return G || { T: 0, e: 1, P: 0, I: 0, V: V0, L: 0, Li: 0 }; }
    const n = rpm(v), w = n * 2 * Math.PI / 60, T0 = F * r / gr, T = T0 / etaD(n, T0 / etaD(n, T0)), em = eM(n, T), e = effMg ? em : em * eI(n, T), P = T * w / e;
    const tr_ = term(P, V0, rs) || { I: Math.min(Imax, V0 / (2 * Math.max(Rb * rs, 1e-9))), V: V0 / 2 };
    if (effMg) { const tot = P - T * w; return { T, e, P, I: tr_.I, V: tr_.V, L: (1 - rInv) * tot, Li: rInv * tot }; }   // 합친 맵: 합친 손실을 비율로 나눔
    return { T, e, P, I: tr_.I, V: tr_.V, L: T * w * (1 / em - 1),       // 모터 손실 = 축 출력 × (1 ÷ 모터 효율 − 1)
             Li: P - T * w / em };                                       // 인버터 손실 = 단자 출력 − 모터 입력
  }

  // ---------- 차량 모델 2: 비선형 타이어 (도구 T 의 Magic Formula 꼴, 바퀴 하나) — 정상 선회 슬립각 · 차체 각도 β · 조향각 (기록은 위 μ 한계 그대로)
  //   F_y(α) = D sin(C atan(Bα − E(Bα − atan Bα))),  D = μ(F_z) F_z (위 muZ 와 같음),  BCD = C_α(F_z) = C_α0 (F_z ÷ F_zr)^n
  //   축 횡력 (요 모멘트 평형) 앞 = m ay × 앞 무게 몫, 뒤 = 나머지 → 두 바퀴 같은 슬립각으로 이 힘이 되는 α (이분법, 최대를 넘으면 최대 자리 = 포화)
  //   β = l_r ÷ R − α_r,  바퀴 조향각 δ = L ÷ R + α_f − α_r (Milliken 5 장, 작은 각),  핸들 각 = δ × 조향비
  const md2 = I.md >= 2, Dg = Math.PI / 180;
  const fzr = I.fz0_m !== 0 ? I.tire_fz0 : m * g / 4;                                // 코너링 강성 기준 하중 [N] (fz0_m 0 = 정지 평균 하중)
  const tC = I.tire_c > 0 ? I.tire_c : 1.3, tE = Number.isFinite(I.tire_e) ? Math.min(1, I.tire_e) : 0, ca0 = (I.tire_ca0 > 0 ? I.tire_ca0 : 450) / Dg, cn = Number.isFinite(I.tire_cn) ? I.tire_cn : 0.8;
  const Ca = z => ca0 * Math.pow(Math.max(0, z) / fzr, cn);                           // [N/rad]
  const FyT = (aDeg, z) => { if (z <= 0) return 0; const D = muZ(z) * z; if (D <= 0) return 0; const B = Ca(z) / (tC * D), x = B * aDeg * Dg; return D * Math.sin(tC * Math.atan(x - tE * (x - Math.atan(x)))); };
  function slipA(zo, zi, Fy) {                                                        // 두 바퀴 하중 → 축 횡력 Fy 가 되는 슬립각 [deg], 포화 여부
    const G = a => FyT(a, zo) + FyT(a, zi); let ap = 0, gp = 0;
    for (let a = 0.25; a <= 40; a += 0.25) { const v = G(a); if (v > gp) { gp = v; ap = a; } else if (v < gp * 0.999) break; }
    let lo = Math.max(0, ap - 0.25), hi = ap + 0.25; for (let i = 0; i < 40; i++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (G(m1) < G(m2)) lo = m1; else hi = m2; }
    ap = (lo + hi) / 2; gp = G(ap);
    if (Fy >= gp) return { a: ap, sat: Fy > gp * 1.0005 };
    lo = 0; hi = ap; for (let i = 0; i < 50; i++) { const md_ = (lo + hi) / 2; if (G(md_) < Fy) lo = md_; else hi = md_; }
    return { a: (lo + hi) / 2, sat: false }; }
  const kUs = (m * g * fs / (2 * Ca(m * g * fs / 2)) - m * g * (1 - fs) / (2 * Ca(m * g * (1 - fs) / 2))) / Dg;   // 선형 언더스티어 구배 [deg/g] (정지 하중 코너링 강성)
  // ---------- 모델 2: 축 횡력 한계 = 두 바퀴가 같은 슬립각일 때 F_y(α, 바깥) + F_y(α, 안쪽) 의 최댓값 (바퀴마다 최고점 슬립각이 하중에 따라 달라 Σ μ·F_z 보다 작음)
  //   바퀴 하나 최고점: C atan(Bα − E(Bα − atan Bα)) = π/2 → x − E(x − atan x) = tan(π ÷ 2C), α = x ÷ B.  두 최고점 사이를 훑고 황금분할
  //   한계 비율 ρ = 축 최댓값 ÷ Σ μ·F_z 를 (축 하중, 안쪽 몫) 격자에 미리 구해 쌍선형 보간 (종 방향 한계는 바퀴마다 최고 그대로 → 마찰 타원)
  const pkX = (() => { if (!(tC > 1)) return Infinity; const t = Math.tan(Math.PI / (2 * tC)); let lo = 0, hi = 1e4;
    for (let i = 0; i < 80; i++) { const x = (lo + hi) / 2; if ((1 - tE) * x + tE * Math.atan(x) < t) lo = x; else hi = x; } return (lo + hi) / 2; })();
  const pk1 = z => { const D = muZ(z) * z; if (!(D > 0) || !isFinite(pkX)) return 40; const B = Ca(z) / (tC * D); return Math.min(40, pkX / B / Dg); };   // [deg]
  function axPk(zo, zi) {
    if (!(zo > 0)) return 0; if (!(zi > 0)) return FyT(pk1(zo), zo);
    const G = a => FyT(a, zo) + FyT(a, zi), a1 = Math.min(pk1(zo), pk1(zi)), a2 = Math.max(pk1(zo), pk1(zi));
    let bA = a1, bG = G(a1); for (let j = 1; j <= 16; j++) { const a = a1 + (a2 - a1) * j / 16, v = G(a); if (v > bG) { bG = v; bA = a; } }
    let lo = Math.max(0, bA - (a2 - a1) / 16), hi = bA + (a2 - a1) / 16 + 1e-9;
    for (let i = 0; i < 50; i++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (G(m1) < G(m2)) lo = m1; else hi = m2; }
    return Math.max(bG, G((lo + hi) / 2)); }
  const NS = 80, NQ = 25, Smax = 1.2 * (m * g + cl * 60 * 60);   // 격자: 축 하중 0 ~ Smax [N] (차속 60 m/s 다운포스까지) × 안쪽 몫 0 ~ 0.5
  const rtKey = JSON.stringify([I.mu, mus, fz0, tmap, ca0, cn, tC, tE, fzr, Smax]);
  let RT = RTC.get(rtKey) || null;
  const rhoT = () => { if (RT) return RT; RT = []; RTC.set(rtKey, RT);
    for (let j = 0; j <= NS; j++) { const Sz = Math.max(1, Smax * j / NS), row = [];
      for (let q = 0; q <= NQ; q++) { const zi = Sz * 0.5 * q / NQ, zo = Sz - zi, nx = muZ(zo) * zo + muZ(zi) * zi; row.push(nx > 0 ? Math.min(1, axPk(zo, zi) / nx) : 1); }
      RT.push(row); }
    return RT; };
  const rho = (Sz, q) => { const T = rhoT(), x = Math.max(0, Math.min(NS, Sz / Smax * NS)), y = Math.max(0, Math.min(NQ, q / 0.5 * NQ)), j = Math.min(NS - 1, Math.floor(x)), k = Math.min(NQ - 1, Math.floor(y)), u = x - j, w = y - k;
    return (T[j][k] * (1 - w) + T[j][k + 1] * w) * (1 - u) + (T[j + 1][k] * (1 - w) + T[j + 1][k + 1] * w) * u; };
  const capY = (Fz, d) => { if (!md2) return cap(Fz, d); const [o, i] = wheels(Fz, d), Sz = o + i; if (!(Sz > 0)) return 0; return (muZ(o) * o + muZ(i) * i) * rho(Sz, i / Sz); };
  // ---------- 모델 2: 조향 — 안쪽 바퀴 조향각 [deg] = atan(L ÷ (R_뒤축 − t_f/2)) + (α_f − α_r)  (기하는 100 % 애커먼 근사, R_뒤축 = √(R² − l_r²), l_r = L × 앞 무게 몫)
  //   도구 6 조향각 표가 있으면 기하 조향각 · 최대 조향각 · 조향비는 그 표에서 (steerGeo)
  const SG = steerGeo(I);
  const dmx = md2 && I.dl_on !== 0 ? SG.dmax : 0;   // 조향 한계 (dl_on 1, calc 입구에서 > 0 확인)
  const dIn0 = k => SG.diOf(k);
  const dReq = (v, k) => { const ay = v * v * Math.abs(k), [fo, fi] = wheels(Fzf(v, 0), dF(ay, true)), [ro, ri] = wheels(Fzr(v, 0), dF(ay, false));
    return dIn0(k) + slipA(fo, fi, m * ay * fs).a - slipA(ro, ri, m * ay * (1 - fs)).a; };

  return { m, meff, r, gr, eta, etaD, fs, h, nmax, vtop, rpm, Fres, Fzr, Fzf, dF, wheels, capF, capR, capFy, capRy, axPk, vFlag, vCorner3, md3, ksT, dIn0, dReq, dmx, rollAng, md2, slipA, Ca, kUs, L, hra, tf, tr, muZ, FyT, sr: SG.rc, SG, drv: I.dr_real === 1,
           vCorner, aDrive, aBrake, drive, elec, Tcurve, Voc, Epack, EpackAt, Ecap, ptMax, Rb, Imax, tmNext, thStep, rS, thOn, cwOn, btOn, inOn, drOn, Tpk, Tct, Tinit: I.th_init, rgOn, lam: lam > 0 ? lam : 0,
           TH0: { m: I.th_init, i: Number.isFinite(I.i_init) ? I.i_init : I.th_init, w: I.th_cool, b: isFinite(I.b_t0) ? I.b_t0 : 25, x: X0 } };   // 출발 온도 (모터 · 인버터 · 냉각수 · 축전지)
}


// ================================================================ 코스
// 구간 → 점 (간격 ds [m] 이하).  k[j] = j번째 칸의 곡률 [1/m]
function grid(segs, ds) {
  const s = [0], k = [];
  for (const [l, R] of segs) {
    const n = Math.max(1, Math.ceil(l / ds - 1e-9)), st = l / n;
    for (let i = 0; i < n; i++) { k.push(R ? 1 / R : 0); s.push(s[s.length - 1] + st); }
  }
  return { s, k };
}

// 닫힌 코스를 출발 위치 s0 [m] 부터 시작하게 돌림
function rotate(segs, s0) {
  const len = segs.reduce((a, r) => a + r[0], 0);
  s0 = ((s0 % len) + len) % len;
  if (s0 < 1e-9) return segs.slice();
  let c = 0;
  for (let i = 0; i < segs.length; i++) {
    const [l, ...rest] = segs[i];                        // rest = [반경, …] (내 코스는 [반경, 왼쪽 폭, 오른쪽 폭, 시작 콘, 행 번호])
    if (s0 < c + l - 1e-9) {
      const a = s0 - c, head = a > 1e-9 ? [[a, ...rest]] : [], tail = [l - a, ...rest];
      if (a > 1e-9 && tail.length > 4) tail[4] = 0;         // 구간 중간에서 시작하면 그 구간 시작 콘은 앞 조각(맨 끝으로 감)에 남음
      return [tail, ...segs.slice(i + 1), ...segs.slice(0, i), ...head];
    }
    c += l;
  }
  return segs.slice();
}

// 거꾸로 달리기 (구간 순서 반대, 회전 방향 반대)
const reverse = segs => segs.slice().reverse().map(([l, R]) => [l, -R]);


// ================================================================ 주행선 (최소 곡률)
// 가운데 선에서 옆으로 e [m] (왼쪽 +) 만큼 옮긴 경로를 찾음 (Heilmeier 외 2020 의 최소 곡률 경로를 곡선 좌표로)
//   경로 곡률 ≈ k0 + e''  → Σ h (k0 + e'')² 가 가장 작은 e (이차 계획법, Heilmeier 와 같은 1차 근사)
//      옆으로 옮겨서 생기는 곡률 변화 k0² e 는 뺌: 넣으면 긴 원호에서 바깥 경계로만 밀려
//      FSK 2026 내구 기록이 오히려 느려짐 (1487 → 1524 s, 오토크로스 53.9 → 56.2 s)
//   경계: −(오른쪽 폭 − b) ≤ e ≤ 왼쪽 폭 − b  (b = 경계 · 콘에서 차 중심까지 최소 거리)
//   슬라럼 콘 (옆 거리 c, 내 코스는 가운데 선 위 c = 0): 콘 자리에서 e ≥ c + b 또는 e ≤ c − b 를 번갈아 (묶음의 첫 콘은 왼쪽으로 지나감 = e ≥ b)
//   풀이: ADMM + 원시-쌍대 능동 집합법, 5대각 행렬 분해. 닫힌 코스는 처음 ↔ 끝을 이어 주기 조건으로 풂
//   결과: 1 m 안팎 조각의 [길이 m, 반경 m] — 길이 = h (1 − k0 e) √(1 + e'²), 곡률 = (k0 + e'') ÷ (1 − k0 e)
const RLC = new Map();   // 코스마다 한 번만 (차량 입력과 상관없음)

// 대칭 행렬 풀이: 대각 d0 + 띠(한 칸 · 두 칸 옆 d1, d2) + 띠 밖 몇 칸 (닫힌 코스의 처음 ↔ 끝 연결)
//   띠 부분 B 는 LDLᵀ 분해, 띠 밖 몇 칸은 Woodbury 식으로 보정: x = y − Z (I + M Pᵀ Z)⁻¹ M Pᵀ y   (y = B⁻¹b, Z = B⁻¹P)
//   ext = [[a, b, 값]] (a < b, b − a > 2).  반환: b → x 풀이 함수 (한 번 분해, 여러 번 풂)
function symSolver(d0, d1, d2, ext) {
  const n = d0.length, D = new Float64Array(n), L1 = new Float64Array(n), L2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    D[i] = d0[i] - (i > 0 ? L1[i - 1] * L1[i - 1] * D[i - 1] : 0) - (i > 1 ? L2[i - 2] * L2[i - 2] * D[i - 2] : 0);
    if (i < n - 1) L1[i] = (d1[i] - (i > 0 ? L1[i - 1] * L2[i - 1] * D[i - 1] : 0)) / D[i];
    if (i < n - 2) L2[i] = d2[i] / D[i];
  }
  const band = b => { const x = Float64Array.from(b);
    for (let i = 1; i < n; i++) x[i] -= L1[i - 1] * x[i - 1] + (i > 1 ? L2[i - 2] * x[i - 2] : 0);
    for (let i = 0; i < n; i++) x[i] /= D[i];
    for (let i = n - 2; i >= 0; i--) x[i] -= L1[i] * x[i + 1] + (i < n - 2 ? L2[i] * x[i + 2] : 0);
    return x; };
  if (!ext || !ext.length) return band;
  // ---------- 띠 밖: 관련 점 K, 그 사이 값 M (k × k)
  const K = [...new Set(ext.flatMap(([a, b]) => [a, b]))], k = K.length, at = new Map(K.map((v, i) => [v, i]));
  const Mx = Array.from({ length: k }, () => new Float64Array(k));
  ext.forEach(([a, b, v]) => { Mx[at.get(a)][at.get(b)] += v; Mx[at.get(b)][at.get(a)] += v; });
  const Z = K.map(j => { const e = new Float64Array(n); e[j] = 1; return band(e); });          // Z[c] = B⁻¹ 의 j 번째 열
  const S = Array.from({ length: k }, (_, r) => Float64Array.from({ length: k }, (_, c) => (r === c ? 1 : 0) + Mx[r].reduce((acc, m, t) => acc + m * Z[c][K[t]], 0)));
  const lu = luDense(S);
  return b => { const y = band(b), w = lu(Mx.map(row => row.reduce((acc, m, t) => acc + m * y[K[t]], 0)));
    for (let c = 0; c < k; c++) if (w[c]) for (let i = 0; i < n; i++) y[i] -= Z[c][i] * w[c];
    return y; };
}
// 작은 밀집 행렬 LU (부분 피벗) → 풀이 함수
function luDense(A0) {
  const n = A0.length, A = A0.map(r => Float64Array.from(r)), p = [...Array(n).keys()];
  for (let c = 0; c < n; c++) {
    let m = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
    [A[c], A[m]] = [A[m], A[c]]; [p[c], p[m]] = [p[m], p[c]];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; A[r][c] = f; for (let j = c + 1; j < n; j++) A[r][j] -= f * A[c][j]; }
  }
  return b => { const x = p.map(i => b[i]);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) x[i] -= A[i][j] * x[j];
    for (let i = n - 1; i >= 0; i--) { for (let j = i + 1; j < n; j++) x[i] -= A[i][j] * x[j]; x[i] /= A[i][i]; }
    return x; };
}

// 상자 제약 이차 계획: min ½ eᵀQe + gᵀe,  lo ≤ e ≤ hi
//   Q = 5대각 + (닫힌 코스면) 처음 ↔ 끝 연결: Q[i][i] = q0[i], Q[i][i+1] = q1[i], Q[i][i+2] = q2[i]  (번호는 n 으로 나눈 나머지)
//   1) ADMM (Boyd 외 2011) 으로 어느 점이 경계에 붙는지 대강 잡고
//        x = (Q + ρI)⁻¹ (ρ(z − u) − g),  z = [x + u] 를 상자 안으로,  u ← u + x − z   ((Q + ρI) 는 한 번만 분해)
//   2) 원시-쌍대 능동 집합법 (Hintermüller 외 2002) 으로 마무리: 경계에 붙은 점은 고정, 나머지는 방정식을 정확히 풂
//   3) 최적 조건 (KKT) 이 맞을 때까지 되풀이
function boxQP(q0, q1, q2, g, lo, hi, z0) {
  const n = q0.length, rho = 1, W = i => ((i % n) + n) % n;
  const nb = []; for (let i = 0; i < n; i++) { if (q1[i]) nb.push([i, W(i + 1), q1[i]]); if (q2[i]) nb.push([i, W(i + 2), q2[i]]); }   // 위 삼각 성분
  const Qg = (x, i) => g[i] + q0[i] * x[i] + q1[i] * x[W(i + 1)] + q1[W(i - 1)] * x[W(i - 1)] + q2[i] * x[W(i + 2)] + q2[W(i - 2)] * x[W(i - 2)];
  // 부분 행렬 (점 목록 F, 순서대로) 풀이 함수: 띠 + 띠 밖
  const subSolver = (F, add) => { const m = F.length, pos = new Int32Array(n).fill(-1); F.forEach((i, a) => { pos[i] = a; });
    const d0 = Float64Array.from(F, i => q0[i] + add), d1 = new Float64Array(m), d2 = new Float64Array(m), ext = [];
    nb.forEach(([i, j, v]) => { const a = pos[i], b = pos[j]; if (a < 0 || b < 0) return; const lo_ = Math.min(a, b), hi_ = Math.max(a, b);
      if (hi_ - lo_ === 1) d1[lo_] += v; else if (hi_ - lo_ === 2) d2[lo_] += v; else ext.push([lo_, hi_, v]); });
    return symSolver(d0, d1, d2, ext); };
  const all = [...Array(n).keys()], solve = subSolver(all, rho);
  const e = new Float64Array(n), u = new Float64Array(n), r = new Float64Array(n), mu = new Float64Array(n), act = new Int8Array(n);
  for (let i = 0; i < n; i++) e[i] = Math.max(lo[i], Math.min(hi[i], z0 ? z0[i] : 0));
  for (let round = 0; round < 6; round++) {
    // ---------- 1) ADMM
    for (let it = 0; it < 600; it++) {
      for (let i = 0; i < n; i++) r[i] = rho * (e[i] - u[i]) - g[i];
      const x = solve(r); let res = 0;
      for (let i = 0; i < n; i++) { const zn = Math.max(lo[i], Math.min(hi[i], x[i] + u[i])); res = Math.max(res, Math.abs(zn - e[i]), Math.abs(x[i] - zn)); e[i] = zn; u[i] += x[i] - zn; }
      if (res < 1e-6) break;
    }
    // ---------- 2) 능동 집합 마무리
    for (let i = 0; i < n; i++) mu[i] = -rho * u[i];        // 경계가 미는 힘 ≈ Qe + g
    let prev = '';
    for (let it = 0; it < 30; it++) {
      for (let i = 0; i < n; i++) act[i] = lo[i] >= hi[i] ? -1 : mu[i] - (e[i] - lo[i]) > 0 ? -1 : mu[i] - (e[i] - hi[i]) < 0 ? 1 : 0;
      const key = act.join(''); if (key === prev) break; prev = key;
      const F = []; for (let i = 0; i < n; i++) { if (act[i] < 0) e[i] = lo[i]; else if (act[i] > 0) e[i] = hi[i]; else F.push(i); }
      if (F.length) {                                       // 자유 점만의 방정식 (고정 점은 오른쪽으로)
        const fr = new Int8Array(n); F.forEach(i => { fr[i] = 1; });
        const rhs = F.map(i => { const y = Qg(e, i) - q0[i] * e[i]; let free = 0;
          [[1, q1[i]], [-1, q1[W(i - 1)]], [2, q2[i]], [-2, q2[W(i - 2)]]].forEach(([d, v]) => { const j = W(i + d); if (fr[j]) free += v * e[j]; });
          return -(y - free); });                           // −(g + 고정 점 몫)
        const x = subSolver(F, 0)(rhs); F.forEach((i, a) => { e[i] = x[a]; });
      }
      for (let i = 0; i < n; i++) mu[i] = act[i] ? Qg(e, i) : 0;
    }
    // ---------- 3) 최적 조건 확인: 맞으면 끝, 아니면 ADMM 부터 다시
    let kkt = 0;
    for (let i = 0; i < n; i++) { const y = Qg(e, i), l = e[i] <= lo[i] + 1e-9, h = e[i] >= hi[i] - 1e-9;
      kkt = Math.max(kkt, l && h ? 0 : e[i] < lo[i] - 1e-9 || e[i] > hi[i] + 1e-9 ? 1 : l ? -y : h ? y : Math.abs(y)); }
    for (let i = 0; i < n; i++) { e[i] = Math.max(lo[i], Math.min(hi[i], e[i])); u[i] = -mu[i] / rho; }
    boxQP.kkt = kkt;
    if (kkt < 1e-8) break;
  }
  return e;
}

// 곡률 제약 이차 계획: min ½ eᵀQe + gᵀe + Σ 벌점 w_r · (넘은 양),  lo ≤ e ≤ hi (반드시),  행 r: a_rᵀ e ≤ u_r (넘으면 벌점)
//   rows = [{i: [점 3개], a: [계수 3개], u, w}] — 최소 회전 반경 |κ| ≤ 1/rmin 을 선형 부등식 두 줄로 (racingLine 참고)
//   벌점은 넘은 양에 비례 (정확한 벌점): 지킬 수 있으면 w 가 충분히 클 때 제약을 정확히 지키고, 폭 · 콘 때문에 못 지키면 가능한 만큼만 줄임
//   풀이: ADMM (Boyd 외 2011).  x = (Q + ρ(I + AᵀA))⁻¹ (ρ(z_e − u_e) + ρAᵀ(z_a − u_a) − g)  — 행이 이웃 3점만 써서 AᵀA 도 5대각
function curvQP(q0, q1, q2, g, lo, hi, rows, z0) {
  const n = q0.length, rho = 1, W = i => ((i % n) + n) % n;
  const d0 = Float64Array.from(q0, v => v + rho), d1 = Float64Array.from(q1), d2 = Float64Array.from(q2);
  const add = (i, j, v) => { const d = W(j - i); if (d === 0) d0[i] += v; else if (d === 1) d1[i] += v; else if (d === 2) d2[i] += v; else if (d === n - 1) d1[j] += v; else d2[j] += v; };
  rows.forEach(r => { for (let p = 0; p < 3; p++) for (let q = p; q < 3; q++) { const v = rho * r.a[p] * r.a[q]; if (p === q) add(r.i[p], r.i[p], v); else add(r.i[p], r.i[q], v); } });
  const ext = [], e1 = new Float64Array(n), e2 = new Float64Array(n);
  for (let i = 0; i < n; i++) { if (d1[i]) { if (i + 1 < n) e1[i] = d1[i]; else ext.push([0, n - 1, d1[i]]); }
                                if (d2[i]) { if (i + 2 < n) e2[i] = d2[i]; else ext.push([W(i + 2), i, d2[i]]); } }
  const solve = symSolver(d0, e1, e2, ext.map(([a, b, v]) => [Math.min(a, b), Math.max(a, b), v]));
  const m = rows.length, ze = new Float64Array(n), ue = new Float64Array(n), za = new Float64Array(m), ua = new Float64Array(m), r = new Float64Array(n);
  for (let i = 0; i < n; i++) ze[i] = Math.max(lo[i], Math.min(hi[i], z0 ? z0[i] : 0));
  const Ax = (x, k) => { const R = rows[k]; return R.a[0] * x[R.i[0]] + R.a[1] * x[R.i[1]] + R.a[2] * x[R.i[2]]; };
  for (let k = 0; k < m; k++) za[k] = Ax(ze, k);
  for (let it = 0; it < 6000; it++) {
    for (let i = 0; i < n; i++) r[i] = rho * (ze[i] - ue[i]) - g[i];
    for (let k = 0; k < m; k++) { const R = rows[k], c = rho * (za[k] - ua[k]); r[R.i[0]] += R.a[0] * c; r[R.i[1]] += R.a[1] * c; r[R.i[2]] += R.a[2] * c; }
    const x = solve(r); let res = 0;
    for (let i = 0; i < n; i++) { const v = x[i] + ue[i], z = Math.max(lo[i], Math.min(hi[i], v)); res = Math.max(res, Math.abs(z - ze[i]), Math.abs(x[i] - z)); ze[i] = z; ue[i] = v - z; }
    for (let k = 0; k < m; k++) { const ax = Ax(x, k), v = ax + ua[k], U = rows[k].u, z = v <= U ? v : Math.max(U, v - rows[k].w / rho);   // 벌점 몫만큼 경계 쪽으로
      res = Math.max(res, Math.abs(z - za[k]), Math.abs(ax - z)); za[k] = z; ua[k] = v - z; }
    if (res < 1e-8 && it > 20) break;
  }
  return ze;
}

// 옆 거리 e (점마다) → 달리는 조각 [길이, 반경]:  길이 = h (1 − k0 e) √(1 + e'²),  곡률 = (k0 + e'') ÷ (1 − k0 e)
//   geo = {h, k0 (조각마다), cyc (닫힌 코스), n (점 수), M (조각 수), segNode (원래 구간 시작 점), lo, hi (점마다 경계)}
function lineOut(e, geo) {
  const { h, k0, cyc, n, M } = geo, W = i => ((i % n) + n) % n;
  const hA = i => h[cyc ? W(i) : Math.max(0, Math.min(M - 1, i))];
  const E = i => cyc ? e[W(i)] : e[Math.max(0, Math.min(n - 1, i))];
  const D2 = i => { const hm = hA(i - 1), hp = hA(i), hn = (hm + hp) / 2; return ((E(i + 1) - E(i)) / hp - (E(i) - E(i - 1)) / hm) / hn; };
  const out = [], eNode = [];
  for (let i = 0; i < M; i++) {
    const em = (E(i) + E(i + 1)) / 2, de = (E(i + 1) - E(i)) / h[i];
    const dd = cyc ? (D2(i) + D2(i + 1)) / 2 : (i > 0 ? D2(i) : 0) / 2 + (i + 1 < n - 1 ? D2(i + 1) : 0) / 2;
    const k = (k0[i] + dd) / (1 - k0[i] * em), l = h[i] * (1 - k0[i] * em) * Math.sqrt(1 + de * de);
    out.push([l, Math.abs(k) > 1e-5 ? 1 / k : 0]); eNode.push(E(i));
  }
  eNode.push(E(M));
  const sN = [0]; h.forEach(x => sN.push(sN.at(-1) + x));
  return { segs: out, e: geo.segNode.map(j => eNode[j]), len: out.reduce((a, r) => a + r[0], 0),   // e: 원래 구간 시작점마다 [m]
           sN, eN: eNode, eAll: Float64Array.from(e), geo };                                      // 그림용: 가운데 선 거리 [m] → 옆 거리 [m]
}

// segs = [[길이, 반경]], o = {closed, wl(i), wr(i) [m], b [m], cones: [점 번호 = 그 구간 시작], key}
function racingLine(segs, o) {
  if (o.key && RLC.has(o.key)) return RLC.get(o.key);
  // ---------- 1 m 안팎 조각으로 나눔
  const h = [], k0 = [], wl = [], wr = [], segNode = [];
  segs.forEach(([l, R], i) => { const n = Math.max(1, Math.ceil(l / 1.05 - 1e-9)); segNode.push(h.length);
    for (let j = 0; j < n; j++) { h.push(l / n); k0.push(R ? 1 / R : 0); wl.push(o.wl(i)); wr.push(o.wr(i)); } });
  const M = h.length, cyc = o.closed && M >= 6, n = cyc ? M : M + 1;          // 점 수: 닫힌 코스는 마지막 점 = 처음 점
  const W = i => cyc ? ((i % n) + n) % n : i;
  const hA = i => h[cyc ? W(i) : Math.max(0, Math.min(M - 1, i))];          // 점 i 와 i+1 사이 조각
  const kA = i => k0[cyc ? W(i) : Math.max(0, Math.min(M - 1, i))];
  // ---------- 점마다 폭 (점 양쪽 조각 폭의 평균)
  const lo = new Float64Array(n), hi = new Float64Array(n), wlN = new Float64Array(n), wrN = new Float64Array(n);
  for (let i = 0; i < n; i++) { const a = cyc ? W(i) : Math.min(M - 1, i), b = cyc ? W(i - 1) : Math.max(0, i - 1); wlN[i] = (wl[a] + wl[b]) / 2; wrN[i] = (wr[a] + wr[b]) / 2; }
  // 여유 [왼쪽, 오른쪽] = 곡률 k 에서 차 왼쪽 · 오른쪽이 차 중심 선보다 나가는 거리 + 여유 (o.bk 없으면 양쪽 o.b)
  const bAt = k => o.bk ? o.bk(k) : [o.b, o.b];
  // ---------- 목적: Σ hn (kn + D2e)²  (D2e = 점 i 의 2계 차분) → ½ eᵀQe + gᵀe
  const q0 = new Float64Array(n), q1 = new Float64Array(n), q2 = new Float64Array(n), g = new Float64Array(n);
  const addQ = (i, j, v) => { const d = cyc ? W(j - i) : j - i; if (d === 0) q0[i] += v; else if (d === 1) q1[i] += v; else if (d === 2) q2[i] += v;
    else if (d === n - 1) q1[j] += v; else q2[j] += v; };                     // 닫힌 코스: 처음 ↔ 끝 연결
  // 점 i 의 곡률 ≈ kn + D2e = kn + Σ c[a]·e[idx[a]]
  const node = i => { const hm = hA(i - 1), hp = hA(i), hn = (hm + hp) / 2, kn = (kA(i - 1) * hm + kA(i) * hp) / (hm + hp);
    return { hn, kn, c: [1 / (hm * hn), -(1 / hm + 1 / hp) / hn, 1 / (hp * hn)], idx: [W(i - 1), i, W(i + 1)] }; };
  const i0 = cyc ? 0 : 1, i1 = cyc ? n : n - 1;
  const build = () => { q0.fill(0); q1.fill(0); q2.fill(0); g.fill(0);
    for (let i = i0; i < i1; i++) { const { hn, kn, c, idx } = node(i);
      for (let a = 0; a < 3; a++) { g[idx[a]] += hn * kn * c[a];
        for (let b = a; b < 3; b++) addQ(idx[a], idx[b], hn * c[a] * c[b]); }
    }
    for (let i = 0; i < n; i++) q0[i] += 1e-9; };                               // 곧은 코스에서도 풀리게 (아주 작은 가운데 쪽 당김)
  build();
  // ---------- 경계 · 슬라럼 콘 제약: 점 곡률 kN 에서의 차 여유로 (곧은 선 → 풀린 선의 곡률로 다시 → 몇 번)
  const tight = new Set();   // 콘과 경계 사이가 좁아 여유를 못 지키는 콘 (구간 번호)
  const cones = (o.cones || []).slice().sort((a, b) => a - b);
  const groups = o.groups && o.groups.length ? o.groups.map(g => g.slice()) : [];
  // 콘 묶음: 주어지면 그대로 (내 코스 = 행마다), 아니면 구간 번호가 20 안쪽으로 이어지는 콘 (공식 코스 = 1 m 구간 → 약 20 m)
  if (!groups.length) cones.forEach(c => { const gl = groups[groups.length - 1]; if (gl && c - gl[gl.length - 1] < 20) gl.push(c); else groups.push([c]); });
  const bounds = kN => { tight.clear();
    for (let i = 0; i < n; i++) { const [bL, bR] = bAt(kN[i]), L = wlN[i] - bL, Rr = wrN[i] - bR; lo[i] = -Rr; hi[i] = L; if (lo[i] > hi[i]) lo[i] = hi[i] = (L - Rr) / 2; }
    if (!cyc) { lo[0] = hi[0] = 0; lo[n - 1] = hi[n - 1] = 0; }              // 열린 코스: 출발 · 끝은 가운데
    groups.forEach(gp => { const sgn0 = 1;   // 묶음의 첫 콘은 차가 왼쪽으로 지나감 (FSK 공식 코스 규칙, 내 코스도 같게) → 콘은 차 오른쪽
      gp.forEach((c, j) => { const i = segNode[c], sg = j % 2 ? -sgn0 : sgn0, cl = o.coneLat && o.coneLat.has(c) ? o.coneLat.get(c) : 0;   // cl = 콘의 옆 거리 (내 코스 = 가운데 선 위 0)
        // 콘 = 반지름 b 원 (콘 자리 = 점 i 에서 앞뒤로 cd 만큼, b = 콘 쪽 차 여유): 콘을 사이에 둔 두 점은 옆으로 b, 그 밖의 점은 앞뒤 거리 ds 일 때 √(b² − ds²) 이상
        const cd = o.coneDs && o.coneDs.has(c) ? o.coneDs.get(c) : 0;
        for (let d = -8; d <= 8; d++) { const q = i + d, k = cyc ? W(q) : q; if (k < 0 || k >= n) continue;
          const bc = bAt(kN[k])[sg > 0 ? 1 : 0];
          let s = -cd; if (d > 0) for (let t = 0; t < d; t++) s += hA(i + t); else for (let t = 1; t <= -d; t++) s -= hA(i - t);
          const br = d === 0 || (Math.abs(cd) > 1e-9 && d === Math.sign(cd)); if (!br && Math.abs(s) >= bc) continue;
          const off = br ? bc : Math.sqrt(bc * bc - s * s);
          if (sg > 0) lo[k] = Math.max(lo[k], cl + off); else hi[k] = Math.min(hi[k], cl - off);
          if (lo[k] > hi[k]) { lo[k] = hi[k]; tight.add(c); } } }); }); };
  const kNode = x => { const kN = new Float64Array(n); for (let i = i0; i < i1; i++) { const { kn, c, idx } = node(i); kN[i] = (kn + c[0] * x[idx[0]] + c[1] * x[idx[1]] + c[2] * x[idx[2]]) / (1 - kn * x[i]); }
    if (!cyc) { kN[0] = kN[1]; kN[n - 1] = kN[n - 2]; } return kN; };
  bounds(new Float64Array(n));
  let e = boxQP(q0, q1, q2, g, lo, hi);
  if (o.bk) for (let it = 0; it < 3; it++) { bounds(kNode(e)); e = boxQP(q0, q1, q2, g, lo, hi, e); }   // 차 길이 · 저속 차체 각도: 곡률에 따라 여유가 바뀜
  // ---------- 최소 회전 반경: 곡률이 1/rmin 을 넘는 점에 벌점(10 → 100 → …)을 붙여 다시 풂 (최대 8 번, 폭 안에서 못 맞추면 남김 → 결과에 경고)
  // ---------- 최소 회전 반경 |κ| ≤ 1/rmin.  곡률 κ = (kn + D2e) ÷ (1 − kn·e) 이므로 (1 − kn·e > 0)
  //   kn + D2e ≤ kmax (1 − kn·e)  과  −(kn + D2e) ≤ kmax (1 − kn·e)  두 줄 모두 e 에 대해 선형 → 곡률 제약 QP 로 다시 풂 (어긴 점이 있을 때만)
  const kmax = o.kmax > 0 ? o.kmax : 0;
  if (kmax) {
    const kOf = i => { const { kn, c, idx } = node(i); return (kn + c[0] * e[idx[0]] + c[1] * e[idx[1]] + c[2] * e[idx[2]]) / (1 - kn * e[i]); };
    let any = false; for (let i = i0; i < i1 && !any; i++) if (Math.abs(kOf(i)) > kmax * (1 + 1e-9)) any = true;
    if (any) {
      // 점 곡률로 제약을 걸고, 달리는 조각 곡률(이웃 두 점 평균, lineOut)이 그래도 넘으면 점 제약을 그 비만큼 조여 다시 풂 (최대 4 번, 합쳐 10 % 까지)
      const e0 = e, pk = x => { let m = 0; lineOut(x, { h, k0, cyc, n, M, segNode, lo, hi }).segs.forEach(([, R]) => { if (R) m = Math.max(m, 1 / Math.abs(R)); }); return m; };
      let kq = kmax;
      for (let t = 0; t < 4; t++) {
        const rows = [];
        for (let i = i0; i < i1; i++) { const { hn, kn, c, idx } = node(i), w = 1e3 * hn;
          rows.push({ i: idx, a: [c[0], c[1] + kq * kn, c[2]], u: kq - kn, w });          //  κ ≤ kq
          rows.push({ i: idx, a: [-c[0], -c[1] + kq * kn, -c[2]], u: kq + kn, w }); }     // −κ ≤ kq
        e = curvQP(q0, q1, q2, g, lo, hi, rows, e0);
        const kp = pk(e); if (kp <= kmax * (1 + 1e-4) || kq <= kmax * 0.9) break;
        kq = Math.max(kmax * 0.9, kq * kmax / kp);
      }
    }
  }
  const res = lineOut(e, { h, k0, cyc, n, M, segNode, lo, hi, kmax, wlN, wrN, bk: o.bk || null });
  res.ctight = tight.size;
  if (o.key) RLC.set(o.key, res);
  return res;
}

// 경계 · 콘에서 차 중심까지 최소 거리 b [m]: 차 전폭이 있으면 전폭 ÷ 2 + 여유, 없으면 (0 · 빈칸) 직접 넣은 최소 거리
// 최소 회전 반경 [m] = 최대 조향각에서 (아주 느리게, 슬립각 0, 100 % 애커먼 — 모델 2 조향 한계 dIn0 의 역함수):
//   R_뒤축 = L ÷ tan δ_max + t_f ÷ 2,  R (CG 경로) = √(R_뒤축² + l_r²),  l_r = L × 앞 하중 비율   (조향 한계 고려 안 함 · δ_max 0 = 제약 없음)
//   도구 6 조향각 표 (I.stab = [[핸들 각 °, 안쪽 바퀴 °, 바깥 바퀴 °], …]) 가 있으면 그 표의 핸들 최대에서 (도구 6 최소 회전 반경과 같은 식, steerGeo)
const rKin = I => { if (I.dl_on === 0) return 0; const SG = steerGeo(I); return SG.kmax > 0 ? 1 / SG.kmax : 0; };
// ---------- 조향 기하: 곡률 κ (CG 경로) → 핸들 각 h [°] · 안쪽 바퀴 각 [°]  (아주 느리게, 슬립각 0)
//   도구 6 표가 있으면: 표의 행마다 자전거 등가 각 cot δe = (cot δ안 + cot δ바깥) ÷ 2 → R_뒤축 = L cot δe, κ = 1 ÷ √(R_뒤축² + l_r²),
//     κ 에 대해 핸들 각 · 안쪽 바퀴 각을 직선 보간 (링크 기하 · 애커먼 % 그대로), 가운데 조향비 = 첫 행 핸들 각 ÷ 두 바퀴 평균
//   표가 없으면: 100 % 애커먼 — δe = atan(L ÷ R_뒤축), 핸들 = 조향비 × δe, 안쪽 바퀴 = atan(L ÷ (R_뒤축 − t_f ÷ 2)), 최대 = 최대 조향각 (안쪽 바퀴)
function steerGeo(I) {
  const L = I.L / 1000, lr = L * I.fr / 100, tf = I.tf / 1000, D = Math.PI / 180;
  const T = Array.isArray(I.stab) ? I.stab.filter(r => Array.isArray(r) && r.length >= 3 && r.every(Number.isFinite) && r[0] > 0 && r[1] > 0 && r[2] > 0 && r[1] < 89 && r[2] < 89).sort((a, b) => a[0] - b[0]) : [];
  if (T.length >= 2) {
    const P = [[0, 0, 0]].concat(T.map(([h, di, dO]) => { const ce = (1 / Math.tan(di * D) + 1 / Math.tan(dO * D)) / 2, Ra = L * ce; return [1 / Math.sqrt(Ra * Ra + lr * lr), h, di]; }));
    for (let i = 1; i < P.length; i++) if (!(P[i][0] > P[i - 1][0])) throw new Error('도구 6 조향각 표: 핸들 각이 커질수록 회전 반경이 작아져야 합니다 (표 확인).');
    const seg = k => { let i = 1; while (i < P.length - 1 && P[i][0] < k) i++; return i; };
    const at = (k, c) => { const i = seg(k), [k0, ...a] = P[i - 1], [k1, ...b] = P[i]; return a[c] + (b[c] - a[c]) * (k - k0) / (k1 - k0); };
    const rc = T[0][0] / ((T[0][1] + T[0][2]) / 2);
    return ({ tab: true, n: T.length, kmax: P.at(-1)[0], dmax: T.at(-1)[1], hwMax: T.at(-1)[0], rc,
      hOf: k => at(Math.abs(k), 0), diOf: k => Math.abs(k) > P.at(-1)[0] * (1 + 1e-9) ? 90 : at(Math.abs(k), 1),
      hp: k => { const i = seg(Math.abs(k)); return (P[i][1] - P[i - 1][1]) / (P[i][0] - P[i - 1][0]); } });
  }
  const r = I.steer_ratio > 0 ? I.steer_ratio : 5, dm = I.delta_max;
  const Ra = k => { const R = 1 / Math.max(1e-9, Math.abs(k)); return Math.sqrt(Math.max(1e-9, R * R - lr * lr)); };
  const dE = k => Math.abs(k) < 1e-12 ? 0 : Math.atan(L / Ra(k)) / D;
  const kmax = dm > 0 && dm < 90 ? (Rr => 1 / Math.sqrt(Rr * Rr + lr * lr))(L / Math.tan(dm * D) + tf / 2) : 0;
  return ({ tab: false, kmax, dmax: dm, rc: r, hwMax: NaN,
    hOf: k => r * dE(k), diOf: k => { const Rr = Ra(k) - tf / 2; return Rr > 1e-6 ? Math.atan(L / Rr) / D : 90; },
    hp: k => { const a = Math.abs(k), e = Math.max(1e-6, a * 1e-4); return r * (dE(a + e) - dE(Math.max(0, a - e))) / (a + e - Math.max(0, a - e)); } });
}
const rkMax = I => { const R = rKin(I); return R > 0 ? 1 / R : 0; };   // 주행선 최대 곡률 [1/m] (0 = 제약 없음)
// 달리는 선에서 최소 회전 반경보다 급한 구간: {r: 가장 작은 반경 [m], bad: 급한 구간 길이 합 [m]}
function rTight(segs, rmin) { let r = Infinity, bad = 0;
  (segs || []).forEach(([l, R]) => { if (!R) return; const a = Math.abs(R); if (a < r) r = a; if (rmin > 0 && a < rmin * (1 - 1e-3)) bad += l; });
  return { r, bad }; }
const wcOn = I => I.wc_on !== 0;   // 차 크기(전폭 · 오버행) 고려 (calc 입구에서 전폭 > 0 확인)
const rlB = I => wcOn(I) ? I.w_car / 2 + Math.max(0, I.rl_m || 0) : Math.max(0, I.rl_b);
// 차 여유 (기하, 차량 모델 단계와 상관없이): 차 = 전폭 w × (앞 끝 ~ 뒤 끝) 사각형, 저속 기구학 선회 (뒷바퀴 옆 미끄럼 없음)
//   회전 중심 O 는 뒤축 연장선 위, 뒤축 중심 반경 R_r = √(R² − l_r²)  (R = CG 경로 반경, l_r = CG ~ 뒤축) → 차체가 CG 경로에 대해 β = atan(l_r / R) 만큼 비스듬
//   바깥 여유 = 바깥 모서리 (앞 끝 · 뒤 끝) 중 O 에서 가장 먼 거리 − R,  안쪽 여유 = R − 안쪽 옆면에서 O 까지 가장 가까운 거리  (+ 여유 rl_m)
//   곡률 k > 0 (왼쪽 회전) 이면 [왼쪽, 오른쪽] = [안쪽, 바깥], 곧은 길이면 둘 다 w/2 + 여유.  전폭이 0 이면 쓰지 않음 (양쪽 rl_b)
function bodyBk(I) {
  if (!wcOn(I)) return null;
  const w = I.w_car, mg = Math.max(0, I.rl_m || 0), L = I.L / 1000, lr = L * I.fr / 100;   // fr = 앞축 하중 % → CG 는 뒤축에서 L·fr 앞
  const xF = L + Math.max(0, I.oh_f || 0), xR = -Math.max(0, I.oh_r || 0);                  // 뒤축 기준 차 앞 끝 · 뒤 끝 [m]
  const C = new Map();
  return k => { const a = Math.abs(k); if (a < 1e-4) return [w / 2 + mg, w / 2 + mg];
    const key = Math.round(a * 1e4); if (C.has(key) && k > 0 === C.get(key)[2]) return C.get(key).slice(0, 2);
    const R = 1 / a, Rr = Math.sqrt(Math.max(R * R - lr * lr, 1e-6));
    const out = Math.max(Math.hypot(xF, Rr + w / 2), Math.hypot(xR, Rr + w / 2)) - R;
    const din = xR <= 0 && xF >= 0 ? Math.abs(Rr - w / 2) : Math.min(Math.hypot(xF, Rr - w / 2), Math.hypot(xR, Rr - w / 2));
    const bo = out + mg, bi = Math.max(0, R - din) + mg, r = k > 0 ? [bi, bo] : [bo, bi];
    C.set(key, [r[0], r[1], k > 0]); return r; };
}
// 차체 각도 β 를 준 차 사각형이 무게중심 경로보다 옆으로 나가는 거리 [왼쪽, 오른쪽] [m] (여유 없이, 닿는지 보는 용)
//   곡률 k (왼쪽 +) 의 회전 중심 O = 무게중심에서 왼쪽 1/k, 차체 방향 = 경로 방향 − β (β 왼쪽 선회에서 +, 저속 기구학 = asin(l_r k))
//   바깥 = 네 모서리 중 O 에서 가장 먼 거리 − R,  안쪽 = R − 차 사각형에서 O 까지 가장 가까운 거리
function bodyM(I, k, beta) {
  const w = I.w_car, L = I.L / 1000, lr = L * I.fr / 100, xF = L - lr + Math.max(0, I.oh_f || 0), xR = -(lr + Math.max(0, I.oh_r || 0));
  const a = Math.abs(k); if (a < 1e-4) return [w / 2, w / 2];
  const R = 1 / a, sg = Math.sign(k), th = -beta * sg, c = Math.cos(th), sn = Math.sin(th);   // 왼쪽 선회로 바꿔 셈 (오른쪽이면 거울)
  const P = [[xF, w / 2], [xF, -w / 2], [xR, -w / 2], [xR, w / 2]].map(([x, y]) => [c * x - sn * y, sn * x + c * y]), O = [0, R];
  const dO = q => Math.hypot(q[0] - O[0], q[1] - O[1]);
  const seg = (p1, p2) => { const dx = p2[0] - p1[0], dy = p2[1] - p1[1], t = Math.max(0, Math.min(1, ((O[0] - p1[0]) * dx + (O[1] - p1[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p1[0] + t * dx - O[0], p1[1] + t * dy - O[1]); };
  const out = Math.max(...P.map(dO)) - R, din = Math.min(...P.map((q, i) => seg(q, P[(i + 1) % 4])));
  const inn = R - din; return sg > 0 ? [inn, out] : [out, inn];
}
// 모델 2 이상 · 전폭이 있을 때: 속도에 따른 차체 각도 β(v) = asin(l_r κ) − α_r(v) (뒷바퀴 슬립각만큼 노즈가 안쪽으로) 로 차 사각형을 놓고
//   코스 경계 (주행선 점마다 왼쪽 · 오른쪽 경계까지 거리) 에 닿으면 그 점의 속도 상한 = 닿지 않는 가장 빠른 속도 (아주 느릴 때도 닿으면 주행선 문제라 상한 없음)
// 주행선 RL 위 코스 정보 (차체 · 콘 확인용): 주행 거리 sd, 점마다 왼쪽 · 오른쪽 경계까지 [m], 슬라럼 콘 (주행 거리 · 주행선에서 옆 거리, 왼쪽 +)
function lineCourse(I, which, RL) {
  const g = RL.geo, segs = RL.segs, M = segs.length, eN = RL.eN, sd = [0]; for (const [l] of segs) sd.push(sd.at(-1) + l);
  const roomL = Float64Array.from({ length: M + 1 }, (_, i) => g.wlN[Math.min(i, g.wlN.length - 1)] - eN[i]), roomR = Float64Array.from({ length: M + 1 }, (_, i) => g.wrN[Math.min(i, g.wrN.length - 1)] + eN[i]);
  const cones = [];
  if (which === 'end' || which === 'ax') { const E = I.end || {}, N = (E.seg || []).length, rev = which === 'ax';
    (E.slalom || []).forEach((j, q) => { const c = rev ? (N - j) % N : j, ic = g.segNode[c]; if (ic == null) return;
      const cl = (rev ? -1 : 1) * ((E.slat || [])[q] || 0), cd = (rev ? -1 : 1) * ((E.sds || [])[q] || 0);
      cones.push({ i: ic, s: sd[ic] + cd, y: cl - eN[ic] }); }); }
  return { sd, roomL, roomR, cones, len: sd[M], M };
}
// 차 사각형 (자세: 무게중심 옆 n, 주행선에 대한 차체 방향 ψ) 과 콘 점 (dx 앞, dy 왼쪽, 주행선 좌표) 사이 거리 [m] (안에 들면 −). 주행선 곡률 κ 로 휨 보정
function coneDist(I, C, n, psi, k, dx, dy) {
  const w = I.w_car, xF = C.L * (1 - C.fs) + Math.max(0, I.oh_f || 0), xR = -(C.L * C.fs + Math.max(0, I.oh_r || 0));
  const yy = dy + k * dx * dx / 2 - n, c = Math.cos(-psi), sn = Math.sin(-psi), x = c * dx - sn * yy, y = sn * dx + c * yy;
  const ox = Math.max(xR - x, 0, x - xF), oy = Math.max(-w / 2 - y, 0, y - w / 2);
  return ox > 0 || oy > 0 ? Math.hypot(ox, oy) : -Math.min(x - xR, xF - x, y + w / 2, w / 2 - y);
}
let BDC = new Map(), BDC_LAST = { key: '', m: new Map(), info: {} }, BDI = {};
function bodyCaps(I, C, RL, closed, LC) {
  const g = RL.geo, segs = RL.segs, M = segs.length, eN = RL.eN, sN = [0]; for (const [l] of segs) sN.push(sN.at(-1) + l);
  const rc = 0, near =   // 콘 = 점 (코스 경계와 같은 기준: 콘 중심)
    i => LC ? LC.cones.filter(q => Math.abs(q.s - sN[i]) <= 6) : [];   // 콘 반지름 · 그 점 둘레 콘
  let ctouch = 0; const ctSeen = new Set();
  const len = sN[M], cap = new Array(M + 1).fill(Infinity), lr = C.L * C.fs; let n = 0, dmax = 0;
  const kp = i => { const a = segs[Math.max(0, i - 1)][1], b = segs[Math.min(M - 1, i)][1], ka = a ? 1 / a : 0, kb = b ? 1 / b : 0; return Math.abs(ka) > Math.abs(kb) ? ka : kb; };
  const beta = (v, k) => { const a = Math.abs(k), ay = v * v * a, [ro, ri] = C.wheels(C.Fzr(v, 0), C.dF(ay, false));
    return Math.sign(k) * (Math.asin(Math.min(1, lr * a)) - C.slipA(ro, ri, C.m * ay * (1 - C.fs)).a * Math.PI / 180); };
  for (let i = 0; i < M; i++) {
    const k = kp(i);
    const roomL = g.wlN[i] - eN[i], roomR = g.wrN[i] + eN[i], cn = near(i);
    const psiOf = v => -beta(v, k);   // 주행선에 대한 차체 방향 = −β
    const fitsB = v => { const [bl, br] = bodyM(I, k, beta(v, k)); return bl <= roomL + 1e-6 && br <= roomR + 1e-6; };
    const fitsC = v => cn.every(q => coneDist(I, C, 0, psiOf(v), k, q.s - sN[i], q.y) >= rc - 1e-6);
    const fits = v => fitsB(v) && fitsC(v);
    if (Math.abs(k) < 1e-4 && !cn.length) continue;
    const v0 = Math.min(C.vCorner(Math.abs(k)), C.vtop);
    if (cn.length && !fitsC(0.3)) cn.forEach(q => { if (coneDist(I, C, 0, psiOf(0.3), k, q.s - sN[i], q.y) < rc - 1e-6 && !ctSeen.has(q)) { ctSeen.add(q); ctouch++; } });
    if (!isFinite(v0) || fits(v0) || !fits(0.3)) continue;
    let lo = 0.3, hi = v0; for (let q = 0; q < 30; q++) { const u = (lo + hi) / 2; if (fits(u)) lo = u; else hi = u; }
    cap[i] = lo; n += (segs[Math.min(M - 1, i)][0] + segs[Math.max(0, i - 1)][0]) / 2; dmax = Math.max(dmax, (v0 - lo) * 3.6);
  }
  const at = x => { x = closed ? ((x % len) + len) % len : Math.max(0, Math.min(len, x)); let lo = 0, hi = M; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (sN[md] <= x) lo = md; else hi = md; } return Math.min(cap[lo], cap[hi]); };
  return { at, info: { len: n, dv: dmax, ct: ctouch } };
}
function prepBody(I, sweep) {
  BDC = new Map(); BDI = {};
  if (!(I.md >= 2) || !wcOn(I) || !(I.rl_on > 0)) return;
  if (sweep) { BDC = BDC_LAST.m; BDI = BDC_LAST.info; return; }
  const key = rlKey(I); if (BDC_LAST.key === key) { BDC = BDC_LAST.m; BDI = BDC_LAST.info; return; }
  const C = car(I, I.gr, 1), E = I.end || {}, jobs = [];
  if ((E.seg || []).length) jobs.push(['end', drivenSegs(I, 'end', E.seg, true), true], ['ax', drivenSegs(I, 'ax', reverse(E.seg), true), true]);
  { const F = freeSegs(I); if (F && F.rl && F.rl.geo) jobs.push(['free', F.rl, F.m > 1]); }
  for (const [w, RL, closed] of jobs) { if (!RL || !RL.geo || !RL.eN) continue; const Cw = (w === 'end' || (w === 'free' && I.free && I.free.end === 1)) && I.dr_real === 1 ? car(endI(I), I.gr, 1) : C, B = bodyCaps(I, Cw, RL, closed, lineCourse(I, w, RL)); BDC.set(segKey(RL.segs), B); BDI[w] = B.info; }
  BDC_LAST = { key, m: BDC, info: BDI };
}
const bdAt = segs => { const B = BDC.get(segKey(segs)); return B ? B.at : null; };
const bodyKey = I => wcOn(I) ? [I.w_car, I.oh_f || 0, I.oh_r || 0, I.L, I.fr, I.rl_m].join(',') : '';

// ================================================================ 주행선 다듬기 (랩타임 직접 줄이기, I.rl_on = 2)
// 최소 곡률 주행선에서 출발해, 경로를 조금씩 옮겨 보고 준정상 랩타임이 줄면 받아들임 (줄지 않으면 버림 → 최소 곡률보다 느려지지 않음)
//   옮기는 모양: ① 코스 전체 (한쪽으로 · 긴 물결 4개) → ② 3 m 간격 종 모양 (폭 3 m), 크기 0.2 → 0.1 → 0.05 → 0.025 m
//   경계 · 슬라럼 콘 제약은 그대로 (넘으면 경계로 자름)
//   랩타임: 개방 전압 · 모터 온도 고정, 1 m 칸.  flying = 두 바퀴 이어 달린 두 번째 바퀴 (내구 · 여러 랩), 아니면 정지 출발 한 바퀴
//   (Kapania 외 2016 의 '경로 → 속도 → 경로' 반복과 같은 목적. 경로를 정하는 단계만 볼록 문제 대신 랩타임 직접 비교)
// 다듬기용 빠른 랩타임: 조각 하나 = 계산 칸 하나, 바뀐 곳 둘레만 앞 · 뒤 계산을 다시 함 (나머지 칸 속도는 그대로라 같은 값)
//   flying (달리던 랩): 한계 속도가 가장 낮은 점(가장 느린 코너)에서 그 속도로 출발해 한 바퀴 → 이어 달린 랩과 거의 같음
//   아니면 조각 0 에서 정지 출발 한 바퀴
function lapModel(C, M, V, flying) {
  const N = M + 1, L = new Float64Array(M), K = new Float64Array(M);
  const lim = new Float64Array(N), vf = new Float64Array(N), af = new Float64Array(N), v = new Float64Array(N);
  const S = { lim: new Float64Array(N), vf: new Float64Array(N), af: new Float64Array(N), v: new Float64Array(N) };
  let st = 0, v0 = 0, T = 0;                             // 출발 조각 · 출발 속도
  const pc = i => (i + st) % M;                          // 칸 i → 조각
  const kAt = i => i < 0 || i >= M ? (flying ? K[pc(((i % M) + M) % M)] : 0) : K[pc(i)], lAt = i => L[pc(i)];
  // 점 i (조각 i−1 과 i 사이) 둘레 [a, b] [m] 의 곡률 적분 (모델 3 곡률 변화용, 조각을 따라 걸음)
  const intK = (i, a, b) => { let t = 0;
    if (b > 0) { let x = 0, j = i; while (x < b && j < i + 4 * M) { const l = lAt(j), x1 = x + l, lo = Math.max(a, x), hi = Math.min(b, x1); if (hi > lo) t += kAt(j) * (hi - lo); x = x1; j++; } }
    if (a < 0) { let x = 0, j = i - 1; while (x > a && j > i - 4 * M) { const l = lAt(j), x0 = x - l, lo = Math.max(a, x0), hi = Math.min(b, x); if (hi > lo) t += kAt(j) * (hi - lo); x = x0; j--; } }
    return t; };
  const hK = C.ksT / 2;
  const limAt = i => { const a = kAt(i - 1), b = kAt(i), kp = Math.abs(a) > Math.abs(b) ? a : b;
    if (!C.md3) return Math.min(C.vCorner(Math.abs(kp)), C.vtop);
    const c = intK(i, -hK, hK) / (2 * hK), cp = intK(i, 0, 2 * hK) / (2 * hK), cm = intK(i, -2 * hK, 0) / (2 * hK);
    return Math.min(C.vCorner3(kp, (cp - cm) / (2 * hK), (cp - 2 * c + cm) / (hK * hK)), C.vtop); };
  const vm = (vv, i) => (vv[i] + vv[i + 1]) / 2;
  let R3 = 0;   // 모델 3: 조각 하나가 바뀌면 둘레 몇 칸의 한계가 바뀌나 (곡률 변화 창 2 × 다듬기 거리)
  const m = {
    L, K,
    full() {
      if (C.md3 && !R3) { let mn = Infinity; for (let j = 0; j < M; j++) if (L[j] > 1e-6) mn = Math.min(mn, L[j]); R3 = Math.ceil(2 * C.ksT / Math.max(0.05, mn)) + 1; }
      if (flying) { let b = 0, bv = Infinity; st = 0; for (let i = 0; i < M; i++) { const x = limAt(i); if (x < bv) { bv = x; b = i; } } st = b; v0 = bv; }
      for (let i = 0; i < N; i++) lim[i] = limAt(i);
      vf[0] = Math.min(lim[0], v0); let a = 0;
      for (let i = 0; i < N - 1; i++) { a = C.aDrive(vf[i], kAt(i), a, V, C.Tinit); af[i] = a; vf[i + 1] = Math.min(lim[i + 1], Math.sqrt(Math.max(0, vf[i] * vf[i] + 2 * a * lAt(i)))); }
      v[N - 1] = flying ? Math.min(vf[N - 1], v0) : vf[N - 1];
      for (let i = N - 2; i >= 0; i--) { const b = C.aBrake(v[i + 1], kAt(i)); v[i] = Math.min(vf[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * b * lAt(i))); }
      T = 0; for (let i = 0; i < M; i++) { const u = vm(v, i); T += u > 0 ? lAt(i) / u : 0; }
      return T;
    },
    get T() { return T; },
    // 조각 js 를 새 [길이, 곡률] (nl, nk) 로 바꾸면 랩타임이 얼마? (받아들이면 apply)
    trial(js, nl, nk) {
      const oL = js.map(j => L[j]), oK = js.map(j => K[j]);
      js.forEach((j, q) => { L[j] = nl[q]; K[j] = nk[q]; });
      S.lim.set(lim); S.vf.set(vf); S.af.set(af); S.v.set(v);
      const cell = j => (j - st + M) % M;
      let lo = N, hi = -1;
      for (const j of js) { const i = cell(j); for (let k = i - R3; k <= i + 1 + R3; k++) { if (k < 0 || k > N - 1) continue; S.lim[k] = limAt(k); lo = Math.min(lo, k); hi = Math.max(hi, k); }
        if (flying && i === 0) { S.lim[N - 1] = limAt(N - 1); hi = N - 1; } if (flying && i === M - 1) { S.lim[0] = limAt(0); lo = 0; } }
      // 앞으로 (가속): lo − 1 부터, hi 를 지나 예전 값과 같아지면 멈춤
      let i = Math.max(0, lo - 1), fEnd = hi, a = i > 0 ? S.af[i - 1] : 0;
      if (lo === 0) S.vf[0] = Math.min(S.lim[0], v0);
      for (; i < N - 1; i++) {
        a = C.aDrive(S.vf[i], kAt(i), a, V, C.Tinit); S.af[i] = a;
        const nv = Math.min(S.lim[i + 1], Math.sqrt(Math.max(0, S.vf[i] * S.vf[i] + 2 * a * lAt(i))));
        // 예전과 같아지면 멈춤 (가속도 a 는 다음 칸 반복 계산의 첫 값으로만 쓰여 아주 작은 차이는 무시)
        if (i + 1 > hi && Math.abs(nv - vf[i + 1]) <= 1e-12 * (1 + nv) && Math.abs(a - af[i]) <= 1e-7) { S.vf[i + 1] = vf[i + 1]; S.af[i] = af[i]; fEnd = i + 1; break; }
        S.vf[i + 1] = nv; fEnd = i + 1;
      }
      // 뒤로 (제동): fEnd 부터, lo 앞에서 예전 값과 같아지면 멈춤
      if (fEnd >= N - 1) S.v[N - 1] = flying ? Math.min(S.vf[N - 1], v0) : S.vf[N - 1];
      let k = Math.min(N - 2, fEnd), bLo = 0;
      for (; k >= 0; k--) { const b = C.aBrake(S.v[k + 1], kAt(k)), nv = Math.min(S.vf[k], Math.sqrt(S.v[k + 1] * S.v[k + 1] + 2 * b * lAt(k)));
        if (k < lo - 1 && nv === v[k]) { S.v[k] = nv; bLo = k; break; } S.v[k] = nv; bLo = k; }
      // 시간 차이: 속도가 바뀐 칸 [bLo, fEnd) + 길이만 바뀐 칸 (예전 시간은 예전 길이로)
      const oLen = new Map(); js.forEach((j, q) => oLen.set(j, oL[q]));
      const cells = new Set(); for (let q = bLo; q < Math.min(M, fEnd + 1); q++) cells.add(q); js.forEach(j => cells.add(cell(j)));
      let d = 0;
      cells.forEach(q => { const j = pc(q), un = vm(S.v, q), uo = vm(v, q); d += (un > 0 ? L[j] / un : 0) - (uo > 0 ? (oLen.has(j) ? oLen.get(j) : L[j]) / uo : 0); });
      js.forEach((j, q) => { L[j] = oL[q]; K[j] = oK[q]; });   // 되돌려 둠
      return { T: T + d, apply: () => { js.forEach((j, q) => { L[j] = nl[q]; K[j] = nk[q]; }); lim.set(S.lim); vf.set(S.vf); af.set(S.af); v.set(S.v); T += d; } };
    },
  };
  return m;
}
function improveLine(RL, C, V, flying, prog) {
  const geo = RL.geo, n = geo.n, lo = geo.lo, hi = geo.hi, cyc = geo.cyc, h = geo.h, k0 = geo.k0, M = geo.M;
  let e = Float64Array.from(RL.eAll);
  // 조각 j 의 [길이, 곡률] (lineOut 과 같은 식)
  const W = i => ((i % n) + n) % n, hA = i => h[cyc ? ((i % M) + M) % M : Math.max(0, Math.min(M - 1, i))];
  const E = (x, i) => cyc ? x(W(i)) : x(Math.max(0, Math.min(n - 1, i)));   // x = 점 번호 → 옆 거리
  const D2 = (x, i) => { const hm = hA(i - 1), hp = hA(i), hn = (hm + hp) / 2; return ((E(x, i + 1) - E(x, i)) / hp - (E(x, i) - E(x, i - 1)) / hm) / hn; };
  const piece = (x, j) => { const em = (E(x, j) + E(x, j + 1)) / 2, de = (E(x, j + 1) - E(x, j)) / h[j];
    const dd = cyc ? (D2(x, j) + D2(x, j + 1)) / 2 : (j > 0 ? D2(x, j) : 0) / 2 + (j + 1 < n - 1 ? D2(x, j + 1) : 0) / 2;
    return [h[j] * (1 - k0[j] * em) * Math.sqrt(1 + de * de), (k0[j] + dd) / (1 - k0[j] * em)]; };
  const mdl = lapModel(C, M, V, flying);
  for (let j = 0; j < M; j++) { const [l, k] = piece(i => e[i], j); mdl.L[j] = l; mdl.K[j] = Math.abs(k) > 1e-5 ? k : 0; }
  // 점 곡률 (kn + e″) ÷ (1 − kn·e): 조각 곡률은 이웃 두 점 평균이라 한 점만 튀는 뾰족한 꺾임(경계 · 콘에 잘린 옮김)을 못 봄 → 점 곡률로 따로 막음
  const kA = i => k0[cyc ? ((i % M) + M) % M : Math.max(0, Math.min(M - 1, i))];
  const nodeK = (x, i) => { const hm = hA(i - 1), hp = hA(i), kn = (kA(i - 1) * hm + kA(i) * hp) / (hm + hp); return (kn + D2(x, i)) / (1 - kn * E(x, i)); };
  let kRef = 0; for (let j = 0; j < M; j++) kRef = Math.max(kRef, Math.abs(mdl.K[j]));
  const kLim = geo.kmax ? geo.kmax : 2 * kRef;   // 점 곡률 한계: 최소 회전 반경이 있으면 1/rmin, 없으면 처음 선의 가장 급한 곡률 × 2
  const t0 = mdl.full();
  let evals = 1;
  // 점 몇 개를 옮겨 보고 랩타임이 줄면 받아들임.  pts = [[점, 옮길 양]]
  const tryMove = pts => {
    const y = new Map(); pts.forEach(([i, d]) => { const v = Math.max(lo[i], Math.min(hi[i], e[i] + d)); if (v !== e[i]) y.set(i, v); });
    if (!y.size) return false;
    const js = new Set(); y.forEach((_, i) => { for (let j = i - 2; j <= i + 1; j++) { const q = cyc ? ((j % M) + M) % M : j; if (q >= 0 && q < M) js.add(q); } });
    const X = i => y.has(i) ? y.get(i) : e[i];
    const J = [...js], nl = [], nk = []; J.forEach(j => { const [l, k] = piece(X, j); nl.push(l); nk.push(Math.abs(k) > 1e-5 ? k : 0); });
    if (geo.bk) for (const i of y.keys()) { const [bL, bR] = geo.bk(nodeK(X, i)), v = X(i);   // 옮긴 점의 새 곡률에서 차 여유로 경계 확인
      if ((v > geo.wlN[i] - bL + 1e-9 && v > e[i]) || (v < -(geo.wrN[i] - bR) - 1e-9 && v < e[i])) return false; }
    for (const i of y.keys()) for (let d = -1; d <= 1; d++) { const p = cyc ? W(i + d) : i + d; if (!cyc && (p <= 0 || p >= n - 1)) continue;
      const kNew = Math.abs(nodeK(X, p)); if (kNew > kLim * (1 + 1e-6) && kNew > Math.abs(nodeK(i => e[i], p)) + 1e-12) return false; }   // 뾰족한 꺾임을 만드는 옮김은 버림
    if (geo.kmax) for (let q = 0; q < J.length; q++) { const ko = Math.abs(mdl.K[J[q]]), kn = Math.abs(nk[q]);
      if (kn > geo.kmax * (1 + 1e-6) && kn > ko + 1e-12) return false; }   // 최소 회전 반경보다 급하게 만드는 옮김은 버림
    const r = mdl.trial(J, nl, nk); evals++;
    if (r.T < mdl.T - 1e-5) { r.apply(); y.forEach((v, i) => { e[i] = v; }); return true; }
    return false;
  };
  // ① 코스 전체를 옮기는 모양 (한쪽으로 · 물결 k = 1 ~ 4)
  const shapes = [i => 1];
  for (let k = 1; k <= 4; k++) for (const ph of [0, Math.PI / 2]) shapes.push(i => cyc ? Math.cos(2 * Math.PI * k * i / n + ph) : Math.sin(Math.PI * k * i / (n - 1) + ph));
  const all = Array.from({ length: n }, (_, i) => i);
  for (const a of [0.2, 0.05]) for (const f of shapes) for (const sg of [1, -1]) { let m = 0; while (m++ < 40 && tryMove(all.map(i => [i, sg * a * f(i)]))); }
  // ② 3 m 간격 종 모양 (폭 3 m)
  const SP = 3, WID = 3, cs = []; for (let c = 0; c < n; c += SP) cs.push(c);
  const bump = (c, a) => { const r = []; for (let d = -4 * WID; d <= 4 * WID; d++) { let i = c + d; if (cyc) i = W(i); else if (i < 0 || i >= n) continue; r.push([i, a * Math.exp(-0.5 * (d / WID) ** 2)]); } return r; };
  const amps = [0.2, 0.1, 0.05, 0.025];
  amps.forEach((a, ai) => {
    let live = cs.map((_, j) => j);
    for (let pass = 0; pass < 4 && live.length; pass++) {
      const t1 = mdl.T, hit = [];
      for (const j of live) for (const sg of [1, -1]) if (tryMove(bump(cs[j], sg * a))) { hit.push(j); break; }
      if (prog) prog((ai + (pass + 1) / 4) / amps.length);
      if (t1 - mdl.T < 0.002) break;
      const nx = new Set(); hit.forEach(j => { for (let d = -3; d <= 3; d++) nx.add(((j + d) % cs.length + cs.length) % cs.length); });   // 받아들인 곳 둘레만 다시
      live = [...nx].sort((p, q) => p - q);
    }
  });
  const res = lineOut(e, geo);
  res.gain = t0 - mdl.T; res.evals = evals; res.ctight = RL.ctight || 0;
  return res;
}

// 진행 막대 (작업창 Worker 안에서만): 주행선 다듬기가 [0, PG0), 나머지 계산이 [PG0, 1]
let PG0 = 0;
const prog = (f, msg) => { if (typeof wbProg === 'function') wbProg(f, msg); };
let RLI = {}, RLI_LAST = {};   // 다듬은 주행선: 이번 계산 (코스별) · 마지막 전체 계산 (입력 훑기용)
const rlKey = I => JSON.stringify(I, (k, v) => ['course', 'lap', 'grMode', '_sweep', '_probe'].includes(k) ? undefined : v);
// 이번 입력으로 내구 · 오토크로스 · 내 코스 주행선을 다듬어 둠 (차량 · 감속비 = 입력 감속비, 같은 입력이면 다시 안 함)
function prepLines(I, sweep) {
  RLI = {}; PG0 = 0;
  if (!(I.rl_on >= 2)) return;
  if (sweep) { RLI = RLI_LAST; return; }            // 입력 훑기: 지금 입력으로 다듬은 선을 그대로 (훑는 값마다 다시 다듬지 않음)
  const key = rlKey(I);
  if (RLI_LAST.key === key) { RLI = RLI_LAST; return; }
  const C = car(I, I.gr, 1), V = C.Voc(1), E = I.end || {}, F = freeSegs({ ...I, rl_on: 1 });
  const jobs = [];
  if ((E.seg || []).length) jobs.push(['end', '내구', () => drivenSegs({ ...I, rl_on: 1 }, 'end', E.seg, true), true],
                                      ['ax', '오토크로스', () => drivenSegs({ ...I, rl_on: 1 }, 'ax', reverse(E.seg), true), false]);
  if (F && F.rl && F.rl.eN) jobs.push(['free', '내 코스', () => F.rl, F.m > 1]);
  const out = { key };
  jobs.forEach(([w, name, base, fly], k) => {
    const pg = typeof wbProg === 'function' ? f => wbProg((k + f) / (jobs.length + 1), \`주행선 다듬는 중 · \${name}\`) : null;
    if (pg) pg(0);
    out[w] = improveLine(base(), C, V, fly, pg);
  });
  PG0 = jobs.length / (jobs.length + 1);
  RLI = RLI_LAST = out;
}

// 코스 구간 → 실제로 달리는 구간 (I.rl_on = 1 이면 최소 곡률 주행선, 2 면 그것을 랩타임으로 다듬은 선, 0 이면 가운데 선)
function drivenSegs(I, which, segs, closed, fx) {
  if (!(I.rl_on > 0) || !segs.length) return { segs, e: null, len: sum(segs.map(r => r[0])) };
  if (I.rl_on >= 2 && RLI[which]) return RLI[which];
  const E = I.end || {}, b = rlB(I);
  if (which === 'end' || which === 'ax') {
    const N = segs.length, wl = E.WL || [], wr = E.WR || [], rev = which === 'ax';
    const W = (arr, i) => arr.length ? (arr[i] + arr[(i + 1) % arr.length]) / 2 : 1.75;
    const o = { closed: true, b, bk: bodyBk(I), kmax: rkMax(I), key: \`\${which}|\${b}|\${bodyKey(I)}|\${rkMax(I)}|\${JSON.stringify(segs)}|\${JSON.stringify(E.slalom || [])}|\${JSON.stringify(E.slat || [])}|\${JSON.stringify(E.sds || [])}|\${JSON.stringify(wl)}|\${JSON.stringify(wr)}\`,
      wl: i => rev ? W(wr, N - 1 - i) : W(wl, i), wr: i => rev ? W(wl, N - 1 - i) : W(wr, i),
      cones: (E.slalom || []).map(j => rev ? (N - j) % N : j),
      coneLat: new Map((E.slalom || []).map((j, q) => [rev ? (N - j) % N : j, (rev ? -1 : 1) * ((E.slat || [])[q] || 0)])),
      coneDs: new Map((E.slalom || []).map((j, q) => [rev ? (N - j) % N : j, (rev ? -1 : 1) * ((E.sds || [])[q] || 0)])) };   // 콘이 점에서 앞뒤로 떨어진 거리 (거꾸로면 부호 반대)   // 슬라럼 콘의 옆 거리 (가운데 선에서, 거꾸로면 부호 반대)   // 거꾸로 달리면 왼쪽 · 오른쪽 폭이 바뀌고, 점 j = 거꾸로 구간 N − j 의 시작
    return racingLine(segs, o);
  }
  // 내 코스: 구간마다 폭 (fx 없으면 [내 코스 폭] 을 양쪽 같게) · 슬라럼 콘 묶음
  const w = FREE_W, X = fx || { wl: [], wr: [], groups: [] };
  return racingLine(segs, { closed, b, bk: bodyBk(I), kmax: rkMax(I), wl: i => X.wl[i] != null ? X.wl[i] : w, wr: i => X.wr[i] != null ? X.wr[i] : w, groups: X.groups,
                            key: \`free|\${b}|\${bodyKey(I)}|\${rkMax(I)}|\${w}|\${closed}|\${JSON.stringify(segs)}|\${JSON.stringify(X)}\` });
}


// 곡률 변화 (모델 3): 칸 곡률 k[i] (i → i+1, 구간마다 일정) 를 앞뒤 h = ks/2 로 고른 κ_s, κ' = (κ_s(s+h) − κ_s(s−h)) ÷ 2h, κ'' = (κ_s(s+h) − 2κ_s + κ_s(s−h)) ÷ h²  (적분으로 정확히, 칸 크기와 상관없음)
function kDer(G, ks) {
  if (G._kd && G._kd.ks === ks) return G._kd;
  const N = G.s.length, Kc = new Float64Array(N); for (let i = 0; i < N - 1; i++) Kc[i + 1] = Kc[i] + G.k[i] * (G.s[i + 1] - G.s[i]);
  const S0 = G.s[0], S1 = G.s[N - 1], kA = G.k[0] || 0, kB = G.k[N - 2] || 0;
  let ip = 0;
  const KcAt = x => { if (x <= S0) return (x - S0) * kA; if (x >= S1) return Kc[N - 1] + (x - S1) * kB;
    if (G.s[ip] > x) { let lo = 0, hi = ip; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (G.s[md] <= x) lo = md; else hi = md; } ip = lo; }
    while (ip < N - 2 && G.s[ip + 1] <= x) ip++; return Kc[ip] + (x - G.s[ip]) * G.k[ip]; };
  const h = ks / 2, avg = x => (KcAt(x + h) - KcAt(x - h)) / (2 * h);
  const k1 = new Float64Array(N), k2 = new Float64Array(N), k0 = new Float64Array(N);
  for (let i = 0; i < N; i++) { const x = G.s[i], cm = avg(x - h), c = avg(x), cp = avg(x + h); k0[i] = c; k1[i] = (cp - cm) / (2 * h); k2[i] = (cp - 2 * c + cm) / (h * h); }
  return (G._kd = { ks, k0, k1, k2 });
}

// ================================================================ 주행
// 차속 [m/s]: 코너 한계 → 앞으로 가속 (정지 출발) → 뒤에서 제동.  V0[i] = 칸마다 개방 전압 [V], TM[i] = 모터 온도 [°C]
//   현실 운전자 (dr_real 1) 조작 한계 (고정값): 핸들 속도 HWR (핸들 360° 를 0.4 s), 페달 신호 0 → 100 % PEDT (양발 — 가속 · 제동 페달 따로, 전환 시간 없음)
//     조향: 핸들 각 h(s) 의 시간 변화 |dh/dt| = v |dh/ds| ≤ HWR → v ≤ 상한 (steerCap).  가속: 신호가 PEDT 동안 0 → 1 로 오름 (정지 출발 · 코너 탈출),
//     제동: 가속 신호가 내려가는 동안 제동 신호가 0 → 1 로 오름 → 제동 시작점이 그만큼 앞으로 (brakeRamp)
const HWR = 900, PEDT = 0.2;   // [°/s] · [s]
function speed(C, G, V0, TM, TI) {
  const N = G.s.length, v = new Array(N), lim = new Array(N), dts = new Float64Array(N).fill(NaN);
  const D3 = C.md3 ? kDer(G, C.ksT) : null;   // 모델 3: 점마다 곡률 변화 κ' · κ''
  const SC = C.drv ? steerCap(C, G) : null;   // 현실 운전자: 핸들 속도 상한
  for (let i = 0; i < N; i++) {
    const a = G.k[i - 1] || 0, b = G.k[i] || 0, kp = Math.abs(a) > Math.abs(b) ? a : b;
    lim[i] = Math.min(D3 ? C.vCorner3(kp, D3.k1[i], D3.k2[i]) : C.vCorner(Math.abs(kp)), C.vtop, G.vcap ? G.vcap[i] : Infinity, SC ? SC[i] : Infinity);   // vcap = 모델 3 과도 상한 (속도 변화 몫)
  }
  v[0] = 0;
  let a = 0, ut = 0;
  const uT = new Float64Array(N);                        // 칸 시작의 가속 신호 (현실 운전자)
  for (let i = 0; i < N - 1; i++) {                       // 앞으로: 가속
    const ds = G.s[i + 1] - G.s[i];
    a = C.aDrive(v[i], G.k[i], a, V0[i], TM ? TM[i] : C.Tinit, TI ? TI[i] : C.TH0.i); uT[i] = ut;
    if (!C.drv || ut >= 1) { v[i + 1] = Math.min(lim[i + 1], Math.sqrt(Math.max(0, v[i] * v[i] + 2 * a * ds))); if (C.drv && v[i + 1] < Math.sqrt(Math.max(0, v[i] * v[i] + 2 * a * ds)) - 1e-9) ut = pedalNeed(C, v[i], v[i + 1], ds, a); continue; }
    const ar = -C.Fres(v[i]) / C.meff, R = pedalRun(v[i], ut, -1, [ar, a, 0], ds);   // 신호를 올리며 이 칸을 감
    if (R.v > lim[i + 1]) { v[i + 1] = lim[i + 1]; ut = pedalNeed(C, v[i], v[i + 1], ds, a); }
    else { v[i + 1] = R.v; ut = R.ut; dts[i] = R.t; }
  }
  uT[N - 1] = ut;
  const vf = C.drv ? v.slice() : null;
  for (let i = N - 2; i >= 0; i--) {                      // 뒤로: 제동
    const b = C.aBrake(v[i + 1], G.k[i]);
    const vb = Math.sqrt(v[i + 1] * v[i + 1] + 2 * b * (G.s[i + 1] - G.s[i]));
    if (vb < v[i]) { v[i] = vb; dts[i] = NaN; if (i > 0) dts[i - 1] = NaN; }
  }
  if (C.drv) brakeRamp(C, G, v, vf, uT, dts, V0, TM, TI);   // 현실 운전자: 제동 신호를 PEDT 동안 올림 → 제동 시작이 앞으로
  if (C.lam > 0) coastLift(C, G, v, V0, TM, TI);          // 타력 운전자: 제동 앞에서 페달을 뗌
  v.dt = dts;                                             // 신호가 오르는 칸은 시간 적분으로 구한 칸 시간 (walk 가 씀)
  return { v, lim };
}
// 페달 신호를 PEDT 에 걸쳐 바꾸며 거리 ds 를 감 (시간으로 적분, 칸 안에서 가속 · 제동 능력은 일정):
//   가속도 = a_r + u_t (a_d − a_r) − u_b (d_b + a_r)  (a_r = 주행 저항만의 가속도 ≤ 0, a_d = 최대 구동 가속도, d_b = 최대 제동 감속도 > 0),
//   u_t 는 dir 쪽으로 (+1 오름 · −1 내림) 1 ÷ PEDT 속도, u_b 는 ub0 에서 1 까지 오름 (ub0 < 0 이면 제동 안 함)
//   돌려줌: 끝 속도 v, 걸린 시간 t, 끝 신호 ut · ub
function pedalRun(v0, ut0, ub0, A, ds) {
  const [ar, ad, db] = A, r = 1 / PEDT;
  let v = v0, x = 0, t = 0, ut = ut0, ub = ub0;
  const acc = (u, w) => ar + u * (ad - ar) - (w > 0 ? w * (db + ar) : 0);
  for (let it = 0; it < 4000 && x < ds - 1e-12; it++) {
    const tu = ub0 >= 0 ? Math.max(ut, 1 - Math.max(0, ub)) / r : (1 - ut) / r;            // 신호가 다 바뀌기까지 남은 시간
    if (tu <= 1e-12) { const a = acc(ub0 >= 0 ? 0 : 1, ub0 >= 0 ? 1 : 0), rem = ds - x, v2 = v * v + 2 * a * rem;   // 남은 칸은 일정 가속도
      if (v2 <= 0) { const tt = a < 0 ? v / -a : 0; return { v: 0, t: t + tt, ut: ub0 >= 0 ? 0 : 1, ub: ub0 >= 0 ? 1 : ub0, x: x + v * v / (2 * Math.max(1e-9, -a)) }; }
      const vn = Math.sqrt(v2); return { v: vn, t: t + (Math.abs(a) > 1e-12 ? (vn - v) / a : rem / Math.max(1e-9, v)), ut: ub0 >= 0 ? 0 : 1, ub: ub0 >= 0 ? 1 : ub0, x: ds }; }
    if (v <= 1e-9 && acc(ut, ub) <= 0 && ub0 < 0) { const h = Math.min(tu, PEDT / 50); t += h; ut = Math.min(1, ut + r * h); continue; }   // 정지: 구동이 저항을 넘을 때까지 그 자리 (뒤로 밀리지 않음)
    const h = Math.min(tu, PEDT / 50), a0 = acc(ut, ub), j = (acc(ub0 >= 0 ? Math.max(0, ut - r * h) : Math.min(1, ut + r * h), ub0 >= 0 ? Math.min(1, ub + r * h) : ub) - a0) / h;   // 이 작은 칸 동안 가속도는 시간에 직선 (저크 j)
    const X = q => v * q + a0 * q * q / 2 + j * q * q * q / 6, V = q => v + a0 * q + j * q * q / 2;
    let q = h; if (x + X(h) >= ds) { let lo = 0, hi = h; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (x + X(m) < ds) lo = m; else hi = m; } q = hi; }
    if (V(q) < 0) { let lo = 0, hi = q; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (V(m) > 0) lo = m; else hi = m; } return { v: 0, t: t + lo, ut, ub, x: x + X(lo) }; }   // 섬
    x += X(q); v = V(q); t += q;
    if (ub0 >= 0) { ut = Math.max(0, ut - r * q); ub = Math.min(1, ub + r * q); } else ut = Math.min(1, ut + r * q);
  }
  return { v, t, ut, ub, x };
}
// 코너 한계 등으로 막힌 칸: 그 속도를 내는 데 쓴 가속 신호 몫 (0 ~ 1) — 그 뒤로는 여기서부터 다시 오름
function pedalNeed(C, v0, v1, ds, ad) { const ar = -C.Fres(v0) / C.meff, aq = (v1 * v1 - v0 * v0) / (2 * ds); return ad - ar > 1e-9 ? Math.max(0, Math.min(1, (aq - ar) / (ad - ar))) : 1; }
// 제동 구간마다 (뒤 → 앞 제동이 앞 → 뒤 가속 곡선을 낮춘 곳) 시작점 s_on 을 앞당김: s_on 에서 가속 신호는 내려가고 제동 신호는 0 → 1 (PEDT),
//   다 오른 점의 속도가 제동 한계 곡선 이하가 되는 가장 늦은 s_on (이분법). 그 뒤는 원래 제동 곡선 (최대 제동끼리는 아래 곡선이 계속 아래)
function brakeRamp(C, G, v, vf, uT, dts, V0, TM, TI) {
  const N = v.length, inZ = i => v[i] < vf[i] - 1e-9;
  let i = 1, prevEnd = 0;
  while (i < N) {
    if (!inZ(i)) { i++; continue; }
    let i1 = i; while (i1 + 1 < N && inZ(i1 + 1)) i1++;
    const j0 = i - 1;                                     // 제동 없이 온 마지막 점 (원래 제동은 j0 ~ i 사이에서 시작)
    if (j0 < prevEnd || (prevEnd > 0 && j0 === prevEnd)) { prevEnd = i1; i = i1 + 1; continue; }   // 앞 제동 구간에 바로 이어짐 → 제동 신호가 이미 올라 있음
    const sim = (sOn, rec) => {                            // sOn 에서 시작해 신호가 다 바뀔 때까지 앞으로. 끝 점 (속도 − 제동 곡선) 과 지나간 점 속도
      let k = prevEnd; while (k < i - 1 && G.s[k + 1] <= sOn) k++;
      const f = (sOn - G.s[k]) / Math.max(1e-9, G.s[k + 1] - G.s[k]), vs = Math.sqrt(Math.max(0, vf[k] ** 2 + (vf[k + 1] ** 2 - vf[k] ** 2) * f));
      let x = sOn, vv = vs, ut = uT[k], ub = 0, out = [], T = 0;
      for (let q = k; q < N - 1; q++) {
        const s1 = G.s[q + 1], ds = s1 - x; if (ds <= 1e-12) continue;
        const ar = -C.Fres(vv) / C.meff, ad = Math.max(ar, C.aDrive(vv, G.k[q], 0, V0[q], TM ? TM[q] : C.Tinit, TI ? TI[q] : C.TH0.i)), db = C.aBrake(vv, G.k[q]);
        const R = pedalRun(vv, ut, ub, [ar, ad, db], ds);
        T += R.t; vv = R.v; ut = R.ut; ub = R.ub; x = s1;
        if (rec) out.push([q + 1, vv, x - (G.s[q + 1] - G.s[q]) >= sOn - 1e-9 ? R.t : NaN]);
        if (ub >= 1 || vv <= 0) return { d: vv - v[q + 1], out, q: q + 1 };
      }
      return { d: -1, out, q: N - 1 };
    };
    let lo = G.s[prevEnd], hi = G.s[i];
    if (sim(hi).d > 0) { if (sim(lo).d > 0) hi = lo; else for (let it = 0; it < 50; it++) { const m = (lo + hi) / 2; if (sim(m).d > 0) hi = m; else lo = m; } hi = Math.min(hi, lo); }
    const R = sim(hi, true);
    if (R.out.every(o => o[1] > 0)) R.out.forEach(([q, vv, t]) => { if (vv < v[q]) { v[q] = vv; dts[q - 1] = t; } else dts[q - 1] = NaN; });   // 멈춤까지 가는 시작점 (앞 제동과 겹침 등) 은 쓰지 않음
    for (let q = R.q; q < i1 && q < N - 1; q++) dts[q] = NaN;
    prevEnd = i1; i = i1 + 1;
  }
}
// 현실 운전자: 핸들 속도 상한 [m/s] (점마다). 핸들 각 h = h_기하(κ) + 조향비 × K_us × a_y ÷ g (모델 2 이상, 선형 언더스티어 구배 K_us [°/g]),
//   곡률은 다듬기 거리 (과도 다듬기 tr_ks) 로 고른 κ · κ' (kDer) →  v |κ'| (h'(κ) + 조향비 K_us v² ÷ g) ≤ HWR 를 v 에 대해 풂
function steerCap(C, G) {
  const D = kDer(G, C.ksT), N = G.s.length, out = new Array(N).fill(Infinity), B = C.md2 ? C.sr * C.kUs / g : 0;
  for (let i = 0; i < N; i++) { const kk = Math.abs(D.k0[i]), k1 = Math.abs(D.k1[i]); if (k1 < 1e-9) continue;
    const A = C.SG.hp(kk), f = u => u * k1 * Math.abs(A + (B > 0 ? B * u * u : 0)) - HWR;
    if (f(150) <= 0) continue; let lo = 0, hi = 150; for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (f(m) <= 0) lo = m; else hi = m; } out[i] = lo; }
  return out;
}

// ================================================================ 타력 운전자 (drv 1)
// 에너지 한도가 있는 최소 시간: 시간 + λ × 소비 에너지 를 최소로 (Pontryagin 최소 원리 → 최대 구동 · 타력 · 최대 제동).  λ [s/J] 는 내구 소비가 한도와 같아지게 (coastCut)
// 제동 구간마다 (가속이 끝나는 꼭대기 앞) 페달을 떼는 점 s_L 을 고름: 그 뒤는 구동 0 (구름 · 항력만으로 감속, dv²/ds = −2 F_res ÷ m_eff) → 원래 제동 곡선과 만나면 제동.
// 칸 안의 어느 점에서나 뗄 수 있음 (칸 끝 속도를 그 점부터 타력으로 셈) → λ 에 대해 연속.  구간마다 따로 고름 (모든 구간 같은 λ = 최적 조건)
function coastLift(C, G, v, V0, TM, TI) {
  const N = v.length, lam = C.lam, cost = new Array(N - 1);
  const cellE = (i, a, b) => { const ds = G.s[i + 1] - G.s[i], vm = Math.max(0.1, (a + b) / 2), ax = (b * b - a * a) / (2 * ds), F = C.meff * ax + C.Fres(vm);
    const E = C.elec(F, vm, V0[i], 1, ax, TM ? TM[i] : C.Tinit, TI ? TI[i] : C.TH0.i); return ds / vm + lam * V0[i] * E.I * ds / vm; };   // 시간 + λ × 소비 [s]
  for (let i = 0; i < N - 1; i++) cost[i] = cellE(i, v[i], v[i + 1]);
  // 타력 곡선: 칸 j 의 점 x (0 ~ 1) 에서 떼면 → {w: 바뀐 속도 (j+1 부터), d: 비용 변화}.  타력 칸은 구동 0 → 시간만 (에너지 0)
  const tryLift = (j, x) => {
    const ds0 = G.s[j + 1] - G.s[j], vL2 = v[j] * v[j] + (v[j + 1] * v[j + 1] - v[j] * v[j]) * x, w = [];
    let u2 = vL2 - 2 * C.Fres(Math.sqrt(Math.max(0, vL2))) / C.meff * ds0 * (1 - x);
    if (!(u2 < v[j + 1] * v[j + 1]) || u2 <= 0.25) return { w, d: 0 };
    let u = Math.sqrt(u2), d = cellE(j, v[j], u) - cost[j], k = j + 1;   // 떼는 칸: 앞쪽 가속 + 뒤쪽 타력 (칸 전체를 한 번에)
    w.push(u);
    while (k < N - 1) {
      const ds = G.s[k + 1] - G.s[k], n2 = u * u - 2 * C.Fres(u) / C.meff * ds;
      if (n2 >= v[k + 1] * v[k + 1]) { d += cellE(k, u, v[k + 1]) - cost[k]; return { w, d }; }   // 원래 제동 곡선과 만남
      if (n2 <= 0.25) return { w: [], d: Infinity };                  // 멈춰 버림 → 쓰지 않음
      const un = Math.sqrt(n2); d += 2 * ds / (u + un) - cost[k]; u = un; w.push(u); k++;
    }
    return { w, d };
  };
  let i = 1;
  while (i < N - 1) {
    if (!(v[i] > v[i - 1] && v[i] > v[i + 1])) { i++; continue; }    // 꼭대기 i (가속 → 제동)
    let a0 = i; while (a0 > 0 && v[a0] > v[a0 - 1]) a0--;              // 가속 시작
    const j0 = Math.max(a0, i - 600), st = Math.max(1, Math.floor((i - j0) / 24));   // 성기게 훑고 (약 24 점) 가장 좋은 곳 둘레를 황금 분할 (칸 안의 점까지)
    let best = { d: 0, j: -1, w: null };
    for (let j = j0; j < i; j += st) { const R = tryLift(j, 0); if (R.d < best.d) best = { d: R.d, j, w: R.w }; }
    if (best.j >= 0) {
      let lo = Math.max(j0, best.j - st), hi = Math.min(i, best.j + st);   // 위치 p = 칸 번호 + x
      const f = p => { const j = Math.min(i - 1, Math.floor(p)); return tryLift(j, p - j); };
      for (let it = 0; it < 24; it++) { const p1 = lo + (hi - lo) * 0.382, p2 = lo + (hi - lo) * 0.618; if (f(p1).d < f(p2).d) hi = p2; else lo = p1; }
      const p = (lo + hi) / 2, Rb = f(p); if (Rb.d < best.d) best = { d: Rb.d, j: Math.min(i - 1, Math.floor(p)), w: Rb.w };
      for (let q = 0; q < best.w.length; q++) v[best.j + 1 + q] = best.w[q];
      const e = best.j + 1 + best.w.length; for (let q = best.j; q < Math.min(N - 1, e + 1); q++) cost[q] = cellE(q, v[q], v[q + 1]);
      i = e + 1;
    } else i++;
  }
}

// 차속 → 누적 시간 [s] · 단자 에너지 et [J] · 소비 에너지 ec [J] (저항 손실 포함) · 모터 온도 tm [°C] (출발 T0).  rec 이면 그래프 신호도
//   T0 = 출발 온도 {m, w, b} (모터 · 냉각수 · 축전지, 숫자면 모터만) [°C]
const th0 = (C, T0) => T0 == null ? { ...C.TH0 } : typeof T0 === 'number' ? { ...C.TH0, m: T0 } : { ...T0 };
function walk(C, G, v, V0, rec, T0) {
  const t0 = th0(C, T0), N = v.length, tc = [0], et = [0], ec = [0], tm = [t0.m], ti = [t0.i], tw = [t0.w], tb = [t0.b], tx = [t0.x];
  let qm = 0, qi = 0, qb = 0, tq = 0, er = 0;   // 손실 · 발열 시간 적분 [J] (도구 9 냉각 계통 계산기에 넘길 평균 발열), 그 시간 [s]
  const S = rec ? { pw: [], ax: [], ay: [], rpm: [], tq: [], tlim: [], pbat: [], vbat: [], voc: [], eta: [], tmot: [], grip: [],
                    roll: [], tcool: [], tbat: [], tinv: [], fz_fl: [], fz_fr: [], fz_rl: [], fz_rr: [], af: [], ar: [], beta: [], sw: [], dw: [], sat: [], dst: [] } : null;
  let vmin = Infinity;
  for (let i = 0; i < N - 1; i++) {
    const ds = G.s[i + 1] - G.s[i], vm = (v[i] + v[i + 1]) / 2, dt = v.dt && Number.isFinite(v.dt[i]) ? v.dt[i] : vm > 0 ? ds / vm : Infinity;   // 페달 신호가 바뀌는 칸은 speed 가 적분한 시간
    const ax = (v[i + 1] * v[i + 1] - v[i] * v[i]) / (2 * ds);   // 종가속도 [m/s²]
    const F = C.meff * ax + C.Fres(vm);                            // 바퀴 힘 [N] (제동 중 −)
    const sc = V0.soc ? V0.soc[i] : 1;                             // 그 칸 SOC (셀 표 내부저항용)
    const E = C.elec(F, vm, V0[i], C.rS(tb[i], sc), ax, tm[i], ti[i]);
    tc.push(tc[i] + dt);
    et.push(et[i] + E.P * dt);
    ec.push(ec[i] + V0[i] * E.I * dt);
    if (E.I < 0 && isFinite(dt)) er -= V0[i] * E.I * dt;          // 회생으로 셀에 돌려준 에너지 [J]
    const st = C.thStep({ m: tm[i], i: ti[i], w: tw[i], b: tb[i], x: tx[i] }, E.L, E.Li, E.I, vm, isFinite(dt) ? dt : 0, sc);   // 온도: 손실로 오르고 냉각으로 내림
    tm.push(st.m); ti.push(st.i); tw.push(st.w); tb.push(st.b); tx.push(st.x);
    if (isFinite(dt)) { qm += E.L * dt; qi += E.Li * dt; qb += E.I * E.I * C.Rb * C.rS(tb[i], sc) * dt; tq += dt; }
    if (E.V < vmin) vmin = E.V;
    if (rec) {
      const ays = vm * vm * G.k[i], ay = Math.abs(ays);           // 횡가속도 [m/s²] (왼쪽 선회 +, ISO 8855) · 크기
      const [fo, fi] = C.wheels(C.Fzf(vm, ax), C.dF(ay, true)), [ro, ri] = C.wheels(C.Fzr(vm, ax), C.dF(ay, false));
      const lft = ays > 0;                                         // 왼쪽 선회 → 오른쪽 바퀴가 바깥
      S.pw.push(F * vm / 1000);        // 바퀴 출력 [kW]
      S.ax.push(ax / g);               // [g]
      S.ay.push(ays / g);              // [g] (왼쪽 +)
      S.roll.push(C.rollAng(ays));     // 롤각 [°] (모델 단계 1, 왼쪽 선회 +)
      S.rpm.push(C.rpm(v[i]));         // [rpm]
      S.tq.push(E.T);                  // [N·m]
      S.tlim.push(C.Tcurve(C.rpm(v[i]), V0[i], tm[i], ti[i]));   // 그 순간 토크 한계 (디레이팅 포함) [N·m]
      S.tmot.push(C.thOn ? tm[i] : NaN);   // 모터 온도 [°C] (모터 열 켬)
      S.tcool.push(C.cwOn ? tw[i] : NaN);   // 냉각수 온도 [°C] (냉각수 계통 켬)
      S.tbat.push(C.btOn ? tb[i] : NaN);    // 축전지 온도 [°C] (축전지 온도 켬)
      S.tinv.push(C.inOn ? ti[i] : NaN);    // 인버터 온도 [°C] (인버터 온도 켬)
      S.voc.push(V0[i]);               // 개방 전압 [V] (구동력 선도 프로브용)
      S.pbat.push(E.P / 1000);         // 단자 출력 [kW]
      S.vbat.push(E.V);                // 단자 전압 [V]
      S.eta.push(E.P > 0 ? E.e * 100 : NaN);   // [%]
      S.grip.push(Math.hypot(C.m * ax, C.m * ay) / Math.max(1e-9, C.capF(vm, ax, ay) + C.capR(vm, ax, ay)) * 100);   // [%]
      S.fz_fl.push(lft ? fi : fo); S.fz_fr.push(lft ? fo : fi); S.fz_rl.push(lft ? ri : ro); S.fz_rr.push(lft ? ro : ri);   // 바퀴 하중 [N] 앞왼 · 앞오 · 뒤왼 · 뒤오
      if (C.md2) { const sg = ays >= 0 ? 1 : -1, K = Math.abs(G.k[i]), F = C.slipA(fo, fi, C.m * ay * C.fs), Rr = C.slipA(ro, ri, C.m * ay * (1 - C.fs));   // 모델 2: 슬립각 · β · 조향각
        const be = K * C.L * C.fs - Rr.a * Math.PI / 180, dl = K * C.L + (F.a - Rr.a) * Math.PI / 180;
        S.af.push(sg * F.a); S.ar.push(sg * Rr.a); S.beta.push(sg * be * 180 / Math.PI); S.dw.push(sg * dl * 180 / Math.PI); S.sw.push(sg * (C.SG.hOf(K) + (F.a - Rr.a) * C.sr)); /* 핸들 각 = 기하 (도구 6 표 또는 조향비 × 자전거 각) + 조향비 × 슬립각 차 */ S.sat.push(F.sat || Rr.sat ? 1 : 0); S.dst.push(C.vFlag(G.k[i])); }
      else { S.af.push(NaN); S.ar.push(NaN); S.beta.push(NaN); S.dw.push(NaN); S.sw.push(NaN); S.sat.push(0); S.dst.push(0); }
    }
  }
  if (rec) for (const k in S) S[k].push(S[k][S[k].length - 1]);
  return { tc, et, ec, tm, ti, tw, tb, tx, S, vmin, er, Q: { m: qm, i: qi, b: qb, t: tq }, T1: { m: tm.at(-1), i: ti.at(-1), w: tw.at(-1), b: tb.at(-1), x: tx.at(-1) } };
}

// 랩 m개를 이어서 정지 출발.  랩마다 SOC → 개방 전압, 칸마다 모터 온도 (두 번: 처음은 출발 값 그대로, 다음은 앞 계산으로 고침)
//   fixedV 를 주면 전압 고정 (SOC 계산 안 함, 줄여 셈).  T0 = 출발 모터 온도 [°C]
function laps(C, segs, m, ds, soc0, fixedV, T0) {
  const P = grid(segs, ds).s.length - 1, rep = [];
  for (let j = 0; j < m; j++) rep.push(...segs);
  const G = grid(rep, ds), N = G.s.length, t0 = th0(C, T0);
  { const T = TRC.get(segKey(segs)), B = bdAt(segs); if (T || B) G.vcap = G.s.map(x => Math.min(T ? T.at(x) : Infinity, B ? B(x) : Infinity)); }   // 모델 3 과도 · 모델 2 이상 차체가 경계에 닿지 않게 정한 속도 상한 (랩 위치마다)
  let V0 = new Array(N).fill(fixedV || C.Voc(soc0, t0.b)), TM = null, TI = null, sp, W, socs = [], soc1 = soc0;
  V0.soc = new Array(N).fill(fixedV ? 1 : soc0);
  const passes = fixedV && !C.drOn ? 1 : 2;              // 디레이팅이 있으면 온도를 반영해 한 번 더
  for (let pass = 0; pass < passes; pass++) {
    sp = speed(C, G, V0, TM, TI);
    W = walk(C, G, sp.v, V0, false, t0);
    if (C.drOn) { TM = W.tm; TI = W.ti; }
    if (fixedV) continue;
    socs = [];
    let soc = soc0;
    for (let j = 0; j < m; j++) { socs.push(soc); soc -= (W.ec[(j + 1) * P] - W.ec[j * P]) / C.EpackAt(W.tb[j * P]); }   // 랩 시작 축전지 온도의 용량
    soc1 = soc;
    const sP = G.s.map((_, i) => socs[Math.min(m - 1, Math.floor(i / P))]);
    V0 = G.s.map((_, i) => C.Voc(sP[i], W.tb[i])); V0.soc = sP;
  }
  const t = [], Et = [], Ec = [];                         // 랩별 시간 [s] · 단자 에너지 [J] · 소비 [J]
  for (let j = 0; j < m; j++) {
    t.push(W.tc[(j + 1) * P] - W.tc[j * P]);
    Et.push(W.et[(j + 1) * P] - W.et[j * P]);
    Ec.push(W.ec[(j + 1) * P] - W.ec[j * P]);
  }
  if (fixedV) soc1 = soc0 - Ec.reduce((a, b) => a + b, 0) / C.EpackAt(t0.b);
  return { G, v: sp.v, lim: sp.lim, V0, TM: W.tm, TI: W.ti, TW: W.tw, TB: W.tb, TX: W.tx, T0: t0, P, t, Et, Ec, socs, vmin: W.vmin, soc1, T1: W.T1, Q: W.Q, Er: W.er, len: G.s.at(-1) };
}

const sum = a => a.reduce((x, y) => x + y, 0);


// ================================================================ 차량 모델 3: 과도 — 주행선을 그대로 따라가는 데 드는 타이어 힘 (역동역학, 이상적인 운전자)
//   경로 곡률 κ(s) (다듬기 길이 tr_ks [m] 로 고르게), 준정적 차속 v(s) → 요레이트 r = v κ, 요 가속도 ṙ = dr/dt (차체 각도 변화율은 무시)
//   축 횡력 (요 관성 포함): F_f = (m a_y l_r + I_z ṙ) ÷ L,  F_r = (m a_y l_f − I_z ṙ) ÷ L   (l_f = 무게중심 → 앞축, l_r = 무게중심 → 뒤축, a_y = v² κ)
//   이완 길이 σ: 타이어 힘이 슬립각을 늦게 따라오므로 슬립각이 만들어야 하는 힘 F_ss = F + (σ ÷ v) dF/dt
//   한계: 축마다 마찰 타원 u = (F_x ÷ N_x)² + (F_ss ÷ N_y)² (준정적 종 방향 힘 · 모델 2 횡 한계),  모델 2 조향 (안쪽 바퀴 = 기하 + α_f − α_r, α = 같은 슬립각 축 곡선의 역)
//   과도 때문에 정상(ṙ = 0, dF/dt = 0) 보다 더 쓰게 되는 점 (u > max(1, u_정상)) 은 속도 상한 = v × (max(1, u_정상) ÷ u)^¼ × 0.995 (힘 ∝ v²) 로 낮추고 준정적을 다시 (되풀이)
//   닫힌 코스는 두 바퀴 (정지 출발 + 이어 달린 바퀴) 로 보고 상한은 랩 위치마다 작은 값
const TR_IT = 40, TR_TOL = 0.01;   // 과도 되풀이 최대 수 · 정상보다 1 % 넘게 더 쓸 때만 (미분 수치 오차 범위)
let TRC = new Map(), TRC_LAST = { key: '', m: new Map(), info: {} }, TRI = {};
const segKey = segs => { let h = 0, w = 0; for (let i = 0; i < segs.length; i++) { const [l, R] = segs[i]; h += l * (1 + i % 7) + (R || 0) * 1e-3 * (1 + i % 13); w += l; } return \`\${segs.length}|\${w.toFixed(6)}|\${h.toFixed(6)}\`; };
// 한 점: 차속 u · 종가속도 ax · 횡가속도 ay (부호 있음) · 축 횡력 F_f, F_r [N] 과 시간 미분 [N/s] → 슬립각이 만들어야 하는 힘 · 마찰 타원 사용 (과도 uT, 정상 uS)
function trPoint(C, sig, u, ax, ay, Ff, Fr, dFf, dFr) {
  const aY = Math.abs(ay), m = C.m, L = C.L, lf = L * (1 - C.fs), lr = L * C.fs;
  const Fsf = Ff + (sig > 0 ? sig / u * dFf : 0), Fsr = Fr + (sig > 0 ? sig / u * dFr : 0);
  const Nxf = C.capF(u, ax, aY), Nxr = C.capR(u, ax, aY), Nyf = C.capFy(u, ax, aY), Nyr = C.capRy(u, ax, aY);
  let Fxf = 0, Fxr = 0;
  if (ax >= 0) Fxr = C.meff * ax + C.Fres(u); else { const Fb = Math.max(0, -C.meff * ax - C.Fres(u)); Fxf = Fb * Nxf / Math.max(1e-9, Nxf + Nxr); Fxr = Fb - Fxf; }   // 제동은 축 한계 비율로 나눔
  const U = (Fx, Nx, Fy, Ny) => (Fx / Math.max(1e-9, Nx)) ** 2 + (Fy / Math.max(1e-9, Ny)) ** 2;
  return { Fsf, Fsr, uT: Math.max(U(Fxf, Nxf, Fsf, Nyf), U(Fxr, Nxr, Fsr, Nyr)), uS: Math.max(U(Fxf, Nxf, m * ay * lr / L, Nyf), U(Fxr, Nxr, m * ay * lf / L, Nyr)) };
}
function trCaps(I, C, segs, closed, V) {
  const ds = 0.5, P = grid(segs, ds), len = P.s.at(-1), NP = P.s.length, Dg = Math.PI / 180;
  const nl = closed ? 2 : 1, rep = []; for (let j = 0; j < nl; j++) rep.push(...segs);
  const G = grid(rep, ds), N = G.s.length, Bc = bdAt(segs), cap = P.s.map(x => Bc ? Bc(x) : Infinity);   // 차체 경계 상한에서 출발
  const sig = Math.max(0, I.tire_relax || 0), Iz = Math.max(0, Number.isFinite(I.izz) ? I.izz : 70), ks = I.tr_ks > 0 ? I.tr_ks : 2;
  const m = C.m, L = C.L, lf = L * (1 - C.fs), lr = L * C.fs;
  // 곡률을 점마다 (구간 k[i] 는 i → i+1) 고르게: 앞뒤 ks/2 이동 평균
  const k0 = G.s.map((_, i) => (G.k[Math.max(0, i - 1)] + G.k[Math.min(N - 2, i)]) / 2), W = Math.max(0, Math.round(ks / 2 / ds));
  const kS = k0.map((_, i) => { let a = 0, n = 0; for (let q = -W; q <= W; q++) { let j = i + q; if (closed) j = ((j % (N - 1)) + (N - 1)) % (N - 1); if (j < 0 || j >= N) continue; a += k0[j]; n++; } return a / n; });
  const lapJ = i => closed ? i % (NP - 1) : Math.min(i, NP - 1);
  const at = x => { x = closed ? ((x % len) + len) % len : Math.max(0, Math.min(len, x)); let lo = 0, hi = NP - 1; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (P.s[md] <= x) lo = md; else hi = md; } return Math.min(cap[lo], cap[hi]); };
  const lapT = v => { let t = 0; const i0 = closed ? NP - 1 : 0; for (let i = i0; i < N - 1; i++) t += (G.s[i + 1] - G.s[i]) / Math.max(1e-3, (v[i] + v[i + 1]) / 2); return t; };   // 닫힌 코스 = 두 번째 바퀴
  const V0 = new Array(N).fill(V);
  let it = 0, sp = null, t0 = NaN, qmax = 0, bad = 0;
  for (; it <= TR_IT; it++) {
    sp = speed(C, { s: G.s, k: G.k, vcap: G.s.map((x, i) => cap[lapJ(i)]) }, V0, null);
    const v = sp.v; if (it === 0) t0 = lapT(v);
    const T = [0]; for (let i = 0; i < N - 1; i++) T.push(T[i] + (G.s[i + 1] - G.s[i]) / Math.max(0.3, (v[i] + v[i + 1]) / 2));
    const r = v.map((u, i) => u * kS[i]), Wd = Math.max(1, W), d = (a, i) => { const p = Math.min(N - 1, i + Wd), q = Math.max(0, i - Wd); return (a[p] - a[q]) / Math.max(1e-6, T[p] - T[q]); };   // 시간 미분 (다듬기 길이 폭의 중심 차분)
    const ay = v.map((u, i) => u * u * kS[i]), rd = r.map((_, i) => d(r, i));
    const Ff = ay.map((a, i) => (m * a * lr + Iz * rd[i]) / L), Fr = ay.map((a, i) => (m * a * lf - Iz * rd[i]) / L);
    bad = 0; qmax = 0;
    for (let i = 0; i < N - 1; i++) {
      const u = Math.max(0.5, v[i]), axi = (v[i + 1] ** 2 - v[i] ** 2) / (2 * (G.s[i + 1] - G.s[i])), aY = Math.abs(ay[i]);
      const { uT, uS, Fsf, Fsr } = trPoint(C, sig, u, axi, ay[i], Ff[i], Fr[i], d(Ff, i), d(Fr, i));
      const lim = Math.max(1, uS);
      if (uS > 0.25) qmax = Math.max(qmax, Math.sqrt(uT / uS));
      let f = uT > lim * (1 + TR_TOL) ? Math.pow(lim / uT, 0.25) : 1;
      if (C.dmx > 0 && Math.abs(kS[i]) > 1e-9) {                                                                   // 조향: 과도 슬립각으로 안쪽 바퀴 각
        const sg = Math.sign(kS[i]), [fo, fi] = C.wheels(C.Fzf(u, axi), C.dF(aY, true)), [ro, ri] = C.wheels(C.Fzr(u, axi), C.dF(aY, false));
        const af = Math.sign(Fsf * sg) * C.slipA(fo, fi, Math.abs(Fsf)).a, ar = Math.sign(Fsr * sg) * C.slipA(ro, ri, Math.abs(Fsr)).a;
        if (C.dIn0(kS[i]) + af - ar > C.dmx + 1e-6) f = Math.min(f, 0.97);
      }
      if (f < 1) { bad++; const c = Math.max(0.5, u * f * 0.995); for (let q = -Wd; q <= Wd; q++) { const ii = i + q; if (ii < 0 || ii >= N) continue; const j = lapJ(ii); cap[j] = Math.min(cap[j], c); } }   // 이웃까지 같은 상한 (꺾임 줄임)
    }
    if (!bad) break;
  }
  let capd = 0; for (let j = 0; j < NP - 1; j++) if (cap[j] < (Bc ? Bc(P.s[j]) : Infinity)) capd += P.s[j + 1] - P.s[j];   // 과도로 (차체 상한보다 더) 낮춘 거리
  return { at, info: { it: Math.min(it, TR_IT), ok: bad ? 0 : 1, len: capd, q: (qmax - 1) * 100, dt: lapT(sp.v) - t0 } };
}
// 모델 3: 내구 · 오토크로스 · 내 코스의 과도 상한을 정해 둠 (입력 감속비 · 만충 전압, 같은 입력이면 다시 안 함). 가속 · 스키드패드는 조향이 바뀌지 않아 뺌
function prepTrans(I, sweep) {
  TRC = new Map(); TRI = {};
  if (I.md !== 3) return;
  if (sweep) { TRC = TRC_LAST.m; TRI = TRC_LAST.info; return; }
  const key = rlKey(I);
  if (TRC_LAST.key === key) { TRC = TRC_LAST.m; TRI = TRC_LAST.info; return; }
  const C = car(I, I.gr, 1), V = C.Voc(1), E = I.end || {}, jobs = [];
  if ((E.seg || []).length) jobs.push(['end', '내구', () => drivenSegs(I, 'end', E.seg, true).segs, true], ['ax', '오토크로스', () => drivenSegs(I, 'ax', reverse(E.seg), true).segs, false]);
  { const F = freeSegs(I); if (F && F.segs.length) jobs.push(['free', '내 코스', () => F.segs, F.m > 1]); }
  jobs.forEach(([w, name, segsF, closed], k) => { prog(PG0 + (1 - PG0) * 0.02 * k, \`과도 (요 관성 · 타이어 이완) 반영 중 · \${name}\`);
    const segs = segsF(), Cw = (w === 'end' || (w === 'free' && I.free && I.free.end === 1)) && I.dr_real === 1 ? car(endI(I), I.gr, 1) : C, R = trCaps(I, Cw, segs, closed, V); TRC.set(segKey(segs), R); TRI[w] = R.info; });
  TRC_LAST = { key, m: TRC, info: TRI };
}
// 모델 2 이상 · 최대 조향각이 있을 때: 아주 느려도 안쪽 바퀴 조향각이 최대를 넘는 코너가 있으면 계산을 멈춤 (다시 설계)
function steerCheck(I) {
  if (!(I.md >= 2) || I.dl_on === 0) return;
  const C = car(I, I.gr, 1), E = I.end || {}, list = [];
  if ((E.seg || []).length) list.push(['내구', drivenSegs(I, 'end', E.seg, true).segs], ['오토크로스', drivenSegs(I, 'ax', reverse(E.seg), true).segs]);
  { const F = freeSegs(I); if (F) list.push(['내 코스', F.segs]); }
  list.push(['스키드패드', SKID]);
  for (const [name, segs] of list) { let s0 = 0;
    for (const [l, R] of segs) { if (R && C.dIn0(1 / R) > C.dmx + 1e-6)
      throw new Error(\`\${name} \${wbN(s0)} m 지점 (반경 \${Math.abs(R).toFixed(2)} m): 아주 느리게 돌아도 안쪽 바퀴를 \${C.dIn0(1 / R).toFixed(1)}° 꺾어야 해서 최대 조향각 \${C.dmx}° 로는 돌 수 없습니다. 조향 (최대 조향각 · 휠베이스)을 다시 설계하십시오\${I.rm_on === 0 ? ' (또는 최소 회전 반경 제약을 켜서 주행선을 그 반경 안으로)' : \` (주행선은 최소 회전 반경 \${I.rmin} m 까지 휨 — 이 반경이 최대 조향각과 맞는지도 확인)\`}.\`);
      s0 += l; } }
}
const wbN = x => Math.round(x).toLocaleString('en-US');


// ================================================================ 종목
const ACC_L = 75;               // 가속 구간 [m]
const SK_R  = 9.125;            // 스키드패드 주행 반경 [m] = 안쪽 원 7.625 + 차로 폭 절반 1.5
const SK_IN = 15;               // 스키드패드 진입 · 탈출 직선 [m] (근사)
const SK_C  = 2 * Math.PI * SK_R;
const SKID  = [[SK_IN, 0], [SK_C, -SK_R], [SK_C, -SK_R], [SK_C, SK_R], [SK_C, SK_R], [SK_IN, 0]];   // 오른쪽 2바퀴 → 왼쪽 2바퀴
const W_PT  = { acc: 100, ax: 200, end: 350 };   // 감속비 제안에 쓰는 배점 (스키드패드는 감속비와 거의 상관없어 뺌)

// 가속: 75 m 정지 출발, SOC 100 %  → 시간 [s]
// 현실 운전자: 내구는 I 에 __end (k_s × k_e), 가속은 __acc (배율 없음)
const endI = I => I.dr_real === 1 ? { ...I, __end: 1 } : I, accI = I => I.dr_real === 1 ? { ...I, __acc: 1 } : I;
function runAcc(C) {
  const G = grid([[ACC_L, 0]], 0.5), V = new Array(G.s.length).fill(C.Voc(1)), sp = speed(C, G, V, null), W = walk(C, G, sp.v, V, false);
  const Ec = W.ec.at(-1);
  return { G, v: sp.v, lim: sp.lim, V0: V, TM: W.tm, TI: W.ti, TW: W.tw, TB: W.tb, TX: W.tx, T0: { ...C.TH0 }, P: G.s.length - 1, t: [W.tc.at(-1)], Et: [W.et.at(-1)], Ec: [Ec], socs: [1],
           soc1: 1 - Ec / C.EpackAt(C.TH0.b), T1: W.T1 };
}

// 스키드패드: 일정 반경 R [m] 에서 가장 빠른 일정 차속 [m/s] (앞축 횡력 · 뒤축 마찰원 · 모터 힘) → 이분법
//   R 부호 = 방향 (+ 왼쪽 · − 오른쪽). 지금 모델은 좌우 대칭이라 같은 값 (좌우 무게 배분은 나중에)
function skidV(C, R, V0) {
  R = Math.abs(R);
  const m = C.m, fs = C.fs;
  const ok = v => {
    const ay = v * v / R, Fx = C.Fres(v);
    if (C.drive(v, V0, C.Tinit).F < Fx) return false;
    if (m * ay * fs > C.capFy(v, 0, ay) + 1e-9) return false;
    if (C.dmx > 0 && C.dReq(v, 1 / R) > C.dmx) return false;     // 모델 2: 조향 한계
    const N = C.capR(v, 0, ay), Ny = C.capRy(v, 0, ay);
    return Ny > 0 && (m * ay * (1 - fs) / Ny) ** 2 + (Fx / N) ** 2 <= 1;
  };
  let lo = 0, hi = C.vtop;
  if (ok(hi)) return hi;
  for (let i = 0; i < 60; i++) { const md = (lo + hi) / 2; if (ok(md)) lo = md; else hi = md; }
  return lo;
}

// 오토크로스: 내구 코스를 거꾸로 한 바퀴, 정지 출발, SOC 100 %
function runAx(I, C, ds) {
  const segs = (I.end && I.end.seg) || [];
  return segs.length ? laps(C, drivenSegs(I, 'ax', reverse(segs), true).segs, 1, ds, 1, C.Voc(1)) : null;
}

// 내구: 드라이버 2명이 n1 · n2 랩을 각각 정지 출발로 이어서 (교체 시간 제외)
//   full = 랩을 모두 계산 (SOC 반영),  아니면 3랩으로 줄여 셈 (SOC 중간값 고정, 감속비 찾기용)
function endurance(I, C, full, ds) {
  const E = I.end || {}, n = E.laps || 26, n1 = E.stint || Math.floor(n / 2), n2 = n - n1;
  const segs = drivenSegs(I, 'end', E.seg || [], true).segs;
  if (!segs.length) return null;
  if (full) {
    const A = laps(C, segs, n1, ds, 1), B = laps(C, segs, n2, ds, A.soc1, undefined, A.T1);   // 모터 온도는 교체 뒤에도 이어짐
    const t = [...A.t, ...B.t], et = [...A.Et, ...B.Et], ec = [...A.Ec, ...B.Ec];
    const Q = { m: A.Q.m + B.Q.m, i: A.Q.i + B.Q.i, b: A.Q.b + B.Q.b, t: A.Q.t + B.Q.t, s: A.len + B.len };   // 내구 전체 손실 · 발열 적분 [J], 시간 [s], 거리 [m]
    return { T: sum(t), Et: sum(et), Ec: sum(ec), Er: A.Er + B.Er, A, B, n, n1, t, et, ec, soc: [...A.socs, ...B.socs], soc1: B.soc1, vmin: Math.min(A.vmin, B.vmin), Q };
  }
  const Vm = C.Voc(1 - 0.5 * Math.min(1, C.Ecap / C.Epack));
  const L3 = laps(C, segs, 3, ds, 1, Vm);
  const st = (k, a) => k <= 0 ? 0 : k === 1 ? a[0] : a[0] + (k - 2) * a[1] + a[2];   // 첫 랩 + 중간 랩 × (k−2) + 끝 랩
  return { T: st(n1, L3.t) + st(n2, L3.t), Et: st(n1, L3.Et) + st(n2, L3.Et), Ec: st(n1, L3.Ec) + st(n2, L3.Ec), n, n1 };
}

// 내구 에너지 제한: 소비가 쓸 수 있는 에너지를 넘으면 단자 출력 상한 배율 k 를 찾음 (할선법, 줄여 셈)
function powerCut(I, gr) {
  I = endI(I);
  const C1 = car(I, gr, 1), E1 = endurance(I, C1, false, 3);
  if (!E1 || E1.Ec <= C1.Ecap) return 1;
  const over = k => endurance(I, car(I, gr, k), false, 3).Ec - C1.Ecap;
  let k0 = 1, e0 = E1.Ec - C1.Ecap;
  let k1 = Math.max(0.05, Math.min(0.95, C1.Ecap / E1.Ec)), e1 = over(k1);
  for (let i = 0; i < 5 && Math.abs(e1) > 0.002 * C1.Ecap; i++) {
    const k2 = Math.max(0.05, Math.min(1, k1 - e1 * (k1 - k0) / ((e1 - e0) || 1e-9)));
    k0 = k1; e0 = e1; k1 = k2; e1 = over(k1);
  }
  return e1 > 0 ? k1 * 0.995 : k1;
}

// 타력 운전자: 내구 소비가 한도와 같아지는 λ [s/J] (λ 가 클수록 일찍 뗌 → 소비 줄어듦).  줄여 셈으로 로그 이분법, full 이면 다 셈으로 할선 몇 번 더
//   타력만으로 한도에 못 미치면 (λ 최대에서도 넘음) 그 λ 에 출력 상한 배율을 더함
const LAM_MAX = 1;   // [s/J] = 3.6e6 s/kWh (사실상 끝까지 타력)
function coastCut(I, gr, full) {
  I = endI(I);
  const C1 = car(I, gr, 1), cap = C1.Ecap, E0 = endurance(I, C1, false, 3);
  if (!E0 || !(E0.Ec > cap)) return { lam: 0, k: 1 };
  const ec = (lam, f) => endurance(I, car(I, gr, 1, lam), f, f ? 1 : 3).Ec;
  let lo = 1e-9, hi = 1e-6;
  while (hi < LAM_MAX && ec(hi, false) > cap) { lo = hi; hi *= 8; }
  if (hi >= LAM_MAX && ec(LAM_MAX, false) > cap) return { lam: LAM_MAX, k: null };
  for (let i = 0; i < 18; i++) { const md = Math.sqrt(lo * hi); if (ec(md, false) > cap) lo = md; else hi = md; }
  let lam = hi;
  if (full) {                                                       // 다 셈: 로그 λ 에 대해 할선 (한도의 0.05 % 안으로)
    let l0 = Math.log(lam), e0 = ec(lam, true) - cap;
    if (Math.abs(e0) > 5e-4 * cap) {
      let l1 = l0 + (e0 > 0 ? 0.05 : -0.05), e1 = ec(Math.exp(l1), true) - cap;
      for (let i = 0; i < 6 && Math.abs(e1) > 5e-4 * cap; i++) { const l2 = l1 - e1 * (l1 - l0) / ((e1 - e0) || 1e-12); l0 = l1; e0 = e1; l1 = l2; e1 = ec(Math.exp(l1), true) - cap; }
      lam = Math.exp(l1);
    }
  }
  return { lam, k: 1 };
}

// 내구 (에너지 제한 포함). full 이면 줄여 셈과 다 셈의 차이를 한 번 더 맞춤.  drv 1 = 타력 운전자 (λ), 0 = 최대 운전자 (출력 상한 배율 k)
function runEnd(I, gr, full) {
  I = endI(I);
  const C = car(I, gr, 1);
  if (I.drv === 1 && isFinite(C.Ecap)) {
    const Q = coastCut(I, gr, full);
    let k = 1;
    if (Q.k === null) { const Ic = { ...I, drv: 0 }, C1 = car(I, gr, 1, Q.lam);   // 끝까지 타력해도 넘음 → 그 위에 출력 상한 배율
      const over = kk => endurance(I, car(I, gr, kk, Q.lam), false, 3).Ec - C1.Ecap; let a = 0.05, b = 1; for (let i = 0; i < 20; i++) { const md = (a + b) / 2; if (over(md) > 0) b = md; else a = md; } k = a; }
    const CE = car(I, gr, k, Q.lam), EN = endurance(I, CE, full, full ? 1 : 3);
    return EN ? { ...EN, k, lam: Q.lam, CE } : null;
  }
  let k = powerCut(I, gr), CE = k < 1 ? car(I, gr, k) : C, EN = endurance(I, CE, full, full ? 1 : 3);
  if (full && EN && EN.Ec > C.Ecap) {
    k *= Math.pow(C.Ecap / EN.Ec, 1.5);
    CE = car(I, gr, k);
    EN = endurance(I, CE, true, 1);
  }
  return EN ? { ...EN, k, lam: 0, CE } : null;
}

// 내 코스: 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스 (끝 = 처음)
//   구간마다 폭 (빈칸 = 윗줄 값, 첫 줄도 비면 1.75 m = 전체 3.5 m), 슬라럼 콘 간격이 있는 구간은 콘 자리에서 쪼갬 (첫 콘 = 시작 + 간격 ÷ 2)
//   조각 = [길이, 반경, 왼쪽 폭, 오른쪽 폭, 시작에 콘 (1/0), 원래 행 번호]
const FREE_W = 1.75;   // 폭을 하나도 안 적은 내 코스: 가운데 선에서 양쪽 1.75 m [m]
function freeSegs(I) {
  const F = I.free || {}, seg = F.seg || [], hw = FREE_W;
  let wl = hw, wr = hw;
  const items = [];
  seg.forEach(([l, R], k) => {
    const a = F.wl && F.wl[k], b = F.wr && F.wr[k], d = F.sl && F.sl[k];
    if (a != null && a >= 0) wl = a;
    if (b != null && b >= 0) wr = b;
    if (!(l > 0)) return;
    const cut = [0];
    if (d > 0) for (let p = d / 2; p < l - 1e-6; p += d) cut.push(p);
    cut.push(l);
    for (let j = 0; j + 1 < cut.length; j++) items.push([cut[j + 1] - cut[j], R, wl, wr, j > 0 ? 1 : 0, k]);
  });
  if (!items.length) return null;
  const m = Math.max(1, Math.round(F.laps || 1)), s0 = F.s0 || 0;
  const closed = F.closed != null ? F.closed !== false : (m > 1 || s0 > 0);
  const it = closed ? rotate(items, s0) : items;
  const sg = it.map(r => [r[0], r[1]]);
  // 콘 묶음: 같은 행에서 나온 콘이 이어져 있으면 한 묶음 (묶음 안에서 번갈아 비켜 감)
  const groups = []; let last = -1;
  it.forEach((r, i) => { if (!r[4]) return; const g = groups[groups.length - 1]; if (g && r[5] === last) g.push(i); else groups.push([i]); last = r[5]; });
  const D = drivenSegs(I, 'free', sg, closed, { wl: it.map(r => r[2]), wr: it.map(r => r[3]), groups });
  return { segs: D.segs, m: closed ? m : 1, rl: D };
}
function runFree(I, C, ds, fast) {
  if (I.dr_real === 1 && I.free && I.free.end === 1 && !I.__end) { I = endI(I); C = car(I, C.gr, 1); }   // 내 코스 [내구 주행]: 현실 운전자 k_s × k_e
  const F = freeSegs(I);
  if (!F) return null;
  if (!fast || F.m <= 3) return { ...laps(C, F.segs, F.m, ds, 1, fast ? C.Voc(1) : undefined), m: F.m };
  const L3 = laps(C, F.segs, 3, ds, 1, C.Voc(1));          // 줄여 셈: 첫 랩 + 중간 랩 × (m−2) + 끝 랩
  return { t: [L3.t[0], ...Array(F.m - 2).fill(L3.t[1]), L3.t[2]], m: F.m };
}

// 랩 기록 정리: 정지 출발 랩(stand)을 뺀 평균 랩 [s]
function lapStat(t, stand) {
  const rest = t.filter((_, i) => !stand.includes(i));
  return { total: sum(t), first: t[0], avg: rest.length ? sum(rest) / rest.length : NaN, n: t.length };
}

// 스키드패드 횡가속도 [g]: 기록 바퀴 (오른쪽 · 왼쪽 일정 반경 한 바퀴씩) 의 시간 평균 — 진입 · 탈출은 넣지 않음
const skidAy = E => (E.vR * E.vR * E.tR + E.vL * E.vL * E.tL) / (E.tR + E.tL) / SK_R / g;
// 가속: 최대 종가속도 [g] (칸마다 (v₂² − v₁²) ÷ 2Δs)
const accMax = A => { let a = 0; for (let i = 0; i + 1 < A.v.length; i++) a = Math.max(a, (A.v[i + 1] ** 2 - A.v[i] ** 2) / (2 * (A.G.s[i + 1] - A.G.s[i]))); return a / g; };

// 종목 기록 한 벌 (감속비 gr).  fast = 줄여 셈 (감속비 찾기 · 입력 훑기)
//   스키드패드 기록 = 오른쪽 한 바퀴 + 왼쪽 한 바퀴 [s]
function events(I, gr, fast) {
  const ds = fast ? 3 : 1, C = car(I, gr, 1);
  const vR = skidV(C, -SK_R, C.Voc(1)), vL = skidV(C, SK_R, C.Voc(1));
  const X = runAx(I, C, ds), EN = runEnd(I, gr, !fast);
  const A = runAcc(I.dr_real === 1 ? car(accI(I), gr, 1) : C);
  return { C, acc: A.t[0], A, skid: SK_C / vR + SK_C / vL, tR: SK_C / vR, tL: SK_C / vL, vs: Math.min(vR, vL), vR, vL,
           ax: X ? X.t[0] : NaN, X, EN, end: EN ? EN.T : NaN };
}


// ================================================================ 감속비 찾기
// 2.5 ~ 7.0 을 0.5 간격으로 보고, 가장 좋은 곳 ± 0.4 를 0.1 간격으로 다시 봄
function scanGr(score) {
  let b = 2.5;
  for (let x = 2.5; x <= 7.0001; x += 0.5) if (score(x) > score(b)) b = x;
  const b0 = b;
  for (let x = Math.max(2.5, b0 - 0.4); x <= Math.min(7, b0 + 0.4) + 1e-9; x += 0.1) if (score(x) > score(b) + 1e-12) b = x;
  return Math.round(b * 100) / 100;
}

// 종목별 가장 빠른 감속비 + 배점 가중 제안
//   제안 = Σ 배점 × (입력 감속비 기록 − 그 감속비 기록) ÷ 입력 감속비 기록 이 가장 큰 감속비
function bestGr(I, pg) {
  const memo = new Map();
  const ev = gg => { gg = Math.round(gg * 100) / 100; if (!memo.has(gg)) { memo.set(gg, events(I, gg, true)); if (pg) pg(Math.min(1, memo.size / 30)); } return memo.get(gg); };   // 감속비 약 30 개를 훑음
  const E0 = ev(I.gr);
  const J = E => Object.keys(W_PT).reduce((a, k) => a + (isFinite(E0[k]) && isFinite(E[k]) ? W_PT[k] * (E0[k] - E[k]) / E0[k] : 0), 0);
  const out = {};
  for (const k of ['acc', 'ax', 'end']) out[k] = scanGr(x => { const t = ev(x)[k]; return isFinite(t) ? -t : -Infinity; });
  out.opt = scanGr(x => J(ev(x)));
  return out;
}

// 내 코스에서 가장 빠른 감속비 (모든 랩 합, 줄여 셈)
function bestGrFree(I) {
  if (!freeSegs(I)) return NaN;
  const memo = new Map();
  return scanGr(x => {
    const k = Math.round(x * 100) / 100;
    if (!memo.has(k)) { const R = runFree(I, car(I, k, 1), 1, true); memo.set(k, R ? -sum(R.t) : -Infinity); }
    return memo.get(k);
  });
}


// ================================================================ 그 밖의 결과
// 스키드패드 목표 기록 (좌우 한 바퀴 합) → 필요한 C_L·A [m²] (공력 중심 위치는 그대로, 크기만)
//   지금보다 남으면 − 까지 (그만큼 줄여도 됨).  ±15 m² 를 넘으면 NaN
function claNeed(I, gr) {
  if (!(I.t_skid > 0)) return NaN;
  const keep = VC;
  const tAt = c => { VC = new Map(); VCF = new Map(); const C = car({ ...I, cla: c }, gr, 1), V = C.Voc(1); return SK_C / skidV(C, -SK_R, V) + SK_C / skidV(C, SK_R, V); };
  let r, lo = -15, hi = 15;
  if (tAt(hi) > I.t_skid || tAt(lo) < I.t_skid) r = NaN;
  else {
    for (let i = 0; i < 45; i++) { const md = (lo + hi) / 2; if (tAt(md) > I.t_skid) lo = md; else hi = md; }
    r = (lo + hi) / 2;
  }
  VC = keep;
  return r;
}

// 모터 기저 회전수 [rpm]: 토크 곡선이 최대의 98 % 아래로 처음 내려가는 회전수 (공칭 개방 전압)
function nBase(I, C) {
  const V = I.n_s * I.c_vnom, T0 = C.Tcurve(1, V);
  for (let n = 0; n <= I.nmax; n += 5) if (C.Tcurve(n, V) < 0.98 * T0) return n;
  return NaN;
}


// ================================================================ 고른 코스 (그래프 · 지도 · 아래 결과 3칸)
// 감속비 gr 로 고른 코스를 다 계산.  {L: 랩 결과, C: 차량, stand: 정지 출발 랩, rev: 지도 방향, k: 출력 상한 배율}
function runCourse(I, c, gr) {
  const C = car(I, gr, 1);
  if (c === 'acc')  { const CA = car(accI(I), gr, 1); return { L: runAcc(CA), C: CA, stand: [0] }; }
  if (c === 'skid') return { L: laps(C, SKID, 1, 0.5, 1, C.Voc(1)), C, stand: [0], skid: true };
  if (c === 'ax')   { const X = runAx(I, C, 1); return X && { L: X, C, stand: [0], rev: true }; }
  if (c === 'free') { const F = runFree(I, C, 0.5, false); return F && { L: F, C, stand: [0] }; }
  const EN = runEnd(I, gr, true);
  return EN && { EN, C: EN.CE, k: EN.k, stand: [0, EN.n1] };
}


// ================================================================ 한 모드의 결과 (감속비 G2 로 종목 기록 · 차량 한계, 고른 코스는 G3)
function modeRun(I, G2, G3, fast) {
  const E   = events(I, G2, false);
  const C   = E.C, EN = E.EN;
  const end = EN ? lapStat(EN.t, [0, EN.n1]) : null;
  const out = {
    // 종목 기록
    gr_use: G2,
    t_acc_s: E.acc, t_skid_s: E.skid, t_skid_r: E.tR, t_skid_l: E.tL, t_ax_s: E.ax, t_end_s: E.end,
    t_end1: end ? end.first : NaN, t_endavg: end ? end.avg : NaN, n_lap: EN ? EN.n : NaN, n_st1: EN ? EN.n1 : NaN,
    d_acc: E.acc - fast.acc, d_ax: E.ax - fast.ax, d_end: E.end - fast.end,
    // 차량 한계
    vmax: C.vtop * 3.6, v_top: E.X ? Math.max(...E.X.v) * 3.6 : NaN,
    v_endtop: EN ? Math.max(...EN.A.v, ...EN.B.v) * 3.6 : NaN,                                       // 내구 최고 차속 [km/h]
    ay_skid: skidAy(E),                                                                               // 기록 바퀴 평균 [g]
    ax_0: (CA => CA.aDrive(0, 0, 0, CA.Voc(1), CA.Tinit))(I.dr_real === 1 ? car(accI(I), G2, 1) : C) / g, ax_max: accMax(E.A),                              // 가속: 출발 · 최대 종가속도 [g]
    cla_req: claNeed(I, G2), skid_roll: C.rollAng(skidAy(E) * g),
    // 내구 (대시보드 반영 · 검증용)
    e_ok: EN ? (EN.Ec <= C.Ecap * 1.01 ? 1 : 0) : NaN, e_use: EN ? EN.Ec / 3.6e6 : NaN, p_lim: EN ? EN.k * 100 : NaN,
    e_reg: EN ? EN.Er / 3.6e6 : NaN, c_lam: EN ? EN.lam * 3.6e6 : NaN,                                 // 회생 회수 [kWh] · 타력 λ [s/kWh]
    e_lap: EN ? lapStat(EN.et, [0, EN.n1]).avg / 3.6e6 : NaN,
    // 내구 평균 발열 · 차속 (도구 9 냉각 계통 계산기 입력): 손실 시간 적분 ÷ 주행 시간 [W], 거리 ÷ 시간 [km/h], 방열량 목표 = 모터 + 인버터 [kW]
    ...(() => { const Q = EN && EN.Q; if (!Q || !(Q.t > 0)) return { q_mot: NaN, q_inv: NaN, q_bat: NaN, v_end_avg: NaN, q_cool: NaN };
                return { q_mot: Q.m / Q.t, q_inv: Q.i / Q.t, q_bat: Q.b / Q.t, v_end_avg: Q.s / Q.t * 3.6, q_cool: (Q.m + Q.i) / Q.t / 1000 }; })(),
    // 내구 전체 에너지 [kWh]: 지금 설정 그대로 (에너지 상한이 걸리면 출력을 낮춘 값) · 출력 상한 없이 (배율 1) 달렸을 때
    e_end_t: EN ? EN.Et / 3.6e6 : NaN, e_end_c: EN ? EN.Ec / 3.6e6 : NaN,
    ...(() => { if (!EN) return { e_nl_t: NaN, e_nl_c: NaN };
                const F = EN.k < 1 || EN.lam > 0 ? endurance(endI(I), car(endI(I), G2, 1), true, 1) : EN;
                return { e_nl_t: F.Et / 3.6e6, e_nl_c: F.Ec / 3.6e6 }; })(),
  };

  // ---------- 고른 코스 (감속비 G3)
  const c = I.course, K = runCourse(I, c, G3);
  if (!K) return { out, x: { d: [0] }, sig: {}, map: null };

  // 볼 랩 고르기: 내구는 드라이버 A · B 두 줄을 이어 붙임
  let G, v, lim, V0, TM, TI, TW, TB, TX, from = 0, to, P, n;
  if (K.EN) {
    const A = K.EN.A, B = K.EN.B, off = A.G.s.at(-1);
    G   = { s: [...A.G.s, ...B.G.s.slice(1).map(x => x + off)], k: [...A.G.k, ...B.G.k] };
    v   = [...A.v, ...B.v.slice(1)];
    lim = [...A.lim, ...B.lim.slice(1)];
    V0  = [...A.V0, ...B.V0.slice(1)]; V0.soc = [...(A.V0.soc || A.V0.map(() => 1)), ...(B.V0.soc || B.V0.map(() => 1)).slice(1)];
    TM  = [...A.TM, ...B.TM.slice(1)];
    TW  = [...A.TW, ...B.TW.slice(1)];
    TB  = [...A.TB, ...B.TB.slice(1)];
    TX  = [...A.TX, ...B.TX.slice(1)];
    TI  = [...A.TI, ...B.TI.slice(1)];
    P = A.P; n = K.EN.n;
  } else {
    ({ G, v, lim, V0, TM, TI, TW, TB, TX, P } = K.L); n = K.L.t.length;
  }
  const j = I.lap === 'all' || n === 1 ? -1 : Math.max(1, Math.min(n, parseInt(I.lap) || 1)) - 1;
  if (j >= 0) { from = j * P; to = (j + 1) * P; } else to = G.s.length - 1;
  const jm = j >= 0 ? j : (n > 1 ? 1 : 0);                // 지도에 칠할 랩 ('전체'면 2번째)
  const vk = v.map(a => a * 3.6);
  const map = K.skid ? { skid: true } : c === 'acc' ? { acc: true } : { P, rev: !!K.rev, vc: vk.slice(jm * P, (jm + 1) * P + 1) };
  map.lo = Math.min(...vk); map.hi = Math.max(...vk);     // 색 범위 = 모든 랩 통틀어 (어느 랩을 봐도 같은 색 = 같은 차속)
  // 주행선: 지도에 그릴 옆 거리 (코스 원래 방향 기준, 왼쪽 +) · 한 랩 길이
  const segE = (I.end && I.end.seg) || [];
  const RL = c === 'end' ? drivenSegs(I, 'end', segE, true) : c === 'ax' ? drivenSegs(I, 'ax', reverse(segE), true) : c === 'free' ? freeSegs(I).rl : null;
  if (RL && RL.eN) {
    const Lc = RL.sN.at(-1);                               // 오토크로스는 거꾸로 달리므로 거리 · 좌우를 되돌림
    map.rl = c === 'ax' ? { s: RL.sN.map(x => Lc - x).reverse(), e: RL.eN.map(x => -x).reverse() } : { s: RL.sN, e: RL.eN };
    // 최소 회전 반경(최대 조향각에서)보다 급한 조각: 가운데 선 거리 [시작, 끝] (코스 원래 방향)
    const rmE = rKin(I), iv = [];
    if (rmE) RL.segs.forEach(([, R], j) => { if (R && Math.abs(R) < rmE * (1 - 1e-3)) iv.push([RL.sN[j], RL.sN[j + 1]]); });
    map.rbad = c === 'ax' ? iv.map(([a, b]) => [Lc - b, Lc - a]) : iv;
  }

  const sl = a => a.slice(from, to + 1);
  const Gs = { s: sl(G.s).map(x => x - G.s[from]), k: G.k.slice(from, to) }, vv = sl(v);
  const W  = walk(K.C, Gs, vv, sl(V0), true, { m: TM[from], i: TI[from], w: TW[from], b: TB[from], x: TX ? TX[from] : undefined });

  // ---------- 고른 코스 결과 (볼 랩)
  const lt = K.EN ? K.EN.t : K.L.t, le = K.EN ? K.EN.et : K.L.Et, lc = K.EN ? K.EN.ec : K.L.Ec, soc = K.EN ? K.EN.soc : K.L.socs;
  const ls = lapStat(lt, K.stand), jj = I.lap !== 'all' && lt.length > 1 ? j : -1;
  const pick = a => jj >= 0 ? a[jj] : sum(a);
  const socEnd = K.EN ? K.EN.soc1 : (K.L.soc1 != null ? K.L.soc1 : NaN);
  Object.assign(out, {
    c_gr: G3, c_n: lt.length, c_lap: jj + 1, c_len: RL ? RL.len : NaN, c_ltot: RL ? RL.len * lt.length : NaN, c_rl: RL && RL.eN ? (RL.gain != null ? 2 : 1) : 0, c_rlg: RL && RL.gain != null ? RL.gain : NaN, c_rlb: rlB(I),   // 한 랩 · 총 거리 [m]
    c_rkin: rKin(I) || NaN,   // 최대 조향각에서 정한 최소 회전 반경 [m]
    c_vstr: K.C && K.C.drv && G && G.k ? (x => isFinite(x) ? x * 3.6 : NaN)(Math.min(...steerCap(K.C, G))) : NaN,   // 현실 운전자: 핸들 속도 상한이 가장 낮은 곳 [km/h]
    ...(() => { const rmE = rKin(I), T = RL ? rTight(RL.segs, rmE) : c === 'skid' ? rTight([[1, 9.125]], rmE) : { r: Infinity, bad: 0 };
                const bk = bodyBk(I), bb = bk && isFinite(T.r) ? bk(1 / T.r) : [NaN, NaN];
                return { c_rmn: isFinite(T.r) ? T.r : NaN, c_rbad: T.bad, c_ctight: RL && RL.ctight ? RL.ctight : 0,
                         c_bo: Math.max(bb[0], bb[1]), c_bi: Math.min(bb[0], bb[1]) }; })(),   // 가장 급한 곳에서 차 바깥 · 안쪽 여유 [m] (전폭이 있을 때)   // c_ctight = 여유를 못 지킨 콘 수                       // 달리는 선 가장 작은 반경 · 최소 회전 반경보다 급한 길이 [m]
    // 차량 모델 2: 보는 랩의 최대 슬립각 · 차체 각도 · 조향각, 포화 점 수, 최대 조향각을 넘는 거리 [m]
    ...(() => { const S = W.S, M = a => a.length && a.some(Number.isFinite) ? Math.max(...a.filter(Number.isFinite).map(Math.abs)) : NaN; if (!K.C.md2) return { c_afmax: NaN, c_armax: NaN, c_bmax: NaN, c_swmax: NaN, c_dwmax: NaN, c_satn: NaN, c_dbad: NaN };
                let bad = 0; if (K.C.dmx > 0) for (let i = 0; i < S.dst.length; i++) if (S.dst[i] === 1) bad += Gs.s[i + 1] - Gs.s[i];   // 조향 한계로 코너 속도 상한이 낮아진 거리 [m]
                return { c_afmax: M(S.af), c_armax: M(S.ar), c_bmax: M(S.beta), c_swmax: M(S.sw), c_dwmax: M(S.dw), c_satn: S.sat.reduce((a, b) => a + b, 0), c_dbad: K.C.dmx > 0 ? bad : NaN }; })(),
    c_t: c === 'skid' ? E.skid : lt.length > 1 ? (jj >= 0 ? lt[jj] : ls.total) : lt[0],
    c_t1: ls.first, c_tavg: ls.avg, c_ttot: ls.total,
    c_vtop: Math.max(...vv) * 3.6,
    c_rpm: Math.max(...W.S.rpm), c_tq: Math.max(...W.S.tq), c_pbat: Math.max(...W.S.pbat), c_vmin: Math.min(...W.S.vbat),
    tmax_o: (() => { const mx = t => Math.max(...t.map(q => q[1])); return I.motor && I.motor.length ? mx(I.motor) : I.motorC && I.motorC.length ? mx(I.motorC) / Math.max(1e-3, Math.min(1, (Number.isFinite(I.c_pct) ? I.c_pct : 100) / 100)) : I.tmax; })(),   // 모터 최대 토크 = 피크 표 최댓값 (기준 전압, 피크가 없으면 연속 ÷ 비율) → 대시보드 tmax
    ...(() => { const T = TRI[I.course]; return T ? { c_trok: T.ok, c_trit: T.it, c_trlen: T.len, c_trq: T.q, c_trdt: T.dt } : { c_trok: NaN, c_trit: NaN, c_trlen: NaN, c_trq: NaN, c_trdt: NaN }; })(),   // 모델 3 과도: 다 맞춤 (1) · 되풀이 수 · 속도를 낮춘 거리 [m] · 정상보다 더 쓴 타이어 몫 최대 [%] · 한 랩 시간 증가 [s] (닫힌 코스 = 이어 달린 바퀴)
    ...(() => { if (!Number.isFinite(I.tp_v)) return {};   // 검증용 탐침 (모델 3): 일정 차속 tp_v, 곡률 tp_k · dκ/ds tp_dk · d²κ/ds² tp_ddk 의 과도 축 힘 · 타이어 사용
      const C = K.C, v = I.tp_v, Iz = Math.max(0, Number.isFinite(I.izz) ? I.izz : 70), L = C.L, lf = L * (1 - C.fs), lr = L * C.fs, ay = v * v * I.tp_k, rd = v * v * I.tp_dk, rdd = v * v * v * (I.tp_ddk || 0);
      const Ff = (C.m * ay * lr + Iz * rd) / L, Fr = (C.m * ay * lf - Iz * rd) / L, dFf = (C.m * v * rd * lr + Iz * rdd) / L, dFr = (C.m * v * rd * lf - Iz * rdd) / L;   // d(a_y)/dt = v · v² κ' = v ṙ (일정 차속)
      const P = trPoint(C, Math.max(0, I.tire_relax || 0), v, 0, ay, Ff, Fr, dFf, dFr); return { c_tpf: P.Fsf, c_tpr: P.Fsr, c_tpu: P.uT }; })(),
    ...(() => { const B = BDI[I.course]; return { c_bdlen: B ? B.len : NaN, c_bddv: B ? B.dv : NaN, c_bdct: B ? B.ct : NaN }; })(),   // 차체가 경계에 닿지 않게 속도를 낮춘 거리 [m] · 가장 크게 낮춘 양 [km/h]
    ...(Number.isFinite(I.bp_k) && wcOn(I) ? (([l, r]) => ({ c_bdl: l, c_bdr: r }))(bodyM(I, I.bp_k, (I.bp_b || 0) * Math.PI / 180)) : {}),   // 검증용 탐침: 곡률 · 차체 각도의 차 옆 나감 [m]
    c_cdp: Number.isFinite(I.cq_dy) && wcOn(I) ? coneDist(I, K.C, I.cq_n || 0, (I.cq_psi || 0) * Math.PI / 180, I.cq_k || 0, I.cq_dx || 0, I.cq_dy) : NaN,   // 검증용 탐침: 차 사각형 ↔ 콘 점 거리 [m]
    c_v3: Number.isFinite(I.vp_k) ? K.C.vCorner3(I.vp_k, I.vp_k1 || 0, I.vp_k2 || 0) : NaN,   // 검증용 탐침 (모델 3): 곡률 κ · κ' · κ'' 의 코너 한계 속도 [m/s]
    c_rho: Number.isFinite(I.cp_v) ? K.C.capFy(I.cp_v, 0, I.cp_ay) / K.C.capF(I.cp_v, 0, I.cp_ay) : NaN,   // 검증용 탐침 (모델 2): 같은 슬립각 앞축 횡 한계 ÷ Σ μ F_z
    c_tqp: Number.isFinite(I.tq_n) ? K.C.Tcurve(I.tq_n, I.tq_V, I.tq_tm, I.tq_ti) : NaN,   // 검증용 탐침: 회전수 tq_n · 단자 전압 tq_V · 모터 온도 tq_tm · 인버터 온도 tq_ti 의 최대 토크 [N·m]
    c_tm: K.C.thOn ? W.tm.at(-1) : NaN, c_tmax: K.C.thOn ? Math.max(...W.tm) : NaN,
    c_tw: K.C.cwOn ? W.tw.at(-1) : NaN, c_twmax: K.C.cwOn ? Math.max(...W.tw) : NaN,       // 냉각수 끝 · 최고 [°C]
    c_tb: K.C.btOn ? W.tb.at(-1) : NaN, c_tbmax: K.C.btOn ? Math.max(...W.tb) : NaN,       // 축전지 끝 · 최고 [°C]
    c_ti: K.C.inOn ? W.ti.at(-1) : NaN, c_timax: K.C.inOn ? Math.max(...W.ti) : NaN,       // 인버터 끝 · 최고 [°C]
    // 도구 9 냉각 계통 계산기로 넘기는 값: 보는 랩(또는 전체)의 평균 모터 손실 · 인버터 손실 · 축전지 발열 [W], 평균 차속 [km/h], 그 시간 [s]
    c_qm: W.Q.t > 0 ? W.Q.m / W.Q.t : NaN, c_qi: W.Q.t > 0 ? W.Q.i / W.Q.t : NaN, c_qb: W.Q.t > 0 ? W.Q.b / W.Q.t : NaN,
    c_vavg: W.Q.t > 0 ? Gs.s.at(-1) / W.Q.t * 3.6 : NaN, c_trun: W.Q.t,
    c_et: pick(le) / 3.6e6, c_ec: pick(lc) / 3.6e6,
    // 에너지 카드 (모든 코스 같은 줄): 그 코스 전체 랩 합 · 출력 상한 없이 (내구 말고는 상한이 없어 전체와 같음) [kWh]
    c_all_t: sum(le) / 3.6e6, c_all_c: sum(lc) / 3.6e6,
    c_nl_t: c === 'end' ? out.e_nl_t : sum(le) / 3.6e6, c_nl_c: c === 'end' ? out.e_nl_c : sum(lc) / 3.6e6,
    c_soc: (jj >= 0 ? (soc[jj + 1] ?? socEnd) : socEnd) * 100,
    c_plim: K.k != null ? K.k * 100 : NaN,
    c_cap: K.EN ? K.C.Ecap / 3.6e6 : NaN,
    c_co2: K.EN ? (K.EN.Et / 3.6e6) * 1.3 / (K.EN.n * sum(I.end.seg.map(r => r[0])) / 1000) * 100 : NaN,
  });
  return {
    out, x: { d: Gs.s },
    sig: { v: vv.map(a => a * 3.6), vlim: sl(lim).map(a => a * 3.6), t: W.tc, ecum: W.et.map(e => e / 3600), ...W.S },
    map,
  };
}

// 구동력 선도 [N] (차속 0 ~ 최고속): 그 점의 전압 V · 모터 온도 Tm · 횡가속도 ay · 종가속도 ax [m/s²] 에서
//   f_mt  = 모터 토크 곡선 한계 (디레이팅 포함) → 바퀴 힘
//   f_mp  = 단자 출력 상한 (규정 · 전류 · 에너지 제한) × 효율 → 바퀴 힘
//   f_m   = 실제 모터 구동력 = 둘 중 작은 쪽 (전압 강하 반영)
//   f_x   = 뒤축 접지 한계 (마찰원에서 횡력을 뺀 나머지),  f_b = 제동 접지 한계 (네 바퀴, −),  f_res = 주행 저항
function tractive(I, gr, V, Tm, ay, ax) {
  const C  = car(I, gr, 1);
  const VV = Array.from({ length: 121 }, (_, i) => C.vtop * i / 120);
  const Fyr = C.m * ay * (1 - C.fs), Fy = C.m * ay;
  const toF = (T, n) => T * gr * C.etaD(n, T) / C.r;
  const f_mt = VV.map(x => toF(C.Tcurve(C.rpm(x), V, Tm), C.rpm(x)));
  const f_mp = VV.map(x => { const n = C.rpm(x), w = n * 2 * Math.PI / 60, T = C.Tcurve(n, V, Tm), e = C.elec(toF(T, n), x, V).e;
                             return w > 0 ? toF(C.ptMax(V) * e / w, n) : NaN; });
  const f_b = VV.map(x => { let d = 0;
    for (let it = 0; it < 3; it++) { const N = C.capF(x, -d, ay) + C.capR(x, -d, ay); d = Math.sqrt(Math.max(0, N * N - Fy * Fy)) / C.meff; }
    return -d * C.meff; });
  // 그 점의 앞축: 필요한 횡력 · 낼 수 있는 힘 (차속은 그래프의 프로브 차속을 UI 가 고름)
  const front = VV.map(x => ({ need: C.m * ay * C.fs, cap: C.capF(x, ax, ay) }));
  const cap = 1.3 * Math.max(...f_mt);                    // 출력 상한 곡선은 저속에서 무한대로 커지므로 토크 곡선의 1.3배에서 자름
  return { v: VV.map(x => x * 3.6), f_mt, f_mp: f_mp.map(f => f > cap ? NaN : f),
           f_m: VV.map(x => C.drive(x, V, Tm).F),
           f_x: VV.map(x => Math.sqrt(Math.max(0, C.capR(x, ax, ay) ** 2 - Fyr * Fyr))),
           f_b, f_res: VV.map(C.Fres), meff: C.meff, fy_need: front.map(f => f.need), fy_cap: front.map(f => f.cap) };
}


// ================================================================ 계산
// ================================================================ 차량 모델 3: 계단 조향 과도 응답 (ISO 7401 꼴, 일정 차속)
//   선형 3 자유도 (옆 속도 v_y, 요레이트 r, 롤 φ — Segel 꼴, 롤 축 둘레) + 타이어 이완 (1 차 지연):
//     m (v̇_y + V r) − m_s h′ φ̈ = F_f + F_r,   I_zz ṙ = a F_f − b F_r,   I_xx φ̈ − m_s h′ (v̇_y + V r) = (m_s g h′ − K_φ) φ − C_φ φ̇
//     α_f = δ − (v_y + a r) ÷ V,  α_r = −(v_y − b r) ÷ V,   Ḟ = (V ÷ σ)(C_α α − F)  (σ → 0 이면 F = C_α α)
//   C_α = 축 (두 바퀴) 코너링 강성 (정지 하중), a · b = 무게중심에서 앞 · 뒤 축, h′ = 무게중심 − 롤 축 높이, m_s = 현가상질량
//   조향: 0.1 s 에서 0.1 s 동안 바퀴 각 δ 까지 (정상 횡가속도가 ay_test 가 되는 δ = ay (L + K V²) ÷ V², K = m (b/C_f − a/C_r) ÷ L)
//   해석해 (롤 · 이완 없이 2 자유도): 정상 요레이트 이득 r/δ = V ÷ (L + K V²),  ω_n² = (C_f C_r L² ÷ (m I_zz V²)) (1 + K V² ÷ L),  2 ζ ω_n = (C_f + C_r) ÷ (m V) + (a² C_f + b² C_r) ÷ (I_zz V)
//   롤 정상각 φ = m_s h′ a_y ÷ (K_φ − m_s g h′)
function stepSteer(I, C) {
  const m = I.m, L = C.L, a = L * (1 - C.fs), b = L * C.fs, V = Math.max(1, (I.v_test || 60) / 3.6), Dg = Math.PI / 180;
  const Cf = 2 * C.Ca(m * g * C.fs / 2), Cr = 2 * C.Ca(m * g * (1 - C.fs) / 2), Iz = Math.max(1, I.izz || 70), Ix = Math.max(0.1, I.ixx || 30);
  const ms = Math.max(1, m - 2 * (I.m_us_f || 0) - 2 * (I.m_us_r || 0)), hp = C.h - C.hra, Kp = (I.k_roll || 0) / Dg, Cp = (I.c_roll || 0) / Dg, sig = Math.max(0, I.tire_relax || 0);
  const K = m * (b / Cf - a / Cr) / L, ayT = (I.ay_test || 0.4) * g, del = ayT * (L + K * V * V) / (V * V);
  const wn = Math.sqrt(Math.max(0, Cf * Cr * L * L / (m * Iz * V * V) * (1 + K * V * V / L))), ze = ((Cf + Cr) / (m * V) + (a * a * Cf + b * b * Cr) / (Iz * V)) / (2 * wn);
  const dl = t => t < 0.1 ? 0 : t < 0.2 ? del * (t - 0.1) / 0.1 : del;
  const det = m * Ix - (ms * hp) ** 2;
  const f = (t, x) => { const [vy, r, ph, pd, Ff, Fr] = x, af = dl(t) - (vy + a * r) / V, ar = -(vy - b * r) / V;
    const Ffe = sig > 1e-6 ? Ff : Cf * af, Fre = sig > 1e-6 ? Fr : Cr * ar, Fy = Ffe + Fre, M = (ms * g * hp - Kp) * ph - Cp * pd;
    const u = (Fy * Ix + ms * hp * M) / det, pdd = (m * M + ms * hp * Fy) / det;
    return [u - V * r, (a * Ffe - b * Fre) / Iz, pd, pdd, sig > 1e-6 ? V / sig * (Cf * af - Ff) : 0, sig > 1e-6 ? V / sig * (Cr * ar - Fr) : 0, u]; };
  const h = 0.0005, T = 3, n = Math.round(T / h), S = { t: [], r: [], ay: [], beta: [], phi: [], sw: [] };
  let x = [0, 0, 0, 0, 0, 0], ay = 0;
  for (let k = 0; k <= n; k++) { const t = k * h;
    if (k % 10 === 0) { const d = f(t, x); ay = d[6]; S.t.push(t); S.r.push(x[1] / Dg); S.ay.push(ay / g); S.beta.push(Math.atan2(x[0], V) / Dg); S.phi.push(x[2] / Dg); S.sw.push(dl(t) / Dg * C.sr); }
    if (k === n) break;
    const k1 = f(t, x), k2 = f(t + h / 2, x.map((v, i) => v + h / 2 * k1[i])), k3 = f(t + h / 2, x.map((v, i) => v + h / 2 * k2[i])), k4 = f(t + h, x.map((v, i) => v + h * k3[i]));
    x = x.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); }
  const rss = del * V / (L + K * V * V), rEnd = x[1], pk = Math.max(...S.r) * Dg;
  let t50 = NaN, t90 = NaN; for (let i = 0; i < S.t.length; i++) { if (!isFinite(t50) && S.sw[i] >= 0.5 * del / Dg * C.sr) t50 = S.t[i]; if (!isFinite(t90) && S.r[i] * Dg >= 0.9 * rss) { t90 = S.t[i]; break; } }
  const out = { tr_v: V * 3.6, tr_del: del / Dg, tr_sw: del / Dg * C.sr, tr_rss: rss / Dg, tr_r: rEnd / Dg, tr_gain: rss / del, tr_ay: S.ay.at(-1), tr_os: (pk / rss - 1) * 100,
                tr_t90: t90 - t50, tr_wn: wn / (2 * Math.PI), tr_zeta: ze, tr_beta: S.beta.at(-1), tr_phi: S.phi.at(-1),
                tr_phis: Kp - ms * g * hp > 0 ? ms * hp * ayT / (Kp - ms * g * hp) / Dg : NaN, tr_kus: K * g / Dg };   // tr_kus = 2 자유도 언더스티어 구배 [deg/g] (축 코너링 강성)
  return { out, s: S };
}

// 입력 확인: 값은 실제 크기만 뜻함 (0 · 음수 = 계산 불가). 기능을 끄는 것은 각 단추
function checkIn(I) {
  const bad = (c, msg) => { if (c) throw new Error(msg); };
  bad(!(I.n_s > 0) || !(I.n_p > 0) || !(I.c_ah > 0) || !(I.c_vnom > 0), '축전지: 직렬 수 · 병렬 수 · 셀 용량 · 셀 공칭 전압이 0 보다 크거나, 직렬 수 0 이면 팩 최대 전압 · 팩 용량이 0 보다 커야 합니다 (축전지).');
  bad(!(I.i_pk > 0), '인버터 피크 상전류는 0 보다 커야 합니다 (모터 · 인버터 › 인버터 전류 한계).');
  bad(!(I.kt > 0), '모터 토크 상수 K_t 는 0 보다 커야 합니다 (모터 · 인버터 › 모터 한계).');
  bad(I.ict_m !== 0 && !(I.i_ct >= 0), '인버터 연속 상전류를 넣으세요.');
  bad(I.wc_on !== 0 && !(I.w_car > 0), '차 크기 고려가 켜져 있으면 차 전폭은 0 보다 커야 합니다 (차량 제원 › 치수).');
  bad(I.dl_on !== 0 && !steerGeo(I).tab && !(I.delta_max > 0), '조향 한계 고려가 켜져 있으면 최대 조향각은 0 보다 커야 합니다 (조향).');
  bad(I.fz0_m !== 0 && !(I.tire_fz0 > 0), '타이어 기준 하중을 값으로 쓰면 0 보다 커야 합니다 (타이어).');
  bad(I.rg_on === 1 && !(I.rg_tmax > 0), '회생 제동이 켜져 있으면 회생 토크 상한은 0 보다 커야 합니다.');
  bad(I.rg_on === 1 && !(I.i_chg > 0), '회생 제동이 켜져 있으면 팩 충전 전류 한계는 0 보다 커야 합니다.');
}

// 팩 값 직접 입력 (직렬 수 0): 팩 최대 · 공칭 · 최소 전압 [V] · 팩 용량 [Ah] → 같은 셀 값으로 바꿔 아래 계산을 그대로 씀
//   직렬 수 = 팩 최대 ÷ 셀 최대 (정수가 아니어도 됨, 셀 표 OCV 의 크기 기준), 셀 공칭 · 최소 = 팩 값 ÷ 직렬 수, 병렬 1 · 셀 용량 = 팩 용량
function packCell(I) { if (I.n_s > 0 || !(I.p_vmax > 0)) return I;
  const cv = I.c_vmax > 0 ? I.c_vmax : 4.2, Ns = I.p_vmax / cv;
  return Object.assign(I, { n_s: Ns, n_p: 1, c_vmax: cv, c_vnom: (I.p_vnom > 0 ? I.p_vnom : I.p_vmax) / Ns, c_vmin: (I.p_vmin > 0 ? I.p_vmin : I.p_vmax) / Ns, c_ah: I.p_ah }); }
function calcT2(I) {
  VC = new Map(); VCF = new Map(); packCell(I);
  if (!I._probe) checkIn(I);

  // ---------- 구동력 선도 프로브: 그 점의 감속비 · 전압 · 모터 온도 · 가속도로 선도만
  if (I._probe) { RLI = {}; const p = I._probe; return { out: {}, ft: tractive(I, p.gr, p.V, p.Tm, p.ay, p.ax) }; }

  // ---------- 입력 훑기: 입력 감속비로 종목 기록만 (줄여 셈)
  if (I._sweep) {
    prepLines(I, true); prepBody(I, true); prepTrans(I, true);
    const E = events(I, I.gr, true);
    const NL = E.EN ? (E.EN.k < 1 || E.EN.lam > 0 ? endurance(endI(I), car(endI(I), I.gr, 1), false, 3) : E.EN) : null;   // 출력 상한 · 타력 없이 (줄여 셈)
    return { out: { t_acc_s: E.acc, t_skid_s: E.skid, t_ax_s: E.ax, t_end_s: E.end, e_use: E.EN ? E.EN.Ec / 3.6e6 : NaN, e_nl_c: NL ? NL.Ec / 3.6e6 : NaN,
                    p_lim: E.EN ? E.EN.k * 100 : NaN, vmax: E.C.vtop * 3.6, ay_skid: skidAy(E) } };
  }

  // ---------- 주행선 다듬기 (I.rl_on = 2): 입력이 바뀌었을 때만
  prog(0, '준비 중');                                   // 진행 막대를 바로 숫자로 (흐르는 막대로 바뀌지 않게)
  prepLines(I, false);
  steerCheck(I);                                        // 모델 2 이상: 조향으로 못 도는 코너가 있으면 여기서 멈춤
  prepBody(I, false);                                   // 모델 2 이상: 차체가 경계에 닿지 않는 속도 상한
  prepTrans(I, false);                                  // 모델 3: 과도 상한

  // ---------- 진행: 남은 [PG0, 1] 을 감속비 훑기 60 % · 가장 빠른 감속비 내구 10 % · 두 모드 20 % · 내 코스 10 % 로
  const P = (a, msg) => prog(PG0 + (1 - PG0) * a, msg);
  P(0, '감속비 훑는 중');
  // ---------- 감속비 (두 모드 공통): 종목별 가장 빠른 값 · 배점 가중 제안, 그 감속비에서 다 계산한 기록
  const B = bestGr(I, f => P(0.6 * f, '감속비 훑는 중'));
  P(0.6, '기록 계산 중');
  const ENb  = runEnd(I, B.end, true);                   // 내구가 가장 빠른 감속비에서 다 계산
  const endb = ENb ? lapStat(ENb.t, [0, ENb.n1]) : null;
  const fast = {
    acc: runAcc(car(accI(I), B.acc, 1)).t[0],
    ax:  (runAx(I, car(I, B.ax, 1), 1) || { t: [NaN] }).t[0],
    end: ENb ? ENb.T : NaN,
  };
  const BF = I.course === 'free' ? bestGrFree(I) : NaN;   // 내 코스: 최적 모드에서 고른 코스 감속비

  // ---------- 두 모드를 미리 계산 (전환은 다시 계산 없이)
  P(0.7, '기록 계산 중 · 내 감속비');
  const my = modeRun(I, I.gr, I.gr, fast);
  P(0.8, '기록 계산 중 · 최적 감속비');
  const G3 = ({ acc: B.acc, ax: B.ax, end: B.end, free: BF, skid: B.opt })[I.course];
  const g3  = isFinite(G3) ? G3 : B.opt;
  const opt = B.opt === I.gr && g3 === I.gr ? { ...my, out: { ...my.out } } : modeRun(I, B.opt, g3, fast);
  const common = {
    gr_opt: B.opt, gr_acc: B.acc, gr_ax: B.ax, gr_end: B.end,
    tb_acc: fast.acc, tb_ax: fast.ax, tb_end: fast.end, tb_end1: endb ? endb.first : NaN, tb_endavg: endb ? endb.avg : NaN,
    n_base: nBase(I, car(I, I.gr, 1)),
  };
  const C = car(I, I.gr, 1);
  Object.assign(common, {
    v_load: C.Voc(1) - Math.min(C.Imax, C.Voc(1) / (2 * Math.max(C.Rb, 1e-9))) * C.Rb,   // 최대 전류 때 단자 전압 [V]
    p_max: C.ptMax(C.Voc(1)) / 1000,                                                       // 단자 출력 상한 [kW]
    e_cap: C.Ecap / 3.6e6, g_skid: I.t_skid,
  });
  if (C.md2) common.k_us_lin = C.kUs;                                                     // 모델 2 이상: 선형 언더스티어 구배 [deg/g]
  const TR = I.md === 3 ? stepSteer(I, C) : null;                                        // 모델 3: 계단 조향 과도 응답 (감속비와 상관없음)
  if (TR) Object.assign(common, TR.out);
  Object.assign(my.out, common); Object.assign(opt.out, common);
  if (TR) { my.tr = TR.s; opt.tr = TR.s; }

  // ---------- 내 코스 (검증 · 대시보드용, 입력 감속비)
  P(0.9, '기록 계산 중 · 내 코스');
  const FR = runFree(I, C, 0.5, false);
  if (FR) {
    const fr = lapStat(FR.t, [0]);
    const fo = { t_free: fr.total, t_free1: fr.first, t_freeavg: fr.avg, n_free: FR.m, t_free2: FR.t.length > 1 ? FR.t[1] : NaN,
                 e_free: FR.Et[Math.min(1, FR.Et.length - 1)] / 3.6e6 };
    Object.assign(my.out, fo); Object.assign(opt.out, fo);
  }

  // ---------- 모터 · 효율 그림 (입력 감속비, SOC 100 %, 출발 모터 온도)
  const Vn = I.n_s * I.c_vnom, NN = Array.from({ length: 131 }, (_, i) => I.nmax * i / 130);
  const motor = { n: NN,
    tref:  NN.map(n => C.Tcurve(n, I.v_ref * (I.ke_ratio > 0 ? I.ke_ratio : 1))),
    tnom:  NN.map(n => C.Tcurve(n, Vn)),
    tload: NN.map(n => C.Tcurve(n, common.v_load)) };
  const ft = tractive(I, I.gr, C.Voc(1), C.Tinit, 0, 0);

  const cur = I.grMode === 'opt' ? opt : my;
  P(1, '마무리');
  return { ...cur, modes: { my, opt }, motor, ft };
}

// ================================================================
// 도구 2 목표 · 요구값 (경량 시뮬) — 계산 코드. 위는 도구 2P 계산 코드 그대로 (calc → calcT2)
// ================================================================
// 목적: 설계 초반 (도구 1 직후: 질량 · 무게중심 · 휠베이스 · 트레드 · 타이어 외경 · 모터 토크 선도만 있을 때) 종목 목표를 정하면
//       그 목표를 내려면 다른 파트가 무엇을 얼마나 해야 하는지 (요구값) 를 목표 축 위에 함께 보임.
// 이상화 (아직 정해지지 않은 계통): 축전지 = 이상 전원 (전압 = 모터 기준 전압, 내부 저항 0, 전류 한계 없음, 에너지 상한 없음) → 필요한 에너지 · 출력 · 전류를 결과로,
//   인버터 전류 한계 없음, 열 모델 끔, 차량 모델 0, 주행선 = 최소 곡률 선, 효율 = 상수. 다운포스 → 항력은 양항비 LD 로 묶음 (C_D·A = 차체 C_D·A + C_L·A ÷ LD)
// 계산: 설계 손잡이 (C_L·A · 질량 · 모터 토크 배율 · 타이어 μ · 무게중심 높이 · 앞 무게 비율 · 감속비) 를 하나씩 기본값에서 훑어 (나머지는 기본값)
//   매 점의 종목 기록 (도구 2P 줄여 셈: 내구 3 랩 근사) · 내구 에너지 · 평균 출력 등을 기록 → 가로축을 고른 종목 기록으로 뒤집어 (단조 구간 선형 보간)
//   '이 기록을 내려면 그 손잡이가 얼마여야 하나' 를 목표 격자 위에 모든 손잡이 같이 그림. 닿지 못하는 목표는 빈칸.
//   스키드패드 목표에는 CoP 를 무게 배분에서 ±5 %p 옮긴 C_L·A 곡선을 같이 (한쪽 축이 먼저 한계 → 다운포스가 더 필요)
// 현실 운전자 (도구 2P 와 같은 k_s · k_e) 의 내구 시간 · 에너지를 같이 계산 (범위)
const RHO_G = 1.225;
const GLV = [
  ['cla', 'C_L·A', 'm²', I => { const a = []; for (let x = 0; x <= 6.0001; x += 0.5) a.push(+x.toFixed(2)); return a; }],
  ['m', '질량', 'kg', I => [-60, -45, -30, -15, 0, 15, 30, 45].map(d => I.m + d)],
  ['tq', '모터 토크 배율', '%', I => [50, 60, 70, 80, 90, 100, 115, 130, 150]],
  ['mu', '타이어 μ', '', I => [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]],
  ['h', '무게중심 높이', 'mm', I => [200, 225, 250, 275, 300, 325, 350]],
  ['fr', '앞 무게 비율', '%', I => [35, 40, 45, 47.5, 50, 55]],
  ['gr', '감속비', '', I => [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]],
];
// 가로축 목표: [키, 이름, 단위, 좋은 쪽 (−1 = 작을수록 · +1 = 클수록)]
const GTG = [['acc', '가속', 's', -1], ['skid', '스키드패드 (좌우 합)', 's', -1], ['ax', '오토크로스', 's', -1], ['end', '내구 (이상 운전자)', 's', -1],
             ['ax0', '출발 종가속도 (정지에서 최대)', 'g', 1], ['ay', '스키드패드 횡가속도', 'g', 1], ['e_end', '내구 단자 에너지 (이상 운전자)', 'kWh', -1]];
function gBase(I) {
  const B = I.base || {}, X = { ...B };
  ['m', 'fr', 'h', 'L', 'tf', 'tr', 'r_eff', 'mu', 'mu_s', 'crr', 'gr', 'eta_dt', 'eta_mot', 'eta_inv', 'pmax', 'nmax', 'tmax', 'xcop', 'hcop', 'lltd', 'j_eq', 'dr_ks', 'dr_ke'].forEach(k => { if (isFinite(I[k])) X[k] = I[k]; });
  if (Array.isArray(I.motor)) X.motor = I.motor;
  const cl = Math.max(0, I.cla || 0), ld = I.ld > 0 ? I.ld : 2.5;
  X.cla = cl; X.cda = Math.max(0, I.cda0 || 0) + cl / ld;
  // 이상 전원 · 계통 끔
  const vr = X.v_ref > 0 ? X.v_ref : 400, ns = X.n_s > 0 ? X.n_s : 100;
  Object.assign(X, { md: 0, rl_on: 1, th_on: 0, in_on: 0, bt_on: 0, cw_on: 0, rg_on: 0, drv: 0, e_lim: 0, dr_real: 0, dl_on: 0, wc_on: 0,
    c_vmax: vr / ns, c_vmin: vr / ns, c_vnom: vr / ns, n_s: ns, r_pack: 0, i_bms_max: 1e6, i_pk: 1e6, ict_m: 1, i_ct: 1e6, effM: null, effI: null, eff_mg: 0,
    motorC: [], course: 'end', grMode: 'my', _sweep: 0, _probe: 0 });
  return X;
}
// xcop: 뒤축에서 앞으로 거리 [mm] (도구 2P 정의). CoP = 무게 배분이면 앞축 몫 = 앞 무게 비율 → 뒤축에서 L × 앞 몫
const copW = X => X.L * X.fr / 100;
function gEval(X, real) {
  VC = new Map(); VCF = new Map();
  prepLines(X, true); prepBody(X, true); prepTrans(X, true);
  const E = events(X, X.gr, true), EN = E.EN, C = E.C;
  const r = { acc: E.acc, skid: E.skid, ax: E.ax, end: EN ? EN.T : NaN, e_end: EN ? EN.Et / 3.6e6 : NaN,
    p_avg: EN && EN.T > 0 ? EN.Et / EN.T / 1000 : NaN, ay: E.vs > 0 ? E.vs * E.vs / SK_R / g : NaN,
    df100: 0.5 * RHO_G * X.cla * (100 / 3.6) ** 2, dr100: 0.5 * RHO_G * X.cda * (100 / 3.6) ** 2,
    tw: (X.tmax || 0) * X.gr * (X.eta_dt / 100) / (X.r_eff / 1000),
    ax0: C && C.aDrive ? C.aDrive(0, 0, 0, C.Voc(1), C.Tinit) / g : NaN };   // 출발 종가속도: 정지에서 구동 한계 (접지 · 토크 중 작은 쪽, 도구 2P 의 ax_0 와 같은 식)
  if (real) { VC = new Map(); VCF = new Map(); const R = runEnd({ ...X, dr_real: 1 }, X.gr, false); r.end_r = R ? R.T : NaN; r.e_end_r = R ? R.Et / 3.6e6 : NaN; }
  return r;
}
// 손잡이 값 → 입력
function gSet(X0, k, v) { const X = { ...X0 };
  if (k === 'cla') { X.cla = v; X.cda = X0.__cda0 + v / X0.__ld; }
  else if (k === 'tq') { X.tmax = X0.tmax * v / 100; X.motor = (X0.motor || []).map(([n, t]) => [n, t * v / 100]); }
  else X[k] = v;
  if (X0.__copw && (k === 'fr' || k === 'cla')) X.xcop = copW(X) + X0.__copd;
  return X; }
// 단조 구간 역보간: 목표 y → 손잡이 x (xs 오름차순, ys 기록). 기록이 늘거나 줄거나 한쪽이어야 (아니면 처음 단조 구간만)
function gInv(xs, ys, y, x0) {
  let best = NaN;
  for (let i = 0; i < xs.length - 1; i++) { const a = ys[i], b = ys[i + 1]; if (!isFinite(a) || !isFinite(b) || a === b) continue;
    if ((y - a) * (y - b) <= 0) { const x = xs[i] + (xs[i + 1] - xs[i]) * (y - a) / (b - a); if (!isFinite(best) || (isFinite(x0) && Math.abs(x - x0) < Math.abs(best - x0))) best = x; } }
  return best; }   // 해가 여럿이면 (기록이 손잡이에 대해 오르내림) 기본값에 가장 가까운 것
const gInterp = (xs, ys, x) => { if (!isFinite(x)) return NaN; for (let i = 0; i < xs.length - 1; i++) if ((x - xs[i]) * (x - xs[i + 1]) <= 0) { const t = (x - xs[i]) / ((xs[i + 1] - xs[i]) || 1); return ys[i] + (ys[i + 1] - ys[i]) * t; } return NaN; };
function calc(I) {
  const X0 = gBase(I);
  X0.__ld = I.ld > 0 ? I.ld : 2.5; X0.__cda0 = Math.max(0, I.cda0 || 0); X0.__copw = I.cop_m !== 0; X0.__copd = 0;
  if (X0.__copw) X0.xcop = copW(X0);
  if (!(X0.m > 0) || !(X0.L > 0)) throw new Error('질량 · 휠베이스는 0 보다 커야 합니다.');
  checkIn(X0);
  prog(0.02, '주행선 (최소 곡률) 준비 중');
  prepLines(X0, false);
  const base = gEval(X0, true);
  const TG = GTG[Math.max(0, Math.min(GTG.length - 1, Math.round(I.tg || 0)))], tg = TG[0];
  // 손잡이마다 앞으로 훑기
  const SW = {}; let done = 0; const tot = GLV.reduce((a, L) => a + L[3](X0).length + 1, 0) + 2 * 13;
  const bx = k => k === 'tq' ? 100 : X0[k];   // 기본값 (손잡이 격자에 넣음)
  for (const [k, nm, u, rng] of GLV) { const xs = [...new Set([...rng(X0), bx(k)])].sort((p, q) => p - q), rows = [];
    for (const v of xs) { rows.push(gEval(gSet(X0, k, v), k === 'cla' || k === 'm' || k === 'tq')); prog(0.05 + 0.9 * (++done) / tot, \`훑는 중 · \${nm}\`); }
    SW[k] = { xs, rows }; }
  // CoP ±5 %p (C_L·A 훑기)
  const SWc = {};
  if (X0.__copw) for (const dp of [-5, 5]) { const xs = GLV[0][3](X0), rows = [];
    for (const v of xs) { const X = gSet({ ...X0, __copd: X0.L * dp / 100 }, 'cla', v); rows.push(gEval(X, false)); prog(0.05 + 0.9 * (++done) / tot, 'CoP 옮겨 훑는 중'); }
    SWc[dp] = { xs, rows }; }
  // 목표 격자: 모든 손잡이가 닿는 기록 범위 (기본 기록 ± 일부)
  const all = Object.values(SW).flatMap(s => s.rows.map(r => r[tg])).filter(isFinite);
  const lo = Math.min(...all), hi = Math.max(...all), y0 = base[tg];
  // 시간 · 에너지 (작을수록 좋음) = 기본의 0.75 ~ 1.15 배, 가속도 (클수록 좋음) = 0.85 ~ 1.25 배
  const a = Math.max(lo, y0 * (TG[3] > 0 ? 0.85 : 0.75)), b = Math.min(hi, y0 * (TG[3] > 0 ? 1.25 : 1.15)), N = 60, ys = [];
  for (let i = 0; i <= N; i++) ys.push(a + (b - a) * i / N);
  const sig = {};
  for (const [k] of GLV) { const s = SW[k], rec = s.rows.map(r => r[tg]); sig['q_' + k] = ys.map(y => gInv(s.xs, rec, y, bx(k))); }
  for (const dp of [-5, 5]) { const s = SWc[dp]; if (!s) continue; const rec = s.rows.map(r => r[tg]); sig['q_cla' + (dp < 0 ? 'm' : 'p')] = ys.map(y => gInv(s.xs, rec, y, X0.cla)); }
  // 딸린 값: 그 손잡이로 목표를 낼 때
  const side = (k, f) => { const s = SW[k]; return sig['q_' + k].map(x => gInterp(s.xs, s.rows.map(f), x)); };
  sig.df_cla = side('cla', r => r.df100); sig.dr_cla = side('cla', r => r.dr100);
  sig.e_cla = side('cla', r => r.e_end); sig.er_cla = side('cla', r => r.e_end_r); sig.p_cla = side('cla', r => r.p_avg);
  sig.e_tq = side('tq', r => r.e_end); sig.tw_tq = side('tq', r => r.tw); sig.p_tq = side('tq', r => r.p_avg);
  sig.e_m = side('m', r => r.e_end); sig.ay_cla = side('cla', r => r.ay);
  // 목표 탐침 (입력한 목표값에서 각 손잡이 요구값)
  const pv = I.tg_v > 0 ? I.tg_v : y0, out = {};
  for (const [k] of GLV) { const s = SW[k]; out['p_' + k] = gInv(s.xs, s.rows.map(r => r[tg]), pv, bx(k)); }
  out.p_df = isFinite(out.p_cla) ? 0.5 * RHO_G * out.p_cla * (100 / 3.6) ** 2 : NaN;
  out.p_cda = isFinite(out.p_cla) ? X0.__cda0 + out.p_cla / X0.__ld : NaN;
  out.p_e = gInterp(SW.cla.xs, SW.cla.rows.map(r => r.e_end), out.p_cla);
  Object.assign(out, { b_acc: base.acc, b_skid: base.skid, b_ax: base.ax, b_end: base.end, b_e: base.e_end, b_end_r: base.end_r, b_e_r: base.e_end_r,
    b_p: base.p_avg, b_ay: base.ay, b_df: base.df100, b_dr: base.dr100, b_cda: X0.cda, b_xcop: X0.xcop, b_tw: base.tw, b_ax0: base.ax0,
    q_heat: base.p_avg * (1 - (X0.eta_mot / 100) * (X0.eta_inv / 100)), i_avg: base.p_avg * 1000 / (X0.n_s * X0.c_vnom), tg_v_o: pv });
  prog(1, '');
  return { out, x: { d: ys }, sig };
}
`
};
