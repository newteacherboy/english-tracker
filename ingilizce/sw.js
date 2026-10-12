/* Emergency maintenance worker: never serve a cached student portal. */
const NOTICE='<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diji-Medu bakımda</title><style>body{font-family:system-ui;background:#fff9ec;display:grid;place-items:center;min-height:95vh;text-align:center;color:#26734b;padding:20px}main{background:#fff;padding:35px;border-radius:25px;max-width:450px}h1{font-size:30px}</style><main><div style="font-size:70px">🦜</div><h1>Diji-Medu bakımda</h1><p>Papi uygulamamızı güzelleştiriyor. Yakında görüşürüz! 💚</p><p>🔒 Girişler geçici olarak kapalıdır.</p></main></html>';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.mode!=='navigate')return;
 const url=new URL(e.request.url);
 if(!/\/ingilizce\/?$/.test(url.pathname)&&!/\/ingilizce\/index\.html$/.test(url.pathname))return;
 e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>new Response(NOTICE,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});