const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('ingilizce/index.html','utf8');
const blocks=[...html.matchAll(/<script\b([^>]*)>([^]*?)<\/script>/gi)].filter(m=>!m[1].includes('src=')).map(m=>m[2]);
function fixture(){
 const store=new Map(),calls=[],notices=[];
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i],get length(){return store.size}};
 const c={Response,URL,Date,Promise,Set,Map,localStorage:storage,sessionStorage:storage,apiURL:'https://example.test/api',aktifOgrenciAdi:'Student',navigator:{onLine:true},location:{href:'http://localhost/',protocol:'http:'},document:{getElementById:()=>null,createElement:()=>({setAttribute(){},style:{},remove(){}}),body:{appendChild:e=>notices.push(e)},querySelectorAll:()=>[]},setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},window:{fetch:async(u)=>{calls.push(String(u));return new Response(JSON.stringify(String(u).includes('rubrikKaydet')?{status:'success',mail:'kuyrukta',email:'test'}:{value:calls.length}),{status:200})},addEventListener(){}}};
 vm.createContext(c);return {c,calls,notices};
}
test('one rubric save produces one notice and one data refresh',async()=>{
 const f=fixture(),handlers=blocks.filter(b=>b.includes('RUBRİK: kaydın sonucu ekranda görünsün'));
 assert.equal(handlers.length,1);vm.runInContext(handlers[0],f.c);
 await f.c.window.fetch(f.c.apiURL+'?islem=rubrikKaydet');await new Promise(r=>setTimeout(r,30));
 assert.equal(f.notices.length,1);assert.equal(f.calls.filter(x=>x===f.c.apiURL).length,1);
});
test('energy refresh reaches the online budget and an explicit refresh never falls back to stale data',async()=>{
 const f=fixture();vm.runInContext(blocks.find(b=>b.includes("PREFIX_YANIT = 'diji_yanit_v1_'")),f.c);
 const url=f.c.apiURL+'?islem=enerjiDurumuGetir&ogrenci=Student';
 await f.c.window.fetch(url);await new Promise(r=>setTimeout(r,20));
 const r=await f.c.window.fetch(url+'&_=123');assert.equal(f.calls.length,2);assert.equal((await r.json()).value,2);
 f.c.window.fetch=()=>{throw Error('unused');};
});
test('the newer external activity dialog is the single static target',()=>{
 const markup=html.replace(/<script\b[^>]*>[^]*?<\/script>/gi,'');
 for(const id of ['disLinkOverlay','disLinkBaslikAlani','disLinkYorumAlani','disLinkYukleniyorAlani','disLinkEngelliUyari','disLinkYeniSekmeBtn','disLinkIframe'])assert.equal([...markup.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id);
});
test('consolidated XP preserves the final legacy adjustments and does not change the canonical base adder',()=>{
 const source=blocks.find(b=>b.includes('const ADIL =')&&b.includes('window.yoXpEkle ='));
 const start=source.indexOf('  let orgXp ='),end=source.indexOf('  /* ================= 5)',start),code=source.slice(start,end);
 const c={window:{dmBaseXpAdd:(xp,gold)=>({xp,gold}),seriCarpani:()=>1,dmGameBonusFlags:()=>({})},aktif:()=>false,document:{querySelector:()=>null},Date,ADIL:{tavanDogru:12,saniyeBasi:6},oyunBas:0};vm.createContext(c);vm.runInContext(code,c);
 assert.deepEqual(c.window.yoXpEkle(20,0),{xp:30,gold:0});
 assert.deepEqual(c.window.yoXpEkle(0,5),{xp:0,gold:3});
 c.window.seriCarpani=()=>1.5;c.aktif=k=>k==='tab-buyuakademisi';c.window.dmGameBonusFlags=()=>({xpBoost:true,goldBoost:true});
 assert.deepEqual(c.window.yoXpEkle(10,2),{xp:40,gold:12});
 assert.deepEqual(c.window.dmBaseXpAdd(10,2),{xp:10,gold:2});
});
test('one account load is shared, device lists survive, and an account switch rejects a late response',async()=>{
 const base=blocks.find(b=>b.includes('async function yoSunucudanAl()'));
 const a=base.indexOf('        async function yoSunucudanAl()'),b=base.indexOf('        async function yoTumVeri()',a);
 const final=blocks.find(b=>b.includes('const loadPending = new Map()')),x=final.indexOf('  let orgAl = window.yoSunucudanAl;'),y=final.indexOf("  window.addEventListener('online'",x);
 let resolve,calls=0;const c={yoIsim:'Student',yo:{guncelleme:0,gk:['local']},apiURL:'https://example.test/api',fetch:()=>{calls++;return new Promise(r=>resolve=r)},yoVarsayilan:()=>({}),yoGunKontrol(){},yoArayuzTazele(){},DijiProgressRules:{migrate(){}},localStorage:{setItem(){}},sessionStorage:{removeItem(){}},isimAl:()=>c.yoIsim,kucuk:x=>String(x).toLowerCase(),yoVar:()=>c.yo,benimsendi:new Set(),zorlaBekleyen:new Set(['student']),loadRetries:new Map(),loadRetry:null,clearTimeout(){},setTimeout:()=>0,document:{dispatchEvent(){}},Event,Map,Promise};c.window=c;vm.createContext(c);
 vm.runInContext(base.slice(a,b)+final.slice(x,y),c);
 const p=c.yoSunucudanAl();assert.equal(c.yoSunucudanAl(),p);assert.equal(calls,1);
 resolve({ok:true,headers:{get:()=>null},json:async()=>({deger:JSON.stringify({guncelleme:2,altin:40})})});assert.equal(await p,true);assert.equal(c.yo.altin,40);assert.deepEqual(c.yo.gk,['local']);assert(c.benimsendi.has('student'));
 const late=c.yoSunucudanAl();c.yoIsim='Other';c.yo={guncelleme:0,altin:7};resolve({ok:true,headers:{get:()=>null},json:async()=>({deger:JSON.stringify({guncelleme:3,altin:999})})});assert.equal(await late,false);assert.equal(c.yo.altin,7);
});
test('optional games load once on demand and a failed file can be retried without duplicating earlier modules',async()=>{
 const files=[],observer=[],c={window:{},document:{getElementById:()=>({classList:{contains:()=>false}}),createElement:()=>({remove(){}}),head:{append(el){files.push(el.src);Promise.resolve().then(()=>{
   if(el.src.startsWith('harf'))c.window.harfBahcesiAc=()=>42;
   if(el.src.startsWith('meteor')&&fail){fail=false;el.onerror();return;}
   el.onload();
 })}},dispatchEvent(){}},MutationObserver:class{constructor(fn){observer.push(fn)}observe(){}},Event,Set,Promise};let fail=true;vm.createContext(c);vm.runInContext(fs.readFileSync('ingilizce/lazy-games.js','utf8'),c);
 assert.equal(files.length,0);await assert.rejects(c.window.dmLazyGames.ready());await c.window.dmLazyGames.ready();await c.window.dmLazyGames.ready();
 assert.equal(files.filter(x=>x.startsWith('harf')).length,1);assert.equal(files.filter(x=>x.startsWith('meteor')).length,2);assert.equal(files.length,7);assert.equal(files.filter(x=>x.startsWith('solo-arcade')).length,1);assert.equal(c.window.harfBahcesiAc(),42);
});
