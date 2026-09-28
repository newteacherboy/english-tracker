# Phase 2 execution checklist

## Completed

- [x] Supabase project healthy
- [x] Realtime tables created
- [x] RLS enabled on all realtime tables
- [x] Client realtime publication restricted to intended live tables
- [x] Shadow Edge Function deployed
- [x] Allowlist and forbidden-field checks implemented
- [x] Apps Script shadow sink prepared
- [x] Feature flag defaults OFF
- [x] Synthetic test harness prepared
- [x] Idempotency test prepared
- [x] No production index.html change
- [x] No production Sheets deletion
- [x] No critical data migration

## External configuration still required

1. Configure Edge Function secret: DIJI_SHADOW_SECRET
2. Configure Apps Script Script Properties:
   DIJI_REALTIME_SHADOW_ENDPOINT
   DIJI_REALTIME_SHADOW_SECRET
   DIJI_REALTIME_SHADOW_WRITE=false
3. Run dijiShadowDisabledCheck_().
4. In a controlled test copy only, set shadow flag true.
5. Run dijiShadowSyntheticTest_().
6. Query realtime_events and verify exactly one synthetic row.
7. Run dijiShadowSyntheticIdempotencyTest_().
8. Verify the repeated eventId creates only one database row.
9. Set shadow flag false again.
10. Only after those checks, prepare the first real action integration. First candidate: notification delivery. Duel comes after notification.

## Stop conditions

Stop immediately if:
- the function accepts a request without the secret;
- a forbidden credential-like field is accepted;
- duplicate eventId creates another row;
- a shadow failure changes a Sheets operation result;
- any production Sheet row changes unexpectedly.

## Cleanup

No cleanup is authorized by this checklist.
