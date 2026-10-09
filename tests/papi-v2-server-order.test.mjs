import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/diji-api/story-api.ts',import.meta.url),'utf8');
const fn=source.match(/export const previousChapter=\(chapter:number\):number\|null=>\{([\s\S]*?)\n\};/);
assert.ok(fn,'Missing server predecessor function');
const previousChapter=new Function('chapter',fn[1].replace(/return /g,'return '));
test('80 chapter unlock mapping',()=>{
 const route=[...Array.from({length:10},(_,j)=>j),...Array.from({length:10},(_,j)=>40+j),
 ...Array.from({length:10},(_,j)=>10+j),...Array.from({length:10},(_,j)=>50+j),
 ...Array.from({length:10},(_,j)=>20+j),...Array.from({length:10},(_,j)=>60+j),
 ...Array.from({length:10},(_,j)=>30+j),...Array.from({length:10},(_,j)=>70+j)];
 for(let i=0;i<route.length;i++)assert.equal(previousChapter(route[i]),i?route[i-1]:null,'chapter '+route[i]);
});
