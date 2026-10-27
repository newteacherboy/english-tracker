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
    '#dmNetBand.on{transform:none}' +
    '#dmRemindSheet{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.35)}' +
    '#dmRemindSheet>div{width:100%;max-width:480px;background:#fff;color:#1f2a2e;border-radius:22px 22px 0 0;' +
    'padding:22px 20px calc(20px + env(safe-area-inset-bottom,0px));font-family:-apple-system,system-ui,sans-serif;text-align:center;' +
    'animation:dmUp .25s ease}' +
    '@keyframes dmUp{from{transform:translateY(100%)}}' +
    '#dmRemindSheet h2{margin:6px 0 8px;font-size:19px}#dmRemindSheet p{margin:0 0 18px;font-size:15px;line-height:1.45;color:#5b6b70}' +
    '#dmRemindSheet button{display:block;width:100%;min-height:50px;border-radius:14px;font:700 16px -apple-system,system-ui,sans-serif;border:0}' +
    '#dmRemindSheet .ok{background:#1D9E75;color:#fff}#dmRemindSheet .no{background:none;color:#5b6b70;margin-top:6px}';
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

  function loginVisible() {
    var el = document.getElementById('login-container');
    return !!(el && el.offsetParent !== null);
  }

  function offerReminder() {
    if (!Notes || store(PREF) || document.getElementById('dmRemindSheet')) return;
    if (loginVisible() || document.hidden) return;
    Notes.checkPermissions().then(function (p) {
      if (p && p.display === 'granted') { store(PREF, 'acik'); reschedule(); return; }
      if (p && p.display === 'denied') { store(PREF, 'kapali'); return; }
      var sheet = document.createElement('div');
      sheet.id = 'dmRemindSheet';
      sheet.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="dmRemindTitle">' +
        '<div style="font-size:44px" aria-hidden="true">🦜🔔</div>' +
        '<h2 id="dmRemindTitle">Papi sana hatırlatsın mı?</h2>' +
        '<p>Serini kaybetmemen için her akşam 19:00\'da kısa bir hatırlatma gönderir. O gün uygulamayı açtıysan rahatsız etmez.</p>' +
        '<button type="button" class="ok">Evet, hatırlat</button>' +
        '<button type="button" class="no">Şimdi değil</button></div>';
      document.body.appendChild(sheet);
      function close() { sheet.remove(); }
      sheet.querySelector('.no').onclick = function () { store(PREF, 'kapali'); close(); };
      sheet.querySelector('.ok').onclick = function () {
        close();
        Notes.requestPermissions().then(function (r) {
          store(PREF, r && r.display === 'granted' ? 'acik' : 'kapali');
          reschedule();
        }).catch(function () { store(PREF, 'kapali'); });
      };
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
