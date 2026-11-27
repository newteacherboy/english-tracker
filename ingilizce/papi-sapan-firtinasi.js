/* Papi Sapan Fırtınası — Diji-Medu 3D Angry Birds-Style Word Physics Game */
(() => {
  'use strict';
  if (window.dmSapanFirtinasi) return;

  // Launch date: 30 Kasım 2026, akşam 17:00 (Europe/Istanbul, UTC+3)
  const LAUNCH_AT_MS = Date.parse('2026-11-30T17:00:00+03:00');
  const FREE_DAILY_LIMIT = 2;

  const FALLBACK_WORDS = [
    { en: 'cat', tr: 'kedi', diff: 1 },
    { en: 'dog', tr: 'köpek', diff: 1 },
    { en: 'red', tr: 'kırmızı', diff: 1 },
    { en: 'book', tr: 'kitap', diff: 1.2 },
    { en: 'apple', tr: 'elma', diff: 1.3 },
    { en: 'water', tr: 'su', diff: 1.4 },
    { en: 'school', tr: 'okul', diff: 1.8 },
    { en: 'garden', tr: 'bahçe', diff: 2.0 },
    { en: 'library', tr: 'kütüphane', diff: 2.8 },
    { en: 'canteen', tr: 'kantin', diff: 2.8 },
    { en: 'notebook', tr: 'defter', diff: 3.0 },
    { en: 'umbrella', tr: 'şemsiye', diff: 3.3 },
    { en: 'backpack', tr: 'sırt çantası', diff: 3.6 },
    { en: 'playground', tr: 'oyun alanı', diff: 4.0 },
    { en: 'waterfall', tr: 'şelale', diff: 4.3 },
    { en: 'compass', tr: 'pusula', diff: 4.5 },
    { en: 'treasure', tr: 'hazine', diff: 4.7 },
    { en: 'adventure', tr: 'macera', diff: 5.2 },
    { en: 'science lab', tr: 'fen laboratuvarı', diff: 5.8 },
    { en: 'experiment', tr: 'deney', diff: 6.2 },
    { en: 'invention', tr: 'icat', diff: 6.6 },
    { en: 'recycling', tr: 'geri dönüşüm', diff: 7.0 },
    { en: 'achievement', tr: 'başarı', diff: 7.5 },
    { en: 'destination', tr: 'varış noktası', diff: 8.0 }
  ];

  const imgPapi = new Image(); imgPapi.src = 'premium-assets/sapan-firtinasi/papi.webp';
  const imgTarget = new Image(); imgTarget.src = 'premium-assets/sapan-firtinasi/target.webp';

  /* ===== ACCOUNT, LAUNCH GATE, QUOTA & MEMBERSHIP ===== */
  const who = () => (typeof aktifOgrenciAdi !== 'undefined' ? String(aktifOgrenciAdi || '').trim() : '');
  const accountKey = () => (who() || 'guest').toLocaleLowerCase('tr-TR');

  function isIrmakAccount() {
    const raw = who().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').trim();
    return raw === 'irmak' || raw.startsWith('irmak ');
  }

  function isLaunchOpen() {
    return Date.now() >= LAUNCH_AT_MS || isIrmakAccount();
  }

  function launchRemainingParts() {
    const diff = Math.max(0, LAUNCH_AT_MS - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { diff, d, h, m, s };
  }

  function launchLabel() {
    if (Date.now() >= LAUNCH_AT_MS) return '';
    if (isIrmakAccount()) return 'Erken Erişim · Irmak';
    const { d, h, m } = launchRemainingParts();
    if (d > 0) return `Lansman: 30 Kasım 17:00 (${d}g ${h}s)`;
    if (h > 0) return `Lansman: 30 Kasım 17:00 (${h}s ${m}dk)`;
    return `Lansman: 30 Kasım 17:00 (${Math.max(1, m)}dk)`;
  }

  function istanbulDay() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function isPremium() {
    if (window.dmTeacherPortalMode) return true;
    try {
      if (typeof yo !== 'undefined' && yo?.premium) return true;
      const tier = window.dmProgression?.status?.()?.membership_tier || window.dmMembershipTier || '';
      if (tier === 'pro' || tier === 'premium_pro') return true;
    } catch {}
    return false;
  }

  function quotaKey() {
    return 'dm.sapanFirtinasi.q.v1:' + encodeURIComponent(accountKey()) + ':' + istanbulDay();
  }
  function readQuota() {
    try {
      const d = JSON.parse(localStorage.getItem(quotaKey()) || 'null');
      if (d && Number.isFinite(d.used)) {
        const adGrants = Number.isFinite(d.adGrants) ? Math.max(0, d.adGrants) : 0;
        return { used: Math.max(0, d.used), adGrants };
      }
    } catch {}
    return { used: 0, adGrants: 0 };
  }
  function writeQuota(q) {
    try { localStorage.setItem(quotaKey(), JSON.stringify(q)); } catch {}
    window.dmGamesUI?.refresh?.();
  }
  function freeRemaining() {
    const q = readQuota();
    const totalAllowed = FREE_DAILY_LIMIT + (q.adGrants || 0);
    return Math.max(0, totalAllowed - q.used);
  }
  function hasFreeQuota() {
    if (!isLaunchOpen()) return true; // Keep visible with Lansman badge until launch
    if (isPremium()) return true;
    return freeRemaining() > 0;
  }

  /* ===== SUPABASE WORD BANK — PROGRESSIVE DIFFICULTY (BASIC -> ADVANCED) ===== */
  let sortedBank = null;
  let sortedBankLen = 0;

  function cefrWeight(val) {
    const s = String(val || '').toUpperCase();
    if (s.includes('A1')) return 2;
    if (s.includes('A2')) return 4;
    if (s.includes('B1')) return 6.2;
    if (s.includes('B2')) return 8;
    if (s.includes('C1') || s.includes('C2')) return 9.5;
    return 0;
  }

  function getProgressiveBank() {
    const raw = Array.isArray(window.masterKelimeHavuzu) ? window.masterKelimeHavuzu : [];
    if (!raw.length) return FALLBACK_WORDS;
    if (sortedBank && sortedBankLen === raw.length) return sortedBank;

    const seen = new Set();
    const list = [];
    for (const item of raw) {
      const en = String(item?.ingilizce || item?.en || item?.english || '').trim();
      const tr = String(item?.turkce || item?.tr || item?.turkish || '').trim();
      if (!en || !tr || en.length > 24 || tr.length > 22) continue;
      const key = en.toLocaleLowerCase('en');
      if (seen.has(key)) continue;
      seen.add(key);

      const grade = Number(item?.sinif || item?.class_no || item?.grade || 0);
      const unit = Number(item?.unite || item?.unit_no || item?.unit || 1);
      const cw = cefrWeight(item?.seviye || item?.cefr || item?.level);
      const baseGrade = grade > 0 ? Math.min(12, grade) : (cw || 5);
      const diff = baseGrade * 1.15 + Math.min(12, Math.max(0, unit)) * 0.08 + en.length * 0.11 + (en.includes(' ') ? 0.65 : 0);
      list.push({ en, tr, diff, grade });
    }
    if (list.length < 6) return FALLBACK_WORDS;
    list.sort((a, b) => a.diff - b.diff);
    sortedBank = list;
    sortedBankLen = raw.length;
    return sortedBank;
  }

  function pickProgressiveWordSet(stageIdx, usedSet) {
    const bank = getProgressiveBank();
    const n = bank.length;
    // Progressive difficulty window: starts at the easiest 12% and climbs smoothly per tower
    const startFrac = Math.min(0.78, stageIdx * 0.11);
    const endFrac = Math.min(1.0, startFrac + 0.22);
    const lo = Math.floor(n * startFrac);
    const hi = Math.max(lo + 8, Math.ceil(n * endFrac));
    let slice = bank.slice(lo, Math.min(n, hi)).filter(w => !usedSet.has(w.en.toLocaleLowerCase('en')));
    if (slice.length < 3) {
      slice = bank.filter(w => !usedSet.has(w.en.toLocaleLowerCase('en')));
    }
    if (slice.length < 3) {
      usedSet.clear();
      slice = bank.slice(lo, Math.min(n, hi));
    }
    const correct = slice[Math.floor(Math.random() * slice.length)];
    usedSet.add(correct.en.toLocaleLowerCase('en'));

    // Pick 2 distinct wrong meanings from nearby difficulty tier
    const nearLo = Math.max(0, lo - 12);
    const nearHi = Math.min(n, hi + 12);
    const distractors = bank.slice(nearLo, nearHi)
      .filter(w => w.en !== correct.en && w.tr.toLocaleLowerCase('tr-TR') !== correct.tr.toLocaleLowerCase('tr-TR'))
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
    const diffLabel = stageIdx <= 1 ? 'TEMEL SEVİYE' : stageIdx <= 3 ? 'ORTA SEVİYE' : stageIdx <= 5 ? 'İLERİ SEVİYE' : 'USTA SEVİYE';
    return { correct, options, diffLabel };
  }

  /* ===== AUDIO ENGINE ===== */
  let audioCtx = null, muted = false;
  function ensureAudio() {
    if (muted) return null;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function playTone(freq, freqEnd, dur, type = 'sine', vol = 0.13) {
    const ac = ensureAudio(); if (!ac) return;
    const now = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, now);
    if (freqEnd !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(now); o.stop(now + dur);
  }
  const sfxStretch = r => playTone(165 + r * 145, 195 + r * 165, 0.05, 'triangle', 0.055);
  const sfxLaunch = () => { playTone(220, 620, 0.22, 'sine', 0.15); playTone(140, 320, 0.18, 'triangle', 0.09); };
  const sfxTurbo = () => { playTone(380, 1180, 0.24, 'sawtooth', 0.10); playTone(600, 1400, 0.18, 'sine', 0.12); };
  const sfxWood = () => playTone(185, 85, 0.09, 'square', 0.075);
  const sfxGlass = () => { playTone(1250, 1950, 0.09, 'sine', 0.085); playTone(980, 1540, 0.12, 'triangle', 0.065); };
  const sfxBoom = () => { playTone(130, 36, 0.34, 'sawtooth', 0.17); playTone(95, 28, 0.38, 'triangle', 0.15); };
  const sfxWin = () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => playTone(f, f * 1.01, 0.22, 'triangle', 0.13), i * 80));
  const sfxWrong = () => playTone(260, 175, 0.22, 'sawtooth', 0.095);

  function speakWord(text) {
    if (muted || !text) return;
    try {
      if (typeof window.sharedVoiceSpeak === 'function') { window.sharedVoiceSpeak(text, 'en-US'); return; }
      if (typeof window.sesliOku === 'function') { window.sesliOku(text); return; }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = 0.94;
        window.speechSynthesis.speak(u);
      }
    } catch {}
  }

  /* ===== WORLD & PHYSICS CONFIG (SINGLE-SCREEN LANDSCAPE VIEW) ===== */
  const WORLD_W = 1160;
  const WORLD_H = 660;
  const GROUND_Y = 592;
  const SLING_X = 185;
  const SLING_Y = GROUND_Y - 122;
  const MAX_PULL = 124;
  const GRAVITY = 940;
  const LAUNCH_POWER = 8.4;

  let root = null, canvas = null, ctx = null, rafId = 0, toastTimer = 0, cdInterval = 0;
  let viewW = 800, viewH = 600, dpr = 1, scale = 1, camX = 0, baseCamX = 0, targetCamX = 0, camOffsetY = 0;
  let portraitBlocked = false;

  const state = {
    active: false, paused: false, stage: 0, xp: 0, wordsCorrect: 0, blocksSmashed: 0,
    streak: 0, bestStreak: 0, shotsLeft: 3, stageCleared: false, stageTimer: 0,
    hitstop: 0, shake: 0, time: 0, usedWords: new Set(),
    currentWord: FALLBACK_WORDS[0], diffLabel: 'TEMEL SEVİYE',
    bird: { x: SLING_X, y: SLING_Y, vx: 0, vy: 0, r: 28, angle: 0, phase: 'ready', turboUsed: false, settleTimer: 0, trail: [], squash: 0 },
    pullTick: 0, blocks: [], targets: [], particles: [], floats: [],
    clouds: Array.from({ length: 7 }, (_, i) => ({ x: i * 210 + Math.random() * 60, y: 68 + (i % 3) * 52, s: 0.72 + (i % 3) * 0.22, v: 9 + (i % 4) * 3.5 })),
    motes: Array.from({ length: 22 }, () => ({ x: Math.random() * WORLD_W, y: 110 + Math.random() * 420, r: 1.8 + Math.random() * 2.4, ph: Math.random() * Math.PI * 2 }))
  };

  function checkOrientation() {
    if (!root) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    portraitBlocked = state.active && isPortrait;
    root.querySelector('#sfRotateOverlay')?.classList.toggle('show', portraitBlocked);
  }

  function resize() {
    if (!canvas) return;
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    // Fit BOTH slingshot (left) AND full tower + answer labels (right) on ONE screen
    scale = Math.min(viewW / WORLD_W, viewH / WORLD_H);
    baseCamX = -(viewW / scale - WORLD_W) / 2;
    camX = baseCamX;
    targetCamX = baseCamX;
    camOffsetY = viewH - GROUND_Y * scale - Math.max(14, viewH * 0.035);
    checkOrientation();
  }

  function screenToWorld(sx, sy) {
    return { x: (sx / scale) + camX, y: (sy - camOffsetY) / scale };
  }

  /* ===== DOM OVERLAY ===== */
  function ensureOverlay() {
    if (root && root.isConnected) return root;
    root = document.createElement('div');
    root.id = 'dmSapanFirtinasiOverlay';
    root.hidden = true;
    root.innerHTML = `
      <!-- LANSMAN GERİ SAYIM EKRANI (30 Kasım 17:00 öncesi, Irmak dışı) -->
      <section class="sf-screen sf-hidden" id="sfLaunchScreen">
        <div class="sf-intro-hero">
          <img src="premium-assets/sapan-firtinasi/cover.webp" alt="Papi Sapan Fırtınası">
          <div class="sf-hero-badge">
            <b>Papi <span>Sapan Fırtınası</span></b>
            <small>Çok yakında DijiMedu'da!</small>
          </div>
          <button type="button" class="sf-close-circle" data-sf-close aria-label="Kapat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="sf-intro-sheet">
          <div class="sf-launch-box">
            <span class="sf-launch-pill">BÜYÜK LANSMAN · 30 KASIM 17:00</span>
            <h2>Papi Sapanını Hazırlıyor!</h2>
            <p>Yeni 3D fiziksel kelime oyunu <strong>30 Kasım Pazartesi akşam 17:00'da</strong> tüm öğrenciler için yayına açılıyor.</p>
            <div class="sf-countdown-grid">
              <div class="sf-cd-unit"><b id="sfCdD">00</b><small>GÜN</small></div>
              <div class="sf-cd-unit"><b id="sfCdH">00</b><small>SAAT</small></div>
              <div class="sf-cd-unit"><b id="sfCdM">00</b><small>DAKİKA</small></div>
              <div class="sf-cd-unit"><b id="sfCdS">00</b><small>SANİYE</small></div>
            </div>
          </div>
          <div class="sf-foot">
            <button type="button" class="sf-btn-coral sf-shimmer-btn" data-sf-close>Tamam, Lansmanı Bekliyorum!</button>
          </div>
        </div>
      </section>

      <!-- GİRİŞ A -->
      <section class="sf-screen" id="sfIntroScreen">
        <div class="sf-intro-hero">
          <img src="premium-assets/sapan-firtinasi/cover.webp" alt="Papi Sapan Fırtınası">
          <div class="sf-hero-badge">
            <b>Papi <span>Sapan Fırtınası</span></b>
            <small>Nişan al, fırlat, kelime kulelerini yık!</small>
          </div>
          <span class="sf-vip-pill" id="sfVipPill" hidden>Erken Erişim · Irmak</span>
          <button type="button" class="sf-close-circle" data-sf-close aria-label="Kapat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="sf-intro-sheet">
          <div class="sf-rules">
            <div class="sf-rule">
              <div class="sf-rule-ico" style="background:#e0f2fe;color:#0284c7">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>
              </div>
              <div><b>Sapanı Ger ve Doğru Kelimeyi Vur</b><small>Temel kelimelerden başlar, her kulede kelimeler ve kuleler büyür!</small></div>
            </div>
            <div class="sf-rule">
              <div class="sf-rule-ico" style="background:#fef3c7;color:#d97706">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
              </div>
              <div><b>Havada Dokun: Süper Turbo!</b><small>Uçarken ekrana dokun, hızlanıp ahşap, cam ve taş kuleleri parçala!</small></div>
            </div>
            <div class="sf-rule">
              <div class="sf-rule-ico" style="background:#dcfce7;color:#15803d">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>
              </div>
              <div><b>Her Doğru Kelime +5 XP</b><small>TNT kutularını patlat (+3 XP), yükselen kuleleri devir!</small></div>
            </div>
          </div>
          <div class="sf-foot">
            <div class="sf-quota-row">
              <span id="sfQuotaLabel">Bugünkü ücretsiz hak</span>
              <strong id="sfQuotaValue">2 / 2</strong>
            </div>
            <button type="button" class="sf-btn-coral sf-shimmer-btn" id="sfStartBtn">
              <svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              <span id="sfStartText">Fırlatmaya Başla</span>
            </button>
            <button type="button" class="sf-btn-prem sf-shimmer-btn" id="sfIntroPremBtn">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/></svg>
              Premium Pro ile Sınırsız Oyna
            </button>
          </div>
        </div>
      </section>

      <!-- GAME SCREEN -->
      <section class="sf-screen sf-hidden" id="sfGameScreen">
        <canvas id="sfCanvas"></canvas>
        <div class="sf-hud">
          <div class="sf-hud-row">
            <div class="sf-hud-pill">
              <svg viewBox="0 0 24 24" fill="#f59e0b"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
              <div><div class="sf-hud-val" id="sfXp">0</div><div class="sf-hud-lbl">XP</div></div>
            </div>
            <div class="sf-hud-pill">
              <svg viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2c.5 3.5-2 5.5-2 8a4 4 0 0 0 8 0c0-3-2-5-2.5-6.5 2.5 1 5 4.2 5 8A8.5 8.5 0 1 1 6.5 6.2C7.8 4.4 9.8 3 12 2z"/></svg>
              <div><div class="sf-hud-val" id="sfStreak">0</div><div class="sf-hud-lbl">SERİ</div></div>
            </div>
            <div class="sf-hud-pill">
              <svg viewBox="0 0 24 24" fill="#0284c7"><path d="M12 2 2 7l10 5 10-5-10-5zm0 9L2 6v6l10 5 10-5V6l-10 5zm0 6-10-5v4l10 5 10-5v-4l-10 5z"/></svg>
              <div><div class="sf-hud-val" id="sfStage">Kule 1</div><div class="sf-hud-lbl">SEVİYE</div></div>
            </div>
            <div class="sf-spacer"></div>
            <button type="button" class="sf-icon-btn" id="sfCamBtn" aria-label="Sapana dön">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button type="button" class="sf-icon-btn" id="sfMuteBtn" aria-label="Sesi aç/kapat">
              <svg id="sfMuteIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
            <button type="button" class="sf-icon-btn" id="sfPauseBtn" aria-label="Duraklat">
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>
            </button>
          </div>
          <div class="sf-word-banner">
            <div class="sf-shots-badge" id="sfShotsBadge">
              <span class="sf-shot-dot"></span><span class="sf-shot-dot"></span><span class="sf-shot-dot"></span>
            </div>
            <div class="sf-word-center">
              <div class="sf-word-sub" id="sfWordSub">TEMEL SEVİYE · DOĞRU KELİMEYİ VUR</div>
              <div class="sf-word-main" id="sfTargetWord">library</div>
            </div>
            <button type="button" class="sf-speak-btn" id="sfSpeakBtn" aria-label="Tekrar dinle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
          </div>
          <div class="sf-toast" id="sfToast">+5 XP · Tam İsabet!</div>
        </div>
        <div class="sf-hint" id="sfHint">Papi'yi geriye çekip bırak · Havada dokun: Süper Turbo!</div>
        <div class="sf-modal" id="sfPauseModal">
          <div class="sf-modal-card">
            <h3>Oyun Duraklatıldı</h3>
            <p>Hazır olduğunda kaldığın kuleden devam et.</p>
            <div style="display:grid;gap:9px">
              <button type="button" class="sf-btn-coral sf-shimmer-btn" id="sfResumeBtn">Devam Et</button>
              <button type="button" class="sf-btn-secondary" id="sfQuitBtn">Oyundan Çık</button>
            </div>
          </div>
        </div>
        <div class="sf-rotate-overlay" id="sfRotateOverlay" role="alert">
          <div class="sf-rotate-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="2" width="12" height="20" rx="2.5"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <h3>Telefonunu Yatay Çevir</h3>
          <p>Sapanı ve kuledeki Türkçe cevapları tek ekranda net görebilmek için ekranını yatay konuma çevir.</p>
          <button type="button" class="sf-btn-secondary" style="max-width:210px" data-sf-close>Oyundan Çık</button>
        </div>
      </section>

      <!-- SONUÇ A -->
      <section class="sf-screen sf-hidden" id="sfEndScreen">
        <div class="sf-end-inner">
          <div class="sf-end-top">
            <span class="sf-end-tag">PAPİ SAPAN FIRTINASI</span>
            <button type="button" class="sf-end-close" data-sf-close aria-label="Kapat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <img class="sf-end-mascot" src="premium-assets/sapan-firtinasi/papi.webp" alt="Süper Papi">
          <h2 class="sf-end-title" id="sfEndTitle">Harika Atışlar!</h2>
          <p class="sf-end-sub" id="sfEndSub">Kuleleri yıkıp kelimeleri fethettin!</p>
          <div class="sf-gold-card">
            <small>KAZANDIĞIN SKOR</small>
            <strong id="sfEndScore">+0 XP · 0 KELİME</strong>
          </div>
          <div class="sf-stats-grid">
            <div class="sf-stat-box"><b id="sfEndTowers">0</b><small>Kule</small></div>
            <div class="sf-stat-box"><b id="sfEndBlocks">0</b><small>Blok Yıkıldı</small></div>
            <div class="sf-stat-box"><b id="sfEndStreak">0</b><small>En İyi Seri</small></div>
          </div>
          <div class="sf-end-actions">
            <button type="button" class="sf-btn-coral sf-shimmer-btn" id="sfReplayBtn">
              <svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              <span id="sfReplayText">Tekrar Oyna</span>
            </button>
            <button type="button" class="sf-btn-prem sf-shimmer-btn" id="sfEndPremBtn">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/></svg>
              Premium Pro ile Sınırsız Oyna
            </button>
          </div>
        </div>
      </section>
    `;
    document.body.append(root);
    canvas = root.querySelector('#sfCanvas');
    ctx = canvas.getContext('2d');

    root.querySelectorAll('[data-sf-close]').forEach(b => { b.onclick = close; });
    root.querySelector('#sfStartBtn').onclick = handlePlayClick;
    root.querySelector('#sfReplayBtn').onclick = handlePlayClick;
    const openPlans = () => {
      close();
      if (window.DMSatis?.planlar) window.DMSatis.planlar('premium-oyunlar', 'premium_pro');
      else if (window.dmAndroidBilling?.open) window.dmAndroidBilling.open('premium-oyunlar');
      else window.magazaAc?.();
    };
    root.querySelector('#sfIntroPremBtn').onclick = openPlans;
    root.querySelector('#sfEndPremBtn').onclick = openPlans;
    root.querySelector('#sfPauseBtn').onclick = togglePause;
    root.querySelector('#sfResumeBtn').onclick = togglePause;
    root.querySelector('#sfQuitBtn').onclick = close;
    root.querySelector('#sfSpeakBtn').onclick = () => speakWord(state.currentWord.en);
    root.querySelector('#sfCamBtn').onclick = () => { targetCamX = baseCamX; };
    root.querySelector('#sfMuteBtn').onclick = () => {
      muted = !muted;
      root.querySelector('#sfMuteIco').style.opacity = muted ? '0.35' : '1';
    };

    bindCanvasInput();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    return root;
  }

  function syncButtons() {
    if (!root) return;
    const prem = isPremium();
    const rem = freeRemaining();
    const qLbl = root.querySelector('#sfQuotaLabel');
    const qVal = root.querySelector('#sfQuotaValue');
    const sBtn = root.querySelector('#sfStartBtn');
    const sTxt = root.querySelector('#sfStartText');
    const rBtn = root.querySelector('#sfReplayBtn');
    const rTxt = root.querySelector('#sfReplayText');

    root.querySelector('#sfIntroPremBtn').hidden = prem;
    root.querySelector('#sfEndPremBtn').hidden = prem;
    root.querySelector('#sfVipPill').hidden = !(Date.now() < LAUNCH_AT_MS && isIrmakAccount());

    if (prem) {
      qLbl.textContent = 'Üyelik durumu';
      qVal.textContent = 'Sınırsız Hak';
      sBtn.classList.remove('sf-ad-mode'); sTxt.textContent = 'Fırlatmaya Başla';
      rBtn.classList.remove('sf-ad-mode'); rTxt.textContent = 'Tekrar Oyna';
    } else if (rem > 0) {
      qLbl.textContent = 'Bugünkü ücretsiz hak';
      qVal.textContent = `${rem} / ${FREE_DAILY_LIMIT}`;
      sBtn.classList.remove('sf-ad-mode'); sTxt.textContent = 'Fırlatmaya Başla';
      rBtn.classList.remove('sf-ad-mode'); rTxt.textContent = 'Tekrar Oyna';
    } else {
      qLbl.textContent = 'Bugünkü ücretsiz hak';
      qVal.textContent = `0 / ${FREE_DAILY_LIMIT}`;
      sBtn.classList.add('sf-ad-mode'); sTxt.textContent = 'Ücretsiz Reklam İzle · +1 Hak Kazan';
      rBtn.classList.add('sf-ad-mode'); rTxt.textContent = 'Ücretsiz Reklam İzle · +1 Hak Kazan';
    }
  }

  let adBusy = false;
  async function watchRewardedAdThenPlay() {
    if (adBusy) return;
    adBusy = true;
    const sTxt = root?.querySelector('#sfStartText');
    const rTxt = root?.querySelector('#sfReplayText');
    if (sTxt) sTxt.textContent = 'Reklam hazırlanıyor…';
    if (rTxt) rTxt.textContent = 'Reklam hazırlanıyor…';
    try {
      // 1. Primary Diji-Medu Android & iOS 1.1+ AdMob Rewarded Bridge
      if (typeof window.dmAndroidAds?.show === 'function' && window.dmAndroidPlacements?.rewardEnabled?.() !== false && !window.dmAndroidIsTeacher?.()) {
        const result = await window.dmAndroidAds.show('energy');
        if (result?.test) throw Error('Test reklamları oyun hakkı kazandırmaz.');
        if (!result?.completed) throw Error('Reklamı tamamladığında +1 sapan hakkı kazanırsın.');
        if (typeof result.energy === 'number') {
          window.genelEnerjiKalan = result.energy;
          window.headerEnerjiGoster?.(result.energy, window.genelEnerjiMax || 25);
        }
        const q = readQuota(); q.adGrants = (q.adGrants || 0) + 1; writeQuota(q);
        startGame();
        return;
      }
      // 2. Legacy iOS AdMob Rewarded Bridge
      if (typeof window.DijiReklam?.odulluIzle === 'function' && window.DijiReklam.reklamGosterilsinMi?.()) {
        const res = await window.DijiReklam.odulluIzle('enerji');
        if (res && res.ok !== false) {
          const q = readQuota(); q.adGrants = (q.adGrants || 0) + 1; writeQuota(q);
          startGame();
          return;
        }
        throw Error('Reklam tamamlanamadı. Tekrar deneyebilirsin.');
      }
      // 3. Web browser fallback
      window.yoToast?.('Ödüllü reklamlar mobil uygulamada açılır. Sınırsız oynamak için Premium Pro paketlerine göz atabilirsin.');
    } catch (e) {
      window.yoToast?.(e?.message || 'Reklam şu anda açılamadı. Tekrar deneyebilirsin.');
    } finally {
      adBusy = false;
      syncButtons();
    }
  }

  function handlePlayClick() {
    if (!isLaunchOpen()) { showLaunchScreen(); return; }
    if (isPremium() || freeRemaining() > 0) startGame();
    else void watchRewardedAdThenPlay();
  }

  function showToast(msg, kind = 'good') {
    const el = root?.querySelector('#sfToast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'sf-toast show ' + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1550);
  }

  function updateHud() {
    if (!root) return;
    root.querySelector('#sfXp').textContent = state.xp;
    root.querySelector('#sfStreak').textContent = state.streak;
    root.querySelector('#sfStage').textContent = `Kule ${state.stage + 1}`;
    root.querySelector('#sfWordSub').textContent = `${state.diffLabel} · DOĞRU KELİMEYİ VUR`;
    root.querySelector('#sfTargetWord').textContent = state.currentWord.en;
    const dots = root.querySelectorAll('#sfShotsBadge .sf-shot-dot');
    dots.forEach((d, idx) => d.classList.toggle('used', idx >= state.shotsLeft));
  }

  /* ===== ESCALATING, GROWING TOWER BLUEPRINTS ===== */
  function makeBlock(x, y, w, h, mat = 'wood') {
    const props = {
      wood:  { hp: 56, mass: 1.2 },
      glass: { hp: 25, mass: 0.7 },
      stone: { hp: 112, mass: 2.3 },
      tnt:   { hp: 18, mass: 1.0 }
    }[mat] || { hp: 56, mass: 1.2 };
    return { x, y, w, h, mat, hp: props.hp, maxHp: props.hp, mass: props.mass, vx: 0, vy: 0, angle: 0, omega: 0, alive: true, hurtFlash: 0 };
  }

  function makeTarget(x, y, wordObj, isCorrect) {
    return { x, y, r: 27, vx: 0, vy: 0, angle: 0, omega: 0, word: wordObj, isCorrect, alive: true, bobPhase: Math.random() * Math.PI * 2, dizzy: 0 };
  }

  function buildStage(stageIdx) {
    state.blocks = [];
    state.targets = [];
    state.stageCleared = false;
    state.stageTimer = 0;
    state.shotsLeft = 3;

    const { correct, options, diffLabel } = pickProgressiveWordSet(stageIdx, state.usedWords);
    state.currentWord = correct;
    state.diffLabel = diffLabel;

    const base = 850;
    const G = GROUND_Y;
    const addB = (dx, botOffset, w, h, mat) => state.blocks.push(makeBlock(base + dx, G - botOffset - h / 2, w, h, mat));
    const addT = (dx, botOffset, optIdx) => {
      const w = options[optIdx] || correct;
      state.targets.push(makeTarget(base + dx, G - botOffset - 27, w, w.en === correct.en));
    };

    if (stageIdx === 0) {
      // Kule 1: Ferah 2 bölmeli ahşap-cam başlangıç kulesi
      addB(-120, 0, 22, 102, 'wood'); addB(0, 0, 22, 102, 'wood'); addB(120, 0, 22, 102, 'wood');
      addB(-60, 102, 138, 20, 'wood'); addB(60, 102, 138, 20, 'wood');
      addB(-55, 122, 20, 84, 'glass'); addB(55, 122, 20, 84, 'glass');
      addB(0, 206, 136, 18, 'wood');
      addT(-60, 0, 0); addT(60, 0, 1); addT(0, 122, 2);
    } else if (stageIdx === 1) {
      // Kule 2: İkiz Kule + Cam Köprü + TNT
      addB(-145, 0, 22, 108, 'wood'); addB(-45, 0, 22, 108, 'wood'); addB(-95, 108, 124, 20, 'wood');
      addB(45, 0, 22, 108, 'wood'); addB(145, 0, 22, 108, 'wood'); addB(95, 108, 124, 20, 'wood');
      addB(0, 0, 44, 44, 'tnt');
      addB(0, 128, 170, 20, 'glass');
      addB(-48, 148, 20, 82, 'glass'); addB(48, 148, 20, 82, 'glass');
      addB(0, 230, 122, 18, 'wood');
      addT(-95, 0, 0); addT(95, 0, 1); addT(0, 148, 2);
    } else if (stageIdx === 2) {
      // Kule 3: 3 Katlı Basamaklı Piramit + TNT Çekirdek
      addB(-160, 0, 24, 98, 'stone'); addB(-48, 0, 22, 98, 'wood'); addB(48, 0, 22, 98, 'wood'); addB(160, 0, 24, 98, 'stone');
      addB(-104, 98, 136, 20, 'wood'); addB(104, 98, 136, 20, 'wood'); addB(0, 98, 80, 20, 'glass');
      addB(0, 0, 44, 44, 'tnt');
      addB(-76, 118, 20, 90, 'glass'); addB(76, 118, 20, 90, 'glass');
      addB(0, 208, 176, 20, 'wood');
      addB(-44, 228, 20, 74, 'wood'); addB(44, 228, 20, 74, 'wood');
      addB(0, 302, 112, 18, 'glass');
      addT(-104, 0, 0); addT(104, 0, 1); addT(0, 228, 2);
    } else if (stageIdx === 3) {
      // Kule 4: Taş Surlu 3 Katlı Kale + Çatı TNT
      addB(-150, 0, 26, 110, 'stone'); addB(-32, 0, 22, 110, 'glass'); addB(32, 0, 22, 110, 'glass'); addB(150, 0, 26, 110, 'stone');
      addB(-91, 110, 142, 22, 'wood'); addB(91, 110, 142, 22, 'wood');
      addB(-92, 132, 22, 90, 'wood'); addB(0, 132, 22, 90, 'stone'); addB(92, 132, 22, 90, 'wood');
      addB(-46, 222, 116, 20, 'glass'); addB(46, 222, 116, 20, 'glass');
      addB(0, 242, 44, 44, 'tnt');
      addB(-58, 242, 20, 82, 'wood'); addB(58, 242, 20, 82, 'wood');
      addB(0, 324, 144, 18, 'wood');
      addT(-91, 0, 0); addT(91, 0, 1); addT(0, 342, 2);
    } else if (stageIdx === 4) {
      // Kule 5: 4 Katlı Gök Hisarı + Çift TNT
      addB(-168, 0, 26, 108, 'stone'); addB(-56, 0, 22, 108, 'wood'); addB(56, 0, 22, 108, 'wood'); addB(168, 0, 26, 108, 'stone');
      addB(-112, 108, 136, 20, 'wood'); addB(0, 108, 94, 20, 'glass'); addB(112, 108, 136, 20, 'wood');
      addB(0, 0, 44, 44, 'tnt');
      addB(-104, 128, 22, 92, 'glass'); addB(104, 128, 22, 92, 'glass');
      addB(0, 220, 232, 20, 'wood');
      addB(-66, 240, 22, 84, 'stone'); addB(66, 240, 22, 84, 'stone');
      addB(0, 324, 156, 20, 'glass');
      addB(0, 240, 42, 42, 'tnt');
      addT(-112, 0, 0); addT(112, 128, 1); addT(0, 344, 2);
    } else {
      // Kule 6+ (Seviye yükseldikçe büyüyen ve değişen dinamik yüksek kuleler!)
      const extraFloors = Math.min(2, Math.floor((stageIdx - 5) / 2));
      const stories = 3 + extraFloors;
      const armor = stageIdx % 2 === 0 ? 'stone' : 'wood';
      const inner = stageIdx % 2 === 0 ? 'glass' : 'stone';
      const stepH = 92;

      // Ground reinforced floor
      addB(-172, 0, 26, stepH, 'stone');
      addB(-58, 0, 22, stepH, inner);
      addB(58, 0, 22, stepH, inner);
      addB(172, 0, 26, stepH, 'stone');
      addB(-115, stepH, 138, 20, 'wood');
      addB(0, stepH, 98, 20, 'glass');
      addB(115, stepH, 138, 20, 'wood');
      addB(0, 0, 44, 44, 'tnt');

      let curY = stepH + 20;
      let span = 128;
      for (let fl = 1; fl < stories; fl++) {
        const matP = fl % 2 === 1 ? armor : 'glass';
        const matRoof = fl % 2 === 1 ? 'wood' : 'glass';
        const h = fl === stories - 1 ? 78 : 84;
        addB(-span, curY, 22, h, matP);
        addB(span, curY, 22, h, matP);
        if (fl === 1 && stories >= 4) addB(0, curY, 42, 42, 'tnt');
        addB(0, curY + h, span * 2 + 28, 19, matRoof);
        curY += h + 19;
        span = Math.max(54, span - 28);
      }

      // Place 3 targets across ground, mid, and high penthouse!
      addT(-115, 0, 0);
      addT(115, stepH + 20, 1);
      addT(0, curY, 2);
    }

    resetBird();
    updateHud();
    setTimeout(() => speakWord(correct.en), 240);
  }

  function resetBird() {
    const b = state.bird;
    b.x = SLING_X; b.y = SLING_Y; b.vx = 0; b.vy = 0;
    b.angle = 0; b.phase = 'ready';
    b.turboUsed = false; b.settleTimer = 0; b.trail = []; b.squash = 0;
    targetCamX = baseCamX;
  }

  /* ===== PARTICLES & COMBAT ===== */
  function spawnBurst(x, y, color, count = 14, speed = 260, shape = 'circle') {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.85);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90,
        r: 3.5 + Math.random() * 5.2, color, shape,
        angle: Math.random() * 6, omega: (Math.random() - 0.5) * 14,
        life: 0.45 + Math.random() * 0.45, maxLife: 0.9
      });
    }
  }
  function addFloat(x, y, text, color = '#ffe066') {
    state.floats.push({ x, y, text, color, life: 1.05, maxLife: 1.05 });
  }

  function triggerTNT(blk) {
    blk.alive = false;
    state.blocksSmashed++;
    state.xp += 3;
    updateHud();
    sfxBoom();
    state.shake = Math.max(state.shake, 14);
    state.hitstop = 0.04;
    spawnBurst(blk.x, blk.y, '#ff6b35', 22, 420, 'circle');
    spawnBurst(blk.x, blk.y, '#ffe066', 18, 360, 'rect');
    addFloat(blk.x, blk.y - 24, 'BOOM! +3 XP', '#ffe066');

    const radius = 205;
    for (const o of state.blocks) {
      if (!o.alive) continue;
      const dx = o.x - blk.x, dy = o.y - blk.y;
      const d = Math.hypot(dx, dy);
      if (d < radius && d > 1) {
        const f = 1 - d / radius;
        o.vx += (dx / d) * 470 * f;
        o.vy += (dy / d) * 470 * f - 165 * f;
        o.omega += (Math.random() - 0.5) * 12 * f;
        damageBlock(o, 68 * f);
      }
    }
    for (const t of state.targets) {
      if (!t.alive) continue;
      if (Math.hypot(t.x - blk.x, t.y - blk.y) < radius) hitTarget(t, 60);
    }
  }

  function damageBlock(blk, dmg) {
    if (!blk.alive) return;
    blk.hp -= dmg;
    blk.hurtFlash = 0.14;
    if (blk.mat === 'tnt' && blk.hp <= 0) { triggerTNT(blk); return; }
    if (blk.hp <= 0) {
      blk.alive = false;
      state.blocksSmashed++;
      if (blk.mat === 'glass') { sfxGlass(); spawnBurst(blk.x, blk.y, '#bae6fd', 14, 290, 'rect'); }
      else if (blk.mat === 'stone') { sfxWood(); spawnBurst(blk.x, blk.y, '#94a3b8', 14, 240, 'rect'); }
      else { sfxWood(); spawnBurst(blk.x, blk.y, '#d97706', 14, 270, 'rect'); }
    }
  }

  function hitTarget(t, impact) {
    if (!t.alive || state.stageCleared) return;
    if (t.isCorrect) {
      t.alive = false;
      state.stageCleared = true;
      state.stageTimer = 1.55;
      state.wordsCorrect++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.xp += 5;
      state.shake = Math.max(state.shake, 9);
      state.hitstop = 0.035;
      sfxWin();
      spawnBurst(t.x, t.y, '#ffe066', 24, 380, 'circle');
      spawnBurst(t.x, t.y, '#34d399', 18, 320, 'rect');
      spawnBurst(t.x, t.y, '#38bdf8', 14, 290, 'circle');
      addFloat(t.x, t.y - 36, '+5 XP · DOĞRU!', '#34d399');
      showToast(`+5 XP · "${t.word.tr}" Tam İsabet!`, 'good');
      updateHud();
    } else if (impact > 18) {
      t.dizzy = 1.2;
      t.vy = -130;
      t.vx += (Math.random() - 0.5) * 90;
      state.streak = 0;
      sfxWrong();
      spawnBurst(t.x, t.y, '#fda4af', 10, 180, 'circle');
      addFloat(t.x, t.y - 36, 'Yanlış kelime!', '#fda4af');
      showToast(`"${t.word.tr}" yanlış! Doğru kelimeyi hedefle`, 'bad');
      updateHud();
    }
  }

  /* ===== INPUT ===== */
  let dragging = false;
  function bindCanvasInput() {
    canvas.addEventListener('pointerdown', e => {
      if (!state.active || state.paused || state.stageCleared) return;
      ensureAudio();
      const b = state.bird;
      if (b.phase === 'flying' && !b.turboUsed) {
        b.turboUsed = true;
        const sp = Math.hypot(b.vx, b.vy);
        const nx = sp > 10 ? b.vx / sp : 1;
        const ny = sp > 10 ? b.vy / sp : 0.1;
        b.vx = nx * Math.max(sp * 1.72, 780);
        b.vy = ny * Math.max(sp * 1.55, 220) - 48;
        b.squash = 0.35;
        state.shake = Math.max(state.shake, 6);
        sfxTurbo();
        spawnBurst(b.x, b.y, '#ffe066', 18, 260, 'circle');
        spawnBurst(b.x, b.y, '#38bdf8', 12, 220, 'circle');
        addFloat(b.x, b.y - 36, 'SÜPER TURBO!', '#38bdf8');
        return;
      }
      if (b.phase !== 'ready') return;
      const p = screenToWorld(e.clientX, e.clientY);
      if (Math.hypot(p.x - SLING_X, p.y - SLING_Y) < 98) {
        dragging = true;
        b.phase = 'pulling';
        root.querySelector('#sfHint')?.classList.add('fade');
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (!dragging || state.bird.phase !== 'pulling') return;
      const p = screenToWorld(e.clientX, e.clientY);
      let dx = p.x - SLING_X, dy = p.y - SLING_Y;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_PULL) { dx = (dx / dist) * MAX_PULL; dy = (dy / dist) * MAX_PULL; }
      state.bird.x = SLING_X + dx;
      state.bird.y = SLING_Y + dy;
      state.bird.angle = Math.atan2(-dy, -dx) * 0.45;
      if (Math.abs(dist - state.pullTick) > 22) {
        state.pullTick = dist;
        sfxStretch(dist / MAX_PULL);
      }
    });

    const releasePull = () => {
      if (!dragging) return;
      dragging = false;
      const b = state.bird;
      const dx = SLING_X - b.x, dy = SLING_Y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 22) { b.x = SLING_X; b.y = SLING_Y; b.phase = 'ready'; b.angle = 0; return; }
      b.vx = dx * LAUNCH_POWER;
      b.vy = dy * LAUNCH_POWER;
      b.phase = 'flying';
      b.squash = 0.28;
      state.shotsLeft = Math.max(0, state.shotsLeft - 1);
      updateHud();
      sfxLaunch();
      spawnBurst(SLING_X, SLING_Y, '#ffffff', 8, 120, 'circle');
    };
    canvas.addEventListener('pointerup', releasePull);
    canvas.addEventListener('pointercancel', releasePull);
  }

  /* ===== PHYSICS LOOP ===== */
  function stepPhysics(dt) {
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 36);
    if (state.hitstop > 0) { state.hitstop -= dt; return; }

    for (const c of state.clouds) {
      c.x += c.v * dt;
      if (c.x > WORLD_W + 180) c.x = -180;
    }

    const b = state.bird;
    if (b.squash > 0) b.squash = Math.max(0, b.squash - dt * 2.4);

    if (b.phase === 'flying') {
      b.vy += GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle = Math.atan2(b.vy, Math.max(40, b.vx)) * 0.65;
      if (state.time % 0.032 < dt) {
        b.trail.push({ x: b.x, y: b.y, r: b.turboUsed ? 6.5 : 4.2, turbo: b.turboUsed });
        if (b.trail.length > 34) b.trail.shift();
      }
      targetCamX = baseCamX;

      if (b.y + b.r > GROUND_Y) {
        b.y = GROUND_Y - b.r;
        b.vy = -b.vy * 0.44;
        b.vx *= 0.72;
        if (Math.abs(b.vy) > 95) spawnBurst(b.x, GROUND_Y, '#86efac', 6, 130, 'circle');
      }
      if (b.x > WORLD_W + 80 || b.x < -80 || (Math.hypot(b.vx, b.vy) < 42 && b.y >= GROUND_Y - b.r - 4)) {
        b.settleTimer += dt;
        if (b.settleTimer > 0.72 || b.x > WORLD_W + 80) {
          b.phase = 'settled';
          setTimeout(() => {
            if (!state.active || state.stageCleared) return;
            if (state.shotsLeft > 0) resetBird();
            else {
              showToast(`Doğru cevap: "${state.currentWord.tr}"`, 'info');
              setTimeout(() => { if (state.active) showEndScreen(); }, 1100);
            }
          }, 480);
        }
      }
    }

    if (b.phase === 'flying') {
      for (const blk of state.blocks) {
        if (!blk.alive) continue;
        const hw = blk.w / 2, hh = blk.h / 2;
        const cx = Math.max(blk.x - hw, Math.min(b.x, blk.x + hw));
        const cy = Math.max(blk.y - hh, Math.min(b.y, blk.y + hh));
        const dx = b.x - cx, dy = b.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < b.r * b.r) {
          const d = Math.sqrt(d2) || 0.001;
          const nx = dx / d, ny = dy / d;
          const overlap = b.r - d;
          const sp = Math.hypot(b.vx, b.vy);
          const dmg = sp * (b.turboUsed ? 0.20 : 0.118);

          blk.vx += (b.vx * 0.62) / blk.mass;
          blk.vy += (b.vy * 0.45 - 65) / blk.mass;
          blk.omega += ((b.y - blk.y) * b.vx * 0.00018) / blk.mass;
          damageBlock(blk, dmg);

          if (!blk.alive && (b.turboUsed || sp > 520)) {
            b.vx *= 0.84; b.vy *= 0.86;
            state.shake = Math.max(state.shake, 7);
          } else {
            b.x += nx * overlap; b.y += ny * overlap;
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0) {
              b.vx -= 1.42 * vn * nx; b.vy -= 1.42 * vn * ny;
              b.vx *= 0.72; b.vy *= 0.72;
            }
            if (sp > 200) { sfxWood(); state.shake = Math.max(state.shake, 5); }
          }
        }
      }

      for (const t of state.targets) {
        if (!t.alive) continue;
        const dx = b.x - t.x, dy = b.y - t.y;
        const d = Math.hypot(dx, dy);
        if (d < b.r + t.r) {
          hitTarget(t, Math.hypot(b.vx, b.vy) * 0.25);
          if (!t.isCorrect) {
            const nx = dx / (d || 1), ny = dy / (d || 1);
            b.vx = nx * 240; b.vy = ny * 240 - 90;
          }
        }
      }
    }

    for (const blk of state.blocks) {
      if (!blk.alive) continue;
      if (blk.hurtFlash > 0) blk.hurtFlash = Math.max(0, blk.hurtFlash - dt);
      blk.vy += GRAVITY * dt;
      blk.x += blk.vx * dt;
      blk.y += blk.vy * dt;
      blk.angle += blk.omega * dt;
      blk.vx *= 0.96; blk.omega *= 0.92;
      if (blk.y + blk.h / 2 > GROUND_Y) {
        const impact = Math.abs(blk.vy);
        blk.y = GROUND_Y - blk.h / 2;
        if (impact > 240) damageBlock(blk, (impact - 200) * 0.14);
        blk.vy = -blk.vy * 0.16; blk.vx *= 0.78; blk.angle *= 0.85;
      }
    }

    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < state.blocks.length; i++) {
        const a = state.blocks[i]; if (!a.alive) continue;
        for (let j = i + 1; j < state.blocks.length; j++) {
          const c = state.blocks[j]; if (!c.alive) continue;
          const ox = (a.w + c.w) / 2 - Math.abs(a.x - c.x);
          const oy = (a.h + c.h) / 2 - Math.abs(a.y - c.y);
          if (ox > 0 && oy > 0) {
            if (oy < ox) {
              const sign = a.y < c.y ? -1 : 1;
              const relVy = Math.abs(a.vy - c.vy);
              if (relVy > 220) { damageBlock(a, (relVy - 180) * 0.08); damageBlock(c, (relVy - 180) * 0.08); }
              a.y += sign * oy * 0.5; c.y -= sign * oy * 0.5;
              if (sign < 0 && a.vy > 0) { a.vy = 0; a.vx *= 0.86; }
              if (sign > 0 && c.vy > 0) { c.vy = 0; c.vx *= 0.86; }
            } else {
              const sign = a.x < c.x ? -1 : 1;
              a.x += sign * ox * 0.5; c.x -= sign * ox * 0.5;
              const avgVx = (a.vx + c.vx) * 0.5;
              a.vx = avgVx + sign * 8; c.vx = avgVx - sign * 8;
            }
          }
        }
      }
    }

    for (const t of state.targets) {
      if (!t.alive) continue;
      if (t.dizzy > 0) t.dizzy = Math.max(0, t.dizzy - dt);
      t.vy += GRAVITY * dt;
      t.x += t.vx * dt; t.y += t.vy * dt;
      t.vx *= 0.92;
      if (t.y + t.r > GROUND_Y) {
        if (Math.abs(t.vy) > 290 && t.isCorrect) hitTarget(t, 45);
        t.y = GROUND_Y - t.r; t.vy = 0;
      }
      for (const blk of state.blocks) {
        if (!blk.alive) continue;
        const hw = blk.w / 2, hh = blk.h / 2;
        const cx = Math.max(blk.x - hw, Math.min(t.x, blk.x + hw));
        const cy = Math.max(blk.y - hh, Math.min(t.y, blk.y + hh));
        const dx = t.x - cx, dy = t.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < t.r * t.r) {
          const d = Math.sqrt(d2) || 0.001;
          const overlap = t.r - d;
          t.x += (dx / d) * overlap; t.y += (dy / d) * overlap;
          if (dy < 0 && t.vy > 0) t.vy = 0;
          const blkSp = Math.hypot(blk.vx, blk.vy);
          if (blkSp > 195 && t.isCorrect) hitTarget(t, blkSp * 0.22);
        }
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }
      p.vy += 640 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.omega * dt;
    }
    for (let i = state.floats.length - 1; i >= 0; i--) {
      const f = state.floats[i];
      f.life -= dt; f.y -= 48 * dt;
      if (f.life <= 0) state.floats.splice(i, 1);
    }

    camX += (targetCamX - camX) * Math.min(1, dt * 6.5);

    if (state.stageCleared) {
      state.stageTimer -= dt;
      if (state.stageTimer <= 0) {
        state.stage++;
        buildStage(state.stage);
      }
    }
  }

  /* ===== RENDERING ===== */
  function drawSkyAndHills() {
    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    sky.addColorStop(0, '#0ea5e9');
    sky.addColorStop(0.52, '#7dd3fc');
    sky.addColorStop(0.86, '#e0f2fe');
    sky.addColorStop(1, '#fef9c3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, viewH);

    const sunX = viewW * 0.78 - camX * 0.08 * scale;
    const sunY = viewH * 0.20;
    const sunG = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 150);
    sunG.addColorStop(0, 'rgba(255,250,210,0.95)');
    sunG.addColorStop(0.35, 'rgba(254,240,138,0.45)');
    sunG.addColorStop(1, 'rgba(254,240,138,0)');
    ctx.fillStyle = sunG;
    ctx.beginPath(); ctx.arc(sunX, sunY, 150, 0, Math.PI * 2); ctx.fill();

    for (const c of state.clouds) {
      const cx = (c.x - camX * 0.25) * scale, cy = c.y * scale, s = c.s * scale;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath();
      ctx.arc(cx, cy, 26 * s, 0, Math.PI * 2);
      ctx.arc(cx + 26 * s, cy - 10 * s, 32 * s, 0, Math.PI * 2);
      ctx.arc(cx + 56 * s, cy - 2 * s, 24 * s, 0, Math.PI * 2);
      ctx.arc(cx + 24 * s, cy + 8 * s, 26 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    const gScreenY = GROUND_Y * scale + camOffsetY;
    ctx.fillStyle = '#5eead4'; ctx.globalAlpha = 0.42;
    ctx.beginPath(); ctx.moveTo(0, gScreenY);
    for (let x = 0; x <= viewW + 120; x += 120) {
      const wx = x + camX * 0.32 * scale;
      const h = 105 + Math.sin(wx * 0.004) * 52 + Math.cos(wx * 0.009) * 30;
      ctx.lineTo(x, gScreenY - h * scale);
    }
    ctx.lineTo(viewW, viewH); ctx.lineTo(0, viewH); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    const hillG = ctx.createLinearGradient(0, gScreenY - 120 * scale, 0, gScreenY + 20);
    hillG.addColorStop(0, '#4ade80'); hillG.addColorStop(1, '#16a34a');
    ctx.fillStyle = hillG;
    ctx.beginPath(); ctx.moveTo(0, gScreenY);
    for (let x = 0; x <= viewW + 80; x += 60) {
      const wx = x + camX * 0.58 * scale;
      const h = 46 + Math.sin(wx * 0.0055 + 1.2) * 32 + Math.cos(wx * 0.011) * 16;
      ctx.lineTo(x, gScreenY - h * scale);
    }
    ctx.lineTo(viewW, viewH); ctx.lineTo(0, viewH); ctx.closePath(); ctx.fill();
  }

  function drawWorld() {
    ctx.save();
    const sx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const sy = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    ctx.translate(-camX * scale + sx, camOffsetY + sy);
    ctx.scale(scale, scale);

    for (const m of state.motes) {
      const a = 0.25 + 0.35 * Math.sin(state.time * 2.2 + m.ph);
      ctx.fillStyle = `rgba(255,251,210,${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y + Math.sin(state.time + m.ph) * 8, m.r, 0, Math.PI * 2); ctx.fill();
    }

    const soilG = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 220);
    soilG.addColorStop(0, '#a16207'); soilG.addColorStop(0.25, '#854d0e'); soilG.addColorStop(1, '#451a03');
    ctx.fillStyle = soilG; ctx.fillRect(-200, GROUND_Y, WORLD_W + 500, 280);

    const grassG = ctx.createLinearGradient(0, GROUND_Y - 12, 0, GROUND_Y + 24);
    grassG.addColorStop(0, '#86efac'); grassG.addColorStop(0.45, '#22c55e'); grassG.addColorStop(1, '#15803d');
    ctx.fillStyle = grassG; ctx.fillRect(-200, GROUND_Y - 8, WORLD_W + 500, 26);

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.roundRect(665, GROUND_Y - 6, 400, 14, 6); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(669, GROUND_Y + 4, 392, 5);

    ctx.fillStyle = 'rgba(15,23,42,0.22)';
    ctx.beginPath(); ctx.ellipse(SLING_X, GROUND_Y + 2, 42, 9, 0, 0, Math.PI * 2); ctx.fill();

    drawSlingshotBack();
    if (state.bird.phase === 'pulling') drawTrajectory();

    for (const tr of state.bird.trail) {
      ctx.fillStyle = tr.turbo ? 'rgba(255,224,102,0.78)' : 'rgba(255,255,255,0.72)';
      ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill();
    }

    for (const blk of state.blocks) { if (blk.alive) drawBlock(blk); }
    for (const t of state.targets) { if (t.alive) drawTarget(t); }
    drawBird();
    drawSlingshotFront();

    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    for (const f of state.floats) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (f.life / f.maxLife) * 1.4);
      ctx.font = '900 22px Nunito, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(15,23,42,0.75)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSlingshotBack() {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trunkG = ctx.createLinearGradient(SLING_X - 18, 0, SLING_X + 18, 0);
    trunkG.addColorStop(0, '#92400e'); trunkG.addColorStop(0.5, '#d97706'); trunkG.addColorStop(1, '#78350f');
    ctx.strokeStyle = trunkG; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(SLING_X, GROUND_Y); ctx.lineTo(SLING_X, SLING_Y + 46); ctx.stroke();
    ctx.lineWidth = 17;
    ctx.beginPath(); ctx.moveTo(SLING_X, SLING_Y + 48); ctx.quadraticCurveTo(SLING_X + 26, SLING_Y + 24, SLING_X + 22, SLING_Y - 8); ctx.stroke();
    if (state.bird.phase === 'pulling' || state.bird.phase === 'ready') {
      ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(SLING_X + 20, SLING_Y - 6); ctx.lineTo(state.bird.x, state.bird.y + 4); ctx.stroke();
    }
    ctx.restore();
  }

  function drawSlingshotFront() {
    ctx.save(); ctx.lineCap = 'round';
    if (state.bird.phase === 'pulling' || state.bird.phase === 'ready') {
      ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 8.5;
      ctx.beginPath(); ctx.moveTo(SLING_X - 20, SLING_Y - 4); ctx.lineTo(state.bird.x - 10, state.bird.y + 4); ctx.stroke();
    }
    const prongG = ctx.createLinearGradient(SLING_X - 30, 0, SLING_X, 0);
    prongG.addColorStop(0, '#b45309'); prongG.addColorStop(0.55, '#f59e0b'); prongG.addColorStop(1, '#78350f');
    ctx.strokeStyle = prongG; ctx.lineWidth = 17;
    ctx.beginPath(); ctx.moveTo(SLING_X, SLING_Y + 48); ctx.quadraticCurveTo(SLING_X - 28, SLING_Y + 24, SLING_X - 22, SLING_Y - 6); ctx.stroke();
    ctx.strokeStyle = '#451a03'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(SLING_X - 28, SLING_Y - 4); ctx.lineTo(SLING_X - 15, SLING_Y - 4); ctx.stroke();
    ctx.restore();
  }

  function drawTrajectory() {
    const b = state.bird;
    const vx = (SLING_X - b.x) * LAUNCH_POWER, vy = (SLING_Y - b.y) * LAUNCH_POWER;
    ctx.save();
    for (let i = 1; i <= 18; i++) {
      const t = i * 0.065;
      const px = b.x + vx * t, py = b.y + vy * t + 0.5 * GRAVITY * t * t;
      if (py > GROUND_Y) break;
      const alpha = Math.max(0.12, 0.92 - i * 0.045);
      const r = Math.max(2.6, 6.2 - i * 0.18);
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(14,165,233,${(alpha * 0.7).toFixed(2)})`;
      ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();
  }

  function drawBlock(blk) {
    ctx.save();
    ctx.translate(blk.x, blk.y); ctx.rotate(blk.angle);
    const x = -blk.w / 2, y = -blk.h / 2;
    if (blk.mat === 'wood') {
      const g = ctx.createLinearGradient(x, y, x + blk.w, y + blk.h);
      g.addColorStop(0, '#f59e0b'); g.addColorStop(0.5, '#d97706'); g.addColorStop(1, '#92400e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, blk.w, blk.h, 5); ctx.fill();
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.24)'; ctx.fillRect(x + 3, y + 3, blk.w - 6, Math.min(6, blk.h * 0.22));
    } else if (blk.mat === 'glass') {
      const g = ctx.createLinearGradient(x, y, x + blk.w, y + blk.h);
      g.addColorStop(0, 'rgba(224,242,254,0.88)'); g.addColorStop(0.5, 'rgba(56,189,248,0.68)'); g.addColorStop(1, 'rgba(2,132,199,0.75)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, blk.w, blk.h, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + blk.w * 0.55, y + 4); ctx.lineTo(x + 4, y + blk.h * 0.55); ctx.closePath(); ctx.fill();
    } else if (blk.mat === 'stone') {
      const g = ctx.createLinearGradient(x, y, x, y + blk.h);
      g.addColorStop(0, '#cbd5e1'); g.addColorStop(0.5, '#94a3b8'); g.addColorStop(1, '#475569');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, blk.w, blk.h, 5); ctx.fill();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x + 3, y + 3, blk.w - 6, 4);
    } else if (blk.mat === 'tnt') {
      const g = ctx.createLinearGradient(x, y, x, y + blk.h);
      g.addColorStop(0, '#ff6b6b'); g.addColorStop(1, '#dc2626');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, blk.w, blk.h, 8); ctx.fill();
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.fillStyle = '#fef08a'; ctx.font = '900 13px Nunito, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TNT', 0, 1);
    }
    if (blk.hp < blk.maxHp * 0.68) {
      ctx.strokeStyle = 'rgba(15,23,42,0.52)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-blk.w * 0.2, -blk.h * 0.25); ctx.lineTo(0, 0); ctx.lineTo(blk.w * 0.22, blk.h * 0.22); ctx.stroke();
    }
    if (blk.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.beginPath(); ctx.roundRect(x, y, blk.w, blk.h, 5); ctx.fill();
    }
    ctx.restore();
  }

  function drawTarget(t) {
    const bob = Math.sin(state.time * 3.8 + t.bobPhase) * 2.5;
    const wob = t.dizzy > 0 ? Math.sin(state.time * 32) * 0.22 : Math.sin(state.time * 2.1 + t.bobPhase) * 0.04;
    ctx.save();
    ctx.translate(t.x, t.y + bob); ctx.rotate(wob);
    const sz = t.r * 2.28;
    if (imgTarget.complete && imgTarget.naturalWidth > 0) ctx.drawImage(imgTarget, -sz / 2, -sz / 2, sz, sz);
    else { ctx.fillStyle = '#2dd4bf'; ctx.beginPath(); ctx.arc(0, 0, t.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();

    ctx.save();
    const label = t.word.tr;
    ctx.font = '900 15px Nunito, sans-serif';
    const tw = ctx.measureText(label).width;
    const pw = Math.max(76, tw + 22), ph = 28;
    const bx = t.x - pw / 2, by = t.y - t.r - 40 + bob * 0.6;
    ctx.fillStyle = 'rgba(8,47,73,0.22)'; ctx.beginPath(); ctx.roundRect(bx, by + 3, pw, ph, 14); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(bx, by, pw, ph, 14); ctx.fill();
    ctx.strokeStyle = t.dizzy > 0 ? '#ef4444' : '#0284c7'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(t.x - 6, by + ph - 1); ctx.lineTo(t.x + 6, by + ph - 1); ctx.lineTo(t.x, by + ph + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, t.x, by + ph / 2 + 0.5);
    ctx.restore();
  }

  function drawBird() {
    const b = state.bird;
    if (b.phase === 'settled') return;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.angle);
    ctx.scale(1 + b.squash * 0.35, 1 - b.squash * 0.25);
    if (b.turboUsed && b.phase === 'flying') {
      const aura = ctx.createRadialGradient(0, 0, 12, 0, 0, 48);
      aura.addColorStop(0, 'rgba(255,224,102,0.72)'); aura.addColorStop(0.6, 'rgba(56,189,248,0.35)'); aura.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.fill();
    }
    const sz = b.r * 2.55;
    if (imgPapi.complete && imgPapi.naturalWidth > 0) ctx.drawImage(imgPapi, -sz / 2, -sz / 2, sz, sz);
    else { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  let lastTs = 0;
  function loop(ts) {
    if (!state.active) return;
    rafId = requestAnimationFrame(loop);
    if (state.paused || portraitBlocked) { lastTs = ts; return; }
    const dt = Math.min(0.032, (ts - (lastTs || ts)) / 1000);
    lastTs = ts;
    stepPhysics(dt);
    ctx.save();
    ctx.scale(dpr, dpr);
    drawSkyAndHills();
    drawWorld();
    ctx.restore();
  }

  /* ===== SCREENS & LIFECYCLE ===== */
  function showScreen(id) {
    if (!root) return;
    ['sfLaunchScreen', 'sfIntroScreen', 'sfGameScreen', 'sfEndScreen'].forEach(s => {
      root.querySelector('#' + s)?.classList.toggle('sf-hidden', s !== id);
    });
  }

  function showLaunchScreen() {
    ensureOverlay();
    root.hidden = false;
    showScreen('sfLaunchScreen');
    const tick = () => {
      if (isLaunchOpen()) {
        clearInterval(cdInterval);
        syncButtons();
        showScreen('sfIntroScreen');
        return;
      }
      const { d, h, m, s } = launchRemainingParts();
      const pad = v => String(v).padStart(2, '0');
      root.querySelector('#sfCdD').textContent = pad(d);
      root.querySelector('#sfCdH').textContent = pad(h);
      root.querySelector('#sfCdM').textContent = pad(m);
      root.querySelector('#sfCdS').textContent = pad(s);
    };
    tick();
    clearInterval(cdInterval);
    cdInterval = setInterval(tick, 1000);
  }

  function togglePause() {
    if (!state.active) return;
    state.paused = !state.paused;
    root.querySelector('#sfPauseModal')?.classList.toggle('open', state.paused);
  }

  function startGame() {
    ensureAudio();
    if (!isPremium()) {
      const q = readQuota();
      q.used += 1;
      writeQuota(q);
    }
    state.active = true;
    state.paused = false;
    state.stage = 0;
    state.xp = 0;
    state.wordsCorrect = 0;
    state.blocksSmashed = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.usedWords.clear();
    root.querySelector('#sfPauseModal')?.classList.remove('open');
    root.querySelector('#sfHint')?.classList.remove('fade');
    showScreen('sfGameScreen');
    try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch {}
    resize();
    buildStage(0);
    lastTs = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function showEndScreen() {
    state.active = false;
    cancelAnimationFrame(rafId);
    syncButtons();
    showScreen('sfEndScreen');
    root.querySelector('#sfEndTitle').textContent = state.wordsCorrect >= 5 ? 'Kulelerin Kahramanı!' : state.wordsCorrect >= 2 ? 'Harika Sapan Atışları!' : 'İyi Denemeydi!';
    root.querySelector('#sfEndSub').textContent = `${state.wordsCorrect} doğru kelimeyi tam isabetle vurdun!`;
    root.querySelector('#sfEndScore').textContent = `+${state.xp} XP · ${state.wordsCorrect} KELİME`;
    root.querySelector('#sfEndTowers').textContent = state.wordsCorrect;
    root.querySelector('#sfEndBlocks').textContent = state.blocksSmashed;
    root.querySelector('#sfEndStreak').textContent = state.bestStreak;
    sfxWin();
  }

  async function open() {
    ensureOverlay();
    root.hidden = false;
    document.body.classList.add('dm-solo-fullstage');
    if (!isLaunchOpen()) {
      showLaunchScreen();
      return;
    }
    if (!(window.masterKelimeHavuzu || []).length && typeof window.dijiKelimeHavuzunuYukle === 'function') {
      try { await window.dijiKelimeHavuzunuYukle(); } catch {}
    }
    syncButtons();
    showScreen('sfIntroScreen');
  }

  function close() {
    state.active = false;
    state.paused = false;
    portraitBlocked = false;
    cancelAnimationFrame(rafId);
    clearInterval(cdInterval);
    try { screen.orientation?.unlock?.(); } catch {}
    if (root) {
      root.hidden = true;
      root.querySelector('#sfPauseModal')?.classList.remove('open');
      root.querySelector('#sfRotateOverlay')?.classList.remove('show');
    }
    document.body.classList.remove('dm-solo-fullstage');
    window.dmGamesUI?.refresh?.();
  }

  window.dmSapanFirtinasi = { open, close, hasFreeQuota, isPremium, isLaunchOpen, launchLabel, isIrmakAccount };
  window.papiSapanFirtinasiAc = open;
})();
