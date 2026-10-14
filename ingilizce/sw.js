/* =====================================================================
   Diji-Medu İngilizce · Service Worker
   Bu dosyayı index.html ile AYNI klasöre yükleyin:  /ingilizce/sw.js
   - Sayfa: önce internetten, yoksa cihazdaki son kopyadan açılır
   - JS / CSS / JSON: önce internet (her zaman güncel), yoksa cihazdaki kopya
   - Görseller ve yazı tipleri: cihazdan (hızlı, internetsiz de çalışır)
   - Supabase istekleri: bu dosya karışmaz (sayfadaki katman yönetir)
   Sayfayı güncellediğinizde SURUM değerini artırın (v2, v3…).
   ===================================================================== */
const SURUM = 'diji-v134-premium-achievement-popup-20261014';
const SAYFA = 'sayfa-' + SURUM, KAYNAK = 'kaynak-' + SURUM;
const DIS_KAYNAK = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//;
/* Ana sayfanın çevrimdışı kopyasını ASLA değiştirmemesi gereken sayfalar:
   hukuki / hesap sayfaları, deneme ve doğrulama akışları, şifre yenileme ve tüm tasarım önizlemeleri. */
const AYRI_SAYFA = /\/(?:hesap-sil|gizlilik|telif|lisanslar|kullanim-kosullari|kelime-atolyesi|misafir|hesap-dogrula|sifre-yenile)\.html$|\/[^/]*-(?:preview(?:-inner)?|comparison|onizleme)\.html$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SAYFA).then(c => c.addAll(['./'])).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => /^(sayfa|kaynak)-diji-/.test(k) && k !== SAYFA && k !== KAYNAK).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.hostname.endsWith('supabase.co')) return;                 /* API: dokunma */
  if (AYRI_SAYFA.test(url.pathname)) return;                        /* Ayrı sayfalar ana sayfa önbelleğine karışmasın */
  if (url.searchParams.get('misafir') === '1') return;              /* Deneme oturumu ana sayfanın çevrimdışı kopyası değildir. */

  /* Sayfanın kendisi: önce internet (her zaman güncel), yoksa cihazdaki kopya */
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r,{cache:'no-store'}).then(y => { if (y && y.ok) { const k = y.clone(); caches.open(SAYFA).then(c => c.put('./', k)); } return y; })
      .catch(() => caches.match('./').then(y => y || caches.match(r))));
    return;
  }
  /* Betikler, stiller ve JSON içerik: her zaman güncel olanı dene, çevrimdışıysa cihazdaki kopya */
  if (url.origin === self.location.origin && /\.(?:js|css|json)$/.test(url.pathname)) {
    e.respondWith(fetch(r,{cache:'no-store'}).then(y => {
      if (y && y.ok) { const k = y.clone(); caches.open(KAYNAK).then(c => c.put(r, k)); }
      return y;
    }).catch(() => caches.match(r)));
    return;
  }
  /* Yazı tipleri, kütüphaneler ve aynı klasördeki görseller: önce cihaz */
  if (DIS_KAYNAK.test(r.url) || url.origin === self.location.origin) {
    e.respondWith(caches.match(r).then(v => v || fetch(r).then(y => {
      if (y && (y.ok || y.type === 'opaque')) { const k = y.clone(); caches.open(KAYNAK).then(c => c.put(r, k)); }
      return y;
    })));
  }
});
