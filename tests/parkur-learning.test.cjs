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
test('11 structured questions and 12th voice finale remain connected', () => {
  const script=html.slice(start,end);
  assert.match(script,/const build=\[/);
  assert.match(script,/sorular=\[\.\.\.first,\.\.\.middle,\.\.\.last\]/);
  assert.match(script,/sorular\.push\(\{tip:'sesliFinal',l:karistir\(active\)\}\)/);
  assert.match(script,/function sesliFinal\(/);
  assert.match(script,/const scoped = havuzTum\(\)\.filter/);
});
test('voice finale has alternatives and a keyboard fallback', () => {
  const script=html.slice(start,end);
  assert.match(script,/webkitSpeechRecognition/);
  assert.match(script,/speechAlternatives/);
  assert.match(script,/bzMicText/);
  assert.match(script,/remaining\.shift\(\)/);
  assert.match(script,/cevap\(true,'Tüm kelimeler sesli finalde tamamlandı'\)/);
});
