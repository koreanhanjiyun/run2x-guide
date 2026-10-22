/* ---------- 0.28.0 연결도 내용 카드: 머리 = 누르면 접기·펼치기, 끌면 이동 · 위치 기억 ---------- */
(function(){
  const _sp=setPanel;
  const getPos=()=>{ try{ return JSON.parse(PREF('gppos','null')); }catch(e){ return null; } };
  const canvasBox=p=>{ const c=document.querySelector('#v-graph .gcanvas'), w=p.parentElement; if(!c||!w) return null; const cr=c.getBoundingClientRect(), wr=w.getBoundingClientRect();
    return {minX:cr.left-wr.left+8, minY:cr.top-wr.top+8, maxR:cr.right-wr.left-8, maxB:cr.bottom-wr.top-8}; };
  const clampPos=(p,x,y)=>{ const b=canvasBox(p); if(!b) return [x,y]; p.style.maxHeight=(b.maxB-b.minY)+'px';
    const pw=p.offsetWidth, ph=p.offsetHeight; return [Math.max(b.minX,Math.min(b.maxR-pw,x)), Math.max(b.minY,Math.min(b.maxB-ph,y))]; };
  const place=p=>{ const b=canvasBox(p); if(b) p.style.maxHeight=(b.maxB-b.minY)+'px'; let pos=getPos();
    if(!pos){ p.style.left=''; p.style.right=''; p.style.top=''; const r=p.getBoundingClientRect(), w=p.parentElement.getBoundingClientRect(); pos={x:r.left-w.left,y:r.top-w.top}; }
    const [x,y]=clampPos(p,pos.x,pos.y); p.style.right='auto'; p.style.left=x+'px'; p.style.top=y+'px'; };
  window.setPanel=setPanel=function(html){ _sp(html); const p=$('#gpanel'); if(!p) return; if(!SEL){ p.classList.remove('gp-coll'); return; }
    const chips=p.querySelector(':scope>.chips'), h3=p.querySelector(':scope>h3'), x=p.querySelector(':scope>.gp-x'), op=p.querySelector(':scope [data-open]');
    if(chips && h3){ const hd=document.createElement('div'); hd.className='gp-head'; hd.title='누르면 접기·펼치기, 끌면 이동';
      chips.before(hd); hd.appendChild(chips); hd.appendChild(h3);
      const tools=document.createElement('div'); tools.className='gp-tools';
      if(op){ const ob=op.cloneNode(true); ob.className='btn pri small gp-open'; tools.appendChild(ob); }
      const ch=document.createElement('span'); ch.className='gp-chev'; ch.setAttribute('aria-hidden','true'); tools.appendChild(ch);
      if(x){ x.className='gp-x2'; tools.appendChild(x); }
      chips.appendChild(tools); }
    p.classList.toggle('gp-coll', PREF('gpcoll','0')==='1'); place(p); };
  document.addEventListener('pointerdown',e=>{ const hd=e.target.closest('#gpanel .gp-head'); if(!hd || e.target.closest('button,a,input')) return;
    const p=$('#gpanel'); e.preventDefault(); const pr=p.getBoundingClientRect(), wr=p.parentElement.getBoundingClientRect(); const ox=e.clientX-pr.left, oy=e.clientY-pr.top, sx=e.clientX, sy=e.clientY;
    hd.setPointerCapture(e.pointerId); let moved=false, last=null;
    const mv=ev=>{ if(!moved && Math.hypot(ev.clientX-sx, ev.clientY-sy)<5) return; moved=true; document.body.classList.add('gp-drag');
      const [x,y]=clampPos(p, ev.clientX-wr.left-ox, ev.clientY-wr.top-oy); p.style.right='auto'; p.style.left=x+'px'; p.style.top=y+'px'; last={x,y}; };
    const up=()=>{ hd.removeEventListener('pointermove',mv); hd.removeEventListener('pointerup',up); document.body.classList.remove('gp-drag');
      if(moved){ if(last) SETP('gppos',JSON.stringify(last)); return; }
      const c=!p.classList.contains('gp-coll'); p.classList.toggle('gp-coll',c); SETP('gpcoll',c?'1':'0'); place(p); };
    hd.addEventListener('pointermove',mv); hd.addEventListener('pointerup',up); });
  window.addEventListener('resize',()=>{ const p=$('#gpanel'); if(p && !p.hidden && SEL) place(p); });
})();

/* ---------- 0.28.0 연결도 미니맵: 끌기·확대 중에만 표시, 손 떼면 1초 뒤 사라짐 (위에 마우스 있으면 유지) ---------- */
(function(){
  let mm=null, hideT=0, hover=false, sc=1;
  function build(){ const c=document.querySelector('#v-graph .gcanvas'); if(!c || mm) return; mm=document.createElement('div'); mm.id='gmini'; mm.setAttribute('aria-hidden','true');
    mm.innerHTML='<svg><g class="mm-n"></g><rect class="mm-v"/></svg>'; c.appendChild(mm);
    mm.addEventListener('pointerenter',()=>{ hover=true; clearTimeout(hideT); });
    mm.addEventListener('pointerleave',()=>{ hover=false; schedule(); });
    const go=e=>{ const r=mm.querySelector('svg').getBoundingClientRect(), g=$('#graph').getBoundingClientRect(); const wx=(e.clientX-r.left)/sc, wy=(e.clientY-r.top)/sc;
      if(anim){ cancelAnimationFrame(anim); anim=null; } view.x=g.width/2-wx*view.k; view.y=g.height/2-wy*view.k; applyView(); };
    mm.addEventListener('pointerdown',e=>{ e.preventDefault(); mm.setPointerCapture(e.pointerId); go(e); const mv=ev=>go(ev), up=()=>{ mm.removeEventListener('pointermove',mv); mm.removeEventListener('pointerup',up); }; mm.addEventListener('pointermove',mv); mm.addEventListener('pointerup',up); }); }
  function nodes(){ const g=mm.querySelector('.mm-n'); const W=200, H=Math.max(60,Math.min(140,W*GH/GW)); sc=Math.min(W/GW,H/GH); const sv=mm.querySelector('svg'); sv.setAttribute('width',Math.ceil(GW*sc)); sv.setAttribute('height',Math.ceil(GH*sc));
    const dim=new Set([...document.querySelectorAll('#graph .node.dim')].map(n=>n.dataset.id));
    g.innerHTML=ITEMS.map(i=>{ const P=POS[i.id]; if(!P) return ''; return `<rect x="${(P.x*sc).toFixed(1)}" y="${(P.y*sc).toFixed(1)}" width="${Math.max(2,NW*sc).toFixed(1)}" height="${Math.max(1.5,NH*sc).toFixed(1)}" rx="1" fill="${getComputedStyle(document.documentElement).getPropertyValue(PCOL[i.p]).trim()||'#888'}" opacity="${dim.has(i.id)?.2:(i.id===SEL?1:.75)}"/>`; }).join(''); }
  function vrect(){ const g=$('#graph').getBoundingClientRect(), v=mm.querySelector('.mm-v');
    v.setAttribute('x',(-view.x/view.k*sc).toFixed(1)); v.setAttribute('y',(-view.y/view.k*sc).toFixed(1)); v.setAttribute('width',(g.width/view.k*sc).toFixed(1)); v.setAttribute('height',(g.height/view.k*sc).toFixed(1)); }
  function schedule(){ clearTimeout(hideT); if(hover) return; hideT=setTimeout(()=>{ if(!hover && mm) mm.classList.remove('on'); },1000); }
  const _av=applyView; applyView=function(){ _av.apply(this,arguments); if(typeof TAB!=='undefined' && TAB!=='graph') return; build(); if(!mm || !GW) return;
    if(!mm.classList.contains('on')){ nodes(); mm.classList.add('on'); } vrect(); schedule(); };
})();
