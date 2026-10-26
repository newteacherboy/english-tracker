/* =====================================================================
   Diji-Medu İngilizce · Service Worker
   Bu dosyayı index.html ile AYNI klasöre yükleyin:  /ingilizce/sw.js
   - Sayfa: önce internetten, yoksa cihazdaki son kopyadan açılır
   - JS / CSS / JSON: önce internet (her zaman güncel), yoksa cihazdaki kopya
   - Görseller ve yazı tipleri: cihazdan (hızlı, internetsiz de çalışır)
   - Supabase istekleri: bu dosya karışmaz (sayfadaki katman yönetir)
   Sayfayı güncellediğinizde SURUM değerini artırın (v2, v3…).
   ===================================================================== */
const SURUM = 'diji-v275-level-flight-20261026';
const SAYFA = 'sayfa-' + SURUM, KAYNAK = 'kaynak-' + SURUM;
// Cached on first use; never download the A2 catalog at startup.
const LAZY_TOPIC_FILES = new Set(['konu-oyunlari-a1.js','konu-oyunlari-a2.js','topic-games-core.mjs']);
const DIS_KAYNAK = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//;
/* Ana sayfanın çevrimdışı kopyasını ASLA değiştirmemesi gereken sayfalar:
   hukuki / hesap sayfaları, deneme ve doğrulama akışları, şifre yenileme ve tüm tasarım önizlemeleri. */
const AYRI_SAYFA = /\/(?:veli-kontrolu|hesap-sil|hesap-dondur|hesap-ac|gizlilik|telif|lisanslar|kullanim-kosullari|cerez|hakkinda|kelime-atolyesi|misafir|hesap-dogrula|sifre-yenile)\.html$|\/[^/]*-(?:preview(?:-inner)?|comparison|onizleme)\.html$/;

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

  /* Prefer fresh responses, but an existing installation must not wait for a
     slow network. Refresh the cached copy in the background; never reload a tab. */
  if (r.mode === 'navigate') {
    e.respondWith(boundedNetwork(e, r, SAYFA, './', 1200));
    return;
  }
  if (url.origin === self.location.origin && (LAZY_TOPIC_FILES.has(url.pathname.split('/').at(-1)) || /\.(?:js|css|json)$/.test(url.pathname))) {
    e.respondWith(boundedNetwork(e, r, KAYNAK, r, 600));
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

async function boundedNetwork(event, request, bucket, key, budget) {
  // Register lifetime work synchronously, before opening IndexedDB-backed caches.
  const network = fetch(request, {cache:'no-cache'});
  const update = network.then(async response => {
    if (response && response.ok) {
      const copy=response.clone();
      await caches.open(bucket).then(cache=>cache.put(key,copy)).catch(()=>{});
    }
  });
  event.waitUntil(update.catch(()=>{}));
  const cached=await caches.open(bucket).then(cache=>cache.match(key));
  if (!cached) return network.catch(()=>Response.error());
  let timer;
  try {
    return await Promise.race([
      network.then(response=>response && response.ok ? response : cached,()=>cached),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(cached),budget);})
    ]);
  } finally {clearTimeout(timer);}
}

