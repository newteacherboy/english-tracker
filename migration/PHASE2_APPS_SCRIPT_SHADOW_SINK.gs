/**
 * Diji-Medu — Phase 2 Supabase shadow sink
 *
 * STATUS: migration implementation, NOT wired into production.
 * Copy/integrate only after the Edge Function endpoint + secret are configured.
 *
 * Safety:
 * - Existing Sheets writes remain authoritative.
 * - This function never writes/deletes Sheets rows.
 * - Shadow failure is swallowed and logged.
 * - Secret is read from Script Properties, never hard-coded.
 */

const DIJI_SHADOW_CONFIG_ = Object.freeze({
  enabledProperty: 'DIJI_REALTIME_SHADOW_WRITE',
  endpointProperty: 'DIJI_REALTIME_SHADOW_ENDPOINT',
  secretProperty: 'DIJI_REALTIME_SHADOW_SECRET',
  source: 'apps-script-shadow',
  payloadVersion: 1
});

function dijiShadowEnabled_() {
  return PropertiesService.getScriptProperties()
    .getProperty(DIJI_SHADOW_CONFIG_.enabledProperty) === 'true';
}

function dijiShadowEventId_(type, stableId) {
  if (!type || !stableId) throw new Error('Shadow event requires type + stableId');
  return type + ':' + stableId;
}

function dijiShadowPost_(event) {
  if (!dijiShadowEnabled_()) {
    return { ok: false, skipped: true, reason: 'feature_disabled' };
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const endpoint = props.getProperty(DIJI_SHADOW_CONFIG_.endpointProperty);
    const secret = props.getProperty(DIJI_SHADOW_CONFIG_.secretProperty);

    if (!endpoint || !secret) {
      throw new Error('Shadow endpoint/secret not configured');
    }

    const response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-diji-shadow-secret': secret
      },
      payload: JSON.stringify(event),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code < 200 || code >= 300) {
      throw new Error('Shadow HTTP ' + code + ': ' + body.slice(0, 500));
    }

    return { ok: true, response: body };
  } catch (err) {
    // Never break the existing Sheets/user operation.
    console.warn('Diji shadow write failed: ' + (err && err.message ? err.message : err));
    return { ok: false, error: String(err) };
  }
}

function dijiShadowEmit_(eventType, stableId, studentId, payload) {
  const event = {
    eventId: dijiShadowEventId_(eventType, stableId),
    eventType: eventType,
    occurredAt: new Date().toISOString(),
    studentId: studentId || null,
    source: DIJI_SHADOW_CONFIG_.source,
    payloadVersion: DIJI_SHADOW_CONFIG_.payloadVersion,
    payload: payload || {}
  };

  return dijiShadowPost_(event);
}

// Duel integration helpers.
// Call only AFTER the existing Duello sheet operation succeeds.
function dijiShadowDuelCreated_(duelId, studentId, opponentId, extra) {
  return dijiShadowEmit_(
    'duel.created',
    'duel:' + duelId,
    studentId,
    Object.assign({ duelId: String(duelId), opponentId: opponentId || null }, extra || {})
  );
}

function dijiShadowDuelResponse_(duelId, response, studentId) {
  const normalized = String(response || '').toLowerCase();
  const eventType = normalized === 'kabul'
    ? 'duel.accepted'
    : normalized === 'red'
      ? 'duel.rejected'
      : null;

  if (!eventType) throw new Error('Unsupported duel response');
  return dijiShadowEmit_(
    eventType,
    'duel:' + duelId + ':response:' + normalized,
    studentId,
    { duelId: String(duelId), response: normalized }
  );
}

function dijiShadowDuelCompleted_(duelId, studentId, winnerId) {
  return dijiShadowEmit_(
    'duel.completed',
    'duel:' + duelId + ':completed',
    studentId,
    { duelId: String(duelId), winnerId: winnerId || null }
  );
}

// Notification delivery/read helpers.
function dijiShadowNotificationCreated_(notificationId, studentId, type) {
  return dijiShadowEmit_(
    'notification.created',
    'notification:' + notificationId,
    studentId,
    { notificationId: String(notificationId), type: type || null }
  );
}

function dijiShadowNotificationRead_(notificationId, studentId) {
  return dijiShadowEmit_(
    'notification.read',
    'notification:' + notificationId + ':read',
    studentId,
    { notificationId: String(notificationId) }
  );
}

// Chat helpers. Keep message body out of the first projection unless required.
function dijiShadowChatMessage_(messageId, studentId, recipientId) {
  return dijiShadowEmit_(
    'chat.message',
    'chat:' + messageId,
    studentId,
    { messageId: String(messageId), recipientId: recipientId || null }
  );
}

function dijiShadowChatRead_(messageId, studentId) {
  return dijiShadowEmit_(
    'chat.read',
    'chat:' + messageId + ':read',
    studentId,
    { messageId: String(messageId) }
  );
}
