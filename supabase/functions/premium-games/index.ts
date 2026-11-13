// Diji Medu · Premium Oyunlar (Kelime Eşleştirme).
// Mevcut portal oturumunu doğrular; enerji, 3 ücretsiz hak, ödül ve güçlendiriciler
// yalnızca service_role'e açık dm_pwm_* fonksiyonlarında kilitli olarak işlenir.
// verify_jwt=false: kimlik doğrulaması portal oturum anahtarı (token) ile yapılır.
const PROJECT_URL=Deno.env.get('SUPABASE_URL')||'';
const ADMIN_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  if(/^(Ücretsiz oyun|Ücretsiz 3 oyun|Bugünkü 5 bölüm|Oyuna başlamak için 5 enerji|Bu bölüm henüz|Geçersiz|Oyun bulunamadı|Oyun sonucu|Bu güçlendirici|Yeterli altının|Hesap bilgileri|Öğrenci oturumu)/.test(msg))throw new PolicyError(msg);
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
  const s=(await db('portal_sessions?token_hash=eq.'+await sha256(token)+'&select=student_id,teacher_id,role,expires_at,teacher_portal_access_id,teacher_portal_version&limit=1'))?.[0];
  if(!s||!['student','teacher'].includes(s.role)||Date.parse(s.expires_at)<=Date.now())return reply(req,{ok:false,mesaj:'Oturumun sona erdi. Tekrar giriş yap.'},401);
  const op=String(b.op||'status');
  const game=String(b.game||'word-match');
  if(game==='runners-papi')return reply(req,{ok:false,mesaj:'Runners Papi yayından kaldırıldı.'},410);
  const teacherGame=s.role==='teacher';
  let actor=s.student_id;
  if(teacherGame){
    if(!s.teacher_id||!s.teacher_portal_access_id)return reply(req,{ok:false,mesaj:'Öğretmen oturumu gerekli.'},403);
    const grant=(await db('teacher_portal_access?id=eq.'+s.teacher_portal_access_id+'&select=id,teacher_id,state,version&limit=1'))?.[0];
    const teacher=(await db('teachers?id=eq.'+s.teacher_id+'&select=id,active,frozen_at&limit=1'))?.[0];
    if(!grant||grant.state!=='approved'||grant.teacher_id!==s.teacher_id||grant.version!==s.teacher_portal_version||!teacher?.active||teacher.frozen_at)
      return reply(req,{ok:false,mesaj:'Öğretmen erişimi doğrulanamadı.'},403);
    // The same teacher-only profile is reused across devices. Never play as a pupil.
    actor=await db('rpc/dm_teacher_portal_guest',{grant_id:grant.id,guest_alias:'Premium Oyun',is_preview:true,secret_hash:crypto.randomUUID()});
  }else if(!actor)return reply(req,{ok:false,mesaj:'Öğrenci oturumu gerekli.'},401);
  if(op==='access')return reply(req,{ok:true,...await db('rpc/dm_game_access',{actor,game_key:game})});
  // Server-validated teacher plan: Free 3/game, Pro 5/day/game, Premium Pro unlimited.
  // Administrator override is exclusively in dm_plan(), tied to verified teachers.is_admin.
  async function teacherQuota(reserve=false){
    if(!teacherGame)return null;
    return await db('rpc/dm_teacher_premium_quota',{
      p_actor:actor,p_game:game,p_run:reserve?b.runId:null,p_reserve:reserve
    });
  }
  async function gameReply(data:Record<string,unknown>){
    const q=await teacherQuota(false);
    return reply(req,q?{...data,plan:q.plan,teacherGame:true,
      premium:q.plan==='premium_pro',
      remaining:q.plan==='pro'?q.remaining:data.remaining}:data);
  }
  async function startGame(path:string,payload:Record<string,unknown>){
    await teacherQuota(true);
    let result:Record<string,unknown>;
    try{result=await db(path,payload);}
    catch(error){
      if(teacherGame)await db('rpc/dm_teacher_premium_release',{p_actor:actor,p_game:game,p_run:b.runId}).catch(()=>{});
      throw error;
    }
    return await gameReply(result);
  }
  // Await the dispatch helpers here so rejected RPCs reach the HTTP error handler.
  if(b.game==='papizzle'){
   if(s.role==='student'&&s.teacher_portal_access_id)return reply(req,{ok:false,mesaj:'Papizzle için öğrenci hesabına giriş yap.'},403);
   if(op==='status')return await gameReply(await db('rpc/dm_papizzle_status',{actor}));
   if(!UUID.test(String(b.runId||'')))return reply(req,{ok:false,mesaj:'Geçersiz oyun.'},400);
   if(op==='start')return await startGame('rpc/dm_papizzle_start',{actor,run_key:b.runId});
   if(op==='finish'&&Array.isArray(b.selections)&&b.selections.length>=1&&b.selections.length<=256
      &&b.selections.every((pick:unknown)=>typeof pick==='number'&&Number.isInteger(pick)&&pick>=0&&pick<16)){
    return await gameReply(await db('rpc/dm_papizzle_finish',{actor,run_key:b.runId,selections:b.selections}));
   }
   return reply(req,{ok:false,mesaj:'Geçersiz oyun sonucu.'},400);
  }
  if(b.game==='cloud-flight'||b.game==='word-blocks'){
   const rpc=b.game==='word-blocks'?'dm_blocks':'dm_cloud';
   if(s.role==='student'&&s.teacher_portal_access_id)return reply(req,{ok:false,mesaj:'Bu oyun için öğrenci hesabına giriş yap.'},403);
   if(op==='status')return await gameReply(await db('rpc/'+rpc+'_status',{actor}));
   if(!UUID.test(String(b.runId||'')))return reply(req,{ok:false,mesaj:'Geçersiz oyun.'},400);
   if(op==='start')return await startGame('rpc/'+rpc+'_start',{actor,run_key:b.runId});
   if(op==='finish'&&Array.isArray(b.selections)&&b.selections.length<=20
      &&b.selections.every((pick:unknown)=>typeof pick==='number'&&Number.isInteger(pick)&&pick>=(b.game==='word-blocks'?0:-1)&&pick<=(b.game==='word-blocks'?5:2))){
    return await gameReply(await db('rpc/'+rpc+'_finish',{actor,run_key:b.runId,selections:b.selections}));
   }
   return reply(req,{ok:false,mesaj:'Geçersiz oyun sonucu.'},400);
  }
  // A pupil's classroom token must never grant unlimited premium game access.
  // Teacher personal access uses a separately verified teacher session and profile.
  if(s.role==='student'&&s.teacher_portal_access_id)
    return reply(req,{ok:false,mesaj:'Premium oyun için öğretmen veya kişisel hesabınla giriş yap.'},403);
  if(op==='status')return await gameReply(await db('rpc/dm_pwm_status',{actor}));
  if(op==='start'){
   const level=Number(b.level);
   if(!UUID.test(String(b.runId||''))||!Number.isInteger(level)||level<1||level>100)return reply(req,{ok:false,mesaj:'Geçersiz bölüm.'},400);
   return await startGame('rpc/dm_pwm_start',{actor,run_key:b.runId,p_level:level});
  }
  if(op==='finish'){
   if(!UUID.test(String(b.runId||''))||![b.score,b.moves,b.seconds].every(v=>Number.isSafeInteger(v)&&v>=0)||typeof b.won!=='boolean')return reply(req,{ok:false,mesaj:'Geçersiz oyun sonucu.'},400);
   return await gameReply(await db('rpc/dm_pwm_finish',{actor,run_key:b.runId,p_score:b.score,p_won:b.won,p_moves:b.moves,p_seconds:b.seconds}));
  }
  return reply(req,{ok:false,mesaj:'Geçersiz işlem.'},400);
 }catch(err){
  if(err instanceof PolicyError){const m=err.message;return reply(req,{ok:false,mesaj:m,hata:/enerji/.test(m)?'enerji':/oyun hakkın|3 oyun|5 bölüm/.test(m)?'hak':/altın/.test(m)?'altin':'kural'},400);}
  console.error('premium-games:',err instanceof Error?err.message:'error');
  return reply(req,{ok:false,mesaj:'Bağlantı kurulamadı. Tekrar dene.'},503);
 }
});
