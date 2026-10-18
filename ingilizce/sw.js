/* =====================================================================
   Diji-Medu İngilizce · Service Worker
   Bu dosyayı index.html ile AYNI klasöre yükleyin:  /ingilizce/sw.js
   - Sayfa: önce internetten, yoksa cihazdaki son kopyadan açılır
   - JS / CSS / JSON: önce internet (her zaman güncel), yoksa cihazdaki kopya
   - Görseller ve yazı tipleri: cihazdan (hızlı, internetsiz de çalışır)
   - Supabase istekleri: bu dosya karışmaz (sayfadaki katman yönetir)
   Sayfayı güncellediğinizde SURUM değerini artırın (v2, v3…).
   ===================================================================== */
const SURUM = 'diji-v174-unified-papi-20261018';
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
    e.respondWith(fetch(r,{cache:'no-store'}).then(y => { if (y && y.ok) { const k = y.clone(); e.waitUntil(caches.open(SAYFA).then(c => c.put('./', k)).catch(()=>{})); } return y; })
      .catch(() => caches.open(SAYFA).then(c => c.match('./')).then(y => y || Response.error())));
    return;
  }
  /* JS/CSS/JSON: ağ öncelikli. Önceki cache-first kuralı aynı ?v= URL'sindeki güncellemeleri süresiz gizleyebiliyordu. */
  if (url.origin === self.location.origin && /\.(?:js|css|json)$/.test(url.pathname)) {
    e.respondWith(fetch(r,{cache:'no-store'}).then(y => {
      if (y && y.ok) { const copy=y.clone(); e.waitUntil(caches.open(KAYNAK).then(c=>c.put(r,copy)).catch(()=>{})); }
      return y;
    }).catch(()=>caches.open(KAYNAK).then(c=>c.match(r)).then(y=>y||Response.error())));
    return;
  }
  /* Görseller hızlı açılır; aynı URL'deki yeni tasarım arka planda yenilenir.
     Yalnız statik dosyalar: oturum/API yanıtları önbelleğe alınmaz. */
  if (DIS_KAYNAK.test(r.url) || (url.origin === self.location.origin && /\.(?:png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf)$/.test(url.pathname))) {
    const fresh = fetch(r,{cache:'no-cache'}).then(async y => {
      if (y && (y.ok || y.type === 'opaque')) {
        const copy=y.clone(); await caches.open(KAYNAK).then(c=>c.put(r,copy)).catch(()=>{});
      }
      return y;
    });
    e.waitUntil(fresh.then(()=>{},()=>{}));
    e.respondWith(caches.open(KAYNAK).then(c=>c.match(r)).then(v=>v||fresh));
  }
});
