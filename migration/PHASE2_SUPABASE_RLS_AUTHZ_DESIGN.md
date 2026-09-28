# Phase 2 — Supabase RLS / Authorization Design

Status: DESIGN ONLY. No policies have been created.

## Current state

All six migration tables have RLS enabled and currently have no policies.

This is intentional. A policy based only on `authenticated` would not be sufficient authorization, and the current Diji-Medu identity is not yet a Supabase Auth identity.

## Identity model to implement first

Future mapping:

`legacy_student_key` → immutable internal user UUID

The legacy student key is the current application identity. It must not be treated as a display-name-only identifier once the bridge is implemented.

The mapping layer must be server-controlled and must not be editable by the browser.

## Read/write policy direction

### presence_sessions

A student may read/update only their own presence rows.

A future teacher/admin role may have a separately designed operational view if needed.

### active_duels

A student may read a duel only when they are one of the participants.

Writes should not be open-ended client writes. Duel state transitions should go through controlled server logic so a client cannot arbitrarily change winner/status.

### notification_delivery

A student may read/update delivery/read state only for their own notification rows.

Creation should be server-side.

### chat_delivery

A participant may read a delivery row only when they are sender or recipient.

Read-state updates must be limited to the recipient side.

Message creation should remain server-controlled until identity mapping and authorization are verified.

### sync_queue

The browser should not receive unrestricted access to the queue.

This table is intended for controlled server-side/offline synchronization. Client access, if eventually required, must be narrowly scoped to the authenticated student's own transaction rows.

### realtime_events

This is an internal audit/shadow stream.

It should not be exposed as a general browser-readable table.

The ingestion path may use a server-side secret or controlled backend identity; browser clients must not receive the privileged credential.

## Important RLS rules

- Do not use `TO authenticated` alone.
- Every user-facing policy must include an ownership/participant predicate.
- UPDATE policies require both `USING` and `WITH CHECK`.
- Do not use editable user metadata as an authorization source.
- Do not expose secret/service credentials to the browser.
- Do not create a policy until the identity bridge defines the authoritative user ID.
- Do not solve authorization by disabling RLS.

## Realtime publication

The currently enabled Realtime tables are:

- `presence_sessions`
- `active_duels`
- `notification_delivery`
- `chat_delivery`

Realtime publication does not by itself define authorization. RLS and authenticated identity remain the access-control boundary.

## Rollout sequence

1. Define immutable identity mapping.
2. Define server-side authorization claims/session.
3. Create policies in a non-production test environment.
4. Test cross-user access attempts.
5. Test update ownership changes.
6. Test participant-only duel access.
7. Test sender/recipient chat access.
8. Test notification read-state ownership.
9. Only then enable client-facing realtime reads.
10. Keep Sheets authoritative during shadow phase.

## Explicitly forbidden at this stage

- public/anonymous access to these tables;
- policy based solely on a student-supplied `student_id`;
- browser access using a secret key;
- migration of passwords;
- deletion of existing Sheets records;
- making Supabase authoritative before shadow/read comparison succeeds.
