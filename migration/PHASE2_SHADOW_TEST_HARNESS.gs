/**
 * Diji-Medu Phase 2 — controlled shadow test harness.
 *
 * NOT imported by the production Apps Script.
 * Requires DIJI_REALTIME_SHADOW_WRITE=true only in a controlled test copy.
 *
 * This sends synthetic data only. Never use a real student id.
 */

function dijiShadowSyntheticTest_() {
  var eventId = 'synthetic:test:' + Utilities.getUuid();

  var event = {
    eventId: eventId,
    eventType: 'notification.created',
    occurredAt: new Date().toISOString(),
    studentId: 'synthetic-student',
    source: 'apps-script-shadow-test',
    payloadVersion: 1,
    payload: {
      notificationId: 'synthetic-notification',
      type: 'test'
    }
  };

  var result = dijiShadowPost_(event);
  console.log(JSON.stringify(result));

  return {
    eventId: eventId,
    result: result
  };
}

/**
 * Idempotency test: sends the SAME event twice.
 * Expected:
 *   first -> ok:true
 *   second -> ok:true, duplicate:true
 *
 * Run only after the first synthetic test succeeds.
 */
function dijiShadowSyntheticIdempotencyTest_() {
  var eventId = 'synthetic:idempotency:' + Utilities.getUuid();

  var event = {
    eventId: eventId,
    eventType: 'notification.created',
    occurredAt: new Date().toISOString(),
    studentId: 'synthetic-student',
    source: 'apps-script-shadow-test',
    payloadVersion: 1,
    payload: {
      notificationId: 'synthetic-idempotency',
      type: 'test'
    }
  };

  var first = dijiShadowPost_(event);
  var second = dijiShadowPost_(event);

  return {
    eventId: eventId,
    first: first,
    second: second
  };
}

/**
 * Safety check: this must not call the network when the flag is OFF.
 */
function dijiShadowDisabledCheck_() {
  var props = PropertiesService.getScriptProperties();
  var previous = props.getProperty(DIJI_SHADOW_CONFIG_.enabledProperty);

  props.setProperty(DIJI_SHADOW_CONFIG_.enabledProperty, 'false');

  try {
    var result = dijiShadowPost_({
      eventId: 'synthetic:disabled:' + Utilities.getUuid(),
      eventType: 'notification.created',
      occurredAt: new Date().toISOString(),
      studentId: 'synthetic-student',
      source: 'apps-script-shadow-test',
      payloadVersion: 1,
      payload: { type: 'disabled-check' }
    });

    if (!result.skipped || result.reason !== 'feature_disabled') {
      throw new Error('Shadow OFF safety check failed');
    }

    return result;
  } finally {
    if (previous === null) {
      props.deleteProperty(DIJI_SHADOW_CONFIG_.enabledProperty);
    } else {
      props.setProperty(DIJI_SHADOW_CONFIG_.enabledProperty, previous);
    }
  }
}
