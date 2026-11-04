(() => {
  'use strict';
  const endpoint = (typeof apiURL === 'string' ? apiURL :
    'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/, 'premium-games');
  const account = () => typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi;
  const token = () => localStorage.getItem('ing_token') || '';
  let opening = false;
  let styles;

  async function request(session, op, payload = {}) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({game: 'runners-papi', t: session, op, ...payload}),
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw Error(data.mesaj || 'Orman Köprüsü’ne bağlanılamadı.');
    return data;
  }

  function loadStyles() {
    return styles ??= new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'runners-papi.css?v=1';
      link.onload = resolve;
      link.onerror = () => {
        styles = null;
        link.remove();
        reject(Error('Orman Köprüsü yüklenemedi.'));
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
      <header><b>★ PREMİUM</b><button type="button" data-close aria-label="Oyunu kapat">×</button></header>
      <section class="rp-menu">
        <p>ORMAN KÖPRÜSÜ</p><h1>Runners Papi</h1>
        <img src="papi-welcome-v2.png" alt="">
        <p data-summary></p><p data-access></p>
        <button type="button" data-start></button>
      </section>
      <section class="rp-run" hidden>
        <div class="rp-hud"><b data-level></b><b data-flock></b><b data-best></b></div>
        <progress aria-label="Kapıya kalan süre" max="1" value="1"></progress>
        <div class="rp-prompt"><small data-bonus></small><strong data-word lang="en"></strong></div>
        <div class="rp-track" aria-hidden="true"></div>
        <div class="rp-gates" aria-label="Türkçe anlam kapıları"></div>
        <div class="rp-flock" aria-hidden="true"></div>
      </section>
      <p class="rp-message" role="status"></p><button type="button" data-retry hidden>Tekrar dene</button>`;
    const $ = selector => screen.querySelector(selector);
    const menu = $('.rp-menu'), run = $('.rp-run'), gates = $('.rp-gates');
    const start = $('[data-start]'), retry = $('[data-retry]'), message = $('.rp-message');
    let busy = false, frame = 0, transition = 0, startId, pointer;
    const sameAccount = () => owner === account() && session === token();
    const active = () => screen.open && sameAccount();
    const number = new Intl.NumberFormat('tr-TR', {notation: 'compact', maximumFractionDigits: 1});
    let lane = 0, steered = false;

    function close() {
      cancelAnimationFrame(frame);
      clearTimeout(transition);
      clearInterval(watch);
      screen.close();
      screen.remove();
    }

    function showMenu(ended = false) {
      run.hidden = true;
      menu.hidden = false;
      $('[data-summary]').textContent = (ended ? `Koşu bitti · Seviye ${state.level}. ` : '') +
        `Rekor: ${number.format(state.best)} papağan · En iyi seviye: ${state.bestLevel || '—'}`;
      $('[data-access]').textContent = state.flock > 0 ? 'Koşun kaydedildi. Kaldığın kapıdan devam et.' :
        `5 enerji · ${state.premium ? 'Premium sınırsız' : `${state.remaining} ücretsiz hak`}`;
      start.textContent = state.flock > 0 ? 'Devam Et' : ended ? 'Yeniden Koş' : 'Koşuya Başla';
      start.disabled = state.flock === 0 && ((!state.premium && !state.remaining) || state.energy < 5);
    }

    function selectLane(index, focus = false) {
      if (!gates.children[index]) return;
      lane = index;
      gates.style.setProperty('--lane', String(index));
      $('.rp-flock').style.setProperty('--lane', String(index));
      [...gates.children].forEach((button, i) => button.classList.toggle('rp-selected', i === index));
      if (focus) gates.children[index].focus({preventScroll: true});
    }

    function playGate() {
      if (!active()) return;
      if (!state.question) { showMenu(true); return; }
      menu.hidden = true;
      run.hidden = false;
      message.textContent = '';
      gates.replaceChildren();
      const options = state.question.options;
      screen.style.setProperty('--lanes', String(options.length));
      $('[data-level]').textContent = `Seviye ${state.level}`;
      $('[data-flock]').textContent = `🦜 ${number.format(state.flock)}`;
      $('[data-best]').textContent = `🏆 ${number.format(state.best)}`;
      $('[data-word]').textContent = state.question.word;
      $('[data-bonus]').textContent = state.question.bonus ? '×2 BONUS KAPISI' : 'TÜRKÇE ANLAMINI BUL';
      options.forEach((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option;
        button.onclick = () => { selectLane(index); answer(index); };
        gates.append(button);
      });
      steered = false;
      selectLane(Math.floor((options.length - 1) / 2));
      const flock = $('.rp-flock');
      flock.replaceChildren();
      for (let i = 0; i < Math.min(18, state.flock); i++) {
        const image = document.createElement('img');
        image.src = 'papi-welcome-v2.png';
        image.alt = '';
        flock.append(image);
      }
      const duration = Math.max(4200, 8500 - (state.level - 1) * 440);
      let remaining = duration, previous = performance.now();
      const progress = $('progress');
      progress.value = 1;
      function tick(now) {
        if (!active()) return;
        const elapsed = now - previous;
        if (!document.hidden && elapsed < 300) remaining -= elapsed;
        previous = now;
        progress.value = Math.max(0, remaining / duration);
        if (remaining <= 0) answer(steered ? lane : -1);
        else frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }

    async function send(op, payload, done) {
      if (busy || !active()) return;
      busy = true;
      retry.hidden = true;
      message.textContent = 'Kaydediliyor…';
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
      [...gates.children].forEach(button => { button.disabled = true; });
      const payload = {runId: state.runId, gate: state.gate, choice};
      send('answer', payload, () => {
        const feedback = state.feedback;
        if (feedback?.gate !== payload.gate) { playGate(); return; }
        message.textContent = feedback.correct ? `Doğru! +${feedback.change} papağan` :
          `${choice === -1 ? 'Süre doldu' : 'Yanlış kapı'} · ${feedback.meaning} · ${feedback.change} papağan`;
        screen.dataset.outcome = feedback.correct ? 'correct' : 'wrong';
        transition = setTimeout(() => {
          delete screen.dataset.outcome;
          if (!state.question) message.textContent = '';
          playGate();
        }, 850);
      });
    }

    start.onclick = () => {
      if (state.flock > 0) { playGate(); return; }
      start.disabled = true;
      startId ??= crypto.randomUUID();
      send('start', {runId: startId}, () => { startId = null; playGate(); });
    };
    run.addEventListener('pointerdown', event => { pointer = event.clientX; });
    run.addEventListener('pointerup', event => {
      if (pointer === undefined || busy || gates.firstElementChild?.disabled) return;
      const delta = event.clientX - pointer;
      pointer = undefined;
      if (Math.abs(delta) > 32) {
        steered = true;
        selectLane(Math.max(0, Math.min(gates.children.length - 1, lane + Math.sign(delta))));
      }
    });
    screen.addEventListener('keydown', event => {
      if (run.hidden || busy || gates.firstElementChild?.disabled) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        steered = true;
        selectLane(Math.max(0, Math.min(gates.children.length - 1, lane + (event.key === 'ArrowLeft' ? -1 : 1))), true);
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
