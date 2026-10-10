import test from 'node:test';import assert from 'node:assert/strict';
import {V2_LEVELS,getOrderedChapterIds,locateChapter,nextChapter,previewUrl,mayCallLegacyStoryAPI} from '../ingilizce/papi-v2-route.mjs';
test('80 ordered chapters have unique, stable IDs and proper CEFR groupings',()=>{
 const all=V2_LEVELS.flatMap(getOrderedChapterIds);
 assert.equal(all.length,80);assert.equal(new Set(all).size,80);
 assert.deepEqual(getOrderedChapterIds('A1'),[0,1,2,3,4,5,6,7,8,9,40,41,42,43,44,45,46,47,48,49]);
 assert.equal(nextChapter(9),40);assert.equal(nextChapter(49),10);assert.equal(nextChapter(19),50);
 assert.equal(nextChapter(79),null);
 assert.equal(locateChapter(40).sequence,11);assert.equal(locateChapter(69).level,'B1');
});
test('legacy API never receives preview chapter IDs',()=>{
 for(let n=0;n<80;n++){const c=locateChapter(n);assert.equal(mayCallLegacyStoryAPI(n),n<40);
 if(n>=40){assert.equal(c.saveEnabled,false);assert.ok(previewUrl(n).includes('chapter='+n))}
 else assert.equal(previewUrl(n),null);}
 for(const bad of [-1,80,NaN,1.5,'40'])assert.equal(mayCallLegacyStoryAPI(bad),false);
});
