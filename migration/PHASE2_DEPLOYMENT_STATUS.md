# Phase 2 Deployment Status

Date: 2026-09-28

## Completed

- Supabase project is ACTIVE_HEALTHY.
- Realtime schema exists:
  - realtime_events
  - presence_sessions
  - active_duels
  - notification_delivery
  - chat_delivery
  - sync_queue
- RLS is enabled on all six tables.
- Client realtime publication exists only for presence_sessions, active_duels,
  notification_delivery and chat_delivery.
- Edge Function deployed:
  - diji-shadow-ingest
  - verify_jwt=false because the function uses a dedicated custom secret header.
- The function accepts only the allowlisted event types and rejects forbidden
  credential-like payload fields.
- realtime_events remains empty until an authenticated shadow event is sent.

## Blocked intentionally

The deployment tool available to this workspace cannot configure Edge Function
environment secrets. Therefore DIJI_SHADOW_SECRET has NOT been configured.

Do not:
- remove the secret check;
- put a secret into GitHub;
- put a secret into index.html;
- send real user events before the secret is configured;
- enable the Apps Script shadow flag in production.

## Required external configuration

Set the Edge Function secret:
  DIJI_SHADOW_SECRET=<random high-entropy secret>

Set Apps Script Script Properties:
  DIJI_REALTIME_SHADOW_WRITE=false   # keep OFF until synthetic test
  DIJI_REALTIME_SHADOW_ENDPOINT=<Supabase function endpoint>
  DIJI_REALTIME_SHADOW_SECRET=<same secret>

Then run one synthetic event and verify exactly one row in realtime_events.
Repeat the same eventId and verify no second row is created.

## Rollback

Set DIJI_REALTIME_SHADOW_WRITE=false.

No Sheets data deletion or migration is part of this step.
