/* One viewport and two explicit exits. Native game cleanup remains authoritative. */
(()=>{'use strict';
 const classics={kelimeYarismaOverlay:['kelimeYarismasiKapat','kelimeYarismasiAc'],jpOyunOverlay:['jpOyunKapat','jpOyunAc'],boslukOyunOverlay:['boslukOyunKapat','boslukOyunAc'],hafizaOyunOverlay:['hafizaOyunKapat','hafizaOyunAc'],yagmurOyunOverlay:['yagmurOyunKapat','yagmurOyunAc'],asmacaOyunOverlay:['asmacaOyunKapat','asmacaOyunAc'],kelimebulOyunOverlay:['kelimebulOyunKapat','kelimebulOyunAc'],esOyunOverlay:['esOyunKapat','esOyunAc'],trenOyunOverlay:['trenOyunKapat','trenOyunAc']};
 const classicStages={kelimeYarismaOverlay:['ky','#kyOyunEkrani'],jpOyunOverlay:['jp','#jpBalonEkrani,#jpSoruEkrani'],boslukOyunOverlay:['bosluk','#boslukOyunEkrani'],hafizaOyunOverlay:['hafiza','#hafizaOyunEkrani'],yagmurOyunOverlay:['yagmur','#yagmurOyunEkrani'],asmacaOyunOverlay:['asmaca','#asmacaOyunEkrani'],kelimebulOyunOverlay:['kelimebul','#kelimebulOyunEkrani'],esOyunOverlay:['es','#esOyunEkrani'],trenOyunOverlay:['tren','#trenOyunEkrani']};
 const modern={kelimeGolu:'dmKelimeGolu',rallyGame:'dmRally',wordWheel:'dmWordWheel',papiCards:'dmPapiCards',meteorGame:'dmMeteor',mvOverlay:'dmMola',kgOverlay:'dmTopicGames'};
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
 function classicPause(root){
  const config=classicStages[root.id];
  if(!config||!window.dmLocalGamePause)return;
  const [key,stage]=config,round=window.OC?.aktif;
  if(round?.oyun===key&&round.pauseAt&&!round.bitti)return;
  const playing=round?.oyun===key&&!round.bitti&&[...root.querySelectorAll(stage)].some(shown);
  let button=root.querySelector(':scope > .dm-vp-pause');
  if(!playing){
   button?.remove();root.querySelector(':scope > .dm-game-pause-sheet button')?.click();
   return;
  }
  if(button)return;
  button=document.createElement('button');button.type='button';button.className='dm-local-game-pause dm-vp-pause';
  button.setAttribute('aria-label','Oyunu duraklat');button.textContent='Ⅱ';
  button.onclick=()=>{
   const activeRound=window.OC?.aktif;
   if(activeRound?.oyun!==key||activeRound.bitti||activeRound.pauseAt)return;
   activeRound.pauseAt=Date.now();
   window.dmClassicGameAudio?.[key]?.[0]();
   window.speechSynthesis?.cancel();
   window.dmLocalGamePause(root,root.querySelector('.game-modal-content'),elapsed=>{
    delete activeRound.pauseAt;
    if(activeRound!==window.OC?.aktif||activeRound.bitti||!shown(root))return;
    activeRound.bas+=elapsed;
    window.dmClassicGameClocks?.[key]?.(elapsed);
    window.dmClassicGameAudio?.[key]?.[1]();
   });
  };
  root.append(button);
 }
 function decorate(root){
  if(root.id==='kelimeGolu'||root.id==='mvOverlay'&&root.querySelector('.mv-header [data-exit]')||
     root.id==='kgOverlay'&&root.querySelector('.kg-shell header [data-close]')){if(!root.classList.contains('dm-vp-root'))root.classList.add('dm-vp-root');return;}
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
    if(classicStages[root.id]){
     root.querySelector(':scope > .dm-game-pause-sheet button')?.click();
     root.querySelector(':scope > .dm-vp-pause')?.remove();
    }
    continue;
   }
   decorate(root);classicPause(root);active=active||root.classList.contains('dm-vp-root');
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
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
 // Native keyboard handling should invoke the same cleanup as the visible X.
 document.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.target.closest?.('.dm-game-pause-sheet'))return;const root=[...document.querySelectorAll('.dm-vp-root')].filter(shown).at(-1);if(root){e.preventDefault();e.stopImmediatePropagation();void navigate(root,false);}},true);
 window.dmGameViewport={sync,navigate,diagnostics:()=>({
  locked:document.body.classList.contains('dm-game-viewport'),
  visibleGames:[...document.querySelectorAll(selector)].filter(shown).map(e=>e.id||String(e.className)).slice(0,20)
 })};sync();
})();

/* One visible toolbar, driven by each game's own navigation, audio and pause handlers. */
(()=>{
 'use strict';
 const roots='.game-modal-overlay,#dmGameIntro,#yoModal.acik[data-dm-selected-game],#harfBahcesiOverlay,#rallyGame,#wordWheel,#papiCards,#meteorGame,#mvOverlay,#kgOverlay,#onlineMatch,#dmArenaOverlay,#dmMatchOverlay,#dyOyunOverlay,.dm-garden-match,.kart-oyun-overlay,.dm-sr-overlay,#pwmRoot,dialog.papizzle[open],dialog.dm-flight[open],dialog.dm-blocks[open]';
 const fields='select:is(#mtGrade,#mtUnit,#wwGrade,#wwUnit,#pcGrade,#pcUnit,[data-grade],[data-class],[data-unit],[data-players],[data-duration])';
 const grades='select:is(#mtGrade,#wwGrade,#pcGrade,[data-grade],[data-class])';
 const units='.unite-secim-box,.hb-units,.kg-units,.rr-units,.dm-sr-units';
 const controls={
  back:'button[data-back],button.dm-vp-back,button.fg-fs-back',
  exit:'button[data-exit],button.dm-vp-exit,button.game-close-btn,button[data-close],button.mt-exit,button.ww-close,button.pc-close,button.yo-kapat,button.kart-oyun-kapat,button.dm-x,button[data-ia-close]',
  pause:'button[data-pause],button.dm-vp-pause,button.rr-pause,button.mt-pause',
  sound:'button.dm-game-music,button[data-sound],button[data-audio-toggle],button[id$="MuzikBtn"],button.mt-music,button.mt-effects'
 };
 const labels={back:'Geri dön',exit:'Oyunu kapat',pause:'Oyunu duraklat',sound:'Sesi kapat'};
 const paths={back:'M19 12H5m7-7-7 7 7 7',exit:'m6 6 12 12M18 6 6 18',pause:'M9 5v14m6-14v14',sound:'M3 9h4l5-4v14l-5-4H3zm13-1q5 4 0 8',muted:'M3 9h4l5-4v14l-5-4H3zm13 0 5 6m0-6-5 6'};
 const icon=key=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[key]+'"/></svg>';
 const choiceGroups=new WeakMap();
 let scheduled=false,bank,unitTitles=new Map();
 function titleFor(grade,unit){
  const words=window.masterKelimeHavuzu;
  if(bank!==words){
   bank=words;
   unitTitles=new Map();
   for(const word of words||[]){
    const key=Number(word.sinif)+':'+Number(word.unite),title=String(word.unit_name||word.unit_title||'').trim();
    if(title&&!unitTitles.has(key))unitTitles.set(key,title);
   }
  }
  return unitTitles.get(grade+':'+unit)||'';
 }
 const setAttr=(el,key,value)=>{if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
 function currentGrade(root){
  return Number(root.querySelector(grades)?.value)||
   Number(root.querySelector('.sinif-btn.active')?.dataset.class)||
   Number(root.querySelector('.sinif-btn.active')?.textContent.match(/\d+/)?.[0])||0;
 }
 function unitCard(tile,n,title){
  if(!Number.isInteger(n)||n<1)return;
  for(const node of [...tile.childNodes]){
   if(node.nodeType!==3||!node.textContent.trim())continue;
   const original=document.createElement('span');
   node.before(original);original.append(node);
  }
  setAttr(tile,'data-unit-number',String(n));
  setAttr(tile,'data-unit-title',title||'Ünite');
  setAttr(tile.querySelector('input')||tile,'aria-label',n+'. Ünite'+(title?' · '+title:''));
 }
 function selectChoices(select,grade){
  const kind=select.matches(grades)?'grade':select.matches('[data-players]')?'mode':select.matches('[data-duration]')?'time':'unit';
  const label={grade:'Sınıf',unit:'Ünite',mode:'Oyuncu sayısı',time:'Soru süresi'}[kind];
  let state=choiceGroups.get(select);
  if(!state){
   const group=document.createElement('div');
   group.className='dm-picker-grid';group.dataset.kind=kind;
   group.setAttribute('role','group');group.setAttribute('aria-label',label);
   select.after(group);select.classList.add('dm-picker-native');
   choiceGroups.set(select,state={group,signature:''});
  }
  const options=[...select.options].filter(option=>option.value!==''&&!option.hidden);
  const choices=options.map(option=>{
   const value=option.value,n=Number(value);
   const title=kind==='unit'?titleFor(grade,n):'';
   const text=kind==='grade'?String(n):kind==='mode'?(n===1?'Tek Kişilik':'İki Kişilik'):option.textContent.trim();
   return {value,text,title,disabled:select.disabled||option.disabled};
  });
  const signature=JSON.stringify(choices);
  if(state.signature!==signature){
   state.signature=signature;
   state.group.replaceChildren(...choices.map(choice=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.value=choice.value;button.disabled=choice.disabled;
    button.textContent=choice.text;
    if(kind==='unit')unitCard(button,Number(choice.value),choice.title||choice.text.replace(/^\s*\d+\s*\.?\s*(?:Ünite)?\s*[:·–-]?\s*/i,''));
    button.onclick=()=>{
     if(select.disabled||button.disabled)return;
     select.value=choice.value;
     select.dispatchEvent(new Event('change',{bubbles:true}));
     updateSelections();
    };
    return button;
   }));
  }
  function updateSelections(){
   for(const button of state.group.children)setAttr(button,'aria-pressed',String(button.dataset.value===select.value));
  }
  updateSelections();
  const hidden=choices.length===0;if(state.group.hidden!==hidden)state.group.hidden=hidden;
 }
 function enhanceSetup(root){
  const grade=currentGrade(root);
  for(const select of root.querySelectorAll(fields))selectChoices(select,grade);
  for(const grid of root.querySelectorAll(units)){
   for(const tile of grid.querySelectorAll('button,label.kg-unit')){
    const n=Number(tile.dataset.unit||tile.querySelector('input')?.value||tile.textContent.match(/\d+/)?.[0]);
    unitCard(tile,n,titleFor(grade,n));
   }
  }
 }
 function sourceFor(root,kind){
  const candidates=[...root.querySelectorAll(controls[kind])].filter(button=>
   !button.hidden&&!button.matches('.dm-frame-control')&&(kind==='sound'||!button.closest('[hidden],[inert],[aria-hidden="true"],[style*="display: none"],[style*="display:none"]'))
  );
  if(kind==='exit')return [...candidates.filter(button=>button.matches('.dm-vp-exit,[data-exit]')),
   ...candidates.filter(button=>!button.matches('.dm-vp-exit,[data-exit]'))];
  return candidates;
 }
 function soundOff(button){
  const label=(button.getAttribute('aria-label')||button.title||button.textContent).trim();
  if(/kapalı|aç$|etkinleştir|🔇|♪̸|♫̸/i.test(label))return true;
  if(/açık/i.test(label))return false;
  return button.getAttribute('aria-pressed')==='false';
 }
 function frame(root){
  let strip=root.querySelector(':scope > .dm-game-frame');
  if(!strip){
   strip=document.createElement('div');strip.className='dm-game-frame';
   strip.setAttribute('role','group');strip.setAttribute('aria-label','Oyun kontrolleri');
   strip.innerHTML='<button class="dm-frame-control" data-frame="back" type="button">'+icon('back')+'</button><b>Diji Medu</b>'+
    ['sound','pause','exit'].map(key=>'<button class="dm-frame-control" data-frame="'+key+'" type="button">'+icon(key)+'</button>').join('');
   root.prepend(strip);
  }
  if(!root.classList.contains('dm-game-framed'))root.classList.add('dm-game-framed');
  for(const key of Object.keys(controls)){
   const button=strip.querySelector('[data-frame="'+key+'"]'),sources=sourceFor(root,key);
   const originals=key==='pause'?root.querySelectorAll(controls.pause):sources;
   for(const source of originals)if(!source.classList.contains('dm-frame-source'))source.classList.add('dm-frame-source');
   const active=(key==='back'&&!sources.length?sourceFor(root,'exit'):sources).filter(source=>!source.disabled);
   const native=root.dmGameFrameActions?.[key];
   const viewport=key==='back'?root.querySelector(':scope > .dm-vp-back'):null;
   const localBack=key==='back'?active.find(source=>source.matches('[data-back]')):null;
   const resume=key==='pause'&&root.querySelector('.dm-game-pause-sheet button');
   const muted=key==='sound'&&active.length>0&&active.every(soundOff);
   const label=resume?'Oyuna devam et':muted?'Sesi aç':labels[key];
   setAttr(button,'aria-label',label);
   setAttr(button,'title',label);
   if(key==='sound'){
    setAttr(button,'aria-pressed',String(!muted&&active.length>0));
    if(button.dataset.muted!==String(muted)){button.dataset.muted=String(muted);button.innerHTML=icon(muted?'muted':'sound');}
   }
   const disabled=!active.length&&!native&&!resume;
   if(button.disabled!==disabled)button.disabled=disabled;
   button.onclick=()=>{
    if(resume)resume.click();
    else if(native)native();
    else if(localBack)localBack.click();
    else if(viewport)viewport.click();
    else if(key==='sound'){for(const source of active)if(soundOff(source)===muted)source.click();}
    else active[0]?.click();
    schedule();
   };
  }
 }
 function sync(){
  scheduled=false;
  for(const root of document.querySelectorAll('.dm-game-framed')){
   if(root.matches(roots))continue;
   root.classList.remove('dm-game-framed');
   root.querySelector(':scope > .dm-game-frame')?.remove();
   for(const source of root.querySelectorAll('.dm-frame-source'))source.classList.remove('dm-frame-source');
   for(const select of root.querySelectorAll('.dm-picker-native')){
    choiceGroups.get(select)?.group.remove();choiceGroups.delete(select);select.classList.remove('dm-picker-native');
   }
  }
  for(const root of document.querySelectorAll(roots)){
   if(root.hidden||!root.getClientRects().length||root.closest('[inert],[aria-hidden="true"],[data-dm-nav-suspended]'))continue;
   frame(root);enhanceSetup(root);
  }
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}
 const tracked=roots+',.dm-game-framed,#yoModal,'+fields+',option,header,.dm-game-music,.dm-vp-pause,.dm-game-pause-sheet,.sinif-btn,'+units;
 new MutationObserver(records=>{
  if(records.some(r=>r.type==='attributes'
   ?r.target.matches?.(tracked)||r.target.matches?.('button,input')&&!!r.target.closest?.(roots)&&!r.target.matches('.dm-frame-control')
   :r.target.matches?.(fields+','+units)||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches(tracked)||n.querySelector(tracked)))
  ))schedule();
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled','open','aria-pressed','aria-label','style']});
 document.addEventListener('change',event=>{if(event.target.closest?.(roots))schedule();});
 sync();
})();
