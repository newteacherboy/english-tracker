/* One deterministic task compiler shared by the browser and authoritative API. */
(function(root,factory){const core=factory();root.DMLearningCore=core;if(typeof module==='object')module.exports=core;})(globalThis,()=>{
 'use strict';
 const norm=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('en').replace(/[’‘]/g,"'").replace(/[.!?,;:]/g,'').replace(/\s+/g,' ').trim();
 const rotate=(a,n)=>a.map((_,i)=>a[(i+n)%a.length]);
 function deck(chapter,previous,deckVersion=7){
  const cards=chapter.cards,a=cards[0],b=cards[1],c=cards[2],u=chapter.examples;
  const choose=(label,prompt,answer,options,extra={})=>({kind:'choice',label,prompt,answer,options:rotate([...new Set(options)],chapter.number%options.length),...extra});
  const imageCards=cards.filter(x=>x.image),visual=imageCards.length>=2;
  const hear=visual?imageCards[chapter.number%imageCards.length]:b;
  const usage=u[1],parts=usage.en.split(/\s+/),last=parts.at(-1),word=last.replace(/[.!?]$/,''),stem=parts.slice(0,-1).join(' ')+' ____'+(/[.!?]$/.test(last)?last.slice(-1):'');
  const blanks=[...new Set([word,...u.map(x=>x.en.split(/\s+/).at(-1).replace(/[.!?]$/,''))])];
  const review=chapter.themeFinal?{cards:[...(previous?.cards||[a,b,c]).slice(0,2),a]}:previous||chapter;
  const r=review.cards[chapter.number%review.cards.length];
  const tasks=[
   {kind:'teach',label:'Önce öğren',cards,objective:chapter.objective},
   choose('Anlamı keşfet',a.en,a.tr,cards.map(x=>x.tr),{audio:a.en,language:'en',explanation:a.en+' = '+a.tr}),
   choose(visual?'Dinle ve görseli seç':'Dinle ve bul','Dinle, duyduğun ifadeyi seç.',hear.en,(visual?imageCards:cards).map(x=>x.en),{audio:hear.en,images:visual?imageCards:null,explanation:hear.en+' = '+hear.tr}),
   visual?choose('Görselden hatırla','Görselin İngilizcesi hangisi?',imageCards[0].en,cards.map(x=>x.en),{picture:imageCards[0],explanation:imageCards[0].en+' = '+imageCards[0].tr}):choose('İngilizcesini bul',c.tr,c.en,cards.map(x=>x.en),{promptAudio:c.tr,explanation:c.en+' = '+c.tr}),
   {kind:'match',label:'Eşleştir',prompt:'Önce kelimeye, sonra karşılığına dokun.',pairs:cards,explanation:'Üç ifadeyi de eşleştirdin.'},
   choose('Günlük hayatta kullan','“'+u[0].tr+'” demek için hangisini seçersin?',u[0].en,u.map(x=>x.en),{promptAudio:u[0].tr,explanation:u[0].en+' — '+u[0].tr}),
   blanks.length>=2?choose('Cümleyi tamamla',stem,word,blanks,{support:usage.tr,promptAudio:usage.tr,explanation:usage.en+' — '+usage.tr}):choose('Duruma uygun söyle',usage.tr,usage.en,u.map(x=>x.en),{promptAudio:usage.tr,explanation:usage.en+' — '+usage.tr}),
   {kind:'order',label:'Cümleyi kur',prompt:u[2].tr,tokens:u[2].en.split(/\s+/),answer:u[2].en,promptAudio:u[2].tr,explanation:u[2].en+' — '+u[2].tr},
   choose(chapter.themeFinal?'Tema tekrarı':'Bir önceki dersten hatırla',r.en,r.tr,review.cards.map(x=>x.tr),{audio:r.en,language:'en',explanation:r.en+' = '+r.tr}),
   choose('Son kontrol','Hangi eşleştirme doğru?',b.en+' → '+b.tr,[b.en+' → '+b.tr,b.en+' → '+a.tr,c.en+' → '+b.tr],{explanation:b.en+' = '+b.tr})
  ];
  if(chapter.themeFinal&&chapter.themeReview?.length===6){
   const r=chapter.themeReview,opts=(i,field)=>[r[i][field],...r.filter((_,j)=>j!==i).slice(0,2).map(c=>c[field])];
   tasks[4]={kind:'match',label:'Temadan üç ifadeyi eşleştir',prompt:'Farklı konularda öğrendiklerini eşleştir.',pairs:[r[0],r[2],r[4]],explanation:'Temanın farklı konularını hatırladın.'};
   tasks[5]=choose('Temadan hatırla',r[1].en,r[1].tr,opts(1,'tr'),{audio:r[1].en,language:'en',explanation:r[1].en+' = '+r[1].tr});
   tasks[6]=choose('Temada İngilizcesini bul',r[3].tr,r[3].en,opts(3,'en'),{promptAudio:r[3].tr,explanation:r[3].en+' = '+r[3].tr});
   tasks[8]=choose('Tema finali · Son konuyu hatırla',r[5].en,r[5].tr,opts(5,'tr'),{audio:r[5].en,language:'en',explanation:r[5].en+' = '+r[5].tr});
  }
  if(deckVersion>=7){
   const eligible=[...cards,...u].filter(x=>(x.en.match(/[a-z]/gi)||[]).length>=6);
   const target=eligible[chapter.number%eligible.length];
   if(!target)throw Error('Harf sorusu için yeterince uzun ifade bulunamadı.');
   const letterPositions=[...target.en].map((ch,i)=>/[a-z]/i.test(ch)?i:-1).filter(i=>i>=0),missingCount=letterPositions.length>=13?4:3;
   const missing=Array.from({length:missingCount},(_,i)=>letterPositions[Math.floor((i+1)*letterPositions.length/(missingCount+1))]);
   const letters=missing.map(i=>target.en[i]),distractors=[...'aeiostrn'].filter(ch=>!letters.some(l=>l.toLowerCase()===ch)).slice(0,2);
   tasks.push({kind:'letters',label:'Harfleri tamamla',prompt:'Eksik harfleri tamamla.',support:target.tr,en:target.en,tr:target.tr,missing,tokens:rotate([...letters,...distractors],chapter.number%(letters.length+distractors.length)),answer:target.en,explanation:target.en+' — '+target.tr});
  }
  const reviewCards=cards.filter((x,i)=>cards.findIndex(y=>norm(y.en)===norm(x.en))===i);
  if(deckVersion>=6)tasks.push({kind:'review',label:'Son tekrar',prompt:'Bu bölümde öğrendiklerin',cards:reviewCards.map((x,i)=>{
   const other=cards.find(y=>norm(y.tr)!==norm(x.tr));
   return {en:x.en,tr:x.tr,options:rotate([x.tr,other.tr],(chapter.number+i)%2)};
  }),explanation:'Bölümün tüm kelimelerini tekrar ettin.'});
  return tasks;
 }
 function grade(task,answer){
  if(task.kind==='teach')return {valid:answer===true,correct:answer===true};
  if(task.kind==='review'){
   const valid=Array.isArray(answer)&&answer.length===task.cards.length&&task.cards.every((c,i)=>typeof answer[i]==='string'&&c.options.includes(answer[i]));
   return {valid,correct:valid,allCorrect:valid&&task.cards.every((c,i)=>answer[i]===c.tr)}; // Review advances after either choice; no per-card rewards.
  }
  if(task.kind==='match'){
   if(!Array.isArray(answer)||answer.length!==task.pairs.length)return {valid:false,correct:false};
   const valid=answer.every(x=>x&&typeof x.en==='string'&&typeof x.tr==='string');
   return {valid,correct:valid&&new Set(answer.map(x=>norm(x.en))).size===task.pairs.length&&task.pairs.every(p=>answer.some(x=>norm(x.en)===norm(p.en)&&norm(x.tr)===norm(p.tr)))};
  }
  if(typeof answer!=='string'||answer.length>1000||!answer.trim())return {valid:false,correct:false};
  if(task.kind==='choice'&&!task.options.includes(answer))return {valid:false,correct:false};
  return {valid:true,correct:norm(answer)===norm(task.answer)};
 }
 return Object.freeze({deck,grade,norm});
});
