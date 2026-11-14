import test from 'node:test';
import assert from 'node:assert/strict';
import { purchasePlanFor } from './purchase-plan.mjs';
const account={role:'student',sandboxOnly:true};
const now=Date.parse('2026-11-14T12:00:00Z');
const active={product_key:'diji_pro',provider:'apple',valid_until:'2026-12-14T12:00:00Z'};
test('full demo access does not masquerade as a purchased plan',()=>{
  assert.equal(purchasePlanFor(account,'premium_pro',[],now),'free');
  assert.equal(purchasePlanFor(account,'premium_pro',[active],now),'pro');
  assert.equal(purchasePlanFor(account,'premium_pro',[active,{...active,product_key:'diji_premium_pro'}],now),'premium_pro');
});
test('expired, non-store and wrong-role grants cannot hide demo purchase options',()=>{
  for(const item of [{...active,valid_until:'2026-11-13'}, {...active,provider:'gift'}, {...active,product_key:'teacher_premium_pro'}, {...active,product_key:'unknown'}])
    assert.equal(purchasePlanFor(account,'premium_pro',[item],now),'free');
});
test('ordinary account plan and access are unchanged',()=>{
  for(const plan of ['free','pro','premium_pro']) assert.equal(purchasePlanFor({role:'student'},plan,[],now),plan);
});
