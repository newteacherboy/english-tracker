const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('canonical reward state updates counters and refuses stale or other-account responses',()=>{
 const source=fs.readFileSync('ingilizce/game-feedback.js','utf8');const start=source.indexOf('function applyRewardState('),end=source.indexOf('window.dmApplyRewardState=');
 const saved=[],ctx={name:()=> 'student',yo:{totalXp:900,altin:20,dmRewardVersion:20},DijiProgressRules:{migrate(){}},localStorage:{setItem:(k,v)=>saved.push([k,JSON.parse(v)])},window:{yoArayuzTazele(){},dmProgressPanel:{paint(){}}}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 assert.equal(ctx.applyRewardState({totalXp:100,altin:1,dmRewardVersion:19}),false);assert.equal(ctx.yo.altin,20);
 assert.equal(ctx.applyRewardState({totalXp:1000,altin:35,dmRewardVersion:21}),true);assert.equal(ctx.yo.totalXp,1000);assert.equal(ctx.yo.altin,35);assert.equal(saved.at(-1)[1].altin,35);
 assert.equal(ctx.applyRewardState({totalXp:1500,altin:99,dmRewardVersion:22},'another-student'),false);assert.equal(ctx.yo.altin,35);
 assert.equal(ctx.applyRewardState({totalXp:1000,altin:40,dmRewardVersion:22}),true);assert.equal(ctx.yo.altin,40);assert.equal(ctx.yo.totalXp,1000);
});
