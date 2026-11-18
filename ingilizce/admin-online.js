/* [18 Kas 2026] Yönetici paneli: "🟢 Çevrimiçi" — şu an uygulaması açık öğrenciler.
   Yalnız yönetici hesabı görür (yetki sunucuda: dm_admin_online). Sürekli takip yok: bölüm açılınca / Yenile'ye
   basınca tek bir yoklama yapılır, uygulaması önde açık öğrenciler bir kez cevap verir. Öğrencilere sayı gösterilmez. */
(() => {
  'use strict';
  const doc = document;
  const LOBBY = 'dm-duel-lobby';
  const WAIT_MS = 3500, LATE_MS = 7000, COOLDOWN_S = 20;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || ''; } catch { return ''; } };
  const isAdmin = () => { try { return !!window.dmTeacherPortalMode && window.dmTeacherVerifiedAdmin === true && window.dmTeacherVerifiedAdminToken === token(); } catch { return false; } };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function call(op, roll) {
    const sb = window.supabaseClient;
    if (!sb?.rpc) throw Error('Sunucuya bağlanılamadı.');
    const { data, error } = await sb.rpc('dm_admin_online', { p_token: token(), p_op: op, p_roll: roll || null });
    if (error || !data?.ok) throw Error(data?.message || 'Liste okunamadı.');
    return data;
  }
  let lobby = null;
  function shout(roll) {
    const sb = window.supabaseClient;
    if (!sb?.channel) throw Error('Canlı bağlantı kurulamadı.');
    lobby = lobby || sb.channel(LOBBY, { config: { broadcast: { self: false, ack: false } } });
    // Kanala abone olmadan REST üzerinden tek yayın.
    return lobby.httpSend ? lobby.httpSend('who', { roll }) : lobby.send({ type: 'broadcast', event: 'who', payload: { roll } });
  }

  const CSS = `.dmo-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(13,49,55,.45);display:flex;align-items:flex-end;justify-content:center}
.dmo-sheet{width:min(100%,620px);max-height:92vh;overflow:auto;background:#fffefa;border-radius:22px 22px 0 0;padding:18px 18px 24px;font:15px/1.45 system-ui,sans-serif;color:#17363b;box-shadow:0 -10px 40px rgba(0,0,0,.2)}
.dmo-head{display:flex;align-items:center;gap:10px}.dmo-head h2{margin:0;font-size:20px;flex:1}
.dmo-count{min-width:44px;padding:4px 12px;border-radius:999px;background:#e3f7ee;color:#0f7a5c;font:800 18px system-ui;text-align:center}
.dmo-sub{color:#5b7377;font-size:13px;margin:4px 0 0}
.dmo-list{list-style:none;margin:12px 0 0;padding:0;border:1px solid #cfe9e4;border-radius:14px;background:#fff;overflow:hidden}
.dmo-list li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-top:1px solid #eef3f2}.dmo-list li:first-child{border-top:0}
.dmo-dot{flex:0 0 10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}
.dmo-name{flex:1;min-width:0;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dmo-name small{font-weight:600;color:#7a9396;margin-left:6px}
.dmo-tag{padding:3px 9px;border-radius:999px;background:#f2f5f5;color:#3d5a5e;font:700 12px system-ui;white-space:nowrap}.dmo-tag.duel{background:#fff1d6;color:#8a5a00}
.dmo-empty{padding:18px 12px;text-align:center;color:#5b7377}
.dmo-btn{border:0;border-radius:12px;padding:10px 16px;font:700 15px system-ui;cursor:pointer;background:#0f8b7d;color:#fff}.dmo-btn:disabled{opacity:.55;cursor:default}
.dmo-btn.ghost{background:#eef7f5;color:#0f5d55}.dmo-row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
.dmo-note{margin-top:10px;font-size:12.5px;color:#7a9396}`;

  function open() {
    if (!isAdmin()) return;
    if (!doc.getElementById('dmo-css')) { const st = doc.createElement('style'); st.id = 'dmo-css'; st.textContent = CSS; doc.head.appendChild(st); }
    const veil = doc.createElement('div'); veil.className = 'dmo-veil';
    veil.innerHTML = `<div class="dmo-sheet" role="dialog" aria-modal="true" aria-label="Çevrimiçi öğrenciler">
<div class="dmo-head"><h2>🟢 Çevrimiçi</h2><span class="dmo-count" data-count>…</span></div>
<p class="dmo-sub" data-sub>Yoklanıyor…</p>
<ul class="dmo-list" data-list><li class="dmo-empty">Uygulaması açık öğrenciler soruluyor…</li></ul>
<div class="dmo-row"><button class="dmo-btn ghost" data-close>Kapat</button><button class="dmo-btn" data-refresh disabled>Yenile</button></div>
<p class="dmo-note">Yalnız uygulaması şu an önde açık olan öğrenciler görünür. Liste yalnız sen bu bölümü açınca ya da Yenile'ye basınca güncellenir, sürekli takip yapılmaz.</p></div>`;
    doc.body.appendChild(veil);
    const $ = s => veil.querySelector(s);
    let alive = true, tick = null;
    const close = () => { alive = false; clearInterval(tick); veil.remove(); };
    veil.addEventListener('click', e => { if (e.target === veil || e.target.closest('[data-close]')) close(); });
    const paint = (d, final) => {
      const rows = d.online || [];
      $('[data-count]').textContent = rows.length;
      $('[data-list]').innerHTML = rows.length ? rows.map(x => `<li><span class="dmo-dot" aria-hidden="true"></span>
<span class="dmo-name">${esc(x.name)}${x.class ? `<small>${esc(x.class)}. sınıf</small>` : ''}</span>
<span class="dmo-tag${x.duel ? ' duel' : ''}">${esc(x.duel ? '⚔️ Düelloda' : (x.screen || 'Uygulamada'))}</span></li>`).join('')
        : `<li class="dmo-empty">${final ? 'Şu an uygulaması açık öğrenci yok.' : 'Cevaplar bekleniyor…'}</li>`;
      if (final) $('[data-sub]').textContent = 'Son yoklama: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    const cooldown = () => {
      const b = $('[data-refresh]'); let left = COOLDOWN_S; b.disabled = true; b.textContent = `Yenile (${left})`;
      clearInterval(tick);
      tick = setInterval(() => { if (--left <= 0) { clearInterval(tick); b.disabled = false; b.textContent = 'Yenile'; } else b.textContent = `Yenile (${left})`; }, 1000);
    };
    async function roll() {
      cooldown();
      $('[data-sub]').textContent = 'Yoklanıyor…'; $('[data-count]').textContent = '…';
      try {
        const o = await call('open');
        await shout(o.roll);
        await sleep(WAIT_MS); if (!alive) return;
        paint(await call('list', o.roll), false);
        await sleep(LATE_MS - WAIT_MS); if (!alive) return;
        paint(await call('list', o.roll), true);
      } catch (e) {
        if (!alive) return;
        $('[data-sub]').textContent = e.message || 'Yoklama yapılamadı.'; $('[data-count]').textContent = '–';
        $('[data-list]').innerHTML = '<li class="dmo-empty">Liste alınamadı. Biraz sonra Yenile\'ye bas.</li>';
      }
    }
    $('[data-refresh]').addEventListener('click', roll);
    roll();
  }

  function addTile() {
    const tiles = doc.querySelector('#tpDashboard .tp-real-tools');
    if (!tiles) return;
    const ownTile = tiles.querySelector('[data-dmo]');
    if (!isAdmin()) { ownTile?.remove(); return; }
    if (ownTile) return;
    const b = doc.createElement('button'); b.type = 'button'; b.dataset.dmo = '1';
    b.innerHTML = '<span aria-hidden="true">🟢</span><strong>Çevrimiçi</strong><small>Şu an uygulamada olanlar</small>';
    b.addEventListener('click', open);
    tiles.appendChild(b);
  }
  new MutationObserver(addTile).observe(doc.documentElement, { childList: true, subtree: true });
  window.addEventListener('dm:teacher-admin-role-verified', addTile);
  window.dmAdminOnlineOpen = open;
})();
