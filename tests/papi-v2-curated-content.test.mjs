import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {buildDialogue,buildCloze,evaluateActivity} from '../scripts/papi-v2-activity-engine.mjs';
const d=JSON.parse(readFileSync(new URL('../docs/papi-v2-new-chapters-draft.json',import.meta.url)));
test('40 draft V2 lessons contain coherent-format authored interactions',()=>{
 assert.equal(d.chapters.length,40);
 for(const c of d.chapters){
  const dialog=buildDialogue(c,c.id),cloze=buildCloze(c,c.id);
  assert.ok(dialog,'missing dialogue '+c.id);assert.ok(cloze,'missing cloze '+c.id);
  assert.equal(dialog.options.length,3);
  assert.equal(new Set(dialog.options.map(x=>x.toLowerCase())).size,3);
  assert.ok(evaluateActivity(dialog,dialog.correctText).correct,c.id+' dialogue');
  assert.ok(evaluateActivity(cloze,cloze.correctText).correct,c.id+' cloze');
  assert.ok(cloze.prompt.includes('_____'));
  assert.equal(cloze.options.length,3);
  assert.ok(dialog.translation&&cloze.translation);
 }
});
