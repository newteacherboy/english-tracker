/**
 * Diji-Medu & Supabase Integration Bridge for Papi Hazine Avı
 * - Zero per-step server requests! Loads state once on init, syncs only on level completion.
 * - Prevents infinite XP on level replay (one-time first-clear 10 XP + one-time perfect 5 XP).
 * - Compatible with Diji-Medu's active window.supabaseClient session and guest localStorage mode.
 */

const STORAGE_KEY = 'dijimedu_papi_hazine_avi_v1';

const DEFAULT_STATE = {
  explorerXp: 0,
  totalStars: 0,
  completedLevels: {}, // { island1_level1: { firstClearXpClaimed, perfectXpClaimed, bestStars, attempts } }
  collectibles: [],    // deterministic collectible IDs
  badges: [],          // island badge IDs
  settings: {
    music: true,
    sfx: true,
    quality: 'auto',   // 'auto' | 'low' | 'medium' | 'high'
    showFps: false
  }
};

export class DijiMeduBridge {
  constructor() {
    this.state = this._loadLocal();
    this.userId = null;
    this.supabase = null;
  }

  _loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_STATE),
        ...parsed,
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) }
      };
    } catch (_) {
      return structuredClone(DEFAULT_STATE);
    }
  }

  _saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (_) {}
  }

  async initSession() {
    try {
      const client = window.supabaseClient || window.parent?.supabaseClient || null;
      if (client && typeof client.auth?.getSession === 'function') {
        this.supabase = client;
        const { data } = await client.auth.getSession();
        if (data?.session?.user?.id) {
          this.userId = data.session.user.id;
          // Load persisted server progress once at startup (no per-step queries)
          const { data: row } = await client
            .from('papi_treasure_progress')
            .select('*')
            .eq('user_id', this.userId)
            .maybeSingle();
          if (row) {
            this.state.explorerXp = Math.max(this.state.explorerXp, row.explorer_xp || 0);
            this.state.totalStars = Math.max(this.state.totalStars, row.total_stars || 0);
            if (row.completed_levels) {
              this.state.completedLevels = { ...this.state.completedLevels, ...row.completed_levels };
            }
            if (Array.isArray(row.collectibles)) {
              this.state.collectibles = Array.from(new Set([...this.state.collectibles, ...row.collectibles]));
            }
            this._saveLocal();
          }
        }
      }
    } catch (_) {
      // Standalone or offline preview mode works cleanly via localStorage
    }
    return this.state;
  }

  updateSettings(partial) {
    this.state.settings = { ...this.state.settings, ...partial };
    this._saveLocal();
  }

  isLevelUnlocked(levelNumber) {
    if (levelNumber <= 1) return true;
    const prevId = `island1_level${levelNumber - 1}`;
    return !!this.state.completedLevels[prevId];
  }

  /**
   * Idempotent, anti-farm level completion reward calculation & server sync
   * - Correct task: 1 Explorer Star
   * - First-time level completion: +10 XP (one-time only!)
   * - Perfect completion (0 mistakes): +5 XP (one-time only!)
   * - Deterministic collectible unlocked on first completion
   */
  async recordLevelComplete({ levelId, starsEarned, mistakes, collectibleId }) {
    const prev = this.state.completedLevels[levelId] || {
      firstClearXpClaimed: false,
      perfectXpClaimed: false,
      bestStars: 0,
      attempts: 0
    };

    const isFirstClear = !prev.firstClearXpClaimed;
    const isPerfect = mistakes === 0;
    const firstClearXp = isFirstClear ? 10 : 0;
    const perfectXp = (isPerfect && !prev.perfectXpClaimed) ? 5 : 0;
    const xpAwarded = firstClearXp + perfectXp;

    const starDelta = Math.max(0, starsEarned - prev.bestStars);
    this.state.totalStars += starDelta;
    this.state.explorerXp += xpAwarded;

    this.state.completedLevels[levelId] = {
      firstClearXpClaimed: true,
      perfectXpClaimed: prev.perfectXpClaimed || isPerfect,
      bestStars: Math.max(prev.bestStars, starsEarned),
      attempts: prev.attempts + 1
    };

    let newCollectible = false;
    if (collectibleId && !this.state.collectibles.includes(collectibleId)) {
      this.state.collectibles.push(collectibleId);
      newCollectible = true;
    }

    this._saveLocal();

    // Server-side idempotent RPC verification when signed in to Diji-Medu Supabase
    if (this.supabase && this.userId) {
      try {
        await this.supabase.rpc('claim_papi_treasure_level', {
          p_level_id: levelId,
          p_stars: starsEarned,
          p_is_perfect: isPerfect,
          p_collectible_id: collectibleId || null
        });
      } catch (_) {
        // Local progress remains safely saved
      }
    }

    return {
      xpAwarded,
      firstClearXp,
      perfectXp,
      isReplay: !isFirstClear,
      isPerfect,
      newCollectible,
      totalXp: this.state.explorerXp,
      totalStars: this.state.totalStars
    };
  }
}
