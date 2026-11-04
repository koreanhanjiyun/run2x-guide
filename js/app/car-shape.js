/* ============================================================
   차 형상 배경 (옆면 · 윗면): 팀이 올린 그림을 차 윤곽 대신 그림 바탕으로 씀
   - 파일: 이미지(.png .jpg .jpeg .webp) 또는 CAD 도면(.dxf, 측면도 · 윗면도 한 장)
   - 맞춤: 그림 위에서 ① 앞 바퀴 중심 → ② 뒤 바퀴 중심 (윗면은 앞 차축 가운데 → 뒤 차축 가운데) 두 점만 찍음
     → 두 점 거리 = 휠베이스로 크기, 두 점을 잇는 선이 수평이 되게 회전, 앞이 오른쪽이면 좌우 뒤집기. 지면 = 바퀴 중심에서 r_eff 아래
   - 저장: teams/<팀>/shape/<side|top> = {s:{시즌:{kind:'img'|'dxf', ...}}} (팀원 누구나 이번 시즌, 로그인 전은 이 브라우저)
     img: data(줄인 이미지 data: 주소), w, h, p1, p2 (그림 픽셀, 아래로 +)
     dxf: d(선 그림 경로, 도면 단위 · y 를 뒤집어 아래로 +), p1, p2
   - 계산에는 쓰지 않음. 질량 계산기 · 드라이버 모델 · 대시보드 그림의 바탕만 바뀜
   ============================================================ */
const SHAPEKEY = 'run2x.shape.v1', SHP_MAX = 850000;   /* Firestore 문서 1 MiB 한도 안 */
let SHAPES = {};
try{ SHAPES = JSON.parse(localStorage.getItem(SHAPEKEY) || '{}') || {}; }catch(e){ SHAPES = {}; }
const shSeason = () => typeof dvSeason==='function' ? dvSeason() : String(new Date().getFullYear());
const shGet = view => { const d = SHAPES[view], v = d && d.s && d.s[shSeason()]; return v && v.p1 && v.p2 ? v : null; };
const shCanEdit = () => !SH.on || SH.canAdmin || !pastLock();
{ const _osr = onSharedReady; onSharedReady = function(db){ _osr(db);
    db.collection('shape').onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); SHAPES = r; shRepaint(); }, () => {}); }; }
/* 바탕이 바뀌면 그림만 다시 그림 */
function shRepaint(){ try{ if(typeof dashPaint==='function' && $('#dfigs')) dashPaint(['figs', 'part']); }catch(e){}
  try{ if(typeof WB!=='undefined' && WB.id==='1'){ wbPaint(['main']); const f = $('#m1dfig'); if(f && !M1.drag && !M1.edit) f.innerHTML = m1DrvFig(WB.R); } }catch(e){} }
function shStore(view, val){ const se = shSeason(), cur = SHAPES[view] || {s:{}}, s2 = {...(cur.s || {})};
  if(val==null) delete s2[se]; else s2[se] = val; SHAPES[view] = {s:s2}; shRepaint();
  if(!SH.on){ try{ localStorage.setItem(SHAPEKEY, JSON.stringify(SHAPES)); }catch(e){ toast('이 브라우저에 저장하지 못했습니다 (저장 공간 부족).'); } return; }
  SH.db.doc('shape/' + view).set(SHAPES[view]).catch(e => toast(Backend.denied && Backend.denied(e) ? '이 그림을 고칠 권한이 없습니다.' : '저장하지 못했습니다. 그림이 너무 크면 더 작게 올려 주십시오.')); }

/* 원본 점(u, v: 아래로 +) → 화면: p1 → A(앞), p2 → B(뒤).
   옆면은 앞이 원본에서 오른쪽이면 좌우 뒤집음(반대쪽에서 본 그림). 윗면은 뒤집지 않고 돌리기만 함(뒤집으면 왼쪽 · 오른쪽이 바뀜) */
function shMatrix(p1, p2, A, B, noMirror){ const m = !noMirror && p1[0] > p2[0] ? -1 : 1, q1 = [m*p1[0], p1[1]], q2 = [m*p2[0], p2[1]];
  const ds = [q2[0] - q1[0], q2[1] - q1[1]], dd = [B[0] - A[0], B[1] - A[1]], ls = Math.hypot(ds[0], ds[1]) || 1, k = Math.hypot(dd[0], dd[1])/ls;
  const th = Math.atan2(dd[1], dd[0]) - Math.atan2(ds[1], ds[0]), c = Math.cos(th)*k, s = Math.sin(th)*k;
  return [c*m, s*m, -s, c, A[0] - (c*q1[0] - s*q1[1]), A[1] - (s*q1[0] + c*q1[1])]; }
/* 그림 조각: A = 앞 바퀴(차축) 중심 화면 점, B = 뒤. 없으면 '' (기본 윤곽을 씀) */
function shSvg(view, A, B, v0){ const v = v0 || shGet(view); if(!v) return '';
  const M = shMatrix(v.p1, v.p2, A, B, view==='top').map(x => +x.toFixed(6)).join(' ');
  return v.kind==='img' ? `<g class="cs-img" transform="matrix(${M})"><image href="${v.data}" width="${v.w}" height="${v.h}" preserveAspectRatio="none"/></g>`
    : `<g class="cs-dxf" transform="matrix(${M})"><path d="${v.d}" vector-effect="non-scaling-stroke"/></g>`; }

/* ---------- 파일 읽기 ---------- */
const SHP = {view:'side', src:null, pts:[], busy:false, ret:null};
function shReadImage(file){ return new Promise((ok, no) => { const fr = new FileReader(); fr.onerror = () => no(new Error('파일을 읽지 못했습니다.'));
  fr.onload = () => { const im = new Image(); im.onerror = () => no(new Error('이미지를 열 수 없습니다.'));
    im.onload = () => { let W = im.naturalWidth, H = im.naturalHeight, mx = 1800, q = .85, url = '';
      for(let i = 0; i < 8; i++){ const k = Math.min(1, mx/Math.max(W, H)), w = Math.round(W*k), h = Math.round(H*k), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h); url = cv.toDataURL('image/webp', q); if(!url.startsWith('data:image/webp')) url = cv.toDataURL('image/jpeg', q);
        if(url.length < SHP_MAX) return ok({kind:'img', data:url, w, h}); mx = Math.round(mx*.8); q = Math.max(.6, q - .05); }
      no(new Error('그림이 너무 큽니다. 더 작은 그림으로 올려 주십시오.')); };
    im.src = fr.result; }; fr.readAsDataURL(file); }); }

/* DXF (글자 형식): 선 · 폴리선(볼록 호 포함) · 원 · 호 · 타원 · 스플라인 · 블록 삽입을 선 조각으로. 치수 · 글자 · 해치는 뺌 */
function shParseDxf(txt){
  const L = txt.split(/\r?\n/), P = []; for(let i = 0; i + 1 < L.length; i += 2) P.push([parseInt(L[i], 10), L[i + 1].trim()]);
  if(!P.some(p => p[0]===0 && p[1]==='SECTION')) throw new Error('DXF 형식이 아닙니다 (글자 형식 DXF만 읽습니다).');
  /* 엔티티로 묶기 */
  const ents = list => { const out = []; let cur = null; list.forEach(([c, v]) => { if(c===0){ cur = {t:v, g:[]}; out.push(cur); } else if(cur) cur.g.push([c, v]); }); return out; };
  let sec = null, buf = {}; for(let i = 0; i < P.length; i++){ const [c, v] = P[i];
    if(c===0 && v==='SECTION'){ const nm = P[i + 1] && P[i + 1][0]===2 ? P[i + 1][1] : ''; sec = nm; buf[nm] = []; i++; continue; }
    if(c===0 && v==='ENDSEC'){ sec = null; continue; } if(sec) buf[sec].push(P[i]); }
  const blocks = {}; { let cur = null; ents(buf.BLOCKS || []).forEach(e => { if(e.t==='BLOCK'){ const g = k => (e.g.find(x => x[0]===k) || [])[1]; cur = {name:g(2), bx:+g(10) || 0, by:+g(20) || 0, e:[]}; blocks[cur.name] = cur; }
      else if(e.t==='ENDBLK') cur = null; else if(cur) cur.e.push(e); }); }
  const lines = [], circles = [];
  const num = (e, k, d) => { const x = e.g.find(y => y[0]===k); return x ? parseFloat(x[1]) : d; };
  const arcPts = (cx, cy, r, a0, a1) => { while(a1 <= a0) a1 += 2*Math.PI; const n = Math.max(6, Math.ceil((a1 - a0)/(Math.PI/36))), o = [];
    for(let i = 0; i <= n; i++){ const a = a0 + (a1 - a0)*i/n; o.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]); } return o; };
  /* 볼록 호(bulge b = tan(사잇각/4), + = 반시계): 중심 = 현의 가운데 + 왼쪽 법선 × (현/2)(1 − b²)/(2b) */
  const bulgePts = (p, q, b) => { if(!b) return [q]; const dx = q[0] - p[0], dy = q[1] - p[1], ch = Math.hypot(dx, dy); if(ch < 1e-12) return [q];
    const th = 4*Math.atan(b), off = (ch/2)*(1 - b*b)/(2*b), R = (ch/2)*(1 + b*b)/(2*Math.abs(b)), cx = (p[0] + q[0])/2 - dy/ch*off, cy = (p[1] + q[1])/2 + dx/ch*off;
    const a0 = Math.atan2(p[1] - cy, p[0] - cx), n = Math.max(4, Math.ceil(Math.abs(th)/(Math.PI/36))), o = [];
    for(let i = 1; i < n; i++){ const a = a0 + th*i/n; o.push([cx + R*Math.cos(a), cy + R*Math.sin(a)]); } o.push(q); return o; };
  const spline = e => { const deg = num(e, 71, 3), kn = e.g.filter(x => x[0]===40).map(x => +x[1]), cp = [], fp = [];
    e.g.forEach((x, i) => { if(x[0]===10) cp.push([+x[1], +((e.g[i + 1] || [])[1])]); if(x[0]===11) fp.push([+x[1], +((e.g[i + 1] || [])[1])]); });
    if(cp.length > deg && kn.length === cp.length + deg + 1){ const o = [], a = kn[deg], b = kn[kn.length - deg - 1], n = Math.max(12, cp.length*6);
      for(let s = 0; s <= n; s++){ const u = Math.min(b - 1e-9, a + (b - a)*s/n); let k = deg; while(k < kn.length - deg - 2 && u >= kn[k + 1]) k++;
        const d = []; for(let j = 0; j <= deg; j++) d.push(cp[k - deg + j].slice());
        for(let r = 1; r <= deg; r++) for(let j = deg; j >= r; j--){ const i = k - deg + j, al = (u - kn[i])/((kn[i + deg - r + 1] - kn[i]) || 1); d[j] = [(1 - al)*d[j - 1][0] + al*d[j][0], (1 - al)*d[j - 1][1] + al*d[j][1]]; }
        o.push(d[deg]); } return o; }
    return fp.length > 1 ? fp : cp; };
  const walk = (list, tf, depth) => { let poly = null;
    list.forEach(e => { const T = p => tf(p);
      switch(e.t){
        case 'LINE': lines.push([T([num(e, 10, 0), num(e, 20, 0)]), T([num(e, 11, 0), num(e, 21, 0)])]); break;
        case 'LWPOLYLINE': { const pts = [], bl = []; e.g.forEach((x, i) => { if(x[0]===10){ pts.push([+x[1], +((e.g[i + 1] || [])[1])]); bl.push(0); } if(x[0]===42 && bl.length) bl[bl.length - 1] = +x[1]; });
          if((num(e, 70, 0) & 1) && pts.length) pts.push(pts[0]); const o = pts.length ? [pts[0]] : []; for(let i = 1; i < pts.length; i++) o.push(...bulgePts(pts[i - 1], pts[i], bl[i - 1]));
          if(o.length > 1) lines.push(o.map(T)); break; }
        case 'POLYLINE': poly = {pts:[], bl:[], closed:num(e, 70, 0) & 1}; break;
        case 'VERTEX': if(poly){ poly.pts.push([num(e, 10, 0), num(e, 20, 0)]); poly.bl.push(num(e, 42, 0)); } break;
        case 'SEQEND': if(poly){ const pts = poly.pts.slice(); if(poly.closed && pts.length) pts.push(pts[0]); const o = pts.length ? [pts[0]] : [];
            for(let i = 1; i < pts.length; i++) o.push(...bulgePts(pts[i - 1], pts[i], poly.bl[i - 1])); if(o.length > 1) lines.push(o.map(T)); poly = null; } break;
        case 'CIRCLE': { const cx = num(e, 10, 0), cy = num(e, 20, 0), r = num(e, 40, 0); lines.push(arcPts(cx, cy, r, 0, 2*Math.PI).map(T)); const c = T([cx, cy]), e2 = T([cx + r, cy]); circles.push([c[0], c[1], Math.hypot(e2[0] - c[0], e2[1] - c[1])]); break; }
        case 'ARC': { const cx = num(e, 10, 0), cy = num(e, 20, 0), r = num(e, 40, 0); lines.push(arcPts(cx, cy, r, num(e, 50, 0)*Math.PI/180, num(e, 51, 360)*Math.PI/180).map(T)); break; }
        case 'ELLIPSE': { const cx = num(e, 10, 0), cy = num(e, 20, 0), mx = num(e, 11, 1), my = num(e, 21, 0), ra = num(e, 40, 1), t0 = num(e, 41, 0); let t1 = num(e, 42, 2*Math.PI); while(t1 <= t0) t1 += 2*Math.PI;
          const n = Math.max(12, Math.ceil((t1 - t0)/(Math.PI/36))), o = []; for(let i = 0; i <= n; i++){ const t = t0 + (t1 - t0)*i/n; o.push(T([cx + mx*Math.cos(t) - my*ra*Math.sin(t), cy + my*Math.cos(t) + mx*ra*Math.sin(t)])); } lines.push(o); break; }
        case 'SPLINE': { const o = spline(e); if(o.length > 1) lines.push(o.map(T)); break; }
        case 'INSERT': { const b = blocks[(e.g.find(x => x[0]===2) || [])[1]]; if(!b || depth > 6) break;
          const ix = num(e, 10, 0), iy = num(e, 20, 0), sx = num(e, 41, 1), sy = num(e, 42, sx), ro = num(e, 50, 0)*Math.PI/180, co = Math.cos(ro), si = Math.sin(ro);
          walk(b.e, p => { const x = (p[0] - b.bx)*sx, y = (p[1] - b.by)*sy; return tf([ix + co*x - si*y, iy + si*x + co*y]); }, depth + 1); break; }
      } }); };
  walk(ents(buf.ENTITIES || []), p => p, 0);
  if(!lines.length) throw new Error('도면에서 선을 찾지 못했습니다. 측면도(또는 윗면도) 한 장을 DXF로 저장해 올려 주십시오.');
  return {lines, circles}; }
/* 줄이기(더글러스-포커) → 경로 문자열 (y 를 뒤집어 아래로 +). 너무 크면 허용 오차를 키움 */
function shDxfPath(raw){ let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  raw.lines.forEach(l => l.forEach(([x, y]) => { if(isFinite(x) && isFinite(y)){ x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
  const diag = Math.hypot(x1 - x0, y1 - y0) || 1;
  const dp = (pts, tol) => { if(pts.length < 3) return pts; const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while(st.length){ const [a, b] = st.pop(), [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, l2 = dx*dx + dy*dy; let im = -1, dm = tol;
      for(let i = a + 1; i < b; i++){ const [px, py] = pts[i]; let d; if(!l2) d = Math.hypot(px - ax, py - ay); else { const t = Math.max(0, Math.min(1, ((px - ax)*dx + (py - ay)*dy)/l2)); d = Math.hypot(px - ax - t*dx, py - ay - t*dy); } if(d > dm){ dm = d; im = i; } }
      if(im > 0){ keep[im] = 1; st.push([a, im], [im, b]); } } return pts.filter((_, i) => keep[i]); };
  for(let tol = diag*0.0004; tol < diag*0.02; tol *= 1.6){ const dec = Math.max(0, Math.min(4, Math.ceil(-Math.log10(tol/2))));
    const f = v => (+v.toFixed(dec)).toString();
    const d = raw.lines.map(l => dp(l.filter(p => isFinite(p[0]) && isFinite(p[1])), tol)).filter(l => l.length > 1 && Math.hypot(l[l.length - 1][0] - l[0][0], l[l.length - 1][1] - l[0][1]) + l.length > tol)
      .map(l => 'M' + l.map(([x, y]) => f(x) + ' ' + f(-y)).join('L')).join('');
    if(d.length < SHP_MAX) return {d, box:[x0, -y1, x1 - x0, y1 - y0], circles:raw.circles.map(([x, y, r]) => [x, -y, r])}; }
  throw new Error('도면이 너무 복잡합니다. 볼트 · 작은 부품을 숨기거나 단순화한 측면도로 다시 저장해 올려 주십시오.'); }

/* ---------- 창 ---------- */
function shEl(){ let m = $('#shpm'); if(!m){ m = document.createElement('div'); m.id = 'shpm'; m.className = 'dv-modal shp-modal'; m.hidden = true;
    m.innerHTML = '<div class="dvm-box shp-box" role="dialog" aria-modal="true" aria-labelledby="shp-t"></div>'; document.body.appendChild(m); } return m; }
const SHV = {side:['옆면', '① 앞 바퀴 중심', '② 뒤 바퀴 중심'], top:['윗면 (선택)', '① 앞 차축 가운데', '② 뒤 차축 가운데']};
function shHTML(){ const v = SHP.view, cur = shGet(v), src = SHP.src, ed = shCanEdit(), n = SHP.pts.length, [, l1, l2] = SHV[v];
  const tabs = `<div class="m1-tabs shp-tabs" role="tablist">${Object.entries(SHV).map(([k, t]) => `<button type="button" role="tab" data-shv="${k}" aria-selected="${v===k}">${t[0]}</button>`).join('')}</div>`;
  const step = !src ? '' : n===0 ? `<b>${l1}</b>을 누르십시오` : n===1 ? `<b>${l2}</b>을 누르십시오` : '두 점을 찍었습니다. 아래 미리보기를 확인하고 저장하십시오';
  let pv = '';
  if(src){ const [bx, by, bw, bh] = src.kind==='img' ? [0, 0, src.w, src.h] : src.box, pad = Math.max(bw, bh)*0.03;
    const mk = (p, i) => { const r = Math.max(bw, bh)*0.012; return `<g class="shp-pt"><circle cx="${p[0]}" cy="${p[1]}" r="${r}"/><text x="${p[0] + r*1.4}" y="${p[1] - r*1.2}" style="font-size:${r*2.6}px">${i ? '② 뒤' : '① 앞'}</text></g>`; };
    pv = `<svg class="shp-src" id="shpsrc" viewBox="${bx - pad} ${by - pad} ${bw + 2*pad} ${bh + 2*pad}" preserveAspectRatio="xMidYMid meet">${src.kind==='img' ? `<image href="${src.data}" width="${src.w}" height="${src.h}"/>` : `<path d="${src.d}" class="shp-d" vector-effect="non-scaling-stroke"/>`}${SHP.pts.map(mk).join('')}</svg>`; }
  /* 결과 미리보기: 지금 휠베이스 · 타이어 반경으로 맞춘 모습 + 바퀴 중심 · 지면 표시 */
  let res = '';
  const show = src && n===2 ? {...src, p1:SHP.pts[0], p2:SHP.pts[1]} : (!src && cur ? cur : null);
  if(show){ const P = typeof DASH!=='undefined' ? DASH.P : {L:1550, r_eff:229}, L = P.L || 1550, r = P.r_eff || 229, W = 640, H = v==='side' ? 260 : 220, s = W/(L + 1500), x0 = 900;
    const T = (x, y) => [ (x + x0)*s, v==='side' ? H - 20 - y*s : H/2 - y*s ];
    const A = v==='side' ? T(0, r) : T(0, 0), B = v==='side' ? T(L, r) : T(L, 0);
    res = `<div class="shp-res"><b>맞춘 모습</b> <span class="muted">휠베이스 ${Math.round(L)} mm${v==='side' ? ` · 타이어 반경 ${Math.round(r)} mm` : ''} 기준, 빨간 점 = 바퀴(차축) 중심${v==='side' ? ', 선 = 지면' : ''}</span>
      <svg viewBox="0 0 ${W} ${H}" class="shp-fit">${shSvg(v, A, B, show)}${v==='side' ? `<line x1="0" y1="${H - 20}" x2="${W}" y2="${H - 20}" class="cf-gnd"/>` : ''}<circle cx="${A[0]}" cy="${A[1]}" r="4" class="shp-ax"/><circle cx="${B[0]}" cy="${B[1]}" r="4" class="shp-ax"/><text x="8" y="16" class="cf-t sm mut">← 앞</text></svg></div>`; }
  return `<div class="dvi-h"><b id="shp-t">차 형상 (그림 바탕)</b><button type="button" class="dvi-x" data-shpx aria-label="닫기">×</button></div>
    <div class="shp-top">${tabs}<span class="muted">${shSeason()} 시즌 · ${cur ? `지금: 올린 ${cur.kind==='img' ? '이미지' : 'DXF 도면'}` : '지금: 기본 윤곽'}</span></div>
    <div class="dvi-body shp-body">
      <p class="shp-help">우리 차 ${v==='side' ? '측면도' : '윗면도'}를 올리면 질량 계산기 · 드라이버 모델 · 대시보드 그림의 차 윤곽 대신 씁니다. 계산에는 쓰지 않습니다.<br>
        이미지(.png .jpg .webp)는 CAD 정투영 그림이나 정면에서 수평으로 찍은 그림, DXF는 CAD 도면에서 ${v==='side' ? '측면도' : '윗면도'} 한 장만 두고 저장한 파일을 올리십시오. 올린 뒤 ${l1} → ${l2} 순서로 두 점을 찍으면 크기 · 방향 · 위치가 자동으로 맞춰집니다${v==='side' ? '' : ' (윗면을 올리지 않으면 기본 윤곽)'}.</p>
      ${ed ? `<label class="btn small shp-file">파일 고르기<input type="file" accept=".png,.jpg,.jpeg,.webp,.dxf" data-shpf hidden></label>` : '<p class="muted">지난 시즌 그림은 회장만 고칠 수 있습니다.</p>'}
      <span class="shp-msg" id="shpmsg">${SHP.busy ? '읽는 중…' : step}</span>
      ${pv}${res}</div>
    <div class="dvi-foot"><span>${ed && cur && !src ? '<button type="button" class="lnk" data-shpdel>기본 윤곽으로 되돌리기</button>' : ''}</span><span class="dvi-btns">${src ? '<button type="button" class="btn small" data-shpre>다시 찍기</button>' : ''}<button type="button" class="btn small" data-shpx>닫기</button>${ed && src ? `<button type="button" class="btn small pri" data-shpsave${n===2 ? '' : ' disabled'}>저장</button>` : ''}</span></div>`; }
function shPaint(){ const m = shEl(); m.querySelector('.dvm-box').innerHTML = shHTML(); }
function shOpen(btn){ SHP.ret = btn || null; SHP.src = null; SHP.pts = []; const m = shEl(); shPaint(); m.hidden = false; const f = m.querySelector('[data-shpx]'); if(f) f.focus(); }
function shClose(){ const m = $('#shpm'); if(m) m.hidden = true; SHP.src = null; SHP.pts = []; if(SHP.ret && SHP.ret.isConnected) SHP.ret.focus(); }
async function shFile(file){ if(!file) return; const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(!['png','jpg','jpeg','webp','dxf'].includes(ext)){ toast('이미지(.png .jpg .webp) 또는 .dxf 파일만 올릴 수 있습니다.'); return; }
  if(file.size > 40*1024*1024){ toast('파일이 너무 큽니다 (40 MB 이하).'); return; }
  SHP.busy = true; SHP.src = null; SHP.pts = []; shPaint();
  try{ SHP.src = ext==='dxf' ? {kind:'dxf', ...shDxfPath(shParseDxf(await file.text()))} : await shReadImage(file); }
  catch(e){ toast(e.message || '파일을 읽지 못했습니다.'); }
  SHP.busy = false; shPaint(); }
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return;
  const op = t.closest('[data-shpopen]'); if(op){ shOpen(op); return; }
  if(!t.closest('#shpm')) return;
  if(t.closest('[data-shpx]') || t.id==='shpm'){ shClose(); return; }
  const tv = t.closest('[data-shv]'); if(tv){ SHP.view = tv.dataset.shv; SHP.src = null; SHP.pts = []; shPaint(); return; }
  if(t.closest('[data-shpre]')){ SHP.pts = []; shPaint(); return; }
  if(t.closest('[data-shpdel]')){ shStore(SHP.view, null); toast('기본 윤곽으로 되돌렸습니다.'); shPaint(); return; }
  if(t.closest('[data-shpsave]')){ const s = SHP.src; if(!s || SHP.pts.length < 2) return;
    const val = s.kind==='img' ? {kind:'img', data:s.data, w:s.w, h:s.h, p1:SHP.pts[0], p2:SHP.pts[1]} : {kind:'dxf', d:s.d, box:s.box, p1:SHP.pts[0], p2:SHP.pts[1]};
    if(JSON.stringify(val).length > SHP_MAX + 20000){ toast('그림이 너무 큽니다. 더 단순한 그림으로 올려 주십시오.'); return; }
    shStore(SHP.view, val); toast(`${SHV[SHP.view][0].replace(' (선택)', '')} 그림을 저장했습니다.`); SHP.src = null; SHP.pts = []; shPaint(); return; }
  const sv = t.closest('#shpsrc'); if(sv && SHP.src && SHP.pts.length < 2){ const pt = sv.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(sv.getScreenCTM().inverse()); let p = [q.x, q.y];
    /* DXF: 가까운 원(바퀴 · 허브)이 있으면 그 중심에 붙임 */
    if(SHP.src.kind==='dxf' && SHP.src.circles.length){ const px = 14/(sv.getScreenCTM().a || 1); let best = null, bd = px;
      SHP.src.circles.forEach(([cx, cy]) => { const d = Math.hypot(cx - p[0], cy - p[1]); if(d < bd){ bd = d; best = [cx, cy]; } }); if(best) p = best; }
    SHP.pts.push(p); shPaint(); }
});
document.addEventListener('change', e => { const t = e.target; if(t.matches && t.matches('[data-shpf]')) shFile(t.files && t.files[0]); });
document.addEventListener('keydown', e => { if(e.key==='Escape'){ const m = $('#shpm'); if(m && !m.hidden){ e.preventDefault(); e.stopPropagation(); shClose(); } } }, true);
