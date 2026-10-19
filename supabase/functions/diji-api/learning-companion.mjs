import './learning-dialogues.js';
import {due,reviewStats} from './review-schedule.mjs';
const BANK=globalThis.DMLearningDialogues;
export const companionOps=new Set(['companionSummary','companionDialogueOpen','companionDialogueAnswer','companionPlanStep','teacherLearningSummary']);
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{};}catch{return {};}};
const day=now=>new Date(now+10800000).toISOString().slice(0,10);
const norm=v=>String(v||'').normalize('NFKC').toLocaleLowerCase('en').replace(/[.,!?]+$/,'').trim();
export function learningCompanionAPI({db,json,teacherScope,now=Date.now}){
  const fail=(mesaj,status=400)=>json({ok:false,mesaj},status);
  async function get(sid,key){const r=await db.from('extra_data').select('key_name,value,updated_at').eq('student_id',sid).eq('key_name',key).maybeSingle();if(r.error)throw r.error;return r.data;}
  async function reviews(ids){const rows=[];for(let offset=0;offset<10000;offset+=1000){const r=await db.from('extra_data').select('student_id,key_name,value,updated_at').in('student_id',ids).like('key_name','review_word:%').order('id').range(offset,offset+999);if(r.error)throw r.error;rows.push(...r.data||[]);if((r.data||[]).length<1000)return {rows,limited:false};}return {rows,limited:true};}
  return {async handle(op,b,a,method){
    if(!companionOps.has(op))return null;
    if(method!=='POST')return fail('POST gerekli.',405);
    if(!a)return fail('Önce giriş yap.',401);
    if(op==='teacherLearningSummary'){
      if(a.role!=='teacher'||!a.teacher_id)return fail('Öğretmen oturumu gerekli.',403);
      let query=db.from('students').select('id,username,class_no,branch,teacher_id').eq('status','approved').eq('role','student');
      if(!a.yonetici)query=query.eq('teacher_id',a.teacher_id);
      const r=await query.order('id').limit(500);if(r.error)throw r.error;
      const pupils=(r.data||[]).filter(s=>s.username!=='dijimedu_demo'&&teacherScope(a,s));
      const ids=pupils.map(s=>s.id);if(!ids.length)return json({ok:true,classes:[],pupils:[],weak:[]});
      const {rows,limited}=await reviews(ids),groups=new Map();
      for(const row of rows){const w=parse(row.value);if(!w.en||!w.tr||w.streak>=2&&!due(w,now()))continue;
        const s=pupils.find(s=>s.id===row.student_id);if(!s)continue;
        const key=[s.class_no,s.branch,norm(w.en)].join('|');let x=groups.get(key);if(!x){x={en:w.en,tr:w.tr,classNo:s.class_no,branch:s.branch||'',students:new Set()};groups.set(key,x);}x.students.add(s.id);
      }
      const classes=[...new Map(pupils.map(s=>[[s.class_no,s.branch].join('|'),{classNo:s.class_no,branch:s.branch||''}])).values()];
      return json({ok:true,limited,classes,pupils:pupils.map(s=>({name:s.username,classNo:s.class_no,branch:s.branch||'',needsReview:rows.some(r=>r.student_id===s.id&&due(parse(r.value),now()))})),weak:[...groups.values()].map(x=>({...x,students:x.students.size})).sort((x,y)=>y.students-x.students).slice(0,100)});
    }
    if(a.role!=='student'||!a.student_id)return fail('Öğrenci oturumu gerekli.',403);
    const sid=a.student_id,stamp=now(),today=day(stamp),iso=new Date(stamp).toISOString();
    if(op==='companionSummary'){
      const [r,stories,plan,missions]=await Promise.all([
        reviews([sid]),db.from('extra_data').select('key_name,value,updated_at').eq('student_id',sid).like('key_name','practice_dialogue:%').order('updated_at',{ascending:false}).limit(100),get(sid,'practice_plan:'+today),db.rpc('dm_mission_summary',{actor:sid})
      ]);if(stories.error)throw stories.error;if(missions.error)throw missions.error;
      const words=r.rows.map(x=>({id:x.key_name,...parse(x.value),version:x.updated_at}));
      const skills={reading:{correct:0,total:0},listening:{correct:0,total:0},writing:{correct:0,total:0}};
      for(const row of stories.data||[])for(const answer of Object.values(parse(row.value).answers||{})){if(skills[answer.skill]){skills[answer.skill].total++;skills[answer.skill].correct+=Number(answer.correct);}}
      return json({ok:true,day:today,missions:missions.data,limited:r.limited,review:reviewStats(r.rows,stamp),skills,
        reviewDone:!words.some(w=>due(w,stamp))||words.filter(w=>w.lastReviewedAt&&day(Date.parse(w.lastReviewedAt))===today).length>=3,
        dialogueDone:(stories.data||[]).some(x=>x.key_name.endsWith(':'+today)&&parse(x.value).cursor>=3),
        routeDone:!!parse(plan?.value).route,
        dialogueIds:(stories.data||[]).filter(x=>parse(x.value).cursor>=3).map(x=>x.key_name.split(':')[1]),
        nextWords:words.filter(w=>due(w,stamp)).slice(0,3).map(w=>({en:w.en,tr:w.tr}))});
    }
    if(op==='companionPlanStep'){
      if(b.step!=='route')return fail('Geçersiz adım.');
      const r=await db.from('extra_data').upsert({student_id:sid,key_name:'practice_plan:'+today,value:{route:true},updated_at:iso},{onConflict:'student_id,key_name',ignoreDuplicates:true});if(r.error)throw r.error;
      return json({ok:true}); // A planner checkbox, never a reward or proficiency record.
    }
    const story=BANK.find(s=>s.id===b.story);if(!story)return fail('Diyalog bulunamadı.',404);
    const key='practice_dialogue:'+story.id+':'+today;
    if(op==='companionDialogueOpen'){
      const r=await db.from('extra_data').upsert({student_id:sid,key_name:key,value:{cursor:0,answers:{}},updated_at:iso},{onConflict:'student_id,key_name',ignoreDuplicates:true});if(r.error)throw r.error;
      const record=await get(sid,key);return json({ok:true,...parse(record.value),version:record.updated_at});
    }
    const record=await get(sid,key);if(!record)return fail('Önce diyaloğu aç.');
    const state=parse(record.value),index=Number(b.index),q=story.questions[index];
    if(!Number.isInteger(index)||!q||String(b.answer||'').length>180)return fail('Geçersiz cevap.');
    if(state.answers?.[index])return json({ok:true,...state.answers[index],cursor:state.cursor,version:record.updated_at,repeated:true});
    if(index!==state.cursor||b.version!==record.updated_at)return fail('İlerlemen başka ekranda değişti; diyaloğu yeniden aç.',409);
    const answer=String(b.answer||'').trim();if(!answer||(q.options&&!q.options.includes(answer)))return fail('Bir cevap seç.');
    const skill=q.skill==='listening'&&b.audioPlayed!==true?'reading':q.skill;
    const correct=(q.answers||[q.answer]).some(x=>norm(x)===norm(answer));
    const result={correct,skill,answer:q.answer,explanation:q.explanation};
    const value={...state,cursor:index+1,answers:{...state.answers,[index]:result}};
    const updated=new Date(Math.max(stamp,Date.parse(record.updated_at)+1)).toISOString();
    const r=await db.from('extra_data').update({value,updated_at:updated}).eq('student_id',sid).eq('key_name',key).eq('updated_at',record.updated_at).select('key_name,updated_at');if(r.error)throw r.error;
    if(!r.data?.length)return fail('İlerlemen başka ekranda değişti; diyaloğu yeniden aç.',409);
    return json({ok:true,...result,cursor:index+1,version:r.data[0].updated_at});
  }};
}
