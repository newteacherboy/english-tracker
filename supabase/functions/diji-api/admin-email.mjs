import {createHash} from 'node:crypto';
const email=x=>String(x||'').trim().toLowerCase();
const valid=x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=()=>new Date(Date.now()+10800000).toISOString().slice(0,10);
export function adminEmailAPI({db,json,welcome,publicParticipant}){
 const fail=(mesaj,status=400)=>json({ok:false,mesaj},status);
 async function audience(b){
  const rows=[];
  const mode=b.mode==='verify'?'verify':'news';
  const plan=String(b.plan||'all'), verification=String(b.verification||'all'), search=String(b.search||'').trim().toLocaleLowerCase('tr');
  if(!['all','free','pro','premium_pro'].includes(plan)||!['all','yes','no'].includes(verification))throw Error('Geçersiz filtre.');
  for(let i=0;;i+=500){
   const r=await db.from('students').select('id,username,email,email_verified_at,status,frozen_at,profile,role').eq('role','student').eq('status','approved').is('frozen_at',null).order('id').range(i,i+499);
   if(r.error)throw r.error;
   rows.push(...(r.data||[]).filter(publicParticipant));if((r.data||[]).length<500)break;
  }
  const filtered=rows.filter(s=>valid(email(s.email))&&(!search||s.username.toLocaleLowerCase('tr').includes(search)||email(s.email).includes(search))&&(verification==='all'||!!s.email_verified_at===(verification==='yes')));
  const result=[];
  for(let i=0;i<filtered.length;i+=100){
   const chunk=filtered.slice(i,i+100),ids=chunk.map(s=>s.id);
   const [p,m]=await Promise.all([db.from('dm_progress_mail_preferences').select('student_id,email,recipient_kind,opted_in_at,unsubscribed_at,consent_source').in('student_id',ids),db.rpc('dm_member_badge_plans',{p_ids:ids})]);
   if(p.error||m.error)throw p.error||m.error;
   const plans=new Map((m.data||[]).map(x=>[x.id,x.tier]));
   for(const s of chunk){
    const tier=plans.get(s.id)||'free';if(plan!=='all'&&tier!==plan)continue;
    const prefs=(p.data||[]).filter(x=>x.student_id===s.id&&email(x.email)===email(s.email));
    const pref=prefs.find(x=>x.opted_in_at&&!x.unsubscribed_at&&String(x.consent_source||'').startsWith('registration_checkbox'));
    const eligible=mode==='verify'?!s.email_verified_at:!!s.email_verified_at&&!!pref&&!prefs.some(x=>x.unsubscribed_at);
    result.push({id:s.id,username:s.username,email:email(s.email),verified:!!s.email_verified_at,plan:tier,eligible,recipientKind:pref?.recipient_kind||'student'});
   }
  }
  return result;
 }
 return {async handle(op,b,a,method){
  if(!['adminEmailPreview','adminEmailQueue','adminEmailHistory'].includes(op))return null;
  if(method!=='POST')return fail('POST gerekli.',405);
  if(a?.role!=='teacher'||a.yonetici!==true||a.ogretmenKullanici!=='teacher')return fail('Yönetici oturumu gerekli.',403);
  if(op==='adminEmailHistory'){
   const r=await db.from('dm_papi_progress_outbox').select('id,subject,to_email,created_at,send_after,sent_at,attempts,error').eq('kind','admin_news').order('id',{ascending:false}).limit(100);
   if(r.error)throw r.error;return json({ok:true,items:r.data||[]});
  }
  const rows=await audience(b);
  if(op==='adminEmailPreview')return json({ok:true,items:rows.slice(0,500),total:rows.length,eligible:rows.filter(x=>x.eligible).length,truncated:rows.length>500});
  const ids=Array.isArray(b.ids)?[...new Set(b.ids.map(String))]:[];
  if(!ids.length||ids.length>200||b.confirm!==true)return fail('1–200 alıcı seç ve gönderimi onayla.');
  const chosen=rows.filter(x=>ids.includes(x.id)&&x.eligible);
  if(chosen.length!==ids.length)return fail('Alıcı veya izin bilgisi değişti. Önizlemeyi yenile.',409);
  const mode=b.mode==='verify'?'verify':'news',subject=String(b.subject||'').trim(),message=String(b.message||'').trim();
  if(mode==='news'&&(!subject||subject.length>120||/[\r\n]/.test(subject)||!message||message.length>5000))return fail('Konu ve mesajı kontrol et.');
  const seen=new Set();let queued=0,skipped=0,failed=0;
  for(const r of chosen){
   if(seen.has(r.email)){skipped++;continue;}seen.add(r.email);
   try{
    if(mode==='verify'){await welcome(r);queued++;continue;}
    const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    const url='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/papi-progress-unsubscribe?token='+token;
    const t=await db.from('dm_papi_unsubscribe_tokens').insert({token_hash:createHash('md5').update(token).digest('hex'),student_id:r.id,email:r.email});if(t.error)throw t.error;
    const body=message.replaceAll('{{username}}',r.username);
    const html='<div style="font-family:Arial;max-width:620px;margin:auto"><h2 style="color:#087c78">Diji-Medu İngilizce</h2><h3>'+esc(subject)+'</h3><p>'+esc(body).replaceAll('\n','<br>')+'</p><p><a href="https://app.dijimedu.com/ingilizce/">Diji-Medu’yu aç</a></p><small><a href="'+url+'">E-posta aboneliğinden çık</a></small></div>';
    const out=await db.from('dm_papi_progress_outbox').insert({student_id:r.id,recipient_kind:r.recipientKind,to_email:r.email,subject,html,text_body:body+'\nAbonelikten çık: '+url,kind:'admin_news',report_date:day(),send_after:new Date().toISOString()});if(out.error){if(out.error.code==='23505'){skipped++;continue;}throw out.error;}queued++;
   }catch{failed++;}
  }
  await db.from('audit_logs').insert({actor_role:'teacher',actor_id:a.teacher_id,operation:'adminEmailQueue',target:mode,payload:{queued,skipped,failed}});
  return json({ok:true,queued,skipped,failed});
 }};
}
