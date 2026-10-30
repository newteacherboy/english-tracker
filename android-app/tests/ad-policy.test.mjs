import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdPolicy} from '../src/ad-policy.js';
const complete=(p,id,extra={})=>p.complete({id,game:'ky',answered:10,...extra});
test('only the third completed solo game becomes eligible, duplicate results do not count',()=>{
 const p=createAdPolicy();complete(p,'one');assert.equal(p.canInterstitial(),false);
 complete(p,'one');complete(p,'two');assert.equal(p.canInterstitial(),false);
 complete(p,'three');assert.equal(p.canInterstitial(),true);assert.equal(p.snapshot().games,3);
});
test('early exits, routes, duels and teacher games never advance the counter',()=>{
 const p=createAdPolicy();complete(p,'early',{answered:0});complete(p,'route',{game:'ba'});complete(p,'duel',{game:'meteor'});complete(p,'teacher',{teacher:true});
 assert.equal(p.snapshot().games,0);
});
test('five minute gap applies after interstitials and also after rewarded videos',()=>{
 let time=1000000;const p=createAdPolicy({now:()=>time});
 for(let i=0;i<3;i++)complete(p,'a'+i);p.interstitialShown();
 for(let i=0;i<3;i++)complete(p,'b'+i);assert.equal(p.canInterstitial(),false);
 time+=299999;assert.equal(p.canInterstitial(),false);time++;assert.equal(p.canInterstitial(),true);
 p.rewardClosed('gold',true);assert.equal(p.canInterstitial(),false);
});
test('reward limits are independent and only completed videos consume a right',()=>{
 const p=createAdPolicy();for(let i=0;i<8;i++)p.rewardClosed('gold',false);assert.equal(p.rewardAllowed('gold'),true);
 for(let i=0;i<3;i++)p.rewardClosed('gold',true);assert.equal(p.rewardAllowed('gold'),false);assert.equal(p.rewardAllowed('energy'),true);
 for(let i=0;i<5;i++)p.rewardClosed('energy',true);assert.equal(p.rewardAllowed('energy'),false);
});
test('account counters persist independently and daily rewards reset on the next day',()=>{
 let time=new Date(2026,9,30,12).getTime();const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 let a=createAdPolicy({storage,owner:'a',now:()=>time});for(let i=0;i<3;i++)a.rewardClosed('gold',true);
 a=createAdPolicy({storage,owner:'a',now:()=>time});assert.equal(a.rewardAllowed('gold'),false);
 assert.equal(createAdPolicy({storage,owner:'b',now:()=>time}).rewardAllowed('gold'),true);
 time+=86400000;assert.equal(a.rewardAllowed('gold'),true);
});
