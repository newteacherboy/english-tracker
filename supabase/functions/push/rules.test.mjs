import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, validToken, fcmMessage, deadToken } from './rules.mjs';
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
