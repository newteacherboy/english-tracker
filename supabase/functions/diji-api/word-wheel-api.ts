import { selectWordBankRound } from './word-bank-rotation.ts';
export const WHEEL_POINTS=[50,100,150,200,250,300,400,500,600,750,900,1000];
export const QUESTION_MS=10000;
const LEGACY_POINTS=[50,100,150,200,250,300,100,200];
const pointsFor=(r:any)=>r.state.wheelPoints||LEGACY_POINTS;
const shuffle=(list:any[])=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clean=(s:any)=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40);
const normalize=(s:any)=>String(s||'').trim().toLocaleLowerCase('tr').replace(/\s+/g,' ');
export function wordWheelAPI(db:any,json:any){
 const send=(v:any)=>{const code=v.statusCode||200;delete v.statusCode;return json(v,code);};
 const actor=(a:any)=>a?.role==='student'&&a.student_id?'s:'+a.student_id:a?.role==='teacher'&&a.teacher_id?'t:'+a.teacher_id:'';
 const view=(r:any)=>{const s=r.state;
  if(s.independent){const players=s.players.map((p:any)=>{const w=r.deck[p.order[p.index]];return {name:p.name,score:p.score,correct:p.correct,wrong:p.wrong,index:p.index,total:p.order.length,finished:p.index>=p.order.length,last:p.last||null,pending:r.status==='playing'&&p.pending&&w?{round:p.index,slot:p.pending.slot,points:pointsFor(r)[p.pending.slot],word:w.en,options:w.options,deadline:p.pending.deadline}:null};});return {ok:true,serverNow:Date.now(),questionSeconds:10,runId:r.id,sinif:r.class_no,unite:r.unit_no,mode:r.mode,independent:true,players,index:Math.min(...players.map((p:any)=>p.index)),total:players[0].total,finished:r.status==='finished',wheelPoints:pointsFor(r),last:s.last||null,pending:null};}
  const question=r.deck[s.index];return {ok:true,serverNow:Date.now(),questionSeconds:10,runId:r.id,sinif:r.class_no,unite:r.unit_no,mode:r.mode,players:s.players,turn:s.index%r.mode,index:s.index,total:r.deck.length,finished:r.status==='finished',wheelPoints:pointsFor(r),last:s.last||null,pending:r.status==='playing'&&s.pending&&question?{round:s.index,slot:s.pending.slot,points:pointsFor(r)[s.pending.slot],word:question.en,options:question.options,deadline:s.pending.deadline}:null};
 };
 // Compare-and-swap protects a question from duplicate answers/timeouts on two devices.
 async function persist(r:any,state:any,status=r.status){const {data,error}=await db.from('papi_wheel_sessions').update({state,status,version:r.version+1,best_score:Math.max(...state.players.map((p:any)=>p.score))}).eq('id',r.id).eq('actor_key',r.actor_key).eq('version',r.version).select('id');if(error)return {ok:false,mesaj:'İşlem kaydedilemedi. Tekrar dene.',statusCode:503};if(!data?.length)return {ok:false,mesaj:'Oyun başka bir istekte değişti. Tekrar dene.',statusCode:409};return {row:{...r,state,status,version:r.version+1}};}
 async function update(r:any,state:any,status=r.status){const saved=await persist(r,state,status);return saved.row?view(saved.row):saved;}
 function mark(r:any,s:any,player:number,answer:string,timedOut:boolean){
  const p=s.players[player],index=s.independent?p.index:s.index,pending=s.independent?p.pending:s.pending,word=r.deck[s.independent?p.order[index]:index];
  const correct=!timedOut&&normalize(answer)===normalize(word.tr),points=pointsFor(r)[pending.slot],delta=correct?points:-points;
  p.score+=delta;p[correct?'correct':'wrong']++;s.last={round:index,player,correct,delta,answer:word.tr,word:word.en,timedOut};
  if(s.independent){p.last=s.last;p.index++;p.pending=null;s.index=Math.min(...s.players.map((x:any)=>x.index));}else{s.index++;s.pending=null;}
 }
 const ended=(r:any,s:any)=>s.independent?s.players.every((p:any)=>p.index>=p.order.length):s.index>=r.deck.length;
 const deadline=(b:any)=>Date.now()+QUESTION_MS+(b.revealDelayMs===0?0:1250);
 // A persisted deadline survives refreshes, background tabs and reconnects.
 async function settle(r:any){
  if(r.status!=='playing')return {row:r};const s=JSON.parse(JSON.stringify(r.state));let changed=false;
  const players=s.independent?s.players.map((_:any,i:number)=>i):[s.index%r.mode];
  for(const i of players){const pending=s.independent?s.players[i].pending:s.pending;if(!pending)continue;
   if(!Number.isFinite(pending.deadline)){pending.deadline=Date.now()+QUESTION_MS;changed=true;}
   else if(Date.now()>=pending.deadline){mark(r,s,i,'',true);changed=true;}
  }
  return changed?persist(r,s,ended(r,s)?'finished':'playing'):{row:r};
 }
 return {async handle(op:string,b:any,q:URLSearchParams,a:any,method:string){
  if(!['kelimeCarkiBaslat','kelimeCarkiCevir','kelimeCarkiCevap','kelimeCarkiBitir','kelimeCarkiDurum','kelimeCarkiSiralama'].includes(op))return null;
  const owner=actor(a);if(!owner)return json({ok:false,hata:'oturum',mesaj:'Oyuna başlamak için giriş yapmalısın.'},401);
  if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  if(op==='kelimeCarkiSiralama'){
   const cls=Number(b.sinif),unit=Number(b.unite),mode=Number(b.mode);if(!Number.isInteger(cls)||cls<1||cls>12||!Number.isInteger(unit)||unit<1||unit>100||![1,2].includes(mode))return json({ok:false,mesaj:'Geçersiz seçim.'},400);
   const {data,error}=await db.from('papi_wheel_sessions').select('actor_key,state,created_at').eq('class_no',cls).eq('unit_no',unit).eq('mode',mode).eq('status','finished').order('best_score',{ascending:false}).limit(2000);if(error)return json({ok:false,mesaj:'Sıralama yüklenemedi.'},503);
   const best=new Map();for(const r of (data||[]).filter((r:any)=>r.actor_key!=='s:dcde2026-1015-4000-8000-000000000001'))for(const [i,p] of r.state.players.entries()){const key=r.actor_key+':'+(mode===1&&r.actor_key.startsWith('s:')?'solo':mode===2?i+':'+normalize(p.name):normalize(p.name)),old=best.get(key);if(!old||p.score>old.puan)best.set(key,{isim:p.name,puan:p.score,dogru:p.correct,yanlis:p.wrong,tarih:r.created_at});}
   return json({ok:true,liste:[...best.values()].sort((x:any,y:any)=>y.puan-x.puan||String(x.tarih).localeCompare(String(y.tarih))).slice(0,100)});
  }
  if(op==='kelimeCarkiBaslat'){
   const cls=Number(b.sinif),unit=Number(b.unite),mode=Number(b.mode);if(!Number.isInteger(cls)||cls<1||cls>12||!Number.isInteger(unit)||unit<1||unit>100||![1,2].includes(mode))return json({ok:false,mesaj:'Sınıf, ünite ve oyuncu sayısı seç.'},400);
   const {data,error}=await db.from('word_bank').select('english,turkish').eq('active',true).eq('class_no',cls).eq('unit_no',unit).limit(2001);if(error)return json({ok:false,mesaj:'Kelimeler yüklenemedi.'},503);
   const seen=new Set(),words=[...(data||[])].map((r:any)=>({en:String(r.english||'').trim(),tr:String(r.turkish||'').trim()})).filter((w:any)=>{const k=w.en.toLocaleLowerCase('en');if(!w.en||!w.tr||seen.has(k))return false;seen.add(k);return true;});if(!words.length)return json({ok:false,mesaj:'Seçilen ünitede kelime yok.'},404);if(b.independent===true&&mode===2&&words.length<2)return json({ok:false,mesaj:'İki kişilik oyun için en az iki kelime gerekiyor.'},400);if(words.length>2000)return json({ok:false,mesaj:'Bu ünite çok büyük.'},400);
   const meanings=[...new Set(words.map((w:any)=>w.tr))];let deck;try{deck=await selectWordBankRound(db,owner,cls,unit,words,b.independent===true&&mode===2?Math.min(12,Math.floor(words.length/mode))*mode:12);}catch{return json({ok:false,mesaj:'Kelime geçmişi yüklenemedi.'},503);}if(deck.length>1&&deck[0].en===String(b.previousFirst||'')){[deck[0],deck[1]]=[deck[1],deck[0]];}deck=deck.map((w:any)=>({...w,options:shuffle([w.tr,...shuffle(meanings.filter(t=>normalize(t)!==normalize(w.tr))).slice(0,3)])}));
   const state:any={wheelPoints:WHEEL_POINTS,index:0,pending:null,last:null,players:Array.from({length:mode},(_,i)=>({name:clean(b.names?.[i])||'Oyuncu '+(i+1),score:0,correct:0,wrong:0}))};
   if(b.independent===true&&mode===2){const rounds=deck.length/2;const pool=shuffle(WHEEL_POINTS.map((_:any,i:number)=>i)).slice(0,rounds);const order=shuffle(pool);const offset=rounds>1?1+crypto.getRandomValues(new Uint32Array(1))[0]%(rounds-1):0;state.playerSlots=[order,order.map((_:any,i:number)=>order[(i+offset)%rounds])];state.independent=true;state.players.forEach((p:any,i:number)=>{p.index=0;p.pending=null;p.last=null;p.order=deck.map((_:any,n:number)=>n).filter((n:number)=>n%mode===i);});}
   const {data:row,error:err}=await db.from('papi_wheel_sessions').insert({actor_key:owner,student_id:a.role==='student'?a.student_id:null,teacher_id:a.role==='teacher'?a.teacher_id:null,class_no:cls,unit_no:unit,mode,deck,state}).select('*').single();if(err||!row)return json({ok:false,mesaj:'Oyun başlatılamadı.'},503);return json(view(row));
  }
  if(!/^[0-9a-f-]{36}$/i.test(String(b.runId||'')))return json({ok:false,mesaj:'Geçersiz oyun.'},400);
  const {data:loaded,error}=await db.from('papi_wheel_sessions').select('*').eq('id',b.runId).eq('actor_key',owner).maybeSingle();if(error)return json({ok:false,mesaj:'Oyun yüklenemedi.'},503);if(!loaded)return json({ok:false,mesaj:'Oyun bulunamadı.'},404);
  const settled=await settle(loaded);if(!settled.row)return send(settled);const r=settled.row;
  if(op==='kelimeCarkiDurum'||r.status==='finished')return json(view(r));
  if(op==='kelimeCarkiBitir')return send(await update(r,{...r.state,pending:null},'finished'));
  if(r.state.independent){
   const s=JSON.parse(JSON.stringify(r.state)),player=Number(b.player),round=Number(b.round);
   if(!Number.isInteger(player)||player<0||player>=r.mode||!Number.isInteger(round)||round<0)return json({ok:false,mesaj:'Geçersiz oyuncu veya soru.'},400);
   const p=s.players[player];if(round<p.index||p.index>=p.order.length)return json(view(r));if(round!==p.index)return json({ok:false,mesaj:'Soru değişmiş. Tekrar dene.'},409);
   if(op==='kelimeCarkiCevir'){if(p.pending)return json(view(r));p.pending={slot:Array.isArray(s.playerSlots?.[player])&&Number.isInteger(s.playerSlots[player][p.index])?s.playerSlots[player][p.index]:Array.isArray(s.sharedSlots)&&Number.isInteger(s.sharedSlots[p.index])?s.sharedSlots[p.index]:crypto.getRandomValues(new Uint32Array(1))[0]%pointsFor(r).length,deadline:deadline(b)};return send(await update(r,s));}
   if(op==='kelimeCarkiCevap'){
    if(!p.pending)return json({ok:false,mesaj:'Önce kendi çarkını çevir.'},409);
    if(b.timedOut===true)return json({ok:false,mesaj:'Süre henüz dolmadı.'},409);
    const answer=String(b.answer||'').trim();if(!answer||answer.length>500)return json({ok:false,mesaj:'Cevabını seç veya yaz.'},400);
    mark(r,s,player,answer,false);return send(await update(r,s,ended(r,s)?'finished':'playing'));
   }
  }
  if(op==='kelimeCarkiCevir'){
   if(r.state.pending)return json(view(r));if(r.state.index>=r.deck.length)return send(await update(r,r.state,'finished'));
   const slot=crypto.getRandomValues(new Uint32Array(1))[0]%pointsFor(r).length;
   return send(await update(r,{...r.state,pending:{slot,deadline:deadline(b)}}));
  }
  if(op==='kelimeCarkiCevap'){
   const s=JSON.parse(JSON.stringify(r.state));if(Number(b.round)!==s.index){if(Number(b.round)===s.index-1&&s.last)return json(view(r));return json({ok:false,mesaj:'Soru değişmiş. Tekrar dene.'},409);}if(!s.pending)return json({ok:false,mesaj:'Önce çarkı çevir.'},409);
   if(b.timedOut===true)return json({ok:false,mesaj:'Süre henüz dolmadı.'},409);
   const answer=String(b.answer||'').trim();if(!answer||answer.length>500)return json({ok:false,mesaj:'Cevabını seç veya yaz.'},400);
   mark(r,s,s.index%r.mode,answer,false);return send(await update(r,s,ended(r,s)?'finished':'playing'));
  }
  return null;
 }};
}
