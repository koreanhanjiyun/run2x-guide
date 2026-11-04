// 매번 새 브라우저 컨텍스트(저장소·기록 비움)에서 역할을 정해 바로 여는 도우미
const {sleep}=require('./h'); const KEY='__run2xdemo23';
async function fpage(b, base, role, opt={}){ const ctx=await b.newContext({viewport:{width:opt.W||1600,height:opt.H||900}});
  await ctx.addInitScript(([K,role,keepTour])=>{ try{ if(!window.name){ const o={}; o[K]={role,db:null}; window.name=JSON.stringify(o); } if(!sessionStorage.__qa){ sessionStorage.__qa=1; if(!keepTour) ['visited','tourdone','onboard'].forEach(k=>localStorage.setItem('run2x.'+k,'1')); } }catch(e){} }, [KEY,role,!!opt.keepTour]);
  const p=await ctx.newPage(); p.errs=[]; p.cons=[]; p.dialogs=[];
  p.on('pageerror',e=>p.errs.push(String(e).slice(0,240)));
  p.on('console',m=>{ if(m.type()==='error'){ const t=m.text(); if(!/ERR_TUNNEL|fonts\.g|Failed to load resource/.test(t)) p.cons.push(t.slice(0,240)); } });
  p.on('dialog',d=>{ p.dialogs.push(d.type()+':'+d.message().slice(0,80)); d.dismiss().catch(()=>{}); });
  ctx.on('page',np=>{ p.popups=(p.popups||0)+1; np.close().catch(()=>{}); });
  await p.goto(base); await p.waitForFunction(()=>typeof TAB!=='undefined' && window.__shReady, null, {timeout:12000}).catch(()=>{}); await sleep(600);
  if(!opt.keepTour) await p.evaluate(()=>{ try{ tourStop(); }catch(e){} const d=document.getElementById('demoBar'); if(d) d.style.display='none'; });
  return p; }
module.exports={fpage,KEY};
