/* Public curriculum only; private progress, answers and sessions never enter the CDN. */
(()=>{'use strict';
 const native=window.fetch.bind(window),base=new URL('data/public-catalog/',location.href),api='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
 let manifest=null,manifestAt=0;const files=new Map(),versions=new Map();
 const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 async function getJSON(url,options={}){const r=await native(url,{...options,referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Catalog unavailable');const text=await r.text();if(text.length>2500000)throw Error('Catalog too large');return {text,data:JSON.parse(text)};}
 async function load(op,args,force){
  if(!['kelimelerGetir','dersKonuDetayGetir'].includes(op))return null;
  const key=op==='kelimelerGetir'?'words':JSON.stringify([args.seviye||'',args.kategori||'',args.konu||'']);
  let check=versions.get(key);
  if(force||!check||Date.now()-check.at>=300000){const u=new URL(api);u.searchParams.set('islem','publicCatalogVersion');const body={islem:'publicCatalogVersion',kind:key==='words'?'words':'lesson'};for(const k of ['seviye','kategori','konu'])if(args[k])body[k]=args[k];const v=(await getJSON(u.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).data;if(!v.ok||!/^[a-f0-9]{64}$/.test(v.version))throw Error('Version unavailable');check={version:v.version,at:Date.now()};versions.set(key,check);}
  if(!manifest||Date.now()-manifestAt>=300000||force){manifest=(await getJSON(new URL('manifest.json',base).href)).data;manifestAt=Date.now();}
  const entry=key==='words'?manifest.words:manifest.topics?.[key];if(!entry||entry.version!==check.version){manifestAt=0;return null;}
  const spec=key==='words'||entry.file?entry:manifest.levels?.[entry.level];if(!spec||!/^[a-f0-9]{64}\.json$/.test(spec.file)||spec.sha!==spec.file.slice(0,-5))throw Error('Invalid catalog path');
  let contents=files.get(spec.file);if(!contents){const fetched=await getJSON(new URL(spec.file,base).href);if(await digest(fetched.text)!==spec.sha)throw Error('Catalog integrity mismatch');contents=fetched;files.set(spec.file,contents);if(files.size>8)files.delete(files.keys().next().value);}
  const data=key==='words'||entry.file?contents.data:contents.data[key];if(data===undefined)return null;const text=JSON.stringify(data);if(await digest(text)!==check.version)throw Error('Content version mismatch');
  return new Response(text,{headers:{'Content-Type':'application/json','X-Diji-Content-Version':check.version,'X-Diji-Public-CDN':'1'}});
 }
 window.dmPublicCatalog={async get(op,args,{signal,force=false}={}){
  if(signal?.aborted)throw signal.reason;const task=load(op,args,force);if(!signal)return task;
  return new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason||new Error('Request aborted'));signal.addEventListener('abort',abort,{once:true});task.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
 }};
})();
