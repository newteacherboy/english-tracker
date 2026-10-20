'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('ingilizce/index.html','utf8');
function scriptAt(marker){const i=html.indexOf(marker);assert(i>0);const start=html.lastIndexOf('<script>',i)+8;return html.slice(start,html.indexOf('</script>',i));}
function fixture(){
 const sent=[],store={getItem:()=>null,setItem(){},removeItem(){}};
 const w={console,Response,URLSearchParams,Event,CustomEvent,location:{origin:'https://app.test',pathname:'/ingilizce/',search:''},navigator:{},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},dispatchEvent:()=>true},localStorage:store,sessionStorage:store,setInterval:()=>0,setTimeout:()=>0,clearTimeout(){},addEventListener(){},aktifOgrenciAdi:'Ece',yoIsim:'Ece',yo:{guncelleme:1},yoSunucudanAl:async()=>true};
 w.window=w;w.fetch=async(url,opt)=>{sent.push({url,opt});if(String(url).includes('ekVeriGetir'))return Response.json({deger:JSON.stringify({guncelleme:100})});return Response.json({ok:true,status:'success',awards:[],yo:{guncelleme:101}});};
 vm.createContext(w);vm.runInContext(scriptAt('  const DUELLO_ANAHTAR ='),w);vm.runInContext(scriptAt('  const benimsendi = new Set();'),w);return {w,sent};
}
test('production fetch layers allow the route and report library to reach the server',async()=>{
 const {w,sent}=fixture();
 for(const op of ['parkurDurum','routeGraduations','seviyeDurumu']){const r=await w.fetch('https://app.test/api',{method:'POST',body:JSON.stringify({islem:op,ogrenci:'Ece'})});assert.equal(r.status,200);assert.equal((await r.json()).ok,true);}
 assert.equal(sent.length,3);
});
test('initial member read and first save work through both real fetch closures',async()=>{
 const {w,sent}=fixture();await w.fetch('https://app.test/api?islem=ekVeriGetir&ogrenci=Ece&anahtar=yo');await w.yoSunucudanAl();
 const r=await w.fetch('https://app.test/api',{method:'POST',body:JSON.stringify({islem:'ekVeriKaydet',ogrenci:'Ece',anahtar:'yo',deger:JSON.stringify({guncelleme:1})})});assert.equal(r.status,200);assert.equal((await r.json()).status,'success');assert.equal(JSON.parse(sent.at(-1).opt.body)._taban,100);
});
