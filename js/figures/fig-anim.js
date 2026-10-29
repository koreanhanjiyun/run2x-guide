/* ============================================================
   설계 그림 애니메이션 (재생 버튼)
   - 그림 함수가 움직이는 부분을 <g class="an-dyn" data-an="이름" data-mk="마커 id">로 남기면,
     재생 중에 ANIM[이름].dyn(u, 마커 id)로 그 안만 다시 그린다 (u: 0→1 한 주기).
   - 수식 라벨(MathJax)은 움직이지 않는 부분에만 둔다.
   - 정지하면 처음 그림(정적 장면)으로 되돌린다. 화면 밖으로 나가면 멈춘다.
   ============================================================ */
window.__figAnim = (() => {
  const run = new Map();   // g(an-dyn) -> {t, btn, a, html0}
  let raf = 0, last = 0;
  const PERIOD = 3.2;
  function setBtn(b, on){ b.textContent = on ? '❚❚ 멈춤' : '▶ 움직임'; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? '움직임 멈춤' : '움직임 재생'); }
  function stop(g){ const r = run.get(g); if(!r) return; g.innerHTML = r.html0; setBtn(r.btn, false); run.delete(g); }
  function frame(now){ const dt = Math.min(0.1, (now-last)/1000); last = now;
    run.forEach((r, g) => { if(!g.isConnected){ run.delete(g); return; } r.t += dt; const u = (r.t % PERIOD)/PERIOD;
      try { g.innerHTML = r.a.dyn(u, g.dataset.mk); } catch(e){ stop(g); } });
    raf = run.size ? requestAnimationFrame(frame) : 0; }
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver(es => es.forEach(e => { if(!e.isIntersecting){ const g = e.target.querySelector('.an-dyn'); if(g) stop(g); } }), {threshold:0}) : null;
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.an-play'); if(!b) return;
    const fig = b.closest('figure'), g = fig && fig.querySelector('.an-dyn'), a = g && typeof ANIM!=="undefined" && ANIM[g.dataset.an]; if(!a) return;
    if(run.has(g)){ stop(g); return; }
    run.set(g, {t:0, btn:b, a, html0:g.innerHTML}); setBtn(b, true); if(io) io.observe(fig);
    if(!raf){ last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  return { stopAll(){ [...run.keys()].forEach(stop); } };
})();
