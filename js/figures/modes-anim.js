window.__modeAnim=(()=>{
const c30=Math.cos(Math.PI/6), S=120, L=1.55, T=0.6, R=0.206, W=0.2, D=Math.PI/180;
const P=(x,y,z)=>[(y-x)*c30*S, -(z-(x+y)*0.5)*S];
const pts=a=>a.map(q=>{const p=P(...q);return p[0].toFixed(1)+','+p[1].toFixed(1)}).join(' ');
const poly=(a,fill,stroke='none',sw=1,extra='')=>`<polygon points="${pts(a)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const ring=(xc,yv,r,n=48)=>Array.from({length:n},(_,i)=>{const t=i*2*Math.PI/n;return [xc+r*Math.cos(t),yv,R+r*Math.sin(t)]});
function wheel(xc,yc){ const yi=yc<0?yc+W/2:yc-W/2, yo=yc<0?yc-W/2:yc+W/2; const far=yc<0?ring(xc,yo,R):ring(xc,yi,R), near=yc<0?ring(xc,yi,R):ring(xc,yo,R);
  let s=poly(far,'#1f232c'); for(let i=0;i<48;i++){const j=(i+1)%48; s+=poly([far[i],far[j],near[j],near[i]],'#2b2f3a','#2b2f3a',.6);} s+=poly(near,'#3a3f4c','#555b69',1); s+=poly(ring(xc,near[0][1],R*0.51,32),'#9aa0ad'); return s; }
const nose=0.75, tail=-1.85;
const side=yv=>[[nose,yv*0.25,0.08],[0.2,yv*0.55,0.08],[tail,yv,0.08],[tail,yv,0.42],[-0.9,yv,0.5],[-0.25,yv*0.8,0.42],[nose,yv*0.25,0.22]];
const top=[[nose,0.08,0.22],[-0.25,0.28,0.42],[-0.9,0.36,0.5],[tail,0.36,0.42],[tail,-0.36,0.42],[-0.9,-0.36,0.5],[-0.25,-0.28,0.42],[nose,-0.08,0.22]];
const cock=Array.from({length:32},(_,i)=>{const t=i*2*Math.PI/32;return [-0.55+0.28*Math.cos(t),0.2*Math.sin(t),0.49]});
const hoop=Array.from({length:17},(_,i)=>{const t=i*Math.PI/16;return [-0.95,0.28*Math.cos(t),0.5+0.32*Math.sin(t)]});
const rotx=(q,a,zc=0.29)=>{const [x,y,z]=q,dz=z-zc,ca=Math.cos(a),sa=Math.sin(a);return [x,y*ca-dz*sa,zc+y*sa+dz*ca]};
const roty=(q,a,xc=-0.75,zc=0.29)=>{const [x,y,z]=q,dx=x-xc,dz=z-zc,ca=Math.cos(a),sa=Math.sin(a);return [xc+dx*ca+dz*sa,y,zc-dx*sa+dz*ca]};
const MODES=[
 {n:'히브',res:'스프링 · 서드 스프링',tf:(q,s)=>[q[0],q[1],q[2]+(s>0?0.22:0.06)*s],arr:'heave'},
 {n:'피치',res:'스프링 · 안티 · 서드 스프링',tf:(q,s)=>roty(q,5*D*s),arr:'pitch'},
 {n:'롤',res:'스프링 · ARB',tf:(q,s)=>rotx(q,10*D*s),arr:'roll'},
 {n:'워프',res:'스프링 · ARB',tf:(q,s)=>rotx(q,10*D*s*((q[0]+0.775)/0.775)),arr:'warp'}];
const COL={heave:'#6A4294',pitch:'#1d5f9a',roll:'#be185d',wr:'#dc2626',wb:'#1d4ed8'};
const mk=Object.values(COL).map(c=>`<marker id="ma${c.slice(1)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('');
const pl=(a,c,both=true,w=6)=>`<polyline points="${pts(a)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${both?`marker-start="url(#ma${c.slice(1)})"`:''} marker-end="url(#ma${c.slice(1)})"/>`;
const arc=(f,t0,t1,n=28)=>Array.from({length:n+1},(_,i)=>f((t0+(t1-t0)*i/n)*D));
function arrows(k){ const r=0.62;
  if(k==='heave') return pl([[-0.3,0,0.75],[-0.3,0,1.75]],COL.heave);
  if(k==='pitch') return pl(arc(t=>[-0.75+r*Math.sin(t),0,0.29+r*Math.cos(t)],-60,60),COL.pitch);
  if(k==='roll') return pl(arc(t=>[-0.75,r*Math.sin(t),0.29+r*Math.cos(t)],-60,60),COL.roll);
  // 워프: 앞·뒤축 롤 원호를 좌우 반반 색으로. 같은 색 = 같이 움직이는 대각 바퀴 쌍
  const h=(xa,c,sg)=>pl(arc(t=>[xa,r*Math.sin(t),0.29+r*Math.cos(t)],sg*6,sg*80,20),c,false);
  return h(0.1,COL.wr,1)+h(0.1,COL.wb,-1)+h(-1.6,COL.wb,1)+h(-1.6,COL.wr,-1); }
function body(m,s){ const M=a=>a.map(q=>m.tf(q,s)); return poly(M(side(-0.36)),'#cfc6e0','#8a7fa6')+poly(M(top),'#e6e0f0','#8a7fa6')+poly(M(side(0.36)),'#d9d1ea','#8a7fa6')+poly(M(cock),'#2b2f3a')+`<polyline points="${pts(M(hoop))}" fill="none" stroke="#6b6f7a" stroke-width="4"/>`; }
let panels=[], playing=false, t=0, last=0, spd=1, raf=0, built=null, pb=null;
const setGhost=()=>panels.forEach(p=>p.gh.style.display=playing?'none':'');
const draw=()=>{ const s=playing?Math.sin(2*Math.PI*t/2.4):1; panels.forEach(p=>p.g.innerHTML=body(p.m,s)); };
const setBtn=()=>{ pb.textContent=playing?'❚❚':'▶'; const l=playing?'일시정지':'재생'; pb.title=l; pb.setAttribute('aria-label',l); pb.setAttribute('aria-pressed',String(playing)); setGhost(); };
function build(el){
  const all=[[0.9,0.95,0],[0.9,-0.95,0],[-2.3,-0.95,0],[-2.3,0.95,0],[-0.75,0,1.9],[1.0,0,1.0],[-0.3,0,1.8]].map(q=>P(...q));
  const xs=all.map(p=>p[0]), ys=all.map(p=>p[1]); const x0=Math.min(...xs)-20,x1=Math.max(...xs)+20,y0=Math.min(...ys)-10,y1=Math.max(...ys)+20;
  el.innerHTML=`<div class="fm-fh"><div class="ma-bar"><b>서스 4모드</b><button type="button" class="ma-play"></button><label>속도 <input class="ma-spd" type="range" min="0.3" max="2" step="0.1" value="1"></label><span class="ma-note">바퀴는 지면 고정 · 변위 과장 · 일시정지 시 최대 변위(+) 장면 · 점선 = 정지 상태 차체</span></div></div><div class="ma-grid"></div><div class="ma-gl"><div class="ma-glh"><b>용어</b><span>각 그림 아래에 적힌, 그 변위를 억제하는 부품</span></div><dl><div><dt>스프링</dt><dd>쇽업소버(댐퍼)에 끼운 코일 스프링</dd></div><div><dt>서드 스프링</dt><dd>히브 스프링. 좌우가 같이 움직일 때만 일함</dd></div><div><dt>안티</dt><dd>안티다이브(제동)·안티스쿼트(가속). 링크 각도로 내려앉음 억제</dd></div><div><dt>ARB</dt><dd>Anti-Roll Bar. 좌우가 반대로 움직일 때만 일함</dd></div></dl></div>`;
  const grid=el.querySelector('.ma-grid'); panels=[];
  MODES.forEach(m=>{
    const back=poly([[0.9,0.95,0],[0.9,-0.95,0],[-2.3,-0.95,0],[-2.3,0.95,0]],'#f1eff6','#d6d0e3')+wheel(0,-T)+wheel(-L,-T);
    const ghost=[side(-0.36),top,side(0.36)].map(a=>poly(a,'none','#5a6375',1.6,'stroke-dasharray="6 4" stroke-opacity=".7"')).join('');
    const d=document.createElement('div'); d.className='ma-pan';
    d.innerHTML=`<h4 style="color:#6A4294">${m.n}</h4><svg viewBox="${x0} ${y0} ${x1-x0} ${y1-y0}" role="img" aria-label="${m.n} 모드"><defs>${mk}</defs>${back}<g class="body"></g>${wheel(0,T)+wheel(-L,T)}<g class="ghost">${ghost}</g>${arrows(m.arr)}</svg><small>${m.res}</small>`;
    grid.appendChild(d); panels.push({m,g:d.querySelector('.body'),gh:d.querySelector('.ghost')});
  });
  pb=el.querySelector('.ma-play');
  pb.onclick=()=>{ playing=!playing; t=0; setBtn(); draw(); if(playing && !raf){ last=performance.now(); raf=requestAnimationFrame(frame); } };
  el.querySelector('.ma-spd').oninput=e=>spd=+e.target.value;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) playing=false;
  built=el;
}
/* K6: 정지 중에는 화면을 다시 그리지 않음 (재생할 때만 프레임 반복) */
function frame(now){ const dt=Math.min(0.1,(now-last)/1000); last=now; if(playing) t+=dt*spd; draw(); raf = playing ? requestAnimationFrame(frame) : 0; }
return {
  start(el){ if(!el) return; if(built!==el) build(el); setBtn(); cancelAnimationFrame(raf); last=performance.now(); draw(); raf=requestAnimationFrame(frame); },
  stop(){ cancelAnimationFrame(raf); raf=0; playing=false; t=0; }   /* 닫으면 일시정지로: 다음에 열 때 정지 장면부터 */
};
})();

/* 좌표계 그림 파일은 처음 열 때 불러옴 (K5) */
function loadCoord(cb){ if(typeof COORD_SVG!=='undefined') return cb(); const sc=document.createElement('script'); const me=[...document.scripts].find(x=>/modes-anim\.js/.test(x.src)); const v=me&&me.src.match(/\?v=[^&]+/);
  sc.src='js/figures/coord-figs.js'+(v?v[0]:''); sc.onload=cb; sc.onerror=()=>toast('그림을 불러오지 못했습니다. 새로고침해 주십시오.'); document.head.appendChild(sc); }
function initFigRail(){ if($('#figRail')) return;
  const fr=document.createElement('aside'); fr.id='figRail';
  fr.innerHTML=`<button class="rail-h" id="figToggle" title="차량 좌표계·차체 거동 그림 보기"><span>좌표계·거동</span></button>`;
  const md=document.createElement('div'); md.id='figModal'; md.hidden=true;
  const build=()=>{ if(md.dataset.built) return; md.dataset.built='1'; md.innerHTML=`<div class="fm-panel" role="dialog" aria-label="좌표계·거동"><div class="fm-h"><b>좌표계·거동</b><button class="fm-x" aria-label="닫기" title="닫기 (Esc)">×</button></div><div class="fm-b"><div class="figrow"><figure class="coordfig"><div class="fm-fh"><b>ISO 8855 차량 좌표계</b><span>원점 O = 앞바퀴 중심선(주황 점선) × 차량 중심면(보라 점선) × 지면, 정적 상태</span><span>오른쪽 바퀴의 점은 y &lt; 0 · 볼조인트 y = −(t/2 − d<sub>l</sub>)</span></div>${COORD_SVG}</figure><figure class="coordfig"><div class="fm-fh"><b>차체 회전 (오른손 법칙)</b><span>이동(서지·스웨이·히브)의 +는 왼쪽 그림의 x·y·z와 같음</span></div>${MOTION_SVG}</figure></div><figure class="coordfig" id="modeAnimFig"></figure></div></div>`; };
  document.body.appendChild(fr); document.body.appendChild(md);
  const close=()=>{ md.hidden=true; fr.classList.remove('open'); try{ window.__modeAnim.stop(); }catch(e){} }, open=()=>{ loadCoord(()=>{ build(); md.hidden=false; fr.classList.add('open'); try{ window.__modeAnim.start($('#modeAnimFig')); }catch(e){} }); };
  fr.querySelector('#figToggle').addEventListener('click',()=>{ md.hidden?open():close(); });
  md.addEventListener('click',e=>{ if(e.target===md || e.target.closest('.fm-x')) close(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && !md.hidden) close(); });
  const place=()=>{ const r=$('#partRail'); let top; if(r && !r.hidden){ const b=r.getBoundingClientRect(); top=b.bottom+10; } else { top=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50)+14; } fr.style.top=top+'px'; fr.hidden = !(TAB==='steps'||TAB==='graph'||TAB==='parts'); if(fr.hidden && !md.hidden){ close(); } };
  window.__figPlace=place;
  try{ new ResizeObserver(place).observe($('#partRail')); }catch(e){} window.addEventListener('resize',place); place(); }
function applyPart(){ try{ initFigRail(); window.__figPlace(); }catch(e){}
  const rail=$('#partRail');
  rail.querySelectorAll('[data-part]').forEach(x=>x.setAttribute('aria-pressed',String(PSET.has(x.dataset.part))));
  const rc=$('#railClear'); if(rc) rc.hidden=!PSET.size;
  document.body.classList.toggle('rail-open', !rail.classList.contains('coll')); document.body.classList.toggle('rail-coll', rail.classList.contains('coll'));
  const h=rail.querySelector('.rail-h i'); if(h){ const cs=[...PSET].map(p=>pc(p)); h.style.background = !cs.length ? 'transparent' : cs.length===1 ? cs[0] : `conic-gradient(${cs.map((c,i)=>`${c} ${i/cs.length*360}deg ${(i+1)/cs.length*360}deg`).join(',')})`; h.title = [...PSET].join(', '); }
  applySel();
  document.querySelectorAll('details.step[data-step]').forEach(d=>{
    const its=ITEMS.filter(i=>i.s===d.dataset.step), n = PSET.size ? its.filter(i=>PSET.has(i.p)).length : 0;
    d.classList.toggle('pdim', PSET.size>0 && n===0);
    let b=d.querySelector(':scope>summary .ppc'); if(!b){ b=document.createElement('span'); b.className='ppc'; const ss=d.querySelector(':scope>summary .ssub'); if(ss) ss.after(b); }
    b.hidden = !(PSET.size && n>0); if(PSET.size && n>0){ b.innerHTML = [...PSET].map(p=>[p,its.filter(i=>i.p===p).length]).filter(x=>x[1]).map(([p,k])=>`<span class="dot" style="background:${pc(p)}"></span>${p} ${k}`).join('&nbsp;&nbsp;'); }
  });
  document.querySelectorAll('details.item[data-item]').forEach(d=>{ d.classList.toggle('pdim', PSET.size>0 && !PSET.has(IT[d.dataset.item].p)); });
  document.querySelectorAll('#flow-list li[data-fid]').forEach(li=>{ li.classList.toggle('pdim', PSET.size>0 && !PSET.has(IT[li.dataset.fid].p)); });
  document.querySelectorAll('#flow-list .flow-step[data-fs]').forEach(fs=>{ const n=ITEMS.filter(i=>i.s===fs.dataset.fs && (!PSET.size || PSET.has(i.p))).length; fs.classList.toggle('pdim', PSET.size>0 && n===0); });
}
