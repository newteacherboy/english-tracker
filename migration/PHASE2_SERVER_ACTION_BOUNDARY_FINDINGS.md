# Phase 2 — Server Action Boundary Findings

Audit-only. Derived from the uploaded Apps Script source. No production behavior change.

## 1. Authentication/session boundary

The Apps Script has a central gateway around `doGet` / `doPost`, with token/session checks, role checks and identity checks.

`Oturumlar` is operational session state. Expired sessions are currently deleted by the scheduled `oturumTemizle` task.

Migration implication: session state is a strong realtime/operational candidate, but the existing cleanup behavior must be preserved only as an explicitly reviewed policy. It must not be generalized to other Sheets.

## 2. Duel boundary

`duelloGonder`:
- validates sender/recipient/game;
- limits open/recent duel count;
- appends a row to `Duello`;
- creates a notification.

`duelloYanit`:
- validates duel id and recipient;
- changes pending state to accepted/rejected;
- records response time;
- creates a notification.

`duellolarim`:
- reads recent duel rows;
- expires pending invitations older than one day by changing state;
- for accepted/completed duels, derives player scores from the relevant game leaderboard sheets;
- can update completion/winner state while serving a read.

Migration implication: the active duel object is a realtime candidate, but completion/winner logic must not be independently reimplemented in a realtime client. Sheets remains authoritative during shadow migration.

## 3. Energy boundary

The current `enerjiDegistir` entry path delegates to `enerjiV2Degistir_`.

The source also contains an older energy-history path that appends to `EnerjiGunlugu`, but the current wrapper returns through the V2 implementation before reaching that older path.

Migration implication: energy history completeness must be verified before treating `EnerjiGunlugu` as the authoritative audit trail. Current energy is a realtime candidate; historical energy changes remain durable until completeness is proven.

## 4. EkVeri boundary

`EkVeri` has physical columns:
`ogrenci | anahtar | deger | guncelleme`.

The source contains special behavior for `anahtar = yo`, including anti-abuse checks and merging logic. It also updates durable XP aggregates.

Migration implication: `EkVeri` cannot be moved or cleaned as one homogeneous table. Key-level semantics remain mandatory.

## 5. Lesson progress

`dersTestSonucKaydet` writes to `DersIlerleme` with:
`ogrenci, seviye, kategori, konuAdi, durum, tarih`.

Successful completion can additionally award points, while the code checks whether that exact lesson was previously completed before awarding the additive point.

Migration implication: this is durable learning history plus an idempotency/business-rule boundary. It is not a temporary/realtime-only dataset.

## 6. Notifications

`Bildirimler` stores notification history with:
`tarih, alici, gonderen, tur, metin, okundu, k`.

The same notification subsystem is used by duel operations.

Migration implication: delivery/read state can become realtime, but notification history remains durable in Sheets during migration.

## 7. Activity feed

`Akis_Olaylari` is not simply a disposable cache. The feed is assembled from several durable sources, including performance, game, level, lesson and reading records. The source also applies a seven-day display window for the assembled feed.

Migration implication: the seven-day UI window must not be interpreted as permission to delete the underlying historical source rows.

## 8. Backup and cleanup

The Apps Script already schedules:
- daily expired-session cleanup;
- weekly full spreadsheet backup.

The backup process retains only the newest eight backup files by moving older ones to trash.

Migration implication: backup retention is itself a policy that should be reviewed before relying on it as the sole rollback mechanism. Cleanup policies must remain dataset-specific.

## 9. Security

The gateway enforces:
- authenticated session/token checks;
- teacher-only operation lists;
- student identity matching;
- rate limits for registration/password changes;
- special anti-abuse checks for `EkVeri.yo`;
- security logging.

Migration implication: moving a write to realtime without reproducing these authorization and anti-abuse boundaries would be unsafe. Realtime shadow writes must initially occur after the existing authoritative operation succeeds.

## Immediate architectural conclusion

The first realtime boundary remains:

1. active duel state;
2. notification delivery/read;
3. chat delivery/read;
4. presence/session state.

The following remain Sheets-authoritative:

1. account identity and account state;
2. lesson/progress history;
3. scores and leaderboard history;
4. study-time history;
5. books/reading history;
6. achievements/reward history;
7. completed duel history;
8. important reports.

No cleanup authorization is created by this document.
