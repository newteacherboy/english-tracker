const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('parkur result sends its explicit section, shares the saved run and applies the confirmed balance',async()=>{
 const source=fs.readFileSync('ingilizce/game-feedback.js','utf8').split('const original=window.fetch;')[0]+'})();';
 const calls=[],rewardEvents=[],storage=new Map();const context={CustomEvent,aktifOgrenciAdi:'Fixture',apiURL:'/api',yo:{altin:0,totalXp:0},console,document:{getElementById:()=>null,dispatchEvent:e=>rewardEvents.push(e)},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},matchMedia:()=>({matches:true}),DijiProgressRules:{migrate:()=>{}},fetch:async(url,opt)=>{const body=JSON.parse(opt.body);calls.push(body);return {ok:true,json:async()=>({ok:true,xp:149,gold:31,yo:{altin:31,totalXp:149,dmRewardVersion:10}})}}};context.window=context;
 vm.runInNewContext(source,context);
 context.ocOdulVer({runId:'saved-section-run-1234',oyunKey:'ba',puanSurum:3,rewardScope:{classNo:3,units:[4],stopNo:230401},dogru:10,yanlis:3,sureSaniye:311,parkurGecti:true,parkurIlk:false,parkurYildiz:2});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(rewardEvents.length,1);assert.equal(rewardEvents[0].type,'dm:reward-result');assert.equal(rewardEvents[0].detail.ok,true);assert.equal(rewardEvents[0].detail.runId,'saved-section-run-1234');assert.equal(calls.length,1);assert.equal(calls[0].stopNo,230401);assert.equal(calls[0].classNo,3);assert.equal(calls[0].units[0],4);assert.equal(calls[0].runId,'saved-section-run-1234');assert.equal(calls[0].correct,10);assert.equal(context.yo.altin,31);assert.equal(context.yo.totalXp,149);assert.equal(JSON.parse(storage.get('dm_game_pending:fixture')).length,0);
});
