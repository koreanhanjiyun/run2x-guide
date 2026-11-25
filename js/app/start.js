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
/* 파일 이름(REF4_Assy_07.22.STEP 등)은 <code> 로 감싸 자동 아래첨자(x_cop → x 아래 cop)를 피함 */
const srcFile = h => String(h).replace(/\b([A-Za-z0-9]+_[A-Za-z0-9_]+(?:\.\d+)*(?:\.(?:STEP|STP|step|stp|dxf|DXF))?)\b/g, '<code>$1</code>');
function srcList(arr){ return (arr||[]).map(x=>{ if(typeof x==='string'){ const m=x.match(/^(.*?)\s*[—-]\s*(https?:\/\/\S+)$/); return m ? `<li><a href="${esc(m[2])}" target="_blank" rel="noopener">${esc(m[1])}</a></li>` : `<li>${esc(x)}</li>`; }
  return `<li>${x.u?`<a href="${esc(x.u)}" target="_blank" rel="noopener">${srcFile(esc(x.t))}</a>`:srcFile(esc(x.t))}${x.note?` <span class="muted">${srcFile(esc(x.note))}</span>`:''}</li>`; }).join(''); }
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
/* 세부 목표 그림 (2026-11-25 관리자: 위쪽 큰 그림은 설명과 따로 놀고 세부 목표와 연결이 없음 → 세부 목표 카드마다 그 목표의 그림을 글 바로 옆에).
   ①~⑧ 하나씩. 개념 도식이라 축에 숫자를 두지 않음 (모양은 식으로 계산). 차 그림은 FS 정면도: 더블위시본을 기구학으로 풀어 그림 (롤을 주면 위 · 아래 팔 길이를 지키며 업라이트가 움직여 캠버가 바뀜) */
const GS = (() => {
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 12.5}"${o.a ? ` text-anchor="${o.a}"` : ''} fill="${o.c || 'var(--ink-2)'}"${o.b ? ' font-weight="600"' : ''}>${s}</text>`;
  const sub = s => `<tspan baseline-shift="sub" font-size="9.5">${s}</tspan>`;
  const ACC = 'var(--accent)', ORG = '#c2410c', GRN = '#2b7a30';
  const defs = `<defs>${[['gsA', 'var(--ink-2)'], ['gsB', ACC], ['gsO', ORG], ['gsG', GRN]].map(([id, c]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}
    <pattern id="gsH" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" stroke="#9aa3b5" stroke-width="2"/></pattern></defs>`;
  const svg = (body, lab, w = 400, h = 250) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${lab}">${defs}${body}</svg>`;
  const ax = (x0, y0, x1, y1, xl, yl) => `<path d="M${x0} ${y0}H${x1}" stroke="var(--ink-2)" stroke-width="1.3" marker-end="url(#gsA)"/><path d="M${x0} ${y0}V${y1}" stroke="var(--ink-2)" stroke-width="1.3" marker-end="url(#gsA)"/>`
    + T(x1, y0 + 18, xl, {a: 'end', c: 'var(--muted)'}) + T(x0 + 8, y1 + 2, yl, {c: 'var(--muted)'});
  const pts = (f, a, b, n, X, Y) => Array.from({length: n + 1}, (_, i) => { const v = a + (b - a) * i / n; return `${i ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(f(v)).toFixed(1)}`; }).join('');
  const arr = (x1, y1, x2, y2, c = 'var(--ink-2)', m = 'gsA', w = 2) => `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${c}" stroke-width="${w}" marker-end="url(#${m})"/>`;
  const cg = (x, y, r = 7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.4"/><path d="M${x} ${y}L${x - r} ${y}A${r} ${r} 0 0 1 ${x} ${y - r}Z" fill="var(--ink)"/><path d="M${x} ${y}L${x + r} ${y}A${r} ${r} 0 0 1 ${x} ${y + r}Z" fill="var(--ink)"/><path d="M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}" stroke="var(--ink)" stroke-width="1"/>`;

  /* ---- FS 정면도 (mm, 차 중심 x = 0, 지면 y = 0, 위 = +). 하드포인트는 일반적인 FS 차 크기의 예시 ---- */
  const HP = {t: 1200, tireR: 260, tireW: 200, lo: {px: 230, py: 120, bx: 545, by: 140}, up: {px: 270, py: 300, bx: 520, by: 360}};
  /* 업라이트(오른쪽 바퀴)의 몸 좌표: 접지점 원점, 회전 th(라디안, 반시계 +) */
  const rot = (p, th) => [p[0] * Math.cos(th) - p[1] * Math.sin(th), p[0] * Math.sin(th) + p[1] * Math.cos(th)];
  const upr = {L: [HP.lo.bx - HP.t / 2, HP.lo.by], U: [HP.up.bx - HP.t / 2, HP.up.by], W: [0, HP.tireR]};
  /* 롤 phi(도, 차체가 오른쪽으로 기울면 +)에서 오른쪽(바깥) · 왼쪽(안쪽) 바퀴 자세를 풂: 미지수 = 접지점 x, 업라이트 각 th. 조건 = 위 · 아래 팔 길이 유지 */
  function solveSide(sign, phi) { const ph = -phi * Math.PI / 180, rc = [0, 40];   /* 차체 롤: 롤 중심 rc 둘레로 회전 (오른쪽으로 기울면 시계 방향) */
    const P = (x, y) => { const r = rot([x * sign - rc[0], y - rc[1]], ph); return [r[0] + rc[0], r[1] + rc[1]]; };
    const pl = P(HP.lo.px, HP.lo.py), pu = P(HP.up.px, HP.up.py);
    const Ll = Math.hypot(HP.lo.bx - HP.lo.px, HP.lo.by - HP.lo.py), Lu = Math.hypot(HP.up.bx - HP.up.px, HP.up.by - HP.up.py);
    const sL = [upr.L[0] * sign, upr.L[1]], sU = [upr.U[0] * sign, upr.U[1]];
    const F = (cx, th) => { const l = rot(sL, th), u = rot(sU, th); return [Math.hypot(cx + l[0] - pl[0], l[1] - pl[1]) - Ll, Math.hypot(cx + u[0] - pu[0], u[1] - pu[1]) - Lu]; };
    let cx = sign * HP.t / 2, th = 0;
    for (let k = 0; k < 30; k++) { const f = F(cx, th), e = 1e-4, a = F(cx + e, th), b = F(cx, th + e);
      const J = [[(a[0] - f[0]) / e, (b[0] - f[0]) / e], [(a[1] - f[1]) / e, (b[1] - f[1]) / e]], det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
      const dx = (f[0] * J[1][1] - f[1] * J[0][1]) / det, dt = (J[0][0] * f[1] - J[1][0] * f[0]) / det; cx -= dx; th -= dt; if (Math.abs(dx) + Math.abs(dt) < 1e-9) break; }
    const l = rot(sL, th), u = rot(sU, th), w = rot([0, HP.tireR], th);
    return {cx, th, pl, pu, L: [cx + l[0], l[1]], U: [cx + u[0], u[1]], W: [cx + w[0], w[1]]}; }
  /* 정면도 그리기: o = {x, g(지면 y), s(px/mm), roll(도), cgh(mm, 없으면 안 그림), ghost} */
  function car(o) { const s = o.s, X = v => o.x + v * s, Y = v => o.g - v * s, phi = o.roll || 0, rc = [0, 40], ph = -phi * Math.PI / 180;
    const B = (x, y) => { const r = rot([x - rc[0], y - rc[1]], ph); return [X(r[0] + rc[0]), Y(r[1] + rc[1])]; };
    const poly = (ps, a) => `<path d="M${ps.map(p => B(p[0], p[1]).map(v => v.toFixed(1)).join(' ')).join('L')}Z" ${a}/>`;
    const R = solveSide(1, phi), Lf = solveSide(-1, phi);
    const wheel = S => { const c = [X(S.W[0]), Y(S.W[1])], deg = -S.th * 180 / Math.PI, w = HP.tireW * s, h = 2 * HP.tireR * s;
      return `<g transform="rotate(${deg.toFixed(2)} ${c[0].toFixed(1)} ${c[1].toFixed(1)})"><rect x="${(c[0] - w / 2).toFixed(1)}" y="${(c[1] - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(w * .32).toFixed(1)}" fill="#2a2f38"/>`
        + `<rect x="${(c[0] - w / 2 + 2).toFixed(1)}" y="${(c[1] - h * .3).toFixed(1)}" width="${(w - 4).toFixed(1)}" height="${(h * .6).toFixed(1)}" rx="2" fill="#5b6270"/></g>`; };
    const side = S => { const L = [X(S.L[0]), Y(S.L[1])], U = [X(S.U[0]), Y(S.U[1])], W = [X(S.W[0]), Y(S.W[1])], pl = [X(S.pl[0]), Y(S.pl[1])], pu = [X(S.pu[0]), Y(S.pu[1])];
      return wheel(S) + `<path d="M${pl.join(' ')}L${L.join(' ')}M${pu.join(' ')}L${U.join(' ')}" stroke="#1d5f9a" stroke-width="2.6" stroke-linecap="round"/>`
        + `<path d="M${L.join(' ')}L${U.join(' ')}M${((L[0] + U[0]) / 2).toFixed(1)} ${((L[1] + U[1]) / 2).toFixed(1)}L${W.join(' ')}" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>`
        + `<circle cx="${L[0].toFixed(1)}" cy="${L[1].toFixed(1)}" r="2.6" fill="var(--panel)" stroke="var(--ink)"/><circle cx="${U[0].toFixed(1)}" cy="${U[1].toFixed(1)}" r="2.6" fill="var(--panel)" stroke="var(--ink)"/>`; };
    /* 차체: 프레임 단면(아래 넓고 위 좁은 육각), 콕핏 · 헬멧 · 메인 롤후프 */
    const body = poly([[-250, 70], [250, 70], [290, 160], [250, 420], [-250, 420], [-290, 160]], 'fill="var(--panel)" stroke="var(--ink-2)" stroke-width="1.5"')
      + poly([[-150, 420], [150, 420], [120, 470], [-120, 470]], 'fill="#e4e1ec" stroke="var(--ink-2)" stroke-width="1.2"')
      + (() => { const c = B(0, 770); return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(125 * s).toFixed(1)}" fill="#6A4294" stroke="var(--ink)" stroke-width="1.2"/>`; })()
      + (() => { const p = [[-230, 420], [-210, 900], [210, 900], [230, 420]].map(q => B(q[0], q[1]).map(v => v.toFixed(1)).join(' ')); return `<path d="M${p.join('L')}" fill="none" stroke="var(--ink-2)" stroke-width="2.4" stroke-linejoin="round"/>`; })()
      + (() => { const a = B(-120, 690), b = B(120, 690); return `<path d="M${a.join(' ')}L${b.join(' ')}" stroke="#2a2f38" stroke-width="3"/>`; })();
    let h = `<path d="M${X(-760)} ${o.g}H${X(760)}" stroke="var(--ink-2)" stroke-width="1.3"/>` + side(Lf) + side(R) + body;
    return {svg: h, R, Lf, X, Y, B}; }

  const camb = S => -S.th * 180 / Math.PI;
  /* 마찰 타원: 관리자 지정 비율 가속 1.1 : 선회 1.8 : 제동 1.5 (숫자는 그림에 안 씀). 위 반쪽 = 가속, 아래 반쪽 = 제동, 좌우 = 선회 */
  const FE = {ax: 1.1, ay: 1.8, br: 1.5};
  const fePath = (cx, cy, k) => { const rx = FE.ay * k, ru = FE.ax * k, rd = FE.br * k;
    return `M${cx - rx} ${cy}A${rx} ${ru} 0 0 1 ${cx + rx} ${cy}A${rx} ${rd} 0 0 1 ${cx - rx} ${cy}Z`; };
  const fePt = (cx, cy, k, deg) => { const a = deg * Math.PI / 180, ry = Math.sin(a) >= 0 ? FE.ax : FE.br; return [cx + FE.ay * k * Math.cos(a), cy - ry * k * Math.sin(a)]; };   /* 바퀴 위가 바깥(+x 쪽, 오른쪽 바퀴)으로 = 양 캠버 */
  return [
  /* ① 기계적 그립: 마찰 타원(가속 · 선회 · 제동 한계가 다름) + 캠버가 맞으면 접지면 전체가 누름 */
  () => { const cx = 112, cy = 112, k = 50, [ex, ey] = fePt(cx, cy, k, 36);
    const tire = (x, deg, lab, ok) => { const g = 196; const c = [x, g - 38];
      return `<g transform="rotate(${deg} ${x} ${g})"><rect x="${x - 16}" y="${g - 76}" width="32" height="76" rx="10" fill="#2a2f38"/><rect x="${x - 14}" y="${g - 56}" width="28" height="36" rx="2" fill="#5b6270"/></g>`
        + `<path d="M${x - 30} ${g}H${x + 30}" stroke="var(--ink-2)" stroke-width="1.3"/>` + `<path d="M${ok ? x - 15 : x + 2} ${g + 4}H${ok ? x + 15 : x + 16}" stroke="${ok ? GRN : ORG}" stroke-width="4"/>` + lab.split('|').map((l, k) => T(x, g + 20 + k * 17, l, {a: 'middle', c: ok ? GRN : ORG, fs: 11})).join(''); };
    const rx = FE.ay * k, ru = FE.ax * k, rd = FE.br * k;
    return svg(`<path d="${fePath(cx, cy, k)}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.8"/>
      <path d="M${cx - rx - 10} ${cy}H${cx + rx + 10}M${cx} ${cy - ru - 10}V${cy + rd + 10}" stroke="var(--line-2)"/>
      <path d="M${ex.toFixed(1)} ${ey.toFixed(1)}V${cy}M${ex.toFixed(1)} ${ey.toFixed(1)}H${cx}" stroke="var(--muted)" stroke-dasharray="3 3"/>${arr(cx, cy, ex, ey, 'var(--ink)', 'gsA', 2.4)}
      ${T(cx, cy - ru - 16, '가속', {a: 'middle', c: 'var(--muted)'})}${T(cx, cy + rd + 24, '제동', {a: 'middle', c: 'var(--muted)'})}${T(cx + rx + 4, cy + 18, '선회 F' + sub('y'), {c: 'var(--muted)'})}
      ${T(cx - 8, cy + 30, '한계 μ·F' + sub('z'), {a: 'end'})}${T(cx, cy + rd + 44, '마찰 타원: 선회 > 제동 > 가속', {a: 'middle', c: 'var(--muted)', fs: 11})}
      ${tire(272, 0, '캠버 맞음|전체 접지', true)}${tire(366, 9, '틀어짐|한쪽만', false)}${T(326, 36, '같은 하중, 자세에 따라', {a: 'middle', c: 'var(--muted)', fs: 11.5})}`,
      '① 기계적 그립: 타이어 힘의 합은 마찰 타원(한계 μ·Fz) 안. 캠버가 맞아 접지면 전체가 누를 때 한계가 큼', 400, 270); },
  /* ② 다운포스: L ∝ v², FSK 저속 코너 구간에서는 작음. 다운포스만큼 타원이 커짐 */
  () => { const X = v => 46 + v * 190, Y = L => 206 - L * 150;
    return svg(`<rect x="${X(0)}" y="${Y(1)}" width="${X(.42) - X(0)}" height="${Y(0) - Y(1)}" fill="${ACC}" opacity=".08"/>${ax(X(0), Y(0), X(1) + 12, Y(1) - 12, '속도 v', '다운포스 L')}
      <path d="${pts(v => v * v, 0, 1, 40, X, Y)}" fill="none" stroke="${ACC}" stroke-width="2.4"/>${T(X(.72), Y(.62), 'L ∝ v²', {a: 'end', c: ACC, b: 1})}
      ${T(X(.21), Y(1) + 16, 'FSK 저속 코너', {a: 'middle', c: 'var(--muted)', fs: 11.5})}
      <path d="${fePath(320, 108, 36)}" fill="none" stroke="${ACC}" stroke-width="1.6" stroke-dasharray="5 4"/><path d="${fePath(320, 108, 26)}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.6"/>
      ${[20, 70, 110, 160, 200, 250, 290, 340].map(d => { const a = fePt(320, 108, 26.5, d), b = fePt(320, 108, 35, d); return arr(a[0], a[1], b[0], b[1], ACC, 'gsB', 1.4); }).join('')}
      ${T(320, 112, '무게만', {a: 'middle', fs: 11.5})}${T(320, 188, '+ 다운포스 → 타원 커짐', {a: 'middle', c: ACC, fs: 11.5})}${T(320, 212, '무게 · CG · 항력도 함께 ↑', {a: 'middle', c: ORG, fs: 11.5})}`,
      '② 다운포스: 속도 제곱에 비례해 FSK 저속 코너에서는 작음. 다운포스만큼 마찰 타원이 커지지만 무게 · CG · 항력도 늘어남'); },
  /* ③ 출력 한계까지 가속: 쓸 수 있는 출력은 그립 한계 P = μ·m·g·v 를 넘지 못함(실선). 런치 · 감속비가 약하면 그 아래(점선)로 늦게 닿고, 사이가 손실 */
  () => { const X = v => 46 + v * 300, Y = p => 206 - p * 150, vg = .26, va = .4;
    return svg(`${ax(X(0), Y(0), X(1) + 10, Y(1.15), '속도 v', '쓰는 출력 P')}
      <path d="M${X(0)} ${Y(1)}H${X(1)}" stroke="var(--muted)" stroke-dasharray="5 4"/>${T(X(1), Y(1) - 8, '제한 출력 (80 kW)', {a: 'end', c: 'var(--muted)', fs: 11.5})}
      <path d="M${X(0)} ${Y(0)}L${X(vg)} ${Y(1)}L${X(va)} ${Y(1)}Z" fill="${ORG}" opacity=".12"/>
      <path d="M${X(0)} ${Y(0)}L${X(vg)} ${Y(1)}H${X(1)}" fill="none" stroke="var(--ink)" stroke-width="2.4"/>
      <path d="M${X(0)} ${Y(0)}L${X(va)} ${Y(1)}" fill="none" stroke="${ORG}" stroke-width="2" stroke-dasharray="6 4"/>
      <path d="M${X(.42)} ${Y(.6)}h22" stroke="var(--ink)" stroke-width="2.4"/>${T(X(.42) + 28, Y(.6) + 4, '그립 한계 P = μ·m·g·v', {fs: 11.5})}<path d="M${X(.42)} ${Y(.38)}h22" stroke="${ORG}" stroke-width="2" stroke-dasharray="6 4"/>${T(X(.42) + 28, Y(.38) + 4, '런치 · 감속비가 약할 때', {c: ORG, fs: 11.5})}<rect x="${X(.42)}" y="${Y(.21) - 6}" width="22" height="11" fill="${ORG}" opacity=".18"/>${T(X(.42) + 28, Y(.21) + 4, '늦게 닿아 잃는 출력', {c: ORG, fs: 11.5})}
      ${arr(X(va) + 4, Y(1) + 14, X(vg) + 4, Y(1) + 14, ACC, 'gsB', 1.6)}${T(X(va) + 8, Y(1) + 18, '빨리 도달 = 그립 한계를 따라', {c: ACC, b: 1, fs: 11})}
      ${T(X(.75), Y(1) + 40, '끝까지 유지 (출력 제한 · 발열)', {a: 'middle', fs: 11.5})}`,
      '③ 출력 한계까지 가속: 쓸 수 있는 출력은 그립 한계를 넘지 못하고, 그 한계를 따라 제한 출력에 빨리 닿아 오래 유지할수록 빠름'); },
  /* ④ 구동력 전달: 코너 탈출, 안쪽 뒷바퀴 하중이 빠짐. 오픈 디퍼렌셜 = 양쪽 토크가 약한 바퀴만큼, LSD = 바깥 바퀴에 더 */
  () => { const panel = (x0, lab, ti, to) => { const g = 170, xi = x0 + 40, xo = x0 + 140;
      const w = (x, fz) => `<rect x="${x - 13}" y="${g - 58}" width="26" height="58" rx="8" fill="#2a2f38"/>` + arr(x, g + 4 + fz * 34, x, g + 4, GRN, 'gsG', 2.4);
      const bar = (x, t) => `<rect x="${x - 9}" y="${80 - t * 46}" width="18" height="${t * 46}" fill="${ACC}" opacity=".85"/>`;
      return `<path d="M${x0} ${g}H${x0 + 180}" stroke="var(--ink-2)" stroke-width="1.3"/>` + w(xi, .35) + w(xo, 1.1) + `<path d="M${xi} ${g - 30}H${xo}" stroke="var(--ink-2)" stroke-width="2"/><rect x="${x0 + 80}" y="${g - 40}" width="20" height="20" rx="3" fill="var(--panel)" stroke="var(--ink-2)"/>`
        + bar(xi, ti) + bar(xo, to) + `<path d="M${x0 + 10} 80H${x0 + 170}" stroke="var(--line-2)"/>` + T(x0 + 90, 26, lab, {a: 'middle', b: 1}) + T(xi, 98, '안쪽', {a: 'middle', fs: 11}) + T(xo, 98, '바깥', {a: 'middle', fs: 11}); };
    return svg(panel(10, '오픈 디퍼렌셜', .35, .35) + panel(250, 'LSD', .35, 1) + T(100, 232, '양쪽 = 약한 바퀴만큼', {a: 'middle', c: ORG, fs: 11.5}) + T(340, 232, '안쪽이 헛돌 때 바깥에 더', {a: 'middle', c: GRN, fs: 11.5})
      + T(220, 260, '보라 막대 = 구동 토크, 초록 화살표 = 바퀴 하중', {a: 'middle', c: 'var(--muted)', fs: 11}),
      '④ 구동력 전달: 코너 탈출에서 안쪽 뒷바퀴 하중이 빠지면 오픈 디퍼렌셜은 양쪽에 약한 바퀴만큼만 토크를 보내고, LSD는 안쪽이 헛돌 때 바깥 바퀴에 더 보냄', 440, 270); },
  /* ⑤ 가볍게 · 낮게: 같은 차체, CG 높이만 다름. 관성력 m·a_y 가 CG 에 작용 → 접지점 기준 모멘트 m·a_y·h 를 좌우 하중 차이 ΔF_z·t 가 받음.
     예시 a_y = 1.5 g, h = 380 / 240 mm, t = 1200 mm → ΔF_z / (m·g) = 1.5 · h / t = 0.475 / 0.30 → 바깥 97.5 % · 안쪽 2.5 %, 바깥 80 % · 안쪽 20 %.
     화살표 길이 = 바퀴 하중 × 110 px (정지 때 한 바퀴 50 % = 55 px 를 회색 점선으로) */
  () => { const s = .13, ay = 1.5, k = 110, G = 196, one = (x, hcg, lab, notes) => { const c = car({x, g: G, s}), dF = ay * hcg / HP.t;
      const cgp = [c.X(0), c.Y(hcg)], gL = c.X(-HP.t / 2), gR = c.X(HP.t / 2), fo = .5 + dF, fi = .5 - dF;
      const up = (gx, f) => (f * k >= 14 ? arr(gx, G + 4 + f * k, gx, G + 4, GRN, 'gsG', 2.8) : `<path d="M${gx} ${G + 4 + Math.max(f * k, 3)}V${G + 4}" stroke="${GRN}" stroke-width="2.8"/>`)
        + `<path d="M${gx - 9} ${G + 4 + .5 * k}h18" stroke="var(--muted)" stroke-dasharray="3 2"/>`;
      return c.svg + `<path d="M${cgp[0]} ${G}V${cgp[1]}" stroke="var(--muted)" stroke-dasharray="3 3"/>` + T(cgp[0] - 5, G - 6, 'h', {a: 'end', c: 'var(--ink)', b: 1})
        + cg(cgp[0], cgp[1]) + arr(cgp[0] + 8, cgp[1], cgp[0] + 44, cgp[1], ORG, 'gsO', 2.6) + T(cgp[0] + 24, cgp[1] - 16, 'm·a' + sub('y'), {a: 'middle', c: ORG, fs: 11, b: 1})
        + up(gL, fi) + up(gR, fo)
        + T(gL, 328, '안쪽', {a: 'middle', fs: 11, c: GRN}) + T(gL, 348, `${(fi * 100).toFixed(1)} %`, {a: 'middle', fs: 11, c: GRN, b: 1})
        + T(gR, 330, '바깥', {a: 'middle', fs: 11, c: GRN}) + T(gR, 348, `${(fo * 100).toFixed(1)} %`, {a: 'middle', fs: 11, c: GRN, b: 1})
        + notes.map((n, i) => T(x, 376 + i * 22, n, {a: 'middle', fs: 11, c: i ? 'var(--muted)' : ORG})).join('')
        + T(x, 20, lab, {a: 'middle', b: 1}) + T(x, 38, `h = ${hcg} mm`, {a: 'middle', c: 'var(--muted)', fs: 11}); };
    return svg(one(112, 380, 'CG 높음', ['안쪽 하중 거의 0 → 그립 ↓ · 들림', '바깥은 하중 많아도 그립은 덜 늘어남']) + one(358, 240, 'CG 낮음', ['안쪽도 하중이 남아 네 바퀴를 고르게 씀', ''])
      + `<path d="M225 60V400" stroke="var(--line)"/>`
      + T(235, 438, '모멘트 평형: ΔF' + sub('z') + ' · t = m · a' + sub('y') + ' · h', {a: 'middle', b: 1, fs: 12})
      + T(235, 462, '예시 a' + sub('y') + ' 1.5 g · 트레드 t 1200 mm · 화살표 길이 ∝ 바퀴 하중 (점선 = 정지 때 50 %)', {a: 'middle', c: 'var(--muted)', fs: 11}),
      '⑤ 가볍게 · 낮게: 같은 차체에서 CG 만 높으면 관성력의 모멘트 팔 h 가 길어져 바깥 바퀴로 몰리는 하중이 커지고, 안쪽 바퀴 하중은 거의 사라짐', 470, 474); },
  /* ⑥ 일관되게: 같은 더블위시본 차, 롤 0° 와 롤 3.5°. 롤이 크면 바깥 바퀴 캠버가 틀어지고 차체 바닥 높이가 바뀜.
     값(캠버)은 실제 롤 3.5° 로 풀고, 그림은 보이게 각도를 2.5배(롤 8.75°)로 과장해 같은 기구학으로 그림 */
  () => { const s = .13, EX = 2.5, phi = 3.5, A = car({x: 110, g: 200, s, roll: 0}), Bc = car({x: 350, g: 200, s, roll: phi * EX});
    const cA = camb(solveSide(1, 0)), cB = camb(solveSide(1, phi));
    const flo = c => { const a = c.B(-250, 70), b = c.B(250, 70); return `<path d="M${a.join(' ')}L${b.join(' ')}" stroke="${ACC}" stroke-width="2.2"/>`; };
    const R = Bc.R, wx = Bc.X(R.cx), top = [Bc.X(R.W[0] + 2 * HP.tireR * Math.sin(-R.th) * 0), 0];
    const mark = (() => { const gx = Bc.X(R.cx), gy = 200, L = 2 * HP.tireR * s + 6, th = -R.th; const tx = gx + L * Math.sin(th), ty = gy - L * Math.cos(th);
      return `<path d="M${gx} ${gy}V${gy - L}" stroke="var(--muted)" stroke-dasharray="2 2"/><path d="M${gx} ${gy}L${tx.toFixed(1)} ${ty.toFixed(1)}" stroke="${ORG}" stroke-width="1.6"/>`
        + `<path d="M${gx} ${gy - L + 8}A${L - 8} ${L - 8} 0 0 1 ${(gx + (L - 8) * Math.sin(th)).toFixed(1)} ${(gy - (L - 8) * Math.cos(th)).toFixed(1)}" fill="none" stroke="${ORG}" stroke-width="1.4"/>`; })();
    return svg(A.svg + Bc.svg + flo(A) + flo(Bc) + mark + T(110, 20, '자세 일정 (롤 0°)', {a: 'middle', b: 1}) + T(350, 20, '롤이 큼 (롤 3.5°)', {a: 'middle', b: 1})
      + `<path d="M${350 - 26} 52A30 30 0 0 1 ${350 + 26} 52" fill="none" stroke="${ORG}" stroke-width="1.6" marker-end="url(#gsO)"/>` + T(Bc.X(R.cx), 214, '바깥', {a: 'middle', fs: 10.5, c: ORG})
      + T(110, 236, `캠버 ${cA.toFixed(1)}°, 바닥 높이 일정`, {a: 'middle', fs: 11.5, c: GRN}) + T(350, 236, `바깥 바퀴 캠버 +${cB.toFixed(1)}°`, {a: 'middle', fs: 11.5, c: ORG})
      + T(350, 258, '바닥(보라) 기울어짐 → 다운포스 달라짐', {a: 'middle', fs: 11.5, c: ORG}) + T(230, 284, '그림의 각도는 2.5배 과장', {a: 'middle', fs: 10.5, c: 'var(--muted)'}) + `<path d="M230 40V250" stroke="var(--line)"/>`,
      '⑥ 일관되게: 롤이 크면 더블위시본 바깥 바퀴 캠버가 틀어지고 차체 바닥 높이가 바뀌어 그립과 다운포스가 설계대로 나오지 않음', 460, 292); },
  /* ⑦ 완주: 내구 진행에 따른 낼 수 있는 성능 */
  () => { const X = d => 46 + d * 320, Y = p => 200 - p * 140;
    return svg(`${ax(X(0), Y(0), X(1) + 10, Y(1.15), '내구 진행 (20 km)', '낼 수 있는 성능')}
      <path d="M${X(0)} ${Y(.9)}H${X(1)}" stroke="var(--ink)" stroke-width="2.4"/>
      <path d="M${X(.5)} ${Y(.9)}H${X(.55)}C${X(.62)} ${Y(.9)} ${X(.62)} ${Y(.5)} ${X(.7)} ${Y(.5)}H${X(.86)}" fill="none" stroke="${ORG}" stroke-width="2.2" stroke-dasharray="6 4"/>
      <path d="M${X(.86) - 7} ${Y(.5) - 7}l14 14m0 -14l-14 14" stroke="${ORG}" stroke-width="2.4"/>
      ${T(X(1), Y(.9) - 10, '발열 · 체결 관리 → 완주', {a: 'end', b: 1, fs: 11.5})}${T(X(.66), Y(.5) + 24, '과열 → 출력 제한', {a: 'middle', c: ORG, fs: 11.5})}${T(X(.86) + 12, Y(.5) + 5, '정지 · 고장', {c: ORG, fs: 11.5})}`,
      '⑦ 완주: 발열과 체결을 관리하면 끝까지 같은 성능, 부족하면 후반에 출력이 제한되거나 멈춤'); },
  /* ⑧ 효율: 한 구간의 모터 출력. 감속(음수) 중 회생 한계까지는 배터리로(초록), 넘는 부분은 브레이크 열(회색 빗금) */
  () => { const X = t => 40 + t * 330, Y = p => 104 - p * 64, rl = -.45;
    const f = t => t < .3 ? Math.min(1, t / .12) : t < .45 ? -1.1 * Math.sin((t - .3) / .15 * Math.PI) : t < .75 ? Math.min(1, (t - .45) / .1) * .9 : t < .95 ? -.8 * Math.sin((t - .75) / .2 * Math.PI) : 0;
    const seg = (a, b, g) => pts(t => g(f(t)), a, b, 40, X, Y);
    const fillG = (a, b) => `<path d="${seg(a, b, p => Math.max(Math.min(p, 0), rl))}L${X(b)} ${Y(0)}L${X(a)} ${Y(0)}Z" fill="${GRN}" opacity=".5"/><path d="${seg(a, b, p => Math.min(p, rl))}L${X(b)} ${Y(rl)}L${X(a)} ${Y(rl)}Z" fill="url(#gsH)"/>`;
    return svg(`<path d="M${X(0)} ${Y(0)}H${X(1)}" stroke="var(--ink-2)" stroke-width="1.2"/>${T(X(1) + 4, Y(0) + 4, '시간', {c: 'var(--muted)', fs: 11})}<path d="M${X(0)} ${Y(-1.25)}V${Y(1.25)}" stroke="var(--ink-2)" stroke-width="1.2" marker-end="url(#gsA)"/>${T(X(0) + 6, Y(1.25) - 2, '요구 동력 (+ 구동 / − 제동)', {c: 'var(--muted)', fs: 11})}
      <path d="M${X(0)} ${Y(rl)}H${X(1)}" stroke="${GRN}" stroke-dasharray="4 4"/>${T(X(0) - 4, Y(rl) + 4, '회생 한계', {a: 'end', c: GRN, fs: 10.5})}
      ${fillG(.3, .45)}${fillG(.75, .95)}<path d="${pts(f, 0, 1, 240, X, Y)}" fill="none" stroke="var(--ink)" stroke-width="2"/>
      ${T(X(.17), Y(.45), '구동', {a: 'middle', fs: 11.5})}${T(X(.17), Y(.45) + 17, '(에너지 씀)', {a: 'middle', fs: 10.5, c: 'var(--muted)'})}${T(X(.62), Y(.45), '구동', {a: 'middle', fs: 11.5})}
      <rect x="70" y="196" width="14" height="10" fill="${GRN}" opacity=".5"/>${T(90, 205, '회생 → 배터리', {fs: 11.5})}<rect x="210" y="196" width="14" height="10" fill="url(#gsH)" stroke="#9aa3b5"/>${T(230, 205, '나머지 → 브레이크 열', {fs: 11.5})}
      ${T(200, 236, '회생 ↑ = 에너지 ↓, 대신 LSD 감속 측으로 진입 언더 (④와 한 세트)', {a: 'middle', c: ORG, fs: 11.5})}`,
      '⑧ 효율: 감속 에너지 중 회생 한계까지는 배터리로 되찾고 넘는 부분은 브레이크 열. 회생이 클수록 에너지는 줄지만 진입 언더와 절충', 400, 244); },
  ];
})();
/* 세부 목표 번호(①~⑧) → 그림 */
const goalSubFig = d => { const i = '①②③④⑤⑥⑦⑧'.indexOf(String(d.t).trim()[0]); const f = GS[i]; if(!f) return ''; const s = f(); const lab = (s.match(/aria-label="([^"]*)"/) || [])[1] || ''; return `<figure class="gs-fig">${s}<figcaption>${lab.split(':')[1] ? lab.split(':').slice(1).join(':').trim() : lab}</figcaption></figure>`; };
function goalPage(mi){ const m=GOALS[mi], prev=GOALS[mi-1], next=GOALS[mi+1];
  return `${spNav('data-goalgo', prev, mi-1, next, mi+1)}
    <header class="top sp-head"><span class="eyebrow"><span class="st-gn">${mi+1}</span> 목표</span><h1>${m.t}</h1><p class="lede">${esc(m.s)}</p></header>
    <section class="gp-sec"><p class="gp-why">${m.why}</p></section>
    <section class="gp-list"><h2>세부 목표 <span class="muted">${m.subs.length}개</span></h2><div class="gp-subs">${m.subs.map(goalSubCard).join('')}</div></section>`; }
/* 세부 목표 카드 (2026-11-24): 접지 않고 다 보임. 왼쪽 = 목표(핵심 한 줄) · 왜 · 연결, 오른쪽 = 근거 · 판단 기준 · 관련 설계 항목 */
function goalSubCard(d){ const its=[...d.go].filter(id=>IT[id]).sort((a,b)=>(SIDX[IT[a].s]-SIDX[IT[b].s])||(((ACT[a]||[99])[0])-((ACT[b]||[99])[0])));
  const fig = goalSubFig(d);
  return `<article class="gsub${fig?' has-fig':''}"><h3 class="gs-t">${d.t}</h3>
    <div class="gs-grid"><div class="gs-main">
        <p class="gs-goal"><span class="gs-k">목표</span>${d.g}</p>
        <p class="gs-why">${d.why}</p>
        <p class="gs-rel"><span aria-hidden="true">↳</span> ${d.rel}</p></div>${fig}
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
