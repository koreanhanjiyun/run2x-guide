/* ---------- 0.31.1 연결 안 됨: 저장·변경 버튼만 잠금 (입력·읽기·계산기는 그대로) ---------- */
const CONN_LOCK='.stbtn,[data-draft=save],.qa-f button[type=submit],.qa-esave,.qa-del,.tk-reply,.sn-prev,.sn-next,.sn-val';
const connOff=()=>document.body.classList.contains('conn-off');
const NOWRITE_LOCK='.qa-f button[type=submit],.qa-esave,.qa-del,.tk-reply';
document.addEventListener('click',e=>{ if(!document.body.classList.contains('no-write')) return; const b=e.target.closest(NOWRITE_LOCK); if(!b) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); toast('지금 권한으로는 글을 남길 수 없습니다.'); }, true);
document.addEventListener('click',e=>{ if(!connOff()) return; const b=e.target.closest(CONN_LOCK); if(!b) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); toast(window.__shReady?'연결 안 됨: 연결된 뒤에 저장할 수 있습니다.':'연결 확인 중입니다. 잠시 후 다시 시도해 주십시오.'); }, true);
document.addEventListener('submit',e=>{ if(!connOff() || !e.target.closest('.qa-f')) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); toast('연결 안 됨: 연결된 뒤에 남길 수 있습니다.'); }, true);
