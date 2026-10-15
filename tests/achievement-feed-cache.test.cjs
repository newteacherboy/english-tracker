const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('ingilizce/index.html','utf8'),code=html.slice(html.indexOf('let maAkisVeri = []'),html.indexOf('function maZamanOnce'));
test('returning to a fresh cached feed does not leave a resolved promise blocking later refreshes',async()=>{
 let now=100000,calls=0,cache=new Map();const c={Date:{now:()=>now},localStorage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)},navigator:{onLine:true},apiURL:'/api',console,fetch:async(_u,options)=>{assert.equal(options.cache,'no-store');calls++;await new Promise(r=>setImmediate(r));return {ok:true,json:async()=>({liste:[{k:String(calls),metin:'Yeni rozet'}]})}}};
 vm.createContext(c);vm.runInContext(code,c);await c.maAkisYukle();assert.equal(calls,1);await c.maAkisYukle();assert.equal(calls,1);now+=31000;await Promise.all([c.maAkisYukle(),c.maAkisYukle()]);assert.equal(calls,2);assert.equal(vm.runInContext('maAkisVeri[0].k',c),'2');
});
