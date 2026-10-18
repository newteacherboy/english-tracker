const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('ingilizce/index.html','utf8');
const verified=fs.readFileSync('ingilizce/verified-games.js','utf8');
const thematic=fs.readFileSync('ingilizce/thematic-learning.js','utf8');
test('School Route preserves pending and answered checkpoints even when handshake fails',()=>{
 assert.match(html,/savedAt:Date\.now\(\)/);
 assert.match(html,/Array\.isArray\(c\.state\.sorular\)/);
 assert.match(html,/checkpointSave\(\); \/\/ Even a failed first server handshake/);
 assert.match(html,/catch\(e\)\{checkpointSave\(\);toast\('Bağlantı kurulamadı/);
 assert.match(html,/pendingAnswer:null,advancing:false/);
 assert.match(html,/if\(!O\|\|O\.advancing\)return/);
 assert.match(html,/finally\{state\.advancing=false;checkpointSave\(\);\}/);
 assert.match(html,/if \(O\._cevaplandi\) return;\s*if\(O\.i<12\)window\.dmVerifiedGames\?\.record/);
});
test('School Route reuses the same signed answer run and retries uncertain network acknowledgment',()=>{
 assert.match(html,/for\(let attempt=0;attempt<3;attempt\+\+\)/);
 assert.match(html,/window\.dmVerifiedGames\.flush\(runId\)/);
 assert.match(verified,/catch\{runs\.delete\(runId\);\}/);
 new vm.Script(verified,{filename:'verified-games.js'});
});
test('Thematic learning reopens server-owned chapter after a lost response',()=>{
 assert.match(thematic,/async function reconcileLesson\(ticket,at,error\)/);
 assert.match(thematic,/api\('open',\{chapter:chapter\.id,deckVersion:session\.deckVersion\}\)/);
 assert.match(thematic,/if\(ticket!==epoch\|\|!modal\|\|identity\(\)!==at\)return/);
 assert.match(thematic,/await reconcileLesson\(ticket,at,e\)/);
 new vm.Script(thematic,{filename:'thematic-learning.js'});
});
