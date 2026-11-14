# App Review fixes — 14 November 2026

Build referenced by rejection: 1.1.1 (108), iPad Air 11-inch (M3), iPadOS 27.3.

## Changes

- Demo account settings allow password changes, freeze, reopen and permanent deletion through the same authenticated flows as ordinary accounts.
- Password verification, rate limits, action-specific five-minute tickets and final confirmation remain mandatory.
- Login no longer recreates a deleted demo account. Restore is available for frozen accounts; deletion is permanent. After a reviewer changes credentials or deletes the review account, the owner must update the review access details before another submission.
- Demo learning access remains Premium Pro. Billing returns a separate purchasePlan from unexpired store entitlements, so the access grant no longer disables Pro monthly/yearly purchase options.
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
