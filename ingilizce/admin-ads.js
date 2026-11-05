/* Yönetici paneli: "📺 Reklam Ayarları".
   Tek tuşla tüm Android reklamlarını kapatma/açma + sıklık ayarları. Uygulama bunları sürüm gerekmeden okur
   (açılışta, girişte, uygulamaya dönünce ve 15 dakikada bir). Yetki sunucuda denetlenir (billing). */
(() => {
  'use strict';
  const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/billing';
  const doc = document;
  const token = () => { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || sessionStorage.getItem('ing_ogr_token') || ''; } catch { return ''; } };
  const isAdmin = () => { try { return sessionStorage.getItem('ing_ogr_yonetici') === '1'; } catch { return false; } };
  async function call(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-diji-token': token() }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw Error(j.mesaj || 'İşlem tamamlanamadı.');
    return j;
  }
  const NUMS = [
    ['gamesPerInterstitial', 'Kaç oyunda bir geçiş reklamı', 1, 20],
    ['gapSeconds', 'İki tam ekran reklam arası (sn)', 60, 3600],
    ['dailyInterstitials', 'Günde en çok geçiş reklamı', 0, 20],
    ['newUserGraceHours', 'Yeni üyeye reklamsız süre (saat)', 0, 720],
    ['minAnswers', 'Sayılması için en az cevap', 0, 20],
    ['minGameSeconds', 'Sayılması için en az süre (sn)', 0, 600],
    ['dailyEnergy', 'Günde enerji videosu', 0, 10],
    ['dailyGold', 'Günde altın videosu', 0, 10],
  ];
  const CSS = `.dma-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(13,49,55,.45);display:flex;align-items:flex-end;justify-content:center}
.dma-sheet{width:min(100%,620px);max-height:92vh;overflow:auto;background:#fffefa;border-radius:22px 22px 0 0;padding:18px 18px 24px;font:15px/1.45 system-ui,sans-serif;color:#17363b;box-shadow:0 -10px 40px rgba(0,0,0,.2)}
.dma-sheet h2{margin:0 0 4px;font-size:20px}.dma-sheet small{color:#5b7377}
.dma-box{border:1px solid #cfe9e4;border-radius:14px;padding:12px;margin-top:12px;background:#fff}
.dma-kill{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dma-state{font-weight:800;font-size:17px}.dma-state.on{color:#0f7a5c}.dma-state.off{color:#b3261e}
.dma-btn{border:0;border-radius:12px;padding:10px 16px;font:700 15px system-ui;cursor:pointer;background:#0f8b7d;color:#fff}
.dma-btn.red{background:#d93025}.dma-btn.ghost{background:#eef7f5;color:#0f5d55}
.dma-grid{display:grid;grid-template-columns:1fr 84px;gap:8px 10px;align-items:center;margin-top:6px}
.dma-grid input{width:100%;padding:8px;border:1px solid #b8d8d2;border-radius:10px;font:inherit;box-sizing:border-box}
.dma-checks{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:6px}.dma-checks label{display:flex;gap:6px;align-items:center;font-weight:600}
.dma-checks input{width:20px;height:20px}.dma-msg{min-height:20px;margin-top:8px;font-weight:600}
.dma-row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}`;

  function open() {
    if (!doc.getElementById('dma-css')) { const st = doc.createElement('style'); st.id = 'dma-css'; st.textContent = CSS; doc.head.appendChild(st); }
    const veil = doc.createElement('div'); veil.className = 'dma-veil';
    veil.innerHTML = `<div class="dma-sheet" role="dialog" aria-modal="true" aria-label="Reklam ayarları">
<h2>📺 Reklam Ayarları</h2><small>Android ve iPhone uygulamaları bu ayarları sürüm beklemeden okur (en geç 15 dakikada, uygulamayı yeniden açınca hemen).</small>
<div class="dma-box dma-kill"><div><div class="dma-state" data-state>Yükleniyor…</div><small>Kapatınca banner, geçiş ve ödüllü videoların hepsi durur.</small></div><button class="dma-btn" data-kill disabled>…</button></div>
<div class="dma-box"><b>Reklam türleri</b><div class="dma-checks">
 <label><input type="checkbox" data-k="banner"> Banner</label><label><input type="checkbox" data-k="interstitial"> Geçiş reklamı</label><label><input type="checkbox" data-k="rewarded"> Ödüllü video</label></div>
 <b style="display:block;margin-top:10px">Banner nerede</b><div class="dma-checks">
 <label><input type="checkbox" data-tab="games"> Oyunlar</label><label><input type="checkbox" data-tab="store"> Mağaza</label><label><input type="checkbox" data-tab="lessons"> Ders Çalış (anlatım, örnekler)</label></div>
 <small>Ders Çalış test ekranında banner hiç gösterilmez.</small></div>
<div class="dma-box"><b>Sıklık ve sınırlar</b><div class="dma-grid">${NUMS.map(([k, l, lo, hi]) => `<label for="dma-${k}">${l}</label><input id="dma-${k}" type="number" data-n="${k}" min="${lo}" max="${hi}">`).join('')}</div></div>
<div class="dma-msg" data-msg role="status"></div>
<div class="dma-row"><button class="dma-btn ghost" data-close>Kapat</button><button class="dma-btn" data-save>Kaydet</button></div></div>`;
    doc.body.appendChild(veil);
    const $ = s => veil.querySelector(s), msg = (t, bad) => { $('[data-msg]').textContent = t; $('[data-msg]').style.color = bad ? '#b3261e' : '#0f7a5c'; };
    let current = null;
    veil.addEventListener('click', e => { if (e.target === veil || e.target.closest('[data-close]')) veil.remove(); });
    const render = d => {
      current = d.settings;
      const on = current.enabled;
      $('[data-state]').textContent = on ? '● Reklamlar açık' : '● Tüm reklamlar kapalı';
      $('[data-state]').className = 'dma-state ' + (on ? 'on' : 'off');
      const k = $('[data-kill]'); k.disabled = false; k.textContent = on ? 'Tüm reklamları kapat' : 'Reklamları aç'; k.className = 'dma-btn' + (on ? ' red' : '');
      veil.querySelectorAll('[data-k]').forEach(i => { i.checked = !!current[i.dataset.k]; });
      veil.querySelectorAll('[data-tab]').forEach(i => { i.checked = (current.bannerTabs || []).includes(i.dataset.tab); });
      veil.querySelectorAll('[data-n]').forEach(i => { i.value = current[i.dataset.n]; });
    };
    const collect = () => {
      const s = { ...current };
      veil.querySelectorAll('[data-k]').forEach(i => { s[i.dataset.k] = i.checked; });
      s.bannerTabs = [...veil.querySelectorAll('[data-tab]')].filter(i => i.checked).map(i => i.dataset.tab);
      veil.querySelectorAll('[data-n]').forEach(i => { s[i.dataset.n] = Number(i.value); });
      return s;
    };
    const save = async (settings, b, done) => {
      b.disabled = true;
      try { render(await call({ action: 'adminAdsSet', settings })); msg(done); }
      catch (e) { msg(e.message, true); } finally { b.disabled = false; }
    };
    $('[data-kill]').addEventListener('click', e => {
      if (!current) return;
      const b = e.currentTarget, turningOff = current.enabled;
      if (turningOff && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Emin misin? Tekrar dokun'; setTimeout(() => { if (b.dataset.armed) { delete b.dataset.armed; render({ settings: current }); } }, 4000); return; }
      delete b.dataset.armed;
      save({ ...current, enabled: !turningOff }, b, turningOff ? 'Tüm reklamlar kapatıldı. Telefonlarda en geç 15 dakikada kalkar.' : 'Reklamlar yeniden açıldı.');
    });
    $('[data-save]').addEventListener('click', e => { if (current) save(collect(), e.currentTarget, 'Ayarlar kaydedildi.'); });
    call({ action: 'adminAdsGet' }).then(render).catch(e => { $('[data-state]').textContent = 'Okunamadı'; msg(e.message, true); });
  }

  function addTile() {
    if (!isAdmin()) return;
    const tiles = doc.querySelector('#tpDashboard .tp-real-tools');
    if (!tiles || tiles.querySelector('[data-dma]')) return;
    const b = doc.createElement('button'); b.type = 'button'; b.dataset.dma = '1';
    b.innerHTML = '<span aria-hidden="true">📺</span><strong>Reklam Ayarları</strong><small>Tek tuşla kapat · sıklık</small>';
    b.addEventListener('click', open);
    tiles.appendChild(b);
  }
  new MutationObserver(addTile).observe(doc.documentElement, { childList: true, subtree: true });
  window.dmAdminAdsOpen = open;
})();
