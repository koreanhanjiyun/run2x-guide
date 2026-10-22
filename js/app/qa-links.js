/* ---------- 0.29.0 참고 탭: 다른 탭으로 가면 펼친 칸 모두 접기 ---------- */
function initRefFold(){ let prev=TAB; const _st=showTab; showTab=function(t,k){ const was=TAB; const r=_st.apply(this,arguments); if(was==='ref' && t!=='ref') document.querySelectorAll('#ref-list details[open]').forEach(d=>d.open=false); return r; }; }

/* ---------- 0.29.0 항목 바로가기 링크 (제목 줄에 마우스를 올리면 🔗) ---------- */
const ART_URL='https://claude.ai/artifact/E7NRBAxgovGyCz9cyLja19';
function toast(html){ let t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); } t.innerHTML=html; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),2600); }
function initLinks(){
  document.querySelectorAll('details.item[data-item]>summary').forEach(sm=>{ if(sm.querySelector('.ilink')) return; const b=document.createElement('button'); b.type='button'; b.className='ilink'; b.title='이 항목 링크 복사'; b.setAttribute('aria-label','이 항목 링크 복사'); b.textContent='🔗'; const sr=sm.querySelector('.sright'); if(sr) sr.before(b); else { const nm=sm.querySelector('.iname'); (nm||sm).after(b); } });
  document.addEventListener('click',e=>{ const b=e.target.closest('.ilink'); if(!b) return; e.preventDefault(); e.stopPropagation(); const id=b.closest('details.item').dataset.item, url=ART_URL+'#it-'+id;
    const ok=()=>toast(`링크를 복사했습니다 · <b>${IT[id].n}</b>`), fail=()=>toast(`복사하지 못했습니다. 아래 링크를 선택해 복사하십시오<input class="tlink" readonly value="${url}">`);
    try{ navigator.clipboard.writeText(url).then(ok,()=>{ fail(); setTimeout(()=>{ const i=$('#toast .tlink'); if(i){ i.focus(); i.select(); } },30); }); }catch(_){ fail(); } }, true);
  const h=(location.hash||'').slice(1); if(/^it-/.test(h) && IT[h.slice(3)]) setTimeout(()=>openItem(h.slice(3)),400);
}

/* ---------- 0.29.1 단계별 질문·오류 남기기: 입력칸 위, 글은 최신순 아래, 상태 표시(접수·검토 중·반영됨·반영 안 함) ---------- */
let QA={}; const QAKEY='run2x.qa.v1';
try{ QA=JSON.parse(localStorage.getItem(QAKEY)||'{}')||{}; }catch(e){ QA={}; }
const QA_ST=['접수','검토 중','반영됨','반영 안 함'];
const qaAdmin=()=> UMODE==='manage' && (SH.on ? !!SH.canAdmin : true);
const qaMine=q=> SH.on ? (!!SH.me && q.by===SH.me) : true;
const qaOpen=q=> !q.status || q.status==='접수' || q.status==='검토 중';
function qaFmt(at){ const d=new Date(at); return isNaN(d)?'':`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
async function qaNames(){ const ids=[...new Set(Object.values(QA).map(q=>q&&q.by).filter(Boolean))]; let ps={}; try{ if(SH.on && SH.user && ids.length) ps=await SH.user.profiles(ids); }catch(e){} return ps; }
const QA_ITEMOPTS = ()=> STEPS.map(st=>{ const its=ITEMS.filter(i=>i.s===st.id); return its.length?`<optgroup label="${st.id}">${its.map(i=>`<option value="${i.id}">${esc(i.n)}</option>`).join('')}</optgroup>`:''; }).join('');
async function renderQA(){ const ps=await qaNames(); const nm=id=>(id && ps[id] && ps[id].name) || (SH.on?'팀원':'나'); const adm=qaAdmin();
  document.querySelectorAll('.qa[data-qstep]').forEach(box=>{ const sid=box.dataset.qstep; const rows=Object.entries(QA).filter(([k,q])=>q && q.step===sid).sort((a,b)=>String(b[1].at).localeCompare(String(a[1].at)));
    const L=box.querySelector('.qa-list'); const keepEdit=L.querySelector('.qa-row.editing textarea'); if(keepEdit && L.contains(document.activeElement)) return;
    L.innerHTML = rows.map(([k,q])=>{ const st=q.status||'접수';
      return `<div class="qa-row st-${QA_ST.indexOf(st)}" data-qid="${k}">
        <div class="qa-h"><span class="qa-k ${q.kind==='오류'?'err':'ask'}">${esc(q.kind||'질문')}</span>${q.item&&IT[q.item]?`<button class="lnk" data-goto="${q.item}">${esc(IT[q.item].n)}</button>`:''}<span class="muted">${esc(nm(q.by))} · ${qaFmt(q.at)}${q.editedAt?' · 수정됨':''}</span><span class="qa-st">${st}</span>
          <span class="qa-act">${qaMine(q)?'<button class="lnk qa-edit" type="button">수정</button>':''}${(qaMine(q)||adm)?'<button class="lnk qa-del" type="button">삭제</button>':''}</span></div>
        <div class="qa-t"></div><button class="lnk qa-more" type="button" hidden>더 보기</button>
        ${adm?`<div class="qa-adm"><select class="qa-sst" aria-label="상태">${QA_ST.map(x=>`<option${x===st?' selected':''}>${x}</option>`).join('')}</select><button class="btn small qa-sset" type="button">상태 저장</button></div>`:''}
      </div>`; }).join('');
    rows.forEach(([k,q])=>{ const r=L.querySelector(`[data-qid="${k}"]`); const t=r.querySelector('.qa-t'); t.textContent=q.text||'';
      requestAnimationFrame(()=>{ const mb=r.querySelector('.qa-more'); if(t.scrollHeight>t.clientHeight+2) mb.hidden=false; }); });
    const open=rows.filter(r=>qaOpen(r[1])).length; const c=box.querySelector('.qa-n'); if(c) c.textContent = rows.length ? `${rows.length}건${open?` · 처리 전 ${open}`:''}` : '';
  });
  try{ renderAdm(); }catch(e){}
}
async function qaSave(id,data){ if(SH.on && SH.db){ try{ if(id) await SH.db.doc('qa/'+id).update(data); else await SH.db.collection('qa').add(data); }catch(e){ if(Backend.denied(e)){ SH.canWrite=false; try{ updSeasonChip(); }catch(_){} toast('지금 권한으로는 글을 남길 수 없습니다.'); } else toast('저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.'); } return; }
  if(id) QA[id]={...QA[id],...data}; else QA['l'+Date.now()]=data; try{ localStorage.setItem(QAKEY,JSON.stringify(QA)); }catch(e){} renderQA(); }
async function qaDel(id){ if(SH.on && SH.db){ try{ await SH.db.doc('qa/'+id).delete(); }catch(e){ toast('삭제하지 못했습니다.'); } return; } delete QA[id]; try{ localStorage.setItem(QAKEY,JSON.stringify(QA)); }catch(e){} renderQA(); }
function initQA(){
  STEPS.forEach(st=>{ const d=$('#st-'+st.id); if(!d || d.querySelector('.qa')) return; const body=d.querySelector(':scope>.dbody')||d;
    const its=ITEMS.filter(i=>i.s===st.id).sort((a,b)=>((ACT[a.id]||[99])[0])-((ACT[b.id]||[99])[0]));
    const box=document.createElement('div'); box.className='qa'; box.dataset.qstep=st.id;
    box.innerHTML=`<details class="qa-d"><summary><b>질문·오류 남기기</b><span class="qa-n muted"></span></summary><div class="qa-b">
      <form class="qa-f"><div class="qa-r1"><select class="qa-kind" aria-label="종류"><option selected>질문</option><option>오류</option></select><select class="qa-item" aria-label="관련 항목"><option value="">관련 항목 (선택)</option>${its.map(i=>`<option value="${i.id}">${esc(i.n)}</option>`).join('')}</select></div>
      <textarea class="qa-text" rows="3" placeholder="이 단계에서 궁금한 점이나 틀린 내용을 적어 주십시오" required></textarea>
      <div class="qa-r3"><span class="muted qa-note">남긴 글은 이 가이드를 보는 팀원 모두에게 보입니다.</span><button class="btn pri small" type="submit">남기기</button></div></form>
      <div class="qa-list"></div></div></details>`;
    body.appendChild(box); });
  document.addEventListener('submit',e=>{ const f=e.target.closest('.qa-f'); if(!f) return; e.preventDefault(); const box=f.closest('.qa'); const text=f.querySelector('.qa-text').value.trim(); if(!text) return;
    qaSave(null,{step:box.dataset.qstep, item:f.querySelector('.qa-item').value||'', kind:f.querySelector('.qa-kind').value, text, by:SH.me||'', at:new Date().toISOString(), status:'접수'}); f.querySelector('.qa-text').value=''; f.querySelector('.qa-item').value=''; });
  document.addEventListener('click',e=>{
    const mo=e.target.closest('.qa-more'); if(mo){ const r=mo.closest('.qa-row'); const o=r.classList.toggle('open'); mo.textContent=o?'접기':'더 보기'; return; }
    const ss=e.target.closest('.qa-sset'); if(ss){ const r=ss.closest('.qa-row'); qaSave(r.dataset.qid,{status:r.querySelector('.qa-sst').value}); toast('상태를 저장했습니다'); return; }
    const ed=e.target.closest('.qa-edit'); if(ed){ const r=ed.closest('.qa-row'); const q=QA[r.dataset.qid]; if(!q) return; r.classList.add('editing'); const t=r.querySelector('.qa-t');
      t.innerHTML=`<textarea rows="4"></textarea><div class="qa-er"><button class="btn small qa-esave" type="button">저장</button><button class="btn small qa-ecancel" type="button">취소</button></div>`; t.querySelector('textarea').value=q.text||''; t.querySelector('textarea').focus(); r.querySelector('.qa-more').hidden=true; return; }
    const es=e.target.closest('.qa-esave'); if(es){ const r=es.closest('.qa-row'); const v=r.querySelector('.qa-t textarea').value.trim(); if(!v) return; r.classList.remove('editing'); document.activeElement.blur(); qaSave(r.dataset.qid,{text:v, editedAt:new Date().toISOString()}); return; }
    const ec=e.target.closest('.qa-ecancel'); if(ec){ ec.closest('.qa-row').classList.remove('editing'); document.activeElement.blur(); renderQA(); return; }
    const x=e.target.closest('.qa-del'); if(x){ const r=x.closest('.qa-row'); if(r.dataset.confirm){ qaDel(r.dataset.qid); } else { r.dataset.confirm='1'; x.textContent='한 번 더 누르면 삭제'; setTimeout(()=>{ delete r.dataset.confirm; x.textContent='삭제'; },3000); } } });
  const sub=()=>{ SH.db.collection('qa').onSnapshot(q=>{ const r={}; q.docs.forEach(d=>{ r[d.id]=d.data(); }); QA=r; renderQA(); }, ()=>{}); };
  let tries=0; const wait=()=>{ if(SH.on && SH.db) sub(); else if(++tries<40) setTimeout(wait,500); }; renderQA(); wait();
}
function qaGo(sid,qid){ pushHist(); setVM('full'); showTab('steps', true); const st=$('#st-'+sid); if(!st) return; st.open=true;
  const b=document.querySelector(`.qa[data-qstep="${sid}"]`); if(!b) return; b.querySelector('details').open=true; const row=(qid && b.querySelector(`.qa-row[data-qid="${qid}"]`))||b;
  const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
  requestAnimationFrame(()=>requestAnimationFrame(()=>smoothScrollTo(()=>row.getBoundingClientRect().top+window.scrollY-Math.max(tabh+70,(window.innerHeight+tabh-row.offsetHeight)/2), ()=>markHere(row)))); }
document.addEventListener('click',e=>{ const g=e.target.closest('[data-qago]'); if(g){ qaGo(g.dataset.qago, g.dataset.qid); } });
{ const _am=applyModes; applyModes=function(){ const r=_am.apply(this,arguments); try{ renderQA(); }catch(e){} return r; }; }

/* ---------- 0.29.1 파트 선택 시 목차도 흐림 ---------- */
{ const _ap=applyPart; applyPart=function(){ const r=_ap.apply(this,arguments); try{ document.querySelectorAll('#toc .toc-s[data-toc]').forEach(b=>{ const n=PSET.size ? ITEMS.filter(i=>i.s===b.dataset.toc && PSET.has(i.p)).length : 1; b.classList.toggle('pdim', PSET.size>0 && n===0); }); }catch(e){} return r; }; }
