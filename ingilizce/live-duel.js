/* Canlı Düello + Papi'ye Karşı — 10 soruluk savaş paneli. [17 Kas 2026, 18 Kas 2026'da 6'dan 10 soruya]
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

async function rpc(op, args = {}, expected = token(), timeoutMs=15000) {
  if (!expected) throw Error('Düello için öğrenci hesabına giriş yapmalısın.');
  const sentAt=Date.now();
  const r = await fetch(API + op, {method:'POST', headers:{'Content-Type':'application/json', apikey:KEY}, body:JSON.stringify({p_token:expected, ...args}), signal:AbortSignal.timeout(timeoutMs)});
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok) throw Error('Düello sunucusuna bağlanılamadı. Tekrar dene.');
  if (token() !== expected) throw Error('Öğrenci oturumu değişti.');
  // Estimate the server clock at the midpoint of this request for a shared VS start.
  const receivedAt=Date.now();
  for(const match of [d,d?.match])if(match?.startAt&&match?.serverNow){const delay=Date.parse(match.startAt)-Date.parse(match.serverNow);if(Number.isFinite(delay))match.clientStartAt=(sentAt+receivedAt)/2+delay;}
  return d || {};
}

async function startRpc(kind, owner, target) {
  const p_ticket=await window.dmTeam.ticket('duel');
  return rpc('dm_team_duel_start',{p_kind:kind,p_ticket,p_target:target||null},owner);
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
const HOLD_WAIT_S = 45, VERIFY_GRACE_S = 15; // Reklam izleyen rakip için en fazla bekleme (sunucudaki dm_duel_live_hold ile aynı)
function paywall(kind, message, retry, hold) {
  const owner = token();
  const live = kind === 'live';
  // hold = {duel, host, leftMs}: davet kabul edildi ama hak yok; düello bu oyuncuya ayrıldı.
  let held = hold?.duel ? {duel: hold.duel, host: String(hold.host || 'Rakibin'), until: Date.now() + (Number(hold.leftMs) || 20000), started: false} : null;
  const invited=!!held; const active=()=>layer===el&&el.isConnected&&token()===owner;
  const el = openLayer('ld-sheet-layer', `
    <div class="ld-sheet" role="document">
      <span class="ld-grab" aria-hidden="true"></span>
      <img class="ld-sheet-papi" src="${PAPI}" alt="" width="120" height="130">
      <h2>Kılıcını kınına koyma!</h2>
      ${held ? `<span class="ld-hold-chip" data-chip>⏳ <b>${esc(held.host)}</b> seni bekliyor · <span data-hleft>${Math.ceil((held.until - Date.now()) / 1000)}</span> sn</span>` : ''}
      <p>${esc(message || (live ? 'Bugünkü ücretsiz Canlı Düello hakkını kullandın.' : "Bugünkü 2 ücretsiz Papi düellonu kullandın."))} ${held ? 'Reklamı izle, düello hemen başlasın:' : 'Yeni bir düello için:'}</p>
      <button type="button" class="ld-opt ld-opt-ad" data-ad><span class="ld-opt-ic">${ICON.play}</span><span><b>Reklam izle · +1 düello</b><small>${held ? 'Bitince ' + esc(held.host) + ' ile kapışırsın' : 'Kısa bir video, hemen başla'}</small></span></button>
      <button type="button" class="ld-opt ld-opt-pro" data-pro><span class="ld-opt-ic">${ICON.crown}</span><span><b>Premium Pro · sınırsız düello</b><small>Paketleri gör</small></span></button>
      <p class="ld-sheet-note" role="status">Yarın yeni ücretsiz hakkın gelir.</p>
      <button type="button" class="ld-text-btn" data-close>Kapat</button>
    </div>`, () => closeSheet());
  const sheet = el.querySelector('.ld-sheet');
  let holdTick = null, offerId = null, busy = false, recheck = false;
  // Ayrılan düelloyu bırak: rakip beklemeyi bırakır (rastgelede Papi, davette seçim ekranı).
  function release(reason) {
    if (!held || held.started) return;
    const h = held; held = null; clearInterval(holdTick);
    rpc('dm_duel_live_hold', {p_duel: h.duel, p_op: 'release'}, owner).catch(() => {});
    lobbySend('hold', {id: h.duel, name: who(), end: true, reason: reason || 'cancel'});
  }
  function closeSheet() { release('cancel'); closeLayer(); }
  function paintHold() {
    if (!held) return;
    const left = Math.max(0, Math.ceil((held.until - Date.now()) / 1000));
    const visibleLeft=Math.max(0,Math.ceil(((held.adUntil||held.until)-Date.now())/1000));
    const n = el.querySelector('[data-hleft]'); if (n) n.textContent = visibleLeft||left;
    if(held.adUntil&&visibleLeft===0&&left>0)note.textContent='Reklam veya ödül doğrulaması bekleniyor…';
    if (left <= 0) holdExpired();
  }
  function holdExpired() {
    if (!held || held.started) return;
    held.expired=true; clearInterval(holdTick);
    el.querySelector('[data-chip]')?.remove();
    if(!busy&&!recheck) { held=null; ad.disabled=true; }
    note.textContent = 'Davetin süresi doldu. Varsa kazandığın düello hakkı korunur.';
  }
  el.addEventListener('click', e => { if (e.target === el) closeSheet(); });
  el.querySelector('[data-close]').onclick = closeSheet;
  el.querySelector('[data-pro]').onclick = () => {
    closeSheet();
    if (window.DMSatis?.planlar) window.DMSatis.planlar(live ? 'canli-duello' : 'papi-duello', 'premium_pro');
    else if (window.dmAndroidBilling?.available) window.dmAndroidBilling.open(live ? 'canli-duello' : 'papi-duello');
    else toast('Paketleri uygulamanın Mağaza bölümünden görebilirsin.');
  };
  const ad = el.querySelector('[data-ad]'), note = el.querySelector('.ld-sheet-note');
  if (!adAvailable()) {
    ad.disabled = true; note.textContent = 'Ödüllü reklam şu an kullanılamıyor. Yarın yeni ücretsiz hakkın gelir.';
    if (held) { release('noad'); el.querySelector('[data-chip]')?.remove(); }
  }
  if (held) { holdTick = setInterval(paintHold, 250); paintHold(); }

  // No second confirmation or countdown after the reward: redeem + accept the reserved match atomically.
  ad.onclick = async () => {
    if (busy || !active()) return;
    busy=true; ad.disabled=true; note.textContent=recheck?'Düello hakkın doğrulanıyor…':'Reklam hazırlanıyor…';
    let showFailed=false;
    try {
      if (!recheck) {
        const offer=await rpc('dm_duel_ad',{p_kind:live?'live':'papi',p_op:'prepare'},owner);
        if(!offer.ok)throw Error(offer.message||'Reklam hazırlanamadı.');
        offerId=offer.offerId;
        if(!active())return;
        if(held){
          const h=held;
          const w=await rpc('dm_duel_live_hold',{p_duel:h.duel,p_op:'watch'},owner);
          if(!active()||held!==h)return;
          if(!w?.ok){holdExpired();throw Error('Davetin süresi doldu.');}
          h.until=Date.now()+(Number(w.holdLeftMs)||(HOLD_WAIT_S+VERIFY_GRACE_S)*1000);
          h.adUntil=Date.now()+(Number(w.adLeftMs)||HOLD_WAIT_S*1000);
          void lobbySend('hold',{id:h.duel,name:who(),ad:true,leftMs:w.holdLeftMs,adLeftMs:w.adLeftMs});
        }
        let result;
        try{result=await window.dmAndroidAds.show('energy');}
        catch(e){showFailed=true;note.textContent='Reklam sonucu kontrol ediliyor…';}
        if(token()!==owner)return;
        if(result?.test||result?.completed===false){release('ad');throw Error(result?.test?'Test reklamları hak kazandırmaz.':'Reklam tamamlanmadı.');}
        if(!showFailed&&!result?.completed){release('ad');throw Error('Reklam tamamlanmadı.');}
        if(typeof result?.energy==='number'){window.genelEnerjiKalan=result.energy;window.headerEnerjiGoster?.(result.energy,window.genelEnerjiMax||25);}
        recheck=true;
      }
      // A native verification delay never grants a right locally. The server alone decides.
      let d=null;
      const until=Date.now()+15000;
      do {
        if(token()!==owner)return;
        const h=active()?held:null;
        d=h?await rpc('dm_duel_ad_accept',{p_offer:offerId,p_duel:h.duel},owner).catch(()=>null)
          :await rpc('dm_duel_ad',{p_kind:live?'live':'papi',p_op:'redeem',p_offer:offerId},owner).catch(()=>null);
        if(d&&(d.claimed||!d.ok))break;
        if(Date.now()>=until)break;
        await sleep(2000);
      }while(Date.now()<until);
      if(!d?.ok&&d)throw Error(d.message||'Reklam ödülü doğrulanamadı.');
      if(!d?.claimed){
        if(active()){note.textContent='Reklam ödülü henüz doğrulanmadı. Birazdan kontrol edebilirsin.';ad.querySelector('b').textContent='Düello hakkımı kontrol et';}
        return;
      }
      rights=null;
      const match=d.match;
      if(!active())return;
      clearInterval(holdTick);
      if(match?.ok&&match.status==='matched'){
        held=null;void lobbySend('matched',{id:match.id});sfx('kombo');return startMatch(match);
      }
      held=null;closeLayer();
      if(invited){toast('Davet artık açık değil. Kazandığın düello hakkı korundu.');return;}
      retry?.();
    }catch(e){
      if(held&&!recheck){release('ad');el.querySelector('[data-chip]')?.remove();}
      if(active())note.textContent=e.message||'Reklam açılamadı. Tekrar deneyebilirsin.';
    }finally{busy=false;if(ad.isConnected)ad.disabled=invited&&!held&&!recheck;}
  };
}

/* ---------- Lobi (davetler) ---------- */
let lobby = null, lobbyOwner = '', lobbyReady = false, inDuel = false, banner = null, holdListener = null, waitSignal = null;
function busyScreen() {
  // Main tabs and learning overlays must not swallow invitations.
  return inDuel || document.hidden || !!layer;
}
let rollAt = 0;
function answerRoll(p) {
  const roll = String(p?.roll || '');
  if (!/^[0-9a-f-]{36}$/i.test(roll) || document.hidden) return;
  const now = Date.now();
  if (now - rollAt < 20000) return; // sahte/yoğun yayınlara karşı en fazla 20 sn'de bir cevap
  rollAt = now;
  const owner = token();
  if (!owner) return;
  const tab = document.querySelector('#bottomNavMobile .bn-item.active, #bottomNavMobile .bn-item[aria-current="page"]')?.getAttribute('aria-label') || '';
  // Cevaplar aynı anda yığılmasın diye 0–2 sn arası dağıtılır.
  setTimeout(() => rpc('dm_online_here', {p_roll: roll, p_screen: inDuel ? 'Düello' : tab, p_duel: !!inDuel}, owner).catch(() => {}), Math.random() * 2000);
}

function ensureLobby() {
  const sb = window.supabaseClient;
  const owner = token();
  if (!sb?.channel || !owner || document.hidden) return;
  if (lobby && lobbyOwner === owner) return;
  dropLobby();
  lobbyOwner = owner;
  lobby = sb.channel(LOBBY, {config: {broadcast: {self: false, ack: true}}});
  const channel = lobby;
  lobby.on('broadcast', {event: 'seek'}, ({payload}) => onSeek(payload))
       .on('broadcast', {event: 'taken'}, ({payload}) => { if (banner && banner.id === payload?.id) hideBanner(); })
       // [18 Kas 2026] Kabul eden oyuncu reklam izliyor / vazgeçti — yalnız o düellonun sahibi dinler.
       .on('broadcast', {event: 'hold'}, ({payload}) => { try { holdListener?.(payload); if(waitSignal?.id===payload?.id)waitSignal.pulse(payload); } catch {} })
       .on('broadcast', {event: 'matched'}, ({payload}) => { if(waitSignal?.id===payload?.id)waitSignal.pulse({matched:true}); })
       // [18 Kas 2026] Yönetici "Çevrimiçi" yoklaması: önde açıksa bir kez cevap ver (yoklama sunucuda doğrulanır).
       .on('broadcast', {event: 'who'}, ({payload}) => answerRoll(payload))
       .subscribe(s => {
         if (lobby !== channel) return;
         lobbyReady = s === 'SUBSCRIBED';
         if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s)) {
           setTimeout(() => { if (lobby === channel && !lobbyReady) { dropLobby(); ensureLobby(); } }, 8000);
         }
       });
}
function dropLobby() {
  if (lobby) { try { window.supabaseClient?.removeChannel(lobby); } catch {} }
  lobby = null; lobbyReady = false; lobbyOwner = '';
}
async function lobbySend(event, payload) {
  const owner = token(), until = Date.now() + 5000;
  do {
    if (!owner || token() !== owner || document.hidden) return false;
    ensureLobby();
    if (lobbyReady && lobby) {
      try { if (await lobby.send({type:'broadcast', event, payload}) === 'ok') return true; } catch {}
    }
    await sleep(350);
  } while (Date.now() < until);
  return false;
}
let inboxBusy = false, inboxAfter = 0;
const seenOffers = new Map();
async function checkInbox() {
  const owner = token();
  if (!owner || busyScreen() || banner || inboxBusy || Date.now() < inboxAfter) return;
  inboxBusy = true;
  inboxAfter = Date.now() + 6000;
  try {
    const r = await rpc('dm_duel_inbox', {}, owner);
    if (r?.ok && r.offer && token() === owner && !busyScreen() && !banner) {
      const p = r.offer;
      if (!seenOffers.has(p.id) && p.leftMs > 500) showBanner({...p, at:Date.now(), deadline:Date.now()+p.leftMs});
    }
  } catch { inboxAfter = Date.now()+15000; }
  finally { inboxBusy = false; }
}
async function onSeek(p) {
  if (!p?.id || !p?.name || norm(p.name) === norm(who()) || busyScreen() || banner) return;
  // [18 Kas 2026] Profil kartından gelen davet yalnız seçilen oyuncuda görünür.
  if (p.to && norm(p.to) !== norm(who())) return;
  if (seenOffers.has(p.id)) return;
  inboxAfter = 0;
  await checkInbox();
}
function showBanner(p) {
  const until = Math.min(Date.now() + 13000, p.deadline || ((Number(p.at) || Date.now()) + 14000));
  if (until <= Date.now() || seenOffers.has(p.id)) return;
  for (const [id, expiry] of seenOffers) if (expiry < Date.now()) seenOffers.delete(id);
  seenOffers.set(p.id, Date.now()+60000);
  const el = document.createElement('aside');
  el.className = 'ld-invite'; el.style.zIndex = '2147483647'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Canlı düello daveti');
  el.innerHTML = `<div class="ld-invite-top"><span class="ld-avatar ld-av-guest">${esc(p.name.slice(0,1).toLocaleUpperCase('tr-TR'))}<img src="${PAPI_INVITE}" alt=""></span>
    <span class="ld-invite-copy"><small>${p.to ? 'DÜELLO DAVETİ' : 'CANLI DÜELLO'}</small><b>${esc(p.name)} ${p.to ? 'seni düelloya davet ediyor!' : 'seninle kapışmak istiyor!'}</b><span>Sv. ${esc(p.level || 1)} · 10 soruluk savaş</span></span></div>
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
    const btn = e.currentTarget; if (busyScreen()) { hideBanner(); return; } btn.disabled = true;
    try {
      const d = await rpc('dm_duel_live_accept', {p_duel: p.id});
      hideBanner();
      // Hakkı yoksa düello ona ayrılır: reklam izlerken rakip bekler, bitince "Şimdi Başla".
      if (d.paywall) { if(d.hold)void lobbySend('hold',{id:d.duel||p.id,name:who(),ad:false,leftMs:d.holdLeftMs});return paywall('live', d.message, null, d.hold ? {duel: d.duel || p.id, host: d.host || p.name, leftMs: d.holdLeftMs} : null); }
      if (!d.ok) return toast(d.message || 'Bu düelloyu başkası kaptı.');
      rights = null;
      void lobbySend('matched',{id:d.id});startMatch(d);
    } catch (err) { hideBanner(); toast(err.message); }
  };
}
function hideBanner() {
  if (!banner) return;
  clearInterval(banner.tick);
  const el = banner.el; banner = null;
  el.classList.remove('ld-in'); setTimeout(() => el.remove(), 260);
}

/* ---------- Rakip reklam izliyor: davet edenin ekranı [18 Kas 2026] ---------- */
// Kabul eden oyuncunun hakkı yoksa düello ona ayrılır; reklam süresince (en fazla 45 sn) burada beklenir.
function hostHoldView(el, count, getClock, setClock) {
  let warned = false, endedName = '', endedReason = '';
  function show(h) {
    if (!el.isConnected) return;
    const name = String(h.name || 'Rakibin');
    if (h.end) {
      el.querySelector('[data-hold]')?.remove();
      el.classList.remove('ld-holding');
      endedName = name; endedReason = h.reason || '';
      if (!h.silent) toast(h.reason === 'ad' ? name + ' reklamı tamamlamadı.' : name + ' düellodan vazgeçti.');
      return;
    }
    let box = el.querySelector('[data-hold]');
    if (!box) {
      box = document.createElement('div');
      box.className = 'ld-hold-card'; box.setAttribute('data-hold', ''); box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      (el.querySelector('.ld-steps') || count).before(box);
    }
    el.classList.add('ld-holding');
    box.innerHTML = `<span class="ld-hold-ic">${ICON.play}</span><span><b>${esc(name)} kabul etti!</b><small>${h.ad
      ? 'Hakkı bitmişti, şimdi reklam izliyor. Bitince düello hemen başlayacak, lütfen bekle.'
      : 'Hazırlanıyor, birazdan başlıyor…'}</small></span>`;
    const h2 = el.querySelector('h2'); if (h2) h2.textContent = h.ad ? name + ' reklam izliyor…' : name + ' kabul etti!';
    const sub = el.querySelector('.ld-search-sub'); if (sub) sub.textContent = 'Bekle, düello birazdan başlıyor.';
    const steps = el.querySelector('.ld-steps'); if (steps) steps.hidden = true;
    if (h.ad && !warned) { warned = true; sfx('kombo'); }
    const until = Date.now() + Math.max(0, Number(h.leftMs) || 0);
    const adUntil=h.ad&&h.adLeftMs!=null?Date.now()+Math.max(0,Number(h.adLeftMs)||0):until;
    clearInterval(getClock());
    count.hidden = false;
    const paint = () => { const adLeft=Math.max(0,Math.ceil((adUntil-Date.now())/1000));const sec=adLeft||Math.max(0,Math.ceil((until-Date.now())/1000));count.textContent='0:'+String(sec).padStart(2,'0');if(h.ad&&adLeft===0&&sec>0){if(h2)h2.textContent='Reklam sonucu bekleniyor…';if(sub)sub.textContent='Kısa doğrulama süresi; düello otomatik başlayacak.';} };
    paint(); setClock(setInterval(paint, 250));
  }
  return {show, ended: () => ({name: endedName, reason: endedReason})};
}
// Sunucuyu planlı aralıklarla sorar; rakip reklam izliyorsa 4 sn'de bir (en fazla ~45 sn) sormaya devam eder.
async function waitMatch(id, owner, schedule, isStop, onHold) {
  const t0=Date.now(),hardEnd=t0+SEARCH_MS+20000+(HOLD_WAIT_S+VERIFY_GRACE_S)*1000+12000;
  let i=0,holding=false,pending=false,wake=null,lastPoll=0;
  const signal={id,pulse(h){if(h&&!h.end&&!h.matched)holding=true;pending=true;wake?.();}};
  waitSignal=signal;
  function pause(ms){return new Promise(resolve=>{let t;const done=()=>{clearTimeout(t);wake=null;resolve();};wake=done;t=setTimeout(done,Math.max(0,ms));if(pending)done();});}
  try{
    while(Date.now()<hardEnd){
      let wait;
      if(pending)wait=0;
      else if(holding)wait=4000;
      else if(i<schedule.length)wait=schedule[i++]-(Date.now()-t0);
      else return null;
      if(wait>0)await pause(wait);
      if(isStop()||token()!==owner)return null;
      if(Date.now()-lastPoll<500)await sleep(500-(Date.now()-lastPoll));
      pending=false;lastPoll=Date.now();
      // Realtime is a wake-up hint only. The authenticated server response is authoritative.
      const p=await rpc('dm_duel_live_poll',{p_duel:id},owner,4500).catch(()=>null);
      if(isStop()||token()!==owner)return null;
      if(!p?.ok)continue;
      if(p.status==='matched')return p;
      if(p.expired||p.status==='cancelled'){if(holding)onHold({end:true,silent:true,name:p.heldBy||'Rakibin',reason:'ad'});return p;}
      if(p.hold){holding=true;onHold(p.hold);continue;}
      if(holding){holding=false;onHold({end:true,silent:true});}
    }
    return null;
  }finally{if(waitSignal===signal)waitSignal=null;}
}

/* ---------- Canlı Düello: rakip arama ---------- */
let searching = null;
async function startLive(options) {
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
  const hv = hostHoldView(el, count, () => clock, c => { clock = c; });
  let holdTaken = false;
  const onHold = h => { if (stop) return; if (!h.end && !holdTaken && duel?.id) { holdTaken = true; lobbySend('taken', {id: duel.id}); } hv.show(h); };
  async function cancel() {
    if (stop) return; stop = true; clearInterval(clock); holdListener = null;
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
    const d = options?.team ? await startRpc('live',owner) : await rpc('dm_duel_live_search', {}, owner);
    if (stop) return;
    if (d.paywall) { inDuel = false; searching = null; closeLayer(); return paywall('live', d.message, () => startLive(options)); }
    if (!d.ok) throw Error(d.message || 'Düello başlatılamadı.');
    duel = d; rights = null;
    if (d.status === 'matched') { searching = null;void lobbySend('matched',{id:d.id});return startMatch(d); }
    t0 = Date.now();
    holdListener = h => { if (h?.id === d.id) onHold(h); };
    if (d.broadcast) lobbySend('seek', {id: d.id, name: who(), level: d.level || 1, at: Date.now()});
    clock = setInterval(() => { const s = Math.max(0, Math.ceil((SEARCH_MS - (Date.now() - t0)) / 1000)); count.textContent = '0:' + String(s).padStart(2, '0'); }, 250);
    const p = await waitMatch(d.id, owner, [3000, 6000, 9000, 12000, SEARCH_MS + 600, SEARCH_MS + 3000], () => stop, onHold);
    if (stop) return;
    holdListener = null;
    if (p?.ok && p.status === 'matched') {
      clearInterval(clock); searching = null;
      lobbySend('taken', {id: d.id});
      return startMatch(p);
    }
    throw Error('Bağlantı yavaş. Düello başlatılamadı, hakkın geri yüklendi.');
  } catch (e) {
    if (stop) return;
    holdListener = null;
    clearInterval(clock); toast(e.message);
    stop = true; searching = null; inDuel = false;
    if (duel?.id) rpc('dm_duel_live_cancel', {p_duel: duel.id}, owner).catch(() => {});
    closeLayer();
  }
}

/* ---------- Profil kartı: belirli bir oyuncuya canlı düello daveti [18 Kas 2026] ----------
   Davet yalnız o oyuncuya gider. 15 sn içinde kabul edilmezse oyuncu isterse Papi ile oynar. */
async function invite(target, options) {
  target = String(target || '').trim();
  if (inDuel || !target) return;
  if (!token()) return toast('Düello için öğrenci hesabına giriş yapmalısın.');
  if (norm(target) === norm(who())) return toast('Kendinle düello yapamazsın.');
  inDuel = true;
  const owner = token();
  const el = openLayer('ld-search ld-invite-wait', `
    <div class="ld-search-top"><span class="ld-kicker">DÜELLO DAVETİ</span></div>
    <div class="ld-radar" aria-hidden="true"><span></span><span></span><span></span><img src="${PAPI}" alt=""></div>
    <h2 data-title>${esc(target)} bekleniyor…</h2>
    <p class="ld-search-sub" data-sub>${esc(target)} adlı oyuncuya davet gönderiliyor…</p>
    <div class="ld-count" aria-live="off">0:15</div>
    <ul class="ld-steps"><li class="ld-done">10 soruluk canlı kelime savaşı</li><li>15 sn içinde yanıt gelmezse istersen Papi ile oynarsın</li></ul>
    <div class="ld-invite-choices" data-choices hidden>
      <button type="button" class="ld-primary" data-papi>Papi ile Oyna</button>
    </div>
    <button type="button" class="ld-ghost" data-cancel>Daveti İptal Et</button>
    <small class="ld-foot" data-foot>İptal edersen düello hakkın geri gelir.</small>`, () => cancel());
  const count = el.querySelector('.ld-count');
  let stop = false, duel = null, t0 = Date.now(), clock = null, expired = false;
  const hv = hostHoldView(el, count, () => clock, c => { clock = c; });
  const onHold = h => { if (!stop && !expired) hv.show(h); };
  async function cancel() {
    if (stop) return; stop = true; clearInterval(clock); holdListener = null;
    if (duel?.id) {
      try {
        const d = await rpc('dm_duel_live_cancel', {p_duel: duel.id}, owner);
        lobbySend('taken', {id: duel.id});
        if (d.cancelled === false && d.status === 'matched') { searching = null; return startMatch(d); }
      } catch {}
    }
    searching = null; inDuel = false; rights = null; closeLayer();
  }
  function showExpired() {
    if (stop || expired) return; expired = true; clearInterval(clock); holdListener = null;
    lobbySend('taken', {id: duel.id});
    el.querySelector('[data-hold]')?.remove(); el.classList.remove('ld-holding');
    el.querySelector('.ld-radar')?.classList.add('ld-radar-idle');
    const gone = hv.ended();
    el.querySelector('[data-title]').textContent = gone.name
      ? (gone.reason === 'ad' ? gone.name + ' reklamı tamamlamadı' : gone.name + ' gelemedi')
      : target + ' yanıt vermedi';
    el.querySelector('[data-sub]').textContent = 'İstersen aynı sorularla Papi ile kapışabilirsin.';
    count.hidden = true; el.querySelector('.ld-steps').hidden = true;
    el.querySelector('[data-choices]').hidden = false;
    el.querySelector('[data-cancel]').textContent = 'Kapat';
    el.querySelector('[data-foot]').textContent = 'Kapatırsan düello hakkın geri gelir.';
    el.querySelector('[data-papi]').focus({preventScroll: true});
  }
  el.querySelector('[data-cancel]').onclick = cancel;
  el.querySelector('[data-papi]').onclick = async e => {
    const btn = e.currentTarget; if (stop || !duel?.id) return; btn.disabled = true;
    try {
      const d = await rpc('dm_duel_live_to_papi', {p_duel: duel.id}, owner);
      if (stop) return;
      if (d.paywall) { stop = true; searching = null; inDuel = false; closeLayer(); return paywall('live', d.message, () => invite(target)); }
      if (!d.ok) throw Error(d.message || 'Düello başlatılamadı.');
      stop = true; searching = null; rights = null;
      startMatch(d);
    } catch (err) { btn.disabled = false; toast(err.message); }
  };
  searching = {cancel};
  try {
    const d = options?.team ? await startRpc('invite',owner,target) : await rpc('dm_duel_live_invite', {p_target: target}, owner);
    if (stop) return;
    if (d.paywall) { inDuel = false; searching = null; closeLayer(); return paywall('live', d.message, () => invite(target)); }
    if (!d.ok) throw Error(d.message || 'Davet gönderilemedi.');
    duel = d; rights = null; t0 = Date.now();
    holdListener = h => { if (h?.id === d.id) onHold(h); };
    const offer = {id: d.id, name: who(), level: d.level || 1, at: Date.now(), to: d.target || target};
    const announce = async () => {
      const sent = await lobbySend('seek', offer);
      if (!stop && !expired && el.isConnected && !hv.ended().name && !el.querySelector('[data-hold]')) {
        el.querySelector('[data-sub]').textContent = sent ? 'Davet yayınlandı; rakibin yanıtı bekleniyor.' : 'Canlı bağlantı bekleniyor…';
      }
    };
    void announce();
    for (const delay of [5000]) setTimeout(() => { if (!stop && !expired && searching && el.isConnected) void announce(); }, delay);
    clock = setInterval(() => { const s = Math.max(0, Math.ceil((SEARCH_MS - (Date.now() - t0)) / 1000)); count.textContent = '0:' + String(s).padStart(2, '0'); }, 250);
    const p = await waitMatch(d.id, owner, [4000, 8000, 12000, SEARCH_MS + 600, SEARCH_MS + 3000], () => stop, onHold);
    if (stop) return;
    holdListener = null;
    if (p?.ok && p.status === 'matched') {
      clearInterval(clock); stop = true; searching = null;
      lobbySend('taken', {id: d.id});
      return startMatch(p);
    }
    showExpired();
  } catch (e) {
    if (stop) return;
    holdListener = null;
    clearInterval(clock); toast(e.message);
    stop = true; searching = null; inDuel = false;
    if (duel?.id) rpc('dm_duel_live_cancel', {p_duel: duel.id}, owner).catch(() => {});
    closeLayer();
  }
}

/* ---------- Papi'ye Karşı ---------- */
async function startPapi(options) {
  if (inDuel) return;
  if (!token()) return toast('Düello için öğrenci hesabına giriş yapmalısın.');
  inDuel = true;
  try {
    const d = options?.team ? await startRpc('papi',token()) : await rpc('dm_duel_papi_start');
    if (d.paywall) { inDuel = false; return paywall('papi', d.message, () => startPapi(options)); }
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
  if (!Array.isArray(d.questions) || ![6, 10].includes(d.questions.length)) { inDuel = false; closeLayer(); return toast('Düello soruları alınamadı. Tekrar dene.'); }
  const opp = d.vsPapi ? 'Papi' : (d.opponent || 'Rakip');
  const owner=token();
  const el = openLayer('ld-vs', `
    ${d.vsPapi?`<button type="button" class="ld-vs-cancel" data-papi-cancel aria-label="Düelloyu iptal et">${ICON.close}<span>İptal</span></button>`:''}
    <span class="ld-kicker">${d.vsPapi && d.kind === 'live' ? 'ŞU AN KİMSE MÜSAİT DEĞİL · PAPİ SENİNLE KAPIŞIYOR!' : 'RAKİP BULUNDU!'}</span>
    <div class="ld-vs-row">
      <div class="ld-vs-p">${avatarHtml(who(), 'ld-me')}<b>Sen</b></div>
      <span class="ld-vs-badge">VS</span>
      <div class="ld-vs-p">${avatarHtml(opp, 'ld-them')}<b>${esc(opp)}</b>${d.opponentLevel ? `<small>Sv. ${esc(d.opponentLevel)}</small>` : ''}</div>
    </div>
    <div class="ld-facts"><div><b>${d.questions.length}</b><span>soru</span></div><div><b>100</b><span>can</span></div><div><b>x2</b><span>final</span></div></div>
    <div class="ld-go"><span>Başlıyor</span><b data-n>3</b></div>
    <p class="ld-vs-note">Doğru ve hızlı cevap rakibinin canını azaltır. Son soru 2 kat hasar verir.</p>`, () => {if(d.vsPapi)void cancelPapi();});
  const n=el.querySelector('[data-n]'), button=el.querySelector('[data-papi-cancel]');
  const deadline=d.vsPapi?Date.now()+3000:Number.isFinite(d.clientStartAt)?d.clientStartAt:Date.now()+3000;
  let t=null,cancelling=false,finished=false;
  const paint=()=>{if(finished||cancelling)return;if(layer!==el||token()!==owner){clearInterval(t);return;}const left=Math.ceil((deadline-Date.now())/1000);if(left<=0){finished=true;clearInterval(t);return battle(d,opp);}const label=left>3?'…':String(left);if(n.textContent!==label){n.textContent=label;n.classList?.remove('ld-pop');void n.offsetWidth;n.classList?.add('ld-pop');}};
  async function cancelPapi(){
    if(!d.vsPapi||finished||cancelling||layer!==el)return;cancelling=true;clearInterval(t);if(button)button.disabled=true;
    try{const res=await rpc('dm_duel_papi_cancel',{p_duel:d.id},owner,3500).catch(()=>rpc('dm_duel_papi_cancel',{p_duel:d.id},owner,3500));if(!res?.ok||!res.cancelled)throw Error(res?.message||'Düello iptal edilemedi.');if(layer!==el||token()!==owner)return;finished=true;rights=null;inDuel=false;closeLayer();toast('Düello iptal edildi. Hakkın korundu.');}
    catch(e){if(layer===el&&token()===owner){toast(e.message);cancelling=false;if(button)button.disabled=false;t=setInterval(paint,200);paint();}}
  }
  if(button)button.onclick=cancelPapi;
  t=setInterval(paint,200);paint();
}

/* ---------- Savaş paneli ---------- */
// Sunucudaki dm_private.duel_score ile aynı: 10 soruda 8 + hız bonusu (en fazla 5), 6 soruda 12 + 8; son soru 2 kat.
const hitFor = (q, i, ms, n) => { const lim = q.lim * 1000, t = Math.min(lim, Math.max(0, ms)); let h = n <= 6 ? 12 + Math.round(8 * (lim - t) / lim) : 8 + Math.round(5 * (lim - t) / lim); if (i === n - 1) h *= 2; return h; };
function battle(d, opp) {
  const owner = token(), me = who();
  const qs = d.questions, answers = [];
  let myHp = 100, oppHp = 100, idx = 0, qStart = 0, timer = null, locked = false, oppChannel = null, quit = false, papiTimers = [];
  const el = openLayer('ld-battle', `
    <header class="ld-bhead">
      <button type="button" class="ld-x" data-quit aria-label="Düellodan çık">${ICON.close}</button>
      <span class="ld-kicker">${d.vsPapi ? "PAPİ'YE KARŞI" : 'CANLI DÜELLO'}</span>
      <span class="ld-round" data-round>Tur 1/${qs.length}</span>
    </header>
    <div class="ld-fighters">
      <div class="ld-f">${avatarHtml(me, 'ld-me ld-sm')}<div class="ld-fcopy"><b>Sen</b><div class="ld-hp" data-myhp><i></i></div><small data-myn>100 can</small></div></div>
      <span class="ld-vs-mini">VS</span>
      <div class="ld-f ld-f-r">${avatarHtml(opp, 'ld-them ld-sm')}<div class="ld-fcopy"><b>${esc(opp)}</b><div class="ld-hp ld-hp-r" data-opphp><i></i></div><small data-oppn>100 can</small></div><span class="ld-dmg" data-oppdmg></span></div>
      <span class="ld-dmg ld-dmg-me" data-mydmg></span>
    </div>
    <div class="ld-dots" data-dots>${qs.map((_, i) => `<span class="${i === qs.length - 1 ? 'ld-dot-final' : ''}"></span>`).join('')}</div>
    <section class="ld-card">
      <div class="ld-timer"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="23" class="ld-tr"/><circle cx="28" cy="28" r="23" class="ld-tf" data-ring/></svg><b data-sec>10</b></div>
      <span class="ld-qtype" data-type></span>
      <p class="ld-q" data-q></p>
      <span class="ld-opp-flag" data-flag hidden>${ICON.bolt}<span>${esc(opp)} cevapladı</span></span>
    </section>
    <div class="ld-opts" data-opts></div>
    <div class="ld-tip"><img src="${PAPI}" alt=""><span><b>Hızlı ol!</b> Doğru cevap rakibe ${qs.length <= 6 ? '12–20' : '8–13'} hasar verir. ${qs.length}. soru <b>Final: 2 kat hasar.</b></span></div>`, () => askQuit());
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
      papiTimers.push(setTimeout(() => { if (quit) return; flag(); if (a.c === qs[i].a) hitMe(hitFor(qs[i], i, a.ms, qs.length)); }, at));
    });
  } else if (window.supabaseClient?.channel) {
    oppChannel = window.supabaseClient.channel('dm-duel-' + d.id, {config: {broadcast: {self: false}}});
    oppChannel.on('broadcast', {event: 'ans'}, ({payload}) => {
      if (quit || !payload || payload.side === d.side) return;
      const i = Number(payload.i); if (!(i >= 0 && i < qs.length)) return;
      flag();
      if (payload.ok) hitMe(hitFor(qs[i], i, Number(payload.ms) || qs[i].lim * 1000, qs.length));
    }).subscribe();
  }
  function show() {
    const q = qs[idx];
    locked = false;
    $('[data-round]').textContent = 'Tur ' + (idx + 1) + '/' + qs.length;
    el.querySelectorAll('[data-dots] span').forEach((s, i) => s.classList.toggle('ld-now', i === idx));
    $('[data-type]').textContent = q.t === 'final' ? TYPE_LABEL.final : (q.ask === 'meaning' ? TYPE_LABEL.meaning : TYPE_LABEL[q.t] || '');
    const p = esc(q.p).replace('___', '<span class="ld-blank">___</span>');
    $('[data-q]').innerHTML = q.t === 'meaning' || (q.t === 'final' && q.ask === 'meaning') ? `“${p}”` : p;
    el.classList.toggle('ld-is-final', idx === qs.length - 1);
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
    if (ok) hitOpp(hitFor(q, idx, ms, qs.length));
    oppChannel?.send({type: 'broadcast', event: 'ans', payload: {side: d.side, i: idx, ok, ms}}).catch(() => {});
    setTimeout(() => { if (quit) return; idx++; if (idx < qs.length) show(); else finish(); }, 1100);
  }
  function askQuit() {
    if (quit) return;
    const box = document.createElement('div');
    box.className = 'ld-confirm';
    box.innerHTML = '<div><b>Düellodan çıkılsın mı?</b><p>Çıkarsan kalan sorular boş sayılır ve düello hakkın geri gelmez.</p><div><button type="button" data-stay>Devam et</button><button type="button" data-leave>Çık</button></div></div>';
    el.append(box);
    box.querySelector('[data-stay]').onclick = () => box.remove();
    box.querySelector('[data-leave]').onclick = () => { box.remove(); for (let i = idx; i < qs.length; i++) if (!answers[i]) answers[i] = {c: -1, ms: qs[i].lim * 1000}; locked = true; clearInterval(timer); finish(); };
  }
  $('[data-quit]').onclick = askQuit;
  async function finish() {
    quit = true; clearInterval(timer); papiTimers.forEach(clearTimeout);
    for (let i = 0; i < qs.length; i++) if (!answers[i]) answers[i] = {c: -1, ms: qs[i].lim * 1000};
    const wait = openLayer('ld-wait', `<img src="${PAPI}" alt="" class="ld-wait-papi"><h2>Sonuçlar hesaplanıyor…</h2><p data-w>${d.vsPapi ? '' : esc(opp) + ' bitirmeyi bekliyoruz.'}</p>`, () => {});
    let r = null;
    try {
      for (let i = 0; i < 4 && !r; i++) { r = await rpc('dm_duel_finish', {p_duel: d.id, p_answers: answers}, owner).catch(() => null); if (!r) await sleep(1500); }
      if (!r?.ok) throw Error(r?.message || 'Sonuç kaydedilemedi.');
      const until = Date.now() + 20000;
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
  let enrolled = false;
  const win = r.outcome === 'win', draw = r.outcome === 'draw';
  const me = r.me || {}, them = r.them || {};
  const title = win ? 'ZAFER!' : draw ? 'BERABERE!' : 'YENİLGİ';
  const sub = win ? (Number(them.hp) === 0 ? 'Nakavt! ' : '') + esc(opp) + ' yenildi.' : draw ? 'Çok çekişmeliydi!' : (opp === 'Papi' ? 'Papi bu kez kazandı. Rövanş?' : esc(opp) + ' bu kez kazandı. Rövanş?');
  const total = Number(me.total) || d.questions?.length || 10;
  const avg = me.correct ? (Number(me.ms || 0) / total / 1000).toFixed(1) : '-';
  const el = openLayer('ld-result' + (win ? ' ld-win' : ''), `
    ${win ? `<i class="ld-sp" style="left:14%;top:12%">${ICON.star}</i><i class="ld-sp" style="right:14%;top:18%;animation-delay:.7s">${ICON.star}</i><i class="ld-sp ld-sp-s" style="left:24%;top:30%;animation-delay:1.3s">${ICON.star}</i>` : ''}
    <span class="ld-kicker">${d.vsPapi ? "PAPİ'YE KARŞI" : 'CANLI DÜELLO'} BİTTİ</span>
    <h2 class="ld-title">${title}</h2>
    <p class="ld-sub">${sub}</p>
    <img class="ld-result-papi" src="${PAPI}" alt="">
    <div class="ld-hpline"><span>Sen <b class="ld-g">${Number(me.hp ?? 0)} can</b></span><span>${esc(opp)} <b class="ld-r">${Number(them.hp ?? 0)} can</b></span></div>
    <div class="ld-stats"><div><b>${Number(me.correct || 0)}/${total}</b><span>doğru</span></div><div><b>${avg}${avg === '-' ? '' : ' sn'}</b><span>ort. süre</span></div><div><b>${Number(me.damage || 0)}</b><span>hasar</span></div></div>
    ${Number(me.xp || 0) > 0 ? `<div class="ld-stats ld-reward"><div><b>+${Number(me.xp || 0)} XP</b><span>kazandın</span></div><div><b>+${Number(me.gold || 0)}</b><span>altın</span></div></div>` : `<p class="ld-sub">Bu kez ödül yok. Kazanırsan <b>300 XP + 50 altın</b>!</p>`}
    <p class="ld-sub" data-team-credit hidden></p>
    <button type="button" class="ld-primary" data-again>${d.kind === 'papi' ? 'Papi ile Rövanş' : 'Rövanş yap'}</button>
    <button type="button" class="ld-ghost" data-close>Kapat</button>`, () => done());
  if(window.dmTeam)void rpc('dm_team_duel_credit',{p_duel:d.id}).then(credit=>{
    enrolled=credit.enrolled===true;
    if(!credit.points||!el.isConnected)return;
    const message=el.querySelector('[data-team-credit]');
    message.hidden=false;message.textContent='Takımına +'+credit.points+' puan';
    void window.dmTeam.load(true);
  }).catch(()=>{});
  sfx(win ? 'kombo' : draw ? 'dogru' : 'yanlis');
  function done() { inDuel = false; closeLayer(); inboxAfter = 0; void checkInbox(); }
  el.querySelector('[data-close]').onclick = done;
  el.querySelector('[data-again]').onclick = () => { inDuel = false; closeLayer(); const options={team:enrolled};d.kind==='papi'?startPapi(options):opp&&opp!=='Rakibin'?invite(opp,options):startLive(options); };
}

/* ---------- Başlatma ---------- */
function boot() {
  if (token()) { ensureLobby(); void checkInbox(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { dropLobby(); hideBanner(); } else boot(); });
document.addEventListener('dm:login', () => { rights = null; dropLobby(); setTimeout(boot, 1500); });
setInterval(() => { if (lobbyOwner && lobbyOwner !== token()) { dropLobby(); rights = null; } boot(); }, 3000);
setTimeout(boot, 4000);

async function openResult(id){if(inDuel)return;try{const r=await rpc('dm_duel_result',{p_duel:id});if(!r.ok||r.status!=='finished')return toast(r.message||'Sonuç henüz hazır değil.');result(r,r.opponent||'Rakibin',r);}catch(e){toast(e.message);}}
async function openInvite(id,opponent){if(inDuel)return;try{const r=await rpc('dm_duel_inbox');if(r?.ok&&r.offer?.id===id&&r.offer.leftMs>500){seenOffers.delete(id);hideBanner();showBanner({...r.offer,at:Date.now(),deadline:Date.now()+r.offer.leftMs});}else toast('Bu davetin süresi dolmuş. İstersen yeniden düello daveti gönderebilirsin.');}catch(e){toast(e.message);}}
window.dmLiveDuel = {startLive, startPapi, invite, status, paywall};
Object.assign(window.dmLiveDuel,{openResult,openInvite});
})();
