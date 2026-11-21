/* ============================================================
   도구 4 축전지 팩 계산기 — docs/TOOLS-PLAN.md 5절 (설계 단계 P1 셀 선정 · P4-5 축전지)
   - 팀원 Yechan Hyun 의 FSK Battery Calculator 1.0.1 을 작업창 도구로 옮김 (계산식 그대로, 허락 받음)
   - 셀 사양 · 세그먼트 구성 → 팩 전압 · 용량 · 질량 · 내부저항 · 전류, 규정(세그먼트 120 V · 6 MJ · 12 kg, 팩 600 V) 확인, 전압 단계별 부하 전압 · 출력 · 손실
   - 결과(직렬 · 병렬 수, 셀 값, 팩 저항 · 전류 한계 등)를 대시보드로 → 도구 2P 는 받기만 함
   - 셀 프리셋: 이 브라우저에 이름 붙여 저장 (run2x.t4.presets)
   ============================================================ */
const T4PK = 'run2x.t4.presets';
const T4CELL = ['c_vmax', 'c_vnom', 'c_vmin', 'c_ah', 'c_imax', 'c_ich', 'c_r', 'c_g'];
const T4 = { presets:[], name:'' };
wbModeReg(m => { T4.presets = []; T4.name = ''; try{ const a = JSON.parse(localStorage.getItem(wbMK(T4PK)) || '[]'); if(Array.isArray(a)) T4.presets = a.filter(p => p && typeof p.name==='string' && p.cell); }catch(e){} });
const t4PSave = () => { try{ localStorage.setItem(wbMK(T4PK), JSON.stringify(T4.presets)); return true; }catch(e){ return false; } };
/* 셀 표 (SOC × 온도): 글 표 3 개 (OCV · 내부저항 · 용량), 이 브라우저에 저장 (run2x.t4.cell). 도구 2P [축전지 › 셀 표]가 [도구 4 에서 가져오기]로 복사 */
const T4CK = 'run2x.t4.cell', T4C = {o:'', r:'', c:'', u:{}};
/* 표마다 [표 | 셀 값 칸] 고름 (2P 의 [아래 표 | 위 상수] 와 같은 방식, 2026-11-12). 고른 적 없으면 표가 차 있을 때 표 */
const t4Use = k => T4C.u && (T4C.u[k]==='tab' || T4C.u[k]==='const') ? T4C.u[k] : String(T4C[k] || '').trim() ? 'tab' : 'const';
wbModeReg(m => { Object.assign(T4C, {o:'', r:'', c:'', u:{}}); try{ const s = JSON.parse(localStorage.getItem(wbMK(T4CK)) || '{}'); ['o', 'r', 'c'].forEach(k => { if(typeof s[k]==='string') T4C[k] = s[k]; }); if(s.u && typeof s.u==='object') T4C.u = {...s.u}; }catch(e){} });
const t4CSave = () => { try{ localStorage.setItem(wbMK(T4CK), JSON.stringify(T4C)); }catch(e){} };
function t4CellGet(){ const o = {}; ['o', 'r', 'c'].forEach(k => { o[k] = t4Use(k)==='tab' ? T4C[k] : ''; }); return o; }   /* [셀 값 칸]을 고른 표는 빈 표로 넘김 */
const t4PM = (k, txt) => typeof t2GridParse!=='function' ? null : k==='c' ? t2PairParse(txt).map : t2GridParse(txt).map;
const t4CellI = () => ({cellO: t4Use('o')==='tab' ? t4PM('o', T4C.o) : null, cellR: t4Use('r')==='tab' ? t4PM('r', T4C.r) : null, cellC: t4Use('c')==='tab' ? t4PM('c', T4C.c) : null});
/* 결과 아래: 셀 표 편집 · 온도 o_T 에서 SOC 별 출력 */
/* 셀 표 (2026-11-12): 표 3개는 [편집] 탭 맨 아래 (칸마다 고치는 표, 다른 표와 같음), 셀 온도 · SOC 별 출력은 [결과] 탭 */
/* 셀 표 3개 = 2P 칸 표 그대로 (WBGRID 't4:o' · 't4:r' · 't4:c', 2026-11-12). 고르기 [아래 표 | 위 상수] · 표 꺼짐 줄도 2P 와 같음 (위 상수 = 셀 사양 카드) */
const t4CSet = (k, txt) => { T4C[k] = txt; T4C.u = {...(T4C.u || {}), [k]:'tab'}; t4CSave(); };
[['o', 'V'], ['r', 'mΩ'], ['c', '']].forEach(([k, u]) => { WBGRID['t4:' + k] = {get:() => T4C[k] || '', set(txt){ t4CSet(k, txt); wbPaint(['tabs']); wbCalcSoon(); }, repaint:() => wbPaint(['tabs']),
  head:k==='c' ? ['셀 온도 °C', '용량 Ah'] : ['SOC % \\ 셀 온도 °C', '25'], map:k!=='c', rl:k==='c' ? '온도' : 'SOC', cl:'온도', cu:'°C',
  parse:txt => k==='c' ? t2PairParse(txt) : t2GridParse(txt, u), bad:k==='c' ? '온도 · 용량 행을 읽지 못했습니다.' : '표를 읽지 못했습니다. 첫 행 = 셀 온도 °C, 첫 열 = SOC %.'}; });
const t4ConstNote = k => { const I = WB.I; return k==='o' ? `셀 ${wbFmt(I.c_vmin, 2)} ~ ${wbFmt(I.c_vmax, 2)} V 직선 (SOC 0 ~ 100 %)` : k==='r' ? `셀 내부저항 ${wbFmt(I.c_r, 1)} mΩ 일정` : `셀 용량 ${wbFmt(I.c_ah, 2)} Ah 일정`; };
function t4CellEdHTML(){ const P = (k, txt, u) => k==='c' ? t2PairParse(txt) : t2GridParse(txt, u);
  const box = (k, nm, u, tpl) => { const use = t4Use(k), p = P(k, T4C[k], u), has = String(T4C[k] || '').trim();
    const seg = `<span class="t2-use"><span class="muted">계산에 쓸 값</span>${t4Seg('data-t4cu', use, [['tab', '아래 표'], ['const', '위 상수']]).replace('<span class="dc-seg"', `<span class="dc-seg" data-t4cuk="${k}"`)}</span>`;
    const head = `<div class="t4-cbh"><b>${nm}</b>${seg}</div>`;
    if(use==='const') return `<div class="t4-cbox off">${head}<div class="t2-mfold off"><b>표 꺼짐</b><span>${t4ConstNote(k)}</span></div></div>`;   /* [위 상수]면 표는 안 그림 */
    return `<div class="t4-cbox" data-wbneed="t4:${k}">${head}
      <div class="t4-cbt">${has ? `<span class="muted">${p.map ? p.msg : '<span class="wb-err">읽지 못함</span>'}</span>` : ''}<button type="button" class="btn small" data-t4ctpl="${tpl}">양식 .xlsx</button><label class="btn small">파일 가져오기<input type="file" accept=".xlsx,.csv,.txt" data-t4cfile="${k}" hidden></label>${has ? `<button type="button" class="btn small" data-t4crx="${k}">표 지우기</button>` : ''}</div>
      <div class="t2-tw t4-gw">${t2GridTable('t4:' + k, T4C[k] || '')}</div></div>`; };
  return `<div class="wb-ig wb-elh">셀 표 (SOC × 온도) <span class="wb-meta">도구 2P [축전지 › 셀 표]가 가져감</span></div><div class="t4-cboxes">${box('o', '셀 OCV (V)', 'V', 'bocv')}${box('r', '셀 내부저항 (mΩ)', 'mΩ', 'bres')}${box('c', '셀 용량 (Ah)', '', 'bcap')}</div>`; }
/* 온도에 따라 바뀌는 표를 쓰는지 (OCV · 내부저항 표의 온도 열이 다름, 용량 표의 용량이 다름). 없으면 셀 온도 칸 · 슬라이더 막음 (2026-11-12) */
function t4TempDep(){ const I = t4CellI(), g = M => M && Array.isArray(M.n) && M.n.length > 1 && (M.e || []).some(r => r.some(v => v !== r[0]));
  return g(I.cellO) || g(I.cellR) || (Array.isArray(I.cellC) && I.cellC.length > 1 && I.cellC.some(q => q[1] !== I.cellC[0][1])); }
function t4CellHTML(){ const R = WB.R, o = R && R.out, f = t4F, T = R && R.soc, td = t4TempDep();
  const row = (nm, fn) => `<tr><td>${nm}</td>${T.map(t => `<td>${fn(t)}</td>`).join('')}</tr>`, tT = Number.isFinite(WB.I.o_T) ? WB.I.o_T : 25;
  const bd = o && (o.s_bd===0 ? '전 구간 충족' : Number.isFinite(o.s_bd) ? `SOC ${f(o.s_bd, 1)} %` : '전 구간 미달');
  return `<section class="wb-sec t4-cell" aria-label="SOC 별 출력"><div class="wb-h"><h3>SOC 별 출력</h3></div>
    <div class="t4-bar"><b>셀 온도</b><label class="t4-oi"><input type="number" step="any" value="${tT}" data-t4ot aria-label="셀 온도"${td ? '' : ' disabled'}> °C</label>
      <input type="range" class="t4-ots" min="-10" max="90" step="1" value="${Math.max(-10, Math.min(90, tT))}" data-t4ots aria-label="셀 온도 슬라이더"${td ? '' : ' disabled'}>
      ${bd ? `<span class="t4-bd">충족 경계 <b>${bd}</b></span>` : ''}
      ${o ? `<span class="muted">이 온도 셀 용량 ${f(o.cap_T, 2)} Ah · 팩 에너지 ${f(o.e_T, 3)} kWh (OCV 평균 ${f(o.ocv_mean, 3)} V) · 표 전류 ${f(o.o_i, 1)} A</span>` : ''}</div>
    ${T ? `<div class="t4-tw"><table class="dvi-t t4-t"><thead><tr><th>SOC</th>${T.map(t => `<th>${t.sc} %</th>`).join('')}</tr></thead><tbody>
      ${row('셀 OCV', t => f(t.v, 3) + ' V')}${row('셀 내부저항', t => f(t.r, 2) + ' mΩ')}${row('팩 무부하 전압', t => f(t.oc, 1) + ' V')}${row('팩 내부저항', t => f(t.rp, 1) + ' mΩ')}
      ${row('팩 부하 전압', t => f(t.load, 1) + ' V')}${row('부하 시 셀 전압', t => f(t.loadCell, 3) + ' V')}${row('단자 출력', t => isFinite(t.power) ? f(t.power, 2) + ' kW' : '성립 불가')}
      ${row('최소 셀 전압 판정', t => `<span class="${t.ok ? 'ok' : 'wb-err'}">${t.load <= 0 ? '성립 불가' : t.ok ? '충족' : '미달'}</span>`)}</tbody></table></div>` : ''}</section>`; }
/* 셀 표 지우기 (칸 고치기 · 붙여넣기 · 행 · 열은 2P 칸 표 공통 처리) */
document.addEventListener('click', e => { if(WB.id!=='4' || !e.target.closest) return; const x = e.target.closest('[data-t4crx]'); if(x){ const k = x.dataset.t4crx; t4CSet(k, ''); wbPaint(['tabs']); wbCalcSoon(); } });
/* 셀 온도 슬라이더 (−10 ~ 90 °C): 끄는 동안 숫자 칸 따라 바뀜, 놓으면 계산 */
document.addEventListener('input', e => { if(WB.id!=='4' || !e.target.matches || !e.target.matches('[data-t4ots]')) return; const n = document.querySelector('#wb [data-t4ot]'); if(n) n.value = e.target.value; });
document.addEventListener('change', e => { if(WB.id!=='4' || !e.target.matches || !e.target.matches('[data-t4ots]')) return; WB.I.o_T = +e.target.value; wbSave(); wbCalcSoon(); });
document.addEventListener('change', e => { if(WB.id!=='4' || !e.target.matches) return; const t = e.target;
  if(t.matches('[data-t4ot]')){ const v = +t.value; if(Number.isFinite(v)){ WB.I.o_T = v; wbSave(); wbCalcSoon(); } return; }
  if(t.matches('[data-t4cfile]')){ const f = t.files && t.files[0], k = t.dataset.t4cfile; t.value = ''; if(!f || typeof t2ReadCells!=='function') return;
    t2ReadCells(f).then(cells => { const txt = cells.map(r => r.map(c => String(c ?? '').trim()).join(', ').replace(/(, )+$/, '')).filter(l => l.replace(/[, ]/g, '') && !l.startsWith('#')).join('\n');
      const p = k==='c' ? t2PairParse(txt) : t2GridParse(txt); if(!p.map){ toast('표를 읽지 못했습니다.'); return; } t4CSet(k, txt); wbPaint(['tabs']); wbCalcSoon(); toast(`${f.name}: ${String(p.msg).replace(/<[^>]+>/g, '')}`); }).catch(err => toast(String(err.message || err))); } });
document.addEventListener('click', e => { if(WB.id!=='4' || !e.target.closest) return; const s = e.target.closest('[data-t4cu]'); if(!s || s.disabled) return;
  const k = s.closest('[data-t4cuk]').dataset.t4cuk; T4C.u = {...(T4C.u || {}), [k]:s.dataset.t4cu}; t4CSave(); wbPaint(['tabs']); wbCalcSoon(); });
document.addEventListener('click', e => { if(WB.id!=='4' || !e.target.closest) return; const b = e.target.closest('[data-t4ctpl]'); if(b && typeof t2Template==='function') t2Template(b.dataset.t4ctpl, 'xlsx'); });
const t4F = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
const t4Seg = (attr, cur, items) => `<span class="dc-seg" role="group">${items.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${cur===k}">${t}</button>`).join('')}</span>`;
/* 위: 셀 프리셋 · 구성 방식 · 규정 */
function t4ExtHTML(){ const w = $('#wb'); if(w) w.classList.remove('t2-edit');
  const au = WB.I.auto===1 ? 1 : WB.I.auto===2 ? 2 : 0;
  return `<div class="t4-x"><div class="t4-bar"><b>셀 프리셋</b>
      <select data-t4ps aria-label="저장한 셀"><option value="">저장한 셀 고르기</option>${T4.presets.map((p, i) => `<option value="${i}">${wbEsc(p.name)}</option>`).join('')}</select>
      <input type="text" data-t4pn maxlength="200" placeholder="셀 이름 (예: 제조사 · 모델)" value="${wbEsc(T4.name)}" aria-label="셀 이름">
      <button type="button" class="btn small" data-t4p="save">지금 셀 값 저장</button><button type="button" class="btn small" data-t4p="del">고른 셀 지우기</button>
      <span class="muted">이 브라우저에 저장 (공유는 위 [내보내기 .json])</span></div>
    <div class="t4-bar"><b>구성 방식</b>${t4Seg('data-t4auto', au, [[0, '수동 (직렬 · 병렬 직접)'], [1, '병렬 자동 (세그먼트 직렬 입력)'], [2, '직렬 자동 (병렬 입력)']])}
      <span class="muted" id="t4why">${t4Why()}</span></div>
    <div class="t4-rules" id="t4rules">${t4Rules()}</div>
    <p class="muted t4-note">계산식은 팀원 Yechan Hyun 의 FSK Battery Calculator 1.0.1 과 같습니다. [대시보드에 반영]은 직렬 · 병렬 수, 팩 공칭 전압 · 에너지 · 내부저항 · 무게, 적용 전류(방전 전류 한계) · 충전 전류 한계, 셀 값을 보내고, 도구 2P 는 이 값을 받아 씁니다.</p></div>`; }
function t4Why(){ const R = WB.R; if(!R) return ''; const au = WB.I.auto;
  return au===1 ? `세그먼트 ${R.out.s_seg_o}S 기준 → 병렬 최대 ${R.out.n_p_o}P · ${R.why} 제한` : au===2 ? `병렬 ${R.out.n_p_o}P 기준 → 세그먼트 직렬 최대 ${R.out.s_seg_o}S · ${R.why} 제한` : '직렬과 병렬을 직접 넣습니다.'; }
function t4Rules(){ const o = WB.R && WB.R.out; if(!o) return '';
  return [['세그먼트 최대 전압', o.v_seg_max, 120, 'V'], ['세그먼트 규정 에너지', o.ej_seg, 6, 'MJ'], ['세그먼트 질량', o.m_seg, 12, 'kg'], ['팩 최대 전압', o.v_pack_max, 600, 'V'], ...(o.v_inv_o > 0 ? [['팩 최대 전압 · 부품 정격 이상 (인버터)', o.v_pack_max, o.v_inv_o, 'V']] : [])].map(([nm, v, mx, u]) => { const ok = v <= mx + 1e-9;
    return `<div class="t4-rule${ok ? '' : ' bad'}"><small>${nm} / ${mx} ${u}</small><b>${t4F(v, 3)} ${u}</b><span class="t4-bg"><i style="width:${Math.min(100, v/mx*100).toFixed(1)}%"></i></span>
      <span class="${ok ? 'ok' : 'wb-err'}">${ok ? '충족 · 여유' : '초과'} ${t4F(Math.abs(mx - v), 3)} ${u} · ${t4F(v/mx*100, 1)} %</span></div>`; }).join(''); }
/* 결과 아래: 전압 단계별 출력 표 */
function t4MidHTML(){ const R = WB.R, om = WB.I.o_mode===1 ? 1 : WB.I.o_mode===2 ? 2 : 0;
  if(!R) return ''; const o = R.out, T = R.tab, f = t4F;
  const row = (nm, fn) => `<tr><td>${nm}</td>${T.map(t => `<td>${fn(t)}</td>`).join('')}</tr>`;
  return `<section class="wb-sec t4-pw" aria-label="전압 단계별 출력"><div class="wb-h"><h3>전압 단계별 출력</h3><span class="wb-meta">전압 범위 % = 최소 + (최대 − 최소) × 비율 (충전율 SOC 아님)</span></div>
    <div class="t4-bar"><b>표 전류</b>${t4Seg('data-t4om', om, [[0, `제한 적용 (${f(o.i_bms_max, 1)} A)`], [1, `셀 사양 최대 (${f(o.i_cellmax, 1)} A)`], [2, '직접']])}
      ${om===2 ? `<label class="t4-oi"><input type="number" step="any" min="0" max="${o.i_bms_max}" value="${WB.I.o_i || 0}" data-t4oi aria-label="표 전류"> A <span class="muted">(0 ~ ${f(o.i_bms_max, 1)} A, 넘으면 상한)</span></label>` : ''}
      <span class="muted">적용 ${f(o.o_i, 1)} A · 셀당 ${f(o.o_i / o.n_p_o, 2)} A · 입력한 저항을 모든 전압에 똑같이</span></div>
    <div class="t4-tw"><table class="dvi-t t4-t"><thead><tr><th>셀 무부하 전압 기준</th>${T.map(t => `<th>${t.nm}</th>`).join('')}</tr></thead><tbody>
      ${row('팩 무부하 전압', t => f(t.oc, 2) + ' V')}${row('셀 무부하 전압', t => f(t.v, 3) + ' V')}${row('팩 전압 강하', t => f(t.drop, 2) + ' V')}
      ${row('팩 부하 전압', t => f(t.load, 2) + ' V')}${row('부하 시 셀 전압', t => f(t.loadCell, 3) + ' V')}
      ${row('단자 출력', t => isFinite(t.power) ? f(t.power, 3) + ' kW' : '성립 불가')}${row('팩 저항 손실', t => f(t.loss, 3) + ' kW')}
      ${row('셀 저항 발열 합', t => f(t.lossCell, 3) + ' kW')}${row('추가 저항 발열', t => f(t.lossX, 3) + ' kW')}
      ${row('최소 셀 전압 판정', t => `<span class="${t.ok ? 'ok' : 'wb-err'}">${t.load <= 0 ? '부하 전압 성립 불가' : t.ok ? '충족' : '최소 셀 전압 미달'}</span>`)}</tbody></table></div>
    <p class="muted t4-note">단자 출력 = 지정 전류에서 계산한 축전지 단자 전력입니다. 최소 셀 전압 미달 칸의 값은 쓸 수 있는 출력으로 보장되지 않습니다.</p></section>`; }
document.addEventListener('click', e => { if(WB.id!=='4' || !e.target.closest) return; const t = e.target;
  const au = t.closest('[data-t4auto]'); if(au){ WB.I.auto = +au.dataset.t4auto; wbSave(); wbPaint(['in', 'ext']); wbCalcSoon(); return; }
  const il = t.closest('[data-t4il]'); if(il){ WB.I.il_on = +il.dataset.t4il; wbSave(); wbPaint(['in']); wbCalcSoon(); return; }
  const vi = t.closest('[data-t4vi]'); if(vi){ WB.I.vi_on = +vi.dataset.t4vi; wbSave(); wbPaint(['in', 'ext']); wbCalcSoon(); return; }
  const om = t.closest('[data-t4om]'); if(om){ WB.I.o_mode = +om.dataset.t4om; wbSave(); wbCalcSoon(); return; }
  const pb = t.closest('[data-t4p]'); if(pb){ const nmEl = document.querySelector('[data-t4pn]'), nm = (nmEl ? nmEl.value : '').trim();
    if(pb.dataset.t4p==='save'){ if(!nm){ toast('셀 이름을 넣으세요.'); return; } const cell = Object.fromEntries(T4CELL.map(k => [k, WB.I[k]])), i = T4.presets.findIndex(p => p.name===nm);
      if(i < 0) T4.presets.push({name:nm, cell}); else T4.presets[i] = {name:nm, cell}; T4.name = nm; toast(t4PSave() ? `"${nm}" 저장` : '브라우저 저장을 쓸 수 없습니다. 내보내기 .json 으로 보관하세요.'); wbPaint(['ext']); return; }
    const sel = document.querySelector('[data-t4ps]'), i = sel && sel.value!=='' ? +sel.value : -1; if(i < 0){ toast('지울 셀을 먼저 고르세요.'); return; }
    T4.presets.splice(i, 1); t4PSave(); wbPaint(['ext']); } });
document.addEventListener('change', e => { if(WB.id!=='4' || !e.target.matches) return; const t = e.target;
  if(t.matches('[data-t4ps]')){ if(t.value==='') return; const p = T4.presets[+t.value]; if(!p) return; T4CELL.forEach(k => { if(Number.isFinite(+p.cell[k])) WB.I[k] = +p.cell[k]; }); T4.name = p.name; wbSave(); wbPaint(['in', 'ext']); wbCalcSoon(); }
  else if(t.matches('[data-t4oi]')){ WB.I.o_i = Math.max(0, +t.value || 0); wbSave(); wbCalcSoon(); }
  else if(t.matches('[data-t4pn]')) T4.name = t.value; });

/* ============================================================ 이 탭 사용법 */
const M4TOUR = [
  ['#wb .wb-bar', '작업창', '[← 도구 모음]으로 닫습니다. 오른쪽은 이 사용법, 좌표계, 코드 · 검증(계산 코드와 손계산 비교표), 입력 내보내기 · 가져오기, 대시보드에 반영(직렬 · 병렬 수, 팩 전압 · 에너지 · 저항 · 무게, 적용 전류, 셀 값)입니다.'],
  ['#wb .wb-in', '입력', '셀 사양(데이터시트), 팩 구성(세그먼트 수 · 세그먼트 직렬 수 · 병렬 수), 추가 무게 · 저항, 팩 사용 전류 제한([제한 적용 · 셀 사양 최대])입니다. [도구 연결 ▾]에서 대시보드의 팀 셀 값을 가져옵니다.'],
  ['#wb .t4-x', '셀 프리셋 · 구성 방식 · 규정', '셀 값을 이름 붙여 저장해 두고 골라 쓸 수 있습니다. 구성 방식을 자동으로 두면 한쪽(세그먼트 직렬 또는 병렬)을 넣었을 때 규정(120 V · 6 MJ · 12 kg) 안에서 다른 쪽 최대를 찾습니다. 아래 막대는 세그먼트 규정 사용률입니다.'],
  ['#wb #wbout', '결과', '팩 · 세그먼트 · 전기 결과입니다. 팩 저항 = (전체 직렬 ÷ 병렬) × 셀 저항 + 추가 저항, 적용 전류 = min(셀 최대 × 병렬, 제한).'],
  ['#wb .t4-pw', '전압 단계별 출력', '셀 무부하 전압이 최대 · 공칭 · 전압 범위 90 ~ 10 % 일 때 표 전류로 부하 전압 · 단자 출력 · 손실 · 최소 셀 전압 판정을 봅니다. 표 전류는 [제한 적용 · 셀 사양 최대 · 직접]에서 고릅니다.'],
];

/* ============================================================ 도구 정의 */
const T4G = {cell:'셀 사양', cfg:'팩 구성', add:'추가 · 제한'};
WB_TOOLS['4'] = {
  no:'4', stage:'P1', name:'축전지 팩 계산기',
  noSig:true,
  inputs:[
    {k:'c_vmax', dk:'c_vmax', v:4.2, d:2, g:T4G.cell}, {k:'c_vnom', dk:'c_vnom', v:3.6, d:2, g:T4G.cell}, {k:'c_vmin', dk:'c_vmin', v:2.5, d:2, g:T4G.cell},
    // 기본 = 2024 차 (REF4 설계보고서 · STEP): 삼성 SDI INR21700-40T, 5 세그먼트 × 14S7P (70s7p). 셀 값은 제조사 사양 (4.0 Ah · 35 A 연속 · 충전 6 A · 내부 저항 ≤ 12 mΩ (AC 1 kHz) · 70 g)
    {k:'c_ah', dk:'c_ah', v:4.0, d:2, g:T4G.cell}, {k:'c_imax', dk:'c_imax', v:35, d:1, g:T4G.cell}, {k:'c_ich', dk:'c_ich', v:6, d:1, g:T4G.cell}, {k:'c_r', dk:'c_r', v:12, d:2, g:T4G.cell}, {k:'c_g', dk:'c_g', v:70, d:1, g:T4G.cell},
    {k:'n_seg', dk:'n_seg', v:5, d:0, g:T4G.cfg}, {k:'s_seg', n:'세그먼트 직렬 수 (S)', u:'개', v:14, d:0, g:T4G.cfg}, {k:'n_p', dk:'n_p', n:'병렬 수 (P)', v:7, d:0, g:T4G.cfg},
    {k:'x_mseg', n:'세그먼트당 추가 무게 (버스바 · 케이스 등)', u:'kg', v:0, d:2, g:T4G.add}, {k:'x_mpack', n:'팩 전체 추가 무게 (박스 · 배선 등)', u:'kg', v:0, d:2, g:T4G.add},
    {k:'v_inv', n:'인버터 최대 직류 전압 (구동계 부품 정격은 축전지 최대 전압 이상)', u:'V', v:420, d:0, g:T4G.add}, {k:'vi_on', n:'인버터 최대 전압 확인 (1 = 확인, 0 = 확인 안 함)', u:'', v:1, d:0, g:T4G.add, ui:'none'},
    {k:'x_r', n:'팩 전체 추가 저항 (버스바 · 퓨즈 · 커넥터)', u:'mΩ', v:0, d:2, g:T4G.add}, {k:'i_lim', n:'팩 사용 전류 제한', u:'A', v:245, d:0, g:T4G.add}, {k:'il_on', n:'팩 사용 전류 (1 = 제한 적용, 0 = 셀 사양 최대)', u:'', v:0, d:0, g:T4G.add, ui:'none'},
    {k:'auto', n:'구성 방식 (0 수동 · 1 병렬 자동 · 2 직렬 자동)', u:'', v:0, d:0, g:T4G.cfg, ui:'none'},
    {k:'o_mode', n:'출력 표 전류 (0 제한 적용 · 1 셀 최대 · 2 직접)', u:'', v:0, d:0, g:T4G.add, ui:'none'}, {k:'o_T', n:'셀 표 온도', u:'°C', v:25, d:1, g:T4G.add, ui:'none'}, {k:'o_i', n:'출력 표 전류 (직접)', u:'A', v:0, d:0, g:T4G.add, ui:'none'},
  ],
  inLock(k){ if(k==='n_p' && WB.I.auto===1) return '자동 (규정 안 최대)'; if(k==='s_seg' && WB.I.auto===2) return '자동 (규정 · 인버터 안 최대)'; if(k==='i_lim' && WB.I.il_on !== 1) return '셀 사양 최대'; if(k==='v_inv' && WB.I.vi_on === 0) return '확인 안 함'; return ''; },
  inOpt(k){ if(k==='i_lim') return `<span class="t2-inopt">${t4Seg('data-t4il', WB.I.il_on===1 ? 1 : 0, [[1, '제한 적용'], [0, '셀 사양 최대']])}</span>`; if(k==='v_inv') return `<span class="t2-inopt">${t4Seg('data-t4vi', WB.I.vi_on===0 ? 0 : 1, [[1, '확인'], [0, '확인 안 함']])}</span>`; return ''; },
  inEff(k){ const o = WB.R && !WB.err && WB.R.out; if(k==='n_p') return o ? o.n_p_o : '…'; if(k==='s_seg') return o ? o.s_seg_o : '…'; if(k==='i_lim') return o ? o.i_cellmax : '…'; return null; },   // 자동 구성으로 정해진 수
  outGroups:{'셀 값 (대시보드 반영 확인용)':{note:'입력한 셀 값 그대로. [대시보드에 반영]으로 도구 2P 등이 받아 씀'}},
  outputs:[
    {k:'n_s', dk:'n_s', n:'전체 직렬 수 (S)', d:0, g:'팩'}, {k:'n_p_o', dk:'n_p', n:'병렬 수 (P)', d:0, g:'팩'}, {k:'cells', n:'셀 개수', u:'개', d:0, g:'팩'},
    {k:'v_pack_max', n:'팩 최대 전압', u:'V', d:1, g:'팩'}, {k:'v_pack', dk:'v_pack', d:1, g:'팩'}, {k:'v_pack_min', n:'팩 최소 전압', u:'V', d:1, g:'팩'},
    {k:'cap_ah', n:'팩 용량', u:'Ah', d:2, g:'팩'}, {k:'e_pack', dk:'e_pack', n:'팩 공칭 에너지', d:3, g:'팩'}, {k:'ej_pack', n:'팩 규정 산정 에너지', u:'MJ', d:3, g:'팩'},
    {k:'m_pack', dk:'m_pack', n:'팩 무게 (추가 무게 포함)', d:2, g:'팩'},
    {k:'n_seg_o', n:'세그먼트 수', u:'개', d:0, g:'세그먼트'}, {k:'s_seg_o', n:'세그먼트 직렬 수', u:'개', d:0, g:'세그먼트'}, {k:'cells_seg', n:'세그먼트 셀 개수', u:'개', d:0, g:'세그먼트'},
    {k:'v_seg_max', n:'세그먼트 최대 전압', u:'V', d:2, g:'세그먼트'}, {k:'ej_seg', n:'세그먼트 규정 에너지', u:'MJ', d:3, g:'세그먼트'},
    {k:'m_cells_seg', n:'세그먼트 셀 질량', u:'kg', d:3, g:'세그먼트'}, {k:'m_seg', n:'세그먼트 질량 (추가 무게 포함)', u:'kg', d:3, g:'세그먼트'},
    {k:'r_cell', n:'셀 구성으로 본 팩 저항', u:'mΩ', d:2, g:'전기'}, {k:'r_pack', dk:'r_pack', n:'팩 내부저항 (추가 저항 포함)', d:2, g:'전기'},
    {k:'i_cellmax', n:'셀 사양 팩 최대 전류', u:'A', d:1, g:'전기'}, {k:'i_bms_max', dk:'i_bms_max', n:'적용 전류 (방전 전류 한계)', d:1, g:'전기'}, {k:'i_cell', n:'셀당 적용 전류', u:'A', d:2, g:'전기'}, {k:'i_chg', dk:'i_chg', n:'충전 전류 한계 (회생, 셀 충전 × 병렬)', d:1, g:'전기'},
    {k:'i_short', n:'만충 이론 단락 전류', u:'A', d:0, g:'전기'},
    {k:'rule_vp', n:'규정 팩 600 V (1 = 충족)', u:'', d:0, g:'팩', hide:true}, {k:'rule_inv', n:'규정 부품 정격 · 팩 최대 전압 ≤ 인버터 최대 전압 (1 = 충족)', u:'', d:0, g:'팩', hide:true}, {k:'v_inv_o', n:'인버터 최대 직류 전압', u:'V', d:0, g:'팩', hide:true},
    {k:'rule_v', n:'규정 세그먼트 120 V (1 = 충족)', u:'', d:0, g:'세그먼트', hide:true}, {k:'rule_e', n:'규정 세그먼트 6 MJ (1 = 충족)', u:'', d:0, g:'세그먼트', hide:true}, {k:'rule_m', n:'규정 세그먼트 12 kg (1 = 충족)', u:'', d:0, g:'세그먼트', hide:true},
    {k:'o_i', n:'출력 표 전류', u:'A', d:1, g:'전기', hide:true}, {k:'t_load_max', n:'부하 전압 (셀 최대 전압)', u:'V', d:2, g:'전기', hide:true}, {k:'t_p_max', n:'단자 출력 (셀 최대 전압)', u:'kW', d:3, g:'전기', hide:true},
    {k:'t_loss', n:'팩 저항 손실', u:'kW', d:3, g:'전기', hide:true}, {k:'t_p_nom', n:'단자 출력 (셀 공칭 전압)', u:'kW', d:3, g:'전기', hide:true},
    {k:'t_ok10', n:'최소 셀 전압 판정 (전압 범위 10 %, 1 = 충족)', u:'', d:0, g:'전기', hide:true}, {k:'t_cell10', n:'부하 시 셀 전압 (전압 범위 10 %)', u:'V', d:3, g:'전기', hide:true},
    {k:'c_vmax_o', dk:'c_vmax', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_vnom_o', dk:'c_vnom', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_vmin_o', dk:'c_vmin', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true},
    {k:'c_ah_o', dk:'c_ah', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_imax_o', dk:'c_imax', d:1, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_ich_o', dk:'c_ich', d:1, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_r_o', dk:'c_r', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true},
    {k:'s_bd', n:'최소 셀 전압 충족 경계 SOC (이 SOC 이상 충족, 0 = 전 구간, 빈칸 = 전 구간 미달)', u:'%', d:2, g:'셀 표 (온도)', hide:true}, {k:'cap_T', n:'셀 표 온도의 셀 용량', u:'Ah', d:2, g:'셀 표 (온도)'}, {k:'e_T', n:'셀 표 온도의 팩 에너지', u:'kWh', d:3, g:'셀 표 (온도)'}, {k:'ocv_mean', n:'셀 OCV 평균 (SOC 0 ~ 100 %)', u:'V', d:3, g:'셀 표 (온도)'},
    {k:'s_ocv100', n:'셀 OCV (SOC 100 %)', u:'V', d:3, g:'셀 표 (온도)', hide:true}, {k:'s_r50', n:'셀 내부저항 (SOC 50 %)', u:'mΩ', d:2, g:'셀 표 (온도)', hide:true}, {k:'s_rp50', n:'팩 내부저항 (SOC 50 %)', u:'mΩ', d:2, g:'셀 표 (온도)', hide:true},
    {k:'s_p50', n:'단자 출력 (SOC 50 %)', u:'kW', d:3, g:'셀 표 (온도)', hide:true}, {k:'s_load0', n:'팩 부하 전압 (SOC 0 %)', u:'V', d:2, g:'셀 표 (온도)', hide:true}, {k:'cell_tab', n:'쓴 셀 표 (1 OCV + 2 저항 + 4 용량)', u:'', d:0, g:'셀 표 (온도)', hide:true},
    {k:'c_g_o', dk:'c_g', d:1, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'n_seg_d', dk:'n_seg', d:0, g:'셀 값 (대시보드 반영 확인용)', hide:true},
  ],
  extHTML: t4ExtHTML, midHTML: () => t4MidHTML() + t4CellHTML(), editTail: t4CellEdHTML,
  onResult(){ const r = document.getElementById('t4rules'); if(r) r.innerHTML = t4Rules(); const y = document.getElementById('t4why'); if(y) y.textContent = t4Why();
    const m = document.getElementById('wbmid'); if(m) m.innerHTML = t4MidHTML() + t4CellHTML(); },
  extraI: t4CellI,
  /* [표]를 골랐는데 빈 표 → 필수 (2026-11-12) */
  needExt(){ if(wbEx()) return []; return [['o', '셀 OCV 표'], ['r', '셀 내부저항 표'], ['c', '셀 용량 표']].filter(([k]) => t4Use(k)==='tab' && !t4PM(k, T4C[k])).map(([k, n]) => ({k:'t4:' + k, n, g:'셀 표'})); },
  extGet: () => ({cell:{...T4C, u:{...(T4C.u || {})}}, presets:JSON.parse(JSON.stringify(T4.presets))}),   /* .json 내보내기에 셀 표 · 저장한 셀도 */
  extSet(d){ if(!d || typeof d!=='object') return; if(d.cell){ ['o', 'r', 'c'].forEach(k => { if(typeof d.cell[k]==='string') T4C[k] = d.cell[k]; }); T4C.u = d.cell.u && typeof d.cell.u==='object' ? {...d.cell.u} : {}; } if(Array.isArray(d.presets)) T4.presets = d.presets.filter(p => p && typeof p.name==='string' && p.cell); t4CSave(); t4PSave(); wbPaint(['ext']); },
  exReset(){ try{ localStorage.removeItem(wbMK(T4CK)); localStorage.removeItem(wbMK(T4PK)); }catch(e){} Object.assign(T4C, {o:'', r:'', c:'', u:{}}); T4.presets = []; },
  tour: M4TOUR,
  verifyBase:{cellO:null, cellR:null, cellC:null, o_T:25, auto:0, o_mode:0, o_i:0, x_mseg:0, x_mpack:0, x_r:0, il_on:0, vi_on:0, c_ah:4.5, c_imax:45, c_r:15, c_g:70, n_seg:6, s_seg:12, n_p:6},   // 검증 손계산은 예전 기본 (P45B 6 × 12S6P) 그대로
  verify: /*@@VERIFY@@*/,
  code: /*@@CODE@@*/
};
