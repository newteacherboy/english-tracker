/* Same API roles as password login; server still enforces teacher/student scope. */
(function(g){
 const teacherPrefix=/^(teacherPortal|teacherNotification|teacherLearning|teacherPlacement|ogretmen|ogrenciSifre|bekleyenKayit|kayitOnayla|kayitReddet|rubrik|rapor|odevVer|odevSil|odevListesiOgretmen|duyuruEkle|duyuruSil|duyuruAktif|duyuruListesiGetir|sinifIci|ozellikIzni|communication|adminStudent)/;
 g.DMTeacherRequestPolicy={isTeacher(op,args={},context={}){return teacherPrefix.test(op)||['yoneticiOgrenciler','yoneticiOgrenciKaydet','yoneticiOgrenciSil','yoneticiIletisimListesi','announcementInbox','announcementRead','ekVeriTumu','ekVeriOzet','haftalikVeliRaporu','etkinlikTanimlariGetir','tumVideolariGetir','ozellikListesiGetir','etkinlikAta','disLinkEtkinlikAta','videoOgrenciEkle','planTikGuncelle'].includes(op)||!op&&!!context.tools||op==='ekVeriGetir'&&!!context.tools&&args.ogrenci&&args.ogrenci!==context.participant;}};
})(typeof window!=='undefined'?window:globalThis);
/* Device account registry uses the real storage before classroom isolation. No code is saved. */
(()=>{'use strict';
 if(typeof window==='undefined')return;
 const storage=window.localStorage,ss=window.sessionStorage,KEY='dm_teacher_sessions_v1',ACTIVE='dm_last_account_v1';
 const valid=s=>s&&typeof s.teacherToken==='string'&&s.teacherToken&&typeof s.name==='string'&&s.participant?.token&&s.participant?.name;
 const read=()=>{try{const a=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(valid):[];}catch{return [];}};
 const write=a=>storage.setItem(KEY,JSON.stringify(a));
 function remember(s,active=true){if(!valid(s))return;write([s,...read().filter(x=>x.teacherToken!==s.teacherToken&&x.name!==s.name)]);if(active)storage.setItem(ACTIVE,JSON.stringify({kind:'teacher',token:s.teacherToken}));}
 function forget(token){write(read().filter(x=>x.teacherToken!==token));try{const last=JSON.parse(storage.getItem(ACTIVE)||'null');if(last?.token===token)storage.removeItem(ACTIVE);}catch{}}
 function personal(){storage.setItem(ACTIVE,JSON.stringify({kind:'personal'}));}
 function leave(){
  personal();const old=ss.getItem('dm_tp_previous_teacher');if(old)ss.setItem('ing_ogr_token',old);else ss.removeItem('ing_ogr_token');
  for(const k of ['dm_tp_previous_teacher_saved','dm_tp_previous_teacher','dm_tp_session','dm_tp_pending'])ss.removeItem(k);
 }
 function activate(s){if(!valid(s))throw Error('Öğretmen oturumu bulunamadı. Kodunla tekrar giriş yap.');remember(s);ss.setItem('dm_tp_session',JSON.stringify(s));location.assign('./?ogretmen=1');}
 const params=new URLSearchParams(location.search);
 const explicitEntry=['giris','kayit','ogretmenGiris','baslangic','hesap','oauth','code','kesifKayit','google_return'].some(key=>params.has(key));
 let last,autoResumed=false;try{last=JSON.parse(storage.getItem(ACTIVE)||'null');}catch{}
 // A native WebView can reopen the last ?ogretmen=1 route after sessionStorage was cleared.
 // Recover the saved teacher session on that route too, before the missing-session redirect.
 if(!explicitEntry&&!location.hash&&last?.kind==='teacher'){
  const saved=read().find(x=>x.teacherToken===last.token);
  const teacherRoute=params.get('ogretmen')==='1';
  let live=null;try{live=JSON.parse(ss.getItem('dm_tp_session')||'null');}catch{}
  if(saved&&(!teacherRoute||!valid(live))){
   ss.setItem('dm_tp_session',JSON.stringify(saved));
   if(!teacherRoute){params.set('ogretmen','1');history.replaceState(null,'',location.pathname+'?'+params.toString());}
   autoResumed=true;
  }
 }
 window.dmTeacherDevice={storage,list:read,remember,forget,personal,leave,activate,autoResumed};

 // Verify teacher approval using the current personal learner token, not saved device sessions.
 if(params.get('ogretmen')!=='1'){
  const button=document.createElement('button');
  button.id='dmPersonalToTeacher';button.type='button';button.className='dm-teacher-switch';button.hidden=true;
  const LABEL='<span class="dm-ts-icon" aria-hidden="true"></span><span class="dm-ts-copy"><b>Öğretmen Paneli</b><small>Sınıfını ve öğrencilerini yönet</small></span><span class="dm-ts-go">Geç <span aria-hidden="true">›</span></span>';button.innerHTML=LABEL;button.setAttribute('aria-label','Öğretmen Paneline Geç');
  const api=async(islem,t,data={})=>{
   const response=await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({islem,t,...data})});
   const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.mesaj||'Öğretmen hesabı doğrulanamadı.');
   return result;
  };
  let checked='',checking=false;
  const token=()=>storage.getItem('ing_token')||'';
  /* [18 Kas 2026] Supabase yükü: öğretmen onay durumu her pencere odağında (günde ~700 kez) soruluyordu.
     Sonuç bu cihazda hesaba özel saklanır: onaylıysa 6 saat, değilse 1 saat yeniden sorulmaz.
     Jetonun kendisi değil yalnız kısa özeti saklanır. */
  const STATUS_KEY='dm_tp_status_v1';
  const tokenTag=t=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36)+':'+t.length;};
  const cachedStatus=t=>{try{const c=JSON.parse(storage.getItem(STATUS_KEY)||'null');if(!c||c.tag!==tokenTag(t))return null;const age=Date.now()-Number(c.at||0);return age>=0&&age<(c.state==='approved'?6:1)*3600000?c.state:null;}catch{return null;}};
  const saveStatus=(t,state)=>{try{storage.setItem(STATUS_KEY,JSON.stringify({tag:tokenTag(t),state:String(state||'none'),at:Date.now()}));}catch{}};
  const showSwitch=()=>{button.hidden=false;document.dispatchEvent(new CustomEvent('dm:teacher-switch-ready'));};
  const refresh=async()=>{
   const t=token();if(t===checked||checking)return;
   checked=t;button.hidden=true;if(!t)return;
   const known=cachedStatus(t);if(known){if(known==='approved')showSwitch();return;}
   checking=true;
   try{const result=await api('teacherPortalStatus',t,{offerOnly:true});
    if(t===token()){saveStatus(t,result.state);if(result.state==='approved')showSwitch();}
   }catch{}finally{checking=false;}
  };
  button.onclick=async()=>{
   const t=token();if(!t)return;
   button.disabled=true;button.querySelector('.dm-ts-copy small').textContent='Öğretmen paneli açılıyor…';
   try{
    const entry=await api('teacherPortalEnter',t);
    const participant=await api('teacherPortalParticipant',entry.token,{self:true});
    if(t!==token())throw Error('Hesap değişti. Tekrar dene.');
    activate({teacherToken:entry.token,name:entry.name,participant,playAsSelf:true,route:'home'});
   }catch(error){alert(error.message||'Öğretmen paneline geçilemedi.');button.disabled=false;button.innerHTML=LABEL;}
  };
  // 11 Kas 2026: Okul Yolum kartının içine sıkışmasın; kartın hemen altında tam genişlik şerit.
  const placeBesideRoute=()=>{
    const unit=document.querySelector('#tab-dunya .rt-medal-unit');
    if(!unit||!unit.parentElement)return;
    if(unit.nextElementSibling!==button)unit.after(button);
   };
  window.dmTeacherSwitch={available:()=>!button.hidden,open:()=>button.click()};
   const mount=()=>{
    // The route selector is rebuilt on grade/path changes: stay in the same toolbar.
    document.body.append(button);
    placeBesideRoute();
    const root=document.getElementById('tab-dunya');
    if(root){
     let queued=false;
     new MutationObserver(()=>{
      if(queued)return;queued=true;
      requestAnimationFrame(()=>{queued=false;placeBesideRoute();});
     }).observe(root,{subtree:true,childList:true});
    }
    void refresh();
   };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  document.addEventListener('dm:login',()=>{checked='';void refresh();});
  // Odak dönüşünde yalnız kayıt süresi dolduysa sunucuya gidilir (cachedStatus).
  window.addEventListener('focus',()=>{checked='';void refresh();});
  setInterval(()=>{if(token()!==checked)void refresh();},2000);
 }

})();
/* Isolate classroom storage in this tab; personal learner storage is never overwritten. */
(()=>{'use strict';
 const params=new URLSearchParams(location.search);if(params.get('ogretmen')!=='1')return;
 let state;try{state=JSON.parse(sessionStorage.getItem('dm_tp_session')||'null');}catch{}
 if(!state?.teacherToken||!state?.participant?.token){
  // A stale last-used teacher route is not a request to enter a new teacher code.
  let returningTeacher=false;
  try{returningTeacher=JSON.parse(window.dmTeacherDevice.storage.getItem('dm_last_account_v1')||'null')?.kind==='teacher';}catch{}
  window.dmTeacherDevice.personal();
  const next=returningTeacher?(window.dmTeacherDevice.storage.getItem('ing_token')?'./?hesap=1':'./?baslangic=1'):'./?ogretmenGiris=1';
  location.replace(next);return;
 }
 window.dmTeacherDevice.remember(state);
 // Classroom game checks use a virtual allowance; the real wallet is never changed.
 Object.defineProperty(window,'genelEnerjiKalan',{configurable:true,get:()=>25,set:()=>{}});
 window.dmTeacherPortalMode=true;window.dmTeacherPortalSession=state;
 // [Teacher-only standard grade 7 curriculum, 2026-2027.] Never persist this overlay in the personal word cache.
 // BEGIN TEACHER GRADE 7 BANK
 const grade7Titles=["Appearance and Personality","Sports","Biographies","Wild Animals","Television","Celebrations","Dreams","Public Buildings","Environment","Planets"];
 const grade7Entries=[[1,"Curly","Kıvırcık"],[1,"Straight","Düz"],[1,"Blonde","Sarışın"],[1,"Generous","Cömert"],[1,"Selfish","Bencil"],[1,"Punctual","Dakik"],[1,"Outgoing","Dışa dönük"],[1,"Shy","Utangaç"],[1,"Stubborn","İnatçı"],[1,"Smart","Zeki"],[1,"Hardworking","Çalışkan"],[1,"Lazy","Tembel"],[1,"Friendly","Dost canlısı"],[1,"Kind","Nazik"],[1,"Polite","Kibar"],[1,"Rude","Kaba"],[1,"Honest","Dürüst"],[1,"Helpful","Yardımsever"],[1,"Social","Sosyal"],[1,"Handsome","Yakışıklı"],[1,"Beautiful","Güzel"],[1,"Ugly","Çirkin"],[1,"Age","Yaş"],[1,"appearance","dış görünüş"],[1,"personality","kişilik"],[1,"tall","uzun boylu"],[1,"short","kısa boylu"],[1,"slim","ince yapılı"],[1,"overweight","kilolu"],[1,"wavy","dalgalı"],[1,"dark hair","koyu renk saç"],[1,"cheerful","neşeli"],[1,"easygoing","uyumlu"],[1,"patient","sabırlı"],[1,"thoughtful","düşünceli"],[1,"attractive","çekici"],[1,"I am taller than my brother.","Erkek kardeşimden daha uzunum."],[1,"She has curly brown hair.","Onun kıvırcık kahverengi saçları var."],[1,"He is a generous person.","O cömert bir insan."],[1,"My sister is very cheerful.","Kız kardeşim çok neşelidir."],[1,"He is shorter than me.","O benden daha kısa."],[1,"She always helps her friends.","O her zaman arkadaşlarına yardım eder."],[1,"My mother is more patient.","Annem daha sabırlıdır."],[1,"He is friendly and hardworking.","O arkadaş canlısı ve çalışkandır."],[1,"What does she look like?","Onun dış görünüşü nasıl?"],[1,"What is he like?","O nasıl biridir?"],[1,"She is younger than Tom.","O Tom'dan daha genç."],[1,"I think he is honest.","Bence o dürüsttür."],[2,"Football","Futbol"],[2,"Basketball","Basketbol"],[2,"Tennis","Tenis"],[2,"Swimming","Yüzme"],[2,"Running","Koşu"],[2,"Cycling","bisiklete binme"],[2,"Training","Antrenman"],[2,"Match","Maç"],[2,"Score","Skor"],[2,"Winner","Kazanan"],[2,"Loser","Kaybeden"],[2,"Team","Takım"],[2,"Player","Oyuncu"],[2,"Referee","Hakem"],[2,"Medal","Madalya"],[2,"Cup","Kupa"],[2,"Tournament","Turnuva"],[2,"Goal","Gol"],[2,"Net","File"],[2,"Ball","Top"],[2,"Court","Saha"],[2,"Pitch","çim saha"],[2,"Track","Pist"],[2,"Gym","Spor salonu"],[2,"Exercise","Egzersiz"],[2,"Fit","Formda"],[2,"Active","Aktif"],[2,"Outdoor","Açık hava"],[2,"Indoor","Kapalı alan"],[2,"athlete","sporcu"],[2,"competition","yarışma"],[2,"equipment","ekipman"],[2,"workout","antrenman"],[2,"practice","pratik yapmak"],[2,"beat","yenmek"],[2,"lose","kaybetmek"],[2,"train","antrenman yapmak"],[2,"go cycling","bisiklete binmek"],[2,"play volleyball","voleybol oynamak"],[2,"I play football every weekend.","Her hafta sonu futbol oynarım."],[2,"She goes swimming twice a week.","Haftada iki kez yüzmeye gider."],[2,"They train every morning.","Onlar her sabah antrenman yapar."],[2,"He never plays basketball.","O hiç basketbol oynamaz."],[2,"We need some sports equipment.","Biraz spor ekipmanına ihtiyacımız var."],[2,"My team won the match.","Takımım maçı kazandı."],[2,"How often do you exercise?","Ne sıklıkta egzersiz yaparsın?"],[2,"She usually rides her bike.","O genellikle bisikletine biner."],[2,"The referee blew the whistle.","Hakem düdüğünü çaldı."],[2,"He is a successful athlete.","O başarılı bir sporcu."],[2,"I prefer outdoor sports.","Açık hava sporlarını tercih ederim."],[2,"They scored two goals.","Onlar iki gol attı."],[3,"Born","doğmak"],[3,"Grow up","Büyümek"],[3,"Graduate","mezun olmak"],[3,"Die","Ölmek"],[3,"Win","Kazanmak"],[3,"Medal","Madalya"],[3,"Prize","Ödül"],[3,"Success","Başarı"],[3,"Famous","Ünlü"],[3,"Inventor","mucit"],[3,"Scientist","Bilim insanı"],[3,"Artist","Sanatçı"],[3,"Writer","Yazar"],[3,"Leader","Lider"],[3,"History","Tarih"],[3,"Past","Geçmiş"],[3,"Century","Yüzyıl"],[3,"Year","Yıl"],[3,"Date","Tarih"],[3,"Place","Yer"],[3,"Country","Ülke"],[3,"City","Şehir"],[3,"School","Okul"],[3,"University","Üniversite"],[3,"Degree","üniversite derecesi"],[3,"Job","İş"],[3,"Life","Yaşam"],[3,"Story","Hikaye"],[3,"Book","Kitap"],[3,"Invention","İcat"],[3,"biography","biyografi"],[3,"be born","doğmak"],[3,"birthplace","doğum yeri"],[3,"childhood","çocukluk"],[3,"education","eğitim"],[3,"achievement","başarı"],[3,"discover","keşfetmek"],[3,"invent","icat etmek"],[3,"marry","evlenmek"],[3,"move","taşınmak"],[3,"He was born in Ankara.","O Ankara'da doğdu."],[3,"She grew up in İzmir.","O İzmir'de büyüdü."],[3,"He graduated from university.","O üniversiteden mezun oldu."],[3,"She became a famous writer.","O ünlü bir yazar oldu."],[3,"He won an important prize.","O önemli bir ödül kazandı."],[3,"They moved to İstanbul.","Onlar İstanbul'a taşındı."],[3,"When was she born?","O ne zaman doğdu?"],[3,"He invented a new machine.","O yeni bir makine icat etti."],[3,"She studied science at university.","O üniversitede fen bilimleri okudu."],[3,"His childhood was very happy.","Onun çocukluğu çok mutluydu."],[3,"He wrote many books.","O birçok kitap yazdı."],[3,"She died in 1990.","O 1990 yılında öldü."],[4,"Lion","Aslan"],[4,"Tiger","Kaplan"],[4,"Elephant","Fil"],[4,"Monkey","Maymun"],[4,"Zebra","Zebra"],[4,"Snake","Yılan"],[4,"Crocodile","Timsah"],[4,"Giraffe","Zürafa"],[4,"Bear","Ayı"],[4,"Wolf","Kurt"],[4,"Fox","Tilki"],[4,"Leopard","Leopar"],[4,"Cheetah","Çita"],[4,"Rhino","Gergedan"],[4,"Hippo","Su aygırı"],[4,"Kangaroo","Kanguru"],[4,"Panda","Panda"],[4,"Koala","Koala"],[4,"Eagle","Kartal"],[4,"Owl","Baykuş"],[4,"Shark","Köpekbalığı"],[4,"Whale","Balina"],[4,"Dolphin","Yunus"],[4,"Jungle","balta girmemiş orman"],[4,"Desert","Çöl"],[4,"Savanna","savan"],[4,"Ocean","Okyanus"],[4,"River","Nehir"],[4,"Danger","Tehlike"],[4,"Protect","Korumak"],[4,"habitat","yaşam alanı"],[4,"wildlife","yaban hayatı"],[4,"endangered","nesli tehlikede olan"],[4,"extinct","nesli tükenmiş"],[4,"hunt","avlamak"],[4,"prey","av"],[4,"predator","yırtıcı"],[4,"herbivore","otçul"],[4,"carnivore","etçil"],[4,"fur","kürk"],[4,"Lions live in the savanna.","Aslanlar savanda yaşar."],[4,"Elephants are very large animals.","Filler çok büyük hayvanlardır."],[4,"We should protect wild animals.","Vahşi hayvanları korumalıyız."],[4,"A shark lives in the ocean.","Köpekbalığı okyanusta yaşar."],[4,"Pandas usually eat bamboo.","Pandalar genellikle bambu yer."],[4,"Some animals are endangered.","Bazı hayvanların nesli tehlikededir."],[4,"An eagle can fly high.","Kartal yüksekte uçabilir."],[4,"Crocodiles have sharp teeth.","Timsahların keskin dişleri vardır."],[4,"Don't destroy their habitats.","Onların yaşam alanlarını yok etme."],[4,"Wolves hunt in groups.","Kurtlar gruplar halinde avlanır."],[4,"A giraffe has a long neck.","Zürafanın uzun bir boynu vardır."],[4,"We must not harm wildlife.","Yaban hayatına zarar vermemeliyiz."],[5,"Commercial","Reklam"],[5,"Series","Dizi"],[5,"Documentary","Belgesel"],[5,"Quiz show","Yarışma programı"],[5,"Talk show","Söyleşi programı"],[5,"News","Haberler"],[5,"Cartoon","Çizgi film"],[5,"Sport program","spor programı"],[5,"Remote control","Uzaktan kumanda"],[5,"Channel","Kanal"],[5,"Broadcast","Yayınlamak"],[5,"Screen","Ekran"],[5,"Viewer","İzleyici"],[5,"Audience","Seyirci"],[5,"Episode","Bölüm"],[5,"Host","Sunucu"],[5,"Guest","konuk"],[5,"Interesting","İlginç"],[5,"Boring","Sıkıcı"],[5,"Educational","Eğitici"],[5,"Informative","Bilgilendirici"],[5,"Funny","Komik"],[5,"Absurd","Absürt"],[5,"Waste","Boşa harcamak"],[5,"Time","Zaman"],[5,"Turn on","Açmak"],[5,"Turn off","Kapatmak"],[5,"Change","Değiştirmek"],[5,"Watch","İzlemek"],[5,"TV programme","TV programı"],[5,"advertisement","reklam"],[5,"soap opera","pembe dizi"],[5,"reality show","gerçek yaşam programı"],[5,"weather forecast","hava durumu tahmini"],[5,"audience member","seyirci"],[5,"prefer","tercih etmek"],[5,"recommend","tavsiye etmek"],[5,"turn over","kanal değiştirmek"],[5,"I prefer documentaries to cartoons.","Belgeselleri çizgi filmlere tercih ederim."],[5,"She watches the news every evening.","O her akşam haberleri izler."],[5,"What is your favourite programme?","En sevdiğin program nedir?"],[5,"This series is very interesting.","Bu dizi çok ilginç."],[5,"He doesn't like quiz shows.","O yarışma programlarını sevmez."],[5,"Please turn off the television.","Lütfen televizyonu kapat."],[5,"I think cartoons are entertaining.","Bence çizgi filmler eğlencelidir."],[5,"We watched a documentary yesterday.","Dün bir belgesel izledik."],[5,"The weather forecast starts now.","Hava durumu tahmini şimdi başlıyor."],[5,"Can you change the channel?","Kanalı değiştirebilir misin?"],[5,"My father prefers sports programmes.","Babam spor programlarını tercih eder."],[5,"I don't watch TV often.","Sık sık televizyon izlemem."],[6,"Party","Parti"],[6,"Birthday","Doğum günü"],[6,"Balloon","Balon"],[6,"Cake","Pasta"],[6,"Candle","Mum"],[6,"Guest","Misafir"],[6,"Present","hediye"],[6,"Music","müzik"],[6,"Dance","Dans etmek"],[6,"Invite","Davet etmek"],[6,"Invitation","Davetiye"],[6,"Decorate","Süslemek"],[6,"Food","Yiyecek"],[6,"Drink","İçecek"],[6,"Beverage","İçecek"],[6,"Snack","Atıştırmalık"],[6,"Surprise","Sürpriz"],[6,"Happy","Mutlu"],[6,"Excited","Heyecanlı"],[6,"Busy","Meşgul"],[6,"Ready","Hazır"],[6,"Buy","Satın almak"],[6,"Make","Yapmak"],[6,"Prepare","Hazırlamak"],[6,"Help","Yardım etmek"],[6,"Tradition","Gelenek"],[6,"Festival","Festival"],[6,"Holiday","Bayram tatil"],[6,"Family","Aile"],[6,"celebration","kutlama"],[6,"invitee","davetli"],[6,"gift","hediye"],[6,"birthday party","doğum günü partisi"],[6,"occasion","özel gün"],[6,"host","ev sahibi"],[6,"accept","kabul etmek"],[6,"refuse","reddetmek"],[6,"offer","teklif etmek"],[6,"attend","katılmak"],[6,"Would you like some cake?","Biraz pasta ister misin?"],[6,"Let's organize a birthday party.","Bir doğum günü partisi düzenleyelim."],[6,"She invited all her friends.","O bütün arkadaşlarını davet etti."],[6,"We need balloons and candles.","Balonlara ve mumlara ihtiyacımız var."],[6,"I bought a present for her.","Ona bir hediye aldım."],[6,"Thanks for inviting me.","Beni davet ettiğin için teşekkürler."],[6,"I'd love to come.","Gelmek isterim."],[6,"Sorry, I can't attend.","Üzgünüm, katılamam."],[6,"We will decorate the room.","Odayı süsleyeceğiz."],[6,"How many guests are coming?","Kaç misafir geliyor?"],[6,"Would you like to dance?","Dans etmek ister misin?"],[6,"They celebrate their anniversary.","Onlar yıl dönümlerini kutlarlar."],[7,"Future","Gelecek"],[7,"Job","İş"],[7,"Money","Para"],[7,"Car","Araba"],[7,"House","Ev"],[7,"Travel","Seyahat etmek"],[7,"Success","Başarı"],[7,"Happy","Mutlu"],[7,"Rich","Zengin"],[7,"Poor","Yoksul"],[7,"Famous","Ünlü"],[7,"Live","Yaşamak"],[7,"Meet","Tanışmak"],[7,"Marry","Evlenmek"],[7,"Child","Çocuk"],[7,"World","Dünya"],[7,"Space","Uzay"],[7,"Robot","Robot"],[7,"Flying car","Uçan araba"],[7,"Technology","Teknoloji"],[7,"Believe","İnanmak"],[7,"Hope","Umut etmek"],[7,"Expect","Beklemek"],[7,"Predict","Tahmin etmek"],[7,"Certain","kesin"],[7,"Maybe","Belki"],[7,"dream","hayal"],[7,"prediction","tahmin"],[7,"career","kariyer"],[7,"goal","hedef"],[7,"opportunity","fırsat"],[7,"future life","gelecekteki hayat"],[7,"in the future","gelecekte"],[7,"hopefully","umarım"],[7,"probably","muhtemelen"],[7,"perhaps","belki"],[7,"I will be a doctor.","Doktor olacağım."],[7,"She will travel around the world.","O dünyayı gezecek."],[7,"I hope you will be successful.","Umarım başarılı olursun."],[7,"We will live in a big house.","Büyük bir evde yaşayacağız."],[7,"Maybe I will visit London.","Belki Londra'yı ziyaret edeceğim."],[7,"Robots will help people.","Robotlar insanlara yardım edecek."],[7,"I think life will change.","Bence hayat değişecek."],[7,"He wants to become an engineer.","O mühendis olmak istiyor."],[7,"Will you live abroad?","Yurt dışında yaşayacak mısın?"],[7,"I won't give up.","Pes etmeyeceğim."],[7,"She dreams of being famous.","O ünlü olmanın hayalini kuruyor."],[7,"Perhaps cars will fly.","Belki arabalar uçacak."],[8,"Municipality","Belediye"],[8,"Police station","Karakol"],[8,"Fire station","İtfaiye"],[8,"Hospital","Hastane"],[8,"Museum","Müze"],[8,"Department store","büyük mağaza"],[8,"Pharmacy","Eczane"],[8,"Post office","Postane"],[8,"Bakery","Fırın"],[8,"Bookshop","Kitapçı"],[8,"Greengrocer","Manav"],[8,"Butcher","Kasap"],[8,"Florist","Çiçekçi"],[8,"Town hall","Belediye binası"],[8,"Courthouse","Adliye"],[8,"Library","Kütüphane"],[8,"Cinema","Sinema"],[8,"Café","Kafe"],[8,"Restaurant","Restoran"],[8,"Hotel","Otel"],[8,"Bank","Banka"],[8,"Park","Park"],[8,"Square","Meydan"],[8,"Street","Cadde"],[8,"Road","Yol"],[8,"Building","Bina"],[8,"Purpose","amaç"],[8,"Buy","Satın almak"],[8,"Send","Göndermek"],[8,"See","Görmek"],[8,"public building","kamu binası"],[8,"chemist","eczane"],[8,"station","istasyon"],[8,"town centre","şehir merkezi"],[8,"public library","halk kütüphanesi"],[8,"shopping mall","alışveriş merkezi"],[8,"office","ofis"],[8,"theatre","tiyatro"],[8,"borrow","ödünç almak"],[8,"deposit","para yatırmak"],[8,"I go to the library to study.","Ders çalışmak için kütüphaneye giderim."],[8,"She went to the bakery for bread.","O ekmek almak için fırına gitti."],[8,"Where is the nearest hospital?","En yakın hastane nerede?"],[8,"You can buy medicine there.","Orada ilaç satın alabilirsin."],[8,"We visit museums to learn history.","Tarih öğrenmek için müzeleri ziyaret ederiz."],[8,"He went to the post office.","O postaneye gitti."],[8,"The bank is next to the cinema.","Banka sinemanın yanında."],[8,"I bought flowers at the florist.","Çiçekçiden çiçek aldım."],[8,"They went to the police station.","Onlar karakola gitti."],[8,"We need to find a pharmacy.","Bir eczane bulmamız gerekiyor."],[8,"Go to the greengrocer for fruit.","Meyve almak için manava git."],[8,"The town hall is very old.","Belediye binası çok eski."],[9,"environment","çevre"],[9,"pollution","kirlilik"],[9,"air pollution","hava kirliliği"],[9,"water pollution","su kirliliği"],[9,"global warming","küresel ısınma"],[9,"climate change","iklim değişikliği"],[9,"recycle","geri dönüştürmek"],[9,"reuse","yeniden kullanmak"],[9,"reduce","azaltmak"],[9,"waste","atık"],[9,"plastic","plastik"],[9,"paper","kağıt"],[9,"glass","cam"],[9,"metal","metal"],[9,"recycling bin","geri dönüşüm kutusu"],[9,"litter","çöp"],[9,"garbage","çöp"],[9,"save energy","enerji tasarrufu yapmak"],[9,"save water","su tasarrufu yapmak"],[9,"plant a tree","ağaç dikmek"],[9,"protect nature","doğayı korumak"],[9,"forest","orman"],[9,"soil","toprak"],[9,"clean","temiz"],[9,"dirty","kirli"],[9,"harmful","zararlı"],[9,"renewable energy","yenilenebilir enerji"],[9,"solar energy","güneş enerjisi"],[9,"wind energy","rüzgar enerjisi"],[9,"deforestation","ormansızlaşma"],[9,"public transport","toplu taşıma"],[9,"We should recycle paper.","Kağıdı geri dönüştürmeliyiz."],[9,"Don't waste water.","Suyu boşa harcama."],[9,"We must protect our environment.","Çevremizi korumalıyız."],[9,"Air pollution harms our health.","Hava kirliliği sağlığımıza zarar verir."],[9,"Turn off the lights.","Işıkları kapat."],[9,"Plant more trees.","Daha çok ağaç dik."],[9,"Use public transport more often.","Toplu taşımayı daha sık kullan."],[9,"We shouldn't throw rubbish outside.","Dışarıya çöp atmamalıyız."],[9,"Solar energy is renewable.","Güneş enerjisi yenilenebilir."],[9,"Plastic can pollute oceans.","Plastik okyanusları kirletebilir."],[9,"Keep our streets clean.","Sokaklarımızı temiz tut."],[9,"Climate change affects animals.","İklim değişikliği hayvanları etkiler."],[10,"planet","gezegen"],[10,"solar system","güneş sistemi"],[10,"sun","güneş"],[10,"moon","ay"],[10,"Earth","Dünya"],[10,"Mercury","Merkür"],[10,"Venus","Venüs"],[10,"Mars","Mars"],[10,"Jupiter","Jüpiter"],[10,"Saturn","Satürn"],[10,"Uranus","Uranüs"],[10,"Neptune","Neptün"],[10,"star","yıldız"],[10,"space","uzay"],[10,"universe","evren"],[10,"galaxy","galaksi"],[10,"orbit","yörünge"],[10,"gravity","yerçekimi"],[10,"astronaut","astronot"],[10,"spaceship","uzay gemisi"],[10,"spacecraft","uzay aracı"],[10,"rocket","roket"],[10,"telescope","teleskop"],[10,"satellite","uydu"],[10,"surface","yüzey"],[10,"atmosphere","atmosfer"],[10,"temperature","sıcaklık"],[10,"distance","mesafe"],[10,"diameter","çap"],[10,"explore","keşfetmek"],[10,"discover","keşfetmek"],[10,"Jupiter is the largest planet.","Jüpiter en büyük gezegendir."],[10,"Mercury is closest to the Sun.","Merkür Güneş'e en yakın gezegendir."],[10,"Earth has one natural satellite.","Dünya'nın bir doğal uydusu vardır."],[10,"Mars is called the Red Planet.","Mars'a Kızıl Gezegen denir."],[10,"Saturn has beautiful rings.","Satürn'ün güzel halkaları vardır."],[10,"The Moon orbits the Earth.","Ay Dünya'nın etrafında döner."],[10,"Astronauts travel into space.","Astronotlar uzaya giderler."],[10,"Neptune is farther than Earth.","Neptün Dünya'dan daha uzaktır."],[10,"The Sun is a star.","Güneş bir yıldızdır."],[10,"A telescope helps us observe planets.","Teleskop gezegenleri gözlemlememize yardım eder."],[10,"There are eight planets.","Sekiz gezegen vardır."],[10,"Venus is hotter than Earth.","Venüs Dünya'dan daha sıcaktır."]];
 const grade7Rows=grade7Entries.map(([unite,ingilizce,turkce])=>({sinif:7,unite,ingilizce,turkce,unit_name:grade7Titles[unite-1]}));
 const previousBank=Object.getOwnPropertyDescriptor(window,'masterKelimeHavuzu');
 let rawBank=window.masterKelimeHavuzu,mergedBank=null,mergedSource=null;
 // The legacy loader writes fresh/cache arrays asynchronously. Keep those arrays untouched.
 // Only this teacher document sees the replacement, including later loader refreshes.
 Object.defineProperty(window,'masterKelimeHavuzu',{configurable:true,enumerable:previousBank?.enumerable??true,
  get(){if(!window.dmTeacherPortalMode||!Array.isArray(rawBank)||!rawBank.length)return rawBank;
   if(mergedSource!==rawBank){mergedSource=rawBank;mergedBank=[...rawBank.filter(w=>Number(w.sinif??w.class_no)!==7),...grade7Rows];}
   return mergedBank;
  },set(value){if(value===mergedBank)return;rawBank=value;mergedSource=null;mergedBank=null;}
 });
 // END TEACHER GRADE 7 BANK

 document.documentElement.classList.add('dm-teacher-portal');

 // Self-healing teacher visuals. This bootstrap is always requested network-first,
 // even when an older cached index.html / teacher-portal.js is still active on iOS.
 const mountTeacherVisualGuard=()=>{
  if(!document.getElementById('dmTeacherVisualGuard')){
   const style=document.createElement('style');style.id='dmTeacherVisualGuard';
   style.textContent=`
@layer glArcade {
 html.dm-teacher-portal body #tpDashboard.tp-approved .tp-approved-welcome .tp-approved-intro h2,
 html.dm-teacher-portal body #tpDashboard.tp-approved .tp-approved-welcome .tp-approved-intro h2 *{
  color:#073249!important;-webkit-text-fill-color:#073249!important;opacity:1!important;text-shadow:none!important;
 }
 html.dm-teacher-portal body #tpDashboard.tp-approved .tp-real-tools>button>span.tp-tool-fallback-icon{
  display:grid!important;place-items:center!important;background-image:none!important;
  font:normal 27px/1 "Apple Color Emoji","Segoe UI Emoji",system-ui,sans-serif!important;
  -webkit-text-fill-color:initial!important;opacity:1!important;
 }
 html.dm-teacher-portal body #tpDashboard.tp-approved [data-teacher-identity] .cog-ogretmen-kart,
 html.dm-teacher-portal body #tpDashboard.tp-approved [data-teacher-identity] .cog-ogretmen-kart small,
 html.dm-teacher-portal body #tpDashboard.tp-approved [data-teacher-identity] .cog-ogretmen-kart>small{
  color:#315361!important;-webkit-text-fill-color:#315361!important;opacity:1!important;text-shadow:none!important;
 }
 html.dm-teacher-portal body #tpDashboard.tp-approved [data-teacher-identity] #cogOgretmenKart>div>button{
  display:flex!important;align-items:center!important;justify-content:center!important;
  color:#075364!important;-webkit-text-fill-color:#075364!important;opacity:1!important;
  background:#def6ee!important;border:1px solid #89d6c7!important;border-radius:12px!important;
  white-space:normal!important;text-align:center!important;font:800 13px/1.25 Nunito,system-ui,sans-serif!important;
  padding:9px!important;min-height:44px!important;min-width:0!important;margin:0!important;
 }
 html.dm-teacher-portal body #tpDashboard.tp-approved .tp-approved-code>span,
 html.dm-teacher-portal body #tpDashboard.tp-approved .tp-account-settings summary strong{
  color:#073249!important;-webkit-text-fill-color:#073249!important;opacity:1!important;text-shadow:none!important;
 }
}
`;
   document.head.append(style);
  }
  const panel=document.getElementById('tpDashboard');
  if(!panel)return;
  const emojiForTitle=[
   [/^sınıfım$/i,'🏆'],[/^sınıflarım$/i,'🏫'],[/sınıf raporları/i,'📊'],
   [/ödev/i,'📝'],[/rubrik/i,'📈'],[/performans/i,'⚡'],[/duyuru/i,'📣'],
   [/sohbet/i,'💬'],[/rapor/i,'📊'],[/zayıf nokta/i,'🎯'],[/veli özet/i,'👨‍👩‍👧'],
   [/şifre/i,'🔑'],[/sınav/i,'📋'],[/sözlü/i,'🎤'],[/hediye üyelik/i,'🎁'],
   [/reklam ayarları/i,'📺'],[/bildirim gönder/i,'🔔'],[/candy papiş/i,'🍬'],
   [/kaptan pilot papi/i,'✈️'],[/block papi/i,'🧱'],[/papizzle/i,'💎'],
   [/öğretmenler/i,'👥'],[/öğrenci hesaplarını yönet/i,'🔐'],[/üye iletişim/i,'📇']
  ];
  for(const tile of panel.querySelectorAll('.tp-real-tools>button')){
   const icon=tile.querySelector(':scope>span');if(!icon)continue;
   // Original 3D sprite icons are preserved; only legacy/empty admin icons need help.
   if(icon.classList.contains('tp-approved-art')&&!icon.classList.contains('tp-tool-fallback-icon'))continue;
   const label=tile.querySelector(':scope>strong')?.textContent||tile.dataset.nativeTitle||tile.textContent||'';
   const emoji=emojiForTitle.find(([re])=>re.test(label.trim()))?.[1]||'🛠️';
   if(icon.textContent!==emoji)icon.textContent=emoji;
   if(!icon.classList.contains('tp-tool-fallback-icon'))icon.classList.add('tp-tool-fallback-icon');
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountTeacherVisualGuard,{once:true});else mountTeacherVisualGuard();
 if(typeof MutationObserver==='function'){
 const guardObserver=new MutationObserver(records=>{
  // Handle tools added after the teacher/admin APIs finish without repainting continuously.
  if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1 &&
   (node.id==='tpDashboard'||node.matches?.('#tpDashboard .tp-real-tools>button')||
    node.querySelector?.('#tpDashboard,.tp-real-tools>button')))))mountTeacherVisualGuard();
 });
 const startGuardObserver=()=>guardObserver.observe(document.body,{subtree:true,childList:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startGuardObserver,{once:true});else if(document.body)startGuardObserver();
 }

 const ss=window.sessionStorage;const prefix=()=>{try{return 'dm_tp_data:'+JSON.parse(ss.getItem('dm_tp_session')||'{}').participant.name+':';}catch{return 'dm_tp_data:preview:';}};
 const isolated={getItem:k=>ss.getItem(prefix()+k),setItem:(k,v)=>ss.setItem(prefix()+k,String(v)),removeItem:k=>ss.removeItem(prefix()+k),clear(){for(const k of Object.keys(ss))if(k.startsWith(prefix()))ss.removeItem(k);},key:i=>Object.keys(ss).filter(k=>k.startsWith(prefix()))[i]?.slice(prefix().length)||null,get length(){return Object.keys(ss).filter(k=>k.startsWith(prefix())).length;}};
 Object.defineProperty(window,'localStorage',{value:isolated,configurable:true});
 isolated.setItem('ing_token',state.participant.token);isolated.setItem('ing_oturumAcik','true');isolated.setItem('ing_aktifOgrenci',state.participant.name);isolated.setItem('ing_toplamSaniye','0');
 if(!ss.getItem('dm_tp_previous_teacher_saved')){ss.setItem('dm_tp_previous_teacher',ss.getItem('ing_ogr_token')||'');ss.setItem('dm_tp_previous_teacher_saved','1');}
 ss.setItem('ing_ogr_token',state.teacherToken);
 window.dmTeacherPortalPersonal=()=>{window.dmTeacherDevice.leave();location.assign('./?hesap=1');};
 // Explicit Parkur shortcut goes to the real personal learner session, not account selection.
 window.dmTeacherPortalParkur=async()=>{
  if(window.dmTeacherParkurSwitching)return;
  window.dmTeacherParkurSwitching=true;
  const switchButton=document.querySelector('[data-teacher-parkur-switch],#dmTeacherBackToParkur');
  if(switchButton)switchButton.disabled=true;
  try{
   // A teacher token is bound to exactly one approved personal learner account.
   // Do not select the last learner session stored on this shared device.
   const response=await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',{
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify({islem:'teacherPortalPersonalSession',t:state.teacherToken})
   });
   const result=await response.json();
   if(!response.ok||!result.ok||!result.token||!result.name||result.role!=='ogrenci')
    throw Error(result.mesaj||'Bu öğretmen hesabına bağlı kişisel Parkur açılamadı.');
   const realStorage=window.dmTeacherDevice.storage;
   const previous=realStorage.getItem('ing_token')||'';
   sessionStorage.setItem('dm_session_handoff_v1',JSON.stringify({
    token:result.token,name:result.name,role:'ogrenci',google:false,previous,at:Date.now()
   }));
   window.dmTeacherDevice.leave();
   location.assign('./');
  }catch(error){
   window.dmTeacherParkurSwitching=false;
   if(switchButton)switchButton.disabled=false;
   // Keep the teacher session and never silently open someone else's personal account.
   alert(error.message||'Kişisel hesabına geçilemedi. Tekrar dene.');
  }
 };
 window.dmTeacherPortalExit=()=>{
  const current=JSON.parse(ss.getItem('dm_tp_session')||'null');if(current)window.dmTeacherDevice.forget(current.teacherToken);window.dmTeacherDevice.personal();
  for(const k of Object.keys(ss))if(k.startsWith('dm_tp_data:'))ss.removeItem(k);
  const old=ss.getItem('dm_tp_previous_teacher');if(old)ss.setItem('ing_ogr_token',old);else ss.removeItem('ing_ogr_token');
  for(const k of ['dm_tp_previous_teacher_saved','dm_tp_previous_teacher','dm_tp_session','dm_tp_pending'])ss.removeItem(k);
  // Return to the fresh welcome/sign-up entry, not the previous in-app screen.
  location.replace('./?baslangic=1');
 };
 window.addEventListener('pagehide',()=>{try{const current=JSON.parse(ss.getItem('dm_tp_session')||'null');if(current)window.dmTeacherDevice.remember(current,false);}catch{}});
 const verify=async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{
  const response=await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({islem:'oturumBilgisi',t:state.teacherToken})});
  if([401,403].includes(response.status)){window.dmTeacherDevice.forget(state.teacherToken);window.dmTeacherDevice.leave();location.replace(window.dmTeacherDevice.autoResumed?(window.dmTeacherDevice.storage.getItem('ing_token')?'./?hesap=1':'./?baslangic=1'):'./?ogretmenGiris=1');}
 }catch{}finally{clearTimeout(timer);}};void verify();
 window.dmTeacherRequestRole=(url,opt)=>{
  let args={};try{args=Object.fromEntries(new URL(url,location.href).searchParams);if(typeof opt?.body==='string')args={...args,...JSON.parse(opt.body)};}catch{}
  const current=JSON.parse(ss.getItem('dm_tp_session')||'null')||state;
  return window.DMTeacherRequestPolicy.isTeacher(args.islem||'',args,{tools:window.dmTeacherToolsActive,participant:current.participant.name})?'teacher':'participant';
 };
 window.dmTeacherRequestToken=(url,opt)=>{const current=JSON.parse(ss.getItem('dm_tp_session')||'null')||state;return window.dmTeacherRequestRole(url,opt)==='teacher'?current.teacherToken:current.participant.token;};

 // If a deferred teacher script fails to load, leave usable recovery actions
 // instead of a permanently hidden learner shell and an empty screen.
 const showTeacherRecovery=()=>{
  if(window.tpHomeInitialized||document.querySelector('#tpTeacherHome.is-visible,#tpDashboard.is-visible,#tpTeacherEmergency'))return;
  const main=document.createElement('main');main.id='tpTeacherEmergency';
  main.setAttribute('role','alert');
  main.style.cssText='position:fixed;inset:0;z-index:2147483630;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:#f1fcfc;font:16px/1.5 system-ui,sans-serif;color:#163e50;';
  main.innerHTML='<div style="width:min(460px,100%);padding:24px;border:2px solid #afdcd5;border-radius:22px;background:white;text-align:center"><h1 style="font-size:23px;margin:0 0 12px">Öğretmen ekranı açılamadı</h1><p style="margin:0 0 18px">Öğretmen hesabın korunuyor. Sayfayı yeniden açabilir veya giriş ekranına dönebilirsin.</p><button type="button" data-tp-retry style="padding:12px;margin:5px;border:0;border-radius:12px;background:#087c72;color:white;font-weight:800">Yeniden dene</button><button type="button" data-tp-exit style="padding:12px;margin:5px;border:1px solid #aac9c6;border-radius:12px;background:white;color:#164d55;font-weight:800">Öğretmen girişine dön</button></div>';
  document.body.append(main);
  main.querySelector('[data-tp-retry]').onclick=()=>location.reload();
  main.querySelector('[data-tp-exit]').onclick=()=>{if(typeof window.dmTeacherPortalExit==='function')window.dmTeacherPortalExit();else{window.dmTeacherDevice.leave();location.replace('./?ogretmenGiris=1');}};
 };
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(showTeacherRecovery,4000);},{once:true});
})();
