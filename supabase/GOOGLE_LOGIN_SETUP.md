# Google login rollout — not enabled yet

This branch adds student Google login alongside the current password login. It does not migrate, delete, copy or recreate students. First login requires the existing student's password. Subsequent logins use the same student ID through a separate, one-to-one mapping. Teacher login stays on the existing flow.

## Required configuration

The live project `nxfqlutulxqzqgwewssd` currently reports `external.google: false`. A Google Cloud OAuth client and Supabase provider configuration are required before this feature can be tested end to end.

1. In Google Auth Platform, select the owner's project; configure branding, audience and scopes `openid`, email and profile. For external users, testing mode restricts access to listed test accounts. Choose the intended audience and finish any Google verification requirements before general rollout.
2. Create a Web application OAuth client. Authorized JavaScript origin: `https://panel.ogretmencocuk.com`. Authorized redirect URI: `https://nxfqlutulxqzqgwewssd.supabase.co/auth/v1/callback`.
3. Enter the Client ID and Client Secret in Supabase Authentication → Sign In / Providers → Google. Keep the secret out of source control and chat.
4. Add `https://panel.ogretmencocuk.com/ingilizce/?google_return=1` to Supabase Authentication → URL Configuration → Redirect URLs. Confirm the Site URL matches the intended live domain. Add a separate staging callback for testing; do not widen redirects with general wildcards.

## Safe release order

1. Test the additive SQL in `google-login.sql` on a development database. It creates only the mapping table, denies all anon/authenticated access and grants the backend service role select/insert. Both foreign keys and unique keys preserve one-to-one ownership. Do not execute the script twice; it intentionally fails if the table already exists.
2. Deploy `functions/diji-api/index.ts` to development with JWT verification disabled as in the current production function. Existing custom portal tokens continue to authorize old routes. The new Google routes validate OAuth JWTs server-side with `auth.getUser` and require a Google identity.
3. Test Google consent, first linking with a real existing student, a second login, cancellation, blocked/pending students, password fallback, and logout in Safari and Chrome. Validate the same student ID, points, progress, gifts and duels before and after. Do not test with a real student's password unless that user explicitly participates.
4. Re-fetch the live Edge Function before deployment and reconcile changes against the version 47 snapshot used here. Do not overwrite concurrent server updates. Apply the additive SQL and reviewed function only after staging passes; then publish the frontend and enable the Google provider.
5. The frontend shows the button only when both the Google provider and mapping backend are ready. Refresh service worker caches/version when revising `google-login.js`; its URL is explicitly versioned.

## Validation performed

`node --test tests/google-login.test.cjs` covers invalid JWTs, non-Google identities, unlinked accounts, wrong passwords, lockout, approved linking, subsequent login, pending accounts, conflicting mappings and POST-only behavior. These are mocked backend tests, not live OAuth or database integration tests.

`node --check ingilizce/google-login.js` and `git diff --check` pass. A browser smoke test could not run because this environment has no Chromium executable. Real OAuth, database permissions/constraints and full portal UI still require staging validation. Do not merge this draft as a tested production release.

## Recovery

Disable Google in Supabase and remove the new script tag to restore the original frontend. Keep the mapping table to preserve linked accounts; no learning data rollback is needed. Removing a mapping requires an authenticated support process and must never accept a supplied student name alone. A self-service unlink/delete flow is outside this change.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-google
