/* ============================================================
   팀 탭 '대회 점수': 지난 시즌 우리 팀 기록 (F1)
   - 팀 저장소 meta/records = { "2025": {보고서:점수, 가속:..., 순위:"3위"}, ... }
   - 팀원은 보기, 회장은 [편집] → 입력하면 바로 '저장 전' → [닫기] → 아래 막대 [모두 저장]
   - 팀 저장소가 없으면 이 브라우저에 저장
   ============================================================ */
let REC = {}, RECSTAGE = null, RECEDIT = false, RECY = '';
try{ REC = JSON.parse(localStorage.getItem('run2x.records.v1')||'{}') || {}; }catch(e){ REC = {}; }
const recCan = () => !SH.on || SH.canAdmin;
function recVisible(){ return !(window.Backend && Backend.kind()==='firebase') || SH.on; }
/* 오른쪽에는 합계와 등수만: '14위 (내구 미완주)' → '14위' (전체는 마우스를 올리면) */
/* 미완주 종목: r['미완주'] = ['내구','효율'] (0점이 미완주인지 기록을 안 넣은 것인지 구분) */
const recDnf = r => Array.isArray(r && r['미완주']) ? r['미완주'] : [];
const recRank = t => { const m=String(t||'').match(/\d+\s*위/); return m ? m[0].replace(/\s+/g,'') : String(t||''); };
function renderRecords(){ const el=$('#fsRec'); if(!el) return;
  if(!recVisible()){ el.innerHTML = `<h3>우리 팀 기록</h3><p class="muted">로그인하고 팀에 가입하면 지난 시즌 우리 팀 기록(종목별 점수)이 여기에 보입니다.</p>`; return; }
  const cols = FS_SCORE.map(x=>x[0]), data = RECSTAGE || REC, seasons = Object.keys(data).filter(k=>/^\d{4}$/.test(k)).sort().reverse();
  const sum = r => cols.reduce((a,c)=>a+(+r[c]||0),0);
  let h = `<div class="rec-h"><h3>우리 팀 기록</h3>${RECSTAGE ? '<span class="pend-tag">저장 전</span>' : ''}<span class="tv-sp"></span>${recCan() ? (RECEDIT ? `<button type="button" class="btn small" data-recok>닫기</button>` : `<button type="button" class="btn small" data-recedit>편집</button>`) : ''}</div>`;
  if(RECEDIT){ const S = RECY || SEASON, r = (RECSTAGE||REC)[S] || {};
    h += `<p class="muted tp-small"><label>입력할 시즌 <input type="number" class="rec-y" min="2000" max="2100" value="${esc(S)}" aria-label="입력할 시즌"></label> · 입력하면 아래 막대에 쌓입니다 → [모두 저장]</p>
      <div class="rec-in">${cols.map((c,i)=>`<label><span>${c} <span class="muted">/ ${FS_SCORE[i][1]}</span></span><input type="number" step="0.1" min="0" max="${FS_SCORE[i][1]}" data-rc="${c}" data-max="${FS_SCORE[i][1]}" value="${esc(r[c]??'')}"${recDnf(r).includes(c)?' disabled':''}><span class="rec-err" hidden>0 ~ ${FS_SCORE[i][1]}점</span>${c==='보고서'?'':`<span class="rec-dnf"><input type="checkbox" data-rdnf="${c}"${recDnf(r).includes(c)?' checked':''}> 미완주</span>`}</label>`).join('')}<label><span>순위·비고</span><input type="text" maxlength="40" data-rc="순위" value="${esc(r['순위']||'')}"></label></div>`;
  }
  if(!seasons.length && !RECEDIT){ h += `<p class="muted">아직 기록이 없습니다.${recCan() ? ' [편집]을 눌러 지난 대회 결과를 입력하십시오.' : ' 회장이 입력하면 여기에 보입니다.'}</p>`; el.innerHTML=h; return; }
  // 3줄만: 보는 시즌(가운데, 가장 최신이면 첫 줄) + 기록이 있는 가까운 다음·이전 시즌. 칸 너비 = 배점, 진한 부분 = 받은 점수, 연한 부분 = 만점까지 모자란 점수
  const tot = FS_SCORE.reduce((a,x)=>a+x[1],0), sel = +SEASON, ys = seasons.map(Number);
  const newer = ys.filter(y=>y>sel).sort((a,b)=>a-b)[0], older = ys.filter(y=>y<sel).sort((a,b)=>b-a);
  const rows = newer!=null ? [newer, sel, older[0]] : [sel, older[0], older[1]];
  const head = `<div class="rec-row rec-hd"><span></span><div class="rec-cats">${FS_SCORE.map(([n,v])=>`<span style="flex:${v}"><b>${esc(n)}</b><i>${v}</i></span>`).join('')}</div><span class="rec-sum">합계 / ${tot.toLocaleString()}</span></div>`;
  const row = (Y) => { if(Y==null) return `<div class="rec-row rec-none"><span class="rec-s">—</span><div class="rec-empty">기록 없음</div><span></span></div>`;
    const r = data[String(Y)]; const pend = RECSTAGE && JSON.stringify(RECSTAGE[String(Y)]||null)!==JSON.stringify(REC[String(Y)]||null); const me = (Y===sel ? ' rec-me' : '') + (pend ? ' rec-pend' : '');
    if(!r) return `<div class="rec-row rec-none${me}"><span class="rec-s">${Y}</span><div class="rec-empty"><span>${Y} 시즌 기록 없음</span>${recCan() && !RECEDIT ? `<button type="button" class="btn small" data-recedit data-recy="${Y}">기록 입력</button>` : ''}</div><span></span></div>`;
    return `<div class="rec-row${me}"><span class="rec-s">${Y}</span><div class="fs-bar rec-bar" role="img" aria-label="${Y} 시즌 종목별 점수 ${cols.map(c=>c+' '+(r[c]??'-')).join(', ')}">${FS_SCORE.map(([n,v],i)=>{ const x=r[n], dnf=recDnf(r).includes(n); const f=x===''||x==null?0:Math.min(100,Math.max(0,(+x||0)/v*100)); return `<span class="fsb-${i}${f>=82?' full':''}${dnf?' dnf':''}" style="flex:${v};--f:${f}%" title="${esc(n)} ${x??'-'} / ${v}${dnf?' · 미완주':''}"><i>${x===''||x==null?'—':esc(x)}${dnf?'<small> · 미완주</small>':''}</i></span>`; }).join('')}</div><span class="rec-sum" title="${esc(sum(r).toLocaleString()+(r['순위']?' · '+r['순위']:''))}"><b>${sum(r).toLocaleString()}</b>${r['순위']?` · ${esc(recRank(r['순위']))}`:''}</span></div>`; };
  h += `<div class="rec-bars">${rows.map(row).join('')}</div><p class="muted tp-small">위의 ‹ ›로 보는 시즌을 바꾸면 그 시즌을 가운데에 두고 앞뒤 시즌과 비교합니다.</p>`;
  el.innerHTML = h; }
/* 입력 검사: 배점을 넘거나 음수면 빨간 테두리 + 범위 표시, 그 칸은 쌓지 않음. 미완주 종목은 0으로 잠금 (내구 미완주면 효율도) */
function recCheck(i){ if(i.type!=='number') return true; const v=i.value.trim(), mx=+i.dataset.max; const bad = v!=='' && (!isFinite(+v) || +v<0 || +v>mx); i.classList.toggle('rec-bad', bad); const e=i.parentElement.querySelector('.rec-err'); if(e) e.hidden=!bad; return !bad; }
function recRead(){ const o={}; document.querySelectorAll('#fsRec [data-rc]').forEach(i=>{ const v=i.value.trim(); if(!recCheck(i)) return; if(v!=='') o[i.dataset.rc] = i.type==='number' ? +v : v; }); const d=[...document.querySelectorAll('#fsRec [data-rdnf]:checked')].map(i=>i.dataset.rdnf); if(d.length){ o['미완주']=d; d.forEach(c=>{ if(o[c]==null) o[c]=0; }); } return o; }
async function recSave(){ if(!RECSTAGE) return; const next = RECSTAGE; RECSTAGE = null;
  if(!SH.on){ REC = next; try{ localStorage.setItem('run2x.records.v1', JSON.stringify(REC)); }catch(e){} renderRecords(); return; }
  await SH.db.doc('meta/records').set(next); REC = next; renderRecords(); }
/* 저장 막대 목록: 바뀐 시즌마다 '종목 이전 → 이후' */
function recItems(){ if(!RECSTAGE) return []; const ys=[...new Set([...Object.keys(RECSTAGE),...Object.keys(REC)])].filter(y=>JSON.stringify(RECSTAGE[y]||null)!==JSON.stringify(REC[y]||null));
  return ys.map(y=>{ const a=REC[y]||{}, b=RECSTAGE[y]||{}; const ks=[...FS_SCORE.map(x=>x[0]),'순위','미완주'].filter(k=>JSON.stringify(a[k]??null)!==JSON.stringify(b[k]??null));
    const fmt=v=>Array.isArray(v)?(v.join('·')||'없음'):(v??'—');
    return {key:y, c:'기록', n:`${y} 시즌`, p:'대회 점수', change:ks.map(k=>`${k} ${fmt(a[k])} → ${fmt(b[k])}`).join(' · '),
      go(){ if(TAB!=='team') showTab('team'); const sb=document.querySelector('#v-team [data-tts=score]'); if(sb) sb.click(); setTimeout(()=>{ const el=document.getElementById('fsRec'); if(el) smoothScrollTo(()=>el.getBoundingClientRect().top+scrollY-120); }, 500); },
      revert(){ const base=JSON.parse(JSON.stringify(RECSTAGE)); if(REC[y]) base[y]=JSON.parse(JSON.stringify(REC[y])); else delete base[y]; RECSTAGE = JSON.stringify(base)===JSON.stringify(REC) ? null : base; renderRecords(); DRAFT.paint(); } }; }); }
DRAFT.add({ n:()=>RECSTAGE?1:0, label:()=>'우리 팀 기록', items: recItems, save: recSave, revert(){ RECSTAGE=null; RECEDIT=false; renderRecords(); } });
document.addEventListener('click', e=>{
  const re=e.target.closest('[data-recedit]'); if(re){ e.preventDefault(); RECEDIT=true; RECY=re.dataset.recy||SEASON; renderRecords(); const i=document.querySelector('#fsRec [data-rc]'); if(i) i.focus(); return; }
  if(e.target.closest('[data-recok]')){ e.preventDefault(); RECEDIT=false; renderRecords(); return; }
  if(e.target.closest('[data-recno]')){ e.preventDefault(); RECEDIT=false; RECSTAGE=null; renderRecords(); DRAFT.paint(); return; } });
document.addEventListener('change', e=>{ if(e.target.matches && e.target.matches('#fsRec .rec-y') && /^\d{4}$/.test(e.target.value)){ RECY=e.target.value; renderRecords(); } });
document.addEventListener('change', e=>{ const cb=e.target.closest && e.target.closest('#fsRec [data-rdnf]'); if(!cb) return; const lock=(c,on)=>{ const n=document.querySelector(`#fsRec [data-rc="${c}"]`), k=document.querySelector(`#fsRec [data-rdnf="${c}"]`); if(k) k.checked=on; if(n){ n.disabled=on; if(on){ n.value='0'; recCheck(n); } } };
  lock(cb.dataset.rdnf, cb.checked); if(cb.dataset.rdnf==='내구' && cb.checked) lock('효율', true);
  cb.dispatchEvent(new Event('input', {bubbles:true})); }, true);   /* 잠근 0 을 다시 쌓음 (체크칸의 input 은 change 보다 먼저 오므로) */
document.addEventListener('input', e=>{ if(!e.target.closest || !e.target.closest('#fsRec [data-rc],#fsRec [data-rdnf]')) return;
  const base = JSON.parse(JSON.stringify(RECSTAGE || REC)), S = RECY || SEASON; const r = recRead(); if(Object.keys(r).length) base[S] = r; else delete base[S];
  RECSTAGE = JSON.stringify(base)===JSON.stringify(REC) ? null : base; DRAFT.paint(); });
{ const _osr=onSharedReady; onSharedReady=function(db){ _osr(db); db.doc('meta/records').onSnapshot(sn=>{ REC = sn.exists ? (sn.data()||{}) : {}; if(!RECEDIT) renderRecords(); }, ()=>{}); }; }
{ const _as=afterSeason; afterSeason=function(){ const r=_as.apply(this,arguments); try{ renderRecords(); }catch(e){} return r; }; }
