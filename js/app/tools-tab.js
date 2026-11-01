/* ============================================================
   도구 탭 (시안)
   - 위: 팀 설계값 대시보드 (값 한곳 + 그림으로 보기 + 파트별)
   - 아래: 도구 모음 (설계 단계 순)
   - 시안: 값은 이 화면에서만 바뀌고 저장되지 않는다. 저장 구조·권한은 docs/TOOLS-PLAN.md 결정 1~5대로 나중에 붙인다.
   ============================================================ */
const DASH = (() => {
  /* 값: [키, 이름, 단위, 기본값, 상태, 소수 자릿수, 비고]  상태: ok 확정 · rev 검토 중 · asm 가정 · calc 계산값 */
  const GROUPS = [
    ['질량 · 무게중심', [['m','총질량 (드라이버 포함)','kg',300,'ok',0],['fr','앞 배분','%',47.5,'rev',1],['left','왼쪽 배분','%',50,'ok',1],['h','무게중심 높이','mm',290,'rev',0]]],
    ['치수', [['L','휠베이스','mm',1550,'ok',0],['tf','앞 트레드','mm',1200,'ok',0],['tr','뒤 트레드','mm',1180,'ok',0],['rt','타이어 하중 반경','mm',229,'ok',0]]],
    ['에어로', [['cla','C<sub>L</sub>·A','m²',3.0,'rev',2],['cda','C<sub>D</sub>·A','m²',1.4,'rev',2],['xcop','CoP 위치 (앞축부터)','mm',852,'rev',0],['hcop','CoP 높이','mm',420,'asm',0]]],
    ['타이어 · 서스 · 조향', [['mu','타이어 마찰계수 μ','',1.5,'asm',2],['lltd','앞 횡하중 이동 배분','%',50,'asm',1],['rmin','최소 회전 반경 (CG 경로)','m',3.0,'rev',1]]],
    ['파워트레인', [['pmax','최고 출력 (규정)','kW',80,'ok',0],['gr','최종 감속비','',3.55,'rev',2],['nmax','모터 최고 회전수','rpm',6500,'ok',0]]]
  ];
  const STL = {ok:'확정', rev:'검토 중', asm:'가정', calc:'계산값'};
  const P = {}, ST = {}, DIRTY = new Set();
  GROUPS.forEach(g => g[1].forEach(r => { P[r[0]] = r[3]; ST[r[0]] = r[4]; }));
  const C = {v:45, R:12, ax:0, dir:'L', straight:false, aero:true};
  const PRESET = { stop:{v:0,R:12,ax:0,straight:true}, accel:{v:40,R:12,ax:1.2,straight:true}, brake:{v:80,R:12,ax:-1.5,straight:true},
    skid:{v:42,R:9.1,ax:0,straight:false}, hair:{v:24,R:4.5,ax:0,straight:false}, vmax:{v:110,R:12,ax:0,straight:true} };
  let PART = 'aero';
  return { GROUPS, STL, P, ST, DIRTY, C, PRESET, get part(){ return PART; }, set part(v){ PART = v; } };
})();
const TOOL_LIST = [
  ['1','질량·무게중심 계산기','P0','부품별 질량·위치','총질량, 무게중심, 앞뒤·좌우 배분'],
  ['2','랩타임·점수 시뮬레이터','P0','질량, 에어로, 모터 곡선, 트랙','종목별 랩타임·점수, 최적 기어비'],
  ['3','제동 시스템 사이징','P1','질량·무게중심, 마스터실린더·캘리퍼','제동 배분, 페달력, 잠김 순서'],
  ['4','서스 기하 3D','P3-1~3','하드포인트','캠버 게인, 롤센터, 안티 지오메트리'],
  ['5','조향 기구 + 3D 검증','P3-4~5','도구 4, 랙·너클암','조향각 곡선, 애커먼, 범프 스티어'],
  ['6','액추에이션·스프링','P3-6~7','로커·푸시로드, 스프링·ARB','모션비, 휠 레이트, 롤강성 배분'],
  ['7','하중 산출','P4-1','도구 1·4·6, 하중 케이스','하드포인트별 부재력'],
  ['8','주행 데이터 분석','P9','로거 데이터','신호 그래프, 시뮬레이션 비교']
];
const dashVmax = P => P.nmax/P.gr*2*Math.PI*(P.rt/1000)*60/1000;   /* 모터 회전수 한계 최고속 [km/h] */
/* 코너 반경 조절기: 곡률(1/R)을 고르게 나눠, 오른쪽으로 갈수록 반경이 줄고 조향이 커진다. 60 m → 설계 최소 회전 반경 */
const R_MAX = 60, rToU = (R, rmin) => Math.round((1/R - 1/R_MAX)/(1/rmin - 1/R_MAX)*1000), uToR = (u, rmin) => 1/(1/R_MAX + u/1000*(1/rmin - 1/R_MAX));
const dashFmt = (k, v) => { const r = DASH.GROUPS.flatMap(g=>g[1]).find(x=>x[0]===k); const d = r ? r[5] : 1; return Number(v).toFixed(d); };
/* 에어로 제외: 다운포스·항력을 0으로 두고 같은 조건을 다시 계산 */
const dashP = () => DASH.C.aero ? DASH.P : {...DASH.P, cla:0, cda:0};
function dashCalc(){ const C = DASH.C; return DASHCALC(dashP(), {v:C.v, R: C.straight ? Infinity : C.R, ax:C.ax, dir:C.dir}); }

function dashValuesHTML(){ const P = DASH.P;
  const vmax = dashVmax(P);
  return `<div class="dv-grid">${DASH.GROUPS.map(([g, rows]) => `<section class="dv-col"><h3 class="dv-h">${g}</h3><dl>${rows.map(([k, n, u]) =>
      `<div class="dv-r${DASH.DIRTY.has(k)?' dirty':''}"><dt>${n}</dt><dd><button type="button" class="dv-v" data-dk="${k}" title="눌러서 수정 (시안: 저장 안 됨)"><b>${dashFmt(k, P[k])}</b>${u?` <span class="dv-u">${u}</span>`:''}</button><span class="dv-s s-${DASH.ST[k]}" title="${DASH.STL[DASH.ST[k]]}"></span></dd></div>`).join('')}
      ${g==='파워트레인' ? `<div class="dv-r calc"><dt>최고속 (회전수 한계)</dt><dd><span class="dv-v ro"><b>${vmax.toFixed(0)}</b> <span class="dv-u">km/h</span></span><span class="dv-s s-calc" title="계산값"></span></dd></div>` : ''}
      ${g==='질량 · 무게중심' ? `<div class="dv-r calc"><dt>무게중심 위치 (앞축부터)</dt><dd><span class="dv-v ro"><b>${(P.L*(1-P.fr/100)).toFixed(0)}</b> <span class="dv-u">mm</span></span><span class="dv-s s-calc" title="계산값"></span></dd></div>` : ''}
      </dl></section>`).join('')}</div>
    <p class="dv-leg"><span><i class="dv-s s-ok"></i>확정</span><span><i class="dv-s s-rev"></i>검토 중</span><span><i class="dv-s s-asm"></i>가정</span><span><i class="dv-s s-calc"></i>계산값</span><span class="dv-legn">값을 누르면 바로 고칠 수 있습니다. 시안이라 저장되지 않고, 새로 고치면 처음 값으로 돌아갑니다.</span></p>`;
}
function dashReadHTML(){ const K = dashCalc(), f = (v,d) => v.toFixed(d);
  const row = (l, v, cls) => `<div class="dr-r"><dt>${l}</dt><dd class="${cls||''}">${v}</dd></div>`;
  return `<dl class="dc-read">${row('횡가속도', `<b>${f(K.ay/9.81,2)}</b> g`)}${row('그립 사용률', `<b>${f(K.grip*100,0)}</b> %${K.grip>1?' · 한계 초과':''}`, K.grip>1?'warn':'')}
    ${row('다운포스 · 항력', `<b>${f(K.DF,0)}</b> · ${f(K.D,0)} N`)}${row('앞 · 뒤 축하중', `<b>${f(K.Ff/(K.Ff+K.Fr)*100,1)}</b> : ${f(K.Fr/(K.Ff+K.Fr)*100,1)} %`)}</dl>`; }
function dashCondHTML(){ const C = DASH.C, P = DASH.P, vmx = Math.floor(dashVmax(P));
  dashClamp();
  const rng_ = (k, lab, min, max, step, val, out, dis, cls) => `<label class="dc-i${dis?' off':''}"><span class="dc-top"><span class="dc-l">${lab}</span><output>${out}</output></span><input type="range" data-dc="${k}" min="${min}" max="${max}" step="${step}" value="${val}" ${dis?'disabled':''} class="${cls||''}" aria-label="${lab.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()}"></label>`;
  return `<h3 class="dc-h">주행 조건</h3>
    ${rng_('v',`차속 <span class="dc-sub">최고 ${vmx} km/h</span>`,0,vmx,1,C.v,C.v+' km/h')}
    <span class="dc-seg" role="group" aria-label="선회 방향"><button type="button" data-dir="S" aria-pressed="${C.straight}">직진</button><button type="button" data-dir="L" aria-pressed="${!C.straight&&C.dir==='L'}">좌회전</button><button type="button" data-dir="R" aria-pressed="${!C.straight&&C.dir==='R'}">우회전</button></span>
    ${rng_('R',`코너 반경 <span class="dc-sub">${R_MAX} → ${P.rmin.toFixed(1)} m</span>`,0,1000,1,rToU(C.R, P.rmin),C.R.toFixed(1)+' m',C.straight)}
    <div class="dc-ax">${rng_('ax','종가속',-2,2,0.05,C.ax,(C.ax>0?'+':'')+C.ax.toFixed(2)+' g',false,'bipolar')}<button type="button" class="d0btn" data-ax0="1" title="종가속을 0으로">0</button><span class="dc-hint"><span>− 제동</span><span>+ 가속</span></span></div>
    <div class="dc-tg"><span class="dc-l">에어로</span><span class="dc-seg" role="group" aria-label="에어로 포함 여부"><button type="button" data-aero="1" aria-pressed="${C.aero}">포함</button><button type="button" data-aero="0" aria-pressed="${!C.aero}">제외</button></span></div>
    <div class="dc-pre"><span class="dc-l">예시 상황</span><span class="dc-pl">${[['stop','정지'],['accel','발진 가속'],['brake','최대 제동'],['skid','스키드패드'],['hair','헤어핀'],['vmax','고속 직선']].map(([k,t])=>`<button type="button" class="lnk" data-pre="${k}">${t}</button>`).join('')}</span></div>
    <div id="dcread">${dashReadHTML()}</div>`;
}
/* 조건을 설계 범위 안으로: 차속 ≤ 회전수 한계 최고속, 반경 ≥ 설계 최소 회전 반경 */
function dashClamp(){ const C = DASH.C, P = DASH.P; C.v = Math.min(C.v, Math.floor(dashVmax(P))); C.R = Math.min(R_MAX, Math.max(C.R, P.rmin)); }
/* 양쪽(±) 조절기: 0을 가운데 눈금으로 두고, 0에서 지금 값까지 칠한다 */
function dashBipolar(){ const sl = document.querySelector('#dcond input[data-dc="ax"]'); if(!sl) return;
  const pc = (parseFloat(sl.value) - sl.min)/(sl.max - sl.min)*100, a = Math.min(50, pc), b = Math.max(50, pc), tr = '#dcd9e5', ac = '#6A4294';
  sl.style.background = `linear-gradient(to right, transparent calc(50% - 1px), #4a4458 calc(50% - 1px), #4a4458 calc(50% + 1px), transparent calc(50% + 1px)), linear-gradient(to right, ${tr} 0%, ${tr} ${a}%, ${ac} ${a}%, ${ac} ${b}%, ${tr} ${b}%, ${tr} 100%)`; }
function dashPartHTML(){ const P = DASH.P, C = DASH.C;
  const tabs = [['aero','에어로',''],['goal','차량 목표','도구 2'],['pt','파워트레인','도구 2'],['brake','제동','도구 3'],['susp','서스 기하','도구 4'],['steer','조향','도구 5'],['spring','스프링·ARB','도구 6']];
  return `<div class="dp-tabs" role="tablist">${tabs.map(([k,t,w])=>`<button type="button" role="tab" data-part="${k}" aria-selected="${DASH.part===k}" ${w?'disabled title="'+w+'을 만들 때 함께 열립니다"':''}>${t}${w?`<span class="dp-w">${w}</span>`:''}</button>`).join('')}</div>
    <div class="dp-body">${DASH.part==='aero' ? `<div class="dp-plots">${CARFIG.aero(P, C)}</div><p class="dp-note">직진·일정 속도 기준. 다운포스는 CoP 위치로 앞뒤 축에 나누고, 항력은 CoP 높이에서 뒤축 쪽으로 하중을 옮깁니다. 세로선은 지금 차속입니다.</p>` : ''}</div>`;
}
function dashFigsHTML(){ const K = dashCalc(), P = DASH.P, C = DASH.C;
  return `<figure class="df-f"><figcaption><b>옆에서</b><span>축하중 · 무게중심 · 압력 중심</span></figcaption>${CARFIG.side(P, C, K)}</figure>
    <figure class="df-f"><figcaption><b>위에서</b><span>바퀴별 하중${C.straight?'':` · ${C.dir==='L'?'좌':'우'}회전`}</span></figcaption>${CARFIG.top(P, {...C, R: C.straight ? Infinity : C.R}, K)}</figure>
    <figure class="df-f"><figcaption><b>앞에서</b><span>앞축 좌우 하중 · 트레드</span></figcaption>${CARFIG.front(P, {...C, R: C.straight ? Infinity : C.R}, K)}</figure>
    <figure class="df-f"><figcaption><b>뒤에서</b><span>뒤축 좌우 하중 · 트레드</span></figcaption>${CARFIG.rear(P, {...C, R: C.straight ? Infinity : C.R}, K)}</figure>
    <p class="df-note">두 그림 모두 바퀴 색이 진할수록 하중이 큽니다. 정지 코너웨이트 앞왼 ${(K.st.fl/9.81).toFixed(1)} · 앞오른 ${(K.st.fr/9.81).toFixed(1)} · 뒤왼 ${(K.st.rl/9.81).toFixed(1)} · 뒤오른 ${(K.st.rr/9.81).toFixed(1)} kg, 크로스 ${(K.cross*100).toFixed(1)} %. 앞뒤 횡하중 이동은 앞 횡하중 이동 배분 값으로 나눴습니다.</p>`;
}
function renderTools(){ const v = $('#v-tools'); if(!v) return;
  if(!v.dataset.built){ v.dataset.built = '1';
    v.innerHTML = `<header class="top tl-hero"><span class="eyebrow">우리 팀 설계값</span><h1>팀 대시보드</h1>
</header>
      <section class="tl-sec" aria-label="설계값"><div class="tl-sh"><h2>설계값</h2><span class="tl-meta">2026 시즌</span></div><div id="dvals"></div></section>
      <section class="tl-sec" aria-label="그림으로 보기"><div class="tl-sh"><h2>그림으로 보기</h2><span class="tl-meta">정상 상태 · 롤에 의한 CG 이동 무시 · 타이어 하중 감도 무시</span></div><div class="df-row"><div class="df-figs" id="dfigs"></div><aside class="dc-col" id="dcond" aria-label="주행 조건"></aside></div></section>
      <section class="tl-sec" aria-label="파트별"><div class="tl-sh"><h2>파트별</h2><span class="tl-meta">파트 그림은 그 계산 도구를 만들 때 하나씩 열립니다</span></div><div id="dpart"></div></section>
      <section class="tl-sec" aria-label="도구 모음"><div class="tl-sh"><h2>도구 모음</h2><span class="tl-meta">설계 단계 순 · 누르면 전체 화면 작업창</span></div>
        <ol class="tl-tools">${TOOL_LIST.map(([n,t,s,i,o])=>`<li><span class="tt-n">${n}</span><span class="tt-s">${s}</span><b>${t}</b><span class="tt-io">${i} <i>→</i> ${o}</span><span class="tt-st">준비 중</span></li>`).join('')}</ol></section>`; }
  dashPaint(); }
function dashPaint(which){ const all = !which;
  dashClamp();
  if(all || which.includes('vals')) $('#dvals').innerHTML = dashValuesHTML();
  if(all || which.includes('cond')){ $('#dcond').innerHTML = dashCondHTML(); dashBipolar(); }
  if(all || which.includes('figs')) $('#dfigs').innerHTML = dashFigsHTML();
  if(all || which.includes('part')) $('#dpart').innerHTML = dashPartHTML(); }
/* 값 고치기 (시안: 화면 안에서만) */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.dv-v[data-dk]'); if(!b) return;
  const k = b.dataset.dk; const inp = document.createElement('input'); inp.type = 'number'; inp.step = 'any'; inp.value = DASH.P[k]; inp.className = 'dv-in'; inp.setAttribute('aria-label', '값 입력');
  b.replaceWith(inp); inp.focus(); inp.select();
  const done = ok => { if(!inp.isConnected) return; const x = parseFloat(inp.value); if(ok && isFinite(x) && x !== DASH.P[k]){ DASH.P[k] = x; DASH.DIRTY.add(k); } dashPaint(); };
  inp.addEventListener('keydown', ev => { if(ev.key==='Enter'){ ev.preventDefault(); done(true); } else if(ev.key==='Escape'){ done(false); } });
  inp.addEventListener('blur', () => done(true));
});
document.addEventListener('input', e => { const r = e.target.closest && e.target.closest('input[data-dc]'); if(!r) return;
  const k = r.dataset.dc, x = parseFloat(r.value), C = DASH.C;
  if(k==='R') C.R = Math.round(uToR(x, DASH.P.rmin)*10)/10; else C[k] = x;
  const o = r.parentElement.querySelector('output'); if(o) o.textContent = k==='R' ? C.R.toFixed(1)+' m' : k==='ax' ? (x>0?'+':'')+x.toFixed(2)+' g' : x+' km/h';
  if(k==='ax') dashBipolar();
  const rd = $('#dcread'); if(rd) rd.innerHTML = dashReadHTML();
  dashPaint(['figs', 'part']); });
document.addEventListener('click', e => {
  const d = e.target.closest && e.target.closest('[data-dir]'); if(d && d.closest('#dcond')){ const k = d.dataset.dir; if(k==='S') DASH.C.straight = true; else { DASH.C.straight = false; DASH.C.dir = k; } dashPaint(['cond','figs']); return; }
  const ae = e.target.closest && e.target.closest('[data-aero]'); if(ae){ DASH.C.aero = ae.dataset.aero==='1'; dashPaint(['cond','figs']); return; }
  const z0 = e.target.closest && e.target.closest('[data-ax0]'); if(z0){ e.preventDefault(); DASH.C.ax = 0; dashPaint(['cond','figs','part']); return; }
  const pr = e.target.closest && e.target.closest('[data-pre]'); if(pr){ Object.assign(DASH.C, DASH.PRESET[pr.dataset.pre]); dashPaint(['cond','figs','part']); return; }
  const pt = e.target.closest && e.target.closest('[data-part]'); if(pt && !pt.disabled){ DASH.part = pt.dataset.part; dashPaint(['part']); }
});
