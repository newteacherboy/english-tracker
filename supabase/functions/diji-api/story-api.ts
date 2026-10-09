import { STORY_CHAPTERS } from './story-curriculum.js';
const normStory=(x:any)=>String(x??'').normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/[.!?,;:]/g,'').replace(/\s+/g,' ');
export function storyAPI(db:any,json:any){
 const key=(a:any)=>a?.role==='student'&&a.student_id?'s:'+a.student_id:a?.role==='teacher'&&a.teacher_id?'t:'+a.teacher_id:'';
 const view=(r:any)=>({ok:true,chapter:r.chapter,cursor:r.cursor,completed:r.completed,version:r.version,writing:r.writing||'',mistakes:r.mistakes||0});
 return {async handle(op:string,b:any,a:any,method:string){
  if(!['storyStatus','storyOpen','storyAdvance'].includes(op))return null;
  const owner=key(a);if(!owner)return json({ok:false,mesaj:'Öğrenme ilerlemesini kaydetmek için giriş yapmalısın.'},401);
  if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  if(op==='storyStatus'){const {data,error}=await db.from('papi_story_progress').select('chapter,cursor,completed,version').eq('actor_key',owner).order('chapter');return error?json({ok:false,mesaj:'Öğrenme yolu yüklenemedi.'},503):json({ok:true,progress:data||[]});}
  const chapter=Number(b.chapter),C=STORY_CHAPTERS[chapter];if(!Number.isInteger(chapter)||!C)return json({ok:false,mesaj:'Geçersiz durak.'},400);
  const {data:existing,error}=await db.from('papi_story_progress').select('*').eq('actor_key',owner).eq('chapter',chapter).maybeSingle();if(error)return json({ok:false,mesaj:'Durak yüklenemedi.'},503);
  if(!existing&&chapter>0){const {data:prev,error:err}=await db.from('papi_story_progress').select('completed').eq('actor_key',owner).eq('chapter',chapter-1).maybeSingle();if(err)return json({ok:false,mesaj:'Önceki durak kontrol edilemedi.'},503);if(!prev?.completed)return json({ok:false,mesaj:'Önce önceki öğrenme durağını tamamla.'},403);}
  if(op==='storyOpen'){
   if(existing)return json(view(existing));
   const {data:r,error:err}=await db.from('papi_story_progress').upsert({actor_key:owner,student_id:a.role==='student'?a.student_id:null,teacher_id:a.role==='teacher'?a.teacher_id:null,chapter,cursor:0,completed:false,version:0},{onConflict:'actor_key,chapter',ignoreDuplicates:true}).select('*').maybeSingle();
   if(err)return json({ok:false,mesaj:'Durak açılamadı.'},503);if(r)return json(view(r));const {data:f,error:fe}=await db.from('papi_story_progress').select('*').eq('actor_key',owner).eq('chapter',chapter).maybeSingle();return fe||!f?json({ok:false,mesaj:'Durak tekrar yüklenmeli.'},503):json(view(f));
  }
  if(!existing)return json({ok:false,mesaj:'Önce durağı aç.'},409);
  if(existing.completed)return json({...view(existing),correct:true,alreadyCompleted:true});
  if(Number(b.cursor)!==existing.cursor||Number(b.version)!==existing.version)return json({...view(existing),stale:true});
  const task=C.steps[existing.cursor];if(!task)return json({ok:false,mesaj:'Geçersiz adım.'},400);
  let correct=true,writing=existing.writing||'';
  if(['choice','listen'].includes(task.kind)){if(!Number.isInteger(b.answer)||b.answer<0||b.answer>=task.options.length)return json({ok:false,mesaj:'Bir seçenek seç.'},400);correct=b.answer===task.answer;}
  else if(task.kind==='order')correct=normStory(b.answer)===normStory(task.answer);
  else if(task.kind==='write'){writing=String(b.answer||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,2000);if(writing.length<2)return json({ok:false,mesaj:'Kendi cümleni yaz.'},400);}
  else if(!['scene','teach','speak'].includes(task.kind))return json({ok:false,mesaj:'Bilinmeyen adım.'},400);
  const cursor=correct?existing.cursor+1:existing.cursor,completed=cursor>=C.steps.length;
  const update={cursor,completed,writing,mistakes:existing.mistakes+(correct?0:1),version:existing.version+1,updated_at:new Date().toISOString()};
  const {data:rows,error:err}=await db.from('papi_story_progress').update(update).eq('actor_key',owner).eq('chapter',chapter).eq('version',existing.version).select('*');if(err)return json({ok:false,mesaj:'İlerlemen kaydedilemedi. Yeniden dene.'},503);
  if(!rows?.length){const {data:r,error:e}=await db.from('papi_story_progress').select('*').eq('actor_key',owner).eq('chapter',chapter).maybeSingle();return e||!r?json({ok:false,mesaj:'İlerleme tekrar yüklenmeli.'},503):json({...view(r),stale:true});}
  return json({...view(rows[0]),correct,hint:correct?'':task.hint,leaf:completed?1:0});
 }};
}
