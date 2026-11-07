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
  if(!force&&Date.now()-lastRefresh<30000&&names.every(p=>stamp.has(p)))return;
  if(Date.now()<retryAt)return;
  fetching=true;try{const d=await m.api('aktifDurum',{isimler:names});if(owner!==who())return;skew=Date.parse(d.serverNow)-Date.now();for(const p of names)stamp.set(p,{online:false});for(const p of d.liste)stamp.set(p.ad,p);lastRefresh=Date.now();failCount=0;paint();}catch(e){/* [Kota 29 Eki 2026] Hatada sayfa değiştikçe tekrar tekrar sorulmaz: artan bekleme (1 → 30 dk). */failCount++;retryAt=Date.now()+Math.min(1800000,60000*2**(failCount-1));}finally{fetching=false;}
 }
 function queue(){clearTimeout(scheduled);scheduled=setTimeout(()=>{attach();refresh();},200);}
 attach();
 const profile=document.getElementById('tab-meduakis');if(profile)new MutationObserver(queue).observe(profile,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastRefresh=0;refresh(true);}});
 setInterval(()=>{if(currentAccount!==who()){currentAccount=who();stamp.clear();lastRefresh=0;failCount=0;retryAt=0;}attach();refresh();},60000);setTimeout(()=>refresh(true),2000);
 window.dmSocialPresence={isOnline,refresh};
 window.dmInviteAc=async function(game){
  if(!['ucus','rota'].includes(game))return;
  const s=m.sheet(m.games[game][0]+' · Arkadaşını seç',window.dmTeacherPortalMode?'Öğretmen oyunu · Enerji harcanmaz. Bir rakip seç; daveti kendi cihazından kabul eder.':window.dmClassroomOnlineOwner?'Seçilen öğrenci: '+window.dmClassroomOnlineOwner+'. Kendi sınıfından bir rakip seç; rakibi kendi cihazından daveti kabul eder. Çevrimiçi oyunların standart enerji kuralı geçerlidir.':'Takip ettiğin bir arkadaşına doğrudan oyun daveti gönder.');
  s.body.innerHTML='<p role="status">'+(window.dmTeacherPortalMode?'Öğrenciler yükleniyor…':'Takip ettiğin kişiler yükleniyor…')+'</p>';
  let stopped=false;s.p._close=()=>{stopped=true;};
  try{
   const d=await m.api('takipDavetListesi');if(stopped)return;skew=Date.parse(d.serverNow)-Date.now();d.liste.forEach(p=>stamp.set(p.ad,p));
   s.body.innerHTML=`<label class="dm-invite-label">Oynama şekli<select class="dm-invite-mode"><option value="live">Aynı anda · ortak geri sayım</option><option value="async">Farklı zamanda · 24 saat içinde</option></select></label><label class="dm-invite-label">Arkadaşını bul<input type="search" class="dm-invite-search" placeholder="İsim ara" autocomplete="off"></label><div class="dm-follow-list"></div><button class="dm-open-matches">Karşılaşmalarımı göster</button>`;
   const list=s.body.querySelector('.dm-follow-list');
   function draw(q=''){
    const rows=d.liste.filter(p=>p.ad.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
    list.innerHTML=rows.length?rows.map(p=>`<div class="dm-invite-person"><div><b>${esc(p.ad)}</b><span class="dm-online-badge" data-online-person="${esc(p.ad)}"></span></div><button data-invite="${esc(p.ad)}">Davet et</button></div>`).join(''):`<p class="dm-empty">${d.liste.length?'Bu isimde takip ettiğin bir kişi yok.':'Henüz kimseyi takip etmiyorsun. Arkadaşlar → Arkadaş ekle bölümünden arkadaşlarını takip edebilirsin.'}</p>`;paint();
    list.querySelectorAll('[data-invite]').forEach(b=>b.onclick=async()=>{list.querySelectorAll('button').forEach(x=>x.disabled=true);try{const r=await m.api('oyunEslesmeOlustur',{alici:b.dataset.invite,oyun:game,mod:s.body.querySelector('.dm-invite-mode').value});s.close();window.yoToast?.('Oyun daveti gönderildi!');window.dmMatchAc(r.id);}catch(e){let error=list.querySelector('.dm-error');if(!error){error=document.createElement('p');error.className='dm-error';error.setAttribute('role','alert');list.prepend(error);}error.textContent=e.message;list.querySelectorAll('button').forEach(x=>x.disabled=false);}});
   }
   draw();s.body.querySelector('input').oninput=e=>draw(e.target.value);s.body.querySelector('.dm-open-matches').onclick=()=>{s.close();window.dmArenaAc();};
  }catch(e){if(stopped)return;s.body.textContent=e.message;}
 };
 const defs=[['papiFeneriAc',27,'Kelime','oyun_fener'],['canavarAvcisiAc',20,'Kelime','oyun_canavar'],['dengesizKuleAc',21,'Kelime','oyun_kule'],
 ['pomodoroAc',2,'Odaklanma','pomodoro'],['kelimeYarismasiAc',0,'Kelime','oyun_kelime'],['hafizaOyunAc',1,'Hafıza','oyun_hafiza'],['okumaStudyosunuAc',2,'Okuma','okuma_hizi'],['boslukOyunAc',3,'Kelime','oyun_bosluk'],['asmacaOyunAc',4,'Kelime','oyun_asmaca'],['jpOyunAc',5,'Kelime','oyun_jeopardy'],['yagmurOyunAc',6,'Kelime','oyun_yagmur'],['kelimebulOyunAc',7,'Kelime','oyun_kelimebul'],['esOyunAc',8,'Kelime','oyun_eslestirme'],['trenOyunAc',9,'Cümle','oyun_tren'],['dikteAc',10,'Dinleme','oyun_dikte'],['cumleAc',11,'Cümle','oyun_cumle'],['harfBahcesiAc',15,'Kelime','oyun_harfbahcesi'],['ralliOyunAc',16,'Kelime','oyun_ralli'],['kelimeGoluAc',18,'Kelime','oyun_kelime']];
 const free={kelimeGoluDuo:[19,'İki kale, dört köşe; doğru anlamı seç ve golünü at. Enerji harcanmaz.','Maçı Başlat'],papiCardsActivity:[12,'Kelime kartlarını dinle ve öğren.','Kartları Aç'],meteorActivity:[13,'Aynı cihazda kelimeleri yakala, rakibini geç.','Oyunu Aç'],wordWheelActivity:[14,'Çarkı çevir, doğru kelimeyi bul.','Çarkı Aç'],sentenceRaceActivity:[17,'İki takım · farklı sorular · 12 tur · süre bonusu.','Yarışı Başlat']};
 const icon=name=>'<svg class="gg-icon" aria-hidden="true"><use href="games-assets/ui-icons.svg#'+name+'"></use></svg>';
 let party='solo',skill='Tümü',query='',lastAccount='',friendsLoaded=false,knownGrid=null,key='';
 const categories={solo:'Tek Kişilik',duo:'Online',free:'Sınıfta Oyna',konu:'Konu',break:'Mola',premium:'Premium'};
 const listOrder=['game-jpOyunAc()','game-kelimeYarismasiAc()','kelimeGoluSolo','mola-kosu','premiumWordBlocksActivity','papizzleActivity'];
 const searchKey=value=>String(value||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('ı','i').trim();
 const listRank=id=>{const i=listOrder.indexOf(id);return i<0?listOrder.length:i;};
 const categoryIcons={solo:0,duo:1,free:2,konu:3,break:4,premium:5};
 const gameCovers={
  sentenceRaceActivity:'games-assets/cumle-yarisi-cover.svg',
  kelimeGoluSolo:'games-assets/kelime-golu-stadium-v1.webp',
  kelimeGoluDuo:'games-assets/kelime-golu-stadium-v1.webp',
  dmRotaKart:'games-assets/cumle-rotasi-cover.svg'
 };
 function changeCategory(host,grid,category,topicCategory){
  party=category;skill='Tümü';render(host,grid,topicCategory);
  host.closest('#tab-aktiviteler').scrollTop=0;
  host.querySelector('[data-gg-party="'+(category==='tools'?'all':category)+'"]')?.focus({preventScroll:true});
  if(!window.dmTeacherPortalMode&&(category==='duo'||category==='free'))loadFriends(host);
 }
 function coverArt(card,compact=false){
  const art=document.createElement('span');art.className='gg-cover';art.setAttribute('aria-hidden','true');
  const cover=gameCovers[card.id];
  if(card.id==='dmUcusteKart'){
   art.classList.add('gg-flight-cover');
   const bird=document.createElement('span');bird.className='gg-flight-papi';art.append(bird);
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
  const term=searchKey(query);
  const cards=all.filter(card=>{
   const {ggCategory:category,ggTitle:title,ggGameSkill:gameSkill}=card.dataset;
   return categories[category]&&(!window.dmTeacherPortalMode||!['duo','break'].includes(category))&&(party==='all'||party===category)&&
    (party!=='solo'||skill==='Tümü'||gameSkill===skill||skill==='Kelime'&&gameSkill==='Hafıza')&&
    searchKey(title+' '+categories[category]).includes(term);
  });
  cards.sort((a,b)=>(party==='all'?listRank(a.dataset.ggId)-listRank(b.dataset.ggId):0)||Number(a.style.order)-Number(b.style.order));
  const signature=[account(),!!window.dmTeacherPortalMode,party,skill,term,...cards.map(card=>card.dataset.ggId+':'+allowed(card.dataset.ggGate))].join('|');
  if(list.dataset.signature===signature)return;
  list.dataset.signature=signature;
  const focused=document.activeElement?.closest('.gg-shelf-card')?.dataset.ggSource;
  list.replaceChildren(...cards.map(card=>{
   const {ggId:id,ggTitle:title,ggCategory:category,ggGate:gate}=card.dataset;
   const open=allowed(gate);
   const row=document.createElement('button');row.type='button';row.className='gg-shelf-card gg-list-row';
   row.dataset.ggSource=id;row.setAttribute('aria-disabled',String(!open));
   const subtitle=open?categories[category]:categories[category]+' · '+(window.DijiProgressionCatalog?.gates[gate]||30)+'. seviyede açılır';
   row.innerHTML='<span class="gg-row-copy"><strong>'+esc(title)+'</strong><small>'+esc(subtitle)+'</small></span>'+
    '<span class="gg-row-action" aria-hidden="true">'+(open?'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5a1 1 0 0 1 1.5-.86l11 7a1 1 0 0 1 0 1.72l-11 7A1 1 0 0 1 8 19z"/></svg>':icon('lock'))+'</span>';
   row.prepend(coverArt(card,true));row.onclick=()=>card.click();
   return row;
  }));
  if(!cards.length){
   const empty=document.createElement('p');empty.className='gg-list-empty';empty.setAttribute('role','status');
   empty.textContent='Bu filtrede oyun bulunamadı.';list.append(empty);
  }
  if(focused)[...list.children].find(row=>row.dataset.ggSource===focused)?.focus({preventScroll:true});
 }
 function installRedesign(host,grid,top,bottom){
  host.classList.add('gg-redesign','gg-list-view');
  const filters=top.querySelector('.gg-tabs');
  filters.setAttribute('role','group');
  filters.querySelectorAll('button').forEach(button=>{button.removeAttribute('role');button.removeAttribute('aria-controls');});
  filters.insertAdjacentHTML('afterbegin','<button type="button" data-gg-party="all">Tüm oyunlar</button>');
  filters.insertAdjacentHTML('beforebegin','<label class="gg-search"><svg class="gg-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15.5 15.5 4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" placeholder="Oyun ara" aria-label="Oyun ara" autocomplete="off"></label>');
  filters.parentElement.querySelector('input').oninput=e=>{query=e.target.value;render(host,grid);};
  filters.querySelectorAll('[data-gg-party]:not([data-gg-party=all])').forEach(button=>{
   button.querySelector('svg')?.remove();
   button.insertAdjacentHTML('afterbegin','<svg class="gg-category-art" aria-hidden="true"><use href="games-assets/category-icons.svg#'+button.dataset.ggParty+'"></use></svg>');
  });
  top.insertAdjacentHTML('beforeend','<div class="gg-overview"></div>');
  bottom.insertAdjacentHTML('afterend','<div class="gg-shortcuts"><button type="button">Çalışma Araçları ›</button></div>');
  host.querySelector('.gg-shortcuts button').onclick=()=>changeCategory(host,grid,party==='tools'?'all':'tools');
  filters.querySelector('[data-gg-party="all"]').onclick=()=>changeCategory(host,grid,'all');
 }
 const account=()=>String(who()||'guest');
 const level=()=>window.dmProgression?.level?.()||1;
 const allowed=code=>!code||!window.dmProgression||window.dmProgression.allowed(code);
 const img=(i,cls='')=>i===27?'<span class="gg-art sa-hub-fener" aria-hidden="true"></span>':i===26?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/papizzle-cover.webp" alt="" loading="lazy" decoding="async"></span>':i===24?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/kelime-bloklari/kapak.webp" alt="" loading="lazy" decoding="async"></span>':i===23?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/bulut-ucusu/kapak.webp" alt="" loading="lazy" decoding="async"></span>':i===22?'<span class="gg-art gg-premium-art" aria-hidden="true"><img src="premium-assets/kelime-eslestirme/card-cover.webp" alt="" loading="lazy" decoding="async"></span>':i===20?'<span class="gg-art sa-hub-monster"><span class="sa-monster sa-monster-0"></span></span>':i===21?'<span class="gg-art sa-hub-tower"><img src="arcade-assets/floor.webp" alt=""></span>':[18,19].includes(i)?'<span class="gg-art kg-hub-art '+cls+'" aria-hidden="true"></span>':i===17?'<span class="gg-art dm-sr-hub-art '+cls+'" aria-hidden="true"></span>':i===16?'<span class="gg-art rr-hub-art '+cls+'" aria-hidden="true"><img src="rally-assets/car.webp" alt=""></span>':'<span class="gg-art '+cls+'" style="--gx:'+(i%4)*100/3+'%;--gy:'+Math.floor(i/4)*100/3+'%" aria-hidden="true"></span>';
 function game(b){const rule=defs.find(d=>(b.getAttribute('onclick')||'').includes(d[0]))||defs.find(d=>b.id===d[0]||b.id==='yoDikteKart'&&d[0]==='dikteAc');return rule||[null,8,'Kelime',b.dataset.dmLevelLock||window.DijiProgressionCatalog?.functions[(b.getAttribute('onclick')||'').match(/([A-Za-z_$][\w$]*)\s*\(/)?.[1]]||''];}
 function lastGame(){try{return localStorage.getItem('dm_last_game:'+account())||'';}catch{return '';}}
 function remember(b){try{localStorage.setItem('dm_last_game:'+account(),b.dataset.ggId);}catch{}}
 function prepare(b,i){if(b.dataset.ggReady)return;b.dataset.ggReady='1';b.dataset.ggId=b.id||'game-'+(b.getAttribute('onclick')||i);const d=game(b),f=free[b.id];b.dataset.ggGameSkill=d[2];b.dataset.ggGate=d[3];b.dataset.ggCategory=f?'free':b.classList.contains('dm-live-card')||['dmUcusteKart','dmRotaKart'].includes(b.id)?'duo':'solo';if(b.dataset.ggCategory==='duo')b.dataset.ggGate='iki_kisilik';b.dataset.ggIndex=f?f[0]:d[1];b.style.order=String(f?f[0]:defs.includes(d)?d[1]:50);if(['premiumWordMatchActivity','premiumCloudFlightActivity','premiumWordBlocksActivity','papizzleActivity'].includes(b.id)){b.dataset.ggCategory='premium';b.dataset.ggGate='';b.dataset.ggIndex=b.id==='papizzleActivity'?'26':b.id==='premiumWordBlocksActivity'?'24':b.id==='premiumCloudFlightActivity'?'23':'22';}
  b.classList.add('gg-game');b.classList.remove('dm-toy-card','dm-showcase-card');
  const title=b.querySelector('.az-gcard-title')?.textContent.trim()||b.textContent.trim();b.dataset.ggTitle=title;
  const tool=d[0]==='pomodoroAc'||d[0]==='okumaStudyosunuAc';if(tool)b.dataset.ggCategory='tools';
  const description=b.dataset.ggCategory==='premium'?(window.dmTeacherPortalMode?'Word Bank • Paketindeki oyun hakları geçerli':'Word Bank • Premium oyun'):tool?(d[0]==='pomodoroAc'?'Odaklanma ve mola zamanlayıcısı':'Okuma ve anlama çalışmaları'):f?f[1]:d[2]+' • 12 soru';
  const thumb=[['harfBahcesiAc',0],['trenOyunAc',1],['yagmurOyunAc',2],['kelimebulOyunAc',3]].find(([fn])=>(b.getAttribute('onclick')||'').includes(fn));if(thumb){b.style.setProperty('--au-thumb',thumb[1]);b.style.setProperty('--au-thumb-x',(thumb[1]%2*100)+'%');b.style.setProperty('--au-thumb-y',(Math.floor(thumb[1]/2)*100)+'%');}
  const toolArt=tool?'<span class="gg-art gg-tool-art" aria-hidden="true">'+(d[0]==='pomodoroAc'?'<svg viewBox="0 0 64 64"><rect x="24" y="3" width="16" height="8" rx="4" fill="#9662d7"/><circle cx="32" cy="36" r="25" fill="#dcf8ee" stroke="#8b62cf" stroke-width="5"/><path d="M32 20v17l11 7" fill="none" stroke="#8b62cf" stroke-width="5" stroke-linecap="round"/></svg>':'<i class="au-art au-passport-icons" style="--au-x:0%;--au-y:0%"></i>')+'</span>':img(+b.dataset.ggIndex);
  b.innerHTML=toolArt+'<span class="gg-copy"><strong class="az-gcard-title">'+esc(title)+'</strong><small>'+esc(description)+'</small><span class="gg-play">'+(f?f[2]:tool?(d[0]==='pomodoroAc'?'Başlat':'Aç'):b.dataset.ggCategory==='duo'?'Davet Et':'Oyna')+' ›</span></span>';
  b.addEventListener('click',()=>{if(b.dataset.ggCategory==='solo'&&allowed(b.dataset.ggGate))window.dmSoloStageRequested=Date.now();},true);
  b.addEventListener('click',e=>{if(!allowed(b.dataset.ggGate)){e.preventDefault();e.stopImmediatePropagation();window.dmProgression?.require(b.dataset.ggGate);return;}if(b.dataset.ggCategory!=='tools')remember(b);},true);
  if(['dmUcusteKart','dmRotaKart'].includes(b.id))b.onclick=()=>window.dmInviteAc(b.id==='dmUcusteKart'?'ucus':'rota');
 }
 function render(host,grid,topicCategory){
  const routeCard=b=>/yolculuguAc|baModuAc|baFabTikla|buyuAkademisiYeniAc/.test(b.getAttribute('onclick')||'');
  grid.querySelectorAll('.az-gcard').forEach(b=>{if(routeCard(b)){b.hidden=true;b.style.setProperty('display','none','important');}});
  const all=[...grid.querySelectorAll('.az-gcard'),...host.querySelectorAll('.gg-tools .az-gcard')].filter(b=>!routeCard(b));all.forEach(prepare);
  let tools=host.querySelector('.gg-tools');if(!tools){tools=document.createElement('section');tools.className='gg-tools';tools.setAttribute('aria-labelledby','ggToolsTitle');tools.innerHTML='<h2 id="ggToolsTitle">Çalışma Araçları</h2><p>Odaklanmak ve okuma becerini geliştirmek için yardımcı araçlar.</p><div class="gg-tools-grid"></div>';grid.after(tools);}all.filter(b=>b.dataset.ggCategory==='tools').forEach(b=>{if(b.parentElement!==tools.querySelector('.gg-tools-grid'))tools.querySelector('.gg-tools-grid').append(b);});const redesigned=host.classList.contains('gg-redesign');tools.hidden=party!==(redesigned?'tools':'solo');
  const teacher=!!window.dmTeacherPortalMode;
  host.classList.toggle('gg-teacher-list',teacher);
  host.querySelectorAll('#ggOnlineTab,#ggBreakTab').forEach(button=>{
   if(button.hidden!==teacher)button.hidden=teacher;
   if(teacher)button.style.setProperty('display','none','important');
   else button.style.removeProperty('display');
  });
  if(teacher&&['duo','break'].includes(party))party='solo';delete host.dataset.dmParty;host.dataset.ggParty=party;const active=party;
  host.querySelectorAll('[data-gg-party]').forEach(b=>{const on=b.dataset.ggParty===active;b.setAttribute(redesigned?'aria-pressed':'aria-selected',String(on));b.tabIndex=redesigned||on?0:-1;});
  host.querySelectorAll('.gg-filters [data-gg-skill]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ggSkill===skill)));
  host.querySelector('.gg-banner')?.remove();
  host.classList.add('au-games');host.querySelectorAll('[data-gg-party]').forEach(b=>{const index=categoryIcons[b.dataset.ggParty];if(index===undefined)return;if(!b.querySelector('.au-game-icon,.gg-category-art')){b.querySelector('svg')?.remove();const art=document.createElement('i');art.className='au-game-icon';art.setAttribute('aria-hidden','true');if(index===5){art.classList.add('gg-premium-icon');}else art.style.backgroundPosition=(index*25)+'% 50%';b.prepend(art);}const label=b.querySelector('span');if(label)label.textContent=categories[b.dataset.ggParty];});
  host.querySelector('.gg-filters').hidden=party!=='solo';host.querySelector('.gg-social').hidden=!!window.dmTeacherPortalMode||party==='solo'||party==='break'||party==='konu'||party==='premium';host.querySelector('.gg-heading').textContent=party==='premium'?'👑 Premium Oyunlar':party==='konu'?'Konu Başlıkları':party==='break'?'Mola Oyunları':party==='solo'?'Tüm Oyunlar':party==='free'?'Sınıfta Oyna':'İki Kişilik Oyunlar';
  if(!redesigned)grid.setAttribute('aria-labelledby',party==='premium'?'ggPremiumTab':party==='break'?'ggBreakTab':party==='solo'?'ggSoloTab':party==='duo'?'ggOnlineTab':'ggFreeTab');
  let count=0;all.forEach(b=>{const tool=b.dataset.ggCategory==='tools',open=allowed(b.dataset.ggGate),show=(tool&&party===(redesigned?'tools':'solo'))||b.dataset.ggCategory===party&&(party!=='solo'||(skill==='Tümü'||b.dataset.ggGameSkill===skill||skill==='Kelime'&&b.dataset.ggGameSkill==='Hafıza'));b.classList.toggle('gg-locked',!open);b.setAttribute('aria-disabled',String(!open));const play=b.querySelector('.gg-play');if(play)play.textContent=!open?(window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||30)+'. seviyede açılır':free[b.id]?free[b.id][2]+' ›':tool?(b.dataset.ggIndex==='2'&&/pomodoroAc/.test(b.getAttribute('onclick')||'')?'Başlat ›':'Aç ›'):b.dataset.ggCategory==='duo'?'Davet Et ›':'Oyna ›';b.hidden=!show;b.style.setProperty('display',show?'grid':'none','important');if(redesigned&&!tool){
    const originalOrder=b.dataset.ggOrder??=b.style.order||'50';
    b.style.order=String(Number(originalOrder)+(open?0:100));
   }
   if(show&&!tool)count++;});
  host.querySelector('.gg-empty').hidden=party==='konu'||count!==0;
  grid.hidden=party==='konu';const topicHub=host.querySelector('.kg-hub');if(topicHub)topicHub.hidden=party!=='konu';if(party==='konu')window.dmTopicGames?.mount(host,topicCategory);
  const locked=all.filter(b=>b.dataset.ggCategory==='solo'&&!allowed(b.dataset.ggGate)).sort((a,b)=>(window.DijiProgressionCatalog?.gates[a.dataset.ggGate]||40)-(window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||40));
  const next=host.querySelector('.gg-next');next.hidden=redesigned||party!=='solo'||!locked.length;
  if(!next.hidden){const b=locked[0],need=window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||40;next.innerHTML='<h3>Sıradaki Oyun</h3><div>'+img(+b.dataset.ggIndex)+'<span><b>'+esc(b.dataset.ggTitle)+'</b><small>'+icon('lock')+need+'. seviyede açılır</small></span><label>Seviye '+level()+' → '+need+'<progress value="'+Math.min(level(),need)+'" max="'+need+'"></progress></label></div>';}
  const last=all.find(b=>b.dataset.ggId===lastGame()&&b.dataset.ggCategory==='solo'&&allowed(b.dataset.ggGate)),resume=host.querySelector('.gg-resume');resume.hidden=redesigned||party!=='solo'||!last;
  if(last){resume.innerHTML='<small>Son oynadığın oyun</small><div>'+img(+last.dataset.ggIndex)+'<b>'+esc(last.dataset.ggTitle)+'</b><button type="button">Tekrar Oyna ›</button></div>';resume.querySelector('button').onclick=()=>last.click();}
  if(redesigned){
   const showTools=party==='tools',showTopics=party==='konu';
   host.querySelector('.gg-overview').hidden=showTools||showTopics;
   host.querySelector('.gg-heading').hidden=true;
   host.querySelector('.gg-empty').hidden=true;
   host.querySelector('.gg-shortcuts button').textContent=showTools?'Tüm Oyunlara Dön ›':'Çalışma Araçları ›';
   const social=!window.dmTeacherPortalMode&&(party==='duo'||party==='free');
   host.querySelector('.gg-social').hidden=!social;
   host.querySelector('.gg-matches').hidden=!social;
   host.querySelector('[data-gg-duo]').hidden=party==='duo';
   grid.hidden=true;
   host.querySelector('.gg-search').hidden=showTools||showTopics;
   if(!showTools&&!showTopics)renderList(host,all);
  }
  const xp=typeof yo!=='undefined'?yo:null;host.querySelector('[data-gg-gold]').textContent=xp?.altin||0;host.querySelector('[data-gg-energy]').textContent=(typeof genelEnerjiKalan==='number'?genelEnerjiKalan:typeof genelEnerjiKalan==='function'?genelEnerjiKalan():'–')+'/'+(typeof genelEnerjiMax==='number'?genelEnerjiMax:typeof genelEnerjiMax==='function'?genelEnerjiMax():30);
 }
 async function loadFriends(host){if(friendsLoaded)return;if(!allowed('takip')){host.querySelector('.gg-friends').textContent='Arkadaşlar '+(window.DijiProgressionCatalog?.gates.takip||15)+'. seviyede açılır.';return;}if(!logged()){host.querySelector('.gg-friends').textContent='Arkadaşlarını görmek için giriş yap.';return;}friendsLoaded=true;const row=host.querySelector('.gg-friends');row.innerHTML='<span role="status">Arkadaşların yükleniyor…</span>';const owner=account();try{const d=await m.api('takipDavetListesi');if(account()!==owner)return;skew=Date.parse(d.serverNow)-Date.now();d.liste.forEach(p=>stamp.set(p.ad,p));row.innerHTML=d.liste.length?d.liste.slice(0,5).map(p=>'<button type="button" data-gg-person="'+esc(p.ad)+'" title="'+esc(p.ad)+'"><span class="gg-avatar">'+(window.karakterSvg?.(p.ad,38)||esc(p.ad.slice(0,1).toLocaleUpperCase('tr')))+'</span><small>'+esc(p.ad)+'</small><i class="'+(isOnline(p.ad)?'online':'')+'" aria-label="'+(isOnline(p.ad)?'Çevrimiçi':'Çevrimdışı')+'"></i></button>').join(''):'<span>Henüz takip ettiğin arkadaş yok.</span>';row.querySelectorAll('button').forEach(b=>b.onclick=async()=>{await window.meduAkisAc?.();window.maProfilAc?.(b.dataset.ggPerson);});}catch{row.innerHTML='<button type="button">Arkadaşlar yüklenemedi · Tekrar dene</button>';row.querySelector('button').onclick=()=>{friendsLoaded=false;loadFriends(host);};}}
 function install(force=false){if(document.hidden&&!force)return;const tab=document.getElementById('tab-aktiviteler');if(!force&&knownGrid&&!tab?.classList.contains('active'))return;const host=document.querySelector('#tab-aktiviteler .dc-focus-card'),grid=host?.querySelector('.az-grid2x2');if(!grid)return;
  if(!grid.querySelector('#premiumWordMatchActivity')){const card=document.createElement('button');card.type='button';card.id='premiumWordMatchActivity';card.className='az-gcard';card.setAttribute('onclick','premiumKelimeEslestirmeAc()');card.innerHTML='<div class="az-gcard-title">Candy Papiş</div>';grid.append(card);}
  if(!grid.querySelector('#premiumCloudFlightActivity')){
   const card=document.createElement('button');card.type='button';card.id='premiumCloudFlightActivity';card.className='az-gcard';
   card.setAttribute('onclick','premiumBulutUcusuAc()');card.innerHTML='<div class="az-gcard-title">Kaptan Pilot Papi</div>';grid.append(card);
  }
  if(!grid.querySelector('#premiumWordBlocksActivity')){
   const card=document.createElement('button');card.type='button';card.id='premiumWordBlocksActivity';card.className='az-gcard';
   card.setAttribute('onclick','premiumKelimeBloklariAc()');card.innerHTML='<div class="az-gcard-title">Block Papi</div>';grid.append(card);
  }
  if(!grid.querySelector('#papizzleActivity')){
   const card=document.createElement('button');card.type='button';card.id='papizzleActivity';card.className='az-gcard';
   card.setAttribute('onclick','papizzleAc()');card.innerHTML='<div class="az-gcard-title">Papizzle</div>';grid.append(card);
  }
  if(!grid.querySelector('#sentenceRaceActivity')){const card=document.createElement('button');card.id='sentenceRaceActivity';card.type='button';card.className='az-gcard';card.setAttribute('onclick','window.dmSentenceRace.open()');card.innerHTML='<div class="az-gcard-title">Cümle Yarışı</div>';grid.append(card);}
  if(typeof window.okumaStudyosunuAc==='function'&&!host.querySelector('[onclick*="okumaStudyosunuAc"]')){const b=document.createElement('button');b.type='button';b.className='az-gcard';b.setAttribute('onclick','okumaStudyosunuAc()');b.innerHTML='<div class="az-gcard-title">Okuma Stüdyosu</div>';grid.append(b);}
  if(!host.classList.contains('gg-page')){host.classList.add('gg-page');host.querySelectorAll('.dm-activity-hero,.dm-party-tabs').forEach(e=>e.remove());
   const top=document.createElement('div');top.className='gg-top';top.innerHTML='<div class="gg-brand"><b>DijiMedu</b><span>'+icon('energy')+'<b data-gg-energy>Enerji</b></span><span>'+icon('coin')+'<b data-gg-gold>0</b></span></div><div class="gg-title"><h1>Oyunlar</h1><div class="gg-tabs" role="tablist" aria-label="Oyun kategorisi"><button id="ggSoloTab" type="button" role="tab" data-gg-party="solo" aria-controls="dmActivityGames" aria-label="Tek Kişilik Oyunlar"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="15.5" r="7.5" fill="currentColor"/><path d="M9 39v-4a15 15 0 0 1 30 0v4" stroke="currentColor" fill="none" stroke-width="5" stroke-linecap="round"/><circle cx="37" cy="11" r="3" fill="#ffef91"/></svg><span>Tek Kişilik</span></button><button id="ggOnlineTab" type="button" role="tab" data-gg-party="duo" aria-controls="dmActivityGames" aria-label="Online Çift Kişilik Oyunlar"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="17" r="6.5" fill="currentColor"/><circle cx="32" cy="19" r="5.5" fill="currentColor" opacity=".8"/><path d="M5 38v-3c0-7 6-12 13-12s13 5 13 12v3z" fill="currentColor"/><path d="M30 27c6 0 11 4 11 10v1H30" fill="currentColor" opacity=".75"/><path d="M34 10l3-4 3 4" fill="none" stroke="#ffeb9b" stroke-width="3" stroke-linecap="round"/></svg><span>Online Çift Kişilik</span></button><button id="ggFreeTab" type="button" role="tab" data-gg-party="free" aria-controls="dmActivityGames" aria-label="Sınıfta Oyna"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 11l27 27M40 11L13 38" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="m6 7 9 2-7 7zm36 0-9 2 7 7z" fill="currentColor"/><path d="m9 31 7 8m16-8-7 8" fill="none" stroke="#ffebb4" stroke-width="3.5" stroke-linecap="round"/></svg><span>Sınıfta Oyna</span></button><button id="ggKonuTab" type="button" role="tab" data-gg-party="konu" aria-controls="kgTopicPanel" aria-label="Konu Oyunları"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 11C17 6 8 7 5 9v27c7-3 14-2 19 2 5-4 12-5 19-2V9c-5-2-13-3-19 2z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M24 11v26M10 17h8m-8 7h7m13-7h8m-8 7h7" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/></svg><span>Konu Oyunları</span></button><button id="ggBreakTab" type="button" role="tab" data-gg-party="break" aria-controls="dmActivityGames" aria-label="Mola Vakti"><svg class="gg-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M9 19h27v8c0 8-6 13-14 13s-13-5-13-13v-8zM36 22h3a5 5 0 0 1 0 10h-4" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M15 9c-3 4 3 4 0 8m9-8c-3 4 3 4 0 8m9-8c-3 4 3 4 0 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><span>Mola Vakti</span></button><button id="ggPremiumTab" type="button" role="tab" data-gg-party="premium" aria-controls="dmActivityGames" aria-label="Premium Oyunlar"><span>Premium</span></button></div></div><div class="gg-banner"><img src="oyna-assets/oyna-papi-fly.png" alt="Papi" loading="lazy" decoding="async"><div><h2>Oynayarak öğren!</h2><p>Oyunları keşfet, seviye atladıkça kilitlerini aç.</p></div></div><div class="gg-filters" aria-label="Beceri filtresi">'+['Tümü','Kelime','Dinleme','Cümle'].map(s=>'<button type="button" data-gg-skill="'+s+'">'+s+'</button>').join('')+'</div><div class="gg-social" hidden><b>Arkadaşların</b><div class="gg-friends"></div><button type="button" class="gg-friends-all">'+icon('users')+' Tümü ›</button></div><section class="gg-resume" hidden></section><h2 class="gg-heading">Tüm Oyunlar</h2><p class="gg-empty" hidden>Bu beceride oyun bulunamadı. Diğer filtreleri deneyebilirsin.</p>';
   grid.before(top);const bottom=document.createElement('div');bottom.className='gg-bottom';bottom.innerHTML='<section class="gg-next" hidden></section><div class="gg-matches" hidden><h3>Karşılaşmalarım</h3><div><span>'+icon('users')+' Davetlerini ve sonuçlarını gör</span><button type="button" data-gg-matches>Gör ›</button></div><button type="button" data-gg-duo>Çevrimiçi iki kişilik oyunlar ›</button></div>';grid.after(bottom);
   top.querySelectorAll('[data-gg-party]').forEach(b=>b.onclick=()=>changeCategory(host,grid,b.dataset.ggParty));
   top.querySelectorAll('[data-gg-skill]').forEach(b=>b.onclick=()=>{skill=b.dataset.ggSkill;render(host,grid);});top.querySelector('.gg-friends-all').onclick=()=>window.meduAkisAc?.();bottom.querySelector('[data-gg-matches]').onclick=()=>window.dmArenaAc?.();bottom.querySelector('[data-gg-duo]').onclick=()=>{top.querySelector('[data-gg-party=duo]')?.click();};grid.id='dmActivityGames';grid.setAttribute('role','tabpanel');
   installRedesign(host,grid,top,bottom);grid.removeAttribute('role');party='all';
   new MutationObserver(()=>{key='';install();}).observe(grid,{childList:true});
  }
  if(lastAccount!==account()){lastAccount=account();friendsLoaded=false;party='all';skill='Tümü';query='';const search=host.querySelector('.gg-search input');if(search)search.value='';key='';}
  const nextKey=[!!window.dmTeacherPortalMode,party,skill,level(),host.querySelectorAll('.az-gcard').length,lastGame(),typeof yo!=='undefined'?yo?.altin:0,typeof genelEnerjiKalan==='number'?genelEnerjiKalan:typeof genelEnerjiKalan==='function'?genelEnerjiKalan():0].join('|');if(knownGrid!==grid||key!==nextKey){knownGrid=grid;key=nextKey;render(host,grid);}
 }
 // Page tabs must never inherit the viewport lock used by a playing overlay.
 document.querySelectorAll('.dc-fullscreen-overlay[id^="tab-"]').forEach(el=>el.classList.remove('dm-solo-fullstage'));
 install();setInterval(install,1500);
 window.dmGamesUI={
  refresh:()=>{key='';install(true);},
  enter:()=>{
   query='';const search=document.querySelector('#tab-aktiviteler .gg-search input');if(search)search.value='';
   party='all';skill='Tümü';key='';install(true);
   const tab=document.getElementById('tab-aktiviteler');if(tab)tab.scrollTop=0;
  }
 };
 window.dmActivityPresence={refresh,isOnline};
})();

