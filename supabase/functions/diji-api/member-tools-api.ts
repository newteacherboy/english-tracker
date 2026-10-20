import {learningCompanionAPI} from './learning-companion.mjs';
import {due,nextReview} from './review-schedule.mjs';
import {placementStudyAccess} from './study-placement-access.mjs';
import './placement-bank.js'; import './start-placement-bank.js';
/* Authenticated support tools. Records live in existing per-student extra_data. */
export function memberToolsAPI({db,json,welcome,hash,teacherScope,useStreakShield}:any){
 const ops=new Set(['memberStatus','memberReminderClaim','memberEmailResend','wordReviewAdd','wordReviewList','wordReviewAnswer','placementSave','startPlacementSave','startPointChoose','startPlacementFollowup','studyPlacementInvite','teacherNotificationSummary','teacherNotificationRead','teacherPlacementResults','communicationRulesList','communicationRulesSave','communicationStats','communicationNoticePolicy']);
 const fail=(message:string,status=400)=>json({ok:false,mesaj:message},status);
 const day=()=>new Date(Date.now()+10800000).toISOString().slice(0,10);
 function week(){const d=new Date(Date.now()+10800000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
 const parse=(v:any)=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return {};}}return v||{};};
 async function get(student:string,key:string){const r=await db.from('extra_data').select('value,updated_at').eq('student_id',student).eq('key_name',key).maybeSingle();if(r.error)throw r.error;return r.data;}
 async function handle(op:string,b:any,_q:any,a:any,method:string){
  const companion=await learningCompanionAPI({db,json,teacherScope}).handle(op,b,a,method);if(companion)return companion;
  if(!ops.has(op))return null;
  if(method!=='POST')return fail('POST gerekli.',405);
  if(!a)return json({ok:false,hata:'oturum',mesaj:'Önce giriş yap.'},401);
  if(op==='communicationNoticePolicy'){
   if(a.role!=='student'||!a.student_id)return fail('Öğrenci oturumu gerekli.',403);
   const {data,error}=await db.from('dm_communication_rules').select('key,enabled,settings').eq('category','notice');
   if(error)throw error;
   return json({ok:true,rules:(data||[]).map((x:any)=>({key:x.key,enabled:x.enabled,settings:x.settings}))});
  }
  if(['communicationRulesList','communicationRulesSave','communicationStats'].includes(op)){
   if(a.role!=='teacher'||!a.yonetici)return fail('Yalnızca yönetici bu kuralları yönetebilir.',403);
   if(op==='communicationStats'){
     const today=new Date(Date.now()+10800000).toISOString().slice(0,10);
     const [queued,sent,failed,budget]=await Promise.all([
       db.from('mail_queue').select('id',{count:'exact',head:true}).is('sent_at',null),
       db.from('mail_queue').select('id',{count:'exact',head:true}).gte('sent_at',today+'T00:00:00+03:00'),
       db.from('mail_queue').select('id',{count:'exact',head:true}).is('sent_at',null).not('error','is',null),
       db.from('dm_mail_budget').select('attempts').eq('day',today).maybeSingle()
     ]);
     for(const result of [queued,sent,failed,budget])if(result.error)throw result.error;
     return json({ok:true,summary:{queued:queued.count||0,sentToday:sent.count||0,failedPending:failed.count||0,attemptsToday:budget.data?.attempts||0}});
   }
   if(op==='communicationRulesList'){
     const {data,error}=await db.from('dm_communication_rules').select('key,category,title,enabled,settings,updated_at').order('category').order('key');
     if(error)throw error;
     return json({ok:true,rules:data||[]});
   }
   const key=String(b.key||'');
   const allowed=new Set(['teacher_warning','email_verification','learner_intro','league_momentum','regular_reminders','weekly_league_mail','monday_league_mail','three_day_mail','daily_reengagement']);
   if(!allowed.has(key)||typeof b.enabled!=='boolean')return fail('Geçersiz kural ayarı.');
   const patch:any={enabled:b.enabled,updated_at:new Date().toISOString()};
   if(b.settings!==undefined){
     if(!b.settings||typeof b.settings!=='object'||Array.isArray(b.settings))return fail('Ayar nesnesi gerekli.');
     const text=JSON.stringify(b.settings);if(text.length>2500)return fail('Ayar boyutu çok büyük.');
     // Only known, bounded settings are editable. Legacy scheduled jobs must opt in separately.
     const numeric=['repeat_minutes','priority','first_active_minutes','gap_active_minutes','session_max','hour','interval_days','daily_max','batch_size'];
     const safe:any={};
     for(const [k,v] of Object.entries(b.settings)){
       if(numeric.includes(k)){if(!Number.isInteger(v)||Number(v)<0||Number(v)>10080)return fail('Sayısal ayar geçersiz.');safe[k]=v;}
       else if(['trigger','weekday','period','timezone'].includes(k)&&typeof v==='string'&&v.length<=45)safe[k]=v;
       else if(['safe_screen','on_change','no_consecutive_days'].includes(k)&&typeof v==='boolean')safe[k]=v;
       else return fail('Tanınmayan ayar alanı.');
     }
     patch.settings=safe;
   }
   const {data,error}=await db.from('dm_communication_rules').update(patch).eq('key',key).select('key,category,title,enabled,settings,updated_at').maybeSingle();
   if(error)throw error;if(!data)return fail('Kural bulunamadı.',404);
   await db.from('audit_logs').insert({actor_role:'teacher',actor_id:a.teacher_id,operation:'communicationRulesSave',target:key,payload:{enabled:patch.enabled,settings:patch.settings||null}});
   return json({ok:true,rule:data,notice:'Ayar kaydedildi. Canlı uygulamada uygulanması için ilgili duyuru veya mail işinin bu kurala bağlanmış olması gerekir.'});
  }
  if(op.startsWith('teacherNotification')||op==='teacherPlacementResults'){
   if(a.role!=='teacher')return fail('Öğretmen oturumu gerekli.',403);
   const {data:all,error}=await db.from('students').select('id,username,teacher_id,status,created_at');if(error)throw error;
   const pupils=(all||[]).filter((s:any)=>s.id!=='dcde2026-1015-4000-8000-000000000001').filter((s:any)=>s.teacher_id===a.teacher_id||(a.yonetici&&!s.teacher_id));
   const ids=pupils.map((s:any)=>s.id);
   if(op==='teacherPlacementResults'){if(!ids.length)return json({ok:true,results:[]});const r=await db.from('extra_data').select('student_id,value').in('student_id',ids).in('key_name',['placement_cefr_v2','placement_start_v1']);if(r.error)throw r.error;return json({ok:true,results:(r.data||[]).map((x:any)=>({student:pupils.find((s:any)=>s.id===x.student_id)?.username||x.student_id,result:x.value}))});}
   const {data:marks}=await db.from('audit_logs').select('created_at').eq('operation','teacherNotificationRead').eq('target',a.teacher_id).order('created_at',{ascending:false}).limit(1);
   if(op==='teacherNotificationRead'){const ins=await db.from('audit_logs').insert({actor_role:'teacher',actor_id:a.teacher_id,operation:op,target:a.teacher_id,payload:{}});if(ins.error)throw ins.error;return json({ok:true});}
   const last=Date.parse(marks?.[0]?.created_at||'')||Date.now()-7*86400000;
   const registration=pupils.filter((s:any)=>s.status==='pending'||Date.parse(s.created_at)>last).length;
   let unread=0;if(ids.length){const r=await db.from('chat_messages').select('id',{count:'exact',head:true}).in('student_id',ids).eq('sender_role','student').is('read_at',null);if(r.error)throw r.error;unread=r.count||0;}
   return json({ok:true,total:registration+unread,registrations:registration,messages:unread});
  }
  if(a.role!=='student'||!a.student_id)return fail('Öğrenci hesabı gerekli.',403);
  const {data:s,error}=await db.from('students').select('id,username,status,email,email_verified_at,email_verification_required,teacher_id,created_at').eq('id',a.student_id).maybeSingle();
  if(error)throw error;if(!s||s.status!=='approved')return fail('Hesap aktif değil.',403);
  const sid=s.id;
  if(op==='memberStatus'){
   const [exam,yo,startExam,profile]=await Promise.all([get(sid,'placement_cefr_v2'),get(sid,'yo'),get(sid,'placement_start_v1'),get(sid,'learner_profile_v1')]);
   // Per-account, server-dated login evidence; never trust another browser account's streak.
   const today=day(),now=new Date().toISOString();
   const login=await db.from('extra_data').upsert({student_id:sid,key_name:'member_login:'+today,value:{day:today},updated_at:now},{onConflict:'student_id,key_name',ignoreDuplicates:true});if(login.error)throw login.error;
   let first=await get(sid,'member_first_seen_v1');
   if(!first){const firstWrite=await db.from('extra_data').upsert({student_id:sid,key_name:'member_first_seen_v1',value:{at:now,welcomeEligible:Date.now()-Date.parse(s.created_at||'')<86400000},updated_at:now},{onConflict:'student_id,key_name',ignoreDuplicates:true});if(firstWrite.error)throw firstWrite.error;first=await get(sid,'member_first_seen_v1');}
   const [visits,claims,legacy]=await Promise.all([
    db.from('extra_data').select('key_name').eq('student_id',sid).like('key_name','member_login:%').order('key_name',{ascending:false}).limit(370),
    db.from('extra_data').select('key_name').eq('student_id',sid).like('key_name','energy_daily:%').order('key_name',{ascending:false}).limit(370),
    db.from('energy_transactions').select('created_at').eq('student_id',sid).eq('reason','gunluk').order('created_at',{ascending:false}).limit(370)
   ]);for(const r of [visits,claims,legacy])if(r.error)throw r.error;
   const days=new Set<string>([...(visits.data||[]),...(claims.data||[])].map((x:any)=>String(x.key_name).split(':')[1]));
   for(const x of legacy.data||[])days.add(new Date(Date.parse(x.created_at)+10800000).toISOString().slice(0,10));
   // Streak shields: a missed day (at most 2 in a row) is covered server-side, free once per week, then by a bought shield.
   const streakDays=new Set<string>(days),streakSaved:any[]=[];
   try{
    const shields=await db.from('extra_data').select('key_name,value').eq('student_id',sid).like('key_name','streak_shield:%').order('key_name',{ascending:false}).limit(370);if(shields.error)throw shields.error;
    const freeWeeks=new Set<string>();for(const r of shields.data||[]){const v=parse(r.value);streakDays.add(String(r.key_name).split(':')[1]);if(v.source==='free')freeWeeks.add(String(v.week||''));}
    const stampAt=(i:number)=>new Date(Date.now()+10800000-i*86400000).toISOString().slice(0,10);
    const weekOf=(stamp:string)=>{const d=new Date(stamp+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
    const missing:string[]=[];let i=1;while(i<=2&&!streakDays.has(stampAt(i))){missing.push(stampAt(i));i++;}
    let before=0;for(let j=i;j<370&&streakDays.has(stampAt(j));j++)before++;
    if(missing.length&&before>=2){
     const plan:any[]=[];const usedFree=new Set(freeWeeks);let paid=0;
     for(const stamp of missing.slice().reverse()){const w=weekOf(stamp);if(!usedFree.has(w)){usedFree.add(w);plan.push({stamp,source:'free',week:w});}else{paid++;plan.push({stamp,source:'paid',week:w});}}
     const owned=Math.max(0,Math.floor(Number(parse((await get(sid,'yo'))?.value).dondurucu)||0));
     if(paid<=owned&&(paid===0||typeof useStreakShield==='function')){
      for(const x of plan){
       // Claim the day first so concurrent requests can never spend twice for it.
       const key='streak_shield:'+x.stamp;
       const claim=await db.from('extra_data').upsert({student_id:sid,key_name:key,value:{source:x.source,week:x.week,at:now},updated_at:now},{onConflict:'student_id,key_name',ignoreDuplicates:true}).select('student_id');if(claim.error)throw claim.error;
       if(!claim.data?.length){streakDays.add(x.stamp);continue;}
       let ok=false;
       if(x.source==='free'){const c=await db.from('extra_data').upsert({student_id:sid,key_name:'streak_free_shield:'+x.week,value:{day:x.stamp},updated_at:now},{onConflict:'student_id,key_name',ignoreDuplicates:true}).select('student_id');if(c.error)throw c.error;ok=!!c.data?.length;}
       else{const r=await useStreakShield(sid);ok=!!r?.ok;}
       if(!ok){await db.from('extra_data').delete().eq('student_id',sid).eq('key_name',key);break;}
       streakDays.add(x.stamp);streakSaved.push({day:x.stamp,source:x.source});
      }
     }
    }
   }catch(e){console.warn('streak shield',e);}
   let loginStreak=0;for(let i=0;i<370;i++){const stamp=new Date(Date.now()+10800000-i*86400000).toISOString().slice(0,10);if(!streakDays.has(stamp))break;loginStreak++;}
   let maxLoginStreak=0,run=0,previous='';for(const stamp of [...streakDays].sort()){run=previous&&Date.parse(stamp)-Date.parse(previous)===86400000?run+1:1;maxLoginStreak=Math.max(maxLoginStreak,run);previous=stamp;}
   const firstValue=parse(first?.value);
   return json({ok:true,emailVerified:!!s.email_verified_at,email:s.email||'',hasPlacement:!!exam?.value||!!startExam?.value||!!parse(yo?.value).seviye,placement:exam?.value||null,startingPoint:startExam?.value||null,learnerProfile:profile?.value||null,teacherLinked:!!s.teacher_id,serverNow:now,maxLoginStreak,loginStreak,loginDays:days.size,streakSaved,memberFirstSeenAt:firstValue.at,welcomeEligible:!!firstValue.welcomeEligible,welcomeEarned:!!firstValue.welcomeEligible&&Date.now()-Date.parse(firstValue.at)>=120000});
  }
  if(op==='studyPlacementInvite'){
   const exam=await get(sid,'placement_start_v1');if(parse(exam?.value).completedAt)return json({ok:true,show:false,completed:true});
   const claim=await db.from('extra_data').upsert({student_id:sid,key_name:'study_placement_invite_v1',value:{shown:true},updated_at:new Date().toISOString()},{onConflict:'student_id,key_name',ignoreDuplicates:true}).select('id');if(claim.error)throw claim.error;
   return json({ok:true,show:!!claim.data?.length});
  }
  if(op==='memberEmailResend'){
   if(s.email_verified_at)return json({ok:true,verified:true,mesaj:'E-posta adresin zaten doğrulanmış.'});
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email||''))return fail('Önce kişisel bilgilerden veli e-posta adresini tamamla.');
   try{await welcome(s);return json({ok:true,mesaj:'Doğrulama bağlantısı e-posta kuyruğuna alındı. Gelen kutusunu ve spam klasörünü kontrol et.'});}catch(e){return fail(String((e as Error).message),429);}
  }
  if(op==='memberReminderClaim'){
   const kind=b.kind==='email'?'email':b.kind==='placement'?'placement':'';if(!kind)return fail('Geçersiz uyarı.');
   if(kind==='email'&&s.email_verified_at)return json({ok:true,show:false});
   if(kind==='placement'){const [exam,yo,startExam]=await Promise.all([get(sid,'placement_cefr_v2'),get(sid,'yo'),get(sid,'placement_start_v1')]);if(exam?.value||startExam?.value||parse(yo?.value).seviye)return json({ok:true,show:false});}
   const prefix='member_notice:'+kind+':'+(kind==='email'?'rolling':week())+':';
   const r=await db.from('extra_data').select('key_name,updated_at').eq('student_id',sid).like('key_name',prefix+'%').gte('updated_at',new Date(Date.now()-(kind==='email'?86400000:7*86400000)).toISOString());if(r.error)throw r.error;
   const records=r.data||[];if(kind==='placement'&&records.length>=2)return json({ok:true,show:false});
   const recent=Math.max(0,...records.map((x:any)=>Date.parse(x.updated_at)||0));
   if(recent&&Date.now()-recent<(kind==='email'?10*60000:30*60000))return json({ok:true,show:false});
   const key=kind==='email'?prefix+String(Math.floor(Date.now()/600000)):prefix+(records.length+1);
   const ins=await db.from('extra_data').upsert({student_id:sid,key_name:key,value:{shown:true},updated_at:new Date().toISOString()},{onConflict:'student_id,key_name',ignoreDuplicates:true}).select('id');if(ins.error)throw ins.error;
   return json({ok:true,show:!!ins.data?.length,kind});
  }
  if(op==='wordReviewAdd'){
   if(b.legacy&&(await get(sid,'review_migrated_v1')))return json({ok:true,saved:0});
   const words=Array.isArray(b.words)?b.words.slice(0,b.legacy?1000:100):[];
   const rows=new Map();for(const w of words){const en=String(w.en||w.ingilizce||'').trim().slice(0,140),tr=String(w.tr||w.turkce||'').trim().slice(0,240);if(!en||!tr||/[<>]/.test(en+tr))continue;const key='review_word:'+await hash(en.toLocaleLowerCase('en'));rows.set(key,{en,tr,source:String(w.source||'').slice(0,60)});}
   for(const [key,word] of rows){
     let saved=false;
     for(let attempt=0;attempt<3&&!saved;attempt++){
       const previous=await get(sid,key),now=new Date(Math.max(Date.now(),Date.parse(previous?.updated_at||'')+1||0)).toISOString();
       const value={...parse(previous?.value),...word,streak:0,dueAt:now};
       const r=previous?await db.from('extra_data').update({value,updated_at:now}).eq('student_id',sid).eq('key_name',key).eq('updated_at',previous.updated_at).select('key_name'):await db.from('extra_data').upsert({student_id:sid,key_name:key,value,updated_at:now},{onConflict:'student_id,key_name',ignoreDuplicates:true}).select('key_name');if(r.error)throw r.error;saved=!!r.data?.length;
     }
     if(!saved)throw Error('Kelime kaydı başka ekranda değişti; yeniden denenecek.');
   }
   if(b.legacy){const m=await db.from('extra_data').upsert({student_id:sid,key_name:'review_migrated_v1',value:{done:true},updated_at:new Date().toISOString()},{onConflict:'student_id,key_name'});if(m.error)throw m.error;}
   return json({ok:true,saved:rows.size});
  }
  if(op==='wordReviewList'){
   const r=await db.from('extra_data').select('key_name,value,updated_at').eq('student_id',sid).like('key_name','review_word:%').order('updated_at',{ascending:false}).limit(1000);if(r.error)throw r.error;
   const words=(r.data||[]).map((x:any)=>({id:x.key_name,...parse(x.value),version:x.updated_at}));
   return json({ok:true,words:words.filter((w:any)=>due(w)).sort((x:any,y:any)=>(Date.parse(x.dueAt)||0)-(Date.parse(y.dueAt)||0)),scheduled:words.filter((w:any)=>!due(w)).length});
  }
  if(op==='wordReviewAnswer'){
   const key=String(b.id||'');if(!/^review_word:[a-f0-9]{64}$/.test(key))return fail('Geçersiz kelime.');
   const record=await get(sid,key);if(!record)return json({ok:true,known:true});
   const word=parse(record.value);
   if((b.version&&b.version!==record.updated_at)||!due(word))return json({ok:true,correct:word.lastCorrect===true,answer:word.en,stale:true,dueAt:word.dueAt});
   const correct=String(b.answer||'').trim().toLocaleLowerCase('en')===String(word.en).trim().toLocaleLowerCase('en');
   const value=nextReview(word,correct),updated=new Date(Math.max(Date.now(),Date.parse(record.updated_at)+1)).toISOString();
   const r=await db.from('extra_data').update({value,updated_at:updated}).eq('student_id',sid).eq('key_name',key).eq('updated_at',record.updated_at).select('key_name');if(r.error)throw r.error;
   return json({ok:true,correct,answer:word.en,stale:!r.data?.length,dueAt:value.dueAt,streak:value.streak});
  }
  if(op==='startPlacementSave'){
   const exam=(globalThis as any).DMStartPlacementBank;
   if(b.version!==exam.version)return fail('Test sürümü değişti; yeniden başlat.');
   let result;try{result=exam.evaluate(b.records);}catch(e){return fail((e as Error).message);}
   const previous=placementStudyAccess((await get(sid,'placement_start_v1'))?.value),bands=['A1','A2','B1','B2'],current=result.level==='Başlangıç'?'A1':result.level,studyUnlockedLevel=bands[Math.max(bands.indexOf(previous.level),bands.indexOf(current),0)];
   const saved={...result,studyUnlockedLevel,completedAt:new Date().toISOString(),writing:String(b.writing||'').trim().slice(0,3000),speaking:String(b.speaking||'').trim().slice(0,3000)};
   const r=await db.from('extra_data').upsert({student_id:sid,key_name:'placement_start_v1',value:saved,updated_at:saved.completedAt},{onConflict:'student_id,key_name'});if(r.error)throw r.error;
   return json({ok:true,result:saved});
  }
  if(op==='startPointChoose'){
   // The learner may start at or below the trusted test result, never above it.
   const tested=placementStudyAccess((await get(sid,'placement_start_v1'))?.value),level=String(b.level||'');
   if(!tested.level)return fail('Önce başlangıç testini tamamla.',409);
   if(!tested.levels.includes(level))return fail('Test sonucunun üstünde bir seviyeden başlanamaz.',403);
   const at=new Date().toISOString(),r=await db.from('extra_data').upsert({student_id:sid,key_name:'start_point_v1',value:{level,at},updated_at:at},{onConflict:'student_id,key_name'});if(r.error)throw r.error;
   return json({ok:true,level});
  }
  if(op==='startPlacementFollowup'){
   const exam=parse((await get(sid,'placement_start_v1'))?.value);if(!exam.completedAt)return json({ok:true,pending:false});
   const rows=await db.from('papi_story_progress').select('chapter,mistakes,updated_at').eq('student_id',sid).eq('completed',true).eq('replay',false).gte('chapter',1000).gte('updated_at',exam.completedAt).order('updated_at',{ascending:true}).limit(5);if(rows.error)throw rows.error;
   const count=(rows.data||[]).length;if(count<3)return json({ok:true,pending:true,completed:count});
   const mistakes=(rows.data||[]).reduce((n:any,r:any)=>n+Number(r.mistakes||0),0),recommendation=mistakes>=count*3?'reinforce':mistakes===0?'challenge':'continue';
   return json({ok:true,pending:false,completed:count,recommendation,level:exam.level});
  }
  if(op==='placementSave'){
   const exam=(globalThis as any).DMPlacementExam;
   if(b.version!==exam.version||!Array.isArray(b.answers)||b.answers.length!==exam.bank.length)return fail('Sınav tamamlanmadı.');
   if(b.answers.some((v:any)=>!Number.isInteger(v)||v<0||v>3))return fail('Her soruyu yanıtlamalısın.');
   const result={...exam.evaluate(b.answers),listeningAvailable:b.listeningAvailable===true,writing:String(b.writing||'').trim().slice(0,3000),speaking:String(b.speaking||'').trim().slice(0,3000),completedAt:new Date().toISOString(),version:exam.version};
   const r=await db.from('extra_data').upsert({student_id:sid,key_name:'placement_cefr_v2',value:result,updated_at:result.completedAt},{onConflict:'student_id,key_name'});if(r.error)throw r.error;
   return json({ok:true,result});
  }
  return null;
 }
 return {handle};
}
