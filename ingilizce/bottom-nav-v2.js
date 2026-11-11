/* [11 Kas 2026] Öğrenci alt menüsünün görsel katmanı (bottom-nav-v2.css). Sekmeler, sıraları, tıklama hedefleri ve
   seçili sekme mantığı bottom-nav.js'te aynen kalır; burada yalnızca her sekmenin ikon alanına görsel eklenir. */
(()=>{'use strict';
 if(typeof document==='undefined')return;
 const G={
  'tab-dunya':['#2DB66B','#1E8B4F','<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" fill="#fff" opacity=".7"/><path d="M9 4v13.5L3 20V6.5zM21 4v13.5L15 20V6.5z" fill="#fff"/><circle cx="12" cy="10.5" r="2.2" fill="#2DB66B"/>'],
  'tab-meduakis':['#FF9F1C','#D97E00','<circle cx="16.5" cy="8.5" r="2.9" fill="#fff" opacity=".7"/><path d="M13.6 13.2c4-1 8 1.3 8 5.3v.5h-6.2z" fill="#fff" opacity=".7"/><circle cx="9" cy="8" r="3.6" fill="#fff"/><path d="M2.4 19.5c0-3.8 2.9-6.3 6.6-6.3s6.6 2.5 6.6 6.3v.5H2.4z" fill="#fff"/>'],
  'tab-magaza':['#FF5C8A','#D63A69','<path d="M4.5 10h15v9.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z" fill="#fff" opacity=".7"/><path d="M4.6 3.5h14.8L21.5 9a2.4 2.4 0 0 1-4.6 1 2.4 2.4 0 0 1-4.9 0 2.4 2.4 0 0 1-4.9 0A2.4 2.4 0 0 1 2.5 9z" fill="#fff"/><rect x="10" y="14" width="4" height="7" rx="1" fill="#fff"/>']
 };
 function art(id){
  if(G[id]){const [t,te,p]=G[id];return '<span class="dm-nv2-tile" style="--t:'+t+';--te:'+te+'"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+p+'</svg></span>';}
  if(id==='tab-aktiviteler')return '<span class="dm-nv2-oyna-disc"><img src="route-assets/bilgi-icons/games.webp" alt="" decoding="async"></span><i class="dm-nv2-spark" style="left:-44px;top:-62px">✦</i><i class="dm-nv2-spark" style="left:34px;top:-44px;font-size:10px;animation-delay:.7s">✦</i>';
  if(id==='tab-profile-menu'){const papi=window.dmLivePapi?.markup?.();return papi?'<span class="dm-nv2-tile dm-nv2-papi"><span class="dm-lp dm-lp-mini">'+papi+'</span></span>':'';}
  return '';
 }
 function paint(){
  const nav=document.getElementById('bottomNavMobile');
  if(!nav||window.dmTeacherPortalMode||document.documentElement.classList.contains('dm-teacher-portal')){nav?.classList.remove('dm-nv2-on');return;}
  nav.classList.add('dm-nv2-on');
  nav.querySelectorAll('.bn-item[data-ekran]').forEach(b=>{
   const icon=b.querySelector('.bn-icon');if(!icon)return;
   const id=b.dataset.ekran;let layer=icon.querySelector(':scope>.dm-nv2');
   if(!layer||layer.dataset.for!==id){
    const html=art(id);if(!html)return;
    layer?.remove();layer=document.createElement('span');layer.className='dm-nv2'+(id==='tab-aktiviteler'?' dm-nv2-oyna':'');layer.dataset.for=id;layer.setAttribute('aria-hidden','true');layer.innerHTML=html;icon.append(layer);
   }
   if(!b.querySelector(':scope>.dm-nv2-dot')){const d=document.createElement('span');d.className='dm-nv2-dot';d.setAttribute('aria-hidden','true');b.append(d);}
  });
 }
 let queued=false;const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;paint();});}};
 function start(){
  paint();
  const nav=document.getElementById('bottomNavMobile');
  if(nav)new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('dm-nv2')&&!n.classList?.contains('dm-nv2-dot')&&!n.closest?.('.dm-nv2'))))schedule();}).observe(nav,{childList:true,subtree:true});
  setTimeout(paint,1500);
 }
 window.dmBottomNavV2={paint};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
