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
  xa:'', sw:null, si:0, selO:new Set(), actO:'', cmp:false, panes:[], pi:0, panesO:[], piO:0 };   /* cmp: 대시보드 값과 비교해 보기 (기본 끔) */   /* xa: '' 기본 축 · 'sig:키' 신호 · 'in:키' 입력 훑기 */
const wbT = () => WB_TOOLS[WB.id];
const wbEsc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wbFmt = (x, d) => (typeof x==='number' && isFinite(x)) ? x.toLocaleString('ko-KR', {minimumFractionDigits:d, maximumFractionDigits:d}) : '—';
/* ---------- 예제 · 내 파일 (2026-11-10 관리자 결정) ----------
   예제 = 튜토리얼용 임의 데이터 (도구 기본값 · 예시 표). 설계에 쓰지 않음 → 내보내기 · 가져오기 · 대시보드(가져오기 · 반영) · 다른 도구로 보내기 막음.
   내 파일 = 모두 빈칸 (고정 종목 코스 · 모델 선택 · 고정 상수만). 사이트는 차량 데이터를 주지 않음. 빈칸이 있으면 계산하지 않고 필요한 칸을 빨갛게.
   두 모드는 저장을 따로 (키 끝 @ex · @nf). 도구 목록 줄에 커서를 올리면 [예제 | 내 파일] 로 바뀌어 고른 쪽으로 엶. 도구 안에서 다른 도구로 넘어가면 지금 모드 그대로.
   검증표는 모드와 상관없이 늘 입력 정의의 기본값(d.v) 위에서 돎. 예전 저장본(모드 없는 키)은 버림. */
let WBMODE = 'nf', WBMODE_ON = true;   /* 처음 = 내 파일 (도구마다 wbModeReg 로 바로 읽음) */
const wbEx = () => WBMODE==='ex';
const wbMK = k => k + (WBMODE==='ex' ? '@ex' : '@nf');
const WB_MODE_LOAD = [], wbModeReg = f => { WB_MODE_LOAD.push(f); try{ f(WBMODE); }catch(e){ console.error('mode load', e); } };   /* 도구마다 (mode) => 그 모드 저장본을 읽음 (없으면 예제 = 예시값 · 내 파일 = 빈칸) */
function wbModeSet(m){ m = m==='ex' ? 'ex' : 'nf'; if(WBMODE_ON && m===WBMODE) return; WBMODE = m; WBMODE_ON = true;
  WB_MODE_LOAD.forEach(f => { try{ f(m); }catch(e){ console.error('mode load', e); } }); }
/* [예제 | 내 파일] 두 단추 (도구 목록 줄 · 파트 페이지 단추 안). 부모 .wb-mpick 에 커서 · 포커스가 오면 보임 */
const wbModeBtns = (id, t) => `<span class="wb-mp-b" role="group" aria-label="${wbEsc(String(t).replace(/<[^>]+>/g, ''))} 열기"><button type="button" class="wb-mp-ex" data-wbo="${id}" data-wbm="ex"><b>예제</b><span>튜토리얼 · 임의 데이터</span></button><button type="button" class="wb-mp-nf" data-wbo="${id}" data-wbm="nf"><b>내 파일</b><span>내 설계 이어서</span></button></span>`;
/* 예제에서 막는 것: 이유를 알림 */
function wbExBlock(){ if(!wbEx()) return false; toast('예제는 튜토리얼용 임의 데이터라 내보내기 · 가져오기 · 대시보드 연결을 쓰지 않습니다. 도구 목록에서 [내 파일]로 여세요.'); return true; }
/* 예전 저장본 (모드 나누기 전 키) 버림 — 한 번만 */
try{ if(!localStorage.getItem('run2x.mode.v1')){ ['1', '2', 'G', '4', '9', 'T', '5', '6', '7', '3', '8'].forEach(id => localStorage.removeItem('run2x.wb.' + id));
    ['run2x.wb.2.ext.v2', 'run2x.t9', 'run2x.wb.share.hp', 'run2x.t4.presets', 'run2x.t4.cell'].forEach(k => localStorage.removeItem(k));
    if(!(typeof SH!=='undefined' && SH.on)) ['run2x.mass.v2', 'run2x.drv.v2'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('run2x.mode.v1', '1'); } }catch(e){}
const wbStoreKey = id => wbMK('run2x.wb.' + id);
/* [결과 | 편집] 탭 (도구 2P 는 자체 [시뮬레이션 | 편집]). 입력은 모두 편집 탭에 묶음 카드로, 왼쪽 입력 칸은 key:true 인 핵심 입력만 (없으면 안내).
   ext (도구가 그리는 큰 입력 화면: 도구 1 표 · 도구 4 셀 · 도구 9 회로) 는 편집 탭, mid · 그림 · 신호 그래프 · 결과 카드는 결과 탭. 그림을 편집에도 두려면 editFig:true */
const wbTabs = T => !!T && T.inPanel !== false;
const WBTAB_KEY = 'run2x.wb.tab';
function wbTabGet(id){ try{ const m = JSON.parse(localStorage.getItem(WBTAB_KEY) || '{}') || {}; return m[id]==='edit' ? 'edit' : 'res'; }catch(e){ return 'res'; } }
function wbTabSet(tab){ if(!WB.id) return; WB.tab = tab==='edit' ? 'edit' : 'res'; if(WB.tab==='res' && (WB.need || []).length){ WB.needShow = true; setTimeout(wbNeedMark, 0); }
  try{ const m = JSON.parse(localStorage.getItem(WBTAB_KEY) || '{}') || {}; m[WB.id] = WB.tab; localStorage.setItem(WBTAB_KEY, JSON.stringify(m)); }catch(e){}
  const w = $('#wb'); if(w){ w.classList.toggle('wb-edit', WB.tab==='edit'); w.classList.toggle('wb-res', WB.tab!=='edit'); }
  wbPaint(['tabs']); if(WB.tab==='res'){ wbPaint(['out', 'main', 'sig', 'mid']); wb3dUpdate && wb3dUpdate(); } }

/* ---------- 대시보드 값 (입력 채우기 · 비교 · 반영) ---------- */
function wbDash(dk){ if(!dk) return null;
  const e = typeof dvEntry==='function' ? dvEntry(dk) : null;
  if(e && typeof e.v==='number' && isFinite(e.v)) return {v:e.v, st:e.st || 'rev', by:e.by || '', at:e.at || '', src:e.src || ''};
  return null; }   /* 아직 아무도 안 넣은 값 = 없음 (사이트는 예시값을 주지 않음, 2026-11-11) */
const wbInName = d => d.n || (d.dk && DK[d.dk] ? DK[d.dk].n : d.k);
const wbInUnit = d => d.u != null ? d.u : (d.dk && DK[d.dk] ? DK[d.dk].u : '');

/* ---------- 계산 (Web Worker) ---------- */
function wbWorker(src){
  if(WB.worker && WB.wsrc===src) return WB.worker;
  if(WB.worker) WB.worker.terminate();
  /* wbProg(0~1, 글): 계산 코드가 진행 상황을 알림 (도구 2P 주행선 다듬기 등) */
  const body = src + `\n;let WBID = 0; const wbProg = (f, msg) => postMessage({id:WBID, prog:f, msg});
    self.onmessage = e => { const t0 = performance.now(); WBID = e.data.id;
    try { if(e.data.Is){ const outs = e.data.Is.map(I => { const r = calc(I); return (r && r.out) || {}; }); postMessage({id:e.data.id, ok:true, outs, ms:performance.now()-t0}); return; }
      const r = calc(e.data.I); postMessage({id:e.data.id, ok:true, r, ms:performance.now()-t0}); }
    catch(err){ postMessage({id:e.data.id, ok:false, err:String(err && err.message || err)}); } };`;
  const w = new Worker(URL.createObjectURL(new Blob([body], {type:'text/javascript'})));
  w.onmessage = e => { if(e.data.prog != null){ if(WB.wait[e.data.id]){ WB.progD = true; wbProgShow(e.data.prog, e.data.msg); } return; }
    const f = WB.wait[e.data.id]; if(f){ delete WB.wait[e.data.id]; f(e.data); } };
  w.onerror = e => { e.preventDefault(); const msg = '코드 오류: ' + (e.message || '읽을 수 없는 코드');
    Object.keys(WB.wait).forEach(id => { WB.wait[id]({ok:false, err:msg}); delete WB.wait[id]; }); WB.worker = null; WB.wsrc = ''; };
  WB.worker = w; WB.wsrc = src; return w; }
function wbRun(I, code){ return new Promise(res => {   /* I 가 배열이면 여러 입력을 한 번에(입력 훑기) */
  let w; try{ w = wbWorker(code); }catch(err){ res({ok:false, err:'계산기를 시작하지 못했습니다: ' + err.message}); return; }
  const cl = (wbT() && wbT().calcLimit) || 8, lim = Array.isArray(I) ? Math.max(30, cl) : cl;   /* 제한 시간 [s]: 한 번 계산 8초(도구가 calcLimit 로 늘림), 입력 훑기(여러 번) 30초 */
  const id = ++WB.seq, to = setTimeout(() => { if(WB.wait[id]){ delete WB.wait[id]; if(WB.worker===w){ w.terminate(); WB.worker = null; WB.wsrc = ''; } res({ok:false, err:`계산이 ${lim}초 안에 끝나지 않아 멈췄습니다 (반복문 확인)`}); } }, lim*1000);
  WB.wait[id] = r => { clearTimeout(to); res(r); };
  w.postMessage(Array.isArray(I) ? {id, Is:I} : {id, I}); }); }
/* 계산에 넘기는 입력: 입력 칸 + 도구가 따로 모으는 값(표 · 드라이버 등, T.extraI) */
const wbInputs = () => ({...WB.I, ...(wbT().extraI ? wbT().extraI() : {})});
/* 도구 모듈이 표 등을 고친 뒤 부름: 다시 계산 */
const wbRefresh = () => { if(WB.id) wbCalcSoon(); };
const wbCode = () => WB.code[WB.id] != null ? WB.code[WB.id] : wbT().code;
/* 계산 전 자리 표시 (스켈레톤): cards = 결과 카드 줄, plot = 그래프 상자 */
function wbSkel(kind){ return kind==='plot' ? '<div class="wb-skel" aria-label="계산 중"><i class="s"></i><i class="b"></i></div>'
  : '<div class="wb-skel" aria-label="계산 중"><i class="s"></i><div class="r"><i></i><i></i><i></i><i></i><i></i><i></i></div><i class="s"></i><div class="r"><i></i><i></i><i></i></div></div>'; }
/* 계산 중 표시: 0.3초 넘게 걸리면 결과 칸 위에 진행 막대 + 이전 결과 흐리게. 새 계산이 오면 하던 계산은 버림 */
function wbProgShow(f, msg){ const p = $('#wbprog'); if(!p) return; p.hidden = false; p.classList.toggle('ind', f == null);
  const b = p.querySelector('i'); if(b && f != null){ const w = Math.round(Math.max(0, Math.min(1, f))*100), w0 = parseFloat(b.style.width) || 0;
    if(w < w0){ b.style.transition = 'none'; b.style.width = w + '%'; void b.offsetWidth; b.style.transition = ''; } else b.style.width = w + '%'; }   // 줄어들 때(새 계산)는 바로, 늘어날 때만 부드럽게
  const t = p.querySelector('span'); if(t) t.textContent = (msg || '계산 중') + (f != null ? ` · ${Math.round(f*100)} %` : ' …'); }
/* 계산 중: 화면 위에 고정한 진행 막대(스크롤과 상관없이 보임) + 오른쪽 화면 전체를 살짝 회색. 끝나면 바뀐 결과 칸 · 그래프가 한 번 깜빡임 */
function wbBusy(on){ clearTimeout(WB.busyT); const m = $('#wb'), p = $('#wbprog');
  if(on){ if(m) m.classList.add('wb-busy'); WB.progD = false; WB.busyT = setTimeout(() => { if(m) m.classList.add('wb-skelnow'); if(!WB.progD) wbProgShow(null, '계산 중'); }, 150); return; }   // 0.15 s 넘는 계산만 자리 표시 (짧은 계산은 깜빡이지 않게)   // 진행 신호가 이미 왔으면 흐르는 막대로 바꾸지 않음
  if(m){ m.classList.remove('wb-busy', 'wb-skelnow'); m.classList.remove('wb-flash'); void m.offsetWidth; m.classList.add('wb-flash'); clearTimeout(WB.flashT); WB.flashT = setTimeout(() => m.classList.remove('wb-flash'), 800); }
  if(p){ p.hidden = true; const b = p.querySelector('i'); if(b){ b.style.transition = 'none'; b.style.width = '0%'; void b.offsetWidth; b.style.transition = ''; } } }
/* 휠 확대는 박스를 눌러 켠 뒤에만 (data-zoombox). 다른 곳을 누르거나 Esc = 끔 → 휠 = 페이지 스크롤 */
/*   상자는 다시 그려질 수 있어 이름(data-zoombox 값)으로 기억하고, 다시 그린 뒤에도 강조를 다시 붙임 (wbZoomMark) */
const WBZ = { key:'' };
const wbZoomKey = el => el ? (el.getAttribute('data-zoombox') || el.id || '') : '';
const wbZoomOn = el => !!el && !!WBZ.key && wbZoomKey(el)===WBZ.key;
function wbZoomMark(){ document.querySelectorAll('[data-zoombox]').forEach(el => el.classList.toggle('zact', wbZoomOn(el))); }
function wbZoomSet(el){ WBZ.key = wbZoomKey(el); wbZoomMark(); }
document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('[data-zoombox]'); wbZoomSet(b); }, true);
new MutationObserver(() => { if(WBZ.key) wbZoomMark(); }).observe(document.documentElement, {childList:true, subtree:true});
document.addEventListener('keydown', e => { if(e.key==='Escape' && WBZ.key){ wbZoomSet(null); } });
function wbKill(){ if(WB.worker){ WB.worker.terminate(); WB.worker = null; WB.wsrc = ''; }
  Object.keys(WB.wait).forEach(id => { const f = WB.wait[id]; delete WB.wait[id]; f({ok:false, cancelled:true}); }); }
/* 내 파일: 계산에 필요한데 빈 칸 = 화면에 있고(ui:'none' 아님) 잠기지 않은 칸 + 도구가 알리는 표 (T.needExt → [{n, go}]) */
function wbNeed(){ const T = wbT(); if(!T) return []; const L = [];
  T.inputs.forEach(d => { if(d.ui==='none' || d.opt || (T.inLock && T.inLock(d.k)) || (T.inNeed && T.inNeed(d.k)===false)) return; if(!isFinite(WB.I[d.k])) L.push({k:d.k, n:wbInName(d).replace(/<[^>]+>/g, ''), g:d.g || ''}); });
  if(T.needExt) (T.needExt() || []).forEach(x => L.push(x)); return L; }
const wbNeedK = k => (WB.need || []).some(x => x.k===k);
/* 빈 필수 칸 빨강: 다시 그리지 않고 그 자리에서 (입력 중인 칸의 포커스 유지). 도구 화면의 표 · 블럭은 [data-wbneed="키"] 로 */
function wbNeedMark(){ const w = $('#wb'); if(w) w.classList.toggle('wb-needon', !!WB.needShow && !!(WB.need || []).length);
  document.querySelectorAll('#wb [data-wbtab="edit"]').forEach(b => b.classList.toggle('need', !!(WB.need || []).length));   /* [편집] 탭 단추에도 빨간 점 (2026-11-11) */
  document.querySelectorAll('#wb input[data-wbi]').forEach(i => { const l = i.closest('.wb-ir'); if(l) l.classList.toggle('need', !i.disabled && wbNeedK(i.dataset.wbi)); });
  document.querySelectorAll('#wb [data-wbneed]').forEach(el => el.classList.toggle('need', wbNeedK(el.dataset.wbneed))); const T = wbT(); if(T && T.needMark) T.needMark(WB.need || []); }
/* 결과 자리: 채울 칸 목록 (누르면 그 칸으로) */
function wbNeedHTML(){ const n = (WB.need || []).length;
  return `<p class="wb-needline" role="status"><b>필수 입력 ${n}칸이 비어 있어 계산하지 않았습니다.</b> <span>[편집] 탭의 빨간 칸을 채우면 계산합니다.</span> <button type="button" class="btn small" data-wbgo="${wbEsc((WB.need[0] || {}).k || '')}"${WB.need[0] && WB.need[0].tab ? ` data-wbgotab="${wbEsc(WB.need[0].tab)}"` : ''}>첫 빈칸으로</button></p>`; }
/* 목록에서 고른 칸으로: 도구가 T.needGo(k) 로 자기 화면을 엶 (도구 2P 편집 탭 묶음), 아니면 편집 탭 */
function wbNeedGo(k, tab){ const T = wbT(); if(T.needGo && T.needGo(k, tab)===true){} else if(wbTabs(T) && WB.tab!=='edit') wbTabSet('edit');
  setTimeout(() => { const el = document.querySelector(`#wb input[data-wbi="${k}"]`) || document.querySelector(`#wb [data-wbneed="${k}"]`); if(el){ el.scrollIntoView({block:'center', behavior:'smooth'}); if(el.focus) el.focus({preventScroll:true}); el.classList.add('wb-need-flash'); setTimeout(() => el.classList.remove('wb-need-flash'), 1200); } }, 80); }
async function wbCalc(){ const T = wbT(); if(!T) return;
  WB.need = wbNeed(); if(WB.need.length){ if(WB.busy) wbKill(); if(wbTabs(T) ? WB.tab!=='edit' : !(T.deferCalc && T.deferCalc())) WB.needShow = true;   /* 결과를 보려 할 때 비어 있으면 그때 빨강 (처음부터 빨갛게 하지 않음) */ WB.cseq = (WB.cseq || 0) + 1; WB.busy = false; wbBusy(false); WB.R = null; WB.err = '';
    if(T.onResult) T.onResult(null); wbPaint(['out', 'main', 'sig', 'stat']); wbNeedMark(); return; }
  wbNeedMark();
  if(WB.busy) wbKill();                                   /* 입력이 또 바뀜: 하던 계산은 버리고 새로 */
  const my = WB.cseq = (WB.cseq || 0) + 1; WB.busy = true; wbBusy(true);
  const r = await wbRun(wbInputs(), wbCode());
  if(r.cancelled || my !== WB.cseq) return;
  if(!r.ok){ WB.err = r.err; WB.R = null; }
  else if(!r.r || !r.r.out || (r.r.x && !r.r.sig)){ WB.err = '계산 결과에 out(결과 숫자)이, x(가로축)가 있으면 sig(신호)도 있어야 합니다'; WB.R = null; }
  else { WB.err = ''; WB.R = r.r; WB.ms = r.ms; if(WB.R.x){ const n = WB.R.x.d.length; if(WB.xi >= n) WB.xi = n - 1; } else if(!WB.xa) WB.xa = 'in:' + (T.sweepFirst || T.inputs[0].k); }
  if(T.onResult) T.onResult(WB.R);   /* 도구 모듈이 자기 영역(표 · 그림)을 결과에 맞춰 고침 */
  wbEffRefresh();                     /* 잠긴 칸: 결과에서 정해지는 실제 값 (자동 구성 등) */
  if(WB.xa.startsWith('in:') && !WB.err && !T.noSig) await wbSweep();
  if(my !== WB.cseq) return;
  WB.busy = false; wbBusy(false);
  wbPaint(['out','main','sig','stat']); wb3dUpdate(); }
/* 입력 훑기: 고른 입력 하나를 lo~hi 에서 n 점으로 바꿔 가며 계산, 결과 숫자(out)를 모음. 나머지 입력은 지금 값 */
async function wbSweep(){ const k = WB.xa.slice(3), d = wbT().inputs.find(o => o.k===k); if(!d) return;
  if(!WB.sw || WB.sw.k!==k){ const v = WB.I[k], a = Math.abs(v) > 1e-9 ? Math.abs(v) : 1;   /* 범위: 도구가 정한 sw, 없으면 지금 값 ±50 % */
    WB.sw = d.sw ? {k, lo:d.sw[0], hi:d.sw[1], n:41} : {k, lo:+(v - a*.5).toPrecision(4), hi:+(v + a*.5).toPrecision(4), n:41}; }
  const S = WB.sw, n = Math.max(3, Math.min(201, Math.round(S.n))), X = Array.from({length:n}, (_, i) => S.lo + (S.hi - S.lo)*i/(n - 1));
  const base = wbInputs(), r = await wbRun(X.map(x => ({...base, [k]:x, _sweep:true})), wbCode());   /* _sweep: 도구가 훑기 중에 무거운 부가 계산을 건너뛸 수 있게 */
  if(r.cancelled) return; if(!r.ok){ S.X = null; S.err = r.err; return; } S.err = ''; S.X = X; S.O = {}; wbT().outputs.forEach(o => { S.O[o.k] = r.outs.map(t => t[o.k]); });
  if(WB.si >= n) WB.si = n - 1; if(!WB.panesO.length) wbSelReset([], true); if(!WB.panesO.some(P => P.size)) wbT().outputs.filter(o => !o.hide).slice(0, 2).forEach(o => WB.selO.add(o.k)); }
/* 도구가 deferCalc() = true 를 주는 동안(도구 2P 편집 탭)은 계산하지 않고 표시만 해 둠 → 도구가 나중에 wbCalc() */
const wbCalcSoon = () => { const T = wbT(); if(T && T.deferCalc && T.deferCalc()){ WB.dirty = true; return; } clearTimeout(WB.timer); WB.timer = setTimeout(wbCalc, 120); };

/* ---------- 그래프 (SVG) ---------- */
function wbTicks(lo, hi, n){ if(!(hi > lo)){ hi = lo + 1; }
  const raw = (hi - lo)/n, p = Math.pow(10, Math.floor(Math.log10(raw))), s = [1,2,2.5,5,10].map(k => k*p).find(k => k >= raw) || 10*p;
  const a = Math.floor(lo/s)*s, b = Math.ceil(hi/s)*s, t = []; for(let x = a; x <= b + s*1e-9; x += s) t.push(+x.toPrecision(12)); return {lo:a, hi:b, t}; }
/* 확대한 범위의 눈금: 범위 끝은 그대로 두고 그 안의 눈금만 */
function wbTicksIn(lo, hi, n){ const r = wbTicks(lo, hi, n), e = (hi - lo)*1e-9; return {lo, hi, t:r.t.filter(t => t >= lo - e && t <= hi + e)}; }
/* o: {w, h, x:{d,n,u}, ys:[{k,d,c,n,u}], norm, act, xi} — norm: 신호마다 자기 범위로(신호 선택 그래프) */
/* 그래프 (MATLAB 방식): 단위가 같은 선은 한 축을 함께 씀. 축 1개 = 왼쪽, 2개 = 왼쪽 · 오른쪽(yyaxis), 3개부터 바깥으로 이어 붙임(왼 · 오 번갈아).
   축 제목은 축 옆에 세로로 가운데, x 축 제목은 아래 가운데. 프로브(xi)가 있으면 점 옆에 값 글자(프로브).
   o = {id, w, h, x:{d, n, u}, ys:[{k, d, c, n, u, dd}], xi, act, label}. o.norm 은 예전 이름(지금은 단위별 축이라 쓰지 않음)
   확대: o.zx = {lo, hi} (x 보기 범위), o.zy = {a, b} (y 축마다 자동 범위의 a ~ b 비율), o.clip = 선을 그림 영역 안으로 자르는 id.  신호가 없으면 축 · 그리드만 ('- [-]') */
function wbPlot(o){ const xd = o.x.d, ys = o.ys || [];
  const groups = []; ys.forEach(y => { const u = y.u || ''; let G = groups.find(g => g.u===u); if(!G){ G = {u, ys:[]}; groups.push(G); } G.ys.push(y); });
  if(!groups.length) groups.push({u:'', ys:[]});
  /* y 축: 단위마다 하나. 짝수 번째는 왼쪽, 홀수 번째는 오른쪽에 바깥으로 늘어놓음.
     축 폭 = 눈금 숫자 폭 + 세로 제목 폭 (겹치지 않게). 색: 신호 하나면 축 · 눈금 · 제목 모두 그 선 색, 여럿이면 제목만 신호마다 제 색 */
  const dg = r => Math.abs(r.t[1] - r.t[0]) < 1 ? (Math.abs(r.t[1] - r.t[0]) < 0.1 ? 2 : 1) : 0;
  groups.forEach(G => { let lo = Infinity, hi = -Infinity; G.ys.forEach(y => y.d.forEach(v => { if(isFinite(v)){ lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
    if(!isFinite(lo)){ lo = 0; hi = 1; } if(lo > 0 && lo < hi*0.35) lo = 0; if(hi - lo < 1e-9){ hi = lo + Math.max(1, Math.abs(lo)*.1); } G.r = wbTicks(lo, hi, 5); });
  /* y = 0 맞춤: 0 을 지나는 축이 여럿이면 0 높이를 같게 (아래 몫 : 위 몫 비를 기하 평균으로 맞추고 모자란 쪽을 늘림) → 0 선 하나 */
  const ZG = groups.filter(G => G.r.lo < 0 && G.r.hi > 0);
  if(ZG.length > 1){ const ks = ZG.map(G => -G.r.lo/G.r.hi), k = Math.sqrt(Math.min(...ks)*Math.max(...ks));
    ZG.forEach(G => { let lo = G.r.lo, hi = G.r.hi; if(-lo/hi < k) lo = -k*hi; else hi = -lo/k; G.r = wbTicksIn(lo, hi, 5); if(!G.r.t.some(t => Math.abs(t) < (hi - lo)*1e-9)) G.r.t.push(0); }); }
  groups.forEach(G => {
    if(o.zy){ const a = G.r.lo + o.zy.a*(G.r.hi - G.r.lo), b = G.r.lo + o.zy.b*(G.r.hi - G.r.lo); G.r = wbTicksIn(a, b, 5); }
    G.lw = Math.max(...G.r.t.map(t => wbFmt(t, dg(G.r)).length))*6.6; G.aw = Math.round(7 + G.lw + 8 + 13 + 8); });
  const LG = groups.filter((_, i) => i % 2 === 0), RG = groups.filter((_, i) => i % 2 === 1);
  const W = o.w, H = o.h, L = 6 + LG.reduce((a, G) => a + G.aw, 0), R = RG.length ? 6 + RG.reduce((a, G) => a + G.aw, 0) : 16, T = 14, B = 42, pw = W - L - R, ph = H - T - B;
  const xf = xd.filter(isFinite), xn = Math.max(4, Math.round(pw/80));
  const xr = o.zx ? wbTicksIn(o.zx.lo, o.zx.hi, xn) : wbTicks(xf.length ? Math.min(...xf) : 0, xf.length ? Math.max(...xf) : 1, xn), X = x => L + (x - xr.lo)/(xr.hi - xr.lo)*pw;
  const cid = o.clip ? `wbc-${o.clip}` : '', clip = cid ? ` clip-path="url(#${cid})"` : '';
  const Y = (v, r) => T + ph - (v - r.lo)/(r.hi - r.lo)*ph, gOf = y => groups.find(g => g.ys.includes(y));
  let s = `<svg class="wb-plot" data-wbp="${o.id || ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${wbEsc(o.label || '그래프')}">${cid ? `<defs><clipPath id="${cid}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath></defs>` : ''}`;
  xr.t.forEach(t => { s += `<line x1="${X(t)}" y1="${T}" x2="${X(t)}" y2="${T+ph}" class="wb-grid"/><text x="${X(t)}" y="${T+ph+15}" class="wb-tx" text-anchor="middle">${wbFmt(t, dg(xr))}</text>`; });
  groups[0].r.t.forEach(t => { const y = Y(t, groups[0].r); s += `<line x1="${L}" y1="${y}" x2="${L+pw}" y2="${y}" class="wb-grid"/>`; });
  s += `<text x="${L + pw/2}" y="${H - 6}" class="wb-tl" text-anchor="middle">${wbEsc(o.x.n)}${o.x.u ? ` [${wbEsc(o.x.u)}]` : ''}</text>`;
  let offL = 0, offR = 0;
  groups.forEach((G, gi) => { const left = gi % 2 === 0, ax = left ? L - offL : L + pw + offR, sg = left ? -1 : 1; if(left) offL += G.aw; else offR += G.aw;
    const one = G.ys.length===1, col = one ? G.ys[0].c : 'var(--ink-2)', all = G.ys.length ? G.ys.map(y => y.n).join(' · ') : '-';
    const short = !one && ((o.yn && o.yn[G.u]) || ((all.length + G.u.length + 3)*11 > ph ? `${G.ys[0].n} 외 ${G.ys.length - 1}개` : ''));
    s += `<line x1="${ax}" y1="${T}" x2="${ax}" y2="${T+ph}" style="stroke:${col}" stroke-width="1"/>`;
    G.r.t.forEach(t => { const y = Y(t, G.r); s += `<line x1="${ax}" y1="${y}" x2="${ax + 4*sg}" y2="${y}" style="stroke:${col}"/><text x="${ax + 7*sg}" y="${y + 4}" class="wb-tx" text-anchor="${left ? 'end' : 'start'}" style="fill:${col}">${wbFmt(t, dg(G.r))}</text>`; });
    const tx = ax + (7 + G.lw + 8 + 7)*sg, ty = T + ph/2, u = G.u ? ` [${wbEsc(G.u)}]` : (G.ys.length ? '' : ' [-]');
    const body = !G.ys.length ? '<tspan style="fill:var(--muted)">-</tspan>' : one ? `<tspan style="fill:${col}">${wbEsc(G.ys[0].n)}</tspan>` : short ? `<tspan style="fill:var(--ink-2)">${wbEsc(short)}</tspan>`
      : G.ys.map((y, i) => `${i ? '<tspan style="fill:var(--muted)"> · </tspan>' : ''}<tspan style="fill:${y.c}">${wbEsc(y.n)}</tspan>`).join('');
    s += `<text x="${tx}" y="${ty}" class="wb-tl" text-anchor="middle" transform="rotate(${left ? -90 : 90} ${tx} ${ty})"><title>${wbEsc(all)}${u}</title>${body}<tspan style="fill:${col}">${u}</tspan></text>`; });
  { const Z = groups.find(G => G.r.lo < 0 && G.r.hi > 0); if(Z){ const zy = Y(0, Z.r); s += `<line x1="${L}" y1="${zy}" x2="${L+pw}" y2="${zy}" class="wb-zero"/>`; } }   /* y = 0 선 (가속 · 감속 구분) */
  s += `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="wb-frame"/>`;
  /* o.dots: 가로축이 시간 · 거리가 아닌 신호면 선으로 잇지 않고 점 (회전수 – 토크 운전점처럼). 점 수천 개라 원 대신 길이 0 토막 하나의 path (둥근 끝 = 점) */
  if(o.dots) ys.forEach(y => { const r = gOf(y).r; let p = ''; y.d.forEach((v, i) => { if(isFinite(v) && isFinite(xd[i])) p += `M${X(xd[i]).toFixed(1)} ${Y(v, r).toFixed(1)}h0`; });
    s += `<path${clip} d="${p}" fill="none" stroke="${y.c}" stroke-width="${o.act===y.k?4:3.2}" stroke-linecap="round" stroke-opacity=".55" vector-effect="non-scaling-stroke"/>`; });
  else ys.forEach(y => { const r = gOf(y).r; s += `<polyline${clip} fill="none" stroke="${y.c}" stroke-width="${o.act===y.k?2.4:1.8}" vector-effect="non-scaling-stroke" points="${y.d.map((v, i) => isFinite(v) && isFinite(xd[i]) ? `${X(xd[i]).toFixed(1)},${Y(v, r).toFixed(1)}` : '').join(' ')}"/>`; });
  if(o.xi != null && isFinite(xd[o.xi]) && xd[o.xi] >= xr.lo && xd[o.xi] <= xr.hi){ const cx = X(xd[o.xi]), right = cx < L + pw*0.72, lab = [];
    s += `<line x1="${cx}" y1="${T}" x2="${cx}" y2="${T+ph}" class="wb-cur"/>`;
    ys.forEach(y => { const v = y.d[o.xi], r = gOf(y).r; if(!isFinite(v) || v < r.lo || v > r.hi) return; const cy = Y(v, r); s += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${y.c}" stroke="#fff" stroke-width="1"/>`;
      lab.push({y:cy, c:y.c, t:`${wbFmt(v, y.dd != null ? y.dd : 2)}${y.u ? ' ' + y.u : ''}`}); });
    lab.sort((a, b) => a.y - b.y); for(let i = 1; i < lab.length; i++) if(lab[i].y - lab[i-1].y < 13) lab[i].y = lab[i-1].y + 13;   /* 글자끼리 겹치지 않게 아래로 밀기 */
    const over = lab.length ? lab[lab.length-1].y - (T + ph - 4) : 0; if(over > 0) lab.forEach(l => l.y -= over);
    lab.forEach(l => { s += `<text x="${cx + (right ? 7 : -7)}" y="${l.y + 4}" class="wb-pv" text-anchor="${right ? 'start' : 'end'}" style="fill:${l.c}">${wbEsc(l.t)}</text>`; }); }
  /* 누르기 영역: 기본 'wb-hit'(프로브를 옮김). o.hit = false 면 표시 전용, 문자열이면 그 class (도구가 직접 처리) */
  if(o.hit===false) return s + '</svg>';
  return s + `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="${typeof o.hit==='string' ? o.hit : 'wb-hit'}" data-wbl="${L}" data-wbw="${pw}" data-wbt="${T}" data-wbh="${ph}" data-wbx0="${xr.lo}" data-wbx1="${xr.hi}"/></svg>`; }
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
        ${T.tour ? `<button type="button" class="wb-help" data-tour="wb:${wbEsc(WB.id)}" title="이 작업창의 버튼 위치와 기능을 차례로 안내합니다"><b aria-hidden="true">?</b><span>이 탭 사용법</span></button><i class="wb-sep" aria-hidden="true"></i>` : ''}
        <button type="button" class="btn small" data-coordopen title="차량 좌표계 (원점 = 뒤 차축 중심 · 지면, x 앞 · y 왼쪽 · z 위)">좌표계</button>
        ${T.shape ? `<button type="button" class="btn small" data-shpopen title="우리 차 측면도 · 윗면도(이미지 또는 DXF)를 그림 바탕으로">차 형상</button>` : ''}<i class="wb-sep" aria-hidden="true"></i>
        <button type="button" class="btn small" data-wbcode title="계산 코드와 검증표(해석해 비교)">코드 · 검증</button><i class="wb-sep" aria-hidden="true"></i>
        <button type="button" class="btn small" data-wbexp>내보내기 .json</button>
        <button type="button" class="btn small" data-wbimp>가져오기 .json</button><button type="button" class="btn small" data-wbpre>프리셋 ▾</button><i class="wb-sep" aria-hidden="true"></i>
        ${T.links || T.inputs.some(d => d.dk && !d.ui) ? `<button type="button" class="btn small" data-wblink title="다른 도구 · 대시보드에서 값 · 표를 가져옴 (무엇이 어디로 들어가는지 목록으로 보고 체크해서)">도구 연결 ▾</button><i class="wb-sep" aria-hidden="true"></i>` : ''}
        ${T.share==='hp' ? `<details class="wb-hpdd"><summary class="btn small" title="도구 5 · 6 · 7 · 8 이 같은 하드포인트 한 벌을 씁니다 (이 브라우저 안). 어느 도구에서 고쳐도 다른 도구가 열 때 그 값을 씁니다.">하드포인트 ▾</summary><span class="wb-hpmenu"><button type="button" class="btn small" data-wbhp="xlsx">내보내기 .xlsx</button><button type="button" class="btn small" data-wbhp="json">내보내기 .json</button><button type="button" class="btn small" data-wbhp="imp">가져오기 (.xlsx · .csv · .json)</button></span></details><i class="wb-sep" aria-hidden="true"></i>` : ''}
        <button type="button" class="btn small pri" data-wbput>대시보드에 반영</button>
        <button type="button" class="wb-close" data-wbx aria-label="작업창 닫기">×</button>
      </span><input type="file" accept=".json,application/json" id="wbfile" hidden><input type="file" accept=".xlsx,.csv,.txt,.json" id="wbhpfile" hidden></div>
    ${wbEx() ? '<div class="wb-exband" role="note"><b>예제</b><span>튜토리얼용 임의 데이터입니다. 설계에 쓸 수 없고, 내보내기 · 가져오기 · 대시보드 연결이 꺼져 있습니다.</span><button type="button" class="btn small" data-wbexreset title="이 도구의 예제 값을 처음 상태로">예제 처음으로</button></div>' : ''}
    <div class="wb-prog" id="wbprog" hidden role="status" aria-live="polite"><i></i><span></span></div>
    <div class="wb-main">
      <aside class="wb-in" aria-label="입력"><div class="wb-h"><h3>입력</h3></div><div id="wbin"></div></aside>
      <div class="wb-right">
        ${wbTabs(T) ? `<section class="wb-sec wb-tabsec" aria-label="결과 · 편집"><div class="wb-h"><div class="m1-tabs" role="tablist" id="wbtabs"></div><span class="wb-meta" id="wbtabm"></span></div></section>` : ''}
        ${T.extHTML ? '<div id="wbext"></div>' : ''}
        ${wbTabs(T) ? '<section class="wb-sec" id="wbedit" aria-label="편집 입력"></section>' : ''}
        <section class="wb-sec" aria-label="결과"><div class="wb-h"><h3>결과</h3><span class="wb-stat" id="wbstat"></span>${T.outHTML ? '' : `<button type="button" class="btn small wb-cmp" data-wbcmp aria-pressed="false">대시보드와 비교</button>`}</div><div id="wbout"></div></section>
        ${T.midHTML ? '<div id="wbmid"></div>' : ''}
        ${T.figure || T.view3d ? `<div class="wb-two${T.view3d ? '' : ' one'}">
          ${T.figure ? `<section class="wb-sec" aria-label="기본 결과 그래프"><div class="wb-h"><h3>${T.mainTitle || '결과 그래프'}</h3><span class="wb-meta">${T.mainMeta || '그래프를 누르거나 끌면 프로브 · ←/→ 한 칸씩'}</span></div><div id="wbmain" class="wb-plotbox" tabindex="0"></div></section>` : ''}
          ${T.view3d ? `<section class="wb-sec" aria-label="3D 화면"><div class="wb-h"><h3>3D 화면</h3><span class="wb-meta">${V3D.HELP}</span></div>
            <div class="wb-3dbox"><div class="wb-3dv"><div id="wb3d" class="wb-3d"><p class="wb-empty">불러오는 중…</p></div><div class="wb-3dui">${V3D.viewBtns('iso')}</div></div><p class="wb-3dn" id="wb3dn">${T.view3dNote || ''}</p></div></section>` : ''}
        </div>` : ''}
        ${T.noSig ? '' : `<section class="wb-sec" aria-label="신호 선택 그래프"><div class="wb-h"><h3>신호 선택 그래프</h3><span class="wb-meta">신호마다 자기 눈금 · 이름을 누르면 그 신호의 눈금 · 그래프를 누르거나 끌면 프로브</span></div>
          <div class="wb-sig"><div class="wb-sl" id="wbsl"></div><div id="wbsig" class="wb-plotbox wb-panes" tabindex="0" data-zm="cur"></div></div></section>`}
      </div></div>`; }
/* 입력 칸 상태 점 (대시보드와 같은 색): 확정 · 검토 중 · 가정 · 계산값 · 예시값. 대시보드 값과 다르게 고치면 점 둘레에 고리(직접 고침).
   대시보드에 없는 값(도구 기본값 · 도구 전용)은 회색 네모. 마우스를 올리면 담당 파트 · 대시보드 값 · 상태 · 고친 사람 */
const WB_STL = {ok:'확정', rev:'검토 중', asm:'가정', calc:'계산값', ex:'예시값'};
function wbInDot(d, db, v, own){ const K = d.dk && typeof DK!=='undefined' ? DK[d.dk] : null, dd = d.d != null ? d.d : 2;
  if(!K) return `<i class="wb-st sq" title="본 설계 전용값 (이 도구에서만 씀 · 대시보드와 공유 안 함)"></i>`;
  const part = K.p + (K.p2 ? ' · ' + K.p2 : '');
  if(!db) return `<i class="wb-st sq" title="${wbEsc(K.n)} · 담당 ${wbEsc(part)} · 대시보드 값 없음 → 본 설계 전용값"></i>`;
  const who = db.by ? ` · ${db.by}${db.at ? ' ' + String(db.at).slice(0, 10) : ''}` : '';
  const tip = `${K.n} · 담당 ${part} · 대시보드 ${wbFmt(db.v, dd)} ${K.u || ''} (${WB_STL[db.st] || db.st})${who}${own ? ` → 지금 ${wbFmt(v, dd)} (직접 고침, 대시보드는 그대로)` : ''}`;
  return `<i class="wb-st dv-s s-${db.st}${own ? ' own' : ''}" title="${wbEsc(tip)}"></i>`; }
const WB_INLEG = `<p class="wb-inleg" aria-label="입력 칸 점의 뜻"><span><i class="wb-st dv-s s-ok"></i>확정</span><span><i class="wb-st dv-s s-rev"></i>검토 중</span><span><i class="wb-st dv-s s-asm"></i>가정</span><span><i class="wb-st dv-s s-calc"></i>계산값</span><span><i class="wb-st dv-s s-ok own"></i>직접 고침</span><span><i class="wb-st sq"></i>본 설계 전용값</span></p>`;
/* 입력 칸 줄. list = 그릴 입력 (없으면 왼쪽 입력 칸: d.ui 가 'edit' · 'none' 이 아닌 것).
   도구가 입력을 자기 화면(도구 2P 편집 탭)에 그릴 때도 이 함수(wbInRows)를 씀 → 상태 점 · 용어 · 막힘 · 대시보드 비교가 같음 */
function wbInHTML(){ const T = wbT(), list = T.inPanel === false ? [] : T.inputs.filter(d => !d.ui && d.key);   /* inPanel:false = 입력을 모두 도구 화면에 (도구 2P) · 탭 도구 = 핵심 입력(key:true)만 */
  if(!list.length) return WB_INLEG + (T.inEmpty || '<p class="muted wb-inempty">입력은 위 [편집] 탭에 묶음별로 있습니다. 자주 바꿔 보는 값은 나중에 이곳으로 꺼낼 예정입니다.</p>');
  if(!list.length && T.inEmpty) return WB_INLEG + T.inEmpty;
  return WB_INLEG + wbInRows(list); }
/* 편집 탭 본문: 입력 묶음(d.g)마다 카드 (묶음 이름이 '앞 · ' · '뒤 · ' 로 시작하면 [차 · 공통 | 앞 | 뒤] 로 나눔) */
function wbEditHTML(){ const T = wbT(); if(!T || !wbTabs(T) || WB.tab!=='edit') return '';
  const list = T.inputs.filter(d => !d.ui), sides = list.some(d => /^(앞|뒤) · /.test(d.g || ''));
  const sec = d => /^앞 · /.test(d.g || '') ? 'f' : /^뒤 · /.test(d.g || '') ? 'r' : 'c';
  if(sides && !['c', 'f', 'r'].includes(WB.esec)) WB.esec = 'c';
  const show = sides ? list.filter(d => sec(d)===WB.esec) : list;
  const groups = []; show.forEach(d => { let G = groups.find(x => x.g===(d.g || '')); if(!G){ G = {g:d.g || '', ds:[]}; groups.push(G); } G.ds.push(d); });
  const nav = sides ? `<div class="wb-esec"><span class="muted">보기</span><span class="dc-seg" role="group">${[['c', '차 · 공통'], ['f', '앞'], ['r', '뒤']].map(([k, t]) => `<button type="button" data-wbesec="${k}" aria-pressed="${WB.esec===k}">${t}</button>`).join('')}</span></div>` : '';
  const cut = g => sides ? g.replace(/^(앞|뒤) · /, '') : g;
  return `<div class="wb-ebar">${nav}</div>
    ${!sides && T.edLay ? wbEditLay(T.edLay(), groups) : groups.length ? `<div class="wb-ecards">${groups.map(G => `<div class="wb-ecard">${G.g ? `<div class="wb-ech">${wbEsc(cut(G.g))}</div>` : ''}${wbInRows(G.ds, false)}</div>`).join('')}</div>` : ''}
    ${T.editTail ? T.editTail() : ''}
    ${T.editFig && WB.R && T.figure ? `<div class="wb-efig">${T.figure(WB.I, WB.R)}</div>` : ''}`; }   /* editTail: 도구가 편집 탭 맨 아래에 붙이는 것 (도구 4 셀 표) */
/* 편집 배치 (도구가 T.edLay 를 줄 때, 2026-11-11): 구역 [{h 머리, n 열 수, cards:[{g 묶음, span 칸, k 카드 안 열 수}]}]. 항목이 적으면 한 행 여러 카드,
   많으면 카드를 넓혀 안에서 열을 나눔 (세로 순서대로 채움). 배치에 없는 묶음은 맨 아래 카드로 */
function wbEditLay(L, groups){ const used = new Set();
  const card = c => { const G = groups.find(x => x.g===c.g); if(!G) return ''; used.add(G); const k = c.k || 1;
    return `<div class="wb-ecard" style="grid-column:span ${c.span || 1}">${G.g ? `<div class="wb-ech">${wbEsc(G.g)}</div>` : ''}${k > 1 ? `<div class="wb-ebin" style="--k:${k};--r:${Math.ceil(G.ds.length / k)}">${wbInRows(G.ds, false)}</div>` : wbInRows(G.ds, false)}</div>`; };
  const secs = L.map(S => { const cs = S.cards.map(card).join(''); return cs ? `<div class="wb-ig wb-elh">${wbEsc(S.h)}</div><div class="wb-elay" style="--n:${S.n}">${cs}</div>` : ''; }).join('');
  const rest = groups.filter(G => !used.has(G));
  return secs + (rest.length ? `<div class="wb-ecards">${rest.map(G => `<div class="wb-ecard">${G.g ? `<div class="wb-ech">${wbEsc(G.g)}</div>` : ''}${wbInRows(G.ds, false)}</div>`).join('')}</div>` : ''); }
function wbTabsHTML(){ const T = wbT(); if(!wbTabs(T)) return '';
  return [['res', '결과'], ['edit', '편집']].map(([k, t]) => `<button type="button" role="tab" data-wbtab="${k}" aria-selected="${(WB.tab || 'res')===k}">${t}</button>`).join(''); }
/* 잠긴 칸 값: 도구의 inEff(k) 가 undefined = 저장값 그대로, null = 계산에 안 씀 (—), 숫자 = 실제로 쓰는 값, '…' = 결과가 나오면 정해짐 */
function wbEffVal(T, d){ const e = T.inEff ? T.inEff(d.k) : undefined, v = WB.I[d.k];
  if(e===undefined) return {v:isFinite(v) ? v : '', ph:'', cls:'', t:'저장된 입력값'};
  if(e===null) return {v:'', ph:'—', cls:'wb-eff none', t:`계산에 쓰지 않음 (입력해 둔 값 ${isFinite(v) ? wbFmt(v, d.d != null ? d.d : 2) : '없음'} 은 잠금이 풀리면 돌아옴)`};
  if(e==='…') return {v:'', ph:'…', cls:'wb-eff', t:'계산이 끝나면 정해짐'};
  const dd = d.d != null ? d.d : 2, x = (+e).toFixed(Number.isInteger(+e) ? 0 : Math.max(dd, 2));   // 계산값은 소수 둘째 자리 이상 (글자로, 끝 0 유지)
  return {v:isFinite(+x) ? x : '', ph:'—', cls:'wb-eff', t:`실제로 쓰는 값 (입력해 둔 값 ${isFinite(v) ? wbFmt(v, dd) : '없음'} 은 잠금이 풀리면 돌아옴)`}; }
/* 결과가 바뀌면 잠긴 칸의 실제 값만 그 자리에서 다시 (입력 칸 전체를 다시 그리지 않음) */
function wbEffRefresh(){ const T = wbT(); if(!T || !T.inLock) return;
  document.querySelectorAll('#wb input[data-wbi]:disabled').forEach(i => { const d = T.inputs.find(q => q.k===i.dataset.wbi); if(!d) return; const ev = wbEffVal(T, d);
    i.value = ev.v; i.placeholder = ev.ph; i.className = ev.cls; i.title = ev.t; }); }
/* 입력 줄 모양 (2026-11-11): [이름 | 칸 | 단위] 한 줄, 잠김 사유는 칸 아래. 단위 열 폭 = 이 목록에서 가장 긴 단위 (오른쪽 빈 여백 줄임).
   이름 뒤 긴 괄호 설명(12자 넘음)은 이름에 마우스를 올리면 보임 (점선 밑줄) */
let WBUW = null; const wbUW = s => { try{ if(!WBUW){ WBUW = document.createElement('canvas').getContext('2d'); WBUW.font = `12px ${getComputedStyle(document.body).fontFamily}`; } return Math.ceil(WBUW.measureText(s).width); }catch(e){ return s.length*7; } };
function wbInSplit(nm){ if(/<[^>]+>/.test(nm)) return null; const i = nm.indexOf(' ('); if(i < 1 || !nm.endsWith(')')) return null; const tail = nm.slice(i + 2, -1); return tail.length > 12 ? [nm.slice(0, i), tail] : null; }
function wbInRows(list, head = true){ const T = wbT(); let g0 = ''; const uw = Math.max(18, ...list.map(d => wbUW(wbInUnit(d) || ''))) + 4;
  return list.map(d => { const db = wbDash(d.dk), v = WB.I[d.k], diff = WB.cmp && db && isFinite(v) && Math.abs(v - db.v) > 1e-9*Math.max(1, Math.abs(db.v));
    const grp = head && d.g && d.g!==g0 ? `<div class="wb-ig">${wbEsc(d.g)}</div>` : ''; g0 = d.g || g0;
    const sp = wbInSplit(String(wbInName(d))), tip = sp ? sp[1] : '';   /* 긴 괄호 설명 → 툴팁 (대시보드 연결 칸도, 2026-11-12) */
    const nm = d.dk ? `<span class="term${sp ? ' wb-inmore' : ''}" data-dk="${d.dk}" tabindex="0" role="button" aria-haspopup="dialog">${sp ? sp[0] : wbInName(d)}</span>` : sp ? `<span class="wb-inmore">${sp[0]}</span>` : wbInName(d);
    const viz = d.viz ? `<button type="button" class="wb-viz" data-wbviz="${d.k}" title="이 값의 모양을 그래프로 보기" aria-label="${wbInName(d).replace(/<[^>]+>/g, '')} 그래프로 보기"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 13 L6 8 L9 10 L14 3"/></svg></button>` : '';
    const own = db && isFinite(v) && Math.abs(v - db.v) > 1e-9*Math.max(1, Math.abs(db.v)), dot = wbInDot(d, db, v, own);
    const lk = T.inLock ? T.inLock(d.k) : '';   /* 도구가 맵으로 대신 쓰는 입력: 칸을 막고 까닭을 적음 */
    const ev = lk ? wbEffVal(T, d) : null;      /* 잠긴 칸에 보일 값: 실제로 계산에 쓰는 값 · 안 쓰면 — (저장값은 그대로 → 풀리면 되돌아옴) */
    const opt = T.inOpt ? T.inOpt(d.k) : '';   /* 도구가 이 칸 줄에 넣는 옵션 단추 (이름과 값 사이) */
    return grp + `<label class="wb-ir${diff?' diff':''}${own?' own':''}${lk?' lock':''}${d.dk || (T.lnkKeys || []).includes(d.k) ? ' wb-lnk' : ''}${!lk && wbNeedK(d.k) ? ' need' : ''}" style="--uw:${uw}px"><span class="wb-in-n"><span class="wb-in-t"${d.nFull || tip ? ` title="${wbEsc(String(d.nFull || wbInName(d)).replace(/<[^>]+>/g, ''))}"` : ''}>${dot}${nm}${viz}</span>${wbSrcTag(WB.id, d.k)}${opt}</span><input type="number" step="any" data-wbi="${d.k}" value="${lk ? ev.v : isFinite(v)?v:''}"${lk ? ` disabled placeholder="${ev.ph}"${ev.cls ? ` class="${ev.cls}"` : ''} title="${ev.t}"` : ''}><span class="wb-u">${wbEsc(wbInUnit(d))}</span>${lk ? `<span class="wb-lk">${lk}</span>` : ''}
      ${!WB.cmp ? '' : d.dk ? `<span class="wb-db">${db ? `대시보드 ${wbFmt(db.v, d.d != null ? d.d : 2)}${db.st==='ex'?' (예시값)':''}` : '대시보드 값 없음'}</span>` : '<span class="wb-db">이 도구에서만 쓰는 값</span>'}</label>`; }).join(''); }
/* 결과: 도구가 정한 묶음(outputs[].g)마다 카드. 값과 단위는 붙여 쓰고, 대시보드 키가 있으면 대시보드 값을 아래 작게(다르면 노랑).
   묶음에 grid:2 를 주면 두 칸 배치(코너웨이트처럼) */
function wbOutHTML(){ const T = wbT(), R = WB.R;
  if(WB.err) return `<p class="wb-err" role="alert">${wbEsc(WB.err)}</p>`;
  if(!R && WB.need && WB.need.length) return wbNeedHTML();
  if(!R){   /* 계산 중: 실제 카드 모양 그대로 (이전 결과 · 없으면 빈 결과로 그린 뒤 숫자 자리만 반짝이는 막대) */
    let h = ''; const D = WB.Rlast && WB.Rlast.id===WB.id ? WB.Rlast.R : {out:{}};
    try{ h = T.outHTML ? T.outHTML(D) : wbOutCards(T, D, false); }catch(e){ try{ h = wbOutCards(T, {out:{}}, false); }catch(e2){ h = ''; } }
    return h ? `<div class="wb-skelmode" aria-busy="true" aria-label="계산 중">${h}</div>` : wbSkel('cards'); }
  WB.Rlast = {id:WB.id, R};
  if(T.outHTML) return T.outHTML(R);   /* 도구가 결과 칸을 직접 그림 (도구 2P) */
  return wbOutCards(T, R, WB.cmp); }
/* 결과 카드: 도구가 정한 묶음마다. d.hide = 화면에 안 보임(검증 · 반영용), d.fmt(v, out) = 값 칸 HTML(단위 포함),
   outGroups[묶음].render(out) = 카드 본문을 도구가 직접 그림, .wide = 두 칸 너비. 대시보드 '파트별'도 같은 함수(비교 없이) */
function wbOutCards(T, R, cmp){ const out = R.out || {};
  const groups = []; T.outputs.forEach(d => { if(d.hide) return; const g = d.g || '결과'; let G = groups.find(x => x.n===g); if(!G){ G = {n:g, ds:[]}; groups.push(G); } G.ds.push(d); });
  const row = d => { const v = out[d.k], db = wbDash(d.dk), u = d.u != null ? d.u : (d.dk ? DK[d.dk].u : ''), dd = d.d||0;
    const diff = cmp && d.dk && db && isFinite(v) && Math.abs(v - db.v) > Math.pow(10, -dd)/2;
    const nm = d.dk ? `<span class="term" data-dk="${d.dk}" tabindex="0" role="button" aria-haspopup="dialog">${d.n || DK[d.dk].n}</span>` : wbEsc(d.n);
    return `<div class="wb-or${diff?' diff':''}"><span class="wb-on">${nm}</span><span class="wb-ov">${d.fmt ? d.fmt(v, out) : `<b>${wbFmt(v, dd)}</b>${u ? ` <i>${wbEsc(u)}</i>` : ''}`}</span>
      ${cmp && d.dk ? `<span class="wb-odb">${db ? `대시보드 ${d.fmt ? d.fmt(db.v, {}).replace(/<[^>]+>/g, '') : wbFmt(db.v, dd)}${db.st==='ex' ? ' (예시값)' : ''}` : '대시보드 값 없음'}</span>` : ''}</div>`; };
  return `<div class="wb-og">${groups.map(G => { const gd = (T.outGroups || {})[G.n] || {};
    return `<div class="wb-oc${gd.grid ? ' grid' : ''}${gd.wide ? ' wide' : ''}"><h4>${wbEsc(G.n)}${gd.note ? `<span>${wbEsc(gd.note)}</span>` : ''}</h4>${gd.render ? gd.render(out) : `<div class="wb-ol">${G.ds.map(row).join('')}</div>`}</div>`; }).join('')}</div>`; }
function wbXDef(){ const T = wbT(); return {n: (T.x && T.x.n) || 'x', u: (T.x && T.x.u) || ''}; }
function wbMainHTML(){ const R = WB.R; if(!R) return '';
  return wbT().figure ? wbT().figure(wbInputs(), R) : ''; }
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
/* 신호 그래프 칸: 아래로 최대 3칸, 칸마다 그릴 신호를 따로 고름. WB.sel = 지금 고른 칸의 신호 묶음 */
function wbSelReset(keys, sweep){ const S = new Set(keys || []); if(sweep){ WB.panesO = [S]; WB.piO = 0; WB.selO = S; } else { WB.panes = [S]; WB.pi = 0; WB.sel = S; } }
/* 그래프 칸이 여럿이면: 지금 고른 칸 안내 (칸 고르기 = 그래프를 누름) */
function wbPaneBar(sweep){ const P = sweep ? WB.panesO : WB.panes, pi = sweep ? WB.piO : WB.pi;
  return P.length > 1 ? `<p class="wb-swn wb-pnote">체크하면 <b>${pi+1}번 칸</b>에 그립니다 · 다른 칸은 그 그래프를 누름</p>` : ''; }
function wbSigListHTML(){ const R = WB.R; if(!R) return '';
  if(WB.xa.startsWith('in:')){ const S = WB.sw; if(!S || !S.X) return wbAxisHTML() + (S && S.err ? `<p class="wb-err">${wbEsc(S.err)}</p>` : '');
    const d = wbT().inputs.find(o => o.k===S.k);
    return wbAxisHTML() + wbPaneBar(true) + `<div class="wb-slh"><span>${wbInName(d)}</span><b>${wbFmt(S.X[WB.si], 3)} ${wbEsc(wbInUnit(d))}</b></div>` + wbSlRows(wbT().outputs.filter(o => S.O[o.k]).map(o => ({o, k:o.k, n:wbOutName(o), g:o.g, nan:wbAllNaN(S.O[o.k])})), WB.selO, ({o}) => `<div class="wb-sr${WB.actO===o.k?' act':''}">
      <input type="checkbox" data-wbso="${o.k}"${WB.selO.has(o.k)?' checked':''} aria-label="${wbEsc(wbOutName(o))} 그리기"><i style="background:${wbOutColor(o.k)}"></i>
      <button type="button" class="wb-sn" data-wbacto="${o.k}" title="이 결과의 눈금 보기">${wbOutName(o)}</button><b>${wbFmt(S.O[o.k][WB.si], o.d||0)}</b><span class="wb-u">${wbEsc(wbOutUnit(o))}</span></div>`)
      + `<p class="wb-swn">결과 숫자를 ${S.X.length}번 다시 계산해 그린 것입니다. 나머지 입력은 지금 값 그대로입니다.</p>`; }
  const xs = WB.xa.startsWith('sig:') ? wbSigDef(WB.xa.slice(4)) : null, xv = xs ? R.sig[xs.k][WB.xi] : R.x.d[WB.xi];
  return wbAxisHTML() + wbPaneBar(false) + `<div class="wb-slh"><span>${wbEsc(xs ? xs.n : wbXDef().n)}</span><b>${wbFmt(xv, xs ? (xs.d||0) : 1)} ${wbEsc(xs ? xs.u : wbXDef().u)}</b></div>` + wbSlRows((wbT().sigs || []).filter(s => R.sig[s.k]).map(s => ({s, k:s.k, n:wbEsc(s.n), g:s.g, nan:wbAllNaN(R.sig[s.k])})), WB.sel, ({s}) => `<div class="wb-sr${WB.act===s.k?' act':''}">
      <input type="checkbox" data-wbsg="${s.k}"${WB.sel.has(s.k)?' checked':''} aria-label="${wbEsc(s.n)} 그리기"><i style="background:${wbColor(s.k)}"></i>
      <button type="button" class="wb-sn" data-wbact="${s.k}" title="이 신호의 눈금 보기">${wbEsc(s.n)}</button><b>${wbFmt(R.sig[s.k][WB.xi], s.d||0)}</b><span class="wb-u">${wbEsc(s.u)}</span></div>`); }
/* 신호 고르기 창 몸통: 찾기 칸 · 값이 하나도 없는 신호 숨김 (고른 것은 늘 보임) · 묶음(g) 머리를 눌러 접기. 위 축 · 프로브 값 줄은 스크롤 밖에 그대로
   items = [{k, n (HTML 이름), g (묶음), nan (값이 하나도 없음)}], row = 한 줄 HTML. 묶음 순서 = 도구의 sigGroups, 없으면 처음 나온 차례 */
const WBNAN = new WeakMap();
function wbAllNaN(a){ if(!a || !a.length) return true; let v = WBNAN.get(a); if(v===undefined){ v = !Array.prototype.some.call(a, Number.isFinite); WBNAN.set(a, v); } return v; }
function wbSlRows(items, sel, row){ const q = (WB.slq || '').trim().toLowerCase(), cz = WB.slc || (WB.slc = new Set()), ord = wbT().sigGroups || [];
  const txt = h => String(h).replace(/<[^>]+>/g, '').toLowerCase(), hidN = items.filter(o => o.nan && !sel.has(o.k)).length;
  const L = items.filter(o => (WB.slall || !o.nan || sel.has(o.k)) && (!q || txt(o.n).includes(q) || o.k.toLowerCase().includes(q)));
  const oi = g => { const i = ord.indexOf(g); return i < 0 ? 1e3 : i; }, gs = [...new Set(L.map(o => o.g || ''))].sort((a, b) => oi(a) - oi(b)), head = gs.some(g => g);
  let h = '';
  gs.forEach(g => { const rs = L.filter(o => (o.g || '')===g), key = WB.id + '|' + g, shut = !q && cz.has(key), ns = rs.filter(o => sel.has(o.k)).length;
    if(head) h += `<button type="button" class="wb-sgh" data-wbsgh="${wbEsc(key)}" aria-expanded="${!shut}"><span class="wb-sgc" aria-hidden="true">${shut ? '▸' : '▾'}</span>${wbEsc(g || '기타')}<span class="wb-sgn">${ns ? `${ns} / ` : ''}${rs.length}</span></button>`;
    if(!shut) h += rs.map(row).join(''); });
  if(!L.length){ const hq = q ? items.filter(o => o.nan && (txt(o.n).includes(q) || o.k.toLowerCase().includes(q))).length : 0;
    h = `<p class="wb-swn">${hq ? `값이 하나도 없는 신호만 ${hq}개 맞습니다 (계산 설정에서 꺼짐) · 위 [안 쓰는 신호 보기]로 볼 수 있습니다.` : q ? '찾는 이름이 없습니다.' : '그릴 값이 없습니다.'}</p>`; }
  const tb = `<div class="wb-slt"><input type="search" data-wbslq placeholder="이름으로 찾기" value="${wbEsc(WB.slq || '')}" aria-label="신호 찾기">`
    + (hidN || WB.slall ? `<button type="button" class="wb-slx" data-wbslall aria-pressed="${!!WB.slall}" title="계산 설정에서 꺼져 값이 하나도 없는 신호">${WB.slall ? '안 쓰는 신호 숨기기' : `안 쓰는 신호 ${hidN}개 보기`}</button>` : '') + '</div>';
  return tb + `<div class="wb-slb">${h}</div>`; }
/* 신호 고르기 창을 다시 그림: 스크롤 위치 · 찾기 칸 글자 자리는 그대로 (프로브를 끌 때마다 다시 그림) */
function wbSlPaint(){ const el = $('#wbsl'); if(!el) return; const b = el.querySelector('.wb-slb'), st = b ? b.scrollTop : 0, a = document.activeElement;
  const q = a && a.matches && a.matches('#wbsl [data-wbslq]') ? [a.selectionStart, a.selectionEnd] : null;
  el.innerHTML = wbSigListHTML(); const b2 = el.querySelector('.wb-slb'); if(b2) b2.scrollTop = st;
  if(q){ const i = el.querySelector('[data-wbslq]'); if(i){ i.focus(); try{ i.setSelectionRange(q[0], q[1]); }catch(e){} } } }
document.addEventListener('input', e => { const t = e.target; if(!t.matches || !t.matches('#wbsl [data-wbslq]')) return; WB.slq = t.value; wbSlPaint(); });
document.addEventListener('click', e => { const t = e.target; if(!t.closest || !t.closest('#wbsl')) return;
  const g = t.closest('[data-wbsgh]'); if(g){ const k = g.dataset.wbsgh, cz = WB.slc || (WB.slc = new Set()); cz.has(k) ? cz.delete(k) : cz.add(k); wbSlPaint(); return; }
  if(t.closest('[data-wbslall]')){ WB.slall = !WB.slall; wbSlPaint(); } });
function wbSigHTML(){ const R = WB.R; if(!R) return '';
  if(WB.xa.startsWith('in:')){ const S = WB.sw; if(!S || !S.X) return wbSkel('plot');
    const d = wbT().inputs.find(o => o.k===S.k), x = {d:S.X, n:wbInName(d).replace(/<[^>]+>/g, ''), u:wbInUnit(d)};
    return wbPanes(WB.panesO, WB.piO, P => [...P].map(k => wbOutDef(k)).filter(Boolean).map(o => ({k:o.k, d:S.O[o.k], c:wbOutColor(o.k), n:wbOutName(o).replace(/<[^>]+>/g, ''), u:wbOutUnit(o), dd:o.d})), x, WB.si, WB.actO, '입력 훑기 그래프', '결과'); }
  const xs = WB.xa.startsWith('sig:') ? wbSigDef(WB.xa.slice(4)) : null, x = xs ? {d:R.sig[xs.k], n:xs.n, u:xs.u} : {d:R.x.d, ...wbXDef()};
  return wbPanes(WB.panes, WB.pi, P => [...P].filter(k => R.sig[k]).map(k => ({k, d:R.sig[k], c:wbColor(k), n:wbSigDef(k).n, u:wbSigDef(k).u, dd:wbSigDef(k).d})), x, WB.xi, WB.act, '신호 선택 그래프', '신호'); }
/* 그래프 칸: 칸마다 높이(아래 경계를 끌어 바꿈) · 지우기 ×, 맨 아래 [+ 그래프 칸]. 칸을 누르면 그 칸을 고름 */
let WB_PH = []; try{ WB_PH = JSON.parse(localStorage.getItem('run2x.wb.ph') || '[]') || []; }catch(e){ WB_PH = []; }
const wbPh = (i, n) => WB_PH[i] > 0 ? WB_PH[i] : (n===1 ? 300 : n===2 ? 230 : 200);
/* 그래프 칸마다 상자 하나. 위 오른쪽 단추줄: [프로브 · 이동 · 영역 확대] (모드, 모든 칸 같음) · [+ · − · 맞춤] · ×
   x 보기 범위는 모든 칸이 같이 (WB.zx, MATLAB linkaxes x), y 는 칸마다 (WB.zy[i]). 휠 = x 확대 · Shift + 휠 = 그 칸 y 확대 (칸을 눌러 켠 뒤), 더블클릭 = 처음 범위 */
const WB_ZM = [['cur', '프로브', '누르거나 끌면 프로브'], ['pan', '이동', '끌어서 보기 범위 옮김'], ['box', '영역 확대', '끌어서 사각형 영역을 확대']];
const wbZx = () => WB.zx && WB.zx.key===WB.xa ? WB.zx : null;
function wbPanes(P, pi, mk, x, xi, act, label, what){ const zm = WB.zm || 'cur';
  return P.map((S, i) => { const ys = mk(S), h = wbPh(i, P.length), zy = WB.zy && WB.zy[i];
    const tb = `<div class="wb-ptb" role="toolbar" aria-label="${i+1}번 그래프 칸 보기">${WB_ZM.map(([k, t, ti]) => `<button type="button" data-wbzm="${k}" aria-pressed="${zm===k}" title="${ti}">${t}</button>`).join('')}`
      + (P.length > 1 ? `<i></i><button type="button" class="wb-ppx" data-wbpdel="${i}" aria-label="${i+1}번 칸 지우기" title="이 칸 지우기">×</button>` : '') + '</div>';
    const body = wbPlot({id:'sig', w:1100, h, x, ys, act, xi, label:`${label} ${i+1}`, zx:wbZx(), zy, clip:`p${i}`, dots:WB.xa.startsWith('sig:')});
    const hint = ys.length ? '' : `<p class="wb-pempty">왼쪽에서 ${P.length > 1 ? `${i+1}번 칸에 ` : ''}그릴 ${what}를 고르십시오.</p>`;
    return `<div class="wb-pp${P.length > 1 && i===pi ? ' on' : ''}" data-wbpi="${i}" data-zoombox="pane${i}">${tb}${body}${hint}<div class="wb-ph" data-wbph="${i}" title="끌어서 높이 조절" aria-hidden="true"></div></div>`; }).join('')
    + (P.length < 3 ? '<div class="wb-padd"><button type="button" class="btn small" data-wbpadd>+ 그래프 칸</button></div>' : ''); }
function wbPaint(which){ const all = !which, m = $('#wb'); if(!m || m.hidden) return;
  if((all || which.includes('tabs')) && $('#wbtabs')){ $('#wbtabs').innerHTML = wbTabsHTML(); const mt = $('#wbtabm'); if(mt) mt.textContent = WB.tab==='edit' ? '입력을 고치면 바로 다시 계산합니다 (결과는 [결과] 탭)' : ''; }
  if((all || which.includes('tabs') || which.includes('in')) && $('#wbedit')){ const a = document.activeElement, k = a && a.dataset ? a.dataset.wbi : null; $('#wbedit').innerHTML = wbEditHTML(); if(k){ const n = $('#wbedit').querySelector(`[data-wbi="${k}"]`); if(n) n.focus(); } }
  if((which && which.includes('tabs')) && $('#wbext') && wbT().extHTML){ $('#wbext').innerHTML = wbT().extHTML(); }
  if(all || which.includes('in')){ $('#wbin').innerHTML = wbInHTML(); if(!all && !which.includes('ext') && wbT().inExt && $('#wbext')) $('#wbext').innerHTML = wbT().extHTML(); }   /* 입력을 도구 화면에 그리는 도구: 그 화면도 다시 */
  if(all || which.includes('out')) $('#wbout').innerHTML = wbOutHTML();
  if((all || which.includes('main')) && $('#wbmain')){ $('#wbmain').innerHTML = wbMainHTML(); if(wbT().editFig && WB.tab==='edit' && $('#wbedit')) $('#wbedit').innerHTML = wbEditHTML(); }   /* 도구가 그림(figure)을 줄 때만 있음. 선 그래프 결과는 신호 선택 그래프 하나로 */
  if((all || which.includes('ext')) && $('#wbext')) $('#wbext').innerHTML = wbT().extHTML();
  if((all || which.includes('ext') || which.includes('mid')) && $('#wbmid')) $('#wbmid').innerHTML = wbT().midHTML();   /* 도구 영역: 결과와 신호 그래프 사이 */
  if((all || which.includes('sig')) && $('#wbsl')){ wbSlPaint(); $('#wbsig').innerHTML = wbSigHTML(); }
  if(all || which.includes('stat')){ $('#wbstat').textContent = WB.err ? '' : (WB.R ? `계산 ${WB.ms < 1 ? '1 ms 미만' : Math.round(WB.ms) + ' ms'} · Web Worker` : ''); const c = $('#wbcodeon'); if(c) c.hidden = WB.code[WB.id] == null; } }

/* 다시 그린 뒤에도 빈 필수 칸 표시 유지 (도구 화면을 새로 그려도) */
{ const _wbPaint = wbPaint; wbPaint = function(which){ _wbPaint(which); if((WB.need || []).length) wbNeedMark(); }; }
/* ---------- 사용법 단계의 탭: 결과 쪽 선택자면 결과, 입력 · 도구 입력 화면이면 편집 ---------- */
function wbTourTabs(T){ if(!T || !T.tour || T.__tt || !wbTabs(T)) return; T.__tt = true;
  T.tour = T.tour.map(st => { const sel = String(st[0] || ''); if(/wb-bar|wb-tabsec/.test(sel)) return st;
    const res = /wbout|wbmain|wb-sig|wbsig|wbmid|wb-two|wbstat|t4-pw/.test(sel), tab = res ? 'res' : 'edit';
    const sel2 = /\.wb-in\b/.test(sel) ? '#wb #wbedit' : sel;
    return [sel2, st[1], st[2], {...(st[3] || {}), wbtab:tab}, ...st.slice(4)]; }); }
/* ---------- 열기 · 닫기 · 입력 기억 ---------- */
/* ---------- 도구끼리 같이 쓰는 입력 (share): 같은 브라우저 안에서 한 벌. 고른 도구 어디서 고쳐도 다른 도구가 열 때 그 값을 씀
   hp = 서스 하드포인트 (도구 5 · 6 · 7 · 8, 키 '앞 f / 뒤 r _ 점 _ x · y · z'). 상세 제원이라 팀 저장소에는 두지 않고, 파일(.xlsx · .csv · .json)로 주고받음 */
const WB_SHARE = {hp:{re:/^[fr]_[a-z]{2}_[xyz]$/, key0:'run2x.wb.share.hp', n:'하드포인트', get key(){ return wbMK(this.key0); }}};
function wbShareGet(sh){ try{ const o = JSON.parse(localStorage.getItem(WB_SHARE[sh].key) || '{}'); return o && typeof o==='object' ? o : {}; }catch(e){ return {}; } }
function wbShareSet(sh, I){ const S = WB_SHARE[sh]; if(!S) return; const o = wbShareGet(sh); let ch = false;
  Object.keys(I).forEach(k => { if(S.re.test(k) && typeof I[k]==='number' && isFinite(I[k]) && o[k]!==I[k]){ o[k] = I[k]; ch = true; } });
  if(ch) try{ localStorage.setItem(S.key, JSON.stringify(o)); }catch(e){} }
function wbLoad(id){ const T = WB_TOOLS[id], I = {}; let saved = {};
  try{ saved = JSON.parse(localStorage.getItem(wbStoreKey(id)) || '{}') || {}; }catch(e){ saved = {}; }
  const sh = T.share && WB_SHARE[T.share] ? wbShareGet(T.share) : null, re = sh ? WB_SHARE[T.share].re : null;
  T.inputs.forEach(d => { const c = sh && re.test(d.k) ? sh[d.k] : undefined, s = saved[d.k];
    I[d.k] = typeof c==='number' && isFinite(c) ? c : typeof s==='number' && isFinite(s) ? s : (wbEx() || d.ui==='none' || d.keep ? d.v : NaN); });   /* 같이 쓰는 값 > 이 도구 저장값 > (예제 = 기본값 · 내 파일 = 빈칸, 모델 선택 · 고정 상수(ui:'none') · 운전자 계수(keep)는 늘 기본) */
  return I; }
function wbSave(){ try{ localStorage.setItem(wbStoreKey(WB.id), JSON.stringify(WB.I)); }catch(e){} const T = WB_TOOLS[WB.id]; if(T && T.share) wbShareSet(T.share, WB.I); }
/* 하드포인트 파일: 행 = 축 · 점 · 이름 · x · y · z [mm] (차량 좌표: x 앞 · y 바깥 · z 위, 왼쪽 바퀴). 도구 5 · 6 · 7 · 8 의 점을 모두 담음 */
function wbHpRows(){ const o = wbShareGet('hp'), cur = WB.I || {}, val = (k, d) => typeof cur[k]==='number' && WB_SHARE.hp.re.test(k) ? cur[k] : typeof o[k]==='number' ? o[k] : d;
  const rows = [['# Run2X 하드포인트 (도구 5 · 6 · 7 · 8 공통) · 단위 mm · 차량 좌표 x 앞 · y 바깥 · z 위 (왼쪽 바퀴, x 0 = 그 축 바퀴 중심)'], ['축', '점', '이름', 'x', 'y', 'z']];
  if(typeof K3D_HP==='undefined') return rows;
  ['f', 'r'].forEach(s => Object.keys(K3D_HP[s]).forEach(p => { const nm = (s === 'r' && typeof K3D_PNR!=='undefined' && K3D_PNR[p]) || (typeof K3D_PN!=='undefined' && K3D_PN[p]) || p;
    rows.push([s === 'f' ? '앞' : '뒤', p, nm, ...['x', 'y', 'z'].map((c, j) => val(`${s}_${p}_${c}`, K3D_HP[s][p][j]))]); }));
  return rows; }
function wbHpExport(kind){ const rows = wbHpRows(), day = new Date().toISOString().slice(0,10); let blob, name;
  if(kind==='xlsx' && typeof t2XlsxBlob==='function'){ blob = t2XlsxBlob(rows); name = `run2x_hardpoints_${day}.xlsx`; }
  else { const pts = {}; rows.slice(2).forEach(r => ['x', 'y', 'z'].forEach((c, j) => { pts[`${r[0]==='앞' ? 'f' : 'r'}_${r[1]}_${c}`] = r[3 + j]; }));
    blob = new Blob([JSON.stringify({format:'run2x-hp', ver:1, at:new Date().toISOString(), unit:'mm', pts}, null, 2)], {type:'application/json'}); name = `run2x_hardpoints_${day}.json`; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0); }
async function wbHpImport(file){ const ext = (file.name.split('.').pop() || '').toLowerCase(), got = {};
  try{
    if(ext==='json'){ const d = JSON.parse(await file.text()); const P = d && (d.format==='run2x-hp' ? d.pts : d.format==='run2x-tool' ? d.inputs : null);
      if(!P) throw new Error('하드포인트 파일(.json)이 아닙니다.'); Object.keys(P).forEach(k => { if(WB_SHARE.hp.re.test(k) && typeof P[k]==='number' && isFinite(P[k])) got[k] = P[k]; }); }
    else { if(typeof t2ReadCells!=='function') throw new Error('파일 읽기 기능을 찾지 못했습니다.');
      const cells = await t2ReadCells(file), ax = v => { v = String(v || '').trim(); return /^(앞|f|front)$/i.test(v) ? 'f' : /^(뒤|r|rear)$/i.test(v) ? 'r' : ''; };
      cells.forEach(r => { if(!r || String(r[0] || '').trim().startsWith('#')) return; const s = ax(r[0]), p = String(r[1] || '').trim().toLowerCase();
        if(!s || typeof K3D_HP==='undefined' || !K3D_HP[s][p]) return; ['x', 'y', 'z'].forEach((c, j) => { const v = parseFloat(String(r[3 + j]).replace(/,/g, '')); if(isFinite(v)) got[`${s}_${p}_${c}`] = v; }); }); }
    const n = Object.keys(got).length; if(!n) throw new Error('점 값을 찾지 못했습니다. 열 = 축(앞 · 뒤) · 점 · 이름 · x · y · z.');
    wbShareSet('hp', got); Object.keys(got).forEach(k => { if(WB.I && k in WB.I) WB.I[k] = got[k]; });
    wbSave(); wbPaint(['in']); wbCalc(); toast(`${file.name}: 하드포인트 값 ${n}개를 넣었습니다 (도구 5 · 6 · 7 · 8 공통).`); }
  catch(err){ toast((err && err.message) || '파일을 읽지 못했습니다.'); } }
function wbOpen(id, ret, mode){ if(!WB_TOOLS[id]) return; const T = WB_TOOLS[id], was = !!WB.id;
  wbModeSet(mode || (WB.id ? WBMODE : 'nf'));   /* 목록에서 고른 모드 · 도구 안에서 넘어가면 지금 모드 그대로 */
  WB.id = id; WB.need = []; WB.ret = ret || null; WB.I = wbLoad(id); WB.R = null; WB.err = ''; WB.xi = 0; WB.slq = '';
  wbSelReset(T.sigOn || (T.sigs || []).slice(0, 3).map(s => s.k)); WB.act = [...WB.sel][0] || ''; WB.xa = ''; WB.sw = null; WB.si = 0; wbSelReset([], true); WB.actO = '';
  WB.tab = wbTabs(T) ? wbTabGet(id) : 'res'; WB.esec = WB.esec || 'c'; wbTourTabs(T);
  WB.needShow = false; if(!wbEx()){ WB.need = wbNeed(); if(WB.need.length){ if(wbTabs(T)) WB.tab = 'edit'; if(T.onNeedOpen) T.onNeedOpen(); } }   /* 내 파일 빈칸: 편집 탭에서 시작 */
  const m = wbEl(); m.innerHTML = wbShellHTML(); m.hidden = false; document.documentElement.classList.add('wb-lock');
  m.classList.remove('t2-edit', 'm1-on', 'm1-tabdim');   /* 도구 2P 편집 탭 표시가 다른 도구로 남아 결과를 가리던 것 (2026-11-11). 2P 는 그릴 때 다시 붙임 */
  m.classList.toggle('wb-exmode', wbEx()); m.classList.toggle('wb-tabbed', wbTabs(T)); m.classList.toggle('wb-edit', wbTabs(T) && WB.tab==='edit'); m.classList.toggle('wb-res', wbTabs(T) && WB.tab!=='edit');
  wbPaint(); wbCalc().then(() => { if(WB.R && WB.R.x && (T.xiStart === 'end' || T.xiStart === 'mid')) { WB.xi = T.xiStart === 'mid' ? Math.floor((WB.R.x.d.length - 1) / 2) : WB.R.x.d.length - 1; wbPaint(['main','sig']); wb3dUpdate(); } });
  wb3dOpen(); const f = m.querySelector('[data-wbx]'); if(f) f.focus(); wbNavPush(!was); }
/* 예제 처음으로: 이 도구의 예제 저장본을 지우고 다시 읽음 (도구 바깥 표 · 회로는 도구가 T.exReset 으로) */
function wbExReset(){ if(!wbEx() || !WB.id) return; const id = WB.id, T = wbT();
  try{ localStorage.removeItem(wbStoreKey(id)); if(T.share && WB_SHARE[T.share]) localStorage.removeItem(WB_SHARE[T.share].key); }catch(e){}
  if(T.exReset) T.exReset(); WB.I = wbLoad(id); WB.R = null; wbPaint(); wbCalc(); toast('예제를 처음 상태로 되돌렸습니다.'); }
function wbClose(){ const m = $('#wb'); if(!m || m.hidden) return; wb3dClose(); m.hidden = true; m.innerHTML = ''; m.classList.remove('wb-tabbed', 'wb-edit', 'wb-res');
  document.documentElement.classList.remove('wb-lock'); if(WB.worker){ WB.worker.terminate(); WB.worker = null; WB.wsrc = ''; }
  m.classList.remove('wb-exmode', 't2-edit', 'm1-on', 'm1-tabdim'); if(WB.ret && WB.ret.isConnected) WB.ret.focus(); WB.id = null;
  wbModeSet('nf'); WBNAV.last = '';
  if(!WBNAV.pop && !window.DEBUG && typeof navState==='function'){ try{ history.pushState(navState(), '', location.hash); }catch(e){} } }   /* 단추로 닫으면 사이트 기록을 한 칸 (뒤로가기 = 닫기 전 도구 화면) */

/* ---------- 도구 안 뒤로가기 · 앞으로가기 (2026-11-11) ----------
   도구를 열 때 기록을 한 칸 쌓고, 도구 안에서 화면이 바뀔 때마다(결과 · 편집 탭, 도구 하위 탭 T.navGet, 다른 도구로 건너가기) 한 칸씩.
   도구를 연 첫 화면에서 뒤로가기 = 도구를 닫고 도구 목록. 기록 칸 = {wb:{id, m 모드, t 탭, s 도구 하위 탭}} */
const WBNAV = {last:'', pop:false};
const wbNavSnap = () => { const T = wbT(); return {id:WB.id, m:WBMODE, t:wbTabs(T) ? (WB.tab || 'res') : '', s:T && T.navGet ? T.navGet() : null, bg:typeof TAB!=='undefined' ? TAB : ''}; };
function wbNavPush(first){ if(window.DEBUG || WBNAV.pop || !WB.id) return; const s = wbNavSnap(), k = JSON.stringify(s); if(!first && k===WBNAV.last) return; WBNAV.last = k;
  try{ if(first && typeof navState==='function') history.replaceState(navState(), '', location.hash); history.pushState({wb:s}, '', location.hash); }catch(e){} }
document.addEventListener('click', e => { if(WB.id && e.target.closest && e.target.closest('#wb')) setTimeout(() => wbNavPush(false), 0); });
window.addEventListener('popstate', e => { const s = e.state && e.state.wb;
  WBNAV.pop = true;
  try{ if(!s){ if(WB.id){ wbModalClose(); wbClose(); } return; }
    if(s.bg && typeof TAB!=='undefined' && TAB!==s.bg){ showTab(s.bg, true); try{ history.replaceState(e.state, '', location.hash); }catch(_){} }   /* 도구 뒤 사이트 탭 */
    if(WB.id!==s.id || WBMODE!==s.m) wbOpen(s.id, null, s.m);
    const T = wbT(); if(!T) return; if(s.t && wbTabs(T) && (WB.tab || 'res')!==s.t) wbTabSet(s.t); if(s.s && T.navSet) T.navSet(s.s); }
  finally{ WBNAV.pop = false; if(WB.id) WBNAV.last = JSON.stringify(wbNavSnap()); } });   /* 작업창 밖(파트 페이지 등)은 늘 내 파일(실제 설계) 쪽 상태 */

/* ---------- 작은 창 (검증표 · 코드 보기 · 대시보드에 반영) ---------- */
function wbModal(html, cls){ let m = $('#wbm'); if(!m){ m = document.createElement('div'); m.id = 'wbm'; m.className = 'dv-modal wb-modal'; document.body.appendChild(m); }
  m.innerHTML = `<div class="dvm-box ${cls||''}" role="dialog" aria-modal="true" aria-labelledby="wbm-t">${html}</div>`; m.hidden = false;
  const f = m.querySelector('textarea, input, button:not(.dvi-x)') || m.querySelector('button'); if(f) f.focus(); return m; }
function wbModalClose(){ const m = $('#wbm'); if(m && !m.hidden){ m.hidden = true; m.innerHTML = ''; return true; } return false; }
const wbMHead = t => `<div class="dvi-h"><b id="wbm-t">${t}</b><button type="button" class="dvi-x" data-wbmx aria-label="닫기">×</button></div>`;
/* 코드 · 검증 창 위 탭: 코드(보기 · 고치기) | 검증(검증표) */
const wbCTabs = on => `<div class="m1-tabs wb-ctabs" role="tablist"><button type="button" role="tab" data-wbcode aria-selected="${on==='code'}">코드</button><button type="button" role="tab" data-wbver aria-selected="${on==='ver'}">검증표</button></div>`;
/* 검증표: 손계산·문헌값과 지금 코드의 결과를 나란히 */
async function wbVerify(){ const T = wbT(), code = wbCode(); wbModal(wbMHead('코드 · 검증') + wbCTabs('ver') + '<div class="dvi-body"><p class="wb-empty">계산 중…</p></div>', 'wb-wide');
  const rows = []; let pass = 0, n = 0;
  for(const c of (T.verify || [])){ const I = {...T.inputs.reduce((o, d) => (o[d.k] = d.v, o), {}), ...(T.verifyBase || {}), ...c.I}, r = await wbRun(I, code);
    Object.entries(c.expect).forEach(([k, ex]) => { const d = T.outputs.find(o => o.k===k) || {n:k, u:'', d:3}, got = r.ok && r.r.out ? r.r.out[k] : NaN;
      /* 허용 오차: 상대 0.1 % (값이 1 보다 작으면 절대 0.001). 온도 [°C] 는 절대 ±0.001 °C (°C 는 0 점이 임의라 상대 오차가 뜻이 없음 — 30 °C 의 0.1 % = 0.03 K 지만 300 K 로 보면 0.3 K) */
      const uu = d.u || (d.dk && DK[d.dk] ? DK[d.dk].u : ''), tC = uu==='°C', tol = c.tol != null ? c.tol : 0.001, ok = isFinite(got) && (tC && c.tol == null ? Math.abs(got - ex) <= 0.001 : Math.abs(got - ex) <= tol*Math.max(1, Math.abs(ex))); n++; if(ok) pass++;
      rows.push(`<tr class="${ok?'ok':'ng'}"><td>${wbEsc(c.n)}</td><td>${d.dk && DK[d.dk] ? DK[d.dk].n : wbEsc(d.n)}</td><td>${wbFmt(ex, (d.d||0)+1)}</td><td>${r.ok ? wbFmt(got, (d.d||0)+1) : '<span class="wb-err">' + wbEsc(r.err) + '</span>'}</td><td>${wbEsc(d.u || (d.dk && DK[d.dk] ? DK[d.dk].u : ''))}</td><td>${ok?'통과':'<b>다름</b>'}</td><td class="muted">${wbEsc(c.src||'')}</td></tr>`); }); }
  const m = $('#wbm'); if(!m || m.hidden) return;
  if(!m.querySelector('[data-wbver][aria-selected="true"]')) return;
  m.querySelector('.dvm-box').innerHTML = wbMHead('코드 · 검증') + wbCTabs('ver') + `<p class="wb-cnote muted">답을 이미 아는 단순한 경우(해석해 · 손계산)에서 지금 코드의 결과가 같은지 봅니다. 코드를 고친 뒤 기존 식이 깨지지 않았는지 확인하는 용도입니다.</p><div class="dvi-body"><table class="dvi-t wb-vt"><thead><tr><th>경우</th><th>항목</th><th>기대값</th><th>계산값</th><th>단위</th><th>판정</th><th>기대값 근거</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <div class="dvi-foot"><span class="muted">${pass} / ${n} 통과 · 허용 오차 상대 0.1 % (온도 °C 는 ±0.001 °C)${WB.code[WB.id]!=null ? ' · 고친 코드로 계산' : ''}</span><span class="dvi-btns"><button type="button" class="btn small" data-wbmx>닫기</button></span></div>`; }
/* 코드 보기: 고친 코드는 이 창을 닫아도 작업창이 열려 있는 동안만 쓰이고, 다시 열면 원래 코드 */
function wbCodeOpen(){ wbModal(wbMHead('코드 · 검증') + wbCTabs('code') + `<p class="wb-cnote muted">입력 <code>I</code>(왼쪽 입력 칸의 키)를 받아 <code>out</code>(결과 숫자) · <code>x</code>(가로축) · <code>sig</code>(신호) · <code>main</code>(결과 그래프에 그릴 신호)를 돌려주는 <code>calc(I)</code> 함수입니다. 고친 코드는 저장되지 않으며, 작업창을 다시 열면 원래 코드로 돌아갑니다. 계산은 페이지와 떨어진 Web Worker에서 돌아갑니다.</p>
    <div class="dvi-body"><textarea class="wb-ta" spellcheck="false" aria-label="계산 코드">${wbEsc(wbCode())}</textarea></div>
    <div class="dvi-foot"><span class="wb-cmsg muted" id="wbcmsg"></span><span class="dvi-btns"><button type="button" class="btn small" data-wbcreset>원래 코드로</button><button type="button" class="btn small" data-wbmx>닫기</button><button type="button" class="btn small pri" data-wbcrun>이 코드로 계산</button></span></div>`, 'wb-wide wb-codebox'); }
/* 대시보드에 반영: 대시보드 키가 있는 결과만. 담당이 아닌 값은 고를 수 없음. 반영한 값은 '계산값', 출처 = 도구 이름 */
/* [대시보드에 반영] (2026-11-12): 계산 결과(출력) + 이 도구 입력 중 대시보드 칸인 것. 권한은 칸의 담당 파트 (도구와 상관없음) → 담당인 입력 칸만 보임.
   같은 칸에 입력이 둘 이상(예: 댐퍼 앞 · 뒤)이면 값이 같을 때만 보냄. 처음 체크 = 계산값은 대시보드와 다를 때, 입력값은 대시보드가 비었을 때만 (다른 도구에서 받아 쓰는 입력이 대시보드를 덮지 않게) */
function wbPutRows(){ const T = wbT(), R = WB.R, rows = [], seen = new Set();
  (T.outputs || []).filter(d => d.dk && R && R.out && isFinite(R.out[d.k])).forEach(d => { seen.add(d.dk); rows.push({dk:d.dk, d:d.d||0, v:+R.out[d.k].toFixed(d.d||0), kind:'계산값', st:'calc'}); });
  const by = {}; T.inputs.filter(d => d.dk && d.ui!=='none' && !seen.has(d.dk) && isFinite(WB.I[d.k]) && !(T.inLock && T.inLock(d.k))).forEach(d => { (by[d.dk] = by[d.dk] || []).push(d); });
  Object.entries(by).forEach(([dk, L]) => { if(!canEditDv(dk)) return; const vs = [...new Set(L.map(d => +(+WB.I[d.k]).toFixed(L[0].d != null ? L[0].d : 2)))];
    rows.push({dk, d:L[0].d != null ? L[0].d : 2, v:vs[0], kind:'입력값', st:'ok', bad:vs.length > 1 ? `값이 다름 (${vs.map(v => wbFmt(v, L[0].d != null ? L[0].d : 2)).join(' · ')})` : ''}); });
  return rows; }
function wbPutOpen(){ const T = wbT(); const rows = wbPutRows(); WB.put = rows;
  if(!rows.length){ wbModal(wbMHead('대시보드에 반영') + `<div class="dvi-body"><p class="muted">보낼 값이 없습니다.</p></div><div class="dvi-foot"><span></span><button type="button" class="btn small" data-wbmx>닫기</button></div>`); return; }
  wbModal(wbMHead('대시보드에 반영') + `<div class="dvi-body"><table class="dvi-t"><thead><tr><th></th><th>항목</th><th>종류</th><th>대시보드 지금</th><th>보낼 값</th></tr></thead><tbody>${rows.map((r, i) => { const db = wbDash(r.dk), ok = canEditDv(r.dk) && !r.bad, same = db && db.st!=='ex' && Math.abs(db.v - r.v) <= 1e-9*Math.max(1, Math.abs(r.v)), u = DK[r.dk].u ? ' ' + DK[r.dk].u : '';
      return `<tr${ok ? '' : ' class="off"'}><td><input type="checkbox" data-wbpk="${i}"${ok && !same && (r.st==='calc' || !db || db.st==='ex') ? ' checked' : ''}${ok ? '' : ' disabled'} aria-label="${wbEsc(String(DK[r.dk].n).replace(/<[^>]+>/g, ''))}"></td><td>${DK[r.dk].n}${canEditDv(r.dk) ? '' : ' <span class="muted">(담당 아님)</span>'}</td><td class="muted">${r.kind}</td><td>${db && db.st!=='ex' ? wbFmt(db.v, r.d) + u : '—'}</td><td>${r.bad ? `<span class="muted">${r.bad}</span>` : `<b>${wbFmt(r.v, r.d)}</b>${u}`}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="dvi-foot"><span class="muted">출처 '${wbEsc(T.name)}'</span><span class="dvi-btns"><button type="button" class="btn small" data-wbmx>취소</button><button type="button" class="btn small pri" data-wbpgo>체크한 것 반영</button></span></div>`); }
async function wbPutGo(){ const T = wbT(), m = $('#wbm'); let n = 0;
  for(const cb of m.querySelectorAll('[data-wbpk]:checked')){ const r = (WB.put || [])[+cb.dataset.wbpk]; if(!r) continue;
    if(await dvSave(r.dk, {v: r.v, st: r.st, src: T.name})) n++; }
  wbModalClose(); toast(`${n}개 값을 대시보드에 반영했습니다.`); wbPaint(['in','out']); }
/* ---------- 도구 연결 (2026-11-11): 다른 도구와 주고받는 것을 한 창에 (체크해서 가져오기 · 보내기)
   도구가 T.links() → {get:[행], send:[행], info:[글]}, 행 = {tool 상대 도구, n 무엇, to 덮어쓸 곳, now 지금, val 가져올 · 보낼 값, ok, why 못 하는 까닭, run()}.
   run() 은 그 행을 실제로 복사하고 짧은 글을 돌려줌. 가져온 칸 · 표에는 출처 표시 (wbSrcSet), 사용자가 그 칸을 고치면 지움 */
/* 대시보드에서 가져오기 (예전 [대시보드 값으로 채우기], 2026-11-11): 대시보드 키가 있는 입력마다 한 줄 */
function wbDashRows(){ const T = wbT(); return T.inputs.filter(d => d.dk && !d.ui).map(d => { const db = wbDash(d.dk), v = WB.I[d.k], u = wbInUnit(d), dd = d.d != null ? d.d : 2, same = db && isFinite(v) && Math.abs(v - db.v) <= 1e-9*Math.max(1, Math.abs(db.v));
  return {tool:'대시보드', n:String(wbInName(d)).replace(/<[^>]+>/g, ''), to:`입력 › ${wbEsc(d.g || '')}`, now:isFinite(v) ? `${wbFmt(v, dd)} ${wbEsc(u)}` : '—', val:db ? `${wbFmt(db.v, dd)} ${wbEsc(u)}` : '', ok:!!db && !same, why:db ? '같은 값' : '대시보드 값 없음', dash:true, run(){ WB.I[d.k] = db.v; return ''; }}; }); }
/* [도구 연결]: 가져오기만 (다른 도구로 보내기는 없음 — 한 도구가 다른 도구 값을 멋대로 바꾸는 일, 2026-11-12).
   거르기는 엑셀처럼 열 머리 ▾ (2026-11-12): 무엇을 (다른 도구 = 도구) · 어디에. 그리고 [가져올 값 없는 줄 제외] 하나. 숨긴 줄은 모두 고르기 · 가져오기에서 빠짐.
   대시보드는 묶음끼리 모으고 묶음마다 줄 띄움 */
const wbLinkCat = r => r.cat || String(r.to || '').replace(/<[^>]+>/g, '').replace(/^(입력|편집) › /, '').split(' › ')[0].replace(/ \(.*$/, '');
const wbLinkEmpty = v => { const t = String(v == null ? '' : v).replace(/<[^>]+>/g, '').trim(); return !t || t==='—' || t==='비어 있음' || /^—( ·|$)/.test(t) && !/[0-9]/.test(t); };
const WBLCOL = {tool:'wblt', cat:'wblc', ne:'wblne', ve:'wblve'};
function wbLinkOpen(){ const T = wbT(); if(!T) return; const L = (T.links ? T.links() : null) || {}; L.dash = wbDashRows(); delete L.send; WB.lk = L; WB.lkf = {get:{}, dash:{}};
  const fb = (dir, col, nm) => `<span class="wbl-th">${nm}<button type="button" class="wbl-fb" data-wblfb="${dir}:${col}" aria-label="${nm} 거르기" title="거르기">▾</button></span>`;
  const sec = (dir, title, btn) => { const G = L[dir] || []; if(!G.length) return ''; let last = null;
    const first = {}; G.forEach((r, i) => { const c = wbLinkCat(r); if(!(c in first)) first[c] = i; });
    const ord = G.map((r, i) => i).sort((x, y) => dir==='dash' ? first[wbLinkCat(G[x])] - first[wbLinkCat(G[y])] || x - y : x - y);   /* 대시보드는 묶음끼리 모음 */
    const rows = ord.map(i => { const r = G[i], c = wbLinkCat(r), gap = dir==='dash' && c!==last ? `<tr class="wbl-grp"><td colspan="5">${wbEsc(c)}</td></tr>` : ''; last = c;
      return gap + `<tr${r.ok ? '' : ' class="off"'} data-wblr data-wblt="${wbEsc(r.tool)}" data-wblc="${wbEsc(c)}" data-wblne="${wbLinkEmpty(r.now) ? '비어 있음' : '값 있음'}" data-wblve="${r.val ? '값 있음' : '없음'}"><td><input type="checkbox" data-wblk="${dir}:${i}"${r.ok ? ' checked' : ' disabled'} aria-label="${wbEsc(r.tool + ' ' + r.n)}"></td><td>${dir==='get' ? `<span class="wbl-tool">${wbEsc(r.tool)}</span> ` : ''}${r.n}</td><td>${r.to}</td><td>${r.now || '—'}</td><td>${r.ok ? r.val : `<span class="muted">${r.why || '없음'}</span>`}</td></tr>`; }).join('');
    return `<section class="wbl-sec" data-wbls="${dir}"><div class="wbl-h"><h4>${title}</h4><label class="wbl-ve"><input type="checkbox" data-wblvx> 가져올 값 없는 줄 제외</label></div><table class="dvi-t wbl-t"><thead><tr><th><input type="checkbox" data-wblkall="${dir}"${G.some(r => r.ok) ? ' checked' : ' disabled'} aria-label="모두 고르기"></th>
      <th>${dir==='get' ? fb(dir, 'tool', '무엇을') : '무엇을'}</th><th>${fb(dir, 'cat', '이 도구의 어디에 (덮어씀)')}</th><th>이 도구의 지금 값</th><th>가져올 값</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="wbl-act"><button type="button" class="btn small pri" data-wblgo="${dir}"${G.some(r => r.ok) ? '' : ' disabled'}>${btn}</button></div></section>`; };
  wbModal(wbMHead(`도구 연결 — ${wbEsc(T.no)} ${wbEsc(T.name)}`) + `<div class="dvi-body">${sec('get', '다른 도구에서 가져오기', '체크한 것 가져오기')}${sec('dash', '대시보드에서 가져오기', '체크한 것 가져오기')}${(L.info || []).length ? `<ul class="wbl-info muted">${L.info.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}</div>
    <div class="dvi-foot"><span class="muted">복사입니다. 가져온 뒤 한쪽을 고쳐도 다른 쪽은 그대로입니다.</span><span class="dvi-btns"><button type="button" class="btn small" data-wbmx>닫기</button></span></div>`, 'wbl-box'); }
/* 거르기 적용: WB.lkf[dir][열] = 뺀 값들. 묶음 머리 줄도 그 묶음 줄이 다 숨으면 숨김 */
function wbLinkFilt(sec){ const F = (WB.lkf || {})[sec.dataset.wbls] || {};
  const vx = !!(sec.querySelector('[data-wblvx]') || {}).checked;
  sec.querySelectorAll('tr[data-wblr]').forEach(tr => { tr.hidden = (vx && tr.dataset.wblve==='없음') || Object.entries(F).some(([c, X]) => X.size && X.has(tr.dataset[WBLCOL[c]])); });
  sec.querySelectorAll('tr.wbl-grp').forEach(g => { let n = g.nextElementSibling, any = false; while(n && !n.classList.contains('wbl-grp')){ if(!n.hidden) any = true; n = n.nextElementSibling; } g.hidden = !any; });
  sec.querySelectorAll('[data-wblfb]').forEach(b => { const c = b.dataset.wblfb.split(':')[1]; b.classList.toggle('on', !!(F[c] && F[c].size)); }); }
/* 열 머리 ▾ 누르면 값 목록 (체크 = 보임). (모두) 로 한 번에 */
function wbLinkMenu(btn){ const old = document.querySelector('.wbl-fm'); const same = old && old.dataset.for===btn.dataset.wblfb; if(old) old.remove(); if(same) return;
  const [dir, col] = btn.dataset.wblfb.split(':'), sec = btn.closest('.wbl-sec'), X = ((WB.lkf[dir] = WB.lkf[dir] || {})[col] = WB.lkf[dir][col] || new Set());
  const vals = [...new Set([...sec.querySelectorAll('tr[data-wblr]')].map(tr => tr.dataset[WBLCOL[col]]))];
  const m = document.createElement('div'); m.className = 'wbl-fm'; m.dataset.for = btn.dataset.wblfb;
  m.innerHTML = `<label class="all"><input type="checkbox" data-wblfa${X.size ? '' : ' checked'}> (모두)</label>${vals.map(v => `<label><input type="checkbox" data-wblfv="${wbEsc(v)}"${X.has(v) ? '' : ' checked'}> ${wbEsc(v)}</label>`).join('')}`;
  btn.closest('th').appendChild(m); }
document.addEventListener('change', e => { if(e.target.matches && e.target.matches('[data-wblvx]')) wbLinkFilt(e.target.closest('.wbl-sec')); });
document.addEventListener('click', e => { if(!e.target.closest) return; const b = e.target.closest('[data-wblfb]'); if(b){ e.preventDefault(); wbLinkMenu(b); return; }
  const m = document.querySelector('.wbl-fm'); if(m && !e.target.closest('.wbl-fm')) m.remove(); });
document.addEventListener('change', e => { const m = e.target.closest && e.target.closest('.wbl-fm'); if(!m) return; const [dir, col] = m.dataset.for.split(':'), X = WB.lkf[dir][col];
  if(e.target.matches('[data-wblfa]')){ m.querySelectorAll('[data-wblfv]').forEach(c => { c.checked = e.target.checked; c.checked ? X.delete(c.dataset.wblfv) : X.add(c.dataset.wblfv); }); }
  else { const v = e.target.dataset.wblfv; e.target.checked ? X.delete(v) : X.add(v); m.querySelector('[data-wblfa]').checked = !X.size; }
  wbLinkFilt(m.closest('.wbl-sec')); });
function wbLinkGo(dir){ const m = $('#wbm'), G = (WB.lk || {})[dir] || []; if(!m) return;
  const sel = [...m.querySelectorAll(`[data-wblk^="${dir}:"]:checked`)].filter(c => !c.closest('tr').hidden).map(c => G[+c.dataset.wblk.split(':')[1]]).filter(r => r && r.ok);
  if(!sel.length){ toast('체크한 항목이 없습니다.'); return; }
  const msg = sel.map(r => { try{ return r.run(); }catch(e){ return `${r.n}: 실패`; } }).filter(Boolean);
  wbModalClose(); wbSave(); wbPaint(); wbCalcSoon(); toast(dir==='dash' ? `대시보드 값 ${sel.length}개를 가져왔습니다.` : '가져왔습니다 — ' + msg.join(' · ')); }
/* 출처 표시: 모드별 {도구: {키: '도구 X'}} */
const WBSRC_KEY = 'run2x.wb.src';
const wbSrcAll = () => { try{ return JSON.parse(localStorage.getItem(wbMK(WBSRC_KEY)) || '{}') || {}; }catch(e){ return {}; } };
function wbSrcSet(id, keys, from){ const a = wbSrcAll(); a[id] = a[id] || {}; keys.forEach(k => { a[id][k] = from; }); try{ localStorage.setItem(wbMK(WBSRC_KEY), JSON.stringify(a)); }catch(e){} }
function wbSrcDel(id, k){ const a = wbSrcAll(); if(!a[id] || !(k in a[id])) return; delete a[id][k]; try{ localStorage.setItem(wbMK(WBSRC_KEY), JSON.stringify(a)); }catch(e){} }
const wbSrcGet = (id, k) => (wbSrcAll()[id] || {})[k] || '';
const wbSrcTag = (id, k) => { const s = id ? wbSrcGet(id, k) : ''; return s ? `<span class="wb-src" title="[도구 연결]로 ${wbEsc(s)}에서 복사한 값 (고치면 이 표시는 사라짐)">${wbEsc(s)}에서</span>` : ''; };

/* .json 내보내기 · 가져오기 (사이트 양식) */
/* 도구 파일 내용 (내보내기 · 프리셋 같은 형식). ext: 도구가 따로 가진 표(트랙 · 모터 곡선 등) */
const wbDoc = () => { const T = wbT(); return {format:'run2x-tool', tool:WB.id, name:T.name, ver:1, season:typeof dvSeason==='function' ? dvSeason() : '', at:new Date().toISOString(), inputs:{...WB.I}, ...(T.extGet ? {ext:T.extGet()} : {})}; };
/* 도구 파일 내용을 지금 도구에 넣음 → 넣은 입력 수 (다른 도구 파일이면 -1) */
function wbApplyDoc(d){ if(!d || d.format!=='run2x-tool' || !d.inputs || d.tool!==WB.id) return -1;
  let n = 0; wbT().inputs.forEach(x => { const v = d.inputs[x.k]; if(typeof v==='number' && isFinite(v)){ WB.I[x.k] = v; n++; } });
  if(d.ext && wbT().extSet) wbT().extSet(d.ext);
  wbSave(); wbPaint(['in', 'tabs', 'ext']); wbCalc(); return n; }
function wbExport(){ const doc = wbDoc();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], {type:'application/json'}));
  a.download = `run2x_${WB.id}_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0); }
function wbImport(file){ const fr = new FileReader(); fr.onload = () => { let d;
    try{ d = JSON.parse(fr.result); }catch(e){ toast('.json 파일을 읽지 못했습니다.'); return; }
    /* 팀 백업(시즌 내보내기) 파일이면 그 안의 이 도구 팀 프리셋 (가장 최근 시즌) */
    if(d && d.format==='run2x-team-backup' && d.data){ const E = Object.entries(d.data.tp || {}).find(([id]) => id.split('__')[1]===WB.id), s = E && E[1] && E[1].s ? E[1].s : {}, se = Object.keys(s).sort().pop();
      if(!se){ toast('이 파일에 이 도구의 팀 프리셋이 없습니다.'); return; }
      let doc = null; try{ doc = JSON.parse(s[se].json); }catch(e){}
      const n = wbApplyDoc(doc); if(n < 0){ toast('팀 프리셋을 읽지 못했습니다.'); return; }
      toast(`${se} 시즌 팀 프리셋 "${wbEsc(s[se].name || '')}"을 가져왔습니다.`); return; }
    if(!d || d.format!=='run2x-tool' || !d.inputs){ toast('이 사이트에서 내보낸 도구 파일이 아닙니다.'); return; }
    if(d.tool!==WB.id){ toast(`다른 도구(${wbEsc(d.name || d.tool)})의 파일입니다.`); return; }
    const n = wbApplyDoc(d); toast(`입력 ${n}개를 가져왔습니다${d.at ? ' (' + d.at.slice(0,10) + ' 저장본)' : ''}.`); };
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
  { const dd = document.querySelector('#wb .wb-hpdd[open]'); if(dd && (!t.closest('.wb-hpdd') || t.closest('[data-wbhp]'))) dd.open = false; }
  { const mb = t.closest('[data-wbo]'); if(mb){ wbOpen(mb.dataset.wbo, mb.closest('.wb-mpick') || mb, mb.dataset.wbm); return; } }
  if(!WB.id) return;
  if(t.closest('[data-wbmx]') || t.matches('#wbm')){ wbModalClose(); return; }
  if(t.closest('[data-wbx]')){ wbClose(); return; }
  if(t.closest('[data-wbcmp]')){ WB.cmp = !WB.cmp; t.closest('[data-wbcmp]').setAttribute('aria-pressed', String(WB.cmp)); wbPaint(['in','out']); return; }
  if(t.closest('[data-wbver]')){ wbVerify(); return; }
  if(t.closest('[data-wbcode]')){ wbCodeOpen(); return; }
  if(t.closest('[data-wbcreset]')){ delete WB.code[WB.id]; $('#wbm textarea').value = wbT().code; $('#wbcmsg').textContent = '원래 코드로 돌렸습니다.'; wbCalc(); return; }
  if(t.closest('[data-wbcrun]')){ const src = $('#wbm textarea').value; WB.code[WB.id] = src === wbT().code ? undefined : src; if(WB.code[WB.id]===undefined) delete WB.code[WB.id];
    wbCalc().then(() => { const mm = $('#wbcmsg'); if(mm) mm.textContent = WB.err ? WB.err : '계산했습니다. 결과는 작업창에 보입니다.'; }); return; }
  if(t.closest('[data-wbexp]')){ if(!wbExBlock()) wbExport(); return; }
  if(t.closest('[data-wbimp]')){ if(!wbExBlock()) $('#wbfile').click(); return; }
  { const g = t.closest('[data-wbgo]'); if(g){ wbNeedGo(g.dataset.wbgo, g.dataset.wbgotab); return; } }
  { const h = t.closest('[data-wbhp]'); if(h){ if(wbExBlock()) return; if(h.dataset.wbhp==='imp') $('#wbhpfile').click(); else wbHpExport(h.dataset.wbhp); return; } }
  { const tb = t.closest('[data-wbtab]'); if(tb){ wbTabSet(tb.dataset.wbtab); return; } }
  { const es = t.closest('[data-wbesec]'); if(es){ WB.esec = es.dataset.wbesec; wbPaint(['tabs']); return; } }
  if(t.closest('[data-wbput]')){ if(!wbExBlock()) wbPutOpen(); return; }
  if(t.closest('[data-wblink]')){ if(!wbExBlock()) wbLinkOpen(); return; }
  { const lg = t.closest('[data-wblgo]'); if(lg){ wbLinkGo(lg.dataset.wblgo); return; } }
  { const la = t.closest('[data-wblkall]'); if(la){ document.querySelectorAll(`#wbm [data-wblk^="${la.dataset.wblkall}:"]:not(:disabled)`).forEach(c => { if(!c.closest('tr').hidden) c.checked = la.checked; }); } }
  if(t.closest('[data-wbexreset]')){ wbExReset(); return; }
  if(t.closest('[data-wbpgo]')){ wbPutGo(); return; }
  const pn = t.closest('[data-wbpane]'); if(pn){ const sw = WB.xa.startsWith('in:'), i = +pn.dataset.wbpane; if(sw){ WB.piO = i; WB.selO = WB.panesO[i]; } else { WB.pi = i; WB.sel = WB.panes[i]; } wbPaint(['sig']); return; }
  const zmb = t.closest('[data-wbzm]'); if(zmb){ WB.zm = zmb.dataset.wbzm; $('#wbsig').dataset.zm = WB.zm; wbPaint(['sig']); return; }
  const zbb = t.closest('[data-wbzb]'); if(zbb){ const z = zbb.dataset.wbzb; if(z==='fit'){ WB.zx = null; WB.zy = []; } else { const r = wbZRange(), c = (r.lo + r.hi)/2, h = (r.hi - r.lo)/2*(z==='in' ? 1/1.5 : 1.5); wbZSet(c - h, c + h); } wbPaint(['sig']); return; }
  if(t.closest('[data-wbpadd]')){ WB.zy = []; const sw = WB.xa.startsWith('in:'), P = sw ? WB.panesO : WB.panes; if(P.length < 3){ P.push(new Set()); if(sw){ WB.piO = P.length-1; WB.selO = P[WB.piO]; } else { WB.pi = P.length-1; WB.sel = P[WB.pi]; } } wbPaint(['sig']); return; }
  if(t.closest('[data-wbpdel]')){ WB.zy = []; const sw = WB.xa.startsWith('in:'), P = sw ? WB.panesO : WB.panes; if(P.length > 1){ const i = +t.closest('[data-wbpdel]').dataset.wbpdel; P.splice(i, 1); WB_PH.splice(i, 1); const j = Math.max(0, i-1); if(sw){ WB.piO = j; WB.selO = P[j]; } else { WB.pi = j; WB.sel = P[j]; } } wbPaint(['sig']); return; }
  const ac = t.closest('[data-wbact]'); if(ac){ WB.act = ac.dataset.wbact; WB.sel.add(WB.act); wbPaint(['sig']); return; }
  const ao = t.closest('[data-wbacto]'); if(ao){ WB.actO = ao.dataset.wbacto; WB.selO.add(WB.actO); wbPaint(['sig']); return; }
  const vv = t.closest('#wb [data-v3v]'); if(vv && WB.t3){ WB.t3.orb.set(vv.dataset.v3v); wb3dViews(); WB.t3.render(); return; }
});
document.addEventListener('keydown', e => {

  if(!WB.id) return;
  if(e.key==='Escape'){ e.preventDefault(); if(!wbModalClose()) wbClose(); return; }
  if(e.target.matches && e.target.matches('textarea.wb-ta') && e.key==='Tab'){ e.preventDefault(); const ta = e.target, a = ta.selectionStart; ta.setRangeText('  ', a, ta.selectionEnd, 'end'); return; }
  const hit = e.target.closest && e.target.closest('.wb-plotbox'); if(hit && WB.R && (e.key==='ArrowLeft' || e.key==='ArrowRight')){ e.preventDefault();
    wbCursor(hit.id==='wbsig' ? 'sig' : 'main', null, e.key==='ArrowLeft' ? -1 : 1); }
});
document.addEventListener('input', e => { const sw = e.target.closest && e.target.closest('[data-wbsw]'); if(sw && WB.sw){ const x = parseFloat(sw.value); if(isFinite(x)){ WB.sw[sw.dataset.wbsw] = x; clearTimeout(WB.timer); WB.timer = setTimeout(() => wbSweep().then(() => wbPaint(['sig'])), 250); } return; }
  const i = e.target.closest && e.target.closest('[data-wbi]'); if(!i || !WB.id) return;
  const x = parseFloat(i.value); if(!isFinite(x)){ if(String(i.value).trim()==='' && !wbEx()){ WB.I[i.dataset.wbi] = NaN; wbSave(); WB.need = wbNeed(); wbNeedMark(); wbCalcSoon(); } return; }
  WB.I[i.dataset.wbi] = x; wbSrcDel(WB.id, i.dataset.wbi); wbSave(); if(!wbEx() && (WB.need || []).length){ WB.need = wbNeed(); wbNeedMark(); }   /* 채우면 그 칸 빨강이 바로 사라짐 */
  const r = i.closest('.wb-ir'), d = wbT().inputs.find(o => o.k===i.dataset.wbi), db = wbDash(d.dk); if(r) r.classList.toggle('diff', !!(db && Math.abs(x - db.v) > 1e-9*Math.max(1, Math.abs(db.v))));
  wbCalcSoon(); });
document.addEventListener('change', e => { const t = e.target; if(!WB.id || !t.matches) return;
  if(t.matches('#wbfile')){ if(t.files && t.files[0]) wbImport(t.files[0]); t.value = ''; return; }
  if(t.matches('#wbhpfile')){ if(t.files && t.files[0]) wbHpImport(t.files[0]); t.value = ''; return; }
  if(t.matches('[data-wbxa]')){ WB.xa = t.value; if(WB.xa.startsWith('in:')){ WB.si = 0; if(!WB.sw || WB.sw.k!==WB.xa.slice(3)) WB.sw = null; wbSweep().then(() => { WB.si = WB.sw && WB.sw.X ? Math.floor(WB.sw.X.length/2) : 0; wbPaint(['sig']); }); } wbPaint(['sig']); return; }
  if(t.matches('[data-wbso]')){ t.checked ? WB.selO.add(t.dataset.wbso) : WB.selO.delete(t.dataset.wbso); if(t.checked) WB.actO = t.dataset.wbso; wbPaint(['sig']); return; }
  if(t.matches('[data-wbsg]')){ t.checked ? WB.sel.add(t.dataset.wbsg) : WB.sel.delete(t.dataset.wbsg); if(t.checked) WB.act = t.dataset.wbsg; wbPaint(['sig']); } });
/* 프로브: 그래프를 누르거나 끌면 옮기고, 놓으면 그 자리에 남음. 기본 축·XY 는 두 그래프와 3D 가 같은 프로브, 입력 훑기는 따로 */
function wbCursor(which, idx, step){ const R = WB.R; if(!R) return; if(!R.x && which!=='sig') return;
  const sweep = which==='sig' && WB.xa.startsWith('in:'); if(sweep && !(WB.sw && WB.sw.X)) return;
  const n = sweep ? WB.sw.X.length : R.x.d.length, cur = sweep ? WB.si : WB.xi, nx = Math.max(0, Math.min(n - 1, idx != null ? idx : cur + step));
  if(nx===cur) return; if(sweep){ WB.si = nx; wbPaint(['sig']); return; } WB.xi = nx; wbPaint(['main','sig']); wb3dUpdate(); if(wbT().onCursor) wbT().onCursor(nx); }
function wbPick(svg, e){ if(!svg.querySelector('.wb-hit')) return; const hit = svg.querySelector('.wb-hit'), rc = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (e.clientX - rc.left)/rc.width*vb.width;
  const L = +hit.dataset.wbl, W = +hit.dataset.wbw, x0 = +hit.dataset.wbx0, x1 = +hit.dataset.wbx1, xv = x0 + (px - L)/W*(x1 - x0), which = svg.dataset.wbp;
  const xd = which==='sig' && WB.xa.startsWith('in:') ? WB.sw.X : which==='sig' && WB.xa.startsWith('sig:') ? WB.R.sig[WB.xa.slice(4)] : WB.R.x.d;
  let best = -1; for(let i = 0; i < xd.length; i++) if(isFinite(xd[i]) && (best < 0 || Math.abs(xd[i] - xv) < Math.abs(xd[best] - xv))) best = i;
  if(best >= 0) wbCursor(which, best); }
let WB_DRAG = null;
/* ---------- 그래프 칸 확대 · 이동 (MATLAB 피규어처럼). x 는 모든 칸 같이 (WB.zx = {key: 가로축, lo, hi}), y 는 칸마다 자동 범위의 비율 (WB.zy[i] = {a, b}) */
let WBZD = null;
function wbXData(){ const R = WB.R; return WB.xa.startsWith('in:') ? (WB.sw && WB.sw.X) || [] : WB.xa.startsWith('sig:') ? R.sig[WB.xa.slice(4)] : R.x.d; }
function wbXFull(){ const d = wbXData().filter(isFinite); return d.length ? {lo:Math.min(...d), hi:Math.max(...d)} : {lo:0, hi:1}; }
const wbZRange = () => wbZx() || wbXFull();
function wbZSet(lo, hi){ const F = wbXFull(), w = hi - lo; if(!(w > 0) || w >= (F.hi - F.lo)*0.999){ WB.zx = null; return; }
  if(lo < F.lo){ hi += F.lo - lo; lo = F.lo; } if(hi > F.hi){ lo -= hi - F.hi; hi = F.hi; } WB.zx = {key:WB.xa, lo, hi}; }
function wbZyOf(i){ return (WB.zy && WB.zy[i]) || {a:0, b:1}; }
function wbZySet(i, a, b){ WB.zy = WB.zy || []; WB.zy[i] = Math.abs(a) < 1e-3 && Math.abs(b - 1) < 1e-3 ? null : {a, b}; }
/* svg 의 화면 점 → 그림 좌표 · 그림 영역 */
function wbZGeom(svg, e){ const hit = svg.querySelector('.wb-hit'), rc = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return {px:(e.clientX - rc.left)/rc.width*vb.width, py:(e.clientY - rc.top)/rc.height*vb.height, L:+hit.dataset.wbl, W:+hit.dataset.wbw, T:+hit.dataset.wbt, H:+hit.dataset.wbh, x0:+hit.dataset.wbx0, x1:+hit.dataset.wbx1}; }
function wbZDown(svg, e){ const pane = svg.closest('[data-wbpi]'), i = pane ? +pane.dataset.wbpi : 0, g = wbZGeom(svg, e);
  try{ svg.setPointerCapture(e.pointerId); }catch(err){} document.body.classList.add('wb-dragging');
  WBZD = {mode:WB.zm, svg, i, g, zy:wbZyOf(i), id:e.pointerId}; }
function wbZMove(e){ const D = WBZD, g = wbZGeom(D.svg, e);
  if(D.mode==='pan'){ const dx = -(g.px - D.g.px)/D.g.W*(D.g.x1 - D.g.x0), dy = (g.py - D.g.py)/D.g.H*(D.zy.b - D.zy.a);
    wbZSet(D.g.x0 + dx, D.g.x1 + dx); wbZySet(D.i, D.zy.a + dy, D.zy.b + dy);
    if(!D.raf) D.raf = requestAnimationFrame(() => { D.raf = 0; const b = $('#wbsig'); if(b){ b.innerHTML = wbSigHTML(); D.svg = b.querySelectorAll('.wb-plot')[D.i] || D.svg; } }); return; }
  let r = D.svg.querySelector('.wb-zbox'); if(!r){ r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('class', 'wb-zbox'); D.svg.appendChild(r); }
  const cx = v => Math.max(D.g.L, Math.min(D.g.L + D.g.W, v)), cy = v => Math.max(D.g.T, Math.min(D.g.T + D.g.H, v));
  const xa = cx(Math.min(g.px, D.g.px)), xb = cx(Math.max(g.px, D.g.px)), ya = cy(Math.min(g.py, D.g.py)), yb = cy(Math.max(g.py, D.g.py));
  r.setAttribute('x', xa); r.setAttribute('y', ya); r.setAttribute('width', xb - xa); r.setAttribute('height', yb - ya); D.box = {xa, xb, ya, yb}; }
function wbZUp(e){ const D = WBZD; WBZD = null; document.body.classList.remove('wb-dragging'); try{ D.svg.releasePointerCapture(D.id); }catch(err){}
  if(D.mode==='box' && D.box){ const B = D.box, G = D.g, X = p => G.x0 + (p - G.L)/G.W*(G.x1 - G.x0);
    if(B.xb - B.xa >= 6) wbZSet(X(B.xa), X(B.xb));
    if(B.yb - B.ya >= 6){ const f = p => 1 - (p - G.T)/G.H, s = D.zy.b - D.zy.a; wbZySet(D.i, D.zy.a + f(B.yb)*s, D.zy.a + f(B.ya)*s); } }
  wbPaint(['sig']); }
/* 더블클릭 = 처음 범위 (x · 모든 칸 y) */
document.addEventListener('dblclick', e => { if(!e.target.closest || !e.target.closest('#wbsig .wb-plot')) return; WB.zx = null; WB.zy = []; wbPaint(['sig']); });
/* 휠 (칸을 눌러 켠 뒤): x 확대 · 축소 (프로브 둘레), Shift + 휠 = 그 칸 y */
document.addEventListener('wheel', e => { const pane = e.target.closest && e.target.closest('#wbsig [data-wbpi]'); if(!pane || !wbZoomOn(pane) || !WB.R) return;
  const svg = pane.querySelector('.wb-plot'); if(!svg || !svg.querySelector('.wb-hit')) return; e.preventDefault();
  const g = wbZGeom(svg, e), f = e.deltaY < 0 ? 0.8 : 1.25, i = +pane.dataset.wbpi;
  if(e.shiftKey){ const zy = wbZyOf(i), s = zy.b - zy.a, m = zy.a + (1 - (g.py - g.T)/g.H)*s; wbZySet(i, m - (m - zy.a)*f, m + (zy.b - m)*f); }
  else { const m = g.x0 + (g.px - g.L)/g.W*(g.x1 - g.x0); wbZSet(m - (m - g.x0)*f, m + (g.x1 - m)*f); }
  wbPaint(['sig']); }, {passive:false});
let WB_PHD = null;   /* 그래프 칸 높이 끌기 */
document.addEventListener('pointerdown', e => { if(e.button!==0 || !e.target.closest) return;
  const ph = e.target.closest('#wb [data-wbph]'); if(ph){ e.preventDefault(); const i = +ph.dataset.wbph, n = (WB.xa.startsWith('in:') ? WB.panesO : WB.panes).length, svg = ph.parentElement.querySelector('svg');
    WB_PHD = {i, y:e.clientY, h0:wbPh(i, n), k: svg ? 1100/svg.getBoundingClientRect().width : 1}; return; }
  const pp = e.target.closest('#wb [data-wbpi]'); if(pp && !e.target.closest('[data-wbpdel]')){ const i = +pp.dataset.wbpi, sw = WB.xa.startsWith('in:');   /* 칸 고르기 */
    if(sw ? WB.piO!==i : WB.pi!==i){ if(sw){ WB.piO = i; WB.selO = WB.panesO[i]; } else { WB.pi = i; WB.sel = WB.panes[i]; } wbSlPaint(); document.querySelectorAll('#wb [data-wbpi]').forEach(d => d.classList.toggle('on', +d.dataset.wbpi===i)); } }
  if(!WB.R) return; const svg = e.target.closest('#wb .wb-plot'); if(!svg || !svg.querySelector('.wb-hit')) return;   /* 표시 전용 그래프는 프로브와 상관없음 */
  if(svg.dataset.wbp==='sig' && (WB.zm || 'cur')!=='cur'){ e.preventDefault(); wbZDown(svg, e); return; }   /* 이동 · 영역 확대 모드 */
  e.preventDefault(); WB_DRAG = svg; wbPick(svg, e); const box = svg.closest('.wb-plotbox'); if(box) box.focus({preventScroll:true}); });
document.addEventListener('pointermove', e => { if(WBZD){ wbZMove(e); return; } if(WB_PHD){ const D = WB_PHD; WB_PH[D.i] = Math.max(120, Math.min(700, Math.round(D.h0 + (e.clientY - D.y)*D.k))); if(!D.raf) D.raf = requestAnimationFrame(() => { D.raf = 0; const b = $('#wbsig'); if(b) b.innerHTML = wbSigHTML(); }); return; }
  if(!WB_DRAG || !WB.R) return; if(WB_DRAG.isConnected) wbPick(WB_DRAG, e); else { WB_DRAG = document.querySelector('#wb .wb-plot[data-wbp="sig"]'); } });
document.addEventListener('pointerup', e => { if(WBZD){ wbZUp(e); return; } WB_DRAG = null; if(WB_PHD){ WB_PHD = null; try{ localStorage.setItem('run2x.wb.ph', JSON.stringify(WB_PH)); }catch(e){} } });

/* ---------- 입력 칸 옆 '모양 보기' (보조): 입력 정의에 viz(I) → {x:{d,n,u}, ys:[{k,d,c,n,u}], act, note} 가 있으면 그래프 단추.
   누르면 그 칸 아래 작은 창에 지금 입력값으로 그린 그래프. 입력을 고치면 바로 다시 그림, 바깥을 누르거나 Esc 로 닫음.
   2D · 3D 표 값(하중 감도, 앞으로 넣을 맵 데이터 등)이 어떻게 생겼는지 확인하고 넘어가는 용도 ---------- */
const WBV = { k:'', btn:null };
function wbVizHTML(){ const d = wbT() && wbT().inputs.find(o => o.k===WBV.k); if(!d || !d.viz) return '';
  let g; try{ g = d.viz({...WB.I}); }catch(e){ return '<p class="wb-err">그래프를 그리지 못했습니다.</p>'; }
  return `<div class="wb-vzh"><b>${wbInName(d)}</b><span class="muted">지금 입력값으로 그림</span><button type="button" class="dvi-x" data-wbvizx aria-label="닫기">×</button></div>`
    + wbPlot({id:'viz', w:360, h:210, x:g.x, ys:g.ys, norm:g.ys.length > 1, act:g.act || g.ys[0].k, label:'모양 보기'})
    + `<div class="wb-leg">${g.ys.map(y => `<span><i style="background:${y.c}"></i>${wbEsc(y.n)}${y.u ? ` [${wbEsc(y.u)}]` : ''}</span>`).join('')}</div>${g.note ? `<p class="wb-vzn">${wbEsc(g.note)}</p>` : ''}`; }
function wbVizPlace(){ const p = $('#wbvz'), b = WBV.btn; if(!p || !b || !b.isConnected) return; const r = b.getBoundingClientRect();
  p.style.left = Math.min(window.innerWidth - p.offsetWidth - 12, r.left) + 'px'; p.style.top = Math.min(window.innerHeight - p.offsetHeight - 12, r.bottom + 6) + 'px'; }
function wbVizOpen(k, btn){ wbVizClose(); WBV.k = k; WBV.btn = btn; const p = document.createElement('div'); p.id = 'wbvz'; p.className = 'wb-vzp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', '모양 보기');
  p.innerHTML = wbVizHTML(); document.body.appendChild(p); btn.setAttribute('aria-expanded', 'true'); wbVizPlace(); }
function wbVizClose(){ const p = $('#wbvz'); if(p) p.remove(); if(WBV.btn) WBV.btn.setAttribute('aria-expanded', 'false'); WBV.k = ''; WBV.btn = null; }
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return;
  const b = t.closest('[data-wbviz]'); if(b){ e.preventDefault(); if(WBV.k===b.dataset.wbviz) wbVizClose(); else wbVizOpen(b.dataset.wbviz, b); return; }
  if(t.closest('[data-wbvizx]')){ wbVizClose(); return; }
  if(WBV.k && !t.closest('#wbvz')) wbVizClose(); });
document.addEventListener('input', e => { if(!WBV.k || !e.target.closest || !e.target.closest('[data-wbi]')) return; setTimeout(() => { const p = $('#wbvz'); if(p){ p.innerHTML = wbVizHTML(); wbVizPlace(); } }, 0); });
document.addEventListener('keydown', e => { if(e.key==='Escape' && WBV.k){ e.preventDefault(); e.stopPropagation(); wbVizClose(); } }, true);

/* ---------- 프리셋 (2026-11-12 관리자 결정) ----------
   - 내 프리셋: 로그인한 계정에 도구마다 3개까지 (지금 도구 상태 전체 = 내보내기 파일과 같은 내용). 넘으면 알림
   - 팀 프리셋: 팀에 도구마다 1개, 내 프리셋 하나를 그 도구 담당 파트장 · 회장이 이번 시즌 팀 프리셋으로 내보냄 (새로 내보내면 바뀜)
   - 팀 백업(시즌 내보내기) 파일에 팀 프리셋이 함께 들어가고, 도구의 [가져오기 .json]이 그 파일에서 이 도구 팀 프리셋을 꺼내 옴 */
const WBTPART = {'1':'프레임', '2':'공통', 'G':'공통', '3':'제동', '4':'배터리', '5':'서스', '6':'조향', '7':'서스', '8':'서스', '9':'냉각', 'T':'서스'};
const wbTpId = id => `${(typeof PCODE_OF!=='undefined' && PCODE_OF[WBTPART[id]]) || 'all'}__${id}`;
const wbTpCan = id => typeof SH!=='undefined' && SH.on && !pastLock() && (SH.canAdmin || (isLeadRole(SH.role) && partOK(SH.parts, SH.role, WBTPART[id])));
const WBP = {list:[], tp:null, arm:''};
const wbPreDate = a => a ? String(a).slice(0, 10) : '';
async function wbPresetOpen(){ if(wbExBlock()) return;
  const ok = window.Backend && Backend.kind()==='firebase' ? await Backend.Team.ctx().then(c => !!c.uid).catch(() => false) : false;
  if(!ok){ toast('프리셋은 로그인하면 쓸 수 있습니다.'); return; }
  WBP.arm = ''; try{ WBP.list = await Backend.Team.presetList(WB.id) || []; }catch(e){ WBP.list = []; }
  try{ const d = typeof SH!=='undefined' && SH.on ? await Backend.Team.teamPresetGet(wbTpId(WB.id)) : null; WBP.tp = d && d.s ? d.s[dvSeason()] || null : null; }catch(e){ WBP.tp = null; }
  wbPresetPaint(); }
function wbPresetPaint(){ const T = wbT(), can = wbTpCan(WB.id), arm = (k, txt, lab) => WBP.arm===k ? `확인 — ${txt}` : lab;
  const tp = SH && SH.on ? `<section class="wbp-sec"><h4>팀 프리셋 <span class="muted">${wbEsc(dvSeason())} 시즌</span></h4>${WBP.tp ? `<div class="wbp-r"><b>${wbEsc(WBP.tp.name || '')}</b><span class="muted">${wbEsc(WBP.tp.byName || '')} · ${wbPreDate(WBP.tp.at)}</span><button type="button" class="btn small" data-wbpl="tp">${arm('l:tp', '덮어쓰기', '불러오기')}</button></div>` : '<p class="muted">없음</p>'}</section>` : '';
  const mine = WBP.list.map(p => `<div class="wbp-r"><b>${wbEsc(p.name || '')}</b><span class="muted">${wbPreDate(p.at)}</span>
      <button type="button" class="btn small" data-wbpl="${p.slot}">${arm('l:' + p.slot, '덮어쓰기', '불러오기')}</button>${can ? `<button type="button" class="btn small" data-wbpt="${p.slot}">${arm('t:' + p.slot, '팀 프리셋 바꾸기', '팀 프리셋으로')}</button>` : ''}<button type="button" class="btn small" data-wbpd="${p.slot}">${arm('d:' + p.slot, '지우기', '지우기')}</button></div>`).join('');
  wbModal(wbMHead(`프리셋 — ${wbEsc(T.no)} ${wbEsc(T.name)}`) + `<div class="dvi-body">${tp}<section class="wbp-sec"><h4>내 프리셋</h4>${mine || '<p class="muted">없음</p>'}
      <div class="wbp-new"><input type="text" maxlength="40" placeholder="프리셋 이름" data-wbpn aria-label="프리셋 이름"><button type="button" class="btn small pri" data-wbps>지금 상태 저장</button></div></section></div>
    <div class="dvi-foot"><span></span><span class="dvi-btns"><button type="button" class="btn small" data-wbmx>닫기</button></span></div>`, 'wbp-box'); }
async function wbPresetSave(){ const inp = document.querySelector('#wbm [data-wbpn]'), nm = (inp && inp.value || '').trim(); if(!nm){ if(inp) inp.focus(); return; }
  const same = WBP.list.find(p => p.name===nm);
  if(same && WBP.arm!=='s'){ WBP.arm = 's'; const b = document.querySelector('#wbm [data-wbps]'); if(b) b.textContent = `확인 — "${nm}" 덮어쓰기`; return; }
  const used = new Set(WBP.list.map(p => p.slot)), slot = same ? same.slot : [0, 1, 2].find(i => !used.has(i));
  if(slot == null){ toast('프리셋은 도구마다 3개까지입니다. 기존 프리셋을 지운 뒤 저장하세요.'); return; }
  const o = {name:nm, at:new Date().toISOString(), json:JSON.stringify(wbDoc())};
  try{ await Backend.Team.presetSave(WB.id, slot, o); toast(`"${nm}" 저장`); await wbPresetOpen(); }catch(e){ toast('저장하지 못했습니다.'); } }
document.addEventListener('click', async e => { const t = e.target; if(!t.closest) return;
  if(t.closest('[data-wbpre]')){ wbPresetOpen(); return; }
  if(!t.closest('#wbm .wbp-box, #wbm') || !document.querySelector('#wbm [data-wbps]')) return;
  if(t.closest('[data-wbps]')){ wbPresetSave(); return; }
  const l = t.closest('[data-wbpl]'), d = t.closest('[data-wbpd]'), tp = t.closest('[data-wbpt]'); if(!l && !d && !tp) return;
  const key = l ? 'l:' + l.dataset.wbpl : d ? 'd:' + d.dataset.wbpd : 't:' + tp.dataset.wbpt;
  if(WBP.arm!==key){ WBP.arm = key; wbPresetPaint(); return; }   /* 두 번 눌러 확인 */
  WBP.arm = '';
  if(l){ const p = l.dataset.wbpl==='tp' ? WBP.tp : WBP.list.find(x => String(x.slot)===l.dataset.wbpl); let doc = null; try{ doc = JSON.parse(p.json); }catch(err){}
    const n = wbApplyDoc(doc); if(n < 0){ toast('프리셋을 읽지 못했습니다.'); return; } wbModalClose(); toast(`"${p.name}" 불러옴`); return; }
  if(d){ try{ await Backend.Team.presetDel(WB.id, +d.dataset.wbpd); }catch(err){} await wbPresetOpen(); return; }
  if(tp){ const p = WBP.list.find(x => String(x.slot)===tp.dataset.wbpt);
    try{ await Backend.Team.teamPresetPut(wbTpId(WB.id), dvSeason(), {name:p.name, at:new Date().toISOString(), json:p.json}); toast(`"${p.name}"을 팀 프리셋으로 내보냈습니다.`); if(WB.id==='1' && typeof M1TP!=='undefined') M1TP.done = false; await wbPresetOpen(); }
    catch(err){ toast(Backend.denied && Backend.denied(err) ? '이 도구 담당 파트장 · 회장만 팀 프리셋을 내보낼 수 있습니다.' : '내보내지 못했습니다.'); } } });
document.addEventListener('input', e => { if(e.target.matches && e.target.matches('#wbm [data-wbpn]') && WBP.arm==='s'){ WBP.arm = ''; const b = document.querySelector('#wbm [data-wbps]'); if(b) b.textContent = '지금 상태 저장'; } });
