const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('daily goal script uses an explicit nonempty cache version',()=>{
 const html=fs.readFileSync('ingilizce/index.html','utf8'),scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(x=>new URL(x[1],'https://app.test/ingilizce/'));
 const progression=scripts.find(x=>x.pathname==='/ingilizce/progression-ui.js');assert.ok(progression,'progression client is loaded');assert.ok(progression.searchParams.get('v'),'script cache is versioned');
});
