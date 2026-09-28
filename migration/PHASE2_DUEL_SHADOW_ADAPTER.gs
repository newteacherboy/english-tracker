/**
 * Phase 2 — Duel shadow event adapter
 *
 * DESIGN / NON-PRODUCTION ONLY.
 * This file is intentionally NOT called by doPostAsil(), duelloIsle_(),
 * or any existing frontend flow.
 *
 * Purpose:
 * - Define the event contract for active-duel shadow writes.
 * - Keep Google Sheets authoritative.
 * - Make retries idempotent by eventId.
 * - Never delete, overwrite, or reconcile historical Sheets data.
 *
 * Provider-neutral: no Firebase/Supabase credentials or network calls are
 * included until a backend provider is explicitly selected and approved.
 */

var DUEL_SHADOW_EVENT_VERSION = 1;
var DUEL_SHADOW_SOURCE = 'apps-script';

function duelShadowEvent_(input) {
  input = input || {};

  var eventId = String(input.eventId || '').trim();
  var eventType = String(input.eventType || '').trim();
  var studentId = String(input.studentId || '').trim();

  if (!eventId || !eventType || !studentId) {
    throw new Error('Duel shadow event requires eventId, eventType and studentId');
  }

  return {
    eventId: eventId,
    eventType: eventType,
    occurredAt: input.occurredAt || new Date().toISOString(),
    studentId: studentId,
    source: DUEL_SHADOW_SOURCE,
    payloadVersion: DUEL_SHADOW_EVENT_VERSION,
    payload: input.payload || {}
  };
}

/**
 * Creates the provider-neutral event for a newly created duel.
 * The existing Duello row remains authoritative.
 */
function duelShadowCreatedEvent_(row) {
  row = row || {};

  return duelShadowEvent_({
    eventId: 'duel:' + String(row.id || ''),
    eventType: 'duel.created',
    studentId: String(row.sender || row.gonderen || ''),
    occurredAt: row.occurredAt || new Date().toISOString(),
    payload: {
      duelId: String(row.id || ''),
      sender: String(row.sender || row.gonderen || ''),
      receiver: String(row.receiver || row.alici || ''),
      game: String(row.game || row.oyun || ''),
      status: String(row.status || row.durum || 'bekliyor')
    }
  });
}

/**
 * Creates the event for an invitation response.
 * eventId is stable for a given duel + response state.
 */
function duelShadowResponseEvent_(row, accepted) {
  row = row || {};

  var duelId = String(row.id || '');
  var status = accepted ? 'kabul' : 'red';

  return duelShadowEvent_({
    eventId: 'duel:' + duelId + ':response:' + status,
    eventType: accepted ? 'duel.accepted' : 'duel.rejected',
    studentId: String(row.receiver || row.alici || ''),
    occurredAt: row.occurredAt || new Date().toISOString(),
    payload: {
      duelId: duelId,
      sender: String(row.sender || row.gonderen || ''),
      receiver: String(row.receiver || row.alici || ''),
      game: String(row.game || row.oyun || ''),
      status: status
    }
  });
}

/**
 * Creates a comparison event when the existing Sheets flow determines
 * that a duel has completed. This is diagnostic only.
 */
function duelShadowCompletedEvent_(row, winner, scores) {
  row = row || {};
  scores = scores || {};

  var duelId = String(row.id || '');

  return duelShadowEvent_({
    eventId: 'duel:' + duelId + ':completed',
    eventType: 'duel.completed',
    studentId: String(row.sender || row.gonderen || ''),
    occurredAt: new Date().toISOString(),
    payload: {
      duelId: duelId,
      sender: String(row.sender || row.gonderen || ''),
      receiver: String(row.receiver || row.alici || ''),
      game: String(row.game || row.oyun || ''),
      winner: String(winner || ''),
      senderScore: Number(scores.senderScore || 0),
      receiverScore: Number(scores.receiverScore || 0),
      status: 'bitti'
    }
  });
}

/**
 * IMPORTANT:
 * This function intentionally does NOT perform a network write.
 * It only returns the event for a future, separately approved adapter.
 */
function duelShadowPrepare_(input) {
  return duelShadowEvent_(input);
}
