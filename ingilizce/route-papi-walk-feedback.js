/* Papi route feedback: isolated presentation, no scoring changes. */
(function(){
 if(window.DMRoutePapiWalk)return;
 const css=`
.dm-rpw{position:fixed;inset:0;z-index:2147482000;pointer-events:none;display:flex;align-items:center;justify-content:center}
.dm-rpw-stage{position:relative;width:min(90vw,390px);height:250px}
.dm-rpw-character{position:absolute;bottom:8px;left:0;width:145px;height:155px;transform:translateX(-110vw);animation:dmRpwEnter 1.15s cubic-bezier(.22,.7,.25,1) forwards}
.dm-rpw-character .dmp{width:145px;height:155px;filter:drop-shadow(0 9px 8px #152d4930)}
.dm-rpw-character canvas{display:block;width:145px;height:155px;filter:drop-shadow(0 8px 6px #152d4930)}
.dm-rpw-character.is-walking .dmp{animation:dmRpwSteps .25s ease-in-out infinite alternate}
.dm-rpw-character.is-happy .dmp{animation:dmRpwHappy .55s ease-in-out 2}
.dm-rpw-character.is-sad .dmp{animation:dmRpwSad .8s ease-in-out 1}
.dm-rpw-bubble{position:absolute;top:0;right:0;width:66%;border:2px solid #dce8f3;border-radius:20px;background:#fff;padding:13px 14px;box-shadow:0 9px 25px #18365a1c;font:700 15px/1.4 system-ui,sans-serif;color:#142e50;opacity:0;transform:translateY(12px) scale(.95);transition:opacity .25s,transform .25s;overflow-wrap:anywhere}
.dm-rpw-bubble.show{opacity:1;transform:translateY(0) scale(1)}
.dm-rpw-bubble strong{display:block;margin-bottom:4px;color:#21815c;font-size:17px}
.dm-rpw.is-wrong .dm-rpw-bubble strong{color:#a85d39}
@keyframes dmRpwEnter{to{transform:translateX(14px)}}
@keyframes dmRpwSteps{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-6px) rotate(3deg)}}
@keyframes dmRpwHappy{50%{transform:translateY(-18px) rotate(4deg)}}
@keyframes dmRpwSad{50%{transform:translateY(7px) rotate(-5deg)}}
@media(prefers-reduced-motion:reduce){.dm-rpw-character{animation-duration:.01ms}.dm-rpw-character .dmp{animation:none!important}.dm-rpw-bubble{transition:none}}
`;
 const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
 let active=null, timer=null, renderer=null;
 function close(){clearTimeout(timer);renderer?.destroy();renderer=null;if(active){active.remove();active=null;}}
 function show(correct,detail,translation){
  close();
  if(!window.DMBabyPapi3D?.mount&&!window.DMPapi?.html)return;
  const host=document.createElement('div');host.className='dm-rpw'+(correct?'':' is-wrong');host.setAttribute('aria-live','polite');
  const stage=document.createElement('div');stage.className='dm-rpw-stage';
  const bird=document.createElement('div');bird.className='dm-rpw-character is-walking';if(window.DMBabyPapi3D?.mount){const canvas=document.createElement('canvas');canvas.width=290;canvas.height=310;bird.append(canvas);try{renderer=window.DMBabyPapi3D.mount(canvas);renderer?.setMood('walk');}catch(err){console.warn('[Papi3D] Fallback',err);renderer=null;}if(!renderer&&window.DMPapi?.html)bird.innerHTML=window.DMPapi.html(correct?'mutlu':'uzgun');}else bird.innerHTML=window.DMPapi.html(correct?'mutlu':'uzgun');
  const bubble=document.createElement('div');bubble.className='dm-rpw-bubble';
  const title=document.createElement('strong');title.textContent=correct?'Harikasın!':'Birlikte öğrenelim!';
  const body=document.createElement('span');body.textContent=correct?(detail||'Doğru bildin!'):('Doğru cevap: '+(detail||'')+(translation?' · '+translation:''));
  bubble.append(title,body);stage.append(bird,bubble);host.append(stage);document.body.append(host);active=host;
  timer=setTimeout(()=>{
   if(active!==host)return;
   bird.classList.remove('is-walking');bird.classList.add(correct?'is-happy':'is-sad');
   if(renderer)renderer.setMood(correct?'happy':'sad');else window.DMPapi.react?.(bird,correct?'sevinc':'uzgun',0);
   bubble.classList.add('show');
  },1150);
 }
 window.DMRoutePapiWalk={show,close};
})();
