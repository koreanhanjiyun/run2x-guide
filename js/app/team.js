/* ============================================================
   팀·계정 (Firebase 저장소일 때만)
   - 상단 칩: 로그인 안 됨 / 팀 없음 / 승인 대기 / <팀> 연결됨 / 연결 안 됨
   - 칩을 누르면 팀 패널: 로그인, 팀 선택·만들기·가입 신청, 관리자(가입 승인·역할·내보내기), 플랫폼 문의
   - 질문·오류 입력칸: 팀원이 아니면 안내 + 버튼
   ============================================================ */
(function(){
  if(!window.Backend || Backend.kind()!=='firebase') return;
  const T = Backend.Team;
  let C = null;                       // 팀 상태 (불러온 뒤)
  const ROLE = {admin:'관리자', member:'팀원'};
  const say = t => { try{ toast(t); }catch(e){} };
  const fail = (e, t) => { console.error(e); say(t || (Backend.denied(e) ? '권한이 없습니다.' : '처리하지 못했습니다. 잠시 후 다시 시도해 주십시오.')); };

  /* ---------- 칩 ---------- */
  const CHIP = {
    anon:   {cls:'sc-wait', txt:'로그인 안 됨', tip:'● 로그인 안 됨: 가이드와 계산기는 그대로 쓸 수 있습니다. 팀 데이터(진행 상태·팀 값·질문)는 로그인하고 팀원이 되면 보입니다. 눌러서 로그인.'},
    noteam: {cls:'sc-wait', txt:'팀 없음',     tip:'● 팀 없음: 팀을 고르고 가입 신청하거나 새 팀을 만들면 팀 데이터를 쓸 수 있습니다. 눌러서 팀 선택.'},
    pending:{cls:'sc-off',  txt:'승인 대기',   tip:'● 승인 대기: 팀 관리자가 가입을 승인하면 팀 데이터가 보입니다.'},
    member: {cls:'sc-on',   txt:'연결됨',      tip:'● 연결됨: 팀과 공유 중입니다. 내가 바꾼 진행 상태·팀 값·질문이 팀원 모두에게 바로 보입니다. 눌러서 팀 관리.'},
    error:  {cls:'sc-off',  txt:'연결 안 됨',  tip:'● 연결 안 됨: 팀 저장소에 연결하지 못했습니다. 읽기와 계산기는 그대로 쓸 수 있습니다.'}
  };
  function paintChip(){
    if(!C || window.DEBUG) return; const c=document.getElementById('seasonChip'); if(!c) return;
    const k = CHIP[C.state] || CHIP.error;
    const head = C.state==='member' ? `${esc(C.teamName)} · ${esc(SEASON)}` : `${esc(SEASON)} 시즌`;
    c.className = k.cls+' sc-team'; c.innerHTML = `<b>${head}</b><span class="sc-dot"></span><span>${k.txt}</span>`;
    c.title = `${SEASON} 시즌 (팀 관리자가 정한 이번 시즌)\n` + k.tip;
    c.setAttribute('role','button'); c.tabIndex = 0;
    /* 질문·오류 입력칸 안내 */
    document.querySelectorAll('.qa-f').forEach(f=>{
      f.querySelectorAll('.qa-warn:not(.qa-team)').forEach(w=>w.remove());
      let w = f.querySelector('.qa-team');
      if(C.state==='member'){ if(w) w.remove(); const nt=f.querySelector('.qa-note'); if(nt) nt.hidden=false; return; }
      if(!w){ w=document.createElement('p'); w.className='qa-warn qa-team'; f.prepend(w); }
      const msg = C.state==='anon' ? ['질문·오류는 로그인한 팀원만 남길 수 있습니다.','로그인'] :
                  C.state==='pending' ? ['가입 승인 후 남길 수 있습니다.','팀 보기'] :
                  C.state==='error' ? ['팀 저장소에 연결하지 못했습니다.',''] : ['질문·오류는 팀원만 남길 수 있습니다.','팀 선택·가입'];
      w.innerHTML = msg[0] + (msg[1] ? ` <button type="button" class="btn small tp-open">${msg[1]}</button>` : '');
      const nt=f.querySelector('.qa-note'); if(nt) nt.hidden=true;
    });
  }
  { const _u = updSeasonChip; updSeasonChip = function(){ const r=_u.apply(this,arguments); try{ paintChip(); }catch(e){} return r; }; }

  /* ---------- 팀 패널 ---------- */
  let P = null;
  function panel(){ if(P) return P; P=document.createElement('div'); P.id='teamPanel'; P.hidden=true; P.setAttribute('role','dialog'); P.setAttribute('aria-label','팀·계정'); document.body.appendChild(P); return P; }
  function place(){ const c=document.getElementById('seasonChip'); if(!c||!P) return; const r=c.getBoundingClientRect(); P.style.top=(r.bottom+8)+'px'; P.style.right=Math.max(8, innerWidth-r.right)+'px'; }
  async function open(){ panel(); P.hidden=false; place(); P.innerHTML='<p class="muted">불러오는 중…</p>'; try{ await render(); }catch(e){ fail(e); } }
  function close(){ if(P) P.hidden=true; }

  async function render(){
    const c = C; let h = `<div class="tp-h"><b>팀 · 계정</b><button type="button" class="tp-x" aria-label="닫기">×</button></div>`;
    if(!c.uid){
      h += `<p>가이드와 계산기는 로그인 없이 쓸 수 있습니다. 팀 데이터(진행 상태·팀 값·질문)는 로그인하고 팀원이 되면 보입니다.</p><button type="button" class="btn pri" data-tp="login">구글 로그인</button>`;
      P.innerHTML = h; return;
    }
    h += `<div class="tp-me"><span>${esc(c.name||'')} <span class="muted">${esc(c.email)}</span></span><button type="button" class="lnk" data-tp="logout">로그아웃</button></div>`;
    /* 팀 */
    h += `<div class="tp-sec"><div class="sec-label">팀</div>`;
    if(c.team){
      if(c.state==='member') h += `<p><b>${esc(c.teamName)}</b> · ${ROLE[c.role]}</p>`;
      else if(c.state==='pending') h += `<p><b>${esc(c.teamName)}</b> 가입 신청 중 · 관리자 승인 대기</p><button type="button" class="btn small" data-tp="cancel">신청 취소</button>`;
      else h += `<p><b>${esc(c.teamName)}</b> 팀원이 아닙니다.</p><button type="button" class="btn small pri" data-tp="request">가입 신청</button>`;
    } else h += `<p class="muted">고른 팀이 없습니다.</p>`;
    let teams=[]; try{ teams = await T.list(); }catch(e){ console.error(e); }
    h += `<div class="tp-row"><select class="tp-sel" aria-label="팀 선택"><option value="">다른 팀 보기…</option>${teams.map(t=>`<option value="${esc(t.id)}"${t.id===c.team?' selected':''}>${esc(t.name)}</option>`).join('')}</select><button type="button" class="btn small" data-tp="choose">이동</button></div>`;
    h += `<div class="tp-row"><input class="tp-new" maxlength="40" placeholder="새 팀 이름 (예: Run2X)" aria-label="새 팀 이름"><button type="button" class="btn small" data-tp="create">팀 만들기</button></div>`;
    h += `<p class="muted tp-small">팀을 만든 사람이 첫 관리자가 됩니다. 팀 이름은 모두에게 보이고, 팀 데이터는 팀원만 봅니다.</p></div>`;
    /* 관리자 */
    if(c.state==='member'){
      let ms=[], rq=[]; try{ ms = await T.members(); if(c.role==='admin') rq = await T.requests(); }catch(e){ console.error(e); }
      const admins = ms.filter(m=>m.role==='admin').length;
      if(c.role==='admin'){
        h += `<div class="tp-sec"><div class="sec-label">가입 신청 (${rq.length})</div>` + (rq.length ? rq.map(r=>`<div class="tp-person" data-uid="${esc(r.uid)}" data-name="${esc(r.name||'')}" data-email="${esc(r.email||'')}"><span>${esc(r.name||'(이름 없음)')} <span class="muted">${esc(r.email||'')}</span></span><span><button type="button" class="btn small pri" data-tp="approve">승인</button><button type="button" class="btn small" data-tp="reject">거절</button></span></div>`).join('') : `<p class="muted tp-small">없음</p>`) + `</div>`;
      }
      h += `<div class="tp-sec"><div class="sec-label">팀원 (${ms.length})</div>` + ms.sort((a,b)=>(a.role==='admin'?0:1)-(b.role==='admin'?0:1)||String(a.name).localeCompare(String(b.name),'ko')).map(m=>{
        const me = m.uid===c.uid, isA = m.role==='admin';
        let btn = '';
        if(c.role==='admin' && !me) btn = `<button type="button" class="lnk" data-tp="${isA?'demote':'promote'}">${isA?'팀원으로':'관리자로'}</button><button type="button" class="lnk" data-tp="kick">내보내기</button>`;
        if(me && isA && admins>1) btn = `<button type="button" class="lnk" data-tp="demote">관리자 내려놓기</button>`;
        return `<div class="tp-person" data-uid="${esc(m.uid)}" data-role="${isA?'admin':'member'}"><span>${esc(m.name||'(이름 없음)')}${me?' <span class="muted">(나)</span>':''} <span class="tp-role${isA?' a':''}">${ROLE[isA?'admin':'member']}</span></span><span>${btn}</span></div>`; }).join('');
      h += `<button type="button" class="lnk tp-leave" data-tp="leave">이 팀 나가기</button></div>`;
      P.dataset.admins = admins; P.dataset.count = ms.length;
    }
    /* 플랫폼 문의 */
    h += `<div class="tp-sec"><div class="sec-label">플랫폼 문의</div><p class="muted tp-small">사이트 오류·기능 제안. 팀과 무관하게 사이트 개발자에게만 전달됩니다.</p><textarea class="tp-fb" rows="3" maxlength="4000" placeholder="내용"></textarea><button type="button" class="btn small" data-tp="fb">보내기</button></div>`;
    if(c.isDev){
      let fb=[]; try{ fb = await T.feedbackList(); }catch(e){ console.error(e); }
      h += `<div class="tp-sec"><div class="sec-label">받은 플랫폼 문의 (${fb.length})</div>` + (fb.length ? fb.map(f=>`<div class="tp-fbrow" data-id="${esc(f.id)}"><div class="muted tp-small">${esc((f.at||'').slice(0,16).replace('T',' '))} · ${esc(f.name||'')} ${esc(f.email||'')}${f.team?' · '+esc(f.team):''}</div><div>${esc(f.text||'')}</div><button type="button" class="lnk" data-tp="fbdel">삭제</button></div>`).join('') : `<p class="muted tp-small">없음</p>`) + `</div>`;
    }
    P.innerHTML = h;
  }

  async function act(k, el){
    const row = el.closest('.tp-person'), uid = row && row.dataset.uid;
    const u = await Backend.use('user');
    switch(k){
      case 'login': return u.signIn();
      case 'logout': return u.signOut();
      case 'request': return T.request();
      case 'cancel': return T.cancelRequest();
      case 'choose': { const v=P.querySelector('.tp-sel').value; if(!v) return say('팀을 고르십시오.'); return T.choose(v); }
      case 'create': { const v=P.querySelector('.tp-new').value.trim(); if(!v) return say('팀 이름을 입력하십시오.'); return T.create(v); }
      case 'approve': await T.approve({uid, name: row.dataset.name, email: row.dataset.email}); say('승인했습니다.'); return render();
      case 'reject': await T.reject(uid); say('거절했습니다.'); return render();
      case 'promote': await T.setRole(uid,'admin'); say('관리자로 지정했습니다.'); return render();
      case 'demote': { if(+P.dataset.admins<=1) return say('마지막 관리자는 내려올 수 없습니다. 다른 사람을 먼저 관리자로 지정하십시오.');
        await T.setRole(uid,'member'); if(uid===C.uid) return location.reload(); say('팀원으로 바꿨습니다.'); return render(); }
      case 'kick': { if(row.dataset.role==='admin' && +P.dataset.admins<=1) return say('마지막 관리자는 내보낼 수 없습니다.');
        if(!row.dataset.confirm){ row.dataset.confirm='1'; el.textContent='한 번 더 누르면 내보냄'; return; } await T.remove(uid); say('내보냈습니다.'); return render(); }
      case 'leave': { if(C.role==='admin' && +P.dataset.admins<=1 && +P.dataset.count>1) return say('마지막 관리자는 나갈 수 없습니다. 다른 사람을 관리자로 지정한 뒤 나가십시오.');
        if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent='한 번 더 누르면 나감'; return; } await T.remove(C.uid); return location.reload(); }
      case 'fb': { const t=P.querySelector('.tp-fb'); const v=t.value.trim(); if(!v) return say('내용을 입력하십시오.'); await T.feedback(v); t.value=''; return say('보냈습니다. 고맙습니다.'); }
      case 'fbdel': { const r=el.closest('.tp-fbrow'); await T.feedbackDelete(r.dataset.id); return render(); }
    }
  }

  document.addEventListener('click', e=>{
    if(e.target.closest('#seasonChip.sc-team') || e.target.closest('.tp-open')){ e.preventDefault(); e.stopPropagation(); (P && !P.hidden) ? close() : open(); return; }
    if(!P || P.hidden) return;
    if(e.target.closest('.tp-x')){ close(); return; }
    const b = e.target.closest('[data-tp]');
    if(b && P.contains(b)){ e.preventDefault(); act(b.dataset.tp, b).catch(err=>fail(err)); return; }
    if(!P.contains(e.target)) close();
  }, true);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); if((e.key==='Enter'||e.key===' ') && document.activeElement && document.activeElement.id==='seasonChip' && document.activeElement.classList.contains('sc-team')){ e.preventDefault(); open(); } });
  addEventListener('resize', place);

  /* ---------- 하단: 로그인 상태 ---------- */
  function foot(){ const vl=document.getElementById('verline'); if(!vl || vl.querySelector('.authbtn')) return;
    const b=document.createElement('button'); b.type='button'; b.className='authbtn tp-open'; b.textContent = C.uid ? `${C.email} · 팀·계정` : '로그인'; vl.appendChild(b); }

  Backend.Team.ctx().then(c=>{ C=c; paintChip(); foot(); }).catch(e=>{ console.error(e); C={state:'error'}; paintChip(); });
})();
