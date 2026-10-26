/* ============================================================
   관리자 모드 편집은 "저장해야 반영"
   - 진행 상태: 누르면 화면에만 표시(점선), 아래 막대의 [모두 저장]을 눌러야 팀에 저장
   - 우리 팀 값: 칸별 저장 버튼 없음. 입력한 칸을 함께 집계하고 [모두 저장]이 한꺼번에 저장
   - 저장 안 한 변경이 있으면 관리자 모드 끄기·시즌 넘기기·팀 전환·페이지 닫기 전에 막고 안내
   ============================================================ */
(function(){
  const PENDING = {};            // 항목 → 저장 전 상태값
  let COMMITTED = {};            // 팀에 저장된 상태값 (이번에 보는 시즌)
  const drafting = id => SH.on && canEditItem(id);
  const nPend = () => Object.keys(PENDING).length;
  const dirtyBoxes = () => [...document.querySelectorAll('.tval[data-dirty]')];
  const nAll = () => nPend() + dirtyBoxes().length;

  /* 팀에 저장된 값 기억 + 저장 전 값 덮어 보여 주기 */
  const _rebuild = rebuildShared;
  rebuildShared = function(){ _rebuild.apply(this, arguments); COMMITTED = {...STATUS};
    if(nPend()){ Object.entries(PENDING).forEach(([id,v])=>{ if(v==='todo') delete STATUS[id]; else STATUS[id]=v; }); refreshStatus(); } };

  const _set = setStatus;
  setStatus = function(id, v){
    if(!drafting(id)) return _set(id, v);
    const cur = COMMITTED[id] || 'todo';
    if(v === cur) delete PENDING[id]; else PENDING[id] = v;
    if(v==='todo') delete STATUS[id]; else STATUS[id] = v;
    refreshStatus(); paint();
  };

  const _rs = refreshStatus;
  refreshStatus = function(){ const r = _rs.apply(this, arguments); try{ mark(); }catch(e){} return r; };
  function mark(){ document.querySelectorAll('.stctl').forEach(c=>c.classList.toggle('st-pending', c.dataset.stid in PENDING)); }

  /* 팀 값: 입력하면 저장 전 표시, 다른 갱신이 와도 덮어쓰지 않음 */
  document.addEventListener('input', e=>{ const box = e.target.closest('.tval'); if(!box || box.dataset.edit!=='1' || !e.target.matches('input')) return; box.dataset.dirty='1'; paint(); });
  const _rv = refreshVals;
  refreshVals = function(){ document.querySelectorAll('.tval').forEach(el=>{ if(el.dataset.dirty || el.contains(document.activeElement)) return; renderTV(el); }); };

  /* 아래 막대 */
  let BAR = null;
  function paint(){
    if(!BAR){ BAR = document.createElement('div'); BAR.id = 'draftBar'; BAR.setAttribute('role','status'); document.body.appendChild(BAR); }
    const p = nPend(), d = dirtyBoxes().length, show = (p + d) > 0;
    BAR.hidden = !show; if(!show) return;
    const parts = []; if(p) parts.push(`진행 상태 ${p}건`); if(d) parts.push(`우리 팀 값 ${d}항목`);
    BAR.innerHTML = `<span><b>저장 안 한 변경</b> · ${parts.join(' · ')} <span class="db-sub">저장해야 팀원에게 보입니다 (${esc(SEASON)} 시즌)</span></span>
      <span class="db-acts"><button type="button" class="btn small" data-draft="revert">되돌리기</button><button type="button" class="btn small pri" data-draft="save">모두 저장</button></span>`;
  }
  async function saveAll(){
    const ids = Object.keys(PENDING), n = ids.length, d = dirtyBoxes();
    ids.forEach(id=>{ const v = PENDING[id]; delete PENDING[id]; _set(id, v); });
    await Promise.all(ids.map(id=>SH.q[id]).filter(Boolean)).catch(()=>{});
    await Promise.all(d.map(box=>{ delete box.dataset.dirty; return tvSaveBox(box); })).catch(()=>{});
    d.forEach(box=>{ delete box.dataset.edit; renderTV(box); });
    COMMITTED = {...STATUS}; mark(); paint();
    toast(`저장했습니다 · ${[n?`진행 상태 ${n}건`:'', d.length?`우리 팀 값 ${d.length}항목`:''].filter(Boolean).join(' · ')}`);
  }
  function revertAll(){
    Object.keys(PENDING).forEach(id=>delete PENDING[id]);
    STATUS = {...COMMITTED}; refreshStatus();
    dirtyBoxes().forEach(box=>{ delete box.dataset.dirty; delete box.dataset.edit; renderTV(box); });
    paint(); toast('저장하지 않은 변경을 되돌렸습니다');
  }
  document.addEventListener('click', e=>{ const b = e.target.closest('[data-draft]'); if(!b) return; e.preventDefault();
    if(b.dataset.draft==='save') saveAll(); else revertAll(); });

  /* 저장 안 한 변경이 있을 때 막기 */
  const GUARD = '[data-ttseason],[data-sn],[data-tp=switch],[data-tp=logout],[data-tp=join],[data-tp=create],[data-tp=leave]';
  document.addEventListener('click', e=>{ if(!nAll()) return; const g = e.target.closest(GUARD); if(!g) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    toast(`저장하지 않은 변경 ${nAll()}건이 있습니다. 아래 막대에서 저장하거나 되돌린 뒤 진행하십시오.`);
    if(BAR){ BAR.classList.remove('db-flash'); void BAR.offsetWidth; BAR.classList.add('db-flash'); } }, true);
  addEventListener('beforeunload', e=>{ if(!nAll()) return; e.preventDefault(); e.returnValue = ''; });

  /* 관리자 모드를 켜고 끌 때 막대 갱신 */
  const _am = applyModes; applyModes = function(){ const r = _am.apply(this, arguments); try{ paint(); }catch(e){} return r; };
})();
