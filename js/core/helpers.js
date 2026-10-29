/* ============================================================
   공통 도우미
   ============================================================ */
const A = '<span class="badge b-assume">가정값</span>';
const V = '<span class="badge b-verify">확인 필요</span>';
const T = (head, rows) => `<div class="tbl"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const MI = t => `<span class="mi" data-tex="${escA(t)}">${escA(texFallback(t))}</span>`;
const TEX = []; const EQ = t => { TEX.push(t); return `<div class="eq" data-k="${TEX.length-1}"></div>`; };
const NOTE = s => `<div class="note">${s}</div>`;
const Q = (h, b, s) => ({h, b, s: s || []});
const FIGS = (...f) => `<div class="fig">${f.map(([svg,cap])=>{ const m=/viewBox="[-\d.]+ [-\d.]+ ([\d.]+)/.exec(svg); const w=m?Math.round(+m[1]*1.15):720; const an=/data-an="(\w+)"/.exec(svg), A=an&&typeof ANIM!=="undefined"&&ANIM[an[1]];
  const bar=A?`<div class="an-bar"><button type="button" class="an-play" aria-pressed="false" aria-label="움직임 재생">▶ 움직임</button>${A.note?`<span class="an-note">${A.note}</span>`:''}</div>`:'';
  return `<figure${A?' class="anim"':''}>${bar}${svg.replace('<svg ',`<svg style="max-width:${w}px" `)}<figcaption>${cap}</figcaption></figure>`; }).join('')}</div>`;
let MK = 0;
/* (markers·ground·dimH·dimV·lead·spring 정의는 js/figures/svg-figures.js에 있음) */
