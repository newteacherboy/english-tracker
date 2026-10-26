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
// Approved soft feather shower: deterministic, bounded particles and no reward writes.
function feathers(ctx,t,front,scale,ox,oy){
 ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
 const colors=[['#47c88f','#218b70'],['#a6dc64','#5f9f3e'],['#ffc75b','#da9f38'],['#77d6d9','#409bba']];
 for(let i=0;i<28;i++){
  const age=t-1.75-(i%10)*.065;if(age<0||age>4.3||(i%3===0)!==front)continue;
  const a=i*2.399,v=90+i*37%180,x=360+Math.cos(a)*v*Math.min(age,1.35)+Math.sin(age*2+i)*32,y=510+Math.sin(a)*80*age+52*age*age,z=.30+i%5*.065;
  ctx.save();ctx.globalAlpha=Math.min(1,age/.18)*Math.min(1,(4.3-age)/.6);ctx.translate(x,y);ctx.rotate(-(Math.sin(age*2+i)*46+a*180/Math.PI)*Math.PI/180);ctx.scale(z,z);ctx.translate(-40,-74);
  const [color,edge]=colors[i%4];ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(39,60,27,56,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(22,76);ctx.lineTo(39,130);ctx.lineTo(63,72);ctx.fill();ctx.strokeStyle=edge;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(40,23);ctx.lineTo(37,140);ctx.stroke();ctx.lineWidth=2;
  for(let k=0;k<5;k++){const y=39+k*15;ctx.beginPath();ctx.moveTo(38,y+15);ctx.lineTo(18,y);ctx.moveTo(39,y+11);ctx.lineTo(60,y-4);ctx.stroke();}ctx.restore();
 }ctx.restore();
}
function cancel(){run?.finish(false);}
function play({isCurrent=()=>true,onExit=()=>{},sound=true,mode='practice',gain=1}={}){
 if(run)return run.promise;if(!isCurrent())return Promise.resolve(false);
 const combo=mode==='combo';prepare();try{speechSynthesis.cancel();}catch{}
 const root=document.createElement('div');root.id='dmRoutePracticeFlight';root.className='dm-route-flight';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Haydi pratik zamanı!');
 root.innerHTML='<canvas class="dm-route-flight-canvas" aria-hidden="true"></canvas><img class="dm-route-flight-fallback" src="papi-welcome-v2.png" alt="Uçarak gelen Papi" hidden><div class="dm-route-flight-copy"><h2>Haydi pratik<br>zamanı!</h2><p>Öğrendiklerini şimdi deneyelim.</p></div><button type="button" class="dm-route-flight-exit" aria-label="Parkura dön">×</button><button type="button" class="dm-route-flight-skip">Pratiğe geç →</button>';
 if(combo){
  root.classList.add('dm-route-flight-combo');root.setAttribute('aria-label','5 kombo! +'+gain+' enerji kazandın.');
  root.querySelector('.dm-route-flight-copy').innerHTML='<h2>5 KOMBO!</h2><p>Art arda 5 doğru!</p>';
  const reward=document.createElement('div');reward.className='dm-route-flight-energy';reward.setAttribute('role','status');reward.innerHTML='<span class="dm-route-flight-bolt" aria-hidden="true"><svg viewBox="0 0 32 38"><path d="M20 2 4 22h11l-3 14L29 15H18Z" fill="#eab125"/></svg></span><span><b>+'+gain+'</b><small>ENERJİ</small></span>';root.append(reward);
  const caption=document.createElement('p');caption.className='dm-route-flight-energy-caption';caption.textContent='Enerjin yenilendi!';root.append(caption);
  root.querySelector('.dm-route-flight-skip').textContent='Devam et →';
 }
 document.body.append(root);const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),blend=document.createElement('canvas'),bc=blend.getContext('2d'),copy=root.querySelector('.dm-route-flight-copy'),fallback=root.querySelector('img'),before=document.activeElement;
 let resolve;const promise=new Promise(r=>resolve=r),state={promise,frame:0,elapsed:0,last:performance.now(),announced:false,rewardAnnounced:false,finish(complete){if(run!==state)return;cancelAnimationFrame(state.frame);root.remove();run=null;before?.isConnected&&before.focus?.({preventScroll:true});resolve(complete);}};run=state;
 root.querySelector('.dm-route-flight-exit').onclick=()=>{state.finish(false);onExit();};root.querySelector('.dm-route-flight-skip').onclick=()=>state.finish(true);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();root.querySelector('.dm-route-flight-exit').click();}if(e.key==='Tab'){e.preventDefault();const buttons=[...root.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});
 root.querySelector('.dm-route-flight-skip').focus({preventScroll:true});
 const isReduced=reduced(),duration=isReduced?1000:combo?6200:DURATION;
 function tick(now){
  if(run!==state)return;if(!isCurrent()){state.finish(false);return;}
  const delta=Math.min(50,Math.max(0,now-state.last));state.last=now;if(!document.hidden)state.elapsed+=delta;
  const t=state.elapsed/1000+(combo?.5:.8),arrived=isReduced||t>=(combo?2:2.65);
  if(arrived&&!state.announced){state.announced=true;if(sound)chime();if(!isReduced&&!combo)try{navigator.vibrate?.([35,25,45]);}catch{}}
  const alpha=isReduced?1:combo?ease((t-2.05)/.3)*(1-ease((t-5.3)/.25)):ease((t-2.65)/.42)*(1-ease((t-5.25)/.48));copy.style.opacity=String(alpha);copy.style.transform='translateY('+(28*(1-alpha))+'px)';
  if(combo){
   const p=isReduced?1:ease((t-3.35)/.6),fade=isReduced?1:1-ease((t-6.45)/.25),size=(.45+.55*p+(isReduced?0:.09*Math.sin(Math.max(0,t-3.35)*8)*Math.exp(-Math.max(0,t-3.35)*2)))*fade;
   const reward=root.querySelector('.dm-route-flight-energy');reward.style.opacity=String(p*fade);reward.style.transform='translate(-50%,-50%) scale('+size+')';
   root.querySelector('.dm-route-flight-energy-caption').style.opacity=String(isReduced?1:ease((t-4.1)/.4)*(1-ease((t-5.95)/.3)));
   if(p>0&&!state.rewardAnnounced){state.rewardAnnounced=true;if(sound&&!isReduced)chime();if(!isReduced)try{navigator.vibrate?.([35,25,45]);}catch{}}
  }
  const w=root.clientWidth,h=root.clientHeight,dpr=Math.min(devicePixelRatio||1,2),cw=Math.round(w*dpr),ch=Math.round(h*dpr);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  if(ctx){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);}
  const scale=Math.min(w/720,h/1280),ox=(w-720*scale)/2,oy=(h-1280*scale)/2;
  let x=360,y=515,size=600,angle=0;
  if(!isReduced){if(t<2.65){const p=ease((t-.8)/1.85);x=mix(-370,360,p);y=mix(1010,520,p)-190*Math.sin(Math.PI*p);size=mix(225,600,p);angle=mix(-23,0,p);}else if(t<5.25){x=360+Math.sin(t*2.1)*10;y=515+Math.sin(t*3.8)*14;angle=Math.sin(t*2.2)*2;}else{const p=ease((t-5.25)/1.05);x=mix(360,1120,p);y=mix(515,-280,p)-70*Math.sin(Math.PI*p);size=mix(600,330,p);angle=-25*p;}}
  if(combo){
   y=495;size=590;
   if(!isReduced){if(t<2){const p=ease((t-.5)/1.5);x=mix(-300,360,p);y=mix(880,500,p)-125*Math.sin(Math.PI*p);size=mix(260,590,p);angle=mix(-23,0,p);}else if(t<5.6){x=360+Math.sin(t*2)*9;y=495+Math.sin(t*4)*14;angle=Math.sin(t*2)*2;}else{const p=ease((t-5.6)/1.05);x=mix(360,1030,p);y=mix(495,-240,p);size=mix(590,280,p);angle=-23*p;}}
   if(ctx&&!isReduced)feathers(ctx,t,false,scale,ox,oy);
  }
  if(ctx&&atlas&&bc){
   fallback.hidden=true;const cell=atlas.width/3,offsets=[[-36,4],[0,0],[-4,0]],cycle=[0,1,2,1],phase=(t*3.6%1)*4,k=isReduced?1:Math.floor(phase),p=isReduced?0:ease(phase-k);
   if(blend.width!==cell||blend.height!==atlas.height){blend.width=cell;blend.height=atlas.height;}else bc.clearRect(0,0,cell,atlas.height);bc.globalCompositeOperation='lighter';
   for(const [index,opacity]of [[cycle[k],1-p],[cycle[(k+1)%4],p]]){bc.globalAlpha=opacity;bc.drawImage(atlas,index*cell,0,cell,atlas.height,offsets[index][0],offsets[index][1],cell,atlas.height);}
   ctx.save();ctx.translate(ox+x*scale,oy+y*scale);ctx.rotate(-angle*Math.PI/180);const d=size*1.23*scale;ctx.drawImage(blend,-d/2,-d/2,d,d);ctx.restore();
   if(!isReduced){ctx.save();for(let i=0;i<20;i++){const px=(i*137+60+Math.sin(t*.8+i)*42)%720,py=((i*173-t*42)%1280+1280)%1280;ctx.globalAlpha=.35;ctx.fillStyle=i%3?'#fffdf3':'#ffd06a';ctx.beginPath();ctx.arc(ox+px*scale,oy+py*scale,(2+i%3)*scale,0,Math.PI*2);ctx.fill();}ctx.restore();}
  }else{fallback.hidden=false;}
  if(combo&&ctx&&!isReduced)feathers(ctx,t,true,scale,ox,oy);
  if(state.elapsed>=duration){state.finish(true);return;}state.frame=requestAnimationFrame(tick);
 }
 state.frame=requestAnimationFrame(tick);return promise;
}
function playCombo(options={}){const gain=Number(options.gain??1);return Number.isFinite(gain)&&gain>0?play({...options,mode:'combo',gain}):Promise.resolve(false);}
window.dmRoutePracticeFlight={play,playCombo,prepare,preload,cancel,active:()=>!!run};document.addEventListener('dm:login',cancel);window.addEventListener('pagehide',cancel);
})();
