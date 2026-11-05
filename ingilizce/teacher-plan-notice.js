/* Öğretmen paneli: girişten 1 dakika sonra alttan, duyuru panosu tarzında plan tavsiyesi.
   Öğretmenler Günü hediyesi alanlara bunun yerine bir kez hediye bilgisi gösterilir.
   Öğrenci oturumlarında hiç çalışmaz. */
(() => {
  'use strict';
  if (!window.dmTeacherPortalMode) return;
  const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/billing';
  const DELAY = 60000, RETRY = 10000, GIVE_UP = 5 * 60000;
  const doc = document;
  const token = () => { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || sessionStorage.getItem('ing_ogr_token') || ''; } catch { return ''; } };
  const seen = name => doc.cookie.split('; ').includes(name + '=1');
  const remember = name => { doc.cookie = name + '=1; max-age=31536000; path=/; SameSite=Lax'; };
  const visible = el => !!el && el.getClientRects().length > 0;
  const busy = () => doc.hidden || !!doc.querySelector('.dmt-veil') ||
    [...doc.querySelectorAll('.dm-notice-managed.dm-notice-visible,.dm-session-surface,[role="dialog"],#genelSonucOverlay.acik,.dmb-veil,.dmu-veil')].some(visible);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const CSS = `.dmt-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(13,49,55,.45);display:flex;align-items:flex-end;justify-content:center}
.dmt-sheet{width:min(100%,560px);max-height:92vh;overflow:auto;background:#fffefa;border:1px solid #b7ece4;border-bottom:0;border-radius:32px 32px 0 0;text-align:center;color:#114952;font:600 15px/1.45 system-ui,-apple-system,sans-serif;padding-bottom:env(safe-area-inset-bottom,0px);animation:dmtUp .34s cubic-bezier(.2,.7,.25,1)}
.dmt-hero{position:relative;height:130px;background:radial-gradient(ellipse at 4% 85%,#fffdf2 0 16%,transparent 17%),radial-gradient(ellipse at 100% 95%,#e4fff1 0 20%,transparent 21%),linear-gradient(125deg,#c7f8ee,#87dbf8 60%,#c2f2f0);border-radius:0 0 46% 9% / 0 0 18% 6%;overflow:hidden}
.dmt-hero img{position:absolute;left:50%;bottom:-6%;transform:translateX(-50%);height:112%}
.dmt-x{position:absolute;right:14px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:#ffffffb0;color:#114952;font:700 18px system-ui;cursor:pointer}
.dmt-body{padding:16px 20px 20px}
.dmt-title{font:800 21px/1.25 system-ui;margin:0 0 4px;color:#114952}
.dmt-text{font:600 14px/1.45 system-ui;color:#2d6b74;margin:0 0 14px}
.dmt-plans{display:grid;gap:10px;text-align:left}
.dmt-plan{border:1.5px solid #dbe9ea;border-radius:18px;padding:12px 14px;background:#fff}
.dmt-plan.is-cur{border-color:#3b5bdb}.dmt-plan.is-best{border-color:#f5ad3d}
.dmt-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.dmt-row b{font:800 16px system-ui;color:#114952}.dmt-price{font:800 15px system-ui;color:#0b7f86}.dmt-price small{font-weight:600;color:#7aa3a8}
.dmt-tag{display:inline-block;font:800 11px system-ui;border-radius:999px;padding:2px 9px;margin-top:4px}
.dmt-feat{margin:8px 0 0;padding-left:18px;color:#2d6b74;font:600 13px/1.5 system-ui}
.dmt-btn{display:block;width:100%;min-height:50px;border:0;border-radius:16px;background:#0aa3ab;color:#fff;font:800 16px system-ui;margin-top:14px;border-bottom:4px solid #077a80;cursor:pointer}
.dmt-later{display:block;width:100%;border:0;background:none;color:#7aa3a8;font:700 14px system-ui;padding:12px 0 0;cursor:pointer}
.dmt-gift{display:inline-flex;gap:6px;align-items:center;background:#fff1d8;color:#a76016;border:1px solid #ffe2a0;border-radius:999px;padding:5px 12px;font:800 13px system-ui;margin-bottom:12px}
@keyframes dmtUp{from{transform:translateY(100%)}to{transform:none}}
@media(prefers-reduced-motion:reduce){.dmt-sheet{animation:none}}`;
  function open(html) {
    if (!doc.getElementById('dmt-style')) { const s = doc.createElement('style'); s.id = 'dmt-style'; s.textContent = CSS; doc.head.append(s); }
    const t = doc.createElement('template'); t.innerHTML = html.trim(); const veil = t.content.firstElementChild;
    const close = () => veil.remove();
    veil.addEventListener('click', e => { if (e.target === veil || e.target.closest('[data-close]')) close(); });
    doc.body.append(veil);
    return { veil, close };
  }
  const hero = '<div class="dmt-hero"><img src="discovery-assets/ogretmen.webp" alt="" onerror="this.src=\'papi-welcome-v2.png\'"><button class="dmt-x" data-close aria-label="Kapat">✕</button></div>';

  function giftSheet(until) {
    const date = until ? new Date(until).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    open(`<div class="dmt-veil" role="dialog" aria-modal="true" aria-label="Öğretmenler Günü hediyen"><div class="dmt-sheet">${hero}
      <div class="dmt-body"><span class="dmt-gift">🎁 Öğretmenler Günü'ne özel</span>
      <p class="dmt-title">İyi ki varsın öğretmenim!</p>
      <p class="dmt-text">Diji Medu'nun ilk öğretmenlerinden biri olduğun için hesabında <b>Öğretmen Premium Pro</b> ${date ? '<b>' + esc(date) + '</b> tarihine kadar' : ''} hediye olarak açık. Yeni özellikler geldikçe ilk sen kullanacaksın.</p>
      <button class="dmt-btn" data-close>Teşekkürler</button></div></div></div>`);
  }

  function planSheet(plan) {
    const cur = plan === 'pro' ? 'pro' : 'free';
    const android = !!window.dmAndroidBilling?.available;
    // iPhone: Apple'da satışa açık olmayan dijital planların fiyatı gösterilmez (App Store 3.1.1).
    const ios = !!window.dmIosUygulama;
    const card = (id, name, price, feats, extra = '') => { if (ios && id !== 'free') { price = ''; extra = ''; } return `<div class="dmt-plan${cur === id ? ' is-cur' : ''}${id === 'premium_pro' ? ' is-best' : ''}">
      <div class="dmt-row"><b>${name}</b><span class="dmt-price">${price}</span></div>${extra}
      <ul class="dmt-feat">${feats.map(f => '<li>' + f + '</li>').join('')}</ul></div>`; };
    const ui = open(`<div class="dmt-veil" role="dialog" aria-modal="true" aria-label="Öğretmen planları"><div class="dmt-sheet">${hero}
      <div class="dmt-body"><p class="dmt-title">Sınıfını büyütmeye hazır mısın?</p>
      <p class="dmt-text">Diji Medu'yu ücretsiz kullanmaya devam edebilirsin. Daha çok sınıf ve detaylı raporlar için öğretmen planlarına göz at.</p>
      <div class="dmt-plans">
        ${card('free', 'Öğretmen Free', '0 TL', ['1 sınıf, 40 öğrenci', 'Öğrenci takibi ve ödev', 'Reklamsız'], cur === 'free' ? '<span class="dmt-tag" style="background:#e7edff;color:#2f4ac4">Şu anki plan</span>' : '')}
        ${card('pro', 'Öğretmen Pro', '59 TL <small>/ ay</small>', ['5 sınıf, 200 öğrenci', 'Detaylı öğrenci raporları', 'Sınırsız ödev'], '<span class="dmt-tag" style="background:#e8f8f8;color:#0b7f86">Yıllık 490 TL · %31 avantaj</span>')}
        ${card('premium_pro', 'Öğretmen Premium Pro', '149 TL <small>/ ay</small>', ['Sınırsız sınıf, 500 öğrenci', 'Sınıflar arası lig ve karşılaştırma', 'Yöneticiyle doğrudan iletişim'], '<span class="dmt-tag" style="background:#fff1d8;color:#a76016">Yıllık 1.190 TL · %33 avantaj</span>')}
      </div>
      ${android ? '<button class="dmt-btn" data-plans>Planları gör</button>' : '<p class="dmt-text" style="margin:14px 0 0">Öğretmen planları çok yakında satışa açılıyor.</p><button class="dmt-btn" data-close>Tamam</button>'}
      <button class="dmt-later" data-close>Şimdi değil</button></div></div></div>`);
    ui.veil.querySelector('[data-plans]')?.addEventListener('click', () => { ui.close(); window.dmAndroidBilling.open('ogretmen-paneli'); });
  }

  async function status() {
    const t = token(); if (!t) return null;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-diji-token': t }, body: '{"action":"status"}', signal: AbortSignal.timeout(12000) });
      const j = await r.json(); return r.ok && j.role === 'teacher' ? j : null;
    } catch { return null; }
  }

  async function show() {
    const s = await status();
    if (!s) { planSheet('free'); return; }
    if (s.plan === 'premium_pro') {
      const gift = (s.entitlements || []).find(e => e.provider === 'web' && e.product_key === 'teacher_premium_pro');
      if (gift && !seen('dm_tp_gift_2026')) { remember('dm_tp_gift_2026'); giftSheet(gift.valid_until); }
      return; // Premium Pro öğretmene paket tavsiyesi gösterilmez.
    }
    planSheet(s.plan);
  }

  const started = Date.now();
  function attempt() {
    if (!window.dmTeacherPortalMode || !token()) return;
    if (busy()) { if (Date.now() - started < GIVE_UP) setTimeout(attempt, RETRY); return; }
    show();
  }
  setTimeout(attempt, DELAY);
})();
