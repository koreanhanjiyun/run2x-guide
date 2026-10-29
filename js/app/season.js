/* ---------- 0.29.3 시즌 넘기기 ---------- */
function setSeason(v,dir){ if(!/^\d{4}$/.test(v)) return; SEASON=v; SETP('season',v); document.querySelectorAll('.season-in').forEach(x=>{ x.value=v; }); refreshVals(); renderAdm();
  const b=document.querySelector('#admPanel .adm-b'); if(b){ b.classList.remove('sl-l','sl-r'); void b.offsetWidth; b.classList.add(dir<0?'sl-r':'sl-l'); } }

/* 보는 시즌(SEASON, 내 화면) ↔ 이번 시즌(TEAM_SEASON, 팀 공통) */
let TEAM_SEASON = SEASON, TEAM_SEASON_FIRST = true;
const viewingOther = () => SEASON !== TEAM_SEASON;

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
  if(!canEditItem(id)){ toast(pastLock() ? '지난 시즌 기록은 회장만 고칠 수 있습니다.' : '이 항목의 진행 상태는 회장이나 담당 팀장·파트장만 바꿀 수 있습니다.'); return; }
  if(v==='todo') delete STATUS[id]; else STATUS[id]=v; refreshStatus();
  const se=SEASON, ref=SH.db.doc('status/'+se+'-'+id), legacy = se===LEGACY_SEASON && SH.raw && SH.raw[id] && !SH.raw[id].season;
  const run=async()=>{ if(legacy){ try{ await SH.db.doc('status/'+id).delete(); }catch(e){} } if(v==='todo') await ref.delete(); else await ref.set({v, by:SH.me, at:new Date().toISOString(), season:se, item:id, part:IT[id].p, epoch:SH.epoch}); };
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
  const c=document.querySelector('#st-confirm>span'); if(c) c.innerHTML=`<b class="sn-big">${esc(SEASON)}</b> 시즌을 초기화합니다. 다시 복원할 수 없습니다.`; }
/* 보는 시즌은 누구나 바꿀 수 있음 (내 화면만). 팀의 이번 시즌 지정은 회장만 (H3) */
{ const _ss=setSeason; setSeason=function(v,dir){ if(!/^\d{4}$/.test(v)) return; _ss(v,dir); afterSeason(); try{ renderTeamTab && renderTeamTab(true); }catch(e){} try{ paintSeasonBanner(); }catch(e){} }; }
{ const _osr=onSharedReady; onSharedReady=function(db){ _osr(db); db.doc('meta/season').onSnapshot(sn=>{ const d=sn.exists?sn.data():null; const v=d&&String(d.season||''); if(!/^\d{4}$/.test(v)) { TEAM_SEASON_FIRST=false; return; }
    const follow = TEAM_SEASON_FIRST || !viewingOther(); TEAM_SEASON=v; TEAM_SEASON_FIRST=false;
    if(follow && v!==SEASON){ SEASON=v; SETP('season',v); afterSeason(); } else { try{ renderAdm(); }catch(e){} try{ updSeasonChip(); }catch(e){} } }, ()=>{}); }; }
loadLocalStatus();

/* ---------- 0.30.1 상단 시즌·저장 상태 칩 (모두에게 항상 표시) ---------- */
function updSeasonChip(){ let c=$('#seasonChip'); const ab=$('#admbtn'); if(!c && ab){ c=document.createElement('span'); c.id='seasonChip'; c.setAttribute('role','status'); ab.before(c); } if(!c) return;
  const st = window.DEBUG ? 'dbg' : (!window.__shReady ? 'wait' : (SH.on ? 'on' : 'off'));
  c.className='sc-'+st; c.innerHTML=`<b>${esc(SEASON)} 시즌${viewingOther()?' 보는 중':''}</b><span class="sc-dot"></span><span>${st==='on'?'연결됨':st==='off'?'연결 안 됨':st==='dbg'?'디버깅':'연결 확인 중'}</span>`;
  c.title = `${SEASON} 시즌 (회장이 정한 이번 시즌)\n` + ({
    on:'● 연결됨: 팀과 공유 중입니다. 내가 바꾼 진행 상태·팀 값·논의가 팀원 모두에게 바로 보입니다.',
    off:'● 연결 안 됨: 팀과 공유되지 않습니다. 진행 상태·팀 값·논의는 저장할 수 없어 저장·변경 버튼이 잠깁니다. 읽기와 계산기는 그대로 쓸 수 있고, 연결되면 다시 켜집니다.',
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

/* ---------- 관리 창: 이번 시즌(팀 공통) 지정은 버튼으로만 ---------- */
async function setTeamSeason(arg){ if(SH.on && !SH.canAdmin) return; const v=String(arg||SEASON), from=TEAM_SEASON; if(v===String(from)) return;
  if(SH.on && SH.db){ try{ await SH.db.doc('meta/season').set({season:v, by:SH.me, at:new Date().toISOString()}); }catch(e){ stNote('이번 시즌을 저장하지 못했습니다.'); return; }
    try{ if(window.Backend && Backend.Team && Backend.Team.rollSeason) await Backend.Team.rollSeason(from, v); }catch(e){ console.error(e); } }
  TEAM_SEASON=v; SETP('season',v); try{ renderAdm(); }catch(e){} try{ updSeasonChip(); }catch(e){} toast(`팀의 이번 시즌을 <b>${esc(v)} 시즌</b>으로 정했습니다. 팀 설정에서 이번 시즌 팀원 명단을 확인하십시오`); try{ if(TAB==='team') renderTeamTab(); }catch(e){} }
{ const _ra=renderAdm; renderAdm=function(){ const r=_ra.apply(this,arguments);
  try{ const nav=document.querySelector('#admPanel .sn-nav'); if(nav){ let t=nav.parentElement.querySelector('.sn-team'); if(!t){ t=document.createElement('div'); t.className='sn-team'; nav.after(t); }
    t.innerHTML = viewingOther()
      ? `<div class="sn-warn">지금 <b>${esc(SEASON)}</b> 시즌을 보는 중 · 팀의 이번 시즌은 <b>${esc(TEAM_SEASON)}</b></div><div class="sn-acts"><button type="button" class="btn small" data-sn="back">${esc(TEAM_SEASON)} 시즌으로 돌아가기</button><button type="button" class="btn small" data-sn="set">${esc(SEASON)} 시즌을 이번 시즌으로 지정</button></div>`
      : `<p class="muted sn-note">이번 시즌(팀 공통): <b>${esc(TEAM_SEASON)}</b> · ‹ ›는 내 화면에서만 바뀝니다.</p>`; } }catch(e){}
  return r; }; }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-sn]'); if(!b) return; e.preventDefault();
  if(b.dataset.sn==='back'){ setSeason(TEAM_SEASON, +TEAM_SEASON>+SEASON?1:-1); return; }
  if(b.dataset.sn==='set'){ if(!b.dataset.confirm){ b.dataset.confirm='1'; b.textContent=`한 번 더 누르면 팀 전체가 ${SEASON} 시즌이 됩니다`; return; } setTeamSeason(); } });
