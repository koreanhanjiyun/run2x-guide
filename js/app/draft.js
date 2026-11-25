/* ============================================================
   편집은 "저장해야 반영" (H10·H14·H15)
   - 진행 상태: 예정·진행 중·완료·제외를 바로 누름('저장 전' 표시) → 아래 막대 [모두 저장]으로만 팀에 공유
   - 우리 팀 값 · 우리 팀 기록: [편집] → 입력하면 바로 '저장 전'으로 쌓임 → [닫기] → 아래 막대 [모두 저장] (2026-11-25 [적용]/[취소] 없앰)
     [취소]는 그 칸의 변경만 되돌림. 팀 탭 항목 목록의 상태 버튼은 바로 '저장 전'으로 쌓임
   - 다른 화면(팀원 관리 등)도 DRAFT.add 로 같은 막대에 변경을 올림
   - 저장 안 한 변경이 있으면 시즌 넘기기·팀 전환·로그아웃·페이지 닫기 전에 막고 안내
   ============================================================ */
const TVSTAGE = {};               // 항목 → 저장 전 우리 팀 값 {라벨:{v,why}}
const DRAFT = { ext: [], add(x){ this.ext.push(x); }, paint(){} };
(function(){
  const PENDING = {};            // 항목 → 저장 전 상태값
  let COMMITTED = {};            // 팀에 저장된 상태값 (이번에 보는 시즌)
  const drafting = id => SH.on && canEditItem(id);
  const nPend = () => Object.keys(PENDING).length;
  const nVal = () => Object.keys(TVSTAGE).length;
  const nExt = () => DRAFT.ext.reduce((a,x)=>a+(x.n()||0),0);
  const nAll = () => nPend() + nVal() + nExt();
  window.draftCount = nAll;
  window.stPending = id => id in PENDING;
  window.stCommitted = id => COMMITTED[id] || 'todo';

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
  window.stRevertOne = id => { if(!(id in PENDING)) return; delete PENDING[id]; const c=COMMITTED[id]; if(c) STATUS[id]=c; else delete STATUS[id]; refreshStatus(); paint(); };

  const _rs = refreshStatus;
  refreshStatus = function(){ const r = _rs.apply(this, arguments); try{ mark(); }catch(e){} return r; };
  function mark(){ document.querySelectorAll('.stctl').forEach(c=>c.classList.toggle('st-pending', c.dataset.stid in PENDING));
    document.querySelectorAll('.stbox[data-id]').forEach(b=>{ if(b.dataset.edit!=='1') renderSB(b); }); }

  /* 팀 값: 입력하면 바로 저장 전 값으로 모음 (저장된 값과 같아지면 빠짐) */
  const same = (a,b) => JSON.stringify(a||{}) === JSON.stringify(b||{});
  document.addEventListener('input', e=>{ const box = e.target.closest('.tval'); if(!box || box.dataset.edit!=='1' || !e.target.matches('input')) return;
    const id = box.dataset.tv, vals = tvRead(box), cur = (VAL[id]&&VAL[id].s&&VAL[id].s[SEASON]) || {};
    const norm = o => Object.fromEntries(Object.entries(o).filter(([l,x])=>x && ((x.v||'').trim() || (x.why||'').trim())).map(([l,x])=>[l,{v:(x.v||'').trim(),why:(x.why||'').trim()}]));
    if(same(norm(vals), norm(cur))) delete TVSTAGE[id]; else TVSTAGE[id] = vals;
    box.classList.toggle('tv-dirty', id in TVSTAGE); paint(); });

  /* 아래 막대 */
  let BAR = null;
  function paint(){
    if(!BAR){ BAR = document.createElement('div'); BAR.id = 'draftBar'; BAR.setAttribute('role','status'); document.body.appendChild(BAR); }
    const p = nPend(), d = nVal(), show = nAll() > 0;
    BAR.hidden = !show; document.body.classList.toggle('has-draft', show); try{ updSeasonChip(); }catch(e){} if(!show) return;
    const exN = DRAFT.ext.reduce((a,x)=>a+(x.items && x.n() ? x.n() : 0),0) + d;
    if(!p && !exN) LIST=false;
    const parts = []; if(p) parts.push(`<button type="button" class="db-pl" data-draftlist aria-expanded="${LIST}" title="바꾼 항목 보기">진행 상태 ${p}건 <span aria-hidden="true">${LIST?'▾':'▴'}</span></button>`); if(d) parts.push(`<button type="button" class="db-pl" data-draftlist aria-expanded="${LIST}" title="바꾼 항목 보기">우리 팀 값 ${d}항목 <span aria-hidden="true">${LIST?'▾':'▴'}</span></button>`);
    DRAFT.ext.forEach(x=>{ const n=x.n(); if(n) parts.push(x.items ? `<button type="button" class="db-pl" data-draftlist aria-expanded="${LIST}" title="바꾼 항목 보기">${x.label(n)} <span aria-hidden="true">${LIST?'▾':'▴'}</span></button>` : x.label(n)); });
    BAR.innerHTML = `<span><b>저장 안 한 변경</b> · ${parts.join(' · ')} <span class="db-sub">[모두 저장]을 눌러야 팀원에게 보입니다${p||d?` (${esc(SEASON)} 시즌)`:''}</span></span>
      <span class="db-acts"><button type="button" class="btn small" data-draft="revert">되돌리기</button><button type="button" class="btn small pri" data-draft="save">모두 저장</button></span>`
      + (LIST && (p || exN) ? listHTML() : '');
  }
  /* 바꾼 항목 목록 (2026-11-25): 막대 위로 펼침. 줄 = 단계 · 이름 · 파트 · 이전 → 이후 · [되돌리기], 줄을 누르면 그 항목 자리로 */
  let LIST = false;
  const stl = v => v==='skip' ? '제외' : ST_LABEL[v||'todo'];
  function listHTML(){ const ids = Object.keys(PENDING).filter(id=>IT[id]).sort((a,b)=>typeof admOrd==='function' ? admOrd(a,b) : 0);
    return `<div class="db-list" role="list">${ids.map(id=>{ const a=COMMITTED[id]||'todo', b=PENDING[id]||'todo';
      return `<div class="db-row" role="listitem"><button type="button" class="db-go" data-draftgo="${id}"><span class="db-c">${IT[id].s}</span><span class="db-n">${IT[id].n}</span><span class="db-p">${IT[id].p}</span></button><span class="db-ch"><span class="ipill st-${a}">${stl(a)}</span><span aria-hidden="true">→</span><span class="ipill st-${b}">${stl(b)}</span></span><button type="button" class="lnk db-rv" data-draftrv="${id}">되돌리기</button></div>`; }).join('')}${tvRows()}${extRows()}</div>`; }
  /* 우리 팀 값: 바뀐 칸마다 '라벨 이전 → 이후' */
  function tvRows(){ return Object.keys(TVSTAGE).filter(id=>IT[id]).map(id=>{ const cur=(VAL[id]&&VAL[id].s&&VAL[id].s[SEASON])||{}, nw=TVSTAGE[id]||{}; const labs=[...new Set([...Object.keys(cur),...Object.keys(nw)])];
      const ch=labs.filter(l=>((cur[l]||{}).v||'')!==((nw[l]||{}).v||'') || ((cur[l]||{}).why||'')!==((nw[l]||{}).why||'')).map(l=>`${l} ${(cur[l]||{}).v||'—'} → ${(nw[l]||{}).v||'—'}`).join(' · ') || '비고 수정';
      return `<div class="db-row" role="listitem"><button type="button" class="db-go" data-drafttvgo="${id}"><span class="db-c">${IT[id].s}</span><span class="db-n">${IT[id].n}</span><span class="db-p">팀 값</span></button><span class="db-ch">${esc(ch)}</span><button type="button" class="lnk db-rv" data-drafttvrv="${id}">되돌리기</button></div>`; }).join(''); }
  /* 다른 화면의 변경(팀원 관리 등): DRAFT.add 의 items() = [{key, c, n, p, change, go(), revert()}] */
  let EXT = [];
  function extRows(){ EXT = DRAFT.ext.flatMap(x=>x.items && x.n() ? x.items() : []);
    return EXT.map((it,i)=>`<div class="db-row" role="listitem"><button type="button" class="db-go" data-draftext="${i}"><span class="db-c">${esc(it.c)}</span><span class="db-n">${esc(it.n)}</span><span class="db-p">${esc(it.p||'')}</span></button><span class="db-ch">${esc(it.change||'')}</span><button type="button" class="lnk db-rv" data-draftextrv="${i}">되돌리기</button></div>`).join(''); }
  document.addEventListener('click', e=>{
    if(e.target.closest('[data-draftlist]')){ e.preventDefault(); LIST=!LIST; paint(); return; }
    const rv=e.target.closest('[data-draftrv]'); if(rv){ e.preventDefault(); stRevertOne(rv.dataset.draftrv); return; }
    const tg=e.target.closest('[data-drafttvgo]'); if(tg){ e.preventDefault(); LIST=false; paint(); vtItem(tg.dataset.drafttvgo, null); return; }
    const tr=e.target.closest('[data-drafttvrv]'); if(tr){ e.preventDefault(); const id=tr.dataset.drafttvrv; delete TVSTAGE[id]; document.querySelectorAll(`.tval[data-tv="${CSS.escape(id)}"]`).forEach(b=>{ delete b.dataset.edit; b.classList.remove('tv-dirty'); renderTV(b); }); paint(); return; }
    const xg=e.target.closest('[data-draftext]'); if(xg){ e.preventDefault(); const it=EXT[+xg.dataset.draftext]; LIST=false; paint(); if(it) it.go(); return; }
    const xr=e.target.closest('[data-draftextrv]'); if(xr){ e.preventDefault(); const it=EXT[+xr.dataset.draftextrv]; if(it) it.revert(); return; }
    const go=e.target.closest('[data-draftgo]'); if(go){ e.preventDefault(); LIST=false; paint(); if(typeof ttGoPend==='function') ttGoPend(go.dataset.draftgo); else vtItem(go.dataset.draftgo, null); return; }
    if(LIST && BAR && !BAR.contains(e.target)){ LIST=false; paint(); } });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && LIST){ LIST=false; paint(); } });
  DRAFT.paint = paint;
  async function saveAll(){
    const ids = Object.keys(PENDING), n = ids.length, vids = Object.keys(TVSTAGE);
    ids.forEach(id=>{ const v = PENDING[id]; delete PENDING[id]; _set(id, v); });
    await Promise.all(ids.map(id=>SH.q[id]).filter(Boolean)).catch(()=>{});
    const msg = {textContent:''};
    await Promise.all(vids.map(id=>{ const v=TVSTAGE[id]; delete TVSTAGE[id]; return saveVal(id, v, msg); })).catch(()=>{});
    const ex = []; for(const x of DRAFT.ext){ const k=x.n(); if(k){ try{ await x.save(); ex.push(x.label(k)); }catch(e){ console.error(e); toast('팀원 변경을 저장하지 못했습니다.'); } } }
    document.querySelectorAll('.tval').forEach(b=>{ delete b.dataset.edit; b.classList.remove('tv-dirty'); renderTV(b); });
    COMMITTED = {...STATUS}; mark(); paint();
    toast(`저장했습니다 · ${[n?`진행 상태 ${n}건`:'', vids.length?`우리 팀 값 ${vids.length}항목`:'', ...ex].filter(Boolean).join(' · ')}`);
  }
  function revertAll(){
    Object.keys(PENDING).forEach(id=>delete PENDING[id]); Object.keys(TVSTAGE).forEach(id=>delete TVSTAGE[id]);
    DRAFT.ext.forEach(x=>{ try{ x.revert(); }catch(e){} });
    STATUS = {...COMMITTED}; refreshStatus();
    document.querySelectorAll('.tval').forEach(b=>{ delete b.dataset.edit; b.classList.remove('tv-dirty'); renderTV(b); });
    document.querySelectorAll('.stbox').forEach(b=>{ delete b.dataset.edit; renderSB(b); });
    paint(); toast('저장하지 않은 변경을 되돌렸습니다');
  }
  document.addEventListener('click', e=>{ const b = e.target.closest('[data-draft]'); if(!b) return; e.preventDefault();
    if(b.dataset.draft==='save') saveAll(); else revertAll(); });

  /* 저장 안 한 변경이 있을 때 막기 */
  const GUARD = '[data-ttsn],[data-sn],[data-tp=switch],[data-tp=logout],[data-tp=join],[data-tp=create],[data-tp=leave],[data-tp=leaveteam][data-cur="1"]';
  document.addEventListener('click', e=>{ if(!nAll()) return; const g = e.target.closest(GUARD); if(!g) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    toast(`저장하지 않은 변경 ${nAll()}건이 있습니다. 아래 막대에서 저장하거나 되돌린 뒤 진행하십시오.`);
    if(BAR){ BAR.classList.remove('db-flash'); void BAR.offsetWidth; BAR.classList.add('db-flash'); } }, true);
  /* 쓰다 만 논의·답글·문의 글도 새로고침·창 닫기 전에 경고 */
  const typing = () => [...document.querySelectorAll('.qa-text, .tk-rf textarea, .tk-c.editing textarea, #fbPanel .tp-fb')].some(t=>t.value.trim());
  addEventListener('beforeunload', e=>{ if(!nAll() && !typing()) return; e.preventDefault(); e.returnValue = ''; });

  const _am = applyModes; applyModes = function(){ const r = _am.apply(this, arguments); try{ paint(); }catch(e){} return r; };
})();

/* ---------- 항목 안 '진행 상태' 칸: 예정|진행 중|완료|제외 를 바로 누름 → 아래 막대에 '저장 전'으로 쌓임 ---------- */
function renderSB(el){ const id=el.dataset.id, can=canEditItem(id); el.hidden=!can; if(!can) return;
  const v=STATUS[id]||'todo', pend=window.stPending && stPending(id);
  el.innerHTML=`<span class="sec-label">진행 상태</span><span class="stctl" data-stid="${id}">${['todo','doing','done','skip'].map(k=>`<button type="button" class="stbtn st-${k}" data-st="${k}" aria-pressed="${v===k}">${ST_LABEL[k]}</button>`).join('')}</span>${pend?'<span class="pend-tag">저장 전 · 아래 막대에서 저장</span>':''}`; }
