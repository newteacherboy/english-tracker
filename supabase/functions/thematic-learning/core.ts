import DATA from './curriculum.json' with {type:'json'};
import './learning-core.js';
const CORE=(globalThis as any).DMLearningCore;
type DB={select:(table:string,params:any)=>Promise<any[]>,insert:(table:string,payload:any,ignore?:boolean)=>Promise<any[]>,update:(table:string,params:any,payload:any)=>Promise<any[]>,rpc:(name:string,payload:any)=>Promise<any>};
const chapters=DATA.chapters;
const safe=(r:any)=>({ok:true,chapter:r.chapter,cursor:r.cursor,completed:r.completed,finished:r.cursor>=10,version:r.version,replay:!!r.replay,mistakes:r.mistakes||0,reward:r.last_reward||{},deckVersion:5});
export function thematicHandler(db:DB){
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,authorization,apikey,x-diji-token','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const json=(d:any,status=200)=>new Response(JSON.stringify(d),{status,headers});
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  try{
   const raw=await req.text();if(raw.length>8192)return json({ok:false,mesaj:'İstek çok büyük.'},413);
   let b:any;try{b=JSON.parse(raw);}catch{return json({ok:false,mesaj:'Geçersiz istek.'},400);}
   if(!['status','open','advance'].includes(b.action))return json({ok:false,mesaj:'Geçersiz işlem.'},400);
   const token=String(b.t||'');if(!token||token.length>512)return json({ok:false,mesaj:'Öğrenme yoluna devam etmek için giriş yap.'},401);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const a=(await db.select('portal_sessions',{select:'student_id,teacher_id,role,expires_at',token_hash:'eq.'+hash,limit:'1'}))[0];
   if(!a||!['student','teacher'].includes(a.role)||!Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=Date.now())return json({ok:false,mesaj:'Oturumun sona erdi. Yeniden giriş yap.'},401);
   const student=a.role==='student',id=student?a.student_id:a.teacher_id;if(!id)return json({ok:false,mesaj:'Geçerli hesap gerekli.'},401);
   const person=(await db.select(student?'students':'teachers',{select:student?'id,status,role':'id,active',id:'eq.'+id,limit:'1'}))[0];
   if(!person||(student?(person.status!=='approved'||person.role!=='student'):person.active===false))return json({ok:false,mesaj:'Aktif hesap gerekli.'},403);
   const owner=(student?'s:':'t:')+id;
   let enrollment=(await db.select('dm_thematic_enrollment',{select:'inherited_count',actor_key:'eq.'+owner,limit:'1'}))[0];
   if(!enrollment){const old=await db.select('papi_story_progress',{select:'chapter',actor_key:'eq.'+owner,chapter:'lt.80',completed:'eq.true',limit:'80'});await db.insert('dm_thematic_enrollment',{actor_key:owner,student_id:student?id:null,teacher_id:student?null:id,inherited_count:old.length},true);enrollment=(await db.select('dm_thematic_enrollment',{select:'inherited_count',actor_key:'eq.'+owner,limit:'1'}))[0];}
   const inherited=Number(enrollment?.inherited_count||0);
   if(b.action==='status'){
    const rows=await db.select('papi_story_progress',{select:'chapter,cursor,completed,version',actor_key:'eq.'+owner,chapter:'gte.1000',order:'chapter',limit:'240'});
    const map=new Map(rows.map(r=>[r.chapter,r]));for(let i=0;i<inherited;i++){const r=map.get(1000+i);map.set(1000+i,{...(r||{chapter:1000+i,cursor:10,version:0}),completed:true,inherited:true});}
    return json({ok:true,version:5,progress:[...map.values()],inherited,total:240});
   }
   const n=Number(b.chapter),C=chapters[n-1000];if(!Number.isInteger(n)||!C||C.id!==n)return json({ok:false,mesaj:'Geçersiz bölüm.'},400);
   const filters={actor_key:'eq.'+owner,chapter:'eq.'+n};
   const read=async()=>(await db.select('papi_story_progress',{select:'*',...filters,limit:'1'}))[0];
   let record=await read();
   if(n>1000&&n-1000>inherited){const prev=(await db.select('papi_story_progress',{select:'completed',actor_key:'eq.'+owner,chapter:'eq.'+(n-1),limit:'1'}))[0];if(!prev?.completed)return json({ok:false,mesaj:'Önce bir önceki bölümü tamamla.'},403);}
   if(b.action==='open'){
    if(!record){await db.insert('papi_story_progress',{actor_key:owner,student_id:student?id:null,teacher_id:student?null:id,chapter:n,cursor:0,completed:false,reward_claimed:n-1000<inherited,replay:n-1000<inherited,version:0,deck_version:5},true);record=await read();}
    else if(record.cursor>=10){await db.update('papi_story_progress',{...filters,version:'eq.'+record.version},{cursor:0,replay:true,questions_seen:0,charged_cursor:-1,mistakes:0,last_reward:{},route_combo:0,version:record.version+1,updated_at:new Date().toISOString()});record=await read();}
    return record?json(safe(record)):json({ok:false,mesaj:'Bölüm açılamadı. Yeniden dene.'},503);
   }
   if(!record)return json({ok:false,mesaj:'Önce bölümü aç.'},409);
   if(record.cursor>=10)return json({...safe(record),alreadyCompleted:true,accepted:true,correct:true});
   if(!Number.isInteger(b.cursor)||!Number.isInteger(b.version)||b.cursor!==record.cursor||b.version!==record.version)return json({...safe(record),stale:true});
   const tasks=CORE.deck(C,chapters[n-1001]),task=tasks[record.cursor],grade=CORE.grade(task,b.answer);
   if(!grade.valid)return json({ok:false,mesaj:'Bu etkinlik için bir cevap seç.'},400);
   const r=await db.rpc('dm_story_apply',{owner_key:owner,chapter_no:n,expected_cursor:record.cursor,expected_version:record.version,answer_correct:grade.correct,is_question:task.kind!=='teach',step_count:10,question_count:9});
   if(!r.ok)return json(r,r.energyEmpty?409:503);
   return json({...safe(r.progress),...r,progress:undefined,accepted:r.correct===true,explanation:grade.correct?task.explanation||'Öğrenmeye devam!':'Bir daha deneyelim. Kartları tekrar dinleyebilirsin.'});
  }catch(e){console.error('[thematic-learning]',String((e as any)?.message||e));return json({ok:false,mesaj:'Öğrenme yolu şu anda kaydedilemedi. Aynı adımdan yeniden deneyebilirsin.'},503);}
 };
}
