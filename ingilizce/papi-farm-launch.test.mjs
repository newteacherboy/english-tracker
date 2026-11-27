import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, launchState, regionState, countdownText } from './papi-farm-launch.mjs';
const start = Date.UTC(2026,10,27,12);
const at = (elapsed, override = {}) => launchState({enabled:true,publishedAtMs:start,serverNowMs:start+elapsed,...override});
const open = at(DAY_MS);
test('disabled launch stays closed',()=>assert.equal(at(DAY_MS,{enabled:false}).canEnter,false));
test('missing release date stays closed',()=>assert.equal(at(DAY_MS,{publishedAtMs:undefined}).status,'unavailable'));
test('missing server time stays closed',()=>assert.equal(at(DAY_MS,{serverNowMs:undefined}).status,'unavailable'));
test('future publication stays closed',()=>assert.equal(at(-1).status,'unavailable'));
test('initial countdown is 24 hours',()=>assert.equal(countdownText(at(0).remainingMs),'24:00:00'));
test('halfway reload preserves countdown',()=>assert.equal(countdownText(at(DAY_MS/2).remainingMs),'12:00:00'));
test('one millisecond early stays closed',()=>assert.equal(at(DAY_MS-1).canEnter,false));
test('exact release time opens',()=>assert.deepEqual(open,{status:'open',remainingMs:0,canEnter:true}));
test('after release remains open',()=>assert.equal(at(DAY_MS+1).canEnter,true));
test('regions cannot open during launch',()=>assert.equal(regionState({launch:at(0),regionId:1,highestUnlocked:1}),'unavailable'));
for(const regionId of [1,2]) test(`free region ${regionId}`,()=>assert.equal(regionState({launch:open,regionId,highestUnlocked:2}),'open'));
for(const regionId of [3,4,5]) {
  test(`region ${regionId} rejects unverified membership`,()=>assert.equal(regionState({launch:open,regionId,highestUnlocked:5}),'premium_pro_required'));
  test(`region ${regionId} accepts verified Premium Pro`,()=>assert.equal(regionState({launch:open,regionId,highestUnlocked:5,verifiedPremiumPro:true}),'open'));
}
test('premium does not bypass progression',()=>assert.equal(regionState({launch:open,regionId:5,highestUnlocked:2,verifiedPremiumPro:true}),'progress_locked'));
test('truthy strings cannot unlock membership',()=>assert.equal(regionState({launch:open,regionId:3,highestUnlocked:5,verifiedPremiumPro:'true'}),'premium_pro_required'));
test('invalid region fails closed',()=>assert.equal(regionState({launch:open,regionId:6,highestUnlocked:5}),'invalid'));
test('invalid countdown never displays misleading time',()=>assert.equal(countdownText(null),null));
