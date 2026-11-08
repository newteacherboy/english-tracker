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
.dmb-veil{background:rgba(7,12,55,.82);align-items:center;padding:0}
.dmb-sheet{box-sizing:border-box;width:min(1180px,100%);max-height:100dvh;border:0;border-radius:0;padding:18px 15px calc(24px + env(safe-area-inset-bottom,0px));color:#233468;background:radial-gradient(circle at 7% 5%,#1fa9f9 0,transparent 30%),radial-gradient(circle at 95% 21%,#8839e4 0,transparent 34%),linear-gradient(120deg,#1167d0 0%,#1751c8 43%,#7136bf 100%);font:650 15px/1.45 system-ui;box-shadow:0 15px 50px #081356}
.dmb-sheet:before{content:'✦     ✧         ✦              ✧       ✦';display:block;position:absolute;top:110px;right:0;pointer-events:none;font-size:23px;color:#ffdf67;opacity:.72;letter-spacing:30px}
.dmb-head{position:relative;display:flex;align-items:center;justify-content:center;min-height:55px}
.dmb-head h2{font-size:clamp(27px,4vw,49px);letter-spacing:-2px;color:#ffdf40;-webkit-text-stroke:1.5px white;text-shadow:0 3px 0 #174caa,0 6px 0 #072f8c,0 9px 15px #122166;font-weight:1000}
.dmb-x{position:absolute;right:0;top:0;color:white;background:#273d9e;border:2px solid #e0e6ff;z-index:3}
.dmb-hero{position:relative;text-align:center;color:#fff;min-height:155px;padding:4px 12px 6px}
.dmb-hero-mascot{position:absolute;top:-34px;left:1%;width:170px;height:165px;object-fit:contain;filter:drop-shadow(0 5px 7px #102888);pointer-events:none}
.dmb-hero-ribbon{display:block;position:relative;margin:0 auto 12px;max-width:710px;box-sizing:border-box;padding:13px 16px;background:linear-gradient(115deg,#c92786,#fe5dab 48%,#d52a86);border:3px solid #ffa5d1;clip-path:polygon(0 8%,6% 8%,7% 0,93% 0,94% 8%,100% 8%,96% 50%,100% 92%,92% 92%,91% 100%,9% 100%,8% 92%,0 92%,4% 50%);font-size:clamp(23px,3.6vw,41px);font-weight:1000;letter-spacing:-.8px;text-shadow:0 3px 2px #921969;box-shadow:0 9px 18px #152b84;transform:rotate(-1.5deg)}
.dmb-hero p{margin:5px 0 0 125px;font-size:clamp(12px,1.65vw,20px);font-weight:850;text-shadow:0 2px 5px #163b91}
.dmb-toggle{margin:10px auto 19px;max-width:320px;border:2px solid #c9b8ff;background:#1a3596;border-radius:999px;padding:3px}
.dmb-toggle button{color:#fff;border-radius:999px}
.dmb-toggle button[aria-pressed=true]{color:#17357e;background:linear-gradient(#fff9be,#ffd05e)}
.dmb-body{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:12px}
.dmb-card{position:relative;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;margin:0!important;padding:22px 14px 14px!important;border:4px solid #e9f4ff!important;border-radius:35px!important;background:linear-gradient(160deg,#e2f4ff,#fff 52%,#e3f0ff)!important;box-shadow:0 7px 0 #165bb7,0 14px 25px #152777;color:#18305d}
.dmb-card:before{content:'🌱';position:absolute;top:-30px;left:18px;font-size:43px;filter:drop-shadow(0 4px 2px #163c8788)}
.dmb-card.is-pro{border-color:#b1e0ff!important;box-shadow:0 8px 0 #0755cd,0 16px 26px #122679}
.dmb-card.is-pro:before{content:'👑'}
.dmb-card.is-best{border-color:#ffe06e!important;background:linear-gradient(165deg,#c648e2 0,#8129c9 75px,#f9e5ff 90px,#ffeafb 100%)!important;box-shadow:0 7px 0 #dc9719,0 0 24px #ffdf6daa,0 15px 23px #152480}
.dmb-card.is-best:before{content:'👑';font-size:55px;left:calc(50% - 30px);top:-47px}
.dmb-card.is-current{outline:2px solid #20c5db;outline-offset:-8px}
.dmb-top{display:flex;align-items:flex-start;justify-content:space-between;gap:4px;flex-wrap:wrap;min-height:88px}
.dmb-top h3{font-size:clamp(20px,2.5vw,34px);line-height:1.12;color:#153c8d;font-weight:1000;margin:8px 0}
.dmb-card.is-best h3{color:white;text-shadow:0 3px 4px #4d1b89}
.dmb-price{font-size:clamp(15px,2vw,23px);white-space:nowrap;font-weight:1000;background:linear-gradient(#fff9a8,#ffd044);color:#39206d;border:3px solid white;border-radius:999px;padding:5px 11px;box-shadow:0 4px 0 #df9e19}
.dmb-price small{color:#482d63;font-size:12px}
.dmb-card ul{padding:0;margin:8px 0 14px;list-style:none;flex:1;background:#ffffffdb;border-radius:20px;padding:13px 10px}
.dmb-card li{display:flex;gap:9px;align-items:start;padding:8px 0;font-size:clamp(12px,1.35vw,16px);font-weight:780;border-bottom:1px solid #d6e6fa;line-height:1.27}
.dmb-card li:last-child{border-bottom:0}
.dmb-card li:before{content:'✨';display:block;flex:0 0 24px;font-size:19px}
.dmb-card li[data-feature=energy]:before{content:'⚡'}
.dmb-card li[data-feature=games]:before{content:'🎮'}
.dmb-card li[data-feature=ads]:before{content:'🚫'}
.dmb-card li[data-feature=coins]:before{content:'🪙'}
.dmb-card li[data-feature=shield]:before{content:'🛡️'}
.dmb-card li[data-feature=all]:before{content:'👑'}
.dmb-tag{background:#fff0a2;color:#7d4514;font-weight:900}
.dmb-btn{width:100%;min-height:56px;background:linear-gradient(#279cff,#0753d8);color:white;border:3px solid #b5eaff;border-bottom:6px solid #1247aa;border-radius:100px;font-weight:1000;font-size:clamp(14px,1.6vw,20px);text-shadow:0 1px 2px #183e89;box-shadow:0 5px 11px #0a4db34d}
.dmb-card.is-best .dmb-btn{color:#4b1a68;text-shadow:none;background:linear-gradient(#fff98f,#ffca1a);border-color:#fff5bb;border-bottom-color:#d18c08}
.dmb-btn[disabled]{background:linear-gradient(#f1fbff,#b3d6ec);color:#47647b;text-shadow:none;border-color:#fff;border-bottom-color:#6cabc6}
.dmb-reasons{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;margin-top:24px;padding:10px 4px;border-radius:22px;background:#253caa8c;border:2px solid #8e8bed;color:#fff;text-align:center}
.dmb-reasons span{font-size:clamp(10px,1.3vw,15px);font-weight:900;border-right:1px solid #9caef5;padding:2px 5px}.dmb-reasons span:last-child{border:0}
.dmb-reasons i{display:block;font-size:27px;font-style:normal}
.dmb-footer-banner{grid-column:1/-1;width:min(650px,100%);margin:16px auto 0;text-align:center;color:#5c206b;font-weight:1000;font-size:clamp(16px,2.2vw,27px);background:linear-gradient(#fff9a3,#ffcb20);padding:17px;border:4px solid white;border-bottom:7px solid #d98b06;border-radius:100px;box-shadow:0 8px 20px #162682;font-family:inherit;cursor:pointer}
.dmb-footer-banner:focus-visible{outline:4px solid white}
.dmb-note{grid-column:1/-1;color:#f4edff;font-size:12px;line-height:1.6;margin:6px 8px}
.dmb-link{grid-column:1/-1;justify-self:start;color:#fff5a0}
.dmb-msg{background:#f1f6ff}.dmb-gate{grid-column:1/-1;background:#fff;border-radius:24px;padding:20px}
@media(max-width:720px){
.dmb-sheet{padding:12px 10px calc(20px + env(safe-area-inset-bottom,0px));}
.dmb-hero{min-height:132px;padding-top:8px}
.dmb-hero-mascot{width:95px;height:95px;top:35px;left:-8px}
.dmb-hero-ribbon{margin-left:52px;font-size:22px;padding:10px 7px}
.dmb-hero p{margin:14px 0 0 80px;font-size:12px}
.dmb-body{grid-template-columns:minmax(0,1fr);gap:13px}
.dmb-card{padding:16px 15px!important;border-radius:25px!important}
.dmb-card:before{font-size:31px;top:-22px}
.dmb-card.is-best:before{font-size:42px;top:-33px}
.dmb-top{min-height:auto;flex-wrap:nowrap;align-items:center}
.dmb-top h3{font-size:24px}
.dmb-price{font-size:17px}
.dmb-card ul{padding:10px 13px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 10px}
.dmb-card li{font-size:12px;padding:6px 0}
.dmb-btn{min-height:50px}
.dmb-reasons{margin-top:12px}
.dmb-reasons span{font-size:9px;padding:2px}
.dmb-reasons i{font-size:19px}
.dmb-footer-banner{padding:11px;font-size:16px}
}
@media(min-width:721px){.dmb-sheet{max-height:94dvh;border-radius:28px}}
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
      <ul>${c.features.map(f => `<li data-feature="${/enerji/i.test(f) ? 'energy' : /oyun/i.test(f) ? 'games' : /reklam/i.test(f) ? 'ads' : /altın/i.test(f) ? 'coins' : /kalkan/i.test(f) ? 'shield' : /her şey/i.test(f) ? 'all' : 'other'}">${esc(f)}</li>`).join('')}</ul>
      ${c.action === 'buy' ? `<button class="dmb-btn" data-buy="${esc(c.id)}">${status.plan === 'free' ? 'Seç' : 'Yükselt'}</button>`
        : c.action === 'current' ? `<button class="dmb-btn" disabled>Şu anki planın</button>`
        : c.action === 'soon' ? `<button class="dmb-btn" disabled>Yakında</button>`
        : c.action === 'unavailable' ? `<button class="dmb-btn" disabled>Şu an satışta değil</button>` : ''}
    </div>`).join('') + `<div class="dmb-reasons"><span><i>⚡</i>Daha fazla enerji</span><span><i>🎮</i>Premium oyun</span><span><i>🚫</i>Reklamsız</span><span><i>🪙</i>Daha fazla altın</span><span><i>🛡️</i>Seri kalkanı</span></div><button type="button" class="dmb-footer-banner" data-discover>🛒 Hemen Satın Al · Ayrıcalıkları Kaçırma!</button>` + (apple ? `<p class="dmb-note">Ödeme onaylandığında Apple Kimliği hesabından alınır. Abonelik, dönem bitmeden en az 24 saat önce iptal edilmezse aynı süre ve fiyatla otomatik yenilenir; yenileme ücreti dönem bitmeden önceki 24 saat içinde alınır. Aboneliği satın aldıktan sonra Ayarlar &gt; Apple Kimliği &gt; Abonelikler bölümünden yönetebilir veya iptal edebilirsin.</p>
      <p class="dmb-note"><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener">Kullanım Koşulları (EULA)</a> · <a href="https://app.dijimedu.com/ingilizce/gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikası</a></p>`
      : `<p class="dmb-note">Ödeme Google Play hesabından alınır. Abonelik, dönem bitmeden en az 24 saat önce iptal edilmezse aynı süreyle yenilenir. İptal ve ödeme yöntemi Google Play &gt; Abonelikler bölümünden yönetilir.</p>`) + `
      <button class="dmb-link" data-restore>Satın alımları geri yükle</button> ${status.plan !== 'free' ? '<button class="dmb-link" data-manage>Aboneliği yönet</button>' : ''}`;
    const discover = sheet.querySelector('[data-discover]');
    if (discover) discover.onclick = () => sheet.querySelector('.dmb-card.is-best .dmb-btn:not([disabled]),.dmb-card.is-pro .dmb-btn:not([disabled])')?.focus();
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
