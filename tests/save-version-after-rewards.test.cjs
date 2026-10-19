// After a server-side reward advances the stored progress version, the next device save must carry
// that version (no "Bu cihazdaki veri eski" rejection on the first purchase).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8');
const i=html.indexOf('  const benimsendi = new Set();'),s=html.lastIndexOf('<script>',i),e=html.indexOf('</script>',i);
const block=html.slice(s+8,e);
function fixture(){
 const sent=[];let serverVersion=1000;
 const Response=class{constructor(body,init={}){this._b=body;this.status=init.status||200;this.ok=this.status>=200&&this.status<300;this.headers={get:()=>null};}async json(){return JSON.parse(this._b);}clone(){return new Response(this._b,{status:this.status});}};
 const network=async(url,opt)=>{
  const u=typeof url==='string'?url:'';const body=opt&&opt.body?JSON.parse(opt.body):null;sent.push({u,body});
  if(/islem=ekVeriGetir/.test(u))return new Response(JSON.stringify({deger:JSON.stringify({guncelleme:serverVersion,altin:10})}));
  if(body&&body.islem==='ekonomi'){serverVersion+=50;return new Response(JSON.stringify({ok:true,eklenen:30,yo:{guncelleme:serverVersion,altin:40}}));}
  if(body&&body.islem==='ekVeriKaydet'){return (Number(body._taban)>=serverVersion)?new Response(JSON.stringify({status:'success'})):new Response(JSON.stringify({status:'eski'}),{status:409});}
  return new Response('{}');
 };
 const w={Response,console,setTimeout:(f)=>0,clearTimeout(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}},sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},document:{addEventListener(){},querySelector(){return null},getElementById(){return null}},aktifOgrenciAdi:'Ece',yoIsim:'Ece',yo:{guncelleme:1},Map,Set,JSON,Object,Number,String,Promise,Date,Math,RegExp,decodeURIComponent,Error,Event:class{constructor(t){this.type=t}},CustomEvent:class{constructor(t,o){this.type=t;this.detail=o?.detail}}};w.document.dispatchEvent=()=>true;
 w.window=w;w.fetch=network;w.addEventListener=()=>{};w.yoSunucudanAl=async()=>true;w.yoVar=()=>true;
 vm.createContext(w);vm.runInContext(block,w);
 // Mark the account as accepted, as a completed first load would.
 return {w,sent,get version(){return serverVersion;}};
}
test('a reward response advances the version sent with the next save',async()=>{
 const f=fixture(),w=f.w;
 await w.fetch('https://x/api?islem=ekVeriGetir&ogrenci=Ece&anahtar=yo',{});
 await w.yoSunucudanAl(); // the app's first-load path accepts the server copy for this account
 const reward=await w.fetch('https://x/api',{method:'POST',body:JSON.stringify({islem:'ekonomi',is:'odulTalep',ogrenci:'Ece'})});assert.equal(reward.ok,true);
 const save=await w.fetch('https://x/api',{method:'POST',body:JSON.stringify({islem:'ekVeriKaydet',ogrenci:'Ece',anahtar:'yo',deger:JSON.stringify({guncelleme:Date.now()})})});
 const last=f.sent.filter(x=>x.body&&x.body.islem==='ekVeriKaydet').pop();
 assert.equal(Number(last.body._taban),f.version,'save carries the server version produced by the reward');
 assert.equal(save.status,200,'save is not rejected as stale');
});
test('the version only moves forward',async()=>{
 const src=block;assert.match(src,/Math\.max\(Number\(taban\[who\]\)\|\|0,ver\)/);
 assert.match(src,/ekonomi\|dersTestSonucKaydet\)"\//);
});
