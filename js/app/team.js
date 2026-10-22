/* ============================================================
   팀·계정 (Firebase 저장소일 때만)
   - 상단 칩: 로그인 안 됨 / 팀 없음 / <팀> 연결됨 / 연결 안 됨
   - 칩을 누르면 팀 패널: 로그인, 팀 가입(이름+비밀번호)·만들기, 관리자(비밀번호 변경·역할·내보내기), 플랫폼 문의
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
    noteam: {cls:'sc-wait', txt:'팀 없음',     tip:'● 팀 없음: 팀 이름과 비밀번호로 가입하거나 새 팀을 만들면 팀 데이터를 쓸 수 있습니다. 눌러서 팀 가입.'},
    member: {cls:'sc-on',   txt:'연결됨',      tip:'● 연결됨: 팀과 공유 중입니다. 내가 바꾼 진행 상태·팀 값·질문이 팀원 모두에게 바로 보입니다. 눌러서 팀 관리.'},
    error:  {cls:'sc-off',  txt:'연결 안 됨',  tip:'● 연결 안 됨: 팀 저장소에 연결하지 못했습니다. 읽기와 계산기는 그대로 쓸 수 있습니다.'}
  };
  function paintChip(){
    if(!C || window.DEBUG) return; const c=document.getElementById('seasonChip'); if(!c) return;
    const k = CHIP[C.state] || CHIP.error;
    const tn = [...(C.teamName||'')]; const short = tn.length>10 ? tn.slice(0,10).join('')+'…' : C.teamName;
    const vw = (typeof viewingOther==='function' && viewingOther()) ? ' 보는 중' : '';
    const head = C.state==='member' ? `${esc(short)} · ${esc(SEASON)}${vw}` : `${esc(SEASON)} 시즌`;
    c.className = k.cls+' sc-team'; c.innerHTML = `<b>${head}</b><span class="sc-dot"></span><span>${k.txt}</span>`;
    c.title = (C.state==='member' ? `팀: ${C.teamName}\n` : '') + (vw ? `${SEASON} 시즌을 보는 중 (팀의 이번 시즌은 ${TEAM_SEASON}). 관리 창에서 돌아갈 수 있습니다.\n` : `${SEASON} 시즌 (팀 관리자가 정한 이번 시즌)\n`) + k.tip;
    c.setAttribute('role','button'); c.tabIndex = 0;
    /* 질문·오류 입력칸 안내 */
    document.querySelectorAll('.qa-f').forEach(f=>{
      f.querySelectorAll('.qa-warn:not(.qa-team)').forEach(w=>w.remove());
      let w = f.querySelector('.qa-team');
      if(C.state==='member'){ if(w) w.remove(); const nt=f.querySelector('.qa-note'); if(nt) nt.hidden=false; return; }
      if(!w){ w=document.createElement('p'); w.className='qa-warn qa-team'; f.prepend(w); }
      const msg = C.state==='anon' ? ['질문·오류는 로그인한 팀원만 남길 수 있습니다.','로그인'] :
                  C.state==='error' ? ['팀 저장소에 연결하지 못했습니다.',''] : ['질문·오류는 팀원만 남길 수 있습니다.','팀 가입'];
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
    const form = (k, label) => `<div class="tp-row"><input class="tp-n-${k}" maxlength="40" placeholder="팀 이름 (4자 이상)" aria-label="팀 이름" autocomplete="off"></div>
      <div class="tp-row"><input class="tp-p-${k}" maxlength="64" placeholder="비밀번호 (영문·숫자 6자 이상)" aria-label="비밀번호" autocomplete="off" spellcheck="false"><button type="button" class="btn small${k==='join'?' pri':''}" data-tp="${k}">${label}</button></div>`;
    let mine=[]; try{ mine = await T.mine(); }catch(e){ console.error(e); }
    if(mine.length){
      h += `<div class="tp-sec"><div class="sec-label">내 팀 (${mine.length})</div>` + mine.map(t=>`<div class="tp-person"><span>${esc(t.name)}${t.id===c.team&&c.state==='member'?` <span class="tp-role a">${ROLE[c.role]} · 지금 팀</span>`:''}</span><span>${t.id===c.team&&c.state==='member'?'':`<button type="button" class="btn small" data-tp="switch" data-tid="${esc(t.id)}">이 팀으로</button>`}</span></div>`).join('') + `</div>`;
    }
    h += `<div class="tp-sec">`;
    if(c.state!=='member') h += `<div class="sec-label">팀 가입</div><p class="muted tp-small">팀 관리자에게 받은 팀 이름과 비밀번호로 가입합니다. 팀 이름은 대소문자를 구분하지 않고, 비밀번호는 구분합니다.</p>` + form('join','가입');
    h += `<details class="tp-more"><summary>${c.state==='member'?'다른 팀 가입 · 새 팀 만들기':'새 팀 만들기'}</summary><div class="tp-in">`
       + (c.state==='member' ? `<div class="tp-sub">다른 팀 가입</div>` + form('join','가입') + `<div class="tp-sub">새 팀 만들기</div>` : '')
       + form('create','만들기')
       + `<p class="muted tp-small">팀 이름은 다른 팀과 겹칠 수 없습니다. 만든 사람이 첫 관리자가 되고, 비밀번호를 팀원에게 알려 주면 바로 가입합니다.</p></div></details></div>`;
    /* 관리자 */
    if(c.state==='member'){
      let ms=[]; try{ ms = await T.members(); }catch(e){ console.error(e); }
      const admins = ms.filter(m=>m.role==='admin').length;
      if(c.role==='admin'){
        h += `<div class="tp-sec"><div class="sec-label">백업</div><div class="tp-row"><button type="button" class="btn small" data-tp="export">내보내기</button><button type="button" class="btn small" data-tp="importpick">불러오기</button><input type="file" class="tp-file" accept=".json,application/json" hidden></div><p class="muted tp-small">내보내기: 진행 상태·우리 팀 값·질문·이번 시즌을 파일로 저장(시즌이 끝날 때마다 권장). 불러오기: 그 파일로 이 팀 데이터를 <b>덮어씁니다</b>.</p><div class="tp-imp" hidden></div></div>`;
        h += `<div class="tp-sec"><div class="sec-label">팀 비밀번호 변경</div><div class="tp-row"><input class="tp-pw" maxlength="64" placeholder="새 비밀번호 (영문·숫자 6자 이상)" aria-label="새 비밀번호" autocomplete="off" spellcheck="false"><button type="button" class="btn small" data-tp="pw">변경</button></div><p class="muted tp-small">바꿔도 기존 팀원은 그대로입니다. 팀원을 내보낸 뒤에는 비밀번호를 바꾸십시오.</p></div>`;
      }
      h += `<div class="tp-sec"><div class="sec-label">팀원 (${ms.length})</div>` + ms.sort((a,b)=>(a.role==='admin'?0:1)-(b.role==='admin'?0:1)||String(a.name).localeCompare(String(b.name),'ko')).map(m=>{
        const me = m.uid===c.uid, isA = m.role==='admin';
        let btn = '';
        if(c.role==='admin' && !me) btn = `<button type="button" class="lnk" data-tp="${isA?'demote':'promote'}">${isA?'팀원으로':'관리자로'}</button><button type="button" class="lnk" data-tp="kick">내보내기</button>`;
        if(me && isA && admins>1) btn = `<button type="button" class="lnk" data-tp="demote">관리자 내려놓기</button>`;
        return `<div class="tp-person" data-uid="${esc(m.uid)}" data-role="${isA?'admin':'member'}"><span>${esc(m.name||'(이름 없음)')}${me?' <span class="muted">(나)</span>':''} <span class="tp-role${isA?' a':''}">${ROLE[isA?'admin':'member']}</span></span><span>${btn}</span></div>`; }).join('');
      h += `<button type="button" class="lnk tp-leave" data-tp="leave">${ms.length<=1?'이 팀 나가기 (마지막 팀원이라 팀이 삭제됩니다)':'이 팀 나가기'}</button>`;
      if(c.role==='admin') h += `<button type="button" class="lnk tp-del" data-tp="delopen">팀 삭제</button><div class="tp-delbox" hidden><p class="tp-small">삭제하려면 팀 이름 <b>${esc(c.teamName)}</b>을(를) 그대로 입력하십시오. 모든 시즌 기록·질문·팀원 명단이 지워지며 되돌릴 수 없습니다.</p><div class="tp-row"><input class="tp-delname" autocomplete="off" aria-label="삭제 확인용 팀 이름"><button type="button" class="btn small tp-danger" data-tp="delete" disabled>영구 삭제</button></div></div>`;
      h += `</div>`;
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
      case 'join': case 'create': { const n=P.querySelector('.tp-n-'+k).value, pw=P.querySelector('.tp-p-'+k).value;
        try{ return k==='join' ? await T.join(n,pw) : await T.create(n,pw); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; } }
      case 'switch': return T.choose(el.dataset.tid);
      case 'export': { const o = await T.exportData(); const n = Object.values(o.data).reduce((a,x)=>a+Object.keys(x).length,0);
        const blob = new Blob([JSON.stringify(o,null,1)],{type:'application/json'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob);
        a.download = `run2x-backup-${C.teamName.replace(/[^가-힣A-Za-z0-9_-]+/g,'_')}-${new Date().toLocaleDateString('sv-SE')}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        return say(`내보냈습니다 · 문서 ${n}개`); }
      case 'importpick': { P.querySelector('.tp-file').click(); return; }
      case 'importgo': { if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent='한 번 더 누르면 덮어씀 (되돌릴 수 없음)'; return; }
        el.disabled=true; el.textContent='불러오는 중…'; const n = await T.importData(window.__r2xImport); window.__r2xImport=null; say(`불러왔습니다 · 문서 ${n}개`); return setTimeout(()=>location.reload(), 900); }
      case 'pw': { const i=P.querySelector('.tp-pw'); try{ await T.changePassword(i.value); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; } i.value=''; return say('비밀번호를 바꿨습니다. 팀원에게 새 비밀번호를 알려 주십시오.'); }
      case 'promote': await T.setRole(uid,'admin'); say('관리자로 지정했습니다.'); return render();
      case 'demote': { if(+P.dataset.admins<=1) return say('마지막 관리자는 내려올 수 없습니다. 다른 사람을 먼저 관리자로 지정하십시오.');
        await T.setRole(uid,'member'); if(uid===C.uid) return location.reload(); say('팀원으로 바꿨습니다.'); return render(); }
      case 'kick': { if(row.dataset.role==='admin' && +P.dataset.admins<=1) return say('마지막 관리자는 내보낼 수 없습니다.');
        if(!row.dataset.confirm){ row.dataset.confirm='1'; el.textContent='한 번 더 누르면 내보냄'; return; } await T.remove(uid); say('내보냈습니다.'); return render(); }
      case 'leave': { if(C.role==='admin' && +P.dataset.admins<=1 && +P.dataset.count>1) return say('마지막 관리자는 나갈 수 없습니다. 다른 사람을 관리자로 지정한 뒤 나가십시오.');
        const last = +P.dataset.count<=1;
        if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent = last ? '한 번 더 누르면 나가면서 팀이 삭제됩니다 (되돌릴 수 없음)' : '한 번 더 누르면 나감'; return; }
        if(last){ await T.deleteTeam(); say('팀을 삭제했습니다.'); return setTimeout(()=>location.reload(), 800); }
        await T.remove(C.uid); return location.reload(); }
      case 'delopen': { const bx=P.querySelector('.tp-delbox'); bx.hidden=!bx.hidden; if(!bx.hidden) bx.querySelector('input').focus(); return; }
      case 'delete': { const v=P.querySelector('.tp-delname').value.trim().replace(/\s+/g,' ').toLowerCase(); if(v!==String(C.teamName).toLowerCase()) return say('팀 이름이 맞지 않습니다.');
        el.disabled=true; el.textContent='삭제 중…'; await T.deleteTeam(); say('팀을 삭제했습니다.'); return setTimeout(()=>location.reload(), 800); }
      case 'fb': { const t=P.querySelector('.tp-fb'); const v=t.value.trim(); if(!v) return say('내용을 입력하십시오.'); await T.feedback(v); t.value=''; return say('보냈습니다. 고맙습니다.'); }
      case 'fbdel': { const r=el.closest('.tp-fbrow'); await T.feedbackDelete(r.dataset.id); return render(); }
    }
  }

  document.addEventListener('click', e=>{
    if(e.target.closest('.tp-fbopen')){ e.preventDefault(); e.stopPropagation(); open().then(()=>{ const t=P.querySelector('.tp-fb'); if(t){ t.scrollIntoView({block:'center'}); t.focus(); } else { const s=P.querySelector('[data-tp=login]'); if(s) s.insertAdjacentHTML('beforebegin','<p class="tp-small"><b>플랫폼 문의</b>는 로그인 후 보낼 수 있습니다.</p>'); } }); return; }
    if(e.target.closest('#seasonChip.sc-team') || e.target.closest('.tp-open')){ e.preventDefault(); e.stopPropagation(); (P && !P.hidden) ? close() : open(); return; }
    if(!P || P.hidden) return;
    if(e.target.closest('.tp-x')){ close(); return; }
    const b = e.target.closest('[data-tp]');
    if(b && P.contains(b)){ e.preventDefault(); act(b.dataset.tp, b).catch(err=>fail(err)); return; }
    if(!P.contains(e.target)) close();
  }, true);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); if((e.key==='Enter'||e.key===' ') && document.activeElement && document.activeElement.id==='seasonChip' && document.activeElement.classList.contains('sc-team')){ e.preventDefault(); open(); } });
  addEventListener('resize', place);
  document.addEventListener('change', e=>{ if(!e.target.matches || !e.target.matches('#teamPanel .tp-file')) return; const f=e.target.files[0]; if(!f) return; const box=P.querySelector('.tp-imp');
    f.text().then(t=>{ let o; try{ o=JSON.parse(t); }catch(_){ o=null; }
      if(!o || o.format!=='run2x-team-backup' || !o.data){ box.hidden=false; box.innerHTML='<p class="tp-small">이 사이트의 팀 백업 파일이 아닙니다.</p>'; return; }
      window.__r2xImport=o; const cnt=k=>Object.keys(o.data[k]||{}).length; const seasons=[...new Set(Object.values(o.data.status||{}).map(d=>d.season).filter(Boolean))].sort().join(', ')||'-';
      box.hidden=false; box.innerHTML=`<p class="tp-small"><b>${esc(o.team||'')}</b> 백업 · ${esc(o.exportedAt ? new Date(o.exportedAt).toLocaleString('ko-KR') : '')}<br>진행 상태 ${cnt('status')} · 우리 팀 값 ${cnt('val')} · 질문 ${cnt('qa')} · 시즌 ${esc(seasons)}<br>지금 팀(<b>${esc(C.teamName)}</b>)의 진행 상태·팀 값·질문·이번 시즌이 모두 이 파일 내용으로 바뀝니다.</p><button type="button" class="btn small tp-danger" data-tp="importgo">덮어쓰기</button>`; });
    e.target.value=''; });
  document.addEventListener('input', e=>{ if(!e.target.matches || !e.target.matches('#teamPanel .tp-delname')) return; const b=P.querySelector('[data-tp=delete]'); if(b) b.disabled = e.target.value.trim().replace(/\s+/g,' ').toLowerCase() !== String(C.teamName).toLowerCase(); });

  /* ---------- 하단: 로그인 상태 ---------- */
  function foot(){ const vl=document.querySelector('#verline .vl-links') || document.getElementById('verline'); if(!vl || vl.querySelector('.tp-open')) return;
    const f=document.createElement('button'); f.type='button'; f.className='authbtn tp-fbopen'; f.textContent='플랫폼 문의'; vl.appendChild(f);
    const b=document.createElement('button'); b.type='button'; b.className='authbtn tp-open'; b.textContent = C.uid ? `${C.email} · 팀·계정` : '로그인'; vl.appendChild(b); }

  /* 새 질문·오류 알림 (관리자): 마지막 확인 이후 다른 사람이 올린 글 수 */
  const qKey = () => 'run2x.qaSeen.'+(C&&C.team||'');
  const qSeen = () => { try{ return localStorage.getItem(qKey()) || ''; }catch(e){ return ''; } };
  function qaNew(){ if(!C || C.role!=='admin' || typeof QA==='undefined') return 0; const s=qSeen(); return Object.values(QA).filter(q=>q && q.at && q.at > s && q.by !== C.uid).length; }
  function paintQ(){ const ab=document.getElementById('admbtn'); if(!ab) return; let b=ab.querySelector('.adm-new'); const n=qaNew();
    if(!n){ if(b) b.remove(); } else { if(!b){ b=document.createElement('span'); b.className='adm-new'; ab.appendChild(b); } b.textContent=`새 질문 ${n}`; }
    const hd=document.querySelector('#admPanel [data-l="qa"]'); if(hd){ let k=hd.parentElement.querySelector('.qa-seen'); if(n && !k){ k=document.createElement('button'); k.type='button'; k.className='btn small qa-seen'; hd.before(k); } if(k){ if(n) k.textContent=`새 글 ${n}건 · 모두 확인`; else k.remove(); } } }
  document.addEventListener('click', e=>{ if(!e.target.closest('.qa-seen')) return; e.preventDefault(); try{ localStorage.setItem(qKey(), new Date().toISOString()); }catch(_){} paintQ(); });
  { const _rq = renderQA; renderQA = async function(){ const r = await _rq.apply(this, arguments); try{ paintQ(); }catch(e){} return r; }; }
  { const _ra = renderAdm; renderAdm = function(){ const r=_ra.apply(this, arguments); try{ paintQ(); }catch(e){} return r; }; }
  Backend.Team.ctx().then(c=>{ C=c; try{ if(c.role==='admin' && !qSeen()) localStorage.setItem(qKey(), new Date().toISOString()); }catch(_){} setTimeout(paintQ, 1500); paintChip(); foot(); if(c.notice) setTimeout(()=>say(c.notice), 600); }).catch(e=>{ console.error(e); C={state:'error'}; paintChip(); });
})();
