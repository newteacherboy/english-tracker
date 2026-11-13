/* Parkurda kalıcı, ödülsüz bildirim daveti. Yalnız cihazdaki gerçek izin kartı kaldırır. */
(function () {
  'use strict';
  var C = window.Capacitor, service = null, kind = '', permission = '', busy = false, checking = false, queued = false;
  try {
    if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
    for (var name of ['PushNotifications', 'LocalNotifications']) {
      if (C.isPluginAvailable && C.isPluginAvailable(name)) {
        service = C.Plugins && C.Plugins[name] || C.registerPlugin(name);
        kind = name; break;
      }
    }
  } catch (_) { return; }
  if (!service) return;
  var platform = C.getPlatform(), help = false;
  function state(p) { return String(p && (kind === 'PushNotifications' ? p.receive : p.display) || ''); }
  function helpText() {
    return platform === 'ios'
      ? 'iPhone Ayarlar → Bildirimler → Diji-Medu → Bildirimlere İzin Ver seçeneğini aç.'
      : 'Telefon Ayarları → Uygulamalar → Diji-Medu → Bildirimler bölümünden bildirimlere izin ver.';
  }
  function paint() {
    var headers = document.querySelectorAll('#tab-dunya .rt-medal-header');
    headers.forEach(function (header) {
      var card = header.querySelector('.dm-notification-card');
      if (!permission || permission === 'granted') { if (card) card.remove(); return; }
      if (!card) {
        card = document.createElement('aside');
        card.className = 'dm-notification-card';
        card.setAttribute('aria-label', 'Bildirimleri aç');
        card.innerHTML = '<div class="dm-npc-art" aria-hidden="true"><img src="discovery-assets/papi-mektup.webp" alt=""><span>🔔</span></div>' +
          '<div class="dm-npc-copy"><strong>Papi sana haber versin!</strong><p>Görevlerini ve duyuruları kaçırma.</p></div>' +
          '<button type="button" class="dm-npc-allow">İzin ver</button><p class="dm-npc-help" role="status" hidden></p>';
        var unit = header.querySelector('.rt-medal-unit');
        if (unit) unit.after(card); else header.prepend(card);
        card.querySelector('button').onclick = allow;
      }
      var button = card.querySelector('button'), note = card.querySelector('.dm-npc-help');
      button.disabled = busy;
      button.textContent = busy ? 'Bekle…' : 'İzin ver';
      button.setAttribute('aria-expanded', String(help));
      note.hidden = !help;
      if (help) note.textContent = helpText();
    });
  }
  async function refresh() {
    if (checking || busy || document.hidden) return;
    checking = true;
    try { permission = state(await service.checkPermissions()); }
    catch (_) { /* Geçici köprü hatası mevcut kartı veya izin durumunu değiştirmez. */ }
    finally { checking = false; paint(); }
  }
  async function enabled() {
    // Var olan push katmanı cihaz jetonunu ve hesap bağını yönetir; yeni bir ödül/API yok.
    if (kind === 'PushNotifications') await window.dmAndroidPush?.sync?.();
    else window.dmIosEnableReminders?.();
  }
  async function allow() {
    if (busy) return;
    busy = true; help = false; paint();
    try {
      permission = state(await service.checkPermissions());
      if (/^prompt/.test(permission)) permission = state(await service.requestPermissions());
      if (permission === 'granted') {
        paint();
        try { await enabled(); } catch (_) {}
      } else { help = true; }
    } catch (_) { help = true; }
    finally { busy = false; paint(); }
  }
  function schedule() {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; paint(); });
  }
  function start() {
    // Parkur yeniden çizildiğinde aynı izin durumuyla kartı tekrar yerleştir; sunucuya istek atılmaz.
    new MutationObserver(function (records) {
      if (records.some(function (r) { return Array.from(r.addedNodes).some(function (n) {
        return n.nodeType === 1 && (n.matches('.rt-medal-header') || n.querySelector('.rt-medal-header'));
      }); })) schedule();
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) void refresh(); });
    document.addEventListener('dm:login', function () { void refresh(); });
    window.addEventListener('focus', function () { void refresh(); });
    try {
      var app = C.Plugins && C.Plugins.App || C.registerPlugin('App');
      Promise.resolve(app.addListener('appStateChange', function (s) {
        if (s.isActive) void refresh().then(function () { if (permission === 'granted') void enabled(); });
      })).catch(function () {});
    } catch (_) {}
    // Başka bir izin ekranı açıkken verilen izni de algıla; yalnız görünür parkurda cihaz sorgusu.
    setInterval(function () {
      if (permission !== 'granted' && !document.hidden && document.querySelector('#tab-dunya.active .rt-medal-header')) void refresh();
    }, 10000);
    void refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
