/* ---------- 0.29.0 참고 탭: 다른 탭으로 가면 펼친 칸 모두 접기 ---------- */
function initRefFold(){ let prev=TAB; const _st=showTab; showTab=function(t,k){ const was=TAB; const r=_st.apply(this,arguments); if(was==='ref' && t!=='ref') document.querySelectorAll('#ref-list details[open]').forEach(d=>d.open=false); return r; }; }

/* ---------- 항목 바로가기 링크 (제목 줄에 마우스를 올리면 🔗) · 사이트 링크 복사 ---------- */
/* 사이트 주소: 웹에 올라가 있으면 지금 주소, 아니면(아티팩트·파일) config 의 siteUrl */
function siteUrl(){ try{ if(/^https?:$/.test(location.protocol) && !/claude\.ai|claudeusercontent|anthropic/.test(location.hostname)) return location.origin+location.pathname; }catch(e){} return (window.RUN2X_CONFIG||{}).siteUrl || ''; }
function toast(html, ms){ let t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); } t.innerHTML=html; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'), ms||2600); }
function copyText(text, okHtml){
  const fail=()=>{ toast(`복사하지 못했습니다. 아래 내용을 선택해 복사하십시오<textarea class="tlink" readonly rows="${Math.min(7, String(text).split('\n').length)}"></textarea>`, 12000);
    const i=$('#toast .tlink'); if(i){ i.value=text; setTimeout(()=>{ i.focus(); i.select(); },30); } };
  try{ navigator.clipboard.writeText(text).then(()=>toast(okHtml), fail); }catch(_){ fail(); } }
function initLinks(){
  document.querySelectorAll('details.item[data-item]>summary').forEach(sm=>{ if(sm.querySelector('.ilink')) return; const b=document.createElement('button'); b.type='button'; b.className='ilink'; b.title='이 항목 링크 복사'; b.setAttribute('aria-label','이 항목 링크 복사'); b.textContent='🔗'; const sr=sm.querySelector('.sright'); if(sr) sr.before(b); else { const nm=sm.querySelector('.iname'); (nm||sm).after(b); } });
  document.addEventListener('click',e=>{
    if(e.target.closest('.vl-share')){ e.preventDefault(); copyText(siteUrl(), '사이트 링크를 복사했습니다'); return; }
    const b=e.target.closest('.ilink'); if(!b) return; e.preventDefault(); e.stopPropagation(); const id=b.closest('details.item').dataset.item;
    copyText(siteUrl()+'#it-'+id, `링크를 복사했습니다 · <b>${IT[id].n}</b>`); }, true);
  const h=(location.hash||'').slice(1); if(/^it-/.test(h) && IT[h.slice(3)]) setTimeout(()=>openItem(h.slice(3)),400);
}

/* ---------- 0.34.0 항목별 논의: 각 항목 카드 맨 아래, 댓글 + 답글(한 단계)
   - 팀원 누구나 쓰고, 자기 글은 수정·삭제. 관리자는 관리자 모드에서 부적절한 글 삭제
   - 답글이 달린 글을 지우면 "삭제한 댓글입니다"로 남겨 흐름 유지
   - 처리 상태(접수·반영 등)는 없음. 내용 오류 신고는 플랫폼 문의로
   - 저장: qa/<id> = {v:2, item, parent('' 또는 원글 id), text, by, at, editedAt?, removed?('self'|'admin')} ---------- */
let QA={}; const QAKEY='run2x.qa.v2';
try{ QA=JSON.parse(localStorage.getItem(QAKEY)||'{}')||{}; }catch(e){ QA={}; }
const isTalk=q=> !!q && q.v===2 && !!q.item;
const qaAdmin=()=> SH.on ? !!SH.canAdmin : false;   // 관리자 모드 없이 관리자에게 [삭제 (관리)] 표시
const qaMine=q=> SH.on ? (!!SH.me && q.by===SH.me) : true;
const notMe=q=> (q.by||'')!==(SH.me||'');
function qaFmt(at){ const d=new Date(at); return isNaN(d)?'':`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
async function qaNames(){ const ids=[...new Set(Object.values(QA).map(q=>q&&q.by).filter(Boolean))]; let ps={}; try{ if(SH.on && SH.user && ids.length) ps=await SH.user.profiles(ids); }catch(e){} return ps; }

/* 마지막으로 본 시각 (항목별, 이 브라우저). 처음 쓰는 브라우저는 지금까지의 글을 본 것으로 시작 */
const tkKey=()=>'run2x.tkSeen.'+(window.__teamId||'');
function tkSeenSave(o){ try{ localStorage.setItem(tkKey(), JSON.stringify(o)); }catch(e){} }
function tkSeen(){ let o=null; try{ o=JSON.parse(localStorage.getItem(tkKey())||'null'); }catch(e){} if(!o || !o.base){ o={base:new Date().toISOString(), items:{}}; tkSeenSave(o); } o.items=o.items||{}; return o; }
function tkMark(id){ const o=tkSeen(); o.items[id]=new Date().toISOString(); tkSeenSave(o); }
function tkSeenAll(){ tkSeenSave({base:new Date().toISOString(), items:{}}); renderQA(); }
function tkNew(id, o){ o=o||tkSeen(); const s=o.items[id]||o.base; return Object.values(QA).filter(q=>isTalk(q) && q.item===id && !q.removed && notMe(q) && String(q.at)>s).length; }
function tkNewTotal(){ const o=tkSeen(); const ids=new Set(Object.values(QA).filter(isTalk).map(q=>q.item)); let n=0; ids.forEach(id=>{ n+=tkNew(id,o); }); return n; }

/* 원글 + 답글 묶기 (원글이 지워진 답글은 원글처럼) */
function tkThreads(id){ const all=Object.entries(QA).filter(([k,q])=>isTalk(q) && q.item===id), by=(a,b)=>String(a[1].at).localeCompare(String(b[1].at));
  const tops=all.filter(([k,q])=>!q.parent || !isTalk(QA[q.parent])).sort(by);
  return tops.map(([k,q])=>[k,q,all.filter(([k2,r])=>r.parent===k).sort(by)]); }
function tkRow(k,q,nm,adm,isReply,since){ const rm=!!q.removed, mine=qaMine(q), who=nm(q.by);
  const acts = rm ? '' : `<button class="lnk tk-reply" type="button">답글</button>${mine?'<button class="lnk qa-edit" type="button">수정</button>':''}${mine?'<button class="lnk qa-del" type="button">삭제</button>':(adm?'<button class="lnk qa-del tk-mod" type="button" title="관리자: 부적절한 글 삭제">삭제 (관리)</button>':'')}`;
  const isNew = !rm && notMe(q) && String(q.at)>since;
  return `<div class="tk-c${isReply?' tk-r':''}${isNew?' tk-isnew':''}" data-qid="${esc(k)}">
    <div class="tk-h"><span class="tk-av" aria-hidden="true">${esc(rm?'–':[...String(who)][0]||'?')}</span><b class="tk-who">${rm?'':esc(who)}</b><span class="muted">${qaFmt(q.at)}${q.editedAt&&!rm?' · 수정됨':''}</span>${isNew?'<span class="tk-newtag">새 글</span>':''}<span class="qa-act">${acts}</span></div>
    <div class="qa-t${rm?' tk-rm':''}"></div><button class="lnk qa-more" type="button" hidden>더 보기</button></div>`; }

async function renderQA(){ const ps=await qaNames(); const nm=id=>(id && ps[id] && ps[id].name) || (SH.on?'팀원':'나'); const adm=qaAdmin(); const o=tkSeen();
  document.querySelectorAll('.tk[data-titem]').forEach(box=>{ const id=box.dataset.titem, open=box.querySelector('.tk-d').open;
    const since=o.items[id]||o.base; if(open && tkNew(id,o)){ o.items[id]=new Date().toISOString(); tkSeenSave(o); }
    const live=Object.values(QA).filter(q=>isTalk(q) && q.item===id && !q.removed).length, nw=open?0:tkNew(id,o);
    const c=box.querySelector('.tk-n'); if(c) c.textContent = live ? `${live}개${nw?` · 새 글 ${nw}`:''}` : '';
    const it=document.getElementById('it-'+id), bd=it && it.querySelector(':scope>summary .tk-cnt');
    if(bd){ bd.hidden=!live; bd.classList.toggle('new', nw>0); bd.innerHTML=`💬 ${live}`; bd.title = `논의 ${live}개${nw?` · 새 글 ${nw}`:''} · 눌러서 보기`; }
    const L=box.querySelector('.tk-list');
    const ae=document.activeElement; if((ae && ae.tagName==='TEXTAREA' && L.contains(ae)) || L.querySelector('.editing') || [...L.querySelectorAll('.tk-rf textarea')].some(t=>t.value.trim())) return;
    const th=tkThreads(id);
    L.innerHTML = th.length ? th.map(([k,q,rs])=>`<div class="tk-th" data-top="${esc(k)}">${tkRow(k,q,nm,adm,false,since)}${rs.length?`<div class="tk-rs">${rs.map(([k2,r])=>tkRow(k2,r,nm,adm,true,since)).join('')}</div>`:''}<div class="tk-rfslot"></div></div>`).join('')
                        : '<p class="muted tk-empty">아직 논의가 없습니다.</p>';
    L.querySelectorAll('.tk-c').forEach(r=>{ const q=QA[r.dataset.qid]; if(!q) return; const t=r.querySelector('.qa-t');
      t.textContent = q.removed ? (q.removed==='admin' ? '관리자가 삭제한 댓글입니다.' : '작성자가 삭제한 댓글입니다.') : (q.text||'');
      requestAnimationFrame(()=>{ const mb=r.querySelector('.qa-more'); if(mb && t.scrollHeight>t.clientHeight+2) mb.hidden=false; }); });
  });
  try{ renderAdm(); }catch(e){}
}
async function qaSave(id,data){ if(SH.on && SH.db){ try{ if(id) await SH.db.doc('qa/'+id).update(data); else await SH.db.collection('qa').add(data); }catch(e){ if(Backend.denied(e)) toast('지금 권한으로는 할 수 없습니다.'); else toast('저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.'); } return; }
  if(id) QA[id]={...QA[id],...data}; else QA['l'+Date.now()]=data; try{ localStorage.setItem(QAKEY,JSON.stringify(QA)); }catch(e){} renderQA(); }
async function qaDel(id, quiet){ if(SH.on && SH.db){ try{ await SH.db.doc('qa/'+id).delete(); }catch(e){ if(!quiet) toast('삭제하지 못했습니다.'); } return; } delete QA[id]; try{ localStorage.setItem(QAKEY,JSON.stringify(QA)); }catch(e){} renderQA(); }
/* 삭제: 답글이 있으면 "삭제한 댓글"로 남기고, 없으면 지움. 지워진 원글의 마지막 답글을 지우면 원글도 정리 */
async function tkDelete(k){ const q=QA[k]; if(!q) return; const mine=qaMine(q);
  if(Object.values(QA).some(r=>isTalk(r) && r.parent===k)){ await qaSave(k,{removed: mine?'self':'admin', text:''}); return; }
  const p=q.parent; await qaDel(k);
  if(p && QA[p] && QA[p].removed && !Object.entries(QA).some(([k2,r])=>k2!==k && isTalk(r) && r.parent===p) && (qaMine(QA[p]) || qaAdmin())) await qaDel(p, true); }
function tkPost(item, parent, text){ qaSave(null,{v:2, item, parent:parent||'', text:String(text).slice(0,4000), by:SH.me||'', at:new Date().toISOString()}); tkMark(item); }

function initQA(){
  const fbOK = window.Backend && Backend.kind()==='firebase';
  document.querySelectorAll('details.item[data-item]').forEach(d=>{ const id=d.dataset.item; const body=d.querySelector(':scope>.dbody'); if(!body || body.querySelector(':scope>.tk')) return;
    const box=document.createElement('div'); box.className='tk'; box.dataset.titem=id;
    box.innerHTML=`<details class="tk-d"><summary><b>💬 논의</b><span class="tk-n muted"></span></summary><div class="tk-b">
      <div class="tk-list"></div>
      <form class="qa-f tk-f"><textarea class="qa-text" rows="2" maxlength="4000" placeholder="이 항목에 대해 팀원과 나눌 이야기" required></textarea>
        <div class="qa-r3"><span class="muted qa-note">팀원 모두에게 보입니다.</span><button class="btn pri small" type="submit">남기기</button></div></form>
      ${fbOK?`<p class="muted tk-fbline">내용이 틀렸거나 고쳐야 할 점은 <button type="button" class="lnk tp-fbopen" data-item="${id}">플랫폼 문의</button>로 개발자에게 알려 주십시오.</p>`:''}
      </div></details>`;
    body.appendChild(box);
    const sm=d.querySelector(':scope>summary'); if(sm && !sm.querySelector('.tk-cnt')){ const b=document.createElement('button'); b.type='button'; b.className='tk-cnt'; b.hidden=true; const sr=sm.querySelector('.sright'); if(sr) sr.before(b); else sm.appendChild(b); } });
  document.addEventListener('toggle',e=>{ const d=e.target; if(!d.classList || !d.classList.contains('tk-d') || !d.open) return; tkMark(d.closest('.tk').dataset.titem); renderQA(); }, true);
  document.addEventListener('submit',e=>{ const f=e.target.closest('.tk-f,.tk-rf'); if(!f) return; e.preventDefault(); const t=f.querySelector('textarea'), text=t.value.trim(); if(!text) return;
    const item=f.closest('.tk').dataset.titem; if(f.classList.contains('tk-rf')){ const top=f.closest('.tk-th').dataset.top; f.remove(); tkPost(item, top, text); } else { t.value=''; tkPost(item, '', text); } });
  document.addEventListener('click',e=>{
    const cn=e.target.closest('.tk-cnt'); if(cn){ e.preventDefault(); e.stopPropagation(); tkGo(cn.closest('details.item').dataset.item); return; }
    if(!e.target.closest('.tk')) return;
    const mo=e.target.closest('.qa-more'); if(mo){ const r=mo.closest('.tk-c'); const o=r.classList.toggle('open'); mo.textContent=o?'접기':'더 보기'; return; }
    const rp=e.target.closest('.tk-reply'); if(rp){ const th=rp.closest('.tk-th'), slot=th.querySelector('.tk-rfslot'); let f=slot.querySelector('.tk-rf');
      if(!f){ slot.innerHTML=`<form class="qa-f tk-rf"><textarea rows="2" maxlength="4000" placeholder="답글" required></textarea><div class="qa-r3"><span class="muted qa-note"></span><span class="tk-btns"><button class="btn small tk-rcancel" type="button">취소</button><button class="btn pri small" type="submit">답글 남기기</button></span></div></form>`; f=slot.querySelector('.tk-rf'); try{ updSeasonChip(); }catch(_){} }
      f.querySelector('textarea').focus(); return; }
    const rc=e.target.closest('.tk-rcancel'); if(rc){ rc.closest('.tk-rf').remove(); renderQA(); return; }
    const ed=e.target.closest('.qa-edit'); if(ed){ const r=ed.closest('.tk-c'); const q=QA[r.dataset.qid]; if(!q) return; r.classList.add('editing'); const t=r.querySelector('.qa-t');
      t.innerHTML=`<textarea rows="3" maxlength="4000"></textarea><div class="qa-er"><button class="btn small qa-esave" type="button">저장</button><button class="btn small qa-ecancel" type="button">취소</button></div>`; t.querySelector('textarea').value=q.text||''; t.querySelector('textarea').focus(); r.querySelector('.qa-more').hidden=true; return; }
    const es=e.target.closest('.qa-esave'); if(es){ const r=es.closest('.tk-c'); const v=r.querySelector('.qa-t textarea').value.trim(); if(!v) return; r.classList.remove('editing'); document.activeElement.blur(); qaSave(r.dataset.qid,{text:v, editedAt:new Date().toISOString()}); return; }
    const ec=e.target.closest('.qa-ecancel'); if(ec){ ec.closest('.tk-c').classList.remove('editing'); document.activeElement.blur(); renderQA(); return; }
    const x=e.target.closest('.qa-del'); if(x){ const r=x.closest('.tk-c'); if(r.dataset.confirm){ tkDelete(r.dataset.qid); } else { r.dataset.confirm='1'; const lb=x.textContent; x.textContent='한 번 더 누르면 삭제'; setTimeout(()=>{ delete r.dataset.confirm; x.textContent=lb; },3000); } } });
  /* 팀 공유: 예전 단계별 질문·오류 글(v 없음)은 보이지 않고, 관리자가 접속하면 한 번 정리 */
  const sub=()=>{ SH.db.collection('qa').onSnapshot(q=>{ const r={}, old=[]; q.docs.forEach(d=>{ const x=d.data(); if(isTalk(x)) r[d.id]=x; else old.push(d.id); }); QA=r; renderQA();
      if(old.length && SH.canAdmin && !window.__qaLegacy){ window.__qaLegacy=1; old.forEach(id=>qaDel(id, true)); } }, ()=>{}); };
  let tries=0; const wait=()=>{ if(SH.on && SH.db) sub(); else if(++tries<40) setTimeout(wait,500); }; renderQA(); wait();
}
/* 항목의 논의로 이동 (qid가 있으면 그 글로) */
function tkGo(id, qid){ if(!IT[id]) return; openItem(id);
  setTimeout(()=>{ const box=document.querySelector(`.tk[data-titem="${id}"]`); if(!box) return; const d=box.querySelector('.tk-d'); if(!d.open){ d.open=true; }
    requestAnimationFrame(()=>{ const row=(qid && box.querySelector(`.tk-c[data-qid="${qid}"]`)) || box; const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
      smoothScrollTo(()=>row.getBoundingClientRect().top+window.scrollY-Math.max(tabh+70,(window.innerHeight+tabh-row.offsetHeight)/2), ()=>markHere(row)); }); }, 650); }
document.addEventListener('click',e=>{ const g=e.target.closest('[data-tkgo]'); if(g){ e.preventDefault(); tkGo(g.dataset.tkgo, g.dataset.qid); } });
{ const _am=applyModes; applyModes=function(){ const r=_am.apply(this,arguments); try{ renderQA(); }catch(e){} return r; }; }

/* ---------- 0.29.1 파트 선택 시 목차도 흐림 ---------- */
{ const _ap=applyPart; applyPart=function(){ const r=_ap.apply(this,arguments); try{ document.querySelectorAll('#toc .toc-s[data-toc]').forEach(b=>{ const n=PSET.size ? ITEMS.filter(i=>i.s===b.dataset.toc && PSET.has(i.p)).length : 1; b.classList.toggle('pdim', PSET.size>0 && n===0); }); }catch(e){} return r; }; }
