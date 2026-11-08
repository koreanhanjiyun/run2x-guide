// 도구 사이 대시보드 주고받기 점검 (회장): 도구 4 반영 → 도구 2 채우기, 도구 2 반영(평균 발열) → 도구 9 채우기, 도구 9 반영(등가값) → 도구 2 채우기.  node dash_flow.js
const H=require('./h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b, 'admin'); const W=H.sleep;
  const put=async()=>{ await p.click('[data-wbput]'); await W(500); const n=await p.evaluate(()=>document.querySelectorAll('#wbm [data-wbpk]:checked').length); const go=await p.$('#wbm [data-wbpgo]'); if(go) await go.click(); await W(1500); return n; };
  await p.evaluate(()=>{ ['2','4','9'].forEach(k=>localStorage.removeItem(wbStoreKey(k))); showTab('tools'); }); await W(500);
  await p.evaluate(()=>wbOpen('4')); await W(1200); await p.evaluate(()=>{ WB.I.c_ah=5; WB.I.n_p=5; WB.I.c_r=12; wbSave(); wbCalcSoon(); }); await W(800);
  console.log('t4 put', await put(), await p.evaluate(()=>['n_s','n_p','c_ah','r_pack','i_bms_max'].map(k=>k+'='+(dvEntry(k)||{}).v).join(' ')));
  await p.evaluate(()=>wbOpen('2')); await W(9000); await p.click('[data-wbfill]'); await W(9000);
  console.log('t2 after fill', await p.evaluate(()=>['n_s','n_p','c_ah','r_pack','i_bms_max'].map(k=>k+'='+WB.I[k]).join(' ')));
  console.log('t2 put', await put(), await p.evaluate(()=>['q_mot','q_inv','q_bat','v_end_avg','q_cool'].map(k=>k+'='+(dvEntry(k)||{}).v).join(' ')));
  await p.evaluate(()=>wbOpen('9')); await W(1200); await p.click('[data-wbfill]'); await W(1200);
  console.log('t9 after fill', await p.evaluate(()=>['L_m','L_i','L_b','v'].map(k=>k+'='+WB.I[k]).join(' ')));
  console.log('t9 put', await put(), await p.evaluate(()=>['cool_c','cool_ua0','cool_ua60'].map(k=>k+'='+(dvEntry(k)||{}).v).join(' ')));
  await p.evaluate(()=>wbOpen('2')); await W(9000); await p.click('[data-wbfill]'); await W(9000);
  console.log('t2 cool', await p.evaluate(()=>['cw_c','ua0','ua60'].map(k=>k+'='+WB.I[k]).join(' ')));
  console.log('errs', p.errs, p.cons); await b.close(); await H.end(); })();
