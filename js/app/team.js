/* ============================================================
   팀·계정 (Firebase 저장소일 때만)
   - 상단 칩: 로그인 안 됨 / 팀 없음 / <팀> 연결됨 / 연결 안 됨
   - 칩을 누르면 팀 패널: 로그인, 팀 가입(이름+비밀번호)·만들기, 관리자(비밀번호 변경·역할·내보내기), 플랫폼 문의
   - 항목별 논의 입력칸: 팀원이 아니면 안내 + 버튼
   - 초대 문구 복사(팀원 모두) / 팀 관리(팀원 관리·차단·비밀번호·백업·삭제)는 관리 창 "팀 관리" 칸
   - 개발자: 플랫폼 문의 처리 상태·문의 차단 (팀·계정 창)
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
    anon:   {cls:'sc-wait', txt:'로그인 안 됨', tip:'● 로그인 안 됨: 가이드와 계산기는 그대로 쓸 수 있습니다. 팀 데이터(진행 상태·팀 값·논의)는 로그인하고 팀원이 되면 보입니다. 눌러서 로그인.'},
    noteam: {cls:'sc-wait', txt:'팀 없음',     tip:'● 팀 없음: 팀 이름과 비밀번호로 가입하거나 새 팀을 만들면 팀 데이터를 쓸 수 있습니다. 눌러서 팀 가입.'},
    member: {cls:'sc-on',   txt:'연결됨',      tip:'● 연결됨: 팀과 공유 중입니다. 내가 바꾼 진행 상태·팀 값·논의가 팀원 모두에게 바로 보입니다. 눌러서 팀 관리.'},
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
      const msg = C.state==='anon' ? ['논의는 로그인한 팀원만 볼 수 있고 남길 수 있습니다.','로그인'] :
                  C.state==='error' ? ['팀 저장소에 연결하지 못했습니다.',''] : ['논의는 팀원만 볼 수 있고 남길 수 있습니다.','팀 가입'];
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

  function memberRows(ms, manage){ const c=C, admins=ms.filter(m=>m.role==='admin').length;
    return ms.sort((a,b)=>(a.role==='admin'?0:1)-(b.role==='admin'?0:1)||String(a.name).localeCompare(String(b.name),'ko')).map(m=>{
      const me = m.uid===c.uid, isA = m.role==='admin'; let btn = '';
      if(manage && !me) btn = `<button type="button" class="lnk" data-tp="${isA?'demote':'promote'}">${isA?'팀원으로':'관리자로'}</button><button type="button" class="lnk" data-tp="kick">내보내기</button><button type="button" class="lnk tp-warnlnk" data-tp="block" title="내보내고 다시 가입하지 못하게 합니다">차단</button>`;
      if(manage && me && isA && admins>1) btn = `<button type="button" class="lnk" data-tp="demote">관리자 내려놓기</button>`;
      return `<div class="tp-person" data-uid="${esc(m.uid)}" data-role="${isA?'admin':'member'}"><span>${esc(m.name||'(이름 없음)')}${me?' <span class="muted">(나)</span>':''} <span class="tp-role${isA?' a':''}">${ROLE[isA?'admin':'member']}</span></span><span>${btn}</span></div>`; }).join(''); }

  /* ---------- 관리 창 "팀 관리" (팀 관리자, 관리자 모드) ---------- */
  const TM = () => document.querySelector('#tmPanel .adm-tm');
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
    let h = `<div class="tp-sec"><div class="sec-label">팀 이름 · 비밀번호</div><p class="tp-small">지금 이름: <b>${esc(c.teamName)}</b></p>
      <div class="tp-row"><input class="tp-rn" maxlength="40" placeholder="새 팀 이름 (4자 이상)" aria-label="새 팀 이름" autocomplete="off">${pw?'<button type="button" class="btn small" data-tp="rename">변경</button>':''}</div>`
      + (pw ? `<div class="tp-row tp-pwnow"><span class="tp-small">현재 비밀번호</span><code class="tp-pwv">${esc(pw)}</code><button type="button" class="lnk" data-tp="pwcopy">복사</button></div>`
            : `<div class="tp-row"><input class="tp-rnpw" maxlength="64" placeholder="팀 비밀번호 (저장된 것이 없어 이름 변경 때 한 번 입력)" aria-label="팀 비밀번호" autocomplete="off" spellcheck="false"><button type="button" class="btn small" data-tp="rename">변경</button></div>`)
      + `<div class="tp-row"><input class="tp-pw" maxlength="64" placeholder="새 비밀번호 (영문·숫자 6자 이상)" aria-label="새 비밀번호" autocomplete="off" spellcheck="false"><button type="button" class="btn small" data-tp="pw">변경</button></div>
      <p class="muted tp-small">기존 팀원은 그대로이고, 새로 가입할 사람은 바뀐 이름·비밀번호로 가입합니다. 비밀번호는 팀 관리자와 사이트 운영자가 볼 수 있으니 다른 곳에서 쓰는 비밀번호는 쓰지 마십시오.</p></div>`;
    h += `<div class="tp-sec"><div class="sec-label">팀원 (${ms.length})</div>` + memberRows(ms, true)
      + (bl.length ? `<div class="sec-label tp-bl">차단한 사람 (${bl.length})</div>` + bl.map(b=>`<div class="tp-person" data-uid="${esc(b.uid)}"><span>${esc(b.name||'(이름 없음)')} <span class="muted">${esc(b.email||'')}</span></span><span><button type="button" class="lnk" data-tp="unblock">차단 해제</button></span></div>`).join('') + `<p class="muted tp-small">차단한 사람은 비밀번호를 알아도 다시 가입할 수 없습니다.</p>` : '') + `</div>`;
    h += `<div class="tp-sec"><div class="sec-label">백업</div><div class="tp-row"><button type="button" class="btn small" data-tp="export">내보내기</button><button type="button" class="btn small" data-tp="importpick">불러오기</button><input type="file" class="tp-file" accept=".json,application/json" hidden></div><p class="muted tp-small">내보내기: 진행 상태·우리 팀 값·논의·이번 시즌을 파일로 저장(시즌이 끝날 때마다 권장). 불러오기: 그 파일로 이 팀 데이터를 <b>덮어씁니다</b>.</p><div class="tp-imp" hidden></div></div>`;
    h += `<div class="tp-sec"><button type="button" class="lnk tp-del" data-tp="delopen">팀 삭제</button><div class="tp-delbox" hidden><p class="tp-small">삭제하려면 팀 이름 <b>${esc(c.teamName)}</b>을(를) 그대로 입력하십시오. 모든 시즌 기록·논의·팀원 명단이 지워지며 되돌릴 수 없습니다.</p><div class="tp-row"><input class="tp-delname" autocomplete="off" aria-label="삭제 확인용 팀 이름"><button type="button" class="btn small tp-danger" data-tp="delete" disabled>영구 삭제</button></div></div></div>`;
    R.innerHTML = h; R.dataset.admins = admins; R.dataset.count = ms.length; }

  async function render(){
    const c = C; let h = `<div class="tp-h"><b>팀 · 계정</b><button type="button" class="tp-x" aria-label="닫기">×</button></div>`;
    if(!c.uid){
      h += `<p>가이드와 계산기는 로그인 없이 쓸 수 있습니다. 팀 데이터(진행 상태·팀 값·논의)는 로그인하고 팀원이 되면 보입니다.</p><button type="button" class="btn pri" data-tp="login">구글 로그인</button>`;
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
    /* 팀원 초대 · 팀원(보기만) · 나가기. 관리 기능은 관리 창(관리자 모드) "팀 관리" 칸 */
    if(c.state==='member'){
      h += `<div class="tp-sec"><div class="sec-label">팀원 초대</div><div class="tp-row"><button type="button" class="btn small" data-tp="invite">초대 문구 복사</button></div><p class="muted tp-small">사이트 주소·팀 이름·가입 방법이 담긴 문구를 복사합니다. 톡방에 붙여 넣고, 비밀번호는 따로 알려 주십시오.</p></div>`;
      let ms=[]; try{ ms = await T.members(); }catch(e){ console.error(e); }
      const admins = ms.filter(m=>m.role==='admin').length;
      h += `<div class="tp-sec"><div class="sec-label">팀원 (${ms.length})</div>` + memberRows(ms, false);
      if(c.role==='admin') h += `<p class="muted tp-small">팀원 관리·차단·비밀번호·백업·팀 삭제는 <b>관리자 모드</b>를 켜면 오른쪽 관리 창의 <b>팀 관리</b>에 있습니다.</p>`;
      h += `<button type="button" class="lnk tp-leave" data-tp="leave">${ms.length<=1?'이 팀 나가기 (마지막 팀원이라 팀이 삭제됩니다)':'이 팀 나가기'}</button></div>`;
      P.dataset.admins = admins; P.dataset.count = ms.length;
    }
    /* 플랫폼 문의 */
    const fbb = await T.fbBlockedMe();
    h += `<div class="tp-sec tp-fbsec"><div class="sec-label">플랫폼 문의</div><p class="muted tp-small">내용 오류·사이트 오류·기능 제안. 팀과 무관하게 사이트 개발자에게만 전달되고, 개발자가 처리 상태(접수·검토 중·반영됨·반영 안 함)를 관리합니다.</p>`
       + (fbb ? `<p class="tp-small">이 계정은 플랫폼 문의를 보낼 수 없습니다.</p>` :
         `<div class="tp-row"><select class="tp-fbkind" aria-label="종류"><option>오류</option><option>제안</option><option>질문</option></select><select class="tp-fbwhere" aria-label="위치">${whereOpts()}</select></div>
          <div class="tp-row"><select class="tp-fbitem" aria-label="항목" hidden></select></div>
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
    P.innerHTML = h;
  }

  /* 플랫폼 문의 위치: 사이트 전체 / 탭 / 설계 단계 › 항목 */
  const TABS = [['graph','연결도 탭'],['parts','부품 탭'],['goals','목표 탭'],['ref','참고 탭']];
  const plain = t => String(t||'').replace(/<[^>]+>/g,'').replace(/\$/g,'');
  const stepName = s => `${s.id} ${plain(s.t).replace('★ ','')}`;
  function whereOpts(){ return `<option value="">사이트 전체·기타</option><optgroup label="탭">${TABS.map(([k,n])=>`<option value="tab:${k}">${n}</option>`).join('')}</optgroup><optgroup label="설계 단계">${STEPS.map(s=>`<option value="step:${esc(s.id)}">${esc(stepName(s))}</option>`).join('')}</optgroup>`; }
  function fillItems(){ const w=P.querySelector('.tp-fbwhere'), sel=P.querySelector('.tp-fbitem'); if(!w||!sel) return; const sid = w.value.startsWith('step:') ? w.value.slice(5) : '';
    sel.hidden = !sid; if(!sid){ sel.innerHTML=''; return; }
    sel.innerHTML = `<option value="">단계 전체</option>` + ITEMS.filter(i=>i.s===sid).sort((a,b)=>((ACT[a.id]||[99])[0])-((ACT[b.id]||[99])[0])).map(i=>`<option value="${esc(i.id)}">${esc(plain(i.n))}</option>`).join(''); }
  function whereLabel(where, item){ if(!where) return '사이트 전체·기타'; if(where.startsWith('tab:')){ const t=TABS.find(x=>'tab:'+x[0]===where); return t ? t[1] : where; }
    const s = STEPS.find(x=>'step:'+x.id===where); return '설계 단계 › ' + (s ? stepName(s) : where.slice(5)) + (item && IT[item] ? ' › ' + plain(IT[item].n) : ''); }
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
      case 'importgo': { if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent='한 번 더 누르면 덮어씀 (되돌릴 수 없음)'; return; }
        el.disabled=true; el.textContent='불러오는 중…'; const n = await T.importData(window.__r2xImport); window.__r2xImport=null; say(`불러왔습니다 · 문서 ${n}개`); return setTimeout(()=>location.reload(), 900); }
      case 'rename': { const n=R.querySelector('.tp-rn').value, pi=R.querySelector('.tp-rnpw'), pw=pi ? pi.value : '';
        try{ await T.rename(n, pw); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; }
        if(TMP) TMP.querySelector('.adm-sub').textContent = C.teamName; paintChip(); say('팀 이름을 바꿨습니다. 초대 문구를 다시 복사해 공유하십시오.'); return again(); }
      case 'pw': { const i=R.querySelector('.tp-pw'); try{ await T.changePassword(i.value); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; } i.value=''; again(); return say('비밀번호를 바꿨습니다. 팀원에게 새 비밀번호를 알려 주십시오.'); }
      case 'promote': await T.setRole(uid,'admin'); say('관리자로 지정했습니다.'); return again();
      case 'demote': { if(+R.dataset.admins<=1) return say('마지막 관리자는 내려올 수 없습니다. 다른 사람을 먼저 관리자로 지정하십시오.');
        await T.setRole(uid,'member'); if(uid===C.uid) return location.reload(); say('팀원으로 바꿨습니다.'); return again(); }
      case 'kick': { if(row.dataset.role==='admin' && +R.dataset.admins<=1) return say('마지막 관리자는 내보낼 수 없습니다.');
        if(!row.dataset.confirm){ row.dataset.confirm='1'; el.textContent='한 번 더 누르면 내보냄'; return; } await T.remove(uid); say('내보냈습니다.'); return again(); }
      case 'leave': { if(C.role==='admin' && +P.dataset.admins<=1 && +P.dataset.count>1) return say('마지막 관리자는 나갈 수 없습니다. 다른 사람을 관리자로 지정한 뒤 나가십시오.');
        const last = +P.dataset.count<=1;
        if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent = last ? '한 번 더 누르면 나가면서 팀이 삭제됩니다 (되돌릴 수 없음)' : '한 번 더 누르면 나감'; return; }
        if(last){ await T.deleteTeam(); say('팀을 삭제했습니다.'); return setTimeout(()=>location.reload(), 800); }
        await T.remove(C.uid); return location.reload(); }
      case 'delopen': { const bx=R.querySelector('.tp-delbox'); bx.hidden=!bx.hidden; if(!bx.hidden) bx.querySelector('input').focus(); return; }
      case 'delete': { const v=R.querySelector('.tp-delname').value.trim().replace(/\s+/g,' ').toLowerCase(); if(v!==String(C.teamName).toLowerCase()) return say('팀 이름이 맞지 않습니다.');
        el.disabled=true; el.textContent='삭제 중…'; await T.deleteTeam(); say('팀을 삭제했습니다.'); return setTimeout(()=>location.reload(), 800); }
      case 'fb': { const t=P.querySelector('.tp-fb'); const v=t.value.trim(); if(!v) return say('내용을 입력하십시오.');
        const where=P.querySelector('.tp-fbwhere').value, item=P.querySelector('.tp-fbitem').hidden ? '' : P.querySelector('.tp-fbitem').value;
        try{ await T.feedback(v, {kind:P.querySelector('.tp-fbkind').value, where, item, label:whereLabel(where, item)}); }catch(e){ if(e && e.message && /^[가-힣]/.test(e.message)) return say(e.message); throw e; }
        t.value=''; return say('보냈습니다. 고맙습니다.'); }
      case 'fbdel': { const r=el.closest('.tp-fbrow'); if(!r.dataset.confirm){ r.dataset.confirm='1'; el.textContent='한 번 더 누르면 삭제'; return; } await T.feedbackDelete(r.dataset.id); return render(); }
      case 'fbblock': { const r=el.closest('.tp-fbrow'); if(!r.dataset.by) return say('보낸 사람 정보가 없습니다.'); if(!el.dataset.confirm){ el.dataset.confirm='1'; el.textContent='한 번 더 누르면 차단'; return; }
        await T.fbBlock(r.dataset.by, r.dataset.name, r.dataset.email); say('이 계정은 이제 플랫폼 문의를 보낼 수 없습니다.'); return render(); }
      case 'fbunblock': await T.fbUnblock(uid); say('문의 차단을 해제했습니다.'); return render();
      case 'block': { if(row.dataset.role==='admin' && +R.dataset.admins<=1) return say('마지막 관리자는 차단할 수 없습니다.');
        if(!row.dataset.confirm){ row.dataset.confirm='1'; el.textContent='한 번 더 누르면 차단 (내보내고 재가입 막음)'; return; } await T.block(uid); say('차단했습니다. 이 사람은 다시 가입할 수 없습니다.'); return again(); }
      case 'unblock': await T.unblock(uid); say('차단을 해제했습니다. 비밀번호로 다시 가입할 수 있습니다.'); return again();
    }
  }

  document.addEventListener('click', e=>{
    const fo=e.target.closest('.tp-fbopen'); if(fo){ e.preventDefault(); e.stopPropagation(); const pre=fo.dataset.item;
      open().then(()=>{ const t=P.querySelector('.tp-fb');
        if(t){ if(pre && IT[pre]){ P.querySelector('.tp-fbkind').value='오류'; const w=P.querySelector('.tp-fbwhere'); w.value='step:'+IT[pre].s; fillItems(); P.querySelector('.tp-fbitem').value=pre; }
          t.scrollIntoView({block:'center'}); t.focus(); }
        else { const sc=P.querySelector('.tp-fbsec'); if(sc){ sc.scrollIntoView({block:'center'}); } else { const s=P.querySelector('[data-tp=login]'); if(s) s.insertAdjacentHTML('beforebegin','<p class="tp-small"><b>플랫폼 문의</b>는 로그인 후 보낼 수 있습니다.</p>'); } } }); return; }
    if(e.target.closest('#seasonChip.sc-team') || e.target.closest('.tp-open')){ e.preventDefault(); e.stopPropagation(); (P && !P.hidden) ? close() : open(); return; }
    if(e.target.closest('#admPanel .adm-tmopen')){ e.preventDefault(); (TMP && !TMP.hidden) ? tmClose() : tmOpen(); return; }
    if(e.target.closest('#tmPanel .tm-x')){ e.preventDefault(); tmClose(); return; }
    const tb = e.target.closest('.adm-tm [data-tp]'); if(tb && tb.dataset.tp==='pwcopy'){ e.preventDefault(); const v=tb.closest('.tp-pwnow').querySelector('.tp-pwv').textContent; copyText(v, '비밀번호를 복사했습니다'); return; }
    if(tb){ e.preventDefault(); act(tb.dataset.tp, tb).catch(err=>fail(err)); return; }
    if(!P || P.hidden) return;
    if(e.target.closest('.tp-x')){ close(); return; }
    const b = e.target.closest('[data-tp]');
    if(b && P.contains(b)){ e.preventDefault(); if(b.dataset.tp==='invite'){ copyText(inviteText(), '초대 문구를 복사했습니다. 비밀번호는 따로 알려 주십시오.'); return; } act(b.dataset.tp, b).catch(err=>fail(err)); return; }
    if(!P.contains(e.target)) close();
  }, true);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); if((e.key==='Enter'||e.key===' ') && document.activeElement && document.activeElement.id==='seasonChip' && document.activeElement.classList.contains('sc-team')){ e.preventDefault(); open(); } });
  addEventListener('resize', place);
  document.addEventListener('change', e=>{ if(!e.target.matches || !e.target.matches('.adm-tm .tp-file')) return; const f=e.target.files[0]; if(!f) return; const box=e.target.closest('.adm-tm').querySelector('.tp-imp');
    f.text().then(t=>{ let o; try{ o=JSON.parse(t); }catch(_){ o=null; }
      if(!o || o.format!=='run2x-team-backup' || !o.data){ box.hidden=false; box.innerHTML='<p class="tp-small">이 사이트의 팀 백업 파일이 아닙니다.</p>'; return; }
      window.__r2xImport=o; const cnt=k=>Object.keys(o.data[k]||{}).length; const seasons=[...new Set(Object.values(o.data.status||{}).map(d=>d.season).filter(Boolean))].sort().join(', ')||'-';
      box.hidden=false; box.innerHTML=`<p class="tp-small"><b>${esc(o.team||'')}</b> 백업 · ${esc(o.exportedAt ? new Date(o.exportedAt).toLocaleString('ko-KR') : '')}<br>진행 상태 ${cnt('status')} · 우리 팀 값 ${cnt('val')} · 논의 ${cnt('qa')} · 시즌 ${esc(seasons)}<br>지금 팀(<b>${esc(C.teamName)}</b>)의 진행 상태·팀 값·논의·이번 시즌이 모두 이 파일 내용으로 바뀝니다.</p><button type="button" class="btn small tp-danger" data-tp="importgo">덮어쓰기</button>`; });
    e.target.value=''; });
  document.addEventListener('change', e=>{ if(!e.target.matches) return;
    if(e.target.matches('#teamPanel .tp-fbwhere')) return fillItems();
    if(e.target.matches('#teamPanel .tp-fbst')){ const r=e.target.closest('.tp-fbrow'), v=e.target.value; T.feedbackStatus(r.dataset.id, v).then(()=>{ r.className='tp-fbrow st-'+T.FB_ST.indexOf(v); say('처리 상태: '+v); }).catch(err=>fail(err)); } });
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
  Backend.Team.ctx().then(c=>{ C=c; tmShow(); setTimeout(paintQ, 1500); paintChip(); foot(); if(c.notice) setTimeout(()=>say(c.notice), 600); }).catch(e=>{ console.error(e); C={state:'error'}; paintChip(); });
})();
