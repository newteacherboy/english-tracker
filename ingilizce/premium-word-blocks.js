(() => {
  'use strict';
  const api = (typeof apiURL === 'string' ? apiURL :
    'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/, 'premium-games');
  const styles = 'premium-word-blocks.css?v=2';
  const assets = 'premium-assets/kelime-bloklari/';
  const rows = 8;
  const player = () => typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi;
  let opening = false;

  function workshopSound() {
    const melody = [523, 659, 784, 659, 587, 0, 659, 0, 440, 523, 659, 523, 392, 0, 494, 0];
    let context, timer, step = 0;
    let muted = localStorage.getItem('dm_blocks_mute') === '1';
    function tone(freq, volume, offset = 0) {
      if (!context || muted || document.hidden || !freq || window.dmAnswerAudio?.enabled()===false) return;
      const at = context.currentTime + offset;
      const note = context.createOscillator(), volumeNode = context.createGain();
      note.type = 'sine';
      note.frequency.value = freq;
      volumeNode.gain.setValueAtTime(.001, at);
      volumeNode.gain.exponentialRampToValueAtTime(volume, at + .025);
      volumeNode.gain.exponentialRampToValueAtTime(.001, at + .18);
      note.connect(volumeNode).connect(context.destination);
      note.start(at);
      note.stop(at + .2);
      note.onended = () => { note.disconnect(); volumeNode.disconnect(); };
    }
    return {
      unlock() {
        if (muted) return;
        try {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (Audio) context ||= new Audio();
          context?.resume().catch(() => {});
        } catch { /* Audio is optional. */ }
      },
      music(active) {
        clearInterval(timer);
        if (active && context && !muted && !document.hidden) {
          timer = setInterval(() => tone(melody[step++ % melody.length], .026), 280);
        }
      },
      effect(correct, bonus) {
        (bonus ? [660, 880, 1175] : correct ? [587, 784] : [392, 330])
          .forEach((freq, index) => tone(freq, .085, index * .085));
      },
      get muted() { return muted; },
      toggle() { muted = !muted; localStorage.setItem('dm_blocks_mute', muted ? '1' : '0'); this.unlock(); },
      close() { clearInterval(timer); context?.close().catch(() => {}); }
    };
  }

  async function call(token, op, payload = {}) {
    const response = await fetch(api, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({game: 'word-blocks', t: token, op, ...payload})
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw Object.assign(new Error(data.mesaj || 'Bağlantı kurulamadı.'), {code:data.hata});
    return data;
  }

  window.premiumKelimeBloklariAc = async () => {
    if (opening || document.querySelector('.dm-blocks')) return;
    opening = true;
    const account = player(), token = (window.dmTeacherPortalMode ? sessionStorage.getItem('ing_ogr_token') : '') || localStorage.getItem('ing_token') || '';
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
    dialog.setAttribute('aria-label', 'Block Papi');
    dialog.innerHTML = `
      <div class="dm-blocks-world" hidden>
        <header><button data-pause aria-label="Duraklat">Ⅱ</button><h2><img src="${assets}papi.webp" alt="">Papi’nin<br>Kelime Blokları</h2><div class="dm-blocks-tools"><span data-plan></span><button data-sound aria-label="Sesi kapat">♫</button></div></header>
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
    const sound = workshopSound();
    const answers = [...dialog.querySelectorAll('[data-lane]')];
    let state = initial, game, runId, frame, resultTimer, busy = false;

    function close() {
      cancelAnimationFrame(frame);
      clearInterval(watch);
      clearTimeout(resultTimer);
      document.removeEventListener('visibilitychange', syncMusic);
      sound.close();
      dialog.close();
      dialog.remove();
    }
    function show(title, lines, actions, mood) {
      window.dmPremiumIntro?.unmount(dialog);
      panel.replaceChildren();
      if (mood && window.DMPapi) panel.insertAdjacentHTML('beforeend', window.DMPapi.tag(mood));
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
      syncMusic();
      panel.querySelector('button')?.focus();
    }
    function syncMusic() { sound.music(active() || (!game && world.hidden)); }
    function update(data) {
      state = {...state, ...data};
      if (data.energyMax) window.headerEnerjiGoster?.(data.energy, data.energyMax);
      if (data.yo) window.dmApplyRewardState?.(data.yo, account);
    }
    function home(error) {
      world.hidden = true;
      const ready = !state.completed && state.remaining > 0;
      const intro = window.dmPremiumIntro;
      if (intro) {
        overlay.hidden = true;
        const openPlans = intro.plans('block-papi', (window.dmAndroidPlan?.plan || 'free') === 'pro' ? 'premium_pro' : '');
        const actions = [];
        if (ready) actions.push({label: 'Atölyeye gir', cost: 5, onClick: start});
        else if (!state.completed && openPlans) actions.push({label: 'Paketleri gör', onClick: () => { close(); openPlans(); }}); // oyun penceresi üst katmanda; önce kapanır
        actions.push({label: 'Oyunlara dön', kind: actions.length ? 'secondary' : 'primary', onClick: close});
        const note = error ? {text: error, icon: 'bolt'} :
          state.completed ? {text: 'Tüm atölye rotasını tamamladın!', icon: 'check'} :
          state.remaining <= 0 ? {text: intro.noRightsText(), icon: 'lock'} : null;
        intro.mount(dialog, {
          theme: 'blocks',
          image: assets + 'kapak.webp',
          imageAlt: 'Renkli bloklar, ARMUT, ELMA, MUZ kelime kutuları ve Papi',
          imagePosition: 'center 80%',
          title: 'Block Papi',
          done: state.level > 1 ? `${state.level - 1} bölüm geçildi` : '',
          desc: 'Düşen İngilizce bloğu doğru anlamın üstüne indir. Üç sütun dolunca satır temizlenir.',
          stats: [
            {value: `Bölüm ${state.level}`, label: `${state.words} kelime`},
            {value: `${state.energy}/${state.energyMax}`, label: 'Enerji', icon: 'bolt'},
            state.premium ? {value: 'Sınırsız', label: 'Premium', icon: 'infinity'} : {value: `${Math.max(0, state.remaining)}`, label: 'Kalan hak'}
          ],
          rules: ready ? [{value: '+20', label: 'Doğru', tone: 'good'}, {value: '−10', label: 'Yanlış', tone: 'bad'}, {value: '5 hata', label: 'Tur biter'}] : [],
          note,
          actions
        });
        syncMusic();
        return;
      }
      show('Block Papi', [
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
      sound.unlock();
      runId ||= crypto.randomUUID();
      show('Atölye hazırlanıyor…', [], []);
      try {
        const data = await call(token, 'start', {runId});
        if (!dialog.isConnected) return;
        update(data);
        game = {rounds: data.rounds, level: data.playedLevel, picks: [], grid: Array(rows).fill(0), cells: Array.from({length: rows}, () => []),
          score: 0, wrong: 0, ended: false};
        world.hidden = false;
        overlay.hidden = true;
        syncMusic();
        $('[data-plan]').textContent = data.premium ? 'Premium ∞' : `${data.remaining} hak`;
        $('.dm-blocks-feedback').textContent = '';
        paintStack();
        next();
        frame = requestAnimationFrame(tick);
      } catch (error) {
        if (dialog.isConnected) { home(error.message); window.DijiMeduPapiFeedback?.energyDenied(error); }
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
      piece.dataset.color = round.color ?? game.picks.length % 4;
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
          const cell = game.cells[y][x];
          tile.dataset.color = cell.color;
          tile.textContent = cell.word;
          tile.lang = 'en';
          tile.title = cell.word;
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
        game.cells.splice(y, 1);
        game.cells.push([]);
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
      const round = game.rounds[game.picks.length];
      const correct = game.lane === round.answer;
      game.picks.push(game.lane + (game.horizontal ? 3 : 0));
      game.score += correct ? 20 : -10;
      if (!correct) game.wrong++;
      const full = bottom + height > rows;
      let sameWord = false, sameColor = false;
      if (!full) {
        const cell = {word: round.en, color: piece.dataset.color, correct};
        if (correct && round.color !== undefined) {
          for (let y = bottom; y < bottom + height; y++) {
            for (let x = 0; x < 3; x++) {
              if (!(mask & (1 << x))) continue;
              for (const neighbor of [game.cells[y][x - 1], game.cells[y][x + 1]]) {
                if (!neighbor?.correct) continue;
                sameWord ||= neighbor.word.toLowerCase() === round.en.toLowerCase();
                sameColor ||= neighbor.color === cell.color;
              }
            }
          }
        }
        for (let i = 0; i < height; i++) {
          game.grid[bottom + i] |= mask;
          for (let x = 0; x < 3; x++) {
            if (mask & (1 << x)) game.cells[bottom + i][x] = cell;
          }
        }
        clearRows();
        paintStack();
      }
      const feedback = $('.dm-blocks-feedback');
      feedback.dataset.good = String(correct);
      const bonus = (sameWord ? 15 : 0) + (sameColor ? 5 : 0);
      game.score += bonus;
      sound.effect(correct, bonus);
      feedback.textContent = bonus ? `Doğru +20 · ${sameWord ? 'Kelime +15' : ''}${sameWord && sameColor ? ' · ' : ''}${sameColor ? 'Renk +5' : ''}` : correct ? 'Doğru +20' : 'Yanlış −10';
      if (!correct && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        board.animate([{transform:'translateX(0)'},{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(0)'}], {duration:240});
      }
      if (full || game.wrong === 5 || game.picks.length === game.rounds.length) {
        game.ended = true;
        syncMusic();
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
          ...(data.bonus ? [`Bonus +${data.bonus} puan`] : []),
          `+${data.xp} XP · +${data.gold} altın`,
          data.crashed ? (data.wrong === 5 ? 'Beş hata yaptın.' : 'Bloklar tahtanın tepesine ulaştı.') :
            data.hasMore ? `✓ Bölüm ${data.playedLevel} geçildi · Bölüm ${data.level} açıldı` : 'Tüm atölye rotasını tamamladın!'
        ], [...(playable ? [[data.crashed ? 'Tekrar oyna · ⚡ 5' : 'Sonraki bölüm · ⚡ 5', start]] : []), ['Oyunlara dön', close]],
          data.crashed ? 'teselli' : window.DMPapi?.resultMood({ yildiz: Number(data.stars) || 0, dogru: data.correct, yanlis: data.wrong }));
      } catch (error) {
        if (dialog.isConnected) show('Sonuç kaydedilemedi', [error.message], [['Tekrar dene', finish], ['Oyunlara dön', close]]);
      }
    }
    function pause() {
      if (!active()) return;
      cancelAnimationFrame(frame);
      show('Atölye duraklatıldı', [], [['Devam et', () => {
        overlay.hidden = true;
        syncMusic();
        game.last = null;
        frame = requestAnimationFrame(tick);
      }], ['Oyunlara dön', close]]);
    }
    $('[data-pause]').onclick = pause;
    const soundButton = $('[data-sound]');
    function paintSound() {
      soundButton.textContent = sound.muted ? '♪̸' : '♫';
      soundButton.setAttribute('aria-label', sound.muted ? 'Sesi aç' : 'Sesi kapat');
    }
    soundButton.onclick = () => { sound.toggle(); paintSound(); syncMusic(); };
    paintSound();
    document.addEventListener('visibilitychange', syncMusic);
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
    dialog.dmGameFrameActions={back:close,exit:close};
    dialog.showModal();
    dialog.addEventListener('click', () => { sound.unlock(); syncMusic(); }, {once:true});
    sound.unlock();
    home();
  }
})();
