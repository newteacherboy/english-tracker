import { AD_DEFAULTS } from '../../supabase/functions/billing/ad-settings.mjs';

// Eski adla dışa açık kalır; değerler artık sunucudaki ayardan gelir (yoksa bunlar).
export const AD_POLICY = Object.freeze({ gamesPerInterstitial: AD_DEFAULTS.gamesPerInterstitial, fullscreenGapMs: AD_DEFAULTS.gapSeconds * 1000, dailyEnergy: AD_DEFAULTS.dailyEnergy, dailyGold: AD_DEFAULTS.dailyGold });
export const SOLO_GAMES = new Set(['ky','hafiza','yagmur','asmaca','kelimebul','jp','bosluk','eslestirme','tren','dikte','cumle','harfbahcesi','kulak','canavar','kule','kelime-golu']);

export function createAdPolicy({ now = Date.now, storage, owner = 'preview', settings = () => AD_DEFAULTS, accountAgeHours = () => null } = {}) {
  const key = 'dm_android_ads_v1:' + encodeURIComponent(owner).slice(0,120);
  let state;
  try { state = JSON.parse(storage?.getItem(key) || 'null'); } catch {}
  if (!state || !Number.isFinite(state.games) || !Number.isFinite(state.lastFullscreen)) state = {games:0,lastFullscreen:0,seen:[],day:'',energy:0,gold:0};
  state.seen = Array.isArray(state.seen) ? state.seen.slice(-100) : [];
  if (!Number.isFinite(state.interstitials)) state.interstitials = 0;
  if (!Number.isFinite(state.firstSeen) || state.firstSeen <= 0) state.firstSeen = now();
  const save = () => { try { storage?.setItem(key, JSON.stringify(state)); } catch {} };
  save();
  function day() {
    const d = new Date(now()), today = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (state.day !== today) { state.day=today;state.energy=0;state.gold=0;state.interstitials=0;save(); }
  }
  const cfg = () => settings() || AD_DEFAULTS;
  // Hesap yaşı sunucudan gelir; gelmezse bu cihazda ilk görüldüğü andan hesaplanır.
  function ageHours() {
    const server = accountAgeHours();
    return Number.isFinite(server) ? server : (now() - state.firstSeen) / 3600000;
  }
  return {
    // Yarıda bırakılan ya da birkaç saniyede biten oyun sayılmaz.
    complete({id,game,answered=0,seconds,teacher=false}) {
      const c = cfg();
      if (teacher || !id || !SOLO_GAMES.has(game) || !(answered>0) || answered < c.minAnswers || state.seen.includes(id)) return false;
      if (Number.isFinite(seconds) && seconds >= 0 && seconds < c.minGameSeconds) return false;
      state.seen.push(id);state.seen=state.seen.slice(-100);state.games++;save();return true;
    },
    // Bugün geçiş reklamı gösterilebilir mi (oyun sayısı ve aradaki süre hariç). Boşuna reklam yüklememek için.
    interstitialPossible() {
      day();
      const c = cfg();
      return !!(c.enabled && c.interstitial) && ageHours() >= c.newUserGraceHours && state.interstitials < c.dailyInterstitials;
    },
    canInterstitial() {
      if (!this.interstitialPossible()) return false;
      const c = cfg();
      return state.games>=c.gamesPerInterstitial && (!state.lastFullscreen || now()-state.lastFullscreen>=c.gapSeconds*1000);
    },
    interstitialShown() { day();state.games=0;state.lastFullscreen=now();state.interstitials++;save(); },
    rewardAllowed(kind) {
      day();
      const c = cfg();
      if (!c.enabled || !c.rewarded) return false;
      return ['energy','gold'].includes(kind) && state[kind] < (kind==='energy'?c.dailyEnergy:c.dailyGold);
    },
    rewardClosed(kind, completed) { day();state.lastFullscreen=now();if(completed&&['energy','gold'].includes(kind))state[kind]++;save(); },
    snapshot() { return {...state,seen:[...state.seen]}; }
  };
}
