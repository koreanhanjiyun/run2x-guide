/* ---------- 진행 목록 도우미 (팀 탭이 씀). 예전 관리 창(C11 에서 없앰)의 코드는 2026-11-12 지움 ---------- */
function admPreds(id){ return [...new Set(EDGES.filter(e=>e[1]===id).map(e=>e[0]))].filter(x=>IT[x]); }
function admSuccs(id){ return [...new Set(EDGES.filter(e=>e[0]===id).map(e=>e[1]))].filter(x=>IT[x]); }
const admOk = id => STATUS[id]==='done' || STATUS[id]==='skip';
const admOrd = (a,b)=>(SIDX[IT[a].s]-SIDX[IT[b].s])||(((ACT[a]||[99])[0])-((ACT[b]||[99])[0]));
const admLnk = id => `<button class="lnk adm-it" data-goto="${id}"><span class="adm-code">${IT[id].s}</span>${IT[id].n}</button>`;
function admList(ids, empty, max=60){ if(!ids.length) return `<p class="adm-empty">${empty}</p>`; ids=[...ids].sort(admOrd); return `<div class="adm-list">${ids.slice(0,max).map(admLnk).join('')}</div>`; }
async function admRecent(el){ if(!el) return;
  if(!SH.on){ el.innerHTML='<p class="adm-empty">팀 공유 모드에서만 표시됩니다.</p>'; return; }
  const rows=Object.entries(SH.raw||{}).map(([did,d])=>[d&&d.item||did,d]).filter(([id,d])=>d && IT[id] && (d.season||LEGACY_SEASON)===SEASON && (d.season || (d.epoch||0)===SH.epoch) && d.at).sort((a,b)=>String(b[1].at).localeCompare(String(a[1].at))).slice(0,10);
  if(!rows.length){ el.innerHTML='<p class="adm-empty">이번 시즌 변경 기록이 없습니다.</p>'; return; }
  let ps={}; try{ const ids=[...new Set(rows.map(r=>r[1].by).filter(Boolean))]; if(SH.user && ids.length) ps=await SH.user.profiles(ids); }catch(e){}
  el.innerHTML=`<div class="adm-list">${rows.map(([id,d])=>{ const t=new Date(d.at); const who=(d.by&&ps[d.by]&&ps[d.by].name)||'팀원';
    return admLnk(id)+`<div class="adm-why">${ST_LABEL[d.v]||d.v} · ${who} · ${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}</div>`; }).join('')}</div>`; }
