/* ============================================================
   도구 4 축전지 팩 계산기 — docs/TOOLS-PLAN.md 5절 (설계 단계 P1 셀 선정 · P4-5 축전지)
   - 팀원 Yechan Hyun 의 FSK Battery Calculator 1.0.1 을 작업창 도구로 옮김 (계산식 그대로, 허락 받음)
   - 셀 사양 · 세그먼트 구성 → 팩 전압 · 용량 · 질량 · 내부저항 · 전류, 규정(세그먼트 120 V · 6 MJ · 12 kg) 확인, 전압 단계별 부하 전압 · 출력 · 손실
   - 결과(직렬 · 병렬 수, 셀 값, 팩 저항 · 전류 한계 등)를 대시보드로 → 도구 2 는 받기만 함
   - 셀 프리셋: 이 브라우저에 이름 붙여 저장 (run2x.t4.presets)
   ============================================================ */
const T4PK = 'run2x.t4.presets';
const T4CELL = ['c_vmax', 'c_vnom', 'c_vmin', 'c_ah', 'c_imax', 'c_r', 'c_g'];
const T4 = { presets:[], name:'' };
try{ const a = JSON.parse(localStorage.getItem(T4PK) || '[]'); if(Array.isArray(a)) T4.presets = a.filter(p => p && typeof p.name==='string' && p.cell); }catch(e){}
const t4PSave = () => { try{ localStorage.setItem(T4PK, JSON.stringify(T4.presets)); return true; }catch(e){ return false; } };
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
    <p class="muted t4-note">계산식은 팀원 Yechan Hyun 의 FSK Battery Calculator 1.0.1 과 같습니다. [대시보드에 반영]은 직렬 · 병렬 수, 팩 공칭 전압 · 에너지 · 내부저항 · 무게, 적용 전류(방전 전류 한계), 셀 값을 보내고, 도구 2 는 이 값을 받아 씁니다.</p></div>`; }
function t4Why(){ const R = WB.R; if(!R) return ''; const au = WB.I.auto;
  return au===1 ? `세그먼트 ${R.out.s_seg_o}S 기준 → 병렬 최대 ${R.out.n_p_o}P · ${R.why} 제한` : au===2 ? `병렬 ${R.out.n_p_o}P 기준 → 세그먼트 직렬 최대 ${R.out.s_seg_o}S · ${R.why} 제한` : '직렬과 병렬을 직접 넣습니다.'; }
function t4Rules(){ const o = WB.R && WB.R.out; if(!o) return '';
  return [['세그먼트 최대 전압', o.v_seg_max, 120, 'V'], ['세그먼트 규정 에너지', o.ej_seg, 6, 'MJ'], ['세그먼트 질량', o.m_seg, 12, 'kg']].map(([nm, v, mx, u]) => { const ok = v <= mx + 1e-9;
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
  ['#wb .wb-in', '입력', '셀 사양(데이터시트), 팩 구성(세그먼트 수 · 세그먼트 직렬 수 · 병렬 수), 추가 무게 · 저항, 팩 사용 전류 제한(0 = 없음)입니다. [대시보드 값으로 채우기]로 팀 셀 값을 불러옵니다.'],
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
    {k:'c_ah', dk:'c_ah', v:4.5, d:2, g:T4G.cell}, {k:'c_imax', dk:'c_imax', v:45, d:1, g:T4G.cell}, {k:'c_r', dk:'c_r', v:15, d:2, g:T4G.cell}, {k:'c_g', dk:'c_g', v:70, d:1, g:T4G.cell},
    {k:'n_seg', dk:'n_seg', v:6, d:0, g:T4G.cfg}, {k:'s_seg', n:'세그먼트 직렬 수 (S)', u:'개', v:12, d:0, g:T4G.cfg}, {k:'n_p', dk:'n_p', n:'병렬 수 (P)', v:6, d:0, g:T4G.cfg},
    {k:'x_mseg', n:'세그먼트당 추가 무게 (버스바 · 케이스 등)', u:'kg', v:0, d:2, g:T4G.add}, {k:'x_mpack', n:'팩 전체 추가 무게 (박스 · 배선 등)', u:'kg', v:0, d:2, g:T4G.add},
    {k:'x_r', n:'팩 전체 추가 저항 (버스바 · 퓨즈 · 커넥터)', u:'mΩ', v:0, d:2, g:T4G.add}, {k:'i_lim', n:'팩 사용 전류 제한 (0 = 셀 사양 최대)', u:'A', v:0, d:0, g:T4G.add},
    {k:'auto', n:'구성 방식 (0 수동 · 1 병렬 자동 · 2 직렬 자동)', u:'', v:0, d:0, g:T4G.cfg, ui:'none'},
    {k:'o_mode', n:'출력 표 전류 (0 제한 적용 · 1 셀 최대 · 2 직접)', u:'', v:0, d:0, g:T4G.add, ui:'none'}, {k:'o_i', n:'출력 표 전류 (직접)', u:'A', v:0, d:0, g:T4G.add, ui:'none'},
  ],
  inLock(k){ if(k==='n_p' && WB.I.auto===1) return '자동 (규정 안 최대)'; if(k==='s_seg' && WB.I.auto===2) return '자동 (규정 안 최대)'; return ''; },
  inEff(k){ const o = WB.R && !WB.err && WB.R.out; if(k==='n_p') return o ? o.n_p_o : '…'; if(k==='s_seg') return o ? o.s_seg_o : '…'; return null; },   // 자동 구성으로 정해진 수
  outGroups:{'셀 값 (대시보드 반영 확인용)':{note:'입력한 셀 값 그대로. [대시보드에 반영]으로 도구 2 등이 받아 씀'}},
  outputs:[
    {k:'n_s', dk:'n_s', n:'전체 직렬 수 (S)', d:0, g:'팩'}, {k:'n_p_o', dk:'n_p', n:'병렬 수 (P)', d:0, g:'팩'}, {k:'cells', n:'셀 개수', u:'개', d:0, g:'팩'},
    {k:'v_pack_max', n:'팩 최대 전압', u:'V', d:1, g:'팩'}, {k:'v_pack', dk:'v_pack', d:1, g:'팩'}, {k:'v_pack_min', n:'팩 최소 전압', u:'V', d:1, g:'팩'},
    {k:'cap_ah', n:'팩 용량', u:'Ah', d:2, g:'팩'}, {k:'e_pack', dk:'e_pack', n:'팩 공칭 에너지', d:3, g:'팩'}, {k:'ej_pack', n:'팩 규정 산정 에너지', u:'MJ', d:3, g:'팩'},
    {k:'m_pack', dk:'m_pack', n:'팩 무게 (추가 무게 포함)', d:2, g:'팩'},
    {k:'n_seg_o', n:'세그먼트 수', u:'개', d:0, g:'세그먼트'}, {k:'s_seg_o', n:'세그먼트 직렬 수', u:'개', d:0, g:'세그먼트'}, {k:'cells_seg', n:'세그먼트 셀 개수', u:'개', d:0, g:'세그먼트'},
    {k:'v_seg_max', n:'세그먼트 최대 전압', u:'V', d:2, g:'세그먼트'}, {k:'ej_seg', n:'세그먼트 규정 에너지', u:'MJ', d:3, g:'세그먼트'},
    {k:'m_cells_seg', n:'세그먼트 셀 질량', u:'kg', d:3, g:'세그먼트'}, {k:'m_seg', n:'세그먼트 질량 (추가 무게 포함)', u:'kg', d:3, g:'세그먼트'},
    {k:'r_cell', n:'셀 구성으로 본 팩 저항', u:'mΩ', d:2, g:'전기'}, {k:'r_pack', dk:'r_pack', n:'팩 내부저항 (추가 저항 포함)', d:2, g:'전기'},
    {k:'i_cellmax', n:'셀 사양 팩 최대 전류', u:'A', d:1, g:'전기'}, {k:'i_bms_max', dk:'i_bms_max', n:'적용 전류 (방전 전류 한계)', d:1, g:'전기'}, {k:'i_cell', n:'셀당 적용 전류', u:'A', d:2, g:'전기'},
    {k:'i_short', n:'만충 이론 단락 전류', u:'A', d:0, g:'전기'},
    {k:'rule_v', n:'규정 세그먼트 120 V (1 = 충족)', u:'', d:0, g:'세그먼트', hide:true}, {k:'rule_e', n:'규정 세그먼트 6 MJ (1 = 충족)', u:'', d:0, g:'세그먼트', hide:true}, {k:'rule_m', n:'규정 세그먼트 12 kg (1 = 충족)', u:'', d:0, g:'세그먼트', hide:true},
    {k:'o_i', n:'출력 표 전류', u:'A', d:1, g:'전기', hide:true}, {k:'t_load_max', n:'부하 전압 (셀 최대 전압)', u:'V', d:2, g:'전기', hide:true}, {k:'t_p_max', n:'단자 출력 (셀 최대 전압)', u:'kW', d:3, g:'전기', hide:true},
    {k:'t_loss', n:'팩 저항 손실', u:'kW', d:3, g:'전기', hide:true}, {k:'t_p_nom', n:'단자 출력 (셀 공칭 전압)', u:'kW', d:3, g:'전기', hide:true},
    {k:'t_ok10', n:'최소 셀 전압 판정 (전압 범위 10 %, 1 = 충족)', u:'', d:0, g:'전기', hide:true}, {k:'t_cell10', n:'부하 시 셀 전압 (전압 범위 10 %)', u:'V', d:3, g:'전기', hide:true},
    {k:'c_vmax_o', dk:'c_vmax', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_vnom_o', dk:'c_vnom', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_vmin_o', dk:'c_vmin', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true},
    {k:'c_ah_o', dk:'c_ah', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_imax_o', dk:'c_imax', d:1, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'c_r_o', dk:'c_r', d:2, g:'셀 값 (대시보드 반영 확인용)', hide:true},
    {k:'c_g_o', dk:'c_g', d:1, g:'셀 값 (대시보드 반영 확인용)', hide:true}, {k:'n_seg_d', dk:'n_seg', d:0, g:'셀 값 (대시보드 반영 확인용)', hide:true},
  ],
  extHTML: t4ExtHTML, midHTML: t4MidHTML,
  onResult(){ const r = document.getElementById('t4rules'); if(r) r.innerHTML = t4Rules(); const y = document.getElementById('t4why'); if(y) y.textContent = t4Why();
    const m = document.getElementById('wbmid'); if(m) m.innerHTML = t4MidHTML(); },
  tour: M4TOUR,
  verifyBase:{auto:0, o_mode:0, o_i:0, x_mseg:0, x_mpack:0, x_r:0, i_lim:0},
  verify: [
    {n:'기본 구성 · 6 세그먼트 × 12S6P (셀 4.2 / 3.6 / 2.5 V, 4.5 Ah, 45 A, 15 mΩ, 70 g)', I:{}, expect:{n_s:72, r_pack:180, i_bms_max:270, e_pack:6.9984, ej_seg:4.89888, m_seg:5.04, m_pack:30.24, v_pack_max:302.4, i_short:1680},
     src:'S = 6 × 12 = 72, R = (72 ÷ 6) × 15 = 180 mΩ, I = 45 × 6 = 270 A, 에너지 = 72 × 3.6 × 4.5 × 6 ÷ 1000 = 6.9984 kWh, 세그먼트 = 72 셀 × 4.2 × 4.5 × 0.0036 = 4.89888 MJ, 72 × 70 g = 5.04 kg (× 6 = 30.24 kg), 302.4 V ÷ 0.18 Ω = 1680 A'},
    {n:'전압 단계별 출력 · 셀 최대 · 공칭 전압, 270 A', I:{}, expect:{t_load_max:253.8, t_p_max:68.526, t_loss:13.122, t_p_nom:56.862, t_cell10:1.995, t_ok10:0},
     src:'최대: 302.4 − 270 × 0.18 = 253.8 V → 270 × 253.8 = 68.526 kW, 손실 270² × 0.18 = 13.122 kW. 공칭: 259.2 − 48.6 = 210.6 V → 56.862 kW. 10 %: 셀 2.5 + 1.7 × 0.1 = 2.67 − 45 × 0.015 = 1.995 V < 2.5 → 미달'},
    {n:'병렬 자동 · 세그먼트 12S 에서 규정 안 최대 병렬', I:{auto:1, s_seg:12}, expect:{n_p_o:7, cells_seg:84},
     src:'6 MJ: ⌊6 ÷ (12 × 4.2 × 4.5 × 0.0036)⌋ = ⌊7.349⌋ = 7, 12 kg: ⌊12 ÷ (12 × 0.07)⌋ = 14 → 7P (6 MJ 제한)'},
    {n:'직렬 자동 · 6P 에서 규정 안 최대 세그먼트 직렬', I:{auto:2, n_p:6}, expect:{s_seg_o:14, n_s:84},
     src:'120 V: ⌊120 ÷ 4.2⌋ = 28, 6 MJ: ⌊6 ÷ (6 × 4.2 × 4.5 × 0.0036)⌋ = ⌊14.70⌋ = 14, 12 kg: ⌊12 ÷ (6 × 0.07)⌋ = 28 → 14S, 전체 6 × 14 = 84S'},
    {n:'추가 저항 20 mΩ · 추가 무게 (세그먼트 1.5 kg, 팩 4 kg) · 전류 제한 200 A', I:{x_r:20, x_mseg:1.5, x_mpack:4, i_lim:200}, expect:{r_pack:200, i_bms_max:200, t_load_max:262.4, t_p_max:52.48, m_seg:6.54, m_pack:43.24, i_short:1512},
     src:'R = 180 + 20 = 200 mΩ, I = min(270, 200) = 200 A → 302.4 − 40 = 262.4 V, 52.48 kW. 세그먼트 5.04 + 1.5 = 6.54 kg, 팩 6.54 × 6 + 4 = 43.24 kg, 302.4 ÷ 0.2 = 1512 A'},
    {n:'출력 표 전류 직접 100 A', I:{o_mode:2, o_i:100}, expect:{o_i:100, t_load_max:284.4, t_loss:1.8},
     src:'302.4 − 100 × 0.18 = 284.4 V, 손실 100² × 0.18 ÷ 1000 = 1.8 kW'}
  ],
  code: `// ================================================================
// 도구 4 축전지 팩 계산기 — 계산 코드
//   팀원 Yechan Hyun 의 FSK Battery Calculator 1.0.1 (calculator.js) 계산을 그대로 옮김 (허락 받음)
// ================================================================
// 입력 I : 셀 c_vmax · c_vnom · c_vmin [V], c_ah [Ah], c_imax [A], c_r [mΩ], c_g [g]
//          구성 n_seg 세그먼트 수, s_seg 세그먼트 직렬 수, n_p 병렬 수, auto = 0 수동 · 1 병렬 자동 (직렬 입력) · 2 직렬 자동 (병렬 입력)
//          추가 x_mseg 세그먼트당 무게 [kg], x_mpack 팩 전체 무게 [kg], x_r 팩 전체 저항 [mΩ], i_lim 팩 사용 전류 제한 [A] (0 = 없음)
//          출력 표 전류 o_mode = 0 제한 적용 · 1 셀 사양 최대 · 2 직접 (o_i [A])
// 규정 (FSAE / FSK EV): 세그먼트 최대 전압 ≤ 120 V, 세그먼트 에너지 ≤ 6 MJ (셀 최대 전압 × 정격 용량으로 셈), 세그먼트 질량 ≤ 12 kg
// 식:
//   전체 직렬 S = n_seg × s_seg,  세그먼트 셀 수 = s_seg × n_p
//   셀로 본 팩 저항 R_cell = (S ÷ n_p) × r_셀,  팩 저항 R = R_cell + 추가 저항
//   셀 사양 최대 전류 = 셀 최대 전류 × n_p,  적용 전류 I = min(최대, 제한)
//   세그먼트 에너지 [MJ] = 셀 수 × V_max × Ah × 0.0036,  공칭 에너지 [kWh] = S × V_nom × Ah × n_p ÷ 1000
//   출력 표 (셀 무부하 전압 v = V_max, V_nom, V_min + (V_max − V_min) × 0.9 · 0.7 · 0.5 · 0.3 · 0.1 — 충전율(SOC)이 아니라 전압 범위 비율):
//     팩 무부하 전압 = v × S,  부하 전압 = v × S − I R,  부하 시 셀 전압 = v − (I ÷ n_p) r_셀,  단자 출력 = I × 부하 전압,  저항 손실 = I² R
//     최소 셀 전압 판정: 부하 시 셀 전압 ≥ V_min 이고 부하 전압 > 0
//   이론 단락 전류 = S × V_max ÷ R

function calc(I) {
  const fl = v => Math.floor(v + 1e-10);
  const c = { vmax: I.c_vmax, vmin: I.c_vmin, vnom: I.c_vnom, ah: I.c_ah, amps: I.c_imax, r: I.c_r, g: I.c_g };
  for (const k of ['vmax', 'vmin', 'vnom', 'ah', 'amps', 'r', 'g']) if (!Number.isFinite(c[k]) || c[k] <= 0) throw new Error('셀 정보는 모두 0보다 큰 숫자로 입력하세요.');
  if (!(c.vmin < c.vnom && c.vnom <= c.vmax)) throw new Error('셀 전압은 최소 < 공칭 ≤ 최대 순서로 입력하세요.');
  const xm = Math.max(0, I.x_mseg || 0), xmp = Math.max(0, I.x_mpack || 0), xr = Math.max(0, I.x_r || 0), lim = I.i_lim > 0 ? I.i_lim : null;
  let n = Math.round(I.n_seg), s = Math.round(I.s_seg), p = Math.round(I.n_p), why = '';
  if (!(n >= 1)) throw new Error('세그먼트 개수는 1 이상의 정수로 입력하세요.');
  // 자동 구성: 한쪽(직렬 또는 병렬)을 넣으면 규정 안에서 다른 쪽 최대
  if (I.auto === 1) {
    if (!(s >= 1)) throw new Error('세그먼트 직렬 수는 1 이상의 정수로 입력하세요.');
    if (s * c.vmax > 120 + 1e-9) throw new Error('입력 직렬 수만으로 세그먼트 120 V를 초과합니다. 직렬 수를 줄이세요.');
    const b = [['6 MJ 에너지', fl(6 / (s * c.vmax * c.ah * 0.0036))], ['12 kg 질량', fl((12 - xm) / (s * c.g / 1000))]];
    p = Math.min(...b.map(z => z[1])); why = b.filter(z => z[1] === p).map(z => z[0]).join(' · ');
    if (p < 1) throw new Error('이 조건에서는 1개 이상의 셀 구성이 불가능합니다. 구성 또는 추가 무게를 줄이세요.');
  } else if (I.auto === 2) {
    if (!(p >= 1)) throw new Error('병렬 수는 1 이상의 정수로 입력하세요.');
    const b = [['120 V 전압', fl(120 / c.vmax)], ['6 MJ 에너지', fl(6 / (p * c.vmax * c.ah * 0.0036))], ['12 kg 질량', fl((12 - xm) / (p * c.g / 1000))]];
    s = Math.min(...b.map(z => z[1])); why = b.filter(z => z[1] === s).map(z => z[0]).join(' · ');
    if (s < 1) throw new Error('이 조건에서는 1개 이상의 셀 구성이 불가능합니다. 구성 또는 추가 무게를 줄이세요.');
  } else if (!(s >= 1) || !(p >= 1)) throw new Error('세그먼트 직렬, 병렬은 1 이상의 정수로 입력하세요.');

  const S = n * s, cells = s * p, Rcell = S / p * c.r / 1000, R = Rcell + xr / 1000, maxI = c.amps * p, Iap = lim === null ? maxI : Math.min(maxI, lim);
  const mseg = cells * c.g / 1000 + xm, ej = cells * c.vmax * c.ah * 0.0036;
  // 출력 표 전류: 제한 적용 (기본) · 셀 사양 최대 · 직접 (0 ~ 적용 상한)
  const Io = I.o_mode === 1 ? maxI : I.o_mode === 2 ? Math.max(0, Math.min(Iap, I.o_i || 0)) : Iap;
  const lv = [['최대', c.vmax], ['공칭', c.vnom], ...[0.9, 0.7, 0.5, 0.3, 0.1].map(t => [\`\${Math.round(t * 100)} %\`, c.vmin + (c.vmax - c.vmin) * t])];
  const tab = lv.map(([nm, v]) => { const loadCell = v - Io / p * c.r / 1000, load = v * S - Io * R;
    return { nm, v, oc: v * S, drop: Io * R, load, loadCell, power: load > 0 ? Io * load / 1000 : NaN, loss: Io * Io * R / 1000, lossCell: Io * Io * Rcell / 1000, lossX: Io * Io * xr / 1e6,
             ok: loadCell >= c.vmin - 1e-10 && load > 0 }; });
  const out = {
    n_s: S, n_p_o: p, s_seg_o: s, n_seg_o: n, cells: cells * n, cells_seg: cells,
    v_seg_max: s * c.vmax, v_pack_max: S * c.vmax, v_pack: S * c.vnom, v_pack_min: S * c.vmin,                 // [V]
    cap_ah: c.ah * p, e_pack: S * c.vnom * c.ah * p / 1000, ej_seg: ej, ej_pack: ej * n,                     // [Ah] · [kWh] · [MJ]
    m_cells_seg: cells * c.g / 1000, m_seg: mseg, m_pack: mseg * n + xmp,                                     // [kg]
    r_cell: Rcell * 1000, r_pack: R * 1000, i_cellmax: maxI, i_bms_max: Iap, i_cell: Iap / p, i_short: S * c.vmax / R,   // [mΩ] · [A]
    rule_v: s * c.vmax <= 120 + 1e-9 ? 1 : 0, rule_e: ej <= 6 + 1e-9 ? 1 : 0, rule_m: mseg <= 12 + 1e-9 ? 1 : 0,   // 규정 충족 (1 = 충족)
    o_i: Io, t_load_max: tab[0].load, t_p_max: tab[0].power, t_loss: tab[0].loss, t_p_nom: tab[1].power, t_ok10: tab[6].ok ? 1 : 0, t_cell10: tab[6].loadCell,
    c_vmax_o: c.vmax, c_vnom_o: c.vnom, c_vmin_o: c.vmin, c_ah_o: c.ah, c_imax_o: c.amps, c_r_o: c.r, c_g_o: c.g, n_seg_d: n,   // 셀 값 · 세그먼트 수 (대시보드 반영 확인용, 입력 그대로)
  };
  return { out, tab, why };
}
`
};
