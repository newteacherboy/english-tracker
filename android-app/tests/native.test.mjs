import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recognitionClass } from '../src/speech.js';
import { createTestAds } from '../src/ads.js';
const tick = () => new Promise(resolve => setImmediate(resolve));

test('microphone denied: reports error and ends without starting recording', async () => {
  let started = false;
  const SR = recognitionClass({ available: async () => ({ available: true }), checkPermissions: async () => ({ speechRecognition: 'denied' }), requestPermissions: async () => ({ speechRecognition: 'denied' }), start: async () => { started = true; } });
  const r = new SR(), events = [];
  r.onerror = () => events.push('error'); r.onend = () => events.push('end');
  r.start(); await tick(); assert.equal(started, false); assert.deepEqual(events, ['error', 'end']);
});
test('native recognition preserves alternatives expected by route games', async () => {
  const SR = recognitionClass({ available: async () => ({ available: true }), checkPermissions: async () => ({ speechRecognition: 'granted' }), start: async () => ({ matches: ['apple', 'apples'] }) });
  const r = new SR(); let result, ended = 0;
  r.onresult = e => { result = e.results[0]; }; r.onend = () => ended++;
  r.start(); await tick(); assert.equal(result[0].transcript, 'apple'); assert.equal(result.isFinal, true); assert.equal(result.length, 2); assert.equal(ended, 1);
});
test('leaving a question ignores late microphone results', async () => {
  let resolve;
  const SR = recognitionClass({ available: async () => ({ available: true }), checkPermissions: async () => ({ speechRecognition: 'granted' }), start: () => new Promise(r => { resolve = r; }), stop: async () => {} });
  const r = new SR(); let results = 0, ended = 0;
  r.onresult = () => results++; r.onend = () => ended++;
  r.start(); await tick(); r.abort(); await tick(); resolve({ matches: ['apple'] }); await tick();
  assert.equal(results, 0); assert.equal(ended, 1);
});
function setup({ teacher = false, fail = false, reward = true } = {}) {
  const handlers = new Map(); let removed = 0, prepared = 0;
  const win = { dmAndroidIsTeacher: () => teacher, sessionStorage: { getItem: () => null }, document: { documentElement: { matches: () => false }, body: { classList: { contains: () => false } } } };
  const events = { Rewarded: 'reward', Dismissed: 'dismiss', FailedToShow: 'fail' };
  const native = { initialize: async options => { assert.equal(options.tagForChildDirectedTreatment, true); assert.equal(options.initializeForTesting, true); }, addListener: async (name, fn) => { handlers.set(name, fn); return { remove: async () => { removed++; handlers.delete(name); } }; }, prepareRewardVideoAd: async () => { prepared++; if (fail) throw new Error('no fill'); }, showRewardVideoAd: async () => { if (reward) handlers.get('reward')(); handlers.get('dismiss')(); } };
  return { ads: createTestAds(native, win, events), get prepared() { return prepared; }, get removed() { return removed; } };
}
test('teacher mode never initializes or loads an ad', async () => {
  const s = setup({ teacher: true }); await assert.rejects(s.ads.show(), /Öğretmen/); assert.equal(s.prepared, 0);
});
test('completed demo ad grants no live energy', async () => {
  const s = setup(); assert.deepEqual(await s.ads.show(), { completed: true, test: true, energyGranted: 0 }); assert.equal(s.removed, 3);
});
test('dismissal before reward is not counted as completion', async () => {
  const s = setup({ reward: false }); const result = await s.ads.show(); assert.equal(result.completed, false); assert.equal(result.energyGranted, 0);
});
test('no-fill removes listeners, unlocks and permits a retry', async () => {
  const s = setup({ fail: true }); await assert.rejects(s.ads.show(), /no fill/); await assert.rejects(s.ads.show(), /no fill/); assert.equal(s.prepared, 2); assert.equal(s.removed, 6);
});
