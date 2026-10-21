/* Papi sayfa turları: ilk tanıtımı görmüş hesaplara sonraki oturumlarda birer sayfayı
   ayrıntılı tanıtır. Sıra: 2. oturum Parkur, 3. Arkadaşlar, 4. Oyunlar, 5. Mağaza ve
   Çantam, 6. Ders Çalış, 7. Profil. Her oturumda en fazla bir öneri gelir; "Sonra"
   denirse aynı tur bir sonraki oturuma kalır, "Göster" ya da "Geç" ile bitmiş sayılır.
   Oturum: hesabın açık olduğu bir tarayıcı oturumu (sekme/uygulama yeniden açılışı).
   Sayfayı açmak için alttaki menü düğmesine basılır; ekonomiye dokunulmaz. */
(()=>{'use strict';
if(window.dmPapiPageTours)return;
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const Y=()=>typeof yo!=='undefined'&&yo?yo:null;
const key=(name,o=who())=>'dm_papi_sayfa_'+name+'_v1:'+o.toLowerCase();
const store={
 get(k,s=localStorage){try{return s.getItem(k);}catch{return null;}},
 set(k,v,s=localStorage){try{s.setItem(k,v);}catch{}}
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible=e=>!!e&&e.isConnected&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const navButton=id=>document.querySelector('#bottomNavMobile [data-ekran="'+id+'"]');
async function openTab(id,ready){
 const b=navButton(id);
 if(b&&visible(b))b.click();
 else({'tab-dunya':window.dunyaAc,'tab-meduakis':window.meduAkisAc,'tab-aktiviteler':window.aktivitelerTamEkranAc,'tab-derscalis':window.dersCalisTamEkranAc,'tab-magaza':window.magazaAc,'tab-profile-menu':window.dmProfileMenuAc})[id]?.();
 for(let t=0;t<3000&&ready&&!document.querySelector(ready);t+=150)await wait(150);
 await wait(250);
}
const level=()=>window.dmProgression?.level?.()||1;
const lockTip=(lv,what)=>level()<lv?what+' '+lv+'. seviyede açılır.':'';

const TOURS=[
 {id:'parkur',tab:'tab-dunya',title:'Parkur',ask:'Bugün sana Parkur sayfasını yakından göstereyim mi?',steps:()=>{
  const school=Y()?.dmLearningPurpose==='school',klass=window.dmProgression?.status?.()?.startPath?.learningRoute==='needs-test';
  return [
   {center:true,before:()=>openTab('tab-dunya','.rt-v3-map'),title:'Parkur’u yakından tanıyalım',text:school?'Macera Haritası, okuldaki sınıf ve ünite sırasıyla ilerler. Bölümlerine tek tek bakalım.':'Öğrenme Yolu, seviyene göre temalar ve derslerle ilerler. Bölümlerine tek tek bakalım.',noDots:true,next:'Başlayalım'},
   {target:'.rt-v3-level',title:school?'Sınıfın ve ünite':'Seviyen ve bölüm',text:'Nerede olduğunu ve kaç durak bitirdiğini burada görürsün. Dokunursan tüm durakların listesi açılır.'},
   {target:'.rt-v3-scroll',title:'Durak haritası',text:'Kaydırarak durakları gez. Bitirdiğin duraklar işaretlenir, sıradaki durak öne çıkar, kilitli duraklar sırası gelince açılır.'},
   {target:'.rt-continue .rt-start',title:'Devam et',text:'Kaldığın duraktan başlar. Her durakta önce yeni kelimeleri dinleyip öğrenir, sonra soruları çözersin.',tip:'İlk soru ücretsiz, sonraki her soru 1 enerji.'},
   {target:'[data-rt="plan"]',title:'Planım',text:'Bugün çalışman önerilen dersleri gösterir. Ne yapacağını bilmiyorsan buradan başla.'},
   {target:'[data-rt="missions"]',title:'Görevler',text:'Günlük ve haftalık görevlerin burada. Tamamladıkça ödül kazanırsın.'},
   {target:'.rt-map-chest',title:'Sandık',text:'Seviye atlayıp parkurda ilerledikçe sandıklar açılır. Sandık hazır olunca üzerinde AÇ yazar.',tip:lockTip(5,'İlk sandık')},
   {target:'.rt-v3-switch',title:'Parkur değiştir',text:school?'Buradan Öğrenme Yolu’na geçebilirsin. Öğrenme Yolu sınıf yerine İngilizce seviyene (A1, A2…) göre ilerler. İki yoldaki ilerlemen de korunur.':'Buradan Macera Haritası’na geçebilirsin. Macera Haritası okuldaki sınıf ve ünite sırasını izler. İki yoldaki ilerlemen de korunur.',tip:school&&klass?'Öğrenme Yolu’na geçmeden önce seviye testini çözmen gerekir.':''},
   {center:true,img:'papi-mektup',title:'Seviye testi',text:'Profil › Seviye Testi’nden İngilizce seviyeni ölçebilirsin. Okuma, dinleme ve dil kullanımı soruları var; yaklaşık 20–25 dakika sürer ve enerji harcamaz. Sonuca göre sana uygun başlangıç önerilir.',noDots:true,next:'Anladım',secondary:'Kapat'}
  ];
 }},
 {id:'arkadaslar',tab:'tab-meduakis',title:'Arkadaşlar',ask:'Bugün sana Arkadaşlar sayfasını göstereyim mi?',steps:()=>[
  {center:true,before:()=>openTab('tab-meduakis','.fr-home'),title:'Arkadaşlar',text:'Arkadaşlarınla birlikte öğrenip yarışacağın yer. Bölümlerine bakalım.',noDots:true,next:'Başlayalım'},
  {target:'.fr-welcome .fr-add',title:'Arkadaş ekle',text:'Kullanıcı adıyla arkadaşını ara ve takip et.',tip:lockTip(15,'Takip')},
  {target:'.fr-friends',title:'Arkadaşlarım',text:'Takip ettiğin arkadaşların burada; kimin çevrimiçi olduğunu görürsün. “Davet et” ile oyun daveti gönderebilirsin.'},
  {target:'.fr-summaries',title:'Vitrin ve lig',text:'Vitrininde rozetlerini sergilersin. Haftalık ligde o hafta kazandığın XP ile sıralamaya girersin; lig her hafta yenilenir.',tip:lockTip(5,'Lig')},
  {target:'.fr-feed',title:'Arkadaş akışı',text:'Arkadaşlarının başarılarını gör ve onları tebrik et. Filtrelerle sadece takip ettiklerini ya da çevrimiçi olanları seçebilirsin.',tip:lockTip(10,'Tebrik')},
  {target:'#frInvitation:not(:empty)',title:'Davetler',text:'Sana gelen oyun davetleri burada çıkar; kabul edip hemen oynayabilirsin.'},
  {target:'.fr-matches',title:'Karşılaşmalarım',text:'Düellolarını ve oyun davetlerinin sonuçlarını buradan takip edersin.',tip:lockTip(20,'Düello')},
  {center:true,img:'papi-kutlama',title:'Birlikte daha eğlenceli!',text:'Arkadaşlarını takip et, haftalık ligde yarış ve birbirinizi tebrik edin.',noDots:true,next:'Tamam',secondary:'Kapat'}
 ]},
 {id:'oyunlar',tab:'tab-aktiviteler',title:'Oyunlar',ask:'Bugün sana Oyunlar sayfasını göstereyim mi?',steps:()=>[
  {center:true,before:()=>openTab('tab-aktiviteler','.gg-tabs'),title:'Oyunlar',text:'Öğrendiklerini oynayarak pekiştirdiğin yer. Üstteki sekmelerle oyun türünü seçersin.',noDots:true,next:'Başlayalım'},
  {target:'#ggSoloTab',before:()=>document.querySelector('#ggSoloTab')?.click(),title:'Tek Kişilik',text:'Kelime oyunlarını tek başına oyna, XP ve altın kazan. Seviye atladıkça yeni oyunlar açılır.'},
  {target:'.gg-filters',title:'Beceri filtresi',text:'Oyunları becerilere göre süzerek istediğin türü hızlıca bul.'},
  {target:'.gg-next',title:'Sıradaki oyun',text:'Bir sonraki kilitli oyunun hangi seviyede açılacağını ve ne kadar kaldığını gösterir.'},
  {target:'.gg-resume',title:'Son oynadığın',text:'En son oynadığın oyuna tek dokunuşla dönersin.'},
  {target:'#ggOnlineTab',title:'Online Çift Kişilik',text:'Takip ettiğin bir arkadaşınla aynı anda ya da 24 saat içinde farklı zamanlarda oyna.',tip:lockTip(30,'İki kişilik oyunlar')},
  {target:'#ggFreeTab',title:'Kapışma',text:'Kartlarla öğren, aynı cihazda bir arkadaşınla karşılıklı yarış.'},
  {target:'#ggKonuTab',title:'Konu Oyunları',text:'Ders Çalış’taki konuları oyunla pekiştir. %80 ve üzeri başarıda 70 XP kazanırsın.'},
  {target:'[data-gg-party="break"]',title:'Mola Vakti',text:'Derslerden bağımsız, kısa ve eğlenceli oyunlar. Altın toplarsın; her oyun için günde 2 hakkın var.'},
  {center:true,img:'papi-kutlama',title:'İyi eğlenceler!',text:'Her oyun turu ödül kazandırır. Sonuç ekranında kazandığın XP’yi ve altını görürsün.',noDots:true,next:'Tamam',secondary:'Kapat'}
 ]},
 {id:'magaza',tab:'tab-magaza',title:'Mağaza ve Çantam',ask:'Bugün sana Mağaza’yı ve Çantam’ı göstereyim mi?',steps:()=>[
  {center:true,before:()=>openTab('tab-magaza','.ds-home'),title:'Mağaza',text:'Kazandığın altınları harcadığın yer. Bölümlerine bakalım.',noDots:true,next:'Başlayalım'},
  {target:'.ds-wallet',title:'Altının',text:'Şu anki altın bakiyen. Ders çalıştıkça, oynadıkça ve görev tamamladıkça altın kazanırsın.'},
  {target:'.ds-room',title:'Karakterin',text:'“Tipimi tasarla” ile karakterinin görünümünü düzenle, “Alışveriş Yap” ile kıyafet ve aksesuar al.',tip:'Yeni kıyafet türleri seviye atladıkça açılır.'},
  {target:'#dsEnergy',title:'Enerji al',text:'Enerjin azaldığında altınla enerji paketi alabilirsin. Enerji ayrıca her 15 dakikada 1 dolar.'},
  {target:'.ds-jokers',title:'Jokerler',text:'Oyunlarda işini kolaylaştıran özel güçler.',tip:lockTip(15,'Jokerler')},
  {target:'.ds-discover-grid',title:'Sandıklar ve koleksiyon',text:'Kazandığın sandıkları aç ve karakter koleksiyonunu tamamla.'},
  {target:'#dmBagPopup',title:'Çantam',text:'Satın aldığın ve kazandığın her şey burada: sandıklar, jokerler, rozetler, karakterler, kıyafetler, eşyalar ve enerji.',tip:'Mağaza düğmesine dokununca Çantam da açılır.'},
  {center:true,img:'papi-kutlama',title:'Alışverişe hazırsın!',text:'Altınlarını biriktir, karakterini istediğin gibi giydir.',noDots:true,next:'Tamam',secondary:'Kapat'}
 ]},
 {id:'derscalis',tab:'tab-derscalis',title:'Ders Çalış',ask:'Bugün sana Ders Çalış sayfasını göstereyim mi?',steps:()=>[
  {center:true,before:()=>openTab('tab-derscalis','#dcScreenLevels'),title:'Ders Çalış',text:'Konu konu İngilizce çalıştığın yer. Bölümlerine bakalım.',noDots:true,next:'Başlayalım'},
  {target:'.dc-arama-kutu',title:'Konu ara',text:'Konu adını yazarak aradığın dersi hızlıca bul.'},
  {target:'.dc-voice-toggle',title:'Aksan seçimi',text:'Örnek cümleleri Amerikan ya da İngiliz aksanıyla dinleyebilirsin.'},
  {target:'.dc-level-grid',title:'Seviyeler',text:'A1’den B2’ye seviyeni seç. Her seviyede dil bilgisi, kelime ve iletişim konuları var.',tip:'Üst seviyeler önceki seviyeyi bitirince açılır.'},
  {center:true,img:'papi-mektup',title:'Bir konuyu açınca',text:'Anlatımı ve örnekleri oku, cümleleri dinle, sonra testi çöz. Konuyu bitirince Konu Macerası ile uygulama yaparsın; Oyunlar › Konu Oyunları’nda da pekiştirebilirsin.',noDots:true,next:'Tamam',secondary:'Kapat'}
 ]},
 {id:'profil',tab:'tab-profile-menu',title:'Profil',ask:'Bugün sana Profil menüsündeki düğmeleri göstereyim mi?',steps:()=>{
  const p=a=>'#rtProfileBackdrop [data-profile="'+a+'"]';
  return [
   {center:true,before:()=>{if(!document.getElementById('rtProfileBackdrop'))return openTab('tab-profile-menu','#rtProfileBackdrop');},title:'Profil menüsü',text:'Hesabınla ve gelişiminle ilgili her şey burada. Düğmelere tek tek bakalım.',noDots:true,next:'Başlayalım'},
   {target:p('profile'),title:'Profilim',text:'Adın, sınıfın ve kişisel bilgilerin.'},
   {target:p('progress'),title:'İlerlemem',text:'Seviyeni, XP’ni ve çalışma grafiklerini gösterir; bir sonraki seviyede neyin açılacağını da görürsün.'},
   {target:p('badges'),title:'Başarılarım',text:'Kazandığın rozetler ve başarımlar. Yanındaki Karnelerim’de tamamladığın sınıf ve seviyelerin karneleri var.'},
   {target:p('daily'),title:'Ödevlerim',text:'Günün görevleri, haftalık hedefin ve öğretmeninin verdiği ödevler burada.'},
   {target:p('exam'),title:'Seviye Testi',text:'İngilizce seviyeni ölçer; enerji harcamaz. Sonuca göre sana uygun başlangıç önerilir.'},
   {target:p('repeat'),title:'Kelime Tekrarı',text:'Yanlış yaptığın kelimeleri enerji harcamadan tekrar edersin. Kelimeler farklı günlerde yeniden karşına çıkar.'},
   {target:p('coach'),title:'Öğretmene Mesaj Gönder',text:'Öğretmenine soru sorabilir ya da bir sorunu bildirebilirsin.'},
   {target:p('route'),title:'Parkur Değiştir',text:'Macera Haritası ile Öğrenme Yolu arasında geçiş yaparsın; iki yoldaki ilerlemen de korunur.'},
   {target:p('guardian'),title:'Veli Kontrolü ve Güvenlik',text:'Velinin izin ve bildirim ayarları ile güvenlik ve bildirim tercihlerin bu düğmelerde.'},
   {target:p('settings'),title:'Ayarlar ve Yardım',text:'Hesap, şifre ve ses ayarların Ayarlar’da. Takıldığın bir şey olursa Yardım & Destek’e bak.'},
   {target:p('switchAccount'),title:'Hesap Değiştir ve Çıkış',text:'Aynı cihazda başka bir hesaba geçebilir ya da çıkış yapabilirsin.'},
   {center:true,img:'papi-kutlama',title:'Tanıtım bitti!',text:'Artık uygulamanın tüm sayfalarını biliyorsun. Bir şey unutursan Profil › Yardım & Destek’e bakabilirsin.',noDots:true,next:'Tamam',secondary:'Kapat'}
  ];
 },after:()=>{document.querySelector('#rtProfileBackdrop .rt-close')?.click();}}
];

/* ---------- Oturum sayacı ve öneri ---------- */
function countSession(){
 const o=who();if(!o||o.toLowerCase()==='teacher'||window.dmGuestMode)return 0;
 if(!window.dmPapiIntro?.seen?.(o))return 0; // Only accounts that went through the first intro.
 const mark='dm_papi_oturum_sayildi:'+o.toLowerCase();
 let n=Number(store.get(key('oturum',o)))||0;
 if(store.get(mark,sessionStorage)!=='1'){
  store.set(mark,'1',sessionStorage);
  // The session that showed the first intro is session 1.
  n=n?n+1:(store.get('dm_papi_tanitim_aday:'+o.toLowerCase(),sessionStorage)==='1'?1:2);
  store.set(key('oturum',o),String(n));
 }
 return n;
}
function pending(){
 const o=who(),n=Number(store.get(key('oturum',o)))||0;
 if(n<2)return null;
 if(store.get(key('teklif',o),sessionStorage)==='1')return null; // One offer per session.
 const done=TOURS.filter(t=>store.get(key(t.id,o))==='1').length;
 const tour=TOURS.find(t=>store.get(key(t.id,o))!=='1');
 if(!tour)return null;
 // Tour k (0-based) waits for session k+2, so pages are spread over sessions 2..7.
 return n>=TOURS.indexOf(tour)+2&&done===TOURS.indexOf(tour)?tour:null;
}
let offerEl=null,since=0;
function homeVisible(){return [...document.querySelectorAll('.rt-v3-map')].some(visible);}
function offer(tour){
 const o=who();store.set(key('teklif',o),'1',sessionStorage);
 offerEl?.remove();
 const el=document.createElement('aside');el.id='dmPapiPageOffer';el.className='dm-page-offer';el.setAttribute('role','dialog');el.setAttribute('aria-label','Papi önerisi');
 el.innerHTML='<img src="discovery-assets/papi-merhaba.webp" alt="" decoding="async"><div><b>'+esc(tour.title)+'</b><p>'+esc(tour.ask)+'</p><div class="dm-page-offer-actions"><button type="button" class="dm-intro-link" data-later>Sonra</button><button type="button" class="dm-intro-primary" data-go>Göster</button></div></div>';
 document.body.append(el);offerEl=el;
 el.querySelector('[data-later]').onclick=()=>{el.remove();offerEl=null;};
 el.querySelector('[data-go]').onclick=()=>{el.remove();offerEl=null;start(tour);};
 el.querySelector('[data-go]').focus({preventScroll:true});
}
function start(tour){
 const o=who();store.set(key(tour.id,o),'1');
 window.dmPapiIntro?.run(tour.steps(),{label:'Papi ile '+tour.title+' tanıtımı',onClose:()=>{try{tour.after?.();}catch{}}});
}
function tick(){
 if(offerEl?.isConnected)return;
 if(!window.dmPapiIntro?.idle?.()||!homeVisible()){since=0;return;}
 countSession();
 const tour=pending();if(!tour){since=0;return;}
 if(!since){since=Date.now();return;}
 if(Date.now()-since<3000)return; // Settle for a moment on the home screen first.
 since=0;offer(tour);
}
setInterval(tick,1500);
document.addEventListener('dm:papi-intro-done',()=>countSession());
window.dmPapiPageTours={tours:TOURS.map(t=>t.id),start:id=>{const t=TOURS.find(x=>x.id===id);if(t)start(t);},session:()=>Number(store.get(key('oturum')))||0};
})();
