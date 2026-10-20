// Graduation eligibility is derived exclusively from persisted, authenticated progress.
export function eligibleGraduations({catalog,school,completed,inherited=0}){
 const result=[],done=new Set((school.done||[]).map(Number));
 for(let cls=1;cls<=8;cls++){
  const stops=(school.units||[]).flat().filter(n=>Math.floor((n-200000)/10000)===cls);
  if(stops.length&&stops.every(n=>done.has(n)))result.push({route:'school',level:String(cls),stops:stops.length,themes:new Set(stops.map(n=>Math.floor((n-200000)%10000/100))).size,next:cls<8?String(cls+1):null});
 }
 const passed=new Set(completed.filter(p=>p.completed).map(p=>Number(p.chapter)));
 for(let i=0;i<Math.min(80,Number(inherited)||0);i++)passed.add(1000+i);
 for(const level of ['A1','A2','B1','B2']){
  const rows=catalog.filter(c=>c.cefr===level);
  if(rows.length&&rows.every(c=>passed.has(c.id)))result.push({route:'learning',level,stops:rows.length,themes:new Set(rows.map(c=>c.themeId)).size,next:({A1:'A2',A2:'B1',B1:'B2'})[level]||null});
 }
 return result;
}
export function routeGraduationsAPI(db,json,catalog){return {async handle(op,b,a,method){
 if(op!=='routeGraduations')return null;
 const fail=(mesaj,status=400)=>json({ok:false,mesaj},status);
 if(method!=='POST')return fail('POST gerekli.',405);
 if(a?.role!=='student'||!a.student_id)return fail('Öğrenci oturumu gerekli.',401);
 if(!['sync','list','seen'].includes(b.action||'list'))return fail('Geçersiz işlem.');
 const person=await db.from('students').select('id,username,full_name,status,role').eq('id',a.student_id).maybeSingle();
 if(person.error)return fail('Hesap kontrol edilemedi.',503);
 if(!person.data||person.data.status!=='approved'||person.data.role!=='student')return fail('Aktif öğrenci hesabı gerekli.',403);
 if(b.action==='seen'){
  if(!/^[0-9a-f-]{36}$/i.test(String(b.id||'')))return fail('Geçerli belge gerekli.');
  const r=await db.from('dm_route_graduations').update({notified_at:new Date().toISOString()}).eq('student_id',a.student_id).eq('id',b.id).is('notified_at',null);
  if(r.error)return fail('Kutlama kaydı saklanamadı.',503);
 }else if(b.action==='sync'){
  const [school,progress,enrollment]=await Promise.all([
   db.rpc('dm_progress_context',{actor:a.student_id}),
   db.from('papi_story_progress').select('chapter,completed').eq('student_id',a.student_id).gte('chapter',1000).limit(2000),
   db.from('dm_thematic_enrollment').select('inherited_count').eq('student_id',a.student_id).maybeSingle()
  ]);
  if(school.error||progress.error||enrollment.error)return fail('Başarılar doğrulanamadı.',503);
  const eligible=eligibleGraduations({catalog,school:school.data||{},completed:progress.data||[],inherited:enrollment.data?.inherited_count||0});
  if(eligible.length){const r=await db.from('dm_route_graduations').upsert(eligible.map(x=>({student_id:a.student_id,route:x.route,level:x.level,snapshot:{...x,name:String(person.data.full_name||person.data.username).slice(0,120)},notified_at:b.quiet===true?new Date().toISOString():null})),{onConflict:'student_id,route,level',ignoreDuplicates:true});if(r.error)return fail('Belgeler kaydedilemedi.',503);}
 }
 const rows=await db.from('dm_route_graduations').select('id,route,level,snapshot,issued_at,notified_at').eq('student_id',a.student_id).order('issued_at',{ascending:true}).limit(12);
 if(rows.error)return fail('Belgeler yüklenemedi.',503);
 return json({ok:true,awards:rows.data||[]});
}};}
