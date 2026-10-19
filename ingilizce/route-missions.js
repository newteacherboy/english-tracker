/* Mission views. Progress comes from the server; the daily reward is verified and credited by the server once per day. */
(()=>{'use strict';
let owner='',value=null;
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const goals={daily:[['route','1 bölüm tamamla',1,'path'],['game','1 oyun oyna',1,'game'],['review','3 kelime tekrar et',3,'book']],weekly:[['route','10 bölüm tamamla',10,'path'],['game','20 oyun oyna',20,'game'],['days','5 gün çalış',5,'goal']]};
const today=()=>new Date(Date.now()+10800000).toISOString().slice(0,10);
const store={get(k){try{return localStorage.getItem(k)||'';}catch{return '';}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const claimKey=()=>'dm_daily_claim:'+who().toLowerCase();
const claimed=()=>store.get(claimKey())===today();
function dailyDone(){const d=owner===who()?value?.daily:null;return !!d&&goals.daily.every(([event,,target])=>(Number(d[event])||0)>=target);}
const member=()=>{const n=who();return !!n&&n.toLowerCase()!=='teacher'&&!(typeof window!=='undefined'&&window.dmGuestMode);};

/* Cards render before the summary arrives on first load: ask for it once instead of showing "…" until a tap. */
let lastAsk=0;
function askForData(){
 if(!member()||typeof setTimeout!=='function'||Date.now()-lastAsk<10000)return;lastAsk=Date.now();
 setTimeout(()=>{if(!(owner===who()&&value))window.dmLearningCompanion?.refresh?.()?.catch?.(()=>{});},0);
}

function claimRow(){
 if(!dailyDone())return '';
 return claimed()
  ?'<p class="rt-claim-done" role="status">✅ Ödül alındı · yarın yeni görevler seni bekliyor</p>'
  :'<button type="button" class="rt-claim" data-rt="claim-daily">🎁 Ödülünü Al <small>+5 🪙 +10 XP</small></button>';
}

window.dmRouteMissions={
 data(period){return owner&&owner===who()?(value?.[period]||null):null;},
 set(data,name){if(name!==who())return;owner=name;value=data||null;window.dmRefreshRouteCards?.();},
 markup(period){
  const data=owner===who()?value?.[period]:null;if(!data)askForData();
  // All three done: a compact card (fits the fixed-height carousel) with the reward button or the claimed note.
  if(period==='daily'&&dailyDone())return '<section class="rt-tasks rt-card rt-missions rt-done" aria-label="Günün 3 Görevi tamamlandı"><div class="rt-done-summary">'+['1 bölüm','1 oyun','3 tekrar'].map(x=>'<span>✅ '+x+'</span>').join('')+'</div>'+claimRow()+'</section>';
  return '<section class="'+(period==='daily'?'rt-tasks':'rt-week')+' rt-card rt-missions" aria-label="'+(period==='daily'?'Günün 3 Görevi':'Haftanın 3 Görevi')+'"><div class="rt-task-list">'+goals[period].map(([event,label,target,icon])=>{const count=data?Math.min(target,Math.max(0,Number(data[event])||0)):null;return '<button type="button" data-rt="task" data-event="'+event+'" aria-label="'+label+' · '+(count===null?'yükleniyor':count+'/'+target)+'"><img src="route-assets/'+icon+'.svg" alt=""><span class="rt-mission-copy"><b>'+label+'</b><progress max="'+target+'" value="'+(count||0)+'" aria-label="'+label+' ilerlemesi"></progress></span><span class="rt-mission-count">'+(count===null?'…':count+'/'+target)+'</span><span aria-hidden="true">›</span></button>';}).join('')+'</div></section>';
 }
};

/* Claim: the server re-checks the three missions and credits +5 gold once per day; XP follows the existing client XP path. */
let claiming=false;
async function claim(button){
 if(claiming||!member())return;claiming=true;
 const label=button.innerHTML;button.disabled=true;button.textContent='Ödül kaydediliyor…';
 try{
  const d=await window.dmEkonomi?.islem?.('gunlukGorevOdul');
  if(!d)throw Error('Ödül şu anda alınamadı, yeniden dene.');
  if(!d.ok)throw Error(d.mesaj||'Ödül şu anda alınamadı, yeniden dene.');
  store.set(claimKey(),today());
  if(Number(d.eklenen)>0){
   window.dmBaseXpAdd?.(10,0);
   window.odulGoster?.({ikon:'📋',baslik:'Günün 3 görevi tamam! 🎉',alt:'Yarın: parkurda yeni bir bölüm, yeni bir oyun turu ve kelime tekrarı seni bekliyor.',xp:10,altin:5});
  }else window.yoToast?.('Bugünün ödülünü zaten aldın. Yarın yeni görevler gelecek!');
  window.dmRefreshRouteCards?.();
 }catch(e){window.yoToast?.(e.message);if(button.isConnected){button.disabled=false;button.innerHTML=label;}}
 finally{claiming=false;}
}
if(typeof document!=='undefined'&&document.addEventListener){
 document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-rt="claim-daily"]');if(!b)return;e.preventDefault();e.stopPropagation();claim(b);},true);
 /* Only a real account change clears missions; a repeated login event for the same student keeps them. */
 document.addEventListener('dm:login',()=>{if(owner&&owner===who())return;owner='';value=null;lastAsk=0;});
}
})();
