renderSteps(); renderGoals(); renderRefs(); renderFlow(); renderGraph(); renderPartFilter(); initPanZoom(); applyView(); setPanel(emptyPanel()); refreshStatus(); refreshMode(); initShared(); applyPart(); initSearch(); initGlossary(); initNext(); window.__nextReady=true;
subify(document.body);
/* 수식: 도구가 준비되면 그림. 못 오면(파일 오류·20초 초과) TeX 원문으로 */
{ const mjGo=()=>{ try{ document.head.appendChild(MathJax.svgStylesheet()); }catch(e){} renderMath(document); try{ subifySvg(document); }catch(e){} };
  try{ subifySvg(document); }catch(e){}
  if(window.__mjReadyFlag) mjGo(); else window.__mjReady=mjGo;
  const fb=()=>{ if(window.__mjReadyFlag) return; window.__mjFailed=1; renderMath(document); };
  if(window.__mjFailed) fb(); else { addEventListener('error', e=>{ if(e.target && e.target.src && /mathjax/.test(e.target.src)) fb(); }, true); setTimeout(fb, 20000); } }
/* 고정(따라 내려온) 제목줄을 눌러 접으면, 접은 뒤 그 제목줄이 화면 맨 위로 오도록 스크롤 */
document.addEventListener('click', e=>{
  const sm = e.target.closest('summary'); if(!sm || e.target.closest('button')) return;
  const d = sm.parentElement; if(!d || d.tagName!=='DETAILS' || !d.open) return;
  if(!(d.classList.contains('step') || d.classList.contains('item'))) return;
  const stuck = d.getBoundingClientRect().top < sm.getBoundingClientRect().top - 2; if(!stuck) return;
  const cs = getComputedStyle(document.documentElement), tabh = parseFloat(cs.getPropertyValue('--tabh'))||50, sth = parseFloat(cs.getPropertyValue('--sth'))||58;
  const off0 = d.classList.contains('item') ? tabh + sth + 6 : tabh + 6;
  const off = Math.max(off0, (window.innerHeight + tabh - sm.offsetHeight)/2);
  const isItem = d.classList.contains('item');
  requestAnimationFrame(()=>requestAnimationFrame(()=>smoothScrollTo(()=>d.getBoundingClientRect().top + window.scrollY - off, ()=>{ d.classList.remove('cflash'); void d.offsetWidth; d.classList.add('cflash'); setTimeout(()=>d.classList.remove('cflash'),1700); })));
}, true);
document.addEventListener('toggle', e=>{ const d=e.target; if(d.tagName==='DETAILS' && !d.open) d.querySelectorAll('details[open]').forEach(x=>{ x.open=false; }); }, true);
$('#collapse-all').addEventListener('click', ()=>{ const v=$('#v-'+TAB); v.querySelectorAll('details[open]').forEach(d=>d.open=false); document.querySelectorAll('.here').forEach(x=>x.classList.remove('here')); smoothScrollTo(()=>0); });
(()=>{ const r=document.documentElement; const tb=$('.tabs'); const setH=()=>{ const h=tb.offsetHeight; if(h>0) r.style.setProperty('--tabh', h+'px'); }; setH(); try{ new ResizeObserver(setH).observe(tb); }catch(e){} window.addEventListener('resize',setH); document.addEventListener('visibilitychange',setH); window.addEventListener('focus',setH);
  const s=document.querySelector('details.step>summary'); r.style.setProperty('--sth', (s?s.offsetHeight:58)+'px'); })();
(()=>{ const h=(location.hash||'').slice(1); if(['start','steps','graph','goals','ref','team'].includes(h)) showTab(h); else if(h==='parts') showTab('start'); })();

