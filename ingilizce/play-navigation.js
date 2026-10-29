/* Session navigation uses native close handlers so timers, saves and exits still run. */
(()=>{'use strict';
 const surfaces='.game-modal-overlay,#kelimeGolu,#bzPerde,#dmStoryLesson,#mlThemeList,#meteorGame,#wordWheel,#papiCards,#rallyGame,#dmGameIntro,#seviyeHaritaOverlay,#yoModal.acik,.dm-garden-match,.kp-shell,.ba-shell,.kart-oyun-overlay,#dyOyunOverlay,#genelSonucOverlay.acik,.bz-alt:has(.sp-start-card)';
 const nativeBack='.kg-back,.game-close-btn,#bzCik,#bzKapat,#bzVazgec,.rq-close,.ds-back,.ml-header [data-back],.ml-entry-card [data-back],.mt-exit,.ww-close,.pc-close,.yo-kapat,.seviye-harita-kapat,.kp-close-x,.ba-close,[data-ia-close],.dm-x,.hb-card>header>[data-close],.hb-card>header>button,.kart-oyun-kapat,.pomodoro-close-btn';
 // A finished game can leave its shell in the DOM. Only on-screen, interactive
 // surfaces are allowed to hide the main navigation dock.
 const shown=el=>{
  if(!el?.isConnected||el.hidden||el.style.display==='none'||el.closest('[inert],[aria-hidden="true"],[data-dm-nav-suspended]'))return false;
  // CSS layers can override native style.display='none' with !important;
  // an inactive result/legacy panel must never keep the dock hidden.
  const parentPage=el.closest('.dc-fullscreen-overlay');
  if(parentPage&&!parentPage.classList.contains('active'))return false;
  const style=getComputedStyle(el);
  if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||style.pointerEvents==='none'||Number(style.opacity)<0.05)return false;
  const rect=el.getBoundingClientRect(),viewportHeight=window.visualViewport?.height||window.innerHeight;
  if(rect.width<=0||rect.height<=0||rect.bottom<=0||rect.right<=0||rect.left>=window.innerWidth||rect.top>=viewportHeight)return false;
  return !el.checkVisibility||el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
 };
 function fallback(root){
  if(root.id==='genelSonucOverlay')return ()=>root.querySelector('#gsoDevamBtn')?.click();
  if(root.id==='dyTebrikOverlay')return ()=>root.querySelector('.btn-giris')?.click();
  if(root.id==='rallyGame')return ()=>window.dmRally?.close();
  if(root.id==='dmStoryLesson')return ()=>root.classList.contains('ml-lesson')?window.dmThematicLearning?.close():window.dmStoryPath?.close();
  if(root.id==='mlThemeList')return ()=>root.querySelector('[data-close]')?.click();
  if(root.id==='dmGameIntro')return ()=>root.querySelector('[data-close]')?.click();
  return null;
 }
 function decorate(root){
  if(root.id==='kelimeGolu')return;
  if(!root.classList.contains('dm-session-surface'))root.classList.add('dm-session-surface');
  // These eight games have two DIFFERENT controls: the separate fullscreen
  // left arrow (previous setup screen) and the native right X (quit game).
  // Never rewrite the native X into a left-arrow session back button.
  if(root.classList.contains('fg-fs-active'))return;
  if(root.classList.contains('dm-vp-root'))return;
  if(root.id==='asmacaOyunOverlay'&&root.classList.contains('ia-playing')){root.querySelectorAll('.dm-session-back').forEach(b=>b.classList.remove('dm-session-back'));return;}
  let back=root.querySelector(nativeBack);
  // The rally pause/results controls are recreated during play; use its public close API.
  if(root.id==='rallyGame')back=root.querySelector(':scope>.dm-session-back');
  if(!back){back=root.querySelector(':scope>.dm-session-back');if(!back){const close=fallback(root);if(!close)return;back=document.createElement('button');back.type='button';back.className='dm-session-back';back.onclick=close;root.prepend(back);}}
  if(!back.classList.contains('dm-session-back'))back.classList.add('dm-session-back');
  if(root.id==='genelSonucOverlay'){const disabled=!!root.querySelector('#gsoDevamBtn')?.disabled;if(back.disabled!==disabled)back.disabled=disabled;}
  if(back.textContent!=='‹')back.textContent='‹';
  if(back.getAttribute('aria-label')!=='Geri dön ve çık')back.setAttribute('aria-label','Geri dön ve çık');
  if(back.title!=='Geri dön')back.title='Geri dön';
 }
 let frame=0,recheck=0;
 function sync(){
  frame=0;let any=false;
  for(const root of document.querySelectorAll(surfaces)){if(!shown(root))continue;any=true;decorate(root);}
  document.body.classList.toggle('dm-play-session',any);
  // CSS exits and transition-only closures may not mutate the DOM. Recheck until
  // the last live game closes, then restore the normal six-tab navigation.
  if(recheck){clearTimeout(recheck);recheck=0;}
  if(any)recheck=setTimeout(schedule,1200);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 const relevant=n=>n.nodeType===1&&(n.matches(surfaces+',button')||!!n.querySelector(surfaces+',button'));
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'?[...r.addedNodes,...r.removedNodes].some(relevant):r.target===document.body||r.target.matches(surfaces+',#gsoDevamBtn')||!!r.target.querySelector(surfaces)))schedule();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','disabled','aria-hidden','inert','data-dm-nav-suspended']});
 window.addEventListener('resize',schedule);window.addEventListener('pageshow',schedule);document.addEventListener('transitionend',schedule);document.addEventListener('animationend',schedule,true);sync();
 // Read-only on-device diagnostics for real exits; never contains user data.
 window.dmPlayNavigation={sync,diagnostics:()=>({
  menuDisplay:getComputedStyle(document.getElementById('bottomNavMobile')||document.body).display,
  locked:document.body.classList.contains('dm-play-session'),
  visibleSurfaces:[...document.querySelectorAll(surfaces)].filter(shown).map(e=>e.id||e.className).slice(0,20)
 })};
})();
