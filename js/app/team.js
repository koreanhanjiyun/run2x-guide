/* ============================================================
   팀·계정 (Firebase 저장소일 때만)
   - 상단 칩: 로그인 안 됨 / 팀 없음 / <팀> 연결됨 / 연결 안 됨
   - 칩을 누르면 팀 패널: 로그인, 팀 가입(이름+비밀번호)·만들기, 회장(비밀번호 변경·역할·내보내기), 플랫폼 문의
   - 항목별 논의 입력칸: 팀원이 아니면 안내 + 버튼
   - 초대 문구 복사(팀원 모두) / 팀 관리(팀원 관리·차단·비밀번호·백업·삭제)는 관리 창 "팀 관리" 칸
   - 개발자: 플랫폼 문의 처리 상태·문의 차단 (팀·계정 창)
   ============================================================ */
(function(){
  if(!window.Backend || Backend.kind()!=='firebase') return;
  const T = Backend.Team;
  let C = null;                       // 팀 상태 (불러온 뒤)
  const ROLE = {admin:'회장', head:'팀장', lead:'파트장', member:'팀원'};
  const RL = ['admin','head','lead','member'];
  const say = t => { try{ toast(t); }catch(e){} };
  const fail = (e, t) => { console.error(e); say(t || (Backend.denied(e) ? '권한이 없습니다.' : '처리하지 못했습니다. 잠시 후 다시 시도해 주십시오.')); };

  /* ---------- 칩 ---------- */
  /* 상태 칩 (H9): 초록=정상, 주황=주의(지난 시즌 보는 중·저장 안 한 변경·연결 끊김), 빨강=디버깅, 회색=로그인 전·팀 없음 */
  const CHIP = {
    anon:   {cls:'sc-wait', txt:'로그인', tip:'로그인 안 됨: 가이드와 계산기는 그대로 쓸 수 있습니다. 팀 데이터(진행 상태·팀 값·논의)는 로그인하고 팀원이 되면 보입니다. 눌러서 로그인.'},
    noteam: {cls:'sc-wait', txt:'팀 없음',  tip:'팀 없음: 팀 이름과 비밀번호로 가입하거나 새 팀을 만들면 팀 데이터를 쓸 수 있습니다. 눌러서 팀 가입.'},
    member: {cls:'sc-on',   txt:'연결됨',   tip:'연결됨: 팀과 공유 중입니다. 저장한 진행 상태·팀 값·논의가 팀원 모두에게 보입니다. 눌러서 팀 화면으로.'},
    error:  {cls:'sc-off',  txt:'연결 끊김', tip:'연결 끊김: 팀 저장소에 연결하지 못했습니다. 읽기와 계산기는 그대로 쓸 수 있습니다. 새로고침해 보십시오.'}
  };
  function paintChip(){
    if(!C || window.DEBUG) return; const c=document.getElementById('seasonChip'); if(!c) return;
    const k = CHIP[C.state] || CHIP.error;
    const tn = [...(C.teamName||'')]; const short = tn.length>10 ? tn.slice(0,10).join('')+'…' : C.teamName;
    const vw = (typeof viewingOther==='function' && viewingOther()), dr = (typeof draftCount==='function' ? draftCount() : 0);
    let cls = k.cls, txt = k.txt, head = '';
    if(C.state==='member'){ head = `${esc(short)} · ${esc(SEASON)}`; if(vw){ cls='sc-warn'; txt='지난 시즌 보는 중'; } if(dr){ cls='sc-warn'; txt=`저장 안 한 변경 ${dr}`; } }
    if(C.state==='anon'){ c.className = 'sc-wait sc-team sc-login'; c.innerHTML = `<span>로그인</span>`; }
    else { c.className = cls+' sc-team'; c.innerHTML = `${head?`<b>${head}</b>`:''}<span class="sc-dot"></span><span>${txt}</span>`; }
    c.title = (C.state==='member' ? `팀: ${C.teamName} · ${SEASON} 시즌${vw?` (팀의 이번 시즌은 ${TEAM_SEASON})`:''}\n` : '') + (dr ? `저장 안 한 변경 ${dr}건: 아래 막대에서 [모두 저장]을 눌러야 팀원에게 보입니다.\n` : '') + k.tip;
    c.setAttribute('role','button'); c.tabIndex = 0; c.setAttribute('aria-label', c.textContent.trim());
    /* 질문·오류 입력칸 안내 */
    document.querySelectorAll('.qa-f').forEach(f=>{
      f.querySelectorAll('.qa-warn:not(.qa-team)').forEach(w=>w.remove());
      let w = f.querySelector('.qa-team');
      if(C.state==='member'){ if(w) w.remove(); const nt=f.querySelector('.qa-note'); if(nt) nt.hidden=false; return; }
      if(!w){ w=document.createElement('p'); w.className='qa-warn qa-team'; f.prepend(w); }
      const msg = C.state==='anon' ? ['논의는 로그인한 팀원만 볼 수 있고 남길 수 있습니다.','로그인'] :
                  C.state==='error' ? ['팀 저장소에 연결하지 못했습니다.',''] : ['논의는 팀원만 볼 수 있고 남길 수 있습니다.','팀 가입'];
      w.innerHTML = msg[0] + (msg[1] ? ` <button type="button" class="btn small tp-open">${msg[1]}</button>` : '');
      const nt=f.querySelector('.qa-note'); if(nt) nt.hidden=true;
    });
  }
  { const _u = updSeasonChip; updSeasonChip = function(){ const r=_u.apply(this,arguments); try{ paintChip(); }catch(e){} return r; }; }

  /* ---------- 팀 패널 ---------- */
  let P = null;
  /* 팀·계정은 팀 탭 안에 그림 (A6). 예전 떠 있는 창(popover)은 없앰 */
  function panel(){ P = document.querySelector('#v-team #teamPanel'); if(!P){ try{ renderTeamTab(true); }catch(e){} P = document.querySelector('#v-team #teamPanel'); } return P; }
  function place(){}
  async function open(sub){ try{ ttShow(sub||'account'); }catch(e){} panel(); if(!P) return; P.innerHTML='<p class="muted">불러오는 중…</p>'; try{ await render(); }catch(e){ fail(e); } }
  function close(){}
  window.__ttAccount = () => { panel(); if(P && C) render().catch(e=>fail(e)); };
  window.__ttSettings = () => { if(C) renderTM().catch(e=>fail(e)); };

  /* H1: 회의 화면에 띄워도 비밀번호·이메일이 그대로 보이지 않게 기본은 가림, [보기]로 잠깐 표시 */
  const maskMail = m => { m=String(m||''); const [u,d]=m.split('@'); return d ? (u.slice(0,2)+'•••@'+d) : m; };
  const secretSpan = (v, shown, cls) => `<span class="secret ${cls||''}" data-v="${esc(v)}" data-m="${esc(shown)}"><span class="sv">${esc(shown)}</span> <button type="button" class="lnk sreveal" aria-label="보기">보기</button></span>`;
  document.addEventListener('click', e=>{ const b=e.target.closest('.sreveal'); if(!b) return; e.preventDefault(); e.stopPropagation(); const w=b.closest('.secret'), on=b.textContent==='보기';
    w.querySelector('.sv').textContent = on ? w.dataset.v : w.dataset.m; b.textContent = on ? '가리기' : '보기'; }, true);
  const rlOf = m => RL.includes(m.role) ? m.role : 'member';
  const PL = () => PARTS.map(p=>p[0]).filter(p=>p!=='공통');
  const ord = {admin:0,head:1,lead:2,member:3};
  /* 보는 시즌(SEASON)에서의 역할: 이번 시즌이면 지금 역할, 지난 시즌이면 그 시즌 명단 기록 */
  const roleIn = (m, S) => { if(S===TEAM_SEASON || !m.seasons || !m.seasons[S]) return {role:rlOf(m), parts:Array.isArray(m.parts)?m.parts:[]}; const r=m.seasons[S]; return {role:r.role||'member', parts:r.parts||[]}; };
  const roleLabel = r => isLeadRole(r.role) ? `${ROLE[r.role]} · ${r.parts.length?partsShow(r.parts).join('·'):'담당 없음'}` : ROLE[r.role];
  /* 담당 칩: 팀장은 묶음(샤시·전기) + 파트, 파트장은 파트만 */
  const chipsOf = role => role==='head' ? [...Object.keys(PGROUP), ...PL()] : PL();
  const chipOn = (ps, p) => ps.includes(p);
  const chipHtml = e => chipsOf(e.role).map(p=>{ const on=chipOn(e.parts,p); return `<button type="button" class="tp-pchip${on?' on':''}${PGROUP[p]?' grp':''}" data-tmpart="${p}" aria-pressed="${on}"${PGROUP[p]?` title="${PGROUP[p].join('·')} 항목 모두 편집"`:''}>${p}</button>`; }).join('');
  /* 칩 누르기: 그 칩 하나만 켜고 끔 (묶음 칩 하나로 그 묶음 파트 모두 편집, 겸업 파트는 따로 켜서 표시) */
  const togglePart = (ps, p) => ps.includes(p) ? ps.filter(x=>x!==p) : [...ps, p];
  const sortM = (ms, S) => ms.sort((a,b)=>ord[roleIn(a,S).role]-ord[roleIn(b,S).role]||String(a.name).localeCompare(String(b.name),'ko'));
  /* 팀원 카드 격자 (H12): 왼쪽→오른쪽으로 채우고 줄을 넘김 */
  function memberGrid(ms, S){ return `<div class="tp-grid">${sortM(ms,S).map(m=>{ const r=roleIn(m,S), me=m.uid===C.uid;
      return `<div class="tp-card" data-uid="${esc(m.uid)}"><b>${esc(m.name||'(이름 없음)')}${me?' <span class="muted">(나)</span>':''}</b><span class="tp-role${r.role!=='member'?' a':''}">${esc(roleLabel(r))}</span></div>`; }).join('') || '<p class="muted tp-small">없습니다.</p>'}</div>`; }
  function splitSeason(ms, S){ const now=[], past=[]; ms.forEach(m=>(T.inSeason(m,S)?now:past).push(m)); return {now, past}; }
  /* ---------- 팀원 표 (40명 이상 대비): 가나다순 · 검색(이름·역할·파트, 초성) · 역할·명단 거르기 ---------- */
  const MFS = { view:{ q:'', role:'', scope:'now' }, manage:{ q:'', role:'', scope:'all' } };
  let SSEL = '';   /* 팀 설정에서 고른 해 (보는 시즌과 따로) */
  const snBtn = d => `<button type="button" class="tt-sn ${d<0?'sn-prev':'sn-next'}" data-ttsn="${d}" aria-label="${d<0?'이전':'다음'} 시즌">${typeof SN_SVG!=='undefined'?SN_SVG[d<0?0:1]:(d<0?'◀':'▶')}</button>`;
  const byName = (a,b) => String(a.name||'').localeCompare(String(b.name||''),'ko');
  const byRoleName = S => (a,b) => (ord[roleIn(a,S).role]-ord[roleIn(b,S).role]) || byName(a,b);   /* 회장 → 팀장 → 파트장 → 팀원, 같은 역할은 가나다 */
  const mKey = (m, r) => { const t=[m.name||'', ROLE[r.role]||'', partsShow(r.parts).join(' '), (r.parts||[]).join(' ')].join(' '); return (t+' '+(typeof cho==='function'?cho(t):'')).toLowerCase(); };
  function mBar(kind){ const MF=MFS[kind]; return `<div class="tp-mbar"><input type="search" class="tp-mq" placeholder="이름·역할·파트 검색 (초성 가능)" aria-label="팀원 검색" value="${esc(MF.q)}" autocomplete="off">
      <select class="tp-mrole" aria-label="역할"><option value="">역할 전체</option>${RL.map(r=>`<option value="${r}"${MF.role===r?' selected':''}>${ROLE[r]}</option>`).join('')}</select>
      <select class="tp-mscope" aria-label="명단"><option value="now"${MF.scope==='now'?' selected':''}>이 시즌 명단</option><option value="all"${MF.scope==='all'?' selected':''}>전체 팀원</option></select>
      <span class="muted tp-mcnt"></span></div>`; }
  function mFilter(box){ if(!box) return; const MF=MFS[box.dataset.kind||'view']; const q=MF.q.trim().toLowerCase(); let n=0, t=0;
    box.querySelectorAll('tr[data-q]').forEach(tr=>{ t++; const ok=(!q || tr.dataset.q.includes(q)) && (!MF.role || tr.dataset.r===MF.role) && (MF.scope==='all' || tr.dataset.in==='1'); tr.hidden=!ok; if(ok) n++; });
    const c=box.querySelector('.tp-mcnt'); if(c) c.textContent=`${n}명`; const e=box.querySelector('.tp-mnone'); if(e) e.hidden=n>0; }
  /* 보기 전용 표 (팀원·계정) */
  function memberTable(ms, S){ const rows=[...ms].sort(byRoleName(S)).map(m=>{ const r=roleIn(m,S), me=m.uid===C.uid, inS=T.inSeason(m,S);
      return `<tr data-uid="${esc(m.uid)}" data-r="${r.role}" data-in="${inS?1:0}" data-q="${esc(mKey(m,r))}"><td class="tp-mn">${esc(m.name||'(이름 없음)')}${me?' <span class="muted">(나)</span>':''}</td><td><span class="tp-role${r.role!=='member'?' a':''}">${ROLE[r.role]}</span></td><td class="tp-mp">${isLeadRole(r.role)?(r.parts.length?esc(partsShow(r.parts).join(' · ')):'<span class="muted">담당 없음</span>'):'<span class="muted">—</span>'}</td></tr>`; }).join('');
    return `<div class="tp-mtw" data-kind="view">${mBar('view')}<div class="tp-mscroll"><table class="tp-mt"><thead><tr><th>이름</th><th>역할</th><th>담당 파트</th></tr></thead><tbody>${rows}</tbody></table><p class="muted tp-small tp-mnone" hidden>해당하는 팀원이 없습니다.</p></div></div>`; }
  /* 관리 표 (팀 설정): 표에서 바로 명단·역할·담당 파트를 바꿈 → 아래 막대 [모두 저장] */
  function manageTable(ms){ const rows=[...ms].sort(byRoleName(TEAM_SEASON)).map(m=>{ const e=eff(m), me=m.uid===C.uid, pend=!!MP[m.uid];
      return `<tr class="tp-card tp-person${pend?' pend':''}" data-uid="${esc(m.uid)}" data-role="${rlOf(m)}" data-r="${e.role}" data-in="${e.active?1:0}" data-q="${esc(mKey(m,e))}">
        <td class="tp-mn">${esc(m.name||'(이름 없음)')}${me?' <span class="muted">(나)</span>':''}${pend?' <span class="pend-tag">저장 전</span>':''}</td>
        <td><label class="tp-small"><input type="checkbox" data-tmact${e.active?' checked':''} aria-label="${esc(TEAM_SEASON)} 시즌 명단"> 명단</label></td>
        <td><select data-tmrole aria-label="역할"${e.active?'':' disabled'}>${RL.map(r=>`<option value="${r}"${r===e.role?' selected':''}>${ROLE[r]}</option>`).join('')}</select></td>
        <td class="tp-mp">${isLeadRole(e.role)&&e.active?(CHIPOPEN[m.uid]?`<div class="tp-parts">${chipHtml(e)}<button type="button" class="lnk tp-chipt" data-tmchips>접기</button></div>`:`<div class="tp-parts tp-parts-ro">${e.parts.length?partsShow(e.parts).map(p=>`<span class="tp-pchip on ro${PGROUP[p]?' grp':''}">${esc(p)}</span>`).join(''):'<span class="muted tp-small">담당 없음</span>'}<button type="button" class="lnk tp-chipt" data-tmchips>${e.parts.length?'바꾸기':'고르기'}</button></div>`):'<span class="muted">—</span>'}</td>
        <td class="tp-mx">${me?'':`<button type="button" class="lnk" data-tp="kick">내보내기</button> <button type="button" class="lnk tp-warnlnk" data-tp="block" title="내보내고 다시 가입하지 못하게 합니다">차단</button>`}</td></tr>`; }).join('');
    return `<div class="tp-mtw" data-kind="manage">${mBar('manage')}<div class="tp-mscroll"><table class="tp-mt tp-mtm"><thead><tr><th>이름</th><th>${esc(TEAM_SEASON)} 명단</th><th>역할</th><th>담당 파트</th><th></th></tr></thead><tbody>${rows}</tbody></table><p class="muted tp-small tp-mnone" hidden>해당하는 팀원이 없습니다.</p></div></div>`; }
  document.addEventListener('input', e=>{ if(!e.target.matches || !e.target.matches('.tp-mq')) return; MFS[e.target.closest('.tp-mtw').dataset.kind].q=e.target.value; mFilter(e.target.closest('.tp-mtw')); });
  document.addEventListener('change', e=>{ if(!e.target.matches) return; if(e.target.matches('.tp-mrole')){ MFS[e.target.closest('.tp-mtw').dataset.kind].role=e.target.value; mFilter(e.target.closest('.tp-mtw')); } if(e.target.matches('.tp-mscope')){ MFS[e.target.closest('.tp-mtw').dataset.kind].scope=e.target.value; mFilter(e.target.closest('.tp-mtw')); } });

  /* ---------- 팀원 관리 (H13·H14): [변경]으로 펼치고, 바꾼 내용은 아래 막대 [모두 저장]으로 ---------- */
  const MP = {};                  // uid → {role, parts, active}  (저장 전)
  let MS = [];                    // 마지막으로 불러온 팀원 목록
  const cur = m => ({role:rlOf(m), parts:Array.isArray(m.parts)?[...m.parts]:[], active:T.inSeason(m, TEAM_SEASON)});
  const eff = m => MP[m.uid] || cur(m);
  const sameP = (a,b) => a.role===b.role && a.active===b.active && [...a.parts].sort().join()===[...b.parts].sort().join();
  function stage(uid, patch){ const m=MS.find(x=>x.uid===uid); if(!m) return; const n={...eff(m), ...patch}; if(!isLeadRole(n.role)) n.parts=[]; else n.parts=n.parts.filter(p=>p!=='공통' && (n.role==='head' || !PGROUP[p]));   /* 묶음 칩은 팀장만. 공통은 저장하지 않음(팀장 판정에서 처리) */
    if(sameP(n, cur(m))) delete MP[uid]; else MP[uid]=n; DRAFT.paint(); }
  function adminsAfter(){ return MS.filter(m=>{ const e=eff(m); return e.role==='admin' && e.active; }).length; }
  DRAFT.add({ n:()=>Object.keys(MP).length, label:n=>`팀원 ${n}명`,
    revert(){ Object.keys(MP).forEach(k=>delete MP[k]); renderTM().catch(()=>{}); },
    async save(){ if(adminsAfter()<1){ toast('회장이 한 명도 남지 않습니다. 저장하지 않았습니다.'); throw new Error('no admin'); }
      const meDemoted = MP[C.uid] && (MP[C.uid].role!=='admin' || !MP[C.uid].active);
      for(const [uid,n] of Object.entries(MP)){ const m=MS.find(x=>x.uid===uid); if(!m) continue;
        const sz = Object.assign({}, m.seasons || {}); if(!m.seasons){ /* 예전 팀원: 지금까지 있던 시즌을 기록으로 남김 */ if(T.inSeason(m, TEAM_SEASON)) sz[TEAM_SEASON]={role:rlOf(m), parts:cur(m).parts}; }
        if(n.active) sz[TEAM_SEASON] = {role:n.role, parts:n.parts}; else delete sz[TEAM_SEASON];
        await T.updateMember(uid, {role: n.active ? n.role : 'member', parts: n.active ? n.parts : [], seasons: sz}); }
      Object.keys(MP).forEach(k=>delete MP[k]);
      if(meDemoted) return setTimeout(()=>location.reload(), 600);
      renderTM().catch(()=>{}); } });
  function manageCard(m, admins){ const e=eff(m), me=m.uid===C.uid, open=!!(TMOPEN[m.uid]), pend=!!MP[m.uid];
    return `<div class="tp-card${pend?' pend':''}${open?' open':''}" data-uid="${esc(m.uid)}" data-role="${rlOf(m)}">
      <div class="tp-ch"><b>${esc(m.name||'(이름 없음)')}${me?' <span class="muted">(나)</span>':''}</b>${pend?'<span class="pend-tag">저장 전</span>':''}<button type="button" class="btn small" data-tmopen>${open?'접기':'변경'}</button></div>
      <span class="tp-role${e.role!=='member'?' a':''}">${e.active?esc(roleLabel(e)):'이번 시즌 명단에서 뺌'}</span>
      ${open?`<div class="tp-edit">
        <label class="tp-small"><input type="checkbox" data-tmact${e.active?' checked':''}> ${esc(TEAM_SEASON)} 시즌 명단에 있음</label>
        <div class="tp-row"><span class="tp-small muted">역할</span><select data-tmrole aria-label="역할"${e.active?'':' disabled'}>${RL.map(r=>`<option value="${r}"${r===e.role?' selected':''}>${ROLE[r]}</option>`).join('')}</select></div>
        ${isLeadRole(e.role)&&e.active?`<div class="tp-parts"><span class="muted tp-small">담당 파트</span>${chipHtml(e)}</div>`:''}
        ${me?'':`<div class="tp-row tp-danger-row"><button type="button" class="lnk" data-tp="kick">팀에서 내보내기</button><button type="button" class="lnk tp-warnlnk" data-tp="block" title="내보내고 다시 가입하지 못하게 합니다">차단</button></div>`}
      </div>`:''}</div>`; }
  const TMOPEN = {};
  const CHIPOPEN = {};   /* 팀원 표: 담당 칩을 펼쳐 고르는 줄 (기본은 고른 칩만 보임) */

  /* ---------- 관리 창 "팀 관리" (회장, 회장 모드) ---------- */
  const TM = () => document.querySelector('#v-team .adm-tm');
  /* 관리 창 옆에 한 단 더 펼쳐지는 팀 관리 창 */
  let TMP = null;
  function tmPanel(){ if(TMP) return TMP; TMP=document.createElement('aside'); TMP.id='tmPanel'; TMP.hidden=true; TMP.setAttribute('aria-label','팀 관리');
    TMP.innerHTML=`<div class="adm-h"><b>팀 관리</b><span class="adm-sub"></span><button type="button" class="tm-x" aria-label="닫기" title="닫기">×</button></div><div class="adm-b"><div class="adm-tm"></div></div>`;
    document.body.appendChild(TMP); return TMP; }
  function tmSync(){ const on = !!TMP && !TMP.hidden; document.body.classList.toggle('tm-on', on); const b=document.querySelector('#admPanel .adm-tmopen'); if(b){ b.classList.toggle('on', on); b.setAttribute('aria-expanded', String(on)); const a=b.querySelector('.tmo-a'); if(a) a.textContent = on ? '닫기 ›' : '‹ 열기'; } }
  function tmOpen(){ tmPanel(); TMP.hidden=false; TMP.querySelector('.adm-sub').textContent = C.teamName||''; tmSync(); renderTM().catch(err=>fail(err)); }
  function tmClose(){ if(TMP) TMP.hidden=true; tmSync(); }
  function tmShow(){ const ok = C && C.state==='member' && C.role==='admin'; const sec=document.querySelector('#admPanel .adm-team'); if(sec) sec.hidden = !ok;
    const ap=document.getElementById('admPanel'); if(TMP && !TMP.hidden && (!ok || !ap || ap.hidden)) tmClose(); }
  async function renderTM(){ const R=TM(); if(!R || !C || C.role!=='admin') return; const c=C;
    let ms=[], bl=[], pw=''; try{ [ms, bl, pw] = await Promise.all([T.members(), T.blockedList(), T.secretPw()]); }catch(e){ console.error(e); }
    const admins = ms.filter(m=>m.role==='admin').length;
    const namepw = `<div class="tp-sec tp-s-name"><div class="sec-label">팀 이름 · 비밀번호</div><p class="tp-small">지금 이름: <b>${esc(c.teamName)}</b></p>
      <div class="tp-row"><input class="tp-rn" maxlength="40" placeholder="새 팀 이름 (4자 이상)" aria-label="새 팀 이름" autocomplete="off">${pw?'<button type="button" class="btn small" data-tp="rename">변경</button>':''}</div>`
      + (pw ? `<div class="tp-row tp-pwnow"><span class="tp-small">현재 비밀번호</span>${secretSpan(pw, '••••••', 'tp-pwv')}<button type="button" class="lnk" data-tp="pwcopy">복사</button></div>`
            : `<div class="tp-row"><input class="tp-rnpw" maxlength="64" placeholder="팀 비밀번호 (저장된 것이 없어 이름 변경 때 한 번 입력)" aria-label="팀 비밀번호" autocomplete="off" spellcheck="false"><button type="button" class="btn small" data-tp="rename">변경</button></div>`)
      + `<div class="tp-row"><input class="tp-pw" maxlength="64" placeholder="새 비밀번호 (영문·숫자 6자 이상)" aria-label="새 비밀번호" autocomplete="off" spellcheck="false"><button type="button" class="btn small" data-tp="pw">변경</button></div>
      <p class="muted tp-small">기존 팀원은 그대로이고, 새로 가입할 사람은 바뀐 이름·비밀번호로 가입합니다. 비밀번호는 회장과 사이트 운영자가 볼 수 있으니 다른 곳에서 쓰는 비밀번호는 쓰지 마십시오.</p></div>`;
    MS = ms; const nNow=ms.filter(m=>eff(m).active).length, nPast=ms.length-nNow;
    if(!SSEL) SSEL = String(+TEAM_SEASON+1);
    const same = SSEL===String(TEAM_SEASON);
    const season = `<div class="tp-sec tp-s-season"><div class="sec-label">팀의 이번 시즌</div><p class="tp-small">지금 팀의 이번 시즌: <b>${esc(TEAM_SEASON)}</b></p>
      <div class="tp-row"><span class="sn-nav"><button type="button" class="tt-sn" data-tss="-1" aria-label="이전 해">${SN_SVG[0]}</button><b class="tt-sv">${esc(SSEL)}</b><button type="button" class="tt-sn" data-tss="1" aria-label="다음 해">${SN_SVG[1]}</button></span>
      <button type="button" class="btn small pri" data-tsset${same?' disabled':''}>${esc(SSEL)} 시즌을 이번 시즌으로 정하기</button></div>
      <p class="muted tp-small">${same?'고른 해가 지금 이번 시즌과 같습니다. ‹ ›로 바꿀 해를 고르십시오.':'두 번 눌러 확인하면 팀 전체의 이번 시즌이 바뀝니다. 지난 시즌 기록은 그대로 남습니다. 새 시즌 명단에는 회장만 들어가므로, 이어 가는 팀원은 오른쪽 전체 팀원 표에서 [명단]을 체크하고 저장하십시오. 넘긴 뒤에는 이전 시즌 기록을 회장만 고칠 수 있으니, 팀장·파트장이 마무리할 값은 넘기기 전에 정리하십시오.'} 여기의 ‹ ›는 위쪽 "보는 시즌"과 따로 움직입니다.</p></div>`;
    const backup = `<div class="tp-sec tp-s-backup"><div class="sec-label">백업</div><div class="tp-row"><button type="button" class="btn small" data-tp="export">내보내기</button><button type="button" class="btn small" data-tp="importpick">불러오기</button><input type="file" class="tp-file" accept=".json,application/json" hidden></div><p class="muted tp-small">내보내기: 모든 시즌의 진행 상태·우리 팀 값과 논의를 파일로 저장(시즌이 끝날 때마다 권장).<br>불러오기: <b>고른 시즌만</b> 그 시즌 자리에 덮어쓰고, 논의는 지금 없는 글만 되살립니다.</p><div class="tp-imp" hidden></div></div>`;
    const danger = `<div class="tp-sec tp-dz"><div class="sec-label">위험 구역 <span class="muted">되돌릴 수 없는 작업입니다. 모두 두 번 확인한 뒤 실행됩니다.</span></div>
      <div class="tp-dzg"><div class="tp-dzi"><button type="button" class="btn small tp-dzbtn" data-tp="seasonreset">${esc(SEASON)} 시즌 초기화</button><span class="muted tp-small">이 시즌의 진행 상태·우리 팀 값을 지웁니다. 논의는 남습니다.</span></div>
      <div class="tp-dzi"><button type="button" class="btn small tp-dzbtn" data-tp="delopen">팀 삭제</button><span class="muted tp-small">모든 시즌 기록·논의·팀원 명단을 지웁니다.</span></div></div>
      <div class="tp-delbox" hidden><p class="tp-small">삭제하려면 팀 이름 <b>${esc(c.teamName)}</b>을(를) 그대로 입력하십시오.</p><div class="tp-row"><input class="tp-delname" autocomplete="off" aria-label="삭제 확인용 팀 이름"><button type="button" class="btn small tp-danger" data-tp="delete" disabled>영구 삭제</button></div></div></div>`;
    const blk = (bl.length ? `<div class="sec-label tp-bl">차단한 사람 (${bl.length})</div>` + bl.map(b=>`<div class="tp-person" data-uid="${esc(b.uid)}"><span>${esc(b.name||'(이름 없음)')} ${secretSpan(b.email||'', maskMail(b.email||''))}</span><span><button type="button" class="lnk" data-tp="unblock">차단 해제</button></span></div>`).join('') + `<p class="muted tp-small">차단한 사람은 비밀번호를 알아도 다시 가입할 수 없습니다.</p>` : '');
    const h = `<div class="tp-2col"><div class="tp-left">${season}${namepw}${backup}</div>
      <div class="tp-right"><div class="tp-sec tp-fill"><div class="sec-label">팀원 ${ms.length}명 · ${esc(TEAM_SEASON)} 시즌 명단 ${nNow}명</div>
        <p class="muted tp-small">표에서 바로 명단·역할·담당 파트를 바꿉니다. 팀장은 샤시·전기 칩 하나로 그 묶음의 모든 파트와 공통 항목을 편집합니다. 파트장을 겸하면 그 파트 칩을 더 켜 두면 담당 칸에 함께 보입니다. 바꾼 내용은 아래 막대의 [모두 저장]을 눌러야 반영됩니다. 내보내기·차단은 한 번 더 눌러 확인하면 바로 실행됩니다.${viewingOther()?` <b>지금 ${esc(SEASON)} 시즌을 보는 중이어도 여기서는 팀의 이번 시즌(${esc(TEAM_SEASON)}) 명단을 관리합니다.</b>`:''}</p>
        ${manageTable(ms)}
        ${blk}</div></div></div>${danger}`;
    /* 다시 그려도 팀원 표·설정 칸의 스크롤 위치 유지 */
    const keep = ['.tp-mscroll', '.tp-mtw', '.tp-fill', '.tp-left'].map(s=>{ const n=R.querySelector(s); return [s, n ? n.scrollTop : 0]; });
    R.innerHTML = h; R.dataset.admins = admins; R.dataset.count = ms.length; mFilter(R.querySelector('.tp-mtw'));
    keep.forEach(([s, y])=>{ const n=R.querySelector(s); if(n && y) n.scrollTop = y; }); }

  async function render(){
    const c = C; let h = '';
    if(!c.uid){
      h += `<div class="tp-login"><p>가이드와 계산기는 로그인 없이 쓸 수 있습니다. 팀 데이터(진행 상태·팀 값·논의)는 로그인하고 팀원이 되면 보입니다.</p><button type="button" class="btn pri" data-tp="login">구글 로그인</button></div>`;
      P.innerHTML = h; return;
    }
    let L = `<div class="tp-sec"><div class="sec-label">내 계정</div><div class="tp-me"><span>${esc(c.name||'')} ${secretSpan(c.email, maskMail(c.email))}</span><button type="button" class="lnk" data-tp="logout">로그아웃</button></div></div>`, Rt = '';
    /* 팀 */
    const form = (k, label) => `<div class="tp-row"><input class="tp-n-${k}" maxlength="40" placeholder="팀 이름 (4자 이상)" aria-label="팀 이름" autocomplete="off"></div>
      <div class="tp-row"><input class="tp-p-${k}" maxlength="64" placeholder="비밀번호 (영문·숫자 6자 이상)" aria-label="비밀번호" autocomplete="off" spellcheck="false"><button type="button" class="btn small${k==='join'?' pri':''}" data-tp="${k}">${label}</button></div>`;
    let mine=[]; try{ mine = await T.mine(); }catch(e){ console.error(e); }
    if(mine.length){
      /* 내 팀: 팀마다 [이동]·[나가기] (지금 팀이 아니어도 바로 나감) */
      L += `<div class="tp-sec"><div class="sec-label">내 팀 (${mine.length})</div>` + mine.map(t=>{ const cur = t.id===c.team && c.state==='member';
        return `<div class="tp-person tp-myteam" data-tid="${esc(t.id)}"><span>${esc(t.name)}${cur?` <span class="tp-role a">${ROLE[c.role]} · 지금 팀</span>`:''}</span><span class="tp-tacts">${cur?'':`<button type="button" class="btn small" data-tp="switch" data-tid="${esc(t.id)}">이동</button>`}<button type="button" class="btn small tp-leavebtn" data-tp="leaveteam" data-tid="${esc(t.id)}"${cur?' data-cur="1"':''}>나가기</button></span></div>`; }).join('')
        + `<p class="muted tp-small">나가기는 한 번 더 눌러 확인합니다. 회장은 나갈 수 없습니다. 팀을 삭제하거나, 다른 사람을 회장으로 지정하고 내 역할을 내린 뒤 나가십시오.</p></div>`;
    }
    let ms=[];
    if(c.state==='member'){
      L += `<div class="tp-sec"><div class="sec-label">팀원 초대</div><div class="tp-row"><button type="button" class="btn small" data-tp="invite">초대 문구 복사</button></div><p class="muted tp-small">사이트 주소·팀 이름·가입 방법이 담긴 문구를 복사합니다. 톡방에 붙여 넣고, 비밀번호는 따로 알려 주십시오.</p></div>`;
      try{ ms = await T.members(); }catch(e){ console.error(e); }
    }
    L += `<div class="tp-sec"><div class="sec-label">${c.state==='member'?'다른 팀 가입':'팀 가입'}</div><p class="muted tp-small">회장에게 받은 팀 이름과 비밀번호로 가입합니다. 팀 이름은 대소문자를 구분하지 않고, 비밀번호는 구분합니다.</p>${form('join','가입')}</div>`;
    L += `<div class="tp-sec"><div class="sec-label">새 팀 만들기</div><p class="muted tp-small">팀 이름은 다른 팀과 겹칠 수 없습니다. 만든 사람이 첫 회장이 되고, 비밀번호를 팀원에게 알려 주면 바로 가입합니다.</p>${form('create','만들기')}</div>`;
    if(c.state==='member'){
      const admins = ms.filter(m=>m.role==='admin').length, nIn = ms.filter(m=>T.inSeason(m,SEASON)).length;
      Rt = `<div class="tp-sec tp-fill"><div class="sec-label">팀원 ${ms.length}명 · ${esc(SEASON)} 시즌 명단 ${nIn}명</div>${memberTable(ms, SEASON)}`
        + (c.role==='admin' ? `<p class="muted tp-small">역할·담당 파트·명단 변경, 차단·비밀번호·백업·팀 삭제는 <button type="button" class="lnk" data-tts="settings">팀 설정</button>에 있습니다.</p>` : '') + `</div>`;
      P.dataset.admins = admins; P.dataset.count = ms.length;
    }
    h += c.state==='member' ? `<div class="tp-2col"><div class="tp-left">${L}</div><div class="tp-right">${Rt}</div></div>` : `<div class="tp-1col">${L}</div>`;
    P.innerHTML = h; mFilter(P.querySelector('.tp-mtw'));
  }

  /* ---------- 플랫폼 문의: 상단 [문의]에서 내려오는 배너에서만 (개발자는 받은 문의도 여기서) ---------- */
  let FBP = null;
  function fbPanel(){ if(FBP) return FBP; FBP=document.createElement('div'); FBP.id='fbPanel'; FBP.hidden=true; FBP.setAttribute('role','dialog'); FBP.setAttribute('aria-label','플랫폼 문의');
    FBP.innerHTML='<div class="fbp-h"><b>문의</b><button type="button" class="fbp-x" aria-label="닫기" title="닫기">×</button></div><div class="fbp-b"></div>'; document.body.appendChild(FBP); return FBP; }
  async function fbRender(){ const B=fbPanel().querySelector('.fbp-b');
    if(!C || !C.uid){ B.innerHTML=`<p class="tp-small">내용 오류·사이트 오류·기능 제안을 사이트 개발자에게 보냅니다. 보내려면 로그인하십시오.</p><button type="button" class="btn pri small" data-tp="login">구글 로그인</button>`; return; }
    let h=''; const c=C; const fbb = await T.fbBlockedMe();
    h += `<div class="tp-sec tp-fbsec"><div class="sec-label">플랫폼 문의 · 사이트 개발자에게</div><p class="muted tp-small">내용 오류·사이트 오류·기능 제안. 팀과 무관하게 사이트 개발자에게만 전달되고, 개발자가 처리 상태(접수·검토 중·반영됨·반영 안 함)를 관리합니다.</p>`
       + (fbb ? `<p class="tp-small">이 계정은 플랫폼 문의를 보낼 수 없습니다.</p>` :
         `<div class="fb-f"><label for="fbK">종류</label><select id="fbK" class="tp-fbkind"><option>오류</option><option>제안</option><option>질문</option></select>
            <label for="fbW">위치</label><select id="fbW" class="tp-fbwhere">${whereOpts()}</select>
            <label for="fbI" class="fb-il" hidden>항목</label><select id="fbI" class="tp-fbitem" hidden></select></div>
          <textarea class="tp-fb" rows="3" maxlength="4000" placeholder="내용 (어디가 어떻게 틀렸는지, 근거가 있으면 함께)"></textarea><button type="button" class="btn small" data-tp="fb">보내기</button>`) + `</div>`;
    if(c.isDev){
      let fb=[], bl=[]; try{ [fb, bl] = await Promise.all([T.feedbackList(), T.fbBlockedList()]); }catch(e){ console.error(e); }
      const blocked = new Set(bl.map(b=>b.uid)), open = fb.filter(f=>!f.status || f.status==='접수' || f.status==='검토 중').length;
      h += `<div class="tp-sec"><div class="sec-label">받은 플랫폼 문의 (${fb.length}${open?` · 처리 전 ${open}`:''})</div>` + (fb.length ? fb.map(f=>{ const st=f.status||'접수';
          return `<div class="tp-fbrow st-${T.FB_ST.indexOf(st)}" data-id="${esc(f.id)}" data-by="${esc(f.by||'')}" data-name="${esc(f.name||'')}" data-email="${esc(f.email||'')}">
          <div class="muted tp-small">${esc((f.at||'').slice(0,16).replace('T',' '))} · ${esc(f.name||'')} ${esc(f.email||'')}${f.team?' · '+esc(f.team):''}</div>
          <div class="tp-fbmeta"><span class="tp-fbk">${esc(f.kind||'문의')}</span>${esc(f.label||'')}${f.item && IT[f.item]?` <button type="button" class="lnk" data-goto="${esc(f.item)}">이동</button>`:''}</div>
          <div class="tp-fbtext">${esc(f.text||'')}</div>
          <div class="tp-fbact"><select class="tp-fbst" aria-label="처리 상태">${T.FB_ST.map(x=>`<option${x===st?' selected':''}>${x}</option>`).join('')}</select>
            ${blocked.has(f.by)?'<span class="muted tp-small">차단된 계정</span>':`<button type="button" class="lnk tp-warnlnk" data-tp="fbblock">이 계정 차단</button>`}<button type="button" class="lnk" data-tp="fbdel">삭제</button></div></div>`; }).join('') : `<p class="muted tp-small">없음</p>`) + `</div>`;
      if(bl.length) h += `<div class="tp-sec"><div class="sec-label">문의 차단한 계정 (${bl.length})</div>` + bl.map(b=>`<div class="tp-person" data-uid="${esc(b.uid)}"><span>${esc(b.name||'')} <span class="muted">${esc(b.email||'')}</span></span><span><button type="button" class="lnk" data-tp="fbunblock">차단 해제</button></span></div>`).join('') + `</div>`;
    }
    B.innerHTML = h; }
  async function fbOpen(pre){ fbPanel(); FBP.hidden=false; const b=document.querySelector('.topask'); if(b) b.setAttribute('aria-expanded','true');
    /* 닫았다 다시 열어도 쓰던 문의(종류·위치·항목·내용)는 그대로 */
    const q=s=>FBP.querySelector(s), old={kind:q('.tp-fbkind')?.value, where:q('.tp-fbwhere')?.value, item:q('.tp-fbitem')?.value, text:q('.tp-fb')?.value||''};
    FBP.querySelector('.fbp-b').innerHTML='<p class="muted tp-small">불러오는 중…</p>'; try{ await fbRender(); }catch(e){ fail(e); }
    if(old.text.trim()){ if(!pre){ try{ if(q('.tp-fbkind') && old.kind) q('.tp-fbkind').value=old.kind; if(q('.tp-fbwhere') && old.where){ q('.tp-fbwhere').value=old.where; fillItems(); } if(q('.tp-fbitem') && old.item) q('.tp-fbitem').value=old.item; }catch(e){} } if(q('.tp-fb')) q('.tp-fb').value=old.text; }
    const t=FBP.querySelector('.tp-fb'); if(t){ if(pre && IT[pre]){ FBP.querySelector('.tp-fbkind').value='오류'; const w=FBP.querySelector('.tp-fbwhere'); w.value='step:'+IT[pre].s; fillItems(); FBP.querySelector('.tp-fbitem').value=pre; } t.focus(); } }
  function fbClose(){ if(FBP) FBP.hidden=true; const b=document.querySelector('.topask'); if(b) b.setAttribute('aria-expanded','false'); }
  /* 플랫폼 문의 위치: 사이트 전체 / 탭 / 설계 단계 › 항목 */
  const TABS = [['start','시작 탭'],['graph','연결도 탭'],['ref','참고 탭']];
  const plain = t => String(t||'').replace(/<[^>]+>/g,'').replace(/\$/g,'');
  const stepName = s => `${s.id} ${plain(s.t).replace('★ ','')}`;
  function whereOpts(){ return `<option value="">사이트 전체·기타</option><optgroup label="탭">${TABS.map(([k,n])=>`<option value="tab:${k}">${n}</option>`).join('')}</optgroup><optgroup label="설계 단계">${STEPS.map(s=>`<option value="step:${esc(s.id)}">${esc(stepName(s))}</option>`).join('')}</optgroup>`; }
  function fillItems(){ const R=FBP||P; const w=R.querySelector('.tp-fbwhere'), sel=R.querySelector('.tp-fbitem'); if(!w||!sel) return; const sid = w.value.startsWith('step:') ? w.value.slice(5) : '';
    sel.hidden = !sid; const lb=R.querySelector('.fb-il'); if(lb) lb.hidden=!sid; if(!sid){ sel.innerHTML=''; return; }
    sel.innerHTML = `<option value="">단계 전체</option>` + ITEMS.filter(i=>i.s===sid).sort((a,b)=>((ACT[a.id]||[99])[0])-((ACT[b.id]||[99])[0])).map(i=>`<option value="${esc(i.id)}">${esc(plain(i.n))}</option>`).join(''); }
  function whereLabel(where, item){ if(!where) return '사이트 전체·기타'; if(where.startsWith('tab:')){ const t=TABS.find(x=>'tab:'+x[0]===where); return t ? t[1] : where; }
    const s = STEPS.find(x=>'step:'+x.id===where); return '설계 › ' + (s ? stepName(s) : where.slice(5)) + (item && IT[item] ? ' › ' + plain(IT[item].n) : ''); }
  const inviteText = () => `[Run2X 설계 가이드] ${C.teamName} 팀 초대\n\n1. 접속: ${siteUrl()}\n2. 오른쪽 위 상태 칩 → 구글 로그인\n3. 팀 가입: 팀 이름 「${C.teamName}」 + 비밀번호 (따로 안내)\n\n가이드와 계산기는 로그인 없이도 볼 수 있습니다.`;

  async function act(k, el){
    const R = el.closest('.adm-tm') || P, again = () => R===P ? render() : renderTM();
    const row = el.closest('.tp-person'), uid = row && row.dataset.uid;
    const u = await Backend.use('user');
    switch(k){
      case 'login': return u.signIn();
      case 'logout': return u.signOut();
      case 'join': case 'create': { const n=P.querySelector('.tp-n-'+k).value, pw=P.querySelector('.tp-p-'+k).value;
        try{ return k==='join' ? await T.join(n,pw) : await T.create(n,pw); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; } }
      case 'switch': return T.choose(el.dataset.tid);
      case 'export': { const o = await T.exportData(); const n = Object.values(o.data).reduce((a,x)=>a+Object.keys(x).length,0);
        const blob = new Blob([JSON.stringify(o,null,1)],{type:'application/json'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob);
        a.download = `run2x-backup-${C.teamName.replace(/[^가-힣A-Za-z0-9_-]+/g,'_')}-${new Date().toLocaleDateString('sv-SE')}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        return say(`내보냈습니다 · 문서 ${n}개`); }
      case 'importpick': { R.querySelector('.tp-file').click(); return; }
      case 'importgo': { const box=el.closest('.tp-imp'), ses=[...box.querySelectorAll('.tp-ise:checked')].map(x=>x.value), rq=box.querySelector('.tp-iqa');
        if(!ses.length && !(rq && rq.checked)) return say('복구할 시즌을 고르십시오.');
        if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent = ses.length ? `한 번 더 누르면 ${ses.join('·')} 시즌을 덮어씀 (되돌릴 수 없음)` : '한 번 더 누르면 논의만 되살림'; return; }
        el.disabled=true; el.textContent='불러오는 중…'; const n = await T.importData(window.__r2xImport, ses); window.__r2xImport=null;
        say(`복구했습니다 · ${ses.length?ses.join('·')+' 시즌 · ':''}진행 상태 ${n.status} · 우리 팀 값 ${n.val} · 되살린 논의 ${n.qa}`); return setTimeout(()=>location.reload(), 1400); }
      case 'rename': { const n=R.querySelector('.tp-rn').value, pi=R.querySelector('.tp-rnpw'), pw=pi ? pi.value : '';
        try{ await T.rename(n, pw); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; }
        if(TMP) TMP.querySelector('.adm-sub').textContent = C.teamName; paintChip(); say('팀 이름을 바꿨습니다. 초대 문구를 다시 복사해 공유하십시오.'); return again(); }
      case 'seasonreset': { if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent=`한 번 더 누르면 ${SEASON} 시즌을 지웁니다`; return; } await resetShared(); return again(); }
      case 'pw': { const i=R.querySelector('.tp-pw'); try{ await T.changePassword(i.value); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; } i.value=''; again(); return say('비밀번호를 바꿨습니다. 팀원에게 새 비밀번호를 알려 주십시오.'); }
      case 'promote': await T.setRole(uid,'admin'); say('회장으로 지정했습니다.'); return again();
      case 'demote': { if(+R.dataset.admins<=1) return say('마지막 회장은 내려올 수 없습니다. 다른 사람을 먼저 회장으로 지정하십시오.');
        await T.setRole(uid,'member'); if(uid===C.uid) return location.reload(); say('팀원으로 바꿨습니다.'); return again(); }
      case 'kick': { if(row.dataset.role==='admin' && +R.dataset.admins<=1) return say('마지막 회장은 내보낼 수 없습니다.');
        if(!row.dataset.confirm){ row.dataset.confirm='1'; el.textContent='한 번 더 누르면 내보냄'; return; } await T.remove(uid); say('내보냈습니다.'); return again(); }
      case 'leaveteam': { const tid=el.dataset.tid;
        if(!el.dataset.confirm){ let info=null; try{ info = await T.teamInfo(tid); }catch(e){}
          if(info && info.myRole==='admin') return say(`${info.name||'이 팀'}의 회장은 나갈 수 없습니다. 팀 설정에서 팀을 삭제하거나, 다른 사람을 회장으로 지정하고 내 역할을 내린 뒤 나가십시오.`);
          el.dataset.confirm='1'; el.classList.add('tp-danger'); el.textContent = '한 번 더 누르면 나감'; return; }
        el.disabled=true; el.textContent='나가는 중…';
        let r; try{ r = await T.leave(tid); }catch(e){ el.disabled=false; delete el.dataset.confirm; el.classList.remove('tp-danger'); el.textContent='나가기'; if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; }
        if(r.current) return location.reload();
        say('팀에서 나갔습니다.'); return render(); }
      case 'leave': { if(C.role==='admin' && +P.dataset.admins<=1 && +P.dataset.count>1) return say('마지막 회장은 나갈 수 없습니다. 다른 사람을 회장으로 지정한 뒤 나가십시오.');
        const last = +P.dataset.count<=1;
        if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent = last ? '한 번 더 누르면 나가면서 팀이 삭제됩니다 (되돌릴 수 없음)' : '한 번 더 누르면 나감'; return; }
        if(last){ await T.deleteTeam(); say('팀을 삭제했습니다.'); return setTimeout(()=>location.reload(), 800); }
        await T.remove(C.uid); return location.reload(); }
      case 'delopen': { const bx=R.querySelector('.tp-delbox'); bx.hidden=!bx.hidden; if(!bx.hidden) bx.querySelector('input').focus(); return; }
      case 'delete': { const v=R.querySelector('.tp-delname').value.trim().replace(/\s+/g,' ').toLowerCase(); if(v!==String(C.teamName).toLowerCase()) return say('팀 이름이 맞지 않습니다.');
        el.disabled=true; el.textContent='삭제 중…'; await T.deleteTeam(); say('팀을 삭제했습니다.'); return setTimeout(()=>location.reload(), 800); }
      case 'fb': { const F=FBP, t=F.querySelector('.tp-fb'); const v=t.value.trim(); if(!v) return say('내용을 입력하십시오.');
        const where=F.querySelector('.tp-fbwhere').value, item=F.querySelector('.tp-fbitem').hidden ? '' : F.querySelector('.tp-fbitem').value;
        try{ await T.feedback(v, {kind:F.querySelector('.tp-fbkind').value, where, item, label:whereLabel(where, item)}); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; }
        t.value=''; return say('보냈습니다. 고맙습니다.'); }
      case 'fbdel': { const r=el.closest('.tp-fbrow'); if(!r.dataset.confirm){ r.dataset.confirm='1'; el.textContent='한 번 더 누르면 삭제'; return; } await T.feedbackDelete(r.dataset.id); return fbRender(); }
      case 'fbblock': { const r=el.closest('.tp-fbrow'); if(!r.dataset.by) return say('보낸 사람 정보가 없습니다.'); if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent='한 번 더 누르면 차단'; return; }
        await T.fbBlock(r.dataset.by, r.dataset.name, r.dataset.email); say('이 계정은 이제 플랫폼 문의를 보낼 수 없습니다.'); return fbRender(); }
      case 'fbunblock': await T.fbUnblock(uid); say('문의 차단을 해제했습니다.'); return fbRender();
      case 'block': { if(row.dataset.role==='admin' && +R.dataset.admins<=1) return say('마지막 회장은 차단할 수 없습니다.');
        if(!row.dataset.confirm){ row.dataset.confirm='1'; el.textContent='한 번 더 누르면 차단 (내보내고 재가입 막음)'; return; } await T.block(uid); say('차단했습니다. 이 사람은 다시 가입할 수 없습니다.'); return again(); }
      case 'unblock': await T.unblock(uid); say('차단을 해제했습니다. 비밀번호로 다시 가입할 수 있습니다.'); return again();
    }
  }

  document.addEventListener('click', e=>{
    const fo=e.target.closest('.tp-fbopen'); if(fo){ e.preventDefault(); e.stopPropagation(); if(FBP && !FBP.hidden && fo.classList.contains('topask')) return fbClose(); fbOpen(fo.dataset.item); return; }
    if(FBP && !FBP.hidden){ if(e.target.closest('.fbp-x')){ e.preventDefault(); fbClose(); return; }
      const fb = e.target.closest('#fbPanel [data-tp]'); if(fb){ e.preventDefault(); act(fb.dataset.tp, fb).catch(err=>fail(err)); return; }
      /* 바깥 클릭으로는 닫지 않음 (글자를 끌어 고르다 칸 밖에서 손을 떼도 닫히지 않게). 닫기는 ×·[문의] 버튼 */ }
    if(e.target.closest('#seasonChip.sc-team')){ e.preventDefault(); e.stopPropagation(); open(C && C.state==='member' ? 'progress' : 'account'); return; }
    if(e.target.closest('.tp-open')){ e.preventDefault(); e.stopPropagation(); open('account'); return; }
    const tmc = e.target.closest('.adm-tm [data-tmchips]'); if(tmc){ e.preventDefault(); const u=tmc.closest('.tp-card').dataset.uid; CHIPOPEN[u]=!CHIPOPEN[u]; renderTM().catch(err=>fail(err)); return; }
    const tmo = e.target.closest('.adm-tm [data-tmopen]'); if(tmo){ e.preventDefault(); const u=tmo.closest('.tp-card').dataset.uid; TMOPEN[u]=!TMOPEN[u]; renderTM().catch(err=>fail(err)); return; }
    const tpp = e.target.closest('.adm-tm [data-tmpart]'); if(tpp){ e.preventDefault(); const u=tpp.closest('.tp-card').dataset.uid, m=MS.find(x=>x.uid===u), p=tpp.dataset.tmpart, ps=eff(m).parts;
      stage(u, {parts: togglePart(ps, p)}); renderTM().catch(err=>fail(err)); return; }
    const tss = e.target.closest('.adm-tm [data-tss]'); if(tss){ e.preventDefault(); SSEL = String(+(SSEL||TEAM_SEASON) + +tss.dataset.tss); renderTM().catch(err=>fail(err)); return; }
    const tsset = e.target.closest('.adm-tm [data-tsset]'); if(tsset){ e.preventDefault(); if(tsset.disabled) return;
      if(!tsset.dataset.confirm){ tsset.dataset.confirm='1'; tsset.classList.add('tp-danger'); tsset.textContent=`한 번 더 누르면 팀 전체가 ${SSEL} 시즌이 됩니다`; return; }
      const v=SSEL; tsset.disabled=true; Promise.resolve(setTeamSeason(v)).then(()=>{ SSEL=''; try{ if(SEASON!==v) setSeason(v, +v>+SEASON?1:-1); }catch(_){} renderTM().catch(err=>fail(err)); }).catch(err=>fail(err)); return; }
    if(e.target.closest('.adm-tm [data-tmall]')){ e.preventDefault(); MS.filter(m=>!eff(m).active).forEach(m=>stage(m.uid, {active:true, role: rlOf(m)==='admin'?'admin':'member'})); renderTM().catch(err=>fail(err)); return; }
    const tb = e.target.closest('.adm-tm [data-tp]'); if(tb && tb.dataset.tp==='pwcopy'){ e.preventDefault(); const v=tb.closest('.tp-pwnow').querySelector('.tp-pwv').dataset.v; copyText(v, '비밀번호를 복사했습니다'); return; }
    if(tb){ e.preventDefault(); act(tb.dataset.tp, tb).catch(err=>fail(err)); return; }
    if(!P || P.hidden) return;
    if(e.target.closest('.tp-x')){ close(); return; }
    const b = e.target.closest('[data-tp]');
    if(b && P.contains(b)){ e.preventDefault(); if(b.dataset.tp==='invite'){ copyText(inviteText(), '초대 문구를 복사했습니다. 비밀번호는 따로 알려 주십시오.'); return; } act(b.dataset.tp, b).catch(err=>fail(err)); return; }
    if(!P.contains(e.target)) close();
  }, true);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ close(); fbClose(); } if((e.key==='Enter'||e.key===' ') && document.activeElement && document.activeElement.id==='seasonChip' && document.activeElement.classList.contains('sc-team')){ e.preventDefault(); open(); } });
  addEventListener('resize', place);
  document.addEventListener('change', e=>{ if(!e.target.matches || !e.target.matches('.adm-tm .tp-file')) return; const f=e.target.files[0]; if(!f) return; const box=e.target.closest('.adm-tm').querySelector('.tp-imp');
    f.text().then(t=>{ let o; try{ o=JSON.parse(t); }catch(_){ o=null; }
      if(!o || o.format!=='run2x-team-backup' || !o.data){ box.hidden=false; box.innerHTML='<p class="tp-small">이 사이트의 팀 백업 파일이 아닙니다.</p>'; return; }
      window.__r2xImport=o; const SS=T.backupSeasons(o), keys=Object.keys(SS).sort(), nq=Object.values(o.data.qa||{}).filter(d=>d && d.v===2).length;
      box.hidden=false; box.innerHTML=`<p class="tp-small"><b>${esc(o.team||'')}</b> 백업 · ${esc(o.exportedAt ? new Date(o.exportedAt).toLocaleString('ko-KR') : '')}</p>
        <div class="tp-small"><b>복구할 시즌</b> (고른 시즌만 지금 팀의 그 시즌 기록을 이 파일 내용으로 바꿉니다. 고르지 않은 시즌은 그대로)</div>
        <div class="tp-ises">${keys.length ? keys.map(k=>`<label><input type="checkbox" class="tp-ise" value="${esc(k)}"> <b>${esc(k)}</b> <span class="muted">진행 상태 ${SS[k].status} · 팀 값 ${SS[k].val}</span></label>`).join('') : '<span class="muted tp-small">시즌 기록 없음</span>'}</div>
        <label class="tp-small"><input type="checkbox" class="tp-iqa" checked disabled> 논의 ${nq}개 중 지금 없는 글 되살리기 (지금 글은 그대로)</label>
        <p class="tp-small muted">이번 시즌 설정(${esc(TEAM_SEASON)})은 바뀌지 않습니다.</p>
        <button type="button" class="btn small tp-danger" data-tp="importgo">선택한 시즌 복구</button>`; });
    e.target.value=''; });
  document.addEventListener('change', e=>{ if(e.target.matches && e.target.matches('.adm-tm [data-tmrole], .adm-tm [data-tmact]')){ const card=e.target.closest('.tp-card'), u=card.dataset.uid;
      if(e.target.matches('[data-tmrole]')) stage(u, {role:e.target.value}); else stage(u, {active:e.target.checked});
      if(adminsAfter()<1){ toast('회장이 한 명은 있어야 합니다. 다른 사람을 먼저 회장으로 지정하십시오.'); const m=MS.find(x=>x.uid===u); delete MP[u]; DRAFT.paint(); }
      renderTM().catch(err=>fail(err)); return; }
    if(!e.target.matches) return;
    if(e.target.matches('#fbPanel .tp-fbwhere')) return fillItems();
    if(e.target.matches('#fbPanel .tp-fbst')){ const r=e.target.closest('.tp-fbrow'), v=e.target.value; T.feedbackStatus(r.dataset.id, v).then(()=>{ r.className='tp-fbrow st-'+T.FB_ST.indexOf(v); say('처리 상태: '+v); }).catch(err=>fail(err)); } });
  document.addEventListener('input', e=>{ if(!e.target.matches || !e.target.matches('.adm-tm .tp-delname')) return; const b=e.target.closest('.adm-tm').querySelector('[data-tp=delete]'); if(b) b.disabled = e.target.value.trim().replace(/\s+/g,' ').toLowerCase() !== String(C.teamName).toLowerCase(); });

  /* ---------- 하단: 로그인 상태 ---------- */
  function foot(){ const vl=document.querySelector('#verline .vl-links') || document.getElementById('verline'); if(!vl || vl.querySelector('.tp-open')) return;
    const f=document.createElement('button'); f.type='button'; f.className='authbtn tp-fbopen'; f.textContent='플랫폼 문의'; vl.appendChild(f);
    const b=document.createElement('button'); b.type='button'; b.className='authbtn tp-open'; b.textContent = C.uid ? `${C.email} · 팀·계정` : '로그인'; vl.appendChild(b); }

  /* 새 댓글 알림 (관리 버튼): 이 브라우저에서 마지막으로 본 뒤 다른 사람이 남긴 논의 글 수 */
  function paintQ(){ const ab=document.getElementById('admbtn'); if(!ab) return; let b=ab.querySelector('.adm-new'); const n = (C && C.state==='member' && typeof tkNewTotal==='function') ? tkNewTotal() : 0;
    if(!n){ if(b) b.remove(); } else { if(!b){ b=document.createElement('span'); b.className='adm-new'; ab.appendChild(b); } b.textContent=`새 댓글 ${n}`; }
    const hd=document.querySelector('#admPanel [data-l="qa"]'); if(hd){ let k=hd.parentElement.querySelector('.qa-seen'); if(n && !k){ k=document.createElement('button'); k.type='button'; k.className='btn small qa-seen'; hd.before(k); } if(k){ if(n) k.textContent=`새 댓글 ${n}건 · 모두 읽음으로`; else k.remove(); } } }
  document.addEventListener('click', e=>{ if(!e.target.closest('.qa-seen')) return; e.preventDefault(); tkSeenAll(); paintQ(); });
  { const _rq = renderQA; renderQA = async function(){ const r = await _rq.apply(this, arguments); try{ paintQ(); }catch(e){} return r; }; }
  { const _ra = renderAdm; renderAdm = function(){ const r=_ra.apply(this, arguments); try{ paintQ(); requestAnimationFrame(tmShow); }catch(e){} return r; }; }
  Backend.Team.ctx().then(c=>{ C=c; document.body.classList.toggle('no-team', c.state!=='member'); tmShow(); setTimeout(paintQ, 1500); paintChip(); foot(); if(c.notice) setTimeout(()=>say(c.notice), 600); }).catch(e=>{ console.error(e); C={state:'error'}; document.body.classList.add('no-team'); paintChip(); });
})();
