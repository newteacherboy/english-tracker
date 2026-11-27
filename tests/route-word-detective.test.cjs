const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../ingilizce/learning-core.js'),v8=require('../ingilizce/thematic-v8-candidate.js'),school=require('../ingilizce/school-curriculum.js');
const data=require('../ingilizce/thematic-curriculum.json');
function verify(tasks,old,index,grade,count){
 const q=tasks[index];assert.equal(tasks.length,count);assert.equal(q.kind,'choice');assert.equal(q.label,'Kelime Dedektifi');assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(core.norm)).size,4);
 assert.equal(grade(q,q.answer).correct,true);assert.equal(grade(q,q.options.find(x=>x!==q.answer)).correct,false);
 assert.deepEqual(tasks.filter((_,i)=>i!==index),old.filter((_,i)=>i!==index));
}
test('Kelime Dedektifi preserves every other learning task',()=>{
 for(const c of data.chapters){const p=data.chapters.find(x=>x.id===c.previousId);verify(v8.build(c,p,3,data.chapters),v8.build(c,p,2,data.chapters),7,core.grade,14);}
});
test('Kelime Dedektifi preserves school tasks and grades correctly even with small banks',()=>{
 const bank=[{en:'apple',tr:'elma'},{en:'banana',tr:'muz'},{en:'pear',tr:'armut'},{en:'book',tr:'kitap'},{en:'water',tr:'su'},{en:'friend',tr:'arkadaş'}];
 for(let n=1;n<=4;n++)for(let id=220151;id<220181;id++)verify(school.build(bank.slice(0,n),bank,id,3),school.build(bank.slice(0,n),bank,id,true),5,school.grade,12);
});
