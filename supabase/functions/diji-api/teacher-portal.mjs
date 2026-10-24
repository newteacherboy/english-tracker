// Every grant is tied to a normal learner; neither role claims nor invite codes grant access.
// Private teacher codes use six digits and rate-limited authentication; prior codes require rotation.
export const portalOps=new Set(['teacherPortalApply','teacherPortalStatus','teacherPortalList','teacherPortalDecide','teacherPortalIssueCode','teacherPortalLogin','teacherPortalResetRequest','teacherPortalReset','teacherPortalChangeCode','teacherPortalAppearance','teacherPortalSyncStudents','teacherPortalStudents','teacherPortalParticipant']);
export function portalOperationAllowed(op,b={}) {
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
   if(!/^\d{6}$/.test(String(b.code||'')))return fail('6 haneli öğretmen giriş kodunu yaz.');
   const r=await db.from('teacher_portal_access').select('*').eq('code_digest',await digest(b.code)).eq('state','approved').maybeSingle();if(r.error)throw r.error;
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
   const r=await db.from('teacher_portal_access').select('id,state,requested_at,code_sent_at,student_id,students!student_id(username,full_name,email,email_verified_at)').order('requested_at',{ascending:false});if(r.error)throw r.error;return json({ok:true,items:r.data});
  }
  if(op==='teacherPortalApply'||op==='teacherPortalStatus'){
   if(a?.role!=='student'||!a.student_id||a.teacher_portal_access_id)return fail('Kişisel hesabına giriş yap.',401);
   if(op==='teacherPortalApply'){await this.apply(a.student_id);}
   await ensureCode(a.student_id);const r=await byStudent(a.student_id);return json({ok:true,state:r?.state||'none',codeSent:!!r?.code_sent_at});
  }
  const r=await grant(a);if(!r)return fail('Kodla öğretmen girişi gerekli.',403);
  if(op==='teacherPortalChangeCode'){
   if(!/^\d{6}$/.test(String(b.code||''))||!/^\d{6}$/.test(String(b.currentCode||''))||await digest(b.currentCode)!==r.code_digest)return fail('Mevcut kod ve 6 haneli yeni kod gerekli.',403);
   if(b.code===b.currentCode)return fail('Yeni kod mevcut koddan farklı olmalı.');
   return await codeMail(r,b.code)?json({ok:true,mesaj:'Kodun değiştirildi. Yeni kodla tekrar giriş yap.'}):fail('Kod değiştirilemedi.',409);
  }
  if(op==='teacherPortalAppearance'){
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
   const linked=await db.from('students').select('id').eq('teacher_id',r.teacher_id).eq('role','student').eq('status','approved').is('frozen_at',null);
   if(linked.error)throw linked.error;
   return json({ok:true,count:(linked.data||[]).length});
  }
  if(op==='teacherPortalStudents'){
   const out=await db.from('students').select('id,username,full_name,class_no').eq('teacher_id',r.teacher_id).eq('status','approved').is('frozen_at',null).order('username');if(out.error)throw out.error;
   const guests=await db.from('teacher_portal_guests').select('student_id').eq('access_id',r.id);if(guests.error)throw guests.error;const ids=new Set((guests.data||[]).map(x=>x.student_id));return json({ok:true,items:out.data.filter(s=>!ids.has(s.id))});
  }
  if(op==='teacherPortalParticipant'){
   let sid=b.studentId;
   if(b.preview===true||b.guestName){
    const alias=b.preview===true?'Önizleme':String(b.guestName||'').trim().replace(/\s+/g,' ');
    if(!/^[\p{L}\p{N} ._-]{2,32}$/u.test(alias))return fail('İsim 2–32 karakter olmalı; harf ve rakam kullan.');
    const result=await db.rpc('dm_teacher_portal_guest',{grant_id:r.id,guest_alias:alias,is_preview:b.preview===true,secret_hash:await hashPassword(crypto.randomUUID())});if(result.error)throw result.error;sid=result.data;
   }
   const pupil=await db.from('students').select('id,username,status,teacher_id,frozen_at').eq('id',String(sid||'')).maybeSingle();
   if(!pupil.data||pupil.data.status!=='approved'||pupil.data.frozen_at||pupil.data.teacher_id!==r.teacher_id)return fail('Yalnızca sana bağlı öğrencileri seçebilirsin.',403);
   return json({ok:true,token:await session(r,'student',pupil.data.id),name:pupil.data.username,preview:b.preview===true});
  }
  return fail('İşlem desteklenmiyor.');
 }};
}
