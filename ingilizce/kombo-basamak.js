/* [11 Kas 2026] 5'li kombo animasyonu · tasarım D ("alev basamakları").
   Altta 5 basamak belirir; 3D Papi soldan yürüyüp her basamağa basınca basamak alev alır (1..5),
   son basamakta zıplayıp "Kombo!" der, kombo sesi çalar ve "KOMBO x5 · +N enerji" rozeti çıkar.
   Bittiğinde Papi sağdan çıkar ve söz bitince (Promise) soru kendiliğinden devam eder (thematic-learning.js).
   Ödül sunucudan gelir; burası yalnızca gösterir. */
(()=>{
 'use strict';
 if(window.dmComboSteps)return;
 const CSS=`
.qk-root{position:fixed;inset:0;z-index:2147483647;pointer-events:none;overflow:hidden;font-family:Nunito,system-ui,sans-serif}
.qk-veil{position:absolute;left:0;right:0;bottom:0;height:min(380px,48vh);background:linear-gradient(180deg,#FFF5E600,#FFF1DCF5 32%,#FFE2B8);opacity:0}
.qk-tile{position:absolute;border-radius:16px;background:#E9D7BF;box-shadow:0 5px 0 #CDB596;display:flex;align-items:center;justify-content:center;opacity:0;color:#fff;font:900 22px/1 Nunito,system-ui,sans-serif}
.qk-tile.is-lit{background:linear-gradient(180deg,#FFB13B,#FF7A00);box-shadow:0 5px 0 #C95F00,0 0 18px #FFB13B99}
.qk-tile em{position:absolute;top:-32px;left:50%;margin-left:-17px;font-style:normal;font-size:34px;line-height:1;opacity:0;transform-origin:50% 100%}
.qk-papi{position:absolute;left:0;width:116px;height:128px}
.qk-papi .qk-hop{width:100%;height:100%;transform-origin:50% 100%}
.qk-papi .dm-lp{display:block;width:100%;height:100%}
.qk-papi .qk-shadow{position:absolute;left:50%;bottom:-6px;width:70%;height:14px;margin-left:-35%;border-radius:50%;background:rgba(15,39,71,.22);filter:blur(2px)}
.qk-say{position:absolute;right:104px;top:20px;padding:9px 14px;border-radius:18px 18px 4px 18px;background:#fff;box-shadow:0 4px 0 #FFB13B;color:#C95F00;font:900 22px/1 Nunito,system-ui,sans-serif;white-space:nowrap;opacity:0}
.qk-badge{position:absolute;left:50%;display:flex;align-items:center;gap:10px;padding:12px 20px;border-radius:24px;background:linear-gradient(180deg,#FFB13B,#FF7A00);box-shadow:0 6px 0 #C95F00,0 12px 30px #FF7A0066;color:#fff;white-space:nowrap;opacity:0;isolation:isolate}
.qk-badge .qk-big{font:900 30px/1 Nunito,system-ui,sans-serif;text-shadow:0 3px 0 #C95F00}
.qk-badge .qk-gain{margin-top:5px;display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:10px;background:#fff;color:#1E64C2;font-size:14px;font-weight:900}
.qk-ring{position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px;border-radius:50%;border:4px solid #FFC531;opacity:0;z-index:-1}
#dmStoryLesson.qc-combo .qc-sheet{transform:translateY(calc(100% + 80px))!important}
`;
 function style(){if(document.getElementById('qkStyle'))return;const s=document.createElement('style');s.id='qkStyle';s.textContent=CSS;document.head.append(s);}
 const reduce=()=>matchMedia?.('(prefers-reduced-motion: reduce)').matches;

 let audio=null;
 function sound(){
  try{
   if(window.dmSoundEnabled===false||window.dmSesAcik===false||localStorage.getItem('dm_sound_muted')==='1')return;
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=audio||new AC();if(audio.state==='suspended')audio.resume();
   const t=audio.currentTime;
   [523,659,784,1047,1319].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t+i*.07);g.gain.linearRampToValueAtTime(.18,t+i*.07+.02);g.gain.exponentialRampToValueAtTime(.001,t+i*.07+.32);o.connect(g).connect(audio.destination);o.start(t+i*.07);o.stop(t+i*.07+.35);});
   const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(880,t+.38);o.frequency.exponentialRampToValueAtTime(1760,t+.6);g.gain.setValueAtTime(.0001,t+.38);g.gain.exponentialRampToValueAtTime(.16,t+.42);g.gain.exponentialRampToValueAtTime(.001,t+.75);o.connect(g).connect(audio.destination);o.start(t+.38);o.stop(t+.8);
  }catch{}
 }
 const papiMarkup=()=>window.dmLivePapi?.markup?'<span class="dm-lp dm-lp-mini" aria-hidden="true">'+window.dmLivePapi.markup()+'</span>':'<img src="study-assets/papi-explain.png" alt="" style="width:100%;height:100%;object-fit:contain">';
 const wait=ms=>new Promise(r=>setTimeout(r,ms));

 async function play({gain=1,isCurrent=()=>true,sound:withSound=true,host=null}={}){
  style();
  const W=innerWidth,H=innerHeight,pad=Math.max(14,Math.round(W*.05)),gap=8;
  const tw=Math.min(64,Math.floor((Math.min(W,520)-pad*2-gap*4)/5)),th=Math.round(tw*.9);
  const left0=Math.round((W-(tw*5+gap*4))/2),tileTop=H-th-Math.max(54,Math.round(H*.1));
  const xs=[0,1,2,3,4].map(i=>left0+i*(tw+gap));
  const root=document.createElement('div');root.className='qk-root';root.setAttribute('role','status');root.setAttribute('aria-live','polite');
  root.innerHTML='<div class="qk-veil"></div>'+xs.map((x,i)=>'<div class="qk-tile" style="left:'+x+'px;top:'+tileTop+'px;width:'+tw+'px;height:'+th+'px"><em>🔥</em>'+(i+1)+'</div>').join('')+
   '<div class="qk-papi" style="top:'+(tileTop-122)+'px"><span class="qk-shadow"></span><div class="qk-hop">'+papiMarkup()+'</div><div class="qk-say">Kombo! 🎉</div></div>'+
   '<div class="qk-badge" style="top:'+Math.max(80,tileTop-260)+'px"><span class="qk-ring"></span><span style="font-size:34px">🔥</span><div><div class="qk-big">KOMBO x5</div><div class="qk-gain">⚡ +'+gain+' enerji</div></div></div>'+
   '<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Beş doğru üst üste! Kombo, artı '+gain+' enerji.</span>';
  (host&&host.isConnected?host:document.body).append(root);host?.classList.add('qc-combo');
  const $=s=>root.querySelector(s),tiles=[...root.querySelectorAll('.qk-tile')],papi=$('.qk-papi'),hop=$('.qk-hop');
  const cleanup=()=>{root.remove();host?.classList.remove('qc-combo');};
  try{
   if(reduce()){
    for(const t of tiles){t.style.opacity=1;t.classList.add('is-lit');t.querySelector('em').style.opacity=1;}
    $('.qk-veil').style.opacity=1;$('.qk-badge').style.opacity=1;$('.qk-badge').style.transform='translateX(-50%)';papi.style.transform='translateX('+(xs[4]+tw/2-58)+'px)';$('.qk-say').style.opacity=1;
    if(withSound)sound();try{navigator.vibrate?.([60,40,60]);}catch{}
    await wait(1600);return true;
   }
   $('.qk-veil').animate([{opacity:0},{opacity:1}],{duration:220,fill:'forwards'});
   tiles.forEach((t,i)=>t.animate([{opacity:0,transform:'translateY(30px)'},{opacity:1,transform:'none'}],{duration:260,delay:i*60,easing:'cubic-bezier(.2,1.4,.4,1)',fill:'forwards'}));
   // yürüyüş: her basamağa 300 ms'de bir basar
   const stepAt=i=>480+i*300,walkEnd=stepAt(4);
   const px=i=>xs[i]+tw/2-58;
   const frames=[{transform:'translateX(-150px)',offset:0}];
   xs.forEach((x,i)=>frames.push({transform:'translateX('+px(i)+'px)',offset:stepAt(i)/walkEnd}));
   papi.animate(frames,{duration:walkEnd,fill:'forwards',easing:'linear'});
   hop.animate([{transform:'translateY(0) rotate(-5deg)'},{transform:'translateY(-22px) rotate(0)'},{transform:'translateY(0) rotate(5deg)'}],{duration:300,iterations:Math.round(walkEnd/300),easing:'ease-in-out'});
   for(let i=0;i<5;i++){
    await wait(i?300:stepAt(0));if(!isCurrent())return false;
    tiles[i].classList.add('is-lit');
    tiles[i].animate([{transform:'translateY(5px)'},{transform:'none'}],{duration:220});
    tiles[i].querySelector('em').animate([{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1.4)'},{opacity:1,transform:'scale(1)'}],{duration:300,fill:'forwards'});
    try{navigator.vibrate?.(12);}catch{}
   }
   await wait(120);if(!isCurrent())return false;
   if(withSound)sound();try{navigator.vibrate?.([60,40,60]);}catch{}
   hop.animate([{transform:'none'},{transform:'translateY(-44px) scale(1.04,.96)'},{transform:'translateY(0) scale(1.06,.94)'},{transform:'translateY(-18px)'},{transform:'none'}],{duration:620,easing:'ease-out'});
   $('.qk-say').animate([{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'scale(1.1)'},{opacity:1,transform:'scale(1)'}],{duration:320,fill:'forwards',easing:'cubic-bezier(.2,1.5,.4,1)'});
   $('.qk-badge').animate([{opacity:0,transform:'translate(-50%,40px) scale(.4)'},{opacity:1,transform:'translate(-50%,0) scale(1.1)'},{opacity:1,transform:'translate(-50%,0) scale(1)'}],{duration:420,fill:'forwards',easing:'cubic-bezier(.2,1.5,.4,1)'});
   $('.qk-ring').animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(14)'}],{duration:900,easing:'ease-out'});
   await wait(1500);if(!isCurrent())return false;
   // çıkış: Papi sağa yürür, her şey söner
   papi.animate([{transform:'translateX('+px(4)+'px)'},{transform:'translateX('+(W+40)+'px)'}],{duration:700,fill:'forwards',easing:'ease-in'});
   hop.animate([{transform:'translateY(0)'},{transform:'translateY(-14px)'},{transform:'translateY(0)'}],{duration:240,iterations:3});
   root.animate([{opacity:1},{opacity:0}],{duration:420,delay:300,fill:'forwards'});
   await wait(720);
   return true;
  }finally{cleanup();}
 }
 window.dmComboSteps={play};
})();
