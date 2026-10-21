import './konu-oyunlari-a1.js';
import './konu-oyunlari-a2.js';
import {loadStartPath} from './start-path-access.mjs';
import {studyAccess} from './start-path.mjs';
import {isDemo} from './demo-account.ts';
import {buildQuestions,answerKey,validPicks} from './topic-games-core.mjs';
const catalog=[...(globalThis as any).DijiTopicGamesA1,...(globalThis as any).DijiTopicGamesA2];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function topicGamesAPI(db:any,json:any){
 const fail=(mesaj:string,status=400)=>json({ok:false,mesaj},status);
 return {async handle(op:string,b:any,q:URLSearchParams,a:any,method:string){
  if(!['konuOyunBaslat','konuOyunBitir'].includes(op))return null;
  if(method!=='POST')return fail('POST gerekli.',405);
  // An invalid supplied session must never silently turn into a guest reward run.
  if(!a&&(b.t||q.get('t')))return fail('Oturumun sona ermiş. Yeniden giriş yap.',401);
  const practice=!a||a.role==='teacher';
  if(!practice&&(a.role!=='student'||!a.student_id))return fail('Öğrenci oturumu gerekli.',401);
  if(op==='konuOyunBaslat'){
   if(typeof b.topicKey!=='string'||b.topicKey.length>350||typeof b.game!=='string')return fail('Geçersiz konu.');
   const topic=catalog.find((t:any)=>t.key===b.topicKey);
   if(!topic||!topic.games.includes(b.game))return fail('Bu konu oyunu henüz hazır değil.');
   const [level,category,name]=topic.key.split('|');
   if(level==='A2'&&!practice&&!isDemo(a)){
    try{const ctx=await db.rpc('dm_progress_context',{actor:a.student_id});if(ctx.error)throw ctx.error;const path=await loadStartPath(db,a.student_id,ctx.data);if(!studyAccess(path).A2)return fail('Bu seviye henüz açık değil.',403);}catch{return fail('Seviye erişimi kontrol edilemedi.',503);}
   }
   if(level==='A2'&&!a)return fail('Bu seviye henüz açık değil.',403);
   const active=await db.from('lesson_topics').select('topic_name').eq('level',level).eq('category',category).eq('topic_name',name).eq('active',true).maybeSingle();
   if(active.error)return fail('Konular kontrol edilemedi.',503);
   if(!active.data)return fail('Bu konu oyunu henüz hazır değil.');
   const sorular=buildQuestions(topic,b.game);
   if(practice)return json({ok:true,runId:null,sorular,bugunXpHakki:0,practice:true});
   const cleanup=await db.from('dm_topic_game_runs').delete().lte('expires_at',new Date().toISOString());
   if(cleanup.error)return fail('Oyun başlatılamadı.',503);
   const runId=crypto.randomUUID(),now=new Date();
   const created=await db.from('dm_topic_game_runs').insert({run_id:runId,student_id:a.student_id,topic_key:topic.key,game:b.game,answer_key:answerKey(sorular),question_count:sorular.length,started_at:now.toISOString(),expires_at:new Date(+now+1800000).toISOString()});
   if(created.error)return fail('Oyun başlatılamadı.',503);
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
   const today=await db.from('dm_game_reward_runs').select('run_id',{count:'exact',head:true}).eq('student_id',a.student_id).eq('topic_key',topic.key).eq('game_key','konu:'+b.game).gt('xp',0).gte('created_at',day+'T00:00:00+03:00').lt('created_at',new Date(Date.parse(day+'T00:00:00+03:00')+86400000).toISOString());
   if(today.error)return fail('XP hakkı kontrol edilemedi.',503);
   return json({ok:true,runId,sorular,bugunXpHakki:Math.max(0,3-(today.count||0))});
  }
  if(practice)return fail('Bu oyun için ödül oturumu yok.',401);
  if(!uuid.test(String(b.runId||''))||!Array.isArray(b.picks)||b.picks.length<8||b.picks.length>10)return fail('Geçersiz cevaplar.');
  const run=await db.from('dm_topic_game_runs').select('answer_key').eq('run_id',b.runId).eq('student_id',a.student_id).maybeSingle();
  if(run.error)return fail('Oyun doğrulanamadı.',503);
  if(!run.data)return fail('Oyun oturumu bulunamadı veya tamamlandı.',409);
  if(!validPicks(run.data.answer_key,b.picks))return fail('Geçersiz cevaplar.');
  const result=await db.rpc('dm_topic_game_finish',{actor:a.student_id,run_key:b.runId,picks:b.picks});
  if(result.error){const m=String(result.error.message||'');return fail(/^(Geçersiz cevaplar\.|Öğrenci oturumu gerekli\.|Hesap bilgileri hazır değil\.)$/.test(m)?m:'Oyun doğrulanamadı. Tekrar dene.',503);}
  return json(result.data,result.data?.ok===false?409:200);
 }};
}

