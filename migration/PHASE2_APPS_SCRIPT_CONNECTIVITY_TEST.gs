/**
 * Diji-Medu Phase 2 — controlled Apps Script connectivity test.
 *
 * SAFE TEST FILE:
 * - Synthetic data only.
 * - No Sheets read/write.
 * - No student data.
 * - Does not modify index.html.
 * - Uses only Script Properties + Supabase shadow endpoint.
 *
 * Required Script Properties:
 *   DIJI_REALTIME_SHADOW_WRITE
 *   DIJI_REALTIME_SHADOW_ENDPOINT
 *   DIJI_REALTIME_SHADOW_SECRET
 *
 * Run order:
 *   1) dijiConnectivityTestDisabled_
 *   2) Set DIJI_REALTIME_SHADOW_WRITE=true
 *   3) dijiConnectivityTestSynthetic_
 *   4) dijiConnectivityTestIdempotency_
 *
 * After testing, set DIJI_REALTIME_SHADOW_WRITE=false.
 */

const DIJI_CONNECTIVITY_TEST_CONFIG_ = Object.freeze({
  enabledProperty: 'DIJI_REALTIME_SHADOW_WRITE',
  endpointProperty: 'DIJI_REALTIME_SHADOW_ENDPOINT',
  secretProperty: 'DIJI_REALTIME_SHADOW_SECRET'
});

function dijiConnectivityTestPost_(event) {
  const props = PropertiesService.getScriptProperties();

  if (props.getProperty(DIJI_CONNECTIVITY_TEST_CONFIG_.enabledProperty) !== 'true') {
    return { ok: false, skipped: true, reason: 'feature_disabled' };
  }

  const endpoint = props.getProperty(DIJI_CONNECTIVITY_TEST_CONFIG_.endpointProperty);
  const secret = props.getProperty(DIJI_CONNECTIVITY_TEST_CONFIG_.secretProperty);

  if (!endpoint || !secret) {
    throw new Error('Shadow endpoint veya secret Script Properties içinde eksik.');
  }

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-diji-shadow-secret': secret },
    payload: JSON.stringify(event),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();

  return {
    httpCode: code,
    body: body.slice(0, 1000),
    ok: code >= 200 && code < 300
  };
}

function dijiConnectivityTestDisabled_() {
  const props = PropertiesService.getScriptProperties();
  const previous = props.getProperty(DIJI_CONNECTIVITY_TEST_CONFIG_.enabledProperty);

  props.setProperty(DIJI_CONNECTIVITY_TEST_CONFIG_.enabledProperty, 'false');

  try {
    const result = dijiConnectivityTestPost_({
      eventId: 'synthetic:disabled:' + Utilities.getUuid(),
      eventType: 'notification.created',
      occurredAt: new Date().toISOString(),
      studentId: 'synthetic-student',
      source: 'apps-script-connectivity-test',
      payloadVersion: 1,
      payload: { test: 'disabled-check' }
    });

    if (!result.skipped || result.reason !== 'feature_disabled') {
      throw new Error('OFF güvenlik testi başarısız: ağ isteği engellenmedi.');
    }

    console.log(JSON.stringify(result));
    return result;
  } finally {
    if (previous === null) {
      props.deleteProperty(DIJI_CONNECTIVITY_TEST_CONFIG_.enabledProperty);
    } else {
      props.setProperty(DIJI_CONNECTIVITY_TEST_CONFIG_.enabledProperty, previous);
    }
  }
}

function dijiConnectivityTestSynthetic_() {
  const eventId = 'synthetic:connectivity:' + Utilities.getUuid();

  const result = dijiConnectivityTestPost_({
    eventId: eventId,
    eventType: 'notification.created',
    occurredAt: new Date().toISOString(),
    studentId: 'synthetic-student',
    source: 'apps-script-connectivity-test',
    payloadVersion: 1,
    payload: {
      notificationId: 'synthetic-connectivity',
      type: 'connectivity-test'
    }
  });

  console.log(JSON.stringify({ eventId: eventId, result: result }));
  return { eventId: eventId, result: result };
}

function dijiConnectivityTestIdempotency_() {
  const eventId = 'synthetic:idempotency:' + Utilities.getUuid();

  const event = {
    eventId: eventId,
    eventType: 'notification.created',
    occurredAt: new Date().toISOString(),
    studentId: 'synthetic-student',
    source: 'apps-script-connectivity-test',
    payloadVersion: 1,
    payload: {
      notificationId: 'synthetic-idempotency',
      type: 'idempotency-test'
    }
  };

  const first = dijiConnectivityTestPost_(event);
  const second = dijiConnectivityTestPost_(event);

  console.log(JSON.stringify({
    eventId: eventId,
    first: first,
    second: second
  }));

  return {
    eventId: eventId,
    first: first,
    second: second
  };
}
