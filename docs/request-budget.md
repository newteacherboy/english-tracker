# Supabase request budget

The English portal uses `ingilizce/request-budget.js` instead of two duplicated
GET-only cache wrappers. It joins identical in-flight reads across GET/POST,
briefly caches eligible reads per token/account, and bundles compatible reads
arriving within 25 ms into at most eight operations per invocation.

The `diji-api` batch handler only accepts an explicit operation list. Every
child goes through the original session, ownership and feature checks. Children
cannot supply another credential or recursively submit a batch. Child HTTP
statuses and JSON bodies remain separate. Old servers fall back to direct reads.

Balances, progress and notifications are never persisted by this layer.
All mutations invalidate transient caches before and after the request.
XP/gold claims, result saves, gifts, messages and live answers remain immediate;
Request objects, abort signals and keepalive semantics are preserved.
Live match state and presence are not delayed or cached.

Only public word lists and lesson text persist on the device for five minutes,
with a 40-entry bound. On expiry the client checks the content hash; unchanged
content returns 304 and changed content replaces the local copy. The server
coalesces public content loads for 60 seconds, after permission checks.
Document-hidden polls with a previous snapshot reuse it; otherwise eligible
polls wait for visibility. Failed reads back off, writes never do.

`window.dmRequestBudget.stats` exposes aggregate counters only: optimized read
network requests, cache hits, joined reads, batch items and backoff hits.
It stores no names, tokens, balances or response payloads in the counters.
Actual monthly savings require comparable production traffic after rollout.

Validation: `node --test tests/*.test.cjs tests/*.test.mjs`,
`node tests/request-budget-ui.cjs`, and the existing game-feedback, progression,
guest-platform, onboarding and goal-announcement browser checks. Browser tests
use mocked server responses and do not mutate production user records.
