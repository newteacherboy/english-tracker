const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const client=require('../ingilizce/story-exercises.js');
const ts=fs.readFileSync('supabase/functions/diji-api/story-v2.ts','utf8');
const ctx={};vm.createContext(ctx);
vm.runInContext(stripTypeScriptTypes(ts,{mode:'transform'}).replaceAll('export ','')+'\nglobalThis.storyV3Steps=storyV3Steps;',ctx);
const browser={window:{}};vm.createContext(browser);
vm.runInContext(fs.readFileSync('ingilizce/story-curriculum.js','utf8'),browser);
const lessons=[...browser.window.DMStoryCurriculum,...JSON.parse(fs.readFileSync('ingilizce/story-v2-curriculum.json','utf8'))];
assert.equal(lessons.length,80);
let questionCount=0,finalCount=0;
for(const lesson of lessons){
 const a=client.buildV3(lesson),b=ctx.storyV3Steps(lesson);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),lesson.id+' client/server divergence');
 const final=a.filter(x=>x.kind==='final'),practice=a.filter(x=>x.kind!=='final');
 assert.equal(practice.length,12,lesson.id+' must have exactly 12 practice tasks');
 assert.equal(final.length,client.cardsOf(lesson).length,lesson.id+' final must cover all cards');
 assert(a.slice(-final.length).every(x=>x.kind==='final'),'Final must come last');
 const signatures=practice.map(t=>[t.kind,t.tr||'',t.stem||t.en||'',t.answer||''].join('|').toLocaleLowerCase());
 assert.equal(new Set(signatures).size,signatures.length,lesson.id+' duplicated a question');
 questionCount+=practice.length;finalCount+=final.length;
}
console.log('PASS '+lessons.length+' chapters, '+questionCount+' practice questions and '+finalCount+' final cards');
