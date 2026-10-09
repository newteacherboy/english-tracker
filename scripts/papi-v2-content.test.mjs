import fs from 'node:fs';
import assert from 'node:assert/strict';
const data=JSON.parse(fs.readFileSync(new URL('../docs/papi-v2-new-chapters-draft.json',import.meta.url),'utf8'));
const roadmap=JSON.parse(fs.readFileSync(new URL('../docs/papi-v2-80-roadmap.json',import.meta.url),'utf8'));
assert.equal(data.chapters.length,40);
const expectedLevels=['A1','A2','B1','B2'];
const ids=new Set();
for (const [index,chapter] of data.chapters.entries()) {
 assert.equal(chapter.id,index+40,'new chapter id must be stable');
 assert.equal(chapter.cefr,expectedLevels[Math.floor(index/10)]);
 assert.ok(!ids.has(chapter.id));ids.add(chapter.id);
 assert.ok(chapter.phrases.length>=2);
 assert.ok(chapter.steps.some(x=>x.kind==='listen'));
 assert.ok(chapter.steps.some(x=>x.kind==='teach'));
 for (const [j,step] of chapter.steps.entries()) {
  if (step.kind==='choice'||step.kind==='listen') {
   assert.ok(Number.isInteger(step.answer)&&step.answer>=0&&step.answer<step.options.length,`Invalid answer ${chapter.id} / ${j}`);
   assert.equal(new Set(step.options).size,step.options.length,`Duplicate options ${chapter.id} / ${j}`);
  }
  if(step.kind==='order') assert.ok(step.tokens.length>=3,`Trivial ordering ${chapter.id}`);
 }
}
for(const [index,level] of roadmap.levels.entries()){
 assert.equal(level.chapters.length,20);
 const added=level.chapters.filter(c=>!c.legacy);
 assert.equal(added.length,10);
 assert.deepEqual(added.map(c=>c.chapterId),data.chapters.slice(index*10,index*10+10).map(c=>c.id));
 assert.deepEqual(added.map(c=>c.title),data.chapters.slice(index*10,index*10+10).map(c=>c.title));
}
console.log('Validated 40 new chapters, stable IDs and question structure.');
