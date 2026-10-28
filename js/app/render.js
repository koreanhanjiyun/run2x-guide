/* ============================================================
   수식 · 첨자 처리
   ============================================================ */
const mVis = el => el.getClientRects().length > 0;
function renderMath(root){
  const MJ = window.MathJax && typeof MathJax.tex2svg === 'function';
  root.querySelectorAll('.eq[data-k]').forEach(el=>{ if(MJ && !mVis(el)) return; const t = TEX[+el.dataset.k]; el.removeAttribute('data-k');
    if(MJ){ try{ const c = MathJax.tex2svg(t,{display:true}); el.innerHTML=''; el.appendChild(c); return; }catch(e){} }
    el.textContent = t; el.classList.add('tex-raw'); el.title='수식 표시 도구를 불러오지 못해 TeX 원문을 그대로 보여 줍니다'; });
  root.querySelectorAll('.mi[data-tex]').forEach(el=>{ if(MJ && !mVis(el)) return; const t = el.dataset.tex; el.removeAttribute('data-tex');
    if(MJ){ try{ const c = MathJax.tex2svg(t,{display:false}); el.innerHTML=''; el.appendChild(c); return; }catch(e){} } });
  if(MJ) root.querySelectorAll('svg text.mjt:not([data-done])').forEach(t=>{ if(!mVis(t)) return; t.setAttribute('data-done','1'); try{ svgMath(t); }catch(e){} });
}
let _mjq=0; function mathSoon(){ if(_mjq) return; _mjq=requestAnimationFrame(()=>{ _mjq=0; if(window.MathJax && MathJax.tex2svg) renderMath(document); }); }
document.addEventListener('toggle', e=>{ if(e.target.open) mathSoon(); }, true);
['click','scroll','resize'].forEach(ev=>window.addEventListener(ev, mathSoon, {passive:true, capture:true}));
function svgMath(t){
  const tex=t.dataset.tex, size=+t.dataset.size||14, anchor=t.getAttribute('text-anchor')||'start';
  const s = MathJax.tex2svg(tex,{display:false}).querySelector('svg'); if(!s) return;
  const ex=size*0.5, w=parseFloat(s.getAttribute('width'))*ex, hh=parseFloat(s.getAttribute('height'))*ex;
  const va=parseFloat((s.style.verticalAlign||'0').replace('ex',''))*ex;
  const x0=+t.getAttribute('x'), y0=+t.getAttribute('y');
  const x = anchor==='middle' ? x0-w/2 : anchor==='end' ? x0-w : x0, top = y0 - hh - va;
  s.setAttribute('x',x); s.setAttribute('y',top); s.setAttribute('width',w); s.setAttribute('height',hh); s.style.verticalAlign='';
  const col = getComputedStyle(t).fill; s.style.color = col;
  const NS='http://www.w3.org/2000/svg', g=document.createElementNS(NS,'g'), bg=document.createElementNS(NS,'rect');
  bg.setAttribute('x',x-3); bg.setAttribute('y',top-2); bg.setAttribute('width',w+6); bg.setAttribute('height',hh+4); bg.setAttribute('rx',3); bg.setAttribute('class','mjbg');
  g.appendChild(bg); g.appendChild(s); t.replaceWith(g);
}
const SUBRE = /([A-Za-zΔΣσνδαφγψθμκ])_(\{[^}]+\}|[A-Za-z0-9φψ]+(?:,[A-Za-z0-9]+)*|[가-힣]+)/g;
const escH = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function subify(root){
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:n=>{
    if(!n.nodeValue.includes('_')) return NodeFilter.FILTER_REJECT;
    const p = n.parentElement; if(!p || p.closest('.eq,script,style,svg')) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT; }});
  const list=[]; while(w.nextNode()) list.push(w.currentNode);
  list.forEach(n=>{ SUBRE.lastIndex=0; if(!SUBRE.test(n.nodeValue)) return;
    const s=document.createElement('span'); s.innerHTML = escH(n.nodeValue).replace(SUBRE,(m,a,b)=>`${a}<sub>${b.replace(/[{}]/g,'')}</sub>`); n.replaceWith(s); });
}
function subifySvg(root){
  root.querySelectorAll('svg text:not(.mjt)').forEach(t=>{ if(t.children.length || !t.textContent.includes('_')) return;
    t.innerHTML = escH(t.textContent).replace(SUBRE,(m,a,b)=>`${a}<tspan baseline-shift="sub" font-size="72%">${b.replace(/[{}]/g,'')}</tspan>`); });
}

/* ============================================================
   렌더: 카드
   ============================================================ */
function renderQ(q){ return `<details class="q"><summary>${q.h}</summary><div class="qb">${q.b}${q.s.map(renderQ).join('')}</div></details>`; }
function renderCard(key){ const c = CARD[key]; if(!c) return '';
  const sym = SYM[key] ? `<details class="symbox"><summary>이 카드의 기호 <span class="muted">(${SYM[key].length}개)</span></summary><table class="kvt">${symRows(SYM[key])}</table></details>` : '';
  return `<div class="concl"><b class="tag">참고</b>${c.c}</div>${sym}${calcHTML(key)}<div class="stack">${c.L.map(renderQ).join('')}</div>`; }
const chip = p => `<span class="chip"><span class="dot" style="background:${pc(p)}"></span>${p}</span>`;
function ioHTML(id){
  const ins = (IN[id]||[]).map(i=>EDGES[i]), outs = (OUT[id]||[]).map(i=>EDGES[i]);
  const li = (oid,lbl) => `<li><button class="lnk" data-goto="${oid}">${IT[oid].n}</button> <span class="muted">· ${IT[oid].s} ${IT[oid].p} — ${lbl}</span></li>`;
  return `<div class="io"><div><h4 class="ih">받는 정보</h4>${ins.length?`<ul>${ins.map(e=>li(e[0],e[2])).join('')}</ul>`:'<span class="muted" style="font-size:14px">없음</span>'}</div>
  <div><h4 class="oh">넘기는 결과</h4>${outs.length?`<ul>${outs.map(e=>li(e[1],e[2])).join('')}</ul>`:'<span class="muted" style="font-size:14px">없음</span>'}</div></div>`;
}

/* ============================================================
   단계 구간
   ============================================================ */
const PHASES = [
 {k:"①", n:"목표 · 구매품 · 레이아웃", s:["P0","P1","P2"]},
 {k:"②", n:"설계 인자 결정 (P3) → 하드포인트 표 · 동결", s:["P3-1","P3-2","P3-3","P3-4","P3-5","P3-6","F1","P3-7","P3-8","P3-9","F2"]},
 {k:"③", n:"부품 설계 (P4): 하중 → 형상 → 해석 → 도면", s:["P4-1","P4-2","P4-3","P4-4","P4-5","P4-6","P4-7"]},
 {k:"④", n:"검증 · 보고서", s:["P5","P6"]},
 {k:"⑤", n:"제작 · 주행 · 대회", s:["P7","P8","P9","P10"]}
];
const PHASE_OF = {}; PHASES.forEach((ph,i)=>ph.s.forEach(s=>PHASE_OF[s]=i));
