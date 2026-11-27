const URL=Deno.env.get('SUPABASE_URL')||'',KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization, apikey, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const hash=async(s:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function db(path:string,body?:unknown){const r=await fetch(URL+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error('Database error');return await r.json()}
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return out({ok:false,message:'POST only'},405);try{
 const raw=await req.text();if(raw.length>2048)return out({ok:false,message:'Geçersiz istek.'},400);const b=JSON.parse(raw);
 if(!URL||!KEY)return out({ok:false,message:'Servis hazırlanıyor.'},503);
 if(typeof b.t!=='string'||b.t.length<20||b.t.length>400)return out({ok:false,message:'Hesabına giriş yap.'},401);
 const s=(await db('portal_sessions?token_hash=eq.'+await hash(b.t)+'&select=student_id,role,expires_at,teacher_portal_access_id&limit=1'))?.[0];
 if(!s||s.role!=='student'||s.teacher_portal_access_id||!uuid.test(s.student_id)||Date.parse(s.expires_at)<=Date.now())return out({ok:false,message:'Kişisel hesabına giriş yap.'},401);
 if(!['status','start','answer'].includes(b.op)||b.op==='answer'&&(!uuid.test(String(b.questionId||''))||![0,1].includes(b.pick)))return out({ok:false,message:'Geçersiz işlem.'},400);
 return out(await db('rpc/dm_goal3d_play',{p_actor:s.student_id,p_op:b.op,p_question:b.op==='answer'?b.questionId:null,p_pick:b.op==='answer'?b.pick:null}));
 }catch(e){console.error('Word Goal 3D service error',e instanceof Error?e.message:'unknown');return out({ok:false,message:'Bağlantı sorunu. Tekrar dene.'},503)}});
