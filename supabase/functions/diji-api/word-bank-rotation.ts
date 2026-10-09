// Shared question rotation for Papi Wheel and Meteor.
// Persisted session decks make rotation survive sign-out and device changes.
const shuffle=<T>(items:T[]):T[]=>{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const norm=(s:any)=>String(s??'').trim().toLocaleLowerCase('en').replace(/\s+/g,' ');
export async function selectWordBankRound(db:any,owner:string,cls:number,unit:number,words:{en:string,tr:string}[],size=12){
 const unique=[...new Map(words.filter(w=>w.en&&w.tr).map(w=>[norm(w.en),w])).values()];
 if(!unique.length)return [];
 const counts=new Map(unique.map(w=>[norm(w.en),0]));
 const sources=['papi_wheel_sessions','papi_meteor_sessions'];
 const results=await Promise.all(sources.map(table=>db.from(table).select('deck').eq('actor_key',owner).eq('class_no',cls).eq('unit_no',unit).order('created_at',{ascending:false}).limit(300)));
 for(const r of results)if(r.error)throw r.error;
 for(const result of results)for(const session of result.data||[]){
  for(const w of Array.isArray(session.deck)?session.deck:[]){
   const key=norm(w.key||w.en||(w.direction==='tr-en'?w.answer:w.word));
   if(counts.has(key))counts.set(key,(counts.get(key)||0)+1);
  }
 }
 // Least-seen vocabulary comes first; shuffle ties on every run.
 return shuffle(unique).sort((a,b)=>(counts.get(norm(a.en))||0)-(counts.get(norm(b.en))||0)).slice(0,size);
}
