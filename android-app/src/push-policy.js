// Bildirim izni ne zaman sorulur (DOM'suz, test edilebilir).
// Aileler politikası ve iyi deneyim: açılışta sorulmaz; öğrenci bir oyunu bitirince Papi kibarca sorar.
// "Şimdi değil" denirse en erken 7 gün sonra, toplamda en fazla 3 kez.
export const PUSH_RULES = Object.freeze({ quietMs: 60000, againDays: 7, maxAsks: 3 });

export function createPushPolicy({ storage, owner = 'preview', now = Date.now, startedAt = Date.now() } = {}) {
  const key = 'dm_android_push_v1:' + encodeURIComponent(owner).slice(0, 120);
  let s; try { s = JSON.parse(storage?.getItem(key) || 'null'); } catch {}
  if (!s || typeof s !== 'object') s = {};
  s = { asks: s.asks | 0, last: Number(s.last) || 0, done: !!s.done };
  const save = () => { try { storage?.setItem(key, JSON.stringify(s)); } catch {} };
  return {
    // permission: Capacitor durumu ('prompt' | 'prompt-with-rationale' | 'granted' | 'denied')
    canAsk(permission) {
      if (s.done || !/^prompt/.test(String(permission))) return false;
      if (now() - startedAt < PUSH_RULES.quietMs) return false;
      if (s.asks >= PUSH_RULES.maxAsks) return false;
      return !s.last || now() - s.last >= PUSH_RULES.againDays * 86400000;
    },
    asked() { s.asks++; s.last = now(); save(); },
    answered(granted) { if (granted) s.done = true; save(); },
    snapshot() { return { ...s }; },
  };
}
