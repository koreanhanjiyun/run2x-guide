/* ============================================================
   차 형상 배경 (옆면 · 윗면): 팀이 올린 그림을 차 윤곽 대신 그림 바탕으로 씀
   - 파일: 이미지(.png .jpg .jpeg .webp) 또는 CAD 도면(.dxf, 측면도 · 윗면도 한 장)
   - 맞춤: 그림 위에서 ① 앞 바퀴 중심 → ② 뒤 바퀴 중심 (윗면은 앞 차축 가운데 → 뒤 차축 가운데) 두 점만 찍음
     → 두 점 거리 = 휠베이스로 크기, 두 점을 잇는 선이 수평이 되게 회전, 앞이 오른쪽이면 좌우 뒤집기. 지면 = 바퀴 중심에서 하중 반경 r_load 아래
   - 저장: teams/<팀>/shape/<side|top> = {s:{시즌:{kind:'img'|'dxf', ...}}} (팀원 누구나 이번 시즌, 로그인 전은 이 브라우저)
     img: data(줄인 이미지 data: 주소), w, h, p1, p2 (그림 픽셀, 아래로 +)
     dxf: d(선 그림 경로, 도면 단위 · y 를 뒤집어 아래로 +), p1, p2
   - 계산에는 쓰지 않음. 질량 계산기(질량 분포 옆 · 위) · 드라이버 모델 그림의 바탕만 바뀜. 대시보드 '그림으로 보기'는 기본 차 그림 그대로
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
/* 그림 조각: A = 앞 바퀴(차축) 중심 화면 점, B = 뒤. 없으면 '' (기본 차 그림을 씀) */
function shSvg(view, A, B, v0){ const v = v0 || shGet(view); if(!v) return '';
  const M = shMatrix(v.p1, v.p2, A, B, view==='top').map(x => +x.toFixed(6)).join(' ');
  return v.kind==='img' ? `<g class="cs-img" transform="matrix(${M})"><image href="${v.data}" width="${v.w}" height="${v.h}" preserveAspectRatio="none"/></g>`
    : `<g class="cs-dxf" transform="matrix(${M})"><path d="${v.d}" vector-effect="non-scaling-stroke"/></g>`; }

/* ---------- 파일 읽기 ---------- */
const SHP = {view:'side', raw:null, src:null, stage:'', crop:null, drag:null, pan:null, vb:null, pts:[], busy:false, ret:null};
/* stage: crop(범위 자르기) → pts. 옆면 = 점 두 개(앞 · 뒤 바퀴 중심), 윗면 = 선 세 개(앞 차축 중심선 · 뒤 차축 중심선 · 차량 중심선). vb = 미리보기 확대 · 이동 상태 */
/* 이미지: 원본을 그대로 들고 있다가(자르기는 원본 해상도에서), 자른 뒤 줄여서 저장 */
function shLoadImage(file){ return new Promise((ok, no) => { const fr = new FileReader(); fr.onerror = () => no(new Error('파일을 읽지 못했습니다.'));
  fr.onload = () => { const im = new Image(); im.onerror = () => no(new Error('이미지를 열 수 없습니다.'));
    im.onload = () => { const W = im.naturalWidth, H = im.naturalHeight, k = Math.min(1, 1400/Math.max(W, H)), cv = document.createElement('canvas'); cv.width = Math.round(W*k); cv.height = Math.round(H*k);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok({kind:'img', im, W, H, prev:cv.toDataURL('image/jpeg', .8), box:[0, 0, W, H]}); };
    im.src = fr.result; }; fr.readAsDataURL(file); }); }
function shImgSrc(raw, rc){ const [sx, sy, sw, sh] = rc || [0, 0, raw.W, raw.H]; let mx = 1800, q = .85, url = '';
  for(let i = 0; i < 8; i++){ const k = Math.min(1, mx/Math.max(sw, sh)), w = Math.max(1, Math.round(sw*k)), h = Math.max(1, Math.round(sh*k)), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(raw.im, sx, sy, sw, sh, 0, 0, w, h); url = cv.toDataURL('image/webp', q); if(!url.startsWith('data:image/webp')) url = cv.toDataURL('image/jpeg', q);
    if(url.length < SHP_MAX) return {kind:'img', data:url, w, h}; mx = Math.round(mx*.8); q = Math.max(.6, q - .05); }
  throw new Error('그림이 너무 큽니다. 범위를 더 좁게 자르거나 더 작은 그림으로 올려 주십시오.'); }
/* DXF 자르기: 화면(아래로 +) 사각형 밖의 선은 버림 (선분을 사각형 경계에서 자름, Liang–Barsky) */
function shDxfClip(parsed, rc){ if(!rc) return parsed; const [rx, ry, rw, rh] = rc, X0 = rx, X1 = rx + rw, Y0 = -(ry + rh), Y1 = -ry;   /* 원 도면 좌표(위로 +) 범위 */
  const clip = (a, b) => { let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    for(const [p, q] of [[-dx, a[0] - X0], [dx, X1 - a[0]], [-dy, a[1] - Y0], [dy, Y1 - a[1]]]){ if(p===0){ if(q < 0) return null; continue; } const r = q/p; if(p < 0){ if(r > t1) return null; if(r > t0) t0 = r; } else { if(r < t0) return null; if(r < t1) t1 = r; } }
    return [[a[0] + t0*dx, a[1] + t0*dy], [a[0] + t1*dx, a[1] + t1*dy], t0 > 0, t1 < 1]; };
  const lines = []; parsed.lines.forEach(l => { let run = null;
    for(let i = 1; i < l.length; i++){ const c = clip(l[i - 1], l[i]); if(!c){ if(run){ lines.push(run); run = null; } continue; }
      if(!run || c[2]){ if(run) lines.push(run); run = [c[0]]; } run.push(c[1]); if(c[3]){ lines.push(run); run = null; } }
    if(run && run.length > 1) lines.push(run); });
  if(!lines.length) throw new Error('고른 범위 안에 선이 없습니다.');
  return {lines, circles:parsed.circles.filter(([x, y]) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1)}; }

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
const SHV = {side:['옆면', '① 앞 바퀴 중심', '② 뒤 바퀴 중심'], top:['윗면', '① 앞 차축 중심선', '② 뒤 차축 중심선']};
/* 찍을 것: 옆면 [점 앞, 점 뒤], 윗면 [세로선 앞 차축, 세로선 뒤 차축, 가로선 차량 중심선] */
const SHPICK = {side:[['p','① 앞 바퀴 중심(점)'],['p','② 뒤 바퀴 중심(점)']], top:[['v','① 앞 차축 중심선(세로선)'],['v','② 뒤 차축 중심선(세로선)'],['h','③ 차량 중심선(가로선, 좌우 가운데)']]};
const shNeed = () => SHPICK[SHP.view].length, shDone = () => SHP.pts.length >= shNeed();
/* 찍은 것 → 앞 · 뒤 기준점 p1 · p2 (윗면은 두 차축선과 중심선의 교점) */
const shP12 = () => { const P = SHP.pts; if(!shDone()) return null; return SHP.view==='side' ? [P[0], P[1]] : [[P[0], P[2]], [P[1], P[2]]]; };
/* 찍은 점 · 선 표시 (확대에 맞춰 크기 유지) */
function shMarks(VB){ const sc = VB[2]/700, r = 6*sc, fs = 13*sc, P = SHP.pts, pk = SHPICK[SHP.view], big = 1e7;
  return P.map((q, i) => { const lb = pk[i][1].slice(0, 1) + (SHP.view==='side' ? (i ? ' 뒤' : ' 앞') : ['앞 차축', '뒤 차축', '중심선'][i]);
    if(pk[i][0]==='p') return `<g class="shp-pt"><circle cx="${q[0]}" cy="${q[1]}" r="${r}"/><text x="${q[0] + r*1.6}" y="${q[1] - r*1.3}" style="font-size:${fs}px">${lb}</text></g>`;
    const vtx = pk[i][0]==='v';
    return `<g class="shp-ln"><line x1="${vtx ? q : -big}" y1="${vtx ? -big : q}" x2="${vtx ? q : big}" y2="${vtx ? big : q}" vector-effect="non-scaling-stroke"/><text x="${vtx ? q + 4*sc : VB[0] + 6*sc}" y="${vtx ? VB[1] + 16*sc : q - 5*sc}" style="font-size:${fs}px">${lb}</text></g>`; }).join(''); }
function shHTML(){ const v = SHP.view, cur = shGet(v), src = SHP.src, ed = shCanEdit(), n = SHP.pts.length, [, l1, l2] = SHV[v];
  const tabs = `<div class="m1-tabs shp-tabs" role="tablist">${Object.entries(SHV).map(([k, t]) => `<button type="button" role="tab" data-shv="${k}" aria-selected="${v===k}">${t[0]}</button>`).join('')}</div>`;
  const stg = SHP.stage, raw = SHP.raw;
  const NS = shNeed() + 1, pk = SHPICK[v];
  const step = stg==='crop' ? `<span class="shp-st">단계 1 / ${NS}</span> <b>쓸 범위</b>를 끌어서 사각형으로 고르십시오 (도면 테두리 · 표제란 · 다른 뷰 · 여백을 빼면 그림이 더 깔끔하고 이미지는 화질도 좋아짐). 필요 없으면 [자르지 않고 계속]`
    : !src ? '' : n < pk.length ? `<span class="shp-st">단계 ${n + 2} / ${NS}</span> <b>${pk[n][1]}</b>을 누르십시오${pk[n][0]==='p' ? '' : ' (마우스를 따라 선이 움직임)'}` : '모두 찍었습니다. 아래 맞춘 모습을 확인하고 저장하십시오';
  const zoomHint = (stg==='crop' || src) ? '<span class="shp-zh">마우스 휠: 확대 · 축소 · 휠 버튼(또는 Ctrl + 끌기): 이동</span>' : '';
  let pv = '';
  if(stg==='crop' && raw){ const [bx, by, bw, bh] = raw.kind==='img' ? raw.box : raw.prev.box, pad = Math.max(bw, bh)*0.03, c = SHP.crop, VB = SHP.vb || [bx - pad, by - pad, bw + 2*pad, bh + 2*pad];
    pv = `<svg class="shp-src crop" id="shpsrc" data-base="${[bx - pad, by - pad, bw + 2*pad, bh + 2*pad].join(' ')}" viewBox="${VB.join(' ')}" preserveAspectRatio="xMidYMid meet">${raw.kind==='img' ? `<image href="${raw.prev}" width="${raw.W}" height="${raw.H}" preserveAspectRatio="none"/>` : `<path d="${raw.prev.d}" class="shp-d" vector-effect="non-scaling-stroke"/>`}
      <path id="shpdim" class="shp-dim" fill-rule="evenodd" d="M${bx - pad*20} ${by - pad*20}h${bw + 40*pad}v${bh + 40*pad}h${-(bw + 40*pad)}Z${c ? ` M${c[0]} ${c[1]}h${c[2]}v${c[3]}h${-c[2]}Z` : ''}"/><rect id="shpcrop" class="shp-crop" x="${c ? c[0] : 0}" y="${c ? c[1] : 0}" width="${c ? c[2] : 0}" height="${c ? c[3] : 0}" vector-effect="non-scaling-stroke"/></svg>`; }
  else if(src){ const [bx, by, bw, bh] = src.kind==='img' ? [0, 0, src.w, src.h] : src.box, pad = Math.max(bw, bh)*0.03, VB = SHP.vb || [bx - pad, by - pad, bw + 2*pad, bh + 2*pad];
    pv = `<svg class="shp-src pick" id="shpsrc" data-base="${[bx - pad, by - pad, bw + 2*pad, bh + 2*pad].join(' ')}" viewBox="${VB.join(' ')}" preserveAspectRatio="xMidYMid meet">${src.kind==='img' ? `<image href="${src.data}" width="${src.w}" height="${src.h}"/>` : `<path d="${src.d}" class="shp-d" vector-effect="non-scaling-stroke"/>`}<g id="shpmk">${shMarks(VB)}</g><line id="shpguide" class="shp-guide" x1="0" y1="0" x2="0" y2="0" vector-effect="non-scaling-stroke"/></svg>`; }
  /* 결과 미리보기: 지금 휠베이스 · 타이어 반경으로 맞춘 모습 + 바퀴 중심 · 지면 표시 */
  let res = '';
  const P12 = src && shP12(), show = P12 ? {...src, p1:P12[0], p2:P12[1]} : (!src && cur ? cur : null);
  if(show){ const WI = typeof WB!=='undefined' && WB.id ? WB.I : {}, P = typeof DASH!=='undefined' ? DASH.P : {}, L = WI.L || P.L || 1550, r = WI.r_load || P.r_load || 220, W = 640, H = v==='side' ? 260 : 220, s = W/(L + 1500), x0 = 900;
    const T = (x, y) => [ (x + x0)*s, v==='side' ? H - 20 - y*s : H/2 - y*s ];
    const A = v==='side' ? T(0, r) : T(0, 0), B = v==='side' ? T(L, r) : T(L, 0);
    res = `<div class="shp-res"><b>맞춘 모습</b> <span class="muted">휠베이스 ${Math.round(L)} mm${v==='side' ? ` · 타이어 하중 반경 ${Math.round(r)} mm` : ''} 기준, 빨간 점 = 바퀴(차축) 중심${v==='side' ? ', 선 = 지면' : ''}</span>
      <svg viewBox="0 0 ${W} ${H}" class="shp-fit">${shSvg(v, A, B, show)}${v==='side' ? `<line x1="0" y1="${H - 20}" x2="${W}" y2="${H - 20}" class="cf-gnd"/>` : ''}<circle cx="${A[0]}" cy="${A[1]}" r="4" class="shp-ax"/><circle cx="${B[0]}" cy="${B[1]}" r="4" class="shp-ax"/><text x="8" y="16" class="cf-t sm mut">← 앞</text></svg></div>`; }
  return `<div class="dvi-h"><b id="shp-t">차 형상 (그림 바탕)</b><button type="button" class="dvi-x" data-shpx aria-label="닫기">×</button></div>
    <div class="shp-top">${tabs}<span class="muted">${shSeason()} 시즌 · ${cur ? `지금: 올린 ${cur.kind==='img' ? '이미지' : 'DXF 도면'}` : '지금: 기본 차 그림'}</span></div>
    <div class="dvi-body shp-body">
      <p class="shp-help">우리 차 ${v==='side' ? '측면도' : '윗면도'}를 올리면 질량 계산기의 질량 분포(옆 · 위) · 드라이버 모델 그림의 차 대신 씁니다. 계산에는 쓰지 않습니다.<br>
        이미지(.png .jpg .webp)는 CAD 정투영 그림이나 정면에서 수평으로 찍은 그림, DXF는 CAD 도면 파일을 올리십시오${v==='side' ? '' : ' (윗면도는 차 길이 방향이 가로가 되게)'}. 올린 뒤 ${v==='side' ? '① 범위 자르기 → ② 앞 바퀴 중심 → ③ 뒤 바퀴 중심(3단계)' : '① 범위 자르기 → ② 앞 차축 중심선 → ③ 뒤 차축 중심선 → ④ 차량 중심선(4단계)'}만 하면 크기 · 방향 · 위치가 자동으로 맞춰집니다. 올리지 않거나 되돌리면 기본 차 그림입니다.</p>
      ${ed ? `<label class="btn small shp-file">파일 고르기<input type="file" accept=".png,.jpg,.jpeg,.webp,.dxf" data-shpf hidden></label>` : '<p class="muted">지난 시즌 그림은 회장만 고칠 수 있습니다.</p>'}
      <span class="shp-msg" id="shpmsg">${SHP.busy ? '읽는 중…' : step}</span>${zoomHint}
      ${pv ? `<div class="shp-stage">${pv}${shZoomCtl()}</div>` : ''}${res}</div>
    <div class="dvi-foot"><span>${ed && cur && !src && stg!=='crop' ? '<button type="button" class="btn small" data-shpedit>저장된 그림 다시 편집</button> <button type="button" class="lnk" data-shpdel>기본 차 그림으로 되돌리기</button>' : ''}</span><span class="dvi-btns">${stg==='crop' ? `<button type="button" class="btn small" data-shpcrop="skip">자르지 않고 계속</button><button type="button" class="btn small pri" data-shpcrop="ok"${SHP.crop ? '' : ' disabled'}>이 범위로 자르기</button>`
      : `${src && raw ? '<button type="button" class="btn small" data-shprecrop>다시 자르기</button>' : ''}${src ? '<button type="button" class="btn small" data-shpre>다시 찍기</button>' : ''}<button type="button" class="btn small" data-shpx>닫기</button>${ed && src ? `<button type="button" class="btn small pri" data-shpsave${shDone() ? '' : ' disabled'}>저장</button>` : ''}`}</span></div>`; }
function shPaint(){ const m = shEl(); m.querySelector('.dvm-box').innerHTML = shHTML(); shZoomPaint(); }
/* 저장된 그림을 다시 편집: 저장본(자른 · 줄인 그림)을 원본처럼 다시 열어 자르기 · 찍기를 다시 함. 처음 파일은 저장 한도 때문에 보관하지 않으므로 저장한 범위 안에서만 다시 자를 수 있음 */
async function shEditSaved(){ const cur = shGet(SHP.view); if(!cur) return; shReset(); SHP.busy = true; shPaint();
  try{ if(cur.kind==='img'){ const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('저장된 그림을 열지 못했습니다.')); i.src = cur.data; });
      SHP.raw = {kind:'img', im, W:cur.w, H:cur.h, prev:cur.data, box:[0, 0, cur.w, cur.h]}; SHP.src = {kind:'img', data:cur.data, w:cur.w, h:cur.h}; }
    else { const lines = cur.d.split('M').filter(Boolean).map(seg => seg.split('L').map(pr => { const [x, y] = pr.trim().split(/\s+/).map(Number); return [x, -y]; }));
      const parsed = {lines, circles:(cur.circles || []).map(([x, y, r]) => [x, -y, r])}; SHP.raw = {kind:'dxf', parsed, prev:{d:cur.d, box:cur.box, circles:cur.circles || []}};
      SHP.src = {kind:'dxf', d:cur.d, box:cur.box, circles:cur.circles || []}; }
    SHP.stage = 'pts'; SHP.pts = SHP.view==='side' ? [cur.p1, cur.p2] : [cur.p1[0], cur.p2[0], cur.p1[1]]; }
  catch(e){ toast(e.message || '다시 열지 못했습니다.'); shReset(); }
  SHP.busy = false; shPaint(); }
const shReset = () => { SHP.raw = null; SHP.src = null; SHP.stage = ''; SHP.crop = null; SHP.drag = null; SHP.pan = null; SHP.vb = null; SHP.pts = []; };
function shOpen(btn){ SHP.ret = btn || null; shReset(); if(btn && SHV[btn.dataset.shpopen]) SHP.view = btn.dataset.shpopen;   /* data-shpopen="top" 이면 윗면 탭으로 */ const m = shEl(); shPaint(); m.hidden = false; const f = m.querySelector('[data-shpx]'); if(f) f.focus(); }
function shClose(){ const m = $('#shpm'); if(m) m.hidden = true; shReset(); if(SHP.ret && SHP.ret.isConnected) SHP.ret.focus(); }
async function shFile(file){ if(!file) return; const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(!['png','jpg','jpeg','webp','dxf'].includes(ext)){ const msg = `읽을 수 없는 파일입니다 (.${ext || '확장자 없음'}). 올릴 수 있는 파일: 이미지 .png .jpg .webp, 도면 .dxf. CAD 파일은 [다른 이름으로 저장 → DXF]로 저장해 올려 주십시오.`;
    toast(msg); const mg = $('#shpmsg'); if(mg) mg.textContent = msg; return; }
  if(file.size > 40*1024*1024){ toast('파일이 너무 큽니다 (40 MB 이하).'); return; }
  shReset(); SHP.busy = true; shPaint();
  try{ if(ext==='dxf'){ const parsed = shParseDxf(await file.text()); SHP.raw = {kind:'dxf', parsed, prev:shDxfPath(parsed)}; } else SHP.raw = await shLoadImage(file); SHP.stage = 'crop'; }
  catch(e){ toast(e.message || '파일을 읽지 못했습니다.'); shReset(); }
  SHP.busy = false; shPaint(); }
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return;
  const op = t.closest('[data-shpopen]'); if(op){ shOpen(op); return; }
  if(!t.closest('#shpm')) return;
  if(t.closest('[data-shpx]') || t.id==='shpm'){ shClose(); return; }
  const tv = t.closest('[data-shv]'); if(tv){ SHP.view = tv.dataset.shv; shReset(); shPaint(); return; }
  if(t.closest('[data-shpre]')){ SHP.pts = []; shPaint(); return; }
  if(t.closest('[data-shprecrop]')){ SHP.stage = 'crop'; SHP.src = null; SHP.pts = []; SHP.vb = null; shPaint(); return; }
  if(t.closest('[data-shpfit]')){ SHP.vb = null; shPaint(); return; }
  const zb = t.closest('[data-shpz]'); if(zb){ shZoomBy(+zb.dataset.shpz); return; }
  if(t.closest('[data-shpedit]')){ shEditSaved(); return; }
  const cb = t.closest('[data-shpcrop]'); if(cb && SHP.raw){ const rc = cb.dataset.shpcrop==='ok' ? SHP.crop : null;
    try{ SHP.src = SHP.raw.kind==='img' ? shImgSrc(SHP.raw, rc && [Math.max(0, rc[0]), Math.max(0, rc[1]), Math.min(SHP.raw.W - Math.max(0, rc[0]), rc[2]), Math.min(SHP.raw.H - Math.max(0, rc[1]), rc[3])])
        : {kind:'dxf', ...shDxfPath(rc ? shDxfClip(SHP.raw.parsed, rc) : SHP.raw.parsed)}; SHP.stage = 'pts'; SHP.pts = []; SHP.vb = null; }
    catch(err){ toast(err.message || '자르지 못했습니다.'); } shPaint(); return; }
  if(t.closest('[data-shpdel]')){ shStore(SHP.view, null); toast('기본 차 그림으로 되돌렸습니다.'); shPaint(); return; }
  if(t.closest('[data-shpsave]')){ const s = SHP.src, P12 = shP12(); if(!s || !P12) return;
    const val = s.kind==='img' ? {kind:'img', data:s.data, w:s.w, h:s.h, p1:P12[0], p2:P12[1]} : {kind:'dxf', d:s.d, box:s.box, circles:(s.circles || []).slice(0, 80).map(c => c.map(x => +x.toFixed(2))), p1:P12[0], p2:P12[1]};
    if(JSON.stringify(val).length > SHP_MAX + 20000){ toast('그림이 너무 큽니다. 더 단순한 그림으로 올려 주십시오.'); return; }
    shStore(SHP.view, val); toast(`${SHV[SHP.view][0]} 그림을 저장했습니다.`); SHP.src = null; SHP.pts = []; shPaint(); return; }
  const sv = t.closest('#shpsrc'); if(sv && SHP.stage==='pts' && SHP.src && !shDone()){ if(SHP.moved){ SHP.moved = false; return; } let p = shPt(sv, e); const kind = SHPICK[SHP.view][SHP.pts.length][0];
    /* DXF 옆면: 가까운 원(바퀴 · 허브)이 있으면 그 중심에 붙임 */
    if(kind==='p' && SHP.src.kind==='dxf' && SHP.src.circles.length){ const px = 14/(sv.getScreenCTM().a || 1); let best = null, bd = px;
      SHP.src.circles.forEach(([cx, cy]) => { const d = Math.hypot(cx - p[0], cy - p[1]); if(d < bd){ bd = d; best = [cx, cy]; } }); if(best) p = best; }
    SHP.pts.push(kind==='p' ? p : kind==='v' ? p[0] : p[1]); shPaint(); }
});
document.addEventListener('change', e => { const t = e.target; if(t.matches && t.matches('[data-shpf]')){ shFile(t.files && t.files[0]); t.value = ''; } });
/* 범위 자르기: 미리보기 위에서 끌어 사각형 */
const shPt = (sv, e) => { const pt = sv.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(sv.getScreenCTM().inverse()); return [q.x, q.y]; };
const shVB = sv => { const v = sv.viewBox.baseVal; return [v.x, v.y, v.width, v.height]; };
const shSetVB = (sv, VB) => { SHP.vb = VB; sv.setAttribute('viewBox', VB.join(' ')); const mk = $('#shpmk'); if(mk) mk.innerHTML = shMarks(VB); shZoomPaint(sv); };
/* 그림 위 확대 버튼(오른쪽 위): − · 배율 · ＋ · 전체 보기. 배율 = 처음(전체 보기) 너비 ÷ 지금 너비 */
const shZoomPct = sv => { const base = sv.dataset.base.split(' ').map(Number); return Math.round(base[2]/shVB(sv)[2]*100); };
function shZoomCtl(){ return `<div class="shp-zc" role="group" aria-label="그림 확대"><button type="button" data-shpz="-1" title="축소 (마우스 휠도 됨)" aria-label="축소">−</button><span id="shpzp" class="shp-zp">100 %</span><button type="button" data-shpz="1" title="확대 (마우스 휠도 됨)" aria-label="확대">＋</button><button type="button" class="shp-zf" data-shpfit title="처음 크기로">전체 보기</button></div>`; }
function shZoomPaint(sv){ sv = sv || $('#shpsrc'); const el = $('#shpzp'); if(!sv || !el) return; const z = shZoomPct(sv); el.textContent = `${z} %`; el.classList.toggle('on', Math.abs(z - 100) > 1); }
/* 버튼 확대: 그림 가운데를 중심으로 1.25배 */
function shZoomBy(dir){ const sv = $('#shpsrc'); if(!sv) return; const VB = shVB(sv), base = sv.dataset.base.split(' ').map(Number), f = dir > 0 ? 1/1.25 : 1.25,
    w = Math.min(base[2]*1.5, Math.max(base[2]/60, VB[2]*f)), k = w/VB[2], c = [VB[0] + VB[2]/2, VB[1] + VB[3]/2];
  shSetVB(sv, [c[0] - VB[2]*k/2, c[1] - VB[3]*k/2, VB[2]*k, VB[3]*k]); }
/* 끌기: 왼쪽 = 범위 자르기(자르기 단계), 휠 버튼 또는 Ctrl + 끌기 = 이동 */
document.addEventListener('pointerdown', e => { const sv = e.target.closest && e.target.closest('#shpsrc'); if(!sv) return;
  if(e.button===1 || (e.button===0 && e.ctrlKey)){ e.preventDefault(); SHP.pan = {sv, x:e.clientX, y:e.clientY, moved:false}; try{ sv.setPointerCapture(e.pointerId); }catch(err){} return; }
  if(e.button===0 && sv.classList.contains('crop')){ e.preventDefault(); SHP.drag = {sv, a:shPt(sv, e)}; try{ sv.setPointerCapture(e.pointerId); }catch(err){} } });
document.addEventListener('pointermove', e => { const G = SHP.pan;
  if(G){ const VB = shVB(G.sv), rc = G.sv.getBoundingClientRect(), k = 1/(Math.min(rc.width/VB[2], rc.height/VB[3]) || 1), dx = e.clientX - G.x, dy = e.clientY - G.y;
    if(Math.abs(dx) + Math.abs(dy) > 2) G.moved = true; G.x = e.clientX; G.y = e.clientY; shSetVB(G.sv, [VB[0] - dx*k, VB[1] - dy*k, VB[2], VB[3]]); return; }
  const D = SHP.drag;
  if(D){ const b = shPt(D.sv, e), r = [Math.min(D.a[0], b[0]), Math.min(D.a[1], b[1]), Math.abs(b[0] - D.a[0]), Math.abs(b[1] - D.a[1])]; SHP.crop = r;
    const R = $('#shpcrop'), M = $('#shpdim'), base = D.sv.dataset.base.split(' ').map(Number), P = base[2]*20;
    if(R){ R.setAttribute('x', r[0]); R.setAttribute('y', r[1]); R.setAttribute('width', r[2]); R.setAttribute('height', r[3]); }
    if(M) M.setAttribute('d', `M${base[0] - P} ${base[1] - P}h${base[2] + 2*P}v${base[3] + 2*P}h${-(base[2] + 2*P)}Z M${r[0]} ${r[1]}h${r[2]}v${r[3]}h${-r[2]}Z`); return; }
  /* 윗면 선 고르기: 마우스를 따라 세로 · 가로 안내선 */
  const sv = e.target.closest && e.target.closest('#shpsrc.pick'), gl = $('#shpguide'); if(!gl) return;
  if(!sv || shDone() || SHPICK[SHP.view][SHP.pts.length][0]==='p'){ gl.setAttribute('x1', 0); gl.setAttribute('x2', 0); gl.setAttribute('y1', 0); gl.setAttribute('y2', 0); return; }
  const p = shPt(sv, e), v = SHPICK[SHP.view][SHP.pts.length][0]==='v', big = 1e7;
  gl.setAttribute('x1', v ? p[0] : -big); gl.setAttribute('x2', v ? p[0] : big); gl.setAttribute('y1', v ? -big : p[1]); gl.setAttribute('y2', v ? big : p[1]); });
document.addEventListener('pointerup', () => { const G = SHP.pan; if(G){ SHP.pan = null; if(G.moved) SHP.moved = true; setTimeout(() => { SHP.moved = false; }, 0); return; }
  const D = SHP.drag; if(!D) return; SHP.drag = null; if(SHP.crop && (SHP.crop[2] < 1e-9 || SHP.crop[3] < 1e-9)) SHP.crop = null; shPaint(); });
/* 휠: 마우스 위치를 중심으로 확대 · 축소 */
document.addEventListener('wheel', e => { const sv = e.target.closest && e.target.closest('#shpsrc'); if(!sv) return; e.preventDefault();
  const VB = shVB(sv), base = sv.dataset.base.split(' ').map(Number), f = Math.exp(e.deltaY*0.0015), w = Math.min(base[2]*1.5, Math.max(base[2]/60, VB[2]*f)), k = w/VB[2], c = shPt(sv, e);
  shSetVB(sv, [c[0] - (c[0] - VB[0])*k, c[1] - (c[1] - VB[1])*k, VB[2]*k, VB[3]*k]); }, {passive:false});
document.addEventListener('keydown', e => { if(e.key==='Escape'){ const m = $('#shpm'); if(m && !m.hidden){ e.preventDefault(); e.stopPropagation(); shClose(); } } }, true);
