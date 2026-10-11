/* Server-owned grading for version 2 learning questions. Never trust client task payloads. */
export const storyV2Norm=(x:any)=>String(x??'').normalize('NFKC').toLocaleLowerCase('en-US')
 .replace(/[\u2018\u2019]/g,"'").replace(/[^\p{L}\p{N}\s']/gu,' ').replace(/\s+/g,' ').trim();
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
