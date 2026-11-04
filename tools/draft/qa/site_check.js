// 실제 사이트 파일(빌드 전)을 띄워 콘솔 오류 · 항목 수 확인. 사용: python3 -m http.server <포트> (저장소 맨 위에서) → node site_check.js <포트>
// 기대: uniq 125 (항목 수가 바뀌면 그 이유가 있어야 함), 오류 []
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1920,height:1080}}); const errs=[];
 p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
 await p.goto('http://127.0.0.1:'+process.argv[2]+'/index.html'); await p.waitForTimeout(3500);
 console.log(await p.evaluate(()=>({items:document.querySelectorAll('details.item').length, steps:document.querySelectorAll('details.step').length, uniq:new Set([...document.querySelectorAll('details.item')].map(d=>d.id||d.dataset.id)).size})), errs); await b.close(); })();
