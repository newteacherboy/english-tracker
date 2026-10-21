/* Papi ilk tanıtımı: yeni hesaplarda yol ve karakter (cinsiyet) seçiminden sonra
   bir kez gösterilir. Uygulamanın her sayfasını alttaki menüde ışıkla gösterip tek
   cümleyle anlatır. Sekmeleri açmaz, ekonomiye ve sunucuya dokunmaz.
   Tetikleyiciler: member-experience.js "dm:first-route-chosen", index.html
   karakter seçimi "dm:first-character-chosen". Bu olayları hiç yaşamayan mevcut
   hesaplar tanıtımı görmez. */
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
const BLOCKERS='#dmRouteChoice,#dmCharacterBuilder,.ka-perde,#dmPlacementExam,#dmStartPlacement,#dmStartingChoice,#dmPlacementInvite,#dmEmailVerification,#dmEmailGuide,#bzPerde,#dmStoryLesson,#mlThemeList,.game-modal-overlay,.dc-fullscreen-overlay.active,#yoModal.acik,#genelSonucOverlay.acik,.sa-perde,.rt-profile-backdrop,#dmCharacterBuilder';
const tab=id=>'#bottomNavMobile [data-ekran="'+id+'"]';

function steps(){
 const school=Y()?.dmLearningPurpose==='school';
 return [
  {center:true,img:'papi-merhaba',title:'Merhaba, ben Papi!',text:'Uygulamayı 1 dakikada birlikte gezelim. Her sayfanın ne işe yaradığını kısaca göstereceğim.',next:'Hadi gezelim',secondary:'Şimdi değil'},
  {target:tab('tab-dunya'),title:'Parkur',text:school?'Macera Haritan burada. Sınıfına göre üniteler ve duraklar seni bekliyor; her gün bir durak çöz.':'Öğrenme Yolun burada. Seviyene göre konular ve dersler seni bekliyor; her gün bir ders çöz.',tip:'Her durak yeni kelimeler öğretir.'},
  {target:'.dm-unified-wallet',title:'Enerji, altın ve XP',text:'Enerjiyle soru çözersin, altınla Mağaza’dan alışveriş yaparsın, XP ile seviye atlarsın.',tip:'Üst üste doğru cevaplar bonus kazandırır.'},
  {target:tab('tab-derscalis'),title:'Ders Çalış',text:'Kelime, dil bilgisi ve iletişim konularını tek tek çalış. Zorlandığın konuya buradan dönebilirsin.',tip:'Her konunun kendi oyunları var.'},
  {target:tab('tab-aktiviteler'),title:'Oyunlar',text:'Öğrendiklerinle oyna, XP ve altın kazan. Mola Vakti’nde kısa bir ara verebilirsin.',tip:'Çalıştıkça yeni oyunlar açılır.'},
  {target:tab('tab-meduakis'),title:'Arkadaşlar',text:'Arkadaşlarını ekle, başarılarını gör ve sıralamada yarış.'},
  {target:tab('tab-magaza'),title:'Mağaza',text:'Kazandığın altınlarla karakterine kıyafet, joker ve enerji alabilirsin.'},
  {target:tab('tab-profile-menu'),title:'Profil',text:'Seviyeni, rozetlerini ve hesap ayarlarını buradan görürsün.'},
  {center:true,img:'papi-kutlama',title:'Hazırsın!',text:'İlk durağın seni bekliyor. Birlikte başlayalım.',next:'İlk durağa başla',secondary:'Kapat',finish:true}
 ];
}

let root=null,index=0,list=[],owner='',timer=0,before=null;
function isOpen(){return !!root&&root.isConnected;}
// papi-flow.js holds other notices while the Papi tour is active.
if(window.dmPapiTour){const previous=window.dmPapiTour.active;window.dmPapiTour.active=()=>isOpen()||!!previous?.();}

function eligible(){
 const o=who();
 if(!o||o.toLowerCase()==='teacher'||window.dmGuestMode)return false;
 if(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci)return false;
 if(store.get(seenKey(o))==='1'||store.get(candidateKey(o),sessionStorage)!=='1')return false;
 const y=Y();if(!y||(window.yoHazirMi&&!window.yoHazirMi()))return false;
 if(!['school','independent'].includes(y.dmLearningPurpose))return false;
 const characterDone=!!y.karakter?.cins||store.get('ing_ka_soruldu',sessionStorage)==='1';
 if(!characterDone)return false;
 if(document.getElementById('panel-alani')?.style.display!=='block')return false;
 if([...document.querySelectorAll(BLOCKERS)].some(visible))return false;
 return true;
}
function poll(){if(isOpen())return;if(eligible())start();}
function arm(){const o=who();if(!o)return;store.set(candidateKey(o),'1',sessionStorage);clearInterval(timer);timer=setInterval(poll,1500);}
document.addEventListener('dm:first-route-chosen',arm);
document.addEventListener('dm:first-character-chosen',arm);
// A reload during the same session keeps waiting for the right moment.
if(who()&&store.get(candidateKey(who()),sessionStorage)==='1')timer=setInterval(poll,1500);

function start(){
 owner=who();if(!owner)return;
 store.set(seenKey(owner),'1'); // Once per account on this device, even if closed mid-way.
 clearInterval(timer);timer=0;list=steps();index=0;before=document.activeElement;
 root=document.createElement('div');root.id=ROOT_ID;root.className='dm-intro';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Papi ile uygulama tanıtımı');
 root.innerHTML='<div class="dm-intro-dim" data-intro-dim></div><div class="dm-intro-ring" data-intro-ring hidden></div><section class="dm-intro-card" data-intro-card aria-live="polite"></section>';
 document.body.append(root);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const f=[...root.querySelectorAll('button')];const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length]?.focus();}});
 addEventListener('resize',place);visualViewport?.addEventListener('resize',place);
 paint();
}
function close(){
 if(!root)return;removeEventListener('resize',place);visualViewport?.removeEventListener('resize',place);
 root.remove();root=null;before?.focus?.({preventScroll:true});
}
function finish(){
 close();
 const go=[...document.querySelectorAll('.rt-start')].find(visible);
 if(go)go.click();else window.dunyaAc?.();
}
function target(step){
 if(!step.target)return null;
 return [...document.querySelectorAll(step.target)].find(visible)||null;
}
function paint(){
 if(!isOpen())return;
 if(who()!==owner)return close();
 const step=list[index],card=root.querySelector('[data-intro-card]'),el=target(step),center=step.center||!el;
 root.classList.toggle('is-center',center);
 const dots=list.map((_,i)=>'<i class="'+(i===index?'is-current':i<index?'is-done':'')+'"></i>').join('');
 if(center){
  card.innerHTML=(step.img?'<img class="dm-intro-hero" src="discovery-assets/'+step.img+'.webp" alt="" decoding="async">':'')+
   '<h2>'+esc(step.title)+'</h2><p>'+esc(step.text)+'</p>'+(step.tip?'<span class="dm-intro-tip">'+esc(step.tip)+'</span>':'')+
   '<button type="button" class="dm-intro-primary" data-intro-next>'+esc(step.next||'İleri')+'</button>'+
   '<button type="button" class="dm-intro-link" data-intro-skip>'+esc(step.secondary||'Geç')+'</button>'+
   (step.finish||index===0?'':'<div class="dm-intro-dots" aria-hidden="true">'+dots+'</div>');
 }else{
  card.innerHTML='<div class="dm-intro-head"><img src="discovery-assets/papi-merhaba.webp" alt="" decoding="async"><div><small>'+(index+1)+' / '+list.length+'</small><h2>'+esc(step.title)+'</h2></div></div>'+
   '<p>'+esc(step.text)+'</p>'+(step.tip?'<span class="dm-intro-tip">'+esc(step.tip)+'</span>':'')+
   '<div class="dm-intro-foot"><div class="dm-intro-dots" aria-hidden="true">'+dots+'</div><button type="button" class="dm-intro-link" data-intro-skip>Geç</button><button type="button" class="dm-intro-primary" data-intro-next>İleri</button></div>';
 }
 card.querySelector('[data-intro-next]').onclick=()=>{if(step.finish)return finish();index++;paint();};
 card.querySelector('[data-intro-skip]').onclick=close;
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
 if(r.top+r.height/2>vh/2)card.style.bottom=Math.max(12,vh-r.top+pad+14)+'px';
 else card.style.top=(r.bottom+pad+14)+'px';
}
window.dmPapiIntro={start:()=>{const o=who();if(o)store.set(candidateKey(o),'1',sessionStorage);start();},active:isOpen};
})();
