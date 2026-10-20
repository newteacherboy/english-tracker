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

function startSelector(status={lessons:{}},level=1){const scope={window:{dmProgression:{status:()=>status,level:()=>level}},actor:()=> 'learner',levels:{A1:'',A2:'',B1:'',B2:''},cats:{grammar:'',vocab:'',comm:'',pron:''},key:k=>[k.seviye,k.kategori,k.konuAdi].join('|')};vm.createContext(scope);const a=source.indexOf(' function studyLevelOpen('),b=source.indexOf(' function save(stage)',a);vm.runInContext(source.slice(a,b)+';this.choose=studyStartTarget;',scope);return scope.choose;}
const topic=(seviye,konuAdi,durum='yeni')=>({seviye,konuAdi,kategori:'grammar',siraNo:1,durum});
test('Study start ignores database order and begins at the first unfinished topic in level order',()=>{const choose=startSelector(),rows=[topic('B2','Advanced'),topic('A2','Elementary'),topic('A1','Basics')];assert.equal(choose(rows,{}).konuAdi,'Basics');});
test('Study start honors any saved topic because every CEFR level is open',()=>{const rows=[topic('B2','Advanced'),topic('A1','Basics'),topic('A2','Elementary')];assert.equal(startSelector({lessons:{}},1)(rows,{level:'B2',category:'grammar',topic:'Advanced'}).konuAdi,'Advanced');assert.equal(startSelector({lessons:{}},1)(rows,{level:'A2',category:'grammar',topic:'Elementary'}).konuAdi,'Elementary');});
test('Study start skips finished topics and can still review when everything is done',()=>{const choose=startSelector();assert.equal(choose([topic('B2','Advanced'),topic('A1','Basics','tamamlandi')],{}).konuAdi,'Advanced');assert.equal(choose([topic('A1','Basics','tamamlandi')],{}).konuAdi,'Basics');});
