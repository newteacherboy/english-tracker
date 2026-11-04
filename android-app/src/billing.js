import { planCards, parentGate, gatePassed } from './billing-core.js';

// Google Play abonelikleri: plan ekranı, veli kapısı, satın alma → sunucu doğrulaması → plan yenileme.
export function createBilling({ plugin, win, endpoint }) {
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
    const result = await call({ action: 'verify', productId, purchaseToken: purchase.purchaseToken });
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
    body.innerHTML = cards.map(c => `<div class="dmb-card${c.current ? ' is-current' : ''}${c.plan === 'premium_pro' ? ' is-best' : ''}">
      <div class="dmb-top"><h3>${esc(c.name)}</h3><span class="dmb-price">${esc(c.price.text)}${c.price.per ? ` <small>/ ${c.price.per}</small>` : ''}</span></div>
      ${c.saving ? `<span class="dmb-tag">%${c.saving} tasarruf</span>` : ''}${c.price.trialDays && c.action === 'buy' ? ` <span class="dmb-tag">${c.price.trialDays} gün ücretsiz dene</span>` : ''}
      <ul>${c.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      ${c.action === 'buy' ? `<button class="dmb-btn" data-buy="${esc(c.id)}">${status.plan === 'free' ? 'Seç' : 'Yükselt'}</button>`
        : c.action === 'current' ? `<button class="dmb-btn" disabled>Şu anki planın</button>`
        : c.action === 'soon' ? `<button class="dmb-btn" disabled>Yakında</button>`
        : c.action === 'unavailable' ? `<button class="dmb-btn" disabled>Şu an satışta değil</button>` : ''}
    </div>`).join('') + `<p class="dmb-note">Ödeme Google Play hesabından alınır. Abonelik, dönem bitmeden en az 24 saat önce iptal edilmezse aynı süreyle yenilenir. İptal ve ödeme yöntemi Google Play &gt; Abonelikler bölümünden yönetilir.</p>
      <button class="dmb-link" data-restore>Satın alımları geri yükle</button> ${status.plan !== 'free' ? '<button class="dmb-link" data-manage>Aboneliği yönet</button>' : ''}`;
    for (const b of sheet.querySelectorAll('[data-buy]')) b.onclick = () => gateThen(() => buy(b.dataset.buy));
    sheet.querySelector('[data-restore]').onclick = async () => {
      message('Kontrol ediliyor…');
      try { const n = await restore({ quiet: false }); await refresh(); render(); message(n ? 'Aboneliğin hesabına bağlandı.' : 'Bu Google hesabında etkin abonelik bulunamadı.'); }
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
    if (busy) return; busy = true; render(); message('Google Play açılıyor…');
    try {
      const current = (status.entitlements || []).find(e => e.provider === 'google');
      let oldPurchaseToken = null;
      if (current) { const { purchases = [] } = await plugin.restore().catch(() => ({})); oldPurchaseToken = purchases.find(p => (p.products || []).includes(current.product_key))?.purchaseToken || null; }
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
    if (!doc.getElementById('dmb-style')) { const s = doc.createElement('style'); s.id = 'dmb-style'; s.textContent = css; doc.head.append(s); }
    close();
    sheet = el(`<div class="dmb-veil" role="dialog" aria-modal="true" aria-label="Planlar" data-source="${esc(source)}"><div class="dmb-sheet">
      <div class="dmb-head"><h2>Planlar</h2><button class="dmb-x" aria-label="Kapat">✕</button></div>
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
