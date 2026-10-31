/* ============================================================
   1.0 화면 틀 (A10·B4·B6·J2·J7·L1)
   - 브라우저 탭 제목: '항목 · 탭 · Run2X 설계 가이드'
   - 고정 제목줄 대신 한 줄 경로(P0 › 항목)를 탭 아래에 띄움 (B4)
   - 파트 패널 머리에 고른 상태를 글로 (B6)
   - 탭: 방향키로 이동, 탭 패널 연결 (J2)
   - 움직임 줄이기 설정이면 스크롤 애니메이션 없이 바로 이동 (J7)
   - 좁은 화면(모바일): 안내 화면만 (L1)
   ============================================================ */
const SITE = 'Run2X 설계 가이드';
const TABNAME = {start:'시작', goals:'목표', steps:'설계', graph:'설계 · 연결도', ref:'참고', team:'팀'};
const plainT = t => String(t||'').replace(/<[^>]+>/g,'').replace(/\$/g,'').replace('★ ','');
let CRUMB = {step:null, item:null};
function setTitle(){ const parts=[]; if(TAB==='steps' && CRUMB.item) parts.push(plainT(IT[CRUMB.item].n)); else if(TAB==='steps' && CRUMB.step) parts.push(CRUMB.step);
  if(TAB==='start' && typeof START!=='undefined' && START.sys){ const s=BG_SYS.find(x=>x.p===START.sys); if(s) parts.push(s.t); }
  parts.push(TABNAME[TAB]||''); parts.push(SITE); const t=parts.filter(Boolean).join(' · '); if(document.title!==t) document.title=t; }
{ const _st=showTab; showTab=function(t,k){ const r=_st.apply(this,arguments); try{ document.body.className=document.body.className.replace(/\btab-\w+/g,'').trim(); document.body.classList.add('tab-'+TAB); CRUMB={step:null,item:null}; paintCrumb(); setTitle(); syncTabsA11y(); }catch(e){} return r; }; }
{ const _rs=renderStart; renderStart=function(){ const r=_rs.apply(this,arguments); try{ setTitle(); }catch(e){} return r; }; }

/* ---------- 한 줄 경로 (B4) ---------- */
const tabH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
function findCrumb(){ if(TAB!=='steps' || VMODE==='flow') return {step:null,item:null}; const line=tabH()+44; let step=null, item=null;
  for(const d of document.querySelectorAll('#step-list details.step[open]')){ const r=d.getBoundingClientRect(); if(r.top<line && r.bottom>line){ const sm=d.querySelector(':scope>summary').getBoundingClientRect(); if(sm.bottom<tabH()+4) step=d; break; } }
  if(step) for(const d of step.querySelectorAll('details.item[open]')){ const r=d.getBoundingClientRect(); if(r.top<line && r.bottom>line){ const sm=d.querySelector(':scope>summary').getBoundingClientRect(); if(sm.bottom<tabH()+40) item=d; break; } }
  return {step: step && step.dataset.step, item: item && item.dataset.item}; }
function paintCrumb(){ const c=$('#crumb'); if(!c) return; const {step,item}=CRUMB; c.hidden=!step; if(!step) return;
  const st=STEPS[SIDX[step]];
  c.innerHTML=`<div class="cr-in"><button type="button" class="cr-s" data-cr="step"><b>${step}</b> ${plainT(st.t)}</button>${item?`<span class="cr-sep">›</span><button type="button" class="cr-i" data-cr="item">${plainT(IT[item].n)}</button>`:''}<span class="cr-sp"></span><button type="button" class="btn small" data-cr="close">${item?'이 항목 접기':'이 단계 접기'}</button><button type="button" class="btn small" data-cr="all" title="펼친 단계·항목을 모두 닫습니다">모두 접기</button></div>`; fitCrumb(); }
/* 경로 줄 폭 = 본문(단계 목록) 폭 */
function fitCrumb(){ const c=$('#crumb'), b=document.querySelector('#step-list details.step') || $('#step-list'); if(!c||!b||c.hidden) return; const r=b.getBoundingClientRect(); if(!r.width) return; c.style.left=r.left+'px'; c.style.width=r.width+'px'; c.style.right='auto'; }
addEventListener('resize', ()=>fitCrumb());
let CRAF=0;
addEventListener('scroll', ()=>{ if(CRAF) return; CRAF=requestAnimationFrame(()=>{ CRAF=0; const n=findCrumb(); if(n.step!==CRUMB.step || n.item!==CRUMB.item){ CRUMB=n; paintCrumb(); setTitle(); } }); }, {passive:true});
document.addEventListener('toggle', ()=>{ if(TAB==='steps'){ const n=findCrumb(); if(n.step!==CRUMB.step || n.item!==CRUMB.item){ CRUMB=n; paintCrumb(); setTitle(); } } }, true);
document.addEventListener('click', e=>{ const b=e.target.closest('[data-cr]'); if(!b) return; e.preventDefault();
  const k=b.dataset.cr, st=$('#st-'+CRUMB.step), it=CRUMB.item && $('#it-'+CRUMB.item);
  const toTop = el => smoothScrollTo(()=>el.getBoundingClientRect().top+scrollY-tabH()-8);
  if(k==='all'){ const ca=$('#collapse-all'); if(ca) ca.click(); return; }
  if(k==='step' && st) return toTop(st);
  if(k==='item' && it) return toTop(it);
  if(k==='close'){ const el = it || st; if(!el) return; el.open=false; requestAnimationFrame(()=>{ toTop(el); markHere(el); }); } });

/* ---------- 파트 패널 머리: 고른 상태를 글로 (B6) ---------- */
{ const _ap=applyPart; applyPart=function(){ const r=_ap.apply(this,arguments); try{ const sp=document.querySelector('#partRail .rail-h span'); if(sp){ sp.textContent = PSET.size ? `파트 강조 · ${PSET.size}개` : '파트 강조'; } }catch(e){} return r; }; }

/* ---------- 탭 접근성 (J2) ---------- */
function syncTabsA11y(){ document.querySelectorAll('.tabs .tab').forEach(b=>{ const id='v-'+b.dataset.tab; b.setAttribute('aria-controls', id); b.id = b.id || 'tab-'+b.dataset.tab; b.tabIndex = b.getAttribute('aria-selected')==='true' ? 0 : -1;
  const v=document.getElementById(id); if(v){ v.setAttribute('role','tabpanel'); v.setAttribute('aria-labelledby', b.id); } }); }
document.addEventListener('keydown', e=>{ const t=e.target.closest && e.target.closest('.tabs .tab'); if(!t) return; const all=[...document.querySelectorAll('.tabs .tab')], i=all.indexOf(t); let j=-1;
  if(e.key==='ArrowRight') j=(i+1)%all.length; else if(e.key==='ArrowLeft') j=(i-1+all.length)%all.length; else if(e.key==='Home') j=0; else if(e.key==='End') j=all.length-1; if(j<0) return;
  e.preventDefault(); all[j].focus(); all[j].click(); });
syncTabsA11y(); document.body.classList.add('tab-'+TAB);

/* ---------- 움직임 줄이기 (J7) ---------- */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
{ const _ss=smoothScrollTo; smoothScrollTo=function(getY, done){ if(!REDUCED.matches) return _ss(getY, done); window.scrollTo({top:Math.max(0,getY()), behavior:'instant'}); window.__progEnd=performance.now(); if(done) done(); }; }

/* ---------- 모바일 안내 (L1) ---------- */
(()=>{ const small = Math.min(screen.width, innerWidth) < 900 && matchMedia('(pointer: coarse)').matches; if(!small && innerWidth >= 700) return;
  const m=document.createElement('div'); m.id='mobileNote'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','mnT');
  m.innerHTML=`<div class="mn-c"><b id="mnT">PC에서 열어 주십시오</b><p>Run2X 설계 가이드는 PC 크롬 브라우저(화면 너비 1440 px 이상)용입니다. 연결도·계산기·3D 그림이 휴대폰 화면에서는 제대로 보이지 않습니다.</p>
    <p class="mn-u">${esc(location.href.split('#')[0])}</p><button type="button" class="btn pri" data-mncopy>주소 복사</button><button type="button" class="lnk" data-mnclose>그래도 보기</button></div>`;
  document.body.appendChild(m); document.body.classList.add('mobile-note');
  m.addEventListener('click', e=>{ if(e.target.closest('[data-mncopy]')) copyText(location.href.split('#')[0], '주소를 복사했습니다. PC에서 열어 주십시오'); if(e.target.closest('[data-mnclose]')){ m.remove(); document.body.classList.remove('mobile-note'); } }); })();

/* ---------- 비교안 스위치 (B3·D4 대기 항목, 시안에서만 바꿈) ---------- */
/* 비교안 D4(연결도 상세 칸)는 상세 칸을 없애면서 함께 없앰 */
window.setCompare = (k,on) => { document.body.classList.toggle(k, on); SETP('cmp.'+k, on?'1':'0'); try{ window.__figPlace&&window.__figPlace(); }catch(e){} };

/* ---------- 파트 패널: 마우스를 올리면 펼침, 빼면 접힘, 머리를 누르면 고정 ---------- */
(()=>{ const rail=$('#partRail'); if(!rail) return; let ti=0, to=0;
  let pin = PREF('railpin','0')==='1';
  const set = open => { rail.classList.toggle('coll', !open); rail.classList.toggle('pin', pin); try{ applyPart(); }catch(e){} const h=rail.querySelector('.rail-h'); if(h){ h.setAttribute('aria-expanded', String(open)); h.title = pin ? '고정 풀기 (마우스를 빼면 접힘)' : '눌러서 펼친 채 고정 · 마우스를 올리면 잠깐 펼쳐짐'; } };
  setTimeout(()=>set(pin), 0);   /* 목록을 처음 그린 뒤(init.js)에 적용 */
  rail.addEventListener('mouseenter', ()=>{ clearTimeout(to); ti=setTimeout(()=>set(true), 150); });
  rail.addEventListener('mouseleave', ()=>{ clearTimeout(ti); if(!pin) to=setTimeout(()=>set(false), 300); });
  rail.addEventListener('focusin', ()=>{ clearTimeout(to); set(true); });
  rail.addEventListener('focusout', e=>{ if(!pin && !rail.contains(e.relatedTarget)) to=setTimeout(()=>set(false), 300); });
  /* 사용법 등으로 자동으로 펼쳐진 경우에도: 고정이 아니고 마우스·포커스가 없고 사용법이 가리키는 대상이 아니면 잠시 뒤 접음 */
  let idle=0; setInterval(()=>{ const open=!rail.classList.contains('coll'); if(!open || pin){ idle=0; return; }
    const tourOn = ((typeof TR!=='undefined') && !!TR) || !!window.__tourCapture;   /* 사용법 중에는 건드리지 않음 */
    if(rail.matches(':hover') || rail.contains(document.activeElement) || tourOn){ idle=0; return; }
    if(++idle>=3){ idle=0; set(false); } }, 500);
  rail.addEventListener('click', e=>{ if(!e.target.closest('#railToggle')) return; e.preventDefault(); e.stopImmediatePropagation(); pin=!pin; SETP('railpin', pin?'1':'0'); set(true); }, true);
})();

/* ---------- 진행 막대: 화면을 바꾸는 동작이 0.15초를 넘기면 탭 아래에 얇은 막대를 보임 ---------- */
(()=>{ const bar=document.createElement('div'); bar.id='busyBar'; bar.setAttribute('aria-hidden','true'); document.body.appendChild(bar);
  let off=0; const on=()=>{ clearTimeout(off); bar.classList.add('on'); }, done=()=>{ requestAnimationFrame(()=>requestAnimationFrame(()=>{ off=setTimeout(()=>bar.classList.remove('on'), 60); })); };
  window.busyOn=on; window.busyDone=done;
  const HEAVY='.tabs .tab,[data-goto],[data-tabgo],[data-sysgo],[data-stepgo],[data-toc],[data-graph],[data-open],details.item>summary,details.step>summary,[data-tts],#collapse-all,.logo-mark,.wordmark';
  document.addEventListener('pointerdown', e=>{ if(e.button===0 && e.target.closest(HEAVY)) on(); }, true);
  document.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.closest && e.target.closest(HEAVY)) on(); }, true);
  document.addEventListener('click', ()=>{ if(bar.classList.contains('on')) done(); });
  document.addEventListener('pointerup', ()=>{ if(bar.classList.contains('on')) setTimeout(done, 400); }, true);
})();
