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
async function api(op,body,owner){if(who()!==owner)throw Error('Hesap değişti. Oyunu yeniden başlat.');const r=await originalFetch(apiURL,{method:'POST',body:JSON.stringify({islem:op,ogrenci:owner,...body})});const d=await r.json();if(!r.ok||d.ok===false||d.status==='error')throw Error(d.mesaj||d.message||'Cevap kaydedilemedi. Bağlantını kontrol et.');return d;}
function deck(game,words){decks.set(game,words);}
async function start(game,runId,scope,words){
 if(practice())return null;
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
 const state={owner:who(),runId,game,events:pending(who(),runId),acked:0,slots:[],last:{},payload:{runId,game,classNo:cls,units,stopNo:scope?.stopNo||0,words:words.map(w=>({en:en(w),tr:tr(w)}))}};
 runs.set(runId,state);
 if(window.OC?.aktif?.runId===runId)window.OC.aktif.rewardScope={classNo:cls,units,stopNo:scope?.stopNo||0};
 state.ready=api('verifiedGameStart',state.payload,state.owner).then(d=>{state.slots=d.slots;return d;});state.ready.catch(()=>{});
 return state.ready;
}
async function flush(runId){
 let s=runs.get(runId);if(!s){if(practice())return {};const owner=who(),d=await api('verifiedGameStatus',{runId},owner);s={owner,runId,game:d.game,slots:d.slots,events:pending(owner,runId),acked:0,last:{},ready:Promise.resolve(d)};runs.set(runId,s);}
 if(s.sending)return s.sending;
 s.sending=(async()=>{
  try{await s.ready;}catch{s.ready=api('verifiedGameStart',s.payload,s.owner).then(d=>{s.slots=d.slots;return d;});await s.ready;}
  while(s.acked<s.events.length){const event=s.events[s.acked];let slot=event.slot;
   if(slot===undefined)slot=s.slots.findIndex(x=>key(x.en)===key(event.target));
   if(slot<0)throw Error('Cevap bu oyun oturumuna ait değil.');
   s.last=await api('verifiedGameAnswer',{runId,slot,eventId:event.eventId,answer:event.answer},s.owner);s.acked++;persist(s);
   const e=s.last.energy;if(e&&typeof e.energy==='number'){window.genelEnerjiKalan=e.energy;window.headerEnerjiGoster?.(e.energy,e.max||30);}
  }
  const e=s.last.energy||{};return {...s.last,enerjiKalan:e.energy,enerjiMax:e.max,eklenen:e.gain||0};
 })();
 try{return await s.sending;}finally{s.sending=null;}
}
function record(target,answer,runId){
 if(practice())return;runId=runId||window.OC?.aktif?.runId;const s=runs.get(runId);if(!s)return;
 s.events.push({eventId:crypto.randomUUID(),...(Number.isInteger(target)?{slot:target}:{target:typeof target==='string'?target:en(target)}),answer:structuredClone(answer??null)});
 persist(s);flush(runId).catch(()=>{});
}
const C=window.OC;if(C){const choose=C.kelimeSec,begin=C.basla;C.kelimeSec=function(game,...args){const words=choose.call(this,game,...args);deck(game,words);return words;};C.basla=function(game){const r=begin.call(this,game);if(game!=='ba'&&!practice()){const a=C.aktif;start(game,a.runId,a.rewardScope).catch(e=>window.yoToast?.(e.message));}return r;};}
window.fetch=async function(url,opt){
 if(typeof opt?.body==='string')try{const b=JSON.parse(opt.body);if(b.islem==='seviyeOyunOdulu'||/LiderlikKaydet$/.test(b.islem||'')){if(!practice()&&b.runId)await flush(b.runId);}}catch(e){return new Response(JSON.stringify({ok:false,status:'error',mesaj:e.message}),{status:409,headers:{'Content-Type':'application/json'}});}
 return originalFetch.apply(this,arguments);
};
window.dmVerifiedGames={deck,start,record,flush};
})();
