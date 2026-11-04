// 공통: 데모 빌드(_t.html)를 띄우고 역할을 고른 페이지를 돌려줌
const {chromium}=require('playwright');const {spawn}=require('child_process');
const path=require('path'); const S=path.resolve(__dirname,'..','..','..','dist','draft');   /* tools/draft/build.py 결과 */
let srv=null; const PORT=8840+Math.floor(Math.random()*100);
async function start(){ srv=spawn('python3',['-m','http.server',String(PORT)],{cwd:S,stdio:'ignore'}); await new Promise(r=>setTimeout(r,800)); }
async function page(b, role, opt={}){ const ctx=await b.newContext({viewport:{width:opt.W||1600,height:opt.H||900}}); const p=await ctx.newPage();
  p.errs=[]; p.cons=[]; p.dialogs=[];
  p.on('pageerror',e=>p.errs.push(String(e).slice(0,240)));
  p.on('console',m=>{ if(m.type()==='error'){ const t=m.text(); if(!/ERR_TUNNEL|fonts\.g|Failed to load resource/.test(t)) p.cons.push(t.slice(0,240)); } });
  p.on('dialog',d=>{ p.dialogs.push(d.type()+':'+d.message().slice(0,80)); d.dismiss().catch(()=>{}); });
  ctx.on('page',np=>{ p.popups=(p.popups||0)+1; np.close().catch(()=>{}); });
  await p.goto(`http://127.0.0.1:${PORT}/_t.html`); await p.waitForTimeout(2500);
  if(role){ await p.evaluate(r=>{ const b=document.querySelector(`[data-demorole="${r}"]`); if(b && b.getAttribute('aria-pressed')!=='true') b.click(); }, role); await p.waitForTimeout(3200); }
  if(!opt.keepTour) await p.evaluate(()=>{ try{ tourStop(); }catch(e){} });
  return p; }
async function end(){ if(srv) srv.kill(); }
const sleep=t=>new Promise(r=>setTimeout(r,t));
module.exports={start,page,end,sleep,S,chromium,PORT};
