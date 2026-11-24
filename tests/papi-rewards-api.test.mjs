// [17 Kas 2026] papi-rewards: yalnız geçerli öğrenci oturumu, yalnız bilinen eylemler; sayım ve ödül RPC'de.
// [24 Kas 2026] Sürpriz Yumurta kaldırıldı: yumurta eylemleri reddedilir ve veritabanına gidilmez.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {papiRewardsHandler,ACTIONS} from '../supabase/functions/papi-rewards/handler.ts';
function db({role='student',expires=Date.now()+60000,teacherAccess=null,username='ada',status='approved',rpcData={ok:true,feathers:2}}={}){
 const calls=[],reads=[];
 const row=(table)=>{reads.push(table);return {select:()=>({eq:()=>({maybeSingle:async()=>table==='portal_sessions'
  ?{data:{role,student_id:'s1',expires_at:new Date(expires).toISOString(),teacher_portal_access_id:teacherAccess},error:null}
  :{data:{id:'s1',username,role:'student',status,frozen_at:null},error:null}})})};};
 return {calls,reads,from:row,rpc:async(name,args)=>{calls.push([name,args]);return {data:rpcData,error:null};}};
}
const req=(body,token='tok')=>new Request('https://x.test/papi-rewards',{method:'POST',headers:{'x-diji-token':token,'content-type':'application/json'},body:JSON.stringify(body)});
test('feather action calls only its server function with the session student',async()=>{
 const d=db(),h=papiRewardsHandler(d);
 assert.equal((await h(req({action:'tuy',actor:'someone-else'}))).status,200);
 assert.deepEqual(d.calls,[['dm_papi_feather',{actor:'s1'}]]);
});
test('removed egg actions are refused without touching the database',async()=>{
 assert.deepEqual([...ACTIONS],['tuy']);
 const d=db(),h=papiRewardsHandler(d);
 for(const action of ['yumurta','yumurta_cat'])assert.equal((await h(req({action}))).status,400);
 assert.equal(d.calls.length,0);assert.equal(d.reads.length,0);
});
test('unknown actions, missing or expired tokens, teacher portal sessions and demo accounts are refused',async()=>{
 assert.equal((await papiRewardsHandler(db())(req({action:'gold'}))).status,400);
 assert.equal((await papiRewardsHandler(db())(req({action:'tuy'},''))).status,401);
 assert.equal((await papiRewardsHandler(db({expires:Date.now()-1}))(req({action:'tuy'}))).status,401);
 assert.equal((await papiRewardsHandler(db({teacherAccess:'g1'}))(req({action:'tuy'}))).status,401);
 assert.equal((await papiRewardsHandler(db({role:'teacher'}))(req({action:'tuy'}))).status,401);
 const demo=db({username:'dijimedu_demo'});assert.equal((await papiRewardsHandler(demo)(req({action:'tuy'}))).status,403);assert.equal(demo.calls.length,0);
});
