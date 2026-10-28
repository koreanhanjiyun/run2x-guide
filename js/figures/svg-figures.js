/* ============================================================
   FS 부품 그림 (v4)
   ============================================================ */
const FIG = {};
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
FIG.side = () => { const m = markers(); return `<svg viewBox="0 0 470 390" aria-label="측면도 캐스터와 트레일">${m.defs}
  <circle class="rub" cx="230" cy="190" r="130"/>
  <circle cx="230" cy="190" r="118" style="fill:none;stroke:#4a525b;stroke-width:2;stroke-dasharray:3 9"/>
  <circle class="rimf" cx="230" cy="190" r="76"/>
  ${[0,72,144,216,288].map(a=>{const r=a*Math.PI/180;return `<path d="M${230+24*Math.cos(r)} ${190+24*Math.sin(r)} L${230+66*Math.cos(r-0.3)} ${190+66*Math.sin(r-0.3)} A66 66 0 0 1 ${230+66*Math.cos(r+0.3)} ${190+66*Math.sin(r+0.3)} Z" style="fill:#fff;opacity:.8"/>`}).join('')}
  <polygon class="alug" points="236,116 256,116 254,150 242,190 238,230 234,268 212,268 216,230 224,190 232,150"/>
  <circle cx="230" cy="190" r="17" class="alu"/>
  ${[0,90,180,270].map(a=>{const r=a*Math.PI/180;return `<circle cx="${230+10*Math.cos(r)}" cy="${190+10*Math.sin(r)}" r="2.6" class="pi"/>`}).join('')}
  <circle class="bj" cx="244" cy="128" r="6"/><circle class="bj" cx="222" cy="256" r="6"/>
  <line class="axis" x1="211" y1="320" x2="255.7" y2="60"/>
  <line class="ref" x1="244" y1="128" x2="244" y2="78"/>
  <path class="arcA" d="M244 88 A40 40 0 0 1 250.8 88.6"/>
  ${M(String.raw`\nu`,270,96,'start','ta',16)}<text x="288" y="96" class="ta">캐스터</text>
  <line class="ref" x1="230" y1="60" x2="230" y2="320"/>
  ${ground(30,440,320)}
  <circle cx="211" cy="320" r="5" class="pa"/><circle cx="230" cy="320" r="5" class="pi"/>
  ${dimH(m.id,211,230,344,'$t_{\\mathrm{mech}}\\ (\\text{기계적 트레일})',368)}
  ${co('①',350,104,[[318,120]])}${co('②',350,166,[[296,178]])}${co('⑦',350,236,[[240,234]])}${co('⑧',350,130,[[250,128]])}${co('⑧',350,262,[[228,256]])}
  <text x="268" y="52" class="ta">킹핀축</text>
  <path d="M120 40 H40" class="arrowk" marker-end="url(#${m.id}k)"/><text x="40" y="30">진행 방향</text>
</svg>`; };
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
FIG.act = () => { const m = markers(); const PV=[288,110], PP=[262,150], PD=[288,70];
  const sq=(p,u,w,k)=>`<path d="M${p[0]+u[0]*k} ${p[1]+u[1]*k} L${p[0]+(u[0]+w[0])*k} ${p[1]+(u[1]+w[1])*k} L${p[0]+w[0]*k} ${p[1]+w[1]*k}" style="fill:none;stroke:var(--accent);stroke-width:1.2"/>`;
  return `<svg viewBox="0 0 580 330" aria-label="푸시로드 로커 댐퍼">${m.defs}
  ${tubeLen(150,170,40,76)}${tubeLen(150,170,150,300)}${tubeSec(150,170)}${tubeSec(40,76,10)}${tubeSec(150,300,10)}
  ${tab(158,165,PV[0],PV[1],7)}${tab(46,76,58,76,6)}${tab(158,296,330,292,0.1)}
  <path class="tiresec ghost" d="M500 300 L500 142 Q500 120 520 120 L530 120 Q550 120 550 142 L550 300 Z"/>
  <line class="arm" x1="330" y1="292" x2="508" y2="282"/>${rodEnd(330,292)}
  <line class="rod" x1="${PP[0]}" y1="${PP[1]}" x2="470" y2="284"/>
  <polygon class="alu" points="${PP[0]},${PP[1]} ${PV[0]+12},${PV[1]} ${PD[0]+8},${PD[1]} ${PD[0]-8},${PD[1]+4} ${PV[0]-12},${PV[1]+4}"/>
  <circle cx="${PV[0]}" cy="${PV[1]}" r="5" class="pi"/>
  <line x1="${PD[0]}" y1="${PD[1]}" x2="140" y2="74" class="shaft"/>
  ${spring(66,272,73,10,14)}
  <rect class="dampb" x="62" y="66" width="80" height="16" rx="3"/>${rodEnd(58,74)}
  <line class="rlen" x1="${PV[0]}" y1="${PV[1]}" x2="${PP[0]}" y2="${PP[1]}"/><line class="rlen" x1="${PV[0]}" y1="${PV[1]}" x2="${PD[0]}" y2="${PD[1]}"/>
  ${sq(PP,[0.841,0.542],[0.542,-0.841],9)}${sq(PD,[-1,0.026],[0,1],9)}
  ${M('r_p',264,128,'end','ta',15)}${M('r_d',298,96,'start','ta',15)}
  <path d="M470 284 V236" class="force" marker-end="url(#${m.id}i)"/>${M(String.raw`\Delta z_{\text{휠}}`,478,250,'start','ti',15)}
  ${lead(PV[0],PV[1],340,124,'로커 피벗 (브래킷)')}
  <text x="300" y="150" class="tm" style="font-size:11px">로드·댐퍼가 팔과 직각 (사점 회피)</text>
  ${M(String.raw`\Delta l_{\text{댐퍼}}`,92,54,'start','tb',15)}<text x="148" y="54">댐퍼·스프링</text>
  <text x="372" y="208" class="tb" transform="rotate(33 372 208)">푸시로드</text>
  <text x="360" y="320">하부 위시본</text><text x="96" y="318" class="tm">프레임 튜브</text>
  ${M(String.raw`MR = \dfrac{\Delta l_{\text{댐퍼}}}{\Delta z_{\text{휠}}} \approx \dfrac{\Delta l_{\text{로드}}}{\Delta z_{\text{휠}}}\cdot\dfrac{r_d}{r_p}\cdot(\text{각도 보정})`,250,24,'start','tb',14)}
  ${M(String.raw`k_{\text{휠}} = k_{\text{스프링}}\, MR^2`,330,62,'start','tb',14)}
</svg>`; };

/* ---------- 애커먼 ---------- */
FIG.ack = () => { const m = markers(); const D = Math.PI/180;
  const W = (x,y,a) => `<g transform="rotate(${a} ${x} ${y})"><rect class="rub" x="${x-9}" y="${y-26}" width="18" height="52" rx="4"/></g>`;
  const FL=[130,90], FR=[270,90], aL=23.4, aR=34.8, ka=26, ry=122;
  const kn = (P,dx,a) => { const n=Math.hypot(dx,160), vx=dx/n, vy=160/n, c=Math.cos(a*D), sn=Math.sin(a*D); return [P[0]+ka*(vx*c-vy*sn), P[1]+ka*(vx*sn+vy*c)]; };
  const kL=kn(FL,70,aL), kR=kn(FR,-70,aR), k0=kn(FL,70,0), lt=Math.hypot(165-k0[0], ry-k0[1]);
  const rL=[kL[0]+Math.sqrt(lt*lt-(ry-kL[1])**2), ry], rR=[kR[0]-Math.sqrt(lt*lt-(ry-kR[1])**2), ry];
  const arc = (P,a,lbl) => { const r=40, ex=P[0]+r*Math.sin(a*D), ey=P[1]-r*Math.cos(a*D);
    return `<line class="ref" x1="${P[0]}" y1="${P[1]}" x2="${P[0]}" y2="${P[1]-50}"/><path class="arcA" d="M${P[0]} ${P[1]-r} A${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`
      + M(lbl, P[0]+54*Math.sin(a*D/2), P[1]-54*Math.cos(a*D/2), 'start','ta',15); };
  const f = v => v.toFixed(1);
  return `<svg viewBox="0 0 600 340" aria-label="애커먼 기하">${m.defs}
  <rect class="body" x="150" y="58" width="100" height="220" rx="30"/>
  <line class="ref" x1="130" y1="250" x2="520" y2="250"/>
  <line class="ref" x1="130" y1="90" x2="500" y2="250"/><line class="ref" x1="270" y1="90" x2="500" y2="250"/>
  ${W(130,250,0)}${W(270,250,0)}${W(FL[0],FL[1],aL)}${W(FR[0],FR[1],aR)}
  <rect class="dampb" x="168" y="${ry-6}" width="64" height="12" rx="3"/>
  <line class="shaft" x1="${f(rL[0])}" y1="${ry}" x2="${f(rR[0])}" y2="${ry}"/>
  <line class="rod" x1="${f(rL[0])}" y1="${ry}" x2="${f(kL[0])}" y2="${f(kL[1])}"/><line class="rod" x1="${f(rR[0])}" y1="${ry}" x2="${f(kR[0])}" y2="${f(kR[1])}"/>
  <line class="arm" x1="${FL[0]}" y1="${FL[1]}" x2="${f(kL[0])}" y2="${f(kL[1])}" style="stroke-width:4"/><line class="arm" x1="${FR[0]}" y1="${FR[1]}" x2="${f(kR[0])}" y2="${f(kR[1])}" style="stroke-width:4"/>
  ${[kL,kR,rL,rR].map(p=>`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="3" class="pi"/>`).join('')}
  ${arc(FL,aL,String.raw`\delta_{\mathrm{out}}`)}${arc(FR,aR,String.raw`\delta_{\mathrm{in}}`)}
  <text x="200" y="${ry+26}" text-anchor="middle" class="tm">랙 (차체 고정)</text>
  ${lead(f((FL[0]+kL[0])/2),f((FL[1]+kL[1])/2),58,128,'너클암','end')}
  ${lead(f((kL[0]+rL[0])/2),f((kL[1]+ry)/2),58,152,'타이로드','end')}
  <circle cx="500" cy="250" r="6" class="pa"/><text x="508" y="240" class="ta">회전 중심</text>
  ${dimV(m.id,70,90,250,'$L',60,'end')}
  ${dimH(m.id,130,270,300,'$t',324)}
  ${dimH(m.id,200,500,272,'$R',292)}
  ${M(String.raw`\delta_{\mathrm{in}}-\delta_{\mathrm{out}} \approx \dfrac{L\,t}{R^2}`,330,60,'start','tb',14)}
  <text x="330" y="92" class="tm">슬립각 0일 때의 기하 (정애커먼)</text>
</svg>`; };

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
FIG.jack = () => { const m = markers(); const LIFT = 16;
  const S = (x, lift, steer) => {
    const ub = [x+34, 158-lift], lb = [x+26, 206-lift], sl = (ub[0]-lb[0])/(lb[1]-ub[1]);
    const ax = y => lb[0] + (lb[1]-y)*sl;
    const wheel = (dy, cls, st) => `<g transform="translate(0 ${dy}) rotate(${steer?-3:0} ${x+14} 230)"><rect class="${cls}" x="${x}" y="150" width="28" height="80" rx="8" ${st||''}/></g>`;
    return (steer ? wheel(lift,'rubg2','style="fill:none;stroke:#4a5058;stroke-width:1.6;stroke-dasharray:5 4"') : '')
      + wheel(0,'rub')
      + `<rect class="body" x="${x+92}" y="${128-lift}" width="150" height="46" rx="8"/>`
      + `<line class="arm" x1="${ub[0]}" y1="${ub[1]}" x2="${x+92}" y2="${140-lift}" style="stroke-width:5"/>`
      + `<line class="arm" x1="${lb[0]}" y1="${lb[1]}" x2="${x+92}" y2="${164-lift}" style="stroke-width:5"/>`
      + `<line x1="${ub[0]}" y1="${ub[1]}" x2="${lb[0]}" y2="${lb[1]}" style="stroke:#c9d1d9;stroke-width:6;stroke-linecap:round"/>`
      + `<line class="axis" x1="${ax(112-lift)}" y1="${112-lift}" x2="${ax(230)}" y2="230"/>`
      + `<circle class="bj" cx="${ub[0]}" cy="${ub[1]}" r="4.5"/><circle class="bj" cx="${lb[0]}" cy="${lb[1]}" r="4.5"/>`;
  };
  return `<svg viewBox="0 0 660 320" aria-label="잭킹">${m.defs}
  ${ground(20,640,230)}
  ${S(60,0,false)}${S(360,LIFT,true)}
  <line class="ref" x1="452" y1="128" x2="640" y2="128"/>
  <path d="M618 128 V${128-LIFT+1}" class="force" marker-end="url(#${m.id}i)"/>${M(String.raw`\Delta h`,626,124,'start','ti',15)}
  ${lead(372,243,346,266,'점선 = 차체 높이가 그대로일 때 바퀴 위치 (지면 아래)','end')}
  <text x="150" y="302" text-anchor="middle" class="tb">직진</text><text x="450" y="302" text-anchor="middle" class="tb">조향 (KPI 있음)</text>
  <text x="330" y="22" text-anchor="middle">조향하면 바퀴가 기울어진 킹핀축을 따라 업라이트에 대해 아래로 내려가려 함</text>
  <text x="330" y="42" text-anchor="middle">→ 지면이 막으므로 링크 형상은 그대로, 차체 전체가 Δh만큼 들림</text>
  <text x="330" y="64" text-anchor="middle" class="tm">차체를 들어올리려는 무게 = 직진 복원 토크 (저속에서 핸들이 무거운 원인)</text>
</svg>`; };

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
FIG.rollcam = () => { const m = markers(); const z=28, IC0=[60,222], IC=[60,222+z], C=[548,270], l=C[0]-IC[0], g=-(z/l)*180/Math.PI;
  return `<svg viewBox="0 0 640 340" aria-label="IC 중심 회전과 캠버">${m.defs}
  <rect class="body" x="130" y="80" width="240" height="46" rx="12" style="opacity:.35;stroke-dasharray:5 4"/>
  <rect class="body" x="130" y="${80+z}" width="240" height="46" rx="12"/>
  <text x="250" y="${108+z}" text-anchor="middle" class="tm">차체</text>
  <path d="M392 80 V${80+z}" class="force" marker-end="url(#${m.id}i)"/>${M('z',400,80+z/2+6,'start','ti',15)}
  <rect class="rubg2" x="520" y="80" width="56" height="190" rx="18"/>
  <g transform="rotate(${g.toFixed(2)} ${C[0]} ${C[1]})"><rect class="rub" x="520" y="80" width="56" height="190" rx="18" style="opacity:.9"/></g>
  <path d="M566 62 Q550 54 534 60" class="arcA" marker-end="url(#${m.id}a)"/>${M(String.raw`\Delta\gamma`,582,56,'start','ta',14)}
  <line class="ref2" x1="${IC[0]}" y1="${IC[1]}" x2="${C[0]}" y2="${C[1]}"/>
  <circle cx="${IC0[0]}" cy="${IC0[1]}" r="6" class="pa" style="opacity:.3"/>
  <circle cx="${IC[0]}" cy="${IC[1]}" r="7" class="pa"/><text x="${IC[0]-12}" y="${IC[1]+5}" text-anchor="end" class="ta">IC</text>
  ${ground(20,620,270)}
  ${dimH(m.id,IC[0],C[0],298,'$l\\ (\\text{정면 스윙암 길이})',322)}
  <text x="630" y="24" text-anchor="end" class="tm">흐린색 = 정적, 진한색 = 범프 z</text>
  ${M(String.raw`\Delta\gamma \approx \dfrac{z}{l}`,150,50,'start','tb',16)}
  <text x="100" y="182" class="tm">바퀴는 지면 위, 차체(IC 포함)가 z만큼 내려옴 = 범프 z</text>
  <text x="100" y="202" class="tm">바퀴는 차체에 대해 IC 중심으로 돌아 위가 안쪽으로 기운다(음 캠버)</text>
  <text x="100" y="222" class="tm">l이 짧을수록 같은 z에서 캠버가 많이 변한다</text>
</svg>`; };

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
FIG.arb = () => { const m = markers();
  return `<svg viewBox="0 0 640 330" aria-label="ARB 동작">${m.defs}
  <rect class="body" x="150" y="60" width="340" height="60" rx="12"/>
  <rect x="78" y="226" width="64" height="24" rx="2" style="fill:var(--ink-2);opacity:.35"/>
  <rect class="rub" x="90" y="116" width="40" height="110" rx="10"/>
  <rect class="rub" x="510" y="140" width="40" height="110" rx="10"/>
  <path d="M170 146 L200 154 L200 186 L440 186 L440 162 L470 162" class="arbbar"/>
  <line class="rod" x1="170" y1="146" x2="130" y2="166"/><line class="rod" x1="470" y1="162" x2="510" y2="190"/>
  <line class="dim" x1="66" y1="226" x2="66" y2="250" marker-start="url(#${m.id}t)" marker-end="url(#${m.id}t)"/>${M('z',58,243,'end','ti',15)}
  <path d="M110 304 V254" class="force" style="stroke-width:5" marker-end="url(#${m.id}i)"/>
  <path d="M530 282 V254" class="force" marker-end="url(#${m.id}i)"/>
  ${M(String.raw`F_{z0}+(k_w+k_{\mathrm{arb}})\,z`,124,288,'start','ti',15)}
  ${M(String.raw`F_{z0}-k_{\mathrm{arb}}\,z`,518,280,'end','ta',15)}
  <text x="124" y="312" class="ti">요철 바퀴: 하중 증가</text>
  <text x="518" y="304" text-anchor="end" class="ta">반대편 바퀴: 하중 감소</text>
  <text x="320" y="214" text-anchor="middle" class="tb">ARB(비틀림 막대)</text>
  <text x="320" y="36" text-anchor="middle" class="tm">뒤에서 본 모습 · 한쪽 바퀴만 요철 (차체가 아직 움직이지 않은 순간)</text>
  ${ground(20,620,250)}
</svg>`; };

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
FIG.lsd = () => { const m = markers();
  return `<svg viewBox="0 0 660 320" aria-label="LSD 램프 구조">${m.defs}
  <rect x="200" y="50" width="260" height="200" rx="16" class="lsdcase"/>
  <rect x="226" y="80" width="26" height="140" class="clutch"/><rect x="408" y="80" width="26" height="140" class="clutch"/>
  ${[0,1,2,3].map(i=>`<line x1="${230+i*6}" y1="84" x2="${230+i*6}" y2="216" class="plate"/><line x1="${412+i*6}" y1="84" x2="${412+i*6}" y2="216" class="plate"/>`).join('')}
  <rect x="258" y="96" width="34" height="108" class="ring"/><rect x="368" y="96" width="34" height="108" class="ring"/>
  <path d="M292 118 L330 150 L292 182 Z M368 118 L330 150 L368 182 Z" class="ramp"/>
  <circle cx="330" cy="150" r="9" class="pin2"/>
  <line x1="40" y1="150" x2="226" y2="150" class="shaftL"/><line x1="434" y1="150" x2="620" y2="150" class="shaftL"/>
  <path d="M286 150 H250" class="force" marker-end="url(#${m.id}i)"/><path d="M374 150 H410" class="force" marker-end="url(#${m.id}i)"/>
  <line x1="368" y1="96" x2="368" y2="140" style="stroke:var(--accent);stroke-width:1.2;stroke-dasharray:3 3"/>
  <path d="M368 140 A22 22 0 0 1 351.2 132.3" style="fill:none;stroke:var(--accent);stroke-width:1.6"/>
  ${M(String.raw`\theta`,352,118,'end','ta',14)}
  <text x="330" y="40" text-anchor="middle" class="tb">입력 토크 → 하우징 → 크로스 핀</text>
  <text x="239" y="270" text-anchor="middle">클러치 팩</text><text x="421" y="270" text-anchor="middle">클러치 팩</text>
  <text x="275" y="232" text-anchor="middle" class="tm">압력 링</text>
  <text x="60" y="140">왼쪽 출력축</text><text x="600" y="140" text-anchor="end">오른쪽 출력축</text>
  ${M(String.raw`F_{\mathrm{ax}} \propto \dfrac{T}{r_{\mathrm{ramp}}}\cot\theta`,478,96,'start','tb',14)}
  <text x="20" y="292" class="tm">핀이 V자 램프를 타고 올라 압력 링을 밀면 → 클러치가 눌려 좌우가 묶임</text>
  <text x="20" y="312" class="tm">θ = 램프 면과 회전(원주) 방향 사이 각 · 90°면 축력 0 (오픈) · 램프는 원주 방향으로 펼쳐 그림</text>
</svg>`; };

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
