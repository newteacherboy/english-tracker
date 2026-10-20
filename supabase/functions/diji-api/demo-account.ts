export const DEMO_ID='dcde2026-1015-4000-8000-000000000001';
export const DEMO_USER='dijimedu_demo';
export const isDemo=(a:any)=>a?.role==='student'&&a.student_id===DEMO_ID;
/* Demo hesabı her parkura, bölüme ve oyuna erişir (20 Eki 2026). Kapalı olanlar yalnızca:
   öğretmene mesaj, şifre değiştirme ve şifreyi sıfırlamaya yol açabilecek e-posta değişikliği.
   Hesap dondurma ve silme account-delete fonksiyonunda kapalıdır. */
export const DEMO_BLOCKED=new Set(['sohbetMesajGonder','sifreDegistir','sifremiDegistir','sifreSifirlamaIste','memberEmailResend','iletisimGuncelle']);
export const DEMO_PASSWORD_HASH='pbkdf2$210000$kz3nVx+iiNnFVmYTawObdA==$xPIK3djL2coH56WC9L3fBYOgAFtk4xjzorVZVuzYZOk='; // şifre: 31526931
/* A valid starting-test record: the learning route never asks the demo account for the level test. */
export const DEMO_PLACEMENT=()=>({version:'starting-point-20261018-v1',total:24,correct:24,level:'B2',studyUnlockedLevel:'B2',completedAt:new Date().toISOString(),demo:true});
export async function prepareDemo(db:any,passwordHash:string){
 const check=await db.from('students').select('id,username').eq('id',DEMO_ID).maybeSingle();if(check.error)throw check.error;
 if(check.data&&check.data.username!==DEMO_USER)throw Error('Demo identity conflict');
 if(!check.data){const created=await db.from('students').insert({id:DEMO_ID,username:DEMO_USER,password_hash:passwordHash,status:'approved',role:'student',class_no:6,selected_class:6,gold:100000,energy:10000,energy_max:10000});if(created.error)throw created.error;}
 const placement=await db.from('extra_data').select('value').eq('student_id',DEMO_ID).eq('key_name','placement_start_v1').maybeSingle();if(placement.error)throw placement.error;
 if(!placement.data){const r=await db.from('extra_data').upsert({student_id:DEMO_ID,key_name:'placement_start_v1',value:DEMO_PLACEMENT(),updated_at:new Date().toISOString()},{onConflict:'student_id,key_name'});if(r.error)throw r.error;}
 const marker=await db.from('extra_data').select('value').eq('student_id',DEMO_ID).eq('key_name','demo_initialized_v1').maybeSingle();if(marker.error)throw marker.error;if(marker.data)return;
 const yo=await db.from('extra_data').upsert({student_id:DEMO_ID,key_name:'yo',value:{totalXp:100000,altin:100000,seviye:'B2',dmLearningPurpose:'school',dmParkurMigration:{version:1},karakter:{cins:'e',sahip:[]}},updated_at:new Date().toISOString()},{onConflict:'student_id,key_name'});if(yo.error)throw yo.error;
 const ctx=await db.rpc('dm_progress_context',{actor:DEMO_ID});if(ctx.error)throw ctx.error;
 const stops=(ctx.data.units||[]).flat().map((n:number)=>({student_id:DEMO_ID,mode:'buyu',class_no:Math.floor((n-200000)/10000),unit_no:Math.floor((n-200000)%10000/100),level_no:n}));
 for(let i=0;i<stops.length;i+=250){const r=await db.from('level_completions').upsert(stops.slice(i,i+250),{onConflict:'student_id,mode,class_no,unit_no,level_no',ignoreDuplicates:true});if(r.error)throw r.error;}
 const topics=await db.from('lesson_topics').select('level,category,topic_name').eq('active',true);if(topics.error)throw topics.error;
 if(topics.data?.length){const existing=await db.from('lesson_progress').select('level,category,topic_name').eq('student_id',DEMO_ID);if(existing.error)throw existing.error;const keys=new Set((existing.data||[]).map((t:any)=>[t.level,t.category,t.topic_name].join('|')));const fresh=topics.data.filter((t:any)=>!keys.has([t.level,t.category,t.topic_name].join('|'))).map((t:any)=>({...t,student_id:DEMO_ID,test_success:true,knew_it:true}));if(fresh.length){const r=await db.from('lesson_progress').insert(fresh);if(r.error)throw r.error;}}
 const chapters=Array.from({length:80},(_,chapter)=>({actor_key:'s:'+DEMO_ID,student_id:DEMO_ID,chapter,cursor:0,completed:true,reward_claimed:true,replay:true,version:0,deck_version:4}));const story=await db.from('papi_story_progress').upsert(chapters,{onConflict:'actor_key,chapter',ignoreDuplicates:true});if(story.error)throw story.error;
 const done=await db.from('extra_data').upsert({student_id:DEMO_ID,key_name:'demo_initialized_v1',value:{ready:true}},{onConflict:'student_id,key_name'});if(done.error)throw done.error;
}

/* The fixed review identity is usable by its owner but never a public participant. */
export function publicParticipant(row:any){
 const r=row||{},ids=[r.id,r.student_id,r.sender_student_id,r.receiver_student_id,r.target_student_id,r.player_a,r.player_b];
 const names=[r.username,r.student_name,r.ogrenci,r.isim,r.name,r.sender?.username,r.receiver?.username,r.students?.username,r.a?.username,r.b?.username,r.payload?.target_name,r.payload?.student_name];
 return !ids.includes(DEMO_ID)&&r.actor_key!=='s:'+DEMO_ID&&!names.some(x=>String(x||'').trim().toLowerCase()===DEMO_USER);
}
