/* ============================================================
   저장소 어댑터 — 화면 코드는 Backend.use('db' | 'user')만 부릅니다.
   우선순위: 디버깅이면 없음 → Firebase 설정이 있으면 Firebase → Claude 아티팩트 안이면 Claude → 없음
   db는 Firestore와 같은 모양(doc/collection/onSnapshot/set/update/delete/add)입니다.
   ============================================================ */
window.Backend = (function(){
  const CFG = window.RUN2X_CONFIG || {};
  const hasFB = () => !!(CFG.firebase && CFG.firebase.apiKey);
  const hasClaude = () => !!(window.claude && typeof window.claude.use === 'function');
  const kind = () => window.DEBUG ? 'none' : hasFB() ? 'firebase' : hasClaude() ? 'claude' : 'none';

  /* ---------- Firebase ---------- */
  let fbReady = null;
  function loadScript(src){ return new Promise((ok, no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
  function fbInit(){
    if(fbReady) return fbReady;
    const v = CFG.firebaseSdk || '10.14.1', base = 'https://www.gstatic.com/firebasejs/'+v+'/';
    fbReady = (async()=>{
      await loadScript(base+'firebase-app-compat.js');
      await Promise.all([loadScript(base+'firebase-auth-compat.js'), loadScript(base+'firebase-firestore-compat.js')]);
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG.firebase);
      const auth = firebase.auth(), fs = firebase.firestore();
      /* 로그인 상태 복원을 기다림. 로그인하지 않은 방문자는 읽기만 (질문은 구글 로그인 필요) */
      await new Promise(res=>{ const off = auth.onAuthStateChanged(()=>{ off(); res(); }); });
      return {app, auth, fs};
    })();
    return fbReady;
  }
  async function roles(fs){ try{ const sn = await fs.doc('meta/roles').get(); return sn.exists ? (sn.data()||{}) : {}; }catch(e){ return {}; } }
  function fbUser(F){
    const cur = () => F.auth.currentUser;
    const email = () => (cur() && !cur().isAnonymous && cur().email || '').toLowerCase();
    const devs = (CFG.developers||[]).map(x=>String(x).toLowerCase());
    return {
      id: async()=> cur() ? cur().uid : null,
      isOwner: async()=> !!email() && devs.includes(email()),
      canEdit: async()=>{ const e=email(); if(!e) return false; if(devs.includes(e)) return true; const r=await roles(F.fs); return (r.admins||[]).map(x=>String(x).toLowerCase()).includes(e); },
      can: async(n)=> n==='data.write' ? !!email() : null,
      me: async()=>({ id: cur()?cur().uid:null, name: cur() && cur().displayName || '' }),
      profiles: async(ids)=>{ const out={}; await Promise.all((ids||[]).map(async id=>{ try{ const sn=await F.fs.doc('profiles/'+id).get(); out[id]={ name: sn.exists ? (sn.data().name||'') : '' }; }catch(e){ out[id]={name:''}; } })); return out; },
      signIn: async()=>{ await F.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); const c=cur(); if(c && c.displayName){ try{ await F.fs.doc('profiles/'+c.uid).set({name:c.displayName},{merge:true}); }catch(_){} } location.reload(); },
      signOut: async()=>{ await F.auth.signOut(); location.reload(); },
      signedIn: ()=> !!email(), email
    };
  }

  /* ---------- 공통 ---------- */
  async function use(name){
    const k = kind();
    if(k==='claude') return window.claude.use(name);
    if(k==='firebase'){ try{ const F = await fbInit(); if(name==='db') return F.fs; if(name==='user') return fbUser(F); }catch(e){ console.error('Firebase 연결 실패', e); } return null; }
    return null;
  }
  /* 권한 거부 오류인지 (Claude: invalid_argument, Firestore: permission-denied) */
  const denied = e => !!e && (e.code==='invalid_argument' || e.code==='permission-denied');
  return { use, kind, denied, available: ()=> kind()!=='none' };
})();
