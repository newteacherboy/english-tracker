import { createUpsellPolicy } from './upsell-policy.js';

// Duyuru panosu (notice-surface) diliyle: krem zemin, dalgalı nane-mavi başlık, büyük Papi.
const CSS = `
/* Approved Energy Pause 01: lavender Papi hero + golden reward action. */
.dmu-veil{align-items:center!important;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px calc(env(safe-area-inset-bottom,0px) + 8px);box-sizing:border-box;background:#1c0b55a8}
.dmu-sheet{width:min(100%,430px);max-height:calc(100dvh - 16px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));overflow:auto;border:2px solid #ddc1fc;border-radius:30px;padding-bottom:10px;background:linear-gradient(180deg,#f6e5ff,#fdf8ff 74%,#f4eaff);color:#54228b;box-shadow:0 25px 70px #22095366}
.dmu-hero{height:155px;background:radial-gradient(circle at 15% 20%,#ffec84 0 3px,transparent 6px),radial-gradient(circle at 83% 30%,#fff6a3 0 5px,transparent 8px),linear-gradient(125deg,#7948e6,#b181fc 75%,#e8baff);border-radius:0 0 43% 9% / 0 0 16% 7%}
.dmu-hero img{height:136%;bottom:-21%;filter:drop-shadow(0 5px 8px #4f208c70)}
.dmu-badge{left:auto;right:14%;top:78px;width:54px;height:35px;border-radius:24px;background:linear-gradient(#fff5b9,#ffc233);color:#522082;box-shadow:0 4px #ec921b;font-size:21px}
.dmu-badge:after{content:'+7';font-size:14px}
.dmu-x{background:#fff5ff;color:#4c1c86;z-index:2}
.dmu-body{padding:10px 17px 12px}
.dmu-title{font:900 25px/1.2 system-ui;color:#512087;letter-spacing:-.7px}
.dmu-text{color:#755298;font-size:13px;margin-bottom:8px}
.dmu-text b{color:#642593}
.dmu-chips{margin:5px 0 9px}.dmu-chip-now{background:#fff6e1;color:#795422}.dmu-chip-after{background:#f6ebff;color:#722b9e;border-color:#d8b5fa}
.dmu-video{margin-top:5px;min-height:51px;background:linear-gradient(110deg,#ffeb42,#ffb91d);border:2px solid #fff3aa;border-bottom:4px solid #e9910d;border-radius:20px;color:#4d1c83;font-size:15px}
.dmu-later{order:2;background:#f1e0ff;border:1px solid #d4affb;border-radius:15px;min-height:38px;color:#6c319d;margin-top:7px;padding:8px;font-size:13px}
.dmu-pro{min-height:43px;background:linear-gradient(110deg,#e3fff6,#c0f6ed);border-color:#95e4e0;color:#067980;margin-top:8px;font-size:13px}
.dmu-pack-title{font:900 12px system-ui;color:#54258c;margin:13px 0 8px}
.dmu-packs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.dmu-pack{background:#fffaf5;border:1px solid #e4c9fc;border-bottom:3px solid #dbc1f6;border-radius:16px;color:#52248a;padding:9px 3px;min-height:76px;font:800 12px/1.5 system-ui}
.dmu-pack strong{display:block}.dmu-pack span{display:block;font-weight:700;font-size:11px}.dmu-pack:disabled{opacity:.45;cursor:not-allowed}
@media(max-height:670px){.dmu-hero{height:105px}.dmu-hero img{height:133%}.dmu-badge{top:44px}.dmu-body{padding:8px 14px}.dmu-pack{min-height:60px}.dmu-title{font-size:21px}.dmu-text{font-size:12px}}

.dmu-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(13,49,55,.45);display:flex;align-items:flex-end;justify-content:center}
.dmu-sheet{width:min(100%,520px);background:#fffefa;border:1px solid #b7ece4;border-bottom:0;border-radius:32px 32px 0 0;overflow:hidden;text-align:center;color:#114952;font:600 15px/1.45 system-ui,-apple-system,sans-serif;padding-bottom:env(safe-area-inset-bottom,0px);animation:dmuUp .34s cubic-bezier(.2,.7,.25,1)}
.dmu-hero{position:relative;height:128px;background:radial-gradient(ellipse at 4% 85%,#fffdf2 0 16%,transparent 17%),radial-gradient(ellipse at 100% 95%,#e4fff1 0 20%,transparent 21%),linear-gradient(125deg,#c7f8ee,#87dbf8 60%,#c2f2f0);border-radius:0 0 46% 9% / 0 0 18% 6%;overflow:hidden}
.dmu-hero img{position:absolute;left:50%;bottom:-12%;transform:translateX(-50%);height:118%;filter:drop-shadow(0 6px 5px #23627422)}
.dmu-badge{position:absolute;left:calc(50% + 40px);top:14px;width:36px;height:36px;border-radius:50%;background:#f3ac35;color:#fff;display:grid;place-items:center;font:800 18px system-ui;border:3px solid #fffefa}
.dmu-x{position:absolute;right:14px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:#ffffffb0;color:#114952;font:700 18px system-ui}
.dmu-body{padding:16px 22px 20px}
.dmu-title{font:800 21px/1.25 system-ui;color:#114952;margin:0 0 4px}
.dmu-text{font:600 14px/1.45 system-ui;color:#2d6b74;margin:0 0 14px}
.dmu-text b{color:#a76016}
.dmu-chips{display:flex;justify-content:center;align-items:center;gap:6px;margin-bottom:16px}
.dmu-chip-now{background:#fff1d8;color:#a76016;border:1px solid #ffe2a0;border-radius:999px;padding:4px 12px;font:700 13px system-ui}
.dmu-chip-after{background:#e8ffed;color:#117e4a;border:1px solid #d0f6cc;border-radius:999px;padding:4px 12px;font:700 13px system-ui}
.dmu-video{display:block;width:100%;min-height:50px;border:0;border-radius:16px;background:#f5ad3d;color:#432900;font:800 16px system-ui;padding:12px;margin-top:10px}
.dmu-pro{display:block;width:100%;min-height:46px;border:1.5px solid #b7ece4;border-radius:16px;background:#fff;color:#117e86;font:800 15px system-ui;padding:10px;margin-top:10px}
.dmu-later{display:block;width:100%;border:0;background:none;color:#7aa3a8;font:700 14px system-ui;padding:12px 0 0}
.dmu-msg{min-height:18px;font:600 13px system-ui;color:#a76016;margin-top:8px}
.dmu-drop{position:fixed;left:50%;top:0;transform:translateX(-50%);z-index:2147482999;width:min(100%,520px);background:#fffefa;border:1px solid #b7ece4;border-top:0;border-radius:0 0 28px 28px;overflow:hidden;padding-top:env(safe-area-inset-top,0px);font:600 13px system-ui;color:#114952;animation:dmuDown .34s cubic-bezier(.2,.7,.25,1)}
.dmu-drop-row{display:flex;align-items:center;gap:12px;padding:12px 14px}
.dmu-drop-pic{width:58px;height:58px;flex-shrink:0;border-radius:18px;background:linear-gradient(125deg,#c7f8ee,#87dbf8);overflow:hidden;position:relative}
.dmu-drop-pic img{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);height:66px}
.dmu-drop-t{flex:1;text-align:left}.dmu-drop-t b{display:block;font:800 15px system-ui}.dmu-drop-t span{color:#2d6b74;font-size:12px}
.dmu-drop-go{border:0;border-radius:14px;background:#f5ad3d;color:#432900;font:800 14px system-ui;padding:10px 14px}
.dmu-drop-bar{height:4px;background:#e6f6f3}.dmu-drop-bar i{display:block;height:100%;background:#87dbf8;animation:dmuBar 6s linear forwards}
.dmu-perks{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#fff;border-radius:16px;padding:12px;margin-bottom:12px;text-align:left;font:700 13px system-ui;color:#114952}
.dmu-perks span{display:flex;align-items:center;gap:8px}.dmu-perks i{font-style:normal;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:#e8f8f8}
.dmu-teal{display:block;width:100%;min-height:50px;border:0;border-radius:16px;background:#0aa3ab;color:#fff;font:800 16px system-ui;padding:12px}
.dmu-gift{display:flex;gap:12px;align-items:center;background:#fff;border:2px solid #ffc93c;border-bottom-width:5px;border-radius:18px;padding:12px;margin:10px 0;text-align:left;color:#4a2c00;font:600 13px system-ui}
.dmu-gift-ic{position:relative;width:60px;height:60px;flex-shrink:0;border-radius:16px;background:#fff1c9;display:grid;place-items:center;font-size:30px}
.dmu-gift-ic em{position:absolute;bottom:-8px;font:800 10px system-ui;font-style:normal;background:#22a06b;color:#fff;border-radius:999px;padding:2px 7px}
.dmu-gift b{display:block;font:800 15px system-ui}.dmu-gift small{display:block;color:#8a5a00;margin:2px 0 8px;font-size:12px}
.dmu-gift button,.dmu-mini{border:0;border-radius:12px;background:#ffc93c;color:#4a2c00;font:800 13px system-ui;padding:7px 14px;border-bottom:3px solid #d99a00}
.dmu-mini{display:block;width:100%;margin-top:8px;min-height:40px}
.dmu-plan{position:relative;overflow:hidden;border-radius:18px;background:#0b7f86;color:#fff;padding:14px;margin:12px 0;text-align:left;font:600 13px system-ui}
.dmu-plan:before{content:"";position:absolute;right:-18px;top:-18px;width:90px;height:90px;border-radius:50%;background:#0aa3ab}
.dmu-plan *{position:relative}.dmu-plan .tag{display:inline-block;background:#ffd166;color:#4a2c00;border-radius:999px;padding:2px 9px;font:800 11px system-ui}
.dmu-plan b{display:block;font:800 17px system-ui;margin:8px 0 2px}.dmu-plan small{display:block;color:#c9f1f3;margin-bottom:12px}
.dmu-plan button{border:0;border-radius:12px;background:#fff;color:#0b7f86;font:800 14px system-ui;padding:9px 16px}
@keyframes dmuUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes dmuDown{from{transform:translate(-50%,-100%)}to{transform:translate(-50%,0)}}
@keyframes dmuBar{from{width:100%}to{width:0}}
@media(prefers-reduced-motion:reduce){.dmu-sheet,.dmu-drop,.dmu-drop-bar i{animation:none}}`;

export function createUpsell({ win, billing, watch, isTeacher }) {
  const doc = win.document;
  const papi = 'papi-welcome-v2.png';
  let policy, owner = '', startedAt = Date.now(), open = null, drop = null, lastEnergy;
  const plan = () => win.dmAndroidPlan?.plan || 'free';
  const energy = () => Number(win.genelEnerjiKalan);
  const visible = el => !!el && el.getClientRects().length > 0;
  function current() {
    const who = String(win.dmAndroidStudentName?.() || '');
    if (!policy || who !== owner) { owner = who; policy = createUpsellPolicy({ storage: win.localStorage, owner: who || 'preview', startedAt }); }
    return policy;
  }
  // Oyun, soru, başka pano ya da reklam açıkken hiçbir şey gösterilmez.
  function busy() {
    return !win.localStorage.getItem('ing_token') || isTeacher() || doc.hidden || win.dmAndroidFullscreenBusy || win.dmAndroidAds?.busy
      || doc.body.classList.contains('dm-play-session') || !!open
      || [...doc.querySelectorAll('.dm-session-surface,[role="dialog"],.dm-notice-managed.dm-notice-visible,.dm-papi-feedback.is-energy,#genelSonucOverlay.acik,.dmb-veil')].some(visible);
  }
  function style() { if (!doc.getElementById('dmu-style')) { const s = doc.createElement('style'); s.id = 'dmu-style'; s.textContent = CSS; doc.head.append(s); } }
  function el(html) { const t = doc.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function close() { open?.remove(); open = null; }

  async function runVideo(button, msg) {
    button.disabled = true;
    try { const r = await watch('energy'); msg.textContent = r.message; if (r.ok) setTimeout(close, 1400); }
    catch (e) { msg.textContent = e.message || 'Video açılamadı. Biraz sonra yeniden dene.'; }
    finally { button.disabled = false; }
  }

  function energySheet() {
    style();
    const now = Math.max(0, energy() | 0), capacity = Number(win.genelEnerjiMax) || 25;
    const after = Math.min(capacity, now + 7), p = plan();
    const packs = [[5,350],[10,600],[15,850]];
    open = el(`<div class="dmu-veil" role="dialog" aria-modal="true" aria-label="Papi ile enerji molası"><div class="dmu-sheet">
      <div class="dmu-hero"><img src="${papi}" alt="Papi"><span class="dmu-badge">⚡</span><button class="dmu-x" aria-label="Kapat">✕</button></div>
      <div class="dmu-body"><p class="dmu-title">Papi ile enerji molası!</p>
      <p class="dmu-text">Kısa bir video izle, hemen <b>+7 enerji</b> kazan ve oyuna devam et.</p>
      <div class="dmu-chips"><span class="dmu-chip-now">⚡ Şu an ${now}</span><span aria-hidden="true">→</span><span class="dmu-chip-after">⚡ Video sonrası ${after}</span></div>
      <button class="dmu-video" data-video>▶ Video izle, 7 enerji al</button>
      <button class="dmu-later" data-later>Şimdi değil</button>
      ${p !== 'premium_pro' ? '<button class="dmu-pro" data-pro>👑 Premium ol, sınırsız enerjin olsun</button>' : ''}
      <div class="dmu-pack-title">⚡ Altınlarınla enerji al</div>
      <div class="dmu-packs">${packs.map(([amount,price])=>`<button class="dmu-pack" data-pack="${amount}" ${now+amount>capacity?'disabled title="Enerji kapasitesi yetersiz"':''}><strong>⚡ ${amount} enerji</strong><span>🪙 ${price} altın</span></button>`).join('')}</div>
      <div class="dmu-msg" aria-live="polite"></div></div></div></div>`);
    const later = () => { current().sheetDismissed(); close(); };
    open.querySelector('.dmu-x').onclick = later;
    open.querySelector('[data-later]').onclick = later;
    open.addEventListener('click', e => { if (e.target === open) later(); });
    open.querySelector('[data-video]').onclick = e => runVideo(e.currentTarget, open.querySelector('.dmu-msg'));
    open.querySelector('[data-pro]')?.addEventListener('click', () => { close(); billing.open('enerji-pano'); });
    for(const button of open.querySelectorAll('[data-pack]')) button.onclick = async () => {
      const msg=open?.querySelector('.dmu-msg');
      if(!msg)return;
      button.disabled=true;
      try {
        const bought=await win.enerjiPaketiAl?.(Number(button.dataset.pack),message=>{if(msg.isConnected)msg.textContent=message;});
        if(bought)close();
        else if(!msg.textContent)msg.textContent='Enerji alınamadı. Tekrar deneyebilirsin.';
      }catch(error){msg.textContent=error?.message||'Enerji alınamadı.';}
      finally{if(button.isConnected)button.disabled=false;}
    };
    doc.body.append(open);
    current().sheetShown();
  }

  function energyDrop() {
    style();
    drop?.remove();
    drop = el(`<div class="dmu-drop" role="status"><div class="dmu-drop-row">
      <div class="dmu-drop-pic"><img src="${papi}" alt=""></div>
      <div class="dmu-drop-t"><b>Enerjin ${Math.max(0, energy() | 0)}'e düştü</b><span>Bir video, 7 enerji. Hemen dön.</span></div>
      <button class="dmu-drop-go">▶ İzle</button></div><div class="dmu-drop-bar"><i></i></div></div>`);
    const gone = () => { drop?.remove(); drop = null; };
    const timer = setTimeout(gone, 6000);
    drop.querySelector('.dmu-drop-go').onclick = async () => { clearTimeout(timer); gone(); try { const r = await watch('energy'); win.DijiMeduPapiFeedback?.notice?.(r.message); } catch (e) { win.DijiMeduPapiFeedback?.notice?.(e.message || 'Video açılamadı.'); } };
    doc.body.append(drop);
    current().dropShown();
  }

  function successCard() {
    style();
    open = el(`<div class="dmu-veil" role="dialog" aria-modal="true" aria-label="Harika gidiyorsun"><div class="dmu-sheet" style="background:#FFF7E6;border-color:#ffe2a0">
      <div class="dmu-hero" style="background:linear-gradient(125deg,#fff1c9,#ffd88a 60%,#ffe9b8)"><img src="${papi}" alt=""><span class="dmu-badge" style="background:#0aa3ab">👑</span><button class="dmu-x" aria-label="Kapat">✕</button></div>
      <div class="dmu-body"><p class="dmu-title" style="color:#4a2c00">Harika gidiyorsun!</p>
      <p class="dmu-text" style="color:#7a5a20">Bugünkü dersini bitirdin. Daha çok oynamak ister misin?</p>
      <div class="dmu-perks"><span><i>⚡</i>Günde 40 enerji</span><span><i>🚫</i>Reklamsız</span><span><i>🪙</i>Her gün +30 altın</span><span><i>🛡️</i>Seri kalkanı</span></div>
      <button class="dmu-teal" data-pro>Pro'yu incele · 45 TL / ay</button>
      <button class="dmu-later" data-later style="color:#a08b66">Şimdi değil</button></div></div></div>`);
    open.querySelector('.dmu-x').onclick = close;
    open.querySelector('[data-later]').onclick = close;
    open.addEventListener('click', e => { if (e.target === open) close(); });
    open.querySelector('[data-pro]').onclick = () => { close(); billing.open('basari-karti'); };
    doc.body.append(open);
    current().successShown();
  }

  // Profil sayfasında sabit plan kartı (kendiliğinden açılmaz).
  function profileCard() {
    const host = doc.getElementById('profilAlan');
    const existing = doc.getElementById('dmuPlanCard');
    if (!host || isTeacher() || plan() === 'premium_pro' || !win.localStorage.getItem('ing_token')) { existing?.remove(); return; }
    const key = plan();
    if (existing?.dataset.plan === key && existing.parentNode === host) return;
    existing?.remove();
    const card = el(key === 'pro'
      ? `<div id="dmuPlanCard" class="dmu-plan" data-plan="pro"><span class="tag">Pro planındasın</span><b>Premium Pro'ya geç</b><small>Sınırsız enerji ve sınırsız Premium Oyunlar</small><button>Planları gör</button></div>`
      : `<div id="dmuPlanCard" class="dmu-plan" data-plan="free"><span class="tag">Free plan</span><b>Diji Medu Pro</b><small>Reklamsız, daha çok enerji ve Premium Oyunlar</small><button>Planları gör</button></div>`);
    card.querySelector('button').onclick = () => billing.open('profil');
    style();
    host.prepend(card);
  }

  // Mağazanın üstünde: altın 100'ün altındaysa hediye kutusu.
  function shopGift() {
    const shop = doc.getElementById('tab-magaza'), existing = doc.getElementById('dmuShopGift');
    const gold = Number(win.dmAndroidGoldBalance?.());
    const show = shop?.classList.contains('active') && !isTeacher() && Number.isFinite(gold) && gold < 100 && win.dmAndroidPlacements?.rewardAllowed('gold') !== false;
    if (!show) { existing?.remove(); return; }
    if (existing) return;
    style();
    const card = el(`<div id="dmuShopGift" class="dmu-gift"><div class="dmu-gift-ic">🎁<em>Ücretsiz</em></div><div style="flex:1"><b>Papi'den <span style="color:#d99a00">+100 altın</span></b><small>Kısa bir video izle, altını hemen al.</small><button>▶ İzle</button><div class="dmu-msg" style="text-align:left"></div></div></div>`);
    card.querySelector('button').onclick = async e => {
      const b = e.currentTarget, m = card.querySelector('.dmu-msg'); b.disabled = true;
      try { const r = await watch('gold'); m.textContent = r.message; } catch (err) { m.textContent = err.message || 'Video açılamadı.'; } finally { b.disabled = false; }
    };
    const area = doc.getElementById('magazaAlan'); if (area) area.before(card); else shop.prepend(card);
  }

  function tick() {
    const p = plan(), e = energy();
    profileCard(); shopGift();
    if (!busy() && win.dmAndroidPlacements?.rewardAllowed('energy') !== false && Number.isFinite(lastEnergy) && current().canDrop({ energy: e, previous: lastEnergy, plan: p })) energyDrop();
    if (Number.isFinite(e)) lastEnergy = e;
  }
  // Sonuç ekranı kapandıktan sonra: önce olası geçiş reklamının bitmesi beklenir.
  function afterResult() {
    setTimeout(() => {
      if (busy()) return;
      const p = plan(), e = energy(), pol = current();
      // Video hakkı yoksa (günlük sınır ya da reklamlar kapalı) enerji panosu açılmaz.
      if (win.dmAndroidPlacements?.rewardAllowed('energy') !== false && pol.canSheet({ energy: e, plan: p })) energySheet();
      else if (Number.isFinite(e) && e >= 5 && pol.canSuccess({ plan: p })) successCard();
    }, 1500);
  }
  function start() {
    startedAt = Date.now();
    let wasOpen = false;
    setInterval(() => {
      const isOpen = !!doc.querySelector('#genelSonucOverlay.acik');
      if (wasOpen && !isOpen) afterResult();
      wasOpen = isOpen;
      if (!doc.hidden) tick();
    }, 1000);
  }
  return { start, ensureStyle: style, energySheet, energyDrop, successCard, close, policy: () => current() };
}
