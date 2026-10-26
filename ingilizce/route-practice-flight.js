/* Approved flight #1. Presentation only: no answers, energy or rewards are written here. */
(()=>{'use strict';
const SHEET='route-assets/papi-practice-flight.webp',DURATION=5500;
let run=null,atlas=null,loading=null,audio=null;
const muted=()=>window.dmSoundEnabled===false||window.dmSesAcik===false||localStorage.getItem('dm_sound_muted')==='1';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function preload(){if(atlas)return Promise.resolve(atlas);if(loading)return loading;loading=new Promise(resolve=>{const image=new Image();image.onload=()=>{atlas=image;resolve(image);};image.onerror=()=>resolve(null);image.src=SHEET;});return loading;}
function prepare(){void preload();if(muted())return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)audio=audio||new Audio();if(audio?.state==='suspended')void audio.resume().catch(()=>{});}catch{}}
function chime(){if(muted()||!audio||audio.state!=='running')return;try{const at=audio.currentTime;[523.25,659.25,783.99,1046.5].forEach((freq,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=at+i*.085;o.type='sine';o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.23);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.25);o.onended=()=>{o.disconnect();g.disconnect();};});}catch{}}
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},mix=(a,b,p)=>a+(b-a)*p;
function cancel(){run?.finish(false);}
function play({isCurrent=()=>true,onExit=()=>{},sound=true}={}){
 if(run)return run.promise;if(!isCurrent())return Promise.resolve(false);
 prepare();try{speechSynthesis.cancel();}catch{}
 const root=document.createElement('div');root.id='dmRoutePracticeFlight';root.className='dm-route-flight';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Haydi pratik zamanı!');
 root.innerHTML='<canvas class="dm-route-flight-canvas" aria-hidden="true"></canvas><img class="dm-route-flight-fallback" src="papi-welcome-v2.png" alt="Uçarak gelen Papi" hidden><div class="dm-route-flight-copy"><h2>Haydi pratik<br>zamanı!</h2><p>Öğrendiklerini şimdi deneyelim.</p></div><button type="button" class="dm-route-flight-exit" aria-label="Parkura dön">×</button><button type="button" class="dm-route-flight-skip">Pratiğe geç →</button>';
 document.body.append(root);const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),blend=document.createElement('canvas'),bc=blend.getContext('2d'),copy=root.querySelector('.dm-route-flight-copy'),fallback=root.querySelector('img'),before=document.activeElement;
 let resolve;const promise=new Promise(r=>resolve=r),state={promise,frame:0,elapsed:0,last:performance.now(),announced:false,finish(complete){if(run!==state)return;cancelAnimationFrame(state.frame);root.remove();run=null;before?.isConnected&&before.focus?.({preventScroll:true});resolve(complete);}};run=state;
 root.querySelector('.dm-route-flight-exit').onclick=()=>{state.finish(false);onExit();};root.querySelector('.dm-route-flight-skip').onclick=()=>state.finish(true);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();root.querySelector('.dm-route-flight-exit').click();}if(e.key==='Tab'){e.preventDefault();const buttons=[...root.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});
 root.querySelector('.dm-route-flight-skip').focus({preventScroll:true});
 const isReduced=reduced(),duration=isReduced?1000:DURATION;
 function tick(now){
  if(run!==state)return;if(!isCurrent()){state.finish(false);return;}
  const delta=Math.min(50,Math.max(0,now-state.last));state.last=now;if(!document.hidden)state.elapsed+=delta;
  const t=state.elapsed/1000+.8,arrived=isReduced||t>=2.65;
  if(arrived&&!state.announced){state.announced=true;if(sound)chime();if(!isReduced)try{navigator.vibrate?.([35,25,45]);}catch{}}
  const alpha=isReduced?1:ease((t-2.65)/.42)*(1-ease((t-5.25)/.48));copy.style.opacity=String(alpha);copy.style.transform='translateY('+(28*(1-alpha))+'px)';
  const w=root.clientWidth,h=root.clientHeight,dpr=Math.min(devicePixelRatio||1,2),cw=Math.round(w*dpr),ch=Math.round(h*dpr);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  if(ctx){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);}
  const scale=Math.min(w/720,h/1280),ox=(w-720*scale)/2,oy=(h-1280*scale)/2;
  let x=360,y=515,size=600,angle=0;
  if(!isReduced){if(t<2.65){const p=ease((t-.8)/1.85);x=mix(-370,360,p);y=mix(1010,520,p)-190*Math.sin(Math.PI*p);size=mix(225,600,p);angle=mix(-23,0,p);}else if(t<5.25){x=360+Math.sin(t*2.1)*10;y=515+Math.sin(t*3.8)*14;angle=Math.sin(t*2.2)*2;}else{const p=ease((t-5.25)/1.05);x=mix(360,1120,p);y=mix(515,-280,p)-70*Math.sin(Math.PI*p);size=mix(600,330,p);angle=-25*p;}}
  if(ctx&&atlas&&bc){
   fallback.hidden=true;const cell=atlas.width/3,offsets=[[-36,4],[0,0],[-4,0]],cycle=[0,1,2,1],phase=(t*3.6%1)*4,k=isReduced?1:Math.floor(phase),p=isReduced?0:ease(phase-k);
   if(blend.width!==cell||blend.height!==atlas.height){blend.width=cell;blend.height=atlas.height;}else bc.clearRect(0,0,cell,atlas.height);bc.globalCompositeOperation='lighter';
   for(const [index,opacity]of [[cycle[k],1-p],[cycle[(k+1)%4],p]]){bc.globalAlpha=opacity;bc.drawImage(atlas,index*cell,0,cell,atlas.height,offsets[index][0],offsets[index][1],cell,atlas.height);}
   ctx.save();ctx.translate(ox+x*scale,oy+y*scale);ctx.rotate(-angle*Math.PI/180);const d=size*1.23*scale;ctx.drawImage(blend,-d/2,-d/2,d,d);ctx.restore();
   if(!isReduced){ctx.save();for(let i=0;i<20;i++){const px=(i*137+60+Math.sin(t*.8+i)*42)%720,py=((i*173-t*42)%1280+1280)%1280;ctx.globalAlpha=.35;ctx.fillStyle=i%3?'#fffdf3':'#ffd06a';ctx.beginPath();ctx.arc(ox+px*scale,oy+py*scale,(2+i%3)*scale,0,Math.PI*2);ctx.fill();}ctx.restore();}
  }else{fallback.hidden=false;}
  if(state.elapsed>=duration){state.finish(true);return;}state.frame=requestAnimationFrame(tick);
 }
 state.frame=requestAnimationFrame(tick);return promise;
}
window.dmRoutePracticeFlight={play,prepare,preload,cancel,active:()=>!!run};document.addEventListener('dm:login',cancel);window.addEventListener('pagehide',cancel);
})();
