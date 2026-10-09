const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const src=fs.readFileSync('ingilizce/harf-bahcesi.js','utf8');
test('Harf Bahcesi 12-word rounds have consistent selection and progress',()=>{
 assert.match(src,/OC\.kelimeSec\(KEY,available,12\)/);
 assert.match(src,/available\.length<12/);
 assert.match(src,/\$\{s\.done\}\/12 kelime/);
 assert.match(src,/progress max="12"/);
 assert.match(src,/s\.index\+2>=12/);
 assert.match(src,/result\.dogru===12/);
 assert.doesNotMatch(src,/8 kelime/);
});
