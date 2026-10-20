import DATA from './curriculum.json' with {type:'json'};
import './learning-core.js';
import './thematic-v8-candidate.js';
import {computeStartPath,thematicChapterProblem,learningTestValid} from './start-path.mjs';
const CORE=(globalThis as any).DMLearningCore;
const V8=(globalThis as any).DMThematicV8Candidate;
type DB={select:(table:string,params:any)=>Promise<any[]>,insert:(table:string,payload:any,ignore?:boolean)=>Promise<any[]>,update:(table:string,params:any,payload:any)=>Promise<any[]>,rpc:(name:string,payload:any)=>Promise<any>};
const chapters=DATA.chapters;
const stepCount=(v:number)=>v===8?14:v>=7?12:v===6?11:10;
// Three new translation prompts from the same chapter; not repeats of the 11 lesson tasks.
const recoveryTask=(chapter:any,step:number)=>{
 const card=chapter.cards[step],options=[...new Set(chapter.cards.map((c:any)=>c.en))];
 if(!card||options.length<2)throw Error('Pekiştirme kartları yüklenemedi');
 return {kind:'choice',label:'Pekiştirme '+(step+1)+'/3',prompt:card.tr,
    support:'Doğru İngilizce ifadeyi seç.',options,answer:card.en};
};
const recoveryView=(chapter:any,step:number)=>{const q=recoveryTask(chapter,step);return {step,total:3,label:q.label,prompt:q.prompt,support:q.support,options:q.options};};
const safe=(r:any)=>({ok:true,chapter:r.chapter,cursor:r.cursor,completed:r.completed,finished:r.cursor>=stepCount(r.deck_version),version:r.version,replay:!!r.replay,mistakes:r.mistakes||0,combo:Number(r.route_combo||0),reward:r.last_reward||{},deckVersion:r.deck_version||5});
export function thematicHandler(db:DB){
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,authorization,apikey,x-diji-token','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const json=(d:any,status=200)=>new Response(JSON.stringify(d),{status,headers});
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  try{
   const raw=await req.text();if(raw.length>8192)return json({ok:false,mesaj:'İstek çok büyük.'},413);
   let b:any;try{b=JSON.parse(raw);}catch{return json({ok:false,mesaj:'Geçersiz istek.'},400);}
   if(!['status','open','advance','recover'].includes(b.action))return json({ok:false,mesaj:'Geçersiz işlem.'},400);
   const token=String(b.t||'');if(!token||token.length>512)return json({ok:false,mesaj:'Öğrenme yoluna devam etmek için giriş yap.'},401);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const a=(await db.select('portal_sessions',{select:'student_id,teacher_id,role,expires_at',token_hash:'eq.'+hash,limit:'1'}))[0];
   if(!a||!['student','teacher'].includes(a.role)||!Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=Date.now())return json({ok:false,mesaj:'Oturumun sona erdi. Yeniden giriş yap.'},401);
   const student=a.role==='student',id=student?a.student_id:a.teacher_id;if(!id)return json({ok:false,mesaj:'Geçerli hesap gerekli.'},401);
   const person=(await db.select(student?'students':'teachers',{select:student?'id,status,role,energy,energy_max,energy_updated_at':'id,active',id:'eq.'+id,limit:'1'}))[0];
   if(!person||(student?(person.status!=='approved'||person.role!=='student'):person.active===false))return json({ok:false,mesaj:'Aktif hesap gerekli.'},403);
   const owner=(student?'s:':'t:')+id;
   const balance=async(p:any={})=>{
    if(!student)return {energy:null,energyMax:30,gold:null,combo:Number(p.route_combo||0)};
    const s=(await db.select('students',{select:'energy,energy_max,energy_updated_at',id:'eq.'+id,limit:'1'}))[0]||person;
    const cap=Number(s.energy_max||30),stored=Number(s.energy??30),since=Date.parse(s.energy_updated_at||'');
    const regen=Number.isFinite(since)?Math.max(0,Math.floor((Date.now()-since)/900000)):0;
    const yo=(await db.select('extra_data',{select:'value',student_id:'eq.'+id,key_name:'eq.yo',limit:'1'}))[0]?.value;
    return {energy:stored>=cap?stored:Math.min(cap,stored+regen),energyMax:cap,gold:Number(yo?.altin||0),combo:Number(p.route_combo||0)};
   };
   let enrollment=(await db.select('dm_thematic_enrollment',{select:'inherited_count',actor_key:'eq.'+owner,limit:'1'}))[0];
   if(!enrollment){const old=await db.select('papi_story_progress',{select:'chapter',actor_key:'eq.'+owner,chapter:'lt.80',completed:'eq.true',limit:'80'});await db.insert('dm_thematic_enrollment',{actor_key:owner,student_id:student?id:null,teacher_id:student?null:id,inherited_count:old.length},true);enrollment=(await db.select('dm_thematic_enrollment',{select:'inherited_count',actor_key:'eq.'+owner,limit:'1'}))[0];}
   const inherited=Number(enrollment?.inherited_count||0);
   // Where this learner may enter the route: lower CEFR levels open, higher ones locked (start-path.mjs).
   const access=async()=>{
    const rows=await db.select('papi_story_progress',{select:'chapter,completed',actor_key:'eq.'+owner,chapter:'gte.1000',limit:'1000'});
    const done=new Set(rows.filter((r:any)=>r.completed).map((r:any)=>Number(r.chapter)));for(let i=0;i<inherited;i++)done.add(1000+i);
    if(!student)return {path:{legacy:true,mode:'open',startCefr:'A1',maxCefr:'B2'},done};
    const extra=await db.select('extra_data',{select:'key_name,value',student_id:'eq.'+id,key_name:'in.(learner_profile_v1,placement_start_v1,start_point_v1)'});
    const value=(k:string)=>extra.find((r:any)=>r.key_name===k)?.value;
    const cls=(await db.select('students',{select:'class_no',id:'eq.'+id,limit:'1'}))[0]?.class_no;
    let ctx:any={};try{ctx=await db.rpc('dm_progress_context',{actor:id})||{};}catch{ctx={};}
    const levelOf=(n:number)=>chapters.find((c:any)=>c.id===n)?.cefr;
    const thematic={played:[...new Set([...rows.map((r:any)=>levelOf(Number(r.chapter))).filter(Boolean),...(inherited>0?['A1']:[])])],complete:Object.fromEntries(['A1','A2','B1','B2'].map(c=>[c,chapters.filter((x:any)=>x.cefr===c).every((x:any)=>done.has(x.id))]))};
    return {path:computeStartPath({profile:value('learner_profile_v1'),classNo:cls,placement:value('placement_start_v1'),choice:value('start_point_v1'),lessons:ctx.lessons,done:ctx.done,units:ctx.units,thematic}),done};
   };
   if(b.action==='status'){
    const rows=await db.select('papi_story_progress',{select:'chapter,cursor,completed,version',actor_key:'eq.'+owner,chapter:'gte.1000',order:'chapter',limit:String(chapters.length)});
    const map=new Map(rows.map(r=>[r.chapter,r]));for(let i=0;i<inherited;i++){const r=map.get(1000+i);map.set(1000+i,{...(r||{chapter:1000+i,cursor:10,version:0}),completed:true,inherited:true});}
    const {path}=await access();
    return json({ok:true,version:5,progress:[...map.values()],inherited,total:chapters.length,wallet:await balance(),access:{legacy:!!path.legacy,startCefr:path.startCefr,maxCefr:path.maxCefr,learningRoute:path.learningRoute||'open'}});
   }
   const n=Number(b.chapter),C=chapters.find(c=>c.id===n);if(!Number.isInteger(n)||!C||C.id!==n)return json({ok:false,mesaj:'Geçersiz bölüm.'},400);
   // V8 can only be enabled after the atomic first-attempt/reward RPC migration.
   const v8Enabled=typeof Deno==='undefined'||Deno.env.get('DM_THEMATIC_V8_ENABLED')!=='false';
   if(b.deckVersion===8&&!v8Enabled)return json({ok:false,mesaj:'Yeni öğrenme sürümü henüz kullanıma açılmadı.'},409);
   const requestedVersion=b.deckVersion===8?8:b.deckVersion===7?7:b.deckVersion===6?6:5;
   const filters={actor_key:'eq.'+owner,chapter:'eq.'+n};
   const read=async()=>(await db.select('papi_story_progress',{select:'*',...filters,limit:'1'}))[0];
   const recoveryStatus=async()=> (await db.select('dm_thematic_recovery',{select:'step,completed',actor_key:'eq.'+owner,chapter:'eq.'+n,limit:'1'}))[0];
   const withRecovery=async(p:any)=>{
    const rec=await recoveryStatus();
    return rec&&!rec.completed&&!p.completed&&!p.replay?{...safe(p),needsRecovery:true,recovery:recoveryView(C,Number(rec.step))}:safe(p);
   };
   let record=await read();
   // Already opened runs may resume; a new run needs an open CEFR level and, inside it, the previous stop.
   // The starting-test requirement also covers chapters opened before the rule (cheap check on every step).
   if(student){const cls=Number((await db.select('students',{select:'class_no',id:'eq.'+id,limit:'1'}))[0]?.class_no);
    if(Number.isInteger(cls)&&cls>=1&&cls<=8){const test=(await db.select('extra_data',{select:'value',student_id:'eq.'+id,key_name:'eq.placement_start_v1',limit:'1'}))[0]?.value;
     if(!learningTestValid(test))return json({ok:false,needsTest:true,mesaj:'Öğrenme Yolu için önce 24 soruluk seviye testini çöz. Okul Yolum’da sınıfından devam edebilirsin.'},403);}}
   if(!record&&n-1000>=inherited){const {path,done}=await access();const problem=thematicChapterProblem(path,chapters,n,(x:number)=>done.has(x));if(problem)return json({ok:false,mesaj:problem},403);}
   if(b.action==='open'){
    if(!record){await db.insert('papi_story_progress',{actor_key:owner,student_id:student?id:null,teacher_id:student?null:id,chapter:n,cursor:0,completed:false,reward_claimed:n-1000<inherited,replay:n-1000<inherited,version:0,deck_version:requestedVersion},true);record=await read();}
    else if(record.cursor>=stepCount(record.deck_version)){await db.update('papi_story_progress',{...filters,version:'eq.'+record.version},{cursor:0,deck_version:requestedVersion,replay:true,questions_seen:0,charged_cursor:-1,mistakes:0,last_reward:{},route_combo:0,version:record.version+1,updated_at:new Date().toISOString()});record=await read();}
    // Preserve the meaning of a partially answered deck. Upgrade only before its first step.
    if(record&&record.cursor===0&&requestedVersion>=6&&requestedVersion>(record.deck_version||5)){await db.update('papi_story_progress',{...filters,version:'eq.'+record.version},{deck_version:requestedVersion,version:record.version+1});record=await read();}
    return record?json({...await withRecovery(record),wallet:await balance(record)}):json({ok:false,mesaj:'Bölüm açılamadı. Yeniden dene.'},503);
   }
   if(!record)return json({ok:false,mesaj:'Önce bölümü aç.'},409);
   if((record.deck_version||5)!==requestedVersion)return json({ok:false,mesaj:'Öğrenme yolunu güncellemek için uygulamayı yenile.'},409);
   const steps=stepCount(requestedVersion);
   if(record.cursor>=steps)return json({...safe(record),alreadyCompleted:true,accepted:true,correct:true,wallet:await balance(record)});
   if(b.action==='recover'){
     if(!Number.isInteger(b.version)||b.version!==record.version)return json({...await withRecovery(record),stale:true,wallet:await balance(record)});
     const rec=await recoveryStatus();
     if(!rec||rec.completed||record.completed||record.replay||record.cursor!==stepCount(record.deck_version)-1)return json({ok:false,mesaj:'Bu bölümde pekiştirme açık değil.'},409);
     const step=Number(rec.step);
     if(!Number.isInteger(b.step)||b.step!==step)return json({...await withRecovery(record),stale:true,wallet:await balance(record)});
     const q=recoveryTask(C,step),grade=CORE.grade(q,b.answer);
     if(!grade.valid)return json({ok:false,mesaj:'Pekiştirme için bir cevap seç.'},400);
     const response=await db.rpc('dm_thematic_recovery_answer',{owner_key:owner,chapter_no:n,
      expected_version:record.version,expected_step:step,answer_correct:grade.correct});
     if(!response.ok)return json(response,503);
     const out={...safe(response.progress),...response,progress:undefined,wallet:await balance(response.progress)};
     if(response.needsRecovery)out.recovery=recoveryView(C,Number(response.recovery.step));
     return json(out);
   }
   if(!Number.isInteger(b.cursor)||!Number.isInteger(b.version)||b.cursor!==record.cursor||b.version!==record.version)return json({...await withRecovery(record),stale:true,wallet:await balance(record)});
   const recovery=await recoveryStatus();
   if(recovery&&!recovery.completed&&!record.completed&&!record.replay)return json({...await withRecovery(record),stale:true,wallet:await balance(record)});
   const tasks=requestedVersion===8?V8.build(C,chapters.find(c=>c.id===C.previousId)):CORE.deck(C,chapters.find(c=>c.id===C.previousId),requestedVersion),task=tasks[record.cursor],grade=CORE.grade(task,b.answer);
   if(!grade.valid)return json({ok:false,mesaj:'Bu etkinlik için bir cevap seç.'},400);
   // The first-answer migration is installed and verified. This records only
   // the original graded attempt; old reward and progress transactions are unchanged.
   // Emergency opt-out: DM_THEMATIC_FIRST_ATTEMPT_LEDGER=false.
   const firstTryEnabled=typeof Deno==='undefined'||Deno.env.get('DM_THEMATIC_FIRST_ATTEMPT_LEDGER')!=='false';
   const r=await db.rpc(firstTryEnabled?'dm_thematic_fair_step':'dm_story_apply',{owner_key:owner,chapter_no:n,expected_cursor:record.cursor,expected_version:record.version,answer_correct:grade.correct,is_question:task.kind!=='teach',step_count:steps,question_count:requestedVersion===8?10:steps-1,combo_correct:task.kind==='review'?grade.allCorrect:grade.correct});
   if(!r.ok)return json(r,r.energyEmpty?409:503);
   return json({...safe(r.progress),...r,progress:undefined,wallet:await balance(r.progress),
    ...(r.needsRecovery?{recovery:recoveryView(C,Number(r.recovery?.step||0))}:{}),
    accepted:r.correct===true,explanation:r.needsRecovery?'Kısa pekiştirme ile devam edelim.':grade.correct?task.explanation||'Öğrenmeye devam!':'Bir daha deneyelim. Kartları tekrar dinleyebilirsin.'});
  }catch(e){console.error('[thematic-learning]',String((e as any)?.message||e));return json({ok:false,mesaj:'Öğrenme yolu şu anda kaydedilemedi. Aynı adımdan yeniden deneyebilirsin.'},503);}
 };
}
