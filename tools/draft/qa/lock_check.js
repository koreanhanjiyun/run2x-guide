// 잠긴 칸 값 점검: 잠기면 실제로 쓰는 값 · —, 풀리면 입력해 둔 값.  node lock_check.js [스크린샷 폴더]
const H=require('./h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead'); const W=H.sleep, d=process.argv[2];
  const V=k=>p.evaluate(k=>{ const i=document.querySelector(`#wb input[data-wbi="${k}"]`); return i ? [i.disabled?'잠김':'열림', i.value===''?i.placeholder:i.value].join(':') : '없음'; }, k);
  await p.evaluate(()=>{ localStorage.removeItem(wbStoreKey('2')); localStorage.removeItem(wbStoreKey('4')); showTab('tools'); }); await W(500);
  await p.evaluate(()=>wbOpen('2')); await W(9000); await p.click('[data-t2tab="edit"]'); await W(300);
  await p.click('[data-t2eg="mot"]'); await W(400); console.log('dr_t0', await V('dr_t0'), 'th_c', await V('th_c'), 'tmax', await V('tmax'), 'c_pct', await V('c_pct'), 'i_cpct', await V('i_cpct'), 'di_t0', await V('di_t0'));
  if(d) await p.screenshot({path:d+'/lock_mot.png'});
  await p.click('[data-t2eg="model"]'); await W(300); await p.click('[data-t2th="th_on"]'); await W(300); await p.click('[data-t2eg="mot"]'); await W(400);
  console.log('after on dr_t0', await V('dr_t0'), 'th_c', await V('th_c'));
  await p.click('[data-t2eg="bat"]'); await W(400); console.log('e_target', await V('e_target'), 'epack', await p.evaluate(()=>t2Epack().toFixed(4)));
  await p.click('[data-t2eg="sus"]'); await W(400); console.log('h_rcf', await V('h_rcf'), 'izz', await V('izz'));
  await p.click('[data-t2eg="car"]'); await W(300); const w=await p.$('#wb input[data-wbi="w_car"]'); if(w){ await w.fill('0'); await w.dispatchEvent('input'); await W(300); console.log('w_car 0 → rl_b', await V('rl_b'), 'oh_f', await V('oh_f')); await w.fill('1.4'); await w.dispatchEvent('input'); await w.dispatchEvent('change'); await W(300); console.log('w_car 1.4 → rl_b', await V('rl_b')); }
  await p.evaluate(()=>wbOpen('4')); await W(1200); await p.click('[data-t4auto="1"]'); await W(1200); console.log('t4 n_p auto', await V('n_p'), 'stored', await p.evaluate(()=>WB.I.n_p));
  await p.click('[data-t4auto="0"]'); await W(800); console.log('t4 n_p manual', await V('n_p'));
  console.log('errs', p.errs, p.cons); await b.close(); await H.end(); })();
