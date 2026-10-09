const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('classic games share unit rotation with 12 questions',()=>{
 const html=fs.readFileSync('ingilizce/index.html','utf8');
 const start=html.indexOf('window.OC = (function () {');assert.ok(start>=0);
 const end=html.indexOf('})();',start)+5;assert.ok(end>start);
 const storage={};const localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=v;}};
 const context={window:{fetch:()=>{}},localStorage,setTimeout:()=>{},document:{addEventListener:()=>{},getElementById:()=>null},aktifOgrenciAdi:'smoke-student',siniftaOynananOgrenci:'' ,yoHazirMi:()=>false};
 vm.createContext(context);vm.runInContext(html.slice(start,end),context);
 const pool=Array.from({length:30},(_,i)=>({ingilizce:'test word '+i,turkce:'anlam '+i,sinif:5,unite:1}));
 const get=x=>x.ingilizce;
 const a=context.window.OC.kelimeSec('kelime',pool,12,{anahtar:get});
 const b=context.window.OC.kelimeSec('hafiza',pool,12,{anahtar:get});
 const c=context.window.OC.kelimeSec('tren',pool,12,{anahtar:get});
 assert.equal(context.window.OC.SORU,12);
 assert.equal(a.length,12);assert.equal(b.length,12);assert.equal(c.length,12);
 assert.equal(new Set([...a,...b].map(get)).size,24);
 assert.ok(storage['oc_gk_smoke-student']);
});
