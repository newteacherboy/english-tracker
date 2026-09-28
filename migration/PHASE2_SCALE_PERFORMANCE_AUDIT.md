# Phase 2 — Scale and Performance Audit

Audit-only. No production behavior change.

## Source measurement

The current Apps Script contains approximately:
- 106 `getDataRange()` calls
- 106 `appendRow()` calls
- 41 `setValue()` calls
- 8 `setValues()` calls
- 7 `deleteRow()` calls

These counts are source-level occurrences, not measured runtime latency.

## Main scalability risks

### 1. Full-sheet scans

Many helpers read an entire sheet with `getDataRange().getValues()` and then scan rows in JavaScript.

This is acceptable for small configuration tables, but becomes expensive for growing history tables such as:
- Puanlama
- DersIlerleme
- DersBilmiyordum
- SinifIciPerformans
- Sohbet
- Bildirimler
- Okuma_Hizi
- game/leaderboard history
- event/activity tables

Rule:
- small/static configuration may remain full-read;
- growing history must eventually use indexed/materialized current-state maps or bounded reads;
- do not blindly replace every `getDataRange()` because some functions intentionally build complete maps.

### 2. Read-then-scan current state

Study time currently reads the complete `Oturum Saniye` sheet, scans for the student, then writes the matching cell.

At 5,000 students this is still manageable in absolute row count, but it is an avoidable per-write full scan.

Future optimization:
- stable student row/index;
- cached row map;
- or a dedicated current-state store;
- keep Sheets mirror/history.

### 3. Append-only history

`appendRow()` is appropriate for immutable history, but not for high-frequency transient state.

Keep append-only behavior for:
- lesson history;
- scores;
- reading records;
- important duel completion;
- audit history.

Move high-frequency operational state to realtime storage later:
- presence;
- active sessions;
- notification delivery state;
- chat delivery/read state;
- active duel state.

### 4. Row deletion

Seven `deleteRow()` occurrences were found.

These are not equivalent:
- some are existing operational cleanup;
- some are business rollback;
- some remove registrations;
- some remove announcements.

Therefore no global replacement is safe.

Future rule:
- operational expiration may hard-delete only after explicit policy;
- important records use archive/soft-delete;
- business rollback should preferably use a compensating event rather than destructive history removal;
- registration rejection needs a separate reversible policy decision.

### 5. Repeated reads inside one request

The source contains functions that read several sheets fully during one request and build maps.

Future optimization:
- create request-scoped data loaders;
- read each required sheet at most once per request;
- reuse maps;
- avoid calling the same expensive helper repeatedly for the same student.

### 6. Current-state versus history separation

A recurring performance problem is storing current state and history together.

Recommended split:

Sheets:
- durable history;
- reports;
- teacher/admin management;
- recovery mirror.

Realtime/current-state:
- active duel;
- presence/session;
- notification delivery/read;
- chat delivery/read;
- live energy/current XP projections.

Browser:
- cache;
- offline queue;
- local study-time accumulator.

## 5,000-user target

Design should be validated against at least:
- 100 concurrent active users;
- 500 concurrent active users;
- 1,000 concurrent active users.

Registered-user count alone is not the relevant load metric.

Test scenarios:
1. login/read dashboard burst;
2. 100 simultaneous study-time flushes;
3. 100 simultaneous notifications;
4. 100 simultaneous chat sends;
5. 100 simultaneous duel actions;
6. 500 concurrent mixed activity;
7. 1,000 concurrent mixed activity;
8. transient realtime backend outage while Sheets remains healthy;
9. Sheets write failure during shadow mode;
10. duplicate/offline retry of the same transaction.

## Optimization order

1. Measure real request latency and Apps Script execution time.
2. Identify top 10 slowest actions.
3. Add request-scoped caching/maps where semantics are unchanged.
4. Bound historical reads where the action only needs recent/current state.
5. Introduce realtime shadow writes for operational state.
6. Compare old/new reads.
7. Only then make realtime authoritative for explicitly approved operational domains.

## Explicit non-actions

This audit does not authorize:
- deleting old rows;
- changing retention;
- replacing Sheets;
- changing `EkVeri`;
- changing authentication;
- changing duel winner logic;
- changing study-time accounting;
- enabling realtime feature flags.

## Acceptance criteria before production migration

- no protected/long-term data loss;
- existing Sheets flow still works;
- shadow failure cannot break user actions;
- duplicate events are idempotent;
- read mismatches are logged;
- rollback is one feature-flag/config change;
- performance is measured rather than assumed.
