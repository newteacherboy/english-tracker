/* Diji Medu · iOS uygulama köprüsü (Capacitor).
   Yalnızca App Store uygulamasının içinde çalışır; tarayıcıda ve Play Store (TWA) sürümünde hiçbir şey yapmaz.
   - Titreşim: navigator.vibrate iPhone'da yok → mevcut tüm çağrılar native titreşime yönlendirilir.
   - Seri hatırlatıcısı: izin verilirse her akşam 19:00'da yerel bildirim (sunucu/Supabase kullanmaz).
   - Bağlantı koptuğunda üstte bilgi bandı.
   - Uygulama içinde mağaza linkleri gizlenir. */
(function () {
  'use strict';
  var C = window.Capacitor;
  var native = false;
  try { native = !!(C && C.isNativePlatform && C.isNativePlatform()); } catch (_) {}
  window.dmIosUygulama = native && C.getPlatform && C.getPlatform() === 'ios';
  window.dmNativeUygulama = native;
  if (!native) return;

  document.documentElement.classList.add('dm-native-app');

  function plugin(name) {
    try { return (C.Plugins && C.Plugins[name]) || (C.registerPlugin && C.registerPlugin(name)) || null; } catch (_) { return null; }
  }
  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch (_) {}
    return null;
  }

  /* ---------- Gizlenecekler ---------- */
  var style = document.createElement('style');
  style.textContent =
    '.dm-native-app a[href*="play.google.com"],.dm-native-app a[href*="apps.apple.com"],' +
    '.dm-native-app [data-store-link]{display:none!important}' +
    '#dmNetBand{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:2147483000;' +
    'padding:10px 14px;border-radius:12px;background:#2b2f33;color:#fff;font:600 14px/1.35 -apple-system,system-ui,sans-serif;' +
    'text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25);transform:translateY(-140%);transition:transform .25s ease}' +
    '#dmNetBand.on{transform:none}';
  (document.head || document.documentElement).appendChild(style);

  /* ---------- Titreşim ---------- */
  var Haptics = plugin('Haptics');
  if (Haptics) {
    var last = 0;
    var vibrate = function (pattern) {
      var now = Date.now();
      if (now - last < 60) return true;
      last = now;
      try {
        if (Array.isArray(pattern) && pattern.length > 1) {
          var same = pattern.every(function (v) { return v === pattern[0]; });
          Haptics.notification({ type: same ? 'ERROR' : 'SUCCESS' });
        } else {
          var ms = Array.isArray(pattern) ? pattern[0] : pattern;
          if (!ms) return true;
          Haptics.impact({ style: ms <= 20 ? 'LIGHT' : 'MEDIUM' });
        }
      } catch (_) {}
      return true;
    };
    try { Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true }); }
    catch (_) { try { navigator.vibrate = vibrate; } catch (__) {} }
  }

  /* ---------- Bağlantı bandı ---------- */
  var Network = plugin('Network');
  var band = null;
  function setOnline(connected) {
    if (!band) {
      if (connected) return;
      band = document.createElement('div');
      band.id = 'dmNetBand';
      band.setAttribute('role', 'status');
      band.textContent = 'İnternet bağlantısı koptu. Bağlantı gelince kaldığın yerden devam edebilirsin.';
      document.body.appendChild(band);
      void band.offsetWidth;
    }
    band.classList.toggle('on', !connected);
  }
  function watchNetwork() {
    if (Network) {
      try {
        Network.addListener('networkStatusChange', function (s) { setOnline(!!s.connected); });
        Network.getStatus().then(function (s) { setOnline(!!s.connected); }).catch(function () {});
        return;
      } catch (_) {}
    }
    window.addEventListener('offline', function () { setOnline(false); });
    window.addEventListener('online', function () { setOnline(true); });
  }

  /* ---------- Seri hatırlatıcısı ---------- */
  var Notes = plugin('LocalNotifications');
  var PREF = 'dm_ios_hatirlatici';          // 'acik' | 'kapali'
  var IDS = [7101, 7102, 7103, 7104, 7105, 7106, 7107];
  var HOUR = 19;
  var MESSAGES = [
    ['Papi seni bekliyor 🦜', 'Serini korumak için bugün kısa bir ders yeter!'],
    ['Bugünkü İngilizcen hazır ✨', 'Birkaç dakikalık bir parkur seni bekliyor.'],
    ['Serin tehlikede! 🔥', 'Bugün bir ders yap, serin devam etsin.'],
    ['Hello! 👋', 'Papi bugün yeni kelimeler öğrenmek istiyor. Hadi gel!'],
    ['Altın kazanma zamanı 🪙', 'Kısa bir oyun ya da ders ile bugünü tamamla.']
  ];

  function reschedule() {
    if (!Notes || store(PREF) !== 'acik') return;
    Notes.checkPermissions().then(function (p) {
      if (!p || p.display !== 'granted') return;
      // Bugün uygulama açıldı → bugünün hatırlatması gerekmez; yarından itibaren 7 gün planla.
      return Notes.cancel({ notifications: IDS.map(function (id) { return { id: id }; }) }).catch(function () {}).then(function () {
        var list = IDS.map(function (id, i) {
          var at = new Date();
          at.setDate(at.getDate() + i + 1);
          at.setHours(HOUR, 0, 0, 0);
          var m = MESSAGES[(at.getDate() + i) % MESSAGES.length];
          return { id: id, title: m[0], body: m[1], schedule: { at: at, allowWhileIdle: true } };
        });
        return Notes.schedule({ notifications: list });
      });
    }).catch(function () {});
  }

  /* Hatırlatıcı kartı: uygulamanın stilleri bozmasın diye Shadow DOM içinde. */
  var CARD_CSS =
    ':host{all:initial}' +
    '*{box-sizing:border-box;margin:0}' +
    '.bg{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
    'padding:24px 18px calc(24px + env(safe-area-inset-bottom,0px));background:rgba(14,38,34,.42);' +
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:fade .25s ease both;' +
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,Arial,sans-serif;-webkit-tap-highlight-color:transparent}' +
    '.bg.out{animation:fade .2s ease reverse both}' +
    '.card{position:relative;width:100%;max-width:350px;padding:84px 22px 16px;border-radius:30px;text-align:center;' +
    'background:linear-gradient(180deg,#E3F5EE 0,#F7FCFA 42%,#fff 100%);color:#12343B;' +
    'box-shadow:0 24px 60px rgba(8,40,32,.30),inset 0 0 0 1px rgba(29,158,117,.10);animation:pop .42s cubic-bezier(.2,1.3,.4,1) both}' +
    '.papi{position:absolute;left:50%;top:-58px;width:178px;margin-left:-89px;filter:drop-shadow(0 10px 14px rgba(8,60,50,.22));' +
    'animation:float 3.2s ease-in-out infinite;pointer-events:none}' +
    'h2{font-size:22px;line-height:1.2;font-weight:800;letter-spacing:-.2px;color:#12343B}' +
    '.sub{margin-top:6px;font-size:15px;line-height:1.4;color:#4E6A6F}' +
    '.note{display:flex;gap:11px;align-items:center;margin:18px 0 6px;padding:11px 12px;border-radius:18px;text-align:left;' +
    'background:rgba(255,255,255,.92);box-shadow:0 8px 22px rgba(18,52,59,.12),0 0 0 1px rgba(18,52,59,.06);' +
    'animation:slide .5s .25s cubic-bezier(.2,1.2,.4,1) both}' +
    '.note img{flex:none;width:38px;height:38px;border-radius:10px}' +
    '.note div{min-width:0;flex:1}' +
    '.meta{display:flex;justify-content:space-between;font-size:11.5px;font-weight:600;color:#8A9A9D;text-transform:uppercase;letter-spacing:.3px}' +
    '.note b{display:block;margin-top:2px;font-size:14.5px;color:#12343B}' +
    '.note span.t{display:block;font-size:13.5px;line-height:1.3;color:#3E5559}' +
    '.quiet{font-size:12.5px;color:#7A8D90;margin-bottom:18px}' +
    'button{display:block;width:100%;border:0;outline:0;font:inherit;cursor:pointer;touch-action:manipulation}' +
    'button:focus-visible{outline:3px solid rgba(29,158,117,.45);outline-offset:3px}' +
    '.ok{min-height:54px;border-radius:17px;font-size:17px;font-weight:800;color:#fff;' +
    'background:linear-gradient(180deg,#25B585,#1D9E75);box-shadow:0 4px 0 #157A5A,0 10px 20px rgba(29,158,117,.28);' +
    'transition:transform .08s,box-shadow .08s}' +
    '.ok:active{transform:translateY(3px);box-shadow:0 1px 0 #157A5A,0 4px 10px rgba(29,158,117,.25)}' +
    '.no{min-height:46px;margin-top:8px;background:none;font-size:15px;font-weight:600;color:#6B8084}' +
    '@keyframes fade{from{opacity:0}}' +
    '@keyframes pop{from{opacity:0;transform:translateY(24px) scale(.94)}}' +
    '@keyframes slide{from{opacity:0;transform:translateY(-10px) scale(.96)}}' +
    '@keyframes float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}' +
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';

  function openReminderCard(done) {
    var host = document.createElement('div');
    host.id = 'dmRemindHost';
    var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var asset = function (path) { try { return new URL(path, document.baseURI).href; } catch (_) { return path; } };
    shadow.innerHTML = '<style>' + CARD_CSS + '</style>' +
      '<div class="bg"><div class="card" role="dialog" aria-modal="true" aria-labelledby="t">' +
      '<img class="papi" alt="" src="' + asset('discovery-assets/papi-mektup.webp') + '">' +
      '<h2 id="t">Papi sana hatırlatsın mı?</h2>' +
      '<p class="sub">Serini kaybetmemen için her akşam kısa bir not gönderir.</p>' +
      '<div class="note" aria-hidden="true"><img alt="" src="' + asset('papagan-app-icon-512.png') + '">' +
      '<div><span class="meta"><span>Diji Medu</span><span>19:00</span></span>' +
      '<b>Papi seni bekliyor 🦜</b><span class="t">Serini korumak için bugün kısa bir ders yeter!</span></div></div>' +
      '<p class="quiet">O gün ders yaptıysan sessiz kalır.</p>' +
      '<button type="button" class="ok">Evet, hatırlat</button>' +
      '<button type="button" class="no">Şimdi değil</button>' +
      '</div></div>';
    document.body.appendChild(host);
    var bg = shadow.querySelector('.bg');
    var finished = false;
    function close(accepted) {
      if (finished) return;
      finished = true;
      bg.classList.add('out');
      setTimeout(function () { host.remove(); }, 200);
      done(accepted);
    }
    shadow.querySelector('.ok').onclick = function () { close(true); };
    shadow.querySelector('.no').onclick = function () { close(false); };
    bg.addEventListener('click', function (e) { if (e.target === bg) close(false); });
  }

  function loginVisible() {
    var el = document.getElementById('login-container');
    return !!(el && el.offsetParent !== null);
  }

  function offerReminder() {
    if (!Notes || store(PREF) || document.getElementById('dmRemindHost')) return;
    var root = document.documentElement.classList;
    if (root.contains('dm-teacher-portal') || root.contains('dm-teacher-child')) return;
    if (loginVisible() || document.hidden) return;
    Notes.checkPermissions().then(function (p) {
      if (p && p.display === 'granted') { store(PREF, 'acik'); reschedule(); return; }
      if (p && p.display === 'denied') { store(PREF, 'kapali'); return; }
      openReminderCard(function (accepted) {
        if (!accepted) { store(PREF, 'kapali'); return; }
        Notes.requestPermissions().then(function (r) {
          store(PREF, r && r.display === 'granted' ? 'acik' : 'kapali');
          reschedule();
        }).catch(function () { store(PREF, 'kapali'); });
      });
    }).catch(function () {});
  }

  var offerTimer = null;
  function planOffer() {
    if (!Notes || store(PREF)) return;
    clearTimeout(offerTimer);
    offerTimer = setTimeout(offerReminder, 25000);
  }

  function start() {
    watchNetwork();
    reschedule();
    planOffer();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      reschedule();
      planOffer();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
