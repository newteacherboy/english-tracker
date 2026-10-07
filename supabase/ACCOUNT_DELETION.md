# English account deletion

## Scope and status

This change adds self-service deletion to the English portal only. It does not change Coaching files or call Coaching Apps Script endpoints. It is separate from the draft Google login change.

**Deployed on 2026-10-03 after explicit user approval.** The additive migration, separate account-delete Edge Function, cleanup cron and frontend from merged PR #3 are live. The page and all assets return HTTP 200; the main portal has all three links and service worker v12. Live Chromium mobile verification passed: nonexistent credentials are refused, confirmation stays hidden, no page errors or horizontal overflow. Backend denied-request checks passed (GET 405, invalid confirmation 400, unauthenticated worker 403, nonexistent credentials 401). New tables have RLS and no anon/authenticated read access; these roles cannot execute the deletion RPC. Final counts remained 86 students and 2 teachers with zero deletion receipts. No existing account was deleted for testing. Destructive tests were completed locally using a schema-only snapshot; no production rows were copied.

Security advisors report intentional RLS-without-policy informational notices for the new server-only tables. They also report pre-existing public execution warnings for the unrelated SECURITY DEFINER function `diji_veri_temizligi()`; this release did not modify it. Review its intended callers separately: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## User flow

The profile, teacher menu and logged-out login card link to `ingilizce/hesap-sil.html`. The same page can be used as a store's external account-deletion URL after publication.

The user selects student/teacher, enters the existing username and password, then reviews the scope, checks consent and types `HESABIMI SİL`. Reauthentication creates a random, hashed, five-minute deletion ticket. It does not delete anything. The final request accepts only that ticket, not a supplied account ID. Password changes invalidate outstanding tickets. Short-lived receipts make retrying a lost response idempotent.

For students, deletion removes the account and all linked records via verified foreign-key cascades, plus score names left by SET NULL, sender notifications, targeted feed events, personal badges, assignment completion, queued email, matching legacy import/unmapped records and scoped feature flags. Exact structured identity references in shared JSON are redacted while preserving other students' scores. Local English sessions, pending writes and the deleted profile cache are cleared; Coaching storage is preserved.

For teachers, the teacher account, game profile and sessions are deleted. Students and shared assignments/announcements/reports remain; teacher IDs are set to null. Existing admin access to these unassigned students remains through the current backend. The final active administrator cannot delete their account. An advisory lock and row locks protect the last-admin check against concurrent deletions/updates.

When the separate Google-login mapping table exists, its mapping disappears with the student and its Supabase Auth ID is queued for the Admin API. A worker retries failures every ten minutes. This removes the app's Supabase identity, never the person's Google account. Worker credentials are server-generated in SQL and are not checked into source.

## Boundaries

This flow covers active English database records and identified imported copies in this database. It does not delete former independent Google Sheets source files, database backup history, or email already delivered to recipients. It does not rewrite free-text references authored in unrelated people's messages or unrelated lesson content. These boundaries are stated on the confirmation screen; do not describe this as erasure of every historical or external copy. Before a store submission, decide and publish a retention policy and remove obsolete English source exports through their owner's separate process.

The future Google Auth cleanup path is tested with local SQL and mocked Admin API responses. Real Supabase Auth deletion and scheduled pg_net delivery have not been exercised. Current Google login is disabled, so current password-account deletion does not depend on Google configuration.

## Tests completed

- `node --test tests/account-deletion.test.mjs tests/account-deletion-sw.test.cjs`: password verification, rate limiting, exact confirmation, account-ID injection rejection, last-admin/expiry/password-reset errors, CORS, worker authentication, retry queue, and service worker behavior.
- `node tests/account-deletion-db.mjs`: local Postgres-compatible execution using PGlite 0.5.8 and the live schema's columns/constraints. Covers actual cascades, orphan/legacy cleanup, preservation of a second student's scores, teacher deletion without student/content deletion, idempotency, last-admin protection, expiry, changed password, function/table permissions and the future Google mapping outbox. pg_cron registration is skipped locally; pgcrypto's random generator is replaced only in the test runtime.
- `node tests/account-deletion-ui.cjs`: Chromium 153 mobile viewport. Covers wrong password, cancellation, both confirmations, teacher refusal, no horizontal overflow, and preservation of Coaching and unrelated-profile storage. API responses are mocked; no production API is called. The mobile confirmation screen was visually inspected.
- `node --check ingilizce/hesap-sil.js`, `node --check supabase/functions/account-delete/core.mjs`, and `git diff --check`.

Test-only dependencies live outside the repository: `@electric-sql/pglite@0.5.8`, `@sparticuz/chromium@153.0.0`, and the runtime's Playwright. Test browser executable can be specified through `DIJI_CHROMIUM`; local database package through `DIJI_QA_MODULES`.

## Production installation, after explicit approval

1. Recheck the live schema, extension versions and `main` before applying changes. The snapshot was read on 2026-10-03. Required extensions are already installed: pgcrypto 1.3, pg_cron 1.6.4 and pg_net 0.20.4.
2. Apply `account-deletion.sql` as a single additive migration. Installation creates tables/functions and a cron task; it does not delete accounts. Do not run `tests/account-deletion.sql` in production. The installation intentionally fails on an existing conflicting table rather than silently changing it.
3. Deploy the separate `account-delete` Edge Function with `index.ts` plus `core.mjs`. SDK is pinned to 2.117.2. JWT gateway verification must be disabled because the established portal uses custom sessions; the public deletion route independently reauthenticates passwords and validates one-use tickets. The worker independently validates a server-side secret. The existing `diji-api` function is unchanged.
4. Run Supabase security advisors; verify new tables use RLS and anon/authenticated roles cannot read them or execute the deletion RPC. Verify cron exists without displaying its secret. Use health/denied-request checks; do not delete an existing account for testing. A production synthetic deletion test needs separate explicit authorization.
5. Publish the reviewed HTML/CSS/JS and index links. Service worker v12 excludes the deletion page from the main offline-page cache and clears only old English cache names.
6. Verify the page at `https://app.dijimedu.com/ingilizce/hesap-sil.html` and links in student profile, teacher menu and logged-out login card. Activate only when the backend installation succeeds.

## Recovery

Remove the three account-deletion links to suspend the feature. Do not restore a prior database copy blindly: that could undo unrelated changes. Cron and the Auth queue can remain to finish previously confirmed deletions. Accounts explicitly deleted by users are not recreated automatically.
