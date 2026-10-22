/* ---------- 0.29.3 시즌 넘기기 ---------- */
function setSeason(v,dir){ if(!/^\d{4}$/.test(v)) return; SEASON=v; SETP('season',v); document.querySelectorAll('.season-in').forEach(x=>{ x.value=v; }); refreshVals(); renderAdm();
  const b=document.querySelector('#admPanel .adm-b'); if(b){ b.classList.remove('sl-l','sl-r'); void b.offsetWidth; b.classList.add(dir<0?'sl-r':'sl-l'); } }

/* ---------- 0.30.0 진행 상태 시즌별 저장 · 팀 공유 이번 시즌 · 이번 시즌 초기화 ---------- */
const LEGACY_SEASON='2026';
const stKey=()=> SEASON===LEGACY_SEASON ? STKEY : STKEY+'.'+SEASON;
function loadLocalStatus(){ try{ STATUS=JSON.parse(localStorage.getItem(stKey())||'{}')||{}; }catch(e){ STATUS={}; } }
saveStatus=function(){ try{ localStorage.setItem(stKey(), JSON.stringify(STATUS)); }catch(e){} };
rebuildShared=function(){ STATUS={}; SH.meta={};
  Object.entries(SH.raw||{}).forEach(([did,d])=>{ if(!d) return; const se=d.season||LEGACY_SEASON; if(se!==SEASON) return; if(!d.season && (d.epoch||0)!==SH.epoch) return;
    const id=d.item||did; if(!IT[id]) return; if(d.v==='doing'||d.v==='done'||d.v==='skip'){ STATUS[id]=d.v; SH.meta[id]={by:d.by,at:d.at}; } });
  refreshStatus(); };
setStatus=function(id,v){
  if(!SH.on){ if(v==='todo') delete STATUS[id]; else STATUS[id]=v; saveStatus(); refreshStatus(); return; }
  if(!SH.canAdmin){ stNote('진행 상태는 편집자(관리자)만 바꿀 수 있습니다.'); return; }
  if(v==='todo') delete STATUS[id]; else STATUS[id]=v; refreshStatus();
  const se=SEASON, ref=SH.db.doc('status/'+se+'-'+id), legacy = se===LEGACY_SEASON && SH.raw && SH.raw[id] && !SH.raw[id].season;
  const run=async()=>{ if(legacy){ try{ await SH.db.doc('status/'+id).delete(); }catch(e){} } if(v==='todo') await ref.delete(); else await ref.set({v, by:SH.me, at:new Date().toISOString(), season:se, item:id, epoch:SH.epoch}); };
  SH.q[id]=(SH.q[id]||Promise.resolve()).then(run).catch(e=>{ stNote('저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.'); rebuildShared(); });
};
resetShared=async function(){ const se=SEASON;
  if(!SH.on){ STATUS={}; saveStatus(); Object.values(VAL).forEach(r=>{ if(r&&r.s&&r.s[se]) delete r.s[se]; }); try{ localStorage.setItem('run2x.val.v1', JSON.stringify(VAL)); }catch(e){} refreshVals(); refreshStatus(); toast(`${se} 시즌을 초기화했습니다`); return; }
  if(!SH.canAdmin){ stNote('초기화는 편집 권한자만 할 수 있습니다.'); return; }
  const jobs=[]; Object.entries(SH.raw||{}).forEach(([did,d])=>{ if(d && (d.season||LEGACY_SEASON)===se) jobs.push(SH.db.doc('status/'+did).delete()); });
  Object.entries(VAL).forEach(([id,r])=>{ if(r&&r.s&&r.s[se]){ const s2={...r.s}; delete s2[se]; jobs.push(SH.db.doc('val/'+id).set({...r, s:s2})); } });
  try{ await Promise.all(jobs); toast(`${se} 시즌을 초기화했습니다`); }catch(e){ stNote('초기화하지 못한 항목이 있습니다. 다시 시도해 주십시오.'); }
};
function afterSeason(){ if(SH.on) rebuildShared(); else { loadLocalStatus(); refreshStatus(); } document.querySelectorAll('.tval[data-view]').forEach(el=>delete el.dataset.view); refreshVals(); try{ renderAdm(); }catch(e){}
  const c=document.querySelector('#st-confirm>span'); if(c) c.textContent='초기화 시 다시 복원할 수 없습니다.'; }
{ const _ss=setSeason; setSeason=function(v,dir){ if(!/^\d{4}$/.test(v)) return; if(SH.on && !SH.canAdmin) return; _ss(v,dir); afterSeason(); if(SH.on && SH.db){ SH.db.doc('meta/season').set({season:v, by:SH.me, at:new Date().toISOString()}).catch(()=>stNote('시즌을 팀에 저장하지 못했습니다.')); } }; }
{ const _osr=onSharedReady; onSharedReady=function(db){ _osr(db); db.doc('meta/season').onSnapshot(sn=>{ const d=sn.exists?sn.data():null; const v=d&&String(d.season||''); if(/^\d{4}$/.test(v) && v!==SEASON){ SEASON=v; SETP('season',v); afterSeason(); } }, ()=>{}); }; }
loadLocalStatus();

/* ---------- 0.30.1 상단 시즌·저장 상태 칩 (모두에게 항상 표시) ---------- */
function updSeasonChip(){ let c=$('#seasonChip'); const ab=$('#admbtn'); if(!c && ab){ c=document.createElement('span'); c.id='seasonChip'; c.setAttribute('role','status'); ab.before(c); } if(!c) return;
  const st = window.DEBUG ? 'dbg' : (!window.__shReady ? 'wait' : (SH.on ? 'on' : 'off'));
  c.className='sc-'+st; c.innerHTML=`<b>${esc(SEASON)} 시즌</b><span class="sc-dot"></span><span>${st==='on'?'연결됨':st==='off'?'연결 안 됨':st==='dbg'?'디버깅':'연결 확인 중'}</span>`;
  c.title = `${SEASON} 시즌 (관리자가 정한 이번 시즌)\n` + ({
    on:'● 연결됨: 팀과 공유 중입니다. 내가 바꾼 진행 상태·팀 값·질문이 팀원 모두에게 바로 보입니다.',
    off:'● 연결 안 됨: 팀과 공유되지 않습니다. 진행 상태·팀 값·질문은 저장할 수 없어 저장·변경 버튼이 잠깁니다. 읽기와 계산기는 그대로 쓸 수 있고, 연결되면 다시 켜집니다.',
    wait:'● 연결 확인 중: 팀 공유 저장소에 연결하고 있습니다. 연결될 때까지 저장·변경 버튼이 잠깁니다.',
    dbg:'● 디버깅: 팀과 공유되지 않습니다. 모든 버튼을 실제처럼 눌러 볼 수 있고, 바꾼 내용은 이 브라우저에만 디버깅 데이터로 남습니다. 끄려면 DBG 버튼 → 디버깅 끄기.' })[st];
  document.body.classList.toggle('conn-off', st!=='on' && st!=='dbg');
  document.body.classList.toggle('no-write', st==='on' && SH.canWrite===false);
  document.querySelectorAll('.qa-f').forEach(f=>{ let w=f.querySelector('.qa-ro'); const ro = st==='on' && SH.canWrite===false; if(ro && !w){ w=document.createElement('p'); w.className='qa-warn qa-ro'; w.dataset.k='ro'; w.textContent='지금 권한(뷰어·댓글 작성자)으로는 글을 남길 수 없습니다. 읽기만 가능합니다.'; f.prepend(w); } else if(!ro && w) w.remove(); });
  document.querySelectorAll('.qa-f').forEach(f=>{ let w=f.querySelector('.qa-warn:not(.qa-ro)'); if(st==='off'){ if(!w){ w=document.createElement('p'); w.className='qa-warn'; w.textContent='연결 안 됨: 글은 써 둘 수 있지만 남기기는 연결된 뒤에 됩니다.'; f.prepend(w); } } else if(w) w.remove(); const nt=f.querySelector('.qa-note'); if(nt) nt.hidden = st==='off'; });
}
{ const _rm=refreshMode; refreshMode=function(){ const r=_rm.apply(this,arguments); try{ updSeasonChip(); }catch(e){} return r; }; }
{ const _am2=applyModes; applyModes=function(){ const r=_am2.apply(this,arguments); try{ updSeasonChip(); }catch(e){} return r; }; }
{ const _as=afterSeason; afterSeason=function(){ const r=_as.apply(this,arguments); try{ updSeasonChip(); }catch(e){} return r; }; }

/* ---------- 질문·오류: Firebase 저장소에서는 구글 로그인 후 작성 ---------- */
{ const _u=updSeasonChip; updSeasonChip=function(){ const r=_u.apply(this,arguments);
  try{ if(window.Backend && Backend.kind()==='firebase') document.querySelectorAll('.qa-f .qa-ro').forEach(w=>{ if(w.dataset.k==='login') return; w.dataset.k='login'; w.innerHTML='질문·오류를 남기려면 구글 로그인이 필요합니다. <button type="button" class="btn small qa-login">구글 로그인</button>'; }); }catch(e){}
  return r; }; }
document.addEventListener('click',async e=>{ const b=e.target.closest('.qa-login'); if(!b) return; e.preventDefault(); try{ const u=await Backend.use('user'); await u.signIn(); }catch(err){ toast('로그인하지 못했습니다.'); console.error(err); } }, true);
