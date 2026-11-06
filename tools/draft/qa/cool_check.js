// 도구 2 [냉각] 블럭 배치 점검: 기본 회로 · 끌기 · 선 끊고 잇기 · 블럭 입력 · 회로 추가 · 모델 단계 표시 · 냉각수 켜고 계산.  node cool_check.js [스크린샷 폴더]
const H=require('./h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead'); const W=H.sleep;
  await p.evaluate(()=>showTab('tools')); await W(600); await p.evaluate(()=>wbOpen('2')); await W(8000);
  console.log('net', JSON.stringify(await p.evaluate(()=>t2CoolCompile())).slice(0,400));
  await p.click('[data-t2tab="edit"]'); await W(300); await p.click('[data-t2eg="cool"]'); await W(500);
  console.log('cards', await p.locator('.t2-cc').count(), 'blocks', await p.locator('.t2-cb').count(), 'links', await p.locator('.t2-clhit').count());
  // drag motor block
  const g=await p.$('[data-t2cb="w1:k4"] rect'); const bb=await g.boundingBox(); await p.mouse.move(bb.x+40,bb.y+20); await p.mouse.down(); await p.mouse.move(bb.x+10,bb.y+80,{steps:5}); await p.mouse.up(); await W(300);
  console.log('moved', await p.evaluate(()=>JSON.stringify(T2.cool.circuits[0].blocks[3])));
  // delete link k3->k4 by clicking it then reconnect
  await p.evaluate(()=>{ const C=T2.cool.circuits[0]; C.links=C.links.filter(([a,b])=>!(a==='k3'&&b==='k4')); t2Save(); wbPaint(['ext']); }); await W(300);
  console.log('broken', JSON.stringify(await p.evaluate(()=>t2CoolCompile().err)));
  const o=await (await p.$('[data-t2cpo="w1:k3"]')).boundingBox(), t=await (await p.$('[data-t2cb="w1:k4"] rect')).boundingBox();
  await p.mouse.move(o.x+o.width/2,o.y+o.height/2); await p.mouse.down(); await p.mouse.move(t.x+30,t.y+30,{steps:6}); await W(100);
  console.log('dragging', await p.evaluate(()=>[document.querySelector('.t2-hose.drag').style.display, !!document.querySelector('.t2-cb.tgt')]));
  if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool_drag.png'});
  await p.mouse.up(); await W(300);
  console.log('relinked', JSON.stringify(await p.evaluate(()=>t2CoolCompile().err)), await p.evaluate(()=>JSON.stringify(T2.cool.circuits[0].links)));
  await p.click('[data-t2cb="w1:k1"] rect'); await W(300); console.log('sel form', await p.locator('.t2-csel input').count());
  { // 병렬: 펌프에서 모터로 호스 하나 더 → 갈라짐 · 번호 · 비율 · 지우기
    const o=await (await p.$('[data-t2cpo="w1:k2"]')).boundingBox(), t=await (await p.$('[data-t2cb="w1:k4"] rect')).boundingBox();
    await p.mouse.move(o.x+o.width/2,o.y+o.height/2); await p.mouse.down(); await p.mouse.move(t.x+40,t.y+30,{steps:6}); await p.mouse.up(); await W(300);
    console.log('branch', await p.locator('.t2-cbadge').count(), JSON.stringify(await p.evaluate(()=>T2.cool.circuits[0].links)), JSON.stringify(await p.evaluate(()=>t2CoolCompile().err)));
    await p.click('.t2-cbadge >> nth=0'); await W(300); const ri=await p.$('[data-t2crat]'); await ri.fill('30'); await ri.press('Enter'); await ri.dispatchEvent('change'); await W(300);
    console.log('ratios', JSON.stringify(await p.evaluate(()=>T2.cool.circuits[0].links.filter(l=>l[0]==='k2').map(l=>+(+l[2]).toFixed(3)))), JSON.stringify(await p.evaluate(()=>t2CoolCompile().net.water[0].nodes.map(n=>[n.t,n.part||'',+n.q.toFixed(2)]))));
    if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool_par.png'});
    await p.keyboard.press('Delete'); await W(300); console.log('after del', await p.locator('.t2-cbadge').count(), JSON.stringify(await p.evaluate(()=>t2CoolCompile().err)));
    await p.click('[data-t2cb="w1:k2"] rect'); await W(200); console.log('block sel', await p.evaluate(()=>T2.cool.circuits[0].sel)); }
  await p.click('[data-t2cnew="water"]'); await W(300); console.log('new circuit', await p.locator('.t2-cc').count(), JSON.stringify(await p.evaluate(()=>t2CoolCompile().err)));
  if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool.png', fullPage:false});
  { const w0=await p.evaluate(()=>document.querySelector('svg[data-t2csvg="w2"]').getBoundingClientRect().width);
    await p.click('[data-t2cadd="w2:b"]'); await W(300); await p.click('[data-t2cadd="w2:b"]').catch(()=>{}); await W(200);
    const w1=await p.evaluate(()=>document.querySelector('svg[data-t2csvg="w2"]').getBoundingClientRect().width);
    console.log('add bat to w2', JSON.stringify(await p.evaluate(()=>T2.cool.circuits.map(c=>c.id+':'+c.blocks.map(b=>b.t).join(',')))), 'width', Math.round(w0), '->', Math.round(w1), 'err', JSON.stringify(await p.evaluate(()=>t2CoolCompile().err)));
    for(let k=0;k<4;k++){ await p.evaluate(()=>{ const C=T2.cool.circuits[0]; }); }
    await p.click('[data-t2cadd="w2:m"]'); await W(300);
    console.log('move motor', JSON.stringify(await p.evaluate(()=>T2.cool.circuits.map(c=>c.id+':'+c.blocks.map(b=>b.t).join(',')))));
    await p.evaluate(()=>{ T2.cool=T2COOL_DEF(); t2Save(); wbPaint(['ext']); }); await W(300); }

  // model page cooling labels
  await p.click('[data-t2eg="model"]'); await W(300); console.log('model cool', await p.evaluate(()=>[...document.querySelectorAll('.t2-mdc b')].map(x=>x.textContent).join(' | ')));
  // compute with coolant on
  await p.evaluate(()=>{ WB.I.cw_on=1; WB.I.in_on=1; WB.I.bt_on=1; wbSave(); }); await p.click('[data-t2tab="sim"]'); await W(9000);
  console.log('res', await p.evaluate(()=>{ const o=WB.R.out; return [o.c_twmax,o.c_tmax,o.c_timax,o.c_tbmax].map(v=>+(+v).toFixed(2)); }), p.errs, p.cons);
  await p.evaluate(()=>{ WB.I.cw_on=0; WB.I.in_on=0; WB.I.bt_on=0; wbSave(); });
  await b.close(); await H.end(); })();
