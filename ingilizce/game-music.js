/* Quiet background music for games that have effects but no score of their own. */
(()=>{
 'use strict';
 const songs={
  arcade:[.24,60,[0,4,7,9,7,4,2,7,5,9,12,9,7,4,2,0]],
  stadium:[.20,58,[0,0,7,0,5,5,7,10,0,0,7,12,10,7,5,7]],
  racing:[.17,57,[0,0,7,3,0,10,7,3,5,5,12,8,5,3,7,10]],
  sky:[.36,60,[0,7,12,16,14,12,7,4,5,9,12,17,16,12,9,7]],
  puzzle:[.30,62,[0,4,2,7,4,9,7,4,5,9,7,12,9,14,12,7]],
  mystery:[.31,57,[0,3,7,3,2,5,8,5,0,3,10,7,5,8,2,7]]
 };
 const games=[
  ['#mvOverlay','racing'],
  ['#kelimeGolu','stadium'],
  ['#premiumSkillGame.psg-word-goal','stadium'],
  ['#premiumSkillGame.psg-tower','arcade'],
  ['#rallyGame','racing'],
  ['#wordWheel','arcade'],
  ['#papiCards','puzzle'],
  ['#kgOverlay','puzzle'],
  ['#soloArcadeOverlay','mystery'],
  ['#harfBahcesiOverlay','sky'],
  ['#esOyunOverlay,#trenOyunOverlay,.dm-sr-overlay','arcade'],
  ['.papizzle[open]','puzzle'],
 ];
 const selector=games.map(([q])=>q).join(',');
 const headerHosts={
  mvOverlay:'.mv-header',kelimeGolu:'.kg-header',rallyGame:'.rr-hud-stats',
  wordWheel:'.ww-shell>header',papiCards:'.pc-header',kgOverlay:'.kg-shell>header',
  soloArcadeOverlay:'.sa-header',harfBahcesiOverlay:'.hb-card>header',
  premiumSkillGame:'.psg-header'
 };
 const mutedKey='dm-game-music-muted';
 let muted=false,context,bus,current,track,timer,beat=0,scheduled=0;
 try{muted=localStorage.getItem(mutedKey)==='1';}catch{}
 function tone(midi,at,length,volume,shape){
  const wave=context.createOscillator(),gain=context.createGain();
  wave.type=shape;
  wave.frequency.value=440*2**((midi-69)/12);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(volume,at+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  wave.connect(gain).connect(bus);
  wave.start(at);wave.stop(at+length+.01);
  wave.onended=()=>{wave.disconnect();gain.disconnect();};
 }
 function playBeat(){
  const [step,base,notes]=songs[track];
  const now=context.currentTime;
  tone(base+notes[beat],now,Math.min(.42,step*1.3),.13,'triangle');
  if(beat%4===0)tone(base-12+[0,5,9,7][beat/4],now,step*2,.085,'sine');
  beat=(beat+1)%notes.length;
 }
 function stop(){
  clearInterval(timer);timer=null;
  if(bus)bus.gain.setTargetAtTime(0,context.currentTime,.035);
 }
 function paint(){
  document.querySelectorAll('.dm-game-music').forEach(button=>{
   button.textContent=muted?'♫̸':'♫';
   button.setAttribute('aria-pressed',String(!muted));
   button.title=muted?'Müziği aç':'Müziği kapat';
   button.setAttribute('aria-label',button.title);
  });
 }
 const visible=node=>!!node&&!node.hidden&&getComputedStyle(node).display!=='none'&&node.getClientRects().length>0;
 function playing(root){
  if(root.id==='premiumSkillGame')return root.dataset.gamePhase==='play'&&root.dataset.musicPaused!=='true';
  if(root.id==='rallyGame')return root.dataset.gamePhase==='playing'&&root.dataset.musicPaused!=='true';
  if(root.matches('.papizzle'))return visible(root.querySelector('[data-game]'))&&!visible(root.querySelector('[data-panel]'))&&!root.querySelector('.dmpi');
  if(root.classList.contains('dm-entry-open')||root.querySelector('.dmpi'))return false;
  // All setup/intro/result sheets stay quiet; only the live stage gets the shared score.
  const entry=root.querySelector('[id$="GirisEkrani"],.sa-entry,.hb-setup,.ww-setup,.pc-setup,.kg-setup,.mv-setup');
  if(visible(entry))return false;
  const sheet=root.querySelector('.rr-modal,.ww-modal,.pc-modal,.kg-modal,.mv-modal');
  return !visible(sheet);
 }
 function sync(){
  scheduled=0;
  const next=[...document.querySelectorAll(selector)].filter(root=>!root.closest('[hidden],[inert],[aria-hidden="true"]')&&root.getClientRects().length&&getComputedStyle(root).visibility!=='hidden').at(-1);
  const nextTrack=next?.dataset.gameMusic||games.find(([q])=>next?.matches(q))?.[1];
  if(current!==next||track!==nextTrack){stop();current=next;track=nextTrack;beat=0;}
  const host=current?.querySelector(headerHosts[current.id]||(
   current.matches('.papizzle')?'main>header':current.matches('.dm-sr-overlay')?'.dm-sr-header':'[data-game-music-host]'
  ))||current;
  if(host&&!host.querySelector(':scope > .dm-game-music')){
   current.querySelector('.dm-game-music')?.remove();
   const button=document.createElement('button');button.type='button';button.className='dm-game-music';
   button.onclick=()=>{
    muted=!muted;
    try{localStorage.setItem(mutedKey,muted?'1':'0');}catch{}
    paint();sync();
   };
   host.append(button);paint();
  }
  if(muted||document.hidden||!track||!playing(current)||current.dataset.musicPaused==='true'||current.classList.contains('sa-paused')||context?.state!=='running'){stop();return;}
  if(!timer){
   bus.gain.setTargetAtTime(.27,context.currentTime,.06);
   playBeat();timer=setInterval(playBeat,songs[track][0]*1000);
  }
 }
 function schedule(){if(!scheduled)scheduled=requestAnimationFrame(sync);}
 function unlock(){
  if(!current&&!document.querySelector('#tab-aktiviteler.active')&&!document.querySelector(selector))return;
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  try{
   if(!context){context=new Audio();bus=context.createGain();bus.gain.value=0;bus.connect(context.destination);}
   if(context.state!=='running')context.resume().then(schedule).catch(()=>{});
   schedule();
  }catch{}
 }
 document.addEventListener('click',unlock,true);
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',stop);
 window.addEventListener('pageshow',schedule);
 new MutationObserver(records=>{
  if(records.some(r=>{
   if(r.type==='attributes')return r.target===current||(current?.contains(r.target)&&(r.attributeName!=='style'||r.target.matches('[data-panel],[data-game],[id$=GirisEkrani]')))||r.target.matches?.(selector)||r.target.contains?.(current);
   return [...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(
    n.matches(selector+',header')||n.querySelector(selector+',header')
   ));
  }))schedule();
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','open','inert','aria-hidden','data-game-music','data-music-paused','data-game-phase']});
 schedule();
})();
