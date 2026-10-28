/* The existing games keep rendering locally; answer evidence is acknowledged
   before any leaderboard or wallet claim can leave this page. */
(()=>{'use strict';
const runs=new Map(),decks=new Map(),who=()=>typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const key=v=>String(v??'').trim().toLowerCase();
const en=w=>String(w?.ingilizce??w?.en??w?.[0]??''),tr=w=>String(w?.turkce??w?.tr??w?.[1]??'');
const practice=()=>!who()||who().toLowerCase()==='teacher'||typeof siniftaOynananOgrenci!=='undefined'&&!!siniftaOynananOgrenci;
const queueKey=(owner,runId)=>'dm_verified_events:'+owner+':'+runId;
function pending(owner,runId){try{const d=JSON.parse(localStorage.getItem(queueKey(owner,runId))||'null');return d?.owner===owner&&d.createdAt>Date.now()-86400000&&Array.isArray(d.events)?d.events.slice(0,2000):[];}catch{return [];}}
function persist(s){try{const rest=s.events.slice(s.acked);if(rest.length)localStorage.setItem(queueKey(s.owner,s.runId),JSON.stringify({owner:s.owner,createdAt:Date.now(),events:rest}));else localStorage.removeItem(queueKey(s.owner,s.runId));}catch{}}
const originalFetch=window.fetch;
async function api(op,body,owner){if(who()!==owner)throw Object.assign(Error('Hesap değişti. Oyunu yeniden başlat.'),{status:409});const r=await originalFetch(apiURL,{method:'POST',body:JSON.stringify({islem:op,ogrenci:owner,...body})});const d=await r.json();if(!r.ok||d.ok===false||d.status==='error')throw Error(d.mesaj||d.message||'Cevap kaydedilemedi. Bağlantını kontrol et.');return d;}
function deck(game,words){decks.set(game,words);}
/* [Kota 29 Eki 2026] Ödül cevabıyla gelen sıradaki durak oturumu: 15 dk içinde o durak açılırsa başlatma isteği gönderilmez. */
const prefetched=new Map();
function prefetch(owner,d){if(!d?.runId||!d.stopNo||!Array.isArray(d.tasks))return;prefetched.set(owner+'|'+d.stopNo,{at:Date.now(),data:d});}
function nextRun(stopNo){const p=prefetched.get(who()+'|'+stopNo);if(!p)return null;if(Date.now()-p.at>15*60000){prefetched.delete(who()+'|'+stopNo);return null;}return p.data.runId;}
async function start(game,runId,scope,words){
 if(practice())return null;
 if(runs.has(runId)&&game==='ba'&&scope?.schoolVersion===9){await flush(runId);return api('verifiedGameStatus',{runId},who());}
 if(runs.has(runId)){
  try{return await runs.get(runId).ready;}
  catch{runs.delete(runId);}
 }
 words=words||decks.get(game)||[];
 const bank=window.masterKelimeHavuzu||[];
 const resolved=words.map(w=>bank.find(x=>key(en(x))===key(en(w))&&norm(tr(x))===norm(tr(w))&&(!scope?.classNo||Number(x.sinif)===Number(scope.classNo)))||w);
 const cls=Number(scope?.classNo||resolved[0]?.sinif||resolved[0]?.class_no||resolved[0]?.[3]);
 const scopedUnits=scope?.units?.map(Number).filter(u=>u>=1)||[];
 const units=[...new Set((scopedUnits.length?scopedUnits:resolved.map(w=>Number(w.unite??w.unit_no??w[4]))).map(Number))].sort((a,b)=>a-b);
 const state={owner:who(),runId,game,events:[...pending(who(),runId),...(early.get(runId)||[])],acked:0,slots:[],last:{},payload:{runId,game,classNo:cls,units,stopNo:scope?.stopNo||0,schoolVersion:scope?.schoolVersion,words:words.map(w=>({en:en(w),tr:tr(w)}))}};
 runs.set(runId,state);
 if(window.OC?.aktif?.runId===runId)window.OC.aktif.rewardScope={classNo:cls,units,stopNo:scope?.stopNo||0};
 early.delete(runId);const carried=state.events.length;
 // [Kota 28 Eki 2026] Önceki açılıştan kalmış gönderilmemiş cevaplar varsa önce onları gönder, sonra güncel cevapları al.
 const pre=prefetched.get(state.owner+'|'+(scope?.stopNo||0));if(pre?.data.runId===runId){prefetched.delete(state.owner+'|'+scope.stopNo);if(Date.now()-pre.at<=15*60000&&carried===0){state.slots=pre.data.slots;state.inClaim=!!pre.data.answersInClaim;state.ready=Promise.resolve(pre.data);return state.ready;}}
 state.ready=api('verifiedGameStart',state.payload,state.owner).then(async d=>{state.slots=d.slots;state.inClaim=!!d.answersInClaim;
  if(carried>0&&state.events.length>state.acked){try{await send(state);if(game==='ba'){const st=await api('verifiedGameStatus',{runId},state.owner);if(st?.answers)d={...d,answers:st.answers};}}catch{}}
  return d;});state.ready.catch(()=>{});
 return state.ready;
}
/* [Kota 28 Eki 2026] Cevaplar tek tek değil, oyun/durak bitince tek pakette gönderilir (ödül/skor isteğinden hemen önce);
   ayrıca enerji bitince ve sayfa gizlenince. Sunucu her cevabı yine kendi cevap anahtarıyla puanlar. */
const BATCH=Infinity,MAX_PACK=48;let batchUnsupported=false;   // cevaplar oyun/durak bitince tek pakette (enerji bitince, sayfa gizlenince ve çok uzun oyunlarda 48'lik paketler hâlinde)
function applyEnergy(s){const e=s.last?.energy;if(e&&typeof e.energy==='number'){window.genelEnerjiKalan=e.energy;window.headerEnerjiGoster?.(e.energy,e.max||30);}}
async function sendOne(s){
 const event=s.events[s.acked];let slot=event.slot;
 if(slot===undefined)slot=s.slots.findIndex(x=>key(x.en)===key(event.target));
 if(slot<0)throw Object.assign(Error('Cevap bu oyun oturumuna ait değil.'),{status:409});
 s.last=await api('verifiedGameAnswer',{runId:s.runId,slot,eventId:event.eventId,answer:event.answer},s.owner);s.acked++;persist(s);applyEnergy(s);
}
async function send(s){
 while(s.acked<s.events.length){
  if(batchUnsupported){await sendOne(s);continue;}
  const part=s.events.slice(s.acked,s.acked+MAX_PACK),answers=[];
  for(const event of part){let slot=event.slot;if(slot===undefined)slot=s.slots.findIndex(x=>key(x.en)===key(event.target));if(slot<0)throw Object.assign(Error('Cevap bu oyun oturumuna ait değil.'),{status:409});answers.push({slot,eventId:event.eventId,answer:event.answer});}
  if(who()!==s.owner)throw Object.assign(Error('Hesap değişti. Oyunu yeniden başlat.'),{status:409});
  const r=await originalFetch(apiURL,{method:'POST',body:JSON.stringify({islem:'verifiedGameAnswers',ogrenci:s.owner,runId:s.runId,answers})});
  let d=null;try{d=await r.json();}catch{}
  if(!d||!Array.isArray(d.results)){if(r.ok||((r.status===400||r.status===404)&&d)){batchUnsupported=true;continue;}throw Object.assign(Error(d?.mesaj||'Cevap kaydedilemedi. Bağlantını kontrol et.'),{status:r.status});}
  for(const result of d.results){s.last=result;s.acked++;}
  persist(s);applyEnergy(s);
  if(!r.ok||d.ok===false){
   if(d.energyEmpty){window.genelEnerjiKalan=0;window.headerEnerjiGoster?.(0,25);}
   throw Object.assign(Error(d.mesaj||'Cevap kaydedilemedi.'),{status:r.status,energyEmpty:!!d.energyEmpty,enerjiKalan:d.energyEmpty?0:window.genelEnerjiKalan,enerjiMax:25});
  }
 }
}
async function flush(runId){
 let s=runs.get(runId);if(!s){if(practice())return {};const owner=who(),d=await api('verifiedGameStatus',{runId},owner);s={owner,runId,game:d.game,slots:d.slots,inClaim:!!d.answersInClaim,events:pending(owner,runId),acked:0,last:{},ready:Promise.resolve(d)};runs.set(runId,s);}
 if(s.sending)return s.sending;
 s.sending=(async()=>{
  try{await s.ready;}catch{s.ready=api('verifiedGameStart',s.payload,s.owner).then(d=>{s.slots=d.slots;s.inClaim=!!d.answersInClaim;return d;});await s.ready;}
  await send(s);
  const e=s.last.energy||{};return {...s.last,enerjiKalan:e.energy,enerjiMax:e.max,eklenen:e.gain||0};
 })();
 try{return await s.sending;}finally{s.sending=null;}
}
function pendingCount(runId){const s=runs.get(runId);return s?s.events.length-s.acked:(early.get(runId)||[]).length;}
const early=new Map();
function record(target,answer,runId){
 if(practice())return;runId=runId||window.OC?.aktif?.runId;if(!runId)return;
 const event={eventId:crypto.randomUUID(),...(Number.isInteger(target)?{slot:target}:{target:typeof target==='string'?target:en(target)}),answer:structuredClone(answer??null)};
 const s=runs.get(runId);
 // Oturum başlamadan gelen cevap kaybolmasın: başlayınca kuyruğa eklenir.
 if(!s){const list=early.get(runId)||[];list.push(event);early.set(runId,list);return;}
 s.events.push(event);persist(s);
 // Eski parkur motoru (okul sürümü 9 değil) enerjiyi soru soru ayrı istekle düşer ve sunucu bir önceki cevabı görmeden
 // sonraki adımı kabul etmez: orada her cevap hemen gönderilir.
 const legacyParkur=s.game==='ba'&&s.payload?.schoolVersion!==9;
 if(legacyParkur||s.events.length-s.acked>=BATCH)flush(runId).catch(()=>{});
}
// Sayfa gizlenince/kapanırken bekleyen cevapları gönder (gönderilemeyenler cihazda saklı kalır, sonraki açılışta gider).
function flushAll(){for(const [runId,s] of runs)if(s.events.length>s.acked&&!s.sending)flush(runId).catch(()=>{});}
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('visibilitychange',()=>{if(document.hidden)flushAll();});
if(typeof addEventListener==='function')addEventListener('pagehide',flushAll);
const C=window.OC;if(C){const choose=C.kelimeSec,begin=C.basla;C.kelimeSec=function(game,...args){const words=choose.call(this,game,...args);deck(game,words);return words;};C.basla=function(game){const r=begin.call(this,game);if(game!=='ba'&&!practice()){const a=C.aktif;start(game,a.runId,a.rewardScope).catch(e=>window.yoToast?.(e.message));}return r;};}
/* [Kota 29 Eki 2026] Ödül isteği gönderilmemiş cevapları da taşır: sunucu önce cevapları kaydeder, sonra ödülü işler
   (ayrı cevap paketi isteği yok). Sunucu bunu desteklemiyorsa ya da cevaplar eşlenemiyorsa eski yol: önce paket, sonra ödül. */
async function claimWithAnswers(s,b,opt,self,args){
 try{await s.ready;}catch{await flush(s.runId);return originalFetch.apply(self,args);}
 const part=s.events.slice(s.acked),answers=[];
 for(const event of part){let slot=event.slot;if(slot===undefined)slot=s.slots.findIndex(x=>key(x.en)===key(event.target));if(slot<0)throw Object.assign(Error('Cevap bu oyun oturumuna ait değil.'),{status:409});answers.push({slot,eventId:event.eventId,answer:event.answer});}
 if(who()!==s.owner)throw Object.assign(Error('Hesap değişti. Oyunu yeniden başlat.'),{status:409});
 const r=await originalFetch.call(self,args[0],{...opt,body:JSON.stringify({...b,verifiedAnswers:answers})});
 let d=null;try{d=await r.clone().json();}catch{}
 if(d&&Number.isInteger(d.answersAck)){s.acked+=Math.min(d.answersAck,answers.length);persist(s);return r;}
 if(d?.answersInClaim){
  s.acked+=Math.min(Number(d.processed)||0,answers.length);persist(s);
  if(d.energyEmpty){window.genelEnerjiKalan=0;window.headerEnerjiGoster?.(0,25);}
  throw Object.assign(Error(d.mesaj||'Cevap kaydedilemedi.'),{status:r.status,energyEmpty:!!d.energyEmpty});
 }
 return r;
}
window.fetch=async function(url,opt){
 if(typeof opt?.body==='string')try{const b=JSON.parse(opt.body);if(b.islem==='seviyeOyunOdulu'||/LiderlikKaydet$/.test(b.islem||'')){if(!practice()&&b.runId){
   const s=runs.get(b.runId),left=s?s.events.length-s.acked:0;
   if(b.islem==='seviyeOyunOdulu'&&s&&s.inClaim&&!s.sending&&!batchUnsupported&&left>0&&left<=MAX_PACK)return await claimWithAnswers(s,b,opt,this,arguments);
   await flush(b.runId);}}}catch(e){/* Ağ/sunucu hatası veya enerji eksiği: ödül kaybolmasın, sonra tekrar denensin (503). */const kesin=!e.energyEmpty&&e.status>=400&&e.status<500&&e.status!==401&&e.status!==429;return new Response(JSON.stringify({ok:false,status:'error',mesaj:e.message}),{status:kesin?409:503,headers:{'Content-Type':'application/json'}});}
 return originalFetch.apply(this,arguments);
};
window.dmVerifiedGames={deck,start,record,flush,pendingCount,prefetch,nextRun};
})();
