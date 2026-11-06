/* The game owns its clock; this layer owns the modal and blocked controls. */
(()=>{
 'use strict';
 window.dmLocalGamePause=(root,content,resume)=>{
  if(root.dataset.musicPaused==='true')return;
  const trigger=document.activeElement;
  const started=performance.now();
  const curtain=document.createElement('div');
  curtain.className='dm-game-pause-sheet';
  curtain.setAttribute('role','dialog');
  curtain.setAttribute('aria-modal','true');
  curtain.setAttribute('aria-label','Oyun duraklatıldı');
  curtain.innerHTML='<section><h2>Oyun duraklatıldı</h2><button type="button">▶ Devam et</button></section>';
  root.dataset.musicPaused='true';
  const covered=[content,...root.querySelectorAll(':scope > .dm-game-music')].filter(el=>el&&!el.inert);
  for(const el of covered)el.inert=true;
  root.append(curtain);
  const button=curtain.querySelector('button');
  button.onclick=()=>{
   curtain.remove();
   for(const el of covered)el.inert=false;
   delete root.dataset.musicPaused;
   resume(performance.now()-started);
   trigger?.focus({preventScroll:true});
  };
  curtain.onkeydown=e=>{
   if(e.key==='Tab'){e.preventDefault();button.focus();}
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();button.click();}
  };
  button.focus({preventScroll:true});
 };
})();
