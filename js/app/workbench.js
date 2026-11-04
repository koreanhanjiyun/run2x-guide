/* ============================================================
   도구 작업창 (공통 틀) — docs/TOOLS-PLAN.md 2.2·2.4절
   - 도구 모음의 줄을 누르면 화면 전체를 쓰는 작업창이 열린다
   - 왼쪽 입력 → 오른쪽 결과 숫자 · 기본 결과 그래프 · 3D 화면 → 아래 신호 선택 그래프
   - 계산 코드는 Web Worker 에서 돌린다(코드 보기에서 고친 코드도 같은 곳에서). 고친 코드는 저장하지 않는다
   - 입력값은 이 브라우저에 기억(localStorage), 공유는 .json 내보내기·가져오기와 [대시보드에 반영]
   - 3D 화면은 three.js(vendor/three)를 작업창을 열 때 불러오고, 조작은 설계 탭 3D와 같은 V3D(js/figures/view3d.js)
   - 차 모델은 REF4 단순화본(img/3d/ref4s.glb). 휠베이스 값으로 두 축 사이만 늘이고 줄임(2D 그림과 같은 규칙)
   - 신호 선택 그래프의 가로축: 기본 축 · 다른 신호(XY) · 입력 훑기(입력 하나를 범위 안에서 바꿔 가며 결과 숫자를 그림)
   도구 정의: WB_TOOLS[id] = { no, stage, name, inputs, outputs, sigs, code, verify, view3d }
   ============================================================ */
const WB_TOOLS = {};
const WB_COL = ['#6A4294','#1d5f9a','#c2410c','#257a47','#9c6c00','#ab2f75','#0b7a55','#5f6973'];
const WB = { id:null, I:{}, R:null, err:'', ms:0, xi:0, sel:new Set(), act:'', code:{}, ret:null, worker:null, wsrc:'', seq:0, wait:{}, t3:null, timer:0,
  xa:'', sw:null, si:0, selO:new Set(), actO:'', cmp:false };   /* cmp: 대시보드 값과 비교해 보기 (기본 끔) */   /* xa: '' 기본 축 · 'sig:키' 신호 · 'in:키' 입력 훑기 */
const wbT = () => WB_TOOLS[WB.id];
const wbEsc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wbFmt = (x, d) => (typeof x==='number' && isFinite(x)) ? x.toLocaleString('ko-KR', {minimumFractionDigits:d, maximumFractionDigits:d}) : '—';
const wbStoreKey = id => 'run2x.wb.' + id;

/* ---------- 대시보드 값 (입력 채우기 · 비교 · 반영) ---------- */
function wbDash(dk){ if(!dk) return null;
  const e = typeof dvEntry==='function' ? dvEntry(dk) : null;
  if(e && typeof e.v==='number' && isFinite(e.v)) return {v:e.v, st:e.st || 'rev'};
  if(typeof DASH!=='undefined' && typeof DASH.P[dk]==='number') return {v:DASH.P[dk], st:'ex'};   /* 아직 아무도 안 넣은 값 = 예시값 */
  return null; }
const wbInName = d => d.n || (d.dk && DK[d.dk] ? DK[d.dk].n : d.k);
const wbInUnit = d => d.u != null ? d.u : (d.dk && DK[d.dk] ? DK[d.dk].u : '');

/* ---------- 계산 (Web Worker) ---------- */
function wbWorker(src){
  if(WB.worker && WB.wsrc===src) return WB.worker;
  if(WB.worker) WB.worker.terminate();
  const body = src + `\n;self.onmessage = e => { const t0 = performance.now();
    try { if(e.data.Is){ const outs = e.data.Is.map(I => { const r = calc(I); return (r && r.out) || {}; }); postMessage({id:e.data.id, ok:true, outs, ms:performance.now()-t0}); return; }
      const r = calc(e.data.I); postMessage({id:e.data.id, ok:true, r, ms:performance.now()-t0}); }
    catch(err){ postMessage({id:e.data.id, ok:false, err:String(err && err.message || err)}); } };`;
  const w = new Worker(URL.createObjectURL(new Blob([body], {type:'text/javascript'})));
  w.onmessage = e => { const f = WB.wait[e.data.id]; if(f){ delete WB.wait[e.data.id]; f(e.data); } };
  w.onerror = e => { e.preventDefault(); const msg = '코드 오류: ' + (e.message || '읽을 수 없는 코드');
    Object.keys(WB.wait).forEach(id => { WB.wait[id]({ok:false, err:msg}); delete WB.wait[id]; }); WB.worker = null; WB.wsrc = ''; };
  WB.worker = w; WB.wsrc = src; return w; }
function wbRun(I, code){ return new Promise(res => {   /* I 가 배열이면 여러 입력을 한 번에(입력 훑기) */
  let w; try{ w = wbWorker(code); }catch(err){ res({ok:false, err:'계산기를 시작하지 못했습니다: ' + err.message}); return; }
  const id = ++WB.seq, to = setTimeout(() => { if(WB.wait[id]){ delete WB.wait[id]; if(WB.worker===w){ w.terminate(); WB.worker = null; WB.wsrc = ''; } res({ok:false, err:'계산이 3초 안에 끝나지 않아 멈췄습니다 (반복문 확인)'}); } }, 3000);
  WB.wait[id] = r => { clearTimeout(to); res(r); };
  w.postMessage(Array.isArray(I) ? {id, Is:I} : {id, I}); }); }
/* 계산에 넘기는 입력: 입력 칸 + 도구가 따로 모으는 값(표 · 드라이버 등, T.extraI) */
const wbInputs = () => ({...WB.I, ...(wbT().extraI ? wbT().extraI() : {})});
/* 도구 모듈이 표 등을 고친 뒤 부름: 다시 계산 */
const wbRefresh = () => { if(WB.id) wbCalcSoon(); };
const wbCode = () => WB.code[WB.id] != null ? WB.code[WB.id] : wbT().code;
async function wbCalc(){ const T = wbT(); if(!T) return;
  const r = await wbRun(wbInputs(), wbCode());
  if(!r.ok){ WB.err = r.err; WB.R = null; }
  else if(!r.r || !r.r.out || (r.r.x && !r.r.sig)){ WB.err = '계산 결과에 out(결과 숫자)이, x(가로축)가 있으면 sig(신호)도 있어야 합니다'; WB.R = null; }
  else { WB.err = ''; WB.R = r.r; WB.ms = r.ms; if(WB.R.x){ const n = WB.R.x.d.length; if(WB.xi >= n) WB.xi = n - 1; } else if(!WB.xa) WB.xa = 'in:' + (T.sweepFirst || T.inputs[0].k); }
  if(T.onResult) T.onResult(WB.R);   /* 도구 모듈이 자기 영역(표 · 그림)을 결과에 맞춰 고침 */
  if(WB.xa.startsWith('in:') && !WB.err && !T.noSig) await wbSweep();
  wbPaint(['out','main','sig','stat']); wb3dUpdate(); }
/* 입력 훑기: 고른 입력 하나를 lo~hi 에서 n 점으로 바꿔 가며 계산, 결과 숫자(out)를 모음. 나머지 입력은 지금 값 */
async function wbSweep(){ const k = WB.xa.slice(3), d = wbT().inputs.find(o => o.k===k); if(!d) return;
  if(!WB.sw || WB.sw.k!==k){ const v = WB.I[k], a = Math.abs(v) > 1e-9 ? Math.abs(v) : 1;   /* 범위: 도구가 정한 sw, 없으면 지금 값 ±50 % */
    WB.sw = d.sw ? {k, lo:d.sw[0], hi:d.sw[1], n:41} : {k, lo:+(v - a*.5).toPrecision(4), hi:+(v + a*.5).toPrecision(4), n:41}; }
  const S = WB.sw, n = Math.max(3, Math.min(201, Math.round(S.n))), X = Array.from({length:n}, (_, i) => S.lo + (S.hi - S.lo)*i/(n - 1));
  const base = wbInputs(), r = await wbRun(X.map(x => ({...base, [k]:x})), wbCode());
  if(!r.ok){ S.X = null; S.err = r.err; return; } S.err = ''; S.X = X; S.O = {}; wbT().outputs.forEach(o => { S.O[o.k] = r.outs.map(t => t[o.k]); });
  if(WB.si >= n) WB.si = n - 1; if(!WB.selO.size) wbT().outputs.slice(0, 2).forEach(o => WB.selO.add(o.k)); }
const wbCalcSoon = () => { clearTimeout(WB.timer); WB.timer = setTimeout(wbCalc, 120); };

/* ---------- 그래프 (SVG) ---------- */
function wbTicks(lo, hi, n){ if(!(hi > lo)){ hi = lo + 1; }
  const raw = (hi - lo)/n, p = Math.pow(10, Math.floor(Math.log10(raw))), s = [1,2,2.5,5,10].map(k => k*p).find(k => k >= raw) || 10*p;
  const a = Math.floor(lo/s)*s, b = Math.ceil(hi/s)*s, t = []; for(let x = a; x <= b + s*1e-9; x += s) t.push(+x.toPrecision(12)); return {lo:a, hi:b, t}; }
/* o: {w, h, x:{d,n,u}, ys:[{k,d,c,n,u}], norm, act, xi} — norm: 신호마다 자기 범위로(신호 선택 그래프) */
function wbPlot(o){ const W = o.w, H = o.h, L = 58, R = 14, T = 28, B = 38, pw = W-L-R, ph = H-T-B, xd = o.x.d;
  const xf = xd.filter(isFinite), xr = wbTicks(Math.min(...xf), Math.max(...xf), 8), X = x => L + (x - xr.lo)/(xr.hi - xr.lo)*pw;
  const rng = ys => { let lo = Infinity, hi = -Infinity; ys.forEach(y => y.d.forEach(v => { if(isFinite(v)){ lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
    if(!isFinite(lo)){ lo = 0; hi = 1; } if(!o.norm){ lo = Math.min(lo, 0); } if(hi - lo < 1e-9){ hi = lo + Math.max(1, Math.abs(lo)*.1); } return wbTicks(lo, hi, 5); };
  const share = !o.norm ? rng(o.ys) : null, yr = y => share || rng([y]);
  const axisY = o.norm ? (o.ys.find(y => y.k===o.act) || o.ys[0]) : null, ay = axisY ? yr(axisY) : share;
  const Y = (v, r) => T + ph - (v - r.lo)/(r.hi - r.lo)*ph;
  let s = `<svg class="wb-plot" data-wbp="${o.id || ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${wbEsc(o.label || '그래프')}">`;
  xr.t.forEach(t => { s += `<line x1="${X(t)}" y1="${T}" x2="${X(t)}" y2="${T+ph}" class="wb-grid"/><text x="${X(t)}" y="${T+ph+16}" class="wb-tx" text-anchor="middle">${wbFmt(t, Math.abs(xr.t[1]-xr.t[0]) < 1 ? 2 : 0)}</text>`; });
  if(ay) ay.t.forEach(t => { const y = Y(t, ay); s += `<line x1="${L}" y1="${y}" x2="${L+pw}" y2="${y}" class="wb-grid"/><text x="${L-6}" y="${y+4}" class="wb-tx" text-anchor="end"${axisY?` fill="${axisY.c}"`:''}>${wbFmt(t, Math.abs(ay.t[1]-ay.t[0]) < 1 ? 2 : 0)}</text>`; });
  s += `<text x="${L+pw}" y="${H-4}" class="wb-tl" text-anchor="end">${wbEsc(o.x.n)}${o.x.u?` [${wbEsc(o.x.u)}]`:''}</text>`;
  if(ay){ const u = axisY ? axisY.u : (o.ys[0] && o.ys[0].u); s += `<text x="${L}" y="14" class="wb-tl"${axisY?` fill="${axisY.c}"`:''}>${axisY ? wbEsc(axisY.n) + ' ' : ''}${u?`[${wbEsc(u)}]`:''}</text>`; }
  s += `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="wb-frame"/>`;
  o.ys.forEach(y => { const r = yr(y); s += `<polyline fill="none" stroke="${y.c}" stroke-width="${o.act===y.k?2.4:1.8}" vector-effect="non-scaling-stroke" points="${y.d.map((v, i) => isFinite(v) ? `${X(xd[i]).toFixed(1)},${Y(v, r).toFixed(1)}` : '').join(' ')}"/>`; });
  if(o.xi != null && isFinite(xd[o.xi])){ const cx = X(xd[o.xi]); s += `<line x1="${cx}" y1="${T}" x2="${cx}" y2="${T+ph}" class="wb-cur"/>`;
    o.ys.forEach(y => { const v = y.d[o.xi]; if(isFinite(v)) s += `<circle cx="${cx}" cy="${Y(v, yr(y))}" r="3.2" fill="${y.c}" stroke="#fff" stroke-width="1"/>`; }); }
  return s + `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="wb-hit" data-wbl="${L}" data-wbw="${pw}" data-wbx0="${xr.lo}" data-wbx1="${xr.hi}"/></svg>`; }
const wbSigDef = k => (wbT().sigs || []).find(s => s.k===k) || {k, n:k, u:''};
const wbColor = k => WB_COL[(wbT().sigs || []).findIndex(s => s.k===k) % WB_COL.length] || WB_COL[0];

/* ---------- 화면 ---------- */
function wbEl(){ let m = $('#wb'); if(!m){ m = document.createElement('div'); m.id = 'wb'; m.hidden = true;
    m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','wb-t'); document.body.appendChild(m); } return m; }
function wbShellHTML(){ const T = wbT();
  return `<div class="wb-bar">
      <button type="button" class="btn small" data-wbx>← 도구 모음</button>
      <span class="wb-no">${wbEsc(T.no)}</span><span class="wb-stage">${wbEsc(T.stage)}</span><b id="wb-t">${wbEsc(T.name)}</b>
      <span class="wb-code-on" id="wbcodeon" hidden>코드 고침 (저장 안 됨)</span>
      <span class="wb-acts">
        <button type="button" class="btn small" data-wbver>검증표</button>
        <button type="button" class="btn small" data-wbcode>코드 보기</button>
        <button type="button" class="btn small" data-wbexp>내보내기 .json</button>
        <button type="button" class="btn small" data-wbimp>가져오기 .json</button>
        <button type="button" class="btn small pri" data-wbput>대시보드에 반영</button>
        <button type="button" class="wb-close" data-wbx aria-label="작업창 닫기">×</button>
      </span><input type="file" accept=".json,application/json" id="wbfile" hidden></div>
    <div class="wb-main">
      <aside class="wb-in" aria-label="입력"><div class="wb-h"><h3>입력</h3><button type="button" class="btn small" data-wbfill>대시보드 값으로 채우기</button></div><div id="wbin"></div></aside>
      <div class="wb-right">
        ${T.extHTML ? '<div id="wbext"></div>' : ''}
        <section class="wb-sec" aria-label="결과"><div class="wb-h"><h3>결과</h3><span class="wb-stat" id="wbstat"></span><button type="button" class="btn small wb-cmp" data-wbcmp aria-pressed="false">대시보드와 비교</button></div><div id="wbout"></div></section>
        <div class="wb-two${T.view3d ? '' : ' one'}">
          <section class="wb-sec" aria-label="기본 결과 그래프"><div class="wb-h"><h3>${T.mainTitle || '결과 그래프'}</h3><span class="wb-meta">${T.mainMeta || '그래프를 누르거나 끌면 커서 · ←/→ 한 칸씩'}</span></div><div id="wbmain" class="wb-plotbox" tabindex="0"></div></section>
          ${T.view3d ? `<section class="wb-sec" aria-label="3D 화면"><div class="wb-h"><h3>3D 화면</h3><span class="wb-meta">${V3D.HELP}</span></div>
            <div class="wb-3dbox"><div class="wb-3dv"><div id="wb3d" class="wb-3d"><p class="wb-empty">불러오는 중…</p></div><div class="wb-3dui">${V3D.viewBtns('iso')}</div></div><p class="wb-3dn" id="wb3dn">${T.view3dNote || ''}</p></div></section>` : ''}
        </div>
        ${T.noSig ? '' : `<section class="wb-sec" aria-label="신호 선택 그래프"><div class="wb-h"><h3>신호 선택 그래프</h3><span class="wb-meta">신호마다 자기 눈금 · 이름을 누르면 그 신호의 눈금 · 그래프를 누르거나 끌면 커서</span></div>
          <div class="wb-sig"><div class="wb-sl" id="wbsl"></div><div id="wbsig" class="wb-plotbox" tabindex="0"></div></div></section>`}
      </div></div>`; }
function wbInHTML(){ const T = wbT(); let g0 = '';
  return T.inputs.map(d => { const db = wbDash(d.dk), v = WB.I[d.k], diff = WB.cmp && db && isFinite(v) && Math.abs(v - db.v) > 1e-9*Math.max(1, Math.abs(db.v));
    const grp = d.g && d.g!==g0 ? `<div class="wb-ig">${wbEsc(d.g)}</div>` : ''; g0 = d.g || g0;
    const nm = d.dk ? `<span class="term" data-dk="${d.dk}" tabindex="0" role="button" aria-haspopup="dialog">${wbInName(d)}</span>` : wbInName(d);
    return grp + `<label class="wb-ir${diff?' diff':''}"><span class="wb-in-n">${nm}</span><input type="number" step="any" data-wbi="${d.k}" value="${isFinite(v)?v:''}"><span class="wb-u">${wbEsc(wbInUnit(d))}</span>
      ${!WB.cmp ? '' : d.dk ? `<span class="wb-db">${db ? `대시보드 ${wbFmt(db.v, d.d != null ? d.d : 2)}${db.st==='ex'?' (예시값)':''}` : '대시보드 값 없음'}</span>` : '<span class="wb-db">이 도구에서만 쓰는 값</span>'}</label>`; }).join(''); }
/* 결과: 도구가 정한 묶음(outputs[].g)마다 카드. 값과 단위는 붙여 쓰고, 대시보드 키가 있으면 대시보드 값을 아래 작게(다르면 노랑).
   묶음에 grid:2 를 주면 두 칸 배치(코너웨이트처럼) */
function wbOutHTML(){ const T = wbT(), R = WB.R;
  if(WB.err) return `<p class="wb-err" role="alert">${wbEsc(WB.err)}</p>`;
  if(!R) return '<p class="wb-empty">계산 중…</p>';
  const groups = []; T.outputs.forEach(d => { const g = d.g || '결과'; let G = groups.find(x => x.n===g); if(!G){ G = {n:g, ds:[]}; groups.push(G); } G.ds.push(d); });
  const row = d => { const v = R.out ? R.out[d.k] : undefined, db = wbDash(d.dk), u = d.u != null ? d.u : (d.dk ? DK[d.dk].u : ''), dd = d.d||0;
    const diff = WB.cmp && d.dk && db && isFinite(v) && Math.abs(v - db.v) > Math.pow(10, -dd)/2;
    const nm = d.dk ? `<span class="term" data-dk="${d.dk}" tabindex="0" role="button" aria-haspopup="dialog">${d.n || DK[d.dk].n}</span>` : wbEsc(d.n);
    return `<div class="wb-or${diff?' diff':''}"><span class="wb-on">${nm}</span><span class="wb-ov"><b>${wbFmt(v, dd)}</b>${u ? ` <i>${wbEsc(u)}</i>` : ''}</span>
      ${WB.cmp && d.dk ? `<span class="wb-odb">${db ? `대시보드 ${wbFmt(db.v, dd)}${db.st==='ex' ? ' (예시값)' : ''}` : '대시보드 값 없음'}</span>` : ''}</div>`; };
  return `<div class="wb-og">${groups.map(G => { const gd = (T.outGroups || {})[G.n] || {};
    return `<div class="wb-oc${gd.grid ? ' grid' : ''}"><h4>${wbEsc(G.n)}${gd.note ? `<span>${wbEsc(gd.note)}</span>` : ''}</h4><div class="wb-ol">${G.ds.map(row).join('')}</div></div>`; }).join('')}</div>`; }
function wbXDef(){ const T = wbT(); return {n: (T.x && T.x.n) || 'x', u: (T.x && T.x.u) || ''}; }
function wbMainHTML(){ const R = WB.R; if(!R) return '';
  if(!R.x) return wbT().figure ? wbT().figure(wbInputs(), R) : '';
  const ys = (R.main || []).filter(k => R.sig[k]).map(k => ({k, d:R.sig[k], c:wbColor(k), n:wbSigDef(k).n, u:wbSigDef(k).u}));
  return wbPlot({id:'main', w:640, h:300, x:{d:R.x.d, ...wbXDef()}, ys, xi:WB.xi, label:'결과 그래프'})
    + `<div class="wb-leg"><span class="wb-legx">${wbEsc(wbXDef().n)} <b>${wbFmt(R.x.d[WB.xi], 1)}</b> ${wbEsc(wbXDef().u)}</span>${ys.map(y => `<span><i style="background:${y.c}"></i>${wbEsc(y.n)} <b>${wbFmt(y.d[WB.xi], wbSigDef(y.k).d||0)}</b> ${wbEsc(y.u)}</span>`).join('')}</div>`; }
/* 신호 선택 그래프: 가로축 고르기 → 기본 축 · 신호(XY) · 입력 훑기 */
const wbOutDef = k => wbT().outputs.find(o => o.k===k);
const wbOutName = d => d.n || (d.dk && DK[d.dk] ? DK[d.dk].n : d.k);
const wbOutUnit = d => d.u != null ? d.u : (d.dk && DK[d.dk] ? DK[d.dk].u : '');
const wbOutColor = k => WB_COL[(wbT().outputs.findIndex(o => o.k===k) + 3) % WB_COL.length];
function wbAxisHTML(){ const T = wbT(), R = WB.R, sw = WB.xa.startsWith('in:') ? WB.sw : null;
  const opt = (v, t) => `<option value="${v}"${WB.xa===v?' selected':''}>${t}</option>`;
  return `<div class="wb-ax"><label>가로축 <select data-wbxa>${R && R.x ? opt('', wbEsc(wbXDef().n) + ' (기본)') + `
      <optgroup label="신호 (XY)">${(T.sigs || []).filter(d => R.sig[d.k]).map(d => opt('sig:' + d.k, wbEsc(d.n))).join('')}</optgroup>` : ''}
      <optgroup label="입력 훑기">${T.inputs.map(d => opt('in:' + d.k, wbInName(d).replace(/<[^>]+>/g, ''))).join('')}</optgroup></select></label>
    ${sw ? `<div class="wb-swr"><input type="number" step="any" data-wbsw="lo" value="${sw.lo}" aria-label="훑기 시작값"><span>~</span><input type="number" step="any" data-wbsw="hi" value="${sw.hi}" aria-label="훑기 끝값"><span class="wb-u">${wbEsc(wbInUnit(T.inputs.find(d => d.k===sw.k)))}</span><input type="number" step="1" min="3" max="201" data-wbsw="n" value="${sw.n}" aria-label="점 수"><span class="wb-u">점</span></div>` : ''}</div>`; }
function wbSigListHTML(){ const R = WB.R; if(!R) return '';
  if(WB.xa.startsWith('in:')){ const S = WB.sw; if(!S || !S.X) return wbAxisHTML() + (S && S.err ? `<p class="wb-err">${wbEsc(S.err)}</p>` : '');
    const d = wbT().inputs.find(o => o.k===S.k);
    return wbAxisHTML() + `<div class="wb-slh"><span>${wbInName(d)}</span><b>${wbFmt(S.X[WB.si], 3)} ${wbEsc(wbInUnit(d))}</b></div>` + wbT().outputs.map(o => `<div class="wb-sr${WB.actO===o.k?' act':''}">
      <input type="checkbox" data-wbso="${o.k}"${WB.selO.has(o.k)?' checked':''} aria-label="${wbEsc(wbOutName(o))} 그리기"><i style="background:${wbOutColor(o.k)}"></i>
      <button type="button" class="wb-sn" data-wbacto="${o.k}" title="이 결과의 눈금 보기">${wbOutName(o)}</button><b>${wbFmt(S.O[o.k][WB.si], o.d||0)}</b><span class="wb-u">${wbEsc(wbOutUnit(o))}</span></div>`).join('')
      + `<p class="wb-swn">결과 숫자를 ${S.X.length}번 다시 계산해 그린 것입니다. 나머지 입력은 지금 값 그대로입니다.</p>`; }
  const xs = WB.xa.startsWith('sig:') ? wbSigDef(WB.xa.slice(4)) : null, xv = xs ? R.sig[xs.k][WB.xi] : R.x.d[WB.xi];
  return wbAxisHTML() + `<div class="wb-slh"><span>${wbEsc(xs ? xs.n : wbXDef().n)}</span><b>${wbFmt(xv, xs ? (xs.d||0) : 1)} ${wbEsc(xs ? xs.u : wbXDef().u)}</b></div>` + (wbT().sigs || []).filter(s => R.sig[s.k]).map(s => `<div class="wb-sr${WB.act===s.k?' act':''}">
      <input type="checkbox" data-wbsg="${s.k}"${WB.sel.has(s.k)?' checked':''} aria-label="${wbEsc(s.n)} 그리기"><i style="background:${wbColor(s.k)}"></i>
      <button type="button" class="wb-sn" data-wbact="${s.k}" title="이 신호의 눈금 보기">${wbEsc(s.n)}</button><b>${wbFmt(R.sig[s.k][WB.xi], s.d||0)}</b><span class="wb-u">${wbEsc(s.u)}</span></div>`).join(''); }
function wbSigHTML(){ const R = WB.R; if(!R) return '';
  if(WB.xa.startsWith('in:')){ const S = WB.sw; if(!S || !S.X) return '<p class="wb-empty">계산 중…</p>';
    const d = wbT().inputs.find(o => o.k===S.k), ys = [...WB.selO].map(k => wbOutDef(k)).filter(Boolean).map(o => ({k:o.k, d:S.O[o.k], c:wbOutColor(o.k), n:wbOutName(o).replace(/<[^>]+>/g, ''), u:wbOutUnit(o)}));
    if(!ys.length) return '<p class="wb-empty">왼쪽에서 그릴 결과를 고르십시오.</p>';
    if(!ys.some(y => y.k===WB.actO)) WB.actO = ys[0].k;
    return wbPlot({id:'sig', w:1100, h:290, x:{d:S.X, n:wbInName(d).replace(/<[^>]+>/g, ''), u:wbInUnit(d)}, ys, norm:true, act:WB.actO, xi:WB.si, label:'입력 훑기 그래프'}); }
  const ys = [...WB.sel].filter(k => R.sig[k]).map(k => ({k, d:R.sig[k], c:wbColor(k), n:wbSigDef(k).n, u:wbSigDef(k).u}));
  if(!ys.length) return '<p class="wb-empty">왼쪽에서 그릴 신호를 고르십시오.</p>';
  if(!ys.some(y => y.k===WB.act)) WB.act = ys[0].k;
  const xs = WB.xa.startsWith('sig:') ? wbSigDef(WB.xa.slice(4)) : null;
  return wbPlot({id:'sig', w:1100, h:290, x: xs ? {d:R.sig[xs.k], n:xs.n, u:xs.u} : {d:R.x.d, ...wbXDef()}, ys, norm:true, act:WB.act, xi:WB.xi, label:'신호 선택 그래프'}); }
function wbPaint(which){ const all = !which, m = $('#wb'); if(!m || m.hidden) return;
  if(all || which.includes('in')) $('#wbin').innerHTML = wbInHTML();
  if(all || which.includes('out')) $('#wbout').innerHTML = wbOutHTML();
  if(all || which.includes('main')){ $('#wbmain').innerHTML = wbMainHTML(); }
  if((all || which.includes('ext')) && $('#wbext')) $('#wbext').innerHTML = wbT().extHTML();
  if((all || which.includes('sig')) && $('#wbsl')){ $('#wbsl').innerHTML = wbSigListHTML(); $('#wbsig').innerHTML = wbSigHTML(); }
  if(all || which.includes('stat')){ $('#wbstat').textContent = WB.err ? '' : (WB.R ? `계산 ${WB.ms < 1 ? '1 ms 미만' : Math.round(WB.ms) + ' ms'} · Web Worker` : ''); const c = $('#wbcodeon'); if(c) c.hidden = WB.code[WB.id] == null; } }

/* ---------- 열기 · 닫기 · 입력 기억 ---------- */
function wbLoad(id){ const T = WB_TOOLS[id], I = {}; let saved = {};
  try{ saved = JSON.parse(localStorage.getItem(wbStoreKey(id)) || '{}') || {}; }catch(e){ saved = {}; }
  T.inputs.forEach(d => { const s = saved[d.k], db = wbDash(d.dk); I[d.k] = typeof s==='number' && isFinite(s) ? s : (db ? db.v : d.v); });
  return I; }
function wbSave(){ try{ localStorage.setItem(wbStoreKey(WB.id), JSON.stringify(WB.I)); }catch(e){} }
function wbOpen(id, ret){ if(!WB_TOOLS[id]) return; const T = WB_TOOLS[id];
  WB.id = id; WB.ret = ret || null; WB.I = wbLoad(id); WB.R = null; WB.err = ''; WB.xi = 0;
  WB.sel = new Set(T.sigOn || (T.sigs || []).slice(0, 3).map(s => s.k)); WB.act = [...WB.sel][0] || ''; WB.xa = ''; WB.sw = null; WB.si = 0; WB.selO = new Set(); WB.actO = '';
  const m = wbEl(); m.innerHTML = wbShellHTML(); m.hidden = false; document.documentElement.classList.add('wb-lock');
  wbPaint(); wbCalc().then(() => { if(WB.R && WB.R.x && T.xiStart === 'end') { WB.xi = WB.R.x.d.length - 1; wbPaint(['main','sig']); wb3dUpdate(); } });
  wb3dOpen(); const f = m.querySelector('[data-wbx]'); if(f) f.focus(); }
function wbClose(){ const m = $('#wb'); if(!m || m.hidden) return; wb3dClose(); m.hidden = true; m.innerHTML = '';
  document.documentElement.classList.remove('wb-lock'); if(WB.worker){ WB.worker.terminate(); WB.worker = null; WB.wsrc = ''; }
  if(WB.ret && WB.ret.isConnected) WB.ret.focus(); WB.id = null; }

/* ---------- 작은 창 (검증표 · 코드 보기 · 대시보드에 반영) ---------- */
function wbModal(html, cls){ let m = $('#wbm'); if(!m){ m = document.createElement('div'); m.id = 'wbm'; m.className = 'dv-modal wb-modal'; document.body.appendChild(m); }
  m.innerHTML = `<div class="dvm-box ${cls||''}" role="dialog" aria-modal="true" aria-labelledby="wbm-t">${html}</div>`; m.hidden = false;
  const f = m.querySelector('textarea, input, button:not(.dvi-x)') || m.querySelector('button'); if(f) f.focus(); return m; }
function wbModalClose(){ const m = $('#wbm'); if(m && !m.hidden){ m.hidden = true; m.innerHTML = ''; return true; } return false; }
const wbMHead = t => `<div class="dvi-h"><b id="wbm-t">${t}</b><button type="button" class="dvi-x" data-wbmx aria-label="닫기">×</button></div>`;
/* 검증표: 손계산·문헌값과 지금 코드의 결과를 나란히 */
async function wbVerify(){ const T = wbT(), code = wbCode(); wbModal(wbMHead('검증표') + '<div class="dvi-body"><p class="wb-empty">계산 중…</p></div>', 'wb-wide');
  const rows = []; let pass = 0, n = 0;
  for(const c of (T.verify || [])){ const I = {...T.inputs.reduce((o, d) => (o[d.k] = d.v, o), {}), ...(T.verifyBase || {}), ...c.I}, r = await wbRun(I, code);
    Object.entries(c.expect).forEach(([k, ex]) => { const d = T.outputs.find(o => o.k===k) || {n:k, u:'', d:3}, got = r.ok && r.r.out ? r.r.out[k] : NaN;
      const tol = c.tol != null ? c.tol : 0.001, ok = isFinite(got) && Math.abs(got - ex) <= tol*Math.max(1, Math.abs(ex)); n++; if(ok) pass++;
      rows.push(`<tr class="${ok?'ok':'ng'}"><td>${wbEsc(c.n)}</td><td>${d.dk && DK[d.dk] ? DK[d.dk].n : wbEsc(d.n)}</td><td>${wbFmt(ex, (d.d||0)+1)}</td><td>${r.ok ? wbFmt(got, (d.d||0)+1) : '<span class="wb-err">' + wbEsc(r.err) + '</span>'}</td><td>${wbEsc(d.u || (d.dk && DK[d.dk] ? DK[d.dk].u : ''))}</td><td>${ok?'통과':'<b>다름</b>'}</td><td class="muted">${wbEsc(c.src||'')}</td></tr>`); }); }
  const m = $('#wbm'); if(!m || m.hidden) return;
  m.querySelector('.dvm-box').innerHTML = wbMHead('검증표') + `<div class="dvi-body"><table class="dvi-t wb-vt"><thead><tr><th>경우</th><th>항목</th><th>기대값</th><th>계산값</th><th>단위</th><th>판정</th><th>기대값 근거</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <div class="dvi-foot"><span class="muted">${pass} / ${n} 통과 · 허용 오차 상대 0.1 %${WB.code[WB.id]!=null ? ' · 고친 코드로 계산' : ''}</span><span class="dvi-btns"><button type="button" class="btn small" data-wbmx>닫기</button></span></div>`; }
/* 코드 보기: 고친 코드는 이 창을 닫아도 작업창이 열려 있는 동안만 쓰이고, 다시 열면 원래 코드 */
function wbCodeOpen(){ wbModal(wbMHead('코드 보기 · 고치기') + `<p class="wb-cnote muted">입력 <code>I</code>(왼쪽 입력 칸의 키)를 받아 <code>out</code>(결과 숫자) · <code>x</code>(가로축) · <code>sig</code>(신호) · <code>main</code>(결과 그래프에 그릴 신호)를 돌려주는 <code>calc(I)</code> 함수입니다. 고친 코드는 저장되지 않으며, 작업창을 다시 열면 원래 코드로 돌아갑니다. 계산은 페이지와 떨어진 Web Worker에서 돌아갑니다.</p>
    <div class="dvi-body"><textarea class="wb-ta" spellcheck="false" aria-label="계산 코드">${wbEsc(wbCode())}</textarea></div>
    <div class="dvi-foot"><span class="wb-cmsg muted" id="wbcmsg"></span><span class="dvi-btns"><button type="button" class="btn small" data-wbcreset>원래 코드로</button><button type="button" class="btn small" data-wbmx>닫기</button><button type="button" class="btn small pri" data-wbcrun>이 코드로 계산</button></span></div>`, 'wb-wide wb-codebox'); }
/* 대시보드에 반영: 대시보드 키가 있는 결과만. 담당이 아닌 값은 고를 수 없음. 반영한 값은 '계산값', 출처 = 도구 이름 */
function wbPutOpen(){ const T = wbT(), R = WB.R; if(!R){ toast('계산 결과가 없습니다.'); return; }
  const ks = T.outputs.filter(d => d.dk && R.out && isFinite(R.out[d.k]));
  wbModal(wbMHead('대시보드에 반영') + (ks.length ? `<div class="dvi-body"><table class="dvi-t"><thead><tr><th></th><th>항목</th><th>대시보드 지금</th><th>계산값</th></tr></thead><tbody>${ks.map(d => { const db = wbDash(d.dk), ok = canEditDv(d.dk), v = +R.out[d.k].toFixed(d.d||0);
      return `<tr><td><input type="checkbox" data-wbpk="${d.k}"${ok?' checked':' disabled'} aria-label="${DK[d.dk].n}"></td><td>${DK[d.dk].n}${ok?'':' <span class="muted">(담당 아님)</span>'}</td><td>${db ? wbFmt(db.v, d.d||0) + (db.st==='ex'?' <span class="muted">예시값</span>':'') : '—'}</td><td><b>${wbFmt(v, d.d||0)}</b> ${wbEsc(DK[d.dk].u)}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="dvi-foot"><span class="muted">반영한 값은 ${typeof dvSeason==='function' ? dvSeason() : ''} 시즌에 '계산값', 출처 '${wbEsc(T.name)}'로 들어갑니다.</span><span class="dvi-btns"><button type="button" class="btn small" data-wbmx>취소</button><button type="button" class="btn small pri" data-wbpgo>반영</button></span></div>`
    : `<div class="dvi-body"><p class="muted">이 도구에는 대시보드로 보낼 결과가 없습니다.</p></div><div class="dvi-foot"><span></span><button type="button" class="btn small" data-wbmx>닫기</button></div>`)); }
async function wbPutGo(){ const T = wbT(), R = WB.R, m = $('#wbm'); let n = 0;
  for(const cb of m.querySelectorAll('[data-wbpk]:checked')){ const d = T.outputs.find(o => o.k===cb.dataset.wbpk);
    if(await dvSave(d.dk, {v: +R.out[d.k].toFixed(d.d||0), st:'calc', src:T.name})) n++; }
  wbModalClose(); toast(`${n}개 값을 대시보드에 반영했습니다.`); wbPaint(['in','out']); }
/* .json 내보내기 · 가져오기 (사이트 양식) */
function wbExport(){ const T = wbT(), doc = {format:'run2x-tool', tool:WB.id, name:T.name, ver:1, season:typeof dvSeason==='function' ? dvSeason() : '', at:new Date().toISOString(), inputs:{...WB.I}};
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], {type:'application/json'}));
  a.download = `run2x_${WB.id}_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0); }
function wbImport(file){ const fr = new FileReader(); fr.onload = () => { let d;
    try{ d = JSON.parse(fr.result); }catch(e){ toast('.json 파일을 읽지 못했습니다.'); return; }
    if(!d || d.format!=='run2x-tool' || !d.inputs){ toast('이 사이트에서 내보낸 도구 파일이 아닙니다.'); return; }
    if(d.tool!==WB.id){ toast(`다른 도구(${wbEsc(d.name || d.tool)})의 파일입니다.`); return; }
    let n = 0; wbT().inputs.forEach(x => { const v = d.inputs[x.k]; if(typeof v==='number' && isFinite(v)){ WB.I[x.k] = v; n++; } });
    wbSave(); wbPaint(['in']); wbCalc(); toast(`입력 ${n}개를 가져왔습니다${d.at ? ' (' + d.at.slice(0,10) + ' 저장본)' : ''}.`); };
  fr.readAsText(file); }

/* ---------- 3D 화면 (three.js, 처음 열 때 불러옴) ---------- */
/* REF4 단순화 모델: 이름이 frame · body 인 메시는 점마다 늘리고, 나머지는 덩어리째 옮김
   x(뒤 차축 = 0, 앞 차축 = 1.5997 m) → 오버행은 그대로, 두 축 사이만 휠베이스 L 에 맞춤 */
const WB_LREF = 1.59965;
const wbMapX = (x, L) => x <= 0 ? x : x >= WB_LREF ? x + (L - WB_LREF) : x*L/WB_LREF;
function wbCar(T, sc){ const g = new T.Group(); sc.add(g); const parts = []; let L = WB_LREF, ready = null;
  const mat = c => new T.MeshStandardMaterial({color:c, roughness:.75, metalness:.05});
  /* 드라이버: 2D 측면도와 같은 자세(시트에 기대 누운 상체, 고개는 앞으로). 좌표 mm, 뒤 차축 기준 */
  const drv = new T.Group(), dm = mat(0x4a4f5c), seg = (a, b, r, z) => { const A = new T.Vector3(a[0]/1000, a[1]/1000, z), B = new T.Vector3(b[0]/1000, b[1]/1000, z), d = B.clone().sub(A);
    const m = new T.Mesh(new T.CapsuleGeometry(r/1000, Math.max(0.001, d.length()), 6, 14), dm); m.position.copy(A.clone().add(B).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); drv.add(m); };
  seg([1010, 230], [800, 560], 125, 0); seg([790, 600], [760, 700], 55, 0);
  [-1, 1].forEach(sd => { seg([815, 570], [1020, 455], 45, .19*sd); seg([1020, 455], [1225, 500], 40, .17*sd); seg([1010, 230], [1480, 390], 75, .11*sd); seg([1480, 390], [1960, 300], 55, .10*sd); });
  const helm = new T.Mesh(new T.SphereGeometry(.135, 28, 20), mat(0x6A4294)); helm.position.set(.735, .795, 0); drv.add(helm);
  g.add(drv); parts.push({o:drv, cx:.9});
  function place(){ parts.forEach(p => { if(p.x0){ const a = p.o.geometry.attributes.position; for(let i = 0; i < a.count; i++) a.setX(i, wbMapX(p.x0[i], L)); a.needsUpdate = true; p.o.geometry.computeBoundingSphere(); }
    else p.o.position.x = wbMapX(p.cx, L) - p.cx; }); }
  ready = V3D.gltf().then(() => new Promise((ok, no) => wbGltf(V3D.asset('img/3d/ref4s.glb'), gl => {
    gl.scene.updateMatrixWorld(true);
    gl.scene.traverse(o => { if(!o.isMesh) return; const nm = (o.name || '').replace(/_\d+$/, '');
      o.material = mat(o.material.color ? o.material.color.getHex() : 0x999999);
      if(/^body/.test(nm)){ o.material.transparent = true; o.material.opacity = .32; o.material.depthWrite = false; o.material.side = T.DoubleSide; o.renderOrder = 2; }
      if(/^(fwing|rwing|cockpit)/.test(nm)) o.material.side = T.DoubleSide;
      o.geometry.applyMatrix4(o.matrixWorld); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix();
      o.geometry.computeVertexNormals(); o.geometry.computeBoundingBox();
      if(/^wheel_/.test(nm)){ /* 타이어 · 휠은 단순화하면 모양이 깨져서, 같은 자리 · 크기의 회전체로 바꿈 */
        const bb0 = o.geometry.boundingBox, c = new T.Vector3(), sz = new T.Vector3(); bb0.getCenter(c); bb0.getSize(sz);
        const R = sz.y/2, W = sz.z, ri = .168, pr = [];
        if(/_tire/.test(nm)){ const e = W*.16; [[ri, -W/2], [R - e, -W/2], [R - e*.3, -W/2 + e*.3], [R, -W/2 + e], [R, W/2 - e], [R - e*.3, W/2 - e*.3], [R - e, W/2], [ri, W/2]].forEach(([r, y]) => pr.push(new T.Vector2(r, y))); o.geometry.dispose(); o.geometry = new T.LatheGeometry(pr, 48); }
        else { o.geometry.dispose(); o.geometry = new T.CylinderGeometry(ri, ri, W*.8, 40); }
        o.geometry.rotateX(Math.PI/2); o.geometry.translate(c.x, c.y, c.z); o.geometry.computeBoundingBox(); o.material.side = T.DoubleSide; }
      const bb = o.geometry.boundingBox; if(/^(frame|body)/.test(nm)){ const a = o.geometry.attributes.position; parts.push({o, x0:Float32Array.from({length:a.count}, (_, i) => a.getX(i))}); }
      else parts.push({o, cx:(bb.min.x + bb.max.x)/2}); });
    const ms = []; gl.scene.traverse(o => { if(o.isMesh) ms.push(o); }); ms.forEach(m => g.add(m)); place(); ok(); }, undefined, no)));
  return { g, ready, helmet:helm, setL(v){ if(Math.abs(v - L) < 1e-6) return; L = v; place(); }, get L(){ return L; } }; }
/* GLB 읽기: 파일 주소는 load, 페이지 안에 넣은 data: 주소는 직접 풀어서 parse (아티팩트 화면은 data: 내려받기를 막음) */
function wbGltf(url, ok, _p, no){ const ld = new THREE.GLTFLoader();
  if(!url.startsWith('data:')){ ld.load(url, ok, undefined, no); return; }
  try{ const b = atob(url.slice(url.indexOf(',') + 1)), u = new Uint8Array(b.length); for(let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); ld.parse(u.buffer, '', ok, no); }catch(e){ no(e); } }
/* 화살표(항상 보이게) */
function wbArrow(T, sc, color){ const a = new T.ArrowHelper(new T.Vector3(0, 1, 0), new T.Vector3(), 1, color, .12, .07);
  [a.line, a.cone].forEach(o => { o.material.depthTest = false; o.material.transparent = true; o.renderOrder = 25; }); sc.add(a);
  return (from, dir, len) => { len = Math.max(.02, len); a.position.copy(from); a.setDirection(dir.clone().normalize()); a.setLength(len, Math.min(.12, len*.4), Math.min(.07, len*.25)); a.visible = len > .021; }; }
function wb3dOpen(){ const T = wbT(), box = $('#wb3d'); if(!box) return;
  if(!T.view3d){ box.innerHTML = '<p class="wb-empty">이 도구에는 3D 화면이 없습니다.</p>'; return; }
  const id = WB.id;
  V3D.three().then(() => { if(WB.id!==id || !$('#wb3d')) return;
    let rd; try{ rd = new THREE.WebGLRenderer({antialias:true}); }catch(e){ box.innerHTML = '<p class="wb-empty">이 브라우저에서 3D(WebGL)를 쓸 수 없습니다.</p>'; return; }
    box.innerHTML = ''; rd.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); box.appendChild(rd.domElement);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0xf8f7fb);
    sc.add(new THREE.HemisphereLight(0xffffff, 0xb8b2c8, 0.85)); const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(3, 5, 2); sc.add(dl);
    const grid = new THREE.GridHelper(10, 40, 0xc4bfd2, 0xe2dfea); sc.add(grid);
    const orb = V3D.orbit(THREE, rd, {target:new THREE.Vector3(.8, .35, 0), r:5.6, half:1.45});
    const S = WB.t3 = {rd, sc, orb, box, grid};
    S.render = () => rd.render(sc, orb.cam());
    S.off = V3D.controls(rd.domElement, { rot:(dx, dy) => { orb.rot(dx, dy); wb3dViews(); S.render(); }, pan:(dx, dy) => { orb.pan(dx, dy); S.render(); }, zoom:f => { orb.zoom(f); S.render(); } });
    S.view = T.view3d({T:THREE, sc, orb, car:() => wbCar(THREE, sc), arrow:c => wbArrow(THREE, sc, c), marker:(c, z) => { const m = V3D.marker(THREE, c, z); sc.add(m); return m; }, label:(t, c, h) => { const m = V3D.label(THREE, t, c, h); sc.add(m); return m; }, render:() => S.render(), update:() => wb3dUpdate()});
    const fit = () => { const w = box.clientWidth, h = box.clientHeight; if(!w || !h) return; rd.setSize(w, h, false); S.render(); };
    S.ro = new ResizeObserver(fit); S.ro.observe(box); fit(); wb3dUpdate();
  }).catch(() => { box.innerHTML = '<p class="wb-empty">3D 라이브러리(three.js)를 불러오지 못했습니다.</p>'; }); }
function wb3dViews(){ const S = WB.t3; document.querySelectorAll('#wb [data-v3v]').forEach(b => b.setAttribute('aria-pressed', String(!!S && b.dataset.v3v===S.orb.st.mode))); }
function wb3dUpdate(){ const S = WB.t3; if(!S || !WB.R) return; try{ S.view.update(WB.I, WB.R, WB.xi); }catch(e){ console.warn(e); } S.render(); }
function wb3dClose(){ const S = WB.t3; if(!S) return; S.ro.disconnect(); if(S.off) S.off();
  S.sc.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material) [].concat(o.material).forEach(m => { if(m.map) m.map.dispose(); m.dispose(); }); }); S.rd.dispose(); WB.t3 = null; }

/* ---------- 이벤트 ---------- */
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return;
  const row = t.closest('[data-wb]'); if(row){ wbOpen(row.dataset.wb, row); return; }
  if(!WB.id) return;
  if(t.closest('[data-wbmx]') || t.matches('#wbm')){ wbModalClose(); return; }
  if(t.closest('[data-wbx]')){ wbClose(); return; }
  if(t.closest('[data-wbfill]')){ let n = 0; wbT().inputs.forEach(d => { const db = wbDash(d.dk); if(db){ WB.I[d.k] = db.v; n++; } }); wbSave(); wbPaint(['in']); wbCalc(); toast(`대시보드 값 ${n}개로 채웠습니다.`); return; }
  if(t.closest('[data-wbcmp]')){ WB.cmp = !WB.cmp; t.closest('[data-wbcmp]').setAttribute('aria-pressed', String(WB.cmp)); wbPaint(['in','out']); return; }
  if(t.closest('[data-wbver]')){ wbVerify(); return; }
  if(t.closest('[data-wbcode]')){ wbCodeOpen(); return; }
  if(t.closest('[data-wbcreset]')){ delete WB.code[WB.id]; $('#wbm textarea').value = wbT().code; $('#wbcmsg').textContent = '원래 코드로 돌렸습니다.'; wbCalc(); return; }
  if(t.closest('[data-wbcrun]')){ const src = $('#wbm textarea').value; WB.code[WB.id] = src === wbT().code ? undefined : src; if(WB.code[WB.id]===undefined) delete WB.code[WB.id];
    wbCalc().then(() => { const mm = $('#wbcmsg'); if(mm) mm.textContent = WB.err ? WB.err : '계산했습니다. 결과는 작업창에 보입니다.'; }); return; }
  if(t.closest('[data-wbexp]')){ wbExport(); return; }
  if(t.closest('[data-wbimp]')){ $('#wbfile').click(); return; }
  if(t.closest('[data-wbput]')){ wbPutOpen(); return; }
  if(t.closest('[data-wbpgo]')){ wbPutGo(); return; }
  const ac = t.closest('[data-wbact]'); if(ac){ WB.act = ac.dataset.wbact; WB.sel.add(WB.act); wbPaint(['sig']); return; }
  const ao = t.closest('[data-wbacto]'); if(ao){ WB.actO = ao.dataset.wbacto; WB.selO.add(WB.actO); wbPaint(['sig']); return; }
  const vv = t.closest('#wb [data-v3v]'); if(vv && WB.t3){ WB.t3.orb.set(vv.dataset.v3v); wb3dViews(); WB.t3.render(); return; }
});
document.addEventListener('keydown', e => {
  const row = e.target.closest && e.target.closest('[data-wb]'); if(row && (e.key==='Enter' || e.key===' ')){ e.preventDefault(); wbOpen(row.dataset.wb, row); return; }
  if(!WB.id) return;
  if(e.key==='Escape'){ e.preventDefault(); if(!wbModalClose()) wbClose(); return; }
  if(e.target.matches && e.target.matches('textarea.wb-ta') && e.key==='Tab'){ e.preventDefault(); const ta = e.target, a = ta.selectionStart; ta.setRangeText('  ', a, ta.selectionEnd, 'end'); return; }
  const hit = e.target.closest && e.target.closest('.wb-plotbox'); if(hit && WB.R && (e.key==='ArrowLeft' || e.key==='ArrowRight')){ e.preventDefault();
    wbCursor(hit.id==='wbsig' ? 'sig' : 'main', null, e.key==='ArrowLeft' ? -1 : 1); }
});
document.addEventListener('input', e => { const sw = e.target.closest && e.target.closest('[data-wbsw]'); if(sw && WB.sw){ const x = parseFloat(sw.value); if(isFinite(x)){ WB.sw[sw.dataset.wbsw] = x; clearTimeout(WB.timer); WB.timer = setTimeout(() => wbSweep().then(() => wbPaint(['sig'])), 250); } return; }
  const i = e.target.closest && e.target.closest('[data-wbi]'); if(!i || !WB.id) return;
  const x = parseFloat(i.value); if(!isFinite(x)) return; WB.I[i.dataset.wbi] = x; wbSave();
  const r = i.closest('.wb-ir'), d = wbT().inputs.find(o => o.k===i.dataset.wbi), db = wbDash(d.dk); if(r) r.classList.toggle('diff', !!(db && Math.abs(x - db.v) > 1e-9*Math.max(1, Math.abs(db.v))));
  wbCalcSoon(); });
document.addEventListener('change', e => { const t = e.target; if(!WB.id || !t.matches) return;
  if(t.matches('#wbfile')){ if(t.files && t.files[0]) wbImport(t.files[0]); t.value = ''; return; }
  if(t.matches('[data-wbxa]')){ WB.xa = t.value; if(WB.xa.startsWith('in:')){ WB.si = 0; if(!WB.sw || WB.sw.k!==WB.xa.slice(3)) WB.sw = null; wbSweep().then(() => { WB.si = WB.sw && WB.sw.X ? Math.floor(WB.sw.X.length/2) : 0; wbPaint(['sig']); }); } wbPaint(['sig']); return; }
  if(t.matches('[data-wbso]')){ t.checked ? WB.selO.add(t.dataset.wbso) : WB.selO.delete(t.dataset.wbso); if(t.checked) WB.actO = t.dataset.wbso; wbPaint(['sig']); return; }
  if(t.matches('[data-wbsg]')){ t.checked ? WB.sel.add(t.dataset.wbsg) : WB.sel.delete(t.dataset.wbsg); if(t.checked) WB.act = t.dataset.wbsg; wbPaint(['sig']); } });
/* 커서: 그래프를 누르거나 끌면 옮기고, 놓으면 그 자리에 남음. 기본 축·XY 는 두 그래프와 3D 가 같은 커서, 입력 훑기는 따로 */
function wbCursor(which, idx, step){ const R = WB.R; if(!R) return; if(!R.x && which!=='sig') return;
  const sweep = which==='sig' && WB.xa.startsWith('in:'); if(sweep && !(WB.sw && WB.sw.X)) return;
  const n = sweep ? WB.sw.X.length : R.x.d.length, cur = sweep ? WB.si : WB.xi, nx = Math.max(0, Math.min(n - 1, idx != null ? idx : cur + step));
  if(nx===cur) return; if(sweep){ WB.si = nx; wbPaint(['sig']); return; } WB.xi = nx; wbPaint(['main','sig']); wb3dUpdate(); }
function wbPick(svg, e){ if(!svg.querySelector('.wb-hit')) return; const hit = svg.querySelector('.wb-hit'), rc = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (e.clientX - rc.left)/rc.width*vb.width;
  const L = +hit.dataset.wbl, W = +hit.dataset.wbw, x0 = +hit.dataset.wbx0, x1 = +hit.dataset.wbx1, xv = x0 + (px - L)/W*(x1 - x0), which = svg.dataset.wbp;
  const xd = which==='sig' && WB.xa.startsWith('in:') ? WB.sw.X : which==='sig' && WB.xa.startsWith('sig:') ? WB.R.sig[WB.xa.slice(4)] : WB.R.x.d;
  let best = -1; for(let i = 0; i < xd.length; i++) if(isFinite(xd[i]) && (best < 0 || Math.abs(xd[i] - xv) < Math.abs(xd[best] - xv))) best = i;
  if(best >= 0) wbCursor(which, best); }
let WB_DRAG = null;
document.addEventListener('pointerdown', e => { if(!WB.R || e.button!==0) return; const svg = e.target.closest && e.target.closest('#wb .wb-plot'); if(!svg) return;
  e.preventDefault(); WB_DRAG = svg.dataset.wbp; wbPick(svg, e); const box = svg.closest('.wb-plotbox'); if(box) box.focus({preventScroll:true}); });
document.addEventListener('pointermove', e => { if(!WB_DRAG || !WB.R) return; const svg = document.querySelector(`#wb .wb-plot[data-wbp="${WB_DRAG}"]`); if(svg) wbPick(svg, e); });
document.addEventListener('pointerup', () => { WB_DRAG = null; });
