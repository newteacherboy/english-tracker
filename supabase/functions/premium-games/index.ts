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
  const game=String(b.game||'word-match');
  // Retired for every role. Reject before authentication or any database/RPC call.
  if(['tower','word-blocks','kule','premiumtower','premiumblok','papizzle','word-match','word_match','candypapi','candy-papi','candy-papis','pwm'].includes(game.toLowerCase()))return reply(req,{ok:false,hata:'oyun_kaldirildi',mesaj:'Bu oyun yayından kaldırıldı.'},410);
  const token=String(b.t||'');
  if(token.length<20||token.length>400)return reply(req,{ok:false,mesaj:'Oyun için hesabına giriş yap.'},401);
  const s=(await db('portal_sessions?token_hash=eq.'+await sha256(token)+'&select=student_id,teacher_id,role,expires_at,teacher_portal_access_id,teacher_portal_version&limit=1'))?.[0];
  if(!s||!['student','teacher'].includes(s.role)||Date.parse(s.expires_at)<=Date.now())return reply(req,{ok:false,mesaj:'Oturumun sona erdi. Tekrar giriş yap.'},401);
  if(game==='cloud-flight'&&s.role==='student'&&!s.teacher_portal_access_id)return reply(req,{ok:false,hata:'oyun_kaldirildi',mesaj:'Bu oyun artık öğrenci hesabında sunulmuyor.'},410);
  const op=String(b.op||'status');
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
  if(op==='ad-prepare'||op==='ad-redeem'){
    if(teacherGame||s.teacher_portal_access_id)return reply(req,{ok:false,mesaj:'Öğrenci oturumu gerekli.'},403);
    if(op==='ad-redeem'&&!UUID.test(String(b.offerId||'')))return reply(req,{ok:false,mesaj:'Geçersiz reklam teklifi.'},400);
    return reply(req,await db('rpc/dm_premium_ad_offer',{actor,game_key:game,op:op==='ad-prepare'?'prepare':'redeem',offer_key:b.offerId||null}));
  }
  async function trackStart(data:Record<string,unknown>) {
    if (!teacherGame && data.ok !== false && !data.result && UUID.test(String(b.teamTicket || ''))) {
      await db('rpc/dm_team_premium_bind',{actor,ticket:b.teamTicket,game_key:game,run_key:b.runId})
        .catch(() => console.error('Team game start could not be registered'));
    }
    return data;
  }
  async function trackFinish(data:Record<string,unknown>) {
    if (teacherGame || data.ok===false || game==='word-match') return data;
    const teamPoints=await db('rpc/dm_team_premium_points',{actor,game_key:game,run_key:b.runId})
      .catch(() => 0);
    return {...data,teamPoints};
  }
  if(op==='access')return reply(req,{ok:true,...await db('rpc/dm_game_access',{actor,game_key:game})});
  if(game==='word-goal'){
    if(s.role==='student'&&s.teacher_portal_access_id)return reply(req,{ok:false,mesaj:'Premium oyun için kişisel hesabına giriş yap.'},403);
    const rpc='dm_goal';
    if(op==='status')return reply(req,await db('rpc/'+rpc+'_status',{actor}));
    if(!UUID.test(String(b.runId||'')))return reply(req,{ok:false,mesaj:'Geçersiz oyun.'},400);
    if(op==='start')return reply(req,await trackStart(await db('rpc/'+rpc+'_start',{actor,run_key:b.runId})));
    if(op==='finish'&&Array.isArray(b.selections)&&b.selections.length>=4&&b.selections.length<=12&&b.selections.every((pick:unknown)=>typeof pick==='number'&&Number.isInteger(pick)&&pick>=-1&&pick<=3)){
      return reply(req,await trackFinish(await db('rpc/'+rpc+'_finish',{actor,run_key:b.runId,selections:b.selections})));
    }
    return reply(req,{ok:false,mesaj:'Geçersiz oyun sonucu.'},400);
  }
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
    return await gameReply(await trackStart(result));
  }
  // Await the dispatch helpers here so rejected RPCs reach the HTTP error handler.
  if(b.game==='cloud-flight'){
   const rpc='dm_cloud';
   if(s.role==='student'&&s.teacher_portal_access_id)return reply(req,{ok:false,mesaj:'Bu oyun için öğrenci hesabına giriş yap.'},403);
   if(op==='status')return await gameReply(await db('rpc/'+rpc+'_status',{actor}));
   if(!UUID.test(String(b.runId||'')))return reply(req,{ok:false,mesaj:'Geçersiz oyun.'},400);
   if(op==='start')return await startGame('rpc/'+rpc+'_start',{actor,run_key:b.runId});
   if(op==='finish'&&Array.isArray(b.selections)&&b.selections.length<=20
      &&b.selections.every((pick:unknown)=>typeof pick==='number'&&Number.isInteger(pick)&&pick>=-1&&pick<=2)){
    return await gameReply(await trackFinish(await db('rpc/'+rpc+'_finish',{actor,run_key:b.runId,selections:b.selections})));
   }
   return reply(req,{ok:false,mesaj:'Geçersiz oyun sonucu.'},400);
  }
  return reply(req,{ok:false,mesaj:'Geçersiz işlem.'},400);
 }catch(err){
  if(err instanceof PolicyError){const m=err.message;return reply(req,{ok:false,mesaj:m,hata:/enerji/.test(m)?'enerji':/oyun hakkın|3 oyun|5 bölüm/.test(m)?'hak':/altın/.test(m)?'altin':'kural'},400);}
  console.error('premium-games:',err instanceof Error?err.message:'error');
  return reply(req,{ok:false,mesaj:'Bağlantı kurulamadı. Tekrar dene.'},503);
 }
});

