(() => {
  'use strict';
  const endpoint = (typeof apiURL === 'string' ? apiURL :
    'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/, 'premium-games');
  const account = () => typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi;
  const token = () => (window.dmTeacherPortalMode ? sessionStorage.getItem('ing_ogr_token') : '') || localStorage.getItem('ing_token') || '';
  let opening = false;
  let styles;

  function runnerAudio() {
    const melody = [76, 79, 81, 83, 81, 79, 76, 74, 72, 76, 79, 81, 79, 76, 74, 76];
    const bass = [45, 41, 48, 43];
    let context, timer, beat = 0;
    let muted = localStorage.getItem('dm_runners_mute') === '1';

    function note(midi, volume, length, type, offset = 0) {
      if (context?.state !== 'running' || muted || document.hidden) return;
      const at = context.currentTime + offset;
      const wave = context.createOscillator(), gain = context.createGain();
      wave.type = type;
      wave.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      gain.gain.setValueAtTime(.001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + .012);
      gain.gain.exponentialRampToValueAtTime(.001, at + length);
      wave.connect(gain).connect(context.destination);
      wave.start(at);
      wave.stop(at + length);
      wave.onended = () => { wave.disconnect(); gain.disconnect(); };
    }

    return {
      get muted() { return muted; },
      unlock() {
        if (muted) return;
        try {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (Audio) context ||= new Audio();
          context?.resume().catch(() => {});
        } catch { /* The game also works without audio. */ }
      },
      music(playing) {
        clearInterval(timer);
        if (!playing || muted || document.hidden) return;
        timer = setInterval(() => {
          note(melody[beat % melody.length], .035, .17, 'triangle');
          if (beat % 2 === 0) note(bass[Math.floor(beat / 8) % bass.length], .06, .22, 'sine');
          note(beat % 4 === 0 ? 36 : 92, .018, .045, 'triangle');
          beat++;
        }, 208);
      },
      effect(correct) {
        const tones = correct ? [79, 86] : [57, 50];
        tones.forEach((pitch, index) => note(pitch, .13, .19, correct ? 'sine' : 'triangle', index * .07));
      },
      toggle() {
        muted = !muted;
        localStorage.setItem('dm_runners_mute', muted ? '1' : '0');
        this.unlock();
      },
      close() {
        clearInterval(timer);
        context?.close().catch(() => {});
      }
    };
  }

  async function request(session, op, payload = {}) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({game: 'runners-papi', t: session, op, ...payload}),
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw Error(data.mesaj || 'Şehir Parkuru’ne bağlanılamadı.');
    return data;
  }

  function loadStyles() {
    return styles ??= new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'runners-papi.css?v=3';
      link.onload = resolve;
      link.onerror = () => {
        styles = null;
        link.remove();
        reject(Error('Şehir Parkuru yüklenemedi.'));
      };
      document.head.append(link);
    });
  }

  window.runnersPapiAc = async () => {
    if (opening || document.querySelector('.rp-game')) return;
    const owner = account();
    const session = token();
    opening = true;
    try {
      const [state] = await Promise.all([request(session, 'status'), loadStyles()]);
      if (owner === account() && session === token()) mount(owner, session, state);
    } catch (error) {
      window.yoToast?.(error.message);
    } finally {
      opening = false;
    }
  };

  function mount(owner, session, state) {
    const screen = document.createElement('dialog');
    screen.className = 'rp-game';
    screen.setAttribute('aria-label', 'Runners Papi');
    screen.innerHTML = `
      <header><b>★ PREMİUM</b><div><button type="button" data-sound aria-label="Oyun sesi"></button> <button type="button" data-close aria-label="Oyunu kapat">×</button></div></header>
      <section class="rp-menu">
        <p>ŞEHİR PARKURU</p><h1>Runners Papi</h1>
        <img src="premium-assets/runners-city-child.webp" alt="">
        <p data-summary></p><p data-access></p>
        <button type="button" data-start></button>
      </section>
      <section class="rp-run" hidden>
        <div class="rp-hud"><b data-level></b><b data-lives></b><b data-score></b></div>
        <progress aria-label="Kapıya kalan süre" max="1" value="1"></progress>
        <div class="rp-prompt"><small>Türkçe anlamını bul</small><strong data-word lang="en"></strong></div>
        <div class="rp-gates" aria-label="Türkçe anlam kapıları"></div>
        <div class="rp-player" aria-hidden="true"><img src="premium-assets/runners-city-child.webp" alt=""></div>
      </section>
      <p class="rp-message" role="status"></p><button type="button" data-retry hidden>Tekrar dene</button>`;
    const $ = selector => screen.querySelector(selector);
    const menu = $('.rp-menu'), run = $('.rp-run'), gates = $('.rp-gates');
    const start = $('[data-start]'), retry = $('[data-retry]'), message = $('.rp-message');
    let busy = false, frame = 0, feedbackTimer = 0, crossingTimer = 0, startId, pointer;
    const sameAccount = () => owner === account() && session === token();
    const active = () => screen.open && sameAccount();
    const number = new Intl.NumberFormat('tr-TR', {notation: 'compact', maximumFractionDigits: 1});
    let lane = 0, steered = false;
    const sound = runnerAudio();
    const syncMusic = () => sound.music(!run.hidden);
    const soundButton = $('[data-sound]'), player = $('.rp-player');

    function paintSound() {
      soundButton.textContent = sound.muted ? '🔇' : '🔊';
      soundButton.setAttribute('aria-label', sound.muted ? 'Sesi aç' : 'Sesi kapat');
    }

    function close() {
      cancelAnimationFrame(frame);
      clearTimeout(feedbackTimer);
      document.removeEventListener('visibilitychange', syncMusic);
      sound.close();
      clearInterval(watch);
      clearTimeout(crossingTimer);
      screen.close();
      screen.remove();
    }

    function showMenu(ended = false) {
      run.hidden = true;
      syncMusic();
      menu.hidden = false;
      $('[data-summary]').textContent = (ended ? `Koşu bitti · Seviye ${state.level}. ` : '') +
        `Rekor: ${number.format(state.bestCorrect)} doğru · En iyi seviye: ${state.bestLevel || '—'}`;
      $('[data-access]').textContent = state.lives > 0 ? 'Koşun kaydedildi. Kaldığın kapıdan devam et.' :
        `5 enerji · ${state.premium ? 'Premium sınırsız' : `${state.remaining} ücretsiz hak`}`;
      start.textContent = state.lives > 0 ? 'Devam Et' : ended ? 'Yeniden Koş' : 'Koşuya Başla';
      start.disabled = state.lives === 0 && ((!state.premium && !state.remaining) || state.energy < 5);
    }

    function selectLane(index, focus = false) {
      if (!gates.children[index]) return;
      lane = index;
      player.style.setProperty('--lane', String(index));
      [...gates.children].forEach((button, i) => button.classList.toggle('rp-selected', i === index));
      if (focus) gates.children[index].focus({preventScroll: true});
    }

    function playGate() {
      if (!active()) return;
      if (!state.question) { showMenu(true); return; }
      menu.hidden = true;
      run.hidden = false;
      run.classList.remove('rp-crossing');
      player.style.setProperty('--run', '0');
      const options = state.question.options;
      screen.style.setProperty('--lanes', String(options.length));
      $('[data-level]').textContent = `Seviye ${state.level}`;
      $('[data-lives]').textContent = `${state.lives} can`;
      $('[data-score]').textContent = `${number.format(state.correctCount)} doğru`;
      $('[data-word]').textContent = state.question.word;
      // Keep the gates anchored. Only their signs change between questions.
      while (gates.children.length > options.length) gates.lastElementChild.remove();
      options.forEach((option, index) => {
        let button = gates.children[index];
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.append(document.createElement('span'));
          button.onclick = () => { selectLane(index); answer(index); };
          gates.append(button);
        }
        button.firstElementChild.textContent = option;
        button.disabled = false;
        button.classList.remove('rp-selected');
      });
      steered = false;
      lane = (options.length - 1) / 2;
      player.style.setProperty('--lane', String(lane));
      const duration = Math.max(2400, 4200 - (state.level - 1) * 225);
      let remaining = duration, previous = performance.now();
      const progress = $('progress');
      progress.value = 1;
      function tick(now) {
        if (!active()) return;
        const elapsed = now - previous;
        if (!document.hidden && elapsed < 300) remaining -= elapsed;
        previous = now;
        progress.value = Math.max(0, remaining / duration);
        player.style.setProperty('--run', String(.83 * (1 - progress.value)));
        if (remaining <= 0) answer(steered ? lane : -1);
        else frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }

    async function send(op, payload, done) {
      if (busy || !active()) return;
      busy = true;
      retry.hidden = true;
      if (op === 'start') message.textContent = 'Koşu hazırlanıyor…';
      try {
        const result = await request(session, op, payload);
        if (!active()) return;
        state = result;
        window.headerEnerjiGoster?.(state.energy, state.energyMax);
        done();
      } catch (error) {
        if (!active()) return;
        message.textContent = error.message;
        retry.hidden = false;
        retry.onclick = () => send(op, payload, done);
      } finally {
        busy = false;
      }
    }

    function answer(choice) {
      cancelAnimationFrame(frame);
      clearTimeout(feedbackTimer);
      delete screen.dataset.outcome;
      message.textContent = '';
      [...gates.children].forEach(button => { button.disabled = true; });
      const payload = {runId: state.runId, gate: state.gate, choice};
      const submit = () => send('answer', payload, () => {
        const feedback = state.feedback;
        playGate();
        if (feedback?.gate !== payload.gate) return;
        sound.effect(feedback.correct);
        message.textContent = feedback.correct ? 'Doğru!' :
          `${choice === -1 ? 'Süre doldu' : 'Yanlış kapı'} · ${feedback.meaning} · −1 can`;
        screen.dataset.outcome = feedback.correct ? 'correct' : 'wrong';
        feedbackTimer = setTimeout(() => {
          delete screen.dataset.outcome;
          message.textContent = '';
        }, 650);
      });
      if (choice < 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        submit();
      } else {
        run.classList.add('rp-crossing');
        player.style.setProperty('--run', '1');
        crossingTimer = setTimeout(submit, 240);
      }
    }

    function begin() {
      clearTimeout(feedbackTimer);
      delete screen.dataset.outcome;
      message.textContent = '';
      playGate();
      syncMusic();
    }

    start.onclick = () => {
      sound.unlock();
      if (state.lives > 0) { begin(); return; }
      start.disabled = true;
      startId ??= crypto.randomUUID();
      send('start', {runId: startId}, () => { startId = null; begin(); });
    };
    soundButton.onclick = () => { sound.toggle(); paintSound(); syncMusic(); };
    document.addEventListener('visibilitychange', syncMusic);
    paintSound();
    run.addEventListener('pointerdown', event => { pointer = event.clientX; });
    run.addEventListener('pointerup', event => {
      if (pointer === undefined || busy || gates.firstElementChild?.disabled) return;
      const delta = event.clientX - pointer;
      pointer = undefined;
      if (Math.abs(delta) > 32) {
        steered = true;
        selectLane(Math.max(0, Math.min(gates.children.length - 1, (delta < 0 ? Math.ceil(lane) - 1 : Math.floor(lane) + 1))));
      }
    });
    screen.addEventListener('keydown', event => {
      if (run.hidden || busy || gates.firstElementChild?.disabled) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        steered = true;
        selectLane(Math.max(0, Math.min(gates.children.length - 1, (event.key === 'ArrowLeft' ? Math.ceil(lane) - 1 : Math.floor(lane) + 1))), true);
      }
    });
    $('[data-close]').onclick = close;
    screen.addEventListener('cancel', event => { event.preventDefault(); close(); });
    const watch = setInterval(() => { if (!sameAccount()) close(); }, 350);
    document.body.append(screen);
    screen.showModal();
    showMenu();
  }
})();
