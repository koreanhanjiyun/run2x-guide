/* ============================================================
   처음 열 때 어느 화면을 보여 줄지 (A1·A2)
   - 처음 방문: 시작 탭 + 사용법 안내 한 번
   - 그 뒤: 마지막에 보던 탭·펼친 단계/항목·스크롤 위치로 (이 브라우저에 저장, 로그인했으면 계정에도 저장)
   - 주소에 #항목·#탭이 있으면 그쪽이 우선
   ============================================================ */
(function(){
  const snap = () => ({ tab: TAB, y: Math.round(window.scrollY),
    open: [...document.querySelectorAll('#step-list details.step[open], #step-list details.item[open]')].map(d=>d.id).slice(0, 40),
    ttsub: (typeof TT!=='undefined' ? TT.sub : ''), sys: (typeof START!=='undefined' ? START.sys : ''), at: Date.now() });
  const read = j => { try{ const o = typeof j==='string' ? JSON.parse(j) : j; return o && o.tab ? o : null; }catch(e){ return null; } };
  let restoring = false;
  function restore(o){ if(!o) return;
    if(o.ttsub && typeof TT!=='undefined') TT.sub = o.ttsub;
    if(typeof START!=='undefined'){ START.sys = o.sys||''; SETP('startsys', START.sys); }
    showTab(o.tab, true);
    restoring = true;
    const ids = (o.open||[]).slice().sort((a,b)=>(a.startsWith('st-')?0:1)-(b.startsWith('st-')?0:1));
    ids.forEach(id=>{ const d=document.getElementById(id); if(d){ if(d.classList.contains('item')) fillItem(d); d.open = true; } });
    setTimeout(()=>{ restoring = false; }, 1500);
    const go = () => window.scrollTo({top: o.y||0, behavior:'instant'});
    requestAnimationFrame(go); setTimeout(go, 350); setTimeout(go, 1200); }
  let lastJson = '', acctAt = 0;
  function save(force){ if(window.DEBUG || restoring) return; const j = JSON.stringify(snap()); SETP('lastpos', j);
    if(j===lastJson) return; lastJson = j;
    const now = Date.now(); if(!force && now - acctAt < 20000) return; acctAt = now;
    if(window.Backend && Backend.kind()==='firebase') Backend.Team.ctx().then(c=>{ if(c.uid) Backend.Team.saveLast(j).catch(()=>{}); }).catch(()=>{}); }
  const h = (location.hash||'').slice(1), TABS=['start','goals','steps','graph','ref','team'];
  /* #항목 링크는 항상 우선. #탭만 있으면(새로고침 등) 저장된 위치가 같은 탭일 때 그대로 복원 */
  const local0 = read(PREF('lastpos',''));
  const hasHash = /^it-/.test(h) || (TABS.includes(h) && !(local0 && local0.tab===h));
  const first = PREF('visited','') !== '1';
  const local = local0;
  if(!hasHash && !window.DEBUG){
    if(first){ SETP('visited','1'); showTab('start'); setTimeout(()=>{ try{ if(PREF('tourdone','')!=='1') tourStart('all'); }catch(e){} }, 1200); }
    else if(local) restore(local);
    else showTab('steps');
  }
  /* 새 기기(이 브라우저에 기록 없음)인데 계정에 기록이 있으면 그 위치로 */
  if(!hasHash && !local && window.Backend && Backend.kind()==='firebase'){
    Backend.Team.ctx().then(c=>{ const o = read(c.last); if(o){ try{ if(typeof tourStop==='function') tourStop(); }catch(e){} SETP('visited','1'); restore(o); } }).catch(()=>{}); }
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(()=>save(false), 800); };
  addEventListener('scroll', later, {passive:true});
  document.addEventListener('toggle', later, true);
  document.addEventListener('click', e=>{ if(e.target.closest('.tab,[data-tts]')) later(); });
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') save(true); });
  addEventListener('pagehide', ()=>save(true));
})();
