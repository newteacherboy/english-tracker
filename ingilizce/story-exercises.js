/* DijiMedu Öğrenme Yolu — content-preserving exercise deck.
 * Pure generators: no rewards, progress, or network mutations.
 * The server must validate answers before production advancement.
 */
(function(root,factory){
 const value=factory();
 if(typeof module==='object'&&module.exports)module.exports=value;
 if(root)root.DMStoryExercises=value;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=x=>String(x??'').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\u2018\u2019]/g,"'").replace(/[^\p{L}\p{N}\s']/gu,' ').replace(/\s+/g,' ').trim();
 const cardsOf=chapter=>(chapter?.cards||[]).filter(c=>typeof c?.en==='string'&&typeof c?.tr==='string'&&c.en.trim()&&c.tr.trim()).map(c=>({en:c.en.trim(),tr:c.tr.trim()})).filter((c,i,a)=>a.findIndex(x=>norm(x.en)===norm(c.en))===i);
 const rotate=(arr,n)=>arr.length?arr.map((_,i)=>arr[(i+n)%arr.length]):[];
 const tokens=x=>String(x||'').trim().split(/\s+/).filter(Boolean);
 function build(chapter){
   const cards=cardsOf(chapter),tasks=[];
   if(!cards.length)return tasks;
   tasks.push({kind:'match',label:'Eşleştir ve öğren',pairs:cards.map(c=>({...c}))});
   const source=cards.filter(c=>tokens(c.en).length>1);
   tasks.push({kind:'repeat',label:'Papi\'yi dinle ve tekrar et',...cards[0]});
   const sentence=source[0]||cards[0];
   tasks.push({kind:'order',label:'Duyduğun cümleyi oluştur',...sentence,tokens:tokens(sentence.en)});
   const target=cards[Math.min(1,cards.length-1)];
   tasks.push({kind:'choose',label:'Türkçesini dinle, İngilizcesini bul',...target,options:rotate(cards.map(c=>c.en),1),answer:target.en});
   if(source.length){const c=source[Math.min(1,source.length-1)],parts=tokens(c.en),mid=Math.max(1,Math.floor(parts.length/2));tasks.push({kind:'complete',label:'Cümleyi tamamla',...c,stem:parts.slice(0,mid).join(' '),answer:parts.slice(mid).join(' '),options:rotate(source.map(s=>tokens(s.en).slice(mid).join(' ')).filter(Boolean),1)});}
   const tr=cards[Math.min(2,cards.length-1)];tasks.push({kind:'translate',label:'Çeviri zamanı',...tr,from:'tr',answer:tr.en});
   for(const c of cards)tasks.push({kind:'final',label:'Büyük final',...c,maxAttempts:2});
   return tasks;
 }
 function evaluate(task,answer,attempt=0){
   if(!task)return {status:'invalid'};
   if(!String(answer??'').trim()&&task.kind!=='match')return {status:'empty'};
   const expected=task.kind==='complete'?task.answer:task.kind==='choose'||task.kind==='translate'?task.answer:task.en;
   if(task.kind==='repeat')return {status:'needs-speech-verification'};
   if(task.kind==='match')return {status:'needs-pair-verification'};
   if(norm(answer)===norm(expected))return {status:'correct',spoken:task.en,translation:task.tr};
   if(task.kind==='final'&&attempt>=1)return {status:'reveal',spoken:task.en,translation:task.tr,review:true};
   return {status:'retry',remaining:task.kind==='final'?1:undefined,hint:task.kind==='final'?String(task.en).slice(0,1)+'…':task.en,spoken:task.kind==='order'?task.en:undefined,translation:task.kind==='order'?task.tr:undefined};
 }
 function checkPairs(task,matches){
   if(task?.kind!=='match'||!Array.isArray(matches))return false;
   const pairs=task.pairs||[];
   return matches.length===pairs.length&&pairs.every(p=>matches.some(m=>norm(m?.en)===norm(p.en)&&norm(m?.tr)===norm(p.tr)));
 }
 function languages(){return {en:'en-US',tr:'tr-TR'};}
 function speak(text,lang='en'){
   if(typeof window==='undefined'||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return false;
   try{const s=window.speechSynthesis,u=new window.SpeechSynthesisUtterance(String(text??''));u.lang=languages()[lang]||'en-US';u.rate=lang==='en'?.84:.93;s.cancel();s.speak(u);return true;}catch{return false;}
 }
 function recognition(lang='en'){
   if(typeof window==='undefined')return null;
   const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(!SR)return null;
   const instance=new SR();instance.lang=languages()[lang]||'en-US';instance.interimResults=false;instance.maxAlternatives=1;instance.continuous=false;return instance;
 }
 function listen(lang='en'){
   const r=recognition(lang);if(!r)return Promise.resolve({status:'unavailable'});
   return new Promise(resolve=>{let finished=false;const done=x=>{if(finished)return;finished=true;try{r.stop()}catch{}resolve(x)};r.onresult=e=>done({status:'heard',text:e.results?.[0]?.[0]?.transcript||''});r.onerror=e=>done({status:'error',error:String(e.error||'microphone')});r.onnomatch=()=>done({status:'no-match'});r.onend=()=>done({status:'ended'});try{r.start()}catch(e){done({status:'error',error:String(e.message||'microphone')})}});
 }
 return {build,evaluate,checkPairs,cardsOf,norm,speak,listen,recognition,languages};
});
