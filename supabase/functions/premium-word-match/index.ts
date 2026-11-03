// Diji-Medu Premium Kelime Eşleştirme access gate.
// Validates the existing Diji portal session; no service credential is exposed to browsers.
const PROJECT_URL=Deno.env.get('SUPABASE_URL')||'';
const ADMIN_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const allowed=new Set(['https://app.dijimedu.com','https://dijimedu.com','https://www.dijimedu.com','http://localhost:3000','http://127.0.0.1:3000']);
function headers(req:Request){const origin=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':allowed.has(origin)?origin:'https://app.dijimedu.com','Access-Control-Allow-Headers':'content-type, authorization, apikey, x-client-info, x-diji-token','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'86400','Vary':'Origin','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};}
function reply(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:headers(req)});}
async function sha256(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function db(path:string,options:RequestInit={}){const r=await fetch(PROJECT_URL+'/rest/v1/'+path,{...options,headers:{apikey:ADMIN_KEY,Authorization:'Bearer '+ADMIN_KEY,'Content-Type':'application/json',...(options.headers||{})},cache:'no-store'});let data:any=null;try{data=await r.json();}catch{}if(!r.ok)throw Error('Database '+r.status);return data;}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=='POST')return reply(req,{ok:false,message:'Yalnızca POST desteklenir.'},405);
 if(!PROJECT_URL||!ADMIN_KEY)return reply(req,{ok:false,message:'Premium oyun servisi yapılandırılmamış.'},503);
 try{
  const body=await req.json().catch(()=>({}));
  const token=String(body.t||req.headers.get('x-diji-token')||'');
  if(token.length<40||token.length>300)return reply(req,{ok:false,message:'Oturum açmalısın.'},401);
  const session=(await db('portal_sessions?token_hash=eq.'+await sha256(token)+'&select=student_id,role,expires_at&limit=1'))?.[0];
  if(!session||session.role!=='student'||!session.student_id||Date.parse(session.expires_at)<=Date.now())return reply(req,{ok:false,message:'Oturum sona erdi. Tekrar giriş yap.'},401);
  const student=(await db('students?id=eq.'+session.student_id+'&select=id,status,frozen_at&limit=1'))?.[0];
  if(!student||student.status!=='approved'||student.frozen_at)return reply(req,{ok:false,message:'Hesap etkin değil.'},403);
  const action=body.action==='start'?'start':'check',run=action==='start'?String(body.runId||''):null;
  if(action==='start'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(run||''))return reply(req,{ok:false,message:'Geçersiz oyun oturumu.'},400);
  const status=await db('rpc/dm_premium_match_access',{method:'POST',body:JSON.stringify({p_student:session.student_id,p_run:run,p_check:action==='check'})});
  return reply(req,{ok:true,...status});
 }catch(err){console.error('premium-word-match:',err instanceof Error?err.message:'error');return reply(req,{ok:false,message:'Oyun hakkı kontrol edilemedi. Tekrar dene.'},503);}
});