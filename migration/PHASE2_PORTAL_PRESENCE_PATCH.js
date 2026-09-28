/**
 * Diji-Medu Phase 2 — PORTAL PRESENCE PATCH
 *
 * Add this block before </body> in index.html.
 * It uses the existing authenticated portal request path; it never contains
 * the Supabase shadow secret.
 */
(function () {
  'use strict';
  var PRESENCE_KEY = 'dijimedu_presence_v1';
  var INTERVAL = 30000;

  function student() {
    try {
      if (typeof aktifKayitliOgrenci !== 'undefined' && aktifKayitliOgrenci) {
        return String(aktifKayitliOgrenci);
      }
    } catch (e) {}
    try {
      var v = localStorage.getItem('dijimuallim_aktif_ogrenci');
      return v ? atob(v) : '';
    } catch (e2) { return ''; }
  }

  function presenceId() {
    try {
      var v = sessionStorage.getItem(PRESENCE_KEY);
      if (v) return v;
      v = (crypto && crypto.randomUUID) ? crypto.randomUUID() :
        ('p-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      sessionStorage.setItem(PRESENCE_KEY, v);
      return v;
    } catch (e) { return 'p-' + Date.now(); }
  }

  function send(state) {
    var s = student();
    if (!s || typeof SCRIPT_URL === 'undefined' || !SCRIPT_URL) return;
    try {
      /*
       * IMPORTANT: this call must include the same auth token field used by
       * the portal's existing Apps Script requests. Do not add a new token
       * or expose DIJI_REALTIME_SHADOW_SECRET.
       *
       * The integration patch routes islem=dijiPresence through the existing
       * security gateway.
       */
      var payload = {
        islem: 'dijiPresence',
        ogrenci: s,
        presenceId: presenceId(),
        state: state
      };
      if (typeof token !== 'undefined' && token) payload.token = token;
      else if (typeof oturumToken !== 'undefined' && oturumToken) payload.token = oturumToken;

      fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function(){});
    } catch (e) {}
  }

  document.addEventListener('visibilitychange', function () {
    send(document.visibilityState === 'visible' ? 'online' : 'offline');
  });
  window.addEventListener('pagehide', function () { send('offline'); });

  send('online');
  setInterval(function () {
    if (document.visibilityState === 'visible') send('online');
  }, INTERVAL);
})();
