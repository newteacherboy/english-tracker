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
 window.dmInviteAc=async function(game){
  if(!['ucus','rota'].includes(game))return;
  const s=m.sheet(m.games[game][0]+' · Arkadaşını seç','Takip ettiğin bir arkadaşına doğrudan oyun daveti gönder.');
  s.body.innerHTML='<p role="status">Takip ettiğin kişiler yükleniyor…</p>';
  let stopped=false;s.p._close=()=>{stopped=true;};
  try{
   const d=await m.api('takipDavetListesi');if(stopped)return;skew=Date.parse(d.serverNow)-Date.now();d.liste.forEach(p=>stamp.set(p.ad,p));
   s.body.innerHTML=`<label class="dm-invite-label">Oynama şekli<select class="dm-invite-mode"><option value="live">Aynı anda · ortak geri sayım</option><option value="async">Farklı zamanda · 24 saat içinde</option></select></label><label class="dm-invite-label">Arkadaşını bul<input type="search" class="dm-invite-search" placeholder="İsim ara" autocomplete="off"></label><div class="dm-follow-list"></div><button class="dm-open-matches">Karşılaşmalarımı göster</button>`;
   const list=s.body.querySelector('.dm-follow-list');
   function draw(q=''){
    const rows=d.liste.filter(p=>p.ad.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
    list.innerHTML=rows.length?rows.map(p=>`<div class="dm-invite-person"><div><b>${esc(p.ad)}</b><span class="dm-online-badge" data-online-person="${esc(p.ad)}"></span></div><button data-invite="${esc(p.ad)}">Davet et</button></div>`).join(''):`<p class="dm-empty">${d.liste.length?'Bu isimde takip ettiğin bir kişi yok.':'Henüz kimseyi takip etmiyorsun. Medu Akış → Keşfet bölümünden arkadaşlarını takip edebilirsin.'}</p>`;paint();
    list.querySelectorAll('[data-invite]').forEach(b=>b.onclick=async()=>{list.querySelectorAll('button').forEach(x=>x.disabled=true);try{const r=await m.api('oyunEslesmeOlustur',{alici:b.dataset.invite,oyun:game,mod:s.body.querySelector('.dm-invite-mode').value});s.close();window.yoToast?.('Oyun daveti gönderildi!');window.dmMatchAc(r.id);}catch(e){let error=list.querySelector('.dm-error');if(!error){error=document.createElement('p');error.className='dm-error';error.setAttribute('role','alert');list.prepend(error);}error.textContent=e.message;list.querySelectorAll('button').forEach(x=>x.disabled=false);}});
   }
   draw();s.body.querySelector('input').oninput=e=>draw(e.target.value);s.body.querySelector('.dm-open-matches').onclick=()=>{s.close();window.dmArenaAc();};
  }catch(e){if(stopped)return;s.body.textContent=e.message;}
 };
 const cards=[
 ['kelimeYarismasiAc',0,'#d9c7f9','#b99be5'],['jpOyunAc',1,'#ffd3e5','#e6abc5'],['boslukOyunAc',2,'#ffe69d','#e3c678'],['hafizaOyunAc',3,'#ffd2d9','#e4a6b0'],
 ['yagmurOyunAc',4,'#b5e6ff','#8fc5e7'],['asmacaOyunAc',5,'#ffbcbf','#dc8f97'],['kelimebulOyunAc',6,'#cdf29e','#a0cf73'],['esOyunAc',7,'#debbfa','#be94e2'],
 ['trenOyunAc',8,'#ffe795','#e5c66b'],['dikteAc',9,'#c8d5ff','#a2b1e4'],['cumleAc',10,'#e8c7f4','#c59bd4'],['dmUcusteKart',11,'#b8e7ff','#8bc7e7'],['dmRotaKart',12,'#e5c4fb','#c294df'],['yolculuguAc',12,'#bde8de','#96cbbd'],['harfBahcesiAc',null,'#cdeeb6','#99c57d']];
 let party='solo',partyObserver,observedGrid;
 function partyTabs(host,grid){
  let tabs=host.querySelector('.dm-party-tabs');
  if(!tabs){
   tabs=document.createElement('div');tabs.className='dm-party-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Oyun kategorisi');
   tabs.innerHTML='<button type="button" id="dmSoloTab" role="tab" data-party="solo" aria-controls="dmActivityGames"><span aria-hidden="true">🎮</span> Tek Kişilik</button><button type="button" id="dmDuoTab" role="tab" data-party="duo" aria-controls="dmActivityGames"><span aria-hidden="true">🤝</span> İki Kişilik</button><button type="button" id="dmFreeTab" role="tab" data-party="free" aria-controls="dmActivityGames"><span aria-hidden="true">⚔️</span> Kapışma Oyunları</button>';
   grid.before(tabs);
   tabs.querySelectorAll('button').forEach(b=>{b.onclick=()=>{party=b.dataset.party;partyTabs(host,grid);};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const all=[...tabs.querySelectorAll('button')],i=all.indexOf(b),next=all[e.key==='Home'?0:e.key==='End'?all.length-1:(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length];next.click();next.focus();};});
  }
  host.dataset.dmParty=party;
  tabs.querySelectorAll('button').forEach(b=>{const active=b.dataset.party===party;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  grid.id='dmActivityGames';grid.setAttribute('role','tabpanel');grid.setAttribute('aria-labelledby',party==='solo'?'dmSoloTab':party==='duo'?'dmDuoTab':'dmFreeTab');
  grid.querySelectorAll('.az-gcard').forEach(b=>{
   const label=(b.textContent||'').toLocaleLowerCase('tr');
   const freeIds=['papiCardsActivity','wordWheelActivity','meteorActivity'];
   const isFree=freeIds.includes(b.id)||/papi kartları|papi’nin meteor düellosu|papi'nin meteor düellosu|papi’nin kelime çarkı|papi'nin kelime çarkı/.test(label);
   b.dataset.dmParty=isFree?'free':b.classList.contains('dm-live-card')||['dmUcusteKart','dmRotaKart'].includes(b.id)?'duo':'solo';
  });
  if(observedGrid!==grid){partyObserver?.disconnect();observedGrid=grid;partyObserver=new MutationObserver(upgradeCards);partyObserver.observe(grid,{childList:true});}
 }
 function upgradeCards(){
  const host=document.querySelector('#tab-aktiviteler .dc-focus-card')||document.getElementById('tab-aktiviteler');if(!host)return;
  if(!host.querySelector('.dm-activity-hero')){const h=document.createElement('header');h.className='dm-activity-hero';h.innerHTML='<div><h1>Oyunlar</h1><p>Bugün hangi oyunu oynayalım?</p></div><img src="papi-welcome-v2.png" alt="Oynamaya hazır Diji-Medu papağanı" width="100" height="110">';host.prepend(h);}
  const grid=host.querySelector('.az-grid2x2');if(!grid)return;
  cards.forEach(([fn,idx,color,edge])=>{const b=grid.querySelector('[onclick*="'+fn+'"]')||document.getElementById(fn==='dikteAc'?'yoDikteKart':fn);if(!b||!grid.contains(b))return;
   // Preserve the original legible game card artwork and sizing.
   // The two-column toy-card override made locked cards unreadable on phones.
   b.classList.remove('dm-toy-card');
   b.classList.add('dm-showcase-card');
   b.style.removeProperty('--toy-bg');b.style.removeProperty('--toy-edge');
   b.style.setProperty('--dm-card-bg',color);
   b.style.setProperty('--dm-card-edge',edge);
   const existingIcon=b.querySelector('.az-gcard-icon');
   if(existingIcon&&idx!==null&&!existingIcon.querySelector('.dm-showcase-icon')){
     const art=document.createElement('span');art.className='dm-showcase-icon';art.setAttribute('aria-hidden','true');
     art.style.backgroundPosition=(idx%4)*100/3+'% '+Math.floor(idx/4)*100/3+'%';
     existingIcon.replaceChildren(art);
   }
   const title=b.querySelector('.az-gcard-title');
   const desc=b.querySelector('.ak-acik');
   const tag=b.querySelector('.ak-etiket');
   if(title&&!title.closest('.dm-game-copy')){
     const copy=document.createElement('span');copy.className='dm-game-copy';title.before(copy);copy.append(title);
     if(desc)copy.append(desc);
     if(tag)copy.append(tag);
   }
   if(!b.querySelector('.dm-game-chevron')){const arrow=document.createElement('span');arrow.className='dm-game-chevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';b.append(arrow);}
   if(['dmUcusteKart','dmRotaKart'].includes(fn)){b.onclick=()=>window.dmInviteAc(fn==='dmUcusteKart'?'ucus':'rota');if(!b.querySelector('.ak-etiket')){const t=document.createElement('div');t.className='ak-etiket';t.textContent='12 soru · 4 ⚡';b.append(t);}}
  });
  partyTabs(host,grid);
 }
 upgradeCards();let n=0;const retry=setInterval(()=>{upgradeCards();if(++n>=10)clearInterval(retry);},800);
 window.dmActivityPresence={refresh,isOnline};
})();
