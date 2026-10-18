const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('supabase/staged-thematic-v8-compatibility.sql','utf8');
const server=fs.readFileSync('supabase/functions/thematic-learning/core.ts','utf8');
test('v8 SQL retains old ledgers while supporting fourteen stages',()=>{
 assert.match(sql,/question_cursor between 1 and 13/);
 assert.match(sql,/step_count not in \(10,11,12,14\)/);
 assert.match(sql,/question_count<>10/);
 assert.match(sql,/p\.cursor>\(step_count-question_count-1\)/);
 assert.match(sql,/step_total:=case when p\.deck_version=8 then 14 else 12 end/);
 assert.match(sql,/question_total:=case when p\.deck_version=8 then 10 else 11 end/);
 assert.doesNotMatch(sql,/delete from|truncate|drop table|update public\.students set/i);
});
test('unreleased v8 is feature gated and recovery uses deck-specific completion',()=>{
 assert.match(server,/DM_THEMATIC_V8_ENABLED/);
 assert.match(server,/record\.cursor!==stepCount\(record\.deck_version\)-1/);
 assert.match(server,/question_count:requestedVersion===8\?10:steps-1/);
});
