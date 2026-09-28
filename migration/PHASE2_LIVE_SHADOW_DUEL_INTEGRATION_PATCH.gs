/**
 * Diji-Medu Phase 2 — exact live shadow integration patch
 *
 * IMPORTANT:
 * - Apply only to Apps Script after review.
 * - DIJI_REALTIME_SHADOW_WRITE must remain false while pasting/testing.
 * - Existing Sheets writes remain authoritative.
 * - No cleanup, deletion, auth migration or realtime reads are introduced.
 *
 * Three hook points:
 * 1) duel.created after Duello appendRow
 * 2) duel.accepted/rejected after duel response setValues
 * 3) duel.completed after winner/state is written
 *
 * The helper functions live in PHASE2_LIVE_SHADOW_SINK.gs.
 */

/* ------------------------------------------------------------------
   HOOK 1 — duelloGonder
   Existing code:
     sh.appendRow([Utilities.getUuid().slice(0, 8), new Date(), ...]);
     dlBildir_(...);

   CHANGE TO:
------------------------------------------------------------------ */

var dijiDuelId_ = Utilities.getUuid().slice(0, 8);
sh.appendRow([dijiDuelId_, new Date(), enerjiGun_(), g, a, o, 'bekliyor', '', '', '', '']);
dlBildir_(a, g, 'duello', o);

// Shadow is non-blocking and OFF by default.
try {
  dijiLiveShadowDuelCreated_(dijiDuelId_, g, a, o);
} catch (shadowErr) {
  console.warn('duel.created shadow hook failed: ' + shadowErr);
}

/* ------------------------------------------------------------------
   HOOK 2 — duelloYanit
   Existing code:
     sh.getRange(j + 2, 7, 1, 2).setValues([[kabul ? 'kabul' : 'red', simdi]]);
     dlBildir_(...);

   CHANGE TO:
------------------------------------------------------------------ */

var dijiDuelResponse_ = kabul ? 'kabul' : 'red';
sh.getRange(j + 2, 7, 1, 2).setValues([[dijiDuelResponse_, simdi]]);
dlBildir_(data[j][3], data[j][4], 'duelloYanit',
  kabul ? 'kabul etti ⚔️ ' + DUELLO_OYUN_AD[data[j][5]] + ' oyna!' : 'düelloyu reddetti');

try {
  dijiLiveShadowDuelResponse_(String(data[j][0]), dijiDuelResponse_, ad);
} catch (shadowErr) {
  console.warn('duel.response shadow hook failed: ' + shadowErr);
}

/* ------------------------------------------------------------------
   HOOK 3 — duellolarim completion
   Existing code:
     sh.getRange(k + 2, 7).setValue('bitti');
     sh.getRange(k + 2, 9).setValue(d.kazanan);

   CHANGE TO:
------------------------------------------------------------------ */

sh.getRange(k + 2, 7).setValue('bitti');
sh.getRange(k + 2, 9).setValue(d.kazanan);

try {
  dijiLiveShadowDuelCompleted_(String(r[0]), ad, d.kazanan);
} catch (shadowErr) {
  console.warn('duel.completed shadow hook failed: ' + shadowErr);
}

/*
 * Do NOT change the duellolarim winner calculation.
 * Do NOT let Supabase decide the winner.
 * Do NOT enable the feature flag until all three hooks compile.
 */
