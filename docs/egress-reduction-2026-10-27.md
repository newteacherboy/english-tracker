# Egress investigation and reduction — 2026-10-27

The warning concerns outbound data, not log-file storage. The English project `nxfqlutulxqzqgwewssd` belongs to the organization named in the warning. No paid plan, account ownership, reward rules or user data were changed.

## Evidence and limits

The connector's preceding 24-hour log window contained approximately 17,182 calls to diji-api and 151,994 API-gateway events. Gateway events include internal database calls and are not unique user actions. Response Content-Length was available for 13,878 of those function responses; their reported total was 38,277,307 bytes. This is incomplete evidence, not a billing total or a monthly forecast. POST bodies are not available as operation-level logs.

The public word endpoint accounted for 159 GETs and approximately 13.9 MB of recorded transfer. This was a clear target. Storage paths did not appear in the sampled window. Historical pg_stat_statements counts were used to identify repeated session, contact-state and feature-flag queries; their accumulation window differs from the 24-hour log window.

## Changes shipped

- New clients negotiate a compact word format that removes import provenance while preserving all 3,421 rows, learning fields and unknown future fields. The legacy format remains compatible.
- Public content is compressed once per cached version using gzip. The existing platform already compressed responses; explicitly caching the compressed public representation produced a smaller actual transfer. Credentials, sessions and private API responses are outside this compression cache.
- Public word/lesson responses remain fresh in the client cache for 24 hours. Their old versions remain available for conditional revalidation, so unchanged content returns HTTP 304 with no response body. Explicit refresh still revalidates.
- Mutations invalidate private read caches while preserving public content. Newly classified read-only calls no longer flush unrelated caches. Rewards, saves, live game answers and authorization decisions remain uncached.
- Timeout-enabled reads can use fresh cached responses; independent abort signals remain isolated and do not poison cache entries. Hidden timed-out polls are removed rather than sent later.
- Returning to a visible tab preserves fresh TTLs. The friends feed uses its existing short read cache instead of forcing every call past it.
- Repeated feature-flag reads use the existing 60-second server cache; an authorized flag change still refreshes immediately.
- Ordinary student sessions no longer poll teacher-message summaries. Teacher code sessions still use the teacher token and retain message notices.
- Read-operation names are attached to POST URLs without credentials or payloads, improving future log aggregation without adding telemetry calls.

## Measured results

| Measurement | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Public words JSON bytes | 1,180,543 | 524,963 | 55.5% |
| Actual word response body on wire, updated clients | 88,715 | 50,069 | 43.6% |
| Actual word response body on wire, legacy clients | 88,715 | 59,233 | 33.2% |
| Conditional unchanged word response body | full response | 0 bytes, HTTP 304 | body avoided; headers still transfer |
| Controlled sequence of 20 repeated read attempts | 20 network calls | 4 network calls | 80% for this scenario |

The before/after public word versions and row count were checked. These percentages apply to the measured response or controlled scenario, not to the organization's entire monthly bill. 87 targeted automated tests passed, including cancellation, account separation, write invalidation, gzip round trips, legacy word compatibility and teacher notifications.

Reproduce live public response measurements with `node scripts/measure-public-egress.mjs`. Its comparison is between the two currently deployed formats; both benefit from the new gzip cache. The original pre-change baseline is recorded above. It makes three low-volume public requests and never needs an account token.

## Further reductions, in priority order

1. Compare the Usage dashboard's daily service breakdown after rollout and separately identify peak historical days. Retained gateway Content-Length fields cannot reproduce the full billing total. Already-used quota cannot be reduced retroactively.
2. Move versioned public word/lesson catalogs to the site's CDN, with a reliable publishing/refresh pipeline and a Supabase fallback. This can remove most remaining public-catalog egress from Supabase; it requires content-update synchronization rather than a stale one-off export.
3. Paginate or use change cursors for feed and chat history. Fetch new events rather than repeatedly returning full lists; preserve unread counts and moderation filters server-side.
4. Replace the remaining root-profile refreshes with smaller purpose-specific or conditional responses, then consider cross-tab request sharing. Keep session validation and immediate permission revocation on the server.
5. If normal measured traffic still exceeds the Free quota after these reductions, evaluate the paid plan against actual monthly traffic. No upgrade or spending-cap change was made.

References: [Supabase egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [Fair Use Policy](https://supabase.com/docs/guides/platform/billing-faq#fair-use-policy), [Deno compression streams](https://docs.deno.com/examples/compress_decompress/).
