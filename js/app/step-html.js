function actHTML(id, compact){
  const a = ACT[id]; if(!a) return '';
  const ch = (arr, cls) => arr.map(t=>`<span class="vchip ${cls}">${t}</span>`).join('');
  const rows = [];
  if(a[2].length) rows.push(`<span class="vlab dec">팀 결정값</span>${ch(a[2],'dec')}`);
  if(a[3].length) rows.push(`<span class="vlab calc">계산값</span>${ch(a[3],'calc')}`);
  if(a[4].length) rows.push(`<span class="vlab con">제약</span>${ch(a[4],'con')}`);
  return `<div class="actbox${compact?' compact':''}"><b class="tag">핵심</b>${a[1]}${a[5]?' '+V:''}</div>${rows.length?`<div class="vrow">${rows.map(r=>`<div class="vline">${r}</div>`).join('')}</div>`:''}`;
}

/* ============================================================
   렌더: 단계
   ============================================================ */
function stepHTML(s){
  const order = PARTS.map(p=>p[0]);
  const items = ITEMS.filter(i=>i.s===s.id).sort((a,b)=>((ACT[a.id]||[99])[0])-((ACT[b.id]||[99])[0]));
  const parts = [...new Set(items.map(i=>i.p))];
  const ncard = items.filter(i=>i.c).length;
  const ids = new Set(items.map(i=>i.id)); const inc=[], out=[];
  EDGES.forEach(e=>{ if(ids.has(e[1]) && !ids.has(e[0])) inc.push(e); if(ids.has(e[0]) && !ids.has(e[1])) out.push(e); });
  const exl = (arr, side) => arr.map(e=>{ const o = IT[side==='in'?e[0]:e[1]], me = IT[side==='in'?e[1]:e[0]];
    return `<li><b>${o.s}</b> <button class="lnk" data-goto="${o.id}">${o.n}</button> <span class="muted">(${o.p})</span> ${side==='in'?'→':'←'} ${me.n} <span class="muted">— ${e[2]}</span></li>`; }).join('');
  const itemHTML = items.map(i=>`<details class="item" id="it-${i.id}" data-item="${i.id}"><summary>
      <span class="iname">${i.n}</span>${chip(i.p)}${i.c?'<span class="badge b-card">상세</span>':''}${CHIP[i.id]?`<span class="ptchip" title="이 항목을 마치면 확정되는 것 · 좌표: ISO 8855 (파트 패널 아래 좌표계·거동 참고)${PART_OF[i.id]?' · 쓰이는 부품: '+PART_OF[i.id].join(', '):''}">${chipTxt(CHIP[i.id])}</span>`:''}
      <span class="sright"><span class="ipill" data-id="${i.id}" hidden></span>${stCtl(i.id)}<button class="btn gbtn" data-graph="${i.id}">연결도</button></span></summary>
      <div class="dbody"><div class="st-edit" data-id="${i.id}" hidden><span class="sec-label">진행 상태</span>${stCtl(i.id)}</div>${goalHTML(i.id)}${actHTML(i.id)}${tvHTML(i.id)}
      ${i.c?renderCard(i.c):'<p class="muted" style="font-size:14px">상세 카드는 대화를 이어가며 추가합니다.</p>'}</div></details>`).join('');
  return `<details class="step${s.fz?' fz':''}" id="st-${s.id}" data-step="${s.id}"><summary>
    <span class="scode">${s.fz?'★ ':''}${s.id}</span><span class="stitle">${s.t.replace('★ ','')}</span>
    <span class="ssub">항목 ${items.length}${ncard?` · 상세 ${ncard}`:''}</span><span class="scount" data-step="${s.id}"></span>
    <span class="sright"><span class="pdots">${parts.map(p=>`<span class="pdot" title="${p}" style="background:${pc(p)}"></span>`).join('')}</span></span></summary>
    <div class="dbody"><p>${s.w}</p>
      <div class="sec-label">설계 항목</div><div class="stack">${itemHTML}</div></div></details>`;
}
