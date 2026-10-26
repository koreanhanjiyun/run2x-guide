/* ============================================================
   시작 탭 (신입용 배경) + 항목 '배경' 칸
   - 시스템 카드: 왜 있나 · 어떻게 발전했나 · FS에서는 → 부품·설계 단계로 이동
   - "F1에서 금지된 기술"은 참고 탭에서 이곳으로 옮김
   ============================================================ */
function renderStart(){ const v=$('#v-start'); if(!v || v.dataset.done) return; v.dataset.done='1';
  const stepsOf = p => [...new Set(ITEMS.filter(i=>i.p===p).map(i=>i.s))].sort((a,b)=>SIDX[a]-SIDX[b]);
  const f1 = (typeof REFS!=='undefined') ? REFS.find(r=>/F1에서 금지된 기술/.test(r.t)) : null;
  v.innerHTML = `<header class="top st-hero">
      <span class="eyebrow">처음 왔다면 여기부터</span>
      <h1>레이스카는 왜 이렇게 생겼나</h1>
      <p class="lede">${BG_INTRO}</p>
      <div class="st-entry">
        <button type="button" class="st-go" data-tabgo="goals"><b>왜 만드나</b><span>점수와 목표</span></button>
        <button type="button" class="st-go" data-tabgo="parts"><b>무엇을 만드나</b><span>부품과 설계 인자</span></button>
        <button type="button" class="st-go" data-tabgo="steps"><b>어떤 순서로 설계하나</b><span>설계 단계 P0 → P10</span></button>
        <button type="button" class="st-go st-tour" data-tour="all"><b>사이트 사용법</b><span>버튼 위치와 기능 둘러보기</span></button>
      </div>
      <p class="st-draft"><span class="badge b-verify">초안</span> 아래 배경 글은 입문용 읽을거리입니다. 설계 판단은 각 항목의 근거를 따르십시오.</p>
    </header>
    <section class="st-sys">${BG_SYS.map(s=>`<article class="st-card" data-sys="${s.p}">
      <h2><span class="dot" style="background:${pc(s.p)}"></span>${s.t}</h2>
      <dl><dt>왜 있나</dt><dd>${s.why}</dd><dt>어떻게 발전했나</dt><dd>${s.hist.replace('[확인 필요]','<span class="badge b-verify">확인 필요</span>')}</dd><dt>FS에서는</dt><dd>${s.fs}</dd></dl>
      <div class="st-links">${s.p!=='공통'?`<button type="button" class="btn small" data-partgo="${s.p}">부품 보기</button>`:'<button type="button" class="btn small" data-tabgo="goals">목표 보기</button>'}
        ${stepsOf(s.p).slice(0,6).map(sid=>`<button type="button" class="lnk" data-stepgo="${sid}">${sid}</button>`).join('')}</div>
    </article>`).join('')}</section>
    ${f1 ? `<section class="st-f1"><h2>${f1.t} <span class="muted">· 규정이 기술을 어떻게 막아 왔나</span></h2><div class="st-f1b">${f1.b}</div></section>` : ''}`;
  try{ renderMath(v); }catch(e){}
}
/* 참고 탭에서는 F1 항목을 뺌 */
renderRefs = function(){ $('#ref-list').innerHTML = REFS.filter(r=>!/F1에서 금지된 기술/.test(r.t)).map(r=>`<details class="step"><summary><span class="stitle">${r.t}</span><span class="ssub">${r.s}</span></summary><div class="dbody">${r.b}</div></details>`).join(''); };

/* 항목 맨 위 '배경' 칸: 기본 접힘, 펼침 상태는 이 브라우저에 기억 */
function initItemBg(){ const open = PREF('bgopen','0')==='1';
  Object.entries(BG_ITEM).forEach(([id, txt])=>{ const d=document.getElementById('it-'+id); const b=d && d.querySelector(':scope>.dbody'); if(!b || b.querySelector('.bgbox')) return;
    const x=document.createElement('details'); x.className='bgbox'; x.open=open; x.innerHTML=`<summary><b>배경</b><span class="muted">처음 보는 사람을 위한 설명</span></summary><div class="bgb">${txt}</div>`; b.prepend(x); });
  document.addEventListener('toggle', e=>{ if(e.target.classList && e.target.classList.contains('bgbox')){ SETP('bgopen', e.target.open?'1':'0'); document.querySelectorAll('.bgbox').forEach(o=>{ if(o!==e.target && o.open!==e.target.open) o.open=e.target.open; }); } }, true); }

document.addEventListener('click', e=>{
  const t=e.target.closest('[data-tabgo]'); if(t){ e.preventDefault(); pushHist(); showTab(t.dataset.tabgo); return; }
  const p=e.target.closest('[data-partgo]'); if(p){ e.preventDefault(); pushHist(); showTab('parts'); requestAnimationFrame(()=>{ const s=document.querySelector(`#part-tree .ptsys[data-sys="${p.dataset.partgo}"]`); if(s) smoothScrollTo(()=>s.getBoundingClientRect().top+scrollY-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50)-16); }); return; }
  const s=e.target.closest('[data-stepgo]'); if(s){ e.preventDefault(); openStep(s.dataset.stepgo); return; }
});
