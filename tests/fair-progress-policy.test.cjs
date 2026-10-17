const {test}=require('node:test');
const assert=require('node:assert/strict');
const fair=require('../ingilizce/fair-progress-policy.js');
for(const [mode,total,pass,high] of [['parkur',12,8,10],['learning',11,8,10],['study',6,4,5]]){
 test(mode+' first-attempt thresholds and rewards',()=>{
  assert.equal(fair.assess(mode,pass-1,total).tier,'notPassed');
  assert.equal(fair.assess(mode,pass,total).rewardPercent,60);
  assert.equal(fair.assess(mode,high,total).rewardPercent,80);
  assert.equal(fair.assess(mode,total,total).rewardPercent,100);
 });
 test(mode+' recovery requires server verification',()=>{
  assert.equal(fair.assess(mode,0,total,{recovered:true}).tier,'notPassed');
  assert.equal(fair.assess(mode,0,total,{recovered:true,recoveryVerified:true}).tier,'recovery');
  assert.equal(fair.assess(mode,pass,total,{recovered:true,recoveryVerified:true}).tier,'pass');
 });
}
test('best prior reward is deducted, no negative gold or XP',()=>{
 assert.equal(fair.rewardDifference(100,'pass','high'),20);
 assert.equal(fair.rewardDifference(100,'perfect','pass'),0);
 assert.equal(fair.rewardDifference(20,'notPassed','recovery'),6);
 assert.equal(fair.rewardDifference(20,'recovery','perfect'),14);
});
test('reject inconsistent or fabricated first-try records',()=>{
 for(const v of [-1,1.5,13,NaN])assert.throws(()=>fair.assess('parkur',v,12));
 assert.throws(()=>fair.assess('study',4,0));
 assert.throws(()=>fair.assess('study',1,1));
 assert.throws(()=>fair.assess('learning',3,6));
 assert.throws(()=>fair.assess('unknown',1,1));
});
