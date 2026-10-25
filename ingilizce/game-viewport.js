/* One viewport and two explicit exits. Native game cleanup remains authoritative. */
(()=>{'use strict';
 const classics={kelimeYarismaOverlay:['kelimeYarismasiKapat','kelimeYarismasiAc'],jpOyunOverlay:['jpOyunKapat','jpOyunAc'],boslukOyunOverlay:['boslukOyunKapat','boslukOyunAc'],hafizaOyunOverlay:['hafizaOyunKapat','hafizaOyunAc'],yagmurOyunOverlay:['yagmurOyunKapat','yagmurOyunAc'],asmacaOyunOverlay:['asmacaOyunKapat','asmacaOyunAc'],kelimebulOyunOverlay:['kelimebulOyunKapat','kelimebulOyunAc'],esOyunOverlay:['esOyunKapat','esOyunAc'],trenOyunOverlay:['trenOyunKapat','trenOyunAc']};
 const modern={rallyGame:'dmRally',wordWheel:'dmWordWheel',papiCards:'dmPapiCards',meteorGame:'dmMeteor',mvOverlay:'dmMola',kgOverlay:'dmTopicGames'};
 const selector='.game-modal-overlay,#harfBahcesiOverlay,#dmGameIntro,#yoModal.acik[data-dm-selected-game],#rallyGame,#wordWheel,#papiCards,#meteorGame,#mvOverlay,#kgOverlay,#onlineMatch,#dmArenaOverlay,#dmMatchOverlay,#genelSonucOverlay.acik,#dyOyunOverlay,.dm-garden-match,.kart-oyun-overlay,.kp-shell,.ba-shell';
 const nativeSelector='.game-close-btn,.yo-kapat,.hb-card header [data-close],.mt-exit,.ww-close,.pc-close,.mv-close,.kg-close,[data-exit],[data-close],.kp-close-x,.ba-close,.kart-oyun-kapat,.dm-x,[data-ia-close],#gsoDevamBtn';
 const shown=e=>!!e?.isConnected&&e.style.display!=='none'&&!e.hidden&&e.getClientRects().length>0&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
 function native(root){return root.querySelector(nativeSelector);}
 function closeNative(root){if(root.id==='genelSonucOverlay'&&typeof window.genelSonucKapat==='function')return window.genelSonucKapat('devam');const name=classics[root.id]?.[0],object=modern[root.id];if(name&&typeof window[name]==='function')return window[name]();if(object&&typeof window[object]?.close==='function')return window[object].close();return native(root)?.click();}
 async function navigate(root,back){
  if(root.dataset.vpClosing)return;root.dataset.vpClosing='1';
  window.dmGameExitIntent=back?'back':'exit';
  try{await closeNative(root);if(back&&!shown(root)){const opener=classics[root.id]?.[1];if(opener&&typeof window[opener]==='function'){window.dmGameReopeningSetup=true;try{await window[opener]();}finally{window.dmGameReopeningSetup=false;}}}}
  finally{window.dmGameExitIntent='';delete root.dataset.vpClosing;queueMicrotask(()=>{sync();if(!back&&window.dmTeacherPortalMode)window.dmTeacherPortal?.returnToGames?.();});}
 }
 function decorate(root){
  if(!native(root)&&!classics[root.id]&&!modern[root.id])return;
  if(!root.classList.contains('dm-vp-root'))root.classList.add('dm-vp-root');
  for(const [kind,label,text] of [['back','Oyun başlangıcına geri dön','‹'],['exit','Oyunu kapat','×']]){
   let b=root.querySelector(':scope > .dm-vp-'+kind);if(!b){b=document.createElement('button');b.type='button';b.className='dm-vp-'+kind;b.setAttribute('aria-label',label);b.textContent=text;b.onclick=e=>{e.preventDefault();e.stopPropagation();void navigate(root,kind==='back');};root.append(b);}
  }
 }
 let scheduled=0;
 function sync(){scheduled=0;const view=window.visualViewport,height=(view?.height||window.innerHeight)+'px',top=(view?.offsetTop||0)+'px';if(document.documentElement.style.getPropertyValue('--dm-game-height')!==height)document.documentElement.style.setProperty('--dm-game-height',height);if(document.documentElement.style.getPropertyValue('--dm-game-top')!==top)document.documentElement.style.setProperty('--dm-game-top',top);let active=false;for(const root of document.querySelectorAll(selector)){if(!shown(root)){if(root.classList.contains('dm-vp-root'))root.classList.remove('dm-vp-root');continue;}decorate(root);active=active||root.classList.contains('dm-vp-root');}document.body.classList.toggle('dm-game-viewport',active);}
 function schedule(){if(!scheduled)scheduled=requestAnimationFrame(sync);}
 new MutationObserver(records=>{if(records.some(r=>r.type==='childList'?[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches(selector+','+nativeSelector)||n.querySelector(selector+','+nativeSelector))):r.target.matches?.(selector)))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden']});
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
 // Native keyboard handling should invoke the same cleanup as the visible X.
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const root=[...document.querySelectorAll('.dm-vp-root')].filter(shown).at(-1);if(root){e.preventDefault();e.stopImmediatePropagation();void navigate(root,false);}},true);
 window.dmGameViewport={sync,navigate};sync();
})();
