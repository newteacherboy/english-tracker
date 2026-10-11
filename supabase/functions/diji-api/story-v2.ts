/* Server-owned grading for version 2 learning questions. Never trust client task payloads. */
export const storyV2Norm=(x:any)=>expandSpeech(x);
const expandSpeech=x=>String(x??'').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\u2018\u2019]/g,"'").replace(/\b(i'm)\b/g,'i am').replace(/\b(you're)\b/g,'you are').replace(/\b(we're)\b/g,'we are').replace(/\b(they're)\b/g,'they are').replace(/\b(he's)\b/g,'he is').replace(/\b(she's)\b/g,'she is').replace(/\b(it's)\b/g,'it is').replace(/\b(that's)\b/g,'that is').replace(/\b(what's)\b/g,'what is').replace(/\b(where's)\b/g,'where is').replace(/\b(here's)\b/g,'here is').replace(/\b(there's)\b/g,'there is').replace(/\b(don't)\b/g,'do not').replace(/\b(doesn't)\b/g,'does not').replace(/\b(didn't)\b/g,'did not').replace(/\b(can't)\b/g,'cannot').replace(/\b(cannot)\b/g,'can not').replace(/\b(won't)\b/g,'will not').replace(/\b(isn't)\b/g,'is not').replace(/\b(aren't)\b/g,'are not').replace(/\b(wasn't)\b/g,'was not').replace(/\b(weren't)\b/g,'were not').replace(/\b(i've)\b/g,'i have').replace(/\b(we've)\b/g,'we have').replace(/\b(they've)\b/g,'they have').replace(/\b(i'll)\b/g,'i will').replace(/\b(you'll)\b/g,'you will').replace(/\b(i'd)\b/g,'i would').replace(/[^\p{L}\p{N}\s']/gu,' ').replace(/\s+/g,' ').trim();
export function storyV2Steps(chapter:any){
 const cards=(chapter.cards||[]).filter((x:any)=>String(x.en||'').trim()&&String(x.tr||'').trim());
 const rotate=(a:any[],n:number)=>a.length?a.map((_:any,i:number)=>a[(i+n)%a.length]):[];
 const words=(s:string)=>s.trim().split(/\s+/).filter(Boolean);
 const sentences=cards.filter((x:any)=>words(x.en).length>1);
 if(!cards.length)return [];
 const sentence=sentences[0]||cards[0],chosen=cards[Math.min(1,cards.length-1)],translate=cards[Math.min(2,cards.length-1)];
 const steps:any[]=[
 {kind:'match',label:'Eşleştir ve öğren',pairs:cards},
 {kind:'repeat',label:"Papi'yi dinle ve tekrar et",...cards[0]},
 {kind:'order',label:'Duyduğun cümleyi oluştur',...sentence,tokens:words(sentence.en)},
 {kind:'choose',label:'Türkçesini dinle, İngilizcesini bul',...chosen,options:rotate(cards.map((c:any)=>c.en),1),answer:chosen.en}
 ];
 if(sentences.length){const c=sentences[Math.min(1,sentences.length-1)],parts=words(c.en),mid=Math.max(1,Math.floor(parts.length/2));steps.push({kind:'complete',label:'Cümleyi tamamla',...c,stem:parts.slice(0,mid).join(' '),answer:parts.slice(mid).join(' '),options:rotate(sentences.map((s:any)=>words(s.en).slice(mid).join(' ')).filter(Boolean),1)})}
 steps.push({kind:'translate',label:'Çeviri zamanı',...translate,from:'tr',answer:translate.en});
 for(const card of cards)steps.push({kind:'final',label:'Büyük final',...card,maxAttempts:2});
 return steps;
}
export function storyV2Grade(task:any,answer:any){
 if(!task)return {valid:false,correct:false};
 if(task.kind==='match'){
  if(!Array.isArray(answer)||answer.length!==task.pairs.length)return {valid:false,correct:false};
  const correct=task.pairs.every((pair:any)=>answer.some((a:any)=>storyV2Norm(a?.en)===storyV2Norm(pair.en)&&storyV2Norm(a?.tr)===storyV2Norm(pair.tr)));
  return {valid:true,correct};
 }
 if(typeof answer!=='string'||!answer.trim()||answer.length>1000)return {valid:false,correct:false};
 const expected=task.kind==='complete'||task.kind==='choose'||task.kind==='translate'?task.answer:task.en;
 const correct=storyV2Norm(answer)===storyV2Norm(expected);
 return {valid:true,correct};
}

const cardsOf=(chapter:any)=>(chapter?.cards||[]).filter((c:any)=>typeof c?.en==='string'&&typeof c?.tr==='string'&&c.en.trim()&&c.tr.trim()).map((c:any)=>({en:c.en.trim(),tr:c.tr.trim()})).filter((c:any,i:number,a:any[])=>a.findIndex((x:any)=>storyV2Norm(x.en)===storyV2Norm(c.en))===i);
const rotate=(a:any[],n:number)=>a.length?a.map((_:any,i:number)=>a[(i+n)%a.length]):[];
const tokens=(s:string)=>String(s||'').trim().split(/\s+/).filter(Boolean);
const norm=storyV2Norm;
export  function storyV3Steps(chapter:any){
  const cards=cardsOf(chapter);
  if(!cards.length)return [];
  const pool=cards.map((c,i)=>({...c,index:i,words:tokens(c.en)}));
  const tasks:any[]=[],seen=new Set<string>();
  const add=(t:any)=>{const id=t.kind+'|'+norm(t.tr||'')+'|'+norm(t.stem||t.en||'')+'|'+norm(t.answer||'');if(seen.has(id))return false;seen.add(id);tasks.push(t);return true};
  const opts=pool.map(c=>c.en);
  const offset=Math.abs(Number(chapter.id)||0)%pool.length;
  const ordered=rotate(pool,offset);
  add({kind:'match',label:'Kelimeleri tanı',pairs:cards.map(c=>({...c}))});
  ordered.forEach(c=>add({kind:'choose',label:'Türkçesinden bul',...c,options:rotate(opts,c.index),answer:c.en}));
  ordered.forEach(c=>add({kind:'repeat',label:'Dinle ve İngilizce söyle',...c}));
  const sentences=pool.filter(c=>c.words.length>1);
  // Target a distinct missing word in each context. Do not repeat identical blanks.
  for(let turn=0;tasks.length<12&&turn<48;turn++){
   const c=(sentences.length?sentences:pool)[turn%(sentences.length||pool.length)];
   const n=c.words.length,at=turn%n,word=c.words[at];
   const stem=c.words.map((w,i)=>i===at?'___':w).join(' ');
   add({kind:'complete',label:'Eksik kelimeyi tamamla',en:c.en,tr:c.tr,stem,answer:word,options:[...new Set([word,...pool.flatMap(x=>x.words).filter(w=>norm(w)!==norm(word)).slice(turn%3,turn%3+3)])]});
  }
  for(let turn=0;tasks.length<12&&turn<24;turn++){
   const c=ordered[turn%ordered.length];
   add({kind:'order',label:'Cümleyi sıraya koy',en:c.en,tr:c.tr,tokens:c.words});
   add({kind:'translate',label:'İngilizcesini yaz veya söyle',en:c.en,tr:c.tr,from:'tr',answer:c.en});
  }
  // A minimum of twelve different tasks even for very short two-card chapters.
  for(let turn=0;tasks.length<12&&turn<60;turn++){
   const c=ordered[turn%ordered.length];
   add({kind:'complete',label:'Eksik kelimeyi tamamla',en:c.en,tr:c.tr,stem:c.words.map((w,i)=>i===turn%c.words.length?'___':w).join(' ')+' ('+(Math.floor(turn/c.words.length)+1)+')',answer:c.words[turn%c.words.length],options:[...new Set([c.words[turn%c.words.length],...pool.flatMap(x=>x.words).slice(0,3)])]});
  }
  // Always finish with every taught card, independent of the twelve practice items.
  return [...tasks.slice(0,12),...cards.map(c=>({kind:'final',label:'Papi’nin Büyük Finali',...c,maxAttempts:2}))];
 }
