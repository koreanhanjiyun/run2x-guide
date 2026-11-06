/* ============================================================
   도구 탭 대시보드 그림 (시안)
   - 팀 설계값(p)과 주행 조건(c)으로 측면도·윗면도를 그린다. 값이 바뀌면 그림 치수도 바뀐다.
   - 좌표: x = 앞축에서 뒤로 [mm], y = 지면에서 위로 [mm], z = 차량 오른쪽 [mm]. 진행 방향은 화면 왼쪽.
   - 하중 계산은 DASHCALC (정상 상태, 강체, 타이어 하중 감도 무시)
   ============================================================ */
const DASHCALC = (p, c) => {
  const g = 9.81, rho = 1.225, m = p.m, W = m*g, L = p.L/1000, h = p.h/1000;
  const v = c.v/3.6, q = 0.5*rho*v*v, DF = q*p.cla, D = q*p.cda;
  const xcop = p.xcop/1000, hcop = p.hcop/1000;
  const ay = (c.R>0 && isFinite(c.R)) ? v*v/c.R : 0, ax = c.ax*g;
  const Ff0 = W*p.fr/100, Fr0 = W - Ff0;
  const DFf = DF*xcop/L, DFr = DF - DFf;   /* xcop = 뒤축부터 앞으로 CoP 거리 */
  const dX = (m*ax*h + D*hcop)/L;             /* 뒤로 넘어가는 하중 (가속·항력) */
  const Ff = Ff0 + DFf - dX, Fr = Fr0 + DFr + dX;
  const lam = p.lltd/100, tf = p.tf/1000, tr = p.tr/1000;
  const dYf = m*ay*h*lam/tf, dYr = m*ay*h*(1-lam)/tr;   /* 바깥 바퀴로 넘어가는 하중 */
  const sl = p.left/100, sideF = (1-2*sl), sgn = c.dir==='L' ? 1 : -1;   /* 좌회전: 오른쪽(+z)이 바깥 */
  const st = { fl: Ff0*sl, fr: Ff0*(1-sl), rl: Fr0*sl, rr: Fr0*(1-sl) };
  const half = (F, s) => [F*s, F*(1-s)];
  const [fl0, fr0] = half(Ff, sl), [rl0, rr0] = half(Fr, sl);
  const w = { fl: fl0 - sgn*dYf, fr: fr0 + sgn*dYf, rl: rl0 - sgn*dYr, rr: rr0 + sgn*dYr };
  const tot = W + DF, grip = m*Math.hypot(ax, ay)/(p.mu*tot);
  return { W, DF, D, DFf, DFr, Ff, Fr, Ff0, Fr0, dX, dYf, dYr, ay, ax, st, w, tot, grip, a: p.L*(1-p.fr/100), cross: (st.fr+st.rl)/W, sideF };
};

/* REF4 CAD 투영 윤곽 (단순화). x = REF4 좌표(뒤축 0, 앞축 1600, 앞으로 +) [mm], 측면 y = 지면에서 위, 윗면 z = 오른쪽 +. front = 정면 투영 [z(오른쪽 +), y], mh = 메인 롤후프 */
const REF4SIL = {
  side:{frame:[[-225,100,-231,102,-236,109,-235,118,-231,123,-222,125,-166,119,-166,137,-151,136,-140,144,-130,143,-124,134,-130,115,-100,112,-14,161,-11,168,1,169,98,223,-32,308,-19,337,-14,338,-15,349,11,348,15,407,18,395,26,390,36,389,45,398,42,371,46,368,111,368,113,391,139,392,662,1020,662,1127,672,1138,683,1135,687,1127,688,373,1389,583,1415,628,1422,633,1436,626,1439,592,1583,578,1585,622,1589,592,1609,591,1615,622,1616,575,2176,523,2187,512,2187,170,2177,158,1786,119,1783,110,1778,110,1764,111,1762,118,1437,118,1435,111,1425,110,1414,111,1411,117,689,64,687,57,678,55,663,56,660,63,139,63,136,56,122,55,113,56,110,64],[1812,356,1811,352,2162,193,2161,491],[1762,399,1787,400,1790,375,2113,502,1633,548,1759,394],[1786,145,1898,155,1900,183,2110,185,1787,335],[1762,143,1762,332,1541,190,1529,144],[1745,369,1598,542,1455,369],[1435,156,1439,154,1534,216,1551,281,1582,289,1587,270,1559,262,1553,229,1726,342,1438,342],[1328,465,1333,494,1339,495,1368,549,773,370,1412,368,1424,359,1437,390,1572,553,1439,566,1437,545,1412,545,1411,562,1390,557,1353,493,1348,461],[1174,125,1412,142,1413,336,812,112],[687,107,720,106,1345,341,689,343],[592,564,594,573,602,578,662,580,660,977,154,369,661,368,662,551,602,553],[474,198,646,203,661,166,662,328],[433,169,322,91,652,104,628,177],[275,102,341,191,422,194,630,342,148,342],[139,141,139,92,155,94,162,88,252,89,139,299,137,168,197,168,185,163,182,154,186,146,197,143],[111,249,109,335,30,299],[112,200,-53,108,111,90]],acc:[[316,387,594,396,589,401,667,393,689,370,657,372,710,343,697,335,707,331,708,319,693,315,709,311,712,296,694,281,701,270,692,264,702,248,705,222,711,221,713,181,706,183,686,141,673,142,579,101,478,120,469,96,441,98,429,116,361,93,340,126,336,107,333,183,381,157,385,161,373,169,374,186,348,210,336,257,330,257,323,317,353,322,321,358,383,354,573,373,320,375,336,380,317,380],[701,245,612,186,685,143]],body:[[125,53,631,60,666,91,675,146,688,175,688,203,675,232,675,355,1381,568,1413,593,1424,637,1589,635,1749,622,1982,584,2209,525,2367,470,2436,440,2452,422,2461,398,2456,365,2416,311,2318,220,2195,152,2078,119,1809,102,1401,106,675,52]],fw:[[2025,316,2088,316,2132,261,2509,260,2515,251,2514,72,2505,66,2090,67,2085,76,2085,145,2051,191,2036,226,2025,272]],fwsn:[[2144,223,2217,233,2145,275,2143,281,2148,284,2407,128,2409,121,2404,118,2243,139,2145,215],[2232,226,2243,150,2251,144,2392,127],[2223,228,2164,219,2160,213,2240,150]],rw:[[-438,1189,-428,1197,321,1196,327,1187,325,715,-145,669,-329,754,-438,1154]],rwsn:[[-78,934,-73,942,94,985,264,1011,500,1018,628,1008,633,1004,630,998,580,977,542,940,529,916,518,864,513,860,273,911,159,912,-71,925],[400,1006,513,875,533,932,550,956,598,993,531,1002],[388,1004,301,917,499,876],[244,998,291,922,375,1004,330,1005],[236,994,174,927,175,921,280,921],[91,977,151,925,169,930,224,995],[82,974,7,926,147,920],[-7,776,2,780,135,442,131,439,125,439]],hr:[[545,648,545,858,586,858,590,853,590,652,585,648]]},
  top:{frame:[[-236,185,-236,-185,-101,-179,-14,-191,-13,-203,-29,-207,-32,-219,-27,-230,-13,-231,-12,-258,-2,-266,11,-259,13,-229,44,-232,47,-239,50,-232,110,-238,114,-260,123,-266,134,-262,139,-245,261,-284,262,-289,288,-289,675,-338,1410,-240,1414,-256,1426,-261,1435,-256,1439,-238,1760,-238,1764,-256,1776,-261,1786,-254,1789,-236,2176,-188,2187,-177,2187,175,2184,184,1789,236,1786,254,1776,261,1764,256,1760,238,1439,238,1435,256,1426,261,1414,256,1410,240,675,338,288,289,262,289,261,284,139,245,134,262,123,266,114,260,110,238,14,229,11,259,-2,266,-12,258,-13,231,-27,230,-32,219,-29,207,-13,203,-14,191,-99,180],[1989,107,1989,162,2162,161,2161,107],[1989,82,2161,81,2161,-61,1988,-61],[1987,-89,2161,-87,2162,-161,1989,-162],[2160,-84,1989,-84,1988,-66,2162,-66],[1900,104,1962,94,1960,85,1900,85,1962,80,1962,-61,1900,-62,1962,-66,1961,-84,1900,-87,1961,-88,1962,-161,1789,-162,1788,161,1961,162,1961,107],[1612,-142,1613,143,1652,143,1629,148,1647,151,1649,162,1761,162,1761,-162,1653,-162,1642,-151,1613,-150,1614,-146,1652,-146],[1581,143,1587,141,1587,10,1566,15,1554,7,1527,7,1526,161,1585,162],[1553,-6,1566,-15,1587,-11,1587,-142,1581,-146,1587,-147,1587,-155,1581,-162,1526,-161,1526,-8],[1511,162,1513,-161,1439,-162,1437,161],[1352,-15,1352,15,1411,124,1411,-124],[1190,-194,1188,193,1411,164,1412,158,1338,16,1330,14,1328,0,1330,-14,1338,-16,1412,-163],[1313,-220,1089,-235,1087,-233,1412,-189,1411,-206],[1410,206,1410,188,1097,232,1313,220],[689,162,689,260,1162,196,1160,162],[689,140,689,160,1162,158,1160,140],[689,-138,688,137,1162,137,1161,-137],[689,-160,689,-140,1162,-142,1160,-160],[687,-164,1160,-162,1162,-196,689,-260],[689,287,690,310,940,272],[690,-310,689,-287,938,-272,936,-274],[635,-138,617,-136,619,138,662,132,662,-132],[662,-231,617,-231,617,-167,661,-163],[617,231,662,232,661,163,618,166],[590,138,591,-137,288,-137,288,137],[287,231,590,233,592,171,289,215],[590,-233,289,-233,287,-216,592,-171],[590,-140,590,-144,487,-160,287,-158,289,-140],[487,160,591,142,287,142,289,160],[442,-162,443,-166,287,-188,289,-162],[442,166,442,162,289,162,287,188],[138,122,137,156,199,202,262,193,261,-194,200,-203,137,-155,137,105,162,108,137,111,138,120,162,120,162,123],[56,-25,44,1,106,149,111,150,111,-150,106,-149,72,-68,82,-63,70,-62,56,-29,82,-25],[21,150,78,149,37,53,35,54],[78,-149,21,-150,37,-53],[-141,-87,-124,-84,-141,-81,-141,155,-5,153,15,7,5,-81,-21,-82,5,-87,-4,-152,-140,-156],[-167,155,-167,-156,-210,-157,-209,158]],acc:[[317,239,316,-239,375,-243,374,-249,368,-244,357,-249,362,-255,364,-249,387,-255,402,-242,416,-243,417,-255,440,-247,447,-255,448,-246,463,-242,477,-255,507,-255,521,-242,536,-245,537,-255,567,-255,581,-242,597,-255,627,-255,627,-247,650,-231,646,-224,661,-212,670,-219,670,-234,715,-239,715,239,676,236,660,226,659,239,628,245,627,255,612,249,612,241,602,255,581,242,567,255,543,249,537,255,521,242,507,255,492,249,477,255,462,242,447,255,417,255,416,243,405,243,402,242,387,255,373,250,362,255,357,255,338,234]],body:[[125,162,125,-162,275,-275,675,-275,1424,-177,1423,-186,675,-286,675,-304,809,-286,852,-290,818,-300,675,-320,675,-341,1422,-243,1909,-247,2175,-227,2266,-210,2337,-187,2415,-149,2461,-113,2460,119,2335,188,2258,212,2175,227,1909,247,1422,243,675,341,675,320,818,300,852,290,809,286,675,304,675,286,1423,186,1424,177,675,275,275,275]],seat:[[617,160,617,-160,674,-194,696,-202,1293,-202,1327,-190,1338,-160,1338,160,1318,198,696,202],[1190,58,1248,59,1247,-60,1190,-59]],sw:[[1216,61,1224,54,1226,-20,1225,-55,1217,-64,1216,-102,1226,-115,1244,-118,1256,-112,1258,-101,1258,-65,1250,-55,1247,0,1250,57,1258,65,1258,101,1254,114,1235,119,1222,112,1215,99]],fw:[[2025,448,2025,441,2067,440,2068,291,2138,289,2138,-289,2068,-291,2067,-440,2025,-441,2025,-448,2138,-449,2138,-666,2085,-668,2085,-675,2515,-675,2515,-668,2485,-666,2485,666,2515,668,2515,675,2085,675,2085,668,2138,666,2138,449]],fwsn:[[2143,196,2143,188,2410,188,2410,196],[2143,-188,2143,-196,2410,-196,2410,-188]],rw:[[-438,432,-438,425,-357,423,-357,-423,-438,-425,-438,-432,327,-432,327,-425,260,-423,260,423,327,425,327,432]],rwsn:[[-78,151,264,141,633,142,632,150,559,155,513,168,-73,160,-78,159],[-78,-151,-78,-159,-73,-160,513,-168,559,-155,632,-150,633,-142,264,-141],[-1,394,-6,386,126,243,133,243,133,250],[-7,-390,1,-393,134,-249,133,-243,126,-243]],hr:[[545,65,545,-65,586,-65,590,-60,589,62,585,65]]},
  front:{body:[[341,355,223,605,196,630,163,638,-163,638,-195,630,-227,599,-341,355,-321,231,-301,233,-289,195,-286,150,-304,146,-287,54,-188,108,-187,103,-275,52,275,52,187,103,188,108,287,54,304,146,286,150,289,195,301,233,321,231]],fw:[[675,261,668,261,666,155,449,155,448,316,441,316,439,312,291,312,291,230,439,230,441,227,291,225,289,155,-289,155,-291,225,-441,227,-439,230,-291,230,-291,312,-439,312,-441,316,-448,316,-450,155,-667,155,-668,261,-675,261,-675,66,-668,66,-666,76,666,76,668,66,675,66]],fwsn:[[-188,118,-188,284,-196,284,-196,118],[196,284,188,284,188,118,196,118]],rw:[[432,1197,423,1194,-423,1194,-432,1197,-432,669,-425,669,-423,842,423,842,425,669,432,669]],rwsn:[[-241,442,-385,780,-390,780,-394,776,-251,438],[-140,1018,-148,1019,-168,861,-160,860],[168,863,148,1019,140,1018,160,860],[394,776,385,780,242,442,245,439,251,438]],acc:[[255,192,255,208,228,228,226,237,239,379,223,391,236,394,239,404,-237,399,-239,351,-231,349,-234,300,-227,294,-232,282,-227,280,-226,258,-230,228,-255,208,-255,191,-227,192,-227,90,227,90,227,189]],mh:[[338,347,330,405,157,1019,146,1048,130,1073,110,1095,86,1114,48,1130,0,1138,-30,1135,-59,1127,-86,1114,-110,1095,-130,1073,-146,1048,-153,1021,-157,1019,-330,405,-336,372,-338,339,-334,306,-284,55,-259,60,-258,63,258,63,259,60,284,55,334,306],[312,356,309,312,264,88,262,89,264,94,257,89,258,200,254,203,235,203,233,201,232,88,-232,88,-233,200,-236,203,-257,201,-258,88,-260,88,-261,93,-266,95,-309,312,-312,340,-312,359,-308,363,-308,366,-311,369,-306,398,-262,553,261,553,307,398,311,369,308,366,308,361],[257,569,258,562,-249,563,-251,561,-259,563,-255,573,-251,572,-248,567,249,567,251,570],[132,1013,254,578,-254,578,-132,1013,-115,1049,-88,1080,-66,1096,-40,1107,-14,1112,14,1112,40,1106,66,1096,88,1080,107,1061,122,1038]],rf:[[338,356,333,364,324,368,244,368,247,387,235,391,156,1019,150,1021,138,1019,132,1013,211,368,26,368,31,387,29,387,33,390,34,397,32,399,25,393,19,393,23,401,30,400,21,405,17,402,19,398,11,398,16,406,26,407,20,407,16,406,13,404,0,386,-11,404,-16,406,-18,407,-22,407,-23,407,-26,407,-23,407,-24,404,-29,405,-34,399,-26,368,-211,368,-132,1013,-142,1020,-155,1020,-235,391,-247,388,-243,368,-323,368,-333,363,-338,356,-290,84,-289,63,-173,63,-170,55,-146,60,-145,63,145,63,146,60,171,54,173,63,289,63,290,84],[-245,323,-261,326,-246,318,-249,302,-266,303,-250,297,-267,195,-283,194,-310,342,-243,343],[-225,287,-197,168,-230,168,-215,165,-219,163,-217,158,-220,156,-221,147,-218,151,-213,149,-217,145,-232,145,-233,200,-235,203,-241,200],[-181,99,-179,88,-232,88,-232,143,-191,141,-185,117,-185,100],[-105,342,-204,316,-206,332,-201,343],[199,294,160,125,-5,125,-5,138,-8,125,-82,125,-84,139,-85,125,-160,125,-199,293,-86,321,-85,312,-82,312,-82,322,-71,323,-66,326,-63,322,-62,327,-28,335,-27,322,-25,322,-25,336,0,342],[106,92,106,88,-151,88,-153,91],[208,343,204,316,102,342],[231,144,232,88,179,88,181,99,185,100,185,117,191,141],[241,200,233,202,233,146,222,146,218,159,221,165,230,168,197,168,225,287],[266,301,249,303,246,319,261,324,246,323,242,342,309,342,283,194,267,195,250,297]],mot:[[134,184,134,195,102,196,109,214,133,214,135,219,133,227,109,227,104,245,133,246,135,253,133,258,100,259,99,331,83,335,82,332,81,335,77,332,72,335,71,332,70,335,66,332,64,335,60,332,56,335,55,332,53,335,49,332,48,335,44,332,42,335,38,332,37,335,33,332,20,334,15,330,14,268,16,112,21,108,95,108,99,113,100,182]],diff:[[192,274,138,273,133,254,126,249,118,249,111,257,117,264,100,264,100,269,37,268,32,273,31,289,19,289,17,280,8,279,-5,283,-24,279,-29,289,-42,289,-42,274,-48,268,-84,267,-86,258,-117,259,-118,249,-133,254,-138,272,-192,272,-192,204,-137,205,-133,224,-126,229,-118,229,-117,219,-86,220,-84,212,-48,211,-42,204,-42,189,-29,189,-24,199,-13,195,2,196,8,199,17,198,19,189,31,189,32,206,37,211,100,209,100,214,117,214,111,221,118,229,133,224,138,205,192,204]]}
};

const CARFIG = (() => {
  const f1 = v => (Math.round(v*10)/10).toFixed(1), f0 = v => String(Math.round(v));
  /* mm 경로 → 화면 경로 */
  const path = (T, cmds) => cmds.map(c => { const k=c[0], a=c.slice(1); if(k==='Z') return 'Z';
    const o=[]; for(let i=0;i<a.length;i+=2){ const [X,Y]=T(a[i],a[i+1]); o.push(X.toFixed(1)+' '+Y.toFixed(1)); } return k+o.join(' '); }).join(' ');
  /* 무게중심 기호: 원 + 십자, 2·4사분면 칠함 (관성력과 같은 빨강) */
  const cgSym = (x, y, r) => `<g class="cf-cg"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="var(--acc-r)" stroke-width="1.6"/>
    <path d="M${x} ${y} L${x-r} ${y} A${r} ${r} 0 0 1 ${x} ${y-r} Z" fill="var(--acc-r)"/><path d="M${x} ${y} L${x+r} ${y} A${r} ${r} 0 0 1 ${x} ${y+r} Z" fill="var(--acc-r)"/>
    <line x1="${x-r}" y1="${y}" x2="${x+r}" y2="${y}" stroke="var(--acc-r)" stroke-width="1.2"/><line x1="${x}" y1="${y-r}" x2="${x}" y2="${y+r}" stroke="var(--acc-r)" stroke-width="1.2"/></g>`;
  /* 압력 중심 기호: 무게중심과 같은 모양(원 + 십자, 2·4사분면 칠함), 에어로 색(파랑) */
  const copSym = (x, y, r) => `<g class="cf-cop"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="var(--in)" stroke-width="1.6"/>
    <path d="M${x} ${y} L${x-r} ${y} A${r} ${r} 0 0 1 ${x} ${y-r} Z" fill="var(--in)"/><path d="M${x} ${y} L${x+r} ${y} A${r} ${r} 0 0 1 ${x} ${y+r} Z" fill="var(--in)"/>
    <line x1="${x-r}" y1="${y}" x2="${x+r}" y2="${y}" stroke="var(--in)" stroke-width="1.2"/><line x1="${x}" y1="${y-r}" x2="${x}" y2="${y+r}" stroke="var(--in)" stroke-width="1.2"/></g>`;
  /* 라벨 자동 배치: 후보 자리를 차례로 보고, 이미 놓인 글자·기호·화살표(obs: [x0,y0,x1,y1,가중])와 겹치지 않는 첫 자리에 둔다.
     모두 겹치면 겹침(가중 면적)이 가장 작은 자리. 그림 4개가 같이 쓴다 */
  const placer = obs => {
    const tw = (t, fs) => [...t].reduce((a, ch) => a + (/[\uac00-\ud7a3]/.test(ch) ? fs*0.98 : ch===' ' ? fs*0.3 : fs*0.6), 0);
    const placed = [], hit = b => obs.concat(placed).reduce((n, o) => n + (o[4]||3) * Math.max(0, Math.min(b[2],o[2]) - Math.max(b[0],o[0])) * Math.max(0, Math.min(b[3],o[3]) - Math.max(b[1],o[1])), 0);
    return (txt, cls, fs, cands) => { let best = null, bs = Infinity;
      for(const [x, y, an] of cands){ const w = tw(txt.replace(/<[^>]+>/g,''), fs), x0_ = an==='end' ? x-w : an==='middle' ? x-w/2 : x, b = [x0_-2, y-fs*0.85, x0_+w+2, y+fs*0.25];
        const sc = hit(b); if(sc < bs){ bs = sc; best = [x, y, an, b]; } if(sc === 0) break; }
      placed.push(best[3]); return `<text x="${best[0].toFixed(1)}" y="${best[1].toFixed(1)}" text-anchor="${best[2]}" class="cf-t sm ${cls} halo">${txt}</text>`; }; };
  /* 관성력 화살표: 빨강, 헬멧·차체 위에서도 보이게 흰 윤곽 */
  const accArrow = (id, x1, y1, x2, y2) => haloArrow(id, x1, y1, x2, y2, 'cf-force acc');
  /* 관성력 라벨: 하중 이동은 CG에 걸린 관성력(−m·a, 가속도 반대 방향)이 만든다. 가속도 값은 괄호로 함께 적는다 */
  const inert = (Fn) => `관성력 ${f0(Fn)} N`;   /* 가속도 값은 오른쪽 결과 칸(횡가속도)과 주행 조건(종가속)에 있다 */
  /* 아래첨자: SVG 글자 안에서 기준선만 내린다 */
  const sub = (b, s_) => `${b}<tspan dy="3.5" class="cf-sub">${s_}</tspan><tspan dy="-3.5"></tspan>`;
  const arrow = (id, x1, y1, x2, y2, cls) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${cls}" marker-end="url(#${id})"/>`;
  const mk = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 1L10 5L0 9z" style="fill:${col}"/></marker>`
    /* 흰 윤곽을 두른 화살촉 (윤곽은 바깥쪽 1 px만) */
    + `<marker id="${id}h" viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto" overflow="visible"><path d="M0 1L10 5L0 9z" style="fill:${col}" stroke="#fff" stroke-width="2" stroke-linejoin="round" paint-order="stroke"/></marker>`
    /* 치수선 화살촉: 양 끝 모두 안에서 바깥을 향함 */
    + `<marker id="${id}d" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 1.5L10 5L0 8.5z" style="fill:${col}"/></marker>`;
  /* 흰 윤곽 화살표: 윤곽 선은 화살촉 앞에서 끝나 화살촉 둘레는 촉 자체 윤곽만 보인다 */
  const haloArrow = (id, x1, y1, x2, y2, cls) => { const L_ = Math.hypot(x2-x1, y2-y1) || 1, k = Math.max(0, L_ - 8)/L_, ex = x1 + (x2-x1)*k, ey = y1 + (y2-y1)*k;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" class="cf-halo"/><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${cls}" marker-end="url(#${id}h)"/>`; };
  let N = 0;

  /* REF4 좌표 → 대시보드 좌표: 앞 오버행·뒤 오버행은 그대로, 두 축 사이는 휠베이스 비율로 늘이거나 줄인다 */
  const RX = (xr, L) => xr >= 1600 ? 1600 - xr : xr <= 0 ? L - xr : (1600 - xr)*L/1600;
  const sil = (T, L, rings) => rings.map(r => { let d = ''; for(let i=0;i<r.length;i+=2){ const [X,Y] = T(RX(r[i], L), r[i+1]); d += (i?'L':'M') + X.toFixed(1) + ' ' + Y.toFixed(1); } return d + 'Z'; }).join(' ');
  /* 바퀴 하중 색: 네 바퀴 평균 하중의 1.9배에서 가장 진함 (두 그림 같은 기준) */
  const heat = (F, Fq) => { const t = Math.max(0, Math.min(1, F/Fq/1.9)); const a = [233,231,238], b = [194,65,12]; return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')})`; };
  const XMIN = -930, XMAX_R = 460, VW = 580, VH = 400, PADL = 62;   /* PADL: 측면도 왼쪽에 CoP·무게중심 높이 치수 자리 */

  /* 팀이 올린 차 형상(js/app/car-shape.js)이 있으면 그 그림을 바탕으로 (도구 1 질량 분포 · 드라이버 모델만, 대시보드 그림은 기본 그림 그대로): A = 앞 바퀴(차축) 중심 화면 점, B = 뒤 */
  const cus = (view, A, B) => typeof shSvg==='function' ? shSvg(view, A, B) : '';
  function wheelSide(T, s, x, r, fill){ const [cx, cy] = T(x, r), R = r*s;
    let sp=''; for(let i=0;i<5;i++){ const a=i*72*Math.PI/180 - Math.PI/2; sp+=`<line x1="${(cx+Math.cos(a)*R*0.17).toFixed(1)}" y1="${(cy+Math.sin(a)*R*0.17).toFixed(1)}" x2="${(cx+Math.cos(a)*R*0.56).toFixed(1)}" y2="${(cy+Math.sin(a)*R*0.56).toFixed(1)}" class="cf-spoke"/>`; }
    return `<circle cx="${cx}" cy="${cy}" r="${R}" class="cf-tire" style="fill:${fill}"/><circle cx="${cx}" cy="${cy}" r="${R*0.9}" class="cf-wall"/><circle cx="${cx}" cy="${cy}" r="${R*0.62}" class="cf-rim"/><circle cx="${cx}" cy="${cy}" r="${R*0.44}" class="cf-disc"/>${sp}<circle cx="${cx}" cy="${cy}" r="${R*0.15}" class="cf-hub"/>`; }

  /* ---------- 측면도 ---------- */
  function side(p, c, K){ const id = 'cfs'+(++N), L = p.L, r = p.rt, S = REF4SIL.side;
    const xmin = XMIN, xmax = L + XMAX_R, G = 272, s = (VW-PADL-20)/(xmax-xmin);
    const T = (x, y) => [PADL + (x - xmin)*s, G - y*s];
    const Q = (xr, y) => T(RX(xr, L), y);   /* REF4 좌표 한 점 */
    const seg = (a, b, cls) => { const [x1,y1] = Q(...a), [x2,y2] = Q(...b); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${cls}"/>`; };
    /* 서스 (측면에서 보이는 팔) */
    const arms = (x, sg) => [[x, r+95, x-170*sg, r+118],[x, r+95, x+170*sg, r+128],[x, r-95, x-180*sg, 150],[x, r-95, x+200*sg, 160]]
      .map(a => { const [x1,y1]=T(a[0],a[1]), [x2,y2]=T(a[2],a[3]); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="cf-arm"/>`; }).join('');
    /* 드라이버: 시트 등받이에 기대 누운 상체, 고개는 앞으로 세움. 헬멧 뒤가 헤드레스트에 닿고, 헬멧 위끝은 메인 롤후프 위끝보다 200 mm 이상 아래 */
    const W = (mm) => (mm*s).toFixed(1);
    const [hx, hy] = Q(735, 795), hr = 135*s;
    const torso = `<g class="cf-drv">${seg([1010, 230], [800, 560], 'cf-drv t" style="stroke-width:'+W(250))}${seg([800, 560], [775, 600], 'cf-drv t" style="stroke-width:'+W(230))}${seg([790, 600], [760, 700], 'cf-drv n" style="stroke-width:'+W(110))}</g>`;
    const armL = seg([815, 570], [1020, 455], 'cf-drv a" style="stroke-width:'+W(95)) + seg([1020, 455], [1225, 500], 'cf-drv a" style="stroke-width:'+W(80));
    const fq = K.tot/4;
    const [mx, my] = Q(140, 220);
    let h = `<svg viewBox="0 0 ${VW} ${VH}" class="cf-svg" role="img" aria-label="측면도: 휠베이스, 무게중심, 압력 중심, 축하중">
      <defs>${mk(id+'k','var(--ink-2)')}${mk(id+'i','var(--in)')}${mk(id+'o','var(--out)')}${mk(id+'r','var(--acc-r)')}</defs>
      <text x="14" y="18" class="cf-t sm mut">← 진행 방향</text>
      <g class="cf-car">
      <path d="${sil(T, L, S.acc)}" class="cf-acc"/><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${(114*s).toFixed(1)}" class="cf-motor"/>
      <path d="${sil(T, L, S.frame)}" class="cf-frame" fill-rule="evenodd"/>
      <path d="${sil(T, L, S.rwsn)}" class="cf-sn"/>
      <path d="${sil(T, L, S.hr)}" class="cf-hr"/>
      ${torso}${armL}
      <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${hr.toFixed(1)}" class="cf-helmet"/><path d="M${(hx-hr*0.97).toFixed(1)} ${(hy-hr*0.02).toFixed(1)} Q${(hx-hr*0.4).toFixed(1)} ${(hy-hr*0.4).toFixed(1)} ${(hx+hr*0.2).toFixed(1)} ${(hy-hr*0.18).toFixed(1)} L${(hx+hr*0.12).toFixed(1)} ${(hy+hr*0.16).toFixed(1)} Q${(hx-hr*0.45).toFixed(1)} ${(hy+hr*0.06).toFixed(1)} ${(hx-hr*0.95).toFixed(1)} ${(hy+hr*0.32).toFixed(1)} Z" class="cf-visor"/>
      <path d="${sil(T, L, S.body)}" class="cf-body"/>
      ${arms(0, 1)}${arms(L, -1)}
      ${wheelSide(T, s, 0, r, heat(K.Ff/2, fq))}${wheelSide(T, s, L, r, heat(K.Fr/2, fq))}
      <path d="${sil(T, L, S.fwsn)}" class="cf-sn"/><path d="${sil(T, L, S.fw)}" class="cf-aero"/><path d="${sil(T, L, S.rw)}" class="cf-aero"/>
      </g>`;
    /* 지면 */
    h += `<line class="cf-gnd" x1="10" y1="${G}" x2="${VW-10}" y2="${G}"/>`;
    for(let x=18; x<VW-10; x+=12) h += `<line class="cf-hatch" x1="${x}" y1="${G}" x2="${x-7}" y2="${G+7}"/>`;
    /* 무게중심: 높이 치수는 휠베이스처럼 차 밖(앞쪽)으로 뺀다 */
    const [cx, cy] = T(K.a, p.h), [x0] = T(0,0), [x1] = T(L,0), [px, py] = T(L - p.xcop, p.hcop);   /* p.xcop = 뒤축부터 */
    const hdim = (xd, yt, xs, cls, mid, txt) => `<line x1="${xs}" y1="${yt}" x2="${xd-5}" y2="${yt}" class="cf-ext${cls?' '+cls:''}"/>
      <line x1="${xd}" y1="${yt}" x2="${xd}" y2="${G}" class="cf-dim${cls?' '+cls:''}" marker-start="url(#${id+mid}d)" marker-end="url(#${id+mid}d)"/>
      <text transform="translate(${xd-6} ${(yt+G)/2}) rotate(-90)" text-anchor="middle" class="cf-t ${cls?'inc':'dk'}">${txt}</text>`;
    const AERO = c.aero !== false;   /* 에어로 제외면 압력 중심이 정의되지 않으므로 CoP 기호·라벨·치수를 그리지 않는다 */
    /* 높이 치수: 높은 쪽을 바깥(왼쪽)에 두어 보조선이 치수선을 가로지르지 않게 한다 */
    const hiCoP = AERO && py < cy, xIn = 48, xOut = 22;
    h += hdim(hiCoP ? xIn : (AERO ? xOut : xIn), cy, cx-10, '', 'k', `h ${f0(p.h)}`)
      + (AERO ? hdim(hiCoP ? xOut : xIn, py, px-10, 'in', 'i', `${sub('h','CoP')} ${f0(p.hcop)}`) : '')
      + `<line x1="${cx}" y1="${cy+9}" x2="${cx}" y2="${G}" class="cf-lead"/>`;
    /* 앞뒤 위치 치수 (뒤축부터): 위쪽 빈 곳에, 뒤축에서 먼 쪽을 바깥(위)에 */
    const [, yTopF] = T(0, 2*r + 30), yA = 36, yB = 60;
    const xdim = (xe, ye, yd, cls, mid, txt) => `<line x1="${xe}" y1="${yd-6}" x2="${xe}" y2="${ye}" class="cf-ext${cls?' '+cls:''}"/>
      <line x1="${x1}" y1="${yd}" x2="${xe}" y2="${yd}" class="cf-dim${cls?' '+cls:''}" marker-start="url(#${id+mid}d)" marker-end="url(#${id+mid}d)"/>
      ${Math.abs(xe-x1) - 20 > [...txt].reduce((w, ch) => w + (/[\uac00-\ud7a3]/.test(ch) ? 14 : ch===' ' ? 4.2 : 8.2), 0) ? `<text x="${(x1+xe)/2}" y="${yd-6}" text-anchor="middle" class="cf-t ${cls?'inc':'dk'}">${txt}</text>`
        : `<text x="${x1-4}" y="${yd-6}" text-anchor="end" class="cf-t ${cls?'inc':'dk'}">${txt}</text>`}`;   /* 치수선보다 글자가 길면 뒤축에 오른쪽 끝을 맞춰 치수선 위에 (그림 밖으로 안 나가게) */
    const farCoP = AERO && Math.abs(px - x1) > Math.abs(cx - x1);
    h += `<line x1="${x1}" y1="${yA-6}" x2="${x1}" y2="${yTopF}" class="cf-ext"/>`
      + xdim(cx, cy-11, AERO ? (farCoP ? yB : yA) : yB, '', 'k', `CG 뒤축부터 ${f0(L - K.a)} mm`)
      + (AERO ? xdim(px, py-10, farCoP ? yA : yB, 'in', 'i', `CoP 뒤축부터 ${f0(p.xcop)} mm`) : '');
    /* 화살표·기호 */
    const kF = 0.05, dfL = Math.min(90, K.DF*kF), dL = Math.min(90, K.D*kF);
    const ax_ = Math.abs(c.ax) > 0.05, il = Math.min(64, Math.abs(c.ax)*40), idr = c.ax>0 ? 1 : -1;
    const obs = [[cx-13, cy-13, cx+13, cy+13, 6]];   /* 겹치면 안 되는 자리: 기호(가중 6), 화살표(가중 2) */
    if(AERO){ obs.push([px-12, py-12, px+12, py+12, 6]);
      if(dfL > 4){ h += haloArrow(id+'i', px, py+9, px, py+9+dfL, 'cf-force in'); obs.push([px-4, py+9, px+4, py+9+dfL, 2]); }
      if(dL > 4){ h += haloArrow(id+'i', px+9, py, px+9+dL, py, 'cf-force in'); obs.push([px+9, py-4, px+9+dL, py+4, 2]); }
      h += copSym(px, py, 8); }
    if(ax_){ const ex = cx + idr*(10+il); h += accArrow(id+'r', cx + idr*10, cy, ex, cy); obs.push([Math.min(cx, ex), cy-4, Math.max(cx, ex), cy+4, 2]); }
    h += cgSym(cx, cy, 9);
    /* 라벨 자동 배치: 후보 자리를 차례로 보고, 이미 놓인 글자·기호·화살표와 겹치지 않는 첫 자리에 둔다 */
    const put = placer(obs);
    if(AERO && dfL > 4){ const ty = py+9+dfL; h += put(`다운포스 ${f0(K.DF)} N`, 'inc', 12.5, [[px+7, ty, 'start'], [px-7, ty, 'end'], [px+7, py+9+dfL/2+4, 'start'], [px-7, py+9+dfL/2+4, 'end'], [px, ty+14, 'middle']]); }
    if(AERO && dL > 4){ const tx = px+9+dL; h += put(`항력 ${f0(K.D)} N`, 'inc', 12.5, [[tx+4, py+4, 'start'], [tx+2, py-8, 'start'], [tx+2, py+17, 'start'], [tx, py-8, 'end'], [tx, py+17, 'end']]); }
    if(ax_){ const ex = cx + idr*(10+il), an = idr<0 ? 'end' : 'start';
      h += put(inert(p.m*Math.abs(c.ax)*9.81), 'acc', 12.5, [[ex, cy-8, an], [ex, cy+17, an], [ex + idr*4, cy+4, an], [cx + idr*(10+il/2), cy+17, 'middle'], [ex, cy-24, an], [ex, cy+31, an]]); }
    if(AERO) h += put('<tspan class="b inc">CoP</tspan>', 'inc', 12.5, [[px-11, py-7, 'end'], [px+11, py-7, 'start'], [px-11, py+15, 'end'], [px, py-13, 'middle']]);
    h += put('<tspan class="b">CG</tspan>', '', 12.5, [[cx-12, cy+18, 'end'], [cx-12, cy-8, 'end'], [cx+12, cy+18, 'start'], [cx+12, cy-8, 'start']]);
    /* 축하중: 지면 아래에서 접지점으로 올라오는 반력 */
    const kN = 0.026, axle = (x, F, F0, nm, al) => { const [X] = T(x, 0), l = Math.max(8, Math.min(70, F*kN)), d = F - F0, tx = X + (al==='end'?-10:10);
      return arrow(id+'o', X, G + 6 + l, X, G + 4, 'cf-force out') + `<text x="${tx}" y="${G + 26}" text-anchor="${al}" class="cf-t b">${nm} ${f0(F)} N</text><text x="${tx}" y="${G + 42}" text-anchor="${al}" class="cf-t sm ${d>=0?'outc':'mut'}">${f1(F/(K.Ff+K.Fr)*100)} % · 정지 대비 ${d>=0?'+':''}${f0(d)}</text>`; };
    h += axle(0, K.Ff, K.Ff0, '앞축', 'end') + axle(L, K.Fr, K.Fr0, '뒤축', 'end');
    /* 휠베이스 치수 */
    const yd = G + 96;
    h += `<line x1="${x0}" y1="${G+80}" x2="${x0}" y2="${yd+6}" class="cf-ext"/><line x1="${x1}" y1="${G+80}" x2="${x1}" y2="${yd+6}" class="cf-ext"/>
      <line x1="${x0}" y1="${yd}" x2="${x1}" y2="${yd}" class="cf-dim" marker-start="url(#${id}kd)" marker-end="url(#${id}kd)"/>
      <text x="${(x0+x1)/2}" y="${yd-6}" text-anchor="middle" class="cf-t dk">휠베이스 ${f0(L)} mm</text>
      <text x="${(x0+x1)/2}" y="${yd+20}" text-anchor="middle" class="cf-t sm mut">차속 ${f0(c.v)} km/h${Math.abs(c.ax)>0.05?` · 종가속 ${c.ax>0?'+':''}${f1(c.ax)} g`:''}</text></svg>`;
    return h;
  }

  /* ---------- 윗면도 ---------- */
  function top(p, c, K){ const id = 'cft'+(++N), L = p.L, r = p.rt, tf = p.tf, tr = p.tr, S = REF4SIL.top;
    const xmin = XMIN, xmax = L + XMAX_R, s = (VW-PADL-20)/(xmax-xmin), cy0 = 196;
    const T = (x, z) => [(PADL+20)/2 + (x - xmin)*s, cy0 - z*s];
    const Q = (xr, z) => T(RX(xr, L), z);
    const loads = K.w, fq = K.tot/4;
    /* 앞바퀴 조향각: 저속 애커먼 기하(슬립 무시, 회전 중심은 뒤축 연장선 위). δ = atan(L / (R_r ∓ t/2)), 안쪽 바퀴가 더 꺾인다.
       R은 CG 경로 반경이므로 뒤축 중심 반경 R_r = √(R² − b²) 로 바꿔 쓴다 (b = CG에서 뒤축까지) */
    const turn = c.R>0 && isFinite(c.R), b_ = L - K.a, Rm = turn ? Math.sqrt(Math.max((c.R*1000)**2 - b_*b_, (L*0.3)**2)) : Infinity;
    const dIn = turn ? Math.atan(L/Math.max(Rm - tf/2, L*0.2))*180/Math.PI : 0, dOut = turn ? Math.atan(L/(Rm + tf/2))*180/Math.PI : 0;
    const sgn = c.dir==='L' ? -1 : 1;   /* 화면 회전 방향: 좌회전이면 앞끝이 왼쪽(화면 아래)으로 */
    const steer = { fl: turn ? sgn*(c.dir==='L' ? dIn : dOut) : 0, fr: turn ? sgn*(c.dir==='L' ? dOut : dIn) : 0 };
    const tire = (x, z, wdt, F, ang) => { const [X, Y] = T(x - r, z + wdt/2), [cx, cy] = T(x, z);
      return `<rect x="${X.toFixed(1)}" y="${Y.toFixed(1)}" width="${(2*r*s).toFixed(1)}" height="${(wdt*s).toFixed(1)}" rx="${(34*s).toFixed(1)}" class="cf-ttop" style="fill:${heat(F, fq)}"${ang ? ` transform="rotate(${ang.toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : ''}/>`; };
    const ln = (x1_, z1, x2_, z2, cls) => { const [a1,b1]=T(x1_,z1), [a2,b2]=T(x2_,z2); return `<line x1="${a1.toFixed(1)}" y1="${b1.toFixed(1)}" x2="${a2.toFixed(1)}" y2="${b2.toFixed(1)}" class="${cls}"/>`; };
    const armsAt = (x, t, sg) => [1,-1].map(sd => ln(x, sd*(t/2-70), x-170*sg, sd*215,'cf-arm') + ln(x, sd*(t/2-70), x+190*sg, sd*225,'cf-arm')).join('');
    let h = `<svg viewBox="0 0 ${VW} ${VH}" class="cf-svg" role="img" aria-label="윗면도: 바퀴별 하중과 앞바퀴 조향">
      <defs>${mk(id+'r','var(--acc-r)')}</defs><text x="14" y="18" class="cf-t sm mut">← 진행 방향</text>`;
    /* 선회 궤적 (CG 경로) */
    if(turn){ const Rp = c.R*1000*s, [gx, gy] = T(K.a, p.tf/2*K.sideF);
      const dx = Math.min(Rp*0.999, 330), dy = Rp - Math.sqrt(Rp*Rp - dx*dx), y1 = gy + (c.dir==='L' ? dy : -dy);
      h += `<path d="M${(gx-dx).toFixed(1)} ${y1.toFixed(1)} A${Rp.toFixed(1)} ${Rp.toFixed(1)} 0 0 ${c.dir==='L'?1:0} ${(gx+dx).toFixed(1)} ${y1.toFixed(1)}" class="cf-path"/>`; }
    h += `<g class="cf-car">${armsAt(0, tf, 1)}${armsAt(L, tr, -1)}
      <path d="${sil(T, L, S.frame)}" class="cf-frame" fill-rule="evenodd"/><path d="${sil(T, L, S.acc)}" class="cf-acc"/>
      <path d="${sil(T, L, S.fwsn)}" class="cf-sn"/><path d="${sil(T, L, S.fw)}" class="cf-aero t"/>
      <path d="${sil(T, L, S.body)}" class="cf-body"/><path d="${sil(T, L, S.seat)}" class="cf-cockpit"/>`;
    /* 드라이버: 어깨(상체)·팔·헬멧 */
    const W = (mm) => (mm*s).toFixed(1);
    const [bx, by] = Q(830, 0), arm = zs => { const [ax_, ay_] = Q(800, zs*200), [ex, ey] = Q(1020, zs*235), [wx, wy] = Q(1225, zs*125); return `<path d="M${ax_.toFixed(1)} ${ay_.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${wx.toFixed(1)} ${wy.toFixed(1)}" class="cf-drv a" fill="none" style="stroke-width:${W(90)}"/>`; };
    h += `<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${W(150)}" ry="${W(230)}" class="cf-drvb"/>${arm(1)}${arm(-1)}
      <path d="${sil(T, L, S.sw)}" class="cf-sw"/><path d="${sil(T, L, S.hr)}" class="cf-hr"/>`;
    const [hx, hy] = Q(735, 0); h += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(135*s).toFixed(1)}" class="cf-helmet"/>`;
    /* 바퀴 (하중 색, 앞바퀴는 조향각만큼 회전) */
    h += tire(0, tf/2, 205, loads.fr, steer.fr) + tire(0, -tf/2, 205, loads.fl, steer.fl) + tire(L, tr/2, 230, loads.rr, 0) + tire(L, -tr/2, 230, loads.rl, 0);
    h += `<path d="${sil(T, L, S.rwsn)}" class="cf-sn"/><path d="${sil(T, L, S.rw)}" class="cf-aero"/></g>`;
    /* 바퀴 하중 라벨: 오른쪽 바퀴(위) 라벨은 위, 왼쪽 바퀴(아래) 라벨은 아래 */
    const tag = (x, z, F, F0, nm, up) => { const ex = x===0 ? r*Math.sin(Math.max(Math.abs(steer.fl), Math.abs(steer.fr))*Math.PI/180) : 0, [X] = T(x, 0), [, Yt] = T(x, z + (up ? 115 + ex : -115 - ex)); const d = F - F0, lift = F < 0;
      const y1 = up ? Yt - 26 : Yt + 18;
      return `<text x="${X}" y="${y1}" text-anchor="middle" class="cf-t b ${lift?'warn':''}">${nm} ${lift ? '들림' : f0(F)+' N'}</text>
        <text x="${X}" y="${y1+16}" text-anchor="middle" class="cf-t sm ${d>=0?'outc':'mut'}">${f1(Math.max(0,F)/K.tot*100)} % · 정지 대비 ${d>=0?'+':''}${f0(d)}</text>`; };
    const st = K.st; h += tag(0, tf/2, loads.fr, st.fr, '앞오른', true) + tag(0, -tf/2, loads.fl, st.fl, '앞왼', false)
      + tag(L, tr/2, loads.rr, st.rr, '뒤오른', true) + tag(L, -tr/2, loads.rl, st.rl, '뒤왼', false);
    /* 무게중심과 가속도 */
    const [gx, gy] = T(K.a, p.tf/2*K.sideF);
    /* 라벨 자동 배치: 바퀴·바퀴 하중 라벨·CG 기호·화살표를 피한다 */
    const obs = [[gx-13, gy-13, gx+13, gy+13, 6]];
    [[0, tf/2, 205], [0, -tf/2, 205], [L, tr/2, 230], [L, -tr/2, 230]].forEach(([x, z, w]) => { const [a, b] = T(x - r, z + w/2), [c_, d] = T(x + r, z - w/2); obs.push([a, b, c_, d, 2]);
      const [X] = T(x, 0), [, Yt] = T(x, z + (z>0 ? 115 : -115)), y1 = z>0 ? Yt - 26 : Yt + 18; obs.push([X-62, y1-12, X+62, y1+20, 4]); });
    const put = placer(obs); let lb = '';
    if(K.ay > 0.05){ const l = Math.min(70, K.ay/9.81*44), dn = c.dir==='L' ? -1 : 1, ty = gy + dn*(10+l); h += accArrow(id+'r', gx, gy + dn*10, gx, ty); obs.push([gx-4, Math.min(gy, ty), gx+4, Math.max(gy, ty), 2]);
      lb += put(inert(p.m*K.ay), 'acc', 12.5, [[gx-8, ty + (dn>0?2:8), 'end'], [gx+8, ty + (dn>0?2:8), 'start'], [gx, ty + dn*14 + (dn>0?4:0), 'middle'], [gx-8, (gy+ty)/2+4, 'end'], [gx+8, (gy+ty)/2+4, 'start']]); }
    if(Math.abs(c.ax) > 0.05){ const l = Math.min(64, Math.abs(c.ax)*40), sg = c.ax>0 ? 1 : -1, tx = gx + sg*(10+l), an = sg<0 ? 'end' : 'start'; h += accArrow(id+'r', gx + sg*10, gy, tx, gy); obs.push([Math.min(gx, tx), gy-4, Math.max(gx, tx), gy+4, 2]);
      lb += put(inert(p.m*Math.abs(c.ax)*9.81), 'acc', 12.5, [[tx + sg*4, gy+16, an], [tx + sg*4, gy-8, an], [tx + sg*4, gy+4, an], [gx + sg*(10+l/2), gy-8, 'middle']]); }
    h += cgSym(gx, gy, 8) + lb;
    /* 회전 방향과 조향각 */
    if(turn) h += `<text x="${VW-14}" y="${VH-4}" text-anchor="end" class="cf-t sm ac">${c.dir==='L'?'좌':'우'}회전 · CG 경로 R ${f1(c.R)} m · 조향 안 ${f1(dIn)}° 바깥 ${f1(dOut)}°</text>`;
    h += `</svg>`;
    return h;
  }

  /* ---------- 차속별 그래프 (에어로) ---------- */
  function aero(p, c){ const vs = rng(0, 140, 5), C = vv => DASHCALC(p, {v:vv, R:Infinity, ax:0, dir:'L'});
    const ks = vs.map(C), ymax = Math.ceil(Math.max(...ks.map(k=>k.DF))/500)*500 || 500;
    const P1 = plot({x0:70,y0:30,w:300,h:170,xr:[0,140],yr:[0,ymax],xt:[0,40,80,120],yt:rng(0,ymax,ymax/4),xl:'차속 [km/h]',yl:'힘 [N]'});
    let h = `<svg viewBox="0 0 400 250" class="cf-plot">${P1.s}${poly(vs.map((v,i)=>[P1.X(v),P1.Y(ks[i].DF)]),'cf-ln in')}${poly(vs.map((v,i)=>[P1.X(v),P1.Y(ks[i].D)]),'cf-ln k')}
      <line x1="${P1.X(c.v)}" y1="30" x2="${P1.X(c.v)}" y2="200" class="cf-now"/><text x="${P1.X(130)}" y="${P1.Y(ks[26].DF)-8}" text-anchor="end" class="cf-t sm inc">다운포스</text><text x="${P1.X(130)}" y="${P1.Y(ks[26].D)-8}" text-anchor="end" class="cf-t sm">항력</text></svg>`;
    const ymin2 = Math.floor(Math.min(...ks.map(k=>k.Ff))/500)*500, ymax2 = Math.ceil(Math.max(...ks.map(k=>k.Fr))/500)*500;
    const P2 = plot({x0:70,y0:30,w:300,h:170,xr:[0,140],yr:[ymin2,ymax2],xt:[0,40,80,120],yt:rng(ymin2,ymax2,(ymax2-ymin2)/4),xl:'차속 [km/h]',yl:'축하중 [N] (직진, 일정 속도)'});
    h += `<svg viewBox="0 0 400 250" class="cf-plot">${P2.s}${poly(vs.map((v,i)=>[P2.X(v),P2.Y(ks[i].Ff)]),'cf-ln out dash')}${poly(vs.map((v,i)=>[P2.X(v),P2.Y(ks[i].Fr)]),'cf-ln out')}
      <line x1="${P2.X(c.v)}" y1="30" x2="${P2.X(c.v)}" y2="200" class="cf-now"/><text x="${P2.X(135)}" y="${P2.Y(ks[27].Fr)-8}" text-anchor="end" class="cf-t sm outc">뒤축</text><text x="${P2.X(135)}" y="${P2.Y(ks[27].Ff)+16}" text-anchor="end" class="cf-t sm outc">앞축</text></svg>`;
    return h;
  }
  /* ---------- 앞에서 · 뒤에서 (축별 정면도) ----------
     앞에서 보면 차의 오른쪽이 화면 왼쪽, 뒤에서 보면 화면 오른쪽. 롤은 서스 도구(4·6) 전까지 0으로 둔다.
     뒤에서 그림은 오른쪽 칸(폭 0.9)에 들어가므로 viewBox 폭도 0.9배로 해 두 그림의 화면 축척을 같게 한다 */
  function axleV(p, c, K, ax){ const id = 'cfa'+(++N), F = ax==='f', L = p.L, r = p.rt, t = F ? p.tf : p.tr, wd = F ? 205 : 230, S = REF4SIL.front;
    const xmin = XMIN, xmax = L + XMAX_R, s = (VW-PADL-20)/(xmax-xmin), VH2 = 340, G = 220, VWa = F ? VW : Math.round(VW*0.9), X0 = VWa/2 + 20;
    const sg = F ? -1 : 1;   /* 화면 x = X0 + sg·z */
    const T = (z, y) => [X0 + sg*z*s, G - y*s];
    const ring = rs => rs.map(rr => { let d=''; for(let i=0;i<rr.length;i+=2){ const [X,Y]=T(rr[i], rr[i+1]); d += (i?'L':'M')+X.toFixed(1)+' '+Y.toFixed(1); } return d+'Z'; }).join(' ');
    const ln = (z1, y1, z2, y2, cls, sw) => { const [a,b]=T(z1,y1), [c_,d]=T(z2,y2); return `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c_.toFixed(1)}" y2="${d.toFixed(1)}" class="${cls}"${sw?` style="stroke-width:${sw}"`:''}/>`; };
    const fq = K.tot/4, wl = F ? {R:K.w.fr, L:K.w.fl, R0:K.st.fr, L0:K.st.fl} : {R:K.w.rr, L:K.w.rl, R0:K.st.rr, L0:K.st.rl};
    const tyre = (z, Fz) => { const [Xa, Y] = T(z - wd/2, 2*r), [Xb] = T(z + wd/2, 0); return `<rect x="${Math.min(Xa, Xb).toFixed(1)}" y="${Y.toFixed(1)}" width="${(wd*s).toFixed(1)}" height="${(2*r*s).toFixed(1)}" rx="${(30*s).toFixed(1)}" class="cf-ttop" style="fill:${heat(Fz, fq)}"/>`; };
    const arms = sd => { const zo = sd*(t/2 - 60), zu = sd*(t/2 - 85);
      return ln(sd*215, 140, zo, r-85, 'cf-arm') + ln(sd*240, 330, zu, r+100, 'cf-arm') + ln(zo, r-85, zu, r+100, 'cf-drv a', (40*s).toFixed(1)); };
    const W_ = mm => (mm*s).toFixed(1), [hx, hy] = T(0, 795), [bx, by] = T(0, 590);
    const hR = 135*s, visor = F ? `<rect x="${(hx-hR*0.72).toFixed(1)}" y="${(hy-hR*0.28).toFixed(1)}" width="${(hR*1.44).toFixed(1)}" height="${(hR*0.48).toFixed(1)}" rx="${(hR*0.22).toFixed(1)}" class="cf-visor"/>` : '';
    const driver = `<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${W_(210)}" ry="${W_(70)}" class="cf-drvb"/><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${hR.toFixed(1)}" class="cf-helmet"/>${visor}`;
    const far = F ? `<path d="${ring(S.rwsn)}" class="cf-sn"/><path d="${ring(S.rw)}" class="cf-aero"/><path d="${ring(S.mh)}" class="cf-frame" fill-rule="evenodd"/>${driver}`
                  : `<path d="${ring(S.fw)}" class="cf-aero"/><path d="${ring(S.body)}" class="cf-body"/>${driver}<path d="${ring(S.mh)}" class="cf-frame" fill-rule="evenodd"/><path d="${ring(S.acc)}" class="cf-acc"/><path d="${ring(S.mot)}" class="cf-motor"/><path d="${ring(S.diff)}" class="cf-motor"/><path d="${ring(S.rf)}" class="cf-frame" fill-rule="evenodd"/>`;
    const near = F ? `<path d="${ring(S.fwsn)}" class="cf-sn"/><path d="${ring(S.fw)}" class="cf-aero"/>` : `<path d="${ring(S.rwsn)}" class="cf-sn"/><path d="${ring(S.rw)}" class="cf-aero"/>`;
    let h = `<svg viewBox="0 0 ${VWa} ${VH2}" class="cf-svg" role="img" aria-label="${F?'앞':'뒤'}에서 본 그림: 좌우 바퀴 하중">
      <defs>${mk(id+'k','var(--ink-2)')}${mk(id+'o','var(--out)')}${mk(id+'r','var(--acc-r)')}</defs>
      <g class="cf-car">${far}${F ? `<path d="${ring(S.body)}" class="cf-body"/>` : ''}${arms(1)}${arms(-1)}${tyre(t/2, wl.R)}${tyre(-t/2, wl.L)}${near}</g>`;
    h += `<line class="cf-gnd" x1="10" y1="${G}" x2="${VWa-10}" y2="${G}"/>`;
    for(let x=18; x<VWa-10; x+=12) h += `<line class="cf-hatch" x1="${x}" y1="${G}" x2="${x-7}" y2="${G+7}"/>`;
    /* 바퀴 하중: 지면 반력 화살표 + 라벨 (다른 그림과 같은 양식) */
    /* 라벨은 옆에서 그림과 같이 화살표 왼쪽, 지면 바로 아래 */
    const kN = 0.026, lab = (z, Fz, F0, nm) => { const [X] = T(z, 0), l = Math.max(8, Math.min(70, Fz*kN)), d = Fz - F0, lift = Fz < 0;
      return arrow(id+'o', X, G + 6 + l, X, G + 4, 'cf-force out') + `<text x="${X-10}" y="${G + 26}" text-anchor="end" class="cf-t b ${lift?'warn':''}">${nm} ${lift ? '들림' : f0(Fz)+' N'}</text><text x="${X-10}" y="${G + 42}" text-anchor="end" class="cf-t sm ${d>=0?'outc':'mut'}">${f1(Math.max(0,Fz)/K.tot*100)} % · 정지 대비 ${d>=0?'+':''}${f0(d)}</text>`; };
    h += lab(t/2, wl.R, wl.R0, (F?'앞':'뒤')+'오른') + lab(-t/2, wl.L, wl.L0, (F?'앞':'뒤')+'왼');
    /* 트레드 치수: 하중 라벨 아래 (휠베이스 치수와 같은 양식) */
    const [tA] = T(t/2, 0), [tB] = T(-t/2, 0), yd = G + 96;
    h += `<line x1="${tA}" y1="${G+80}" x2="${tA}" y2="${yd+6}" class="cf-ext"/><line x1="${tB}" y1="${G+80}" x2="${tB}" y2="${yd+6}" class="cf-ext"/>
      <line x1="${Math.min(tA,tB)}" y1="${yd}" x2="${Math.max(tA,tB)}" y2="${yd}" class="cf-dim" marker-start="url(#${id}kd)" marker-end="url(#${id}kd)"/>
      <text x="${(tA+tB)/2}" y="${yd-6}" text-anchor="middle" class="cf-t dk">${F?'앞':'뒤'} 트레드 ${f0(t)} mm</text>`;
    /* 무게중심: 높이 치수는 차 바깥 왼쪽 */
    const zc = p.tf/2*K.sideF, [cx, cy] = T(zc, p.h), xd = 40;
    h += `<line x1="${cx-10}" y1="${cy}" x2="${xd-5}" y2="${cy}" class="cf-ext"/><line x1="${xd}" y1="${cy}" x2="${xd}" y2="${G}" class="cf-dim" marker-start="url(#${id}kd)" marker-end="url(#${id}kd)"/>
      <text transform="translate(${xd-6} ${(cy+G)/2}) rotate(-90)" text-anchor="middle" class="cf-t dk">h ${f0(p.h)}</text>`;
    /* 횡방향 관성력: 선회 바깥쪽(가속도의 반대) */
    /* 라벨 자동 배치: CG 기호·화살표·왼쪽 위 횡하중 이동 글을 피한다 */
    const obs = [[cx-13, cy-13, cx+13, cy+13, 6], [10, 6, 200, 46, 4]];
    /* 바퀴는 피할 대상에 넣지 않는다: 라벨이 화살표에서 멀어지는 것보다 흰 윤곽으로 바퀴 위에 놓이는 편이 읽기 쉽다 */
    let lb = '';
    if(K.ay > 0.05){ const dz = c.dir==='L' ? -1 : 1, dirX = sg*dz, l = Math.min(70, K.ay/9.81*44), tx = cx - dirX*(10+l), an = dirX>0 ? 'end' : 'start';
      h += haloArrow(id+'r', cx - dirX*10, cy, tx, cy, 'cf-force acc'); obs.push([Math.min(cx, tx), cy-4, Math.max(cx, tx), cy+4, 2]);
      lb += placer(obs)(inert(p.m*K.ay), 'acc', 12.5, [[tx, cy-10, an], [tx, cy+19, an], [tx - dirX*4, cy+4, an], [(cx+tx)/2, cy-10, 'middle'], [(cx+tx)/2 - dirX*14, cy-24, 'middle'], [tx, cy-26, an], [(cx+tx)/2, cy+19, 'middle']]); }
    h += cgSym(cx, cy, 8) + lb;
    /* 이 축의 횡하중 이동 */
    const dY = F ? K.dYf : K.dYr;
    h += `<text x="14" y="20" class="cf-t sm ${dY>0.5?'outc':'mut'}"><tspan class="b ${dY>0.5?'outc':''}">횡하중 이동</tspan><tspan x="14" dy="17">${sub('ΔF','z')} ${f0(dY)} N${dY>0.5?` → 바깥 ${c.dir==='L'?'오른':'왼'}쪽`:''}</tspan></text></svg>`;
    return h;
  }
  /* 차 윤곽만 (하중 · 드라이버 없이): 다른 그림(도구 1 질량 분포 · 드라이버 모델)의 바탕. T(x 앞축에서 뒤로, y 위 또는 z 오른쪽) → 화면, s = 화면/mm */
  function carSide(T, L, r, s){ const C = cus('side', T(0, r), T(L, r)); if(C) return `<g class="cf-car cf-faint cs">${C}</g>`;
    const S = REF4SIL.side, Q = (xr, y) => T(RX(xr, L), y), [mx, my] = Q(140, 220);
    const arms = (x, sg) => [[x, r+95, x-170*sg, r+118],[x, r+95, x+170*sg, r+128],[x, r-95, x-180*sg, 150],[x, r-95, x+200*sg, 160]]
      .map(a => { const [x1,y1]=T(a[0],a[1]), [x2,y2]=T(a[2],a[3]); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="cf-arm"/>`; }).join('');
    return `<g class="cf-car cf-faint"><path d="${sil(T, L, S.acc)}" class="cf-acc"/><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${(114*s).toFixed(1)}" class="cf-motor"/>
      <path d="${sil(T, L, S.frame)}" class="cf-frame" fill-rule="evenodd"/><path d="${sil(T, L, S.rwsn)}" class="cf-sn"/><path d="${sil(T, L, S.hr)}" class="cf-hr"/>
      <path d="${sil(T, L, S.body)}" class="cf-body"/>${arms(0, 1)}${arms(L, -1)}${wheelSide(T, s, 0, r, '#e9e7ee')}${wheelSide(T, s, L, r, '#e9e7ee')}
      <path d="${sil(T, L, S.fwsn)}" class="cf-sn"/><path d="${sil(T, L, S.fw)}" class="cf-aero"/><path d="${sil(T, L, S.rw)}" class="cf-aero"/></g>`; }
  function carTop(T, L, r, s, tf, tr){ const C = cus('top', T(0, 0), T(L, 0)); if(C) return `<g class="cf-car cf-faint cs">${C}</g>`;
    const S = REF4SIL.top;
    const ln = (x1_, z1, x2_, z2) => { const [a1,b1]=T(x1_,z1), [a2,b2]=T(x2_,z2); return `<line x1="${a1.toFixed(1)}" y1="${b1.toFixed(1)}" x2="${a2.toFixed(1)}" y2="${b2.toFixed(1)}" class="cf-arm"/>`; };
    const armsAt = (x, t, sg) => [1,-1].map(sd => ln(x, sd*(t/2-70), x-170*sg, sd*215) + ln(x, sd*(t/2-70), x+190*sg, sd*225)).join('');
    const tire = (x, z, wdt) => { const [X, Y] = T(x - r, z + wdt/2); return `<rect x="${X.toFixed(1)}" y="${Y.toFixed(1)}" width="${(2*r*s).toFixed(1)}" height="${(wdt*s).toFixed(1)}" rx="${(34*s).toFixed(1)}" class="cf-ttop" style="fill:#e9e7ee"/>`; };
    return `<g class="cf-car cf-faint">${armsAt(0, tf, 1)}${armsAt(L, tr, -1)}<path d="${sil(T, L, S.frame)}" class="cf-frame" fill-rule="evenodd"/><path d="${sil(T, L, S.acc)}" class="cf-acc"/>
      <path d="${sil(T, L, S.fwsn)}" class="cf-sn"/><path d="${sil(T, L, S.fw)}" class="cf-aero t"/><path d="${sil(T, L, S.body)}" class="cf-body"/><path d="${sil(T, L, S.seat)}" class="cf-cockpit"/>
      <path d="${sil(T, L, S.sw)}" class="cf-sw"/><path d="${sil(T, L, S.hr)}" class="cf-hr"/>${tire(0, tf/2, 205)}${tire(0, -tf/2, 205)}${tire(L, tr/2, 230)}${tire(L, -tr/2, 230)}
      <path d="${sil(T, L, S.rwsn)}" class="cf-sn"/><path d="${sil(T, L, S.rw)}" class="cf-aero"/></g>`; }
  return { side, top, aero, front: (p,c,K) => axleV(p,c,K,'f'), rear: (p,c,K) => axleV(p,c,K,'r'), carSide, carTop };
})();
