import {memberStudents,isClassroomGuest} from './classroom-identity.mjs';
// Every grant is tied to a normal learner; neither role claims nor invite codes grant access.
// Private teacher codes use rate-limited authentication; owner credentials stay server-side.
export const portalOps=new Set(['teacherPortalApply','teacherPortalStatus','teacherPortalList','teacherPortalDecide','teacherPortalIssueCode','teacherPortalLogin','teacherPortalResetRequest','teacherPortalReset','teacherPortalChangeCode','teacherPortalAppearance','teacherPortalSyncStudents','teacherPortalStudentReport','teacherPortalClassAnalytics','teacherPortalAnnouncement','teacherPortalRubric','teacherPortalPerformance','teacherPortalStudentContact','teacherPortalStudents','teacherPortalParticipant']);
export function portalOperationAllowed(op,b={}) {
 if(['kelimeCarkiBaslat','kelimeCarkiCevir','kelimeCarkiCevap','kelimeCarkiBitir','kelimeCarkiDurum','kelimeCarkiSiralama'].includes(op))return true;
 if(['','oturumBilgisi','cikis','sonGirisGuncelle','iletisimDurumu','memberStatus','wordReviewList','wordReviewAnswer','seviyeDurumu','sosyalOgrencilerGetir','kelimeleriGetir','kelimeHavuzuGetir','tumKelimeleriGetir','seviyeOyunOdulu','enerjiDurumuGetir','kelimelerGetir','kategorileriGetir','dogruYanlisSorulariGetir','etkinlikTanimlariGetir','konusmaEsAnlamlarGetir','companionDialogueOpen','companionDialogueAnswer','enerjiDegistir','okumaHiziKaydet','okumaGecmisGetir','dersKonulariGetir','dersKonuDetayGetir','dersTestSonucKaydet','dersBilmiyordumToggle','companionSummary','companionDialogues','dialogueList','dialogueStart','dialogueAnswer','dialogueComplete','reviewList','reviewAnswer','companionReview','companionDialogue','companionDialogueComplete'].includes(op))return true;
 if(op==='ekVeriGetir')return ['yo','seviye','oyun'].includes(b.anahtar);
 if(op==='ekVeriKaydet')return b.anahtar==='yo';
 if(op==='ekonomi')return ['durum','odulTalep','oyunGiris','enerjiHarca','jokerKullan'].includes(b.is);
 return /^(verifiedGame(Start|Answer|Status)|mola(Durum|Baslat|Bitir|Siralama|BolumGec)|konuOyun(Baslat|Cevap|Bitir|Durum|Siralama)|papi(Kart|Cards)|meteor|wheel|papiWheel|papiMeteor|ralli)/.test(op)||/^(kelime|jeopardy|bosluk|hafiza|yagmur|asmaca|kelimebul|eslestirme|tren|dikte|cumle|harfBahcesi|konusma).*(LiderlikKaydet|LiderlikGetir|LiderlikTumunuGetir|Liderlik)$/.test(op);
}
export const ownerTeacher=a=>a?.role==='teacher'&&a.ogretmenKullanici==='teacher'&&a.yonetici===true;
export function teacherPortalAPI(d){
 const {db,json,hash,hashPassword,verifyPassword,issueSession,mailShell,escape,queue,codeKey}=d;
 const fail=(mesaj,status=400)=>json({ok:false,mesaj},status),portal='https://app.dijimedu.com/ingilizce/';
 const byStudent=async id=>{const r=await db.from('teacher_portal_access').select('*').eq('student_id',id).maybeSingle();if(r.error)throw r.error;return r.data;};
 const digest=code=>hash(codeKey+'|teacher-portal|'+code);
 function randomCode(){const a=[];while(a.length<6){for(const n of crypto.getRandomValues(new Uint8Array(20)))if(n<250&&a.length<6)a.push(String(n%10));}return a.join('');}
 async function codeMail(r,code,reset=null,initial=false){
  const text='Öğretmen platformu giriş kodun: '+code+'. Bu kodu kimseyle paylaşma. Öğrenci bağlama kodun farklıdır.';
  const out=await db.rpc('dm_teacher_portal_code',{grant_id:r.id,new_digest:await digest(code),mail_title:'Diji-Medu · Özel öğretmen giriş kodun',mail_html:mailShell('Öğretmen erişimin hazır',`<p>${escape(text)}</p><p><a href="${portal}?ogretmenGiris=1">Öğretmen girişini aç</a></p>`),mail_text:text,expected_version:r.version,reset_digest:reset,initial_only:initial});if(out.error)throw out.error;return out.data===true;
 }
 async function ensureCode(studentId,{returnCode=false}={}){const r=await byStudent(studentId);if(!r||r.state!=='approved'||r.code_digest)return null;const code=randomCode();const sent=await codeMail(r,code,null,true);return sent&&returnCode?code:null;}
 async function grant(a){if(a?.role!=='teacher'||!a.teacher_portal_access_id)return null;const r=await db.from('teacher_portal_access').select('*').eq('id',a.teacher_portal_access_id).eq('state','approved').maybeSingle();if(r.error)throw r.error;return r.data;}
 async function session(r,role,sid){const token=await issueSession(role,sid,role==='teacher'?r.teacher_id:undefined,{teacher_portal_access_id:r.id,teacher_portal_version:r.version});return token;}
 return {ensureCode,async apply(studentId,teacherId=null){const r=await db.from('teacher_portal_access').upsert({student_id:studentId,...(teacherId?{teacher_id:teacherId}:{})},{onConflict:'student_id',ignoreDuplicates:true});if(r.error)throw r.error;},async handle(op,b,a,method){
  if(!portalOps.has(op))return null;if(method!=='POST')return fail('POST gerekli.',405);
  if(op==='teacherPortalLogin'){
   if(!/^(?:\d{6}|\d{8})$/.test(String(b.code||'')))return fail('6 veya 8 haneli öğretmen giriş kodunu yaz.');
   const r=await db.from('teacher_portal_access').select('*').eq('code_digest',await digest(b.code)).eq('state','approved').maybeSingle();if(r.error)throw r.error;
   if(!r.data&&/^\d{8}$/.test(String(b.code||''))){
    const owner=await db.from('teachers').select('id,username,active,is_admin,frozen_at').eq('username','teacher').eq('is_admin',true).eq('active',true).maybeSingle();
    if(owner.data&&!owner.data.frozen_at){
     const access=await db.from('teacher_portal_access').select('*').eq('teacher_id',owner.data.id).is('student_id',null).eq('state','approved').maybeSingle();
     if(access.data?.code_digest==='owner:'+await hash(access.data.id+'|teacher-portal-owner|'+b.code))return json({ok:true,token:await session(access.data,'teacher'),name:owner.data.username});
    }
   }
   if(!r.data)return fail('Kod geçersiz veya öğretmen erişimi kapatılmış.',401);
   const t=await db.from('teachers').select('id,username,active,frozen_at').eq('id',r.data.teacher_id).maybeSingle();
   const s=await db.from('students').select('email_verified_at,status,frozen_at').eq('id',r.data.student_id).maybeSingle();
   if(!t.data?.active||t.data.frozen_at||!s.data?.email_verified_at||s.data.status!=='approved'||s.data.frozen_at)return fail('Öğretmen erişimi aktif değil.',403);
   return json({ok:true,token:await session(r.data,'teacher'),name:t.data.username});
  }
  if(op==='teacherPortalResetRequest'){
   const generic={ok:true,mesaj:'Bilgiler eşleşiyorsa e-postana kod yenileme bağlantısı gönderilecek.'};
   const s=await db.from('students').select('id,email,email_verified_at,status').eq('username',String(b.username||'')).maybeSingle();
   if(!s.data?.email_verified_at||s.data.status!=='approved'||s.data.email?.toLowerCase()!==String(b.email||'').trim().toLowerCase())return json(generic);
   const r=await byStudent(s.data.id);if(r?.state!=='approved')return json(generic);
   const token=crypto.randomUUID()+crypto.randomUUID(),link=portal+'ogretmen-kod-yenile.html#token='+token;
   const ins=await db.from('teacher_portal_resets').insert({digest:await hash(token),access_id:r.id,version:r.version,expires_at:new Date(Date.now()+3600000).toISOString()});if(ins.error)throw ins.error;
   await queue({student_id:s.data.id,to_email:s.data.email,kind:'kayit',subject:'Diji-Medu · Öğretmen kodunu yenile',html:mailShell('Öğretmen kodunu yenile',`<p><a href="${link}">Yeni giriş kodu belirle</a></p><p>Bağlantı 1 saat geçerlidir ve tek kullanımlıktır. Bu isteği sen yapmadıysan işlem yapmana gerek yok.</p>`),text_body:link});return json(generic);
  }
  if(op==='teacherPortalReset'){
   if(!/^[a-f\d-]{72}$/i.test(String(b.resetToken||''))||!/^\d{6}$/.test(String(b.code||'')))return fail('Geçerli bağlantı ve 6 haneli kod gerekli.');
   const token=await hash(b.resetToken),t=await db.from('teacher_portal_resets').select('access_id').eq('digest',token).is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
   if(!t.data)return fail('Bağlantı kullanılmış veya süresi dolmuş.');
   const r=await db.from('teacher_portal_access').select('*').eq('id',t.data.access_id).maybeSingle();
   return r.data&&await codeMail(r.data,b.code,token)?json({ok:true,mesaj:'Kodun yenilendi. Yeni kod e-postana da gönderilecek.'}):fail('Bağlantı geçersiz veya erişim kapalı.');
  }
  if(op==='teacherPortalList'||op==='teacherPortalDecide'||op==='teacherPortalIssueCode'){
   if(!ownerTeacher(a))return fail('Bu bölüm yalnızca teacher hesabına aittir.',403);
   if(op==='teacherPortalDecide'){
    const r=await db.rpc('dm_teacher_portal_decide',{owner_id:a.teacher_id,grant_id:String(b.id||''),decision:String(b.decision||'')});if(r.error)return fail('Karar kaydedilemedi.',409);const issuedCode=await ensureCode(r.data.studentId,{returnCode:true});return json({ok:true,...(issuedCode?{issuedCode,mailQueued:true}:{})});
   }
   if(op==='teacherPortalIssueCode'){
    const r=await db.from('teacher_portal_access').select('*,students!student_id(email_verified_at)').eq('id',String(b.id||'')).maybeSingle();
    if(r.error)throw r.error;
    if(!r.data||r.data.state!=='approved')return fail('Öğretmen onaylı değil.',403);
    if(!r.data.students?.email_verified_at)return fail('Öğretmen e-posta adresini doğrulamalı.',409);
    const code=randomCode(),queued=await codeMail(r.data,code);
    return queued?json({ok:true,issuedCode:code,mailQueued:true}):fail('Kod oluşturulamadı; tekrar deneyebilirsin.',409);
   }
   const r=await db.from('teacher_portal_access').select('id,state,requested_at,code_sent_at,student_id,students!student_id(username,full_name,email,email_verified_at)').not('student_id','is',null).order('requested_at',{ascending:false});if(r.error)throw r.error;return json({ok:true,items:r.data});
  }
  if(op==='teacherPortalApply'||op==='teacherPortalStatus'){
   if(a?.role!=='student'||!a.student_id||a.teacher_portal_access_id)return fail('Kişisel hesabına giriş yap.',401);
   if(op==='teacherPortalApply'){await this.apply(a.student_id);}
   await ensureCode(a.student_id);const r=await byStudent(a.student_id);return json({ok:true,state:r?.state||'none',codeSent:!!r?.code_sent_at});
  }
  const r=await grant(a);if(!r)return fail('Kodla öğretmen girişi gerekli.',403);
  if(!r.student_id&&!ownerTeacher(a))return fail('Yönetici erişimi gerekli.',403);
  if(op==='teacherPortalChangeCode'&&!r.student_id){
   if(!/^\d{8}$/.test(String(b.code||''))||r.code_digest!=='owner:'+await hash(r.id+'|teacher-portal-owner|'+b.currentCode))return fail('Mevcut kod ve 8 haneli yeni kod gerekli.',403);
   if(b.code===b.currentCode)return fail('Yeni kod farklı olmalı.');
   const saved=await db.from('teacher_portal_access').update({code_digest:'owner:'+await hash(r.id+'|teacher-portal-owner|'+b.code),version:r.version+1}).eq('id',r.id).eq('version',r.version).select('id');
   if(saved.error||!saved.data?.length)return fail('Kod değiştirilemedi.',409);return json({ok:true});
  }
  if(op==='teacherPortalChangeCode'){
   if(!/^\d{6}$/.test(String(b.code||''))||!/^\d{6}$/.test(String(b.currentCode||''))||await digest(b.currentCode)!==r.code_digest)return fail('Mevcut kod ve 6 haneli yeni kod gerekli.',403);
   if(b.code===b.currentCode)return fail('Yeni kod mevcut koddan farklı olmalı.');
   return await codeMail(r,b.code)?json({ok:true,mesaj:'Kodun değiştirildi. Yeni kodla tekrar giriş yap.'}):fail('Kod değiştirilemedi.',409);
  }
  if(op==='teacherPortalAppearance'){
   if(!r.student_id)return json({ok:true,appearance:null,emailVerified:true});
   // Personal avatar only. Never grant the preview student access to the teacher's wallet or learning data.
   const record=await db.from('extra_data').select('value').eq('student_id',r.student_id).eq('key_name','yo').maybeSingle();
   if(record.error)throw record.error;
   let profile=record.data?.value||{};
   if(typeof profile==='string'){try{profile=JSON.parse(profile);}catch{profile={};}}
   if(!profile||typeof profile!=='object'||Array.isArray(profile))profile={};
   if(b.save!==true)return json({ok:true,appearance:profile.karakter||null,emailVerified:true});
   const incoming=b.appearance;
   if(!incoming||typeof incoming!=='object'||Array.isArray(incoming)||!['k','e'].includes(incoming.cins)||!incoming.s||typeof incoming.s!=='object'||Array.isArray(incoming.s)||JSON.stringify(incoming.s).length>4000)return fail('Geçerli karakter seçimi gerekli.',400);
   const safe={};for(const [key,val] of Object.entries(incoming.s)){if(!/^[a-zA-Z0-9_-]{1,40}$/.test(key))continue;if(typeof val==='string'&&val.length<=120)safe[key]=val;}
   const old=profile.karakter&&typeof profile.karakter==='object'?profile.karakter:{};
   profile.karakter={...old,cins:incoming.cins,s:{...(old.s||{}),...safe}};
   const up=await db.from('extra_data').upsert({student_id:r.student_id,key_name:'yo',value:profile,updated_at:new Date().toISOString()},{onConflict:'student_id,key_name'});
   if(up.error)throw up.error;
   return json({ok:true,appearance:profile.karakter});
  }
  if(op==='teacherPortalSyncStudents'){
   const code=String(b.code||'').trim().toUpperCase();
   if(!/^[A-Z0-9]{1,10}$/.test(code))return fail('Geçerli öğretmen bağlantı kodunu gir.',400);
   const teacher=await db.from('teachers').select('id,invite_code,active').eq('id',r.teacher_id).maybeSingle();
   if(teacher.error)throw teacher.error;
   if(!teacher.data?.active||String(teacher.data.invite_code||'').toUpperCase()!==code)return fail('Bu kod giriş yaptığın öğretmen hesabına ait değil.',403);
   const linked=await memberStudents(db.from('students').select('id')).eq('teacher_id',r.teacher_id).eq('role','student').eq('status','approved').is('frozen_at',null);
   if(linked.error)throw linked.error;
   return json({ok:true,count:(linked.data||[]).length});
  }
  if(op==='teacherPortalStudentReport'){
   const sid=String(b.studentId||'');
   if(!/^[a-f0-9-]{36}$/i.test(sid))return fail('Geçerli öğrenci seç.',400);
   const student=await memberStudents(db.from('students').select('id,username,full_name,class_no,teacher_id,xp,points,streak')).eq('id',sid).eq('teacher_id',r.teacher_id).eq('status','approved').is('frozen_at',null).maybeSingle();
   if(student.error)throw student.error;if(!student.data)return fail('Öğrenci sana bağlı değil.',403);
   const [reports,games]=await Promise.all([
    db.from('teacher_reports').select('report_date,reading_score,writing_score,vocabulary_score,speaking_score,grammar_score,genel_score,exam_score').eq('student_id',sid).order('report_date',{ascending:false}).limit(30),
    db.from('game_scores').select('game_key,score,correct_count,wrong_count,played_on').eq('student_id',sid).order('played_on',{ascending:false}).limit(100)
   ]);
   if(reports.error)throw reports.error;if(games.error)throw games.error;
   const totals=(games.data||[]).reduce((o,g)=>({plays:o.plays+1,correct:o.correct+Number(g.correct_count||0),wrong:o.wrong+Number(g.wrong_count||0)}),{plays:0,correct:0,wrong:0});
   return json({ok:true,student:{username:student.data.username,fullName:student.data.full_name,classNo:student.data.class_no,xp:student.data.xp,points:student.data.points,streak:student.data.streak},totals,reports:reports.data||[]});
  }

  if(['teacherPortalClassAnalytics','teacherPortalAnnouncement','teacherPortalRubric','teacherPortalPerformance','teacherPortalStudentContact'].includes(op)){
   const pupils=await memberStudents(db.from('students').select('id,username,full_name,class_no,branch,email,phone,points,xp,email_verified_at')).eq('teacher_id',r.teacher_id).eq('status','approved').is('frozen_at',null);
   if(pupils.error)throw pupils.error;
   const all=pupils.data||[],sid=String(b.studentId||''),pupil=all.find(x=>x.id===sid);
   if(op==='teacherPortalStudentContact'){
    if(!pupil)return fail('Bağlı öğrenciyi seç.',403);
    if(b.save!==true)return json({ok:true,student:{username:pupil.username,email:pupil.email||'',phone:pupil.phone||'',verified:!!pupil.email_verified_at}});
    const phone=String(b.phone??'').replace(/\D/g,'');
    if(phone&& !/^(05\d{9}|5\d{9})$/.test(phone))return fail('Telefon 05XX XXX XX XX biçiminde olmalı.');
    // Do not allow a teacher portal code to reset a minor's login or verified email.
    const update=await db.from('students').update({phone:phone?(phone.length===10?'0'+phone:phone):null}).eq('id',sid).eq('teacher_id',r.teacher_id);
    if(update.error)throw update.error;
    return json({ok:true,mesaj:'Telefon güncellendi. E-posta ve şifre için öğrenci hesap doğrulaması gerekir.'});
   }
   if(op==='teacherPortalPerformance'){
    if(!pupil)return fail('Bağlı öğrenciyi seç.',403);
    const delta=Number(b.delta);
    if(![0.3,-2].includes(delta))return fail('Geçerli puan işlemi seç.',400);
    const next=Math.max(0,Math.min(100,Math.round((Number(pupil.points||0)+delta)*10)/10));
    const up=await db.from('students').update({points:next}).eq('id',sid).eq('teacher_id',r.teacher_id);
    if(up.error)throw up.error;
    const history=await db.from('points_transactions').insert({student_id:sid,change_amount:next-Number(pupil.points||0),balance_after:next,reason:'Ders içi performans'});
    if(history.error)throw history.error;
    return json({ok:true,points:next});
   }
   if(op==='teacherPortalRubric'){
    if(!pupil)return fail('Bağlı öğrenciyi seç.',403);
    const scores=['reading_score','writing_score','vocabulary_score','speaking_score','grammar_score'].map(k=>Number(b[k]));
    if(scores.some(v=>!Number.isFinite(v)||v<0||v>100))return fail('Rubrik puanları 0–100 olmalı.');
    const average=Math.round(scores.reduce((a,v)=>a+v,0)/5);
    const record={student_id:sid,teacher_id:r.teacher_id,report_date:new Date().toISOString().slice(0,10),reading_score:scores[0],writing_score:scores[1],vocabulary_score:scores[2],speaking_score:scores[3],grammar_score:scores[4],genel_score:average};
    const previous=await db.from('teacher_reports').select('id').eq('student_id',sid).eq('report_date',record.report_date).maybeSingle();
    if(previous.error)throw previous.error;
    const saved=previous.data?await db.from('teacher_reports').update(record).eq('id',previous.data.id):await db.from('teacher_reports').insert(record);
    if(saved.error)throw saved.error;
    return json({ok:true,average});
   }
   if(op==='teacherPortalAnnouncement'){
    const title=String(b.title||'').trim(),message=String(b.message||'').trim();
    if(title.length<3||title.length>120||message.length<3||message.length>2000)return fail('Başlık 3–120, duyuru 3–2000 karakter olmalı.');
    const saved=await db.from('announcements').insert({title,message,target_type:'ogretmen',target_list:[],active:true,teacher_id:r.teacher_id});
    if(saved.error)throw saved.error;
    return json({ok:true});
   }
   const grade=Number(b.grade);if(!Number.isInteger(grade)||grade<1||grade>8)return fail('1–8 arası sınıf seç.',400);
   const selected=all.filter(p=>Number(p.class_no)===grade),ids=selected.map(p=>p.id),since=new Date(Date.now()-7*86400000).toISOString();
   if(!ids.length)return json({ok:true,students:[],inactive:[],summary:{plays:0,correct:0,wrong:0,averageXp:0},rubrics:[]});
   const [games,reports]=await Promise.all([
    db.from('game_scores').select('student_id,game_key,correct_count,wrong_count,played_on').in('student_id',ids).gte('played_on',since).limit(1000),
    db.from('teacher_reports').select('student_id,report_date,reading_score,writing_score,vocabulary_score,speaking_score,grammar_score,genel_score').in('student_id',ids).order('report_date',{ascending:false}).limit(500)
   ]);
   if(games.error)throw games.error;if(reports.error)throw reports.error;
   const rows=games.data||[],active=new Set(rows.map(g=>g.student_id)),wrongByGame={};
   for(const g of rows){const key=String(g.game_key||'Bilinmeyen oyun').slice(0,60);wrongByGame[key]=(wrongByGame[key]||0)+Number(g.wrong_count||0);}
   const summary={plays:rows.length,correct:rows.reduce((n,g)=>n+Number(g.correct_count||0),0),wrong:rows.reduce((n,g)=>n+Number(g.wrong_count||0),0),averageXp:Math.round(selected.reduce((n,x)=>n+Number(x.xp||0),0)/selected.length),wrongByGame:Object.entries(wrongByGame).sort((a,b)=>b[1]-a[1]).slice(0,8)};
   return json({ok:true,students:selected.map(p=>({id:p.id,name:p.full_name||p.username,xp:p.xp,points:p.points,plays:rows.filter(g=>g.student_id===p.id).length,email:p.email||'',phone:p.phone||''})),inactive:selected.filter(p=>!active.has(p.id)).map(p=>p.full_name||p.username),summary,rubrics:reports.data||[]});
  }
  if(op==='teacherPortalStudents'){
   let query=memberStudents(db.from('students').select('id,username,full_name,class_no')).eq('role','student').eq('status','approved').is('frozen_at',null);if(!ownerTeacher(a))query=query.eq('teacher_id',r.teacher_id);const out=await query.order('username');if(out.error)throw out.error;
   const guests=await db.from('teacher_portal_guests').select('student_id').eq('access_id',r.id);if(guests.error)throw guests.error;const ids=new Set((guests.data||[]).map(x=>x.student_id));return json({ok:true,items:out.data.filter(s=>!ids.has(s.id))});
  }
  if(op==='teacherPortalParticipant'){
   let sid=b.studentId;const self=b.self===true;let selfName='';if(self){const owner=await db.from('teachers').select('username').eq('id',r.teacher_id).maybeSingle();if(owner.error)throw owner.error;selfName=String(owner.data?.username||'Öğretmen').slice(0,32);if(selfName.length<3)selfName='Öğretmen '+selfName;}
   if(self||b.preview===true||b.guestName){
    const alias=self?selfName:b.preview===true?'Önizleme':String(b.guestName||'').trim().replace(/\s+/g,' ');
    if([...alias].length<3)return fail('En az 3 harf girin.');if(!/^[\p{L}\p{N} ._-]{3,32}$/u.test(alias))return fail('İsim 3–32 karakter olmalı; harf ve rakam kullan.');
    const result=await db.rpc('dm_teacher_portal_guest',{grant_id:r.id,guest_alias:alias,is_preview:self||b.preview===true,secret_hash:await hashPassword(crypto.randomUUID())});if(result.error)throw result.error;sid=result.data;
   }
   const pupil=await db.from('students').select('id,username,status,teacher_id,frozen_at,profile').eq('id',String(sid||'')).maybeSingle();
   if(!self&&!b.guestName&&b.preview!==true&&isClassroomGuest(pupil.data))return fail('Misafir adını oyun için yeniden gir.',403);
   if(!pupil.data||pupil.data.status!=='approved'||pupil.data.frozen_at||(!ownerTeacher(a)&&pupil.data.teacher_id!==r.teacher_id))return fail('Yalnızca sana bağlı öğrencileri seçebilirsin.',403);
   return json({ok:true,token:await session(r,'student',pupil.data.id),name:pupil.data.username,preview:self||b.preview===true,self,displayName:self?selfName:undefined});
  }
  return fail('İşlem desteklenmiyor.');
 }};
}
