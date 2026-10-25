/* Account-scoped announcement inbox. Classroom preview is never a recipient. */
const normalize=v=>String(v||'').trim().toLocaleLowerCase('tr');
export function announcementTargets(row,recipient,admins){
 if(!row.active)return false;
 const globalAuthor=!row.teacher_id||admins.has(row.teacher_id);
 const all=['all','herkes','tumogrenciler'].includes(row.target_type);
 if(recipient.role==='teacher')return globalAuthor&&all;
 const s=recipient.student;
 if(!s||!globalAuthor&&row.teacher_id!==s.teacher_id)return false;
 const list=(Array.isArray(row.target_list)?row.target_list:[]).map(normalize);
 if(all||row.target_type==='ogretmen')return true;
 if(row.target_type==='sinif')return list.includes(normalize(s.class_no));
 if(row.target_type==='sube')return list.includes(normalize(`${s.class_no||''}|${s.branch||''}`));
 return row.target_type==='secili'&&list.includes(normalize(s.username));
}
export function announcementsAPI(db,json){return {async handle(op,body,a,method){
 if(!['announcementInbox','announcementRead'].includes(op))return null;
 if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
 if(!a||!['student','teacher'].includes(a.role))return json({ok:false,mesaj:'Oturum gerekli.'},401);
 if(a.role==='student'&&a.teacher_portal_access_id)return json({ok:false,mesaj:'Kişisel hesap gerekli.'},403);
 let recipient={role:a.role};
 if(a.role==='student'){
  const s=await db.from('students').select('id,username,class_no,branch,teacher_id').eq('id',a.student_id).maybeSingle();
  if(s.error)return json({ok:false,mesaj:'Duyuru alıcısı doğrulanamadı.'},503);
  if(!s.data)return json({ok:false,mesaj:'Hesap bulunamadı.'},403);
  recipient.student=s.data;
 }else if(!a.teacher_id)return json({ok:false,mesaj:'Öğretmen oturumu gerekli.'},403);
 const [notices,owners]=await Promise.all([
  db.from('announcements').select('*').eq('active',true).order('created_at',{ascending:false}).order('id'),
  db.from('teachers').select('id').eq('is_admin',true).eq('active',true)
 ]);
 if(notices.error||owners.error)return json({ok:false,mesaj:'Duyurular alınamadı.'},503);
 const admins=new Set((owners.data||[]).map(x=>x.id));
 const eligible=(notices.data||[]).filter(x=>announcementTargets(x,recipient,admins));
 if(op==='announcementRead'){
  const id=String(body.id||'');
  if(!eligible.some(x=>x.id===id))return json({ok:false,mesaj:'Duyuru bulunamadı.'},404);
  let r;
  if(a.role==='student')r=await db.from('announcement_reads').upsert({announcement_id:id,student_id:a.student_id,seen_at:new Date().toISOString()},{onConflict:'announcement_id,student_id'});
  else{
   const old=await db.from('audit_logs').select('id').eq('actor_role','teacher').eq('actor_id',a.teacher_id).eq('operation','announcementRead').eq('target',id).limit(1);
   if(old.error)return json({ok:false,mesaj:'Duyuru kaydedilemedi.'},503);
   r=old.data?.length?{}:await db.from('audit_logs').insert({actor_role:'teacher',actor_id:a.teacher_id,operation:'announcementRead',target:id,payload:{}});
  }
  return r.error?json({ok:false,mesaj:'Duyuru kaydedilemedi.'},503):json({ok:true});
 }
 const read=a.role==='student'
  ?await db.from('announcement_reads').select('announcement_id').eq('student_id',a.student_id)
  :await db.from('audit_logs').select('target').eq('actor_role','teacher').eq('actor_id',a.teacher_id).eq('operation','announcementRead');
 if(read.error)return json({ok:false,mesaj:'Okunma bilgisi alınamadı.'},503);
 const seen=new Set((read.data||[]).map(x=>x.announcement_id||x.target));
 return json({ok:true,liste:eligible.filter(x=>!seen.has(x.id)).map(x=>({id:x.id,baslik:x.title,mesaj:x.message,tema:x.theme||'mavi',gorselLink:x.image_link||'',tarih:x.created_at}))});
}};}
