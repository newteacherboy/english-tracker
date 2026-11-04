// Android reklam ayarları: sunucu (kaydetme) ve uygulama (okuma) aynı doğrulamayı kullanır.
export const AD_DEFAULTS = Object.freeze({
  enabled: true, banner: true, interstitial: true, rewarded: true,
  bannerTabs: Object.freeze(['games', 'store', 'lessons']),
  gamesPerInterstitial: 3, gapSeconds: 300, dailyInterstitials: 5,
  newUserGraceHours: 24, minAnswers: 3, minGameSeconds: 30,
  dailyEnergy: 5, dailyGold: 3,
});
const TABS = ['games', 'store', 'lessons'];
const LIMITS = {
  gamesPerInterstitial: [1, 20], gapSeconds: [60, 3600], dailyInterstitials: [0, 20],
  newUserGraceHours: [0, 720], minAnswers: [0, 20], minGameSeconds: [0, 600],
  dailyEnergy: [0, 10], dailyGold: [0, 10],
};

// Bilinmeyen alanları atar, sayıları sınırlar; eksik/bozuk her şey varsayılana döner.
export function normalizeAdSettings(input) {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const out = {};
  for (const k of ['enabled', 'banner', 'interstitial', 'rewarded']) out[k] = typeof src[k] === 'boolean' ? src[k] : AD_DEFAULTS[k];
  out.bannerTabs = Array.isArray(src.bannerTabs) ? TABS.filter(t => src.bannerTabs.includes(t)) : [...AD_DEFAULTS.bannerTabs];
  for (const [k, [lo, hi]] of Object.entries(LIMITS)) {
    const n = Number(src[k]);
    out[k] = Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : AD_DEFAULTS[k];
  }
  return out;
}
