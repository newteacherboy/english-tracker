// [17 Kas 2026] papi-rewards: yalnız geçerli öğrenci oturumu, yalnız bilinen eylemler; sayım ve ödül RPC'de.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {papiRewardsHandler} from '../supabase/functions/papi-rewards/handler.ts';
function db({role='student',expires=Date.now()+60000,teacherAccess=null,username='ada',status='approved',rpcData={ok:true,feathers:2}}={}){
 const calls=[];
 const row=(table)=>({select:()=>({eq:()=>({maybeSingle:async()=>table==='portal_sessions'
  ?{data:{role,student_id:'s1',expires_at:new Date(expires).toISOString(),teacher_portal_access_id:teacherAccess},error:null}
  :{data:{id:'s1',username,role:'student',status,frozen_at:null},error:null}})})});
 return {calls,from:row,rpc:async(name,args)=>{calls.push([name,args]);return {data:rpcData,error:null};}};
}
const req=(body,token='tok')=>new Request('https://x.test/papi-rewards',{method:'POST',headers:{'x-diji-token':token,'content-type':'application/json'},body:JSON.stringify(body)});
test('feather and egg actions call only their server functions with the session student',async()=>{
 const d=db(),h=papiRewardsHandler(d);
 assert.equal((await h(req({action:'tuy'}))).status,200);
 await h(req({action:'yumurta'}));await h(req({action:'yumurta_cat',hatch:false,actor:'someone-else',gold:999}));
 assert.deepEqual(d.calls,[['dm_papi_feather',{actor:'s1'}],['dm_papi_egg',{actor:'s1',hatch:false}],['dm_papi_egg',{actor:'s1',hatch:true}]]);
});
test('unknown actions, missing or expired tokens, teacher portal sessions and demo accounts are refused',async()=>{
 assert.equal((await papiRewardsHandler(db())(req({action:'gold'}))).status,400);
 assert.equal((await papiRewardsHandler(db())(req({action:'tuy'},''))).status,401);
 assert.equal((await papiRewardsHandler(db({expires:Date.now()-1}))(req({action:'tuy'}))).status,401);
 assert.equal((await papiRewardsHandler(db({teacherAccess:'g1'}))(req({action:'tuy'}))).status,401);
 assert.equal((await papiRewardsHandler(db({role:'teacher'}))(req({action:'tuy'}))).status,401);
 const demo=db({username:'dijimedu_demo'});assert.equal((await papiRewardsHandler(demo)(req({action:'tuy'}))).status,403);assert.equal(demo.calls.length,0);
});
test('an egg that is not ready answers 409 without crediting anything',async()=>{
 const r=await papiRewardsHandler(db({rpcData:{ok:false,code:'not_ready',progress:1,need:3}}))(req({action:'yumurta_cat'}));
 assert.equal(r.status,409);assert.equal((await r.json()).code,'not_ready');
});
