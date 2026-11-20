(function(){
  'use strict';
  if(window.dmRequestBudget||window.dmGuestMode)return;
  const native=window.fetch.bind(window),endpoint='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/';
  const content=new Set(['kelimelerGetir','dersKonuDetayGetir']);
  // [12 Kas 2026] Supabase yükü: JSON gövdeli POST'lar "application/json" ile gidince tarayıcı her adres için
  // önce ayrı bir OPTIONS (ön kontrol) isteği atıyor, bu da fonksiyonu ikinci kez çalıştırıyordu (~2.000/gün).
  // diji-api ve medupro-api gövdeyi türe bakmadan JSON olarak okur; başka başlık yoksa düz metin gönderilir.
  function simple(opt){
    if(!opt||String(opt.method||'GET').toUpperCase()!=='POST'||typeof opt.body!=='string')return opt;
    const h=new Headers(opt.headers||{});const names=Array.from(h.keys());
    if(names.some(n=>n!=='content-type'))return opt;
    const type=h.get('content-type')||'';if(type&&!/^application\/json\b/i.test(type))return opt;
    h.set('content-type','text/plain;charset=UTF-8');return {...opt,headers:h};
  }
  // Yazma/canlı istekler de adreste işlem adını taşısın: sunucu kayıtlarında hangi işlemin yük yaptığı görünür
  // (gövde aynen gider; sunucu önce gövdedeki islem'i okur).
  function tagged(input,d){if(String(d.opt?.method||'GET').toUpperCase()!=='POST'||d.op==='KOK')return input;try{const u=new URL(input,location.href);if(!u.searchParams.has('islem'))u.searchParams.set('islem',d.op);return u.href;}catch{return input;}}
  // Oturumsuz cihazdan kişisel işlemler sunucuya gitmeden reddedilir (sunucu da 403 veriyordu).
  const personal=new Set(['bildirimlerim','kaydet','safetyStudentNotices','safetyStatus','benimIstatistik','memberStatus','announcementInbox']);
  const reads=new Set(['bildirimlerim','ilerlemeOzet','enerjiDurumuGetir','duyurulariGetir',
    'sosyalOgrencilerGetir','ekVeriGetir','seviyeDurumu','seviyeLigListesi',
    'yayinOzellikleri','dersKonulariGetir','akisTumu','duellolarim','sosyalDurum',
    'aksesuarKatalog','oyunEslesmelerim','takipDavetListesi','kategorileriGetir','KOK','announcementInbox','teacherNotificationSummary','safetyStatus',
    'memberStatus','ogretmenBilgim','ogretmenSohbetListesi','sohbetGetir','benimIstatistik',
    'akisOlaylariGetir','odevlerim','etkinlikleriGetir','videolariGetir','buyuSeviyeIlerlemeGetir']);
  const liveReads=new Set(['oyunEslesmeDurum','aktifDurum']);
  // [18 Kas 2026] Supabase yükü: öğretmen panelinde sınıf (katılımcı) oturumunun sunucunun zaten reddettiği
  // kişisel işlemleri (günde ~1.100 istek, hepsi 403) sunucuya hiç gitmez; cevap sunucununkiyle aynıdır.
  // Liste sunucudaki portalOperationAllowed (supabase/functions/diji-api/teacher-portal.mjs) ile birebir aynıdır.
  const portalAlways=new Set(['kelimeCarkiBaslat','kelimeCarkiCevir','kelimeCarkiCevap','kelimeCarkiBitir','kelimeCarkiDurum','kelimeCarkiSiralama','','oturumBilgisi','cikis','sonGirisGuncelle','iletisimDurumu','memberStatus','wordReviewList','wordReviewAnswer','seviyeDurumu','sosyalOgrencilerGetir','kelimeleriGetir','kelimeHavuzuGetir','tumKelimeleriGetir','seviyeOyunOdulu','enerjiDurumuGetir','publicCatalogVersion','kelimelerGetir','kategorileriGetir','dogruYanlisSorulariGetir','etkinlikTanimlariGetir','konusmaEsAnlamlarGetir','companionDialogueOpen','companionDialogueAnswer','enerjiDegistir','okumaHiziKaydet','okumaGecmisGetir','dersKonulariGetir','dersKonuDetayGetir','dersTestSonucKaydet','dersBilmiyordumToggle','companionSummary','companionDialogues','dialogueList','dialogueStart','dialogueAnswer','dialogueComplete','reviewList','reviewAnswer','companionReview','companionDialogue','companionDialogueComplete']);
  function portalAllowed(op,b){
    if(portalAlways.has(op))return true;
    if(op==='ekVeriGetir')return ['yo','seviye','oyun'].includes(b.anahtar);
    if(op==='ekVeriKaydet')return b.anahtar==='yo';
    if(op==='ekonomi')return ['durum','odulTalep','oyunGiris','enerjiHarca','jokerKullan'].includes(b.is);
    return /^(verifiedGame(Start|Answer|Status)|mola(Durum|Baslat|Bitir|Siralama|BolumGec)|konuOyun(Baslat|Cevap|Bitir|Durum|Siralama)|papi(Kart|Cards)|meteor|wheel|papiWheel|papiMeteor|ralli)/.test(op)||/^(kelime|jeopardy|bosluk|hafiza|yagmur|asmaca|kelimebul|eslestirme|tren|dikte|cumle|harfBahcesi|canavar|kule|fener|konusma).*(LiderlikKaydet|LiderlikGetir|LiderlikTumunuGetir|Liderlik)$/.test(op);
  }
  function portalDenied(d,input,opt){
    if(!window.dmTeacherPortalMode||!d.url.pathname.endsWith('/diji-api'))return false;
    let role='';try{role=window.dmTeacherRequestRole?.(input,opt)||'';}catch{return false;}
    if(role!=='participant')return false;
    // GET isteğinde çağıran açıkça başka bir jeton verdiyse sunucu onu kullanır: dokunma.
    const method=String(opt?.method||'GET').toUpperCase();
    if(method!=='POST'&&d.args.t&&d.args.t!==d.token)return false;
    const op=d.op==='KOK'?'':d.op;
    return !portalAllowed(op,d.args);
  }
  // Requests that change nothing other cached reads depend on: send them, but keep the cache.
  const passive=new Set(['kaydet','iletisimDurumu','yeniPuanBildirimleriGetir','sonGirisGuncelle']);
  const batchable=new Set(['bildirimlerim','ilerlemeOzet','enerjiDurumuGetir','duyurulariGetir',
    'sosyalOgrencilerGetir','ekVeriGetir','seviyeDurumu','seviyeLigListesi','yayinOzellikleri','dersKonulariGetir']);
  // [Kota 27 Eki 2026] Bildirim/duyuru yoklaması seyreltildi: her dakika yerine ~2 dk (bildirim) ve 5 dk (duyuru).
  const ttl={bildirimlerim:110000,ilerlemeOzet:30000,enerjiDurumuGetir:15000,
    duyurulariGetir:300000,sosyalOgrencilerGetir:60000,seviyeDurumu:30000,
    seviyeLigListesi:60000,yayinOzellikleri:300000,akisTumu:15000,KOK:20000,
    sosyalDurum:30000,takipDavetListesi:30000,oyunEslesmelerim:10000,aksesuarKatalog:300000,announcementInbox:300000,teacherNotificationSummary:110000,
    safetyStatus:300000,memberStatus:30000,ogretmenBilgim:60000,ogretmenSohbetListesi:15000,
    sohbetGetir:10000,benimIstatistik:60000,akisOlaylariGetir:60000,odevlerim:60000,
    etkinlikleriGetir:60000,videolariGetir:60000,buyuSeviyeIlerlemeGetir:30000};
  const memory=new Map(),pending=new Map(),failures=new Map(),queues=new Map();
  const stats={network:0,cacheHits:0,joined:0,batches:0,batchItems:0,backoffHits:0};
  let generation=0,identity='',batchDisabled=false;
  const storagePrefix='dm_content_budget_v2:';
  function actor(){try{return (sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'')+'|'+(localStorage.getItem('ing_aktifOgrenci')||'');}catch{return '';}}
  function clear(){generation++;for(const [key,s] of memory)if(!s.publicContent)memory.delete(key);pending.clear();failures.clear();}
  function snapshot(r,text){return {text,status:r.status,headers:Array.from(r.headers.entries()),at:Date.now()};}
  function response(s){return new Response(s.text,{status:s.status,headers:s.headers});}
  function good(s){if(s.status!==200)return false;try{const d=JSON.parse(s.text);return !d||Array.isArray(d)||(d.ok!==false&&d.status!=='error'&&!d.hata);}catch{return false;}}
  function persistentKey(d){return storagePrefix+d.url.pathname+'|'+JSON.stringify(Object.entries(d.args).filter(([k])=>!['t','_','_contentVersion'].includes(k)).sort());}
  function stored(d){if(!content.has(d.op))return null;try{const s=JSON.parse(localStorage.getItem(persistentKey(d))||'null');return s&&s.status===200&&Date.now()-s.at<30*86400000?s:null;}catch{return null;}}
  function persist(d,s){if(!content.has(d.op)||s.text.length>1500000)return;try{const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(storagePrefix))keys.push(k);}if(keys.length>=40&&!keys.includes(persistentKey(d)))localStorage.removeItem(keys[0]);localStorage.setItem(persistentKey(d),JSON.stringify(s));}catch{}}
  function describe(input,opt){
    // Preserve Request objects, custom cancellation and uncommon fetch semantics.
    if(typeof input!=='string')return null;
    const url=new URL(input,location.href);if(!url.href.startsWith(endpoint)||!['diji-api','medupro-api'].includes(url.pathname.split('/').pop()))return null;
    const method=String(opt?.method||'GET').toUpperCase();if(!['GET','POST'].includes(method))return null;
    let args=Object.fromEntries(url.searchParams);if(method==='POST'){if(typeof opt?.body!=='string')return null;try{args={...args,...JSON.parse(opt.body)};}catch{return null;}}
    const op=String(args.islem||'KOK');
    const roleToken=window.dmTeacherPortalMode?window.dmTeacherRequestToken?.(input,opt)||actor().split('|')[0]:args.t||actor().split('|')[0];
    // Headers/tokens are part of identity. Never share one account's response.
    const headers=Array.from(new Headers(opt?.headers||{}).entries()).sort();
    const key=url.pathname+'|'+roleToken+'|'+actor()+'|'+JSON.stringify(headers)+'|'+JSON.stringify(Object.entries(args).filter(([k])=>!['t','_','_contentVersion'].includes(k)).map(([k,v])=>[k,typeof v==='object'?v:String(v)]).sort());
    return {input,opt,url,args,op,key,bypass:!!(opt?.keepalive||opt?.cache==='no-store'),isolated:!!opt?.signal,token:roleToken,force:'_' in args||opt?.cache==='reload'};
  }
  function direct(d,old){
    let input=d.input,opt=d.opt;
    if(!d.skipCDN&&content.has(d.op)&&window.dmPublicCatalog){
      return window.dmPublicCatalog.get(d.op,d.args,{signal:opt?.signal,force:d.force}).catch(e=>{if(opt?.signal?.aborted)throw e;return null;}).then(async r=>r?snapshot(r,await r.text()):direct({...d,skipCDN:true},old));
    }
    if(d.op==='kelimelerGetir'){
      if(String(opt?.method||'GET').toUpperCase()==='POST'){opt={...opt,body:JSON.stringify({...d.args,compact:'1'})};}
      else{const u=new URL(input,location.href);u.searchParams.set('compact','1');input=u.href;}
    }
    if(old&&d.op!=='KOK'&&content.has(d.op)&&String(d.opt?.method||'GET').toUpperCase()==='GET'){
      const version=new Headers(old.headers).get('X-Diji-Content-Version');
      if(version){const u=new URL(input,location.href);u.searchParams.set('_contentVersion',version);input=u.href;}
    }
    if(String(opt?.method||'GET').toUpperCase()==='POST'){const u=new URL(input,location.href);if(d.op!=='KOK')u.searchParams.set('islem',d.op);input=u.href;}
    stats.network++;
    return native(input,simple(opt)).then(async r=>{
      if(r.status===304&&old)return {...old,at:Date.now()};
      return snapshot(r,await r.text());
    });
  }
  // [Kota 27 Eki 2026] Bildirim ve duyuru, Edge Function yerine doğrudan veritabanı fonksiyonundan okunur.
  // Sunucu aynı kuralları uygular; yalnız sıradan öğrenci oturumunu cevaplar, diğer her durumda
  // {fallback:true} döner ve istek eski diji-api yoluna gider. Hata/ağ sorununda da eski yol kullanılır.
  const rpcReads={
    bildirimlerim:{fn:'dm_read_bildirimler',body:a=>({p_ogrenci:String(a.ogrenci??''),p_tumu:String(a.tumu??'')==='1'})},
    duyurulariGetir:{fn:'dm_read_duyuru',body:a=>({p_ogrenci:String(a.ogrenci??'')})},
    // League standings must use the authoritative public ranking endpoint, not the legacy block-filtering RPC.
    ekVeriGetir:{fn:'dm_read_ekveri',body:a=>({p_ogrenci:String(a.ogrenci??''),p_anahtar:String(a.anahtar??'')}),
      out:(x,a)=>window.dmRpcReadTransforms?.ekVeri?window.dmRpcReadTransforms.ekVeri(x,String(a.anahtar??''),String(a.anahtar??'')==='yo'&&String(a.tanitim??'')==='1'):undefined}
  };
  let rpcDisabled=false;
  async function viaRpc(d){
    const spec=rpcReads[d.op];
    if(!spec||rpcDisabled||window.dmTeacherPortalMode||!d.url.pathname.endsWith('/diji-api')||!d.token)return null;
    if(spec.out&&!window.dmRpcReadTransforms)return null;
    let key='';try{key=typeof SUPABASE_ANON_KEY!=='undefined'?SUPABASE_ANON_KEY:'';}catch{}
    if(!key)return null;
    try{
      const r=await native(endpoint.replace('/functions/v1/','/rest/v1/rpc/')+spec.fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:key},body:JSON.stringify({p_t:d.token,...spec.body(d.args)}),signal:d.opt?.signal});
      if(r.status===404){rpcDisabled=true;return null;}
      if(!r.ok)return null;
      const out=await r.json();
      if(!out||out.fallback||!('data' in out))return null;
      const value=spec.out?spec.out(out.data,d.args):out.data;
      if(value===undefined)return null;
      stats.rpc=(stats.rpc||0)+1;
      return {text:JSON.stringify(value),status:200,headers:[['Content-Type','application/json']],at:Date.now()};
    }catch(e){if(d.opt?.signal?.aborted)throw e;return null;}
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
        const base=part[0].d,u=new URL(base.url);u.search='';u.searchParams.set('islem','okumaGrubu');
        const headers=new Headers(base.opt?.headers||{});headers.set('Content-Type',Array.from(headers.keys()).every(n=>n==='content-type')?'text/plain;charset=UTF-8':'application/json');
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
  // [18 Kas 2026] Bu fonksiyonlar gövdeyi türüne bakmadan JSON okur: yalnız Content-Type başlığı olan POST'lar düz metin
  // gönderilir, böylece her çağrıdan önceki ayrı OPTIONS (ön kontrol) çağrısı oluşmaz (günde ~350).
  const plainBodyFunctions=new Set(['premium-games','thematic-learning','papi-rewards']);
  function plainBody(input){try{if(typeof input!=='string'||!input.startsWith(endpoint))return false;return plainBodyFunctions.has(new URL(input).pathname.split('/').pop());}catch{return false;}}
  // A cosmetic notice based exclusively on authenticated server league XP.
  let leagueTimer=0,leagueBusy=false,leagueQueued=false,leagueSeen='';
  let leagueCheckedAt=0,leagueCheckedActor='';
  function leagueDay(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function leagueNotice(d){
    if(document.hidden||!document.body||window.dmTeacherPortalMode||d.day!==leagueDay())return;
    const key='dm_league_cap_notice:'+d.account;
    try{if(localStorage.getItem(key)===d.day)return;}catch{}
    if(leagueSeen===key+':'+d.day)return;
    leagueSeen=key+':'+d.day;
    try{localStorage.setItem(key,d.day);}catch{}
    const el=document.createElement('aside');el.setAttribute('role','status');
    el.style.cssText='position:fixed;z-index:2147483000;top:calc(env(safe-area-inset-top, 0px) + 10px);left:50%;width:min(92vw,450px);box-sizing:border-box;background:#302344;color:#fff;border:1px solid #e9b94f;border-radius:18px;padding:14px 36px 14px 16px;box-shadow:0 6px 24px #0004;font:inherit;transform:translate(-50%,-150%);transition:transform .25s ease;line-height:1.4';
    const title=document.createElement('strong');title.textContent='🏆 Günlük XP sınırına ulaştın! 🎉';
    const msg=document.createElement('div');msg.style.cssText='font-size:13px;margin-top:5px';msg.textContent="Bugün haftalık ligde 3.500 XP'ye ulaştın. Kazandığın XP'ler genel sıralamana eklenmeye devam edecek. Yarın haftalık lig için yeniden XP toplamaya başlayabilirsin!";
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Bildirimi kapat');close.style.cssText='position:absolute;right:8px;top:8px;background:transparent;border:0;color:inherit;font-size:24px;cursor:pointer';
    close.onclick=()=>el.remove();el.append(title,msg,close);document.body.append(el);
    requestAnimationFrame(()=>{el.style.transform='translate(-50%,0)';});setTimeout(()=>el.remove(),6000);
  }
  function scheduleLeague(){
    if(window.dmTeacherPortalMode||document.hidden||!actor().split('|')[0])return;
    if(leagueCheckedActor===actor()&&Date.now()-leagueCheckedAt<60000)return;
    clearTimeout(leagueTimer);leagueTimer=setTimeout(checkLeague,1200);
  }
  async function checkLeague(){
    if(leagueBusy){leagueQueued=true;return;}
    const id=actor(),token=id.split('|')[0];if(!token||document.hidden||window.dmTeacherPortalMode)return;
    let key='';try{key=typeof SUPABASE_ANON_KEY!=='undefined'?SUPABASE_ANON_KEY:'';}catch{}
    if(!key)return;
    leagueBusy=true;leagueCheckedActor=id;leagueCheckedAt=Date.now();
    try{
      const r=await native(endpoint.replace('/functions/v1/','/rest/v1/rpc/')+'dm_daily_league_notice',{method:'POST',headers:{'Content-Type':'application/json',apikey:key},body:JSON.stringify({p_t:token})});
      if(r.ok&&id===actor()){const d=await r.json();if(d?.reached===true&&typeof d.account==='string'&&id===actor())leagueNotice(d);}
    }catch{}finally{leagueBusy=false;if(leagueQueued){leagueQueued=false;scheduleLeague();}}
  }
  window.fetch=async function(input,opt){
    if(plainBody(input)){const r=await native(input,simple(opt));if(r.ok)scheduleLeague();return r;}
    let d;try{d=describe(input,opt);}catch{return native(input,opt);}
    if(!d)return native(input,opt);
    const current=actor();if(current!==identity){identity=current;clear();}
    if(portalDenied(d,input,opt)){stats.portalSkips=(stats.portalSkips||0)+1;return new Response(JSON.stringify({ok:false,mesaj:'Bu işlem için kişisel hesabına geç.'}),{status:403,headers:{'Content-Type':'application/json'}});}
    if(!d.token&&!window.dmTeacherPortalMode&&personal.has(d.op))return new Response(JSON.stringify({ok:false,mesaj:'Bu işlem için kişisel hesabın gerekli.'}),{status:403,headers:{'Content-Type':'application/json'}});
    if(liveReads.has(d.op)||passive.has(d.op))return native(tagged(input,d),simple(opt));
    if(!reads.has(d.op)&&!content.has(d.op)){
      // All writes, rewards, login and live match/presence requests go straight
      // through. Invalidate before AND after to avoid a read/write race.
      clear();try{const r=await native(tagged(input,d),simple(opt));if(r.ok)scheduleLeague();return r;}finally{clear();}
    }
    if(d.bypass)return native(tagged(input,d),simple(opt));
    if(d.opt?.signal?.aborted)throw d.opt.signal.reason||new Error('Request aborted');
    const old=memory.get(d.key)||stored(d),age=old?Date.now()-old.at:Infinity;
    const duration=content.has(d.op)?(window.dmPublicCatalog?300000:86400000):(ttl[d.op]||0);
    if(!d.force&&old&&(age<duration||document.hidden&&Object.hasOwn(ttl,d.op))){stats.cacheHits++;return response(old);}
    const failed=failures.get(d.key);
    if(!d.force&&failed&&Date.now()<failed.until){stats.backoffHits++;if(failed.snapshot)return response(failed.snapshot);throw failed.error;}
    if(!d.force&&!d.isolated&&pending.has(d.key)){stats.joined++;return response(await pending.get(d.key));}
    const version=generation;
    const task=(async()=>{
      try{
        if(document.hidden&&!d.force&&Object.hasOwn(ttl,d.op))await new Promise((resolve,reject)=>{const signal=d.opt?.signal;const cleanup=()=>{document.removeEventListener('visibilitychange',resume);signal?.removeEventListener('abort',abort);};const resume=()=>{if(!document.hidden){cleanup();resolve();}};const abort=()=>{cleanup();reject(signal.reason||new Error('Request aborted'));};document.addEventListener('visibilitychange',resume);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();});
        const s=await viaRpc(d)||await (!d.force&&!d.isolated&&!batchDisabled&&d.url.pathname.endsWith('/diji-api')&&batchable.has(d.op)?enqueue(d):direct(d,old));
        if(version===generation||content.has(d.op)){
          if(good(s)){s.publicContent=content.has(d.op);if(memory.size>=300)memory.delete(memory.keys().next().value);memory.set(d.key,s);persist(d,s);failures.delete(d.key);}
          else if([200,401,403,429].includes(s.status)||s.status>=500){const count=(failed?.count||0)+1;failures.set(d.key,{count,until:Date.now()+Math.min(60000,15000*2**(count-1)),snapshot:s});}
        }
        return s;
      }catch(e){if(version===generation&&!d.opt?.signal?.aborted)failures.set(d.key,{count:(failed?.count||0)+1,until:Date.now()+30000,error:e});throw e;}
    })();
    if(!d.force&&!d.isolated)pending.set(d.key,task);
    try{return response(await task);}finally{if(pending.get(d.key)===task)pending.delete(d.key);}
  };
  // Debug counters contain no user names, tokens, payloads or balances.
  window.dmRequestBudget={stats,clear};
  // Fresh TTLs remain useful after returning to a tab; identity changes still clear private data.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){failures.clear();scheduleLeague();}});
  window.addEventListener('storage',()=>{if(actor()!==identity){identity=actor();clear();}});
})();
