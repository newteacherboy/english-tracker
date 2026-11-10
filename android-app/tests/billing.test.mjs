import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCards, priceFor, yearlySaving, parentGate, gatePassed } from '../src/billing-core.js';

const products = [
  { id: 'diji_pro', plan: 'pro', name: 'Pro', listPrice: { aylik: 45, yillik: 380 } },
  { id: 'diji_premium_pro', plan: 'premium_pro', name: 'Premium Pro', listPrice: { aylik: 79, yillik: 700 } },
];
const store = [{ id: 'diji_pro', offers: [
  { basePlanId: 'aylik', offerId: null, phases: [{ price: '₺44,99', micros: 44990000 }] },
  { basePlanId: 'yillik', offerId: null, phases: [{ price: '₺379,99', micros: 379990000 }] },
  { basePlanId: 'yillik', offerId: 'deneme-7', phases: [{ price: 'Ücretsiz', micros: 0 }, { price: '₺379,99', micros: 379990000 }] },
] }];

test('Play prices win over list prices; missing store product is not sold', () => {
  const cards = planCards({ role: 'student', plan: 'free', products, storeProducts: store, period: 'aylik' });
  assert.deepEqual(cards.map(c => [c.id, c.action]), [['free', 'current'], ['diji_pro', 'buy'], ['diji_premium_pro', 'unavailable']]);
  assert.equal(cards[1].price.text, '₺44,99');
  assert.equal(cards[2].price.text, '79 TL');
});
test('yearly view shows saving and the free trial offer', () => {
  const pro = planCards({ role: 'student', plan: 'free', products, storeProducts: store, period: 'yillik' })[1];
  assert.equal(pro.price.text, '₺379,99'); assert.equal(pro.price.trialDays, 7); assert.equal(pro.saving, 30);
  assert.equal(yearlySaving(products[1]), 26);
});
test('Pro members can only upgrade; Premium Pro members see nothing to buy', () => {
  const asPro = planCards({ role: 'student', plan: 'pro', products, storeProducts: store });
  assert.equal(asPro.find(c => c.id === 'diji_pro').action, 'current');
  const asPremium = planCards({ role: 'student', plan: 'premium_pro', products, storeProducts: store });
  assert.deepEqual(asPremium.map(c => c.action), ['none', 'none', 'current']);
});
test('teacher plans are on sale when the store offers them', () => {
  const t = [{ id: 'teacher_pro', plan: 'pro', name: 'Öğretmen Pro', listPrice: { aylik: 59, yillik: 490 } }];
  assert.equal(planCards({ role: 'teacher', plan: 'free', products: t })[1].action, 'unavailable');
  const store = [{ id: 'teacher_pro', offers: [{ basePlanId: 'aylik', phases: [{ price: '59 TL', micros: 59000000 }] }] }];
  assert.equal(planCards({ role: 'teacher', plan: 'free', products: t, storeProducts: store })[1].action, 'buy');
});
test('parent gate needs the exact product', () => {
  const g = parentGate(() => 0);
  assert.equal(g.answer, 18); assert.ok(gatePassed(g, ' 18 ')); assert.ok(!gatePassed(g, '17')); assert.ok(!gatePassed(g, ''));
});
test('price falls back to a dash when neither store nor list has it', () => {
  assert.equal(priceFor({ listPrice: {} }, null, 'aylik').text, '—');
});
