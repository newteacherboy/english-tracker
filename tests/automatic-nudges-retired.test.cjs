const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('long active sessions and account changes never open retired suggestions or request their data',()=>{
 const dom=new JSDOM('<div id="panel-alani" style="display:block"><div id="maHarita"><div class="ma-alt"></div></div></div>',{url:'https://retired.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let now=Date.now(),requests=0,budgetUses=0;const intervals=[];try{
 const RealDate=w.Date;w.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}};Object.defineProperty(w.performance,'now',{value:()=>now});
 w.setInterval=(fn,ms)=>{const timer={fn,ms,active:true};intervals.push(timer);return timer;};w.clearInterval=t=>{if(t)t.active=false;};w.setTimeout=()=>1;w.clearTimeout=()=>{};
 w.HTMLElement.prototype.getClientRects=function(){return this.hidden||this.style.display==='none'?[]:[{width:100,height:100}];};
 w.aktifOgrenciAdi='Ada';w.yo={altin:10,hedef:50,xpGun:{xp:0}};w.DijiPapiGuide={sections:[]};w.dmFeatureEnabled=()=>true;w.dmAutoNotices={take(){budgetUses++;return true;}};w.dmPapiNotices={blocked:()=>false,inActivity:()=>false};w.fetch=()=>{requests++;throw Error('retired suggestions must never request data');};
 w.localStorage.setItem('dm_parkur_music','off');
 for(const file of ['app-js/i13-1-mikrofon-durumu.js','experience-ui.js'])w.eval(fs.readFileSync('ingilizce/'+file,'utf8'));
 function active(minutes){for(let i=0;i<minutes*12;i++){now+=5000;w.document.dispatchEvent(new w.Event('pointerdown'));for(const timer of [...intervals])if(timer.active)timer.fn();}}
 active(30);w.aktifOgrenciAdi='Bora';active(30);
 assert.equal(w.document.querySelectorAll('#dmNudge,.bk-kart').length,0);assert.equal(requests,0);assert.equal(budgetUses,0,'retired suggestions cannot consume the shared announcement budget');
 assert.equal([...Array(w.localStorage.length)].map((_,i)=>w.localStorage.key(i)).some(k=>k.startsWith('dm_weekly_visits:')),false);
 assert.equal(typeof w.dmNudgeSystem,'undefined');assert.equal(typeof w.dmNudgeSystemActive,'undefined');
 // Unrelated user-driven feedback, music preference and study decoration remain functional.
 assert.equal(w.document.querySelectorAll('.dm-study-hero').length,1);assert.equal(w.document.querySelectorAll('.dm-study-resume').length,1);
 w.dmCorrectAnswer();assert(w.document.getElementById('dmCorrectTick'));
 w.document.getElementById('dmMusicToggle').click();assert.equal(w.localStorage.getItem('dm_parkur_music'),'on');
 }finally{w.close();}
});
