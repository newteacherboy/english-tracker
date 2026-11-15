'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const file='ingilizce/app-js/i01-raporlarimac.js',source=fs.readFileSync(file,'utf8');
function fn(name,text=source){const start=text.indexOf('function '+name+'(');assert(start>=0,name);const rest=text.slice(start),next=rest.slice(rest.indexOf('{')+1).search(/\n\s*(?:async\s+)?function\s/);assert(next>=0,name);return rest.slice(0,rest.indexOf('{')+1+next);}
const helpers=fn('oyunSeciliUniteleriGetir')+fn('oyunKurulumSeciminiOku');
function dom(prefix){const d=new JSDOM('<div id="'+prefix+'SinifGrid"><button class="sinif-btn active" data-gl-grade="5">5</button></div><div id="'+prefix+'UniteBox"></div><input id="'+prefix+'IsimInput" value="Öğretmen"><button id="trenBaslaBtn">Başlat</button>',{runScripts:'outside-only'});d.window.dmTeacherPortalMode=true;d.window.eval(helpers);return d;}
function chip(w,prefix,unit,on=true){const b=w.document.createElement('button');b.className='unite-chip'+(on?' selected':'');b.dataset.unit=unit;b.innerHTML='<span>'+unit+'. Ünite</span><span>Unit title</span>';w.document.getElementById(prefix+'UniteBox').append(b);return b;}
for(const [prefix,update,change]of [['ky','kyUniteSecimleriniGuncelle','kySinifGuncelle'],['jp','jpUniteSecimleriniGuncelle','jpSinifGuncelle'],['bosluk','boslukUniteSecimGuncelle','boslukSinifGuncelle']]){
 test(prefix+': native unit clicks keep actual sparse IDs after title decoration and DOM reordering',()=>{
  const d=dom(prefix),w=d.window;try{
   w.masterKelimeHavuzu=[2,5,9].map(unite=>({sinif:5,unite}));w.eval(fn(change)+fn(update));w[change](5);
   const box=w.document.getElementById(prefix+'UniteBox');assert.deepEqual([...box.children].map(b=>b.dataset.unit),['2','5','9']);
   box.children[0].click();box.children[1].click();assert.deepEqual(Array.from(w[prefix+'SecilenUniteler']),[5]);
   box.prepend(box.lastElementChild);box.querySelector('[data-unit="9"]').click();assert.deepEqual(Array.from(w[prefix+'SecilenUniteler']),[9,5]);
   for(const b of box.children)b.innerHTML='<span>Decorated title</span>';
   w[update]();assert.deepEqual(Array.from(w[prefix+'SecilenUniteler']),[9,5]);
  }finally{w.close();}
 });
}
test('shared native unit picker preserves IDs when decorators add extra child nodes',()=>{
 const d=dom('es'),w=d.window;try{w.masterKelimeHavuzu=[2,5,9].map(unite=>({sinif:5,unite}));w.eval(fn('genericSinifGuncelle'));let selected;w.genericSinifGuncelle(5,'esUniteBox',u=>selected=Array.from(u));const box=w.document.getElementById('esUniteBox');box.prepend(w.document.createElement('span'));box.querySelector('[data-unit="5"]').click();assert.deepEqual(selected,[2,5]);}finally{w.close();}
});
for(const [prefix,start,script,key]of [
 ['ky','kelimeYarismasiBaslat',file,'ky'],['jp','jeopardyOyunuBaslat',file,'jp'],['bosluk','boslukOyunuBaslat',file,'bosluk'],['hafiza','hafizaOyunuBaslat',file,'hafiza'],['yagmur','yagmurOyunuBaslat',file,'yagmur'],['kelimebul','kelimebulOyunuBaslat',file,'kelimebul'],['es','esOyunuBaslat','ingilizce/app-js/i16-eslestirme-oyunu.js','eslestirme'],['tren','trenOyunuBaslat','ingilizce/app-js/i17-kelime-treni.js','tren']]){
 test(prefix+': teacher Start uses visible class and multiple units despite an empty cached selection',async()=>{
  const d=dom(prefix),w=d.window,alerts=[],reached=Error('question selection reached');let pool;
  try{
   chip(w,prefix,2);chip(w,prefix,9);chip(w,prefix,5,false);
   w[prefix+'AktifSinif']=1;w[prefix+'SecilenUniteler']=[];
   w.masterKelimeHavuzu=[1,5].flatMap(sinif=>[2,5,9].flatMap(unite=>Array.from({length:6},(_,i)=>({sinif,unite,ingilizce:prefix==='tren'?'I like apple':'apple'+String.fromCharCode(97+unite,97+i),turkce:'elma',en:'apple'+String.fromCharCode(97+unite,97+i),tr:'elma',id:sinif+':'+unite+':'+i}))));
   w.genelOyunGirisEngelliMi=()=>false;w.alert=x=>alerts.push(x);w.esEl=w.trEl=id=>w.document.getElementById(id);w.ES_KELIME=w.TREN_SORU=12;
   w.OC={SORU:12,kelimeSec:(game,words)=>{assert.equal(game,key);pool=Array.from(words);throw reached;}};
   w.eval(fn('oyunHavuzGetir'));w.eval((prefix==='tren'?'async ':'')+fn(start,fs.readFileSync(script,'utf8')));
   await assert.rejects(async()=>w[start](),e=>e===reached);
   assert.deepEqual(alerts,[]);assert.equal(pool.length,12);
   assert.equal(w[prefix+'AktifSinif'],5);assert.deepEqual(Array.from(w[prefix+'SecilenUniteler']),[2,9]);
   assert(pool.every(x=>x.sinif===5&&[2,9].includes(x.unite)));
  }finally{w.close();}
 });
}
test('an explicitly empty selection stays empty; student server levels ignore hidden native selectors',()=>{
 const d=dom('ky'),w=d.window;try{
  chip(w,'ky',2,false);let r=w.oyunKurulumSeciminiOku('ky',1,[2]);assert.deepEqual(Array.from(r.uniteler),[]);
  w.dmTeacherPortalMode=false;w.aktifOgrenciAdi='student';w.dmSoloLevels={active:{number:3,classNo:1,units:[7]}};
  r=w.oyunKurulumSeciminiOku('ky',1,[7]);assert.equal(r.sinif,1);assert.deepEqual(Array.from(r.uniteler),[7]);
  w.dmSoloLevels.active=null;r=w.oyunKurulumSeciminiOku('ky',1,[7]);assert.equal(r.sinif,1);assert.deepEqual(Array.from(r.uniteler),[7]);
 }finally{w.close();}
});
