/* [11 Kas 2026] Durak başlatma · tasarım A ("mavi baloncuk").
   Parkurdaki bir durağa basınca başlatma kartı tam ekran açılmaz; basılan durağın hemen altında,
   ona okla bağlı mavi bir baloncuk olarak çıkar. Parkur arkada görünmeye devam eder.
   Durak ekranda değilse (ör. "Devam et" ile açıldıysa) kart eskisi gibi altta durur.
   Yalnızca görünüm/konum: içerik, başlatma, enerji ve ödül kuralları thematic-learning.js'te aynen kalır. */
(()=>{
 'use strict';
 let anchor=null;
 document.addEventListener('click',e=>{
  const stop=e.target?.closest?.('.rt-medal-stop');
  if(stop)anchor={el:stop,t:Date.now()};
 },true);

 function scroller(el){
  for(let n=el.parentElement;n&&n!==document.body;n=n.parentElement){
   const o=getComputedStyle(n).overflowY;
   if((o==='auto'||o==='scroll')&&n.scrollHeight>n.clientHeight+2)return n;
  }
  return document.scrollingElement||document.documentElement;
 }

 function bottomLimit(){
  return innerHeight-12;
 }

 function position(modal){
  const card=modal.querySelector('.ml-entry-card');if(!card)return;
  if(!modal._popAnchor&&anchor&&Date.now()-anchor.t<15000){modal._popAnchor=anchor.el;anchor=null;}
  const a=modal._popAnchor?.isConnected?modal._popAnchor:null;
  const disc=a?(a.querySelector('.rt-medal-disc')||a):null;
  modal.classList.remove('ml-pop-anchored','ml-pop-left');card.style.removeProperty('top');card.style.removeProperty('--pop-caret');
  if(!disc)return;
  const gap=18,limit=bottomLimit();
  modal.classList.add('ml-pop-anchored');
  const ch=card.offsetHeight;
  let r=disc.getBoundingClientRect();
  if(r.bottom+gap+ch>limit||r.top<64){
   const box=scroller(disc),target=Math.max(64,limit-ch-gap-r.height);
   const want=Math.min(target,Math.max(64,innerHeight*.18));
   try{box.scrollTo({top:box.scrollTop+(r.top-want),behavior:'instant'});}catch{box.scrollTop+=r.top-want;}
   r=disc.getBoundingClientRect();
  }
  if(r.bottom+gap+ch>limit+1||r.bottom<0){modal.classList.remove('ml-pop-anchored');return;}
  card.style.top=Math.round(r.bottom+gap)+'px';
  const c=card.getBoundingClientRect();
  const x=Math.max(28,Math.min(c.width-28,r.left+r.width/2-c.left));
  card.style.setProperty('--pop-caret',Math.round(x)+'px');
  modal.classList.toggle('ml-pop-left',x>c.width*.6);
 }

 function place(modal){
  if(!modal||!modal.classList.contains('ml-entry'))return;
  modal.classList.add('ml-pop');
  if(!modal.dataset.popBound){
   modal.dataset.popBound='1';
   modal.addEventListener('click',e=>{
    if(e.target===modal&&modal.classList.contains('ml-entry'))modal.querySelector('[data-back]')?.click();
   });
  }
  position(modal);
  requestAnimationFrame(()=>{if(modal.isConnected&&modal.classList.contains('ml-entry'))position(modal);});
 }

 let t=0;
 addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{
  const m=document.querySelector('#dmStoryLesson.ml-entry.ml-pop');if(m)position(m);
 },120);});

 window.dmDurakBaslat={place};
})();
