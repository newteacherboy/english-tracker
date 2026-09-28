/*
 * Diji-Medu Phase 2 realtime shadow adapter.
 * DRAFT / NOT IMPORTED BY index.html.
 *
 * Contract:
 * - Existing Apps Script/Google Sheets operation remains authoritative.
 * - Shadow failure never blocks the user action.
 * - eventId/transactionId is stable for idempotent retry.
 * - No durable learning history is written here.
 */

(function (global) {
  "use strict";

  const FLAGS = {
    realtimeShadowWrite: false,
    realtimeReadCompare: false,
    realtimePresence: false,
    realtimeDuel: false,
    realtimeChat: false
  };

  const QUEUE_KEY = "dijimedu_realtime_sync_queue_v1";

  function readQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function writeQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  function enqueue(item) {
    const queue = readQueue();
    if (!queue.some(x => x.transactionId === item.transactionId)) {
      queue.push(item);
      writeQueue(queue);
    }
  }

  function eventId(type, id) {
    return type + ":" + String(id);
  }

  function buildEvent(type, studentId, transactionId, payload) {
    return {
      eventId: eventId(type, transactionId),
      transactionId: transactionId,
      eventType: type,
      occurredAt: new Date().toISOString(),
      studentId: String(studentId || ""),
      source: "english-tracker",
      payloadVersion: 1,
      payload: payload || {}
    };
  }

  async function shadowWrite(event) {
    if (!FLAGS.realtimeShadowWrite) return { skipped: true };

    // Provider-specific transport is intentionally absent until the
    // realtime provider is connected and credentials are configured.
    enqueue(event);
    return { queued: true };
  }

  global.DijiMeduRealtimeShadow = {
    flags: FLAGS,
    buildEvent,
    shadowWrite,
    enqueue,
    readQueue
  };
})(window);
