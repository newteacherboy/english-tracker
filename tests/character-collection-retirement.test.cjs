const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
let JSDOM;try{({JSDOM}=require('node:module').createRequire(require('node:path').join(__dirname,'ios-admob/package.json'))('jsdom'));}catch{}
test('store opens without collection reads and preserves wardrobe and chest actions',{skip:!JSDOM},()=>{
 const dom=new JSDOM('<section id="tab-magaza"><div class="mg-kap"><div id="magazaAlan"></div></div></section>',{url:'https://app.dijimedu.com/ingilizce/',runScripts:'outside-only'}),w=dom.window;
 let chests=0,clothing=0;w.setInterval=()=>0;w.yo={altin:800};w.yoHazirMi=()=>true;w.aktifOgrenciAdi='student';
 w.dmProgression={require:()=>true,chests:()=>chests++};w.yoMagazaAc=()=>clothing++;
 w.dmStoreWardrobe={offers:()=>[],character:()=>'<span>Avatar</span>',ready:()=>true};
 w._krkListe=w.bcKoleksiyonCiz=()=>{throw Error('Retired collection was accessed');};
 w.fetch=()=>{throw Error('Unexpected network request');};
 w.eval(fs.readFileSync('ingilizce/storefront.js','utf8'));w.magazaAc();
 assert.equal(w.document.querySelector('[data-ds="collection"]'),null);
 assert(!w.document.getElementById('dmStoreFront').textContent.toLowerCase().includes('koleksiyonum'));
 w.document.querySelector('[data-ds="chests"]').click();assert.equal(chests,1);
 w.document.querySelector('[data-ds="clothing"]').click();assert.equal(clothing,1);
 dom.window.close();
});
test('legacy character ad requests never call the reward RPC',async()=>{
 const {iosAdRewards}=await import('../supabase/functions/diji-api/ios-ad-rewards.mjs');let calls=0;
 const handler=iosAdRewards({db:{rpc:async()=>{calls++;return {data:{ok:true}};}},json:(data,status=200)=>({data,status}),isDemo:()=>false,items:[],catalog:{itemGender:()=>''}});
 const actor={role:'student',student_id:'student'};
 for(const op of ['reklamHakki','reklamOdulu']){
  const result=await handler.handle(op,{urun:{tip:'karakter',id:'Alfi'},tur:'altin',requestId:'00000000-0000-4000-8000-000000000001'},actor,'POST');
  assert.equal(result.status,400);assert.equal(calls,0);
 }
 assert.equal((await handler.handle('reklamHakki',{urun:{tip:'enerji',id:'5'}},actor,'POST')).status,200);assert.equal(calls,1);
});
test('legacy collection purchases and ad products return 410 before database or session work',()=>{
 const source=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
 const line=source.split('\n').find(x=>x.includes('Karakter koleksiyonu kaldırıldı.'));
 assert(source.indexOf(line)<source.indexOf('const rate=async'));
 const guard=new Function('op','body','json',line);const json=(data,status)=>({data,status});
 for(const [op,body] of [['ekonomi',{is:'karakterAl'}],['karakterAl',{}],['reklamHakki',{urun:{tip:'karakter'}}],['reklamOdulu',{urun:{tip:'karakter'}}]])assert.equal(guard(op,body,json).status,410);
 for(const [op,body] of [['ekonomi',{is:'enerjiPaketAl'}],['reklamHakki',{urun:{tip:'kiyafet'}}],['ekVeriKaydet',{}]])assert.equal(guard(op,body,json),undefined);
});
