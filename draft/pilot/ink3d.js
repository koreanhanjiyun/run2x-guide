/* ============================================================
   잉크 선 3D 그림 틀 (2026-11-26 시범)
   - 3단 명암 툰 재질 + 잉크 모서리선 + 화면 기준 두께가 일정한 외곽선 + 점선 숨은선(고스트)
   - 라벨: 그림 양옆 두 줄에 글자, 꺾인 연결선(진한 주황 + 흰 테두리)으로 부품 위 점에 이음
   - three.js r147 전역(THREE) 기준. 사이트 공통 시점 · 조작(V3D)과 같이 씀
   일부 코드는 아래 MIT 저작물을 옮겨 r147 · 사이트 양식에 맞게 고침
     Inkworks kit.js        — Copyright (c) 2026 exploraX (github.com/Moh4696/inkworks-skill), MIT License
     open-3d-skills Labels  — Copyright (c) 2026 exploraX (github.com/Moh4696/open-3d-skills), MIT License
   ============================================================ */
const INK3D = (() => {
  const INK_HEX = 0x161b26;

  function makeKit(canvas){
    const T = THREE, INK = new T.Color(INK_HEX);
    const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    /* r147 은 예전 조명 단위 → Inkworks(r160대) 값 ÷ π */
    scene.add(new T.HemisphereLight(0xffffff, 0x8a96aa, 0.62)); const sun = new T.DirectionalLight(0xffffff, 0.78); sun.position.set(4, 8, 6); scene.add(sun);
    /* 3단 명암: 손으로 칠한 도면처럼 */
    const ramp = new T.DataTexture(new Uint8Array([150,150,150,255, 205,205,205,255, 255,255,255,255]), 3, 1);
    ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true;
    const toon = (hex, x) => new T.MeshToonMaterial(Object.assign({color:hex, gradientMap:ramp, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1}, x || {}));
    const M = { steel:toon(0xc3ccd8), alloy:toon(0xeef1f5), dark:toon(0xa4afbe), rubber:toon(0x9aa2b0), hero:toon(0xb99be6), hero2:toon(0xf0c98e) };
    const lineMat = new T.LineBasicMaterial({color:INK, transparent:true, opacity:0.85});
    const ghostLine = new T.LineDashedMaterial({color:INK, transparent:true, opacity:0.4, dashSize:0.012, gapSize:0.009});
    const ghostFill = new T.MeshBasicMaterial({color:0x6b8ab0, transparent:true, opacity:0.035, depthWrite:false, side:T.DoubleSide});
    /* 외곽선: 뒤집은 껍데기를 화면에서 일정한 픽셀만큼 법선 방향으로 밀어냄. uPx = 1 px 의 세계 길이(깊이 1 기준), 정투영이면 uOrtho = 1 */
    const outlineMat = new T.ShaderMaterial({
      uniforms:{ uColor:{value:INK.clone()}, uPx:{value:0.002}, uOrtho:{value:0} },
      vertexShader:`uniform float uPx; uniform float uOrtho;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal);
          mv.xyz += n * uPx * mix(max(-mv.z, 0.1), 1.0, uOrtho); gl_Position = projectionMatrix * mv; }`,
      fragmentShader:`uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
      side:T.BackSide });
    /* 부품: 툰 면 + 잉크 모서리 + 외곽선 */
    function part(geo, mat, o){ o = o || {}; const g = new T.Group(); g.add(new T.Mesh(geo, mat));
      if(o.edges !== 0) g.add(new T.LineSegments(new T.EdgesGeometry(geo, o.edges || 30), lineMat));
      if(o.outline !== false) g.add(new T.Mesh(geo, outlineMat)); return g; }
    /* 숨은선 고스트: 거의 안 보이는 면 + 점선 모서리 (위치만 알려 주는 주변 부품) */
    function ghost(geo, th){ const g = new T.Group(); g.add(new T.Mesh(geo, ghostFill));
      const l = new T.LineSegments(new T.EdgesGeometry(geo, th || 30), ghostLine); l.computeLineDistances(); g.add(l); return g; }
    /* 두 점 사이 원통 (축 = 두 점 방향) */
    const Y = new T.Vector3(0, 1, 0);
    function cylBetween(a, b, r, seg){ const d = b.clone().sub(a), L = d.length(), g = new T.CylinderGeometry(r, r, L, seg || 24);
      g.applyQuaternion(new T.Quaternion().setFromUnitVectors(Y, d.normalize())); g.translate((a.x+b.x)/2, (a.y+b.y)/2, (a.z+b.z)/2); return g; }
    /* 축이 X 인 원통 (피벗 · 로드엔드 눈) */
    const xCyl = (r, len, seg) => new T.CylinderGeometry(r, r, len, seg || 28).rotateZ(Math.PI/2);
    /* 단위 높이(+Y) 코일 스프링 — scale.y 로 눌림 · 늘어남 */
    function springGeo(r, turns, wire){ const pts = [], N = turns*24; for(let k = 0; k <= N; k++){ const a = k/N*turns*Math.PI*2; pts.push(new T.Vector3(Math.cos(a)*r, k/N, Math.sin(a)*r)); }
      return new T.TubeGeometry(new T.CatmullRomCurve3(pts), N*2, wire, 6); }
    /* 판 모양(앞에서 본 평면 z-y 의 다각형/곡선) → X 방향 두께 */
    function plate(shape, t){ const g = new T.ExtrudeGeometry(shape, {depth:t, bevelEnabled:false, curveSegments:20}); g.translate(0, 0, -t/2); g.rotateY(-Math.PI/2); return g; }   /* 모양 x→Z, y→Y, 두께→X */
    /* 카메라에 맞춰 외곽선 굵기(px) */
    function outlinePx(cam, px){ const h = renderer.domElement.clientHeight || 400;
      if(cam.isOrthographicCamera){ outlineMat.uniforms.uOrtho.value = 1; outlineMat.uniforms.uPx.value = px*(cam.top - cam.bottom)/h; }
      else { outlineMat.uniforms.uOrtho.value = 0; outlineMat.uniforms.uPx.value = px*2*Math.tan(cam.fov*Math.PI/360)/h; } }
    return { T, renderer, scene, INK, toon, M, lineMat, ghostLine, ghostFill, outlineMat, part, ghost, cylBetween, xCyl, springGeo, plate, outlinePx };
  }

  /* 라벨: 기준점의 화면 위치에 따라 왼쪽 · 오른쪽 줄로 나누고, 줄 안에서는 위아래 순서를 지키며 겹침만 밀어냄 → 선이 엇갈리지 않음.
     범례(legend: true)는 연결선 없이 표시 바로 옆에 색 글자 */
  class Labels {
    constructor(box, canvas, o){ o = o || {}; this.box = box; this.canvas = canvas; this.margin = o.margin || 18; this.gap = o.gap || 8; this.items = [];
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); this.svg.setAttribute('class', 'ink-lead'); box.appendChild(this.svg); }
    add(obj, text, o){ o = o || {}; const el = document.createElement('div'); el.className = 'ink-lab' + (o.legend ? ' lg' : ''); el.textContent = text; if(o.color) el.style.color = o.color; this.box.appendChild(el);
      const it = { obj, el, anchor:new THREE.Vector3(...(o.anchor || [0, 0, 0])), at:o.at || null, legend:!!o.legend, dx:o.dx || 0, dy:o.dy || 0 };
      if(!it.legend){ const NS = 'http://www.w3.org/2000/svg'; it.halo = document.createElementNS(NS, 'path'); it.halo.setAttribute('class', 'h'); it.line = document.createElementNS(NS, 'path'); it.dot = document.createElementNS(NS, 'circle'); it.dot.setAttribute('r', '3');
        this.svg.append(it.halo, it.line, it.dot); }
      this.items.push(it); return it; }
    update(cam){ const W = this.canvas.clientWidth, H = this.canvas.clientHeight, mid = W/2, v = new THREE.Vector3(), shown = [];
      for(const it of this.items){ if(it.at) it.at(v); else { v.copy(it.anchor); it.obj.localToWorld(v); } v.project(cam);
        const vis = it.obj.visible !== false && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        it.el.style.display = vis ? '' : 'none'; if(it.line){ [it.halo, it.line, it.dot].forEach(e => e.style.display = vis ? '' : 'none'); } if(!vis) continue;
        it.sx = (v.x*0.5 + 0.5)*W; it.sy = (-v.y*0.5 + 0.5)*H; it.h = it.el.offsetHeight || 18; it.w = it.el.offsetWidth || 60;
        if(it.legend){ it.el.style.transform = `translate(${Math.round(it.sx + it.dx)}px, ${Math.round(it.sy + it.dy - it.h/2)}px)`; continue; }
        shown.push(it); }
      for(const left of [true, false]){ const col = shown.filter(it => (it.sx < mid) === left).sort((a, b) => a.sy - b.sy); let y = this.margin;
        for(const it of col){ it.ly = Math.max(it.sy - it.h/2, y); y = it.ly + it.h + this.gap; }
        const over = y - this.gap - (H - this.margin); if(over > 0) col.forEach(it => it.ly -= over);
        for(const it of col){ const x = left ? this.margin : W - this.margin - it.w; it.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(it.ly)}px)`; it.el.style.textAlign = left ? 'left' : 'right';
          const ex = left ? x + it.w + 6 : x - 6, ey = it.ly + it.h/2, bend = left ? ex + 16 : ex - 16, d = `M${ex.toFixed(1)},${ey.toFixed(1)} L${bend.toFixed(1)},${ey.toFixed(1)} L${it.sx.toFixed(1)},${it.sy.toFixed(1)}`;
          it.halo.setAttribute('d', d); it.line.setAttribute('d', d); it.dot.setAttribute('cx', it.sx.toFixed(1)); it.dot.setAttribute('cy', it.sy.toFixed(1)); } } }
  }
  return { makeKit, Labels };
})();
