# English privacy policy release — 2026-10-03

Public policy: https://panel.ogretmencocuk.com/ingilizce/gizlilik.html
External account deletion: https://panel.ogretmencocuk.com/ingilizce/hesap-sil.html
Privacy contact: official.dijimedu@gmail.com (existing published address).

## Verified basis

The policy was written against current main, live diji-api version 47, the installed account-delete function and the live cron configuration. No production records were copied, edited or deleted during this review. Supabase project region is eu-central-1 (Frankfurt). Daily diji-veri-temizligi and the deletion cleanup job both reported successful last runs. The actual SQL cleanup thresholds, rather than the different optional Edge Function cleanup rules, are described in the public policy.

The prior modal incorrectly described Google-only storage, Gmail-only report sending, exclusively owner access, weekly backups and a one-year general retention limit. These unsupported claims were removed. Current social data includes class and learning/development indicators accessible to other approved student accounts; the policy expressly describes that visibility. Teacher access, messaging, WhatsApp reporting, browser speech recognition, foreign hosting, fonts/CDNs and embedded third-party media are included. Brevo/Resend selection depends on server configuration; secret values were not accessed.

The registration checkbox now records a guardian/information acknowledgment, without claiming blanket processing or foreign-transfer consent. Existing field IDs, request payload and acknowledgment-date storage remain. The policy is not a consent agreement. No historical acknowledgment was retroactively reclassified as valid consent.

## Store disclosure preparation

This is a web-source inventory, not a submitted Play Console/App Store Connect declaration. No native APK/IPA, SDK inventory, developer-console settings or age-targeting declaration was supplied or reviewed. Any packaged app's additional SDK data must be included before its store privacy declarations are submitted.

| Web-observed data | Store disclosure candidate | Purpose / identity link |
|---|---|---|
| Username/name, account UUID, teacher name | Personal info / name; user IDs | Account management; functionality; linked to account |
| Parent/teacher phone and email | Personal info / phone; email | Account management, reports, support; linked |
| School/class/branch | Other personal info / educational profile | Functionality; linked |
| Scores, progress, learning history, time and activity | App activity; gameplay/usage data; other data where applicable | Functionality and learning personalization; linked |
| Feed sentences, messages, interactions | User-generated content; other in-app messages | Functionality; linked |
| IP, request metadata, provider logs | Diagnostics / device or other IDs as applicable to actual collection | Security/operations; provider handling must be verified |
| Browser speech recognition | Audio/voice data where transmitted by speech provider | Optional exercise; third-party handling must be verified. Lack of own audio storage is not proof of no collection |

Do not select "no data collected." Do not equate "no sale" with "no sharing." Service-provider and user-initiated disclosure exceptions differ between stores and require their exact definitions. HTTPS is used. Account deletion is available in-app and at the external URL; manual guardian/locked-out requests use the published contact.

## Items that cannot be established by publishing a policy

- **Foreign-transfer safeguards:** continuous Supabase/hosting/email use involves foreign processing. The review has no evidence that an applicable KVKK article 9 safeguard, Turkish standard contract/notification or other valid route has been executed. A broad mandatory consent checkbox cannot establish that route. Provider GDPR terms alone must not be represented as a completed Turkish transfer safeguard. No contract was signed or regulatory declaration filed on the operator's behalf.
- **Children and age targeting:** current flow records a guardian statement but does not independently verify adult identity/age. Verify the actual audience, parental-consent obligations, speech providers, embedded media and each store's Families/Kids rules before declaring child-policy compliance. A privacy notice does not implement parental verification or provider approval.
- **Native release:** verify permissions, speech disclosure before permissions, SDK inventory, user-content reporting/blocking and all actual data collection. No claim that an unseen native package is compliant.
- **Retention beyond the active database:** independent legacy Sheets, exports and provider backups have no verified common expiry. The public policy discloses this limitation; it does not invent a 30-day backup guarantee. Establish a separate copy/backup inventory and deletion process without blindly deleting old sources.
- **Security:** the prior deployment identified existing public EXECUTE access to unrelated SECURITY DEFINER function diji_veri_temizligi(). This policy release does not change database permissions or that function; handle a least-privilege remediation separately.
- **Requests:** the contact mailbox is published but its ownership/delivery handling and operator response workflow have not been tested by sending a message. No external message was sent. The statutory response commitment requires operational follow-through.

## Official references reviewed

- Google Play User Data/privacy-policy/deletion requirements: https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
- Apple App Review Guidelines sections 5.1 and 1.2: https://developer.apple.com/app-store/review/guidelines/
- KVKK information obligations: https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-
- KVKK foreign transfers: https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim
- KVKK 2026/347 information/consent separation: https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu

The release publishes an accurate, publicly accessible privacy notice and updates English-only links. It does not certify legal compliance, store acceptance, or completion of the above operational/legal steps.
