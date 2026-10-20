const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../supabase/functions/diji-api/assignment-completion.mjs');
const topic='Adverbs of frequency (always, usually, often, etc.) — Sıklık Zarfları';
const student={id:'s1',class_no:7,branch:'a',teacher_id:'t1'};
function db(rows,{failSelect=false,failUpsert=false}={}){const upserts=[];let f={};return {upserts,from(table){const q={select(){return q},eq(k,v){f[k]=v;return q},limit:async()=>{if(failSelect)return {error:{message:'x'}};return {data:rows.filter(r=>(f.active===undefined||r.active===f.active)&&(f.kind===undefined||r.kind===f.kind)&&(f.class_no===undefined||r.class_no===f.class_no))};},upsert:async(list,opts)=>{upserts.push({table,list,opts});return failUpsert?{error:{message:'x'}}:{error:null};}};if(table==='assignments')f={};return q;}};}
const row=(id,extra={})=>({id,kind:'ders',active:true,class_no:7,branch:'A',teacher_id:'t1',payload:{konu:topic,seviye:'A1',kategori:'grammar'},...extra});

test('a passed lesson completes the matching homework of the student only',async()=>{
 const {completeLessonAssignments}=await load();
 const d=db([row(15),row(16,{payload:{konu:'Other topic'}}),row(17,{branch:'B'}),row(18,{teacher_id:'t2'}),row(19,{teacher_id:'admin'}),row(20,{kind:'oyun'}),row(21,{payload:{konu:topic,seviye:'A2',kategori:'grammar'}}),row(22,{branch:''})]);
 const ids=await completeLessonAssignments(d,student,'A1','grammar',topic,new Set(['admin']));
 assert.deepEqual(ids.sort((a,b)=>a-b),[15,19,22]);
 assert.equal(d.upserts.length,1);
 assert.deepEqual(d.upserts[0].opts,{onConflict:'assignment_id,student_id',ignoreDuplicates:true});
 assert.deepEqual(d.upserts[0].list.map(x=>x.student_id),['s1','s1','s1']);
});
test('no matching homework writes nothing; database errors never throw',async()=>{
 const {completeLessonAssignments}=await load();
 let d=db([row(16,{payload:{konu:'Other'}})]);assert.deepEqual(await completeLessonAssignments(d,student,'A1','grammar',topic,new Set()),[]);assert.equal(d.upserts.length,0);
 d=db([],{failSelect:true});assert.deepEqual(await completeLessonAssignments(d,student,'A1','grammar',topic,new Set()),[]);
 d=db([row(15)],{failUpsert:true});assert.deepEqual(await completeLessonAssignments(d,student,'A1','grammar',topic,new Set()),[]);
 assert.deepEqual(await completeLessonAssignments(d,{id:'s2',class_no:null},'A1','grammar',topic,new Set()),[]);
});
test('homework without level or category matches the topic alone',async()=>{
 const {lessonAssignmentMatches}=await load();
 assert.equal(lessonAssignmentMatches({kind:'ders',payload:{konu:topic}},'B1','reading',topic),true);
 assert.equal(lessonAssignmentMatches({kind:'ders',payload:{konu:topic,seviye:'a1'}},'A1','grammar',topic),true);
});
test('the lesson result endpoint completes homework after the award and reports it',()=>{
 const src=require('fs').readFileSync('supabase/functions/diji-api/index.ts','utf8'),i=src.indexOf('if (op === "dersTestSonucKaydet")'),end=src.indexOf('// ============================================================ EK VERİ',i),body=src.slice(i,end);
 assert(body.indexOf('completeLessonAssignments(')>body.indexOf('dm_lesson_fair_award'),'after the lesson is saved and rewarded');
 assert.match(body,/odevTamamlandi:odevler/);
 assert.match(require('fs').readFileSync('ingilizce/study-ui.js','utf8'),/data\.odevTamamlandi[\s\S]{0,200}dmOdevYenile/);
});
