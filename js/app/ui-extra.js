function initNext(){
  tagGoals(); buildTerms(); initTips(); renderOnboard(); renderToc();
  document.querySelectorAll('details.calc').forEach(runCalc);
  annotate($('#flow-list'));
  document.querySelectorAll('#goal-tree .gwhy').forEach(g=>annotate(g));
  applyModes(); refreshVals(); spyToc(); updateGraphHint();
  initChangelog(); initDebug(); decorate(); tocFx(); initAdm(); initLinks(); initQA(); initRefFold(); requestAnimationFrame(gtreeLines); narrowCheck(); const fb=$('#z-fs'); if(fb) fb.innerHTML=FS_OUT;
}
function updateGraphHint(){ const h=$('#gstart'); if(h) h.hidden = !!(((typeof PSET!=='undefined')&&PSET.size)||SEL||SHOWALL); }

/* ---------- 연결도: 내용 카드 닫기 · 전체 화면 ---------- */
function fsUI(on){ const rail=$('#partRail'), w=document.querySelector('.gwrap'), b=$('#z-fs');
  if(on){ if(rail.parentElement!==w) w.appendChild(rail); } else if(rail.parentElement!==document.body) document.body.insertBefore(rail, $('#toc'));
  document.body.classList.toggle('gfs', on);
  if(b){ b.innerHTML = on?FS_IN:FS_OUT; b.title = on?'전체 화면 끝내기 (Esc)':'전체 화면'; } }
function setMax(on){ document.body.classList.toggle('gmax', on); fsUI(on); }
function toggleFS(){ const w=document.querySelector('.gwrap');
  if(document.fullscreenElement){ document.exitFullscreen().catch(()=>{}); return; }
  if(document.body.classList.contains('gmax')){ setMax(false); return; }
  let p; try{ p = w.requestFullscreen ? w.requestFullscreen() : Promise.reject(); }catch(e){ p = Promise.reject(e); }
  Promise.resolve(p).catch(()=>setMax(true)); }
document.addEventListener('fullscreenchange',()=>fsUI(!!document.fullscreenElement));
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && document.body.classList.contains('gmax')) setMax(false); });
document.addEventListener('click',e=>{
  if(e.target.closest('#z-fs')){ toggleFS(); return; }
  if(e.target.closest('[data-gclose]')){ clearSel(); return; } });

/* ---------- 목차 접기 · 너비 조절 ---------- */
document.addEventListener('click',e=>{ const f=e.target.closest('.toc-h'); if(!f) return; const t=$('#toc'); t.classList.toggle('coll'); if(!document.body.classList.contains('toc-narrow')) SETP('tocc', t.classList.contains('coll')?'1':'0'); tocFx(); });
document.addEventListener('pointerdown',e=>{ const h=e.target.closest('.toc-rs'); if(!h) return; e.preventDefault(); const t=$('#toc'); const left=t.getBoundingClientRect().left; h.setPointerCapture(e.pointerId); document.body.classList.add('toc-drag');
  const mv=ev=>{ setTocW(ev.clientX-left); tocFx(); };
  const up=ev=>{ h.removeEventListener('pointermove',mv); h.removeEventListener('pointerup',up); document.body.classList.remove('toc-drag'); SETP('tocw', String(Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tocw'))))); };
  h.addEventListener('pointermove',mv); h.addEventListener('pointerup',up); });

/* ---------- 이전 위치로: 도착한 카드를 떠날 때만 지움 ---------- */
let LAND=null;
function clearHist(){ LAND=null; if(!HIST.length && $('#backbtn').hidden) return; HIST.length=0; $('#backbtn').hidden=true; }
{ const _mh=markHere; markHere=function(el){ _mh(el); if(HIST.length) LAND=el; }; }
{ const _ph=pushHist; pushHist=function(){ HIST.length=0; LAND=null; _ph(); }; }
{ const _gb=goBack; goBack=function(){ LAND=null; _gb(); }; }
{ const _si=selectItem; selectItem=function(id,center){ if(!center && TAB==='graph' && HIST.length) clearHist(); _si(id,center); if(center && HIST.length) LAND='graph:'+id; }; }
{ const _cs=clearSel; clearSel=function(){ if(TAB==='graph' && HIST.length && !window.__inBack) clearHist(); _cs(); }; }
document.addEventListener('click', e=>{
  if(e.target.closest('.tab')){ clearHist(); return; }
  const sm=e.target.closest('summary'); if(!sm || !HIST.length || !LAND || typeof LAND==='string') return;
  const d=sm.parentElement; if(!d || d.tagName!=='DETAILS') return;
  if(d===LAND || d.contains(LAND)){ if(d.open) clearHist(); return; }      // 도착한 카드(또는 그 바깥 단계)를 닫음
  if(LAND.contains(d)) return;                                            // 카드 안의 질문 등은 유지
  if(!d.open) clearHist();                                                // 다른 항목·단계를 펼침
}, true);
window.addEventListener('scroll', ()=>{ if(SCR || !HIST.length || !LAND || typeof LAND==='string') return;
  const r=LAND.getBoundingClientRect(), tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
  if(r.bottom < tabh || r.top > window.innerHeight) clearHist(); }, {passive:true});

/* ---------- 변경 이력: 버전 선택 ---------- */
function initChangelog(){
  const d=[...document.querySelectorAll('#ref-list > details')].find(x=>x.querySelector(':scope>summary .stitle')?.textContent.trim()==='변경 이력'); if(!d) return;
  const body=d.querySelector('.dbody'); const labs=[...body.querySelectorAll(':scope > .sec-label')].filter(l=>/^\d+\.\d+\.\d+/.test(l.textContent.trim()));
  if(!labs.length) return;
  const vers=labs.map(l=>{ const box=document.createElement('div'); box.className='clv'; l.before(box); box.append(l); l.hidden=true; const ul=box.nextElementSibling; if(ul && ul.matches('ul')) box.append(ul); return {v:l.textContent.trim(), box}; });
  const sel=document.createElement('div'); sel.className='clsel';
  sel.innerHTML=`<span>버전</span><div class="cldd"><button type="button" class="cldd-b" aria-haspopup="listbox" aria-expanded="false"></button><ul class="cldd-l" role="listbox" hidden>${vers.map((x,i)=>`<li role="option" data-i="${i}">${x.v}${i===0?' <em>최신</em>':''}</li>`).join('')}</ul></div>`;
  vers[0].box.before(sel);
  const btn=sel.querySelector('.cldd-b'), list=sel.querySelector('.cldd-l'); let cur=0;
  const show=i=>{ cur=i; vers.forEach((x,k)=>{ x.box.hidden = k!==i; }); btn.innerHTML=`${vers[i].v}${i===0?' <em>최신</em>':''}`; list.querySelectorAll('li').forEach((li,k)=>li.setAttribute('aria-selected',String(k===i))); };
  const open=o=>{ list.hidden=!o; btn.setAttribute('aria-expanded',String(o)); if(o){ const li=list.querySelector(`li[data-i="${cur}"]`); if(li) li.scrollIntoView({block:'nearest'}); } };
  btn.addEventListener('click',()=>open(list.hidden));
  list.addEventListener('click',e=>{ const li=e.target.closest('li'); if(!li) return; show(+li.dataset.i); open(false); btn.focus(); });
  btn.addEventListener('keydown',e=>{ if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); show(Math.max(0,Math.min(vers.length-1,cur+(e.key==='ArrowDown'?1:-1)))); } else if(e.key==='Escape') open(false); });
  document.addEventListener('click',e=>{ if(!sel.contains(e.target)) open(false); });
  show(0); }

/* ---------- 목표 트리 연결선 · 흐름 카드 머리 ---------- */
function decorate(){
  const top=document.querySelector('#goal-tree > .stack'); if(top) top.classList.add('gtree','gt1');
  document.querySelectorAll('#goal-tree > .stack > details > .dbody > .stack').forEach(s=>s.classList.add('gtree','gt2'));
  document.querySelectorAll('#flow-list .flow-step[data-fs]').forEach(fs=>{ const h=fs.querySelector('.flow-sh'); if(h && !h.querySelector('.fs-n')){ const n=ITEMS.filter(i=>i.s===fs.dataset.fs).length; const sp=document.createElement('span'); sp.className='fs-n'; sp.textContent=`항목 ${n}`; h.append(sp); } });
}
const FS_OUT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const FS_IN='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

document.addEventListener('mouseover',e=>{ const q=e.target.closest('.qterm'); if(!q) return; const tip=$('#tip'); if(!tip) return;
  tip.innerHTML=`<div>${q.dataset.tip}</div>`; tip.hidden=false; const r=q.getBoundingClientRect(), w=Math.min(320, window.innerWidth-24); tip.style.width='auto'; tip.style.maxWidth=w+'px';
  tip.style.left=Math.min(Math.max(12,r.left), window.innerWidth-w-12)+'px'; tip.style.top=(r.bottom+8)+'px'; });
document.addEventListener('mouseout',e=>{ if(e.target.closest('.qterm')){ const tip=$('#tip'); if(tip) tip.hidden=true; } });

function gtreeLines(){ document.querySelectorAll('.gtree').forEach(s=>{ const kids=[...s.children].filter(c=>c.tagName==='DETAILS'); if(!kids.length) return; let last=0;
  kids.forEach(k=>{ const sm=k.querySelector(':scope > summary'); const my=Math.round(sm.offsetTop + sm.offsetHeight/2) - 1; k.style.setProperty('--my', my+'px'); last=k.offsetTop + k.clientTop + my; });
  s.style.setProperty('--vh', (last - 4)+'px'); }); }
document.addEventListener('toggle', e=>{ if(e.target.closest && e.target.closest('#goal-tree')) requestAnimationFrame(gtreeLines); }, true);
window.addEventListener('resize', ()=>requestAnimationFrame(gtreeLines));

/* ---------- 좁은 창: 목차는 접힌 채 시작, 펼치면 겹쳐 뜸 ---------- */
function narrowCheck(){ const t=$('#toc'); if(!t) return; const n=window.innerWidth<1400, was=document.body.classList.contains('toc-narrow');
  document.body.classList.toggle('toc-narrow', n);
  if(n && !was) t.classList.add('coll'); if(!n && was) t.classList.toggle('coll', PREF('tocc','0')==='1'); tocFx(); }
window.addEventListener('resize', narrowCheck);
document.addEventListener('click', e=>{ if(!document.body.classList.contains('toc-narrow')) return; const t=$('#toc'); if(!t || t.classList.contains('coll')) return;
  if(e.target.closest('.toc-s') || !e.target.closest('#toc')) setTimeout(()=>{ t.classList.add('coll'); tocFx(); },0); });
{ const _st=showTab; showTab=function(t,k){ _st(t,k); if(t==='goals') requestAnimationFrame(gtreeLines); }; }

{ const _is=initShared; initShared=async function(){ try{ await _is(); } finally{ window.__shReady=true; applyModes(); } }; }

/* ---------- 그림 기호 색: 기호 라벨과 그 표시(원호·치수선·화살표)를 같은 색으로, 표시는 맨 위로 ---------- */
const SYMC = [[/\\gamma/,'--s-gam'],[/\\sigma/,'--s-kpi'],[/\\nu/,'--s-nu'],[/\\delta/,'--s-del'],[/r_s|r_\{s\}|t_\{\\mathrm\{(mech|pneu)\}\}/,'--s-rs'],[/d_l|z_l|d_\{l\}|z_\{l\}/,'--s-pos'],[/^F_|^M_z$|^m\\,a_y$/,'--s-F']];
const CLSC = {ta:'--accent', ti:'--in', tb:'--ink', tm:'--muted'};
function symVar(tex){ const t=tex.replace(/\\[,;: ]|\s/g,''); if(/=|\\approx|\\rightarrow|\\text/.test(tex) || t.length>26) return null;
  const hits=SYMC.filter(([re])=>re.test(t)); return hits.length ? hits[0][1] : null; }
function cssv(el,v){ return getComputedStyle(el).getPropertyValue(v).trim(); }
function recolorMarkers(el,col,svg){ ['marker-start','marker-end'].forEach(a=>{ const v=el.getAttribute(a); if(!v) return; const id=(v.match(/#([^)]+)/)||[])[1]; if(!id) return;
  const nid=id+'_'+col.replace(/[^0-9a-z]/gi,''); if(!svg.querySelector('#'+CSS.escape(nid))){ const mk=svg.querySelector('#'+CSS.escape(id)); if(!mk) return; const c=mk.cloneNode(true); c.id=nid; c.querySelectorAll('path').forEach(p=>p.style.fill=col); mk.parentNode.appendChild(c); }
  el.setAttribute(a,`url(#${nid})`); }); }
function attrBox(el){ let xs=[], ys=[];
  if(el.tagName==='line'){ xs=[+el.getAttribute('x1'),+el.getAttribute('x2')]; ys=[+el.getAttribute('y1'),+el.getAttribute('y2')]; }
  else { const d=el.getAttribute('d')||''; const segs=d.match(/[MLA][^MLAZz]*/g)||[]; segs.forEach(s=>{ const n=(s.slice(1).match(/-?[\d.]+/g)||[]).map(Number); if(s[0]==='A'){ if(n.length>=7){ xs.push(n[5]); ys.push(n[6]); } } else for(let i=0;i+1<n.length;i+=2){ xs.push(n[i]); ys.push(n[i+1]); } }); }
  if(!xs.length || xs.some(isNaN)) return null; const x=Math.min(...xs), y=Math.min(...ys); return {x, y, width:Math.max(...xs)-x, height:Math.max(...ys)-y}; }
function markOf(t){ const out=[]; let e=t.previousElementSibling, k=0;
  while(e && k<3){ const c=e.getAttribute('class')||''; 
    if(/\bdim\b/.test(c)){ out.push(e); let x=e.previousElementSibling, n=0; while(x && n<2 && /\bext\b/.test(x.getAttribute('class')||'')){ out.unshift(x); x=x.previousElementSibling; n++; } return out; }
    if(/\barc[AK]\b/.test(c)){ out.push(e); const p=e.previousElementSibling; if(p && /arcKbg/.test(p.getAttribute('class')||'')) out.unshift(p); return out; }
    if((e.tagName==='line'||e.tagName==='path') && e.getAttribute('marker-end')){ out.push(e); return out; }
    if(e.tagName==='text' || e.tagName==='g') break; e=e.previousElementSibling; k++; }
  return out; }
{ const _sm=svgMath; svgMath=function(t){
    const svg=t.ownerSVGElement; const sv=symVar(t.dataset.tex||''); let col=null;
    if(sv){ col=cssv(t,sv); } else { const c=Object.keys(CLSC).find(k=>t.classList.contains(k)); col = cssv(t, c?CLSC[c]:'--ink-2'); }
    if(col) t.style.fill=col;
    let marks = (sv && svg) ? markOf(t) : [];
    if(sv && svg && !marks.length){ const lx=+t.getAttribute('x'), ly=+t.getAttribute('y'); let best=null, bd=46;
      svg.querySelectorAll('line[marker-end],path[marker-end],line.dim,path.arcA,path.arcK').forEach(el=>{ if(el.dataset.symc) return; const bb=attrBox(el); if(!bb) return;
        const dx=Math.max(bb.x-lx,0,lx-(bb.x+bb.width)), dy=Math.max(bb.y-ly,0,ly-(bb.y+bb.height)), d=Math.hypot(dx,dy); if(d<bd){ bd=d; best=el; } });
      if(best) marks=[best]; }
    marks.forEach(m=>m.dataset.symc='1');
    _sm(t);
    if(sv && svg && col){ marks.forEach(m=>{ if(!/arcKbg/.test(m.getAttribute('class')||'')){ m.style.stroke=col; recolorMarkers(m,col,svg); } svg.appendChild(m); });
      const g=svg.lastElementChild; }
  }; }
function raiseSymLabels(){ document.querySelectorAll('.fig figure>svg').forEach(svg=>{ /* 표시 위로 올린 뒤 라벨도 맨 위로 */
  svg.querySelectorAll(':scope > g').forEach(g=>{ if(g.querySelector(':scope > rect.mjbg')) svg.appendChild(g); }); }); }

{ const _rm=renderMath; renderMath=function(root){ _rm(root); try{ raiseSymLabels(); }catch(e){} }; }
