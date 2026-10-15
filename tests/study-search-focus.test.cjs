'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('ingilizce/study-ui.js','utf8');
test('typing preserves connected search input instead of replacing/refocusing it',()=>{
 new vm.Script(source);
 const start=source.indexOf("  const search=hub.querySelector('[data-su-focus=\"search\"]');");
 const end=source.indexOf('\n function openTopic',start);
 const code=source.slice(start,end);
 assert.match(code,/if\(!search\)\{hub.innerHTML=markup;\}/);
 assert.match(code,/if\(child.classList.contains\('su-search'\)\)return/);
 assert.doesNotMatch(code,/\.focus\(/);
 assert.match(source,/if\(hub.parentElement!==\$\(activeScreen\(\)\)\)/);
});
