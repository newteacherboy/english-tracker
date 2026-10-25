/* Bank-backed school adaptation of Learning Route's ten question forms. */
(function(root,factory){const api=factory();root.DMSchoolCurriculum=api;if(typeof module==='object'&&module.exports)module.exports=api;})(globalThis,()=>{
 'use strict';
 const norm=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('en').replace(/[’‘]/g,"'").replace(/[.!?,;:]/g,'').replace(/\s+/g,' ').trim();
 const unique=(a,field)=>a.filter((x,i)=>a.findIndex(y=>norm(y[field])===norm(x[field]))===i);
 function build(words,pool=words,number=0){
  const cards=unique(words.filter(w=>w.en&&w.tr),'en');if(!cards.length)throw Error('Bu durakta kelime bulunamadı.');
  const bank=unique([...cards,...pool.filter(w=>w.en&&w.tr)],'en'),at=i=>cards[i%cards.length];
  const options=(word,field)=>{const other=unique([word,...bank.filter(w=>norm(w[field])!==norm(word[field]))],field).slice(0,3).map(w=>w[field]);return other.map((_,i)=>other[(i+number)%other.length]);};
  const choice=(label,word,field,prompt,extra={})=>({kind:'choice',label,prompt,answer:word[field],options:options(word,field),explanation:word.en+' — '+word.tr,...extra});
  // Use real bank phrases where available; never invent a sentence around an arbitrary word.
  const phrase=cards.find(w=>w.en.trim().includes(' '))||at(2),pieces=phrase.en.trim().split(/\s+/),multi=pieces.length>1;
  const letters=[...phrase.en].map((ch,i)=>/[a-z]/i.test(ch)?i:-1).filter(i=>i>=0);
  const missing=letters.filter((_,i)=>i%2===0).slice(0,Math.min(3,letters.length));
  const tokens=[...missing.map(i=>phrase.en[i]),...'aeiostrn'.split('').filter(ch=>!missing.some(i=>phrase.en[i].toLowerCase()===ch)).slice(0,2)];
  const last=pieces.at(-1),stem=pieces.slice(0,-1).join(' ');
  const fill=multi?{kind:'choice',label:'Cümleyi tamamla',prompt:stem+' ____',support:phrase.tr,answer:last,options:[last,...unique(bank,'en').map(w=>w.en.split(/\s+/).at(-1)).filter(w=>w!==last)].filter((x,i,a)=>a.indexOf(x)===i).slice(0,3),explanation:phrase.en+' — '+phrase.tr}
   :choice('İfadeyi tamamla',at(1),'en',at(1).tr,{promptAudio:at(1).tr});
  const pairBank=unique(unique([...cards,...bank],'tr'),'en').slice(0,3);
  const review=cards.map((w,i)=>{const other=bank.find(x=>norm(x.tr)!==norm(w.tr));const values=other?[w.tr,other.tr]:[w.tr];return {en:w.en,tr:w.tr,options:(number+i)%2?values.reverse():values};});
  const tasks=[
   {kind:'teach',label:'Dinle ve Öğren',cards},
   {kind:'teach',label:'Dinle ve Öğren',cards},
   choice('Anlamı keşfet',at(0),'tr',at(0).en,{audio:at(0).en,language:'en'}),
   choice('Dinle ve bul',at(1),'en','Dinle, duyduğun ifadeyi seç.',{audio:at(1).en}),
   choice('İngilizcesini bul',at(2),'en',at(2).tr,{promptAudio:at(2).tr}),
   {kind:'match',label:'Eşleştir',prompt:'Önce kelimeye, sonra karşılığına dokun.',pairs:pairBank,explanation:'İfadeleri eşleştirdin.'},
   choice('Günlük hayatta kullan',at(0),'en','“'+at(0).tr+'” demek için hangisini seçersin?',{promptAudio:at(0).tr}),
   fill,
   {kind:'order',label:multi?'Cümleyi kur':'Kelimeyi kur',prompt:phrase.tr,promptAudio:phrase.tr,tokens:multi?pieces:[...phrase.en],join:multi?' ':'',answer:phrase.en,explanation:phrase.en+' — '+phrase.tr},
   choice('Bu dersten hatırla',at(3),'tr',at(3).en,{audio:at(3).en,language:'en'}),
   {kind:'letters',label:'Harfleri tamamla',prompt:'Eksik harfleri tamamla.',support:phrase.tr,en:phrase.en,tr:phrase.tr,missing,tokens,answer:phrase.en,explanation:phrase.en+' — '+phrase.tr},
   {kind:'review',label:'Son tekrar',prompt:'Bu bölümde öğrendiklerin',cards:review,explanation:'Bölümün kelimelerini tekrar ettin.'}
  ];
  return tasks.map(t=>({...t,schoolVersion:9}));
 }
 function grade(task,answer){
  if(answer&&answer.mistake===true)return {valid:true,correct:false,complete:false};
  if(task.kind==='teach')return {valid:answer===true,correct:answer===true,complete:answer===true};
  if(task.kind==='review'){const valid=Array.isArray(answer)&&answer.length===task.cards.length&&task.cards.every((c,i)=>c.options.includes(answer[i]));return {valid,complete:valid,correct:valid&&task.cards.every((c,i)=>answer[i]===c.tr)};}
  if(task.kind==='match'){const valid=Array.isArray(answer)&&answer.every(p=>p&&typeof p.en==='string'&&typeof p.tr==='string');const correct=valid&&answer.length===task.pairs.length&&new Set(answer.map(p=>norm(p.en))).size===task.pairs.length&&task.pairs.every(p=>answer.some(a=>norm(a.en)===norm(p.en)&&norm(a.tr)===norm(p.tr)));return {valid,correct,complete:correct};}
  const valid=typeof answer==='string'&&answer.length>0&&answer.length<=1000&&(task.kind!=='choice'||task.options.includes(answer));const correct=valid&&norm(answer)===norm(task.answer);return {valid,correct,complete:correct};
 }
 return Object.freeze({build,grade,norm});
});
