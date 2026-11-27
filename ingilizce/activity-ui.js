(function(){
 'use strict';
 const m=window.dmMeduPro;if(!m)return;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const who=()=>typeof aktifOgrenciAdi!=='undefined'?aktifOgrenciAdi:'';
 const logged=()=>who()&&who().toLowerCase()!=='teacher'&&(!!localStorage.getItem('ing_token')||window.dmPreviewFixtures===true);
 const stamp=new Map();let skew=0,currentAccount='',fetching=false,lastRefresh=0,scheduled,failCount=0,retryAt=0;
 function isOnline(p){const s=stamp.get(p);return !!s?.online&&!!s.seenAt&&Date.now()+skew-Date.parse(s.seenAt)<=300000;}
 function badge(p,compact=false){const b=document.createElement('span');b.className='dm-online-badge'+(compact?' compact':'');b.dataset.onlinePerson=p;return b;}
 function paint(){document.querySelectorAll('[data-online-person]').forEach(b=>{const on=isOnline(b.dataset.onlinePerson),known=stamp.has(b.dataset.onlinePerson);b.classList.toggle('online',on);const t=on?'Çevrimiçi':known?'Çevrimdışı':'Durum kontrol ediliyor…';if(b.textContent!==t)b.textContent=t;b.setAttribute('aria-label',t);b.title=on?'Şu an veya son 5 dakika içinde aktif':'Son 5 dakika içinde etkinlik yok';});}
 function attach(){
  document.querySelectorAll('#tab-meduakis .kisi[data-o],#tab-meduakis .podyum-kisi[data-o],#tab-meduakis .ml-satir[data-o],#tab-meduakis .akis-ust[data-o]').forEach(row=>{if(row.querySelector('[data-online-person]'))return;const p=row.dataset.o==='ben'?who():row.dataset.o;if(!p)return;const h=row.querySelector('.kisi-ad,.ml-ad')||(row.classList.contains('akis-ust')?row.querySelector('span:not(.av):has(> b)'):row);if(h){if(row.classList.contains('akis-ust')){h.classList.add('dm-feed-name');const n=h.querySelector('b');if(n)n.append(badge(p,true));}else h.append(badge(p,true));}});paint();
 }
 async function refresh(force=false){
  if(!logged()||document.hidden||fetching||window.dmFeatureEnabled?.('cevrimici')===false)return;
  const owner=who(),names=[...new Set([...document.querySelectorAll('[data-online-person]')].map(b=>b.dataset.onlinePerson))].slice(0,120);
  /* [18 Kas 2026] Supabase yükü: çevrimiçi rozetleri 30 sn yerine 2 dk'da bir yenilenir (çevrimiçi sayılma eşiği zaten 5 dk). */if(!force&&Date.now()-lastRefresh<120000&&names.every(p=>stamp.has(p)))return;
  if(Date.now()<retryAt)return;
  fetching=true;try{const d=await m.api('aktifDurum',{isimler:names});if(owner!==who())return;skew=Date.parse(d.serverNow)-Date.now();for(const p of names)stamp.set(p,{online:false});for(const p of d.liste)stamp.set(p.ad,p);lastRefresh=Date.now();failCount=0;paint();}catch(e){/* [Kota 29 Eki 2026] Hatada sayfa değiştikçe tekrar tekrar sorulmaz: artan bekleme (1 → 30 dk). */failCount++;retryAt=Date.now()+Math.min(1800000,60000*2**(failCount-1));}finally{fetching=false;}
 }
 function queue(){clearTimeout(scheduled);scheduled=setTimeout(()=>{attach();refresh();},200);}
 attach();
 const profile=document.getElementById('tab-meduakis');if(profile)new MutationObserver(queue).observe(profile,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRefresh>60000)refresh(true);});
 setInterval(()=>{if(currentAccount!==who()){currentAccount=who();stamp.clear();lastRefresh=0;failCount=0;retryAt=0;}attach();refresh();},60000);setTimeout(()=>refresh(true),2000);
 window.dmSocialPresence={isOnline,refresh};
 // [18 Kas 2026] Öğrencilerin iki kişilik kategorisi kaldırıldı; dmInviteAc yalnız öğretmenin Sınıfta Oyna çevrimiçi oyunları için kalır.
 window.dmInviteAc=async function(game){
  if(!['ucus','rota'].includes(game))return;
  const s=m.sheet(m.games[game][0]+' · İki Kişilik Oyna',window.dmTeacherPortalMode?'Öğretmen oyunu · Enerji harcanmaz. Bir rakip seç; daveti kendi cihazından kabul eder.':window.dmClassroomOnlineOwner?'Seçilen öğrenci: '+window.dmClassroomOnlineOwner+'. Kendi sınıfından bir rakip seç; rakibi kendi cihazından daveti kabul eder. Çevrimiçi oyunların standart enerji kuralı geçerlidir.':'Aynı anda veya 24 saat içinde sırayla oynayın. Takip ettiğin bir arkadaşına oyun daveti gönder.');
  s.body.innerHTML='<p role="status">'+(window.dmTeacherPortalMode?'Öğrenciler yükleniyor…':'Takip ettiğin kişiler yükleniyor…')+'</p>';
  let stopped=false;s.p._close=()=>{stopped=true;};
  try{
   const d=await m.api('takipDavetListesi');if(stopped)return;skew=Date.parse(d.serverNow)-Date.now();d.liste.forEach(p=>stamp.set(p.ad,p));
   s.body.innerHTML=`<label class="dm-invite-label">Oynama şekli<select class="dm-invite-mode"><option value="live">Aynı anda · ortak geri sayım</option><option value="async">Farklı zamanda · 24 saat içinde</option></select></label><label class="dm-invite-label">Arkadaşını bul<input type="search" class="dm-invite-search" placeholder="İsim ara" autocomplete="off"></label><div class="dm-follow-list"></div><button class="dm-open-matches">İki Kişilik Karşılaşmalarım</button>`;
   const list=s.body.querySelector('.dm-follow-list');
   function draw(q=''){
    const rows=d.liste.filter(p=>p.ad.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
    list.innerHTML=rows.length?rows.map(p=>`<div class="dm-invite-person"><div><b>${esc(p.ad)}</b><span class="dm-online-badge" data-online-person="${esc(p.ad)}"></span></div><button data-invite="${esc(p.ad)}">Davet et</button></div>`).join(''):`<p class="dm-empty">${d.liste.length?'Bu isimde takip ettiğin bir kişi yok.':'Henüz kimseyi takip etmiyorsun. Arkadaşlar → Arkadaş ekle bölümünden arkadaşlarını takip edebilirsin.'}</p>`;paint();
    list.querySelectorAll('[data-invite]').forEach(b=>b.onclick=async()=>{list.querySelectorAll('button').forEach(x=>x.disabled=true);try{const r=await m.api('oyunEslesmeOlustur',{alici:b.dataset.invite,oyun:game,mod:s.body.querySelector('.dm-invite-mode').value});s.close();window.yoToast?.('Oyun daveti gönderildi!');window.dmMatchAc(r.id);}catch(e){let error=list.querySelector('.dm-error');if(!error){error=document.createElement('p');error.className='dm-error';error.setAttribute('role','alert');list.prepend(error);}error.textContent=e.message;list.querySelectorAll('button').forEach(x=>x.disabled=false);}});
   }
   draw();s.body.querySelector('input').oninput=e=>draw(e.target.value);s.body.querySelector('.dm-open-matches').onclick=()=>{s.close();window.dmArenaAc();};
  }catch(e){if(stopped)return;s.body.textContent=e.message;}
 };
 const defs=[['papiFeneriAc',27,'Kelime','oyun_fener'],['canavarAvcisiAc',20,'Kelime','oyun_canavar'],
 ['pomodoroAc',2,'Odaklanma','pomodoro'],['kelimeYarismasiAc',0,'Kelime','oyun_kelime'],['hafizaOyunAc',1,'Hafıza','oyun_hafiza'],['okumaStudyosunuAc',2,'Okuma','okuma_hizi'],['boslukOyunAc',3,'Kelime','oyun_bosluk'],['asmacaOyunAc',4,'Kelime','oyun_asmaca'],['jpOyunAc',5,'Kelime','oyun_jeopardy'],['yagmurOyunAc',6,'Kelime','oyun_yagmur'],['kelimebulOyunAc',7,'Kelime','oyun_kelimebul'],['esOyunAc',8,'Kelime','oyun_eslestirme'],['trenOyunAc',9,'Cümle','oyun_tren'],['dikteAc',10,'Dinleme','oyun_dikte'],['cumleAc',11,'Cümle','oyun_cumle'],['harfBahcesiAc',15,'Kelime','oyun_harfbahcesi'],['ralliOyunAc',16,'Kelime','oyun_ralli'],['kelimeGoluAc',18,'Kelime','oyun_kelime']];
 const free={kelimeGoluDuo:[19,'İki kale, dört köşe; doğru anlamı seç ve golünü at. Enerji harcanmaz.','Maçı Başlat'],papiCardsActivity:[12,'Kelime kartlarını dinle ve öğren.','Kartları Aç'],meteorActivity:[13,'Aynı cihazda kelimeleri yakala, rakibini geç.','Oyunu Aç'],wordWheelActivity:[14,'Çarkı çevir, doğru kelimeyi bul.','Çarkı Aç'],sentenceRaceActivity:[17,'İki takım · farklı sorular · 12 tur · süre bonusu.','Yarışı Başlat']};
 const icon=name=>'<svg class="gg-icon" aria-hidden="true"><use href="games-assets/ui-icons.svg#'+name+'"></use></svg>';
 let party='premium',skill='Tümü',lastAccount='',friendsLoaded=false,knownGrid=null,key='';
 const retiredGates=new Set(['oyun_jeopardy','oyun_kelimebul','oyun_dikte','oyun_canavar','oyun_harfbahcesi','oyun_tren','oyun_cumle']);
 const retiredPremiumCard=b=>['towerActivity','premiumWordBlocksActivity'].includes(b.id)||/\b(dengesizKuleAc|premiumKelimeBloklariAc)\s*\(/.test(b.getAttribute('onclick')||'');
 const retiredCard=b=>retiredPremiumCard(b)||!window.dmTeacherPortalMode&&(b.dataset.ggCategory==='break'||retiredGates.has(b.dataset.ggGate)||retiredGates.has(game(b)[3]));
 const categories={solo:'Tek Kişilik',free:'Sınıfta Oyna',konu:'Konu Oyunları',break:'Mola Vakti',premium:'Premium Oyunlar'};
 const premiumOrder=['papiSapanFirtinasiPremium','papiDalgaSorfuPremium','kelimeGoluSolo','papizzleActivity','premiumWordMatchActivity','premiumCloudFlightActivity','rallyActivity'];
 const listOrder=['papiSapanFirtinasiPremium','papiSapanFirtinasiFree','papiDalgaSorfuPremium','papiDalgaSorfuFree','game-jpOyunAc()','game-kelimeYarismasiAc()','kelimeGoluSolo','mola-kosu','papizzleActivity'];
 const listRank=id=>{const i=listOrder.indexOf(id);return i<0?listOrder.length:i;};
 const categorySubs={solo:'Kelime oyunları',break:'Kısa eğlence'};
const categoryIcons={solo:0,free:2,konu:3,break:4,premium:5};
 const gameCovers={
  papiSapanFirtinasiPremium:'premium-assets/sapan-firtinasi/cover.webp',
  papiSapanFirtinasiFree:'premium-assets/sapan-firtinasi/cover.webp',
  papiDalgaSorfuPremium:'premium-assets/dalga-sorfu/cover.webp',
  papiDalgaSorfuFree:'premium-assets/dalga-sorfu/cover.webp',
  dmUcusteKart:'ozgun/ucus-panosi.svg',
  sentenceRaceActivity:'games-assets/cumle-yarisi-cover.svg',
  kelimeGoluSolo:'games-assets/kelime-golu-stadium-v1.webp',
  kelimeGoluDuo:'games-assets/kelime-golu-stadium-v1.webp',
  dmRotaKart:'games-assets/cumle-rotasi-cover.svg'
 };
 function changeCategory(host,grid,category,topicCategory){
  if(!window.dmTeacherPortalMode&&['free','konu','break'].includes(category))category='solo';
  party=category;skill='Tümü';render(host,grid,topicCategory);
  host.closest('#tab-aktiviteler').scrollTop=0;
  host.querySelector('[data-gg-party="'+(category==='tools'?'all':category)+'"]')?.focus({preventScroll:true});
  if(!window.dmTeacherPortalMode&&category==='free')loadFriends(host);
 }
 function exhaustedCard(access={},options={}){
  if(window.dmPremiumPlayOffer)return window.dmPremiumPlayOffer.open(options);
  document.getElementById('ggExhausted')?.remove();
  const previous=document.activeElement,overlay=document.createElement('div');overlay.id='ggExhausted';overlay.className='gg-exhausted';
  overlay.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="ggExhaustedTitle"><button type="button" class="gg-exhausted-close" aria-label="Kapat">×</button><img class="gg-exhausted-papi" src="satis-assets/papi-premium-gift.webp" alt="3D Papi" width="128" height="128"><h2 id="ggExhaustedTitle">'+(access.plan==='pro'?'Bugünlük oyun hakkın bitti':'Bugünlük ücretsiz hakkın bitti')+'</h2><p>Premium ile sınırsız oyna.</p><button type="button" data-plans>Premium ile sınırsız oyna</button><button type="button" data-dismiss>Şimdi değil</button></section>';
  const close=()=>{overlay.remove();document.removeEventListener('keydown',keys);previous?.focus?.();};
  const keys=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  overlay.onclick=e=>{if(e.target===overlay)close();};overlay.querySelector('.gg-exhausted-close').onclick=close;overlay.querySelector('[data-dismiss]').onclick=close;
  overlay.querySelector('[data-plans]').onclick=()=>{close();if(window.DMSatis?.planlar)window.DMSatis.planlar('premium-oyunlar','premium_pro');else window.dmAndroidBilling?.open?.('premium-oyunlar');};
  document.body.append(overlay);document.addEventListener('keydown',keys);overlay.querySelector('[data-plans]').focus();
 }
 async function premiumEntry(card){
  if(retiredCard(card))return;
  const launch=()=>{
   if(window.dmTeam?.isPremiumSession?.()&&window.dmTeam.launchPremiumCard?.(card))return;
   card.click();
  };
  // These games check quota in their own status/start flow and can resume a paid run at zero remaining.
  if(['papiSapanFirtinasiPremium','papiDalgaSorfuPremium','kelimeGoluSolo'].includes(card.id)){launch();return;}
  if(card.dataset.ggCategory!=='premium'||window.dmTeacherPortalMode){card.click();return;}
  if(card.dataset.accessPending)return;
  card.dataset.accessPending='1';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  const games={premiumWordMatchActivity:'word-match',premiumCloudFlightActivity:'cloud-flight',papizzleActivity:'papizzle',kelimeGoluSolo:'word-goal'};
  const game=games[card.id]||'rally';
  try{
   const token=localStorage.getItem('ing_token')||'';
   const response=await fetch((typeof apiURL==='string'?apiURL:'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/,'premium-games'),{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'access',game,t:token})});
   const access=await response.json();
   if(!response.ok||access.ok===false)throw Error(access.mesaj||'Haklar kontrol edilemedi.');
   if(access.remaining<=0){exhaustedCard(access,{game,onReady:()=>launch()});return;}
   launch();
  }catch(error){window.alert(error.message||'Haklar kontrol edilemedi. Tekrar dene.');}
  finally{clearTimeout(timeout);delete card.dataset.accessPending;}
 }
 const approvedGameArt={
  kelimeGoluSolo:'29 553 388 241',
  papizzleActivity:'436 553 387 241',
  premiumWordMatchActivity:'436 923 387 211',
  premiumCloudFlightActivity:'29 1278 388 220'
 };
 function coverArt(card,compact=false){
  const art=document.createElement('span');art.className='gg-cover';art.setAttribute('aria-hidden','true');
  const crop=!window.dmTeacherPortalMode&&approvedGameArt[card.id];
  if(crop){
   art.classList.add('gg-approved-cover');
   art.innerHTML='<svg viewBox="'+crop+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="games-assets/approved-games-sheet.webp" width="852" height="1846"/></svg>';
   return art;
  }
  const thumbnail=card.style.getPropertyValue('--au-thumb');
  const index=Number(card.dataset.ggIndex);
  if(thumbnail!=='' || (Number.isInteger(index)&&index>=0&&index<16&&!gameCovers[card.id])){
   let file='games-assets/game-atlas-v1.webp',width=1254,height=1254,box;
   if(thumbnail!==''){
    const n=Number(thumbnail);width=1774;height=887;
    const x=n%2*887,y=Math.floor(n/2)*443.5;
    box=[x+1,y+1,885,441.5];
    file='route-assets/approved/game-thumbs.webp';
    art.classList.add('gg-wide-art');
   }else{
    const rows=[0,303,610,913,1254],cols=[0,313,627,940,1254],col=index%4,row=Math.floor(index/4);
    box=[cols[col]+1,rows[row]+1,cols[col+1]-cols[col]-2,rows[row+1]-rows[row]-2];
   }
   art.classList.add('gg-approved-cover');
   art.innerHTML='<svg viewBox="'+box.join(' ')+'" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href="'+file+'" width="'+width+'" height="'+height+'"/></svg>';
   return art;
  }
  const cover=gameCovers[card.id];
  if(card.id==='dmUcusteKart'){
   art.classList.add('gg-flight-cover');
   const bird=new Image();bird.src=cover;bird.alt='';bird.loading='lazy';bird.decoding='async';art.append(bird);
  }else if(cover){
   const image=new Image();image.src=cover;image.alt='';image.loading='lazy';image.decoding='async';
   if(!compact&&card.id==='sentenceRaceActivity'){
    const backdrop=image.cloneNode();backdrop.className='gg-cover-backdrop';art.append(backdrop);
    image.className='gg-cover-subject';
   }
   art.append(image);
  }else{
   const source=card.querySelector('.gg-art')?.cloneNode(true);
   if(source){
    const image=source.querySelector('image[data-href]');
    if(image)image.setAttribute('href',image.dataset.href);
    const isAtlas=source.style.getPropertyValue('--gx')||card.style.getPropertyValue('--au-thumb');
    if(!compact&&(isAtlas||source.classList.contains('gg-premium-art'))){
     const backdrop=source.cloneNode(true);backdrop.classList.add('gg-cover-backdrop');art.append(backdrop);
     source.classList.add('gg-cover-subject');
    }
    art.append(source);
   }
  }
  for(const name of ['--au-thumb','--au-thumb-x','--au-thumb-y']){
   const value=card.style.getPropertyValue(name);
   if(value)art.style.setProperty(name,value);
  }
  return art;
 }
 function renderList(host,all){
  const list=host.querySelector('.gg-overview');
  const surfFreeOk=window.dmDalgaSorfu?.hasFreeQuota?.()!==false;
  const sapanFreeOk=window.dmSapanFirtinasi?.hasFreeQuota?.()!==false;
  const sapanLaunch=window.dmSapanFirtinasi?.launchLabel?.()||'';
  const cards=all.filter(card=>{
   if(card.id==='papiDalgaSorfuFree'&&!surfFreeOk)return false;
   if(card.id==='papiSapanFirtinasiFree'&&!sapanFreeOk)return false;
   const {ggCategory:category,ggTitle:title,ggGameSkill:gameSkill}=card.dataset;
   return categories[category]&&(!window.dmTeacherPortalMode||category!=='duo')&&(party==='all'||party===category)&&
    (party!=='solo'||skill==='Tümü'||gameSkill===skill||skill==='Kelime'&&gameSkill==='Hafıza');
  });
  cards.sort((a,b)=>(party==='all'?listRank(a.dataset.ggId)-listRank(b.dataset.ggId):0)||Number(a.style.order)-Number(b.style.order));
  const signature=[account(),!!window.dmTeacherPortalMode,party,skill,surfFreeOk,sapanFreeOk,sapanLaunch,...cards.map(card=>card.dataset.ggId+':'+allowed(card.dataset.ggGate))].join('|');
  if(list.dataset.signature===signature)return;
  list.dataset.signature=signature;
  const focused=document.activeElement?.closest('.gg-shelf-card')?.dataset.ggSource;
  list.replaceChildren(...cards.map(card=>{
   const {ggId:id,ggTitle:title,ggCategory:category,ggGate:gate}=card.dataset;
   const isSapan=card.id==='papiSapanFirtinasiPremium'||card.id==='papiSapanFirtinasiFree';
   const open=allowed(gate);
   const row=document.createElement('button');row.type='button';row.className='gg-shelf-card gg-list-row';
   row.dataset.ggSource=id;row.setAttribute('aria-disabled',String(!open));
   const subtitle=open?categories[category]:categories[category]+' · '+(window.DijiProgressionCatalog?.gates[gate]||30)+'. seviyede açılır';
   const launchPill=isSapan&&sapanLaunch?'<span class="gg-sapan-launch-pill">'+esc(sapanLaunch)+'</span>':'';
   row.innerHTML='<span class="gg-row-copy"><strong>'+esc(title)+'</strong><small>'+esc(subtitle)+'</small>'+launchPill+'</span>'+
    '<span class="gg-row-action" aria-hidden="true">'+(open?'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5a1 1 0 0 1 1.5-.86l11 7a1 1 0 0 1 0 1.72l-11 7A1 1 0 0 1 8 19z"/></svg>':icon('lock'))+'</span>';
   if(!window.dmTeacherPortalMode){
    row.classList.add('gg-approved-card');
    if(open)row.querySelector('.gg-row-copy small').hidden=true;
   }
   row.prepend(coverArt(card,true));row.onclick=()=>premiumEntry(card);
   return row;
  }));
  if(!cards.length){
   const empty=document.createElement('p');empty.className='gg-list-empty';empty.setAttribute('role','status');
   empty.textContent='Bu filtrede oyun bulunamadı.';list.append(empty);
  }
  if(focused)[...list.children].find(row=>row.dataset.ggSource===focused)?.focus({preventScroll:true});
 }
 function installRedesign(host,grid,top,bottom){
  host.classList.add('gg-redesign','gg-list-view','gg-selected-cards');
  const filters=top.querySelector('.gg-tabs');
  filters.setAttribute('role','group');
  filters.querySelectorAll('button').forEach(button=>{button.removeAttribute('role');button.removeAttribute('aria-controls');});
  // The redundant all-games category is removed; show the Solo category by default.
  filters.querySelectorAll('[data-gg-party]:not([data-gg-party=all])').forEach(button=>{
   button.querySelector('svg')?.remove();
   button.insertAdjacentHTML('afterbegin','<svg class="gg-category-art" aria-hidden="true"><use href="games-assets/category-icons.svg#'+button.dataset.ggParty+'"></use></svg>');
  });
  top.insertAdjacentHTML('beforeend','<div class="gg-overview"></div>');
  bottom.insertAdjacentHTML('afterend','<div class="gg-shortcuts"><button type="button">Çalışma Araçları ›</button></div>');
  host.querySelector('.gg-shortcuts button').onclick=()=>changeCategory(host,grid,party==='tools'?'solo':'tools');
  const groups=document.createElement('div');groups.className='gg-main-categories';
  groups.innerHTML='<button type="button" data-gg-main="premium">'+('<svg class="gg-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m2 5 5 5 5-8 5 8 5-5-3 16H5z"/></svg>')+' Premium Oyunlar</button><button type="button" data-gg-main="free" aria-controls="ggFreeCategories">'+('<svg class="gg-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h12c3 0 5 13 3 14-2 1-4-4-6-4H9c-2 0-4 5-6 4C1 18 3 5 6 5Z"/><path d="M7 8v6m-3-3h6" stroke="white" stroke-width="2"/><circle cx="17" cy="9" r="1.5" fill="white"/><circle cx="19" cy="12" r="1.5" fill="white"/></svg>')+' Ücretsiz Oyunlar</button>';
  filters.before(groups);filters.id='ggFreeCategories';
  filters.querySelector('[data-gg-party="premium"]').hidden=true;
  groups.querySelector('[data-gg-main="premium"]').onclick=()=>changeCategory(host,grid,'premium');
  groups.querySelector('[data-gg-main="free"]').onclick=()=>changeCategory(host,grid,'solo');
  const art=(box,cls='gg-category-art')=>'<svg class="'+cls+'" viewBox="'+box+'" aria-hidden="true" focusable="false"><image href="design-assets/games-cards-approved.webp" width="1086" height="1448"/></svg>';
  const boxes={solo:'145 526 150 132',free:'158 719 138 120',konu:'584 714 133 130',break:'168 904 147 78'};
  filters.querySelectorAll('[data-gg-party]').forEach(button=>{const key=button.dataset.ggParty;if(!boxes[key])return;button.innerHTML=art(boxes[key])+'<span class="gg-category-copy"><b class="gg-category-name">'+categories[key]+'</b>'+(categorySubs[key]?'<small class="gg-category-sub">'+categorySubs[key]+'</small>':'')+'</span>';});
  const question=document.createElement('h2');question.className='gg-category-question';question.textContent='Nasıl oynamak istersin?';filters.before(question);


 }
 const account=()=>String(who()||'guest');
 const level=()=>window.dmProgression?.level?.()||1;
 const allowed=code=>!code||!window.dmProgression||window.dmProgression.allowed(code);
 const img=(i,cls='')=>i===29?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/sapan-firtinasi/cover.webp" alt="" loading="lazy" decoding="async"></span>':i===28?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/dalga-sorfu/cover.webp" alt="" loading="lazy" decoding="async"></span>':i===27?'<span class="gg-art sa-hub-fener" aria-hidden="true"></span>':i===26?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/papizzle-cover.webp" alt="" loading="lazy" decoding="async"></span>':i===24?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/kelime-bloklari/kapak.webp" alt="" loading="lazy" decoding="async"></span>':i===23?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/bulut-ucusu/kapak.webp" alt="" loading="lazy" decoding="async"></span>':i===22?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/kelime-eslestirme/card-cover.webp" alt="" loading="lazy" decoding="async"></span>':i===20?'<span class="gg-art sa-hub-monster"><span class="sa-monster sa-monster-0"></span></span>':i===21?'<span class="gg-art sa-hub-tower"><img src="arcade-assets/floor.webp" alt=""></span>':[18,19].includes(i)?'<span class="gg-art kg-hub-art '+cls+'" aria-hidden="true"></span>':i===17?'<span class="gg-art dm-sr-hub-art '+cls+'" aria-hidden="true"></span>':i===16?'<span class="gg-art rr-hub-art '+cls+'" aria-hidden="true"><img src="rally-assets/car.webp" alt=""></span>':'<span class="gg-art '+cls+'" style="--gx:'+(i%4)*100/3+'%;--gy:'+Math.floor(i/4)*100/3+'%" aria-hidden="true"></span>';
 function game(b){const rule=defs.find(d=>(b.getAttribute('onclick')||'').includes(d[0]))||defs.find(d=>b.id===d[0]||b.id==='yoDikteKart'&&d[0]==='dikteAc');return rule||[null,8,'Kelime',b.dataset.dmLevelLock||window.DijiProgressionCatalog?.functions[(b.getAttribute('onclick')||'').match(/([A-Za-z_$][\w$]*)\s*\(/)?.[1]]||''];}
 function lastGame(){try{return localStorage.getItem('dm_last_game:'+account())||'';}catch{return '';}}
 function remember(b){try{localStorage.setItem('dm_last_game:'+account(),b.dataset.ggId);}catch{}}
 function prepare(b,i){if(b.dataset.ggReady)return;b.dataset.ggReady='1';b.dataset.ggId=b.id||'game-'+(b.getAttribute('onclick')||i);const d=game(b),f=free[b.id];b.dataset.ggGameSkill=d[2];b.dataset.ggGate=d[3];b.dataset.ggCategory=f?'free':b.classList.contains('dm-live-card')||['dmUcusteKart','dmRotaKart'].includes(b.id)?'duo':'solo';if(b.dataset.ggCategory==='duo')b.dataset.ggGate='iki_kisilik';b.dataset.ggIndex=f?f[0]:d[1];b.style.order=String(f?f[0]:defs.includes(d)?d[1]:50);if(b.id==='papiSapanFirtinasiFree'){b.dataset.ggCategory='solo';b.dataset.ggGate='';b.dataset.ggGameSkill='Kelime';b.style.order='-11';b.dataset.ggIndex='29';}if(b.id==='papiDalgaSorfuFree'){b.dataset.ggCategory='solo';b.dataset.ggGate='';b.dataset.ggGameSkill='Kelime';b.style.order='-10';b.dataset.ggIndex='28';}if(['papiSapanFirtinasiPremium','papiDalgaSorfuPremium','premiumWordMatchActivity','premiumCloudFlightActivity','papizzleActivity','rallyActivity','kelimeGoluSolo'].includes(b.id)){b.dataset.ggCategory='premium';b.dataset.ggGate='';b.style.order=String(premiumOrder.indexOf(b.id));b.dataset.ggIndex=b.id==='papiSapanFirtinasiPremium'?'29':b.id==='papiDalgaSorfuPremium'?'28':b.id==='kelimeGoluSolo'?'18':b.id==='rallyActivity'?'16':b.id==='papizzleActivity'?'26':b.id==='premiumCloudFlightActivity'?'23':'22';}
  b.classList.add('gg-game');b.classList.remove('dm-toy-card','dm-showcase-card');
  const title=b.querySelector('.az-gcard-title')?.textContent.trim()||b.textContent.trim();b.dataset.ggTitle=title;
  const tool=d[0]==='pomodoroAc'||d[0]==='okumaStudyosunuAc';if(tool)b.dataset.ggCategory='tools';
  const description=b.dataset.ggCategory==='premium'?(window.dmTeacherPortalMode?'Word Bank • Paketindeki oyun hakları geçerli':'Word Bank • Premium oyun'):tool?(d[0]==='pomodoroAc'?'Odaklanma ve mola zamanlayıcısı':'Okuma ve anlama çalışmaları'):f?f[1]:d[2]+' • 12 soru';
  const thumb=[['harfBahcesiAc',0],['trenOyunAc',1],['yagmurOyunAc',2],['kelimebulOyunAc',3]].find(([fn])=>(b.getAttribute('onclick')||'').includes(fn));if(thumb){b.style.setProperty('--au-thumb',thumb[1]);b.style.setProperty('--au-thumb-x',(thumb[1]%2*100)+'%');b.style.setProperty('--au-thumb-y',(Math.floor(thumb[1]/2)*100)+'%');}
  const toolArt=tool?'<span class="gg-art gg-tool-art" aria-hidden="true">'+(d[0]==='pomodoroAc'?'<svg viewBox="0 0 64 64"><rect x="24" y="3" width="16" height="8" rx="4" fill="#9662d7"/><circle cx="32" cy="36" r="25" fill="#dcf8ee" stroke="#8b62cf" stroke-width="5"/><path d="M32 20v17l11 7" fill="none" stroke="#8b62cf" stroke-width="5" stroke-linecap="round"/></svg>':'<i class="au-art au-passport-icons" style="--au-x:0%;--au-y:0%"></i>')+'</span>':img(+b.dataset.ggIndex);
  b.innerHTML=toolArt+'<span class="gg-copy"><strong class="az-gcard-title">'+esc(title)+'</strong><small>'+esc(description)+'</small><span class="gg-play">'+(f?f[2]:tool?(d[0]==='pomodoroAc'?'Başlat':'Aç'):b.dataset.ggCategory==='duo'?'Davet Et':'Oyna')+' ›</span></span>';
  b.addEventListener('click',()=>{if(b.dataset.ggCategory==='solo'&&allowed(b.dataset.ggGate))window.dmSoloStageRequested=Date.now();},true);
  b.addEventListener('click',e=>{if(!allowed(b.dataset.ggGate)){e.preventDefault();e.stopImmediatePropagation();window.dmProgression?.require(b.dataset.ggGate);return;}if(b.dataset.ggCategory!=='tools')remember(b);},true);
 }
 function render(host,grid,topicCategory){
  const routeCard=b=>/asmacaOyunAc/.test(b.getAttribute('onclick')||'')||/yolculuguAc|baModuAc|baFabTikla|buyuAkademisiYeniAc/.test(b.getAttribute('onclick')||'');
  grid.querySelectorAll('.az-gcard').forEach(b=>{if(routeCard(b)){b.hidden=true;b.style.setProperty('display','none','important');}});
  const candidates=[...grid.querySelectorAll('.az-gcard'),...host.querySelectorAll('.gg-tools .az-gcard')];
  for(const b of candidates)if(retiredCard(b)){b.hidden=true;b.style.setProperty('display','none','important');}
  const all=candidates.filter(b=>!routeCard(b)&&!retiredCard(b));all.forEach(prepare);
  let tools=host.querySelector('.gg-tools');if(!tools){tools=document.createElement('section');tools.className='gg-tools';tools.setAttribute('aria-labelledby','ggToolsTitle');tools.innerHTML='<h2 id="ggToolsTitle">Çalışma Araçları</h2><p>Odaklanmak ve okuma becerini geliştirmek için yardımcı araçlar.</p><div class="gg-tools-grid"></div>';grid.after(tools);}all.filter(b=>b.dataset.ggCategory==='tools').forEach(b=>{if(b.parentElement!==tools.querySelector('.gg-tools-grid'))tools.querySelector('.gg-tools-grid').append(b);});const redesigned=host.classList.contains('gg-redesign');tools.hidden=party!==(redesigned?'tools':'solo');
  const teacher=!!window.dmTeacherPortalMode;
  if(!teacher&&['free','konu','break'].includes(party))party='solo';
  host.querySelectorAll('[data-gg-party="free"],[data-gg-party="konu"]').forEach(b=>{b.hidden=!teacher;b.style.setProperty('display',teacher?'':'none','important');});
  const freeGroup=party!=='premium';
  const tabs=host.querySelector('.gg-tabs');tabs.hidden=!teacher||!freeGroup;
  tabs.style.setProperty('grid-template-columns',teacher?'repeat(2,minmax(0,1fr))':'1fr','important');
  const question=host.querySelector('.gg-category-question');question.hidden=!teacher||!freeGroup;question.style.setProperty('display',teacher&&freeGroup?'':'none','important');
  host.classList.toggle('gg-cat-a',!teacher); // [18 Kas 2026] Öğrenci: A tasarımı büyük resimli kartlar
  tabs.querySelectorAll('button').forEach(b=>{b.style.setProperty('grid-column',teacher&&b.dataset.ggParty==='konu'?'1/-1':'auto','important');if(b.dataset.ggParty==='premium')b.style.setProperty('display','none','important');});
  tabs.style.setProperty('display',teacher&&freeGroup?'grid':'none','important');
  host.querySelectorAll('[data-gg-main]').forEach(b=>{const on=(b.dataset.ggMain==='free')===freeGroup;b.setAttribute('aria-pressed',String(on));if(b.dataset.ggMain==='free')b.setAttribute('aria-expanded',String(on));});

  host.classList.toggle('gg-teacher-list',teacher);
  host.querySelectorAll('#ggOnlineTab,#ggBreakTab').forEach(button=>{
   const hidden=button.id==='ggBreakTab'?!teacher:teacher;
   button.hidden=hidden;
   if(hidden)button.style.setProperty('display','none','important');
   else button.style.removeProperty('display');
  });
  const listen=host.querySelector('[data-gg-skill="Dinleme"]');if(listen){listen.hidden=!teacher;listen.style.setProperty('display',teacher?'':'none','important');}
  if(!teacher)skill='Tümü';
  if(teacher&&party==='duo')party='solo';delete host.dataset.dmParty;host.dataset.ggParty=party;const active=party;
  host.querySelectorAll('[data-gg-party]').forEach(b=>{const on=b.dataset.ggParty===active;b.setAttribute(redesigned?'aria-pressed':'aria-selected',String(on));b.tabIndex=redesigned||on?0:-1;});
  host.querySelectorAll('.gg-filters [data-gg-skill]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ggSkill===skill)));
  host.querySelector('.gg-banner')?.remove();
  host.classList.add('au-games');host.querySelectorAll('[data-gg-party]').forEach(b=>{const index=categoryIcons[b.dataset.ggParty];if(index===undefined)return;if(!b.querySelector('.au-game-icon,.gg-category-art')){b.querySelector('svg')?.remove();const art=document.createElement('i');art.className='au-game-icon';art.setAttribute('aria-hidden','true');if(index===5){art.classList.add('gg-premium-icon');}else art.style.backgroundPosition=(index*25)+'% 50%';b.prepend(art);}const label=b.querySelector('.gg-category-name')||b.querySelector('span');if(label)label.textContent=categories[b.dataset.ggParty];});
  const skillFilters=host.querySelector('.gg-filters');skillFilters.hidden=!teacher||party!=='solo';skillFilters.style.setProperty('display',teacher&&party==='solo'?'':'none','important');host.querySelector('.gg-social').hidden=!!window.dmTeacherPortalMode||party==='solo'||party==='break'||party==='konu'||party==='premium';host.querySelector('.gg-heading').textContent=party==='premium'?'👑 Premium Oyunlar':party==='konu'?'Konu Başlıkları':party==='break'?'Mola Oyunları':party==='solo'?'Tek Kişilik Oyunlar':party==='free'?'Sınıfta Oyna':'İki Kişilik Oyna';
  if(!redesigned)grid.setAttribute('aria-labelledby',party==='premium'?'ggPremiumTab':party==='break'?'ggBreakTab':party==='solo'?'ggSoloTab':party==='duo'?'ggOnlineTab':'ggFreeTab');
  const surfFreeOk=window.dmDalgaSorfu?.hasFreeQuota?.()!==false;
  const sapanFreeOk=window.dmSapanFirtinasi?.hasFreeQuota?.()!==false;
  let count=0;all.forEach(b=>{const tool=b.dataset.ggCategory==='tools',open=allowed(b.dataset.ggGate),hideSurf=b.id==='papiDalgaSorfuFree'&&!surfFreeOk,hideSapan=b.id==='papiSapanFirtinasiFree'&&!sapanFreeOk,show=!hideSurf&&!hideSapan&&((tool&&party===(redesigned?'tools':'solo'))||b.dataset.ggCategory===party&&(party!=='solo'||(skill==='Tümü'||b.dataset.ggGameSkill===skill||skill==='Kelime'&&b.dataset.ggGameSkill==='Hafıza')));b.classList.toggle('gg-locked',!open);b.setAttribute('aria-disabled',String(!open));const play=b.querySelector('.gg-play');if(play)play.textContent=!open?(window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||30)+'. seviyede açılır':free[b.id]?free[b.id][2]+' ›':tool?(b.dataset.ggIndex==='2'&&/pomodoroAc/.test(b.getAttribute('onclick')||'')?'Başlat ›':'Aç ›'):b.dataset.ggCategory==='duo'?'Davet Et ›':'Oyna ›';b.hidden=!show;b.style.setProperty('display',show?'grid':'none','important');if(redesigned&&!tool){
    const originalOrder=b.dataset.ggOrder??=b.style.order||'50';
    b.style.order=String(Number(originalOrder)+(open?0:100));
   }
   if(show&&!tool)count++;});
  host.querySelector('.gg-empty').hidden=party==='konu'||count!==0;
  grid.hidden=party==='konu';/* katmanlı display:...!important kuralları hidden'ı eziyordu; Konu Oyunları'nda liste altta kalıyordu */for(const g of new Set([grid,...host.querySelectorAll('.az-grid2x2')])){if(party==='konu'){if(g!==grid&&!g.hidden)g.dataset.kgHid='1';g.hidden=true;g.style.setProperty('display','none','important');}else if(g===grid||g.dataset.kgHid){if(g!==grid)g.hidden=false;delete g.dataset.kgHid;g.style.removeProperty('display');}}/* [12 Kas 2026] Konu Oyunları: önceki kategorinin oyun kartları (tüm oyun ızgaraları) gizlenir */const topicHub=host.querySelector('.kg-hub');if(topicHub){topicHub.hidden=party!=='konu';topicHub.style.setProperty('display',party==='konu'?'block':'none','important');}if(party==='konu')window.dmTopicGames?.mount(host,topicCategory);
  const locked=all.filter(b=>b.dataset.ggCategory==='solo'&&!allowed(b.dataset.ggGate)).sort((a,b)=>(window.DijiProgressionCatalog?.gates[a.dataset.ggGate]||40)-(window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||40));
  const next=host.querySelector('.gg-next');next.hidden=redesigned||party!=='solo'||!locked.length;
  if(!next.hidden){const b=locked[0],need=window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||40;next.innerHTML='<h3>Sıradaki Oyun</h3><div>'+img(+b.dataset.ggIndex)+'<span><b>'+esc(b.dataset.ggTitle)+'</b><small>'+icon('lock')+need+'. seviyede açılır</small></span><label>Seviye '+level()+' → '+need+'<progress value="'+Math.min(level(),need)+'" max="'+need+'"></progress></label></div>';}
  const last=all.find(b=>b.dataset.ggId===lastGame()&&b.dataset.ggCategory==='solo'&&allowed(b.dataset.ggGate)),resume=host.querySelector('.gg-resume');resume.hidden=redesigned||party!=='solo'||!last;
  if(last){resume.innerHTML='<small>Son oynadığın oyun</small><div>'+img(+last.dataset.ggIndex)+'<b>'+esc(last.dataset.ggTitle)+'</b><button type="button">Tekrar Oyna ›</button></div>';resume.querySelector('button').onclick=()=>last.click();}
  if(redesigned){
   const showTools=party==='tools',showTopics=party==='konu';
   host.querySelector('.gg-overview').hidden=showTools||showTopics;
   host.querySelector('.gg-overview').style.setProperty('display',showTools||showTopics?'none':'grid','important');
   host.querySelector('.gg-heading').hidden=true;
   host.querySelector('.gg-empty').hidden=true;
   host.querySelector('.gg-shortcuts button').textContent=showTools?(teacher?'Tek Kişilik Oyunlara Dön ›':'Ücretsiz Oyunlara Dön ›'):'Çalışma Araçları ›';
   host.querySelector('.gg-social').hidden=true;
   grid.hidden=true;
   if(!showTools&&!showTopics)renderList(host,all);
  }
  const xp=typeof yo!=='undefined'?yo:null;host.querySelector('[data-gg-gold]').textContent=xp?.altin||0;host.querySelector('[data-gg-energy]').textContent=(typeof genelEnerjiKalan==='number'?genelEnerjiKalan:typeof genelEnerjiKalan==='function'?genelEnerjiKalan():'–')+'/'+(typeof genelEnerjiMax==='number'?genelEnerjiMax:typeof genelEnerjiMax==='function'?genelEnerjiMax():30);
 }
 async function loadFriends(host){if(friendsLoaded)return;if(!allowed('takip')){host.querySelector('.gg-friends').textContent='Arkadaşlar '+(window.DijiProgressionCatalog?.gates.takip||15)+'. seviyede açılır.';return;}if(!logged()){host.querySelector('.gg-friends').textContent='Arkadaşlarını görmek için giriş yap.';return;}friendsLoaded=true;const row=host.querySelector('.gg-friends');row.innerHTML='<span role="status">Arkadaşların yükleniyor…</span>';const owner=account();try{const d=await m.api('takipDavetListesi');if(account()!==owner)return;skew=Date.parse(d.serverNow)-Date.now();d.liste.forEach(p=>stamp.set(p.ad,p));row.innerHTML=d.liste.length?d.liste.slice(0,5).map(p=>'<button type="button" data-gg-person="'+esc(p.ad)+'" title="'+esc(p.ad)+'"><span class="gg-avatar">'+(window.karakterSvg?.(p.ad,38)||esc(p.ad.slice(0,1).toLocaleUpperCase('tr')))+'</span><small>'+esc(p.ad)+'</small><i class="'+(isOnline(p.ad)?'online':'')+'" aria-label="'+(isOnline(p.ad)?'Çevrimiçi':'Çevrimdışı')+'"></i></button>').join(''):'<span>Henüz takip ettiğin arkadaş yok.</span>';row.querySelectorAll('button').forEach(b=>b.onclick=async()=>{await window.meduAkisAc?.();window.maProfilAc?.(b.dataset.ggPerson);});}catch{row.innerHTML='<button type="button">Arkadaşlar yüklenemedi · Tekrar dene</button>';row.querySelector('button').onclick=()=>{friendsLoaded=false;loadFriends(host);};}}
 function install(force=false){if(document.hidden&&!force)return;const tab=document.getElementById('tab-aktiviteler');if(!force&&knownGrid&&!tab?.classList.contains('active'))return;const host=document.querySelector('#tab-aktiviteler .dc-focus-card'),grid=host?.querySelector('.az-grid2x2');if(!grid)return;
  if(!grid.querySelector('#papiSapanFirtinasiPremium')){
   const card=document.createElement('button');card.type='button';card.id='papiSapanFirtinasiPremium';card.className='az-gcard';
   card.setAttribute('onclick','papiSapanFirtinasiAc()');card.innerHTML='<div class="az-gcard-title">Papi Sapan Fırtınası</div>';grid.prepend(card);
  }
  if(!grid.querySelector('#papiSapanFirtinasiFree')){
   const card=document.createElement('button');card.type='button';card.id='papiSapanFirtinasiFree';card.className='az-gcard';
   card.setAttribute('onclick','papiSapanFirtinasiAc()');card.innerHTML='<div class="az-gcard-title">Papi Sapan Fırtınası</div>';grid.prepend(card);
  }
  if(!grid.querySelector('#papiDalgaSorfuPremium')){
   const card=document.createElement('button');card.type='button';card.id='papiDalgaSorfuPremium';card.className='az-gcard';
   card.setAttribute('onclick','papiDalgaSorfuAc()');card.innerHTML='<div class="az-gcard-title">Papi Dalga Sörfü</div>';grid.prepend(card);
  }
  if(!grid.querySelector('#papiDalgaSorfuFree')){
   const card=document.createElement('button');card.type='button';card.id='papiDalgaSorfuFree';card.className='az-gcard';
   card.setAttribute('onclick','papiDalgaSorfuAc()');card.innerHTML='<div class="az-gcard-title">Papi Dalga Sörfü</div>';grid.prepend(card);
  }
  if(!grid.querySelector('#premiumWordMatchActivity')){const card=document.createElement('button');card.type='button';card.id='premiumWordMatchActivity';card.className='az-gcard';card.setAttribute('onclick','premiumKelimeEslestirmeAc()');card.innerHTML='<div class="az-gcard-title">Candy Papiş</div>';grid.append(card);}
  if(!grid.querySelector('#premiumCloudFlightActivity')){
   const card=document.createElement('button');card.type='button';card.id='premiumCloudFlightActivity';card.className='az-gcard';
   card.setAttribute('onclick','premiumBulutUcusuAc()');card.innerHTML='<div class="az-gcard-title">Kaptan Pilot Papi</div>';grid.append(card);
  }
  if(!grid.querySelector('#papizzleActivity')){
   const card=document.createElement('button');card.type='button';card.id='papizzleActivity';card.className='az-gcard';
   card.setAttribute('onclick','papizzleAc()');card.innerHTML='<div class="az-gcard-title">Papizzle</div>';grid.append(card);
  }
  if(!grid.querySelector('#sentenceRaceActivity')){const card=document.createElement('button');card.id='sentenceRaceActivity';card.type='button';card.className='az-gcard';card.setAttribute('onclick','window.dmSentenceRace.open()');card.innerHTML='<div class="az-gcard-title">Cümle Yarışı</div>';grid.append(card);}
  if(typeof window.okumaStudyosunuAc==='function'&&!host.querySelector('[onclick*="okumaStudyosunuAc"]')){const b=document.createElement('button');b.type='button';b.className='az-gcard';b.setAttribute('onclick','okumaStudyosunuAc()');b.innerHTML='<div class="az-gcard-title">Okuma Stüdyosu</div>';grid.append(b);}
  if(!host.classList.contains('gg-page')){host.classList.add('gg-page');host.querySelectorAll('.dm-activity-hero,.dm-party-tabs').forEach(e=>e.remove());
   const top=document.createElement('div');top.className='gg-top';top.innerHTML='<div class="gg-brand"><b>DijiMedu</b><span>'+icon('energy')+'<b data-gg-energy>Enerji</b></span><span>'+icon('coin')+'<b data-gg-gold>0</b></span></div><div class="gg-title"><h1>Oyunlar</h1><div class="gg-tabs" role="tablist" aria-label="Oyun kategorisi"><button id="ggPremiumTab" type="button" role="tab" data-gg-party="premium" aria-controls="dmActivityGames" aria-label="Premium Oyunlar"><span>Premium</span></button><button id="ggSoloTab" type="button" role="tab" data-gg-party="solo" aria-controls="dmActivityGames" aria-label="Tek Kişilik Oyunlar"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="15.5" r="7.5" fill="currentColor"/><path d="M9 39v-4a15 15 0 0 1 30 0v4" stroke="currentColor" fill="none" stroke-width="5" stroke-linecap="round"/><circle cx="37" cy="11" r="3" fill="#ffef91"/></svg><span>Tek Kişilik</span></button><button id="ggFreeTab" type="button" role="tab" data-gg-party="free" aria-controls="dmActivityGames" aria-label="Sınıfta Oyna"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 11l27 27M40 11L13 38" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="m6 7 9 2-7 7zm36 0-9 2 7 7z" fill="currentColor"/><path d="m9 31 7 8m16-8-7 8" fill="none" stroke="#ffebb4" stroke-width="3.5" stroke-linecap="round"/></svg><span>Sınıfta Oyna</span></button><button id="ggKonuTab" type="button" role="tab" data-gg-party="konu" aria-controls="kgTopicPanel" aria-label="Konu Oyunları"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 11C17 6 8 7 5 9v27c7-3 14-2 19 2 5-4 12-5 19-2V9c-5-2-13-3-19 2z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M24 11v26M10 17h8m-8 7h7m13-7h8m-8 7h7" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/></svg><span>Konu Oyunları</span></button><button id="ggBreakTab" type="button" role="tab" data-gg-party="break" aria-controls="dmActivityGames" aria-label="Mola Vakti"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M9 19h27v8c0 8-6 13-14 13s-13-5-13-13v-8zM36 22h3a5 5 0 0 1 0 10h-4" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M15 9c-3 4 3 4 0 8m9-8c-3 4 3 4 0 8m9-8c-3 4 3 4 0 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><span>Mola Vakti</span></button></div></div><div class="gg-banner"><img src="oyna-assets/oyna-papi-fly.png" alt="Papi" loading="lazy" decoding="async"><div><h2>Oynayarak öğren!</h2><p>Oyunları keşfet, seviye atladıkça kilitlerini aç.</p></div></div><div class="gg-filters" aria-label="Beceri filtresi">'+['Tümü','Kelime','Dinleme','Cümle'].map(s=>'<button type="button" data-gg-skill="'+s+'">'+s+'</button>').join('')+'</div><div class="gg-social" hidden><b>Arkadaşların</b><div class="gg-friends"></div><button type="button" class="gg-friends-all">'+icon('users')+' Tümü ›</button></div><section class="gg-resume" hidden></section><h2 class="gg-heading">Tek Kişilik Oyunlar</h2><p class="gg-empty" hidden>Bu beceride oyun bulunamadı. Diğer filtreleri deneyebilirsin.</p>';
   grid.before(top);const bottom=document.createElement('div');bottom.className='gg-bottom';bottom.innerHTML='<section class="gg-next" hidden></section>';grid.after(bottom);
   top.querySelectorAll('[data-gg-party]').forEach(b=>b.onclick=()=>changeCategory(host,grid,b.dataset.ggParty));
   top.querySelectorAll('[data-gg-skill]').forEach(b=>b.onclick=()=>{skill=b.dataset.ggSkill;render(host,grid);});top.querySelector('.gg-friends-all').onclick=()=>window.meduAkisAc?.();grid.id='dmActivityGames';grid.setAttribute('role','tabpanel');
   installRedesign(host,grid,top,bottom);grid.removeAttribute('role');party='premium';
   new MutationObserver(()=>{key='';install();}).observe(grid,{childList:true});
  }
  if(lastAccount!==account()){lastAccount=account();friendsLoaded=false;party='premium';skill='Tümü';key='';}
  const nextKey=[!!window.dmTeacherPortalMode,party,skill,level(),!!window.dmProgression?.earlyAccess?.(),window.dmDalgaSorfu?.hasFreeQuota?.()!==false,window.dmSapanFirtinasi?.hasFreeQuota?.()!==false,window.dmSapanFirtinasi?.launchLabel?.()||'',host.querySelectorAll('.az-gcard').length,lastGame(),typeof yo!=='undefined'?yo?.altin:0,typeof genelEnerjiKalan==='number'?genelEnerjiKalan:typeof genelEnerjiKalan==='function'?genelEnerjiKalan():0].join('|');if(knownGrid!==grid||key!==nextKey){knownGrid=grid;key=nextKey;render(host,grid);}
 }
 // Page tabs must never inherit the viewport lock used by a playing overlay.
 document.querySelectorAll('.dc-fullscreen-overlay[id^="tab-"]').forEach(el=>el.classList.remove('dm-solo-fullstage'));
 install();setInterval(install,4000);
 document.addEventListener('dm:state',()=>install());
 document.addEventListener('dm:login',()=>install());
 window.dmGamesUI={
  exhaustedCard,
  refresh:()=>{key='';install(true);},
  enter:()=>{
   party='premium';skill='Tümü';key='';install(true);
   const tab=document.getElementById('tab-aktiviteler');if(tab)tab.scrollTop=0;
  }
 };
 window.dmActivityPresence={refresh,isOnline};
})();


