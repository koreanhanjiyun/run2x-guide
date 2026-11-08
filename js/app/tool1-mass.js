/* ============================================================
   도구 1 — 질량 · 무게중심 (docs/TOOLS-PLAN.md 5절 '1번 질량·무게중심 도구 사양', docs/STORE-PLAN.md 2절)
   - 부품 질량 표: 어셈블리 하나 = 문서 하나 teams/<팀>/mass/<id>
       {s:{시즌:{name, x, y, z, cat, hue, pos, items:[{name, m, n, half}], ord}}}  (half = 걸침, 질량 절반은 반대쪽)
     좌표 · 범주는 어셈블리에만, 항목은 이름 · 한 개 질량 · 개수(어셈블리 질량 = Σ 질량 × 개수, 개수 0 = 뺌)
     범주 cat: s 현가상 · uf 현가하 앞 · ur 현가하 뒤 (드라이버는 drivers 에서 골라 현가상으로 합산)
     hue: 카드 머리 색(연한 색, 색상만 고름)
   - 드라이버: teams/<팀>/drivers/<d1|d2|d3> = {s:{시즌:{label, sex, height(cm), mass, gear:{helmet, suit, belt}, helm(헬멧 바깥 지름 mm, 그림용), seg, hip, back, pedal, sw}}}
   - 좌표: 사이트 차량 좌표계(ISO 8855 방향) — x = 뒤 차축 중심에서 앞으로 +, y = 차 중심선에서 왼쪽 +, z = 지면에서 위로 + [mm]. 원점 = 뒤 차축 중심 · 차량 중심면 · 지면
     (드라이버 그림 · 차 윤곽은 안에서 '앞 차축에서 뒤로' 좌표로 그리므로 그릴 때만 x_그림 = L − x 로 바꿈)
   - 질량 표 · 드라이버는 팀원 누구나 고침(계산기는 자유). 대시보드 반영만 담당(프레임) · 회장
   - 저장소가 없으면(로그인 전) 이 브라우저에 저장
   ============================================================ */
const MASSKEY = 'run2x.mass.v2', DRVKEY = 'run2x.drv.v2', M1COLKEY = 'run2x.m1.hues';
let MASS = {}, DRVS = {};
try{ MASS = JSON.parse(localStorage.getItem(MASSKEY) || '{}') || {}; }catch(e){ MASS = {}; }
try{ DRVS = JSON.parse(localStorage.getItem(DRVKEY) || '{}') || {}; }catch(e){ DRVS = {}; }
const M1 = { tourUndo:false, tab:'mass', drv:'d1', dsel:'d1', timer:{}, drag:null, edit:null, pick:null, mv:null };
try{ const v = localStorage.getItem('run2x.wb.1.drv'); if(['d1','d2','d3'].includes(v)) M1.dsel = v; }catch(e){}
const M1CAT = [['s','현가상'], ['uf','현가하 앞'], ['ur','현가하 뒤']];
const M1DRV = {d1:'1st', d2:'2nd', d3:'3rd'};
const M1HC = {d1:'#6A4294', d2:'#1d5f9a', d3:'#c2410c'};   /* 헬멧 색: 1st 보라 · 2nd 파랑 · 3rd 주황 */
/* 드라이버 기본값: 예시 차량(그림 윤곽, 휠베이스 1550) 시트 · 페달 · 핸들 자리(뒤 차축 기준 x)에 남성 175 cm · 70 kg, 장비 0 */
const M1DDEF = () => ({label:'', sex:'m', height:175, mass:70, gear:{helmet:0, suit:0, belt:0}, back:32, neck:0, foot:20, helm:M1HD, hip:{x:960, z:230}, pedal:{x:1770, z:250}, sw:{x:1175, z:500}, seg:{}});
const M1SEG = {head:'머리', neck:'목', trunk:'몸통', uarm:'상완', farm:'하완', hand:'손', thigh:'허벅지', shank:'정강이', foot:'발'};
const m1HueBg = h => h==null ? '' : `hsl(${h} 62% 93%)`, m1HueLn = h => `hsl(${h} 45% 62%)`;

const m1Season = () => typeof dvSeason==='function' ? dvSeason() : String(new Date().getFullYear());
/* 고치기: 로그인 전은 자유, 팀에서는 팀원 누구나(지난 시즌은 회장만) */
const m1CanEdit = () => !SH.on || SH.canAdmin || !pastLock();
const m1Groups = () => Object.entries(MASS).map(([id, d]) => { const v = d && d.s && d.s[m1Season()]; return v ? {id, ...v} : null; })
  .filter(Boolean).sort((a, b) => (a.ord||0) - (b.ord||0));
const m1N = it => it.n==null || !isFinite(it.n) ? 1 : +it.n;
const m1GSum = g => (g.items || []).reduce((a, it) => a + (isFinite(it.m) && it.m!==null ? +it.m*m1N(it) : 0), 0);
const m1Drv = id => { const d = DRVS[id], v = d && d.s && d.s[m1Season()]; if(!v) return null; const D = M1DDEF();
  return {...D, ...v, gear:{...D.gear, ...(v.gear||{})}, hip:{...D.hip, ...(v.hip||{})}, pedal:{...D.pedal, ...(v.pedal||{})}, sw:{...D.sw, ...(v.sw||{})}, seg:{...(v.seg||{})}}; };
const m1NewId = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* 저장: 고친 뒤 0.6 s 모아서 한 번. 이번 시즌 칸만 바꿈(지난 시즌 기록은 그대로). val = null 이면 이번 시즌 칸을 지움 */
function m1Store(kind, id, val){ const se = m1Season(), STORE = kind==='mass' ? MASS : DRVS, cur = STORE[id] || {s:{}}, s2 = {...(cur.s||{})};
  if(val==null) delete s2[se]; else s2[se] = val; STORE[id] = {s:s2};
  wbRefresh(); m1PartDirty();
  if(!SH.on){ try{ localStorage.setItem(kind==='mass' ? MASSKEY : DRVKEY, JSON.stringify(STORE)); }catch(e){} return; }
  clearTimeout(M1.timer[kind + id]);
  M1.timer[kind + id] = setTimeout(() => { SH.db.doc((kind==='mass' ? 'mass/' : 'drivers/') + id).set(STORE[id])
    .catch(e => toast(Backend.denied && Backend.denied(e) ? '이 값을 고칠 권한이 없습니다.' : '저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.')); }, 600); }
{ const _osr = onSharedReady; onSharedReady = function(db){ _osr(db);
    db.collection('mass').onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); MASS = r; m1Live(); }, () => {});
    db.collection('drivers').onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); DRVS = r; m1Live(); }, () => {}); }; }
/* 다른 사람이 고친 값이 들어오면: 입력 중인 칸이 없을 때만 다시 그림 */
function m1Live(){ m1PartDirty(); if(WB.id!=='1') return; const a = document.activeElement;
  if(!M1.drag && !M1.pick && !M1.mv && !(a && a.closest && a.closest('#wbext') && a.matches('input, select'))) wbPaint(['ext']); wbRefresh(); }

/* ---------- 표 입력 ---------- */
const m1Num = (v, attrs) => `<input type="number" step="any" ${attrs} value="${v==null || !isFinite(v) ? '' : v}">`;
function m1ExtHTML(){ return `<section class="wb-sec m1" aria-label="표 입력"><div class="wb-h"><h3>표 입력</h3>
      <div class="m1-tabs" role="tablist">${[['mass','부품 질량 표'], ['drv','드라이버 모델']].map(([k, t]) => `<button type="button" role="tab" data-m1tab="${k}" aria-selected="${M1.tab===k}">${t}</button>`).join('')}</div>
      <span class="wb-meta">${m1Season()} 시즌 · 좌표 [mm] x = 뒤 차축에서 앞으로 · y = 중심선에서 왼쪽 · z = 지면에서 위</span></div>
    <div id="m1body">${M1.tab==='mass' ? m1MassHTML() : m1DrvHTML()}</div></section>`; }
/* 카드 배치: 4열, 줄마다 왼쪽부터 빈칸 없이 채움. 드라이버 카드는 첫 줄 첫 칸 고정(첫 줄은 3장까지).
   저장값 pos {c, r}: 줄 r 과 줄 안 순서 c. 자리가 없는 카드는 마지막 줄 뒤에 이어 붙임 */
const M1NC = 4, m1Cap = i => i===0 ? M1NC - 1 : M1NC;
function m1Rows(gs){ const by = {}, rest = [];
  gs.forEach(g => { const p = g.pos; if(p && isFinite(p.c) && isFinite(p.r) && p.r >= 0) (by[p.r] = by[p.r] || []).push(g); else rest.push(g); });
  const rows = [[]]; Object.keys(by).map(Number).sort((x, y) => x - y).forEach(r => { const L = by[r].sort((a, b) => a.pos.c - b.pos.c || (a.ord||0) - (b.ord||0)).map(g => g.id);
    if(r===0) rows[0] = L; else rows.push(L); });
  rest.forEach(g => rows[rows.length - 1].push(g.id));
  /* 한 줄에 넘치면 넘친 카드는 바로 아래 새 줄로 */
  for(let i = 0; i < rows.length; i++) if(rows[i].length > m1Cap(i)) rows.splice(i + 1, 0, rows[i].splice(m1Cap(i)));
  return rows.filter((R, i) => i===0 || R.length); }
function m1At(rows){ const at = {}; rows.forEach((R, r) => R.forEach((id, i) => { at[id] = {c:i + (r===0 ? 1 : 0), r}; })); return at; }
function m1Layout(gs){ const rows = m1Rows(gs); return {rows, at:m1At(rows), nr:rows.length}; }
const M1IC = { grip:'<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor"><circle cx="5.5" cy="4" r="1.3"/><circle cx="10.5" cy="4" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="12" r="1.3"/><circle cx="10.5" cy="12" r="1.3"/></g></svg>',
  copy:'<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5.5" y="5.5" width="8" height="8" rx="1.6"/><path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.2"/></g></svg>',
  del:'<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h11M6.5 4V2.6h3V4M4 4l.7 9.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8L12 4M6.7 6.5v5M9.3 6.5v5"/></g></svg>' };
function m1MassHTML(){ const gs = m1Groups(), ed = m1CanEdit(), D = WB.R && WB.R.drvItem, LY = m1Layout(gs);
  const xyz = g => ['x','y','z'].map(f => `<label class="m1-xyz"><span>${f}</span>${ed ? m1Num(g[f], `data-m1gf="${f}" aria-label="${f} [mm]"`) : `<b>${wbFmt(g[f], 0)}</b>`}</label>`).join('');
  const at = p => `grid-column:${p.c + 1};grid-row:${p.r + 1}`;
  /* 드라이버 카드: 다른 어셈블리와 같은 모양. 항목(몸무게 · 장비)은 드라이버 모델 값과 같은 값 (어느 쪽에서 고쳐도 같음), 좌표는 모델이 계산한 CG */
  const dd = m1Drv(M1.dsel) || M1DDEF(), dhue = {d1:270, d2:210, d3:22}[M1.dsel];
  const drow = (p, n) => { const v = m1Get(dd, p); return `<div class="m1-ir">${ed ? `<span class="m1-in">${n}</span>${m1Num(v > 0 ? v : null, `data-m1dc="${p}" min="0" placeholder="0" aria-label="${n} [kg]"`)}<i>kg ×</i><span class="m1-n1">1</span><span></span><span></span>`
    : `<span>${n}</span><b>${wbFmt(v || 0, 1)}</b><i>kg × 1</i><span></span><span></span>`}</div>`; };
  const drv = `<div class="m1-card m1-drvc" data-m1rc="0,0" style="${at({c:0, r:0})};--m1bg:${m1HueBg(dhue)};--m1ln:${m1HueLn(dhue)}"><div class="m1-ch"><i class="m1-hdot" style="background:${M1HC[M1.dsel]}"></i><b class="m1-gt">드라이버</b><select data-m1dsel aria-label="계산에 넣을 드라이버">${Object.entries(M1DRV).map(([k, t]) => { const d = m1Drv(k); return `<option value="${k}"${M1.dsel===k?' selected':''}>${t}${d && d.label ? ' · ' + wbEsc(d.label) : ''}${d ? '' : ' (기본값)'}</option>`; }).join('')}</select><span class="m1-sum">${D ? wbFmt(D.m, 2) + ' kg' : ''}</span></div>
    <div class="m1-cm"><span class="m1-cat">현가상</span>${D ? ['x','y','z'].map((f, i) => `<label class="m1-xyz"><span>${f}</span><b>${Math.round([D.x, D.y, D.z][i])}</b></label>`).join('') : ''}<i class="m1-u">mm</i></div>
    <div class="m1-ci">${drow('mass', `몸무게${dd.label ? ' (' + wbEsc(dd.label) + ')' : ''}`)}${drow('gear.helmet', '헬멧')}${drow('gear.suit', '드라이버 복')}${drow('gear.belt', '안전벨트')}
      <button type="button" class="lnk m1-sm" data-m1tab="drv">좌표: 드라이버 모델 체절 합 · 자세는 드라이버 모델에서 →</button></div></div>`;
  const slots = []; for(let r = 0; r <= LY.nr; r++){ const n = r < LY.nr ? LY.rows[r].length + (r===0 ? 1 : 0) : 0; for(let c = n; c < M1NC; c++) slots.push(`<div class="m1-slot" data-m1slot="${c},${r}" data-m1rc="${c},${r}" style="${at({c, r})}"></div>`); }
  return `<div class="m1-list" id="m1list" style="--m1nc:${M1NC}">${drv}${gs.map(g => { const bg = m1HueBg(g.hue), HT = m1HalfTip(g, gs);
    return `<div class="m1-card" data-m1g="${g.id}" data-m1rc="${LY.at[g.id].c},${LY.at[g.id].r}" style="${at(LY.at[g.id])}${g.hue!=null ? `;--m1bg:${bg};--m1ln:${m1HueLn(g.hue)}` : ''}"><div class="m1-ch">
        ${ed ? `<span class="m1-grip" data-m1grip title="끌어서 자리 옮기기" aria-hidden="true">${M1IC.grip}</span><button type="button" class="m1-sw" data-m1color aria-label="카드 색 고르기" title="카드 색"></button>` : ''}
        ${ed ? `<input type="text" class="m1-gt" data-m1gf="name" value="${wbEsc(g.name||'')}" placeholder="어셈블리 이름" aria-label="어셈블리 이름">` : `<b class="m1-gt">${wbEsc(g.name||'')}</b>`}
        <span class="m1-sum">${wbFmt(m1GSum(g), 2)} kg</span>
        ${ed ? `<span class="m1-acts"><button type="button" class="m1-ib" data-m1gcopy aria-label="좌우 바꿔 복사" title="복사본 만들기 (y 부호 · 이름의 왼/오른을 바꿈)">${M1IC.copy}</button><button type="button" class="m1-ib del" data-m1gdel aria-label="어셈블리 지우기" title="어셈블리 지우기">${M1IC.del}</button></span>` : ''}</div>
      <div class="m1-cm">${ed ? `<select data-m1gf="cat" class="m1-cat" aria-label="범주">${M1CAT.map(([k, t]) => `<option value="${k}"${(g.cat||'s')===k?' selected':''}>${t}</option>`).join('')}</select>` : `<span class="m1-cat">${(M1CAT.find(c => c[0]===(g.cat||'s'))||[])[1]}</span>`}${xyz(g)}<i class="m1-u">mm</i></div>
      <div class="m1-cm m1-dim" title="어셈블리를 이 크기의 직육면체(질량 고르게)로 보고 자체 관성을 더함. 비우면 점질량"><span class="m1-cat ro">크기</span>${[['lx', '길이 x'], ['ly', '폭 y'], ['lz', '높이 z']].map(([f, n]) => `<label class="m1-xyz"><span>${n.split(' ')[1]}</span>${ed ? m1Num(g[f], `data-m1gf="${f}" aria-label="${n} [mm] (자체 관성용, 선택)" placeholder="—"`) : `<b>${g[f]!=null ? wbFmt(g[f], 0) : '—'}</b>`}</label>`).join('')}<i class="m1-u">mm</i></div>
      <div class="m1-ci">${(g.items||[]).map((it, i) => `<div class="m1-ir${m1N(it)===0 ? ' off' : ''}">${ed ? `<input type="text" data-m1if="name" data-m1ii="${i}" value="${wbEsc(it.name||'')}" placeholder="항목" aria-label="항목 이름">${m1Num(it.m, `data-m1if="m" data-m1ii="${i}" aria-label="한 개 질량 [kg]"`)}<i>kg ×</i>${m1Num(it.n==null ? 1 : it.n, `data-m1if="n" data-m1ii="${i}" min="0" step="1" aria-label="개수"`)}<label class="m1-half" title="${wbEsc(HT)}"><input type="checkbox" data-m1if="half" data-m1ii="${i}"${it.half ? ' checked' : ''} aria-label="걸침 (절반은 반대쪽)">½</label><button type="button" class="m1-ix" data-m1idel="${i}" aria-label="항목 지우기" title="항목 지우기">×</button>`
          : `<span>${wbEsc(it.name||'')}</span><b>${wbFmt(it.m, 2)}</b><i>kg × ${m1N(it)}</i><span class="m1-half ro" title="${wbEsc(HT)}">${it.half ? '½' : ''}</span><span></span>`}</div>`).join('')}${ed ? `<button type="button" class="m1-add" data-m1iadd>+ 항목</button>` : ''}</div></div>`; }).join('')}${ed ? slots.join('') : ''}</div>
    ${ed ? `<button type="button" class="m1-gadd" data-m1gadd>+ 어셈블리</button>` : ''}
    <p class="m1-note">${ed ? '' : '지난 시즌 기록은 회장만 고칠 수 있습니다. '}카드 왼쪽 위 점 손잡이를 끌어 옮깁니다. 카드는 줄마다 왼쪽부터 채워집니다. 다른 카드 위에 놓으면 그 앞에 끼워 넣고(줄이 넘치면 마지막 카드가 바로 아래 새 줄로), 줄 끝 빈칸에 놓으면 그 줄 끝에 붙고, 줄 사이에 놓으면 새 줄이 생깁니다. 드라이버 카드의 몸무게 · 장비는 드라이버 모델과 같은 값입니다. 좌표는 어셈블리 하나의 무게중심 위치입니다. 어셈블리 질량 = 항목 질량 × 개수의 합이고, 개수를 0으로 하면 그 항목은 빠집니다. ½을 체크한 항목(드라이브샤프트 · 링크 · 스프링 · 댐퍼처럼 차체와 업라이트를 잇는 부품)은 질량 절반을 반대쪽(현가상 ↔ 현가하)으로 셉니다. 좌우 대칭 어셈블리는 복사로 만들면 y 부호와 이름의 왼/오른이 바뀝니다.</p>`; }
/* 걸침(½): 체크한 항목은 질량 절반을 반대쪽으로. 현가하 카드 → 현가상. 현가상 카드 → 가장 가까운(3차원 거리) 현가하 카드의 앞 · 뒤
   (현가하 카드가 없으면 계산에서 휠베이스 절반 기준) */
function m1HalfTo(g, gs){ if((g.cat||'s')!=='s') return {cat:'s'};
  let best = null, bd = Infinity; gs.forEach(u => { if(u.cat!=='uf' && u.cat!=='ur') return; const d = Math.hypot((+u.x||0) - (+g.x||0), (+u.y||0) - (+g.y||0), (+u.z||0) - (+g.z||0)); if(d < bd){ bd = d; best = u; } });
  return best ? {cat:best.cat, near:best.name||''} : {cat:null}; }
function m1HalfTip(g, gs){ const h = m1HalfTo(g, gs);
  return '걸침: 체크하면 이 항목 질량의 절반은 ' + (h.cat==='s' ? '현가상' : h.cat ? `${h.cat==='uf' ? '앞' : '뒤'} 현가하 (가장 가까운 현가하 카드: ${h.near || '이름 없음'})` : '현가하 (현가하 카드가 없어 휠베이스 절반 기준으로 앞 · 뒤)') + '으로 셉니다. 드라이브샤프트 · 링크 · 스프링 · 댐퍼처럼 차체와 업라이트를 잇는 부품'; }
/* 카드 끌어 옮기기 (휴대폰 홈 화면처럼)
   - 빈칸에 놓음: 그 자리로
   - 다른 카드 위에 놓음: 그 자리에 끼워 넣고, 원래 있던 카드부터 읽는 순서(왼→오른, 줄 끝 → 다음 줄 첫 칸)로 한 칸씩 밀림. 첫 빈칸(끌어서 비운 원래 자리 포함)에서 멈춤
   - 줄과 줄 사이에 놓음: 새 줄이 생기고 아래 줄 전체가 한 줄씩 내려감
   - 드라이버 카드(0,0)는 고정 */
document.addEventListener('pointerdown', e => { const g = e.target.closest && e.target.closest('[data-m1grip]'); if(!g || e.button!==0) return; e.preventDefault();
  const card = g.closest('[data-m1g]'), list = $('#m1list'); M1.mv = {id:card.dataset.m1g, over:null, x:e.clientX, y:e.clientY}; list.classList.add('moving'); card.classList.add('lift'); requestAnimationFrame(m1AutoScroll); });
/* 끄는 동안 화면 위 · 아래 끝에 가면 작업창 오른쪽을 저절로 굴림 */
function m1AutoScroll(){ const M = M1.mv; if(!M) return; const sc = document.querySelector('#wb .wb-right'); if(sc && M.y!=null){ const rc = sc.getBoundingClientRect(), k = 70;
    const v = M.y > rc.bottom - k ? (M.y - (rc.bottom - k))/3 : M.y < rc.top + k ? -((rc.top + k) - M.y)/3 : 0; if(v){ sc.scrollTop += Math.max(-24, Math.min(24, v)); m1Over(M.x, M.y); } }
  requestAnimationFrame(m1AutoScroll); }
/* 놓을 곳 T 에 따른 새 줄 배치 { rows, push: 밀리는 카드 id }
   - 빈칸: 그 줄 맨 끝에 붙음(마지막 빈 줄이면 새 줄)
   - 카드 위: 그 카드 앞에 끼움. 그 줄 안에서만 밀리고, 줄이 넘치면 마지막 카드가 바로 아래 새 줄로 (아래 줄들은 한 줄씩 내려감)
   - 줄 사이: 그 카드 하나만 있는 새 줄 */
function m1Plan(LY, id, T){ let rows = LY.rows.map(R => R.slice()); const push = [];
  const tid = T.kind==='card' ? T.id : null, tr = T.kind==='row' ? T.b : T.r;
  const ref = tr < rows.length ? rows[tr] : null;   /* 줄은 배열 자체로 따라감 (빼낸 뒤 번호가 바뀌어도) */
  rows.forEach(R => { const i = R.indexOf(id); if(i >= 0) R.splice(i, 1); });
  if(T.kind==='row'){ const k = rows.indexOf(ref); rows.splice(k < 0 ? rows.length : k, 0, [id]); rows.slice(k + 1).forEach(R => R.forEach(x => push.push(x))); }
  else if(T.kind==='slot'){ if(ref) ref.push(id); else rows.push([id]); }
  else { const k = rows.indexOf(ref), R = rows[k], i = R.indexOf(tid); R.splice(i < 0 ? R.length : i, 0, id); R.slice(R.indexOf(id) + 1).forEach(x => push.push(x));
    if(R.length > m1Cap(k)){ const over = R.splice(m1Cap(k)); rows.splice(k + 1, 0, over); } }
  rows = rows.filter((R, i) => i===0 || R.length);
  return {rows, push}; }
function m1Over(x, y){ const M = M1.mv; if(!M) return; const list = $('#m1list'); if(!list) return;
  const LY = m1Layout(m1Groups()), rl = list.getBoundingClientRect(), els = [...list.querySelectorAll('[data-m1rc]')];
  let T = null;
  /* 줄 사이: 위 줄 아래 끝과 아래 줄 위 끝의 가운데 ±12 px */
  const top = {}, bot = {}; els.forEach(el => { const r = +el.dataset.m1rc.split(',')[1], b = el.getBoundingClientRect(); if(el.classList.contains('m1-slot') && !list.querySelector(`[data-m1g][data-m1rc$=",${r}"]`)) return;
    top[r] = Math.min(top[r] ?? 1e9, b.top); bot[r] = Math.max(bot[r] ?? -1e9, b.bottom); });
  const cw = (rl.width + 10)/M1NC, col = Math.max(0, Math.min(M1NC - 1, Math.floor((x - rl.left)/cw)));
  for(let r = 1; r < LY.nr; r++){ if(top[r]==null || bot[r - 1]==null) continue; const yb = (bot[r - 1] + top[r])/2; if(Math.abs(y - yb) <= 12){ T = {kind:'row', b:r, c:col, y:yb - rl.top}; break; } }
  if(!T){ const el = document.elementFromPoint(x, y), t = el && el.closest && (el.closest('#m1list [data-m1slot]') || el.closest('#m1list [data-m1g]'));
    if(t && t.dataset.m1slot){ const [c, r] = t.dataset.m1slot.split(',').map(Number); T = {kind:'slot', c, r, el:t}; }
    else if(t && t.dataset.m1g && t.dataset.m1g!==M.id){ const p = LY.at[t.dataset.m1g]; if(p) T = {kind:'card', id:t.dataset.m1g, c:p.c, r:p.r, el:t}; } }
  const key = T ? [T.kind, T.c, T.r, T.b].join() : ''; if(key===M.key) return; M.key = key; M.over = T;
  list.querySelectorAll('.over,.ins,.push').forEach(e => e.classList.remove('over', 'ins', 'push')); let ln = list.querySelector('.m1-rowline');
  if(T && T.kind==='row'){ if(!ln){ ln = document.createElement('div'); ln.className = 'm1-rowline'; list.appendChild(ln); } ln.style.top = T.y.toFixed(1) + 'px'; } else if(ln) ln.remove();
  if(!T) return; if(T.kind==='slot') T.el.classList.add('over'); if(T.kind==='card') T.el.classList.add('ins');
  m1Plan(LY, M.id, T).push.forEach(k => { const c = list.querySelector(`[data-m1g="${k}"]`); if(c) c.classList.add('push'); }); }
document.addEventListener('pointermove', e => { const M = M1.mv; if(!M) return; M.x = e.clientX; M.y = e.clientY; m1Over(e.clientX, e.clientY); });
document.addEventListener('pointerup', () => { const M = M1.mv; if(!M) return; M1.mv = null; const list = $('#m1list'); if(list) list.classList.remove('moving');
  const gs = m1Groups(), LY = m1Layout(gs), T = M.over; if(!T){ wbPaint(['ext']); return; }
  const pos = m1At(m1Plan(LY, M.id, T).rows);
  gs.forEach(g => { const p = pos[g.id], q = g.pos; if(p && !(q && q.c===p.c && q.r===p.r)) m1SaveG(g.id, gg => { gg.pos = {c:p.c, r:p.r}; }); });
  wbPaint(['ext']); });
/* 카드 색 고르기: 연한 색에서 색상만 연속으로 고름 + 최근 쓴 색 */
const m1Recent = () => { try{ return (JSON.parse(localStorage.getItem(M1COLKEY) || '[]') || []).filter(h => isFinite(h)).slice(0, 8); }catch(e){ return []; } };
function m1PickOpen(btn){ const card = btn.closest('[data-m1g]'), g = m1Groups().find(x => x.id===card.dataset.m1g); if(!g) return; m1PickClose();
  const h0 = g.hue!=null ? g.hue : 210, pop = document.createElement('div'); pop.className = 'm1-pick'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '카드 색');
  pop.innerHTML = `<input type="range" min="0" max="359" step="1" value="${h0}" data-m1hue aria-label="색상"><div class="m1-pk">${m1Recent().map(h => `<button type="button" data-m1h="${h}" style="background:${m1HueBg(h)};border-color:${m1HueLn(h)}" aria-label="최근 색"></button>`).join('')}<button type="button" data-m1h="none" class="none">색 없음</button></div>`;
  card.appendChild(pop); M1.pick = {id:g.id, pop, h:g.hue}; pop.querySelector('input').focus(); }
function m1PickClose(save){ const P = M1.pick; if(!P) return; M1.pick = null; P.pop.remove();
  if(save && P.h!=null){ const r = [P.h].concat(m1Recent().filter(h => Math.abs(h - P.h) > 3)).slice(0, 8); try{ localStorage.setItem(M1COLKEY, JSON.stringify(r)); }catch(e){} } }
function m1SetHue(id, h){ const card = document.querySelector(`[data-m1g="${id}"]`); if(card){ if(h==null){ card.style.removeProperty('--m1bg'); card.style.removeProperty('--m1ln'); } else { card.style.setProperty('--m1bg', m1HueBg(h)); card.style.setProperty('--m1ln', m1HueLn(h)); } }
  m1SaveG(id, g => { if(h==null) delete g.hue; else g.hue = h; }); }

/* ---------- 드라이버 모델: 그림(왼쪽, 숫자 누르면 고침) + 오른쪽 칸(성별 · 장비 · 다른 드라이버와 같게 · 체절 질량) ---------- */
function m1DrvHTML(){ const ed = m1CanEdit(), d = m1Drv(M1.drv) || M1DDEF(), others = Object.keys(M1DRV).filter(k => k!==M1.drv);
  const D = WB.R && WB.R.drv && WB.R.drv[M1.drv];
  const gin = (p, lab) => `<label class="m1-gi"><span>${lab}</span>${ed ? m1Num(m1Get(d, p) || null, `data-m1d="${p}" min="0" placeholder="0" aria-label="${lab} [kg]"`) : `<b>${wbFmt(m1Get(d, p) || 0, 1)}</b>`}<i>kg</i></label>`;
  return `<div class="m1-top"><div class="m1-ptabs">${Object.entries(M1DRV).map(([k, t]) => { const dd = m1Drv(k); return `<button type="button" data-m1drv="${k}" aria-pressed="${M1.drv===k}"><i class="m1-hdot" style="background:${M1HC[k]}"></i>${t}${dd && dd.label ? ' · ' + wbEsc(dd.label) : ''}${dd ? '' : '<span>기본값</span>'}</button>`; }).join('')}</div>
      <span class="m1-hint">${ed ? '그림 위 숫자를 누르면 고칩니다 · 흰 점(엉덩이점 · 발목 · 핸들)은 끌어서 옮깁니다' : '지난 시즌 기록은 회장만 고칠 수 있습니다'}</span>
      ${ed && m1Drv(M1.drv) ? `<button type="button" class="lnk m1-reset" data-m1dreset title="엉덩이점 · 등받이 · 목 각도 · 발목 · 발 각도 · 핸들 · 직접 고친 체절 길이를 처음으로 (이름 · 키 · 몸무게 · 성별 · 장비는 그대로)">자세 초기화</button>` : ''}</div>
    <div class="m1-dgrid"><div class="m1-dfw">${m1InfoHTML(d, D, ed)}<div class="m1-dwrap" id="m1dfig">${m1DrvFig(WB.R)}</div></div>
      <aside class="m1-dside" aria-label="드라이버 설정">
        <div class="m1-sg"><b>체절 비율</b><div class="m1-seg2">${[['m','남성'],['f','여성']].map(([k, t]) => `<button type="button" data-m1sex="${k}" aria-pressed="${(d.sex||'m')===k}"${ed ? '' : ' disabled'}>${t}</button>`).join('')}</div></div>
        <div class="m1-sg"><b>장비</b>${gin('gear.helmet', '헬멧 → 머리')}${gin('gear.suit', '드라이버 복 → 체절 비율로')}${gin('gear.belt', '안전벨트 → 몸통')}</div>
        ${ed ? `<div class="m1-sg"><b>자세 복사</b><span class="m1-fh">엉덩이점 · 등받이 · 목 각도 · 발목 · 발 각도 · 핸들 · 체절 길이만</span><div class="m1-same">${others.map(k => `<button type="button" class="btn small" data-m1same="${k}">${M1DRV[k]}와 같게</button>`).join('')}</div></div>` : ''}
        <div class="m1-sg" id="m1segs">${m1SegTable(D)}</div>
      </aside></div>`; }
const m1HestTxt = D => `체절 길이로 본 키 약 ${wbFmt(D.hEst, 1)} cm`;
/* 그림 왼쪽 위 드라이버 정보: 입력 상자 (그림을 다시 그려도 입력 중인 칸이 사라지지 않게 그림 밖에 둠) */
function m1InfoHTML(d, D, ed){
  const num = (p, v, u, w) => ed ? `<input type="number" step="any" data-m1o="${p}" value="${v==null || !isFinite(v) ? '' : v}"${w ? ` placeholder="${w}"` : ''} aria-label="${p}">${u ? `<i>${u}</i>` : ''}` : `<b>${v==null || !isFinite(v) ? '-' : v}</b>${u ? `<i>${u}</i>` : ''}`;
  return `<div class="m1-dinfo${ed ? ' ed' : ''}" aria-label="드라이버 정보">
    <label class="m1-dn">${ed ? `<input type="text" data-m1o="label" maxlength="20" value="${wbEsc(d.label||'')}" placeholder="표시 이름 (${M1DRV[M1.drv]})" aria-label="표시 이름">` : `<b>${wbEsc(d.label || M1DRV[M1.drv])}</b>`}</label>
    <label><span>키</span>${num('height', +d.height, 'cm')}</label>
    <p class="m1-fh m1-hest" id="m1dhest"${D && D.segSet ? '' : ' hidden'}>${D ? m1HestTxt(D) : ''}</p>
    <label><span>몸무게</span>${num('mass', +d.mass, 'kg')}</label>
    <p class="m1-dsum">드라이버 합 <b id="m1dsum">${D ? wbFmt(D.m, 1) : '-'}</b> kg (장비 포함)</p></div>`; }
function m1SegTable(D){ if(!D) return '';
  return `<b>체절 질량 · 무게중심</b><table class="m1-st"><thead><tr><th>체절</th><th>kg</th><th>x</th><th>z</th></tr></thead><tbody>${D.segs.map(sg => `<tr><td>${sg.n}</td><td>${wbFmt(sg.m, 2)}</td><td>${Math.round(sg.x)}</td><td>${Math.round(sg.z)}</td></tr>`).join('')}
    <tr class="m1-sum"><td>합</td><td>${wbFmt(D.m, 2)}</td><td>${Math.round(D.model[0])}</td><td>${Math.round(D.model[1])}</td></tr></tbody></table>
    <p class="m1-fh">체절 질량 비율 · 무게중심 위치는 성인 남녀 평균 체형 표, 체절 길이는 표의 평균 길이를 키 비율로 늘이거나 줄인 값입니다. <button type="button" class="lnk" data-m1src>출처는 참고 탭</button></p>
    ${D.warn.length ? `<p class="m1-warn">${D.warn.map(wbEsc).join(' · ')}</p>` : ''}`; }
/* 드라이버 그림 (차 윤곽 위, 앞이 왼쪽). 몸은 알약(두 원 + 두 접선) 모양, 발은 뒤꿈치가 직각인 사다리꼴 */
const M1F = {x0:-960, x1:2120, z0:-110, z1:1290, W:1000};
const M1HD = 280;  /* 헬멧 바깥 지름 기본값 [mm] (옆에서 본 앞뒤 길이, 그림용). 머리 길이와 따로 입력, 계산(키 · 무게중심)에는 쓰지 않음 */
/* 범위: 점(엉덩이점 · 발목 · 핸들)은 그림 안에서만, 각도는 등받이 0~70°, 발 0~60° */
/* 안전벨트 규정(FSK 2026 차량기술규정 제23조 ①항 2호, ③항 4호): 상반신이 지면에서 60° 이하(= 등받이 수직에서 30° 이상)이면
   다리 사이 벨트 추가, 허리벨트 지면과 60~80° (아니면 45~65°). 그림에 표시만, 계산과 무관 */
const M1LIM = {x:[M1F.x0 + 40, M1F.x1 - 40], z:[0, M1F.z1 - 40], back:[0, 70], neck:[-60, 20], foot:[0, 60], helm:[150, 400]};
const m1Clamp = (v, [a, b]) => Math.max(a, Math.min(b, v));
function m1Pill(P, a, b, ra, rb, cls, halo){ const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1e-6, u = [dx/l, dy/l], n = [-u[1], u[0]];
  const sp = Math.max(-.99, Math.min(.99, (ra - rb)/l)), cp = Math.sqrt(1 - sp*sp), e1 = [n[0]*cp + u[0]*sp, n[1]*cp + u[1]*sp], e2 = [-n[0]*cp + u[0]*sp, -n[1]*cp + u[1]*sp];
  const pt = (c, r, e) => `${(c[0] + r*e[0]).toFixed(1)},${(c[1] + r*e[1]).toFixed(1)}`;
  const shape = (h, c) => `<path d="M${pt(a, ra + h, e1)} L${pt(b, rb + h, e1)} L${pt(b, rb + h, e2)} L${pt(a, ra + h, e2)} Z" class="${c}"/><circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="${(ra + h).toFixed(1)}" class="${c}"/><circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="${(rb + h).toFixed(1)}" class="${c}"/>`;
  return (halo ? shape(halo, 'm1-halo') : '') + shape(0, cls); }
function m1DrvFig(R){ const D = R && R.drv && R.drv[M1.drv]; if(!D) return '<p class="wb-empty">계산 중…</p>';
  const d = m1Drv(M1.drv) || M1DDEF(), ed = m1CanEdit(), L = (WB.I.L > 0 ? WB.I.L : 1550), r = (WB.I.r_load > 0 ? WB.I.r_load : (typeof DASH!=='undefined' && DASH.P.r_load) || 220);
  const {x0, x1, z0, z1, W} = M1F, s = W/(x1 - x0), H = Math.round((z1 - z0)*s), T = (x, z) => [(x - x0)*s, H - (z - z0)*s], X = x => T(x, 0)[0], Z = z => T(0, z)[1];
  const J = D.j, S2 = p => T(p[0], p[1]), mm = v => v*s, f0 = v => Math.round(v), hal = 2.2;
  const lab = (x, z, key, txt, cls, anchor) => `<text x="${x.toFixed(1)}" y="${z.toFixed(1)}" class="m1-e${cls ? ' ' + cls : ''}"${anchor ? ` text-anchor="${anchor}"` : ''}${ed ? ` data-m1e="${key}" tabindex="0" role="button"` : ''}>${txt}</text>`;
  const segLab = (a, b, key, dx, dy) => { const m = [(X(a[0]) + X(b[0]))/2 + (dx||0), (Z(a[1]) + Z(b[1]))/2 + (dy||0)];
    return lab(m[0], m[1], 'seg.' + key, `${M1SEG[key]} ${Math.round(D.len[key])}`, d.seg[key] > 0 ? 'set' : 'def', 'middle'); };
  const pt = (p, key) => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Z(p[1]).toFixed(1)}" r="7" class="m1-pt3${ed ? ' drag' : ''}"${ed ? ` data-m1drag="${key}"` : ''}/>`;
  const cg = D.cg, cr = 10, [cx, cy] = T(L - cg[0], cg[1]);   /* 무게중심은 차량 x → 그림 좌표 */
  const sym = `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})"><circle r="${cr+2}" fill="#fff"/><path d="M0 0 L${-cr} 0 A${cr} ${cr} 0 0 1 0 ${-cr} Z M0 0 L${cr} 0 A${cr} ${cr} 0 0 1 0 ${cr} Z" fill="#d92d20"/><circle r="${cr}" fill="none" stroke="#d92d20" stroke-width="1.6"/><line x1="${-cr}" x2="${cr}" stroke="#d92d20" stroke-width="1.2"/><line y1="${-cr}" y2="${cr}" stroke="#d92d20" stroke-width="1.2"/></g>`;
  const bl = .82*D.len.trunk, bk = [J.H[0] + bl*Math.sin(D.back), J.H[1] + bl*Math.cos(D.back)], bm = [J.H[0] + 330*Math.sin(D.back), J.H[1] + 330*Math.cos(D.back)];   /* 등받이: 몸통 뒤에 가려지는 길이 */
  const [hx, hy] = S2(J.HC), hr = mm((d.helm > 0 ? d.helm : M1HD)/2), hd0 = mm(D.len.head/2), hcol = M1HC[M1.drv] || M1HC.d1, vid = 'm1v' + M1.drv;
  /* 바이저는 목 각도와 상관없이 항상 수평 (시선은 정면) */
  const visor = `<g><clipPath id="${vid}"><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(hr - 1).toFixed(1)}"/></clipPath><rect x="${(hx - hr).toFixed(1)}" y="${(hy - hr*0.42).toFixed(1)}" width="${(hr*0.95).toFixed(1)}" height="${(hr*0.42).toFixed(1)}" rx="${(hr*0.12).toFixed(1)}" clip-path="url(#${vid})" class="m1-visor"/></g>`;
  const foot = `<path d="M${J.F.map(p => S2(p).map(v => v.toFixed(1)).join(',')).join(' L')} Z" class="m1-foot"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="m1-svg cf-svg" id="m1svg" data-s="${s}" data-x0="${x0}" data-z0="${z0}" data-h="${H}" role="img" aria-label="드라이버 자세 측면도 (차 윤곽 위)">
    ${CARFIG.carSide(T, L, r, s)}
    <line x1="0" y1="${Z(0)}" x2="${W}" y2="${Z(0)}" class="cf-gnd"/>
    <line x1="${X(L)}" y1="${Z(0) + 4}" x2="${X(L)}" y2="${Z(0) + 16}" stroke="#232731"/><text x="${X(L)}" y="${Z(0) + 28}" class="m1-tl" text-anchor="middle">뒤 차축 x = 0</text>
    <text x="12" y="${Z(0) + 28}" class="m1-tl">좌표 [mm]: x = 뒤 차축 중심에서 앞으로 + · z = 지면에서 위로 +</text>
    <line x1="${X(J.H[0])}" y1="${Z(J.H[1])}" x2="${X(bk[0])}" y2="${Z(bk[1])}" class="m1-back" stroke-width="${mm(55).toFixed(1)}"/>
    <g class="m1-drv">
      ${m1Pill(null, S2(J.H), S2(J.Sh), mm(128), mm(108), 'm1-p-trunk', hal)}
      ${m1Pill(null, S2(J.Sh), S2(J.N), mm(50), mm(44), 'm1-p-trunk', hal)}
      <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(hr + hal).toFixed(1)}" class="m1-halo"/><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${hd0.toFixed(1)}" class="m1-head"/><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${hr.toFixed(1)}" class="m1-helm" style="fill:${hcol};stroke:${hcol}"/>${visor}
      ${m1Pill(null, S2(J.H), S2(J.K), mm(86), mm(62), 'm1-p-leg', hal)}${m1Pill(null, S2(J.K), S2(J.A), mm(60), mm(44), 'm1-p-leg', hal)}${foot}
      ${m1Pill(null, S2(J.Sh), S2(J.E), mm(50), mm(40), 'm1-p-arm', hal)}${m1Pill(null, S2(J.E), S2(J.W), mm(38), mm(31), 'm1-p-arm', hal)}<circle cx="${X(J.W[0]).toFixed(1)}" cy="${Z(J.W[1]).toFixed(1)}" r="${mm(42).toFixed(1)}" class="m1-p-hand"/>
    </g>
    ${segLab(J.H, J.K, 'thigh', 0, 32)}${segLab(J.K, J.A, 'shank', -6, 34)}${segLab(J.F[0], J.F[2], 'foot', -48, -6)}${lab(X(J.F[1][0]) - 10, Z(J.F[1][1]) - 10, 'foot', `발 각도 ${f0(isFinite(d.foot) ? d.foot : 20)}°`, 'pt', 'end')}${segLab(J.H, J.S, 'trunk', 86, -16)}${lab(X(J.HC[0]) + hr + 8, Z(J.HC[1]) - 6, 'seg.head', `머리 ${Math.round(D.len.head)}`, d.seg.head > 0 ? 'set' : 'def')}${lab(X(J.HC[0]) + hr + 8, Z(J.HC[1]) + 14, 'helm', `헬멧 바깥 ${Math.round(d.helm > 0 ? d.helm : M1HD)}`, 'set')}${lab(X(J.N[0]) + mm(60), Z(J.N[1]) + 16, 'seg.neck', `목 ${Math.round(D.len.neck)}`, d.seg.neck > 0 ? 'set' : 'def')}${lab(X(J.N[0]) + mm(60), Z(J.N[1]) + 36, 'neck', `목 각도 ${f0(isFinite(d.neck) ? d.neck : 0)}° (+ 뒤로)`, 'pt')}${segLab(J.Sh, J.E, 'uarm', 0, -20)}${segLab(J.E, J.W, 'farm', 0, -20)}
    ${lab(X(bm[0]) + 46, Z(bm[1]) + 46, 'back', `등받이 ${f0(d.back)}° (+ 뒤로)`, 'pt')}
    <text x="${(X(bm[0]) + 46).toFixed(1)}" y="${(Z(bm[1]) + 64).toFixed(1)}" class="m1-tl m1-rec${d.back >= 30 ? ' on' : ''}">${d.back >= 30 ? `누운 자세 (상반신 지면에서 60° 이하)<tspan x="${(X(bm[0]) + 46).toFixed(1)}" dy="15">허리벨트 지면과 60~80° · 다리 사이 벨트 추가</tspan>` : '직립 자세 · 허리벨트 지면과 45~65°'}</text>
    ${pt(J.H, 'hip')}${lab(X(J.H[0]) + 12, Z(J.H[1]) + 26, 'hip', `엉덩이점 x ${f0(d.hip.x)} · z ${f0(d.hip.z)}`, 'pt')}
    ${pt(J.P, 'pedal')}${lab(X(J.P[0]) + 14, Z(J.P[1]) + 30, 'pedal', `발목(복사뼈) x ${f0(d.pedal.x)} · z ${f0(d.pedal.z)}`, 'pt', 'start')}
    ${pt(J.G, 'sw')}${lab(X(J.G[0]) - 12, Z(J.G[1]) - 12, 'sw', `핸들 x ${f0(d.sw.x)} · z ${f0(d.sw.z)}`, 'pt', 'end')}
    ${sym}<text x="${cx}" y="${cy + 28}" text-anchor="middle" class="m1-tl r">CG x ${f0(cg[0])} · z ${f0(cg[1])}</text>
  </svg>`; }
/* 그림 위 입력 칸: 라벨 자리에 띄움. 점(x · z)은 두 칸 */
const M1EF = {back:[['back','°']], neck:[['neck','°']], foot:[['foot','°']], hip:[['hip.x','x'],['hip.z','z']], pedal:[['pedal.x','x'],['pedal.z','z']], sw:[['sw.x','x'],['sw.z','z']], height:[['height','cm']], mass:[['mass','kg']], label:[['label','']], helm:[['helm','mm']]};
const m1Get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
function m1EditOpen(t){ const key = t.dataset.m1e, d = m1Drv(M1.drv) || M1DDEF(), box = t.closest('.m1-dwrap'), rb = box.getBoundingClientRect(), rt = t.getBoundingClientRect();
  const fs = key.startsWith('seg.') ? [[key, 'mm']] : M1EF[key]; if(!fs) return;
  const D = WB.R && WB.R.drv && WB.R.drv[M1.drv], ph = p => p.startsWith('seg.') && D ? Math.round(D.lenDef[p.slice(4)]) : '';
  const pop = document.createElement('div'); pop.className = 'm1-pop'; pop.style.left = Math.max(0, rt.left - rb.left - 8) + 'px'; pop.style.top = (rt.bottom - rb.top + 4) + 'px';
  pop.innerHTML = fs.map(([p, u]) => { const v = m1Get(d, p);
    return `<label>${key==='label' ? `<input type="text" data-m1p="${p}" maxlength="20" value="${wbEsc(v||'')}" placeholder="${M1DRV[M1.drv]}">` : `<span>${u==='x'||u==='z' ? u : ''}</span><input type="number" step="any" data-m1p="${p}" value="${v==null || !isFinite(v) || (p.startsWith('seg.') && !(v > 0)) ? '' : v}" placeholder="${ph(p)}">${u==='x'||u==='z' ? '<i>mm</i>' : `<i>${u}</i>`}`}</label>`; }).join('')
    + `<span class="m1-poph">${key.startsWith('seg.') ? '비우면 키 비율' : key==='pedal' ? '발목(복사뼈) 중심 좌표 · 발바닥이 페달에 닿음' : key==='foot' ? '발바닥이 수직에서 앞으로 누운 각도 · 0~60°' : key==='back' ? '등받이가 수직에서 뒤로 누운 각도 · 0~70°' : key==='neck' ? '머리 · 목이 수직에서 뒤로 젖힌 각도 (경추 7번 기준, 등받이와 같은 방향, 앞으로 숙이면 −) · −60~20°' : key==='helm' ? '헬멧 바깥 지름(옆에서 본 앞뒤 길이) · 그림에만 씀 · 150~400' : /^(hip|pedal|sw)$/.test(key) ? '그림 범위 안으로 맞춤 · Enter 저장' : 'Enter 저장 · Esc 취소'}</span>`;
  box.querySelectorAll('.m1-pop').forEach(x => x.remove()); box.appendChild(pop); M1.edit = {key, pop};
  const f = pop.querySelector('input'); f.focus(); f.select(); }
function m1EditDone(save){ const E = M1.edit; if(!E) return; M1.edit = null;
  if(save){ const vals = [...E.pop.querySelectorAll('[data-m1p]')].map(i => [i.dataset.m1p, i.type==='text' ? i.value.slice(0, 20) : (i.value.trim()==='' ? null : parseFloat(i.value))]);
    const Lw = WB.I.L > 0 ? WB.I.L : 1550, LX = [Lw - M1LIM.x[1], Lw - M1LIM.x[0]];   /* 그림 범위를 차량 x 로 */
    const lim = p => p==='back' ? M1LIM.back : p==='neck' ? M1LIM.neck : p==='foot' ? M1LIM.foot : p==='helm' ? M1LIM.helm : /^(hip|pedal|sw)\.x$/.test(p) ? LX : /^(hip|pedal|sw)\.z$/.test(p) ? M1LIM.z : null;
    const vs = vals.map(([p, v]) => [p, typeof v==='number' && isFinite(v) && lim(p) ? m1Clamp(v, lim(p)) : v]);
    if(vs.every(([, v]) => v===null || typeof v==='string' || isFinite(v))) m1SaveDrv(d => vs.forEach(([p, v]) => m1Path(d, p, v))); }
  E.pop.remove(); }
document.addEventListener('focusout', e => { const E = M1.edit; if(E && E.pop.contains(e.target) && !E.pop.contains(e.relatedTarget)) m1EditDone(true);
  const P = M1.pick; if(P && P.pop.contains(e.target) && !P.pop.contains(e.relatedTarget)) m1PickClose(true); });

/* 참고 탭 '출처'의 체절 표 출처로 (작업창을 닫고 이동) */
function m1GoSrc(){ wbClose(); if(typeof pushHist==='function') pushHist(); showTab('ref');
  const d = [...document.querySelectorAll('#ref-list > details')].find(x => x.querySelector(':scope>summary .stitle')?.textContent.trim()==='출처'); if(!d) return; d.open = true;
  const li = [...d.querySelectorAll('li')].find(l => /de Leva/.test(l.textContent)) || d;
  requestAnimationFrame(() => { if(typeof smoothScrollTo==='function') smoothScrollTo(() => li.getBoundingClientRect().top + scrollY - innerHeight/3, () => { try{ markHere(li); }catch(e){} }); else li.scrollIntoView({block:'center'}); }); }
/* ---------- 이벤트 ---------- */
const m1Path = (o, p, v) => { const ks = p.split('.'); let t = o; ks.slice(0, -1).forEach(k => { t[k] = {...(t[k]||{})}; t = t[k]; }); t[ks[ks.length - 1]] = v; };
function m1SaveG(id, fn){ const d = MASS[id], v = d && d.s && d.s[m1Season()]; if(!v) return; const g = JSON.parse(JSON.stringify(v)); g.items = g.items || []; fn(g); m1Store('mass', id, g); }
function m1SaveDrv(fn, id0){ const id = id0 || M1.drv, d = JSON.parse(JSON.stringify(m1Drv(id) || M1DDEF())); delete d.cg_meas; fn(d); m1Store('drv', id, d); }
document.addEventListener('click', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.closest('[data-m1src]')){ m1GoSrc(); return; }
  const tb = t.closest('[data-m1tab]'); if(tb){ M1.tab = tb.dataset.m1tab; wbPaint(['ext']); return; }
  const dv = t.closest('[data-m1drv]'); if(dv){ M1.drv = dv.dataset.m1drv; wbPaint(['ext']); return; }
  const le = t.closest('[data-m1e]'); if(le){ m1EditOpen(le); return; }
  const sx = t.closest('[data-m1sex]'); if(sx){ m1SaveDrv(d => { d.sex = sx.dataset.m1sex; }); wbPaint(['ext']); return; }
  const sm = t.closest('[data-m1same]'); if(sm){ const o = m1Drv(sm.dataset.m1same) || M1DDEF();
    m1SaveDrv(d => { ['hip','pedal','sw','seg'].forEach(k => { d[k] = JSON.parse(JSON.stringify(o[k])); }); d.back = o.back; d.neck = o.neck; d.foot = o.foot; }); wbPaint(['ext']); toast(`${M1DRV[sm.dataset.m1same]}와 같은 자세로 맞췄습니다.`); return; }
  const rs = t.closest('[data-m1dreset]'); if(rs){ if(!rs.dataset.sure){ rs.dataset.sure = '1'; rs.textContent = '자세를 처음으로 돌릴까요? 한 번 더 누르면 실행'; rs.classList.add('sure');
      setTimeout(() => { if(rs.isConnected){ delete rs.dataset.sure; rs.textContent = '자세 초기화'; rs.classList.remove('sure'); } }, 3000); return; }
    const D0 = M1DDEF(); m1SaveDrv(d => { ['hip','pedal','sw'].forEach(k => { d[k] = {...D0[k]}; }); d.back = D0.back; d.neck = D0.neck; d.foot = D0.foot; d.seg = {}; }); wbPaint(['ext']); toast('자세를 처음으로 돌렸습니다.'); return; }
  if(t.closest('[data-m1gadd]')){ if(!m1CanEdit()) return; const id = m1NewId();
    m1Store('mass', id, {name:'', x:null, y:0, z:null, cat:'s', items:[{name:'', m:null, n:1}], ord:Date.now()}); wbPaint(['ext']);
    const n = document.querySelector(`[data-m1g="${id}"] [data-m1gf="name"]`); if(n) n.focus(); return; }
  const gb = t.closest('[data-m1g]'); if(!gb) return; const gid = gb.dataset.m1g;
  if(t.closest('[data-m1color]')){ m1PickOpen(t.closest('[data-m1color]')); return; }
  const hb = t.closest('[data-m1h]'); if(hb && M1.pick){ const h = hb.dataset.m1h==='none' ? null : +hb.dataset.m1h; M1.pick.h = h; m1SetHue(gid, h); m1PickClose(h!=null); return; }
  if(t.closest('[data-m1iadd]')){ m1SaveG(gid, g => g.items.push({name:'', m:null, n:1})); wbPaint(['ext']); const ins = document.querySelectorAll(`[data-m1g="${gid}"] [data-m1if="name"]`); if(ins.length) ins[ins.length - 1].focus(); return; }
  const id = t.closest('[data-m1idel]'); if(id){ m1SaveG(gid, g => g.items.splice(+id.dataset.m1idel, 1)); wbPaint(['ext']); return; }
  if(t.closest('[data-m1gcopy]')){ const g = m1Groups().find(x => x.id===gid); if(!g) return;
    const sw = n => /왼/.test(n) ? n.replace(/왼/g, '오른') : /오른/.test(n) ? n.replace(/오른/g, '왼') : (n || '어셈블리') + ' (복사)';
    const c = {...JSON.parse(JSON.stringify(g)), name:sw(g.name||''), y:g.y==null ? null : -g.y, ord:(g.ord||0) + .5}; delete c.id; delete c.pos;
    m1Store('mass', m1NewId(), c); wbPaint(['ext']); return; }
  const gd = t.closest('[data-m1gdel]'); if(gd){ const g = m1Groups().find(x => x.id===gid);
    if(g && (g.items||[]).some(it => it.m > 0) && !gd.dataset.sure){ gd.dataset.sure = '1'; gd.textContent = '지울까요?'; gd.classList.add('sure'); setTimeout(() => { if(gd.isConnected){ delete gd.dataset.sure; gd.innerHTML = M1IC.del; gd.classList.remove('sure'); } }, 2500); return; }
    m1Store('mass', gid, null); wbPaint(['ext']); return; }
});
document.addEventListener('keydown', e => { const t = e.target;
  if(M1.edit && M1.edit.pop.contains(t)){ if(e.key==='Enter'){ e.preventDefault(); m1EditDone(true); } else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); m1EditDone(false); } return; }
  if(M1.pick && M1.pick.pop.contains(t) && (e.key==='Escape' || e.key==='Enter')){ e.preventDefault(); e.stopPropagation(); m1PickClose(true); return; }
  if(t.matches && t.matches('[data-m1e]') && (e.key==='Enter' || e.key===' ')){ e.preventDefault(); m1EditOpen(t); } }, true);
document.addEventListener('input', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return; const gb = t.closest('[data-m1g]');
  if(t.matches('[data-m1hue]') && M1.pick){ const h = +t.value; M1.pick.h = h; m1SetHue(M1.pick.id, h); return; }
  if(gb && t.matches('input[data-m1gf]')){ const f = t.dataset.m1gf, v = f==='name' ? t.value.slice(0, 60) : (t.value.trim()==='' ? null : parseFloat(t.value)); if(f!=='name' && v!=null && !isFinite(v)) return;
    m1SaveG(gb.dataset.m1g, g => { g[f] = v; }); return; }
  if(gb && t.matches('[data-m1if="half"]')){ const i = +t.dataset.m1ii, v = t.checked; m1SaveG(gb.dataset.m1g, g => { if(v) g.items[i].half = true; else delete g.items[i].half; }); return; }
  if(gb && t.matches('[data-m1if]')){ const f = t.dataset.m1if, i = +t.dataset.m1ii, v = f==='name' ? t.value.slice(0, 40) : (t.value.trim()==='' ? null : parseFloat(t.value)); if(f!=='name' && v!=null && !isFinite(v)) return;
    m1SaveG(gb.dataset.m1g, g => { g.items[i][f] = v; }); if(f==='n'){ const c = t.closest('.m1-ir'); if(c) c.classList.toggle('off', v===0); }
    const sm = gb.querySelector('.m1-sum'), G = m1Groups().find(x => x.id===gb.dataset.m1g); if(sm && G) sm.textContent = wbFmt(m1GSum(G), 2) + ' kg'; return; }
  if(t.matches('input[data-m1dc]')){ const v = t.value.trim()==='' ? 0 : parseFloat(t.value); if(!isFinite(v) || v < 0 || (t.dataset.m1dc==='mass' && !(v > 0))) return; m1SaveDrv(d => m1Path(d, t.dataset.m1dc, v), M1.dsel); return; }
  if(t.matches('input[data-m1o]')){ const p = t.dataset.m1o; let v;
    if(p==='label') v = t.value.slice(0, 20);
    else { v = t.value.trim()==='' ? null : parseFloat(t.value); if(v!=null && !isFinite(v)) return; if((p==='height' || p==='mass') && !(v > 0)) return; }
    m1SaveDrv(d => m1Path(d, p, v)); return; }
  if(t.matches('input[data-m1d]')){ const v = t.value.trim()==='' ? 0 : parseFloat(t.value); if(!isFinite(v) || v < 0) return; m1SaveDrv(d => m1Path(d, t.dataset.m1d, v)); } });
document.addEventListener('change', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  const gb = t.closest('[data-m1g]'); if(gb && t.matches('select[data-m1gf]')){ m1SaveG(gb.dataset.m1g, g => { g.cat = t.value; }); return; }
  if(t.matches('[data-m1dsel]')){ M1.dsel = t.value; try{ localStorage.setItem('run2x.wb.1.drv', M1.dsel); }catch(err){} t.blur(); wbPaint(['ext']); wbRefresh(); m1PartDirty(); } });
document.addEventListener('pointerdown', e => { if(M1.pick && !M1.pick.pop.contains(e.target) && !(e.target.closest && e.target.closest('[data-m1color]'))) m1PickClose(true); }, true);
/* 점 끌기: 엉덩이점 · 페달 · 핸들 (5 mm 단위) */
document.addEventListener('pointerdown', e => { const p = e.target.closest && e.target.closest('#m1svg [data-m1drag]'); if(!p || e.button!==0) return; e.preventDefault(); M1.drag = p.dataset.m1drag; });
document.addEventListener('pointermove', e => { if(!M1.drag) return; const svg = $('#m1svg'); if(!svg) return; const rc = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, s = +svg.dataset.s;
  const px = (e.clientX - rc.left)/rc.width*vb.width, py = (e.clientY - rc.top)/rc.height*vb.height;
  const Lw = WB.I.L > 0 ? WB.I.L : 1550, x = Math.round((Lw - m1Clamp(px/s + +svg.dataset.x0, M1LIM.x))/5)*5, z = m1Clamp(Math.round(((+svg.dataset.h - py)/s + +svg.dataset.z0)/5)*5, M1LIM.z), k = M1.drag;
  const d = m1Drv(M1.drv) || M1DDEF(); if(d[k] && d[k].x===x && d[k].z===z) return; m1SaveDrv(dd => { dd[k] = {x, z}; }); });
document.addEventListener('pointerup', () => { M1.drag = null; });

/* ---------- 계산에 넘길 값 ---------- */
function m1ExtraI(){ const gs = m1Groups(), items = gs.map(g => { const mh = (g.items || []).reduce((a, it) => a + (it.half && isFinite(it.m) && it.m!==null ? +it.m*m1N(it) : 0), 0);
    return {m:m1GSum(g), mh, to:m1HalfTo(g, gs).cat, hue:g.hue, x:+g.x||0, y:+g.y||0, z:+g.z||0, lx:+g.lx||0, ly:+g.ly||0, lz:+g.lz||0, cat:g.cat||'s', name:g.name||''}; }).filter(it => it.m > 0);
  const drv = {}; Object.keys(M1DRV).forEach(k => { drv[k] = m1Drv(k) || M1DDEF(); });
  return {items, drv, dsel:M1.dsel}; }

/* ---------- 결과 그림: 차 윤곽 위에 어셈블리(원 넓이 ∝ 질량)와 CG — 옆에서 · 위에서 (같은 축척) ---------- */
function m1Figure(I, R){ const o = R.out, items = (I.items || []).concat(R.drvItem && R.drvItem.m > 0 ? [R.drvItem] : []);
  const L = I.L, r = I.r_load > 0 ? I.r_load : 220, W = 1200, H = 330, gap = 60, colw = (W - gap - 20)/2, x0 = -960, x1 = L + 480, s = colw/(x1 - x0);
  const c1 = 10, c2 = 10 + colw + gap, ts = (x, z) => [c1 + (x - x0)*s, 280 - z*s], tt = (x, zr) => [c2 + (x - x0)*s, 165 - zr*s];   /* 위에서: 오른쪽(−y)이 위 (대시보드 윗면도와 같게) */
  /* 원 색 = 그 카드에 정한 색(색 없으면 회색), 드라이버 = 헬멧 색 */
  const colOf = it => it.cat==='d' ? (M1HC[I.dsel] || M1HC.d1) : it.hue!=null ? m1HueLn(it.hue) : '#8b90a0', rr = m => Math.max(3, Math.sqrt(m)*2.6);
  const sym = (p, c, R_) => `<g transform="translate(${p[0].toFixed(1)},${p[1].toFixed(1)})"><circle r="${R_+2}" fill="#fff"/><path d="M0 0 L${-R_} 0 A${R_} ${R_} 0 0 1 0 ${-R_} Z M0 0 L${R_} 0 A${R_} ${R_} 0 0 1 0 ${R_} Z" fill="${c}"/><circle r="${R_}" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="${-R_}" x2="${R_}" stroke="${c}"/><line y1="${-R_}" y2="${R_}" stroke="${c}"/></g>`;
  let sv = `<svg class="m1-fig cf-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="질량 분포: 옆에서 · 위에서">
    <text x="${c1 + 4}" y="18" class="m1-tl b">옆에서</text><text x="${c2 + 4}" y="18" class="m1-tl b">위에서</text>
    <line x1="${c1 + colw + gap/2}" y1="30" x2="${c1 + colw + gap/2}" y2="${H - 20}" stroke="var(--line)"/>
    ${CARFIG.carSide(ts, L, r, s)}<line x1="${c1}" y1="280" x2="${c1 + colw}" y2="280" class="cf-gnd"/>${CARFIG.carTop(tt, L, r, s, I.tf, I.tr)}`;
  items.slice().sort((a, b) => b.m - a.m).forEach(it => { const c = colOf(it), R_ = rr(it.m), p1 = ts(L - it.x, it.z), p2 = tt(L - it.x, -it.y), tl = `<title>${wbEsc(it.name || '')} ${wbFmt(it.m, 1)} kg</title>`;
    sv += `<circle cx="${p1[0].toFixed(1)}" cy="${p1[1].toFixed(1)}" r="${R_.toFixed(1)}" fill="${c}" fill-opacity=".3" stroke="${c}">${tl}</circle><circle cx="${p2[0].toFixed(1)}" cy="${p2[1].toFixed(1)}" r="${R_.toFixed(1)}" fill="${c}" fill-opacity=".3" stroke="${c}">${tl}</circle>`; });
  if(o.m > 0){ sv += sym(ts(L - o.x_cg, o.h), '#d92d20', 9) + sym(tt(L - o.x_cg, -o.y_cg), '#d92d20', 9); if(o.m_s > 0) sv += sym(ts(L - o.x_s, o.h_s), '#6A4294', 7); }
  sv += `</svg><div class="wb-leg"><span><i style="background:#d92d20"></i>차 전체 CG</span><span><i style="background:#6A4294"></i>현가상 CG</span><span class="muted">원 색 = 카드 색 (드라이버 = 헬멧 색) · 원 넓이 ∝ 질량 · 원에 마우스를 올리면 어셈블리 이름</span></div>`;
  return sv; }

/* ---------- 대시보드 '파트별 > 질량 · 무게중심': 팀 질량 표 · 드라이버로 계산한 결과(읽기 전용) ---------- */
const M1P = { R:null, key:'', busy:false, w:null };
function m1PartDirty(){ M1P.key = ''; if(typeof DASH!=='undefined' && DASH.part==='frame' && $('#m1part')) m1PartRun(); }
function m1PartInputs(){ const P = typeof DASH!=='undefined' ? DASH.P : {}; return {L:P.L || 1550, tf:P.tf || 1200, tr:P.tr || 1180, r_load:P.r_load || 220, ...m1ExtraI()}; }
function m1PartRun(){ const I = m1PartInputs(), key = JSON.stringify(I); if(key===M1P.key || M1P.busy) return; M1P.busy = true;
  try{ if(!M1P.w){ M1P.w = new Worker(URL.createObjectURL(new Blob([WB_TOOLS['1'].code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false}); } };'], {type:'text/javascript'}))); } }catch(e){ M1P.busy = false; return; }
  M1P.w.onmessage = e => { M1P.busy = false; M1P.key = key; if(e.data.ok){ M1P.R = e.data.r; const b = $('#m1part'); if(b) b.innerHTML = m1PartBody(I, M1P.R); } };
  M1P.w.postMessage(I); }
function m1PartBody(I, R){ const o = R.out; if(!(o.m > 0)) return '<p class="muted">팀 질량 표가 비어 있습니다. 도구 1에서 어셈블리를 넣으십시오.</p>';
  return `<div class="m1-pf">${m1Figure(I, R)}</div>${wbOutCards(WB_TOOLS['1'], R, false)}`; }
function m1PartHTML(){ setTimeout(m1PartRun, 0);
  return `<div class="m1-part"><p class="dp-note">팀 질량 표(어셈블리 ${m1Groups().length}개)와 ${M1DRV[M1.dsel]} 드라이버, 대시보드의 휠베이스 · 트레드로 계산한 결과입니다. 고치기는 <button type="button" class="lnk" data-wb="1">도구 1 질량 · 무게중심 계산기</button>에서 합니다.</p><div id="m1part">${M1P.R ? m1PartBody(m1PartInputs(), M1P.R) : '<p class="muted">계산 중…</p>'}</div></div>`; }

/* ---------- 이 탭 사용법 (사이트 사용법과 같은 방식). 단계: [선택자, 제목, 설명, {click, inner}]
   - 표 탭이 바뀌는 단계는 포인터가 탭을 누르는 모습 → 서서히 바뀜 (click). 끝나면 원래 탭으로
   - 작업창 오른쪽은 창 안쪽이 굴러가므로 그 창을 부드럽게 굴림 (inner) ---------- */
function m1TourTab(tab){ if(!M1.tourUndo && typeof tgUndo==='function'){ const t0 = M1.tab; M1.tourUndo = true;
    tgUndo(() => { M1.tourUndo = false; if(M1.tab!==t0){ M1.tab = t0; wbPaint(['ext']); } }); }
  if(M1.tab!==tab){ M1.tab = tab; wbPaint(['ext']); } }
const m1TT = tab => ({click:{sel:`#wb [data-m1tab="${tab}"]`, need:() => M1.tab!==tab, run:() => m1TourTab(tab)}, inner:'#wb .wb-right'});
const M1TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 차 형상, 코드 · 검증(계산 코드와 손계산 비교표), 입력 내보내기 · 가져오기, 대시보드에 반영입니다.', m1TT('mass')],
  ['#wb .wb-bar [data-coordopen]', '좌표계', '모든 좌표는 사이트 차량 좌표계입니다. 원점은 뒤 차축 중심 · 차량 중심면 · 지면, x는 앞으로 +, y는 왼쪽 +, z는 위로 + [mm]입니다. 누르면 설계 탭과 같은 좌표계 그림이 열립니다. 차 안 부품은 대부분 x가 + 라서 숫자만 넣으면 됩니다.', m1TT('mass')],
  ['#wb .wb-bar [data-shpopen]', '차 형상', '우리 차 측면도 · 윗면도를 이미지(.png .jpg .webp)나 CAD 도면(.dxf)으로 올리면, 질량 분포와 드라이버 모델 그림의 차 대신 씁니다. 올린 뒤 ① 앞 바퀴 중심 → ② 뒤 바퀴 중심(윗면은 차축 가운데) 두 점만 찍으면 크기 · 방향 · 위치가 자동으로 맞춰집니다. 계산에는 쓰지 않고, 올리지 않거나 되돌리면 기본 차 그림입니다.', m1TT('mass')],
  ['#wb .wb-in', '입력', '휠베이스와 트레드입니다. [대시보드 값으로 채우기]를 누르면 대시보드 설계값이 들어옵니다.', m1TT('mass')],
  ['#wb .m1-tabs', '표 입력', '[부품 질량 표]는 어셈블리별 질량과 위치, [드라이버 모델]은 드라이버 자세와 체절 질량입니다. 팀원 누구나 이번 시즌 값을 고칩니다.', m1TT('mass')],
  ['#m1list [data-m1g]', '어셈블리 카드', '카드 하나가 어셈블리 하나입니다. 좌표는 그 어셈블리의 무게중심이고, 질량은 항목의 질량 × 개수 합입니다. 개수를 0으로 하면 그 항목은 빠집니다. 왼쪽 위 동그라미로 카드 색을, 오른쪽 위 단추로 좌우 바꿔 복사 · 지우기를 합니다.', m1TT('mass')],
  ['#m1list [data-m1g] .m1-grip', '카드 옮기기', '점 손잡이를 끌어 옮깁니다. 카드는 줄마다 왼쪽부터 채워집니다. 다른 카드 위에 놓으면 그 앞에 끼워 넣고(줄이 넘치면 마지막 카드가 바로 아래 새 줄로), 줄 끝 빈칸에 놓으면 그 줄 끝에 붙고, 줄 사이에 놓으면 새 줄이 생깁니다. 끄는 동안 파란 선으로 들어갈 자리를 보여 줍니다.', m1TT('mass')],
  ['#m1list [data-m1g] .m1-half', '걸침 ½ 체크', '드라이브샤프트(CV축) · 위시본 · 푸시로드 · 타이로드 · 스프링 · 댐퍼처럼 한쪽은 차체, 한쪽은 업라이트에 붙는 부품은 ½을 체크합니다. 체크한 항목은 질량 절반을 반대쪽으로 셉니다. 현가하 카드면 절반은 현가상으로, 현가상 카드(예: 구동계의 CV축)면 가장 가까운 현가하 카드 쪽(앞 · 뒤)으로 갑니다. 총질량 · 무게중심 · 코너웨이트는 그대로이고 현가상 · 현가하질량만 바뀝니다. 체크 칸에 마우스를 올리면 절반이 갈 곳이 나옵니다.', m1TT('mass')],
  ['#m1list .m1-drvc', '드라이버 카드', '첫 줄 첫 칸에 고정입니다. 계산에 넣을 드라이버(1st · 2nd · 3rd)를 고르고, 몸무게와 장비는 여기서 고쳐도 드라이버 모델과 같은 값이 됩니다. 좌표는 드라이버 모델이 계산한 무게중심입니다.', m1TT('mass')],
  ['#wb .m1-gadd', '어셈블리 더하기', '새 어셈블리 카드를 만듭니다. 이름 · 범주(현가상 · 현가하 앞 · 뒤) · 좌표 · 항목을 채웁니다.', m1TT('mass')],
  ['#m1dfig', '드라이버 그림', '흰 점(엉덩이점 · 발목 · 핸들)을 끌어 자세를 맞춥니다. 그림 위 숫자(체절 길이 · 등받이 · 목 각도 · 발 각도 · 좌표)를 누르면 그 자리에서 고칩니다. 빨간 기호가 드라이버 무게중심입니다.', m1TT('drv')],
  ['#wb .m1-dinfo', '드라이버 정보', '이름 · 키 · 몸무게를 넣습니다. 체절 길이는 키에 비례해 정해집니다.', m1TT('drv')],
  ['#wb .m1-dside', '체절 · 장비', '성별에 따라 체절 비율 표를 고르고, 헬멧 · 드라이버 복 · 안전벨트 질량을 넣습니다. [2nd와 같게] 등으로 다른 드라이버의 자세를 그대로 가져옵니다. 아래 표는 체절별 질량 · 무게중심입니다.', m1TT('drv')],
  ['#wb .wb-sec[aria-label="결과"]', '결과', '차 전체 질량 · 무게중심 · 앞뒤 배분 · 정지 코너웨이트 · 관성 모멘트입니다. [대시보드와 비교]를 켜면 대시보드 값이 아래에 작게 나옵니다.', {inner:'#wb .wb-right'}],
  ['#wbmain', '질량 분포', '어셈블리를 옆과 위에서 본 그림입니다. 원 넓이가 질량에 비례하고, 원에 마우스를 올리면 이름이 나옵니다.', {inner:'#wb .wb-right'}],
];

/* 결과 카드 도우미: 배분은 "앞 : 뒤" 두 숫자, 코너웨이트는 위에서 본 단순한 차 그림 둘레에 (드라이버 포함 · 공차) */
const m1Ratio = v => isFinite(v) ? `<b>${wbFmt(v, 1)} : ${wbFmt(100 - v, 1)}</b> <i>%</i>` : '<b>-</b>';
function m1CwCard(o){ const f = v => isFinite(v) ? wbFmt(v, 1) : '-';
  const cell = (k, t, side) => `<div class="m1-cw ${side}"><span class="m1-cwl">${t}</span><span><b>${f(o['cw_' + k])}</b> <i>kg</i></span><span class="m1-cw0">공차 ${f(o['cw0_' + k])} kg</span></div>`;
  const car = `<svg class="m1-cwcar" viewBox="0 0 64 120" aria-hidden="true"><text x="32" y="9" text-anchor="middle">앞</text>
    <rect x="3" y="20" width="12" height="22" rx="3"/><rect x="49" y="20" width="12" height="22" rx="3"/><rect x="3" y="86" width="12" height="24" rx="3"/><rect x="49" y="86" width="12" height="24" rx="3"/>
    <path d="M32 14 C26 14 23 22 23 34 L21 92 C21 106 25 113 32 113 C39 113 43 106 43 92 L41 34 C41 22 38 14 32 14 Z" class="b"/><line x1="15" y1="31" x2="49" y2="31"/><line x1="15" y1="98" x2="49" y2="98"/><ellipse cx="32" cy="66" rx="5" ry="8" class="s"/></svg>`;
  return `<div class="m1-cwg">${cell('fl', '앞왼', 'l')}<div class="m1-cwc">${car}</div>${cell('fr', '앞오른', 'r')}${cell('rl', '뒤왼', 'l')}${cell('rr', '뒤오른', 'r')}</div>
    <div class="m1-cwx"><span>크로스 (앞오른 + 뒤왼)</span><span><b>${f(o.cross)}</b> <i>%</i><span class="m1-cw0">공차 ${f(o.cross0)} %</span></span></div>`; }

/* ============================================================ 도구 정의 */
WB_TOOLS['1'] = {
  no:'1', stage:'P0', name:'질량 · 무게중심 계산기', mainTitle:'질량 분포', mainMeta:'차 윤곽은 예시 차량 (휠베이스에 맞춤) · 원 넓이 ∝ 질량',
  noSig:true,
  inputs:[ {k:'L', dk:'L', v:1550, d:0, g:'치수'}, {k:'tf', dk:'tf', v:1200, d:0, g:'치수'}, {k:'tr', dk:'tr', v:1180, d:0, g:'치수'}, {k:'r_load', dk:'r_load', v:220, d:0, g:'치수'} ],   /* r_load: 그림의 지면 높이(바퀴 중심 − r_load)만, 계산에는 안 씀 */
  outGroups:{'정지 코너웨이트':{wide:true, render:o => m1CwCard(o)}, '관성 모멘트':{note:'평행축 + 크기를 넣은 어셈블리의 자체 관성(고른 직육면체). 크기가 빈 어셈블리는 점질량 → 실제보다 작을 수 있음'}},
  outputs:[
    {k:'m', n:'총질량 (드라이버 포함)', u:'kg', d:1, g:'질량'}, {k:'m_empty', n:'공차중량 (드라이버 제외)', u:'kg', d:1, g:'질량'}, {k:'m_s', dk:'m_s', d:1, g:'질량'}, {k:'m_us_f', dk:'m_us_f', d:2, g:'질량'}, {k:'m_us_r', dk:'m_us_r', d:2, g:'질량'},
    {k:'m_drv', n:'드라이버 (고른 사람, 장비 포함)', u:'kg', d:1, g:'질량', hide:true}, {k:'h_est', n:'체절 길이로 본 키', u:'cm', d:1, g:'질량', hide:true},
    {k:'fr', dk:'fr', n:'앞 : 뒤 하중 배분', d:1, g:'무게중심 · 배분', fmt:m1Ratio}, {k:'left', dk:'left', n:'왼 : 오른 하중 배분', d:1, g:'무게중심 · 배분', fmt:m1Ratio},
    {k:'x_cg', n:'무게중심 위치 (뒤 차축에서 앞으로)', u:'mm', d:0, g:'무게중심 · 배분'}, {k:'h', dk:'h', n:'무게중심 높이 (지면에서)', d:0, g:'무게중심 · 배분'}, {k:'h_s', dk:'h_s', n:'현가상질량 무게중심 높이', d:0, g:'무게중심 · 배분'},
    {k:'cw_fl', n:'앞왼', u:'kg', d:1, g:'정지 코너웨이트'}, {k:'cw_fr', n:'앞오른', u:'kg', d:1, g:'정지 코너웨이트'}, {k:'cw_rl', n:'뒤왼', u:'kg', d:1, g:'정지 코너웨이트'}, {k:'cw_rr', n:'뒤오른', u:'kg', d:1, g:'정지 코너웨이트'}, {k:'cross', n:'크로스 (앞오른 + 뒤왼)', u:'%', d:1, g:'정지 코너웨이트'},
    {k:'cw0_fl', n:'공차 앞왼', u:'kg', d:1, g:'정지 코너웨이트', hide:true}, {k:'cw0_rr', n:'공차 뒤오른', u:'kg', d:1, g:'정지 코너웨이트', hide:true}, {k:'cross0', n:'공차 크로스', u:'%', d:1, g:'정지 코너웨이트', hide:true},
    {k:'ixx', dk:'ixx', d:1, g:'관성 모멘트'}, {k:'iyy', dk:'iyy', d:1, g:'관성 모멘트'}, {k:'izz', dk:'izz', d:1, g:'관성 모멘트'}
  ],
  extHTML: m1ExtHTML, extraI: m1ExtraI, figure: m1Figure,
  tour: M1TOUR, shape: true,
  onResult(R){ if(M1.tab==='drv'){ if(!M1.edit && !M1.drag){ const f = $('#m1dfig'); if(f) f.innerHTML = m1DrvFig(R); } else { const f = $('#m1dfig'); if(f && M1.drag) f.innerHTML = m1DrvFig(R); }
      const sg = $('#m1segs'); if(sg) sg.innerHTML = m1SegTable(R.drv && R.drv[M1.drv]); const ds = $('#m1dsum'), DD = R.drv && R.drv[M1.drv]; if(ds && DD) ds.textContent = wbFmt(DD.m, 1); const he = $('#m1dhest'); if(he && DD){ he.hidden = !DD.segSet; he.textContent = m1HestTxt(DD); } }
    else if(M1.tab==='mass'){ const a = document.activeElement; if(!M1.pick && !M1.mv && !(a && a.closest && a.closest('#wbext') && a.matches('input, select'))){ const b = $('#m1body'); if(b) b.innerHTML = m1MassHTML(); } } },
  verifyBase:{items:[], drv:{d1:M1DDEF(), d2:M1DDEF(), d3:M1DDEF()}, dsel:'d1'},
  code:`// ================================================================
// 도구 1 질량 · 무게중심 계산기 — 계산 코드
// ================================================================
// 입력 I : L · tf · tr [mm]
//   items = 어셈블리 [{m [kg], x, y, z [mm], cat, mh, to}]
//           cat: s 현가상 · uf 현가하 앞 · ur 현가하 뒤,  mh = 걸침 항목 질량 합 [kg],  to = 현가상일 때 절반이 갈 현가하
//   drv   = {d1, d2, d3} 드라이버 모델 입력 (키 cm, 장비 gear = 헬멧 · 드라이버 복 · 안전벨트 kg),  dsel = 고른 드라이버
// 좌표 : x = 뒤 차축 중심에서 앞으로 +, y = 차 중심선에서 왼쪽 +, z = 지면에서 위로 + [mm] (ISO 8855 방향, 원점 = 뒤 차축 중심 · 지면)
//   드라이버 자세는 안에서 '앞 차축에서 뒤로 +' 좌표(xd = L − x)로 계산하고, 체절 무게중심만 다시 x 로 돌려 줌


// ---------------------------------------------------------------- 체절 표
// de Leva 1996 (Zatsiorsky-Seluyanov 보정값): [평균 체형 길이 mm, 체중 대비 질량 비율, 무게중심 위치 = 시작점에서 비율]
//   시작점: 머리 · 목 = 정수리 (정수리 ~ 경추 7번, 그중 머리 = 정수리 ~ 아래턱 각 hd, 나머지 = 목),
//           몸통 = 경추 7번 ~ 엉덩이 관절 가운데 (CERV–MIDH), 팔다리 = 몸 쪽 관절,
//           정강이 = 무릎 관절 ~ 바깥 복사뼈 (KJC–LMAL, 발목 점 = 복사뼈와 같게), 손 = 손목 ~ 셋째 손허리뼈 머리, 발 = 뒤꿈치 ~ 발끝 (de Leva 1996 표 4)
const SEGT = {
  m: { st: 1741, hd: 203.3,
       head: [242.9, .0694, .5002], trunk: [603.3, .4346, .5138], uarm: [281.7, .0271, .5772], farm: [268.9, .0162, .4574],
       hand: [86.2, .0061, .7900], thigh: [422.2, .1416, .4095], shank: [434.0, .0433, .4459], foot: [258.1, .0137, .4415] },
  f: { st: 1735, hd: 200.2,
       head: [243.7, .0668, .4841], trunk: [614.8, .4257, .4964], uarm: [275.1, .0255, .5754], farm: [264.3, .0138, .4559],
       hand: [78.0, .0056, .7474], thigh: [368.5, .1478, .3612], shank: [432.3, .0481, .4416], foot: [228.3, .0129, .4014] } };


// ---------------------------------------------------------------- 2차원 벡터 [mm]
const add  = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub  = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul  = (a, k) => [a[0] * k, a[1] * k];
const len  = a => Math.hypot(a[0], a[1]);
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));

// 두 마디 팔 · 다리: A 에서 B 까지 길이 l1, l2.  up = 관절이 위로(무릎) / 아래로(팔꿈치)
function twoLink(A, B, l1, l2, up, warn, what) {
  const d = sub(B, A), r = len(d), ph = Math.atan2(d[1], d[0]);
  if (r >= l1 + l2) {
    warn.push(what + '에 닿지 않음 (' + Math.round(r - l1 - l2) + ' mm 모자람)');
    return [add(A, mul(d, l1 / r)), add(A, mul(d, (l1 + l2) / r))];
  }
  if (r <= Math.abs(l1 - l2)) warn.push(what + '이 너무 가까움');
  const a  = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + r * r - l2 * l2) / (2 * l1 * r))));   // 코사인 법칙
  const J1 = add(A, [l1 * Math.cos(ph + a), l1 * Math.sin(ph + a)]);
  const J2 = add(A, [l1 * Math.cos(ph - a), l1 * Math.sin(ph - a)]);
  return [(J1[1] > J2[1]) === up ? J1 : J2, B];
}


// ================================================================ 드라이버 모델 (옆에서 본 2차원, 앞 차축에서 뒤로 + 좌표)
function driver(d, Lw) {
  const TB = SEGT[d.sex === 'f' ? 'f' : 'm'];
  const k  = d.height * 10 / TB.st;                 // 키 비율 (입력 키 ÷ 표 키)
  const th = d.back * Math.PI / 180;                // 등받이 각도 [rad]
  const warn = [];

  // ---------- 체절 길이 [mm]: 직접 넣은 값이 있으면 그것, 없으면 표 × 키 비율
  const L0 = s => s === 'head' ? TB.hd * k : s === 'neck' ? (TB.head[0] - TB.hd) * k : TB[s][0] * k;
  const L  = s => (d.seg && d.seg[s] > 0) ? d.seg[s] : L0(s);
  const LHN = L('head') + L('neck');                // 머리 · 목 체절 길이 (정수리 ~ 경추 7번)

  // ---------- 체절 질량 비율 (합을 1로 맞춤: 반올림 차이)
  const fsum = ['head', 'trunk'].reduce((a, s) => a + TB[s][1], 0)
             + 2 * ['uarm', 'farm', 'hand', 'thigh', 'shank', 'foot'].reduce((a, s) => a + TB[s][1], 0);
  const frac = s => TB[s][1] / fsum;

  // ---------- 관절 위치
  const H  = [Lw - d.hip.x, d.hip.z];                                        // 엉덩이 관절
  const S  = add(H, [L('trunk') * Math.sin(th), L('trunk') * Math.cos(th)]); // 경추 7번: 등받이를 따라 뒤로 누움
  const Sh = lerp(S, H, .15);                                                // 어깨 관절: 경추 7번에서 몸통 길이 15 % 아래 (근사)

  // 목 · 머리: 어깨 위 경추 7번 높이(B)를 축으로 한 덩어리로 기울임. neck = 수직에서 뒤로 젖힌 각도 [°] (앞으로 숙이면 −)
  const na = (isFinite(d.neck) ? d.neck : 0) * Math.PI / 180;
  const nu = [Math.sin(na), Math.cos(na)];
  const B  = [Sh[0], S[1]];
  const N  = add(B, mul(nu, L('neck')));                                     // 목 위끝
  const V  = add(B, mul(nu, L('neck') + L('head')));                         // 정수리
  const HC = add(B, mul(nu, L('neck') + L('head') / 2));                     // 머리 가운데 (그림의 헬멧 중심)

  const [E, Wr] = twoLink(Sh, [Lw - d.sw.x, d.sw.z], L('uarm'), L('farm'), false, warn, '핸들');    // 팔꿈치 · 손목
  const [K, A]  = twoLink(H, [Lw - d.pedal.x, d.pedal.z], L('thigh'), L('shank'), true, warn, '페달'); // 무릎 · 발목

  // ---------- 발: 뒤꿈치가 직각인 사다리꼴. 페달 점 = 발목(복사뼈) 중심, 발바닥은 수직에서 foot° 앞으로 누워 페달에 닿음
  //   발 안에서 발목: 발바닥에서 높이 0.039 H, 발 길이 0.152 H (Drillis · Contini 1966, Winter 2009 그림 4.1) → 발 길이의 0.257배
  //   뒤꿈치 뒤에서 발목까지(발바닥 방향) = 발 길이의 0.22배 (근사)
  const fa = (isFinite(d.foot) ? d.foot : 20) * Math.PI / 180;
  const fd = [-Math.sin(fa), Math.cos(fa)];       // 발끝 방향 (발바닥을 따라)
  const fu = [Math.cos(fa), Math.sin(fa)];        // 발바닥에서 발등 쪽
  const Lf = L('foot'), ah = Lf * .039 / .152, ax = .22 * Lf;
  const B0 = sub(sub(A, mul(fd, ax)), mul(fu, ah));   // 뒤꿈치 바닥
  const T0 = add(B0, mul(fd, Lf));                    // 발끝 바닥
  const T1 = add(T0, mul(fu, .45 * ah));              // 발끝 위
  const B1 = add(B0, mul(fu, 1.5 * ah));              // 뒤꿈치 위
  const Hl = lerp(B0, B1, .5);                        // 뒤꿈치 (발 체절 시작점)
  const hu = mul(sub(Wr, E), 1 / len(sub(Wr, E)));    // 손 방향 (하완을 따라)

  // ---------- 체절 무게중심 · 질량 [kg] (드라이버 복은 몸무게처럼 비율로 나눔, 헬멧 · 벨트는 머리 · 몸통에)
  const g = d.gear || {}, suit = +g.suit || 0;
  const segs = [
    ['머리 · 목', 'head',  sub(V, mul(nu, TB.head[2] * LHN)),           1, +g.helmet || 0],
    ['몸통',      'trunk', lerp(S, H, TB.trunk[2]),                     1, +g.belt || 0],
    ['상완 ×2',   'uarm',  lerp(Sh, E, TB.uarm[2]),                     2, 0],
    ['하완 ×2',   'farm',  lerp(E, Wr, TB.farm[2]),                     2, 0],
    ['손 ×2',     'hand',  add(Wr, mul(hu, TB.hand[2] * L('hand'))),    2, 0],
    ['허벅지 ×2', 'thigh', lerp(H, K, TB.thigh[2]),                     2, 0],
    ['정강이 ×2', 'shank', lerp(K, A, TB.shank[2]),                     2, 0],
    ['발 ×2',     'foot',  add(Hl, mul(fd, TB.foot[2] * Lf)),           2, 0],
  ].map(([n, s, c, q, ex]) => ({ n, m: (d.mass + suit) * frac(s) * q + ex, x: Lw - c[0], z: c[1] }));

  // ---------- 드라이버 전체 질량 [kg] · 무게중심 [x, z mm]
  const m = segs.reduce((a, s) => a + s.m, 0);
  const model = m > 0 ? [segs.reduce((a, s) => a + s.m * s.x, 0) / m, segs.reduce((a, s) => a + s.m * s.z, 0) / m] : [0, 0];

  const lens = {}, lensDef = {};
  for (const s of ['head', 'neck', 'trunk', 'uarm', 'farm', 'hand', 'thigh', 'shank', 'foot']) { lens[s] = L(s); lensDef[s] = L0(s); }
  if (d.helm > 0 && d.helm < L('head')) warn.push('헬멧 바깥 지름이 머리 길이보다 작음');

  // ---------- 체절 길이로 본 키 [cm]: 표 키 × (세로 체절 합 ÷ 표 체절 합). 기본값이면 입력한 키와 같음
  const VS = ['head', 'neck', 'trunk', 'thigh', 'shank'];
  const hEst = VS.reduce((a, s) => a + L(s), 0) / (TB.head[0] + TB.trunk[0] + TB.thigh[0] + TB.shank[0]) * TB.st / 10;
  const segSet = VS.some(s => d.seg && d.seg[s] > 0);

  return { m, model, cg: model, hEst, segSet, back: th, warn, segs, len: lens, lenDef: lensDef,
    j: { H, S, V, N, Sh, HC, na, E, W: Wr, K, A, F: [B0, T0, T1, B1], P: [Lw - d.pedal.x, d.pedal.z], G: [Lw - d.sw.x, d.sw.z] } };   // j: 그림 좌표
}


// ================================================================ 계산
function calc(I) {
  const sum = (arr, f) => arr.reduce((a, it) => a + f(it), 0);

  // ---------- 드라이버: 고른 드라이버를 중심선 위 점질량 하나로 (좌우 대칭)
  const drv = {};
  for (const k in I.drv) drv[k] = driver(I.drv[k], I.L);
  const D  = drv[I.dsel] || drv.d1, me = D.m > 0 ? D.m : 0;
  const di = { m: me, x: D.cg[0], y: 0, z: D.cg[1], cat: 'd', name: '드라이버' };

  // ---------- 걸침(½): 어셈블리 안에서 체크한 항목 질량 mh 의 절반을 반대쪽 범주로 (좌표는 어셈블리 한 점)
  const items = [];
  I.items.forEach(it => {
    const h = it.mh > 0 ? it.mh / 2 : 0;
    if (!h) { items.push(it); return; }
    const other = it.cat === 's' ? (it.to === 'uf' || it.to === 'ur' ? it.to : (it.x > I.L / 2 ? 'uf' : 'ur')) : 's';
    items.push({ ...it, m: it.m - h }, { ...it, m: h, cat: other });
  });
  const all = items.concat(me > 0 ? [di] : []);

  // ---------- 전체 질량 [kg] · 무게중심 [mm]
  const m = sum(all, it => it.m);
  if (!(m > 0)) return { out: { m: 0 }, drv, drvItem: di };
  const xc = sum(all, it => it.m * it.x) / m;
  const yc = sum(all, it => it.m * it.y) / m;
  const zc = sum(all, it => it.m * it.z) / m;

  // ---------- 현가상 · 현가하 [kg]
  const sp  = all.filter(it => it.cat === 's' || it.cat === 'd'), ms = sum(sp, it => it.m);
  const muf = sum(all.filter(it => it.cat === 'uf'), it => it.m);
  const mur = sum(all.filter(it => it.cat === 'ur'), it => it.m);

  // ---------- 하중 배분 · 코너웨이트 [kg]
  const fr = xc / I.L * 100;                        // 앞 하중 배분 [%] = CG 의 뒤 차축에서 거리 ÷ 휠베이스
  const Wf = m * fr / 100, Wr = m - Wf;
  const cw = { fl: Wf * (.5 + yc / I.tf), fr: Wf * (.5 - yc / I.tf), rl: Wr * (.5 + yc / I.tr), rr: Wr * (.5 - yc / I.tr) };

  // ---------- 공차 상태 (드라이버 빼고): 같은 식으로 코너웨이트
  const m0 = sum(items, it => it.m);
  const x0 = m0 > 0 ? sum(items, it => it.m * it.x) / m0 : NaN;
  const y0 = m0 > 0 ? sum(items, it => it.m * it.y) / m0 : NaN;
  const Wf0 = m0 * x0 / I.L, Wr0 = m0 - Wf0;
  const cw0 = { fl: Wf0 * (.5 + y0 / I.tf), fr: Wf0 * (.5 - y0 / I.tf), rl: Wr0 * (.5 + y0 / I.tr), rr: Wr0 * (.5 - y0 / I.tr) };

  // ---------- 관성 모멘트 [kg·m²]: CG 둘레 = 평행축 (점질량 m d²) + 어셈블리 자체 (크기 lx · ly · lz 를 넣으면 고른 직육면체 m (b² + c²) ÷ 12, 비우면 0)
  const I2 = (f, g) => sum(all, it => it.m * (f(it) + g(it) / 12)) / 1e6;
  const sq = v => (+v || 0) ** 2;

  return {
    out: {
      m, fr, left: (cw.fl + cw.rl) / m * 100, h: zc, x_cg: xc, y_cg: yc,
      m_s: ms, h_s: ms > 0 ? sum(sp, it => it.m * it.z) / ms : NaN, x_s: ms > 0 ? sum(sp, it => it.m * it.x) / ms : NaN,
      m_us_f: muf / 2, m_us_r: mur / 2, m_drv: me, h_est: D.hEst, m_empty: m0,
      cw0_fl: cw0.fl, cw0_fr: cw0.fr, cw0_rl: cw0.rl, cw0_rr: cw0.rr, cross0: m0 > 0 ? (cw0.fr + cw0.rl) / m0 * 100 : NaN,
      ixx: I2(it => (it.y - yc) ** 2 + (it.z - zc) ** 2, it => sq(it.ly) + sq(it.lz)),
      iyy: I2(it => (it.x - xc) ** 2 + (it.z - zc) ** 2, it => sq(it.lx) + sq(it.lz)),
      izz: I2(it => (it.x - xc) ** 2 + (it.y - yc) ** 2, it => sq(it.lx) + sq(it.ly)),
      cw_fl: cw.fl, cw_fr: cw.fr, cw_rl: cw.rl, cw_rr: cw.rr, cross: (cw.fr + cw.rl) / m * 100,
    },
    drv, drvItem: di,
  };
}
`,
  verify:[
    {n:'어셈블리 하나', I:{L:1600, tf:1200, tr:1200, items:[{m:100, x:400, y:0, z:300, cat:'s'}], drv:{d1:{...M1DDEF(), mass:0}}}, expect:{m:100, fr:25, left:50, h:300, m_s:100}, src:'뒤 차축에서 400 ÷ 1600 = 25 %'},
    {n:'어셈블리 자체 관성 · 고른 직육면체 1000 × 600 × 300 mm, 100 kg (CG 자리)', I:{L:1600, tf:1200, tr:1200, items:[{m:100, x:800, y:0, z:300, lx:1000, ly:600, lz:300, cat:'s'}], drv:{d1:{...M1DDEF(), mass:0}}}, expect:{ixx:3.75, iyy:9.083333, izz:11.333333}, src:'Ixx = 100 × (0.6² + 0.3²) ÷ 12 = 3.75, Iyy = 100 × (1² + 0.3²) ÷ 12 = 9.0833, Izz = 100 × (1² + 0.6²) ÷ 12 = 11.3333 kg·m² (평행축 몫 0)'},
    {n:'좌우 대칭 두 어셈블리', I:{L:1600, tf:1200, tr:1200, items:[{m:50, x:800, y:300, z:300, cat:'s'}, {m:50, x:800, y:-300, z:300, cat:'s'}], drv:{d1:{...M1DDEF(), mass:0}}}, expect:{left:50, fr:50, ixx:9, izz:9, iyy:0}, src:'Ixx = 2 × 50 × 0.3² = 9 kg·m²'},
    {n:'왼쪽으로 60 mm', I:{L:1600, tf:1200, tr:1200, items:[{m:100, x:800, y:60, z:300, cat:'s'}], drv:{d1:{...M1DDEF(), mass:0}}}, expect:{left:55, cw_fl:27.5, cw_rr:22.5, cross:50}, src:'50 + 60 ÷ 1200 × 100 = 55 %'},
    {n:'현가하 앞뒤', I:{L:1600, tf:1200, tr:1200, items:[{m:30, x:1600, y:0, z:230, cat:'uf'}, {m:34, x:0, y:0, z:230, cat:'ur'}, {m:100, x:800, y:0, z:300, cat:'s'}], drv:{d1:{...M1DDEF(), mass:0}}}, expect:{m_us_f:15, m_us_r:17, m_s:100, h_s:300}, src:'바퀴 하나 = 축 합 ÷ 2'},
    {n:'체절 질량 합 = 몸무게 (남)', I:{L:1600, tf:1200, tr:1200, items:[], drv:{d1:{...M1DDEF(), mass:70}}}, expect:{m_drv:70}, src:'체절 비율 합 = 1 (de Leva 1996)'},
    {n:'체절 질량 합 = 몸무게 (여)', I:{L:1600, tf:1200, tr:1200, items:[], drv:{d1:{...M1DDEF(), sex:'f', height:165, mass:58}}}, expect:{m_drv:58}, src:'비율 합 0.9999 → 1로 맞춤'},
    {n:'추정 키 = 입력 키 (기본 체절)', I:{L:1600, tf:1200, tr:1200, items:[], drv:{d1:{...M1DDEF(), height:182}}}, expect:{h_est:182}, src:'체절 길이가 모두 키 비율이면 같음'},
    {n:'공차 = 드라이버 빼고', I:{L:1600, tf:1200, tr:1200, items:[{m:100, x:800, y:60, z:300, cat:'s'}], drv:{d1:{...M1DDEF(), mass:70}}}, expect:{m_empty:100, cw0_fl:27.5, cw0_rr:22.5, cross0:50}, src:'드라이버 없이 왼쪽으로 60 mm 경우와 같음'},
    {n:'걸침: 현가하 카드', I:{L:1600, tf:1200, tr:1200, items:[{m:10, mh:4, x:1600, y:500, z:250, cat:'uf'}, {m:100, x:800, y:0, z:300, cat:'s'}], drv:{d1:{...M1DDEF(), mass:0}}}, expect:{m:110, m_s:102, m_us_f:4}, src:'4 ÷ 2 = 2 kg 가 현가상으로 → 현가하 앞 8 kg, 바퀴 하나 4'},
    {n:'걸침: 현가상 카드 → 가까운 뒤', I:{L:1600, tf:1200, tr:1200, items:[{m:20, mh:4, to:'ur', x:100, y:0, z:250, cat:'s'}, {m:10, x:0, y:500, z:250, cat:'ur'}], drv:{d1:{...M1DDEF(), mass:0}}}, expect:{m_s:18, m_us_r:6}, src:'4 ÷ 2 = 2 kg 가 뒤 현가하로 → (10 + 2) ÷ 2'},
    {n:'목 각도: 질량 그대로', I:{L:1600, tf:1200, tr:1200, items:[], drv:{d1:{...M1DDEF(), mass:70, neck:-30}}}, expect:{m_drv:70}, src:'머리 · 목을 기울여도 체절 질량 합 = 몸무게'},
    {n:'장비 더하기', I:{L:1600, tf:1200, tr:1200, items:[], drv:{d1:{...M1DDEF(), mass:70, gear:{helmet:1.5, suit:2, belt:1}}}}, expect:{m_drv:74.5}, src:'70 + 1.5 + 2 + 1'}
  ]
};
