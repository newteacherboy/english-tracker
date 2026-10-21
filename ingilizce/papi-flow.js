/* Serialize notices around Papi's tour and the first real exercise. */
(()=>{'use strict';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const noticeSelector='#duyuruOverlay,#duyuruGecmisModal,#dmGoalAnnouncement,#dmWeeklyPanel,#dmLevelUp,#dmNudge,.od-perde,.kr-perde,.dv-perde,.cb-kart,.bk-kart,.yo-toast,.uy-serit,.yo-davet,.tv-kart,.sa-perde,.cog-perde,[role="dialog"]:not(#dmPapiTour):not(#dmPapiFirstStart):not(#dmStoryLesson),[aria-modal="true"]:not(#dmPapiTour):not(#dmPapiFirstStart):not(#dmStoryLesson)';
const visible=e=>!!e&&e.isConnected&&!e.classList.contains('dm-papi-held')&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
let queue=[],actor=who(),pending=false,executing='',nextAt=0,held=[],practice=null;
const activitySelector='#dmStoryLesson,.bz-oyun,#bzAlan,#baOyunEkrani,#kpKelimeOyunEkrani,#seviyeDisLinkOverlay,#dcScreenDetail,#dcScreenTest,#yoModal.acik,.game-modal-overlay,.km-perde,.t2-perde,#meteorGame,#wordWheel,#papiCards,#genelSonucOverlay.acik';
const exercise=()=>[...document.querySelectorAll(activitySelector)].some(visible)||!!practice;
const holding=()=>!!window.dmPapiTour?.active()||exercise();
const tourHolding=()=>!!window.dmPapiTour?.active();
const criticalNotice=e=>!!e&&(e.matches('.uy-serit,.yo-toast,[role="alert"],[aria-live="assertive"]')||/enerji|energy|hata|error|başarısız|yetersiz|bağlantı/i.test((e.textContent||'').slice(0,350)));
// Critical notices must escape game setup overlays instead of waiting behind them.
function surfaceCriticalNotices(){
 if(!who()||tourHolding())return;
 const overlays=['kelimeYarismaOverlay','jpOyunOverlay','boslukOyunOverlay','hafizaOyunOverlay','yagmurOyunOverlay','asmacaOyunOverlay','kelimebulOyunOverlay','esOyunOverlay','trenOyunOverlay'];
 for(const el of document.querySelectorAll('.uy-serit,.yo-toast,[role="alert"],[aria-live="assertive"]')){
  if(!visible(el)||!criticalNotice(el))continue;
  const text=(el.textContent||'').trim();
  if(!/enerji|energy|hata|error|başarısız|yetersiz|bağlantı/i.test(text))continue;
  if(el.style.getPropertyValue('z-index')!=='2147483647'||el.style.getPropertyPriority('z-index')!=='important')el.style.setProperty('z-index','2147483647','important');
  if(el.style.getPropertyValue('position')!=='fixed'||el.style.getPropertyPriority('position')!=='important')el.style.setProperty('position','fixed','important');
  for(const id of overlays){const modal=document.getElementById(id);if(!modal||modal.getClientRects().length===0)continue;
   const entry=modal.querySelector('[id$="GirisEkrani"]');
   if(entry&&entry.getClientRects().length){modal.style.display='none';modal.classList.remove('dm-entry-open');}
  }
 }
}
// A single foreground budget covers automatic teacher/social/weekly/member notices.
let activeMs=0,lastClock=Date.now(),autoOwner=who(),autoCount=0,autoNext=300000;
window.dmAutoNotices={can:()=>autoCount<3&&activeMs>=autoNext&&!document.hidden&&Date.now()-(window.dmLastActiveAt||Date.now())<90000&&!holding(),take(){if(!this.can())return false;autoCount++;autoNext=activeMs+300000;return true;},status:()=>({count:autoCount,activeMs,next:autoNext})};
setInterval(()=>{const now=Date.now(),delta=Math.min(2000,now-lastClock);lastClock=now;if(autoOwner!==who()){autoOwner=who();autoCount=0;activeMs=0;autoNext=300000;}if(who()&&!document.hidden&&Date.now()-(window.dmLastActiveAt||now)<90000)activeMs+=delta;},1000);
const automatic=key=>/^(teacher:|weekly:|social:|recommendation:|placement-invite)/.test(key);
const shown=()=>[...document.querySelectorAll(noticeSelector)].some(visible);
// Suppress late-mounted dialogs while the onboarding tour owns the screen.
const tourOverlay=()=>!!window.dmPapiTour?.active();
function blocked(){return document.hidden||holding()||pending||shown()||Date.now()<nextAt;}
function defer(key,run){if(automatic(key)&&executing!==key&&!window.dmAutoNotices.can()){if(autoCount>=3)return true;const existing=queue.find(x=>x.key===key&&x.owner===who());if(!existing)queue.push({key,run,owner:who()});return true;}if(!document.hidden&&!holding()&&!shown()&&(!pending||executing===key)&&Date.now()>=nextAt){if(automatic(key)&&executing!==key&&!window.dmAutoNotices.take())return true;return false;}const existing=queue.find(x=>x.key===key&&x.owner===who());if(existing)existing.run=run;else queue.push({key,run,owner:who()});return true;}
const recurringSelector='#duyuruOverlay,#duyuruGecmisModal,#dmGoalAnnouncement,#dmWeeklyPanel,#dmLevelUp,#dmNudge,.od-perde,.kr-perde,.dv-perde,.cb-kart,.bk-kart,.yo-davet,.tv-kart,.sa-perde,.cog-perde';
function suspend(){for(const e of document.querySelectorAll(tourHolding()?noticeSelector:recurringSelector)){if(e.isConnected&&!e.classList.contains('dm-papi-held')&&e.getClientRects().length>0&&getComputedStyle(e).display!=='none'&&!(!tourHolding()&&criticalNotice(e))){e.classList.add('dm-papi-held');if(!held.some(x=>x.el===e))held.push({el:e,owner:who()});}}document.body.classList.toggle('dm-papi-notices-paused',tourHolding());}
function reset(){for(const h of held){if(['duyuruOverlay','duyuruGecmisModal'].includes(h.el.id)){h.el.style.display='none';h.el.classList.remove('dm-papi-held');}else h.el.remove();}held=[];queue=[];pending=false;executing='';nextAt=0;practice=null;autoCount=0;activeMs=0;autoNext=300000;document.getElementById('dmPapiFirstStart')?.remove();document.body.classList.remove('dm-papi-notices-paused');}
setInterval(async()=>{if(!who()&&!actor)return;if(actor!==who()){reset();actor=who();return;}if(holding()){suspend();return;}document.body.classList.remove('dm-papi-notices-paused');if(blocked())return;const h=held.shift();if(h){if(h.owner===who()&&h.el.isConnected){h.el.classList.remove('dm-papi-held');nextAt=Date.now()+1000;}return;}const item=queue.shift();if(!item||item.owner!==who())return;if(automatic(item.key)&&!window.dmAutoNotices.take()){if(autoCount<3)queue.push(item);return;}const turn=actor;pending=true;executing=item.key;try{await item.run();}catch{}finally{if(turn===actor){executing='';pending=false;nextAt=Date.now()+1000;}}},350);
// Coalesce DOM changes to one check per frame; checking on every mutation forced
// thousands of style recalculations during startup.
let watchQueued=false;
new MutationObserver(()=>{if(watchQueued)return;watchQueued=true;requestAnimationFrame(()=>{watchQueued=false;if(!who()&&!tourHolding())return;if(holding())suspend();else surfaceCriticalNotices();});}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
function later(el,run,delay){let paused=false;function tick(){if(!el.isConnected)return;if(holding()||el.classList.contains('dm-papi-held')){paused=true;setTimeout(tick,500);}else if(paused){paused=false;setTimeout(tick,delay);}else run();}setTimeout(tick,delay);}
window.dmPapiNotices={blocked,defer,suspend,later,inActivity:exercise,resume:()=>{if(!holding())document.body.classList.remove('dm-papi-notices-paused');}};
function loading(text){let el=document.getElementById('dmPapiFirstStart');if(!el){el=document.createElement('div');el.id='dmPapiFirstStart';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.innerHTML='<section><img src="papi-welcome-v2.png" alt="Papi"><h2>İlk keşfin başlıyor!</h2><p role="status"></p><button type="button" hidden>Tekrar dene</button><button type="button" class="papi-first-return" hidden>Parkura dön</button></section>';document.body.append(el);}el.querySelector('p').textContent=text;return el;}
async function start(_purpose,route){practice=null;document.getElementById('dmPapiFirstStart')?.remove();if(typeof route==='function')await route();}
function complete(){practice=null;}
function recover(){practice=null;}
const locked=()=>false;
window.dmPapiFirstPractice={start,complete,locked,recover};
document.addEventListener('dm:login',()=>{reset();actor=who();});
})();
