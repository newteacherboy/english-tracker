// Diji Medu · Premium Oyunlar (Kelime Eşleştirme).
// Mevcut portal oturumunu doğrular; enerji, 3 ücretsiz hak, ödül ve güçlendiriciler
// yalnızca service_role'e açık dm_pwm_* fonksiyonlarında kilitli olarak işlenir.
// verify_jwt=false: kimlik doğrulaması portal oturum anahtarı (token) ile yapılır.
const PROJECT_URL=Deno.env.get('SUPABASE_URL')||'';
const ADMIN_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOOSTERS=new Set(['karistir','degistir','satir','renk']);
// Token gövdede taşınır (çerez yok); diji-api gibi tüm kökenlere açık.
function headers(_req:Request){return {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization, apikey, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'86400','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};}
function reply(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:headers(req)});}
async function sha256(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
class PolicyError extends Error{}
async function db(path:string,body?:unknown){
 const r=await fetch(PROJECT_URL+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',body:body===undefined?undefined:JSON.stringify(body),headers:{apikey:ADMIN_KEY,Authorization:'Bearer '+ADMIN_KEY,'Content-Type':'application/json'},cache:'no-store'});
 let data:any=null;try{data=await r.json();}catch{}
 if(!r.ok){
  const msg=String(data?.message||'');
  // Yalnızca bilinçli politika hataları kullanıcıya gösterilir.
  if(/^(Ücretsiz 3 oyun|Bugünkü 5 bölüm|Oyuna başlamak için 5 enerji|Bu bölüm henüz|Geçersiz|Oyun bulunamadı|Oyun sonucu|Bu güçlendirici|Yeterli altının|Hesap bilgileri|Öğrenci oturumu)/.test(msg))throw new PolicyError(msg);
  throw Error('Database '+r.status);
 }
 return data;
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=='POST')return reply(req,{ok:false,mesaj:'Yalnızca POST desteklenir.'},405);
 if(!PROJECT_URL||!ADMIN_KEY)return reply(req,{ok:false,mesaj:'Premium oyun servisi hazır değil.'},503);
 try{
  const b=await req.json().catch(()=>({}));
  const token=String(b.t||'');
  if(token.length<20||token.length>400)return reply(req,{ok:false,mesaj:'Oyun için hesabına giriş yap.'},401);
  const s=(await db('portal_sessions?token_hash=eq.'+await sha256(token)+'&select=student_id,role,expires_at,teacher_portal_access_id&limit=1'))?.[0];
  if(!s||s.role!=='student'||!s.student_id||Date.parse(s.expires_at)<=Date.now())return reply(req,{ok:false,mesaj:'Oturumun sona erdi. Tekrar giriş yap.'},401);
  const op=String(b.op||'status');
  // Öğretmen portalında oyun sınıfta gösterilir: hak, enerji ve ödül işlenmez.
  if(s.teacher_portal_access_id){
   const st=await db('rpc/dm_pwm_status',{actor:s.student_id}).catch(()=>({}));
   return reply(req,{...st,ok:true,practice:true,premium:true,remaining:999,level:100,xp:0,gold:0,won:!!b.won,stars:0});
  }
  const actor=s.student_id;
  if(op==='status')return reply(req,await db('rpc/dm_pwm_status',{actor}));
  if(op==='start'){
   const level=Number(b.level);
   if(!UUID.test(String(b.runId||''))||!Number.isInteger(level)||level<1||level>100)return reply(req,{ok:false,mesaj:'Geçersiz bölüm.'},400);
   return reply(req,await db('rpc/dm_pwm_start',{actor,run_key:b.runId,p_level:level}));
  }
  if(op==='finish'){
   if(!UUID.test(String(b.runId||''))||![b.score,b.moves,b.seconds].every(v=>Number.isSafeInteger(v)&&v>=0)||typeof b.won!=='boolean')return reply(req,{ok:false,mesaj:'Geçersiz oyun sonucu.'},400);
   return reply(req,await db('rpc/dm_pwm_finish',{actor,run_key:b.runId,p_score:b.score,p_won:b.won,p_moves:b.moves,p_seconds:b.seconds}));
  }
  if(op==='buy'||op==='use'){
   if(!BOOSTERS.has(String(b.kind)))return reply(req,{ok:false,mesaj:'Geçersiz güçlendirici.'},400);
   if(op==='use'&&!UUID.test(String(b.runId||'')))return reply(req,{ok:false,mesaj:'Oyun bulunamadı.'},400);
   return reply(req,await db('rpc/dm_pwm_booster',{actor,kind:b.kind,op,run_key:op==='use'?b.runId:null}));
  }
  return reply(req,{ok:false,mesaj:'Geçersiz işlem.'},400);
 }catch(err){
  if(err instanceof PolicyError){const m=err.message;return reply(req,{ok:false,mesaj:m,hata:/enerji/.test(m)?'enerji':/3 oyun|5 bölüm/.test(m)?'hak':/altın/.test(m)?'altin':'kural'},400);}
  console.error('premium-games:',err instanceof Error?err.message:'error');
  return reply(req,{ok:false,mesaj:'Bağlantı kurulamadı. Tekrar dene.'},503);
 }
});
