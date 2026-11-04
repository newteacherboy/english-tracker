import { AD_DEFAULTS, normalizeAdSettings } from '../../supabase/functions/billing/ad-settings.mjs';

// Reklam ayarlarını sunucudan okur. Sunucuya ulaşılamazsa son bilinen ayar (yoksa varsayılan) kullanılır.
// Yönetici "Reklamları kapat" derse en geç bir sonraki okumada (açılış, girişte, uygulamaya dönüşte, 15 dk'da bir) uygulanır.
const CACHE = 'dm_android_ad_settings_v1';
const REFRESH_MS = 15 * 60 * 1000;

export function createAdRemote({ win, endpoint, now = Date.now }) {
  let settings = normalizeAdSettings(AD_DEFAULTS), ageHours = null, ageOwner = '', loadedAt = 0, inflight = null;
  try {
    const cached = JSON.parse(win.localStorage.getItem(CACHE) || 'null');
    if (cached && cached.settings) settings = normalizeAdSettings(cached.settings);
  } catch {}
  const owner = () => String(win.dmAndroidStudentName?.() || '');

  function apply(next) {
    const before = JSON.stringify(settings);
    settings = normalizeAdSettings(next);
    try { win.localStorage.setItem(CACHE, JSON.stringify({ settings, at: now() })); } catch {}
    if (JSON.stringify(settings) !== before) win.dispatchEvent(new win.CustomEvent('dm:ad-settings', { detail: settings }));
  }

  async function refresh(force = false) {
    const token = win.localStorage.getItem('ing_token');
    if (!token) return settings;
    if (!force && owner() === ageOwner && now() - loadedAt < REFRESH_MS) return settings;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const r = await win.fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-diji-token': token }, body: JSON.stringify({ action: 'policy' }), signal: AbortSignal.timeout(8000) });
        if (!r.ok) return settings;
        const data = await r.json();
        if (win.localStorage.getItem('ing_token') !== token) return settings;
        ageOwner = owner(); loadedAt = now();
        ageHours = Number.isFinite(Number(data.accountAgeHours)) ? Number(data.accountAgeHours) : null;
        if (data.settings) apply(data.settings);
      } catch {}
      return settings;
    })().finally(() => { inflight = null; });
    return inflight;
  }

  return {
    get: () => settings,
    // Sunucudan gelmediyse null; politika o zaman cihazdaki ilk görülme zamanını kullanır.
    accountAgeHours: () => (owner() === ageOwner ? ageHours : null),
    refresh,
    _apply: apply,
  };
}
