# Security audit — 2026-10-26

Scope: current English application source, Supabase public-schema access metadata, deployed standalone services, and low-volume unauthenticated HTTP checks. No real user sessions, account changes, email sending, brute force or load testing were used.

## Fixed and deployed

| Finding | Remediation | Verification |
| --- | --- | --- |
| Anonymous/authenticated execution of the unused SECURITY DEFINER speech collector could insert text | Revoke PUBLIC, anon and authenticated execution; retain service_role | Live privilege assertions and executable PGlite permission tests |
| Obsolete canary API retained an older full API implementation | Replace with dependency-free HTTP 410 tombstone | Live HTTP 410; tests prohibit DB/network/environment access |
| Standalone services accepted some frozen accounts or revoked/stale teacher grants | Validate current account state, grant version, ownership and linked account state before privileged work | Negative and positive authorization tests; invalid-session live checks |
| Four handlers buffered request bodies before enforcing limits | Bound streamed UTF-8 bytes and cancel oversized streams | Stream cancellation, byte limits, invalid JSON tests; live 400/413 checks |

Live versions: thematic-learning 22, teacher-oral 5, kelime-rallisi 10, papi-chat 4, diji-api-v3-canary 2. Main diji-api and medupro-api were not redeployed.

## Evidence

- 86 automated tests passed, zero failures. The dedicated GitHub workflow reproduces this suite with Node 24 and PGlite 0.3.14.
- 14 live HTTP checks passed: six invalid-session/retired-endpoint checks and eight malformed/oversized-body checks. Responses include no-store and no redirect.
- All 113 public application tables have RLS enabled. No public SECURITY DEFINER function is executable by anon/authenticated after the migration.
- Speech collector permissions: anon=false, authenticated=false, service_role=true. The migration is repeatable and tolerates an absent legacy function.
- The current source scan found no embedded service_role JWT or common private key/API secret patterns. Git history was not comprehensively scanned.

## Remaining observation and limits

Supabase still reports its separate leaked-password-protection setting as disabled. The application's existing k-anonymous breached-password check passed its tests; this does not enable the provider setting. No plan upgrade or paid feature was activated. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security).

The 115 informational RLS-without-policy advisories reflect service-only tables with browser access denied; no permissive policies were added to silence them. See [database function permissions](https://supabase.com/docs/guides/database/functions).

This is a targeted audit, not a claim of complete security. Authenticated end-to-end penetration testing with dedicated test accounts, infrastructure-level DDoS resilience and a full secret-history review remain outside this run.
