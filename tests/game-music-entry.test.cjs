const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('Rally entry and pause are silent, only one shared score starts during live racing',async()=>{
 const dom=new JSDOM('<body><section id="rallyGame" data-game-phase="setup" data-music-paused="true"><div class="rr-hud-stats"></div></section>',{url:'https://music.test/',runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window;
 let frames=[],started=0,intervals=0,lastGain;
 w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{width:390,height:844}]};
 w.requestAnimationFrame=fn=>(frames.push(fn),frames.length);w.setInterval=()=>{intervals++;return intervals};w.clearInterval=()=>{};
 const gain=()=>({gain:{value:0,setTargetAtTime(v){lastGain=v},setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this},disconnect(){}});
 w.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.destination={}}createGain(){return gain()}createOscillator(){return {frequency:{value:0},connect(){return this},start(){started++},stop(){},disconnect(){}}}};
 w.eval(fs.readFileSync('ingilizce/game-music.js','utf8'));
 const frame=async()=>{await new Promise(r=>setImmediate(r));const jobs=frames;frames=[];jobs.forEach(fn=>fn());await new Promise(r=>setImmediate(r));};
 try{await frame();w.document.body.click();await frame();assert.equal(started,0);assert.equal(intervals,0);const root=w.document.querySelector('#rallyGame');root.dataset.gamePhase='playing';root.dataset.musicPaused='false';await frame();assert.equal(started,2);assert.equal(intervals,1);await frame();assert.equal(intervals,1);root.dataset.musicPaused='true';await frame();assert.equal(lastGain,0);assert.equal(started,2);}finally{dom.window.close()}
});
