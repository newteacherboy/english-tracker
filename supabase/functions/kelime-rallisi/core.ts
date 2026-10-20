/* Isolated race API; portal sessions and all wallet writes remain server-owned. */
type DB={select:(table:string,params:Record<string,string>)=>Promise<any[]>,rpc:(name:string,body:any)=>Promise<any>};
const normalize=(v:string)=>v.trim().toLocaleLowerCase('tr').replace(/\s+/g,' ');
export function buildRaceDeck(rows:any[],previous:any[]=[]){
 const seen=new Set<string>(),words=rows.map(r=>({en:String(r.english||'').trim(),tr:String(r.turkish||'').trim()})).filter(w=>{const k=w.en.toLocaleLowerCase('en');if(!w.en||!w.tr||w.en.length>48||w.tr.length>90||seen.has(k))return false;seen.add(k);return true;});
 if(words.length<15)throw Error('Seçtiğin ünitelerde en az 15 farklı kelime gerekli. Bir ünite daha seç.');
 const shuffle=<T>(items:T[])=>{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const counts=new Map<string,number>();for(const run of previous)for(const w of run.deck||[])counts.set(w.en,(counts.get(w.en)||0)+1);
 const selected=shuffle(words).sort((a,b)=>(counts.get(a.en)||0)-(counts.get(b.en)||0)).slice(0,15);
 return selected.map((w,i)=>{
  const direction=i%2?'tr-en':'en-tr',field=direction==='en-tr'?'tr':'en',answer=w[field];
  const parts=(s:string)=>normalize(s).split(/[,;/]/).map(x=>x.trim());
  const labels=new Set([normalize(answer)]),wrong=shuffle(words).filter(x=>{const label=x[field],k=normalize(label);if(labels.has(k)||parts(label).some(p=>parts(answer).includes(p)))return false;labels.add(k);return true;}).slice(0,2).map(x=>x[field]);
  if(wrong.length<2)throw Error('Bu ünitelerde üç farklı anlam seçeneği oluşmadı. Başka bir ünite daha seç.');
  const options=shuffle([answer,...wrong]);return {...w,word:direction==='en-tr'?w.en:w.tr,direction,options,answer:options.indexOf(answer)};
 });
}
export function publicRace(row:any){const {deck,...safe}=row;const index=Number(row.state?.index||0);return {ok:true,runId:row.id,totalQuestions:deck.length,classNo:row.class_no,units:row.units,difficulty:row.difficulty,finished:row.status==='finished',state:row.state,reward:row.reward,question:row.status==='playing'&&deck[index]?{word:deck[index].word,direction:deck[index].direction,options:deck[index].options}:null};}
// Keep stored decks compatible with existing races; expose exactly two safe choices to v2 clients.
export function twoChoiceLanes(q:any){const wrong=[0,1,2].filter(i=>i!==q.answer);const omit=wrong[(q.word.length+q.en.length)%wrong.length];return [0,1,2].filter(i=>i!==omit);}
export function twoChoiceQuestion(q:any){if(!q)return null;return {word:q.word,direction:q.direction,options:twoChoiceLanes(q).map(i=>q.options[i])};}
export function twoChoiceRace(row:any,data:any){const i=Number(data.state?.index||0);return {...data,question:data.finished?null:twoChoiceQuestion(row.deck[i]),nextQuestion:data.finished?null:twoChoiceQuestion(row.deck[i+1])};}
export function raceHandler(db:DB){
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-diji-token,authorization,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
 const json=(d:any,status=200)=>new Response(JSON.stringify(d),{status,headers});
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  try{
   const raw=await req.text();if(raw.length>8192)return json({ok:false,mesaj:'İstek çok büyük.'},413);let b:any;try{b=JSON.parse(raw);}catch{return json({ok:false,mesaj:'Geçersiz istek.'},400);}
   const token=String(b.t||req.headers.get('x-diji-token')||'');if(!token||token.length>512)return json({ok:false,mesaj:'Öğrenci hesabına giriş yap.'},401);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const sessions=await db.select('portal_sessions',{select:'student_id,teacher_id,role,expires_at',token_hash:'eq.'+hash,limit:'1'}),a=sessions[0];
   if(!a||!['student','teacher'].includes(a.role)||!Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=Date.now())return json({ok:false,mesaj:'Geçerli oturum gerekli.'},401);
   const teacher=a.role==='teacher';let student:any;
   if(teacher){
    const rows=a.teacher_id?await db.select('teachers',{select:'id,active',id:'eq.'+a.teacher_id,limit:'1'}):[];
    if(!rows[0]||rows[0].active===false)return json({ok:false,mesaj:'Aktif öğretmen hesabı gerekli.'},403);
    if(!['setup','practice'].includes(String(b.action||'')))return json({ok:false,mesaj:'Öğretmen hesabı deneme modunu kullanabilir.'},403);
    student={class_no:1};
   }else{
    if(!a.student_id)return json({ok:false,mesaj:'Öğrenci oturumu gerekli.'},401);
    const rows=await db.select('students',{select:'id,username,status,role,class_no,selected_class',id:'eq.'+a.student_id,limit:'1'});student=rows[0];
    if(!student||student.status!=='approved'||student.role!=='student')return json({ok:false,mesaj:'Aktif öğrenci hesabı gerekli.'},403);
    const balances=await db.select('extra_data',{select:'value',student_id:'eq.'+student.id,key_name:'eq.yo',limit:'1'});
    const level=await db.rpc('dm_student_level',{x:Number(balances[0]?.value?.totalXp||0)});
    if(Number(level)<15)return json({ok:false,mesaj:'Kelime Rallisi 15. seviyede açılır.'},403);
    if(b.action==='practice')return json({ok:false,mesaj:'Öğretmen hesabı gerekli.'},403);
   }
   const op=String(b.action||''),cls=Number(b.classNo||student.selected_class||student.class_no||1),units=Array.isArray(b.units)?[...new Set(b.units.map(Number))].sort((x:any,y:any)=>x-y):[];
   if(['setup','start','practice','ranking'].includes(op)&&(!Number.isInteger(cls)||cls<1||cls>8))return json({ok:false,mesaj:'1–8 arasında sınıf seç.'},400);
   if(['start','practice','ranking'].includes(op)&&(units.length<1||units.length>10||units.some((x:any)=>!Number.isInteger(x)||x<1||x>100)))return json({ok:false,mesaj:'En az bir ünite seç.'},400);
   if(op==='setup'){
    const rows=await db.select('word_bank',{select:'unit_no,english,turkish',active:'eq.true',class_no:'eq.'+cls,limit:'6000'}),counts=new Map<number,Set<string>>();
    for(const w of rows){if(!w.english||!w.turkish)continue;const n=Number(w.unit_no);if(!counts.has(n))counts.set(n,new Set());counts.get(n)!.add(String(w.english).toLowerCase());}
    return json({ok:true,classNo:cls,units:[...counts].sort(([a],[b])=>a-b).map(([id,set])=>({id,count:set.size}))});
   }
   if(op==='practice'){
    const flags=await db.select('dm_release_flags',{select:'code,enabled',code:'in.(aktiviteler,tek_kisilik,oyun_ralli)'});if(flags.some(f=>f.enabled===false))return json({ok:false,mesaj:'Kelime Rallisi şu anda kapalı.'},403);
    const rows=await db.select('word_bank',{select:'english,turkish',active:'eq.true',class_no:'eq.'+cls,unit_no:'in.('+units.join(',')+')',limit:'6000'});
    const deck=buildRaceDeck(rows).map(q=>{if(!b.twoChoices)return q;const lanes=twoChoiceLanes(q);return {...q,options:lanes.map(i=>q.options[i]),answer:lanes.indexOf(q.answer)};});return json({ok:true,practice:true,deck,classNo:cls,units,difficulty:['easy','normal','hard'].includes(b.difficulty)?b.difficulty:'normal'});
   }
   if(op==='ranking'){
    const rows=await db.select('dm_rally_runs',{select:'student_id,state,finished_at',status:'eq.finished',student_id:'neq.dcde2026-1015-4000-8000-000000000001',class_no:'eq.'+cls,units:'eq.{'+units.join(',')+'}',order:'finished_at.desc',limit:'1000'});
    const best=new Map();for(const r of rows){const old=best.get(r.student_id);if(!old||Number(r.state.score)>Number(old.state.score))best.set(r.student_id,r);}
    const selected=[...best.values()].sort((a,b)=>b.state.score-a.state.score||Number(a.state.elapsed)-Number(b.state.elapsed)).slice(0,20);
    const names=selected.length?await db.select('students',{select:'id,username',id:'in.('+selected.map(x=>x.student_id).join(',')+')',status:'eq.approved'}):[];
    return json({ok:true,liste:selected.filter(x=>names.some(n=>n.id===x.student_id)).map((r,i)=>({rank:i+1,name:names.find(n=>n.id===r.student_id)?.username,score:r.state.score,correct:r.state.correct,wrong:r.state.wrong,mine:r.student_id===student.id}))});
   }
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(b.runId||'')))return json({ok:false,mesaj:'Geçersiz yarış kimliği.'},400);
   const view=async(data:any)=>{if(!b.twoChoices)return data;const rows=await db.select('dm_rally_runs',{select:'*',id:'eq.'+b.runId,student_id:'eq.'+student.id,limit:'1'});if(!rows[0])throw Error('Yarış bulunamadı.');return twoChoiceRace(rows[0],data);};
   if(op==='start'){
    const flags=await db.select('dm_release_flags',{select:'code,enabled',code:'in.(aktiviteler,tek_kisilik,oyun_ralli)'});if(flags.some(f=>f.enabled===false))return json({ok:false,mesaj:'Kelime Rallisi şu anda kapalı.'},403);
    const existing=await db.select('dm_rally_runs',{select:'*',id:'eq.'+b.runId,student_id:'eq.'+student.id,limit:'1'});if(existing[0])return json(b.twoChoices?twoChoiceRace(existing[0],publicRace(existing[0])):publicRace(existing[0]));
    const difficulty=['easy','normal','hard'].includes(b.difficulty)?b.difficulty:'normal';
    const rows=await db.select('word_bank',{select:'english,turkish',active:'eq.true',class_no:'eq.'+cls,unit_no:'in.('+units.join(',')+')',limit:'6000'});
    const previous=await db.select('dm_rally_runs',{select:'deck',student_id:'eq.'+student.id,class_no:'eq.'+cls,order:'created_at.desc',limit:'50'});
    return json(await view(await db.rpc('dm_rally_start',{actor:student.id,run_key:b.runId,class_id:cls,unit_ids:units,question_deck:buildRaceDeck(rows,previous),pace:difficulty})));
   }
   if(op==='state'){const rows=await db.select('dm_rally_runs',{select:'*',id:'eq.'+b.runId,student_id:'eq.'+student.id,limit:'1'});return rows[0]?json(b.twoChoices?twoChoiceRace(rows[0],publicRace(rows[0])):publicRace(rows[0])):json({ok:false,mesaj:'Yarış bulunamadı.'},404);}
   if(op==='answer'){
    if(!Number.isInteger(b.round)||b.round<0||b.round>14||!Number.isInteger(b.lane)||b.lane<0||b.lane>2)return json({ok:false,mesaj:'Geçerli kelime kapısını seç.'},400);
    let lane=b.lane;if(b.twoChoices){if(lane>1)return json({ok:false,mesaj:'İki kapıdan birini seç.'},400);const rows=await db.select('dm_rally_runs',{select:'*',id:'eq.'+b.runId,student_id:'eq.'+student.id,limit:'1'});if(!rows[0]?.deck[b.round])return json({ok:false,mesaj:'Yarış bulunamadı.'},404);lane=twoChoiceLanes(rows[0].deck[b.round])[lane];}
    // slow: the learner slowed the road for this question; the database pays less for it.
    return json(await view(await db.rpc('dm_rally_answer',{actor:student.id,run_key:b.runId,round_no:b.round,lane,...(b.slow===true?{slowed:true}:{})})));
   }
   if(op==='finish')return json(await db.rpc('dm_rally_finish',{actor:student.id,run_key:b.runId}));
   return json({ok:false,mesaj:'Geçersiz yarış işlemi.'},400);
  }catch(e){const message=String((e as any)?.message||'');const known=/enerji|seviyede|kelime|ünite|kapısına|yarış.*bulunamadı|kısa bir süre|hesap bilgileri/i.test(message);return json({ok:false,mesaj:known?message:'Yarış bağlantısı tamamlanamadı. Tekrar dene.'},known?400:503);}
 };
}
