const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('ingilizce/sw.js','utf8');
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
