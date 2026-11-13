import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const src = readFileSync(new URL('../ingilizce/dm-satis.js', import.meta.url), 'utf8');
const priceCode = src.slice(src.indexOf('  function storePrice('), src.indexOf('\n  let screen = null;'));
const buyCode = src.slice(src.indexOf('  async function buy('), src.indexOf('\n  // ---------------------------------------------------------------- eski pencereleri'));
const product = { id: 'diji_premium_pro', list: { aylik: 79, yillik: 700 } };
const base = { basePlanId: 'aylik', phases: [{ price: '₺89,99', micros: 89990000, period: 'P1M' }] };
const trial = { basePlanId: 'aylik', offerId: 'trial7', phases: [{ price: 'Ücretsiz', micros: 0, period: 'P7D' }, base.phases[0]] };
const storeProduct = offers => ({ id: product.id, offers });
function fixture(offers = [base, trial], { apple = false, now = Date.parse('2026-11-14T12:00:00+03:00') } = {}) {
  const calls = [], messages = [];
  const p = { getProducts: async () => ({ products: [storeProduct(offers)] }), purchase: async args => { calls.push(args); return { canceled: true }; } };
  const ui = { busy: false, period: 'aylik', products: [] };
  const ctx = { p, ui, status: { products: [product], entitlements: [], accountRef: 'test-account' } };
  const api = runInNewContext(priceCode + buyCode + '\n({storePrice,buy})', {
    TL: n => n + ' TL', STUDENT: { plans: [{}, product] }, billing: () => ({}), ios: () => apple, Date: { now: () => now, parse: Date.parse },
  });
  return { ...api, ctx, calls, messages, say: text => messages.push(text) };
}
test('only an unambiguous 7-day trial followed by monthly renewal enables the campaign', () => {
  const { storePrice } = fixture();
  for (const period of ['P7D', 'P1W']) {
    const offer = { ...trial, phases: [{ ...trial.phases[0], period }, base.phases[0]] };
    const pr = storePrice(product, storeProduct([base, offer]), 'aylik');
    assert.equal(pr.campaign, true); assert.equal(pr.text, '₺89,99');
  }
  const cases = [[], [base], [base, { ...trial, phases: [{ ...trial.phases[0], period: 'P3D' }, base.phases[0]] }],
    [base, { ...trial, phases: trial.phases.map(({ period, ...phase }) => phase) }],
    [base, trial, { ...trial, offerId: 'other' }],
    [base, { ...trial, phases: [...trial.phases, base.phases[0]] }],
    [base, { ...trial, phases: [trial.phases[0], { ...base.phases[0], period: 'P1Y' }] }]];
  for (const offers of cases) assert.equal(storePrice(product, storeProduct(offers), 'aylik').campaign, false);
  assert.equal(storePrice({ ...product, id: 'diji_pro' }, storeProduct([base, trial]), 'aylik').campaign, false);
  assert.equal(storePrice(product, storeProduct([base, trial]), 'yillik').campaign, false);
});
test('a vanished free trial never falls back to a paid purchase', async () => {
  const f = fixture([base]);
  await f.buy(f.ctx, product.id, f.say, () => {}, true);
  assert.equal(f.calls.length, 0); assert.equal(f.ctx.ui.busy, false);
  assert.match(f.messages.at(-1), /deneme şu an kullanılamıyor/);
});
test('valid trial purchase uses the monthly plan and duplicate clicks are ignored', async () => {
  const f = fixture();
  await Promise.all([f.buy(f.ctx, product.id, f.say, () => {}, true), f.buy(f.ctx, product.id, f.say, () => {}, true)]);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].basePlanId, 'aylik');
  assert.equal(f.calls[0].productId, product.id); assert.equal(f.ctx.ui.busy, false);
});

test('verified Turkish iOS campaign supports the existing StoreKit bridge without changing the app binary', () => {
  const appleOffer = { basePlanId: 'aylik', offerId: 'deneme', phases: [{ price: 'Ücretsiz', micros: 0 }, { price: '₺79,99', micros: 79990000 }] };
  const sp = storeProduct([{ basePlanId: 'aylik', phases: [appleOffer.phases[1]] }, appleOffer]);
  const f = fixture([], { apple: true });
  assert.equal(f.storePrice(product, sp, 'aylik').campaign, true);
  assert.equal(f.storePrice(product, sp, 'aylik').text, '₺79,99');
  assert.equal(fixture().storePrice(product, sp, 'aylik').campaign, false);
  for (const now of [Date.parse('2026-11-13T20:59:59Z'), Date.parse('2027-03-01T21:00:00Z')])
    assert.equal(fixture([], { apple: true, now }).storePrice(product, sp, 'aylik').campaign, false);
  assert.equal(f.storePrice(product, storeProduct([]), 'aylik').campaign, false);
  assert.equal(f.storePrice(product, storeProduct([{ ...appleOffer, phases: [appleOffer.phases[0], { price: '$4.99', micros: 4990000 }] }]), 'aylik').campaign, false);
  assert.equal(f.storePrice(product, storeProduct([{ ...appleOffer, phases: [{ ...appleOffer.phases[0], period: 'P3D' }, appleOffer.phases[1]] }]), 'aylik').campaign, false);
  assert.equal(f.storePrice({ ...product, id: 'diji_pro' }, sp, 'aylik').campaign, false);
  assert.equal(f.storePrice(product, sp, 'yillik').campaign, false);
});
