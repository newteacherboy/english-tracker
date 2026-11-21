/* =====================================================================
   Diji-Medu İngilizce · Service Worker
   Bu dosyayı index.html ile AYNI klasöre yükleyin:  /ingilizce/sw.js
   - Sayfa: önce internetten, yoksa cihazdaki son kopyadan açılır
   - JS / CSS / JSON: önce internet (her zaman güncel), yoksa cihazdaki kopya
   - Görseller ve yazı tipleri: cihazdan (hızlı, internetsiz de çalışır)
   - Supabase istekleri: bu dosya karışmaz (sayfadaki katman yönetir)
   Sayfayı güncellediğinizde SURUM değerini artırın (v2, v3…).
   ===================================================================== */
const SURUM = 'diji-v530-karanfil-fullscreen-20261121';
const SAYFA = 'sayfa-' + SURUM, KAYNAK = 'kaynak-' + SURUM;
// Cached on first use; never download the A2 catalog at startup.
const LAZY_TOPIC_FILES = new Set(['konu-oyunlari-a1.js','konu-oyunlari-a2.js','topic-games-core.mjs']);
const DIS_KAYNAK = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//;
/* Ana sayfanın çevrimdışı kopyasını ASLA değiştirmemesi gereken sayfalar:
   hukuki / hesap sayfaları, deneme ve doğrulama akışları, şifre yenileme ve tüm tasarım önizlemeleri. */
const AYRI_SAYFA = /\/(?:veli-kontrolu|hesap-sil|hesap-dondur|hesap-ac|gizlilik|telif|lisanslar|kullanim-kosullari|cerez|hakkinda|destek|kelime-atolyesi|misafir|hesap-dogrula|sifre-yenile)\.html$|\/[^\/]*-(?:preview(?:-inner)?|comparison|onizleme)\.html$/;

self.addEventListener('install', e => {
  // Keep the complete lightweight opening (including the inline SVG game) available offline.
  const opening=['shared-voice.js?v=20261120-tr-school','papi-loading.css?v=20261112-ust','papi-loading.webp','holiday-splashes/papi-intro.js?v=20261118-gunde1','holiday-splashes/splash.js?v=20261121-karanfil-fullscreen','holiday-splashes/dates.js?v=20261023-2','holiday-splashes/splash.css?v=20261121-karanfil-fullscreen'];
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
  // Only immutable, public educational speech files; never cache Supabase API/auth responses.
  if (url.origin === 'https://nxfqlutulxqzqgwewssd.supabase.co' &&
      !url.search && /^\/storage\/v1\/object\/public\/ses\/v1\/(?:English\/en|Turkish\/tr)-[0-9a-f]{16}\.mp3$/.test(url.pathname) &&
      r.mode === 'cors') {
    e.respondWith(sharedVoiceResponse(r)); return;
  }
  if (url.hostname.endsWith('supabase.co')) return;                 /* API: dokunma */
  // Teacher account transition must not run an older cached authorization/UI script.
  if (url.pathname.endsWith('/teacher-portal-boot.js')) {
    e.respondWith(fetch(r,{cache:'no-store'}).catch(async()=>{
      const cached=await caches.open(KAYNAK).then(c=>c.match(r));
      return cached||Response.error();
    }));return;
  }
  // New 3D Papi must never be silently replaced by stale route scripts.
  if (/\/(?:baby-papi-webgl|route-papi-walk-feedback)\.js$/.test(url.pathname)) {
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
  const LIVE_LEAGUE_FILES = /\/(?:league-ui|friends-ui|zirve-kampanya|parkur-badges)\.(?:js|css)$|\/parkur-badges\/v2\/(?:papi-01|school-02|school-03)\.webp$|\/parkur-badges\/v3\/[^\/]+\.png$/;
  if ((!self.location?.origin || url.origin === self.location.origin) && (LIVE_LEAGUE_FILES.test(url.pathname) || ['/teacher-workspace.js','/teacher-portal.js','/teacher-portal.css','/teacher-portal-boot.js','/teacher-owned-tools.js','/teacher-assets/approved-teacher-2.webp'].some(name => url.pathname.endsWith(name)))) {
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

  // Force fresh navigation shell and dock resources when online; retain offline fallback.
  const criticalDock = /\/(?:bottom-nav(?:-v2)?\.(?:js|css)|friends-ui\.(?:js|css)|notification-center\.(?:js|css)|app-js\/i07-gonder\.js)$/;
  if (url.origin === self.location.origin && (criticalDock.test(url.pathname) || (r.mode === 'navigate' && /\/ingilizce\/?$/.test(url.pathname)))) {
    const page = r.mode === 'navigate';
    const bucket = page ? SAYFA : KAYNAK;
    const key = page ? './' : r;
    e.respondWith(fetch(r,{cache:'no-store'}).then(async response => {
      if(response && response.ok) await caches.open(bucket).then(cache=>cache.put(key,response.clone())).catch(()=>{});
      return response;
    }).catch(async()=>await caches.open(bucket).then(cache=>cache.match(key))||Response.error()));
    return;
  }
  /* Prefer fresh responses, but an existing installation must not wait for a
     slow network. Refresh the cached copy in the background; never reload a tab. */
  if (r.mode === 'navigate') {
    // Teacher workspaces must render the latest dashboard, not the 1.2-second cached index.
    // Offline keeps the last usable copy, but online never silently replays old markup.
    if (url.origin === self.location.origin && url.searchParams.get('ogretmen') === '1') {
      e.respondWith(fetch(r,{cache:'no-store'}).then(async response=>{
        if(response?.ok)await caches.open(SAYFA).then(c=>c.put('./',response.clone())).catch(()=>{});
        return response;
      }).catch(async()=>await caches.open(SAYFA).then(c=>c.match('./'))||Response.error()));
      return;
    }
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



// Shared audio: full object cache with byte-range support for mobile media playback.
function voiceRange(value,size){
 if(!value)return null;
 const m=/^bytes=(\d*)-(\d*)$/i.exec(value.trim());
 if(!m||(!m[1]&&!m[2])||size<1)return false;
 let start,end;
 if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return false;start=Math.max(0,size-suffix);end=size-1;}
 else{start=Number(m[1]);end=m[2]?Number(m[2]):size-1;}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return false;
 return [start,Math.min(size-1,end)];
}
async function sharedVoiceResponse(request){
 try{
  // Versioned independently of app shell, so already downloaded speech survives app updates.
  const cache=await caches.open('dm-shared-voice-v1');
  const key=new Request(request.url,{mode:'cors',credentials:'omit'});
  let response=await cache.match(key);
  if(!response){
   response=await fetch(key);
   if(response.status!==200||!/^audio\/mpeg\b/i.test(response.headers.get('content-type')||''))return fetch(request);
   const length=Number(response.headers.get('content-length'));
   if(length>1048576)return fetch(request);
   // Await cache writes before replying, rather than scheduling untracked worker work.
   await cache.put(key,response.clone()).catch(()=>{});
  }
  const range=request.headers.get('range');
  if(!range)return response;
  const bytes=await response.arrayBuffer(),size=bytes.byteLength;
  const selected=voiceRange(range,size);
  if(!selected)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
  const [start,end]=selected;
  return new Response(bytes.slice(start,end+1),{status:206,headers:{
   'Content-Type':'audio/mpeg','Content-Length':String(end-start+1),'Accept-Ranges':'bytes',
   'Content-Range':'bytes '+start+'-'+end+'/'+size
  }});
 }catch{return fetch(request);}
}
