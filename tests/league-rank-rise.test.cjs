const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(setImmediate);
async function fixture({reduced=false,animation=true}={}){
 const dom=new JSDOM('<body><div id="tab-meduakis" class="active"></div></body>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,root=w.document.getElementById('tab-meduakis'),moves=[],raf=[];
 let rank=8,requests=0;w.aktifOgrenciAdi='Player';w.maSekme='lig';w.maProfilId=null;w.apiURL='https://api.test';w.dmProgression={level:()=>15};w.matchMedia=()=>({matches:reduced});w.setInterval=()=>0;w.requestAnimationFrame=fn=>{raf.push(fn);return raf.length};w.setTimeout=()=>1;w.clearTimeout=()=>{};
 w.HTMLElement.prototype.getBoundingClientRect=function(){const top=this.closest('.dm-lig-my-place')?500:600;return {top,left:12,width:360,height:60,right:372,bottom:top+60};};
 if(animation)w.HTMLElement.prototype.animate=function(frames,options){moves.push({frames,options});return {cancel(){}}};
 w.fetch=async url=>{requests++;return {ok:true,json:async()=>url.includes('/rpc/')?[]:{ok:true,kapsam:'weekly',liste:Array.from({length:8},(_,i)=>({name:i+1===rank?'Player':'P'+(i+1),rank:i+1,xp:1000-i*20,league:'super'}))}};};
 w.eval(fs.readFileSync('ingilizce/league-ui.js','utf8'));root.innerHTML=w.maLigHtml();await tick();
 const frames=async()=>{while(raf.length)raf.shift()(0);await tick();};await frames();
 return {w,dom,root,moves,frames,get requests(){return requests},setRank:n=>rank=n,async refresh(){await w.dmLeagueUI.refresh();await frames()},close(){root.classList.remove('active');w.document.dispatchEvent(new w.Event('dm:login'));dom.window.close()}};
}
test('only a genuine rank gain animates the actual self-row upward, with replay and no extra requests',async()=>{
 const f=await fixture();assert.equal(f.moves.length,0);f.setRank(6);await f.refresh();assert.equal(f.moves.length,1);assert.match(f.w.document.getElementById('dmLeagueRiseBadge').textContent,/8.*6/);
 assert.match(f.moves[0].frames.at(-1).transform,/translateY\(-/,'rank rise can never move downward toward a lower rendered list row');const requests=f.requests;f.root.querySelector('.dm-lig-my-place [data-lig-person]').click();assert.equal(f.moves.length,2);assert.equal(f.requests,requests);
 f.setRank(7);await f.refresh();assert.equal(f.moves.length,2,'rank loss does not celebrate');f.close();
});
test('a rise fetched on the Friends home is shown on opening the cached league, without waiting for a poll',async()=>{
 const f=await fixture();f.w.maSekme='hub';f.setRank(5);await f.refresh();assert.equal(f.moves.length,0);const requests=f.requests;f.w.maSekme='lig';f.root.innerHTML=f.w.maLigHtml();await f.frames();assert.equal(f.moves.length,1);assert.equal(f.requests,requests);f.close();
});
test('reduced motion and unavailable Web Animations use the status/highlight without a floating clone',async()=>{
 for(const options of [{reduced:true},{animation:false}]){const f=await fixture(options);f.setRank(4);await f.refresh();assert.equal(f.moves.length,0);assert(f.w.document.getElementById('dmLeagueRiseBadge'));assert.equal(f.w.document.getElementById('dmLeagueRiseFloat'),null);f.close();}
});
test('leaving the league and switching account clear transient highlights and cannot replay an old account gain',async()=>{
 const f=await fixture();f.setRank(6);await f.refresh();assert(f.w.document.getElementById('dmLeagueRiseFloat'));f.root.classList.remove('active');await tick();assert.equal(f.w.document.getElementById('dmLeagueRiseFloat'),null);assert.equal(f.root.querySelectorAll('.dm-league-rise-highlight').length,0);
 f.w.aktifOgrenciAdi='Other';f.w.document.dispatchEvent(new f.w.Event('dm:login'));assert.equal(f.w.document.getElementById('dmLeagueRiseBadge'),null);f.close();
});
