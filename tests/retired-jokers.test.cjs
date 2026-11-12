const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');

test('store keeps energy and clothing purchases without consumable sales',async()=>{
 const dom=new JSDOM('<section id="tab-magaza"><div class="mg-kap"><div id="magazaAlan"></div></div></section>',{url:'https://app.test/ingilizce/',runScripts:'outside-only'});
 const w=dom.window,calls=[];
 try{
  w.yo={altin:1000,jokerEnv:{yari:20},dmExtraJoker:5};w.genelEnerjiKalan=0;w.genelEnerjiMax=25;
  w.setInterval=()=>0;w.dmBagInventory={};w.dmProgression={allowed:()=>true,require:()=>true,level:()=>20};
  w.yoHazirMi=()=>true;w.yoMagazaAc=()=>calls.push('wardrobe');
  w.enerjiPaketiAl=async n=>{calls.push(n);return true;};
  w.dmStoreWardrobe={offers:()=>[],character:()=>'<span>Papi</span>',ready:()=>true};
  w.eval(fs.readFileSync('ingilizce/storefront.js','utf8'));w.magazaAc();
  assert.equal(w.document.querySelectorAll('[data-pack]').length,3);
  assert.equal(w.document.querySelectorAll('[data-joker],[data-pwm-buy],[data-ds="jokers"],.ds-jokers,.ds-pwm').length,0);
  w.document.querySelector('[data-pack="10"]').click();await new Promise(setImmediate);
  assert(calls.includes(10));
  w.document.querySelector('[data-ds="clothing"]').click();assert(calls.includes('wardrobe'));
 }finally{w.close();}
});

test('legacy game score hooks cannot create a joker bar or grant a modifier',()=>{
 const dom=new JSDOM('<div id="play"></div>',{runScripts:'outside-only'}),w=dom.window;
 try{w.eval(fs.readFileSync('ingilizce/app-js/i02-jokerturubaslat.js','utf8'));
  for(const game of ['ky','hafiza','jp','ba','kp']){w.jokerTuruBaslat(game,'play');w.jokerBarCiz();assert.equal(w.jokerKullan('cift'),false);assert.equal(w.jokerCiftCarpan(),1);assert.equal(w.jokerKalkanTuket(),false);assert.equal(w.jokerIkinciTuket(),false);}
  assert.equal(w.document.getElementById('play').children.length,0);
 }finally{w.close();}
});

test('retired Candy requests never reach the database while status stays available',async()=>{
 const {stripTypeScriptTypes}=require('node:module');let handler;const calls=[];
 const token='x'.repeat(40),actor='00000000-0000-4000-8000-000000000001';
 const ctx={Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://test.invalid':'service'},serve:fn=>handler=fn},crypto,TextEncoder,Response,Request,URL,console,fetch:async url=>{
  calls.push(url);if(url.includes('portal_sessions'))return Response.json([{student_id:actor,role:'student',expires_at:'2099-01-01'}]);
  if(url.includes('/students?'))return Response.json([{id:actor,status:'approved',role:'student'}]);
  if(url.includes('/rpc/dm_pwm_status'))return Response.json({ok:true,level:1,remaining:3});
  throw Error('Unexpected request: '+url);
 }};
 vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/premium-games/index.ts','utf8')),ctx);
 for(const op of ['buy','use']){
  const r=await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({op,kind:'karistir',t:token})}));
  assert.equal(r.status,400);assert.equal((await r.json()).ok,false);
 }
 const r=await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({op:'status',t:token})}));
 assert.equal(r.status,200);assert.equal((await r.json()).level,1);
 assert(!calls.some(x=>x.includes('dm_pwm_booster')));
});
