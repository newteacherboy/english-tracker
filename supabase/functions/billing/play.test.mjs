import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { interpret, accountRef, tokenKey, serviceJwt, parseRtdn, productsFor, PRODUCTS } from './play.mjs';

const now = Date.parse('2026-11-04T10:00:00Z');
const sub = (state, extra = {}) => ({ subscriptionState: state, acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
  lineItems: [{ productId: 'diji_pro', expiryTime: '2026-12-04T10:00:00Z', offerDetails: { basePlanId: 'aylik' } }], ...extra });

test('active, canceled-but-paid and grace subscriptions grant access until expiry', () => {
  for (const s of ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_CANCELED', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD']) {
    const r = interpret(sub(s), now);
    assert.equal(r.state, 'verified'); assert.equal(r.productId, 'diji_pro'); assert.equal(r.validUntil, '2026-12-04T10:00:00.000Z'); assert.equal(r.basePlanId, 'aylik');
  }
});
test('expired, on hold, paused and past-expiry subscriptions do not grant access', () => {
  for (const s of ['SUBSCRIPTION_STATE_EXPIRED', 'SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED']) assert.equal(interpret(sub(s), now).state, 'expired');
  assert.equal(interpret(sub('SUBSCRIPTION_STATE_ACTIVE'), Date.parse('2027-01-01T00:00:00Z')).state, 'expired');
  assert.equal(interpret(sub('SUBSCRIPTION_STATE_PENDING'), now).state, 'pending');
});
test('unknown products are rejected and acknowledgement is only requested for paid, unacknowledged purchases', () => {
  assert.equal(interpret({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [{ productId: 'baska', expiryTime: '2026-12-04T10:00:00Z' }] }, now).state, 'invalid');
  assert.equal(interpret(sub('SUBSCRIPTION_STATE_ACTIVE'), now).needsAck, true);
  assert.equal(interpret(sub('SUBSCRIPTION_STATE_ACTIVE', { acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }), now).needsAck, false);
  assert.equal(interpret(sub('SUBSCRIPTION_STATE_EXPIRED'), now).needsAck, false);
});
test('account reference fits Play limits and differs per role', async () => {
  const a = await accountRef('student', 'x'), b = await accountRef('teacher', 'x');
  assert.match(a, /^[0-9a-f]{64}$/); assert.notEqual(a, b);
  assert.match(await tokenKey('tok'), /^play:[0-9a-f]{64}$/);
});
test('each role sees only its own four prices', () => {
  assert.deepEqual(productsFor('student').map(p => p.id), ['diji_pro', 'diji_premium_pro']);
  assert.deepEqual(productsFor('teacher').map(p => p.id), ['teacher_pro', 'teacher_premium_pro']);
  assert.deepEqual(PRODUCTS.diji_premium_pro.listPrice, { aylik: 79, yillik: 700 });
});
test('service JWT is RS256-signed for the androidpublisher scope', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwt = await serviceJwt({ client_email: 'sa@x.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }, 1000);
  const [h, b, s] = jwt.split('.');
  const claims = JSON.parse(Buffer.from(b, 'base64url'));
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/androidpublisher'); assert.equal(claims.exp, 4600);
  assert.ok(createVerify('RSA-SHA256').update(h + '.' + b).verify(publicKey, Buffer.from(s, 'base64url')));
});
test('RTDN parsing only accepts this app and known subscriptions', () => {
  const wrap = m => ({ message: { messageId: '9', data: Buffer.from(JSON.stringify(m)).toString('base64') } });
  assert.deepEqual(parseRtdn(wrap({ packageName: 'com.dijimedu.ingilizce', subscriptionNotification: { purchaseToken: 't', subscriptionId: 'diji_pro', notificationType: 2 } })),
    { purchaseToken: 't', productId: 'diji_pro', type: 2, eventId: '9' });
  assert.equal(parseRtdn(wrap({ packageName: 'com.baska', subscriptionNotification: { purchaseToken: 't', subscriptionId: 'diji_pro' } })), null);
  assert.equal(parseRtdn(wrap({ packageName: 'com.dijimedu.ingilizce', testNotification: { version: '1.0' } })).purchaseToken, undefined);
  assert.equal(parseRtdn({}), null);
});
