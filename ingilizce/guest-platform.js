(function(){'use strict';
 if(new URLSearchParams(location.search).get('misafir')!=='1')return;
 window.dmGuestMode=true;
 const rawStorage=window.localStorage,nativeFetch=window.fetch.bind(window),API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
 let device=rawStorage.getItem('dm_guest_device');if(!/^[a-f0-9-]{36}$/i.test(device||'')){device=crypto.randomUUID();rawStorage.setItem('dm_guest_device',device);}rawStorage.setItem('dm_guest_started','1');
 const prefix='dm_guest_sandbox:'+device+':';
 function isolated(storage){const keys=()=>Object.keys(storage).filter(k=>k.startsWith(prefix));const view={getItem:k=>storage.getItem(prefix+k),setItem:(k,v)=>storage.setItem(prefix+k,String(v)),removeItem:k=>storage.removeItem(prefix+k),clear:()=>keys().forEach(k=>storage.removeItem(k)),key:i=>keys()[i]?.slice(prefix.length)||null,get length(){return keys().length;}};return new Proxy(view,{get:(t,k)=>k in t?t[k]:view.getItem(k),set:(_,k,v)=>{view.setItem(k,v);return true;}});}
 Object.defineProperty(window,'localStorage',{value:isolated(rawStorage)});Object.defineProperty(window,'sessionStorage',{value:isolated(window.sessionStorage)});
 // Real account tokens and progress remain outside the guest namespace.
 localStorage.setItem('ing_oturumAcik','true');localStorage.setItem('ing_aktifOgrenci','Misafir');localStorage.setItem('ing_toplamSaniye','0');localStorage.setItem('ing_token','dm-preview-local');sessionStorage.removeItem('ing_ogr_token');sessionStorage.setItem('ing_ka_soruldu','1');localStorage.setItem('karsilamaSonGosterim_misafir',JSON.stringify({zaman:Date.now(),tarih:new Date().toISOString().slice(0,10)}));
 let end=Infinity,wallEnd=Infinity,expired=false,bank=[],sentences=[],cards=[],topics=[],releaseFlags={},selectedLesson='',selectedLessonData=null,busy=new Set(),lessonKey='';
 const dataStore={},now=()=>Date.now(),json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json'}});
 const profile=()=>({ogrenci:'Misafir',sinif:Number(rawStorage.getItem('dm_guest_grade'))||3,Sinif:Number(rawStorage.getItem('dm_guest_grade'))||3,secilenSinif:Number(rawStorage.getItem('dm_guest_grade'))||3,sube:'Deneme',durum:'approved',ogretmenBagli:false,toplamsure:0,enerji:60,enerjiMax:60,altin:200,xp:0,puan:0,genelPuan:0,genelOrtalama:0,streak:0,izinler:{},dersler:[],arsivListesi:[],kitapBilgi:{},rozetListesi:[],gelisimSerisi:[],denemeSerisi:[],seviyeIlerleme:[],atananPlanlar:[],aktiviteKartlari:cards});
 const peers=()=>[profile(),{...profile(),ogrenci:'Papi Rehber',xp:120,genelPuan:850,genelOrtalama:850,altin:50}];
 function timing(d){const left=Math.max(0,Date.parse(d.expiresAt)-Date.parse(d.serverNow));end=Math.min(end,performance.now()+left);wallEnd=Math.min(wallEnd,now()+left);if(left===0)finish();}
 function alive(){if(expired)return false;if(performance.now()>=end||now()>=wallEnd){finish();return false;}return true;}
 async function guest(kind,args={}){if(!alive())throw Error('Denemen tamamlandı.');const r=await nativeFetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:kind==='begin'?'misafirBaslat':'misafirPlatform',device,kind,...args})});const d=await r.json();if(r.status===410||d.expired){finish();throw Error('Denemen tamamlandı.');}if(!r.ok||!d.ok)throw Error(d.mesaj||'Deneme yüklenemedi.');timing(d);return d;}
 let resolveBoot;const ready=new Promise(r=>resolveBoot=r);
 const yoDefault={v:1,guncelleme:0,hedef:50,xpGun:{tarih:'',xp:0},hedefOdul:'',altin:200,sahip:[],takili:{aks:'',renk:''},dondurucu:0,lig:{hafta:'',xp:0,gecen:null},log:{},zk:{},seviye:null,sohbet:{},turlar:['ana','v2:ana']};
 if(!localStorage.getItem('ing_yo_Misafir'))localStorage.setItem('ing_yo_Misafir',JSON.stringify(yoDefault));
 const blocked=new Set(['hazirMesajGonder','enerjiGonder','aksesuarHediye','duelloGonder','duelloYanit','duelloSonucKaydet','oyunEslesmeOlustur','oyunEslesmeHazir','oyunEslesmeCevap','sohbetMesajGonder','ogretmenKoduBagla','veliRaporGonder','parentReportSend','googleGiris','googleBagla','googleKayit','kayitOl','ogretmenKayitOl']);
 const emptyLists=new Set(['bildirimlerim','odevlerim','okumaGecmisGetir','buyuSeviyeIlerlemeGetir','konusmaSeviyeIlerlemeGetir','duyuruListesiGetir','duyurulariGetir','raporVeriGetir','planlarim','videolariGetir','etkinlikTanimlariGetir','tumVideolariGetir','konusmaEsAnlamlarGetir','cumleleriGetir','duellolarim','oyunEslesmelerim']);
 async function reply(op,b){
  if(!op)return peers();
  if(blocked.has(op)||/mesaj.*gonder|davet.*gonder|duello.*gonder/i.test(op)){promote('Arkadaşlarınla birlikte keşfet!','Düellolar, canlı karşılaşmalar, mesajlar ve hediyeler ücretsiz üyelikle açılır. Misafir alanında gerçek kullanıcılara işlem gönderilmez.');return {ok:false,status:'error',mesaj:'Bu özellik için ücretsiz üye ol. Diğer bölümleri gezmeye devam edebilirsin.'};}
  if(op==='kelimelerGetir')return bank;
  if(op==='cumleleriGetir'){
   const units=String(b.uniteler||'').split(',').map(Number);return {ok:true,banka:sentences.filter(s=>(!b.sinif||Number(s.class_no)===Number(b.sinif))&&(!b.uniteler||units.includes(Number(s.unit_no)))).map(s=>({en:s.english,tr:s.turkish,alt:String(s.alternatives||'').split('|').filter(Boolean),ce:String(s.distractors||'').split(',').filter(Boolean),unite:s.unit_no})),ders:[]};
  }
  if(op==='dersKonulariGetir')return topics;
  if(op==='kategorileriGetir')return [...new Set(topics.map(t=>t.kategori))];
  if(op==='dersKonuDetayGetir'){
   const key=[b.seviye,b.kategori,b.konu].join('|');
   if(selectedLesson&&selectedLesson!==key){promote('Bir konuya birlikte baktık!','Üye olunca dört seviyedeki konu anlatımlarını, örnekleri ve testleri keşfedebilirsin.');return {};}
   if(selectedLessonData)return selectedLessonData;
   const d=await guest('lesson',b);selectedLesson=key;selectedLessonData=d.data;return d.data;
  }
  if(op==='yayinOzellikleri')return {ok:true,flags:releaseFlags,admin:false};
  if(op==='sosyalOgrencilerGetir'||op==='akisTumu')return peers();
  if(op==='akisOlaylariGetir')return {ok:true,takip:[],begeni:[],tebrik:[],olaylar:[],liste:[]};
  if(op==='aktifDurum')return {ok:true,serverNow:new Date().toISOString(),liste:[{ad:'Papi Rehber',online:true,seenAt:new Date().toISOString()}]};
  if(op==='takipDavetListesi')return {ok:true,serverNow:new Date().toISOString(),liste:[{ad:'Papi Rehber',online:true,seenAt:new Date().toISOString()}]};
  if(op==='sosyalDurum')return {ok:true,blocked:false,mine:false};
  if(op==='aksesuarKatalog')return {ok:true,liste:[{id:'demo-star',icon:'⭐',name:'Yıldız Rozeti',price:50}]};
  if(op==='ekVeriGetir')return {ok:true,deger:dataStore[b.anahtar]||localStorage.getItem('ing_'+b.anahtar+'_Misafir')||''};
  if(op==='ekVeriKaydet'){dataStore[b.anahtar]=b.deger;return {ok:true,status:'success',mesaj:'Deneme ilerlemen bu tarayıcıda gösteriliyor.'};}
  if(op==='enerjiDurumuGetir'||op==='enerjiDegistir'||op==='gunlukEnerjiBonusu')return {ok:true,status:'success',enerjiKalan:60,enerjiMax:60,eklenen:Number(b.fark)||0};
  if(op==='haftalikLigGetir')return {ok:true,lig:'bronze',liste:peers(),gecmis:[],weekXP:0};
  if(op==='giris')return {ok:false,mesaj:'Misafir modundasın. Üye girişi için giriş ekranına dön.'};
  if(/Liderlik.*Getir$/.test(op))return [];
  if(emptyLists.has(op))return op==='bildirimlerim'||op==='odevlerim'||op==='duellolarim'||op==='oyunEslesmelerim'?{ok:true,liste:[]}:[];
  if(/Getir$/.test(op)||/Listesi$/.test(op))return [];
  // Only local, disposable progress. No guest mutation is forwarded to a member API.
  return {ok:true,status:'success',mesaj:'Deneme tamamlandı.',liste:[],puan:0,enerjiKalan:60,enerjiMax:60};
 }
 window.fetch=async function(input,opt){const u=new URL(typeof input==='string'?input:input.url,location.href);if(u.hostname==='nxfqlutulxqzqgwewssd.supabase.co'){
  if(!/\/functions\/v1\/(diji-api|medupro-api)$/.test(u.pathname))return json({ok:false,mesaj:'Misafir erişimi yalnızca deneme içerikleri içindir.'},403);
  await ready;if(!alive())return json({ok:false,mesaj:'Denemen tamamlandı.'},410);
  let b=Object.fromEntries(u.searchParams);try{if(opt?.body)b={...b,...JSON.parse(opt.body)};}catch(e){}
  try{return json(await reply(b.islem||'',b));}catch(e){return json({ok:false,status:'error',mesaj:e.message},400);}
 }return nativeFetch(input,opt);};
 const beacon=navigator.sendBeacon?.bind(navigator);if(beacon)navigator.sendBeacon=(u,d)=>String(u).includes('supabase.co')?false:beacon(u,d);
 const tips={
  'tab-dunya':['Parkur ve MeduPro','Adım adım kelime öğren, Papi ile konuş, kartlarla tekrar et. Üyelikte yıldızların ve seviye ilerlemen kalıcı olur.','Bir parkur seviyesi ve her MeduPro türü için bir deneme.'],
  'tab-meduakis':['Birlikte öğrenmek daha eğlenceli','Canlı arkadaşlar, haftalık lig, düellolar, tebrikler ve hediyeler burada!','Buradaki Papi Rehber bir tanıtım profili. Gerçek kişilere işlem için üyelik gerekir.'],
  'tab-sanaozel':['Sana Özel','Günlük hedefler, kişisel görevler, zor kelime tekrarı ve öğrenme ilerlemen aynı yerde.','Örnek görevleri incele; bir seviye tespit denemesi yap.'],
  'tab-aktiviteler':['Her oyunun tadına bak!','Harf Bahçesi, Kelime Treni, Hız Fırtınası ve diğer oyunlarla İngilizce öğren. Hızın da puanını etkiler.','Her oyuna bir tur hakkın var. Sınıfını ve ünitelerini seçebilirsin.'],
  'tab-derscalis':['Ders adaları seni bekliyor','Dört seviyede konu anlatımları, örnekler, kelime sözlüğü ve testlerle öğren.','Bir konu anlatımı ve o konunun testi denemeye açık.'],
  'tab-magaza':['Papi dünyanı kişiselleştir','Karakterler, aksesuarlar, jokerler ve sandıkları keşfet. Altınını öğrenerek kazan!','Mağazayı gez; bir ürünü deneme bakiyenle dene. Gerçek satın alma yapılmaz.'],
  'tab-profil':['Başarıların burada büyür','XP, rozetler, seri günleri ve dolabınla kendi öğrenme hikâyeni oluştur.','Gösterilen bakiye ve ilerleme deneme verisidir. Üyelikte kalıcı olarak birikir.']
 };
 const css=document.createElement('link');css.rel='stylesheet';css.href='guest-platform.css?v=1';document.head.append(css);
 function card(title,text,endMode=false){document.getElementById('dmGuestPrompt')?.remove();const overlay=document.createElement('div');overlay.id='dmGuestPrompt';overlay.className='dm-guest-prompt';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.innerHTML='<section><img src="mascot-reward.webp" alt="Papi"><p class="dm-guest-eyebrow">PAPİ İLE İLK KEŞFİN</p><h2></h2><p class="dm-guest-copy"></p><a class="dm-guest-join" href="./?kayit=1">Ücretsiz üye ol, birlikte devam edelim</a><a href="./" class="dm-guest-login">Zaten üyeyim, giriş yap</a></section>';overlay.querySelector('h2').textContent=title;overlay.querySelector('.dm-guest-copy').textContent=text;if(!endMode){const b=document.createElement('button');b.className='dm-guest-continue';b.textContent='Diğer bölümleri keşfet';b.onclick=()=>overlay.remove();overlay.querySelector('section').append(b);}document.body.append(overlay);overlay.querySelector('a').focus();return overlay;}
 function promote(title,text){if(!expired)card(title,text);}
 function finish(){if(expired)return;expired=true;const show=()=>{try{speechSynthesis.cancel();document.querySelectorAll('audio,video').forEach(e=>e.pause());}catch(e){}const p=card('Seninle keşfetmek çok güzeldi!','10 dakikamız bitti ama maceramız daha yeni başlıyor. Ücretsiz üye ol; bütün oyunları, parkurları, görevleri ve arkadaşlarınla düelloları keşfet!',true);Array.from(document.body.children).forEach(e=>{if(e!==p&&e.tagName!=='SCRIPT'&&e.tagName!=='LINK')e.inert=true;});};if(document.body)show();else document.addEventListener('DOMContentLoaded',show,{once:true});}

 async function claim(key){if(!alive()||busy.has(key))return false;busy.add(key);try{await ready;await guest('claim',{feature:key});localStorage.setItem('used_'+key,'1');const tip=document.getElementById('dmGuestTip');if(tip)tip.hidden=true;return true;}catch(e){if(!expired)promote('Papi bu denemeyi seninle tamamladı!',e.message);return false;}finally{busy.delete(key);}}
 function showTip(id){const t=tips[id]||tips['tab-aktiviteler'];const box=document.getElementById('dmGuestTip');if(!box)return;box.querySelector('h2').textContent=t[0];box.querySelector('p').textContent=t[1];box.querySelector('small').textContent=t[2];box.hidden=false;}
 const starts={kelimeYarismasiBaslat:'ky',jeopardyOyunuBaslat:'jp',boslukOyunuBaslat:'bosluk',hafizaOyunuBaslat:'hafiza',yagmurOyunuBaslat:'yagmur',asmacaOyunuBaslat:'asmaca',kelimebulOyunuBaslat:'kelimebul',esOyunuBaslat:'eslestirme',trenOyunuBaslat:'tren',baSeviyeBaslat:'ba',kpSeviyeBaslat:'kp',seviyeBasla:'leveltest',sohbetBasla:'sh',seviyeDisLinkAc:'kk'};
 function install(){
  document.body.classList.add('dm-guest-mode');
  const bar=document.createElement('aside');bar.id='dmGuestBar';bar.innerHTML='<b>🦜 Misafir <span id="dmGuestTime">10:00</span></b><label>Sınıf <select aria-label="Deneme sınıfın"></select></label><button id="dmGuestHelp">Papi’nin ipucu</button><a href="./?kayit=1">Üye ol</a>';document.body.append(bar);bar.querySelector('select').innerHTML=Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');bar.querySelector('select').value=String(profile().sinif);bar.querySelector('select').onchange=e=>{rawStorage.setItem('dm_guest_grade',e.target.value);if(typeof globalDataCache!=='undefined')globalDataCache[0]=profile();window.yoToast?.('Sınıfın değişti. Yeni açacağın oyunda bu sınıfı seçebilirsin.');};
  const tip=document.createElement('aside');tip.id='dmGuestTip';tip.innerHTML='<img src="mascot-help.webp" alt="Papi"><div><h2></h2><p></p><small></small></div><button aria-label="Tanıtımı kapat">×</button>';document.body.append(tip);tip.querySelector('button').onclick=()=>tip.hidden=true;document.getElementById('dmGuestHelp').onclick=()=>showTip(document.querySelector('#bottomNavMobile .bn-item.active')?.dataset.ekran);
  document.addEventListener('click',e=>{const nav=e.target.closest('#bottomNavMobile [data-ekran]');if(nav&&alive()){const id=nav.dataset.ekran;document.querySelectorAll('.dc-fullscreen-overlay.active').forEach(el=>{if(el.id!==id)el.classList.remove('active');});document.getElementById(id)?.classList.add('active');document.querySelectorAll('#bottomNavMobile [data-ekran]').forEach(b=>b.classList.toggle('active',b.dataset.ekran===id));showTip(id);}});
  for(const fn of ['kelimeYarismasiAc','jpOyunAc','boslukOyunAc','hafizaOyunAc','yagmurOyunAc','asmacaOyunAc','kelimebulOyunAc','esOyunAc','trenOyunAc','dikteAc','cumleAc','harfBahcesiAc','kpModuAc','seviyeHaritasiAc']){const open=window[fn];if(typeof open!=='function')continue;window[fn]=function(...args){tip.hidden=true;return open.apply(this,args);};}
  for(const [fn,key] of Object.entries(starts)){const original=window[fn];if(typeof original!=='function')continue;window[fn]=async function(...args){if(await claim(key))return original.apply(this,args);};}
  // Private start callbacks for dictation, sentence building and Letter Garden.
  const bypass=new WeakSet();document.addEventListener('click',e=>{const b=e.target.closest('#dmGameIntro [data-start],.hb-overlay [data-start],#bzOyna');if(!b||bypass.has(b))return;const root=b.closest('.hb-overlay'),title=root?.querySelector('h2')?.textContent||'';const key=b.id==='bzOyna'?'ba':root?.id==='dmGameIntro'?(title.includes('Kulak')?'dikte':'cumle'):'harfbahcesi';e.preventDefault();e.stopImmediatePropagation();claim(key).then(ok=>{if(ok&&b.isConnected){bypass.add(b);b.click();bypass.delete(b);}});},true);
  const shopBypass=new WeakSet();document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||shopBypass.has(b)||b.closest('#dmGuestPrompt'))return;const text=b.textContent.toLocaleLowerCase('tr');if(!/satın al|sandığı aç|sandık aç/.test(text)&&b.id!=='kaDondurucu')return;e.preventDefault();e.stopImmediatePropagation();claim('shop').then(ok=>{if(ok&&b.isConnected){shopBypass.add(b);b.click();shopBypass.delete(b);}});},true);
  let lessonOpening=false;const open=window.dcKonuAc;if(typeof open==='function')window.dcKonuAc=async function(name){const key=[typeof dcAktifSeviye!=='undefined'?dcAktifSeviye:'',typeof dcAktifKategori!=='undefined'?dcAktifKategori:'',name].join('|');if(lessonKey&&lessonKey!==key){promote('İlk dersini keşfettin!','Ücretsiz üyelikle bütün konu anlatımları, örnekler ve testler seni bekliyor.');return;}if(lessonOpening)return;lessonOpening=true;try{if(!lessonKey&&!await claim('lesson'))return;lessonKey=key;return open.apply(this,arguments);}finally{lessonOpening=false;}};
  const result=window.genelSonucEkraniGoster;if(typeof result==='function')window.genelSonucEkraniGoster=function(o){if(o?.tekrarFn)o={...o,tekrarFn:()=>promote('Bu turun tadına baktın!','Diğer oyunlara geçebilir ya da ücretsiz üyelikle tekrar oynayabilirsin.')};return result.call(this,o);};
  window.cikisYap=()=>{location.href='./';};
  document.getElementById('dmGuestEntry')?.remove();
  // Existing onboarding tours use older reward copy; the guest tour has its own current introductions.
  window.turBaslat=()=>showTip('tab-aktiviteler');
  document.querySelector('.kur-perde .kur-x')?.click();
  showTip('tab-meduakis');
  setInterval(()=>{if(!alive())return;const s=Math.ceil(Math.min(end-performance.now(),wallEnd-now())/1000);document.getElementById('dmGuestTime').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');},250);
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){alive();if(!expired)guest('begin').catch(()=>{});}});
 window.dmGuestPlatform={alive,finish,claim,promote,get words(){return bank;}};
 async function bootstrap(){try{await guest('begin');const d=await guest('bootstrap');bank=d.data.words;sentences=d.data.sentences||[];topics=d.data.topics;cards=d.data.cards||[];releaseFlags=d.data.flags||{};resolveBoot();if(document.readyState==='complete')install();else window.addEventListener('load',install,{once:true});}catch(e){if(!expired){expired=true;end=0;}resolveBoot();const show=()=>{if(!document.getElementById('dmGuestPrompt'))card('Papi seni bekliyor',e.message+' İnternetini kontrol edip giriş ekranından yeniden dene.',true);};if(document.body)show();else document.addEventListener('DOMContentLoaded',show,{once:true});}}
 bootstrap();
})();
