/* Papi Dalga Sörfü — Diji-Medu English 3D Arcade Surfing Word Game */
(() => {
  'use strict';
  if (window.dmDalgaSorfu) return;

  const FALLBACK_OWN = [
    { en: 'science lab', tr: 'fen laboratuvarı' },
    { en: 'conference hall', tr: 'konferans salonu' },
    { en: 'Environment Club', tr: 'Çevre Kulübü' },
    { en: 'experiment', tr: 'deney' },
    { en: 'achievement', tr: 'başarı' },
    { en: 'celebration', tr: 'kutlama' },
    { en: 'invitation', tr: 'davetiye' },
    { en: 'destination', tr: 'varış noktası' },
    { en: 'adventure', tr: 'macera' },
    { en: 'equipment', tr: 'ekipman' },
    { en: 'biography', tr: 'biyografi' },
    { en: 'invention', tr: 'icat' },
    { en: 'habit', tr: 'alışkanlık' },
    { en: 'wildlife', tr: 'yaban hayatı' },
    { en: 'recycling', tr: 'geri dönüşüm' },
    { en: 'forecast', tr: 'hava tahmini' }
  ];
  const FALLBACK_MIX = [
    { en: 'library', tr: 'kütüphane' },
    { en: 'playground', tr: 'oyun alanı' },
    { en: 'canteen', tr: 'kantin' },
    { en: 'notebook', tr: 'defter' },
    { en: 'school bus', tr: 'okul servisi' },
    { en: 'pencil case', tr: 'kalem kutusu' },
    { en: 'homework', tr: 'ev ödevi' },
    { en: 'backpack', tr: 'sırt çantası' },
    { en: 'umbrella', tr: 'şemsiye' },
    { en: 'waterfall', tr: 'şelale' },
    { en: 'compass', tr: 'pusula' },
    { en: 'island', tr: 'ada' },
    { en: 'treasure', tr: 'hazine' },
    { en: 'rainbow', tr: 'gökkuşağı' }
  ];

  const FREE_DAILY_LIMIT = 2;
  const BASE_SPEED = 0.21;
  const MAX_SPEED = 0.44;
  const ROUND_SECONDS = 14;

  const sprites = {};
  for (const [k, src] of [
    ['log', 'premium-assets/dalga-sorfu/river-log.webp'],
    ['palm', 'premium-assets/dalga-sorfu/palm-tree.webp']
  ]) {
    const img = new Image();
    img.src = src;
    sprites[k] = img;
  }

  /* ===== ACCOUNT, QUOTA & MEMBERSHIP HELPERS ===== */
  const who = () => (typeof aktifOgrenciAdi !== 'undefined' ? String(aktifOgrenciAdi || '').trim() : '');
  const accountKey = () => (who() || 'guest').toLocaleLowerCase('tr-TR');
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
  function quotaKey() { return 'dm.dalgaSorfu.q.v1:' + encodeURIComponent(accountKey()) + ':' + istanbulDay(); }
  function readQuota() {
    try {
      const d = JSON.parse(localStorage.getItem(quotaKey()) || 'null');
      if (d && Number.isFinite(d.used)) return { used: Math.max(0, d.used), adGranted: !!d.adGranted };
    } catch {}
    return { used: 0, adGranted: false };
  }
  function writeQuota(q) {
    try { localStorage.setItem(quotaKey(), JSON.stringify(q)); } catch {}
    window.dmGamesUI?.refresh?.();
  }
  function freeRemaining() {
    const q = readQuota();
    const totalAllowed = FREE_DAILY_LIMIT + (q.adGranted ? 1 : 0);
    return Math.max(0, totalAllowed - q.used);
  }
  function canWatchAd() {
    const q = readQuota();
    return !isPremium() && freeRemaining() === 0 && !q.adGranted;
  }
  function hasFreeQuota() {
    if (isPremium()) return true;
    const q = readQuota();
    return freeRemaining() > 0 || !q.adGranted;
  }

  /* ===== LIVE WORD BANK BUILDER (2:1 STUDENT LEVEL PRIORITY + NO REPEAT) ===== */
  const sessionUsedEn = new Set();
  let levelCycleIndex = 0;
  let lastDistractorTr = '';
  let cachedPools = { owner: '', own: FALLBACK_OWN, mix: FALLBACK_MIX, all: [...FALLBACK_OWN, ...FALLBACK_MIX] };

  function buildPools() {
    const owner = accountKey();
    const raw = Array.isArray(window.masterKelimeHavuzu) ? window.masterKelimeHavuzu : [];
    if (!raw.length) return cachedPools;
    if (cachedPools.owner === owner && cachedPools.all.length > 40) return cachedPools;

    const studentGrade = Number((typeof aktifSinif !== 'undefined' && aktifSinif) || (typeof yo !== 'undefined' && yo?.sinif) || 0);
    const seen = new Set();
    const own = [];
    const mix = [];

    for (const item of raw) {
      const en = String(item?.ingilizce || item?.en || item?.english || '').trim();
      const tr = String(item?.turkce || item?.tr || item?.turkish || '').trim();
      if (!en || !tr || en.length > 26 || tr.length > 26) continue;
      const key = en.toLocaleLowerCase('en');
      if (seen.has(key)) continue;
      seen.add(key);
      const grade = Number(item?.sinif || item?.class_no || 0);
      if (studentGrade >= 1 && studentGrade <= 12 && grade === studentGrade) {
        own.push({ en, tr });
      } else {
        mix.push({ en, tr });
      }
    }

    const finalOwn = own.length >= 6 ? own : FALLBACK_OWN;
    const finalMix = mix.length >= 6 ? mix : FALLBACK_MIX;
    cachedPools = { owner, own: finalOwn, mix: finalMix, all: [...finalOwn, ...finalMix] };
    return cachedPools;
  }

  function drawUnique(pool) {
    let avail = pool.filter(w => !sessionUsedEn.has(w.en.toLocaleLowerCase('en')));
    if (!avail.length) {
      for (const w of pool) sessionUsedEn.delete(w.en.toLocaleLowerCase('en'));
      avail = pool.slice();
    }
    const picked = avail[Math.floor(Math.random() * avail.length)];
    sessionUsedEn.add(picked.en.toLocaleLowerCase('en'));
    return picked;
  }

  /* ===== SURF-POP AUDIO ENGINE + VOICE DUCKING ===== */
  let audioCtx = null, muted = false, musicGain = null, musicTimer = null, beatStep = 0;

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
      musicGain = audioCtx.createGain();
      musicGain.gain.value = muted ? 0 : 0.13;
      musicGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function playTone(freq, dur, type = 'sine', vol = 0.2, dest = null, delay = 0) {
    if (muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g);
    g.connect(dest || ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function playWaterSplash(strength = 0.14, dur = 0.18) {
    if (muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, ac.currentTime);
    filter.frequency.exponentialRampToValueAtTime(520, ac.currentTime + dur);
    filter.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(strength, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start();
  }

  const SURF_CHORDS = [
    { bass: 130.81, notes: [261.63, 329.63, 392.00, 493.88] },
    { bass: 110.00, notes: [220.00, 261.63, 329.63, 392.00] },
    { bass: 174.61, notes: [261.63, 329.63, 349.23, 440.00] },
    { bass: 196.00, notes: [246.94, 293.66, 329.63, 392.00] }
  ];
  function playSoftShaker(vol = 0.05) {
    if (muted || !audioCtx || !musicGain) return;
    const len = Math.floor(audioCtx.sampleRate * 0.045);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);
    src.connect(hp); hp.connect(g); g.connect(musicGain);
    src.start();
  }
  function playWarmPluck(freq, dur, vol) {
    if (muted || !audioCtx || !musicGain) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const lp = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(musicGain);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  function startMusic() {
    stopMusic();
    ensureAudio();
    beatStep = 0;
    musicTimer = setInterval(() => {
      if (muted || !state.running || state.paused || document.hidden) return;
      const bar = Math.floor(beatStep / 8) % SURF_CHORDS.length;
      const stepInBar = beatStep % 8;
      const ch = SURF_CHORDS[bar];
      if (stepInBar === 0 || stepInBar === 3 || stepInBar === 5) playWarmPluck(ch.bass, 0.28, 0.42);
      if (stepInBar === 2 || stepInBar === 6) ch.notes.forEach((f, idx) => setTimeout(() => playWarmPluck(f, 0.26, 0.14), idx * 14));
      if (stepInBar === 0) playWarmPluck(ch.notes[2] * 2, 0.24, 0.11);
      if (stepInBar === 4) playWarmPluck(ch.notes[3] * 2, 0.20, 0.09);
      playSoftShaker(stepInBar % 2 === 1 ? 0.14 : 0.06);
      beatStep++;
    }, 185);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
  function duckMusic(ducked) {
    if (!audioCtx || !musicGain || muted) return;
    musicGain.gain.setTargetAtTime(ducked ? 0.04 : 0.13, audioCtx.currentTime, 0.08);
  }

  const sfx = {
    carve: () => { playWaterSplash(0.11, 0.13); playTone(440, 0.06, 'sine', 0.08); },
    jump: () => { playWaterSplash(0.16, 0.16); playTone(350, 0.09, 'sine', 0.14); playTone(560, 0.14, 'sine', 0.15, null, 0.05); },
    ramp: () => {
      playWaterSplash(0.22, 0.22);
      playTone(392, 0.10, 'sine', 0.18, null, 0);
      playTone(587, 0.12, 'sine', 0.20, null, 0.06);
      playTone(880, 0.20, 'triangle', 0.20, null, 0.12);
    },
    land: () => { playWaterSplash(0.22, 0.22); },
    good: () => {
      playWaterSplash(0.14, 0.15);
      playTone(523.25, 0.12, 'sine', 0.22, null, 0);
      playTone(659.25, 0.12, 'sine', 0.22, null, 0.07);
      playTone(783.99, 0.16, 'sine', 0.24, null, 0.14);
      playTone(1046.5, 0.25, 'triangle', 0.20, null, 0.21);
    },
    shieldUp: () => {
      playTone(480, 0.10, 'sine', 0.18, null, 0);
      playTone(720, 0.14, 'sine', 0.20, null, 0.06);
      playTone(960, 0.20, 'sine', 0.18, null, 0.13);
    },
    shieldSave: () => {
      playWaterSplash(0.18, 0.18);
      playTone(320, 0.12, 'triangle', 0.16, null, 0);
      playTone(640, 0.18, 'sine', 0.20, null, 0.07);
    },
    hit: () => {
      playWaterSplash(0.24, 0.25);
      playTone(185, 0.18, 'sawtooth', 0.18, null, 0);
      playTone(125, 0.28, 'triangle', 0.22, null, 0.09);
    }
  };

  function speakWord(text) {
    if (muted || !text) return;
    duckMusic(true);
    setTimeout(() => duckMusic(false), 1200);
    try {
      if (typeof window.sharedVoiceSpeak === 'function') { window.sharedVoiceSpeak(text, 'en-US'); return; }
      if (typeof window.sesliOku === 'function') { window.sesliOku(text); return; }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = 0.94;
        u.onend = () => duckMusic(false);
        u.onerror = () => duckMusic(false);
        window.speechSynthesis.speak(u);
      }
    } catch {}
  }

  /* ===== DOM OVERLAY BUILDER (GİRİŞ A + SONUÇ A) ===== */
  let root = null, canvas = null, ctx = null, rafId = 0, toastTimer = 0;
  let touchStartX = 0, touchStartY = 0, touchMoved = false;

  const state = {
    running: false, paused: false, xp: 0, wordsCaught: 0, streak: 0, bestStreak: 0,
    timeLeft: ROUND_SECONDS, elapsed: 0, speed: BASE_SPEED, distance: 0, slope: 0,
    lane: 0, laneX: 0, tilt: 0, jumpY: 0, jumpVy: 0, rampSoar: false, spinAngle: 0, landSquash: 0,
    shieldTime: 0, shakeTime: 0, currentWord: FALLBACK_OWN[0],
    objects: [], palms: [], spray: [], particles: [], floats: [], ripples: [],
    spawnTimer: 0, wrongSinceTarget: 0, spawnsSinceShield: 0, lastLane: 0, lastFrame: 0
  };

  function ensureOverlay() {
    if (root && root.isConnected) return root;
    root = document.createElement('div');
    root.id = 'dmDalgaSorfuOverlay';
    root.hidden = true;
    root.innerHTML = `
      <!-- GİRİŞ A -->
      <section class="ds-screen" id="dsIntroScreen">
        <div class="ds-intro-hero">
          <img src="premium-assets/dalga-sorfu/cover.webp" alt="Papi Dalga Sörfü">
          <div class="ds-hero-badge">
            <b>Papi <span>Dalga Sörfü</span></b>
            <small>Dinle, kaydır, doğru nilüferi yakala</small>
          </div>
          <button type="button" class="ds-close-circle" data-ds-close aria-label="Kapat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="ds-intro-sheet">
          <div class="ds-rules">
            <div class="ds-rule">
              <div class="ds-rule-ico" style="background:#e0f2fe;color:#0284c7">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              </div>
              <div><b>Tek tek gelen kelimeleri yakala</b><small>Yanlış kelimeler engeldir — yana kay ya da zıpla!</small></div>
            </div>
            <div class="ds-rule">
              <div class="ds-rule-ico" style="background:#dcfce7;color:#15803d">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 2 4 5v6c0 5.5 3.4 10.6 8 12 4.6-1.4 8-6.5 8-12V5l-8-3z"/></svg>
              </div>
              <div><b>Baloncuk Koruma Kalkanı Topla</b><small>Suda beliren kalkan seni 1 hatadan korur.</small></div>
            </div>
            <div class="ds-rule">
              <div class="ds-rule-ico" style="background:#fef3c7;color:#d97706">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>
              </div>
              <div><b>Rampalardan uç, +5 XP kazan</b><small>Her doğru kelime +5 XP kazandırır!</small></div>
            </div>
          </div>
          <div class="ds-foot">
            <div class="ds-quota-row">
              <span id="dsQuotaLabel">Bugünkü ücretsiz hak</span>
              <strong id="dsQuotaValue">2 / 2</strong>
            </div>
            <button type="button" class="ds-btn-coral ds-shimmer-btn" id="dsStartBtn">
              <svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              <span id="dsStartText">Sörfe Başla</span>
            </button>
            <button type="button" class="ds-btn-prem ds-shimmer-btn" id="dsIntroPremBtn">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/></svg>
              Premium ile Sınırsız Oyna
            </button>
          </div>
        </div>
      </section>

      <!-- GAME SCREEN -->
      <section class="ds-screen ds-hidden" id="dsGameScreen">
        <canvas id="dsCanvas"></canvas>
        <div class="ds-hud">
          <div class="ds-hud-row">
            <div class="ds-hud-pill">
              <svg viewBox="0 0 24 24" fill="#f59e0b"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
              <div><div class="ds-hud-val" id="dsXp">0</div><div class="ds-hud-lbl">XP</div></div>
            </div>
            <div class="ds-hud-pill">
              <svg viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2c.5 3.5-2 5.5-2 8a4 4 0 0 0 8 0c0-3-2-5-2.5-6.5 2.5 1 5 4.2 5 8A8.5 8.5 0 1 1 6.5 6.2C7.8 4.4 9.8 3 12 2z"/></svg>
              <div><div class="ds-hud-val" id="dsStreak">0</div><div class="ds-hud-lbl">SERİ</div></div>
            </div>
            <div class="ds-hud-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"><path d="M3 12c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/></svg>
              <div><div class="ds-hud-val" id="dsSpeed">1.0×</div><div class="ds-hud-lbl">AKINTI</div></div>
            </div>
            <div class="ds-hud-pill ds-shield" id="dsShieldPill">
              <svg viewBox="0 0 24 24" fill="#06b6d4"><path d="M12 2 4 5v6c0 5.5 3.4 10.6 8 12 4.6-1.4 8-6.5 8-12V5l-8-3z"/></svg>
              <div><div class="ds-hud-val" id="dsShieldTime">12s</div><div class="ds-hud-lbl">KALKAN</div></div>
            </div>
            <div class="ds-spacer"></div>
            <button type="button" class="ds-icon-btn" id="dsMuteBtn" aria-label="Sesi aç/kapat">
              <svg id="dsMuteIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
            <button type="button" class="ds-icon-btn" id="dsPauseBtn" aria-label="Duraklat">
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>
            </button>
          </div>
          <div class="ds-word-banner">
            <div class="ds-timer-ring">
              <svg width="46" height="46" viewBox="0 0 46 46">
                <circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="4"/>
                <circle id="dsTimerArc" cx="23" cy="23" r="19" fill="none" stroke="#ffe066" stroke-width="4" stroke-linecap="round" stroke-dasharray="119.38" stroke-dashoffset="0"/>
              </svg>
              <div class="ds-timer-txt"><b id="dsTimer">14</b><small>sn</small></div>
            </div>
            <div class="ds-word-center">
              <div class="ds-word-sub" id="dsWordSub">SEVİYEN · DOĞRU NİLÜFERİ YAKALA</div>
              <div class="ds-word-main" id="dsWord">science lab</div>
            </div>
            <button type="button" class="ds-speak-btn" id="dsSpeakBtn" aria-label="Tekrar dinle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
          </div>
          <div class="ds-toast" id="dsToast">+1 XP · Harika!</div>
        </div>
        <div class="ds-hint" id="dsHint">Kaydır: ← → Akıntı Değiştir · ↑ Zıpla · Kalkan Topla!</div>
        <div class="ds-modal" id="dsPauseModal">
          <div class="ds-modal-card">
            <h3>Sörf Duraklatıldı</h3>
            <p>Hazır olduğunda kaldığın dalgadan devam et.</p>
            <div style="display:grid;gap:9px">
              <button type="button" class="ds-btn-coral ds-shimmer-btn" id="dsResumeBtn">Devam Et</button>
              <button type="button" class="ds-btn-secondary" id="dsQuitBtn">Oyundan Çık</button>
            </div>
          </div>
        </div>
      </section>

      <!-- SONUÇ A -->
      <section class="ds-screen ds-hidden" id="dsEndScreen">
        <div class="ds-end-inner">
          <div class="ds-end-top">
            <span class="ds-end-tag">PAPİ DALGA SÖRFÜ</span>
            <button type="button" class="ds-end-close" data-ds-close aria-label="Kapat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <img class="ds-end-mascot" src="premium-assets/dalga-sorfu/papi-end.webp" alt="Tatlı Sörfçü Papi">
          <h2 class="ds-end-title" id="dsEndTitle">Harika sörf yaptın!</h2>
          <p class="ds-end-sub" id="dsEndSub">Yeni kelimeler yakaladın!</p>
          <div class="ds-gold-card">
            <small>KAZANDIĞIN SKOR</small>
            <strong id="dsEndScore">+0 XP · 0 PUAN</strong>
          </div>
          <div class="ds-stats-grid">
            <div class="ds-stat-box"><b id="dsEndWords">0</b><small>Kelime</small></div>
            <div class="ds-stat-box"><b id="dsEndDur">0 sn</b><small>Süre</small></div>
            <div class="ds-stat-box"><b id="dsEndStreak">0</b><small>En İyi Seri</small></div>
          </div>
          <div class="ds-end-actions">
            <button type="button" class="ds-btn-coral ds-shimmer-btn" id="dsReplayBtn">
              <svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              <span id="dsReplayText">Tekrar Sörf Yap</span>
            </button>
            <button type="button" class="ds-btn-prem ds-shimmer-btn" id="dsEndPremBtn">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/></svg>
              Premium ile Sınırsız Oyna
            </button>
          </div>
        </div>
      </section>

      <!-- ÖDÜLLÜ REKLAM MODALI (Web / Yedek) -->
      <div class="ds-modal" id="dsAdModal">
        <div class="ds-modal-card">
          <h3>Ödüllü Reklam</h3>
          <p>Kısa reklam tamamlanınca yeni sörf hakkın açılacak.</p>
          <div class="ds-ad-bar"><div class="ds-ad-fill" id="dsAdFill"></div></div>
          <small style="font-weight:800;color:#536885" id="dsAdCd">3 sn kaldı</small>
        </div>
      </div>
    `;
    document.body.append(root);
    canvas = root.querySelector('#dsCanvas');
    ctx = canvas.getContext('2d');

    root.querySelectorAll('[data-ds-close]').forEach(b => b.onclick = close);
    root.querySelector('#dsStartBtn').onclick = handlePlayClick;
    root.querySelector('#dsReplayBtn').onclick = handlePlayClick;
    const openPlans = () => {
      close();
      if (window.DMSatis?.planlar) window.DMSatis.planlar('premium-oyunlar', 'premium_pro');
      else if (window.dmAndroidBilling?.open) window.dmAndroidBilling.open('premium-oyunlar');
      else window.magazaAc?.();
    };
    root.querySelector('#dsIntroPremBtn').onclick = openPlans;
    root.querySelector('#dsEndPremBtn').onclick = openPlans;
    root.querySelector('#dsPauseBtn').onclick = togglePause;
    root.querySelector('#dsResumeBtn').onclick = togglePause;
    root.querySelector('#dsQuitBtn').onclick = close;
    root.querySelector('#dsSpeakBtn').onclick = () => speakWord(state.currentWord.en);
    root.querySelector('#dsMuteBtn').onclick = () => {
      muted = !muted;
      if (musicGain && audioCtx) musicGain.gain.value = muted ? 0 : 0.13;
      root.querySelector('#dsMuteIco').style.opacity = muted ? '0.4' : '1';
    };

    canvas.addEventListener('pointerdown', e => { touchStartX = e.clientX; touchStartY = e.clientY; touchMoved = false; });
    canvas.addEventListener('pointermove', e => {
      if (touchMoved || !touchStartX) return;
      const dx = e.clientX - touchStartX, dy = e.clientY - touchStartY;
      if (Math.abs(dx) > 26 || Math.abs(dy) > 26) {
        touchMoved = true;
        if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
        else if (dy < -24) triggerJump();
      }
    });
    canvas.addEventListener('pointerup', () => { touchStartX = 0; });
    return root;
  }

  function syncButtons() {
    if (!root) return;
    const prem = isPremium();
    const rem = freeRemaining();
    const adOk = canWatchAd();
    const qLbl = root.querySelector('#dsQuotaLabel');
    const qVal = root.querySelector('#dsQuotaValue');
    const sBtn = root.querySelector('#dsStartBtn');
    const sTxt = root.querySelector('#dsStartText');
    const rBtn = root.querySelector('#dsReplayBtn');
    const rTxt = root.querySelector('#dsReplayText');

    root.querySelector('#dsIntroPremBtn').hidden = prem;
    root.querySelector('#dsEndPremBtn').hidden = prem;

    if (prem) {
      qLbl.textContent = 'Üyelik durumu';
      qVal.textContent = 'Sınırsız Hak';
      sBtn.classList.remove('ds-ad-mode'); sTxt.textContent = 'Sörfe Başla';
      rBtn.classList.remove('ds-ad-mode'); rTxt.textContent = 'Tekrar Sörf Yap';
    } else if (rem > 0) {
      qLbl.textContent = 'Bugünkü ücretsiz hak';
      qVal.textContent = `${rem} / ${FREE_DAILY_LIMIT}`;
      sBtn.classList.remove('ds-ad-mode'); sTxt.textContent = 'Sörfe Başla';
      rBtn.classList.remove('ds-ad-mode'); rTxt.textContent = 'Tekrar Sörf Yap';
    } else if (adOk) {
      qLbl.textContent = 'Bugünkü ücretsiz hak';
      qVal.textContent = `0 / ${FREE_DAILY_LIMIT}`;
      sBtn.classList.add('ds-ad-mode'); sTxt.textContent = 'Reklam İzle ve Oyna';
      rBtn.classList.add('ds-ad-mode'); rTxt.textContent = 'Reklam İzle ve Oyna';
    } else {
      qLbl.textContent = 'Bugünkü ücretsiz hak';
      qVal.textContent = `0 / ${FREE_DAILY_LIMIT}`;
      sBtn.classList.remove('ds-ad-mode'); sTxt.textContent = 'Premium Paketleri Gör';
      rBtn.classList.remove('ds-ad-mode'); rTxt.textContent = 'Premium Paketleri Gör';
    }
  }

  let adBusy = false;
  async function watchRewardedAdThenPlay() {
    if (adBusy) return;
    adBusy = true;
    const sTxt = root?.querySelector('#dsStartText');
    const rTxt = root?.querySelector('#dsReplayText');
    if (sTxt) sTxt.textContent = 'Reklam hazırlanıyor…';
    if (rTxt) rTxt.textContent = 'Reklam hazırlanıyor…';
    try {
      // 1. Primary Diji-Medu Android & iOS 1.1+ AdMob Rewarded Bridge (same as premium-play-offer.js)
      if (typeof window.dmAndroidAds?.show === 'function' && window.dmAndroidPlacements?.rewardEnabled?.() !== false && !window.dmAndroidIsTeacher?.()) {
        const result = await window.dmAndroidAds.show('energy');
        if (result?.test) throw Error('Test reklamları oyun hakkı kazandırmaz.');
        if (!result?.completed) throw Error('Reklamı tamamladığında +1 sörf hakkı kazanırsın.');
        if (typeof result.energy === 'number') {
          window.genelEnerjiKalan = result.energy;
          window.headerEnerjiGoster?.(result.energy, window.genelEnerjiMax || 25);
        }
        const q = readQuota(); q.adGranted = true; writeQuota(q);
        startGame();
        return;
      }
      // 2. Legacy iOS AdMob Rewarded Bridge (odullu-reklam.js)
      if (typeof window.DijiReklam?.odulluIzle === 'function' && window.DijiReklam.reklamGosterilsinMi?.()) {
        const res = await window.DijiReklam.odulluIzle('enerji');
        if (res && res.ok !== false) {
          const q = readQuota(); q.adGranted = true; writeQuota(q);
          startGame();
          return;
        }
        throw Error('Reklam tamamlanamadı. Tekrar deneyebilirsin.');
      }
      // 3. Web browser (AdMob native SDK unavailable)
      window.yoToast?.('Ödüllü reklamlar mobil uygulamada açılır. Sınırsız oynamak için Premium paketlere göz atabilirsin.');
    } catch (e) {
      window.yoToast?.(e?.message || 'Reklam şu anda açılamadı. Tekrar deneyebilirsin.');
    } finally {
      adBusy = false;
      syncButtons();
    }
  }

  function handlePlayClick() {
    if (isPremium() || freeRemaining() > 0) startGame();
    else if (canWatchAd()) void watchRewardedAdThenPlay();
    else {
      close();
      if (window.DMSatis?.planlar) window.DMSatis.planlar('premium-oyunlar', 'premium_pro');
      else if (window.dmAndroidBilling?.open) window.dmAndroidBilling.open('premium-oyunlar');
    }
  }

  function showToast(msg, kind = 'good') {
    const el = root?.querySelector('#dsToast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'ds-toast show ' + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1450);
  }

  function nextWord(announce = true) {
    const pools = buildPools();
    const useOwn = (levelCycleIndex % 3) < 2;
    levelCycleIndex++;
    state.currentWord = useOwn ? drawUnique(pools.own) : drawUnique(pools.mix);
    state.timeLeft = ROUND_SECONDS;
    state.wrongSinceTarget = 0;
    if (root) {
      root.querySelector('#dsWord').textContent = state.currentWord.en;
      root.querySelector('#dsWordSub').textContent = useOwn ? 'SEVİYEN · DOĞRU NİLÜFERİ YAKALA' : 'KARMA HAVUZ · DOĞRU NİLÜFERİ YAKALA';
    }
    if (announce) speakWord(state.currentWord.en);
  }

  function pickDistractor(excludeTr) {
    const pools = buildPools();
    const avail = pools.all.filter(w => w.tr !== excludeTr && w.tr !== lastDistractorTr);
    const chosen = (avail.length ? avail : pools.all)[Math.floor(Math.random() * (avail.length || pools.all.length))].tr;
    lastDistractorTr = chosen;
    return chosen;
  }

  function pickVariedLane() {
    const opts = [-1, 0, 1].filter(l => l !== state.lastLane);
    const chosen = Math.random() < 0.78 ? opts[Math.floor(Math.random() * opts.length)] : state.lastLane;
    state.lastLane = chosen;
    return chosen;
  }

  function spawnNextSingle() {
    const lane = pickVariedLane();
    state.spawnsSinceShield++;
    const targetActive = state.objects.some(o => o.type === 'buoy' && o.correct && !o.hit && o.z > 0.25);

    if (!targetActive && (state.wrongSinceTarget >= 2 || (state.wrongSinceTarget >= 1 && Math.random() < 0.52))) {
      state.wrongSinceTarget = 0;
      state.objects.push({ type: 'buoy', lane, z: 1.05, text: state.currentWord.tr, correct: true, hit: false });
      return;
    }

    // Regularly spawn the water Bubble Protection Bonus so Papi can collect it!
    if (state.shieldTime <= 0 && state.spawnsSinceShield >= 5 && Math.random() < 0.55) {
      state.spawnsSinceShield = 0;
      state.objects.push({ type: 'shield', lane, z: 1.04, hit: false });
      return;
    }

    const roll = Math.random();
    if (roll < 0.48) {
      state.wrongSinceTarget++;
      state.objects.push({ type: 'buoy', lane, z: 1.05, text: pickDistractor(state.currentWord.tr), correct: false, hit: false });
    } else if (roll < 0.68) {
      state.objects.push({ type: 'ramp', lane, z: 1.04, hit: false });
    } else if (roll < 0.88) {
      state.objects.push({ type: 'log', lane, z: 1.04, hit: false });
    } else if (state.shieldTime <= 0) {
      state.spawnsSinceShield = 0;
      state.objects.push({ type: 'shield', lane, z: 1.04, hit: false });
    } else {
      state.wrongSinceTarget++;
      state.objects.push({ type: 'buoy', lane, z: 1.05, text: pickDistractor(state.currentWord.tr), correct: false, hit: false });
    }
  }

  function initPalms() {
    state.palms = [];
    for (let i = 0; i < 18; i++) {
      state.palms.push({ side: i % 2 === 0 ? -1 : 1, z: i / 18, offset: 0.22 + Math.random() * 0.34, scale: 0.85 + Math.random() * 0.35 });
    }
  }

  function computeTargetSlope(elapsed) {
    const t = elapsed % 26;
    if (t < 11) return 0;
    if (t < 18) return 0.9;
    return -1.0;
  }

  function project(lanePos, z, w, h) {
    const horizonY = h * 0.36 - state.slope * h * 0.028;
    const bottomY = h * 0.99;
    const persp = Math.pow(1 - z, 1.82);
    const riverHalfBottom = Math.min(w * 0.48, 220);
    const riverHalfTop = Math.min(w * 0.085, 42);
    const riverHalf = riverHalfTop + (riverHalfBottom - riverHalfTop) * persp;
    const pitchY = -state.slope * Math.sin(z * Math.PI) * h * 0.032;
    const y = horizonY + (bottomY - horizonY) * persp + pitchY;
    const x = w * 0.5 + lanePos * (riverHalf * 0.63);
    const scale = 0.17 + 0.94 * persp;
    return { x, y, riverHalf, scale, persp, horizonY };
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function emitBoardSpray(px, py, scale, intensity = 1, carveDir = 0) {
    const speedRatio = state.speed / BASE_SPEED;
    const count = Math.round((3 + speedRatio * 2.4) * intensity);
    for (let i = 0; i < count; i++) {
      const side = carveDir !== 0 ? -carveDir : (Math.random() < 0.5 ? -1 : 1);
      const isDroplet = Math.random() < 0.54;
      const spreadX = side * (20 + Math.random() * 68 * intensity) + (Math.random() - 0.5) * 20;
      const shootY = isDroplet ? (-32 - Math.random() * 72 * intensity) : (48 + Math.random() * 60 * speedRatio);
      state.spray.push({
        x: px + (Math.random() - 0.5) * 24 * scale, y: py + (12 + Math.random() * 8) * scale,
        vx: spreadX * scale, vy: shootY * scale,
        r: (isDroplet ? (2.0 + Math.random() * 3.0) : (4.2 + Math.random() * 5.8)) * scale,
        grow: isDroplet ? 0 : 18 * scale, gravity: isDroplet ? 340 : 58, droplet: isDroplet,
        color: isDroplet ? (Math.random() < 0.55 ? '#ffffff' : '#bae6fd') : 'rgba(255,255,255,0.88)',
        life: isDroplet ? (0.30 + Math.random() * 0.22) : (0.34 + Math.random() * 0.20), maxLife: 0.52
      });
    }
  }

  function spawnBurst(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const spd = 75 + Math.random() * 150;
      state.particles.push({
        x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 70,
        size: 3.5 + Math.random() * 4.5, color, life: 0.52 + Math.random() * 0.26, maxLife: 0.75
      });
    }
  }

  /* ===== REAR-VIEW ANIMATED 3D PAPI ON SURFBOARD ===== */
  function drawAnimated3DPapi(c, x, y, scale, tilt, jumpY, phase, hasShield) {
    c.save();
    if (jumpY < 10) {
      const wakeAlpha = Math.max(0, 1 - jumpY / 10);
      const speedBoost = 0.8 + (state.speed / BASE_SPEED) * 0.45;
      const wOff = Math.sin(phase * 3.2) * 3.2 * scale;
      c.save(); c.globalAlpha = 0.68 * wakeAlpha;
      const wg = c.createLinearGradient(x, y, x, y + 66 * scale);
      wg.addColorStop(0, 'rgba(255,255,255,0.94)'); wg.addColorStop(0.55, 'rgba(186,230,253,0.45)'); wg.addColorStop(1, 'rgba(186,230,253,0)');
      c.fillStyle = wg;
      c.beginPath();
      c.moveTo(x - 16 * scale, y + 6 * scale); c.lineTo(x + 16 * scale, y + 6 * scale);
      c.lineTo(x + (54 * speedBoost) * scale - wOff, y + 66 * scale); c.lineTo(x - (54 * speedBoost) * scale + wOff, y + 66 * scale);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.92)'; c.lineWidth = 4.2 * scale; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - 14 * scale, y + 8 * scale); c.quadraticCurveTo(x - 32 * scale, y + 32 * scale, x - 52 * scale + wOff, y + 58 * scale);
      c.moveTo(x + 14 * scale, y + 8 * scale); c.quadraticCurveTo(x + 32 * scale, y + 32 * scale, x + 52 * scale - wOff, y + 58 * scale);
      c.stroke(); c.restore();
    }

    const sh = Math.max(0.36, 1 - jumpY * 0.0036);
    c.fillStyle = 'rgba(6, 40, 66, 0.30)';
    c.beginPath(); c.ellipse(x, y + 12 * scale, 42 * scale * sh, 12 * scale * sh, 0, 0, Math.PI * 2); c.fill();

    const waveBob = jumpY > 1 ? 0 : Math.sin(phase * 2.8) * 3.2 * scale;
    const sx = 1 + state.landSquash * 0.16, sy = 1 - state.landSquash * 0.14;
    const breathe = Math.sin(phase * 3.5) * 0.025, airborne = jumpY > 5;

    c.translate(x, y - jumpY * scale - waveBob);
    c.rotate(tilt * 0.24 + state.spinAngle);
    c.scale(scale * sx, scale * sy);

    // 3D Glossy Coral & Gold Surfboard
    c.save(); c.rotate(tilt * 0.14);
    c.fillStyle = '#9f1d2c'; c.beginPath(); c.ellipse(0, 10, 38, 13, 0, 0, Math.PI * 2); c.fill();
    const bg = c.createLinearGradient(-34, -4, 34, 14);
    bg.addColorStop(0, '#ff6b7a'); bg.addColorStop(0.5, '#e53e4f'); bg.addColorStop(1, '#c52737');
    c.fillStyle = bg; c.strokeStyle = '#fff'; c.lineWidth = 2.6;
    c.beginPath(); c.ellipse(0, 6, 37, 12.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#f5b92a'; c.beginPath(); c.ellipse(0, 6, 26, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.42)'; c.beginPath(); c.ellipse(-10, 2.5, 16, 2.4, -0.05, 0, Math.PI * 2); c.fill();
    c.restore();

    // Wagging Tail
    const tailWag = Math.sin(phase * 4.5) * 0.16 - tilt * 0.25;
    c.save(); c.translate(0, -10); c.rotate(tailWag);
    c.fillStyle = '#0284c7';
    c.beginPath(); c.moveTo(-10, -2); c.quadraticCurveTo(-14, 12, -5, 16); c.lineTo(0, 12); c.lineTo(5, 16); c.quadraticCurveTo(14, 12, 10, -2); c.closePath(); c.fill();
    c.restore();

    // Feet
    const kneeFlex = Math.sin(phase * 2.8) * 1.5;
    c.fillStyle = '#f59e0b'; c.strokeStyle = '#b45309'; c.lineWidth = 1.6;
    for (const fx of [-11, 11]) { c.beginPath(); c.ellipse(fx, 2 + kneeFlex * 0.4, 8.5, 4.5, fx < 0 ? -0.15 : 0.15, 0, Math.PI * 2); c.fill(); c.stroke(); }

    // Flapping Wings
    const flapSpeed = airborne ? 11 : 4.2, flapAmp = airborne ? 0.52 : 0.22;
    const drawWing = (side, angle) => {
      c.save(); c.translate(side * 24, -30 + kneeFlex); c.rotate(angle);
      const wg = c.createRadialGradient(side * 10, -4, 3, side * 14, 2, 24);
      wg.addColorStop(0, '#67e8f9'); wg.addColorStop(0.55, '#06b6d4'); wg.addColorStop(1, '#0284c7');
      c.fillStyle = wg; c.strokeStyle = '#0369a1'; c.lineWidth = 1.8;
      c.beginPath(); c.ellipse(side * 14, 0, 19, 9.5, side * -0.15, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#a5f3fc'; c.beginPath(); c.ellipse(side * 12, -3, 10, 3.2, side * -0.15, 0, Math.PI * 2); c.fill();
      c.restore();
    };
    drawWing(-1, -0.35 + Math.sin(phase * flapSpeed) * flapAmp + tilt * 0.32);
    drawWing(1, 0.35 - Math.sin(phase * flapSpeed) * flapAmp + tilt * 0.32);

    // Chubby 3D Back Body
    c.save(); c.translate(0, -28 + kneeFlex); c.scale(1 + breathe, 1 - breathe);
    const bodyG = c.createRadialGradient(-10, -14, 5, 0, 0, 36);
    bodyG.addColorStop(0, '#67f3ff'); bodyG.addColorStop(0.52, '#14b8d4'); bodyG.addColorStop(0.88, '#0284c7'); bodyG.addColorStop(1, '#0369a1');
    c.fillStyle = bodyG; c.beginPath(); c.ellipse(0, 0, 27, 26, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(207,250,254,0.30)'; c.beginPath(); c.ellipse(0, -4, 15, 10, 0, 0, Math.PI * 2); c.fill();
    c.restore();

    // Rear-View Head + Coral Crest + Goggle Strap & Buckle
    const headTurnX = tilt * 6, headBob = Math.sin(phase * 3.5 + 0.6) * 1.8;
    c.save(); c.translate(headTurnX * 0.35, -56 + kneeFlex + headBob); c.rotate(tilt * 0.14);
    if (Math.abs(tilt) > 0.12) {
      const side = tilt > 0 ? 1 : -1;
      c.fillStyle = '#ea580c'; c.beginPath(); c.ellipse(side * 24, 5, 6, 4.5, side * 0.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fde047'; c.strokeStyle = '#ca8a04'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(side * 25, -4, 5.5, 8.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    const crestBounce = Math.sin(phase * 5.2) * 0.16 - tilt * 0.24;
    c.save(); c.translate(0, -24); c.rotate(crestBounce);
    c.fillStyle = '#f43f5e';
    c.beginPath(); c.ellipse(-7, -7, 6.5, 12, -0.35, 0, Math.PI * 2); c.ellipse(2, -10, 7, 14, 0.08, 0, Math.PI * 2); c.ellipse(10, -6, 5.5, 10, 0.42, 0, Math.PI * 2); c.fill();
    c.restore();

    const headG = c.createRadialGradient(-8, -12, 4, 0, 0, 30);
    headG.addColorStop(0, '#7df9ff'); headG.addColorStop(0.55, '#1cc5dc'); headG.addColorStop(1, '#0284c7');
    c.fillStyle = headG; c.beginPath(); c.arc(0, 0, 26, 0, Math.PI * 2); c.fill();

    c.fillStyle = '#e53e4f'; c.strokeStyle = '#9f1239'; c.lineWidth = 1.4;
    roundRect(c, -26.5, -7, 53, 8.5, 4); c.fill(); c.stroke();
    c.fillStyle = '#fde047'; c.strokeStyle = '#ca8a04'; c.lineWidth = 1.5;
    roundRect(c, -7.5, -9, 15, 12.5, 4); c.fill(); c.stroke();
    c.fillStyle = '#fde047';
    roundRect(c, -27.5, -9.5, 6, 13, 3); c.fill();
    roundRect(c, 21.5, -9.5, 6, 13, 3); c.fill();
    c.restore();

    // Active Shield Bubble Aura
    if (hasShield) {
      const pulse = 1 + Math.sin(performance.now() * 0.007) * 0.045;
      c.save(); c.translate(0, -44);
      const rad = 58 * pulse;
      const sg = c.createRadialGradient(-rad * 0.3, -rad * 0.3, rad * 0.1, 0, 0, rad);
      sg.addColorStop(0, 'rgba(255,255,255,0.45)'); sg.addColorStop(0.55, 'rgba(56,189,248,0.16)'); sg.addColorStop(1, 'rgba(34,211,238,0.55)');
      c.fillStyle = sg; c.strokeStyle = 'rgba(186,230,253,0.96)'; c.lineWidth = 3.2;
      c.beginPath(); c.arc(0, 0, rad, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(-rad * 0.34, -rad * 0.36, rad * 0.18, rad * 0.1, -0.6, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.restore();
  }

  function drawLevelWordBuoy(c, x, y, scale, text) {
    c.save();
    const bob = Math.sin(performance.now() * 0.0038 + x * 0.04) * 2.5;
    c.translate(x, y + bob * scale); c.scale(scale, scale);

    const rip = (performance.now() * 0.001 + x * 0.01) % 1;
    c.strokeStyle = `rgba(255,255,255,${(1 - rip) * 0.55})`; c.lineWidth = 2.4;
    c.beginPath(); c.ellipse(0, 7, 64 + rip * 22, 16 + rip * 6, 0, 0, Math.PI * 2); c.stroke();

    c.fillStyle = 'rgba(8,47,73,0.26)'; c.beginPath(); c.ellipse(0, 9, 62, 16, 0, 0, Math.PI * 2); c.fill();
    const padG = c.createRadialGradient(-16, 0, 6, 0, 5, 60);
    padG.addColorStop(0, '#86efac'); padG.addColorStop(0.55, '#22c55e'); padG.addColorStop(1, '#15803d');
    c.fillStyle = padG; c.strokeStyle = '#14532d'; c.lineWidth = 2.5;
    c.beginPath(); c.ellipse(0, 4, 58, 15, 0, 0.22, Math.PI * 2 - 0.12); c.lineTo(0, 4); c.closePath(); c.fill(); c.stroke();

    c.fillStyle = '#92400e'; c.fillRect(-10, -14, 20, 18);

    const bw = 132, bh = 58, bx = -bw / 2, by = -bh - 10;
    c.fillStyle = '#78350f'; roundRect(c, bx, by + 5, bw, bh, 15); c.fill();
    const woodG = c.createLinearGradient(0, by, 0, by + bh);
    woodG.addColorStop(0, '#f59e0b'); woodG.addColorStop(0.5, '#d97706'); woodG.addColorStop(1, '#92400e');
    c.fillStyle = woodG; c.strokeStyle = '#78350f'; c.lineWidth = 2.5;
    roundRect(c, bx, by, bw, bh, 15); c.fill(); c.stroke();

    c.fillStyle = '#fef08a';
    for (const [rx, ry] of [[bx + 8, by + 8], [bx + bw - 8, by + 8], [bx + 8, by + bh - 8], [bx + bw - 8, by + bh - 8]]) {
      c.beginPath(); c.arc(rx, ry, 3.2, 0, Math.PI * 2); c.fill();
    }
    const innerG = c.createLinearGradient(0, by + 6, 0, by + bh - 6);
    innerG.addColorStop(0, '#ffffff'); innerG.addColorStop(1, '#fef9ee');
    c.fillStyle = innerG; roundRect(c, bx + 7, by + 7, bw - 14, bh - 14, 10); c.fill();

    c.fillStyle = '#f472b6';
    c.beginPath(); c.ellipse(-36, 4, 9, 5, -0.3, 0, Math.PI * 2); c.ellipse(-28, 4, 9, 5, 0.3, 0, Math.PI * 2); c.ellipse(-32, 1, 7, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fde047'; c.beginPath(); c.arc(-32, 3, 3.2, 0, Math.PI * 2); c.fill();

    c.fillStyle = '#132844'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const maxW = bw - 22, words = text.split(' ');
    if (text.length > 12 && words.length > 1) {
      const mid = Math.ceil(words.length / 2);
      c.font = '900 15px Nunito, sans-serif';
      c.fillText(words.slice(0, mid).join(' '), 0, by + bh / 2 - 8.5, maxW);
      c.fillText(words.slice(mid).join(' '), 0, by + bh / 2 + 9.5, maxW);
    } else {
      c.font = '900 17.5px Nunito, sans-serif';
      c.fillText(text, 0, by + bh / 2 + 1, maxW);
    }
    c.restore();
  }

  function drawWaterRamp(c, x, y, scale) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    c.fillStyle = 'rgba(255,255,255,0.72)'; c.beginPath(); c.ellipse(0, 8, 56, 14, 0, 0, Math.PI * 2); c.fill();
    const rg = c.createLinearGradient(0, -34, 0, 10);
    rg.addColorStop(0, '#ffcf4a'); rg.addColorStop(0.45, '#f59e0b'); rg.addColorStop(1, '#e53e4f');
    c.fillStyle = rg; c.strokeStyle = '#fff'; c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(-46, 8); c.lineTo(46, 8); c.lineTo(36, -30); c.lineTo(-36, -30); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#9a3412'; c.fillRect(-46, 8, 92, 6);
    const pulse = (performance.now() * 0.004) % 1;
    c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let k = 0; k < 2; k++) {
      const cy = -4 - k * 14 - pulse * 5;
      c.globalAlpha = 0.55 + 0.45 * (1 - k * 0.3);
      c.beginPath(); c.moveTo(-14, cy + 5); c.lineTo(0, cy - 5); c.lineTo(14, cy + 5); c.stroke();
    }
    c.globalAlpha = 1; c.restore();
  }

  function drawRiverLog(c, x, y, scale) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(255,255,255,0.68)'; c.beginPath(); c.ellipse(0, 8 * scale, 58 * scale, 14 * scale, 0, 0, Math.PI * 2); c.fill();
    const w = 116 * scale, h = 54 * scale;
    if (sprites.log && sprites.log.complete && sprites.log.naturalWidth) c.drawImage(sprites.log, -w / 2, -h * 0.80, w, h);
    c.restore();
  }

  /* ===== HIGH-VISIBILITY WATER PROTECTION SHIELD BONUS ===== */
  function drawBubblePickup(c, x, y, scale) {
    c.save();
    const bob = Math.sin(performance.now() * 0.006) * 7;
    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.08;
    c.translate(x, y + bob * scale); c.scale(scale, scale);

    // Sparkling aqua ring on water
    c.strokeStyle = 'rgba(103, 232, 249, 0.85)'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, 5, 36 * pulse, 10 * pulse, 0, 0, Math.PI * 2); c.stroke();

    // Iridescent protection orb
    const g = c.createRadialGradient(-8, -36, 3, 0, -28, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.42, 'rgba(56,189,248,0.65)');
    g.addColorStop(0.85, 'rgba(6,182,212,0.82)'); g.addColorStop(1, 'rgba(255,255,255,0.98)');
    c.fillStyle = g; c.strokeStyle = '#ffffff'; c.lineWidth = 3.2;
    c.beginPath(); c.arc(0, -28, 29 * pulse, 0, Math.PI * 2); c.fill(); c.stroke();

    // Inner crisp white shield emblem!
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -42); c.lineTo(12, -36); c.lineTo(10, -23); c.quadraticCurveTo(0, -14, 0, -14);
    c.quadraticCurveTo(-10, -23, -10, -23); c.lineTo(-12, -36); c.closePath(); c.fill();
    c.restore();
  }

  function drawPalm(c, x, y, scale, side) {
    if (!sprites.palm || !sprites.palm.complete || !sprites.palm.naturalWidth) return;
    c.save(); c.translate(x, y); if (side === -1) c.scale(-1, 1);
    const w = 135 * scale, h = 164 * scale;
    c.drawImage(sprites.palm, -w * 0.5, -h * 0.94, w, h);
    c.restore();
  }

  function renderScene(c, w, h, dt) {
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.save();
    if (state.shakeTime > 0) c.translate((Math.random() - 0.5) * state.shakeTime * 20, (Math.random() - 0.5) * state.shakeTime * 20);
    const horizonY = h * 0.36 - state.slope * h * 0.028;

    const sky = c.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, '#0284c7'); sky.addColorStop(0.55, '#67d4ff'); sky.addColorStop(1, '#fef3c7');
    c.fillStyle = sky; c.fillRect(0, 0, w, horizonY + 18);

    const sunG = c.createRadialGradient(w * 0.78, horizonY * 0.52, 8, w * 0.78, horizonY * 0.52, 72);
    sunG.addColorStop(0, 'rgba(255,251,214,0.95)'); sunG.addColorStop(0.45, 'rgba(254,240,138,0.45)'); sunG.addColorStop(1, 'rgba(254,240,138,0)');
    c.fillStyle = sunG; c.beginPath(); c.arc(w * 0.78, horizonY * 0.52, 72, 0, Math.PI * 2); c.fill();

    const cloudDrift = (performance.now() * 0.008) % (w + 140);
    c.fillStyle = 'rgba(255,255,255,0.84)';
    for (const [cx0, cy, cs] of [[0, horizonY * 0.34, 1.0], [w * 0.48, horizonY * 0.24, 0.8], [w * 0.86, horizonY * 0.42, 0.72]]) {
      const cx = ((cx0 + cloudDrift) % (w + 140)) - 70;
      c.beginPath(); c.arc(cx, cy, 18 * cs, 0, Math.PI * 2); c.arc(cx + 18 * cs, cy - 5 * cs, 22 * cs, 0, Math.PI * 2); c.arc(cx + 38 * cs, cy, 16 * cs, 0, Math.PI * 2); c.fill();
    }

    c.fillStyle = '#22c55e';
    c.beginPath(); c.moveTo(0, horizonY + 6);
    c.quadraticCurveTo(w * 0.22, horizonY - 18, w * 0.48, horizonY - 2);
    c.quadraticCurveTo(w * 0.76, horizonY - 20, w, horizonY + 4);
    c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();

    const bankGrad = c.createLinearGradient(0, horizonY, 0, h);
    bankGrad.addColorStop(0, '#4ade80'); bankGrad.addColorStop(0.5, '#22c55e'); bankGrad.addColorStop(1, '#15803d');
    c.fillStyle = bankGrad; c.fillRect(0, horizonY, w, h - horizonY);

    const segs = 36, pts = [];
    for (let i = 0; i <= segs; i++) {
      const z = i / segs, p = project(0, z, w, h);
      pts.push({ z, y: p.y, cx: w * 0.5, rh: p.riverHalf, scale: p.scale });
    }
    const fillRibbon = (mL, mR, fs) => {
      c.fillStyle = fs; c.beginPath();
      c.moveTo(pts[0].cx - pts[0].rh * mL, pts[0].y);
      for (let i = 1; i <= segs; i++) c.lineTo(pts[i].cx - pts[i].rh * mL, pts[i].y);
      for (let i = segs; i >= 0; i--) c.lineTo(pts[i].cx + pts[i].rh * mR, pts[i].y);
      c.closePath(); c.fill();
    };

    const sandG = c.createLinearGradient(0, horizonY, 0, h);
    sandG.addColorStop(0, '#fef08a'); sandG.addColorStop(0.5, '#fde047'); sandG.addColorStop(1, '#f59e0b');
    fillRibbon(1.22, 1.22, sandG);
    fillRibbon(1.07, 1.07, 'rgba(217,119,6,0.25)');

    const waterG = c.createLinearGradient(0, horizonY, 0, h);
    waterG.addColorStop(0, '#38bdf8'); waterG.addColorStop(0.35, '#06b6d4'); waterG.addColorStop(0.75, '#0284c7'); waterG.addColorStop(1, '#0369a1');
    fillRibbon(1.0, 1.0, waterG);

    const shimG = c.createLinearGradient(0, horizonY, 0, h);
    shimG.addColorStop(0, 'rgba(224,242,254,0.55)'); shimG.addColorStop(0.5, 'rgba(103,232,249,0.22)'); shimG.addColorStop(1, 'rgba(56,189,248,0.05)');
    fillRibbon(0.45, 0.45, shimG);

    c.strokeStyle = 'rgba(255,255,255,0.78)'; c.lineCap = 'round'; c.lineWidth = 4.5;
    for (const side of [-1, 1]) {
      c.beginPath();
      for (let i = 0; i <= segs; i++) {
        const rx = pts[i].cx + side * pts[i].rh * 0.99 + Math.sin(pts[i].z * 26 + state.distance * 18 + side) * 2.0 * pts[i].scale;
        if (i === 0) c.moveTo(rx, pts[i].y); else c.lineTo(rx, pts[i].y);
      }
      c.stroke();
    }

    for (let k = 0; k < 14; k++) {
      const z = ((k / 14) - (state.distance * 1.1) % (1 / 14) + 1) % 1;
      const p = project(0, z, w, h);
      const wx = w * 0.5 + (((k * 37) % 100) / 100 - 0.5) * 1.3 * p.riverHalf;
      const ww = (22 + (k % 3) * 10) * p.scale;
      c.strokeStyle = `rgba(224,242,254,${0.42 * (1 - z * 0.6)})`;
      c.lineWidth = Math.max(1.2, 2.8 * p.scale);
      c.beginPath(); c.moveTo(wx - ww, p.y); c.quadraticCurveTo(wx, p.y - 4 * p.scale, wx + ww, p.y); c.stroke();
    }

    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2; c.setLineDash([12, 16]); c.lineDashOffset = state.distance * 260;
    for (const div of [-0.33, 0.33]) {
      c.beginPath();
      for (let i = 0; i <= segs; i++) { const lx = pts[i].cx + div * pts[i].rh; if (i === 0) c.moveTo(lx, pts[i].y); else c.lineTo(lx, pts[i].y); }
      c.stroke();
    }
    c.setLineDash([]);

    for (let i = state.ripples.length - 1; i >= 0; i--) {
      const rp = state.ripples[i]; rp.life -= dt;
      if (rp.life <= 0) { state.ripples.splice(i, 1); continue; }
      const prog = 1 - rp.life / rp.maxLife;
      c.strokeStyle = `rgba(255,255,255,${(1 - prog) * 0.85})`; c.lineWidth = 3.5 * (1 - prog * 0.5);
      c.beginPath(); c.ellipse(rp.x, rp.y, 26 + prog * 72, 9 + prog * 24, 0, 0, Math.PI * 2); c.stroke();
    }

    const sortedPalms = state.palms.slice().sort((a, b) => b.z - a.z);
    for (const pm of sortedPalms) {
      if (pm.z > 0.86) continue;
      const p = project(0, pm.z, w, h);
      c.save();
      c.globalAlpha = Math.min(1, (0.86 - pm.z) * 6);
      drawPalm(c, w * 0.5 + pm.side * (p.riverHalf * (1.20 + pm.offset)), p.y, p.scale * pm.scale, pm.side);
      c.restore();
    }

    const visible = state.objects.filter(o => !o.hit && o.z >= -0.05 && o.z <= 1.06).sort((a, b) => b.z - a.z);
    for (const obj of visible) {
      if (obj.z > 0.14) {
        const p = project(obj.lane, obj.z, w, h);
        if (obj.type === 'buoy') drawLevelWordBuoy(c, p.x, p.y, p.scale, obj.text);
        else if (obj.type === 'ramp') drawWaterRamp(c, p.x, p.y, p.scale);
        else if (obj.type === 'log') drawRiverLog(c, p.x, p.y, p.scale);
        else if (obj.type === 'shield') drawBubblePickup(c, p.x, p.y, p.scale);
      }
    }

    const playerP = project(state.laneX, 0.12, w, h);
    for (let i = state.spray.length - 1; i >= 0; i--) {
      const sp = state.spray[i]; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += sp.gravity * dt; sp.r += sp.grow * dt; sp.life -= dt;
      if (sp.life <= 0) { state.spray.splice(i, 1); continue; }
      c.globalAlpha = Math.max(0, (sp.life / sp.maxLife) * (sp.droplet ? 0.95 : 0.62));
      c.fillStyle = sp.color; c.beginPath(); c.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;

    drawAnimated3DPapi(c, playerP.x, playerP.y, playerP.scale * 1.12, state.tilt, state.jumpY, state.distance * 16, state.shieldTime > 0);

    for (const obj of visible) {
      if (obj.z <= 0.14) {
        const p = project(obj.lane, obj.z, w, h);
        if (obj.type === 'buoy') drawLevelWordBuoy(c, p.x, p.y, p.scale, obj.text);
        else if (obj.type === 'ramp') drawWaterRamp(c, p.x, p.y, p.scale);
        else if (obj.type === 'log') drawRiverLog(c, p.x, p.y, p.scale);
        else if (obj.type === 'shield') drawBubblePickup(c, p.x, p.y, p.scale);
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i]; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 310 * dt; pt.life -= dt;
      if (pt.life <= 0) { state.particles.splice(i, 1); continue; }
      c.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      c.fillStyle = pt.color; c.beginPath(); c.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;

    for (let i = state.floats.length - 1; i >= 0; i--) {
      const fl = state.floats[i]; fl.y -= 56 * dt; fl.life -= dt;
      if (fl.life <= 0) { state.floats.splice(i, 1); continue; }
      c.globalAlpha = Math.min(1, fl.life * 2.2);
      c.fillStyle = '#ffe066'; c.strokeStyle = '#fff'; c.lineWidth = 3;
      roundRect(c, fl.x - 46, fl.y - 18, 92, 34, 17); c.fill(); c.stroke();
      c.fillStyle = '#3b2300'; c.font = '900 16px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(fl.text, fl.x, fl.y);
    }
    c.globalAlpha = 1;
    c.restore();
  }

  function step(ts) {
    if (!state.running) return;
    rafId = requestAnimationFrame(step);
    const dt = Math.min(0.05, (ts - state.lastFrame) / 1000 || 0.016);
    state.lastFrame = ts;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!state.paused && !document.hidden) {
      state.elapsed += dt;
      const targetSlope = computeTargetSlope(state.elapsed);
      state.slope += (targetSlope - state.slope) * Math.min(1, dt * 0.9);
      const dropBoost = state.slope < -0.3 ? 0.035 : 0;
      const targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + state.wordsCaught * 0.014 + state.elapsed * 0.0011 + dropBoost);
      state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 2.2);
      root.querySelector('#dsSpeed').textContent = (state.speed / BASE_SPEED).toFixed(1) + '×';

      state.distance += state.speed * dt;
      state.timeLeft -= dt;

      if (state.shieldTime > 0) {
        state.shieldTime = Math.max(0, state.shieldTime - dt);
        root.querySelector('#dsShieldPill').classList.toggle('active', state.shieldTime > 0);
        root.querySelector('#dsShieldTime').textContent = Math.ceil(state.shieldTime) + 's';
      }
      if (state.shakeTime > 0) state.shakeTime = Math.max(0, state.shakeTime - dt);
      if (state.landSquash > 0) state.landSquash = Math.max(0, state.landSquash - dt * 5);

      const clampedT = Math.max(0, state.timeLeft);
      root.querySelector('#dsTimer').textContent = Math.ceil(clampedT);
      const arc = root.querySelector('#dsTimerArc');
      arc.style.strokeDashoffset = String(119.38 * (1 - clampedT / ROUND_SECONDS));
      arc.style.stroke = clampedT <= 4 ? '#ff5668' : '#ffe066';

      if (state.timeLeft <= 0) { endGame('Süre doldu!'); return; }

      const diff = state.lane - state.laneX;
      state.laneX += diff * Math.min(1, dt * 13);
      state.tilt += (diff * 1.45 - state.tilt) * Math.min(1, dt * 12);

      const playerP = project(state.laneX, 0.12, rect.width, rect.height);
      if (state.jumpY < 8) emitBoardSpray(playerP.x, playerP.y, playerP.scale, 0.85, 0);

      if (state.jumpY > 0 || state.jumpVy > 0) {
        state.jumpY += state.jumpVy * dt; state.jumpVy -= 900 * dt;
        if (state.rampSoar) state.spinAngle = Math.min(Math.PI * 2, state.spinAngle + dt * 7.5);
        if (state.jumpY <= 0) {
          state.jumpY = 0; state.jumpVy = 0; state.rampSoar = false; state.spinAngle = 0; state.landSquash = 1;
          sfx.land();
          emitBoardSpray(playerP.x, playerP.y, playerP.scale, 2.8, 0);
          state.ripples.push({ x: playerP.x, y: playerP.y + 8 * playerP.scale, life: 0.45, maxLife: 0.45 });
        }
      }

      for (const pm of state.palms) { pm.z -= state.speed * dt; if (pm.z < -0.05) pm.z += 1.05; }

      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) { spawnNextSingle(); state.spawnTimer = Math.max(0.85, 0.34 / state.speed); }

      for (let i = state.objects.length - 1; i >= 0; i--) {
        const obj = state.objects[i]; obj.z -= state.speed * dt;
        if (obj.z < -0.15) { state.objects.splice(i, 1); continue; }
        if (!obj.hit && obj.z <= 0.17 && obj.z >= 0.06 && Math.abs(obj.lane - state.laneX) < 0.48) {
          if (obj.type === 'ramp') {
            obj.hit = true; state.jumpVy = 580; state.rampSoar = true; state.spinAngle = 0;
            sfx.ramp(); emitBoardSpray(playerP.x, playerP.y, playerP.scale, 3.2, 0);
            spawnBurst(playerP.x, playerP.y - 20, '#ffe066', 14);
            showToast('Rampa uçuşu!', 'ramp');
          } else if (obj.type === 'shield') {
            obj.hit = true; state.shieldTime = 12;
            root.querySelector('#dsShieldPill').classList.add('active');
            root.querySelector('#dsShieldTime').textContent = '12s';
            sfx.shieldUp(); spawnBurst(playerP.x, playerP.y - 30, '#67e8f9', 18);
            showToast('Baloncuk kalkanı hazır! (12 sn)', 'shield');
          } else if (obj.type === 'log') {
            if (state.jumpY > 34) continue;
            obj.hit = true;
            if (state.shieldTime > 0) {
              state.shieldTime = 0; root.querySelector('#dsShieldPill').classList.remove('active');
              state.shakeTime = 0.18; sfx.shieldSave(); spawnBurst(playerP.x, playerP.y - 26, '#67e8f9', 18);
              showToast('Baloncuk kalkanı seni korudu!', 'shield');
            } else { state.shakeTime = 0.28; sfx.hit(); endGame('Kütüğe çarptın!'); return; }
          } else if (obj.type === 'buoy') {
            if (state.jumpY > 42) continue;
            obj.hit = true;
            if (obj.correct) {
              state.wordsCaught++; state.xp += 5; state.streak++; state.bestStreak = Math.max(state.bestStreak, state.streak);
              root.querySelector('#dsXp').textContent = state.xp;
              root.querySelector('#dsStreak').textContent = state.streak;
              sfx.good(); spawnBurst(playerP.x, playerP.y - 35, '#ffe066', 18);
              emitBoardSpray(playerP.x, playerP.y, playerP.scale, 2.2, 0);
              state.floats.push({ x: playerP.x, y: playerP.y - 72, text: '+5 XP', life: 0.95 });
              showToast('+5 XP · Harika sörf!', 'good');
              nextWord(true);
            } else {
              if (state.shieldTime > 0) {
                state.shieldTime = 0; root.querySelector('#dsShieldPill').classList.remove('active');
                state.shakeTime = 0.18; sfx.shieldSave(); spawnBurst(playerP.x, playerP.y - 26, '#67e8f9', 18);
                showToast('Baloncuk kalkanı seni korudu!', 'shield');
              } else { state.shakeTime = 0.28; sfx.hit(); endGame('Doğrusu: ' + state.currentWord.tr); return; }
            }
          }
        }
      }
    }
    renderScene(ctx, rect.width, rect.height, dt);
  }

  function moveLane(dir) {
    if (!state.running || state.paused) return;
    const next = Math.max(-1, Math.min(1, state.lane + dir));
    if (next !== state.lane) {
      state.lane = next; sfx.carve();
      root?.querySelector('#dsHint')?.classList.add('fade');
      const r = canvas.getBoundingClientRect();
      const lp = project(state.laneX, 0.12, r.width, r.height);
      emitBoardSpray(lp.x, lp.y, lp.scale, 2.6, dir);
    }
  }
  function triggerJump() {
    if (!state.running || state.paused) return;
    if (state.jumpY <= 1) {
      state.jumpVy = 435; sfx.jump();
      root?.querySelector('#dsHint')?.classList.add('fade');
      const r = canvas.getBoundingClientRect();
      const lp = project(state.laneX, 0.12, r.width, r.height);
      emitBoardSpray(lp.x, lp.y, lp.scale, 2.5, 0);
      state.ripples.push({ x: lp.x, y: lp.y + 8 * lp.scale, life: 0.4, maxLife: 0.4 });
    }
  }

  function onKeyDown(e) {
    if (!root || root.hidden) return;
    if (e.key === 'Escape') {
      if (state.running) togglePause();
      else close();
      return;
    }
    if (!state.running || state.paused) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLane(-1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveLane(1);
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') { e.preventDefault(); triggerJump(); }
  }
  window.addEventListener('keydown', onKeyDown);

  function startGame() {
    ensureAudio();
    if (!isPremium()) {
      const q = readQuota();
      q.used++;
      writeQuota(q);
    }
    syncButtons();
    state.running = true; state.paused = false;
    state.xp = 0; state.wordsCaught = 0; state.streak = 0; state.bestStreak = 0;
    state.elapsed = 0; state.distance = 0; state.slope = 0; state.speed = BASE_SPEED;
    state.lane = 0; state.laneX = 0; state.tilt = 0;
    state.jumpY = 0; state.jumpVy = 0; state.rampSoar = false; state.spinAngle = 0; state.landSquash = 0;
    state.shieldTime = 0; state.shakeTime = 0;
    state.objects = []; state.spray = []; state.particles = []; state.floats = []; state.ripples = [];
    state.spawnTimer = 0.25; state.wrongSinceTarget = 0; state.spawnsSinceShield = 2;
    initPalms();

    root.querySelector('#dsXp').textContent = '0';
    root.querySelector('#dsStreak').textContent = '0';
    root.querySelector('#dsSpeed').textContent = '1.0×';
    root.querySelector('#dsShieldPill').classList.remove('active');
    root.querySelector('#dsHint').classList.remove('fade');
    root.querySelector('#dsPauseModal').classList.remove('open');

    root.querySelector('#dsIntroScreen').classList.add('ds-hidden');
    root.querySelector('#dsEndScreen').classList.add('ds-hidden');
    root.querySelector('#dsGameScreen').classList.remove('ds-hidden');

    nextWord(true);
    startMusic();
    state.lastFrame = performance.now();
    rafId = requestAnimationFrame(step);
  }

  function togglePause() {
    state.paused = !state.paused;
    root?.querySelector('#dsPauseModal')?.classList.toggle('open', state.paused);
  }

  function endGame(reason) {
    state.running = false;
    cancelAnimationFrame(rafId);
    stopMusic();
    try { window.speechSynthesis?.cancel(); } catch {}

    root.querySelector('#dsEndTitle').textContent = state.wordsCaught >= 5 ? 'Harika sörf yaptın!' : 'Tatlı bir denemeydi!';
    root.querySelector('#dsEndSub').textContent = `${reason} · ${state.wordsCaught} kelime yakaladın!`;
    root.querySelector('#dsEndScore').textContent = `+${state.xp} XP · ${state.wordsCaught} KELİME`;
    root.querySelector('#dsEndWords').textContent = state.wordsCaught;
    root.querySelector('#dsEndDur').textContent = Math.max(1, Math.round(state.elapsed)) + ' sn';
    root.querySelector('#dsEndStreak').textContent = state.bestStreak;
    syncButtons();

    root.querySelector('#dsGameScreen').classList.add('ds-hidden');
    root.querySelector('#dsEndScreen').classList.remove('ds-hidden');
    window.dmGamesUI?.refresh?.();
  }

  function open() {
    ensureOverlay();
    state.running = false; state.paused = false;
    stopMusic();
    syncButtons();
    root.querySelector('#dsGameScreen').classList.add('ds-hidden');
    root.querySelector('#dsEndScreen').classList.add('ds-hidden');
    root.querySelector('#dsIntroScreen').classList.remove('ds-hidden');
    root.hidden = false;
    document.body.classList.add('dm-play-session');
  }

  function close() {
    state.running = false; state.paused = false;
    cancelAnimationFrame(rafId);
    stopMusic();
    try { window.speechSynthesis?.cancel(); } catch {}
    if (root) {
      root.hidden = true;
      root.querySelector('#dsPauseModal')?.classList.remove('open');
      root.querySelector('#dsAdModal')?.classList.remove('open');
    }
    document.body.classList.remove('dm-play-session');
    window.dmGamesUI?.refresh?.();
  }

  document.addEventListener('dm:logout', () => { sessionUsedEn.clear(); close(); });

  window.dmDalgaSorfu = { open, close, hasFreeQuota, isPremium };
  window.papiDalgaSorfuAc = open;
})();
