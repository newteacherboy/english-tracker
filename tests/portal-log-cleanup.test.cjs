'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../ingilizce/index.html'),'utf8');
test('production portal omits obsolete cache diagnostic console logs',()=>{
 assert.doesNotMatch(html,/console\.log\s*\(/);
 for(const symbol of ['dijiGlobalCacheYaz','dijiLigSunucudanGuncelle','dijiAkisSunucudanGuncelle','masterKelimeHavuzu','genelSonucEkraniGoster','bakimEkrani','panel-alani'])assert.ok(html.includes(symbol),'Missing live feature '+symbol);
});
