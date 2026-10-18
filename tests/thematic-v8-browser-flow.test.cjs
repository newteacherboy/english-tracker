const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('ingilizce/thematic-learning.js','utf8');
test('new route UI parses and loads v8 only when explicitly enabled',()=>{
 new vm.Script(code,{filename:'thematic-learning.js'});
 assert.match(code,/window\.DM_THEMATIC_V8_ENABLED===true/);
 assert.match(code,/preloadV8\(\)/);
 assert.match(code,/DMThematicV8Candidate\?\.build/);
 assert.match(code,/deckVersion:\(session\?\.deckVersion===8/);
});
test('v8 displays four teaching stages, ten graded tasks and fourteen-step progress',()=>{
 assert.match(code,/version===8\?14/);
 assert.match(code,/deckVersion===8\?10/);
 assert.match(code,/Dinle ve Öğren/);
 assert.match(code,/stepsFor\(\)/);
 assert.match(code,/questionsFor\(\)/);
});
