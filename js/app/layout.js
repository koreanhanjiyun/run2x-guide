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
const TABNAME = {start:'시작', goals:'목표', steps:'설계', graph:'설계 · 연결도', tools:'도구', ref:'참고', team:'팀'};
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
  c.innerHTML=`<div class="cr-in"><button type="button" class="cr-s" data-cr="step"><b>${step}</b> ${plainT(st.t)}</button>${item?`<span class="cr-sep">›</span><button type="button" class="cr-i" data-cr="item">${plainT(IT[item].n)}</button>`:''}<span class="cr-sp"></span><span class="cr-vt" role="group" aria-label="보기 전환"><button type="button" data-vm="full" aria-pressed="${VMODE==='full'}">전체 보기</button><button type="button" data-vm="flow" aria-pressed="${VMODE==='flow'}">흐름만 보기</button><button type="button" data-vgo="graph" aria-pressed="false">연결도</button></span><button type="button" class="btn small" data-cr="close">${item?'이 항목 접기':'이 단계 접기'}</button><button type="button" class="btn small" data-cr="all" title="펼친 단계·항목을 모두 닫습니다">모두 접기</button></div>`; fitCrumb(); }
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
/* 움직임(부드러운 스크롤·애니메이션)은 OS의 '애니메이션 줄이기' 설정과 상관없이 항상 동작 (사이트 운영자 결정 2026-10-31) */

/* ---------- 모바일 안내 (L1) ---------- */
(()=>{ const small = Math.min(screen.width, innerWidth) < 900 && matchMedia('(pointer: coarse)').matches; if(!small && innerWidth >= 700) return;
  const m=document.createElement('div'); m.id='mobileNote'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','mnT');
  m.innerHTML=`<div class="mn-c"><b id="mnT">PC에서 열어 주십시오</b><p>Run2X 설계 가이드는 PC 크롬 브라우저(화면 너비 1440 px 이상)용입니다. 연결도·계산기·3D 그림이 휴대폰 화면에서는 제대로 보이지 않습니다.</p>
    <p class="mn-u">${esc(location.href.split('#')[0])}</p><button type="button" class="btn pri" data-mncopy>주소 복사</button><button type="button" class="lnk" data-mnclose>그래도 보기</button></div>`;
  document.body.appendChild(m); document.body.classList.add('mobile-note');
  m.addEventListener('click', e=>{ if(e.target.closest('[data-mncopy]')) copyText(location.href.split('#')[0], '주소를 복사했습니다. PC에서 열어 주십시오'); if(e.target.closest('[data-mnclose]')){ m.remove(); document.body.classList.remove('mobile-note'); } }); })();

/* ---------- 오른쪽 배너 펼침 애니메이션 (2026-11-12): 머리 글자가 ㄱ자 길(세로 줄 위로 → 모서리에서 왼쪽)을 따라 가로로 눕고,
   배너는 그동안 폭이 넓어지고 높이가 머리 높이로 줄어듦 → 다 펴지면 내용(in)이 이어서 나옴. 닫을 때는 내용(out)을 먼저 거두고 거꾸로 되감음.
   apply(open) = 클래스만 바꾸는 함수. 사용법 중에는 애니메이션 없이 바로 바꿈. 도중에 반대로 바뀌면 그 자리에서 되돌아감 ---------- */
function railSnake(el, open, o){ const apply = o.apply, hd = el.querySelector('.rail-h'), sp = hd && hd.querySelector('span');
  const st = el._rs || (el._rs = {open: null, stage: '', anims: [], clones: []});
  const clean = () => { [...st.anims, ...(st.keep||[])].forEach(a => { try{ a.cancel(); }catch(e){} }); st.anims = []; st.keep = []; st.clones.forEach(c => c.remove()); st.clones = []; el.classList.remove('rs-anim', 'rs-snake'); el.style.width = el.style.height = el.style.clipPath = ''; st.stage = ''; };
  const tourOn = ((typeof TR!=='undefined') && !!TR) || !!window.__tourCapture;
  if(st.open === open && st.stage) return;
  if(st.stage === 'snake' && st.open !== open){ st.open = open; st.anims.forEach(a => a.reverse()); return; }   /* 글자 이동 중 반대로 → 되감기 */
  if(st.stage){ clean(); sp && (sp.style.color = ''); if(o.isOpen() === open){ st.open = null; if(o.instant) o.instant(open); return; } }   /* 내용 단계 중 반대로 → 지금 자리에서 다시 시작 */
  st.open = open;
  if(tourOn || !sp || !el.animate || el.hidden){ apply(open); if(o.instant) o.instant(open); st.open = null; return; }
  const chars = () => { const t = sp.firstChild, R = []; if(!t || t.nodeType !== 3) return R; const r = document.createRange();
    for(let i = 0; i < t.length; i++){ const ch = t.data[i]; if(!ch.trim()) continue; r.setStart(t, i); r.setEnd(t, i + 1); const b = r.getBoundingClientRect(); R.push({ch, x: b.left + b.width/2, y: b.top + b.height/2}); } return R; };
  const box = () => { const b = el.getBoundingClientRect(); return {w: b.width, h: b.height}; };
  const D = 360, ease = 'cubic-bezier(.45,0,.25,1)';
  const snake = (fromOpen, done) => {   /* fromOpen = 지금 펼친 머리(가로)에서 접는 쪽으로 가는지 */
    const c0 = chars(), b0 = box(), h0 = hd.getBoundingClientRect().height + 2; st.stage = 'snake';
    (st.keep||[]).forEach(a => { try{ a.cancel(); }catch(e){} }); st.keep = [];   /* 접을 때: 칩 거두기 높이 고정을 풀어야 세로 막대가 보임 */
    apply(!fromOpen); el.classList.add('rs-anim', 'rs-snake'); const c1 = chars(), b1 = box(), h1 = hd.getBoundingClientRect().height + 2;
    const cs = getComputedStyle(sp), font = cs.font, col = getComputedStyle(hd).color; sp.style.color = 'transparent';
    const n = Math.min(c0.length, c1.length), paths = [];
    for(let i = 0; i < n; i++){ const V = fromOpen ? c1[i] : c0[i], Hz = fromOpen ? c0[i] : c1[i];   /* V 세로 자리, Hz 가로 자리 */
      const P = [V, {x: V.x, y: Hz.y}, Hz]; if(fromOpen) P.reverse(); const L1 = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y), L2 = Math.hypot(P[2].x - P[1].x, P[2].y - P[1].y); paths.push({V, Hz, P, k: L1 + L2 ? L1/(L1 + L2) : .5});
      const E = c1[i], d = document.createElement('div'); d.className = 'rs-ch'; d.textContent = c1[i].ch; d.style.cssText = `left:${E.x}px;top:${E.y}px;font:${font};color:${col}`; 
      const tf = q => `translate(-50%,-50%) translate(${q.x - E.x}px,${q.y - E.y}px)`; d.style.transform = tf(P[0]); document.body.appendChild(d); st.clones.push(d);   /* 애니메이션이 시작되기 전 한 장면도 출발 자리에 */
      st.anims.push(d.animate([{transform: tf(P[0]), offset: 0}, {transform: tf(P[1]), offset: L1 + L2 ? L1/(L1 + L2) : .5}, {transform: tf(P[2]), offset: 1}], {duration: D, easing: ease, fill: 'both'})); }
    /* 배너 모양 = ㄱ자 (위 가로 막대 + 오른쪽 세로 막대): 상자는 두 모양을 다 담는 크기로 두고 clip-path 로 가로 막대는 왼쪽으로 늘고 세로 막대는 위로 줄게 (사각형으로 바뀌어 보이지 않게) */
    const W = fromOpen ? b0.w : b1.w, v = fromOpen ? b1.w : b0.w, Hm = fromOpen ? b1.h : b0.h, hh = fromOpen ? h0 : h1;
    el.style.width = W + 'px'; el.style.height = Math.max(Hm, hh) + 'px';
    const r = 10, shape = (L, B, rh, rb) => `path("M ${L + r} 0 H ${W} V ${B} H ${W - v + rb} A ${rb} ${rb} 0 0 1 ${W - v} ${B - rb} V ${hh} H ${L + rh} A ${rh} ${rh} 0 0 1 ${L} ${hh - rh} V ${r} A ${r} ${r} 0 0 1 ${L + r} 0 Z")`;   /* 왼쪽 모서리는 배너처럼 둥글게 */
    /* 배너 끝을 글자에 붙임 (101차 고침: 글자만 먼저 가던 것): 가로 막대 왼쪽 끝 = 첫 글자, 세로 막대 아래 끝 = 끝 글자 위치에서 구해 장면 24개로 */
    const at = (q, p) => { const P = q.P, k = q.k, f = p < k ? p/k : (p - k)/(1 - k), a = p < k ? P[0] : P[1], b = p < k ? P[1] : P[2]; return {x: a.x + (b.x - a.x)*f, y: a.y + (b.y - a.y)*f}; };
    const fr = p => { if(!paths.length) return p; const h = paths[0], t = paths[paths.length - 1], a = at(h, p), z = at(t, p);
      const fl = h.V.x === h.Hz.x ? p : Math.min(1, Math.max(0, (h.V.x - a.x)/(h.V.x - h.Hz.x))), fb = t.V.y === t.Hz.y ? p : Math.min(1, Math.max(0, (t.V.y - z.y)/(t.V.y - t.Hz.y)));
      const L = (W - v)*(1 - fl), B = Hm - (Hm - hh)*fb; return shape(L, B, Math.min(r, W - v - L), Math.min(r, B - hh)); };
    const KF = []; for(let k = 0; k <= 24; k++){ const p = k/24; KF.push({clipPath: fr(p), offset: p}); }   /* fr 은 글자 자리로만 구하므로 펼침 · 접힘 같은 식 */
    el.style.clipPath = KF[0].clipPath;
    const A = el.animate(KF, {duration: D, easing: ease, fill: 'both'}); st.anims.push(A);
    st.stage = 'snake'; const want = st.open;
    A.onfinish = () => { const rev = A.playbackRate < 0; sp.style.color = ''; (st.keep||[]).forEach(a => { try{ a.cancel(); }catch(e){} }); st.keep = []; st.clones.forEach(c => c.remove()); st.clones = []; st.anims.forEach(a => { try{ a.cancel(); }catch(e){} }); st.anims = []; el.style.width = el.style.height = el.style.clipPath = ''; el.classList.remove('rs-snake');
      if(rev){ apply(fromOpen); el.classList.remove('rs-anim'); st.stage = ''; if(o.instant) o.instant(fromOpen); const w = st.open; st.open = null; if(w !== fromOpen) railSnake(el, w, o); return; }
      done(hh); }; };
  if(open){ snake(false, hh => { st.stage = 'in'; const r = o.in ? o.in(hh) : null; const fin = () => { el.classList.remove('rs-anim'); el.style.height = ''; st.stage = ''; st.anims = []; st.open = null; };
      if(r && r.length){ st.anims = r; Promise.all(r.map(a => a.finished)).then(fin, () => {}); } else fin(); }); }
  else { const r = o.out ? o.out() : null; st.stage = 'out'; el.classList.add('rs-anim');
    const go = () => { st.keep = st.anims; st.anims = []; snake(true, () => { el.classList.remove('rs-anim'); st.stage = ''; st.open = null; }); };
    if(r && r.length){ st.anims = r; Promise.all(r.map(a => a.finished)).then(go, () => {}); } else go(); } }
/* 파트 패널 내용: 칩이 위에서부터 차례로 (펼칠 때) · 아래에서부터 차례로 (접을 때). 배너 높이도 같이 */
const railBIn = (el, hh) => { const ks = [...el.querySelectorAll('.rail-b > :not([hidden])')], full = el.getBoundingClientRect().height, T = 180 + 22*ks.length;
  return [el.animate([{height: hh + 'px'}, {height: full + 'px'}], {duration: T, easing: 'cubic-bezier(.3,0,.2,1)'}),
    ...ks.map((k, i) => k.animate([{opacity: 0, transform: 'translateY(-10px)'}, {opacity: 1, transform: 'none'}], {duration: 180, delay: 22*i, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards'}))]; };
const railBOut = el => { const ks = [...el.querySelectorAll('.rail-b > :not([hidden])')], hd = el.querySelector('.rail-h'), full = el.getBoundingClientRect().height, hh = hd.getBoundingClientRect().height + 2;
  const T = 130 + 16*ks.length;   /* 펼칠 때를 거꾸로: 아래 칩부터 위로 차례로 들어가며 배너 높이도 같이 줄어듦 */
  return [el.animate([{height: full + 'px'}, {height: hh + 'px'}], {duration: T, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards'}),
    ...ks.map((k, i) => k.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-10px)'}], {duration: 130, delay: 16*(ks.length - 1 - i), easing: 'ease-in', fill: 'both'}))]; };

/* ---------- 창을 단추에서 꺼내기 · 단추로 넣기 (2026-11-12): 좌표계·거동 그림 창, 문의 창. 창이 단추 자리에서 작게 시작해 제자리로 커지며 날아오고, 닫을 때 거꾸로.
   open = 보인 직후 부름, close = 숨기기 전에 부르고 끝나면 done(). 도중에 반대로 바뀌면 앞 것을 멈추고 그 자리에서. 사용법 중에는 바로 ---------- */
function popFrom(el, src, open, done){ if(!el) return; const tourOn = ((typeof TR!=='undefined') && !!TR) || !!window.__tourCapture;
  if(el._pop){ try{ el._pop.cancel(); }catch(e){} el._pop = null; }
  if(tourOn || !el.animate || !src || !src.getBoundingClientRect){ if(done) done(); return; }
  const P = el.getBoundingClientRect(), B = src.getBoundingClientRect(); if(!P.width || !B.width){ if(done) done(); return; }
  const z = parseFloat(getComputedStyle(el).zoom) || 1;   /* 그림 창은 화면 높이에 맞춰 zoom 으로 줄어 있을 수 있음: 옮길 거리는 zoom 전 단위로 */
  const dx = ((B.left + B.width/2) - (P.left + P.width/2))/z, dy = ((B.top + B.height/2) - (P.top + P.height/2))/z, s = Math.max(.04, Math.min(B.width/P.width, B.height/P.height));
  const K = [{transform: `translate(${dx}px,${dy}px) scale(${s})`, opacity: 0}, {transform: `translate(${dx*.15}px,${dy*.15}px) scale(${.6 + s*.4})`, opacity: 1, offset: .55}, {transform: 'none', opacity: 1}];
  const a = el.animate(open ? K : [...K].reverse().map(k => ({...k, offset: k.offset != null ? 1 - k.offset : undefined})), {duration: open ? 340 : 260, easing: open ? 'cubic-bezier(.2,.8,.25,1)' : 'cubic-bezier(.5,0,.75,.3)', fill: 'both'});
  el._pop = a; a.onfinish = () => { if(el._pop !== a) return; el._pop = null; if(done) done(); a.cancel(); }; }

/* ---------- 목차 펼침 · 접힘 애니메이션 (2026-11-12, 파트 패널의 거울판): 목차는 왼쪽에 붙고 접힌 막대(왼쪽 0)와 펼친 창(왼쪽 14 px)의 자리가 달라
   목차 자체를 자르지 않고 그 위에 머리 색 판(.ts-ov, 화면 좌표 clip-path)을 띄워 ㄱ자(거울) 모양을 그림. 펼친 뒤 단계 목록이 위에서부터 차례로 · 접을 때 아래에서부터 거둠.
   apply(open) = 클래스 · 저장 · 본문 여백(tocFx). 도중에 다시 누르면 애니메이션을 끝내고 바로 그 상태로 ---------- */
function tocSnake(t, open, apply){ const hd = t.querySelector('.toc-h'), sp = hd && hd.querySelector('span');
  if(t._ts) t._ts.kill(); const tourOn = ((typeof TR!=='undefined') && !!TR) || !!window.__tourCapture;
  if(tourOn || !sp || !t.animate || getComputedStyle(t).display === 'none'){ apply(open); return; }
  const S = {anims: [], els: []}; t._ts = S;
  S.kill = () => { S.anims.forEach(a => { try{ a.cancel(); }catch(e){} }); S.els.forEach(e => e.remove()); t.classList.remove('ts-hide'); t.style.height = ''; sp.style.color = ''; if(t.classList.contains('coll') === open) apply(open); t._ts = null; };
  const chars = () => { const x = sp.firstChild, R = []; if(!x || x.nodeType !== 3) return R; const r = document.createRange();
    for(let i = 0; i < x.length; i++){ const ch = x.data[i]; if(!ch.trim()) continue; r.setStart(x, i); r.setEnd(x, i + 1); const b = r.getBoundingClientRect(); R.push({ch, x: b.left + b.width/2, y: b.top + b.height/2}); } return R; };
  const D = 360, ease = 'cubic-bezier(.45,0,.25,1)', vis = () => { const tb = t.getBoundingClientRect(); return [...t.querySelectorAll('.toc-ph, .toc-s')].filter(e => { const b = e.getBoundingClientRect(); return b.bottom > tb.top && b.top < tb.bottom; }); };
  const snake = (toOpen, done) => {   /* toOpen = 세로 막대 → 가로 머리 */
    const c0 = chars(), r0 = t.getBoundingClientRect(), h0 = hd.getBoundingClientRect(); apply(toOpen); t.classList.add('ts-hide'); const c1 = chars(), r1 = t.getBoundingClientRect(), h1 = hd.getBoundingClientRect();
    const Rc = toOpen ? r0 : r1, Ro = toOpen ? r1 : r0, Rh = toOpen ? h1 : h0, hh = Rh.bottom - Ro.top + 1, v = Rc.width, col = getComputedStyle(hd).color, font = getComputedStyle(sp).font;
    const n = Math.min(c0.length, c1.length), paths = [];
    for(let i = 0; i < n; i++){ const V = toOpen ? c0[i] : c1[i], Hz = toOpen ? c1[i] : c0[i], P = [V, {x: V.x, y: Hz.y}, Hz]; if(!toOpen) P.reverse();
      const L1 = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y), L2 = Math.hypot(P[2].x - P[1].x, P[2].y - P[1].y); paths.push({V, Hz, P, k: L1 + L2 ? L1/(L1 + L2) : .5});
      const E = c1[i], d = document.createElement('div'); d.className = 'rs-ch'; d.textContent = c1[i].ch; d.style.cssText = `left:${E.x}px;top:${E.y}px;font:${font};color:${col}`;
      const tf = q => `translate(-50%,-50%) translate(${q.x - E.x}px,${q.y - E.y}px)`; d.style.transform = tf(P[0]); document.body.appendChild(d); S.els.push(d);
      S.anims.push(d.animate([{transform: tf(P[0]), offset: 0}, {transform: tf(P[1]), offset: paths[i].k}, {transform: tf(P[2]), offset: 1}], {duration: D, easing: ease, fill: 'both'})); }
    const at = (q, p) => { const P = q.P, k = q.k, f = p < k ? p/k : (p - k)/(1 - k), a = p < k ? P[0] : P[1], b = p < k ? P[1] : P[2]; return {x: a.x + (b.x - a.x)*f, y: a.y + (b.y - a.y)*f}; };
    const lead = paths.reduce((m, q) => !m || Math.abs(q.Hz.x - q.V.x) > Math.abs(m.Hz.x - m.V.x) ? q : m, null), trail = paths.reduce((m, q) => !m || Math.abs(q.Hz.y - q.V.y) > Math.abs(m.Hz.y - m.V.y) ? q : m, null);
    const L = (a, b, f) => a + (b - a)*f, cl = f => Math.min(1, Math.max(0, f));
    const shape = p => { const m = toOpen ? p : 1 - p, a = lead ? at(lead, p) : null, z = trail ? at(trail, p) : null;
      const fl = a && lead.Hz.x !== lead.V.x ? cl((a.x - lead.V.x)/(lead.Hz.x - lead.V.x)) : m, fb = z && trail.Hz.y !== trail.V.y ? cl((z.y - trail.V.y)/(trail.Hz.y - trail.V.y)) : m;
      const xl = L(Rc.left, Ro.left, m), yt = L(Rc.top, Ro.top, m), xr = xl + v + (Ro.width - v)*fl, B = Rc.height - (Rc.height - hh)*fb, rl = 10*m, rr = 10, rh = Math.min(10, xr - xl - v), rb = Math.min(10, B - hh);
      return `path("M ${xl + rl} ${yt} H ${xr - rr} A ${rr} ${rr} 0 0 1 ${xr} ${yt + rr} V ${yt + hh - rh} A ${rh} ${rh} 0 0 1 ${xr - rh} ${yt + hh} H ${xl + v} V ${yt + B - rb} A ${rb} ${rb} 0 0 1 ${xl + v - rb} ${yt + B} H ${xl + rl} A ${rl} ${rl} 0 0 1 ${xl} ${yt + B - rl} V ${yt + rl} A ${rl} ${rl} 0 0 1 ${xl + rl} ${yt} Z")`; };
    const ov = document.createElement('div'); ov.className = 'ts-ov'; ov.style.background = getComputedStyle(hd).backgroundColor; const KF = []; for(let k = 0; k <= 24; k++) KF.push({clipPath: shape(k/24), offset: k/24});
    ov.style.clipPath = KF[0].clipPath; document.body.appendChild(ov); S.els.push(ov);
    const A = ov.animate(KF, {duration: D, easing: ease, fill: 'both'}); S.anims.push(A);
    A.onfinish = () => { S.anims.forEach(a => { try{ a.cancel(); }catch(e){} }); S.anims = []; S.els.forEach(e => e.remove()); S.els = []; t.classList.remove('ts-hide'); done(hh); }; };
  if(open) snake(true, hh => { const full = t.getBoundingClientRect().height, ks = vis(), T = 180 + 12*ks.length;
      S.anims = [t.animate([{height: hh + 'px'}, {height: full + 'px'}], {duration: T, easing: 'cubic-bezier(.3,0,.2,1)'}),
        ...ks.map((k, i) => k.animate([{opacity: 0, transform: 'translateY(-8px)'}, {opacity: 1, transform: 'none'}], {duration: 180, delay: 12*i, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards'}))];
      Promise.all(S.anims.map(a => a.finished)).then(() => { if(t._ts === S) t._ts = null; }, () => {}); });
  else { const full = t.getBoundingClientRect().height, ks = vis(), hh = hd.getBoundingClientRect().bottom - t.getBoundingClientRect().top + 1, T = 130 + 8*ks.length;
    S.anims = [t.animate([{height: full + 'px'}, {height: hh + 'px'}], {duration: T, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards'}),
      ...ks.map((k, i) => k.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-8px)'}], {duration: 130, delay: 8*(ks.length - 1 - i), easing: 'ease-in', fill: 'both'}))];
    Promise.all(S.anims.map(a => a.finished)).then(() => { if(t._ts !== S) return; const keep = S.anims; S.anims = []; keep.forEach(a => a.cancel()); snake(false, () => { if(t._ts === S) t._ts = null; }); }, () => {}); } }

/* ---------- 파트 패널: 마우스를 올리면 펼침, 빼면 접힘, 머리를 누르면 고정 ---------- */
(()=>{ const rail=$('#partRail'); if(!rail) return; let ti=0, to=0;
  let pin = PREF('railpin','0')==='1';
  const cls = open => { rail.classList.toggle('coll', !open); try{ applyPart(); }catch(e){} };
  const set = (open, now) => { rail.classList.toggle('pin', pin); const h=rail.querySelector('.rail-h'); if(h){ h.setAttribute('aria-expanded', String(open)); h.title = pin ? '고정 풀기 (마우스를 빼면 접힘)' : '눌러서 펼친 채 고정 · 마우스를 올리면 잠깐 펼쳐짐'; }
    const cur = rail._rs && rail._rs.stage ? rail._rs.open : !rail.classList.contains('coll'); if(cur === open) return;
    if(now) cls(open); else railSnake(rail, open, {apply: cls, isOpen: () => !rail.classList.contains('coll'), in: hh => railBIn(rail, hh), out: () => railBOut(rail)}); };
  setTimeout(()=>set(pin, true), 0);   /* 목록을 처음 그린 뒤(init.js)에 적용 */
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
