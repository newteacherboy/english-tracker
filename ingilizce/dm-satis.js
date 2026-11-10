/* Diji Medu satış katmanı (web).
   Enerji molası penceresi, öğrenci ve öğretmen paket ekranları, Mağaza/Oyunlar reklam kartları,
   düşük enerji / başarı / profil teklifleri burada çizilir. Uygulama paketi (Android ve iOS) yalnız
   köprü sağlar: ödüllü video (dmAndroidWatchReward), reklam ayarları (dmAndroidPlacements) ve
   mağaza aboneliği (DmBilling eklentisi). Bu dosya siteden geldiği için tasarım ve kural
   değişiklikleri yeni uygulama sürümü gerektirmez. Eski paketlerin kendi pencereleri dm-satis.css
   ile gizlenir; paket içindeki "planları aç" çağrıları buraya yönlendirilir. */
(() => {
  'use strict';
  if (window.DMSatis) return;
  const W = window, D = document;
  const VER = '20261110-1';
  const BASE = (() => { try { return new URL('.', D.currentScript?.src || location.href).href; } catch { return ''; } })();
  const A = name => BASE + 'satis-assets/' + name;
  const IMG = { papi: A('papi-enerji-molasi.webp'), bolt: A('ic-bolt.webp'), coin: A('ic-coin.webp'), crown: A('ic-crown.webp'),
    party: BASE + 'discovery-assets/papi-kutlama.webp', teacher: BASE + 'discovery-assets/ogretmen.webp', welcome: BASE + 'papi-welcome-v2.png' };
  const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/billing';
  const PACKS = [[5, 230], [10, 300], [15, 460]];
  const REWARD_ENERGY = 7, REWARD_GOLD = 100;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const visible = el => !!el && !el.hidden && el.getClientRects().length > 0 && !el.closest('[inert],[aria-hidden="true"],[data-dm-nav-suspended]');
  const html = s => { const t = D.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const toast = m => { if (!m) return; if (W.DijiMeduPapiFeedback?.notice && !/enerji.*(bitti|yetersiz|gerekli|yok)/i.test(m)) W.DijiMeduPapiFeedback.notice(m); else W.yoToast?.(m); };
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 18 20"><path d="M2 1.6v16.8c0 .9 1 1.5 1.8 1L17 11c.8-.5.8-1.6 0-2.1L3.8.6C3 .1 2 .7 2 1.6Z"/></svg>';
  const spark = cls => `<svg class="dms-spark ${cls}" viewBox="0 0 76 76" aria-hidden="true"><path d="M30 40 8 30M36 30 26 8M44 26 50 4"/></svg>`;

  // ---------------------------------------------------------------- durum
  const name = () => { try { return typeof aktifOgrenciAdi === 'undefined' ? '' : String(aktifOgrenciAdi || ''); } catch { return ''; } };
  const wallet = () => { try { return typeof yo !== 'undefined' ? yo : null; } catch { return null; } };
  const loggedIn = () => !!store.get('ing_token');
  function teacher() {
    try {
      if (typeof W.dmAndroidIsTeacher === 'function') return !!W.dmAndroidIsTeacher();
      return !!W.dmTeacherPortalMode || name().toLowerCase() === 'teacher' || D.body.classList.contains('dm-teacher-mode') || (typeof siniftaOynananOgrenci !== 'undefined' && !!siniftaOynananOgrenci);
    } catch { return true; }
  }
  const plan = () => W.dmAndroidPlan?.plan || (wallet()?.premium ? 'premium_pro' : 'free');
  const energy = () => Math.max(0, Number(W.genelEnerjiKalan) | 0);
  const capacity = () => Number(W.dmAndroidPlan?.limits?.energyMax || W.genelEnerjiMax) || 25;
  const gold = () => { const g = Number(W.dmAndroidGoldBalance?.() ?? wallet()?.altin); return Number.isFinite(g) ? g : NaN; };
  const native = () => !!W.dmAndroidShell || !!W.dmAndroidBilling?.available;
  const ios = () => W.Capacitor?.getPlatform?.() === 'ios' || !!W.dmIosUygulama;
  const billing = () => W.dmAndroidBilling?.available ? W.dmAndroidBilling : null;
  // Ödüllü video yalnız uygulama içinde, reklamlar açıkken ve günlük hak varken sunulur.
  function videoState(kind = 'energy') {
    if (teacher() || !loggedIn()) return 'none';
    if (typeof W.dmAndroidWatchReward === 'function') {
      const p = W.dmAndroidPlacements;
      if (p?.rewardEnabled?.() === false) return 'none';
      return p?.rewardAllowed?.(kind) === false ? 'limit' : 'ok';
    }
    if (W.DijiReklam?.odulluIzle && W.DijiReklam.reklamGosterilsinMi?.()) return 'ok';
    return 'none';
  }
  async function watch(kind) {
    if (typeof W.dmAndroidWatchReward === 'function') return W.dmAndroidWatchReward(kind);
    if (W.DijiReklam?.odulluIzle) { await W.DijiReklam.odulluIzle(kind === 'gold' ? 'altin' : 'enerji'); return { ok: true, message: '' }; }
    return { ok: false, message: 'Video şu an kullanılamıyor.' };
  }
  // Paket satışı yalnız mağaza aboneliği olan uygulama paketlerinde (App Store kuralları: başka yere yönlendirme yok).
  const canSell = () => !!billing() && !teacher();
  function busyScreen() {
    return D.hidden || !loggedIn() || teacher() || !!W.dmAndroidFullscreenBusy || !!W.dmAndroidAds?.busy || !!W.dmPapiTour?.active?.()
      || D.body.classList.contains('dm-play-session') || !!D.querySelector('.dms-veil,.dmp')
      || [...D.querySelectorAll('.dm-session-surface,[role="dialog"]:not(.dmu-veil):not(.dmb-veil),.dm-notice-managed.dm-notice-visible,#genelSonucOverlay.acik')].some(visible);
  }

  // ---------------------------------------------------------------- stil
  function style() {
    if (D.getElementById('dm-satis-css')) return;
    const l = D.createElement('link'); l.id = 'dm-satis-css'; l.rel = 'stylesheet'; l.href = BASE + 'dm-satis.css?v=' + VER; D.head.append(l);
  }

  // ---------------------------------------------------------------- enerji molası
  let sheet = null;
  function closeSheet() { sheet?.remove(); sheet = null; }
  function enerji(source = '') {
    if (teacher()) return null;
    style();
    closeSheet();
    W.dmStartSpotlight?.stop?.();
    const now = energy(), cap = capacity(), p = plan(), v = videoState('energy');
    const unlimited = W.dmAndroidPlan?.limits?.unlimitedEnergy === true || p === 'premium_pro';
    const proLine = canSell() && !unlimited ? (p === 'pro' ? 'Premium Pro ile sınırsız enerji' : 'Pro ile günde 40 enerji') : '';
    const text = v === 'none' ? 'Altınlarınla <b>enerji al</b>, ya da enerjinin yenilenmesini bekle.'
      : `Kısa bir video izle, hemen <b>+${REWARD_ENERGY} enerji</b> kazan ve oyuna devam et.`;
    sheet = html(`<div class="dms-veil" role="dialog" aria-modal="true" aria-label="Papi ile enerji molası" data-source="${esc(source)}">
      <div class="dms-sheet">
        <span class="dms-grab" aria-hidden="true"></span>
        <button type="button" class="dms-x" data-close aria-label="Kapat">${ICON_X}</button>
        <div class="dms-top">
          ${spark('dms-spark-a')}
          <div class="dms-cloud"><svg class="dms-cloud-bg" viewBox="0 0 443 230" preserveAspectRatio="none" aria-hidden="true"><path fill="#fff" d="M70 214c-38 2-64-22-62-54 2-24 18-40 38-45-8-30 14-60 46-60 10 0 20 3 27 9C130 30 160 12 195 14c32 2 56 20 66 44 12-14 32-22 52-20 36 3 58 32 54 62 30 6 50 30 48 58-2 34-30 56-64 56Z"/><path fill="#f6efff" d="M90 206c-30 0-52-16-54-40 0 18 18 36 46 38l272-2c28 0 50-14 58-36-6 26-30 42-60 42Z" opacity=".9"/></svg>
            <h2>Papi ile<br>enerji molası!</h2></div>
          ${spark('dms-spark-b')}
          <p class="dms-text">${text}</p>
          <img class="dms-hero-img" src="${IMG.papi}" alt="Kulaklıklı Papi, +${REWARD_ENERGY} enerji">
        </div>
        <div class="dms-actions">
          ${v === 'ok' ? `<button type="button" class="dms-video" data-video>${ICON_PLAY}<span>Video izle, ${REWARD_ENERGY} enerji al</span></button>` : ''}
          ${v === 'limit' ? `<button type="button" class="dms-video" disabled>${ICON_PLAY}<span>Bugünkü video hakkın doldu</span></button>` : ''}
          <button type="button" class="dms-later" data-later>Şimdi değil</button>
        </div>
        ${proLine ? `<button type="button" class="dms-pro" data-pro>${spark('dms-spark-l')}<img src="${IMG.crown}" alt=""><span>${proLine}</span>${spark('dms-spark-r')}</button>` : ''}
        <div class="dms-buy">
          <div class="dms-buy-h"><img src="${IMG.bolt}" alt=""><span>Enerji Satın Al</span></div>
          <div class="dms-packs">${PACKS.map(([n, price]) => `<button type="button" class="dms-pack" data-pack="${n}" ${now + n > cap ? 'disabled aria-label="' + n + ' enerji, kapasite yetersiz"' : ''}>
            <span class="a"><img src="${IMG.bolt}" alt="">${n} enerji</span><span class="g"><img src="${IMG.coin}" alt="">${price} altın</span></button>`).join('')}</div>
          <span class="dms-cap">Enerjin: ${now}/${cap}</span>
        </div>
        <p class="dms-msg" role="status" aria-live="polite"></p>
      </div></div>`);
    const msg = sheet.querySelector('.dms-msg');
    const later = () => { policy().sheetDismissed(); closeSheet(); };
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close],[data-later]')) later(); });
    sheet.querySelector('[data-video]')?.addEventListener('click', async e => {
      const b = e.currentTarget; b.disabled = true; msg.textContent = '';
      try { const r = await watch('energy'); if (r?.message) msg.textContent = r.message; if (r?.ok) setTimeout(() => { if (sheet?.contains(b)) closeSheet(); }, 1300); }
      catch (err) { msg.textContent = err?.message || 'Video açılamadı. Biraz sonra yeniden dene.'; }
      finally { if (b.isConnected) b.disabled = false; }
    });
    sheet.querySelector('[data-pro]')?.addEventListener('click', () => { closeSheet(); planlar('enerji-molasi', p === 'pro' ? 'premium_pro' : 'pro'); });
    for (const b of sheet.querySelectorAll('[data-pack]')) b.addEventListener('click', async () => {
      const all = sheet.querySelectorAll('[data-pack]'); all.forEach(x => x.disabled = true); msg.textContent = '';
      try {
        const ok = await W.enerjiPaketiAl?.(Number(b.dataset.pack), m => { if (msg.isConnected) msg.textContent = m; });
        if (ok) closeSheet(); else if (!msg.textContent) msg.textContent = 'Enerji alınamadı. Tekrar deneyebilirsin.';
      } catch { msg.textContent = 'Bağlantı kurulamadı. Tekrar dene.'; }
      finally { if (sheet) all.forEach(x => { x.disabled = energy() + Number(x.dataset.pack) > capacity(); }); }
    });
    D.body.append(sheet);
    sheet.querySelector('[data-video],[data-later]')?.focus({ preventScroll: true });
    void W.DijiMeduPapiFeedback?.energyLimit?.(msg);
    return sheet.querySelector('.dms-sheet');
  }

  // ---------------------------------------------------------------- teklif kuralları (eski paketteki upsell-policy ile aynı)
  const RULES = { lowEnergy: 5, sheetPerDay: 2, dropPerDay: 1, successEveryDays: 7, startQuietMs: 60000 };
  const startedAt = Date.now();
  let pol = null, polOwner = null;
  function policy() {
    const who = name();
    if (pol && polOwner === who) return pol;
    polOwner = who;
    const key = 'dm_satis_teklif_v1:' + encodeURIComponent(who || 'misafir').slice(0, 120);
    let s; try { s = JSON.parse(store.get(key) || 'null'); } catch {}
    s = { day: s?.day || '', sheet: s?.sheet | 0, drop: s?.drop | 0, dismissedDay: s?.dismissedDay || '', lastSuccess: Number(s?.lastSuccess) || 0, firstResultDay: s?.firstResultDay || '' };
    const save = () => store.set(key, JSON.stringify(s));
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
    const roll = () => { const t = today(); if (s.day !== t) { s.day = t; s.sheet = 0; s.drop = 0; save(); } return t; };
    const quiet = () => Date.now() - startedAt < RULES.startQuietMs;
    pol = {
      canSheet: ({ e, p }) => { const t = roll(); return !quiet() && p !== 'premium_pro' && e < RULES.lowEnergy && s.dismissedDay !== t && s.sheet < RULES.sheetPerDay; },
      sheetShown() { roll(); s.sheet++; save(); },
      sheetDismissed() { s.dismissedDay = roll(); save(); },
      canDrop: ({ e, prev, p }) => { roll(); return !quiet() && p !== 'premium_pro' && e < RULES.lowEnergy && prev >= RULES.lowEnergy && s.drop < RULES.dropPerDay; },
      dropShown() { roll(); s.drop++; save(); },
      canSuccess: ({ p }) => { const t = roll(); if (s.firstResultDay === t) return false; s.firstResultDay = t; save(); return !quiet() && p === 'free' && Date.now() - s.lastSuccess >= RULES.successEveryDays * 864e5; },
      successShown() { s.lastSuccess = Date.now(); save(); },
    };
    return pol;
  }

  // ---------------------------------------------------------------- üstten inen not
  let drop = null;
  function energyDrop() {
    style(); drop?.remove();
    drop = html(`<div class="dms-drop" role="status"><div class="dms-drop-row"><img src="${IMG.papi}" alt="">
      <div class="dms-drop-t"><b>Enerjin ${energy()}${({0:"'a",2:"'ye",6:"'ya",9:"'a"})[energy() % 10] || "'e"} düştü</b><span>Bir video, ${REWARD_ENERGY} enerji. Hemen dön.</span></div>
      <button type="button">▶ İzle</button></div><div class="dms-drop-bar"><i></i></div></div>`);
    const gone = () => { drop?.remove(); drop = null; };
    const timer = setTimeout(gone, 6000);
    drop.querySelector('button').onclick = () => { clearTimeout(timer); gone(); enerji('ust-not'); };
    D.body.append(drop);
    policy().dropShown();
  }

  // ---------------------------------------------------------------- başarı kartı
  function successCard() {
    style(); closeSheet();
    sheet = html(`<div class="dms-veil" role="dialog" aria-modal="true" aria-label="Harika gidiyorsun"><div class="dms-mini">
      <button type="button" class="dms-x" data-close aria-label="Kapat">${ICON_X}</button>
      <img class="h" src="${IMG.party}" alt="">
      <h3>Harika gidiyorsun!</h3>
      <p>Bugünkü dersini bitirdin. Pro ile daha uzun oyna, reklamsız öğren.</p>
      <div class="dms-perks"><span><i>⚡</i>Günde 40 enerji</span><span><i>🚫</i>Reklamsız</span><span><i><img src="${IMG.coin}" alt="" style="width:22px;vertical-align:middle"></i>Her gün +30 altın</span><span><i>🛡️</i>Ayda 2 seri kalkanı</span></div>
      <button type="button" class="dms-cta" data-pro>Pro'yu incele</button>
      <button type="button" class="dms-text-btn" data-close>Şimdi değil</button></div></div>`);
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) closeSheet(); });
    sheet.querySelector('[data-pro]').onclick = () => { closeSheet(); planlar('basari-karti', 'pro'); };
    D.body.append(sheet);
    policy().successShown();
  }

  // ---------------------------------------------------------------- sabit kartlar (profil, Mağaza, Oyunlar)
  function profileCard() {
    const host = D.getElementById('profilAlan'), old = D.getElementById('dmsPlanCard'), p = plan();
    if (!host || !canSell() || p === 'premium_pro' || !loggedIn()) { old?.remove(); return; }
    if (old?.dataset.plan === p && old.parentNode === host && host.firstElementChild === old) return;
    old?.remove(); style();
    const card = html(p === 'pro'
      ? `<div id="dmsPlanCard" class="dms-profile" data-plan="pro"><img src="${IMG.party}" alt=""><div><small>Pro planındasın</small><b>Premium Pro'ya geç</b><span>Sınırsız enerji, sınırsız Premium Oyunlar, her gün +75 altın</span></div><button type="button">Planlar</button></div>`
      : `<div id="dmsPlanCard" class="dms-profile" data-plan="free"><img src="${IMG.party}" alt=""><div><small>Free plan</small><b>Diji Medu Pro</b><span>Reklamsız, günde 40 enerji, her gün hediye altın</span></div><button type="button">Planlar</button></div>`);
    card.querySelector('button').onclick = () => planlar('profil', p === 'pro' ? 'premium_pro' : 'pro');
    host.prepend(card);
  }
  function promoCard(id, kind) {
    if (kind === 'gold') return html(`<div id="${id}" class="dms-promo is-gold" role="group" aria-label="Papi'den altın"><span class="dms-gift" aria-hidden="true">🎁</span>
      <div class="dms-promo-t"><b>Papi'den +${REWARD_GOLD} altın</b><span>Kısa bir video izle, altını hemen al.</span><span class="dms-promo-msg" role="status"></span></div>
      <button type="button" class="dms-promo-go">${ICON_PLAY}İzle</button></div>`);
    return html(`<button type="button" id="${id}" class="dms-promo" aria-label="Papi ile enerji molası"><img class="p" src="${IMG.papi}" alt="">
      <span class="dms-promo-t"><b>Papi ile enerji molası!</b><span>Video izle, +${REWARD_ENERGY} enerji kazan. Altınla enerji de alabilirsin.</span></span>
      <span class="dms-promo-go">${ICON_PLAY}İzle</span></button>`);
  }
  function place(id, kind, where, want) {
    const old = D.getElementById(id);
    if (!want || !where) { old?.remove(); return; }
    if (old && old.parentNode === where.parent && old.nextElementSibling === where.before) return;
    style();
    const card = old || promoCard(id, kind);
    if (!old) {
      if (kind === 'gold') card.querySelector('button').onclick = async e => {
        const b = e.currentTarget, m = card.querySelector('.dms-promo-msg'); b.disabled = true; m.textContent = '';
        try { const r = await watch('gold'); m.textContent = r?.message || ''; } catch (err) { m.textContent = err?.message || 'Video açılamadı.'; } finally { b.disabled = false; }
      };
      else card.onclick = () => enerji(id === 'dmsShopEnergy' ? 'magaza' : 'oyunlar');
    }
    where.parent.insertBefore(card, where.before || null);
  }
  function adCards() {
    const show = loggedIn() && !teacher() && plan() !== 'premium_pro' && videoState('energy') === 'ok';
    const shop = D.getElementById('tab-magaza'), shopOn = !!shop?.classList.contains('active');
    // Mağaza ana sayfasında "Enerji al" bölümünün hemen üstü (storefront.js her yenilemede yeniden çizer).
    const energyBox = shopOn ? D.querySelector('#dmStoreFront main.ds-home #dsEnergy') : null;
    const shopWhere = energyBox ? { parent: energyBox.parentNode, before: energyBox } : null;
    place('dmsShopEnergy', 'energy', shopWhere, show);
    const g = gold(), energyCard = D.getElementById('dmsShopEnergy');
    place('dmsShopGold', 'gold', shopWhere && energyCard ? { parent: shopWhere.parent, before: energyCard } : shopWhere, shopOn && loggedIn() && !teacher() && Number.isFinite(g) && g < 100 && videoState('gold') === 'ok');
    const games = D.getElementById('tab-aktiviteler'), host = games?.classList.contains('active') ? games.querySelector('.dc-focus-card') : null;
    place('dmsGamesEnergy', 'energy', host ? { parent: host, before: host.firstElementChild?.id === 'dmsGamesEnergy' ? host.firstElementChild.nextElementSibling : host.firstElementChild } : null, show);
  }

  // ---------------------------------------------------------------- PAKET EKRANLARI
  const STUDENT = {
    hero: { title: 'Paketini seç', text: 'Paketini seç; enerjin bitmesin, reklamlar araya girmesin, her gün altın kazan.' },
    plans: [
      { id: 'diji_pro', plan: 'pro', name: 'Pro', list: { aylik: 45, yillik: 380 }, pitch: 'Reklamsız öğren, günde 40 enerjiyle daha uzun oyna.',
        chips: ['⚡ Günde 40 enerji', '🚫 Reklamsız', '🪙 Her gün +30 altın', '🎮 Premium oyun 5 bölüm/gün'] },
      { id: 'diji_premium_pro', plan: 'premium_pro', name: 'Premium Pro', ribbon: 'En avantajlı', list: { aylik: 79, yillik: 700 }, pitch: 'Enerji hiç bitmez, Premium Oyunlar sınırsız. Diji Medu\'nun tamamı.',
        chips: ['⚡ Sınırsız enerji', '🚫 Reklamsız', '🪙 Her gün +75 altın', '🎮 Sınırsız Premium oyun'] },
    ],
    table: [['⚡ Enerji', '25', '40', 'Sınırsız'], ['🚫 Reklam', 'Var', 'Yok', 'Yok'], ['🪙 Altın/gün', '—', '+30', '+75'], ['🎮 Premium oyun', '3 deneme', '5/gün', 'Sınırsız'],
      ['🛡️ Seri kalkanı', '—', '2/ay', '5/ay'], ['🏝️ Mola Vakti', '2/gün', '3/gün', '5/gün']],
  };
  const TEACHER = {
    hero: { title: 'Öğretmen paketleri', text: 'Daha çok sınıf, sınırsız ödev ve detaylı raporlarla öğrencilerinin İngilizcesini adım adım takip et.' },
    plans: [
      { id: 'teacher_pro', plan: 'pro', name: 'Öğretmen Pro', short: 'Pro', list: { aylik: 59, yillik: 490 }, pitch: 'Birden çok şubesi olan öğretmenler için: 5 sınıf, sınırsız ödev, detaylı raporlar.',
        chips: ['🏫 5 sınıf', '👩‍🎓 200 öğrenci', '📝 Sınırsız ödev', '📊 Detaylı raporlar'] },
      { id: 'teacher_premium_pro', plan: 'premium_pro', name: 'Öğretmen Premium Pro', short: 'Premium Pro', ribbon: 'Okul için ideal', list: { aylik: 149, yillik: 1190 }, pitch: 'Tüm okulun için: sınırsız sınıf, 500 öğrenci ve yöneticiyle doğrudan iletişim.',
        chips: ['🏫 Sınırsız sınıf', '👩‍🎓 500 öğrenci', '🌍 Sınıflar arası lig', '🤝 Yöneticiyle iletişim'] },
    ],
    soon: 'Canlı sınıf yarışması · Veli raporu · Öğrencine Pro hediye',
    table: [['🏫 Sınıf', '1', '5', 'Sınırsız'], ['👩‍🎓 Öğrenci', '40', '200', '500'], ['📝 Aktif ödev', '2', 'Sınırsız', 'Sınırsız'], ['📊 Raporlar', 'Temel', 'Detaylı', 'Detaylı'],
      ['🌍 Sınıflar arası lig', '—', '—', '✓'], ['🤝 Yönetici iletişimi', '—', '—', '✓']],
  };

  const TL = n => Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' TL';
  const saving = l => Math.round((1 - l.yillik / (l.aylik * 12)) * 100);
  function gateQ() { const a = 3 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 4); return { q: `Devam etmek için veliden yardım iste: ${a} × ${b} kaç?`, a: a * b }; }
  function token(role) {
    if (role === 'teacher') { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || sessionStorage.getItem('ing_ogr_token') || store.get('ing_token') || ''; } catch { return ''; } }
    try { return sessionStorage.getItem('ing_ogr_token') || store.get('ing_token') || ''; } catch { return store.get('ing_token') || ''; }
  }
  async function call(body, role) {
    const t = token(role); if (!t) throw Error('Giriş yapmalısın.');
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-diji-token': t }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw Error(j.mesaj || 'Abonelik servisine ulaşılamadı.');
    return j;
  }
  function plugin() { const C = W.Capacitor; try { return C?.Plugins?.DmBilling || C?.registerPlugin?.('DmBilling') || null; } catch { return null; } }
  function storePrice(prod, sp, period) {
    const offers = (sp?.offers || []).filter(o => o.basePlanId === period);
    const base = offers.find(o => !o.offerId) || offers[0];
    const paid = base?.phases?.filter(x => Number(x.micros) > 0).at(-1);
    const trial = offers.some(o => o.offerId && o.phases?.some(x => Number(x.micros) === 0));
    return { text: paid?.price || TL(prod.list[period]), available: !!base, trial };
  }

  let screen = null;
  function closePlans() { screen?.remove(); screen = null; D.documentElement.style.removeProperty('overflow'); }
  async function planlar(source = '', want = '') {
    style(); closePlans(); closeSheet();
    const b = billing();
    let status = b?.status || null;
    const role0 = W.dmTeacherPortalMode ? 'teacher' : status?.role || (teacher() && name().toLowerCase() === 'teacher' ? 'teacher' : 'student');
    const ui = { period: 'yillik', pick: want === 'pro' ? 'pro' : 'premium_pro', products: [], busy: false, gate: null, msg: '', err: false };
    screen = html(`<div class="dmp${role0 === 'teacher' ? ' is-teacher' : ''}" role="dialog" aria-modal="true" aria-label="Paketler" data-source="${esc(source)}"><div class="dmp-in"><p class="dmp-msg">Paketler yükleniyor…</p></div></div>`);
    D.body.append(screen); D.documentElement.style.overflow = 'hidden';
    screen.addEventListener('keydown', e => { if (e.key === 'Escape') closePlans(); });
    try { status = b && role0 !== 'teacher' ? (await b.refresh()) || b.status : await call({ action: 'status' }, role0); } catch (e) { status = role0 === 'teacher' ? null : status; }
    if (!screen) return;
    const role = status?.role === 'teacher' ? 'teacher' : role0;
    screen.classList.toggle('is-teacher', role === 'teacher');
    const p = b && plugin();
    if (p && status?.canBuy) {
      try { ui.products = (await p.getProducts({ ids: (status.products || []).map(x => x.id) })).products || []; } catch {}
    }
    if (!screen) return;
    render(screen, { role, status, ui, p });
  }

  function render(root, ctx) {
    const { role, status, ui } = ctx;
    const C = role === 'teacher' ? TEACHER : STUDENT, cur = status?.plan || 'free';
    const iosApp = ios(), sellOpen = !!billing() && !!status?.canBuy;
    // App Store: satışı olmayan planın fiyatı iPhone'da yazılmaz.
    const showPrice = !(iosApp && !sellOpen);
    const byId = Object.fromEntries((ui.products || []).map(x => [x.id, x]));
    if (cur === 'premium_pro') ui.pick = 'premium_pro';
    else if (cur === 'pro' && ui.pick === 'pro') ui.pick = 'premium_pro';
    const priceOf = pl => storePrice(pl, byId[pl.id], ui.period);
    const curName = cur === 'free' ? (role === 'teacher' ? 'Öğretmen Free' : 'Free') : C.plans.find(x => x.plan === cur)?.name || cur;
    const card = pl => {
      const pr = priceOf(pl), monthly = ui.period === 'yillik' ? TL(Math.round(pl.list.yillik / 12 * 100) / 100) : '';
      const isCur = cur === pl.plan, lower = cur === 'premium_pro' && pl.plan === 'pro';
      const chip = c => c.startsWith('🪙') ? `<img src="${IMG.coin}" alt="">` + esc(c.slice(2).trim()) : esc(c);
      return `<button type="button" class="dmp-plan${pl.plan === 'premium_pro' ? ' is-premium' : ''}" role="radio" aria-checked="${ui.pick === pl.plan}" data-pick="${pl.plan}" ${lower ? 'disabled style="opacity:.55"' : ''}>
        ${pl.ribbon ? `<span class="dmp-ribbon">${esc(pl.ribbon)}</span>` : ''}
        <span class="dmp-radio"></span>
        <span class="dmp-name"><img src="${IMG.crown}" alt="">${esc(pl.short || pl.name)}</span>
        ${showPrice ? `<span class="dmp-price"><b>${esc(pr.text)}</b><small>${ui.period === 'yillik' ? '/ yıl · aylık ' + esc(monthly) : '/ ay'}</small></span>` : ''}
        <ul class="dmp-keys">${pl.chips.map(c => `<li>${chip(c)}</li>`).join('')}</ul>
        ${isCur ? '<span class="dmp-now">Şu anki planın</span>' : ui.period === 'yillik' && showPrice ? `<span class="dmp-tag">%${saving(pl.list)} tasarruf</span>` : ''}
        ${pr.trial && sellOpen && !isCur ? '<span class="dmp-tag">7 gün ücretsiz</span>' : ''}
      </button>`;
    };
    const ic = i => i === 'bolt' || i === 'coin' ? `<img src="${IMG[i]}" alt="">` : i;
    const vals = v => v.map((x, k) => `<span class="${k === 2 ? 'top' : k === 1 ? 'on' : ''}">${esc(x)}</span>`).join('');
    const pickPl = C.plans.find(x => x.plan === ui.pick) || C.plans[1];
    const pr = priceOf(pickPl);
    let cta, ctaNote = '', ctaDisabled = false, ctaTeal = role === 'teacher';
    const refresh = async () => role === 'teacher' ? call({ action: 'status' }, 'teacher') : billing().refresh();
    if (!sellOpen) { cta = 'Paketler uygulamada satışta'; ctaNote = 'Satın alma Diji Medu mobil uygulamasından yapılır.'; ctaDisabled = true; }
    else if (cur === ui.pick) { cta = 'Bu paket sende açık 🎉'; ctaDisabled = true; }
    else { cta = `${pickPl.name}'ya geç`; ctaNote = `${pr.text} / ${ui.period === 'yillik' ? 'yıl' : 'ay'} · İstediğin zaman iptal edebilirsin`; if (!pr.available && ctx.p) { cta = 'Bu paket şu an satışta değil'; ctaDisabled = true; } }
    const storeName = iosApp ? 'App Store' : 'Google Play';
    root.innerHTML = `<div class="dmp-in">
      <div class="dmp-bar"><span>${role === 'teacher' ? 'ÖĞRETMEN PAKETLERİ' : 'DİJİ MEDU PAKETLERİ'}</span><button type="button" class="dmp-x" data-close aria-label="Kapat">${ICON_X}</button></div>
      <div class="dmp-hero"><img src="${role === 'teacher' ? IMG.teacher : IMG.party}" alt="" onerror="this.src='${IMG.welcome}'"><div><h1>${esc(C.hero.title)}</h1>
        <span class="dmp-current">Şu anki planın: <b>${esc(curName)}</b></span></div></div>
      ${showPrice ? `<div class="dmp-toggle" role="group" aria-label="Ödeme dönemi"><button type="button" data-period="aylik" aria-pressed="${ui.period === 'aylik'}">Aylık</button><button type="button" data-period="yillik" aria-pressed="${ui.period === 'yillik'}">Yıllık<em>%${saving(C.plans[0].list)}'e varan indirim</em></button></div>` : ''}
      <div class="dmp-plans" role="radiogroup" aria-label="Paket seç">${C.plans.map(card).join('')}</div>
      <p class="dmp-msg${ui.err ? ' err' : ''}" ${ui.msg ? '' : 'hidden'} role="status">${esc(ui.msg)}</p>
      ${ui.gate ? `<div class="dmp-gate"><p>${esc(ui.gate.q)}</p><input inputmode="numeric" autocomplete="off" aria-label="Cevap"><button type="button" class="dmp-buy" data-gate-ok>Devam</button><button type="button" class="dms-text-btn" data-gate-back>Vazgeç</button></div>` : ''}
      <h2 class="dmp-sec">Karşılaştır</h2>
      <table class="dmp-table"><thead><tr><th></th><th>Free</th><th>Pro</th><th class="pre">Premium</th></tr></thead>
        <tbody>${C.table.map(r => `<tr><td>${esc(r[0])}</td>${r.slice(1).map((x, k) => `<td class="${k === 2 ? 'pre' : ''} ${x === '—' ? 'no' : x === '✓' ? 'yes' : ''}">${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      ${C.soon ? `<p class="dmp-soonline"><span class="dmp-soon">Yakında</span> ${esc(C.soon)}</p>` : ''}
      ${sellOpen ? `<p class="dmp-legal">Ödeme ${storeName} hesabından alınır. Abonelik, dönem bitmeden en az 24 saat önce iptal edilmezse aynı süreyle otomatik yenilenir. İptal ve yönetim ${storeName} hesap ayarlarındaki Abonelikler bölümünden yapılır.
        ${iosApp ? '<br><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener">Kullanım Koşulları (EULA)</a> · ' : '<br>'}<a href="${BASE}gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikası</a> · <a href="${BASE}kullanim-kosullari.html" target="_blank" rel="noopener">Kullanım Koşulları</a></p>
        <div class="dmp-links"><button type="button" data-restore>Satın alımları geri yükle</button>${cur !== 'free' ? '<button type="button" data-manage>Aboneliği yönet</button>' : ''}</div>` : ''}
    </div>
    <div class="dmp-foot"><div class="dmp-foot-in"><button type="button" class="dmp-buy${ctaTeal ? ' dmp-teal' : ''}" data-buy ${ctaDisabled || ui.busy ? 'disabled' : ''}>${esc(ui.busy ? 'Bekle…' : cta)}${ctaNote && !ui.busy ? `<small>${esc(ctaNote)}</small>` : ''}</button></div></div>`;
    const rerender = () => render(root, ctx);
    root.querySelector('[data-close]').onclick = closePlans;
    for (const t of root.querySelectorAll('[data-period]')) t.onclick = () => { ui.period = t.dataset.period; rerender(); };
    for (const c of root.querySelectorAll('[data-pick]')) c.onclick = () => { if (c.disabled) return; ui.pick = c.dataset.pick; ui.gate = null; rerender(); };
    const say = (m, err = false) => { ui.msg = m; ui.err = err; rerender(); };
    root.querySelector('[data-buy]').onclick = () => {
      if (!sellOpen || ui.busy) return;
      // Satın alma onayını mağaza kendisi ister (şifre / parmak izi, Aile Bağlantısı onayı); ayrıca soru sorulmaz.
      void buy(ctx, pickPl.id, say, rerender);
    };
    root.querySelector('[data-gate-back]')?.addEventListener('click', () => { ui.gate = null; rerender(); });
    root.querySelector('[data-gate-ok]')?.addEventListener('click', () => {
      const v = root.querySelector('.dmp-gate input')?.value;
      const ok = String(v ?? '').trim() !== '' && Number(String(v).trim()) === ui.gate.a;
      ui.gate = null;
      if (!ok) { say('Cevap doğru değil. Satın alma için veline danış.', true); return; }
      void buy(ctx, pickPl.id, say, rerender);
    });
    root.querySelector('[data-restore]')?.addEventListener('click', async () => {
      say('Kontrol ediliyor…');
      try { const n = await restoreAll(ctx); ctx.status = (await refresh()) || ctx.status; say(n ? 'Aboneliğin hesabına bağlandı.' : `Bu ${iosApp ? 'Apple Kimliğinde' : 'Google hesabında'} etkin abonelik bulunamadı.`); }
      catch (e) { say(e?.message || 'Geri yükleme yapılamadı.', true); }
    });
    root.querySelector('[data-manage]')?.addEventListener('click', () => { ctx.p?.manage?.({ productId: ctx.status?.entitlements?.[0]?.product_key || '' }).catch(() => {}); });
  }

  const statusOf = ctx => ctx.role === 'teacher' ? call({ action: 'status' }, 'teacher') : billing().refresh();
  // Cihazdaki abonelikleri bu hesaba (öğrenci ya da öğretmen) yeniden bağlar.
  async function restoreAll(ctx) {
    const apple = ios(); let n = 0;
    const { purchases = [] } = await ctx.p.restore();
    for (const x of purchases) {
      const productId = (x.products || [])[0];
      if (!x.purchaseToken || x.state !== 'purchased' || !(ctx.status?.products || []).some(pr => pr.id === productId)) continue;
      await call(apple ? { action: 'verifyApple', productId, signedTransaction: x.purchaseToken } : { action: 'verify', productId, purchaseToken: x.purchaseToken }, ctx.role); n++;
    }
    if (ctx.role !== 'teacher') await billing().refresh();
    return n;
  }
  async function buy(ctx, productId, say, rerender) {
    const p = ctx.p, b = billing(), apple = ios();
    if (!p || !b) return say('Satın alma şu an kullanılamıyor.', true);
    ctx.ui.busy = true; say(apple ? 'App Store açılıyor…' : 'Google Play açılıyor…');
    try {
      const st = ctx.status;
      let oldPurchaseToken = null;
      const current = (st.entitlements || []).find(e => e.provider === 'google' && (st.products || []).some(pr => pr.id === e.product_key));
      if (current && !apple) { const { purchases = [] } = await p.restore().catch(() => ({})); oldPurchaseToken = purchases.find(x => (x.products || []).includes(current.product_key))?.purchaseToken || null; }
      const result = await p.purchase({ productId, basePlanId: ctx.ui.period, accountRef: st.accountRef, ...(oldPurchaseToken ? { oldPurchaseToken } : {}) });
      if (result.canceled) { ctx.ui.busy = false; say(''); return; }
      if (result.alreadyOwned) { await restoreAll(ctx); ctx.status = (await statusOf(ctx)) || st; ctx.ui.busy = false; say('Bu abonelik zaten senin. Hesabına bağlandı.'); return; }
      const purchase = (result.purchases || []).find(x => (x.products || []).includes(productId));
      if (purchase?.state === 'pending') { ctx.ui.busy = false; say('Ödeme onay bekliyor. Onaylanınca paketin otomatik açılır.'); return; }
      if (!purchase?.purchaseToken || purchase.state !== 'purchased') throw Error('Satın alma tamamlanamadı.');
      await call(apple ? { action: 'verifyApple', productId, signedTransaction: purchase.purchaseToken } : { action: 'verify', productId, purchaseToken: purchase.purchaseToken }, ctx.role);
      ctx.status = (await statusOf(ctx)) || st;
      ctx.ui.busy = false;
      say('Teşekkürler! ' + (ctx.status?.plan === 'premium_pro' ? 'Premium Pro' : 'Pro') + ' paketin açıldı. 🎉'); if (ctx.role === 'teacher') W.dispatchEvent(new CustomEvent('dm:teacher-plan', { detail: ctx.status }));
    } catch (e) { ctx.ui.busy = false; say(e?.message || 'Satın alma tamamlanamadı.', true); }
  }

  // ---------------------------------------------------------------- eski pencereleri yeni tasarıma bağla
  function patch() {
    const F = W.DijiMeduPapiFeedback;
    if (F && !F.energy.dmSatis) {
      const old = F.energy;
      const next = function () { return teacher() ? old.apply(this, arguments) : enerji('enerji-bitti'); };
      next.dmSatis = true; F.energy = next;
    }
    if (typeof W.dijiEnerjiPaneliAc === 'function' && !W.dijiEnerjiPaneliAc.dmSatis) {
      const old = W.dijiEnerjiPaneliAc;
      const next = function () { return teacher() ? old.apply(this, arguments) : enerji('enerji-gostergesi'); };
      next.dmSatis = true; W.dijiEnerjiPaneliAc = next;
    }
    if (typeof W.dmEnerjiPaketPaneli === 'function' && !W.dmEnerjiPaketPaneli.dmSatis) {
      const old = W.dmEnerjiPaketPaneli;
      const next = function () { return teacher() ? old.apply(this, arguments) : enerji('enerji-paketi'); };
      next.dmSatis = true; W.dmEnerjiPaketPaneli = next;
    }
    // Uygulama paketindeki plan ekranı ve tekliflerin yerine bu ekranlar açılır (eski paketlerde de).
    const b = W.dmAndroidBilling;
    if (b && !b.dmSatis) { b.open = (src = '') => planlar(src); b.dmSatis = true; }
    if (W.dmAndroidOpenPlans && !W.dmAndroidOpenPlans.dmSatis) { W.dmAndroidOpenPlans = Object.assign(src => planlar(src), { dmSatis: true }); }
    const u = W.dmAndroidUpsell;
    if (u && !u.dmSatis) { u.energySheet = () => enerji('uygulama'); u.successCard = successCard; u.energyDrop = energyDrop; u.dmSatis = true; }
  }
  // Kendi içinden eski enerji panelini açan kodlar için: açılırsa kapatıp yenisini göster.
  function swapLegacy() {
    if (teacher()) return;
    const fb = D.querySelector('.dm-papi-feedback.is-energy');
    if (fb) { W.DijiMeduPapiFeedback?.close?.(); fb.remove(); if (!sheet) enerji('enerji-bitti'); return; }
    const perde = D.querySelector('#ybPerde.acik[data-tur="enerji"]');
    if (perde) { perde.classList.remove('acik'); perde.dataset.tur = ''; if (!sheet) enerji('enerji-gostergesi'); return; }
    const sa = D.querySelector('.sa-perde');
    if (sa && /Enerji/i.test(sa.getAttribute('aria-label') || '')) { sa.remove(); if (!sheet) enerji('enerji-paketi'); }
  }

  // ---------------------------------------------------------------- zamanlama
  let lastEnergy, resultWasOpen = false;
  function afterResult() {
    setTimeout(() => {
      if (!native() || busyScreen() || !canOffer()) return;
      const e = energy(), p = plan(), pl = policy();
      if (videoState('energy') === 'ok' && pl.canSheet({ e, p })) { enerji('sonuc'); pl.sheetShown(); }
      else if (canSell() && e >= 5 && pl.canSuccess({ p })) successCard();
    }, 1600);
  }
  // Yeni üyeye ilk gün teklif gösterilmez (Aileler politikası ve reklam kuralları ile aynı).
  function canOffer() { const age = W.dmAndroidAdSettings?.accountAgeHours?.(); return !(Number.isFinite(age) && age < 24); }
  function tick() {
    patch(); swapLegacy();
    if (D.hidden) return;
    profileCard(); adCards();
    const open = !!D.querySelector('#genelSonucOverlay.acik');
    if (resultWasOpen && !open) afterResult();
    resultWasOpen = open;
    const e = Number(W.genelEnerjiKalan);
    if (native() && Number.isFinite(e) && Number.isFinite(lastEnergy) && !busyScreen() && canOffer() && videoState('energy') === 'ok' && policy().canDrop({ e, prev: lastEnergy, p: plan() })) energyDrop();
    if (Number.isFinite(e)) lastEnergy = e;
  }
  function start() {
    style(); patch();
    let q = false;
    new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; patch(); swapLegacy(); adCards(); }); }).observe(D.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    setInterval(tick, 1000);
    D.addEventListener('dm:login', () => { pol = null; lastEnergy = undefined; closeSheet(); closePlans(); });
    W.addEventListener('dm:plan', () => { profileCard(); adCards(); });
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet) closeSheet(); });
    tick();
  }
  W.DMSatis = { version: VER, enerji, planlar, ogretmenPlanlari: src => planlar(src || 'ogretmen'), kapat() { closeSheet(); closePlans(); }, basariKarti: successCard, enerjiNotu: energyDrop };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
