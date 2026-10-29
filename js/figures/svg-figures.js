/* ============================================================
   FS 부품 그림 (v4)
   ============================================================ */
const FIG = {};
const ANIM = {};   /* 움직이는 그림: ANIM[이름] = {dyn(u, 마커 id), note} — js/figures/fig-anim.js가 재생 */
const escA = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function texFallback(t){ return t.replace(/\\sqrt\{([^}]*)\}/g,'√($1)').replace(/\\pi\b/g,'π').replace(/\\mu\b/g,'μ').replace(/\\omega\b/g,'ω').replace(/\\theta\b/g,'θ').replace(/\\psi\b/g,'ψ').replace(/\\kappa\b/g,'κ').replace(/\\beta\b/g,'β').replace(/\\lambda\b/g,'λ').replace(/\\le\b|\\leq\b/g,'≤').replace(/\\ge\b|\\geq\b/g,'≥').replace(/\\pm/g,'±').replace(/\^\{([^}]*)\}/g,'^($1)').replace(/\\text\{([^}]*)\}/g,'$1').replace(/\\mathrm\{([^}]*)\}/g,'$1')
  .replace(/\\sigma/g,'σ').replace(/\\nu/g,'ν').replace(/\\delta/g,'δ').replace(/\\Delta/g,'Δ').replace(/\\phi/g,'φ').replace(/\\alpha/g,'α').replace(/\\gamma/g,'γ')
  .replace(/\\approx/g,'≈').replace(/\\cdot/g,'·').replace(/\\times/g,'×').replace(/\\rightarrow/g,'→').replace(/\\tan/g,'tan').replace(/\\arctan/g,'arctan')
  .replace(/\\dfrac\{([^}]*)\}\{([^}]*)\}/g,'($1)/($2)').replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g,'($1)/($2)').replace(/\\,|\\;|\\quad|\\ /g,' ').replace(/\\[a-zA-Z]+/g,'').replace(/[{}]/g,''); }
/* 수식 라벨: MathJax 준비 후 SVG 수식으로 교체 */
function M(tex,x,y,anchor,cls,size){ return `<text class="mjt ${cls||''}" x="${x}" y="${y}" text-anchor="${anchor||'start'}" data-tex="${escA(tex)}" data-size="${size||14}">${escA(texFallback(tex))}</text>`; }
function lab(x,y,s,anchor,cls){ return s.startsWith('$') ? M(s.slice(1),x,y,anchor,cls) : `<text x="${x}" y="${y}" text-anchor="${anchor||'start'}" class="${cls||''}">${s}</text>`; }
function dimH(m,x1,x2,y,label,ly,cls){ return `<line class="ext" x1="${x1}" y1="${y-8}" x2="${x1}" y2="${y+6}"/><line class="ext" x1="${x2}" y1="${y-8}" x2="${x2}" y2="${y+6}"/><line class="dim" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-start="url(#${m}t)" marker-end="url(#${m}t)"/>${lab((x1+x2)/2,ly,label,'middle',cls||'ti')}`; }
function dimV(m,x,y1,y2,label,lx,anchor){ return `<line class="ext" x1="${x-6}" y1="${y1}" x2="${x+6}" y2="${y1}"/><line class="ext" x1="${x-6}" y1="${y2}" x2="${x+6}" y2="${y2}"/><line class="dim" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" marker-start="url(#${m}t)" marker-end="url(#${m}t)"/>${lab(lx,(y1+y2)/2+5,label,anchor||'start','ti')}`; }
function lead(x1,y1,x2,y2,t,anchor){ return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="leader"/>${lab(x2+(anchor==='end'?-4:4),y2+4,t,anchor)}`; }
function markers(){ const id='m'+(++MK); return {id, defs:`<defs>
  <marker id="${id}a" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" style="fill:var(--accent)"/></marker>
  <marker id="${id}i" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" style="fill:var(--in)"/></marker>
  <marker id="${id}k" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" style="fill:var(--ink-2)"/></marker>
  <marker id="${id}t" viewBox="0 0 10 10" refX="9.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 2L10 5L0 8z" style="fill:var(--in)"/></marker></defs>`}; }
/* 스페이스 프레임 요소 */
const tubeSec = (x,y,r) => `<circle cx="${x}" cy="${y}" r="${r||12}" class="tubeo"/><circle cx="${x}" cy="${y}" r="${(r||12)-3.2}" class="tubei"/>`;
const tubeLen = (x1,y1,x2,y2,w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tubeLo" style="stroke-width:${(w||12)+3}"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tubeLi" style="stroke-width:${w||12}"/>`;
function tab(tx,ty,hx,hy,w){ const dx=hx-tx, dy=hy-ty, L=Math.hypot(dx,dy), nx=-dy/L*(w||8), ny=dx/L*(w||8);
  return `<polygon class="tabp" points="${tx+nx*1.3},${ty+ny*1.3} ${hx+nx},${hy+ny} ${hx-nx},${hy-ny} ${tx-nx*1.3},${ty-ny*1.3}"/><circle cx="${hx}" cy="${hy}" r="2.4" class="pi"/>`; }
const rodEnd = (x,y) => `<circle cx="${x}" cy="${y}" r="6.5" class="rodend"/><circle cx="${x}" cy="${y}" r="2.4" class="pi"/>`;
function co(n,bx,by,pts){ return (pts||[]).map(([px,py])=>`<line x1="${px}" y1="${py}" x2="${bx}" y2="${by}" class="coline"/>`).join('') + `<circle cx="${bx}" cy="${by}" r="10" class="cob"/><text x="${bx}" y="${by+4.3}" text-anchor="middle" class="cot">${n}</text>`; }
function ground(x1,x2,y){ let h=`<line class="gnd" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`; for(let x=x1+6;x<x2;x+=12) h+=`<line class="hatch" x1="${x}" y1="${y}" x2="${x-8}" y2="${y+8}"/>`; return h; }
function spring(x1,x2,y,amp,n){ let d=`M${x1} ${y}`; const s=(x2-x1)/n; for(let i=0;i<n;i++){ d+=` L${x1+s*(i+.5)} ${y+(i%2?amp:-amp)}`; } d+=` L${x2} ${y}`; return `<path class="spring" d="${d}"/>`; }
const legend = arr => `<span class="legend-fig">${arr.map(([n,t])=>`<span><b>${n}</b> ${t}</span>`).join('')}</span>`;

/* ---------- 코너 어셈블리 (우측 앞바퀴, 정면 단면, 차량 중심은 왼쪽) ----------
   좌표: 1 px ≈ 2 mm, 지면 y=350, 휠 중심면 x=400, 휠 중심 높이 y=220
   위 볼조인트 U(352,170), 아래 볼조인트 L(370,272) → KPI 10°, 스크럽 +16 px(≈32 mm), d_l 30 px, z_l 78 px */
const CORNER_LEG = [['①','타이어(단면)'],['②','림 배럴·플랜지'],['③','휠 센터(장착면)'],['④','허브·허브 플랜지'],['⑤','브레이크 디스크'],['⑥','캘리퍼'],['⑦','업라이트'],['⑧','아웃보드 하드포인트(볼조인트)'],['⑨','상부 위시본'],['⑩','하부 위시본'],['⑪','로드엔드 = 인보드 하드포인트'],['⑫','브래킷(탭)'],['⑬','프레임 튜브(스페이스 프레임)'],['⑭','푸시로드'],['⑮','로커'],['⑯','댐퍼·스프링']];
FIG.corner = (o) => { o = Object.assign({frame:true, zone:false, dims:'rs', axis2:false, ghost:false, vb:'0 0 600 420', callouts:true}, o||{}); const m = markers();
  const U=[352,170], L=[370,272], kpiT=0.1763;
  const gx = L[0] + (350-L[1])*kpiT;                       // 축 지면점
  const topx = L[0] - (272-96)*kpiT;
  let h = `<svg viewBox="${o.vb}" aria-label="정면 코너 어셈블리">${m.defs}`;
  if(o.frame){
    h += tubeLen(150,146,150,292) + tubeLen(150,146,66,82) + tubeLen(150,292,66,320) + tubeLen(66,82,66,320,10);
    h += tubeSec(150,146) + tubeSec(150,292) + tubeSec(66,82,10) + tubeSec(66,320,10);
    h += tab(158,146,178,150) + tab(158,292,172,288) + tab(156,138,196,116,7) + tab(72,82,84,82,6);
  }
  // 타이어 단면
  const tf = o.ghost ? 'tiresec ghost' : 'tiresec';
  h += `<path class="${tf}" d="M352 157 L352 114 Q352 90 376 90 L424 90 Q448 90 448 114 L448 157 Z"/><path class="${tf}" d="M352 283 L352 326 Q352 350 376 350 L424 350 Q448 350 448 326 L448 283 Z"/>`;
  if(!o.ghost) h += [376,392,408,424].map(x=>`<line x1="${x}" y1="91" x2="${x}" y2="97" class="groove"/><line x1="${x}" y1="343" x2="${x}" y2="349" class="groove"/>`).join('');
  // 림
  h += `<rect class="rimf" x="356" y="153" width="88" height="6"/><rect class="rimf" x="356" y="281" width="88" height="6"/>
    <rect class="rimf" x="352" y="143" width="5" height="16" rx="1.5"/><rect class="rimf" x="443" y="143" width="5" height="16" rx="1.5"/>
    <rect class="rimf" x="352" y="281" width="5" height="16" rx="1.5"/><rect class="rimf" x="443" y="281" width="5" height="16" rx="1.5"/>
    <rect class="rimf" x="413" y="159" width="6" height="40"/><rect class="rimf" x="413" y="241" width="6" height="40"/>
    <rect class="rimf" x="413" y="199" width="6" height="42" style="opacity:.55"/>`;
  h += `<line class="ref" x1="400" y1="70" x2="400" y2="350"/>`;
  // 허브·디스크·캘리퍼
  h += `<rect class="alud" x="372" y="209" width="35" height="22" rx="2"/>
    <rect class="alu" x="407" y="194" width="6" height="52"/>
    <rect class="lug" x="419" y="203" width="6" height="7"/><rect class="lug" x="419" y="230" width="6" height="7"/>
    <rect class="dsc" x="401" y="172" width="5" height="96"/>
    <rect class="brk" x="392" y="164" width="19" height="27" rx="3"/>`;
  // 업라이트
  h += `<polygon class="alu" points="344,160 362,160 368,180 376,198 395,198 395,242 381,242 378,262 381,284 360,284 356,262 350,230 346,200"/>
    <rect x="376" y="203" width="19" height="34" class="bearing"/>`;
  if(o.zone){
    h += `<rect class="zone" x="340" y="160" width="49" height="24" rx="3"/><rect class="zone" x="355" y="252" width="38" height="27" rx="3"/>`;
  }
  // 위시본
  if(o.frame){
    h += `<line class="arm" x1="178" y1="150" x2="352" y2="170"/><line class="arm" x1="172" y1="288" x2="370" y2="272"/>`;
    h += rodEnd(178,150) + rodEnd(172,288);
    // 푸시로드·로커·댐퍼
    h += `<line class="rod" x1="340" y1="274" x2="214" y2="100"/>
      <polygon class="alu" points="214,100 196,116 198,82"/><circle cx="196" cy="116" r="4" class="pi"/>
      <line x1="198" y1="82" x2="140" y2="82" class="shaft"/>${spring(92,192,82,9,10)}<rect class="dampb" x="86" y="75" width="54" height="14" rx="3"/>${rodEnd(84,82)}`;
  } else {
    h += `<line class="arm" x1="292" y1="163" x2="352" y2="170"/><line class="arm" x1="290" y1="279" x2="370" y2="272"/>`;
  }
  h += `<circle class="bj" cx="${U[0]}" cy="${U[1]}" r="6"/><circle class="bj" cx="${L[0]}" cy="${L[1]}" r="6"/>`;
  // 킹핀축
  if(o.axis2){ const g2 = L[0]+78*0.3249, t2 = L[0]-176*0.3249, u2 = L[0]-102*0.3249;
    h += `<line class="axis2" x1="${g2}" y1="350" x2="${t2}" y2="96"/><circle cx="${u2}" cy="170" r="5.5" class="bj2"/><circle cx="${g2}" cy="350" r="4.5" class="pm"/>`;
    h += M(String.raw`\sigma\ \text{큼} \rightarrow r_s\ \text{작음}`, t2-6, 92, 'end', 'tm', 13);
    h += lead(u2,170,292,128,'σ가 크면 위 볼조인트가 영역 밖','end'); }
  h += `<line class="axis" x1="${gx}" y1="350" x2="${topx}" y2="96"/>`;
  h += `<text x="${topx+6}" y="92" class="ta">킹핀축</text>`;
  h += ground(o.frame?20:260, 580, 350);
  h += `<circle cx="${gx}" cy="350" r="5" class="pa"/><circle cx="400" cy="350" r="5" class="pi"/>`;
  if(o.dims.includes('rs')) h += dimH(m.id, gx, 400, 374, '$r_s\\,(+)', 396);
  if(o.dims.includes('dz')){
    h += `<line class="ext" x1="${L[0]}" y1="${L[1]}" x2="${L[0]}" y2="312"/>` + dimH(m.id, L[0], 400, 306, '$d_l', 300);
    h += `<line class="ext" x1="${L[0]}" y1="${L[1]}" x2="318" y2="${L[1]}"/>` + dimV(m.id, 324, L[1], 350, '$z_l', 316, 'end');
  }
  if(o.zone) h += lead(355,265,300,300,'아래 볼조인트 가능 영역','end') + lead(340,172,300,214,'위 볼조인트 가능 영역','end');
  if(o.sig!==false) h += `<line class="refk" x1="352" y1="164" x2="352" y2="100"/><path class="arcKbg" d="M352 110 A60 60 0 0 0 341.6 110.9"/><path class="arcK" d="M352 110 A60 60 0 0 0 341.6 110.9"/>` + M(String.raw`\sigma`, 334, 114, 'end', 'ta', 17);
  if(o.callouts){
    h += co('①',474,100,[[440,106]]) + co('②',474,132,[[444,152]]) + co('③',474,166,[[416,178]]) + co('④',474,214,[[410,214]]) + co('⑤',474,262,[[404,258]]) + co('⑥',388,128,[[400,166]]);
    h += co('⑦',316,250,[[352,246]]) + co('⑧',314,206,[[U[0]-5,U[1]+4],[L[0]-6,L[1]-2]]);
    if(o.frame){
      h += co('⑨',262,126,[[262,160]]) + co('⑩',262,318,[[262,281]]) + co('⑪',202,176,[[180,154]]) + co('⑪',196,318,[[174,292]]) + co('⑫',112,126,[[170,146]]) + co('⑬',110,214,[[146,214]]);
      h += co('⑭',262,206,[[277,188]]) + co('⑮',236,70,[[206,98]]) + co('⑯',120,52,[[120,76]]);
    }
  }
  if(o.frame) h += `<text x="22" y="408" class="tm">← 차량 중심</text>`;
  if(o.dims.includes('rs')) h += `<text x="580" y="412" class="tm" text-anchor="end">축 지면점이 접지 중심보다 안쪽 → 양(+) 스크럽</text>`;
  return h + `</svg>`;
};
FIG.front = () => FIG.corner({});
FIG.bjzone = () => FIG.corner({frame:false, zone:true, dims:'rs dz', ghost:true, vb:'130 60 470 365', callouts:true});
FIG.bjzone2 = () => FIG.corner({frame:false, zone:true, dims:'dz', ghost:true, sig:false, vb:'130 60 470 318', callouts:true});
FIG.kpidef = () => FIG.corner({frame:false, zone:false, dims:'', vb:'130 60 470 310', callouts:true});
FIG.kpidep = () => FIG.corner({frame:false, zone:true, dims:'rs dz', ghost:true, axis2:true, vb:'90 60 510 365', callouts:false});

/* ---------- 측면도 ---------- */
/* (side: 아래 "움직이는 그림" 절로 옮김) */
const SIDE_LEG = [['①','타이어'],['②','림'],['⑦','업라이트(림 뒤)'],['⑧','아웃보드 하드포인트(볼조인트)']];

/* ---------- 위에서 본 스크럽·트레일 ---------- */
FIG.top = () => { const m = markers(); return `<svg viewBox="0 0 580 340" aria-label="위에서 본 스크럽과 트레일">${m.defs}
  <rect class="rub" x="300" y="44" width="58" height="232" rx="12"/>
  ${[314,329,344].map(x=>`<line x1="${x}" y1="50" x2="${x}" y2="270" style="stroke:#5a616a;stroke-width:2"/>`).join('')}
  <rect class="cpatch" x="303" y="132" width="52" height="56" rx="4"/>
  <rect class="alu" x="266" y="118" width="28" height="84" rx="4"/>
  <line class="rod" x1="280" y1="198" x2="258" y2="242"/>
  <line class="rod" x1="258" y1="242" x2="108" y2="246"/>
  <rect x="40" y="238" width="70" height="16" rx="3" class="dampb"/>
  ${rodEnd(258,242)}
  <circle cx="298" cy="146" r="6" class="pa"/><circle cx="329" cy="160" r="5" class="pi"/>
  <line class="force" x1="329" y1="164" x2="329" y2="232" marker-end="url(#${m.id}i)"/>
  ${M('F_x',338,228,'start','ti',15)}<text x="362" y="228" class="ti">(제동력)</text>
  <line class="force" x1="450" y1="170" x2="362" y2="170" marker-end="url(#${m.id}i)"/>
  ${M('F_y',400,160,'start','ti',15)}<text x="424" y="160" class="ti">(횡력)</text>
  <line class="ext" x1="298" y1="140" x2="298" y2="96"/><line class="ext" x1="329" y1="154" x2="329" y2="96"/>
  ${dimH(m.id,298,329,104,'$r_s',92)}
  <line class="ext" x1="304" y1="146" x2="496" y2="146"/><line class="ext" x1="362" y1="170" x2="496" y2="170"/>
  ${dimV(m.id,490,146,170,'트레일',498)}<text x="502" y="184" class="tm" style="font-size:11px">(기계적+공압)</text>
  <path class="arcA" d="M272.3 115.4 A40 40 0 0 1 335.6 132.3" marker-end="url(#${m.id}a)"/>
  ${M(String.raw`M = F_x\, r_s`,268,74,'end','ta',15)}<text x="268" y="94" class="ta" text-anchor="end">토아웃 방향</text>
  ${lead(298,146,200,168,'킹핀축 지면점','end')}
  ${lead(329,182,200,196,'접지 중심','end')}
  ${lead(272,130,200,138,'업라이트','end')}
  ${lead(269,220,200,226,'너클암','end')}
  <text x="170" y="270">타이로드</text><text x="44" y="276">랙</text>
  <path d="M540 300 V250" class="arrowk" marker-end="url(#${m.id}k)"/><text x="540" y="320" text-anchor="middle">진행 방향</text>
  <text x="20" y="30" class="tm">평면도 · 우측 앞바퀴 · 차량 중심은 왼쪽</text>
</svg>`; };

/* ---------- 스크럽 부호 3종 ---------- */
FIG.trio = () => { const m = markers(); const P = (cx, off, title, lbl) => {
  const gx = cx + off, tx = gx - 34;
  return `<path class="tiresec ghost" d="M${cx-34} 200 L${cx-34} 62 Q${cx-34} 40 ${cx-12} 40 L${cx+12} 40 Q${cx+34} 40 ${cx+34} 62 L${cx+34} 200 Z"/>
  <line class="ref" x1="${cx}" y1="30" x2="${cx}" y2="200"/>
  <line class="axis" x1="${gx}" y1="200" x2="${tx}" y2="30"/>
  <circle cx="${gx}" cy="200" r="5" class="pa"/><circle cx="${cx}" cy="200" r="4.5" class="pi"/>
  ${off!==0?dimH(m.id,Math.min(gx,cx),Math.max(gx,cx),218,'$'+lbl,242):M(lbl,cx,242,'middle','ti')}
  <text x="${cx}" y="20" text-anchor="middle" class="tb">${title}</text>`;};
  return `<svg viewBox="0 0 640 280" aria-label="스크럽 부호">${m.defs}
  ${P(110,-24,'양(+) : 지면점이 안쪽','+r_s')}${P(320,0,'0 : 접지 중심과 일치','r_s = 0')}${P(530,22,'음(−) : 지면점이 바깥쪽','-r_s')}
  ${ground(10,630,200)}
  <text x="12" y="272" class="tm">← 차량 중심 (세 그림 모두 우측 바퀴, 주황 점선 = 킹핀축)</text></svg>`; };

/* ---------- 캠버 부호 ---------- */
FIG.camber = () => { const P = (cx, a, t) => `
  <rect class="body" x="${cx-36}" y="70" width="72" height="34" rx="8"/>
  <g transform="rotate(${a} ${cx-52} 150)"><rect class="rub" x="${cx-63}" y="62" width="22" height="88" rx="6"/></g>
  <g transform="rotate(${-a} ${cx+52} 150)"><rect class="rub" x="${cx+41}" y="62" width="22" height="88" rx="6"/></g>
  <text x="${cx}" y="178" text-anchor="middle" class="tb">${t}</text>`;
  return `<svg viewBox="0 0 640 190" aria-label="캠버 부호">
  ${P(110,9,'음(−): 위가 안쪽')}${P(320,0,'0')}${P(530,-9,'양(+): 위가 바깥')}
  ${ground(10,630,150)}<text x="12" y="20" class="tm">앞에서 본 앞바퀴 한 쌍</text></svg>`; };

/* ---------- 정면 스윙암·롤센터 ---------- */
FIG.fvsa = (mode) => { const m = markers(); const rc = mode==='rc'; return `<svg viewBox="0 0 680 340" aria-label="${rc?'롤센터 작도':'정면 스윙암'}">${m.defs}
  ${tubeLen(380,160,380,236)}${tubeLen(380,160,230,140)}${tubeLen(380,236,230,226)}
  ${tubeSec(380,160)}${tubeSec(380,236)}${tubeSec(230,140,10)}${tubeSec(230,226,10)}
  ${tab(388,161,400,163.3,6)}${tab(388,235,390,232.3,6)}
  <line class="ref" x1="220" y1="40" x2="220" y2="300"/><text x="226" y="52" class="tm">차량 중심선</text>
  <path class="tiresec ghost" d="M570 270 L570 92 Q570 70 592 70 L608 70 Q630 70 630 92 L630 270 Z"/>
  <line class="ref" x1="600" y1="60" x2="600" y2="270"/>
  <polygon class="alu" points="578,115 594,115 600,170 602,238 584,238 580,170"/>
  <line class="ref2" x1="400" y1="163.3" x2="30" y2="240"/><line class="ref2" x1="390" y1="232.3" x2="30" y2="240"/>
  <line class="arm" x1="400" y1="163.3" x2="585" y2="125"/>
  <line class="arm" x1="390" y1="232.3" x2="592" y2="228"/>
  ${rodEnd(400,163.3)}${rodEnd(390,232.3)}
  <circle class="bj" cx="585" cy="125" r="6"/><circle class="bj" cx="592" cy="228" r="6"/>
  ${lead(120,221.3,100,192,'위시본 연장선','end')}
  <circle cx="30" cy="240" r="7" class="pa"/><text x="38" y="262" class="ta">IC 순간중심</text>
  ${rc ? `<line class="rcline" x1="600" y1="270" x2="30" y2="240"/>
  <circle cx="600" cy="270" r="5" class="pi"/><text x="600" y="300" text-anchor="middle" class="tm">접지 중심</text>
  <circle cx="220" cy="250" r="7" class="pa"/>${lead(220,250,170,300,'RC 롤센터','end')}` : `
  ${dimH(m.id,30,600,304,'$\\text{정면 스윙암 길이 } l',328)}
  ${dimH(m.id,220,600,84,'$t/2\\ (\\text{반 트레드})',72)}
  ${lead(400,163,430,196,'인보드 하드포인트')}<line class="leader" x1="390" y1="232.3" x2="430" y2="196"/>`}
  ${ground(10,670,270)}
  <text x="488" y="136" class="tb">상부 위시본</text><text x="470" y="252" class="tb">하부 위시본</text>
  ${lead(305,150,322,108,'프레임 튜브')}
</svg>`; };
FIG.rcfront = () => FIG.fvsa('rc');

/* ---------- 액추에이션 ---------- */
/* (act: 아래 "움직이는 그림" 절로 옮김) */

/* ---------- 애커먼 ---------- */
/* (ack: 아래 "움직이는 그림" 절로 옮김) */

/* ---------- 롤 하중 이동 ---------- */
FIG.roll = () => { const m = markers(); return `<svg viewBox="0 0 560 300" aria-label="롤과 하중 이동">${m.defs}
  <g transform="rotate(4 280 120)"><rect class="body" x="150" y="70" width="260" height="70" rx="14"/></g>
  <rect class="rub" x="120" y="120" width="40" height="110" rx="10"/><rect class="rub" x="400" y="120" width="40" height="110" rx="10"/>
  <circle cx="280" cy="112" r="7" class="pa"/><text x="268" y="104" text-anchor="end" class="ta">CG (높이 h)</text>
  <path d="M287 112 H372" class="force" marker-end="url(#${m.id}i)"/>
  <text x="300" y="134" class="ti">관성력</text>${M(String.raw`m\,a_y`,346,134,'start','ti',15)}
  <path d="M140 262 V238" class="force" marker-end="url(#${m.id}i)"/>${M(String.raw`mg/2-\Delta F`,140,284,'middle','ti',14)}
  <path d="M420 272 V238" class="force" style="stroke-width:5" marker-end="url(#${m.id}i)"/>${M(String.raw`mg/2+\Delta F`,420,284,'middle','ti',14)}
  <text x="140" y="298" text-anchor="middle" class="tm">안쪽 바퀴 (앞뒤 합)</text><text x="420" y="298" text-anchor="middle" class="tm">바깥 바퀴 (앞뒤 합)</text>
  ${ground(60,500,230)}
  ${M(String.raw`\Delta F = \dfrac{m\,a_y\,h}{t}`,20,34,'start','tb',15)}<text x="160" y="34" class="tb">— 스프링 강성과 무관</text>
  <text x="20" y="60" class="tm">강성은 이 총량을 앞축·뒤축에 나누는 비율만 바꾼다</text>
  <text x="20" y="104" class="tm">← 선회 중심 쪽 = 안쪽</text>
  <text x="540" y="34" text-anchor="end" class="tm">차체는 바깥쪽으로 기운다 →</text>
</svg>`; };

/* ============================================================
   추가 그림 (v6)
   ============================================================ */
/* 간단한 선 그래프 도우미 */
function plot(o){
  const {x0,y0,w,h,xr,yr,xt,yt,xl,yl} = o;
  const X = v => x0 + (v-xr[0])/(xr[1]-xr[0])*w, Y = v => y0 + h - (v-yr[0])/(yr[1]-yr[0])*h;
  let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" class="plotbg"/>`;
  (yt||[]).forEach(v=>{ s += `<line x1="${x0}" y1="${Y(v)}" x2="${x0+w}" y2="${Y(v)}" class="grid${v===0?' zero':''}"/><text x="${x0-6}" y="${Y(v)+4}" text-anchor="end" class="tick">${v}</text>`; });
  (xt||[]).forEach(v=>{ s += `<line x1="${X(v)}" y1="${y0+h}" x2="${X(v)}" y2="${y0+h+4}" class="axisl"/><text x="${X(v)}" y="${y0+h+17}" text-anchor="middle" class="tick">${v}</text>`; });
  s += `<line x1="${x0}" y1="${y0+h}" x2="${x0+w}" y2="${y0+h}" class="axisl"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0+h}" class="axisl"/>`;
  if(xl) s += lab(x0+w/2, y0+h+36, xl, 'middle', 'tm');
  if(yl) s += lab(x0, y0-10, yl, 'start', 'tm');
  return {s, X, Y};
}
const poly = (pts, cls, extra) => `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" class="${cls}" ${extra||''}/>`;
const rng = (a,b,st) => { const r=[]; for(let v=a; v<=b+1e-9; v+=st) r.push(+v.toFixed(4)); return r; };

/* ---------- 조향 시 캠버 변화 ---------- */
FIG.steercam = (nu=6, sg=8) => { const m = markers();
  const P = plot({x0:400,y0:40,w:250,h:220,xr:[0,30],yr:[-3,1.5],xt:[0,10,20,30],yt:[-3,-2,-1,0,1],xl:'조향각 δ [°]',yl:'바깥 바퀴 캠버 변화 Δγ [°]'});
  const d = rng(0,30,1), rad = v => v*Math.PI/180;
  const cas = d.map(v=>[P.X(v),P.Y(-nu*Math.sin(rad(v)))]), kpi = d.map(v=>[P.X(v),P.Y(sg*(1-Math.cos(rad(v))))]), tot = d.map(v=>[P.X(v),P.Y(-nu*Math.sin(rad(v))+sg*(1-Math.cos(rad(v))))]);
  const t20 = -nu*Math.sin(rad(20))+sg*(1-Math.cos(rad(20)));
  return `<svg viewBox="0 0 680 320" aria-label="조향 시 캠버 변화">${m.defs}
  <text x="20" y="24" class="tb">바깥 앞바퀴를 앞에서 본 모습</text>
  <line class="ref" x1="150" y1="60" x2="150" y2="280"/>
  <rect class="rubg2" x="125" y="100" width="50" height="180" rx="14"/>
  <g transform="rotate(-6 150 280)"><rect class="rub" x="125" y="100" width="50" height="180" rx="14" style="opacity:.92"/></g>
  <line class="axis" x1="168" y1="280" x2="138" y2="60"/>
  <path class="arcA" d="M150 120 A160 160 0 0 0 133.3 121"/>
  ${M(String.raw`\Delta\gamma`,124,112,'end','ta',15)}
  ${ground(30,300,280)}
  <text x="190" y="140">회색 = 직진(δ = 0°)</text><text x="190" y="162">검정 = 조향 20°</text>
  <text x="190" y="184" class="ta">위가 안쪽으로 → 음(−) 캠버</text>
  <path d="M110 300 H40" class="arrowk" marker-end="url(#${m.id}k)"/><text x="40" y="314" class="tm">선회 중심 쪽</text>
  ${P.s}
  ${poly(cas,'ln ln-in')}${poly(kpi,'ln ln-ac')}${poly(tot,'ln ln-ink')}
  <rect x="408" y="46" width="150" height="62" rx="5" class="legbox"/>
  <line x1="416" y1="60" x2="440" y2="60" class="ln ln-ac"/><text x="446" y="64" style="font-size:11.5px">KPI 몫 +σ(1−cosδ)</text>
  <line x1="416" y1="78" x2="440" y2="78" class="ln ln-in"/><text x="446" y="82" style="font-size:11.5px">캐스터 몫 −ν sinδ</text>
  <line x1="416" y1="96" x2="440" y2="96" class="ln ln-ink"/><text x="446" y="100" style="font-size:11.5px">합계</text>
  <line class="ref" x1="${P.X(20)}" y1="40" x2="${P.X(20)}" y2="260"/>
  <circle cx="${P.X(20)}" cy="${P.Y(t20)}" r="4.5" class="pi"/>
  <text x="${P.X(20)+8}" y="${P.Y(t20)+16}" class="tb">${t20.toFixed(2)}°</text>
  <text x="${P.X(30)-4}" y="${P.Y(-nu*Math.sin(rad(30))+sg*(1-Math.cos(rad(30))))+18}" text-anchor="end" class="tb">합계</text>
</svg>`; };

FIG.steercamK = () => { const m = markers(); const sg=9.5;
  const P = plot({x0:400,y0:40,w:250,h:220,xr:[0,30],yr:[0,1.5],xt:[0,10,20,30],yt:[0,0.5,1,1.5],xl:'조향각 δ [°]',yl:'캠버 변화 Δγ [°] (양쪽 바퀴 같음)'});
  const d = rng(0,30,1), rad = v => v*Math.PI/180;
  const kpi = d.map(v=>[P.X(v),P.Y(sg*(1-Math.cos(rad(v))))]);
  const t20 = sg*(1-Math.cos(rad(20)));
  return `<svg viewBox="0 0 680 320" aria-label="KPI에 의한 캠버 변화">${m.defs}
  <text x="20" y="24" class="tb">바깥 앞바퀴를 앞에서 본 모습 (KPI만)</text>
  <line class="ref" x1="150" y1="60" x2="150" y2="280"/>
  <rect class="rubg2" x="125" y="100" width="50" height="180" rx="14"/>
  <g transform="rotate(6 150 280)"><rect class="rub" x="125" y="100" width="50" height="180" rx="14" style="opacity:.92"/></g>
  <line class="axis" x1="168" y1="280" x2="138" y2="60"/>
  <path class="arcA" d="M150 120 A160 160 0 0 1 166.7 121"/>
  ${M(String.raw`\Delta\gamma`,200,100,'start','ta',15)}
  ${ground(30,300,280)}
  <text x="206" y="150">회색 = 직진(δ = 0°)</text><text x="206" y="172">검정 = 조향 20°</text>
  <text x="206" y="194" class="ta">위가 바깥으로 → 양(+) 캠버</text>
  <path d="M110 300 H40" class="arrowk" marker-end="url(#${m.id}k)"/><text x="40" y="314" class="tm">선회 중심 쪽</text>
  ${P.s}
  ${poly(kpi,'ln ln-ac')}
  <rect x="408" y="46" width="150" height="26" rx="5" class="legbox"/>
  <line x1="416" y1="60" x2="440" y2="60" class="ln ln-ac"/><text x="446" y="64" style="font-size:11.5px">KPI 몫 +σ(1−cosδ)</text>
  <line class="ref" x1="${P.X(20)}" y1="40" x2="${P.X(20)}" y2="260"/>
  <circle cx="${P.X(20)}" cy="${P.Y(t20)}" r="4.5" class="pi"/>
  <text x="${P.X(20)-8}" y="${P.Y(t20)-10}" text-anchor="end" class="tb">+${t20.toFixed(2)}°</text>
</svg>`; };

/* ---------- 잭킹 ---------- */
/* (jack: 아래 "움직이는 그림" 절로 옮김) */

/* ---------- 트레일 (측면 + 위에서 본 지렛대) ---------- */
FIG.trail = () => { const m = markers(); const gx = 150-(300-236)*0.197;
  return `<svg viewBox="0 0 680 420" aria-label="트레일과 복원 모멘트">${m.defs}
  <text x="20" y="24" class="tb">① 측면 (오른쪽이 뒤)</text>
  <circle cx="160" cy="170" r="130" class="rubg2"/><circle cx="160" cy="170" r="74" class="rimg"/>
  <circle cx="160" cy="170" r="14" class="alu"/>
  <polygon class="alug" points="168,96 186,96 182,140 170,176 164,212 158,246 140,246 146,210 156,172 166,140"/>
  <circle class="bj" cx="176" cy="104" r="6"/><circle class="bj" cx="150" cy="236" r="6"/>
  <line class="axis" x1="${gx}" y1="300" x2="188.6" y2="40"/>
  <line class="ref" x1="176" y1="104" x2="176" y2="52"/><path class="arcA" d="M176 60 A44 44 0 0 1 184.5 60.8"/>
  ${M(String.raw`\nu`,192,58,'start','ta',16)}
  <line class="ref" x1="160" y1="40" x2="160" y2="300"/>
  <rect class="cpatch" x="134" y="296" width="52" height="7" rx="2"/>
  ${ground(20,330,300)}
  <circle cx="${gx}" cy="300" r="5" class="pa"/><circle cx="160" cy="300" r="4.5" class="pi"/>
  <circle cx="176" cy="300" r="7" class="fydot"/><circle cx="176" cy="300" r="2.2" class="pin"/>
  ${dimH(m.id,gx,160,322,'$t_{\\mathrm{mech}}',342)}
  ${dimH(m.id,160,176,322,'$t_{\\mathrm{pneu}}',366)}
  ${M('F_y',196,292,'start','ti',14)}
  <text x="222" y="292" class="tm">작용점 (화면 밖 방향 힘)</text>
  <path d="M100 52 H40" class="arrowk" marker-end="url(#${m.id}k)"/><text x="40" y="44" class="tm">진행 방향</text>
  <text x="380" y="24" class="tb">② 위에서 본 접지면 (위가 앞)</text>
  <rect class="rubg2" x="456" y="60" width="56" height="186" rx="12"/>
  <rect class="cpatch" x="460" y="140" width="48" height="76" rx="4"/>
  <circle cx="484" cy="155" r="6" class="pa"/><circle cx="484" cy="178" r="4.5" class="pi"/><circle cx="484" cy="194" r="4" class="pin"/>
  <line class="force" x1="484" y1="194" x2="404" y2="194" marker-end="url(#${m.id}i)"/>
  <text x="402" y="214" class="ti" text-anchor="start">횡력</text>${M('F_y',436,214,'start','ti',14)}
  <line class="ext" x1="490" y1="155" x2="556" y2="155"/><line class="ext" x1="490" y1="194" x2="556" y2="194"/>
  ${dimV(m.id,550,155,194,'$t_{\\mathrm{mech}}+t_{\\mathrm{pneu}}',558)}
  <defs><marker id="${m.id}mz" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" style="fill:var(--s-F)"/></marker><marker id="${m.id}md" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" style="fill:var(--s-del)"/></marker></defs>
  <path d="M500.9 140.9 A22 22 0 0 1 500.9 169.1" style="stroke:var(--s-F);stroke-width:2.4;fill:none" marker-end="url(#${m.id}mz)"/>
  <path d="M461 132.4 A32 32 0 0 0 458.4 175.8" style="stroke:var(--s-del);stroke-width:2.4;fill:none" marker-end="url(#${m.id}md)"/>
  ${M(String.raw`M_\delta`,452,124,'end','',14)}<text x="452" y="142" text-anchor="end" style="fill:var(--s-del);font-weight:700">조향</text>
  ${M('M_z',512,124,'start','',14)}<text x="512" y="142" style="fill:var(--s-F);font-weight:700">복원</text>
  ${M(String.raw`M_z = F_y\,(t_{\mathrm{mech}}+t_{\mathrm{pneu}})`,380,262,'start','tb',14)}
  <text x="380" y="288" style="fill:var(--s-F)">복원 모멘트 (시계): 바퀴를 직진으로 되돌림</text>
  <text x="380" y="308" style="fill:var(--s-del)">조향 모멘트 (반시계): 운전자가 핸들로 넣음</text>
  <text x="380" y="332" class="tb">정상 선회에서 두 모멘트 크기가 같음</text><text x="380" y="350" class="tb">→ 이 크기가 핸들 무게</text>
  <text x="380" y="374" class="tm">왼쪽 선회 기준 · 오른쪽 선회면 방향 반대</text>
  <text x="380" y="394" class="tm">주황 킹핀축 지면점 · 검정 접지 중심</text><text x="380" y="412" class="tm">파랑 횡력 작용점</text>
</svg>`; };

/* ---------- 캠버–횡력 곡선 (X%) ---------- */
FIG.camcurve = () => { const m = markers();
  const P = plot({x0:90,y0:40,w:470,h:200,xr:[-5,2],yr:[0.88,1.005],xt:[-5,-4,-3,-2,-1,0,1,2],yt:[0.9,0.95,1],xl:'캠버 γ [°]',yl:'횡력 / 최대 횡력'});
  const f = g => 1-0.01*(g+1.5)**2, pts = rng(-5,2,0.1).map(g=>[P.X(g),P.Y(Math.max(0.88,f(g)))]);
  const a=-1.5-Math.SQRT2, b=-1.5+Math.SQRT2;
  return `<svg viewBox="0 0 640 300" aria-label="캠버와 횡력">${m.defs}
  ${P.s}
  <rect x="${P.X(a)}" y="40" width="${P.X(b)-P.X(a)}" height="200" class="okzone"/>
  <line class="ref" x1="90" y1="${P.Y(0.98)}" x2="560" y2="${P.Y(0.98)}"/>
  ${poly(pts,'ln ln-ink')}
  <circle cx="${P.X(-1.5)}" cy="${P.Y(1)}" r="4.5" class="pa"/>
  ${M(String.raw`\gamma_{\mathrm{opt}} = -1.5^\circ`,P.X(-1.5),P.Y(1)-10,'middle','ta',13)}
  <text x="566" y="${P.Y(0.98)+4}" class="tm">X = 2%</text>
  <text x="${(P.X(a)+P.X(b))/2}" y="${P.Y(0.92)}" text-anchor="middle" class="ti">허용 범위 −2.9° ~ −0.1°</text>
  <text x="${(P.X(a)+P.X(b))/2}" y="${P.Y(0.92)+20}" text-anchor="middle" class="tm">롤·조향·히브 캠버가 모두 이 안에 들어와야 함</text>
</svg>`; };

/* ---------- 하중 민감도 ---------- */
FIG.loadsens = () => { const m = markers();
  const P = plot({x0:90,y0:52,w:470,h:280,xr:[0,1600],yr:[0,2000],xt:[0,400,800,1200,1600],yt:[0,500,1000,1500,2000],xl:'바퀴 수직하중 F_z [N]',yl:'최대 횡력 F_y,max [N]'});
  const f = F => 1.8*F-0.0004*F*F, pts = rng(0,1600,20).map(F=>[P.X(F),P.Y(f(F))]);
  const Fm=809, A=[340,1278], B=[105,1513], yA=(f(A[0])+f(A[1]))/2, yB=(f(B[0])+f(B[1]))/2;
  const fz=(x,y,v,cls)=>`<text x="${x}" y="${y}" text-anchor="end" class="${cls}">F<tspan dy="4" style="font-size:10px">z</tspan><tspan dy="-4"> ${v} N</tspan></text>`;
  return `<svg viewBox="0 0 640 390" aria-label="하중 민감도">${m.defs}
  ${P.s}
  ${poly(pts,'ln ln-ink')}
  <line x1="${P.X(A[0])}" y1="${P.Y(f(A[0]))}" x2="${P.X(A[1])}" y2="${P.Y(f(A[1]))}" class="chord"/>
  <line x1="${P.X(B[0])}" y1="${P.Y(f(B[0]))}" x2="${P.X(B[1])}" y2="${P.Y(f(B[1]))}" class="chord" style="stroke:var(--accent)"/>
  ${A.map(F=>`<circle cx="${P.X(F)}" cy="${P.Y(f(F))}" r="4.5" class="pin"/>`).join('')}${B.map(F=>`<circle cx="${P.X(F)}" cy="${P.Y(f(F))}" r="4.5" class="pa"/>`).join('')}
  <circle cx="${P.X(Fm)}" cy="${P.Y(f(Fm))}" r="5" class="pi"/>
  <circle cx="${P.X(Fm)}" cy="${P.Y(yA)}" r="3.5" class="pin"/><circle cx="${P.X(Fm)}" cy="${P.Y(yB)}" r="3.5" class="pa"/>
  ${fz(P.X(A[0])-8,P.Y(f(A[0]))-8,'340','ti')}${fz(P.X(A[1])-8,P.Y(f(A[1]))-8,'1,278','ti')}
  ${fz(P.X(B[0])-8,P.Y(f(B[0]))-8,'105','ta')}${fz(P.X(B[1])-8,P.Y(f(B[1]))-8,'1,513','ta')}
  <text x="${P.X(Fm)-10}" y="${P.Y(f(Fm))-10}" text-anchor="end" class="tb">고르면 (F<tspan dy="4" style="font-size:10px">z</tspan><tspan dy="-4"> 809 N) 바퀴당 F</tspan><tspan dy="4" style="font-size:10px">y</tspan><tspan dy="-4"> 1,194 N</tspan></text>
  <text x="${P.X(Fm)+14}" y="${P.Y(yB)+30}" class="ti">ΔF 469 N → 두 바퀴 F<tspan dy="4" style="font-size:10px">y</tspan><tspan dy="-4"> 합 2,213 N (−7%)</tspan></text>
  <text x="${P.X(Fm)+14}" y="${P.Y(yB)+50}" class="ta">ΔF 704 N → 두 바퀴 F<tspan dy="4" style="font-size:10px">y</tspan><tspan dy="-4"> 합 1,993 N (−17%)</tspan></text>
  <text x="${P.X(Fm)+14}" y="${P.Y(yB)+70}" class="tm">(고르면 합 2,389 N)</text>
  <text x="330" y="16" text-anchor="middle" class="tm">곡선이 아래로 휘어 있어서, 하중이 한쪽으로 쏠릴수록 두 바퀴 그립 합이 줄어든다</text>
</svg>`; };

/* ---------- 하중 민감도: 한 바퀴 ±ΔF (롤 구배 하한) ---------- */
FIG.loadsens2 = () => { const m = markers();
  const P = plot({x0:90,y0:52,w:470,h:200,xr:[400,1200],yr:[800,1600],xt:[400,600,800,1000,1200],yt:[800,1000,1200,1400,1600],xl:'바퀴 수직하중 F_z [N]',yl:'최대 횡력 F_y,max [N]'});
  const f = F => 1.8*F-0.0004*F*F, pts = rng(500,1200,10).map(F=>[P.X(F),P.Y(f(F))]);
  const Fm=809, dF=244, Fi=Fm-dF, Fo=Fm+dF, ym=(f(Fi)+f(Fo))/2, yb=P.Y(800);
  return `<svg viewBox="0 0 640 320" aria-label="한 바퀴 하중 변동과 평균 그립">${m.defs}
  ${P.s}
  ${[Fi,Fm,Fo].map(F=>`<line class="ref" x1="${P.X(F)}" y1="${P.Y(f(F))}" x2="${P.X(F)}" y2="${yb}"/>`).join('')}
  ${poly(pts,'ln ln-ink')}
  <line x1="${P.X(Fi)}" y1="${P.Y(f(Fi))}" x2="${P.X(Fo)}" y2="${P.Y(f(Fo))}" class="chord"/>
  <circle cx="${P.X(Fi)}" cy="${P.Y(f(Fi))}" r="5" class="pin"/><circle cx="${P.X(Fo)}" cy="${P.Y(f(Fo))}" r="5" class="pin"/>
  <circle cx="${P.X(Fm)}" cy="${P.Y(f(Fm))}" r="4" class="pa"/><circle cx="${P.X(Fm)}" cy="${P.Y(ym)}" r="4" class="pi"/>
  <text x="${P.X(Fi)-8}" y="${P.Y(f(Fi))-12}" text-anchor="end" class="ti">F_z − ΔF = 565 N</text>
  <text x="${P.X(Fm)}" y="${yb-8}" text-anchor="middle" class="tm">F_z = 809 N</text>
  <text x="${P.X(Fo)-12}" y="${P.Y(f(Fo))-10}" text-anchor="end" class="ti">F_z + ΔF = 1,053 N</text>
  <text x="${P.X(Fm)-10}" y="${P.Y(f(Fm))-10}" text-anchor="end" class="ta">하중 일정: 그립 1,194 N</text>
  <text x="${P.X(Fm)+10}" y="${P.Y(ym)+18}" class="tb">±244 N 출렁임: 시간 평균 1,171 N (−2%)</text>
  <text x="330" y="16" text-anchor="middle" class="tm">곡선이 아래로 휘어 있어서, 한 바퀴 하중이 ±ΔF로 출렁이면 시간 평균 그립이 줄어든다</text>
</svg>`; };

/* ---------- 스윙암: 범프 시 캠버 ---------- */
/* (rollcam: 아래 "움직이는 그림" 절로 옮김) */

/* ---------- 안티다이브 (측면) ---------- */
FIG.antiside = () => { const m = markers(); const C=[130,280], IC=[330,182], U=[130,205], Lo=[130,255];
  const at = (P,x) => [x, P[1]+(IC[1]-P[1])*(x-P[0])/(IC[0]-P[0])];
  const u2 = at(U,230), l2 = at(Lo,240), tan = (C[1]-IC[1])/(IC[0]-C[0]), th = Math.atan(tan), r = 60;
  return `<svg viewBox="0 20 660 300" aria-label="안티다이브 측면도">${m.defs}
  <rect class="body" x="90" y="120" width="520" height="80" rx="30"/>
  <circle cx="130" cy="230" r="50" class="rubg2"/><circle cx="560" cy="230" r="50" class="rubg2"/>
  <line class="arm" x1="${U[0]}" y1="${U[1]}" x2="${u2[0]}" y2="${u2[1].toFixed(1)}" style="stroke-width:5"/><line class="arm" x1="${Lo[0]}" y1="${Lo[1]}" x2="${l2[0]}" y2="${l2[1].toFixed(1)}" style="stroke-width:5"/>
  <line class="ref2" x1="${u2[0]}" y1="${u2[1].toFixed(1)}" x2="${IC[0]}" y2="${IC[1]}"/><line class="ref2" x1="${l2[0]}" y1="${l2[1].toFixed(1)}" x2="${IC[0]}" y2="${IC[1]}"/>
  <line class="rcline" x1="${C[0]}" y1="${C[1]}" x2="${IC[0]+60}" y2="${(C[1]-tan*260).toFixed(1)}"/>
  <circle cx="${IC[0]}" cy="${IC[1]}" r="6" class="pa"/><text x="${IC[0]+10}" y="${IC[1]-8}" class="ta">측면 IC</text>
  <path class="arcA" d="M${C[0]+r} ${C[1]} A${r} ${r} 0 0 0 ${(C[0]+r*Math.cos(th)).toFixed(1)} ${(C[1]-r*Math.sin(th)).toFixed(1)}"/>${M(String.raw`\theta_F`,C[0]+r+8,C[1]-8,'start','ta',14)}
  <circle cx="430" cy="150" r="7" class="pi"/><text x="441" y="146" class="tb">CG</text>
  ${ground(20,640,280)}
  <line class="ext" x1="437" y1="150" x2="626" y2="150"/>
  ${dimV(m.id,620,150,280,'$h',612,'end')}
  ${dimH(m.id,130,560,304,'$L',300)}
  <text x="40" y="48" class="tb">← 진행 방향</text>
  <text x="330" y="48" text-anchor="middle" class="tm">앞축 측면도 · 점선 = 볼조인트를 지나 피벗축과 평행한 선의 연장</text>
</svg>`; };

/* ---------- ARB 한쪽 요철 ---------- */
/* (arb: 아래 "움직이는 그림" 절로 옮김) */

/* ---------- 애커먼 % 곡선 (개념) ---------- */
FIG.ackcurve = () => { const m = markers();
  const P = plot({x0:90,y0:40,w:470,h:200,xr:[0,30],yr:[-20,110],xt:[0,5,10,15,20,25,30],yt:[0,25,50,75,100],xl:'조향각 [°]',yl:'애커먼 [%]'});
  const c = rng(0,30,1).map(d=>[P.X(d), P.Y(-10+80*(1-Math.exp(-d/9)))]);
  return `<svg viewBox="0 0 640 300" aria-label="애커먼 곡선">${m.defs}
  ${P.s}
  <line class="ref" x1="90" y1="${P.Y(100)}" x2="560" y2="${P.Y(100)}"/><text x="556" y="${P.Y(100)-6}" text-anchor="end" class="tm">정애커먼 100%</text>
  <text x="556" y="${P.Y(0)-6}" text-anchor="end" class="tm">평행 0%</text>
  ${poly(c,'ln ln-ac')}
  <text x="${P.X(16)}" y="${P.Y(38)}" class="ta">부분 양의 애커먼 (예시 곡선)</text>
  <text x="${P.X(2.5)}" y="${P.Y(-15)}" class="tm">작은 조향각: 평행~안티 쪽 (고속 코너, 슬립 항 우세)</text>
  <text x="${P.X(15)}" y="${P.Y(90)}" class="tm">큰 조향각: 양 쪽 (헤어핀, 기하 항 우세)</text>
</svg>`; };

/* ---------- LSD 램프 ---------- */
/* (lsd: 아래 "움직이는 그림" 절로 옮김) */

/* ---------- 트랙션 제어 블록도 ---------- */
FIG.tcblock = () => { const m = markers(); const B=(x,y,w,h,t,cls)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${cls||'blk'}"/>${t.split('|').map((l,i,a)=>`<text x="${x+w/2}" y="${y+h/2+5-(a.length-1)*9+i*18}" text-anchor="middle" ${i===0?'class="tb"':''}>${l}</text>`).join('')}`;
  const A=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1} L${x2} ${y2}" class="arrowk" marker-end="url(#${m.id}k)"/>`;
  return `<svg viewBox="0 0 680 290" aria-label="트랙션 제어 구성">${m.defs}
  ${B(20,30,150,44,'휠속 ×4')}${B(20,84,150,44,'IMU')}${B(20,138,150,44,'조향각 (랙 변위)')}${B(20,192,150,44,'HV 전압·전류')}${B(20,240,150,40,'APPS ×2','blk2')}
  ${B(230,40,190,180,'VCU|상태 추정 (슬립·요·β)|① 슬립 한계|② 요 한계|③ 출력 한계|→ min','blkA')}
  ${B(480,90,170,60,'인버터|토크 = min(요구, 상한)')}${B(480,190,170,44,'모터 → LSD → 바퀴')}
  ${A(170,52,230,90)}${A(170,106,230,110)}${A(170,160,230,140)}${A(170,214,230,170)}
  ${A(420,120,480,120)}<text x="450" y="112" text-anchor="middle" class="ti" style="font-size:11px">CAN 상한</text>
  ${A(565,150,565,190)}
  <path d="M170 260 H460 V140 H480" class="arrowk" marker-end="url(#${m.id}k)"/><text x="320" y="254" text-anchor="middle" class="ta" style="font-size:11.5px">APPS는 인버터로 직결 (제46조⑥4)</text>
</svg>`; };

/* ---------- 공력 압력 중심 ---------- */
FIG.aerocp = () => { const m = markers();
  return `<svg viewBox="0 0 660 330" aria-label="공력 압력 중심">${m.defs}
  <rect class="body" x="90" y="130" width="500" height="70" rx="30"/>
  <circle cx="150" cy="210" r="46" class="rubg2"/><circle cx="530" cy="210" r="46" class="rubg2"/>
  <rect x="40" y="200" width="90" height="8" rx="3" class="wing"/><rect x="560" y="80" width="80" height="12" rx="3" class="wing"/>
  <path d="M85 150 V196" class="force" marker-end="url(#${m.id}i)"/><path d="M600 40 V76" class="force" marker-end="url(#${m.id}i)"/>
  <path d="M380 70 V124" class="force" style="stroke:var(--accent);stroke-width:4" marker-end="url(#${m.id}a)"/>
  <circle cx="380" cy="128" r="6" class="pa"/><text x="390" y="66" class="ta">압력 중심 (합력)</text>
  <circle cx="340" cy="165" r="6" class="pi"/><text x="328" y="170" text-anchor="end" class="tb">CG</text>
  <line class="ext" x1="340" y1="171" x2="340" y2="256"/>
  ${ground(20,640,256)}
  ${dimH(m.id,150,380,276,'$x_{cp}',292)}
  ${dimH(m.id,150,530,304,'$L',322)}
  <text x="40" y="30" class="tb">← 진행 방향</text>
  <text x="330" y="30" text-anchor="middle" class="tm">압력 중심이 CG(정적 하중 배분 위치)보다 앞이면 오버 쪽, 뒤면 언더 쪽</text>
</svg>`; };

/* ============================================================
   움직이는 그림 (재생 버튼) · 정의 보강
   ============================================================ */
FIG.side = (re) => { const m = markers(); const tn = 44.7/260, e = 10, gx = 230-130*tn+e, sh = gx-211, X = x => (x+sh).toFixed(1);
  const up = [[236,116],[256,116],[254,150],[242,190],[238,230],[234,268],[212,268],[216,230],[224,190],[232,150]].map(([x,y])=>`${X(x)},${y}`).join(' ');
  const px = gx-e, dm = (x1,x2,y) => `<line class="ext" x1="${x1}" y1="${y-8}" x2="${x1}" y2="${y+6}"/><line class="ext" x1="${x2}" y1="${y-8}" x2="${x2}" y2="${y+6}"/><line class="dim" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-start="url(#${m.id}t)" marker-end="url(#${m.id}t)"/>`;
  return `<svg viewBox="0 0 470 ${re?462:390}" aria-label="측면도 캐스터와 트레일">${m.defs}
  <circle class="rub" cx="230" cy="190" r="130"/>
  <circle cx="230" cy="190" r="118" style="fill:none;stroke:#4a525b;stroke-width:2;stroke-dasharray:3 9"/>
  <circle class="rimf" cx="230" cy="190" r="76"/>
  ${[0,72,144,216,288].map(a=>{const r=a*Math.PI/180;return `<path d="M${230+24*Math.cos(r)} ${190+24*Math.sin(r)} L${230+66*Math.cos(r-0.3)} ${190+66*Math.sin(r-0.3)} A66 66 0 0 1 ${230+66*Math.cos(r+0.3)} ${190+66*Math.sin(r+0.3)} Z" style="fill:#fff;opacity:.8"/>`}).join('')}
  <polygon class="alug" points="${up}"/>
  <circle cx="230" cy="190" r="17" class="alu"/>
  ${[0,90,180,270].map(a=>{const r=a*Math.PI/180;return `<circle cx="${230+10*Math.cos(r)}" cy="${190+10*Math.sin(r)}" r="2.6" class="pi"/>`}).join('')}
  <circle class="bj" cx="${X(244)}" cy="128" r="6"/><circle class="bj" cx="${X(222)}" cy="256" r="6"/>
  <line class="axis" x1="${gx.toFixed(1)}" y1="320" x2="${(gx+260*tn).toFixed(1)}" y2="60"/>
  <line class="ref" x1="${X(244)}" y1="128" x2="${X(244)}" y2="40"/>
  <path class="arcA" d="M${X(244)} 48 A80 80 0 0 1 ${(244+sh+80*Math.sin(Math.atan(tn))).toFixed(1)} ${(128-80*Math.cos(Math.atan(tn))).toFixed(1)}" style="stroke-width:2.4"/>
  ${M(String.raw`\nu`,268+sh,46,'start','ta',16)}<text x="${286+sh}" y="46" class="ta">캐스터</text>
  <line class="ref" x1="230" y1="60" x2="230" y2="320"/>
  ${re ? `<line x1="${px.toFixed(1)}" y1="320" x2="${(px+260*tn).toFixed(1)}" y2="60" style="stroke:var(--in);stroke-width:1.6;stroke-dasharray:7 4"/>${lead((px+230*tn).toFixed(1),90,150,70,'평행선 (바퀴 중심 지남)','end')}
  <line class="ref" x1="64" y1="190" x2="212" y2="190"/>${dimV(m.id,72,190,320,'$R',64,'end')}` : ''}
  ${ground(30,440,320)}
  <circle cx="${gx.toFixed(1)}" cy="320" r="5" class="pa"/><circle cx="230" cy="320" r="5" class="pi"/>
  ${re ? (()=>{ const Z=5, cx=114, cy=362, x0=218.8, y0=318, T=(x,y)=>[(cx+Z*(x-x0)).toFixed(1),(cy+Z*(y-y0)).toFixed(1)], q=(x,y)=>T(x,y).join(' ');
      const yTop=y0-(cy-342)/Z;
      return `<rect x="${(x0-17).toFixed(1)}" y="310" width="34" height="16" rx="3" style="fill:none;stroke:var(--muted);stroke-width:1"/><line class="leader" x1="${(x0-17).toFixed(1)}" y1="326" x2="60" y2="342"/>
      <clipPath id="${m.id}z"><rect x="24" y="342" width="190" height="112" rx="8"/></clipPath>
      <rect x="24" y="342" width="190" height="112" rx="8" style="fill:#fff;stroke:var(--muted);stroke-width:1.2"/>
      <g clip-path="url(#${m.id}z)">
        <line class="gnd" x1="24" y1="${T(0,320)[1]}" x2="214" y2="${T(0,320)[1]}"/>
        <line x1="${T(px,320)[0]}" y1="${T(0,320)[1]}" x2="${T(px+(320-yTop)*tn,yTop)[0]}" y2="342" style="stroke:var(--in);stroke-width:1.8;stroke-dasharray:7 4"/>
        <line class="axis" x1="${T(gx,320)[0]}" y1="${T(0,320)[1]}" x2="${T(gx+(320-yTop)*tn,yTop)[0]}" y2="342"/>
        <line class="ref" x1="${T(230,0)[0]}" y1="342" x2="${T(230,0)[0]}" y2="${T(0,320)[1]}"/>
        <circle cx="${T(gx,320)[0]}" cy="${T(0,320)[1]}" r="5" class="pa"/><circle cx="${T(230,320)[0]}" cy="${T(0,320)[1]}" r="5" class="pi"/>
      </g>
      ${dm(+T(px,0)[0],+T(gx,0)[0],392)}${dm(+T(gx,0)[0],+T(230,0)[0],392)}${M('e',(+T(px,0)[0]+ +T(gx,0)[0])/2,412,'middle','ti',15)}${M(String.raw`t_{\mathrm{mech}}`,(+T(gx,0)[0]+ +T(230,0)[0])/2,413,'middle','ti',15)}
      ${dm(+T(px,0)[0],+T(230,0)[0],428)}${M(String.raw`R\tan\nu\ \text{}`,+T(230,0)[0]+8,433,'start','ti',14)}
      <text x="30" y="358" class="tm" style="font-size:11px">지면 확대</text>`; })()
       : dimH(m.id,gx,230,344,'$t_{\\mathrm{mech}}\\ (\\text{기계적 트레일})',368)}
  ${co('①',350,104,[[318,120]])}${co('②',350,166,[[296,178]])}${co('⑦',350,236,[[240+sh,234]])}${co('⑧',350,130,[[250+sh,128]])}${co('⑧',350,262,[[228+sh,256]])}
  <text x="${276+sh}" y="76" class="ta">킹핀축</text>
  <path d="M120 40 H40" class="arrowk" marker-end="url(#${m.id}k)"/><text x="40" y="30">진행 방향</text>
</svg>`; };

/* ---------- 푸시로드·로커·댐퍼 (정면, 범프 애니메이션) ----------
   입력: 바퀴 범프 dz(px, 위 +). 하부 위시본이 인보드 피벗 A 중심으로 돌고, 로드 길이 일정 조건으로 로커 각을 풀고, 댐퍼 길이를 구한다.
   범프 → 로커 반시계(화면) → 댐퍼 팔이 차 안쪽(왼쪽)으로 → 댐퍼 압축. 정지 MR ≈ 0.85 (r_d/r_p = 58/40) */
const ACTG = (() => { const A=[330,292], B0=[508,282], Q0=[470,284], PV=[273.2,159.6], rp=40, rd=58, ua=[0.67137,-0.74112];
  const PP0=[PV[0]+rp*ua[0], PV[1]+rp*ua[1]], PD0=[PV[0], PV[1]-rd], F=[58,PD0[1]], lr=Math.hypot(PP0[0]-Q0[0],PP0[1]-Q0[1]);
  const rot=(P,C,a)=>{const c=Math.cos(a),s=Math.sin(a),dx=P[0]-C[0],dy=P[1]-C[1];return [C[0]+dx*c-dy*s, C[1]+dx*s+dy*c];};
  function solve(dz){ const vx=B0[0]-A[0], vy=B0[1]-A[1], r=Math.hypot(vx,vy), a=Math.asin((vy-dz)/r)-Math.asin(vy/r);
    const Q=rot(Q0,A,a), B=rot(B0,A,a), g=b=>{const P=rot(PP0,PV,b);return Math.hypot(P[0]-Q[0],P[1]-Q[1])-lr;};
    let lo=-1, hi=1; for(let i=0;i<50;i++){ const mid=(lo+hi)/2; if(Math.sign(g(mid))===Math.sign(g(lo))) lo=mid; else hi=mid; }
    const b=(lo+hi)/2; return {B,Q,PP:rot(PP0,PV,b),PD:rot(PD0,PV,b)}; }
  const f=v=>v.toFixed(1);
  function dyn(dz, mk){ const {B,Q,PP,PD}=solve(dz), dx=PD[0]-F[0], dy=PD[1]-F[1], len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
    const sq=(p,u,w,k)=>`<path d="M${f(p[0]+u[0]*k)} ${f(p[1]+u[1]*k)} L${f(p[0]+(u[0]+w[0])*k)} ${f(p[1]+(u[1]+w[1])*k)} L${f(p[0]+w[0]*k)} ${f(p[1]+w[1]*k)}" style="fill:none;stroke:var(--accent);stroke-width:1.2"/>`;
    const nr=Math.hypot(Q[0]-PP[0],Q[1]-PP[1]), ur=[(Q[0]-PP[0])/nr,(Q[1]-PP[1])/nr], wp=[(PV[0]-PP[0])/40,(PV[1]-PP[1])/40], wd=[(PV[0]-PD[0])/58,(PV[1]-PD[1])/58], ud=[-dx/len,-dy/len];
    return `<path class="tiresec ghost" transform="translate(0 ${f(B[1]-B0[1])})" d="M500 300 L500 142 Q500 120 520 120 L530 120 Q550 120 550 142 L550 300 Z"/>
    <line class="arm" x1="${A[0]}" y1="${A[1]}" x2="${f(B[0])}" y2="${f(B[1])}"/>${rodEnd(A[0],A[1])}
    <line class="rod" x1="${f(PP[0])}" y1="${f(PP[1])}" x2="${f(Q[0])}" y2="${f(Q[1])}"/>
    <path d="M${f(PP[0])} ${f(PP[1])} L${f(PD[0])} ${f(PD[1])} L${PV[0]} ${PV[1]} Z" style="fill:var(--alu-d);stroke:var(--alu-d);stroke-width:19;stroke-linejoin:round"/>
    <path d="M${f(PP[0])} ${f(PP[1])} L${f(PD[0])} ${f(PD[1])} L${PV[0]} ${PV[1]} Z" style="fill:var(--alu);stroke:var(--alu);stroke-width:16;stroke-linejoin:round"/>
    <circle cx="${PV[0]}" cy="${PV[1]}" r="5" class="pi"/><circle cx="${f(PP[0])}" cy="${f(PP[1])}" r="2.4" class="pi"/>
    <g transform="translate(${F[0]} ${F[1]}) rotate(${ang.toFixed(2)})">
      <line x1="84" y1="0" x2="${f(len)}" y2="0" class="shaft"/>${spring(8,len-10,0,10,14)}
      <rect class="dampb" x="4" y="-8" width="80" height="16" rx="3"/></g>
    ${rodEnd(F[0],F[1])}${rodEnd(f(PD[0]),f(PD[1]))}
    <line class="rlen" x1="${PV[0]}" y1="${PV[1]}" x2="${f(PP[0])}" y2="${f(PP[1])}"/><line class="rlen" x1="${PV[0]}" y1="${PV[1]}" x2="${f(PD[0])}" y2="${f(PD[1])}"/>
    ${Math.abs(dz)<0.5 ? sq(PP,ur,wp,9)+sq(PD,ud,wd,9) : ''}`; }
  return {dyn, PV, F}; })();
FIG.act = () => { const m = markers(); const G = ACTG;
  return `<svg viewBox="0 0 580 330" aria-label="푸시로드 로커 댐퍼">${m.defs}
  ${tubeLen(150,170,40,102)}${tubeLen(150,170,150,300)}${tubeLen(150,300,262,208)}${tubeSec(150,170)}${tubeSec(40,102,10)}${tubeSec(150,300,10)}${tubeSec(262,208,9)}
  ${tab(262,200,G.PV[0],G.PV[1],7)}${tab(46,102,G.F[0],G.F[1],6)}${tab(158,296,330,292,0.1)}
  <g class="an-dyn" data-an="act" data-mk="${m.id}">${G.dyn(0,m.id)}</g>
  ${M('r_p',302,160,'start','ta',15)}${M('r_d',250,138,'end','ta',15)}
  <path d="M470 284 V236" class="force" marker-end="url(#${m.id}i)"/>${M(String.raw`\Delta z_{\text{휠}}`,478,250,'start','ti',15)}
  ${lead(G.PV[0],G.PV[1],330,178,'로커 피벗 (브래킷)')}
  <text x="312" y="122" class="tm" style="font-size:11px">로드·댐퍼가 팔과 직각 (사점 회피)</text>
  ${M(String.raw`\Delta l_{\text{댐퍼}}`,92,84,'start','tb',15)}<text x="148" y="84">댐퍼·스프링</text>
  <text x="392" y="200" class="tb" transform="rotate(42 392 200)">푸시로드</text>
  <path d="M${(G.PV[0]-33).toFixed(1)} ${(G.PV[1]-8).toFixed(1)} A34 34 0 0 0 ${(G.PV[0]-20).toFixed(1)} ${(G.PV[1]+27).toFixed(1)}" style="fill:none;stroke:var(--in);stroke-width:2.2" marker-end="url(#${m.id}i)"/>
  <text x="${(G.PV[0]-40).toFixed(1)}" y="${(G.PV[1]+30).toFixed(1)}" text-anchor="end" class="ti" style="font-size:11.5px">범프 시 로커 회전</text>
  <text x="360" y="320">하부 위시본</text><text x="96" y="318" class="tm">프레임 튜브</text>
  ${M(String.raw`MR = \dfrac{\Delta l_{\text{댐퍼}}}{\Delta z_{\text{휠}}} \approx \dfrac{\Delta l_{\text{로드}}}{\Delta z_{\text{휠}}}\cdot\dfrac{r_d}{r_p}\cdot(\text{각도 보정})`,250,24,'start','tb',14)}
  ${M(String.raw`k_{\text{휠}} = k_{\text{스프링}}\, MR^2`,360,62,'start','tb',14)}
</svg>`; };
ANIM.act = { dyn:(u,mk)=>ACTG.dyn(25*Math.sin(2*Math.PI*u),mk), note:'바퀴가 오르면 로커가 돌아 댐퍼가 줄어든다 (범프 ↔ 리바운드)' };

/* ---------- 애커먼 (실제 링크 기구학, 조향 애니메이션) ----------
   너클암 26 px가 뒤차축 중앙을 향하는 사다리꼴, 랙 끝 ±20 px, 타이로드 길이 일정.
   랙 이송 s = −10.4 px에서 δ_out 23.4°, δ_in 34.9°, 두 바퀴의 회전 중심이 (≈500, 250)에서 만남 (정애커먼) */
const ACKG = (() => { const D=Math.PI/180, FL=[130,90], FR=[270,90], ka=26, H=20;
  const kn=(P,dx,a)=>{ const n=Math.hypot(dx,160), vx=dx/n, vy=160/n, c=Math.cos(a*D), s=Math.sin(a*D); return [P[0]+ka*(vx*c-vy*s), P[1]+ka*(vx*s+vy*c)]; };
  const kL0=kn(FL,70,0), ry=kL0[1], lt=Math.hypot(200-H-kL0[0],0);
  const solveA=(P,dx,rack,a)=>{ const g=v=>{const k=kn(P,dx,v);return Math.hypot(k[0]-rack[0],k[1]-rack[1])-lt;}; for(let i=0;i<30;i++){ const d=(g(a+1e-3)-g(a-1e-3))/2e-3; a-=g(a)/d; } return a; };
  const f=v=>v.toFixed(1), SMAX=-10.4;
  const W=(x,y,a)=>`<g transform="rotate(${a.toFixed(2)} ${x} ${y})"><rect class="rub" x="${x-9}" y="${y-26}" width="18" height="52" rx="4"/></g>`;
  function state(u){ const s=SMAX*u; let aL=0, aR=0; const n=Math.max(1,Math.ceil(Math.abs(s)/0.5));
    for(let i=1;i<=n;i++){ const si=s*i/n; aL=solveA(FL,70,[200-H+si,ry],aL); aR=solveA(FR,-70,[200+H+si,ry],aR); }
    return {s,aL,aR}; }
  function dyn(u){ const {s,aL,aR}=state(u), kL=kn(FL,70,aL), kR=kn(FR,-70,aR), rL=[200-H+s,ry], rR=[200+H+s,ry];
    const cx=(P,a)=> a>0.3 ? P[0]+160/Math.tan(a*D) : 2000, cL=cx(FL,aL), cR=cx(FR,aR), cm=(cL+cR)/2;
    const arc=(P,a,t)=>{ const r=40, ex=P[0]+r*Math.sin(a*D), ey=P[1]-r*Math.cos(a*D), lx=P[0]+56*Math.sin(Math.max(a,8)*D/2), ly=P[1]-56*Math.cos(Math.max(a,8)*D/2);
      return `<line class="ref" x1="${P[0]}" y1="${P[1]}" x2="${P[0]}" y2="${P[1]-50}"/>${a>0.5?`<path class="arcA" d="M${P[0]} ${P[1]-r} A${r} ${r} 0 0 1 ${f(ex)} ${f(ey)}"/>`:''}<text x="${f(lx)}" y="${f(ly)}" class="ta">δ<tspan dy="4" style="font-size:10px">${t}</tspan><tspan dy="-4"> ${a.toFixed(1)}°</tspan></text>`; };
    const show = cm < 590;
    return `<line class="ref" x1="130" y1="90" x2="${f(Math.min(cL,2000))}" y2="250"/><line class="ref" x1="270" y1="90" x2="${f(Math.min(cR,2000))}" y2="250"/>
    ${W(FL[0],FL[1],aL)}${W(FR[0],FR[1],aR)}
    <line class="shaft" x1="${f(rL[0])}" y1="${f(ry)}" x2="${f(rR[0])}" y2="${f(ry)}" style="stroke-width:4"/>
    <line class="rod" x1="${f(rL[0])}" y1="${f(ry)}" x2="${f(kL[0])}" y2="${f(kL[1])}"/><line class="rod" x1="${f(rR[0])}" y1="${f(ry)}" x2="${f(kR[0])}" y2="${f(kR[1])}"/>
    <line class="arm" x1="${FL[0]}" y1="${FL[1]}" x2="${f(kL[0])}" y2="${f(kL[1])}" style="stroke-width:4"/><line class="arm" x1="${FR[0]}" y1="${FR[1]}" x2="${f(kR[0])}" y2="${f(kR[1])}" style="stroke-width:4"/>
    ${[kL,kR,rL,rR].map(p=>`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="3" class="pi"/>`).join('')}
    ${arc(FL,aL,'out')}${arc(FR,aR,'in')}
    ${show ? `<circle cx="${f(cm)}" cy="250" r="6" class="pa"/><text x="${f(cm+8)}" y="240" class="ta">회전 중심</text>
      <line class="ext" x1="200" y1="264" x2="200" y2="278"/><line class="ext" x1="${f(cm)}" y1="264" x2="${f(cm)}" y2="278"/><line class="dim" x1="200" y1="272" x2="${f(cm)}" y2="272" marker-start="url(#MKt)" marker-end="url(#MKt)"/><text x="${f((200+cm)/2)}" y="292" text-anchor="middle" class="ti" style="font-style:italic">R</text>`
      : `<text x="590" y="240" text-anchor="end" class="ta">회전 중심 → 오른쪽 멀리</text>`}`; }
  return {dyn, ry, H}; })();
FIG.ack = () => { const m = markers(); const G = ACKG;
  return `<svg viewBox="0 0 600 340" aria-label="애커먼 기하">${m.defs}
  <rect class="body" x="150" y="58" width="100" height="220" rx="30"/>
  <line class="ref" x1="130" y1="250" x2="590" y2="250"/>
  ${`<g transform="rotate(0 130 250)"><rect class="rub" x="121" y="224" width="18" height="52" rx="4"/></g><g><rect class="rub" x="261" y="224" width="18" height="52" rx="4"/></g>`}
  <rect class="dampb" x="174" y="${(G.ry-6).toFixed(1)}" width="52" height="12" rx="3"/>
  <g class="an-dyn" data-an="ack" data-mk="${m.id}">${G.dyn(1).replace(/MKt/g,m.id+'t')}</g>
  <text x="200" y="${(G.ry+26).toFixed(0)}" text-anchor="middle" class="tm">랙 하우징 (차체 고정)</text>
  <path d="M222 ${(G.ry-16).toFixed(1)} H186" class="force" style="stroke-width:2.4" marker-end="url(#${m.id}i)"/><text x="204" y="${(G.ry-24).toFixed(1)}" text-anchor="middle" class="ti" style="font-size:12px">랙 이동</text>
  ${lead(140,104,58,128,'너클암','end')}
  ${lead(160,114,58,152,'타이로드','end')}
  ${dimV(m.id,70,90,250,'$L',60,'end')}
  ${dimH(m.id,130,270,316,'$t',334)}
  ${M(String.raw`\delta_{\mathrm{in}}-\delta_{\mathrm{out}} \approx \dfrac{L\,t}{R^2}`,330,60,'start','tb',14)}
  <text x="330" y="92" class="tm">슬립각 0일 때의 기하 (정애커먼)</text>
</svg>`; };
ANIM.ack = { dyn:(u,mk)=>ACKG.dyn(0.04+0.96*(0.5+0.5*Math.cos(2*Math.PI*u))).replace(/MKt/g,mk+'t'), note:'랙을 밀면 안쪽 바퀴가 더 꺾이고, 두 바퀴의 회전 중심이 뒤차축 연장선 위에서 만난다' };

/* ---------- 잭킹 (조향하면 차체가 들림, 애니메이션) ---------- */
const JACKS = (x, lift, steer, ghost) => {
    const ub = [x+34, 158-lift], lb = [x+26, 206-lift], sl = (ub[0]-lb[0])/(lb[1]-ub[1]);
    const ax = y => lb[0] + (lb[1]-y)*sl;
    const wheel = (dy, cls, st) => `<g transform="translate(0 ${dy.toFixed(1)}) rotate(${(-3*steer).toFixed(2)} ${x+14} 230)"><rect class="${cls}" x="${x}" y="150" width="28" height="80" rx="8" ${st||''}/></g>`;
    return (ghost && lift>0.5 ? wheel(lift,'rubg2','style="fill:none;stroke:#4a5058;stroke-width:1.6;stroke-dasharray:5 4"') : '')
      + wheel(0,'rub')
      + `<rect class="body" x="${x+92}" y="${(128-lift).toFixed(1)}" width="150" height="46" rx="8"/>`
      + `<line class="arm" x1="${ub[0]}" y1="${ub[1].toFixed(1)}" x2="${x+92}" y2="${(140-lift).toFixed(1)}" style="stroke-width:5"/>`
      + `<line class="arm" x1="${lb[0]}" y1="${lb[1].toFixed(1)}" x2="${x+92}" y2="${(164-lift).toFixed(1)}" style="stroke-width:5"/>`
      + `<line x1="${ub[0]}" y1="${ub[1].toFixed(1)}" x2="${lb[0]}" y2="${lb[1].toFixed(1)}" style="stroke:#c9d1d9;stroke-width:6;stroke-linecap:round"/>`
      + `<line class="axis" x1="${ax(112-lift).toFixed(1)}" y1="${(112-lift).toFixed(1)}" x2="${ax(230).toFixed(1)}" y2="230"/>`
      + `<circle class="bj" cx="${ub[0]}" cy="${ub[1].toFixed(1)}" r="4.5"/><circle class="bj" cx="${lb[0]}" cy="${lb[1].toFixed(1)}" r="4.5"/>`;
};
const JACKDYN = (u, mk) => { const LIFT=16*u; return JACKS(360,LIFT,u,true)
  + (LIFT>1 ? `<path d="M618 128 V${(128-LIFT+1).toFixed(1)}" class="force" marker-end="url(#${mk}i)"/>` : '')
; };
FIG.jack = () => { const m = markers();
  return `<svg viewBox="0 0 660 320" aria-label="잭킹">${m.defs}
  ${ground(20,640,230)}
  ${JACKS(60,0,0,false)}
  <line class="ref" x1="452" y1="128" x2="640" y2="128"/>
  <g class="an-dyn" data-an="jack" data-mk="${m.id}">${JACKDYN(1,m.id)}</g>
  ${M(String.raw`\Delta h`,626,124,'start','ti',15)}
  ${lead(372,243,346,266,'점선 = 차체 높이가 그대로일 때 바퀴 위치 (지면 아래)','end')}
  <text x="150" y="302" text-anchor="middle" class="tb">직진</text><text x="450" y="302" text-anchor="middle" class="tb">조향 (KPI 있음)</text>
  <text x="330" y="22" text-anchor="middle">조향하면 바퀴가 기울어진 킹핀축을 따라 업라이트에 대해 아래로 내려가려 함</text>
  <text x="330" y="42" text-anchor="middle">→ 지면이 막으므로 링크 형상은 그대로, 차체 전체가 Δh만큼 들림</text>
  <text x="330" y="64" text-anchor="middle" class="tm">차체를 들어올리려는 무게 = 직진 복원 토크 (저속에서 핸들이 무거운 원인)</text>
</svg>`; };
ANIM.jack = { dyn:(u,mk)=>JACKDYN(0.5+0.5*Math.cos(2*Math.PI*u),mk), note:'조향각이 커질수록 차체가 들린다 (높이 과장)' };

/* ---------- 스윙암: 범프 시 캠버 (애니메이션: 차체 히브) ---------- */
const ROLLCAMDYN = (z, mk) => { const IC=[60,222+z], C=[548,270], l=C[0]-IC[0], g=-Math.atan(z/l)*180/Math.PI;
  return `<rect class="body" x="130" y="${(80+z).toFixed(1)}" width="240" height="46" rx="12"/>
  <text x="250" y="${(108+z).toFixed(1)}" text-anchor="middle" class="tm">차체</text>
  ${Math.abs(z)>2 ? `<path d="M392 80 V${(80+z).toFixed(1)}" class="force" marker-end="url(#${mk}i)"/>` : ''}
  <g transform="rotate(${g.toFixed(2)} ${C[0]} ${C[1]})"><rect class="rub" x="520" y="80" width="56" height="190" rx="18" style="opacity:.9"/></g>
  <line class="ref2" x1="${IC[0]}" y1="${IC[1].toFixed(1)}" x2="${C[0]}" y2="${C[1]}"/>
  <circle cx="${IC[0]}" cy="${IC[1].toFixed(1)}" r="7" class="pa"/><text x="${IC[0]-12}" y="${(IC[1]+5).toFixed(1)}" text-anchor="end" class="ta">IC</text>
`; };
FIG.rollcam = () => { const m = markers(); const z=28, l=548-60;
  return `<svg viewBox="0 0 640 340" aria-label="IC 중심 회전과 캠버">${m.defs}
  <rect class="body" x="130" y="80" width="240" height="46" rx="12" style="opacity:.35;stroke-dasharray:5 4"/>
  <rect class="rubg2" x="520" y="80" width="56" height="190" rx="18"/>
  <circle cx="60" cy="222" r="6" class="pa" style="opacity:.3"/>
  <g class="an-dyn" data-an="rollcam" data-mk="${m.id}">${ROLLCAMDYN(z,m.id)}</g>
  ${M('z',400,80+z/2+6,'start','ti',15)}
  <path d="M566 62 Q550 54 534 60" class="arcA" marker-end="url(#${m.id}a)"/>
  ${ground(20,620,270)}
  ${dimH(m.id,60,548,298,'$l\\ (\\text{정면 스윙암 길이})',322)}
  <text x="630" y="24" text-anchor="end" class="tm">흐린색 = 정적, 진한색 = 범프 z</text>
  ${M(String.raw`\Delta\gamma \approx \dfrac{z}{l}`,150,50,'start','tb',16)}
  <text x="100" y="182" class="tm">바퀴는 지면 위, 차체(IC 포함)가 z만큼 내려옴 = 범프 z</text>
  <text x="100" y="202" class="tm">바퀴는 차체에 대해 IC 중심으로 돌아 위가 안쪽으로 기운다(음 캠버)</text>
  <text x="100" y="222" class="tm">l이 짧을수록 같은 z에서 캠버가 많이 변한다</text>
</svg>`; };
ANIM.rollcam = { dyn:(u,mk)=>ROLLCAMDYN(28*(0.5+0.5*Math.cos(2*Math.PI*u)),mk), note:'차체가 내려갈수록(범프) 바퀴 위가 안쪽으로 (변위 과장)' };

/* ---------- ARB 한쪽 요철 (애니메이션: 요철 높이 z) ---------- */
const ARBDYN = (u, mk) => { const z=24*u, f=v=>v.toFixed(1), Ly=170-z;
  return `<rect x="78" y="${f(250-z)}" width="64" height="${f(z)}" rx="2" style="fill:var(--ink-2);opacity:.35"/>
  <rect class="rub" x="90" y="${f(140-z)}" width="40" height="110" rx="10"/>
  <path d="M170 ${f(Ly)} L200 ${f(154+(24-z)*0.35)} L200 186 L440 186 L440 162 L470 162" class="arbbar"/>
  <line class="rod" x1="170" y1="${f(Ly)}" x2="130" y2="${f(190-z)}"/><line class="rod" x1="470" y1="162" x2="510" y2="190"/>
  ${z>2?`<line class="dim" x1="66" y1="${f(250-z)}" x2="66" y2="250" marker-start="url(#${mk}t)" marker-end="url(#${mk}t)"/>`:''}
  <path d="M110 ${f(284+26*u)} V254" class="force" style="stroke-width:${f(3+2*u)}" marker-end="url(#${mk}i)"/>
  <path d="M530 ${f(284-16*u)} V254" class="force" style="stroke-width:${f(3-0.8*u)}" marker-end="url(#${mk}i)"/>
  ${u>0.05?`<path d="M300 ${f(176)} a20 10 0 1 0 22 0" style="fill:none;stroke:var(--accent);stroke-width:${f(1+1.6*u)}" marker-end="url(#${mk}a)"/><text x="336" y="176" class="ta" style="font-size:12px">비틀림</text>`:''}`; };
FIG.arb = () => { const m = markers();
  return `<svg viewBox="0 0 640 330" aria-label="ARB 동작">${m.defs}
  <rect class="body" x="150" y="60" width="340" height="60" rx="12"/>
  <rect class="rub" x="510" y="140" width="40" height="110" rx="10"/>
  ${[236,404].map(x=>`<line x1="${x}" y1="120" x2="${x}" y2="180" style="stroke:var(--steel);stroke-width:4;opacity:.55"/><rect x="${x-9}" y="178" width="18" height="16" rx="3" style="fill:#2f343c;opacity:.85"/>`).join('')}
  <text x="236" y="208" text-anchor="middle" class="tm" style="font-size:11px">부싱 마운트</text>
  <g class="an-dyn" data-an="arb" data-mk="${m.id}">${ARBDYN(1,m.id)}</g>
  ${M('z',58,243,'end','ti',15)}
  ${M(String.raw`F_{z0}+(k_w+k_{\mathrm{arb}})\,z`,124,288,'start','ti',15)}
  ${M(String.raw`F_{z0}-k_{\mathrm{arb}}\,z`,518,280,'end','ta',15)}
  <text x="124" y="312" class="ti">요철 바퀴: 하중 증가</text>
  <text x="518" y="304" text-anchor="end" class="ta">반대편 바퀴: 하중 감소</text>
  <text x="330" y="228" text-anchor="middle" class="tb">ARB(비틀림 막대)</text>
  <text x="320" y="36" text-anchor="middle" class="tm">뒤에서 본 모습 · 한쪽 바퀴만 요철 (차체가 아직 움직이지 않은 순간)</text>
  ${ground(20,620,250)}
</svg>`; };
ANIM.arb = { dyn:(u,mk)=>ARBDYN(0.5+0.5*Math.cos(2*Math.PI*u),mk), note:'요철이 높아지면 막대가 비틀리고, 반대편 바퀴 하중 화살표가 줄어든다' };

/* ---------- LSD 램프 (애니메이션: 핀이 램프를 타고 올라 링을 벌림) ----------
   원주 방향 = 그림의 세로. 핀(마름모 단면)과 링의 V홈 면이 원주 방향과 θ ≈ 50°(tan θ = 26/22).
   핀이 원주 방향으로 d 밀리면 링은 축 방향으로 e = d·tanθ 벌어지고 클러치 팩이 그만큼 눌린다. */
const LSDDYN = (u, mk) => { const d=7*u, e=d*26/22, f=v=>v.toFixed(1);
  const ringL=x=>`<polygon class="ring" points="${f(254-x)},96 ${f(322-x)},96 ${f(322-x)},134.8 ${f(304-x)},150 ${f(322-x)},165.2 ${f(322-x)},204 ${f(254-x)},204"/>`;
  const ringR=x=>`<polygon class="ring" points="${f(406+x)},96 ${f(338+x)},96 ${f(338+x)},134.8 ${f(356+x)},150 ${f(338+x)},165.2 ${f(338+x)},204 ${f(406+x)},204"/>`;
  const pack=(x0,x1)=>{ const w=x1-x0; return `<rect x="${f(x0)}" y="80" width="${f(w)}" height="140" class="clutch"/>`+[1,2,3,4].map(i=>`<line x1="${f(x0+w*i/5)}" y1="84" x2="${f(x0+w*i/5)}" y2="216" class="plate"/>`).join(''); };
  return `${pack(222,254-e)}${pack(406+e,438)}${ringL(e)}${ringR(e)}
  <polygon points="304,${f(150+d)} 330,${f(128+d)} 356,${f(150+d)} 330,${f(172+d)}" class="pin2"/>
  <path d="M${f(290-e)} 150 H${f(258-e)}" class="force" style="stroke-width:${f(2+2*u)}" marker-end="url(#${mk}i)"/><path d="M${f(370+e)} 150 H${f(402+e)}" class="force" style="stroke-width:${f(2+2*u)}" marker-end="url(#${mk}i)"/>
  <line x1="${f(356+e)}" y1="150" x2="${f(356+e)}" y2="186" style="stroke:var(--accent);stroke-width:1.2;stroke-dasharray:3 3"/>
  <path d="M${f(356+e)} 172 A22 22 0 0 1 ${f(339.2+e)} 164.2" style="fill:none;stroke:var(--accent);stroke-width:1.6"/><text x="${f(350+e)}" y="200" text-anchor="end" class="ta" style="font-style:italic">θ</text>
  ${d>0.8?`<path d="M330 100 V${f(118+d)}" style="stroke:var(--accent);stroke-width:2.6" marker-end="url(#${mk}a)"/><text x="336" y="90" class="ta" style="font-size:12px">원주 방향</text>`:''}`; };
FIG.lsd = () => { const m = markers();
  return `<svg viewBox="0 0 660 320" aria-label="LSD 램프 구조">${m.defs}
  <rect x="200" y="50" width="260" height="200" rx="16" class="lsdcase"/>
  <line x1="40" y1="150" x2="222" y2="150" class="shaftL"/><line x1="438" y1="150" x2="620" y2="150" class="shaftL"/>
  <g class="an-dyn" data-an="lsd" data-mk="${m.id}">${LSDDYN(1,m.id)}</g>
  <text x="330" y="40" text-anchor="middle" class="tb">입력 토크 → 하우징 → 크로스 핀</text>
  <text x="238" y="270" text-anchor="middle">클러치 팩</text><text x="422" y="270" text-anchor="middle">클러치 팩</text>
  <text x="288" y="232" text-anchor="middle" class="tm">압력 링</text>
  <text x="60" y="140">왼쪽 출력축</text><text x="600" y="140" text-anchor="end">오른쪽 출력축</text>
  ${M(String.raw`F_{\mathrm{ax}} \propto \dfrac{T}{r_{\mathrm{ramp}}}\cot\theta`,478,96,'start','tb',14)}
  <text x="20" y="292" class="tm">토크가 걸리면 핀이 원주 방향으로 밀려 V홈 면을 타고 올라 → 압력 링이 벌어져 클러치를 눌러 좌우가 묶임</text>
  <text x="20" y="312" class="tm">θ = 램프 면과 회전(원주) 방향 사이 각 · 90°면 축력 0 (오픈) · 램프는 원주 방향(그림의 세로)으로 펼쳐 그림</text>
</svg>`; };
ANIM.lsd = { dyn:(u,mk)=>LSDDYN(0.5+0.5*Math.cos(2*Math.PI*u),mk), note:'핀이 원주 방향으로 d 밀리면 링이 d·tanθ씩 벌어진다 (변위 과장)' };


/* ---------- 언더·뉴트럴·오버 정의 (위에서 본 경로 + δ–a_y) ---------- */
FIG.usteer = () => { const m = markers(); const O=[200,290], R=130, D=Math.PI/180;
  const path = k => rng(0,112,2).map(p=>{ const r=R*(1+k*p/90); return [ (O[0]-r*Math.cos(p*D)).toFixed(1), (O[1]-r*Math.sin(p*D)).toFixed(1) ]; });
  const end = k => { const p=112, r=R*(1+k*p/90); return [O[0]-r*Math.cos(p*D), O[1]-r*Math.sin(p*D)]; };
  const P = plot({x0:430,y0:70,w:210,h:190,xr:[0,1],yr:[0,2],xt:[],yt:[],xl:'$a_y',yl:'$\\delta'});
  const eU=end(0.32), eO=end(-0.3), eN=end(0);
  return `<svg viewBox="0 0 680 350" aria-label="언더 뉴트럴 오버">${m.defs}
  <circle cx="${O[0]}" cy="${O[1]}" r="4" class="pi"/><text x="${O[0]+8}" y="${O[1]+16}" class="tm">선회 중심</text>
  ${poly(path(0),'ln','style="stroke:var(--muted);stroke-dasharray:6 4"')}
  ${poly(path(0.32),'ln ln-in')}${poly(path(-0.3),'ln ln-ac')}
  <path d="M${eU[0].toFixed(1)} ${eU[1].toFixed(1)} l14 4" class="force" style="stroke-width:2.6" marker-end="url(#${m.id}i)"/>
  <path d="M${eO[0].toFixed(1)} ${eO[1].toFixed(1)} l12 6" class="arcA" style="stroke-width:2.6" marker-end="url(#${m.id}a)"/>
  <g transform="translate(${O[0]-R} ${O[1]})"><rect x="-8" y="-14" width="16" height="34" rx="6" class="body"/><rect x="-11" y="-14" width="5" height="10" rx="2" class="rub"/><rect x="6" y="-14" width="5" height="10" rx="2" class="rub"/><rect x="-11" y="10" width="5" height="10" rx="2" class="rub"/><rect x="6" y="10" width="5" height="10" rx="2" class="rub"/></g>
  <text x="${O[0]-R-14}" y="${O[1]+40}" class="tm">출발 (같은 조향각 δ)</text>
  <text x="${(eU[0]+28).toFixed(0)}" y="${(eU[1]+8).toFixed(0)}" class="ti">언더 (K &gt; 0)</text><text x="${(eU[0]+28).toFixed(0)}" y="${(eU[1]+26).toFixed(0)}" class="ti" style="font-weight:400">바깥으로 벌어짐</text>
  <text x="${(eO[0]+18).toFixed(0)}" y="${(eO[1]+26).toFixed(0)}" class="ta">오버 (K &lt; 0)</text><text x="${(eO[0]+18).toFixed(0)}" y="${(eO[1]+44).toFixed(0)}" class="ta" style="font-weight:400">안으로 말려듦</text>
  <text x="${(eN[0]+10).toFixed(0)}" y="${(eN[1]+6).toFixed(0)}" class="tm">뉴트럴 (K = 0): 같은 원</text>
  <text x="20" y="28" class="tb">① 조향각을 그대로 두고 속도만 올리면</text>
  ${P.s}
  <line x1="${P.X(0)}" y1="${P.Y(1)}" x2="${P.X(1)}" y2="${P.Y(1.6)}" class="ln ln-in"/>
  <line x1="${P.X(0)}" y1="${P.Y(1)}" x2="${P.X(1)}" y2="${P.Y(1)}" class="ln" style="stroke:var(--muted);stroke-dasharray:6 4"/>
  <line x1="${P.X(0)}" y1="${P.Y(1)}" x2="${P.X(1)}" y2="${P.Y(0.4)}" class="ln ln-ac"/>
  ${M('L/R',P.X(0)-6,P.Y(1)+5,'end','tb',13)}
  <text x="${P.X(1)-4}" y="${P.Y(1.6)-8}" text-anchor="end" class="ti">언더: 기울기 K &gt; 0</text>
  <text x="${P.X(1)-4}" y="${P.Y(1)-8}" text-anchor="end" class="tm">뉴트럴</text>
  <text x="${P.X(1)-4}" y="${P.Y(0.4)+18}" text-anchor="end" class="ta">오버: K &lt; 0</text>
  <text x="410" y="28" class="tb">② 같은 원을 지키는 데 필요한 조향각</text>
</svg>`; };

/* ---------- 제동 하중 이동 (측면, 이상 배분) ----------
   스케일: mg = 70 px, L = 430 px. 예: μ 1.5, h 0.29 m, L 1.55 m(h/L = 0.187 → 80 px), b = L/2 → F_zf = 0.78 mg, F_zr = 0.22 mg */
FIG.brakelt = () => { const m = markers(); const xf=130, xr=560, Lp=xr-xf, cg=[345,280-Math.round(0.29/1.55*430)], hp=280-cg[1], b=xr-cg[0], mu=1.5, s=70;
  const Ff=s*(b+mu*hp)/Lp, Fr=s-Ff, f=v=>v.toFixed(1);
  return `<svg viewBox="0 0 660 370" aria-label="제동 하중 이동">${m.defs}
  <rect class="body" x="90" y="150" width="520" height="62" rx="26"/>
  <circle cx="${xf}" cy="230" r="50" class="rubg2"/><circle cx="${xr}" cy="230" r="50" class="rubg2"/>
  ${ground(20,640,280)}
  <circle cx="${cg[0]}" cy="${cg[1]}" r="7" class="pi"/><text x="${cg[0]+10}" y="${cg[1]-10}" class="tb">CG</text>
  <path d="M${cg[0]} ${cg[1]+8} V${cg[1]+s}" class="force" marker-end="url(#${m.id}i)"/>${M('mg',cg[0]+8,cg[1]+s-4,'start','ti',14)}
  <path d="M${cg[0]-8} ${cg[1]} H${f(cg[0]-mu*s)}" class="force" style="stroke:var(--accent)" marker-end="url(#${m.id}a)"/>${M(String.raw`\mu m g`,cg[0]-mu*s/2,cg[1]-10,'middle','ta',14)}
  <text x="${f(cg[0]-mu*s/2)}" y="${cg[1]+22}" text-anchor="middle" class="ta" style="font-weight:400;font-size:12px">관성력 (감속 μg)</text>
  <path d="M${xf} 280 V${f(280-Ff)}" class="force" marker-end="url(#${m.id}i)"/>${M(String.raw`F_{z,f}`,xf+8,f(280-Ff+14),'start','ti',14)}
  <path d="M${xr} 280 V${f(280-Fr)}" class="force" marker-end="url(#${m.id}i)"/>${M(String.raw`F_{z,r}`,xr+8,f(280-Fr-4),'start','ti',14)}
  <path d="M${xf+4} 276 H${f(xf+4+mu*Ff*0.6)}" class="force" style="stroke-width:2.2" marker-end="url(#${m.id}i)"/>${M(String.raw`\mu F_{z,f}`,xf+30,302,'start','ti',13)}
  <path d="M${xr+4} 276 H${f(xr+4+mu*Fr*0.6)}" class="force" style="stroke-width:2.2" marker-end="url(#${m.id}i)"/>${M(String.raw`\mu F_{z,r}`,xr+8,302,'start','ti',13)}
  <line class="ext" x1="${cg[0]+7}" y1="${cg[1]}" x2="636" y2="${cg[1]}"/>
  ${dimV(m.id,630,cg[1],280,'$h',622,'end')}
  <line class="ext" x1="${cg[0]}" y1="${cg[1]+s+4}" x2="${cg[0]}" y2="326"/>
  ${dimH(m.id,cg[0],xr,320,'$b',314)}
  ${dimH(m.id,xf,xr,350,'$L',344)}
  <text x="40" y="30" class="tb">← 진행 방향 (제동 중)</text>
  ${M(String.raw`F_{z,f}\,L = m g\,b + \mu m g\,h \;\Rightarrow\; \beta_{\mathrm{ideal}} = \dfrac{F_{z,f}}{m g} = \dfrac{b+\mu h}{L}`,250,40,'start','tb',14)}
  <text x="250" y="78" class="tm">뒤 접지점 기준 모멘트 평형 · 바퀴마다 최대 제동력 = μF_z</text>
  <text x="250" y="98" class="tm">예: μ 1.5, h 0.29 m, L 1.55 m, b = L/2 → β ≈ 0.78 (화살표 길이도 이 비율)</text>
</svg>`; };

/* ---------- 답력 → 압력 → 토크 (페달 · 밸런스 바 · MC · 캘리퍼 단면) ---------- */
FIG.brakechain = () => { const m = markers(); const PV=[70,292], PAD=[94,112], yr=245, xr=PV[0]+(PAD[0]-PV[0])*(PV[1]-yr)/(PV[1]-PAD[1]);
  const mc = (y,lbl) => `<rect x="182" y="${y-13}" width="98" height="26" rx="4" style="fill:#e9edf1;stroke:var(--steel);stroke-width:1.6"/>
    <rect x="200" y="${y-10}" width="76" height="20" style="fill:var(--in);opacity:.18"/><rect x="186" y="${y-10}" width="14" height="20" rx="2" style="fill:var(--steel)"/>
    <text x="231" y="${y-18}" text-anchor="middle" class="tb" style="font-size:12px">${lbl}</text>`;
  const AX=300, pc=136;
  return `<svg viewBox="0 0 720 340" aria-label="답력에서 제동 토크까지">${m.defs}
  ${ground(20,170,300)}
  <line x1="${PV[0]}" y1="${PV[1]}" x2="${PAD[0]}" y2="${PAD[1]}" class="arm" style="stroke-width:8"/>
  <rect x="${PAD[0]-4}" y="${PAD[1]-16}" width="10" height="34" rx="3" style="fill:var(--ink-2)"/>
  <circle cx="${PV[0]}" cy="${PV[1]}" r="6" class="bj"/>
  <path d="M28 ${PAD[1]} H${PAD[0]-8}" class="force" marker-end="url(#${m.id}i)"/>${M(String.raw`F_{\mathrm{pedal}}`,28,PAD[1]-10,'start','ti',14)}
  <line x1="${xr.toFixed(1)}" y1="${yr}" x2="150" y2="${yr}" class="rod"/>
  <line x1="${PV[0]-16}" y1="${PAD[1]}" x2="${PV[0]-16}" y2="${PV[1]}" class="rlen"/><line x1="${PV[0]-6}" y1="${yr}" x2="${PV[0]-6}" y2="${PV[1]}" class="rlen" style="stroke:var(--in)"/>
  ${M('l_1',PV[0]-20,200,'end','ta',14)}${M('l_2',PV[0]-10,272,'end','ti',13)}
  <line x1="150" y1="212" x2="150" y2="278" style="stroke:var(--steel);stroke-width:6;stroke-linecap:round"/><circle cx="150" cy="${yr}" r="5" class="bj"/>
  <line x1="150" y1="215" x2="186" y2="215" class="rod"/><line x1="150" y1="275" x2="186" y2="275" class="rod"/>
  ${M(String.raw`\lambda`,160,208,'start','ta',14)}${M(String.raw`1-\lambda`,160,296,'start','ta',13)}
  ${mc(215,'앞 MC')}${mc(275,'뒤 MC')}
  ${M(String.raw`A_{\mathrm{MC}}`,238,240,'middle','ti',13)}
  <path d="M280 215 H450 V${pc} H540" style="fill:none;stroke:var(--in);stroke-width:3"/>
  <path d="M280 275 H360" style="fill:none;stroke:var(--in);stroke-width:3"/><text x="366" y="280" class="tm">→ 뒤 캘리퍼</text>
  ${M('p',372,207,'middle','ti',16)}<text x="372" y="190" text-anchor="middle" class="ti" style="font-weight:400;font-size:12px">회로 안 어디서나 같은 압력 (파스칼)</text>
  <line x1="520" y1="${AX}" x2="700" y2="${AX}" style="stroke:var(--muted);stroke-width:1.2;stroke-dasharray:12 4 2 4"/><text x="700" y="${AX+16}" text-anchor="end" class="tm">회전축</text>
  <rect x="585" y="110" width="12" height="${AX-110}" style="fill:#b9c0c7;stroke:var(--steel)"/>
  <path d="M543 96 H639 V172 H609 V112 H573 V172 H543 Z" style="fill:var(--alu);stroke:var(--alu-d);stroke-width:1.5"/>
  <rect x="551" y="118" width="22" height="36" style="fill:var(--in);opacity:.22"/><rect x="609" y="118" width="22" height="36" style="fill:var(--in);opacity:.22"/>
  <rect x="565" y="120" width="12" height="32" rx="2" style="fill:var(--steel)"/><rect x="605" y="120" width="12" height="32" rx="2" style="fill:var(--steel)"/>
  <rect x="577" y="116" width="8" height="40" style="fill:#6b4f2e"/><rect x="597" y="116" width="8" height="40" style="fill:#6b4f2e"/>
  <path d="M553 ${pc} H563" class="force" style="stroke-width:2.4" marker-end="url(#${m.id}i)"/><path d="M629 ${pc} H619" class="force" style="stroke-width:2.4" marker-end="url(#${m.id}i)"/>
  <line class="ext" x1="605" y1="${pc}" x2="686" y2="${pc}"/>
  ${dimV(m.id,680,pc,AX,'$r_{\\mathrm{eff}}',688,'start')}
  ${lead(591,240,640,240,'디스크')}${lead(581,150,520,168,'패드','end')}${lead(560,100,520,84,'캘리퍼 (단면)','end')}
  ${M(String.raw`p\,A_{\mathrm{cal}}`,532,192,'end','ti',13)}
  <text x="12" y="330" class="tm">페달비 i = l₁ / l₂ · 패드 2장이 디스크 양면을 μ·p·A_cal로 문지름 (마찰력은 지면 안쪽 방향)</text>
  ${M(String.raw`p = \dfrac{F_{\mathrm{pedal}}\, i_{\mathrm{pedal}}\, \lambda}{A_{\mathrm{MC}}}`,190,40,'start','tb',14)}
  ${M(String.raw`T = 2\,\mu_{\mathrm{pad}}\, p\, A_{\mathrm{cal}}\, r_{\mathrm{eff}}`,470,40,'start','tb',14)}
</svg>`; };

/* ---------- 헤어핀과 필요 조향각 (위에서 본 그림, 1 m = 50 px) ----------
   R_out 4.5 m, L 1.55 m, w/2 0.65 m → R = √(4.5² − 1.55²) − 0.65 = 3.575 m, δ = arctan(L/R) = 23.4° */
FIG.hairpin = () => { const m = markers(); const k=50, O=[70,340], Ro=4.5, L=1.55, w2=0.65, R=Math.sqrt(Ro*Ro-L*L)-w2, D=Math.PI/180, f=v=>v.toFixed(1);
  const xr=O[0]+R*k, yf=O[1]-L*k, xo=xr+w2*k, tw=(w2-0.1)*k;
  const arcP=(r,a0,a1)=>rng(a0,a1,2).map(a=>[f(O[0]+r*Math.cos(a*D)), f(O[1]-r*Math.sin(a*D))]);
  const dl=Math.atan(L/R)/D, di=Math.atan(L/(R-(w2-0.1)))/D, dO=Math.atan(L/(R+(w2-0.1)))/D;
  const Wh=(x,y,a)=>`<g transform="rotate(${(-a).toFixed(2)} ${f(x)} ${f(y)})"><rect class="rub" x="${f(x-5)}" y="${f(y-12.5)}" width="10" height="25" rx="3"/></g>`;
  return `<svg viewBox="0 30 640 380" aria-label="헤어핀과 필요 조향각">${m.defs}
  ${poly(arcP(Ro*k,0,82),'ln','style="stroke:var(--ink-2);stroke-width:4"')}
  ${poly(arcP(R*k,0,50),'ref')}
  <circle cx="${O[0]}" cy="${O[1]}" r="5" class="pa"/><text x="${O[0]-4}" y="${O[1]+22}" class="ta">회전 중심</text>
  <line class="ref" x1="${O[0]}" y1="${O[1]}" x2="${f(xr)}" y2="${O[1]}"/><line x1="${O[0]}" y1="${O[1]}" x2="${f(xr)}" y2="${f(yf)}" style="stroke:var(--ink-2);stroke-width:1.4"/><circle cx="${f(xr)}" cy="${f(yf)}" r="3" class="pi"/>
  <path class="arcA" d="M${O[0]+120} ${O[1]} A120 120 0 0 0 ${f(O[0]+120*Math.cos(dl*D))} ${f(O[1]-120*Math.sin(dl*D))}" style="stroke-width:2.4"/>${M(String.raw`\delta`,O[0]+128,O[1]-16,'start','ta',15)}
  
  <rect class="body" x="${f(xr-12)}" y="${f(yf-22)}" width="24" height="${f(L*k+40)}" rx="10"/>
  ${Wh(xr-tw,O[1],0)}${Wh(xr+tw,O[1],0)}${Wh(xr-tw,yf,di)}${Wh(xr+tw,yf,dO)}
  <line class="rlen" x1="${O[0]}" y1="${O[1]}" x2="${f(xo)}" y2="${f(yf)}"/><circle cx="${f(xo)}" cy="${f(yf)}" r="4.5" class="pa"/>
  ${M(String.raw`R_{\mathrm{out}}`,150,250,'end','ta',15)}
  <line class="ref" x1="${f(xo)}" y1="${f(yf)}" x2="${f(xo)}" y2="372"/><line class="ref" x1="${f(xr)}" y1="${f(yf+20)}" x2="${f(xr)}" y2="372"/>
  <line class="ext" x1="${O[0]}" y1="${O[1]+30}" x2="${O[0]}" y2="372"/>
  ${dimH(m.id,O[0],xr,366,'$R',392)}
  <line class="dim" x1="${f(xr)}" y1="366" x2="${f(xo)}" y2="366" marker-start="url(#${m.id}t)" marker-end="url(#${m.id}t)"/>${M('w/2',f(xo+6),371,'start','ti',14)}
  <line class="ext" x1="${f(xo+8)}" y1="${f(yf)}" x2="${f(xo+44)}" y2="${f(yf)}"/><line class="ext" x1="${f(xr+16)}" y1="${O[1]}" x2="${f(xo+44)}" y2="${O[1]}"/>
  ${dimV(m.id,xo+38,yf,O[1],'$L',xo+46,'start')}
  <text x="${f(O[0]+Ro*k*Math.cos(62*D)+10)}" y="${f(O[1]-Ro*k*Math.sin(62*D)-6)}" class="tb">헤어핀 바깥 경계 (외경 9 m)</text>
  <text x="${f(O[0]+R*k*Math.cos(46*D)-6)}" y="${f(O[1]-R*k*Math.sin(46*D)+4)}" text-anchor="end" class="tm">뒤차축 중앙이 그리는 원</text>
  <text x="${f(xo+12)}" y="${f(yf-14)}" class="ta">바깥 앞바퀴 바깥 끝</text>
  ${M(String.raw`\left(R+\tfrac{w}{2}\right)^2 + L^2 \le R_{\mathrm{out}}^2`,360,80,'start','tb',14)}
  ${M(String.raw`\delta \approx \arctan\dfrac{L}{R}`,360,124,'start','tb',14)}
  <text x="360" y="168" class="tm">R<tspan dy="4" style="font-size:10px">out</tspan><tspan dy="-4"> 4.5 m, L 1.55 m, w/2 0.65 m</tspan></text><text x="360" y="188" class="tm">→ R ≈ 3.57 m, δ ≈ 23.4°</text>
</svg>`; };

/* ---------- 디레이팅 곡선 (온도 → 토크 상한) ---------- */
FIG.derate = () => { const m = markers(); const P = plot({x0:90,y0:46,w:470,h:200,xr:[0,100],yr:[0,1.25],xt:[],yt:[],xl:'온도 θ',yl:'토크 상한 T_max'});
  const ts=50, te=74, ps=82, pe=96;
  return `<svg viewBox="0 0 700 320" aria-label="디레이팅 곡선">${m.defs}
  ${P.s}
  <rect x="${P.X(ts-8)}" y="46" width="${P.X(ts+2)-P.X(ts-8)}" height="200" style="fill:var(--accent);opacity:.08"/>
  ${poly([[P.X(0),P.Y(1)],[P.X(ps),P.Y(1)],[P.X(pe),P.Y(0)]],'ln','style="stroke:var(--muted);stroke-dasharray:6 4"')}
  ${poly([[P.X(0),P.Y(1)],[P.X(ts),P.Y(1)],[P.X(te),P.Y(0)],[P.X(100),P.Y(0)]],'ln ln-ac')}
  ${[ts,te,ps,pe].map(v=>`<line class="ref" x1="${P.X(v)}" y1="${P.Y(1)}" x2="${P.X(v)}" y2="${P.Y(0)+4}"/>`).join('')}
  ${M(String.raw`\theta_s`,P.X(ts),P.Y(0)+20,'middle','ta',14)}${M(String.raw`\theta_e`,P.X(te),P.Y(0)+20,'middle','ta',14)}
  ${M(String.raw`T_{\mathrm{rated}}`,P.X(0)-6,P.Y(1)+5,'end','tb',13)}<text x="${P.X(0)-6}" y="${P.Y(0)+4}" text-anchor="end" class="tick">0</text>
  <text x="${P.X(ts+14)}" y="${P.Y(0.62)}" class="ta">VCU 디레이팅 (먼저 작동)</text>
  <text x="${P.X(pe)+6}" y="${P.Y(0.2)}" class="tm">제품 기본 디레이팅</text><text x="${P.X(pe)+6}" y="${P.Y(0.2)+16}" class="tm">(매뉴얼 확인)</text>
  <text x="${P.X(ts-3)}" y="${P.Y(1)-10}" text-anchor="middle" class="tm" style="font-size:11.5px">내구 후반에 닿을 듯 말 듯</text>
  <text x="${P.X(100)}" y="${P.Y(1.17)}" text-anchor="end" class="tm">θ<tspan dy="4" style="font-size:10px">e</tspan><tspan dy="-4">를 제품 디레이팅 시작보다 낮게 → 제품 쪽 디레이팅이 작동할 일이 없음</tspan></text>
</svg>`; };

/* ---------- 안티 0% vs 30%: 제동 피치 (측면, 변위 3배 과장) ----------
   앞 히브: 908 N / (2 × 17.3 N/mm) = 26.2 mm (0%), 636 N → 18.4 mm (30%). 뒤: −908 N → 26.2 mm 신장 (뒤 안티 0 가정, 같은 휠 레이트).
   그림: 1 px = 5 mm, ×3 과장 → 앞 15.7 / 11.0 px, 뒤 15.7 px */
FIG.antipitch = () => { const m = markers(); const ex=3/5;
  const row = (y0, ttl, front, spring, link) => { const fF=front*ex, fR=-26.2*ex, xf=130, xr=560, off=x=>fF+(fR-fF)*(x-xf)/(xr-xf);
    const by=y0+20, bh=50, c=[[90,by],[610,by],[610,by+bh],[90,by+bh]].map(([x,y])=>[x,y+off(x)]);
    return `<text x="20" y="${y0}" class="tb">${ttl}</text>
    <rect x="90" y="${by}" width="520" height="${bh}" rx="18" style="fill:none;stroke:var(--muted);stroke-width:1.2;stroke-dasharray:5 4"/>
    <polygon class="body" points="${c.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}"/>
    <circle cx="${xf}" cy="${y0+96}" r="34" class="rubg2"/><circle cx="${xr}" cy="${y0+96}" r="34" class="rubg2"/>
    ${ground(40,640,y0+130)}
    <path d="M${xf+48} ${by+bh} V${(by+bh+fF).toFixed(1)}" class="force" style="stroke-width:2.4" marker-end="url(#${m.id}i)"/>
    <text x="${xf+64}" y="${(by+bh+fF+16).toFixed(1)}" class="ti">앞 ${front} mm 압축</text>
    <text x="${xf+64}" y="${(by+bh+fF+34).toFixed(1)}" class="tm">스프링 ${spring}${link?` + 링크 ${link}`:''}</text>
    <path d="M${xr-48} ${by} V${(by+fR).toFixed(1)}" class="force" style="stroke-width:2.4" marker-end="url(#${m.id}i)"/>
    <text x="${xr-64}" y="${(by+fR+4).toFixed(1)}" text-anchor="end" class="ti">뒤 26.2 mm 신장</text>`; };
  return `<svg viewBox="0 0 660 352" aria-label="제동 피치 안티 0%와 30%">${m.defs}
  ${row(30,'안티 0%','26.2','908 N','')}
  ${row(180,'안티다이브 30%','18.4','636 N','272 N')}
  <text x="640" y="344" text-anchor="end" class="tm">← 진행 방향 · 제동 1.5 g · 점선 = 정지 · 변위 3배 과장</text>
</svg>`; };

/* ---------- QSS 속도 프로필 (예시 코스) ----------
   코너 3개(R 9·25·12 m), a_y,max 1.5 g, 제동 1.5 g, 구동 min(1.0 g, P/(m v)) − 공기저항(C_dA 1.2 m²), P 80 kW, m 330 kg, 최고속 120 km/h(감속비 한계) */
const QSS = (() => { const g=9.807, ay=1.5*g, ab=1.5*g, m=330, P=80000, S=500, ds=0.5;
  const C=[{s:100,l:20,R:9},{s:250,l:30,R:25},{s:410,l:20,R:12}].map(c=>({...c,v:Math.sqrt(ay*c.R)}));
  const N=Math.round(S/ds)+1, lim=new Array(N).fill(60);
  C.forEach(c=>{ for(let i=Math.round(c.s/ds); i<=Math.round((c.s+c.l)/ds); i++) lim[i]=c.v; });
  const CdA=1.2, rho=1.2, vmax=120/3.6, ax=v=>v>=vmax?0:Math.min(1.0*g, P/(m*Math.max(v,1)))-0.5*rho*CdA*v*v/m;
  const fwd=new Array(N), bwd=new Array(N); fwd[0]=C[2].v; // 한 바퀴 이어짐: 마지막 코너 속도로 출발
  for(let i=1;i<N;i++) fwd[i]=Math.min(lim[i], vmax, Math.sqrt(Math.max(0,fwd[i-1]**2+2*ax(fwd[i-1])*ds)));
  bwd[N-1]=lim[N-1]; for(let i=N-2;i>=0;i--) bwd[i]=Math.min(lim[i], Math.sqrt(bwd[i+1]**2+2*ab*ds));
  const v=fwd.map((a,i)=>Math.min(a,bwd[i])); let t=0; for(let i=1;i<N;i++) t+=ds/((v[i]+v[i-1])/2);
  // 코너별 가속·제동 곡선(교차 전후까지 연장해 보여 주기용)
  const acc=C.map(c=>{ const o=[]; let s=c.s+c.l, w=c.v; while(s<=S && s<c.s+c.l+200){ o.push([s,w]); w=Math.min(vmax,Math.sqrt(w*w+2*Math.max(0,ax(w))*ds)); s+=ds; } return o; });
  const brk=C.map(c=>{ const o=[]; let s=c.s, w=c.v; while(s>=0 && w<vmax+3){ o.push([s,w]); w=Math.sqrt(w*w+2*ab*ds); s-=ds; } return o; });
  return {C,v,ds,t,acc,brk,S}; })();
FIG.qss = () => { const m = markers(); const Q=QSS, K=3.6;
  const P = plot({x0:80,y0:40,w:500,h:220,xr:[0,500],yr:[0,140],xt:[0,100,200,300,400,500],yt:[0,40,80,120],xl:'코스 위치 s [m]',yl:'속도 v [km/h]'});
  const pt=a=>a.filter((_,i)=>i%4===0).map(([s,w])=>[P.X(s).toFixed(1),P.Y(Math.min(w*K,140)).toFixed(1)]);
  const env=Q.v.map((w,i)=>[i*Q.ds,w]);
  return `<svg viewBox="0 0 640 330" aria-label="QSS 속도 프로필">${m.defs}
  ${P.s}
  ${Q.C.map(c=>`<rect x="${P.X(c.s)}" y="40" width="${P.X(c.s+c.l)-P.X(c.s)}" height="220" style="fill:var(--accent);opacity:.08"/><line x1="${P.X(c.s)}" y1="${P.Y(c.v*K)}" x2="${P.X(c.s+c.l)}" y2="${P.Y(c.v*K)}" style="stroke:var(--accent);stroke-width:4"/><text x="${P.X(c.s+c.l/2)}" y="${P.Y(c.v*K)+18}" text-anchor="middle" class="ta" style="font-size:12px">R ${c.R} m</text>`).join('')}
  ${poly(pt(env),'ln ln-ink','style="stroke-width:9;opacity:.16"')}
  ${Q.acc.map(a=>poly(pt(a),'ln ln-in','style="stroke-width:1.8"')).join('')}
  ${Q.brk.map(a=>poly(pt(a),'ln','style="stroke:var(--accent);stroke-width:1.8"')).join('')}
  <line class="leader" x1="${P.X(290)}" y1="${P.Y(82)}" x2="${P.X(318)}" y2="${P.Y(30)}"/><text x="${P.X(322)}" y="${P.Y(26)}" class="ti">가속 한계 (코너 끝에서 앞으로 적분)</text>
  <text x="${P.X(300)}" y="${P.Y(126)}" text-anchor="middle" class="tm" style="font-size:11.5px">최고속 상한 (감속비)</text>
  <text x="${P.X(238)}" y="${P.Y(104)}" class="ta">제동 한계</text><text x="${P.X(238)}" y="${P.Y(104)}" dy="16" class="ta" style="font-weight:400">(코너 입구에서 뒤로 적분)</text>
  <text x="${P.X(5)}" y="${P.Y(14)}" class="ta">■ 선회 한계 √(a<tspan dy="4" style="font-size:10px">y</tspan><tspan dy="-4"> R)</tspan></text>
  <text x="${P.X(495)}" y="${P.Y(8)}" text-anchor="end" class="tb">굵은 회색 띠 = 세 한계의 최솟값 = 실제 v(s) · 이 예시 t ≈ ${Q.t.toFixed(1)} s</text>
</svg>`; };

/* ---------- 밸런스 바 (위에서 본 개념도) ---------- */
FIG.balbar = () => { const m = markers();
  const one = (x0, c, ttl) => { const yt=70, yb=230, a=c-yt, b=yb-c, Ff=80*b/(a+b), Fr=80*a/(a+b), lam=b/(a+b);
    return `<text x="${x0+130}" y="26" text-anchor="middle" class="tb">${ttl}</text>
    <path d="M${x0} ${c} H${x0+74}" class="force" marker-end="url(#${m.id}i)"/>${M('F',x0,c-8,'start','ti',14)}
    <rect x="${x0+70}" y="${c-14}" width="30" height="28" rx="4" style="fill:var(--alu);stroke:var(--alu-d)"/><circle cx="${x0+90}" cy="${c}" r="6" class="bj"/>
    <line x1="${x0+90}" y1="${yt-6}" x2="${x0+90}" y2="${yb+6}" style="stroke:var(--steel);stroke-width:6;stroke-linecap:round"/>
    <line x1="${x0+90}" y1="${yt}" x2="${x0+170}" y2="${yt}" class="rod"/><line x1="${x0+90}" y1="${yb}" x2="${x0+170}" y2="${yb}" class="rod"/>
    <rect x="${x0+170}" y="${yt-12}" width="64" height="24" rx="4" style="fill:#e9edf1;stroke:var(--steel)"/><text x="${x0+202}" y="${yt+5}" text-anchor="middle" style="font-size:12px">앞 MC</text>
    <rect x="${x0+170}" y="${yb-12}" width="64" height="24" rx="4" style="fill:#e9edf1;stroke:var(--steel)"/><text x="${x0+202}" y="${yb+5}" text-anchor="middle" style="font-size:12px">뒤 MC</text>
    <path d="M${x0+104} ${yt-12} h${Ff.toFixed(1)}" class="force" style="stroke:var(--accent);stroke-width:${(1.5+Ff/16).toFixed(1)}" marker-end="url(#${m.id}a)"/>
    <path d="M${x0+104} ${yb+12} h${Fr.toFixed(1)}" class="force" style="stroke:var(--accent);stroke-width:${(1.5+Fr/16).toFixed(1)}" marker-end="url(#${m.id}a)"/>
    ${dimV(m.id,x0+56,yt,c,'$a',x0+48,'end')}${dimV(m.id,x0+56,c,yb,'$b',x0+48,'end')}
    <text x="${x0+104}" y="${yt-24}" class="ta" style="font-size:12px">F<tspan dy="4" style="font-size:10px">앞</tspan></text><text x="${x0+104}" y="${yb+36}" class="ta" style="font-size:12px">F<tspan dy="4" style="font-size:10px">뒤</tspan></text>
    <text x="${x0+120}" y="${yb+56}" text-anchor="middle" class="ta">λ = b/(a+b) = ${lam.toFixed(2)}</text>`; };
  return `<svg viewBox="0 0 660 320" aria-label="밸런스 바">${m.defs}
  ${one(30,150,'피벗이 가운데')}${one(350,120,'조절 나사로 피벗을 앞 MC 쪽(위)으로')}
  <text x="330" y="312" text-anchor="middle" class="tm">피벗(페달 쪽 구면 베어링) 둘레 모멘트 평형: F_앞·a = F_뒤·b → 피벗에 가까운 쪽 MC가 더 큰 힘을 받음</text>
</svg>`; };

/* ---------- 페달 맵 (페달 위치 → 토크 명령) ---------- */
FIG.pedalmap = () => { const m = markers(); const P = plot({x0:90,y0:40,w:440,h:210,xr:[0,100],yr:[0,1.15],xt:[0,100],yt:[],xl:'페달 위치 p [%]',yl:'토크 명령 T_drv'});
  const p0=10, p1=90, cur=k=>rng(0,100,1).map(p=>{ const x=Math.min(1,Math.max(0,(p-p0)/(p1-p0))); return [P.X(p).toFixed(1),P.Y(k?x*x:x).toFixed(1)]; });
  return `<svg viewBox="0 0 640 310" aria-label="페달 맵">${m.defs}
  ${P.s}
  <rect x="${P.X(0)}" y="40" width="${P.X(p0)-P.X(0)}" height="210" style="fill:var(--muted);opacity:.12"/><rect x="${P.X(p1)}" y="40" width="${P.X(100)-P.X(p1)}" height="210" style="fill:var(--muted);opacity:.12"/>
  ${poly(cur(false),'ln ln-in','style="stroke-dasharray:6 4"')}${poly(cur(true),'ln ln-ac')}
  ${M('p_0',P.X(p0),P.Y(0)+18,'middle','tb',13)}${M('p_1',P.X(p1),P.Y(0)+18,'middle','tb',13)}
  ${M(String.raw`T_{\max}`,P.X(0)-6,P.Y(1)+5,'end','tb',13)}<text x="${P.X(0)-6}" y="${P.Y(0)+4}" text-anchor="end" class="tick">0</text>
  <line class="ref" x1="${P.X(0)}" y1="${P.Y(1)}" x2="${P.X(100)}" y2="${P.Y(1)}"/>
  <text x="${P.X(p0/2)}" y="${P.Y(0.5)}" text-anchor="middle" class="tm" style="font-size:11.5px">시작</text><text x="${P.X(p0/2)}" y="${P.Y(0.5)+16}" text-anchor="middle" class="tm" style="font-size:11.5px">데드밴드</text>
  <text x="${P.X((p1+100)/2)}" y="${P.Y(0.5)}" text-anchor="middle" class="tm" style="font-size:11.5px">끝</text><text x="${P.X((p1+100)/2)}" y="${P.Y(0.5)+16}" text-anchor="middle" class="tm" style="font-size:11.5px">데드밴드</text>
  <text x="${P.X(36)}" y="${P.Y(0.62)}" class="ti">직선</text>
  <text x="${P.X(62)}" y="${P.Y(0.24)}" class="ta">점진형 (아래로 볼록)</text>
  <text x="${P.X(62)}" y="${P.Y(0.24)+18}" class="ta" style="font-weight:400">작은 토크 구간을 넓게 씀</text>
</svg>`; };

/* ---------- 규정 95% 드라이버 모델 (차량기술규정 제15조 ① 1. 가, 그림8, 측면) ----------
   그림8 치수: 원 Ø200(엉덩이)·Ø200(어깨)·Ø300(머리), 엉덩이~어깨 중심 490, 어깨~머리 중심 수직 280, 엉덩이 중심~페달 R915 min,
   머리 원~헤드레스트 최대 25(조문)·25.4(그림). 엉덩이~어깨 선 기울기 37.6°, 페달 방향 4.9°는 그림8에서 잰 값. 1 px = 4 mm */
FIG.drv95 = () => { const m = markers(); const k=4, D=Math.PI/180, f=v=>v.toFixed(1), rS=100/k, rH=150/k;
  const H=[289,300], U=[H[0]+490/k*Math.cos(37.6*D), H[1]-490/k*Math.sin(37.6*D)], Hd=[U[0], U[1]-280/k];
  const PED=[H[0]-915/k*Math.cos(4.9*D), H[1]-915/k*Math.sin(4.9*D)], MH=[456,88], FH=[150,150];
  const ux=FH[0]-MH[0], uy=FH[1]-MH[1], ul=Math.hypot(ux,uy), nx=-uy/ul, ny=ux/ul;
  const dist=(Hd[0]-MH[0])*nx+(Hd[1]-MH[1])*ny, gap=Math.abs(dist)-rH, sgn=Math.sign(dist);
  const hp=[Hd[0]-sgn*nx*rH, Hd[1]-sgn*ny*rH], lp=[Hd[0]-sgn*nx*(rH+gap), Hd[1]-sgn*ny*(rH+gap)];
  const HR=Hd[0]+rH+25/k, sv=[Math.cos(37.6*D),-Math.sin(37.6*D)], sn=[Math.sin(37.6*D),Math.cos(37.6*D)];
  const off=(P,d)=>[P[0]+sn[0]*d, P[1]+sn[1]*d], h1=off(H,40), u1=off(U,40);
  return `<svg viewBox="0 0 600 364" aria-label="규정 95% 드라이버 모델">${m.defs}
  ${ground(20,560,330)}
  <path d="M${H[0]-34} ${H[1]+rS+1} L${H[0]+30} ${H[1]+rS-6}" style="fill:none;stroke:var(--steel);stroke-width:5;stroke-linecap:round;opacity:.5"/>
  <line x1="${f(H[0]+rS*Math.sin(37.6*D)*1.05+18*sv[0])}" y1="${f(H[1]+rS*Math.cos(37.6*D)*1.05+18*sv[1])}" x2="${f(U[0]+rS*Math.sin(37.6*D)+30*sv[0])}" y2="${f(U[1]+rS*Math.cos(37.6*D)+30*sv[1])}" style="stroke:var(--steel);stroke-width:5;stroke-linecap:round;opacity:.5"/>
  <rect x="${f(HR)}" y="${f(Hd[1]-34)}" width="10" height="68" rx="3" style="fill:var(--steel);opacity:.55"/>
  <line x1="${MH[0]}" y1="330" x2="${MH[0]}" y2="${MH[1]}" class="tubeLo" style="stroke-width:9"/><line x1="${MH[0]}" y1="330" x2="${MH[0]}" y2="${MH[1]}" class="tubeLi" style="stroke-width:6"/>
  <line x1="${FH[0]}" y1="330" x2="${FH[0]}" y2="${FH[1]}" class="tubeLo" style="stroke-width:9"/><line x1="${FH[0]}" y1="330" x2="${FH[0]}" y2="${FH[1]}" class="tubeLi" style="stroke-width:6"/>
  <line x1="${MH[0]}" y1="${MH[1]}" x2="${f(FH[0]+0.25*ux)}" y2="${f(FH[1]+0.25*uy)}" class="rcline"/>
  <line x1="${f(PED[0]-2)}" y1="${f(PED[1]+28)}" x2="${f(PED[0]+6)}" y2="${f(PED[1]-24)}" style="stroke:var(--ink-2);stroke-width:6;stroke-linecap:round"/>
  <polyline points="${f(H[0])},${H[1]} ${f(U[0])},${f(U[1])} ${f(Hd[0])},${f(Hd[1])}" style="fill:none;stroke:var(--in);stroke-width:3"/>
  <circle cx="${H[0]}" cy="${H[1]}" r="${rS}" style="fill:var(--in);fill-opacity:.12;stroke:var(--in);stroke-width:2"/>
  <circle cx="${f(U[0])}" cy="${f(U[1])}" r="${rS}" style="fill:var(--in);fill-opacity:.12;stroke:var(--in);stroke-width:2"/>
  <circle cx="${f(Hd[0])}" cy="${f(Hd[1])}" r="${rH}" style="fill:var(--in);fill-opacity:.12;stroke:var(--in);stroke-width:2"/>
  ${[H,U,Hd].map(p=>`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="2.6" class="pin"/>`).join('')}
  <line class="rlen" x1="${H[0]}" y1="${H[1]}" x2="${f(PED[0]+3)}" y2="${f(PED[1])}"/>
  <text x="${f((H[0]+PED[0])/2)}" y="${f((H[1]+PED[1])/2-14)}" text-anchor="middle" class="ta">≥ 915 mm (하단 원 중심 ~ 페달)</text>
  <line class="ext" x1="${f(H[0]+sn[0]*rS)}" y1="${f(H[1]+sn[1]*rS)}" x2="${f(h1[0]+sn[0]*6)}" y2="${f(h1[1]+sn[1]*6)}"/><line class="ext" x1="${f(U[0]+sn[0]*rS)}" y1="${f(U[1]+sn[1]*rS)}" x2="${f(u1[0]+sn[0]*6)}" y2="${f(u1[1]+sn[1]*6)}"/>
  <line class="dim" x1="${f(h1[0])}" y1="${f(h1[1])}" x2="${f(u1[0])}" y2="${f(u1[1])}" marker-start="url(#${m.id}t)" marker-end="url(#${m.id}t)"/>
  <text x="${f((h1[0]+u1[0])/2+12)}" y="${f((h1[1]+u1[1])/2+16)}" class="ti">490 mm</text>
  <line class="ext" x1="${f(Hd[0]-rH-4)}" y1="${f(Hd[1])}" x2="${f(Hd[0]-rH-34)}" y2="${f(Hd[1])}"/><line class="ext" x1="${f(U[0]-rS-4)}" y1="${f(U[1])}" x2="${f(Hd[0]-rH-34)}" y2="${f(U[1])}"/>
  <line class="dim" x1="${f(Hd[0]-rH-28)}" y1="${f(Hd[1])}" x2="${f(Hd[0]-rH-28)}" y2="${f(U[1])}" marker-start="url(#${m.id}t)" marker-end="url(#${m.id}t)"/>
  <text x="${f(Hd[0]-rH-34)}" y="${f((Hd[1]+U[1])/2+5)}" text-anchor="end" class="ti">280 mm</text>
  <line class="dim" x1="${f(lp[0])}" y1="${f(lp[1])}" x2="${f(hp[0])}" y2="${f(hp[1])}" marker-start="url(#${m.id}t)" marker-end="url(#${m.id}t)"/>
  <text x="${f(lp[0]+10)}" y="${f(lp[1]-4)}" class="ti">≥ 50 mm</text>
  <line class="dim" x1="${f(Hd[0]+rH)}" y1="${f(Hd[1])}" x2="${f(HR)}" y2="${f(Hd[1])}" marker-start="url(#${m.id}t)" marker-end="url(#${m.id}t)"/>
  <text x="${f(HR+14)}" y="${f(Hd[1]-40)}" class="ti">≤ 25 mm</text><line class="leader" x1="${f(HR+4)}" y1="${f(Hd[1]-4)}" x2="${f(HR+14)}" y2="${f(Hd[1]-36)}"/>
  <text x="${f(HR+12)}" y="${f(Hd[1]+22)}" class="tm" style="font-size:12px">헤드레스트</text>
  <text x="${H[0]+rS+6}" y="${H[1]+18}" class="tb">Ø200</text><text x="${f(U[0]+rS+8)}" y="${f(U[1]+8)}" class="tb">Ø200</text><text x="${f(Hd[0]-rH-6)}" y="${f(Hd[1]-rH+6)}" text-anchor="end" class="tb">Ø300</text>
  ${lead(MH[0],230,500,230,'메인 롤후프')}${lead(FH[0],240,110,252,'프론트 롤후프','end')}
  <text x="${f(FH[0]+0.25*ux+4)}" y="${f(FH[1]+0.25*uy+18)}" class="ta" style="font-size:12px">두 후프 최상부를 잇는 선</text>
  <text x="${f(PED[0]+14)}" y="${f(PED[1]+34)}" class="tm">페달 (가장 앞)</text>
  ${lead(H[0]-6,H[1]+26,H[0]-16,352,'운전석 (가장 뒤)','end')}
  <text x="20" y="24" class="tm">← 진행 방향 · 규정 그림8 치수 (1 px = 4 mm)</text>
</svg>`; };
