import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {learningCompanionAPI} from '../supabase/functions/diji-api/learning-companion.mjs';
import {due,nextReview,reviewStats} from '../supabase/functions/diji-api/review-schedule.mjs';
const BANK=globalThis.DMLearningDialogues,at=Date.parse('2026-10-18T22:00:00Z');
function fixture({postgresTimestamps=false}={}){
 const tables={students:[{id:'a',username:'Ada',class_no:6,branch:'A',teacher_id:'t1',status:'approved',role:'student'},{id:'b',username:'Bora',class_no:6,branch:'A',teacher_id:'t2',status:'approved',role:'student'}],extra_data:[]};
 const db={rpc:async(name,args)=>({data:{daily:{route:0,game:0,review:0},weekly:{route:0,game:0,days:0}},error:null}),from(table){let filters=[],action='',payload,opts={},single=false,start=0,end=Infinity;
  const q={select(){return this;},eq(k,v){filters.push(r=>r[k]===v);return this;},in(k,v){filters.push(r=>v.includes(r[k]));return this;},like(k,v){filters.push(r=>r[k].startsWith(v.replace(/%$/,'')));return this;},order(){return this;},limit(n){end=n;return this;},range(a,b){start=a;end=b+1;return this;},maybeSingle(){single=true;return this;},upsert(p,o){action='upsert';payload=p;opts=o;return this;},update(p){action='update';payload=p;return this;},then(resolve,reject){return run().then(resolve,reject);}};
  async function run(){let rows=tables[table]||[],selected=rows.filter(r=>filters.every(f=>f(r))).slice(start,end);
   if(action==='upsert'){const old=rows.find(r=>r.student_id===payload.student_id&&r.key_name===payload.key_name);if(!old){rows.push(structuredClone(payload));}else if(!opts.ignoreDuplicates)Object.assign(old,structuredClone(payload));}
   if(action==='update')for(const r of selected)Object.assign(r,structuredClone(payload));
   if(postgresTimestamps)for(const r of rows)if(r.updated_at)r.updated_at=r.updated_at.replace(/Z$/, '+00:00');
   return {data:structuredClone(single?selected[0]||null:selected),error:null};
  }return q;
 }};
 const handler=learningCompanionAPI({db,json:(data,status=200)=>({data,status}),teacherScope:(a,s)=>a.yonetici||a.teacher_id===s.teacher_id,now:()=>at});
 return {tables,call:(op,b={},a={role:'student',student_id:'a'},method='POST')=>handler.handle(op,b,a,method)};
}
test('review schedule lengthens only after spaced successes and resets without losing history',()=>{
 let w={en:'apple',tr:'elma'};const gaps=[1,3,7,14,30];let n=at;
 for(const days of gaps){w=nextReview(w,true,n);assert.equal(Date.parse(w.dueAt)-n,days*86400000);assert(!due(w,n));n=Date.parse(w.dueAt);assert(due(w,n));}
 w=nextReview(w,false,n);assert.equal(w.streak,0);assert.equal(w.attempts,6);assert.equal(w.correctCount,5);assert.equal(Date.parse(w.dueAt)-n,86400000);assert.equal(reviewStats([w],n).attempts,6);
});
test('public content and deployed server bank are identical, complete and internally answerable',()=>{
 assert.equal(fs.readFileSync('ingilizce/learning-dialogues.js','utf8'),fs.readFileSync('supabase/functions/diji-api/learning-dialogues.js','utf8'));
 assert.equal(BANK.length,45);assert.equal(new Set(BANK.map(s=>s.id)).size,45);
 for(const s of BANK){assert.equal(s.questions.length,3);assert.ok(s.lines.length>=4);for(const q of s.questions){assert(q.explanation);assert(q.options?q.options.includes(q.answer):q.answers.includes(q.answer));}}
});
test('anonymous users, wrong methods, students requesting teacher data and foreign teacher scope are rejected',async()=>{
 const f=fixture();assert.equal((await f.call('companionSummary',{},null)).status,401);assert.equal((await f.call('companionSummary',{},undefined,'GET')).status,405);assert.equal((await f.call('teacherLearningSummary')).status,403);
 const r=await f.call('teacherLearningSummary',{}, {role:'teacher',teacher_id:'t1'});assert.deepEqual(r.data.pupils.map(p=>p.name),['Ada']);
});
test('dialogue answers are graded on the server, cannot skip, cannot overwrite and survive a lost response',async()=>{
 const f=fixture(),opened=(await f.call('companionDialogueOpen',{story:'cafe'})).data;
 assert.equal((await f.call('companionDialogueAnswer',{story:'cafe',index:1,version:opened.version,answer:'Peynirli'})).status,409);
 const b={story:'cafe',index:0,version:opened.version,answer:'Su',student_id:'b',correct:false};
 const r=(await f.call('companionDialogueAnswer',b)).data;assert.equal(r.correct,true);
 const retry=(await f.call('companionDialogueAnswer',{...b,answer:'Kahve'})).data;assert.equal(retry.repeated,true);assert.equal(retry.correct,true);
 const other=(await f.call('companionDialogueOpen',{story:'cafe'},{role:'student',student_id:'b'})).data;assert.equal(other.cursor,0);
 const summary=(await f.call('companionSummary')).data;assert.equal(summary.skills.reading.total,1);assert.equal(summary.skills.reading.correct,1);assert.equal(summary.day,'2026-10-19');
});
test('audio fallback records reading and typed words use normalized exact answers without granting rewards',async()=>{
 const f=fixture();let state=(await f.call('companionDialogueOpen',{story:'weather'})).data;
 const answers=['Bulutlu ve yağmurlu','Kapının yanında',' UMBRELLA! '];
 for(let index=0;index<3;index++)state=(await f.call('companionDialogueAnswer',{story:'weather',index,version:state.version,answer:answers[index],audioPlayed:false})).data;
 const s=(await f.call('companionSummary')).data;assert.equal(s.skills.reading.total,2);assert.equal(s.skills.listening.total,0);assert.equal(s.skills.writing.correct,1);assert.equal(s.dialogueDone,true);assert.equal(s.xp,undefined);assert.equal(s.gold,undefined);
 const reopened=(await f.call('companionDialogueOpen',{story:'weather'})).data;assert.equal(reopened.cursor,3);
});
test('concurrent tabs can record each dialogue question only once',async()=>{
 const f=fixture(),state=(await f.call('companionDialogueOpen',{story:'cafe'})).data,b={story:'cafe',index:0,version:state.version,answer:'Su'};
 await Promise.all([f.call('companionDialogueAnswer',b),f.call('companionDialogueAnswer',b)]);
 const s=(await f.call('companionSummary')).data;assert.equal(s.skills.reading.total,1);
});
test('planner checkbox is account-bound and never changes game progress or rewards',async()=>{
 const f=fixture();assert.equal((await f.call('companionPlanStep',{step:'gold'})).status,400);await f.call('companionPlanStep',{step:'route',student_id:'b'});assert.equal((await f.call('companionSummary')).data.routeDone,true);assert.equal((await f.call('companionSummary',{}, {role:'student',student_id:'b'})).data.routeDone,false);assert.equal(f.tables.extra_data.length,1);
});

test('Postgres timestamp representation allows all three consecutive answers without reopening',async()=>{
 const f=fixture({postgresTimestamps:true});let state=(await f.call('companionDialogueOpen',{story:'weather'})).data;
 for(const [index,answer] of ['Bulutlu ve yağmurlu','Kapının yanında','umbrella'].entries()){
  const response=await f.call('companionDialogueAnswer',{story:'weather',index,version:state.version,answer,audioPlayed:true});
  assert.equal(response.status,200,'Question '+(index+1)+' saves');state=response.data;
  assert.equal(state.cursor,index+1);assert.equal(state.version,f.tables.extra_data[0].updated_at,'Version is the stored database token');
 }
 assert.equal((await f.call('companionSummary')).data.dialogueDone,true);
});
