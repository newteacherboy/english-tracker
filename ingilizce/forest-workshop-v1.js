/* Presentation only: move existing nodes, keep every original answer listener. */
(()=>{'use strict';
 const names={lab:'Kelimeyi keşfet',risk:'Kelimeyi keşfet',eksik:'Harfleri tamamla',hafiza:'Hafıza sandığını aç',hiz:'Süreyle yarış',harf:'Harflerin izini sür',sifre:'Gizli şifreyi çöz',es:'Dost kelimeleri eşleştir',tren:'Vagonları sıraya diz',cumle:'Cümleni inşa et',dikte:'Dinle ve keşfet'};
 const groups=[['apple','elma'],['book','kitap'],['bird','kuş'],['pencil','kalem'],['house','home','ev'],['garden','bahçe'],['table','masa'],['dog','köpek'],['cat','kedi'],['sun','güneş'],['star','yıldız'],['ball','top'],['school','okul'],['flower','çiçek'],['car','araba'],['water','su']];
 const artIndex=value=>groups.findIndex(g=>g.includes(String(value).trim().toLocaleLowerCase('tr').replace(/[.!?]+$/,'')));
 function art(el,n){el.classList.toggle('fw-has-art',n>=0);if(n>=0){el.style.setProperty('--fw-art-x',(n%4*100/3)+'%');el.style.setProperty('--fw-art-y',(Math.floor(n/4)*100/3)+'%');}}
 let observer=null;
 window.dmForestQuestion=function(root){
  observer?.disconnect();const panel=root?.querySelector('.dm-question-panel'),area=panel?.querySelector('#bzAlan');if(!area)return;
  panel.classList.add('fw-panel');let hero=panel.querySelector('.fw-hero');
  if(!hero){hero=document.createElement('div');hero.className='fw-hero';hero.setAttribute('aria-hidden','true');hero.innerHTML='<span class="fw-hero-art"></span>';panel.querySelector('.bz-oyun-ust').after(hero);}
  function decorate(){
   let board=area.querySelector(':scope > .fw-question-board');
   if(!board){
    board=document.createElement('div');board.className='fw-question-board';let title=document.createElement('div');title.className='fw-question-label';title.textContent=names[panel.dataset.questionType]||'Papi ile keşfet';board.append(title);
    const leading=[];for(const e of [...area.children]){if(!e.matches('.bz-etiket,.bz-soru,.bz-ipucu,.bz-tr-anlam'))break;leading.push(e);}
    const question=leading.find(e=>e.matches('.bz-soru')),word=question?.textContent||'';art(hero.firstElementChild,artIndex(word));
    if(question&&panel.dataset.questionType==='lab')question.textContent=word+' ne demek?';
    if(question&&panel.dataset.questionType==='risk')question.textContent=word+' İngilizcede hangisi?';
    leading.forEach(e=>board.append(e));area.prepend(board);
   }
   area.querySelectorAll('.bz-sec').forEach(button=>art(button,artIndex(button.textContent)));
  }
  decorate();if(typeof MutationObserver==='function'){observer=new MutationObserver(decorate);observer.observe(area,{childList:true});}
 };
})();
