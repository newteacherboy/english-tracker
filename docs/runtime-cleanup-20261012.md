# Runtime cleanup — 12 October 2026

Base: `ea87a1b395e881fcc5d4a27136ab9626433205b7`. The live portal HTML matched this base before editing.

The latest designs, parkur resume behavior and server reward ledger are retained. This change makes no database or Edge Function modifications.

- Keep the enhanced rubric handler with guardian email delivery status; remove its duplicate handler and duplicate data refresh.
- Keep the newer external activity dialog and remove the seven duplicate static IDs from its predecessor.
- Consolidate five legacy XP handlers into one, preserving their final adjustment order. Confirmed game rewards still use the active server claim handler; remove the superseded client-only game reward implementation and its obsolete strip.
- Remove four superseded energy wrappers and the obsolete one-energy context tracker. Preserve the final entry-price handler and positive-energy suppression.
- Merge first-load adoption, device-only lists, avatar restoration and concurrent request handling into one account-scoped loader. Reject late responses after account changes. Limit transient retry attempts to three.
- Let `request-budget.js` control online read freshness; keep the older storage layer only for offline/error fallback. Explicit refreshes cannot fall back to stored energy responses. Invalidate stored balances after relevant mutations.
- Repaint feature gates when the account/level/access state changes or actionable controls are mounted, rather than scanning the whole document every 700 ms.
- Avoid reapplying identical styles from the notice observer's own callback.
- Defer end-of-document modules in their existing order. Load Harf Bahçesi, Papi Cards, Meteor and Word Wheel once when their tab or public opener is used, with retry support.
- Remove the overwritten question decorator from the portal startup, two overwritten global memory handlers, 120 identical superseded CSS declarations, and obsolete HTML installation comments. Keep distinct CSS rules and still-active feature hooks.
- Bump the service worker to `diji-v106-runtime-cleanup`.

## Source measurements

| Item | Before | After |
| --- | ---: | ---: |
| Main HTML bytes | 2,236,423 | 1,971,493 |
| Local JS referenced at startup, bytes | 854,560 | 791,125 |
| Inline interval call sites | 117 | 115 |

Call-site counts do not measure live CPU time. Active gameplay timers and distinct feature hooks were retained; this is not a claim that every interval or hook should be removed.

## Verification

- 39 focused tests passed: cleanup regressions, progression economy, reward state, parkur claims, request budgeting, service worker and portal parsing.
- Baseline general suite: 172 tests, 135 passed, 37 failed.
- Updated general suite: 178 tests, 141 passed, the same 37 failure names. Existing fixture/dependency/expectation failures were not hidden or disabled.
- Two tests tied to the removed client reward implementation were updated to exercise the already-active server-confirmed reward path.
- DOM startup smoke completed without JavaScript errors; optional game scripts were absent from startup.
- Browser installation was unavailable (the download was not a valid archive), so device rendering, first-paint timing and long-task timing were not measured.

Remaining active hooks and CSS are not automatically redundant. Further removal requires feature-specific behavior checks; broad deletion would risk changing the latest application.
