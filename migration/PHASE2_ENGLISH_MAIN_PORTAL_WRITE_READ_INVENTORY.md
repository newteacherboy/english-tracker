# Phase 2 — English Main Portal Write/Read Inventory

Audit-only. No production behavior changes.

## Verified main portal writes

### 1. Level test
`index.html` sends `aksiyon: "seviyeKaydet"` with date, student and level-test context.

Lifecycle: long-term learning history.

Decision: keep Sheets as durable record. A realtime read projection may be added later; the write should remain authoritative in the first migration phases.

### 2. Vocabulary/game leaderboard
`index.html` sends `aksiyon: "ezberKaydet"` with student/class and score fields.

Lifecycle: long-term performance history.

Decision: retain historical leaderboard records in Sheets. Realtime can later provide live leaderboard presentation, but historical rows remain durable.

### 3. Appointment
`index.html` sends `aksiyon: "randevuAl"`.

Lifecycle: operational/business record.

Decision: do not put this in the first realtime migration boundary. Preserve the existing Sheets/App Script flow until a separate business-workflow analysis is completed.

## Verified study-time behavior

The main portal maintains `oturumSaniye` locally and uses a per-student localStorage key. It also reads a larger cloud value and replaces the local value when the cloud total is greater.

The current page has lifecycle handling for `visibilitychange` and `beforeunload`, and writes the study-time total to the Sheets/App Script path.

Target architecture remains:

- active-visible local counter
- periodic sync around 3–5 minutes rather than every 30 seconds
- lifecycle flush
- offline queue
- idempotent sync transaction
- background/hidden time excluded
- durable cumulative total retained in Sheets

This is a future implementation change, not part of this audit commit.

## Important source-boundary finding

The GitHub repository search confirms several Apps Script actions exist server-side without corresponding calls being discoverable in the tracked main `index.html`:

- `dersTestSonucKaydet`
- `okumaHiziKaydet`
- `kelimeLiderlikKaydet`
- `jeopardyLiderlikKaydet`
- `boslukLiderlikKaydet`
- `konusmaLiderlikKaydet`
- `ekVeriKaydet`
- `enerjiDegistir`
- `duelloGonder`
- `bildirimGonder`
- `akisOlayToggle`
- `buyuSeviyeTamamla`

This does **not** prove those features are unused. They may be implemented in dynamically loaded content, other tracked files, external/generated UI, or via server-side flows.

Therefore no feature will be removed or migrated merely because its caller is not visible in a repository search.

## Data migration rule

For every feature, before changing its write path:

1. identify the actual client caller;
2. identify the exact Apps Script action;
3. identify the destination Sheet(s);
4. identify whether the data is current state, event/history, idempotency control, or temporary state;
5. define offline behavior;
6. define retention;
7. test shadow-write;
8. compare old/new reads;
9. only then consider enabling the realtime flag.

## Safety

No deletion, cleanup, destructive migration, or production feature flag is authorized by this document.
