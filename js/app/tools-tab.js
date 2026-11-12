/* ============================================================
   도구 탭
   - 위: 팀 설계값 대시보드 (값 한곳 + 그림으로 보기 + 파트별)
   - 아래: 도구 모음 (설계 단계 순)
   - 값은 팀 저장소 teams/<팀>/dv/<파트코드>__<키> (docs/STORE-PLAN.md). 저장소가 없으면 이 브라우저에 저장
   - 아직 아무도 넣지 않은 값은 예시값으로 그림을 그리고 '예시값'으로 표시
   ============================================================ */
const DASH = (() => {
  /* 대시보드에 보이는 키: [키, 소수 자릿수, 예시값]. 이름·단위·담당 파트는 DK(js/store/dash-keys.js) */
  const GROUPS = [
    ['질량 · 무게중심', [['m',0,300],['fr',1,47.5],['left',1,50],['h',0,290]]],
    ['치수', [['L',0,1550],['tf',0,1200],['tr',0,1180],['r_eff',0,229],['r_load',0,220]]],
    ['에어로', [['cla',2,3.0],['cda',2,1.4],['xcop',0,698],['hcop',0,420]]],
    ['타이어 · 서스 · 조향', [['mu',2,1.5],['lltd',1,50],['rmin',1,3.0]]],
    ['파워트레인', [['pmax',0,80],['gr',2,3.55],['nmax',0,6500]]]
  ];
  const STL = {ok:'확정', rev:'검토 중', asm:'가정', calc:'계산값', ex:'예시값 (아직 입력 안 됨)'};
  const P = {}, ST = {};
  const C = {v:45, R:12, ax:0, dir:'L', straight:false, aero:true};
  const PRESET = { stop:{v:0,R:12,ax:0,straight:true}, accel:{v:40,R:12,ax:1.2,straight:true}, brake:{v:80,R:12,ax:-1.5,straight:true},
    skid:{v:42,R:9.1,ax:0,straight:false}, hair:{v:24,R:4.5,ax:0,straight:false}, vmax:{v:110,R:12,ax:0,straight:true} };
  let PART = 'frame';
  return { GROUPS, STL, P, ST, C, PRESET, get part(){ return PART; }, set part(v){ PART = v; } };
})();

/* ---------- 팀 설계값 저장소 (dv) ---------- */
const DVKEY = 'run2x.dv.v1';
let DVS = {};   /* 문서 id → {s:{시즌:{v, st, src, by, at}}} */
try{ DVS = JSON.parse(localStorage.getItem(DVKEY)||'{}') || {}; }catch(e){ DVS = {}; }
const dvSeason = () => (typeof SEASON!=='undefined' ? String(SEASON) : String(new Date().getFullYear()));
const dvEntry = (k, se) => { const d = DVS[dvId(k)]; return (d && d.s && d.s[se || dvSeason()]) || null; };
/* 이 키를 고칠 수 있나: 회장 전부, 팀장·파트장은 담당 파트(또는 묶음)만. 저장소가 없으면 이 브라우저에서 자유롭게 */
const canEditDv = k => !SH.on ? true : (SH.canAdmin || (!pastLock() && isLeadRole(SH.role) && (partOK(SH.parts, SH.role, DK[k].p) || (!!DK[k].p2 && partOK(SH.parts, SH.role, DK[k].p2)))));   /* 지난 시즌은 회장만. p2 = 함께 고치는 파트 */
async function dvSave(k, patch){
  const id = dvId(k), se = dvSeason(), cur = DVS[id] || {s:{}}, prev = (cur.s||{})[se] || {};
  const ent = {v: prev.v==null ? null : prev.v, st: prev.st || 'rev', src: prev.src || '', ...patch, by: SH.me || null, at: new Date().toISOString()};
  const doc = {s: {...(cur.s||{}), [se]: ent}};
  if(!SH.on){ DVS[id] = doc; try{ localStorage.setItem(DVKEY, JSON.stringify(DVS)); }catch(e){} dashPaint(); if(typeof refreshVals==='function') refreshVals(); return true; }
  if(!canEditDv(k)){ toast(`${DK[k].n} 값은 회장이나 ${DK[k].p}${DK[k].p2 ? '·' + DK[k].p2 : ''} 담당 팀장·파트장만 고칠 수 있습니다.`); return false; }
  DVS[id] = doc; dashPaint();
  try{ await SH.db.doc('dv/'+id).set(doc); return true; }
  catch(e){ toast(Backend.denied && Backend.denied(e) ? '이 값을 고칠 권한이 없습니다.' : '저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.'); return false; }
}
/* 팀 저장소 연결: 다른 저장소 구독(onSharedReady) 뒤에 이어 붙임 */
{ const _osr = onSharedReady; onSharedReady = function(db){ _osr(db);
    db.collection('dv').onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); DVS = r; dashPaint(); if(typeof refreshVals==='function') refreshVals(); }, () => {}); }; }
/* 설계 탭 항목에 붙는 팀 설계값(읽기 전용). 고치기는 도구 탭에서 (값 한곳 원칙) */
const DK_BY_ITEM = DKEYS.reduce((o, d) => { if(d.it) (o[d.it] = o[d.it] || []).push(d.k); return o; }, {});
function dvLinkedHTML(id, se){ const ks = DK_BY_ITEM[id]; if(!ks || !ks.length) return '';
  const row = k => { const e = dvEntry(k, se), has = e && typeof e.v==='number', st = has ? (e.st||'rev') : '';
    return `<tr><th><span class="term" data-dk="${k}" tabindex="0" role="button" aria-haspopup="dialog">${DK[k].n}</span></th><td>${has ? `<b>${e.v}</b>${DK[k].u?` <span class="dv-u">${DK[k].u}</span>`:''} <span class="dv-s s-${st}" title="${DASH.STL[st]||''}"></span>` : '<span class="muted">—</span>'}</td></tr>`; };
  return `<div class="tv-dv"><div class="tv-dvh"><span class="sec-label">팀 설계값</span><button type="button" class="lnk" data-gotools>도구 탭에서 보기 · 고치기</button></div><table class="kvt tv-t">${ks.map(row).join('')}</table></div>`; }
document.addEventListener('click', e => { if(e.target.closest && e.target.closest('[data-gotools]')){ e.preventDefault(); showTab('tools'); smoothScrollTo(() => 0); } });
/* 그림·계산에 쓰는 값: 이번 시즌 저장값, 없으면 예시값 */
function dashSync(){ DASH.GROUPS.forEach(g => g[1].forEach(([k, , ex]) => { const e = dvEntry(k), has = e && typeof e.v==='number' && isFinite(e.v);
  DASH.P[k] = has ? e.v : ex; DASH.ST[k] = has ? (e.st || 'rev') : 'ex'; }));
  DASH.P.rt = DASH.P.r_eff; }   /* 그림 코드(dash-figs.js)는 유효 반경을 rt 로 읽음 */
const TOOL_LIST = [
  ['1','질량·무게중심 계산기','P0','부품별 질량·위치','총질량, 무게중심, 앞뒤·좌우 배분'],
  ['G','목표 · 요구값 (경량 시뮬)','P0','도구 1 질량 · 무게중심, 치수, 모터 토크','종목 목표 → 에어로 · 질량 · 모터 · 타이어 요구값, 내구 에너지 · 평균 출력 · 발열'],
  ['2','랩타임 시뮬레이터 (정밀)','P0','질량, 에어로, 모터 · 효율, 축전지, 코스','종목별 기록과 목표 차이, 감속비 선택, 내구 에너지'],
  ['3','제동 시스템 사이징','P1','질량·무게중심, 마스터실린더·캘리퍼','제동 배분, 페달력, 잠김 순서'],
  ['4','축전지 팩 계산기','P1','셀 사양, 직렬·병렬, 세그먼트','팩 전압·용량·저항, 규정 확인, 부하 전압·출력'],
  ['5','서스 기하 3D','P3-1~3','하드포인트','캠버 게인, 롤센터, 안티 지오메트리'],
  ['6','조향 기구 + 3D 검증','P3-4~5','도구 5, 랙·너클암','조향각 곡선, 애커먼, 범프 스티어'],
  ['7','액추에이션·스프링','P3-6~7','로커·푸시로드, 스프링·ARB','모션비, 휠 레이트, 롤강성 배분'],
  ['8','하중 산출','P4-1','도구 1·5·7, 하중 케이스','하드포인트별 부재력'],
  ['9','냉각 계통 계산기','P4-5','회로 배치(라디 · 펌프 · 부품), 주행 평균 발열 · 차속','부품 · 냉각수 정상 온도, 주행 중 온도, 도구 2P 등가값'],
  ['10','주행 데이터 분석','P9','로거 데이터','신호 그래프, 시뮬레이션 비교'],
  ['T','타이어 모델 (선택)','P1','μ · 하중 감도 · 코너링 강성 (시험 데이터가 없을 때 직접)','슬립각–횡력 곡선, 앞뒤 코너링 강성, 이완 길이']
];
/* 도구 모음 줄: 작업창이 있는 도구(WB_TOOLS, js/app/workbench.js)는 누르면 열림 */
function toolRowsHTML(){ const W = typeof WB_TOOLS!=='undefined' ? WB_TOOLS : {};
  /* 1열 = 작업창 id (WB_TOOLS 키), 화면 번호는 작업창의 no (G → 2 경량, 2 → 2P 정밀) */
  const rows = TOOL_LIST.map(r => [W[r[0]] && W[r[0]].no ? W[r[0]].no : r[0], ...r.slice(1), W[r[0]] ? r[0] : '']);
  /* 커서를 올리면 (또는 Tab 으로 오면) 줄이 [예제 | 내 파일] 두 단추로 바뀜 → 고른 모드로 엶 */
  return rows.map(([n,t,s,i,o,id]) => id ? `<li class="tt-on wb-mpick" data-wbrow="${id}"><span class="tt-n">${n}</span><span class="tt-s">${s}</span><b>${t}</b><span class="tt-io">${i} <i>→</i> ${o}</span><span class="tt-st">열기 →</span>${wbModeBtns(id, t)}</li>`
    : `<li><span class="tt-n">${n}</span><span class="tt-s">${s}</span><b>${t}</b><span class="tt-io">${i} <i>→</i> ${o}</span><span class="tt-st">준비 중</span></li>`).join(''); }
const dashVmax = P => P.nmax/P.gr*2*Math.PI*(P.rt/1000)*60/1000;   /* 모터 회전수 한계 최고속 [km/h] */
/* 코너 반경 조절기: 곡률(1/R)을 고르게 나눠, 오른쪽으로 갈수록 반경이 줄고 조향이 커진다. 60 m → 설계 최소 회전 반경 */
const R_MAX = 60, rToU = (R, rmin) => Math.round((1/R - 1/R_MAX)/(1/rmin - 1/R_MAX)*1000), uToR = (u, rmin) => 1/(1/R_MAX + u/1000*(1/rmin - 1/R_MAX));
/* 배분(앞 : 뒤, 왼 : 오른)은 저장 값 하나(앞 · 왼 %)를 두 숫자로 */
const DV_RATIO = {fr:['앞','뒤'], left:['왼','오른']};
const dashFmt = (k, v) => { if(DV_RATIO[k]){ const a = Number(v); return `${a.toFixed(1)} : ${(100 - a).toFixed(1)}`; } const r = DASH.GROUPS.flatMap(g=>g[1]).find(x=>x[0]===k); const d = r ? r[1] : 1; return Number(v).toFixed(d); };
/* 에어로 제외: 다운포스·항력을 0으로 두고 같은 조건을 다시 계산 */
const dashP = () => DASH.C.aero ? DASH.P : {...DASH.P, cla:0, cda:0};
function dashCalc(){ const C = DASH.C; return DASHCALC(dashP(), {v:C.v, R: C.straight ? Infinity : C.R, ax:C.ax, dir:C.dir}); }

/* 대시보드 예시값 빼기 (2026-11-11): 아무도 안 넣은 값은 — 로. 그림 · 조건 · 파트 그림은 필요한 값이 다 있을 때만 그림 */
const dashEx = k => DASH.ST[k]==='ex';
const dashMissing = () => DASH.GROUPS.flatMap(g => g[1].map(r => r[0])).filter(dashEx);
const dashNoFig = what => `<p class="dp-note dv-nofig">대시보드 설계값 ${dashMissing().length}개가 비어 있어 ${what}을 그리지 않습니다.</p>`;
function dashValuesHTML(){ const P = DASH.P;
  const vmax = dashVmax(P), nm = k => `<span class="term" data-dk="${k}" tabindex="0" role="button" aria-haspopup="dialog">${DK[k].n}</span>`;
  const calc = (k, v, u, inv, need) => (need || []).some(dashEx) ? `<div class="dv-r calc ex"><dt>${nm(k)}</dt><dd><span class="dv-v ro"><b>—</b></span><span class="dv-s s-calc" title="계산값 (넣지 않은 값이 있어 계산 안 함)"></span></dd></div>` : calc0(k, v, u, inv);
  const calc0 = (k, v, u, inv) => `<div class="dv-r calc"><dt>${nm(k)}</dt><dd><span class="dv-v ro"><b>${v}</b> <span class="dv-u">${u}</span></span><span class="dv-s s-calc" title="계산값"></span></dd></div>`;
  const acg = () => calc('a_cg', (P.L*P.fr/100).toFixed(0), 'mm', 'fr', ['L', 'fr']);
  return `<div class="dv-grid">${DASH.GROUPS.map(([g, rows]) => `<section class="dv-col"><h3 class="dv-h">${g}</h3><dl>${rows.map(([k]) => { const st = DASH.ST[k], u = DK[k].u, e = dvEntry(k);
      return `<div class="dv-r${st==='ex'?' ex':''}"><dt>${nm(k)}</dt><dd><span class="dv-v ro"${e&&e.src ? ` title="${esc(e.src)}에서 반영"` : ''}>${st==='ex' ? '<b>—</b>' : `<b>${dashFmt(k, P[k])}</b>${u?` <span class="dv-u">${u}</span>`:''}`}</span><span class="dv-s s-${st}" title="${DASH.STL[st]}${e&&e.src?' · '+esc(e.src):''}"></span></dd></div>` + (k==='left' ? acg() : ''); }).join('')}
      ${g==='파워트레인' ? calc('vmax', vmax.toFixed(0), 'km/h', null, ['nmax', 'gr', 'r_eff']) : ''}
      </dl></section>`).join('')}</div>
    <p class="dv-leg"><span><i class="dv-s s-ok"></i>확정</span><span><i class="dv-s s-rev"></i>검토 중</span><span><i class="dv-s s-asm"></i>가정</span><span><i class="dv-s s-calc"></i>계산값</span><span><i class="dv-s s-ex"></i>비어 있음</span><span class="dv-legn">${SH.on ? '' : '팀에 로그인하지 않아 이 브라우저에만 저장됩니다.'}</span></p>`;
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
  const tabs = [['frame','질량 · 무게중심',''],['aero','에어로',''],['goal','차량 목표',''],['pt','파워트레인',''],['brake','제동','도구 3'],['susp','서스 기하','도구 5'],['steer','조향','도구 6'],['spring','스프링·ARB','도구 7']];
  return `<div class="dp-tabs" role="tablist">${tabs.map(([k,t,w])=>`<button type="button" role="tab" data-part="${k}" aria-selected="${DASH.part===k}" ${w?'disabled title="'+w+'을 만들 때 함께 열립니다"':''}>${t}${w?`<span class="dp-w">${w}</span>`:''}</button>`).join('')}</div>
    <div class="dp-body">${DASH.part==='frame' && ['L', 'tf', 'tr', 'r_load'].some(dashEx) ? dashNoFig('질량 분포 그림') : DASH.part==='frame' && typeof m1TpPart==='function' ? m1TpPart() : (DASH.part==='goal' || DASH.part==='pt') && dashMissing().length ? dashNoFig('이 파트 그림') : DASH.part==='frame' && typeof m1PartHTML==='function' ? m1PartHTML() : (DASH.part==='goal' || DASH.part==='pt') && typeof t2PartHTML==='function' ? t2PartHTML(DASH.part) : DASH.part==='aero' && dashMissing().length ? dashNoFig('에어로 그림') : DASH.part==='aero' ? `<div class="dp-plots">${CARFIG.aero(P, C)}</div><p class="dp-note">직진·일정 속도 기준. 다운포스는 CoP 위치로 앞뒤 축에 나누고, 항력은 CoP 높이에서 뒤축 쪽으로 하중을 옮깁니다. 세로선은 지금 차속입니다.</p>` : ''}</div>`;
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
      <section class="tl-sec" aria-label="설계값"><div class="tl-sh"><h2>설계값</h2><span class="tl-meta" id="dvseason"></span></div><div id="dvals"></div></section>
      <section class="tl-sec" aria-label="그림으로 보기"><div class="tl-sh"><h2>그림으로 보기</h2><span class="tl-meta">정상 상태 · 롤에 의한 CG 이동 무시 · 타이어 하중 감도 무시</span></div><div class="df-row"><div class="df-figs" id="dfigs"></div><aside class="dc-col" id="dcond" aria-label="주행 조건"></aside></div></section>
      <section class="tl-sec" aria-label="파트별"><div class="tl-sh"><h2>파트별</h2><span class="tl-meta">파트 그림은 그 계산 도구를 만들 때 하나씩 열립니다</span></div><div id="dpart"></div></section>
      <section class="tl-sec" aria-label="도구 모음"><div class="tl-sh"><h2>도구 모음</h2><span class="tl-meta">설계 단계 순 · 누르면 전체 화면 작업창</span></div>
        <ol class="tl-tools">${toolRowsHTML()}</ol></section>`; }
  dashPaint(); }
function dashPaint(which){ const all = !which; if(!$('#dvals')) return;
  dashSync(); dashClamp(); const ss = $('#dvseason'); if(ss) ss.textContent = dvSeason() + ' 시즌';
  if(all || which.includes('vals')) $('#dvals').innerHTML = dashValuesHTML();
  const nf = dashMissing().length > 0;   /* 비어 있는 값이 있으면 그림 · 조건 대신 안내 */
  if(all || which.includes('cond')){ $('#dcond').innerHTML = nf ? '<h3 class="dc-h">주행 조건</h3><p class="dp-note dv-nofig">비어 있는 설계값이 있어 고를 수 없습니다.</p>' : dashCondHTML(); if(!nf) dashBipolar(); }
  if(all || which.includes('figs')) $('#dfigs').innerHTML = nf ? dashNoFig('그림') : dashFigsHTML();
  if(all || which.includes('part')) $('#dpart').innerHTML = dashPartHTML(); }
/* 대시보드는 보기 전용 (2026-11-13 관리자 결정): 값은 도구 [대시보드에 반영]으로만 들어옴. 예전 값 고치기 · 상태 점 바꾸기 · 지난 시즌 값 가져오기는 지움 */
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

/* [좌표계]: 설계 탭 오른쪽 '좌표계·거동' 그림 창을 그대로 엶 (도구 작업창 위에서도) */
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-coordopen]'); if(!b) return;
  try{ if(typeof initFigRail==='function') initFigRail(); }catch(err){}
  const md = $('#figModal'), tg = $('#figToggle'); if(!md || !tg) return; md.classList.toggle('over-wb', !!b.closest('#wb')); if(md.hidden) tg.click(); });
