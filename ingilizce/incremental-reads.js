(()=>{'use strict';
 const endpoint='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',entries=new Map(),pending=new Map();
 function token(op){const input={method:'POST',body:JSON.stringify({islem:op})};return window.dmTeacherRequestToken?.(endpoint,input)||sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'';}
 async function read(kind,op,name='',options={}){
  const t=token(op),key=kind+'|'+t+'|'+name;if(pending.has(key))return pending.get(key);
  const old=entries.get(key),task=(async()=>{
   const body={islem:op,t,...(name?{ogrenci:name}:{}),...(kind==='chat'?{delta:'1',cursor:old&&Date.now()-(old.fullAt||0)<300000?old.version:null}:kind==='feed'?{delta:'1',version:old?.version||''}:{profileDelta:'1',version:old?.version||''})};
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),...(kind==='profile'?{cache:'no-store'}:{}),...(options.signal?{signal:options.signal}:{})});
   const d=await r.json();if(!r.ok||d?.ok===false||d?.hata)throw Error(d.mesaj||'Veriler yenilenemedi.');if(t!==token(op))throw Error('Hesap değişti.');
   if(!d.delta)return d;
   const map=new Map(d.replace?[]:old?.rows||[]);
   if(kind==='chat'){for(const x of d.messages||[])map.set(x.id,x);}else{
    for(const id of d.removed||[])map.delete(id);
    for(const x of d.changes||[]){if(kind==='feed')map.set(x.k,x);else{const row={...(map.get(x.key)||{}),...x.set};for(const k of x.remove||[])delete row[k];map.set(x.key,row);}}
   }
   const order=d.order||[...map.keys()],rows=order.filter(id=>map.has(id)).map(id=>[id,map.get(id)]);
   if(kind==='chat'){rows.sort((a,b)=>Date.parse(a[1].tarih)-Date.parse(b[1].tarih)||a[0].localeCompare(b[0]));}
   if(entries.size>=30&&!entries.has(key))entries.delete(entries.keys().next().value);entries.set(key,{version:d.cursor||d.version,rows,fullAt:kind==='chat'&&body.cursor?old?.fullAt:Date.now()});
   const list=JSON.parse(JSON.stringify(rows.map(x=>x[1])));return kind==='feed'?{liste:list}:list;
  })();pending.set(key,task);try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}
 }
 window.dmIncrementalReads={chat:(op,name)=>read('chat',op,name),feed:()=>read('feed','akisTumu'),profile:options=>read('profile','', '',options)};
 document.addEventListener('dm:login',()=>entries.clear());
})();
