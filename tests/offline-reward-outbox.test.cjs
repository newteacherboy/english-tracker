// Rewards earned without a connection are kept on the device and sent, in order, once it returns.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../ingilizce/ekonomi.js','utf8');

function fixture({online=true,fail=false,owner='Ece'}={}){
 const store=new Map(),sent=[],applied=[];const listeners={};
 let failing=fail;
 const ctx={
  console,JSON,Math,Date,Object,Number,String,Array,Promise,Error,
  setTimeout:(fn)=>{return 0;},clearTimeout(){},setInterval(){return 0;},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  navigator:{get onLine(){return online;}},
  document:{hidden:false,addEventListener(t,f){(listeners[t]=listeners[t]||[]).push(f)},dispatchEvent(){return true}},
  CustomEvent:class{constructor(t,o){this.type=t;this.detail=o&&o.detail}},
  aktifOgrenciAdi:owner,yo:{altin:10,ekoV:2},siniftaOynananOgrenci:'',
  yoKaydet(){},yoArayuzTazele(){},
 };
 ctx.window=ctx;ctx.window.addEventListener=(t,f)=>{(listeners[t]=listeners[t]||[]).push(f)};
 ctx.window.dmApplyRewardState=(y,o)=>{applied.push([y&&y.totalXp,o]);return true;};
 ctx.fetch=async(url,opt)=>{
  const body=JSON.parse(opt.body);sent.push(body);
  if(failing)throw new Error('network down');
  return {json:async()=>({ok:true,eklenen:body.altin||0,xp:body.xp||0,yo:{totalXp:500,dmRewardVersion:9},ekonomi:{altin:99}})};
 };
 vm.createContext(ctx);vm.runInContext(src,ctx);
 return {ctx,sent,applied,store,
  setOffline:v=>{online=!v;failing=v;},
  setOwner:o=>{ctx.aktifOgrenciAdi=o;},
  queue:()=>{try{return JSON.parse(ctx.localStorage.getItem('dm_odul_kuyrugu')||'[]')}catch{return []}}};
}

test('a reward earned offline is queued on the device, not lost',async()=>{
 const f=fixture();f.setOffline(true);
 const r=await f.ctx.dmOdulYaz(10,2,'etkinlik','12');
 assert.equal(r.kuyrukta,true,'child is told it is saved');
 assert.equal(f.queue().length,1);
 assert.equal(f.queue()[0].veri.neden,'etkinlik');assert.equal(f.queue()[0].veri.anahtar,'12');
 assert.equal(f.ctx.dmEkonomi.kuyrukSayisi(),1);
});

test('the queue is sent in order when the connection returns, and the wallet is applied',async()=>{
 const f=fixture();f.setOffline(true);
 await f.ctx.dmOdulYaz(10,2,'etkinlik','1');
 await f.ctx.dmOdulYaz(10,2,'video','v9');
 assert.equal(f.queue().length,2);
 f.setOffline(false);f.sent.length=0;            // only count what the flush sends
 const n=await f.ctx.dmEkonomi.kuyrukBosalt();
 assert.equal(n,2);assert.equal(f.queue().length,0,'queue drains');
 const ops=f.sent.filter(b=>b.is==='odulTalep');
 assert.deepEqual(ops.map(o=>o.anahtar),['1','v9'],'sent in the order they were earned');
 assert.equal(f.applied.length>=1,true,'server wallet applied');
});

test('the same keyed reward is never queued twice',async()=>{
 const f=fixture();f.setOffline(true);
 await f.ctx.dmOdulYaz(10,2,'video','v1');
 await f.ctx.dmOdulYaz(10,2,'video','v1');
 assert.equal(f.queue().length,1,'duplicate key ignored');
 await f.ctx.dmOdulYaz(10,2,'video','v2');
 assert.equal(f.queue().length,2);
});

test('a still-offline flush keeps the queue for later',async()=>{
 const f=fixture();f.setOffline(true);
 await f.ctx.dmOdulYaz(10,2,'etkinlik','a');
 const n=await f.ctx.dmEkonomi.kuyrukBosalt();
 assert.equal(n,0);assert.equal(f.queue().length,1,'nothing is dropped while offline');
});

test('each student has their own queue',async()=>{
 const f=fixture();f.setOffline(true);
 await f.ctx.dmOdulYaz(10,2,'etkinlik','a');
 f.setOwner('Mert');
 await f.ctx.dmOdulYaz(10,2,'etkinlik','b');
 assert.equal(f.queue().length,2);
 assert.equal(f.ctx.dmEkonomi.kuyrukSayisi(),1,'only the active student counts');
 f.setOffline(false);f.sent.length=0;
 await f.ctx.dmEkonomi.kuyrukBosalt();
 const ops=f.sent.filter(b=>b.is==='odulTalep');
 assert.deepEqual(ops.map(o=>o.anahtar),['b'],'another student queue is left alone');
});

test('entries older than a week are dropped instead of replayed',async()=>{
 const f=fixture();
 f.ctx.localStorage.setItem('dm_odul_kuyrugu',JSON.stringify([
  {id:'old',sahip:'ece',is:'odulTalep',veri:{neden:'video',anahtar:'x'},at:Date.now()-8*86400000},
  {id:'new',sahip:'ece',is:'odulTalep',veri:{neden:'video',anahtar:'y'},at:Date.now()}]));
 assert.equal(f.ctx.dmEkonomi.kuyrukSayisi(),1,'stale entry ignored');
 await f.ctx.dmEkonomi.kuyrukBosalt();
 const ops=f.sent.filter(b=>b.is==='odulTalep');
 assert.deepEqual(ops.map(o=>o.anahtar),['y']);
});

test('a server refusal is not retried forever',async()=>{
 const f=fixture();f.setOffline(true);
 await f.ctx.dmOdulYaz(10,2,'etkinlik','z');
 f.setOffline(false);
 f.ctx.fetch=async(url,opt)=>{f.sent.push(JSON.parse(opt.body));return {json:async()=>({ok:false,mesaj:'Önce günün 3 görevini tamamla.'})};};
 await f.ctx.dmEkonomi.kuyrukBosalt();
 assert.equal(f.queue().length,0,'refused entry leaves the queue');
});
