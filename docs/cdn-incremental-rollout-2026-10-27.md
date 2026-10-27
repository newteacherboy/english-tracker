# Public CDN and incremental reads — 2026-10-27

## User-visible behavior

The existing screens, scoring, rewards, teacher links and stored progress are preserved. Initial chat/history/profile loads still provide the complete view expected by the current UI. Subsequent reads transfer new chat messages, changed feed entries/reactions/removals, and changed profile fields. The client reconstructs the same legacy arrays and objects before the screen receives them.

Public words and individual public lesson explanations are served from versioned site files. This rollout includes 3,421 active words and 183 public lesson topics. A lesson loads only its own file; it does not download an entire level. Per-student lesson completion, private profiles and teacher messages remain authenticated API data and are never exported to the CDN.

## Freshness and fallback

- The source API is checked for the current public-content hash. The browser checks versions when its approximately five-minute public-content cache expires; the server's public cache adds at most roughly one minute.
- CDN bytes must match their SHA-256 filename and the current source version. An old/missing/corrupt CDN file falls back to the normal live API. It is not accepted as fresh just because it exists.
- A daily publisher reads a small public version index and downloads only changed topic bodies. The first validation reused all 183 downloaded topics with zero lesson re-downloads. No secret credentials are needed for this public export.
- Chat cursors preserve database timestamp microseconds and UUID tie-breaking. A full reconciliation every five minutes also catches deletions or late changes.
- Feed/profile snapshot caches expire after five minutes and are bounded in size. Unknown/expired versions trigger a complete reset. Current authorization and moderation filtering run before creating each patch.
- Old clients continue receiving their old API format. The new protocols are explicitly negotiated, so a partially rolled-out browser/server pair has a compatible fallback.

## Verification

101 targeted tests passed locally before rollout: CDN integrity/outage/stale-version behavior, per-topic file loading, source API fallback, profile merge/removal, feed reaction/removal, account isolation, chat cursor precision, read receipts, rewards, onboarding and cache cancellation. A public source export validated the 3,421-word and 183-topic snapshot without modifying user accounts or sending test messages/emails.

A synthetic profile with 100 historical rows required 3,342 JSON bytes for a full response; an energy-only patch required 199 bytes. This is a controlled example, not an overall billing prediction. Actual savings depend on repeat reads and unchanged data.

## Residual risks and operating guidance

This reduces transfer but cannot guarantee that every browser/device flow is bug-free. The sensitive boundaries are stale CDN content, incorrect merge order and account switching; these have explicit tests and fallbacks. The first public-content request still needs a small source-version request, so this is not an offline redesign. A publishing failure reduces CDN savings for changed content while the API fallback preserves access.

No database schema, RLS policy or paid-plan setting was changed. The existing `(student_id, created_at)` chat index supports the cursor filter. Verify the Usage dashboard after new traffic accumulates; past billed/quota usage cannot be erased.
