import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const path=new URL('../ingilizce/story-path.js',import.meta.url);
const pathCode=readFileSync(path,'utf8');
const deck=JSON.parse(readFileSync(new URL('../ingilizce/story-v2-curriculum.json',import.meta.url),'utf8'));
test('real story renderer reads authorized V2 deck only',()=>{
 assert.match(pathCode,/v2Enabled=d\.v2Enabled===true/);
 assert.match(pathCode,/if\(v2Enabled\)await loadV2Deck\(\)/);
 assert.match(pathCode,/id>=40&&!v2Enabled/);
 assert.match(pathCode,/legacy\.concat\(deck\)/);
});
test('V2 dataset has 40 stable, bounded chapters and supported steps',()=>{
 assert.equal(deck.length,40);
 deck.forEach((ch,i)=>{assert.equal(ch.id,i+40);assert.ok(ch.steps.length>=2&&ch.steps.length<=10);
  ch.steps.forEach(t=>assert.ok(['scene','teach','choice','listen','order'].includes(t.kind),ch.id+' '+t.kind));});
});
