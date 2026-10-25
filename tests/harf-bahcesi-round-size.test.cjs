const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const src=fs.readFileSync('ingilizce/harf-bahcesi.js','utf8');
test('Harf Bahcesi uses up to 12 single-word rounds with actual deck progress',()=>{
 assert.match(src,/OC\.kelimeSec\(KEY,available,12\)/);
 assert.match(src,/!available\.length/);
 assert.match(src,/\$\{s\.done\}\/\$\{s\.words\.length\} kelime/);
 assert.match(src,/progress max="\$\{s\.words\.length\}"/);
 assert.match(src,/s\.index\+1>=s\.words\.length/); assert.match(src,/state\.pair=state\.words\.slice\(state\.index,state\.index\+1\)/);
 assert.match(src,/result\.dogru===s\.words\.length/);
 assert.doesNotMatch(src,/8 kelime/);
});
