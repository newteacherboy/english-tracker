(() => {
  'use strict';
  const assets = 'premium-assets/bulut-ucusu/';
  const endpoint = (typeof apiURL === 'string' ? apiURL :
    'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/, 'premium-games');
  const waveMs = 3250;
  const mistakeLimit = 5;
  const lanes = [17, 50, 83];
  const owner = () => typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi;
  let opening = false;

  const hazards = [
    {kind: 'storm', icon: 'ϟ', label: 'Fırtına bulutu'},
    {kind: 'balloon', icon: '◈', label: 'Hava balonu'},
    {kind: 'wind', icon: '≋', label: 'Rüzgâr girdabı'}
  ];

  function flightAudio() {
    const melody = [523, 0, 659, 784, 659, 0, 587, 659, 440, 0, 523, 659, 587, 0, 392, 0];
    let context, bus, engine, music, musicTimer, beat = 0;
    let muted = localStorage.getItem('dm_cloud_muted') === '1';
    function unlock() {
      if (muted) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!context && Audio) {
          context = new Audio();
          bus = context.createGain();
          bus.connect(context.destination);
          music = context.createGain();
          music.gain.value = 0;
          music.connect(bus);
          engine = context.createGain();
          engine.gain.value = 0;
          const filter = context.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 200;
          engine.connect(filter).connect(bus);
          for (const [type, frequency] of [['triangle', 54], ['sine', 81]]) {
            const motor = context.createOscillator();
            motor.type = type;
            motor.frequency.value = frequency;
            motor.connect(engine);
            motor.start();
          }
        }
        context?.resume().catch(() => {});
      } catch { /* Sound is optional on devices without Web Audio. */ }
    }
    function note(frequency, at, duration, volume, destination, type = 'sine') {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + .014);
      gain.gain.exponentialRampToValueAtTime(.001, at + duration);
      oscillator.connect(gain).connect(destination);
      oscillator.start(at);
      oscillator.stop(at + duration + .01);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    function playBeat() {
      const at = context.currentTime + .015;
      const pitch = melody[beat];
      if (pitch) note(pitch, at, .17, .024, music, 'triangle');
      if (beat % 4 === 0) note([131, 165, 110, 98][beat / 4], at, .25, .034, music);
      beat = (beat + 1) % melody.length;
    }
    function flying(active) {
      if (!engine || !music) return;
      const audible = active && !document.hidden && !muted;
      engine.gain.setTargetAtTime(audible ? .032 : 0, context.currentTime, .08);
      music.gain.setTargetAtTime(audible ? 1 : 0, context.currentTime, .08);
      if (audible && !musicTimer) {
        playBeat();
        musicTimer = setInterval(playBeat, 245);
      }
      if (!audible) {
        clearInterval(musicTimer);
        musicTimer = undefined;
      }
    }
    function effect(kind) {
      if (!context || muted || document.hidden) return;
      const notes = kind === 'correct' ? [587, 784, 1047] : kind === 'wrong' ? [294, 196] : [118, 74];
      notes.forEach((frequency, index) =>
        note(frequency, context.currentTime + index * .08, .16, .065, bus, kind === 'impact' ? 'triangle' : 'sine'));
    }
    return {
      unlock, flying, effect, get muted() { return muted; },
      toggle(active) {
        muted = !muted;
        localStorage.setItem('dm_cloud_muted', muted ? '1' : '0');
        unlock();
        if (bus) bus.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, .035);
        flying(active);
      },
      close() { clearInterval(musicTimer); context?.close().catch(() => {}); }
    };
  }

  async function request(token, op, data = {}) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({game: 'cloud-flight', t: token, op, ...data}),
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw Object.assign(new Error(result.mesaj || 'Bağlantı kurulamadı.'), {code:result.hata});
    return result;
  }

  window.premiumBulutUcusuAc = async function () {
    if (opening || document.querySelector('.dm-flight')) return;
    const account = owner();
    const token = (window.dmTeacherPortalMode ? sessionStorage.getItem('ing_ogr_token') : '') || localStorage.getItem('ing_token') || '';
    opening = true;
    try {
      await new Promise((resolve, reject) => {
        let style = document.getElementById('dm-flight-style');
        if (style?.sheet) return resolve();
        style ||= document.createElement('link');
        style.id = 'dm-flight-style';
        style.rel = 'stylesheet';
        style.href = 'premium-cloud-flight.css?v=3';
        style.onload = resolve;
        style.onerror = () => { style.remove(); reject(new Error('Oyun görünümü yüklenemedi.')); };
        document.head.append(style);
      });
      const status = await request(token, 'status');
      if (owner() === account) mount(account, token, status);
    } catch (error) {
      window.yoToast?.(error.message);
    } finally {
      opening = false;
    }
  };

  function mount(account, token, initial) {
    const screen = document.createElement('dialog');
    screen.className = 'dm-flight';
    screen.setAttribute('aria-label', 'Kaptan Pilot Papi');
    screen.innerHTML = `
      <div class="dm-flight-world" hidden>
        <div class="dm-flight-hud">
          <button data-pause aria-label="Duraklat">Ⅱ</button><b data-level></b>
          <span data-count></span><progress max="20" value="0" aria-label="Bölüm ilerlemesi"></progress>
          <b data-score></b><button data-sound type="button"></button>
        </div>
        <div class="dm-flight-badges"><div class="dm-flight-plan" data-plan></div><div class="dm-flight-lives" data-lives></div></div>
        <div class="dm-flight-word" data-word lang="en"></div>
        <div class="dm-flight-wave">${lanes.map(x => `<div class="dm-flight-cloud" style="--lane:${x}%"><span></span></div>`).join('')}</div>
        <div class="dm-flight-hazard" hidden><i aria-hidden="true"></i><span></span></div>
        <div class="dm-flight-plane"><img src="${assets}papi-ucak.webp" alt=""></div>
        <div class="dm-flight-feedback" aria-live="polite"></div>
        <div class="dm-flight-hint">↔ Uçağı kaydır</div>
      </div>
      <div class="dm-flight-overlay"><section></section></div>`;
    document.body.append(screen);
    const $ = selector => screen.querySelector(selector);
    const world = $('.dm-flight-world');
    const overlay = $('.dm-flight-overlay');
    const panel = overlay.querySelector('section');
    const wave = $('.dm-flight-wave');
    const plane = $('.dm-flight-plane');
    const hazard = $('.dm-flight-hazard');
    const sound = flightAudio();
    const feedback = $('.dm-flight-feedback');
    const clouds = [...wave.children];
    let state = initial;
    let game = null;
    let frame = 0;
    let resultTimer;
    let runId;
    let pending = false;
    let pointer = null;

    function close() {
      cancelAnimationFrame(frame);
      clearInterval(watch);
      clearTimeout(resultTimer);
      sound.close();
      document.removeEventListener('visibilitychange', syncSound);
      screen.close();
      screen.remove();
    }
    function openPanel(title, details, actions, variant = '') {
      panel.dataset.variant = variant;
      panel.replaceChildren();
      const heading = document.createElement('h2');
      heading.textContent = title;
      panel.append(heading);
      if (variant === 'hangar') {
        const art = document.createElement('img');
        art.className = 'dm-flight-hero';
        art.src = assets + 'papi-ucak.webp';
        art.alt = '';
        heading.before(art);
      }
      details.forEach(line => {
        const p = document.createElement('p');
        p.textContent = line;
        panel.append(p);
      });
      actions.forEach(([label, action]) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.onclick = action;
        panel.append(button);
      });
      overlay.hidden = false;
      syncSound();
      panel.querySelector('button')?.focus({preventScroll: true});
    }
    function syncSound() { sound.flying(!world.hidden && overlay.hidden && !game?.ending); }
    function paintSound() {
      const button = $('[data-sound]');
      const waves = sound.muted ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M16 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/>';
      button.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h4l5-4v14l-5-4H3z"/>${waves}</svg>`;
      button.setAttribute('aria-label', sound.muted ? 'Sesi aç' : 'Sesi kapat');
      button.setAttribute('aria-pressed', String(!sound.muted));
    }
    function stats(items) {
      const grid = document.createElement('div');
      grid.className = 'dm-flight-stats';
      for (const [value, label] of items) {
        const tile = document.createElement('div');
        const number = document.createElement('b');
        const caption = document.createElement('small');
        number.textContent = value;
        caption.textContent = label;
        tile.append(number, caption);
        grid.append(tile);
      }
      panel.insertBefore(grid, panel.querySelector('button'));
    }
    function route(level, completed, last = false) {
      const path = document.createElement('ol');
      path.className = 'dm-flight-route';
      path.setAttribute('aria-label', 'Bölüm rotası');
      for (let number = Math.max(1, level - 3); number <= level + (last ? 0 : 2); number++) {
        const stop = document.createElement('li');
        const done = number < level || number === level && completed;
        stop.textContent = done ? `✓ ${number}` : String(number);
        stop.dataset.stop = done ? 'done' : number === level ? 'current' : 'locked';
        stop.setAttribute('aria-label', `Bölüm ${number}, ${done ? 'geçildi' : number === level ? 'açık' : 'kilitli'}`);
        path.append(stop);
      }
      const action = panel.querySelector('button');
      panel.insertBefore(path, action);
      const earlier = level - 4;
      if (earlier > 0) {
        const history = document.createElement('details');
        const label = document.createElement('summary');
        label.textContent = 'Önceki geçilen bölümler';
        const stops = document.createElement('ol');
        stops.className = 'dm-flight-route';
        for (let number = 1; number <= earlier; number++) {
          const stop = document.createElement('li');
          stop.dataset.stop = 'done';
          stop.textContent = `✓ ${number}`;
          stop.setAttribute('aria-label', `Bölüm ${number}, geçildi`);
          stops.append(stop);
        }
        history.append(label, stops);
        panel.insertBefore(history, action);
      }
    }
    function apply(data) {
      state = {...state, ...data};
      if (data.energyMax) window.headerEnerjiGoster?.(data.energy, data.energyMax);
      if (data.yo) window.dmApplyRewardState?.(data.yo, account);
    }
    function home(error) {
      world.hidden = true;
      const plan = state.premium ? 'Premium ∞' : `Ücretsiz: ${state.remaining} hak`;
      const actions = !state.completed && state.remaining > 0 ? [[`Bölüm ${state.level} · ⚡ 5`, start]] : [];
      actions.push(['Oyunlara dön', close]);
      openPanel('Kaptan Pilot Papi', [
        error || (state.completed ? 'Tüm uçuş rotasını tamamladın!' : state.remaining > 0 ? 'Doğru anlamın yazdığı buluta uç, gökyüzündeki engellerden sıyrıl.' : 'Üç ücretsiz denemeni kullandın. Premium ile sınırsız uçabilirsin.')
      ], actions, 'hangar');
      if (!error && !state.completed && state.remaining > 0) {
        const rules = document.createElement('p');
        rules.className = 'dm-flight-rules';
        rules.textContent = '✓ Doğru +20 · ✗ Yanlış −10 · 5 hatada düşüş';
        panel.insertBefore(rules, panel.querySelector('button'));
      }
      route(state.level, state.completed, state.completed);
      stats([[`Bölüm ${state.level}`, state.words ? `${state.words} kelime` : 'Gece rotası'], [`${state.energy} / ${state.energyMax}`, 'Enerji'], [plan, 'Uçuş hakkı']]);
    }
    async function start() {
      if (pending) return;
      pending = true;
      sound.unlock();
      runId ||= crypto.randomUUID();
      openPanel('Uçuş hazırlanıyor…', [], []);
      try {
        const data = await request(token, 'start', {runId});
        if (!screen.isConnected) return;
        apply(data);
        game = {rounds: data.rounds, level: data.playedLevel, picks: [], score: 0, wrong: 0,
          x: 50, target: 50, elapsed: 0, last: null, paused: false, obstacle: null, stumble: 0};
        plane.classList.remove('dm-flight-crash');
        wave.hidden = false;
        world.hidden = false;
        overlay.hidden = true;
        syncSound();
        $('[data-plan]').textContent = data.premium ? '👑 Premium ∞' : `Ücretsiz: ${data.remaining} hak`;
        $('[data-level]').textContent = `Bölüm ${game.level}`;
        loadRound();
        frame = requestAnimationFrame(tick);
      } catch (error) {
        if (screen.isConnected) { home(error.message); window.DijiMeduPapiFeedback?.energyDenied(error); }
      } finally {
        pending = false;
      }
    }
    function paintScore() {
      $('[data-lives]').textContent = `Hata ${game.wrong} / ${mistakeLimit}`;
      $('[data-score]').textContent = `★ ${game.score}`;
      $('[data-count]').textContent = `${game.picks.length} / ${game.rounds.length}`;
      const bar = $('progress');
      bar.max = game.rounds.length;
      bar.value = game.picks.length;
    }
    function loadRound() {
      const round = game.rounds[game.picks.length];
      $('[data-word]').textContent = round.en;
      round.options.forEach((word, index) => { clouds[index].firstChild.textContent = word; });
      const index = game.picks.length;
      const obstacleIndex = Math.floor(index / 3) + game.level - 1;
      const kind = hazards[obstacleIndex % hazards.length];
      game.obstacle = index % 3 === 2 ? {lane: lanes[(obstacleIndex + index) % lanes.length], kind: kind.kind, passed: false} : null;
      hazard.hidden = !game.obstacle;
      if (game.obstacle) {
        hazard.dataset.kind = kind.kind;
        hazard.firstElementChild.textContent = kind.icon;
        hazard.lastElementChild.textContent = kind.label;
        hazard.style.left = `${game.obstacle.lane}%`;
        hazard.style.setProperty('--hazard-y', '29%');
        hazard.style.setProperty('--hazard-size', '.56');
      }
      paintScore();
    }
    function showFeedback(label, correct) {
      feedback.textContent = label;
      feedback.dataset.correct = String(correct);
      feedback.getAnimations().forEach(animation => animation.cancel());
      feedback.animate([{opacity: 1, transform: 'translateY(0)'}, {opacity: 0, transform: 'translateY(-20px)'}],
        {duration: 720, fill: 'both'});
    }
    function stumble() {
      game.stumble = 560;
      const sprite = plane.querySelector('img');
      sprite.getAnimations().forEach(animation => animation.cancel());
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        sprite.animate([
          {transform: 'translateX(0) rotate(0)'},
          {transform: 'translateX(-9%) rotate(-18deg)'},
          {transform: 'translateX(8%) rotate(14deg)'},
          {transform: 'translateX(-4%) rotate(-7deg)'},
          {transform: 'translateX(0) rotate(0)'}
        ], {duration: 550, easing: 'ease-out'});
      }
    }
    function wrongCloud(pick) {
      const impact = clouds[pick].cloneNode(true);
      impact.classList.add('dm-flight-wrong-cloud');
      impact.setAttribute('aria-hidden', 'true');
      const cross = document.createElement('b');
      cross.textContent = '✕';
      impact.append(cross);
      world.append(impact);
      impact.addEventListener('animationend', () => impact.remove(), {once: true});
      stumble();
    }
    function tick(now) {
      if (game.paused) return;
      const dt = game.last === null ? 0 : Math.min(now - game.last, 50);
      game.last = now;
      game.elapsed += dt;
      game.stumble = Math.max(0, game.stumble - dt);
      plane.style.setProperty('--bank', `${Math.max(-13, Math.min(13, (game.target - game.x) * .55))}deg`);
      game.x += (game.target - game.x) * (1 - Math.exp(-dt / (game.stumble ? 200 : 80)));
      plane.style.left = `${game.x}%`;
      const depth = Math.min(1, game.elapsed / waveMs);
      wave.style.setProperty('--y', `${40 + depth * depth * 30}%`);
      wave.style.setProperty('--scale', 0.85 + depth * 0.15);
      const obstacle = game.obstacle;
      if (obstacle && !obstacle.passed) {
        const approach = Math.min(1, depth / .65);
        const sway = obstacle.kind === 'balloon' ? 10 : obstacle.kind === 'wind' ? 16 : 0;
        const hazardX = obstacle.lane + Math.sin(approach * 5) * sway;
        hazard.style.left = `${hazardX}%`;
        hazard.style.setProperty('--hazard-y', `${29 + 41 * approach ** 1.6}%`);
        hazard.style.setProperty('--hazard-size', .56 + .62 * approach);
        if (approach === 1) {
          obstacle.passed = true;
          hazard.hidden = true;
          if (Math.abs(hazardX - game.x) <= 13) {
            sound.effect('impact');
            stumble();
            showFeedback('Türbülans!', false);
          }
        }
      }
      if (game.elapsed >= waveMs) {
        const pick = lanes.findIndex(lane => Math.abs(lane - game.x) <= 13);
        const correct = pick === game.rounds[game.picks.length].answer;
        game.picks.push(pick);
        game.score += correct ? 20 : pick < 0 ? 0 : -10;
        if (correct) {
          const burst = document.createElement('div');
          burst.className = 'dm-flight-burst';
          burst.style.left = `${lanes[pick]}%`;
          world.append(burst);
          burst.addEventListener('animationend', () => burst.remove(), {once: true});
        }
        if (pick >= 0) sound.effect(correct ? 'correct' : 'wrong');
        if (pick >= 0 && !correct) {
          game.wrong++;
          wrongCloud(pick);
        }
        showFeedback(correct ? 'Doğru +20' : pick < 0 ? 'Bulut geçildi' : 'Yanlış −10', correct);
        const crashed = game.wrong === mistakeLimit;
        if (crashed || game.picks.length === game.rounds.length) {
          paintScore();
          game.ending = true;
          syncSound();
          if (crashed) {
            wave.hidden = true;
            hazard.hidden = true;
            plane.classList.add('dm-flight-crash');
            showFeedback('Uçak düşüyor! −10', false);
            sound.effect('impact');
            resultTimer = setTimeout(finish, 820);
          } else if (pick >= 0 && !correct) resultTimer = setTimeout(finish, 560);
          else void finish();
          return;
        }
        game.elapsed -= waveMs;
        loadRound();
      }
      frame = requestAnimationFrame(tick);
    }
    async function finish() {
      openPanel('Sonuç hesaplanıyor…', [], []);
      try {
        const result = await request(token, 'finish', {runId, selections: game.picks});
        if (!screen.isConnected) return;
        apply(result);
        runId = undefined;
        const next = (result.crashed || result.hasMore) && result.remaining > 0;
        openPanel(result.crashed ? 'Uçuş sona erdi' : `Bölüm ${result.playedLevel} tamamlandı`, [
          result.crashed ? `5 hata yaptın. Bölüm ${result.playedLevel} tamamlanmadı.` : !result.hasMore ? 'Tüm kelimeleri tamamladın!' : `Açılan bölüm ${result.level}`
        ], [...(next ? [[result.crashed ? 'Tekrar uç · ⚡ 5' : 'Sonraki bölüm · ⚡ 5', start]] : []), ['Oyunlara dön', close]], 'results');
        const stars = document.createElement('div');
        stars.className = 'dm-flight-stars';
        stars.textContent = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
        stars.setAttribute('aria-label', `${result.stars} yıldız`);
        panel.prepend(stars);
        route(result.level, !!result.completed, !!result.completed);
        stats([[result.score, 'Uçuş puanı'], [`${result.correct} / ${result.total}`, 'Doğru'],
          [result.wrong, 'Yanlış'], [(result.played ?? result.total) - result.correct - result.wrong, 'Boş'],
          [`+${result.xp}`, 'XP'], [`+${result.gold}`, 'Altın']]);
      } catch (error) {
        if (screen.isConnected) openPanel('Sonuç kaydediliyor', [error.message], [['Tekrar dene', finish]]);
      }
    }
    function pause() {
      if (!game || game.ending || game.paused || !overlay.hidden) return;
      game.paused = true;
      pointer = null;
      cancelAnimationFrame(frame);
      openPanel('Uçuş duraklatıldı', [], [
        ['Devam et', () => {
          overlay.hidden = true;
          game.paused = false;
          game.last = null;
          sound.unlock();
          syncSound();
          frame = requestAnimationFrame(tick);
        }],
        ['Uçuştan çık', close]
      ]);
    }
    function move(event) {
      const box = world.getBoundingClientRect();
      game.target = Math.max(12, Math.min(88, (event.clientX - box.left) / box.width * 100));
    }
    world.onpointerdown = event => {
      if (!game || game.paused || event.target.closest('button') || pointer !== null) return;
      pointer = event.pointerId;
      world.setPointerCapture(pointer);
      move(event);
    };
    world.onpointermove = event => { if (event.pointerId === pointer) move(event); };
    world.onlostpointercapture = () => { pointer = null; };
    $('[data-pause]').onclick = pause;
    $('[data-sound]').onclick = () => { sound.toggle(overlay.hidden && !game?.ending); paintSound(); };
    document.addEventListener('visibilitychange', syncSound);
    paintSound();
    screen.addEventListener('cancel', event => {
      event.preventDefault();
      if (overlay.hidden) pause();
      else if (world.hidden && !pending) close();
    });
    screen.addEventListener('keydown', event => {
      if (!game || !overlay.hidden || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const current = lanes.reduce((best, lane, index) => Math.abs(lane - game.target) < Math.abs(lanes[best] - game.target) ? index : best, 0);
      game.target = lanes[Math.max(0, Math.min(2, current + (event.key === 'ArrowLeft' ? -1 : 1)))];
    });
    const watch = setInterval(() => { if (owner() !== account) close(); }, 700);
    screen.showModal();
    home();
  }
})();
