/* One responsive wallet moved into the active page or question header. */
(()=>{'use strict';
const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
const hud=document.createElement('div');hud.className='dm-papi-wallet dm-unified-wallet';hud.setAttribute('aria-label','Enerji, altın, XP ve aktif kullanım yıldızları');
hud.innerHTML='<span data-pw="energy"></span><span data-pw="gold"></span><span data-pw="xp"></span><button type="button" data-pw="time" aria-label="Toplam kullanım sürem ve zaman sandıklarım"></button>';
hud.querySelector('button').onclick=()=>window.dmActiveTime?.panel();
const coin='<img class="dm-gold-icon" src="route-assets/coin.svg" alt="Altın">';
function run(){
 if(typeof aktifOgrenciAdi==='undefined'||!aktifOgrenciAdi){hud.remove();return;}
 const selectors=['#dmStoryLesson .ds-lesson-header','#bzPerde','.game-modal-overlay .game-modal-content','#meteorGame .mt-top','#wordWheel .ww-shell>header','#papiCards .pc-header','#harfBahcesiOverlay .hb-card','.dc-fullscreen-overlay.active','#tab-dunya','#tab-aktiviteler','#tab-derscalis','#tab-magaza','#tab-dunyam'];
 const host=selectors.flatMap(s=>[...document.querySelectorAll(s)]).find(visible);if(!host){hud.remove();return;}
 if(hud.parentElement!==host){host.prepend(hud);host.classList.add('dm-has-wallet');}
 const y=typeof yo==='undefined'?{}:yo||{},time=window.dmActiveTime?.summary()||{stars:0},level=window.dmProgression?.level?.()||1;
 const values={energy:'⚡ '+(window.genelEnerjiKalan??'—'),gold:coin+' '+Number(y.altin||0).toLocaleString('tr-TR'),xp:'✨ '+Number(y.totalXp||0).toLocaleString('tr-TR'),time:'⭐ '+time.stars};
 for(const [key,value] of Object.entries(values)){const e=hud.querySelector('[data-pw="'+key+'"]');if(e.dataset.value!==value){e.innerHTML=value;e.dataset.value=value;}}
 hud.querySelector('[data-pw="xp"]').title='Seviye '+level+' · Toplam XP';hud.querySelector('[data-pw="time"]').title=Math.floor(time.seconds/3600)+' saat '+Math.floor(time.seconds%3600/60)+' dakika';
}
setInterval(run,1000);document.addEventListener('dm:time',run);document.addEventListener('dm:login',run);window.DijiMeduPapiWallet={refresh:run};run();
})();
