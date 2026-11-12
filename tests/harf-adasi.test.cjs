const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../ingilizce/harf-adasi.js'),'utf8');
const w={};
vm.runInNewContext(src,{window:w,document:{getElementById:()=>null},Math,Set,Date,clearInterval,clearTimeout,setTimeout,setInterval});
const core=w.dmHarfAdasiCore;
test('keyboard holds only the word letters, repeats included (Sade Ada, 12 Kas 2026)',()=>{
 for(const word of ['CAT','STRAWBERRY','ELEPHANT','NATIONAL DAY','INTERNATIONAL','JAZZ','HOUSE']){
   const keys=core.makeKeys(word,()=>0.4),letters=word.replace(/[^A-Z]/g,'').split('');
   assert.equal(keys.length,letters.length);
   assert.deepEqual([...keys].sort(),[...letters].sort());
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
