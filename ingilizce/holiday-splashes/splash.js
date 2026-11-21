/* Diji Medu seasonal splash selector: synchronous first paint; no loading delay. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)api.install(root);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const holidays=[
  {id:'10-kasim',month:11,day:10,before:2,after:1,priority:100,variants:2},
  {id:'15-temmuz',month:7,day:15,before:2,after:2,priority:95,variants:1},
  {id:'ramazan-bayrami',religious:'ramadanEid',before:3,after:3,priority:80,variants:1},
  {id:'kurban-bayrami',religious:'kurbanEid',before:3,after:3,priority:80,variants:1},
  {id:'29-ekim',month:10,day:29,before:3,after:3,priority:60,variants:2},
  {id:'30-agustos',month:8,day:30,before:3,after:3,priority:50,variants:2},
  {id:'19-mayis',month:5,day:19,before:3,after:3,priority:50,variants:2},
  {id:'23-nisan',month:4,day:23,before:3,after:3,priority:50,variants:2},
  {id:'ramazan-ayi',religious:'ramadan',before:0,after:0,priority:10,variants:1}
 ];
 const imageNames={'15-temmuz':'15-temmuz-1','ramazan-bayrami':'ramazan-bayrami-1','kurban-bayrami':'kurban-bayrami-2','ramazan-ayi':'ramazan-ayi-2'};
 const end2026='2026-11-02';
 // Manual-only artwork (admin panel → "Seçtiğim özel tasarım"); intentionally not in the automatic calendar.
 const manualOnly=['24-kasim','24-kasim-zirve','papi-giris'];
 function addDays(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
 // [18 Kas 2026] Hız: tarih biçimleyici bir kez kurulur (her çağrıda yeni Intl nesnesi yavaştı).
 let trDateFormat=null;
 function turkeyDate(now){if(!trDateFormat)trDateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'});return trDateFormat.format(new Date(now));}
 function periodsFor(cal,rule,year){
  if(rule.religious)return cal?.periods?.[rule.religious]||[];
  return [year-1,year,year+1].map(y=>{const date=y+'-'+String(rule.month).padStart(2,'0')+'-'+String(rule.day).padStart(2,'0');return [date,date];});
 }
 function resolve(date,calendar){
  const today=turkeyDate(date), year=+today.slice(0,4);
  // 2026 is an intentionally extended 29 Ekim campaign (22 Oct–2 Nov);
  // display the user's approved variant 2, not the superseded legacy splash.
  if(today>='2026-10-22'&&today<=end2026){
   return {id:'29-ekim',year:2026,variant:2,priority:60,file:'29-ekim-2.jpg',today};
  }
  let best=null;
  for(const rule of holidays){
   for(const [from,to] of periodsFor(calendar,rule,year)){
    if(today<addDays(from,-rule.before)||today>addDays(to,rule.after))continue;
    if(best&&best.priority>=rule.priority)continue;
    const eventYear=+from.slice(0,4);
    const number=rule.variants===2?(eventYear%2===1?1:2):1;
    const file=imageNames[rule.id]||(rule.id+'-'+number);
    best={id:rule.id,year:eventYear,variant:number,priority:rule.priority,file:file+'.jpg',today};
   }
  }
  return best;
 }
const defaultPreference={mode:'auto',disabled:[],manual:null};
 // One-time opening artwork; keep the administrator's saved selection for the next launch after expiry.
 function prefResolve(now,cal,pref){
  const today=turkeyDate(now);
  if(today>='2026-11-21'&&today<='2026-11-26'){
   return {id:'24-kasim',year:2026,variant:1,priority:200,file:'24-kasim-karanfil-2026.webp',today,temporary:true};
  }
  if(pref?.mode==='normal')return null;
  if(pref?.mode==='manual'){
   const m=pref.manual;
   const map={'23-nisan':['1','2'],'19-mayis':['1','2'],'30-agustos':['1','2'],'29-ekim':['1','2'],'10-kasim':['1','2'],'15-temmuz':['1'],'ramazan-ayi':['2'],'ramazan-bayrami':['1'],'kurban-bayrami':['2'],'24-kasim':['1'],'papi-giris':['1']};
   if(m?.id==='24-kasim-zirve'&&m.file==='24-kasim-zirve-1.svg')return {id:m.id,file:m.file,year:+turkeyDate(now).slice(0,4),variant:1,priority:200,today:turkeyDate(now)};
   if(!m||!map[m.id]?.some(v=>m.file===m.id+'-'+v+'.jpg'))return null;
   return {id:m.id,file:m.file,year:+turkeyDate(now).slice(0,4),variant:1,priority:200,today:turkeyDate(now)};
  }
  const result=resolve(now,cal);
  return result&&Array.isArray(pref?.disabled)&&pref.disabled.includes(result.id)?null:result;
 }
 function install(win){
  const doc=win.document;
  const src=doc.currentScript?.src||new URL('holiday-splash.js',doc.baseURI).href;
  const base=new URL('.',src);
  /* [18 Kas 2026] Öğretmen panelinde (?ogretmen=1) window.localStorage sınıf için ayrılmış geçici depoyla
     değiştiriliyor; açılış tercihi orada bulunamadığından önce boş/eski açılış ekranı, 1,5 sn sonra Papi girişi
     görünüyordu ("başka bir giriş ekranı" etkisi). Açılış tercihleri her zaman cihazın asıl deposundan okunur. */
  let store;try{store=(win.dmTeacherDevice&&win.dmTeacherDevice.storage)||win.localStorage;}catch(_){store={getItem:()=>null,setItem(){},removeItem(){}};}
  let calendar=win.DM_HOLIDAY_DATES||{periods:{}};
  try{
   const saved=JSON.parse(store.getItem('dm-holiday-calendar'));
   if(saved?.periods&&Number(saved?.verified?.replace(/-/g,''))>Number(calendar.verified?.replace(/-/g,'')))calendar=saved;
  }catch(_){}
  let prefs=defaultPreference;
  try{const cached=JSON.parse(store.getItem('dm-splash-preferences')||'null');if(cached&&['auto','normal','manual'].includes(cached.mode))prefs=cached;}catch(_){}
  let chosen=prefResolve(new Date(),calendar,prefs);
  /* [11 Kas 2026] Yönetici panelinde seçilen tasarım dışında hiçbir şey görünmesin:
     sunucu cevabı gelene kadar (en çok 1,5 sn) açılış ekranının içi gizli bekler; cevap yoksa kayıtlı seçim kullanılır. */
  let decided=false;
  win.dmSplashPending=true;
  doc.documentElement.classList.add('dm-splash-pending');
  // Kayıtlı seçim Papi girişiyse ilk kareden itibaren zemin derin turkuaz olsun (beyaz/eski renk görünmesin)
  if(chosen&&chosen.id==='papi-giris')doc.documentElement.classList.add('dm-papi-intro-bg');
  function decide(next){
   if(decided)return;decided=true;
   updateArtwork(next);
   if(!(next&&next.id==='papi-giris'))doc.documentElement.classList.remove('dm-papi-intro-bg');
   win.dmSplashPending=false;
   doc.documentElement.classList.remove('dm-splash-pending');
  }
  // The special contest opening is held only on initial boot, not every loading overlay.
  let zirveScreen=null,zirveReleased=false,zirveReady=false,zirveTimer=0,zirveFinish=null,zirveObserver=null;
  const zirveFile='24-kasim-zirve-hero.svg';
  function clearZirve(){
   clearInterval(zirveTimer);zirveTimer=0;zirveObserver?.disconnect();zirveObserver=null;
   zirveScreen?.remove();zirveScreen=null;
   doc.documentElement.classList.remove('dm-zirve-intro-active');
  }
  const usesOpeningControls=selection=>selection?.temporary||selection?.id==='24-kasim-zirve';
  function mountZirve(){
   if(zirveReleased||!usesOpeningControls(chosen))return;
   const karanfil=chosen.temporary===true;
   const boot=doc.getElementById('dmBootSplash');if(!boot||zirveScreen)return;
   zirveObserver?.disconnect();zirveObserver=null;
   doc.documentElement.classList.add('dm-zirve-intro-active');
   const el=doc.createElement('div');el.className=karanfil?'dm-zirve-opening dm-karanfil-opening':'dm-zirve-opening';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',karanfil?'24 Kasım Öğretmenler Günü':'24 Kasım Öğretmenler Günü ve Öğretmenimle Zirveye yarışması');
   const scene=karanfil?'<div class="dm-zirve-opening-frame"><img class="dm-zirve-opening-art" alt="Papi öğretmenine kırmızı bir karanfil uzatıyor."/><div class="dm-zirve-opening-fallback" hidden><h1>24 Kasım Öğretmenler Günü</h1></div>':'<div class="dm-zirve-opening-frame"><img class="dm-zirve-opening-art" alt="24 Kasım Öğretmenler Günü kutlu olsun! Öğretmenimle Zirveye: 20 Kasım – 10 Aralık. 5 doğrulanmış davet ve XP ile ilk 5 öğrenciye 3 ay Premium Pro, 6–20. öğrenciye 3 ay Pro; ilk 2 öğretmene 1 yıl Premium Pro."/><div class="dm-zirve-opening-fallback" hidden><h1>24 Kasım Öğretmenler Günü kutlu olsun!</h1><h2>Öğretmenimle Zirveye!</h2><p>20 Kasım – 10 Aralık</p><p>Öğrenciler: 5 doğrulanmış davet + XP.</p><p>İlk 5: 3 ay Premium Pro · 6–20: 3 ay Pro</p><p>İlk 2 öğretmen: 1 yıl Premium Pro</p></div><div class="dm-zirve-opening-info"><p class="dm-zirve-date">20 Kasım – 10 Aralık</p><div class="dm-zirve-info-grid"><section><h3>Nasıl Katılırım?</h3><ol><li>Ücretsiz hesabınla katıl.</li><li>Öğren, oyna ve XP topla.</li><li>5 doğrulanmış arkadaş davet et.</li></ol><small>Öğretmene bağlı olmak şart değil.</small></section><section><h3>Ödüller</h3><p><b>İlk 5 öğrenci</b>3 ay Premium Pro</p><p><b>6–20. öğrenci</b>3 ay Pro</p><p><b>İlk 2 öğretmen</b>1 yıl Premium Pro</p></section></div></div>';
   el.innerHTML=scene+'<div class="dm-zirve-opening-control"><div class="dm-zirve-loading" role="progressbar" aria-label="Uygulama hazırlanıyor" aria-valuemin="0" aria-valuemax="100" aria-valuenow="8"><i></i><span>Hazırlanıyor… %8</span></div><button type="button" class="dm-zirve-continue" hidden>Devam Et ›</button><button type="button" class="dm-zirve-retry" hidden>Tekrar dene</button></div></div>';
   zirveScreen=el;boot.appendChild(el);
   const art=el.querySelector('img'),loading=el.querySelector('.dm-zirve-loading'),button=el.querySelector('.dm-zirve-continue'),retry=el.querySelector('.dm-zirve-retry');
   art.onerror=()=>{art.hidden=true;el.querySelector('.dm-zirve-opening-fallback').hidden=false;};
   art.src=new URL(karanfil?chosen.file:zirveFile,base).href;
   if(karanfil){
    loading.removeAttribute('aria-valuenow');
    loading.querySelector('span').textContent='Yükleniyor…';
   }
   let progress=8;
   const paint=n=>{progress=Math.max(progress,n);loading.setAttribute('aria-valuenow',String(progress));loading.querySelector('i').style.width=progress+'%';loading.querySelector('span').textContent='Hazırlanıyor… %'+progress;};
   zirveTimer=setInterval(()=>{const real=parseInt(doc.getElementById('oturumYuklemeOverlay')?.style.getPropertyValue('--dm-papi-progress')||'0',10)||0;if(!karanfil&&!zirveReady)paint(Math.min(94,Math.max(real,progress+1)));retry.hidden=!(doc.getElementById('dmBootRetry')?.hidden===false&&!zirveReady);},250);
   retry.onclick=()=>win.location.reload();
   button.onclick=()=>{if(!zirveReady||zirveReleased)return;zirveReleased=true;const finish=zirveFinish;clearZirve();finish?.();};
   el.zirveMarkReady=()=>{
    const showContinue=()=>{if(zirveScreen!==el)return;loading.hidden=true;button.hidden=false;button.focus?.({preventScroll:true});};
    retry.hidden=true;
    if(karanfil){showContinue();return;}
    paint(100);loading.querySelector('span').textContent='Hazır · %100';setTimeout(showContinue,300);
   };
  }
  win.dmZirveIntro={holdBoot(finish){
   if(zirveReleased||!usesOpeningControls(chosen))return false;
   mountZirve();if(!zirveScreen)return false;
   zirveFinish=finish;if(!zirveReady){zirveReady=true;zirveScreen.zirveMarkReady();}return true;
  }};
  function updateArtwork(next){
   if(usesOpeningControls(next)&&!zirveReleased){
    win.dmPapiSplash?.disable();chosen=next;
    doc.documentElement.classList.add('dm-zirve-intro-active');
    doc.documentElement.classList.remove('dm-holiday-active');doc.documentElement.style.removeProperty('--dm-holiday-art');
    mountZirve();if(!zirveScreen&&doc.readyState==='loading'&&win.MutationObserver){zirveObserver=new win.MutationObserver(mountZirve);zirveObserver.observe(doc.documentElement,{childList:true,subtree:true});}
    return;
   }
   if(zirveScreen||zirveObserver){const finish=zirveReady?zirveFinish:null;clearZirve();zirveReleased=true;finish?.();}
   // [11 Kas 2026] "Papi 3D Giriş": görsel yerine canlı, sesli animasyon (papi-intro.js).
   if(next&&next.id==='papi-giris'&&win.dmPapiSplash){
    doc.documentElement.classList.remove('dm-holiday-active');
    doc.documentElement.style.removeProperty('--dm-holiday-art');
    win.dmPapiSplash.enable();chosen=next;return;
   }
   win.dmPapiSplash?.disable();
   const root=doc.documentElement,active=!!next;
   root.classList.toggle('dm-holiday-active',active);
   if(active){
    const image=new URL(next.file,base).href;
    root.style.setProperty('--dm-holiday-art','url("'+image+'")');
    root.dataset.dmHoliday=next.id;
    root.dataset.dmHolidayVariant=String(next.variant);
    const preload=doc.createElement('link');preload.rel='preload';preload.as='image';preload.href=image;doc.head.appendChild(preload);
   }else{
    root.style.removeProperty('--dm-holiday-art');
    delete root.dataset.dmHoliday;delete root.dataset.dmHolidayVariant;
   }
   chosen=next;
  }
  // Kayıtlı seçim Papi girişiyse beklemeden başla (animasyon ilk kareden oynasın); değilse sunucu cevabını bekle.
  if(chosen?.temporary||chosen?.id==='papi-giris')decide(chosen);
  setTimeout(()=>decide(chosen),1500);
  // Server-managed global selection: read asynchronously after immediate cached first paint.
  function refreshPreferences(){
   if(typeof win.fetch!=='function'){decide(chosen);return;}
   /* [12 Kas 2026] Supabase yükü: seçim cihazda varsa sunucu 10 dakikada bir sorulur (her açılışta değil). */
   try{const last=Number(store.getItem('dm-splash-checked-v2')||0);if(prefs&&Date.now()-last<600000){decide(chosen);return;}}catch(_){}
   win.fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/splash-settings',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw Error('settings unavailable');return r.json();})
    .then(data=>{
     if(!data.ok||!data.config){decide(chosen);return;}
     prefs=data.config;
     try{store.setItem('dm-splash-preferences',JSON.stringify(prefs));store.setItem('dm-splash-checked-v2',String(Date.now()));}catch(_){}
     const next=prefResolve(new Date(),calendar,prefs);
     if(!decided){decide(next);return;}
     if(next?.file!==chosen?.file)updateArtwork(next);
    }).catch(()=>decide(chosen));
  }
  // Seçim hemen istenir (sayfanın tamamı yüklenmeyi beklemeden), böylece ilk görünen tasarım doğru olur.
  refreshPreferences();
  const current=win.DM_HOLIDAY_DATES?.verified||'';
  function syncRemote(){
   try{
    const key='dm-holiday-last-check',last=Number(store.getItem(key)||0);
    if(Date.now()-last<24*60*60*1000)return;
    store.setItem(key,String(Date.now()));
    // Refreshed by a scheduled GitHub Action, independent of GitHub Pages caches.
    const url='https://raw.githubusercontent.com/newteacherboy/english-tracker/main/ingilizce/holiday-splashes/dates.json';
    win.fetch(url,{cache:'no-store',signal:win.AbortSignal?.timeout?.(8000)}).then(r=>{if(!r.ok)throw Error('calendar offline');return r.json();}).then(data=>{
     if(data?.periods&&/^\d{4}-\d{2}-\d{2}$/.test(data.verified)&&data.verified>=current){
      store.setItem('dm-holiday-calendar',JSON.stringify(data));
     }
    }).catch(()=>{store.removeItem(key);});
   }catch(_){}
  }

  if(typeof win.requestIdleCallback==='function')win.requestIdleCallback(syncRemote);else win.addEventListener('load',syncRemote,{once:true});
  // In long-running single-page sessions, re-evaluate at local midnight.
  if(typeof win.setInterval==='function')win.setInterval(()=>{
   const next=prefResolve(new Date(),calendar,prefs);
   // Switch this artwork on the next opening without interrupting an active session.
   if(chosen?.temporary||next?.temporary)return;
   if((next?.file||'')!==(chosen?.file||''))win.location.reload();
  },60*60*1000);
 }
 return {resolve,prefResolve,turkeyDate,addDays,holidays,manualOnly,install};
});
