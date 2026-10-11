const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../ingilizce/story-exercises.js');
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('ingilizce/story-curriculum.js','utf8'),ctx);
const chapters=ctx.window.DMStoryCurriculum;
assert.equal(chapters.length,40);
let total=0;
for(const c of chapters){
 const cards=E.cardsOf(c),steps=E.build(c);total+=steps.length;
 assert(steps.length>=7,c.title+' must have seven activities');
 assert.equal(steps.filter(x=>x.kind==='final').length,cards.length,c.title+' final cards');
 assert(E.checkPairs(steps[0],steps[0].pairs),c.title+' pair validation');
 for(const step of steps){
  if(['choose','complete'].includes(step.kind))assert(step.options.includes(step.answer),c.title+' missing correct option');
  if(step.kind==='order')assert.equal(E.evaluate(step,step.tokens.join(' ')).status,'correct',c.title+' order mismatch');
  if(step.kind==='final'){assert.equal(E.evaluate(step,'incorrect',0).status,'retry');assert.equal(E.evaluate(step,'incorrect',1).status,'reveal');}
 }
}
console.log('PASS '+chapters.length+' chapters, '+total+' content-preserving activities');
