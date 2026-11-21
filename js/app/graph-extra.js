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
