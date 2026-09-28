# Phase 2 — English Feature Data Boundary

Audit/design only. No production behavior is changed.

## Verified feature boundaries

| Feature | Current persistence | Lifecycle | Realtime candidate | Migration priority |
|---|---|---|---|---|
| Level test | Sheets via `seviyeKaydet` | Long-term | Read projection later | Medium |
| Vocabulary/game scores | Sheets leaderboard/history tables | Long-term | Live score projection only | Medium |
| Lesson test/progress | `DersIlerleme` and related Sheets | Long-term | No deletion; optional live progress projection | High |
| Reading speed | `Okuma_Hizi` | Long-term | No | Low |
| Books/reading | `Kitaplar` and lesson/report data | Long-term | No | Low |
| Study time | `Oturum Saniye` / client local counter | Long-term | Session/presence only | High |
| XP/current league | `yo` + `XP_Tablosu` / `XP_Haftalik` | Durable + current state | Yes, after shadow validation | High |
| Energy | `EnerjiDurumu/EnerjiV2` plus history/transfer records | Current live state + history | Yes | High |
| Duel | `Duello` | Active = live; completed = history | Yes | High |
| Notifications | `Bildirimler` | History + delivery state | Yes | High |
| Chat | `Sohbet` | Message history | Delivery/read = yes; history = Sheets | High |
| Presence/sessions | `Oturumlar` and client state | Operational | Yes | High |
| Activity feed | `Akis_Olaylari` | Retention policy required | Live projection possible | Medium |
| Badges/achievements | `Rozetler` / durable state | Protected/long-term | Optional read projection | Low |
| Character/store/rewards | `yo` ownership/reward fields | Protected | Current display projection later | High |
| Appointments | Sheets | Operational/business record | No initial realtime migration | Low |

## Key design rule

Realtime is a projection/interaction layer first, not a replacement for durable learning history.

For the first migration stages:

1. Existing Sheets write remains authoritative.
2. A successful write may emit a shadow event.
3. Shadow failure never blocks the existing user action.
4. Events use stable IDs and are idempotent.
5. Realtime reads are feature-flagged and initially disabled.
6. Read mismatches are logged, not destructively reconciled.
7. Completed/history data remains in Sheets.

## Study-time correction

The current main portal increments a local counter every second and currently sends the cumulative value every 30 seconds. This is unnecessarily chatty for a 5,000-user system.

Target design:

- local counter while page is actively visible
- pause counting when hidden/backgrounded
- periodic sync around 3–5 minutes
- lifecycle flush on `visibilitychange` / `pagehide`
- offline queue when network is unavailable
- idempotent transaction ID per sync
- server-side monotonic/max or delta aggregation according to the existing source-of-truth semantics

No change is applied in this audit phase.

## Do not migrate yet

The following require additional source verification before implementation:

- every frontend caller of `ekVeriKaydet`
- all `yo` field writers
- exact energy history completeness
- exact duel completion/winner semantics
- all client-side offline behavior
- every current localStorage key and its business meaning

## Safety

No cleanup rule is authorized by this document.

No protected or long-term data may be hard-deleted by the migration.

No production feature flag should be enabled until shadow-write and read-compare tests pass.
