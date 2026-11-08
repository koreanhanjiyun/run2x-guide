// 하드포인트 공유 (도구 5 · 6 · 7 · 8): 한 도구에서 고친 값이 다른 도구에 보이는지, 파일(.csv) 가져오기 · 내보내기 행
const {start,sleep,chromium,PORT,end}=require('./h');const {fpage}=require('./h2');
(async()=>{ await start(); const b=await chromium.launch(); const p=await fpage(b,`http://127.0.0.1:${PORT}/_t.html`,'admin',{W:1600,H:900});
 const r=await p.evaluate(async()=>{ showTab('tools'); ['5','6','7','8'].forEach(i=>localStorage.removeItem(wbStoreKey(i))); localStorage.removeItem(WB_SHARE.hp.key);
  const o={}; wbOpen('5'); o.def5=WB.I.f_lf_x; WB.I.f_lf_x=111.5; wbSave(); wbClose&&wbClose();
  wbOpen('6'); o.t6=WB.I.f_lf_x; wbClose&&wbClose(); wbOpen('8'); o.t8=WB.I.f_lf_x;
  const rows=wbHpRows(); o.rows=rows.length; o.rowLf=rows.find(r=>r[0]==='앞'&&r[1]==='lf');
  const f=new File(['축,점,이름,x,y,z\n뒤,uo,위 볼조인트,-25,501.5,999\n'],'hp.csv',{type:'text/csv'}); await wbHpImport(f); o.t8r=WB.I.r_uo_z; wbClose&&wbClose();
  wbOpen('7'); o.t7r=WB.I.r_uo_z; o.t7f=WB.I.f_lf_x; o.bar=!!document.querySelector('#wb [data-wbhp="xlsx"]'); wbClose&&wbClose();
  wbOpen('2'); o.bar2=!!document.querySelector('#wb [data-wbhp]'); wbClose&&wbClose();
  ['5','6','7','8'].forEach(i=>localStorage.removeItem(wbStoreKey(i))); localStorage.removeItem(WB_SHARE.hp.key); return o; });
 console.log(JSON.stringify(r)); const ok=r.t6===111.5&&r.t8===111.5&&r.t8r===999&&r.t7r===999&&r.t7f===111.5&&r.bar&&!r.bar2&&r.rows===30;
 console.log(ok?'hp share OK':'hp share NG'); console.log('errs',p.errs,p.cons); await b.close(); await end(); })();
