// Shared pure question construction, also used for guest practice. No storage or network.
export function shuffle(list,random=Math.random){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const sentence=(item,word)=>(item.before+(item.before&&!item.joinBefore?' ':'')+word+(item.after?' ':'')+item.after).replace(/\s+([.,!?])/g,'$1').replace(/^\p{L}/u,c=>c.toUpperCase());
const wordPalette=(topic,label)=>{const i=topic.options.indexOf(label);return i>=0?i%4:[...label].reduce((h,c)=>(h*31+c.codePointAt(0))>>>0,0)%4;};
export function buildQuestions(topic,game,random=Math.random){
 if(!topic?.games.includes(game))throw Error('Geçersiz konu oyunu.');
 const pick=(items,n)=>shuffle(items,random).slice(0,n);
 let rows;
 if(topic.type==='vocab')rows=pick(topic.items,game==='kova'?10:8).map(item=>({
  kind:game,en:item.en,tr:item.tr,icon:item.icon,color:item.color,
  options:shuffle([item,...pick(topic.items.filter(x=>x.en!==item.en),3)],random).map(x=>({id:x.en,label:game==='kova'?x.tr:x.en,icon:x.icon,color:x.color})),correct:item.en,
  // The wheel uses the same stable eight slices for all turns of this run.
 }));
 if(topic.type==='grammar')rows=pick(topic.items,10).map((item,i)=>{
  const options=item.options||topic.options;
  const falseCard=game==='dy'&&i%2===1;
  const shown=falseCard?pick(options.filter(x=>x!==item.answer),1)[0]:item.answer;
  return {kind:game,before:item.before,after:item.after,joinBefore:!!item.joinBefore,meaningRequired:!!item.meaningRequired,en:sentence(item,item.answer),tr:item.tr,
   context:item.context||'',sentence:falseCard&&item.falseSentence?item.falseSentence:sentence(item,shown),shown,answer:item.answer,rule:topic.rules[item.answer],
   options:game==='dy'?shuffle([{id:'false',label:'✗ Yanlış'},{id:'true',label:'✓ Doğru'}],random):shuffle(options.map(label=>({id:label,label,palette:wordPalette(topic,label)})),random),correct:game==='dy'?String(!falseCard):item.answer};
 });
 if(topic.type==='comm')rows=(game==='sohbet'?topic.chat.turns:pick(topic.situations,8)).map(item=>({
  ...item,kind:game,en:item.right,tr:game==='sohbet'?item.tr:item.rightTr,sceneTr:item.tr,
  options:shuffle([item.right,...item.wrong],random).map(label=>({id:label,label})),correct:item.right,
 }));
 if(game==='cark'){
  const chosen=rows.map(q=>topic.items.find(x=>x.en===q.en));
  rows.forEach(q=>{q.slices=chosen;q.slice=chosen.findIndex(x=>x.en===q.en);});
 }
 return rows;
}
export function answerKey(rows){return rows.map(q=>({correct:q.correct,allowed:q.options.map(o=>o.id)}));}
export function validPicks(key,picks){return Array.isArray(picks)&&picks.length===key.length&&picks.every((p,i)=>typeof p==='string'&&key[i].allowed.includes(p));}

