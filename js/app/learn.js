/* ============================================================
   0.10 시안: 학습 경로 · 보기 전환 · 모드 · 목차 · 목표 경로 · 용어 미리보기
              확인 질문 · 계산기 · 앞뒤 연결 그림 · 단계 일정 · 우리 팀 값
   ============================================================ */
const PREF = (k,d)=>{ try{ const v=localStorage.getItem('run2x.'+k); return v===null?d:v; }catch(e){ return d; } };
const SETP = (k,v)=>{ try{ localStorage.setItem('run2x.'+k,v); }catch(e){} };
let VMODE = PREF('view','full');      // flow | full
let UMODE = PREF('mode','study');     // study | manage
let SEASON = PREF('season', String(new Date().getFullYear()));
const D2R = Math.PI/180;
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- 목표 경로 ---------- */
const GOAL_OF = {};
GOALS.forEach((m,mi)=>m.subs.forEach((d,di)=>(d.go||[]).forEach(id=>{ (GOAL_OF[id]=GOAL_OF[id]||[]).push([mi,di]); })));
function goalPath(id){
  if(GOAL_OF[id]) return {via:null, g:GOAL_OF[id]};
  const seen=new Set([id]), q=[[id,[]]];
  while(q.length){ const [x,path]=q.shift();
    for(const ei of (OUT[x]||[])){ const y=EDGES[ei][1]; if(seen.has(y)) continue;
      if(SIDX[IT[y].s] < SIDX[IT[x].s]) continue;             // 되돌림 선은 따라가지 않음
      seen.add(y); const p2=[...path,y]; if(GOAL_OF[y]) return {via:p2, g:GOAL_OF[y]}; q.push([y,p2]); } }
  return null; }
function goalHTML(id){ const r=goalPath(id); if(!r) return '';
  const gl = r.g.slice(0,2).map(([mi,di])=>`<button class="gpath-g" data-goal="${mi}.${di}">${GOALS[mi].t} › ${GOALS[mi].subs[di].t}</button>`).join('');
  const via = r.via ? `<span class="gpath-via">이 항목 → ${r.via.map(v=>`<button class="lnk" data-goto="${v}">${IT[v].n}</button>`).join(' → ')} →</span>` : '';
  return `<div class="gpath"><span class="gpath-l">왜 하나</span>${via}${gl}</div>`; }
function tagGoals(){
  document.querySelectorAll('#goal-tree > .stack > details').forEach((m,mi)=>{ m.id='g-'+mi;
    m.querySelectorAll(':scope > .dbody > .stack > details.item').forEach((d,di)=>{ d.id='g-'+mi+'-'+di; }); }); }
function openGoal(mi,di){ pushHist(); showTab('goals', true);
  const m=$('#g-'+mi), d=$('#g-'+mi+'-'+di); if(!m||!d) return; m.open=true; d.open=true;
  const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50;
  requestAnimationFrame(()=>smoothScrollTo(()=>d.getBoundingClientRect().top+window.scrollY-tabh-70, ()=>markHere(d))); }

/* ---------- 앞뒤 연결 그림 ---------- */
function ioMap(id){
  const ins=(IN[id]||[]).map(i=>EDGES[i]), outs=(OUT[id]||[]).map(i=>EDGES[i]), me=IT[id];
  const box=(oid,lbl)=>`<button class="iom-b" data-goto="${oid}" style="--pc:${pc(IT[oid].p)}"><b>${IT[oid].n}</b><small>${IT[oid].s} · ${IT[oid].p}</small><em>${lbl}</em></button>`;
  return `<div class="iom"><div class="iom-h ih">받는 정보 ${ins.length}</div><div></div><div class="iom-h" style="text-align:center">이 항목</div><div></div><div class="iom-h oh">넘기는 결과 ${outs.length}</div>
    <div class="iom-c">${ins.length?ins.map(e=>box(e[0],e[2])).join(''):'<span class="iom-none">없음 (시작점)</span>'}</div>
    <div class="iom-ar">→</div><div class="iom-me" style="--pc:${pc(me.p)}"><b>${me.n}</b><small>${me.s} · ${me.p}</small></div><div class="iom-ar">→</div>
    <div class="iom-c">${outs.length?outs.map(e=>box(e[1],e[2])).join(''):'<span class="iom-none">없음 (끝점)</span>'}</div></div>`; }

/* ---------- 계산기 (카드 공식과 동일) ---------- */
const f1 = (x,d) => (Math.round(x*Math.pow(10,d||1))/Math.pow(10,d||1)).toLocaleString('ko-KR');
const CALC = {
  scrub:{t:'스크럽 반경', ins:[['dl','d_l','아래 볼조인트 ~ 휠 중심면 가로 거리 (안쪽 +)','mm',40],['zl','z_l','아래 볼조인트 높이','mm',120],['sg','σ','KPI','°',9.5]],
    f:v=>{ const rs=v.dl-v.zl*Math.tan(v.sg*D2R), s0=Math.atan(v.dl/v.zl)/D2R;
      return [['r_s = d_l − z_l·tanσ', `${v.dl} − ${v.zl}·tan ${v.sg}° = <b>${f1(rs)} mm</b>`],
              ['스크럽 0으로 만들려면', `σ = arctan(d_l / z_l) = <b>${f1(s0)}°</b> 필요 (같은 d_l, z_l일 때)`]]; }},
  trail:{t:'기계적 트레일', ins:[['R','R','타이어 반경 (예: 10인치 림 Hoosier 16.0×7.5-10)','mm',206],['nu','ν','캐스터','°',4.9],['e','e','캐스터 오프셋 (축이 휠 중심 앞 +)','mm',0],['Fy','F_y','앞바퀴 한쪽 횡력','N',1213]],
    f:v=>{ const t=v.R*Math.tan(v.nu*D2R)-v.e;
      return [['t_mech = R·tanν − e', `${v.R}·tan ${v.nu}° − ${v.e} = <b>${f1(t)} mm</b>`],
              ['기계적 트레일에 의한 복원 모멘트', `M_z = F_y·t_mech = ${v.Fy}·${f1(t/1000,4)} = <b>${f1(v.Fy*t/1000)} N·m</b> (뉴매틱 트레일 제외)`]]; }},
  maxsteer:{t:'최대 조향각 · 최소 회전 반경', ins:[['s','s_max','랙 최대 이송 (한쪽)','mm',30],['la','l_arm','너클암 길이','mm',75],['L','L','휠베이스','mm',1550]],
    f:v=>{ const r=v.s/v.la; if(r>=1) return [['δ_max','랙 이송이 너클암보다 깁니다. 값을 확인하십시오.']];
      const d=Math.asin(r), R=v.L/Math.tan(d)/1000;
      return [['δ_max ≈ arcsin(s_max / l_arm)', `arcsin(${v.s}/${v.la}) = <b>${f1(d/D2R)}°</b>`],
              ['R_min ≈ L / tan δ_max', `${v.L/1000} / tan ${f1(d/D2R)}° = <b>${f1(R,2)} m</b>`]]; }},
  ack:{t:'애커먼 기하 항', ins:[['L','L','휠베이스','mm',1550],['t','t','앞 트레드','mm',1200],['R','R','회전 반경 (뒤축 중앙 기준)','m',3.57]],
    f:v=>{ const d=(v.L/1000)*(v.t/1000)/(v.R*v.R);
      return [['δ_in − δ_out ≈ L·t / R² (기하 항)', `${v.L/1000}·${v.t/1000} / ${v.R}² = ${f1(d,4)} rad = <b>${f1(d/D2R)}°</b>`],
              ['참고', '슬립 항(α_in − α_out)은 반대 부호로 이 값을 줄입니다. 카드의 질문을 함께 보십시오.']]; }},
  rollgrad:{t:'롤 구배 (스프링 + 안티롤바)', ins:[['m','m','차량 질량 (드라이버 포함)','kg',330],['hr','h_r','CG ~ 롤축 높이','m',0.24],['kf','k_f','앞 바퀴당 롤 강성 k_w + 2k_arb (17.3 + 2 × 10.2)','N/mm',37.7],['kr','k_r','뒤 바퀴당 롤 강성 k_w + 2k_arb (17.3 + 2 × 3.9)','N/mm',25.1],['tf','t_f','앞 트레드','m',1.2],['tr','t_r','뒤 트레드','m',1.2]],
    f:v=>{ const Kf=v.kf*1000*v.tf*v.tf/2, Kr=v.kr*1000*v.tr*v.tr/2, K=Kf+Kr, mgh=v.m*9.81*v.hr;
      if(K<=mgh) return [['φ/a_y','롤강성이 m·g·h_r보다 작아 계산할 수 없습니다.']];
      const g=v.m*v.hr/(K-mgh)*9.81/D2R;
      return [['K_φ,축 ≈ k·t²/2', `앞 ${f1(Kf,0)} · 뒤 ${f1(Kr,0)} N·m/rad (앞 비율 <b>${f1(Kf/K*100)}%</b>)`],
              ['φ/a_y = m·h_r / (K_φ − m·g·h_r)', `<b>${(Math.round(g*100)/100).toFixed(2)} °/g</b>`]]; }},
  aero:{t:'다운포스와 최대 횡가속도', ins:[['mu','μ','타이어 마찰계수','',1.5],['m','m','차량 질량','kg',330],['v','v','코너 속도','km/h',54],['cla','C_L·A','양력계수 × 면적','m²',3]],
    f:v=>{ const vs=v.v/3.6, L=0.5*1.2*vs*vs*v.cla, a0=v.mu*9.81, a=v.mu*(v.m*9.81+L)/v.m;
      return [['L = ½ρv²·C_L·A (ρ = 1.2)', `<b>${f1(L,0)} N</b> (${v.v} km/h)`],
              ['a_y,max = μ(mg + L)/m', `${f1(a/9.81,2)} g (다운포스 없으면 ${f1(a0/9.81,2)} g, <b>+${f1((a/a0-1)*100)}%</b>)`]]; }}
};
function calcHTML(key){ const c=CALC[key]; if(!c) return '';
  return `<details class="calc" data-calc="${key}"><summary><b>직접 계산해 보기</b><span class="muted"> · ${c.t} · 예시값은 가정값입니다. 우리 팀 값으로 바꿔 보십시오.</span></summary>
    <div class="calc-b"><div class="calc-in">${c.ins.map(([k,sym,lab,u,d])=>`<label><span class="cs">${sym}</span><span class="cl">${lab}</span><input type="number" step="any" data-ck="${k}" value="${d}"><span class="cu">${u}</span></label>`).join('')}</div>
    <div class="calc-out"></div><button class="btn small" data-creset>예시값으로</button></div></details>`; }
function runCalc(box){ const c=CALC[box.dataset.calc]; const v={};
  box.querySelectorAll('[data-ck]').forEach(i=>{ v[i.dataset.ck]=parseFloat(i.value); });
  if(Object.values(v).some(x=>!isFinite(x))){ box.querySelector('.calc-out').innerHTML='<p class="muted">숫자를 모두 입력하십시오.</p>'; return; }
  box.querySelector('.calc-out').innerHTML = c.f(v).map(([a,b])=>`<div class="co-r"><span class="co-a">${a}</span><span class="co-b">${b}</span></div>`).join('');
  subify(box.querySelector('.calc-out')); }

/* ---------- 확인 질문 ---------- */
function selfCheck(items){ const qs=[];
  items.forEach(i=>{ if(!i.c || qs.length>=3) return; const L=CARD[i.c].L; const k=L.findIndex(q=>/^질문\s*\d/.test(q.h)); if(k>=0) qs.push([i.id,k,L[k].h.replace(/^질문\s*\d+\.\s*/,'')]); });
  if(!qs.length) return '';
  return `<div class="selfcheck"><div class="sec-label">이 단계 확인 질문 · 먼저 답해 보고 여십시오</div><ol>${qs.map(([id,k,h])=>`<li><span>${h}</span> <span class="muted">(${IT[id].n})</span> <button class="lnk" data-qgo="${id}|${k}">답 보기</button></li>`).join('')}</ol></div>`; }
function openQ(id,k){ pushHist(); setVM('full'); showTab('steps', true);
  const it=IT[id], st=$('#st-'+it.s), el=$('#it-'+id); if(!st||!el) return; st.open=true; el.open=true;
  const q=el.querySelectorAll(':scope > .dbody > .stack > details.q')[k]; if(!q) return; q.open=true;
  requestAnimationFrame(()=>smoothScrollTo(()=>q.getBoundingClientRect().top+window.scrollY-stickyOffset()-50, ()=>markHere(q))); }

/* ---------- 용어 미리보기 ---------- */
let TERMS=[], TRE=null;
function buildTerms(){
  const d=[...document.querySelectorAll('#ref-list > details')].find(x=>x.querySelector(':scope>summary .stitle')?.textContent.trim()==='용어집'); if(!d) return;
  { const tb=d.querySelector('tbody'); if(tb){ const hg=t=>/^[가-힣]/.test(t)?0:1; const rows=[...tb.rows]; rows.sort((x,y)=>{ const a1=x.cells[0].textContent.trim(), b1=y.cells[0].textContent.trim(); return (hg(a1)-hg(b1)) || a1.localeCompare(b1,'ko'); }); rows.forEach(r=>tb.appendChild(r)); const tw=tb.closest('.tbl'); if(tw) tw.classList.add('glos-scroll'); } }
  const skip=new Set(['팀 결정값','계산값','제약']);
  d.querySelectorAll('tbody tr').forEach(tr=>{ const name=tr.cells[0].textContent.trim(), def=tr.cells[1].innerHTML;
    name.split(/\s*·\s*/).forEach(part=>{ const m=part.match(/^(.*?)\s*\(([^)]+)\)\s*$/); const base=(m?m[1]:part).trim();
      if(base && !skip.has(base)) TERMS.push({k:base, name, def});
      if(m && /^[A-Z]{2,}$/.test(m[2])) TERMS.push({k:m[2], name, def}); }); });
  TERMS.sort((a,b)=>b.k.length-a.k.length);
  TRE = new RegExp(TERMS.map(t=>{ const e=t.k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); return /^[A-Za-z]+$/.test(t.k) ? `(?<![A-Za-z])${e}(?![A-Za-z])` : e; }).join('|'));
}
const NOANN='button,summary,.term,svg,mjx-container,.mi,a,.vchip,.chip,th,.eq,code,kbd,input,label,textarea,.gpath,.iom,.calc,.tval,.planf,h1,h2,h3,h4,.sec-label,.ih,.oh';
function annotate(root){ if(!TRE || !root || root.dataset.ann) return; root.dataset.ann='1';
  const used=new Set(); const tw=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:n=>(n.parentElement && !n.parentElement.closest(NOANN) && TRE.test(n.nodeValue))?1:3});
  const nodes=[]; while(tw.nextNode()) nodes.push(tw.currentNode);
  nodes.forEach(n=>{ let txt=n.nodeValue, frag=null, last=0; const re=new RegExp(TRE.source,'g'); let m;
    while((m=re.exec(txt))){ const t=TERMS.find(x=>x.k===m[0]); if(!t || used.has(t.name)) continue; used.add(t.name);
      frag=frag||document.createDocumentFragment(); frag.append(txt.slice(last,m.index));
      const s=document.createElement('span'); s.className='term'; s.dataset.t=TERMS.indexOf(t); s.textContent=m[0]; frag.append(s); last=m.index+m[0].length; }
    if(frag){ frag.append(txt.slice(last)); n.replaceWith(frag); } }); }
function initTips(){
  const tip=document.createElement('div'); tip.id='tip'; tip.hidden=true; document.body.append(tip);
  document.addEventListener('mouseover',e=>{ const s=e.target.closest('.term'); if(!s) return; const t=TERMS[+s.dataset.t]; if(!t) return;
    tip.innerHTML=`<b>${t.name}</b><div>${t.def}</div><small>참고 › 용어집</small>`; subify(tip); tip.hidden=false;
    const r=s.getBoundingClientRect(), w=Math.min(360, window.innerWidth-24); tip.style.width=w+'px';
    let x=Math.min(Math.max(12, r.left), window.innerWidth-w-12), y=r.bottom+8; tip.style.left=x+'px'; tip.style.top=y+'px';
    const h=tip.offsetHeight; if(y+h>window.innerHeight-8){ tip.style.top=(r.top-h-8)+'px'; } });
  document.addEventListener('mouseout',e=>{ if(e.target.closest('.term')) tip.hidden=true; });
  document.addEventListener('toggle',e=>{ const d=e.target; if(d.tagName==='DETAILS' && d.open && (d.classList.contains('item')||d.classList.contains('q'))){ annotate(d.querySelector(':scope > .dbody, :scope > .qb')); } }, true);
}

/* ---------- 우리 팀 값 (공유 저장소, 없으면 이 브라우저) ---------- */
let VAL={};
try{ VAL=JSON.parse(localStorage.getItem('run2x.val.v1')||'{}')||{}; }catch(e){}
const stepDone = sid => { const its=ITEMS.filter(i=>i.s===sid && STATUS[i.id]!=='skip'); return its.length>0 && its.every(i=>STATUS[i.id]==='done'); };
const stepSkip = sid => { const its=ITEMS.filter(i=>i.s===sid); return its.length>0 && its.every(i=>STATUS[i.id]==='skip'); };
function onSharedReady(db){
  db.collection('val').onSnapshot(q=>{ const r={}; q.docs.forEach(d=>{ r[d.id]=d.data(); }); VAL=r; refreshVals(); }, ()=>{});
}
const valFilled = d => !!d && Object.values(d).some(o=>o && ((o.v||'').trim() || (o.why||'').trim()));
async function saveVal(id, vals, msgEl){
  const cur = VAL[id] || {s:{}}; const s={...(cur.s||{})}; const had=valFilled(s[SEASON]);
  if(!valFilled(vals)){ if(!had){ msgEl.textContent='입력한 값이 없습니다.'; return; } delete s[SEASON]; } else s[SEASON]=vals;
  const doc={s, by:SH.me||null, at:new Date().toISOString()};
  if(!SH.on){ VAL[id]=doc; try{ localStorage.setItem('run2x.val.v1', JSON.stringify(VAL)); }catch(e){} refreshVals(); msgEl.textContent= had && !valFilled(vals) ? `${SEASON} 시즌 값을 지웠습니다 (이 브라우저)` : '저장했습니다 (이 브라우저)'; return; }
  if(!SH.canAdmin){ msgEl.textContent='우리 팀 값은 편집자(관리자)만 저장할 수 있습니다.'; return; }
  try{ await SH.db.doc('val/'+id).set(doc); msgEl.textContent= had && !valFilled(vals) ? `${SEASON} 시즌 값을 지웠습니다` : '저장했습니다'; }catch(e){ msgEl.textContent='저장하지 못했습니다.'; }
}
function tvHTML(id){ const a=ACT[id]; if(!a || !a[2].length) return ''; return `<div class="tval" data-tv="${id}"></div>`; }
function renderTV(el){ const id=el.dataset.tv, labs=ACT[id][2], rec=VAL[id]; const man=UMODE==='manage'; const view = man ? SEASON : (el.dataset.view||SEASON);
  const data = rec&&rec.s&&valFilled(rec.s[view]) ? rec.s[view] : null;
  let h=`<div class="tv-h"><span class="sec-label">우리 팀 값</span>${man?`<span class="tv-s">${SEASON} 시즌 입력 중</span>`:`<span class="tv-yr"><button type="button" class="tv-yb" title="눌러서 연도 입력">${esc(view)} 시즌</button><input type="number" class="tv-yi" min="2000" max="2100" hidden aria-label="볼 시즌 연도"></span>${view!==SEASON?`<span class="muted tv-o">이번 시즌 ${SEASON}</span>`:''}`}</div>`;
  if(man){ const d=(rec&&rec.s&&rec.s[SEASON])||{};
    h+=`<div class="tv-edit">${labs.map(l=>`<label><span class="vchip dec">${l}</span><input type="text" data-tl="${esc(l)}" data-tk="v" placeholder="값 (단위 포함)" value="${esc((d[l]||{}).v||'')}"><input type="text" data-tl="${esc(l)}" data-tk="why" placeholder="근거 한 줄" value="${esc((d[l]||{}).why||'')}"></label>`).join('')}
      <div><button class="btn small" data-tvsave>${SEASON} 시즌 값 저장</button> <span class="pmsg muted"></span></div></div>`;
  } else if(data){ h+=`<table class="kvt tv-t">${labs.map(l=>{ const r=data[l]||{}; return `<tr><th>${l}</th><td>${r.v?`<b>${esc(r.v)}</b>`:'<span class="muted">—</span>'}${r.why?`<span class="tv-why">${esc(r.why)}</span>`:''}</td></tr>`; }).join('')}</table>`;
  } else h+=`<p class="muted tv-empty">아직 기록된 팀 값이 없습니다. 관리 모드에서 회장이 입력합니다.</p>`;
  el.innerHTML=h; }
document.addEventListener('click',e=>{ const yb=e.target.closest('.tv-yb'); if(!yb) return; const w=yb.parentElement, i=w.querySelector('.tv-yi'); yb.hidden=true; i.hidden=false; i.value=yb.textContent.replace(/\D/g,''); i.focus(); i.select(); });
{ const fin=(i,ok)=>{ if(i.hidden) return; const el=i.closest('.tval'); const v=i.value.trim(); i.hidden=true; i.previousElementSibling.hidden=false; if(ok && /^\d{4}$/.test(v)){ if(v===SEASON) delete el.dataset.view; else el.dataset.view=v; } renderTV(el); };
  document.addEventListener('keydown',e=>{ const i=e.target.closest&&e.target.closest('.tv-yi'); if(!i) return; if(e.key==='Enter'){ e.preventDefault(); fin(i,true); } else if(e.key==='Escape'){ fin(i,false); } });
  document.addEventListener('focusout',e=>{ const i=e.target.closest&&e.target.closest('.tv-yi'); if(i) setTimeout(()=>fin(i,true),0); }); }
document.addEventListener('toggle',e=>{ const d=e.target; if(d.tagName==='DETAILS' && d.classList.contains('item') && !d.open){ d.querySelectorAll('.tval[data-view]').forEach(el=>{ delete el.dataset.view; renderTV(el); }); } }, true);
function refreshValsExcept(keep){ document.querySelectorAll('.tval').forEach(el=>{ if(el.contains(keep)){ const id=el.dataset.tv; return; } renderTV(el); }); }
function refreshVals(){ document.querySelectorAll('.tval').forEach(el=>{ if(el.contains(document.activeElement)) return; renderTV(el); }); }

/* ---------- 보기 · 모드 · 학습 경로 · 목차 ---------- */
function setVM(v){ if(VMODE===v) return; VMODE=v; SETP('view',v); applyModes(); }
function applyModes(){
  document.body.classList.toggle('vm-flow', VMODE==='flow'); document.body.classList.toggle('um-manage', UMODE==='manage');
  document.querySelectorAll('[data-vm]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.vm===VMODE)));
  const viewer = (SH.on || (window.Backend && Backend.kind()==='firebase')) && !SH.canAdmin; if(viewer && UMODE==='manage'){ UMODE='study'; }
  const ab=$('#admbtn'); if(ab){ ab.hidden = !(window.__shReady && !viewer); ab.setAttribute('aria-checked', String(UMODE==='manage')); ab.disabled=viewer; ab.title = viewer ? '편집자(관리자)만 쓸 수 있습니다' : '진행 상태·우리 팀 값 입력'; }
  $('#step-list').hidden = VMODE==='flow'; $('#flow-list').hidden = VMODE!=='flow';
  document.querySelectorAll('.vtabs [data-vm]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.vm===VMODE)));
  refreshVals(); updateToc(); try{ admPlace(); renderAdm(); }catch(e){} }
function renderOnboard(){ const el=$('#onboard');
  if(PREF('onboard','1')==='0'){ el.innerHTML=`<button class="lnk" id="ob-show" style="font-size:13.5px">처음 왔다면: 읽는 순서 보기</button>`; return; }
  el.innerHTML=`<div class="onb"><div class="onb-h"><b>처음 왔다면 이 순서로 읽으십시오</b><button class="lnk" id="ob-hide" style="font-size:13px">접기</button></div><ol class="onb-steps">
    <li><span class="onb-n">1</span><div><b>왜 만드나</b><p>목표 탭에서 종합점수가 어떤 목표로 나뉘고, 각 목표를 어떤 설계 항목이 맡는지 봅니다.</p><button class="btn" data-ob="goals">목표 열기</button></div></li>
    <li><span class="onb-n">2</span><div><b>전체 흐름 한 바퀴</b><p>"흐름만" 보기로 단계 ${STEPS.length}개, 항목 ${ITEMS.length}개를 핵심 한 줄씩 읽습니다. 점선 밑줄 용어에 마우스를 올리면 뜻이 나옵니다.</p><button class="btn" data-ob="flow">흐름만 보기</button></div></li>
    <li><span class="onb-n">3</span><div><b>단계별로 깊게</b><p>"전체" 보기로 P0부터 펼쳐 결론 → 질문 → 유도 순으로 읽습니다. 단계 끝 확인 질문으로 스스로 점검합니다.</p><button class="btn" data-ob="full">P0부터 시작</button></div></li></ol></div>`; }
function renderToc(){ const t=$('#toc');
  t.innerHTML=`<div class="toc-h"><span>목차</span><button class="toc-fold" title="목차 접기/펼치기" aria-label="목차 접기/펼치기"></button></div><div class="toc-in">`+
  PHASES.map(ph=>`<div class="toc-p"><div class="toc-ph">${ph.k} ${ph.n.replace(/\s*\(P\d\)\s*/,' ').replace(/→.*/,'').trim()}</div>${ph.s.map(sid=>{ const s=STEPS[SIDX[sid]];
    return `<button class="toc-s${s.fz?' fz':''}" data-toc="${sid}"><span class="tc">${s.fz?'★':''}${sid}</span><span class="tt">${s.t.replace('★ ','')}</span><span class="tm"></span></button>`; }).join('')}</div>`).join('')+`</div><div class="toc-rs" title="끌어서 너비 조절"></div>`;
  t.classList.toggle('coll', PREF('tocc','0')==='1'); setTocW(+PREF('tocw','178')); }
function setTocW(w){ w=Math.max(150,Math.min(360,w||178)); document.documentElement.style.setProperty('--tocw', w+'px'); return w; }
function tocFx(){ const t=$('#toc'); document.documentElement.style.setProperty('--tocx', (t.classList.contains('coll')?34:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tocw'))||178)+'px'); }
function updateToc(){
  document.querySelectorAll('#toc .toc-s').forEach(b=>{ const done=stepDone(b.dataset.toc), sk=stepSkip(b.dataset.toc); const m=b.querySelector('.tm'); m.className='tm'+(done?' done':''); m.textContent=done?'✓':''; b.classList.toggle('st-allskip',sk); b.title=sk?'이번 시즌 제외':''; }); }
let TOCRAF=0;
function spyToc(){ if(TOCRAF) return; TOCRAF=requestAnimationFrame(()=>{ TOCRAF=0; if(TAB!=='steps') return;
  const tabh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabh'))||50; let cur=null;
  const els = VMODE==='flow' ? document.querySelectorAll('#flow-list .flow-step[data-fs]') : document.querySelectorAll('#step-list details.step[data-step]');
  els.forEach(el=>{ if(el.getBoundingClientRect().top < tabh+140) cur = el.dataset.fs || el.dataset.step; });
  document.querySelectorAll('#toc .toc-s').forEach(b=>b.classList.toggle('cur', b.dataset.toc===cur));
  const cb=document.querySelector('#toc .toc-s.cur'); if(cb){ const t=$('#toc'), r=cb.getBoundingClientRect(), tr=t.getBoundingClientRect(); if(r.top<tr.top+40||r.bottom>tr.bottom-10) t.scrollTop += r.top-tr.top-tr.height/2; } }); }
function gotoStep(sid){
  /* 목차 이동: 펼치지 않고(이미 펼친 카드는 그대로) 카드 제목줄을 화면 가운데로 */
  const cs=getComputedStyle(document.documentElement), tabh=parseFloat(cs.getPropertyValue('--tabh'))||50;
  const midOff=(el,hd)=>Math.max(tabh+8, (window.innerHeight + tabh - (hd?hd.offsetHeight:0))/2);
  if(VMODE==='flow'){ if(TAB!=='steps') showTab('steps', true); const fs=document.querySelector(`#flow-list .flow-step[data-fs="${sid}"]`); if(!fs) return; const hd=fs.firstElementChild;
    requestAnimationFrame(()=>smoothScrollTo(()=>fs.getBoundingClientRect().top+window.scrollY-midOff(fs,hd), ()=>markHere(fs))); return; }
  pushHist(); setVM('full'); showTab('steps', true); const st=$('#st-'+sid); if(!st) return; const hd=st.querySelector(':scope>summary');
  requestAnimationFrame(()=>smoothScrollTo(()=>st.getBoundingClientRect().top+window.scrollY-midOff(st,hd), ()=>markHere(st))); }

/* ---------- 이벤트 ---------- */
document.addEventListener('click',e=>{
  const vm=e.target.closest('[data-vm]'); if(vm){ setVM(vm.dataset.vm); return; }
  const ab=e.target.closest('#admbtn'); if(ab){ if(ab.disabled) return; UMODE = UMODE==='manage'?'study':'manage'; SETP('mode',UMODE); applyModes(); return; }
  const um=e.target.closest('[data-um]'); if(um){ if(um.disabled) return; UMODE=um.dataset.um; SETP('mode',UMODE); applyModes(); return; }
  const ob=e.target.closest('[data-ob]'); if(ob){ const k=ob.dataset.ob;
    if(k==='goals'){ showTab('goals'); } else if(k==='flow'){ setVM('flow'); smoothScrollTo(()=>document.querySelector('.vtabs').getBoundingClientRect().top+window.scrollY-70); } else { setVM('full'); openStep('P0'); } return; }
  if(e.target.closest('#ob-hide')){ SETP('onboard','0'); renderOnboard(); return; }
  if(e.target.closest('#ob-show')){ SETP('onboard','1'); renderOnboard(); return; }
  const tc=e.target.closest('[data-toc]'); if(tc){ gotoStep(tc.dataset.toc); return; }
  const gg=e.target.closest('[data-goal]'); if(gg){ const [mi,di]=gg.dataset.goal.split('.').map(Number); openGoal(mi,di); return; }
  const qg=e.target.closest('[data-qgo]'); if(qg){ const [id,k]=qg.dataset.qgo.split('|'); openQ(id,+k); return; }
  const cr=e.target.closest('[data-creset]'); if(cr){ const box=cr.closest('details.calc'); const c=CALC[box.dataset.calc]; c.ins.forEach(([k,,,,d])=>{ box.querySelector(`[data-ck="${k}"]`).value=d; }); runCalc(box); return; }
  const tv=e.target.closest('[data-tvsave]'); if(tv){ const box=tv.closest('.tval'); const vals={};
    box.querySelectorAll('[data-tl]').forEach(i=>{ const l=i.dataset.tl; vals[l]=vals[l]||{}; vals[l][i.dataset.tk]=i.value.trim(); });
    saveVal(box.dataset.tv, vals, box.querySelector('.pmsg')); return; }
});
document.addEventListener('input',e=>{ const c=e.target.closest('details.calc'); if(c && e.target.matches('[data-ck]')) runCalc(c);
  if(e.target.classList.contains('season-in')){ const v=e.target.value.trim(); if(/^\d{4}$/.test(v)){ SEASON=v; SETP('season',v); document.querySelectorAll('.season-in').forEach(x=>{ if(x!==e.target) x.value=v; }); refreshValsExcept(e.target); } } });
window.addEventListener('scroll', spyToc, {passive:true});
function afterStatus(){ updateToc(); try{ renderAdm(); }catch(e){} }
