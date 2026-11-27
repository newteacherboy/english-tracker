import './farm-state.js';
const F=(globalThis as any).PapiFarm;
const URL=Deno.env.get('SUPABASE_URL')||'';
const KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const LAUNCH=Date.parse('2026-11-28T15:11:10Z');
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization, apikey, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const out=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers});
async function db(path:string,body?:unknown){
 const r=await fetch(URL+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw Error('Database request failed');
 return await r.json();
}
const hash=async(s:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions=new Set(['buildStructure','build','skipGuide','plant','water','harvest','sell','swap','expand','mine','buyAnimal','collectAnimal','travel']);
const advanced=(key:string)=>['summer','autumn','winter'].includes(key);
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return out({ok:false,message:'POST only.'},405);
 try{
  const raw=await req.text();if(raw.length>4096)return out({ok:false,message:'Invalid request.'},400);
  const b=JSON.parse(raw);const now=Date.now();
  const launch=b.op==='launch';
  if(launch&&(now>=LAUNCH||!b.t))return out({ok:true,launchAt:LAUNCH,now,open:now>=LAUNCH});
  if(!URL||!KEY)return out({ok:false,message:'Farm service unavailable.'},503);
  if(typeof b.t!=='string'||b.t.length<20||b.t.length>400)return out({ok:false,message:'Sign in to play.'},401);
  const session=(await db('portal_sessions?token_hash=eq.'+await hash(b.t)+'&select=student_id,role,expires_at,teacher_portal_access_id&limit=1'))?.[0];
  if(!session||session.role!=='student'||session.teacher_portal_access_id||!uuid.test(session.student_id)||Date.parse(session.expires_at)<=now)return out({ok:false,message:'Sign in to your personal account.'},401);
  const actor=session.student_id;
  const student=(await db('students?id=eq.'+actor+'&select=id,frozen_at&limit=1'))?.[0];
  if(!student||student.frozen_at)return out({ok:false,message:'Account unavailable.'},403);
  const early=now<LAUNCH&&((await db('dm_papi_farm_early_access?student_id=eq.'+actor+'&expires_at=gt.'+encodeURIComponent(new Date(now).toISOString())+'&select=student_id&limit=1'))?.length===1);
  if(launch)return out({ok:true,launchAt:LAUNCH,now,open:now>=LAUNCH||early,early});
  if(now<LAUNCH&&!early)return out({ok:false,message:'The farm is opening soon.',launchAt:LAUNCH,now},423);
  const premium=(await db('rpc/dm_plan',{actor,account_role:'student'}))==='premium_pro';
  const row=(await db('dm_papi_farms?student_id=eq.'+actor+'&select=state,revision,last_action&limit=1'))?.[0];
  const state=row?F.validate(row.state,now):F.fresh(now), revision=row?.revision||0;
  if(!premium&&advanced(state.region))state.region='spring';
  const snapshot={state,revision,premium,now};
  if(b.op==='load')return out({ok:true,...snapshot});
  if(b.op!=='action'||!actions.has(b.action)||!uuid.test(String(b.id||''))||!Number.isSafeInteger(b.revision)||!Number.isInteger(b.index)||b.index<0||b.index>17||!Number.isInteger(b.qty)||b.qty<1||b.qty>1000000||!(b.key===null||typeof b.key==='string'&&b.key.length<=32||Number.isInteger(b.key)))return out({ok:false,message:'Invalid action.'},400);
  const keysets:Record<string,string[]>={buildStructure:['home','barn'],plant:['wheat','carrot','tomato','corn','strawberry'],sell:['wheat','carrot','tomato','corn','strawberry','stone','copper','crystal','egg','milk'],expand:['extension','summer','autumn','winter'],buyAnimal:['chick','hen','cow'],travel:['spring','summer','autumn','winter']};
  if(keysets[b.action]&&!keysets[b.action].includes(b.key)||b.action==='swap'&&(!Number.isInteger(b.key)||b.key<0||b.key>17)||b.action==='mine'&&b.index>2||b.action==='collectAnimal'&&b.index>5)return out({ok:false,message:'Invalid selection.'},400);
  if(row?.last_action===b.id)return out({ok:true,...snapshot,message:'Progress saved.'});
  if(b.revision!==revision)return out({ok:false,...snapshot,message:'Farm updated on another device. Try again.'},409);
  if(!premium&&(['expand','travel'].includes(b.action)&&advanced(b.key)))return out({ok:false,...snapshot,message:'This area is part of Premium Pro.'},403);
  // Fixed action vocabulary; the client may not submit state, time, coins, entitlement or XP.
  const result=F.act(state,b.action,b.index,b.key,now,b.qty);
  if(!result.ok)return out({ok:false,...snapshot,message:result.message},400);
  const saved=await db('rpc/dm_papi_farm_write',{p_actor:actor,p_revision:revision,p_action:b.id,p_state:state});
  if(saved!==true)return out({ok:false,message:'Farm updated on another device. Reopen the farm.'},409);
  return out({...result,state,revision:revision+1,premium,now});
 }catch(e){console.error('Papi Farm request failed',e instanceof Error?e.message:'unknown');return out({ok:false,message:'Farm service temporarily unavailable. Please retry.'},503);}
});
