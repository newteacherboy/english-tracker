# Phase 2 — Live State / History Boundary

This document is design-only. It does not change production behavior.

## Principle

Google Sheets remains the historical/reporting source for protected and long-lived English-learning data.

The future realtime layer is an operational projection, not the authoritative replacement for learning history.

## First migration candidates

### Realtime / operational candidates
- active duel state
- presence / online status
- temporary notification delivery state
- chat delivery/read state where low-latency delivery is required
- temporary sync queue state
- active session/connection state

### Historical / protected candidates
- student/account identity
- lesson history
- lesson progress history
- level progression
- scores
- study-time history
- book/reading history
- achievements/badges
- completed duel history
- important reports

## EkVeri rule

EkVeri must NOT be migrated or cleaned as one homogeneous dataset.

Its keys represent different concepts and may have different lifecycles. Before migration, every key used by the application must be inventoried and classified as:
- current state
- historical state
- idempotency/control state
- temporary state
- protected configuration

No key is eligible for deletion until explicitly classified.

## Shadow-write contract

During the first live experiment:

1. Existing Apps Script/Sheets write remains authoritative.
2. A successful existing write may additionally emit a shadow event to the future backend.
3. A shadow-write failure must not prevent the existing user action from succeeding.
4. Shadow writes must carry a unique transaction/event ID.
5. The same transaction/event ID must be safely retryable (idempotent).
6. No user-facing read should depend on the shadow backend during this phase.
7. Mismatches are logged for comparison; they are not auto-corrected by destructive operations.

## Suggested event envelope

{
  eventId,
  eventType,
  occurredAt,
  studentId,
  source,
  payloadVersion,
  payload
}

The backend should store the eventId as an idempotency key.

## Time tracking

The browser may maintain the active counter locally, but the existing 30-second write pattern should not be copied into a realtime backend blindly.

Target behavior:
- local active counter
- flush on lifecycle events
- periodic sync around 3–5 minutes
- offline queue when unavailable
- background/locked phone time must not be counted as active study time
- server-side aggregation must be idempotent

## Rollout flags

Future implementation should have independent flags, for example:
- realtimeShadowWrite
- realtimeReadCompare
- realtimePresence
- realtimeDuel
- realtimeChat

Default for all new flags: OFF.

## Rollback

If any shadow path causes errors, latency, quota pressure, duplicate writes, or data mismatch:
- disable the relevant flag
- retain existing Apps Script/Sheets flow
- keep collected diagnostic information
- do not delete or rewrite historical data automatically

## Explicit non-goals

This phase does not:
- replace Google Sheets
- delete old rows
- change retention periods
- make the realtime backend authoritative
- alter the user-facing English-learning workflow
