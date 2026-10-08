/* Only presentation: original question nodes and answer listeners stay intact. */
(()=>{'use strict';
 const names={lab:'Kelime Laboratuvarı',risk:'Risk Balonları',eksik:'Eksik Harf',hafiza:'Hafıza Sandığı',hiz:'Hız Fırtınası',harf:'Harf Avı',sifre:'Şifre Kırıcı',es:'Eş Bul',tren:'Kelime Treni',cumle:'Cümle Ustası',dikte:'Kulak Dedektifi'};
 const titles={hafiza:'Eş kartları bul',harf:'Kelimeyi bul',sifre:'Gizli kelimeyi çöz',es:'İngilizce ve Türkçeyi eşleştir',cumle:'Doğru cümleyi kur',dikte:'Dinle ve yaz'};
 let observer,timerObserver;
 window.dmCalmQuestion=function(root){
  observer?.disconnect();timerObserver?.disconnect();const panel=root?.querySelector('.dm-question-panel'),area=panel?.querySelector('#bzAlan');if(!area)return;
  const type=panel.dataset.questionType;panel.classList.add('cq-panel');
  const top=panel.querySelector('.bz-oyun-ust');
  if(!panel.querySelector('.cq-mascot')){const mascot=document.createElement('div');mascot.className='cq-mascot';mascot.setAttribute('aria-hidden','true');top.after(mascot);}
  function decorate(){
   if(!area.querySelector(':scope > .cq-question')){
    const board=document.createElement('div');board.className='cq-question';
    const label=document.createElement('div');label.className='cq-label';label.textContent=names[type]||'Papi ile keşfet';board.append(label);
    const leading=[];for(const e of [...area.children]){if(!e.matches('.bz-etiket,.bz-soru,.bz-ipucu,.bz-tr-anlam'))break;leading.push(e);}
    const question=leading.find(e=>e.matches('.bz-soru'));
    if(question&&type==='lab')question.textContent+=' ne demek?';
    if(question&&type==='risk')question.textContent+=' İngilizcede hangisi?';
    if(question&&type==='hiz')question.textContent+=' ne demek?';
    if(!question&&titles[type]){const title=document.createElement('h2');title.className='cq-title';title.textContent=titles[type];board.append(title);}
    for(const e of leading){
     if(e.matches('.bz-ipucu')&&['tren','cumle'].includes(type)){const help=document.createElement('details');help.className='cq-help';const summary=document.createElement('summary');summary.textContent='Nasıl oynanır?';help.append(summary,e);board.append(help);}else board.append(e);
    }
    area.prepend(board);
   }
   if(type==='tren'){const check=area.querySelector('#bzKontrol'),answer=area.querySelector('.bz-cevap');if(check&&answer&&check.nextElementSibling!==answer)answer.before(check);}
   const input=area.querySelector('#bzYaz');if(input&&!input.dataset.cqInput){input.dataset.cqInput='1';input.placeholder='Duyduğun kelimeyi yaz';}
   const listen=area.querySelector('#bzD1'),slow=area.querySelector('#bzD2');
   if(listen&&listen.textContent!=='🔊 Tekrar dinle')listen.textContent='🔊 Tekrar dinle';
   if(slow&&slow.textContent!=='🐢 Yavaş dinle')slow.textContent='🐢 Yavaş dinle';
   if(listen&&!area.querySelector('.cq-listen-main')){const play=document.createElement('button');play.className='cq-listen-main';play.type='button';play.setAttribute('aria-label','Kelimeyi dinle');play.textContent='🔊';play.onclick=()=>listen.click();listen.parentElement.before(play);}
   if(['hafiza','es'].includes(type)){
    const board=area.querySelector('.cq-question');let counter=board.querySelector('.cq-counter');
    if(!counter){counter=document.createElement('div');counter.className='cq-counter';counter.setAttribute('aria-live','polite');board.append(counter);}
    const matched=area.querySelectorAll(type==='hafiza'?'.bz-kart2.tamam':'.bz-es .bz-cip2.tamam').length/2, text=matched+' / 3 eşleşme';if(counter.textContent!==text)counter.textContent=text;
   }
   const lives=area.querySelector('.bz-can');
   if(lives&&!lives.dataset.cqLives){const remaining=(lives.textContent.match(/❤️/gu)||[]).length;lives.dataset.cqLives='1';lives.setAttribute('aria-label','Kalan hak: '+remaining);lives.innerHTML='<span>'+remaining+' hakkın var</span><div aria-hidden="true">'+'●'.repeat(remaining)+'○'.repeat(5-remaining)+'</div>';}
   const rail=area.querySelector('#bzSure');
   if(rail&&!area.querySelector('.cq-timer')){
    const timer=document.createElement('div');timer.className='cq-timer';timer.setAttribute('aria-label','Kalan süre');rail.parentElement.before(timer);
    const update=()=>{const text='⏱ '+Math.ceil(Math.max(0,parseFloat(rail.style.width)||0)*6/100)+' sn';if(timer.textContent!==text)timer.textContent=text;};update();
    if(typeof MutationObserver==='function'){timerObserver=new MutationObserver(update);timerObserver.observe(rail,{attributes:true,attributeFilter:['style']});}
   }
  }
  decorate();if(typeof MutationObserver==='function'){observer=new MutationObserver(decorate);observer.observe(area,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
 };
})();
