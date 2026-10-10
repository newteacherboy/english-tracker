/* Papi's full-screen, read-only introduction. Real account progress is never replaced. */

// Unified non-blocking notice coordinator. Runs before the onboarding tour.
(()=>{
 const queue=[],seen=new Set();
 let paused=false,flushing=false,invoking=false;
 const tour=()=>paused||document.body.classList.contains('dm-papi-preview')||!!window.dmPapiTour?.active?.();
 const selectors=['#dmStoryLesson','.ds-lesson-shell','#baOyunEkrani','.oyun-modal','.game-modal-content','.duello-oyun','#dcTestIcerik','.dt-q','#dmGameIntro','.hb-overlay','#kpKelimeOyunEkrani'];
 const playing=()=>selectors.some(s=>[...document.querySelectorAll(s)].some(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'));
 function defer(key,fn,priority=5){
  if(invoking||(!tour()&&!(playing()&&Number(priority)>1)&&!flushing))return false;
  const id=String(key||'notice');
  if(!seen.has(id)){seen.add(id);queue.push({id,fn,priority:Number(priority)||5});}
  return true;
 }
 function flush(){
  if(tour()||playing()||flushing||!queue.length)return;
  if(['duyuruOverlay','dmGoalAnnouncement','dmLevelUp','dmDailyMissionAnnouncement','dmWeeklyGoalAnnouncement'].some(id=>{const el=document.getElementById(id);return el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';}))return;
  queue.sort((a,b)=>a.priority-b.priority);
  const item=queue.shift();seen.delete(item.id);
  flushing=true;
  try{invoking=true;item.fn();}catch(e){console.warn('Papi notice',e)}finally{invoking=false;}
  setTimeout(()=>{flushing=false;},1800);
 }
 // Legacy announcements retain their original dialogs and callbacks, but their
 // visibility is postponed while the introduction or an exercise is active.
 const legacy=[
  {id:'duyuruOverlay',priority:3},
  {id:'dmGoalAnnouncement',priority:4},
  {id:'dmLevelUp',priority:2},
  {id:'dmDailyMissionAnnouncement',priority:4},
  {id:'dmWeeklyGoalAnnouncement',priority:5}
 ];
 const restoring=new WeakSet();
 function visible(el){return !!el&&el.isConnected&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';}
 function capture(){
  if(!tour()&&!playing())return;
  for(const {id,priority} of legacy){
   const el=document.getElementById(id);
   if(!visible(el)||restoring.has(el))continue;
   const display=el.style.display,visibility=el.style.visibility;
   // Hide synchronously in the mutation observer before the next paint.
   el.style.setProperty('display','none','important');
   const key='legacy:'+id;
   if(!seen.has(key)){
    seen.add(key);
    queue.push({id:key,priority,fn:()=>{
     if(!el.isConnected)return;
     restoring.add(el);
     el.style.removeProperty('display');
     if(display)el.style.display=display;
     el.style.visibility=visibility;
     setTimeout(()=>restoring.delete(el),50);
    }});
   }
  }
 }
 const observer=new MutationObserver(capture);
 function observe(){if(document.body)observer.observe(document.body,{attributes:true,attributeFilter:['class','style','hidden'],childList:true,subtree:true});}
 if(document.body)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});
 setInterval(()=>{capture();flush();},500);
 window.dmPapiNotices={defer,suspend:()=>{paused=true;},resume:()=>{paused=false;},queued:()=>queue.length,clear:()=>{queue.length=0;seen.clear();}};
 document.addEventListener('dm:login',()=>{queue.length=0;seen.clear();});
 const style=document.createElement('style');
 style.textContent='body.dm-papi-preview #duyuruOverlay,body.dm-papi-preview .duy3-overlay,body.dm-papi-preview .dm-papi-feedback,body.dm-papi-preview .dm-toast,body.dm-papi-preview .toast,body.dm-papi-preview .genel-enerji-kazanim-wrap{visibility:hidden!important;pointer-events:none!important}body.dm-papi-preview #dmPapiTour{z-index:2147483647!important}';
 (document.head||document.documentElement).append(style);
})();

(()=>{'use strict';
const $=id=>document.getElementById(id),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const name=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const ready=()=>!!name()&&name().toLowerCase()!=='teacher'&&!window.dmGuestMode&&$('panel-alani')?.style.display==='block'&&typeof yo!=='undefined'&&yo&&(!window.yoHazirMi||window.yoHazirMi());
let root=null,index=0,purpose='school',busy=false,epoch=0,owner='',previousFocus=null,navigating=false,sessionOwner='',sessionShown=false;
const steps=[
 ['Birlikte başlayalım!','Ben Papi! İngilizceyi okulda ve günlük hayatta öğrenmen için buradayım. Sana uygun başlangıcı seç.','welcome'],
 ['Senin öğrenme yolun','','route'],
 ['Ders Çalış','Dil bilgisi, kelime, iletişim ve telaffuz konularını çalışma defterinde keşfet. Konu arama ile ihtiyacın olan dersi kolayca bul.','tab-derscalis'],
 ['Oyunlar','Öğrendiklerini oyunlarla pekiştir. Farklı oyunlar kelime, dinleme ve cümle kurma becerilerini geliştirir.','tab-aktiviteler'],
 ['Arkadaşlar','Arkadaşlarının gelişimini takip et, başarılarını kutla ve birlikte öğrenmenin keyfini çıkar.','tab-meduakis'],
 ['Benim Dünyam','Sana Özel bölümünde görevlerini ve öğretmeninin verdiği ödevleri gör. Ödev kartındaki kalan süreyi kontrol et, Başla ile çalışmaya geç. İlerlemen ve rozetlerin de burada!','tab-dunyam'],
 ['Mağaza','Kazandığın altınlarla karakterini kişiselleştir. Enerjini, sandıklarını ve seviye açılışlarını buradan takip edebilirsin.','tab-magaza'],
 ['Artık hazırsın!','İki parkuru da kullanabilirsin. Haydi başla dediğinde seçtiğin parkurda ilk çalışman hemen açılacak. Birlikte tamamlayalım! Diğer özellikler kendi seviyene göre açık kalacak.','finish']
];
function preview(){return !!root&&root.isConnected&&window.dmPapiPreview===true;}
function introState(){const state=typeof yo!=='undefined'&&yo?.dmPapiIntro;return {shown:Math.max(0,Number(state?.shown)||(yo?.turlar?.includes('papi:v3')?1:0)),disabled:state?.disabled===true,automatic:state?.automatic===true||(!state&&yo?.turlar?.includes('papi:v3')),audience:state?.audience||window.dmPapiIntroPolicy?.()||'new',rolloutSeen:state?.rolloutSeen===true};}
function canAutoStart(){const state=introState(),eligible=typeof window.dmPapiIntroEligible==='function'?window.dmPapiIntroEligible():!window.turBitti?.('v2:ana');return !sessionShown&&eligible&&(state.audience==='existing'?!state.rolloutSeen:!state.disabled&&state.shown<2);}
function cleanup(){epoch++;root?.remove();root=null;busy=false;window.dmPapiPreview=false;document.body.classList.remove('dm-papi-preview');window.dmPapiNotices?.resume();window.dmProgression?.paint();}
async function route(){await window.dunyaAc?.();for(let tries=0;tries<20;tries++){if(owner!==name())return;const b=document.querySelector('.dm-story-mode [data-path="'+(purpose==='school'?'game':'learn')+'"]');if(b){navigating=true;try{b.click();}finally{navigating=false;}return;}await new Promise(r=>setTimeout(r,100));}}
function finish(){if(!root||busy)return;const current=owner,state=introState(),disabled=root.querySelector('.papi-never input').checked;cleanup();if(current!==name())return;if(typeof yo!=='undefined'&&yo){yo.turlar=Array.from(new Set([...(yo.turlar||[]),'ana','v2:ana','papi:v3']));yo.dmLearningPurpose=purpose;yo.dmPapiIntro={...state,disabled:state.disabled||disabled};window.yoKaydet?.();}if(window.dmPapiFirstPractice)window.dmPapiFirstPractice.start(purpose,route);else{route();previousFocus?.focus?.({preventScroll:true});}}
async function openTab(id){if(id==='route')return route();const fn={'tab-derscalis':'dersCalisTamEkranAc','tab-aktiviteler':'aktivitelerTamEkranAc','tab-meduakis':'meduAkisAc','tab-dunyam':'benimDunyamAc','tab-magaza':'magazaAc'}[id];if(fn&&typeof window[fn]==='function')await window[fn](id==='tab-dunyam'?'sanaozel':undefined);}
async function show(next){if(!root||busy)return;busy=true;const token=++epoch;index=Math.max(0,Math.min(7,next));const step=steps[index],full=index===0||index===7;
 root.dataset.stage=step[2];root.classList.add('papi-travel');root.classList.toggle('papi-full',full);root.querySelector('.papi-title').textContent=index===1?(purpose==='school'?'Macera Haritası':'Öğrenme Yolu'):step[0];root.querySelector('.papi-copy').textContent=index===1?(purpose==='school'?'Okul İngilizceni sınıf ve ünite çalışmalarına uygun maceralarla geliştir. Macera Haritası senin başlangıcın! İstersen Öğrenme Yolu’nu da kullanabilirsin.':'7’den 70’e, İngilizceye sıfırdan başlamak için adım adım ilerle. Uzay Akademisi’nde günlük ifadeleri öğren. Macera Haritası da her zaman yanında!'):step[1];
 root.querySelector('.papi-count').textContent=(index+1)+' / 8';root.querySelector('.papi-progress i').style.width=((index+1)/8*100)+'%';root.querySelector('.papi-choices').hidden=index!==0;root.querySelector('.papi-never').hidden=index!==7;root.querySelector('.papi-back').hidden=index===0;root.querySelector('.papi-next').textContent=index===7?'Haydi başla ✨':index===0?'Yolumu göster →':'Devam →';root.querySelector('.papi-mascot').src=index===7?'papi-reward-v2.png':index===0?'papi-welcome-v2.png':'papi-help-v2.png';root.querySelector('.papi-scene-label').textContent=full?'Papi ile keşfet':steps[index][0];
 root.querySelectorAll('[data-purpose]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.purpose===purpose));});
 await new Promise(r=>setTimeout(r,reduced()?0:600));if(token!==epoch||!root)return;
 if(!full){try{await openTab(step[2]);}catch{}}if(token!==epoch||!root)return;window.dmProgression?.paint();
 await new Promise(r=>setTimeout(r,reduced()?0:650));if(token!==epoch||!root)return;
 root.classList.remove('papi-travel');busy=false;root.querySelector('.papi-next').focus({preventScroll:true});
}
function start(force=false){if(sessionOwner!==name()){sessionOwner=name();sessionShown=false;}if(root||!ready()||!force&&!canAutoStart())return;owner=name();sessionShown=true;if(!force){yo.dmPapiIntro={...introState(),automatic:true,rolloutSeen:introState().audience==='existing'||introState().rolloutSeen,shown:introState().audience==='existing'?1:Math.min(2,introState().shown+1)};window.yoKaydet?.();}purpose=typeof yo!=='undefined'&&yo.dmLearningPurpose==='independent'?'independent':'school';previousFocus=document.activeElement;root=document.createElement('div');root.id='dmPapiTour';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','dmPapiTitle');root.innerHTML=`<div class="papi-scene" aria-hidden="true"><span class="papi-orbit orbit-one"></span><span class="papi-orbit orbit-two"></span><div class="papi-sparks">✦ <span>✧</span> ✦ <span>✧</span> ✦</div><small class="papi-scene-label"></small><img class="papi-mascot" alt="" src="papi-welcome-v2.png"></div><section class="papi-sheet"><header><span>🪶 Papi ile keşfet</span><small class="papi-count"></small></header><div class="papi-progress"><i></i></div><h2 class="papi-title" id="dmPapiTitle"></h2><p class="papi-copy" aria-live="polite"></p><div class="papi-choices"><button type="button" data-purpose="school"><span>🏫</span><b>Okul İngilizcemi geliştirmek istiyorum</b><small>İlkokul ve ortaokul · Macera Haritası</small></button><button type="button" data-purpose="independent"><span>🚀</span><b>İngilizceye sıfırdan başlamak istiyorum</b><small>7’den 70’e · Öğrenme Yolu</small></button></div><label class="papi-never" hidden><input type="checkbox"> Bir daha gösterme</label><footer><button type="button" class="papi-back">← Geri</button><button type="button" class="papi-next">Devam →</button></footer></section>`;
 document.body.append(root);window.dmPapiPreview=true;document.body.classList.add('dm-papi-preview');window.dmPapiNotices?.suspend();window.dmProgression?.paint();root.querySelectorAll('[data-purpose]').forEach(b=>b.onclick=()=>{if(busy)return;purpose=b.dataset.purpose;root.querySelectorAll('[data-purpose]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});root.querySelector('.papi-back').onclick=()=>show(index-1);root.querySelector('.papi-next').onclick=()=>index===7?finish():show(index+1);root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();return;}if(e.key==='Tab'){const controls=[...root.querySelectorAll('button,input')].filter(b=>b.getClientRects().length),i=controls.indexOf(document.activeElement);e.preventDefault();controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length]?.focus();}});show(0);
}
// Only the guide controls are interactive during the preview, including keyboard activation.
document.addEventListener('click',e=>{if(preview()&&!navigating&&!root.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('focusin',e=>{if(preview()&&!root.contains(e.target))root.querySelector('.papi-next')?.focus({preventScroll:true});});
window.turBaslat=(_key,force)=>start(!!force);window.uygulamaTuru=()=>{window.yardimKapat?.();const m=$('yardimModal');if(m)m.style.display='none';start(true);};window.turAcikMi=()=>!!root;Object.defineProperty(window,'turAcik',{configurable:true,get:()=>!!root});window.turBitti=ad=>typeof yo!=='undefined'&&!!yo?.turlar?.includes(ad);
window.dmPapiTour={start,active:()=>!!root,preview};
document.addEventListener('dm:login',()=>{sessionOwner='';sessionShown=false;if(root)cleanup();});
setInterval(()=>{if(!ready()){if(root)cleanup();sessionOwner='';sessionShown=false;return;}if(sessionOwner!==name()){sessionOwner=name();sessionShown=false;}if(root){if(owner!==name())cleanup();return;}const help=$('ydTur');if(help){help.textContent='🦜 Papi ile tanıtımı tekrar izle';help.onclick=window.uygulamaTuru;}if(document.hidden||!canAutoStart())return;const blockers=['karakterModal'];if(blockers.some(id=>$(id)?.getClientRects().length&&getComputedStyle($(id)).display!=='none'))return;window.turBaslat('ana',false);},1500);
})();
