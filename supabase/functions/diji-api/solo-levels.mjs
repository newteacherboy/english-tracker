import './konu-oyunlari-a1.js';
import './konu-oyunlari-a2.js';
import {advancedWords} from './solo-vocabulary.mjs';
const firstPhrases=[['My name is Ali.','Benim adım Ali.'],['I am a student.','Ben bir öğrenciyim.'],['This is a book.','Bu bir kitap.'],['This is my bag.','Bu benim çantam.'],['I have a pencil.','Bir kalemim var.'],['I like red apples.','Kırmızı elmaları severim.'],['The cat is small.','Kedi küçüktür.'],['My bag is blue.','Çantam mavidir.'],['Open your book please.','Lütfen kitabını aç.'],['Close the door please.','Lütfen kapıyı kapat.'],['How are you today?','Bugün nasılsın?'],['I am very happy.','Ben çok mutluyum.']].map(([en,tr])=>({en,tr,unit:1}));
export const soloGames=new Set(['ky','jp','bosluk','hafiza','yagmur','kelimebul','eslestirme','tren','dikte','cumle','harfbahcesi','canavar','fener']);
export const progressKey=game=>'solo_levels_v1_'+game;
const norm=s=>String(s||'').trim().toLowerCase();
export function eligible(game,w){
 if(!w.en||!w.tr)return false;
 if(['tren','cumle'].includes(game))return w.en.split(/\s+/).length>=3&&w.en.split(/\s+/).length<=9;
 if(game==='dikte')return /^[a-zA-Z]{3,10}$/.test(w.en);
 if(game==='kelimebul')return /^[a-zA-Z]{3,9}$/.test(w.en);
 if(game==='harfbahcesi')return /^[a-zA-Z]{2,12}$/.test(w.en);
 if(game==='bosluk')return /^[a-zA-Z]{3,}$/.test(w.en);
 return true;
}
const unique=rows=>[...new Map(rows.map(w=>[norm(w.en),w])).values()].sort((a,b)=>(Number(a.unit)||1)-(Number(b.unit)||1)||a.en.localeCompare(b.en,'en'));
export function catalog(game,rows){
 const stages=[];
 function group(list,label,classNo,cefr=''){
  list=unique(list.filter(w=>eligible(game,w)));if(list.length<12)return;
  for(let i=0;i<list.length;i+=12){
   let words=list.slice(i,i+12);if(words.length<12)words=[...words,...list.filter(w=>!words.includes(w)).slice(0,12-words.length)];
   stages.push({number:stages.length+1,label,classNo,cefr,units:[...new Set(words.map(w=>Number(w.unit)||1))].sort((a,b)=>a-b),words});
  }
 }
 for(let c=1;c<=8;c++){
  const list=rows.filter(w=>Number(w.class_no??w.sinif)===c).map(w=>({en:String(w.english??w.ingilizce??w.en??'').trim(),tr:String(w.turkish??w.turkce??w.tr??'').trim(),unit:Number(w.unit_no??w.unite)||1}));
  if(c===1&&['tren','cumle'].includes(game)&&list.filter(w=>eligible(game,w)).length<12)list.push(...firstPhrases);
  group(list,c+'. Sınıf',c);
 }
 for(const cefr of ['A1','A2','B1','B2']){
  let list=cefr==='B1'||cefr==='B2'?advancedWords[cefr]: (globalThis['DijiTopicGames'+cefr]||[]).flatMap(t=>t.type==='vocab'?t.items||[]:[]);
  if(['tren','cumle'].includes(game)){
   const themes=globalThis['DijiTopicGames'+cefr]||[];
   const phrases=themes.flatMap(t=>t.items||[]).flatMap(w=>w.en&&w.tr&&String(w.en).split(/\s+/).length>=3?[{en:w.en,tr:w.tr}]:[]);
   list=[...phrases,...list.filter(w=>/^[a-zA-Z]+$/.test(w.en)).map(w=>({en:`The word is ${w.en}.`,tr:`Kelime ${w.tr}.`}))];
  }
  group(list,cefr+' · '+({A1:'Başlangıç',A2:'Temel',B1:'Orta',B2:'İleri'}[cefr]),8,cefr);
 }
 return stages;
}
let cached=null;
export async function loadCatalog(db,game){
 if(!cached||cached.until<Date.now()){
  const rows=[];
  for(let offset=0;offset<20000;offset+=1000){
   const r=await db.from('word_bank').select('english,turkish,class_no,unit_no').eq('active',true).order('id').range(offset,offset+999);
   if(r.error)throw Error('Kelime havuzu yüklenemedi.');rows.push(...(r.data||[]));if((r.data||[]).length<1000)break;
  }
  cached={until:Date.now()+300000,rows};
 }
 return catalog(game,cached.rows);
}
export function outcome(run){
 if(!Array.isArray(run?.deck)||run.deck.length!==12||!run.deck.every((_,i)=>run.answers?.[i]?.complete===true))throw Error('12 sorunun tamamını bitirmelisin.');
 const correct=run.deck.filter((_,i)=>run.answers[i].firstCorrect===true).length;
 return {correct,wrong:12-correct,passed:correct>=9,percent:correct===12?100:correct===11?80:correct===10?60:correct===9?35:correct?20:0};
}
export function soloLevelsAPI(db,json){
 return {async handle(op,b,a,method){
  if(!['soloLevelStatus','soloLevelComplete'].includes(op))return null;
  const fail=(mesaj,status=409)=>json({ok:false,mesaj},status);
  if(method!=='POST')return fail('POST gerekli.',405);
  if(a?.role!=='student'||!a.student_id||a.teacher_portal_access_id)return fail('Öğrenci oturumu gerekli.',401);
  const game=String(b.game||'');if(!soloGames.has(game))return fail('Geçersiz oyun.',400);
  try{
   const key=progressKey(game),saved=await db.from('extra_data').select('value,updated_at').eq('student_id',a.student_id).eq('key_name',key).maybeSingle();
   if(saved.error)return fail('Seviye yüklenemedi.',503);
   const stages=await loadCatalog(db,game),current=Math.max(1,Number(saved.data?.value?.next)||1);
   if(op==='soloLevelStatus'){
    const stage=stages[Math.min(current,stages.length)-1];if(!stage)return fail('Bu oyun için 12 soruluk içerik bulunamadı.',503);
    return json({ok:true,...stage,totalLevels:stages.length,allCompleted:current>stages.length});
   }
   const r=await db.from('dm_verified_runs').select('game,deck,answers').eq('student_id',a.student_id).eq('run_id',String(b.runId||'')).maybeSingle();
   if(r.error||r.data?.game!==(game==='golu'?'ky':game))return fail('Doğrulanmış oyun bulunamadı.');
   if((r.data.deck[0]?.soloVariant||r.data.game)!==game)return fail('Oyun seviyesi uyuşmuyor.');
   const number=Number(r.data.deck[0]?.soloLevel);if(!number||!r.data.deck.every(t=>t.soloLevel===number)||number>current)return fail('Geçersiz seviye.');
   const result=outcome(r.data),next=result.passed?Math.max(current,number+1):current;
   if(next>current){
    const value={next,lastRun:String(b.runId),updatedAt:new Date().toISOString()};
    const row={student_id:a.student_id,key_name:key,value,updated_at:new Date().toISOString()};
    const q=saved.data?db.from('extra_data').update(row).eq('student_id',a.student_id).eq('key_name',key).eq('updated_at',saved.data.updated_at).select('key_name'):db.from('extra_data').insert(row).select('key_name');
    const written=await q;if(written.error||!written.data?.length)return fail('Seviye kaydı güncelleniyor. Tekrar dene.',503);
   }
   return json({ok:true,...result,number,next,totalLevels:stages.length,allCompleted:next>stages.length});
  }catch(e){return fail(e.message,503);}
 }};
}
