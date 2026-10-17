/* DijiMedu fair-progress policy (pure, no balance mutations).
 * Score the FIRST submitted response, never a corrected attempt.
 * Reward claim and unlocking must be verified by authoritative server ledgers.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DMFairProgress=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const RULES=Object.freeze({
  parkur:Object.freeze({total:12,pass:8,high:10,recoveryQuestions:3,recoveryReward:30}),
  learning:Object.freeze({total:11,pass:8,high:10,recoveryQuestions:3,recoveryReward:30}),
  study:Object.freeze({total:6,pass:4,high:5,recoveryQuestions:3,recoveryReward:30}),
 });
 const pct=Object.freeze({pass:60,high:80,perfect:100,recovery:30,notPassed:0});
 function policy(mode){return RULES[mode]||null;}
 function assess(mode,correct,total,options={}){
  const p=policy(mode);
  if(!p)throw new RangeError('Unknown assessment mode');
  if(!Number.isInteger(total)||total!==p.total||!Number.isInteger(correct)||correct<0||correct>total)throw new RangeError('Invalid first-attempt score');
  const pass=Math.min(total,p.pass), high=Math.min(total,p.high);
  const recovered=options.recovered===true && options.recoveryVerified===true && correct<pass;
  const tier=correct===total?'perfect':correct>=high?'high':correct>=pass?'pass':recovered?'recovery':'notPassed';
  return Object.freeze({mode,correct,total,percentage:Math.round(correct*100/total),tier,passed:tier!=='notPassed',rewardPercent:pct[tier],needsRecovery:correct<pass&&!recovered,recoveryQuestions:p.recoveryQuestions});
 }
 function rewardCap(base,tier){if(!Number.isFinite(base)||base<0)throw new RangeError('Invalid base reward');if(!Object.hasOwn(pct,tier))throw new RangeError('Invalid tier');return Math.floor(base*pct[tier]/100);}
 function rewardDifference(base,previousTier,nextTier){return Math.max(0,rewardCap(base,nextTier)-rewardCap(base,previousTier));}
 return Object.freeze({RULES,assess,rewardCap,rewardDifference});
});
