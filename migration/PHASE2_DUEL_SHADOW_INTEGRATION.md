# Phase 2 — Duel Shadow Integration Boundary

## Status

Design/adapter only. The existing production duel flow is unchanged.

The adapter in `PHASE2_DUEL_SHADOW_ADAPTER.gs` is **not imported or called** by the current Apps Script.

## Verified current flow

### Send
`duelloGonder`:
1. validates sender, receiver and game;
2. checks open duels and the daily limit;
3. appends the duel to `Duello`;
4. sends a notification;
5. returns success.

### Response
`duelloYanit`:
1. verifies the recipient and duel id;
2. changes `bekliyor` to `kabul` or `red`;
3. stores the response timestamp;
4. sends a notification.

### Read / completion
`duellolarim`:
1. reads recent duel rows;
2. expires old pending invitations;
3. for accepted duels, checks game scores;
4. records player-notified flags;
5. when both scores exist or the deadline passes, changes the duel to `bitti` and records the winner;
6. sends result notifications.

## Shadow boundary

The existing Sheets operation remains authoritative.

Future shadow events:

- `duel.created`
- `duel.accepted`
- `duel.rejected`
- `duel.completed`

Every event has:

- `eventId`
- `eventType`
- `occurredAt`
- `studentId`
- `source`
- `payloadVersion`
- `payload`

## Idempotency

Stable event IDs are derived from the existing duel ID:

- `duel:<id>`
- `duel:<id>:response:kabul`
- `duel:<id>:response:red`
- `duel:<id>:completed`

The future realtime backend must treat `eventId` as an idempotency key.

## Important safety decision

Do **not** emit shadow events by generating a second duel ID.

The current Apps Script-generated `Duello.id` must remain the identity of the historical record. A future production integration should obtain the actual row ID/status from the existing write path rather than creating a parallel identity.

## Why completion is special

The current application performs some state transitions during `duellolarim` reads. Therefore, a future realtime projection must not independently decide a winner or mutate the Sheets record.

During shadow mode, completion should be observed and projected only after the existing Sheets flow has determined the result.

## Not implemented yet

- no network/backend write
- no realtime read
- no frontend change
- no feature-flag activation
- no migration of existing duel rows
- no cleanup
- no deletion
- no change to `Duello` retention

## Next safe implementation step

After selecting the realtime provider, add a provider-specific **fire-and-forget shadow sink** behind an OFF feature flag.

Required behavior:

1. existing Sheets action succeeds first;
2. shadow event is prepared from the actual result;
3. shadow failure is caught and logged;
4. duplicate event IDs are accepted safely;
5. user-facing reads continue to use Sheets;
6. no destructive reconciliation is performed.
