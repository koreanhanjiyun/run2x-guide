// 도구 2 점검: 작업창 · 결과 · 검증표(코드 창 안) · 코스 5개 전환 · 내구 랩 고르기 · 내 코스(붙여넣기 · 닫힌 경로 · 랩 수 · 출발 위치)
//   · .xlsx / .csv 가져오기 · 양식 받기 · 모터 탭(토크 열 · 효율 맵) · 입력 훑기(감속비) · 모양 보기 · 목표 기록 · 사용법 · 대시보드 파트별.
//   node tool2_check.js [스크린샷 폴더] [xlsx] [csv]
const H=require('./h.js'); const [out, xlsx, csv]=process.argv.slice(2);
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead');
  const R=()=>p.evaluate(()=>WB.R&&WB.R.out); const f=(v,d=2)=>typeof v==='number'?v.toFixed(d):v; const W=ms=>H.sleep(ms);
  const done=async(ms=6000)=>{ const t0=Date.now(); await W(250); while(Date.now()-t0<ms){ if(await p.evaluate(()=>!WB.timer||true)) break; } await W(ms); };
  await p.evaluate(()=>showTab('tools')); await W(600); await p.evaluate(()=>wbOpen('2')); await W(4000);
  let o=await R(); console.log('open', f(o.t_acc_s,3), f(o.t_skid_s,3), f(o.t_ax_s), f(o.t_end_s,1), o.n_lap, o.n_st1, 'gr', o.gr_opt, o.gr_acc, o.gr_ax, o.gr_end, 'plim', f(o.p_lim,1), 'e', f(o.e_use), '/', f(o.e_cap), 'err', await p.evaluate(()=>WB.err));
  console.log('dots', await p.evaluate(()=>[...document.querySelectorAll('.wb-in .wb-st')].length), 'sq', await p.evaluate(()=>document.querySelectorAll('.wb-in .wb-st.sq').length), 'legend', await p.evaluate(()=>!!document.querySelector('.wb-inleg')));
  await p.click('.wb-bar [data-wbcode]'); await W(300); await p.click('#wbm [data-wbver]'); await W(30000); console.log('verify', (await p.textContent('#wbm .dvi-foot')).trim().slice(0,40)); await p.click('#wbm [data-wbmx]');
  for(const c of ['ax','acc','skid','free','end']){ await p.click(`[data-t2course="${c}"]`); await W(4500); const r=await p.evaluate(()=>({n:WB.R&&WB.R.x.d.length, main:document.querySelectorAll('#wbmain polyline').length, lap:!!document.querySelector('[data-t2lap]'), map:document.querySelectorAll('#t2map line').length, cones:document.querySelectorAll('#t2map .t2-cone').length, arr:!!document.querySelector('#t2map .t2-arr'), sl:!!document.querySelector('#t2map .t2-sl'), fin:!!document.querySelector('#t2map .t2-fin'), err:WB.err}));
    console.log('course', c, JSON.stringify(r)); if(out) await p.screenshot({path:`${out}/t2_${c}.png`}); }
  for(const l of ['1','14','all','2']){ await p.selectOption('[data-t2lap]', l); await W(4500); console.log('lap', l, await p.evaluate(()=>WB.R.x.d.length+' '+(document.querySelector('#t2mcap')||{}).textContent)); }
  console.log('laptable', await p.locator('.t2-lt button').count()); await p.click('.t2-lt [data-t2lapgo="5"]'); await W(4500); console.log('lapgo', await p.evaluate(()=>T2.lap.end), await p.locator('[data-t2lap]').inputValue());
  // 내 코스
  await p.click('[data-t2course="free"]'); await W(4000);
  await p.fill('#t2trk',''); await W(1200); console.log('empty', await p.textContent('#t2tmsg'), await p.getAttribute('#t2trk','placeholder').then(s=>s.split('\n')[0]));
  await p.fill('#t2trk','직선, 100\n왼쪽, 31.4159, 10\n직선, 100\n왼쪽, 31.4159, 10'); await W(4500); o=await R();
  console.log('paste', (await p.textContent('#t2tmsg')).trim(), 'rows', await p.locator('.t2-tt tbody tr').count(), f(o.t_free1), f(o.t_free2), 'readonly', await p.locator('.t2-tt input').count());
  await p.locator('[data-t2o="laps"]').fill('5'); await W(4500); o=await R(); console.log('laps', o.n_free, await p.locator('[data-t2lap] option').count(), await p.locator('.t2-lt button').count());
  await p.locator('[data-t2o="s0"]').fill('50'); await W(4500); o=await R(); console.log('s0', f(o.t_free1), f(o.t_free2));
  await p.click('[data-t2o="closed"]'); await W(4500); o=await R(); console.log('open path', o.n_free, f(o.t_free), !!(await p.$('[data-t2lap]')));
  await p.click('[data-t2o="closed"]'); await W(3000);
  if(xlsx){ await p.setInputFiles('[data-t2file="track"]', xlsx); await W(4000); console.log('xlsx', await p.locator('.t2-tt tbody tr').count(), await p.evaluate(()=>t2Track(T2.free.text).rows.slice(0,4).map(r=>[+r.l.toFixed(2),r.R]).join(' | ')), await p.evaluate(()=>document.querySelector('#toast')?.textContent)); }
  if(csv){ await p.setInputFiles('[data-t2file="track"]', csv); await W(4000); console.log('csv', await p.evaluate(()=>t2Track(T2.free.text).rows.map(r=>[r.l,r.R]).join(' | ')), await p.evaluate(()=>document.querySelector('#toast')?.textContent)); }
  for(const k of ['track.csv','track.xlsx']){ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null), p.click('[data-t2tpl="'+k+'"]')]); console.log('tpl', k, dl?dl.suggestedFilename():'none'); }
  await p.click('[data-t2ex="track"]'); await W(4000); console.log('example', (await p.textContent('#t2tmsg')).trim().slice(0,30));
  if(out) await p.screenshot({path:out+'/t2_free.png'});
  // 모터 탭
  await p.click('[data-t2tab="motor"]'); await W(500);
  console.log('motor', (await p.textContent('#t2mtmsg')).trim(), 'cols', await p.locator('[data-t2mcol] option').count(), 'eM', (await p.textContent('#t2eMmsg')).trim().slice(0,40), 'plots', await p.locator('#t2mc .wb-plot, #t2mc svg').count(), 'heat', await p.locator('#t2mc .t2-heat').count());
  const t0=(await R()).t_acc_s; await p.selectOption('[data-t2mcol]','2'); await W(4500); console.log('col2 acc', f(t0,3), '->', f((await R()).t_acc_s,3));
  await p.selectOption('[data-t2mcol]','1'); await W(3000);
  await p.fill('#t2eI','95'); await W(4500); console.log('eI const', (await p.textContent('#t2eImsg')).trim(), f((await R()).e_use));
  await p.click('[data-t2ex="eI0"]'); await W(4000); await p.click('[data-t2ex="eM0"]'); await W(4000); console.log('eM cleared', (await p.textContent('#t2eMmsg')).trim(), f((await R()).e_use));
  await p.click('[data-t2ex="eM"]'); await W(4000);
  if(out) await p.screenshot({path:out+'/t2_motor.png'});
  await p.click('[data-t2tab="course"]'); await W(300); await p.click('[data-t2course="end"]'); await W(4500);
  // 모양 보기: 하중 감도
  await p.click('[data-wbviz="mu_s"]'); await W(400); console.log('viz', await p.evaluate(()=>!!document.querySelector('#wbvz .wb-plot')));
  await p.keyboard.press('Escape'); await W(200);
  // 목표 기록 · 스키드패드 필요 C_L·A
  await p.locator('[data-wbi="t_ax"]').fill('45'); await W(4500); console.log('goal', (await p.evaluate(()=>document.querySelector('#wbout .t2-gd')?.textContent)));
  await p.locator('[data-wbi="t_skid"]').fill('4.6'); await W(4500); o=await R(); console.log('cla_req', f(o.cla_req));
  await p.locator('[data-wbi="e_target"]').fill('5'); await W(5000); o=await R(); console.log('e_target 5', f(o.p_lim,1), f(o.e_use), o.e_ok);
  console.log('score text', await p.evaluate(()=>/점수|\/ \d+점/.test(document.querySelector('#wbout').textContent)));
  console.log('own ring', await p.evaluate(()=>document.querySelectorAll('.wb-in .wb-st.own').length));
  await p.selectOption('[data-wbxa]','in:gr'); await W(25000); console.log('sweep', await p.evaluate(()=>WB.sw&&WB.sw.X?WB.sw.X.length+' '+(WB.sw.err||''):'none'), await p.evaluate(()=>WB.err));
  await p.selectOption('[data-wbxa]',''); await W(4500);
  await p.locator('#wbmain svg .wb-hit').click({position:{x:300,y:100}}); await W(300);
  console.log('cursor', await p.evaluate(()=>WB.xi), await p.evaluate(()=>!!document.querySelector('#t2map .t2-cur')), 'probe', await p.locator('#wbmain .wb-pv').count());
  if(out) await p.screenshot({path:out+'/t2_end.png'});
  await p.evaluate(()=>tourStart('wb:2')); await W(1500); const seen=[];
  for(let i=0;i<20;i++){ seen.push(await p.evaluate(()=>document.querySelector('.tour-n')?.textContent)); const nx=await p.$('[data-tour-next]'); if(!nx || /마치기/.test(await nx.textContent())) break; await nx.click(); await W(5000); }
  console.log('tour', seen.join(','));
  await p.evaluate(()=>{ try{ tourStop(); }catch(e){} }); await W(3000); console.log('after tour', await p.evaluate(()=>T2.course+' '+T2.tab));
  await p.evaluate(()=>wbClose()); await W(300);
  for(const k of ['goal','pt']){ await p.evaluate(k=>{ DASH.part=k; dashPaint(['part']); }, k); await W(6000); console.log('part', k, (await p.textContent('#t2part')).replace(/\s+/g,' ').slice(0,120)); }
  console.log('errs', JSON.stringify(p.errs), JSON.stringify(p.cons)); await b.close(); await H.end(); })();
