import { planCards, parentGate, gatePassed } from './billing-core.js';

// Google Play abonelikleri: plan ekranı, veli kapısı, satın alma → sunucu doğrulaması → plan yenileme.
export function createBilling({ plugin, store = 'google', win, endpoint }) {
  const apple = store === 'apple';
  const doc = win.document;
  let status = null, storeProducts = [], loadingProducts = null, busy = false, period = 'aylik';

  function token() { return win.sessionStorage.getItem('ing_ogr_token') || win.localStorage.getItem('ing_token') || ''; }
  async function call(body) {
    const t = token();
    if (!t) throw Error('Giriş yapmalısın.');
    const r = await win.fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-diji-token': t }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw Error(j.mesaj || 'Abonelik servisine ulaşılamadı.');
    return j;
  }
  function apply(next) {
    status = next;
    win.dmAndroidPlan = { plan: next.plan, role: next.role, limits: next.limits || {}, ads: next.role === 'teacher' ? false : next.limits?.ads !== false };
    doc.documentElement.dataset.dmPlan = next.plan;
    win.dispatchEvent(new win.CustomEvent('dm:plan', { detail: win.dmAndroidPlan }));
    win.dmAndroidPlacements?.sync?.();
  }
  async function refresh() {
    if (!token()) { status = null; win.dmAndroidPlan = { plan: 'free', ads: true, limits: {} }; return null; }
    try { apply(await call({ action: 'status' })); } catch { /* Ağ yoksa son bilinen plan kalır. */ }
    return status;
  }
  async function products() {
    if (!status) return [];
    if (!loadingProducts) loadingProducts = plugin.getProducts({ ids: status.products.map(p => p.id) })
      .then(r => { storeProducts = r.products || []; return storeProducts; })
      .catch(() => { loadingProducts = null; return []; });
    return loadingProducts;
  }
  async function verify(purchase) {
    if (!purchase?.purchaseToken || purchase.state !== 'purchased') return null;
    const productId = (purchase.products || [])[0];
    // Apple: StoreKit 2'nin imzalı işlemi (JWS); sunucu Apple sertifika zincirini doğrular.
    const result = await call(apple ? { action: 'verifyApple', productId, signedTransaction: purchase.purchaseToken } : { action: 'verify', productId, purchaseToken: purchase.purchaseToken });
    apply(result);
    return result;
  }
  // Cihazdaki aboneliği sunucuya tekrar bildirir (uygulama yeniden kurulduysa veya doğrulama yarım kaldıysa).
  async function restore({ quiet = true } = {}) {
    if (!status?.canBuy) return 0;
    let n = 0;
    try {
      const { purchases = [] } = await plugin.restore();
      for (const p of purchases) { try { if (await verify(p)) n++; } catch (e) { if (!quiet) throw e; } }
    } catch (e) { if (!quiet) throw e; }
    return n;
  }

  // ---------------------------------------------------------------- arayüz
  let sheet;
  const css = `.dmb-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center}
.dmb-sheet{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fffefa;border:1px solid #b7ece4;border-bottom:0;border-radius:32px 32px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));font:600 15px/1.45 system-ui;color:#114952}
.dmb-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.dmb-head h2{margin:0;font-size:20px}
.dmb-x{border:0;background:#ece7df;border-radius:50%;width:36px;height:36px;font-size:18px}
.dmb-toggle{display:flex;background:#ece7df;border-radius:12px;padding:3px;margin:14px 0}.dmb-toggle button{flex:1;border:0;background:none;border-radius:10px;padding:9px;font-weight:700;color:#475569}
.dmb-toggle button[aria-pressed=true]{background:#fff;color:#07535b;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.dmb-card{background:#fff;border:2px solid #e7e1d8;border-radius:16px;padding:14px;margin-bottom:12px}.dmb-card.is-current{border-color:#09858c}.dmb-card.is-best{border-color:#f5ad3d}.dmb-card{border-radius:20px!important}
.dmb-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.dmb-top h3{margin:0;font-size:17px}.dmb-price{font-weight:800;font-size:18px;color:#07535b}.dmb-price small{font-weight:600;color:#64748b}
.dmb-tag{display:inline-block;margin-top:4px;font-size:12px;font-weight:700;color:#8a5a00;background:#fff3d6;border-radius:999px;padding:2px 8px}
.dmb-card ul{margin:10px 0;padding-left:18px}.dmb-card li{margin:3px 0}
.dmb-btn{display:block;width:100%;min-height:48px;border:0;border-radius:16px;background:#0aa3ab;color:#fff;font:800 15px system-ui;border-bottom:4px solid #077a80}.dmb-btn[disabled]{background:#cbd5e1;color:#475569}
.dmb-link{border:0;background:none;color:#07535b;font-weight:700;text-decoration:underline;padding:8px 0}
.dmb-note{font-size:12px;color:#64748b}.dmb-msg{margin:10px 0;padding:10px 12px;border-radius:12px;background:#eefafa;color:#07535b;font-weight:600}.dmb-msg.err{background:#fdecec;color:#9b1c1c}
.dmb-gate input{width:100%;box-sizing:border-box;font-size:20px;padding:10px;border-radius:12px;border:2px solid #e7e1d8;margin:10px 0}`;

// Diji-Medu: oyun dünyası abonelik vitrini (satın alma ve veli kapısı korunur).
const showcaseCss = `
.dmb-veil{background:rgba(6,13,47,.78);align-items:center;padding:0}
.dmb-sheet{box-sizing:border-box;width:min(560px,100%);max-height:100dvh;border:0;border-radius:0;padding:16px 12px calc(20px + env(safe-area-inset-bottom,0px));color:#172e66;background:radial-gradient(circle at 12% 5%,#48c9ff 0,transparent 25%),radial-gradient(circle at 95% 27%,#9d50e9 0,transparent 32%),linear-gradient(145deg,#085ed5 0%,#2849be 48%,#6c3ac4 100%);font:600 14px/1.4 system-ui}
.dmb-head{position:relative;display:flex;align-items:center;justify-content:center;min-height:40px}
.dmb-head h2{font-size:26px;letter-spacing:-1.1px;color:#fff;text-shadow:0 3px 0 #1645a3,0 5px 14px #102568}
.dmb-x{position:absolute;right:0;top:0;color:#fff;background:#202a7e;border:2px solid #a5baff}
.dmb-hero{text-align:center;color:white;padding:12px 8px 6px}
.dmb-hero-mascot{width:110px;height:105px;object-fit:contain;margin:auto;filter:drop-shadow(0 5px 6px #19297f);display:block}
.dmb-hero-ribbon{display:block;margin:5px auto 7px;max-width:360px;background:linear-gradient(110deg,#ed3b94,#ff6a9c,#dc3182);border:2px solid #ffb1d1;border-radius:18px;padding:7px 10px;color:white;font-size:20px;font-weight:950;transform:rotate(-2deg);text-shadow:0 2px 2px #922c65;box-shadow:0 5px 0 #922d70,0 12px 18px #142b8d}
.dmb-hero p{margin:12px 0 8px;font-size:13px;font-weight:800;text-shadow:0 2px 3px #143879}
.dmb-toggle{margin:8px auto 16px;max-width:320px;border:1px solid #addbff;background:#1d3b9a;border-radius:999px}
.dmb-toggle button{color:#e3eaff;border-radius:999px}.dmb-toggle button[aria-pressed=true]{color:#15367f;background:linear-gradient(#fff7c6,#ffdc73)}
.dmb-body{display:flex;flex-direction:column;gap:11px}
.dmb-card{position:relative;box-sizing:border-box;margin:0!important;padding:15px 12px 12px!important;border:3px solid #afdaff!important;border-radius:25px!important;background:linear-gradient(180deg,#f0f8ff,#fff)!important;box-shadow:0 7px 0 #1556b1,0 12px 20px #182b88;color:#1c2b5a}
.dmb-card.is-pro{border-color:#75bafe!important;box-shadow:0 7px 0 #1245af,0 12px 22px #122a82}
.dmb-card.is-best{border-color:#ffdb64!important;background:linear-gradient(165deg,#fff7fe,#f6e5ff)!important;box-shadow:0 7px 0 #d68814,0 0 23px #ffd65b99,0 15px 25px #172279}
.dmb-card.is-current{outline:2px solid #38cdd9;outline-offset:-7px}
.dmb-top{align-items:center;gap:4px}.dmb-top h3{font-size:22px;color:#193479;font-weight:950}.dmb-card.is-best h3{color:#7b259e}
.dmb-price{white-space:nowrap;font-size:18px;color:#402174;background:linear-gradient(#fffaac,#ffc84b);border:2px solid white;border-radius:100px;padding:4px 10px;box-shadow:0 3px 0 #d99a27}
.dmb-price small{color:#4b2873;font-size:12px}
.dmb-card ul{list-style:none;padding:0;margin:10px 0 14px}.dmb-card li{display:flex;gap:8px;align-items:start;padding:5px 0;border-bottom:1px solid #cfdef5;font-size:13px;font-weight:750}.dmb-card li:before{content:'✨';flex:none}
.dmb-card.is-best li:before{content:'👑'}
.dmb-card.is-pro li:before{content:'⚡'}
.dmb-btn{border-radius:100px;min-height:51px;background:linear-gradient(#27aaff,#0555db);border:2px solid #b5e9ff;border-bottom:5px solid #164bad;font-weight:950;font-size:15px;box-shadow:0 4px 10px #123d9b33}
.dmb-card.is-best .dmb-btn{color:#5c176a;background:linear-gradient(#fff58d,#ffcb24);border-color:#fff0b9;border-bottom-color:#d58a11}
.dmb-btn[disabled]{background:linear-gradient(#eff7ff,#a7d8ed);color:#35577e;border-color:#fff;border-bottom-color:#6aadc7}
.dmb-tag{background:#fff0a2;color:#783d12}
.dmb-reasons{margin-top:16px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:9px 3px;border-radius:19px;background:#352eae99;border:1px solid #b4b0ff;color:#fff;text-align:center}
.dmb-reasons span{font-size:10px;font-weight:800}.dmb-reasons i{display:block;font-size:21px;font-style:normal}
.dmb-footer-banner{margin:14px auto;color:#4d1268;text-align:center;font-size:17px;font-weight:950;background:linear-gradient(#fff9a1,#ffc930);padding:13px;border:3px solid white;border-radius:100px;box-shadow:0 5px 0 #de9516}
.dmb-note{color:#e5eaff;font-size:11px;line-height:1.55}.dmb-link{color:#fff5ad}
.dmb-msg{background:#ecf7ff}.dmb-gate{background:#fff;border-radius:20px;padding:18px}
@media(min-width:600px){.dmb-sheet{max-height:94dvh;border-radius:25px}}
`;
  function close() { sheet?.remove(); sheet = null; }
  function el(html) { const t = doc.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function message(text, error = false) {
    const box = sheet?.querySelector('.dmb-msg'); if (!box) return;
    box.hidden = !text; box.textContent = text || ''; box.classList.toggle('err', !!error);
  }
  function render() {
    if (!sheet || !status) return;
    const cards = planCards({ role: status.role, plan: status.plan, products: status.products, storeProducts, period });
    const body = sheet.querySelector('.dmb-body');
    body.innerHTML = cards.map(c => `<div class="dmb-card${c.plan === 'pro' ? ' is-pro' : ''}${c.current ? ' is-current' : ''}${c.plan === 'premium_pro' ? ' is-best' : ''}">
      <div class="dmb-top"><h3>${esc(c.name)}</h3><span class="dmb-price">${apple && c.action === 'soon' ? '' : esc(c.price.text)}${c.price.per && !(apple && c.action === 'soon') ? ` <small>/ ${c.price.per}</small>` : ''}</span></div>
      ${c.saving ? `<span class="dmb-tag">%${c.saving} tasarruf</span>` : ''}${c.price.trialDays && c.action === 'buy' ? ` <span class="dmb-tag">${c.price.trialDays} gün ücretsiz dene</span>` : ''}
      <ul>${c.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      ${c.action === 'buy' ? `<button class="dmb-btn" data-buy="${esc(c.id)}">${status.plan === 'free' ? 'Seç' : 'Yükselt'}</button>`
        : c.action === 'current' ? `<button class="dmb-btn" disabled>Şu anki planın</button>`
        : c.action === 'soon' ? `<button class="dmb-btn" disabled>Yakında</button>`
        : c.action === 'unavailable' ? `<button class="dmb-btn" disabled>Şu an satışta değil</button>` : ''}
    </div>`).join('') + `<div class="dmb-reasons"><span><i>⚡</i>Daha fazla enerji</span><span><i>🎮</i>Premium oyun</span><span><i>🚫</i>Reklamsız</span><span><i>🪙</i>Daha fazla altın</span><span><i>🛡️</i>Seri kalkanı</span></div><div class="dmb-footer-banner">👑 Ayrıcalıkları keşfet!</div>` + (apple ? `<p class="dmb-note">Ödeme onaylandığında Apple Kimliği hesabından alınır. Abonelik, dönem bitmeden en az 24 saat önce iptal edilmezse aynı süre ve fiyatla otomatik yenilenir; yenileme ücreti dönem bitmeden önceki 24 saat içinde alınır. Aboneliği satın aldıktan sonra Ayarlar &gt; Apple Kimliği &gt; Abonelikler bölümünden yönetebilir veya iptal edebilirsin.</p>
      <p class="dmb-note"><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener">Kullanım Koşulları (EULA)</a> · <a href="https://app.dijimedu.com/ingilizce/gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikası</a></p>`
      : `<p class="dmb-note">Ödeme Google Play hesabından alınır. Abonelik, dönem bitmeden en az 24 saat önce iptal edilmezse aynı süreyle yenilenir. İptal ve ödeme yöntemi Google Play &gt; Abonelikler bölümünden yönetilir.</p>`) + `
      <button class="dmb-link" data-restore>Satın alımları geri yükle</button> ${status.plan !== 'free' ? '<button class="dmb-link" data-manage>Aboneliği yönet</button>' : ''}`;
    for (const b of sheet.querySelectorAll('[data-buy]')) b.onclick = () => gateThen(() => buy(b.dataset.buy));
    sheet.querySelector('[data-restore]').onclick = async () => {
      message('Kontrol ediliyor…');
      try { const n = await restore({ quiet: false }); await refresh(); render(); message(n ? 'Aboneliğin hesabına bağlandı.' : (apple ? 'Bu Apple Kimliğinde' : 'Bu Google hesabında') + ' etkin abonelik bulunamadı.'); }
      catch (e) { message(e.message, true); }
    };
    const manage = sheet.querySelector('[data-manage]');
    if (manage) manage.onclick = () => plugin.manage({ productId: status.entitlements?.[0]?.product_key || '' }).catch(() => {});
    for (const t of sheet.querySelectorAll('[data-period]')) t.setAttribute('aria-pressed', String(t.dataset.period === period));
  }
  function gateThen(next) {
    if (status.role === 'teacher') return next();
    const gate = parentGate();
    const body = sheet.querySelector('.dmb-body');
    body.innerHTML = `<div class="dmb-gate"><p><b>${esc(gate.question)}</b></p><input inputmode="numeric" autocomplete="off" aria-label="Cevap"><button class="dmb-btn" data-ok>Devam</button> <button class="dmb-link" data-back>Geri</button></div>`;
    const input = body.querySelector('input'); input.focus();
    body.querySelector('[data-back]').onclick = render;
    body.querySelector('[data-ok]').onclick = () => { if (gatePassed(gate, input.value)) next(); else { render(); message('Cevap doğru değil. Satın alma için veline danış.', true); } };
  }
  async function buy(productId) {
    if (busy) return; busy = true; render(); message(apple ? 'App Store açılıyor…' : 'Google Play açılıyor…');
    try {
      const current = (status.entitlements || []).find(e => e.provider === 'google');
      let oldPurchaseToken = null;
      if (current && !apple) { const { purchases = [] } = await plugin.restore().catch(() => ({})); oldPurchaseToken = purchases.find(p => (p.products || []).includes(current.product_key))?.purchaseToken || null; }
      const result = await plugin.purchase({ productId, basePlanId: period, accountRef: status.accountRef, ...(oldPurchaseToken ? { oldPurchaseToken } : {}) });
      if (result.canceled) { message(''); return; }
      if (result.alreadyOwned) { await restore({ quiet: false }); render(); message('Bu abonelik zaten senin. Hesabına bağlandı.'); return; }
      const purchase = (result.purchases || []).find(p => (p.products || []).includes(productId));
      if (purchase?.state === 'pending') { message('Ödeme onay bekliyor. Onaylanınca planın otomatik açılır.'); return; }
      await verify(purchase);
      render(); message('Teşekkürler! ' + (status.plan === 'premium_pro' ? 'Premium Pro' : 'Pro') + ' planın açıldı.');
    } catch (e) { render(); message(e.message || 'Satın alma tamamlanamadı.', true); }
    finally { busy = false; }
  }
  async function open(source = '') {
    if (!doc.getElementById('dmb-style')) { const s = doc.createElement('style'); s.id = 'dmb-style'; s.textContent = css + showcaseCss; doc.head.append(s); }
    close();
    sheet = el(`<div class="dmb-veil" role="dialog" aria-modal="true" aria-label="Planlar" data-source="${esc(source)}"><div class="dmb-sheet">
      <div class="dmb-head"><h2>Diji-Medu</h2><button class="dmb-x" aria-label="Kapat">✕</button></div><div class="dmb-hero"><img class="dmb-hero-mascot" src="https://app.dijimedu.com/ingilizce/discovery-assets/papi-kutlama.webp" alt="Papi" loading="eager"><strong class="dmb-hero-ribbon">Paketlerini Keşfet!</strong><p>İhtiyacına en uygun paketi seç,<br>Diji-Medu deneyimini üst seviyeye taşı!</p></div>
      <div class="dmb-toggle"><button data-period="aylik">Aylık</button><button data-period="yillik">Yıllık</button></div>
      <div class="dmb-msg" hidden></div><div class="dmb-body"><p>Planlar yükleniyor…</p></div></div></div>`);
    sheet.querySelector('.dmb-x').onclick = close;
    sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
    for (const t of sheet.querySelectorAll('[data-period]')) t.onclick = () => { period = t.dataset.period; render(); };
    doc.body.append(sheet);
    await refresh();
    if (!status) { message('Planları görmek için giriş yapmalısın.', true); sheet.querySelector('.dmb-body').innerHTML = ''; return; }
    if (!status.canBuy) { render(); message('Bu hesapla satın alma yapılamaz.', true); return; }
    await products(); render();
  }

  plugin.addListener?.('purchase', async data => { for (const p of data.purchases || []) { try { await verify(p); } catch {} } render(); });
  return { available: true, open, close, refresh, restore, get status() { return status; }, isOpen: () => !!sheet };
}
