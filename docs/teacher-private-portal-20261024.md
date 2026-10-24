# Private teacher platform

Teachers register as ordinary learners: their own parkur, wallet, XP and public ranking remain independent of classroom activity. Selecting “Öğretmenim” also creates a pending access request. Existing teachers receive a linked learner account when they next sign in normally. The `teacher` administrator retains the existing management login.

Only the authenticated, active administrator named exactly `teacher` can approve, reject or revoke requests. E-mail verification and approval are both required before a private 12-digit code is queued. Public invitation codes remain separate. Codes are stored as keyed digests; rotation atomically sends the new code and invalidates all scoped sessions. Forgotten codes use one-use, version-bound, one-hour e-mail links. Classroom sessions last at most eight hours.

The entry page adds **Öğretmen Girişi**. The private platform has Oyunlar, Ders Çalış, Profilim and Öğretmen Paneli. Each game asks for an owned pupil or a guest name. Scoped learner sessions verify game answers and record rankings only: no energy is spent and no XP, gold, energy gift or personal reward entitlement is awarded. Persisted ranking-only run flags prevent rewards even if a classroom run is later requested through a normal session. Normal personal play retains its existing costs and rewards. Teaching bypasses level visibility, without changing a pupil's earned level or personal unlocks. Guests have separate server identities and visible “Misafir” suffixes; teacher previews are excluded from public participant serialization. Personal storage is preserved while classroom storage is isolated to the current tab.

## Validation

- `node --test tests/teacher-portal-api.test.mjs` — ownership, numeric/code checks, pupil scope and denied personal/admin operations.
- `PGLITE_MODULE=<installed @electric-sql/pglite entry> node tests/teacher-portal-db.cjs` — executes the migration in a disposable PostgreSQL instance; tests approval, RLS/ACL, verification, concurrent code/mail issuance, one-use resets, revocation, stable guest identities and personal wallet isolation.
- `PGLITE_MODULE=<installed @electric-sql/pglite entry> node tests/teacher-ranking-only-db.cjs` — executes both migrations with zero-energy pupils and tests classic, rally, break, topic and online results; rankings are recorded without wallet changes or personal quota consumption, including replay through normal result RPCs.
- `NODE_PATH=<playwright node_modules> RALLY_CHROMIUM=<Chromium executable> node tests/teacher-portal-ui.cjs` — actual application at 390×844, 768×1024 and 1440×900; entry, code validation, reset form, four tabs, pupil chooser and replay, separate tokens and return to the unchanged personal session. API calls are mocked; these checks do not claim production mail delivery or a live end-to-end game result.
- Existing onboarding, verification, session, rally, companion and classroom API tests: 63 passed.

## Release order (publication authorized by the user on 24 October 2026, including ranking-only classroom play)

Target repository: `newteacherboy/english-tracker`; Supabase: `nxfqlutulxqzqgwewssd`.

1. Apply `20261024141820_teacher_portal_access.sql` and `20261024151250_teacher_ranking_only.sql`; inspect advisors and confirm new relations/RPCs are restricted to the service role.
2. Deploy `diji-api`, `kelime-rallisi`, `medupro-api`, `thematic-learning` and `papi-chat` from this branch. Other functions are unchanged.
3. Merge/publish the frontend and the service worker update only after the database/API are ready.
4. On staging or an approved test account, verify the real mail queue, approval, delivery, numeric login, one pupil game and unchanged wallet plus its ranking record; verify revocation and the preserved personal ranking.

No production schema, function, permissions or application deployment was changed while preparing this branch. UI screenshots used for review were generated locally.
