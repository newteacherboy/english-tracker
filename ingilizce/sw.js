/* =====================================================================
   Diji-Medu İngilizce · Service Worker
   Bu dosyayı index.html ile AYNI klasöre yükleyin:  /ingilizce/sw.js
   - Sayfa: önce internetten, yoksa cihazdaki son kopyadan açılır
   - JS / CSS / JSON: önce internet (her zaman güncel), yoksa cihazdaki kopya
   - Görseller ve yazı tipleri: cihazdan (hızlı, internetsiz de çalışır)
   - Supabase istekleri: bu dosya karışmaz (sayfadaki katman yönetir)
   Sayfayı güncellediğinizde SURUM değerini artırın (v2, v3…).
   ===================================================================== */
const SURUM = 'diji-v425-rank-answer-audio-20261113';
const SAYFA = 'sayfa-' + SURUM, KAYNAK = 'kaynak-' + SURUM;
// Cached on first use; never download the A2 catalog at startup.
const LAZY_TOPIC_FILES = new Set(['konu-oyunlari-a1.js','konu-oyunlari-a2.js','topic-games-core.mjs']);
const DIS_KAYNAK = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//;
/* Ana sayfanın çevrimdışı kopyasını ASLA değiştirmemesi gereken sayfalar:
   hukuki / hesap sayfaları, deneme ve doğrulama akışları, şifre yenileme ve tüm tasarım önizlemeleri. */
const AYRI_SAYFA = /\/(?:veli-kontrolu|hesap-sil|hesap-dondur|hesap-ac|gizlilik|telif|lisanslar|kullanim-kosullari|cerez|hakkinda|destek|kelime-atolyesi|misafir|hesap-dogrula|sifre-yenile)\.html$|\/[^\/]*-(?:preview(?:-inner)?|comparison|onizleme)\.html$/;

self.addEventListener('install', e => {
  // Keep the complete lightweight opening (including the inline SVG game) available offline.
  const opening=['papi-loading.css?v=20261112-ust','papi-loading.webp','holiday-splashes/papi-intro.js?v=24d4c8eb05','holiday-splashes/splash.js?v=20261112-yuk','holiday-splashes/dates.js?v=20261023-2','holiday-splashes/splash.css?v=20261111-pending-3'];
  e.waitUntil(Promise.all([
    caches.open(SAYFA).then(c => c.addAll(['./'])),
    caches.open(KAYNAK).then(c => c.addAll(opening))
  ]).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => /^(sayfa|kaynak)-diji-/.test(k) && k !== SAYFA && k !== KAYNAK).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.hostname.endsWith('supabase.co')) return;                 /* API: dokunma */
  // Teacher account transition must not run an older cached authorization/UI script.
  if (url.pathname.endsWith('/teacher-portal-boot.js')) {
    e.respondWith(fetch(r,{cache:'no-store'}).catch(async()=>{
      const cached=await caches.open(KAYNAK).then(c=>c.match(r));
      return cached||Response.error();
    }));return;
  }
  // Premium game requires a live account check. Never serve a stale JS/CSS bundle,
  // especially while a prior iPhone WebKit renderer is recovering.
  if (/\/(?:premium-(?:word-match(?:-core)?|cloud-flight|word-blocks|intro)\.(?:js|css)|papizzle\.(?:js|css)|lazy-games\.js)$/.test(url.pathname)) {
    e.respondWith(fetch(r,{cache:'no-store'}));return;
  }
  // Leaderboard and its badge atlas must not appear stale after a deployment.
  // Network-first even on a slow connection; offline still uses last good copy.
  const LIVE_LEAGUE_FILES = /\/(?:league-ui|friends-ui)\.(?:js|css)$|\/parkur-badges\/v2\/(?:papi-01|school-02|school-03)\.webp$|\/parkur-badges\/v3\/[^\/]+\.png$/;
  if ((!self.location?.origin || url.origin === self.location.origin) && (LIVE_LEAGUE_FILES.test(url.pathname) || ['/teacher-workspace.js','/teacher-portal.js','/teacher-owned-tools.js'].some(name => url.pathname.endsWith(name)))) {
    e.respondWith(
      fetch(r,{cache:'no-store'}).then(async response=>{
        if (response && response.ok) {
          const cached=response.clone();
          await caches.open(KAYNAK).then(c=>c.put(r,cached)).catch(()=>{});
        }
        return response;
      }).catch(async()=>{
        const cached=await caches.open(KAYNAK).then(c=>c.match(r));
        return cached||Response.error();
      })
    );
    return;
  }
  if (AYRI_SAYFA.test(url.pathname)) return;                        /* Ayrı sayfalar ana sayfa önbelleğine karışmasın */
  if (url.searchParams.get('misafir') === '1') return;              /* Deneme oturumu ana sayfanın çevrimdışı kopyası değildir. */

  /* Prefer fresh responses, but an existing installation must not wait for a
     slow network. Refresh the cached copy in the background; never reload a tab. */
  if (r.mode === 'navigate') {
    e.respondWith(boundedNetwork(e, r, SAYFA, './', 1200));
    return;
  }
  if (url.origin === self.location.origin && (LAZY_TOPIC_FILES.has(url.pathname.split('/').at(-1)) || /\.(?:js|css|json)$/.test(url.pathname))) {
    /* [12 Kas 2026] Hız: sürüm numaralı (?v=…) JS/CSS için ağa en fazla 200 ms beklenir, sonra cihazdaki
       kopya açılır ve arka planda yenilenir (eskiden 600 ms). Sürümsüz dosyalar 600 ms'de kalır. */
    if (url.searchParams.has('v') && /\.(?:js|css)$/.test(url.pathname)) {
      e.respondWith(boundedNetwork(e, r, KAYNAK, r, 200));
      return;
    }
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

