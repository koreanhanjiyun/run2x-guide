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
  c.innerHTML=`<div class="cr-in"><button type="button" class="cr-s" data-cr="step"><b>${step}</b> ${plainT(st.t)}</button>${item?`<span class="cr-sep">›</span><button type="button" class="cr-i" data-cr="item">${plainT(IT[item].n)}</button>`:''}<span class="cr-sp"></span><span class="cr-vt" role="group" aria-label="보기 전환"><button type="button" data-vm="full" aria-pressed="${VMODE==='full'}">전체 보기</button><button type="button" data-vgo="graph" aria-pressed="false">연결도</button></span><button type="button" class="btn small" data-cr="close">${item?'이 항목 접기':'이 단계 접기'}</button><button type="button" class="btn small" data-cr="all" title="펼친 단계·항목을 모두 닫습니다">모두 접기</button></div>`; fitCrumb(); }
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
/* 파트 패널 머리: 글자는 늘 '파트 강조'. 고른 개수 · 색 표시는 두지 않음 (2026-11-24 관리자 결정: 세로 막대에서 숫자가 눕고 지저분함). 화면 읽기용 이름표만 */
{ const _ap=applyPart; applyPart=function(){ const r=_ap.apply(this,arguments); try{ const hd=document.querySelector('#partRail .rail-h'), sp=hd && hd.querySelector('span'); if(sp){ if(sp.textContent!=='파트 강조') sp.textContent='파트 강조';
    const ps=[...PSET]; hd.setAttribute('aria-label', ps.length ? `파트 강조 (${ps.length}개 고름: ${ps.join(', ')})` : '파트 강조'); } }catch(e){} return r; }; }

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
/* 글자 기차 (2026-11-24): 세로 막대 글자 V[i] ↔ 가로 머리 글자 H[i] 를 ㄱ자 선로 하나로 잇고, 모든 글자가 같은 진행률로 자기 거리를 감
   (같이 출발 · 같이 도착, 간격은 세로 간격 → 가로 간격으로 이동 내내 고르게 좁아짐). 같은 속도로 가다 앞부터 서게 하면 끝에 하나씩 '차차차작' 멈춰 보였음.
   예전에는 글자마다 따로 '위로 → 옆으로' 가서 모서리 한 점에 뭉쳤음.
   q = 0 세로 · 1 가로. 접을 때는 q 를 1 → 0 으로 = 펼침의 정확한 역재생. 반환 (i, q) → {x, y} */
function trainOf(V, H){ const n = Math.min(V.length, H.length); if(!n) return () => ({x: 0, y: 0});
  const avg = (A, k) => A.slice(0, n).reduce((a, c) => a + c[k], 0)/n, cx = avg(V, 'x'), cy = avg(H, 'y'), sg = avg(H, 'x') >= cx ? 1 : -1;
  const T = s => s < 0 ? {x: cx, y: cy - s} : {x: cx + sg*s, y: cy};   /* 선로: s < 0 세로 구간(모서리 아래), s ≥ 0 가로 구간 */
  const S0 = [], S1 = [], O0 = [], O1 = [];
  for(let i = 0; i < n; i++){ S0.push(cy - V[i].y); S1.push(sg*(H[i].x - cx)); const a = T(S0[i]), b = T(S1[i]); O0.push({x: V[i].x - a.x, y: V[i].y - a.y}); O1.push({x: H[i].x - b.x, y: H[i].y - b.y}); }
  return (i, q) => { const d = S1[i] - S0[i];
    if(!(d > 1e-6)) return {x: V[i].x + (H[i].x - V[i].x)*q, y: V[i].y + (H[i].y - V[i].y)*q};
    const u = q*d, f = q, p = T(S0[i] + u); return {x: p.x + O0[i].x*(1 - f) + O1[i].x*f, y: p.y + O0[i].y*(1 - f) + O1[i].y*f}; }; }
/* 글자 문짝 (2026-11-24, 목차용): 목차는 머리 글자가 세로 막대의 오른쪽으로 펼쳐지는데 글을 왼쪽부터 읽어, 기차(trainOf)로 가면 뒤 글자가 앞 글자를 지나쳐 겹침.
   그래서 세로줄 전체가 첫 글자를 축으로 문처럼 90° 돌아 눕게 함: 순서 · 간격(세로 간격 → 가로 간격으로 서서히)을 지킴. q = 0 세로 · 1 가로 */
function swingOf(V, H){ const n = Math.min(V.length, H.length); if(!n) return () => ({x: 0, y: 0});
  const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x), a0 = n > 1 ? ang(V[0], V[n - 1]) : Math.PI/2, a1 = n > 1 ? ang(H[0], H[n - 1]) : 0;
  let da = a1 - a0; while(da > Math.PI) da -= 2*Math.PI; while(da < -Math.PI) da += 2*Math.PI;
  return (i, q) => { const px = V[0].x + (H[0].x - V[0].x)*q, py = V[0].y + (H[0].y - V[0].y)*q; if(!i) return {x: px, y: py};
    const r0 = Math.hypot(V[i].x - V[0].x, V[i].y - V[0].y), r1 = Math.hypot(H[i].x - H[0].x, H[i].y - H[0].y), r = r0 + (r1 - r0)*q, a = a0 + da*q;
    return {x: px + r*Math.cos(a), y: py + r*Math.sin(a)}; }; }
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
  /* 펼칠 때 가로 펼침은 느리게 출발해 빠르게 끝남(ease-in) → 이어서 아래로 빠르게 출발해 느리게 멈춤(railBIn): 끊김 없이 한 동작 (2026-11-24).
     접을 때는 그대로(양끝 느림) */
  const D = 360, ease = 'cubic-bezier(.45,0,.25,1)', easeOpen = 'cubic-bezier(.5,0,.7,.4)';
  const snake = (fromOpen, done) => {   /* fromOpen = 지금 펼친 머리(가로)에서 접는 쪽으로 가는지 */
    const ez = fromOpen ? ease : easeOpen; const c0 = chars(), b0 = box(), h0 = hd.getBoundingClientRect().height + 2; st.stage = 'snake';
    (st.keep||[]).forEach(a => { try{ a.cancel(); }catch(e){} }); st.keep = [];   /* 접을 때: 칩 거두기 높이 고정을 풀어야 세로 막대가 보임 */
    apply(!fromOpen); el.classList.add('rs-anim', 'rs-snake'); const c1 = chars(), b1 = box(), h1 = hd.getBoundingClientRect().height + 2;
    const cs = getComputedStyle(sp), font = cs.font, col = getComputedStyle(hd).color; sp.style.color = 'transparent';
    const n = Math.min(c0.length, c1.length), paths = [], TR_ = trainOf(fromOpen ? c1 : c0, fromOpen ? c0 : c1), Q = p => fromOpen ? 1 - p : p;
    for(let i = 0; i < n; i++){ const V = fromOpen ? c1[i] : c0[i], Hz = fromOpen ? c0[i] : c1[i];   /* V 세로 자리, Hz 가로 자리 */
      paths.push({V, Hz});
      const E = c1[i], d = document.createElement('div'); d.className = 'rs-ch'; d.textContent = c1[i].ch; d.style.cssText = `left:${E.x}px;top:${E.y}px;font:${font};color:${col}`; 
      const tf = q => `translate(-50%,-50%) translate(${q.x - E.x}px,${q.y - E.y}px)`; d.style.transform = tf(TR_(i, Q(0))); document.body.appendChild(d); st.clones.push(d);   /* 애니메이션이 시작되기 전 한 장면도 출발 자리에 */
      const KL = []; for(let k = 0; k <= 32; k++) KL.push({transform: tf(TR_(i, Q(k/32))), offset: k/32});
      st.anims.push(d.animate(KL, {duration: D, easing: ez, fill: 'both'})); }
    /* 화살표(⟩ ⟨)는 바뀐 자리에 먼저 가 있어 글자와 겹침 → 글자가 움직이는 동안 숨겼다가 끝 무렵(80 %~) 나타남 */
    try{ st.anims.push(hd.animate([{opacity: 0}, {opacity: 0, offset: .8}, {opacity: .8}], {duration: D, easing: ez, fill: 'both', pseudoElement: '::after'})); }catch(e){}
    /* 배너 모양 = ㄱ자 (위 가로 막대 + 오른쪽 세로 막대): 상자는 두 모양을 다 담는 크기로 두고 clip-path 로 가로 막대는 왼쪽으로 늘고 세로 막대는 위로 줄게 (사각형으로 바뀌어 보이지 않게) */
    const W = fromOpen ? b0.w : b1.w, v = fromOpen ? b1.w : b0.w, Hm = fromOpen ? b1.h : b0.h, hh = fromOpen ? h0 : h1;
    el.style.width = W + 'px'; el.style.height = Math.max(Hm, hh) + 'px';
    /* 왼쪽 모서리는 배너처럼 둥글게. 가로 · 세로 막대가 만나는 안쪽(오목) 모서리도 8 px 로 둥글게(남은 막대 길이만큼만) (2026-11-24) */
    const r = 10, shape = (L, B, rh, rb) => { const ri = Math.max(0, Math.min(8, B - hh - rb, W - v - L - rh));
      return `path("M ${L + r} 0 H ${W} V ${B} H ${W - v + rb} A ${rb} ${rb} 0 0 1 ${W - v} ${B - rb} V ${hh + ri} A ${ri} ${ri} 0 0 0 ${W - v - ri} ${hh} H ${L + rh} A ${rh} ${rh} 0 0 1 ${L} ${hh - rh} V ${r} A ${r} ${r} 0 0 1 ${L + r} 0 Z")`; };
    /* 배너 끝을 글자에 붙임 (101차 고침: 글자만 먼저 가던 것): 가로 막대 왼쪽 끝 = 첫 글자, 세로 막대 아래 끝 = 끝 글자 위치에서 구해 장면 24개로 */
    const fr = p => { if(!paths.length) return p; const h = paths[0], t = paths[paths.length - 1], a = TR_(0, Q(p)), z = TR_(paths.length - 1, Q(p));
      const fl = h.V.x === h.Hz.x ? p : Math.min(1, Math.max(0, (h.V.x - a.x)/(h.V.x - h.Hz.x))), fb = t.V.y === t.Hz.y ? p : Math.min(1, Math.max(0, (t.V.y - z.y)/(t.V.y - t.Hz.y)));
      const L = (W - v)*(1 - fl), B = Hm - (Hm - hh)*fb; return shape(L, B, Math.min(r, W - v - L), Math.min(r, B - hh)); };
    const KF = []; for(let k = 0; k <= 24; k++){ const p = k/24; KF.push({clipPath: fr(p), offset: p}); }   /* fr 은 글자 자리로만 구하므로 펼침 · 접힘 같은 식 */
    el.style.clipPath = KF[0].clipPath;
    const A = el.animate(KF, {duration: D, easing: ez, fill: 'both'}); st.anims.push(A);
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
/* 펼침 = 접힘(railBOut)의 정확한 역재생 (2026-11-24): 같은 시간, 곡선은 거울(.5,0,.7,.4 → .3,.6,.5,1 빠른 출발), 칩은 위에서부터.
   예전(180 + 22n ms, 느린 출발 곡선)은 가로 펼침의 느린 끝과 붙어 멈칫해 보였음 */
const railBIn = (el, hh) => { const ks = [...el.querySelectorAll('.rail-b > :not([hidden])')], full = el.getBoundingClientRect().height, T = 130 + 16*ks.length;
  return [el.animate([{height: hh + 'px'}, {height: full + 'px'}], {duration: T, easing: 'cubic-bezier(.3,.6,.5,1)'}),
    ...ks.map((k, i) => k.animate([{opacity: 0, transform: 'translateY(-10px)'}, {opacity: 1, transform: 'none'}], {duration: 130, delay: 16*i, easing: 'ease-out', fill: 'backwards'}))]; };
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
  /* 114차: 이동과 커짐이 같은 진행도로 (가운데 키프레임을 없앰: 예전엔 55 % 지점에서 이동 85 % · 크기 60 % 라 먼저 날아온 뒤 커졌음).
     2026-11-25: 버블에서 나오는 게 보이게 — ① 기준점은 늘 가운데(창의 transform-origin 이 다르면 출발점이 어긋났음: 파트 말풍선이 버블보다 120 px 아래에서 시작)
     ② 불투명도는 앞 6 % 에서 바로 1 (예전 25 % 동안 투명한 채 빠르게 이동해, 보이기 시작할 때 이미 버블에서 멀었음) ③ 느린 출발 곡선 */
  const K = [{transform: `translate(${dx}px,${dy}px) scale(${s})`, transformOrigin: '50% 50%', opacity: 0}, {opacity: 1, offset: .06}, {transform: 'none', transformOrigin: '50% 50%', opacity: 1}];
  const a = el.animate(open ? K : [...K].reverse().map(k => ({...k, offset: k.offset != null ? 1 - k.offset : undefined})), {duration: open ? 280 : 220, easing: open ? 'cubic-bezier(.35,0,.2,1)' : 'cubic-bezier(.6,0,.75,.35)', fill: 'both'});
  el._pop = a; a.onfinish = () => { if(el._pop !== a) return; el._pop = null; if(done) done(); a.cancel(); }; }

/* ---------- 왼쪽 서랍 (2026-11-25): 설계 탭 목차 · 도구 빠른 선택. 접힘 = 벽에 붙은 세로 막대(그대로), 펼치면 펼친 판 전체가 벽 뒤에서 쑥 밀려 나옴,
   접을 때는 벽 쪽으로 밀려 들어간 뒤 세로 막대가 다시 쑥 나옴. 예전 글자 기차(tocSnake)는 이름이 긴 '도구 빠른 선택'에서 어색해 둘 다 서랍으로 통일.
   apply(open) = 클래스 · 저장 · 본문 여백. t._dsOpen = 움직이는 중 목표 상태(누르기 판정용). O = 사용법 무대(복제본) 안일 때 ---------- */
function drawerSlide(t, open, apply, O){ if(t._ds){ try{ t._ds.cancel(); }catch(e){} t._ds = null; }
  const tourOn = !O && (((typeof TR!=='undefined') && !!TR) || !!window.__tourCapture);
  if(tourOn || !t.animate || getComputedStyle(t).display === 'none'){ t._dsOpen = null; apply(open); return; }
  const out = () => -(t.offsetWidth + 4) + 'px', run = (K, o, fin) => { const a = t.animate(K, o); t._ds = a; a.onfinish = () => { if(t._ds !== a) return; t._ds = null; fin && fin(a); }; return a; };
  t._dsOpen = open;
  if(open){ apply(true); run([{transform: `translateX(${out()})`}, {transform: 'none'}], {duration: 260, easing: 'cubic-bezier(.2,.8,.3,1)'}, () => { t._dsOpen = null; }); }
  else run([{transform: 'none'}, {transform: `translateX(${out()})`}], {duration: 190, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards'}, a => { apply(false); a.cancel();
      run([{transform: `translateX(${out()})`}, {transform: 'none'}], {duration: 150, easing: 'cubic-bezier(.2,.8,.3,1)'}, () => { t._dsOpen = null; }); }); }

/* ---------- 목차 펼침 · 접힘 애니메이션 (2026-11-12, 파트 패널의 거울판): 목차는 왼쪽에 붙고 접힌 막대(왼쪽 0)와 펼친 창(왼쪽 14 px)의 자리가 달라
   목차 자체를 자르지 않고 그 위에 머리 색 판(.ts-ov, 화면 좌표 clip-path)을 띄워 ㄱ자(거울) 모양을 그림. 펼친 뒤 단계 목록이 위에서부터 차례로 · 접을 때 아래에서부터 거둠.
   apply(open) = 클래스 · 저장 · 본문 여백(tocFx). 도중에 다시 누르면 애니메이션을 끝내고 바로 그 상태로 ---------- */
function tocSnake(t, open, apply, O){ const hd = t.querySelector('.toc-h'), sp = hd && hd.querySelector('span');
  /* 118차: O = {host, k, ox, oy} — 사용법 복제본(배율 k 로 줄인 무대) 안의 목차에 그릴 때. 화면 좌표 → 무대 안 좌표, 판 · 글자는 무대에 붙임 */
  const host = (O && O.host) || document.body, k = (O && O.k) || 1, ox = (O && O.ox) || 0, oy = (O && O.oy) || 0;
  const G = r => O ? {left: (r.left - ox)/k, top: (r.top - oy)/k, right: (r.right - ox)/k, bottom: (r.bottom - oy)/k, width: r.width/k, height: r.height/k} : r;
  if(t._ts) t._ts.kill(); const tourOn = !O && (((typeof TR!=='undefined') && !!TR) || !!window.__tourCapture);
  if(tourOn || !sp || !t.animate || getComputedStyle(t).display === 'none'){ apply(open); return; }
  const S = {anims: [], els: []}; t._ts = S;
  S.kill = () => { S.anims.forEach(a => { try{ a.cancel(); }catch(e){} }); S.els.forEach(e => e.remove()); t.classList.remove('ts-hide'); t.style.height = ''; sp.style.color = ''; if(t.classList.contains('coll') === open) apply(open); t._ts = null; };
  const chars = () => { const x = sp.firstChild, R = []; if(!x || x.nodeType !== 3) return R; const r = document.createRange();
    for(let i = 0; i < x.length; i++){ const ch = x.data[i]; if(!ch.trim()) continue; r.setStart(x, i); r.setEnd(x, i + 1); const b = G(r.getBoundingClientRect()); R.push({ch, x: b.left + b.width/2, y: b.top + b.height/2}); } return R; };
  const D = 360, ease = 'cubic-bezier(.45,0,.25,1)', easeOpen = 'cubic-bezier(.5,0,.7,.4)', vis = () => { const tb = G(t.getBoundingClientRect()); return [...t.querySelectorAll('.toc-ph, .toc-s')].filter(e => { const b = G(e.getBoundingClientRect()); return b.bottom > tb.top && b.top < tb.bottom; }); };
  const snake = (toOpen, done) => {   /* toOpen = 세로 막대 → 가로 머리. 펼칠 때는 느린 출발 · 빠른 끝(파트 패널과 같음) */
    const ez = toOpen ? easeOpen : ease;
    const c0 = chars(), r0 = G(t.getBoundingClientRect()), h0 = G(hd.getBoundingClientRect()); apply(toOpen); t.classList.add('ts-hide'); const c1 = chars(), r1 = G(t.getBoundingClientRect()), h1 = G(hd.getBoundingClientRect());
    const Rc = toOpen ? r0 : r1, Ro = toOpen ? r1 : r0, Rh = toOpen ? h1 : h0, hh = Rh.bottom - Ro.top + 1, v = Rc.width, col = getComputedStyle(hd).color, font = getComputedStyle(sp).font;
    const n = Math.min(c0.length, c1.length), paths = [], TR_ = swingOf(toOpen ? c0 : c1, toOpen ? c1 : c0), Q = p => toOpen ? p : 1 - p;   /* 글자 문짝 (swingOf) */
    for(let i = 0; i < n; i++){ const V = toOpen ? c0[i] : c1[i], Hz = toOpen ? c1[i] : c0[i]; paths.push({V, Hz, i});
      const E = c1[i], d = document.createElement('div'); d.className = 'rs-ch'; d.textContent = c1[i].ch; d.style.cssText = `left:${E.x}px;top:${E.y}px;font:${font};color:${col}`;
      const tf = q => `translate(-50%,-50%) translate(${q.x - E.x}px,${q.y - E.y}px)`; d.style.transform = tf(TR_(i, Q(0))); host.appendChild(d); S.els.push(d);
      const KL = []; for(let k = 0; k <= 32; k++) KL.push({transform: tf(TR_(i, Q(k/32))), offset: k/32});
      S.anims.push(d.animate(KL, {duration: D, easing: ez, fill: 'both'})); }
    const at = (q, p) => TR_(q.i, Q(p));
    const lead = paths.reduce((m, q) => !m || Math.abs(q.Hz.x - q.V.x) > Math.abs(m.Hz.x - m.V.x) ? q : m, null), trail = paths.reduce((m, q) => !m || Math.abs(q.Hz.y - q.V.y) > Math.abs(m.Hz.y - m.V.y) ? q : m, null);
    const L = (a, b, f) => a + (b - a)*f, cl = f => Math.min(1, Math.max(0, f));
    const shape = p => { const m = toOpen ? p : 1 - p, a = lead ? at(lead, p) : null, z = trail ? at(trail, p) : null;
      const fl = a && lead.Hz.x !== lead.V.x ? cl((a.x - lead.V.x)/(lead.Hz.x - lead.V.x)) : m, fb = z && trail.Hz.y !== trail.V.y ? cl((z.y - trail.V.y)/(trail.Hz.y - trail.V.y)) : m;
      const xl = L(Rc.left, Ro.left, m), yt = L(Rc.top, Ro.top, m), xr = xl + v + (Ro.width - v)*fl, B = Rc.height - (Rc.height - hh)*fb, rl = 0, rr = 10, rh = Math.min(10, xr - xl - v), rb = Math.min(10, B - hh), ri = Math.max(0, Math.min(8, xr - xl - v - rh, B - hh - rb));   /* 왼쪽은 벽에 붙어 직각(2026-11-24, 펼쳐도 벽에 붙임), 안쪽 오목 모서리 8 px */
      return `path("M ${xl + rl} ${yt} H ${xr - rr} A ${rr} ${rr} 0 0 1 ${xr} ${yt + rr} V ${yt + hh - rh} A ${rh} ${rh} 0 0 1 ${xr - rh} ${yt + hh} H ${xl + v + ri} A ${ri} ${ri} 0 0 0 ${xl + v} ${yt + hh + ri} V ${yt + B - rb} A ${rb} ${rb} 0 0 1 ${xl + v - rb} ${yt + B} H ${xl + rl} A ${rl} ${rl} 0 0 1 ${xl} ${yt + B - rl} V ${yt + rl} A ${rl} ${rl} 0 0 1 ${xl + rl} ${yt} Z")`; };
    const ov = document.createElement('div'); ov.className = 'ts-ov'; ov.style.background = getComputedStyle(hd).backgroundColor; const KF = []; for(let k = 0; k <= 24; k++) KF.push({clipPath: shape(k/24), offset: k/24});
    ov.style.clipPath = KF[0].clipPath; host.appendChild(ov); S.els.push(ov);
    const A = ov.animate(KF, {duration: D, easing: ez, fill: 'both'}); S.anims.push(A);
    A.onfinish = () => { S.anims.forEach(a => { try{ a.cancel(); }catch(e){} }); S.anims = []; S.els.forEach(e => e.remove()); S.els = []; t.classList.remove('ts-hide');
      /* 화살표(⟨ ⟩)는 글자 이동이 끝난 뒤 짧게 나타남 (이동 중에는 목차 전체가 숨은 상태라 보이지 않음) */
      const fd = t.querySelector('.toc-fold'); if(fd && fd.animate) fd.animate([{opacity: 0}, {opacity: .85}], {duration: 140, easing: 'ease-out'});
      done(hh); }; };
  /* 펼침 = 접힘의 정확한 역재생 (2026-11-24, 파트 패널과 같음) */
  if(open) snake(true, hh => { const full = G(t.getBoundingClientRect()).height, ks = vis(), T = 130 + 8*ks.length;
      S.anims = [t.animate([{height: hh + 'px'}, {height: full + 'px'}], {duration: T, easing: 'cubic-bezier(.3,.6,.5,1)'}),
        ...ks.map((k, i) => k.animate([{opacity: 0, transform: 'translateY(-8px)'}, {opacity: 1, transform: 'none'}], {duration: 130, delay: 8*i, easing: 'ease-out', fill: 'backwards'}))];
      Promise.all(S.anims.map(a => a.finished)).then(() => { if(t._ts === S) t._ts = null; }, () => {}); });
  else { const full = G(t.getBoundingClientRect()).height, ks = vis(), hh = G(hd.getBoundingClientRect()).bottom - G(t.getBoundingClientRect()).top + 1, T = 130 + 8*ks.length;
    S.anims = [t.animate([{height: full + 'px'}, {height: hh + 'px'}], {duration: T, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards'}),
      ...ks.map((k, i) => k.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-8px)'}], {duration: 130, delay: 8*(ks.length - 1 - i), easing: 'ease-in', fill: 'both'}))];
    Promise.all(S.anims.map(a => a.finished)).then(() => { if(t._ts !== S) return; const keep = S.anims; S.anims = []; keep.forEach(a => a.cancel()); snake(false, () => { if(t._ts === S) t._ts = null; }); }, () => {}); } }

/* ---------- 파트 강조 버블 (2026-11-25): 오른쪽 아래 동그란 버블(좌표계·거동 버블 위). 누르면 파트 칩 말풍선이 버블에서 튀어나오고(popFrom),
   다시 누르기 · 바깥 누르기 · Esc 로 닫힘. 칩을 여러 개 고르는 동안은 열린 채. 마우스를 올리는 것만으로는 열리지 않음(지나가다 열리던 문제). 처음에는 늘 닫힘 ---------- */
(()=>{ const rail=$('#partRail'); if(!rail) return;
  const cls = open => { rail.classList.toggle('coll', !open); const h=rail.querySelector('.rail-h'); if(h){ h.setAttribute('aria-expanded', String(open)); h.title='파트 강조'; h.setAttribute('aria-label','파트 강조'); } try{ applyPart(); }catch(e){} };
  const set = open => { const b=rail.querySelector('.rail-b'), h=rail.querySelector('.rail-h'); if(rail._closing){ rail._closing=false; }
    if(open){ if(!rail.classList.contains('coll')) return; cls(true); popFrom(b, h, true); }
    else { if(rail.classList.contains('coll')) return; rail._closing=true; popFrom(b, h, false, ()=>{ if(!rail._closing) return; rail._closing=false; cls(false); }); } };
  window.partRailSet = set;
  setTimeout(()=>cls(false), 0);   /* 목록을 처음 그린 뒤(init.js)에 적용 */
  rail.addEventListener('click', e=>{ if(!e.target.closest('#railToggle')) return; e.preventDefault(); e.stopImmediatePropagation(); set(rail.classList.contains('coll') || rail._closing); }, true);
  document.addEventListener('pointerdown', e=>{ if(rail.classList.contains('coll') || rail.contains(e.target)) return; if((typeof TR!=='undefined') && TR) return; set(false); }, true);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !rail.classList.contains('coll')) set(false); });
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
