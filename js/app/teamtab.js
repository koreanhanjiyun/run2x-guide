/* ============================================================
   팀 탭 (A4·A5·A6·C11·H3·H10)
   - 진행 현황: 보는 시즌 · 파트별 요약 · 단계×파트 표 · 착수 가능/선행 경고/제외 영향/최근 변경/최근 논의/팀 값 현황 · 항목 목록(편집자는 상태 변경)
   - 시즌 요약: 진행 표 + 우리 팀 값 + 논의를 자동으로 모은 읽기 전용 페이지 (인쇄 가능)
   - 팀원·계정: 로그인 · 내 팀 · 가입 · 초대 · 팀원 · 나가기 · 플랫폼 문의 (team.js 가 그림)
   - 팀 설정(회장): 이름·비밀번호 · 역할(회장/팀장/파트장/팀원) · 차단 · 백업 · 위험 구역 (team.js 가 그림)
   - 회장 모드·관리 창은 없앰. 편집은 이 탭과 항목별 [편집]에서
   ============================================================ */
const TT = { sub: PREF('ttsub','progress'), cell: null, part: '', step: '', ctx: null };
const ttRole = () => !SH.on ? '이 브라우저' : SH.canAdmin ? '회장' : isLeadRole(SH.role) ? `${SH.role==='head'?'팀장':'파트장'} · ${partsShow(SH.parts).join('·')||'담당 없음'}` : '팀원';
const ttFmt = at => { const d=new Date(at); return isNaN(d)?'':`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

function renderTeamTab(soft){ window.__ttRendering=1; try{ ttRender(soft); } finally { window.__ttRendering=0; } }
function ttRender(soft){ const v=$('#v-team'); if(!v) return;
  if(!v.dataset.done){ v.dataset.done='1';
    v.innerHTML=`<header class="top tt-head"><span class="eyebrow">팀</span><h1 class="tt-title">팀</h1><p class="lede tt-sub"></p><div class="tt-seasonw"></div></header>
      <nav class="tt-nav" role="tablist" aria-label="팀 화면">
        <button type="button" role="tab" data-tts="progress">진행 현황</button>
        <button type="button" role="tab" data-tts="summary">시즌 요약</button>
        <button type="button" role="tab" data-tts="score">대회 점수</button>
        <button type="button" role="tab" data-tts="account">팀원 · 계정</button>
        <button type="button" role="tab" data-tts="settings" hidden>팀 설정</button>
      </nav>
      <section class="tt-pane" data-ttp="progress"></section>
      <section class="tt-pane" data-ttp="summary"></section>
      <section class="tt-pane" data-ttp="score"></section>
      <section class="tt-pane" data-ttp="account"><div id="teamPanel" class="tt-acct"><p class="muted">불러오는 중…</p></div></section>
      <section class="tt-pane" data-ttp="settings"><div class="adm-tm"></div></section>`;
  }
  const c=TT.ctx, member = SH.on || (c && c.state==='member');
  const nav=v.querySelector('.tt-nav'); nav.querySelector('[data-tts=settings]').hidden = !(SH.on && SH.canAdmin);
  nav.querySelectorAll('[data-tts=progress],[data-tts=summary]').forEach(b=>{ b.hidden = !!(window.Backend && Backend.kind()==='firebase' && !member); });
  const nolog = !member && !!(window.Backend && Backend.kind()==='firebase'); nav.classList.toggle('nolog', nolog);
  let sub=TT.sub; if(nolog && !TT.picked) sub='account'; const btn=nav.querySelector(`[data-tts="${sub}"]`); if(!btn || btn.hidden) sub = (nolog || nav.querySelector('[data-tts=progress]').hidden ? 'account' : 'progress');
  nav.querySelectorAll('[data-tts]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.tts===sub)));
  v.querySelectorAll('.tt-pane').forEach(p=>{ p.hidden = p.dataset.ttp!==sub; });
  v.querySelector('.tt-title').textContent = c && c.teamName ? `팀 ${c.teamName}` : (SH.on ? '팀' : (window.Backend && Backend.kind()==='firebase' ? '팀' : '진행 기록 (이 브라우저)'));
  v.querySelector('.tt-sub').innerHTML = member || !(window.Backend && Backend.kind()==='firebase')
    ? `<b>${esc(SEASON)} 시즌</b>${viewingOther()?` 보는 중 · 팀의 이번 시즌 ${esc(TEAM_SEASON)}`:''} · 내 역할: ${esc(ttRole())}`
    : '로그인하고 팀에 가입하면 팀의 진행 현황과 시즌 요약을 볼 수 있습니다.';
  const sw=v.querySelector('.tt-seasonw'); sw.innerHTML = (member || !(window.Backend && Backend.kind()==='firebase')) ? ttSeasonBar() : '';
  if(sub==='progress') ttProgress(v.querySelector('[data-ttp=progress]'));
  if(sub==='summary') ttSummary(v.querySelector('[data-ttp=summary]'));
  if(sub==='score'){ const sp=v.querySelector('[data-ttp=score]'); if(!sp.dataset.done && typeof fsScoreHTML==='function'){ sp.dataset.done='1'; sp.innerHTML=fsScoreHTML(); } try{ renderRecords(); }catch(e){} }
  if(sub==='account' && !soft && window.__ttAccount) window.__ttAccount();
  if(sub==='settings' && !soft && window.__ttSettings) window.__ttSettings();
}
function ttShow(sub){ TT.sub=sub; TT.picked=1; SETP('ttsub',sub); if(TAB!=='team'){ pushHist(); showTab('team'); } else renderTeamTab(); window.scrollTo({top:0,behavior:'instant'}); }

const SN_SVG = [-1,1].map(d=>`<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="${d<0?'M10 3 5 8l5 5':'M6 3l5 5-5 5'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
/* ---------- 보는 시즌 (H3: 팀 탭 모든 화면 공통, 제목 아래) ---------- */
function ttSeasonBar(){ return `<div class="tt-season" data-ttseason>
      <span class="sec-label">보는 시즌</span>
      <span class="sn-nav"><button type="button" class="sn-prev tt-sn" data-ttsn="-1" aria-label="이전 시즌" title="이전 시즌">${SN_SVG[0]}</button><b class="tt-sv">${esc(SEASON)} 시즌</b><button type="button" class="sn-next tt-sn" data-ttsn="1" aria-label="다음 시즌" title="다음 시즌">${SN_SVG[1]}</button></span>
      <span class="muted">팀의 이번 시즌: <b>${esc(TEAM_SEASON)}</b>${viewingOther()?` · <button type="button" class="lnk" data-sn="back">${esc(TEAM_SEASON)} 시즌으로 돌아가기</button>`:''}</span>
      <span class="muted tt-hint">‹ ›는 내 화면에서만 바뀌고, 진행 현황·시즌 요약·팀원 명단이 모두 그 시즌으로 바뀝니다.${SH.on && SH.canAdmin ? ' 팀의 이번 시즌을 바꾸는 것은 팀 설정에서 합니다.' : ''}</span>
    </div>`; }

/* ---------- 진행 현황 ---------- */
function ttCnt(ids){ const d=ids.filter(i=>STATUS[i]==='done').length, g=ids.filter(i=>STATUS[i]==='doing').length, k=ids.filter(i=>STATUS[i]==='skip').length; return {d,g,k,t:ids.length-d-g-k,n:ids.length}; }
function ttBar(c){ const n=(c.n-c.k)||1; return `<span class="pbar2" title="완료 ${c.d} · 진행 중 ${c.g} · 예정 ${c.t}${c.k?` · 제외 ${c.k}`:''}"><i class="d" style="width:${c.d/n*100}%"></i><i class="g" style="width:${c.g/n*100}%"></i></span>`; }
function ttProgress(el){
  const all=ITEMS.map(i=>i.id), parts=PARTS.map(p=>p[0]).filter(p=>ITEMS.some(i=>i.p===p)), editor=canEditAny();
  const ready=all.filter(id=>!STATUS[id] && admPreds(id).every(admOk)), warn=all.filter(id=>STATUS[id]==='doing' && admPreds(id).some(x=>!admOk(x))), skips=all.filter(id=>STATUS[id]==='skip');
  const vids=all.filter(id=>ACT[id] && ACT[id][2] && ACT[id][2].length), miss=vids.filter(id=>!(VAL[id]&&VAL[id].s&&valFilled(VAL[id].s[SEASON])));
  const tot=ttCnt(all);
  /* 단계 × 파트 표 */
  const cellIds=(s,p)=>ITEMS.filter(i=>i.s===s && i.p===p).map(i=>i.id);
  /* 저장 전 변경이 들어 있는 칸: 주황 점선 + 점 (펼침을 접어도 어디를 바꿨는지 보임) */
  const hasPend = ids => typeof stPending==='function' && ids.some(stPending);
  const mat=`<div class="tt-matw"><table class="tt-mat"><thead><tr><th class="tt-sc">단계</th>${parts.map(p=>`<th class="tt-ph${TT.cell==='*|'+p?' sel':''}${hasPend(all.filter(id=>IT[id].p===p))?' pend':''}" data-ttcell="*|${p}" title="${p} 항목 모두 보기"><span class="dot" style="background:${pc(p)}"></span>${p}</th>`).join('')}<th>전체</th></tr></thead><tbody>${xrowAt('*')}
    ${STEPS.map(s=>{ const row=ITEMS.filter(i=>i.s===s.id).map(i=>i.id); const rc=ttCnt(row);
      return `<tr><th class="tt-sc"><button type="button" class="lnk" data-stepgo="${s.id}">${s.id}</button> <span class="muted">${esc(s.t.replace('★ ',''))}</span></th>${parts.map(p=>{ const ids=cellIds(s.id,p); if(!ids.length) return '<td class="tt-e"></td>'; const c=ttCnt(ids); const done=(c.n-c.k)>0 && c.d===(c.n-c.k);
        const sel = TT.cell===s.id+'|'+p;
        return `<td class="tt-c${done?' done':''}${c.g?' doing':''}${sel?' sel':''}${hasPend(ids)?' pend':''}" data-ttcell="${s.id}|${p}" title="${s.id} · ${p}: 완료 ${c.d} · 진행 중 ${c.g} · 예정 ${c.t}${c.k?` · 제외 ${c.k}`:''}"><b>${c.d}</b>/${c.n-c.k}${c.k?`<i>-${c.k}</i>`:''}</td>`; }).join('')}<td class="tt-c tt-rt${(rc.n-rc.k)>0 && rc.d===(rc.n-rc.k)?' done':''}${rc.g?' doing':''}${TT.cell===s.id+'|*'?' sel':''}${hasPend(row)?' pend':''}" data-ttcell="${s.id}|*" title="${s.id} 전체: 완료 ${rc.d} · 진행 중 ${rc.g} · 예정 ${rc.t}${rc.k?` · 제외 ${rc.k}`:''}">${rc.d}/${rc.n-rc.k}</td></tr>${xrowAt(s.id)}`; }).join('')}
  </tbody></table></div>`;
  /* 펼침 줄 (2026-11-25): 칸·파트 머리·전체 칸을 누르면 그 줄 바로 아래에 해당 항목이 펼쳐짐. 예전 맨 아래 목록을 대신함 */
  function xIds(k){ const [s,p]=k.split('|'); return all.filter(id=>(s==='*'||IT[id].s===s) && (p==='*'||IT[id].p===p)).sort(admOrd); }
  function xTitle(k){ const [s,p]=k.split('|'), st=STEPS.find(x=>x.id===s); const sn=st?`${st.id} ${esc(st.t.replace('★ ',''))}`:''; return s==='*' ? `${p} 항목 모두` : p==='*' ? `${sn} · 모든 파트` : `${sn} · ${p}`; }
  function xrowAt(s){ if(!TT.cell || TT.cell.split('|')[0]!==s) return ''; const ids=xIds(TT.cell);
    const rows=ids.map(id=>{ const v=STATUS[id]||'todo', can=canEditItem(id), mt=SH.meta&&SH.meta[id];
      return `<div class="tt-row"><span class="tt-code">${IT[id].s}</span><button type="button" class="lnk tt-name" data-goto="${id}">${IT[id].n}</button><span class="tt-part"><span class="dot" style="background:${pc(IT[id].p)}"></span>${IT[id].p}</span>
        <span class="tt-st">${can ? `<span class="stctl" data-stid="${id}">${['todo','doing','done','skip'].map(k=>`<button class="stbtn st-${k}" data-st="${k}" aria-pressed="${v===k}">${ST_LABEL[k]}</button>`).join('')}</span>` : `<span class="ipill st-${v}">${v==='skip'?'제외':ST_LABEL[v]}</span>`}</span>
        <span class="muted tt-meta">${mt&&mt.at?ttFmt(mt.at):''}</span></div>`; }).join('');
    return `<tr class="tt-xrow"><td colspan="${parts.length+2}"><i class="tt-xp" aria-hidden="true"></i><div class="tt-x"><div class="tt-xh"><b>${xTitle(TT.cell)}</b><span class="adm-n">${ids.length}</span>${editor?`<span class="muted tt-xn">바꾼 상태는 아래 막대의 [모두 저장]을 눌러야 팀에 저장됩니다.${isLeadRole(SH.role)&&!SH.canAdmin?' 팀장·파트장은 담당 파트만 바꿀 수 있습니다.':''}</span>`:''}<button type="button" class="tt-xx" data-ttclear aria-label="닫기" title="닫기 (Esc)">×</button></div><div class="tt-list">${rows||'<p class="adm-empty">해당하는 항목이 없습니다.</p>'}</div></div></td></tr>`; }
  const qs=Object.entries(QA||{}).filter(([k,q])=>isTalk(q) && !q.removed && IT[q.item]).sort((x,y)=>String(y[1].at).localeCompare(String(x[1].at))).slice(0,8);
  const box=(t,hint,body,n)=>`<section class="tt-card"><h3 aria-level="2">${t}${n!=null?` <span class="adm-n">${n}</span>`:''}</h3>${hint?`<p class="adm-hint">${hint}</p>`:''}${body}</section>`;
  el.innerHTML = `
    <section class="tt-card tt-matc"><h3 aria-level="2">단계 × 파트 <span class="muted">칸 · 파트 이름 · 전체 칸을 누르면 그 아래에 항목이 펼쳐집니다</span></h3>${mat}</section>
    <div class="tt-top">
      <section class="tt-card tt-sum"><h3 aria-level="2">진행 요약 <span class="muted">${tot.d}/${tot.n-tot.k} 완료${tot.g?` · 진행 중 ${tot.g}`:''}${tot.k?` · 제외 ${tot.k}`:''}</span></h3>
        <div class="tt-bars"><div class="adm-pr"><span class="adm-pl"><b>전체</b></span>${ttBar(tot)}<span class="adm-pv">${tot.d}/${tot.n-tot.k}</span></div>${parts.map(p=>{ const c=ttCnt(all.filter(id=>IT[id].p===p)); return `<div class="adm-pr"><span class="adm-pl"><span class="dot" style="background:${pc(p)}"></span>${p}</span>${ttBar(c)}<span class="adm-pv">${c.d}/${c.n-c.k}</span></div>`; }).join('')}</div></section>
      <div class="tt-cards">
        ${box('착수 가능','받는 정보가 모두 완료·제외인데 아직 예정인 항목', admList(ready,'없습니다.',12), ready.length)}
        ${box('선행 미완료 경고','진행 중인데 선행 항목이 아직 끝나지 않은 항목', warn.length?`<div class="adm-list">${[...warn].sort(admOrd).slice(0,12).map(id=>admLnk(id, `미완료 선행: ${admPreds(id).filter(x=>!admOk(x)).map(x=>IT[x].n).join(', ')}`)).join('')}</div>`:'<p class="adm-empty">없습니다.</p>', warn.length)}
        ${box('제외 영향','제외한 항목과 그 결과를 받는 항목', skips.length?`<div class="adm-list">${[...skips].sort(admOrd).map(id=>{ const s=admSuccs(id).filter(x=>STATUS[x]!=='skip'); return admLnk(id, s.length?'영향: '+s.map(x=>IT[x].n).join(', '):'영향받는 항목 없음'); }).join('')}</div>`:'<p class="adm-empty">제외한 항목이 없습니다.</p>', skips.length)}
        ${box('최근 변경','', '<div data-l="recent"></div>')}
        ${box('최근 논의','', qs.length?`<div class="adm-list">${qs.map(([k,q])=>`<button class="lnk adm-it adm-qa" data-tkgo="${q.item}" data-qid="${esc(k)}"><span class="adm-code">${IT[q.item].s}</span><span class="adm-qk">${esc(IT[q.item].n)}</span><span class="adm-qt">${q.parent?'↳ ':''}${esc((q.text||'').slice(0,40))}</span></button>`).join('')}</div>`:'<p class="adm-empty">없습니다.</p>')}
        ${box('우리 팀 값 입력 현황', `입력 ${vids.length-miss.length} / ${vids.length}`, admList(miss,'모두 입력했습니다.',12), miss.length)}
      </div>
    </div>
`;
  admRecent(el.querySelector('[data-l="recent"]'));
  try{ refreshStatus(); }catch(e){}
  if(TT.cell) requestAnimationFrame(()=>{ try{ ttXPoint(); }catch(e){} });
}

/* ---------- 시즌 요약 (A5) ---------- */
function ttSummary(el){ const c=TT.ctx, all=ITEMS.map(i=>i.id), tot=ttCnt(all), parts=PARTS.map(p=>p[0]).filter(p=>ITEMS.some(i=>i.p===p));
  const talk=id=>Object.values(QA||{}).filter(q=>isTalk(q) && q.item===id && !q.removed);
  const valTxt=id=>{ const r=VAL[id], d=r&&r.s&&r.s[SEASON]; if(!d || !valFilled(d)) return ''; return Object.entries(d).filter(([l,o])=>o&&(o.v||o.why)).map(([l,o])=>`<div><b>${esc(l)}</b> ${esc(o.v||'—')}${o.why?` <span class="muted">(${esc(o.why)})</span>`:''}</div>`).join(''); };
  el.innerHTML = `<div class="tt-sumbar"><span class="muted">이 시즌의 진행 상태 · 우리 팀 값 · 논의를 모은 읽기 전용 요약 (시즌은 위 ‹ ›, 논의는 눌러서 펼침)</span><button type="button" class="btn small" data-ttprint>인쇄 · PDF 저장</button></div>
    <article class="tt-report">
      <h2>${c&&c.teamName?esc(c.teamName)+' · ':''}${esc(SEASON)} 시즌 요약</h2>
      <p class="muted">만든 날 ${new Date().toLocaleDateString('ko-KR')} · 완료 ${tot.d} / ${tot.n-tot.k}${tot.g?` · 진행 중 ${tot.g}`:''}${tot.k?` · 제외 ${tot.k}`:''}</p>
      <table class="kvt tt-rep-parts"><tr>${parts.map(p=>`<th>${p}</th>`).join('')}</tr><tr>${parts.map(p=>{ const x=ttCnt(all.filter(id=>IT[id].p===p)); return `<td class="${(x.n-x.k)>0 && x.d===(x.n-x.k)?'done':''}${x.g?' doing':''}">${x.d}/${x.n-x.k}</td>`; }).join('')}</tr></table>
      ${STEPS.map(s=>{ const its=ITEMS.filter(i=>i.s===s.id).sort((a,b)=>((ACT[a.id]||[99])[0])-((ACT[b.id]||[99])[0])); if(!its.length) return '';
        const sc=ttCnt(its.map(i=>i.id)); return `<h3 class="tt-rep-h"><span>${s.id} ${esc(s.t.replace('★ ',''))}</span><span class="tt-rep-cnt${(sc.n-sc.k)>0 && sc.d===(sc.n-sc.k)?' done':''}">${ttBar(sc)}완료 ${sc.d}/${sc.n-sc.k}${sc.g?` · 진행 중 ${sc.g}`:''}</span></h3><table class="kvt tt-rep"><thead><tr><th>항목</th><th>파트</th><th>상태</th><th>우리 팀 값</th><th>논의</th></tr></thead><tbody>${its.map(i=>{ const v=STATUS[i.id]||'todo', t=talk(i.id);
          return `<tr><td>${i.n}</td><td>${i.p}</td><td class="st-${v}"><span class="ipill st-${v}">${v==='skip'?'제외':ST_LABEL[v]}</span></td><td>${valTxt(i.id)||'<span class="muted">—</span>'}</td><td class="tt-rep-qc">${t.length?ttTalkCell(t):'<span class="muted">—</span>'}</td></tr>`; }).join('')}</tbody></table>`; }).join('')}
    </article>`; }

/* 논의 칸: '글 n개 · 마지막 날짜 · 첫 줄 40자' 한 줄 + 펼치면 전체(답글 포함). 인쇄할 때는 개수와 최근 글 1개만 */
function ttTalkCell(t){ const s=[...t].sort((a,b)=>String(a.at).localeCompare(String(b.at))), last=s[s.length-1], cut=(x,n)=>{ x=String(x||'').replace(/\s+/g,' '); return x.length>n?x.slice(0,n)+'…':x; };
  const head=`글 ${t.length}개 · ${ttFmt(last.at).split(' ')[0]||''} · ${esc(cut(last.text,40))}`;
  /* 인쇄에는 글 개수만 (내용은 화면에서만) */
  return `<span class="tt-rq-n">글 ${t.length}개</span><details class="tt-rep-q"><summary><span class="tt-rq-h">${head}</span></summary><div class="tt-rep-qa">${s.map(q=>`<div class="${q.parent?'r':''}">${q.parent?'↳ ':''}${esc(cut(q.text,300))} <span class="muted">${ttFmt(q.at)}</span></div>`).join('')}</div></details>`; }

/* ---------- 지난 시즌을 보는 중 배너 (H3·H9: 주의 = 주황) ---------- */
let SB_LAST='';
function paintSeasonBanner(){ let b=$('#seasonBanner'); const on = viewingOther();
  /* 탭 바로 아래(모든 탭 공통)에 붙임. 예전엔 페이지 맨 끝에 붙어 맨 아래까지 내려야 보였음 */
  if(!b){ b=document.createElement('div'); b.id='seasonBanner'; b.setAttribute('role','status'); }
  const nav=document.querySelector('nav.tabs'); if(nav && b.previousElementSibling!==nav) nav.after(b);
  b.hidden=!on; const root=document.documentElement;
  if(!on){ root.classList.remove('sb-on'); root.style.removeProperty('--tabh'); SB_LAST=''; return; }
  b.innerHTML=`<span><b>${esc(SEASON)} 시즌</b>을 보는 중 · 설계·팀 탭 모두 이 시즌 기록입니다 · 팀의 이번 시즌은 ${esc(TEAM_SEASON)}${(SH.on && !SH.canAdmin)?' · 지난 시즌 기록은 회장만 고칠 수 있습니다':''}</span><button type="button" class="btn small" data-sn="back">${esc(TEAM_SEASON)} 시즌으로 돌아가기</button>`;
  /* 띠 높이만큼 탭 높이(--tabh)를 늘려 목차·경로 줄·고정 제목줄이 띠 아래에 오게 */
  root.classList.add('sb-on'); root.style.setProperty('--tabh', ((nav?nav.offsetHeight:50) + b.offsetHeight) + 'px');
  if(SB_LAST!==SEASON){ if(SB_LAST!=='' || window.__sbUser) try{ toast(`설계·팀 탭이 <b>${esc(SEASON)} 시즌</b> 기록으로 바뀌었습니다.`); }catch(e){} SB_LAST=SEASON; } }
/* ‹ › 로 직접 바꾼 순간에만 알림 (처음 열 때 지난 시즌이 기억돼 있으면 알림 없이 띠만) */
document.addEventListener('click', e=>{ if(e.target.closest('[data-ttsn],[data-sn]')) window.__sbUser=1; }, true);
{ const _as=afterSeason; afterSeason=function(){ const r=_as.apply(this,arguments); try{ paintSeasonBanner(); if(TAB==='team') renderTeamTab(true); }catch(e){} return r; }; }
{ const _uc=updSeasonChip; updSeasonChip=function(){ const r=_uc.apply(this,arguments); try{ paintSeasonBanner(); }catch(e){} return r; }; }

/* ---------- 다시 그리기: 진행 상태·팀 값·논의가 바뀌면 (팀 탭이 열려 있을 때만) ---------- */
let TTRAF=0; const ttSoon=()=>{ if(TAB!=='team' || TTRAF || window.__ttRendering) return; TTRAF=requestAnimationFrame(()=>{ TTRAF=0; const a=document.activeElement; if(a && a.closest && a.closest('#v-team select')) return; renderTeamTab(true); }); };
{ const _rs=refreshStatus; refreshStatus=function(){ const r=_rs.apply(this,arguments); ttSoon(); return r; }; }
{ const _rv=refreshVals; refreshVals=function(){ const r=_rv.apply(this,arguments); ttSoon(); return r; }; }
{ const _rq=renderQA; renderQA=async function(){ const r=await _rq.apply(this,arguments); ttSoon(); return r; }; }

document.addEventListener('click', e=>{
  const s=e.target.closest('[data-tts]'); if(s){ e.preventDefault(); TT.sub=s.dataset.tts; TT.picked=1; SETP('ttsub',TT.sub); renderTeamTab(); return; }
  const c=e.target.closest('[data-ttcell]'); if(c){ e.preventDefault(); ttX(c.dataset.ttcell); return; }
  if(e.target.closest('[data-ttclear]')){ e.preventDefault(); ttX(null); return; }
  const sn=e.target.closest('[data-ttsn]'); if(sn){ e.preventDefault(); const d=+sn.dataset.ttsn; setSeason(String(+SEASON+d), d); return; }
  if(e.target.closest('[data-ttprint]')){ e.preventDefault(); document.body.classList.add('print-report'); try{ window.print(); }finally{ setTimeout(()=>document.body.classList.remove('print-report'), 500); } return; }
});
/* 펼침 줄 열기·바꾸기·닫기: 높이가 0에서 커지며 열리고(260 ms), 닫을 때 거꾸로. 꼭지는 누른 칸 가운데를 가리킴. 다 안 보이면 펼침이 보이게 스크롤 */
function ttXAnim(open){ const x=document.querySelector('#v-team .tt-x'); if(!x || !x.animate) return null; const h=x.offsetHeight;
  return x.animate(open ? [{height:'0px',opacity:0},{height:h+'px',opacity:1}] : [{height:h+'px',opacity:1},{height:'0px',opacity:0}], {duration:open?260:200, easing:open?'cubic-bezier(.25,.7,.5,1)':'cubic-bezier(.5,0,.75,.3)'}); }
function ttXPoint(){ const x=document.querySelector('#v-team .tt-x'); if(!x||!TT.cell) return; const c=document.querySelector(`#v-team .tt-mat [data-ttcell="${CSS.escape(TT.cell)}"]`); if(!c) return;
  const td=x.parentNode, a=c.getBoundingClientRect(), b=td.getBoundingClientRect(); td.style.setProperty('--xp', Math.max(20, Math.min(b.width-20, a.left+a.width/2-b.left))+'px'); }
function ttX(k){ const cur=TT.cell; if(k===cur) k=null;
  const go=()=>{ TT.cell=k; renderTeamTab(true); if(!k) return; ttXPoint(); const a=ttXAnim(true);
    const x=document.querySelector('#v-team .tt-x'); if(!x) return; const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
    const end=()=>{ const r=x.getBoundingClientRect(); if(r.bottom>innerHeight-16 || r.top<tabh) smoothScrollTo(()=>Math.min(x.getBoundingClientRect().top+scrollY-tabh-120, x.getBoundingClientRect().bottom+scrollY-innerHeight+24 > 0 ? x.getBoundingClientRect().bottom+scrollY-innerHeight+24 : scrollY)); };
    if(a) a.onfinish=end; else end(); };
  if(cur){ const a=ttXAnim(false); if(a){ a.onfinish=go; return; } }
  go(); }
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && TAB==='team' && TT.cell && !(typeof TR!=='undefined' && TR)) ttX(null); });
addEventListener('resize', ()=>{ if(TAB==='team') ttXPoint(); });
/* 팀 정보가 준비되면 팀 탭 머리글·메뉴 갱신 */
if(window.Backend && Backend.kind()==='firebase'){ Backend.Team.ctx().then(c=>{ TT.ctx=c; if(TAB==='team') renderTeamTab(true); }).catch(()=>{}); }
{ const _am=applyModes; applyModes=function(){ const r=_am.apply(this,arguments); try{ if(TAB==='team') renderTeamTab(true); }catch(e){} return r; }; }

/* 저장 막대의 '바꾼 항목' 줄을 누르면: 진행 현황 화면이면 그 칸을 펼치고 그 줄로 스크롤 · 깜빡임, 아니면 설계 탭의 그 항목으로 */
function ttGoPend(id){ if(!IT[id]) return;
  const onProg = TAB==='team' && !!document.querySelector('#v-team [data-ttp=progress]:not([hidden]) .tt-mat');
  if(!onProg){ vtItem(id, null); return; }
  const key=IT[id].s+'|'+IT[id].p;
  const show=()=>{ const r=document.querySelector(`#v-team .tt-x .stctl[data-stid="${CSS.escape(id)}"]`); const row=r && r.closest('.tt-row'); if(!row) return;
    const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
    smoothScrollTo(()=>row.getBoundingClientRect().top+scrollY-Math.max(tabh+80, innerHeight/2-40));
    row.classList.remove('tt-flash'); void row.offsetWidth; row.classList.add('tt-flash'); };
  if(TT.cell===key) show(); else { ttX(key); setTimeout(show, 320); } }
