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
test('Study start honors a saved topic only while its level is open',()=>{const rows=[topic('B2','Advanced'),topic('A1','Basics'),topic('A2','Elementary')],resume={level:'B2',category:'grammar',topic:'Advanced'};assert.equal(startSelector({studyAccess:{A1:true,A2:true,B1:true,B2:true}},1)(rows,resume).konuAdi,'Advanced');assert.equal(startSelector({studyAccess:{A1:true,A2:true,B1:false,B2:false}},1)(rows,resume).konuAdi,'Basics');assert.equal(startSelector({studyAccess:{A1:true,A2:true,B1:false,B2:false}},1)(rows,{level:'A2',category:'grammar',topic:'Elementary'}).konuAdi,'Elementary');});
test('Study start begins at the learner start level, then goes up before reviewing lower levels',()=>{const rows=[topic('B2','Advanced'),topic('A1','Basics'),topic('B1','Middle')],choose=startSelector({studyAccess:{A1:true,A2:true,B1:true,B2:true},startPath:{startCefr:'B1'}});assert.equal(choose(rows,{}).konuAdi,'Middle');assert.equal(choose([topic('A1','Basics'),topic('B1','Middle','tamamlandi'),topic('B2','Advanced')],{}).konuAdi,'Advanced');assert.equal(startSelector({studyAccess:{A1:true,A2:false,B1:false,B2:false}})([topic('B2','Advanced')],{}),undefined);});
