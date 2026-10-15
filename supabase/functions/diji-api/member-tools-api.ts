import './placement-bank.js';
/* Authenticated support tools. Records live in existing per-student extra_data. */
export function memberToolsAPI({db,json,welcome,hash,teacherScope}:any){
 const ops=new Set(['memberStatus','memberReminderClaim','memberEmailResend','wordReviewAdd','wordReviewList','wordReviewAnswer','placementSave','teacherNotificationSummary','teacherNotificationRead','teacherPlacementResults']);
 const fail=(message:string,status=400)=>json({ok:false,mesaj:message},status);
 const day=()=>new Date(Date.now()+10800000).toISOString().slice(0,10);
 function week(){const d=new Date(Date.now()+10800000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
 const parse=(v:any)=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return {};}}return v||{};};
 async function get(student:string,key:string){const r=await db.from('extra_data').select('value,updated_at').eq('student_id',student).eq('key_name',key).maybeSingle();if(r.error)throw r.error;return r.data;}
 async function handle(op:string,b:any,_q:any,a:any,method:string){
  if(!ops.has(op))return null;
  if(method!=='POST')return fail('POST gerekli.',405);
  if(!a)return json({ok:false,hata:'oturum',mesaj:'Önce giriş yap.'},401);
  if(op.startsWith('teacherNotification')||op==='teacherPlacementResults'){
   if(a.role!=='teacher')return fail('Öğretmen oturumu gerekli.',403);
   const {data:all,error}=await db.from('students').select('id,username,teacher_id,status,created_at');if(error)throw error;
   const pupils=(all||[]).filter((s:any)=>s.teacher_id===a.teacher_id||(a.yonetici&&!s.teacher_id));
   const ids=pupils.map((s:any)=>s.id);
   if(op==='teacherPlacementResults'){if(!ids.length)return json({ok:true,results:[]});const r=await db.from('extra_data').select('student_id,value').in('student_id',ids).eq('key_name','placement_cefr_v2');if(r.error)throw r.error;return json({ok:true,results:(r.data||[]).map((x:any)=>({student:pupils.find((s:any)=>s.id===x.student_id)?.username||x.student_id,result:x.value}))});}
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
   const [exam,yo]=await Promise.all([get(sid,'placement_cefr_v2'),get(sid,'yo')]);
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
   let loginStreak=0;for(let i=0;i<370;i++){const stamp=new Date(Date.now()+10800000-i*86400000).toISOString().slice(0,10);if(!days.has(stamp))break;loginStreak++;}
   let maxLoginStreak=0,run=0,previous='';for(const stamp of [...days].sort()){run=previous&&Date.parse(stamp)-Date.parse(previous)===86400000?run+1:1;maxLoginStreak=Math.max(maxLoginStreak,run);previous=stamp;}
   const firstValue=parse(first?.value);
   return json({ok:true,emailVerified:!!s.email_verified_at,email:s.email||'',hasPlacement:!!exam?.value||!!parse(yo?.value).seviye,placement:exam?.value||null,teacherLinked:!!s.teacher_id,serverNow:now,maxLoginStreak,loginStreak,loginDays:days.size,memberFirstSeenAt:firstValue.at,welcomeEligible:!!firstValue.welcomeEligible,welcomeEarned:!!firstValue.welcomeEligible&&Date.now()-Date.parse(firstValue.at)>=120000});
  }
  if(op==='memberEmailResend'){
   if(s.email_verified_at)return json({ok:true,verified:true,mesaj:'E-posta adresin zaten doğrulanmış.'});
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email||''))return fail('Önce kişisel bilgilerden veli e-posta adresini tamamla.');
   try{await welcome(s);return json({ok:true,mesaj:'Doğrulama bağlantısı e-posta kuyruğuna alındı. Gelen kutusunu ve spam klasörünü kontrol et.'});}catch(e){return fail(String((e as Error).message),429);}
  }
  if(op==='memberReminderClaim'){
   const kind=b.kind==='email'?'email':b.kind==='placement'?'placement':'';if(!kind)return fail('Geçersiz uyarı.');
   if(kind==='email'&&s.email_verified_at)return json({ok:true,show:false});
   if(kind==='placement'){const [exam,yo]=await Promise.all([get(sid,'placement_cefr_v2'),get(sid,'yo')]);if(exam?.value||parse(yo?.value).seviye)return json({ok:true,show:false});}
   const prefix='member_notice:'+kind+':'+(kind==='email'?day():week())+':';
   const r=await db.from('extra_data').select('key_name,updated_at').eq('student_id',sid).like('key_name',prefix+'%');if(r.error)throw r.error;
   const records=r.data||[];if(records.length>=2)return json({ok:true,show:false});
   const recent=Math.max(0,...records.map((x:any)=>Date.parse(x.updated_at)||0));
   if(recent&&Date.now()-recent<(kind==='email'?4*3600000:30*60000))return json({ok:true,show:false});
   const key=prefix+(records.length+1);
   const ins=await db.from('extra_data').upsert({student_id:sid,key_name:key,value:{shown:true},updated_at:new Date().toISOString()},{onConflict:'student_id,key_name',ignoreDuplicates:true}).select('id');if(ins.error)throw ins.error;
   return json({ok:true,show:!!ins.data?.length,kind});
  }
  if(op==='wordReviewAdd'){
   if(b.legacy&&(await get(sid,'review_migrated_v1')))return json({ok:true,saved:0});
   const words=Array.isArray(b.words)?b.words.slice(0,b.legacy?1000:100):[];
   const rows=new Map();for(const w of words){const en=String(w.en||w.ingilizce||'').trim().slice(0,140),tr=String(w.tr||w.turkce||'').trim().slice(0,240);if(!en||!tr||/[<>]/.test(en+tr))continue;const key='review_word:'+await hash(en.toLocaleLowerCase('en'));rows.set(key,{student_id:sid,key_name:key,value:{en,tr,source:String(w.source||'').slice(0,60)},updated_at:new Date().toISOString()});}
   if(rows.size){const r=await db.from('extra_data').upsert([...rows.values()],{onConflict:'student_id,key_name'});if(r.error)throw r.error;}
   if(b.legacy){const m=await db.from('extra_data').upsert({student_id:sid,key_name:'review_migrated_v1',value:{done:true},updated_at:new Date().toISOString()},{onConflict:'student_id,key_name'});if(m.error)throw m.error;}
   return json({ok:true,saved:rows.size});
  }
  if(op==='wordReviewList'){
   const r=await db.from('extra_data').select('key_name,value,updated_at').eq('student_id',sid).like('key_name','review_word:%').order('updated_at',{ascending:false}).limit(1000);if(r.error)throw r.error;
   return json({ok:true,words:(r.data||[]).map((x:any)=>({id:x.key_name,...parse(x.value),version:x.updated_at}))});
  }
  if(op==='wordReviewAnswer'){
   const key=String(b.id||'');if(!/^review_word:[a-f0-9]{64}$/.test(key))return fail('Geçersiz kelime.');
   const record=await get(sid,key);if(!record)return json({ok:true,known:true});
   const word=parse(record.value),correct=String(b.answer||'').trim().toLocaleLowerCase('en')===String(word.en).trim().toLocaleLowerCase('en');
   if(correct){const r=await db.from('extra_data').delete().eq('student_id',sid).eq('key_name',key).eq('updated_at',record.updated_at);if(r.error)throw r.error;}
   return json({ok:true,correct,answer:word.en});
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
