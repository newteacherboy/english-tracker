'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm'), fs=require('node:fs');
const source=fs.readFileSync('ingilizce/cumle-yarisi.js','utf8');
const css=fs.readFileSync('ingilizce/cumle-yarisi.css','utf8');
const hub=fs.readFileSync('ingilizce/activity-ui.js','utf8');
const hubCss=fs.readFileSync('ingilizce/activity-ui.css','utf8');
const index=fs.readFileSync('ingilizce/index.html','utf8');
function api(){
 const context={window:{},Math,Set,Map,Number,Array,String,performance:{now:()=>0}};
 vm.runInNewContext(source,context,{filename:'cumle-yarisi.js'});
 return context.window.dmSentenceRace;
}
const fixtures=Array.from({length:30},(_,i)=>({en:'word'+String.fromCharCode(97+Math.floor(i/26))+String.fromCharCode(97+i%26),tr:'anlam '+i,cl:5,unit:i<15?1:2}));
test('classroom race engine parses and is registered in original Kapışma tab',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.match(hub,/sentenceRaceActivity:\[17,/);
 assert.match(hub,/card\.id='sentenceRaceActivity'/);
 assert.match(hub,/window\.dmSentenceRace\.open\(\)/);
 assert.match(hubCss,/#sentenceRaceActivity/);
 assert.match(index,/cumle-yarisi\.js\?v=20261026-1/);
 assert.match(index,/cumle-yarisi\.css\?v=20261026-1/);
 assert.match(index,/activity-ui\.js\?v=20261026-sentence-race-1/);
 assert.match(css,/dm-sr-dual/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('12 different questions per side with three valid choices and no identical rounds',()=>{
 const f=api();let pool=f.questionPool(fixtures),decks=f.makeDeck(fixtures);
 assert.equal(pool.length,60);assert.ok(decks);
 assert.equal(decks[0].length,12);assert.equal(decks[1].length,12);
 assert.equal(new Set(decks.flat().map(q=>q.id)).size,24);
 decks.flat().forEach(q=>{assert.equal(q.choices.length,3);assert.equal(new Set(q.choices).size,3);assert.ok(q.choices.includes(q.answer));});
 for(let i=0;i<12;i++)assert.notEqual(decks[0][i].prompt,decks[1][i].prompt);
});
test('twelve vocabulary items can produce 24 unique dual-language classroom prompts',()=>{
 const f=api(), decks=f.makeDeck(fixtures.slice(0,12));
 assert.ok(decks);assert.equal(new Set(decks.flat().map(q=>q.id)).size,24);
});
test('selected class and units strictly scope question bank, missing content blocks start',()=>{
 const f=api(),mixed=fixtures.concat([{en:'other',tr:'başka',cl:8,unit:1}]);
 assert.equal(f.scope(mixed,5,[1]).length,15);
 assert.equal(f.scope(mixed,5,[2]).length,15);
 assert.equal(f.scope(mixed,8,[1]).length,1);
 assert.equal(f.makeDeck(fixtures.slice(0,4)),null);
});
test('timing adds points only for correct answers; wrong or time-outs deduct 40',()=>{
 const f=api();assert.equal(f.grade(15000,true),250);assert.equal(f.grade(0,true),100);assert.equal(f.grade(5100,true),160);assert.equal(f.grade(12000,false),-40);assert.equal(f.grade(0,false),-40);
 assert.match(source,/Math\.max\(0,team\.score\+grade\(left,correct\)\)/);
 assert.match(source,/deadline-performance\.now\(\)/);
 assert.match(source,/team\.deadline=performance\.now\(\)\+current\.duration\*1000/);
 assert.match(source,/teams\.every\(function\(t\)\{return t\.index>=TOTAL;/);
});
test('classroom result never writes energy, XP, profile score or remote leaderboards',()=>{
 assert.doesNotMatch(source,/fetch\s*\(|\.api\s*\(|localStorage\.(?:setItem|removeItem)\s*\(/);
 assert.match(source,/öğrenci puanlarına ve sıralamalara aktarılmadı/);
});