# Phase 2 — Verified English Flow Map

This is an analysis artifact only. It does not change production behavior.

## Verified from current Apps Script

### Permanent learning/history — keep in Google Sheets

- DersIlerleme
  - `dersTestSonucKaydet`
  - Appends lesson/topic result with status and date.
  - Successful first completion can award additive points.
  - This is historical learning data.

- Okuma_Hizi
  - `okumaHiziKaydet`
  - Appends reading speed/session result.
  - Historical learning measurement.

- Kelime_Liderlik / Jeopardy_Liderlik / Bosluk_Tablosu / Konusma_Tablosu
  - Game result actions append dated performance records.
  - These are historical performance records.

- KonusmaSeviyeIlerleme
  - `konusmaSeviyeTamamla`
  - Stores completed speaking levels.
  - Historical progression.

- Dersler, Puanlama, Kitaplar, SeviyeIlerleme and related learning sheets
  - Existing application architecture treats these as durable learning/reporting data.
  - They should not be replaced by a transient realtime store.

### Live/operational candidates

- Duello
  - Apps Script exposes `duelloGonder`, `duellolarim`, `duelloYanit`.
  - The sheet contains invitation/state fields including status, acceptance time, winner and notification flags.
  - Active duel state is a strong realtime candidate.
  - Completed duel result remains historical.

- Bildirimler
  - Apps Script exposes `bildirimGonder`, `bildirimlerim`, `bildirimOkundu`.
  - This is suitable for a realtime delivery layer.
  - Important notification history may remain in Sheets.

- Sohbet
  - `sohbetMesajGonder` writes messages to the Sohbet sheet.
  - Realtime delivery is a candidate; message history remains durable.

- Enerji
  - `enerjiDegistir` updates current energy state.
  - Positive changes are also recorded in EnerjiGunlugu.
  - Current energy is live state; the journal is historical/audit data.

- DuyuruGorulenler
  - Stores announcement read counters/timestamps.
  - Operational/read-receipt behavior is a candidate for temporary realtime state.
  - Important announcement history must not be confused with read receipts.

### Mixed-state requiring key-level classification

- EkVeri
  - Schema: ogrenci, anahtar, deger, guncelleme.
  - The code uses key-specific behavior and special handling for the `yo` key.
  - The same sheet is therefore not a single retention class.
  - No generic cleanup or wholesale migration is allowed.
  - Every key used by the application must be inventoried before migration.

### Security / account-sensitive operations

- İngilizce
  - Used for student/account data and registration approval flow.
  - `kayitOnayla` changes approval status.
  - `kayitReddet` currently deletes a registration row.
  - This delete path must remain outside automated cleanup and should eventually be changed to a reversible status/archive workflow, but only in a separately approved production change.

## First realtime implementation boundary

The first implementation should NOT move learning history.

Recommended first shadow target:
1. active duel state
2. notification delivery/read state
3. chat delivery

The existing Sheets write remains authoritative during shadow mode.

## Shadow-write requirements

Every shadow event should contain:
- eventId
- eventType
- occurredAt
- studentId
- source
- payloadVersion
- payload

Rules:
- shadow failure must not break the existing action
- duplicate eventId must be idempotent
- no realtime read is authoritative during shadow mode
- mismatches are logged only
- no automatic destructive reconciliation

## Explicitly deferred

- EkVeri migration
- account migration
- learning-history migration
- XP historical migration
- cleanup
- hard delete
- making realtime backend authoritative
