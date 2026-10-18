// Independent guardian credentials and administrator-reviewed safety reports.
export const SOCIAL_DEFAULTS={social_enabled:true,profile_visible:true,messages_enabled:true,duels_enabled:true,gifts_enabled:true};
const reasons=new Set(['bullying','inappropriate','personal_info','spam','other']);
const kinds=new Set(['user','feed','message']);
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mask=e=>{const [n,d]=String(e||'').split('@');return d?n.slice(0,1)+'***@'+d:'';};
export function allowed(c,feature='social',now=Date.now()) {return (!c||c.social_enabled!==false)&&!(Date.parse(c?.suspended_until||'')>now)&&(feature==='social'||c?.[feature+'_enabled']!==false)&&(feature!=='profile'||c?.profile_visible!==false);}
export function socialFeature(op){
 if(['hazirMesajGonder'].includes(op))return 'messages';
 if(['enerjiGonder','aksesuarHediye'].includes(op))return 'gifts';
 if(/^oyunEslesme|^duello/.test(op))return 'duels';
 if(['akisTumu','sosyalOgrencilerGetir','akisOlaylariGetir','akisOlayToggle','aktifDurum','takipDavetListesi','bildirimGonder','duelloDavetGonder','seviyeLigListesi'].includes(op))return 'social';
 return null;
}
async function hashGuardianPin(pin){
 if(typeof pin!=='string'||!/^\d{6}$/.test(pin))throw Error('Veli PIN’i 6 rakam olmalı.');
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
 const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},key,256));
 const base64=a=>btoa(String.fromCharCode(...a));
 return 'pbkdf2$210000$'+base64(salt)+'$'+base64(bits);
}
export function socialSafetyAPI({db,json,hash,hashPassword,verifyPassword,queue}){
 async function one(table,columns,key,value){const r=await db.from(table).select(columns).eq(key,value).maybeSingle();if(r.error)throw Error('Güvenlik bilgileri alınamadı.');return r.data;}
 async function control(id){return one('dm_social_controls','*','student_id',id);}
 async function rate(scope,value,max,seconds){const r=await db.rpc('dm_security_rate_check',{bucket_key:'safety:'+await hash(scope+'|'+value),max_hits:max,window_seconds:seconds});if(r.error||!r.data?.allowed)throw Error('Çok fazla deneme. Biraz sonra tekrar dene.');}
 async function parentSession(raw){if(typeof raw!=='string'||raw.length<60||raw.length>150)throw Error('Veli oturumu gerekli.');const s=await one('dm_guardian_sessions','*','token_hash',await hash(raw));if(!s||Date.parse(s.expires_at)<=Date.now())throw Error('Veli oturumu sona erdi. Yeniden doğrula.');const c=await control(s.student_id);if(!c?.verified_at||c.pin_hash!==s.pin_snapshot)throw Error('Veli oturumu geçersiz.');return {s,c};}
 const settings=c=>Object.fromEntries(Object.keys(SOCIAL_DEFAULTS).map(k=>[k,c?.[k]!==false]));
 async function state(id,c){if(c===undefined)c=await control(id);const s=await one('students','username,email','id',id);return {ok:true,student:s?.username||'',linked:!!c?.verified_at,email:mask(c?.guardian_email||s?.email),settings:settings(c),socialAllowed:allowed(c),noticeSeen:!!c?.notice_seen_at,suspendedUntil:c?.suspended_until||null};}
 async function visibility(ids,viewer){const unique=[...new Set(ids.filter(Boolean))];if(!unique.length)return {controls:new Map(),blocked:new Set()};const frozen=await db.from('students').select('id').in('id',unique).not('frozen_at','is',null);if(frozen.error)throw Error('Hesap durumu kontrol edilemedi.');const r=await db.from('dm_social_controls').select('student_id,social_enabled,profile_visible,messages_enabled,duels_enabled,gifts_enabled,suspended_until').in('student_id',unique);if(r.error)throw Error('Sosyal izinler kontrol edilemedi.');let blocked=new Set();if(viewer){const b=await db.from('student_blocks').select('blocker_id,blocked_id').or('blocker_id.eq.'+viewer+',blocked_id.eq.'+viewer);if(b.error)throw Error('Engel bilgileri alınamadı.');blocked=new Set((b.data||[]).map(x=>x.blocker_id===viewer?x.blocked_id:x.blocker_id));}return {controls:new Map([...(r.data||[]).map(c=>[c.student_id,c]),...(frozen.data||[]).map(s=>[s.id,{social_enabled:false}])]),blocked};}
 return {
 async guard(op,b,q,a){
  let f=socialFeature(op);if(op==='bildirimGonder')f=b.tur==='mesaj'?'messages':['hediye','enerji'].includes(b.tur)?'gifts':f;
  if(!f||a?.role!=='student'||!a.student_id)return null;
  const c=await control(a.student_id);if(!allowed(c,f))return json({ok:false,hata:'social_disabled',mesaj:'Bu sosyal özellik veli veya yönetici ayarlarıyla kapalı.'},403);
  let target=String(b.alici||q.get('alici')||''),targetId=null;
  if(op==='akisOlayToggle'){
   const h=String(b.hedef||'').replace(/^akis-/,'');
   if(idPattern.test(h)){const e=await one('feed_events','student_id,safety_hidden','id',h);if(!e||e.safety_hidden)return json({ok:false,mesaj:'İçerik artık görünür değil.'},404);targetId=e.student_id;}
   else target=h;
  }
  if(target){const r=await db.from('students').select('id').ilike('username',target.replace(/[\\%_]/g,m=>'\\'+m)).limit(2);if(r.error)throw Error('Kullanıcı kontrol edilemedi.');if(r.data?.length===1)targetId=r.data[0].id;}
  if(targetId){
   if(!allowed(await control(targetId),op==='akisOlayToggle'?'profile':f))return json({ok:false,mesaj:'Bu kişiyle sosyal etkileşim kapalı.'},403);
   const blocked=await db.rpc('dm_blocked',{a:a.student_id,b:targetId});if(blocked.error)throw Error('Engel bilgisi kontrol edilemedi.');if(blocked.data===true)return json({ok:false,mesaj:'Bu kişiyle iletişim kapalı.'},403);
  }
  return null;
 },
 async filterStudents(rows,viewer){const v=await visibility((rows||[]).map(x=>x.id),viewer);return (rows||[]).filter(x=>x.id===viewer||allowed(v.controls.get(x.id),'profile')&&!v.blocked.has(x.id));},
 async filterEvents(rows,viewer){const v=await visibility((rows||[]).flatMap(x=>[x.student_id,x.target_student_id]),viewer);return (rows||[]).filter(x=>!x.safety_hidden&&allowed(v.controls.get(x.student_id),'profile')&&(!x.target_student_id||allowed(v.controls.get(x.target_student_id),'profile'))&&!v.blocked.has(x.student_id)&&!v.blocked.has(x.target_student_id));},
 async filterNotifications(rows,viewer){const v=await visibility((rows||[]).flatMap(x=>[x.sender_student_id,viewer]),viewer);return (rows||[]).filter(x=>{if(!x.sender_student_id)return true;const f=x.type==='mesaj'?'messages':['hediye','enerji'].includes(x.type)?'gifts':'duels';return allowed(v.controls.get(viewer),f)&&allowed(v.controls.get(x.sender_student_id),f)&&!v.blocked.has(x.sender_student_id);});},
 async handle(op,b,a,method='POST'){
  if(!op.startsWith('safety'))return null;
  if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  try{
   if(op==='safetyParentClaim'){
    if(b.adult!==true||!/^\d{6}$/.test(b.pin||'')||/^(\d)\1{5}$|^123456$|^654321$/.test(b.pin)||typeof b.link!=='string'||b.link.length<60||b.link.length>150)return json({ok:false,mesaj:'Yetişkin beyanını onayla ve kolay tahmin edilmeyen 6 haneli PIN seç.'},400);
    await rate('claim',await hash(b.link),6,900);const parentToken=crypto.randomUUID()+'-'+crypto.randomUUID();const r=await db.rpc('dm_guardian_claim',{p_hash:await hash(b.link),p_pin:await hashGuardianPin(b.pin),p_session:await hash(parentToken)});if(r.error)throw Error('Bağlantı geçersiz, kullanılmış veya süresi dolmuş. Yeni bağlantı iste.');
    return json({...await state(r.data),parentToken,expiresIn:600});
   }
   if(op==='safetyParentLock'){await parentSession(b.parentToken);const r=await db.from('dm_guardian_sessions').delete().eq('token_hash',await hash(b.parentToken));if(r.error)throw Error('Veli alanı kilitlenemedi.');return json({ok:true});}
   if(op==='safetyParentStatus'||op==='safetyParentSave'){
    const {s,c}=await parentSession(b.parentToken);
    if(op==='safetyParentSave'){
     if(!b.settings||Object.keys(b.settings).length!==5||Object.keys(SOCIAL_DEFAULTS).some(k=>typeof b.settings[k]!=='boolean'))return json({ok:false,mesaj:'Geçersiz ayarlar.'},400);
     const r=await db.rpc('dm_guardian_save',{p_session:await hash(b.parentToken),p_settings:b.settings});if(r.error)throw Error('Veli oturumu veya ayarlar geçersiz. Yeniden doğrula.');return json(await state(s.student_id));
    }
    return json(await state(s.student_id,c));
   }
   if(op.startsWith('safetyAdmin')){
    if(a?.role!=='teacher'||!a.teacher_id||!a.yonetici)return json({ok:false,mesaj:'Yalnız yöneticiler bu alanı kullanabilir.'},403);
    const admin=await one('teachers','active,is_admin','id',a.teacher_id);if(!admin?.active||!admin.is_admin)return json({ok:false,mesaj:'Yönetici yetkisi gerekli.'},403);
    if(op==='safetyAdminAccess')return json({ok:true,admin:true});
    if(op==='safetyTeacherNotice'){
     const username=String(b.username||'').trim(),kind=b.kind;
     const message=String(b.message||'').trim();
     if(!['warning','discipline'].includes(kind)||username.length<2||username.length>80||message.length<5||message.length>450)return json({ok:false,mesaj:'Öğrenci, tür ve 5-450 karakter açıklama gerekli.'},400);
     const student=await one('students','id,username','username',username);
     if(!student||student.username==='dijimedu_demo')return json({ok:false,mesaj:'Öğrenci bulunamadı veya işlem yapılamıyor.'},404);
     await rate('teacher-notice',a.teacher_id,20,3600);
     const r=await db.from('dm_teacher_student_notices').insert({student_id:student.id,teacher_id:a.teacher_id,kind,message});
     if(r.error)throw Error('Önemli duyuru kaydedilemedi.');
     return json({ok:true,mesaj:'Önemli duyuru ilgili öğrenciye gönderildi.'});
    }
    if(op==='safetyAdminReview'){
     if(!idPattern.test(b.id||'')||!['review','dismiss','warn','hide','suspend','restore'].includes(b.action)||String(b.note||'').length>500)return json({ok:false,mesaj:'Geçersiz işlem.'},400);
     const report=await db.from('dm_safety_reports').select('id,target_id,reason').eq('id',b.id).maybeSingle();
     if(report.error||!report.data)return json({ok:false,mesaj:'Şikâyet bulunamadı.'},404);
     const r=await db.rpc('dm_safety_review',{p_admin:a.teacher_id,p_report:b.id,p_action:b.action,p_note:String(b.note||''),p_days:Number(b.days)||1});if(r.error)throw Error('İşlem kaydedilemedi. Bildirimi ve seçimi kontrol et.');
     if(['warn','suspend','restore'].includes(b.action)&&report.data.target_id){
      const defaultMessage=b.action==='warn'?'Hesabın için bir uyarı oluşturuldu. Lütfen topluluk kurallarına dikkat et.':b.action==='restore'?'Sosyal özelliklerine uygulanan kısıtlama kaldırıldı.':'Sosyal özelliklerine '+(Number(b.days)===7?'7':'1')+' gün süreyle kısıtlama uygulandı.';
      const detail=String(b.studentMessage||'').trim().slice(0,450);
      const msg=detail.length>=5?detail:defaultMessage;
      const notice=await db.from('dm_teacher_student_notices').insert({student_id:report.data.target_id,teacher_id:a.teacher_id,report_id:b.id,kind:b.action==='warn'?'warning':'discipline',message:msg,appeal_allowed:b.appealAllowed!==false});
      if(notice.error)throw Error('İşlem kaydedildi ancak öğrenciye bildirim iletilemedi. Yönetici panelinden kontrol et.');
     }
     return json({ok:true});
    }
    if(op==='safetyAdminAppeals'){
     const r=await db.from('dm_teacher_student_notices').select('id,kind,message,appeal_message,appealed_at,appeal_reviewed_at,acknowledged_at,student:students!dm_teacher_student_notices_student_id_fkey(username)').eq('teacher_id',a.teacher_id).not('appealed_at','is',null).order('appealed_at',{ascending:false}).limit(80);
     if(r.error)throw Error('İtirazlar alınamadı.');return json({ok:true,appeals:r.data||[]});
    }
    if(op==='safetyAdminAppealResolve'){
     if(!idPattern.test(b.id||''))return json({ok:false,mesaj:'Geçersiz itiraz.'},400);
     const r=await db.from('dm_teacher_student_notices').update({appeal_reviewed_at:new Date().toISOString()}).eq('id',b.id).eq('teacher_id',a.teacher_id).not('appealed_at','is',null).select('id');
     if(r.error||!r.data?.length)return json({ok:false,mesaj:'İtiraz bulunamadı.'},404);return json({ok:true});
    }
    if(op==='safetyAdminList'){
     let req=db.from('dm_safety_reports').select('id,kind,item_id,reason,note,snapshot,status,action,review_note,created_at,updated_at,reporter:students!dm_safety_reports_reporter_id_fkey(username),target:students!dm_safety_reports_target_id_fkey(username)').order('created_at',{ascending:false}).limit(100);
     if(['new','reviewing','resolved','dismissed'].includes(b.status))req=req.eq('status',b.status);
     const r=await req;if(r.error)throw Error('Bildirimler alınamadı.');return json({ok:true,reports:r.data||[]});
    }
    return json({ok:false,mesaj:'Bilinmeyen işlem.'},400);
   }
   if(a?.role!=='student'||!a.student_id)return json({ok:false,mesaj:'Öğrenci oturumu gerekli.'},401);
   const actor=a.student_id;
   if(actor==='dcde2026-1015-4000-8000-000000000001'&&op!=='safetyStatus')return json({ok:false,mesaj:'Tanıtım hesabında güvenlik ayarları değiştirilemez.'},403);
   if(op==='safetyStudentNotices'){
    const r=await db.from('dm_teacher_student_notices').select('id,kind,message,created_at,appeal_allowed,appealed_at').eq('student_id',actor).is('acknowledged_at',null).order('created_at',{ascending:true}).limit(1);
    if(r.error)throw Error('Önemli duyuru alınamadı.');return json({ok:true,notices:r.data||[]});
   }
   if(op==='safetyStudentNoticeAck'){
    if(!idPattern.test(b.id||''))return json({ok:false,mesaj:'Geçersiz duyuru.'},400);
    const r=await db.from('dm_teacher_student_notices').update({acknowledged_at:new Date().toISOString()}).eq('student_id',actor).eq('id',b.id).is('acknowledged_at',null).select('id');
    if(r.error)throw Error('Duyuru onaylanamadı.');return json({ok:true,acknowledged:(r.data||[]).length>0});
   }
   if(op==='safetyStudentNoticeAppeal'){
    if(!idPattern.test(b.id||'')||String(b.message||'').trim().length<10||String(b.message||'').length>500)return json({ok:false,mesaj:'İtiraz açıklaması 10-500 karakter olmalı.'},400);
    const r=await db.from('dm_teacher_student_notices').update({appealed_at:new Date().toISOString(),appeal_message:String(b.message).trim(),acknowledged_at:new Date().toISOString()}).eq('id',b.id).eq('student_id',actor).eq('appeal_allowed',true).is('appealed_at',null).select('id');
    if(r.error||!r.data?.length)return json({ok:false,mesaj:'Bu bildirim için itiraz hakkı kullanılmış veya kullanılamıyor.'},409);
    return json({ok:true});
   }
   if(op==='safetyMyReports'){const r=await db.from('dm_safety_reports').select('id,reason,status,created_at').eq('reporter_id',actor).order('created_at',{ascending:false}).limit(30);if(r.error)throw Error('Bildirimler alınamadı.');return json({ok:true,reports:r.data||[]});}
   if(op==='safetyStatus')return json(await state(actor));
   if(op==='safetyNoticeAck'){const r=await db.from('dm_social_controls').upsert({student_id:actor,notice_seen_at:new Date().toISOString()},{onConflict:'student_id'});if(r.error)throw Error('Bilgilendirme kaydedilemedi.');return json({ok:true});}
   if(op==='safetyReport'){
    if(!kinds.has(b.kind)||!reasons.has(b.reason)||String(b.note||'').length>500||!idPattern.test(b.requestId||'')||(b.kind!=='user'&&!idPattern.test(b.itemId||'')))return json({ok:false,mesaj:'Bildirim alanlarını kontrol et.'},400);
    if(String(b.target||'').trim().toLocaleLowerCase('tr')==='dijimedu_demo')return json({ok:false,mesaj:'Tanıtım hesabı bildirilemez.'},400);
    await rate('report',actor,25,3600);const r=await db.rpc('dm_safety_report_create',{p_actor:actor,p_target:String(b.target||'').slice(0,100),p_kind:b.kind,p_item:b.kind==='user'?null:b.itemId,p_reason:b.reason,p_note:String(b.note||''),p_request:b.requestId});if(r.error)throw Error('Bildirim kaydedilemedi. İçeriği kontrol edip tekrar dene.');return json({ok:true,id:r.data,mesaj:'Bildirimin alındı. Kimliğin karşı tarafa gösterilmez.'});
   }
   if(op==='safetyParentRequest'){
    if(actor==='dcde2026-1015-4000-8000-000000000001')return json({ok:false,mesaj:'Tanıtım hesabında veli bağlantısı kurulamaz.'},403);
    await rate('parent-link',actor,3,3600);
    const c=await control(actor),student=await one('students','username,email','id',actor),email=c?.verified_at?c.guardian_email:String(student?.email||'').trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email||''))return json({ok:false,mesaj:'Önce kişisel bilgilerinden veli e-posta adresini tamamla.'},400);
    const link=crypto.randomUUID()+'-'+crypto.randomUUID(),linkHash=await hash(link),url='https://app.dijimedu.com/ingilizce/veli-kontrolu.html#'+encodeURIComponent(link);
    const r=await db.from('dm_guardian_challenges').insert({student_id:actor,email,token_hash:linkHash});if(r.error)throw Error('Bağlantı oluşturulamadı.');
    const queued=await queue({student_id:actor,to_email:email,kind:'veli_guvenlik',priority:100,subject:'Diji-Medu · Veli kontrolü doğrulaması',html:'<h2>Diji-Medu Veli Kontrolü</h2><p>'+escape(student.username)+' hesabı için veli kontrolü bağlantısı istendi.</p><p>Bu bağlantıyı yalnız çocuğun yasal temsilcisi kullanmalıdır. Öğrenciyle paylaşmayın. Ayrı bir veli PIN’i oluşturup sosyal izinleri yönetebilirsiniz.</p><p><a href="'+url+'">Veli kontrolünü aç</a></p><p>Bağlantı bir saat geçerlidir ve yalnız bir kez kullanılabilir. Bu talebi tanımıyorsanız bağlantıyı kullanmayın. Talep tek başına mevcut izinleri veya PIN’i değiştirmez.</p>',text_body:'Diji-Medu veli kontrolü: '+url+'\nBağlantı 1 saat geçerlidir. Öğrenciyle paylaşmayın.'});
    if(!queued){await db.from('dm_guardian_challenges').delete().eq('token_hash',linkHash);throw Error('E-posta kuyruğa alınamadı. Tekrar dene.');}
    return json({ok:true,email:mask(email),mesaj:'Bağlantı veli e-postasına gönderilmek üzere alındı. Gereksiz/spam klasörünü de kontrol edin.'});
   }
   if(op==='safetyParentUnlock'){
    await rate('parent-pin',actor,8,900);const c=await control(actor);
    if(!c?.verified_at||!/^\d{6}$/.test(b.pin||'')||!await verifyPassword(b.pin,c.pin_hash))return json({ok:false,mesaj:'Veli PIN’i hatalı veya henüz oluşturulmamış.'},401);
    const parentToken=crypto.randomUUID()+'-'+crypto.randomUUID();const r=await db.from('dm_guardian_sessions').insert({student_id:actor,token_hash:await hash(parentToken),pin_snapshot:c.pin_hash});if(r.error)throw Error('Veli oturumu açılamadı.');return json({...await state(actor,c),parentToken,expiresIn:600});
   }
   return json({ok:false,mesaj:'Bilinmeyen işlem.'},400);
  }catch(e){return json({ok:false,mesaj:e instanceof Error?e.message:'İşlem tamamlanamadı.'},400);}
 }
 };
}
