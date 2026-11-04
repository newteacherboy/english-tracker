(() => {
  'use strict';
  const assets = 'premium-assets/bulut-ucusu/';
  const endpoint = (typeof apiURL === 'string' ? apiURL :
    'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/, 'premium-games');
  const waveMs = 4200;
  const lanes = [17, 50, 83];
  const owner = () => typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi;
  let opening = false;

  async function request(token, op, data = {}) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({game: 'cloud-flight', t: token, op, ...data}),
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.mesaj || 'Bağlantı kurulamadı.');
    return result;
  }

  window.premiumBulutUcusuAc = async function () {
    if (opening || document.querySelector('.dm-flight')) return;
    const account = owner();
    const token = localStorage.getItem('ing_token') || '';
    opening = true;
    try {
      await new Promise((resolve, reject) => {
        let style = document.getElementById('dm-flight-style');
        if (style?.sheet) return resolve();
        style ||= document.createElement('link');
        style.id = 'dm-flight-style';
        style.rel = 'stylesheet';
        style.href = 'premium-cloud-flight.css?v=1';
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
    screen.setAttribute('aria-label', 'Papi’nin Bulut Uçuşu');
    screen.innerHTML = `
      <div class="dm-flight-world" hidden>
        <div class="dm-flight-hud">
          <button data-pause aria-label="Duraklat">Ⅱ</button><b data-level></b>
          <span data-count></span><progress max="20" value="0" aria-label="Bölüm ilerlemesi"></progress>
          <b data-score></b>
        </div>
        <div class="dm-flight-plan" data-plan></div>
        <div class="dm-flight-word" data-word lang="en"></div>
        <div class="dm-flight-wave">${lanes.map(x => `<div class="dm-flight-cloud" style="--lane:${x}%"><span></span></div>`).join('')}</div>
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
    const feedback = $('.dm-flight-feedback');
    const clouds = [...wave.children];
    let state = initial;
    let game = null;
    let frame = 0;
    let runId;
    let pending = false;
    let pointer = null;

    function close() {
      cancelAnimationFrame(frame);
      clearInterval(watch);
      screen.close();
      screen.remove();
    }
    function openPanel(title, details, actions) {
      panel.replaceChildren();
      const heading = document.createElement('h2');
      heading.textContent = title;
      panel.append(heading);
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
      panel.querySelector('button')?.focus({preventScroll: true});
    }
    function apply(data) {
      state = {...state, ...data};
      if (data.energyMax) window.headerEnerjiGoster?.(data.energy, data.energyMax);
      if (data.yo) window.dmApplyRewardState?.(data.yo, account);
    }
    function home(error) {
      world.hidden = true;
      const plan = state.premium ? 'Premium ∞' : `Ücretsiz: ${state.remaining} hak`;
      const actions = state.remaining > 0 ? [[`Bölüm ${state.level} · ⚡ 5`, start]] : [];
      actions.push(['Oyunlara dön', close]);
      openPanel('Papi’nin Bulut Uçuşu', [
        plan, `Enerji ${state.energy} / ${state.energyMax}`,
        error || (state.remaining > 0 ? 'Uçağı kaydır ve İngilizce kelimenin Türkçe anlamına uç.' : 'Üç ücretsiz denemeni kullandın. Premium ile sınırsız uçabilirsin.')
      ], actions);
    }
    async function start() {
      if (pending) return;
      pending = true;
      runId ||= crypto.randomUUID();
      openPanel('Uçuş hazırlanıyor…', [], []);
      try {
        const data = await request(token, 'start', {runId});
        if (!screen.isConnected) return;
        apply(data);
        game = {rounds: data.rounds, level: data.playedLevel, picks: [], score: 0,
          x: 50, target: 50, elapsed: 0, last: null, paused: false};
        world.hidden = false;
        overlay.hidden = true;
        $('[data-plan]').textContent = data.premium ? '👑 Premium ∞' : `Ücretsiz: ${data.remaining} hak`;
        $('[data-level]').textContent = `Bölüm ${game.level}`;
        loadRound();
        frame = requestAnimationFrame(tick);
      } catch (error) {
        if (screen.isConnected) home(error.message);
      } finally {
        pending = false;
      }
    }
    function paintScore() {
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
      paintScore();
    }
    function tick(now) {
      if (game.paused) return;
      const dt = game.last === null ? 0 : Math.min(now - game.last, 50);
      game.last = now;
      game.elapsed += dt;
      game.x += (game.target - game.x) * (1 - Math.exp(-dt / 80));
      plane.style.left = `${game.x}%`;
      const depth = Math.min(1, game.elapsed / waveMs);
      wave.style.setProperty('--y', `${40 + depth * depth * 30}%`);
      wave.style.setProperty('--scale', 0.85 + depth * 0.15);
      if (game.elapsed >= waveMs) {
        const pick = lanes.findIndex(lane => Math.abs(lane - game.x) <= 13);
        const correct = pick === game.rounds[game.picks.length].answer;
        game.picks.push(pick);
        game.score += correct ? 20 : pick < 0 ? 0 : -10;
        if (pick >= 0) {
          const burst = document.createElement('div');
          burst.className = 'dm-flight-burst';
          burst.style.left = `${lanes[pick]}%`;
          burst.dataset.correct = String(correct);
          world.append(burst);
          burst.addEventListener('animationend', () => burst.remove(), {once: true});
        }
        feedback.textContent = correct ? '+20' : pick < 0 ? 'Bulut geçildi' : '−10';
        feedback.dataset.correct = String(correct);
        feedback.getAnimations().forEach(animation => animation.cancel());
        feedback.animate([{opacity: 1, transform: 'translateY(0)'}, {opacity: 0, transform: 'translateY(-20px)'}],
          {duration: 720, fill: 'both'});
        if (game.picks.length === game.rounds.length) {
          paintScore();
          void finish();
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
        const next = result.hasMore && result.remaining > 0;
        openPanel(`Bölüm ${result.playedLevel} tamamlandı`, [
          `Doğru ${result.correct} / ${result.total} · Yanlış ${result.wrong} · Boş ${result.total - result.correct - result.wrong}`,
          `Puan ${result.score} · ${result.stars} yıldız`,
          `+${result.xp} XP · +${result.gold} altın`,
          !result.hasMore ? 'Tüm kelimeleri tamamladın!' : `Açılan bölüm ${result.level}`
        ], [...(next ? [[`Sonraki bölüm · ⚡ 5`, start]] : []), ['Oyunlara dön', close]]);
      } catch (error) {
        if (screen.isConnected) openPanel('Sonuç kaydediliyor', [error.message], [['Tekrar dene', finish]]);
      }
    }
    function pause() {
      if (!game || game.paused || !overlay.hidden) return;
      game.paused = true;
      pointer = null;
      cancelAnimationFrame(frame);
      openPanel('Uçuş duraklatıldı', [], [
        ['Devam et', () => {
          overlay.hidden = true;
          game.paused = false;
          game.last = null;
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
