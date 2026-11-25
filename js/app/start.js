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
  if(v.dataset.done===key){ heroSync(); if(key==='_home') heroIntro(v); return; } v.dataset.done = key;
  v.innerHTML = gi>=0 ? goalPage(gi) : s ? sysPage(s) : homePage();
  if(gi>=0) v.querySelectorAll('.gp-subs > .gsub').forEach((d,di)=>{ d.id='g-'+gi+'-'+di; });
  if(s && typeof loadCompFigs==='function' && COMP_FIG_STATE!==2) loadCompFigs(()=>{ if(START.sys===s.p){ const y=scrollY; delete v.dataset.done; renderStart(); window.scrollTo({top:y,behavior:'instant'}); } });
  try{ renderMath(v); }catch(e){}
  try{ if(typeof annotate==='function') v.querySelectorAll('.st-card dd, .sp-sec p, .cp-b dd, .cp-what, .cp-desc p, .gp-why, .gwhy, .gs-why').forEach(x=>annotate(x)); }catch(e){}
  heroSync(); if(key==='_home') heroIntro(v);
}
/* 히어로 등장 연출 (2026-11-22, 페이지를 열고 시작 탭 첫 화면을 처음 볼 때 한 번 · 약 3.4 초)
   0 ~ 0.9 s 사진 초점이 맞음 → 0.5 s · 0.9 s 왼쪽 어두운 쪽 가운데에 큰 제목이 두 덩이로 올라옴 → 1.6 ~ 2.6 s 제목이 작아지며 제자리(왼쪽)로
   → 2.5 s 작은 제목 · 밑줄이 그어짐 → 2.9 s 소개 문장. [둘러보기 ↓] 는 처음부터 보임.
   누르기 · 휠 · 키 · 스크롤이 있으면 바로 마지막 모습으로 건너뜀. 사용법 진행 중에는 연출하지 않음.
   fill 은 backwards 만: 끝나면 CSS 상태로 돌아감. [둘러보기]는 연출 끝에 튀어나오며 나타나고 그 전에는 누를 수 없음 */
let HERO_AN=[], HERO_DONE=false, HERO_PASSED=false;   /* 연출 · 히어로는 페이지를 열 때(접속 · 새로고침) 한 번만. [둘러보기]를 누른 뒤 같은 접속 안에서는 본문만 */
function heroSkip(){ HERO_AN.forEach(a=>{ try{ a.finish(); }catch(e){} }); HERO_AN=[]; heroReady(); }
/* [둘러보기]는 연출이 끝나야 누를 수 있음 (끝에 튀어나오며 나타남) */
function heroReady(){ const d=document.querySelector('#v-start .sh-down'); if(d) d.disabled=false; }
/* 히어로 화면과 본문은 따로: 히어로가 보이는 동안 페이지 스크롤을 막고, 넘어간 뒤에는 히어로를 빼서 위로 올려도 다시 나오지 않음 */
function heroSync(){ const v=document.querySelector('#v-start'); if(!v) return; v.classList.toggle('hero-passed', HERO_PASSED);
  const on = TAB==='start' && !START.sys && !HERO_PASSED && !!v.querySelector('.st-hero');
  document.documentElement.classList.toggle('hero-lock', on); if(on && scrollY) window.scrollTo({top:0, behavior:'instant'}); }
/* 히어로 → 본문: 히어로가 위로 밀려 올라가고 본문이 아래에서 올라옴 (vtGo 'hero'). 사용법 · 다른 코드에서는 바로 */
function heroPass(animate){ if(HERO_PASSED){ heroSync(); return; } heroSkip();
  const go=()=>{ HERO_PASSED=true; heroSync(); window.scrollTo({top:0, behavior:'instant'}); };
  if(animate) vtGo('hero', go); else go(); }
function heroIntro(v){ HERO_AN.forEach(a=>{ try{ a.finish(); }catch(e){} }); HERO_AN=[]; const h=v.querySelector('.st-hero');
  if(!h || HERO_PASSED) return; if(HERO_DONE || (typeof TR!=='undefined' && TR)){ heroReady(); return; }
  const t1=h.querySelector('h1'), ws=[...t1.querySelectorAll('.sh-w')], main=h.querySelector('.sh-main');
  const hr=h.getBoundingClientRect(), r=t1.getBoundingClientRect(); if(!hr.width || !r.width) return; HERO_DONE=true;
  const S=1.6, dx=(hr.left+hr.width*.3)-(r.left+r.width/2)   /* 큰 제목은 차(오른쪽)와 겹치지 않게 왼쪽 어두운 쪽 가운데(폭의 30 %) */, dy=(hr.top+Math.min(hr.height,innerHeight-hr.top)/2)-(r.top+r.height/2);
  const OUT='cubic-bezier(.16,1,.3,1)', IO='cubic-bezier(.45,0,.25,1)', big=`translate(${dx}px,${dy}px) scale(${S})`;
  const A=(el,k,o)=>{ if(el) HERO_AN.push(el.animate(k,{fill:'backwards',easing:OUT,...o})); };
  A(main,[{filter:'blur(14px)',transform:'scale(1.03)'},{filter:'blur(0px)',transform:'scale(1)'}],{duration:900});
  /* 단어가 다 뜨고(1.5 초) 0.3 초 머문 뒤 0.8 초 동안 작아짐. 빠르게 출발하는 곡선(OUT): 느리게 출발하면 멈춘 것처럼 길어 보임.
     2026-11-24: 3.9 초 → 2.6 초(너무 빠름) → 3.3 초 중간값. 히어로는 한 번 보는 첫 장면이라 'PC는 즉각적으로' 규칙에서 뺌 */
  A(t1,[{transform:big},{transform:'none'}],{duration:800,delay:1800});
  ws.forEach((w,i)=>A(w,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:600,delay:500+i*400}));
  /* 작아짐이 끝날 무렵부터 작은 제목 → 선 → 소개 문장을 0.15 초 간격으로 */
  A(h.querySelector('.eyebrow'),[{opacity:0},{opacity:1}],{duration:400,delay:2400});
  A(h.querySelector('.sh-line'),[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:500,delay:2550});
  A(h.querySelector('.lede'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:500,delay:2700});
  /* [둘러보기]: 연출 끝에 작게 나타나 한 번 튀었다가 제자리 (관리자 요청 2026-11-22: 바운스는 이 버튼만 예외) */
  const dn=h.querySelector('.sh-down'); if(dn){ dn.disabled=true;
    HERO_AN.push(dn.animate([{opacity:0,transform:'translateX(-50%) scale(.6)'},{opacity:1,transform:'translateX(-50%) scale(1.12)',offset:.6},{opacity:1,transform:'translateX(-50%) scale(.96)',offset:.8},{opacity:1,transform:'translateX(-50%) scale(1)'}],{duration:520,delay:2800,easing:'ease-out',fill:'backwards'})); }
  Promise.all(HERO_AN.map(a=>a.finished)).then(()=>{ HERO_AN=[]; heroReady(); }).catch(()=>{}); }
/* 연출 중 누르기 · 키는 바로 끝 모습으로 (휠은 건너뛰지 않음: 히어로에서는 스크롤이 없으므로 실수로 넘기지 않게) */
['pointerdown','keydown'].forEach(ev=>window.addEventListener(ev, e=>{ if(HERO_AN.length && !(e.target.closest && e.target.closest('.sh-down'))) heroSkip(); }, {passive:true, capture:true}));
/* 새로고침 · 뒤로 가기로 들어올 때 브라우저가 예전 스크롤 위치를 로드 뒤에 되살려, 스크롤 잠금(히어로) 상태로 탭 막대가 화면 밖에 굳는 문제 (2026-11-24).
   자동 복원을 끔 (이동 기록 안의 위치는 popstate 처리가 직접 되살림). 로드 끝에 한 번 더 맞춤 */
try{ history.scrollRestoration='manual'; }catch(e){}
['load','pageshow'].forEach(ev=>window.addEventListener(ev, ()=>{ try{ heroSync(); }catch(e){} }));
/* 탭을 바꿀 때마다 스크롤 잠금 맞춤 */
{ const _st=showTab; showTab=function(){ const r=_st.apply(this, arguments); try{ heroSync(); }catch(e){} return r; }; }
function sysCard(s){ const n=compOf(s.p).length;
  return `<button type="button" class="st-card" data-sysgo="${s.p}"><span class="st-ch"><span class="dot" style="background:${pc(s.p)}"></span><b>${s.t}</b></span>
    <span class="st-cw">${esc(firstSent(s.why))}</span><span class="st-cm">${n?`부품 ${n}개`:'목표와 연결'} ›</span></button>`; }
function goalCards(){ if(typeof GOALS==='undefined') return '';
  return `<section class="st-goals"><h2>목표는 하나, 더 빠른 차</h2><p class="st-gl">${esc(GOAL_TOP.s)}. 빠른 차를 다섯 가지로 나누면 이렇습니다.</p>
    <div class="st-gcards">${GOALS.map((m,mi)=>`<button type="button" class="st-card st-gcard" data-goalgo="${mi}"><span class="st-ch"><span class="st-gn">${mi+1}</span><b>${m.t}</b></span>
      <span class="st-cw">${esc(m.s)}</span><span class="st-cm">세부 목표 ${m.subs.length}개 ›</span></button>`).join('')}</div></section>`; }
function homePage(){ const sysOf=p=>BG_SYS.find(x=>x.p===p);
  /* 히어로 (2026-11-22, docs/DESIGN.md 6절): 첫 화면 높이 · 화면 폭 전체에 REF4 주행 사진(차만 선명, 주변 · 운전자 바이저는 흐리게).
     히어로와 본문(.st-body)은 따로 보임(스크롤로 이어지지 않음). 주 버튼 [둘러보기 ↓] 하나: 연출이 끝나면 나타나고, 누르면 본문으로 넘어감(heroPass). 등장 연출은 heroIntro */
  return `<header class="top st-hero">
      <div class="sh-bg" aria-hidden="true"><img class="sh-blur" src="img/hero-ref4.webp" alt=""><img class="sh-main" src="img/hero-ref4.webp" alt="" width="2400" height="1600" decoding="async" fetchpriority="high"></div>
      <div class="sh-txt"><span class="eyebrow">처음 왔다면 여기부터</span>
        <h1><span class="sh-w">더 빠른 차를</span> <span class="sh-w">만드는 일</span></h1>
        <i class="sh-line" aria-hidden="true"></i>
        <p class="lede">${BG_INTRO}</p></div>
      <button type="button" class="btn pri sh-down" data-shdown="1"${HERO_DONE?"":" disabled"}>둘러보기<span aria-hidden="true">↓</span></button>
    </header>
    <div class="st-body"><h1 class="sr-only">시작</h1>
    ${typeof BG_STORY!=='undefined' ? `<section class="st-story" aria-labelledby="stStoryH"><h2 id="stStoryH">자동차에서 Formula Student까지</h2><ol>${BG_STORY.map(x=>`<li><span class="ss-y">${x.y}</span><b>${x.t}</b><p>${x.b}</p></li>`).join('')}</ol></section>` : ''}
    ${goalCards()}
    <section class="st-sysw"><h2>더 빠르게 하려면?</h2>
      ${typeof BG_ASK!=='undefined' ? BG_ASK.map(g=>`<div class="st-ask"><div class="sa-q"><b>${g.q}</b><span>${g.a}</span></div><div class="st-sys">${g.p.map(sysOf).filter(Boolean).map(sysCard).join('')}</div></div>`).join('')
        : `<div class="st-sys">${BG_SYS.map(sysCard).join('')}</div>`}
      <p class="st-goal">실제로 설계하는 순서는 <button type="button" class="lnk" data-tabgo="steps">설계</button> 탭입니다. 화면마다 사용법은 오른쪽 위 <button type="button" class="lnk" data-helppop aria-haspopup="dialog">[이 탭 사용법]</button>에서 볼 수 있습니다.</p>
    </section>
    </div>`;
}
/* 목표 화면: 예전 목표 탭의 한 갈래 = 세부 목표(목표·근거·판단 기준·관련 설계 항목) */
/* 시작 탭 하위 화면 이동 (2026-11-24): 창 왼쪽 위(로고 밑)에 고정된 [목록] + 창 양 끝 세로 가운데에 고정된 이전 · 다음. 모두 같은 원 버튼 모양, 스크롤 위치와 무관하게 늘 보임 */
function spNav(attr, prev, pv, next, nv){
  const arw=(cls, v, t, ch)=>`<button type="button" class="sp-arw ${cls}" ${attr}="${v}" aria-label="${cls==='sp-prev'?'이전':'다음'}: ${esc(t)}"><i aria-hidden="true">${ch}</i><span>${t}</span></button>`;
  return `<button type="button" class="sp-arw sp-list" data-sysgo="" aria-label="시작 탭 목록으로"><i aria-hidden="true"><svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg></i><span>목록</span></button>
    <nav class="sp-side" aria-label="이전 · 다음">${prev?arw('sp-prev', pv, prev.t, '‹'):''}${next?arw('sp-next', nv, next.t, '›'):''}</nav>`; }
/* 목표 화면 핵심 그림 (2026-11-25 관리자: 목표 화면이 글뿐이라 밋밋함 → 목표마다 원리 그림 하나, 설명 오른쪽).
   개념 도식이라 축에 숫자를 두지 않음 (모양만: 곡선은 식으로 계산해 그림). 색은 사이트 변수, 글자 13 px */
const GF = (() => {
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 13}"${o.a ? ` text-anchor="${o.a}"` : ''} fill="${o.c || 'var(--ink-2)'}"${o.b ? ' font-weight="600"' : ''}>${s}</text>`;
  const sub = s => `<tspan baseline-shift="sub" font-size="10">${s}</tspan>`;
  const ax = (x0, y0, x1, y1, xl, yl) => `<path d="M${x0} ${y0} H${x1}" stroke="var(--ink-2)" stroke-width="1.4" marker-end="url(#gfA)"/><path d="M${x0} ${y0} V${y1}" stroke="var(--ink-2)" stroke-width="1.4" marker-end="url(#gfA)"/>`
    + T(x1, y0 + 20, xl, {a: 'end', c: 'var(--muted)'}) + T(x0 + 10, y1 + 4, yl, {c: 'var(--muted)'});
  const defs = `<defs><marker id="gfA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink-2)"/></marker>
    <marker id="gfB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>`;
  const cg = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.5"/><path d="M${x} ${y}L${x - r} ${y}A${r} ${r} 0 0 1 ${x} ${y - r}Z" fill="var(--ink)"/><path d="M${x} ${y}L${x + r} ${y}A${r} ${r} 0 0 1 ${x} ${y + r}Z" fill="var(--ink)"/><path d="M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}" stroke="var(--ink)" stroke-width="1.1"/>`;
  const svg = (body, lab) => `<svg viewBox="0 0 460 270" role="img" aria-label="${lab}">${defs}${body}</svg>`;
  const pts = (f, a, b, n, X, Y) => Array.from({length: n + 1}, (_, i) => { const v = a + (b - a) * i / n; return `${i ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(f(v)).toFixed(1)}`; }).join('');
  /* 앞에서 본 차 한 대: 가운데 x, 지면 y, 몸통 롤(도), 바퀴 기울기(도, 왼쪽 · 오른쪽 바퀴 각각 시계 방향 +), 몸통 높이 */
  const car = (x, g, roll = 0, tilt = [0, 0], h = 52) => { const tw = 150, wh = 46, ww = 16;
    const wheel = (wx, c) => `<rect x="${wx - ww / 2}" y="${g - wh}" width="${ww}" height="${wh}" rx="4" fill="var(--ink)" transform="rotate(${c} ${wx} ${g})"/>`;
    return wheel(x - tw / 2, tilt[0]) + wheel(x + tw / 2, tilt[1])
      + `<g transform="rotate(${roll} ${x} ${g - h})"><path d="M${x - 52} ${g - h}L${x - tw / 2 + 8} ${g - wh / 2}M${x + 52} ${g - h}L${x + tw / 2 - 8} ${g - wh / 2}" stroke="var(--ink-2)" stroke-width="1.4"/>
         <rect x="${x - 52}" y="${g - h - 16}" width="104" height="30" rx="6" fill="var(--panel)" stroke="var(--ink-2)" stroke-width="1.4"/></g>`; };
  return [
  /* 1 그립: 마찰원 (타이어 힘 합의 한계 μ·F_z) + 다운포스로 원이 커짐, 오른쪽 L ∝ v² */
  () => { const cx = 120, cy = 140, r1 = 78, r2 = 102, th = 38 * Math.PI / 180, ex = cx + r1 * Math.cos(th), ey = cy - r1 * Math.sin(th);
    const X = v => 300 + v * 130, Y = L => 215 - L * 150;
    return svg(`<circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="5 4"/>
      <circle cx="${cx}" cy="${cy}" r="${r1}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.8"/>
      <path d="M${cx - r2 - 6} ${cy}H${cx + r2 + 6}M${cx} ${cy - r2 - 6}V${cy + r2 + 6}" stroke="var(--line-2)" stroke-width="1"/>
      <path d="M${ex} ${ey}V${cy}M${ex} ${ey}H${cx}" stroke="var(--muted)" stroke-dasharray="3 3"/>
      <path d="M${cx} ${cy}L${ex} ${ey}" stroke="var(--ink)" stroke-width="2.4" marker-end="url(#gfA)"/>
      ${T(cx, cy - r2 - 12, '가속 · 제동 F' + sub('x'), {a: 'middle', c: 'var(--muted)'})}${T(cx + r2 + 6, cy + 4, '선회 F' + sub('y'), {c: 'var(--muted)'})}
      ${T(cx - 12, cy + 34, '한계 μ·F' + sub('z'), {a: 'end'})}${T(cx - r2 + 2, cy + r2 + 6, '+ 다운포스', {c: 'var(--accent)'})}
      <rect x="${X(0)}" y="${Y(1)}" width="${X(.45) - X(0)}" height="${Y(0) - Y(1)}" fill="var(--accent)" opacity=".08"/>
      ${ax(X(0), Y(0), X(1) + 14, Y(1) - 14, '속도 v', '다운포스 L')}
      <path d="${pts(v => v * v, 0, 1, 40, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="2.2"/>
      ${T(X(.6), Y(.75), 'L ∝ v²', {a: 'end', c: 'var(--accent)', b: 1})}${T(X(.225), Y(0) - 12, '저속 코너', {a: 'middle', c: 'var(--muted)', fs: 12})}`,
      '마찰원과 다운포스: 타이어 힘의 합은 μ·Fz를 넘지 못함. 다운포스는 원을 키우지만 속도 제곱에 비례해 저속에서 작음'); },
  /* 2 더 큰 힘: 가속도-속도. 낮은 속도는 그립(④)이, 높은 속도는 출력(③, a = P/(m·v))이 한계. 가벼우면 출력 한계 곡선이 위로 */
  () => { const X = v => 60 + v * 92, Y = a => 222 - a * 150, vm = 4, k = .85;
    return svg(`${ax(X(0), Y(0), X(vm) + 6, Y(1.25), '속도 v', '가속도 a')}
      <path d="${pts(v => Math.min(1, 1 / (k * v)), .05, vm, 80, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="6 4"/>
      <path d="${pts(v => Math.min(1, 1 / v), .05, vm, 80, X, Y)}" fill="none" stroke="var(--ink)" stroke-width="2.4"/>
      <path d="M${X(1)} ${Y(1) - 6}V${Y(0)}" stroke="var(--line-2)" stroke-dasharray="3 3"/>
      ${T(X(.5), Y(1) - 12, '④ 그립 한계', {a: 'middle', b: 1})}${T(X(.5), Y(1) + 22, '(구동력 전달)', {a: 'middle', c: 'var(--muted)', fs: 12})}
      ${T(X(1.6), Y(0) - 24, '③ 출력 한계 a = P / (m·v)', {b: 1})}${T(X(2.7), Y(1 / (k * 2.7)) - 12, '⑤ 가벼우면', {c: 'var(--accent)'})}`,
      '가속도와 속도: 낮은 속도에서는 그립이, 높은 속도에서는 출력이 가속을 제한함. 가벼우면 출력 한계 곡선이 위로 올라감'); },
  /* 3 가볍게: 앞에서 본 두 차. CG 가 높을수록 선회 때 바깥 바퀴로 몰리는 하중 ΔF_z = m·a_y·h / t 가 큼 (화살표 길이 ∝ h) */
  () => { const g = 190, A = 120, B = 340, hA = 96, hB = 60;
    const one = (x, h, lab) => `<path d="M${x - 100} ${g}H${x + 100}" stroke="var(--ink-2)" stroke-width="1.4"/>` + car(x, g, 0, [0, 0], h - 6) + cg(x, g - h)
      + `<path d="M${x - 92} ${g}V${g - h}" stroke="var(--muted)" stroke-dasharray="2 3"/>` + T(x - 97, g - h / 2 + 4, 'h', {a: 'end', c: 'var(--muted)'})
      + `<path d="M${x + 75} ${g + 4 + h * .4}V${g + 4}" stroke="var(--accent)" stroke-width="2.6" marker-end="url(#gfB)"/>` + T(x + 82, g + 4 + h * .4, '+ΔF' + sub('z'), {c: 'var(--accent)'})
      + T(x, 46, lab, {a: 'middle', b: 1});
    return svg(one(A, hA, 'CG 높음') + one(B, hB, 'CG 낮음') + `<path d="M205 70H255" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#gfA)"/>` + T(230, 62, '선회 관성', {a: 'middle', c: 'var(--muted)', fs: 12})
      + T(230, 266, 'ΔF' + sub('z') + ' = m · a' + sub('y') + ' · h / t', {a: 'middle', b: 1}),
      'CG 높이와 하중 이동: 선회 때 바깥 바퀴로 몰리는 하중은 질량 · 횡가속도 · CG 높이에 비례하고 트레드에 반비례함'); },
  /* 4 일관성: 자세가 일정하면 캠버 · 차고가 설계대로, 롤이 크면 바깥 바퀴 캠버가 틀어지고 차고가 바뀜 */
  () => { const g = 185, A = 120, B = 340;
    return svg(`<path d="M20 ${g}H220M240 ${g}H440" stroke="var(--ink-2)" stroke-width="1.4"/>`
      + car(A, g, 0, [2, -2]) + car(B, g, 6, [3, 7])
      + T(A, 50, '자세 일정', {a: 'middle', b: 1}) + T(A, 222, '캠버 · 차고 설계대로', {a: 'middle', c: 'var(--muted)'})
      + T(B, 50, '롤이 큼', {a: 'middle', b: 1}) + T(B, 222, '바깥 바퀴 캠버 틀어짐', {a: 'middle', c: 'var(--accent)'}) + T(B, 244, '차고 변화 → 다운포스 변화', {a: 'middle', c: 'var(--accent)'})
      + `<path d="M${B - 30} 92A40 40 0 0 1 ${B + 30} 92" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#gfB)"/>` + T(B + 38, 92, '롤', {c: 'var(--accent)'}),
      '자세와 캠버: 롤이 작고 일정하면 캠버와 차고가 설계대로 유지됨. 롤이 크면 바깥 바퀴 캠버가 틀어지고 차고가 바뀌어 다운포스도 달라짐'); },
  /* 5 끝까지: 내구 진행에 따른 낼 수 있는 성능. 열 · 에너지 관리가 부족하면 후반에 출력 제한 */
  () => { const X = d => 60 + d * 360, Y = p => 215 - p * 150;
    return svg(`${ax(X(0), Y(0), X(1) + 10, Y(1.15), '내구 진행', '낼 수 있는 성능')}
      <path d="M${X(0)} ${Y(.9)}H${X(1)}" stroke="var(--ink)" stroke-width="2.4"/>
      <path d="M${X(0)} ${Y(.9) + 4}H${X(.55)}C${X(.62)} ${Y(.9) + 4} ${X(.62)} ${Y(.5)} ${X(.7)} ${Y(.5)}H${X(.86)}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-dasharray="6 4"/>
      <path d="M${X(.86) - 7} ${Y(.5) - 7}l14 14m0 -14l-14 14" stroke="var(--accent)" stroke-width="2.4"/>
      ${T(X(1), Y(.9) - 12, '열 · 에너지 관리됨 → 완주', {a: 'end', b: 1})}${T(X(.68), Y(.5) + 26, '과열 → 출력 제한', {a: 'middle', c: 'var(--accent)'})}${T(X(.86) + 12, Y(.5) + 5, '정지', {c: 'var(--accent)'})}`,
      '내구 진행과 성능: 발열과 에너지를 관리하면 끝까지 같은 성능, 관리가 부족하면 후반에 출력이 제한되거나 멈춤'); },
  ];
})();
const goalFig = mi => { const f = GF[mi]; if(!f) return ''; const s = f(); const lab = (s.match(/aria-label="([^"]*)"/) || [])[1] || ''; return `<figure class="gp-fig">${s}<figcaption>${lab.split(':')[0]}</figcaption></figure>`; };
function goalPage(mi){ const m=GOALS[mi], prev=GOALS[mi-1], next=GOALS[mi+1];
  return `${spNav('data-goalgo', prev, mi-1, next, mi+1)}
    <header class="top sp-head"><span class="eyebrow"><span class="st-gn">${mi+1}</span> 목표</span><h1>${m.t}</h1><p class="lede">${esc(m.s)}</p></header>
    <section class="gp-sec gp-hasfig"><p class="gp-why">${m.why}</p>${goalFig(mi)}</section>
    <section class="gp-list"><h2>세부 목표 <span class="muted">${m.subs.length}개</span></h2><div class="gp-subs">${m.subs.map(goalSubCard).join('')}</div></section>`; }
/* 세부 목표 카드 (2026-11-24): 접지 않고 다 보임. 왼쪽 = 목표(핵심 한 줄) · 왜 · 연결, 오른쪽 = 근거 · 판단 기준 · 관련 설계 항목 */
function goalSubCard(d){ const its=[...d.go].filter(id=>IT[id]).sort((a,b)=>(SIDX[IT[a].s]-SIDX[IT[b].s])||(((ACT[a]||[99])[0])-((ACT[b]||[99])[0])));
  return `<article class="gsub"><h3 class="gs-t">${d.t}</h3>
    <div class="gs-grid"><div class="gs-main">
        <p class="gs-goal"><span class="gs-k">목표</span>${d.g}</p>
        <p class="gs-why">${d.why}</p>
        <p class="gs-rel"><span aria-hidden="true">↳</span> ${d.rel}</p></div>
      <dl class="gs-side"><div><dt>근거</dt><dd>${d.w}</dd></div><div><dt>판단 기준</dt><dd>${d.j}</dd></div>
        <div><dt>관련 설계 항목</dt><dd class="chips">${its.map(id=>`<button type="button" class="chip" data-goto="${id}"><span class="dot" style="background:${pc(IT[id].p)}"></span>${IT[id].s} · ${IT[id].n}</button>`).join('')}</dd></div></dl></div></article>`; }
function openGoalPage(mi, di){ pushHist(); if(TAB!=='start') showTab('start', true); renderStart('goal:'+mi); window.scrollTo({top:0, behavior:'instant'});
  if(di!=null) requestAnimationFrame(()=>{ const d=document.getElementById('g-'+mi+'-'+di); if(!d) return; d.open=true; const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50; window.scrollTo({top:d.getBoundingClientRect().top+scrollY-tabh-16, behavior:'instant'}); try{ markHere(d); }catch(e){} }); }
function sysPage(s){ const cs=compOf(s.p), tech=techOf(s.p), i=BG_SYS.indexOf(s), prev=BG_SYS[i-1], next=BG_SYS[i+1];
  const steps=[...new Set(ITEMS.filter(x=>x.p===s.p).map(x=>x.s))].sort((a,b)=>SIDX[a]-SIDX[b]);
  return `${spNav('data-sysgo', prev, prev&&prev.p, next, next&&next.p)}
    <header class="top sp-head"><span class="eyebrow"><span class="dot" style="background:${pc(s.p)}"></span> 시스템</span><h1>${s.t}</h1></header>
    <div class="sp-grid">
      <section class="sp-sec"><h2>왜 생겼나</h2><p>${bgMark(s.why)}</p></section>
      <section class="sp-sec"><h2>F1에서 어떻게 발전했나</h2><p>${bgMark(s.hist)}</p></section>
      <section class="sp-sec sp-fs"><h2>FS에서는</h2><p>${bgMark(s.fs)}</p>
        ${steps.length?`<div class="st-links"><span class="sec-label">이 시스템을 설계하는 단계</span>${steps.map(sid=>`<button type="button" class="lnk" data-stepgo="${sid}">${sid}</button>`).join('')}</div>`:''}
</section>
    </div>
    ${cs.length?`<section class="sp-comp"><h2>구성 부품 <span class="muted">${cs.length}개 · FS 차량에서 흔한 모양 기준</span></h2><div class="cp-grid cp-one">${cs.map(compHTML).join('')}</div></section>`:''}
    ${tech.length?`<section class="sp-tech"><h2>F1이 시도한 ${s.t} 기술 <span class="muted">${tech.length}가지 · 옆으로 넘겨 보십시오</span></h2>${techRail(tech)}</section>`:''}`;
}
/* 시작 탭 화면 바꾸기 + 전환 (2026-11-24): 다음 화면으로 넘어가는 느낌 = 새 화면이 오른쪽에서 밀려 들어옴(push).
   돌아가거나 이전 화면은 반대로 오른쪽으로 빠져나감(pop). 목록으로 돌아오면 보던 카드를 가운데에 두고 잠깐 강조.
   순서: 목표 1~5 → 시스템 (stIdx). 다른 탭에서 바로 여는 경우(openSys · openGoalPage 직접 호출)는 전환 없이 그대로 */
function stGo(key, src, fn){ const a=(TAB==='start' && START.sys) || '';
  if(TAB!=='start'){ fn(); return; }
  if(a && !key){ const was=a; vtGo('pop', ()=>{ fn(); vtMark(stCard(was), true); }); return; }
  vtGo(a && stIdx(key)<stIdx(a) ? 'pop' : 'push', fn); }
function openSys(p, part){ pushHist(); if(TAB!=='start') showTab('start', true); renderStart(p||''); window.scrollTo({top:0, behavior:'instant'});
  if(part) requestAnimationFrame(()=>{ const el=document.getElementById('cp-'+part); if(el){ const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50; window.scrollTo({top:el.getBoundingClientRect().top+scrollY-tabh-12, behavior:'instant'}); markHere(el); } }); }


/* 항목 맨 위 '배경' 칸: 기본 접힘, 펼침 상태는 이 브라우저에 기억 */
ITEM_HOOKS.push((d,b)=>{ const txt=BG_ITEM[d.dataset.item]; if(!txt || b.querySelector('.bgbox')) return;
  const x=document.createElement('details'); x.className='bgbox'; x.open=PREF('bgopen','0')==='1'; x.innerHTML=`<summary><b>배경</b><span class="muted">처음 보는 사람을 위한 설명</span></summary><div class="bgb">${bgMark(txt)}</div>`; b.prepend(x); });
{ document.addEventListener('toggle', e=>{ if(e.target.classList && e.target.classList.contains('bgbox')){ SETP('bgopen', e.target.open?'1':'0'); document.querySelectorAll('.bgbox').forEach(o=>{ if(o!==e.target && o.open!==e.target.open) o.open=e.target.open; }); } }, true); }

document.addEventListener('click', e=>{
  if(e.target.closest('[data-shdown]')){ e.preventDefault(); heroPass(true); return; }
  const t=e.target.closest('[data-tabgo]'); if(t){ e.preventDefault(); pushHist(); showTab(t.dataset.tabgo); return; }
  const gg=e.target.closest('[data-goalgo]'); if(gg){ e.preventDefault(); stGo('goal:'+gg.dataset.goalgo, gg, ()=>openGoalPage(+gg.dataset.goalgo)); return; }
  const fr=e.target.closest('.f1r-b'); if(fr){ e.preventDefault(); const l=fr.parentElement.querySelector('.f1t-row'); const xs=[...l.querySelectorAll('.f1t')].map(c=>c.offsetLeft-l.firstElementChild.offsetLeft); const x=l.scrollLeft, nx=fr.classList.contains('f1r-next'); let t=nx ? xs.find(v=>v>x+4) : [...xs].reverse().find(v=>v<x-4); if(t==null) t = nx ? l.scrollWidth : 0; animScrollLeft(l, t); return; }   // 버튼을 누를 때만 카드 왼쪽에 맞춤 (끌기는 놓은 자리 그대로)
  const y=e.target.closest('[data-sysgo]'); if(y){ e.preventDefault(); const p=y.dataset.sysgo; stGo(p, y, ()=>openSys(p)); return; }
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
