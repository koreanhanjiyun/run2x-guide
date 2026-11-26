/* ============================================================
   시범: 프레임 시스템 · 강관 스페이스 프레임 카드 그림 2장
   - 그림 1: 일반 FS 강관 스페이스 프레임 (REF4 아님, 흔한 FS 배치). 좌표 = 사이트 차량 좌표(X 앞 · Y 위 · Z 왼쪽, m)
   - 그림 2: 사각형 칸 vs 대각 부재를 넣은 칸, 같은 옆 하중 (움직임 = 원리 → 애니메이션)
   ============================================================ */
/* --- 그림 1 --- */
function FRAME_BUILD(kit){
  const { T, scene, M, part, ghost, cylBetween } = kit;
  const root = new T.Group(); scene.add(root);
  const P = (x, y, z) => new T.Vector3(x, y, z);
  /* 한쪽(왼쪽 z > 0) 노드. 오른쪽은 z 를 뒤집어 씀 */
  const N = {
    Rb:[0.05, 0.13, 0.21], Rt:[0.05, 0.42, 0.21],                       // 맨 뒤
    Qb:[0.42, 0.09, 0.26], Qt:[0.42, 0.43, 0.25],                       // 모터 · 배터리 칸 앞
    Mb:[0.82, 0.05, 0.30], Ms:[0.82, 0.30, 0.31], Mu:[0.82, 0.45, 0.31], Mh:[0.82, 0.74, 0.27], Mt:[0.82, 1.04, 0.18],   // 메인 롤후프
    Fb:[1.50, 0.05, 0.24], Fs:[1.50, 0.31, 0.27], Fu:[1.50, 0.44, 0.25], Ft:[1.50, 0.58, 0.17],                       // 프론트 롤후프
    Bb:[2.05, 0.10, 0.15], Bt:[2.05, 0.40, 0.15],                       // 앞 벌크헤드
  };
  const L = k => P(N[k][0], N[k][1], N[k][2]), Rr = k => P(N[k][0], N[k][1], -N[k][2]);
  const r1 = 0.0127, r2 = 0.0105;   /* 굵은 부재(롤후프 등) · 일반 부재 — 화면 굵기 차이만 */
  const tubes = [];   /* [a, b, r, mat] */
  const both = (a, b, r) => { tubes.push([L(a), L(b), r]); tubes.push([Rr(a), Rr(b), r]); };
  const across = (a, b, r) => tubes.push([L(a), Rr(b || a), r]);
  /* 옆면 */
  ['Rb-Qb', 'Qb-Mb', 'Mb-Fb', 'Fb-Bb', 'Rt-Qt', 'Qt-Mu', 'Fs-Ms', 'Bt-Fu', 'Rb-Rt', 'Qb-Qt', 'Bb-Bt'].forEach(s => { const [a, b] = s.split('-'); both(a, b, r2); });
  both('Rb', 'Qt', r2); both('Qb', 'Mu', r2); both('Bb', 'Fu', r2);                 // 옆면 대각
  both('Ft', 'Bt', r2);                                                              // 프론트 롤후프 버팀
  both('Mt', 'Qt', r2);                                                              // 메인 롤후프 버팀
  both('Fb', 'Ms', r2);                                                              // 측면 충격 구조 대각 (주인공 하나는 아래에서 색을 바꿈)
  /* 가로 */
  ['Rb', 'Rt', 'Qb', 'Qt', 'Mb', 'Mh', 'Fb', 'Bb', 'Bt'].forEach(k => across(k, k, r2));
  across('Rb', 'Rt', r2); across('Bb', 'Bt', r2); across('Qb', 'Mb', r2); across('Mb', 'Fb', r2);   // 뒤 · 앞 · 바닥 대각
  /* 롤후프 (굽힌 관 하나) */
  const hoop = (ks, apex) => { const pts = ks.map(L).concat([apex], ks.slice().reverse().map(Rr)); return new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.2), 160, r1, 16); };
  const steel = M.steel;
  root.add(part(hoop(['Mb', 'Ms', 'Mu', 'Mh', 'Mt'], P(0.82, 1.10, 0)), steel, {edges:0}));
  root.add(part(hoop(['Fb', 'Fs', 'Fu', 'Ft'], P(1.50, 0.62, 0)), steel, {edges:0}));
  /* 주인공 대각 부재 하나 (왼쪽 측면 충격 구조 대각) · 주인공 노드 하나 (왼쪽 메인 롤후프 · 측면 충격 구조 만나는 점) */
  const heroA = L('Fb'), heroB = L('Ms');
  tubes.forEach(([a, b, r]) => { const hero = a.equals(heroA) && b.equals(heroB); root.add(part(cylBetween(a, b, hero ? r*1.25 : r, 16), hero ? M.hero : steel, {edges:0})); });
  const nodeK = 'Ms', node = part(new T.SphereGeometry(0.042, 24, 16), M.hero, {edges:0}); node.position.copy(L(nodeK)); root.add(node);
  /* 바퀴 (고스트): 위치만 */
  [[1.75, 0.62], [1.75, -0.62], [0.20, 0.62], [0.20, -0.62]].forEach(([x, z]) => { const g = ghost(new T.CylinderGeometry(0.26, 0.26, 0.2, 40, 1).rotateX(Math.PI/2), 20); g.children[1].material = kit.ghostLine.clone(); g.children[1].material.opacity = 0.22; g.position.set(x, 0.26, z); root.add(g); });
  return { root,
    callouts:[
      { name:'노드 (관 여러 개가 만나는 점)', at:v => v.copy(L(nodeK)), side:'T' },
      { name:'대각 부재 (칸을 삼각형으로)', at:v => v.copy(heroA).lerp(heroB, 0.45), side:'T' },
    ] };
}

/* --- 그림 2: 화면 좌표(u 오른쪽, v 위)로 만들고 3D 에 놓음 (옆 시점 = 차 앞이 화면 왼쪽 → u = −X) --- */
function CELL_BUILD(kit){
  const { T, scene, M, part, cylBetween } = kit;
  const root = new T.Group(); scene.add(root);
  const S = (u, v) => new T.Vector3(-u, v, 0);
  const r = 0.028, A = 1.0;   /* 관 반지름 · 칸 크기 */
  const cT = 0x2f7de1, cC = 0xe5482f;   /* 인장 파랑 · 압축 빨강 (범례 글자와 같은 색) */
  const mT = kit.toon(0x86aef0), mC = kit.toon(0xf0937f);
  function ground(u0){ const g = new T.Group(); const bar = part(new T.BoxGeometry(A + 0.5, 0.05, 0.12).translate(0, -0.025 - r, 0), M.dark, {edges:30}); g.add(bar);
    for(let k = 0; k < 12; k++){ const h = part(cylBetween(S(-0.7 + k*0.13, -r - 0.05), S(-0.78 + k*0.13, -r - 0.15), 0.008, 8), M.dark, {edges:0}); g.add(h); }
    g.position.copy(S(u0 + A/2, 0)); root.add(g); }
  /* 막대: 매 프레임 위치를 다시 잡는 원통 (길이 1 → scale.y) */
  const Y = new T.Vector3(0, 1, 0), q = new T.Quaternion();
  function bar(mat){ const g = part(new T.CylinderGeometry(r, r, 1, 20), mat, {edges:0}); root.add(g); g.userData.mat = mat; return g; }
  function place(g, a, b){ const d = b.clone().sub(a), Lz = d.length(); g.position.copy(a).add(b).multiplyScalar(0.5); g.quaternion.copy(q.setFromUnitVectors(Y, d.normalize())); g.scale.set(1, Lz, 1); }
  function pin(){ const s = part(new T.SphereGeometry(r*1.7, 20, 14), M.alloy, {edges:0}); root.add(s); return s; }
  /* 사각형 칸 (왼쪽): 아래 두 핀 고정, 위가 옆으로 밀려 평행사변형 */
  const u1 = 0, u2 = 1.7;
  ground(u1); ground(u2);
  const sq = { L:bar(M.steel), R:bar(M.steel), T:bar(M.steel), B:bar(M.steel), p:[pin(), pin(), pin(), pin()] };
  const tr = { L:bar(M.steel), R:bar(mC), T:bar(mC), B:bar(M.steel), D:bar(mT), p:[pin(), pin(), pin(), pin()] };
  /* 옆 하중 화살표 (범례형): 왼쪽 위 노드를 오른쪽으로 */
  const arrow = mk => { const g = new T.Group(); const red = new T.MeshBasicMaterial({color:0x3a4550}); const sh = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.3, 12), red); sh.rotation.z = Math.PI/2; sh.position.x = 0.15; g.add(sh);
    const c = new T.Mesh(new T.ConeGeometry(0.04, 0.09, 16), red); c.rotation.z = Math.PI/2; c.position.x = -0.015; g.add(c); root.add(g); return g; };
  const ar1 = arrow(), ar2 = arrow();
  /* u: 0 → 1 → 0 한 주기. 하중 크기 k = 0.5 − 0.5 cos(2πu) */
  function pose(u){ const k = 0.5 - 0.5*Math.cos(2*Math.PI*u);
    { const a = 0.32*k, b0 = S(u1, 0), b1 = S(u1 + A, 0), t0 = S(u1 + A*Math.sin(a), A*Math.cos(a)), t1 = S(u1 + A + A*Math.sin(a), A*Math.cos(a));   /* 기둥이 핀에서 돌아 위가 옆으로 */
      place(sq.B, b0, b1); place(sq.L, b0, t0); place(sq.R, b1, t1); place(sq.T, t0, t1); [b0, b1, t1, t0].forEach((p, i) => sq.p[i].position.copy(p));
      ar1.position.copy(t0); ar1.position.x += 0.1; ar1.scale.setScalar(0.4 + 0.6*k); }
    { const b0 = S(u2, 0), b1 = S(u2 + A, 0), t0 = S(u2, A), t1 = S(u2 + A, A);   /* 대각 부재가 있으면 모양 유지 (변형 무시할 만큼 작음) */
      place(tr.B, b0, b1); place(tr.L, b0, t0); place(tr.R, b1, t1); place(tr.T, t0, t1); place(tr.D, b0, t1); [b0, b1, t1, t0].forEach((p, i) => tr.p[i].position.copy(p));
      ar2.position.copy(t0); ar2.position.x += 0.1; ar2.scale.setScalar(0.4 + 0.6*k);
      /* 힘 크기에 따라 색 진하기: 인장(대각) √2 P, 압축(위 · 오른쪽) P, 왼쪽 0 */
      tr.D.children[0].material = k > 0.02 ? mT : M.steel; tr.T.children[0].material = tr.R.children[0].material = k > 0.02 ? mC : M.steel; } }
  pose(0);
  const mid = (g) => v => v.copy(g.position);
  return { root, pose,
    callouts:[
      { name:'사각형 칸: 각도만 바뀌며 찌그러짐', at:v => v.copy(sq.B.position), side:'B' },
      { name:'대각 부재를 넣은 칸: 모양 유지', at:v => v.copy(tr.B.position), side:'B' },
      { name:'대각 부재: 당겨짐 (인장)', at:v => v.copy(tr.D.position).lerp(tr.T.position, 0.15), side:'T' },
      { name:'위 · 오른쪽 부재: 눌림 (압축)', at:v => v.copy(tr.T.position).lerp(tr.R.position, 0.5), side:'T' },
    ],
    legends:[ { obj:ar1, text:'옆 하중', color:'#3a4550', anchor:[0.2, 0, 0], dx:-22, dy:-20 }, { obj:ar2, text:'같은 옆 하중', color:'#3a4550', anchor:[0.2, 0, 0], dx:-36, dy:-20 } ] };
}
