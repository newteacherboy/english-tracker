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
  if(id==='tab-aktiviteler')return '<span class="dm-nv2-tile" style="--t:#ed548c;--te:#bd3566"><img src="route-assets/bilgi-icons/games.webp" alt="" width="29" height="29"></span>';
  if(id==='tab-duel-home')return '<span class="dm-nv2-oyna-disc"><svg viewBox="0 0 48 48" width="35" height="35" aria-hidden="true"><path d="M7 5l10 3 24 25-8 8L8 17z" fill="#fff2b2" stroke="#d99b18" stroke-width="2"/><path d="M41 5l-10 3L7 33l8 8 25-24z" fill="#fff" stroke="#d99b18" stroke-width="2"/><path d="M6 29l13 13M29 42l13-13" stroke="#ffcc42" stroke-width="5" stroke-linecap="round"/></svg></span><i class="dm-nv2-spark" style="left:-44px;top:-62px">✦</i><i class="dm-nv2-spark" style="left:34px;top:-44px;font-size:10px;animation-delay:.7s">✦</i>';
  if(id==='tab-profile-menu'){
   const name=typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
   let avatar='';try{if(name)avatar=window.karakterSvg?.(name,38)||'';}catch{}
   return '<span class="dm-nv2-tile dm-nv2-own-avatar">'+(avatar||'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="#53759b"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z" fill="#53759b"/></svg>')+'</span>';
  }
  return '';
 }
 let avatarLayer=null,avatarKey=null;
 function currentAvatarKey(){
  const owner=typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
  try{return JSON.stringify([owner,typeof yo!=='undefined'?yo?.karakter:null,typeof window.karakterSvg,typeof yoVar==='function'?yoVar():null]);}catch{return owner;}
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
    layer?.remove();layer=document.createElement('span');layer.className='dm-nv2'+(id==='tab-duel-home'?' dm-nv2-oyna':'');layer.dataset.for=id;layer.setAttribute('aria-hidden','true');layer.innerHTML=html;icon.append(layer);
   }
   if(id==='tab-profile-menu'){const key=currentAvatarKey();if(avatarLayer!==layer||avatarKey!==key){avatarLayer=layer;avatarKey=key;layer.innerHTML=art(id);}}
   if(!b.querySelector(':scope>.dm-nv2-dot')){const d=document.createElement('span');d.className='dm-nv2-dot';d.setAttribute('aria-hidden','true');b.append(d);}
  });
 }
 let queued=false;const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;paint();});}};
 function start(){
  paint();
  const nav=document.getElementById('bottomNavMobile');
  if(nav)new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('dm-nv2')&&!n.classList?.contains('dm-nv2-dot')&&!n.closest?.('.dm-nv2'))))schedule();}).observe(nav,{childList:true,subtree:true});
  const header=document.getElementById('userAvatarLetter');
  if(header)new MutationObserver(()=>{avatarKey=null;schedule();}).observe(header,{childList:true,subtree:true,characterData:true});
  for(const event of ['dm:login','dm:logout','dm:avatar-change'])document.addEventListener(event,()=>{avatarKey=null;schedule();});
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  setTimeout(paint,1500);
 }
 window.dmBottomNavV2={paint};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
