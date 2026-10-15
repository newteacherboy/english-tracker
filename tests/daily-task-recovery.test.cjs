'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('ingilizce/index.html','utf8');
const start=html.indexOf(' function gunGorevleri() {'),end=html.indexOf('\n  function olay(tur)',start);
function run(record){const context={yo:{gorev:record},yoVar:()=>true,window:{dmProgression:{allowed:()=>true}},bugun:()=> '2026-10-15',tohum:()=>0xffffffff,aktifOgrenciAdi:'Fixture',yoKaydet(){},GOREV_HAVUZ:[{id:'oyun',olay:'oyun'},{id:'ders1',olay:'ders'},{id:'dinleme',olay:'beceri:dinleme'},{id:'zk',olay:'zk'}]};vm.createContext(context);vm.runInContext(html.slice(start,end),context);return context.gunGorevleri();}
for(const liste of [[],null,[null],[{id:'obsolete'}],[{id:'oyun',ilerleme:2},{id:'oyun',ilerleme:2}]])test('repairs malformed daily record '+JSON.stringify(liste),()=>{const g=run({t:'2026-10-15',liste,alindi:true});assert.equal(g.liste.length,3);assert.equal(new Set(g.liste.map(x=>x.id)).size,3);assert.equal(g.alindi,true);if(liste?.some(x=>x?.id==='oyun'))assert.equal(g.liste.find(x=>x.id==='oyun').ilerleme,2);});
test('unsigned seed always produces three unique valid tasks',()=>{const g=run(null);assert.equal(g.liste.length,3);assert.equal(new Set(g.liste.map(x=>x.id)).size,3);});
test('route checks task readiness even when game log has not changed',()=>{const s=fs.readFileSync('ingilizce/oyna-v2.js','utf8');assert.match(s,/Y\(\)\?\.lig\?\.xp,tasks\(\)/);});
test('every inline application script compiles, including daily task bootstrap',()=>{
 let count=0;
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/src=|application\/ld\+json/.test(m[1])||!m[2].trim())continue;
  assert.doesNotThrow(()=>new vm.Script(m[2]),'inline script at line '+html.slice(0,m.index).split('\n').length);count++;
 }
 assert.ok(count>10);
});
