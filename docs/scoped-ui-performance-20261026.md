# Scoped UI observers — 26 October 2026

Small changes such as timer text and notification progress previously caused global
letter-title and start-button queries, and scheduled lesson layout even when the
changed node was outside the lesson. This adds unnecessary main-thread work to
games and question screens, including scans through hidden panels.

Changes:

- Decorate newly added letter and coin subtrees instead of scanning the document.
  Collapse parent/child roots within each mutation batch.
- Refit lessons only when their content changes or a lesson is inserted/removed.
- Re-evaluate start effects only for changes involving a start button, its
  container or its visibility/disabled state.
- Distinguish a button press from temporarily hiding/disabling a button so its
  effects resume when the button becomes available again.
- Update the three script URLs and add automated regression checks.

## Evidence

The same deterministic JSDOM workload was run against main commit
`895bac724f4d47adc3de249f52276eb156d53581` and the modified files.

| Workload | Before | After |
| --- | --- | --- |
| 100 unrelated text updates: global letter-title queries | 100 | 0 |
| 100 unrelated text/style updates: global start-button queries | 100 | 0 |
| Unrelated updates with a lesson open: queued layout frame | Yes | No |

The new tests also check new letter/coin content, direct title insertion, lesson
insertion/content changes and start-button disable/enable/hide/show/removal.
All three new tests fail on the baseline and pass after the change.

Local validation: 28 tests passed across scoped UI performance, shared notices,
runtime cleanup, startup deferral, lazy game loading, service-worker caching and
answer audio. JavaScript syntax and diff whitespace checks passed.

These are counts of avoided work in a controlled DOM workload, not measurements
of production load time, memory usage, FPS or mobile battery savings. No real
device or browser rendering benchmark was run. The initial HTML size and backend
response times remain separate performance work.
