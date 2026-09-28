# Phase 2 — Identity Bridge Implementation Plan

Status: PLAN ONLY. No production authentication changes.

## Objective

Keep the existing Apps Script authentication authoritative while introducing an internal immutable identity that can later authorize Supabase realtime access.

## Current source identity

The existing application uses the Apps Script session and the student identifier resolved by Apps Script.

The session remains authoritative during this phase.

## Proposed mapping

A future server-side mapping record contains:

- `legacy_student_key`
- `internal_user_id` (UUID)
- `role`
- `status`
- `created_at`
- `updated_at`

The mapping must be one-to-one for active accounts.

The display name must not be the permanent primary key.

## Bridge sequence

### Step 1 — Observe

For a successful existing Apps Script login, resolve the existing student identity and create/lookup the mapping server-side.

No password migration.

No client credential change.

No Sheets deletion.

### Step 2 — Shadow identity

Emit a non-authoritative identity event containing only:

- internal user UUID;
- legacy student key;
- role;
- event time.

Do not emit password, raw session token, token hash, or security log contents.

### Step 3 — Server session

A future backend endpoint exchanges the validated Apps Script session for a short-lived backend identity.

The browser receives only the minimum short-lived session needed for approved realtime reads.

### Step 4 — RLS

After cross-user authorization tests pass, create RLS policies tied to the backend identity.

### Step 5 — Realtime read comparison

For selected domains, compare a Supabase projection with the existing Sheets-derived result.

Mismatch is logged and investigated; it is not auto-corrected destructively.

### Step 6 — Feature flag

Only after comparison is stable:

- enable realtime presence;
- then notification delivery/read;
- then chat delivery/read;
- then active duel.

Each is independently switchable.

## Account migration is deliberately later

The existing `İngilizce` account records, password system, and Apps Script session mechanism remain untouched.

Bulk account migration is a separate project phase requiring explicit verification and rollback.

## Failure / rollback

If the bridge fails:

- disable the feature flag;
- continue using Apps Script + Sheets;
- discard/retain shadow diagnostics as appropriate;
- do not invalidate existing sessions;
- do not alter account rows.

## Test matrix

Before any client realtime read:

1. student A cannot read student B presence;
2. student A cannot update student B presence;
3. student A cannot read another student's notification delivery;
4. student A cannot mark another student's notification as read;
5. non-participant cannot read a duel;
6. duel participant can read only that duel;
7. chat sender/recipient rules hold;
8. browser cannot access server ingestion secret;
9. expired bridge session cannot access realtime tables;
10. disabling the feature flag returns the app to the existing Sheets path.

## Production gate

No change to `index.html` or production Apps Script authentication is authorized by this document.

Implementation begins only after the test environment, secret storage, identity mapping, and RLS policy are all validated.
