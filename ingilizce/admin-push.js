/* Yönetici paneli: "🔔 Bildirim Gönder".
   Android uygulamasına anlık bildirim: herkese ya da tek öğrenciye (önce kendine dene). Yetki sunucuda denetlenir (push). */
(() => {
  'use strict';
  const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/push';
  const doc = document;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || sessionStorage.getItem('ing_ogr_token') || ''; } catch { return ''; } };
  const isAdmin = () => { try { return sessionStorage.getItem('ing_ogr_yonetici') === '1'; } catch { return false; } };
  async function call(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-diji-token': token() }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw Error(j.mesaj || 'İşlem tamamlanamadı.');
    return j;
  }
  const TABS = [['', 'Uygulama açılsın'], ['parkur', 'Parkur'], ['oyunlar', 'Oyunlar'], ['derscalis', 'Ders Çalış'], ['magaza', 'Mağaza'], ['arkadaslar', 'Arkadaşlar'], ['profil', 'Profil']];
  const CSS = `.dmn-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(13,49,55,.45);display:flex;align-items:flex-end;justify-content:center}
.dmn-sheet{width:min(100%,620px);max-height:92vh;overflow:auto;background:#fffefa;border-radius:22px 22px 0 0;padding:18px 18px 24px;font:15px/1.45 system-ui,sans-serif;color:#17363b;box-shadow:0 -10px 40px rgba(0,0,0,.2)}
.dmn-sheet h2{margin:0 0 4px;font-size:20px}.dmn-sheet small{color:#5b7377}
.dmn-box{border:1px solid #cfe9e4;border-radius:14px;padding:12px;margin-top:12px;background:#fff}
.dmn-f{display:block;margin-top:8px}.dmn-f input,.dmn-f select,.dmn-f textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px 10px;border:1px solid #b8d8d2;border-radius:10px;font:inherit}
.dmn-f[hidden]{display:none}.dmn-f textarea{min-height:70px;resize:vertical}.dmn-count{float:right;color:#7a9396;font-size:12px}
.dmn-radio{display:flex;gap:16px;margin-top:8px;font-weight:600}.dmn-radio input{width:18px;height:18px;vertical-align:-3px}
.dmn-prev{margin-top:10px;background:#f2f5f5;border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:flex-start}
.dmn-prev i{flex:0 0 28px;height:28px;border-radius:8px;background:#0f8b7d;color:#fff;display:grid;place-items:center;font-style:normal}
.dmn-prev b{display:block}.dmn-btn{border:0;border-radius:12px;padding:10px 16px;font:700 15px system-ui;cursor:pointer;background:#0f8b7d;color:#fff}
.dmn-btn.ghost{background:#eef7f5;color:#0f5d55}.dmn-row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
.dmn-msg{min-height:20px;margin-top:8px;font-weight:600}.dmn-warn{background:#fff4e0;border-color:#ffd99a}
.dmn-log{list-style:none;margin:6px 0 0;padding:0;font-size:13px}.dmn-log li{padding:5px 0;border-top:1px solid #eef3f2;display:flex;justify-content:space-between;gap:8px}`;

  function open() {
    if (!doc.getElementById('dmn-css')) { const st = doc.createElement('style'); st.id = 'dmn-css'; st.textContent = CSS; doc.head.appendChild(st); }
    const veil = doc.createElement('div'); veil.className = 'dmn-veil';
    veil.innerHTML = `<div class="dmn-sheet" role="dialog" aria-modal="true" aria-label="Bildirim gönder">
<h2>🔔 Bildirim Gönder</h2><small data-stats>Yükleniyor…</small>
<div class="dmn-box dmn-warn" data-warn hidden></div>
<div class="dmn-box">
 <label class="dmn-f">Başlık <span class="dmn-count" data-ct>0/60</span><input data-title maxlength="60" placeholder="Papi seni bekliyor! 🦜"></label>
 <label class="dmn-f">Metin <span class="dmn-count" data-cb>0/200</span><textarea data-body maxlength="200" placeholder="Bugünkü 5 dakikalık parkurunu yap, serin devam etsin."></textarea></label>
 <label class="dmn-f">Dokununca açılacak yer<select data-tab>${TABS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
 <div class="dmn-radio"><label><input type="radio" name="dmn-t" value="user" checked> Tek öğrenci</label><label><input type="radio" name="dmn-t" value="all"> Herkese</label></div>
 <label class="dmn-f" data-userf>Öğrenci kullanıcı adı<input data-user autocomplete="off" placeholder="Önce kendi öğrenci hesabına dene"></label>
 <div class="dmn-prev"><i>🦜</i><div><b data-pt>Başlık</b><span data-pb>Metin</span></div></div>
</div>
<div class="dmn-msg" data-msg role="status"></div>
<div class="dmn-row"><button class="dmn-btn ghost" data-close>Kapat</button><button class="dmn-btn" data-send>Gönder</button></div>
<div class="dmn-box"><b>Son gönderilenler</b><ul class="dmn-log" data-log><li>—</li></ul></div></div>`;
    doc.body.appendChild(veil);
    const $ = s => veil.querySelector(s), msg = (t, bad) => { $('[data-msg]').textContent = t; $('[data-msg]').style.color = bad ? '#b3261e' : '#0f7a5c'; };
    veil.addEventListener('click', e => { if (e.target === veil || e.target.closest('[data-close]')) veil.remove(); });
    const target = () => veil.querySelector('input[name=dmn-t]:checked').value;
    const preview = () => {
      $('[data-ct]').textContent = $('[data-title]').value.length + '/60'; $('[data-cb]').textContent = $('[data-body]').value.length + '/200';
      $('[data-pt]').textContent = $('[data-title]').value || 'Başlık'; $('[data-pb]').textContent = $('[data-body]').value || 'Metin';
      $('[data-userf]').hidden = target() !== 'user';
      const b = $('[data-send]'); delete b.dataset.armed; b.textContent = target() === 'all' ? 'Herkese gönder' : 'Gönder';
    };
    veil.addEventListener('input', preview); veil.addEventListener('change', preview);
    const stats = d => {
      $('[data-stats]').textContent = `Bildirime izin veren: ${d.students} öğrenci · ${d.devices} cihaz`;
      const w = $('[data-warn]');
      w.hidden = !!d.configured; w.textContent = 'Firebase anahtarı (FCM_SERVICE_ACCOUNT) Supabase\'e henüz eklenmedi; gönderim bundan sonra çalışır.';
      $('[data-log]').innerHTML = (d.log || []).length ? d.log.map(x => `<li><span><b>${esc(x.title)}</b> · ${esc(x.target === 'all' ? 'herkese' : x.target.replace(/^user:/, ''))}</span><span>${x.sent} ✓${x.failed ? ' · ' + x.failed + ' ✗' : ''}</span></li>`).join('') : '<li>Henüz gönderim yok.</li>';
    };
    const load = () => call({ action: 'adminStats' }).then(stats).catch(e => { $('[data-stats]').textContent = 'Okunamadı'; msg(e.message, true); });
    $('[data-send]').addEventListener('click', async e => {
      const b = e.currentTarget, title = $('[data-title]').value.trim(), body = $('[data-body]').value.trim(), t = target();
      if (!title || !body) return msg('Başlık ve metin yaz.', true);
      if (t === 'user' && !$('[data-user]').value.trim()) return msg('Öğrenci kullanıcı adını yaz.', true);
      if (t === 'all' && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Emin misin? Herkese gidecek'; return; }
      delete b.dataset.armed; b.disabled = true; msg('Gönderiliyor…');
      try {
        const r = await call({ action: 'adminSend', title, body, tab: $('[data-tab]').value, target: t, username: $('[data-user]').value.trim() });
        msg(`Gönderildi: ${r.sent} cihaz${r.failed ? ` · ${r.failed} ulaşmadı` : ''}${r.removed ? ` · ${r.removed} eski cihaz temizlendi` : ''}.`);
        load();
      } catch (err) { msg(err.message, true); } finally { b.disabled = false; preview(); }
    });
    preview(); load();
  }

  function addTile() {
    if (!isAdmin()) return;
    const tiles = doc.querySelector('#tpDashboard .tp-real-tools');
    if (!tiles || tiles.querySelector('[data-dmn]')) return;
    const b = doc.createElement('button'); b.type = 'button'; b.dataset.dmn = '1';
    b.innerHTML = '<span aria-hidden="true">🔔</span><strong>Bildirim Gönder</strong><small>Android uygulamasına</small>';
    b.addEventListener('click', open);
    tiles.appendChild(b);
  }
  new MutationObserver(addTile).observe(doc.documentElement, { childList: true, subtree: true });
  window.dmAdminPushOpen = open;
})();
