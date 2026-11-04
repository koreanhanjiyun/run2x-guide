/* ============================================================
   도구 2 — 랩타임 · 점수 시뮬레이터 (QSS, 감속비 최적화 포함) · docs/TOOLS-PLAN.md 5절
   - 점질량 + 앞뒤 하중 이동(가속 · 항력 · 다운포스) · 뒤축 구동(모터 1개) · 마찰원
   - 종목: 가속(직선) · 스키드패드(정상 선회) · 오토크로스(트랙 역방향 한 바퀴, 정지 출발) · 내구(같은 트랙, 드라이버 2명 각각 정지 출발)
   - 점수식: FSK 2026 경기진행규정 제8~11조 · 에너지 효율 제12조의 CO₂ 환산 (출처는 참고 탭)
   - 트랙 · 모터 곡선은 작업창 위 표(구간 목록 · 회전수-토크 표). 이 브라우저에 기억하고 .json 내보내기에 함께 들어감
   ============================================================ */
const T2KEY = 'run2x.wb.2.ext';
/* 예시 트랙: 경기진행규정 제10조 ②의 구간 기준(직선 ≤ 70 m, 회전 지름 30 ~ 60 m, 헤어핀 바깥 지름 ≥ 9 m, 슬라럼 간격 7 ~ 15 m)으로 만든 가상 코스, 한 바퀴 약 760 m */
const T2TRACK_EX = '25, 0   # 출발 직선\n5, 25   # 슬라럼 (파일런 간격 10 m)\n10, -25\n10, 25\n10, -25\n10, 25\n10, -25\n10, 25\n5, -25\n20, 0\n31.42, 20   # 왼쪽 90° (지름 40 m)\n40, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n30, 0\n15.71, 5   # 왼쪽 헤어핀 (지름 10 m)\n35, 0\n17.28, -5.5   # 오른쪽 헤어핀 (지름 11 m)\n35, 0\n23.56, 15   # 왼쪽 90° (지름 30 m)\n50, 0\n20.94, 30   # 완만한 굽이\n20.94, -30\n40, 0\n21.82, 25   # 반경이 줄어드는 왼쪽 회전\n8.38, 12\n42.32, 0\n15.71, 5   # 왼쪽 헤어핀\n30, 0\n17.28, -5.5   # 오른쪽 헤어핀\n25, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n20, 0\n28.27, 18   # 왼쪽 90° (지름 36 m)\n12.99, 0   # 결승 직선';
const T2 = { tab:'track', view:'ax', track:T2TRACK_EX, motor:'', timer:0 };
try{ const s = JSON.parse(localStorage.getItem(T2KEY) || '{}') || {};
  if(typeof s.track==='string') T2.track = s.track; if(typeof s.motor==='string') T2.motor = s.motor; if(['ax','end','acc','ft'].includes(s.view)) T2.view = s.view; }catch(e){}
const t2Save = () => { try{ localStorage.setItem(T2KEY, JSON.stringify({track:T2.track, motor:T2.motor, view:T2.view})); }catch(e){} };

/* 글 → 숫자 표. 한 줄에 숫자 두 개(쉼표 · 칸 · 탭으로 구분), # 뒤는 메모 */
function t2Rows(txt){ const rows = [], bad = [];
  String(txt || '').split(/\r?\n/).forEach((ln, i) => { const s = ln.replace(/#.*/, '').trim(); if(!s) return;
    const p = s.split(/[\s,;\t]+/).filter(Boolean).map(Number); if(p.length >= 2 && p.slice(0, 2).every(isFinite)) rows.push([p[0], p[1]]); else bad.push(i + 1); });
  return {rows, bad}; }
function t2Track(){ const {rows, bad} = t2Rows(T2.track), segs = rows.filter(r => r[0] > 0); return {segs, bad, len: segs.reduce((a, r) => a + r[0], 0)}; }
function t2Motor(){ const {rows, bad} = t2Rows(T2.motor); return {pts: rows.filter(r => r[0] >= 0 && r[1] >= 0).sort((a, b) => a[0] - b[0]), bad}; }
/* 구간 → 평면 좌표 (지도 그림 · 끝점 차이) */
function t2Geom(segs, ds){ let x = 0, y = 0, h = 0; const X = [0], Y = [0];
  segs.forEach(([l, R]) => { const n = Math.max(1, Math.ceil(l/ds)), st = l/n;
    for(let i = 0; i < n; i++){ if(!R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/R; x += R*(Math.sin(h + dh) - Math.sin(h)); y -= R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } X.push(x); Y.push(y); } });
  return {X, Y, gap: Math.hypot(x, y), turn: h*180/Math.PI}; }
const t2ExtraI = () => ({track: t2Track().segs, motor: t2Motor().pts, view: T2.view});

/* ---------- 작업창 위 표: 트랙 · 모터 곡선 ---------- */
const T2VIEW = [['ax','오토크로스 한 바퀴'], ['end','내구 한 바퀴 (달리는 중)'], ['acc','가속'], ['ft','구동력 선도']];
function t2ExtHTML(){ const tabs = [['track','트랙'], ['motor','모터 곡선']];
  return `<section class="wb-sec t2-ext" aria-label="트랙 · 모터 곡선"><div class="wb-h t2-h"><div class="m1-tabs" role="tablist">${tabs.map(([k, t]) => `<button type="button" role="tab" data-t2tab="${k}" aria-selected="${T2.tab===k}">${t}</button>`).join('')}</div>
      <span class="t2-vw"><span class="muted">결과 그래프</span><span class="dc-seg" role="group" aria-label="결과 그래프에 그릴 것">${T2VIEW.map(([k, t]) => `<button type="button" data-t2view="${k}" aria-pressed="${T2.view===k}">${t}</button>`).join('')}</span></span></div>
    ${T2.tab==='track' ? t2TrackHTML() : t2MotorHTML()}</section>`; }
function t2TrackMsg(){ const T = t2Track(), G = t2Geom(T.segs, 1);
  if(!T.segs.length) return '<span class="wb-err">구간이 없습니다. 한 줄에 "길이, 반경"을 적으십시오.</span>';
  return `한 바퀴 <b>${wbFmt(T.len, 1)}</b> m · 구간 ${T.segs.length}개 · 끝점이 출발점에서 ${wbFmt(G.gap, 1)} m${G.gap > 5 ? ' (지도에서만 벌어져 보임, 계산에는 영향 없음)' : ''}${T.bad.length ? ` · <span class="wb-err">${T.bad.slice(0, 5).join(', ')}번째 줄은 읽지 못함</span>` : ''}`; }
function t2TrackHTML(){ return `<div class="t2-tr"><div class="t2-ed"><label for="t2trk">구간 목록 <span class="muted">한 줄에 <b>길이 m, 반경 m</b> · 반경은 왼쪽 회전 +, 오른쪽 −, 직선 0 · # 뒤는 메모</span></label>
      <textarea id="t2trk" data-t2txt="track" spellcheck="false" rows="13">${wbEsc(T2.track)}</textarea>
      <div class="t2-msg" id="t2tmsg">${t2TrackMsg()}</div>
      <div class="t2-btns"><button type="button" class="btn small" data-t2ex="track">예시 트랙으로</button><span class="muted">오토크로스는 이 트랙을 거꾸로, 내구는 이 방향으로 돕니다.</span></div></div>
    <figure class="t2-map"><div id="t2map">${t2MapSVG()}</div><figcaption class="muted" id="t2mcap"></figcaption></figure></div>`; }
/* 트랙 지도: 계산 결과가 있으면 차속 색(느림 파랑 → 빠름 빨강) + 커서 위치 */
function t2MapSVG(){ const R = WB.id==='2' ? WB.R : null, lap = R && R.map && (T2.view==='ax' || T2.view==='end');
  const G = lap ? R.map : t2Geom(t2Track().segs, 2); if(G.X.length < 2) return '';
  const xs = G.X, ys = G.Y, x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 20, W = 360, H = 240;
  const s = Math.min((W - 2*pad)/Math.max(1, x1 - x0), (H - 2*pad)/Math.max(1, y1 - y0)), ox = (W - (x1 - x0)*s)/2, oy = (H - (y1 - y0)*s)/2;
  const P = i => [(ox + (xs[i] - x0)*s).toFixed(1), (H - oy - (ys[i] - y0)*s).toFixed(1)];
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="t2-msvg" role="img" aria-label="트랙 지도">`;
  if(lap){ const v = R.sig.v, N = xs.length, at = i => R.map.rev ? N - 1 - i : i, lo = Math.min(...v), hi = Math.max(...v), st = Math.max(1, Math.floor(N/600));
    for(let i = 0; i + st < N; i += st){ const vi = v[at(i)], f = hi > lo && isFinite(vi) ? (vi - lo)/(hi - lo) : .5, a = P(i), b = P(Math.min(N - 1, i + st));
      svg += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="hsl(${(230 - 230*f).toFixed(0)} 75% 45%)" stroke-width="4" stroke-linecap="round"/>`; }
    const c = P(at(Math.min(N - 1, WB.xi))); svg += `<circle cx="${c[0]}" cy="${c[1]}" r="6" class="t2-cur"/>`;
    const capEl = () => `느림 ${wbFmt(lo, 0)} km/h <i class="t2-grad"></i> 빠름 ${wbFmt(hi, 0)} km/h · ${R.map.rev ? '오토크로스는 지도와 반대 방향' : '지도 방향 그대로'} · 점 = 커서`; setTimeout(() => { const c2 = $('#t2mcap'); if(c2) c2.innerHTML = capEl(); }, 0); }
  else { svg += `<polyline points="${xs.map((_, i) => P(i).join(',')).join(' ')}" class="t2-line"/>`; setTimeout(() => { const c2 = $('#t2mcap'); if(c2) c2.textContent = T2.view==='acc' || T2.view==='ft' ? '결과 그래프를 오토크로스나 내구로 바꾸면 차속 색으로 칠합니다.' : ''; }, 0); }
  const a = P(0); svg += `<circle cx="${a[0]}" cy="${a[1]}" r="4.5" class="t2-st"/><text x="${+a[0] + 8}" y="${+a[1] < 30 ? +a[1] + 16 : +a[1] - 8}" class="t2-stt">출발 · 결승</text>`;
  return svg + '</svg>'; }
function t2MotorMsg(){ const M = t2Motor();
  return M.pts.length ? `표 ${M.pts.length}점 · 표 사이는 직선으로 잇고, 표 범위 밖은 끝 값. 최고 회전수는 입력 칸과 표 끝 중 낮은 값${M.bad.length ? ` · <span class="wb-err">${M.bad.slice(0, 5).join(', ')}번째 줄은 읽지 못함</span>` : ''}`
    : '표가 비어 있어 입력 칸의 <b>모터 최대 토크</b>와 <b>최고 출력 × 모터 · 인버터 효율</b>로 곡선을 만듭니다 (낮은 회전수는 토크 일정, 높은 회전수는 출력 일정).'; }
function t2MotorHTML(){ return `<div class="t2-tr"><div class="t2-ed"><label for="t2mot">회전수 - 토크 표 <span class="muted">한 줄에 <b>회전수 rpm, 토크 N·m</b> (모터 축) · 비우면 입력 칸 값으로</span></label>
      <textarea id="t2mot" data-t2txt="motor" spellcheck="false" rows="10" placeholder="0, 230&#10;4000, 230&#10;6500, 140">${wbEsc(T2.motor)}</textarea>
      <div class="t2-msg" id="t2mmsg">${t2MotorMsg()}</div>
      <div class="t2-btns"><button type="button" class="btn small" data-t2ex="motor">표 비우기</button><span class="muted">축전지 출력 상한(최고 출력)은 표가 있어도 함께 적용됩니다.</span></div></div>
    <figure class="t2-mc" id="t2mc">${t2MotorPlot()}</figure></div>`; }
/* 모터 곡선 그림: 계산에 실제로 쓰는 토크(축전지 출력 상한 반영)와 모터 축 출력 */
function t2MotorPlot(){ const I = WB.id==='2' ? WB.I : null; if(!I) return '';
  const M = t2Motor().pts, nmax = M.length ? Math.min(I.nmax, M[M.length - 1][0]) : I.nmax, Pm = I.pmax*1000*I.eta_m/100;
  const Tm = n => { let T; if(!M.length) T = I.tmax; else if(n <= M[0][0]) T = M[0][1]; else { T = M[M.length - 1][1]; for(let i = 1; i < M.length; i++) if(n <= M[i][0]){ const a = M[i - 1], b = M[i]; T = a[1] + (b[1] - a[1])*(n - a[0])/(b[0] - a[0]); break; } }
    const w = n*2*Math.PI/60; return w > 0 ? Math.min(T, Pm/w) : T; };
  const N = Array.from({length:81}, (_, i) => nmax*i/80), T = N.map(Tm), P = N.map((n, i) => T[i]*n*2*Math.PI/60/1000);
  return wbPlot({id:'t2m', w:520, h:230, x:{d:N, n:'모터 회전수', u:'rpm'}, ys:[{k:'T', d:T, c:WB_COL[0], n:'토크', u:'N·m'}, {k:'P', d:P, c:WB_COL[2], n:'출력', u:'kW'}], norm:true, act:'T', label:'모터 곡선'})
    + `<div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>토크 [N·m] (왼쪽 눈금)</span><span><i style="background:${WB_COL[2]}"></i>모터 축 출력 [kW]</span><span class="muted">최고 ${wbFmt(Math.max(...P), 1)} kW</span></div>`; }
function t2Text(k, v){ T2[k] = v; t2Save(); clearTimeout(T2.timer);
  T2.timer = setTimeout(() => { if(k==='track'){ const m = $('#t2tmsg'); if(m) m.innerHTML = t2TrackMsg(); }
    else { const m = $('#t2mmsg'); if(m) m.innerHTML = t2MotorMsg(); const c = $('#t2mc'); if(c) c.innerHTML = t2MotorPlot(); }
    wbRefresh(); t2PartDirty(); }, 350); }
document.addEventListener('input', e => { const t = e.target; if(!t.matches || !t.matches('#wbext [data-t2txt]')) return; t2Text(t.dataset.t2txt, t.value); });
document.addEventListener('click', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  const tb = t.closest('[data-t2tab]'); if(tb){ T2.tab = tb.dataset.t2tab; wbPaint(['ext']); return; }
  const vw = t.closest('[data-t2view]'); if(vw){ T2.view = vw.dataset.t2view; t2Save(); WB.xi = 0;
    WB.sel = new Set(T2.view==='ft' ? ['f_m','f_x','f_res'] : ['v','ax','pbat']); WB.act = ''; if(!WB.xa.startsWith('in:')) WB.xa = '';
    wbPaint(['ext']); wbRefresh(); return; }
  const ex = t.closest('[data-t2ex]'); if(ex){ const k = ex.dataset.t2ex; T2[k] = k==='track' ? T2TRACK_EX : ''; t2Save(); wbPaint(['ext']); wbRefresh(); t2PartDirty(); } });

/* ---------- 결과 카드 도우미 ---------- */
const t2Pts = mx => v => isFinite(v) ? `<b>${wbFmt(v, 1)}</b> <i>/ ${mx}점</i>` : '<b>-</b>';
const t2Co2 = v => isFinite(v) ? `<b>${wbFmt(v, 2)}</b> <i>kg/100 km</i>${v > 60.06 ? ' <span class="wb-err">실격 기준 60.06 초과</span>' : ' <span class="muted">(실격 기준 60.06 이하)</span>'}` : '<b>-</b>';

/* ---------- 이 탭 사용법 ---------- */
function t2TourTab(tab){ if(!T2.tourUndo && typeof tgUndo==='function'){ const t0 = T2.tab; T2.tourUndo = true; tgUndo(() => { T2.tourUndo = false; if(T2.tab!==t0){ T2.tab = t0; wbPaint(['ext']); } }); }
  if(T2.tab!==tab){ T2.tab = tab; wbPaint(['ext']); } }
const t2TT = tab => ({click:{sel:`#wb [data-t2tab="${tab}"]`, need:() => T2.tab!==tab, run:() => t2TourTab(tab)}, inner:'#wb .wb-right'});
const M2TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 검증표(해석해와 비교), 코드 보기, 입력 내보내기 · 가져오기(트랙 · 모터 표 포함), 대시보드에 반영입니다.', t2TT('track')],
  ['#wb .wb-in', '입력', '질량 · 무게중심, 타이어, 에어로, 파워트레인, 종목 조건입니다. [대시보드 값으로 채우기]로 대시보드 설계값을 넣고, 1등 기록 칸에 지난 대회 1등 기록을 넣으면 점수가 그 기준으로 나옵니다 (0이면 내 기록을 1등으로 봄).', t2TT('track')],
  ['#wb .t2-ed', '트랙', '한 줄에 "길이, 반경"으로 구간을 적습니다. 반경은 왼쪽 회전 +, 오른쪽 −, 직선 0입니다. 기본은 대회 규정의 구간 기준(직선 ≤ 70 m, 회전 지름 30 ~ 60 m, 헤어핀 바깥 지름 ≥ 9 m, 슬라럼 간격 7 ~ 15 m)으로 만든 예시 트랙이며, 대회 코스를 받으면 그대로 바꿔 적습니다.', t2TT('track')],
  ['#wb .t2-map', '트랙 지도', '구간 목록으로 그린 지도입니다. 계산이 끝나면 차속 색(느림 파랑 → 빠름 빨강)으로 칠하고, 결과 그래프의 커서 위치를 점으로 보여 줍니다.', t2TT('track')],
  ['#wb .t2-ed', '모터 곡선', '모터 축의 회전수 - 토크 표를 넣습니다. 비우면 입력 칸의 최대 토크와 최고 출력으로 곡선을 만듭니다. 축전지 출력 상한은 표가 있어도 적용됩니다.', t2TT('motor')],
  ['#wb .t2-vw', '결과 그래프 고르기', '아래 결과 그래프에 그릴 것을 고릅니다: 오토크로스 한 바퀴, 내구 한 바퀴, 가속, 구동력 선도(차속별 모터 구동력 · 접지 한계 · 주행 저항).', t2TT('track')],
  ['#wb .wb-sec[aria-label="결과"]', '결과', '종목별 기록과 예상 점수, 차량 한계, 점수 합이 가장 큰 감속비, 내구 에너지입니다. 감속비는 2.5 ~ 7.0을 0.1 간격으로 모두 계산해 고릅니다.', {inner:'#wb .wb-right'}],
  ['#wbmain', '결과 그래프', '고른 종목의 차속(실선)과 코너 한계 속도입니다. 그래프를 누르거나 끌면 커서가 움직이고 트랙 지도의 점도 따라갑니다.', {inner:'#wb .wb-right'}],
  ['#wbsl', '신호 선택 그래프', '종가속도 · 횡가속도 · 모터 회전수 · 축전지 출력 등을 골라 겹쳐 봅니다. 가로축을 [입력 훑기 → 최종 감속비]로 바꾸면 감속비에 따른 기록 · 점수 변화를 봅니다.', {inner:'#wb .wb-right'}]
];

/* ============================================================ 도구 정의 */
WB_TOOLS['2'] = {
  no:'2', stage:'P0', name:'랩타임 · 점수 시뮬레이터', mainTitle:'결과 그래프',
  mainMeta:'위 [결과 그래프]에서 고른 것 · 그래프를 누르거나 끌면 커서 · ←/→ 한 칸씩',
  x:{ get n(){ return T2.view==='ft' ? '차속' : '거리'; }, get u(){ return T2.view==='ft' ? 'km/h' : 'm'; } },
  sweepFirst:'gr',
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:'질량 · 무게중심'}, {k:'fr', dk:'fr', v:47.5, d:1, g:'질량 · 무게중심'}, {k:'h', dk:'h', v:290, d:0, g:'질량 · 무게중심'}, {k:'L', dk:'L', v:1550, d:0, g:'질량 · 무게중심'},
    {k:'mu', dk:'mu', v:1.5, d:2, g:'타이어 · 바퀴'}, {k:'r_eff', dk:'r_eff', v:229, d:0, g:'타이어 · 바퀴'}, {k:'crr', dk:'crr', v:0.015, d:3, g:'타이어 · 바퀴'},
    {k:'cla', dk:'cla', v:3.0, d:2, g:'에어로'}, {k:'cda', dk:'cda', v:1.4, d:2, g:'에어로'}, {k:'xcop', dk:'xcop', v:852, d:0, g:'에어로'}, {k:'hcop', dk:'hcop', v:420, d:0, g:'에어로'},
    {k:'pmax', dk:'pmax', v:80, d:0, g:'파워트레인'}, {k:'tmax', dk:'tmax', v:230, d:0, g:'파워트레인'}, {k:'nmax', dk:'nmax', v:6500, d:0, g:'파워트레인'}, {k:'gr', dk:'gr', v:3.55, d:2, g:'파워트레인', sw:[2.5, 7]},
    {k:'eta_dt', dk:'eta_dt', v:95, d:0, g:'파워트레인'}, {k:'eta_m', n:'모터 · 인버터 효율', u:'%', v:90, d:0, g:'파워트레인'}, {k:'j_eq', dk:'j_eq', v:0.5, d:2, g:'파워트레인'},
    {k:'acc_len', n:'가속 구간 길이 (대회 공지값)', u:'m', v:75, d:0, g:'종목'}, {k:'sk_R', n:'스키드패드 주행 반경 (차로 가운데)', u:'m', v:9.125, d:3, g:'종목'}, {k:'end_km', n:'내구 총 주행거리', u:'km', v:20, d:1, g:'종목'},
    {k:'ref_acc', n:'1등 기록 · 가속 (0 = 내 기록)', u:'s', v:0, d:3, g:'1등 기록 (점수 기준)'}, {k:'ref_skid', n:'1등 기록 · 스키드패드', u:'s', v:0, d:3, g:'1등 기록 (점수 기준)'},
    {k:'ref_ax', n:'1등 기록 · 오토크로스', u:'s', v:0, d:2, g:'1등 기록 (점수 기준)'}, {k:'ref_end', n:'1등 기록 · 내구', u:'s', v:0, d:1, g:'1등 기록 (점수 기준)'}
  ],
  outGroups:{'예상 점수':{note:'1등 기록이 0인 종목은 내 기록을 1등으로 계산'}, '감속비':{note:'2.5 ~ 7.0, 0.1 간격 · 1등 기록이 0이면 지금 감속비의 내 기록을 기준 · 1등보다 빨라져도 점수식을 늘려 비교'}, '에너지 (회생 제외)':{note:'CO₂ 환산 1.3 kg/kWh'}},
  outputs:[
    {k:'t_acc_s', n:'가속', u:'s', d:3, g:'종목 기록'}, {k:'t_skid_s', n:'스키드패드 (한 바퀴)', u:'s', d:3, g:'종목 기록'}, {k:'t_ax_s', n:'오토크로스 (정지 출발 한 바퀴)', u:'s', d:2, g:'종목 기록'},
    {k:'t_end_s', n:'내구 주행시간 (교체 시간 제외)', u:'s', d:1, g:'종목 기록'}, {k:'t_fly', n:'내구 한 바퀴 (달리는 중)', u:'s', d:2, g:'종목 기록'}, {k:'n_lap', n:'내구 바퀴 수', u:'바퀴', d:0, g:'종목 기록'},
    {k:'s_acc', n:'가속', d:1, g:'예상 점수', fmt:t2Pts(100)}, {k:'s_skid', n:'스키드패드', d:1, g:'예상 점수', fmt:t2Pts(100)}, {k:'s_ax', n:'오토크로스', d:1, g:'예상 점수', fmt:t2Pts(200)},
    {k:'s_end', n:'내구', d:1, g:'예상 점수', fmt:t2Pts(350)}, {k:'s_dyn', n:'동적 합 (효율 · 보고서 제외)', d:1, g:'예상 점수', fmt:t2Pts(750)},
    {k:'vmax', dk:'vmax', d:1, g:'차량 한계'}, {k:'v_top', n:'오토크로스 최고 차속', u:'km/h', d:1, g:'차량 한계'}, {k:'ay_skid', dk:'ay_max_sim', d:2, g:'차량 한계'}, {k:'ax_0', n:'출발 종가속도', u:'g', d:2, g:'차량 한계'},
    {k:'gr_opt', dk:'gr', n:'점수 합이 가장 큰 감속비', d:2, g:'감속비'}, {k:'s_dyn_opt', n:'그때 동적 점수 합', d:1, g:'감속비', fmt:t2Pts(750)},
    {k:'e_end', n:'내구 축전지 에너지', u:'kWh', d:2, g:'에너지 (회생 제외)'}, {k:'e_lap', dk:'e_lap', d:3, g:'에너지 (회생 제외)'}, {k:'co2_100', n:'보정 에너지 소비량', u:'kg/100 km', d:2, g:'에너지 (회생 제외)', fmt:t2Co2}
  ],
  sigs:[
    {k:'v', n:'차속', u:'km/h', d:1}, {k:'vlim', n:'코너 한계 속도', u:'km/h', d:1}, {k:'ax', n:'종가속도', u:'g', d:2}, {k:'ay', n:'횡가속도', u:'g', d:2},
    {k:'rpm', n:'모터 회전수', u:'rpm', d:0}, {k:'pbat', n:'축전지 출력 (회생 제외)', u:'kW', d:1}, {k:'grip', n:'그립 사용률 (차 전체)', u:'%', d:0}, {k:'t', n:'경과 시간', u:'s', d:2}, {k:'ecum', n:'누적 에너지', u:'Wh', d:0},
    {k:'f_m', n:'모터 구동력 (바퀴)', u:'N', d:0}, {k:'f_x', n:'뒤축 접지 한계 (직진)', u:'N', d:0}, {k:'f_res', n:'주행 저항 (항력 + 구름)', u:'N', d:0}, {k:'a_x', n:'낼 수 있는 종가속도', u:'g', d:2}, {k:'p_w', n:'바퀴 출력', u:'kW', d:1}
  ],
  get sigOn(){ return T2.view==='ft' ? ['f_m','f_x','f_res'] : ['v', 'ax', 'pbat']; },
  extHTML: t2ExtHTML, extraI: t2ExtraI,
  extGet: () => ({track:T2.track, motor:T2.motor, view:T2.view}),
  extSet(d){ if(typeof d.track==='string') T2.track = d.track; if(typeof d.motor==='string') T2.motor = d.motor; if(['ax','end','acc','ft'].includes(d.view)) T2.view = d.view; t2Save(); wbPaint(['ext']); },
  onResult(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(); const c = $('#t2mc'); if(c) c.innerHTML = t2MotorPlot(); },
  onCursor(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(); },
  tour: M2TOUR,
  verifyBase:{track:[], motor:[], view:'acc'},
  code:`// 입력 I: 왼쪽 입력 칸(단위도 같음: kg, mm, %, rpm, N·m, kW, m, km, s)
//   I.track = [[길이 m, 반경 m], …] 트랙 구간 (반경: 왼쪽 회전 +, 오른쪽 −, 직선 0), I.motor = [[회전수 rpm, 토크 N·m], …] (비면 최대 토크 · 최고 출력으로)
//   I.view = 결과 그래프에 그릴 것: 'ax' 오토크로스 한 바퀴 · 'end' 내구 한 바퀴(달리는 중) · 'acc' 가속 · 'ft' 구동력 선도
// 모델: 점질량 준정적(QSS). 앞뒤 하중 이동(종가속 · 항력 높이 · 다운포스 앞뒤 몫), 뒤축 구동(모터 1개), 축마다 마찰원(같은 μ).
//   횡력은 무게 배분대로 앞뒤 축에 나눔. 제동은 이상 배분(두 축이 함께 한계)으로 가정 → 제동 장치 한계는 도구 3. 롤 · 타이어 하중 감도 · 회생 제동은 넣지 않음
// 점수식: FSK 2026 경기진행규정 제8 ~ 11조. 효율 CO₂ 환산 1 kWh = 1.3 kg (제12조)
const g = 9.81, RHO = 1.225;                                   // 중력가속도 [m/s²], 공기 밀도 [kg/m³]
function car(I, gr){
  const m = I.m, L = I.L/1000, h = I.h/1000, fs = I.fr/100, fa = 1 - I.xcop/I.L, hc = I.hcop/1000, r = I.r_eff/1000;
  const mu = I.mu, crr = I.crr, cl = 0.5*RHO*I.cla, cd = 0.5*RHO*I.cda, eta = I.eta_dt/100, em = I.eta_m/100;
  const meff = m + I.j_eq/(r*r);                               // 회전부 등가 질량 = J ÷ r² (J ÷ r 이 아님: 예전 계산기 오류)
  const tab = (I.motor || []).slice().sort((a, b) => a[0] - b[0]);
  const Pm = I.pmax*1000*em;                                   // 모터 축 출력 상한 = 축전지 출력 상한 × 모터 · 인버터 효율 [W]
  const nmax = tab.length ? Math.min(I.nmax, tab[tab.length - 1][0]) : I.nmax;
  function Tm(n){ if(n > nmax) return 0; let T;
    if(!tab.length) T = I.tmax; else if(n <= tab[0][0]) T = tab[0][1];
    else { T = tab[tab.length - 1][1]; for(let i = 1; i < tab.length; i++) if(n <= tab[i][0]){ const a = tab[i - 1], b = tab[i]; T = a[1] + (b[1] - a[1])*(n - a[0])/(b[0] - a[0]); break; } }
    const w = n*2*Math.PI/60; return w > 0 ? Math.min(T, Pm/w) : T; }
  const rpm = v => v/r*gr*60/(2*Math.PI);
  const vtop = nmax/gr*2*Math.PI/60*r*(1 - 1e-9);              // 회전수 한계 최고속 [m/s]
  const Fm = v => Tm(rpm(v))*gr*eta/r;                         // 모터가 바퀴에 내는 구동력 [N]
  const Fres = v => cd*v*v + crr*(m*g + cl*v*v);               // 항력 + 구름 저항 (구름 저항 = 계수 × (무게 + 다운포스), 무게 항 포함)
  const Fzf = (v, ax) => m*g*fs + cl*v*v*fa - m*ax*h/L - cd*v*v*hc/L;
  const Fzr = (v, ax) => m*g*(1 - fs) + cl*v*v*(1 - fa) + m*ax*h/L + cd*v*v*hc/L;
  // 코너 한계 속도: 축마다 횡력(무게 배분대로) ≤ μ × 수직 하중
  function vCorner(k){ k = Math.abs(k); if(k < 1e-9) return Infinity; let v2 = Infinity;
    const cf = m*k*fs - mu*(cl*fa - cd*hc/L), cr = m*k*(1 - fs) - mu*(cl*(1 - fa) + cd*hc/L);
    if(fs > 0 && cf > 0) v2 = Math.min(v2, mu*m*g*fs/cf);
    if(fs < 1 && cr > 0) v2 = Math.min(v2, mu*m*g*(1 - fs)/cr);
    return Math.sqrt(v2); }
  // 가속: 뒤축 마찰원에서 횡력을 뺀 만큼 구동, 앞축은 하중이 빠져도 횡력을 견뎌야 함. 하중 이동이 가속도에 따라 바뀌므로 4번 되풀이
  function aDrive(v, k, a0){ const ay = v*v*Math.abs(k), Fyr = m*ay*(1 - fs), Fyf = m*ay*fs; let ax = a0 || 0;
    for(let it = 0; it < 4; it++){ const N = mu*Fzr(v, ax), Fx = Math.sqrt(Math.max(0, N*N - Fyr*Fyr)), F = Math.min(Fm(v), Fx);
      ax = (F - Fres(v))/meff;
      if(h > 0 && Fyf > 0){ const amax = (mu*(m*g*fs + cl*v*v*fa - cd*v*v*hc/L) - Fyf)*L/(mu*m*h); if(ax > amax) ax = amax; } }
    return ax; }
  // 감속: 네 바퀴 제동, 이상 배분 → 차 전체 마찰원. 항력 · 구름 저항도 감속을 도움
  function aBrake(v, k){ const ay = v*v*Math.abs(k), N = mu*(m*g + cl*v*v), Fx = Math.sqrt(Math.max(0, N*N - (m*ay)*(m*ay))); return (Fx + Fres(v))/meff; }
  return {m, meff, r, gr, eta, em, mu, fs, nmax, vtop, rpm, Fm, Fres, Fzr, Fzf, vCorner, aDrive, aBrake};
}
// 트랙 → 점 (간격 ds 이하). k[j] = j번째 칸의 곡률 [1/m]
function grid(segs, ds){ const s = [0], k = []; for(const [l, R] of segs){ const n = Math.max(1, Math.ceil(l/ds)), st = l/n; for(let i = 0; i < n; i++){ k.push(R ? 1/R : 0); s.push(s[s.length - 1] + st); } } return {s, k}; }
// 한 바퀴 차속: 코너 한계 → 앞으로 가속 → 뒤에서 제동. 정지 출발(v0 = 0) 또는 달리는 중(끝 속도로 다시 시작, 2번)
function lap(C, G, flying){ const N = G.s.length, v = new Array(N), lim = new Array(N);
  for(let i = 0; i < N; i++) lim[i] = Math.min(C.vCorner(Math.max(Math.abs(G.k[i - 1] || 0), Math.abs(G.k[i] || 0))), C.vtop);
  let v0 = flying ? Infinity : 0;
  for(let pass = 0; pass < (flying ? 2 : 1); pass++){
    v[0] = Math.min(lim[0], v0); let a = 0;
    for(let i = 0; i < N - 1; i++){ a = C.aDrive(v[i], G.k[i], a); v[i + 1] = Math.min(lim[i + 1], Math.sqrt(Math.max(0, v[i]*v[i] + 2*a*(G.s[i + 1] - G.s[i])))); }
    for(let i = N - 2; i >= 0; i--){ const b = C.aBrake(v[i + 1], G.k[i]); v[i] = Math.min(v[i], Math.sqrt(v[i + 1]*v[i + 1] + 2*b*(G.s[i + 1] - G.s[i]))); }
    v0 = v[N - 1]; }
  return v; }
// 차속 → 시간 · 에너지 (모터가 낸 힘 × 거리 ÷ 효율, 제동 구간은 0). rec 이면 신호도
function walk(C, G, v, rec){ let t = 0, E = 0; const N = v.length, S = rec ? {t:[0], ax:[], ay:[], rpm:[], pbat:[], grip:[], ecum:[0]} : null;
  for(let i = 0; i < N - 1; i++){ const ds = G.s[i + 1] - G.s[i], vm = (v[i] + v[i + 1])/2, dt = vm > 0 ? ds/vm : Infinity, ax = (v[i + 1]*v[i + 1] - v[i]*v[i])/(2*ds);
    const F = C.meff*ax + C.Fres(vm), Pb = F > 0 ? F*vm/(C.eta*C.em) : 0; t += dt; if(F > 0) E += F*ds/(C.eta*C.em);
    if(rec){ const ay = vm*vm*Math.abs(G.k[i]); S.t.push(t); S.ax.push(ax/g); S.ay.push(ay/g); S.rpm.push(C.rpm(v[i])); S.pbat.push(Pb/1000); S.ecum.push(E/3600);
      S.grip.push(Math.hypot(C.m*ax, C.m*ay)/(C.mu*(C.m*g + (C.Fzr(vm, 0) + C.Fzf(vm, 0) - C.m*g)))*100); } }
  if(rec){ ['ax','ay','rpm','pbat','grip'].forEach(k => S[k].push(S[k][S[k].length - 1] || 0)); }
  return {t, E, S}; }
// 스키드패드: 일정 반경 R 에서 낼 수 있는 가장 빠른 일정 차속 (앞축 횡력 · 뒤축 마찰원 · 모터 힘) → 이분법
function skid(C, R){ const m = C.m, fs = C.fs;
  const ok = v => { const ay = v*v/R, Fx = C.Fres(v); if(C.Fm(v) < Fx) return false;
    if(m*ay*fs > C.mu*C.Fzf(v, 0) + 1e-9) return false; const N = C.mu*C.Fzr(v, 0); return (m*ay*(1 - fs))**2 + Fx*Fx <= N*N; };
  let lo = 0, hi = C.vtop; if(ok(hi)) return hi; for(let i = 0; i < 60; i++){ const md = (lo + hi)/2; if(ok(md)) lo = md; else hi = md; } return lo; }
// 점수: A × ((k × Tmin ÷ T) − 1) ÷ (k − 1) + B, T > k × Tmin 이면 B (완주 점수). 1등 기록이 0이면 내 기록이 1등
function score(T, ref, A, B, k){ if(!(T > 0) || !isFinite(T)) return 0; const Tm = ref > 0 ? Math.min(ref, T) : T; return T > k*Tm ? B : A*((k*Tm/T) - 1)/(k - 1) + B; }
// 네 종목 기록 (감속비 gr, 점 간격 ds)
function events(I, gr, ds){ const C = car(I, gr), segs = I.track || [], len = segs.reduce((a, r) => a + r[0], 0);
  const GA = grid([[I.acc_len, 0]], ds), va = lap(C, GA, false), A = walk(C, GA, va, false);
  const vs = skid(C, I.sk_R), tsk = 2*Math.PI*I.sk_R/vs;
  let ax = {t:NaN, E:NaN}, st = {t:NaN, E:NaN}, fl = {t:NaN, E:NaN}, n = 0, Gx = null, Ge = null, vx = null, vf = null;
  if(len > 0){ Gx = grid(segs.slice().reverse().map(([l, R]) => [l, -R]), ds); vx = lap(C, Gx, false); ax = walk(C, Gx, vx, false);   // 오토크로스: 거꾸로 (제10조 ② 3)
    Ge = grid(segs, ds); st = walk(C, Ge, lap(C, Ge, false), false); vf = lap(C, Ge, true); fl = walk(C, Ge, vf, false);
    n = Math.max(2, Math.round(I.end_km*1000/len)); }
  const tEnd = 2*st.t + (n - 2)*fl.t, eEnd = 2*st.E + (n - 2)*fl.E;                         // 드라이버 2명이 각각 정지 출발 (제11조 ⑦)
  return {C, acc:A.t, va, GA, skid:tsk, vs, ax:ax.t, Gx, vx, fly:fl.t, Ge, vf, end:tEnd, eEnd, eFly:fl.E, n, len}; }
// 감속비 비교용: 1등 기록을 고정하고, 그보다 빨라져도 점수식을 그대로 늘려 씀 (최대 점수에서 멈추면 더 빠른 감속비끼리 구별이 안 됨)
function scoreRaw(T, ref, A, B, k){ if(!(T > 0) || !isFinite(T)) return 0; return T > k*ref ? B : A*((k*ref/T) - 1)/(k - 1) + B; }
function scores(I, E, ref, raw){ const f = raw ? scoreRaw : score;
  const s = {acc:f(E.acc, ref.acc, 75, 25, 1.5), skid:f(E.skid, ref.skid, 75, 25, 1.25), ax:f(E.ax, ref.ax, 150, 50, 1.45), end:f(E.end, ref.end, 250, 100, 1.45)};
  s.dyn = s.acc + s.skid + (isFinite(E.ax) ? s.ax : 0) + (isFinite(E.end) ? s.end : 0); return s; }
// 감속비 고르기: 2.5 ~ 7.0을 0.1 간격으로 점수 합(늘린 점수식) 비교 (점 간격 2 m로 빠르게). 1등 기록이 0이면 지금 감속비의 내 기록을 기준으로 고정
function bestGr(I){ const E0 = events(I, I.gr, 2), ref = {acc: I.ref_acc > 0 ? I.ref_acc : E0.acc, skid: I.ref_skid > 0 ? I.ref_skid : E0.skid, ax: I.ref_ax > 0 ? I.ref_ax : E0.ax, end: I.ref_end > 0 ? I.ref_end : E0.end};
  let best = {gr:NaN, raw:-Infinity, s:NaN}; for(let k = 25; k <= 70; k++){ const gg = k/10, E = events(I, gg, 2), r = scores(I, E, ref, true).dyn;
    if(r > best.raw + 1e-9) best = {gr:gg, raw:r, s:scores(I, E, ref).dyn}; } return best; }
function calc(I){
  const E = events(I, I.gr, 0.5), C = E.C, S = scores(I, E, {acc:I.ref_acc, skid:I.ref_skid, ax:I.ref_ax, end:I.ref_end}), B = bestGr(I);
  const km = (E.n*E.len)/1000, kWh = E.eEnd/3.6e6;
  const out = { t_acc_s:E.acc, t_skid_s:E.skid, t_ax_s:E.ax, t_end_s:E.end, t_fly:E.fly, n_lap:E.n,
    s_acc:S.acc, s_skid:S.skid, s_ax:S.ax, s_end:S.end, s_dyn:S.dyn,
    vmax:C.vtop*3.6, v_top: E.vx ? Math.max(...E.vx)*3.6 : NaN, ay_skid:E.vs*E.vs/I.sk_R/g, ax_0:C.aDrive(0, 0, 0)/g,
    gr_opt:B.gr, s_dyn_opt:B.s, e_end:kWh, e_lap:E.eFly/3.6e6, co2_100: km > 0 ? kWh*1.3/km*100 : NaN };
  // 결과 그래프: 고른 종목
  if(I.view==='ft'){ const vt = C.vtop, V = Array.from({length:121}, (_, i) => vt*i/120);
    const fm = V.map(C.Fm), fx = V.map(v => C.mu*C.Fzr(v, 0)), fr = V.map(C.Fres);
    return {out, x:{d:V.map(v => v*3.6)}, sig:{f_m:fm, f_x:fx, f_res:fr, a_x:V.map((v, i) => (Math.min(fm[i], fx[i]) - fr[i])/C.meff/g), p_w:V.map((v, i) => Math.min(fm[i], fx[i])*v/1000)}, main:['f_m','f_x','f_res']}; }
  const pick = I.view==='acc' || !E.Gx ? {G:E.GA, v:E.va, segs:[[I.acc_len, 0]]} : I.view==='end' ? {G:E.Ge, v:E.vf, segs:I.track} : {G:E.Gx, v:E.vx, segs:I.track.slice().reverse().map(([l, R]) => [l, -R])};
  const G = pick.G, v = pick.v, W = walk(C, G, v, true), N = v.length;
  const lim = G.s.map((_, i) => Math.min(C.vCorner(Math.max(Math.abs(G.k[i - 1] || 0), Math.abs(G.k[i] || 0))), C.vtop)*3.6);
  // 지도 좌표: 트랙 정방향 점(같은 점 간격). 오토크로스는 거꾸로 돌므로 rev = true (그림에서 i → N − 1 − i)
  const GM = E.Ge || G; let x = 0, y = 0, hd = 0; const X = [0], Y = [0]; for(let i = 0; i < GM.s.length - 1; i++){ const st = GM.s[i + 1] - GM.s[i], k = GM.k[i];
    if(!k){ x += st*Math.cos(hd); y += st*Math.sin(hd); } else { const R = 1/k, dh = st*k; x += R*(Math.sin(hd + dh) - Math.sin(hd)); y -= R*(Math.cos(hd + dh) - Math.cos(hd)); hd += dh; } X.push(x); Y.push(y); }
  return { out, x:{d:G.s}, sig:{v:v.map(a => a*3.6), vlim:lim, ...W.S}, main:['v','vlim'], map:{X, Y, rev: I.view!=='end'} };
}
`,
  verify:[
    {n:'가속 · 접지 한계만 (μ = 1, CG 뒤축 위)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, pmax:1e6, nmax:1e7, acc_len:75}, expect:{t_acc_s:3.910309, ax_0:1}, src:'a = μg → t = √(2 × 75 ÷ 9.81)'},
    {n:'가속 · 회전부 관성 J ÷ r²', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100, eta_m:100, pmax:1e6, nmax:1e7, acc_len:75}, expect:{t_acc_s:5.477226}, src:'F = 100 × 4 ÷ 0.25 = 1600 N, 등가 질량 300 + 1.25 ÷ 0.25² = 320 kg → a = 5'},
    {n:'가속 · 구름 저항 무게 항', I:{m:300, fr:50, h:0, mu:10, crr:0.02, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100, eta_m:100, pmax:1e6, nmax:1e7, acc_len:75}, expect:{t_acc_s:5.580840}, src:'a = (1600 − 0.02 × 300 × 9.81) ÷ 320 = 4.8161'},
    {n:'회전수 한계 최고속', I:{nmax:6500, gr:3.55, r_eff:229}, expect:{vmax:158.0708}, src:'6500 ÷ 3.55 × 2π ÷ 60 × 0.229 × 3.6'},
    {n:'스키드패드 · 에어로 없음', I:{mu:1.5, crr:0, cla:0, cda:0, sk_R:9.125}, expect:{t_skid_s:4.947846, ay_skid:1.5}, src:'v = √(μgR) → T = 2πR ÷ v'},
    {n:'스키드패드 · 다운포스 (앞뒤 몫 = 무게 배분)', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:3, cda:0, sk_R:9.125}, expect:{t_skid_s:4.735903}, src:'mv²/R = μ(mg + ½ρC_LA v²) → v² = μmg ÷ (m/R − μ½ρC_LA)'},
    {n:'가속 점수식', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, pmax:1e6, nmax:1e7, acc_len:75, ref_acc:3.5}, expect:{s_acc:76.39071}, src:'75 × ((1.5 × 3.5 ÷ 3.9103) − 1) ÷ 0.5 + 25 (제8조)'},
    {n:'가속 점수 · 1.5배 넘으면 완주 점수', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, pmax:1e6, nmax:1e7, acc_len:75, ref_acc:2}, expect:{s_acc:25}, src:'3.91 > 1.5 × 2 → 25점'},
    {n:'원 트랙 한 바퀴 = 스키드패드', I:{mu:1.5, crr:0, cla:0, cda:0, sk_R:9.125, track:[[57.33407, 9.125]]}, expect:{t_fly:4.947846}, src:'달리는 중 한 바퀴 = 2πR ÷ √(μgR)'},
    {n:'직선 1 km · 최고속 일정', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_m:100, nmax:6500, gr:3.55, r_eff:229, end_km:20, track:[[1000, 0]]}, expect:{t_fly:22.77461, n_lap:20, e_lap:0.0122625, co2_100:2.671627}, src:'1000 ÷ 43.909 m/s, 한 바퀴 에너지 = 0.015 × 300 × 9.81 × 1000 J, 내구 = 정지 출발 2번의 운동에너지(등가 질량) + 20 바퀴 구름 저항, CO₂ = kWh × 1.3'},
    {n:'내구 점수 · 1등 기록 = 내 기록', I:{crr:0.015, cla:0, cda:0, track:[[1000, 0]], end_km:20}, expect:{s_end:350, s_ax:200}, src:'T = Tmin → 250 + 100, 150 + 50'}
  ]
};

/* ---------- 대시보드 '파트별 > 차량 목표 · 파워트레인': 대시보드 값으로 도구 2를 돌린 결과(읽기 전용) ---------- */
const T2P = { R:null, Rft:null, key:'', busy:false, w:null };
function t2PartInputs(view){ const I = {}; WB_TOOLS['2'].inputs.forEach(d => { const db = wbDash(d.dk); I[d.k] = db ? db.v : d.v; });
  try{ const s = JSON.parse(localStorage.getItem(wbStoreKey('2')) || '{}') || {}; ['eta_m','acc_len','sk_R','end_km','ref_acc','ref_skid','ref_ax','ref_end'].forEach(k => { if(typeof s[k]==='number' && isFinite(s[k])) I[k] = s[k]; }); }catch(e){}
  return {...I, ...t2ExtraI(), view}; }
function t2PartDirty(){ T2P.key = ''; if(typeof DASH!=='undefined' && (DASH.part==='goal' || DASH.part==='pt') && $('#t2part')) t2PartRun(); }
function t2PartRun(){ const I = t2PartInputs('ft'), key = JSON.stringify(I); if(key===T2P.key || T2P.busy) return; T2P.busy = true;
  try{ if(!T2P.w) T2P.w = new Worker(URL.createObjectURL(new Blob([WB_TOOLS['2'].code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false}); } };'], {type:'text/javascript'}))); }catch(e){ T2P.busy = false; return; }
  T2P.w.onmessage = e => { T2P.busy = false; T2P.key = key; if(e.data.ok){ T2P.R = e.data.r; const b = $('#t2part'); if(b) b.innerHTML = t2PartBody(DASH.part, I, T2P.R); } };
  T2P.w.postMessage(I); }
function t2PartHTML(kind){ setTimeout(t2PartRun, 0);
  return `<div class="t2-part"><p class="dp-note">대시보드 설계값과 도구 2의 트랙 · 모터 표로 계산한 결과입니다. 트랙 · 1등 기록 · 모터 표를 바꾸려면 <button type="button" class="lnk" data-wb="2">도구 2 랩타임 · 점수 시뮬레이터</button>를 엽니다.</p><div id="t2part">${T2P.R ? t2PartBody(kind, t2PartInputs('ft'), T2P.R) : '<p class="muted">계산 중…</p>'}</div></div>`; }
function t2PartBody(kind, I, R){ const o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  if(kind==='goal'){ const goal = k => { const d = wbDash(k); return d ? d.v : NaN; };
    const rows = [['가속', 't_acc', o.t_acc_s, o.s_acc, 100, 3], ['스키드패드', 't_skid', o.t_skid_s, o.s_skid, 100, 3], ['오토크로스', 't_ax', o.t_ax_s, o.s_ax, 200, 2], ['내구', 't_end', o.t_end_s, o.s_end, 350, 1]];
    const gs = goal('score_goal');
    return `<table class="dvi-t t2-gt"><thead><tr><th>종목</th><th>목표 기록</th><th>예상 기록</th><th>차이</th><th>예상 점수</th></tr></thead><tbody>${rows.map(([n, k, t, s, mx, d]) => { const g0 = goal(k), df = t - g0;
        return `<tr><td>${n}</td><td>${f(g0, d)} s</td><td><b>${f(t, d)}</b> s</td><td class="${isFinite(df) ? (df > 0 ? 'wb-err' : 'ok') : ''}">${isFinite(df) ? (df > 0 ? '+' : '') + wbFmt(df, d) + ' s' : '—'}</td><td>${f(s, 1)} / ${mx}</td></tr>`; }).join('')}
      <tr class="t2-sum"><td>동적 합</td><td colspan="3" class="muted">목표 종합점수 ${f(gs, 0)}점은 보고서 · 효율을 포함한 1,000점 만점 기준</td><td><b>${f(o.s_dyn, 1)}</b> / 750</td></tr></tbody></table>
      <p class="dp-note">1등 기록을 넣지 않은 종목은 내 기록을 1등으로 계산하므로 점수가 최대로 나옵니다. 목표 기록은 대시보드 '차량 목표'(공통) 값입니다.</p>`; }
  return `<div class="dp-plots">${wbPlot({id:'t2ft', w:640, h:280, x:{d:R.x.d, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:R.sig.f_m, c:WB_COL[0], n:'모터 구동력', u:'N'}, {k:'f_x', d:R.sig.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N'}, {k:'f_res', d:R.sig.f_res, c:WB_COL[2], n:'주행 저항', u:'N'}], label:'구동력 선도'})}</div>
    <div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴)</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진 · 일정 속도)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항 (항력 + 구름)</span></div>
    <p class="dp-note">감속비 ${f(I.gr, 2)} · 회전수 한계 최고속 ${f(o.vmax, 1)} km/h. 모터 구동력이 접지 한계보다 큰 구간은 바퀴가 미끄러지므로 접지 한계가 가속을 정합니다. 점수 합이 가장 큰 감속비는 ${f(o.gr_opt, 2)} (동적 합 ${f(o.s_dyn_opt, 1)}점), 내구 한 바퀴 에너지 ${f(o.e_lap, 3)} kWh입니다.</p>`; }
