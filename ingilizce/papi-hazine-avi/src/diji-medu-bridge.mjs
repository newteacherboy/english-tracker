import { ISLANDS, ALL_LEVELS, LAUNCH_AT_MS } from './levels-data.mjs';

/**
 * Diji-Medu & Supabase Integration Bridge for Papi Hazine Avı (Production Release)
 * - Launch Gate: Opens 10 Aralık 2026 saat 19:00 (Europe/Istanbul, UTC+3).
 *   Bypassed ONLY for the "Irmak" student account (`isIrmakAccount()`).
 * - Map Access Policy:
 *   Maps 1–3 (Papağan Adası, Zümrüt Ormanı, Mercan Körfezi — 40 Levels): FREE for everyone!
 *   Maps 4–6 (Kayıp Şehir, Kristal Dağları, Antik Tapınak — 60 Levels): Requires `premium_pro`!
 * - Zero per-step server requests; syncs idempotently only at level completion.
 */

const STORAGE_PREFIX = 'dijimedu_papi_hazine_avi_v2:';

const DEFAULT_STATE = {
  explorerXp: 0,
  totalStars: 0,
  completedLevels: {},
  collectibles: [],
  badges: [],
  settings: {
    music: true,
    sfx: true,
    quality: 'auto',
    showFps: false
  }
};

function getHostWindow() {
  try {
    if (window.parent && window.parent !== window && window.parent.location.origin === window.location.origin) {
      return window.parent;
    }
  } catch (_) {}
  return window;
}

export function getActiveStudentName() {
  const host = getHostWindow();
  try {
    const candidates = [
      host.aktifOgrenciAdi,
      window.aktifOgrenciAdi,
      localStorage.getItem('ing_aktifOgrenci')
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim() && c.trim().toLowerCase() !== 'teacher') {
        return c.trim();
      }
    }
  } catch (_) {}
  return '';
}

export function isIrmakAccount() {
  const raw = getActiveStudentName()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .trim();
  return raw === 'irmak' || raw.startsWith('irmak ');
}

export function isLaunchOpen() {
  return Date.now() >= LAUNCH_AT_MS || isIrmakAccount();
}

export function getLaunchCountdown() {
  const diff = Math.max(0, LAUNCH_AT_MS - Date.now());
  return {
    diff,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000)
  };
}

export class DijiMeduBridge {
  constructor() {
    this.accountKey = (getActiveStudentName() || 'guest').toLocaleLowerCase('tr-TR');
    this.state = this._loadLocal();
    this.userId = null;
    this.supabase = null;
    this.verifiedProTier = null;
  }

  _storageKey() {
    return STORAGE_PREFIX + encodeURIComponent(this.accountKey);
  }

  _loadLocal() {
    try {
      const raw = localStorage.getItem(this._storageKey()) || localStorage.getItem('dijimedu_papi_hazine_avi_v1');
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
      localStorage.setItem(this._storageKey(), JSON.stringify(this.state));
    } catch (_) {}
  }

  isPremiumPro() {
    const host = getHostWindow();
    const norm = (raw) => {
      const t = String(raw || '').trim().toLowerCase();
      if (['premium_pro', 'diji_premium_pro', 'teacher_premium_pro', 'premium', 'premium_plus', 'premium_max', 'diji_premium', 'diji_premium_plus', 'diji_premium_max'].includes(t)) return 'premium_pro';
      if (['pro', 'diji_pro', 'teacher_pro'].includes(t)) return 'pro';
      return '';
    };
    try {
      if (host.dmTeacherPortalMode || window.dmTeacherPortalMode) return true;
      if (this.verifiedProTier === 'premium_pro') return true;
      const explicit = norm(
        host.dmAndroidPlan?.plan ||
        host.dmSubscription?.plan ||
        host.dmMembership?.plan ||
        host.document?.documentElement?.dataset?.dmPlan ||
        host.dmProgression?.status?.()?.membership_tier ||
        host.dmMembershipTier
      );
      if (explicit) return explicit === 'premium_pro';
      if (host.dmProgression?.earlyAccess?.() === true) return true;
      const yoObj = host.yo || window.yo;
      if (yoObj && (norm(yoObj.plan || yoObj.membership_tier) === 'premium_pro' || yoObj.premiumPro === true || yoObj.premium === true)) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  openPremiumProUpgrade() {
    const host = getHostWindow();
    try {
      // Close embedded overlay first if needed so Diji-Medu's plan modal sits cleanly on top
      if (host !== window && host.dmHazineAvi?.closeForUpgrade) {
        host.dmHazineAvi.closeForUpgrade();
        return true;
      }
      if (host.DMSatis?.planlar) {
        host.DMSatis.planlar('papi-hazine-avi', 'premium_pro');
        return true;
      }
      if (host.dmAndroidBilling?.open) {
        host.dmAndroidBilling.open('papi-hazine-avi');
        return true;
      }
    } catch (_) {}
    return false;
  }

  requestExitToHub() {
    const host = getHostWindow();
    try {
      if (host !== window && host.dmHazineAvi?.close) {
        host.dmHazineAvi.close();
        return true;
      }
    } catch (_) {}
    if (window.history.length > 1) {
      window.history.back();
      return true;
    }
    window.location.href = '../index.html';
    return true;
  }

  async initSession() {
    const host = getHostWindow();
    try {
      // Verify server-side billing membership tier once on startup if token exists (zero per-step requests!)
      const token = localStorage.getItem('ing_token') || '';
      if (token.length >= 16 && !this.isPremiumPro()) {
        fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-diji-token': token },
          body: JSON.stringify({ action: 'status' })
        }).then((r) => (r && r.ok ? r.json() : null)).then((d) => {
          const t = String(d?.plan || '').trim().toLowerCase();
          if (['premium_pro', 'diji_premium_pro', 'teacher_premium_pro', 'premium', 'premium_plus', 'premium_max', 'diji_premium', 'diji_premium_plus', 'diji_premium_max'].includes(t)) {
            this.verifiedProTier = 'premium_pro';
          }
        }).catch(() => {});
      }

      const client = window.supabaseClient || host.supabaseClient || null;
      if (client && typeof client.auth?.getSession === 'function') {
        this.supabase = client;
        const { data } = await client.auth.getSession();
        if (data?.session?.user?.id) {
          this.userId = data.session.user.id;
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
            if (Array.isArray(row.badges)) {
              this.state.badges = Array.from(new Set([...this.state.badges, ...row.badges]));
            }
            this._saveLocal();
          }
        }
      }
    } catch (_) {}
    return this.state;
  }

  updateSettings(partial) {
    this.state.settings = { ...this.state.settings, ...partial };
    this._saveLocal();
  }

  /**
   * Island Access Logic:
   * - Islands 1–3: Free! Island 1 is open immediately; Island 2 & 3 are ALSO browsable/playable (Level 1 of each free island is unlocked or unlocked sequentially — let's unlock Level 1 of each accessible island OR sequential so students can try Islands 1–3 freely!).
   *   Wait: let's unlock Island 1 immediately, and allow Islands 2 & 3 for free (either after finishing prior island OR let's make Level 1 of Islands 1, 2, 3 immediately playable so students can experience all 3 free maps right away, while levels 2..N within each island unlock sequentially!).
   * - Islands 4–6: Strictly requires `isPremiumPro()`!
   */
  canAccessIsland(island) {
    if (!island) return false;
    if (island.requiresPro && !this.isPremiumPro()) return false;
    return true;
  }

  isLevelUnlocked(levelDef) {
    if (!levelDef) return false;
    const island = ISLANDS.find((i) => i.id === levelDef.islandId);
    if (!this.canAccessIsland(island)) return false;
    // Level 1 of each accessible island is open so players can explore every unlocked island map; subsequent levels unlock sequentially!
    if (levelDef.number <= 1) return true;
    const prevId = `island${island.index}_level${levelDef.number - 1}`;
    return !!this.state.completedLevels[prevId];
  }

  async recordLevelComplete({ levelId, starsEarned, mistakes, collectibleId }) {
    const levelDef = ALL_LEVELS.find((l) => l.id === levelId);
    const island = ISLANDS.find((i) => i.id === levelDef?.islandId);

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

    this.state.completedLevels[levelId] = {
      firstClearXpClaimed: true,
      perfectXpClaimed: prev.perfectXpClaimed || isPerfect,
      bestStars: Math.max(prev.bestStars, starsEarned),
      attempts: prev.attempts + 1
    };

    // Check Island Completion Bonus (50 XP + Unique Island Badge — one-time!)
    let islandBonusXp = 0;
    let earnedBadge = null;
    if (island && !this.state.badges.includes(island.badgeId)) {
      const islLevels = ALL_LEVELS.filter((l) => l.islandId === island.id);
      const allDone = islLevels.every((l) => !!this.state.completedLevels[l.id]);
      if (allDone) {
        islandBonusXp = 50;
        earnedBadge = island;
        this.state.badges.push(island.badgeId);
      }
    }

    const xpAwarded = firstClearXp + perfectXp + islandBonusXp;
    const starDelta = Math.max(0, starsEarned - prev.bestStars);
    this.state.totalStars += starDelta;
    this.state.explorerXp += xpAwarded;

    let newCollectible = false;
    if (collectibleId && !this.state.collectibles.includes(collectibleId)) {
      this.state.collectibles.push(collectibleId);
      newCollectible = true;
    }

    this._saveLocal();

    if (this.supabase && this.userId) {
      try {
        await this.supabase.rpc('claim_papi_treasure_level', {
          p_level_id: levelId,
          p_stars: starsEarned,
          p_is_perfect: isPerfect,
          p_collectible_id: collectibleId || null
        });
      } catch (_) {}
    }

    return {
      xpAwarded,
      firstClearXp,
      perfectXp,
      islandBonusXp,
      earnedBadge,
      isReplay: !isFirstClear,
      isPerfect,
      newCollectible,
      totalXp: this.state.explorerXp,
      totalStars: this.state.totalStars
    };
  }
}
