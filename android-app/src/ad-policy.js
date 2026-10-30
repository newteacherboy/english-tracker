export const AD_POLICY = Object.freeze({ gamesPerInterstitial: 3, fullscreenGapMs: 300000, dailyEnergy: 5, dailyGold: 3 });
export const SOLO_GAMES = new Set(['ky','hafiza','yagmur','asmaca','kelimebul','jp','bosluk','eslestirme','tren','dikte','cumle','harfbahcesi','kulak','canavar','kule','kelime-golu']);
export function createAdPolicy({ now = Date.now, storage, owner = 'preview' } = {}) {
  const key = 'dm_android_ads_v1:' + encodeURIComponent(owner).slice(0,120);
  let state;
  try { state = JSON.parse(storage?.getItem(key) || 'null'); } catch {}
  if (!state || !Number.isFinite(state.games) || !Number.isFinite(state.lastFullscreen)) state = {games:0,lastFullscreen:0,seen:[],day:'',energy:0,gold:0};
  state.seen = Array.isArray(state.seen) ? state.seen.slice(-100) : [];
  const save = () => { try { storage?.setItem(key, JSON.stringify(state)); } catch {} };
  function day() {
    const d = new Date(now()), today = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (state.day !== today) { state.day=today;state.energy=0;state.gold=0;save(); }
  }
  return {
    complete({id,game,answered=0,teacher=false}) {
      if (teacher || !id || !SOLO_GAMES.has(game) || !(answered>0) || state.seen.includes(id)) return false;
      state.seen.push(id);state.seen=state.seen.slice(-100);state.games++;save();return true;
    },
    canInterstitial() { return state.games>=AD_POLICY.gamesPerInterstitial && (!state.lastFullscreen || now()-state.lastFullscreen>=AD_POLICY.fullscreenGapMs); },
    interstitialShown() { state.games=0;state.lastFullscreen=now();save(); },
    rewardAllowed(kind) { day();return ['energy','gold'].includes(kind) && state[kind] < (kind==='energy'?AD_POLICY.dailyEnergy:AD_POLICY.dailyGold); },
    rewardClosed(kind, completed) { day();state.lastFullscreen=now();if(completed&&['energy','gold'].includes(kind))state[kind]++;save(); },
    snapshot() { return {...state,seen:[...state.seen]}; }
  };
}
