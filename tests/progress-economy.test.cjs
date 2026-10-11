const {test}=require('node:test'),assert=require('node:assert/strict'),r=require('../ingilizce/progress-rules.js'),score=require('../ingilizce/score-rules.js');
test('40 levels: easy first five, increasing costs, boundary and cap',()=>{assert.equal(r.thresholds.length,40);assert.deepEqual(r.thresholds.slice(0,5),[0,40,100,180,300]);assert.equal(r.thresholds[14],5950);assert.equal(r.thresholds[39],47200);let prev=0;for(let i=1;i<40;i++){const gap=r.thresholds[i]-r.thresholds[i-1];assert(gap>prev);prev=gap;assert.equal(r.progress(r.thresholds[i]).level,i+1);assert.equal(r.progress(r.thresholds[i]-1).level,i);}assert.equal(r.progress(999999).level,40);assert.equal(r.progress(999999).remaining,0);});
test('weekly rollover and gold spending never lower lifetime XP',()=>{const state={log:{a:100,b:200},lig:{xp:250},altin:1000};assert.equal(r.migrate(state),300);state.log={};state.lig={xp:0};state.altin=0;assert.equal(r.migrate(state),300);assert.equal(r.migrate({totalXp:800,log:{a:100}}),800);});
test('server parkur rebase survives old XP logs, refresh and later earned XP',()=>{
 const state={totalXp:360,dmParkurMigration:{version:1,seedXp:360},altin:1200,log:{a:9000},lig:{xp:5000},xpGun:{xp:800},sahip:['owned'],karakter:{sahip:['papi']}};
 const before=structuredClone(state);assert.equal(r.migrate(state),360);assert.equal(r.progress(state.totalXp).level,5);assert.equal(state.dmProgressProtocol,1);
 state.totalXp+=118;assert.equal(r.migrate(state),478);assert.equal(r.migrate(JSON.parse(JSON.stringify(state))),478);
 for(const key of ['altin','log','lig','xpGun','sahip','karakter','dmParkurMigration'])assert.deepEqual(state[key],before[key]);
});
test('parkur seed uses recorded stars and conservative missing-star fallback',()=>{
 assert.deepEqual([undefined,0,1,2,3,99].map(r.parkurBaseXp),[42,42,42,48,60,60]);
 assert.equal(r.parkurBaseXp(1)*6,252);assert.equal(r.parkurBaseXp(3)*6,360);
});
test('failed games never mint gold; malformed inputs cannot mint XP',()=>{for(const o of [{dogru:0,xp:0},{dogru:1,xp:0},{dogru:9,xp:100},{dogru:1,xp:Infinity}])assert.deepEqual(r.gameReward(o),{xp:0,gold:0,bonus:1});});
test('daily bonus, streak and late-game half reward',()=>{const o=score.calculate({correct:8,seconds:25});assert.deepEqual(r.gameReward(o,{ordinal:1,streak:1.5}),{xp:118,gold:30,bonus:1});assert.equal(r.gameReward(o,{ordinal:13,streak:1.5}).xp,30);});
test('boosts do not stack and cannot be used before level 15',()=>{const o={...score.calculate({correct:8,seconds:25}),odulCarpan:2};assert.equal(r.gameReward(o,{level:14,xpBoost:true,goldBoost:true}).xp,118);const b=r.gameReward(o,{level:15,xpBoost:true,goldBoost:true,streak:1.5});assert.equal(b.xp,236);assert.equal(b.gold,60);assert.equal(r.gameReward({...o,xp:9999},{level:15}).xp,384);});
test('one account first-purchase discount never stacks with showcase',()=>{assert.equal(r.discount(1000,{first:true,showcase:true}),750);assert.equal(r.discount(1000,{showcase:true}),700);});
function rewardClient(handler,state={altin:0,totalXp:0}) {
 const fs=require('fs'),vm=require('vm'),store=new Map(),events={},requests=[];
 const ctx={yo:state,aktifOgrenciAdi:'QA',DijiProgressRules:r,Math,Date,Set,Map,JSON,Number,String,Response,navigator:{onLine:true},apiURL:'https://example.test',localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){}},setTimeout(){},setInterval(){},addEventListener:(k,fn)=>events[k]=fn,matchMedia:()=>({matches:true}),genelSonucEkraniGoster(){},dmBaseXpAdd(){throw Error('The removed client reward path must never mint balances.');},fetch:async(url,opt)=>{const body=JSON.parse(opt.body);requests.push(body);return new Response(JSON.stringify(await handler(body)),{status:200});}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/game-feedback.js','utf8'),ctx);
 return {ctx,store,events,requests,settle:()=>new Promise(resolve=>setTimeout(resolve,30))};
}
test('active reward hook waits for the server and retries without locally minting XP or gold',async()=>{
 let release;const f=rewardClient(()=>new Promise(resolve=>release=resolve));
 const input={...score.calculate({correct:8,seconds:25}),runId:'good',oyunKey:'ky'};
 assert.equal(f.ctx.ocOdulVer(input).pending,true);f.ctx.ocOdulVer(input);
 assert.equal(f.requests.length,1);assert.equal(f.ctx.yo.totalXp,0);assert.equal(f.ctx.yo.altin,0);
 release({ok:true,xp:118,gold:20,yo:{totalXp:118,altin:20,dmRewardVersion:1}});await f.settle();
 assert.equal(f.ctx.yo.totalXp,118);assert.equal(f.ctx.yo.altin,20);assert.equal(JSON.parse(f.store.get('dm_game_pending:qa')).length,0);
});
test('parkur header escapes the student name and keeps wallet controls',()=>{
 const fs=require('fs'),vm=require('vm'),ctx={DijiProgressRules:r,yo:{totalXp:260},aktifOgrenciAdi:'<Mert>',document:{getElementById:()=>null,addEventListener(){},body:{classList:{toggle(){},contains:()=>false}}},setInterval(){}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../ingilizce/parkur-theme.js','utf8'),ctx);
 const head=ctx.dmParkurBaslik({energy:24,max:30,gold:320});assert(head.includes('&lt;Mert&gt;'));assert(head.includes('data-dm-wallet="level"'));assert(head.includes('Sv. <b data-dm-level>4'));
 // The unified scene markup is covered by tests/unified-parkur.test.cjs.
});
test('parkur first-clear and replay use the server-confirmed reward, with no legacy 12-XP repeat grant',async()=>{
 const f=rewardClient(body=>body.runId==='first'?{ok:true,xp:60,gold:5,yo:{totalXp:60,altin:505,dmRewardVersion:1}}:{ok:true,xp:0,gold:0,reason:'already_completed',yo:{totalXp:60,altin:505,dmRewardVersion:2}},{totalXp:0,altin:500});
 const input={...score.calculate({correct:11,seconds:30}),runId:'first',oyunKey:'ba',parkurIlk:true,parkurGecti:true,parkurYildiz:3,parkurStopNo:1201};
 f.ctx.ocOdulVer(input);await f.settle();assert.equal(f.ctx.yo.totalXp,60);assert.equal(f.ctx.yo.altin,505);assert.equal(f.requests[0].stopNo,1201);
 f.ctx.ocOdulVer({...input,runId:'replay',parkurIlk:false});await f.settle();assert.equal(f.ctx.yo.totalXp,60);assert.equal(f.ctx.yo.altin,505);
});
