const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){const ctx={document:{querySelector:()=>null,readyState:'complete'},Math,Set,console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/kelime-golu.js','utf8'),ctx);return ctx.dmKelimeGoluCore;}
const bank=Array.from({length:20},(_,i)=>({ingilizce:'word'+i,turkce:'anlam'+i,sinif:5,unite:2}));
test('all four goal corners have distinct answers from the selected Word Bank scope',()=>{
 const c=load();for(let turn=0;turn<80;turn++)for(const word of bank){const options=c.options(word,bank);assert.equal(options.length,4);assert.equal(new Set(options.map(c.norm)).size,4);assert.equal(options.filter(x=>x===word.turkce).length,1);assert.ok(options.every(a=>bank.some(w=>w.turkce===a)));}
});
test('classroom decks have equal length and different questions at the same shot',()=>{
 const c=load();for(let count=4;count<=20;count++){for(let run=0;run<30;run++){const [a,b]=c.decks(bank.slice(0,count));assert.equal(a.length,Math.min(12,count));assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.notEqual(a[i].ingilizce,b[i].ingilizce);assert.equal(new Set(a.map(w=>w.ingilizce)).size,a.length);}}
});
test('empty meanings and duplicate English words cannot create invalid goal questions',()=>{
 const c=load();const selected=c.words([...bank,bank[0],{ingilizce:' WORD0 ',turkce:'başka anlam'},{ingilizce:'missing',turkce:''},{ingilizce:'',turkce:'eksik'}]);assert.equal(selected.length,bank.length);assert.throws(()=>c.options(bank[0],[bank[0],bank[0],bank[0]]),/Dört farklı/);
});
