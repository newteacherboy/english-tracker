const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../ingilizce/harf-adasi.js'),'utf8');
const w={};
vm.runInNewContext(src,{window:w,document:{getElementById:()=>null},Math,Set,Date,clearInterval,clearTimeout,setTimeout,setInterval});
const core=w.dmHarfAdasiCore;
test('each keyboard includes every required letter exactly once and never duplicates choices',()=>{
 for(const word of ['CAT','STRAWBERRY','ELEPHANT','NATIONAL DAY','INTERNATIONAL','JAZZ','HOUSE']){
   const keys=core.makeKeys(word,()=>0.4);
   assert.equal(keys.length,new Set(keys).size);
   assert(keys.length>=12&&keys.length<=26);
   for(const ch of new Set(word.replace(/[^A-Z]/g,'').split('')))assert(keys.includes(ch));
 }
});
test('repeated letters are revealed with one correct choice',()=>{
 assert(core.solved('BANANA',new Set(['B','A','N'])));
 assert(!core.solved('BANANA',new Set(['B','A'])));
 assert(core.solved('ICE-CREAM',new Set(['I','C','E','R','A','M'])));
});
test('boost entitlement follows level thresholds',()=>{
 assert.deepEqual([1,14,15,19,20,29,30,40].map(core.quota),[0,0,1,1,2,2,3,3]);
});
test('new source is isolated from energy debit and remote reward writes',()=>{
 assert(!src.includes('enerjiDegistir'));
 assert(!src.includes('LiderlikKaydet'));
 assert.match(src,/originalFinish/);assert.match(src,/window\.asmacaSonrakiKelime=next/);
});
