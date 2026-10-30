import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { verifyCallback, googleKey } from './ssv.mjs';
const key=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db=createClient(Deno.env.get('SUPABASE_URL')!,key!,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-diji-token','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const u=new URL(req.url);
 if(req.method==='GET' && u.pathname.endsWith('/ssv')) {
  let p:URLSearchParams;
  try{p=await verifyCallback(req.url,googleKey);}catch{return reply({verified:false},400);}
  if(!uuid(p.get('custom_data')))return reply({verified:true,credited:false}); // AdMob dashboard test, no student grant.
  const stamp=Number(p.get('timestamp')), amount=Number(p.get('reward_amount'));
  if(!Number.isSafeInteger(stamp)||stamp<1e12||stamp>1e14||!Number.isInteger(amount)||![3,100].includes(amount))return reply({verified:true,credited:false});
  const {data,error}=await db.rpc('dm_ad_claim',{p_id:p.get('custom_data'),p_transaction:p.get('transaction_id'),p_unit:p.get('ad_unit'),p_amount:amount,p_event_at:new Date(stamp).toISOString()});
  if(error)return reply({error:'Reward verification temporarily unavailable'},503);
  return reply({verified:true,...data});
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'Request too large'},413);
 let body;
 try {const raw=await req.text();if(raw.length>4096)return reply({error:'Request too large'},413);body=JSON.parse(raw);}catch{return reply({error:'Invalid request'},400);}
 if(!body || typeof body!=='object' || Array.isArray(body))return reply({error:'Invalid request'},400);
 const token=req.headers.get('x-diji-token')||'';
 if(token.length<16||token.length>1024)return reply({error:'Öğrenci oturumu gerekli'},401);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 const {data:s,error:sessionError}=await db.from('portal_sessions').select('student_id,role,expires_at,teacher_portal_access_id').eq('token_hash',hash).maybeSingle();
 if(sessionError)return reply({error:'Session verification unavailable'},503);
 if(!s||s.role!=='student'||!s.student_id||s.teacher_portal_access_id||!Number.isFinite(Date.parse(s.expires_at))||Date.parse(s.expires_at)<=Date.now())return reply({error:'Öğrenci oturumu gerekli'},401);
 if(!['create','status','cancel'].includes(body.action)||(body.action==='create'? !['energy','gold'].includes(body.kind)||!uuid(body.requestKey):!uuid(body.id)))return reply({error:'Invalid action'},400);
 const {data,error}=await db.rpc('dm_ad_intent',{p_actor:s.student_id,p_action:body.action,p_kind:body.kind||null,p_id:body.id||null,p_request:body.requestKey||null});
 if(error)return reply({error:error.code==='P0001'?error.message:'İşlem şu an tamamlanamadı'},error.code==='P0001'?409:503);
 return reply(data);
});
