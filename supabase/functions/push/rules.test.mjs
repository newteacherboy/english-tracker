import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, validToken, fcmMessage, deadToken, apnsMessage, apnsDead } from './rules.mjs';
test('text is trimmed, control chars removed, length capped', () => {
  assert.equal(cleanText('  Merhaba\n\tPapi  ', 60), 'Merhaba Papi');
  assert.equal(cleanText('x'.repeat(300), 200).length, 200);
});
test('only plausible FCM tokens are accepted', () => {
  assert.equal(validToken('short'), false);
  assert.equal(validToken('abc:APA91b' + 'x'.repeat(40)), true);
  assert.equal(validToken('abc def' + 'x'.repeat(40)), false);
});
test('message uses the genel channel and only whitelisted tabs', () => {
  const m = fcmMessage('t', { title: 'A', body: 'B', tab: 'oyunlar' });
  assert.equal(m.message.android.notification.channel_id, 'genel');
  assert.equal(m.message.data.tab, 'oyunlar');
  assert.equal(fcmMessage('t', { title: 'A', body: 'B', tab: 'javascript:' }).message.data.tab, undefined);
});
test('dead tokens are detected', () => {
  assert.equal(deadToken(404, {}), true);
  assert.equal(deadToken(400, { error: { status: 'INVALID_ARGUMENT' } }), true);
  assert.equal(deadToken(400, { error: { details: [{ errorCode: 'UNREGISTERED' }] } }), true);
  assert.equal(deadToken(500, {}), false);
});

test('iPhone message keeps the tab next to aps; dead APNs tokens detected', () => {
  const m = apnsMessage({ title: 'A', body: 'B', tab: 'magaza' });
  assert.deepEqual(m.aps.alert, { title: 'A', body: 'B' }); assert.equal(m.tab, 'magaza');
  assert.equal(apnsMessage({ title: 'A', body: 'B', tab: 'x' }).tab, undefined);
  assert.equal(apnsDead(410, {}), true); assert.equal(apnsDead(400, { reason: 'BadDeviceToken' }), true); assert.equal(apnsDead(429, {}), false);
  assert.equal(validToken('a'.repeat(64)), true);
});
