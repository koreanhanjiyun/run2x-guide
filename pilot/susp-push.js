/* ============================================================
   시범 기구: 일반 FS 앞 서스펜션 한 코너 (더블 위시본 + 푸시로드 + 벨크랭크 + 코일오버 댐퍼)
   - REF4 가 아니라 흔한 FS 치수(가정)로 만든 일반 모델. 앞바퀴 한 코너
   - 좌표: 사이트 3D 공통 (X 앞 · Y 위 · Z 왼쪽 = 바깥, m). 링크는 앞에서 본 평면(z, y) 기구로 풀고,
     모든 피벗 축은 X 와 나란하다고 가정 (평면 기구)
   - 입력 하나: 바퀴 중심 높이 변화 b. 아래 위시본 각 → 업라이트 · 위 위시본(두 원 교점) → 푸시로드 → 벨크랭크(두 원 교점) → 댐퍼 길이
   ============================================================ */
const SUSP_K = (() => {
  const P = { LI:[0.20, 0.11], UI:[0.24, 0.33], LBJ0:[0.53, 0.13], UBJ0:[0.51, 0.38], WC0:[0.60, 0.255],
    fP:0.86, Poff:[0, 0.025], B:[0.15, 0.47], r1:0.06, r2:0.09, bend:70*Math.PI/180, Ld:0.20,
    XLl:0.14, XLu:0.13, xD:0.06 };   /* 위시본 안쪽 두 다리 앞뒤 간격 절반 · 댐퍼 평면 X */
  const sub = (a, b) => [a[0]-b[0], a[1]-b[1]], add = (a, b) => [a[0]+b[0], a[1]+b[1]], mul = (a, k) => [a[0]*k, a[1]*k];
  const len = a => Math.hypot(a[0], a[1]), ang = a => Math.atan2(a[1], a[0]);
  const rot = (v, t) => [Math.cos(t)*v[0] - Math.sin(t)*v[1], Math.sin(t)*v[0] + Math.cos(t)*v[1]];
  /* 두 원(c0, r0) · (c1, r1)의 교점 중 near 에 가까운 것 */
  function cc(c0, r0, c1, r1, near){ const dv = sub(c1, c0), d = len(dv), a = (r0*r0 - r1*r1 + d*d)/(2*d), h = Math.sqrt(Math.max(r0*r0 - a*a, 0));
    const p = add(c0, mul(dv, a/d)), n = [-dv[1]/d, dv[0]/d], s1 = add(p, mul(n, h)), s2 = sub(p, mul(n, h));
    return len(sub(s1, near)) < len(sub(s2, near)) ? s1 : s2; }
  const Ll = len(sub(P.LBJ0, P.LI)), Lu = len(sub(P.UBJ0, P.UI)), dU = len(sub(P.UBJ0, P.LBJ0));
  const po = (LBJ, th) => add(add(P.LI, mul(sub(LBJ, P.LI), P.fP)), rot(P.Poff, th));   /* 푸시로드 바깥 점: 아래 위시본에 붙음 */
  function arms(th){ const LBJ = add(P.LI, rot(sub(P.LBJ0, P.LI), th)), UBJ = cc(P.UI, Lu, LBJ, dU, P.UBJ0), al = ang(sub(UBJ, LBJ)) - ang(sub(P.UBJ0, P.LBJ0));
    return { th, LBJ, UBJ, al, WC:add(LBJ, rot(sub(P.WC0, P.LBJ0), al)), thu:ang(sub(UBJ, P.UI)) - ang(sub(P.UBJ0, P.UI)), P:po(LBJ, th) }; }
  /* 벨크랭크 처음 자세: 푸시로드 끝 A1 이 푸시로드와 직각, 둘째 팔 A2 는 bend 만큼 돌린 방향 */
  const P0 = po(P.LBJ0, 0), u = mul(sub(P.B, P0), 1/len(sub(P.B, P0))), A1_0 = sub(P.B, mul([u[1], -u[0]], P.r1)), Lp = len(sub(A1_0, P0)), a1 = ang(sub(A1_0, P.B));
  const phi0 = a1 + P.bend, A2_0 = add(P.B, mul([Math.cos(phi0), Math.sin(phi0)], P.r2));
  function solve(b){ let th = 0, s;
    for(let k = 0; k < 40; k++){ s = arms(th); const e = (s.WC[1] - P.WC0[1]) - b; if(Math.abs(e) < 1e-9) break;
      const d = (arms(th + 1e-5).WC[1] - s.WC[1])/1e-5; th -= e/d; }   /* 뉴턴: 바퀴 중심 높이가 b 가 되는 아래 위시본 각 */
    const A1 = cc(P.B, P.r1, s.P, Lp, A1_0), bc = ang(sub(A1, P.B)) - a1, A2 = add(P.B, mul([Math.cos(phi0 + bc), Math.sin(phi0 + bc)], P.r2));
    return Object.assign(s, { b, A1, bc, A2 }); }
  /* 범프 때 벨크랭크가 도는 방향 → 댐퍼 고정점 D 를 A2 가 다가오는 쪽에 (범프에서 댐퍼 눌림) */
  const w = Math.sign(solve(0.002).bc), rh = [Math.cos(phi0), Math.sin(phi0)], D = add(A2_0, mul([-rh[1]*w, rh[0]*w], P.Ld));
  function state(b){ const s = solve(b); s.D = D; s.L = len(sub(s.A2, D)); return s; }
  return { P, Ll, Lu, Lp, D, L0:P.Ld, state, len, sub };
})();

/* 그림 만들기: kit = INK3D.makeKit(...) */
function SUSP_BUILD(kit){
  const { T, scene, M, part, ghost, cylBetween, xCyl, springGeo, plate } = kit, K = SUSP_K, P = K.P;
  const V = (x, zy) => new T.Vector3(x, zy[1], zy[0]);   /* 평면 점 (z, y) + X → 3D */
  const root = new T.Group(); scene.add(root);
  const s0 = K.state(0);
  /* --- 차체(고스트): 아래 · 위 세로 기둥과 앞뒤 레일, 댐퍼 받침 가로 관 --- */
  const fr = new T.Group(); root.add(fr); const tr = 0.0127;
  const gt = (a, b) => fr.add(ghost(cylBetween(a, b, tr, 16), 40));
  gt(new T.Vector3(-0.32, 0.10, 0.18), new T.Vector3(0.32, 0.10, 0.18));          /* 아래 레일 */
  gt(new T.Vector3(-0.32, 0.52, 0.15), new T.Vector3(0.32, 0.52, 0.15));          /* 위 레일 */
  [-0.15, 0.15].forEach(x => { gt(new T.Vector3(x, 0.10, 0.18), new T.Vector3(x, 0.52, 0.15)); });   /* 세로 기둥 (위시본 피벗 붙는 곳) */
  gt(new T.Vector3(P.xD, 0.30, -0.06), new T.Vector3(P.xD, 0.30, 0.17));        /* 댐퍼 받침 가로 관 */
  gt(new T.Vector3(-0.15, 0.52, 0.15), new T.Vector3(-0.15, 0.52, -0.06));
  gt(new T.Vector3(0.15, 0.52, 0.15), new T.Vector3(0.15, 0.52, -0.06));
  /* 피벗 받침(브래킷): 기둥에서 피벗까지 짧은 판 */
  const brk = (x, zy) => { const g = new T.BoxGeometry(0.006, 0.05, 0.07); const m = ghost(g, 30); m.position.copy(V(x, zy)).add(new T.Vector3(0, 0, -0.02)); fr.add(m); };
  [-P.XLl, P.XLl].forEach(x => brk(x, P.LI)); [-P.XLu, P.XLu].forEach(x => brk(x, P.UI));
  /* --- 위시본: 안쪽 두 다리(앞 · 뒤)가 볼조인트로 모임. 피벗(평면 점) 기준 그룹 → rotation.x 로 회전 --- */
  function wishbone(pv, bj0, xl){ const g = new T.Group(); g.position.copy(V(0, pv)); root.add(g);
    const loc = zy => V(0, sub(zy, pv)), o = loc(bj0); const r = 0.008;
    [-xl, xl].forEach(x => { const a = new T.Vector3(x, 0, 0); g.add(part(cylBetween(a, o, r, 20), M.steel, {edges:40}));
      const eye = part(xCyl(0.014, 0.026, 24), M.dark); eye.position.copy(a); g.add(eye); });   /* 안쪽 로드엔드 눈 */
    const bj = part(new T.SphereGeometry(0.016, 20, 14), M.dark, {edges:0}); bj.position.copy(o); g.add(bj);   /* 볼조인트 */
    return g; }
  const sub = (a, b) => [a[0]-b[0], a[1]-b[1]];
  const lowA = wishbone(P.LI, P.LBJ0, P.XLl), upA = wishbone(P.UI, P.UBJ0, P.XLu);
  /* 푸시로드 받침: 아래 위시본 두 다리 사이 작은 판 (푸시로드 바깥 끝이 붙는 곳) */
  { const pp = V(0, sub(s0.P, P.LI)); const g = new T.BoxGeometry(0.044, 0.03, 0.03); const m = part(g, M.dark); m.position.copy(pp).add(new T.Vector3(0, -0.012, 0)); lowA.add(m); }
  /* --- 업라이트 + 바퀴: 아래 볼조인트 기준 그룹 --- */
  const upr = new T.Group(); upr.position.copy(V(0, P.LBJ0)); root.add(upr);
  { const sh = new T.Shape(); [[-0.026,-0.024],[0.032,-0.024],[0.062,0.085],[0.062,0.165],[0.024,0.272],[-0.044,0.272],[-0.04,0.18],[-0.024,0.11]].forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); sh.closePath();
    upr.add(part(plate(sh, 0.05), M.alloy, {edges:25}));
    const wc = sub(P.WC0, P.LBJ0); const sp = part(new T.CylinderGeometry(0.03, 0.03, 0.06, 28).rotateX(Math.PI/2), M.steel); sp.position.copy(V(0, wc)).add(new T.Vector3(0, 0, 0.0)); upr.add(sp);   /* 허브 */
    const wheel = new T.Group(); wheel.position.copy(V(0, wc)); upr.add(wheel);
    const prof = []; const Rt = 0.26, Rr = 0.165, hw = 0.10, rc = 0.04;   /* 타이어 단면: 둥근 직사각형 */
    for(let k = 0; k <= 8; k++){ const a = -Math.PI/2 + k/8*Math.PI/2; prof.push(new T.Vector2(Rt - rc + rc*Math.cos(a), -hw + rc + rc*Math.sin(a) - 0)); }
    for(let k = 0; k <= 8; k++){ const a = k/8*Math.PI/2; prof.push(new T.Vector2(Rt - rc + rc*Math.cos(a), hw - rc + rc*Math.sin(a))); }
    prof.push(new T.Vector2(Rr, hw - 0.01)); prof.push(new T.Vector2(Rr, -hw + 0.01)); prof.push(prof[0].clone());
    const tg = new T.LatheGeometry(prof, 72).rotateX(Math.PI/2); wheel.add(part(tg, M.rubber, {edges:50}));
    const rim = new T.CylinderGeometry(Rr - 0.004, Rr - 0.004, 0.19, 64, 1, true).rotateX(Math.PI/2); wheel.add(part(rim, M.alloy, {edges:50, outline:false}));
    const disc = new T.CylinderGeometry(Rr - 0.004, Rr - 0.004, 0.008, 64).rotateX(Math.PI/2); const dm = part(disc, M.alloy, {edges:50}); dm.position.z = 0.045; wheel.add(dm); }
  /* --- 푸시로드: 길이 고정, 바깥 끝 P 에서 A1 쪽으로 (로컬 +Y) --- */
  const prod = new T.Group(); root.add(prod);
  { const L = K.Lp; prod.add(part(new T.CylinderGeometry(0.0075, 0.0075, L - 0.03, 20).translate(0, L/2, 0), M.hero, {edges:40}));
    [0.0, L].forEach(y => { const e = part(xCyl(0.013, 0.02, 24), M.hero); e.position.y = y; prod.add(e); }); }
  /* --- 벨크랭크: 두 판(푸시로드를 사이에 끼움) + 피벗 보스 + A2 핀이 댐퍼 평면까지 --- */
  const bcg = new T.Group(); bcg.position.copy(V(0, P.B)); root.add(bcg);
  { const a1 = sub(s0.A1, P.B), a2 = sub(s0.A2, P.B), pts = [];
    [[[0, 0], 0.024], [a1, 0.016], [a2, 0.017]].forEach(([c, r]) => { for(let k = 0; k < 24; k++){ const t = k/24*Math.PI*2; pts.push([c[0] + r*Math.cos(t), c[1] + r*Math.sin(t)]); } });
    const hull = (p => { p = p.slice().sort((a, b) => a[0]-b[0] || a[1]-b[1]); const cr = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]); const lo = [], up = [];
      for(const q of p){ while(lo.length >= 2 && cr(lo[lo.length-2], lo[lo.length-1], q) <= 0) lo.pop(); lo.push(q); }
      for(let k = p.length-1; k >= 0; k--){ const q = p[k]; while(up.length >= 2 && cr(up[up.length-2], up[up.length-1], q) <= 0) up.pop(); up.push(q); } up.pop(); lo.pop(); return lo.concat(up); })(pts);
    const sh = new T.Shape(); hull.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); sh.closePath();
    [-0.012, 0.012].forEach(x => { const m = part(plate(sh, 0.005), M.hero, {edges:20}); m.position.x = x; bcg.add(m); });
    const boss = part(xCyl(0.019, 0.036, 28), M.hero); bcg.add(boss);
    const pin1 = part(xCyl(0.006, 0.034, 16), M.dark); pin1.position.copy(V(0, a1)); bcg.add(pin1);
    const sp2 = part(cylBetween(V(0.012, a2), V(P.xD - 0.009, a2), 0.008, 18), M.hero); bcg.add(sp2);   /* A2 핀 · 스페이서: 댐퍼 평면까지 */ }
  /* 벨크랭크 피벗 받침 (고스트): 위 레일에서 내려온 두 판 */
  [-0.026, 0.03].forEach(x => { const m = ghost(new T.BoxGeometry(0.005, 0.07, 0.05), 30); m.position.copy(V(x, P.B)).add(new T.Vector3(0, 0.025, 0)); fr.add(m); });
  /* --- 댐퍼(코일오버): 몸통은 고정점 D 에서 A2 쪽(로컬 +Y), 축은 A2 눈에서 몸통 안으로, 스프링은 몸통 칼라 ~ 축 끝 받침 사이 --- */
  const dmp = new T.Group(); root.add(dmp);
  const BODY = 0.105, shaft = new T.Group(); dmp.add(shaft);
  { dmp.add(part(new T.CylinderGeometry(0.021, 0.021, BODY, 32).translate(0, 0.012 + BODY/2, 0), M.steel, {edges:40}));
    const eyeD = part(xCyl(0.013, 0.02, 24), M.dark); dmp.add(eyeD);
    const res = part(new T.CylinderGeometry(0.016, 0.016, 0.075, 28).translate(0, 0.05, 0), M.steel, {edges:40}); res.position.set(0.0, 0, -0.04); dmp.add(res);   /* 피기백 리저버 */
    const hose = part(cylBetween(new T.Vector3(0, 0.02, -0.04), new T.Vector3(0, 0.02, -0.018), 0.006, 12), M.dark); dmp.add(hose);
    const col = part(new T.CylinderGeometry(0.032, 0.032, 0.008, 32).translate(0, 0.08, 0), M.dark); dmp.add(col);   /* 아래 스프링 받침(칼라) */
    shaft.add(part(new T.CylinderGeometry(0.0065, 0.0065, 0.11, 18).translate(0, -0.055, 0), M.alloy, {edges:40}));
    const seat = part(new T.CylinderGeometry(0.032, 0.032, 0.008, 32).translate(0, -0.018, 0), M.dark); shaft.add(seat);
    const eyeA = part(xCyl(0.013, 0.02, 24), M.dark); shaft.add(eyeA); }
  const spring = part(springGeo(0.026, 6, 0.0035), M.hero2, {edges:0}); dmp.add(spring);
  /* 범프 표시(범례형): 바퀴 위 화살표 — 부품 아님, 연결선 없이 옆에 글자 */
  const arrow = new T.Group(); root.add(arrow);
  { const red = new T.MeshBasicMaterial({color:0xd6336c}); const sh = new T.Mesh(new T.CylinderGeometry(0.003, 0.003, 0.07, 12), red); arrow.add(sh);
    [1, -1].forEach(s => { const c = new T.Mesh(new T.ConeGeometry(0.009, 0.022, 16), red); c.position.y = s*0.045; if(s < 0) c.rotation.z = Math.PI; arrow.add(c); }); }

  const Y = new T.Vector3(0, 1, 0), q = new T.Quaternion();
  function pose(b){ const s = K.state(b);
    lowA.rotation.x = -s.th; upA.rotation.x = -s.thu;
    upr.position.copy(V(0, s.LBJ)); upr.rotation.x = -s.al;
    const p = V(0, s.P), a = V(0, s.A1); prod.position.copy(p); prod.quaternion.copy(q.setFromUnitVectors(Y, a.clone().sub(p).normalize()));
    bcg.rotation.x = -s.bc;
    const d = V(P.xD, s.D), e = V(P.xD, s.A2), dir = e.clone().sub(d), L = dir.length(); dmp.position.copy(d); dmp.quaternion.copy(q.setFromUnitVectors(Y, dir.normalize()));
    shaft.position.y = L; const y0 = 0.084, y1 = L - 0.022; spring.position.y = y0; spring.scale.y = y1 - y0;
    arrow.position.copy(V(0.0, [s.WC[0], s.WC[1] + 0.31]));   /* 타이어 위 (바퀴와 함께 오르내림) */
    return s; }
  pose(0);
  /* 라벨 기준점 (세계 좌표) */
  const W = (o, x, zy) => v => { v.copy(V(x, zy)); return v; };
  const callouts = [
    { name:'푸시로드', at:v => { const s = cur(); v.copy(V(0, [(s.P[0] + s.A1[0])/2, (s.P[1] + s.A1[1])/2])); } },
    { name:'벨크랭크', at:v => { const s = cur(); v.copy(V(0.014, [P.B[0] + 0.55*(s.A2[0]-P.B[0]), P.B[1] + 0.55*(s.A2[1]-P.B[1])])); } },
    { name:'댐퍼 · 스프링', at:v => { const s = cur(); v.copy(V(P.xD + 0.02, [s.D[0] + 0.3*(s.A2[0]-s.D[0]), s.D[1] + 0.3*(s.A2[1]-s.D[1])])); } },
    { name:'위 위시본', at:v => { const s = cur(); v.copy(V(P.XLu*0.45, [P.UI[0] + 0.55*(s.UBJ[0]-P.UI[0]), P.UI[1] + 0.55*(s.UBJ[1]-P.UI[1])])); } },
    { name:'아래 위시본', at:v => { const s = cur(); v.copy(V(P.XLl*0.6, [P.LI[0] + 0.4*(s.LBJ[0]-P.LI[0]), P.LI[1] + 0.4*(s.LBJ[1]-P.LI[1])])); } },
    { name:'업라이트', at:v => { const s = cur(); v.copy(V(-0.025, [s.LBJ[0] - 0.03, s.LBJ[1] + 0.2])); } },
  ];
  let S = K.state(0); const cur = () => S;
  return { root, arrow, callouts, pose(b){ S = pose(b); return S; } };
}
