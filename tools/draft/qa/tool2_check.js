// 도구 2 점검: [시뮬레이션 | 맵 편집] · 결과(두 모드 미리 계산 · 줄 맞춤 · ± · m s 표기) · 검증표 · 코스 5개 · 볼 랩 · 지도(색 범위 고정 · 확대 · 누르기 프로브)
//   · 구동력 선도 프로브(멈춘 뒤 계산) · 맵 편집(코스 표 고치기 · 입력하기 · 공식 코스 막힘 · 모터 · 효율 · 타이어 표 → 입력 칸 막힘) · 입력 훑기 · 사용법 · 대시보드 파트별.
//   node tool2_check.js [스크린샷 폴더] [xlsx] [csv]
const H=require('./h.js'); const [out, xlsx, csv]=process.argv.slice(2);
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead');
  const R=()=>p.evaluate(()=>WB.R&&WB.R.out); const f=(v,d=2)=>typeof v==='number'?v.toFixed(d):v; const W=ms=>H.sleep(ms); const et=async k=>{ if(k==='tire'){ await p.click('[data-t2eg="tire"]'); } else { await p.click('[data-t2eg="mot"]'); await W(300); await p.click(`[data-t2et="${k}"]`); } }; const idle=async()=>{ await W(800); for(let i=0;i<150 && await p.evaluate(()=>WB.busy);i++) await W(200); };
  const rows=()=>p.evaluate(()=>t2Track(T2.free.text).rows.map(r=>[+r.l.toFixed(2),+r.R.toFixed(2)]).join(' | '));
  const cell=async(i,k,v)=>{ await p.click(`#t2tt [data-t2e="${i},${k}"]`); await W(150); const e=await p.$(`#t2tt [data-t2e="${i},${k}"] .t2-ci`); if(e.tagName && false); if(await e.evaluate(x=>x.tagName)==='SELECT') await e.selectOption(v); else { await e.fill(String(v)); await e.press('Enter'); } await W(400); };
  await p.evaluate(()=>showTab('tools')); await W(600); await p.evaluate(()=>wbOpen('2')); await W(7000);
  let o=await R(); console.log('open', 'gr_use', o.gr_use, 'acc', f(o.t_acc_s,3), 'skid', f(o.t_skid_s,3), 'ax', f(o.t_ax_s), 'end', f(o.t_end_s,1), 'gr', o.gr_opt, o.gr_acc, o.gr_ax, o.gr_end, 'd', f(o.d_acc,3), f(o.d_end,2), 'ms', await p.evaluate(()=>Math.round(WB.ms)), 'err', await p.evaluate(()=>WB.err));
  console.log('layout', 'cards', await p.locator('#wbout .t2-oc').count(), 'rows g/rec', await p.locator('#wbout .t2-oc.g .t2-r').count(), await p.locator('#wbout .t2-orow:first-child .t2-oc:nth-child(2) .t2-r').count(),
    'align', await p.evaluate(()=>{ const a=[...document.querySelectorAll('#wbout .t2-oc.g .t2-r')].map(r=>Math.round(r.getBoundingClientRect().top)), b=[...document.querySelectorAll('#wbout .t2-orow:first-child .t2-oc:nth-child(2) .t2-r')].map(r=>Math.round(r.getBoundingClientRect().top)); return a.length===b.length && a.every((v,i)=>v===b[i]); }),
    'vright', await p.evaluate(()=>{ const r=[...document.querySelectorAll('#wbout .t2-orow:first-child .t2-oc:nth-child(2) .t2-r .v')].map(v=>Math.round(v.getBoundingClientRect().right)); return new Set(r).size===1; }),
    'mid', await p.locator('#wbmid .t2-ftw, #wbmid .t2-mapw').count(), 'msfmt', await p.evaluate(()=>[...document.querySelectorAll('#wbout b')].map(x=>x.textContent).find(t=>/\dm \d/.test(t))), 'dt', await p.evaluate(()=>[...document.querySelectorAll('#wbout .t2-dt')].map(x=>x.textContent).join(' ')));
  const t0=Date.now(); await p.click('[data-t2gm="opt"]'); await W(300); o=await R(); console.log('opt instant', Date.now()-t0 < 1500, 'gr_use', o.gr_use, 'c_gr', o.c_gr, (await p.textContent('#wbout .t2-orow:first-child .t2-oc:nth-child(2) h4')).trim().slice(0,40));
  if(out) await p.screenshot({path:out+'/t2_opt.png'});
  await p.click('[data-t2gm="my"]'); await W(300); console.log('my back', (await R()).gr_use);
  await p.click('.wb-bar [data-wbcode]'); await W(300); await p.click('#wbm [data-wbver]'); await W(45000); console.log('verify', (await p.textContent('#wbm .dvi-foot')).trim().slice(0,40)); await p.click('#wbm [data-wbmx]');
  // 구동력 선도 프로브
  await p.evaluate(()=>document.querySelector('#wbsig').scrollIntoView({block:'center'})); await W(300); await p.locator('#wbsig svg .wb-hit').click({position:{x:300,y:100}}); await W(150); console.log('pf moving', await p.evaluate(()=>{ const o=document.querySelector('#t2ftov'); return o && !o.hidden ? o.textContent : 'hidden'; }));
  await W(2500); console.log('pf plot no hit', await p.evaluate(()=>!document.querySelector('#t2ft .wb-hit')), 'pf lines', await p.locator('#t2ft polyline').count());
  { const xi=await p.evaluate(()=>WB.xi); const bx=await (await p.$('#t2ft svg')).boundingBox(); await p.mouse.click(bx.x+bx.width*0.8, bx.y+bx.height*0.5); await W(300); console.log('pf click keeps cursor', xi===await p.evaluate(()=>WB.xi)); }
  console.log('pf done', await p.evaluate(()=>document.querySelector('#t2ftov').hidden), (await p.textContent('#t2ftv')).replace(/\s+/g,' ').slice(0,160));
  // 코스 · 볼 랩 · 지도
  for(const c of ['ax','acc','skid','free','end']){ await p.click(`.t2-hr [data-t2course="${c}"]`); await W(7000); const r=await p.evaluate(()=>({n:WB.R&&WB.R.x.d.length, lapsel:document.querySelector('[data-t2lap]').disabled, cones:document.querySelectorAll('#t2map .t2-cone').length, cap:(document.querySelector('#t2mcap')||{}).textContent.slice(0,60), card:(document.querySelector('#wbout .t2-orow:nth-child(2) h4 span')||{}).textContent, err:WB.err}));
    console.log('course', c, JSON.stringify(r)); if(out) await p.screenshot({path:`${out}/t2_${c}.png`}); }
  for(const l of ['1','14','all']){ await p.selectOption('[data-t2lap]', l); await W(7000); o=await R(); console.log('lap', l, 'c_lap', o.c_lap, f(o.c_t), 'cap', (await p.textContent('#t2mcap')).slice(0,40)); }
  await p.selectOption('[data-t2lap]', '2'); await W(7000);
  await p.evaluate(()=>document.querySelector('#t2map').scrollIntoView({block:'center'})); await W(300); const box=await (await p.$('#t2map svg')).boundingBox(); await p.mouse.move(box.x+box.width*0.5, box.y+box.height*0.5); await p.mouse.wheel(0,-300); await W(300); console.log('zoom', await p.evaluate(()=>T2.zoom.k.toFixed(2)));
  await p.mouse.move(box.x+box.width*0.3, box.y+box.height*0.5); await p.mouse.down(); await p.mouse.move(box.x+box.width*0.4, box.y+box.height*0.55, {steps:5}); await p.mouse.up(); await W(200); console.log('pan', await p.evaluate(()=>T2.zoom.cx.toFixed(3)));
  await p.click('[data-t2z="fit"]'); await W(200); await p.evaluate(()=>document.querySelector('#t2map').scrollIntoView({block:'center'})); await W(300); const xi0=await p.evaluate(()=>WB.xi); const pt=await p.evaluate(()=>{ const s=document.querySelector('#t2map svg'), q=T2.mp.pts[Math.floor(T2.mp.pts.length/3)], m=s.getScreenCTM(); return [q[0]*m.a+m.e, q[1]*m.d+m.f]; });
  await p.mouse.click(pt[0], pt[1]); await W(300); console.log('map probe', xi0, '->', await p.evaluate(()=>WB.xi), 'n', await p.evaluate(()=>WB.R.x.d.length));
  // 그래프 칸: 추가 · 고르기 · 높이
  await p.evaluate(()=>document.querySelector('#wbsig').scrollIntoView({block:'center'})); await p.click('[data-wbpadd]'); await W(400);
  console.log('pane add', await p.locator('#wbsig .wb-pp').count(), 'on', await p.evaluate(()=>WB.pi), 'padd below', await p.evaluate(()=>{ const b=document.querySelector('.wb-padd'), last=[...document.querySelectorAll('#wbsig .wb-pp')].pop(); return b.getBoundingClientRect().top >= last.getBoundingClientRect().bottom - 1; }));
  await p.click('#wbsig .wb-pp[data-wbpi="0"]', {position:{x:300,y:60}}); await W(300); console.log('pane select', await p.evaluate(()=>WB.pi), await p.evaluate(()=>document.querySelector('#wbsig .wb-pp[data-wbpi="0"]').classList.contains('on')));
  { const h=await (await p.$('#wbsig .wb-pp[data-wbpi="0"] .wb-ph')).boundingBox(); const h0=await p.evaluate(()=>document.querySelector('#wbsig .wb-pp[data-wbpi="0"] svg').getBoundingClientRect().height);
    await p.mouse.move(h.x+h.width/2, h.y+3); await p.mouse.down(); await p.mouse.move(h.x+h.width/2, h.y+83, {steps:6}); await p.mouse.up(); await W(300);
    console.log('pane resize', Math.round(h0), '->', Math.round(await p.evaluate(()=>document.querySelector('#wbsig .wb-pp[data-wbpi="0"] svg').getBoundingClientRect().height))); }
  await p.click('#wbsig [data-wbpdel="1"]'); await W(300); console.log('pane del', await p.locator('#wbsig .wb-pp').count());
  await p.evaluate(()=>{ WB_PH=[]; localStorage.removeItem('run2x.wb.ph'); });
  // 맵 편집: 코스
  await p.click('[data-t2tab="edit"]'); await W(500); console.log('edit hides', await p.evaluate(()=>getComputedStyle(document.querySelector('#wbmid')).display), await p.evaluate(()=>getComputedStyle(document.querySelector('#wb .wb-sec[aria-label="결과"]')).display));
  console.log('official menu disabled', await p.evaluate(()=>document.querySelector('[data-t2menu="track"]').disabled), 'ro', await p.evaluate(()=>document.querySelector('#t2tt').classList.contains('ro')), 'tops', await p.evaluate(()=>{ const a=document.querySelector('#t2tt').getBoundingClientRect(), b=document.querySelector('#t2emap').getBoundingClientRect(); return Math.round(a.top-b.top)+'/'+Math.round(a.height-b.height); }));
  { const pt=await p.evaluate(()=>{ const s=document.querySelector('#t2emap svg'), q=T2.mpE.pts[400], m=s.getScreenCTM(); return [q[0]*m.a+m.e, q[1]*m.d+m.f]; }); await p.mouse.click(pt[0], pt[1]); await W(300); console.log('map → row', await p.evaluate(()=>{ const r=document.querySelector('#t2tt tr.t2-hl'); return r ? [...r.parentNode.children].indexOf(r)+1 : 0; })); }
  await p.click('.t2-set [data-t2ecourse="free"]'); await W(4000);
  console.log('track menu no paste', await (async()=>{ await p.click('[data-t2menu="track"]'); await W(200); const n=await p.locator('[data-t2act="paste"]').count(); await p.click('[data-t2menu="track"]'); await W(200); return n===0; })());
  const ctrlV=async txt=>{ await p.evaluate(t=>{ const dt=new DataTransfer(); dt.setData('text/plain', t); document.querySelector('#t2tt').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); }, txt); await W(500); };
  await ctrlV('종류\t길이 m\t반경 m\t왼쪽 폭 m\t오른쪽 폭 m\t슬라럼 콘 간격 m\t메모\n직선\t100\t\t2\t2\t20\t슬라럼\n왼쪽\t31.4159\t10\t3\t\t\t\n직선\t100\t\t\t\t\t\n왼쪽\t31.4159\t10\t\t\t8\t곡선 슬라럼');
  console.log('ctrl+v', await rows(), (await p.textContent('#t2sum')).trim(), 'w', await p.evaluate(()=>t2Track(T2.free.text).rows.map(r=>[r.wl,r.wr,r.sl].map(x=>isFinite(x)?x:'-').join('/')).join(' ')), 'cones', await p.evaluate(()=>{ const c=t2FreeCones(); return ['L','R','C'].map(k=>c.filter(x=>x[2]===k).length).join('/'); }), 'inh', await p.locator('#t2tt .t2-inh').count());
  await ctrlV('직선\t100\n왼쪽\t31.4159\t10\n직선\t100\n왼쪽\t31.4159\t10');
  console.log('ctrl+v no head', await rows());
  await cell(0,'l',120); await cell(1,'type','오른쪽'); await cell(1,'ang',90); console.log('edit', await rows());
  await cell(3,'no',1); console.log('move 4→1', await rows()); await p.click('#t2tt [data-t2del="0"]'); await W(400); await p.click('#t2tt [data-t2add]'); await W(400); console.log('del · add', await rows());
  await p.locator('[data-t2o="laps"]').fill('5'); await W(500);
  if(xlsx){ await p.click('[data-t2menu="track"]'); await W(200); await p.setInputFiles('[data-t2file="track"]', xlsx); await W(1500); console.log('xlsx', await rows(), await p.evaluate(()=>document.querySelector('#toast')?.textContent)); }
  if(csv){ await p.click('[data-t2menu="track"]'); await W(200); await p.setInputFiles('[data-t2file="track"]', csv); await W(1500); console.log('csv', await rows()); }
  for(const k of ['track.csv','tire.xlsx']){ await p.click(k.startsWith('track') ? '[data-t2menu="track"]' : '[data-t2menu="track"]'); await W(200); const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null), p.click(`[data-t2tpl="${k.startsWith('track') ? k : 'track.xlsx'}"]`)]); console.log('tpl', k, !!dl); if(dl && out) await dl.saveAs(out+'/tpl_'+k); }
  await p.click('[data-t2menu="track"]'); await W(200); await p.click('[data-t2act="ex"]'); await W(500); console.log('example', (await p.textContent('#t2sum')).trim());
  if(out) await p.screenshot({path:out+'/t2_edit_course.png'});
  // 맵 편집: 모터 · 효율 · 타이어
  await p.click('[data-t2menu="track"]'); await W(200); await p.click('[data-t2act="clear"]'); await W(600); console.log('free cleared', await rows(), await p.evaluate(()=>!!document.querySelector('#t2emap')));
  await p.click('[data-t2tab="sim"]'); await W(500); await p.click('.t2-hr [data-t2course="free"]'); await W(7000); console.log('free empty sim err', JSON.stringify(await p.evaluate(()=>WB.err)), 'errs', p.errs.length);
  await p.click('[data-t2tab="edit"]'); await W(400); await p.click('[data-t2add]'); await W(400); console.log('add to empty', await rows());
  await p.click('[data-t2menu="track"]'); await W(200); await p.click('[data-t2act="ex"]'); await W(500);
  for(const k of ['mt','eM','eI','tire']){ await et(k); await W(500); console.log('edit', k, 'same h', await p.evaluate(()=>{ const a=document.querySelector('#t2tt').getBoundingClientRect(), b=document.querySelector('#t2mc').getBoundingClientRect(); return Math.round(a.top-b.top)+'/'+Math.round(a.height-b.height); }), 'const', await p.evaluate(()=>(document.querySelector('.t2-const')||{}).textContent||''), (await p.textContent('#t2msum')).trim().slice(0,60), 'cells', await p.locator('#t2tt [data-t2e]').count(), 'svg', await p.locator('#t2mc svg').count()); if(out) await p.screenshot({path:`${out}/t2_e_${k}.png`}); }
  await et('eM'); await W(400); await p.click('#t2mc rect[data-ij="10,5"]'); await W(300); console.log('heat → cell', await p.evaluate(()=>{ const c=document.querySelector('#t2tt .t2-hl'); return c ? c.dataset.t2e : 'none'; }));
  await et('eI'); await W(300); await p.click('[data-t2gadd="row"]'); await W(300); await p.click('[data-t2gadd="col"]'); await W(300); console.log('eI grid', JSON.stringify(await p.evaluate(()=>t2Grid(T2.eI))));
  await p.click('[data-t2menu="eI"]'); await W(200); await p.click('[data-t2act="clear"]'); await W(300);
  await et('mt'); await W(400); { await p.evaluate(()=>document.querySelector('#t2mc').scrollIntoView({block:'center'})); await W(200); const bx=await (await p.$('#t2mc svg')).boundingBox(); await p.mouse.click(bx.x+bx.width*0.6, bx.y+bx.height*0.5); await W(300); console.log('torque → row', await p.evaluate(()=>{ const r=document.querySelector('#t2tt tr.t2-hl'); return r ? r.dataset.t2row : 'none'; })); }
  { await et('eI'); await W(300); await p.click('[data-t2gadd="row"]'); await W(300); await p.click('[data-t2gadd="col"]'); await W(300);
    console.log('empty grid cells', await p.evaluate(()=>{ const td=[...document.querySelectorAll('#t2tt .t2-gtab tbody td')]; return td.map(x=>Math.round(x.getBoundingClientRect().width)+'x'+Math.round(x.getBoundingClientRect().height)).join(' '); }));
    await p.click('[data-t2menu="eI"]'); await W(200); await p.click('[data-t2act="clear"]'); await W(400); }
  await et('tire'); await W(300); await p.click('[data-t2menu="tire"]'); await W(200); await p.click('[data-t2act="paste"]'); await W(200); await p.fill('#t2pta','하중 N, μ\n0, 1.8\n1000, 1.6\n2000, 1.45'); await p.click('[data-t2pok]'); await W(500);
  console.log('tire', (await p.textContent('#t2msum')).trim(), 'lock mu', await p.evaluate(()=>document.querySelector('[data-wbi="mu"]').disabled), 'lock eta_mot', await p.evaluate(()=>!!t2InLock('eta_mot')));
  const toSim=async()=>{ await p.click('[data-t2tab="sim"]'); await idle(); }, toEdit=async g=>{ await p.click('[data-t2tab="edit"]'); await W(300); await et(g); await W(300); };
  await toSim(); console.log('tire acc', f((await R()).t_skid_s,3)); await toEdit('tire');
  await p.click('[data-t2menu="tire"]'); await W(200); await p.click('[data-t2act="clear"]'); await W(500); console.log('tire cleared lock', await p.evaluate(()=>document.querySelector('[data-wbi="mu"]').disabled));
  await et('mt'); await W(300); await p.click('#t2tt [data-t2e="1,1"]'); await W(150); await p.fill('#t2tt .t2-ci','100'); await p.press('#t2tt .t2-ci','Enter'); await toSim(); console.log('torque edit acc', f((await R()).t_acc_s,3)); await toEdit('mt');
  await p.click('[data-t2menu="mt"]'); await W(200); await p.click('[data-t2act="ex"][data-t2k="mt"]'); await toSim(); console.log('torque reset acc', f((await R()).t_acc_s,3)); await toEdit('mt');
  // 디레이팅 켜기
  await p.click('[data-t2tab="sim"]'); await W(500); await p.click('.t2-hr [data-t2course="end"]'); await W(7000); const e0=(await R()).t_end_s;
  await p.evaluate(()=>{ WB.I.th_on=1; WB.I.dr_t0=45; WB.I.dr_t1=60; wbSave(); wbCalcSoon(); }); await idle(); o=await R(); console.log('derate end', f(e0,1), '->', f(o.t_end_s,1), 'tmax', f(o.c_tmax,1));
  await p.evaluate(()=>{ WB.I.dr_t0=80; WB.I.dr_t1=100; wbSave(); wbCalcSoon(); }); await idle();
  await p.fill('[data-t2skid]','9.2'); await p.press('[data-t2skid]','Enter'); await idle(); o=await R(); console.log('cla_req', f(o.cla_req)); await p.fill('[data-t2skid]','10.5'); await p.press('[data-t2skid]','Enter'); await idle(); console.log('cla_req neg', f((await R()).cla_req));
  console.log('edit groups', await (async()=>{ await p.click('[data-t2tab="edit"]'); await W(400); const r=[]; for(const g of ['model','course','car','sus','tire','aero','mot','dt','bat']){ await p.click(`[data-t2eg="${g}"]`); await W(300); r.push(g+':'+await p.locator('#wbext .t2-cg [data-wbi]').count()); } await p.click('[data-t2eg="course"]'); await W(300); await p.click('[data-t2tab="sim"]'); await W(400); return r.join(' '); })(), 'left inputs', await p.locator('#wbin [data-wbi]').count());
  { await p.click('.t2-hr [data-t2course="skid"]'); await idle(); const ay=await p.evaluate(()=>WB.R.sig.ay); console.log('skid ay sign', Math.min(...ay).toFixed(2), Math.max(...ay).toFixed(2), 'lim', await p.evaluate(()=>[WB.R.out.ax_max, WB.R.out.ay_skid, WB.R.out.v_endtop].map(v=>v.toFixed(2)).join(' '))); }
  { await p.evaluate(()=>document.querySelector('#wbsig').scrollIntoView({block:'center'})); await p.evaluate(()=>{ wbZSet(100, 300); wbPaint(['sig']); }); await W(300); const z=await p.evaluate(()=>WB.zx); await p.dblclick('#wbsig .wb-pp[data-wbpi="0"] .wb-hit'); await W(300); console.log('graph zoom', !!z, 'dblclick reset', await p.evaluate(()=>WB.zx===null), 'no +-', await p.locator('[data-wbzb]').count()===0); }
  await p.click('.t2-hr [data-t2course="end"]'); await idle();
  { await p.click('[data-t2tab="edit"]'); await W(300); await p.click('[data-t2ecourse="skid"]'); await W(700); const busy=await p.evaluate(()=>WB.busy); await p.evaluate(()=>{ WB.I.cla=3.1; wbCalcSoon(); }); await W(700); const b2=await p.evaluate(()=>[WB.busy, WB.dirty]); await p.click('[data-t2tab="sim"]'); await W(300); const b3=await p.evaluate(()=>WB.busy); await idle(); await p.evaluate(()=>{ WB.I.cla=3.0; wbSave(); wbCalcSoon(); }); await idle(); console.log('edit no calc', busy, JSON.stringify(b2), 'sim calc', b3, 'course kept', await p.evaluate(()=>T2.course)); }
  { // 모델 단계 항목 · 열 모델 · 시뮬레이션 위 조합 표시 · e_lim 옵션 위치 · 주행선 옵션 행 · 열 지우기 · 효율 맵 눈금
    await p.click('[data-t2tab="edit"]'); await W(300); await p.click('[data-t2eg="model"]'); await W(300);
    console.log('model page', await p.locator('.t2-mdop').count(), 'disabled', await p.locator('.t2-mdop:disabled').count(), 'top md seg', await p.locator('.t2-hr [data-t2md]').count());
    const th=()=>p.evaluate(()=>[WB.I.th_on,WB.I.cw_on,WB.I.bt_on].join(''));
    await p.click('[data-t2th="th_on"]'); await W(150); const s1=await th(); await p.click('[data-t2th="cw_on"]'); await W(150); const s2=await th(); await p.click('[data-t2th="th_on"]'); await W(150); const s3=await th();
    console.log('th toggles', s1, s2, s3, 'lock dr_t0', await p.evaluate(()=>t2InLock('dr_t0')||'-'));
    await p.click('[data-t2th="cw_on"]'); await W(150); await p.click('[data-t2th="bt_on"]'); await W(150); console.log('th all', await th(), 'lock b_c', await p.evaluate(()=>t2InLock('b_c')||'-'));
    await p.click('[data-t2tab="sim"]'); await idle(); o=await R();
    console.log('rmin row', await p.evaluate(()=>[WB.I.rmin, WB.R.out.c_rmn, WB.R.out.c_rbad, /가장 작은 반경/.test(document.querySelector('#wbout').textContent)]));
    console.log('sim badge', (await p.textContent('.t2-mdl')).trim(), 'tw', f(o.c_twmax,1), 'tb', f(o.c_tbmax,1), 'card', await p.evaluate(()=>/냉각수 최고 온도/.test(document.querySelector('#wb').textContent)));
    await p.click('[data-t2tab="edit"]'); await W(300); await p.click('[data-t2eg="model"]'); await W(200); await p.click('[data-t2th="cw_on"]'); await W(150); await p.click('[data-t2th="bt_on"]'); await W(150); console.log('th back', await p.evaluate(()=>[WB.I.th_on,WB.I.cw_on,WB.I.bt_on].join('')));
    await p.click('[data-t2eg="bat"]'); await W(300); console.log('e_lim in row', await p.evaluate(()=>document.querySelector('[data-wbi="e_target"]').closest('.wb-ir').querySelectorAll('[data-t2el]').length), 'lock', await p.evaluate(()=>document.querySelector('[data-wbi="e_target"]').disabled));
    await p.click('[data-t2el="2"]'); await W(200); console.log('e_lim 2', await p.evaluate(()=>[WB.I.e_lim, WB.I.e_target, document.querySelector('[data-wbi="e_target"]').disabled]));
    await p.click('[data-t2el="1"]'); await W(200);
    await p.click('[data-t2eg="course"]'); await W(300); await p.click('[data-t2eg="sus"]'); await W(300); await p.click('[data-t2rm="0"]'); await W(150); console.log('rm off', await p.evaluate(()=>[WB.I.rm_on, document.querySelector('[data-wbi="rmin"]').disabled])); await p.click('[data-t2rm="1"]'); await W(150); await p.click('[data-t2eg="course"]'); await W(300);
    await p.click('[data-t2eg="course"]'); await W(300); console.log('rl in box', await p.evaluate(()=>!!document.querySelector('.t2-sb .t2-optrow [data-t2rl]')));
    await et('eM'); await W(300); const nc0 = await p.evaluate(()=>t2Grid(T2.eM)[0].length);
    console.log('heat ticks', await p.locator('#t2mc .t2-hg').count(), 'addc', await p.locator('#t2tt .t2-addc').count(), 'addr', await p.locator('#t2tt .t2-addr').count());
    await p.click('#t2tt [data-t2gdelc="3"]'); await W(300); console.log('del col', nc0, '->', await p.evaluate(()=>t2Grid(T2.eM)[0].length));
    await p.click('[data-t2menu="eM"]'); await W(200); await p.click('[data-t2act="ex"][data-t2k="eM"]'); await W(300);
    await et('tire'); await W(300); console.log('tire x max', await p.evaluate(()=>{ const t=[...document.querySelectorAll('#t2mc .wb-tx')].map(x=>+x.textContent.replace(/,/g,'')).filter(isFinite); return Math.max(...t); }));
    if(out){ await et('eM'); await W(300); await p.screenshot({path:out+'/t2_eM.png'}); await p.click('[data-t2eg="model"]'); await W(300); await p.screenshot({path:out+'/t2_model.png'}); }
    await p.click('[data-t2tab="sim"]'); await idle(); }
  console.log('viz removed', await p.locator('[data-wbviz="mu_s"]').count()===0);
  await p.selectOption('[data-wbxa]','in:gr'); await W(30000); console.log('sweep', await p.evaluate(()=>WB.sw&&WB.sw.X?WB.sw.X.length:'none'), await p.evaluate(()=>WB.err)); await p.selectOption('[data-wbxa]',''); await W(7000);
  console.log('axis colors', await p.evaluate(()=>[...document.querySelectorAll('#wbsig .wb-tl tspan')].map(t=>t.style.fill).filter(Boolean).slice(0,4).join(' ')), 'probe color', await p.evaluate(()=>{ const t=document.querySelector('#wbsig .wb-pv'); return t ? t.style.fill : 'none'; }));
  if(out) await p.screenshot({path:out+'/t2_end.png'});
  await p.evaluate(()=>tourStart('wb:2')); await W(3000); const seen=[];
  for(let i=0;i<20;i++){ seen.push(await p.evaluate(()=>document.querySelector('.tour-n')?.textContent)); const nx=await p.$('[data-tour-next]'); if(!nx || /마치기/.test(await nx.textContent())) break; await nx.click(); await W(6000); }
  console.log('tour', seen.join(','));
  await p.evaluate(()=>{ try{ tourStop(); }catch(e){} }); await W(4000); console.log('after tour', await p.evaluate(()=>T2.course+' '+T2.tab));
  await p.evaluate(()=>wbClose()); await W(300);
  for(const k of ['goal','pt']){ await p.evaluate(k=>{ DASH.part=k; dashPaint(['part']); }, k); await W(9000); console.log('part', k, (await p.textContent('#t2part')).replace(/\s+/g,' ').slice(0,120)); }
  console.log('errs', JSON.stringify(p.errs), JSON.stringify(p.cons)); await b.close(); await H.end(); })();
