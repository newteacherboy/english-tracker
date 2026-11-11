/* [11 Kas 2026] Oyunlar · "Premium ol" bandı (Claude Design Oyunlar A). Premium Pro'da gösterilmez (iOS'ta da açık).
   Paketler DMSatis.planlar('oyunlar') ile açılır; başka hiçbir davranış değişmez. Görünüm: games-v2.css */
(()=>{'use strict';
 if(typeof document==='undefined')return;
 const offer=()=>!window.dmTeacherPortalMode&&(Number(window.genelEnerjiMax)||0)<60&&!!window.DMSatis?.planlar;
 function paint(){
  const page=document.querySelector('#tab-aktiviteler .gg-page.au-games');if(!page)return;
  const tabs=page.querySelector('.gg-tabs');if(!tabs)return;
  let band=page.querySelector('.gg-v2-pro');
  if(!offer()){band?.remove();return;}
  if(!band){band=document.createElement('button');band.type='button';band.className='gg-v2-pro';band.innerHTML='<i aria-hidden="true"></i><span><b>Tüm premium oyunlar açık olsun</b><small>Premium ile sınırsız oyna</small></span><em>Premium ol</em>';band.onclick=()=>window.DMSatis?.planlar?.('oyunlar');}
  if(tabs.nextElementSibling!==band)tabs.after(band);
 }
 let queued=false;const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;paint();});}};
 function start(){const tab=document.getElementById('tab-aktiviteler');if(tab)new MutationObserver(m=>{if(m.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('gg-v2-pro'))))schedule();}).observe(tab,{childList:true,subtree:true});schedule();setTimeout(schedule,1500);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
