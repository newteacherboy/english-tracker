const {test}=require('node:test'),assert=require('node:assert/strict');
const CORE=require('../ingilizce/learning-core.js'),V8=require('../ingilizce/thematic-v8-candidate.js'),SCHOOL=require('../ingilizce/school-curriculum.js');
const DATA=require('../ingilizce/thematic-curriculum.json'),POOL=require('../ingilizce/parkur-word-pool-v1.json');
const imageKeys=new Set(Object.values(POOL).map(w=>CORE.norm(w.en)+'|'+CORE.norm(w.tr)));
const hasArt=w=>!!w.image||imageKeys.has(CORE.norm(w.en)+'|'+CORE.norm(w.tr));
test('visual revision has four illustrated matches and a four-option illustrated completion for all learning stops',()=>{
 for(const chapter of DATA.chapters){
  const prev=DATA.chapters.find(c=>c.id===chapter.previousId),tasks=V8.build(chapter,prev,2,DATA.chapters),old=V8.build(chapter,prev);
  assert.equal(tasks.length,14);assert.deepEqual(tasks.at(-1),old.at(-1));
  const match=tasks[7],fill=tasks[8];assert.equal(match.visualMatch,true);assert.equal(match.pairs.length,4);assert(match.pairs.every(hasArt));assert(CORE.grade(match,match.pairs).correct);
  assert.equal(fill.visualFill,true);assert.equal(fill.options.length,4);assert(hasArt(fill.picture));assert(fill.options.includes(fill.answer));assert(CORE.grade(fill,fill.answer).correct);
 }
});
test('school visual tasks keep ten graded questions, genuine pairs and canonical grading',()=>{
 const bank=Object.values(POOL).slice(0,12).map(({en,tr})=>({en,tr}));
 for(let n=1;n<=4;n++){
  const tasks=SCHOOL.build(bank.slice(0,n),bank,220151,true),match=tasks[5],fill=tasks[6];
  assert.equal(tasks.length,12);assert.equal(match.visualMatch,true);assert.equal(match.pairs.length,4);assert(match.pairs.every(hasArt));assert(SCHOOL.grade(match,match.pairs).correct);
  assert.equal(fill.options.length,4);assert(hasArt(fill.picture));assert(SCHOOL.grade(fill,fill.answer).correct);assert.equal(tasks.at(-1).kind,'review');
 }
});
