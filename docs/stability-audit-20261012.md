# DijiMedu stability audit — 12 October 2026

Baseline: `df7b2eacc86e45c26c014719dad144bb6c01fc20`, the restored dual-route/sticker package.

## Confirmed findings and changes

| Finding | Change |
|---|---|
| Successful password login reloads the page after 120 ms, repeating all initialization. | Shared `dmOpenPortalSession` activates restored/manual sessions without reloading. Concurrent same-account activation is coalesced; late responses cannot reopen the old account. |
| Boot splash recognizes a ready student panel only after a child tab opens. | Any ready signed-in panel releases the splash; route-load errors release the loading mask too. |
| Missing Chart.js aborts student UI rendering. | Graphs are optional when the library/canvas context is unavailable. |
| Missing Supabase CDN script leaves client initialization broken. | Null-safe SDK initialization preserves password login; Google entry remains hidden until the SDK is available. |
| Startup profile/word-bank/state reads lack a deadline. | Only these startup GETs receive a 12-second abort deadline. Reward/write protocols remain unchanged. |
| Legacy timers append another profile button and recreate the Parkur/MeduPro selector. | Retired dock writers and route selector/pollers removed; current six-button navigation owns the dock. |
| Two daily-bonus paths can schedule the same reward. | One server-confirmed path; per-account/day receipt and in-flight guard; guest visits do not claim daily rewards. |
| Closed game children can look active when only their own computed display is checked. | Busy detection also requires a rendered rectangle and visible style. |
| Feature-release observer rescans the whole document after timer text changes. | Observe relevant added controls only; coalesce refreshes. |
| Hidden games, empty-member wallet/notice polling and inactive question fitting do unnecessary work. | Add screen/account guards while keeping active exercise updates. |
| Activity renderer can bring Büyü Akademisi back as a separate game. | Catalogue excludes native route launchers. |
| Legacy carousel tests and asset records do not match the restored package. | CI uses dual-route tests; parkur tests exercise the current word chunks/question deck; restored assets receive honest repository-source records. |

## Verification

- Parsed the complete HTML and every inline script; no duplicate HTML IDs, duplicate script references, or missing local JS/CSS dependencies found.
- Syntax-compiled 92 repository JS/TS files, including Edge Function modules.
- Exercised all six destinations with synthetic student data and the actual HTML/assets in a local DOM harness: correct destination overlays, six dock buttons, no uncaught JS errors.
- Tested startup with no Chart.js and with failed profile reads. The member panel remains usable.
- Focused regressions cover account ownership, session expiry, request coalescing, cache invalidation, canonical rewards, offline/service-worker routes, question construction and startup failures.
- Confirmed live login/guest loading, classic game entry/answer/exit and A1 topic navigation before this patch. The cloud browser did not reproduce Safari's tab crash.
- Supabase function logs for 10:00–12:20 UTC contained no error/exception entries matching the audit query.
- The broad historical test run initially had 141 passing / 33 failing tests. Several failures are obsolete fixture interfaces, old carousel expectations, or missing test dependencies. These are not presented as application crashes or as a clean full-suite result.

## Limits and remaining work

The HTML still contains substantial legacy CSS/runtime layers and over a hundred interval registrations. This patch removes specific duplicate producers and guards costly idle work; it is not a complete rewrite. Local DOM timings are not real-device performance measurements. A real signed-in Safari session, teacher administration, purchases, microphone permissions and real reward writes were not exercised against production accounts. The exact Safari crash is not conclusively identified.
