/* 수식 도구는 첫 화면 뒤에(defer) 불러옴. 준비되면 init.js 가 맡긴 __mjReady 로 화면 수식을 그림 */
window.MathJax={startup:{typeset:false, ready(){ MathJax.startup.defaultReady(); MathJax.startup.promise.then(()=>{ window.__mjReadyFlag=1; if(window.__mjReady) window.__mjReady(); }); }},svg:{fontCache:"local",mtextInheritFont:true},options:{enableMenu:false,enableAssistiveMml:false}};
