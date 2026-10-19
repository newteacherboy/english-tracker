import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allTimeLeague} from '../supabase/functions/diji-api/league-alltime.mjs';
import R from '../ingilizce/progress-rules.js';
function database(students,totals){const calls=[];return {calls,from(table){return {select(columns){calls.push([table,columns]);return this},eq(){return this},order(){return this},range(a,b){return Promise.resolve({data:students.slice(a,b+1)})},in(k,ids){return Promise.resolve({data:ids.filter(id=>Object.hasOwn(totals,id)).map(id=>({student_id:id,totalXp:totals[id]}))})}}}}};
const student=(id,name=id)=>({id,username:name,class_no:6});
test('current total XP controls rank, level 15 boundary, privacy, demo and ties',async()=>{
 const db=database([student('a','Ada'),student('b','Bora'),student('c','Cem'),student('low'),student('hidden'),student('demo')],{a:6000,b:9000,c:6000,low:5949,hidden:99999,demo:100000});
 const list=await allTimeLeague(db,async rows=>rows.filter(r=>r.id!=='hidden'),'a',xp=>R.progress(xp).level,r=>r.id!=='demo');
 assert.deepEqual(list.map(x=>[x.name,x.xp,x.rank]),[['Bora',9000,1],['Ada',6000,2],['Cem',6000,3]]);
 assert(db.calls.every(([table])=>table!=='student_xp_weekly'));
 const next=database([student('a'),student('b')],{a:10000,b:7000});
 assert.equal((await allTimeLeague(next,async x=>x,'a',xp=>R.progress(xp).level,()=>true))[0].id,'a');
});
test('read errors fail closed',async()=>{
 const db={from(){return {select(){return this},eq(){return this},order(){return this},range:async()=>({error:Error('offline')})}}};
 await assert.rejects(()=>allTimeLeague(db,async x=>x,'a',()=>15,()=>true),/offline/);
});
