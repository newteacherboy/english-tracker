import {createHash} from 'node:crypto';
const email=x=>String(x||'').trim().toLowerCase();
const valid=x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=()=>new Date(Date.now()+10800000).toISOString().slice(0,10);
export function adminEmailAPI({db,json,welcome,publicParticipant,queue,brevoKey}){
 const fail=(mesaj,status=400)=>json({ok:false,mesaj},status);
 const safeUrl=(v)=>{if(!v)return '';try{const u=new URL(String(v));if(u.protocol==='https:'&&!u.username&&!u.password&&['app.dijimedu.com','dijimedu.com'].includes(u.hostname))return u.href;}catch{}return null;};
 function template(subject,body,link,image,unsubscribe=''){
  return '<div style="font-family:Arial;max-width:620px;margin:auto"><h2 style="color:#087c78">Diji-Medu İngilizce</h2><h3>'+esc(subject)+'</h3>'+(image?'<img alt="Diji-Medu" style="width:100%;max-width:620px" src="'+esc(image)+'">':'')+'<p>'+esc(body).replaceAll('\n','<br>')+'</p><p><a href="'+esc(link||'https://app.dijimedu.com/ingilizce/')+'">Diji-Medu’yu aç</a></p>'+(unsubscribe?'<small><a href="'+esc(unsubscribe)+'">E-posta aboneliğinden çık</a></small>':'')+'</div>';
 }
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
  const role=String(b.role||'all');
  if(!['all','student','teacher'].includes(role))throw Error('Geçersiz hesap türü.');
  const teacherIds=new Map();
  {
   for(let i=0;i<rows.length;i+=100){
    const g=await db.from('teacher_portal_access').select('student_id,teacher_id').eq('state','approved').in('student_id',rows.slice(i,i+100).map(x=>x.id));
    if(g.error)throw g.error;
    const ids=[...new Set((g.data||[]).map(x=>x.teacher_id).filter(Boolean))];
    if(!ids.length)continue;
    const t=await db.from('teachers').select('id').eq('active',true).is('frozen_at',null).in('id',ids);
    if(t.error)throw t.error;
    const active=new Set((t.data||[]).map(x=>x.id));
    for(const x of g.data||[])if(active.has(x.teacher_id))teacherIds.set(x.student_id,x.teacher_id);
   }
  }
  const filtered=rows.filter(s=>(role==='all'||(role==='teacher')===teacherIds.has(s.id))&&valid(email(s.email))&&(!search||s.username.toLocaleLowerCase('tr').includes(search)||email(s.email).includes(search))&&(verification==='all'||!!s.email_verified_at===(verification==='yes')));
  const result=[];
  for(let i=0;i<filtered.length;i+=100){
   const chunk=filtered.slice(i,i+100),ids=chunk.map(s=>s.id);
   const [p,m]=await Promise.all([db.from('dm_progress_mail_preferences').select('student_id,email,recipient_kind,opted_in_at,unsubscribed_at,consent_source').in('student_id',ids),db.rpc('dm_member_badge_plans',{p_ids:ids})]);
   if(p.error||m.error)throw p.error||m.error;
   const plans=new Map((m.data||[]).map(x=>[x.id,x.tier]));
   for(const s of chunk){
    let tier=plans.get(s.id)||'free';
    if(teacherIds.has(s.id)){const t=await db.rpc('dm_plan',{actor:teacherIds.get(s.id),account_role:'teacher'});if(t.error)throw t.error;tier=String(t.data||'free').replace(/^teacher_/,'');}
    if(plan!=='all'&&tier!==plan)continue;
    const prefs=(p.data||[]).filter(x=>x.student_id===s.id&&email(x.email)===email(s.email));
    const pref=prefs.find(x=>x.opted_in_at&&!x.unsubscribed_at&&String(x.consent_source||'').startsWith('registration_checkbox'));
    const eligible=mode==='verify'?!s.email_verified_at:!!s.email_verified_at&&!!pref&&!prefs.some(x=>x.unsubscribed_at);
    result.push({id:s.id,username:s.username,email:email(s.email),verified:!!s.email_verified_at,plan:tier,role:teacherIds.has(s.id)?'teacher':'student',eligible,recipientKind:pref?.recipient_kind||'student'});
   }
  }
  return result;
 }
 return {async handle(op,b,a,method){
  if(!['adminEmailPreview','adminEmailQueue','adminEmailHistory','adminEmailTest','adminEmailStats'].includes(op))return null;
  if(method!=='POST')return fail('POST gerekli.',405);
  if(a?.role!=='teacher'||a.yonetici!==true||a.ogretmenKullanici!=='teacher')return fail('Yönetici oturumu gerekli.',403);
  if(op==='adminEmailStats'){
   const utc=new Date().toISOString().slice(0,10);
   const budget=await db.from('dm_mail_budget').select('attempts').eq('day',utc).maybeSingle();
   if(budget.error)throw budget.error;
   const result={ok:true,attemptsToday:budget.data?.attempts||0,provider:null};
   if(!brevoKey)return json({...result,providerError:'Brevo bağlantısı tanımlı değil.'});
   try{
    const end=new Date(),start=new Date(end.getTime()-6*86400000);
    const params=new URLSearchParams({startDate:start.toISOString().slice(0,10),endDate:end.toISOString().slice(0,10)});
    const headers={'api-key':brevoKey,accept:'application/json'};
    const [a,r]=await Promise.all([fetch('https://api.brevo.com/v3/account',{headers,signal:AbortSignal.timeout(8000)}),fetch('https://api.brevo.com/v3/smtp/statistics/aggregatedReport?'+params,{headers,signal:AbortSignal.timeout(8000)})]);
    if(!a.ok||!r.ok)throw Error('Brevo raporu okunamadı.');
    const account=await a.json(), stats=await r.json();
    result.provider={period:'Son 7 gün · Brevo hesabının tüm işlem mailleri',plans:(account.plan||[]).map(x=>({type:x.type,credits:x.credits,creditsType:x.creditsType})),requests:stats.requests,delivered:stats.delivered,opens:stats.opens,uniqueOpens:stats.uniqueOpens,clicks:stats.clicks,uniqueClicks:stats.uniqueClicks,hardBounces:stats.hardBounces,softBounces:stats.softBounces};
    return json(result);
   }catch{return json({...result,providerError:'Brevo raporu şu anda okunamadı.'});}
  }
  if(op==='adminEmailHistory'){
   const r=await db.from('dm_papi_progress_outbox').select('id,subject,to_email,created_at,send_after,sent_at,attempts,error').eq('kind','admin_news').order('id',{ascending:false}).limit(100);
   if(r.error)throw r.error;return json({ok:true,items:r.data||[]});
  }
  const subject=String(b.subject||'').trim(),message=String(b.message||'').trim();
  const link=safeUrl(b.link),image=safeUrl(b.image);
  if(link===null||image===null)return fail('Görsel ve bağlantı yalnızca Diji-Medu HTTPS adreslerinden eklenebilir.');
  const validText=subject&&subject.length<=120&&!/[\r\n]/.test(subject)&&message&&message.length<=5000;
  if(op==='adminEmailTest'){
   if(b.confirm!==true||!validText||!queue)return fail('Test maili için konu, mesaj ve onay gerekli.');
   const t=await db.from('teachers').select('email').eq('id',a.teacher_id).eq('active',true).eq('is_admin',true).is('frozen_at',null).maybeSingle();
   if(t.error||!valid(email(t.data?.email)))return fail('Yönetici e-posta adresi bulunamadı.',409);
   const sent=await queue({to_email:email(t.data.email),kind:'admin_test',subject:'[TEST] '+subject,html:template(subject,message.replaceAll('{{username}}','Yönetici'),link,image),text_body:message,priority:0});
   return sent?json({ok:true}):fail('Test maili kuyruğa alınamadı.',503);
  }
  const rows=await audience(b);
  if(op==='adminEmailPreview')return json({ok:true,items:rows.slice(0,500),total:rows.length,eligible:rows.filter(x=>x.eligible).length,truncated:rows.length>500});
  const ids=Array.isArray(b.ids)?[...new Set(b.ids.map(String))]:[];
  if(!ids.length||ids.length>200||b.confirm!==true)return fail('1–200 alıcı seç ve gönderimi onayla.');
  const chosen=rows.filter(x=>ids.includes(x.id)&&x.eligible);
  if(chosen.length!==ids.length)return fail('Alıcı veya izin bilgisi değişti. Önizlemeyi yenile.',409);
  const mode=b.mode==='verify'?'verify':'news';
  if(mode==='news'&&(!subject||subject.length>120||/[\r\n]/.test(subject)||!message||message.length>5000))return fail('Konu ve mesajı kontrol et.');
  const scheduled=b.sendAfter?Date.parse(b.sendAfter):Date.now();
  if(!Number.isFinite(scheduled)||scheduled>Date.now()+30*86400000||b.sendAfter&&scheduled<Date.now()-60000||mode==='verify'&&b.sendAfter)return fail('Geçersiz gönderim zamanı. Haberler en fazla 30 gün ileri planlanabilir.');
  const sendAfter=new Date(scheduled).toISOString();
  const seen=new Set();let queued=0,skipped=0,failed=0;
  for(const r of chosen){
   if(seen.has(r.email)){skipped++;continue;}seen.add(r.email);
   try{
    if(mode==='verify'){await welcome(r);queued++;continue;}
    const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    const url='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/papi-progress-unsubscribe?token='+token;
    const t=await db.from('dm_papi_unsubscribe_tokens').insert({token_hash:createHash('md5').update(token).digest('hex'),student_id:r.id,email:r.email});if(t.error)throw t.error;
    const body=message.replaceAll('{{username}}',r.username);
    const html=template(subject,body,link,image,url);
    const out=await db.from('dm_papi_progress_outbox').insert({student_id:r.id,recipient_kind:r.recipientKind,to_email:r.email,subject,html,text_body:body+'\nAbonelikten çık: '+url,kind:'admin_news',report_date:day(),send_after:sendAfter});if(out.error){if(out.error.code==='23505'){skipped++;continue;}throw out.error;}queued++;
   }catch{failed++;}
  }
  await db.from('audit_logs').insert({actor_role:'teacher',actor_id:a.teacher_id,operation:'adminEmailQueue',target:mode,payload:{queued,skipped,failed}});
  return json({ok:true,queued,skipped,failed});
 }};
}
