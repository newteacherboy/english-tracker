(() => {
  'use strict';
  const api = (typeof apiURL === 'string' ? apiURL :
    'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/, 'premium-games');
  const styles = 'premium-word-blocks.css?v=1';
  const assets = 'premium-assets/kelime-bloklari/';
  const rows = 8;
  const player = () => typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi;
  let opening = false;

  async function call(token, op, payload = {}) {
    const response = await fetch(api, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({game: 'word-blocks', t: token, op, ...payload})
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.mesaj || 'Bağlantı kurulamadı.');
    return data;
  }

  window.premiumKelimeBloklariAc = async () => {
    if (opening || document.querySelector('.dm-blocks')) return;
    opening = true;
    const account = player(), token = localStorage.getItem('ing_token') || '';
    try {
      const style = document.querySelector('link[href="' + styles + '"]');
      if (!style?.sheet) await new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styles;
        link.onload = resolve;
        link.onerror = () => { link.remove(); reject(new Error('Oyun görünümü yüklenemedi.')); };
        document.head.append(link);
      });
      const state = await call(token, 'status');
      if (account === player()) mount(account, token, state);
    } catch (error) {
      window.yoToast?.(error.message);
    } finally {
      opening = false;
    }
  };

  function mount(account, token, initial) {
    const dialog = document.createElement('dialog');
    dialog.className = 'dm-blocks';
    dialog.setAttribute('aria-label', 'Papi’nin Kelime Blokları');
    dialog.innerHTML = `
      <div class="dm-blocks-world" hidden>
        <header><button data-pause aria-label="Duraklat">Ⅱ</button><h2><img src="${assets}papi.webp" alt="">Papi’nin<br>Kelime Blokları</h2><span data-plan></span></header>
        <div class="dm-blocks-hud"><span data-level></span><span data-progress></span><span data-score></span><span data-errors></span></div>
        <div class="dm-blocks-frame"><div class="dm-blocks-board" aria-label="Blok tahtası">
          <div class="dm-blocks-stack"></div><div class="dm-blocks-fx"></div><div class="dm-blocks-piece" lang="en"></div>
        </div><div class="dm-blocks-answers">${[0,1,2].map(i => `<button data-lane="${i}"></button>`).join('')}</div></div>
        <div class="dm-blocks-controls">
          <button data-left aria-label="Sola kaydır">←</button><button data-drop aria-label="Bloğu indir">↓</button>
          <button data-right aria-label="Sağa kaydır">→</button><button data-rotate aria-label="Bloğu döndür" hidden>↻</button>
        </div>
        <p class="dm-blocks-feedback" aria-live="polite"></p>
      </div>
      <div class="dm-blocks-overlay"><section></section></div>`;
    document.body.append(dialog);
    const $ = key => dialog.querySelector(key);
    const world = $('.dm-blocks-world'), overlay = $('.dm-blocks-overlay');
    const panel = overlay.firstElementChild, board = $('.dm-blocks-board'), piece = $('.dm-blocks-piece');
    const answers = [...dialog.querySelectorAll('[data-lane]')];
    let state = initial, game, runId, frame, resultTimer, busy = false;

    function close() {
      cancelAnimationFrame(frame);
      clearInterval(watch);
      clearTimeout(resultTimer);
      dialog.close();
      dialog.remove();
    }
    function show(title, lines, actions) {
      panel.replaceChildren();
      const heading = document.createElement('h2');
      heading.textContent = title;
      panel.append(heading);
      for (const line of lines) {
        const p = document.createElement('p');
        p.textContent = line;
        panel.append(p);
      }
      for (const [label, action] of actions) {
        const button = document.createElement('button');
        button.textContent = label;
        button.onclick = action;
        panel.append(button);
      }
      overlay.hidden = false;
      panel.querySelector('button')?.focus();
    }
    function update(data) {
      state = {...state, ...data};
      if (data.energyMax) window.headerEnerjiGoster?.(data.energy, data.energyMax);
      if (data.yo) window.dmApplyRewardState?.(data.yo, account);
    }
    function home(error) {
      world.hidden = true;
      const ready = !state.completed && state.remaining > 0;
      show('Papi’nin Kelime Blokları', [
        error || 'Düşen İngilizce bloğu doğru anlamın üstüne indir. Üç sütun dolunca satır temizlenir.',
        `Bölüm ${state.level} · ${state.words} kelime · ⚡ ${state.energy} / ${state.energyMax}`,
        state.premium ? 'Premium ∞' : `Ücretsiz: ${state.remaining} hak`,
        state.level > 1 ? `✓ ${state.level - 1} bölüm geçildi` : 'İlk bölüm açık',
        state.completed ? 'Tüm atölye rotasını tamamladın!' : 'Doğru +20 · Yanlış −10 · 5 hatada tur biter.'
      ], [...(ready ? [['Atölyeye gir · ⚡ 5', start]] : []), ['Oyunlara dön', close]]);
      const cover = document.createElement('img');
      cover.src = assets + 'kapak.webp';
      cover.alt = '';
      panel.prepend(cover);
    }
    async function start() {
      if (busy) return;
      busy = true;
      runId ||= crypto.randomUUID();
      show('Atölye hazırlanıyor…', [], []);
      try {
        const data = await call(token, 'start', {runId});
        if (!dialog.isConnected) return;
        update(data);
        game = {rounds: data.rounds, level: data.playedLevel, picks: [], grid: Array(rows).fill(0), colors: Array.from({length: rows}, () => []),
          score: 0, wrong: 0, ended: false};
        world.hidden = false;
        overlay.hidden = true;
        $('[data-plan]').textContent = data.premium ? 'Premium ∞' : `${data.remaining} hak`;
        $('.dm-blocks-feedback').textContent = '';
        paintStack();
        next();
        frame = requestAnimationFrame(tick);
      } catch (error) {
        if (dialog.isConnected) home(error.message);
      } finally {
        busy = false;
      }
    }
    function hud() {
      $('[data-level]').textContent = `Bölüm ${game.level}`;
      $('[data-progress]').textContent = `${game.picks.length} / ${game.rounds.length}`;
      $('[data-score]').textContent = `Puan ${game.score}`;
      $('[data-errors]').textContent = `Hata ${game.wrong} / 5`;
    }
    function next() {
      const round = game.rounds[game.picks.length];
      game.lane = 1;
      game.double = game.level >= 4 && (game.picks.length + 1) % 3 === 0;
      game.horizontal = false;
      game.elapsed = 0;
      game.last = null;
      piece.hidden = false;
      piece.textContent = round.en;
      piece.dataset.color = game.picks.length % 4;
      answers.forEach((answer, i) => { answer.textContent = round.options[i]; });
      $('[data-rotate]').hidden = !game.double;
      hud();
      position();
    }
    function footprint() {
      const lane = game.lane, other = lane === 2 ? 1 : lane + 1;
      const mask = (1 << lane) | (game.horizontal ? 1 << other : 0);
      const height = game.double && !game.horizontal ? 2 : 1;
      let bottom = rows;
      while (bottom > 0 && !(game.grid[bottom - 1] & mask)) bottom--;
      return {mask, height, bottom, left: game.horizontal ? Math.min(lane, other) : lane};
    }
    function duration() { return Math.max(2400, 4550 - game.level * 250); }
    function position() {
      const {bottom, height, left} = footprint();
      const travel = Math.max(0, rows - bottom - height);
      piece.style.setProperty('--x', left);
      piece.style.setProperty('--y', travel * Math.min(1, game.elapsed / duration()));
      piece.style.setProperty('--width', game.horizontal ? 2 : 1);
      piece.style.setProperty('--height', height);
      answers.forEach((answer, i) => answer.setAttribute('aria-pressed', String(i === game.lane)));
    }
    function paintStack() {
      const stack = $('.dm-blocks-stack');
      stack.replaceChildren();
      game.grid.forEach((mask, y) => {
        for (let x = 0; x < 3; x++) {
          if (!(mask & (1 << x))) continue;
          const tile = document.createElement('i');
          tile.dataset.color = game.colors[y][x];
          tile.style.setProperty('--x', x);
          tile.style.setProperty('--y', rows - y - 1);
          stack.append(tile);
        }
      });
    }
    function clearRows() {
      const fx = $('.dm-blocks-fx');
      for (let y = rows - 1; y >= 0; y--) {
        if (game.grid[y] !== 7) continue;
        game.grid.splice(y, 1);
        game.grid.push(0);
        game.colors.splice(y, 1);
        game.colors.push([]);
        const spark = document.createElement('i');
        spark.style.setProperty('--y', rows - y - 1);
        fx.append(spark);
        spark.addEventListener('animationend', () => spark.remove(), {once:true});
      }
    }
    function active() { return game && !game.ended && overlay.hidden; }
    function move(lane) {
      if (!active()) return;
      game.lane = Math.max(0, Math.min(2, lane));
      position();
    }
    function rotate() {
      if (!active() || !game.double) return;
      game.horizontal = !game.horizontal;
      position();
    }
    function drop() {
      if (!active()) return;
      const {mask, height, bottom} = footprint();
      const correct = game.lane === game.rounds[game.picks.length].answer;
      game.picks.push(game.lane + (game.horizontal ? 3 : 0));
      game.score += correct ? 20 : -10;
      if (!correct) game.wrong++;
      const full = bottom + height > rows;
      if (!full) {
        for (let i = 0; i < height; i++) {
          game.grid[bottom + i] |= mask;
          for (let x = 0; x < 3; x++) {
            if (mask & (1 << x)) game.colors[bottom + i][x] = piece.dataset.color;
          }
        }
        clearRows();
        paintStack();
      }
      const feedback = $('.dm-blocks-feedback');
      feedback.dataset.good = String(correct);
      feedback.textContent = correct ? 'Doğru +20' : 'Yanlış −10';
      if (!correct && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        board.animate([{transform:'translateX(0)'},{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(0)'}], {duration:240});
      }
      if (full || game.wrong === 5 || game.picks.length === game.rounds.length) {
        game.ended = true;
        piece.hidden = true;
        hud();
        cancelAnimationFrame(frame);
        resultTimer = setTimeout(finish, 480);
      } else next();
    }
    function tick(now) {
      if (!active()) return;
      game.elapsed += game.last === null ? 0 : Math.min(60, now - game.last);
      game.last = now;
      position();
      if (game.elapsed >= duration()) drop();
      if (active()) frame = requestAnimationFrame(tick);
    }
    async function finish() {
      show('Sonuç hesaplanıyor…', [], []);
      try {
        const data = await call(token, 'finish', {runId, selections: game.picks});
        if (!dialog.isConnected) return;
        update(data);
        runId = undefined;
        const playable = (data.crashed || data.hasMore) && data.remaining > 0;
        show(data.crashed ? 'Tur sona erdi' : `Bölüm ${data.playedLevel} tamamlandı`, [
          `${'★'.repeat(data.stars)}${'☆'.repeat(3 - data.stars)} · ${data.score} puan`,
          `Doğru ${data.correct} · Yanlış ${data.wrong} · Temizlenen satır ${data.rows}`,
          `+${data.xp} XP · +${data.gold} altın`,
          data.crashed ? (data.wrong === 5 ? 'Beş hata yaptın.' : 'Bloklar tahtanın tepesine ulaştı.') :
            data.hasMore ? `✓ Bölüm ${data.playedLevel} geçildi · Bölüm ${data.level} açıldı` : 'Tüm atölye rotasını tamamladın!'
        ], [...(playable ? [[data.crashed ? 'Tekrar oyna · ⚡ 5' : 'Sonraki bölüm · ⚡ 5', start]] : []), ['Oyunlara dön', close]]);
      } catch (error) {
        if (dialog.isConnected) show('Sonuç kaydedilemedi', [error.message], [['Tekrar dene', finish], ['Oyunlara dön', close]]);
      }
    }
    function pause() {
      if (!active()) return;
      cancelAnimationFrame(frame);
      show('Atölye duraklatıldı', [], [['Devam et', () => {
        overlay.hidden = true;
        game.last = null;
        frame = requestAnimationFrame(tick);
      }], ['Oyunlara dön', close]]);
    }
    $('[data-pause]').onclick = pause;
    $('[data-left]').onclick = () => { if (active()) move(game.lane - 1); };
    $('[data-right]').onclick = () => { if (active()) move(game.lane + 1); };
    $('[data-drop]').onclick = drop;
    $('[data-rotate]').onclick = rotate;
    answers.forEach((answer, i) => answer.onclick = () => move(i));
    board.onpointerdown = event => {
      if (!active()) return;
      board.setPointerCapture(event.pointerId);
      const box = board.getBoundingClientRect();
      move(Math.floor((event.clientX - box.left) / box.width * 3));
    };
    board.onpointermove = event => {
      if (!board.hasPointerCapture(event.pointerId)) return;
      const box = board.getBoundingClientRect();
      move(Math.floor((event.clientX - box.left) / box.width * 3));
    };
    dialog.addEventListener('keydown', event => {
      if (!active()) return;
      const controls = {ArrowLeft: () => move(game.lane - 1), ArrowRight: () => move(game.lane + 1), ArrowDown: drop, ArrowUp: rotate};
      const action = controls[event.key];
      if (action) { event.preventDefault(); action(); }
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (active()) pause(); else if (!busy) close(); });
    const watch = setInterval(() => { if (player() !== account) close(); }, 700);
    dialog.showModal();
    home();
  }
})();
