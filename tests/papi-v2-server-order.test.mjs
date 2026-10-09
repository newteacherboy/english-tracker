import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/diji-api/story-api.ts',import.meta.url),'utf8');
const fn=source.match(/export const previousChapter=\(chapter:number\):number\|null=>\{([\s\S]*?)\n\};/);
assert.ok(fn,'Missing server predecessor function');
const previousChapter=new Function('chapter',fn[1]);
test('legacy chapters retain exact original unlock order',()=>{
 for(let c=0;c<40;c++)assert.equal(previousChapter(c),c===0?null:c-1,'legacy chapter '+c);
});
test('new chapters unlock after final chapter of corresponding legacy track',()=>{
 for(let track=0;track<4;track++)
   for(let i=0;i<10;i++){const chapter=40+track*10+i;
     assert.equal(previousChapter(chapter),i===0?track*10+9:chapter-1,'V2 chapter '+chapter);}
 for(const bad of [-1,80,NaN])assert.equal(previousChapter(bad),null);
});

test('new chapters require explicit production launch flag',()=>{assert.match(source,/PAPI_STORY_V2_ENABLED/);assert.match(source,/chapter>=40/);assert.match(source,/Deno\.env\.get\('PAPI_STORY_V2_ENABLED'\)!=='true'/);});
