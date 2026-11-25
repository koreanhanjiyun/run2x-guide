/* ============================================================
   탭 · 이동 · 이전 위치
   ============================================================ */
const $ = s => document.querySelector(s);
let graphInit=false, TAB='steps'; const HIST=[];
function showTab(t, keep){
  if(t==='parts' || t==='goals') t='start';   // 목표 탭은 시작 탭으로 합침
  ['start','goals','steps','tools','graph','ref','team'].forEach(k=>{ const v=$('#v-'+k); if(v) v.hidden = k!==t; });
  if(t==='start' && typeof renderStart==='function') renderStart(); if(t==='team' && typeof renderTeamTab==='function') renderTeamTab(); if(t==='tools' && typeof renderTools==='function') renderTools();
  const rail=$('#partRail'); if(rail) rail.hidden = !(t==='steps'||t==='graph'); requestAnimationFrame(()=>{ try{ window.__figPlace&&window.__figPlace(); }catch(e){} });
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===(t==='graph'?'steps':t))));
  try{ history.replaceState(null,'','#'+t); }catch(e){}
  if(t==='graph' && !graphInit){ graphInit=true; requestAnimationFrame(()=>{ view.x=10; view.y=56; view.k=0.9; applyView(); }); }
  if(!keep && t!==TAB) window.scrollTo(0,0);
  TAB=t;
}
/* 이동 기록: 브라우저 뒤로·앞으로 버튼으로 이동 (A9). 지금 위치를 현재 기록에 저장하고 새 기록을 하나 쌓음 */
const navState = () => ({tab:TAB, sys:(typeof START!=='undefined'?START.sys:''), y:window.scrollY, sel:(typeof SEL!=='undefined'?SEL:null), v:(typeof view!=='undefined'?{...view}:null), ip:(typeof IPAGE!=='undefined'?IPAGE:null)});   /* ip = 설계 탭 항목 화면 (item-page.js) */
function pushHist(){ try{ history.replaceState(navState(), '', location.hash); history.pushState(null, '', location.hash); }catch(e){} }
/* 화면 전환 (View Transitions, 2026-11-22, docs/DESIGN.md 5절)
   - 머리띠 · 목차 · 파트 패널은 전환 동안 따로 이름을 붙여 제자리에 둠 (style.css html[data-vt]). 나머지 화면(root)만 움직임
   - kind: open 칸 → 화면 (설계 탭 항목 칸 · 시작 탭 카드) / back 화면 → 목록 / next · prev 이전 · 다음 / fade 탭 바꿈
   - open 의 from · to: 누른 칸 → 새 화면 (vt-card). 칸이 커지며 화면 바탕색 판이 되고 그림자가 생겼다 빠짐. 옛 글이 다 사라진 뒤 새 내용이 나타남.
     목록은 판이 덮을 때까지 그대로(살짝 어둡게) 두어 빈 바탕이 깜빡이지 않게 함 (컨테이너 변형)
     설계 탭 항목은 to = vtFloor: 판이 본문 너비가 아니라 머리띠 아래 화면 전체(바닥)로 커지며 모서리 · 색이 바닥과 같아지고 사라짐
     (2026-11-25 관리자: 본문 너비 상자가 커졌다가 끝에 테두리째 사라져 바닥이 드러나는 것이 부자연스러움). 목차 · 파트 패널은 바닥 위에 그대로
   - close (설계 탭 항목 → 목록, 2026-11-25): open 을 거꾸로. from = vtFloor, to = 돌아갈 칸. 열기와 같은 300 ms (240 ms 에 바닥색 판이라 줄어드는 게 안 보이고 깜빡임처럼 보였음)
   - back: 화면이 살짝 내려가며 사라지고 목록이 나타남. 돌아온 칸을 화면 가운데에 두고 vtMark 로 잠깐 강조 (여기서 왔다는 표시)
   - push · pop (시작 탭 하위 화면): 새 화면이 오른쪽에서 밀려 들어옴 / 반대로 오른쪽으로 빠져나감. 240 ms (PC는 즉각적으로: 창 너비를 움직여도 짧게)
   - 시간 = motionMs(상자 위치 · 크기 변화 중 큰 쪽, 없으면 40 px), 최대 300 ms. back 240 ms (2026-11-24 PC는 즉각적으로: 700 → 300). hero 500 ms (한 번 보는 첫 장면이라 예외)
   - 사용법 진행 중에는 쓰지 않음 (사용법이 바뀐 화면을 자체 방식으로 보여 줌) */
const VT={busy:false};
/* 전환용 바닥 상자: 머리띠 아래 화면 전체, 비어 있음 (style.css #vtFloor). 전환 동안만 보임 */
const vtFloor = () => { let e=document.getElementById('vtFloor'); if(!e){ e=document.createElement('div'); e.id='vtFloor'; e.setAttribute('aria-hidden','true'); document.body.prepend(e); } e.hidden=false; return e; };
/* 화면 안에 보이는 부분의 상자 (긴 항목 화면은 화면 아래 끝까지만) */
const vtSeen = el => { if(!el) return null; const r=el.getBoundingClientRect(); if(!(r.width && r.bottom>0 && r.top<innerHeight)) return null;
  return {left:r.left, top:Math.max(r.top,0), width:r.width, height:Math.min(r.bottom,innerHeight)-Math.max(r.top,0)}; };
function vtGo(kind, fn, from, to){
  const R=document.documentElement;
  if(!kind || VT.busy || !document.startViewTransition || (typeof TR!=='undefined' && TR)){ fn(); return; }
  VT.busy=true; R.dataset.vt=kind;
  const f=from&&from(), fr=vtSeen(f); if(fr) f.style.viewTransitionName='vt-card';
  let t2=null; R.style.setProperty('--vt-ms', (kind==='hero' ? 500 : kind==='close' ? 300 : (kind==='push'||kind==='pop'||kind==='back') ? 240 : motionMs(40))+'ms');   /* hero: 화면 높이만큼 움직이므로 최대값 */
  if(fr && f.id==='vtFloor') R.dataset.vtf='close';
  const t=document.startViewTransition(()=>{ if(fr){ f.style.viewTransitionName=''; if(f.id==='vtFloor') f.hidden=true; }
    try{ fn(); } finally{ VT.busy=false; }
    /* 도착 상자는 바로 여기서 잼 (새 화면은 이 함수가 끝난 직후 찍히고, 그 전에는 rAF 가 돌지 않음 → 스크롤은 fn 안에서 바로 할 것) */
    const e2=fr&&to&&to(), r2=vtSeen(e2);
    if(r2){ t2=e2; t2.style.viewTransitionName='vt-card'; if(e2.id==='vtFloor') R.dataset.vtf='open';
      const d=Math.max(Math.hypot(r2.left-fr.left, r2.top-fr.top), Math.abs(r2.width-fr.width), Math.abs(r2.height-fr.height));
      if(kind!=='close') R.style.setProperty('--vt-ms', Math.min(300, motionMs(d))+'ms'); } });
  t.finished.catch(()=>{}).then(()=>{ if(t2){ t2.style.viewTransitionName=''; if(t2.id==='vtFloor') t2.hidden=true; } delete R.dataset.vtf; if(R.dataset.vt===kind) delete R.dataset.vt; });
}
/* 돌아온 칸 강조: 화면 가운데로 옮기고 보라 테두리를 잠깐 (style.css .vt-was) */
function vtMark(el, center){ if(!el) return; if(center){ const r=el.getBoundingClientRect(); window.scrollTo({top:r.top+scrollY-(innerHeight-r.height)/2, behavior:'instant'}); }
  el.classList.remove('vt-was'); void el.offsetWidth; el.classList.add('vt-was'); setTimeout(()=>el.classList.remove('vt-was'), 1600); }
/* 시작 탭 하위 화면 열쇠 → 그 화면을 여는 카드 */
const stCard = k => !k ? null : /^goal:/.test(k) ? $(`#v-start .st-body [data-goalgo="${k.slice(5)}"]`) : $(`#v-start .st-body [data-sysgo="${k}"]`);
/* 시작 탭 하위 화면 순서 (목표 1~5 → 시스템): 앞으로 가면 push, 뒤로 가면 pop */
const stIdx = k => !k ? -1 : /^goal:/.test(k) ? +k.slice(5) : 100 + BG_SYS.findIndex(s=>s.p===k);
/* 뒤로 · 앞으로 가기: 다른 처리보다 먼저 받아, 같은 이벤트를 전환 안에서 다시 보냄. 스크롤 위치도 그 안에서 바로 되살려 도착 칸을 잴 수 있게 함 */
window.addEventListener('popstate', e=>{ if(e.__vt) return; const h=e.state;
  if(!h || !h.tab || !document.startViewTransition || (typeof TR!=='undefined' && TR) || (typeof WB!=='undefined' && WB.id)) return;
  const cur=(typeof IPAGE!=='undefined')?IPAGE:null; let kind='fade', from=null, to=null;
  if(h.tab===TAB && TAB==='steps'){
    if(cur && h.ip && cur!==h.ip){ const o=ipOrder(); kind = o.indexOf(h.ip)<o.indexOf(cur) ? 'prev' : 'next'; }
    else if(!cur && h.ip){ kind='open'; from=()=>$('#it-'+h.ip); to=vtFloor; }
    else if(cur && !h.ip){ kind='close'; from=vtFloor; to=()=>$('#it-'+cur); }
    else kind=null; }
  else if(h.tab===TAB && TAB==='start' && (h.sys||'')!==(START.sys||'')){ const a=START.sys||'', z=h.sys||'';
    kind = !a ? 'push' : (!z || stIdx(z)<stIdx(a)) ? 'pop' : 'push'; }
  else if(h.tab===TAB) kind=null;
  const was = kind==='close' && TAB==='steps' ? ()=>$('#it-'+cur) : (TAB==='start' && START.sys && !h.sys) ? (k=>()=>stCard(k))(START.sys) : null;
  if(!kind) return;
  e.stopImmediatePropagation();
  vtGo(kind, ()=>{ const ev=new PopStateEvent('popstate', {state:h}); ev.__vt=1; window.dispatchEvent(ev); window.scrollTo({top:h.y||0, behavior:'instant'});
    /* 목록으로 돌아오면 보던 칸을 가운데에 두고 잠깐 강조 */
    if(was) vtMark(was(), true); }, from, to);
});
window.addEventListener('popstate', e=>{ const h=e.state; if(!h || !h.tab) return; if(h.tab==='start' && typeof renderStart==='function'){ START.sys=h.sys||''; SETP('startsys', START.sys); } showTab(h.tab, true); try{ history.replaceState(h, '', location.hash); }catch(_){}   /* showTab 이 지운 이 칸의 상태를 되살림 (앞으로가기에 필요) */
  if(h.tab==='graph' && h.v){ try{ animateTo(h.v.x,h.v.y,h.v.k,400); if(h.sel) selectItem(h.sel,false); else clearSel(); }catch(_){} }
  if(!e.__vt) requestAnimationFrame(()=>window.scrollTo({top:h.y||0, behavior:'instant'})); });   /* 전환 안에서 다시 보낸 이벤트(__vt)는 위 전환 처리가 위치를 바로 맞춤 */
/* 스크롤이 멈추면 지금 위치를 현재 기록에 덮어써 둠 (앞으로 가기에도 위치 유지) */
{ let st=0; window.addEventListener('scroll', ()=>{ clearTimeout(st); st=setTimeout(()=>{ if(typeof WB!=='undefined' && WB.id) return; try{ history.replaceState(navState(), '', location.hash); }catch(e){} }, 250); }, {passive:true}); }
/* 움직임 시간 규칙 (docs/DESIGN.md 5절, 2026-11-21): 이동 거리 d [px] → 시간 [ms] = 170 + 15·√d.
   관리자가 직접 맞춘 애니메이션에서 뽑음 — 좌표계 창 10 px · 240 ms (식 217), 목차 · 파트 패널 약 150 px · 360 ms (식 354), 스크롤 1000 px · 600 ms (식 644) */
const motionMs = d => Math.round(170 + 15*Math.sqrt(Math.max(0, d||0)));
let SCR=null;
function smoothScrollTo(getY, done){
  if(SCR) cancelAnimationFrame(SCR);
  const y0 = window.scrollY, y1 = Math.max(0, getY()), dist = Math.abs(y1-y0);
  const dur = Math.min(1300, motionMs(dist)), t0 = performance.now();
  if(dist<4){ SCR=null; window.__progEnd=performance.now(); if(done) done(); return; }
  const ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const step = now => { const t = Math.min(1,(now-t0)/dur); const target = Math.max(0, getY());
    window.scrollTo({top: y0 + (target-y0)*ease(t), behavior:'instant'});
    if(t<1) SCR = requestAnimationFrame(step); else { SCR=null; window.__progEnd=performance.now(); if(done) done(); } };
  SCR = requestAnimationFrame(step);
}
/* 요소 안 가로 스크롤도 직접 애니메이션 (브라우저 기본 smooth는 OS '애니메이션 줄이기' 설정을 따르므로 쓰지 않음) */
function animScrollLeft(el, to){ const x0=el.scrollLeft, d=to-x0, dur=Math.min(900, motionMs(Math.abs(d))), t0=performance.now(), ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const st=now=>{ const t=Math.min(1,(now-t0)/dur); el.scrollLeft=x0+d*ease(t); if(t<1) requestAnimationFrame(st); }; requestAnimationFrame(st); }
function markHere(el){
  document.querySelectorAll('.here').forEach(x=>x.classList.remove('here'));
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash','here');
}
function stickyOffset(){ const cs=getComputedStyle(document.documentElement); return parseFloat(cs.getPropertyValue('--tabh'))+parseFloat(cs.getPropertyValue('--sth'))+14; }
function openItem(id){
  pushHist(); setVM('full');
  showTab('steps', true);
  const it=IT[id]; const st=$('#st-'+it.s); if(!st) return; st.open=true;
  const el=$('#it-'+id); if(!el) return; fillItem(el); el.open=true;
  requestAnimationFrame(()=>{ const y = el.getBoundingClientRect().top + window.scrollY - stickyOffset();
    smoothScrollTo(()=>el.getBoundingClientRect().top + window.scrollY - stickyOffset(), ()=>markHere(el)); });
}
document.addEventListener('click',ev=>{
  const tb=ev.target.closest('.tab'); if(tb){ const t=tb.dataset.tab, ip=(typeof IPAGE!=='undefined')&&IPAGE;
    if(t===TAB && t==='steps' && ip){ ipBackTo(IT[ip].s); return; }   /* 설계 탭을 다시 누름 = 항목 화면 닫기 (판이 그 칸으로 줄어듦) */
    vtGo(t!==TAB ? 'fade' : null, ()=>{ if(t!==TAB) pushHist(); showTab(t); }); return; }
  const g=ev.target.closest('[data-goto]'); if(g){ ev.preventDefault(); vtItem(g.dataset.goto, g); return; }
  const gr=ev.target.closest('[data-graph]'); if(gr){ ev.preventDefault(); ev.stopPropagation(); pushHist(); showTab('graph'); requestAnimationFrame(()=>selectItem(gr.dataset.graph,true)); return; }
  const op=ev.target.closest('[data-open]'); if(op){ vtItem(op.dataset.open, op); return; }
  const sl=ev.target.closest('[data-sel]'); if(sl){ selectItem(sl.dataset.sel,true); return; }
  if(ev.target.closest('.tabs .logo-mark, .tabs .wordmark')){ ev.preventDefault(); goHome(); }
});
/* 로고 → 시작 탭 첫 화면 (주소의 #항목 지움). 뒤로 가기로 돌아올 수 있음 */
function goHome(){ const inSub = typeof START!=='undefined' && !!START.sys; if(TAB!=='start' || window.scrollY>10 || inSub) pushHist(); showTab('start', true);
  /* 시작 탭 안의 세부 목표·시스템 화면을 보고 있었으면 시작 탭 첫 화면으로 */
  if(inSub){ try{ renderStart(''); window.scrollTo({top:0, behavior:'instant'}); }catch(e){} }
  try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
  requestAnimationFrame(()=>smoothScrollTo(()=>0)); }
document.querySelectorAll('.tabs .logo-mark, .tabs .wordmark').forEach(el=>{ el.removeAttribute('aria-hidden'); el.setAttribute('role','link'); el.tabIndex=0; el.title='시작 탭으로'; el.setAttribute('aria-label', el.classList.contains('wordmark') ? 'RUN2X 시작 탭으로' : '시작 탭으로');
  el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); goHome(); } }); });

/* ---- v24 검색 + 자동완성 ---- */
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const stripT = s => String(s||'').replace(/<[^>]+>/g,'').replace(/\$/g,'');
const norm = s => stripT(s).toLowerCase().replace(/[\s·・,()\[\]{}\-_\/]/g,'');
const cho = s => [...s].map(c=>{ const k=c.charCodeAt(0)-0xAC00; return (k>=0&&k<11172)?CHO[Math.floor(k/588)]:c; }).join('');
const isCho = q => q.length>0 && [...q].every(c=>CHO.includes(c)||/[a-z0-9]/.test(c));
function mscore(text, q, base){ const n=norm(text); if(!n||!q) return 0;
  if(isCho(q) && /[ㄱ-ㅎ]/.test(q)){ const c=cho(n); const i=c.indexOf(q); return i<0?0:(i===0?base*0.9:base*0.75); }
  const i=n.indexOf(q); return i<0?0:(i===0?base:base*0.8); }
/* A8: 단계·항목·부품·용어를 함께 찾고 종류별로 묶어 보여 줌 */
const SIDX_ALL = [
  ...STEPS.map(s=>({k:'step', id:s.id, name:stripT(s.t).replace('★ ',''), code:s.id, extra:[]})),
  ...ITEMS.map(i=>{ const a=ACT[i.id]||[]; return {k:'item', id:i.id, name:stripT(i.n), code:i.s, part:i.p,
     extra:[['핵심',a[1]],...(a[2]||[]).map(v=>['우리 팀 값',v]),...(a[3]||[]).map(v=>['계산값',v]),...(a[4]||[]).map(v=>['제약',v])].filter(x=>x[1])}; })
];
let SIDX_MORE = false;
function searchMore(){ if(SIDX_MORE) return; SIDX_MORE = true;
  /* 2026-11-25: 시작 탭의 시스템 화면 · 목표 · 세부 목표, 도구 탭의 도구도 찾음. 결과는 가는 곳(탭)별로 묶고 줄 끝에 경로 */
  const sysName = p => { const s = typeof BG_SYS!=='undefined' && BG_SYS.find(x=>x.p===p); return s ? s.t : p; };
  if(typeof BG_SYS!=='undefined') BG_SYS.forEach(s=>SIDX_ALL.push({k:'sys', id:s.p, name:stripT(s.t), code:s.p, part:s.p, path:'시작 › 시스템 화면', extra:[['설명',stripT(s.why||'').slice(0,160)]].filter(x=>x[1])}));
  if(typeof GOALS!=='undefined') GOALS.forEach((m,mi)=>{ SIDX_ALL.push({k:'goal', id:String(mi), name:stripT(m.t), code:'목표 '+(mi+1), path:'시작 › 목표 화면', extra:[['한 줄',m.s||''],['설명',stripT(m.why||'')]].filter(x=>x[1])});
    (m.subs||[]).forEach((d,di)=>SIDX_ALL.push({k:'goalsub', id:mi+':'+di, name:stripT(d.t).replace(/^[①-⑳]\s*/,''), code:'목표 '+(mi+1), path:'시작 › '+stripT(m.t)+' › 세부 목표', extra:[['목표',stripT(d.g||'')],['판단 기준',stripT(d.j||'')]].filter(x=>x[1])})); });
  if(typeof TOOL_LIST!=='undefined'){ const W = typeof WB_TOOLS!=='undefined' ? WB_TOOLS : {};
    TOOL_LIST.forEach(r=>{ const no = W[r[0]] && W[r[0]].no ? W[r[0]].no : r[0]; SIDX_ALL.push({k:'tool', id:r[0], ready:!!W[r[0]], name:stripT(r[1]), code:'도구 '+no, path: W[r[0]] ? '도구 › 작업창' : '도구 › 준비 중', extra:[['입력',r[3]],['결과',r[4]]].filter(x=>x[1])}); }); }
  if(typeof COMP!=='undefined') Object.entries(COMP).forEach(([sys,cs])=>cs.forEach(c=>SIDX_ALL.push({k:'comp', id:c.id, sys, name:stripT(c.n), code:sys, part:sys, path:'시작 › '+sysName(sys)+' › 구성 부품', extra:[['영문',c.en||''],['설명',c.what||(c.desc?String(c.desc[0]).replace(/<[^>]+>/g,''):'')]].filter(x=>x[1])})));
  const gl=[...document.querySelectorAll('#ref-list tr[id^="gl-"]')]; gl.forEach(tr=>SIDX_ALL.push({k:'term', id:tr.id, name:tr.cells[0].textContent.trim(), code:'용어', path:'참고 › 용어집', extra:[['뜻',tr.cells[1].textContent.trim()]]})); }
const SKIND = {item:'설계 탭 · 설계 항목', step:'설계 탭 · 단계', goal:'시작 탭 · 목표', goalsub:'시작 탭 · 세부 목표', sys:'시작 탭 · 시스템', comp:'시작 탭 · 구성 부품', tool:'도구 탭 · 도구', term:'참고 탭 · 용어'}, SORDER = ['item','step','goal','goalsub','sys','comp','tool','term'];
function searchAll(raw){ searchMore(); const q=norm(raw); if(!q) return [];
  const out=[]; for(const e of SIDX_ALL){
    let s=Math.max(mscore(e.name,q,100), mscore(e.code,q,90)), why=null;
    if(s===0){ for(const [lab,t] of e.extra){ const v=mscore(t,q,40); if(v>s){ s=v; why=[lab,stripT(t).slice(0,80)]; } } }
    if(s>0){ const on = !PSET.size || !e.part || PSET.has(e.part); out.push({...e, s:s+(e.k==='item'?2:0), on, why}); } }
  out.sort((a,b)=>(b.on-a.on)||(b.s-a.s));
  /* 2026-11-25 목록 다시 짬: 위 거르기 칩(전체 · 설계 · 시작 · 도구 · 참고, 개수), 전체 보기는 카테고리당 4줄 + [n개 더 보기], 칩으로 고르면 그 탭 전부 */
  if(raw!==SLASTQ){ SLASTQ=raw; SFILT='all'; SOPEN.clear(); }
  SCOUNT = {all:out.length}; out.forEach(r=>{ const t=STAB[r.k]; SCOUNT[t]=(SCOUNT[t]||0)+1; });
  if(SFILT!=='all' && !SCOUNT[SFILT]) SFILT='all';
  const best = {}; out.forEach(r=>{ best[r.k] = Math.max(best[r.k]||0, r.s); });
  const kinds = SORDER.filter(k=>best[k] && (SFILT==='all' || STAB[k]===SFILT)).sort((a,b)=>best[b]-best[a]);
  const res=[]; kinds.forEach(k=>{ const g=out.filter(r=>r.k===k), lim = SFILT==='all' && !SOPEN.has(k) ? 4 : 40;
    g.slice(0, lim).forEach((r,i)=>res.push({...r, head: i===0 ? SKIND[k] : ''}));
    if(g.length>lim) res.push({k, more:k, keep:true, n:g.length-lim, head:''}); });
  return res; }
const STAB = {item:'설계', step:'설계', goal:'시작', goalsub:'시작', sys:'시작', comp:'시작', tool:'도구', term:'참고'};
let SFILT='all', SLASTQ=null, SCOUNT={}; const SOPEN=new Set();
function searchFilterBar(){ const t=['all','설계','시작','도구','참고'].filter(k=>k==='all' || SCOUNT[k]);
  return `<div class="acfilt" role="toolbar" aria-label="검색 결과 거르기">${t.map(k=>`<button type="button" data-sf="${k}" aria-pressed="${SFILT===k}">${k==='all'?'전체':k} <span>${SCOUNT[k]||0}</span></button>`).join('')}</div>`; }
function hlName(name, raw){
  const q=norm(raw); const wrap=h=>`<span class="acn">${h}</span>`; if(!q) return wrap(name);
  const ch=[...name], keep=[]; let n='';
  ch.forEach((c,k)=>{ const t=norm(c); if(t){ keep.push(k); n+=t; } });
  const choMode = isCho(q) && /[ㄱ-ㅎ]/.test(q);
  const at = (choMode ? cho(n) : n).indexOf(q); if(at<0) return wrap(name);
  const on=new Set(keep.slice(at, at+q.length));
  let h='', open=false; ch.forEach((c,k)=>{ const m=on.has(k)||(open && /\s/.test(c) && on.has(k+1)); if(m&&!open){ h+='<mark>'; open=true; } if(!m&&open){ h+='</mark>'; open=false; } h+=c; }); if(open) h+='</mark>';
  return wrap(h); }
function makeAC(input, list, getRes, rowHTML, onPick, onType, opt){ opt = opt || {};
  let res=[], cur=-1;
  const lid = list.id || ('acl'+Math.random().toString(36).slice(2,7)); list.id = lid; list.setAttribute('role','listbox'); input.setAttribute('aria-controls', lid);
  const close=()=>{ list.hidden=true; cur=-1; input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); };
  const draw=()=>{ res=getRes(input.value); cur=res.length?0:-1;
    if(!input.value.trim()){ close(); return; }
    /* opt.head: 카테고리 이름을 결과 줄 밖의 머리 줄로 (강조 · 키보드 대상 아님), opt.top: 맨 위 막대 */
    list.innerHTML = res.length ? (opt.top ? opt.top() : '') + res.map((r,i)=>`${opt.head && r.head ? `<div class="achead2" role="presentation">${r.head}</div>` : ''}<div class="acrow${r.on===false?' off':''}${r.more?' acmore':''}${i===cur?' cur':''}" data-i="${i}" id="${lid}-${i}" role="option" aria-selected="${i===cur}">${rowHTML(r,input.value)}</div>`).join('') : `<div class="acnone">결과 없음 · 초성(예: ㅅㅋㄹ)이나 영문 약어(예: KPI)로도 찾을 수 있습니다.</div>`;
    list.hidden=false; input.setAttribute('aria-expanded','true'); if(cur>=0) input.setAttribute('aria-activedescendant', lid+'-'+cur); };
  const mark=()=>{ list.querySelectorAll('.acrow').forEach((x,i)=>{ x.classList.toggle('cur',i===cur); x.setAttribute('aria-selected', String(i===cur)); if(i===cur) x.scrollIntoView({block:'nearest'}); }); if(cur>=0) input.setAttribute('aria-activedescendant', lid+'-'+cur); };
  const pick=i=>{ const r=res[i]; if(!r) return; if(r.keep){ onPick(r); const c=cur; draw(); cur=Math.min(c, res.length-1); mark(); return; } close(); input.value=''; input.blur(); onPick(r); };
  list.__redraw = () => { draw(); };
  list.addEventListener('mousedown', e=>{ const f=e.target.closest('[data-sf]'); if(!f) return; e.preventDefault(); if(opt.onFilter) opt.onFilter(f.dataset.sf); draw(); });
  input.addEventListener('input',()=>{ draw(); if(onType) onType(input.value); });
  input.addEventListener('focus',()=>{ if(input.value.trim()) draw(); });
  let pendEnter=false;
  input.addEventListener('compositionend',()=>{ setTimeout(()=>{ draw(); if(onType) onType(input.value); if(pendEnter){ pendEnter=false; if(cur>=0) pick(cur); } },0); });
  input.addEventListener('keydown',e=>{
    if(e.isComposing || e.keyCode===229){ if(e.key==='Enter') pendEnter=true; return; }
    if(e.key==='ArrowDown'){ e.preventDefault(); if(res.length){ cur=(cur+1)%res.length; mark(); } }
    else if(e.key==='ArrowUp'){ e.preventDefault(); if(res.length){ cur=(cur-1+res.length)%res.length; mark(); } }
    else if(e.key==='Enter'){ e.preventDefault(); if(cur>=0) pick(cur); }
    else if(e.key==='Escape'){ close(); input.blur(); } });
  list.addEventListener('mousedown',e=>{ const r=e.target.closest('.acrow'); if(r){ e.preventDefault(); pick(+r.dataset.i); } });
  input.addEventListener('blur',()=>setTimeout(close,120));
}
function graphFlash(id){ const n=document.querySelector(`#graph .node[data-id="${id}"]`); if(!n) return;
  n.style.setProperty('--gc', pc(IT[id].p)); n.classList.remove('gflash'); void n.getBoundingClientRect(); n.classList.add('gflash'); setTimeout(()=>n.classList.remove('gflash'),2700); }
function openStep(sid){ pushHist(); setVM('full'); showTab('steps', true); const st=$('#st-'+sid); if(!st) return; st.open=true;
  const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
  requestAnimationFrame(()=>smoothScrollTo(()=>st.getBoundingClientRect().top+window.scrollY-tabh-8, ()=>markHere(st))); }
function initSearch(){
  const inp=$('#gsearch'), list=$('#gsearch-list');
  makeAC(inp, list, searchAll,
    (r,raw)=> r.more ? `<span class="acmore-t">+ ${r.n}개 더 보기</span>` : (r.k==='step'
      ? `<span class="accode st">${r.code}</span><span class="acname">${hlName(r.name,raw)}</span><span class="acpath">설계 › 단계</span>`
      : ['comp','sys','goal','goalsub','tool','term'].includes(r.k) ? `<span class="accode ${r.k==='comp'||r.k==='sys'?'cp':'tm'}">${r.k==='comp'||r.k==='sys'?'<span class="dot" style="background:'+pc(r.part)+'"></span>':esc(r.k==='term'?'용어':r.code)}</span><span class="acname">${hlName(r.name,raw)}${r.why?`<small><b>${r.why[0]}</b> ${r.why[1]}</small>`:''}</span><span class="acpath">${r.path}</span>`
      : `<span class="accode">${r.code}</span><span class="acname">${hlName(r.name,raw)}${r.why?`<small><b>${r.why[0]}</b> ${r.why[1]}</small>`:''}</span>${chip(r.part)}<span class="acpath">설계 › 항목 화면</span>`),
    r=>{ if(r.more){ SOPEN.add(r.more); return; }
      if(r.k==='step'){ openStep(r.id); return; }
      if(r.k==='sys'){ openSys(r.id); return; }
      if(r.k==='goal'){ openGoalPage(+r.id); return; }
      if(r.k==='goalsub'){ const [mi,di]=r.id.split(':').map(Number); openGoalPage(mi, di); return; }
      if(r.k==='tool'){ pushHist(); showTab('tools'); if(r.ready && typeof wbOpen==='function') wbOpen(r.id); else requestAnimationFrame(()=>{ const t=document.querySelector('#v-tools .tl-tools'); if(t) smoothScrollTo(()=>t.getBoundingClientRect().top+scrollY-120); }); return; }
      if(r.k==='comp'){ openSys(r.sys, r.id); return; }
      if(r.k==='term'){ pushHist(); showTab('ref'); const tr=document.getElementById(r.id); const d=tr&&tr.closest('details'); if(d) d.open=true; requestAnimationFrame(()=>{ if(tr){ smoothScrollTo(()=>tr.getBoundingClientRect().top+scrollY-innerHeight/3, ()=>markHere(tr)); } }); return; }
      if(TAB==='graph'){ pushHist(); selectItem(r.id,true); } else vtItem(r.id); }, null, {head:true, top:searchFilterBar, onFilter:k=>{ SFILT=k; }});
  document.addEventListener('keydown',e=>{ if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey) return; const a=document.activeElement;
    if(a && (a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable)) return; e.preventDefault(); inp.focus(); inp.select(); });
}
function initGlossary(){
  const d=[...document.querySelectorAll('#ref-list > details')].find(x=>x.querySelector(':scope>summary .stitle')?.textContent.trim()==='용어집'); if(!d) return;
  const body=d.querySelector('.dbody'), rows=[...body.querySelectorAll('tbody tr')];
  const G=rows.map((tr,i)=>{ tr.id='gl-'+i; return {tr, name:tr.cells[0].textContent.trim(), def:tr.cells[1].textContent.trim()}; });
  /* 용어를 누르면 위쪽 검색창에 그 용어를 넣어 그 용어가 나오는 항목을 보여 줌 (괄호 속 약자 · '·' 뒤는 뺌) */
  G.forEach(g=>{ const q=g.name.split(/\s*·\s*/)[0].replace(/\s*\([^)]*\)\s*$/,'').trim(); const c=g.tr.cells[0]; c.innerHTML=`<button type="button" class="lnk gl-go" data-glq="${esc(q)}" title="'${esc(q)}'이(가) 나오는 항목 찾기">${c.innerHTML}</button>`; });
  const box=document.createElement('div'); box.className='gsrch';
  box.innerHTML=`<input type="text" class="gq" placeholder="용어 검색 (초성 가능: ㅅㅋㄹ)" aria-label="용어 검색" autocomplete="off"><div class="aclist" hidden role="listbox"></div>`;
  (body.querySelector('.gl-box') || body).prepend(box);
  const inp=box.querySelector('input'), list=box.querySelector('.aclist');
  const res = raw=>{ const q=norm(raw); if(!q) return []; return G.map(g=>({g, s:Math.max(mscore(g.name,q,100), mscore(g.def,q,40))})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,10); };
  const filt = raw=>{ const q=norm(raw); const hit=new Set(res(raw).map(x=>x.g)); G.forEach(g=>{ g.tr.hidden = !!q && !hit.has(g); }); };
  makeAC(inp, list, res, (r,raw)=>`<span class="acname">${hlName(r.g.name,raw)}<small>${r.g.def}</small></span>`,
    r=>{ inp.value=''; filt(''); const tr=r.g.tr; const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
      requestAnimationFrame(()=>smoothScrollTo(()=>tr.getBoundingClientRect().top+window.scrollY-(window.innerHeight+tabh)/2+20, ()=>markHere(tr))); },
    filt);
}
/* 연결도는 설계 탭의 셋째 보기 (탭 간소화 A): 목록 ↔ 연결도를 오갈 때 목록의 스크롤 위치를 기억 */
{ let STEPY = 0; const _st = showTab;
  showTab = function(t, keep){ if(TAB==='steps' && t==='graph') STEPY = window.scrollY;
    const back = TAB==='graph' && t==='steps' && !keep; const r = _st.call(this, t, back ? true : keep);
    if(back) requestAnimationFrame(()=>window.scrollTo({top:STEPY, behavior:'instant'})); return r; };
  document.addEventListener('click', e => {
    if(e.target.closest('[data-vgo="graph"]')){ e.preventDefault(); pushHist(); showTab('graph'); return; }
    const m = e.target.closest('[data-vmg]'); if(m){ e.preventDefault(); if(typeof setVM==='function') setVM(m.dataset.vmg); pushHist(); showTab('steps'); } });
}
/* 연결도 보기 머리를 목록 보기 머리와 같은 자리에 둠: 설계 탭 본문 칸의 왼쪽 끝·너비를 계산해 그대로 씀 */
function graphAlign(){ const st=document.querySelector('#v-steps'), gv=document.querySelector('#v-graph'); if(!st||!gv) return;
  const cs=getComputedStyle(st), cw=document.documentElement.clientWidth, pl=parseFloat(cs.paddingLeft)||0, pr=parseFloat(cs.paddingRight)||0;
  const content=parseFloat(getComputedStyle(st).getPropertyValue('--content'))||1240, w=Math.min(content, cw-pl-pr), x=pl+Math.max(0,(cw-pl-pr-content)/2);
  const gpl=parseFloat(getComputedStyle(gv).paddingLeft)||0; gv.style.setProperty('--gx-l', Math.max(0, x-gpl)+'px'); gv.style.setProperty('--gx-w', w+'px'); }
{ const _st2 = showTab; showTab = function(t, keep){ const r = _st2.call(this, t, keep); if(t==='graph') try{ graphAlign(); }catch(e){} return r; };
  window.addEventListener('resize', ()=>{ if(TAB==='graph') try{ graphAlign(); }catch(e){} }); }
/* 목차를 접거나 펴서 너비(--tocx)가 바뀌면 연결도 머리·그림 자리도 다시 맞춤 */
{ const re = () => { if(TAB==='graph') try{ graphAlign(); }catch(e){} };
  try{ new MutationObserver(re).observe(document.documentElement, {attributes:true, attributeFilter:['style','class']}); new MutationObserver(re).observe(document.body, {attributes:true, attributeFilter:['class']}); }catch(e){}
  const t = document.getElementById('toc'); if(t && 'ResizeObserver' in window) try{ new ResizeObserver(re).observe(t); }catch(e){}
  document.addEventListener('transitionend', e => { if(e.propertyName==='padding-left' && e.target.id==='v-steps') re(); });   /* 116차: 본문이 부드럽게 밀린 뒤 다시 맞춤 */
  setTimeout(() => document.body.classList.add('toc-ready'), 800); }   /* 처음 그릴 때(저장된 목차 너비 적용)는 애니메이션 없이 */
/* 맨 위로 버튼: 화면 한 높이 이상 내려가면 오른쪽 아래에 뜸 (모든 탭) */
{ const b = document.createElement('button'); b.type='button'; b.id='toTop'; b.hidden=true; b.setAttribute('aria-label','맨 위로'); b.title='맨 위로';
  b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 14l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(b);
  let raf=0; const upd=()=>{ raf=0; b.hidden = window.scrollY < window.innerHeight; };
  addEventListener('scroll', ()=>{ if(!raf) raf=requestAnimationFrame(upd); }, {passive:true}); addEventListener('resize', ()=>{ if(!raf) raf=requestAnimationFrame(upd); });
  b.addEventListener('click', ()=>smoothScrollTo(()=>0)); }

document.addEventListener('click', e=>{ const b=e.target.closest('[data-glq]'); if(!b) return; e.preventDefault(); const inp=$('#gsearch'); if(!inp) return;
  inp.value=b.dataset.glq; inp.focus(); inp.dispatchEvent(new Event('input', {bubbles:true})); });
