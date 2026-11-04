import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPushPolicy} from '../src/push-policy.js';
test('never asks in the first minute, never when already granted or denied',()=>{
 let t=1e12;const p=createPushPolicy({now:()=>t,startedAt:t});
 assert.equal(p.canAsk('prompt'),false);t+=60000;assert.equal(p.canAsk('prompt'),true);
 assert.equal(p.canAsk('granted'),false);assert.equal(p.canAsk('denied'),false);assert.equal(p.canAsk('prompt-with-rationale'),true);
});
test('"not now" waits 7 days and stops after 3 asks; a yes stops forever',()=>{
 let t=1e12;const m=new Map(),storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 const p=createPushPolicy({storage,now:()=>t,startedAt:0});
 for(let i=0;i<3;i++){assert.equal(p.canAsk('prompt'),true);p.asked();p.answered(false);assert.equal(p.canAsk('prompt'),false);t+=7*86400000;}
 assert.equal(p.canAsk('prompt'),false);
 const q=createPushPolicy({storage,owner:'b',now:()=>t,startedAt:0});q.asked();q.answered(true);t+=30*86400000;assert.equal(q.canAsk('prompt'),false);
});
