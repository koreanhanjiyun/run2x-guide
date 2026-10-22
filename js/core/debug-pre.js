/* 0.32.0 디버깅(시험) 모드: 주소 #debug 로 켬. 시험 데이터는 run2x.dbg.* 에 따로 저장 */
(function(){ var on=false; try{ on = location.hash==='#debug'; }catch(e){} window.DEBUG=on; if(!on) return;
  var P='run2x.dbg.', D=/^run2x\.(status|qa|val)\.|^run2x\.season$/, S=Storage.prototype, g=S.getItem, s=S.setItem, r=S.removeItem;
  function isLS(o){ try{ return o===window.localStorage; }catch(e){ return false; } }
  function mk(o,k){ return (isLS(o) && D.test(String(k))) ? P+k : k; }
  S.getItem=function(k){ return g.call(this, mk(this,k)); };
  S.setItem=function(k,v){ return s.call(this, mk(this,k), v); };
  S.removeItem=function(k){ return r.call(this, mk(this,k)); };
  window.__dbgClear=function(){ try{ var ls=window.localStorage, ks=[]; for(var i=0;i<ls.length;i++){ var k=ls.key(i); if(k && k.indexOf(P)===0) ks.push(k); } ks.forEach(function(k){ r.call(ls,k); }); return ks.length; }catch(e){ return 0; } };
  window.__dbgErr=[]; function pushErr(m){ window.__dbgErr.push({t:new Date().toTimeString().slice(0,8), m:String(m).slice(0,200)}); if(window.__dbgErr.length>5) window.__dbgErr.shift(); try{ window.__dbgRender && window.__dbgRender(); }catch(e){} }
  window.addEventListener('error',function(e){ pushErr(e.message||'오류'); });
  window.addEventListener('unhandledrejection',function(e){ pushErr((e.reason&&e.reason.message)||e.reason||'Promise 오류'); });
  var ce=console.error; console.error=function(){ try{ pushErr([].slice.call(arguments).join(' ')); }catch(e){} return ce.apply(console,arguments); };
  var rs=history.replaceState; history.replaceState=function(st,t,u){ if(typeof u==='string' && u.indexOf('#')===0) u='#debug'; return rs.call(history,st,t,u); };
})();
