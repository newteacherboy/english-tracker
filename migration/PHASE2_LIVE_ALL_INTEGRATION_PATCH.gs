/**
 * Diji-Medu Phase 2 — LIVE ALL-IN-ONE INTEGRATION PATCH
 *
 * Controlled patch guide for the EXISTING Apps Script.
 * Duel logic is intentionally untouched.
 *
 * NOTIFICATION:
 * Replace dlBildir_ with:
 */
function dlBildir_(alici, gonderen, tur, metin) {
  try {
    var sh = bildirimSayfa_();
    sh.appendRow([new Date(), alici, gonderen, tur, metin, '', '']);
    var row = sh.getLastRow();
    dijiLiveShadowNotificationCreated_('row-' + row, alici, tur);
  } catch (e) {}
}

/*
 * In bildirimIsle_ / bildirimGonder, immediately after the existing
 * successful appendRow add:
 *
 *   var bildirimRow = sh.getLastRow();
 *   dijiLiveShadowNotificationCreated_('row-' + bildirimRow, alici, tur);
 *
 * In bildirimOkundu, replace:
 *   sh.getRange(n, 6).setValue('1');
 * with:
 *   sh.getRange(n, 6).setValue('1');
 *   dijiLiveShadowNotificationRead_('row-' + n, kim);
 *
 * STUDENT CHAT:
 * Immediately after:
 *   sheetSohbet.appendRow([new Date(), gonderenOgrenci, "ogrenci", mesajMetni, "hayir"]);
 * add:
 *
 *   var chatRowSB = sheetSohbet.getLastRow();
 *   dijiLiveShadowChatMessage_('row-' + chatRowSB, gonderenOgrenci,
 *     'teacher', 'ogrenci', chatRowSB);
 *
 * TEACHER CHAT:
 * Immediately after:
 *   sheetSohbetCG.appendRow([new Date(), ogrCG, "ogretmen", mesajCG, "evet"]);
 * add:
 *
 *   var chatRowCG = sheetSohbetCG.getLastRow();
 *   dijiLiveShadowChatMessage_('row-' + chatRowCG, 'teacher',
 *     ogrCG, 'ogretmen', chatRowCG);
 *
 * TEACHER READ:
 * Inside ogretmenSohbetAc, replace:
 *
 *   if (gonderenOA === "ogrenci") {
 *     sheetSohbetOA.getRange(oa + 1, 5).setValue("evet");
 *   }
 *
 * with:
 *
 *   if (gonderenOA === "ogrenci") {
 *     var chatRowOA = oa + 1;
 *     sheetSohbetOA.getRange(chatRowOA, 5).setValue("evet");
 *     dijiLiveShadowChatRead_('row-' + chatRowOA, ogrOA, chatRowOA);
 *   }
 *
 * STUDENT CHAT READ:
 * Current source does not expose a separate student-side read mutation;
 * sohbetGetir only reads history. Therefore no invented read mutation is
 * added here.
 *
 * PRESENCE:
 * Add migration/PHASE2_PORTAL_PRESENCE_PATCH.js before </body> of index.html.
 * It sends presence to a new Apps Script action named dijiPresence.
 *
 * REQUIRED SERVER ACTION:
 * Add this function to Apps Script:
 *
 * function dijiPresence_(p) {
 *   var student = String(p.ogrenci || '').trim();
 *   var presenceId = String(p.presenceId || '').trim();
 *   var state = String(p.state || 'online').trim();
 *   if (!student || !presenceId) return gvJson_({ok:false});
 *   var tk = gvTokenCoz_(p.token || '');
 *   if (!tk || tk.r !== 'ogrenci' || gvAd_(tk.o) !== gvAd_(student)) {
 *     return gvJson_({ok:false, mesaj:'Yetkisiz'});
 *   }
 *   if (state === 'offline') {
 *     dijiLiveShadowPresenceClose_(presenceId, student, 'ogrenci');
 *   } else {
 *     dijiLiveShadowPresenceUpsert_(presenceId, student, 'ogrenci', 'online');
 *   }
 *   return gvJson_({ok:true});
 * }
 *
 * IMPORTANT:
 * The existing security gateway must route islem=dijiPresence to dijiPresence_()
 * and pass the authenticated token exactly as the portal already passes tokens.
 * Do not make dijiPresence an unauthenticated endpoint.
 *
 * SAFETY:
 * - Sheets remains authoritative.
 * - No history is deleted.
 * - No duel logic is changed.
 * - Shadow failure never blocks the existing action.
 * - DIJI_REALTIME_SHADOW_WRITE is the kill switch.
 * - No secret reaches index.html.
 */
