const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
function fixture(handler){
 let now=1000000;class Clock extends Date{static now(){return now;}}
 const store=new Map([['ing_token','first-token'],['ing_aktifOgrenci','First']]);
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i],get length(){return store.size;}};
 const listeners={},document={hidden:false,addEventListener:(k,f)=>(listeners[k]??=[]).push(f),removeEventListener:(k,f)=>listeners[k]=listeners[k].filter(x=>x!==f)};
 const calls=[],window={fetch:async(u,o)=>{calls.push({u,o});return handler?handler(u,o,calls):new Response(JSON.stringify({ok:true,value:calls.length}));},addEventListener(){}};
 const ctx={window,document,localStorage:storage,sessionStorage:{getItem:()=>null},location:{href:'https://panel.test/ingilizce/'},Date:Clock,Headers,Response,URL,Map,Set,Object,Promise,JSON,setTimeout,console};
 vm.runInNewContext(fs.readFileSync('ingilizce/request-budget.js','utf8'),ctx);
 return {window,calls,storage,advance:n=>now+=n,document,visible:()=>{document.hidden=false;(listeners.visibilitychange||[]).slice().forEach(f=>f());},get:op=>window.fetch(API+'?islem='+op+'&ogrenci=First'),post:(op,args={})=>window.fetch(API,{method:'POST',body:JSON.stringify({islem:op,ogrenci:'First',t:store.get('ing_token'),...args})})};
}
test('concurrent GET/POST reads share one request and independently consumable responses',async()=>{
 const f=fixture();const [a,b]=await Promise.all([f.get('bildirimlerim'),f.post('bildirimlerim')]);assert.deepEqual(await a.json(),await b.json());assert.equal(f.calls.length,1);assert.equal(f.window.dmRequestBudget.stats.joined,1);
});
test('different reads bundle once, preserving each body and status',async()=>{
 const f=fixture((u,o)=>{const b=JSON.parse(o.body);assert.equal(b.islem,'okumaGrubu');assert.equal(b.t,'first-token');return new Response(JSON.stringify({ok:true,results:b.istekler.map((x,i)=>({status:i?403:200,body:JSON.stringify({op:x.islem})}))}));});
 const [a,b]=await Promise.all([f.get('bildirimlerim'),f.post('seviyeDurumu')]);assert.equal(f.calls.length,1);assert.equal(a.status,200);assert.equal(b.status,403);assert.equal((await a.json()).op,'bildirimlerim');assert.equal((await b.json()).op,'seviyeDurumu');
});
test('writes/rewards/live answers are never joined or delayed and invalidate cached balances',async()=>{
 const f=fixture();await f.get('enerjiDurumuGetir');await f.get('enerjiDurumuGetir');assert.equal(f.calls.length,1);
 await Promise.all([f.post('seviyeOyunOdulu'),f.post('seviyeOyunOdulu'),f.post('oyunEslesmeCevap')]);assert.equal(f.calls.length,4);await f.get('enerjiDurumuGetir');assert.equal(f.calls.length,5);
});
test('account/token switch and explicit refresh bypass a previous account cache',async()=>{
 const f=fixture();await f.get('bildirimlerim');f.storage.setItem('ing_token','second-token');await f.get('bildirimlerim');assert.equal(f.calls.length,2);await f.window.fetch(API+'?islem=bildirimlerim&ogrenci=First&_=123');assert.equal(f.calls.length,3);
});
test('content persists, revalidates its version, and a 304 restores original JSON',async()=>{
 const f=fixture((u)=>u.includes('_contentVersion=one')?new Response(null,{status:304}):new Response('[{"word":"cat"}]',{headers:{'X-Diji-Content-Version':'one'}}));
 assert.equal((await (await f.get('kelimelerGetir')).json())[0].word,'cat');f.window.dmRequestBudget.clear();await f.get('kelimelerGetir');assert.equal(f.calls.length,1);f.advance(300001);const r=await f.get('kelimelerGetir');assert.equal(r.status,200);assert.equal((await r.json())[0].word,'cat');assert.equal(f.calls.length,2);
});
test('failed polls back off without delaying mutations',async()=>{
 const f=fixture(()=>new Response('{"ok":false}',{status:500}));await f.get('bildirimlerim');await f.get('bildirimlerim');assert.equal(f.calls.length,1);await f.post('enerjiGonder');assert.equal(f.calls.length,2);f.advance(60001);await f.get('bildirimlerim');assert.equal(f.calls.length,3);
});
test('unrecognized batch falls back to the original reads without losing results',async()=>{
 const f=fixture((u,o)=>JSON.parse(o?.body||'{}').islem==='okumaGrubu'?new Response('{"ok":false}',{status:404}):new Response('{"ok":true,"level":7}'));
 const [a,b]=await Promise.all([f.get('seviyeDurumu'),f.get('yayinOzellikleri')]);assert.equal((await a.json()).level,7);assert.equal((await b.json()).level,7);assert.equal(f.calls.length,3);
});
test('keepalive writes invalidate reads while preserving transport options',async()=>{
 const f=fixture();await f.get('enerjiDurumuGetir');await f.window.fetch(API,{method:'POST',keepalive:true,body:JSON.stringify({islem:'ekVeriKaydet',anahtar:'yo'})});assert.equal(f.calls[1].o.keepalive,true);await f.get('enerjiDurumuGetir');assert.equal(f.calls.length,3);
});
test('hidden polling waits for visibility, while writes still send immediately',async()=>{
 const f=fixture();f.document.hidden=true;const p=f.get('bildirimlerim');await new Promise(r=>setTimeout(r,40));assert.equal(f.calls.length,0);await f.post('ekVeriKaydet');assert.equal(f.calls.length,1);f.visible();await p;assert.equal(f.calls.length,2);
});
test('an in-flight read cannot restore a stale cache after a write',async()=>{
 let finish;const f=fixture((u,o)=>o?.body?.includes('ekVeriKaydet')?new Response('{"ok":true}'):new Promise(r=>finish=r));
 const first=f.get('enerjiDurumuGetir');await new Promise(r=>setTimeout(r,40));await f.post('ekVeriKaydet');finish(new Response('{"ok":true,"energy":1}'));await first;
 const second=f.get('enerjiDurumuGetir');await new Promise(r=>setTimeout(r,40));assert.equal(f.calls.length,3);finish(new Response('{"ok":true,"energy":2}'));await second;
});
function server(){const ctx={Set,Map,Date,Request,Response,Headers,URL,TextEncoder,Uint8Array,crypto,JSON,Promise};let s=stripTypeScriptTypes(fs.readFileSync('supabase/functions/diji-api/request-budget.ts','utf8'),{mode:'transform'}).replace(/export /g,'');vm.runInNewContext(s+';globalThis.batch=readBatch;globalThis.cache=contentCache;',ctx);return ctx;}
const json=(d,status=200)=>new Response(JSON.stringify(d),{status});
test('server validates all batch operations/credentials before running any handler',async()=>{
 const ctx=server();let ran=0;for(const args of [[{islem:'seviyeOyunOdulu'}],[{islem:'bildirimlerim',t:'forged'}],Array(9).fill({islem:'bildirimlerim'})]){const r=await ctx.batch(new Request(API,{method:'POST'}),{istekler:args},()=>ran++,json);assert.equal(r.status,400);}assert.equal(ran,0);
});
test('server forwards outer identity and isolates child failures',async()=>{
 const ctx=server(),req=new Request(API+'?islem=okumaGrubu',{method:'POST',headers:{'x-diji-token':'header-token'}}),seen=[];
 const r=await ctx.batch(req,{t:'outer-token',istekler:[{islem:'bildirimlerim'},{islem:'seviyeDurumu'}]},async child=>{const b=await child.json();seen.push(b);assert.equal(child.headers.get('x-diji-token'),'header-token');return json({op:b.islem},b.islem==='bildirimlerim'?200:401);},json);
 const d=await r.json();assert.equal(d.results[1].status,401);assert(seen.every(x=>x.t==='outer-token'));assert.equal(seen.length,2);
});
test('public content cache coalesces loads, provides versions and discards failed loads',async()=>{
 const ctx=server(),cache=ctx.cache(json);let loads=0;const load=async()=>{loads++;return {text:'lesson'};};const a=await cache(new Request(API),'topic',load),version=a.headers.get('X-Diji-Content-Version');assert.equal(version.length,64);await cache(new Request(API),'topic',load);assert.equal(loads,1);assert.equal((await cache(new Request(API+'?_contentVersion='+version),'topic',load)).status,304);
 await assert.rejects(cache(new Request(API),'bad',()=>{throw Error('failed')}));await cache(new Request(API),'bad',load);assert.equal(loads,2);
});
