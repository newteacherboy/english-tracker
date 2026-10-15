import { selectWordBankRound } from './word-bank-rotation.ts';
const shuffle=(list:any[])=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clean=(s:any)=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40);
const norm=(s:any)=>String(s||'').trim().toLocaleLowerCase('tr').replace(/\s+/g,' ');
export function meteorAPI(db:any,json:any){
 const actor=(a:any)=>a?.role==='student'&&a.student_id?'s:'+a.student_id:a?.role==='teacher'&&a.teacher_id?'t:'+a.teacher_id:'';
 const view=(r:any)=>{const s=r.state;
  const question=(n:number,round:number)=>{const w=r.deck[n];return r.status==='playing'&&w?{round,word:w.word,options:w.options,direction:w.direction}:null;};
  if(s.independent){const players=s.players.map((p:any)=>({...p,attempts:undefined,order:undefined,total:p.order.length,finished:p.index>=p.order.length,question:question(p.order[p.index],p.index)}));return {ok:true,runId:r.id,sinif:r.class_no,unite:r.unit_no,mode:r.mode,independent:true,players,index:Math.min(...players.map((p:any)=>p.index)),total:players[0].total,finished:r.status==='finished',last:s.last||null,question:players[0].question};}
  return {ok:true,runId:r.id,sinif:r.class_no,unite:r.unit_no,mode:r.mode,players:s.players,index:s.index,total:r.deck.length,finished:r.status==='finished',last:s.last||null,question:question(s.index,s.index)};
 };
 async function update(r:any,state:any,status=r.status){const {data,error}=await db.from('papi_meteor_sessions').update({state,status,version:r.version+1,best_score:Math.max(...state.players.map((p:any)=>p.score))}).eq('id',r.id).eq('actor_key',r.actor_key).eq('version',r.version).select('id');if(error)return json({ok:false,mesaj:'Sonuç kaydedilemedi. Tekrar dene.'},503);if(!data?.length)return json({ok:false,mesaj:'Oyun değişti. Güncel soru yükleniyor.'},409);return json(view({...r,state,status}));}
 return {async handle(op:string,b:any,q:URLSearchParams,a:any,method:string){
  if(!['meteorBaslat','meteorCevap','meteorBitir','meteorDurum','meteorSiralama'].includes(op))return null;
  const owner=actor(a);if(!owner)return json({ok:false,hata:'oturum',mesaj:'Oyuna başlamak için giriş yapmalısın.'},401);
  if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  if(op==='meteorBaslat'||op==='meteorSiralama'){
   const cls=Number(b.sinif),unit=Number(b.unite),mode=Number(b.mode);if(!Number.isInteger(cls)||cls<1||cls>12||!Number.isInteger(unit)||unit<1||unit>100||![1,2].includes(mode))return json({ok:false,mesaj:'Sınıf, ünite ve oyuncu sayısını seç.'},400);
   if(op==='meteorSiralama'){
    const {data,error}=await db.from('papi_meteor_sessions').select('actor_key,state,created_at').eq('class_no',cls).eq('unit_no',unit).eq('mode',mode).eq('status','finished').order('best_score',{ascending:false}).limit(2000);if(error)return json({ok:false,mesaj:'Sıralama yüklenemedi.'},503);
    const best=new Map();for(const r of (data||[]).filter((r:any)=>r.actor_key!=='s:dcde2026-1015-4000-8000-000000000001'))for(const [i,p] of r.state.players.entries()){const key=r.actor_key+':'+norm(p.name)+':'+i,old=best.get(key);if(!old||p.score>old.puan)best.set(key,{isim:p.name,puan:p.score,dogru:p.correct,yanlis:p.wrong,tarih:r.created_at});}return json({ok:true,liste:[...best.values()].sort((x:any,y:any)=>y.puan-x.puan).slice(0,100)});
   }
   const {data,error}=await db.from('word_bank').select('english,turkish').eq('active',true).eq('class_no',cls).eq('unit_no',unit).limit(2001);if(error)return json({ok:false,mesaj:'Kelimeler yüklenemedi.'},503);
   const seen=new Set(),words=[...(data||[])].map((r:any)=>({en:String(r.english||'').trim(),tr:String(r.turkish||'').trim()})).filter((w:any)=>{const k=norm(w.en);if(!w.en||!w.tr||seen.has(k))return false;seen.add(k);return true;});if(words.length<2)return json({ok:false,mesaj:'Bu oyun için ünitede en az iki kelime gerekiyor.'},400);if(words.length>2000)return json({ok:false,mesaj:'Ünite çok büyük.'},400);
   let selected;try{selected=await selectWordBankRound(db,owner,cls,unit,words,b.independent===true?Math.min(12,Math.floor(words.length/mode))*mode:12);}catch{return json({ok:false,mesaj:'Kelime geçmişi yüklenemedi.'},503);}const deck=selected.map((w:any,i:number)=>{const reverse=(b.independent===true?Math.floor(i/mode):i)%2===1,answer=reverse?w.en:w.tr,choices=[...new Map(words.map((x:any)=>{const t=reverse?x.en:x.tr;return [norm(t),t];})).values()];return {key:w.en,word:reverse?w.tr:w.en,answer,direction:reverse?'tr-en':'en-tr',options:shuffle([answer,...shuffle(choices.filter((t:any)=>norm(t)!==norm(answer))).slice(0,5)])};});
   const state:any={index:0,last:null,attempts:[],players:Array.from({length:mode},(_,i)=>({name:clean(b.names?.[i])||'Oyuncu '+(i+1),score:0,correct:0,wrong:0}))};
   if(b.independent===true){state.independent=true;state.players.forEach((p:any,i:number)=>{p.index=0;p.attempts=[];p.order=deck.map((_:any,n:number)=>n).filter((n:number)=>n%mode===i);});}
   const {data:r,error:err}=await db.from('papi_meteor_sessions').insert({actor_key:owner,student_id:a.role==='student'?a.student_id:null,teacher_id:a.role==='teacher'?a.teacher_id:null,class_no:cls,unit_no:unit,mode,deck,state}).select('*').single();if(err||!r)return json({ok:false,mesaj:'Oyun başlatılamadı.'},503);return json(view(r));
  }
  if(!/^[0-9a-f-]{36}$/i.test(String(b.runId||'')))return json({ok:false,mesaj:'Geçersiz oyun.'},400);
  const {data:r,error}=await db.from('papi_meteor_sessions').select('*').eq('id',b.runId).eq('actor_key',owner).maybeSingle();if(error)return json({ok:false,mesaj:'Oyun yüklenemedi.'},503);if(!r)return json({ok:false,mesaj:'Oyun bulunamadı.'},404);
  if(op==='meteorDurum'||r.status==='finished')return json(view(r));
  if(op==='meteorBitir')return update(r,r.state,'finished');
  const s=JSON.parse(JSON.stringify(r.state)),round=Number(b.round),player=Number(b.player),option=Number(b.option),attempt=String(b.attempt||'');
  if(s.independent){
   if(!Number.isInteger(player)||player<0||player>=r.mode||!Number.isInteger(round)||round<0||!/^[a-z0-9-]{8,80}$/i.test(attempt))return json({ok:false,mesaj:'Geçersiz cevap.'},400);
   const p=s.players[player];if(round<p.index||p.index>=p.order.length||p.attempts.includes(attempt))return json(view(r));
   const w=r.deck[p.order[p.index]];
   if(round!==p.index||!Number.isInteger(option)||option<0||option>=w.options.length)return json({ok:false,mesaj:'Geçersiz cevap.'},400);
   if(p.attempts.length>=200)return json({ok:false,mesaj:'Bu soruda çok fazla deneme yapıldı.'},429);
   const correct=norm(w.options[option])===norm(w.answer),delta=correct?10:-5;p.score+=delta;p[correct?'correct':'wrong']++;p.attempts.push(attempt);s.last={round,player,correct,delta,word:w.word,answer:w.answer,attempt};
   if(correct){p.index++;p.attempts=[];}s.index=Math.min(...s.players.map((x:any)=>x.index));return update(r,s,s.players.every((x:any)=>x.index>=x.order.length)?'finished':'playing');
  }
  if(round<s.index)return json(view(r));if(round!==s.index||!Number.isInteger(player)||player<0||player>=r.mode||!Number.isInteger(option)||option<0||option>=r.deck[s.index].options.length||!/^[a-z0-9-]{8,80}$/i.test(attempt))return json({ok:false,mesaj:'Geçersiz cevap.'},400);
  if(s.attempts.includes(attempt))return json(view(r));if(s.attempts.length>=200)return json({ok:false,mesaj:'Bu soruda çok fazla deneme yapıldı. Oyunu bitirip yeniden başlat.'},429);
  const w=r.deck[s.index],correct=norm(w.options[option])===norm(w.answer),delta=correct?10:-5;s.players[player].score+=delta;s.players[player][correct?'correct':'wrong']++;s.last={round,player,correct,delta,word:w.word,answer:w.answer,attempt};s.attempts.push(attempt);
  if(correct){s.index++;s.attempts=[];}return update(r,s,s.index>=r.deck.length?'finished':'playing');
 }};
}
