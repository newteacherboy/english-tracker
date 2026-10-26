/* One viewport and two explicit exits. Native game cleanup remains authoritative. */
(()=>{'use strict';
 const classics={kelimeYarismaOverlay:['kelimeYarismasiKapat','kelimeYarismasiAc'],jpOyunOverlay:['jpOyunKapat','jpOyunAc'],boslukOyunOverlay:['boslukOyunKapat','boslukOyunAc'],hafizaOyunOverlay:['hafizaOyunKapat','hafizaOyunAc'],yagmurOyunOverlay:['yagmurOyunKapat','yagmurOyunAc'],asmacaOyunOverlay:['asmacaOyunKapat','asmacaOyunAc'],kelimebulOyunOverlay:['kelimebulOyunKapat','kelimebulOyunAc'],esOyunOverlay:['esOyunKapat','esOyunAc'],trenOyunOverlay:['trenOyunKapat','trenOyunAc']};
 const modern={rallyGame:'dmRally',wordWheel:'dmWordWheel',papiCards:'dmPapiCards',meteorGame:'dmMeteor',mvOverlay:'dmMola',kgOverlay:'dmTopicGames'};
 const selector='.game-modal-overlay,#harfBahcesiOverlay,#dmGameIntro,#yoModal.acik[data-dm-selected-game],#rallyGame,#wordWheel,#papiCards,#meteorGame,#mvOverlay,#kgOverlay,#onlineMatch,#dmArenaOverlay,#dmMatchOverlay,#genelSonucOverlay.acik,#dyOyunOverlay,.dm-garden-match,.kart-oyun-overlay,.kp-shell,.ba-shell';
 // Observe the base IDs as well: when .acik is removed the element no longer
 // matches the active selector, so watching only active selectors leaves the
 // old dm-game-viewport body class set and hides the six-tab menu forever.
 const watchSelector=selector.replace('#yoModal.acik[data-dm-selected-game]','#yoModal').replace('#genelSonucOverlay.acik','#genelSonucOverlay');
 const nativeSelector='.game-close-btn,.yo-kapat,.hb-card header [data-close],.mt-exit,.ww-close,.pc-close,.mv-close,.kg-close,[data-exit],[data-close],.kp-close-x,.ba-close,.kart-oyun-kapat,.dm-x,[data-ia-close],#gsoDevamBtn';
 const shown=e=>{
  if(!e?.isConnected||e.style.display==='none'||e.hidden||e.closest('[inert],[aria-hidden="true"],[data-dm-nav-suspended]'))return false;
  const page=e.closest('.dc-fullscreen-overlay');
  if(page&&!page.classList.contains('active'))return false;
  const style=getComputedStyle(e);
  return e.getClientRects().length>0&&style.display!=='none'&&style.visibility!=='hidden'&&style.pointerEvents!=='none';
 };
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
 let scheduled=0,recheck=0;
 function sync(){
  scheduled=0;
  const view=window.visualViewport,height=(view?.height||window.innerHeight)+'px',top=(view?.offsetTop||0)+'px';
  if(document.documentElement.style.getPropertyValue('--dm-game-height')!==height)document.documentElement.style.setProperty('--dm-game-height',height);
  if(document.documentElement.style.getPropertyValue('--dm-game-top')!==top)document.documentElement.style.setProperty('--dm-game-top',top);
  let active=false;
  for(const root of document.querySelectorAll(watchSelector)){
   if(!shown(root)||!root.matches(selector)){
    if(root.classList.contains('dm-vp-root'))root.classList.remove('dm-vp-root');
    continue;
   }
   decorate(root);active=active||root.classList.contains('dm-vp-root');
  }
  document.body.classList.toggle('dm-game-viewport',active);
  // A third-party close animation may not mutate the DOM when it finishes.
  if(recheck){clearTimeout(recheck);recheck=0;}
  if(active)recheck=setTimeout(schedule,1200);
 }
 function schedule(){if(!scheduled)scheduled=requestAnimationFrame(sync);}
 const watchChange=r=>r.type==='childList'
   ?[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches(watchSelector+','+nativeSelector)||n.querySelector(watchSelector+','+nativeSelector)))
   :r.target.matches?.(watchSelector)||!!r.target.closest?.(watchSelector)||r.target===document.body;
 new MutationObserver(records=>{if(records.some(watchChange))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden','aria-hidden','inert','data-dm-nav-suspended']});
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
 // Native keyboard handling should invoke the same cleanup as the visible X.
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const root=[...document.querySelectorAll('.dm-vp-root')].filter(shown).at(-1);if(root){e.preventDefault();e.stopImmediatePropagation();void navigate(root,false);}},true);
 window.dmGameViewport={sync,navigate,diagnostics:()=>({
  locked:document.body.classList.contains('dm-game-viewport'),
  visibleGames:[...document.querySelectorAll(selector)].filter(shown).map(e=>e.id||String(e.className)).slice(0,20)
 })};sync();
})();
