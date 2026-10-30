// Google signs the original encoded query before &signature=. Never reserialize it.
const decoder = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
export function derToRaw(der) {
 let at=0;
 if(der[at++]!==0x30 || der[at++]!==der.length-2)throw Error('Bad ECDSA sequence');
 const raw=new Uint8Array(64);
 for(let part=0;part<2;part++) {
  if(der[at++]!==2)throw Error('Bad ECDSA integer');
  const size=der[at++];let n=der.slice(at,at+size);at+=size;
  if(!size || n.length!==size || n[0]&128)throw Error('Bad ECDSA length');
  if(n.length===33 && n[0]===0)n=n.slice(1);
  if(n.length>32)throw Error('Bad ECDSA width');
  raw.set(n,part*32+32-n.length);
 }
 if(at!==der.length)throw Error('Trailing ECDSA bytes');return raw;
}
export async function verifyCallback(url, getKey) {
 const raw=new URL(url).search.slice(1);
 if(raw.length>8192)throw Error('Query too large');
 const p=new URLSearchParams(raw), names=[...p.keys()];
 if(new Set(names).size!==names.length)throw Error('Duplicate parameter');
 const pos=raw.indexOf('&signature=');
 if(pos<1 || !/^&signature=[^&]+&key_id=\d+$/.test(raw.slice(pos)))throw Error('Bad signature layout');
 const key=await getKey(p.get('key_id'));
 const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,derToRaw(decoder(p.get('signature'))),new TextEncoder().encode(raw.slice(0,pos)));
 if(!ok)throw Error('Invalid signature');return p;
}
let cached=new Map(), fetchedAt=0, inflight=null;
export async function googleKey(id) {
 if(!/^\d{1,20}$/.test(id||''))throw Error('Bad key');
 if(!cached.has(id)||Date.now()-fetchedAt>86400000) {
  if(!inflight)inflight=(async()=>{
   // Bound unknown-key refreshes to one per minute (one cold fetch per isolate).
   if(fetchedAt && Date.now()-fetchedAt<60000)throw Error('Unknown key');
   const r=await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json',{signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('Key server unavailable');const data=await r.json(), next=new Map();
   for(const k of data.keys||[]) {
    const pem=k.pem.replace(/-----[^-]+-----|\s/g,'');
    next.set(String(k.keyId),await crypto.subtle.importKey('spki',decoder(pem),{name:'ECDSA',namedCurve:'P-256'},false,['verify']));
   }
   if(!next.size)throw Error('Empty key set');cached=next;fetchedAt=Date.now();
  })().finally(()=>{inflight=null;});
  await inflight;
 }
 if(!cached.has(id))throw Error('Unknown key');return cached.get(id);
}
