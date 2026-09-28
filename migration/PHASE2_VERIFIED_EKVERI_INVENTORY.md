# Phase 2 — Verified EkVeri Inventory

This document is audit-only. It does not change production behavior or delete data.

## Verified physical structure

The current `EkVeri` sheet has the schema:

`ogrenci | anahtar | deger | guncelleme`

The Apps Script accepts an arbitrary non-empty `anahtar`; therefore the key inventory must be derived from actual stored data and client usage, not guessed from server code.

## Current database evidence

The supplied database snapshot contains 43 data rows in `EkVeri`.

**All 43 rows currently use exactly one key: `yo`.**

No second physical `anahtar` value was found in this snapshot.

Therefore there is currently no evidence that `EkVeri` contains separate per-feature keys such as `xp`, `lig`, `kelime`, etc. Those states are packed inside the JSON stored under `yo`.

## Verified `yo` top-level fields

Observed across the snapshot:

- `v`, `guncelleme`
- `hedef`, `xpGun`, `hedefOdul`
- `altin`, `sahip`, `takili`, `dondurucu`
- `lig`, `log`, `zk`, `seviye`
- `sohbet`, `sandik`
- `krkGoruldu`, `jokerEnv`
- `sonGirisSira`, `ligTakip`
- `karakter`, `kaIade`
- `turlar`, `duelloOdul`, `siIslenen`, `dcOdul`
- `profilKrk`, `jokerStok`
- rare observed fields: `komboGun`, `komboSay`, `hediyeHak`, `svtBonus`, `videoOdul`

Presence varies by student; absence must not be interpreted as permission to delete.

## Lifecycle classification

### A — Protected / never age-delete

These fields can affect account progression, ownership, rewards, identity/profile state, or reconstruction of current state:

- `sahip`
- `takili`
- `altin`
- `dondurucu`
- `karakter`
- `krkGoruldu`
- `dcOdul`
- `videoOdul`
- `duelloOdul`
- `siIslenen`
- `profilKrk`
- `jokerStok`
- reward/return state such as `kaIade`
- any future field whose loss could alter ownership, entitlement, or progression

### B — Long-term / historical learning state

These should remain available for progress and reporting:

- `log` — daily XP history
- `ligTakip` — league history/record
- `seviye` — level-test/result state
- `zk` — difficult-word learning state
- `sohbet` — conversation-learning progress
- `sandik` — earned/opened chest state
- `xpGun` and `lig` — current aggregates whose historical interpretation is important
- `hedef`, `hedefOdul`
- other learning/progression fields added to the package

### C — Operational candidates

No `yo` field is approved for age-based deletion at this stage.

Some fields may later have a derived operational projection in a realtime backend, for example:

- current league XP
- current daily XP
- current energy
- active duel state
- live notification delivery
- presence

That does **not** authorize deleting the corresponding Sheets state.

## Important technical conclusion

The correct migration unit is **not the individual `yo` JSON field as an isolated row**. The current server merges the whole `yo` package using field-specific rules.

Verified merge behavior includes:

- same-week league XP uses the maximum
- newer league week replaces the older week
- same-day daily XP uses the maximum
- daily log entries use maximum values
- selected maps merge by maximum
- ownership/reward arrays use union semantics
- character ownership uses union semantics
- update timestamp advances

Therefore a future realtime/offline system must use explicit event IDs and field-specific merge rules. A generic last-write-wins strategy would risk losing progression.

## Realtime boundary

The safe first boundary remains:

1. active duel
2. notification delivery/read
3. chat delivery/read
4. presence/temporary connection state

The `yo` package remains a durable Sheets record during shadow migration.

## Cleanup decision

**Approved cleanup for `yo`: none.**

No 10-day, 30-day, or age-based deletion rule should currently touch `EkVeri.yo`.

A future cleanup proposal must first identify an exact field, demonstrate that it is reconstructible or archived, produce a dry-run, and receive explicit approval before any destructive action.

## Evidence

- Database snapshot: `İngilizce Veritabanı.xlsx`
- Apps Script source: `ingilizce app script (2).txt`
