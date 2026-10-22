/* ============================================================
   탭 · 이동 · 이전 위치
   ============================================================ */
const $ = s => document.querySelector(s);
let graphInit=false, TAB='steps'; const HIST=[];
function showTab(t, keep){
  ['steps','graph','goals','parts','ref'].forEach(k=>{ $('#v-'+k).hidden = k!==t; }); if(t==='parts' && !$('#part-tree').innerHTML) renderParts();
  const rail=$('#partRail'); if(rail) rail.hidden = !(t==='steps'||t==='graph'||t==='parts'); requestAnimationFrame(()=>{ try{ window.__figPlace&&window.__figPlace(); }catch(e){} });
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t)));
  try{ history.replaceState(null,'','#'+t); }catch(e){}
  if(t==='graph' && !graphInit){ graphInit=true; requestAnimationFrame(()=>{ view.x=10; view.y=56; view.k=0.9; applyView(); }); }
  if(!keep && t!==TAB) window.scrollTo(0,0);
  TAB=t;
}
function pushHist(){ HIST.push({tab:TAB, y:window.scrollY, sel:SEL, v:{...view}}); if(HIST.length>30) HIST.shift(); $('#backbtn').hidden=false; }
function goBack(){ const h=HIST.pop(); if(!h) return; $('#backbtn').hidden = HIST.length===0;
  showTab(h.tab, true);
  if(h.tab==='graph'){ animateTo(h.v.x,h.v.y,h.v.k,500); if(h.sel) selectItem(h.sel,false); else clearSel(); }
  requestAnimationFrame(()=>smoothScrollTo(()=>h.y)); }
let SCR=null;
function smoothScrollTo(getY, done){
  if(SCR) cancelAnimationFrame(SCR);
  const y0 = window.scrollY, y1 = Math.max(0, getY()), dist = Math.abs(y1-y0);
  const dur = Math.min(1300, Math.max(250, 250 + dist*0.35)), t0 = performance.now();
  if(dist<4){ SCR=null; window.__progEnd=performance.now(); if(done) done(); return; }
  const ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const step = now => { const t = Math.min(1,(now-t0)/dur); const target = Math.max(0, getY());
    window.scrollTo({top: y0 + (target-y0)*ease(t), behavior:'instant'});
    if(t<1) SCR = requestAnimationFrame(step); else { SCR=null; window.__progEnd=performance.now(); if(done) done(); } };
  SCR = requestAnimationFrame(step);
}
function markHere(el){
  document.querySelectorAll('.here').forEach(x=>x.classList.remove('here'));
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash','here');
}
function stickyOffset(){ const cs=getComputedStyle(document.documentElement); return parseFloat(cs.getPropertyValue('--tabh'))+parseFloat(cs.getPropertyValue('--sth'))+14; }
function openItem(id){
  pushHist(); setVM('full');
  const fromOther = TAB!=='steps'; showTab('steps', true);
  const it=IT[id]; const st=$('#st-'+it.s); if(!st) return; st.open=true;
  const el=$('#it-'+id); if(!el) return; el.open=true;
  requestAnimationFrame(()=>{ const y = el.getBoundingClientRect().top + window.scrollY - stickyOffset();
    smoothScrollTo(()=>el.getBoundingClientRect().top + window.scrollY - stickyOffset(), ()=>markHere(el)); });
}
document.addEventListener('click',ev=>{
  const tb=ev.target.closest('.tab'); if(tb){ showTab(tb.dataset.tab); return; }
  const g=ev.target.closest('[data-goto]'); if(g){ ev.preventDefault(); openItem(g.dataset.goto); return; }
  const gr=ev.target.closest('[data-graph]'); if(gr){ ev.preventDefault(); ev.stopPropagation(); pushHist(); showTab('graph'); requestAnimationFrame(()=>selectItem(gr.dataset.graph,true)); return; }
  const op=ev.target.closest('[data-open]'); if(op){ openItem(op.dataset.open); return; }
  const sl=ev.target.closest('[data-sel]'); if(sl){ selectItem(sl.dataset.sel,true); return; }
  if(ev.target.closest('#backbtn')) goBack();
});

/* ---- v24 검색 + 자동완성 ---- */
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const stripT = s => String(s||'').replace(/<[^>]+>/g,'').replace(/\$/g,'');
const norm = s => stripT(s).toLowerCase().replace(/[\s·・,()\[\]{}\-_\/]/g,'');
const cho = s => [...s].map(c=>{ const k=c.charCodeAt(0)-0xAC00; return (k>=0&&k<11172)?CHO[Math.floor(k/588)]:c; }).join('');
const isCho = q => q.length>0 && [...q].every(c=>CHO.includes(c)||/[a-z0-9]/.test(c));
function mscore(text, q, base){ const n=norm(text); if(!n||!q) return 0;
  if(isCho(q) && /[ㄱ-ㅎ]/.test(q)){ const c=cho(n); const i=c.indexOf(q); return i<0?0:(i===0?base*0.9:base*0.75); }
  const i=n.indexOf(q); return i<0?0:(i===0?base:base*0.8); }
const SIDX_ALL = [
  ...STEPS.map(s=>({k:'step', id:s.id, name:stripT(s.t).replace('★ ',''), code:s.id, extra:[]})),
  ...ITEMS.map(i=>{ const a=ACT[i.id]||[]; return {k:'item', id:i.id, name:stripT(i.n), code:i.s, part:i.p,
     extra:[['활동',a[1]],...(a[2]||[]).map(v=>['팀 결정값',v]),...(a[3]||[]).map(v=>['계산값',v]),...(a[4]||[]).map(v=>['제약',v])].filter(x=>x[1])}; })
];
function searchAll(raw){ const q=norm(raw); if(!q) return [];
  const out=[]; for(const e of SIDX_ALL){
    let s=Math.max(mscore(e.name,q,100), mscore(e.code,q,90)), why=null;
    if(s===0){ for(const [lab,t] of e.extra){ const v=mscore(t,q,40); if(v>s){ s=v; why=[lab,stripT(t)]; } } }
    if(s>0){ const on = !PSET.size || e.k==='step' || PSET.has(e.part); out.push({...e, s:s+(e.k==='item'?2:0), on, why}); } }
  out.sort((a,b)=>(b.on-a.on)||(b.s-a.s)); return out.slice(0,14); }
function hlName(name, raw){
  const q=norm(raw); const wrap=h=>`<span class="acn">${h}</span>`; if(!q) return wrap(name);
  const ch=[...name], keep=[]; let n='';
  ch.forEach((c,k)=>{ const t=norm(c); if(t){ keep.push(k); n+=t; } });
  const choMode = isCho(q) && /[ㄱ-ㅎ]/.test(q);
  const at = (choMode ? cho(n) : n).indexOf(q); if(at<0) return wrap(name);
  const on=new Set(keep.slice(at, at+q.length));
  let h='', open=false; ch.forEach((c,k)=>{ const m=on.has(k)||(open && /\s/.test(c) && on.has(k+1)); if(m&&!open){ h+='<mark>'; open=true; } if(!m&&open){ h+='</mark>'; open=false; } h+=c; }); if(open) h+='</mark>';
  return wrap(h); }
function makeAC(input, list, getRes, rowHTML, onPick, onType){
  let res=[], cur=-1;
  const close=()=>{ list.hidden=true; cur=-1; };
  const draw=()=>{ res=getRes(input.value); cur=res.length?0:-1;
    if(!input.value.trim()){ close(); return; }
    list.innerHTML = res.length ? res.map((r,i)=>`<div class="acrow${r.on===false?' off':''}${i===cur?' cur':''}" data-i="${i}" role="option">${rowHTML(r,input.value)}</div>`).join('') : `<div class="acnone">결과 없음 · 초성(예: ㅅㅋㄹ)이나 영문 약어(예: KPI)로도 찾을 수 있습니다. 용어는 참고 › 용어집에서 찾아보십시오.</div>`;
    list.hidden=false; };
  const mark=()=>list.querySelectorAll('.acrow').forEach((x,i)=>{ x.classList.toggle('cur',i===cur); if(i===cur) x.scrollIntoView({block:'nearest'}); });
  const pick=i=>{ const r=res[i]; if(!r) return; close(); input.value=''; input.blur(); onPick(r); };
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
    (r,raw)=> r.k==='step'
      ? `<span class="accode st">${r.code}</span><span class="acname">${hlName(r.name,raw)}</span><span class="ackind">단계</span>`
      : `<span class="accode">${r.code}</span><span class="acname">${hlName(r.name,raw)}${r.why?`<small><b>${r.why[0]}</b> ${r.why[1]}</small>`:''}</span>${chip(r.part)}`,
    r=>{ if(r.k==='step'){ openStep(r.id); return; }
      if(TAB==='graph'){ pushHist(); selectItem(r.id,true); } else openItem(r.id); });
  document.addEventListener('keydown',e=>{ if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey) return; const a=document.activeElement;
    if(a && (a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable)) return; e.preventDefault(); inp.focus(); inp.select(); });
}
function initGlossary(){
  const d=[...document.querySelectorAll('#ref-list > details')].find(x=>x.querySelector(':scope>summary .stitle')?.textContent.trim()==='용어집'); if(!d) return;
  const body=d.querySelector('.dbody'), rows=[...body.querySelectorAll('tbody tr')];
  const G=rows.map((tr,i)=>{ tr.id='gl-'+i; return {tr, name:tr.cells[0].textContent.trim(), def:tr.cells[1].textContent.trim()}; });
  const box=document.createElement('div'); box.className='gsrch';
  box.innerHTML=`<input type="text" class="gq" placeholder="용어 검색 (초성 가능: ㅅㅋㄹ)" aria-label="용어 검색" autocomplete="off"><div class="aclist" hidden role="listbox"></div>`;
  body.prepend(box);
  const inp=box.querySelector('input'), list=box.querySelector('.aclist');
  const res = raw=>{ const q=norm(raw); if(!q) return []; return G.map(g=>({g, s:Math.max(mscore(g.name,q,100), mscore(g.def,q,40))})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,10); };
  const filt = raw=>{ const q=norm(raw); const hit=new Set(res(raw).map(x=>x.g)); G.forEach(g=>{ g.tr.hidden = !!q && !hit.has(g); }); };
  makeAC(inp, list, res, (r,raw)=>`<span class="acname">${hlName(r.g.name,raw)}<small>${r.g.def}</small></span>`,
    r=>{ inp.value=''; filt(''); const tr=r.g.tr; const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
      requestAnimationFrame(()=>smoothScrollTo(()=>tr.getBoundingClientRect().top+window.scrollY-(window.innerHeight+tabh)/2+20, ()=>markHere(tr))); },
    filt);
}
