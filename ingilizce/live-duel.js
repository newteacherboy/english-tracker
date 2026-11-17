/* Canlı Düello + Papi'ye Karşı — 6 soruluk savaş paneli. [17 Kas 2026]
   Sunucu yükü düşük tutulur:
   - Davet, Supabase Realtime "broadcast" kanalından gider (veritabanına yazmaz).
   - Veritabanına yalnız: arama/kabul, en fazla 5 bekleme kontrolü, sonuç kaydı.
   - Maç sırasında rakibin cevapları yine broadcast ile gelir. */
(() => {
'use strict';
if (window.dmLiveDuel) return;
const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_K9h4CnyaL8xb8B98o8aaFw_s9cMikuF';
const LOBBY = 'dm-duel-lobby';
const SEARCH_MS = 15000;
const base = new URL('.', document.currentScript?.src || location.href).href;
const PAPI = base + 'friends-assets/papi-fencer.webp';
const PAPI_INVITE = base + 'friends-assets/papi-invite.webp';
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token = () => { try { return localStorage.getItem('ing_token') || ''; } catch { return ''; } };
const who = () => String(typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi || '');
const norm = x => String(x || '').trim().toLocaleLowerCase('tr-TR');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const toast = m => (window.yoToast || window.maToast || (x => console.info(x)))(m);
const ICON = {
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.8 6.4 4.6 10.9 12 12-7.4 1.1-11.2 5.6-12 12-.8-6.4-4.6-10.9-12-12C7.4 10.9 11.2 6.4 12 0z" fill="currentColor"/></svg>'
};
const TYPE_LABEL = {meaning:'ANLAMI NE?', reverse:'İNGİLİZCESİ NE?', blank:'BOŞLUĞU DOLDUR', tf:'DOĞRU MU, YANLIŞ MI?', pair:'DOĞRU EŞİ BUL', final:'FİNAL · 2 KAT HASAR'};

async function rpc(op, args = {}, expected = token()) {
  if (!expected) throw Error('Düello için öğrenci hesabına giriş yapmalısın.');
  const r = await fetch(API + op, {method:'POST', headers:{'Content-Type':'application/json', apikey:KEY}, body:JSON.stringify({p_token:expected, ...args}), signal:AbortSignal.timeout(15000)});
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok) throw Error('Düello sunucusuna bağlanılamadı. Tekrar dene.');
  if (token() !== expected) throw Error('Öğrenci oturumu değişti.');
  return d || {};
}

/* ---------- Haklar (60 sn önbellek) ---------- */
let rights = null, rightsAt = 0, rightsOwner = '';
async function status(force = false) {
  if (!token()) return null;
  if (!force && rights && rightsOwner === token() && Date.now() - rightsAt < 60000) return rights.ok === false ? null : rights;
  const d = await rpc('dm_duel_status');
  rightsAt = Date.now(); rightsOwner = token();
  if (d.ok) { rights = d; document.dispatchEvent(new CustomEvent('dm:duel-rights', {detail:d})); return d; }
  rights = {ok:false, social:false, live:{remaining:0}, papi:{remaining:0}}; // öğretmen/misafir: tekrar sorma
  return null;
}

/* ---------- Ses ---------- */
const sfx = k => { try { window.genelSesEfektiCal?.(k); } catch {} };

/* ---------- Tam ekran katman ---------- */
let layer = null, layerClose = null;
function openLayer(cls, html, onClose) {
  closeLayer(true);
  const el = document.createElement('section');
  el.className = 'ld-layer ' + cls;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = html;
  document.body.append(el);
  document.documentElement.classList.add('ld-open');
  layer = el; layerClose = onClose || null;
  window.dmViewHistory?.track?.(el, {close: () => requestClose()});
  return el;
}
function requestClose() { if (layerClose) layerClose(); else closeLayer(); }
function closeLayer(silent) {
  const el = layer; if (!el) return;
  layer = null; layerClose = null;
  window.dmViewHistory?.leave?.(el);
  el.remove();
  if (!document.querySelector('.ld-layer')) document.documentElement.classList.remove('ld-open');
}

/* ---------- Hak bitti paneli ---------- */
function adAvailable() {
  const enabled = window.dmAndroidPlacements?.rewardEnabled?.() !== false;
  return typeof window.dmAndroidAds?.show === 'function' && enabled && !window.dmAndroidIsTeacher?.() && window.dmAndroidPlacements?.rewardAllowed?.('energy') !== false;
}
function paywall(kind, message, retry) {
  const owner = token();
  const live = kind === 'live';
  const el = openLayer('ld-sheet-layer', `
    <div class="ld-sheet" role="document">
      <span class="ld-grab" aria-hidden="true"></span>
      <img class="ld-sheet-papi" src="${PAPI}" alt="" width="120" height="130">
      <h2>Kılıcını kınına koyma!</h2>
      <p>${esc(message || (live ? 'Bugünkü ücretsiz Canlı Düello hakkını kullandın.' : "Bugünkü 2 ücretsiz Papi düellonu kullandın."))} Yeni bir düello için:</p>
      <button type="button" class="ld-opt ld-opt-ad" data-ad><span class="ld-opt-ic">${ICON.play}</span><span><b>Reklam izle · +1 düello</b><small>Kısa bir video, hemen başla</small></span></button>
      <button type="button" class="ld-opt ld-opt-pro" data-pro><span class="ld-opt-ic">${ICON.crown}</span><span><b>Premium Pro · sınırsız düello</b><small>Paketleri gör</small></span></button>
      <p class="ld-sheet-note" role="status">Yarın yeni ücretsiz hakkın gelir.</p>
      <button type="button" class="ld-text-btn" data-close>Kapat</button>
    </div>`, () => closeLayer());
  el.addEventListener('click', e => { if (e.target === el) closeLayer(); });
  el.querySelector('[data-close]').onclick = () => closeLayer();
  el.querySelector('[data-pro]').onclick = () => {
    closeLayer();
    if (window.DMSatis?.planlar) window.DMSatis.planlar(live ? 'canli-duello' : 'papi-duello', 'premium_pro');
    else if (window.dmAndroidBilling?.available) window.dmAndroidBilling.open(live ? 'canli-duello' : 'papi-duello');
    else toast('Paketleri uygulamanın Mağaza bölümünden görebilirsin.');
  };
  const ad = el.querySelector('[data-ad]'), note = el.querySelector('.ld-sheet-note');
  if (!adAvailable()) { ad.disabled = true; note.textContent = 'Ödüllü reklam şu an kullanılamıyor. Yarın yeni ücretsiz hakkın gelir.'; }
  let offerId = null, busy = false, recheck = false;
  ad.onclick = async () => {
    if (busy) return; busy = true; ad.disabled = true; note.textContent = recheck ? 'Düello hakkın kontrol ediliyor…' : 'Reklam hazırlanıyor…';
    try {
      if (!recheck) {
        const offer = await rpc('dm_duel_ad', {p_kind: live ? 'live' : 'papi', p_op: 'prepare'}, owner);
        if (!offer.ok) throw Error(offer.message || 'Reklam hazırlanamadı.');
        offerId = offer.offerId;
        const result = await window.dmAndroidAds.show('energy');
        if (result?.test) throw Error('Test reklamları gerçek düello hakkı kazandırmaz.');
        if (!result?.completed) throw Error('Reklamı tamamladığında 1 düello hakkı kazanırsın.');
        if (typeof result.energy === 'number') { window.genelEnerjiKalan = result.energy; window.headerEnerjiGoster?.(result.energy, window.genelEnerjiMax || 25); }
        recheck = true;
      }
      let d = null;
      for (let i = 0; i < 4; i++) { d = await rpc('dm_duel_ad', {p_kind: live ? 'live' : 'papi', p_op: 'redeem', p_offer: offerId}, owner); if (d.claimed || !d.ok) break; await sleep(2500); }
      if (!d?.ok) throw Error(d?.message || 'Reklam ödülü doğrulanamadı.');
      if (!d.claimed) { note.textContent = 'Reklam ödülün doğrulanıyor. Birazdan tekrar dene.'; ad.querySelector('b').textContent = 'Düello hakkımı kontrol et'; return; }
      rights = null;
      closeLayer();
      retry?.();
    } catch (e) { note.textContent = e.message || 'Reklam açılamadı. Tekrar deneyebilirsin.'; }
    finally { busy = false; if (ad.isConnected) ad.disabled = false; }
  };
}

/* ---------- Lobi (davetler) ---------- */
let lobby = null, lobbyOwner = '', lobbyReady = false, inDuel = false, banner = null;
function busyScreen() {
  if (inDuel || document.hidden) return true;
  // Ana sekmeler (Parkur, Arkadaşlar, Oyunlar, Mağaza…) da tam ekran katmandır; onlar engel sayılmaz.
  const home = new Set(['tab-dunya','tab-aktiviteler','tab-derscalis','tab-meduakis','tab-magaza','tab-profil']);
  const shown = el => !home.has(el.id) && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  // Oyun, parkur sorusu ya da başka bir pencere açıksa davet gösterilmez.
  if ([...document.querySelectorAll('.ld-layer,.dc-fullscreen-overlay.active,dialog[open],#genelSonucOverlay,.game-modal-overlay,.dmpo-veil,.dm-lig-duel-overlay,.dm-perde,[role=dialog][aria-modal=true]')].some(shown)) return true;
  const nav = document.getElementById('bottomNavMobile');
  if (nav && !nav.getClientRects().length) return true;
  return false;
}
function ensureLobby() {
  const sb = window.supabaseClient;
  const owner = token();
  if (!sb?.channel || !owner || document.hidden) return;
  if (lobby && lobbyOwner === owner) return;
  dropLobby();
  lobbyOwner = owner;
  lobby = sb.channel(LOBBY, {config: {broadcast: {self: false, ack: false}}});
  lobby.on('broadcast', {event: 'seek'}, ({payload}) => onSeek(payload))
       .on('broadcast', {event: 'taken'}, ({payload}) => { if (banner && banner.id === payload?.id) hideBanner(); })
       .subscribe(s => { lobbyReady = s === 'SUBSCRIBED'; if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s)) lobbyReady = false; });
}
function dropLobby() {
  if (lobby) { try { window.supabaseClient?.removeChannel(lobby); } catch {} }
  lobby = null; lobbyReady = false; lobbyOwner = '';
}
function lobbySend(event, payload) {
  ensureLobby();
  if (!lobby) return;
  const go = () => lobby?.send({type: 'broadcast', event, payload}).catch(() => {});
  if (lobbyReady) go(); else {
    const channel = lobby, started = Date.now();
    const wait = setInterval(() => {
      if (lobby !== channel || Date.now() - started > 5000) { clearInterval(wait); return; }
      if (lobbyReady) { clearInterval(wait); go(); }
    }, 200);
  }
}
async function onSeek(p) {
  if (!p?.id || !p?.name || norm(p.name) === norm(who()) || busyScreen() || banner) return;
  let r = null; try { r = await status(); } catch {}
  if (!r || !r.social || (!r.unlimited && Number(r.live?.remaining) <= 0)) return;
  if (busyScreen() || banner) return;
  showBanner(p);
}
function showBanner(p) {
  const until = Date.now() + 13000;
  const el = document.createElement('aside');
  el.className = 'ld-invite'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Canlı düello daveti');
  el.innerHTML = `<div class="ld-invite-top"><span class="ld-avatar ld-av-guest">${esc(p.name.slice(0,1).toLocaleUpperCase('tr-TR'))}<img src="${PAPI_INVITE}" alt=""></span>
    <span class="ld-invite-copy"><small>CANLI DÜELLO</small><b>${esc(p.name)} seninle kapışmak istiyor!</b><span>Sv. ${esc(p.level || 1)} · 6 soruluk savaş</span></span></div>
    <div class="ld-invite-bar"><i></i></div>
    <div class="ld-invite-actions"><button type="button" class="ld-invite-no">Şimdi değil</button><button type="button" class="ld-invite-yes">Kabul et · <span data-left>13</span> sn</button></div>`;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('ld-in'));
  sfx('kombo');
  const bar = el.querySelector('.ld-invite-bar i'), left = el.querySelector('[data-left]');
  const tick = setInterval(() => {
    const ms = until - Date.now();
    if (ms <= 0 || busyScreen()) { hideBanner(); return; }
    left.textContent = Math.ceil(ms / 1000); bar.style.width = (ms / 130) + '%';
  }, 250);
  banner = {id: p.id, el, tick};
  el.querySelector('.ld-invite-no').onclick = hideBanner;
  el.querySelector('.ld-invite-yes').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      const d = await rpc('dm_duel_live_accept', {p_duel: p.id});
      hideBanner();
      if (d.paywall) return paywall('live', d.message, null);
      if (!d.ok) return toast(d.message || 'Bu düelloyu başkası kaptı.');
      rights = null;
      startMatch(d);
    } catch (err) { hideBanner(); toast(err.message); }
  };
}
function hideBanner() {
  if (!banner) return;
  clearInterval(banner.tick);
  const el = banner.el; banner = null;
  el.classList.remove('ld-in'); setTimeout(() => el.remove(), 260);
}

/* ---------- Canlı Düello: rakip arama ---------- */
let searching = null;
async function startLive() {
  if (inDuel) return;
  if (!token()) return toast('Düello için öğrenci hesabına giriş yapmalısın.');
  inDuel = true;
  const owner = token();
  const el = openLayer('ld-search', `
    <div class="ld-search-top"><span class="ld-kicker">CANLI DÜELLO</span></div>
    <div class="ld-radar" aria-hidden="true"><span></span><span></span><span></span><img src="${PAPI}" alt=""></div>
    <h2>Rakip aranıyor…</h2>
    <p class="ld-search-sub">Düello isteğin çevrimiçi oyunculara gitti.</p>
    <div class="ld-count" aria-live="off">0:15</div>
    <ul class="ld-steps"><li class="ld-done">Sorular Word Bank'ten, seviyene göre</li><li>15 sn içinde rakip yoksa Papi seninle kapışır</li></ul>
    <button type="button" class="ld-ghost" data-cancel>Aramayı İptal Et</button>
    <small class="ld-foot">İptal edersen düello hakkın geri gelir.</small>`, () => cancel());
  const count = el.querySelector('.ld-count');
  let stop = false, duel = null, t0 = Date.now(), clock = null;
  async function cancel() {
    if (stop) return; stop = true; clearInterval(clock);
    if (duel?.id) {
      try {
        const d = await rpc('dm_duel_live_cancel', {p_duel: duel.id}, owner);
        lobbySend('taken', {id: duel.id});
        if (d.cancelled === false && d.status === 'matched') { searching = null; return startMatch(d); }
      } catch {}
    }
    searching = null; inDuel = false; rights = null; closeLayer();
  }
  el.querySelector('[data-cancel]').onclick = cancel;
  searching = {cancel};
  try {
    const d = await rpc('dm_duel_live_search', {}, owner);
    if (stop) return;
    if (d.paywall) { inDuel = false; searching = null; closeLayer(); return paywall('live', d.message, startLive); }
    if (!d.ok) throw Error(d.message || 'Düello başlatılamadı.');
    duel = d; rights = null;
    if (d.status === 'matched') { searching = null; return startMatch(d); }
    t0 = Date.now();
    if (d.broadcast) lobbySend('seek', {id: d.id, name: who(), level: d.level || 1, at: Date.now()});
    clock = setInterval(() => { const s = Math.max(0, Math.ceil((SEARCH_MS - (Date.now() - t0)) / 1000)); count.textContent = '0:' + String(s).padStart(2, '0'); }, 250);
    for (const at of [3000, 6000, 9000, 12000, SEARCH_MS + 600, SEARCH_MS + 3000]) {
      const wait = at - (Date.now() - t0); if (wait > 0) await sleep(wait);
      if (stop) return;
      const p = await rpc('dm_duel_live_poll', {p_duel: d.id}, owner).catch(() => null);
      if (stop) return;
      if (p?.ok && p.status === 'matched') {
        clearInterval(clock); searching = null;
        lobbySend('taken', {id: d.id});
        return startMatch(p);
      }
    }
    throw Error('Bağlantı yavaş. Düello başlatılamadı, hakkın geri yüklendi.');
  } catch (e) {
    if (stop) return;
    clearInterval(clock); toast(e.message);
    stop = true; searching = null; inDuel = false;
    if (duel?.id) rpc('dm_duel_live_cancel', {p_duel: duel.id}, owner).catch(() => {});
    closeLayer();
  }
}

/* ---------- Papi'ye Karşı ---------- */
async function startPapi() {
  if (inDuel) return;
  if (!token()) return toast('Düello için öğrenci hesabına giriş yapmalısın.');
  inDuel = true;
  try {
    const d = await rpc('dm_duel_papi_start');
    if (d.paywall) { inDuel = false; return paywall('papi', d.message, startPapi); }
    if (!d.ok) throw Error(d.message || 'Düello başlatılamadı.');
    rights = null;
    startMatch(d);
  } catch (e) { inDuel = false; toast(e.message); }
}

/* ---------- Eşleşti (VS) ---------- */
function avatarHtml(name, cls) {
  if (name === 'Papi') return `<span class="ld-big ${cls} ld-big-papi"><img src="${PAPI}" alt="Papi"></span>`;
  return `<span class="ld-big ${cls}">${esc(String(name || '?').slice(0,1).toLocaleUpperCase('tr-TR'))}</span>`;
}
function startMatch(d) {
  inDuel = true;
  if (!Array.isArray(d.questions) || d.questions.length !== 6) { inDuel = false; closeLayer(); return toast('Düello soruları alınamadı. Tekrar dene.'); }
  const opp = d.vsPapi ? 'Papi' : (d.opponent || 'Rakip');
  const el = openLayer('ld-vs', `
    <span class="ld-kicker">${d.vsPapi && d.kind === 'live' ? 'ŞU AN KİMSE MÜSAİT DEĞİL · PAPİ SENİNLE KAPIŞIYOR!' : 'RAKİP BULUNDU!'}</span>
    <div class="ld-vs-row">
      <div class="ld-vs-p">${avatarHtml(who(), 'ld-me')}<b>Sen</b></div>
      <span class="ld-vs-badge">VS</span>
      <div class="ld-vs-p">${avatarHtml(opp, 'ld-them')}<b>${esc(opp)}</b>${d.opponentLevel ? `<small>Sv. ${esc(d.opponentLevel)}</small>` : ''}</div>
    </div>
    <div class="ld-facts"><div><b>6</b><span>soru</span></div><div><b>100</b><span>can</span></div><div><b>x2</b><span>final</span></div></div>
    <div class="ld-go"><span>Başlıyor</span><b data-n>3</b></div>
    <p class="ld-vs-note">Doğru ve hızlı cevap rakibinin canını azaltır. Son soru 2 kat hasar verir.</p>`, () => {});
  const n = el.querySelector('[data-n]');
  let i = 3;
  const t = setInterval(() => { i--; if (i > 0) { n.textContent = i; n.classList.remove('ld-pop'); void n.offsetWidth; n.classList.add('ld-pop'); } else { clearInterval(t); battle(d, opp); } }, 1000);
}

/* ---------- Savaş paneli ---------- */
const hitFor = (q, i, ms) => { const lim = q.lim * 1000, t = Math.min(lim, Math.max(0, ms)); let h = 12 + Math.round(8 * (lim - t) / lim); if (i === 5) h *= 2; return h; };
function battle(d, opp) {
  const owner = token(), me = who();
  const qs = d.questions, answers = [];
  let myHp = 100, oppHp = 100, idx = 0, qStart = 0, timer = null, locked = false, oppChannel = null, quit = false, papiTimers = [];
  const el = openLayer('ld-battle', `
    <header class="ld-bhead">
      <button type="button" class="ld-x" data-quit aria-label="Düellodan çık">${ICON.close}</button>
      <span class="ld-kicker">${d.vsPapi ? "PAPİ'YE KARŞI" : 'CANLI DÜELLO'}</span>
      <span class="ld-round" data-round>Tur 1/6</span>
    </header>
    <div class="ld-fighters">
      <div class="ld-f">${avatarHtml(me, 'ld-me ld-sm')}<div class="ld-fcopy"><b>Sen</b><div class="ld-hp" data-myhp><i></i></div><small data-myn>100 can</small></div></div>
      <span class="ld-vs-mini">VS</span>
      <div class="ld-f ld-f-r">${avatarHtml(opp, 'ld-them ld-sm')}<div class="ld-fcopy"><b>${esc(opp)}</b><div class="ld-hp ld-hp-r" data-opphp><i></i></div><small data-oppn>100 can</small></div><span class="ld-dmg" data-oppdmg></span></div>
      <span class="ld-dmg ld-dmg-me" data-mydmg></span>
    </div>
    <div class="ld-dots" data-dots>${qs.map((_, i) => `<span class="${i === 5 ? 'ld-dot-final' : ''}"></span>`).join('')}</div>
    <section class="ld-card">
      <div class="ld-timer"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="23" class="ld-tr"/><circle cx="28" cy="28" r="23" class="ld-tf" data-ring/></svg><b data-sec>10</b></div>
      <span class="ld-qtype" data-type></span>
      <p class="ld-q" data-q></p>
      <span class="ld-opp-flag" data-flag hidden>${ICON.bolt}<span>${esc(opp)} cevapladı</span></span>
    </section>
    <div class="ld-opts" data-opts></div>
    <div class="ld-tip"><img src="${PAPI}" alt=""><span><b>Hızlı ol!</b> Doğru cevap rakibe 12–20 hasar verir. 6. soru <b>Final: 2 kat hasar.</b></span></div>`, () => askQuit());
  const $ = s => el.querySelector(s);
  const ring = $('[data-ring]'), sec = $('[data-sec]'), opts = $('[data-opts]');
  function paintHp() {
    $('[data-myhp] i').style.width = myHp + '%'; $('[data-myn]').textContent = myHp + ' can';
    $('[data-opphp] i').style.width = oppHp + '%'; $('[data-oppn]').textContent = oppHp + ' can';
    $('[data-myhp]').classList.toggle('ld-low', myHp <= 30); $('[data-opphp]').classList.toggle('ld-low', oppHp <= 30);
  }
  function floatDmg(sel, n) { const f = $(sel); if (!f) return; f.textContent = '-' + n; f.classList.remove('ld-show'); void f.offsetWidth; f.classList.add('ld-show'); }
  function hitMe(n) { myHp = Math.max(0, myHp - n); paintHp(); floatDmg('[data-mydmg]', n); $('[data-myhp]').classList.remove('ld-shake'); void el.offsetWidth; $('[data-myhp]').classList.add('ld-shake'); }
  function hitOpp(n) { oppHp = Math.max(0, oppHp - n); paintHp(); floatDmg('[data-oppdmg]', n); $('[data-opphp]').classList.remove('ld-shake'); void el.offsetWidth; $('[data-opphp]').classList.add('ld-shake'); }
  function flag() { const f = $('[data-flag]'); f.hidden = false; f.classList.remove('ld-pop'); void f.offsetWidth; f.classList.add('ld-pop'); clearTimeout(flag.t); flag.t = setTimeout(() => { f.hidden = true; }, 1600); }
  // Rakibin cevapları: Papi için sunucunun planı, insan rakip için anlık kanal.
  if (d.vsPapi && Array.isArray(d.papi)) {
    // Papi her soruyu kendi zamanında cevaplar; sorular sırayla ilerler.
    let at = 0;
    d.papi.forEach((a, i) => {
      at += Math.min(qs[i].lim * 1000, a.ms) + 900;
      papiTimers.push(setTimeout(() => { if (quit) return; flag(); if (a.c === qs[i].a) hitMe(hitFor(qs[i], i, a.ms)); }, at));
    });
  } else if (window.supabaseClient?.channel) {
    oppChannel = window.supabaseClient.channel('dm-duel-' + d.id, {config: {broadcast: {self: false}}});
    oppChannel.on('broadcast', {event: 'ans'}, ({payload}) => {
      if (quit || !payload || payload.side === d.side) return;
      const i = Number(payload.i); if (!(i >= 0 && i < 6)) return;
      flag();
      if (payload.ok) hitMe(hitFor(qs[i], i, Number(payload.ms) || qs[i].lim * 1000));
    }).subscribe();
  }
  function show() {
    const q = qs[idx];
    locked = false;
    $('[data-round]').textContent = 'Tur ' + (idx + 1) + '/6';
    el.querySelectorAll('[data-dots] span').forEach((s, i) => s.classList.toggle('ld-now', i === idx));
    $('[data-type]').textContent = q.t === 'final' ? TYPE_LABEL.final : (q.ask === 'meaning' ? TYPE_LABEL.meaning : TYPE_LABEL[q.t] || '');
    const p = esc(q.p).replace('___', '<span class="ld-blank">___</span>');
    $('[data-q]').innerHTML = q.t === 'meaning' || (q.t === 'final' && q.ask === 'meaning') ? `“${p}”` : p;
    el.classList.toggle('ld-is-final', idx === 5);
    opts.className = 'ld-opts' + (q.o.length === 2 ? ' ld-opts-2' : '') + (q.t === 'pair' ? ' ld-opts-pair' : '');
    opts.innerHTML = q.o.map((o, i) => `<button type="button" class="ld-opt-btn${q.o.length === 2 ? (i === 0 ? ' ld-true' : ' ld-false') : ''}" data-i="${i}">${esc(o)}</button>`).join('');
    opts.querySelectorAll('[data-i]').forEach(b => b.onclick = () => pick(Number(b.dataset.i)));
    qStart = performance.now();
    const lim = q.lim * 1000, C = 144.5;
    clearInterval(timer);
    const step = () => {
      const left = Math.max(0, lim - (performance.now() - qStart));
      sec.textContent = Math.ceil(left / 1000);
      ring.style.strokeDashoffset = String(C * (1 - left / lim));
      el.classList.toggle('ld-hurry', left < 3000);
      if (left <= 0) pick(-1);
    };
    step(); timer = setInterval(step, 100);
  }
  function pick(c) {
    if (locked || quit) return; locked = true; clearInterval(timer);
    const q = qs[idx], ms = Math.min(q.lim * 1000, Math.round(performance.now() - qStart));
    answers[idx] = {c, ms};
    const ok = c === q.a;
    opts.querySelectorAll('[data-i]').forEach(b => { b.disabled = true; const i = Number(b.dataset.i); if (i === q.a) b.classList.add('ld-right'); else if (i === c) b.classList.add('ld-wrong'); });
    sfx(ok ? 'dogru' : 'yanlis');
    if (ok) hitOpp(hitFor(q, idx, ms));
    oppChannel?.send({type: 'broadcast', event: 'ans', payload: {side: d.side, i: idx, ok, ms}}).catch(() => {});
    setTimeout(() => { if (quit) return; idx++; if (idx < 6) show(); else finish(); }, 1100);
  }
  function askQuit() {
    if (quit) return;
    const box = document.createElement('div');
    box.className = 'ld-confirm';
    box.innerHTML = '<div><b>Düellodan çıkılsın mı?</b><p>Çıkarsan kalan sorular boş sayılır ve düello hakkın geri gelmez.</p><div><button type="button" data-stay>Devam et</button><button type="button" data-leave>Çık</button></div></div>';
    el.append(box);
    box.querySelector('[data-stay]').onclick = () => box.remove();
    box.querySelector('[data-leave]').onclick = () => { box.remove(); for (let i = idx; i < 6; i++) if (!answers[i]) answers[i] = {c: -1, ms: qs[i].lim * 1000}; locked = true; clearInterval(timer); finish(); };
  }
  $('[data-quit]').onclick = askQuit;
  async function finish() {
    quit = true; clearInterval(timer); papiTimers.forEach(clearTimeout);
    for (let i = 0; i < 6; i++) if (!answers[i]) answers[i] = {c: -1, ms: qs[i].lim * 1000};
    const wait = openLayer('ld-wait', `<img src="${PAPI}" alt="" class="ld-wait-papi"><h2>Sonuçlar hesaplanıyor…</h2><p data-w>${d.vsPapi ? '' : esc(opp) + ' bitirmeyi bekliyoruz.'}</p>`, () => {});
    let r = null;
    try {
      for (let i = 0; i < 4 && !r; i++) { r = await rpc('dm_duel_finish', {p_duel: d.id, p_answers: answers}, owner).catch(() => null); if (!r) await sleep(1500); }
      if (!r?.ok) throw Error(r?.message || 'Sonuç kaydedilemedi.');
      const until = Date.now() + 170000;
      while (r.status !== 'finished' && Date.now() < until) {
        await sleep(4000);
        if (!wait.isConnected) break;
        r = await rpc('dm_duel_result', {p_duel: d.id}, owner).catch(() => r);
      }
    } catch (e) { toast(e.message); }
    try { if (oppChannel) window.supabaseClient?.removeChannel(oppChannel); } catch {}
    if (!r || r.status !== 'finished') { inDuel = false; closeLayer(); return toast('Sonuç birazdan Düellolarım bölümüne yansır.'); }
    if (r.yo) { window.dmApplyRewardState?.(r.yo, me); window.dmProgression?.refresh?.(true); document.dispatchEvent(new Event('dm:state')); }
    rights = null;
    result(d, opp, r);
  }
  paintHp(); show();
}

/* ---------- Sonuç ---------- */
function result(d, opp, r) {
  const win = r.outcome === 'win', draw = r.outcome === 'draw';
  const me = r.me || {}, them = r.them || {};
  const title = win ? 'ZAFER!' : draw ? 'BERABERE!' : 'YENİLGİ';
  const sub = win ? (Number(them.hp) === 0 ? 'Nakavt! ' : '') + esc(opp) + ' yenildi.' : draw ? 'Çok çekişmeliydi!' : (opp === 'Papi' ? 'Papi bu kez kazandı. Rövanş?' : esc(opp) + ' bu kez kazandı. Rövanş?');
  const avg = me.correct ? (Number(me.ms || 0) / 6 / 1000).toFixed(1) : '-';
  const el = openLayer('ld-result' + (win ? ' ld-win' : ''), `
    ${win ? `<i class="ld-sp" style="left:14%;top:12%">${ICON.star}</i><i class="ld-sp" style="right:14%;top:18%;animation-delay:.7s">${ICON.star}</i><i class="ld-sp ld-sp-s" style="left:24%;top:30%;animation-delay:1.3s">${ICON.star}</i>` : ''}
    <span class="ld-kicker">${d.vsPapi ? "PAPİ'YE KARŞI" : 'CANLI DÜELLO'} BİTTİ</span>
    <h2 class="ld-title">${title}</h2>
    <p class="ld-sub">${sub}</p>
    <img class="ld-result-papi" src="${PAPI}" alt="">
    <div class="ld-hpline"><span>Sen <b class="ld-g">${Number(me.hp ?? 0)} can</b></span><span>${esc(opp)} <b class="ld-r">${Number(them.hp ?? 0)} can</b></span></div>
    <div class="ld-stats"><div><b>${Number(me.correct || 0)}/6</b><span>doğru</span></div><div><b>${avg}${avg === '-' ? '' : ' sn'}</b><span>ort. süre</span></div><div><b>${Number(me.damage || 0)}</b><span>hasar</span></div></div>
    <div class="ld-stats ld-reward"><div><b>+${Number(me.xp || 0)} XP</b><span>kazandın</span></div><div><b>+${Number(me.gold || 0)}</b><span>altın</span></div></div>
    <button type="button" class="ld-primary" data-again>${d.kind === 'papi' ? 'Papi ile Rövanş' : 'Yeni Canlı Düello'}</button>
    <button type="button" class="ld-ghost" data-close>Kapat</button>`, () => done());
  sfx(win ? 'kombo' : draw ? 'dogru' : 'yanlis');
  function done() { inDuel = false; closeLayer(); }
  el.querySelector('[data-close]').onclick = done;
  el.querySelector('[data-again]').onclick = () => { inDuel = false; closeLayer(); (d.kind === 'papi' ? startPapi : startLive)(); };
}

/* ---------- Başlatma ---------- */
function boot() {
  if (token()) ensureLobby();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { dropLobby(); hideBanner(); } else boot(); });
document.addEventListener('dm:login', () => { rights = null; dropLobby(); setTimeout(boot, 1500); });
setInterval(() => { if (lobbyOwner && lobbyOwner !== token()) { dropLobby(); rights = null; } boot(); }, 3000);
setTimeout(boot, 4000);

window.dmLiveDuel = {startLive, startPapi, status, paywall};
})();
