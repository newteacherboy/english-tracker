const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../ingilizce/index.html'),'utf8');
const anchor = html.indexOf('/* ================= 4) OYUN:');
const start = html.lastIndexOf('<script>',anchor);
const end = html.indexOf('</script>',anchor);
test('parkur script parses as JavaScript', () => {
  assert.ok(anchor > 0 && start >= 0 && end > anchor);
  assert.doesNotThrow(() => new vm.Script(html.slice(start+8,end)));
});
test('current twelve-mechanism deck uses only the stop words and ends with their voice review', () => {
  const script=html.slice(start,end),a=script.indexOf('    const active=D.kelimeler.slice();'),b=script.indexOf('    O =',a);
  const words=[{en:'apple',tr:'elma'},{en:'book',tr:'kitap'}],ctx={D:{kelimeler:words},toast(){}};
  vm.runInNewContext('(function(){'+script.slice(a,b)+';globalThis.deck=sorular;})();',ctx);
  assert.equal(ctx.deck.length,13);
  assert.equal(new Set(ctx.deck.slice(0,12).map(q=>q.tip)).size,12);
  assert(ctx.deck.slice(0,12).every(q=>words.includes(q.k)));
  assert.equal(ctx.deck.at(-1).tip,'sesliFinal');
  assert.deepEqual(Array.from(ctx.deck.at(-1).l),words);
});
test('voice finale has alternatives and a keyboard fallback', () => {
  const script=html.slice(start,end);
  assert.match(script,/webkitSpeechRecognition/);
  assert.match(script,/speechAlternatives/);
  assert.match(script,/bzMicText/);
  assert.match(script,/remaining\.shift\(\)/);
  assert.match(script,/cevap\(true,'Tüm kelimeler sesli finalde tamamlandı'\)/);
});

test('speech finale cannot be bypassed using jokers', () => {
  const script=html.slice(start,end);
  assert.match(script,/O\.sorular\[O\.i\]\?\.tip==='sesliFinal'/);
});
test('speech permission errors leave a keyboard alternative', () => {
  const script=html.slice(start,end);
  assert.match(script,/not-allowed/);
  assert.match(script,/denied=true/);
  assert.match(script,/bzMicCheck/);
});
test('stop chunks preserve selected grade/unit and cover its complete word bank without repeats',()=>{
 const script=html.slice(start,end),a=script.indexOf('  const PARKUR_KELIME_ADEDI='),b=script.indexOf('  const durakSayisi =',a);
 const words=Array.from({length:13},(_,i)=>({sinif:1,unite:1,en:'word'+i,tr:'kelime'+i}));
 const ctx={window:{masterKelimeHavuzu:[...words,{sinif:1,unite:2,en:'other',tr:'başka'},{sinif:2,unite:1,en:'second',tr:'ikinci'}]},KAPI_SINIF:[[1,2],[3,4],[5,6],[7,8]],VARSAYILAN_UNITE:{1:8,2:8,3:10,4:10,5:8,6:8,7:8,8:8},EN:k=>k.en,TR:k=>k.tr};
 vm.runInNewContext(script.slice(a,b)+';duraklariKur();globalThis.stops=DURAK;',ctx);
 const stops=ctx.stops.flat().filter(d=>d.sinif===1&&d.unite===1);
 assert.equal(stops.length,2);assert.equal(stops[0].kelimeler.length,12);assert.equal(stops[1].kelimeler.length,1);
 assert.deepEqual(new Set(stops.flatMap(d=>d.kelimeler)),new Set(words));
 assert.equal(stops[0].parcaToplam,2);assert.notEqual(stops[0].no,stops[1].no);
});
