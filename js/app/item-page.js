/* ============================================================
   설계 탭 항목 화면 (2026-11-21 협의, docs/DESIGN.md 6절)
   - 항목을 누르면 머리띠 · 목차 · 오른쪽 패널은 그대로, 본문만 항목 화면으로 바뀜. 주소 #it-<id>
   - 브라우저 뒤로 · 앞으로 가기로 개요 ↔ 항목 화면 (tabs-nav.js navState 의 ip)
   - 2단: 위(경로 · 제목 · 왜 하나 · 핵심) / 왼쪽(배경 · 상세 설명 · 논의) / 오른쪽(우리 팀 값 · 진행 상태 · 연결된 항목 · 이전 다음)
   - 목차: 항목 화면이면 그 단계의 항목 이름까지 펼침 (지금 단계 하나만)
   - 본문 그리기는 기존 itemBodyHTML + ITEM_HOOKS 를 그대로 씀 (host = .ipage[data-item] > .dbody)
   ============================================================ */
let IPAGE = null;
const ipItems = sid => ITEMS.filter(i=>i.s===sid).sort((a,b)=>((ACT[a.id]||[99])[0])-((ACT[b.id]||[99])[0]));
const ipOrder = () => STEPS.flatMap(s=>ipItems(s.id).map(i=>i.id));

/* 개요 줄: 항목 이름 아래 핵심 한 줄 ('흐름만 보기'를 합침) */
function ipCoreLines(){ document.querySelectorAll('#step-list details.item[data-item]>summary').forEach(sm=>{ if(sm.querySelector('.icore')) return;
  const a=ACT[sm.parentElement.dataset.item]; if(!a||!a[1]) return; const s=document.createElement('span'); s.className='icore'; s.innerHTML=a[1]; sm.appendChild(s); }); }

function ipHost(){ let h=$('#ipage'); if(h) return h; h=document.createElement('div'); h.id='ipage'; h.hidden=true; $('#v-steps').appendChild(h); return h; }

function ipRender(id){ const it=IT[id], st=STEPS[SIDX[it.s]], host=ipHost();
  const ord=ipOrder(), k=ord.indexOf(id), prev=ord[k-1], next=ord[k+1];
  const ins=EDGES.filter(e=>e[1]===id), outs=EDGES.filter(e=>e[0]===id);
  const link = x => `<button type="button" class="lnk" data-goto="${x}">${IT[x].n}</button>`;
  host.innerHTML = `<div class="ip-top"><nav class="ip-path" aria-label="경로"><button type="button" class="lnk" data-ipback="1">설계</button><span>›</span><button type="button" class="lnk" data-ipstep="${st.id}">${st.id} ${plainT(st.t)}</button><span>›</span><span class="ip-cur">${it.n}</span></nav>
      <h1 class="ip-h">${it.n}</h1><div class="ip-meta">${chip(it.p)}${it.c?'<span class="badge b-card">상세</span>':''}<button class="btn small gbtn" data-graph="${id}">연결도에서 보기</button></div></div>
    <div class="ipage" data-item="${id}"><div class="dbody" data-lazy="1"></div></div>
    <div class="ip-cols"><div class="ip-main"></div><aside class="ip-side"></aside></div>`;
  const d=host.querySelector('.ipage'); fillItem(d);
  /* 2단으로 나눠 담기: 위 = 왜 하나 · 핵심, 오른쪽 = 진행 상태 · 우리 팀 값 · 팀 설계값, 왼쪽 = 나머지 */
  const b=d.querySelector(':scope>.dbody'), top=host.querySelector('.ip-top'), main=host.querySelector('.ip-main'), side=host.querySelector('.ip-side');
  [...b.children].forEach(el=>{ if(el.matches('.gpath, .actbox')) top.appendChild(el); else if(el.matches('.vrow, .tval, .stbox')) side.appendChild(el); else if(!el.matches('.symbox')) main.appendChild(el); });
  side.insertAdjacentHTML('beforeend', `<div class="ip-rel"><div class="sec-label">연결된 항목</div>${ins.length?`<p class="ip-rl"><b>받는 정보</b>${ins.map(e=>`${link(e[0])} <span class="muted">${e[2]}</span>`).join('<br>')}</p>`:''}${outs.length?`<p class="ip-rl"><b>넘기는 결과</b>${outs.map(e=>`${link(e[1])} <span class="muted">${e[2]}</span>`).join('<br>')}</p>`:''}${!ins.length&&!outs.length?'<p class="muted">없음</p>':''}</div>
    <nav class="ip-pn" aria-label="이전 · 다음 항목"><div class="sec-label">이전 · 다음 항목</div>${prev?`<button type="button" class="lnk ip-pv" data-goto="${prev}">‹ ${IT[prev].n}</button>`:''}${next?`<button type="button" class="lnk ip-nx" data-goto="${next}">${IT[next].n} ›</button>`:''}</nav>`);
  const sym=b.querySelector(':scope>.symbox'); if(sym) side.appendChild(sym);   /* 기호 표: 오른쪽 맨 아래, 접힘 (본문을 읽으며 옆에서 찾아봄) */
  /* 접지 않는 본문 칸은 펼침(toggle) 이벤트가 없으므로 여기서 용어 풀이를 붙임 */
  try{ main.querySelectorAll('.qsec > .qb').forEach(x=>annotate(x)); }catch(e){}
  ipFitFigs(main);
  /* 그린 뒤 빈 껍데기는 지움. 논의 칸(.tk)은 data-titem 으로 찾으므로 옮겨도 됨 */
  d.remove();
}

/* 그림 글자를 본문과 같은 13 px 로: 그림마다 가장 많이 쓴 글자 크기(그림 좌표 단위)가 화면에서 13 px 가 되도록 최대 폭을 정함
   (FIGS 기본은 viewBox 폭 × 1.15 라 글자가 15 px 로 커졌음). 칸 폭보다 넓어야 하면 칸 폭에 맞춰 줄어듦 */
function ipFitFigs(root){ root.querySelectorAll('.fig figure>svg').forEach(svg=>{ const vb=svg.viewBox && svg.viewBox.baseVal; if(!vb || !vb.width) return;
  const cnt={}; svg.querySelectorAll('text:not(.mjt)').forEach(t=>{ if(t.closest('tspan')) return; const f=parseFloat(t.getAttribute('font-size')||getComputedStyle(t).fontSize); if(f>0) cnt[f]=(cnt[f]||0)+(t.textContent.length||1); });
  const base=+Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]; if(!(base>0)) return;
  svg.style.maxWidth = Math.round(vb.width*13/base)+'px'; }); }

function ipShow(id){ if(!IT[id]) return; IPAGE=id; ipRender(id);
  document.body.classList.add('ip-on'); ipHost().hidden=false;
  try{ history.replaceState(navState(), '', '#it-'+id); }catch(e){}
  ipToc(); CRUMB={step:null,item:null}; paintCrumb(); setTitle(); }
function ipClose(){ if(!IPAGE) return; IPAGE=null; document.body.classList.remove('ip-on'); const h=$('#ipage'); if(h){ h.hidden=true; h.innerHTML=''; }
  try{ if(TAB==='steps') history.replaceState(navState(), '', '#steps'); }catch(e){} ipToc(); setTitle(); }

/* 목차: 항목 화면이면 그 단계 아래에 항목 이름들 (지금 단계 하나만) */
function ipToc(){ const t=$('#toc'); if(!t) return; t.querySelectorAll('.toc-its').forEach(x=>x.remove()); t.querySelectorAll('.toc-s').forEach(b=>b.classList.remove('cur'));
  if(!IPAGE) { try{ spyToc(); }catch(e){} return; }
  const sid=IT[IPAGE].s, b=t.querySelector(`.toc-s[data-toc="${sid}"]`); if(!b) return; b.classList.add('cur');
  const box=document.createElement('div'); box.className='toc-its';
  box.innerHTML=ipItems(sid).map(i=>`<button type="button" class="toc-it${i.id===IPAGE?' on':''}" data-goto="${i.id}">${i.n}</button>`).join('');
  b.after(box); const hh=box.scrollHeight; box.style.transitionDuration=motionMs(hh)+'ms';   /* 펼치는 높이에 맞춘 시간 */
  requestAnimationFrame(()=>{ box.classList.add('open'); const on=box.querySelector('.on'); if(on){ const r=on.getBoundingClientRect(), tr=t.getBoundingClientRect(); if(r.top<tr.top+40||r.bottom>tr.bottom-10) t.scrollTop += r.top-tr.top-tr.height/2; } }); }

/* 열기: 예전 openItem(펼쳐서 스크롤)을 항목 화면으로 */
openItem = function(id){ if(!IT[id]) return; pushHist(); setVM('full'); IPKEEP=true; showTab('steps', true); IPKEEP=false; ipShow(id); window.scrollTo({top:0, behavior:'instant'}); };
let IPKEEP=false;
/* 설계 탭을 다시 누르거나 다른 탭으로 가면 개요로 (뒤로 가기는 popstate 에서 ip 로 되살림) */
{ const _st=showTab; showTab=function(t, keep){ const r=_st.apply(this, arguments); if(!IPKEEP && IPAGE) ipClose(); return r; }; }
window.addEventListener('popstate', e=>{ const h=e.state; if(!h || !h.tab) return; if(h.tab==='steps' && h.ip){ if(h.ip!==IPAGE){ ipShow(h.ip); } requestAnimationFrame(()=>window.scrollTo({top:h.y||0, behavior:'instant'})); } else if(IPAGE) ipClose(); });

/* 개요 줄 · 목차 단계 · 경로 누름 */
document.addEventListener('click', e=>{
  const sm=e.target.closest('#step-list details.item>summary'); if(sm && !e.target.closest('button,a,input,.tk-cnt')){ e.preventDefault(); vtItem(sm.parentElement.dataset.item, sm.querySelector('.iname')); return; }
  if(e.target.closest('[data-ipback]')){ e.preventDefault(); if(IPAGE) ipBackTo(IT[IPAGE].s); return; }
  const ps=e.target.closest('[data-ipstep]'); if(ps){ e.preventDefault(); ipBackTo(ps.dataset.ipstep); return; }
}, true);
/* 항목 화면 → 개요의 그 단계 (경로 · 목차 단계 누름). 보던 항목 줄이 화면에 보이면 제목이 그 줄로 돌아감 */
function ipBackTo(sid){ const cur=IPAGE;
  vtGo('close', ()=>{ pushHist(); ipClose(); const st=$('#st-'+sid); if(st){ st.open=true; window.scrollTo({top:st.getBoundingClientRect().top+scrollY-tabH()-60, behavior:'instant'}); markHere(st); } },
    ()=>$('#ipage .ip-h'), ()=>cur && $(`#it-${cur}>summary .iname`)); }
/* 항목 열기 + 화면 전환: 항목 화면끼리는 순서대로 밀고(이전 · 다음), 그 밖에서는 누른 이름이 제목으로 이어짐.
   다른 코드가 부르는 openItem 은 그대로 즉시 (부른 뒤 바로 그 화면을 찾는 곳이 있음: learn.js openQ 등) */
function vtItem(id, src){ if(!IT[id]) return; const cur=(TAB==='steps')&&IPAGE;
  if(cur===id){ openItem(id); return; }
  if(cur){ const o=ipOrder(); vtGo(o.indexOf(id)<o.indexOf(cur)?'prev':'next', ()=>openItem(id)); return; }
  vtGo('open', ()=>openItem(id), src?()=>src:null, ()=>$('#ipage .ip-h')); }
/* 목차 단계 누름: 항목 화면이면 개요로 돌아가 그 단계로 */
{ const _gs=gotoStep; gotoStep=function(sid){ if(IPAGE){ ipBackTo(sid); return; } return _gs.apply(this, arguments); }; }
/* 스크롤에 따른 목차 강조는 개요에서만 */
{ const _sp=spyToc; spyToc=function(){ if(IPAGE) return; return _sp.apply(this, arguments); }; }
/* 브라우저 탭 제목 · 경로 띠: 항목 화면이면 항목 이름 */
{ const _f=findCrumb; findCrumb=function(){ if(IPAGE) return {step:null,item:null}; return _f.apply(this, arguments); }; }
{ const _t=setTitle; setTitle=function(){ if(TAB==='steps' && IPAGE){ const t=[plainT(IT[IPAGE].n), '설계', SITE].join(' · '); if(document.title!==t) document.title=t; return; } return _t.apply(this, arguments); }; }

/* 처음 열 때 주소가 #it-<id> 이면 그 항목 화면 */
function ipBoot(){ if(VMODE==='flow') setVM('full'); ipCoreLines(); const m=/^#it-(.+)$/.exec(location.hash); if(m && IT[m[1]]){ IPKEEP=true; showTab('steps', true); IPKEEP=false; ipShow(m[1]); } }
/* 주소를 직접 바꾸거나 #it- 링크를 누른 경우 (같은 문서 안 이동) */
window.addEventListener('hashchange', ()=>{ const m=/^#it-(.+)$/.exec(location.hash); if(m && IT[m[1]] && m[1]!==IPAGE) openItem(m[1]); });
