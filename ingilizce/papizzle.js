(() => {
  'use strict';

  const endpoint = (typeof apiURL === 'string' ? apiURL :
    'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/, 'premium-games');
  const account = () => typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi;
  let opening = false;

  async function request(token, op, extra = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      let response, data;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({game: 'papizzle', t: token, op, ...extra}),
          signal: controller.signal
        });
        data = await response.json();
      } catch {
        throw Error('Papizzle bağlantısı kurulamadı. Tekrar dene.');
      }
      if (!response.ok || !data?.ok) {
        const error = Error(data?.mesaj || 'Papizzle bağlantısı kurulamadı. Tekrar dene.');
        error.code = data?.hata;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function loadStyle() {
    if (document.getElementById('papizzle-style')) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.id = 'papizzle-style';
      link.rel = 'stylesheet';
      link.href = 'papizzle.css?v=1';
      link.onload = resolve;
      link.onerror = () => { link.remove(); reject(Error('Papizzle görünümü yüklenemedi.')); };
      document.head.append(link);
    });
  }

  window.papizzleAc = async () => {
    if (opening || document.querySelector('.papizzle')) return;
    const name = account();
    const token = (window.dmTeacherPortalMode ? sessionStorage.getItem('ing_ogr_token') : '') || localStorage.getItem('ing_token') || '';
    opening = true;
    try {
      const [state] = await Promise.all([request(token, 'status'), loadStyle()]);
      if (name === account() && token === ((window.dmTeacherPortalMode ? sessionStorage.getItem('ing_ogr_token') : '') || localStorage.getItem('ing_token') || '')) mount(name, token, state);
    } catch (error) {
      window.yoToast?.(error.message);
    } finally {
      opening = false;
    }
  };

  function mount(name, token, state) {
    const screen = document.createElement('dialog');
    screen.className = 'papizzle';
    screen.setAttribute('aria-label', 'Papizzle');
    screen.innerHTML = `
      <main>
        <header><span>★ PREMİUM</span><button type="button" data-pause aria-label="Oyunu duraklat" hidden>Ⅱ</button><button type="button" data-sound aria-label="Sesi kapat"></button><button type="button" data-close aria-label="Kapat">×</button></header>
        <h1>Papizzle</h1>
        <section data-panel></section>
        <section data-game hidden>
          <div class="pz-hud"><b data-level></b><progress aria-label="Temizlenen bloklar"></progress><b data-count></b></div>
          <div class="pz-prompt"><img src="papi-welcome-v2.png" alt=""><div><b data-word lang="en" aria-live="polite"></b><small>Türkçe anlamını bul</small></div></div>
          <div class="pz-feedback"><span data-feedback role="status"></span><b data-score></b></div>
          <div class="pz-board" aria-label="Anlam blokları"></div>
        </section>
      </main>`;
    const $ = selector => screen.querySelector(selector);
    const panel = $('[data-panel]');
    const game = $('[data-game]');
    const board = $('.pz-board');
    let runId, tiles, order, selections, matched, mistakes, streak, points;
    let pending = false;
    let audio;
    let muted = localStorage.getItem('papizzle-muted') === '1';
    const sameAccount = () => name === account() && token === ((window.dmTeacherPortalMode ? sessionStorage.getItem('ing_ogr_token') : '') || localStorage.getItem('ing_token') || '');

    function close() {
      clearInterval(watch);
      audio?.close().catch(() => {});
      screen.close();
      screen.remove();
    }

    function playSound(ok) {
      if (muted || window.dmAnswerAudio?.enabled()===false) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        audio ??= new Audio();
        audio.resume().catch(() => {});
        (ok ? [659, 988] : [240, 175]).forEach((pitch, i) => {
          const wave = audio.createOscillator(), volume = audio.createGain();
          const at = audio.currentTime + i * .065;
          wave.frequency.value = pitch;
          volume.gain.setValueAtTime(.07, at);
          volume.gain.exponentialRampToValueAtTime(.001, at + .15);
          wave.connect(volume).connect(audio.destination);
          wave.start(at);
          wave.stop(at + .16);
          wave.onended = () => { wave.disconnect(); volume.disconnect(); };
        });
      } catch { /* Feedback animations remain available without audio. */ }
    }

    function paintSound() {
      const button = $('[data-sound]');
      const waves = muted ? 'M16 9l5 6m0-6-5 6' : 'M16 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10';
      button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h4l5-4v14l-5-4H3z ${waves}"/></svg>`;
      button.setAttribute('aria-label', muted ? 'Sesi aç' : 'Sesi kapat');
    }

    function showPanel(title, lines, actions) {
      window.dmPremiumIntro?.unmount(screen);
      game.hidden = true;
      $('[data-pause]').hidden = true;
      panel.hidden = false;
      const heading = document.createElement('h2');
      heading.textContent = title;
      panel.replaceChildren(heading);
      for (const line of lines.filter(Boolean)) {
        const p = document.createElement('p');
        p.textContent = line;
        panel.append(p);
      }
      for (const [label, action] of actions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.onclick = action;
        panel.append(button);
      }
      panel.querySelector('button')?.focus({preventScroll: true});
    }

    function home(error) {
      const lowEnergy = !runId && state.energy < 5;
      const intro = window.dmPremiumIntro;
      if (intro) {
        game.hidden = true;
        panel.hidden = true;
        $('[data-pause]').hidden = true;
        const openPlans = intro.plans('papizzle', (window.dmAndroidPlan?.plan || 'free') === 'pro' ? 'premium_pro' : '');
        const actions = [];
        if (state.remaining > 0 && !lowEnergy) actions.push({label: `Seviye ${state.level}’i oyna`, cost: 5, onClick: start});
        else if (state.remaining > 0) actions.push({label: 'Enerji seçenekleri', onClick: () => window.dmEnerjiPaketPaneli?.()});
        else if (openPlans) actions.push({label: 'Paketleri gör', onClick: () => { close(); openPlans(); }}); // oyun penceresi üst katmanda; önce kapanır
        else actions.push({label: 'Durumu yenile', onClick: refresh});
        actions.push({label: 'Oyunlara dön', kind: 'secondary', onClick: close});
        const note = error ? {text: error, icon: 'bolt'} :
          lowEnergy && state.remaining > 0 ? {text: `Başlamak için 5 enerji gerekli. ${5 - state.energy} enerji daha lazım.`, icon: 'bolt'} :
          state.remaining <= 0 ? {text: intro.noRightsText(), icon: 'lock'} : null;
        intro.mount(screen, {
          theme: 'papizzle',
          image: 'premium-assets/papizzle-hero.webp',
          imageAlt: 'Papi ve renkli anlam kutularından oluşan kelime duvarı',
          title: 'Papizzle',
          desc: 'Kelime duvarını temizle! Üstteki İngilizce kelimenin anlamına dokun.',
          stats: [
            {value: `Seviye ${state.level}`, label: 'Sıradaki'},
            {value: `${state.energy}/${state.energyMax}`, label: 'Enerji', icon: 'bolt'},
            state.premium ? {value: 'Sınırsız', label: 'Premium', icon: 'infinity'} : {value: `${Math.max(0, state.remaining)}`, label: 'Kalan hak'}
          ],
          note,
          actions
        });
        return;
      }
      const actions = state.remaining > 0 && !lowEnergy ? [[`Seviye ${state.level} · ⚡ 5`, start]] : [['Durumu yenile', refresh]];
      if (lowEnergy && state.remaining > 0) actions.unshift(['Enerji seçenekleri', () => window.dmEnerjiPaketPaneli?.()]);
      const message = error || (lowEnergy ? `Başlamak için 5 enerji gerekli. ${5 - state.energy} enerji daha lazım.` :
        state.remaining <= 0 ? 'Oyun hakkın kalmadı.' : '');
      showPanel('Kelime duvarını temizle!', [
        'Üstteki İngilizce kelimenin anlamına dokun.',
        `⚡ ${state.energy}/${state.energyMax} · ${state.premium ? 'Premium sınırsız' : `${state.remaining} ücretsiz hak`}`,
        message
      ], [...actions, ['Oyunlara dön', close]]);
    }

    function apply(data) {
      state = {...state, ...data};
      window.headerEnerjiGoster?.(data.energy, data.energyMax);
      if (data.yo) window.dmApplyRewardState?.(data.yo, name);
    }

    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const data = await request(token, 'status');
        if (screen.isConnected && sameAccount()) { apply(data); home(); }
      } catch (error) {
        if (screen.isConnected && sameAccount()) home(error.message);
      } finally {
        pending = false;
      }
    }

    async function start() {
      if (pending) return;
      pending = true;
      runId ??= crypto.randomUUID();
      showPanel('Bloklar hazırlanıyor…', [], []);
      try {
        const data = await request(token, 'start', {runId});
        if (!screen.isConnected || !sameAccount()) return;
        apply(data);
        tiles = data.tiles;
        order = data.order;
        selections = [];
        matched = mistakes = streak = points = 0;
        $('[data-level]').textContent = `Seviye ${data.playedLevel}`;
        $('[data-feedback]').textContent = '';
        board.replaceChildren();
        tiles.forEach(({tr}, i) => {
          const tile = document.createElement('button');
          tile.type = 'button';
          tile.textContent = tr;
          tile.style.setProperty('--pz-delay', `${i * 24}ms`);
          tile.onclick = () => choose(i, tile);
          board.append(tile);
        });
        panel.hidden = true;
        game.hidden = false;
        $('[data-pause]').hidden = false;
        paint();
        board.firstElementChild?.focus({preventScroll: true});
      } catch (error) {
        if (screen.isConnected && sameAccount()) {
          if (error.code === 'enerji' || error.code === 'hak') {
            runId = undefined;
            const data = await request(token, 'status').catch(() => null);
            if (!screen.isConnected || !sameAccount()) return;
            if (data) apply(data);
          }
          home(error.message);
          window.DijiMeduPapiFeedback?.energyDenied(error);
        }
      } finally {
        pending = false;
      }
    }

    function paint() {
      $('[data-count]').textContent = `${matched}/${tiles.length}`;
      $('[data-score]').textContent = `${points} puan`;
      const progress = $('progress');
      progress.max = tiles.length;
      progress.value = matched;
      $('[data-word]').textContent = matched < tiles.length ? tiles[order[matched]].en : 'Harika!';
    }

    function choose(index, tile) {
      if (pending || matched === order.length || tile.disabled || game.inert) return;
      const correct = index === order[matched];
      playSound(correct);
      const feedback = $('[data-feedback]');
      if (!correct) {
        // Retain at most 240 incorrect taps, leaving room for all 16 correct picks.
        if (mistakes < 240) { selections.push(index); mistakes++; points -= 5; }
        streak = 0;
        feedback.textContent = 'Tekrar dene · −5';
        tile.classList.remove('pz-wrong');
        void tile.offsetWidth;
        tile.classList.add('pz-wrong');
        paint();
        return;
      }
      selections.push(index);
      matched++;
      streak++;
      points += 20 + (streak % 3 === 0 ? 10 : 0);
      feedback.textContent = streak % 3 === 0 ? '★ Papi serisi! +30' : 'Doğru! +20';
      tile.disabled = true;
      tile.classList.add('pz-cleared');
      paint();
      if (matched === order.length) setTimeout(finish, 320);
      else board.querySelector('button:not(:disabled)')?.focus({preventScroll: true});
    }

    async function finish() {
      if (pending || !screen.isConnected || !sameAccount()) return;
      pending = true;
      showPanel('Sonuç kaydediliyor…', [], []);
      try {
        const result = await request(token, 'finish', {runId, selections});
        if (!screen.isConnected || !sameAccount()) return;
        apply(result);
        runId = undefined;
        const actions = result.remaining > 0 ? [[`Seviye ${result.level} · ⚡ 5`, start]] : [];
        showPanel('✦ Duvar temizlendi!', [
          `Seviye ${result.playedLevel} tamamlandı · ${result.score} puan`,
          `${result.correct} doğru · ${result.wrong} yanlış`,
          `+${result.xp} XP · +${result.gold} altın`,
          result.remaining > 0 ? 'Yeni bloklar hazır!' : 'Ücretsiz oyun hakların tamamlandı.'
        ], [...actions, ['Oyunlara dön', close]]);
      } catch (error) {
        if (screen.isConnected && sameAccount()) showPanel('Sonuç kaydedilemedi', [error.message], [['Tekrar dene', finish], ['Kapat', close]]);
      } finally {
        pending = false;
      }
    }

    $('[data-pause]').onclick = () => {
      if (!game.hidden && !pending && matched < order.length) window.dmLocalGamePause?.(screen, game, () => {});
    };
    $('[data-close]').onclick = close;
    $('[data-sound]').onclick = () => {
      muted = !muted;
      localStorage.setItem('papizzle-muted', muted ? '1' : '0');
      paintSound();
    };
    screen.addEventListener('cancel', event => { event.preventDefault(); close(); });
    document.body.append(screen);
    screen.dmGameFrameActions={back:close,exit:close};
    screen.showModal();
    const watch = setInterval(() => { if (!sameAccount()) close(); }, 500);
    paintSound();
    home();
  }
})();
