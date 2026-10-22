/* ============================================================
   3D 킹핀축·조향 캠버 장면 (three.js r128, 펼칠 때만 로드)
   좌표(three): X = 차량 왼쪽, Y = 위, Z = 차량 앞. 우측 앞바퀴, 바퀴 바깥 = −X
   ============================================================ */
const KP3D = () => `<div class="kp3d" data-kp3d="1"><div class="kp3d-ph">3D 장면을 불러오는 중입니다…</div></div>`;
let THREE_P = null;
function loadThree(){
  if(window.THREE) return Promise.resolve();
  if(!THREE_P) THREE_P = new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; sc.onload=res; sc.onerror=rej; document.head.appendChild(sc); });
  return THREE_P;
}
function initKP3D(el){
  if(el.dataset.ready) return; el.dataset.ready='1';
  el.innerHTML = `<div class="kp3d-wrap"><div class="kp3d-view"><canvas></canvas>
    <div class="kp3d-cam"><button data-cam="iso" aria-pressed="true">3D</button><button data-cam="front">차체 정면</button><button data-cam="side">차체 측면</button><button data-cam="top">위</button><span class="sep"></span><button data-cam="tfront">타이어 정면</button><button data-cam="tside">타이어 측면</button></div>
    <div class="kp3d-tip">휠 버튼(또는 왼쪽) 끌기 = 회전 · Ctrl + 끌기 = 이동 · Shift + 휠 버튼 끌기·휠 굴리기 = 확대 · 보라 실선·면 = 타이어 중심선·중심면, 점선 = 지면 수직선, 보라 점선 = 회전 반지름(조향축 → 바퀴 축 끝)</div></div>
    <div class="kp3d-ctl">
    <div class="kp3d-hud"><div><b style="color:var(--s-gam)">캠버 변화 Δγ</b></div><div class="kp3d-big">0.00°</div><div class="kp3d-sub"></div></div>
      <label>조향각 δ <span data-v="d">20°</span><button type="button" class="d0btn" data-d0="1" title="조향각을 0°로">0°</button><input type="range" min="-35" max="35" step="0.5" value="20" data-k="d" class="bipolar"><em class="kp3d-hint">+ 좌회전 (이 우측 바퀴가 바깥) · − 우회전 (안쪽)</em></label>
      <label><span class="k3s" style="color:var(--s-kpi)">캐스터 ν</span> <span data-v="nu">6°</span><input type="range" min="0" max="12" step="0.5" value="6" data-k="nu"></label>
      <label><span class="k3s" style="color:var(--s-kpi)">KPI σ</span> <span data-v="sg">8°</span><input type="range" min="0" max="16" step="0.5" value="8" data-k="sg"></label>
      <div class="kp3d-btns"><span>보기</span><button data-pre="cas">캐스터만</button><button data-pre="kpi">KPI만</button><button data-pre="both" aria-pressed="true">둘 다</button></div>
      <p class="kp3d-note">정면·측면·위는 원근 없는 정투영입니다. 끌면 3D 시점으로 바뀌고, 지면 아래로도 돌릴 수 있습니다. 빨강 막대 = 조향축(킹핀축, 정면 기울기 σ · 측면 기울기 ν), 보라 고리 = 바퀴 축 끝이 조향하며 그리는 궤적(원뿔의 밑면), 보라 점의 높이 변화(초록 막대)가 곧 캠버 변화입니다.</p>
    </div></div>`;
  const T = THREE, cv = el.querySelector('canvas'), view = el.querySelector('.kp3d-view');
  const ren = new T.WebGLRenderer({canvas:cv, antialias:true}); ren.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  const scene = new T.Scene(); scene.background = new T.Color(0xf6f5fa);
  const pcam = new T.PerspectiveCamera(32, 1, 0.01, 50); const ocam = new T.OrthographicCamera(-1,1,1,-1,0.01,50); let cam = pcam, mode='iso';
  scene.add(new T.HemisphereLight(0xffffff, 0xb9b3c9, 0.9)); const dl = new T.DirectionalLight(0xffffff, 0.6); dl.position.set(-1.5,2.5,1.8); scene.add(dl);
  const ground = new T.Mesh(new T.PlaneGeometry(8,8), new T.MeshLambertMaterial({color:0xe7e4ee,transparent:true,opacity:0.55,side:T.DoubleSide,depthWrite:false})); ground.rotation.x=-Math.PI/2; scene.add(ground);
  const grid = new T.GridHelper(8, 80, 0xc9c3d8, 0xd9d4e4); grid.position.y=0.001; scene.add(grid);
  const R=0.26, Wd=0.18, A0 = new T.Vector3(0.035, 0, 0);   // 정면: 축 지면점 안쪽 35 mm(개념), 측면: 축이 바퀴 중심을 지남(오프셋 0)
  const wheel = new T.Group(); wheel.matrixAutoUpdate=false;
  const tireG = new T.CylinderGeometry(R,R,Wd,56,1); tireG.rotateZ(Math.PI/2);
  const tireM=new T.Mesh(tireG, new T.MeshLambertMaterial({color:0x2c3036,transparent:true,opacity:0.85,depthWrite:false})); tireM.position.y=R; wheel.add(tireM);
  const rimG = new T.CylinderGeometry(0.135,0.135,Wd+0.006,40,1); rimG.rotateZ(Math.PI/2);
  const rimM=new T.Mesh(rimG, new T.MeshLambertMaterial({color:0xc4cad1,transparent:true,opacity:0.9,depthWrite:false})); rimM.position.y=R; wheel.add(rimM);
  const stripe = new T.Mesh(new T.BoxGeometry(Wd+0.01,0.012,0.05), new T.MeshLambertMaterial({color:0xffffff})); stripe.position.set(0,R+0.001,0); wheel.add(stripe);
  const upr = new T.Mesh(new T.BoxGeometry(0.035,0.24,0.07), new T.MeshLambertMaterial({color:0x9fb0bf})); upr.position.set(0.13,R,0); wheel.add(upr);
  const hub = new T.Mesh(new T.CylinderGeometry(0.025,0.025,0.26,16).rotateZ(Math.PI/2), new T.MeshLambertMaterial({color:0x6a7d8f})); hub.position.set(-0.01,R,0); wheel.add(hub);
  wheel.position.set(0,0,0); scene.add(wheel);
  const vref = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,0,0),new T.Vector3(0,0.66,0)]), new T.LineDashedMaterial({color:0x3a3548,dashSize:0.02,gapSize:0.014,depthTest:false})); vref.computeLineDistances(); vref.renderOrder=10; scene.add(vref);
  const tline = new T.Mesh(new T.BoxGeometry(0.01,0.74,0.01), new T.MeshBasicMaterial({color:0x6a4294,depthTest:false})); tline.position.set(0,R,0); tline.renderOrder=11; wheel.add(tline);
  /* 타이어 중심면(보라) 반투명 면 */
  const wPlane = new T.Mesh(new T.PlaneGeometry(0.62,0.80).rotateY(Math.PI/2), new T.MeshBasicMaterial({color:0x6a4294,transparent:true,opacity:0.18,side:T.DoubleSide,depthWrite:false})); wPlane.position.set(0,R+0.09,0); wPlane.renderOrder=5; wheel.add(wPlane);
  const arcLine = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({color:0x15803d,depthTest:false}));
  const radLine = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({color:0x6a4294,dashSize:0.014,gapSize:0.01,depthTest:false})); radLine.renderOrder=13; scene.add(radLine);
  const radFoot = new T.Mesh(new T.SphereGeometry(0.007,12,8), new T.MeshBasicMaterial({color:0x6a4294,depthTest:false})); radFoot.renderOrder=13; scene.add(radFoot); arcLine.renderOrder=12; scene.add(arcLine);
  const axisMesh = new T.Mesh(new T.CylinderGeometry(0.008,0.008,1,12), new T.MeshLambertMaterial({color:0xc2410c})); scene.add(axisMesh);
  const traceMat = new T.LineBasicMaterial({color:0x6a4294}); let trace = new T.Line(new T.BufferGeometry(), traceMat); scene.add(trace);
  const endDot = new T.Mesh(new T.SphereGeometry(0.014,16,12), new T.MeshLambertMaterial({color:0x6a4294})); scene.add(endDot);
  const hBar = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({color:0x15803d,depthTest:false})); hBar.renderOrder=13; scene.add(hBar);
  const st = {d:20, nu:6, sg:8, th:-0.55, ph:0.98, r:1.7};
  const pan = new T.Vector3();
  /* 선·축·점은 반투명 타이어 위에 항상 보이도록 투명 패스 맨 뒤에 그림 */
  [[vref,20],[tline,21],[axisMesh,22],[arcLine,23],[hBar,23],[radLine,24],[radFoot,24],[endDot,25],[trace,19]].forEach(([o,r])=>{ o.material.transparent=true; o.material.depthTest=false; o.renderOrder=r; });
  const E0 = new T.Vector3(-0.36, R, 0), target = new T.Vector3(-0.05, 0.3, 0);
  function kvec(){ return new T.Vector3(Math.tan(st.sg*Math.PI/180), 1, -Math.tan(st.nu*Math.PI/180)).normalize(); }
  function xf(k, d){ const m = new T.Matrix4().makeTranslation(A0.x,A0.y,A0.z); m.multiply(new T.Matrix4().makeRotationAxis(k, d)); m.multiply(new T.Matrix4().makeTranslation(-A0.x,-A0.y,-A0.z)); return m; }
  function update(){
    A0.z = R*Math.tan(st.nu*Math.PI/180);
    const k = kvec(), d = st.d*Math.PI/180, M = xf(k,d);
    wheel.matrix.copy(M); wheel.matrixWorldNeedsUpdate = true;
    axisMesh.position.copy(A0.clone().add(k.clone().multiplyScalar(0.38))); axisMesh.scale.set(1,0.9,1);
    axisMesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), k);
    const pts=[]; for(let a=-45;a<=45;a+=1.5){ pts.push(E0.clone().applyMatrix4(xf(k,a*Math.PI/180))); }
    trace.geometry.dispose(); trace.geometry = new T.BufferGeometry().setFromPoints(pts);
    const E = E0.clone().applyMatrix4(M); endDot.position.copy(E);
    { const F = A0.clone().add(k.clone().multiplyScalar(E.clone().sub(A0).dot(k))); radFoot.position.copy(F); radLine.geometry.dispose(); radLine.geometry = new T.BufferGeometry().setFromPoints([F, E]); radLine.computeLineDistances(); }
    hBar.geometry.dispose(); hBar.geometry = new T.BufferGeometry().setFromPoints([new T.Vector3(E.x,E0.y,E.z), E]);
    const Wc = new T.Vector3(0,R,0).applyMatrix4(M); st.wc = Wc;
    const Rm = new T.Matrix4().makeRotationAxis(k,d);
    st.fwd = new T.Vector3(0,0,1).applyMatrix4(Rm); st.out = new T.Vector3(-1,0,0).applyMatrix4(Rm);
    vref.position.set(Wc.x, 0, Wc.z);
    { /* 캠버 원호: 타이어 정면(타이어 진행 방향에 수직인 면)에서, 지면 수직선 → 타이어 중심면 선 */
      const Y = new T.Vector3(0,1,0), sa = new T.Vector3(-1,0,0).applyMatrix4(Rm), ap=[];
      const hd = new T.Vector3().crossVectors(sa, Y); if(hd.lengthSq()>1e-9){ hd.normalize();
        const v = new T.Vector3().crossVectors(sa, hd).normalize(); if(v.y<0) v.negate();
        const ang = Y.angleTo(v); if(ang>1e-4){ const ax = new T.Vector3().crossVectors(Y,v).normalize(); for(let i=0;i<=24;i++){ ap.push(Y.clone().applyAxisAngle(ax, ang*i/24).multiplyScalar(0.33).add(Wc)); } }
        }
      arcLine.geometry.dispose(); arcLine.geometry = new T.BufferGeometry().setFromPoints(ap); }
    const a = new T.Vector3(-1,0,0).applyMatrix4(new T.Matrix4().makeRotationAxis(k,d));
    const g = -Math.asin(a.y)*180/Math.PI, ds = st.d, ap = -st.nu*Math.sin(ds*Math.PI/180) + st.sg*(1-Math.cos(ds*Math.PI/180));
    el.querySelector('.kp3d-big').textContent = (g>=0?'+':'')+g.toFixed(2)+'°';
    el.querySelector('.kp3d-sub').innerHTML = `근사식 −ν sinδ + σ(1−cosδ) = ${(ap>=0?'+':'')+ap.toFixed(2)}° <span class="muted">(차이 ${(g-ap).toFixed(2)}°)</span><br>${st.d>0?'좌회전 · 이 바퀴는 바깥 바퀴':st.d<0?'우회전 · 이 바퀴는 안쪽 바퀴':'직진'} · ${g<-0.005?'위가 안쪽 → 음(−) 캠버':g>0.005?'위가 바깥 → 양(+) 캠버':'변화 없음'}`;
    { const sl=el.querySelector('[data-k="d"]'), pc=(st.d+35)/70*100, a=Math.min(50,pc), b=Math.max(50,pc), tr='#dcd9e5', ac='#6A4294';
      sl.style.background = `linear-gradient(to right, transparent calc(50% - 1px), #4a4458 calc(50% - 1px), #4a4458 calc(50% + 1px), transparent calc(50% + 1px)), linear-gradient(to right, ${tr} 0%, ${tr} ${a}%, ${ac} ${a}%, ${ac} ${b}%, ${tr} ${b}%, ${tr} 100%)`; }
    ['d','nu','sg'].forEach(kk=>{ el.querySelector(`[data-v="${kk}"]`).textContent = st[kk]+'°'; el.querySelector(`[data-k="${kk}"]`).value = st[kk]; });
    render();
  }
  function placeCam(){
    if(mode!=='iso'){ const D=6; cam=ocam; const asp=(ren.domElement.width/ren.domElement.height)||1.6, hh=0.5; ocam.left=-hh*asp; ocam.right=hh*asp; ocam.top=hh; ocam.bottom=-hh;
      let tg=new T.Vector3(0,0.3,0);
      if(mode==='front'){ ocam.up.set(0,1,0); ocam.position.set(0,0.3,D); }
      else if(mode==='side'){ ocam.up.set(0,1,0); ocam.position.set(-D,0.3,0); }
      else if(mode==='tfront' || mode==='tside'){ const v = (mode==='tfront' ? st.fwd : st.out).clone(); v.y=0; v.normalize(); const c = st.wc || new T.Vector3(0,R,0); tg = new T.Vector3(c.x,0.3,c.z); ocam.up.set(0,1,0); ocam.position.copy(tg.clone().add(v.multiplyScalar(D))); }
      else { ocam.up.set(0,0,1); ocam.position.set(0,D,0); }
      tg.add(pan); ocam.position.add(pan); ocam.lookAt(tg); ocam.updateProjectionMatrix(); return; }
    cam=pcam; const tgt=target.clone().add(pan); cam.position.set(tgt.x + st.r*Math.sin(st.ph)*Math.sin(st.th), tgt.y + st.r*Math.cos(st.ph), tgt.z + st.r*Math.sin(st.ph)*Math.cos(st.th)); cam.lookAt(tgt); }
  function size(){ const w = view.clientWidth, ctl = el.querySelector('.kp3d-ctl'), h = Math.max(360, ctl ? ctl.getBoundingClientRect().height : 420); ren.setSize(w,h,false); cv.style.width=w+'px'; cv.style.height=h+'px'; pcam.aspect=w/h; pcam.updateProjectionMatrix(); }
  function render(){ placeCam(); ren.render(scene,cam); }
  ocam.zoom=1;
  el.addEventListener('input', e=>{ const k=e.target.dataset.k; if(k){ st[k]=+e.target.value; el.querySelectorAll('[data-pre]').forEach(b=>b.setAttribute('aria-pressed','false')); update(); } });
  el.addEventListener('click', e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.d0){ e.preventDefault(); st.d=0; update(); return; }
    if(b.dataset.pre){ const p={cas:[6,0],kpi:[0,8],both:[6,8]}[b.dataset.pre]; st.nu=p[0]; st.sg=p[1]; el.querySelectorAll('[data-pre]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); update(); }
    if(b.dataset.cam){ pan.set(0,0,0); mode=b.dataset.cam; const c={iso:[-0.55,0.98,1.7],front:[0,Math.PI/2,1.9],side:[-Math.PI/2,Math.PI/2,1.9],top:[0,0.02,1.9],tfront:[0,Math.PI/2,1.9],tside:[-Math.PI/2,Math.PI/2,1.9]}[mode]; [st.th,st.ph,st.r]=c; el.querySelectorAll('[data-cam]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); render(); }
  });
  let drag=null;
  function doPan(e){ const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.x=e.clientX; drag.y=e.clientY; cam.updateMatrixWorld(); const rv=new T.Vector3().setFromMatrixColumn(cam.matrixWorld,0), uv=new T.Vector3().setFromMatrixColumn(cam.matrixWorld,1); const h=cv.clientHeight||400; const s=(cam===ocam)?(ocam.top-ocam.bottom)/ocam.zoom/h:2*st.r*Math.tan(pcam.fov*Math.PI/360)/h; pan.add(rv.multiplyScalar(-dx*s)).add(uv.multiplyScalar(dy*s)); render(); }
  /* SolidWorks 방식: 휠 버튼 끌기 = 회전, Ctrl + 휠 버튼 끌기 = 화면 이동, Shift + 휠 버튼 끌기 = 확대·축소, 휠 굴리기 = 확대·축소 (왼쪽 끌기 = 회전, Ctrl + 왼쪽 끌기 = 이동도 유지) */
  cv.addEventListener('mousedown', e=>{ if(e.button===1) e.preventDefault(); });
  cv.addEventListener('pointerdown', e=>{ if(e.button!==0 && e.button!==1) return; const op = e.ctrlKey ? 'pan' : (e.button===1 && e.shiftKey) ? 'zoom' : 'rot'; drag={x:e.clientX,y:e.clientY,pan:op==='pan',zoom:op==='zoom'}; e.preventDefault(); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e=>{ if(!drag) return; if(drag.pan){ doPan(e); return; } if(drag.zoom){ const f=Math.exp((e.clientY-drag.y)*0.006); drag.y=e.clientY; drag.x=e.clientX; st.r=Math.min(4,Math.max(0.9,st.r*f)); ocam.zoom=Math.min(4,Math.max(0.4,ocam.zoom/f)); render(); return; } if(mode!=='iso'){ mode='iso'; } st.th -= (e.clientX-drag.x)*0.008; st.ph = Math.min(Math.PI-0.02, Math.max(0.02, st.ph - (e.clientY-drag.y)*0.008)); drag={x:e.clientX,y:e.clientY}; el.querySelectorAll('[data-cam]').forEach(x=>x.setAttribute('aria-pressed','false')); render(); });
  cv.addEventListener('pointerup', ()=>{ drag=null; }); cv.addEventListener('pointercancel', ()=>{ drag=null; });
  cv.addEventListener('wheel', e=>{ e.preventDefault(); const f=Math.exp(e.deltaY*0.001); st.r = Math.min(4, Math.max(0.9, st.r*f)); ocam.zoom = Math.min(4, Math.max(0.4, ocam.zoom/f)); render(); }, {passive:false});
  window.addEventListener('resize', ()=>{ size(); render(); });
  try{ new ResizeObserver(()=>{ size(); render(); }).observe(el.querySelector('.kp3d-ctl')); }catch(e){}
  size(); update();
}
function tryInit3D(root){
  root.querySelectorAll('.kp3d[data-kp3d]:not([data-ready])').forEach(el=>{
    if(!el.offsetParent) return;
    loadThree().then(()=>initKP3D(el)).catch(()=>{ el.innerHTML='<div class="kp3d-ph">3D 라이브러리를 불러오지 못했습니다. 네트워크를 확인해 주십시오.</div>'; });
  });
}
document.addEventListener('toggle', e=>{ const d=e.target; if(d.tagName==='DETAILS' && d.open) requestAnimationFrame(()=>tryInit3D(d)); }, true);

/* ---------- 유도 그림: 바퀴 축 끝 높이 ---------- */
FIG.camderiv = () => { const m = markers(); const r=Math.PI/180;
  const P1 = plot({x0:70,y0:56,w:240,h:170,xr:[0,40],yr:[-0.12,0.12],xt:[0,20,40],yt:[-0.1,0,0.1],xl:'조향각 δ [°]',yl:'축 끝 높이 / 축 길이 (↑ = 음 캠버)'});
  const P2 = plot({x0:420,y0:56,w:240,h:170,xr:[0,40],yr:[-0.12,0.12],xt:[0,20,40],yt:[-0.1,0,0.1],xl:'조향각 δ [°]',yl:'축 끝 높이 / 축 길이 (↓ = 양 캠버)'});
  const c1 = rng(0,40,1).map(d=>[P1.X(d),P1.Y(Math.sin(4.9*r)*Math.sin(d*r))]);
  const c2 = rng(0,40,1).map(d=>[P2.X(d),P2.Y(-Math.sin(9.5*r)*Math.cos(9.5*r)*(1-Math.cos(d*r)))]);
  return `<svg viewBox="0 0 700 300" aria-label="캠버 변화 유도">${m.defs}
  <text x="70" y="24" class="tb">캐스터만 (ν = 4.9°)</text><text x="420" y="24" class="tb">KPI만 (σ = 9.5°)</text>
  ${P1.s}${P2.s}${poly(c1,'ln ln-in')}${poly(c2,'ln ln-ac')}
  <circle cx="${P1.X(0)}" cy="${P1.Y(0)}" r="5" class="pi"/><circle cx="${P2.X(0)}" cy="${P2.Y(0)}" r="5" class="pi"/>
  <text x="${P1.X(2)}" y="${P1.Y(-0.04)}" class="tm">출발점 = 원의 옆(중간 높이)</text>
  <text x="${P1.X(2)}" y="${P1.Y(-0.065)}" class="tm">→ 처음부터 기울기 있음 ∝ sinδ</text>
  <text x="${P2.X(2)}" y="${P2.Y(0.07)}" class="tm">출발점 = 원의 꼭대기(극점)</text>
  <text x="${P2.X(2)}" y="${P2.Y(0.045)}" class="tm">→ 처음엔 평평 ∝ (1 − cosδ)</text>
  ${M(String.raw`\Delta\gamma \approx -\nu\sin\delta`,190,290,'middle','ti',14)}${M(String.raw`\Delta\gamma \approx +\sigma(1-\cos\delta)`,540,290,'middle','ta',14)}
</svg>`; };
