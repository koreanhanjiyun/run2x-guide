/* ============================================================
   시작 탭 (A1·A2·A7·A12·E1)
   - 첫 화면: F1 → FS 이야기, 목표 카드 5장(누르면 그 목표 화면), 시스템 카드(누르면 그 시스템 화면)
   - 목표 화면: 예전 목표 탭 내용 (세부 목표 ①~⑧, 근거·판단 기준·관련 설계 항목)
   - 시스템 화면: 왜 생겼나 · F1에서 어떻게 발전했나 · FS에서는 · 구성 부품(1열, 그림 왼쪽·글 오른쪽) · F1이 시도한 기술(가로로 넘김)
   - 예전 부품 탭은 없앰: 부품 소개는 시스템 화면으로, 설계 인자는 설계 단계 항목으로
   ============================================================ */
const START = { sys: PREF('startsys','') };
const bgMark = t => String(t||'').replace(/\[확인 필요\]/g,'<span class="badge b-verify" title="출처로 더 확인해야 하는 문장">확인 필요</span>');
const compOf = p => (typeof COMP!=='undefined' && COMP[p]) || [];
const techOf = p => { if(typeof F1_TECH==='undefined') return []; const g=F1_TECH.find(x=>x.sys===p); return g ? g.items : []; };
const firstSent = t => { const s=String(t||'').replace(/<[^>]+>/g,'').replace(/\[확인 필요\]/g,''); const m=s.match(/^.*?[다요]\./); return (m?m[0]:s).slice(0,90); };
function srcList(arr){ return (arr||[]).map(x=>{ if(typeof x==='string'){ const m=x.match(/^(.*?)\s*[—-]\s*(https?:\/\/\S+)$/); return m ? `<li><a href="${esc(m[2])}" target="_blank" rel="noopener">${esc(m[1])}</a></li>` : `<li>${esc(x)}</li>`; }
  return `<li>${x.u?`<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a>`:esc(x.t)}${x.note?` <span class="muted">${esc(x.note)}</span>`:''}</li>`; }).join(''); }
function techRail(items){ return `<div class="f1t-rail"><button type="button" class="f1r-b f1r-prev" aria-label="앞 카드">‹</button>${techHTML(items, ' f1t-row')}<button type="button" class="f1r-b f1r-next" aria-label="다음 카드">›</button></div>`; }
function techHTML(items, cls=''){ return `<div class="f1t-list${cls}">${items.map(t=>`<article class="f1t"><div class="f1t-h"><span class="f1t-y">${esc(t.y||'')}</span><b>${t.n}</b>${t.en?`<span class="muted">${esc(t.en)}</span>`:''}</div>
  <dl><dt>원리</dt><dd>${bgMark(t.how)}</dd><dt>무엇이 빨라졌나</dt><dd>${bgMark(t.gain)}</dd>${t.end?`<dt>어떻게 끝났나</dt><dd>${bgMark(t.end)}</dd>`:''}</dl></article>`).join('')}</div>`; }
function compHTML(c){ const fig=(typeof COMP_FIG!=='undefined' && COMP_FIG[c.id]) || '';
  const go=(c.go||[]).filter(id=>IT[id]);
  return `<article class="cp-card" id="cp-${c.id}">${fig?`<div class="cp-fig">${fig}</div>`:''}<div class="cp-b">
    <h3>${c.n}${c.en?` <span class="muted">${esc(c.en)}</span>`:''}</h3>
    ${c.desc?`<div class="cp-desc">${c.desc.map(t=>`<p>${bgMark(t)}</p>`).join('')}</div>`:`<p class="cp-what">${bgMark(c.what)}</p>`}
    <dl>${c.desc?'':`<dt>하는 일</dt><dd>${bgMark(c.role)}</dd>`}<dt>FS에서는</dt><dd>${bgMark(c.fs)}</dd>${c.con?`<dt>주의</dt><dd>${bgMark(c.con)}</dd>`:''}</dl>
    ${go.length?`<div class="cp-go"><span class="sec-label">이 부품을 정하는 설계 항목</span><div class="chips">${go.map(id=>`<button type="button" class="chip" data-goto="${id}"><span class="dot" style="background:${pc(IT[id].p)}"></span>${IT[id].s} · ${IT[id].n}</button>`).join('')}</div></div>`:''}
  </div></article>`; }

function renderStart(sys){ const v=$('#v-start'); if(!v) return;
  if(sys!==undefined){ START.sys = sys||''; SETP('startsys', START.sys); }
  const gm = /^goal:(\d+)$/.exec(START.sys||''); const gi = gm && GOALS[+gm[1]] ? +gm[1] : -1;
  const s = gi<0 && START.sys && BG_SYS.find(x=>x.p===START.sys);
  const key = gi>=0 ? 'goal:'+gi : (s?s.p:'_home');
  if(v.dataset.done===key) return; v.dataset.done = key;
  v.innerHTML = gi>=0 ? goalPage(gi) : s ? sysPage(s) : homePage();
  if(gi>=0) v.querySelectorAll('.gp-subs > details.item').forEach((d,di)=>{ d.id='g-'+gi+'-'+di; });
  if(s && typeof loadCompFigs==='function' && COMP_FIG_STATE!==2) loadCompFigs(()=>{ if(START.sys===s.p){ const y=scrollY; delete v.dataset.done; renderStart(); window.scrollTo({top:y,behavior:'instant'}); } });
  try{ renderMath(v); }catch(e){}
  try{ if(typeof annotate==='function') v.querySelectorAll('.st-card dd, .sp-sec p, .cp-b dd, .cp-what, .cp-desc p, .gp-why, .gwhy').forEach(x=>annotate(x)); }catch(e){}
}
function sysCard(s){ const n=compOf(s.p).length;
  return `<button type="button" class="st-card" data-sysgo="${s.p}"><span class="st-ch"><span class="dot" style="background:${pc(s.p)}"></span><b>${s.t}</b></span>
    <span class="st-cw">${esc(firstSent(s.why))}</span><span class="st-cm">${n?`부품 ${n}개`:'목표와 연결'} ›</span></button>`; }
function goalCards(){ if(typeof GOALS==='undefined') return '';
  return `<section class="st-goals"><h2>목표는 하나, 더 빠른 차</h2><p class="st-gl">${esc(GOAL_TOP.s)}. 빠른 차를 다섯 가지로 나누면 이렇습니다.</p>
    <div class="st-gcards">${GOALS.map((m,mi)=>`<button type="button" class="st-card st-gcard" data-goalgo="${mi}"><span class="st-ch"><span class="st-gn">${mi+1}</span><b>${m.t}</b></span>
      <span class="st-cw">${esc(m.s)}</span><span class="st-cm">세부 목표 ${m.subs.length}개 ›</span></button>`).join('')}</div></section>`; }
function homePage(){ const sysOf=p=>BG_SYS.find(x=>x.p===p);
  return `<header class="top st-hero">
      <span class="eyebrow">처음 왔다면 여기부터</span>
      <h1>더 빠른 차를 만드는 일</h1>
      <p class="lede">${BG_INTRO}</p>
    </header>
    ${typeof BG_STORY!=='undefined' ? `<section class="st-story" aria-label="자동차에서 Formula Student까지"><ol>${BG_STORY.map(x=>`<li><span class="ss-y">${x.y}</span><b>${x.t}</b><p>${x.b}</p></li>`).join('')}</ol></section>` : ''}
    ${goalCards()}
    <section class="st-sysw"><h2>더 빠르게 하려면?</h2>
      ${typeof BG_ASK!=='undefined' ? BG_ASK.map(g=>`<div class="st-ask"><div class="sa-q"><b>${g.q}</b><span>${g.a}</span></div><div class="st-sys">${g.p.map(sysOf).filter(Boolean).map(sysCard).join('')}</div></div>`).join('')
        : `<div class="st-sys">${BG_SYS.map(sysCard).join('')}</div>`}
      <p class="st-goal">실제로 설계하는 순서는 <button type="button" class="lnk" data-tabgo="steps">설계</button> 탭입니다. 사이트 사용법은 <button type="button" class="lnk" data-tour="all">여기</button>에서 볼 수 있습니다.</p>
    </section>`;
}
/* 목표 화면: 예전 목표 탭의 한 갈래 = 세부 목표(목표·근거·판단 기준·관련 설계 항목) */
function goalPage(mi){ const m=GOALS[mi], prev=GOALS[mi-1], next=GOALS[mi+1];
  const nav=`<nav class="sp-nav"><button type="button" class="btn small" data-sysgo="">← 처음 화면</button><span class="sp-pn">${prev?`<button type="button" class="lnk" data-goalgo="${mi-1}">‹ ${prev.t}</button>`:''}${next?`<button type="button" class="lnk" data-goalgo="${mi+1}">${next.t} ›</button>`:''}</span></nav>`;
  return `${nav}
    <header class="top sp-head"><span class="eyebrow"><span class="st-gn">${mi+1}</span> 목표</span><h1>${m.t}</h1><p class="lede">${esc(m.s)}</p></header>
    <section class="sp-sec gp-sec"><p class="gp-why">${m.why}</p></section>
    <section class="sp-comp"><h2>세부 목표 <span class="muted">${m.subs.length}개 · 펼치면 근거와 판단 기준, 이 목표를 다루는 설계 항목</span></h2><div class="stack gp-subs">${m.subs.map(goalSubHTML).join('')}</div></section>
    ${nav.replace('class="sp-nav"','class="sp-nav sp-foot"')}`; }
function openGoalPage(mi, di){ pushHist(); if(TAB!=='start') showTab('start', true); renderStart('goal:'+mi); window.scrollTo({top:0, behavior:'instant'});
  if(di!=null) requestAnimationFrame(()=>{ const d=document.getElementById('g-'+mi+'-'+di); if(!d) return; d.open=true; const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50; window.scrollTo({top:d.getBoundingClientRect().top+scrollY-tabh-16, behavior:'instant'}); try{ markHere(d); }catch(e){} }); }
function sysPage(s){ const cs=compOf(s.p), tech=techOf(s.p), i=BG_SYS.indexOf(s), prev=BG_SYS[i-1], next=BG_SYS[i+1];
  const steps=[...new Set(ITEMS.filter(x=>x.p===s.p).map(x=>x.s))].sort((a,b)=>SIDX[a]-SIDX[b]);
  return `<nav class="sp-nav"><button type="button" class="btn small" data-sysgo="">← 모든 시스템</button><span class="sp-pn">${prev?`<button type="button" class="lnk" data-sysgo="${prev.p}">‹ ${prev.t}</button>`:''}${next?`<button type="button" class="lnk" data-sysgo="${next.p}">${next.t} ›</button>`:''}</span></nav>
    <header class="top sp-head"><span class="eyebrow"><span class="dot" style="background:${pc(s.p)}"></span> 시스템</span><h1>${s.t}</h1></header>
    <div class="sp-grid">
      <section class="sp-sec"><h2>왜 생겼나</h2><p>${bgMark(s.why)}</p></section>
      <section class="sp-sec"><h2>F1에서 어떻게 발전했나</h2><p>${bgMark(s.hist)}</p></section>
      <section class="sp-sec sp-fs"><h2>FS에서는</h2><p>${bgMark(s.fs)}</p>
        ${steps.length?`<div class="st-links"><span class="sec-label">이 시스템을 설계하는 단계</span>${steps.map(sid=>`<button type="button" class="lnk" data-stepgo="${sid}">${sid}</button>`).join('')}</div>`:''}
</section>
    </div>
    ${cs.length?`<section class="sp-comp"><h2>구성 부품 <span class="muted">${cs.length}개 · FS 차량에서 흔한 모양 기준</span></h2><div class="cp-grid cp-one">${cs.map(compHTML).join('')}</div></section>`:''}
    ${tech.length?`<section class="sp-tech"><h2>F1이 시도한 ${s.t} 기술 <span class="muted">${tech.length}가지 · 옆으로 넘겨 보십시오</span></h2>${techRail(tech)}</section>`:''}
    <nav class="sp-nav sp-foot"><button type="button" class="btn small" data-sysgo="">← 모든 시스템</button><span class="sp-pn">${prev?`<button type="button" class="lnk" data-sysgo="${prev.p}">‹ ${prev.t}</button>`:''}${next?`<button type="button" class="lnk" data-sysgo="${next.p}">${next.t} ›</button>`:''}</span></nav>`;
}
function openSys(p, part){ pushHist(); if(TAB!=='start') showTab('start', true); renderStart(p||''); window.scrollTo({top:0, behavior:'instant'});
  if(part) requestAnimationFrame(()=>{ const el=document.getElementById('cp-'+part); if(el){ const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50; window.scrollTo({top:el.getBoundingClientRect().top+scrollY-tabh-12, behavior:'instant'}); markHere(el); } }); }


/* 항목 맨 위 '배경' 칸: 기본 접힘, 펼침 상태는 이 브라우저에 기억 */
ITEM_HOOKS.push((d,b)=>{ const txt=BG_ITEM[d.dataset.item]; if(!txt || b.querySelector('.bgbox')) return;
  const x=document.createElement('details'); x.className='bgbox'; x.open=PREF('bgopen','0')==='1'; x.innerHTML=`<summary><b>배경</b><span class="muted">처음 보는 사람을 위한 설명</span></summary><div class="bgb">${bgMark(txt)}</div>`; b.prepend(x); });
{ document.addEventListener('toggle', e=>{ if(e.target.classList && e.target.classList.contains('bgbox')){ SETP('bgopen', e.target.open?'1':'0'); document.querySelectorAll('.bgbox').forEach(o=>{ if(o!==e.target && o.open!==e.target.open) o.open=e.target.open; }); } }, true); }

document.addEventListener('click', e=>{
  const t=e.target.closest('[data-tabgo]'); if(t){ e.preventDefault(); pushHist(); showTab(t.dataset.tabgo); return; }
  const gg=e.target.closest('[data-goalgo]'); if(gg){ e.preventDefault(); openGoalPage(+gg.dataset.goalgo); return; }
  const fr=e.target.closest('.f1r-b'); if(fr){ e.preventDefault(); const l=fr.parentElement.querySelector('.f1t-row'); const xs=[...l.querySelectorAll('.f1t')].map(c=>c.offsetLeft-l.firstElementChild.offsetLeft); const x=l.scrollLeft, nx=fr.classList.contains('f1r-next'); let t=nx ? xs.find(v=>v>x+4) : [...xs].reverse().find(v=>v<x-4); if(t==null) t = nx ? l.scrollWidth : 0; animScrollLeft(l, t); return; }   // 버튼을 누를 때만 카드 왼쪽에 맞춤 (끌기는 놓은 자리 그대로)
  const y=e.target.closest('[data-sysgo]'); if(y){ e.preventDefault(); const p=y.dataset.sysgo; if(p==='공통' && !compOf('공통').length){ openSys('공통'); return; } openSys(p); return; }
  const c=e.target.closest('[data-cpgo]'); if(c){ e.preventDefault(); const el=document.getElementById('cp-'+c.dataset.cpgo); if(el){ const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50; smoothScrollTo(()=>el.getBoundingClientRect().top+scrollY-tabh-12, ()=>markHere(el)); } return; }
  const s=e.target.closest('[data-stepgo]'); if(s){ e.preventDefault(); openStep(s.dataset.stepgo); return; }
});

/* F1 기술 카드 줄: 마우스로 끌어 넘기기 (세로 휠은 그대로 페이지 스크롤, 가로 휠·Shift+휠은 줄 이동) */
{ let drag=null;
  document.addEventListener('pointerdown', e=>{ const l=e.target.closest && e.target.closest('.f1t-row'); if(!l || e.button!==0) return; drag={l, x:e.clientX, s:l.scrollLeft, moved:false, id:e.pointerId}; });
  document.addEventListener('pointermove', e=>{ if(!drag) return; const dx=e.clientX-drag.x; if(!drag.moved && Math.abs(dx)<5) return; if(!drag.moved){ drag.moved=true; drag.l.classList.add('dragging'); try{ drag.l.setPointerCapture(drag.id); }catch(_){} } drag.l.scrollLeft=drag.s-dx; e.preventDefault(); });
  const end=()=>{ if(!drag) return; const l=drag.l, mv=drag.moved; drag=null; l.classList.remove('dragging'); if(mv){ const stop=ev=>{ ev.stopPropagation(); ev.preventDefault(); }; l.addEventListener('click', stop, {capture:true, once:true}); setTimeout(()=>l.removeEventListener('click', stop, true), 0); } };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('wheel', e=>{ const l=e.target.closest && e.target.closest('.f1t-row'); if(!l) return; const d = e.shiftKey ? e.deltaY : (Math.abs(e.deltaX)>Math.abs(e.deltaY) ? e.deltaX : 0); if(!d) return; e.preventDefault(); l.scrollLeft += d; }, {passive:false});
}
