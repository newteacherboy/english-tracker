/* Eight approved Diji-Medu game layouts, real DOM and live controls.
   20 October 2026. Visual decorations never become answer hit targets. */
(()=>{
 'use strict';
 const scenes=[
  {id:'yagmurOyunEkrani',theme:'storm',title:'⚡ Hız Fırtınası',intro:'Doğru cevabı fırtınadan önce yakala!',mascot:'papi-loading.webp'},
  {id:'kelimebulOyunEkrani',theme:'lock',title:'🔐 Şifre Kırıcı',intro:'İngilizce kelimeyi tahmin et!',mascot:null},
  {id:'esOyunEkrani',theme:'match',title:'🔗 Eş Bul',intro:'İngilizce kelimeleri Türkçe anlamıyla eşleştir!',mascot:'papi-loading.webp'},
  {id:'trenOyunEkrani',theme:'train',title:'🚂 Kelime Treni',intro:'Türkçe cümleyi oku, İngilizce vagonları doğru sırayla bağla!',mascot:null}
 ];
 for(const item of scenes){
  const stage=document.getElementById(item.id);
  if(!stage||stage.querySelector('.fg-hero'))continue;
  const hero=document.createElement('header');
  hero.className='fg-hero fg-hero-'+item.theme;
  const copy=document.createElement('div');copy.className='fg-hero-copy';
  const kicker=document.createElement('small');kicker.textContent='PAPİ İLE OYUN ZAMANI';
  const name=document.createElement('h3');name.textContent=item.title;
  const description=document.createElement('p');description.textContent=item.intro;
  copy.append(kicker,name,description);hero.append(copy);
  if(item.mascot){
   const image=document.createElement('img');image.className='fg-hero-papi';image.src=item.mascot;image.alt='';image.loading='lazy';image.decoding='async';hero.append(image);
  }
  stage.prepend(hero);
 }
 // Keep the live balloon question fully visible; pronunciation never interferes with the answer.
 const question=document.getElementById('jpSoruKelimeText');
 if(question&&!document.getElementById('fgBalloonSpeak')){
  const speak=document.createElement('button');
  speak.type='button';speak.id='fgBalloonSpeak';speak.className='fg-audio-button';
  speak.textContent='🔊 Dinle';speak.setAttribute('aria-label','Sorudaki kelimeyi sesli dinle');
  speak.onclick=()=>{
   if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined')return;
   try{const u=new SpeechSynthesisUtterance(question.textContent.trim());
    const label=document.getElementById('jpSoruYonEtiket')?.textContent||'';
    u.lang=label.includes('Türkçe')?'en-US':'tr-TR';u.rate=.86;
    speechSynthesis.cancel();speechSynthesis.speak(u);
   }catch{}
  };
  question.after(speak);
 }
 const yo=document.getElementById('yoGovde'),modal=document.getElementById('yoModal');
 if(yo&&modal){
  const update=()=>{
   // The modal can be hosted inside a suspended navigation surface;
   // render based on its active game kind, not visibility/overlay class.
   if(modal.dataset.dmSelectedGame==='dikte'){
    const speaker=yo.querySelector('.yo-dikte-dinle');
    if(speaker&&!yo.querySelector('.fg-listening-banner')){
     const banner=document.createElement('div');banner.className='fg-listening-banner';
     banner.innerHTML='<div><small>🎧 KELİME DEDEKTİFİ</small><strong>Sesi dinle, kelimeyi keşfet!</strong><span>İstersen kaplumbağayla yavaş dinle.</span></div><img src="papi-loading.webp" alt="" loading="lazy">';
     speaker.before(banner);
    }
   }
   if(modal.dataset.dmSelectedGame==='cumle'){
    const question=yo.querySelector('.yo-soru');
    if(question&&!yo.querySelector('.fg-sentence-banner')){
     const banner=document.createElement('div');banner.className='fg-sentence-banner';
     banner.innerHTML='<span aria-hidden="true">🍃</span><strong>🧱 Cümle Ustası</strong><span aria-hidden="true">🌼</span>';
     question.before(banner);
    }
   }
  };
  new MutationObserver(update).observe(yo,{childList:true});
  new MutationObserver(update).observe(modal,{attributes:true,attributeFilter:['class','data-dm-selected-game']});
  update();
 }

 // Several legacy themes set background:none !important with higher specificity.
 // Apply scene image to the active, real game content only. This preserves
 // fast startup, entry screens and the earlier route's inline style state.
 for(const [rootId,scene] of [
  ['jpOyunOverlay','carnival'],['yagmurOyunOverlay','storm'],
  ['kelimebulOyunOverlay','lock'],['esOyunOverlay','garden'],
  ['trenOyunOverlay','station']
 ]){
  const root=document.getElementById(rootId),card=root?.querySelector('.game-modal-content');
  if(!root||!card)continue;
  const apply=()=>{
   if(root.classList.contains('dm-designed-playing')){
    card.style.setProperty('background-image',
     'linear-gradient(180deg,#fffaf0a6,#fff6e7c2),url("game-scenes/'+scene+'.svg")','important');
    card.style.setProperty('background-size','100% 100%,100% 100%','important');
    card.style.setProperty('background-repeat','no-repeat','important');
   }else{
    card.style.removeProperty('background-image');
    card.style.removeProperty('background-size');
    card.style.removeProperty('background-repeat');
   }
  };
  new MutationObserver(apply).observe(root,{attributes:true,attributeFilter:['class']});
  apply();
 }
 window.dmFaithfulEightGames={version:'20261020',scenes:scenes.map(s=>s.id)};
})();
