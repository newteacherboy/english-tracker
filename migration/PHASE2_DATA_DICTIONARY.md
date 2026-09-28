# Phase 2 — Verified Data Dictionary and Action Map

Status: analysis/design only. No production behavior is changed by this document.

## Safety boundary

- Google Sheets remains the current authoritative store for protected and long-lived English-learning data.
- No data is deleted, migrated, rewritten, or made realtime-authoritative by this document.
- No generic retention rule is approved.
- `EkVeri` is explicitly excluded from generic cleanup because it contains multiple logical data domains.
- Any future cleanup must use an explicit data-type/key policy, backup verification, dry-run, audit record, and rollback path.
- First production cleanup run must report `deleted=0`.

## Verified mappings

| Sheet / store | Current actions / functions | Data meaning | Lifecycle | Realtime candidate | Sheets retained |
|---|---|---|---|---|---|
| `İngilizce` | login/registration/account flows | account identity, profile, status and core user data | Protected A | No | Yes |
| `EkVeri` | `ekVeriKaydet`, `ekVeriGetir`, `ekVeriTumu` | heterogeneous per-student state package | Key-level classification required | Only selected live subfields later | Yes |
| `XP_Tablosu` | `xpTabloGuncelle_` | per-student aggregate XP, weekly XP, gold, freeze item, opened-character count | Long-term B / current aggregate | Live read projection possible later | Yes |
| `XP_Haftalik` | `xpTabloGuncelle_` | permanent weekly XP history | Long-term B / historical | No | Yes |
| `EnerjiV2` | `enerjiV2Oku_`, `enerjiV2Degistir_`, `enerjiGonder_` | current energy, max, refresh time, streak, boost state | Current/live state | Yes, candidate | Yes as current-state mirror |
| `EnerjiGunlugu` | legacy energy logging path exists in `enerjiDegistir` | energy-change history | Long-term B if populated | No | Yes |
| `EnerjiGonderim` | `enerjiGonder_` | friend-to-friend energy gift transaction/day guard | Transaction/control | Realtime candidate, historical mirror retained | Yes |
| `Bildirimler` | `bildirimGonder`, `bildirimlerim`, `bildirimOkundu`; duel/energy helpers also append | user notifications, delivery/read state | Operational C for delivery state; important records may be retained | Yes | Yes as history/report mirror |
| `DuyuruGorulenler` | announcement read tracking | read receipt/counter | Operational C | Yes | Yes if reporting needs it |
| `Sohbet` | student/teacher chat actions | user/teacher conversation history | Long-term B | Delivery/read can be realtime; message history retained | Yes |
| `Duello` | `duelloGonder`, `duelloYanit`, `duellolarim` | invitation, accepted/rejected state, completion and winner | Active state realtime; completed history B | Yes for active duel | Yes |
| `Oturumlar` | token creation, lookup, logout | active authentication sessions | Operational C | Yes | Optional audit mirror |
| `Oturum Saniye` | `kaydet` time update | cumulative study time + badge | Long-term B | Client/local accumulation + periodic sync | Yes |
| `Guvenlik_Log` | `gvLog_` | security/authorization/rate-limit audit events | Control/audit; not disposable by generic age rule | No | Yes |
| `Akis_Olaylari` | activity/event flow functions | event/activity feed | Operational/event history; exact retention still needs policy | Feed delivery can be realtime | Yes if used for historical/reporting |
| `LiderlikBonusVerilenler` | bonus/idempotency checks | prevents duplicate reward processing | Protected control | No generic cleanup | Yes |
| `BildirimGunlugu` | structure exists in database | notification audit/history | Needs exact action mapping before cleanup | Delivery may be realtime | Yes |
| `PuanBildirimDurumu` | structure exists in database | score-notification state | Operational/control | Candidate | Yes if reporting requires |
| `DersIlerleme` | lesson/test progress actions | learning progress history | Long-term B | No | Yes |
| `DersBilmiyordum` | toggle action | current learner-marked “didn't know” state | Long-term learner state | No | Yes |
| `SeviyeIlerleme` | level completion/class selection | level progression | Long-term B | No | Yes |
| `KonusmaSeviyeIlerleme` | completion action | speaking progression history | Long-term B | No | Yes |
| `BuyuIlerleme` | completion action | game/academy progression | Long-term B | No | Yes |
| `Puanlama` | score writes | score history | Long-term B | No | Yes |
| `Kitaplar` | reading/book writes | book reading history | Long-term B | No | Yes |
| `Okuma_Hizi` | `okumaHiziKaydet` | reading performance history | Long-term B | No | Yes |
| game leaderboards | `kelimeLiderlikKaydet`, `jeopardyLiderlikKaydet`, etc. | game results | Long-term B | Live leaderboard projection possible | Yes |
| `SinifIciPerformans` | teacher score/rollback | classroom performance history | Long-term B | No | Yes |

## EkVeri — verified protection rules

The source explicitly documents `EkVeri` as a package for features including difficult words, daily goals, league, store and level tests.

The following behavior is verified:

- `EkVeri` rows are keyed by `ogrenci + anahtar`.
- `ekVeriKaydet` updates an existing key or appends a new key.
- Values can be up to 45,000 characters.
- The `yo` key is special: it is merged by `yoBirlestir_` and then triggers `xpTabloGuncelle_`.
- `yoBirlestir_` protects against loss when different device states are combined: weekly XP uses the larger value for the same week; daily XP is merged; reward/ownership collections are unioned; opened characters and related reward lists are preserved.
- Security code applies an anti-abuse guard specifically to `ekVeriKaydet + anahtar=yo`, including limits on rapid XP and gold growth.

Therefore:

**Decision:** do not migrate, archive, expire, or delete `EkVeri` rows by age. First produce a complete key inventory from live data and map each key to a specific policy.

## XP

The source distinguishes two different stores:

1. `XP_Tablosu`: one current aggregate row per student. It includes total XP, current-week XP, previous-week XP, gold, freeze item, opened-character count and update time.
2. `XP_Haftalik`: permanent weekly history, one record per student/week.

This means the realtime design can expose a live XP projection, but the historical weekly record remains in Sheets.

## Energy

The current implementation has `EnerjiV2` as current state and `EnerjiGonderim` as a transaction/day guard. A legacy `EnerjiGunlugu` logging path is also present, but the current `enerjiDegistir` wrapper returns through the V2 implementation before its older logging code.

**Migration implication:** inspect actual production execution paths before assuming `EnerjiGunlugu` is complete. Do not rebuild or delete it based only on its name.

## Notifications

`Bildirimler` is not just cache: it stores sender, recipient, type, text, read state and key. Current reads are already bounded (normal view: recent 14 days; `tumu=1`: recent 30 days, with result limits), while the sheet itself retains history.

**Migration implication:** realtime can handle delivery/read latency, but Sheets should remain the historical mirror until a separate approval changes authority.

## Chat

`Sohbet` contains actual message history and has rate/cooldown logic. It is not a suitable 10-day or 30-day hard-delete candidate. Realtime chat should be treated as a delivery layer, not a replacement for historical message storage, unless a separate retention and archive policy is approved.

## Sessions and security logs

- `Oturumlar` contains hashed token, student/role, expiry and creation time. Expired rows are currently deleted by `oturumTemizle`.
- `cikis` can also delete a session row immediately.
- `Guvenlik_Log` is an audit record. Current code deletes the oldest 1,000 rows whenever the sheet exceeds 4,000 rows.
- That 4,000-row behavior is an existing destructive policy and should be replaced later with an explicit archive/retention policy after backup verification. This analysis does not change it.

## Immediate next step

Before any realtime provider-specific implementation:

1. Inventory every actual `EkVeri.anahtar` value from production data.
2. Map each key to: protected / long-term / current-live / operational / archive.
3. Identify all writers/readers for XP, energy, notifications, chat and session stores.
4. Separate current-state rows from historical/idempotency/audit rows.
5. Only then define retention windows.

No cleanup period is approved by this document.
