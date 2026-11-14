# App Review fixes — 14 November 2026

Build referenced by rejection: 1.1.1 (108), iPad Air 11-inch (M3), iPadOS 27.3.

## Changes

- Demo account settings allow password changes, freeze, reopen and permanent deletion through the same authenticated flows as ordinary accounts.
- Password verification, rate limits, action-specific five-minute tickets and final confirmation remain mandatory.
- Login no longer recreates a deleted demo account. Restore is available for frozen accounts; deletion is permanent. After a reviewer changes credentials or deletes the review account, the owner must update the review access details before another submission.
- Demo learning access follows real subscription entitlements. Without an active subscription the demo is Free; a verified purchase upgrades it normally. Billing purchasePlan remains separate from non-purchase access grants.
- Packages are accessible from Shop → Packages and subscriptions, and Profile → Account settings → Packages and subscriptions, including accounts with Premium access.

## Review navigation

1. Sign in using the current review credentials in App Review Information.
2. Open Mağaza (Shop), then Paketler ve abonelikler (Packages and subscriptions).
3. Choose Pro, then Aylık (Monthly) or Yıllık (Yearly), and tap the purchase button to open Apple's purchase sheet.
4. Restore purchases is available on the same package screen.
5. Account actions: Profil → Hesap ayarları → Şifremi değiştir / Hesabımı dondur / Hesabımı sil. Deletion opens an in-app account verification page, then requires consent and the displayed confirmation text.
6. Complete purchase review before permanently deleting the supplied account, or create a separate disposable account for deletion.

## Validation and remaining device checks

Automated UI/API tests cover demo password-button dispatch, deletion/freeze/restore ticket issuance, invalid credentials, confirmation, cache routing, and Pro monthly/yearly dispatch through the mocked native plugin. Billing signature and account-binding tests pass.

These tests do not validate a real StoreKit product response or Apple's payment sheet. Before resubmission, use TestFlight on iPad and iPhone to test real sandbox products, purchase/restore and account lifecycle. Confirm Paid Apps Agreement is Active, current Product IDs and product review metadata. The rejection alone does not establish that the agreement is inactive. Do not tell Apple these device checks passed until they have actually been completed.

## Demo teacher workspace and messaging

- Demo teacher messaging uses the normal saved private conversation and owner reply flow. It stays out of public leagues, profiles and social discovery.
- Run deployment/review-demo-teacher.sql once, explicitly, to link the existing active demo learner to its dedicated non-admin teacher identity. It does not recreate a missing learner and never auto-runs on login.
- Both Teacher Panel buttons use the approved grant to enter directly, without asking for a private teacher code. The email exception requires the exact fixed learner AND teacher UUID pair; every request still checks grant version, state, teacher activity and account freeze state. Other teachers retain email and approval requirements.
- Personal Parkur returns to the linked demo learner, regardless of another account saved on the device. The teacher identity has no access to unrelated students or owner administration.
- Do not submit another build solely for these web/server changes. Real iPadOS WebKit, TestFlight StoreKit purchase and restore remain device acceptance checks, not replaced by server/unit tests.
- Route continuation button redesign is a pending visual proposal and has not been applied.

## Simplified continuation and Free review account

The route flag opens a compact white card containing only the gold “Buradan devam et” action. Empty card space, backdrop and Escape dismiss it without starting a chapter; the action starts the selected chapter.

Migration 20261114134458 removes only the automatic demo Premium Pro branch of dm_plan. Active subscriptions, expiry, teacher plan inheritance and owner preview rules stay intact. The demo teacher grant is independent of the learner's plan and remains approved. Real StoreKit device acceptance remains outstanding.
