/**
 * Diji-Medu Phase 2 — LIVE SHADOW SINK
 *
 * Production-safe when DIJI_REALTIME_SHADOW_WRITE=false.
 * Existing Google Sheets operations remain authoritative.
 *
 * Enable only after this file is added and hook points are inserted.
 * Never put DIJI_REALTIME_SHADOW_SECRET in source code.
 */

const DIJI_LIVE_SHADOW_CONFIG_ = Object.freeze({
  enabledProperty: 'DIJI_REALTIME_SHADOW_WRITE',
  endpointProperty: 'DIJI_REALTIME_SHADOW_ENDPOINT',
  secretProperty: 'DIJI_REALTIME_SHADOW_SECRET',
  source: 'apps-script-live-shadow',
  payloadVersion: 1
});

function dijiLiveShadowEnabled_() {
  return PropertiesService.getScriptProperties()
    .getProperty(DIJI_LIVE_SHADOW_CONFIG_.enabledProperty) === 'true';
}

function dijiLiveShadowEmit_(eventType, stableId, studentId, payload) {
  if (!dijiLiveShadowEnabled_()) {
    return { ok: false, skipped: true, reason: 'feature_disabled' };
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const endpoint = props.getProperty(DIJI_LIVE_SHADOW_CONFIG_.endpointProperty);
    const secret = props.getProperty(DIJI_LIVE_SHADOW_CONFIG_.secretProperty);
    if (!endpoint || !secret) throw new Error('Shadow endpoint/secret not configured');

    const event = {
      eventId: eventType + ':' + String(stableId),
      eventType: eventType,
      occurredAt: new Date().toISOString(),
      studentId: studentId || null,
      source: DIJI_LIVE_SHADOW_CONFIG_.source,
      payloadVersion: DIJI_LIVE_SHADOW_CONFIG_.payloadVersion,
      payload: payload || {}
    };

    const response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-diji-shadow-secret': secret },
      payload: JSON.stringify(event),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();

    // Duplicate is an expected idempotent outcome, not a user-flow failure.
    if (code >= 200 && code < 300) {
      return { ok: true, httpCode: code, body: body.slice(0, 500) };
    }

    console.warn('Diji live shadow HTTP ' + code + ': ' + body.slice(0, 500));
    return { ok: false, httpCode: code, body: body.slice(0, 500) };
  } catch (err) {
    // Never block the existing Sheets operation.
    console.warn('Diji live shadow failed: ' + (err && err.message ? err.message : err));
    return { ok: false, error: String(err) };
  }
}

function dijiLiveShadowDuelCreated_(duelId, sender, recipient, game) {
  return dijiLiveShadowEmit_(
    'duel.created',
    'duel:' + String(duelId),
    sender,
    {
      duelId: String(duelId),
      opponentId: recipient || null,
      game: game || null
    }
  );
}

function dijiLiveShadowDuelResponse_(duelId, response, studentId) {
  const r = String(response || '').toLowerCase();
  const type = r === 'kabul' ? 'duel.accepted' : r === 'red' ? 'duel.rejected' : null;
  if (!type) return { ok: false, error: 'unsupported_duel_response' };

  return dijiLiveShadowEmit_(
    type,
    'duel:' + String(duelId) + ':response:' + r,
    studentId,
    { duelId: String(duelId), response: r }
  );
}

function dijiLiveShadowDuelCompleted_(duelId, studentId, winnerId) {
  return dijiLiveShadowEmit_(
    'duel.completed',
    'duel:' + String(duelId) + ':completed',
    studentId,
    { duelId: String(duelId), winnerId: winnerId || null }
  );
}

function dijiLiveShadowNotificationCreated_(notificationId, recipient, type) {
  return dijiLiveShadowEmit_(
    'notification.created',
    'notification:' + String(notificationId),
    recipient,
    { notificationId: String(notificationId), type: type || null }
  );
}

function dijiLiveShadowNotificationRead_(notificationId, studentId) {
  return dijiLiveShadowEmit_(
    'notification.read',
    'notification:' + String(notificationId) + ':read',
    studentId,
    { notificationId: String(notificationId) }
  );
}
