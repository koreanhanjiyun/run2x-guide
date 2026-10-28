function renderSteps(){
  $('#step-list').innerHTML = PHASES.map((ph,i)=>`<section class="phase${i%2?' alt':''}">
    <div class="phase-h"><span class="phase-k">${ph.k}</span><span class="phase-n">${ph.n}</span><span class="phase-r">${ph.s[0]} – ${ph.s[ph.s.length-1]}</span></div>
    <div class="stack">${ph.s.map(id=>stepHTML(STEPS[SIDX[id]])).join('')}</div></section>`).join('');
}

const TV = rows => `<div class="tbl"><table class="kvt">${rows.map(([k,v])=>`<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table></div>`;
function goalSubHTML(d){ return `<details class="item"><summary><span class="iname">${d.t}</span></summary><div class="dbody">
        <p class="gwhy">${d.why}</p><p class="grel">연결 · ${d.rel}</p>
        ${TV([['목표',d.g],['근거',d.w],['판단 기준',d.j]])}
        <div class="sec-label">관련 설계 항목</div><div class="chips">${[...d.go].filter(id=>IT[id]).sort((a,b)=>(SIDX[IT[a].s]-SIDX[IT[b].s])||(((ACT[a]||[99])[0])-((ACT[b]||[99])[0]))).map(id=>`<button class="chip" data-goto="${id}"><span class="dot" style="background:${pc(IT[id].p)}"></span>${IT[id].s} · ${IT[id].n}</button>`).join('')}</div>
      </div></details>`; }
function renderGoals(){ if(!$('#goal-tree')) return; }   // 목표 탭은 없앰: 목표는 시작 탭 목표 화면(start.js goalPage), 대회 점수는 팀 탭
/* 팀 탭 '대회 점수': FS 종목별 배점 막대 + 우리 팀 기록 막대(records.js) + 보고서 평가 */
function fsScoreHTML(){ const tot = FS_SCORE.reduce((a,x)=>a+x[1],0);
  return `<section class="fs-goal"><h2>FS 대회 점수</h2>
      <p class="gwhy">FS는 '빠른 차'를 여러 종목으로 나눠 점수를 매깁니다. 기록 종목(가속·스키드패드·오토크로스·내구)은 시작 탭의 다섯 가지 목표가 그대로 점수가 되고, 효율과 보고서는 FS가 따로 묻는 것입니다. 내구는 완주하지 못하면 0점이고, 최고 기록의 145%를 넘으면 완주 점수만 받습니다(경기진행규정 제11조).</p>
      <div class="fs-bar" role="img" aria-label="종목별 배점 ${FS_SCORE.map(x=>x[0]+' '+x[1]+'점').join(', ')}, 합계 ${tot}점">${FS_SCORE.map(([n,v],i)=>`<span class="fsb-${i}" style="flex:${v}"><b>${n}</b><i>${v}</i></span>`).join('')}</div>
      <p class="muted fs-tot">합계 ${tot.toLocaleString()}점</p>
      <div class="fs-rec" id="fsRec"></div>
      <div class="stack fs-more">${goalSubHTML(Object.assign({}, FS_GOAL, {t:'보고서 평가 · '+FS_GOAL.t}))}</div>
    </section>`; }
function renderFlow(){
  let n=0;
  $('#flow-list').innerHTML = PHASES.map(ph=>`<section class="flow-phase"><div class="phase-h"><span class="phase-k">${ph.k}</span><span class="phase-n">${ph.n}</span></div>
    ${ph.s.map(sid=>{ const st=STEPS[SIDX[sid]]; const its=ITEMS.filter(i=>i.s===sid).sort((a,b)=>((ACT[a.id]||[99])[0])-((ACT[b.id]||[99])[0]));
      return `<div class="flow-step" data-fs="${sid}"><div class="flow-sh"><span class="scode">${st.fz?'★ ':''}${sid}</span><span class="stitle">${st.t.replace('★ ','')}</span></div>
      <ol class="flow-ol">${its.map(it=>{ const a=ACT[it.id]||[0,it.d,[],[],[]]; n++;
        return `<li data-fid="${it.id}"><span class="fnum">${n}</span><div class="fbody"><div class="fhead"><button class="lnk" data-goto="${it.id}">${it.n}</button>${chip(it.p)}</div>
          <div class="fact">${a[1]}${a[5]?' '+V:''}</div>${a[2].length?`<div class="fdec"><span class="vlab dec">우리 팀 값</span>${a[2].map(t=>`<span class="vchip dec">${t}</span>`).join('')}</div>`:''}</div></li>`; }).join('')}</ol></div>`; }).join('')}</section>`).join('');
}
function refSrcExtra(){ if(typeof srcList!=='function') return '';
  const g=[['시작 탭 배경 글',typeof BG_SRC!=='undefined'?BG_SRC:null],['F1 기술',typeof F1_TECH_SRC!=='undefined'?F1_TECH_SRC:null],['부품 소개',typeof COMP_SRC!=='undefined'?COMP_SRC:null]].filter(x=>x[1]&&x[1].length);
  return g.map(([h,a])=>`<h4 class="src-h">${h}</h4><ul class="pl">${srcList(a)}</ul>`).join(''); }
function renderRefs(){ $('#ref-list').innerHTML = REFS.map(r=>`<details class="step"><summary><span class="stitle">${r.t}</span><span class="ssub">${r.s}</span></summary><div class="dbody">${r.t==='출처'?'<h4 class="src-h">설계 탭 본문</h4>'+r.b+refSrcExtra():r.b}</div></details>`).join(''); }

/* ============================================================
   연결도
   ============================================================ */
const COLW=240, NW=184, NH=54, VG=14, LP=16, HEADH=104, LABW=130, NX=28;
const POS = {}, LANETOP = {}, PORT = {}; let GW=0, GH=0;
function layoutGraph(){
  const lanes = PARTS.map(p=>p[0]).filter(p=>ITEMS.some(i=>i.p===p));
  let y = HEADH + 8; const laneInfo = [];
  lanes.forEach(p=>{
    const cnt = {}; ITEMS.filter(i=>i.p===p).forEach(i=>{ cnt[i.s]=(cnt[i.s]||0)+1; });
    const rows = Math.max(1, ...Object.values(cnt));
    const h = rows*(NH+VG)-VG + 2*LP;
    const idx = {};
    ITEMS.filter(i=>i.p===p).forEach(i=>{ const k = idx[i.s]||0; idx[i.s]=k+1;
      POS[i.id] = {x: LABW + SIDX[i.s]*COLW + NX, y: y + LP + k*(NH+VG)}; });
    LANETOP[p] = y; laneInfo.push({p,y,h}); y += h + 4;
  });
  GW = LABW + STEPS.length*COLW + 30; GH = y + 20;
  computePorts();
  return laneInfo;
}
/* 입출력 포트: 한 변에 들어오는 선과 나가는 선이 함께 있으면 위 절반 = 들어옴, 아래 절반 = 나감 */
function edgeKind(e){ const ca=SIDX[IT[e[0]].s], cb=SIDX[IT[e[1]].s]; return cb>ca?'fwd':(cb===ca?'same':'back'); }
function computePorts(){
  const sides = {}; const add = (id,side,obj) => { const k=id+'|'+side; (sides[k]=sides[k]||[]).push(obj); };
  EDGES.forEach((e,i)=>{ const k=edgeKind(e);
    const so = k==='back' ? 'L' : 'R', ti = k==='fwd' ? 'L' : 'R';
    add(e[0], so, {i, role:'out', oy: POS[e[1]].y});
    add(e[1], ti, {i, role:'in',  oy: POS[e[0]].y}); });
  Object.entries(sides).forEach(([k,list])=>{
    const [id,side] = k.split('|'); const P = POS[id];
    const ins = list.filter(o=>o.role==='in').sort((a,b)=>a.oy-b.oy), outs = list.filter(o=>o.role==='out').sort((a,b)=>a.oy-b.oy);
    const place = (arr,yy) => arr.forEach(o=>{ const x = side==='R' ? P.x+NW : P.x; PORT[o.i] = PORT[o.i]||{}; PORT[o.i][o.role] = {x, y:P.y+yy, side}; });
    if(ins.length && outs.length){ place(ins, NH*0.3); place(outs, NH*0.7); }
    else { place(ins, NH/2); place(outs, NH/2); }
  });
}
function edgePath(e,i){
  const k = edgeKind(e), S = PORT[i].out, T = PORT[i].in;
  const sdir = S.side==='R'?1:-1, tdir = T.side==='R'?1:-1;      // 변 바깥쪽 방향
  const s1 = [S.x+sdir*8, S.y], t1 = [T.x+tdir*14, T.y], tip = [T.x+tdir*1, T.y];
  let c1, c2;
  if(k==='fwd'){ const dx = Math.max(40,(t1[0]-s1[0])*0.45); c1=[s1[0]+dx,s1[1]]; c2=[t1[0]-dx,t1[1]]; }
  else if(k==='same'){ const dx = 46 + Math.abs(T.y-S.y)*0.12; c1=[s1[0]+dx,s1[1]]; c2=[t1[0]+dx,t1[1]]; }
  else { const dx = 110; c1=[s1[0]-dx,s1[1]+50]; c2=[t1[0]+dx,t1[1]+50]; }
  return `M${S.x} ${S.y} L${s1[0]} ${s1[1]} C${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${t1[0]} ${t1[1]} L${tip[0]} ${tip[1]}`;
}
function wrap2(t, n){ if(t.length<=n) return [t]; let cut = t.lastIndexOf(' ', n); if(cut<4) cut = n; return [t.slice(0,cut).trim(), t.slice(cut).trim()]; }
function renderGraph(){
  const lanes = layoutGraph();
  const svg = $('#graph');
  let h = `<defs>${[['d','#9c9482'],['i','var(--in)'],['o','var(--out)']].map(([k,c])=>`<marker id="g${k}" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="${k==='d'?8:11}" markerHeight="${k==='d'?8:11}" orient="auto"><path d="M0 0.8L10 5L0 9.2z" style="fill:${c}"/></marker>`).join('')}</defs><g id="world">`;
  lanes.forEach((L,i)=>{ h += `<rect class="lane${i%2?' alt':''}" x="0" y="${L.y}" width="${GW}" height="${L.h}"/>
    <rect x="0" y="${L.y}" width="6" height="${L.h}" style="fill:${pc(L.p)}"/>
    <text class="lanelbl" x="16" y="${L.y+L.h/2+5}">${L.p}</text>`; });
  PHASES.forEach((ph,pi)=>{ const c0=SIDX[ph.s[0]], c1=SIDX[ph.s[ph.s.length-1]]; const x0=LABW+c0*COLW, x1=LABW+(c1+1)*COLW;
    h += `<rect class="phband${pi%2?' alt':''}" x="${x0+4}" y="6" width="${x1-x0-8}" height="28" rx="5"/>
    <text class="phtext" x="${x0+14}" y="25">${ph.k} ${ph.n}</text>
    <line class="phsep" x1="${x0}" y1="6" x2="${x0}" y2="${GH}"/>`; });
  STEPS.forEach((s,i)=>{ const x = LABW + i*COLW;
    h += `<line class="colsep${s.fz?' fz':''}" x1="${x}" y1="${HEADH}" x2="${x}" y2="${GH}"/>
    <rect class="colh${s.fz?' fz':''}" x="${x+4}" y="40" width="${COLW-8}" height="${HEADH-46}" rx="6"/>
    <text class="colcode" x="${x+14}" y="66">${s.fz?'★ ':''}${s.id}</text>
    <text class="colname" x="${x+14}" y="86">${s.t.replace('★ ','')}</text>`; });
  h += `<g id="edges">` + EDGES.map((e,i)=>`<path class="e${edgeKind(e)==='back'?' back':''}" data-i="${i}" d="${edgePath(e,i)}" marker-end="url(#gd)"><title>${IT[e[0]].n} → ${IT[e[1]].n}: ${e[2]}</title></path>`).join('') + `</g>`;
  h += ITEMS.map(it=>{ const P = POS[it.id]; const L = wrap2(it.n, 11);
    return `<g class="node" data-id="${it.id}" tabindex="-1" role="button" aria-label="${it.s} ${stripT(it.n)} (${it.p})" transform="translate(${P.x},${P.y})">
      <rect class="nb" width="${NW}" height="${NH}" rx="6"/><rect class="pbar" x="0" y="0" width="5" height="${NH}" rx="2" style="fill:${pc(it.p)}"/>
      ${it.c?`<circle class="cardmark" cx="${NW-10}" cy="10" r="4"/>`:''}<g class="stbadge" transform="translate(${NW-12},${NH-11})"><circle r="8"/><text y="4" text-anchor="middle"></text></g>
      ${L.length===1?`<text x="14" y="${NH/2+5}">${L[0]}</text>`:`<text x="14" y="23">${L[0]}</text><text x="14" y="42">${L[1]}</text>`}</g>`; }).join('');
  h += `</g>`;
  svg.innerHTML = h;
  svg.querySelectorAll('.node').forEach(n=>n.addEventListener('keydown',ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); if(n.dataset.id===SEL) clearSel(); else selectItem(n.dataset.id, false); return; }
    /* D5: 방향키로 가까운 항목으로 이동 (Tab은 연결도 전체에서 한 번만 멈춤) */
    const dir={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowUp:[0,-1]}[ev.key]; if(!dir) return; ev.preventDefault();
    const P=POS[n.dataset.id]; let best=null, bd=1e9;
    ITEMS.forEach(i=>{ if(i.id===n.dataset.id) return; const Q=POS[i.id], dx=Q.x-P.x, dy=Q.y-P.y; const along=dx*dir[0]+dy*dir[1]; if(along<=4) return; const side=Math.abs(dx*dir[1])+Math.abs(dy*dir[0]); const d=along+side*2.5; if(d<bd){ bd=d; best=i.id; } });
    if(best){ const m=svg.querySelector(`.node[data-id="${best}"]`); n.tabIndex=-1; m.tabIndex=0; m.focus(); try{ centerOn(best); }catch(e){} } }));
  const first=svg.querySelector('.node'); if(first) first.tabIndex=0;
  svg.setAttribute('role','group'); svg.setAttribute('aria-label','설계 항목 연결도: 방향키로 항목을 옮겨 다니고 Enter로 선택합니다. 같은 내용을 아래 연결 목록 표로도 볼 수 있습니다.');
  renderGraphList();
}

/* 이동·확대 */
const view = {x:0,y:0,k:0.9}; let world, anim=null;
function applyView(){ world = world || $('#world'); if(world) world.setAttribute('transform',`translate(${view.x},${view.y}) scale(${view.k})`); }
function zoomAt(px,py,f){ if(anim){cancelAnimationFrame(anim);anim=null;} const k2 = Math.min(2.2, Math.max(0.16, view.k*f)); view.x = px - (px-view.x)*(k2/view.k); view.y = py - (py-view.y)*(k2/view.k); view.k = k2; applyView(); }
function animateTo(tx,ty,tk,ms){
  if(anim) cancelAnimationFrame(anim);
  const sx=view.x, sy=view.y, sk=view.k, t0=performance.now(), dur=ms||600;
  const ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const step = now => { const t=Math.min(1,(now-t0)/dur), e=ease(t);
    view.x=sx+(tx-sx)*e; view.y=sy+(ty-sy)*e; view.k=sk+(tk-sk)*e; applyView();
    if(t<1) anim=requestAnimationFrame(step); else anim=null; };
  anim = requestAnimationFrame(step);
}
function fitAll(){ const r = $('#graph').getBoundingClientRect(); const k = Math.min(r.width/GW, r.height/GH)*0.97; animateTo((r.width-GW*k)/2,(r.height-GH*k)/2,k); }
function home(){ animateTo(10,56,0.9); }
function centerOn(id){ const r = $('#graph').getBoundingClientRect(); const P = POS[id]; if(!P) return; const k = Math.max(view.k,0.85);
  animateTo(r.width/2-(P.x+NW/2)*k, r.height/2-(P.y+NH/2)*k, k, 700); }
function initPanZoom(){
  const svg = $('#graph'); const ptrs = new Map(); let moved=0, downNode=null, last=null, pinch=null;
  svg.addEventListener('pointerdown',e=>{ if(anim){cancelAnimationFrame(anim);anim=null;} svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); moved=0; downNode=e.target.closest('.node'); last={x:e.clientX,y:e.clientY};
    if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y)}; } });
  svg.addEventListener('pointermove',e=>{ if(!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1){ const dx=e.clientX-last.x, dy=e.clientY-last.y; moved+=Math.abs(dx)+Math.abs(dy); if(moved>4){ svg.classList.add('dragging'); view.x+=dx; view.y+=dy; applyView(); } last={x:e.clientX,y:e.clientY}; }
    else if(ptrs.size===2 && pinch){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); const r=svg.getBoundingClientRect(); zoomAt((a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,d/pinch.d); pinch.d=d; moved=99; } });
  const up = e=>{ if(!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null;
    if(ptrs.size===0){ svg.classList.remove('dragging'); if(moved<=4){ if(downNode && downNode.dataset.id!==SEL) selectItem(downNode.dataset.id,false); else clearSel(); } last=null; } else { const v=[...ptrs.values()][0]; last={x:v.x,y:v.y}; } };
  svg.addEventListener('pointerup',up); svg.addEventListener('pointercancel',up);
  svg.addEventListener('wheel',e=>{ e.preventDefault(); const r=svg.getBoundingClientRect(); zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*0.0015)); },{passive:false});
  $('#z-in').onclick=()=>{ const r=svg.getBoundingClientRect(); zoomAt(r.width/2,r.height/2,1.25); };
  $('#z-out').onclick=()=>{ const r=svg.getBoundingClientRect(); zoomAt(r.width/2,r.height/2,0.8); };
  $('#z-fit').onclick=fitAll; $('#z-home').onclick=home;
  
}
/* 선택 */
let SEL=null, PSEL=null, SHOWALL=true; let PSET=new Set();
function applySel(){
  const svg=$('#graph'); const src=new Set(), dst=new Set();
  svg.querySelectorAll('path.e').forEach(p=>{ const e=EDGES[+p.dataset.i]; p.classList.remove('in','out','dim','hide'); let m='url(#gd)';
    if(SEL){ if(e[1]===SEL){p.classList.add('in');m='url(#gi)';src.add(e[0]);} else if(e[0]===SEL){p.classList.add('out');m='url(#go)';dst.add(e[1]);} else p.classList.add(SHOWALL?'dim':'hide'); }
    else if(PSET.size){ const a=PSET.has(IT[e[0]].p), b=PSET.has(IT[e[1]].p); if(PSET.size>1 ? !(a&&b) : !(a||b)) p.classList.add(SHOWALL?'dim':'hide'); }
    else if(!SHOWALL) p.classList.add('hide');
    p.setAttribute('marker-end',m); });
  svg.querySelectorAll('.node').forEach(n=>{ const id=n.dataset.id;
    n.classList.toggle('sel',id===SEL); n.classList.toggle('srcN',src.has(id)); n.classList.toggle('dstN',dst.has(id));
    const dim = SEL ? (id!==SEL && !src.has(id) && !dst.has(id)) : (PSET.size ? !PSET.has(IT[id].p) : false);
    n.classList.toggle('dim',dim); });
  if(SEL){ const eg=$('#edges'); eg.querySelectorAll('path.in,path.out').forEach(p=>eg.appendChild(p)); }
  if(typeof updateGraphHint==='function') updateGraphHint();
}
function panelHTML(id){ const it=IT[id]; const st=STEPS[SIDX[it.s]];
  const ins=(IN[id]||[]).map(i=>EDGES[i]), outs=(OUT[id]||[]).map(i=>EDGES[i]);
  const li=(oid,lbl,cls)=>`<li class="${cls}"><button class="lnk" data-sel="${oid}">${IT[oid].n}</button><span class="lbl">${IT[oid].s} · ${IT[oid].p} — ${lbl}</span></li>`;
  return `<div class="chips"><span class="chip" style="font-family:var(--f-display);font-weight:700;color:var(--accent)">${it.s}</span>${chip(it.p)}${it.c?'<span class="badge b-card">상세</span>':''}</div>
  <h3>${it.n}</h3><div class="strow"><span class="ipill" data-id="${id}" hidden></span><div class="stbox" data-id="${id}" hidden></div></div><p class="muted" style="font-size:14px">${PHASES[PHASE_OF[it.s]].k} ${st.t.replace('★ ','')} 단계</p>
  ${actHTML(id,true)}
  ${it.c?`<div class="concl" style="font-size:14px"><b class="tag">참고</b>${CARD[it.c].c}</div>`:''}
  <div><button class="btn pri" data-open="${id}">${it.c?'상세 카드 열기':'설계 탭에서 보기'}</button></div>
  <div><div class="ih">받는 정보 ${ins.length}</div>${ins.length?`<ul>${ins.map(e=>li(e[0],e[2],'i')).join('')}</ul>`:'<p class="muted" style="font-size:13.5px">없음</p>'}</div>
  <div><div class="oh">넘기는 결과 ${outs.length}</div>${outs.length?`<ul>${outs.map(e=>li(e[1],e[2],'o')).join('')}</ul>`:'<p class="muted" style="font-size:13.5px">없음</p>'}</div>`; }
function emptyPanel(){ return `<h3>항목을 선택하십시오</h3><p class="muted" style="font-size:14.5px">상자를 누르면 그 항목이 받는 선(파랑)과 넘기는 선(초록)이 강조되고, 여기에 내용이 정리됩니다.</p>
  <div class="note">보라 점 = 상세 카드 있음<br>점선 = 뒤 단계 결과로 앞 단계 값을 다시 계산하는 되돌림</div>
  <div class="sec-label">규모</div><p style="font-size:14px">항목 ${ITEMS.length}개 · 연결 ${EDGES.length}개 · 단계 ${STEPS.length}개</p>`; }
function setPanel(html){ const p=$('#gpanel'); if(!p) return; p.hidden=!SEL; p.innerHTML=(SEL?'<button class="gp-x" data-gclose aria-label="닫기" title="닫기">×</button>':'')+html; subify(p); try{ p.querySelectorAll('.stbox').forEach(renderSB); refreshStatus(); }catch(e){} p.scrollTop=0; refreshStatus(); }
function selectItem(id, center){ SEL=id; applySel(); setPanel(panelHTML(id)); if(center){ centerOn(id); setTimeout(()=>graphFlash(id),450); } }
function clearSel(){ SEL=null; applySel(); setPanel(emptyPanel()); }
function renderPartFilter(){
  const rail=$('#partRail'); let coll=false; try{ coll = localStorage.getItem('run2x.rail')==='1'; const _pv = localStorage.getItem('run2x.part'); let _pa=[]; try{ _pa = JSON.parse(_pv); }catch(_){ _pa = _pv ? [_pv] : []; } if(!Array.isArray(_pa)) _pa = _pa ? [String(_pa)] : []; PSET = new Set(_pa.filter(p=>PCOL[p])); PSEL = PSET.size ? [...PSET].pop() : null; }catch(e){}
  rail.innerHTML = `<button class="rail-h" id="railToggle" title="파트 패널 접기/펼치기"><span>파트</span><i></i></button><div class="rail-b">${PARTS.map(([p])=>`<button class="rchip" aria-pressed="false" data-part="${p}"><span class="dot" style="background:${pc(p)}"></span>${p}</button>`).join('')}<button class="rclr" id="railClear" hidden>선택 해제</button></div>`;
  rail.classList.toggle('coll', coll);
  rail.addEventListener('click', e=>{
    if(e.target.closest('#railToggle')){ rail.classList.toggle('coll'); try{ localStorage.setItem('run2x.rail', rail.classList.contains('coll')?'1':'0'); }catch(_){} applyPart(); return; }
    if(e.target.closest('#railClear')){ PSET.clear(); PSEL=null; try{ localStorage.removeItem('run2x.part'); }catch(_){} applyPart(); return; }
    const b=e.target.closest('[data-part]'); if(!b) return;
    const _p=b.dataset.part; if(PSET.has(_p)) PSET.delete(_p); else PSET.add(_p); PSEL = PSET.size ? [...PSET].pop() : null; try{ PSET.size ? localStorage.setItem('run2x.part',JSON.stringify([...PSET])) : localStorage.removeItem('run2x.part'); }catch(_){}
    if(SEL){ SEL=null; setPanel(emptyPanel()); } applyPart();
  });
}

/* D5: 연결도를 표로도 (화면 낭독기·키보드 사용자, 인쇄용) */
function renderGraphList(){ const el=$('#glist'); if(!el) return;
  el.innerHTML = `<summary>연결 목록 표로 보기 <span class="muted">항목마다 받는 정보와 넘기는 결과</span></summary><div class="tbl glist-t"><table class="kvt"><thead><tr><th>단계</th><th>항목</th><th>파트</th><th>받는 정보 (어디서)</th><th>넘기는 결과 (어디로)</th></tr></thead><tbody>${
    [...ITEMS].sort((a,b)=>(SIDX[a.s]-SIDX[b.s])||(((ACT[a.id]||[99])[0])-((ACT[b.id]||[99])[0]))).map(i=>{ const ins=EDGES.filter(e=>e[1]===i.id), outs=EDGES.filter(e=>e[0]===i.id);
      return `<tr><td>${i.s}</td><td><button type="button" class="lnk" data-goto="${i.id}">${i.n}</button></td><td>${i.p}</td><td>${ins.map(e=>`${IT[e[0]].n} <span class="muted">(${e[2]})</span>`).join('<br>')||'<span class="muted">—</span>'}</td><td>${outs.map(e=>`${IT[e[1]].n} <span class="muted">(${e[2]})</span>`).join('<br>')||'<span class="muted">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>`; }
