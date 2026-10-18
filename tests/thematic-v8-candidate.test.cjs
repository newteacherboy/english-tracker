const test=require('node:test');
const assert=require('node:assert/strict');
const candidate=require('../ingilizce/thematic-v8-candidate.js');
const curriculum=require('../ingilizce/thematic-curriculum.json');
const core=require('../ingilizce/learning-core.js');
test('all 240 proposed lessons have four distinct teaching stages and ten graded tasks',()=>{
 assert.equal(curriculum.chapters.length,240);
 assert.equal(new Set(curriculum.chapters.map(c=>c.id)).size,240);
 let graded=0;
 for(const [i,chapter] of curriculum.chapters.entries()){
  assert.equal(chapter.id,1000+i);
  const tasks=candidate.build(chapter,curriculum.chapters[i-1]);
  assert.equal(tasks.length,14);
  assert.deepEqual(tasks.slice(0,4).map(x=>x.kind),['teach','teach','teach','teach']);
  assert.deepEqual(tasks.slice(0,3).map(x=>x.cards[0].en),chapter.cards.map(x=>x.en));
  assert.equal(tasks[3].cards.length,3);
  for(const task of tasks.slice(4)){
   const answer=task.kind==='match'?task.pairs:task.kind==='review'?task.cards.map(x=>x.tr):task.answer;
   assert.equal(core.grade(task,answer).correct,true,'chapter '+chapter.id+' / '+task.label);
   graded++;
  }
 }
 assert.equal(graded,2400);
});

test('client and server v8 candidate compilers are identical',()=>{
 const fs=require('node:fs');
 const client=fs.readFileSync('ingilizce/thematic-v8-candidate.js','utf8');
 const server=fs.readFileSync('supabase/functions/thematic-learning/thematic-v8-candidate.js','utf8');
 assert.equal(client,server);
});
test('v8 content is isolated from the legacy progression and economy code',()=>{
 const fs=require('node:fs');
 const candidate=fs.readFileSync('ingilizce/thematic-v8-candidate.js','utf8');
 assert.doesNotMatch(candidate,/dm_story_apply|dm_thematic_fair_step|papi_story_progress|localStorage|fetch\(/);
});
