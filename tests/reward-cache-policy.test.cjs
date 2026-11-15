const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('ingilizce/sw.js','utf8');
const vm=require('node:vm');
test('reward policy release rotates the PWA cache namespace',()=>{
 assert.match(source,/diji-v454-reward-policy-sync-20261115/);
});
test('reward and progression assets use no-store and never use stale cache fallback',()=>{
 assert.match(source,/Reward and progression code must never be served from a stale PWA cache/);
 assert.match(source,/e\.respondWith\(fetch\(r,\{cache:'no-store'\}\)\)/);
 assert.match(source,/topic-games-core/);
 assert.match(source,/parkur/);
 assert.match(source,/progression/);
});
test('Supabase calls remain outside service worker cache',()=>{
 assert.match(source,/if \(url\.hostname\.endsWith\('supabase\.co'\)\) return/);
});
for(const file of ['konu-oyunlari.js','konu-oyunlari-a1.js','konu-oyunlari-a2.js',
 'study-ui.js','ders-test.js','progress-rules.js','score-rules.js','game-feedback.js',
 'verified-games.js','student-solo-levels.js','app-js/i03-veriler.js',
 'app-js/i12-1-ekonomi.js','app-js/i24-oku.js','app-js/i27-yenidenyukle.js']){
 test(`${file} never falls back to cached reward code after an offline request`,async()=>{
  const listeners={},calls=[];let response;
  vm.runInNewContext(source,{URL,Promise,console,
   self:{location:{origin:'https://app.test'},addEventListener:(n,f)=>listeners[n]=f},
   caches:{open(){throw Error('Stale reward cache was accessed');},match(){throw Error('Stale reward cache was accessed');}},
   fetch:async(request,options)=>{calls.push({request,options});throw Error('offline');}
  });
  const request={url:'https://app.test/ingilizce/'+file+'?v=old',method:'GET',mode:'same-origin'};
  listeners.fetch({request,respondWith:p=>response=p,waitUntil(){throw Error('Unexpected cache task');}});
  assert(response);await assert.rejects(response,/offline/);
  assert.equal(calls.length,1);assert.equal(calls[0].options.cache,'no-store');
 });
}
test('activation removes old app caches while retaining unrelated caches',async()=>{
 const listeners={},deleted=[];let pending,claimed=0;
 vm.runInNewContext(source,{URL,Promise,console,
  self:{addEventListener:(n,f)=>listeners[n]=f,clients:{claim:async()=>claimed++}},
  caches:{keys:async()=>['sayfa-diji-old','kaynak-diji-old','unrelated'],delete:async k=>deleted.push(k)}
 });
 listeners.activate({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(deleted,['sayfa-diji-old','kaynak-diji-old']);assert.equal(claimed,1);
});
