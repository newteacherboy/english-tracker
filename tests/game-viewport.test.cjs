const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('ingilizce/index.html','utf8');
function nativeFunction(name){const start=html.indexOf('function '+name+'(');assert(start>=0);const begin=html.indexOf('{',start);let depth=1,i=begin+1;for(;depth&&i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;}return html.slice(start,i);}
test('native exits stop clocks/music and close immediately even while rankings are loading',()=>{
 for(const [name,id,time,music,key]of [['boslukOyunKapat','boslukOyunOverlay','boslukTimerInterval','boslukMuzikDurdur','bosluk'],['hafizaOyunKapat','hafizaOyunOverlay','hafizaTimer','hafizaMuzikDurdur','hafiza'],['yagmurOyunKapat','yagmurOyunOverlay','yagmurInterval','yagmurMuzikDurdur','yagmur'],['trenOyunKapat','trenOyunOverlay','trenTimer',null,'tren']]){
  const dom=new JSDOM('<div id="'+id+'" style="display:flex"></div>',{runScripts:'outside-only'}),w=dom.window;let stopped=0,cleared=0;w.eval('var liderlikKapatDenemeSayaci={},liderlikKilitAktif={'+key+':true};var '+time+'=42;function trEl(id){return document.getElementById(id)}');w.clearInterval=x=>{assert.equal(x,42);cleared++};if(music)w[music]=()=>stopped++;w.eval(nativeFunction('liderlikKilitliMiKontrolEt'));w.eval(nativeFunction(name));w[name]();assert.equal(w.document.getElementById(id).style.display,'none');assert.equal(cleared,1);if(music)assert.equal(stopped,1);w.close();
 }
});
function shell(markup){const dom=new JSDOM(markup,{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&this.style.display!=='none'?[{width:360,height:640}]:[]};w.requestAnimationFrame=()=>1;w.eval(fs.readFileSync('ingilizce/game-viewport.js','utf8'));return {dom,w};}
test('explicit X passes an exit intent to native cleanup and always restores the teacher game destination',async()=>{
 const f=shell('<div id="trenOyunOverlay" style="display:flex"><button class="game-close-btn"></button></div>'),w=f.w,r=w.document.getElementById('trenOyunOverlay');let intent,returned=0;w.trenOyunKapat=()=>{intent=w.dmGameExitIntent;r.style.display='none';};w.dmTeacherPortalMode=true;w.dmTeacherPortal={returnToGames:()=>returned++};await w.dmGameViewport.navigate(r,false);await new Promise(r=>setImmediate(r));assert.equal(intent,'exit');assert.equal(returned,1);assert.equal(w.document.body.classList.contains('dm-game-viewport'),false);f.dom.window.close();
});
test('back reopens setup without changing the selected classroom participant or charging another entry',async()=>{
 const f=shell('<div id="yagmurOyunOverlay" style="display:flex"><button class="game-close-btn"></button></div>'),w=f.w,r=w.document.getElementById('yagmurOyunOverlay');let reopened=0,skipChooser=false;w.yagmurOyunKapat=()=>r.style.display='none';w.yagmurOyunAc=()=>{reopened++;skipChooser=w.dmGameReopeningSetup;r.style.display='flex';};await w.dmGameViewport.navigate(r,true);assert.equal(reopened,1);assert.equal(skipChooser,true);assert.equal(w.dmGameReopeningSetup,false);f.dom.window.close();
});
test('ordinary profile sheets stay outside the game shell while game result exits use native completion',async()=>{
 const f=shell('<div id="yoModal" class="acik" style="display:flex"><button class="yo-kapat"></button></div><div id="genelSonucOverlay" class="acik" style="display:flex"><button id="gsoDevamBtn"></button></div>'),w=f.w;assert(!w.document.getElementById('yoModal').classList.contains('dm-vp-root'));let action;w.genelSonucKapat=tip=>{action=tip;w.document.getElementById('genelSonucOverlay').style.display='none';};await w.dmGameViewport.navigate(w.document.getElementById('genelSonucOverlay'),false);assert.equal(action,'devam');f.dom.window.close();
});


test('native result Continue clears fullscreen lock when active class is removed without deleting the node',async()=>{
 const dom=new JSDOM('<div id="genelSonucOverlay" class="acik" style="display:flex"><button id="gsoDevamBtn">Devam</button></div>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&this.style.display!=='none'?[{width:360,height:640}]:[]};
 w.requestAnimationFrame=fn=>{Promise.resolve().then(()=>{if(w.document.defaultView)fn();});return 1;};
 w.eval(fs.readFileSync('ingilizce/game-viewport.js','utf8'));
 assert.equal(w.document.body.classList.contains('dm-game-viewport'),true,'the result initially locks the menu');
 w.document.getElementById('genelSonucOverlay').classList.remove('acik');
 for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.document.body.classList.contains('dm-game-viewport'),false,'the result exit must unlock the menu even when its node remains mounted');
 assert.equal(w.document.getElementById('genelSonucOverlay').classList.contains('dm-vp-root'),false);
 w.close();
});
test('closing listening game and keeping inactive fullscreen tab never traps navigation',async()=>{
 const dom=new JSDOM('<div id="yoModal" class="acik" data-dm-selected-game="dikte" style="display:flex"><button class="yo-kapat"></button></div><section class="dc-fullscreen-overlay" id="tab-konusmapratigi"><div class="kp-shell"><button class="kp-close-x">X</button></div></section>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&this.style.display!=='none'?[{width:360,height:640}]:[]};
 w.requestAnimationFrame=fn=>{Promise.resolve().then(()=>{if(w.document.defaultView)fn();});return 1;};
 w.eval(fs.readFileSync('ingilizce/game-viewport.js','utf8'));
 assert.equal(w.document.body.classList.contains('dm-game-viewport'),true);
 w.document.getElementById('yoModal').classList.remove('acik');
 for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.document.body.classList.contains('dm-game-viewport'),false,'deactivated listening game must release the dock');
 w.close();
});
