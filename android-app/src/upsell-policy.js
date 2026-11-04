// Teklif panolarının ne zaman gösterileceği (DOM'suz, test edilebilir).
// Google Play Aileler politikası: uygulama açılır açılmaz para kazanma yöntemi gösterilmez,
// her pano kapatılabilir ve sık tekrar etmez.
export const UPSELL_RULES = Object.freeze({
  lowEnergy: 5,            // enerji bunun altına inince
  sheetPerDay: 2,          // alttan açılan enerji panosu günde en fazla
  dropPerDay: 1,           // üstten inen küçük pano günde en fazla
  successEveryDays: 7,     // başarı kartı en fazla haftada bir
  startQuietMs: 60000,     // uygulama açıldıktan sonra ilk 60 sn hiçbir teklif yok
});

export function createUpsellPolicy({ storage, owner = 'preview', now = Date.now, startedAt = Date.now() } = {}) {
  const key = 'dm_android_upsell_v1:' + encodeURIComponent(owner).slice(0, 120);
  let s;
  try { s = JSON.parse(storage?.getItem(key) || 'null'); } catch {}
  if (!s || typeof s !== 'object') s = {};
  s = { day: s.day || '', sheet: s.sheet | 0, drop: s.drop | 0, dismissedDay: s.dismissedDay || '', lastSuccess: Number(s.lastSuccess) || 0, firstResultDay: s.firstResultDay || '' };
  const save = () => { try { storage?.setItem(key, JSON.stringify(s)); } catch {} };
  const today = () => { const d = new Date(now()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function roll() { const t = today(); if (s.day !== t) { s.day = t; s.sheet = 0; s.drop = 0; save(); } return t; }
  const quiet = () => now() - startedAt < UPSELL_RULES.startQuietMs;
  return {
    canSheet({ energy, plan }) {
      const t = roll();
      return !quiet() && plan !== 'premium_pro' && Number.isFinite(energy) && energy < UPSELL_RULES.lowEnergy
        && s.dismissedDay !== t && s.sheet < UPSELL_RULES.sheetPerDay;
    },
    sheetShown() { roll(); s.sheet++; save(); },
    sheetDismissed() { s.dismissedDay = roll(); save(); },
    canDrop({ energy, previous, plan }) {
      roll();
      return !quiet() && plan !== 'premium_pro' && Number.isFinite(energy) && energy < UPSELL_RULES.lowEnergy
        && Number.isFinite(previous) && previous >= UPSELL_RULES.lowEnergy && s.drop < UPSELL_RULES.dropPerDay;
    },
    dropShown() { roll(); s.drop++; save(); },
    // Günün ilk tamamlanan sonucu + son kart üzerinden en az 7 gün + Free plan.
    canSuccess({ plan }) {
      const t = roll();
      if (s.firstResultDay === t) return false;
      s.firstResultDay = t; save();
      return !quiet() && plan === 'free' && now() - s.lastSuccess >= UPSELL_RULES.successEveryDays * 86400000;
    },
    successShown() { s.lastSuccess = now(); save(); },
    snapshot() { return { ...s }; },
  };
}
