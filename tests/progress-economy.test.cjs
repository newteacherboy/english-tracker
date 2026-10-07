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
test('real reward hook uses canonical writer and keeps a duplicate guard across reload',()=>{
  const fs=require('fs'),vm=require('vm'),html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8').replace(/<!--[\s\S]*?-->/g,'');
  const source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(x=>x.includes('window.ocOdulVer = function (o)'));
  const state={altin:0,totalXp:0,hedef:50},ctx={yo:state,aktifOgrenciAdi:'QA',DijiProgressRules:r,Math,Date,Set,JSON,document:{addEventListener(){},hidden:false},setTimeout(){},setInterval(){},yoHazirMi:()=>true,yoBugun:()=> '2026-10-04',fetch(){},dmBaseXpAdd:(xp,al)=>{state.totalXp+=xp;state.altin+=al;}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
  const input={...score.calculate({correct:8,seconds:25}),runId:'good'};
  assert.equal(ctx.ocOdulVer(input).xp,118);assert.equal(state.altin,20);assert.equal(state.totalXp,118);
  assert.equal(ctx.ocOdulVer(input),null);vm.runInContext(source,ctx);assert.equal(ctx.ocOdulVer(input),null);
  ctx.ocOdulVer({...score.calculate({correct:0,wrong:8,seconds:96}),runId:'failed'});assert.equal(state.altin,20);assert.equal(state.totalXp,118);
});
test('parkur header escapes the student name and keeps wallet controls',()=>{
 const fs=require('fs'),vm=require('vm'),ctx={DijiProgressRules:r,yo:{totalXp:260},aktifOgrenciAdi:'<Mert>',document:{getElementById:()=>null,addEventListener(){},body:{classList:{toggle(){},contains:()=>false}}},setInterval(){}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../ingilizce/parkur-theme.js','utf8'),ctx);
 const head=ctx.dmParkurBaslik({energy:24,max:30,gold:320});assert(head.includes('&lt;Mert&gt;'));assert(head.includes('data-dm-wallet="level"'));assert(head.includes('Sv. <b data-dm-level>4'));
 // The unified scene markup is covered by tests/unified-parkur.test.cjs.
});
test('perfect 11-question parkur earns star XP, repeat is reduced, failure gives no gold',()=>{
 const fs=require('fs'),vm=require('vm'),html=fs.readFileSync('ingilizce/index.html','utf8').replace(/<!--[\s\S]*?-->/g,''),source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(x=>x.includes('window.ocOdulVer = function (o)'));
 const state={totalXp:0,dmParkurMigration:{version:1},altin:500},ctx={yo:state,aktifOgrenciAdi:'Fixture',DijiProgressRules:r,yoHazirMi:()=>true,yoBugun:()=> '2026-10-04',dmBaseXpAdd:(xp,gold)=>{state.totalXp+=xp;state.altin+=gold;},yoKaydet(){},setTimeout(){},setInterval(){},fetch(){},window:null,document:{addEventListener(){},querySelector(){return null}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);const result={...score.calculate({correct:11,wrong:0,seconds:30}),runId:'parkur-first',oyunKey:'ba',parkurIlk:true,parkurGecti:true,parkurYildiz:3};assert.equal(ctx.ocOdulVer(result).xp,60);assert.equal(ctx.ocOdulVer({...result,runId:'parkur-repeat',parkurIlk:false}).xp,12);assert.equal(ctx.ocOdulVer({...result,runId:'parkur-fail',parkurGecti:false}).xp,0);assert.equal(state.altin,500);assert.equal(state.totalXp,72);
});
