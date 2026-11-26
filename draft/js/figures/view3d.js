/* ============================================================
   공통 3D: three.js 불러오기 · SolidWorks 방식 조작 · 시점
   - three.js 는 저장소 vendor/three (r147) 에서, 3D 화면을 처음 열 때 불러온다 (외부 CDN 쓰지 않음)
   - 조작(설계 탭 킹핀 3D · 도구 작업창 공통)
       휠 버튼 끌기 = 회전, Ctrl + 휠 버튼 끌기 = 이동, Shift + 휠 버튼 끌기 = 확대·축소, 휠 굴리기 = 확대·축소
       왼쪽 끌기 = 회전, Ctrl + 왼쪽 끌기 = 이동
   ============================================================ */
const V3D = (() => {
  let P3 = null, PG = null;
  const tag = () => { const s = [...document.scripts].find(x => /js\/figures\/view3d\.js/.test(x.src)); return s && s.src.includes('?') ? s.src.slice(s.src.indexOf('?')) : ''; };
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src + tag(); s.onload = ok; s.onerror = () => no(new Error(src)); document.head.appendChild(s); });
  function three(){ if(window.THREE) return Promise.resolve();
    return P3 || (P3 = load('vendor/three/three.min.js').catch(e => { P3 = null; throw e; })); }
  function gltf(){ return three().then(() => THREE.GLTFLoader ? 0 : (PG || (PG = load('vendor/three/GLTFLoader.js').catch(e => { PG = null; throw e; })))); }
  const HELP = '휠 버튼(또는 왼쪽) 끌기 = 회전 · Ctrl + 끌기 = 이동 · Shift + 휠 버튼 끌기 · 휠 굴리기 = 확대';
  /* 조작: h = {rot(dx, dy), pan(dx, dy), zoom(f)} — f > 1 이면 멀어짐 */
  function controls(cv, h){ let drag = null;
    const md = e => { if(e.button===1) e.preventDefault(); };
    const pd = e => { if(e.button!==0 && e.button!==1) return; const op = e.ctrlKey ? 'pan' : (e.button===1 && e.shiftKey) ? 'zoom' : 'rot';
      drag = {x:e.clientX, y:e.clientY, op}; e.preventDefault(); try{ cv.setPointerCapture(e.pointerId); }catch(err){} };
    const pm = e => { if(!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if(drag.op==='pan') h.pan(dx, dy); else if(drag.op==='zoom') h.zoom(Math.exp(dy*0.006)); else h.rot(dx, dy); };
    const pu = () => { drag = null; };
    const wh = e => { e.preventDefault(); h.zoom(Math.exp(e.deltaY*0.001)); };
    cv.addEventListener('mousedown', md); cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm);
    cv.addEventListener('pointerup', pu); cv.addEventListener('pointercancel', pu); cv.addEventListener('wheel', wh, {passive:false});
    return () => { cv.removeEventListener('mousedown', md); cv.removeEventListener('pointerdown', pd); cv.removeEventListener('pointermove', pm);
      cv.removeEventListener('pointerup', pu); cv.removeEventListener('pointercancel', pu); cv.removeEventListener('wheel', wh); }; }
  /* 차량 좌표(X 앞 · Y 위 · Z 왼쪽, m) 시점: 3D(원근) · 앞 · 옆 · 위(정투영). 옆과 위는 2D 그림처럼 차 앞이 왼쪽 */
  function orbit(T, ren, o){ o = o || {};
    const pc = new T.PerspectiveCamera(32, 1, 0.05, 200), oc = new T.OrthographicCamera(-1, 1, 1, -1, 0.05, 200);
    const st = {th:o.th != null ? o.th : 0.75, ph:o.ph != null ? o.ph : 1.05, r:o.r || 6, half:o.half || 1.6, zoom:1, mode:'iso'};
    const tgt = (o.target || new T.Vector3()).clone(), pan = new T.Vector3();
    const VIEWS = {front:[new T.Vector3(1, 0, 0), new T.Vector3(0, 1, 0)], side:[new T.Vector3(0, 0, -1), new T.Vector3(0, 1, 0)], top:[new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1)]};
    function cam(){ const c = ren.domElement, asp = (c.width/c.height) || 1.6, t = tgt.clone().add(pan);
      if(st.mode==='iso'){ pc.aspect = asp; pc.updateProjectionMatrix();
        pc.position.set(t.x + st.r*Math.sin(st.ph)*Math.cos(st.th), t.y + st.r*Math.cos(st.ph), t.z + st.r*Math.sin(st.ph)*Math.sin(st.th)); pc.up.set(0, 1, 0); pc.lookAt(t); return pc; }
      const [d, up] = VIEWS[st.mode], hh = st.half*st.zoom; oc.left = -hh*asp; oc.right = hh*asp; oc.top = hh; oc.bottom = -hh; oc.updateProjectionMatrix();
      oc.up.copy(up); oc.position.copy(t.clone().add(d.clone().multiplyScalar(50))); oc.lookAt(t); return oc; }
    return { st, cam, set(v){ st.mode = v; pan.set(0, 0, 0); if(v==='iso'){ st.th = o.th != null ? o.th : 0.75; st.ph = o.ph != null ? o.ph : 1.05; st.r = o.r || 6; } else st.zoom = 1; },
      target(v){ tgt.copy(v); },
      rot(dx, dy){ if(st.mode!=='iso'){ /* 정투영에서 끌면 3D 시점으로: 지금 보는 방향에서 시작 */
          const d = VIEWS[st.mode][0]; st.th = Math.atan2(d.z, d.x); st.ph = Math.min(Math.PI-0.02, Math.max(0.02, Math.acos(Math.max(-1, Math.min(1, d.y))))); st.mode = 'iso'; }
        st.th += dx*0.008; st.ph = Math.min(Math.PI-0.02, Math.max(0.02, st.ph - dy*0.008)); },
      pan(dx, dy){ const c = cam(); c.updateMatrixWorld(); const rv = new T.Vector3().setFromMatrixColumn(c.matrixWorld, 0), uv = new T.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
        const h = ren.domElement.clientHeight || 400, s = st.mode==='iso' ? 2*st.r*Math.tan(pc.fov*Math.PI/360)/h : 2*st.half*st.zoom/h;
        pan.add(rv.multiplyScalar(-dx*s)).add(uv.multiplyScalar(dy*s)); },
      zoom(f){ if(st.mode==='iso') st.r = Math.min(40, Math.max(0.6, st.r*f)); else st.zoom = Math.min(8, Math.max(0.1, st.zoom*f)); } }; }
  /* 시점 단추 묶음 HTML (data-v3v) */
  const viewBtns = cur => `<div class="v3d-views" role="group" aria-label="시점">${[['iso','3D'],['front','앞'],['side','옆'],['top','위']].map(([k, t]) => `<button type="button" data-v3v="${k}" aria-pressed="${cur===k}">${t}</button>`).join('')}</div>`;
  /* 원 + 십자, 2·4사분면 칠한 기호 (2D 그림의 CG · CoP 기호와 같은 모양) → 항상 화면을 보는 스프라이트 */
  function marker(T, color, size){ const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = 54, x = 64, y = 64;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r + 6, 0, 2*Math.PI); g.fill();
    g.fillStyle = color; g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, Math.PI, 1.5*Math.PI); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, 0, 0.5*Math.PI); g.closePath(); g.fill();
    g.strokeStyle = color; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r, 0, 2*Math.PI); g.stroke();
    g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
    const tx = new T.CanvasTexture(c), sp = new T.Sprite(new T.SpriteMaterial({map:tx, depthTest:false, transparent:true}));
    sp.scale.set(size, size, 1); sp.renderOrder = 30; return sp; }
  /* 글자 스프라이트 */
  function label(T, text, color, h){ const c = document.createElement('canvas'), g = c.getContext('2d'), fs = 44;
    g.font = `600 ${fs}px "IBM Plex Sans KR","Malgun Gothic",sans-serif`; const w = Math.ceil(g.measureText(text).width) + 24; c.width = w; c.height = fs + 22;
    g.font = `600 ${fs}px "IBM Plex Sans KR","Malgun Gothic",sans-serif`; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 10; g.strokeText(text, 12, c.height/2); g.fillStyle = color; g.fillText(text, 12, c.height/2);
    const sp = new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c), depthTest:false, transparent:true})); sp.scale.set(h*w/c.height, h, 1); sp.renderOrder = 31; return sp; }
  const asset = p => p + tag();   /* 같은 버전 꼬리표로 파일 주소 (캐시 무효화) */
  return { three, gltf, controls, orbit, viewBtns, marker, label, asset, HELP };
})();
