'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
// Isolated PostgreSQL semantics locally; CI uses a real PostgreSQL server and pool.
let db,query,exec;
before(async()=>{
  if(process.env.REWARD_TEST_DATABASE_URL){
    const {Pool}=require('pg');
    db=new Pool({connectionString:process.env.REWARD_TEST_DATABASE_URL,max:8});
    query=(sql,args)=>db.query(sql,args);exec=sql=>db.query(sql);
  }else{
    const {PGlite}=require('@electric-sql/pglite');
    db=new PGlite();query=(sql,args)=>db.query(sql,args);exec=sql=>db.exec(sql);
  }
  await exec(fs.readFileSync('tests/fixtures/reward-topic-v2.sql','utf8'));
  await exec(fs.readFileSync('deployment/reward-success-policy-v2.sql','utf8'));
  await exec(fs.readFileSync('deployment/reward-success-topic-v2.sql','utf8'));
});
after(async()=>{if(db)await(db.end?db.end():db.close());});
async function student(){
  const id=crypto.randomUUID();
  await query('insert into students(id,username,gold) values($1,$2,700)',[id,'fixture']);
  await query("insert into extra_data(student_id,key_name,value) values($1,'yo',$2)",[id,JSON.stringify({totalXp:1000,altin:700,log:{},owned:['preserved']})]);
  return id;
}
async function run(id,total=100,options={}){
  const runId=crypto.randomUUID(),key=Array.from({length:total},()=>({allowed:['yes','no'],correct:'yes'}));
  await query("insert into dm_topic_game_runs(run_id,student_id,topic_key,game,answer_key,question_count,started_at,ranking_only,expires_at) values($1,$2,'topic','dy',$3,$4,now()-interval '10 minutes',$5,now()+($6::integer*interval '1 minute'))",[runId,id,JSON.stringify(key),total,!!options.teacher,options.expired?-1:30]);
  return runId;
}
async function finish(id,runId,correct,total=100){
  const picks=Array.from({length:total},(_,i)=>i<correct?'yes':'no');
  return (await query('select dm_topic_game_finish($1,$2,$3) result',[id,runId,JSON.stringify(picks)])).rows[0].result;
}
async function wallet(id){return (await query("select value from extra_data where student_id=$1 and key_name='yo'",[id])).rows[0].value;}

test('all eight category maxima and exact reward boundaries in PostgreSQL',async()=>{
  await exec(fs.readFileSync('tests/reward-success-policy-v2.sql','utf8'));
});
for(const [correct,total,xp,gold] of [[0,100,0,0],[59,100,0,0],[60,100,45,13],[69,100,45,13],[70,100,59,16],[79,100,59,16],[80,100,72,20],[89,100,72,20],[90,100,81,23],[99,100,81,23],[100,100,90,25],[7,12,0,0],[8,12,45,13]]){
  test(`topic ${correct}/${total}: wallet, gold mirror and immutable receipt`,async()=>{
    const id=await student(),key=await run(id,total),r=await finish(id,key,correct,total),w=await wallet(id);
    assert.equal(r.xp,xp);assert.equal(r.gold,gold);assert.equal(r.passed,correct*100>=total*60);
    assert.equal(w.totalXp,1000+xp);assert.equal(w.altin,700+gold);assert.deepEqual(w.owned,['preserved']);
    assert.equal(Number((await query('select gold from students where id=$1',[id])).rows[0].gold),700+gold);
    const replay=await finish(id,key,total,total);
    assert.equal(replay.duplicate,true);assert.equal(replay.xp,xp);assert.equal(replay.gold,gold);
    assert.deepEqual(await wallet(id),w);
    const ledger=(await query('select xp,gold from dm_game_reward_runs where student_id=$1 and run_id=$2',[id,key])).rows;
    assert.deepEqual(ledger,[{xp,gold}]);
    if(xp){const day=Object.keys(w.log)[0];assert.equal(w.log[day],xp);assert.equal(w.xpGun.xp,xp);}
  });
}
test('failed attempt is immutable; a new successful run can earn rewards',async()=>{
  const id=await student(),bad=await run(id,12);
  assert.equal((await finish(id,bad,7,12)).passed,false);
  assert.equal((await finish(id,bad,12,12)).xp,0);
  const good=await run(id,12);assert.equal((await finish(id,good,12,12)).xp,90);
  assert.equal((await wallet(id)).totalXp,1090);
});
test('same-run concurrent claims mint one receipt and one wallet payment',async()=>{
  const id=await student(),key=await run(id,12);
  const results=await Promise.all(Array.from({length:6},()=>finish(id,key,12,12)));
  assert.equal(results.filter(r=>r.duplicate).length,5);
  assert.equal((await wallet(id)).totalXp,1090);assert.equal((await wallet(id)).altin,725);
});
test('different concurrent runs cannot exceed the three-reward daily quota',async()=>{
  const id=await student(),keys=[];for(let i=0;i<6;i++)keys.push(await run(id,12));
  const results=await Promise.all(keys.map(key=>finish(id,key,12,12)));
  assert.equal(results.filter(r=>r.xp===90).length,3);
  assert.equal(results.filter(r=>r.sebep==='daily_limit').length,3);
  assert.equal((await wallet(id)).totalXp,1270);assert.equal((await wallet(id)).altin,775);
});
test('teacher records a ranking but never pays and survives a lost response',async()=>{
  const id=await student(),key=await run(id,12,{teacher:true}),before=await wallet(id);
  const r=await finish(id,key,12,12);assert.equal(r.xp,0);assert.equal(r.gold,0);assert.equal(r.rankingOnly,true);
  assert.equal((await finish(id,key,12,12)).duplicate,true);assert.deepEqual(await wallet(id),before);
  assert.equal((await query('select count(*)::integer n from game_scores where student_id=$1',[id])).rows[0].n,1);
});
test('expired, wrong-owner, malformed and too-fast requests cannot earn rewards',async()=>{
  const id=await student(),other=await student(),key=await run(id,12);
  assert.equal((await finish(other,key,12,12)).ok,false);
  await assert.rejects(query('select dm_topic_game_finish($1,$2,$3)',[id,key,'{}']));
  await assert.rejects(query('select dm_topic_game_finish($1,$2,$3)',[id,key,JSON.stringify(Array(12).fill('forged'))]));
  await query('update dm_topic_game_runs set started_at=now() where run_id=$1',[key]);
  assert.equal((await finish(id,key,12,12)).sebep,'too_fast');
  const old=await run(id,12,{expired:true});assert.equal((await finish(id,old,12,12)).sebep,'expired');
  assert.equal((await wallet(id)).totalXp,1000);
});
test('anonymous and signed-in clients cannot invoke award RPCs or read receipts',async()=>{
  for(const role of ['anon','authenticated']){
    const rows=(await query(`select has_function_privilege($1,'public.dm_topic_game_finish(uuid,uuid,jsonb)','EXECUTE') rpc,
      has_table_privilege($1,'public.dm_topic_game_results_v2','SELECT') receipts`,[role])).rows;
    assert.deepEqual(rows,[{rpc:false,receipts:false}]);
  }
});
test('release audit rejects missing integrations and never treats a missing calculator as success',async()=>{
  const sql=fs.readFileSync('tests/reward-release-blockers.sql','utf8');
  const rows=(await query(sql)).rows;
  assert(rows.some(r=>r.proname==='dm_lesson_fair_award'));
  assert(rows.some(r=>r.proname==='dm_match_action'));
  assert(!rows.some(r=>r.proname==='dm_topic_game_finish'));
  assert(!rows.some(r=>r.proname==='dm_success_reward_v2'));
  await exec('drop function public.dm_success_reward_v2(integer,integer,boolean,numeric,integer,integer)');
  assert((await query(sql)).rows.some(r=>r.proname==='dm_success_reward_v2'));
  await exec(fs.readFileSync('deployment/reward-success-policy-v2.sql','utf8'));
});
