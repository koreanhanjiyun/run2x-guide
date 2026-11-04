// 도구 2 점검: 작업창 · 결과 · 검증표 · 결과 그래프 전환 · 구간 표 고치기 · 글로 편집 · .xlsx / .csv 가져오기 · 닫힌 경로 · 바퀴 수 · 출발 위치 · 바퀴 고르기
//   · 입력 훑기(감속비) · 모양 보기(하중 감도) · 사용법 · 대시보드 파트별.  node tool2_check.js [스크린샷 폴더] [xlsx] [csv]
const H=require('./h.js'); const [out, xlsx, csv]=process.argv.slice(2);
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead');
  const R=()=>p.evaluate(()=>WB.R&&WB.R.out); const f=(v,d=2)=>typeof v==='number'?v.toFixed(d):v;
  await p.evaluate(()=>showTab('tools')); await H.sleep(600); await p.evaluate(()=>wbOpen('2')); await H.sleep(1500);
  let o=await R(); console.log('open', f(o.t_ax_s), f(o.t_lap1), f(o.t_fly), f(o.t_end_s,1), o.n_lap, o.n_st1, 'gr', o.gr_opt);
  await p.click('[data-wbver]'); await H.sleep(3000); console.log('verify', (await p.textContent('#wbm .dvi-foot')).trim().slice(0,22)); await p.click('#wbm [data-wbmx]');
  for(const v of ['end','acc','ft','ax']){ await p.click(`[data-t2view="${v}"]`); await H.sleep(900); const r=await p.evaluate(()=>({n:WB.R&&WB.R.x.d.length, main:document.querySelectorAll('#wbmain polyline').length, lap:!!document.querySelector('[data-t2lap]')})); console.log('view', v, JSON.stringify(r)); }
  await p.click('[data-t2view="end"]'); await H.sleep(700);
  for(const l of ['1','all','2']){ await p.selectOption('[data-t2lap]', l); await H.sleep(900); console.log('lap', l, await p.evaluate(()=>WB.R.x.d.length+' '+(document.querySelector('#t2mcap')||{}).textContent)); }
  // 구간 표: 첫 줄 길이 25 → 45
  const before=(await R()).t_fly; const inp=p.locator('[data-t2r="0"] [data-t2f="l"]'); await inp.fill('45'); await H.sleep(1200);
  console.log('table edit', f(before), '->', f((await R()).t_fly), await p.textContent('#t2tmsg'));
  await p.click('[data-t2r="0"] [data-t2rb="add"]'); await H.sleep(800); console.log('rows', await p.locator('[data-t2r]').count());
  await p.click('[data-t2r="1"] [data-t2rb="del"]'); await H.sleep(800); console.log('rows', await p.locator('[data-t2r]').count());
  // 회전 줄: 각도 고치면 길이
  await p.locator('[data-t2r="10"] [data-t2f="ang"]').fill('180'); await H.sleep(600); console.log('ang->len', await p.locator('[data-t2r="10"] [data-t2f="l"]').inputValue());
  // 바퀴 수 · 출발 위치
  await p.locator('[data-t2o="laps"]').fill('10'); await H.sleep(1200); o=await R(); console.log('laps', o.n_lap, o.n_st1);
  await p.locator('[data-t2o="s0"]').fill('120'); await H.sleep(1200); o=await R(); console.log('s0', f(o.t_lap1), f(o.t_fly));
  await p.click('[data-t2o="closed"]'); await H.sleep(1200); o=await R(); console.log('open path', o.n_lap, f(o.t_end_s), await p.textContent('#t2lap'));
  await p.click('[data-t2o="closed"]'); await H.sleep(800);
  // 글로 편집
  await p.click('[data-t2mode="text"]'); await H.sleep(400); await p.fill('#t2trk','100\t0\n31.4159\t10\n100\t0\n31.4159\t10'); await H.sleep(1300);
  console.log('text', await p.textContent('#t2tmsg'), f((await R()).t_ax_s));
  await p.click('[data-t2mode="table"]'); await H.sleep(400);
  if(xlsx){ await p.setInputFiles('[data-t2file]', xlsx); await H.sleep(1500); console.log('xlsx', await p.locator('[data-t2r]').count(), await p.evaluate(()=>JSON.stringify(T2.rows.map(r=>[+r.l.toFixed(2),r.R,r.note])))); }
  if(csv){ await p.setInputFiles('[data-t2file]', csv); await H.sleep(1500); console.log('csv', await p.evaluate(()=>JSON.stringify(T2.rows.map(r=>[r.l,r.R])))); }
  if(out){ await p.screenshot({path:out+'/t2_track.png'}); }
  await p.click('[data-t2ex="track"]'); await H.sleep(1000);
  // 모양 보기: 하중 감도
  await p.click('[data-wbviz="mu_s"]'); await H.sleep(400); console.log('viz', await p.evaluate(()=>!!document.querySelector('#wbvz .wb-plot')));
  await p.locator('[data-wbi="mu_s"]').fill('0.15'); await H.sleep(500); console.log('viz live', await p.evaluate(()=>!!document.querySelector('#wbvz .wb-plot')));
  if(out) await p.screenshot({path:out+'/t2_viz.png'});
  await p.keyboard.press('Escape'); await H.sleep(200); console.log('viz closed', await p.evaluate(()=>!document.querySelector('#wbvz')));
  // 목표 기록
  await p.locator('[data-wbi="t_ax"]').fill('45'); await H.sleep(1500); console.log('goal', (await p.evaluate(()=>document.querySelector('#wbout .t2-gd')?.textContent)));
  await p.selectOption('[data-wbxa]','in:gr'); await H.sleep(3000); console.log('sweep', await p.evaluate(()=>WB.sw&&WB.sw.X?WB.sw.X.length+' '+(WB.sw.err||''):'none'));
  await p.locator('#wbmain svg .wb-hit').click({position:{x:300,y:100}}); await H.sleep(300);
  console.log('cursor', await p.evaluate(()=>WB.xi), await p.evaluate(()=>!!document.querySelector('#t2map .t2-cur')));
  await p.evaluate(()=>tourStart('wb:2')); await H.sleep(1500); const seen=[];
  for(let i=0;i<20;i++){ seen.push(await p.evaluate(()=>document.querySelector('.tour-n')?.textContent)); const nx=await p.$('[data-tour-next]'); if(!nx || /마치기/.test(await nx.textContent())) break; await nx.click(); await H.sleep(2600); }
  console.log('tour', seen.join(','));
  await p.evaluate(()=>{ try{ tourStop(); }catch(e){} }); await p.evaluate(()=>wbClose()); await H.sleep(300);
  for(const k of ['goal','pt']){ await p.evaluate(k=>{ DASH.part=k; dashPaint(['part']); }, k); await H.sleep(1800); console.log('part', k, (await p.textContent('#t2part')).replace(/\s+/g,' ').slice(0,90)); }
  console.log('errs', JSON.stringify(p.errs), JSON.stringify(p.cons)); await b.close(); await H.end(); })();
