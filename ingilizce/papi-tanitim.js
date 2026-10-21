/* Papi tanıtımları.
   1) İlk tanıtım: yeni hesaplarda yol ve karakter (cinsiyet) seçiminden sonra bir kez;
      alttaki menüde her sayfayı ışıkla gösterip tek cümleyle anlatır.
   2) Ortak tur motoru (window.dmPapiIntro.run): papi-sayfa-turlari.js sayfa turlarını
      bununla çalıştırır. Adım, hedefi ışıkla gösterir; hedef yoksa ortada kart açar.
   Ekonomiye ve sunucuya dokunmaz. Tetikleyiciler: member-experience.js
   "dm:first-route-chosen", index.html karakter seçimi "dm:first-character-chosen". */
(()=>{'use strict';
if(window.dmPapiIntro)return;
const ROOT_ID='dmPapiTour';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const Y=()=>typeof yo!=='undefined'&&yo?yo:null;
const seenKey=o=>'dm_papi_tanitim_v1:'+o.toLowerCase();
const candidateKey=o=>'dm_papi_tanitim_aday:'+o.toLowerCase();
const store={
 get(k,s=localStorage){try{return s.getItem(k);}catch{return null;}},
 set(k,v,s=localStorage){try{s.setItem(k,v);}catch{}}
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible=e=>!!e&&e.isConnected&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const BLOCKERS='#dmRouteChoice,#dmCharacterBuilder,.ka-perde,#dmPlacementExam,#dmStartPlacement,#dmStartingChoice,#dmPlacementInvite,#dmEmailVerification,#dmEmailGuide,#bzPerde,#dmStoryLesson,#mlThemeList,.game-modal-overlay,.dc-fullscreen-overlay.active,#yoModal.acik,#genelSonucOverlay.acik,.sa-perde,.rt-profile-backdrop,#dmBagPage,#yardimModal[style*="flex"]';
const tab=id=>'#bottomNavMobile [data-ekran="'+id+'"]';

function introSteps(){
 const school=Y()?.dmLearningPurpose==='school';
 return [
  {center:true,img:'papi-merhaba',title:'Merhaba, ben Papi!',text:'Uygulamayı 1 dakikada birlikte gezelim. Her sayfanın ne işe yaradığını kısaca göstereceğim.',next:'Hadi gezelim',secondary:'Şimdi değil',noDots:true},
  {target:tab('tab-dunya'),title:'Parkur',text:school?'Macera Haritan burada. Sınıfına göre üniteler ve duraklar seni bekliyor; her gün bir durak çöz.':'Öğrenme Yolun burada. Seviyene göre konular ve dersler seni bekliyor; her gün bir ders çöz.',tip:'Her durak yeni kelimeler öğretir.'},
  {target:'.dm-unified-wallet',title:'Enerji, altın ve XP',text:'Enerjiyle soru çözersin, altınla Mağaza’dan alışveriş yaparsın, XP ile seviye atlarsın.',tip:'Üst üste doğru cevaplar bonus kazandırır.'},
  {target:tab('tab-derscalis'),title:'Ders Çalış',text:'Kelime, dil bilgisi ve iletişim konularını tek tek çalış. Zorlandığın konuya buradan dönebilirsin.',tip:'Her konunun kendi oyunları var.'},
  {target:tab('tab-aktiviteler'),title:'Oyunlar',text:'Öğrendiklerinle oyna, XP ve altın kazan. Mola Vakti’nde kısa bir ara verebilirsin.',tip:'Çalıştıkça yeni oyunlar açılır.'},
  {target:tab('tab-meduakis'),title:'Arkadaşlar',text:'Arkadaşlarını ekle, başarılarını gör ve sıralamada yarış.'},
  {target:tab('tab-magaza'),title:'Mağaza',text:'Kazandığın altınlarla karakterine kıyafet, joker ve enerji alabilirsin.'},
  {target:tab('tab-profile-menu'),title:'Profil',text:'Seviyeni, rozetlerini ve hesap ayarlarını buradan görürsün.'},
  {center:true,img:'papi-kutlama',title:'Hazırsın!',text:'İlk durağın seni bekliyor. Birlikte başlayalım.',next:'İlk durağa başla',secondary:'Kapat',noDots:true,finishAction:'start'}
 ];
}

/* ---------- Ortak tur motoru ---------- */
let root=null,index=0,list=[],owner='',before=null,options={},serial=0;
function isOpen(){return !!root&&root.isConnected;}
// papi-flow.js holds other notices while a Papi tour is active.
if(window.dmPapiTour){const previous=window.dmPapiTour.active;window.dmPapiTour.active=()=>isOpen()||!!previous?.();}

function idle(){
 const o=who();
 if(!o||o.toLowerCase()==='teacher'||window.dmGuestMode)return false;
 if(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci)return false;
 const y=Y();if(!y||(window.yoHazirMi&&!window.yoHazirMi()))return false;
 if(document.getElementById('panel-alani')?.style.display!=='block')return false;
 if(isOpen()||[...document.querySelectorAll(BLOCKERS)].some(visible))return false;
 return true;
}
function run(steps,opts={}){
 if(isOpen()||!who())return false;
 owner=who();list=steps;index=0;options=opts;before=document.activeElement;serial++;
 root=document.createElement('div');root.id=ROOT_ID;root.className='dm-intro';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',opts.label||'Papi ile tanıtım');
 root.innerHTML='<div class="dm-intro-dim" data-intro-dim></div><div class="dm-intro-ring" data-intro-ring hidden></div><section class="dm-intro-card" data-intro-card aria-live="polite"></section>';
 document.body.append(root);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close('skip');}if(e.key==='Tab'){const f=[...root.querySelectorAll('button')];const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length]?.focus();}});
 addEventListener('resize',place);visualViewport?.addEventListener('resize',place);
 show(0);
 return true;
}
function close(reason){
 if(!root)return;removeEventListener('resize',place);visualViewport?.removeEventListener('resize',place);
 root.remove();root=null;serial++;
 const done=options.onClose;options={};
 try{done?.(reason);}catch(e){console.warn('[Papi tanıtım]',e);}
 if(!document.querySelector('.rt-profile-backdrop'))before?.focus?.({preventScroll:true});
}
function target(step){
 if(!step.target)return null;
 return [...document.querySelectorAll(step.target)].find(visible)||null;
}
async function show(i){
 if(!isOpen())return;
 if(who()!==owner)return close('owner');
 const mine=++serial;index=i;const step=list[i];
 root.classList.add('is-busy'); // Hide the previous card while this step gets ready.
 if(typeof step.before==='function'){try{await step.before();}catch(e){console.warn('[Papi tanıtım]',e);}if(mine!==serial||!isOpen())return;}
 if(step.target&&!step.center){
  // Wait briefly for the page to draw the section; skip quietly if it never appears.
  let el=null;for(let t=0;t<(step.waitMs??2400);t+=150){el=target(step);if(el)break;await wait(150);if(mine!==serial||!isOpen())return;}
  // Missing sections are dropped so the step counter stays accurate.
  if(!el&&step.optional!==false){list.splice(i,1);return i<list.length?show(i):finish(list[i-1]);}
  el?.scrollIntoView?.({block:'center',inline:'nearest'});await wait(260);if(mine!==serial||!isOpen())return;
 }
 root.classList.remove('is-busy');paint();
}
function next(i){
 const n=i+1;if(n>=list.length)return finish(list[i]);
 show(n);
}
function finish(step){
 const action=step?.finishAction;close('done');
 if(action==='start'){const go=[...document.querySelectorAll('.rt-start')].find(visible);if(go)go.click();else window.dunyaAc?.();}
}
function paint(){
 if(!isOpen())return;
 const step=list[index],card=root.querySelector('[data-intro-card]'),el=target(step),center=step.center||!el;
 root.classList.toggle('is-center',center);
 const shown=list.filter(s=>!s.noDots),pos=shown.indexOf(step);
 const dots=shown.map((s,i)=>'<i class="'+(s===step?'is-current':i<pos?'is-done':'')+'"></i>').join('');
 const counter=pos>=0?(pos+1)+' / '+shown.length:'';
 const last=index===list.length-1;
 const nextLabel=step.next||(last?'Tamam':'İleri');
 if(center){
  card.innerHTML=(step.img?'<img class="dm-intro-hero" src="discovery-assets/'+step.img+'.webp" alt="" decoding="async">':'')+
   '<h2>'+esc(step.title)+'</h2><p>'+esc(step.text)+'</p>'+(step.tip?'<span class="dm-intro-tip">'+esc(step.tip)+'</span>':'')+
   '<button type="button" class="dm-intro-primary" data-intro-next>'+esc(nextLabel)+'</button>'+
   '<button type="button" class="dm-intro-link" data-intro-skip>'+esc(step.secondary||'Geç')+'</button>'+
   (step.noDots?'':'<div class="dm-intro-dots" aria-hidden="true">'+dots+'</div>');
 }else{
  card.innerHTML='<div class="dm-intro-head"><img src="discovery-assets/papi-merhaba.webp" alt="" decoding="async"><div><small>'+counter+'</small><h2>'+esc(step.title)+'</h2></div></div>'+
   '<p>'+esc(step.text)+'</p>'+(step.tip?'<span class="dm-intro-tip">'+esc(step.tip)+'</span>':'')+
   '<div class="dm-intro-foot"><div class="dm-intro-dots" aria-hidden="true">'+dots+'</div><button type="button" class="dm-intro-link" data-intro-skip>Geç</button><button type="button" class="dm-intro-primary" data-intro-next>'+esc(nextLabel)+'</button></div>';
 }
 card.querySelector('[data-intro-next]').onclick=()=>next(index);
 card.querySelector('[data-intro-skip]').onclick=()=>close('skip');
 place();
 card.querySelector('[data-intro-next]').focus({preventScroll:true});
}
function place(){
 if(!isOpen())return;
 const step=list[index],ring=root.querySelector('[data-intro-ring]'),card=root.querySelector('[data-intro-card]'),dim=root.querySelector('[data-intro-dim]'),el=target(step);
 card.style.top=card.style.bottom='';
 if(step.center||!el){ring.hidden=true;dim.hidden=false;return;}
 const r=el.getBoundingClientRect(),pad=6,vh=window.visualViewport?.height||innerHeight;
 ring.hidden=false;dim.hidden=true;
 Object.assign(ring.style,{left:(r.left-pad)+'px',top:(r.top-pad)+'px',width:(r.width+pad*2)+'px',height:(r.height+pad*2)+'px'});
 const nav=document.getElementById('bottomNavMobile'),navTop=visible(nav)?nav.getBoundingClientRect().top:vh;
 const above=vh-r.top+pad+14,below=r.bottom+pad+14;
 if(r.height>vh*.5)card.style.bottom=Math.max(12,vh-navTop+12)+'px';
 else if(r.top+r.height/2>vh/2)card.style.bottom=Math.max(12,above)+'px';
 else if(below+240<navTop)card.style.top=below+'px';
 else card.style.bottom=Math.max(12,vh-navTop+12)+'px';
}

/* ---------- İlk tanıtım: tetikleme ---------- */
let timer=0;
function introEligible(){
 const o=who();if(!o)return false;
 if(store.get(seenKey(o))==='1'||store.get(candidateKey(o),sessionStorage)!=='1')return false;
 const y=Y();if(!y||!['school','independent'].includes(y.dmLearningPurpose))return false;
 if(!(y.karakter?.cins||store.get('ing_ka_soruldu',sessionStorage)==='1'))return false;
 return idle();
}
function poll(){if(introEligible())startIntro();}
function arm(){const o=who();if(!o)return;store.set(candidateKey(o),'1',sessionStorage);clearInterval(timer);timer=setInterval(poll,1500);}
document.addEventListener('dm:first-route-chosen',arm);
document.addEventListener('dm:first-character-chosen',arm);
if(who()&&store.get(candidateKey(who()),sessionStorage)==='1')timer=setInterval(poll,1500);
function startIntro(){
 const o=who();if(!o)return;
 clearInterval(timer);timer=0;
 store.set(seenKey(o),'1'); // Once per account on this device, even if closed mid-way.
 run(introSteps(),{label:'Papi ile uygulama tanıtımı',onClose:()=>document.dispatchEvent(new CustomEvent('dm:papi-intro-done'))});
}
window.dmPapiIntro={run,active:isOpen,idle,close:()=>close('api'),seen:o=>store.get(seenKey(String(o||who())))==='1',start:()=>{const o=who();if(o)store.set(candidateKey(o),'1',sessionStorage);startIntro();}};
})();
