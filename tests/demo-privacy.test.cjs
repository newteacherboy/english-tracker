'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const src=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
test('demo identity is rejected in public profile, score, feed and relationship records',async()=>{
 const {publicParticipant,DEMO_ID}=await import('../supabase/functions/diji-api/demo-account.ts');
 for(const r of [{id:DEMO_ID},{student_id:DEMO_ID},{actor_key:'s:'+DEMO_ID},{student_name:'dijimedu_demo'},{username:'DIJIMEDU_DEMO'},{sender:{username:'dijimedu_demo'}},{payload:{target_name:'dijimedu_demo'}},{player_b:DEMO_ID}])assert.equal(publicParticipant(r),false,JSON.stringify(r));
 for(const r of [{id:'real',username:'Ada'},{student_id:null,student_name:'Legacy'},{id:'feed',payload:{message:'Normal activity'}}])assert.equal(publicParticipant(r),true);
});
test('demo remains available to its login and owner while foreign target lookups cannot reveal it',async()=>{
 const {publicParticipant,DEMO_ID}=await import('../supabase/functions/diji-api/demo-account.ts');
 const line=src.slice(src.indexOf('  const studentByName = async (n:'),src.indexOf('\n  const ogrFiltre',src.indexOf('  const studentByName = async (n:')));
 const make=new Function('studentByNameGenel','publicParticipant','DEMO_ID','op','a','kapsamda',stripTypeScriptTypes(line,{mode:'transform'})+';return studentByName;');
 const pupil={id:DEMO_ID,username:'dijimedu_demo'},lookup=async()=>pupil,scope=()=>true;
 assert.equal(await make(lookup,publicParticipant,DEMO_ID,'giris',null,scope)('dijimedu_demo'),pupil);
 assert.equal(await make(lookup,publicParticipant,DEMO_ID,'ekVeriGetir',{student_id:DEMO_ID},scope)('dijimedu_demo'),pupil);
 assert.equal(await make(lookup,publicParticipant,DEMO_ID,'akisOlayToggle',{student_id:'other'},scope)('dijimedu_demo'),null);
});
test('public leaderboards filter demo scores while retaining legacy players with no UUID',async()=>{
 const {publicParticipant,DEMO_ID}=await import('../supabase/functions/diji-api/demo-account.ts');
 const code=stripTypeScriptTypes(src.slice(src.indexOf('async function leaderboardGet('),src.indexOf('\nasync function rootData(',src.indexOf('async function leaderboardGet('))),{mode:'transform'});
 const rows=[{student_id:DEMO_ID,student_name:'dijimedu_demo',score:9999},{student_id:'real',student_name:'Ada',score:30},{student_id:null,student_name:'Legacy',score:20}];
 const db={from(){const q={select(){return this;},eq(){return this;},order(){return this;},limit:async()=>({data:rows})};return q;}};
 const run=new Function('supabase','publicParticipant','leaderboardGetKey','ADIL_OYUNLAR','val','legacyClassNo','json','scoreRow',code+';return leaderboardGet;')(db,publicParticipant,{scores:'game'},new Set(),()=>'',()=>null,d=>d,x=>x);
 const list=await run('scores',{},new URLSearchParams());assert.deepEqual(list.map(x=>x.student_name),['Ada','Legacy']);
});
test('league exclusion is applied before rank calculation and settlement still reads this league',()=>{
 const p=fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_hide_demo_from_public_leagues.sql'));const sql=fs.readFileSync('supabase/migrations/'+p,'utf8');assert.match(sql,/s\.id<>'.*000000000001'::uuid/);assert(sql.indexOf('s.id<>')<sql.indexOf('row_number()'));assert.match(src,/students"\)\.select\("\*"\)\.neq\("id",DEMO_ID\)/);
});
