/* 도구 1 시험 데이터: 묶음(좌표 x = 앞 차축에서 뒤로) · 항목(질량 × 개수) · 드라이버. 로그인 전 모드에도 이 브라우저 저장소에 한 번 넣음 */
function M1SEED(){ const mass={}, o={n:0};
  const HUE={frame:265,sus:190,str:40,brk:5,pt:130,mc:220,bat:25,cool:160,aero:205};
  const G=(code,name,cat,x,y,z,items)=>{ o.n++; const it=items.map(([nm,m,n,h])=>Object.assign({name:nm,m,n:n==null?1:n}, h?{half:true}:{})), hue=HUE[code];
    mass['g'+String(o.n).padStart(2,'0')]={s:{'2026':{name,cat,x,y,z,hue,items:it,ord:o.n},'2025':{name,cat,x,y,z,hue,items:it.map(i=>({...i,m:+(i.m*1.04).toFixed(2)})),ord:o.n}}}; };
  G('frame','프레임 · 방화벽','s',650,0,330,[['스페이스 프레임',32],['방화벽 판',0.8,2],['리벳 · 볼트',0.4]]);
  G('frame','시트 · 헤드레스트','s',800,0,380,[['시트',2.3],['헤드레스트',0.6],['벨트',1.1]]);
  G('frame','카울 · 언더트레이','s',150,0,330,[['카울',5.2],['언더트레이',1.4],['패스너',0.02,24]]);
  [['왼',1],['오른',-1]].forEach(([sd,k])=>{
    G('sus','앞 업라이트 assy '+sd,'uf',0,560*k,240,[['너클',1.1],['허브',0.9],['디스크',0.7],['캘리퍼',0.8],['베어링',0.2,2],['휠',3.0],['타이어',4.6],['휠 너트',0.03,4],['위시본',0.7,2,1],['푸시로드',0.2,1,1],['로드엔드',0.05,4,1]]);
    G('sus','뒤 업라이트 assy '+sd,'ur',1560,550*k,240,[['너클',1.2],['허브',1.1],['디스크',0.7],['캘리퍼',0.7],['베어링',0.25,2],['휠',3.0],['타이어',4.6],['휠 너트',0.03,4],['위시본',0.75,2,1],['토 링크',0.15,1,1]]); });
  G('sus','댐퍼 · 벨크랭크 (앞)','s',150,0,520,[['댐퍼',0.8,2,1],['벨크랭크',0.4,2],['ARB',0.6,0]]);
  G('sus','댐퍼 · 벨크랭크 (뒤)','s',1450,0,470,[['댐퍼',0.8,2,1],['벨크랭크',0.4,2],['ARB',0.6,1]]);
  G('str','조향','s',-100,0,210,[['랙 · 피니언',1.3],['타이로드',0.2,2,1],['스티어링 휠',0.9],['칼럼',0.4]]);
  G('brk','페달 박스 · 유압','s',-430,0,250,[['페달 박스',2.6],['마스터실린더',0.45,2],['리저버',0.1,2]]);
  G('pt','모터 · 디퍼렌셜','s',1500,0,225,[['모터',12.4],['디퍼렌셜',3.9],['체인',0.8],['텐셔너',0.15,2],['드라이브샤프트 (CV축)',1.1,2,1]]);
  G('mc','인버터','s',1200,0,580,[['모터 컨트롤러',6.5],['HV 케이블',0.9]]);
  G('bat','축전지','s',1084,0,210,[['셀 모듈',4.3,6],['컨테이너',6.1],['BMS',0.6],['저전압 배터리',1.2]]);
  G('cool','냉각 왼','s',700,430,300,[['라디에이터',1.3],['팬',0.6],['호스',0.6]]);
  G('cool','냉각 오른','s',700,-430,300,[['라디에이터',1.3],['팬',0.6],['펌프',0.8]]);
  G('aero','앞날개','s',-680,0,170,[['메인 플레인',1.6],['플랩',0.6,2],['엔드플레이트',0.25,2]]);
  G('aero','뒤날개','s',1620,0,900,[['메인 플레인',1.8],['플랩',0.7,2],['엔드플레이트',0.3,2],['스완넥',0.7]]);
  const D=(label,height,mass,sex,gear)=>({label,sex:sex||'m',height,mass,gear:gear||{helmet:0,suit:0,belt:0},back:32,hip:{x:590,z:230},pedal:{x:-220,z:250},sw:{x:375,z:500},seg:{},cg_meas:{x:null,z:null}});
  return {mass, drv:{d1:{s:{'2026':D('시험 1',175,68,'m',{helmet:1.4,suit:1.1,belt:0.9}),'2025':D('시험 1',175,70)}}, d2:{s:{'2026':D('시험 2',184,80,'m',{helmet:1.5,suit:1.3,belt:0.9})}}, d3:{s:{'2026':Object.assign(D('시험 3',165,58,'f',{helmet:1.3,suit:1.0,belt:0.9}),{pedal:{x:-160,z:250}})}}}}; }
try{ if(!localStorage.getItem('run2x.mass.v4')){ const T=M1SEED(); localStorage.setItem('run2x.mass.v4','1'); localStorage.setItem('run2x.mass.v2',JSON.stringify(T.mass)); localStorage.setItem('run2x.drv.v2',JSON.stringify(T.drv)); } }catch(e){}
/* 시안 데모용: Firebase 대신 이 화면 안에서만 도는 가짜 저장소 + 역할 전환 막대.
   상태는 window.name 에 보관(새로고침해도 유지, 다른 사람·기기와 공유 안 됨). */
(function(){
 const K='__run2xdemo22';
 const load=()=>{ try{ const o=JSON.parse(window.name||'{}'); return o[K]||null; }catch(e){ return null; } };
 const st=load()||{role:'none', db:null};
 const persist=()=>{ try{ const o={}; o[K]=st; window.name=JSON.stringify(o); }catch(e){} };
 const USERS={ admin:{uid:'u1',email:'admin@demo.run2x',displayName:'한회장(회장)'}, head:{uid:'u5',email:'chassis@demo.run2x',displayName:'최샤시(팀장)'}, lead:{uid:'u3',email:'lead@demo.run2x',displayName:'박서스(파트장)'}, member:{uid:'u2',email:'member@demo.run2x',displayName:'김팀원(팀원)'} };
 const iso=(d)=>new Date(Date.now()-d*864e5).toISOString();
 function seed(){ const DB={}; const put=(k,v)=>DB[k]=v;
  put('teams/T1',{name:'Run2X 데모팀',createdBy:'u1',key:'k',lastActive:iso(0)}); put('teamNames/run2x 데모팀',{team:'T1'}); put('teams/T1/secret/pw',{pw:'demo2026'});
  put('teams/T1/members/u1',{role:'admin',name:'한회장(회장)',email:'admin@demo.run2x'});
  put('teams/T1/members/u3',{role:'lead',parts:['서스','조향'],name:'박서스(파트장)',email:'lead@demo.run2x'});
  put('teams/T1/members/u2',{role:'member',name:'김팀원(팀원)',email:'member@demo.run2x'});
  put('teams/T1/members/u5',{role:'head',parts:['샤시'],name:'최샤시(팀장)',email:'chassis@demo.run2x'});
  put('teams/T1/members/u6',{role:'head',parts:['전기','회로'],name:'정전기(팀장)',email:'elec@demo.run2x'});
  put('teams/T1/members/u4',{role:'lead',parts:['배터리','냉각'],name:'이배터리(파트장)',email:'bat@demo.run2x'});
  { const F='김이박최정강조윤장임한오서신권황안송류홍', G=['민준','서연','도윤','하은','시우','지아','주원','서준','예린','건우','수아','현우','지호','유나','은우','채원','준서','다인','태윤','소율'];
    const PT=['서스','조향','브레이크','구동','모터','배터리','냉각','전장','에어로','프레임'];
    for(let k=0;k<42;k++){ const nm=F[k%F.length]+G[(k*7)%G.length], lead=k%9===0, inNow=k%6!==5;
      const r={role:lead?'lead':'member', parts:lead?[PT[k%PT.length]]:[]}; const sz={'2025':r}; if(inNow) sz['2026']=r;
      put('teams/T1/members/x'+k,{role:inNow?r.role:'member', parts:inNow?r.parts:[], name:nm, email:'m'+k+'@demo.run2x', seasons:sz}); } }
  /* 팀 설계값(dv) 예시: 지난 시즌(2024·2025) 값과 이번 시즌 일부 — '지난 시즌 값 가져오기' 시험용 */
  { const V={frame__m:[310,298,292],frame__fr:[46,47,null],frame__left:[50.5,50.2,null],frame__h:[305,295,null],sus__L:[1600,1580,1560],sus__tf:[1230,1220,null],sus__tr:[1210,1190,null],
      sus__r_eff:[240,232,null],aero__cla:[2.4,2.8,null],aero__cda:[1.2,1.3,null],aero__xcop:[880,860,null],aero__hcop:[450,430,null],sus__mu:[1.4,1.45,null],sus__lltd:[52,51,null],
      str__rmin:[3.5,3.2,null],mc__pmax:[80,80,null],pt__gr:[3.8,3.6,null],mc__nmax:[6500,6500,null],sus__rc_f:[40,35,null],sus__rc_r:[60,55,null],brk__brake_bias:[62,60,null],
      mc__tmax:[230,230,null],bat__e_pack:[7.2,7.6,null],sus__ay_max:[1.6,1.7,null],sus__k_us:[0.3,0.25,null],all__score_goal:[600,700,null]};
    const SE=['2024','2025','2026'], ST=['ok','ok','rev'];
    Object.entries(V).forEach(([id,vs])=>{ const s={}; vs.forEach((v,i)=>{ if(v!=null) s[SE[i]]={v, st: i===2&&id==='frame__m'?'ok':ST[i], src:'', by:'u1', at:iso(i===2?3:(2-i)*365)}; }); put('teams/T1/dv/'+id,{s}); }); }
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
  put('teams/T1/meta/season',{season:'2026'});
  put('teams/T1/meta/records',{'2025':{'보고서':142,'가속':61,'스키드패드':55,'오토크로스':118,'내구':190,'효율':31,'순위':'7위'},'2024':{'보고서':120,'가속':48,'스키드패드':40,'오토크로스':96,'내구':0,'효율':0,'순위':'14위 (내구 미완주)'},'2022':{'보고서':98,'가속':35,'스키드패드':30,'오토크로스':70,'내구':120,'효율':18,'순위':'18위'}});
  const its=(typeof ITEMS!=='undefined')?ITEMS:[]; const ord=(typeof SIDX!=='undefined')?SIDX:{};
  const sorted=its.slice().sort((a,b)=>(ord[a.s]||0)-(ord[b.s]||0));
  const by={'서스':'u3','조향':'u3','배터리':'u4','냉각':'u4'};
  // 2025 시즌: 거의 다 끝난 지난 기록 / 2026 시즌: 앞 단계 위주로 진행 중
  sorted.forEach((it,i)=>{ const f=i/sorted.length;
    const v25 = f<0.86 ? 'done' : f<0.92 ? 'skip' : (f<0.96?'doing':null);
    if(v25) put(`teams/T1/status/2025-${it.id}`,{v:v25,season:'2025',item:it.id,part:it.p,by:by[it.p]||'u1',at:iso(300-i%40)});
    const v26 = f<0.22 ? 'done' : f<0.34 ? (i%3===0?'doing':'done') : f<0.42 ? (i%4===0?'doing':null) : (i%17===0?'doing':null);
    if(f<0.1) put(`teams/T2/status/2026-${it.id}`,{v:'done',season:'2026',item:it.id,part:it.p,by:'u3',at:iso(10)});
    if(v26) put(`teams/T1/status/2026-${it.id}`,{v:v26,season:'2026',item:it.id,part:it.p,by:by[it.p]||'u1',at:iso(30-(i%28))});
  });
  // 우리 팀 값 몇 개
  const A=(typeof ACT!=='undefined')?ACT:{}; let n=0;
  Object.keys(A).forEach(id=>{ const labs=(A[id]||[])[2]; if(!labs||!labs.length||n>=8) return; n++;
    const s={'2025':{},'2026':{}}; labs.slice(0,2).forEach((l,j)=>{ s['2025'][l]={v:'작년 값 '+(j+1),why:'2025 차량 실측'}; if(n%2) s['2026'][l]={v:'목표 값 '+(j+1),why:'랩 시뮬레이션 결과'}; });
    const it=its.find(x=>x.id===id); put('teams/T1/val/'+id,{s,part:it?it.p:'',by:'u1',at:iso(5+n)}); });
  // 논의
  const q=(id,text,by,d,parent)=>put('teams/T1/qa/q'+(Object.keys(DB).length),{v:2,item:id,parent:parent||'',text,by,at:iso(d)});
  const pick=k=>(sorted[k]||{}).id;
  if(pick(0)){ q(pick(0),'배점 비중은 작년 결과 기준으로 잡나요, 올해 규정 기준으로 잡나요?','u2',2); }
  if(pick(3)){ q(pick(3),'무게 목표 240 kg은 배터리 팩 무게가 확정된 뒤에 다시 봐야 할 것 같습니다.','u3',1); }
  const sus=sorted.find(x=>x.p==='서스'); if(sus) q(sus.id,'하드포인트 좌표는 작년 차에서 바꾼 점만 표시해 두면 좋겠습니다.','u3',0);
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
  b.innerHTML=`<b>시안 22</b><span class="db-l">보는 사람</span>${ROLES.map(([k,l])=>`<button type="button" data-demorole="${k}" aria-pressed="${st.role===k}">${l}</button>`).join('')}<span class="db-sep"></span><button type="button" data-demofirst>첫 방문 다시 보기</button><button type="button" data-demodiag title="참고 탭 스크롤 버그 확인용">높이 진단</button><button type="button" data-demoreset title="데모 데이터를 처음 상태로">데모 데이터 초기화</button>`;
  setTimeout(()=>b.querySelectorAll('[data-cmp]').forEach(c=>{ c.checked=document.body.classList.contains(c.dataset.cmp); c.onchange=()=>window.setCompare&&setCompare(c.dataset.cmp,c.checked); }),500);
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
 const css=document.createElement('style'); css.textContent=`#demoBar{position:fixed;z-index:9950!important;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:9000;display:flex;flex-wrap:wrap;align-items:center;gap:6px;max-width:calc(100vw - 24px);padding:8px 10px;border-radius:10px;background:#1d2430;color:#e9edf3;font:12.5px/1.3 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.28)}
 #demoBar b{color:#ffb454;margin-right:4px}#demoBar label{display:inline-flex;align-items:center;gap:4px;cursor:pointer}#demoBar .db-l{opacity:.7}#demoBar .db-sep{width:1px;height:18px;background:#4a5568;margin:0 2px}
 #demoBar button{font:inherit;color:inherit;background:#2c3646;border:1px solid #3f4b5e;border-radius:6px;padding:4px 9px;cursor:pointer}
 #demoBar button:hover{background:#384457}#demoBar button[aria-pressed=true]{background:#ffb454;color:#1d2430;border-color:#ffb454;font-weight:600}
 @media print{#demoBar{display:none}}`;
 document.head.appendChild(css);
 if(document.body) bar(); else document.addEventListener('DOMContentLoaded',bar);
})();
