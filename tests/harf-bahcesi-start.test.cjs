const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const flush=()=>new Promise(r=>setImmediate(r));
const all=['dog','cat','bird','horse','lion','tiger','rabbit','fish','duck','goat','sheep','mouse'];
function fixture(n,teacher,energy){
 const dom=new JSDOM('<body></body>',{url:'https://game.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,calls=[];let result;
 w.aktifOgrenciAdi='Ali';w.apiURL='/api';w.dmTeacherPortalMode=teacher;w.genelEnerjiKalan=25;w.genelOyunGirisEngelliMi=()=>false;
 w.genericSinifGuncelle=(_n,_id,cb)=>cb([1]);w.sinifGridKisitlamaUygula=(_id,set,cb)=>{set(2);cb(2)};
 w.oyunHavuzGetir=()=>all.slice(0,n).map(en=>({en,tr:en,sinif:2,unite:1}));
 w.OC={aktif:{runId:'run'},kelimeSec:(_k,p)=>p.slice(0,12),basla(){},puan:()=>0,sure:()=>0,yanlis(){},sonlandir:()=>({dogru:0,yanlis:n,puan:0,sure:0})};w.genelSonucEkraniGoster=o=>result=o;
 w.fetch=async(_url,o)=>{const b=o?.body?JSON.parse(o.body):{};calls.push(b);return {ok:true,json:async()=>b.islem==='enerjiDegistir'?energy:b.islem?.endsWith('Kaydet')?{status:'success'}:[]};};
 w.eval(fs.readFileSync('ingilizce/harf-bahcesi.js','utf8'));w.harfBahcesiAc();return {w,calls,result:()=>result};
}
test('small and full gardens finish their actual deck and show only the shared result',async()=>{
 for(const n of [1,2,12]){const f=fixture(n,true,{ok:true,rankingOnly:true,eklenen:0}),w=f.w;w.document.querySelector('[data-start]').click();await flush();assert(w.document.querySelector('.hb-playing'));assert.match(w.document.querySelector('.hb-meta').textContent,new RegExp('0/'+n));assert.deepEqual(JSON.parse(JSON.stringify(w.dmHarfBahcesiScope())),{classNo:2,units:[1]});
 for(let i=0;i<n;i++){w.document.querySelector('[data-skip]').click();w.document.querySelector('[data-next]').click();await flush();}assert(f.result());assert.equal(f.result().yanlis,n);assert.equal(w.document.getElementById('harfBahcesiOverlay'),null);assert.equal(f.calls.filter(x=>x.islem==='harfBahcesiLiderlikKaydet').length,1);w.close();}
});
test('zero charge is accepted only for an authoritative classroom response; ordinary players still require -3',async()=>{
 for(const [teacher,response,starts]of [[false,{ok:true,eklenen:0},false],[true,{ok:true,eklenen:0},false],[true,{ok:false,rankingOnly:true,eklenen:0},false],[false,{ok:true,eklenen:-3},true]]){const f=fixture(2,teacher,response);f.w.document.querySelector('[data-start]').click();await flush();assert.equal(!!f.w.document.querySelector('.hb-playing'),starts);f.w.close();}
});
test('an empty eligible pool gives guidance before any energy request',async()=>{const f=fixture(0,true,{ok:true});f.w.document.querySelector('[data-start]').click();await flush();assert.match(f.w.document.querySelector('.hb-status').textContent,/Başka bir ünite seç/);assert.equal(f.calls.length,0);f.w.close();});
