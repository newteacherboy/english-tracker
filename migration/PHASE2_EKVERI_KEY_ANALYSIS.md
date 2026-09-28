# Phase 2 — EkVeri Key-Level Analysis

Status: source-derived analysis only. No production behavior changed.

Source: current uploaded Apps Script `ingilizce app script (2).txt`, especially `yoBirlestir_`, `ekVeriIsle_`, `gvHileKoru_`, `ekVeriOzet`, and `xpTabloGuncelle_`.

## Important finding

`EkVeri` is physically stored as:

`ogrenci | anahtar | deger | guncelleme`

but `deger` is not a simple scalar. The `yo` key is a JSON state package containing multiple independent data domains.

Therefore:

- Do not apply a single retention period to `EkVeri`.
- Do not move all `EkVeri` to realtime.
- Do not delete old `EkVeri` rows by age.
- Do not split or rewrite the `yo` package until the client-side schema is mapped and a reversible migration is approved.

## Verified `yo` fields

| Field inside `yo` | Source behavior | Lifecycle interpretation | Protection |
|---|---|---|---|
| `lig.hafta` | identifies current league week | current + historical projection | Protected |
| `lig.xp` | same-week merge uses max value | current competitive state | Protected |
| `lig.gecen.xp` | copied into XP table as previous value | historical/current aggregate | Long-term |
| `xpGun.tarih` | daily XP date | current daily state | Protected until rolled into history |
| `xpGun.xp` | same-day merge uses max value | current daily state | Protected |
| `log[date]` | day-by-day XP history; merge uses max | historical learning/reward record | Long-term |
| `sandik` | per-key numeric values merged with max | reward/progression state | Protected |
| `sohbet` | per-key numeric values merged with max; source comments call these chat stars | reward/social state | Protected/long-term |
| `krkGoruldu` | list union | character discovery/progression | Protected |
| `sahip` | list union | ownership/purchase state | Protected |
| `dcOdul` | list union | reward/idempotency state | Protected |
| `videoOdul` | list union | reward/idempotency state | Protected |
| `duelloOdul` | list union | duel reward/idempotency state | Protected |
| `siIslenen` | list union | classroom interaction processing/idempotency | Protected |
| `karakter.sahip` | list union when nested character state exists | ownership/progression | Protected |
| `karakter.cins` | surfaced in student summary | current profile state | Protected |
| `karakter.s` | surfaced in student summary | current profile state | Protected |
| `takili` | surfaced in student summary | current equipped state | Protected |
| `seviye.sonuc` | surfaced in student summary | level-test/progression result | Long-term |
| `profilKrk` | surfaced in student summary | profile character state | Protected |

## Merge semantics that must not be lost

The source's `yoBirlestir_` function does not simply replace the old JSON:

1. Chooses the newer package using `guncelleme`.
2. Same-week league XP uses the larger value.
3. Newer league week replaces older league week.
4. Same-day daily XP uses the larger value.
5. Per-day XP history uses the larger value for each date.
6. `sandik` and `sohbet` numeric maps merge using maximum values.
7. `krkGoruldu`, `sahip`, `dcOdul`, `videoOdul`, `duelloOdul`, and `siIslenen` merge by union.
8. Nested `karakter.sahip` also merges by union.
9. `guncelleme` is advanced after merge.

This merge behavior is effectively part of the data-integrity contract. Any future realtime/offline implementation must preserve it or use an equivalent conflict-resolution rule.

## XP mirror behavior

When `anahtar === 'yo'`, the Apps Script calls `xpTabloGuncelle_`.

That function writes a current aggregate row to `XP_Tablosu`, including:

- student
- total XP
- historical/previous XP value
- current league week
- previous league XP
- gold
- freeze item
- opened-character count
- update timestamp

Therefore `EkVeri.yo` and `XP_Tablosu` are coupled. A future migration cannot treat either table independently without reconciliation checks.

## Security coupling

The security gateway applies special anti-abuse checks to `ekVeriKaydet` when `anahtar === 'yo'`.

The source checks rapid growth in:

- same-week league XP
- gold

and logs an event through `gvLog_` when it clamps suspicious growth.

Therefore a realtime XP/gold implementation must preserve the server-side authority and security checks. Client-only XP/gold is not an acceptable replacement.

## Current migration classification

### A — Never auto-delete

- `yo` ownership/progression/reward components
- `sahip`
- `krkGoruldu`
- `dcOdul`
- `videoOdul`
- `duelloOdul`
- `siIslenen`
- character/profile state
- any XP/gold state needed to reconstruct the user's current account state

### B — Long-term

- daily XP history in `log`
- level-test results
- league history represented in durable tables
- important reward/progression history

### C — Potentially operational, but only after exact schema confirmation

No `yo` field is currently approved for age-based deletion.

The current daily/weekly fields may eventually be compacted only if their historical information has been independently persisted and verified. That is a future design decision, not a cleanup approval.

## Realtime boundary

Potential realtime projections:

- current league XP
- current daily XP
- current energy
- active duel state
- notification delivery/read
- chat delivery/read
- presence

But Sheets remains the historical/recovery mirror until an explicit authority change is approved.

## Offline boundary

For `yo`-related offline writes, use transaction/event IDs and merge on the server. Never solve conflicts with last-write-wins alone because the existing implementation intentionally uses max/union semantics.

## Next verification step

The remaining unknown is not the `yo` merge logic; that is now verified.

The next source-level task is to map every client feature that writes each `yo` field and identify whether any other `EkVeri` keys are used outside the `yo` package.

Only after that should we define the realtime data model.
