/* ---------- 관리자 로그인 (Firebase 저장소일 때만 하단에 표시) ---------- */
(function(){
  if(!window.Backend || Backend.kind()!=='firebase') return;
  const put = async()=>{ const vl=document.getElementById('verline'); if(!vl) return; const u=await Backend.use('user'); if(!u) return;
    const b=document.createElement('button'); b.type='button'; b.className='authbtn';
    b.textContent = u.signedIn() ? `로그아웃 (${u.email()})` : '관리자 로그인';
    b.addEventListener('click', ()=>{ (u.signedIn() ? u.signOut() : u.signIn()).catch(e=>{ try{ toast('로그인하지 못했습니다.'); }catch(_){} console.error(e); }); });
    vl.appendChild(b); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', put); else put();
})();
