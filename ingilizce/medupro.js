(function(){
 'use strict';
 // Dismissible offline notice: does not block navigation or imply successful saving.
 (function(){
   if(window.__meduOfflineNoticeReady)return;
   window.__meduOfflineNoticeReady=true;
   let notice=null, dismissed=false;
   function close(){if(notice){notice.remove();notice=null;}dismissed=true;}
   function show(){
     if(navigator.onLine||dismissed||notice)return;
     notice=document.createElement('aside');
     notice.id='medu-offline-notice';
     notice.setAttribute('role','status');
     notice.setAttribute('aria-live','polite');
     notice.style.cssText='position:fixed;z-index:2147483000;left:12px;right:12px;top:calc(72px + env(safe-area-inset-top,0px));bottom:auto;max-width:360px;margin:auto;padding:10px 42px 10px 68px;min-height:66px;background:#25204b;color:#fff;border:2px solid #bba9ff;border-radius:20px;box-shadow:0 12px 32px #0005;font:500 12px/1.35 system-ui,sans-serif;';
     notice.innerHTML='<img src="papi-help-v2.png" alt="Medu maskotu" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 3px 4px #0003)"><strong style="display:block;font-size:13px">Medu: Çevrimdışı mod</strong><span>Uygulamayı gezebilirsin. Çevrimiçi işlemler için internet gerekli.</span><button type="button" aria-label="Çevrimdışı uyarısını kapat" style="position:absolute;right:9px;top:9px;border:0;border-radius:50%;background:#fff;color:#25204b;width:32px;height:32px;font-size:22px;cursor:pointer">×</button>';
     notice.querySelector('button').addEventListener('click',close);
     document.body.appendChild(notice);
   }
   window.addEventListener('offline',()=>{dismissed=false;show();});
   window.addEventListener('online',()=>{notice?.remove();notice=null;dismissed=false;});
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
 })();

 const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const name=()=>typeof aktifOgrenciAdi!=='undefined'?aktifOgrenciAdi:'',logged=()=>name()&&name().toLowerCase()!=='teacher'&&!!localStorage.getItem('ing_token');
 const games={Kelime_Liderlik:['🔬 Kelime Laboratuvarı','kelimeYarismasiAc','ky'],Jeopardy_Liderlik:['🎈 Risk Balonları','jpOyunAc','jp'],Bosluk_Tablosu:['✏️ Eksik Harf','boslukOyunAc','bosluk'],Hafiza_Liderlik:['🧠 Hafıza Sandığı','hafizaOyunAc','hafiza'],Yagmur_Liderlik:['🌪️ Hız Fırtınası','yagmurOyunAc','yagmur'],Asmaca_Liderlik:['🔤 Harf Avı','asmacaOyunAc','asmaca'],KelimeBul_Liderlik:['🔐 Şifre Kırıcı','kelimebulOyunAc','kelimebul'],Konusma_Liderlik:['🎤 Kelime Modu','kpModuAc','kp'],Eslesme_Liderlik:['🔗 Eş Bul','esOyunAc','eslestirme'],Tren_Liderlik:['🚂 Kelime Treni','trenOyunAc','tren'],Dikte_Liderlik:['🎧 Kulak Dedektifi','dikteAc','dikte'],Cumle_Liderlik:['🧱 Cümle Ustası','cumleAc','cumle'],HarfBahcesi_Liderlik:['🌿 Harf Bahçesi','harfBahcesiAc','harfbahcesi'],ucus:['🪽 Kelime Uçuşu',null,'ucus'],rota:['🧩 Cümle Rotası',null,'rota']};
 const toast=m=>{if(typeof yoToast==='function')yoToast(m);else alert(m);};
 const special=new Set(['sosyalDurum','ogrenciEngelle','ogrenciEngelKaldir','oyunEslesmeOlustur','oyunEslesmeDurum','oyunEslesmeHazir','oyunEslesmeCevap','oyunEslesmelerim','duelloSonucKaydet','duelloGonder','duelloYanit','duellolarim','bildirimlerim','aktifDurum','takipDavetListesi']);
 const endpoint=()=>apiURL.replace(/diji-api(?:\?.*)?$/,'medupro-api');
 async function api(islem,data={}){const url=special.has(islem)?endpoint():apiURL,classroomOwner=window.dmTeacherPortalMode?null:window.dmClassroomOnlineOwner;const t=window.dmTeacherPortalMode?window.dmTeacherRequestToken?.(url,{body:JSON.stringify({islem})})||localStorage.getItem('ing_token')||'':classroomOwner?(sessionStorage.getItem('ing_ogr_token')||''):(localStorage.getItem('ing_token')||'');const r=await fetch(url,{method:'POST',body:JSON.stringify({islem,ogrenci:classroomOwner||name(),...data,...(classroomOwner?{classroomStudent:classroomOwner}:{}),t})});const d=await r.json();if(!r.ok||d.ok===false||d.status==='error')throw Error(d.mesaj||d.message||'İşlem tamamlanamadı. Tekrar dene.');return d;}
 function sheet(title,desc){const p=document.createElement('div');p.className='dm-perde';p.innerHTML=`<section class="dm-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button class="dm-x" aria-label="Kapat">×</button><header><img class="dm-mascot" src="papi-help-v2.png" alt="Diji-Medu papağanı"><h2>${esc(title)}</h2><p>${esc(desc)}</p></header><div class="dm-sheet-body"></div></section>`;document.body.append(p);const prev=document.activeElement;function close(){p.remove();prev?.focus?.();p._close?.();}p.querySelector('.dm-x').onclick=close;p.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const f=[...p.querySelectorAll('button,select,a,input')].filter(x=>!x.disabled&&x.getClientRects().length);if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0]?.focus();}}});p.querySelector('.dm-x').focus();return {p,body:p.querySelector('.dm-sheet-body'),close};}
 function error(box,e){let a=box.querySelector('.dm-error');if(!a){a=document.createElement('p');a.className='dm-error';a.setAttribute('role','alert');box.append(a);}a.textContent=e.message;}

 window.dmMeduProAc=function(){
  const show=()=>{const parkur=document.getElementById('bzParkur');if(!parkur)return false;parkur.dataset.dmParkurView='pro';let host=parkur.querySelector('.bz-ic');if(!host){host=document.createElement('div');host.className='bz-ic';parkur.append(host);}let panel=host.querySelector('.dm-pro-panel');if(!panel){panel=document.createElement('section');panel.className='dm-pro-panel';panel.setAttribute('role','tabpanel');panel.innerHTML=`<div class="dm-pro-scene"><img src="papi-welcome-v2.png" alt="Papi"><h2>MeduPro</h2><p>Papi ile keşfet, konuş ve öğren!</p></div><div class="dm-pro-cards"><button type="button" class="dm-pro-mode" data-mode="kp"><i aria-hidden="true">🧪</i><span><b>Kelime Modu</b><small>Eğlenceli oyunlarla kelime öğren!</small><em aria-hidden="true">›</em></span></button><button type="button" class="dm-pro-mode" data-mode="sh"><i aria-hidden="true"><img src="papi-help-v2.png" alt=""></i><span><b>Papağanla Sohbet</b><small>Papi ile konuş, İngilizceni geliştir!</small><em aria-hidden="true">›</em></span></button><button type="button" class="dm-pro-mode" data-mode="kk"><i aria-hidden="true">🃏</i><span><b>Kelime Kartları</b><small>Kartlarla kolayca hatırla!</small><em aria-hidden="true">›</em></span></button></div>`;host.append(panel);panel.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{const mode=b.dataset.mode;const target=$('pkSekmeler')?.querySelector('[data-p="'+mode+'"]');if(!target && mode!=='kp'){const notice=sheet('Bu bölüm şu anda açılamıyor','MeduPro ana ekranından başka bir etkinlik seçebilirsin.');notice.body.innerHTML='<p>İçerik bağlantısı bulunamadı. Öğrenme ilerlemen etkilenmedi.</p>';return;}if(mode==='kp'){
    // Open the actual Word Mode screen, bypassing the hidden legacy parkour tab.
    panel.hidden=true;
    const sc=host.querySelector('.dm-parkur-scroll');if(sc)sc.hidden=false;
    try {
      const open=typeof kpModuAc==='function'?kpModuAc:window.kpModuAc;
      if(typeof open!=='function')throw Error('Kelime Modu açılış fonksiyonu bulunamadı');
      Promise.resolve(open()).catch(err=>{console.error('MeduPro Kelime Modu:',err);panel.hidden=false;});
    }catch(err){console.error('MeduPro Kelime Modu:',err);panel.hidden=false;}
    return;
   }
   target.click();if(mode==='kk'){let attempts=0;const timer=setInterval(()=>{if(!panel.isConnected){clearInterval(timer);return;}const overlays=[...document.querySelectorAll('[role="dialog"],.swal2-container,.modal,.popup')].filter(x=>x!==panel&&x.getClientRects().length);const empty=overlays.find(x=>/Henüz kelime kartı bulunmuyor|Öğretmenin yakında ekleyecek/i.test(x.textContent||''));if(empty){clearInterval(timer);empty.addEventListener('click',ev=>{if(ev.target.closest('button'))setTimeout(()=>{if(panel.isConnected){panel.hidden=false;const sc=host.querySelector('.dm-parkur-scroll');if(sc)sc.hidden=true;}},80);},{once:true});}if(++attempts>=30)clearInterval(timer);},100);}});}
   const sc=host.querySelector('.dm-parkur-scroll');if(sc)sc.hidden=true;panel.hidden=false;host.querySelectorAll('[data-dm-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.dmTab==='pro')));
  ;return true;};if(document.body.classList.contains('dm-parkur-open'))show();else{Promise.resolve(window.dunyaAc?.()).catch(e=>console.warn('MeduPro parkur:',e)).finally(()=>{show();setTimeout(show,400);});}
 };


 // Apply the approved Papi Word Mode design to the real legacy entry, without altering game state.
 (function(){
   function decorateWordMode(){
     const entry=document.getElementById('kpKelimeGirisEkrani');
     const card=document.getElementById('kp-panel-kelime');
     if(!entry||!card||entry.closest('.dm-word-home'))return;
     const home=document.createElement('section');
     home.className='dm-word-home';
     home.setAttribute('aria-label','Papi Kelime Modu');
     const intro=document.createElement('div');
     intro.className='dm-word-intro';
     intro.innerHTML='<div class="dm-word-intro-top"><span>🦜 MEDUPRO İLE ÖĞREN</span><h2>Kelime Macerası</h2></div><div class="dm-word-hero"><img src="papi-help-v2.png" alt="Papi papağan"><p>Hazır mısın? Kelimeleri keşfet, dinle ve her adımda güçlen!</p></div><div class="dm-word-rules"><span>🎧<b>Dinle</b><small>Keşfet</small></span><span>🎙️<b>Söyle</b><small>Pratik yap</small></span><span>⭐<b>Öğren</b><small>Pekiştir</small></span><span>🏆<b>İlerle</b><small>Seviye atla</small></span></div>';
     const body=document.createElement('div');
     body.className='dm-word-home-body';
     entry.parentNode.insertBefore(home,entry);
     home.append(intro,body);
     body.append(entry);
     // Original inputs and buttons remain in their original order and retain listeners.
     const nameInput=entry.querySelector('input.kp-input');
     if(nameInput&&!nameInput.closest('.dm-word-name-wrap')){
       const wrap=document.createElement('div');
       wrap.className='dm-word-name-wrap';
       wrap.innerHTML='<span aria-hidden="true">✏️</span>';
       nameInput.parentNode.insertBefore(wrap,nameInput);
       wrap.append(nameInput);
     }
     const route=document.getElementById('kpParkurKapsayici');
     if(route&&home.contains(route)&&!route.previousElementSibling?.classList.contains('dm-word-route-title')){
       const heading=document.createElement('h3');
       heading.className='dm-word-route-title';
       heading.textContent='🌈 Kelime Yolculuğum';
       route.parentNode.insertBefore(heading,route);
     }
   }
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorateWordMode,{once:true});
   else decorateWordMode();
   // Legacy mode is rendered lazily on some accounts.
   let retries=0;
   const clock=setInterval(()=>{decorateWordMode();if(++retries>=25||document.querySelector('#kpKelimeGirisEkrani.dm-word-home'))clearInterval(clock);},400);
   document.addEventListener('click',e=>{if(e.target.closest('[data-mode="kp"],[data-p="kp"]'))setTimeout(decorateWordMode,0);},true);
 })();

 // Compact Word Mode HUD: values come from the existing game state; no duplicate economy.
 (function(){
   function mount(){
     const intro=document.querySelector('#tab-konusmapratigi .dm-word-home .dm-word-intro');
     if(!intro||intro.querySelector('.dm-kp-hud'))return;
     const hud=document.createElement('div');hud.className='dm-kp-hud';
     hud.innerHTML='<button type="button" class="dm-kp-back" title="Ana parkura dön" aria-label="Ana parkura dön">🏰</button><span class="dm-kp-combo">🔥 x0</span><span class="dm-kp-energy">⚡ --/--</span><span class="dm-kp-gold">🪙 --</span>';
     intro.append(hud);
     hud.querySelector('button').onclick=()=>{const close=window.kpModuKapat;if(typeof close==='function')close();if(typeof window.dunyaAc==='function')window.dunyaAc();};
   }
   function refresh(){
     const hud=document.querySelector('#kpKelimeGirisEkrani .dm-kp-hud');if(!hud)return;
     const combo=document.getElementById('kpKomboText')?.textContent||'';
     const match=combo.match(/x\s*(\d+)/i);
     hud.querySelector('.dm-kp-combo').textContent='🔥 x'+(match?match[1]:'0');
     const energy=document.getElementById('kpEnerjiSatiri')?.textContent||'';
     const e=energy.match(/(\d+)\s*\/\s*(\d+)/);
     if(e)hud.querySelector('.dm-kp-energy').textContent='⚡ '+e[1]+'/'+e[2];
     const gold=typeof yo!=='undefined'&&yo?yo.altin:window.yo?.altin;
     if(gold!=null&&Number.isFinite(Number(gold)))hud.querySelector('.dm-kp-gold').textContent='🪙 '+Math.floor(Number(gold)).toLocaleString('tr-TR');
   }
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
   setInterval(()=>{mount();refresh();},800);
 })();

 // Recover the existing Word Mode entry if legacy asynchronous UI resets leave it blank.
 (function(){
   let misses=0;
   function check(){
     const page=document.getElementById('tab-konusmapratigi');
     if(!page||!page.classList.contains('active')){misses=0;return;}
     const game=document.getElementById('kpKelimeOyunEkrani');
     const end=document.getElementById('kpKelimeBitisEkrani');
     if((game&&getComputedStyle(game).display!=='none')||(end&&getComputedStyle(end).display!=='none')){misses=0;return;}
     const shell=page.querySelector('.kp-shell');
     const card=document.getElementById('kp-panel-kelime');
     const entry=document.getElementById('kpKelimeGirisEkrani');
     if(!shell||!card||!entry)return;
     const visible=entry.getClientRects().length>0&&entry.getBoundingClientRect().height>36&&getComputedStyle(entry).visibility!=='hidden';
     if(visible){misses=0;return;}
     if(++misses<2)return;
     misses=0;
     card.classList.add('active');
     card.style.setProperty('display','block','important');
     card.style.setProperty('visibility','visible','important');
     card.style.setProperty('opacity','1','important');
     entry.style.setProperty('display','block','important');
     entry.style.setProperty('visibility','visible','important');
     entry.style.setProperty('opacity','1','important');
     shell.style.setProperty('overflow','visible','important');
     const map=document.getElementById('kpParkurAlani');
     if(map&&!map.textContent.trim())map.textContent='Kelime seviyelerin yükleniyor…';
     console.warn('[DijiMedu] Restored hidden MeduPro entry panel');
   }
   setInterval(check,900);
 })();
 document.addEventListener('click',e=>{if(e.target.closest('[data-dm-tab="ba"],[data-p="ba"]')){const parkur=document.getElementById('bzParkur');if(parkur)parkur.dataset.dmParkurView='ba';const host=document.querySelector('#bzParkur .bz-ic');host?.querySelector('.dm-pro-panel')?.remove();const sc=host?.querySelector('.dm-parkur-scroll');if(sc)sc.hidden=false;}});
 // Keep the current screen open when there are no assigned word cards.
 const cardsButton=$('pkSekmeler')?.querySelector('[data-p="kk"]');
 if(cardsButton)cardsButton.addEventListener('click',function(e){
  const student=typeof globalDataCache!=='undefined'&&Array.isArray(globalDataCache)
   ?globalDataCache.find(u=>String(u.ogrenci).trim().toLowerCase()===(typeof oyunIcinAktifIsim==='function'?oyunIcinAktifIsim():name()).toLowerCase()):null;
  if(student&&Array.isArray(student.aktiviteKartlari)&&student.aktiviteKartlari.length)return;
  e.preventDefault();e.stopImmediatePropagation();
  const notice=sheet('Kelime kartların henüz hazır değil','Öğretmenin kart eklediğinde burada görebileceksin.');
  notice.p.classList.add('dm-empty-notice');
  notice.body.innerHTML='<p>Şimdilik MeduPro’daki diğer etkinliklerle devam edebilirsin.</p><button class="dm-primary" type="button">Kapat</button>';
  notice.body.querySelector('button').onclick=notice.close;
 },true);
 function dmInstallProTab(){const bar=$('pkSekmeler');if(!bar)return false;const base=bar.querySelector('[data-p="ba"]');if(base)base.innerHTML='<i>🧙</i>Parkur';let b=bar.querySelector('[data-p="pro"]');if(!b){b=document.createElement('button');b.type='button';b.dataset.p='pro';b.setAttribute('role','tab');b.innerHTML='<i>✨</i>MeduPro';bar.append(b);}b.onclick=window.dmMeduProAc;return true;}if(!dmInstallProTab()){document.addEventListener('DOMContentLoaded',dmInstallProTab,{once:true});}setTimeout(dmInstallProTab,800);
 const states=new Map();let account='';
 async function status(target){const d=await api('sosyalDurum',{alici:target});states.set(target,d);document.querySelectorAll('.dm-social').forEach(k=>{if(k.dataset.person!==target)return;k.querySelectorAll('button,select').forEach(b=>b.disabled=!!d.blocked);const note=k.querySelector('.dm-blocked-note');note.hidden=!d.blocked;});document.querySelectorAll('.dm-block').forEach(b=>{if(b.dataset.person!==target)return;b.disabled=d.blocked&&!d.mine;b.textContent=d.mine?'Engeli kaldır':d.blocked?'İletişim kapalı':'Engelle';b.dataset.mine=String(!!d.mine);});document.querySelectorAll('.takip-btn').forEach(b=>{if(b.getAttribute('onclick')?.includes(target))b.disabled=!!d.blocked;});return d;}
 const originalFetch=window.fetch;
 window.fetch=function(url,opt){let u=typeof url==='string'?url:'';if(u.startsWith(apiURL)&&!opt?.body){const op=(u.match(/[?&]islem=(\w+)/)||[])[1];if(['duelloGonder','duelloYanit','duellolarim'].includes(op)){const params=new URL(u,location.href).searchParams;params.set('t',localStorage.getItem('ing_token')||'');params.set('_',String(Date.now()));return originalFetch.call(this,endpoint()+'?'+params.toString(),opt);}}return originalFetch.apply(this,arguments);};
 document.addEventListener('change',e=>{if(!e.target.matches('.dm-game'))return;const k=e.target.closest('.dm-social'),mode=k.querySelector('.dm-mode');mode.value='async';mode.querySelector('[value="live"]').disabled=!['ucus','rota'].includes(e.target.value);if(k.hasAttribute('data-duel-picker')){const paired=['ucus','rota'].includes(e.target.value),head=k.closest('.dm-sheet').querySelector('header');head.querySelector('h2').textContent=paired?'İki Kişilik Oyna':'Düelloya Davet Et';head.querySelector('p').textContent=paired?k.dataset.person+' ile aynı anda veya 24 saat içinde sırayla oynayın.':k.dataset.person+' ile aynı oyunu ayrı ayrı oynayın. Aynı anda oynamanız gerekmez. İkiniz de oynayınca sonuçlar karşılaştırılır.';k.querySelector('.dm-send-duel').textContent=paired?'Oyun Daveti Gönder':'Düelloya Davet Et';}});
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-social]');if(!b)return;const k=b.closest('.dm-social'),target=b.dataset.person||k?.dataset.person,act=b.dataset.social;if(act==='message'||act==='gift')return;if(act==='duel')return void window.dmLiveDuel?.invite?.(target);b.disabled=true;try{
  if(act==='block'){const removing=b.dataset.mine==='true';await api(removing?'ogrenciEngelKaldir':'ogrenciEngelle',{alici:target});if(typeof maTakip!=='undefined')maTakip.delete(target);await status(target);toast(removing?'Engel kaldırıldı.':'Engelleme etkin.');window.maCiz?.();}
  else{const game=k.querySelector('.dm-game').value;if(!window.dmProgression?.require?.(['ucus','rota'].includes(game)?'iki_kisilik':'duello')){b.disabled=false;return;}if(['ucus','rota'].includes(game)){const d=await api('oyunEslesmeOlustur',{alici:target,oyun:game,mod:k.querySelector('.dm-mode').value});toast('Oyun daveti gönderildi!');window.dmMatchAc(d.id);}else{const d=await api('duelloGonder',{gonderen:name(),alici:target,oyun:game});if(d.ok!==true)throw Error('Düello daveti doğrulanamadı. Tekrar dene.');toast('Düello daveti gönderildi ⚔️');}b.textContent='Gönderildi ✓';}
 }catch(e){toast(e.message);}finally{if(act!=='block')b.disabled=false;}});
 window.maTakipDegistir=async function(id,b){if(b)b.disabled=true;try{const st=await status(id);if(st.blocked)throw Error('Bu kişiyle iletişim kapalı.');const d=await api('akisOlayToggle',{hedef:id,tur:'takip'});if(typeof maTakip!=='undefined'){if(d.aktif)maTakip.add(id);else maTakip.delete(id);}if(b){b.classList.toggle('takipte',d.aktif);b.textContent=d.aktif?'✓ Takip ediliyor':'🎈 Takip et';}if(d.aktif)await api('bildirimGonder',{gonderen:name(),alici:id,tur:'takip',metin:'seni takip etmeye başladı'});toast(d.aktif?'Takip ediyorsun 🎈':'Takipten çıktın.');}catch(e){toast(e.message);}finally{if(b)b.disabled=false;}};
 function matchLabel(g){return games[g]?.[0]||g;}
 let activeMatch=null;
 window.dmMatchAc=async function(id){if(activeMatch)activeMatch.close();const s=sheet('İki Kişilik Oyna','Aynı anda veya 24 saat içinde sırayla oynayın.');s.p.classList.add('dm-garden-match');activeMatch=s;let timer,inflight=false,stopped=false,lastKey='',rewardSeen=false;
  s.p._close=()=>{stopped=true;clearTimeout(timer);activeMatch=null;};
  async function poll(action='oyunEslesmeDurum',args={}){if(stopped)return;if(inflight){if(action!=='oyunEslesmeDurum')setTimeout(()=>poll(action,args),80);return;}inflight=true;try{const prior=Number(s.p.dataset.dmScore)||0;const d=await api(action,{id,...args});const score=Number(d.myScore??d.myResult?.puan)||0;if(action==='oyunEslesmeCevap'&&score>prior)window.dmCorrectAnswer?.();s.p.dataset.dmScore=String(score);render(d);}catch(e){lastKey='';error(s.body,e);}finally{inflight=false;if(!stopped){clearTimeout(timer);timer=setTimeout(()=>{if(!document.hidden)poll();else timer=setTimeout(()=>poll(),2500);},1200);}}}
  function render(d){s.p.querySelector('h2').textContent=d.game?matchLabel(d.game):'Karşılaşma';if(['cancelled','expired'].includes(d.status)){s.body.innerHTML=`<p>${d.status==='cancelled'?'Bu karşılaşma iptal edildi.':'24 saatlik süre doldu.'}</p>`;stopped=true;return;}
   if(d.myResult){const a=d.myResult,b=d.opponentResult,key=JSON.stringify([a,b]);if(key===lastKey)return;lastKey=key;let winner='Rakibinin tamamlaması bekleniyor.';if(b)winner=a.puan>b.puan||(a.puan===b.puan&&a.sure<b.sure)?'🏆 Kazandın!':a.puan===b.puan&&a.sure===b.sure?'🤝 Berabere!':'🌟 Güzel mücadele! Rövanşa hazır mısın?';s.body.innerHTML=`<div class="dm-match-wait"><img src="papi-reward-v2.png" alt="Kutlayan papağan"><h3>${winner}</h3></div><div class="dm-results"><div class="dm-result"><b>Sen</b><strong>${a.puan}</strong><small>${a.dogru}/${d.total||12} doğru · ${a.sure} sn</small><small>${'⭐'.repeat(a.yildiz)}<br>+${a.reward.gold} 🪙 · +${a.reward.xp} XP</small></div><div class="dm-result rival"><b>${esc(d.opponent)}</b><strong>${b?b.puan:'…'}</strong><small>${b?`${b.dogru}/${d.total||12} doğru · ${b.sure} sn`:'Henüz tamamlamadı'}</small></div></div><p>İkinizin sonucu Karşılaşmalarım’da saklanır.</p>`;if(!rewardSeen){rewardSeen=true;syncYo();}if(b){stopped=true;return;}return;}
   if(!d.start){const key='wait'+d.ready+d.opponentReady;if(key===lastKey)return;lastKey=key;s.body.innerHTML=`<div class="dm-match-wait"><img src="papi-welcome-v2.png" alt="Bekleyen papağan"><h3>${esc(d.opponent)} ile ${d.mode==='live'?'aynı anda':'24 saat içinde'}</h3><p>12 soru · 4 enerji · Her soruya 12 saniye<br>Doğru +100 · Seri bonusları · Hız bonusu<br>Yanlış −40 puan · turdan −3 XP. Daha hızlı cevap daha çok puan getirir.</p><button class="dm-primary" ${d.ready?'disabled':''}>${d.ready?'Hazırsın · Rakibini bekliyoruz':'Hazırım, başlayalım!'}</button></div>`;s.body.querySelector('button').onclick=()=>poll('oyunEslesmeHazir');return;}
   if(d.index<0){s.body.innerHTML='<div class="dm-match-wait"><h3>Hazır ol! 🦜</h3><p>Birkaç saniye içinde başlıyoruz…</p></div>';lastKey='countdown';return;}
   if(!d.question)return;
   const key=d.index+':'+d.answered; if(key!==lastKey){lastKey=key;const q=d.question;s.body.innerHTML=`<div class="dm-live-meta"><span>${d.index+1}/${d.total||12} soru</span><span class="dm-seconds"></span><span class="dm-score"></span></div><div class="dm-word">${esc(q.word)}</div><div class="dm-flight ${d.game==='rota'?'rota':''}">${q.choices.map((t,i)=>`<button style="--i:${i}" data-choice="${i}" ${d.answered?'disabled':''}>${esc(t)}</button>`).join('')}</div><div class="dm-feedback" role="status">${d.answered?'Doğru anlam: '+esc(d.feedback):'Doğru anlamı seç!'}</div>`;s.body.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{s.body.querySelectorAll('[data-choice]').forEach(x=>x.disabled=true);const answer=()=>{if(stopped)return;if(inflight){setTimeout(answer,40);return;}poll('oyunEslesmeCevap',{index:d.index,choice:Number(b.dataset.choice)});};answer();});}
   const t=s.body.querySelector('.dm-seconds'),p=s.body.querySelector('.dm-score');if(t)t.textContent='⏱ '+d.seconds+' sn';if(p)p.textContent=d.myScore+' puan';
  }await poll();
 };
 const seen=new Set();let notifying=false;
 function showMatchInvite(note,owner){
  if(!logged()||owner!==name())return;
  if(window.dmPapiNotices?.defer('match-invite:'+note.sat,()=>showMatchInvite(note,owner)))return;
  const prompt=sheet('Oyun daveti',note.metin||note.gonderen+' seni oyuna çağırıyor.');
  prompt.body.innerHTML='<button type="button" class="dm-primary">Kabul et</button><button type="button" class="dm-secondary">Şimdi değil</button>';
  const [accept,later]=prompt.body.querySelectorAll('button');
  accept.onclick=()=>{prompt.close();if(owner===name())window.dmMatchAc(note.matchId);};
  later.onclick=prompt.close;
  accept.focus();
 }
 async function notify(){
  if(!logged()||document.hidden||notifying)return;
  const owner=name();
  if(account!==owner){account=owner;states.clear();seen.clear();}
  notifying=true;
  try{
   const d=await api('bildirimlerim');
   if(owner!==name())return;
   for(const note of d.liste||[]){
    if(seen.has(note.sat))continue;
    if(note.tur==='oyunDavet'&&note.matchId){seen.add(note.sat);showMatchInvite(note,owner);}
   }
  }catch{}finally{notifying=false;}
 }
 setInterval(notify,120000);setTimeout(notify,5000);
 const help=`<section class="dm-help-new" data-dm-help><h3>🦜 Yeni özellikler</h3><p><b>Parkur & MeduPro:</b> Öğrenme Parkuru’nda bulunduğun üniteye dokunarak devam et. Sağdaki MeduPro’da Kelime Modu, Papağanla Sohbet ve Kelime Kartları alt alta yer alır.</p><p><b>Engelle:</b> Profilde Takip et düğmesinin altındaki küçük Engelle düğmesine dokun. İki taraf da takip ve düello gönderemez; mevcut takipler kaldırılır ve aktif karşılaşmalar iptal edilir. Aynı düğmeden engeli kaldırabilirsin.</p><p><b>Düelloya Davet Et:</b> Arkadaşının profil kartındaki Düelloya Davet Et düğmesi ona canlı düello daveti gönderir. 15 saniye içinde kabul etmezse istersen Papi ile oynarsın.</p></section>`;
 const oldHelp=window.yardimIcerikCiz;if(typeof oldHelp==='function')window.yardimIcerikCiz=function(search){const r=oldHelp.apply(this,arguments),host=$('yardimIcerikAlani');host?.querySelector('[data-dm-help]')?.remove();if(host&&(!search||help.toLocaleLowerCase('tr').includes(String(search).toLocaleLowerCase('tr'))))host.insertAdjacentHTML('afterbegin',help);return r;};
 // The main Friends duel button and the user card share the same classic duel entry.
 // [18 Kas 2026] Eski düello ve öğrencilerin iki kişilik oyun kartları kaldırıldı. Öğretmenin Sınıfta Oyna çevrimiçi oyunları (dmMatchAc) korunur.
 window.dmDuelAc=function(target){return window.dmLiveDuel?.invite?.(target);};
 window.dmMeduPro={games,api,sheet};
})();

