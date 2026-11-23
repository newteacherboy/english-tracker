import {normalizeStop,voiceURL,schoolWords,studyWordScope,practiceCount} from './parent-content.mjs';
import chapters from './parent-learning-chapters.json' with {type:'json'};

const ROOT='https://app.dijimedu.com/ingilizce/';
const IMAGE_ROOT='https://nxfqlutulxqzqgwewssd.supabase.co/storage/v1/object/public/word-images/512/';
const norm=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[.!?…]+$/u,'').replace(/\s+/g,' ').trim();
const parse=value=>{try{return typeof value==='string'?JSON.parse(value):value||{};}catch{return {};}};
const uuid=value=>/^[a-f0-9-]{36}$/i.test(String(value||''));
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date());
const shuffle=items=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;};
const digits=()=>String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
const asList=result=>{if(result.error)throw result.error;return result.data||[];};

export function parentCenterAPI(d){
 const {db,json,hash,hashPassword,verifyPassword,queue,escape,mailShell,auth,issueSession,secret}=d;
 const fail=(message,status=400,extra={})=>json({ok:false,mesaj:message,...extra},status);
 const digest=value=>hash(secret+'|parent-center|'+value);
 async function mail(email,title,body,studentId=null){
  return await queue({student_id:studentId,to_email:email,kind:'dogrulama',subject:title,html:mailShell(title,body),text_body:title+' '+body.replace(/<[^>]+>/g,' ')});
 }
 async function session(parent){
  const token=crypto.randomUUID()+crypto.randomUUID();
  asList(await db.from('dm_parent_sessions').insert({token_hash:await hash(token),parent_id:parent.id,expires_at:new Date(Date.now()+7*864e5).toISOString()}));
  return token;
 }
 async function identify(token){
  if(typeof token!=='string'||token.length<32||token.length>150)return null;
  const row=asList(await db.from('dm_parent_sessions').select('parent_id,expires_at').eq('token_hash',await hash(token)).limit(1))[0];
  if(!row||Date.parse(row.expires_at)<Date.now())return null;
  return asList(await db.from('dm_parents').select('*').eq('id',row.parent_id).limit(1))[0]||null;
 }
 async function tokenMail(parent,purpose,pin=''){
  const token=crypto.randomUUID()+crypto.randomUUID();
  asList(await db.from('dm_parent_tokens').insert({token_hash:await hash(token),parent_id:parent.id,purpose,expires_at:new Date(Date.now()+864e5).toISOString()}));
  const link=ROOT+'veli-paneli.html#'+purpose+'='+token;
  const title=purpose==='verify'?'Diji-Medu · Veli hesabını doğrula':'Diji-Medu · Veli şifreni yenile';
  return mail(parent.email,title,'<p>Merhaba '+escape(parent.name)+',</p><p><a href="'+link+'">'+(purpose==='verify'?'E-posta adresimi doğrula':'Şifremi yenile')+'</a></p>'+(pin?'<p>Veli hesabına geçiş kodun <b>'+pin+'</b>. Bu 6 haneli kodu çocuğunla paylaşma.</p>':'')+'<p>Bağlantı 24 saat geçerlidir.</p>');
 }
 async function autoLink(parent){
  if(!parent.verified_at)return;
  const students=asList(await db.from('students').select('id').eq('email',parent.email).eq('status','approved').not('email_verified_at','is',null).is('frozen_at',null).limit(20)).filter(s=>!(parent.settings?.unlinkedIds||[]).includes(s.id));
  for(const student of students)await db.rpc('dm_parent_link',{p_parent:parent.id,p_student:student.id});
 }
 async function child(parent,id){
  if(!uuid(id))throw Error('Çocuğunu seç.');
  const link=asList(await db.from('dm_parent_links').select('student_id').eq('parent_id',parent.id).eq('student_id',id).limit(1))[0];
  if(!link)throw Error('Bu çocuğa erişim yetkin yok.');
  const row=asList(await db.from('students').select('id,username,full_name,class_no,streak,teacher_id,email,status,frozen_at,email_verified_at').eq('id',id).limit(1))[0];
  if(!row||row.status!=='approved'||row.frozen_at)throw Error('Çocuk hesabı şu anda aktif değil.');
  return row;
 }
 async function tier(id){const r=await db.rpc('dm_plan',{actor:id,account_role:'student'});if(r.error)throw r.error;return r.data||'free';}
 async function extras(id){
  const rows=asList(await db.from('extra_data').select('key_name,value').eq('student_id',id).or('key_name.eq.yo,key_name.like.review_word:%').limit(1100));
  return {yo:parse(rows.find(r=>r.key_name==='yo')?.value),review:rows.filter(r=>r.key_name.startsWith('review_word:')).map(r=>parse(r.value))};
 }
 async function vocabulary(student){
  const [completion,story,extra]=await Promise.all([
   db.from('level_completions').select('class_no,unit_no,level_no,completed_at').eq('student_id',student.id).eq('mode','buyu').order('completed_at',{ascending:false}).limit(4000),
   db.from('papi_story_progress').select('chapter').eq('actor_key','s:'+student.id).eq('completed',true).gte('chapter',1000).limit(500),
   extras(student.id)
  ]);
  const done=asList(completion).map(normalizeStop),finished=new Set(asList(story).map(r=>r.chapter));
  const grade=Number(student.class_no)||0,units=[...new Set(done.filter(r=>r.class_no===grade).map(r=>r.unit_no))];
  const bank=grade&&units.length?asList(await db.from('word_bank').select('english,turkish,unit_no').eq('active',true).eq('class_no',grade).limit(5000)):[];
  const words=schoolWords(bank,done,grade);
  for(const chapter of chapters.filter(c=>finished.has(c.id)))for(const w of chapter.cards||[])words.push({en:w.en,tr:w.tr,unit:'learning:'+chapter.id,grade:0});
  const map=new Map(words.map(w=>[norm(w.en)+'|'+norm(w.tr),w]));
  const wrong=asList(await db.from('dm_home_word_errors').select('en,tr,mistakes').eq('student_id',student.id).order('updated_at',{ascending:false}).limit(500));
  const weak=new Set([...extra.review,...Object.values(extra.yo.zk||{}),...wrong].filter(w=>w.en&&w.tr).map(w=>norm(w.en)));
  const lastSchool=done.find(r=>r.class_no===grade),lastLearning=[...finished].sort((a,b)=>b-a)[0];
  return {words:[...map.values()].map(w=>({...w,weak:weak.has(norm(w.en))})),lastUnit:lastSchool?'school:'+grade+':'+lastSchool.unit_no:lastLearning?'learning:'+lastLearning:'',yo:extra.yo};
 }
 const imageChecks=new Map();
 const dashboards=new Map();
 let manifestCache;
 async function images(){
  if(manifestCache&&Date.now()-manifestCache.at<3600e3)return manifestCache.rows;
  const r=await fetch(ROOT+'parkur-word-pool-v1.json');if(!r.ok)throw Error('Görsel listesi alınamadı.');
  const raw=await r.json(),rows=new Map();
  for(const [code,w] of Object.entries(raw))if(/^\d{4}$/.test(code)&&w.path==='512/'+code+'.webp'){
   const key=norm(w.en)+'|'+norm(w.tr);if(!rows.has(key))rows.set(key,IMAGE_ROOT+code+'.webp');
  }
  manifestCache={at:Date.now(),rows};return rows;
 }
 async function pool(student,settings,plan){
  const data=await vocabulary(student);
  let words=studyWordScope(data.words,settings.wordKeys);
  if(settings.source==='last')words=words.filter(w=>w.unit===data.lastUnit);
  if(settings.source==='weak'){
   if(plan==='free')throw Error('Zorlanılan kelimelerden test için Pro veya Premium Pro gerekir.');
   words=words.filter(w=>w.weak);
  }
  if(settings.content==='patterns')words=words.filter(w=>w.en.trim().split(/\s+/).length>=3);
  if(settings.content==='words')words=words.filter(w=>w.en.trim().split(/\s+/).length<3);
  const map=await images();
  words=words.map(w=>({...w,image:map.get(norm(w.en)+'|'+norm(w.tr))||null,audio:voiceURL(w.en)}));
  if(settings.types?.some(t=>['listen','speak'].includes(t)))words=words.filter(w=>w.audio);
  if(settings.types?.includes('image')){
   words=words.filter(w=>w.grade===Number(student.class_no)&&w.image);
   const checked=[];
   // Confirm the CDN object exists before including it in a visual-only pool.
   for(let i=0;i<words.length;i+=12){
    await Promise.all(words.slice(i,i+12).map(async w=>{try{const saved=imageChecks.get(w.image);if(saved&&Date.now()-saved.at<3600e3){if(saved.ok)checked.push(w);return;}const r=await fetch(w.image,{method:'HEAD',signal:AbortSignal.timeout(5000)});const ok=r.ok&&r.headers.get('content-type')?.startsWith('image/');imageChecks.set(w.image,{at:Date.now(),ok});if(ok)checked.push(w);}catch{}}));
    if(checked.length>=60)break;
   }
   words=checked;
  }
  return words;
 }
 function publicPractice(row){
  const question=row.deck?.[row.cursor];
  return {id:row.id,kind:row.kind,feature:row.feature,cursor:row.cursor,total:row.deck?.length||0,correct:row.correct,answers:row.answers,completedAt:row.completed_at,createdAt:row.created_at,settings:row.settings,
   question:question?Object.fromEntries(Object.entries(question).filter(([k])=>k!=='answer')):null};
 }
 async function codes(student,force=false){
  const existing=asList(await db.from('dm_parent_codes').select('expires_at').eq('student_id',student.id).limit(1))[0];
  if(existing&&!force&&Date.parse(existing.expires_at)>Date.now())return {ok:true,mailed:false};
  if(!student.email_verified_at||student.status!=='approved')throw Error('Önce öğrenci e-posta adresini doğrula.');
  for(let n=0;n<4;n++){
   const code=digits(),pin=digits();
   const r=await db.from('dm_parent_codes').upsert({student_id:student.id,code_hash:await digest('link:'+code),pin_hash:await digest('student:'+student.id+':'+pin),expires_at:new Date(Date.now()+864e5).toISOString()});
   if(r.error?.code==='23505')continue;if(r.error)throw r.error;
   const sent=await mail(student.email,'Diji-Medu · Veli bağlantı ve öğrenci geçiş kodların','<p>Veli bağlama kodu <b>'+code+'</b>. 24 saat geçerlidir. Bu kodu yalnızca velinle paylaş.</p><p>Öğrenci hesabına geçiş kodun <b>'+pin+'</b>.</p>',student.id);
   return {ok:true,code,mailed:sent,expiresHours:24};
  }
  throw Error('Kod oluşturulamadı. Tekrar dene.');
 }
 async function handle(req,op,b,rate,ip){
  if(!op.startsWith('parent'))return null;
  if(req.method!=='POST')return fail('POST gerekli.',405);
  const limited=await rate('parent-ip:'+op,ip,['parentStudentCode'].includes(op)?2:['parentSignup','parentLogin','parentResetRequest','parentSwitch'].includes(op)?8:120,900);if(limited)return limited;
  try{
   if(op==='parentSignup'){
    const email=String(b.email||'').trim().toLowerCase(),name=String(b.name||'').trim().slice(0,80);
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)||email.length>120||name.length<2||b.consent!==true)return fail('İsim, e-posta ve kayıt onayını tamamla.');
    const password=String(b.password||'');if(password.length<6||password.length>64)return fail('Şifre 6–64 karakter olmalı.');
    const old=asList(await db.from('dm_parents').select('id').eq('email',email).limit(1))[0];
    if(old)return fail('Bu adresle veli hesabı bulunuyor. Giriş yapabilir veya şifreni yenileyebilirsin.',409);
    const pin=digits(),id=crypto.randomUUID();
    const passwordHash=await hashPassword(password);
    asList(await db.from('dm_parents').insert({id,email,name,password_hash:passwordHash,pin_hash:await digest('parent:'+id+':'+pin)}));
    const mailed=await tokenMail({id,email,name},'verify',pin);
    return json({ok:true,token:await session({id}),verified:false,mailed});
   }
   if(op==='parentLogin'){
    const email=String(b.email||'').trim().toLowerCase();
    const parent=asList(await db.from('dm_parents').select('*').eq('email',email).limit(1))[0];
    if(!parent||!await verifyPassword(String(b.password||''),parent.password_hash))return fail('E-posta veya şifre hatalı.',401);
    await autoLink(parent);return json({ok:true,token:await session(parent),verified:!!parent.verified_at});
   }
   if(op==='parentResetRequest'){
    const parent=asList(await db.from('dm_parents').select('*').eq('email',String(b.email||'').trim().toLowerCase()).limit(1))[0];
    if(parent)await tokenMail(parent,'reset');
    return json({ok:true,mesaj:'Hesap varsa yenileme bağlantısı e-posta kuyruğuna alındı.'});
   }
   if(op==='parentVerify'||op==='parentReset'){
    const purpose=op==='parentVerify'?'verify':'reset',tokenHash=await hash(String(b.token||''));
    const rows=asList(await db.from('dm_parent_tokens').select('*').eq('token_hash',tokenHash).eq('purpose',purpose).is('used_at',null).gt('expires_at',new Date().toISOString()).limit(1));
    if(!rows[0])return fail('Bağlantı geçersiz veya süresi dolmuş.');
    let passwordHash;
    if(purpose==='reset')passwordHash=await hashPassword(String(b.password||''));
    const consumed=asList(await db.from('dm_parent_tokens').update({used_at:new Date().toISOString()}).eq('token_hash',tokenHash).is('used_at',null).select('parent_id'));
    if(!consumed.length)return fail('Bağlantı kullanılmış.');
    const change=purpose==='verify'?{verified_at:new Date().toISOString()}:{password_hash:passwordHash};
    asList(await db.from('dm_parents').update(change).eq('id',rows[0].parent_id));
    if(purpose==='reset')asList(await db.from('dm_parent_sessions').delete().eq('parent_id',rows[0].parent_id));
    const parent=asList(await db.from('dm_parents').select('*').eq('id',rows[0].parent_id).limit(1))[0];
    await autoLink(parent);return json({ok:true,token:await session(parent),verified:!!parent.verified_at});
   }
   if(['parentStudentCode','parentStudentPractice','parentSwitch'].includes(op)){
    const a=await auth(req,b,new URLSearchParams());
    if(a?.role!=='student'||a.teacher_portal_access_id)return fail('Kişisel öğrenci hesabına giriş yap.',401);
    const s=asList(await db.from('students').select('id,username,email,status,email_verified_at').eq('id',a.student_id).limit(1))[0];
    if(op==='parentStudentCode')return json(await codes(s,true));
    if(op==='parentStudentPractice'){
     const practice=asList(await db.from('dm_home_practice').select('id,kind,cursor,correct,deck,answers,settings,completed_at,created_at').eq('student_id',s.id).in('kind',['test','game']).order('created_at',{ascending:false}).limit(30));
     return json({ok:true,practices:practice.map(publicPractice)});
    }
    if(!s.email_verified_at)return fail('Öğrenci e-postasını doğrula.',403);
    const parent=asList(await db.from('dm_parents').select('*').eq('email',s.email?.toLowerCase()||'').not('verified_at','is',null).limit(1))[0];
    if(!parent||!/^\d{6}$/.test(b.pin)||parent.pin_hash!==await digest('parent:'+parent.id+':'+b.pin))return fail('Veli geçiş kodunu kontrol et.',403);
    const r=await db.rpc('dm_parent_link',{p_parent:parent.id,p_student:s.id});if(r.error)throw r.error;
    return json({ok:true,token:await session(parent)});
   }
   if(op==='parentStudentAnswer'||op==='parentStudentResume'){
    const a=await auth(req,b,new URLSearchParams());if(a?.role!=='student'||a.teacher_portal_access_id)return fail('Öğrenci oturumu gerekli.',401);
    const row=asList(await db.from('dm_home_practice').select('*').eq('id',b.id).eq('student_id',a.student_id).limit(1))[0];if(!row)return fail('Çalışma bulunamadı.',404);
    if(op==='parentStudentResume')return json({ok:true,practice:publicPractice(row)});
    for(const key of dashboards.keys())if(key.includes('|'+a.student_id+'|'))dashboards.delete(key);
    const r=await db.rpc('dm_home_answer',{p_id:row.id,p_student:a.student_id,p_cursor:Number(b.cursor),p_answer:String(b.answer||'').slice(0,400)});if(r.error)throw r.error;
    return json({ok:true,practice:publicPractice(r.data)});
   }
   const parent=await identify(b.parentToken);
   if(!parent)return fail('Veli oturumun sona ermiş. Yeniden giriş yap.',401);
   const budget=await rate('parent-account:'+op,parent.id,op==='parentLink'?5:op==='parentResend'?2:op==='parentStart'?20:120,900);if(budget)return budget;
   if(op==='parentLogout'){asList(await db.from('dm_parent_sessions').delete().eq('token_hash',await hash(b.parentToken)));return json({ok:true});}
   if(op==='parentResend'){
    if(parent.verified_at)return json({ok:true,verified:true});
    const pin=digits();asList(await db.from('dm_parents').update({pin_hash:await digest('parent:'+parent.id+':'+pin)}).eq('id',parent.id));
    return json({ok:true,mailed:await tokenMail(parent,'verify',pin)});
   }
   if(op==='parentMe'){
    await autoLink(parent);
    const ids=asList(await db.from('dm_parent_links').select('student_id').eq('parent_id',parent.id)).map(l=>l.student_id);
    const rows=ids.length?asList(await db.from('students').select('id,username,full_name,class_no,streak,status').in('id',ids).is('frozen_at',null)):[];
    const children=await Promise.all(rows.map(async s=>({...s,plan:await tier(s.id)})));
    return json({ok:true,parent:{name:parent.name,email:parent.email,verified:!!parent.verified_at,settings:parent.settings},children});
   }
   if(!parent.verified_at)return fail('Önce e-posta adresini doğrula.',403);
   if(op==='parentLink'){
    if(!/^\d{6}$/.test(b.code))return fail('6 haneli kodu yaz.');
    const row=asList(await db.from('dm_parent_codes').select('student_id').eq('code_hash',await digest('link:'+b.code)).gt('expires_at',new Date().toISOString()).limit(1))[0];
    if(!row)return fail('Kod hatalı veya süresi dolmuş.');
    const r=await db.rpc('dm_parent_link',{p_parent:parent.id,p_student:row.student_id});if(r.error)throw r.error;
    if(r.data?.ok)asList(await db.from('dm_parents').update({settings:{...parent.settings,unlinkedIds:(parent.settings?.unlinkedIds||[]).filter(id=>id!==row.student_id)}}).eq('id',parent.id));
    return json(r.data);
   }
   if(op==='parentSettings'){
    for(const key of dashboards.keys())if(key.startsWith(parent.id+'|'))dashboards.delete(key);
    const settings={...parent.settings,teacherNotices:b.teacherNotices!==false,practiceReminders:b.practiceReminders!==false};
    asList(await db.from('dm_parents').update({settings}).eq('id',parent.id));return json({ok:true});
   }
   if(op==='parentPinResend'){
    const pin=digits();asList(await db.from('dm_parents').update({pin_hash:await digest('parent:'+parent.id+':'+pin)}).eq('id',parent.id));
    return json({ok:true,mailed:await mail(parent.email,'Diji-Medu · Veli geçiş kodun','<p>Yeni veli geçiş kodun <b>'+pin+'</b>.</p>')});
   }
   const s=await child(parent,b.studentId),plan=await tier(s.id);
   if(['parentStart','parentAnswer','parentGoal','parentUnlink'].includes(op))for(const key of dashboards.keys())if(key.includes('|'+s.id+'|'))dashboards.delete(key);
   if(op==='parentUnlink'){
    asList(await db.from('dm_parents').update({settings:{...parent.settings,unlinkedIds:[...new Set([...(parent.settings?.unlinkedIds||[]),s.id])]}}).eq('id',parent.id));
    asList(await db.from('dm_parent_links').delete().eq('parent_id',parent.id).eq('student_id',s.id));return json({ok:true});
   }
   if(op==='parentSwitchStudent'){
    if(norm(parent.email)!==norm(s.email))return fail('Bu geçiş aynı e-posta adresine bağlı hesaplarda kullanılabilir.');
    const code=asList(await db.from('dm_parent_codes').select('pin_hash').eq('student_id',s.id).limit(1))[0];
    if(!/^\d{6}$/.test(b.pin)||!code||code.pin_hash!==await digest('student:'+s.id+':'+b.pin))return fail('Öğrenci geçiş kodunu kontrol et.',403);
    const studentToken=await issueSession('student',s.id);
    asList(await db.from('dm_parent_sessions').delete().eq('token_hash',await hash(b.parentToken)));
    return json({ok:true,token:studentToken,username:s.username});
   }
   if(op==='parentGoal'){
    const days=Number(b.days),minutes=Number(b.minutes);if(![2,3,4,5,6,7].includes(days)||![5,10,15].includes(minutes))return fail('Hedef seçeneklerini kontrol et.');
    asList(await db.from('dm_parent_goals').upsert({parent_id:parent.id,student_id:s.id,days,minutes}));return json({ok:true});
   }
   if(op==='parentDashboard'){
    const cacheKey=parent.id+'|'+s.id+'|'+plan+'|'+!!b.previous+'|'+!!b.monthly;
    const cached=dashboards.get(cacheKey);if(cached&&Date.now()-cached.at<20000)return json(cached.body);
    if((b.previous||b.monthly)&&plan!=='premium_pro')return fail('Geçmiş haftalar için Premium Pro gerekir.',403,{premium:true});
    const offset=b.previous?7:0,end=new Date(Date.now()-offset*864e5),start=new Date(end.getTime()-(b.monthly?30:7)*864e5);
    const [games,stops,lessons,history,goals,teacher,vocab,notices,events]=await Promise.all([
     db.from('game_scores').select('correct_count,wrong_count,duration_seconds,created_at,unit_name').eq('student_id',s.id).gte('created_at',start.toISOString()).lt('created_at',end.toISOString()).limit(2000),
     db.from('level_completions').select('level_no,class_no,unit_no,completed_at').eq('student_id',s.id).order('completed_at',{ascending:false}).limit(4000),
     db.from('lesson_progress').select('topic_name,completed_at').eq('student_id',s.id).eq('test_success',true).gte('completed_at',start.toISOString()).limit(1000),
     db.from('dm_home_practice').select('id,kind,feature,deck,cursor,correct,answers,settings,created_at,completed_at').eq('student_id',s.id).order('created_at',{ascending:false}).limit(60),
     db.from('dm_parent_goals').select('days,minutes').eq('parent_id',parent.id).eq('student_id',s.id).limit(1),
     s.teacher_id?db.from('teachers').select('full_name,display_name,school').eq('id',s.teacher_id).limit(1):Promise.resolve({data:[]}),
     vocabulary(s),
     parent.settings?.teacherNotices===false?Promise.resolve({data:[]}):db.from('dm_teacher_student_notices').select('id,message,created_at').eq('student_id',s.id).order('created_at',{ascending:false}).limit(20),
     parent.settings?.teacherNotices===false?Promise.resolve({data:[]}):db.from('notifications').select('id,title,message,created_at').eq('recipient_student_id',s.id).in('type',['duyuru','gorev']).order('created_at',{ascending:false}).limit(20)
    ]);
    const g=asList(games),allStops=asList(stops).map(normalizeStop),l=asList(lessons),h=asList(history),goal=asList(goals)[0]||{days:4,minutes:10};
    const activity={};
    for(let n=b.monthly?29:6;n>=0;n--){const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date(end.getTime()-n*864e5));activity[date]=0;}
    for(const row of [...g.map(r=>({at:r.created_at})),...allStops.map(r=>({at:r.completed_at})),...l.map(r=>({at:r.completed_at})),...h.filter(r=>r.completed_at).map(r=>({at:r.completed_at}))]){
     const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date(row.at));if(date in activity)activity[date]++;
    }
    const today=day(),practiceToday=h.filter(r=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date(r.created_at))===today);
    const body={ok:true,plan,student:{id:s.id,name:s.full_name||s.username,username:s.username,classNo:s.class_no,streak:s.streak,sameEmail:norm(s.email)===norm(parent.email)},activity,
     totalStops:allStops.length,lastStop:allStops[0]||null,goal,teacher:asList(teacher)[0]||null,notices:[...asList(notices),...asList(events)].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,30),
     gameSeconds:g.reduce((n,r)=>n+Number(r.duration_seconds||0),0),correct:g.reduce((n,r)=>n+Number(r.correct_count||0),0),wrong:g.reduce((n,r)=>n+Number(r.wrong_count||0),0),
     words:vocab.words,history:h.map(publicPractice),usage:{tests:practiceToday.filter(r=>r.kind==='test').length,games:practiceToday.filter(r=>r.kind==='game').length},
     summary:activity[today]?s.username+' bugün '+activity[today]+' kayıtlı etkinlik tamamladı.':s.username+' için bugün henüz tamamlanan etkinlik kaydı yok.'};
    if(dashboards.size>1000)dashboards.clear();dashboards.set(cacheKey,{at:Date.now(),body});return json(body);
   }
   if(op==='parentPool')return json({ok:true,words:await pool(s,b.settings||{},plan)});
   if(op==='parentStart'){
    if(!uuid(b.id))return fail('Çalışma kimliği geçersiz.');
    const settings=b.settings||{},kind=['test','game','plan','summary'].includes(b.kind)?b.kind:'test';
    const old=asList(await db.from('dm_home_practice').select('*').eq('id',b.id).eq('student_id',s.id).eq('parent_id',parent.id).limit(1))[0];
    if(old)return json({ok:true,practice:publicPractice(old)});
    const feature=kind==='plan'?(b.feature==='weekly'?'weekly':'daily'):kind==='summary'?'papi':'';let amount=practiceCount(settings);
    const types=Array.isArray(settings.types)?settings.types.filter(t=>['image','choice','listen','match','order','speak','memory'].includes(t)):['choice'];
    if(!types.length)return fail('En az bir soru türü seç.');
    const words=await pool(s,{...settings,types},plan);
    if(['plan','summary'].includes(kind)&&words.length)amount=Math.min(amount,words.length);
    if(words.length<amount)return fail(words.length===0?(types.includes('image')?'Bu seçimde görseli hazır kelime bulunamadı. Kelime sorularına geçebilir veya başka bir kaynak seçebilirsin.':types.some(t=>['listen','speak'].includes(t))?'Bu seçimde kayıtlı sesi hazır kelime bulunamadı. Kelime sorularına geçebilirsin.':'Bu kaynakta henüz çalışılmış kelime bulunamadı. Önce bir Parkur durağını tamamlayabilirsin.'):'Bu seçimde '+words.length+' kelime hazır. Daha az soru veya farklı bir kaynak seçebilirsin.');
    const selected=shuffle(words).slice(0,amount),deck=selected.map((w,i)=>{
     const type=types[i%types.length],order=type==='order',pieces=w.en.split(/\s+/),join=pieces.length>1?' ':'';
     const options=shuffle([w.en,...shuffle(words.filter(x=>norm(x.en)!==norm(w.en))).slice(0,3).map(x=>x.en)]);
     return {...w,pairs:type==='memory'?[w,...shuffle(words.filter(x=>norm(x.en)!==norm(w.en)&&norm(x.tr)!==norm(w.tr))).slice(0,2)].map(x=>({en:x.en,tr:x.tr})):undefined,type:order?'order':type,answer:w.en,options,tokens:order?shuffle(pieces.length>1?pieces:Array.from(w.en)):undefined,join};
    });
    const r=await db.rpc('dm_home_start',{p_id:b.id,p_parent:parent.id,p_student:s.id,p_kind:kind,p_feature:feature,p_deck:deck,p_settings:{source:settings.source,count:amount,content:settings.content,types,...(Array.isArray(settings.wordKeys)?{wordKeys:selected.map(w=>w.en+'|'+w.tr)}:{}),...(['plan','summary'].includes(kind)?{words:selected.map(w=>({en:w.en,tr:w.tr})),summary:s.username+' için tamamlanan duraklardan '+words.length+' kelime ve ifade tekrar edilebilir. Bu çalışmada '+selected.filter(w=>w.weak).length+' tekrar kelimesi bulunuyor.'}:{})}});
    if(r.error)throw r.error;if(r.data.ok===false)return json(r.data,403);
    return json({ok:true,practice:publicPractice(r.data)});
   }
   if(op==='parentResume'||op==='parentAnswer'){
    const row=asList(await db.from('dm_home_practice').select('*').eq('id',b.id).eq('student_id',s.id).limit(1))[0];if(!row)return fail('Çalışma bulunamadı.',404);
    if(op==='parentResume')return json({ok:true,practice:publicPractice(row)});
    const r=await db.rpc('dm_home_answer',{p_id:row.id,p_student:s.id,p_cursor:Number(b.cursor),p_answer:String(b.answer||'').slice(0,400)});if(r.error)throw r.error;
    return json({ok:true,practice:publicPractice(r.data)});
   }
   return fail('İşlem bulunamadı.',404);
  }catch(e){console.error('[parent-center]',op,e.message);return fail(e.message||'İşlem tamamlanamadı.',400);}
 }
 return {handle,codes};
}
