/* DijiMedu shop · design 4. All purchases use existing server operations. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gold = () => typeof yo !== 'undefined' && yo ? Number(yo.altin || 0) : 0;
  const wardrobe = () => window.dmStoreWardrobe;
  const toast = message => window.yoToast?.(message);
  const packs = [[5,230],[10,300],[15,460]];
  const legacyWardrobe = window.yoMagazaAc;
  let page = 'home', pending = false, energyStatus = '', energyLimit = '', storeVisit = 0, observer = null, refreshTimer = null;
  const art = (name, cls = '') => `<span class="ds-art ds-art-${name} ${cls}" aria-hidden="true"></span>`;
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  const money = n => `${art('coin')}<span>${Number(n).toLocaleString('tr-TR')}</span>`;
  const allowed = code => window.dmProgression?.allowed(code) !== false;
  function button(label, attrs = '', disabled = false) { return `<button type="button" class="ds-buy" ${attrs} ${disabled && !(label === 'Altın eksik' && window.DijiReklam?.reklamGosterilsinMi()) ? 'disabled' : ''} ${label === 'Altın eksik' ? 'data-ad-shortage' : ''}>${label}</button>`; }
  function header() {
    return `<header class="ds-header"><div class="ds-heading">${art('bag')}<div><h1>Mağaza</h1><p>Karakterini giydir, enerjini al, macerana renk kat!</p></div></div><button type="button" class="ds-wallet" data-ds="energy" aria-label="Altın bakiyen ${gold()} · enerji paketlerine git">${money(gold())}<span class="ds-plus">+</span></button></header>`;
  }
  function energy() {
    const current = Number(window.genelEnerjiKalan || 0), capacity = Number(window.genelEnerjiMax || 30);
    return `<section class="ds-energy" id="dsEnergy" aria-labelledby="dsEnergyTitle"><div class="ds-energy-intro">${art('bolt')}<div><h2 id="dsEnergyTitle">Enerji al</h2><p>Daha uzun süre öğren,<br>daha çok eğlen!</p><small>Enerjin: ${current}/${capacity}</small></div></div><div class="ds-packs">${packs.map(([n,p]) => {
      const full = current + n > capacity, poor = gold() < p;
      return `<article class="ds-pack"><b>${art('bolt')}+${n}</b><div class="ds-price">${money(p)}</div>${button(full ? 'Yer yok' : poor ? 'Altın eksik' : 'Al', `data-pack="${n}" aria-label="${n} enerji, ${p} altın${full ? ', kapasite yetersiz' : ''}"`, full || pending)}</article>`;
    }).join('')}</div><p role="status" style="grid-column:1/-1" ${(energyStatus || energyLimit) ? '' : 'hidden'}>${esc(energyStatus || energyLimit)}</p></section>`;
  }
  function garment(p) {
    const color = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#9b64ef';
    const paths = p.category === 'ayak' ? '<path d="M13 44V27h23l9 16 24 8q8 3 7 11H13Z"/><path d="M14 60h60M30 38h14M34 43h16" fill="none" stroke="#fff" stroke-width="4"/>' : p.category === 'alt' ? '<path d="M25 15h42l-2 58H49l-3-37-4 37H25Z"/><path d="M26 24h39" fill="none" stroke="#fff" stroke-width="4"/>' : p.category === 'aks' ? '<rect x="22" y="25" width="48" height="50" rx="13"/><path d="M34 27V18q12-13 24 0v9" fill="none" stroke-width="6"/><rect x="32" y="48" width="28" height="18" rx="5" fill="#ffffff55"/>' : '<path d="m29 17-21 17 13 17 9-7v30h32V44l9 7 13-17-21-17-10 9H40Z"/><path d="M35 17q11 19 23 0" stroke="#fff" fill="none" stroke-width="4"/>';
    return `<svg viewBox="0 0 92 92" role="img" aria-label="Giyim parçası"><defs><linearGradient id="ds${esc(p.id).replace(/[^a-z0-9]/gi,'')}" x2=".3" y2="1"><stop stop-color="#fff"/><stop offset=".3" stop-color="${color}"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><g fill="${color}" stroke="#48206355" stroke-width="2" stroke-linejoin="round">${paths}</g></svg>`;
  }
  function offerCard(o, i) {
    const parts = wardrobe()?.parts?.(o.id) || [];
    const preview = wardrobe()?.art(o.id) || '';
    const thumbnails = !i && parts.length ? '<div class="ds-parts">'+parts.map(p=>'<span title="'+esc(p.name)+'">'+p.preview+'</span>').join('')+'</div>' : '';
    const label = !o.allowed ? `🔒 Sv. ${o.level}` : o.equipped ? 'Giyili' : o.owned ? 'Kuşan' : gold() < o.price ? 'Altın eksik' : 'Satın al';
    return `<article class="ds-offer ${i ? 'ds-opportunity' : 'ds-outfit'}"><button type="button" class="ds-offer-heading" data-ds="clothing"><h2>${esc(o.title)}</h2></button><p>${esc(o.name)}${o.count > 1 ? ' · '+o.count+' parça' : ''}</p><div class="ds-offer-note">${esc(o.note || (o.count > 1 ? 'Birbiriyle uyumlu parçalar' : 'Tarzına yeni bir renk kat!'))}</div>${thumbnails}<button type="button" class="ds-product-preview" data-ds="clothing" aria-label="${esc(o.name)} ürününü incele">${preview}</button><div class="ds-offer-footer"><div class="ds-price">${money(o.price)}</div>${button(label, `data-item="${esc(o.id)}"`, !o.allowed || o.equipped || (!o.owned && gold() < o.price) || pending)}</div></article>`;
  }
  // 11 Kas 2026 · Claude Design "Mağaza B": Premium kartı (Premium Pro dışında; iOS'ta da açık). Reklamla enerji kartı dm-satis.js'ten gelir (#dmsShopEnergy).
  function v2Extras() {
    const pro = !window.dmTeacherPortalMode && Number(window.genelEnerjiMax || 0) < 60 && !!window.DMSatis?.planlar;
    return `${pro ? '<button type="button" class="ds-v2-pro" data-ds="plans"><span class="ds-v2-crown" aria-hidden="true"></span><span class="ds-v2-pro-copy"><b>Premium · sınırsız enerji</b><small>Enerji derdi yok, reklam yok</small></span><span class="ds-v2-pro-go">Premium ol</span></button>' : ''}`;
  }
  function home() {
    const offers = wardrobe()?.offers() || [];
    const character = wardrobe()?.character(240) || '<img src="profile-assets/papi-selam.png" alt="Papi">';
    const ready = wardrobe()?.ready();
    return `<main class="ds-home">${header()}<section class="ds-room" aria-label="Karakterinin giyinme odası"><div class="ds-wardrobe-shortcuts"><button type="button" data-category="sapka" aria-label="Şapka ve gözlükleri incele">🧢</button><button type="button" data-category="ust" aria-label="Üst giyimi incele">🧥</button><button type="button" data-category="aks" aria-label="Aksesuarları incele">🎒</button></div><div class="ds-character">${character}</div><div class="ds-character-actions"><button type="button" class="ds-character-label" data-ds="builder"><b>${ready ? 'Karakterin' : 'Papi seni bekliyor'}</b><span>✎ ${ready ? 'Tipimi tasarla' : 'Karakterini oluştur'}</span></button><button type="button" class="ds-shop-cta" data-ds="clothing" aria-label="Alışveriş Yap: karakterin için kıyafet ve aksesuarları aç"><span aria-hidden="true">🛍️</span><span>Alışveriş Yap</span><span aria-hidden="true">›</span></button></div></section>${energy()}${v2Extras()}<section class="ds-v2-shortcuts" aria-label="Çantam ve günün fırsatı"><button type="button" class="ds-v2-tile ds-v2-bag" data-ds="bag"><span class="ds-v2-art"><img src="bag-purple.svg" alt=""></span><b>Çantam</b><small>Aldıkların ve kazandıkların</small></button><button type="button" class="ds-v2-tile ds-v2-deal" data-ds="clothing"><span class="ds-v2-art">${(offers[1]||offers[0]) ? (wardrobe()?.art((offers[1]||offers[0]).id) || '') : '<span class="ds-v2-sprite"></span>'}</span><b>Günün fırsatı</b><small>${esc((offers[1]||offers[0])?.name || 'Giyim koleksiyonunu keşfet!')}</small></button></section><section class="ds-discover-grid" aria-label="Sandıklar"><button type="button" class="ds-chests" data-ds="chests">${art('chest')}<span><b>Sandıklar</b><small>Sürpriz ödüllerini keşfet!</small></span>${arrow}</button></section></main>`;
  }
  function root() {
    const overlay = $('tab-magaza'), cap = overlay?.querySelector('.mg-kap');
    if (!cap) return null;
    let r = $('dmStoreFront'); if (!r) { r = document.createElement('div'); r.id = 'dmStoreFront'; cap.prepend(r); }
    return r;
  }
  function refresh() {
    if (page !== 'home' || !$('tab-magaza')?.classList.contains('active')) return;
    const r = root(); if (r) { r.innerHTML = home(); bind(r); }
  }
  async function updateEnergyLimit(visit) {
    const message = await window.dmEkonomi?.paketUyarisi?.();
    if (visit !== storeVisit || page !== 'home' || !message) return;
    energyLimit = message;
    if (!pending) refresh();
  }
  function showHome() {
    page = 'home'; energyStatus = ''; energyLimit = ''; const visit = ++storeVisit; const overlay = $('tab-magaza'); if (!overlay) return;
    overlay.classList.add('ds-store', 'ds-home-mode'); overlay.classList.remove('ds-detail-mode');
    $('dsCategoryBack')?.remove(); refresh(); overlay.scrollTop = 0; void updateEnergyLimit(visit);
  }
  function showDetail(kind, category) {
    if (kind !== 'clothing') return;
    page = kind; const overlay = $('tab-magaza'); overlay.classList.remove('ds-home-mode'); overlay.classList.add('ds-detail-mode');
    let back = $('dsCategoryBack'); if (!back) { back = document.createElement('button'); back.type = 'button'; back.id = 'dsCategoryBack'; back.className = 'ds-back'; overlay.querySelector('.mg-kap').prepend(back); }
    back.textContent = '‹ Mağazaya dön'; back.onclick = showHome;
    if (kind === 'clothing') {
      const target = $('magazaAlan'); target.style.display = ''; window.yoGomuluHedef = 'magazaAlan';
      legacyWardrobe?.();
      if (category) target.querySelector(`#dlSekmeler [data-s="${category}"]`)?.click();
      root().innerHTML = '';
    }
    overlay.scrollTop = 0;
  }
  async function purchase(btn, action) {
    if (pending || btn.disabled) return;
    if(!btn.dataset.pack && btn.hasAttribute('data-ad-shortage') && window.DijiReklam?.reklamGosterilsinMi()){const urun=btn.dataset.item?{tip:'kiyafet',id:btn.dataset.item}:{tip:'enerji',id:btn.dataset.pack};window.DijiReklam.altinEksik(urun);return;}
    pending = true; const old = btn.textContent; btn.disabled = true; btn.textContent = 'Alınıyor…';
    try { await action(); }
    catch (e) { toast(e.message || 'Satın alma tamamlanamadı.'); }
    finally { pending = false; if (page === 'home') refresh(); if (btn.isConnected) { btn.disabled = false; btn.textContent = old; } }
  }
  function bind(r) {
    r.querySelectorAll('[data-ds]').forEach(btn => btn.onclick = () => {
      if (btn.dataset.ds === 'builder') { window.dmCharacterBuilder?.open(); return; }
      if (btn.dataset.ds === 'energy') { $('dsEnergy')?.scrollIntoView({block:'center',behavior:'smooth'}); return; }
      if (btn.dataset.ds === 'chests') { window.dmProgression?.chests(); return; }
      if (btn.dataset.ds === 'bag') { window.dmBagInventory?.open(); return; }
      if (btn.dataset.ds === 'plans') { window.DMSatis?.planlar?.('magaza'); return; }
      showDetail(btn.dataset.ds);
    });
    r.querySelectorAll('[data-category]').forEach(btn => btn.onclick = () => showDetail('clothing', btn.dataset.category));
    r.querySelectorAll('[data-pack]').forEach(btn => btn.onclick = () => purchase(btn, async () => {
      const visit = storeVisit;
      energyStatus = ''; energyLimit = '';
      const purchased = await window.enerjiPaketiAl(Number(btn.dataset.pack), message => { if (visit === storeVisit) energyStatus = message; });
      if (purchased) void updateEnergyLimit(visit);
    }));
    r.querySelectorAll('[data-item]').forEach(btn => btn.onclick = () => purchase(btn, () => wardrobe().buy(btn.dataset.item)));
  }
  window.magazaAc = function () {
    if (typeof yoHazirMi === 'function' && !yoHazirMi()) return;
    if (!window.dmProgression?.require('magaza')) return;
    window.dcTumTamEkranlariKapat?.();
    const overlay = $('tab-magaza'); if (!overlay) return;
    overlay.style.cssText = ''; overlay.classList.add('active'); window.yoGomuluHedef = 'magazaAlan';
    showHome(); window.dcBottomNavSenkronize?.();
  };
  // Wardrobe redraws update the storefront, without timers that rebuild the page.
  function observe() {
    if (observer || !$('tab-magaza')) return;
    observer = new MutationObserver(() => {
      if (page === 'home' && $('tab-magaza').classList.contains('active') && !$('dmStoreFront')) showHome();
    });
    observer.observe($('tab-magaza'), {childList:true, subtree:true});
  }
  window.dmStoreFront = { refresh, open: window.magazaAc };
  // Keep balances/energy current without replacing a button during a purchase.
  refreshTimer = setInterval(() => {
    if (!pending && !document.hidden && page === 'home' && $('tab-magaza')?.classList.contains('active')) {
      const fingerprint = [gold(),window.genelEnerjiKalan,window.dmProgression?.level(),JSON.stringify(typeof yo !== 'undefined' ? yo?.karakter?.s : {})].join('|');
      const r = root(); if (r && r.dataset.state !== fingerprint) { r.dataset.state = fingerprint; refresh(); }
    }
  }, 1500);
  observe();
  // Independent Çantam is loaded after the unchanged storefront initialization.
  if (!window.dmBagInventory && !document.querySelector('script[data-dm-bag-module]')) {
    const module = document.createElement('script');
    module.dataset.dmBagModule = '1';
    module.src = new URL('bag-inventory.js?v=20261113-no-jokers', document.currentScript?.src || location.href).href;
    document.head.appendChild(module);
  }
})();
