/* ---------- 0.31.1 연결 안 됨: 저장·변경 버튼만 잠금 (입력·읽기·계산기는 그대로) ---------- */
const CONN_LOCK='.stbtn,[data-draft=save],.qa-f button[type=submit],.qa-esave,.qa-del,.tk-reply,.sn-prev,.sn-next,.sn-val,#st-reset,#st-yes';
const connOff=()=>document.body.classList.contains('conn-off');
const NOWRITE_LOCK='.qa-f button[type=submit],.qa-esave,.qa-del,.tk-reply';
document.addEventListener('click',e=>{ if(!document.body.classList.contains('no-write')) return; const b=e.target.closest(NOWRITE_LOCK); if(!b) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); toast('지금 권한으로는 글을 남길 수 없습니다.'); }, true);
document.addEventListener('click',e=>{ if(!connOff()) return; const b=e.target.closest(CONN_LOCK); if(!b) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); toast(window.__shReady?'연결 안 됨: 연결된 뒤에 저장할 수 있습니다.':'연결 확인 중입니다. 잠시 후 다시 시도해 주십시오.'); }, true);
document.addEventListener('submit',e=>{ if(!connOff() || !e.target.closest('.qa-f')) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); toast('연결 안 됨: 연결된 뒤에 남길 수 있습니다.'); }, true);

/* ---------- 0.32.0 디버깅(시험) 모드: #debug 로 켜기, 테두리 빨간 선 + 진단 버블 ---------- */
if(window.DEBUG){
  initShared=async function(){ window.__shReady=true; try{ refreshMode(); applyModes(); }catch(e){} };
}
window.addEventListener('hashchange',()=>{ if(location.hash==='#debug' && !window.DEBUG) location.reload(); });
/* #debug 를 열면 먼저 일반 화면으로 띄우고 개발자인지 확인 → 맞으면 확인 표시를 남기고 디버깅으로 다시 엶 (다른 사람에게는 디버깅 화면이 보이지 않음) */
if(window.__dbgPending){ (async()=>{ let ok=false; try{ const RC=window.RUN2X_CONFIG||{};
    const real = RC.firebase&&RC.firebase.apiKey ? 'firebase' : (window.claude&&typeof window.claude.use==='function') ? 'claude' : 'none';
    if(real==='none') ok=true; else { const u = real==='claude' ? await window.claude.use('user') : await Backend.use('user'); ok = !!u && (await u.isOwner())===true; } }catch(e){ ok=false; }
  if(ok){ try{ sessionStorage.setItem('run2x.dbgOk','1'); }catch(e){} location.reload(); return; }
  try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} try{ toast('디버깅은 사이트 개발자만 쓸 수 있습니다.'); }catch(e){} })(); }
function initDebug(){ if(!window.DEBUG) return; document.body.classList.add('dbg');
  (async()=>{ try{ const RC=window.RUN2X_CONFIG||{}; const real = RC.firebase&&RC.firebase.apiKey ? 'firebase' : (window.claude&&typeof window.claude.use==='function') ? 'claude' : 'none'; if(real==='none') return; const u = real==='claude' ? await window.claude.use('user') : await (async()=>{ const D=window.DEBUG; window.DEBUG=false; try{ return await Backend.use('user'); } finally{ window.DEBUG=D; } })(); if(!u) return; const ce=await u.isOwner(); if(ce!==true){ try{ sessionStorage.removeItem('run2x.dbgOk'); }catch(e){} try{ history.replaceState.call(history,null,'',location.pathname+location.search); }catch(e){} try{ location.hash=''; }catch(e){} location.reload(); } }catch(e){} })();
  const b=document.createElement('div'); b.id='dbgBub'; b.innerHTML='<button type="button" class="dbg-dot" title="디버깅 진단 (끌어서 이동)" aria-label="디버깅 진단">DBG</button><div class="dbg-pop" hidden></div>'; document.body.appendChild(b);
  const dot=b.querySelector('.dbg-dot'), pop=b.querySelector('.dbg-pop');
  const place=(x,y)=>{ const W=innerWidth, H=innerHeight; x=Math.max(4,Math.min(W-44,x)); y=Math.max(4,Math.min(H-44,y)); b.style.left=x+'px'; b.style.top=y+'px'; b.dataset.x=x; b.dataset.y=y; posPop(); };
  const posPop=()=>{ if(pop.hidden) return; const x=+b.dataset.x, y=+b.dataset.y; pop.style.left = (x > innerWidth/2) ? 'auto' : '44px'; pop.style.right = (x > innerWidth/2) ? '44px' : 'auto'; pop.style.top = (y > innerHeight/2) ? 'auto' : '0'; pop.style.bottom = (y > innerHeight/2) ? '0' : 'auto'; };
  const sv=(PREF('dbgpos','')||'').split(','); if(sv.length===2 && isFinite(+sv[0])) place(+sv[0],+sv[1]); else place(innerWidth-58, innerHeight-120);
  addEventListener('resize',()=>place(+b.dataset.x,+b.dataset.y));
  let drag=null;
  dot.addEventListener('pointerdown',e=>{ drag={sx:e.clientX, sy:e.clientY, x:+b.dataset.x, y:+b.dataset.y, moved:false}; dot.setPointerCapture(e.pointerId); });
  dot.addEventListener('pointermove',e=>{ if(!drag) return; const dx=e.clientX-drag.sx, dy=e.clientY-drag.sy; if(Math.abs(dx)+Math.abs(dy)>4) drag.moved=true; if(drag.moved) place(drag.x+dx, drag.y+dy); });
  dot.addEventListener('pointerup',()=>{ if(!drag) return; const mv=drag.moved; drag=null; if(mv){ SETP('dbgpos', b.dataset.x+','+b.dataset.y); return; } pop.hidden=!pop.hidden; if(!pop.hidden){ render(); posPop(); } });
  const ver=()=>{ const v=document.querySelector('#verline .vl-ver b'); return v?v.textContent:'?'; };
  const cnt=()=>{ const q=Object.values(QA||{}).filter(isTalk).length, st=Object.keys(STATUS||{}).length; let tv=0; Object.values(VAL||{}).forEach(r=>{ if(r&&r.s&&r.s[SEASON]&&valFilled(Object.fromEntries(Object.entries(r.s[SEASON]).map(([k,o])=>[k,o&&o.v])))) tv++; }); return {q,st,tv}; };
  let ask=false;
  function render(){ if(pop.hidden) return; const c=cnt(), er=window.__dbgErr||[];
    pop.innerHTML=`<div class="dbg-h">디버깅 <span>팀 데이터에 저장되지 않음</span></div>
      <table><tr><th>공유 저장소</th><td>사용 안 함 (디버깅 데이터는 이 브라우저에만)</td></tr>
      <tr><th>시즌</th><td>${esc(SEASON)}</td></tr><tr><th>화면 모드</th><td>${UMODE==='manage'?'관리자':'보기'}</td></tr>
      <tr><th>디버깅 데이터</th><td>논의 ${c.q} · 진행 상태 ${c.st} · 팀 값 ${c.tv}</td></tr>
      <tr><th>내용 버전</th><td>${esc(ver())}</td></tr>
      <tr><th>오류</th><td>${er.length? er.map(x=>`<div class="dbg-er"><b>${x.t}</b> ${esc(x.m)}</div>`).join('') : '<span class="muted">없음</span>'}</td></tr></table>
      ${ask ? `<div class="dbg-ask">디버깅 데이터를 어떻게 할까요?<div><button class="btn small" data-dbg="keep">남기고 끄기</button><button class="btn small" data-dbg="wipe">지우고 끄기</button><button class="btn small" data-dbg="cancel">취소</button></div></div>`
            : `<div class="dbg-btns"><button class="btn small" data-dbg="clear">디버깅 데이터 지우기</button><button class="btn small pri" data-dbg="off">디버깅 끄기</button></div>`}`; }
  window.__dbgRender=render;
  const leave=()=>{ try{ history.replaceState.call(history,null,'',location.pathname+location.search); }catch(e){} try{ location.hash=''; }catch(e){} location.reload(); };
  pop.addEventListener('click',e=>{ const a=e.target.closest('[data-dbg]'); if(!a) return; const k=a.dataset.dbg;
    if(k==='clear'){ const n=window.__dbgClear(); toast(`디버깅 데이터 ${n}건을 지웠습니다. 새로고침합니다`); setTimeout(()=>location.reload(),700); }
    else if(k==='off'){ ask=true; render(); } else if(k==='cancel'){ ask=false; render(); }
    else if(k==='keep'){ leave(); } else if(k==='wipe'){ window.__dbgClear(); leave(); } });
  setInterval(render, 2000);
}
