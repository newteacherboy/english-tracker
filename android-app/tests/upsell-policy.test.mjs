import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUpsellPolicy } from '../src/upsell-policy.js';
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('no offer in the first minute after app start (Families policy)', () => {
  let t = 1_000_000; const p = createUpsellPolicy({ storage: mem(), now: () => t, startedAt: t });
  assert.equal(p.canSheet({ energy: 2, plan: 'free' }), false);
  t += 61_000; assert.equal(p.canSheet({ energy: 2, plan: 'free' }), true);
});
test('energy sheet: low energy only, twice a day, and "not now" silences the day', () => {
  let t = Date.parse('2026-11-04T10:00:00'); const p = createUpsellPolicy({ storage: mem(), now: () => t, startedAt: 0 });
  assert.equal(p.canSheet({ energy: 6, plan: 'free' }), false);
  assert.equal(p.canSheet({ energy: 4, plan: 'premium_pro' }), false);
  p.sheetShown(); p.sheetShown(); assert.equal(p.canSheet({ energy: 1, plan: 'free' }), false);
  t += 86_400_000; assert.equal(p.canSheet({ energy: 1, plan: 'pro' }), true);
  p.sheetDismissed(); assert.equal(p.canSheet({ energy: 1, plan: 'pro' }), false);
});
test('top drop only when energy crosses below 5, once a day', () => {
  const t = Date.parse('2026-11-04T10:00:00'); const p = createUpsellPolicy({ storage: mem(), now: () => t, startedAt: 0 });
  assert.equal(p.canDrop({ energy: 3, previous: 3, plan: 'free' }), false);
  assert.equal(p.canDrop({ energy: 4, previous: 5, plan: 'free' }), true);
  p.dropShown(); assert.equal(p.canDrop({ energy: 4, previous: 5, plan: 'free' }), false);
});
test('success card: first result of the day, Free only, at most weekly', () => {
  let t = Date.parse('2026-11-04T10:00:00'); const p = createUpsellPolicy({ storage: mem(), now: () => t, startedAt: 0 });
  assert.equal(p.canSuccess({ plan: 'free' }), true); p.successShown();
  assert.equal(p.canSuccess({ plan: 'free' }), false);
  t += 2 * 86_400_000; assert.equal(p.canSuccess({ plan: 'free' }), false);
  t += 6 * 86_400_000; assert.equal(p.canSuccess({ plan: 'pro' }), false);
  t += 86_400_000; assert.equal(p.canSuccess({ plan: 'free' }), true);
});
