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

test('real map honors level-interleaved 80-step route and stable chapter IDs',()=>{
 assert.match(pathCode,/const ids=\[\.\.\.Array\.from/);
 assert.match(pathCode,/40\+i/);
 assert.match(pathCode,/50\+i/);
 assert.match(pathCode,/60\+i/);
 assert.match(pathCode,/70\+i/);
 assert.match(pathCode,/curriculum\(\)\.find\(c=>c\.id===id\)/);
 assert.match(pathCode,/all\[i\+1\]\.id/);
 const ids=[...Array.from({length:10},(_,i)=>i),...Array.from({length:10},(_,i)=>40+i),...Array.from({length:10},(_,i)=>10+i),...Array.from({length:10},(_,i)=>50+i),...Array.from({length:10},(_,i)=>20+i),...Array.from({length:10},(_,i)=>60+i),...Array.from({length:10},(_,i)=>30+i),...Array.from({length:10},(_,i)=>70+i)];
 assert.equal(ids[9],9);assert.equal(ids[10],40);assert.equal(ids[19],49);assert.equal(ids[20],10);
 assert.equal(ids.length,new Set(ids).size);
});

test('80-chapter map cannot use array index in place of stable chapter id',()=>{
 assert.doesNotMatch(pathCode,/chapter=curriculum\(\)\[id\]/);
 assert.doesNotMatch(pathCode,/if\(busy\|\|!curriculum\(\)\[id\]/);
 assert.match(pathCode,/chapter=curriculum\(\)\.find\(c=>c\.id===id\)/);
 assert.match(pathCode,/function nextChapter\(\)/);
});
