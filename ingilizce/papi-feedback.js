/* DijiMedu shared Papi answer feedback: presentation only; no scoring or navigation side effects. */
(()=>{'use strict';
let timer=null,root=null;
const PAPI='parkur-map-papi-v1.svg';
function remove(){if(timer)clearTimeout(timer);timer=null;root?.remove();root=null;}
function mount(kind,title,detail){
 remove();root=document.createElement('div');root.className='dm-papi-feedback '+(kind==='energy'?'is-energy':'is-success');root.setAttribute('role',kind==='energy'?'dialog':'status');if(kind==='energy')root.setAttribute('aria-modal','true');
 const card=document.createElement('div');card.className='dm-papi-feedback-card';
 const mascot=document.createElement('img');mascot.className='dm-papi-feedback-mascot';mascot.src=PAPI;mascot.alt='Papi papağanı';mascot.onerror=()=>{mascot.style.display='none'};
 const mark=document.createElement('span');mark.className='dm-papi-feedback-mark';mark.textContent=kind==='energy'?'⚡':'✓';mark.setAttribute('aria-hidden','true');
 const heading=document.createElement('strong');heading.textContent=title;
 const copy=document.createElement('p');copy.textContent=detail;
 card.append(mark,mascot,heading,copy);root.append(card);document.body.append(root);
 if(kind==='energy'){const close=document.createElement('button');close.type='button';close.className='dm-papi-feedback-close';close.textContent='Anladım';close.addEventListener('click',remove,{once:true});card.append(close);close.focus();}
 return card;
}
function correct({detail='',anchor=null,duration=1000}={}){
 anchor?.classList.add('dm-papi-correct-pulse');if(anchor)setTimeout(()=>anchor.classList.remove('dm-papi-correct-pulse'),650);
 mount('correct','Harika!',detail||'Doğru cevap!');
 timer=setTimeout(remove,Math.max(650,Math.min(duration,1800)));
}
function energy(){mount('energy','Papi ile enerji molası!','Enerjin yenilenince aynı sorudan devam edebileceksin. İlerlemen güvende!');}
window.DijiMeduPapiFeedback={correct,energy,close:remove};
})();
