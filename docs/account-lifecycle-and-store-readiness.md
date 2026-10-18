# Account lifecycle and store preparation

Implemented 2026-10-19:
- Password or fresh, server-validated Google/Apple OAuth identity prepares a five-minute confirmation ticket. No client-supplied account ID determines deletion ownership.
- Google-only accounts do not need their randomly generated application password. OAuth returns through the existing portal callback and routes to the selected account action before the normal portal login handler.
- Freeze/reopen use separate tickets and RPCs from permanent deletion. Freeze closes portal sessions, hides the learner's social profile and suppresses routine queued mail. Password-reset mail is retained. Reopening does not remove teacher/guardian restrictions. Data and entitlements remain on the account.
- Moderation runs on published names, notifications and chat text before writes. It handles common Turkish/English profanity, selected obfuscations and public contact-information sharing. This is a deterministic text filter, not a claim of perfect semantic or image moderation; reports, blocking and administrator review remain required.
- Purchase transaction and entitlement tables are server-only. Verified receipts are required to grant access; provider transaction IDs and provider event IDs are unique; refund/revocation changes remove the associated entitlement. No checkout or client-side entitlement grant is enabled.

## External setup still required

Apple login is hidden until Supabase's public provider settings report Apple enabled. Configure the primary App ID, Services ID, Team ID, Key ID and signing key in the Apple/Supabase consoles. The Apple OAuth client secret must be renewed before its six-month expiration. Register the Supabase callback `https://nxfqlutulxqzqgwewssd.supabase.co/auth/v1/callback`. Allow the portal return URL `https://app.dijimedu.com/ingilizce/` and the registration return URL ending in `?kesifKayit=apple`. Keep signing keys out of this repository and chat messages. Complete real Apple login, private-email relay and Apple token-revocation-on-deletion tests before enabling Apple for release.

No actual Google or Apple customer account was deleted during QA. Mocked OAuth UI/API tests verify the Google-only path. A real provider round trip remains part of final device acceptance testing.

Before payment activation, select merchant accounts, configure products and server credentials, verify signed store/provider notifications, map each purchase to the authenticated Diji-Medu UUID, and test purchase, restore, renewal, duplicate notification, refund, revocation and account deletion. Native StoreKit/Play Billing integration requires the native app projects; no native package is present in this repository. Web checkout can be integrated independently once a payment provider and merchant account are selected. Do not replace in-app digital-goods billing with arbitrary web checkout links in store builds; confirm storefront-specific rules at submission.

## Store forms

App Store Connect: App Privacy, Age Rating, app review access and purchase products. Play Console: App content / Data safety, target audience, content rating, app access, account-deletion URL. These are declarations in store dashboards, separate from the in-app privacy policy. Review names, email, optional phone and school details, user IDs, educational performance, messages, purchases, diagnostics and every SDK in the final native build. Do not declare a data type absent without checking the final build. A mixed-age audience including children requires the relevant children's policies; age rating alone is not a parental-consent mechanism.

## Fair monetization proposal (not activated)

Keep core learning routes, placement tests, corrections, essential progress and account safety free. Consider optional cosmetic sets, a voluntary supporter plan, and teacher tools that save time (class reports, exports, question authoring). Avoid paid XP or league advantages, paid random rewards, and interrupting children's lessons with sales prompts. Decide prices after estimating real hosting, payment, support and tax costs.
