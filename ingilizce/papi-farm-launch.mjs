// Client presentation only. Server must independently authorize all farm mutations.
export const DAY_MS = 24 * 60 * 60 * 1000;
export const REGIONS = Object.freeze([
  { id: 1, premiumPro: false },
  { id: 2, premiumPro: false },
  { id: 3, name: 'Coral Coast', premiumPro: true },
  { id: 4, name: 'Golden Woods', premiumPro: true },
  { id: 5, name: 'Crystal Mountains', premiumPro: true }
].map(Object.freeze));
const validTime = value => Number.isSafeInteger(value) && value >= 0;
// Set publishedAtMs only once, AFTER the game and backend have passed release checks.
// serverNowMs must come from an authenticated server response, not localStorage.
export function launchState({ enabled = false, publishedAtMs, serverNowMs } = {}) {
  if (enabled !== true || !validTime(publishedAtMs) || !validTime(serverNowMs) || publishedAtMs > Number.MAX_SAFE_INTEGER - DAY_MS || serverNowMs < publishedAtMs) return { status: 'unavailable', remainingMs: null, canEnter: false };
  const remainingMs = Math.max(0, publishedAtMs + DAY_MS - serverNowMs);
  return { status: remainingMs ? 'countdown' : 'open', remainingMs, canEnter: remainingMs === 0 };
}
export function regionState({ launch, regionId, highestUnlocked, verifiedPremiumPro = false } = {}) {
  if (!launch || launch.canEnter !== true || launch.status !== 'open') return 'unavailable';
  const region = REGIONS.find(r => r.id === regionId);
  if (!region || !Number.isInteger(highestUnlocked) || highestUnlocked < 1 || highestUnlocked > REGIONS.length) return 'invalid';
  if (regionId > highestUnlocked) return 'progress_locked';
  if (region.premiumPro && verifiedPremiumPro !== true) return 'premium_pro_required';
  return 'open';
}
export function countdownText(remainingMs) {
  if (!validTime(remainingMs)) return null;
  const total = Math.ceil(remainingMs / 1000);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map(x => String(x).padStart(2, '0')).join(':');
}
