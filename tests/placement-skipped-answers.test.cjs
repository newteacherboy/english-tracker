const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('ingilizce/placement-bank.js','utf8');
const context={};context.globalThis=context;vm.runInNewContext(source,context);
const exam=context.DMPlacementExam;
test('placement bank has skills and distinct CEFR tiers',()=>{
 assert.equal(exam.bank.length,40);
 for(const level of ['A1','A2','B1','B2']){
  assert.equal(exam.bank.filter(q=>q.level===level).length,10);
 }
 for(const q of exam.bank)assert.ok(['language','reading','listening'].includes(q.skill));
});
test('skipped and empty answers never count as correct',()=>{
 const unanswered=[undefined,null,'',false].map(v=>{
  const answers=Array(exam.bank.length).fill(v);return exam.evaluate(answers).correct;
 });
 assert.deepEqual(unanswered,[0,0,0,0]);
 assert.equal(exam.evaluate([]).correct,0);
});
test('correct zero index remains valid, and one answer does not unlock a CEFR tier',()=>{
 assert.equal(exam.evaluate(Array(exam.bank.length).fill(0)).correct,40);
 const partial=Array(exam.bank.length).fill(null);partial[0]=0;
 assert.equal(exam.evaluate(partial).correct,1);
 assert.equal(exam.evaluate(partial).level,'A1 altı / başlangıç');
});
