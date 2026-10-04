const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../ingilizce/harf-bahcesi.js','utf8');
const win={};vm.runInNewContext(source,{window:win,document:{querySelector:()=>null},setTimeout:()=>{},Math,Set,Object});
const {pool,board,adjacent,en}=win.dmHarfBahcesiCore;
test('word pool removes duplicates, phrases, punctuation, empty translations and overlong words',()=>{
 const p=pool([{en:' CAT ',tr:'kedi'},{ingilizce:'cat',turkce:'kedi'},{en:'ice cream',tr:'dondurma'},{en:'mother-in-law',tr:'kayınvalide'},{en:'dog',tr:''},{en:'abcdefghijklmn',tr:'uzun'},{en:'school',tr:'okul'}]);assert.deepEqual(Array.from(p,en),['cat','school']);
});
test('every generated word has a contiguous, nonoverlapping solution even at maximum length',()=>{
 for(let n=0;n<1000;n++){const words=[{en:'abcdefghijkl'},{en:'mnopqrstuvwx'}],g=board(words),used=new Set();assert.equal(g.letters.length,24);g.paths.forEach((p,j)=>{assert.equal(p.map(i=>g.letters[i]).join(''),words[j].en);p.forEach((i,k)=>{assert(!used.has(i));used.add(i);if(k)assert(adjacent(p[k-1],i));});});}
});
test('row wrapping and repeated cells cannot be used as adjacent letters',()=>{assert(!adjacent(5,6));assert(!adjacent(2,2));assert(adjacent(5,11));assert(adjacent(5,10));assert(!adjacent(0,14));});
