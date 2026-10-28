// [Kota 29 Eki 2026] Aktif süre isteği hata alınca saniyede bir tekrar edilmemeli.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(status){
 let now=1e12,tick=null,calls=0;const listeners={};
 const RealDate=Date;class FakeDate extends RealDate{static now(){return now;}}
 const ctx={console:{warn(){}},crypto,AbortController,setTimeout:(f,ms)=>0,clearTimeout(){},Date:FakeDate,performance:{now:()=>now},navigator:{onLine:true},
  localStorage:{getItem:()=>'tok'},aktifOgrenciAdi:'learner',apiURL:'/api',
  document:{hidden:false,addEventListener:(t,f)=>{(listeners[t]=listeners[t]||[]).push(f);},getElementById:id=>id==='panel-alani'?{style:{display:'block'}}:null,dispatchEvent(){}},
  setInterval:f=>{tick=f;return 1;},
  fetch:async()=>{calls++;return {ok:false,status,json:async()=>({ok:false,mesaj:'x'})};}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/active-time.js','utf8'),ctx);
 return {async run(sec){for(let i=0;i<sec;i++){now+=1000;tick();await new Promise(r=>setImmediate(r));}},get calls(){return calls},login(){for(const f of listeners['dm:login']||[])f();}};
}
test('a 403 stops activeTime until the next login',async()=>{
 const h=load(403);await h.run(600);assert.equal(h.calls,1,'10 dakikada tek istek');
 h.login();await h.run(5);assert.equal(h.calls,2,'yeni girişte bir kez daha denenir');
});
test('server errors back off instead of retrying every second',async()=>{
 const h=load(503);await h.run(600);assert(h.calls<=6,'10 dakikada en fazla birkaç deneme: '+h.calls);
});
