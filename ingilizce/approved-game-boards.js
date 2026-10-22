/* Approved board art is decorative; all questions and answers remain live DOM. */
(()=>{
  'use strict';
  for(const [key,title,description,art] of [
    ['hafiza','Hafıza Sandığı','Eşleşen İngilizce–Türkçe kartları bul!','owl'],
    ['bosluk','Eksik Harf','Kelimelerdeki eksik kutucukları doldur!','cat']
  ]){
    const root=document.getElementById(key+'OyunOverlay'),game=document.getElementById(key+'OyunEkrani');
    if(!root||!game)continue;
    root.classList.add('dm-approved-board');
    const content=root.querySelector('.game-modal-content');
    const hero=document.createElement('header');hero.className='ab-hero ab-'+key;
    const image=document.createElement('img');image.loading='lazy';image.decoding='async';image.src='games-assets/approved-'+art+'-v1.webp';image.alt='';image.className='ab-mascot';
    const heading=document.createElement('h2');heading.textContent=title;
    const subtitle=document.createElement('p');subtitle.textContent=description;
    hero.append(heading,subtitle,image);content.prepend(hero);
    const hud=document.createElement('div');hud.className='ab-hud';hud.innerHTML='<span><svg aria-hidden="true"><use href="games-assets/approved-ui-v1.svg#clock"></use></svg><b data-ab-time>0.0 sn</b></span><span><svg aria-hidden="true"><use href="games-assets/approved-ui-v1.svg#star"></use></svg><b data-ab-score>0 puan</b></span><span><svg aria-hidden="true"><use href="games-assets/approved-ui-v1.svg#cards"></use></svg><b data-ab-progress></b></span>';
    game.prepend(hud);
    if(key==='hafiza'){
      const turn=document.createElement('p');turn.id='abMemoryTurn';turn.className='ab-memory-turn';turn.setAttribute('role','status');game.querySelector('#hafizaKartGrid').before(turn);
      const footer=document.createElement('footer');footer.className='ab-guide';
      footer.innerHTML='<img src="games-assets/approved-boy-v1.webp" alt="" loading="lazy" decoding="async"><p>Eşleşen kartları bul,<br>tüm çiftleri tamamla!</p>';
      game.append(footer);const drawer=document.createElement('section');drawer.className='ab-jokers';drawer.setAttribute('aria-label','Jokerlerim');drawer.innerHTML='<strong>Jokerlerim</strong>';game.append(drawer);
    }
    const close=content.querySelector('.game-close-btn');close.textContent='‹';close.setAttribute('aria-label','Oyundan çık');
    const update=()=>{
      const playing=game.style.display!=='none';root.classList.toggle('ab-playing',playing);
      if(!playing||!root.getClientRects().length)return;
      if(key==='hafiza'){const bar=game.querySelector(':scope > #jkBar');if(bar)game.querySelector('.ab-jokers').append(bar);}
      const current=window.OC?.aktif;
      const seconds=current&&!current.bitti?OC.sure():0;
      hud.querySelector('[data-ab-time]').textContent=seconds.toFixed(1)+' sn';
      hud.querySelector('[data-ab-score]').textContent=(current?OC.puan():0)+' puan';
      hud.querySelector('[data-ab-progress]').textContent=key==='hafiza'?document.getElementById('hafizaKalanInfo').textContent:document.getElementById('boslukSayacInfo').textContent.replace(' · Üç kelimelik tur','');
    };
    new MutationObserver(update).observe(game,{attributes:true,attributeFilter:['style']});
    setInterval(update,200);update();
  }
})();
