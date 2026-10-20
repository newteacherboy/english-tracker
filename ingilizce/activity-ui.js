(function(){
 'use strict';
 const m=window.dmMeduPro;if(!m)return;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const who=()=>typeof aktifOgrenciAdi!=='undefined'?aktifOgrenciAdi:'';
 const logged=()=>who()&&who().toLowerCase()!=='teacher'&&(!!localStorage.getItem('ing_token')||window.dmPreviewFixtures===true);
 const stamp=new Map();let skew=0,currentAccount='',fetching=false,lastRefresh=0,scheduled;
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
  fetching=true;try{const d=await m.api('aktifDurum',{isimler:names});if(owner!==who())return;skew=Date.parse(d.serverNow)-Date.now();for(const p of names)stamp.set(p,{online:false});for(const p of d.liste)stamp.set(p.ad,p);lastRefresh=Date.now();paint();}catch(e){}finally{fetching=false;}
 }
 function queue(){clearTimeout(scheduled);scheduled=setTimeout(()=>{attach();refresh();},200);}
 attach();
 const profile=document.getElementById('tab-meduakis');if(profile)new MutationObserver(queue).observe(profile,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastRefresh=0;refresh(true);}});
 setInterval(()=>{if(currentAccount!==who()){currentAccount=who();stamp.clear();lastRefresh=0;}attach();refresh();},60000);setTimeout(()=>refresh(true),2000);
 window.dmSocialPresence={isOnline,refresh};
 window.dmInviteAc=async function(game){
  if(!['ucus','rota'].includes(game))return;
  const s=m.sheet(m.games[game][0]+' · Arkadaşını seç',window.dmClassroomOnlineOwner?'Seçilen öğrenci: '+window.dmClassroomOnlineOwner+'. Kendi sınıfından bir rakip seç; rakibi kendi cihazından daveti kabul eder. Çevrimiçi oyunların standart enerji kuralı geçerlidir.':'Takip ettiğin bir arkadaşına doğrudan oyun daveti gönder.');
  s.body.innerHTML='<p role="status">Takip ettiğin kişiler yükleniyor…</p>';
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
 const defs=[
 ['pomodoroAc',2,'Odaklanma','pomodoro'],['kelimeYarismasiAc',0,'Kelime','oyun_kelime'],['hafizaOyunAc',1,'Hafıza','oyun_hafiza'],['okumaStudyosunuAc',2,'Okuma','okuma_hizi'],['boslukOyunAc',3,'Kelime','oyun_bosluk'],['asmacaOyunAc',4,'Kelime','oyun_asmaca'],['jpOyunAc',5,'Kelime','oyun_jeopardy'],['yagmurOyunAc',6,'Kelime','oyun_yagmur'],['kelimebulOyunAc',7,'Kelime','oyun_kelimebul'],['esOyunAc',8,'Kelime','oyun_eslestirme'],['trenOyunAc',9,'Cümle','oyun_tren'],['dikteAc',10,'Dinleme','oyun_dikte'],['cumleAc',11,'Cümle','oyun_cumle'],['harfBahcesiAc',15,'Kelime','oyun_harfbahcesi'],['ralliOyunAc',16,'Kelime','oyun_ralli']];
 const free={papiCardsActivity:[12,'Kelime kartlarını dinle ve öğren.','Kartları Aç'],meteorActivity:[13,'Aynı cihazda kelimeleri yakala, rakibini geç.','Oyunu Aç'],wordWheelActivity:[14,'Çarkı çevir, doğru kelimeyi bul.','Çarkı Aç']};
 const icon=name=>'<svg class="gg-icon" aria-hidden="true"><use href="games-assets/ui-icons.svg#'+name+'"></use></svg>';
 let party='solo',skill='Tümü',lastAccount='',friendsLoaded=false,knownGrid=null,key='';
 const account=()=>String(who()||'guest');
 const level=()=>window.dmProgression?.level?.()||1;
 const allowed=code=>!code||!window.dmProgression||window.dmProgression.allowed(code);
 const img=(i,cls='')=>i===16?'<span class="gg-art rr-hub-art '+cls+'" aria-hidden="true"><img src="rally-assets/car.webp" alt=""></span>':'<span class="gg-art '+cls+'" style="--gx:'+(i%4)*100/3+'%;--gy:'+Math.floor(i/4)*100/3+'%" aria-hidden="true"></span>';
 function game(b){const rule=defs.find(d=>(b.getAttribute('onclick')||'').includes(d[0]))||defs.find(d=>b.id===d[0]||b.id==='yoDikteKart'&&d[0]==='dikteAc');return rule||[null,8,'Kelime',b.dataset.dmLevelLock||window.DijiProgressionCatalog?.functions[(b.getAttribute('onclick')||'').match(/([A-Za-z_$][\w$]*)\s*\(/)?.[1]]||''];}
 function lastGame(){try{return localStorage.getItem('dm_last_game:'+account())||'';}catch{return '';}}
 function remember(b){try{localStorage.setItem('dm_last_game:'+account(),b.dataset.ggId);}catch{}}
 function prepare(b,i){if(b.dataset.ggReady)return;b.dataset.ggReady='1';b.dataset.ggId=b.id||'game-'+(b.getAttribute('onclick')||i);const d=game(b),f=free[b.id];b.dataset.ggGameSkill=d[2];b.dataset.ggGate=d[3];b.dataset.ggCategory=f?'free':b.classList.contains('dm-live-card')||['dmUcusteKart','dmRotaKart'].includes(b.id)?'duo':'solo';if(b.dataset.ggCategory==='duo')b.dataset.ggGate='iki_kisilik';b.dataset.ggIndex=f?f[0]:d[1];b.style.order=String(f?f[0]:defs.includes(d)?d[1]:50);
  b.classList.add('gg-game');b.classList.remove('dm-toy-card','dm-showcase-card');
  const title=b.querySelector('.az-gcard-title')?.textContent.trim()||b.textContent.trim();b.dataset.ggTitle=title;
  const description=f?f[1]:d[2]+(d[0]==='okumaStudyosunuAc'?' • Okuma çalışması':' • 12 soru');
  b.innerHTML=img(+b.dataset.ggIndex)+'<span class="gg-copy"><strong class="az-gcard-title">'+esc(title)+'</strong><small>'+esc(description)+'</small><span class="gg-play">'+(f?f[2]:b.dataset.ggCategory==='duo'?'Davet Et':'Oyna')+' ›</span></span>';
  b.addEventListener('click',()=>{if(b.dataset.ggCategory==='solo'&&allowed(b.dataset.ggGate))window.dmSoloStageRequested=Date.now();},true);
  b.addEventListener('click',e=>{if(!allowed(b.dataset.ggGate)){e.preventDefault();e.stopImmediatePropagation();window.dmProgression?.require(b.dataset.ggGate);return;}remember(b);},true);
  if(['dmUcusteKart','dmRotaKart'].includes(b.id))b.onclick=()=>window.dmInviteAc(b.id==='dmUcusteKart'?'ucus':'rota');
 }
 function render(host,grid){
  const routeCard=b=>/yolculuguAc|baModuAc|baFabTikla|buyuAkademisiYeniAc/.test(b.getAttribute('onclick')||'');
  grid.querySelectorAll('.az-gcard').forEach(b=>{if(routeCard(b)){b.hidden=true;b.style.setProperty('display','none','important');}});
  const all=[...grid.querySelectorAll('.az-gcard')].filter(b=>!routeCard(b));all.forEach(prepare);
  delete host.dataset.dmParty;host.dataset.ggParty=party;const active=party;
  host.querySelectorAll('[data-gg-party]').forEach(b=>{const on=b.dataset.ggParty===active;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  host.querySelectorAll('.gg-filters [data-gg-skill]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ggSkill===skill)));
  host.querySelector('.gg-banner h2').textContent=party==='break'?'Mola Vakti!':party==='solo'?'Oynayarak öğren!':'Birlikte kapışalım!';host.querySelector('.gg-banner p').textContent=party==='break'?'Biraz eğlen, altınları topla. Her oyun için günde 2 hak.':party==='solo'?'Oyunları keşfet, seviye atladıkça kilitlerini aç.':party==='free'?'Kartlarla öğren, aynı cihazda kapış.':'Arkadaşına çevrimiçi oyun daveti gönder.';
  host.querySelector('.gg-filters').hidden=party!=='solo';host.querySelector('.gg-social').hidden=party==='solo'||party==='break';host.querySelector('.gg-heading').textContent=party==='break'?'Mola Oyunları':party==='solo'?'Tüm Oyunlar':party==='free'?'Kapışma Oyunları':'İki Kişilik Oyunlar';
  grid.setAttribute('aria-labelledby',party==='break'?'ggBreakTab':party==='solo'?'ggSoloTab':party==='duo'?'ggOnlineTab':'ggFreeTab');
  let count=0;all.forEach(b=>{const open=allowed(b.dataset.ggGate),show=b.dataset.ggCategory===party&&(party!=='solo'||(skill==='Tümü'||b.dataset.ggGameSkill===skill||skill==='Kelime'&&b.dataset.ggGameSkill==='Hafıza'));b.classList.toggle('gg-locked',!open);b.setAttribute('aria-disabled',String(!open));const play=b.querySelector('.gg-play');if(play)play.textContent=!open?(window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||30)+'. seviyede açılır':free[b.id]?free[b.id][2]+' ›':b.dataset.ggCategory==='duo'?'Davet Et ›':'Oyna ›';b.hidden=!show;b.style.setProperty('display',show?'grid':'none','important');if(show)count++;});
  host.querySelector('.gg-empty').hidden=count!==0;
  const locked=all.filter(b=>b.dataset.ggCategory==='solo'&&!allowed(b.dataset.ggGate)).sort((a,b)=>(window.DijiProgressionCatalog?.gates[a.dataset.ggGate]||40)-(window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||40));
  const next=host.querySelector('.gg-next');next.hidden=party!=='solo'||!locked.length;
  if(!next.hidden){const b=locked[0],need=window.DijiProgressionCatalog?.gates[b.dataset.ggGate]||40;next.innerHTML='<h3>Sıradaki Oyun</h3><div>'+img(+b.dataset.ggIndex)+'<span><b>'+esc(b.dataset.ggTitle)+'</b><small>'+icon('lock')+need+'. seviyede açılır</small></span><label>Seviye '+level()+' → '+need+'<progress value="'+Math.min(level(),need)+'" max="'+need+'"></progress></label></div>';}
  const last=all.find(b=>b.dataset.ggId===lastGame()&&b.dataset.ggCategory==='solo'&&allowed(b.dataset.ggGate)),resume=host.querySelector('.gg-resume');resume.hidden=party!=='solo'||!last;
  if(last){resume.innerHTML='<small>Son oynadığın oyun</small><div>'+img(+last.dataset.ggIndex)+'<b>'+esc(last.dataset.ggTitle)+'</b><button type="button">Tekrar Oyna ›</button></div>';resume.querySelector('button').onclick=()=>last.click();}
  const xp=typeof yo!=='undefined'?yo:null;host.querySelector('[data-gg-gold]').textContent=xp?.altin||0;host.querySelector('[data-gg-energy]').textContent=(typeof genelEnerjiKalan==='number'?genelEnerjiKalan:typeof genelEnerjiKalan==='function'?genelEnerjiKalan():'–')+'/'+(typeof genelEnerjiMax==='number'?genelEnerjiMax:typeof genelEnerjiMax==='function'?genelEnerjiMax():30);
 }
 async function loadFriends(host){if(friendsLoaded)return;if(!allowed('takip')){host.querySelector('.gg-friends').textContent='Arkadaşlar '+(window.DijiProgressionCatalog?.gates.takip||15)+'. seviyede açılır.';return;}if(!logged()){host.querySelector('.gg-friends').textContent='Arkadaşlarını görmek için giriş yap.';return;}friendsLoaded=true;const row=host.querySelector('.gg-friends');row.innerHTML='<span role="status">Arkadaşların yükleniyor…</span>';const owner=account();try{const d=await m.api('takipDavetListesi');if(account()!==owner)return;skew=Date.parse(d.serverNow)-Date.now();d.liste.forEach(p=>stamp.set(p.ad,p));row.innerHTML=d.liste.length?d.liste.slice(0,5).map(p=>'<button type="button" data-gg-person="'+esc(p.ad)+'" title="'+esc(p.ad)+'"><span class="gg-avatar">'+(window.karakterSvg?.(p.ad,38)||esc(p.ad.slice(0,1).toLocaleUpperCase('tr')))+'</span><small>'+esc(p.ad)+'</small><i class="'+(isOnline(p.ad)?'online':'')+'" aria-label="'+(isOnline(p.ad)?'Çevrimiçi':'Çevrimdışı')+'"></i></button>').join(''):'<span>Henüz takip ettiğin arkadaş yok.</span>';row.querySelectorAll('button').forEach(b=>b.onclick=async()=>{await window.meduAkisAc?.();window.maProfilAc?.(b.dataset.ggPerson);});}catch{row.innerHTML='<button type="button">Arkadaşlar yüklenemedi · Tekrar dene</button>';row.querySelector('button').onclick=()=>{friendsLoaded=false;loadFriends(host);};}}
 function install(force=false){if(document.hidden&&!force)return;const tab=document.getElementById('tab-aktiviteler');if(!force&&knownGrid&&!tab?.classList.contains('active'))return;const host=document.querySelector('#tab-aktiviteler .dc-focus-card'),grid=host?.querySelector('.az-grid2x2');if(!grid)return;
  if(typeof window.okumaStudyosunuAc==='function'&&!grid.querySelector('[onclick*="okumaStudyosunuAc"]')){const b=document.createElement('button');b.type='button';b.className='az-gcard';b.setAttribute('onclick','okumaStudyosunuAc()');b.innerHTML='<div class="az-gcard-title">Okuma Stüdyosu</div>';grid.append(b);}
  if(!host.classList.contains('gg-page')){host.classList.add('gg-page');host.querySelectorAll('.dm-activity-hero,.dm-party-tabs').forEach(e=>e.remove());
   const top=document.createElement('div');top.className='gg-top';top.innerHTML='<div class="gg-brand"><b>DijiMedu</b><span>'+icon('energy')+'<b data-gg-energy>Enerji</b></span><span>'+icon('coin')+'<b data-gg-gold>0</b></span></div><div class="gg-title"><h1>Oyunlar</h1><div class="gg-tabs" role="tablist" aria-label="Oyun kategorisi"><button id="ggSoloTab" type="button" role="tab" data-gg-party="solo" aria-controls="dmActivityGames" aria-label="Tek Kişilik Oyunlar"><svg class="gg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21v-2a7 7 0 0 1 14 0v2"/></svg><span>Tek Kişilik</span></button><button id="ggOnlineTab" type="button" role="tab" data-gg-party="duo" aria-controls="dmActivityGames" aria-label="Online Çift Kişilik Oyunlar"><svg class="gg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M4 12h16M12 4c4 5 4 11 0 16-4-5-4-11 0-16"/></svg><span>Online Çift Kişilik</span></button><button id="ggFreeTab" type="button" role="tab" data-gg-party="free" aria-controls="dmActivityGames" aria-label="Kapışma Oyunları"><svg class="gg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16m-5-16L4 15m0-7V4h4m8 16h4v-4M4 16v4h4m8-16h4v4"/></svg><span>Kapışma</span></button><button id="ggBreakTab" type="button" role="tab" data-gg-party="break" aria-controls="dmActivityGames" aria-label="Mola Vakti"><svg class="gg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v4m5-4v4M4 10h13v5a6.5 6.5 0 0 1-13 0zm13 0h2a3 3 0 0 1 0 6h-2M3 22h17"/></svg><span>Mola Vakti</span></button></div></div><div class="gg-banner"><img src="oyna-assets/oyna-papi-fly.png" alt="Papi"><div><h2>Oynayarak öğren!</h2><p>Oyunları keşfet, seviye atladıkça kilitlerini aç.</p></div></div><div class="gg-filters" aria-label="Beceri filtresi">'+['Tümü','Kelime','Dinleme','Cümle'].map(s=>'<button type="button" data-gg-skill="'+s+'">'+s+'</button>').join('')+'</div><div class="gg-social" hidden><b>Arkadaşların</b><div class="gg-friends"></div><button type="button" class="gg-friends-all">'+icon('users')+' Tümü ›</button></div><section class="gg-resume" hidden></section><h2 class="gg-heading">Tüm Oyunlar</h2><p class="gg-empty" hidden>Bu beceride oyun bulunamadı. Diğer filtreleri deneyebilirsin.</p>';
   grid.before(top);const bottom=document.createElement('div');bottom.className='gg-bottom';bottom.innerHTML='<section class="gg-next" hidden></section><div class="gg-matches" hidden><h3>Karşılaşmalarım</h3><div><span>'+icon('users')+' Davetlerini ve sonuçlarını gör</span><button type="button" data-gg-matches>Gör ›</button></div><button type="button" data-gg-duo>Çevrimiçi iki kişilik oyunlar ›</button></div>';grid.after(bottom);
   top.querySelectorAll('[data-gg-party]').forEach(b=>{b.onclick=()=>{party=b.dataset.ggParty;render(host,grid);host.querySelector('.gg-matches').hidden=party==='solo'||party==='break';if(party==='duo'||party==='free')loadFriends(host);};b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...top.querySelectorAll('[data-gg-party]')];const index=buttons.indexOf(b);const other=e.key==='Home'?buttons[0]:e.key==='End'?buttons.at(-1):buttons[(index+(e.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length];other.click();other.focus();}};});
   top.querySelectorAll('[data-gg-skill]').forEach(b=>b.onclick=()=>{skill=b.dataset.ggSkill;render(host,grid);});top.querySelector('.gg-friends-all').onclick=()=>window.meduAkisAc?.();bottom.querySelector('[data-gg-matches]').onclick=()=>window.dmArenaAc?.();bottom.querySelector('[data-gg-duo]').onclick=()=>{top.querySelector('[data-gg-party=duo]').click();};grid.id='dmActivityGames';grid.setAttribute('role','tabpanel');
   new MutationObserver(()=>{key='';install();}).observe(grid,{childList:true});
  }
  if(lastAccount!==account()){lastAccount=account();friendsLoaded=false;party='solo';skill='Tümü';key='';}
  host.querySelector('.gg-matches').hidden=party==='solo'||party==='break';
  const nextKey=[party,skill,level(),grid.children.length,lastGame(),typeof yo!=='undefined'?yo?.altin:0,typeof genelEnerjiKalan==='number'?genelEnerjiKalan:typeof genelEnerjiKalan==='function'?genelEnerjiKalan():0].join('|');if(knownGrid!==grid||key!==nextKey){knownGrid=grid;key=nextKey;render(host,grid);}
 }
 // Page tabs must never inherit the viewport lock used by a playing overlay.
 document.querySelectorAll('.dc-fullscreen-overlay[id^="tab-"]').forEach(el=>el.classList.remove('dm-solo-fullstage'));
 install();setInterval(install,1500);
 window.dmGamesUI={refresh:()=>{key='';install(true);}};
 window.dmActivityPresence={refresh,isOnline};
})();
