// Current authorization and filtering run before this transfer-only cache.
export function deltaReads({maxEntries=120,maxBytes=7000000,now=()=>Date.now()}={}){
 const entries=new Map();let bytes=0;
 const drop=key=>{const v=entries.get(key);if(v){bytes-=v.bytes;entries.delete(key);}};
 return async function(kind,scope,previous,rows){
  const text=JSON.stringify(rows),version=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const prefix=kind+'|'+scope+'|',old=entries.get(prefix+previous);
  const base=old&&now()-old.at<300000?old.rows:null,keyOf=x=>String(kind==='feed'?x.k:x.ogrenci);
  const current=JSON.parse(text),oldMap=new Map((base||[]).map(x=>[keyOf(x),x])),next=new Map(current.map(x=>[keyOf(x),x]));
  const changes=[];
  for(const row of current){const id=keyOf(row),before=oldMap.get(id);if(JSON.stringify(before)===JSON.stringify(row))continue;
   if(kind==='feed')changes.push(row);else{const set={},remove=[];for(const [k,v] of Object.entries(row))if(!before||JSON.stringify(before[k])!==JSON.stringify(v))set[k]=v;for(const k of Object.keys(before||{}))if(!(k in row))remove.push(k);changes.push({key:id,set,remove});}
  }
  const removed=[...oldMap.keys()].filter(k=>!next.has(k)),same=!!base&&version===previous;
  const size=new TextEncoder().encode(text).byteLength,key=prefix+version;
  if(size<=maxBytes){if(entries.has(key))drop(key);for(const [k,v] of entries)if(now()-v.at>=300000)drop(k);while(entries.size>=maxEntries||bytes+size>maxBytes)drop(entries.keys().next().value);entries.set(key,{rows:current,bytes:size,at:now()});bytes+=size;}
  return {delta:true,replace:!base,version,changes,removed,...(!same?{order:current.map(keyOf)}:{})};
 };
}
