/* ---------- 0.26.0 관리 창 (회장 모드에서만, 오른쪽 전체 높이) ---------- */
const ADMW=290;
function admPreds(id){ return [...new Set(EDGES.filter(e=>e[1]===id).map(e=>e[0]))].filter(x=>IT[x]); }
function admSuccs(id){ return [...new Set(EDGES.filter(e=>e[0]===id).map(e=>e[1]))].filter(x=>IT[x]); }
const admOk = id => STATUS[id]==='done' || STATUS[id]==='skip';
const admOrd = (a,b)=>(SIDX[IT[a].s]-SIDX[IT[b].s])||(((ACT[a]||[99])[0])-((ACT[b]||[99])[0]));
const admLnk = id => `<button class="lnk adm-it" data-goto="${id}"><span class="adm-code">${IT[id].s}</span>${IT[id].n}</button>`;
function admList(ids, empty, max=60){ if(!ids.length) return `<p class="adm-empty">${empty}</p>`; ids=[...ids].sort(admOrd); return `<div class="adm-list">${ids.slice(0,max).map(admLnk).join('')}</div>`; }
function initAdm(){ if($('#admPanel')) return;
  const p=document.createElement('aside'); p.id='admPanel'; p.setAttribute('aria-label','관리');
  p.innerHTML=`<div class="adm-h"><b>관리</b><span class="adm-sub">회장 모드에서만 보입니다</span><span class="adm-fold" aria-hidden="true"></span></div><div class="adm-b"></div>`;
  document.body.appendChild(p);
  const fold=()=>{ const c=!document.body.classList.contains('adm-coll'); document.body.classList.toggle('adm-coll',c); SETP('admcoll',c?'1':'0'); requestAnimationFrame(()=>{ try{ window.__figPlace&&window.__figPlace(); }catch(e){} }); };
  p.querySelector('.adm-h').addEventListener('click',fold);   /* 머리 줄 아무 곳이나 눌러 접기·펼치기 */
  const rs=document.createElement('div'); rs.className='adm-rs'; rs.title='끌어서 너비 조절'; p.appendChild(rs);
  const setW=w=>{ w=Math.max(230,Math.min(560,Math.round(w))); document.documentElement.style.setProperty('--admw', w+'px'); return w; };
  rs.addEventListener('pointerdown',e=>{ e.preventDefault(); rs.setPointerCapture(e.pointerId); document.body.classList.add('adm-drag');
    const mv=ev=>{ setW(window.innerWidth-ev.clientX); };
    const up=()=>{ rs.removeEventListener('pointermove',mv); rs.removeEventListener('pointerup',up); document.body.classList.remove('adm-drag'); SETP('admw', String(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--admw')))); try{ window.__figPlace&&window.__figPlace(); }catch(e){} };
    rs.addEventListener('pointermove',mv); rs.addEventListener('pointerup',up); });
  if(PREF('admcoll','0')==='1') document.body.classList.add('adm-coll');
  document.documentElement.style.setProperty('--admw', (parseInt(PREF('admw',String(ADMW)))||ADMW)+'px');
  const b=p.querySelector('.adm-b');
  b.innerHTML=`<section class="adm-s adm-team" hidden><button type="button" class="adm-tmopen" aria-expanded="false"><span class="tmo-t">팀 관리</span><span class="tmo-a">‹ 열기</span></button><p class="adm-hint tmo-hint">팀원 관리·차단, 팀 이름·비밀번호, 백업, 팀 삭제 (관리 창 옆에 열림)</p></section>
   <section class="adm-s adm-season"><div class="sn-h"><h4>시즌 · 진행 상태</h4></div>
     <div class="sn-nav"><button type="button" class="sn-prev" aria-label="이전 시즌" title="이전 시즌">◀</button><button type="button" class="sn-val" title="눌러서 연도 직접 입력"></button><input type="number" class="sn-in" min="2000" max="2100" hidden aria-label="시즌 연도 입력"><button type="button" class="sn-next" aria-label="다음 시즌" title="다음 시즌">▶</button></div>
     <div class="adm-st"></div><div class="adm-reset"></div>
     <p class="adm-hint sn-help">초기화는 논의 글을 제외하고 <b>지금 고른 시즌</b>의 모든 것을 초기 상태로 되돌립니다.</p></section>
   <section class="adm-s"><h4>진행 요약</h4><div class="adm-sum"></div></section>
   <details class="adm-s" open><summary><h4>착수 가능 <span class="adm-n" data-n="ready"></span></h4></summary><p class="adm-hint">받는 정보(선행 항목)가 모두 완료·제외인데 아직 예정인 항목</p><div data-l="ready"></div></details>
   <details class="adm-s" open><summary><h4>선행 미완료 경고 <span class="adm-n" data-n="warn"></span></h4></summary><p class="adm-hint">진행 중인데 선행 항목이 아직 끝나지 않은 항목</p><div data-l="warn"></div></details>
   <details class="adm-s"><summary><h4>제외 영향 <span class="adm-n" data-n="skip"></span></h4></summary><p class="adm-hint">제외한 항목과, 그 결과를 받는 항목</p><div data-l="skip"></div></details>
   <details class="adm-s" open><summary><h4>최근 논의 <span class="adm-n" data-n="qa"></span></h4></summary><p class="adm-hint">항목별 논의의 최근 글 10개. 누르면 그 글로 이동. 부적절한 글은 회장 모드에서 [삭제 (관리)]</p><div data-l="qa"></div></details>
   <details class="adm-s"><summary><h4>최근 변경</h4></summary><div data-l="recent"></div></details>
   <details class="adm-s"><summary><h4>팀 값 입력 현황 <span class="adm-n" data-n="val"></span></h4></summary><p class="adm-hint">이번 시즌 '우리 팀 값'이 비어 있는 항목</p><div data-l="val"></div></details>
`;
  /* 기존 진행 상태 막대(저장 방식·요약·초기화)를 관리 창으로 옮김 */
  const bar=document.querySelector('.stbar'); if(bar){ b.querySelector('.adm-st').appendChild(bar.querySelector('#stnote'));
    { const sm=bar.querySelector('#stmode'); if(sm){ sm.hidden=true; b.appendChild(sm); } } const rs=b.querySelector('.adm-reset'); const rb=bar.querySelector('#st-reset'); if(rb) rb.textContent='이 시즌 초기화'; rs.appendChild(rb); rs.appendChild(bar.querySelector('#st-confirm')); const ss=bar.querySelector('#stsum'); if(ss){ ss.hidden=true; rs.appendChild(ss); } bar.remove(); }
  const _st=showTab; showTab=function(t,k){ const r=_st.apply(this,arguments); admPlace(); return r; };
  const _rv=refreshVals; refreshVals=function(){ const r=_rv.apply(this,arguments); renderAdm(); return r; };
  const sv=p.querySelector('.sn-val'), si=p.querySelector('.sn-in');
  p.querySelector('.sn-prev').onclick=()=>setSeason(String(+SEASON-1),-1);
  p.querySelector('.sn-next').onclick=()=>setSeason(String(+SEASON+1),1);
  sv.onclick=()=>{ sv.hidden=true; si.hidden=false; si.value=SEASON; si.focus(); si.select(); };
  const done=ok=>{ if(si.hidden) return; si.hidden=true; sv.hidden=false; const v=si.value.trim(); if(ok && /^\d{4}$/.test(v) && v!==SEASON) setSeason(v, +v>+SEASON?1:-1); };
  si.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); done(true); } else if(e.key==='Escape'){ done(false); } });
  si.addEventListener('blur',()=>done(true));
  admPlace(); renderAdm();
}
function admPlace(){ const p=$('#admPanel'); if(!p) return; const on = false;   /* 관리 창은 없앰 (C11): 내용은 팀 탭으로 */ p.hidden=!on; document.body.classList.toggle('adm-on',on);
  requestAnimationFrame(()=>{ try{ window.__figPlace&&window.__figPlace(); }catch(e){} }); }
let ADMRAF=0;
function renderAdm(){ if(ADMRAF) return; ADMRAF=requestAnimationFrame(()=>{ ADMRAF=0; admPlace(); const p=$('#admPanel'); if(!p || p.hidden) return;
  const svb=p.querySelector('.sn-val'); if(svb) svb.textContent=SEASON+' 시즌'; const cf=document.querySelector('#st-confirm>span'); if(cf) cf.innerHTML=`<b class="sn-big">${esc(SEASON)}</b> 시즌을 초기화합니다. 다시 복원할 수 없습니다.`;
  const cnt=ids=>{ const d=ids.filter(i=>STATUS[i]==='done').length, g=ids.filter(i=>STATUS[i]==='doing').length, k=ids.filter(i=>STATUS[i]==='skip').length; return {d,g,k,t:ids.length-d-g-k,n:ids.length}; };
  const bar=(c,lab)=>{ const n=(c.n-c.k)||1; return `<div class="adm-pr"><span class="adm-pl">${lab}</span><span class="pbar2" title="완료 ${c.d} · 진행 중 ${c.g} · 예정 ${c.t}${c.k?` · 제외 ${c.k}`:''}"><i class="d" style="width:${c.d/n*100}%"></i><i class="g" style="width:${c.g/n*100}%"></i></span><span class="adm-pv">${c.d}/${c.n-c.k}${c.k?` <em>제외 ${c.k}</em>`:''}</span></div>`; };
  const all=ITEMS.map(i=>i.id);
  p.querySelector('.adm-sum').innerHTML = bar(cnt(all),'<b>전체</b>') + PARTS.map(([pt])=>{ const ids=ITEMS.filter(i=>i.p===pt).map(i=>i.id); return ids.length? bar(cnt(ids),`<span class="dot" style="background:${pc(pt)}"></span>${pt}`):''; }).join('');
  const ready=all.filter(id=>!STATUS[id] && admPreds(id).every(admOk));
  const warn=all.filter(id=>STATUS[id]==='doing' && admPreds(id).some(x=>!admOk(x)));
  const skips=all.filter(id=>STATUS[id]==='skip');
  const set=(k,h,n)=>{ const l=p.querySelector(`[data-l="${k}"]`); if(l) l.innerHTML=h; const c=p.querySelector(`[data-n="${k}"]`); if(c) c.textContent = n==null?'':String(n); };
  set('ready', admList(ready,'없습니다.'), ready.length);
  set('warn', warn.length? `<div class="adm-list">${[...warn].sort(admOrd).map(id=>admLnk(id)+`<div class="adm-why">미완료 선행: ${admPreds(id).filter(x=>!admOk(x)).map(x=>IT[x].n).join(', ')}</div>`).join('')}</div>` : '<p class="adm-empty">없습니다.</p>', warn.length);
  set('skip', skips.length? `<div class="adm-list">${[...skips].sort(admOrd).map(id=>{ const s=admSuccs(id).filter(x=>STATUS[x]!=='skip'); return admLnk(id)+`<div class="adm-why">${s.length?'영향: '+s.map(x=>`<button class="lnk" data-goto="${x}">${IT[x].n}</button>`).join(', '):'영향받는 항목 없음'}</div>`; }).join('')}</div>` : '<p class="adm-empty">제외한 항목이 없습니다.</p>', skips.length);
  const vids=all.filter(id=>ACT[id] && ACT[id][2] && ACT[id][2].length), miss=vids.filter(id=>!(VAL[id]&&VAL[id].s&&valFilled(VAL[id].s[SEASON])));
  set('val', `<p class="adm-hint">입력 ${vids.length-miss.length} / ${vids.length}</p>`+admList(miss,'모두 입력했습니다.'), miss.length);
  admRecent(p.querySelector('[data-l="recent"]'));
  const qs=Object.entries(QA||{}).filter(([k,q])=>isTalk(q) && !q.removed && IT[q.item]).sort((x,y)=>String(y[1].at).localeCompare(String(x[1].at))).slice(0,10);
  const nw=(typeof tkNewTotal==='function')?tkNewTotal():0;
  set('qa', qs.length? `<div class="adm-list">${qs.map(([k,q])=>`<button class="lnk adm-it adm-qa" data-tkgo="${q.item}" data-qid="${esc(k)}" title="${esc((q.text||'').slice(0,120))}"><span class="adm-code">${IT[q.item].s}</span><span class="adm-qk">${esc(IT[q.item].n)}</span><span class="adm-qt">${q.parent?'↳ ':''}${esc((q.text||'').slice(0,40))}</span></button>`).join('')}</div>` : '<p class="adm-empty">없습니다.</p>', nw?`새 ${nw}`:'');
}); }
async function admRecent(el){ if(!el) return;
  if(!SH.on){ el.innerHTML='<p class="adm-empty">팀 공유 모드에서만 표시됩니다.</p>'; return; }
  const rows=Object.entries(SH.raw||{}).map(([did,d])=>[d&&d.item||did,d]).filter(([id,d])=>d && IT[id] && (d.season||LEGACY_SEASON)===SEASON && (d.season || (d.epoch||0)===SH.epoch) && d.at).sort((a,b)=>String(b[1].at).localeCompare(String(a[1].at))).slice(0,10);
  if(!rows.length){ el.innerHTML='<p class="adm-empty">이번 시즌 변경 기록이 없습니다.</p>'; return; }
  let ps={}; try{ const ids=[...new Set(rows.map(r=>r[1].by).filter(Boolean))]; if(SH.user && ids.length) ps=await SH.user.profiles(ids); }catch(e){}
  el.innerHTML=`<div class="adm-list">${rows.map(([id,d])=>{ const t=new Date(d.at); const who=(d.by&&ps[d.by]&&ps[d.by].name)||'팀원';
    return admLnk(id)+`<div class="adm-why">${ST_LABEL[d.v]||d.v} · ${who} · ${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}</div>`; }).join('')}</div>`; }
