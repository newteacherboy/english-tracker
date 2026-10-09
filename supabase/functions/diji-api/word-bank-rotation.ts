// Shared question rotation for Papi Wheel and Meteor.
// Persisted session decks make rotation survive sign-out and device changes.
const shuffle=<T>(items:T[]):T[]=>{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const norm=(s:any)=>String(s??'').trim().toLocaleLowerCase('en').replace(/\s+/g,' ');
export async function selectWordBankRound(db:any,owner:string,cls:number,unit:number,words:{en:string,tr:string}[],size=12){
 const unique=[...new Map(words.filter(w=>w.en&&w.tr).map(w=>[norm(w.en),w])).values()];
 if(!unique.length)return [];
 const available=new Set(unique.map(w=>norm(w.en))),seen=new Set<string>();
 const sources=['papi_wheel_sessions','papi_meteor_sessions'];
 const results=await Promise.all(sources.map(table=>db.from(table).select('deck,created_at').eq('actor_key',owner).eq('class_no',cls).eq('unit_no',unit).order('created_at',{ascending:false}).limit(300)));
 // Fail closed on persistence failures, rather than silently losing rotation history.
 for(const r of results)if(r.error)throw r.error;
 const sessions=results.flatMap(r=>r.data||[]).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));
 for(const session of sessions){
  const keys=(Array.isArray(session.deck)?session.deck:[]).map((w:any)=>norm(w.key||w.en||(w.direction==='tr-en'?w.answer:w.word))).filter((key:string)=>available.has(key));
  // The latest complete pass is enough; older rounds belong to a previous cycle.
  if(keys.some((key:string)=>seen.has(key))&&seen.size>=available.size)break;
  for(const key of keys)seen.add(key);
 }
 let unused=shuffle(unique.filter(w=>!seen.has(norm(w.en))));
 // If all terms have been shown, start another shuffled cycle.
 if(!unused.length)unused=shuffle(unique);
 if(unused.length>=size)return unused.slice(0,size);
 const rest=shuffle(unique.filter(w=>!unused.some(u=>norm(u.en)===norm(w.en))));
 return unused.concat(rest.slice(0,size-unused.length));
}
