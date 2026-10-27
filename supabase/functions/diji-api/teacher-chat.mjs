// Message access is independent of classroom/report administration.
export function teacherChatAPI({db,json,memberStudents,clean,queue,mailShell,html,escape}){
 const ops=new Set(['sohbetGetir','sohbetMesajGonder','ogretmenSohbetAc','ogretmenSohbetListesi','ogretmenCevapGonder']);
 const checked=r=>{if(r.error)throw r.error;return r.data;};
 async function allRows(query){const rows=[];for(let offset=0;;offset+=500){const page=checked(await query().range(offset,offset+499))||[];rows.push(...page);if(page.length<500)return rows;}}
 const micros=t=>{const ms=Date.parse(t)||0,part=String(t||'').match(/\.(\d+)/)?.[1]||'';return ms*1000+Number(part.padEnd(6,'0').slice(3,6));};
 const owner=a=>a?.role==='teacher'&&a.ogretmenKullanici==='teacher'&&a.yonetici===true;
 async function copies(){return new Set((await allRows(()=>db.from('teacher_chat_admin_copies').select('student_id'))).map(x=>x.student_id));}
 async function pupils(a){
  const all=await allRows(()=>{let q=memberStudents(db.from('students').select('id,username,teacher_id,profile')).neq('id','dcde2026-1015-4000-8000-000000000001');return owner(a)?q:q.eq('teacher_id',a.teacher_id);});
  if(!owner(a))return all;
  const mirrored=await copies(),active=new Set((checked(await db.from('teachers').select('id').eq('active',true).is('frozen_at',null))||[]).map(t=>t.id));return all.filter(s=>!s.teacher_id||!active.has(s.teacher_id)||s.teacher_id===a.teacher_id||mirrored.has(s.id));
 }
 async function messages(ids){if(!ids.length)return [];return allRows(()=>db.from('chat_messages').select('*').in('student_id',ids).order('created_at',{ascending:false}).order('id',{ascending:false}));}
 async function receipts(a){return new Map((await allRows(()=>db.from('teacher_chat_receipts').select('student_id,read_through').eq('teacher_id',a.teacher_id))).map(x=>[x.student_id,micros(x.read_through)]));}
 async function inbox(a){
  const students=await pupils(a),names=new Map(students.map(s=>[s.id,s.username]));
  const [rows,marks]=await Promise.all([messages([...names.keys()]),receipts(a)]),last=new Map(),counts=new Map();
  for(const m of rows){if(!last.has(m.student_id))last.set(m.student_id,m);if(m.sender_role==='student'&&micros(m.created_at)>(marks.get(m.student_id)||0))counts.set(m.student_id,(counts.get(m.student_id)||0)+1);}
  return [...last.values()].map(m=>({ogrenci:names.get(m.student_id),sonMesaj:m.message,mesaj:m.message,tarih:m.created_at,okunmamis:counts.get(m.student_id)||0}));
 }
 async function summary(a){const items=await inbox(a);return {messages:items.reduce((n,x)=>n+x.okunmamis,0),messageSenders:items.filter(x=>x.okunmamis).map(x=>({student:x.ogrenci,count:x.okunmamis,at:x.tarih}))};}
 async function recipients(s){
  const [own,admin,mirror]=await Promise.all([
   s.teacher_id?db.from('teachers').select('id,email,active,frozen_at').eq('id',s.teacher_id).maybeSingle():{data:null},
   db.from('teachers').select('id,email,active,frozen_at').eq('username','teacher').eq('is_admin',true).maybeSingle(),
   db.from('teacher_chat_admin_copies').select('student_id').eq('student_id',s.id).maybeSingle()
  ]);
  const t=checked(own),o=checked(admin),copy=checked(mirror),active=x=>x&&x.active!==false&&!x.frozen_at;
  return [...new Map([...(active(t)?[t]:[]),...((!active(t)||copy)&&active(o)?[o]:[])].map(x=>[x.id,x])).values()];
 }
 return {summary,inbox,recipients,async handle(op,b,q,a,method){
  if(!ops.has(op))return null;
  if(!a)return json({ok:false,hata:'oturum',mesaj:'Önce giriş yap.'},401);
  const sending=op==='sohbetMesajGonder'||op==='ogretmenCevapGonder';if(sending&&method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  const name=String(b.ogrenci??q.get('ogrenci')??'');let s;
  if(op.startsWith('ogretmen')){
   if(a.role!=='teacher')return json({ok:false,mesaj:'Öğretmen oturumu gerekli.'},403);
   if(op==='ogretmenSohbetListesi')return json(await inbox(a));
   s=(await pupils(a)).find(x=>x.username===name);
  }else{
   if(a.role!=='student'||!a.student_id||a.teacher_portal_access_id)return json({ok:false,mesaj:'Kişisel öğrenci hesabı gerekli.'},403);
   s=checked(await memberStudents(db.from('students').select('id,username,teacher_id,status,frozen_at')).eq('id',a.student_id).maybeSingle());
   if(s&&(s.status!=='approved'||s.frozen_at||name&&name!==s.username))s=null;
  }
  if(!s)return json({ok:false,mesaj:'Bu sohbete erişim iznin yok.'},403);
  if(!sending){
   const delta=String(b.delta??q.get('delta'))==='1',cursor=b.cursor||null;
   if(delta&&cursor&&(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(cursor.id))||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(String(cursor.at))||!Number.isFinite(Date.parse(cursor.at))))return json({ok:false,mesaj:'Geçersiz mesaj imleci.'},400);
   const rows=await allRows(()=>{let query=db.from('chat_messages').select('*').eq('student_id',s.id).order('created_at').order('id');if(delta&&cursor){const at=cursor.at;query=query.or('created_at.gt.'+at+',and(created_at.eq.'+at+',id.gt.'+cursor.id+')');}return query;});
   if(op==='ogretmenSohbetAc'&&rows.length){
    const latest=rows.at(-1).created_at;
    checked(await db.from('teacher_chat_receipts').upsert({student_id:s.id,teacher_id:a.teacher_id,read_through:latest},{onConflict:'student_id,teacher_id'}));
    checked(await db.from('chat_messages').update({read_at:new Date().toISOString()}).eq('student_id',s.id).eq('sender_role','student').is('read_at',null));
   }
   const messages=rows.map(m=>({...(delta?{id:m.id}:{}),gonderen:m.sender_role==='teacher'?'ogretmen':'ogrenci',mesaj:m.message,tarih:m.created_at,okundu:!!m.read_at}));
   return json(delta?{delta:true,replace:!cursor,messages,cursor:rows.length?{at:rows.at(-1).created_at,id:rows.at(-1).id}:cursor}:messages);
  }
  const text=clean(b.mesaj??q.get('mesaj'),op==='sohbetMesajGonder'?1000:2000);if(!text)return json({ok:false,status:'error',mesaj:'Boş mesaj.'},400);
  if(op==='sohbetMesajGonder'){
   const count=await db.from('chat_messages').select('id',{count:'exact',head:true}).eq('student_id',s.id).gte('created_at',new Date(Date.now()-86400000).toISOString());if(count.error)throw count.error;
   if((count.count||0)>=50)return json({status:'limit_doldu',limit:50});
  }
  checked(await db.from('chat_messages').insert({student_id:s.id,sender_role:a.role==='teacher'?'teacher':'student',message:text}));
  if(op==='sohbetMesajGonder'){
   const emails=new Set();
   for(const t of await recipients(s)){
    const email=String(t.email||'').trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||emails.has(email))continue;emails.add(email);
    const recent=checked(await db.from('mail_queue').select('id').eq('student_id',s.id).eq('to_email',email).eq('kind','mesaj').gte('created_at',new Date(Date.now()-30*60000).toISOString()).limit(1));
    if(!recent?.length)await queue({student_id:s.id,to_email:email,kind:'mesaj',subject:`💬 ${s.username} sana mesaj gönderdi`,html:mailShell('Yeni Öğrenci Mesajı',`<p><b>${escape(s.username)}</b> sana mesaj gönderdi:</p><blockquote>${html(text)}</blockquote><p>Yanıtlamak için <a href="https://app.dijimedu.com/ingilizce/?ogretmenGiris=1">Öğretmen girişi → Öğrenci Sohbetleri</a> bölümünü aç. Aynı öğrenciden 30 dakika içinde gelen mesajlar tek e-posta bildirimiyle haber verilir.</p>`)});
   }
  }
  return json({ok:true,status:'success'});
 }};
}
