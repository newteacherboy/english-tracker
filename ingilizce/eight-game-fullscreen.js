/* Only the eight approved games: fullscreen play, distinct back and close,
   and native answer text remains intact for security/verified scoring. */
(()=>{
 'use strict';
 const configs=[
  {root:'jpOyunOverlay',stages:['jpBalonEkrani','jpSoruEkrani'],open:'jpOyunAc'},
  {root:'yagmurOyunOverlay',stages:['yagmurOyunEkrani'],open:'yagmurOyunAc'},
  {root:'kelimebulOyunOverlay',stages:['kelimebulOyunEkrani'],open:'kelimebulOyunAc'},
  {root:'esOyunOverlay',stages:['esOyunEkrani'],open:'esOyunAc'},
  {root:'trenOyunOverlay',stages:['trenOyunEkrani'],open:'trenOyunAc'}
 ];
 const shown=el=>!!el?.isConnected&&el.getClientRects().length>0&&getComputedStyle(el).display!=='none';
 const overlays=configs.map(c=>({ ...c,element:document.getElementById(c.root),nodes:c.stages.map(id=>document.getElementById(id))}));
 const hbId='harfBahcesiOverlay';
 const yo=document.getElementById('yoModal');
 const isPlaying=cfg=>!!cfg.element&&shown(cfg.element)&&cfg.nodes.some(shown);
 function optionLabels(){
  const list=document.getElementById('yagmurSecenekler');if(!list)return;
  const change=()=>{
   [...list.querySelectorAll('.yg-secenek-btn')].forEach((btn,index)=>{
    // Keep textContent exactly the same as the user answer: verified-game
    // evidence is based on btn.textContent, not a boolean or decorative label.
    if(!btn.querySelector('.fg-choice-text')){
     const text=btn.textContent;
     const span=document.createElement('span');span.className='fg-choice-text';span.textContent=text;
     btn.replaceChildren(span);
    }
    btn.dataset.fgChoice=String.fromCharCode(65+index);
   });
  };
  new MutationObserver(change).observe(list,{childList:true});
  change();
 }
 optionLabels();
 function nativeClose(root){
  return root?.querySelector(':scope > .game-modal-content .game-close-btn')||
    root?.querySelector('.game-modal-content .game-close-btn')||
    root?.querySelector('.hb-card>header [data-close]')||
    root?.querySelector('.yo-kapat');
 }
 function backToEntry(root,open){
  const close=nativeClose(root);
  if(!close)return;
  close.click(); // preserves each game's own timer, music and cleanup
  if(typeof window[open]==='function'){
   requestAnimationFrame(()=>{
    if(!shown(root))window[open]();
   });
  }
 }
 function ensureBack(root,onBack){
  let back=root.querySelector(':scope > .fg-fs-back');
  if(!back){
   back=document.createElement('button');back.type='button';back.className='fg-fs-back';
   back.setAttribute('aria-label','Oyun başlangıcına geri dön');back.title='Geri';
   back.textContent='‹';root.append(back);
  }
  back.onclick=onBack;
  const close=nativeClose(root);
  if(close){
   close.classList.remove('dm-session-back');
   if(close.textContent!=='×')close.textContent='×';
   if(close.title!=='Oyunu kapat')close.title='Oyunu kapat';
   if(close.getAttribute('aria-label')!=='Oyunu kapat')close.setAttribute('aria-label','Oyunu kapat');
  }
 }
 function resizeFit(){
  // Compress decoration before any game option/input. No hiding answer content.
  for(const cfg of overlays){
   if(!cfg.element?.classList.contains('fg-fs-active'))continue;
   for(const stage of cfg.nodes){
    if(!shown(stage))continue;
    stage.classList.remove('fg-tight','fg-ultra-tight');
    const available=stage.clientHeight;
    if(stage.scrollHeight>available+2)stage.classList.add('fg-tight');
    if(stage.scrollHeight>available+2)stage.classList.add('fg-ultra-tight');
   }
  }
  const hb=document.getElementById(hbId);
  const board=hb?.querySelector('.hb-body');
  if(hb?.classList.contains('fg-fs-active')&&board){
   board.classList.remove('fg-tight','fg-ultra-tight');
   if(board.scrollHeight>board.clientHeight+2)board.classList.add('fg-tight');
   if(board.scrollHeight>board.clientHeight+2)board.classList.add('fg-ultra-tight');
  }
  if(yo?.classList.contains('fg-fs-active')){
   const body=yo.querySelector('#yoGovde');
   if(body){body.classList.remove('fg-tight','fg-ultra-tight');
    if(body.scrollHeight>body.clientHeight+2)body.classList.add('fg-tight');
    if(body.scrollHeight>body.clientHeight+2)body.classList.add('fg-ultra-tight');
   }
  }
 }
 let pending=0;
 function sync(){
  pending=0;
  for(const cfg of overlays){
   const root=cfg.element;if(!root)continue;
   const active=isPlaying(cfg);
   root.classList.toggle('fg-fs-active',active);
   if(active)ensureBack(root,()=>backToEntry(root,cfg.open));
   else root.querySelector(':scope > .fg-fs-back')?.remove();
  }
  const hb=document.getElementById(hbId);
  if(hb){
   const active=shown(hb)&&hb.classList.contains('hb-playing');
   hb.classList.toggle('fg-fs-active',active);
   if(active)ensureBack(hb,()=>backToEntry(hb,'harfBahcesiAc'));
   else hb.querySelector(':scope > .fg-fs-back')?.remove();
  }
  if(yo){
   const active=shown(yo)&&yo.classList.contains('acik')&&
      (yo.dataset.dmSelectedGame==='dikte'||yo.dataset.dmSelectedGame==='cumle');
   yo.classList.toggle('fg-fs-active',active);
   if(active)ensureBack(yo,()=>nativeClose(yo)?.click());
   else yo.querySelector(':scope > .fg-fs-back')?.remove();
  }
  const any=!!document.querySelector('.fg-fs-active');
  document.body.classList.toggle('fg-game-locked',any);
  resizeFit();
 }
 function schedule(){if(!pending)pending=requestAnimationFrame(sync);}
 for(const cfg of overlays){
  if(cfg.element)new MutationObserver(schedule).observe(cfg.element,{attributes:true,attributeFilter:['class','style']});
  for(const node of cfg.nodes)if(node)new MutationObserver(schedule).observe(node,{attributes:true,attributeFilter:['class','style']});
 }
 if(yo)new MutationObserver(schedule).observe(yo,{attributes:true,attributeFilter:['class','style','data-dm-selected-game']});
 const observeGarden=()=>{
  const hb=document.getElementById(hbId);
  if(hb&&!hb.dataset.fgObserved){
   hb.dataset.fgObserved='1';
   new MutationObserver(schedule).observe(hb,{attributes:true,attributeFilter:['class','style']});
   const body=hb.querySelector('.hb-body');
   if(body)new MutationObserver(schedule).observe(body,{childList:true});
  }
 };
 // Harf Bahçesi is dynamically inserted as one direct child of body.
 new MutationObserver(()=>{observeGarden();schedule()}).observe(document.body,{childList:true});
 observeGarden();
 window.addEventListener('resize',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 sync();
 window.dmEightGameFullscreen={sync,resizeFit,optionLabels};
})();
