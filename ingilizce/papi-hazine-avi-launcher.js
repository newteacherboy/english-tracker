/* Papi Hazine Avı — Diji-Medu Mobile & Web Integration Launcher
 * - Launch Date: 10 Aralık 2026 saat 19:00 (Europe/Istanbul, UTC+3)
 * - Bypassed ONLY for "Irmak" account (`isIrmakAccount()`)
 * - Maps 1–3 Free (40 Levels), Maps 4–6 Require Premium Pro (`premium_pro`)
 */
(() => {
  'use strict';
  if (window.dmHazineAvi) return;

  const LAUNCH_AT_MS = Date.parse('2026-12-10T19:00:00+03:00');
  const GAME_URL = 'papi-hazine-avi/index.html?v=20261127-rel1&embedded=1';

  let hostOverlay = null;
  let hostFrame = null;
  let launchModal = null;
  let cdTimer = 0;

  function activeStudentName() {
    try {
      if (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && String(aktifOgrenciAdi).trim().toLowerCase() !== 'teacher') {
        return String(aktifOgrenciAdi).trim();
      }
      const stored = localStorage.getItem('ing_aktifOgrenci') || '';
      if (stored.trim() && stored.trim().toLowerCase() !== 'teacher') return stored.trim();
    } catch (_) {}
    return '';
  }

  function isIrmakAccount() {
    const raw = activeStudentName()
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/i̇/g, 'i')
      .trim();
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
    if (d > 0) return `Lansman: 10 Aralık 19:00 (${d}g ${h}s)`;
    if (h > 0) return `Lansman: 10 Aralık 19:00 (${h}s ${m}dk)`;
    return `Lansman: 10 Aralık 19:00 (${Math.max(1, m)}dk)`;
  }

  function isPremiumPro() {
    if (window.dmTeacherPortalMode) return true;
    try {
      if (window.dmAndroidPlan?.plan === 'premium_pro') return true;
      const tier = window.dmProgression?.status?.()?.membership_tier || window.dmMembershipTier || '';
      if (tier === 'premium_pro') return true;
      if (typeof yo !== 'undefined' && (yo?.plan === 'premium_pro' || yo?.membership_tier === 'premium_pro' || yo?.premiumPro === true)) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  function hasFreeQuota() {
    // Maps 1–3 (40 Levels) are always free!
    return true;
  }

  function onEscapeKey(e) {
    if (e.key === 'Escape') {
      if (launchModal && !launchModal.hidden) closeLaunchModal();
    }
  }

  function showLaunchModal() {
    if (!launchModal) {
      launchModal = document.createElement('div');
      launchModal.className = 'pha-launch-veil';
      launchModal.setAttribute('role', 'dialog');
      launchModal.setAttribute('aria-modal', 'true');
      launchModal.setAttribute('aria-label', 'Papi Hazine Avı Lansman');
      launchModal.innerHTML = `
        <div class="pha-launch-modal">
          <div class="pha-launch-hero">
            <img src="premium-assets/hazine-avi/cover.webp" alt="Papi Hazine Avı">
            <button type="button" class="pha-launch-close" data-pha-close aria-label="Kapat">×</button>
          </div>
          <div class="pha-launch-body">
            <span class="pha-launch-pill">BÜYÜK LANSMAN · 10 ARALIK 19:00</span>
            <h2>Papi Hazine Avı Başlıyor!</h2>
            <p>6 farklı 3D ada ve 100 bölümlük İngilizce hazine macerası <strong>10 Aralık saat 19:00'da</strong> yayına açılıyor. İlk 3 harita tamamen ücretsiz!</p>
            <div class="pha-cd-grid">
              <div class="pha-cd-unit"><b id="phaCdD">00</b><small>GÜN</small></div>
              <div class="pha-cd-unit"><b id="phaCdH">00</b><small>SAAT</small></div>
              <div class="pha-cd-unit"><b id="phaCdM">00</b><small>DAKİKA</small></div>
              <div class="pha-cd-unit"><b id="phaCdS">00</b><small>SANİYE</small></div>
            </div>
            <button type="button" class="pha-launch-cta" data-pha-close>Tamam, Lansmanı Bekliyorum!</button>
          </div>
        </div>
      `;
      launchModal.addEventListener('click', (e) => {
        if (e.target === launchModal || e.target.closest('[data-pha-close]')) closeLaunchModal();
      });
      document.body.appendChild(launchModal);
    }

    launchModal.hidden = false;
    document.addEventListener('keydown', onEscapeKey);

    const tick = () => {
      if (isLaunchOpen()) {
        closeLaunchModal();
        open();
        return;
      }
      const { d, h, m, s } = launchRemainingParts();
      const pad = (v) => String(v).padStart(2, '0');
      const dEl = launchModal.querySelector('#phaCdD');
      const hEl = launchModal.querySelector('#phaCdH');
      const mEl = launchModal.querySelector('#phaCdM');
      const sEl = launchModal.querySelector('#phaCdS');
      if (dEl) dEl.textContent = pad(d);
      if (hEl) hEl.textContent = pad(h);
      if (mEl) mEl.textContent = pad(m);
      if (sEl) sEl.textContent = pad(s);
    };
    tick();
    clearInterval(cdTimer);
    cdTimer = setInterval(tick, 1000);
  }

  function closeLaunchModal() {
    clearInterval(cdTimer);
    if (launchModal) launchModal.hidden = true;
    document.removeEventListener('keydown', onEscapeKey);
  }

  function open() {
    if (!isLaunchOpen()) {
      showLaunchModal();
      return;
    }

    if (!hostOverlay) {
      hostOverlay = document.createElement('section');
      hostOverlay.id = 'dmHazineAviOverlay';
      hostOverlay.className = 'pha-host-overlay';
      hostOverlay.setAttribute('role', 'dialog');
      hostOverlay.setAttribute('aria-modal', 'true');
      hostOverlay.setAttribute('aria-label', 'Papi Hazine Avı');

      hostFrame = document.createElement('iframe');
      hostFrame.className = 'pha-host-frame';
      hostFrame.title = 'Papi Hazine Avı 3D';
      hostFrame.allow = 'autoplay';
      hostOverlay.appendChild(hostFrame);
      document.body.appendChild(hostOverlay);
    }

    hostOverlay.hidden = false;
    hostFrame.src = GAME_URL;
    document.body.classList.add('dm-solo-fullstage');
  }

  function close() {
    if (hostFrame) {
      // Unload WebGL context cleanly so mobile RAM/GPU is freed 100% upon exit!
      try { hostFrame.contentWindow?.__papiGame?.dispose?.(); } catch (_) {}
      hostFrame.src = 'about:blank';
    }
    if (hostOverlay) hostOverlay.hidden = true;
    document.body.classList.remove('dm-solo-fullstage');
    window.dmGamesUI?.refresh?.();
  }

  function closeForUpgrade() {
    close();
    setTimeout(() => {
      if (window.DMSatis?.planlar) {
        window.DMSatis.planlar('papi-hazine-avi', 'premium_pro');
      } else if (window.dmAndroidBilling?.open) {
        window.dmAndroidBilling.open('papi-hazine-avi');
      }
    }, 80);
  }

  window.dmHazineAvi = {
    open,
    close,
    closeForUpgrade,
    hasFreeQuota,
    isPremiumPro,
    isLaunchOpen,
    launchLabel,
    isIrmakAccount
  };
  window.papiHazineAviAc = open;
})();
