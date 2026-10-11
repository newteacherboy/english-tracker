import { STORY_CHAPTERS } from './story-curriculum.js';
import {storyV2Steps,storyV2Grade} from './story-v2.ts';
const useNewDeck=()=>typeof Deno!=='undefined'&&Deno.env.get('DM_STORY_V2')==='true';
const stepsFor=(chapter:number,record:any)=>record?.deck_version===2?storyV2Steps(STORY_CHAPTERS[chapter]):STORY_CHAPTERS[chapter].steps;
const normStory=(x:any)=>String(x??'').normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/[.!?,;:]/g,'').replace(/\s+/g,' ');
export function storyAPI(db:any,json:any){
 const key=(a:any)=>a?.role==='student'&&a.student_id?'s:'+a.student_id:a?.role==='teacher'&&a.teacher_id?'t:'+a.teacher_id:'';
 const view=(r:any)=>({ok:true,chapter:r.chapter,cursor:r.cursor,completed:r.completed,finished:r.cursor>=stepsFor(r.chapter,r).length,deckVersion:r.deck_version||1,replay:!!r.replay,version:r.version,mistakes:r.mistakes||0,reward:r.last_reward||{}});
 return {async handle(op:string,b:any,a:any,method:string){
  if(!['storyStatus','storyOpen','storyAdvance'].includes(op))return null;
  const owner=key(a);if(!owner)return json({ok:false,mesaj:'Öğrenme ilerlemesini kaydetmek için giriş yapmalısın.'},401);
  if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  if(op==='storyStatus'){const {data,error}=await db.from('papi_story_progress').select('chapter,cursor,completed,version').eq('actor_key',owner).order('chapter');return error?json({ok:false,mesaj:'Öğrenme yolu yüklenemedi.'},503):json({ok:true,progress:data||[]});}
  const chapter=Number(b.chapter),C=STORY_CHAPTERS[chapter];if(!Number.isInteger(chapter)||!C)return json({ok:false,mesaj:'Geçersiz durak.'},400);
  const read=()=>db.from('papi_story_progress').select('*').eq('actor_key',owner).eq('chapter',chapter).maybeSingle();
  const {data:existing,error}=await read();if(error)return json({ok:false,mesaj:'Durak yüklenemedi.'},503);
  if(!existing&&chapter>0){const {data:prev,error:err}=await db.from('papi_story_progress').select('completed').eq('actor_key',owner).eq('chapter',chapter-1).maybeSingle();if(err)return json({ok:false,mesaj:'Önceki durak kontrol edilemedi.'},503);if(!prev?.completed)return json({ok:false,mesaj:'Önce önceki öğrenme durağını tamamla.'},403);}
  if(op==='storyOpen'){
   if(existing){
    if(existing.completed&&existing.cursor>=stepsFor(chapter,existing).length){const {error:e}=await db.from('papi_story_progress').update({cursor:0,replay:true,questions_seen:0,charged_cursor:-1,mistakes:0,last_reward:{},version:existing.version+1,updated_at:new Date().toISOString()}).eq('actor_key',owner).eq('chapter',chapter).eq('version',existing.version);if(e)return json({ok:false,mesaj:'Tekrar turu açılamadı.'},503);const {data:r,error:er}=await read();return er||!r?json({ok:false,mesaj:'Durak yüklenemedi.'},503):json(view(r));}
    return json(view(existing));
   }
   const {data:r,error:err}=await db.from('papi_story_progress').upsert({actor_key:owner,student_id:a.role==='student'?a.student_id:null,teacher_id:a.role==='teacher'?a.teacher_id:null,chapter,cursor:0,completed:false,version:0,deck_version:useNewDeck()?2:1},{onConflict:'actor_key,chapter',ignoreDuplicates:true}).select('*').maybeSingle();
   if(err)return json({ok:false,mesaj:'Durak açılamadı.'},503);if(r)return json(view(r));const {data:f,error:fe}=await read();return fe||!f?json({ok:false,mesaj:'Durak tekrar yüklenmeli.'},503):json(view(f));
  }
  if(!existing)return json({ok:false,mesaj:'Önce durağı aç.'},409);
  if(existing.cursor>=stepsFor(chapter,existing).length)return json({...view(existing),correct:true,alreadyCompleted:true});
  if(Number(b.cursor)!==existing.cursor||Number(b.version)!==existing.version)return json({...view(existing),stale:true});
  const steps=stepsFor(chapter,existing),task=steps[existing.cursor];if(!task)return json({ok:false,mesaj:'Geçersiz adım.'},400);
  let correct=true;const question=existing.deck_version===2||['choice','listen','order'].includes(task.kind);
  if(existing.deck_version===2){const grade=storyV2Grade(task,b.answer);if(!grade.valid)return json({ok:false,mesaj:'Bu görev için geçerli bir cevap gönder.'},400);correct=grade.correct;}
  else if(['choice','listen'].includes(task.kind)){if(!Number.isInteger(b.answer)||b.answer<0||b.answer>=task.options.length)return json({ok:false,mesaj:'Bir seçenek seç.'},400);correct=b.answer===task.answer;}
  else if(task.kind==='order')correct=normStory(b.answer)===normStory(task.answer);
  else if(!['scene','teach'].includes(task.kind))return json({ok:false,mesaj:'İçerik güncellendi. Sayfayı yenile.'},400);
  const {data:r,error:err}=await db.rpc('dm_story_apply',{owner_key:owner,chapter_no:chapter,expected_cursor:existing.cursor,expected_version:existing.version,answer_correct:correct,is_question:question,step_count:steps.length,question_count:existing.deck_version===2?steps.length:steps.filter((t:any)=>['choice','listen','order'].includes(t.kind)).length});
  if(err)return json({ok:false,mesaj:'İlerlemen kaydedilemedi. Yeniden dene.'},503);
  if(!r.ok)return json(r,r.energyEmpty?409:503);
  return json({...view(r.progress),...r,progress:undefined,hint:correct?'':task.hint||task.en||''});
 }};
}
