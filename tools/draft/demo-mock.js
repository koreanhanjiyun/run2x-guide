/* 시안 저장 공간 분리 (2026-11-12): 시안과 실제 사이트는 주소(koreanhanjiyun.github.io)가 같아 브라우저 저장소를 같이 씀 →
   시안에서는 localStorage 키 앞에 'draft:' 를 붙여 실제 사이트 저장값을 읽지도 바꾸지도 않음 */
(function(){ const P = 'draft:', S = Storage.prototype, g = S.getItem, st = S.setItem, rm = S.removeItem, ky = S.key, cl = S.clear;
  const isL = o => { try{ return o === window.localStorage; }catch(e){ return false; } };
  const mine = o => { const a = []; for(let i = 0; i < o.length; i++){ const k = ky.call(o, i); if(k && k.startsWith(P)) a.push(k); } return a; };
  S.getItem = function(k){ return g.call(this, isL(this) ? P + k : k); };
  S.setItem = function(k, v){ return st.call(this, isL(this) ? P + k : k, v); };
  S.removeItem = function(k){ return rm.call(this, isL(this) ? P + k : k); };
  S.clear = function(){ if(!isL(this)) return cl.call(this); mine(this).forEach(k => rm.call(this, k)); };
  S.key = function(i){ if(!isL(this)) return ky.call(this, i); const k = mine(this)[i]; return k ? k.slice(P.length) : null; };
})();
/* 도구 1 시험 데이터: 묶음(좌표 x = 앞 차축에서 뒤로) · 항목(질량 × 개수) · 드라이버. 로그인 전 모드에도 이 브라우저 저장소에 한 번 넣음 */
function M1SEED(){ const mass={}, o={n:0};
  const HUE={frame:265,sus:190,str:40,brk:5,pt:130,mc:220,bat:25,cool:160,aero:205};
  const G=(code,name,cat,x,y,z,items)=>{ o.n++; const it=items.map(([nm,m,n,h])=>Object.assign({name:nm,m,n:n==null?1:n}, h?{half:true}:{})), hue=HUE[code];
    mass['g'+String(o.n).padStart(2,'0')]={s:{'2026':{name,cat,x,y,z,hue,items:it,ord:o.n},'2025':{name,cat,x,y,z,hue,items:it.map(i=>({...i,m:+(i.m*1.04).toFixed(2)})),ord:o.n}}}; };
  G('frame','프레임 · 방화벽','s',910,0,330,[['스페이스 프레임',32],['방화벽 판',0.8,2],['리벳 · 볼트',0.4]]);
  G('frame','시트 · 헤드레스트','s',760,0,380,[['시트',2.3],['헤드레스트',0.6],['벨트',1.1]]);
  G('frame','카울 · 언더트레이','s',1410,0,330,[['카울',5.2],['언더트레이',1.4],['패스너',0.02,24]]);
  [['왼',1],['오른',-1]].forEach(([sd,k])=>{
    G('sus','앞 업라이트 assy '+sd,'uf',1560,560*k,240,[['너클',1.1],['허브',0.9],['디스크',0.7],['캘리퍼',0.8],['베어링',0.2,2],['휠',3.0],['타이어',4.6],['휠 너트',0.03,4],['위시본',0.7,2,1],['푸시로드',0.2,1,1],['로드엔드',0.05,4,1]]);
    G('sus','뒤 업라이트 assy '+sd,'ur',0,550*k,240,[['너클',1.2],['허브',1.1],['디스크',0.7],['캘리퍼',0.7],['베어링',0.25,2],['휠',3.0],['타이어',4.6],['휠 너트',0.03,4],['위시본',0.75,2,1],['토 링크',0.15,1,1]]); });
  G('sus','댐퍼 · 벨크랭크 (앞)','s',1410,0,520,[['댐퍼',0.8,2,1],['벨크랭크',0.4,2],['ARB',0.6,0]]);
  G('sus','댐퍼 · 벨크랭크 (뒤)','s',110,0,470,[['댐퍼',0.8,2,1],['벨크랭크',0.4,2],['ARB',0.6,1]]);
  G('str','조향','s',1660,0,210,[['랙 · 피니언',1.3],['타이로드',0.2,2,1],['스티어링 휠',0.9],['칼럼',0.4]]);
  G('brk','페달 박스 · 유압','s',1990,0,250,[['페달 박스',2.6],['마스터실린더',0.45,2],['리저버',0.1,2]]);
  G('pt','모터 · 디퍼렌셜','s',60,0,225,[['모터',12.4],['디퍼렌셜',3.9],['체인',0.8],['텐셔너',0.15,2],['드라이브샤프트 (CV축)',1.1,2,1]]);
  G('mc','인버터','s',360,0,580,[['모터 컨트롤러',6.5],['HV 케이블',0.9]]);
  G('bat','축전지','s',476,0,210,[['셀 모듈',4.3,6],['컨테이너',6.1],['BMS',0.6],['저전압 배터리',1.2]]);
  G('cool','냉각 왼','s',860,430,300,[['라디에이터',1.3],['팬',0.6],['호스',0.6]]);
  G('cool','냉각 오른','s',860,-430,300,[['라디에이터',1.3],['팬',0.6],['펌프',0.8]]);
  G('aero','앞날개','s',2240,0,170,[['메인 플레인',1.6],['플랩',0.6,2],['엔드플레이트',0.25,2]]);
  G('aero','뒤날개','s',-60,0,900,[['메인 플레인',1.8],['플랩',0.7,2],['엔드플레이트',0.3,2],['스완넥',0.7]]);
  const D=(label,height,mass,sex,gear)=>({label,sex:sex||'m',height,mass,gear:gear||{helmet:0,suit:0,belt:0},back:32,hip:{x:970,z:230},pedal:{x:1780,z:250},sw:{x:1185,z:500},seg:{}});
  return {mass, drv:{d1:{s:{'2026':D('시험 1',175,68,'m',{helmet:1.4,suit:1.1,belt:0.9}),'2025':D('시험 1',175,70)}}, d2:{s:{'2026':D('시험 2',184,80,'m',{helmet:1.5,suit:1.3,belt:0.9})}}, d3:{s:{'2026':Object.assign(D('시험 3',165,58,'f',{helmet:1.3,suit:1.0,belt:0.9}),{pedal:{x:-160,z:250}})}}}}; }
try{ if(!localStorage.getItem('run2x.mass.v5')){ const T=M1SEED(); localStorage.setItem('run2x.mass.v5','1'); localStorage.setItem('run2x.mass.v2',JSON.stringify(T.mass)); localStorage.setItem('run2x.drv.v2',JSON.stringify(T.drv)); } }catch(e){}
/* 시안 데모용: Firebase 대신 이 화면 안에서만 도는 가짜 저장소 + 역할 전환 막대.
   상태는 window.name 에 보관(새로고침해도 유지, 다른 사람·기기와 공유 안 됨). */
(function(){
 const K='__run2xdemo24';   /* 24: 더미 팀 파일로 바꿈 (2026-11-13) */
 const load=()=>{ try{ const o=JSON.parse(window.name||'{}'); return o[K]||null; }catch(e){ return null; } };
 const st=load()||{role:'none', db:null};
 const persist=()=>{ try{ const o={}; o[K]=st; window.name=JSON.stringify(o); }catch(e){} };
 const USERS={ admin:{uid:'u1',email:'admin@demo.run2x',displayName:'한회장(회장)'}, head:{uid:'u5',email:'chassis@demo.run2x',displayName:'최샤시(팀장)'}, lead:{uid:'u3',email:'lead@demo.run2x',displayName:'박서스(파트장)'}, member:{uid:'u2',email:'member@demo.run2x',displayName:'김팀원(팀원)'} };
 const iso=(d)=>new Date(Date.now()-d*864e5).toISOString();
 function seed(){ const DB={}; const put=(k,v)=>DB[k]=v;
  put('teams/T1',{name:'Run2X 데모팀',createdBy:'u1',key:'k',lastActive:iso(0)}); put('teamNames/run2x 데모팀',{team:'T1'}); put('teams/T1/secret/pw',{pw:'demo2026'});
  /* 팀 T1 = 더미 팀 파일 (tools/dummy/run2x-dummy-team.json, 2026-11-13): 팀원 · 진행 상태 · 팀 값 · 대시보드 · 도구별 팀 프리셋 · 논의 · 시즌 · 기록 */
  { const X=window.__RUN2X_DUMMY||{members:{},data:{}}; Object.entries(X.members||{}).forEach(([u,m])=>put('teams/T1/members/'+u,m));
    Object.entries(X.data||{}).forEach(([col,docs])=>Object.entries(docs||{}).forEach(([id,d])=>put(`teams/T1/${col}/${id}`,d))); }
  /* 도구 1 시험용 (M1SEED: 위치는 REF4 CAD 위치, 질량은 시안용 가정값) */
  { const T=M1SEED(); Object.entries(T.mass).forEach(([id,d])=>put('teams/T1/mass/'+id,d)); Object.entries(T.drv).forEach(([id,d])=>put('teams/T1/drivers/'+id,d)); }
  ['u1','u2','u3'].forEach(u=>put('users/'+u,{teams:{T1:'Run2X 데모팀',T2:'Run2X 데모팀 B'},active:'T1'}));
  put('users/u5',{teams:{T1:'Run2X 데모팀'},active:'T1'});
  /* 두 번째 팀: 같은 사람이 다른 역할로 가입 (여러 팀 가입 점검용) */
  put('teams/T2',{name:'Run2X 데모팀 B',createdBy:'u3',key:'k2',lastActive:iso(1)}); put('teamNames/run2x 데모팀 b',{team:'T2'}); put('teams/T2/secret/pw',{pw:'demoB2026'});
  put('teams/T2/members/u3',{role:'admin',name:'박서스(파트장)',email:'lead@demo.run2x'});
  put('teams/T2/members/u1',{role:'member',name:'한회장(회장)',email:'admin@demo.run2x'});
  put('teams/T2/members/u2',{role:'lead',parts:['배터리'],name:'김팀원(팀원)',email:'member@demo.run2x'});
  put('teams/T2/meta/season',{season:'2026'});
  const its=(typeof ITEMS!=='undefined')?ITEMS:[]; const ord=(typeof SIDX!=='undefined')?SIDX:{};
  const sorted=its.slice().sort((a,b)=>(ord[a.s]||0)-(ord[b.s]||0));
  sorted.forEach((it,i)=>{ if(i/sorted.length<0.1) put(`teams/T2/status/2026-${it.id}`,{v:'done',season:'2026',item:it.id,part:it.p,by:'u3',at:iso(10)}); });
  return DB; }
 let DB=null; const getDB=()=>{ if(!DB){ DB=st.db||seed(); st.db=DB; } return DB; };
 const save=()=>{ st.db=DB; persist(); };
 const subs=[]; const fire=()=>subs.forEach(f=>{ try{f();}catch(e){} });
 const snap=(path)=>{ const D=getDB(); return {id:path.split('/').pop(), exists: path in D, data:()=>D[path]&&JSON.parse(JSON.stringify(D[path]))}; };
 const kids=(col)=>Object.keys(getDB()).filter(k=>k.startsWith(col+'/') && k.slice(col.length+1).indexOf('/')<0);
 let auto=0;
 function doc(path){ return {id:path.split('/').pop(), path,
   get:async()=>snap(path), set:async(d,o)=>{ const D=getDB(); D[path]= o&&o.merge? Object.assign({},D[path]||{},d):d; save(); fire(); },
   update:async(d)=>{ const D=getDB(); if(!(path in D)) throw {code:'not-found'}; Object.assign(D[path],d); save(); fire(); },
   delete:async()=>{ delete getDB()[path]; save(); fire(); },
   collection:(c)=>col(path+'/'+c),
   onSnapshot:(f)=>{ const run=()=>f(snap(path)); subs.push(run); setTimeout(run,0); return ()=>{}; } }; }
 function col(path,ord){ const q={ doc:(id)=>doc(path+'/'+(id||('auto'+(++auto)+Date.now()))), add:async(d)=>{ const r=doc(path+'/auto'+(++auto)+Date.now()); await r.set(d); return r; },
   orderBy:(f,dir)=>col(path,[f,dir]), limit:()=>q, where:()=>q,
   get:async()=>{ let ds=kids(path).map(snap); if(ord){ ds.sort((a,b)=>String(a.data()[ord[0]]).localeCompare(String(b.data()[ord[0]]))*(ord[1]==='desc'?-1:1)); } return {docs:ds, empty:!ds.length, size:ds.length, forEach:(f)=>ds.forEach(f)}; },
   onSnapshot:(f)=>{ const run=()=>{ const ds=kids(path).map(snap); f({docs:ds, empty:!ds.length, size:ds.length, forEach:(g)=>ds.forEach(g), docChanges:()=>[]}); }; subs.push(run); setTimeout(run,0); return ()=>{}; } }; return q; }
 const fs={doc, collection:(p)=>col(p), batch:()=>{ const ops=[]; return {set:(r,d,o)=>ops.push(()=>r.set(d,o)), delete:(r)=>ops.push(()=>r.delete()), update:(r,d)=>ops.push(()=>r.update(d)), commit:async()=>{ for(const o of ops) await o(); }}; },
   runTransaction:async(f)=>f({get:(r)=>r.get(), set:(r,d,o)=>r.set(d,o), update:(r,d)=>r.update(d), delete:(r)=>r.delete()})};
 const user=USERS[st.role]||null;
 const setRole=(r)=>{ st.role=r; persist(); location.reload(); };
 const auth={ currentUser:user, onAuthStateChanged:(f)=>{ setTimeout(()=>f(user),0); return ()=>{}; }, setPersistence:async()=>{},
   signInWithPopup:async()=>{ st.role='member'; persist(); }, signOut:async()=>{ st.role='none'; persist(); } };
 const A=Object.assign(()=>auth,{GoogleAuthProvider:function(){}, Auth:{Persistence:{SESSION:'session'}}});
 const FV={serverTimestamp:()=>new Date().toISOString(), delete:()=>undefined, arrayUnion:(...a)=>a, arrayRemove:()=>[]};
 window.firebase={apps:[], initializeApp:()=>{ window.firebase.apps.push(1); return {}; }, app:()=>({}), auth:A, firestore:Object.assign(()=>fs,{FieldValue:FV})};

 /* 역할 전환 막대 */
 const ROLES=[['none','비로그인'],['member','팀원'],['head','팀장 (샤시)'],['lead','파트장 (서스·조향)'],['admin','회장']];
 function bar(){ const b=document.createElement('div'); b.id='demoBar';
  b.innerHTML=`<span class="db-dot" aria-hidden="true">시안</span><div class="db-in"><span class="db-l">보는 사람</span>${ROLES.map(([k,l])=>`<button type="button" data-demorole="${k}" aria-pressed="${st.role===k}">${l}</button>`).join('')}<span class="db-sep"></span><button type="button" data-demofirst>첫 방문 다시 보기</button><button type="button" data-demodiag title="참고 탭 스크롤 버그 확인용">높이 진단</button><button type="button" data-demoreset title="데모 데이터를 처음 상태로">데모 데이터 초기화</button></div>`;
  document.body.appendChild(b);
  b.addEventListener('click',e=>{ const r=e.target.closest('[data-demorole]'); if(r){ setRole(r.dataset.demorole); return; }
   if(e.target.closest('[data-demofirst]')){ try{ ['visited','tourdone','lastpos','bgopen','ttsub'].forEach(k=>localStorage.removeItem('run2x.'+k)); }catch(err){} history.replaceState(null,'',location.pathname+location.search); location.reload(); return; }
   if(e.target.closest('[data-demodiag]')){ const se=document.scrollingElement, cs=x=>x?getComputedStyle(x):{}; const v=document.querySelector('#v-ref'), m=document.querySelector('main');
     const ds=[...document.querySelectorAll('#ref-list > details')].map(d=>((d.querySelector('summary .stitle')||d.querySelector('summary')).textContent.trim().slice(0,6))+(d.open?' 펼침 ':' 닫힘 ')+Math.round(d.getBoundingClientRect().height));
     const t=['iframe 안: '+(window.self!==window.top),'창 높이: '+innerHeight,'스크롤 위치: '+Math.round(scrollY),'문서 높이(scrollHeight): '+se.scrollHeight,'html 높이: '+Math.round(document.documentElement.getBoundingClientRect().height)+' / overflow '+cs(document.documentElement).overflowY,'body 높이: '+Math.round(document.body.getBoundingClientRect().height)+' / overflow '+cs(document.body).overflowY+' / height '+cs(document.body).height,'main 높이: '+(m?Math.round(m.getBoundingClientRect().height):'-'),'참고 탭 높이: '+(v?Math.round(v.getBoundingClientRect().height):'-'),...ds,
       '— 폭 —','창 폭(innerWidth): '+innerWidth,'본문 폭(clientWidth): '+document.documentElement.clientWidth,'스크롤바: '+(innerWidth-document.documentElement.clientWidth)+'px · gutter '+cs(document.documentElement).scrollbarGutter,
       'html 여백: '+cs(document.documentElement).padding+' / '+cs(document.documentElement).margin,'body 여백: '+cs(document.body).padding+' / '+cs(document.body).margin+' / 폭 '+Math.round(document.body.getBoundingClientRect().width),
       ...(()=>{ const t=document.getElementById('tour'); if(!t) return ['사용법: 꺼짐']; const r=t.getBoundingClientRect(), pg=t.querySelector('.tg-page'), rv=document.querySelector('[id^=v-]:not([hidden]) h1'), cv=rv && t.querySelector('.tg-page [data-tgid='+rv.closest('[id^=v-]').id+'] h1');
         return ['사용법 화면: x '+Math.round(r.left)+' 폭 '+Math.round(r.width), '복제 화면 폭: '+(pg?pg.style.width:'-'), '실제 제목 x: '+(rv?Math.round(rv.getBoundingClientRect().left*10)/10:'-')+' / 복제 제목 x: '+(cv?Math.round(cv.getBoundingClientRect().left*10)/10:'-')]; })()].join('\n');
     let o=document.getElementById('demoDiag'); if(!o){ o=document.createElement('pre'); o.id='demoDiag'; o.style.cssText='position:fixed;right:12px;bottom:60px;z-index:9960;background:#1d2430;color:#e9edf3;font:12px/1.5 monospace;padding:10px 12px;border-radius:8px;white-space:pre;max-width:90vw;user-select:text'; o.onclick=()=>o.remove(); document.body.appendChild(o); } o.textContent=t+'\n(누르면 닫힘)'; return; }
   if(e.target.closest('[data-demoreset]')){ st.db=null; DB=null; persist(); location.reload(); } }); }
 const css=document.createElement('style'); css.textContent=`#demoBar{position:fixed;z-index:9950;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));display:flex;align-items:center;height:42px;max-width:42px;overflow:hidden;border-radius:21px;background:#1d2430;color:#e9edf3;font:12.5px/1.3 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.28);transition:max-width .35s ease}
 #demoBar:hover{max-width:calc(100vw - 24px)}
 #demoBar .db-dot{flex:0 0 42px;height:42px;display:grid;place-items:center;border-radius:50%;color:#ffb454;font-weight:700;font-size:12px;cursor:default}
 #demoBar .db-in{display:flex;align-items:center;gap:6px;white-space:nowrap;padding-right:12px;opacity:0;transition:opacity .2s ease}#demoBar:hover .db-in{opacity:1}
 #demoBar label{display:inline-flex;align-items:center;gap:4px;cursor:pointer}#demoBar .db-l{opacity:.7}#demoBar .db-sep{flex:0 0 1px;height:18px;background:#4a5568;margin:0 2px}
 #demoBar button{font:inherit;color:inherit;background:#2c3646;border:1px solid #3f4b5e;border-radius:6px;padding:4px 9px;cursor:pointer}
 #demoBar button:hover{background:#384457}#demoBar button[aria-pressed=true]{background:#ffb454;color:#1d2430;border-color:#ffb454;font-weight:600}
 @media print{#demoBar{display:none}}`;
 document.head.appendChild(css);
 if(document.body) bar(); else document.addEventListener('DOMContentLoaded',bar);
})();
