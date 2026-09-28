/**
 * Diji-Medu Phase 2 — exact integration points for the existing Apps Script.
 *
 * PATCH GUIDE ONLY. Not a replacement doPost/doGet.
 * Existing Sheets logic remains authoritative.
 */

1) DUEL CREATION
Existing source appends a Duello row with a generated id.
After the successful appendRow, call:
  dijiShadowDuelCreated_(duelId, g, a, { oyun: o });
Use the exact id stored in the Sheet.

2) DUEL RESPONSE
After the existing validated setValues() changes bekliyor -> kabul/red:
  dijiShadowDuelResponse_(String(p.id), kabul ? 'kabul' : 'red', ad);
Never emit before the Sheet mutation.

3) DUEL COMPLETION
duellolarim() currently derives completion/winner from Sheet state.
After the existing code stores bitti + winner:
  dijiShadowDuelCompleted_(d.id, ad, d.kazanan || null);
Do not reimplement winner logic in Supabase.

4) NOTIFICATION CREATION
After bildirimIsle_() successfully appendRow()s the notification:
  dijiShadowNotificationCreated_(String(k || stableNotificationId), alici, tur);
Prefer an existing stable key. Do not use message text as an identifier.

5) NOTIFICATION READ
After each ownership-validated update of the read column:
  dijiShadowNotificationRead_(String(n), kim);

6) CHAT MESSAGE
After the existing Sohbet append succeeds, emit only when a stable message id
is available:
  dijiShadowChatMessage_(messageId, gonderenOgrenci, recipientId);
Do not send the full message body in the first projection.

7) FEATURE FLAG
Keep this OFF until the endpoint and secret are configured:
  PropertiesService.getScriptProperties()
    .setProperty('DIJI_REALTIME_SHADOW_WRITE', 'false');

Properties:
  DIJI_REALTIME_SHADOW_ENDPOINT
  DIJI_REALTIME_SHADOW_SECRET

Never put the secret in index.html or GitHub.

8) FIRST TEST
With the flag false, a controlled helper call must return:
  { ok:false, skipped:true, reason:'feature_disabled' }

Only after that, enable the shadow flag in a controlled test execution and send
one synthetic event. Verify exactly one row in realtime_events.

9) ROLLBACK
Set DIJI_REALTIME_SHADOW_WRITE=false.
Existing Sheets behavior continues unchanged.
No Sheet rows are deleted or rewritten.
