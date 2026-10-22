/* ============================================================
   진행 상태 (이 브라우저에만 저장)
   ============================================================ */
const STKEY='run2x.status.v1'; let STATUS={};
try{ STATUS = JSON.parse(localStorage.getItem(STKEY)||'{}') || {}; }catch(e){ STATUS={}; }
function saveStatus(){ try{ localStorage.setItem(STKEY, JSON.stringify(STATUS)); }catch(e){} }
const ST_LABEL={todo:'예정',doing:'진행 중',done:'완료',skip:'제외'};
function stCtl(id){ const v=STATUS[id]||'todo'; return `<span class="stmeta" data-id="${id}"></span><span class="stctl" data-stid="${id}">${['todo','doing','done','skip'].map(k=>`<button class="stbtn st-${k}" data-st="${k}" aria-pressed="${v===k}">${ST_LABEL[k]}</button>`).join('')}</span>`; }
/* 팀 공유 모드: db 'status/<항목>' = {v, by, at, epoch}, 'meta/state' = {epoch} (초기화는 편집 권한자만) */
const SH = {on:false, db:null, user:null, me:null, epoch:0, raw:{}, meta:{}, canWrite:true, canAdmin:false, q:{}};
function rebuildShared(){ STATUS={}; SH.meta={};
  Object.entries(SH.raw).forEach(([id,d])=>{ if(!d || (d.epoch||0)!==SH.epoch) return; if(d.v==='doing'||d.v==='done'||d.v==='skip'){ STATUS[id]=d.v; SH.meta[id]={by:d.by,at:d.at}; } });
  refreshStatus(); }
function stNote(t){ const n=$('#stnote'); if(n){ n.textContent=t; n.hidden=!t; } }
function setStatus(id,v){
  if(!SH.on){ if(v==='todo') delete STATUS[id]; else STATUS[id]=v; saveStatus(); refreshStatus(); return; }
  if(!SH.canWrite){ stNote('보기 전용 권한이라 진행 상태를 바꿀 수 없습니다.'); return; }
  if(v==='todo') delete STATUS[id]; else STATUS[id]=v; refreshStatus();
  const ref = SH.db.doc('status/'+id);
  const run = () => (v==='todo' ? ref.delete() : ref.set({v, by:SH.me, at:new Date().toISOString(), epoch:SH.epoch}));
  SH.q[id] = (SH.q[id]||Promise.resolve()).then(run).catch(e=>{
    if(Backend.denied(e)){ SH.canWrite=false; refreshMode(); stNote('보기 전용 권한이라 진행 상태를 바꿀 수 없습니다.'); }
    else stNote('저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.');
    rebuildShared(); });
}
async function resetShared(){
  if(!SH.on){ STATUS={}; saveStatus(); refreshStatus(); return; }
  if(!SH.canAdmin){ stNote('초기화는 편집 권한자만 할 수 있습니다.'); return; }
  try{ await SH.db.doc('meta/state').set({epoch:SH.epoch+1, by:SH.me, at:new Date().toISOString()}); }
  catch(e){ stNote('초기화하지 못했습니다.'); }
}
function refreshMode(){ if(window.__nextReady && typeof applyModes==='function') setTimeout(applyModes,0);
  const m=$('#stmode'); if(m){ m.textContent = SH.on ? '팀 공유' : '이 브라우저에만 저장'; m.className = 'stmode'+(SH.on?' on':''); }
  const r=$('#st-reset'); if(r) r.hidden = SH.on && !SH.canAdmin;
  document.body.classList.toggle('st-ro', SH.on && !SH.canWrite);
}
async function fillMeta(){
  if(!SH.on) { document.querySelectorAll('.stmeta').forEach(el=>el.textContent=''); return; }
  const els=[...document.querySelectorAll('.stmeta')];
  els.forEach(el=>{ if(!SH.meta[el.dataset.id]) el.textContent=''; });
  const ids=[...new Set(els.map(el=>SH.meta[el.dataset.id]&&SH.meta[el.dataset.id].by).filter(Boolean))];
  let ps={}; try{ if(SH.user && ids.length) ps = await SH.user.profiles(ids); }catch(e){}
  els.forEach(el=>{ const mt=SH.meta[el.dataset.id]; if(!mt){ el.textContent=''; return; }
    const who = (mt.by && ps[mt.by] && ps[mt.by].name) || '팀원'; const d = mt.at ? new Date(mt.at) : null;
    el.textContent = `${who} · ${d ? (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') : ''}`; });
}
async function initShared(){
  try{
    if(!Backend.available()){ refreshMode(); return; }
    const [db,user] = await Promise.all([Backend.use('db'), Backend.use('user')]);
    if(!db){ refreshMode(); return; }
    SH.db=db; SH.user=user; SH.on=true;
    if(user){ SH.me = await user.id(); SH.canAdmin = await user.canEdit(); const cw = await user.can('data.write'); SH.canWrite = cw!==false; }
    STATUS={}; refreshMode(); refreshStatus();
    db.doc('meta/state').onSnapshot(sn=>{ const d = sn.exists ? sn.data() : null; SH.epoch = d && typeof d.epoch==='number' ? d.epoch : 0; rebuildShared(); }, ()=>{});
    onSharedReady(db);
    db.collection('status').onSnapshot(q=>{ const r={}; q.docs.forEach(d=>{ r[d.id]=d.data(); }); SH.raw=r; rebuildShared(); },
      ()=>{ stNote('공유 저장소 연결이 끊겼습니다. 새로고침해 주십시오.'); });
  }catch(e){ refreshMode(); }
}
function refreshStatus(){
  document.querySelectorAll('.stctl').forEach(c=>{ const v=STATUS[c.dataset.stid]||'todo'; c.querySelectorAll('.stbtn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.st===v))); });
  document.querySelectorAll('#graph .node').forEach(n=>{ const v=STATUS[n.dataset.id]; n.classList.toggle('st-doing',v==='doing'); n.classList.toggle('st-done',v==='done'); n.classList.toggle('st-skip',v==='skip');
    const t=n.querySelector('.stbadge text'); if(t) t.textContent = v==='done'?'✓':v==='doing'?'▶':''; });
  document.querySelectorAll('.ipill').forEach(pl=>{ const v=STATUS[pl.dataset.id]; pl.className='ipill'+(v?' st-'+v:''); pl.textContent=v==='skip'?'이번 시즌 제외':(v?ST_LABEL[v]:''); pl.hidden=!v; });
  document.querySelectorAll('.scount').forEach(el=>{ const all=ITEMS.filter(i=>i.s===el.dataset.step), its=all.filter(i=>STATUS[i.id]!=='skip'), sk=all.length-its.length; const d=its.filter(i=>STATUS[i.id]==='done').length, g=its.filter(i=>STATUS[i.id]==='doing').length;
    const n=its.length||1;
    el.innerHTML = `<span class="pbar2" title="완료 ${d} · 진행 중 ${g} · 예정 ${its.length-d-g}"><i class="d" style="width:${d/n*100}%"></i><i class="g" style="width:${g/n*100}%"></i></span>` + ((d||g) ? `<span class="sc-done">완료 ${d}/${its.length}</span>${g?`<span class="sc-doing">진행 중 ${g}</span>`:''}` : '') + (sk?`<span class="sc-skip">제외 ${sk}</span>`:''); });
  ITEMS.forEach(i=>{ const el=document.getElementById('it-'+i.id); if(!el) return; const v=STATUS[i.id]; el.classList.toggle('st-doing',v==='doing'); el.classList.toggle('st-done',v==='done'); el.classList.toggle('st-skip',v==='skip'); });
  STEPS.forEach(s=>{ const its=ITEMS.filter(i=>i.s===s.id), all=its.length>0 && its.every(i=>STATUS[i.id]==='skip'); const st=document.getElementById('st-'+s.id); if(st) st.classList.toggle('st-allskip',all); const fs=document.querySelector(`#flow-list .flow-step[data-fs="${s.id}"]`); if(fs) fs.classList.toggle('st-allskip',all); });
  document.querySelectorAll('[data-goto],[data-fid]').forEach(b=>b.classList.toggle('st-skip', STATUS[b.dataset.goto||b.dataset.fid]==='skip'));
  fillMeta();
  const sum=$('#stsum'); if(sum){ const d=ITEMS.filter(i=>STATUS[i.id]==='done').length, g=ITEMS.filter(i=>STATUS[i.id]==='doing').length, k=ITEMS.filter(i=>STATUS[i.id]==='skip').length;
    sum.innerHTML=`<span class="sc-done">완료 ${d}</span> · <span class="sc-doing">진행 중 ${g}</span> · 예정 ${ITEMS.length-d-g-k}${k?` · <span class="sc-skip">제외 ${k}</span>`:''}`; }
  if(typeof afterStatus==='function' && window.__nextReady) afterStatus();
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('.stbtn'); if(b){ ev.preventDefault(); ev.stopPropagation(); setStatus(b.closest('.stctl').dataset.stid, b.dataset.st); return; }
  if(ev.target.closest('#st-reset')){ $('#st-confirm').hidden=false; $('#st-reset').hidden=true; return; }
  if(ev.target.closest('#st-no')){ $('#st-confirm').hidden=true; $('#st-reset').hidden=false; return; }
  if(ev.target.closest('#st-yes')){ resetShared(); $('#st-confirm').hidden=true; $('#st-reset').hidden=false; refreshMode(); return; }
}, true);
