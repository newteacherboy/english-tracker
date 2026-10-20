/* Session navigation uses native close handlers so timers, saves and exits still run. */
(()=>{'use strict';
 const surfaces='.game-modal-overlay,#bzPerde,#dmStoryLesson,#mlThemeList,#meteorGame,#wordWheel,#papiCards,#rallyGame,#dmGameIntro,#seviyeHaritaOverlay,#yoModal.acik,.dm-garden-match,.kp-shell,.ba-shell,.kart-oyun-overlay,#dyOyunOverlay,#genelSonucOverlay,.bz-alt:has(.sp-start-card)';
 const nativeBack='.game-close-btn,#bzCik,#bzKapat,#bzVazgec,.rq-close,.ds-back,.ml-header [data-back],.ml-entry-card [data-back],.mt-exit,.ww-close,.pc-close,.yo-kapat,.seviye-harita-kapat,.kp-close-x,.ba-close,[data-ia-close],.dm-x,.hb-card>header>[data-close],.hb-card>header>button,.kart-oyun-kapat,.pomodoro-close-btn';
 const shown=el=>!!el?.isConnected&&el.getClientRects().length>0&&(el.checkVisibility?el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}):getComputedStyle(el).visibility!=='hidden');
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
  if(!root.classList.contains('dm-session-surface'))root.classList.add('dm-session-surface');
  // These eight games have two DIFFERENT controls: the separate fullscreen
  // left arrow (previous setup screen) and the native right X (quit game).
  // Never rewrite the native X into a left-arrow session back button.
  if(root.classList.contains('fg-fs-active'))return;
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
 let frame=0;
 function sync(){frame=0;let any=false;for(const root of document.querySelectorAll(surfaces)){if(!shown(root))continue;any=true;decorate(root);}document.body.classList.toggle('dm-play-session',any);}
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 const relevant=n=>n.nodeType===1&&(n.matches(surfaces+',button')||!!n.querySelector(surfaces+',button'));
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'?[...r.addedNodes,...r.removedNodes].some(relevant):r.target===document.body||r.target.matches(surfaces+',#gsoDevamBtn')||!!r.target.querySelector(surfaces)))schedule();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','disabled']});
 window.addEventListener('resize',schedule);document.addEventListener('transitionend',schedule);sync();
 window.dmPlayNavigation={sync};
})();
