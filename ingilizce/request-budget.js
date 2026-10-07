(function(){
  'use strict';
  if(window.dmRequestBudget||window.dmGuestMode)return;
  const native=window.fetch.bind(window),endpoint='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/';
  const content=new Set(['kelimelerGetir','dersKonuDetayGetir']);
  const reads=new Set(['bildirimlerim','ilerlemeOzet','enerjiDurumuGetir','duyurulariGetir',
    'sosyalOgrencilerGetir','ekVeriGetir','seviyeDurumu','seviyeLigListesi',
    'yayinOzellikleri','dersKonulariGetir','akisTumu','duellolarim','sosyalDurum',
    'aksesuarKatalog','oyunEslesmelerim','takipDavetListesi','kategorileriGetir','KOK']);
  const liveReads=new Set(['oyunEslesmeDurum','aktifDurum']);
  // Requests that change nothing other cached reads depend on: send them, but keep the cache.
  const passive=new Set(['kaydet','iletisimDurumu','yeniPuanBildirimleriGetir','sonGirisGuncelle']);
  const batchable=new Set(['bildirimlerim','ilerlemeOzet','enerjiDurumuGetir','duyurulariGetir',
    'sosyalOgrencilerGetir','ekVeriGetir','seviyeDurumu','seviyeLigListesi','yayinOzellikleri','dersKonulariGetir']);
  const ttl={bildirimlerim:55000,ilerlemeOzet:30000,enerjiDurumuGetir:15000,
    duyurulariGetir:60000,sosyalOgrencilerGetir:60000,seviyeDurumu:30000,
    seviyeLigListesi:60000,yayinOzellikleri:30000,akisTumu:15000,KOK:20000,
    sosyalDurum:30000,takipDavetListesi:30000,oyunEslesmelerim:10000,aksesuarKatalog:300000};
  const memory=new Map(),pending=new Map(),failures=new Map(),queues=new Map();
  const stats={network:0,cacheHits:0,joined:0,batches:0,batchItems:0,backoffHits:0};
  let generation=0,identity='',batchDisabled=false;
  const storagePrefix='dm_content_budget_v1:';
  function actor(){try{return (sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'')+'|'+(localStorage.getItem('ing_aktifOgrenci')||'');}catch{return '';}}
  function clear(){generation++;memory.clear();pending.clear();failures.clear();}
  function snapshot(r,text){return {text,status:r.status,headers:Array.from(r.headers.entries()),at:Date.now()};}
  function response(s){return new Response(s.text,{status:s.status,headers:s.headers});}
  function good(s){if(s.status!==200)return false;try{const d=JSON.parse(s.text);return !d||Array.isArray(d)||(d.ok!==false&&d.status!=='error'&&!d.hata);}catch{return false;}}
  function persistentKey(d){return storagePrefix+d.url.pathname+'|'+JSON.stringify(Object.entries(d.args).filter(([k])=>!['t','_','_contentVersion'].includes(k)).sort());}
  function stored(d){if(!content.has(d.op))return null;try{const s=JSON.parse(localStorage.getItem(persistentKey(d))||'null');return s&&s.status===200&&Date.now()-s.at<86400000?s:null;}catch{return null;}}
  function persist(d,s){if(!content.has(d.op)||s.text.length>1500000)return;try{const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(storagePrefix))keys.push(k);}if(keys.length>=40&&!keys.includes(persistentKey(d)))localStorage.removeItem(keys[0]);localStorage.setItem(persistentKey(d),JSON.stringify(s));}catch{}}
  function describe(input,opt){
    // Preserve Request objects, custom cancellation and uncommon fetch semantics.
    if(typeof input!=='string')return null;
    const url=new URL(input,location.href);if(!url.href.startsWith(endpoint)||!['diji-api','medupro-api'].includes(url.pathname.split('/').pop()))return null;
    const method=String(opt?.method||'GET').toUpperCase();if(!['GET','POST'].includes(method))return null;
    let args=Object.fromEntries(url.searchParams);if(method==='POST'){if(typeof opt?.body!=='string')return null;try{args={...args,...JSON.parse(opt.body)};}catch{return null;}}
    const op=String(args.islem||'KOK');
    const roleToken=actor().split('|')[0];
    // Headers/tokens are part of identity. Never share one account's response.
    const headers=Array.from(new Headers(opt?.headers||{}).entries()).sort();
    const key=url.pathname+'|'+(args.t||roleToken)+'|'+actor()+'|'+JSON.stringify(headers)+'|'+JSON.stringify(Object.entries(args).filter(([k])=>!['t','_','_contentVersion'].includes(k)).map(([k,v])=>[k,typeof v==='object'?v:String(v)]).sort());
    return {input,opt,url,args,op,key,bypass:!!(opt?.signal||opt?.keepalive||opt?.cache==='no-store'),token:args.t||roleToken,force:'_' in args||opt?.cache==='reload'};
  }
  function direct(d,old){
    let input=d.input;
    if(old&&d.op!=='KOK'&&content.has(d.op)&&String(d.opt?.method||'GET').toUpperCase()==='GET'){
      const version=new Headers(old.headers).get('X-Diji-Content-Version');
      if(version){const u=new URL(input,location.href);u.searchParams.set('_contentVersion',version);input=u.href;}
    }
    stats.network++;
    return native(input,d.opt).then(async r=>{
      if(r.status===304&&old)return {...old,at:Date.now()};
      return snapshot(r,await r.text());
    });
  }
  function enqueue(d){
    const group=d.url.pathname+'|'+d.token+'|'+actor()+'|'+JSON.stringify(Array.from(new Headers(d.opt?.headers||{}).entries()).sort());
    return new Promise((resolve,reject)=>{
      let queue=queues.get(group);if(!queue){queue=[];queues.set(group,queue);setTimeout(()=>flush(group,queue),25);}queue.push({d,resolve,reject});
    });
  }
  async function flush(group,queue){
    queues.delete(group);
    for(let start=0;start<queue.length;start+=8){
      const part=queue.slice(start,start+8);
      if(part.length===1||batchDisabled){part.forEach(x=>direct(x.d).then(x.resolve,x.reject));continue;}
      try{
        stats.network++;stats.batches++;stats.batchItems+=part.length;
        const base=part[0].d,u=new URL(base.url);u.search='';
        const headers=new Headers(base.opt?.headers||{});headers.set('Content-Type','application/json');
        const items=part.map(({d})=>Object.fromEntries(Object.entries(d.args).filter(([k])=>!['t','_','_contentVersion'].includes(k))));
        const r=await native(u.href,{method:'POST',headers,body:JSON.stringify({islem:'okumaGrubu',t:base.token,istekler:items})});
        const envelope=await r.json();
        if(!r.ok||!Array.isArray(envelope.results)||envelope.results.length!==part.length){
          // Compatibility fallback if a stale server does not know the bundle.
          batchDisabled=true;part.forEach(x=>direct(x.d).then(x.resolve,x.reject));continue;
        }
        envelope.results.forEach((x,i)=>part[i].resolve({text:x.body,status:x.status,headers:[['Content-Type','application/json']],at:Date.now()}));
      }catch(e){part.forEach(x=>x.reject(e));}
    }
  }
  window.fetch=async function(input,opt){
    let d;try{d=describe(input,opt);}catch{return native(input,opt);}
    if(!d)return native(input,opt);
    const current=actor();if(current!==identity){identity=current;clear();}
    if(liveReads.has(d.op)||passive.has(d.op))return native(input,opt);
    if(!reads.has(d.op)&&!content.has(d.op)){
      // All writes, rewards, login and live match/presence requests go straight
      // through. Invalidate before AND after to avoid a read/write race.
      clear();try{return await native(input,opt);}finally{clear();}
    }
    if(d.bypass)return native(input,opt);
    const old=memory.get(d.key)||stored(d),age=old?Date.now()-old.at:Infinity;
    const duration=content.has(d.op)?300000:(ttl[d.op]||0);
    if(!d.force&&old&&(age<duration||document.hidden&&Object.hasOwn(ttl,d.op))){stats.cacheHits++;return response(old);}
    const failed=failures.get(d.key);
    if(!d.force&&failed&&Date.now()<failed.until){stats.backoffHits++;if(failed.snapshot)return response(failed.snapshot);throw failed.error;}
    if(!d.force&&pending.has(d.key)){stats.joined++;return response(await pending.get(d.key));}
    const version=generation;
    const task=(async()=>{
      try{
        if(document.hidden&&!d.force&&Object.hasOwn(ttl,d.op))await new Promise(resolve=>{const resume=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',resume);resolve();}};document.addEventListener('visibilitychange',resume);});
        const s=await (!d.force&&!batchDisabled&&d.url.pathname.endsWith('/diji-api')&&batchable.has(d.op)?enqueue(d):direct(d,old));
        if(version===generation){
          if(good(s)){if(memory.size>=300)memory.delete(memory.keys().next().value);memory.set(d.key,s);persist(d,s);failures.delete(d.key);}
          else if([200,401,403,429].includes(s.status)||s.status>=500){const count=(failed?.count||0)+1;failures.set(d.key,{count,until:Date.now()+Math.min(60000,15000*2**(count-1)),snapshot:s});}
        }
        return s;
      }catch(e){if(version===generation)failures.set(d.key,{count:(failed?.count||0)+1,until:Date.now()+30000,error:e});throw e;}
    })();
    if(!d.force)pending.set(d.key,task);
    try{return response(await task);}finally{if(pending.get(d.key)===task)pending.delete(d.key);}
  };
  // Debug counters contain no user names, tokens, payloads or balances.
  window.dmRequestBudget={stats,clear};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)clear();});
  window.addEventListener('storage',()=>{if(actor()!==identity){identity=actor();clear();}});
})();
