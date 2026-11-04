/* ============================================================
   도구 2 — 랩타임 · 점수 시뮬레이터 (QSS, 감속비 최적화 포함) · docs/TOOLS-PLAN.md 5절 · docs/HANDOFF.md 4-2절
   - 점질량 준정적 + 앞뒤 하중 이동 + 좌우 하중 이동(앞 횡하중 이동 배분 lltd) + 타이어 μ 하중 감도 + 뒤축 구동(모터 1개) + 축마다 마찰원
   - 종목: 가속(직선) · 스키드패드(정상 선회) · 오토크로스(출발 위치에서 트랙을 거꾸로, 정지 출발 한 바퀴) ·
     내구(같은 트랙 정방향, 드라이버 2명이 바퀴 수 절반씩 각각 정지 출발, 바퀴를 이어서 계산)
   - 기록은 팀 목표 기록(대시보드 t_acc · t_skid · t_ax · t_end)과 비교. 점수는 목표 기록을 1등 기록으로 볼 때의 값
   - 트랙: 구간 표(직선 · 회전) · 글로 편집 · .csv / .xlsx 가져오기 · 닫힌 경로 · 바퀴 수 · 출발 위치. 모터: 회전수 - 토크 표
   - 트랙 · 모터 표는 이 브라우저에 기억하고 .json 내보내기(ext)에 함께 들어감
   ============================================================ */
const T2KEY = 'run2x.wb.2.ext';
/* 예시 트랙: 대회 규정의 구간 기준(직선 ≤ 70 m, 회전 지름 30 ~ 60 m, 헤어핀 바깥 지름 ≥ 9 m, 슬라럼 간격 7 ~ 15 m)으로 만든 가상 코스, 닫힌 고리 약 760 m */
const T2TRACK_EX = '25, 0   # 출발 직선\n5, 25   # 슬라럼 (파일런 간격 10 m)\n10, -25\n10, 25\n10, -25\n10, 25\n10, -25\n10, 25\n5, -25\n20, 0\n31.42, 20   # 왼쪽 90° (지름 40 m)\n40, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n30, 0\n15.71, 5   # 왼쪽 헤어핀 (지름 10 m)\n35, 0\n17.28, -5.5   # 오른쪽 헤어핀 (지름 11 m)\n35, 0\n23.56, 15   # 왼쪽 90° (지름 30 m)\n50, 0\n20.94, 30   # 완만한 굽이\n20.94, -30\n40, 0\n21.82, 25   # 반경이 줄어드는 왼쪽 회전\n8.38, 12\n42.32, 0\n15.71, 5   # 왼쪽 헤어핀\n30, 0\n17.28, -5.5   # 오른쪽 헤어핀\n25, 0\n7.85, -10   # 시케인\n7.85, 10\n7.85, 10\n7.85, -10\n20, 0\n28.27, 18   # 왼쪽 90° (지름 36 m)\n12.99, 0   # 결승 직선';

/* ---------- 글 ↔ 구간 줄 ---------- */
/* 한 줄 = 구간 하나 {l: 길이 m, R: 반경 m(왼쪽 +, 오른쪽 −, 직선 0), note: 메모}. 숫자는 쉼표 · 칸 · 탭으로 구분, # 뒤는 메모 */
function t2Rows(txt){ const rows = [], bad = [];
  String(txt || '').split(/\r?\n/).forEach((ln, i) => { const m = ln.match(/^([^#]*)(?:#(.*))?$/), s = (m[1] || '').trim(), note = (m[2] || '').trim(); if(!s) return;
    const p = s.split(/[\s,;\t]+/).filter(Boolean).map(Number); if(p.length >= 2 && p.slice(0, 2).every(isFinite)) rows.push({l:p[0], R:p[1], note}); else bad.push(i + 1); });
  return {rows, bad}; }
const t2RowsText = rows => rows.map(r => `${+r.l.toFixed(3)}, ${+r.R.toFixed(3)}${r.note ? '   # ' + r.note : ''}`).join('\n');
const t2Pairs = txt => t2Rows(txt).rows.map(r => [r.l, r.R]);

const T2 = { tab:'track', view:'ax', lap:'2', mode:'table', rows:t2Rows(T2TRACK_EX).rows, closed:true, laps:0, s0:0, motor:'', timer:0, msg:'' };
try{ const s = JSON.parse(localStorage.getItem(T2KEY) || '{}') || {};
  if(Array.isArray(s.rows)) T2.rows = s.rows.filter(r => r && isFinite(r.l) && isFinite(r.R)).map(r => ({l:+r.l, R:+r.R, note:String(r.note || '').slice(0, 60)}));
  else if(typeof s.track==='string') T2.rows = t2Rows(s.track).rows;                                   /* 예전 저장 형식(글) */
  if(typeof s.motor==='string') T2.motor = s.motor; if(['ax','end','acc','ft'].includes(s.view)) T2.view = s.view; if(['1','2','all'].includes(s.lap)) T2.lap = s.lap;
  if(typeof s.closed==='boolean') T2.closed = s.closed; if(s.laps >= 0) T2.laps = Math.round(+s.laps); if(s.s0 >= 0) T2.s0 = +s.s0; if(s.mode==='text') T2.mode = 'text'; }catch(e){}
const t2Save = () => { try{ localStorage.setItem(T2KEY, JSON.stringify({rows:T2.rows, motor:T2.motor, view:T2.view, lap:T2.lap, closed:T2.closed, laps:T2.laps, s0:T2.s0, mode:T2.mode})); }catch(e){} };
const t2Segs = () => T2.rows.filter(r => r.l > 0).map(r => [r.l, r.R]);
const t2Len = () => t2Segs().reduce((a, r) => a + r[0], 0);
function t2Motor(){ const {rows, bad} = t2Rows(T2.motor); return {pts: rows.map(r => [r.l, r.R]).filter(r => r[0] >= 0 && r[1] >= 0).sort((a, b) => a[0] - b[0]), bad}; }
/* 구간 → 평면 좌표 (지도 그림 · 끝점 차이). h0: 처음 방향 */
function t2Geom(segs, ds){ let x = 0, y = 0, h = 0; const X = [0], Y = [0];
  segs.forEach(([l, R]) => { const n = Math.max(1, Math.ceil(l/ds)), st = l/n;
    for(let i = 0; i < n; i++){ if(!R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/R; x += R*(Math.sin(h + dh) - Math.sin(h)); y -= R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } X.push(x); Y.push(y); } });
  return {X, Y, gap: Math.hypot(x, y), turn: h*180/Math.PI}; }
const t2ExtraI = () => ({track: t2Segs(), closed: T2.closed, laps: T2.laps, s0: T2.s0, motor: t2Motor().pts, view: T2.view, lap: T2.lap});

/* ---------- 파일 가져오기: .csv · .txt · .xlsx ---------- */
/* 표의 한 줄(칸 배열) → 구간. 숫자 칸 두 개 = 길이 · 반경. '직선 · straight' 글자가 있으면 반경 0, '오른 · right · R' 글자가 있으면 반경을 −로. 숫자가 없는 줄(머리말)은 건너뜀 */
function t2CellsToRows(cells){ const rows = [];
  cells.forEach(cs => { const txt = cs.join(' '), nums = cs.map(c => String(c).trim()).filter(c => c!=='' && isFinite(+c)).map(Number); if(!nums.length) return;
    const note = cs.filter(c => String(c).trim()!=='' && !isFinite(+c)).join(' ').replace(/직선|회전|코너|왼쪽|오른쪽|straight|corner|left|right/gi, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if(/직선|straight/i.test(txt)){ rows.push({l:nums[0], R:0, note}); return; }
    if(nums.length < 2) return; let R = nums[1]; if(R > 0 && /오른|right|(^|[^a-z])r([^a-z]|$)/i.test(txt.replace(/[\d.\-]+/g, ''))) R = -R;
    rows.push({l:nums[0], R, note}); });
  return rows.filter(r => r.l > 0); }
/* .xlsx = zip 안의 XML. 브라우저 내장 압축 풀기(DecompressionStream)로 첫 시트만 읽음 (라이브러리 없음) */
async function t2Xlsx(buf){ const u = new Uint8Array(buf), dv = new DataView(buf), td = new TextDecoder();
  let e = u.length - 22; while(e >= 0 && dv.getUint32(e, true)!==0x06054b50) e--; if(e < 0) throw new Error('xlsx 파일 구조를 읽지 못했습니다');
  const n = dv.getUint16(e + 10, true), files = {}; let p = dv.getUint32(e + 16, true);
  for(let i = 0; i < n && dv.getUint32(p, true)===0x02014b50; i++){ const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    files[td.decode(u.subarray(p + 46, p + 46 + nl))] = {meth:dv.getUint16(p + 10, true), size:dv.getUint32(p + 20, true), off:dv.getUint32(p + 42, true)}; p += 46 + nl + xl + cl; }
  const get = async name => { const f = files[name]; if(!f) return null; const st = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), d = u.subarray(st, st + f.size);
    if(f.meth===0) return td.decode(d); return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); };
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const ss = await get('xl/sharedStrings.xml'), strs = ss ? [...xml(ss).getElementsByTagName('si')].map(si => si.textContent) : [];
  const sheet = Object.keys(files).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)))[0];
  if(!sheet) throw new Error('xlsx 안에서 시트를 찾지 못했습니다');
  const col = r => { const m = /^([A-Z]+)/.exec(r || ''); if(!m) return -1; let c = 0; for(const ch of m[1]) c = c*26 + ch.charCodeAt(0) - 64; return c - 1; };
  return [...xml(await get(sheet)).getElementsByTagName('row')].map(rw => { const out = [];
    [...rw.getElementsByTagName('c')].forEach((c, i) => { const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], k = col(c.getAttribute('r'));
      out[k >= 0 ? k : i] = t==='s' ? (strs[+(v && v.textContent)] || '') : t==='inlineStr' ? c.textContent : (v ? v.textContent : ''); });
    return Array.from(out, x => x==null ? '' : x); }); }
async function t2Import(file){ const ext = (file.name.split('.').pop() || '').toLowerCase();
  try{ let cells;
    if(ext==='xlsx') cells = await t2Xlsx(await file.arrayBuffer());
    else if(ext==='csv' || ext==='txt' || ext==='tsv') cells = (await file.text()).split(/\r?\n/).map(l => l.replace(/#.*/, '').split(/[,;\t]/));
    else { toast(`읽을 수 없는 파일입니다 (.${ext || '확장자 없음'}). .xlsx · .csv 를 올리거나, 엑셀 .xls 는 [다른 이름으로 저장 → .xlsx]로 저장해 올려 주십시오.`); return; }
    const rows = t2CellsToRows(cells); if(!rows.length){ toast('구간을 찾지 못했습니다. 한 줄에 길이 m, 반경 m 두 숫자가 있어야 합니다.'); return; }
    T2.rows = rows; t2Save(); wbPaint(['ext']); wbRefresh(); t2PartDirty(); toast(`${file.name}에서 구간 ${rows.length}개를 가져왔습니다.`); }
  catch(err){ toast((err && err.message) || '파일을 읽지 못했습니다.'); } }

/* ---------- 작업창 위 표: 트랙 · 모터 곡선 ---------- */
const T2VIEW = [['ax','오토크로스 한 바퀴'], ['end','내구'], ['acc','가속'], ['ft','구동력 선도']];
function t2ExtHTML(){ const tabs = [['track','트랙'], ['motor','모터 곡선']];
  return `<section class="wb-sec t2-ext" aria-label="트랙 · 모터 곡선"><div class="wb-h t2-h"><div class="m1-tabs" role="tablist">${tabs.map(([k, t]) => `<button type="button" role="tab" data-t2tab="${k}" aria-selected="${T2.tab===k}">${t}</button>`).join('')}</div>
      <span class="t2-vw"><span class="muted">결과 그래프</span><span class="dc-seg" role="group" aria-label="결과 그래프에 그릴 것">${T2VIEW.map(([k, t]) => `<button type="button" data-t2view="${k}" aria-pressed="${T2.view===k}">${t}</button>`).join('')}</span>
        ${T2.view==='end' ? `<label class="t2-lapsel">바퀴 <select data-t2lap>${[['1','1번째 (정지 출발)'], ['2','2번째 (달리는 중)'], ['all','1 ~ 3번째 이어서']].map(([k, t]) => `<option value="${k}"${T2.lap===k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}</span></div>
    ${T2.tab==='track' ? t2TrackHTML() : t2MotorHTML()}</section>`; }
function t2TrackMsg(){ const segs = t2Segs(), len = t2Len(), G = t2Geom(segs, 1);
  if(!segs.length) return '<span class="wb-err">구간이 없습니다. [+ 구간]으로 넣거나 파일을 가져오십시오.</span>';
  return `한 바퀴 <b>${wbFmt(len, 1)}</b> m · 구간 ${segs.length}개${T2.closed ? ` · 끝점이 출발점에서 ${wbFmt(G.gap, 1)} m${G.gap > 5 ? ' <span class="muted">(지도에서만 벌어져 보임, 계산은 끝과 처음을 이어서 함)</span>' : ''}` : ' · 열린 경로'}`; }
function t2LapInfo(){ const R = WB.id==='2' ? WB.R : null, o = R && R.out; if(!o || !isFinite(o.t_lap1)) return T2.closed ? '' : '열린 경로는 내구(여러 바퀴)를 계산하지 않습니다.';
  return `내구 ${o.n_lap}바퀴 = 드라이버 ${o.n_st1} + ${o.n_lap - o.n_st1}바퀴 · 1번째 <b>${wbFmt(o.t_lap1, 2)}</b> s (정지 출발) · 2번째부터 <b>${wbFmt(o.t_fly, 2)}</b> s · 바퀴당 에너지 ${wbFmt(o.e_lap, 3)} kWh (2번째부터)`; }
function t2TrackHTML(){ const len = t2Len();
  return `<div class="t2-tr"><div class="t2-ed">
      <div class="t2-opt"><label><input type="checkbox" data-t2o="closed"${T2.closed ? ' checked' : ''}> 닫힌 경로 (끝 = 처음)</label>
        <label>내구 바퀴 수 <input type="number" min="0" step="1" data-t2o="laps" value="${T2.laps}"${T2.closed ? '' : ' disabled'}><span class="muted">0 = 총 주행거리 ÷ 한 바퀴</span></label>
        <label>출발 위치 <input type="number" min="0" step="any" data-t2o="s0" value="${T2.s0}"${T2.closed ? '' : ' disabled'}> m <span class="muted">처음에서</span></label></div>
      <div class="t2-tbar"><span class="dc-seg" role="group" aria-label="편집 방식"><button type="button" data-t2mode="table" aria-pressed="${T2.mode==='table'}">표</button><button type="button" data-t2mode="text" aria-pressed="${T2.mode==='text'}">글로 편집 · 붙여넣기</button></span>
        <label class="btn small t2-file">파일 가져오기<input type="file" accept=".xlsx,.csv,.txt,.tsv" data-t2file hidden></label><button type="button" class="btn small" data-t2ex="track">예시 트랙으로</button></div>
      ${T2.mode==='table' ? t2TableHTML() : `<textarea id="t2trk" data-t2txt="track" spellcheck="false" rows="13" aria-label="구간 목록 (글)">${wbEsc(t2RowsText(T2.rows))}</textarea>
        <p class="t2-msg muted">한 줄에 <b>길이 m, 반경 m</b> · 반경은 왼쪽 회전 +, 오른쪽 −, 직선 0 · # 뒤는 메모. 엑셀에서 두 열을 복사해 붙여 넣어도 됩니다.</p>`}
      <div class="t2-msg" id="t2tmsg">${t2TrackMsg()}</div></div>
    <figure class="t2-map"><div id="t2map">${t2MapSVG()}</div><figcaption class="muted" id="t2mcap"></figcaption><p class="t2-msg" id="t2lap">${t2LapInfo()}</p></figure></div>`; }
/* 구간 표: 종류 · 길이 · 반경 · 각도 · 방향 · 메모. 회전은 각도 = 길이 ÷ 반경 (길이를 고치면 각도, 각도를 고치면 길이가 따라 바뀜) */
function t2TableHTML(){ const deg = r => r.R ? r.l/Math.abs(r.R)*180/Math.PI : NaN;
  return `<div class="t2-tw"><table class="t2-tt"><thead><tr><th>#</th><th>종류</th><th>길이 m</th><th>반경 m</th><th>각도 °</th><th>방향</th><th>메모</th><th></th></tr></thead><tbody>${T2.rows.map((r, i) => { const c = !!r.R;
    return `<tr data-t2r="${i}"><td class="muted">${i + 1}</td><td><select data-t2f="kind" aria-label="종류"><option value="s"${c ? '' : ' selected'}>직선</option><option value="c"${c ? ' selected' : ''}>회전</option></select></td>
      <td><input type="number" step="any" min="0" data-t2f="l" value="${+r.l.toFixed(3)}" aria-label="길이"></td>
      <td><input type="number" step="any" min="0" data-t2f="R" value="${c ? +Math.abs(r.R).toFixed(3) : ''}"${c ? '' : ' disabled'} aria-label="반경"></td>
      <td><input type="number" step="any" min="0" data-t2f="ang" value="${c ? +deg(r).toFixed(1) : ''}"${c ? '' : ' disabled'} aria-label="각도"></td>
      <td><select data-t2f="dir"${c ? '' : ' disabled'} aria-label="방향"><option value="L"${r.R >= 0 ? ' selected' : ''}>왼쪽</option><option value="R"${r.R < 0 ? ' selected' : ''}>오른쪽</option></select></td>
      <td><input type="text" data-t2f="note" value="${wbEsc(r.note || '')}" maxlength="60" aria-label="메모"></td>
      <td class="t2-rb"><button type="button" data-t2rb="up" title="위로" aria-label="위로"${i ? '' : ' disabled'}>↑</button><button type="button" data-t2rb="dn" title="아래로" aria-label="아래로"${i < T2.rows.length - 1 ? '' : ' disabled'}>↓</button><button type="button" data-t2rb="add" title="아래에 구간 넣기" aria-label="아래에 구간 넣기">＋</button><button type="button" data-t2rb="del" title="지우기" aria-label="지우기">×</button></td></tr>`; }).join('')}</tbody></table></div>
    ${T2.rows.length ? '' : '<button type="button" class="btn small" data-t2rb="add0">+ 구간</button>'}`; }
/* 트랙 지도: 계산 결과가 있으면 차속 색(느림 파랑 → 빠름 빨강) + 커서 위치 + 출발 위치 */
function t2MapSVG(){ const R = WB.id==='2' ? WB.R : null, lap = R && R.map && R.map.vc && (T2.view==='ax' || T2.view==='end');
  const G = lap ? R.map : t2Geom(t2Segs(), 2); if(G.X.length < 2) return '';
  const xs = G.X, ys = G.Y, x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 20, W = 360, H = 240;
  const s = Math.min((W - 2*pad)/Math.max(1, x1 - x0), (H - 2*pad)/Math.max(1, y1 - y0)), ox = (W - (x1 - x0)*s)/2, oy = (H - (y1 - y0)*s)/2;
  const P = i => [(ox + (xs[i] - x0)*s).toFixed(1), (H - oy - (ys[i] - y0)*s).toFixed(1)];
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="t2-msvg" role="img" aria-label="트랙 지도">`, cap = '';
  if(lap){ const v = R.map.vc, N = xs.length, lo = Math.min(...v.filter(isFinite)), hi = Math.max(...v.filter(isFinite)), st = Math.max(1, Math.floor(N/600));
    for(let i = 0; i + st < N; i += st){ const vi = v[i], f = hi > lo && isFinite(vi) ? (vi - lo)/(hi - lo) : .5, a = P(i), b = P(Math.min(N - 1, i + st));
      svg += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="hsl(${(230 - 230*f).toFixed(0)} 75% 45%)" stroke-width="4" stroke-linecap="round"/>`; }
    const P0 = R.map.P, j = P0 ? WB.xi % P0 : WB.xi, k = R.map.rev ? N - 1 - j : j, c = P(Math.max(0, Math.min(N - 1, k))); svg += `<circle cx="${c[0]}" cy="${c[1]}" r="6" class="t2-cur"/>`;
    cap = `느림 ${wbFmt(lo, 0)} km/h <i class="t2-grad"></i> 빠름 ${wbFmt(hi, 0)} km/h · ${R.map.rev ? '오토크로스는 지도와 반대 방향' : R.map.what} · 점 = 커서`; }
  else { svg += `<polyline points="${xs.map((_, i) => P(i).join(',')).join(' ')}" class="t2-line"/>`; cap = T2.view==='acc' || T2.view==='ft' ? '결과 그래프를 오토크로스나 내구로 바꾸면 차속 색으로 칠합니다.' : ''; }
  /* 출발 위치: 지도 첫 점(계산 결과의 지도는 출발 위치에서 시작) 또는 처음에서 s0 */
  const i0 = lap ? (R.map.rev ? xs.length - 1 : 0) : Math.min(xs.length - 1, Math.round((T2.closed ? T2.s0 % Math.max(1e-9, t2Len()) : 0)/2)), a = P(lap ? 0 : i0);
  svg += `<circle cx="${a[0]}" cy="${a[1]}" r="4.5" class="t2-st"/><text x="${+a[0] + 8}" y="${+a[1] < 30 ? +a[1] + 16 : +a[1] - 8}" class="t2-stt">출발</text>`;
  setTimeout(() => { const c2 = $('#t2mcap'); if(c2) c2.innerHTML = cap; }, 0);
  return svg + '</svg>'; }
function t2MotorMsg(){ const M = t2Motor();
  return M.pts.length ? `표 ${M.pts.length}점 · 표 사이는 직선으로 잇고, 표 범위 밖은 끝 값. 최고 회전수는 입력 칸과 표 끝 중 낮은 값${M.bad.length ? ` · <span class="wb-err">${M.bad.slice(0, 5).join(', ')}번째 줄은 읽지 못함</span>` : ''}`
    : '표가 비어 있어 입력 칸의 <b>모터 최대 토크</b>와 <b>최고 출력 × 모터 · 인버터 효율</b>로 곡선을 만듭니다 (낮은 회전수는 토크 일정, 높은 회전수는 출력 일정).'; }
function t2MotorHTML(){ return `<div class="t2-tr"><div class="t2-ed"><label for="t2mot">회전수 - 토크 표 <span class="muted">한 줄에 <b>회전수 rpm, 토크 N·m</b> (모터 축) · 비우면 입력 칸 값으로 · 엑셀에서 두 열을 복사해 붙여 넣어도 됨</span></label>
      <textarea id="t2mot" data-t2txt="motor" spellcheck="false" rows="10" placeholder="0, 230&#10;4000, 230&#10;6500, 140">${wbEsc(T2.motor)}</textarea>
      <div class="t2-msg" id="t2mmsg">${t2MotorMsg()}</div>
      <div class="t2-btns"><button type="button" class="btn small" data-t2ex="motor">표 비우기</button><span class="muted">축전지 출력 상한(최고 출력)은 표가 있어도 함께 적용됩니다.</span></div></div>
    <figure class="t2-mc" id="t2mc">${t2MotorPlot()}</figure></div>`; }
/* 모터 곡선 그림: 계산에 실제로 쓰는 토크(축전지 출력 상한 반영)와 모터 축 출력 */
function t2MotorPlot(){ const I = WB.id==='2' ? WB.I : null; if(!I) return '';
  const M = t2Motor().pts, nmax = M.length ? Math.min(I.nmax, M[M.length - 1][0]) : I.nmax, Pm = I.pmax*1000*I.eta_m/100;
  const Tm = n => { let T; if(!M.length) T = I.tmax; else if(n <= M[0][0]) T = M[0][1]; else { T = M[M.length - 1][1]; for(let i = 1; i < M.length; i++) if(n <= M[i][0]){ const a = M[i - 1], b = M[i]; T = a[1] + (b[1] - a[1])*(n - a[0])/(b[0] - a[0]); break; } }
    const w = n*2*Math.PI/60; return w > 0 ? Math.min(T, Pm/w) : T; };
  const N = Array.from({length:81}, (_, i) => nmax*i/80), T = N.map(Tm), P = N.map((n, i) => T[i]*n*2*Math.PI/60/1000);
  return wbPlot({id:'t2m', w:520, h:230, x:{d:N, n:'모터 회전수', u:'rpm'}, ys:[{k:'T', d:T, c:WB_COL[0], n:'토크', u:'N·m'}, {k:'P', d:P, c:WB_COL[2], n:'출력', u:'kW'}], norm:true, act:'T', label:'모터 곡선'})
    + `<div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>토크 [N·m] (왼쪽 눈금)</span><span><i style="background:${WB_COL[2]}"></i>모터 축 출력 [kW]</span><span class="muted">최고 ${wbFmt(Math.max(...P), 1)} kW</span></div>`; }

/* ---------- 고치기 ---------- */
function t2Changed(full){ t2Save(); clearTimeout(T2.timer);
  if(full) wbPaint(['ext']); else { const m = $('#t2tmsg'); if(m) m.innerHTML = t2TrackMsg(); const mp = $('#t2map'); if(mp) mp.innerHTML = t2MapSVG(); }
  T2.timer = setTimeout(() => { wbRefresh(); t2PartDirty(); }, 300); }
function t2Text(k, v){ if(k==='track') T2.rows = t2Rows(v).rows; else T2.motor = v; t2Save(); clearTimeout(T2.timer);
  T2.timer = setTimeout(() => { if(k==='track'){ const m = $('#t2tmsg'); if(m) m.innerHTML = t2TrackMsg(); const mp = $('#t2map'); if(mp) mp.innerHTML = t2MapSVG(); }
    else { const m = $('#t2mmsg'); if(m) m.innerHTML = t2MotorMsg(); const c = $('#t2mc'); if(c) c.innerHTML = t2MotorPlot(); }
    wbRefresh(); t2PartDirty(); }, 350); }
document.addEventListener('input', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2txt]')){ t2Text(t.dataset.t2txt, t.value); return; }
  if(t.matches('[data-t2o]')){ const k = t.dataset.t2o; if(k==='closed') return; const v = parseFloat(t.value); if(!isFinite(v) || v < 0) return; T2[k] = k==='laps' ? Math.round(v) : v; t2Changed(false); return; }
  const tr = t.closest('[data-t2r]'); if(!tr || !t.matches('input[data-t2f]')) return;
  const r = T2.rows[+tr.dataset.t2r], f = t.dataset.t2f; if(!r) return;
  if(f==='note'){ r.note = t.value.slice(0, 60); t2Save(); return; }
  const v = parseFloat(t.value); if(!isFinite(v) || v < 0) return; const sg = r.R < 0 ? -1 : 1, ae = tr.querySelector('[data-t2f="ang"]'), le = tr.querySelector('[data-t2f="l"]');
  if(f==='l'){ r.l = v; if(r.R && ae) ae.value = +(v/Math.abs(r.R)*180/Math.PI).toFixed(1); }
  else if(f==='R'){ if(!(v > 0)) return; r.R = sg*v; if(ae) ae.value = +(r.l/v*180/Math.PI).toFixed(1); }
  else if(f==='ang'){ if(!r.R) return; r.l = v*Math.PI/180*Math.abs(r.R); if(le) le.value = +r.l.toFixed(3); }
  t2Changed(false); });
document.addEventListener('change', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2file]')){ const f = t.files && t.files[0]; t.value = ''; if(f) t2Import(f); return; }
  if(t.matches('[data-t2lap]')){ T2.lap = t.value; t2Save(); WB.xi = 0; t.blur(); wbRefresh(); return; }
  if(t.matches('[data-t2o="closed"]')){ T2.closed = t.checked; t2Changed(true); return; }
  const tr = t.closest('[data-t2r]'); if(!tr || !t.matches('select[data-t2f]')) return; const r = T2.rows[+tr.dataset.t2r]; if(!r) return;
  if(t.dataset.t2f==='kind'){ r.R = t.value==='s' ? 0 : (r.R || 10); }
  else if(t.dataset.t2f==='dir'){ r.R = (t.value==='R' ? -1 : 1)*Math.abs(r.R || 10); }
  t2Changed(true); });
document.addEventListener('click', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  const tb = t.closest('[data-t2tab]'); if(tb){ T2.tab = tb.dataset.t2tab; wbPaint(['ext']); return; }
  const md = t.closest('[data-t2mode]'); if(md){ T2.mode = md.dataset.t2mode; t2Save(); wbPaint(['ext']); return; }
  const vw = t.closest('[data-t2view]'); if(vw){ T2.view = vw.dataset.t2view; t2Save(); WB.xi = 0;
    WB.sel = new Set(T2.view==='ft' ? ['f_m','f_x','f_res'] : ['v','ax','pbat']); WB.act = ''; if(!WB.xa.startsWith('in:')) WB.xa = '';
    wbPaint(['ext']); wbRefresh(); return; }
  const rb = t.closest('[data-t2rb]'); if(rb){ const k = rb.dataset.t2rb, tr = rb.closest('[data-t2r]'), i = tr ? +tr.dataset.t2r : -1, R = T2.rows;
    if(k==='add0') R.push({l:20, R:0, note:''});
    else if(k==='add') R.splice(i + 1, 0, {l:20, R:0, note:''});
    else if(k==='del') R.splice(i, 1);
    else if(k==='up' && i > 0) [R[i - 1], R[i]] = [R[i], R[i - 1]];
    else if(k==='dn' && i < R.length - 1) [R[i + 1], R[i]] = [R[i], R[i + 1]];
    t2Changed(true); return; }
  const ex = t.closest('[data-t2ex]'); if(ex){ if(ex.dataset.t2ex==='track'){ T2.rows = t2Rows(T2TRACK_EX).rows; T2.closed = true; T2.s0 = 0; T2.laps = 0; } else T2.motor = ''; t2Save(); wbPaint(['ext']); wbRefresh(); t2PartDirty(); } });

/* ---------- 결과 카드 도우미 ---------- */
const t2Pts = mx => v => isFinite(v) ? `<b>${wbFmt(v, 1)}</b> <i>/ ${mx}점</i>` : '<b>-</b>';
/* 기록 + 목표 기록과 차이 (목표가 0이면 기록만) */
const t2Rec = (gk, d) => (v, o) => { if(!isFinite(v)) return '<b>-</b>'; const g = o[gk], s = `<b>${wbFmt(v, d)}</b> <i>s</i>`;
  if(!(g > 0)) return s; const df = v - g; return s + `<span class="t2-gd${df > 0 ? ' over' : ''}">목표 ${wbFmt(g, d)} · ${df > 0 ? '+' : '−'}${wbFmt(Math.abs(df), d)}</span>`; };
const t2Co2 = v => isFinite(v) ? `<b>${wbFmt(v, 2)}</b> <i>kg/100 km</i>${v > 60.06 ? ' <span class="wb-err">실격 기준 60.06 초과</span>' : ' <span class="muted">(실격 기준 60.06 이하)</span>'}` : '<b>-</b>';
/* 입력 옆 '모양 보기' 그래프: 하중 감도 → 바퀴 하중에 따른 μ 와 낼 수 있는 횡력 */
function t2VizMus(I){ const Z = Array.from({length:61}, (_, i) => i*50), mu = Z.map(z => Math.max(0, I.mu - I.mu_s*z/1000)), Fy = Z.map((z, i) => mu[i]*z);
  const w0 = I.m*9.81/4; return {x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:''}, {k:'fy', d:Fy, c:WB_COL[2], n:'낼 수 있는 횡력 μ·Fz', u:'N'}], act:'mu',
    note:`정지 때 바퀴 하나 평균 하중 약 ${wbFmt(w0, 0)} N. μ·Fz 가 꺾여 내려가기 시작하면 하중을 더 실어도 그 바퀴 힘이 늘지 않습니다.`}; }

/* ---------- 이 탭 사용법 ---------- */
function t2TourTab(tab){ if(!T2.tourUndo && typeof tgUndo==='function'){ const t0 = T2.tab; T2.tourUndo = true; tgUndo(() => { T2.tourUndo = false; if(T2.tab!==t0){ T2.tab = t0; wbPaint(['ext']); } }); }
  if(T2.tab!==tab){ T2.tab = tab; wbPaint(['ext']); } }
const t2TT = tab => ({click:{sel:`#wb [data-t2tab="${tab}"]`, need:() => T2.tab!==tab, run:() => t2TourTab(tab)}, inner:'#wb .wb-right'});
const M2TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 검증표(해석해와 비교), 코드 보기, 입력 내보내기 · 가져오기(트랙 · 모터 표 포함), 대시보드에 반영입니다.', t2TT('track')],
  ['#wb .wb-in', '입력', '질량 · 무게중심, 타이어 · 하중 이동, 에어로, 파워트레인, 종목 조건, 목표 기록입니다. [대시보드 값으로 채우기]로 대시보드 설계값을 넣습니다. 그래프 단추가 있는 칸은 눌러서 값의 모양을 바로 봅니다.', t2TT('track')],
  ['#wb .t2-opt', '닫힌 경로 · 바퀴 수 · 출발 위치', '닫힌 경로면 바퀴를 이어서 돕니다. 1번째 바퀴는 출발 위치에서 정지 출발, 2번째부터는 앞 바퀴 끝 속도를 이어받습니다. 내구는 드라이버 2명이 바퀴 수 절반씩 각각 정지 출발합니다.', t2TT('track')],
  ['#wb .t2-tbar', '구간 입력', '[표]에서 직선 · 회전을 한 줄씩 넣습니다. 회전은 각도를 고치면 길이가, 길이를 고치면 각도가 따라 바뀝니다. [글로 편집]에는 엑셀 두 열(길이, 반경)을 그대로 붙여 넣을 수 있고, [파일 가져오기]는 .xlsx · .csv 를 읽습니다.', t2TT('track')],
  ['#wb .t2-map', '트랙 지도', '구간으로 그린 지도입니다. 계산이 끝나면 차속 색(느림 파랑 → 빠름 빨강)으로 칠하고, 결과 그래프의 커서 위치를 점으로 보여 줍니다. 아래 줄은 바퀴별 기록입니다.', t2TT('track')],
  ['#wb .t2-ed', '모터 곡선', '모터 축의 회전수 - 토크 표를 넣습니다. 비우면 입력 칸의 최대 토크와 최고 출력으로 곡선을 만듭니다. 축전지 출력 상한은 표가 있어도 적용됩니다.', t2TT('motor')],
  ['#wb .t2-vw', '결과 그래프 고르기', '아래 결과 그래프에 그릴 것을 고릅니다: 오토크로스 한 바퀴, 내구(1번째 · 2번째 · 1 ~ 3번째 이어서), 가속, 구동력 선도.', t2TT('track')],
  ['#wb .wb-sec[aria-label="결과"]', '결과', '종목별 기록과 목표 기록 차이, 목표 기록을 1등으로 볼 때의 점수, 차량 한계, 점수 합이 가장 큰 감속비, 내구 에너지입니다. 감속비는 2.5 ~ 7.0을 0.1 간격으로 모두 계산해 고릅니다.', {inner:'#wb .wb-right'}],
  ['#wbmain', '결과 그래프', '고른 종목의 차속과 코너 한계 속도입니다. 그래프를 누르거나 끌면 커서가 움직이고 트랙 지도의 점도 따라갑니다.', {inner:'#wb .wb-right'}],
  ['#wbsl', '신호 선택 그래프', '종가속도 · 횡가속도 · 바퀴 하중 · 모터 회전수 · 축전지 출력 등을 골라 겹쳐 봅니다. 가로축을 [입력 훑기 → 최종 감속비]로 바꾸면 감속비에 따른 기록 변화를 봅니다.', {inner:'#wb .wb-right'}]
];

/* ============================================================ 도구 정의 */
WB_TOOLS['2'] = {
  no:'2', stage:'P0', name:'랩타임 · 점수 시뮬레이터', mainTitle:'결과 그래프', mainMeta:'위 [결과 그래프]에서 고른 것 · 그래프를 누르거나 끌면 커서 · ←/→ 한 칸씩',
  x:{ get n(){ return T2.view==='ft' ? '차속' : '거리'; }, get u(){ return T2.view==='ft' ? 'km/h' : 'm'; } },
  sweepFirst:'gr',
  inputs:[
    {k:'m', dk:'m', v:300, d:0, g:'질량 · 무게중심'}, {k:'fr', dk:'fr', v:47.5, d:1, g:'질량 · 무게중심'}, {k:'h', dk:'h', v:290, d:0, g:'질량 · 무게중심'},
    {k:'L', dk:'L', v:1550, d:0, g:'질량 · 무게중심'}, {k:'tf', dk:'tf', v:1200, d:0, g:'질량 · 무게중심'}, {k:'tr', dk:'tr', v:1180, d:0, g:'질량 · 무게중심'},
    {k:'mu', dk:'mu', v:1.5, d:2, g:'타이어 · 하중 이동'}, {k:'mu_s', dk:'mu_s', v:0, d:3, g:'타이어 · 하중 이동', viz:t2VizMus}, {k:'lltd', dk:'lltd', v:50, d:1, g:'타이어 · 하중 이동'},
    {k:'r_eff', dk:'r_eff', v:229, d:0, g:'타이어 · 하중 이동'}, {k:'crr', dk:'crr', v:0.015, d:3, g:'타이어 · 하중 이동'},
    {k:'cla', dk:'cla', v:3.0, d:2, g:'에어로'}, {k:'cda', dk:'cda', v:1.4, d:2, g:'에어로'}, {k:'xcop', dk:'xcop', v:852, d:0, g:'에어로'}, {k:'hcop', dk:'hcop', v:420, d:0, g:'에어로'},
    {k:'pmax', dk:'pmax', v:80, d:0, g:'파워트레인'}, {k:'tmax', dk:'tmax', v:230, d:0, g:'파워트레인'}, {k:'nmax', dk:'nmax', v:6500, d:0, g:'파워트레인'}, {k:'gr', dk:'gr', v:3.55, d:2, g:'파워트레인', sw:[2.5, 7]},
    {k:'eta_dt', dk:'eta_dt', v:95, d:0, g:'파워트레인'}, {k:'eta_m', n:'모터 · 인버터 효율', u:'%', v:90, d:0, g:'파워트레인'}, {k:'j_eq', dk:'j_eq', v:0.5, d:2, g:'파워트레인'},
    {k:'acc_len', n:'가속 구간 길이 (대회 공지값)', u:'m', v:75, d:0, g:'종목'}, {k:'sk_R', n:'스키드패드 주행 반경 (차로 가운데)', u:'m', v:9.125, d:3, g:'종목'}, {k:'end_km', n:'내구 총 주행거리', u:'km', v:20, d:1, g:'종목'},
    {k:'t_acc', dk:'t_acc', v:0, d:3, g:'목표 기록 (0 = 정하지 않음)'}, {k:'t_skid', dk:'t_skid', v:0, d:3, g:'목표 기록 (0 = 정하지 않음)'},
    {k:'t_ax', dk:'t_ax', v:0, d:2, g:'목표 기록 (0 = 정하지 않음)'}, {k:'t_end', dk:'t_end', v:0, d:1, g:'목표 기록 (0 = 정하지 않음)'}
  ],
  outGroups:{'종목 기록':{note:'목표 기록이 있으면 차이를 함께 표시'}, '점수 (목표 기록을 1등으로 볼 때)':{note:'목표가 0인 종목은 내 기록을 1등으로'},
    '감속비':{note:'2.5 ~ 7.0, 0.1 간격 · 목표 기록 기준 점수 합 (목표가 0이면 지금 감속비의 내 기록 기준)'}, '에너지 (회생 제외)':{note:'CO₂ 환산 1.3 kg/kWh'}},
  outputs:[
    {k:'t_acc_s', n:'가속', d:3, g:'종목 기록', fmt:t2Rec('g_acc', 3)}, {k:'t_skid_s', n:'스키드패드 (한 바퀴)', d:3, g:'종목 기록', fmt:t2Rec('g_skid', 3)},
    {k:'t_ax_s', n:'오토크로스 (정지 출발 한 바퀴)', d:2, g:'종목 기록', fmt:t2Rec('g_ax', 2)}, {k:'t_end_s', n:'내구 주행시간 (교체 시간 제외)', d:1, g:'종목 기록', fmt:t2Rec('g_end', 1)},
    {k:'t_lap1', n:'내구 1번째 바퀴 (정지 출발)', u:'s', d:2, g:'종목 기록'}, {k:'t_fly', n:'내구 2번째 바퀴부터', u:'s', d:2, g:'종목 기록'}, {k:'n_lap', n:'내구 바퀴 수', u:'바퀴', d:0, g:'종목 기록'},
    {k:'n_st1', n:'첫 드라이버 바퀴 수', u:'바퀴', d:0, g:'종목 기록', hide:true}, {k:'g_acc', n:'목표 가속', u:'s', d:3, hide:true}, {k:'g_skid', n:'목표 스키드패드', u:'s', d:3, hide:true}, {k:'g_ax', n:'목표 오토크로스', u:'s', d:2, hide:true}, {k:'g_end', n:'목표 내구', u:'s', d:1, hide:true},
    {k:'s_acc', n:'가속', d:1, g:'점수 (목표 기록을 1등으로 볼 때)', fmt:t2Pts(100)}, {k:'s_skid', n:'스키드패드', d:1, g:'점수 (목표 기록을 1등으로 볼 때)', fmt:t2Pts(100)}, {k:'s_ax', n:'오토크로스', d:1, g:'점수 (목표 기록을 1등으로 볼 때)', fmt:t2Pts(200)},
    {k:'s_end', n:'내구', d:1, g:'점수 (목표 기록을 1등으로 볼 때)', fmt:t2Pts(350)}, {k:'s_dyn', n:'동적 합 (효율 · 보고서 제외)', d:1, g:'점수 (목표 기록을 1등으로 볼 때)', fmt:t2Pts(750)},
    {k:'vmax', dk:'vmax', d:1, g:'차량 한계'}, {k:'v_top', n:'오토크로스 최고 차속', u:'km/h', d:1, g:'차량 한계'}, {k:'ay_skid', dk:'ay_max_sim', d:2, g:'차량 한계'}, {k:'ax_0', n:'출발 종가속도', u:'g', d:2, g:'차량 한계'},
    {k:'gr_opt', dk:'gr', n:'점수 합이 가장 큰 감속비', d:2, g:'감속비'}, {k:'s_dyn_opt', n:'그때 동적 점수 합', d:1, g:'감속비', fmt:t2Pts(750)},
    {k:'e_end', n:'내구 축전지 에너지', u:'kWh', d:2, g:'에너지 (회생 제외)'}, {k:'e_lap', dk:'e_lap', d:3, g:'에너지 (회생 제외)'}, {k:'co2_100', n:'보정 에너지 소비량', u:'kg/100 km', d:2, g:'에너지 (회생 제외)', fmt:t2Co2}
  ],
  sigs:[
    {k:'v', n:'차속', u:'km/h', d:1}, {k:'vlim', n:'코너 한계 속도', u:'km/h', d:1}, {k:'ax', n:'종가속도', u:'g', d:2}, {k:'ay', n:'횡가속도', u:'g', d:2},
    {k:'fz_fo', n:'앞 바깥 바퀴 하중', u:'N', d:0}, {k:'fz_fi', n:'앞 안쪽 바퀴 하중', u:'N', d:0}, {k:'fz_ro', n:'뒤 바깥 바퀴 하중', u:'N', d:0}, {k:'fz_ri', n:'뒤 안쪽 바퀴 하중', u:'N', d:0},
    {k:'rpm', n:'모터 회전수', u:'rpm', d:0}, {k:'pbat', n:'축전지 출력 (회생 제외)', u:'kW', d:1}, {k:'grip', n:'그립 사용률 (차 전체)', u:'%', d:0}, {k:'t', n:'경과 시간', u:'s', d:2}, {k:'ecum', n:'누적 에너지', u:'Wh', d:0},
    {k:'f_m', n:'모터 구동력 (바퀴)', u:'N', d:0}, {k:'f_x', n:'뒤축 접지 한계 (직진)', u:'N', d:0}, {k:'f_res', n:'주행 저항 (항력 + 구름)', u:'N', d:0}, {k:'a_x', n:'낼 수 있는 종가속도', u:'g', d:2}, {k:'p_w', n:'바퀴 출력', u:'kW', d:1}
  ],
  get sigOn(){ return T2.view==='ft' ? ['f_m','f_x','f_res'] : ['v', 'ax', 'pbat']; },
  extHTML: t2ExtHTML, extraI: t2ExtraI,
  extGet: () => ({rows:T2.rows, motor:T2.motor, view:T2.view, lap:T2.lap, closed:T2.closed, laps:T2.laps, s0:T2.s0}),
  extSet(d){ if(Array.isArray(d.rows)) T2.rows = d.rows.filter(r => r && isFinite(r.l) && isFinite(r.R)).map(r => ({l:+r.l, R:+r.R, note:String(r.note || '').slice(0, 60)}));
    else if(typeof d.track==='string') T2.rows = t2Rows(d.track).rows;
    if(typeof d.motor==='string') T2.motor = d.motor; if(['ax','end','acc','ft'].includes(d.view)) T2.view = d.view; if(['1','2','all'].includes(d.lap)) T2.lap = d.lap;
    if(typeof d.closed==='boolean') T2.closed = d.closed; if(d.laps >= 0) T2.laps = Math.round(+d.laps); if(d.s0 >= 0) T2.s0 = +d.s0; t2Save(); wbPaint(['ext']); },
  onResult(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(); const c = $('#t2mc'); if(c) c.innerHTML = t2MotorPlot(); const l = $('#t2lap'); if(l) l.innerHTML = t2LapInfo(); },
  onCursor(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(); },
  tour: M2TOUR,
  verifyBase:{track:[], closed:true, laps:0, s0:0, motor:[], view:'acc', lap:'2'},
  code:`// 입력 I: 왼쪽 입력 칸(단위도 같음: kg, mm, %, 1/kN, rpm, N·m, kW, m, km, s)
//   I.track = [[길이 m, 반경 m], …] 트랙 구간 (반경: 왼쪽 회전 +, 오른쪽 −, 직선 0), I.closed = 닫힌 경로, I.laps = 내구 바퀴 수(0 = 총 주행거리 ÷ 한 바퀴), I.s0 = 출발 위치 [m]
//   I.motor = [[회전수 rpm, 토크 N·m], …] (비면 최대 토크 · 최고 출력으로), I.view = 결과 그래프('ax' · 'end' · 'acc' · 'ft'), I.lap = 내구 그래프 바퀴('1' · '2' · 'all')
//   I._sweep = 입력 훑기 중 (작업창이 넣음, 감속비 고르기를 건너뜀)
// 모델: 점질량 준정적(QSS). 앞뒤 하중 이동(종가속 · 항력 높이 · 다운포스 앞뒤 몫), 좌우 하중 이동(앞 몫 = 앞 횡하중 이동 배분 lltd),
//   바퀴마다 μ = μ0 − 하중 감도 × 하중(kN) → 축이 낼 수 있는 힘 = Σ μ·Fz (하중 감도가 0이면 좌우 하중 이동은 결과를 바꾸지 않음).
//   횡력은 무게 배분대로 앞뒤 축에 나눔. 뒤축 구동(모터 1개, 축 단위 마찰원). 제동은 이상 배분(두 축이 함께 한계) 가정 → 제동 장치 한계는 도구 3. 롤 · 회생 제동은 넣지 않음
// 점수식: FSK 2026 경기진행규정 제8 ~ 11조(1등 기록 자리에 팀 목표 기록). 효율 CO₂ 환산 1 kWh = 1.3 kg (제12조)
const g = 9.81, RHO = 1.225;                                   // 중력가속도 [m/s²], 공기 밀도 [kg/m³]
let VC = null;                                                 // 곡률별 코너 한계 속도 (감속비와 상관없음 → 계산 한 번에 한 번만)
function car(I, gr){
  const m = I.m, L = I.L/1000, h = I.h/1000, fs = I.fr/100, fa = 1 - I.xcop/I.L, hc = I.hcop/1000, r = I.r_eff/1000, tf = I.tf/1000, tr = I.tr/1000, lt = I.lltd/100;
  const mu = I.mu, mus = I.mu_s || 0, crr = I.crr, cl = 0.5*RHO*I.cla, cd = 0.5*RHO*I.cda, eta = I.eta_dt/100, em = I.eta_m/100;
  const meff = m + I.j_eq/(r*r);                               // 회전부 등가 질량 = J ÷ r² (J ÷ r 이 아님: 예전 계산기 오류)
  const tab = (I.motor || []).slice().sort((a, b) => a[0] - b[0]);
  const Pm = I.pmax*1000*em;                                   // 모터 축 출력 상한 = 축전지 출력 상한 × 모터 · 인버터 효율 [W]
  const nmax = tab.length ? Math.min(I.nmax, tab[tab.length - 1][0]) : I.nmax;
  function Tm(n){ if(n > nmax) return 0; let T;
    if(!tab.length) T = I.tmax; else if(n <= tab[0][0]) T = tab[0][1];
    else { T = tab[tab.length - 1][1]; for(let i = 1; i < tab.length; i++) if(n <= tab[i][0]){ const a = tab[i - 1], b = tab[i]; T = a[1] + (b[1] - a[1])*(n - a[0])/(b[0] - a[0]); break; } }
    const w = n*2*Math.PI/60; return w > 0 ? Math.min(T, Pm/w) : T; }
  const rpm = v => v/r*gr*60/(2*Math.PI);
  const vtop = nmax/gr*2*Math.PI/60*r*(1 - 1e-9);              // 회전수 한계 최고속 [m/s]
  const Fm = v => Tm(rpm(v))*gr*eta/r;                         // 모터가 바퀴에 내는 구동력 [N]
  const Fres = v => cd*v*v + crr*(m*g + cl*v*v);               // 항력 + 구름 저항 (구름 저항 = 계수 × (무게 + 다운포스), 무게 항 포함)
  const Fzf = (v, ax) => m*g*fs + cl*v*v*fa - m*ax*h/L - cd*v*v*hc/L;
  const Fzr = (v, ax) => m*g*(1 - fs) + cl*v*v*(1 - fa) + m*ax*h/L + cd*v*v*hc/L;
  // 바퀴 하중: 축 하중 ÷ 2 ± 좌우 이동(앞 몫 lt). 안쪽이 들리면 바깥이 축 하중 전부
  const dF = (ay, front) => front ? lt*m*ay*h/tf : (1 - lt)*m*ay*h/tr;
  const wheels = (Fz, d) => { let o = Fz/2 + d, i = Fz/2 - d; if(i < 0){ o = Fz; i = 0; } return [Math.max(0, o), i]; };
  const cap = (Fz, d) => { if(!mus) return mu*Math.max(0, Fz); const [o, i] = wheels(Fz, d), f = z => Math.max(0, mu - mus*z/1000)*z; return f(o) + f(i); };
  const capF = (v, ax, ay) => cap(Fzf(v, ax), dF(ay, true)), capR = (v, ax, ay) => cap(Fzr(v, ax), dF(ay, false));
  // 코너 한계 속도: 축마다 횡력(무게 배분대로) ≤ 그 축이 낼 수 있는 힘. 하중 감도가 0이면 바로 풀고, 아니면 이분법
  function vCorner(k){ k = Math.abs(k); if(k < 1e-9) return Infinity; if(VC && VC.has(k)) return VC.get(k); let v;
    if(!mus){ let v2 = Infinity; const cf = m*k*fs - mu*(cl*fa - cd*hc/L), cr = m*k*(1 - fs) - mu*(cl*(1 - fa) + cd*hc/L);
      if(fs > 0 && cf > 0) v2 = Math.min(v2, mu*m*g*fs/cf); if(fs < 1 && cr > 0) v2 = Math.min(v2, mu*m*g*(1 - fs)/cr); v = Math.sqrt(v2); }
    else { const ok = u => { const ay = u*u*k; return m*ay*fs <= capF(u, 0, ay) + 1e-9 && m*ay*(1 - fs) <= capR(u, 0, ay) + 1e-9; };
      let lo = 0, hi = 150; if(ok(hi)) v = Infinity; else { for(let i = 0; i < 50; i++){ const md = (lo + hi)/2; if(ok(md)) lo = md; else hi = md; } v = lo; } }
    if(VC) VC.set(k, v); return v; }
  // 가속: 뒤축 마찰원에서 횡력을 뺀 만큼 구동, 앞축은 하중이 빠져도 횡력을 견뎌야 함. 하중 이동이 가속도에 따라 바뀌므로 4번 되풀이
  function aDrive(v, k, a0){ const ay = v*v*Math.abs(k), Fyr = m*ay*(1 - fs), Fyf = m*ay*fs; let ax = a0 || 0;
    for(let it = 0; it < 4; it++){ const N = capR(v, ax, ay), Fx = Math.sqrt(Math.max(0, N*N - Fyr*Fyr)), F = Math.min(Fm(v), Fx); ax = (F - Fres(v))/meff; }
    if(Fyf > 0 && h > 0 && capF(v, ax, ay) < Fyf){ let lo = -3*g, hi = ax; if(capF(v, lo, ay) >= Fyf){ for(let i = 0; i < 40; i++){ const md = (lo + hi)/2; if(capF(v, md, ay) >= Fyf) lo = md; else hi = md; } ax = lo; } }
    return ax; }
  // 감속: 네 바퀴 제동, 이상 배분 → 두 축 힘의 합으로 마찰원. 항력 · 구름 저항도 감속을 도움
  function aBrake(v, k){ const ay = v*v*Math.abs(k); let d = 0;
    for(let it = 0; it < 3; it++){ const N = capF(v, -d, ay) + capR(v, -d, ay), Fx = Math.sqrt(Math.max(0, N*N - (m*ay)*(m*ay))); d = (Fx + Fres(v))/meff; } return d; }
  return {m, meff, r, gr, eta, em, mu, fs, h, nmax, vtop, rpm, Fm, Fres, Fzr, Fzf, dF, wheels, capF, capR, vCorner, aDrive, aBrake};
}
// 트랙 → 점 (간격 ds 이하). k[j] = j번째 칸의 곡률 [1/m]
function grid(segs, ds){ const s = [0], k = []; for(const [l, R] of segs){ const n = Math.max(1, Math.ceil(l/ds)), st = l/n; for(let i = 0; i < n; i++){ k.push(R ? 1/R : 0); s.push(s[s.length - 1] + st); } } return {s, k}; }
// 출발 위치 s0 에서 시작하도록 구간을 돌림 (그 구간은 둘로 나눔)
function rotate(segs, s0){ const len = segs.reduce((a, r) => a + r[0], 0); s0 = ((s0 % len) + len) % len; if(s0 < 1e-9) return segs.slice();
  let c = 0; for(let i = 0; i < segs.length; i++){ const [l, R] = segs[i]; if(s0 < c + l - 1e-9){ const a = s0 - c, head = a > 1e-9 ? [[a, R]] : [];
      return [[l - a, R], ...segs.slice(i + 1), ...segs.slice(0, i), ...head]; } c += l; } return segs.slice(); }
const reverse = segs => segs.slice().reverse().map(([l, R]) => [l, -R]);
// 차속: 코너 한계 → 앞으로 가속(정지 출발) → 뒤에서 제동. 여러 바퀴를 이어 붙인 점이면 2번째 바퀴부터 앞 바퀴 끝 속도를 이어받음
function speed(C, G){ const N = G.s.length, v = new Array(N), lim = new Array(N);
  for(let i = 0; i < N; i++) lim[i] = Math.min(C.vCorner(Math.max(Math.abs(G.k[i - 1] || 0), Math.abs(G.k[i] || 0))), C.vtop);
  v[0] = 0; let a = 0;
  for(let i = 0; i < N - 1; i++){ a = C.aDrive(v[i], G.k[i], a); v[i + 1] = Math.min(lim[i + 1], Math.sqrt(Math.max(0, v[i]*v[i] + 2*a*(G.s[i + 1] - G.s[i])))); }
  for(let i = N - 2; i >= 0; i--){ const b = C.aBrake(v[i + 1], G.k[i]); v[i] = Math.min(v[i], Math.sqrt(v[i + 1]*v[i + 1] + 2*b*(G.s[i + 1] - G.s[i]))); }
  return {v, lim}; }
// 차속 → 누적 시간 · 에너지 (모터가 낸 힘 × 거리 ÷ 효율, 제동 구간은 0). rec 이면 신호도
function walk(C, G, v, rec){ const N = v.length, tc = [0], ec = [0], S = rec ? {ax:[], ay:[], rpm:[], pbat:[], grip:[], fz_fo:[], fz_fi:[], fz_ro:[], fz_ri:[]} : null;
  for(let i = 0; i < N - 1; i++){ const ds = G.s[i + 1] - G.s[i], vm = (v[i] + v[i + 1])/2, dt = vm > 0 ? ds/vm : Infinity, ax = (v[i + 1]*v[i + 1] - v[i]*v[i])/(2*ds);
    const F = C.meff*ax + C.Fres(vm); tc.push(tc[i] + dt); ec.push(ec[i] + (F > 0 ? F*ds/(C.eta*C.em) : 0));
    if(rec){ const ay = vm*vm*Math.abs(G.k[i]), [fo, fi] = C.wheels(C.Fzf(vm, ax), C.dF(ay, true)), [ro, ri] = C.wheels(C.Fzr(vm, ax), C.dF(ay, false));
      S.ax.push(ax/g); S.ay.push(ay/g); S.rpm.push(C.rpm(v[i])); S.pbat.push(F > 0 ? F*vm/(C.eta*C.em)/1000 : 0);
      S.grip.push(Math.hypot(C.m*ax, C.m*ay)/Math.max(1e-9, C.capF(vm, ax, ay) + C.capR(vm, ax, ay))*100); S.fz_fo.push(fo); S.fz_fi.push(fi); S.fz_ro.push(ro); S.fz_ri.push(ri); } }
  if(rec) for(const k in S) S[k].push(S[k][S[k].length - 1] || 0);
  return {tc, ec, S}; }
// 바퀴 m개를 이어서 (정지 출발) → 바퀴별 시간 · 에너지
function laps(C, segs, m, ds){ const one = grid(segs, ds), P = one.s.length - 1, rep = []; for(let j = 0; j < m; j++) rep.push(...segs);
  const G = grid(rep, ds), sp = speed(C, G), W = walk(C, G, sp.v, false), t = [], E = [];
  for(let j = 0; j < m; j++){ t.push(W.tc[(j + 1)*P] - W.tc[j*P]); E.push(W.ec[(j + 1)*P] - W.ec[j*P]); }
  return {G, v:sp.v, lim:sp.lim, P, t, E}; }
// 스키드패드: 일정 반경 R 에서 낼 수 있는 가장 빠른 일정 차속 (앞축 횡력 · 뒤축 마찰원 · 모터 힘) → 이분법
function skid(C, R){ const m = C.m, fs = C.fs;
  const ok = v => { const ay = v*v/R, Fx = C.Fres(v); if(C.Fm(v) < Fx) return false;
    if(m*ay*fs > C.capF(v, 0, ay) + 1e-9) return false; const N = C.capR(v, 0, ay); return (m*ay*(1 - fs))**2 + Fx*Fx <= N*N; };
  let lo = 0, hi = C.vtop; if(ok(hi)) return hi; for(let i = 0; i < 60; i++){ const md = (lo + hi)/2; if(ok(md)) lo = md; else hi = md; } return lo; }
// 점수: A × ((k × Tmin ÷ T) − 1) ÷ (k − 1) + B, T > k × Tmin 이면 B (완주 점수). 기준(목표)이 0이면 내 기록이 1등
function score(T, ref, A, B, k){ if(!(T > 0) || !isFinite(T)) return 0; const Tm = ref > 0 ? Math.min(ref, T) : T; return T > k*Tm ? B : A*((k*Tm/T) - 1)/(k - 1) + B; }
// 감속비 비교용: 기준을 고정하고, 그보다 빨라져도 점수식을 그대로 늘려 씀 (최대 점수에서 멈추면 더 빠른 감속비끼리 구별이 안 됨)
function scoreRaw(T, ref, A, B, k){ if(!(T > 0) || !isFinite(T)) return 0; return T > k*ref ? B : A*((k*ref/T) - 1)/(k - 1) + B; }
// 네 종목 기록 (감속비 gr, 점 간격 ds)
//   오토크로스: 출발 위치에서 트랙을 거꾸로 정지 출발 한 바퀴 (제10조 ② 3, 열린 경로면 정방향)
//   내구: 정방향, 드라이버 2명이 n1 · n2 바퀴를 각각 정지 출발로 이어서 (제11조 ⑦). 3번째 바퀴부터는 2번째와 같으므로 3바퀴만 계산하고
//         한 드라이버 시간 = 1번째 + (바퀴 − 2) × 2번째 + 마지막(뒤에 바퀴가 없어 끝에서 감속 안 함)
function events(I, gr, ds){ const C = car(I, gr), segs = (I.track || []).filter(r => r[0] > 0), len = segs.reduce((a, r) => a + r[0], 0), closed = I.closed !== false;
  const GA = grid([[I.acc_len, 0]], ds), A = speed(C, GA), WA = walk(C, GA, A.v, false);
  const vs = skid(C, I.sk_R), tsk = 2*Math.PI*I.sk_R/vs;
  const R = {C, acc:WA.tc[WA.tc.length - 1], GA, va:A.v, la:A.lim, skid:tsk, vs, ax:NaN, end:NaN, eEnd:NaN, n:0, n1:0, t1:NaN, t2:NaN, e2:NaN, len};
  if(len > 0){ const F = closed ? rotate(segs, I.s0 || 0) : segs; R.F = F; R.AXs = closed ? reverse(F) : F;
    R.X = laps(C, R.AXs, 1, ds); R.ax = R.X.t[0];
    if(closed){ const n = I.laps > 0 ? Math.max(1, Math.round(I.laps)) : Math.max(2, Math.round(I.end_km*1000/len)), n1 = Math.floor(n/2) || 1, n2 = n - n1;
      R.E3 = laps(C, F, Math.min(3, Math.max(n1, 2)), ds); const t = R.E3.t, E = R.E3.E;
      const st = k => k <= 0 ? 0 : k===1 ? t[0] : t[0] + (k - 2)*t[1] + t[t.length - 1], se = k => k <= 0 ? 0 : k===1 ? E[0] : E[0] + (k - 2)*E[1] + E[E.length - 1];
      Object.assign(R, {n, n1, end: st(n1) + st(n2), eEnd: se(n1) + se(n2), t1:t[0], t2:t[1], e2:E[1]}); } }
  return R; }
function scores(E, ref, raw){ const f = raw ? scoreRaw : score;
  const s = {acc:f(E.acc, ref.acc, 75, 25, 1.5), skid:f(E.skid, ref.skid, 75, 25, 1.25), ax:f(E.ax, ref.ax, 150, 50, 1.45), end:f(E.end, ref.end, 250, 100, 1.45)};
  s.dyn = s.acc + s.skid + (isFinite(E.ax) ? s.ax : 0) + (isFinite(E.end) ? s.end : 0); return s; }
// 감속비 고르기: 2.5 ~ 7.0을 0.1 간격으로 점수 합(늘린 점수식) 비교 (점 간격 2 m로 빠르게). 목표가 0이면 지금 감속비의 내 기록을 기준으로 고정
function bestGr(I){ const E0 = events(I, I.gr, 2), ref = {acc: I.t_acc > 0 ? I.t_acc : E0.acc, skid: I.t_skid > 0 ? I.t_skid : E0.skid, ax: I.t_ax > 0 ? I.t_ax : E0.ax, end: I.t_end > 0 ? I.t_end : E0.end};
  let best = {gr:NaN, raw:-Infinity, s:NaN}; for(let k = 25; k <= 70; k++){ const gg = k/10, E = events(I, gg, 2), r = scores(E, ref, true).dyn;
    if(r > best.raw + 1e-9) best = {gr:gg, raw:r, s:scores(E, {acc:I.t_acc, skid:I.t_skid, ax:I.t_ax, end:I.t_end}).dyn}; } return best; }
// 지도 좌표: 원래 트랙을 그리고, 출발 위치부터 이어지는 점(간격 ds)
function mapXY(segs, s0, ds){ const len = segs.reduce((a, r) => a + r[0], 0); let x = 0, y = 0, hd = 0, c = 0; s0 = len > 0 ? ((s0 % len) + len) % len : 0;
  for(const [l, R] of segs){ if(c + l >= s0 - 1e-9){ const a = s0 - c; if(!R){ x += a*Math.cos(hd); y += a*Math.sin(hd); } else { const dh = a/R; x += R*(Math.sin(hd + dh) - Math.sin(hd)); y -= R*(Math.cos(hd + dh) - Math.cos(hd)); hd += dh; } break; }
    if(!R){ x += l*Math.cos(hd); y += l*Math.sin(hd); } else { const dh = l/R; x += R*(Math.sin(hd + dh) - Math.sin(hd)); y -= R*(Math.cos(hd + dh) - Math.cos(hd)); hd += dh; } c += l; }
  const G = grid(rotate(segs, s0), ds), X = [x], Y = [y];
  for(let i = 0; i < G.s.length - 1; i++){ const st = G.s[i + 1] - G.s[i], k = G.k[i]; if(!k){ x += st*Math.cos(hd); y += st*Math.sin(hd); } else { const R = 1/k, dh = st*k; x += R*(Math.sin(hd + dh) - Math.sin(hd)); y -= R*(Math.cos(hd + dh) - Math.cos(hd)); hd += dh; } X.push(x); Y.push(y); }
  return {X, Y}; }
function calc(I){ VC = new Map();
  const E = events(I, I.gr, 0.5), C = E.C, ref = {acc:I.t_acc, skid:I.t_skid, ax:I.t_ax, end:I.t_end}, S = scores(E, ref), B = I._sweep ? {gr:NaN, s:NaN} : bestGr(I);   // 입력 훑기 중(_sweep)에는 감속비 고르기를 건너뜀 (계산 시간)
  const km = (E.n*E.len)/1000, kWh = E.eEnd/3.6e6;
  const out = { t_acc_s:E.acc, t_skid_s:E.skid, t_ax_s:E.ax, t_end_s:E.end, t_lap1:E.t1, t_fly:E.t2, n_lap:E.n, n_st1:E.n1,
    g_acc:I.t_acc, g_skid:I.t_skid, g_ax:I.t_ax, g_end:I.t_end,
    s_acc:S.acc, s_skid:S.skid, s_ax:S.ax, s_end:S.end, s_dyn:S.dyn,
    vmax:C.vtop*3.6, v_top: E.X ? Math.max(...E.X.v)*3.6 : NaN, ay_skid:E.vs*E.vs/I.sk_R/g, ax_0:C.aDrive(0, 0, 0)/g,
    gr_opt:B.gr, s_dyn_opt:B.s, e_end:kWh, e_lap:E.e2/3.6e6, co2_100: km > 0 ? kWh*1.3/km*100 : NaN };
  // 결과 그래프: 고른 종목
  if(I.view==='ft'){ const vt = C.vtop, V = Array.from({length:121}, (_, i) => vt*i/120);
    const fm = V.map(C.Fm), fx = V.map(v => C.capR(v, 0, 0)), fr = V.map(C.Fres);
    return {out, x:{d:V.map(v => v*3.6)}, sig:{f_m:fm, f_x:fx, f_res:fr, a_x:V.map((v, i) => (Math.min(fm[i], fx[i]) - fr[i])/C.meff/g), p_w:V.map((v, i) => Math.min(fm[i], fx[i])*v/1000)}, main:['f_m','f_x','f_res']}; }
  let G, v, lim, from = 0, to, what = '';
  if(I.view==='end' && E.E3){ const L3 = E.E3, P = L3.P; G = L3.G; v = L3.v; lim = L3.lim;
    if(I.lap==='1'){ to = P; what = '1번째 바퀴'; } else if(I.lap==='all'){ to = L3.G.s.length - 1; what = '1 ~ 3번째 바퀴'; } else { from = P; to = 2*P; what = '2번째 바퀴'; } }
  else if((I.view==='ax' || I.view==='end') && E.X){ G = E.X.G; v = E.X.v; lim = E.X.lim; to = G.s.length - 1; }
  else { G = E.GA; v = E.va; lim = E.la; to = G.s.length - 1; }
  const sl = a => a.slice(from, to + 1), Gs = {s: sl(G.s).map(x => x - G.s[from]), k: G.k.slice(from, to)}, vv = sl(v), W = walk(C, Gs, vv, true);
  const res = { out, x:{d:Gs.s}, sig:{v:vv.map(a => a*3.6), vlim:sl(lim).map(a => a*3.6), t:W.tc, ecum:W.ec.map(e => e/3600), ...W.S}, main:['v','vlim'] };
  // 지도: 원래 트랙 위 출발 위치부터 한 바퀴. 오토크로스는 거꾸로 돌므로 rev, 색은 보이는 바퀴(1 ~ 3번째면 2번째) 차속
  if(E.F && (I.view==='ax' || (I.view==='end' && E.E3))){ const MP = mapXY(E.F, 0, 0.5), P = MP.X.length - 1, mm = mapXY(I.closed !== false ? I.track : E.F, I.closed !== false ? (I.s0 || 0) : 0, 0.5);
    let vc; if(I.view==='ax') vc = res.sig.v.slice().reverse(); else { const off = I.lap==='1' ? 0 : P; vc = E.E3.v.slice(off, off + P + 1).map(a => a*3.6); }
    res.map = {X:mm.X, Y:mm.Y, P, rev: I.view==='ax' && I.closed !== false, vc, what: what ? what + ' · 지도 방향 그대로' : ''}; }
  return res;
}
`,
  verify:[
    {n:'가속 · 접지 한계만 (μ = 1, CG 뒤축 위)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, pmax:1e6, nmax:1e7, acc_len:75}, expect:{t_acc_s:3.910309, ax_0:1}, src:'a = μg → t = √(2 × 75 ÷ 9.81)'},
    {n:'가속 · 회전부 관성 J ÷ r²', I:{m:300, fr:50, h:0, mu:10, crr:0, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100, eta_m:100, pmax:1e6, nmax:1e7, acc_len:75}, expect:{t_acc_s:5.477226}, src:'F = 100 × 4 ÷ 0.25 = 1600 N, 등가 질량 300 + 1.25 ÷ 0.25² = 320 kg → a = 5'},
    {n:'가속 · 구름 저항 무게 항', I:{m:300, fr:50, h:0, mu:10, crr:0.02, cla:0, cda:0, j_eq:1.25, r_eff:250, tmax:100, gr:4, eta_dt:100, eta_m:100, pmax:1e6, nmax:1e7, acc_len:75}, expect:{t_acc_s:5.580840}, src:'a = (1600 − 0.02 × 300 × 9.81) ÷ 320 = 4.8161'},
    {n:'회전수 한계 최고속', I:{nmax:6500, gr:3.55, r_eff:229}, expect:{vmax:158.0708}, src:'6500 ÷ 3.55 × 2π ÷ 60 × 0.229 × 3.6'},
    {n:'스키드패드 · 에어로 없음', I:{mu:1.5, crr:0, cla:0, cda:0, sk_R:9.125}, expect:{t_skid_s:4.947846, ay_skid:1.5}, src:'v = √(μgR) → T = 2πR ÷ v'},
    {n:'스키드패드 · 다운포스 (앞뒤 몫 = 무게 배분)', I:{m:300, fr:50, L:1550, xcop:775, mu:1.5, crr:0, cla:3, cda:0, sk_R:9.125}, expect:{t_skid_s:4.735903}, src:'mv²/R = μ(mg + ½ρC_LA v²) → v² = μmg ÷ (m/R − μ½ρC_LA)'},
    {n:'하중 감도 0 → 횡하중 이동 배분과 상관없음', I:{mu:1.5, mu_s:0, lltd:20, crr:0, cla:0, cda:0, sk_R:9.125}, expect:{t_skid_s:4.947846}, src:'μ 일정이면 축 힘 = μ × 축 하중 (좌우로 옮겨도 합은 같음)'},
    {n:'하중 감도 · 스키드패드', I:{m:300, fr:50, h:300, tf:1200, tr:1200, lltd:50, mu:1.5, mu_s:0.1, crr:0, cla:0, cda:0, sk_R:9.125}, expect:{t_skid_s:5.138338, ay_skid:1.390843}, src:'축 하나: m·ay/2 = μ0·W/2 − μs(2(W/4)² + 2ΔF²), ΔF = ½·m·ay·h/t 를 ay 에 대해 풂'},
    {n:'가속 점수식 (목표 기록 = 1등 기록)', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, pmax:1e6, nmax:1e7, acc_len:75, t_acc:3.5}, expect:{s_acc:76.39071}, src:'75 × ((1.5 × 3.5 ÷ 3.9103) − 1) ÷ 0.5 + 25 (제8조)'},
    {n:'가속 점수 · 1.5배 넘으면 완주 점수', I:{m:300, fr:0, h:0, mu:1, crr:0, cla:0, cda:0, j_eq:0, tmax:1e5, pmax:1e6, nmax:1e7, acc_len:75, t_acc:2}, expect:{s_acc:25}, src:'3.91 > 1.5 × 2 → 25점'},
    {n:'원 트랙 2번째 바퀴 = 스키드패드', I:{mu:1.5, crr:0, cla:0, cda:0, sk_R:9.125, track:[[57.33407, 9.125]]}, expect:{t_fly:4.947846}, src:'달리는 중 한 바퀴 = 2πR ÷ √(μgR)'},
    {n:'직선 1 km · 최고속 일정', I:{crr:0.015, cla:0, cda:0, m:300, eta_dt:100, eta_m:100, nmax:6500, gr:3.55, r_eff:229, end_km:20, track:[[1000, 0]]}, expect:{t_fly:22.77461, n_lap:20, e_lap:0.0122625, co2_100:2.671627}, src:'1000 ÷ 43.909 m/s, 한 바퀴 에너지 = 0.015 × 300 × 9.81 × 1000 J, 내구 = 정지 출발 2번의 운동에너지(등가 질량) + 20 바퀴 구름 저항, CO₂ = kWh × 1.3'},
    {n:'내구 바퀴 수 입력 · 드라이버 절반씩', I:{crr:0.015, cla:0, cda:0, track:[[1000, 0]], laps:7}, expect:{n_lap:7, n_st1:3}, src:'7바퀴 → 3 + 4'},
    {n:'출발 위치 · 원 트랙은 어디서 출발해도 같음', I:{mu:1.5, crr:0, cla:0, cda:0, sk_R:9.125, track:[[57.33407, 9.125]], s0:20}, expect:{t_fly:4.947846}, src:'원 위 모든 점이 같으므로 2번째 바퀴는 그대로'},
    {n:'목표 기록 0 → 내 기록이 1등', I:{crr:0.015, cla:0, cda:0, track:[[1000, 0]], end_km:20}, expect:{s_end:350, s_ax:200}, src:'T = Tmin → 250 + 100, 150 + 50'}
  ]
};

/* ---------- 대시보드 '파트별 > 차량 목표 · 파워트레인': 대시보드 값으로 도구 2를 돌린 결과(읽기 전용) ---------- */
const T2P = { R:null, key:'', busy:false, w:null };
function t2PartInputs(view){ const I = {}; WB_TOOLS['2'].inputs.forEach(d => { const db = wbDash(d.dk); I[d.k] = db ? db.v : d.v; });
  try{ const s = JSON.parse(localStorage.getItem(wbStoreKey('2')) || '{}') || {}; ['eta_m','acc_len','sk_R','end_km'].forEach(k => { if(typeof s[k]==='number' && isFinite(s[k])) I[k] = s[k]; }); }catch(e){}
  return {...I, ...t2ExtraI(), view}; }
function t2PartDirty(){ T2P.key = ''; if(typeof DASH!=='undefined' && (DASH.part==='goal' || DASH.part==='pt') && $('#t2part')) t2PartRun(); }
function t2PartRun(){ const I = t2PartInputs('ft'), key = JSON.stringify(I); if(key===T2P.key || T2P.busy) return; T2P.busy = true;
  try{ if(!T2P.w) T2P.w = new Worker(URL.createObjectURL(new Blob([WB_TOOLS['2'].code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false}); } };'], {type:'text/javascript'}))); }catch(e){ T2P.busy = false; return; }
  T2P.w.onmessage = e => { T2P.busy = false; T2P.key = key; if(e.data.ok){ T2P.R = e.data.r; const b = $('#t2part'); if(b) b.innerHTML = t2PartBody(DASH.part, I, T2P.R); } };
  T2P.w.postMessage(I); }
function t2PartHTML(kind){ setTimeout(t2PartRun, 0);
  return `<div class="t2-part"><p class="dp-note">대시보드 설계값과 도구 2의 트랙 · 모터 표로 계산한 결과입니다. 트랙 · 모터 표를 바꾸려면 <button type="button" class="lnk" data-wb="2">도구 2 랩타임 · 점수 시뮬레이터</button>를 엽니다.</p><div id="t2part">${T2P.R ? t2PartBody(kind, t2PartInputs('ft'), T2P.R) : '<p class="muted">계산 중…</p>'}</div></div>`; }
function t2PartBody(kind, I, R){ const o = R.out, f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
  if(kind==='goal'){ const rows = [['가속', o.g_acc, o.t_acc_s, o.s_acc, 100, 3], ['스키드패드', o.g_skid, o.t_skid_s, o.s_skid, 100, 3], ['오토크로스', o.g_ax, o.t_ax_s, o.s_ax, 200, 2], ['내구', o.g_end, o.t_end_s, o.s_end, 350, 1]];
    const gs = wbDash('score_goal');
    return `<table class="dvi-t t2-gt"><thead><tr><th>종목</th><th>목표 기록</th><th>예상 기록</th><th>차이</th><th>점수 (목표를 1등으로 볼 때)</th></tr></thead><tbody>${rows.map(([n, g0, t, s, mx, d]) => { const has = g0 > 0, df = t - g0;
        return `<tr><td>${n}</td><td>${has ? f(g0, d) + ' s' : '<span class="muted">정하지 않음</span>'}</td><td><b>${f(t, d)}</b> s</td><td class="${has && isFinite(df) ? (df > 0 ? 'wb-err' : 'ok') : ''}">${has && isFinite(df) ? (df > 0 ? '+' : '−') + wbFmt(Math.abs(df), d) + ' s' : '—'}</td><td>${f(s, 1)} / ${mx}</td></tr>`; }).join('')}
      <tr class="t2-sum"><td>동적 합</td><td colspan="3" class="muted">목표 종합점수 ${gs ? f(gs.v, 0) + '점' : '정하지 않음'} (보고서 · 효율 포함 1,000점 만점 기준)</td><td><b>${f(o.s_dyn, 1)}</b> / 750</td></tr></tbody></table>
      <p class="dp-note">목표 기록은 대시보드 '차량 목표'(공통) 값입니다. 목표를 정하지 않은 종목은 내 기록을 1등으로 계산하므로 점수가 최대로 나옵니다.</p>`; }
  return `<div class="dp-plots">${wbPlot({id:'t2ft', w:640, h:280, x:{d:R.x.d, n:'차속', u:'km/h'}, ys:[{k:'f_m', d:R.sig.f_m, c:WB_COL[0], n:'모터 구동력', u:'N'}, {k:'f_x', d:R.sig.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N'}, {k:'f_res', d:R.sig.f_res, c:WB_COL[2], n:'주행 저항', u:'N'}], label:'구동력 선도'})}</div>
    <div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 구동력 (바퀴)</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계 (직진 · 일정 속도)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항 (항력 + 구름)</span></div>
    <p class="dp-note">감속비 ${f(I.gr, 2)} · 회전수 한계 최고속 ${f(o.vmax, 1)} km/h. 모터 구동력이 접지 한계보다 큰 구간은 바퀴가 미끄러지므로 접지 한계가 가속을 정합니다. 점수 합이 가장 큰 감속비는 ${f(o.gr_opt, 2)}, 내구 한 바퀴 에너지 ${f(o.e_lap, 3)} kWh입니다.</p>`; }
