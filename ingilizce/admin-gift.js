/* Yönetici paneli: "🎁 Hediye Üyelik" kutucuğu.
   Elle hediye verme / geri alma, Öğretmenler Günü kotası (20) ve yeni öğretmenlere otomatik hediye anahtarı.
   Yetki sunucuda denetlenir (billing: yalnız 'teacher' kullanıcı adlı yönetici). */
(() => {
  'use strict';
  const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/billing';
  const doc = document;
  const PRODUCTS = [['teacher_premium_pro', 'Öğretmen Premium Pro'], ['teacher_pro', 'Öğretmen Pro'], ['diji_premium_pro', 'Öğrenci Premium Pro'], ['diji_pro', 'Öğrenci Pro']];
  const NAME = Object.fromEntries(PRODUCTS);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || sessionStorage.getItem('ing_ogr_token') || ''; } catch { return ''; } };
  const isAdmin = () => { try { return sessionStorage.getItem('ing_ogr_yonetici') === '1'; } catch { return false; } };
  const date = v => v ? new Date(v).toLocaleDateString('tr-TR') : '—';

  async function call(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-diji-token': token() }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw Error(j.mesaj || 'İşlem tamamlanamadı.');
    return j;
  }

  const CSS = `.dmg-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(13,49,55,.45);display:flex;align-items:flex-end;justify-content:center}
.dmg-sheet{width:min(100%,620px);max-height:92vh;overflow:auto;background:#fffefa;border-radius:22px 22px 0 0;padding:18px 18px 24px;font:15px/1.45 system-ui,sans-serif;color:#17363b;box-shadow:0 -10px 40px rgba(0,0,0,.2)}
.dmg-sheet h2{margin:0 0 4px;font-size:20px}.dmg-sheet small{color:#5b7377}
.dmg-box{border:1px solid #cfe9e4;border-radius:14px;padding:12px;margin-top:12px;background:#fff}
.dmg-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
.dmg-row input,.dmg-row select{flex:1 1 140px;min-width:0;padding:9px 10px;border:1px solid #b8d8d2;border-radius:10px;font:inherit}
.dmg-row input[type=number]{flex:0 0 80px}
.dmg-btn{border:0;border-radius:10px;padding:9px 14px;font:600 14px system-ui;cursor:pointer;background:#0f8b7d;color:#fff}
.dmg-btn.ghost{background:#eef7f5;color:#0f5d55}.dmg-btn.red{background:#fdecea;color:#b3261e}
.dmg-quota{height:8px;border-radius:6px;background:#e5f1ef;overflow:hidden;margin-top:6px}.dmg-quota i{display:block;height:100%;background:#f2a93b}
.dmg-list{list-style:none;margin:8px 0 0;padding:0;max-height:260px;overflow:auto}
.dmg-list li{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid #eef3f2;font-size:14px}
.dmg-list li.off{opacity:.5}.dmg-msg{min-height:20px;margin-top:8px;font-weight:600}
.dmg-switch{display:flex;align-items:center;gap:10px;font-weight:600}.dmg-switch input{width:22px;height:22px}`;

  function open() {
    if (!doc.getElementById('dmg-css')) { const st = doc.createElement('style'); st.id = 'dmg-css'; st.textContent = CSS; doc.head.appendChild(st); }
    const veil = doc.createElement('div'); veil.className = 'dmg-veil';
    const opts = PRODUCTS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
    veil.innerHTML = `<div class="dmg-sheet" role="dialog" aria-modal="true" aria-label="Hediye üyelik">
<h2>🎁 Hediye Üyelik</h2><small>Ödeme olmadan plan tanımlar. Süre bitince plan kendiliğinden Free'ye döner.</small>
<div class="dmg-box"><b>Öğretmenler Günü kotası</b><div data-quota>Yükleniyor…</div><div class="dmg-quota"><i data-bar style="width:0"></i></div></div>
<div class="dmg-box"><b>Elle hediye ver</b>
 <div class="dmg-row"><input data-user placeholder="Kullanıcı adı" autocomplete="off"><select data-product>${opts}</select></div>
 <div class="dmg-row"><label>Ay <input type="number" data-months min="1" max="24" value="6"></label><input data-campaign value="ogretmenler-gunu-2026" placeholder="Kampanya"></div>
 <div class="dmg-row"><button class="dmg-btn" data-act="adminGift">Hediye ver</button><button class="dmg-btn red" data-act="adminRevoke">Geri al</button></div>
 <div class="dmg-msg" data-msg role="status"></div></div>
<div class="dmg-box"><label class="dmg-switch"><input type="checkbox" data-auto> Yeni kayıt olan öğretmenlere otomatik hediye</label>
 <small>Açıkken her yeni öğretmen, aşağıdaki plan ve süreyle hediye alır (Öğretmenler Günü kotası dolunca durur).</small>
 <div class="dmg-row"><select data-auto-product>${opts}</select><label>Ay <input type="number" data-auto-months min="1" max="24" value="6"></label><button class="dmg-btn ghost" data-save-auto>Kaydet</button></div></div>
<div class="dmg-box"><b>Verilen hediyeler</b><ul class="dmg-list" data-list><li>Yükleniyor…</li></ul></div>
<div class="dmg-row" style="justify-content:flex-end"><button class="dmg-btn ghost" data-close>Kapat</button></div></div>`;
    doc.body.appendChild(veil);
    const $ = s => veil.querySelector(s), msg = (t, bad) => { $('[data-msg]').textContent = t; $('[data-msg]').style.color = bad ? '#b3261e' : '#0f7a5c'; };
    const close = () => veil.remove();
    veil.addEventListener('click', e => { if (e.target === veil || e.target.closest('[data-close]')) close(); });

    const render = d => {
      const used = d.teachersDayUsed || 0, lim = d.teachersDayLimit || 20;
      $('[data-quota]').textContent = `${used} / ${lim} kullanıldı · ${Math.max(0, lim - used)} hak kaldı`;
      $('[data-bar]').style.width = Math.min(100, used / lim * 100) + '%';
      const a = d.auto || {};
      $('[data-auto]').checked = !!a.enabled;
      if (a.product_key) $('[data-auto-product]').value = a.product_key;
      if (a.months) $('[data-auto-months]').value = a.months;
      const g = d.gifts || [];
      $('[data-list]').innerHTML = g.length ? g.map(x => `<li class="${x.state === 'active' ? '' : 'off'}"><span><b>${esc(x.username)}</b> · ${esc(NAME[x.product] || x.product)}</span><span>${x.state === 'active' ? date(x.validUntil) + "'e kadar" : 'geri alındı'}</span></li>`).join('') : '<li>Henüz hediye yok.</li>';
    };
    const load = () => call({ action: 'adminList' }).then(render).catch(e => msg(e.message, true));

    veil.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async () => {
      const username = $('[data-user]').value.trim(); if (!username) return msg('Kullanıcı adı yaz.', true);
      const revoke = b.dataset.act === 'adminRevoke';
      if (revoke && !confirmInline(b)) return;
      b.disabled = true;
      try {
        render(await call({ action: b.dataset.act, username, product: $('[data-product]').value, months: +$('[data-months]').value, campaign: $('[data-campaign]').value.trim() }));
        msg(revoke ? `${username} için hediye geri alındı.` : `${username} hediyeyi aldı. 🎉`);
      } catch (e) { msg(e.message, true); } finally { b.disabled = false; }
    }));
    $('[data-save-auto]').addEventListener('click', async e => {
      const b = e.currentTarget; b.disabled = true;
      try { render(await call({ action: 'adminAuto', enabled: $('[data-auto]').checked, product: $('[data-auto-product]').value, months: +$('[data-auto-months]').value, campaign: $('[data-campaign]').value.trim() })); msg($('[data-auto]').checked ? 'Otomatik hediye açık.' : 'Otomatik hediye kapalı.'); }
      catch (err) { msg(err.message, true); } finally { b.disabled = false; }
    });
    load();
  }

  // Tarayıcı onay penceresi yerine düğmede iki dokunuşlu onay.
  function confirmInline(b) {
    if (b.dataset.armed) { delete b.dataset.armed; b.textContent = 'Geri al'; return true; }
    b.dataset.armed = '1'; b.textContent = 'Emin misin? Tekrar dokun';
    setTimeout(() => { if (b.dataset.armed) { delete b.dataset.armed; b.textContent = 'Geri al'; } }, 4000);
    return false;
  }

  function addTile() {
    if (!isAdmin()) return;
    const tiles = doc.querySelector('#tpDashboard .tp-real-tools');
    if (!tiles || tiles.querySelector('[data-dmg]')) return;
    const b = doc.createElement('button'); b.type = 'button'; b.dataset.dmg = '1';
    b.innerHTML = '<span aria-hidden="true">🎁</span><strong>Hediye Üyelik</strong><small>Plan hediye et · otomatik hediye</small>';
    b.addEventListener('click', open);
    tiles.appendChild(b);
  }
  new MutationObserver(addTile).observe(doc.documentElement, { childList: true, subtree: true });
  window.dmAdminGiftOpen = open;
})();
