/* ============================================================
   저장소 어댑터 — 화면 코드는 Backend.use('db' | 'user')만 부릅니다.
   우선순위: 디버깅이면 없음 → Firebase 설정이 있으면 Firebase → Claude 아티팩트 안이면 Claude → 없음

   Firebase(다중 팀):
   - 팀 데이터는 teams/<팀ID>/ 아래에 팀별로 저장. 화면 코드가 부르는 'status/..', 'qa', 'meta/season' 등은
     자동으로 현재 팀 경로 아래로 붙음 (scoped db).
   - 로그인하지 않았거나, 고른 팀의 팀원이 아니면 db는 null → 팀 데이터는 보이지 않고 저장 버튼은 잠김.
   - 역할: 개발자(config.developers) / 팀 관리자(members/<uid>.role='admin') / 팀원(role='member')
   ============================================================ */
window.Backend = (function(){
  const CFG = window.RUN2X_CONFIG || {};
  const hasFB = () => !!(CFG.firebase && CFG.firebase.apiKey);
  const hasClaude = () => !!(window.claude && typeof window.claude.use === 'function');
  const kind = () => window.DEBUG ? 'none' : hasFB() ? 'firebase' : hasClaude() ? 'claude' : 'none';
  const TEAMKEY = 'run2x.team';
  const lsGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const lsSet = (k,v) => { try{ v==null ? localStorage.removeItem(k) : localStorage.setItem(k,v); }catch(e){} };

  /* ---------- Firebase ---------- */
  let fbReady = null, ctxReady = null;
  function loadScript(src){ return new Promise((ok, no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
  function fbInit(){
    if(fbReady) return fbReady;
    const v = CFG.firebaseSdk || '10.14.1', base = 'https://www.gstatic.com/firebasejs/'+v+'/';
    fbReady = (async()=>{
      await loadScript(base+'firebase-app-compat.js');
      await Promise.all([loadScript(base+'firebase-auth-compat.js'), loadScript(base+'firebase-firestore-compat.js')]);
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG.firebase);
      const auth = firebase.auth(), fs = firebase.firestore();
      await new Promise(res=>{ const off = auth.onAuthStateChanged(()=>{ off(); res(); }); });
      return {app, auth, fs};
    })();
    return fbReady;
  }
  const devs = () => (CFG.developers||[]).map(x=>String(x).toLowerCase());

  /* 내 팀 목록: users/<uid>.teams = {팀ID: 팀 이름}. name이 null이면 목록에서 뺌 */
  async function setMyTeam(c, tid, name){ const t = Object.assign({}, c.myTeams||{}); if(name==null) delete t[tid]; else t[tid] = name; c.myTeams = t;
    const act = lsGet(TEAMKEY); try{ await c.F.fs.doc('users/'+c.uid).set({teams: t, active: act||null}); }catch(e){ console.error(e); } }

  /* 현재 사람·팀 상태: state = anon | noteam | member | error */
  function teamCtx(){
    if(ctxReady) return ctxReady;
    ctxReady = (async()=>{
      const F = await fbInit(), u = F.auth.currentUser;
      const c = { F, uid: u ? u.uid : null, email: (u && u.email || '').toLowerCase(), name: u && u.displayName || '',
                  team: null, teamName: '', role: null, state: 'anon' };
      c.isDev = !!c.email && devs().includes(c.email);
      if(!u) return c;
      c.state = 'noteam';
      let tid = lsGet(TEAMKEY);
      try{ const us = await F.fs.doc('users/'+c.uid).get(); c.myTeams = us.exists ? (us.data().teams || {}) : {}; if(!tid && us.exists) tid = us.data().active || null; }catch(e){ c.myTeams = {}; }
      if(!tid) return c;
      try{
        const m = await F.fs.doc(`teams/${tid}/members/${c.uid}`).get();
        if(!m.exists){ lsSet(TEAMKEY, null); if(c.myTeams[tid]!==undefined){ c.notice = '이 팀의 팀원이 아닙니다. 내 팀 목록에서 뺐습니다.'; await setMyTeam(c, tid, null); } return c; }
        const t = await F.fs.doc('teams/'+tid).get();
        if(!t.exists){ lsSet(TEAMKEY, null); return c; }
        c.team = tid; c.teamName = t.data().name || ''; c.teamKey = t.data().key || '';
        const today = new Date().toISOString().slice(0,10);
        if(String(t.data().lastActive||'').slice(0,10) !== today){ try{ await F.fs.doc('teams/'+tid).update({lastActive: new Date().toISOString()}); }catch(e){ console.warn('마지막 활동일 기록 실패', e); } }
        c.role = m.data().role === 'admin' ? 'admin' : 'member'; c.state = 'member';
        if(c.myTeams[tid] !== c.teamName) await setMyTeam(c, tid, c.teamName);
      }catch(e){ console.error('팀 정보를 읽지 못했습니다', e); c.state = 'error'; }
      return c;
    })();
    return ctxReady;
  }
  /* 화면 코드가 쓰는 경로를 현재 팀 아래로 */
  function scoped(fs, tid){ const P = 'teams/'+tid+'/'; return { doc: p => fs.doc(P+p), collection: p => fs.collection(P+p) }; }

  function fbUser(c){
    const F = c.F;
    return {
      id: async()=> c.uid,
      isOwner: async()=> c.isDev,
      canEdit: async()=> c.role === 'admin',
      can: async(n)=> n==='data.write' ? c.state === 'member' : null,
      me: async()=>({ id: c.uid, name: c.name }),
      profiles: async(ids)=>{ const out={}; await Promise.all((ids||[]).map(async id=>{ try{
          let sn = c.team ? await F.fs.doc(`teams/${c.team}/members/${id}`).get() : null;
          if(!sn || !sn.exists) sn = await F.fs.doc('profiles/'+id).get();
          out[id]={ name: sn.exists ? (sn.data().name||'') : '' }; }catch(e){ out[id]={name:''}; } })); return out; },
      signIn: async()=>{ await F.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); const u=F.auth.currentUser;
        if(u && u.displayName){ try{ await F.fs.doc('profiles/'+u.uid).set({name:u.displayName},{merge:true}); }catch(_){} } location.reload(); },
      signOut: async()=>{ await F.auth.signOut(); location.reload(); },
      signedIn: ()=> !!c.uid, email: ()=> c.email
    };
  }

  /* ---------- 팀 관리 (팀 패널에서 사용) ----------
     팀 이름: 4~40자, 중복 불가(대소문자 무시) → teamNames/<소문자 이름>
     비밀번호: 영문 대소문자·숫자 6자 이상(대소문자 구분). 원문은 저장하지 않고
     열쇠 = SHA-256(소문자 이름 + ':' + 비밀번호) → joinKeys/<열쇠> = {team}. 열쇠를 아는(=비밀번호를 아는) 사람만 가입 */
  const NAME_RE = /^[가-힣A-Za-z0-9 _-]{4,40}$/, PW_RE = /^[A-Za-z0-9]{6,64}$/;
  const norm = n => String(n||'').trim().replace(/\s+/g,' ');
  async function sha(t){ const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
  const keyOf = (name, pw) => sha(norm(name).toLowerCase() + ':' + pw);
  const err = (code, msg) => { const e = new Error(msg); e.code = code; return e; };
  const Team = {
    ctx: teamCtx, NAME_RE, PW_RE,
    check(name, pw){ name = norm(name);
      if(!NAME_RE.test(name)) throw err('name', '팀 이름은 4~40자, 한글·영문·숫자·공백·-·_ 만 쓸 수 있습니다.');
      if(!PW_RE.test(pw||'')) throw err('pw', '비밀번호는 영문 대소문자·숫자만, 6자 이상입니다.'); return name; },
    async choose(tid){ const c = await teamCtx(); lsSet(TEAMKEY, tid); if(c.uid){ try{ await c.F.fs.doc('users/'+c.uid).set({active: tid||null},{merge:true}); }catch(e){} } location.reload(); },
    async create(name, pw){ const c = await teamCtx(); name = Team.check(name, pw); const lower = name.toLowerCase(), fs = c.F.fs;
      const nm = await fs.doc('teamNames/'+lower).get(); if(nm.exists) throw err('dup', '이미 있는 팀 이름입니다. 가입하려면 그 팀의 비밀번호로 가입하십시오.');
      const key = await keyOf(name, pw), ref = fs.collection('teams').doc(), now = new Date().toISOString(), b = fs.batch();
      b.set(ref, {name, createdBy: c.uid, createdAt: now, key, lastActive: now});
      b.set(fs.doc('teamNames/'+lower), {team: ref.id});
      b.set(fs.doc('joinKeys/'+key), {team: ref.id});
      b.set(fs.doc(`teams/${ref.id}/members/${c.uid}`), {role:'admin', name: c.name, email: c.email, at: now});
      await b.commit(); await setMyTeam(c, ref.id, name); return Team.choose(ref.id); },
    async join(name, pw){ const c = await teamCtx(); name = Team.check(name, pw); const fs = c.F.fs, key = await keyOf(name, pw);
      let jk; try{ jk = await fs.doc('joinKeys/'+key).get(); }catch(e){ jk = null; }
      if(!jk || !jk.exists) throw err('nomatch', '팀 이름 또는 비밀번호가 맞지 않습니다.');
      const tid = jk.data().team, mref = fs.doc(`teams/${tid}/members/${c.uid}`), m = await mref.get();
      if(!m.exists) await mref.set({role:'member', name: c.name, email: c.email, at: new Date().toISOString(), via: key});
      let tn = name; try{ const t = await fs.doc('teams/'+tid).get(); if(t.exists) tn = t.data().name || name; }catch(e){}
      await setMyTeam(c, tid, tn); return Team.choose(tid); },
    async changePassword(pw){ const c = await teamCtx(); if(!PW_RE.test(pw||'')) throw err('pw', '비밀번호는 영문 대소문자·숫자만, 6자 이상입니다.');
      const fs = c.F.fs, key = await keyOf(c.teamName, pw); if(key === c.teamKey) throw err('same', '지금 비밀번호와 같습니다.');
      const b = fs.batch(); b.set(fs.doc('joinKeys/'+key), {team: c.team}); b.update(fs.doc('teams/'+c.team), {key});
      if(c.teamKey) b.delete(fs.doc('joinKeys/'+c.teamKey)); await b.commit(); c.teamKey = key; },
    async members(){ const c = await teamCtx(); const q = await c.F.fs.collection(`teams/${c.team}/members`).get(); return q.docs.map(d=>({uid:d.id, ...d.data()})); },
    async setRole(uid, role){ const c = await teamCtx(); await c.F.fs.doc(`teams/${c.team}/members/${uid}`).update({role}); },
    async remove(uid){ const c = await teamCtx(); await c.F.fs.doc(`teams/${c.team}/members/${uid}`).delete(); if(uid===c.uid){ lsSet(TEAMKEY, null); await setMyTeam(c, c.team, null); } },
    /* 팀 삭제: 팀 데이터·팀원·열쇠·이름을 모두 지움 (관리자). 팀 문서는 내 팀원 문서보다 먼저 지워야 규칙을 통과 */
    async deleteTeam(){ const c = await teamCtx(); if(c.role!=='admin') throw err('perm','관리자만 팀을 삭제할 수 있습니다.');
      const fs = c.F.fs, P = 'teams/'+c.team;
      for(const col of ['status','val','qa','meta']){ const q = await fs.collection(P+'/'+col).get(); await Promise.all(q.docs.map(d=>fs.doc(P+'/'+col+'/'+d.id).delete())); }
      const ms = await fs.collection(P+'/members').get(); await Promise.all(ms.docs.filter(d=>d.id!==c.uid).map(d=>fs.doc(P+'/members/'+d.id).delete()));
      if(c.teamKey){ try{ await fs.doc('joinKeys/'+c.teamKey).delete(); }catch(e){} }
      try{ await fs.doc('teamNames/'+norm(c.teamName).toLowerCase()).delete(); }catch(e){}
      await fs.doc(P).delete();
      await fs.doc(P+'/members/'+c.uid).delete();
      lsSet(TEAMKEY, null); await setMyTeam(c, c.team, null); },
    /* 백업: 진행 상태·우리 팀 값·질문·이번 시즌을 파일 하나로 */
    BACKUP_COLS: ['status','val','qa','meta'],
    async exportData(){ const c = await teamCtx(); const fs = c.F.fs, P = 'teams/'+c.team, data = {};
      for(const col of Team.BACKUP_COLS){ const q = await fs.collection(P+'/'+col).get(); data[col] = {}; q.docs.forEach(d=>{ data[col][d.id] = d.data(); }); }
      return {format:'run2x-team-backup', version:1, team:c.teamName, exportedAt:new Date().toISOString(), data}; },
    async importData(obj){ const c = await teamCtx(); if(c.role!=='admin') throw err('perm','관리자만 불러올 수 있습니다.');
      if(!obj || obj.format!=='run2x-team-backup' || !obj.data) throw err('fmt','이 사이트의 팀 백업 파일이 아닙니다.');
      const fs = c.F.fs, P = 'teams/'+c.team, ops = [];
      for(const col of Team.BACKUP_COLS){ const q = await fs.collection(P+'/'+col).get(); q.docs.forEach(d=>ops.push(['del', P+'/'+col+'/'+d.id])); }
      for(const col of Team.BACKUP_COLS){ Object.entries(obj.data[col]||{}).forEach(([id,d])=>{ if(/^[^/]{1,200}$/.test(id) && d && typeof d==='object') ops.push(['set', P+'/'+col+'/'+id, d]); }); }
      for(let i=0;i<ops.length;i+=400){ const b = fs.batch(); ops.slice(i,i+400).forEach(o=> o[0]==='del' ? b.delete(fs.doc(o[1])) : b.set(fs.doc(o[1]), o[2])); await b.commit(); }
      return ops.filter(o=>o[0]==='set').length; },
    async mine(){ const c = await teamCtx(); return Object.entries(c.myTeams||{}).map(([id,name])=>({id, name})).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko')); },
    async feedback(text){ const c = await teamCtx(); await c.F.fs.collection('feedback').add({text: String(text).slice(0,4000), by: c.uid, name: c.name, email: c.email, team: c.teamName||'', at: new Date().toISOString(), url: location.href.split('#')[0]}); },
    async feedbackList(){ const c = await teamCtx(); const q = await c.F.fs.collection('feedback').orderBy('at','desc').limit(50).get(); return q.docs.map(d=>({id:d.id, ...d.data()})); },
    async feedbackDelete(id){ const c = await teamCtx(); await c.F.fs.doc('feedback/'+id).delete(); }
  };

  /* ---------- 공통 ---------- */
  async function use(name){
    const k = kind();
    if(k==='claude') return window.claude.use(name);
    if(k==='firebase'){ try{
        const c = await teamCtx();
        if(name==='db') return c.state === 'member' ? scoped(c.F.fs, c.team) : null;
        if(name==='user') return fbUser(c);
      }catch(e){ console.error('Firebase 연결 실패', e); } return null; }
    return null;
  }
  /* 권한 거부 오류인지 (Claude: invalid_argument, Firestore: permission-denied) */
  const denied = e => !!e && (e.code==='invalid_argument' || e.code==='permission-denied');
  return { use, kind, denied, Team, available: ()=> kind()!=='none' };
})();
