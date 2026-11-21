
/* ============================================================ 작업창 위 탭: [시뮬레이션] · [편집]
   시뮬레이션: 위 줄(기준 감속비 · 볼 랩 · 코스) → 결과 → 구동력 선도 · 코스 지도 (프로브) → 신호 선택 그래프
   편집      : 항목(코스 · 차량 제원 · 타이어 · 에어로 · 모터 · 인버터 · 구동계 · 축전지) → 상수 칸(왼쪽 입력 칸과 같은 부품) + 표 · 그림
               표에 값이 있으면 그 상수 칸을 막고 표를 씀. 비우면 다시 상수. 왼쪽 입력 칸은 비워 둠 (자주 바꾸는 값은 나중에) */
const T2CN = {free:'내 코스', ax:'오토크로스', end:'내구레이스', acc:'가속', skid:'스키드패드'};
const t2Sum = a => a.reduce((x, y) => x + y, 0);
const t2Closed = () => T2.free.laps > 1 || T2.free.s0 > 0;      // 랩 수 2 이상이거나 출발 위치가 0이 아니면 닫힌 코스
const t2Seg = (attr, cur, items) => `<span class="dc-seg" role="group">${items.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${cur===k}">${t}</button>`).join('')}</span>`;

function t2ExtHTML(){ const sim = T2.tab==='sim', sens = T2.tab==='sens', w = $('#wb'); if(w) w.classList.toggle('t2-edit', !sim);
  const R = WB.id==='2' ? WB.R : null, go = R && R.modes ? R.modes.opt.out.gr_use : NaN;
  const bar = sim
    ? `<span class="t2-mdl" title="계산에 쓴 모델 · 기능 (편집 탭 [모델 단계]에서 바꿈)">모델 · 차량 ${Math.max(0, Math.min(3, Math.round(WB.I.md || 0)))} · 운전자 ${WB.I.dr_real === 1 ? '현실' : '이상'}${WB.I.e_lim ? ` · 에너지 상한 ${WB.I.drv === 1 ? '타력' : '출력 낮춤'}` : ''} · 열 ${t2ThName()}${WB.I.rg_on === 1 ? ' · 회생' : ''}</span><span class="t2-gm"><span class="muted">기준 감속비</span>${t2Seg('data-t2gm', T2.grMode, [['my', `내 감속비 ${wbFmt(WB.I.gr, 2)}`], ['opt', `최적 감속비 ${isFinite(go) ? wbFmt(go, 2) : '…'}`]])}</span>
       <span class="t2-vw"><label class="t2-lapl">볼 랩 <span id="t2lapw">${t2LapSel()}</span></label><span class="muted">코스</span>${t2Seg('data-t2course', T2.course, T2COURSES.map(k => [k, T2CN[k]]))}</span>`
    : sens ? `<span class="t2-mdl">모델 · 차량 ${Math.max(0, Math.min(3, Math.round(WB.I.md || 0)))} · 운전자 ${WB.I.dr_real === 1 ? '현실' : '이상'}${WB.I.e_lim ? ` · 에너지 상한 ${WB.I.drv === 1 ? '타력' : '출력 낮춤'}` : ''} · 열 ${t2ThName()} · 내 감속비 ${wbFmt(WB.I.gr, 2)} (줄여 셈)</span>`
    : `<span class="t2-vw"><span class="muted">편집할 항목</span>${t2Seg('data-t2eg', t2Grp(T2.etab), T2EI)}</span>
`;
  return `<section class="wb-sec t2-ext" aria-label="시뮬레이션 · 편집"><div class="wb-h t2-h"><div class="m1-tabs" role="tablist">${[['sim', '시뮬레이션'], ['edit', '편집'], ['sens', '감도']].map(([k, t]) => `<button type="button" role="tab" data-t2tab="${k}" aria-selected="${T2.tab===k}">${t}</button>`).join('')}</div></div>
    <div class="t2-hr${sim ? '' : ' left'}">${bar}</div>
    ${sim ? '' : sens ? t2SensHTML() : t2EditBody()}</section>`; }
/* ---------- 감도 탭: 입력을 하나씩 조금 바꿔 (나머지는 지금 값) 종목 기록 · 내구 에너지가 얼마나 바뀌는지 (입력 훑기와 같은 줄여 셈, 내 감속비)
   바꾸는 양: 지금 값의 +δ % (온도 [°C] 는 +δ °C). 0 인 값 · 잠긴 칸 · 단추로 고르는 값 · 회로 순서는 건너뜀.
   영향 = 기록 변화율 (%) ÷ 입력 변화율 (%) (탄력도). 종합 = 네 종목 탄력도 절댓값 평균 → 큰 순서가 핵심 입력 후보 */
const T2S = {rel:5, rows:null, base:null, run:false, done:0, tot:0, sort:'all', err:'', at:''};
const T2SM = [['acc', '가속', 't_acc_s'], ['skid', '스키드패드', 't_skid_s'], ['ax', '오토크로스', 't_ax_s'], ['end', '내구', 't_end_s'], ['e', '내구 에너지', 'e_use']];
function t2SensKeys(){ return WB_TOOLS['2'].inputs.filter(d => d.ui!=='none' && !/^cw_o/.test(d.k) && Number.isFinite(WB.I[d.k]) && WB.I[d.k]!==0 && !t2InLock(d.k)); }
async function t2SensRun(){ if(T2S.run) return; const ds = t2SensKeys(), base = wbInputs(), rel = Math.max(0.5, Math.min(50, +T2S.rel || 5)) / 100;
  T2S.run = true; T2S.err = ''; T2S.rows = []; T2S.done = 0; T2S.tot = ds.length + 1; wbPaint(['ext']);
  const one = async Is => { const r = await wbRun(Is.map(I => ({...I, _sweep:true})), wbCode()); if(!r.ok) throw new Error(r.cancelled ? '멈춤' : r.err); return r.outs; };
  try{ T2S.base = (await one([base]))[0]; T2S.done = 1; wbPaint(['ext']);
    for(let i = 0; i < ds.length; i += 3){ const ch = ds.slice(i, i + 3), Is = ch.map(d => { const v = WB.I[d.k], dv = d.u==='°C' ? rel * 100 : v * rel; return {...base, [d.k]: d.u==='%' && v + dv > 100 ? v - dv : v + dv}; });   // % 값(효율 등)이 100 을 넘으면 반대로
      if(T2.tab!=='sens' || !T2S.run) throw new Error('멈춤');
      const outs = await one(Is);
      ch.forEach((d, j) => { const v = WB.I[d.k], nv = Is[j][d.k], px = (nv - v) / Math.max(d.u==='°C' ? 1 : 1e-12, Math.abs(v)) * 100, o = outs[j], el = {};
        T2SM.forEach(([k, , ok]) => { const b0 = T2S.base[ok], b1 = o[ok]; el[k] = Number.isFinite(b0) && Number.isFinite(b1) && b0 ? ((b1 - b0) / b0 * 100) / px : NaN; el['d_' + k] = b1 - b0; });
        const four = ['acc', 'skid', 'ax', 'end'].map(k => Math.abs(el[k])).filter(Number.isFinite); el.all = four.length ? four.reduce((a, b) => a + b, 0) / four.length : NaN;
        T2S.rows.push({k:d.k, n:d.n || (typeof DK!=='undefined' && DK[d.dk] ? DK[d.dk].n : d.k), u:d.u || (d.dk && typeof DK!=='undefined' && DK[d.dk] ? DK[d.dk].u : ''), g:d.g, dd:Number.isFinite(d.d) ? d.d : 3, v, nv, ...el}); });
      T2S.done = Math.min(T2S.tot, T2S.done + ch.length); wbPaint(['ext']); }
    T2S.at = new Date().toLocaleString(); }
  catch(err){ T2S.err = String(err.message || err); }
  T2S.run = false; wbPaint(['ext']); }
function t2SensHTML(){ const S = T2S, f = (v, d) => Number.isFinite(v) ? wbFmt(v, d) : '—', rows = (S.rows || []).slice();
  const key = S.sort, sg = x => Number.isFinite(x) ? x : -Infinity; rows.sort((a, b) => sg(Math.abs(b[key])) - sg(Math.abs(a[key])));
  const top = rows.filter(r => Number.isFinite(r.all)).sort((a, b) => b.all - a.all).slice(0, 10);
  const cell = (r, k) => { const x = r[k], c = !Number.isFinite(x) ? '' : Math.abs(x) >= 0.5 ? ' class="t2s-hi"' : Math.abs(x) >= 0.1 ? ' class="t2s-md"' : ''; return `<td${c}>${f(x, 3)}</td>`; };
  return `<div class="t2-sens">
    <div class="t2-cq"><b>입력 감도</b>
      <p class="muted">입력을 하나씩 지금 값의 +${f(+S.rel, 1)} % (온도는 +${f(+S.rel, 1)} °C, 효율처럼 100 % 를 넘게 되면 −${f(+S.rel, 1)} %) 바꾸고 나머지는 그대로 두어, 종목 기록 · 내구 에너지가 몇 % 바뀌는지 셉니다. 표의 숫자 = 기록 변화율 ÷ 입력 변화율 (탄력도: 1 이면 입력 1 % 에 기록 1 %, 음수 = 입력을 키우면 기록이 줄어듦 = 빨라짐). 계산은 입력 훑기와 같은 줄여 셈 · 내 감속비 · 지금 모델 단계이고, 잠긴 칸 · 0 인 값 · 단추로 고르는 값은 건너뜁니다.</p>
      <div class="t2-cqb"><label class="t2-lapl">바꾸는 양 <input type="number" class="t2s-rel" data-t2srel min="0.5" max="50" step="0.5" value="${S.rel}"> %</label>
        <button type="button" class="btn small pri" data-t2sens="run"${S.run ? ' disabled' : ''}>${S.run ? `계산 중 · ${S.done} / ${S.tot}` : `감도 계산 (입력 ${t2SensKeys().length}개)`}</button>
        ${S.run ? '<button type="button" class="btn small" data-t2sens="stop">멈춤</button>' : ''}${S.at && !S.run ? `<span class="muted">${wbEsc(S.at)} 계산 · 입력을 바꾸면 다시 계산하세요</span>` : ''}</div>
      ${S.err && S.err!=='멈춤' ? `<p class="wb-err">${wbEsc(S.err)}</p>` : S.err ? '<p class="muted">멈췄습니다 (그때까지 계산한 줄만 보임).</p>' : ''}</div>
    ${S.base ? `<p class="muted t2s-base">기준 (지금 입력, 줄여 셈): 가속 ${f(S.base.t_acc_s, 3)} s · 스키드패드 ${f(S.base.t_skid_s, 3)} s · 오토크로스 ${f(S.base.t_ax_s, 2)} s · 내구 ${f(S.base.t_end_s, 0)} s · 내구 에너지 ${f(S.base.e_use, 2)} kWh</p>` : ''}
    ${top.length ? `<div class="t2-cq"><b>핵심 입력 후보 (종합 탄력도 큰 순 10 개)</b><ol class="t2s-top">${top.map(r => `<li><b>${r.n}</b> <span class="muted">${wbEsc(r.g || '')} · 종합 ${f(r.all, 3)}</span></li>`).join('')}</ol>
      <p class="muted">자주 바꿔 비교할 입력을 고르는 참고입니다. 탄력도는 지금 값 근처에서만 맞고, 입력끼리 함께 바뀔 때(예: 질량과 무게중심)는 따로 봐야 합니다.</p></div>` : ''}
    ${rows.length ? `<div class="t2s-wrap"><table class="t2s-tab"><thead><tr><th>입력</th><th>지금 값</th><th>바꾼 값</th>${[['all', '종합']].concat(T2SM.map(([k, n]) => [k, n])).map(([k, n]) => `<th><button type="button" class="lnk" data-t2ssort="${k}" aria-pressed="${S.sort===k}">${n}${S.sort===k ? ' ▾' : ''}</button></th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.n}<span class="muted"> ${wbEsc(r.g || '')}</span></td><td>${f(r.v, r.dd)} ${r.u || ''}</td><td>${f(r.nv, r.dd + 1)}</td>${cell(r, 'all')}${T2SM.map(([k]) => cell(r, k)).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
  </div>`; }
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return;
  const s = e.target.closest('[data-t2sens]'); if(s){ if(s.dataset.t2sens==='run') t2SensRun(); else { T2S.run = false; if(typeof wbKill==='function') wbKill(); } return; }
  const o = e.target.closest('[data-t2ssort]'); if(o){ T2S.sort = o.dataset.t2ssort; wbPaint(['ext']); } });
document.addEventListener('change', e => { if(WB.id==='2' && e.target.matches && e.target.matches('[data-t2srel]')){ const v = +e.target.value; if(v > 0) T2S.rel = Math.min(50, v); } });
/* 편집 탭 본문: 항목의 상수 칸 (왼쪽 입력과 같은 칸, 비슷한 값끼리 작은 상자 = sb) + 표 · 그림 */
/* 탭 아래 짧은 안내 (글머리표, 2026-11-11 줄임) */
const T2CNOTE = {mot:['모터 토크는 아래 토크 표로만 셈']};
function t2Consts(grp){ const gs = T2EG[grp] || [], list = WB_TOOLS['2'].inputs.filter(d => gs.includes(d.g) && d.ui!=='none'); if(!list.length) return '';
  const groups = []; list.forEach(d => { let G = groups.find(x => x.g===d.g); if(!G){ G = {g:d.g, sb:[]}; groups.push(G); } let B = G.sb.find(x => x.n===d.sb); if(!B){ B = {n:d.sb, ds:[]}; G.sb.push(B); } B.ds.push(d); });
  groups.sort((a, b) => gs.indexOf(a.g) - gs.indexOf(b.g));   // 묶음 순서 = T2EG 순서 (냉각: 외기 → 냉각수 → 모터 · 인버터 · 축전지)
  return `<div class="t2-cg">${T2LAY(grp) ? t2Lay(grp, groups) : t2Board(groups)}
    ${T2CNOTE[grp] ? `<ul class="t2-cnote muted">${T2CNOTE[grp].map(x => `<li>${x}</li>`).join('')}</ul>` : ''}</div>`; }
/* 편집 배치 (2026-11-11): 같은 꼴 상자는 같은 크기로 한 행에.
   ① 한 묶음 안에서 부품 이름만 다른 상자 (모터 · 인버터 · 축전지 수랭 회로) = 같은 칸 너비로 한 행
   ② 이어진 묶음들이 같은 꼴 (모터 열 · 인버터 열 · 축전지 열 = [열 | 공랭]) = 묶음마다 한 열 (제목 + 상자 세로), 열 사이를 더 띄움
   ③ 나머지 상자는 앞 묶음의 남은 상자와 같은 행 (외기 + 냉각수 온도)
   상자 제목에 부품 이름이 있으면 안의 칸 이름에서 그 부품 · 회로 앞말을 뺌 (전체 이름은 마우스를 올리면) */
const T2PART = /^(모터|인버터|축전지)\s*/;
const t2BoxSig = B => String(B.n || '').replace(T2PART, '');
const t2PartOf = B => (String(B.n || '').match(T2PART) || [])[1] || '';
/* 편집 탭 배치 (관리자 지정, 2026-11-11): 행마다 n 열 격자, heads = [제목, 칸 수], cells = 상자 (g · sb 로 찾음, span 칸, k = 상자 안 열 수, col = 세로로 먼저 채움), wide = 다른 부품끼리 열 사이를 더 띄움.
   지정에 없는 상자는 끝에 예전 배치로 (빠지는 칸이 없게). 모터 · 인버터 · 축전지 탭은 나중에 다시 정함 (t2Board) */
const T2LAY = grp => ({
  car:[{n:3, heads:[[T2G.car, 3]], cells:[{sb:'질량 · 무게중심'}, {sb:'치수', span:2, k:2, col:1}]}],
  sus:[{n:3, heads:[[T2G.steer, 1], [T2G.rc, 2]], cells:[{sb:'최대 조향각'}, {sb:'롤센터 · 롤'}, {sb:'과도 (모델 3)'}]}],
  tire:[{n:2, heads:[[T2G.tire, 2]], cells:[{sb:'마찰 · 하중 이동'}, {sb:'바퀴'}]}, {n:1, cells:[{sb:'타이어 곡선 (모델 2 · 3)', k:2, col:1}]}],
  aero:[{n:2, heads:[[T2G.aero, 2]], cells:[{sb:'공력 계수'}, {sb:'압력중심'}]}],
  dt:[{n:1, heads:[[T2G.dt, 1]], cells:[{sb:'구동계', k:3}]}],
  cool:[{n:3, wide:1, heads:[[T2G.thm, 1]], cells:[{g:T2G.thm}]},
        /* 부품별 독립 = 회로마다 냉각수 (온도 · 비열 · 밀도) + 회로 값, 냉각 회로 = 공통 냉각수 온도 한 칸만 (회로 값은 위 편집기) (2026-11-11) */
        ...(WB.I.cw_mode===1 ? [{n:3, wide:1, cells:[{sb:'냉각수 온도', skip:1}, {sb:'모터 냉각수', skip:1}, {sb:'인버터 냉각수', skip:1}, {sb:'축전지 냉각수', skip:1},
              {sb:'모터 수랭 회로 (부품별 독립)', skip:1}, {sb:'인버터 수랭 회로 (부품별 독립)', skip:1}, {sb:'축전지 수랭 회로 (부품별 독립)', skip:1}]}]
          : [{n:3, wide:1, heads:[['수랭 회로', 3]], cells:[{sb:'냉각수 온도', skip:1}, {sb:'모터 냉각수'}, {sb:'인버터 냉각수'}, {sb:'축전지 냉각수'}]},
             {n:3, wide:1, cells:[{sb:'모터 수랭 회로 (부품별 독립)'}, {sb:'인버터 수랭 회로 (부품별 독립)'}, {sb:'축전지 수랭 회로 (부품별 독립)'}]}]),
        {n:3, wide:1, heads:[['공랭 회로', 3]], cells:[{sb:'모터 공랭'}, {sb:'인버터 공랭'}, {sb:'축전지 공랭'}]},
        {n:3, wide:1, heads:[['열 모델', 3]], cells:[{sb:'모터 열'}, {sb:'인버터 열'}, {sb:'축전지 열'}]}] })[grp];   /* 함수: T2G 가 뒤 파일에서 정의됨 */
function t2Lay(grp, groups){ const all = []; groups.forEach(G => G.sb.forEach(B => all.push({...B, g:G.g}))); const used = new Set();
  const find = c => all.find(B => !used.has(B) && (c.g ? B.g===c.g && !B.n : B.n===c.sb));
  const rows = T2LAY(grp).map(R => { const cells = R.cells.map(c => { const B = find(c); if(!B) return ''; used.add(B); if(c.skip) return ''; return `<div style="grid-column:span ${c.span || 1}">${t2BoxHTML(B, c.k, c.col)}</div>`; }).join('');
    if(!cells) return '';   // 모두 숨긴 행
    return (R.heads ? `<div class="t2-lay t2-layh${R.wide ? ' wide' : ''}" style="--n:${R.n}">${R.heads.map(([t, s]) => `<div class="wb-ig" style="grid-column:span ${s}">${wbEsc(t)}</div>`).join('')}</div>` : '') + `<div class="t2-lay${R.wide ? ' wide' : ''}" style="--n:${R.n}">${cells}</div>`; }).join('');
  const rest = groups.map(G => ({...G, sb:G.sb.filter(B => !all.some(A => used.has(A) && A.n===B.n && A.g===G.g))})).filter(G => G.sb.length);
  return rows + (rest.length ? t2Board(rest) : ''); }
function t2BoxHTML(B, k, col){ const P = t2PartOf(B), ds = P ? B.ds.map(d => { const n = wbInName(d), s = n.replace(new RegExp('^' + P + ' (회로 )?(· )?'), '').replace(/^라디 · /, '라디 · '); return s!==n && !/^[→·]/.test(s) ? {...d, n:s.charAt(0).toUpperCase() + s.slice(1), nFull:n} : d; }) : B.ds;
  const body = k > 1 ? `<div class="t2-bin${col ? ' col' : ''}" style="--k:${k};--r:${Math.ceil(ds.length / k)}">${wbInRows(ds, false)}</div>` : wbInRows(ds, false);
  return `<div class="t2-sb">${B.n ? `<div class="t2-sbh">${wbEsc(B.n)}</div>` : ''}${t2SbTop(B.n)}${body}</div>`; }
function t2Board(groups){ const rows = []; let pend = [];
  const flush = () => { if(pend.length===1){ const c = pend[0]; rows.push(`<div class="wb-ig">${wbEsc(c.t)}</div><div class="t2-sbs">${c.bs.map(B => t2BoxHTML(B)).join('')}</div>`); pend = []; } if(pend.length){ rows.push(`<div class="t2-brow t2-bcols" style="--n:${pend.length}">${pend.map(c => `<div class="t2-bcol">${c.t ? `<div class="wb-ig">${wbEsc(c.t)}</div>` : ''}${c.bs.map(B => t2BoxHTML(B)).join('')}</div>`).join('')}</div>`); pend = []; } };
  const skel = G => G.sb.map(t2BoxSig).join('|');
  for(let i = 0; i < groups.length; i++){ const G = groups[i];
    let j = i; while(j + 1 < groups.length && G.sb.length >= 2 && skel(groups[j + 1])===skel(G) && G.sb.every(B => t2PartOf(B))) j++;
    if(j > i){ flush(); rows.push(`<div class="t2-brow t2-bgrp" style="--n:${j - i + 1}">${groups.slice(i, j + 1).map(H => `<div class="t2-bcol"><div class="wb-ig">${wbEsc(H.g)}</div>${H.sb.map(B => t2BoxHTML(B)).join('')}</div>`).join('')}</div>`); i = j; continue; }
    const sig = {}; G.sb.forEach(B => { if(t2PartOf(B)) (sig[t2BoxSig(B)] = sig[t2BoxSig(B)] || []).push(B); });
    const set = Object.values(sig).find(a => a.length >= 2) || [], singles = G.sb.filter(B => !set.includes(B));
    /* ③ 상자 하나뿐인 묶음끼리만 한 행으로 (외기 + 냉각수 온도), 그 밖은 묶음 제목 + 상자 3칸 격자 (예전과 같음) */
    if(singles.length===1 && pend.every(c => c.bs.length===1)) pend.push({t:G.g, bs:singles});
    else { flush(); rows.push(`<div class="wb-ig">${wbEsc(G.g)}</div>` + (singles.length ? `<div class="t2-sbs">${singles.map(B => t2BoxHTML(B)).join('')}</div>` : '')); }
    if(set.length){ flush(); rows.push(`<div class="t2-brow t2-bset" style="--n:${set.length}">${set.map(B => t2BoxHTML(B)).join('')}</div>`); }
    if(pend.length >= 3) flush(); }
  flush(); return rows.join(''); }
const T2RL = {2:['레코드 라인', '최소 곡률 라인에서 출발해 우리 차 랩타임이 줄도록 조금씩 다듬은 라인 (차량 입력이 바뀌면 다시 다듬음)'],
              1:['최소 곡률 라인', '코스 폭 안에서 가장 덜 휘는 라인 (차량 성능과 상관없이 코스만으로 정함)'],
              0:['중심 라인', '코스 중심선을 그대로 따라감 (슬라럼 콘도 비켜 가지 않음)']};
const t2RlOf = () => WB.I.rl_on >= 2 ? 2 : WB.I.rl_on >= 1 ? 1 : 0;
/* 상자 맨 위에 넣는 옵션 행 (상자 이름으로 고름) */
function t2SbTop(n){ if(n==='최대 조향각'){ const S = t2Stab();
    return `<div class="t2-optrow"><span class="t2-optn">조향 기하</span>${S ? `<span>${JSON.stringify(T2.stab)===JSON.stringify(T2STAB_DEF) ? '기본 표 (2024 REF4 STEP 링크 기하, 도구 6 3D)' : '도구 6 조향각 표'}${wbSrcTag('2', 't2:stab')} ${S.n}행 · 핸들 최대 ${wbFmt(S.hw, 0)}° → 안쪽 ${wbFmt(S.di, 1)}° · 바깥 ${wbFmt(S.dout, 1)}° · 가운데 조향비 ${wbFmt(S.rc, 2)} · 최소 회전 반경 ${wbFmt(S.R, 2)} m</span> <button type="button" class="btn small" data-t2stabx>표 지우기</button>` : '<span class="muted">100 % 애커먼 · 일정 조향비</span>' + (wbEx() ? ' <button type="button" class="btn small" data-t2stabd>기본 표로 (STEP)</button>' : '')}</div>`; }
  if(n!=='여유') return ''; const r = t2RlOf();
  return `<div class="t2-optrow"><span class="t2-optn">주행선</span>${t2Seg('data-t2rl', String(r), [2, 1, 0].map(k => [String(k), T2RL[k][0]]))}
    <p class="muted t2-optd">${T2RL[r][1]} · 슬라럼은 첫 콘을 왼쪽으로 지나감</p></div>`; }
/* 입력 행 안 옵션 단추 (이름과 값 사이) */
/* 팩 제원 용량 [kWh] = 직렬 × 병렬 × 셀 용량 × 셀 공칭 전압 */
/* 축전지: 직렬 수가 있으면 셀 값으로 팩 값을 계산 (팩 칸 잠김), 직렬 수 0 이면 팩 칸 값을 씀 (셀 공칭 · 최소 · 병렬 · 셀 용량 잠김) — 계산 쪽 packCell 과 같은 식 */
const t2PkDir = () => WB.I.pk_dir===1;   // 팩 값 직접 (고르는 값, 직렬 수 0 으로 정하지 않음 · 2026-11-11)
const t2Cell = () => { const I = WB.I; if(!t2PkDir()) return {Ns:I.n_s, np:I.n_p, ah:I.c_ah, vmax:I.c_vmax, vnom:I.c_vnom, vmin:I.c_vmin};
  const cv = I.c_vmax > 0 ? I.c_vmax : 4.2, Ns = I.p_vmax / cv; return {Ns, np:1, ah:I.p_ah, vmax:cv, vnom:(I.p_vnom > 0 ? I.p_vnom : I.p_vmax)/Ns, vmin:(I.p_vmin > 0 ? I.p_vmin : I.p_vmax)/Ns}; };
const t2Epack = () => { const c = t2Cell(); return c.Ns*c.np*c.ah*c.vnom/1000; };
const T2PK = {p_vmax:c => c.Ns*c.vmax, p_vnom:c => c.Ns*c.vnom, p_vmin:c => c.Ns*c.vmin, p_ah:c => c.np*c.ah};
const T2EL = {0:'출력 상한을 낮추지 않고 끝까지 전력으로 달림 (소비가 팩 에너지를 넘어도)', 1:'내구 소비가 팩 제원 용량을 넘으면 출력 상한을 낮춰 맞춤', 2:'내구 소비가 아래 칸에 넣은 값을 넘으면 출력 상한을 낮춰 맞춤'};
const t2ElOf = () => WB.I.e_lim === 0 ? 0 : WB.I.e_lim === 2 ? 2 : 1;
function t2InOpt(k){ if(WB.id!=='2') return '';
  if(k==='n_s'){ const d = t2PkDir(); return `<span class="t2-inopt" title="${d ? '팩 전압 · 용량을 아래 팩 칸에 직접 넣음 (셀 칸 잠김)' : '셀 값 × 직렬 · 병렬 수로 팩 값을 계산 (팩 칸 잠김)'}">${t2Seg('data-t2pk', d ? '1' : '0', [['0', '셀로 계산'], ['1', '팩 값 직접']])}</span>`; }
  { const fm = {cw_fon:'cw_fm', i_wfon:'i_wfm', b_wfon:'b_wfm'}[k]; if(fm){ const on = WB.I[fm]===1, th = t2Th(), p = {cw_fm:'m', i_wfm:'i', b_wfm:'b'}[fm];
      const base = !th.w ? 1 : th.n9 ? 1 : !(p==='m' ? th.m && th.mW : p==='i' ? th.iW : th.b && th.bW);   /* 회로 자체가 안 쓰이면 단추도 막음 (2026-11-11) */
      if(base) return `<span class="t2-inopt">${t2Seg('data-t2fm', on ? '1' : '0', [['0', '팬 늘 켬'], ['1', '냉각수 온도로']]).replace(/<button /g, '<button disabled ')}</span>`; return `<span class="t2-inopt" title="${on ? '라디로 들어오는 냉각수가 이 온도 이상이면 팬을 켜고 3 K 아래로 내려가면 끔' : '팬은 늘 켜져 있음'}">${t2Seg('data-t2fm', on ? '1' : '0', [['0', '팬 늘 켬'], ['1', '냉각수 온도로']]).replace('<span class="dc-seg"', `<span class="dc-seg" data-t2fmk="${fm}"`)}</span>`; } }
  if(k==='i_ct'){ const on = WB.I.ict_m !== 0; return `<span class="t2-inopt" title="${on ? '연속 상전류를 값으로 넣음' : '연속 상전류 = 피크 × [연속 ÷ 피크 전류 비율] (모터 표에 연속 열이 없을 때와 같은 방식)'}">${t2Seg('data-t2ict', on ? '1' : '0', [['1', '값 입력'], ['0', '피크 × 비율']])}</span>`; }
  if(k==='tire_fz0'){ const on = WB.I.fz0_m !== 0; return `<span class="t2-inopt" title="${on ? 'μ · 코너링 강성을 잰 하중을 넣음' : 'μ 는 하중 0 의 값, 코너링 강성 기준은 정지 평균 하중 (바퀴 하나 = 차 무게 ÷ 4)'}">${t2Seg('data-t2fz0', on ? '1' : '0', [['1', '값 입력'], ['0', '정지 평균 하중']])}</span>`; }
  if(k==='eta_inv'){ const mg = WB.I.eff_mg === 1; return `<span class="t2-inopt" title="${mg ? '모터 효율(맵)이 모터 + 인버터 합친 값. 합친 손실을 [합친 손실 중 인버터 몫]으로 나눠 인버터 열로' : '모터 · 인버터 효율을 따로 넣음'}">${t2Seg('data-t2mg', mg ? '1' : '0', [['0', '따로'], ['1', '모터 맵에 합침']])}</span>`; }
  if(k!=='e_target') return ''; const m = t2ElOf();
  return `<span class="t2-inopt" title="${T2EL[m]}">${t2Seg('data-t2el', String(m), [['1', `제원 용량 ${wbFmt(t2Epack(), 2)} kWh`], ['2', '임의 상한'], ['0', '제한 없음']])}</span>`; }
/* ---------- 모델 단계 카드: 제목 · 핵심 한 줄 · 이 선택으로 달라지는 것 · (단추) · [자세히] · 쓰는 입력 · 아래 줄 (선택 표시 / 토글)
   o = {kind:'pick' 하나 고름 | 'tog' 켬 · 끔 | 'info' 안쪽 단추로 고름, attr, on, title, core, dif:[], ctl, more, use, onTxt, offTxt}
   카드 아무 곳이나 눌러 고르거나 켬 · 끔 (안쪽 단추 · [자세히] · 링크는 제외), Enter · Space 로도 */
function t2Card(o){ const tog = o.kind==='tog', pick = o.kind==='pick';
  const sw = tog ? `<span class="t2sw${o.on ? ' on' : ''}" aria-hidden="true"><i></i></span>` : '';
  return `<div class="t2c${o.on ? ' on' : ''}${pick ? ' pick' : ''}${tog ? ' tog' : ''}"${o.attr ? ` ${o.attr}` : ''}${pick || tog ? ` role="${pick ? 'radio' : 'switch'}" tabindex="0" aria-checked="${!!o.on}"` : ''}>
    <div class="t2c-h"><b>${o.title}</b>${tog ? `<span class="t2c-sw">${sw}</span>` : ''}</div>
    <div class="t2c-core">${o.core}</div>
    ${o.dif && o.dif.length ? `<ul class="t2c-dif">${o.dif.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${o.ctl || ''}
    ${o.more ? `<details class="t2c-more"><summary>자세히</summary><div>${o.more}</div></details>` : ''}
    <div class="t2c-foot">${o.use ? `<span class="t2c-use"><span class="muted">입력</span> ${o.use}</span>` : '<span></span>'}${pick ? `<span class="t2c-pk">${o.on ? '✓ 선택됨' : '선택'}</span>` : ''}</div></div>`; }
/* 차량 모델 단계: [키, 제목, 핵심, 달라지는 것, 자세히, 쓰는 입력] */
const T2MDV = [[0, '0 기본', '점질량 + 바퀴별 하중', ['좌우 하중 이동 = 무게중심 높이로', '바퀴마다 μ(하중): 하중 감도가 있으면 하중 이동이 그립 합을 줄임', '롤 없음'],
                '무게중심 높이 전체로 좌우 하중 이동을 계산하고, 바퀴마다 μ(하중) 로 그립을 셉니다 (하중 감도가 0 이면 하중 이동이 그립 합을 바꾸지 않음). 롤은 계산하지 않습니다.', '무게중심 높이 · 트레드 · μ · 하중 감도'],
               [1, '1 롤센터 · 롤', '+ 롤센터 · 롤', ['하중 이동 = 기하 몫 (롤센터) + 탄성 몫 (스프링 · ARB)', '롤각 계산'],
                '앞 · 뒤 롤센터 높이로 하중 이동을 기하 몫(롤센터에서 바로 전달)과 탄성 몫(스프링 · 안티롤바)으로 나누고, 롤 강성으로 롤각을 계산합니다.', '롤센터 높이 · 롤강성'],
               [2, '2 비선형 타이어', '+ 타이어 곡선 · 조향', ['축 횡 한계 = 두 바퀴가 같은 슬립각일 때 최댓값 (도구 T 곡선)', '최대 조향각을 넘는 코너는 감속', '슬립각 · 차체 각도 β · 조향각 · US 구배'],
                '도구 T 의 타이어 곡선(Magic Formula 꼴)으로 축 횡 한계를 두 바퀴가 같은 슬립각일 때의 최댓값으로 셉니다. 좌우 하중이 달라 두 바퀴 최고점 슬립각이 어긋나면 Σ μ·F<sub>z</sub> 보다 작아 코너 한계 속도가 낮아집니다. 최대 조향각을 넣으면 필요한 안쪽 바퀴 조향각(기하 + 슬립각 차)이 최대를 넘는 코너는 속도를 낮추고, 아주 느려도 못 도는 코너가 있으면 계산을 멈춥니다. 전폭을 넣으면 속도에 따른 차체 각도(저속 기구학 − 뒷바퀴 슬립각)로 차 사각형을 놓아 코스 경계나 슬라럼 콘(중심)에 닿는 곳은 속도를 낮춥니다.', '타이어 곡선 · 조향비 · 최대 조향각'],
               [3, '3 과도', '+ 요 · 롤 운동', ['곡률이 바뀌는 곳은 요 관성 · 타이어 지연만큼 감속', '선 다듬기도 이 한계로', '계단 조향 시간 응답 (ISO 7401 꼴)'],
                '주행선을 그대로 따라가는 데 드는 타이어 힘에 요 관성(요 가속도)과 타이어 이완 길이(힘이 늦게 따라옴)를 넣습니다. ① 곡률이 바뀌는 곳은 앞 · 뒤 축마다 등가 곡률로 코너 한계 속도를 낮추고, 주행선 다듬기도 이 한계로 랩타임을 비교해 모델 3 의 선을 따로 고릅니다. ② 속도가 바뀌며 생기는 몫은 정해진 선에서 한계를 넘는 곳만 속도를 더 낮추고 준정적을 다시 풉니다 (앞에서 더 일찍 감속). 내구 · 오토크로스 · 내 코스에 반영하고, 일정 차속 계단 조향의 시간 응답(3 자유도 + 타이어 이완, ISO 7401 꼴)도 따로 보여 줍니다.', '요 · 롤 관성 · 롤 감쇠 · 이완 길이 · 곡률 다듬기 거리']];
/* 열 모델: [켬 키, 냉각 방식 키, 제목, 핵심, 켬, 끔, 자세히, 쓰는 입력] */
const T2MDT = [['th_on', 'm_cool', '모터 온도', '모터 온도 → 토크 제한', '디레이팅 시작 ~ 끝 온도에서 피크 → 연속 토크로 줄임', '출발 온도 그대로 · 디레이팅 없음',
                '모터 손실로 모터 온도가 오르고, 수랭이면 냉각수로 · 공랭이면 외기로 열을 내보냅니다. 모터 온도가 디레이팅 시작 ~ 끝 온도 사이면 회전수마다 피크에서 연속 토크 쪽으로 같은 비율만큼 내려갑니다.', '열용량 · 출발 온도 · 디레이팅 온도 · 열저항 / hA'],
               ['in_on', 'i_cool', '인버터 온도', '인버터 온도 → 상전류 제한', '디레이팅 시작 ~ 끝 온도에서 상전류 상한 피크 → 연속', '출발 온도 그대로 · 디레이팅 없음 (수랭이면 손실은 냉각수로)',
                '인버터 손실로 인버터 온도가 오르고, 수랭이면 냉각수로 · 공랭이면 외기로 열을 내보냅니다. 인버터 온도가 디레이팅 시작 ~ 끝 온도 사이면 상전류 상한이 피크에서 연속 쪽으로 같은 비율만큼 내려갑니다 (모터와 같은 방식).', '열용량 · 출발 온도 · 디레이팅 온도 · 열저항 / hA'],
               ['bt_on', 'b_cool', '축전지 온도', '팩 온도 → 내부저항', '차가울수록 내부저항 ↑ → 손실 · 전압 강하 · 발열 ↑', '팩 온도 = 시작 온도로 고정',
                '팩 내부저항 손실로 축전지 온도가 오르고, 공랭이면 외기로 · 수랭이면 냉각수로 열을 내보냅니다. 내부저항은 셀 표(SOC × 온도)를 쓰면 표로, 아니면 온도 계수로 온도가 낮을수록 커집니다.', '팩 열용량 · 시작 온도 · 저항 온도 계수 또는 셀 표 · hA / 열저항'],
               ['cw_on', '', '냉각수 온도', '냉각수가 데워짐', '라디 방열 (차속에 따라) 로 냉각수 온도 계산', '냉각수 온도 고정',
                '수랭 부품에서 들어온 열을 라디에이터가 외기로 내보냅니다 (방열 능력은 차속에 따라 커짐). 부품별 독립 = 수랭 부품마다 자기 냉각수 · 라디. 냉각 회로 = 편집 탭 [냉각] 에서 그린 배치 (직렬 · 병렬 갈라짐 · 합침 · 라디 여러 개 · 공랭 덕트, 앞 부품이 데운 냉각수 · 공기를 뒤 부품이 받음). 수랭으로 열을 넣는 부품이 있을 때만 계산합니다.', '부품별 회로 값 또는 냉각 회로']];
/* 지금 켜진 노드 (냉각수는 실제로 계산되는지까지) */
/* 냉각 회로 (수랭 방식 1): 도구 2P 자체 배치 (편집 탭 [냉각]). 부품 → 'w1' (수랭 회로 번호) · 'a1' (공랭 덕트) · '' (외기) */
const t2Net9 = () => { try{ return typeof t9CoolCompile==='function' ? t9CoolCompile(t2Cwc()) : null; }catch(e){ return null; } };
const t2CoolSum = () => { const R = t2Net9(); return R ? `수랭 회로 ${R.net.water.length}개 · 공랭 덕트 ${(R.net.air || []).length}개${Object.keys(R.err || {}).length ? ` · 오류 ${Object.keys(R.err).length}개는 뺌` : ''}` : '회로 없음'; };
const t2Where9 = () => { const R = t2Net9(), W = {m:'', i:'', b:''}; if(!R) return W;
  R.net.water.forEach((C, w) => C.nodes.forEach(nd => { if(nd.part && !W[nd.part]) W[nd.part] = 'w' + (w + 1); }));
  (R.net.air || []).forEach((D, a) => D.parts.forEach(p => { if(!W[p]) W[p] = 'a' + (a + 1); })); return W; };
const t2Th = () => { const I = WB.I, m = I.th_on !== 0, i = I.in_on === 1, b = I.bt_on === 1, n9 = I.cw_mode === 1, P = n9 ? t2Where9() : null;
  const mW = n9 ? P.m[0]==='w' : I.m_cool !== 0, iW = n9 ? P.i[0]==='w' : I.i_cool !== 0, bW = n9 ? P.b[0]==='w' : I.b_cool === 1;
  const src = (m && mW) || iW || (b && bW); return {m, i, b, mW, iW, bW, src, n9, P, w: I.cw_on === 1 && src}; };
const t2ThName = () => { const t = t2Th(), a = [t.m && '모터', t.i && '인버터', t.b && '축전지', t.w && '냉각수'].filter(Boolean); return a.length ? a.join(' · ') : '없음'; };
function t2ModelPage(){ const md = Math.max(0, Math.min(3, Math.round(WB.I.md || 0))), th = t2Th(), on = {th_on:th.m, in_on:th.i, bt_on:th.b, cw_on:WB.I.cw_on === 1};
  const head = (nm, note, ctl = '') => `<div class="t2-mdh">${nm}<span class="muted t2-mdhn">${note}</span>${ctl}</div>`;
  const veh = `<div class="t2-mdax">${head('차량 모델', '수준 하나 고름 · 높은 수준은 낮은 수준을 모두 포함하고 더 많은 현상을 계산')}<div class="t2-mdops four">${T2MDV.map(([k, t, c, dif, more, use]) =>
      t2Card({kind:'pick', attr:`data-t2md="${k}"`, on:md===k, title:t, core:c, dif, more, use})).join('')}</div></div>`;
  const n9 = th.n9, pl = q => !q ? '외기' : q[0]==='w' ? `수랭 회로 ${q.slice(1)}` : `공랭 덕트 ${q.slice(1)}`;
  const thm = `<div class="t2-mdax">${head('열 모델', '계통마다 켬 · 끔 · 냉각수 온도는 수랭 부품이 있어야 계산', `<span class="t2-mdc t2-mdhc"><span class="muted">냉각 배치 (수랭 · 공랭)</span><span class="dc-seg" role="group">${[[0, '부품별 독립'], [1, '냉각 회로']].map(([q, nm]) => `<button type="button" data-t2cwm="${q}" aria-pressed="${(n9 ? 1 : 0)===q}">${nm}</button>`).join('')}</span>${n9 ? `<span class="muted">${t2CoolSum()} · <button type="button" class="lnk" data-t2gocool>회로 편집</button></span>` : ''}</span>`)}<div class="t2-mdops four">${T2MDT.map(([k, c, t, core, onT, offT, more, use]) => {
      const cw = k==='cw_on', dead = cw && on[k] && !th.src, p = c ? c[0] : '';
      const ctl = c ? (n9 ? `<span class="t2-mdc"><span class="muted">냉각 (회로)</span> ${pl(th.P[p])}</span>`
                        : (() => { const wv = c==='b_cool' ? (WB.I.b_cool === 1 ? 1 : 0) : (WB.I[c] !== 0 ? 1 : 0); return `<span class="t2-mdc"><span class="muted">냉각</span><span class="dc-seg" role="group">${[[0, '공랭'], [1, '수랭']].map(([q, nm]) => `<button type="button" data-t2cool-${c}="${q}" aria-pressed="${wv===q}">${nm}</button>`).join('')}</span></span>`; })())
        : `<span class="t2-mdc muted">${n9 ? '냉각 회로의 수랭 회로마다' : '수랭 부품마다 자기 냉각수 · 라디'}${th.src ? '' : ' · 수랭 부품 없음 → 계산 안 함'}${dead ? ' (고정값 사용)' : ''}</span>`;
      return t2Card({kind:'tog', attr:`data-t2th="${k}"`, on:on[k], title:t, core, dif:[`<b>켬</b> ${onT}`, `<b>끔</b> ${offT}`], ctl, more, use}); }).join('')}</div></div>`;
  const dr = WB.I.dr_real === 1 ? 1 : 0, ks = wbFmt(WB.I.dr_ks, 2), ke = wbFmt(WB.I.dr_ke, 2);
  const T2DRC = [[0, '이상', '그립 100 %', ['<span class="t2c-eq">쓰는 그립 = 그립</span> (마찰 타원 경계)', '차의 한계 성능'], '타이어가 낼 수 있는 힘을 모두 씁니다.', ''],
                 [1, '현실', '실제 FSK 기록 수준', ['<span class="t2c-eq">쓰는 그립 = 그립 × k<sub>s</sub> × k<sub>e</sub></span>', `k<sub>s</sub> = <b>${ks}</b> (가속 제외 모든 종목)`, `k<sub>e</sub> = <b>${ke}</b> (내구 · 내 코스 [내구 주행]) · 그 밖 1`, '조작 한계 (고정): 핸들 900 °/s (360° 를 0.4 s) · 페달 신호 0 → 100 % 0.2 s (양발)', '가속 = WOT, 배율 없음'],
                  'k<sub>s</sub> · k<sub>e</sub> 기본값은 2025 · 2026 E-Formula 완주 팀 기록 (오토크로스 중앙값, 내구 랩 ÷ 오토크로스 중앙값) 에 차량 모델 3 으로 맞춘 값입니다. 마찰 타원(종 · 횡 한계 모두)에 곱합니다. k<sub>e</sub> 는 장시간 · 추월 대기 · 피로 등 내구 페이스입니다.', '기본 그립 사용률 · 내구 페이스']];
  const drv = `<div class="t2-mdax">${head('운전자 모델', '하나 고름 · 에너지 상한에 맞추는 방법은 기능 설정 [내구 에너지 상한]')}<div class="t2-mdops two">${T2DRC.map(([k, t, c, dif, more, use]) =>
      t2Card({kind:'pick', attr:`data-t2drr="${k}"`, on:dr===k, title:t, core:c, dif, more, use})).join('')}</div></div>`;
  const fset = `<div class="t2-mdax">${head('기능 설정', '기능마다 고려 · 고려 안 함 (0 은 끔이 아니라 실제 0)')}<div class="t2-mdops four">${t2FsCards()}</div></div>`;
  return `<div class="t2-model"><p class="muted t2-mdnote">차량 · 운전자 모델은 하나 고름 · 열 · 기능은 하나씩 켬 · 끔 · 계산에 쓴 조합은 시뮬레이션 탭 위에 표시 · 대시보드로 보내는 값은 늘 차량 0 · 모터 온도로 계산</p>
    ${veh}${drv}${thm}${fset}${t2Consts('model')}</div>`; }
/* 내구 에너지 상한에 맞추는 방법: [키, 이름, 한 줄, 자세히] */
const T2DRV = [[0, '출력 낮춤', '출력 상한을 내구 전체에 같은 배율로 낮춤', '코너마다 한계까지 가속하고 최대로 제동합니다. 내구 에너지 상한에 걸리면 단자 출력 상한을 내구 전체에 같은 배율로 낮춰 맞춥니다.'],
               [1, '타력', '제동 앞에서 미리 페달을 뗌 (λ)', '출력을 깎지 않고 제동 앞에서 미리 가속 페달을 떼고 타력으로 달립니다. 제동 구간마다 [시간 + λ × 소비 에너지]가 가장 작은 곳에서 떼고, λ(에너지 1 kWh 의 시간 값)는 소비가 상한과 같아지게 정합니다 (에너지 제한 최소 시간 문제의 최대 구동 · 타력 · 제동 구조).']];
/* 기능 설정 카드 */
const T2RLS = {2:'최소 곡률에서 출발해 랩타임이 줄게 다듬은 선', 1:'코스 폭 안에서 가장 덜 휘는 선', 0:'코스 중심선 그대로'};
const T2ELS = {0:'끝까지 전력 (팩 에너지를 넘어도)', 1:'내구 소비 ≤ 팩 제원 용량', 2:'내구 소비 ≤ 넣은 상한'};
/* 도구 6 조향각 표 요약 (계산 쪽 steerGeo 와 같은 식): 행 수 · 핸들 최대 · 안쪽 최대 · 가운데 조향비 · 최소 회전 반경 */
const t2Stab = () => { const T = Array.isArray(T2.stab) ? T2.stab.filter(r => r[0] > 0 && r[1] > 0 && r[2] > 0).sort((a, b) => a[0] - b[0]) : []; if(T.length < 2) return null;
  const I = WB.I, D = Math.PI/180, L = I.L/1000, lr = L*I.fr/100, e = T.at(-1), Ra = L*((1/Math.tan(e[1]*D) + 1/Math.tan(e[2]*D))/2);
  return {n:T.length, hw:e[0], di:e[1], dout:e[2], rc:T[0][0]/((T[0][1] + T[0][2])/2), R:Math.sqrt(Ra*Ra + lr*lr)}; };
const t2RKin = () => { const I = WB.I; if(I.dl_on === 0) return NaN; const S = t2Stab(); if(S) return S.R; if(!(I.delta_max > 0)) return NaN; const L = I.L / 1000, lr = L * I.fr / 100, Rr = L / Math.tan(I.delta_max * Math.PI / 180) + I.tf / 2000; return Math.sqrt(Rr * Rr + lr * lr); };
function t2FsCards(){ const I = WB.I, md = I.md || 0, rl = t2RlOf(), el = t2ElOf(), dl = I.dl_on !== 0, rg = I.rg_on === 1, dv = I.drv === 1 ? 1 : 0;
  const tog = (k, on, title, core, onT, offT, more, use) => t2Card({kind:'tog', attr:`data-t2fs="${k}"`, on, title, core, dif:[`<b>고려</b> ${onT}`, `<b>고려 안 함</b> ${offT}`], more, use, onTxt:'고려', offTxt:'고려 안 함'});
  return [
    t2Card({kind:'info', on:true, title:'주행선', core:'어느 선으로 달리나', ctl:`<span class="t2-mdc">${t2Seg('data-t2rl', String(rl), [2, 1, 0].map(k => [String(k), T2RL[k][0]]))}</span>`, dif:[T2RLS[rl]], more:T2RL[rl][1] + '. 슬라럼은 첫 콘을 왼쪽으로 지나갑니다.', use:'여유 · 최소 거리'}),
    tog('dl_on', dl, '조향 한계', '최대 조향각으로 회전 제한', `주행선 |곡률| ≤ 1 ÷ R<sub>min</sub>${md >= 2 ? ' · 슬립각까지 더해 최대를 넘으면 감속' : ''}`, '조향각 · 회전 반경 제한 없음',
        `최소 회전 반경 R<sub>min</sub> = √((L ÷ tan δ<sub>max</sub> + t<sub>f</sub> ÷ 2)² + l<sub>r</sub>²) (아주 느리게 · 100 % 애커먼)${isFinite(t2RKin()) ? ` = <b>${wbFmt(t2RKin(), 2)} m</b>` : ''} 로 주행선을 만들고, 폭 · 콘 때문에 못 지키면 결과에 급한 구간으로 알립니다. 차량 모델 2 이상은 안쪽 바퀴 조향각 = 기하 + 슬립각 차이로 속도마다 확인해 넘으면 감속합니다 (아주 느리게도 못 돌면 멈춤).`, '최대 조향각'),
    t2Card({kind:'info', on:el !== 0, title:'내구 에너지 상한', core:'내구 소비를 얼마까지', ctl:`<span class="t2-mdc">${t2Seg('data-t2el', String(el), [['1', `제원 ${wbFmt(t2Epack(), 2)} kWh`], ['2', '임의 상한'], ['0', '제한 없음']])}</span>${el !== 0 ? `<span class="t2-mdc"><span class="muted">맞추는 방법</span>${t2Seg('data-t2drv', String(dv), [['0', '출력 낮춤'], ['1', '타력']])}</span>` : ''}`,
            dif:[T2ELS[el], ...(el !== 0 ? [`<b>${T2DRV[dv][1]}</b> ${T2DRV[dv][2]}`] : [])], more:el !== 0 ? T2DRV[dv][3] : '', use:'내구 에너지 상한'}),
    tog('rg_on', rg, '회생 제동', '제동 에너지 회수', '뒤축 제동 몫을 모터가 회수 (토크 · 충전 전류 한계)', '마찰 브레이크만', '모터 축 토크 ≤ min(회생 토크 상한, 그 회전수의 최대 토크 · 인버터 한계), 충전 전류 ≤ 팩 충전 전류 한계, 나머지는 마찰 브레이크. 저속 회생 차단 · 회생 토크 곡선은 넣지 않습니다.', '회생 토크 상한 · 충전 전류 한계'),
  ].join(''); }
/* 편집 탭 [냉각]: 외기 · 냉각수 등가값 + 도구 9 와 주고받기 (회로 설계는 도구 9 냉각 계통 계산기) */
function t2CoolLite(){ const o = WB.id==='2' && WB.R && WB.R.out, ok = o && isFinite(o.c_qm), f = (v, d) => isFinite(v) ? wbFmt(v, d) : '—', lp = T2.lap[T2.course] || '1';
  const n9 = WB.I.cw_mode === 1;
  return `<div class="t2-coolq"><div class="t2-cq"><b>수랭 방식</b> <span class="dc-seg" role="group">${[[0, '부품별 독립'], [1, '냉각 회로']].map(([v, t]) => `<button type="button" data-t2cwm="${v}" aria-pressed="${(n9 ? 1 : 0)===v}">${t}</button>`).join('')}</span>
</div>
    ${n9 ? `<div class="t2-cq"><b>냉각 회로</b> <span class="muted">${t2CoolSum()} · 이 도구에만 저장 (도구 9 와 따로)</span>
      <div class="t2-cqb">${wbSrcGet('2', 't2:cool') ? `<span class="wb-src">${wbSrcGet('2', 't2:cool')}에서 복사함</span>` : ''}${wbEx() ? '<button type="button" class="btn small" data-t2cw9="def">기본 배치로</button>' : '<button type="button" class="btn small" data-t2cw9="def">비우기</button>'}</div>
      ${typeof t9CoolPage==='function' ? t9CoolPage() : ''}</div>` : ''}
    ${t2Consts('cool')}
    ${n9 ? '' : (rt => `<div class="t2-sub"><span class="muted">라디 표</span>${t2Seg('data-t2et', rt, T2RAD.map(k => [k, T2ET[k]]))}</div>${t2MapEdit(rt)}`)(T2RAD.includes(T2.etab) ? T2.etab : 'rqM')}
    </div>`; }
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return; const b = e.target.closest('[data-t2cwm]'); if(!b) return;
  e.stopPropagation(); WB.I.cw_mode = +b.dataset.t2cwm; wbSave(); wbPaint(['ext', 'in']); wbCalcSoon(); }, true);
/* 카드 (role=radio · switch): Enter · Space 로도 고름 · 켬 · 끔 */
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest || !e.target.closest('[data-t2stabx]')) return; T2.stab = []; wbSrcDel('2', 't2:stab'); t2Save(); wbPaint(['in', 'ext']); wbCalcSoon(); toast('조향각 표를 지웠습니다 (100 % 애커먼 · 일정 조향비로).'); });
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest || !e.target.closest('[data-t2stabd]')) return; T2.stab = T2STAB_DEF.map(r => r.slice()); wbSrcDel('2', 't2:stab'); t2Save(); wbPaint(['in', 'ext']); wbCalcSoon(); toast('조향각 표를 기본값 (2024 REF4 STEP 링크 기하) 으로 되돌렸습니다.'); });
document.addEventListener('keydown', e => { if(WB.id!=='2' || (e.key!=='Enter' && e.key!==' ') || !e.target.matches || !e.target.matches('.t2c[role]')) return; e.preventDefault(); e.target.click(); });
/* 냉각 회로: 도구 9 에서 복사 · 기본 배치, 카드의 [회로 편집] = 편집 탭 [냉각] 으로 */
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return;
  const g = e.target.closest('[data-t2gocool]'); if(g){ T2.tab = 'edit'; T2.etab = 'cool'; t2Save(); wbPaint(['ext']); return; }
  const b = e.target.closest('[data-t2cw9]'); if(!b) return;
  if(b.dataset.t2cw9==='get'){ if(typeof T9==='undefined') return; t2Cwc().cool = JSON.parse(JSON.stringify(T9.cool)); toast('도구 9 의 냉각 배치를 복사했습니다 (이제부터 따로 고침).'); }
  else if(typeof T9COOL_DEF==='function'){ t2Cwc().cool = wbEx() ? T9COOL_DEF() : T9COOL_NEW(); wbSrcDel('2', 't2:cool'); }
  t2Save(); wbPaint(['ext', 'in']); wbCalcSoon(); });
/* 축전지 셀 표: 도구 4 에서 복사 (그 뒤로는 따로) */
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest || !e.target.closest('[data-t2b4]')) return;
  const C4 = typeof t4CellGet==='function' ? t4CellGet() : null; if(!C4 || !(C4.o || C4.r || C4.c)){ toast('도구 4 에 셀 표가 없습니다 (도구 4 [셀 표]에서 넣으면 가져올 수 있음).'); return; }
  T2.bO = C4.o || ''; T2.bR = C4.r || ''; T2.bC = C4.c || ''; t2Save(); toast('도구 4 의 셀 표를 복사했습니다 (OCV · 내부저항 · 용량).'); wbPaint(['ext', 'in']); wbCalcSoon(); });
/* 내 코스 주행 성격: 기록 주행 (k_e = 1) / 내구 주행 (현실 운전자면 k_e 적용) */
document.addEventListener('click', e => { if(WB.id!=='2' || !e.target.closest) return; const b = e.target.closest('[data-t2fend]'); if(!b) return;
  T2.free.end = +b.dataset.t2fend === 1 ? 1 : 0; t2Save(); wbPaint(['ext']); wbCalcSoon(); });
function t2EditBody(){ const et = T2.etab, grp = t2Grp(et);
  if(grp==='model') return t2ModelPage();
  if(grp==='cool') return t2CoolLite();
  if(grp==='course') return `${t2Consts('course')}${t2CourseEdit()}`;
  if(grp==='mot') return t2Consts('mot') + `<div class="t2-sub"><span class="muted">표</span>${t2Seg('data-t2et', et, T2MOT.map(k => [k, T2ET[k]]))}</div>` + t2MapEdit(et);
  if(grp==='tire') return t2Consts('tire') + t2MapEdit('tire');
  if(grp==='dt') return t2Consts('dt') + t2MapEdit('eD');   /* 구동계 효율: 상수 또는 맵 (모터 회전수 × 모터 토크) */
  if(grp==='bat'){ const bt = T2BAT.includes(et) ? et : 'bO';
    return t2Consts('bat') + `<div class="t2-sub"><span class="muted">셀 표</span>${t2Seg('data-t2et', bt, T2BAT.map(k => [k, T2ET[k]]))}</div>` + t2MapEdit(bt); }
  return t2Consts(grp); }

/* ---------- [입력하기 ▾] 메뉴: 표 k = track · mt · eM · eI · tire.  on = false 면 회색으로 막음 */
function t2MenuHTML(k, label, on){ const tpl = k==='track' ? 'track' : k==='mt' ? 'motor' : k==='tire' ? 'tire' : k==='bO' ? 'bocv' : k==='bR' ? 'bres' : k==='bC' ? 'bcap' : k==='dM' || k==='dI' ? 'der' : T2RAD.includes(k) ? 'rad' : 'eff';
  const items = [`<label class="t2-mi">파일 가져오기 (.xlsx · .csv)<input type="file" accept=".xlsx,.csv,.txt,.tsv" data-t2file="${k}" hidden></label>`,
    `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.xlsx">양식 받기 (.xlsx)</button>`, `<button type="button" data-t2act="tpl" data-t2tpl="${tpl}.csv">양식 받기 (.csv)</button>`,
    k==='track' && wbEx() ? `<button type="button" data-t2act="ex" data-t2k="track">예시 코스로</button>` : '',
    k==='mt' && wbEx() ? `<button type="button" data-t2act="ex" data-t2k="mt">예시 곡선으로</button>` : '', k==='eM' && wbEx() ? `<button type="button" data-t2act="ex" data-t2k="eM">예시 효율 맵으로</button>` : '',
    `<button type="button" data-t2act="clear" data-t2k="${k}">${k==='track' ? '비우기 (내 코스 없음)' : '비우기 (왼쪽 상수 칸 사용)'}</button>`].filter(Boolean);
  return `<div class="t2-menu"><button type="button" class="btn small" data-t2menu="${k}" aria-expanded="${T2.menu===k}"${on ? '' : ' disabled title="공식 코스는 고칠 수 없습니다"'}>${label} ▾</button>${T2.menu===k && on ? `<div class="t2-mn" role="menu">${items.join('')}</div>` : ''}</div>`; }

/* ============================================================ 맵 편집: 코스 */
const T2INFO = {
  free: () => '랩 수가 2 이상이거나 출발 위치가 0이 아니면 끝을 처음에 이어 붙인 닫힌 코스로 계산합니다. 1번째 랩은 정지 출발, 2번째부터 앞 랩 끝 속도를 이어받습니다. 주행 성격 = 현실 운전자의 내구 페이스 k<sub>e</sub> 적용 여부 (내구 주행만 적용).',
  ax:   () => '공식 내구 코스를 거꾸로 한 바퀴, 정지 출발.',
  end:  () => `FSK 2026 공식 코스 × ${FSK26.laps}랩 = ${wbFmt(FSK26.len*FSK26.laps/1000, 2)} km. 드라이버당 ${FSK26.stint}랩, 각 드라이버 정지 출발(1 · ${FSK26.stint + 1}번째 랩), 교체 시간 제외. 랩마다 SOC가 줄고 모터 온도가 오릅니다.`,
  acc:  () => '직선 75 m, 정지 출발.',
  skid: () => `8자 코스 (두 원 중심 거리 18.25 m, 안쪽 지름 15.25 m · 바깥 21.25 m, 주행로 폭 3 m, 콘 안쪽 16 · 바깥 13개, FSAE D.10.1). 주행 반경 ${wbFmt(t2SkR(), 2)} m = 주행선에 따라 (중심 9.125 m · 최소 곡률 = 바깥 끝 · 레코드 = 한 바퀴가 가장 빠른 반경, 차 폭 · 여유 안에서). 기록 = 오른쪽 한 바퀴 + 왼쪽 한 바퀴 (일정 반경이라 정상 선회 속도로 계산).` };
/* 코스 → 표 행 {l 길이 m, R 반경 m (왼쪽 +), note} */
function t2CourseRows(c){
  if(c==='free') return t2Track(T2.free.text).rows;
  const B = t2ConeBounds(), N = FSK26.seg.length, W = (a, i) => (a[i] + a[(i + 1) % N]) / 2, sl = new Set(B.slalom);   // 공식 코스: 폭 = 실제 콘 위치로 잡은 경계 (구간 양 끝 평균), 콘 = 구간 시작 부근 슬라럼 콘
  if(c==='end') return FSK26.seg.map(([l, R], i) => ({l, R, wl:W(B.WL, i), wr:W(B.WR, i), cone:sl.has(i), note:''}));
  if(c==='ax')  return FSK26.seg.map((_, k) => { const i = N - 1 - k, [l, R] = FSK26.seg[i]; return {l, R:-R, wl:W(B.WR, i), wr:W(B.WL, i), cone:sl.has((i + 1) % N), note:''}; });
  if(c==='acc') return [{l:75, R:0, note:'가속 구간'}];
  const SR = t2SkR(), C2 = 2*Math.PI*SR;
  return [{l:15, R:0, note:'진입'}, {l:C2, R:-SR, note:'오른쪽 1바퀴'}, {l:C2, R:-SR, note:'오른쪽 2바퀴 (기록)'}, {l:C2, R:SR, note:'왼쪽 1바퀴'}, {l:C2, R:SR, note:'왼쪽 2바퀴 (기록)'}, {l:15, R:0, note:'탈출'}]; }
/* 스키드패드 주행 반경: 계산 결과 (주행선 · 차 크기) 가 있으면 그 값, 없으면 가운데 9.125 m */
const t2SkR = () => { const o = WB.id==='2' && WB.R && WB.R.out; return o && isFinite(o.sk_r) ? o.sk_r : 9.125; };
const t2LapsOf = c => c==='free' ? T2.free.laps : c==='end' ? FSK26.laps : 1;
function t2LapSel(){ const c = T2.course, n = t2LapsOf(c), cur = n > 1 ? (T2.lap[c] || '1') : '1';
  const o = n > 1 ? [['all', '전체'], ...Array.from({length:n}, (_, i) => [String(i + 1), `${i + 1}번째 랩${c==='end' && (i===0 || i===FSK26.stint) ? ' (정지 출발)' : ''}`])] : [['1', '1번째 랩']];
  return `<select data-t2lap${n > 1 ? '' : ' disabled'}>${o.map(([k, t]) => `<option value="${k}"${cur===k ? ' selected' : ''}>${t}</option>`).join('')}</select>`; }
function t2CourseEdit(){ const c = T2.ecourse, own = c==='free', rows = t2CourseRows(c);   // 편집 탭 코스 = 시뮬레이션 코스와 따로 (바꿔도 계산 안 함)
  return `<div class="t2-set">${t2Seg('data-t2ecourse', c, T2COURSES.map(k => [k, T2CN[k]]))}
      <label>랩 수 <input type="number" min="1" step="1" data-t2o="laps" value="${t2LapsOf(c)}"${own ? '' : ' disabled'}></label>
      <label>출발 위치 <input type="number" min="0" step="any" data-t2o="s0" value="${own ? T2.free.s0 : 0}"${own ? '' : ' disabled'}> m</label>
      ${own ? `<span class="t2-fend" title="현실 운전자일 때: 기록 주행 = k_s 만, 내구 주행 = k_s × k_e"><span class="muted">주행 성격</span>${t2Seg('data-t2fend', T2.free.end === 1 ? '1' : '0', [['0', '기록 주행'], ['1', '내구 주행']])}</span>` : ''}
      <span class="t2-sum" id="t2sum">${t2SumText(rows, own)}</span></div>
    <p class="t2-rule muted">${own ? '' : '<b>공식 코스 · 보기만 (고칠 수 없음).</b> '}${T2INFO[c]()}</p>
    ${t2Pair(t2MenuHTML('track', '코스 입력하기', own), `<div class="t2-tw${own ? '' : ' ro'}" id="t2tt">${t2TrackTable(rows, own)}</div>`,
      `<span class="muted">그림을 누르면 표에서 그 구간으로 갑니다</span>${T2ZB}`, `<div class="t2-fbox" id="t2emap" data-zoombox="t2emap">${t2MapSVG(true)}</div>`,
      '<span class="t2-mleg"><i class="sl"></i>출발 (주행 방향 오른쪽) <i class="fin"></i>결승 (왼쪽) <i class="arr">→</i>주행 방향</span>')}`; }
/* 맵 편집 한 줄: 왼쪽 [위 줄 + 표 상자], 오른쪽 [위 줄 + 그림 상자 + 아래 글]. 두 상자는 같은 높이 */
const t2Pair = (lt, lbox, rt, rbox, rcap) => `<div class="t2-tr"><div class="t2-col"><div class="t2-top">${lt}</div>${lbox}</div><div class="t2-col"><div class="t2-top">${rt}</div>${rbox}${rcap ? `<div class="t2-fcap muted">${rcap}</div>` : ''}</div></div>`;
function t2SumText(rows, own){ if(!rows.length) return '<span class="wb-err">구간 없음</span>';
  const nc = own ? t2FreeCones().filter(c => c[2]==='C').length : rows.filter(r => r.cone).length, tight = own ? t2SlalomTight(rows) : [];
  return `한 바퀴 <b>${wbFmt(t2Sum(rows.map(r => r.l)), 1)}</b> m · 구간 ${rows.length}개${nc ? ` · 슬라럼 콘 ${nc}개` : ''}${tight.length ? ` · <span class="wb-err">${tight.slice(0, 5).join(', ')}번 구간: 폭이 차 중심 여유 × 2 보다 좁아 콘을 번갈아 비켜 갈 수 없음</span>` : ''}`; }
/* 구간 표. own = 내 코스 (칸을 눌러 고침 · × 지우기 · + 구간 · Ctrl+V 로 여러 칸 붙이기)
   폭 빈칸은 윗 행 값을 흐리게 보여 줌 (첫 행은 늘 적혀 있음) */
function t2TrackTable(rows, own){ const ed = (i, k, v, cls, raw) => own ? `<td class="t2-e${cls ? ' ' + cls : ''}" data-t2e="${i},${k}"${raw!=null ? ` data-t2v="${raw}"` : ''} tabindex="0">${v}</td>` : `<td${cls ? ` class="${cls}"` : ''}>${v}</td>`;
  const W = own ? t2Widths(rows) : rows.map(r => [r.wl, r.wr]), f2 = x => wbFmt(x, 2);
  const wc = (i, k, v, eff) => ed(i, k, isFinite(v) ? f2(v) : `<span class="t2-inh">${f2(eff)}</span>`, 'n', isFinite(v) ? +v : '');
  const body = rows.map((r, i) => `<tr>${ed(i, 'no', i + 1, 'muted')}${ed(i, 'type', r.R ? (r.R > 0 ? '왼쪽' : '오른쪽') : '직선')}${ed(i, 'l', f2(r.l), 'n')}${ed(i, 'R', r.R ? f2(Math.abs(r.R)) : '', 'n')}${ed(i, 'ang', r.R ? wbFmt(r.l/Math.abs(r.R)*180/Math.PI, 1) : '', 'n')}`
    + `${own ? wc(i, 'wl', r.wl, W[i][0]) + wc(i, 'wr', r.wr, W[i][1]) : `<td class="n">${f2(r.wl)}</td><td class="n">${f2(r.wr)}</td>`}`
    + `${own ? ed(i, 'sl', isFinite(r.sl) ? f2(r.sl) : '', 'n', isFinite(r.sl) ? +r.sl : '') : `<td class="n">${r.cone ? '<span class="t2-cdot" title="구간 시작에 가운데 콘"></span>' : ''}</td>`}`
    + `${ed(i, 'note', wbEsc(r.note || ''), 'muted')}${own ? `<td><button type="button" class="t2-x" data-t2del="${i}" aria-label="${i + 1}번 구간 지우기">×</button></td>` : ''}</tr>`).join('');
  return `<table class="t2-tt"><thead><tr><th>#</th><th>종류</th><th>길이 m</th><th>반경 m</th><th>각도 °</th><th title="가운데 선에서 왼쪽 경계까지 (빈칸 = 윗 행 값)">왼쪽 폭 m</th><th title="가운데 선에서 오른쪽 경계까지 (빈칸 = 윗 행 값)">오른쪽 폭 m</th><th title="${own ? '구간 가운데 선 위 콘 간격 (첫 콘 = 시작 + 간격 ÷ 2, 빈칸 = 콘 없음)' : '구간 시작에 가운데 콘'}">${own ? '슬라럼 콘 간격 m' : '슬라럼 콘'}</th><th>메모</th>${own ? '<th></th>' : ''}</tr></thead>
    <tbody>${body || `<tr><td colspan="10" class="muted">구간이 없습니다. [+ 구간] 또는 [코스 입력하기]로 넣으십시오. 엑셀에서 여러 칸을 복사해 이 표에 Ctrl+V 해도 됩니다. 비워 두면 내 코스는 계산하지 않습니다.</td></tr>`}
    ${own ? '<tr class="t2-addr"><td colspan="10"><button type="button" data-t2add>+ 구간 (행)</button></td></tr>' : ''}</tbody></table>
    ${own ? '<p class="muted t2-pvh">엑셀에서 여러 칸을 복사해 표에 Ctrl+V = 표 전체를 바꿈 (양식과 같은 열 순서)</p>' : ''}`; }
const T2HDR = '종류, 길이 m, 반경 m, 왼쪽 폭 m, 오른쪽 폭 m, 슬라럼 콘 간격 m';
const t2RowsText = rows => [T2HDR, ...rows.map(r => { const n = x => isFinite(x) ? String(+(+x).toFixed(4)) : '';
  return [r.R ? (r.R > 0 ? '왼쪽' : '오른쪽') : '직선', n(r.l), r.R ? n(Math.abs(r.R)) : '', n(r.wl), n(r.wr), n(r.sl)].join(', ').replace(/(, )+$/, '') + (r.note ? '  # ' + r.note.replace(/#/g, '') : ''); })].join('\n');
/* 칸 고치기: k = no(번호 → 그 자리로 옮기고 뒤를 밀어냄) · type · l · R · ang(각도 → 길이) · note */
function t2Edit(i, k, v){ const rows = t2Track(T2.free.text).rows, r = rows[i]; if(!r) return; const x = parseFloat(v);
  if(k==='no'){ if(!isFinite(x)) return; const n = Math.max(1, Math.min(rows.length, Math.round(x))); rows.splice(i, 1); rows.splice(n - 1, 0, r); }
  else if(k==='type'){ const R0 = Math.abs(r.R) || 10; r.R = v==='직선' ? 0 : v==='왼쪽' ? R0 : -R0; }
  else if(k==='l'){ if(!(x > 0)) return; r.l = x; }
  else if(k==='R'){ if(!(x > 0) || !r.R) return; r.R = Math.sign(r.R)*x; }
  else if(k==='ang'){ if(!(x > 0) || !r.R) return; r.l = Math.abs(r.R)*x*Math.PI/180; }
  else if(k==='wl' || k==='wr'){ if(String(v).trim()===''){ r[k] = NaN; } else if(x >= 0) r[k] = x; else return; }   // 빈칸 = 윗 행 값
  else if(k==='sl'){ if(String(v).trim()==='' || x===0){ r.sl = NaN; } else if(x > 0) r.sl = x; else return; }   // 빈칸 · 0 = 콘 없음
  else if(k==='note') r.note = String(v).replace(/#/g, '').trim();
  t2SetRows(rows); }
function t2SetRows(rows){ T2.free.text = t2RowsText(rows); t2Repaint(); t2Soon(); }
/* 칸을 누르면 입력칸으로 바뀜 (Enter · 칸 밖 누름 = 반영, Esc = 취소) */
function t2CellOpen(td){ if(td.querySelector('input,select')) return; const [i, k] = td.dataset.t2e.split(','), now = td.textContent.trim(); let f;
  if(k==='type' && !td.dataset.t2g){ f = document.createElement('select'); ['직선', '왼쪽', '오른쪽'].forEach(o => { const op = document.createElement('option'); op.textContent = o; if(o===now) op.selected = true; f.appendChild(op); }); }
  else { f = document.createElement('input'); f.type = k==='note' || td.dataset.t2g ? 'text' : 'number'; f.step = 'any'; f.value = td.dataset.t2v!=null ? td.dataset.t2v : k==='note' || td.dataset.t2g ? now : String(now).replace(/,/g, ''); }
  f.className = 't2-ci'; td.textContent = ''; td.appendChild(f); f.focus(); if(f.select) f.select(); let done = false;
  const was = td.dataset.t2v!=null ? td.dataset.t2v : now;
  const gk = td.dataset.t2g && td.closest('[data-t2gk]') ? td.closest('[data-t2gk]').dataset.t2gk : T2.etab;
  const commit = ok => { if(done) return; done = true; if(ok && f.value!==was){ if(td.dataset.t2g) t2GridEdit(+i, +k, f.value, gk); else t2Edit(+i, k, f.value); } else if(WBGRID[gk]) WBGRID[gk].repaint(); else t2Repaint(); };
  f.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); commit(true); } else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); commit(false); } });
  f.addEventListener('blur', () => commit(true)); if(f.tagName==='SELECT') f.addEventListener('change', () => commit(true)); }

/* ============================================================ 맵 편집: 모터 토크 곡선 · 효율 맵 · 타이어 하중 감도 */
const t2Grid = txt => t2Lines(txt).filter(l => l.cells.length).map(l => l.cells);
const t2GridText = g => g.map(r => r.join(', ')).join('\n');
/* 다른 도구도 2P 칸 표를 그대로 씀 (2026-11-12): WBGRID[k] = {get() 글, set(글), repaint(), head 빈 표 머리 행, map 맵 (첫 행 · 첫 열 머리), rl 행 이름, cl 열 이름, cu 열 단위, parse(글) → {map}, bad 못 읽을 때 글}.
   k 는 'rq:회로:블럭' · 't4:o' 처럼 ':' 가 든 이름 (2P 표 이름과 겹치지 않음) */
const WBGRID = {};
/* 방열 표 요약 글: t2GridParse 는 SOC % · 온도 °C 로 적으므로 코어 풍속 m/s · 냉각수 유량 L/min 으로 바꿈 */
const t2RadMsg = txt => { const m = t2GridParse(txt, 'kW').msg; return m ? m.replace(/SOC ([^,]*?) %/, '코어 풍속 $1 m/s').replace(/(셀 )?온도 ([^,]*?) °C/, '냉각수 유량 $2 L/min') : '비어 있음'; };
const t2MtText = k => WBGRID[k] ? WBGRID[k].get() : k==='mt' ? T2.mtext : T2[k];
/* 표를 처음 채우면 그 표를 쓰도록 [표] 로 (기본은 상수, 2026-11-11) */
const t2UseAuto = (k, had) => { if(k!=='mt' && !had && t2HasMap(k)) T2.use[k] = 'tab'; };
function t2MtSet(k, txt){ if(WBGRID[k]){ WBGRID[k].set(txt); return; } const had = t2HasMap(k); wbSrcDel('2', 't2:' + k); if(k==='mt') T2.mtext = txt; else T2[k] = txt; t2UseAuto(k, had); t2Repaint(); t2Soon(); wbPaint(['in']); }
function t2GridEdit(r, c, v, k = T2.etab){ const g = t2Grid(t2MtText(k)); if(!g[r]) return; g[r][c] = String(v).trim(); t2MtSet(k, t2GridText(g)); }
const T2ERULE = {
  mt:   '1열 회전수 rpm · 2열 피크 토크 · 3열 연속 토크 N·m. 위 [모터 표 기준 전압]에서 잰 곡선을 축전지 단자 전압과 유도 전압 비로 늘이고 줄입니다. 한 열만 있으면 다른 열은 위 [연속 ÷ 피크 토크 비율]로 채웁니다 (100 % = 디레이팅 없음). 디레이팅은 모델 단계에서 모터 열을 켤 때만: 시작 온도에서 피크, 끝 온도부터 연속 토크, 그 사이는 회전수마다 같은 비율로 보간.',
  eM:   '첫 행 = 회전수 rpm, 첫 열 = 토크 N·m, 칸 = 효율 %. 숫자 하나면 상수. 모터 손실(열)은 이 효율로 계산합니다.',
  eI:   '첫 행 = 회전수 rpm, 첫 열 = 토크 N·m, 칸 = 효율 %. 숫자 하나면 상수. 모터 × 인버터 효율을 곱해 쓰므로, 합친 맵을 모터에 넣고 인버터를 100 으로 둬도 같습니다.',
  bO:   '첫 행 = 셀 온도 °C, 첫 열 = SOC %, 칸 = 셀 개방 전압 V. 팩 개방 전압 = 직렬 수 × OCV(SOC, 축전지 온도).',
  bR:   '첫 행 = 셀 온도 °C, 첫 열 = SOC %, 칸 = 셀 내부저항 mΩ. 팩 내부저항 = [팩 내부저항] × R(SOC, 온도) ÷ R(50 %, 25 °C) (표의 모양만 씀, 도구 4 추가 저항까지 같은 배율). 쓰면 축전지 열 모델의 [저항 온도 계수]는 안 씀.',
  eD:   '첫 행 = 모터 회전수 rpm, 첫 열 = 모터 토크 N·m, 칸 = 구동계 효율 % (감속기 · 체인 · 등속 조인트 합). 표 사이는 선형 보간. 기어 손실은 토크에 비례하는 맞물림 손실 + 회전수에 따른 무부하 손실(오일 · 베어링 · 씰)이라 저토크 · 고회전에서 낮아짐.',
  dM:   '한 행에 모터 온도 °C · 디레이팅 % (0 = 피크 토크 곡선 그대로, 100 = 연속 토크 곡선까지 내림). 표 사이 직선, 끝 밖은 끝 값. 데이터시트의 온도별 허용 토크 곡선을 이 비율로 옮겨 넣음.',
  dI:   '한 행에 인버터 온도 °C · 디레이팅 % (0 = 피크 상전류 그대로, 100 = 연속 상전류까지 내림). 표 사이 직선, 끝 밖은 끝 값.',
  bC:   '한 행에 셀 온도 °C · 용량 Ah. SOC 가 줄어드는 양 = 소비 ÷ (직렬 × 병렬 × 용량(랩 시작 축전지 온도) × 공칭 전압). 에너지 상한 [제원 용량]은 위 셀 용량 그대로.',
  ...Object.fromEntries(['rqM', 'rqI', 'rqB'].map(k => [k, '첫 행 = 냉각수 유량 L/min, 첫 열 = 코어 풍속 m/s (주행풍 + 팬 ÷ 코어 앞면 면적), 칸 = 방열량 kW (스펙 시트 값), 위 [표의 입구 온도차] = 그 표를 잰 냉각수 입구 − 공기 입구 온도. 점마다 ε = Q ÷ (C_min × 입구 온도차) → 교차류 ε-NTU 로 UA 를 거꾸로 구해 풍속 · 유량 사이를 이중선형 (범위 밖은 끝값).6.'])),
  tire: '한 행에 바퀴 하나 수직 하중 N · 그때 μ (사이는 직선 보간, 범위 밖은 끝값). 숫자 하나면 하중과 상관없는 μ.' };
/* 맵에 읽을 값이 있는지 (머리 행만 남은 표도 '비어 있음') · 계산에 표를 쓰는지 */
const t2HasMap = k => { const t = t2MtText(k); return k==='mt' ? (P => P.pts.length + P.ptsC.length > 0)(t2MotorParse(t)) : k==='tire' ? !!t2TireParse(t).map : k==='bO' || k==='bR' || T2RAD.includes(k) ? !!t2GridParse(t).map : k==='bC' ? !!t2PairParse(t).map : k==='dM' || k==='dI' ? !!t2DerParse(t).map : !!t2EffParse(t).map; };
const t2UseMap = k => t2HasMap(k) && (k==='mt' || T2.use[k]!=='const');
const t2UseSel = k => k==='mt' || T2.use[k]==='tab' ? 'tab' : 'const';   // 사용자가 고른 쪽 (표가 비어 있어도 [아래 표]면 'tab')   // 모터 토크는 늘 표
const T2MTITLE = {eD:'구동계 효율 맵 — 모터 회전수 × 모터 토크', dM:'모터 디레이팅 표 — 모터 온도별 디레이팅 %', dI:'인버터 디레이팅 표 — 인버터 온도별 디레이팅 %', mt:'모터 토크 곡선 표 — 회전수별 피크 · 연속 토크 (모터 토크는 늘 이 표로 계산)', eM:'모터 효율 맵 — 모터 회전수 × 모터 토크',
                  eI:'인버터 효율 맵 — 모터 회전수 × 모터 토크', tire:'타이어 하중 감도 표 — 바퀴 하중별 μ', bO:'셀 OCV 표 — SOC × 셀 온도',
                  bR:'셀 내부저항 표 — SOC × 셀 온도', bC:'셀 용량 표 — 셀 온도별 용량',
                  ...Object.fromEntries([['rqM', '모터'], ['rqI', '인버터'], ['rqB', '축전지']].map(([k, nm]) => [k, `${nm} 회로 라디 표 — 코어 풍속 × 냉각수 유량별 방열량 (스펙 시트)`]))};
/* 이 표를 계산이 아예 안 쓰는 경우 (다른 선택 때문에): 까닭, 아니면 '' (2026-11-11) — 표 · [아래 표 | 위 상수] 모두 꺼짐, 필수에서도 빠짐 */
function t2MapOff(k){ const I = WB.I, th = t2Th();
  if(k==='eI' && I.eff_mg===1) return '인버터 효율을 모터 맵에 합침';
  if(k==='dM' && !th.m) return '모터 열 끔';
  if(k==='dI' && !th.i) return '인버터 온도 끔';
  if(T2RAD.includes(k)){ const p = {rqM:'m', rqI:'i', rqB:'b'}[k]; if(th.n9) return '냉각 회로 방식'; if(!th.w) return I.cw_on===1 ? '수랭 부품 없음' : '냉각수 온도 끔 (고정)';
    if(!(p==='m' ? th.m && th.mW : p==='i' ? th.iW : th.b && th.bW)) return {m:'모터', i:'인버터', b:'축전지'}[p] + ' 수랭 아님'; }
  return ''; }
function t2MapEdit(k){ const txt = t2MtText(k), has = t2HasMap(k), empty = !t2UseMap(k), off = k!=='mt' ? t2MapOff(k) : '';
  if(off) return `<div class="t2-mth"><b>${T2MTITLE[k].split(' — ')[0]}</b><span class="muted"> — ${T2MTITLE[k].split(' — ')[1]}</span></div><div class="t2-mfold off"><b>표 꺼짐</b><span>${off}</span></div>`;
  const msg = k==='mt' ? t2MotorMsg(t2MotorParse(txt)) : k==='tire' ? (t2TireParse(txt).msg || '비어 있음') : T2RAD.includes(k) ? t2RadMsg(txt) : k==='bO' ? (t2GridParse(txt, 'V').msg || '비어 있음') : k==='bR' ? (t2GridParse(txt, 'mΩ').msg || '비어 있음') : k==='bC' ? (t2PairParse(txt).msg || '비어 있음') : k==='dM' || k==='dI' ? (t2DerParse(txt).msg || '비어 있음') : (t2EffParse(txt).msg || '비어 있음');
  const useSeg = k==='mt' ? '' : `<span class="t2-use"><span class="muted">계산에 쓸 값</span>${t2Seg('data-t2use', t2UseSel(k), [['tab', '아래 표'], ['const', '위 상수']]).replace('<span class="dc-seg"', `<span class="dc-seg" data-t2uk="${k}"`)}</span>`;
  /* 표가 비어 있으면 (위 상수를 씀) 아래 표 · 그림은 접어 둠 (2026-11-11). 모터 토크는 늘 표라 접지 않음 */
  /* [위 상수]를 고르면 아래 표 · 그림은 접음 (값이 있어도), [아래 표]를 고르면 펼침 (비어 있으면 새 파일에서 필수 칸) (2026-11-11) */
  const fold = k!=='mt' && t2UseSel(k)==='const', op = fold && (T2.mopen || {})[k];
  return `<div class="t2-mth"><b>${T2MTITLE[k].split(' — ')[0]}</b>${wbSrcTag('2', 't2:' + k)}<span class="muted"> — ${T2MTITLE[k].split(' — ')[1]}</span>${useSeg}</div>
    ${fold ? `<div class="t2-mfold off" data-t2mf="${k}"><b>표 꺼짐</b><span>${t2ConstNote(k)}</span></div>` : `
    <div class="t2-set"><span class="t2-sum" id="t2msum">${msg}</span></div><p class="t2-rule muted">${T2ERULE[k]}</p>
    ${t2Pair(t2MenuHTML(k, '입력하기', true), `<div class="t2-tw" id="t2tt" data-wbneed="t2:${k}">${t2GridTable(k, txt)}</div>`,
      empty ? `<span class="t2-const">${k==='mt' || t2UseSel(k)==='tab' ? '비어 있음' : t2ConstNote(k)}</span>` : '<span class="muted">그림을 누르면 표에서 그 칸으로 갑니다</span>',
      `<div class="t2-fbox" id="t2mc">${t2EditPlot(k)}</div>`, t2EditCap(k))}`}`; }   /* [위 상수]면 표 · 그림은 아예 안 그림 (열 수도 없음, 2026-11-11) */
document.addEventListener('toggle', e => { const d = e.target; if(!d || !d.matches || !d.matches('details[data-t2mf]')) return; (T2.mopen = T2.mopen || {})[d.dataset.t2mf] = d.open; }, true);
/* 표가 비었을 때 쓰는 상수 */
function t2ConstNote(k){ const I = WB.I;
  if(T2RAD.includes(k)){ const P = {rqM:'cw_', rqI:'i_w', rqB:'b_w'}[k]; return `UA ${wbFmt(I[P + 'ua'], 0)} W/K (코어 풍속 5 m/s) × (풍속 ÷ 5)^0.6`; }
  if(k==='bO') return `셀 ${wbFmt(I.c_vmin, 2)} ~ ${wbFmt(I.c_vmax, 2)} V 직선 (SOC 0 ~ 100 %)`; if(k==='bR') return `팩 내부저항 ${wbFmt(I.r_pack, 0)} mΩ${WB.I.bt_on === 1 ? ` × 온도 계수 ${wbFmt(I.b_alpha, 3)} /°C` : ''}`; if(k==='bC') return `셀 용량 ${wbFmt(I.c_ah, 2)} Ah 일정`; if(k==='eD') return `구동계 효율 ${wbFmt(I.eta_dt, 1)} % 일정`; if(k==='dM') return `모터 ${wbFmt(I.dr_t0, 0)} → ${wbFmt(I.dr_t1, 0)} °C 사이 직선 (피크 → 연속)`; if(k==='dI') return `인버터 ${wbFmt(I.di_t0, 0)} → ${wbFmt(I.di_t1, 0)} °C 사이 직선 (피크 → 연속)`;
  return k==='mt' ? `모터 최대 토크 ${wbFmt(I.tmax, 0)} N·m 일정` : k==='eM' ? `모터 효율 ${wbFmt(I.eta_mot, 1)} %` : k==='eI' ? `인버터 효율 ${wbFmt(I.eta_inv, 1)} %` : `μ ${wbFmt(I.mu, 2)} · 하중 감도 ${wbFmt(I.mu_s, 3)} 1/kN`; }
function t2MotorMsg(M){ const P = M.pts.length ? M.pts : M.ptsC, c = Math.max(1, Math.min(100, WB.I.c_pct || 100)), mx = a => Math.max(...a.map(p => p[1]));
  if(!P.length) return '비어 있음';
  return `${P.length}점 · ${wbFmt(P[0][0], 0)} ~ ${wbFmt(P[P.length-1][0], 0)} rpm · ${M.pts.length ? `피크 ${wbFmt(mx(M.pts), 1)} N·m` : `피크 = 연속 ÷ ${wbFmt(c, 0)} %`} · ${M.ptsC.length ? `연속 ${wbFmt(mx(M.ptsC), 1)} N·m` : `연속 = 피크 × ${wbFmt(c, 0)} %`}`; }
/* 칸 표: 행 지우기 ×(행 끝) · [+ 행](표 아래 한 행) · 맵은 열 지우기 ×(맨 아래 행) · [+ 열](표 오른쪽 한 열) */
function t2GridTable(k, txt){ const O = WBGRID[k], g = t2Grid(txt), rd = !O && T2RAD.includes(k), bm = !O && (k==='bO' || k==='bR'), map = O ? !!O.map : k==='eM' || k==='eI' || k==='eD' || k==='bO' || k==='bR' || rd;
  const rl = O ? O.rl : rd ? '코어 풍속' : bm ? 'SOC' : map ? '토크' : '', cl = O ? O.cl : rd ? '유량' : bm ? '온도' : '회전수', cu = O ? O.cu : rd ? 'L/min' : bm ? '°C' : 'rpm';
  const addRow = n => `<tr class="t2-addr"><td colspan="${n}"><button type="button" data-t2gadd="row">+ 행${rl ? ` (${rl})` : ''}</button></td></tr>`;
  if(!g.length) return `<table class="t2-tt t2-gtab" data-t2gk="${k}"><tbody><tr><td class="t2-empty muted">비어 있습니다. 엑셀 표를 복사해 이 표를 누르고 Ctrl+V, 또는 아래 [+ 행]${O ? '' : ' · [입력하기]의 파일 가져오기'}.</td></tr>${addRow(1)}</tbody></table>`;
  const head = !isFinite(parseFloat(g[0][0])) || (map && g.length > 1), rows = head ? g.slice(1) : g, off = head ? 1 : 0, nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  const cell = (r, c, v, th) => `<${th ? 'th' : 'td'} class="t2-e${c===0 && map && !th ? ' t2-rh' : ''}" data-t2e="${r},${c}" data-t2g="1" tabindex="0">${wbEsc(v ?? '')}</${th ? 'th' : 'td'}>`;
  const nr = (head ? 1 : 0) + rows.length + (map ? 1 : 0);
  const addCol = map ? `<th class="t2-addc" rowspan="${nr}"><button type="button" data-t2gadd="col">+ 열<br><span>(${cl})</span></button></th>` : '';
  const x = (i, lab) => `<td class="t2-xc"><button type="button" class="t2-x" data-t2gdel="${i}" aria-label="${lab} 지우기" title="${lab} 지우기">×</button></td>`;
  // 머리 행도 tbody 안에 둠: [+ 열] 칸의 rowspan 이 행 묶음(thead · tbody)을 넘지 못하므로
  return `<table class="t2-tt t2-gtab${map ? ' map' : ''}" data-t2gk="${k}"><tbody>${head ? `<tr class="t2-hrow">${Array.from({length:nc}, (_, c) => cell(0, c, g[0][c], true)).join('')}<th class="t2-xc"></th>${addCol}</tr>` : ''}
    ${rows.map((r, i) => `<tr data-t2row="${i + off}">${Array.from({length:nc}, (_, c) => cell(i + off, c, r[c])).join('')}${x(i + off, `${i + 1}번 행`)}${!head && i===0 ? addCol : ''}</tr>`).join('')}
    ${map ? `<tr class="t2-delc"><td class="t2-xc"></td>${Array.from({length:nc - 1}, (_, c) => `<td class="t2-xc"><button type="button" class="t2-x" data-t2gdelc="${c + 1}" aria-label="${c + 1}번 열 지우기" title="${c + 1}번 열 (${wbEsc(g[0][c + 1] ?? '')} ${cu}) 지우기">×</button></td>`).join('')}<td class="t2-xc"></td></tr>` : ''}
    ${addRow(nc + 1 + (map ? 1 : 0))}</tbody></table>`; }
/* 빈 표에 [+ 행 · 열]: 머리 행부터 만듦 */
const T2HEAD = {mt:['회전수 rpm', '피크 토크 N·m', '연속 토크 N·m'], tire:['하중 N', 'μ'], bO:['SOC % \\ 셀 온도 °C', '25'], bR:['SOC % \\ 셀 온도 °C', '25'], bC:['셀 온도 °C', '용량 Ah'], eM:['토크 N·m \\ 회전수 rpm', '0'], rqM:['코어 풍속 m/s \\ 유량 L/min', '8'], rqI:['코어 풍속 m/s \\ 유량 L/min', '8'], rqB:['코어 풍속 m/s \\ 유량 L/min', '8'], eI:['토크 N·m \\ 회전수 rpm', '0'], eD:['모터 토크 N·m \\ 모터 회전수 rpm', '0'], dM:['모터 온도 °C', '디레이팅 %'], dI:['인버터 온도 °C', '디레이팅 %']};
function t2GridAdd(k, what){ const g = t2Grid(t2MtText(k)); if(!g.length) g.push((WBGRID[k] ? WBGRID[k].head : T2HEAD[k]).slice());
  const nc = g.reduce((a, r) => Math.max(a, r.length), 0);
  if(what==='col'){ g.forEach(r => { while(r.length < nc) r.push(''); r.push(''); }); }
  else g.push(Array.from({length:nc}, () => ''));
  t2MtSet(k, t2GridText(g)); const tw = $('#t2tt'); if(tw){ if(what==='col') tw.scrollLeft = tw.scrollWidth; else tw.scrollTop = tw.scrollHeight; } }
function t2GridDelCol(k, c){ const g = t2Grid(t2MtText(k)); if(c < 1) return; g.forEach(r => { if(r.length > c) r.splice(c, 1); }); t2MtSet(k, t2GridText(g.filter(r => r.some(v => String(v).trim()!=='')))); }
/* 오른쪽 그림 */
function t2EditPlot(k){ const R = WB.id==='2' ? WB.R : null, I = WB.I;
  if(k==='bO' || k==='bR'){ const M = t2GridParse(t2MtText(k)).map, soc = Array.from({length:21}, (_, i) => i*5);
    if(!M) return `<div class="t2-fconst">${t2ConstNote(k)}</div>`;
    const bl = (Tc, s) => { const f = (a, x) => { if(x <= a[0]) return [0, 0, 0]; const q = a.length - 1; if(x >= a[q]) return [q, q, 0]; let i = 0; while(a[i + 1] < x) i++; return [i, i + 1, (x - a[i])/(a[i + 1] - a[i])]; };
      const [j0, j1, u2] = f(M.n, Tc), [i0, i1, w] = f(M.t, s), e = M.e; return (e[i0][j0]*(1 - u2) + e[i0][j1]*u2)*(1 - w) + (e[i1][j0]*(1 - u2) + e[i1][j1]*u2)*w; };
    return wbPlot({id:'t2bat', w:560, h:330, hit:false, x:{d:soc, n:'SOC', u:'%'}, ys:M.n.slice(0, 6).map((Tc, j) => ({k:'t' + j, d:soc.map(s => bl(Tc, s)), c:WB_COL[j % WB_COL.length], n:`${wbFmt(Tc, 0)} °C`, u:k==='bO' ? 'V' : 'mΩ', dd:k==='bO' ? 3 : 1})), label:T2ET[k]}); }
  if(T2RAD.includes(k)){ const M = t2GridParse(t2MtText(k)).map; if(!M) return `<div class="t2-fconst">${t2ConstNote(k)}</div>`;
    const vs = M.t.length > 1 ? Array.from({length:21}, (_, i) => M.t[0] + (M.t[M.t.length - 1] - M.t[0])*i/20) : M.t, bl = (f, v) => coolBil(M.t, M.n, M.e, v, f);
    return wbPlot({id:'t2rad', w:560, h:330, hit:false, x:{d:vs, n:'코어 풍속', u:'m/s'}, ys:M.n.slice(0, 6).map((f, j) => ({k:'q' + j, d:vs.map(v => bl(f, v)), c:WB_COL[j % WB_COL.length], n:`${wbFmt(f, 1)} L/min`, u:'kW', dd:2})), label:T2ET[k]}); }
  if(k==='dM' || k==='dI'){ const M = t2DerParse(t2MtText(k)).map; if(!M) return `<div class="t2-fconst">${t2ConstNote(k)}</div>`;
    const T = Array.from({length:41}, (_, i) => 20 + i*3), f = x => x <= M.t[0] ? M.r[0] : x >= M.t[M.t.length-1] ? M.r[M.r.length-1] : (j => M.r[j-1] + (M.r[j]-M.r[j-1])*(x-M.t[j-1])/(M.t[j]-M.t[j-1]))(M.t.findIndex(t => t >= x));
    return wbPlot({id:'t2der', w:560, h:330, hit:false, x:{d:T, n:k==='dM' ? '모터 온도' : '인버터 온도', u:'°C'}, ys:[{k:'r', d:T.map(f), c:WB_COL[0], n:'디레이팅 (0 = 피크 · 100 = 연속)', u:'%', dd:0}], label:T2ET[k]}); }
  if(k==='bC'){ const M = t2PairParse(t2MtText(k)).map; if(!M) return `<div class="t2-fconst">${t2ConstNote(k)}</div>`;
    const T = Array.from({length:31}, (_, i) => -10 + i*2); return wbPlot({id:'t2bcap', w:560, h:330, hit:false, x:{d:T, n:'셀 온도', u:'°C'}, ys:[{k:'c', d:T.map(x => tab1j(M, x)), c:WB_COL[0], n:'셀 용량', u:'Ah', dd:2}], label:'셀 용량'}); }
  if(k==='tire'){ const M = t2TireParse(T2.tire).map, Z = t2TireZ(M), mu = Z.map(z => M ? tab1j(M, z) : Math.max(0, I.mu - I.mu_s*z/1000));
    return wbPlot({id:'t2tire', w:560, h:330, hit:'t2-pick', x:{d:Z, n:'바퀴 하나 수직 하중', u:'N'}, ys:[{k:'mu', d:mu, c:WB_COL[0], n:'μ', u:'', dd:2}, {k:'fy', d:Z.map((z, i) => mu[i]*z), c:WB_COL[2], n:'낼 수 있는 힘 μ·Fz', u:'N', dd:0}], label:'타이어 하중 감도'}); }
  if(k==='eM' || k==='eI' || k==='eD'){ const E = t2EffParse(t2MtText(k)); if(!E.map || t2Grid(t2MtText(k)).length < 2) return `<div class="t2-fconst">${E.map ? E.msg : `${k==='eM' ? '모터' : k==='eI' ? '인버터' : '구동계'} 효율 ${wbFmt(I[k==='eM' ? 'eta_mot' : k==='eI' ? 'eta_inv' : 'eta_dt'], 1)} %`}<br><span class="muted">회전수 · 토크와 상관없이 일정</span></div>`;
    return t2Heat(E.map); }
  if(!R || !R.motor) return wbSkel('plot'); const M = R.motor, kw = T => M.n.map((n, i) => T[i]*n*2*Math.PI/60/1000);
  return wbPlot({id:'t2m', w:560, h:330, hit:'t2-pick', x:{d:M.n, n:'모터 회전수', u:'rpm'}, ys:[{k:'a', d:M.tref, c:'#9aa0ab', n:'표 그대로', u:'N·m', dd:0}, {k:'b', d:M.tnom, c:WB_COL[0], n:'축전지 공칭', u:'N·m', dd:0}, {k:'c', d:M.tload, c:WB_COL[3], n:'최대 전류 때', u:'N·m', dd:0},
    {k:'pb', d:kw(M.tnom), c:WB_COL[5], n:'출력 (공칭)', u:'kW', dd:1}, {k:'pc', d:kw(M.tload), c:WB_COL[4], n:'출력 (최대 전류 때)', u:'kW', dd:1}], yn:{'N·m':'모터 최대 토크', 'kW':'모터 출력'}, label:'모터 토크 · 출력 곡선'}); }
/* 하중 감도 그림 가로 범위: 표 끝 하중 · 계산된 바퀴 하중 최댓값 중 큰 값 × 1.1 (계산 전이면 정지 때 바퀴 하중 × 3) */
function t2TireZ(M){ const R = WB.id==='2' ? WB.R : null, S = R && R.sig; let zmax = M ? M[M.length-1][0] : 0, zs = 0;
  if(S) ['fz_fl', 'fz_fr', 'fz_rl', 'fz_rr'].forEach(k => { const a = S[k]; if(a && a.length) for(let i = 0; i < a.length; i++) if(a[i] > zs) zs = a[i]; });
  if(!(zs > 0)) zs = 3*WB.I.m*9.81/4; zmax = Math.max(zmax, zs)*1.1; const st = wbTicks(0, zmax, 6).t, step = (st[1] - st[0])/10 || 50, n = Math.ceil(zmax/step);
  return Array.from({length:n + 1}, (_, i) => +(i*step).toPrecision(10)); }
/* 그림 아래 글 */
function t2EditCap(k){ const R = WB.id==='2' ? WB.R : null, I = WB.I;
  if(k==='mt') return R && R.out ? `<span><i style="background:#9aa0ab"></i>표 그대로 (팀 모터로 ${wbFmt(I.v_ref*(I.ke_ratio || 1), 0)} V 상당)</span> <span><i style="background:${WB_COL[0]}"></i>축전지 공칭 ${wbFmt(I.n_s*I.c_vnom, 0)} V</span> <span><i style="background:${WB_COL[3]}"></i>최대 전류(${wbFmt(I.i_bms_max, 0)} A) 때 단자 전압 ${wbFmt(R.out.v_load, 0)} V</span> <span>실선 토크 · 분홍 · 갈색 출력</span>` : '';
  if(T2BAT.includes(k) || T2RAD.includes(k)) return '';
  if(k==='tire') return `정지 때 바퀴 하나 평균 하중 약 ${wbFmt(I.m*9.81/4, 0)} N. μ·Fz 가 꺾여 내려가면 하중을 더 실어도 그 바퀴 힘이 늘지 않습니다.`;
  const E = t2EffParse(t2MtText(k)); return E.map && t2Grid(t2MtText(k)).length >= 2 ? t2HeatCap(E.map) : ''; }
const tab1j = (t, x) => { if(x <= t[0][0]) return t[0][1]; for(let i = 1; i < t.length; i++) if(x <= t[i][0]){ const a = t[i-1], b = t[i]; return a[1] + (b[1] - a[1])*(x - a[0])/((b[0] - a[0]) || 1); } return t[t.length-1][1]; };
/* 효율 맵 색 지도 (확인용) */
function t2Heat(M){ const W = 560, H = 330, L = 50, B = 34, T = 8, R = 8, pw = W - L - R, ph = H - T - B, n0 = M.n[0], n1 = M.n[M.n.length-1], t0 = M.t[0], t1 = M.t[M.t.length-1];
  const all = M.e.flat(), lo = Math.min(...all), hi = Math.max(...all); let s = `<svg viewBox="0 0 ${W} ${H}" class="t2-heat" role="img" aria-label="효율 맵">`;
  for(let i = 0; i < M.t.length; i++) for(let j = 0; j < M.n.length; j++){ const x0 = L + ((j ? (M.n[j-1] + M.n[j])/2 : n0) - n0)/(n1 - n0)*pw, x1 = L + ((j < M.n.length-1 ? (M.n[j] + M.n[j+1])/2 : n1) - n0)/(n1 - n0)*pw;
    const y1 = T + ph - ((i ? (M.t[i-1] + M.t[i])/2 : t0) - t0)/(t1 - t0)*ph, y0 = T + ph - ((i < M.t.length-1 ? (M.t[i] + M.t[i+1])/2 : t1) - t0)/(t1 - t0)*ph, f = hi > lo ? (M.e[i][j] - lo)/(hi - lo) : .5;
    s += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0 + .5).toFixed(1)}" height="${(y1 - y0 + .5).toFixed(1)}" fill="hsl(${(230 - 230*f).toFixed(0)} 70% ${(55 - 10*f).toFixed(0)}%)" data-ij="${i},${j}"><title>${wbFmt(M.n[j], 0)} rpm · ${wbFmt(M.t[i], 0)} N·m · ${wbFmt(M.e[i][j], 1)} %</title></rect>`; }
  const xt = wbTicksIn(n0, n1, 8).t, yt = wbTicksIn(t0, t1, 6).t, X = n => L + (n - n0)/(n1 - n0)*pw, Y = t => T + ph - (t - t0)/(t1 - t0)*ph;
  s += xt.map(n => `<line x1="${X(n).toFixed(1)}" x2="${X(n).toFixed(1)}" y1="${T}" y2="${T + ph + 4}" class="t2-hg"/><text x="${X(n).toFixed(1)}" y="${T + ph + 15}" class="wb-tx" text-anchor="middle">${wbFmt(n, 0)}</text>`).join('')
     + yt.map(t => `<line x1="${L - 4}" x2="${L + pw}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" class="t2-hg"/><text x="${L - 6}" y="${(Y(t) + 3.5).toFixed(1)}" class="wb-tx" text-anchor="end">${wbFmt(t, 0)}</text>`).join('')
     + `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="t2-hf"/>`;
  s += `<text x="${L + pw/2}" y="${H - 4}" class="wb-tl" text-anchor="middle">모터 회전수 [rpm]</text><text x="12" y="${T + ph/2}" class="wb-tl" text-anchor="middle" transform="rotate(-90 12 ${T + ph/2})">토크 [N·m]</text>`;
  return s + `</svg>`; }
const t2HeatCap = M => { const all = M.e.flat(); return `파랑 ${wbFmt(Math.min(...all), 1)} % → 빨강 ${wbFmt(Math.max(...all), 1)} % · 칸에 마우스를 올리면 값, 누르면 표의 그 칸`; };

/* ============================================================ 시뮬레이션: 결과 아래 [구동력 선도 | 코스 지도] */
const T2ZB = '<span class="t2-zb"><button type="button" class="btn small" data-t2z="in" aria-label="확대">+</button><button type="button" class="btn small" data-t2z="out" aria-label="축소">−</button><button type="button" class="btn small" data-t2z="fit">맞춤</button></span>';
function t2MidHTML(){ if(T2.tab!=='sim') return '';
  return `<div class="t2-mid">
      <section class="wb-sec t2-ftw" aria-label="구동력 선도"><div class="wb-h"><h3>구동력 선도</h3></div>
        <div class="t2-fbox t2-ftbox"><div id="t2ft">${T2.pf.html || wbSkel('plot')}</div><div class="t2-ftov" id="t2ftov" hidden></div></div><div id="t2ftv" class="t2-ftv">${T2.pf.note || ''}</div></section>
      <section class="wb-sec t2-mapw" aria-label="코스 지도"><div class="wb-h"><h3>코스 지도</h3>${T2ZB}</div>
        <div class="t2-fbox" id="t2map" data-zoombox="t2map">${t2MapSVG(false)}</div><div class="t2-ftv muted" id="t2mcap"></div></section></div>`; }

/* ---------- 구동력 선도 프로브: 프로브가 멈추면 그 점의 상태로 선도를 다시 계산 (계산은 별도 Worker) */
T2.pf = { html:'', note:'', timer:0, busy:false, want:null, w:null, src:'' };
function t2PfOverlay(t){ const o = $('#t2ftov'); if(!o) return; o.hidden = !t; o.textContent = t || ''; }
/* 같은 결과 · 같은 프로브 위치를 이미 그렸으면 다시 계산하지 않음 (편집 탭에 갔다가 아무것도 안 바꾸고 돌아올 때) */
function t2PfSoon(){ clearTimeout(T2.pf.timer); if(T2.tab!=='sim') return;
  if(T2.pf.html && T2.pf.lastR===WB.R && T2.pf.lastI===(WB.xi || 0)){ t2PfOverlay(''); return; }
  t2PfOverlay('프로브 이동 중…'); T2.pf.timer = setTimeout(t2PfRun, 400); }
function t2PfRun(){ const R = WB.R, S = R && R.sig; if(!S || !S.v || !S.voc){ t2PfOverlay(''); return; }
  const i = Math.max(0, Math.min(S.v.length - 1, WB.xi || 0)), g = 9.81;
  const st = {i, v:S.v[i], gr:R.out.c_gr, V:S.voc[i], Tm:S.tmot[i], ay:Math.abs(S.ay[i])*g, ax:S.ax[i]*g, axg:S.ax[i], tq:S.tq[i], tlim:S.tlim[i]};
  T2.pf.want = st; if(T2.pf.busy) return; t2PfOverlay('계산 중…');
  const code = wbCode(); if(!T2.pf.w || T2.pf.src!==code){ if(T2.pf.w) T2.pf.w.terminate(); T2.pf.src = code;
    T2.pf.w = new Worker(URL.createObjectURL(new Blob([code + '\n;self.onmessage = e => { try{ postMessage({ok:true, r:calc(e.data)}); }catch(err){ postMessage({ok:false, e:String(err)}); } };'], {type:'text/javascript'}))); }
  T2.pf.busy = true; const ask = T2.pf.want, aR = WB.R, aI = WB.xi || 0;
  T2.pf.w.onmessage = e => { T2.pf.busy = false; if(e.data.ok){ t2PfDraw(ask, e.data.r.ft); T2.pf.lastR = aR; T2.pf.lastI = aI; } if(T2.pf.want!==ask) t2PfRun(); else t2PfOverlay(''); };
  T2.pf.w.postMessage({...wbInputs(), _probe:{gr:st.gr, V:st.V, Tm:st.Tm, ay:st.ay, ax:st.ax}}); }
function t2PfDraw(st, F){ let xi = 0; F.v.forEach((v, j) => { if(Math.abs(v - st.v) < Math.abs(F.v[xi] - st.v)) xi = j; });
  const fm = F.f_m[xi], fx = F.f_x[xi], fr = F.f_res[xi], fb = F.f_b[xi], net = Math.min(fm, fx) - fr, need = F.fy_need[xi], cap = F.fy_cap[xi];
  const lim = fm <= fx ? (F.f_mt[xi] <= F.f_mp[xi] + 1 ? '모터 토크 곡선' : '단자 출력 상한') : '뒤축 접지';
  T2.pf.html = wbPlot({id:'t2pft', w:560, h:330, hit:false, x:{d:F.v, n:'차속', u:'km/h'}, xi, ys:[
      {k:'f_mt', d:F.f_mt, c:WB_COL[0], n:'모터 토크 곡선 한계', u:'N', dd:0}, {k:'f_mp', d:F.f_mp, c:WB_COL[5], n:'단자 출력 상한', u:'N', dd:0},
      {k:'f_x', d:F.f_x, c:WB_COL[3], n:'뒤축 접지 한계', u:'N', dd:0}, {k:'f_b', d:F.f_b, c:WB_COL[1], n:'제동 접지 한계', u:'N', dd:0}, {k:'f_res', d:F.f_res, c:WB_COL[2], n:'주행 저항', u:'N', dd:0}],
    yn:{'N':'바퀴 힘'}, label:'구동력 선도 (코스 프로브 지점)'});
  T2.pf.note = `<div class="wb-leg"><span><i style="background:${WB_COL[0]}"></i>모터 토크 곡선 한계 (디레이팅 포함)</span><span><i style="background:${WB_COL[5]}"></i>단자 출력 상한 (규정 · 전류 · 에너지) × 효율</span><span><i style="background:${WB_COL[3]}"></i>뒤축 접지 한계</span><span><i style="background:${WB_COL[1]}"></i>제동 접지 한계 (−)</span><span><i style="background:${WB_COL[2]}"></i>주행 저항</span></div>
    <p class="t2-cap">프로브 ${wbFmt(WB.R.x.d[st.i], 1)} m · <b>${wbFmt(st.v, 1)} km/h</b>(세로선) · 개방 전압 ${wbFmt(st.V, 1)} V · 모터 ${wbFmt(st.Tm, 1)} °C · 횡가속도 ${wbFmt(st.ay/9.81, 2)} g · 감속비 ${wbFmt(st.gr, 2)}<br>
      구동 min(모터 ${wbFmt(fm, 0)}, 뒤축 ${wbFmt(fx, 0)}) − 저항 ${wbFmt(fr, 0)} = <b>${wbFmt(net, 0)} N</b> (${lim}${/[가-힣]$/.test(lim) && (lim.charCodeAt(lim.length - 1) - 0xAC00) % 28 ? '이' : '가'} 정함) → 가속 여유 ${wbFmt(net/F.meff/9.81, 2)} g · 제동 한계 ${wbFmt(fb, 0)} N<br>
      앞축 횡력 필요 ${wbFmt(need, 0)} N / 낼 수 있는 힘 ${wbFmt(cap, 0)} N${need > cap ? ' <span class="t2-dt bad">앞축 한계 → 가속을 줄임</span>' : ''} · 실제 종가속도 <b>${wbFmt(st.axg, 2)} g</b>${st.axg < -0.02 ? ' (제동 중)' : ''}</p>`;
  const b = $('#t2ft'); if(b) b.innerHTML = T2.pf.html; const n = $('#t2ftv'); if(n) n.innerHTML = T2.pf.note; }

/* ============================================================ 코스 지도 (확대 · 이동 · 프로브) */
function t2Pts(segs, ds, x, y, h){ const X = [x], Y = [y];
  segs.forEach(([l, R]) => { const n = Math.max(1, Math.ceil(l/ds - 1e-9)), st = l/n;
    for(let i = 0; i < n; i++){ if(!R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/R; x += R*(Math.sin(h + dh) - Math.sin(h)); y -= R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } X.push(x); Y.push(y); } });
  return {X, Y, h}; }
function t2Rot(segs, s0){ const len = t2Sum(segs.map(r => r[0])); s0 = ((s0 % len) + len) % len; if(s0 < 1e-9) return segs.slice();
  let c = 0; for(let i = 0; i < segs.length; i++){ const [l, R] = segs[i]; if(s0 < c + l - 1e-9){ const a = s0 - c, head = a > 1e-9 ? [[a, R]] : []; return [[l - a, R], ...segs.slice(i + 1), ...segs.slice(0, i), ...head]; } c += l; } return segs.slice(); }
function t2FreeXY(){ const segs = t2Track(T2.free.text).segs; if(!segs.length) return null; const closed = t2Closed(), s0 = closed ? T2.free.s0 % Math.max(1e-9, t2Sum(segs.map(r => r[0]))) : 0;
  let x = 0, y = 0, h = 0, c = 0; for(const [l, R] of segs){ if(c + l >= s0 - 1e-9){ const P = t2Pts([[s0 - c, R]], 1e9, x, y, h); x = P.X[1] ?? x; y = P.Y[1] ?? y; h = P.h; break; } const P = t2Pts([[l, R]], 1e9, x, y, h); x = P.X[1]; y = P.Y[1]; h = P.h; c += l; }
  return t2Pts(closed ? t2Rot(segs, s0) : segs, 0.5, x, y, h); }
/* 코스 점 (지도 좌표) · 계산 칸과의 대응. plain = 맵 편집 (색 없음 · 확대 없음) */
function t2Geo(c){ let G, close = false, rev = false, extra = [];
  if(c==='ax' || c==='end'){ G = {X:[...FSK26.X, FSK26.X[0]], Y:[...FSK26.Y, FSK26.Y[0]]}; close = true; rev = c==='ax'; }
  else if(c==='free'){ G = t2FreeXY(); close = t2Closed(); }
  else if(c==='acc') G = t2Pts([[75, 0]], 0.5, 0, 0, 0);
  else { const SR = t2SkR(), C2 = 2*Math.PI*SR; G = t2Pts([[15, 0], [C2, -SR], [C2, -SR], [C2, SR], [C2, SR], [15, 0]], 0.5, 0, -15, Math.PI/2);
    /* 두 원 중심은 늘 ±9.125 (규정 배치), 주행 원만 반경 SR (FSAE D.10.1: 안쪽 지름 15.25 · 바깥 21.25 m, 진입 · 탈출 3 m 폭).
       경계선: 안쪽 원 전체 + 바깥 원은 다른 원의 주행로 · 직진로(폭 3 m 전체)에 들어가지 않는 호만 + 진입 · 탈출 직진로 양쪽 선.
       콘: 안쪽 16 · 바깥 13 (그 호 위에 고르게). 오른쪽 원(시계 방향)은 안쪽 = 주행 방향 오른쪽 R, 바깥 = 왼쪽 L; 왼쪽 원(반시계)은 반대.
       직진로 경계와 바깥 원이 만나는 꼭짓점 4곳과 진입 · 탈출 직진로는 작은 주황 (FSG 핸드북 DE7.5.1 "Exit and entry lanes ... small orange cones") (2026-11-11) */
    const RI = 7.625, RO = 10.625, HW = 1.5, CX = 9.125, YV = Math.sqrt(RO*RO - (CX - HW)**2), TV = Math.PI - Math.atan2(YV, CX - HW), pc = 0.15, cones = [];
    const arc = (cx, a0, a1, r, n) => ({pl:Array.from({length:n + 1}, (_, k) => { const a = a0 + (a1 - a0)*k/n; return [cx + r*Math.cos(a), r*Math.sin(a)]; })});
    [1, -1].forEach(sg => { const cx = sg*CX, aOff = sg > 0 ? 0 : Math.PI;   // 왼쪽 원은 각도를 π 돌려 같은 식
      extra.push([cx, 0, RI]); extra.push(arc(cx, aOff - TV, aOff + TV, RO, 120));
      for(let k = 0; k < 16; k++){ const a = aOff + Math.PI + 2*Math.PI*k/16; cones.push([cx + (RI - pc)*Math.cos(a), (RI - pc)*Math.sin(a), sg > 0 ? 'R' : 'L']); }
      for(let k = 0; k < 13; k++){ const a = aOff - TV + 2*TV*(k + 1)/14; cones.push([cx + (RO + pc)*Math.cos(a), (RO + pc)*Math.sin(a), sg > 0 ? 'L' : 'R']); } });
    [-1, 1].forEach(sx => [-1, 1].forEach(sy => { const y0 = sy*YV, y1 = sy*15, n = Math.ceil((15 - YV)/5);
      extra.push({pl:[[sx*HW, y0], [sx*HW, y1]]}); for(let k = 0; k <= n; k++) cones.push([sx*(HW + pc), y0 + (y1 - y0)*k/n, 'O']); }));
    G.cones = cones;
    /* 주행 원 반경이 가운데 (9.125) 와 다르면 두 원을 규정 중심 (±9.125) 으로 옮겨 그림 (진입 · 탈출 직선은 그대로, 이음매는 근사) */
    const dd = 9.125 - SR; if(Math.abs(dd) > 1e-6){ const n0 = Math.ceil(15/0.5 - 1e-9), n = Math.max(1, Math.ceil(C2/0.5 - 1e-9));
      G.X = G.X.map((x, i) => i > n0 && i <= n0 + 2*n ? x + dd : i > n0 + 2*n && i <= n0 + 4*n ? x - dd : x); } }
  return G && {...G, close, rev, extra}; }
const T2MW = 440, T2MH = 330;
/* 내 코스 콘 (지도용): 경계 콘 3 m 간격 (왼쪽 노랑 L · 오른쪽 파랑 R), 슬라럼 콘 (가운데 주황 C). 출발 위치와 상관없이 같은 자리 (코스 원점에서 그림) */
function t2FreeCones(){ const rows = t2Track(T2.free.text).rows; if(!rows.length) return []; const W = t2Widths(rows), out = [];
  let x = 0, y = 0, h = 0, s = 0, nb = 0;
  rows.forEach((r, k) => { const n = Math.max(1, Math.ceil(r.l/0.25)), st = r.l/n, cs = [];
    if(isFinite(r.sl)) for(let p = r.sl/2; p < r.l - 1e-6; p += r.sl) cs.push(p);
    let a = 0, ci = 0;
    const put = (wl, wr, side) => { const nx = -Math.sin(h), ny = Math.cos(h); if(side!=='R') out.push([x + nx*wl, y + ny*wl, 'L']); if(side!=='L') out.push([x - nx*wr, y - ny*wr, 'R']); };
    for(let i = 0; i <= n; i++){
      if(i && i <= n){ if(!r.R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/r.R; x += r.R*(Math.sin(h + dh) - Math.sin(h)); y -= r.R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } a += st; s += st; }
      if(i < n && s >= nb - 1e-9){ put(W[k][0], W[k][1]); nb += 3; }
      while(ci < cs.length && a >= cs[ci] - 1e-9){ out.push([x, y, 'C']); ci++; } } });
  return out; }
/* 코스 폭 경계 (지도 칠하기용): 왼쪽 · 오른쪽 경계 점 [[x, y]] (m). 공식 코스 = 실제 콘으로 잡은 폭 (t2ConeBounds), 내 코스 = 행마다 폭 (0.5 m 간격) */
function t2Bounds(c){
  if(c==='end' || c==='ax'){ const X = FSK26.X, Y = FSK26.Y, N = X.length, B = t2ConeBounds(), Lp = [], Rp = [];
    for(let i = 0; i < N; i++){ const a = (i - 1 + N) % N, b = (i + 1) % N, dx = X[b] - X[a], dy = Y[b] - Y[a], d = Math.hypot(dx, dy) || 1, nx = -dy/d, ny = dx/d;
      Lp.push([X[i] + nx*B.WL[i], Y[i] + ny*B.WL[i]]); Rp.push([X[i] - nx*B.WR[i], Y[i] - ny*B.WR[i]]); }
    return {L:Lp, R:Rp, close:true}; }
  if(c==='free'){ const rows = t2Track(T2.free.text).rows; if(!rows.length) return null; const W = t2Widths(rows), Lp = [], Rp = [];
    let x = 0, y = 0, h = 0;
    rows.forEach((r, k) => { const n = Math.max(1, Math.ceil(r.l/0.5)), st = r.l/n;
      for(let i = 0; i <= n; i++){
        if(i){ if(!r.R){ x += st*Math.cos(h); y += st*Math.sin(h); } else { const dh = st/r.R; x += r.R*(Math.sin(h + dh) - Math.sin(h)); y -= r.R*(Math.cos(h + dh) - Math.cos(h)); h += dh; } }
        if(i < n || k === rows.length - 1){ const nx = -Math.sin(h), ny = Math.cos(h); Lp.push([x + nx*W[k][0], y + ny*W[k][0]]); Rp.push([x - nx*W[k][1], y - ny*W[k][1]]); } } });
    return {L:Lp, R:Rp, close:t2Closed()}; }
  return null; }
/* 슬라럼 콘 자리에서 비켜 갈 폭이 모자란 곳 (양쪽 모두 폭 ≥ 2 × 차 중심 여유 여야 번갈아 비켜 감) */
function t2SlalomTight(rows){ const I = WB.I, b = I.w_car/2 + Math.max(0, I.rl_m || 0),   /* 차 크기는 항상 고려 */ W = t2Widths(rows);
  return rows.map((r, i) => isFinite(r.sl) && (W[i][0] < 2*b - 1e-9 || W[i][1] < 2*b - 1e-9) ? i + 1 : 0).filter(Boolean); }
/* 내 코스 표에 Ctrl+V: 엑셀에서 복사한 여러 칸(탭 · 줄바꿈)이면 표 전체를 바꿈. 첫 행에 열 이름이 있으면 그 이름으로, 없으면 양식 열 순서로 읽음 */
/* 표에 Ctrl+V (모터 · 효율 · 타이어 · 셀 표): 엑셀 여러 칸이면 표 전체를 바꿈 (한 칸이면 그 칸 입력에 그대로). 붙여넣기 창은 없음 (48차 · 내 코스와 같게) */
function t2ApplyText(k, v){ if(WBGRID[k]){ if(!WBGRID[k].parse(v).map){ toast(WBGRID[k].bad || '표를 읽지 못했습니다.'); return false; } WBGRID[k].set(v); return true; } const had0 = t2HasMap(k);
  if(k==='mt'){ if(!t2MotorParse(v).pts.length){ toast('회전수 · 토크 행을 읽지 못했습니다.'); return false; } T2.mtext = v; }
  else if(k==='tire'){ if(!t2TireParse(v).map){ toast('하중 · μ 행을 읽지 못했습니다.'); return false; } T2.tire = v; }
  else if(k==='bO' || k==='bR'){ if(!t2GridParse(v).map){ toast('표를 읽지 못했습니다. 첫 행 = 셀 온도 °C, 첫 열 = SOC %.'); return false; } T2[k] = v; }
  else if(T2RAD.includes(k)){ if(!t2GridParse(v).map){ toast('표를 읽지 못했습니다. 첫 행 = 냉각수 유량 L/min, 첫 열 = 코어 풍속 m/s, 칸 = 방열량 kW.'); return false; } T2[k] = v; }
  else if(k==='bC'){ if(!t2PairParse(v).map){ toast('온도 · 용량 행을 읽지 못했습니다.'); return false; } T2.bC = v; }
  else if(k==='dM' || k==='dI'){ if(!t2DerParse(v).map){ toast('온도 · 디레이팅 % 행을 읽지 못했습니다.'); return false; } T2[k] = v; }
  else if(k==='eM' || k==='eI' || k==='eD'){ if(!t2EffParse(v).map){ toast('효율을 읽지 못했습니다. 숫자 하나 또는 맵(첫 행 회전수, 첫 열 토크)이어야 합니다.'); return false; } T2[k] = v; }
  else return false;
  t2UseAuto(k, had0); wbSrcDel('2', 't2:' + k); t2Save(); t2Repaint(); t2Soon(); wbPaint(['in']); return true; }
document.addEventListener('paste', e => { if(WB.id!=='2' || T2.tab!=='edit' || !e.target.closest) return; const tb = e.target.closest('[data-t2gk]'); if(!tb || WBGRID[tb.dataset.t2gk]) return;
  const txt = (e.clipboardData && e.clipboardData.getData('text/plain')) || ''; if(!/[\t\n]/.test(txt.trim())) return;   // 한 칸 붙이기는 그 칸 입력에 그대로
  e.preventDefault(); const v = txt.replace(/\r/g, '').split('\n').filter(l => l.trim()).map(l => l.split('\t').map(c => c.trim()).join(', ')).join('\n');
  if(t2ApplyText(tb.dataset.t2gk, v)) toast(`붙인 내용으로 ${T2ET[tb.dataset.t2gk] || '표'}를 바꿨습니다 (표 전체).`); });
document.addEventListener('paste', e => { if(WB.id!=='2' || T2.tab!=='edit' || T2.etab!=='course' || T2.ecourse!=='free') return;
  const tw = e.target.closest && e.target.closest('#t2tt'); if(!tw) return; const txt = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
  if(!/[\t\n]/.test(txt.trim())) return;                       // 한 칸 붙이기는 그 칸 입력에 그대로
  e.preventDefault(); const lines = txt.replace(/\r/g, '').split('\n').filter(l => l.trim()).map(l => l.split('\t').map(c => c.trim()).join(', '));
  const first = (lines[0] || '').split(', '), head = t2HeadMap(first), legacy = !head && isFinite(parseFloat(first[0]));
  const P = t2Track((head || legacy ? '' : T2HDR + ', 메모\n') + lines.join('\n'));
  if(!P.rows.length){ toast('붙인 내용에서 구간을 찾지 못했습니다. 양식과 같은 열 순서(종류 · 길이 · 반경 · 왼쪽 폭 · 오른쪽 폭 · 슬라럼 콘 간격 · 메모)로 복사해 주십시오.'); return; }
  T2.free.text = t2RowsText(P.rows); t2Repaint(); t2Soon(); toast(`붙인 내용으로 구간 ${P.rows.length}개를 넣었습니다 (표 전체를 바꿈)${P.bad.length ? ` · ${P.bad.length}행은 숫자가 없어 건너뜀` : ''}`); });
/* 가운데 선 점 → 옆으로 e 만큼 (코스 원래 방향의 왼쪽 +). rl = {s: 가운데 선 거리 [m], e: 옆 거리 [m]} (계산 결과) */
function t2Offset(X, Y, rl){ const n = X.length, S = [0]; for(let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]));
  const f = rl.s.at(-1) / (S[n - 1] || 1), eAt = s => { const a = rl.s; let lo = 0, hi = a.length - 1; if(s <= a[0]) return rl.e[0]; if(s >= a[hi]) return rl.e[hi];
    while(hi - lo > 1){ const m = (lo + hi) >> 1; if(a[m] <= s) lo = m; else hi = m; } const t = (s - a[lo]) / ((a[hi] - a[lo]) || 1); return rl.e[lo] + t*(rl.e[hi] - rl.e[lo]); };
  const OX = [], OY = [];
  for(let i = 0; i < n; i++){ const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = X[b] - X[a], dy = Y[b] - Y[a], d = Math.hypot(dx, dy) || 1, e = eAt(S[i]*f);
    OX.push(X[i] - dy/d*e); OY.push(Y[i] + dx/d*e); }   // 왼쪽 법선 = (−ty, tx)
  return {X:OX, Y:OY}; }
function t2MapSVG(plain){ const c = plain ? T2.ecourse : T2.course, R = WB.id==='2' && !plain ? WB.R : null, mp = R && R.map, G = t2Geo(c); if(!G) return '<p class="muted">구간이 없습니다.</p>';
  const {X:xc, Y:yc, close, rev} = G, N = xc.length, pad = 22, W = T2MW, H = T2MH;
  const RLp = mp && mp.rl ? t2Offset(xc, yc, mp.rl) : null, xs = RLp ? RLp.X : xc, ys = RLp ? RLp.Y : yc;   // 주행선이 있으면 그 선을 칠함 (가운데 선은 점선)
  const x0 = Math.min(...xc) - (c==='skid' ? 3 : 0), x1 = Math.max(...xc) + (c==='skid' ? 3 : 0), y0 = Math.min(...yc), y1 = Math.max(...yc);
  const s = Math.min((W - 2*pad)/Math.max(1, x1 - x0), (H - 2*pad)/Math.max(1, y1 - y0)), ox = (W - (x1 - x0)*s)/2, oy = (H - (y1 - y0)*s)/2;
  const tx = x => ox + (x - x0)*s, ty = y => H - oy - (y - y0)*s, Pt = i => [tx(xs[i]), ty(ys[i])];
  T2[plain ? 'mpE' : 'mp'] = {N, pts:xs.map((_, i) => Pt(i))};   // 누르기 → 가장 가까운 점
  const Z = plain ? T2.zoomE : T2.zoom, vw = W/Z.k, vh = H/Z.k, vx = Z.cx*W - vw/2, vy = Z.cy*H - vh/2, sz = 1/Z.k;   // 확대 = viewBox 를 줄임 (선 굵기는 그대로)
  let svg = `<svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" class="t2-msvg${plain ? '' : ' live'}" role="img" aria-label="${T2CN[c]} 코스 지도">`;
  G.extra.forEach(e => { if(e.pl){ svg += `<polyline points="${e.pl.map(([x, y]) => `${tx(x).toFixed(1)},${ty(y).toFixed(1)}`).join(' ')}" class="t2-sk" vector-effect="non-scaling-stroke"/>`; return; } const [cx, cy, rr] = e; svg += `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="${(rr*s).toFixed(1)}" class="t2-sk" vector-effect="non-scaling-stroke"/>`; });
  const cones = c==='ax' || c==='end' ? FSK26.cones || [] : c==='free' ? t2FreeCones() : c==='skid' ? G.cones || [] : [];
  const cone = ([cx, cy, sd]) => `<circle cx="${tx(cx).toFixed(1)}" cy="${ty(cy).toFixed(1)}" r="${((sd==='C' ? 2.2 : 1.6)*Math.max(sz, .35)).toFixed(2)}" class="t2-cone ${sd}"/>`;
  if(plain){ const BD = t2Bounds(c); if(BD){ const pts = A => A.map(([x, y]) => `${tx(x).toFixed(1)},${ty(y).toFixed(1)}`).join(' L');   // 편집 탭: 좌우 경계 안을 반투명 어두운 색으로
    svg += BD.close ? `<path d="M${pts(BD.L)}Z M${pts(BD.R)}Z" class="t2-corr" fill-rule="evenodd"/>` : `<path d="M${pts(BD.L)} L${pts(BD.R.slice().reverse())}Z" class="t2-corr"/>`; } }
  cones.forEach(q => { if(q[2]!=='C') svg += cone(q); });                     // 경계 콘은 선 아래, 슬라럼 콘(가운데)은 선 위에 (아래 '출발선' 앞에서)
  if(!plain && R && WB.I.w_car > 0) svg += t2Sweep(xs, ys, close, rev, tx, ty);   // 차가 지나간 영역 (반투명 회색)
  if(RLp) svg += `<polyline points="${xc.map((_, i) => [tx(xc[i]), ty(yc[i])].map(v => v.toFixed(1)).join(',')).join(' ')}" class="t2-cl" vector-effect="non-scaling-stroke"/>`;
  let vc = null, P = 0; if(mp){ vc = mp.vc || (mp.acc || mp.skid ? R.sig.v : null); P = mp.P || 0; }
  const leg = '<span class="t2-mleg"><i class="sl"></i>출발 <i class="fin"></i>결승 <i class="arr">→</i>주행 방향</span>'; let cap = '';
  if(vc){ const lo = isFinite(mp.lo) ? mp.lo : Math.min(...vc.filter(isFinite)), hi = isFinite(mp.hi) ? mp.hi : Math.max(...vc.filter(isFinite)), st = Math.max(1, Math.floor(N/900));
    for(let i = 0; i + st < N; i += st){ const kk = rev ? N - 1 - i : i, k = vc.length===N ? kk : Math.min(vc.length - 1, Math.round(kk*(vc.length - 1)/(N - 1))), vi = vc[k], f = hi > lo && isFinite(vi) ? Math.max(0, Math.min(1, (vi - lo)/(hi - lo))) : .5, a = Pt(i), b = Pt(Math.min(N - 1, i + st));
      svg += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="hsl(${(230 - 230*f).toFixed(0)} 75% 45%)" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`; }
    const lp = T2.lap[c], multi = t2LapsOf(c) > 1; cap = `느림 ${wbFmt(lo, 0)} km/h <i class="t2-grad"></i> 빠름 ${wbFmt(hi, 0)} km/h${multi ? ` (모든 랩 통틀어) · ${lp==='all' ? '2번째' : lp + '번째'} 랩` : ''} · 작은 점 = 프로브 ${leg}`; }
  else { svg += `<polyline points="${xs.map((_, i) => Pt(i).map(v => v.toFixed(1)).join(',')).join(' ')}" class="t2-line" vector-effect="non-scaling-stroke"/>`; cap = (plain || R ? '' : '계산이 끝나면 차속 색으로 칠합니다. ') + leg; }
  if(mp && mp.rbad && mp.rbad.length && RLp){   // 최소 회전 반경보다 급한 곳: 빨간 굵은 테두리
    const S0 = [0]; for(let i = 1; i < N; i++) S0.push(S0[i - 1] + Math.hypot(xc[i] - xc[i - 1], yc[i] - yc[i - 1])); const f = mp.rl.s.at(-1)/(S0[N - 1] || 1);
    const bad = i => { const s = S0[i]*f; return mp.rbad.some(([a, b]) => s >= a - 0.5 && s <= b + 0.5); };
    for(let i = 0; i + 1 < N; i++) if(bad(i) || bad(i + 1)){ const a = Pt(i), b = Pt(i + 1); svg += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" class="t2-rbad" vector-effect="non-scaling-stroke"/>`; }
    cap += ' · <span class="t2-rbadl">빨간 테두리 = 최소 회전 반경보다 급한 곳</span>'; }
  if(!plain && R && WB.I.w_car > 0) cap += ' · <span class="t2-swl"><i></i>차가 지나간 영역 (전폭 · 전장 · 저속 차체 각도)</span>';
  if(!plain) setTimeout(() => { const cp = $('#t2mcap'); if(cp) cp.innerHTML = cap; }, 0);
  cones.forEach(q => { if(q[2]==='C') svg += cone(q); });
  /* 출발선(초록) = 주행 방향 오른쪽 절반, 결승선(빨강) = 왼쪽 절반 → 같은 자리여도 겹치지 않음. 화살표는 출발선 끝에서 코스와 나란히 */
  const ix = i => close ? ((Math.round(i) % (N - 1)) + (N - 1)) % (N - 1) : Math.max(0, Math.min(N - 1, Math.round(i)));
  const q = 10*Math.max(sz, .3), i0 = rev ? N - 1 : 0, dir = rev ? -1 : 1, step = Math.max(2, Math.round(N/150));
  const dirAt = i => { const a = Pt(ix(i)), b = Pt(ix(i + dir*step)), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return {a, ux:dx/d, uy:dy/d, rx:-dy/d, ry:dx/d}; };   // 화면 좌표(y 아래)에서 오른쪽 = (−uy, ux)
  const half = (i, cls, side) => { const D = dirAt(i); return `<line x1="${D.a[0].toFixed(1)}" y1="${D.a[1].toFixed(1)}" x2="${(D.a[0] + side*D.rx*q).toFixed(1)}" y2="${(D.a[1] + side*D.ry*q).toFixed(1)}" class="${cls}" vector-effect="non-scaling-stroke"/>`; };
  /* 스키드패드: 출발 위치 = 진입 직진로 시작 (정지 출발, 화살표), 두 원 중심을 잇는 선 = 계측선 (출발선 · 결승선, FSAE D.10.1.3b) */
  const iS = c==='skid' ? Math.round(15/0.5) : i0, iF = c==='skid' ? Math.round(15/0.5) : close ? i0 : (rev ? 0 : N - 1);
  if(c==='skid'){ const hl = (y, cls) => `<line x1="${tx(-1.5).toFixed(1)}" y1="${ty(y).toFixed(1)}" x2="${tx(1.5).toFixed(1)}" y2="${ty(y).toFixed(1)}" class="${cls}" vector-effect="non-scaling-stroke"/>`;
    svg += hl(-15, 't2-sl') + hl(15, 't2-fin'); }   /* 스키드패드: 출발(초록) = 진입 직진로 시작, 종점(빨강) = 네 바퀴 뒤 탈출 직진로 끝, 둘 다 직진로 폭 3 m 가로 (2026-11-11) */
  else svg += half(iS, 't2-sl', 1) + half(iF, 't2-fin', -1);
  { const D = dirAt(c==='skid' ? i0 : iS), ox = D.a[0] + D.rx*q, oy = D.a[1] + D.ry*q, L = 2.2*q, ex = ox + D.ux*L, ey = oy + D.uy*L, ang = Math.atan2(D.uy, D.ux)*180/Math.PI;
    svg += `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" class="t2-arrl" vector-effect="non-scaling-stroke"/><path d="M-6,-4 L0,0 L-6,4" class="t2-arrh" vector-effect="non-scaling-stroke" transform="translate(${ex.toFixed(1)},${ey.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${Math.max(sz, .35).toFixed(2)})"/>`; }
  /* 프로브: 신호 그래프의 거리 위치 (여러 랩이면 한 랩 안의 위치) */
  if(R && R.x && WB.xi != null){ const k = t2SigToMap(WB.xi, N, P), q = Pt(k); svg += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(4*Math.max(sz, .35)).toFixed(2)}" class="t2-cur" vector-effect="non-scaling-stroke"/>`; }
  return svg + '</svg>'; }
/* 차가 지나간 영역: 지도 선(차 중심 경로, m) 점마다 차 사각형 (뒤 끝 ~ 앞 끝 × 전폭). 차체 방향 = 진행 방향 − β,  β = atan(l_r · κ) (저속 기구학 선회)
   κ = 세 점 곡률을 앞뒤 2 점씩 평균.  거꾸로 달리는 코스(오토크로스)는 진행 방향 · 곡률 부호를 뒤집음.  묶음 전체에 투명도를 한 번 걸어 겹친 곳도 같은 진하기 */
function t2Sweep(xs, ys, close, rev, tx, ty){ const I = WB.I, L = I.L/1000, lr = L*I.fr/100, xf = (L - lr) + Math.max(0, I.oh_f || 0), xr = lr + Math.max(0, I.oh_r || 0), hw = I.w_car/2;
  const N = xs.length, m = close ? N - 1 : N, ix = i => close ? ((i % m) + m) % m : Math.max(0, Math.min(N - 1, i)), dir = rev ? -1 : 1;
  const k3 = i => { const a = ix(i - 1), b = ix(i), c = ix(i + 1), x0 = xs[a], y0 = ys[a], x1 = xs[b], y1 = ys[b], x2 = xs[c], y2 = ys[c];
    const d = Math.hypot(x1 - x0, y1 - y0)*Math.hypot(x2 - x1, y2 - y1)*Math.hypot(x2 - x0, y2 - y0); return d > 1e-9 ? 2*((x1 - x0)*(y2 - y0) - (y1 - y0)*(x2 - x0))/d : 0; };
  const kr = Array.from({length:N}, (_, i) => k3(i)), K = i => { let s = 0, n = 0; for(let d = -2; d <= 2; d++){ const j = ix(i + d); s += kr[j]; n++; } return s/n; };
  const sb = (WB.I.md || 0) >= 2 && WB.R && WB.R.sig && WB.R.sig.beta && WB.R.sig.beta.some(Number.isFinite) ? WB.R.sig.beta : null;
  let g = '<g class="t2-sweep">';
  for(let i = 0; i < m; i++){ const a = ix(i - 1), b = ix(i + 1); let ux = (xs[b] - xs[a])*dir, uy = (ys[b] - ys[a])*dir; const u = Math.hypot(ux, uy) || 1; ux /= u; uy /= u;
    const bs = sb ? sb[t2MapToSig(i)] : NaN, beta = Number.isFinite(bs) ? bs*Math.PI/180 : Math.atan(lr*K(i)*dir), th = Math.atan2(uy, ux) - beta, c = Math.cos(th), s = Math.sin(th);   // 차체 각도: 모델 2 이상은 계산한 값 (슬립각 포함), 아니면 저속 기구학
    const P = [[xf, hw], [xf, -hw], [-xr, -hw], [-xr, hw]].map(([x, y]) => `${tx(xs[i] + c*x - s*y).toFixed(1)},${ty(ys[i] + s*x + c*y).toFixed(1)}`);
    g += `<polygon points="${P.join(' ')}"/>`; }
  return g + '</g>'; }
/* 신호 칸 ↔ 지도 점: 공식 코스는 지도 점(대회 JSON)과 계산 칸 수가 달라 거리 비율로 맞춤, 오토크로스는 반대 방향 */
function t2SigToMap(xi, N, P){ const c = T2.course; let k = xi;
  if(P){ k = xi % P === 0 && xi ? P : xi % P; if(c==='end' || c==='ax'){ k = Math.round(k*(N - 1)/P); if(c==='ax') k = N - 1 - k; } }
  return Math.max(0, Math.min(N - 1, k)); }
function t2MapToSig(i){ const R = WB.R, mp = R && R.map, c = T2.course; if(!R || !R.x || !T2.mp) return null; const N = T2.mp.N, P = mp && mp.P || 0, n = R.x.d.length;
  if(!P) return Math.min(n - 1, i);
  let k = c==='end' || c==='ax' ? Math.round((c==='ax' ? N - 1 - i : i)*P/(N - 1)) : i; const base = Math.floor((WB.xi || 0)/P)*P;
  return Math.max(0, Math.min(n - 1, (n - 1 > P ? base : 0) + Math.min(P, k))); }
function t2MapRepaint(){ const m = $('#t2map'); if(m) m.innerHTML = t2MapSVG(false); }
function t2EMapRepaint(){ const m = $('#t2emap'); if(m) m.innerHTML = t2MapSVG(true); }
/* 지도 두 개: 시뮬레이션 (#t2map, T2.zoom) · 편집 코스 (#t2emap, T2.zoomE)
   휠 확대 = 박스를 한 번 눌러 켠 뒤에만 (wbZoomOn, 스크롤하다 박스 위를 지나가도 확대되지 않게)
   왼쪽 누르기 · 끌기 = 프로브 (시뮬레이션) · 표의 그 구간 (편집), 휠 버튼 끌기 = 이동 (포인터를 박스에 잡아 둠) */
const t2MapOf = el => { const box = el && el.closest && el.closest('#t2map, #t2emap'); return box ? {box, edit:box.id==='t2emap'} : null; };
function t2SvgPt(svg, e){ const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function t2ZoomAt(f, px, py, edit){ const Z = edit ? T2.zoomE : T2.zoom, k = Math.max(1, Math.min(40, Z.k*f)); if(px != null){ const a = px/T2MW, b = py/T2MH; Z.cx = a - (a - Z.cx)*Z.k/k; Z.cy = b - (b - Z.cy)*Z.k/k; } Z.k = k;
  if(k===1){ Z.cx = .5; Z.cy = .5; } const h = .5/k; Z.cx = Math.max(h, Math.min(1 - h, Z.cx)); Z.cy = Math.max(h, Math.min(1 - h, Z.cy)); edit ? t2EMapRepaint() : t2MapRepaint(); }
document.addEventListener('wheel', e => { const M = t2MapOf(e.target); if(!M || !wbZoomOn(M.box)) return; const svg = M.box.querySelector('svg'); if(!svg) return;
  e.preventDefault(); const p = t2SvgPt(svg, e); t2ZoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y, M.edit); }, {passive:false});
/* 왼쪽 = 프로브 (누른 채 끌면 계속 따라감, 신호 그래프와 같음) · 휠 버튼 끌기 = 화면 이동 (냉각 편집기와 같음, 2026-11-10) */
let T2DRAG = null;
const t2MapProbe = (box, edit, e) => { const svg = box.querySelector('svg'), M = edit ? T2.mpE : T2.mp; if(!svg || !M) return;
  const p = t2SvgPt(svg, e); let bi = 0, bd = Infinity; M.pts.forEach(([x, y], i) => { const dd = (x - p.x)**2 + (y - p.y)**2; if(dd < bd){ bd = dd; bi = i; } });
  if(edit){ const r = t2PtToRow(bi); if(r >= 0) t2Hl($(`#t2tt tbody tr:nth-child(${r + 1})`)); }
  else { const xi = t2MapToSig(bi); if(xi != null) wbCursor('sig', xi); } };
document.addEventListener('mousedown', e => { if(e.button===1 && t2MapOf(e.target)) e.preventDefault(); });   // 휠 버튼 자동 스크롤 막기
document.addEventListener('pointerdown', e => { const M = t2MapOf(e.target); if(!M || (e.button!==0 && e.button!==1) || e.target.closest('button')) return; const svg = M.box.querySelector('svg'); if(!svg) return;
  e.preventDefault();   // 끌기 중 글자 선택 막음
  const Z = M.edit ? T2.zoomE : T2.zoom; try{ M.box.setPointerCapture(e.pointerId); }catch(err){}
  document.body.classList.add('wb-dragging'); T2DRAG = {box:M.box, edit:M.edit, id:e.pointerId, pan:e.button===1, x:e.clientX, y:e.clientY, cx:Z.cx, cy:Z.cy, w:svg.getBoundingClientRect().width};
  if(!T2DRAG.pan) t2MapProbe(M.box, M.edit, e); });
document.addEventListener('pointermove', e => { const d = T2DRAG; if(!d) return; e.preventDefault();
  if(!d.pan){ if(!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; if(T2DRAG===d) t2MapProbe(d.box, d.edit, d.ev); }); d.ev = e; return; }
  const dx = e.clientX - d.x, dy = e.clientY - d.y, Z = d.edit ? T2.zoomE : T2.zoom, f = 1/(d.w*Z.k), h = .5/Z.k; Z.cx = Math.max(h, Math.min(1 - h, d.cx - dx*f)); Z.cy = Math.max(h, Math.min(1 - h, d.cy - dy*f*T2MW/T2MH)); d.edit ? t2EMapRepaint() : t2MapRepaint(); });
const t2DragEnd = e => { const d = T2DRAG; T2DRAG = null; document.body.classList.remove('wb-dragging'); if(!d) return; try{ d.box.releasePointerCapture(d.id); }catch(err){} };
document.addEventListener('pointerup', t2DragEnd); document.addEventListener('pointercancel', t2DragEnd);

/* ============================================================ 그림 → 표 칸 찾기 (그림에서 튀는 곳을 누르면 표의 그 칸으로) */
function t2Hl(el){ document.querySelectorAll('#t2tt .t2-hl').forEach(x => x.classList.remove('t2-hl')); if(!el) return; el.classList.add('t2-hl');
  const tw = $('#t2tt'); if(!tw) return; const a = tw.getBoundingClientRect(), b = el.getBoundingClientRect();
  tw.scrollTop += (b.top - a.top) - (a.height - b.height)/2; tw.scrollLeft += (b.left - a.left) - (a.width - b.width)/2; }
/* 코스 그림의 점 i → 표의 구간 행 (표 순서 = 달리는 순서) */
function t2PtToRow(i){ const c = T2.ecourse, rows = t2CourseRows(c), M = T2.mpE; if(!rows.length || !M) return -1; let s;
  if(c==='end' || c==='ax'){ const fr = i/(M.N - 1), len = t2Sum(rows.map(r => r.l)); s = (c==='ax' ? 1 - fr : fr)*len; }
  else { s = i*0.5; if(c==='free' && t2Closed()){ const len = t2Sum(rows.map(r => r.l)); s = (s + T2.free.s0) % len; } }
  let a = 0; for(let r = 0; r < rows.length; r++){ a += rows[r].l; if(s < a) return r; } return rows.length - 1; }
function t2PickX(svg, e){ const hit = svg.querySelector('.t2-pick'); if(!hit) return NaN; const rc = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (e.clientX - rc.left)/rc.width*vb.width;
  return +hit.dataset.wbx0 + (px - +hit.dataset.wbl)/(+hit.dataset.wbw)*(+hit.dataset.wbx1 - +hit.dataset.wbx0); }
document.addEventListener('click', e => { const t = e.target; if(!t.closest || !t.closest('#wbext .t2-fbox')) return; { const gt = t.closest('[data-t2gk]'); if(gt && WBGRID[gt.dataset.t2gk]) return; }   /* 다른 도구 표는 아래 공통 처리 */
  const rc = t.closest('#t2mc rect[data-ij]'); if(rc){ const [i, j] = rc.dataset.ij.split(',').map(Number); t2Hl($(`#t2tt [data-t2e="${i + 1},${j + 1}"]`)); return; }
  const sv = t.closest('#t2mc svg'); if(sv && sv.querySelector('.t2-pick')){ const x = t2PickX(sv, e), g = t2Grid(t2MtText(T2.etab)); let best = -1;
    g.forEach((r, i) => { const v = parseFloat(r[0]); if(isFinite(v) && (best < 0 || Math.abs(v - x) < Math.abs(parseFloat(g[best][0]) - x))) best = i; });
    if(best >= 0) t2Hl($(`#t2tt tr[data-t2row="${best}"]`)); } });

/* ============================================================ 고치기 · 이벤트 */
function t2Soon(){ t2Save(); clearTimeout(T2.timer); T2.timer = setTimeout(() => { wbRefresh(); t2PartDirty(); }, 350); }
function t2Repaint(){ const tw = $('#t2tt'), st = tw ? tw.scrollTop : 0, sl = tw ? tw.scrollLeft : 0; wbPaint(['ext']); const t2 = $('#t2tt'); if(t2){ t2.scrollTop = st; t2.scrollLeft = sl; } }
function t2SetCourse(c){ T2.course = c; T2.menu = ''; WB.zx = null; WB.zy = []; T2.zoom = {k:1, cx:.5, cy:.5}; T2.zoomE = {k:1, cx:.5, cy:.5}; t2Save(); WB.xi = 0; wbSelReset(['v', 'pw']); WB.act = ''; if(!WB.xa.startsWith('in:')) WB.xa = ''; wbPaint(['ext']); wbRefresh(); }
/* 기준 감속비 전환: 두 모드를 미리 계산해 두었으므로 결과만 바꿔 끼움 */
function t2SetGrMode(m){ T2.grMode = m; t2Save(); const R = WB.R; if(R && R.modes){ Object.assign(R, R.modes[m]); if(R.x && WB.xi >= R.x.d.length) WB.xi = R.x.d.length - 1; wbPaint(['ext', 'out', 'sig']); t2PfSoon(); } else wbRefresh(); }
document.addEventListener('input', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2o]')){ const k = t.dataset.t2o, v = parseFloat(t.value); if(!isFinite(v) || v < 0) return; T2.free[k] = k==='laps' ? Math.max(1, Math.round(v)) : v;
    t2EMapRepaint(); t2Soon(); } });
/* 결과 칸 '스키드패드 목표' 입력: Enter · 칸 밖 누름에 반영 (입력 칸은 계산 중 다시 그려도 됨) */
document.addEventListener('change', e => { const t = e.target; if(WB.id!=='2' || !t.matches || !t.matches('[data-t2skid]')) return;
  const v = parseFloat(t.value); WB.I.t_skid = isFinite(v) && v > 0 ? v : 0; wbSave(); wbCalcSoon(); });
document.addEventListener('change', e => { const t = e.target; if(!t.closest || !t.closest('#wbext')) return;
  if(t.matches('[data-t2file]')){ const f = t.files && t.files[0], k = t.dataset.t2file; t.value = ''; T2.menu = ''; if(f) t2Import(f, k==='mt' ? 'motor' : k); else t2Repaint(); return; }
  if(t.matches('[data-t2lap]')){ T2.lap[T2.course] = t.value; t2Save(); WB.xi = 0; t.blur(); wbRefresh(); } });
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return;
  const zb = t.closest('[data-t2z]'); if(zb){ const z = zb.dataset.t2z, ed = !!zb.closest('#wbext'); if(z==='fit'){ T2[ed ? 'zoomE' : 'zoom'] = {k:1, cx:.5, cy:.5}; ed ? t2EMapRepaint() : t2MapRepaint(); } else t2ZoomAt(z==='in' ? 1.5 : 1/1.5, null, null, ed); return; }
  if(!t.closest('#wbext')){ if(T2.menu && WB.id==='2'){ T2.menu = ''; t2Repaint(); } return; }
  const gm = t.closest('[data-t2gm]'); if(gm){ t2SetGrMode(gm.dataset.t2gm); return; }
  const mn = t.closest('[data-t2menu]'); if(mn){ if(mn.disabled) return; T2.menu = T2.menu===mn.dataset.t2menu ? '' : mn.dataset.t2menu; t2Repaint(); return; }
  const ac = t.closest('[data-t2act]'); if(ac){ const a = ac.dataset.t2act, k = ac.dataset.t2k; T2.menu = '';
    if(a==='tpl'){ const [kk, f] = ac.dataset.t2tpl.split('.'); t2Template(kk, f); t2Repaint(); return; }
    if(a==='ex'){ if(k==='track'){ T2.free.text = T2TRACK_EX; T2.free.s0 = 0; T2.free.laps = 1; } else if(k==='mt') T2.mtext = EMRAX228.torque; else T2.eM = EMRAX228.eff; }
    if(a==='clear'){ if(k==='track') T2.free.text = ''; else if(k==='mt') T2.mtext = ''; else T2[k] = ''; }
    t2Repaint(); t2Soon(); wbPaint(['in']); return; }
  if(t.closest('.t2-mi') || t.closest('.t2-mn')) return;
  if(T2.menu){ T2.menu = ''; t2Repaint(); }

  const tb = t.closest('[data-t2tab]'); if(tb){ T2.tab = tb.dataset.t2tab; T2.menu = ''; t2Save(); wbPaint(['ext']);
    if(T2.tab==='sim'){ t2MapRepaint(); t2PfSoon(); if(WB.dirty || (WB.need || []).length){ WB.dirty = false; wbCalc(); } } else wbNeedMark(); return; }   // 편집에서 바꾼 것이 있으면 이제 계산 (빈 필수 칸이 있으면 그때 빨강)   // 편집에서 바꾼 것이 있으면 이제 계산
  const ec = t.closest('[data-t2ecourse]'); if(ec){ T2.ecourse = ec.dataset.t2ecourse; T2.menu = ''; T2.zoomE = {k:1, cx:.5, cy:.5}; t2Save(); wbPaint(['ext']); return; }
  const us = t.closest('[data-t2use]'); if(us){ const uk = (us.closest('[data-t2uk]') || {}).dataset?.t2uk || T2.etab; T2.use[uk] = us.dataset.t2use; if(us.dataset.t2use==='const') (T2.mopen = T2.mopen || {})[uk] = false; WB.need = wbNeed(); wbNeedMark(); t2Save(); wbPaint(['ext']); t2Soon(); return; }
  const el = t.closest('[data-t2el]'); if(el){ WB.I.e_lim = +el.dataset.t2el; if(WB.I.e_lim===2 && !(WB.I.e_target > 0)) WB.I.e_target = Math.round(t2Epack()*100)/100; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const cs = t.closest('[data-t2course]'); if(cs){ t2SetCourse(cs.dataset.t2course); return; }
  const et = t.closest('[data-t2et]'); if(et){ T2.etab = et.dataset.t2et; if(T2MOT.includes(T2.etab)) T2.emot = T2.etab; if(T2BAT.includes(T2.etab)) T2.ebat = T2.etab; T2.menu = ''; t2Save(); wbPaint(['ext']); return; }
  const eg = t.closest('[data-t2eg]'); if(eg){ const g = eg.dataset.t2eg; T2.etab = g==='mot' ? (T2MOT.includes(T2.etab) ? T2.etab : (T2.emot || 'mt')) : g==='bat' ? (T2BAT.includes(T2.etab) ? T2.etab : (T2.ebat || 'bO')) : g==='dt' ? 'eD' : g; T2.menu = ''; t2Save(); wbPaint(['ext']); return; }
  const rl = t.closest('[data-t2rl]'); if(rl){ WB.I.rl_on = +rl.dataset.t2rl; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const drr = t.closest('[data-t2drr]'); if(drr && !t.closest('a, input, select, label, summary, details')){ WB.I.dr_real = +drr.dataset.t2drr; wbSave(); wbPaint(['ext', 'in']); wbCalcSoon(); return; }
  const drb = t.closest('[data-t2drv]'); if(drb){ WB.I.drv = +drb.dataset.t2drv; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const fsb = t.closest('[data-t2fs]'); if(fsb && !t.closest('button, a, input, select, label, summary, details')){ const k = fsb.dataset.t2fs, on = k==='rg_on' ? WB.I[k] === 1 : WB.I[k] !== 0; WB.I[k] = on ? 0 : 1; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const pkb = t.closest('[data-t2pk]'); if(pkb){ WB.I.pk_dir = +pkb.dataset.t2pk; wbSave(); wbPaint(['in', 'ext']); wbCalcSoon(); return; }
  const fmb = t.closest('[data-t2fm]'); if(fmb){ const fk = (fmb.closest('[data-t2fmk]') || {}).dataset?.t2fmk; if(fk){ WB.I[fk] = +fmb.dataset.t2fm; wbSave(); wbPaint(['ext']); wbCalcSoon(); } return; }
  const icb = t.closest('[data-t2ict]'); if(icb){ WB.I.ict_m = +icb.dataset.t2ict; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const fzb = t.closest('[data-t2fz0]'); if(fzb){ WB.I.fz0_m = +fzb.dataset.t2fz0; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const mdb = t.closest('[data-t2md]'); if(mdb && !t.closest('a, input, select, label, summary, details')){ if(mdb.disabled) return; WB.I.md = +mdb.dataset.t2md; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const cb = t.closest('[data-t2cool-m_cool],[data-t2cool-i_cool],[data-t2cool-b_cool]'); if(cb){ const k = ['m_cool', 'i_cool', 'b_cool'].find(q => cb.hasAttribute('data-t2cool-' + q)); WB.I[k] = +cb.getAttribute('data-t2cool-' + k); wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const mgb = t.closest('[data-t2mg]'); if(mgb){ WB.I.eff_mg = +mgb.dataset.t2mg; wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const thb = t.closest('[data-t2th]'); if(thb && !t.closest('button, a, input, select, label, summary, details')){ const k = thb.dataset.t2th, now = k==='th_on' ? WB.I.th_on !== 0 : WB.I[k] === 1, v = now ? 0 : 1;
    WB.I[k] = v;
    wbSave(); wbPaint(['ext']); wbCalcSoon(); return; }
  const dl = t.closest('[data-t2del]'); if(dl){ const rows = t2Track(T2.free.text).rows; rows.splice(+dl.dataset.t2del, 1); t2SetRows(rows); return; }
  if(t.closest('[data-t2add]')){ const rows = t2Track(T2.free.text).rows; rows.push({l:10, R:0, wl:NaN, wr:NaN, sl:NaN, note:''}); t2SetRows(rows); const tw = $('#t2tt'); if(tw) tw.scrollTop = tw.scrollHeight; return; }
  const gd = t.closest('[data-t2gdel]'); if(gd){ const k = T2.etab, g = t2Grid(t2MtText(k)); g.splice(+gd.dataset.t2gdel, 1); t2MtSet(k, t2GridText(g)); return; }
  const gc = t.closest('[data-t2gdelc]'); if(gc){ t2GridDelCol(T2.etab, +gc.dataset.t2gdelc); return; }
  const ga = t.closest('[data-t2gadd]'); if(ga){ t2GridAdd(T2.etab, ga.dataset.t2gadd); return; }
  const ce = t.closest('td[data-t2e], th[data-t2e]'); if(ce){ t2CellOpen(ce); return; } });
document.addEventListener('keydown', e => { const ce = e.target.closest && e.target.closest('#wbext td[data-t2e], #wbext th[data-t2e]'); if(ce && e.key==='Enter' && !e.target.matches('input,select')){ e.preventDefault(); t2CellOpen(ce); }
  if(e.key==='Escape' && WB.id==='2' && T2.menu){ e.preventDefault(); e.stopImmediatePropagation(); T2.menu = ''; t2Repaint(); } }, true);
/* 편집 탭에 표가 있으면 그 상수 칸은 막음 */
function t2InLock(k){ const L = '아래 표 사용';
  if(k==='eta_mot') return t2UseMap('eM') ? L : ''; if(k==='eta_dt') return t2UseMap('eD') ? L : ''; if((k==='dr_t0' || k==='dr_t1') && t2UseMap('dM')) return L; if((k==='di_t0' || k==='di_t1') && t2UseMap('dI')) return L; if(k==='eta_inv') return WB.I.eff_mg === 1 ? '모터 맵에 합침' : t2UseMap('eI') ? L : ''; if(k==='tmax') return '토크 표 최댓값';
  if(k==='c_pct') return (P => P.pts.length && P.ptsC.length ? '표에 두 열 다 있음' : '')(t2MotorParse(T2.mtext || ''));
  if(k==='i_ct') return WB.I.ict_m !== 0 ? '' : '피크 × 비율'; if(k==='i_cpct') return WB.I.ict_m !== 0 ? '연속 전류 입력 사용' : '';
  if(k==='tire_fz0') return WB.I.fz0_m !== 0 ? '' : '정지 평균 하중 사용';
  if(k==='rg_tmax' || k==='i_chg') return WB.I.rg_on === 1 ? '' : '회생 제동 고려 안 함';
  if(k==='dr_ks' || k==='dr_ke') return WB.I.dr_real === 1 ? '' : '이상 운전자';
  if(k==='delta_max') return t2Stab() ? '도구 6 표 사용' : WB.I.dl_on !== 0 ? '' : '조향 한계 고려 안 함';
  if(k==='steer_ratio') return t2Stab() ? '도구 6 표 사용' : WB.I.md >= 2 || WB.I.dr_real === 1 ? '' : '현실 운전자 · 차량 모델 2 에서 쓰임';
  if(k==='mu' || k==='mu_s') return t2UseMap('tire') ? L : '';
  if(k==='e_target') return t2ElOf()===2 ? '' : t2ElOf()===1 ? '제원 용량 사용' : '제한 없음';
  if(k==='rl_b') return '차 전폭으로 계산';
  if(T2PK[k]) return !t2PkDir() ? '셀 값으로 계산' : ''; if(['n_s', 'n_p', 'c_ah', 'c_vnom', 'c_vmin'].includes(k)) return !t2PkDir() ? '' : '팩 값 직접';
  if(['h_rcf', 'h_rcr', 'k_roll', 'rsd'].includes(k)) return WB.I.md >= 1 ? '' : '차량 모델 1 에서 쓰임';
  if(['tire_ca0', 'tire_cn', 'tire_c', 'tire_e'].includes(k)) return WB.I.md >= 2 ? '' : '차량 모델 2 에서 쓰임';
  if(['tire_relax', 'izz', 'ixx', 'm_us_f', 'm_us_r', 'c_roll', 'v_test', 'ay_test', 'tr_ks'].includes(k)) return WB.I.md >= 3 ? '' : '차량 모델 3 에서 쓰임';
  { const th = t2Th();
    if(['dr_t0', 'dr_t1', 'th_c', 'th_init'].includes(k)) return th.m ? '' : '모터 열 끔';
    if(k==='di_t0' || k==='di_t1' || k==='i_init') return th.i ? '' : '인버터 온도 끔';
    if(k==='th_r') return !th.m ? '모터 열 끔' : th.mW ? '' : '모터 공랭';
    if(k==='m_ha0' || k==='m_ha60') return !th.m ? '모터 열 끔' : th.mW ? '모터 수랭' : '';
    if(k==='i_c') return th.i ? '' : '인버터 온도 끔';
    if(k==='i_r') return !th.i ? '인버터 온도 끔' : th.iW ? '' : '인버터 공랭';
    if(k==='i_ha0' || k==='i_ha60') return !th.i ? '인버터 온도 끔' : th.iW ? '인버터 수랭' : '';
    if(['b_c', 'b_t0', 'b_alpha'].includes(k)) return th.b ? '' : '축전지 온도 끔';
    if(k==='b_ha' || k==='b_ha60') return !th.b ? '축전지 온도 끔' : th.bW ? '축전지 수랭' : '';
    if(k==='b_r') return !th.b ? '축전지 온도 끔' : th.bW ? '' : '축전지 공랭';
    { const tk = {cw_tw:'m', i_wtw:'i', b_wtw:'b'}[k]; if(tk){ if(th.n9) return '냉각 회로'; const wat = tk==='m' ? th.m && th.mW : tk==='i' ? th.iW : th.b && th.bW; return wat ? '' : {m:'모터 수랭 아님', i:'인버터 수랭 아님', b:'축전지 수랭 아님'}[tk]; } }   /* 회로 냉각수 온도: 냉각수 온도 끔이어도 (고정 값으로) 씀 */
    { const cwK = /^cw_(v|q|ra|kd|fan|fon|ua|itd|cm|rho|cp)$/.test(k) ? 'm' : /^i_w(v|q|ra|kd|fan|fon|ua|itd|cm|rho|cp)$/.test(k) ? 'i' : /^b_w(v|q|ra|kd|fan|fon|ua|itd|cm|rho|cp)$/.test(k) ? 'b' : '';
      if(cwK && /fon$/.test(k) && th.w && !th.n9 && WB.I[k.replace(/fon$/, 'fm')]!==1) return '팬 늘 켬';
      if(cwK){ if(!th.w) return WB.I.cw_on === 1 ? '수랭 부품 없음' : '냉각수 온도 끔'; if(th.n9) return '냉각 회로';
        const rk = {m:'rqM', i:'rqI', b:'rqB'}[cwK]; if(/ua$/.test(k) && t2UseMap(rk)) return '아래 표 사용'; if(/itd$/.test(k) && !t2UseMap(rk)) return '라디 표 없음';
        const wat = cwK==='m' ? th.m && th.mW : cwK==='i' ? th.iW : th.b && th.bW; if(!wat) return cwK==='m' ? '모터 수랭 아님' : cwK==='i' ? '인버터 수랭 아님' : '축전지 수랭 아님'; } }
    if(k==='th_cool') return '회로마다 냉각수';   // 부품별 독립 = 회로 카드, 냉각 회로 = 편집기 [냉각수] 칸 (2026-11-11)
    if(k==='th_cool') return (th.m && th.mW) || (th.i && th.iW) || (th.b && th.bW) || th.w ? '' : '수랭 부품 없음';   // 냉각 회로 방식에서만 보임
    if(k==='t_amb') return th.w || (th.m && !th.mW) || (th.i && !th.iW) || (th.b && !th.bW) ? '' : '외기로 식는 것 없음';
    if(k==='inv_r') return WB.I.eff_mg === 1 ? '' : '효율 따로';
    if(k==='eta_inv' && WB.I.eff_mg === 1) return '모터 맵에 합침'; }
  return ''; }
/* 잠긴 칸에 보일 값 (작업창 wbEffVal): 숫자 = 계산에 실제로 쓰는 값, null = 쓰지 않음 (—). 잠기지 않은 칸은 부르지 않음 */
function t2InEff(k){ const I = WB.I;
  if(k==='tmax'){ const P = t2MotorParse(T2.mtext || ''), c = Math.max(1e-3, Math.min(100, I.c_pct || 100)) / 100; const t = P.pts.length ? P.pts.map(q => q[1]) : P.ptsC.map(q => q[1] / c); return t.length ? Math.max(...t) : null; }   // 피크 토크 표 최댓값 (기준 전압 · 피크가 없으면 연속 ÷ 비율)
  if(k==='i_cpct') return I.i_pk > 0 && I.i_ct >= 0 ? Math.min(100, I.i_ct / I.i_pk * 100) : null;   // 연속 전류 입력에서 나온 비율
  if(k==='i_ct') return I.i_pk > 0 ? I.i_pk * Math.max(0, Math.min(100, I.i_cpct || 0)) / 100 : null;    // 피크 × 비율
  if(k==='tire_fz0') return isFinite(I.m) ? I.m * 9.81 / 4 : null;
  if((k==='delta_max' || k==='steer_ratio') && t2Stab()){ const S = t2Stab(); return k==='delta_max' ? S.di : S.rc; }   // 도구 6 표: 안쪽 최대 · 가운데 조향비                                       // 정지 평균 하중 (코너링 강성 기준)
  if(k==='e_target') return t2ElOf()===1 ? t2Epack() : null;                 // 제원 용량 · 제한 없음
  if(k==='rl_b') return I.w_car / 2 + Math.max(0, I.rl_m || 0);
  if(T2PK[k] && !t2PkDir()){ const x = T2PK[k](t2Cell()); if(isFinite(x)) I[k] = Math.round(x*100)/100; return x; }   // 셀 값으로 계산 (직렬 수를 0 으로 바꾸면 이 값에서 시작하게 같이 저장)
  if(['n_s', 'n_p', 'c_ah', 'c_vnom', 'c_vmin'].includes(k) && t2PkDir()){ const c = t2Cell(); return k==='n_s' ? c.Ns : k==='n_p' ? 1 : k==='c_ah' ? c.ah : k==='c_vnom' ? c.vnom : c.vmin; }   // 전폭으로 계산한 직선 여유 b
  if(k==='eta_inv' && I.eff_mg !== 1 && t2UseMap('eI')) return null;
  return null; }
/* 차 전폭을 바꾸면 그 자리에서 '최소 거리' · '여유' 칸 막힘을 다시 맞춤 (입력 칸 전체를 다시 그리면 글자 넣던 칸을 놓침) */
function t2RlLock(ks = ['rl_b', 'rl_m', 'oh_f', 'oh_r']){ ks.forEach(k => { const i = document.querySelector(`#wb [data-wbi="${k}"]`); if(!i) return; const r = i.closest('.wb-ir'), lk = t2InLock(k);
  i.disabled = !!lk; r.classList.toggle('lock', !!lk); { const d = WB_TOOLS['2'].inputs.find(q => q.k===k), ev = lk ? wbEffVal(WB_TOOLS['2'], d) : {v:isFinite(WB.I[k]) ? WB.I[k] : '', ph:'', cls:'', t:''}; i.value = ev.v; i.placeholder = ev.ph; i.className = ev.cls; i.title = ev.t; }
  let s = r.querySelector('.wb-lk'); if(lk && !s){ s = document.createElement('span'); s.className = 'wb-lk'; i.parentNode.insertBefore(s, i.nextSibling.nextSibling); }
  if(s){ if(lk) s.textContent = lk; else s.remove(); } }); }
document.addEventListener('input', e => { if(WB.id==='2' && e.target.matches && e.target.matches('[data-wbi="w_car"]')) setTimeout(t2RlLock, 0); });
/* 셀 구성 · 용량 · 전압을 바꾸면 [제원 용량 X kWh] 글자를 그 자리에서 맞춤 */
document.addEventListener('input', e => { if(WB.id!=='2' || !e.target.matches || !e.target.matches('[data-wbi="n_s"],[data-wbi="n_p"],[data-wbi="c_ah"],[data-wbi="c_vnom"],[data-wbi="c_vmax"],[data-wbi="c_vmin"],[data-wbi^="p_"]')) return;
  setTimeout(() => { const b = document.querySelector('#wb [data-t2el="1"]'); if(b) b.textContent = `제원 용량 ${wbFmt(t2Epack(), 2)} kWh`; wbEffRefresh(); }, 0); });
/* 직렬 수를 0 ↔ 값으로 바꾸면 잠기는 칸이 바뀜 → 입력 칸을 다시 그림 */
document.addEventListener('change', e => { if(WB.id==='2' && e.target.matches && e.target.matches('[data-wbi="n_s"]')) setTimeout(() => wbPaint(['in']), 0); });

/* ============================================================ 결과 칸 (도구가 직접 그림)
   1행: 감속비 · 종목 기록 · 차량 한계 (감속비 칸과 종목 기록 칸은 같은 종목이 같은 높이)
   2행: 고른 코스 · 축전지 · 모터 · 에너지 (위에서 고른 코스 · 볼 랩) */
const t2F = (v, d) => isFinite(v) ? wbFmt(v, d) : '—';
const t2T = (s, d) => { if(!isFinite(s)) return '—'; if(s < 60) return `${s.toFixed(d)}s`; const m = Math.floor(s/60); return `${m}m ${(s - 60*m).toFixed(1)}s`; };   // 60초 넘으면 25m 17.2s
const t2Dt = d => !isFinite(d) ? '' : d > 0.0005 ? `<span class="t2-dt bad">+${d.toFixed(3)}s</span>` : `<span class="t2-dt ok">−${Math.abs(d).toFixed(3)}s</span>`;
const t2Tt = h => String(h || '').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;').trim();   // 잘린 글자 전체를 마우스 올리면 보임
const t2R  = (n, v, x, cls) => `<div class="t2-r${cls ? ' ' + cls : ''}"><span class="n" title="${t2Tt(n)}">${n}</span><span class="d"${x ? ` title="${t2Tt(x)}"` : ''}>${x || ''}</span><span class="v">${v}</span></div>`;   // 이름 · 메모 · 수치 (수치는 늘 오른쪽 끝)
const t2Box = (title, note, body, cls) => `<div class="wb-oc t2-oc${cls ? ' ' + cls : ''}"><h4>${title}${note ? `<span>${note}</span>` : ''}</h4><div class="t2-rs">${body}</div></div>`;
function t2OutHTML(R){ const o = R.out, opt = T2.grMode==='opt', c = T2.course;
  const G = (n, g, t) => t2R(n, t, g);   // 감속비 칸: 이름 · 감속비 · 그때 기록
  const gear = t2Box('감속비', '종목마다 가장 빠른 감속비 (2.5 ~ 7.0) · 그때 기록',
      t2R('제안 (배점 가중)', `<b>${t2F(o.gr_opt, 2)}</b>`, '<span class="muted">가속 100 · 오토 200 · 내구 350</span>')
    + G('가속', `<b>${t2F(o.gr_acc, 2)}</b>`, `<b>${t2T(o.tb_acc, 3)}</b>`) + t2R('스키드패드', '<b>—</b>', '<span class="muted">감속비와 거의 상관없음</span>')
    + G('오토크로스', `<b>${t2F(o.gr_ax, 2)}</b>`, `<b>${t2T(o.tb_ax, 2)}</b>`) + G('내구 첫 랩 (정지 출발)', `<b>${t2F(o.gr_end, 2)}</b>`, `<b>${t2T(o.tb_end1, 2)}</b>`)
    + G('내구 평균 랩 (정지 출발 랩 제외)', '', `<b>${t2T(o.tb_endavg, 2)}</b>`) + G('내구 총합', '', `<b>${t2T(o.tb_end, 1)}</b>`), 'g');
  const rec = t2Box('종목 기록', `감속비 ${t2F(o.gr_use, 2)} (${opt ? '최적' : '내 감속비'}) · ± = 가장 빠른 기록 대비`,
      t2R('기준 감속비', `<b>${t2F(o.gr_use, 2)}</b>`, `<span class="muted">${opt ? '최적 감속비' : '편집 탭 [구동계]'}</span>`)
    + t2R('가속', `<b>${t2T(o.t_acc_s, 3)}</b>`, t2Dt(o.d_acc)) + t2R('스키드패드 (좌우 합)', `<b>${t2T(o.t_skid_s, 3)}</b>`, `<span class="muted">우 ${t2F(o.t_skid_r, 3)} · 좌 ${t2F(o.t_skid_l, 3)}</span>`)
    + t2R('오토크로스', `<b>${t2T(o.t_ax_s, 2)}</b>`, t2Dt(o.d_ax)) + t2R('내구 첫 랩 (정지 출발)', `<b>${t2T(o.t_end1, 2)}</b>`, '')
    + t2R('내구 평균 랩 (정지 출발 랩 제외)', `<b>${t2T(o.t_endavg, 2)}</b>`, '') + t2R('내구 총합', `<b>${t2T(o.t_end_s, 1)}</b>`, t2Dt(o.d_end)));
  // 스키드패드 목표 (좌우 합) 를 여기서 고침 → 필요 C_L·A · 지금 C_L·A · 조절 ±
  const gs = o.g_skid > 0, dcl = o.cla_req - WB.I.cla;
  const claWhy = gs && !isFinite(o.cla_req) ? (o.g_skid < o.t_skid_s ? '목표가 너무 빠름 (한 바퀴 기록이 아닌 좌우 합인지 확인)' : '목표가 너무 느림') : '';
  const cla = !gs ? '<b>—</b>' : isFinite(o.cla_req) ? `<b>${t2F(o.cla_req, 2)}</b> <i>m²</i>` : '<b>±15 밖</b>';
  const claM = !gs ? '<span class="muted">위 목표를 넣으면 계산</span>' : claWhy ? `<span class="t2-dt bad">${claWhy}</span>`
    : `<span class="muted">지금 ${t2F(WB.I.cla, 2)} · 조절</span> <span class="t2-dp ${dcl > 0 ? 'up' : 'dn'}">${dcl > 0 ? '+' : '−'}${t2F(Math.abs(dcl), 2)}</span>`;
  const lim = t2Box('차량 한계', `감속비 ${t2F(o.gr_use, 2)}`,
      t2R('최고 차속 (회전수 한계)', `<b>${t2F(o.vmax, 1)}</b> <i>km/h</i>`, '')
    + t2R('오토크로스 · 내구 최고 차속', `<b>${t2F(o.v_top, 1)}</b> <i>/</i> <b>${t2F(o.v_endtop, 1)}</b> <i>km/h</i>`, '')
    + t2R('가속 출발 종가속도', `<b>${t2F(o.ax_0, 2)}</b> <i>g</i>`, '') + t2R('가속 최대 종가속도', `<b>${t2F(o.ax_max, 2)}</b> <i>g</i>`, '')
    + t2R('스키드패드 횡가속도', `<b>${t2F(o.ay_skid, 2)}</b> <i>g</i>`, '<span class="muted">기록 바퀴 평균</span>')
    + t2R('스키드패드 목표 (좌우 합)', `<input type="number" step="any" min="0" class="t2-ski" data-t2skid value="${gs ? o.g_skid : ''}" placeholder="0" aria-label="스키드패드 목표 좌우 합 s"> <i>s</i>`,
          `<span class="muted">${gs ? `한 바퀴 평균 ${t2F(o.g_skid/2, 3)} s` : '0 = 정하지 않음'}</span>`)
    + t2R('목표에 필요한 C_L·A', cla, claM));
  /* 2행 */
  const cn = T2CN[c] + (o.c_n > 1 ? ` · ${T2.lap[c]==='all' ? `전체 ${o.c_n}랩` : `${o.c_lap}번째 랩`}` : '');
  const grLab = !opt ? '감속비 (입력)' : c==='skid' ? '감속비 (상관없어 최적 감속비)' : '감속비 (이 코스에서 가장 빠른 값)';
  const crec = c==='skid' ? t2R('기록 (좌우 한 바퀴 합)', `<b>${t2T(o.c_t, 3)}</b>`, '') + t2R('8자 전체 주행 (진입 ~ 탈출)', `<b>${t2T(o.c_ttot, 2)}</b>`, '')
    : o.c_n > 1 ? (T2.lap[c]==='all' ? '' : t2R(`${o.c_lap}번째 랩`, `<b>${t2T(o.c_t, 2)}</b>`, '')) + t2R('첫 랩 (정지 출발)', `<b>${t2T(o.c_t1, 2)}</b>`, '') + t2R('평균 랩 (정지 출발 랩 제외)', `<b>${t2T(o.c_tavg, 2)}</b>`, '') + t2R('총합', `<b>${t2T(o.c_ttot, 1)}</b>`, '')
    : t2R('기록', `<b>${t2T(o.c_t, c==='acc' ? 3 : 2)}</b>`, '');
  const r1 = t2R(grLab, `<b>${t2F(o.c_gr, 2)}</b>`, '') + crec + t2R('최고 차속', `<b>${t2F(o.c_vtop, 1)}</b> <i>km/h</i>`, '')
    + (isFinite(o.c_vstr) ? t2R('핸들 속도 상한', `<b>${t2F(o.c_vstr, 1)}</b> <i>km/h</i>`, '<span class="muted">현실 운전자 · 핸들 900 °/s 로 곡률 변화를 따라갈 수 있는 가장 낮은 속도 (그 위로 달리면 핸들이 못 따라감)</span>') : '')
    + (isFinite(o.c_rmn) ? t2R('가장 작은 반경', `<b>${t2F(o.c_rmn, 2)}</b> <i>m</i>`, o.c_rkin > 0 ? (o.c_rbad > 0 ? `<span class="t2-dt bad">최소 회전 반경 ${t2F(o.c_rkin, 2)} m 보다 급한 곳 ${t2F(o.c_rbad, 1)} m</span>` : `<span class="muted">최소 회전 반경 ${t2F(o.c_rkin, 2)} m (최대 조향각에서) 지킴</span>`) : '<span class="muted">조향 한계 고려 안 함</span>') : '')
    + (o.c_ctight > 0 ? t2R('여유를 못 지킨 콘', `<b>${o.c_ctight}</b> <i>개</i>`, `<span class="t2-dt bad">콘 ↔ 경계 틈 &lt; 2 × ${t2F(o.c_rlb, 2)} m</span>`) : '')
    + (isFinite(o.c_bo) ? t2R('가장 급한 곳 차 여유', `<b>${t2F(o.c_bo, 2)}</b> <i>/</i> <b>${t2F(o.c_bi, 2)}</b> <i>m</i>`, '<span class="muted">바깥 / 안쪽 (전장 · 차체 각도 포함)</span>') : '')
    + (isFinite(o.c_len) ? t2R('한 랩 거리', `<b>${t2F(o.c_len, 1)}</b> <i>m</i>`, `<span class="muted">${!o.c_rl ? '중심 라인' : `${o.c_rl === 2 ? `레코드 라인 −${t2F(o.c_rlg, 2)} s` : '최소 곡률 라인'} · 여유 ${t2F(o.c_rlb, 2)} m${WB.I.w_car > 0 ? ` (${t2F(WB.I.w_car, 2)} ÷ 2 + ${t2F(Math.max(0, WB.I.rl_m || 0), 2)})` : ''}`}</span>`) : '')
    + (isFinite(o.c_ltot) && o.c_n > 1 ? t2R('총 거리', o.c_ltot >= 1000 ? `<b>${t2F(o.c_ltot/1000, 2)}</b> <i>km</i>` : `<b>${t2F(o.c_ltot, 0)}</b> <i>m</i>`, `<span class="muted">한 랩 × ${o.c_n}랩</span>`) : '');
  const r2 = t2R('최고 모터 회전수', `<b>${t2F(o.c_rpm, 0)}</b> <i>rpm</i>`, '') + t2R('최대 모터 토크', `<b>${t2F(o.c_tq, 1)}</b> <i>N·m</i>`, '') + t2R('최대 단자 출력', `<b>${t2F(o.c_pbat, 1)}</b> <i>kW</i>`, '')
    + t2R('가장 낮은 단자 전압', `<b>${t2F(o.c_vmin, 1)}</b> <i>V</i>`, '') + t2R('모터 최고 온도', `<b>${t2F(o.c_tmax, 1)}</b> <i>°C</i>`, `<span class="muted">${isFinite(o.c_tmax) ? `끝 ${t2F(o.c_tm, 1)} °C` : '모터 열 켜면 계산'}</span>`)
    + t2R('냉각수 최고 온도', `<b>${t2F(o.c_twmax, 1)}</b> <i>°C</i>`, `<span class="muted">${isFinite(o.c_twmax) ? `끝 ${t2F(o.c_tw, 1)} °C` : '냉각수 온도 켜면 계산 (수랭 부품 필요)'}</span>`)
    + t2R('인버터 최고 온도', `<b>${t2F(o.c_timax, 1)}</b> <i>°C</i>`, `<span class="muted">${isFinite(o.c_timax) ? `끝 ${t2F(o.c_ti, 1)} °C` : '인버터 온도 켜면 계산'}</span>`)
    + t2R('축전지 최고 온도', `<b>${t2F(o.c_tbmax, 1)}</b> <i>°C</i>`, `<span class="muted">${isFinite(o.c_tbmax) ? `끝 ${t2F(o.c_tb, 1)} °C` : '축전지 온도 켜면 계산'}</span>`)
    + t2R('최대 전류 때 단자 전압 (SOC 100 %)', `<b>${t2F(o.v_load, 1)}</b> <i>V</i>`, '') + t2R('단자 출력 상한 (규정 · 전류 한계)', `<b>${t2F(o.p_max, 2)}</b> <i>kW</i>`, '') + t2R('모터 기저 회전수 (공칭 전압)', `<b>${t2F(o.n_base, 0)}</b> <i>rpm</i>`, '');
  const one = o.c_n > 1 && T2.lap[c]!=='all' ? `${o.c_lap}번째 랩 ` : '';
  // 에너지 칸: 모든 코스 같은 줄 (해당 없으면 —)
  const kw = (a, b) => `<b>${t2F(a, 3)}</b> <i>/</i> <b>${t2F(b, 3)}</b> <i>kWh</i>`, NA = '<b>—</b>', en = c==='end';
  const r3 = t2R(`${one || '볼 랩 '}단자 / 소비`, kw(o.c_et, o.c_ec), '<span class="muted">소비 = 저항 손실 포함</span>')
    + t2R(one ? `${o.c_lap}번째 랩 끝 SOC` : '끝 SOC', `<b>${t2F(o.c_soc, 1)}</b> <i>%</i>`, '')
    + t2R('전체 (단자 / 소비)', kw(o.c_all_t, o.c_all_c), `<span class="muted">${o.c_n > 1 ? `${o.c_n}랩` : '한 번'}</span>`)
    + t2R('출력 상한 없이 (단자 / 소비)', kw(o.c_nl_t, o.c_nl_c), `<span class="muted">${en ? '용량 가늠용' : '상한 없음 (내구만 걸림)'}</span>`)
    + t2R('쓸 수 있는 에너지', !en ? NA : isFinite(o.c_cap) ? `<b>${t2F(o.c_cap, 2)}</b> <i>kWh</i>` : '<b>제한 안 함</b>', en ? `<span class="muted">${isFinite(o.c_cap) ? (t2ElOf()===2 ? '임의 상한' : '제원 용량') : '편집 탭 [축전지]'}</span>` : '<span class="muted">내구만</span>')
    + t2R('출력 상한 비율', !en ? NA : o.c_plim >= 99.95 ? '<b>제한 없음</b>' : `<b>${t2F(o.c_plim, 1)}</b> <i>%</i>`, en ? (o.c_plim < 99.95 ? '<span class="t2-dt bad">에너지에 맞추려고 낮춤</span>' : '') : '<span class="muted">내구만</span>')
    + t2R('보정 에너지 소비량 (CO₂)', en ? `<b>${t2F(o.c_co2, 2)}</b> <i>kg/100 km</i>` : NA, !en ? '<span class="muted">내구만</span>' : o.c_co2 > 60.06 ? '<span class="t2-dt bad">실격 기준 60.06 초과</span>' : '<span class="muted">실격 기준 60.06 이하</span>');
  return `<div class="t2-out"><div class="t2-orow three">${gear}${rec}${lim}</div>
    <div class="t2-orow three">${t2Box('고른 코스', cn, r1)}${t2Box('축전지 · 모터', cn, r2)}${t2Box('에너지 (회생 제외)', cn, r3)}</div>${t2DynHTML(R, cn)}</div>`; }
/* 차량 모델 2 · 3 결과: 정상 선회 (고른 코스) · 계단 조향 과도 응답 (그래프) */
function t2DynHTML(R, cn){ const o = R.out, md = WB.I.md || 0; if(md < 2) return '';
  const r4 = t2R('최대 슬립각 (앞 / 뒤)', `<b>${t2F(o.c_afmax, 2)}</b> <i>/</i> <b>${t2F(o.c_armax, 2)}</b> <i>°</i>`, '')
    + t2R('최대 차체 각도 β', `<b>${t2F(o.c_bmax, 2)}</b> <i>°</i>`, '<span class="muted">신호 그래프에 β</span>')
    + t2R('최대 바퀴 조향각 · 핸들 각', `<b>${t2F(o.c_dwmax, 2)}</b> <i>°</i> · <b>${t2F(o.c_swmax, 0)}</b> <i>°</i>`, `<span class="muted">조향비 ${t2F(WB.I.steer_ratio, 2)}</span>`)
    + t2R('조향 한계로 느려진 거리', isFinite(o.c_dbad) ? `<b>${t2F(o.c_dbad, 1)}</b> <i>m</i>` : '<b>—</b>', isFinite(o.c_dbad) ? (o.c_dbad > 0 ? `<span class="t2-dt bad">최대 ${t2F(WB.I.delta_max, 1)}° 로 못 꺾어 코너 속도를 낮춤</span>` : `<span class="muted">최대 ${t2F(WB.I.delta_max, 1)}° 안</span>`) : '<span class="muted">최대 조향각 0 = 확인 안 함</span>')
    + t2R('차체가 경계에 닿아 느려진 거리', isFinite(o.c_bdlen) ? `<b>${t2F(o.c_bdlen, 1)}</b> <i>m</i>` : '<b>—</b>', isFinite(o.c_bdlen) ? (o.c_bdlen > 0 ? `<span class="t2-dt bad">가장 크게 ${t2F(o.c_bddv, 1)} km/h 낮춤</span>` : '<span class="muted">속도에 따른 차체 각도로도 경계 안</span>') : '<span class="muted">전폭 0 · 중심 라인 · 가속 · 스키드패드는 확인 안 함</span>')
    + (o.c_bdct > 0 ? t2R('아주 느려도 차체가 닿는 콘', `<b>${t2F(o.c_bdct, 0)}</b> <i>개</i>`, '<span class="t2-dt bad">속도로는 못 피함 · 주행선 여유 · 차 크기 · 콘 간격 확인</span>') : '')
    + t2R('타이어 포화 점', `<b>${t2F(o.c_satn, 0)}</b> <i>개</i>`, '<span class="muted">축마다 따로 보면 곡선 최대를 넘겨야 하는 점 (제동 · 가속 중 하중 이동, 기록은 차 전체 마찰원으로 셈)</span>')
    + t2R('선형 언더스티어 구배', `<b>${t2F(o.k_us_lin, 3)}</b> <i>°/g</i>`, `<span class="muted">${o.k_us_lin > 0 ? '+ = 언더' : '− = 오버'} (정지 하중 코너링 강성)</span>`);
  let r5 = '';
  if(md >= 3 && R.tr){ const T = R.tr, tr = isFinite(o.c_trok), NA = '<b>—</b>', nt = '<span class="muted">가속 · 스키드패드는 조향이 바뀌지 않아 과도 반영 없음</span>';
    r5 = t2R('과도로 늘어난 랩 시간', tr ? `<b>${t2F(o.c_trdt, 3)}</b> <i>s</i>` : NA, tr ? `<span class="muted">고른 코스 한 랩${WB.I.course==='end' ? ' (이어 달린 랩)' : ''} · 준정적 대비</span>` : nt)
      + t2R('과도로 속도를 낮춘 거리', tr ? `<b>${t2F(o.c_trlen, 0)}</b> <i>m</i>` : NA, tr ? `<span class="muted">정상보다 더 쓴 타이어 몫 최대 ${t2F(o.c_trq, 0)} %</span>` : '')
      + t2R('과도 상한 맞춤', tr ? `<b>${o.c_trok ? '다 맞춤' : '덜 맞춤'}</b> <i>· ${t2F(o.c_trit, 0)} 번</i>` : NA, tr && !o.c_trok ? '<span class="t2-dt bad">되풀이 한도 안에 다 맞추지 못함</span>' : '')
      + t2R('시험', `<b>${t2F(o.tr_v, 0)}</b> <i>km/h</i> · <b>${t2F(o.tr_sw, 1)}</b> <i>° 핸들</i>`, `<span class="muted">바퀴 ${t2F(o.tr_del, 2)}°, 0.1 s 동안</span>`)
      + t2R('정상 요레이트 (해석해 / 3 s)', `<b>${t2F(o.tr_rss, 2)}</b> <i>/</i> <b>${t2F(o.tr_r, 2)}</b> <i>°/s</i>`, `<span class="muted">이득 ${t2F(o.tr_gain, 2)} 1/s</span>`)
      + t2R('요레이트 응답 시간 · 오버슈트', `<b>${t2F(o.tr_t90, 3)}</b> <i>s</i> · <b>${t2F(Math.max(0, o.tr_os), 1)}</b> <i>%</i>`, '<span class="muted">조향 50 % → 요레이트 90 %</span>')
      + t2R('고유진동수 · 감쇠비 (2 자유도)', `<b>${t2F(o.tr_wn, 2)}</b> <i>Hz</i> · <b>${t2F(o.tr_zeta, 3)}</b>`, '')
      + t2R('롤각 (정상 해석해 / 3 s)', `<b>${t2F(o.tr_phis, 3)}</b> <i>/</i> <b>${t2F(o.tr_phi, 3)}</b> <i>°</i>`, `<span class="muted">β ${t2F(o.tr_beta, 2)}°</span>`)
      + `<div class="t2-trp">${wbPlot({id:'t2tr', w:520, h:220, x:{d:T.t, n:'시간', u:'s'}, ys:[{k:'r', d:T.r, c:WB_COL[0], n:'요레이트', u:'°/s', dd:2}, {k:'ay', d:T.ay, c:WB_COL[2], n:'횡가속도', u:'g', dd:3}, {k:'phi', d:T.phi, c:WB_COL[3], n:'롤각', u:'°', dd:3}, {k:'sw', d:T.sw, c:WB_COL[7], n:'핸들 각', u:'°', dd:1}], hit:false, label:'계단 조향 응답'})}</div>`; }
  // 참고용이라 처음엔 접어 둠 (열면 그 상태를 기억)
  return `<details class="t2-bmore" data-t2bmore${T2.bmore ? ' open' : ''}><summary>차량 거동 자세히 (모델 2 정상 선회${r5 ? ' · 모델 3 과도' : ''})</summary><div class="t2-orow${r5 ? ' two' : ''}">${t2Box('차량 거동 · 모델 2 (정상 선회)', cn, r4)}${r5 ? t2Box('과도 · 모델 3', '기록 반영 (요 관성 · 타이어 이완) · 계단 조향 ISO 7401 꼴', r5) : ''}</div></details>`; }
document.addEventListener('toggle', e => { if(e.target.matches && e.target.matches('[data-t2bmore]')) T2.bmore = e.target.open; }, true);

/* 입력 옆 '모양 보기': 하중 감도 → 바퀴 하중에 따른 μ 와 낼 수 있는 횡력 */

/* 다른 도구의 칸 표 (WBGRID): 칸 누르기 · Enter 로 고침, 행 · 열 지우기 · 더하기, 표에 Ctrl+V 로 표 전체 바꿈 (2P 표와 같은 동작) */
document.addEventListener('click', e => { const t = e.target; if(!t.closest) return; const tb = t.closest('[data-t2gk]'); if(!tb || !WBGRID[tb.dataset.t2gk]) return; const k = tb.dataset.t2gk;
  const gd = t.closest('[data-t2gdel]'); if(gd){ const g = t2Grid(t2MtText(k)); g.splice(+gd.dataset.t2gdel, 1); t2MtSet(k, t2GridText(g)); return; }
  const gc = t.closest('[data-t2gdelc]'); if(gc){ t2GridDelCol(k, +gc.dataset.t2gdelc); return; }
  const ga = t.closest('[data-t2gadd]'); if(ga){ t2GridAdd(k, ga.dataset.t2gadd); return; }
  const ce = t.closest('td[data-t2e], th[data-t2e]'); if(ce) t2CellOpen(ce); });
document.addEventListener('keydown', e => { if(e.key!=='Enter' || !e.target.closest || e.target.matches('input,select')) return; const ce = e.target.closest('td[data-t2e], th[data-t2e]'), tb = ce && ce.closest('[data-t2gk]');
  if(tb && WBGRID[tb.dataset.t2gk]){ e.preventDefault(); t2CellOpen(ce); } });
document.addEventListener('paste', e => { if(!e.target.closest) return; const tb = e.target.closest('[data-t2gk]'); if(!tb || !WBGRID[tb.dataset.t2gk] || e.target.matches('input')) return;
  const txt = (e.clipboardData && e.clipboardData.getData('text/plain')) || ''; if(!/[\t\n]/.test(txt.trim())) return; e.preventDefault();
  t2ApplyText(tb.dataset.t2gk, txt.replace(/\r/g, '').split('\n').filter(l => l.trim()).map(l => l.split('\t').map(c => c.trim()).join(', ')).join('\n')); });
