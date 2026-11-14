const fs=require('node:fs'),assert=require('node:assert/strict'),{test}=require('node:test'),{JSDOM}=require(process.env.DIJI_JSDOM||'jsdom');
const source=fs.readFileSync('ingilizce/premium-skill-games.js','utf8');
const turn=()=>new Promise(r=>setImmediate(r));
function fixture(handler){
 const dom=new JSDOM('<button id="origin">Oyna</button>',{url:'https://fixture.test',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
 w.eval("var aktifOgrenciAdi='Ada',apiURL='/diji-api';");w.localStorage.setItem('ing_token','fixture-token-long-enough');w.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:100,height:100}};
 w.setInterval=()=>0;w.dmKelimeGoluArt={ballMarkup:()=>'<svg/>',keeperMarkup:()=>'<svg/>'};w.fetch=async(url,options)=>{const b=JSON.parse(options.body);calls.push(b);return {ok:true,json:async()=>handler(b)}};w.eval(source);
 return {w,d,calls,close:()=>{w.dmPremiumSkillGames.close();dom.window.close()}};
}
const rounds=Array.from({length:4},(_,i)=>({en:'word'+i,options:['a','b','c','d'],answer:i}));
test('zero quota can resume a server-owned run, without grade/unit selectors',async()=>{
 const id='00000000-0000-4000-8000-000000000001';const f=fixture(b=>b.op==='status'?{ok:true,remaining:0,level:1,activeRunId:id}:{ok:true,runId:id,playedLevel:1,rounds,energy:20,energyMax:25});
 await f.w.dmPremiumSkillGames.open('tower');assert.match(f.d.body.textContent,/Kaldığın oyuna devam et/);assert.equal(f.d.querySelectorAll('select').length,0);
 f.d.querySelector('.psg-actions button').click();await turn();assert.equal(f.calls[1].runId,id);assert.equal(f.d.querySelectorAll('[data-answer]').length,4);f.close();
});
test('wrong goal shot moves keeper toward selected corner and pause blocks answers',async()=>{
 const f=fixture(b=>b.op==='status'?{ok:true,remaining:1,level:1}:{ok:true,runId:b.runId,playedLevel:1,rounds,energy:20,energyMax:25});
 await f.w.dmPremiumSkillGames.open('word-goal');f.d.querySelector('.psg-actions button').click();await turn();
 f.d.querySelector('[data-pause]').click();f.d.querySelector('[data-answer="1"]').click();assert(!f.d.querySelector('.psg-save'));
 f.d.querySelector('[data-resume]').click();f.d.querySelector('[data-answer="1"]').click();assert(f.d.querySelector('.psg-save'));assert(f.d.querySelector('.psg-shot'));
 const entry=JSON.parse(f.w.localStorage.getItem('dm-premium-skill:word-goal:Ada'));assert.deepEqual(entry.picks,[1]);f.close();
});
test('uncertain start preserves ID and account change cannot reveal a stale response',async()=>{
 let starts=0,release;const f=fixture(b=>b.op==='status'?{ok:true,remaining:1,level:1}:++starts===1?{ok:false,mesaj:'Try again'}:new Promise(r=>release=()=>r({ok:true,runId:b.runId,playedLevel:1,rounds})));
 await f.w.dmPremiumSkillGames.open('tower');f.d.querySelector('.psg-actions button').click();await turn();f.d.querySelector('.psg-actions button').click();await turn();
 assert.equal(f.calls[1].runId,f.calls[2].runId);f.w.aktifOgrenciAdi='Other';f.w.dmPremiumSkillGames.close();release();await turn();assert(!f.d.getElementById('premiumSkillGame'));f.close();
});
