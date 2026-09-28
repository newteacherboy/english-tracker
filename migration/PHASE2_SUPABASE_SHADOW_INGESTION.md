# Phase 2 — Supabase Shadow Ingestion Boundary

Status: DESIGN ONLY. Not deployed. Not imported by index.html. No production writes are enabled.

## Purpose

Provide a provider-specific server-side ingestion boundary for the existing Google Apps Script flow without replacing Google Sheets, changing authentication, or making realtime data authoritative.

## Current authority

`index.html → Apps Script → Google Sheets` remains the user-facing and durable write path.

The Supabase layer is initially a shadow projection only.

A successful existing Sheets operation may emit a shadow event. Failure of the shadow path must never fail the original user operation.

## Why an Edge Function boundary

The browser must never receive a Supabase secret key.

The Apps Script source should also not contain a committed secret. If a future connection is enabled, the shared ingestion secret must be stored outside source control (for example in Apps Script Properties), and the Edge Function must hold its verification secret as a Supabase Function secret.

The Edge Function is therefore a narrow server-side boundary:

1. receive a shadow event;
2. authenticate the caller with a dedicated ingestion secret;
3. validate the event envelope and allowlisted event type;
4. insert into `realtime_events`;
5. rely on the database primary/idempotency constraint for duplicate safety;
6. return a small result;
7. never modify Google Sheets or durable learning history.

## Authentication boundary

This is intentionally NOT Supabase Auth.

The existing Diji-Medu users authenticate through Apps Script sessions. Until the identity bridge is implemented, a browser Supabase Auth session would create a second identity system.

The future shadow caller therefore uses a dedicated server-to-server secret. The secret is never committed to GitHub and never placed in `index.html`.

## Event allowlist

Initial event types:

- `duel.created`
- `duel.accepted`
- `duel.rejected`
- `duel.completed`
- `notification.created`
- `notification.read`
- `chat.message`
- `chat.read`
- `presence.upsert`
- `presence.close`

No generic arbitrary table-write endpoint is allowed.

No `EkVeri` generic write endpoint is allowed.

No password, raw Apps Script token, token hash, or secret may be included in the event payload.

## Idempotency

Every event must have a stable `eventId`.

The same event retried multiple times must not create multiple logical events.

Examples:

- `duel:<id>`
- `duel:<id>:response:kabul`
- `duel:<id>:response:red`
- `duel:<id>:completed`

The existing Sheets result remains authoritative if a shadow event is duplicated or delayed.

## Failure behavior

Shadow failure is non-blocking.

Required future Apps Script behavior:

1. complete the existing Sheets operation;
2. construct the event from the actual successful result;
3. attempt shadow delivery;
4. catch/log shadow failure;
5. optionally enqueue the event for retry;
6. return the existing user-facing result unchanged.

No automatic reconciliation may delete, overwrite, or roll back Sheets data.

## Data minimization

Only fields required by the realtime projection are sent.

The initial implementation should avoid full message/history payloads where a delivery projection is sufficient.

Account credentials and security material are never sent.

## Deployment gate

This function must remain undeployed or unreachable by production callers until:

- provider-specific endpoint is reviewed;
- secret storage is configured outside Git;
- event schema is reviewed;
- identity mapping is approved;
- RLS/access model for client reads is defined;
- a dry-run/test environment is available;
- feature flags remain OFF until explicit rollout approval.

## Rollback

Rollback is operationally simple:

- disable the shadow-write flag;
- stop calling the ingestion endpoint;
- leave Google Sheets behavior untouched;
- inspect failed/retried events;
- do not delete Supabase rows as part of rollback.

## Explicitly not included

- Supabase Auth replacement
- password migration
- account migration
- client-side Supabase credentials
- making Supabase authoritative
- deleting or archiving Sheets data
- generic cleanup
- automatic conflict resolution
- production `index.html` changes
