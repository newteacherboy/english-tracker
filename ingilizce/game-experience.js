(function () {
  'use strict';
  const entries = [
    ['kyGirisEkrani','kelimeYarismaOverlay','Kelime Laboratuvarı','Kelimeyi gör ve dinle; doğru anlamını seç.'],
    ['jpGirisEkrani','jpOyunOverlay','Risk Balonları','Bir balon seç; kelimenin anlamını bul. Süre ve doğruluk birlikte puanını belirler.'],
    ['boslukGirisEkrani','boslukOyunOverlay','Eksik Harf','Eksik harfleri tamamla, kelimeleri birlikte kontrol et.'],
    ['hafizaGirisEkrani','hafizaOyunOverlay','Hafıza Sandığı','İngilizce kelimeleri Türkçe anlamlarıyla eşleştir.'],
    ['yagmurGirisEkrani','yagmurOyunOverlay','Hız Fırtınası','Kelime düşmeden doğru anlamını yakala.'],
    ['asmacaGirisEkrani','asmacaOyunOverlay','Harf Avı','Harfleri tahmin et, gizli kelimeyi bul.'],
    ['kelimebulGirisEkrani','kelimebulOyunOverlay','Şifre Kırıcı','Renkli ipuçlarından gizli kelimeyi çöz.'],
    ['esGirisEkrani','esOyunOverlay','Eş Bul','İngilizce ve Türkçe kelimelerin eşlerini bul.'],
    ['trenGirisEkrani','trenOyunOverlay','Kelime Treni','Vagonları sırala, doğru İngilizce cümleyi kur.']
  ];
  // Independent game dialogs must not live inside another game's closeable overlay.
  for(const [,id] of entries){const root=document.getElementById(id);if(root?.parentElement?.closest('.game-modal-overlay'))document.body.append(root);}

  // Restore the established game layout. The former preview-only styling
  // forced overflow:hidden over live answer controls on short phones.
  const ruleText = 'Doğru +100 · Seri bonusları · Hız bonusu · Yanlış −40 puan / turdan −3 XP';
  function decorate() {
    for (const [id,modal,title,description] of entries) {
      const entry=document.getElementById(id),root=document.getElementById(modal);
      if (!entry||!root) continue;
      entry.classList.add('dm-garden-entry');
      if (!entry.querySelector('.dm-entry-intro')) {
        const intro=document.createElement('div');intro.className='dm-entry-intro';
        intro.innerHTML='<img src="papi-welcome-v2.png" alt="Papi" loading="lazy" decoding="async"><p></p>';
        const heading=document.createElement('header');heading.className='dm-entry-heading';heading.innerHTML='<small>PAPİ İLE OYUN ZAMANI</small><h2></h2>';heading.querySelector('h2').textContent=title;heading.querySelector('h2').style.setProperty('color','#43266b','important');entry.prepend(heading);
        intro.querySelector('p').textContent=description;entry.querySelector('.dm-entry-heading').after(intro);
        const content=entry.closest('.game-modal-content'),music=content?.querySelector('[id$="MuzikBtn"]');if(music){const box=music.parentElement;box.classList.add('dm-entry-music');entry.append(box);}
        const rules=document.createElement('p');rules.className='dm-entry-rules';rules.textContent=ruleText;intro.after(rules);
      }
      const input=entry.querySelector('input[id$="IsimInput"]');if(input)input.parentElement.classList.toggle('dm-entry-name-auto',!!input.value&&typeof aktifOgrenciAdi!=='undefined'&&!!aktifOgrenciAdi&&aktifOgrenciAdi.toLowerCase()!=='teacher'&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci));
      root.classList.toggle('dm-entry-open',entry.style.display!=='none');
    }
  }
  decorate();
  for(const [id] of entries){const e=document.getElementById(id);if(e)new MutationObserver(decorate).observe(e,{attributes:true,attributeFilter:['style']});}

  const nativeExits={kelimeYarismaOverlay:'kelimeYarismasiKapat',jpOyunOverlay:'jpOyunKapat',boslukOyunOverlay:'boslukOyunKapat',hafizaOyunOverlay:'hafizaOyunKapat',yagmurOyunOverlay:'yagmurOyunKapat',asmacaOyunOverlay:'asmacaOyunKapat',kelimebulOyunOverlay:'kelimebulOyunKapat',esOyunOverlay:'esOyunKapat',trenOyunOverlay:'trenOyunKapat'};
  for(const [entryId,rootId] of entries){const name=nativeExits[rootId],exit=window[name];if(typeof exit!=='function')continue;const wrapped=function(...args){const root=document.getElementById(rootId),entry=document.getElementById(entryId),returnForm=!!root&&!!entry&&root.getClientRects().length>0&&getComputedStyle(entry).display==='none'&&!window.dmViewHistory?.isDirect();const result=exit.apply(this,args);if(returnForm&&getComputedStyle(root).display==='none'){for(const section of entry.parentElement.children){if(section!==entry&&section.id&&/Ekrani$/.test(section.id))section.style.display='none';}entry.style.display='block';root.style.display='flex';root.classList.add('dm-entry-open');entry.querySelector('button,input,select')?.focus?.({preventScroll:true});}return result;};Object.assign(wrapped,exit);window[name]=wrapped;}

  // Games that previously started immediately now have a reviewable entry screen.
  for(const [key,fn,title,description] of [
    ['dikte','dikteAc','Kulak Dedektifi','Kelimeyi dinle, duyduğunu İngilizce yaz.'],
    ['cumle','cumleAc','Cümle Ustası','Karışık kelimeleri sırala, İngilizce cümleyi kur.']]) {
    const original=window[fn];if(typeof original!=='function')continue;
    window[fn]=function(){
      if(typeof genelOyunGirisEngelliMi==='function'&&genelOyunGirisEngelliMi())return;
      document.getElementById('dmGameIntro')?.remove();
      const overlay=document.createElement('div');overlay.id='dmGameIntro';overlay.className='hb-overlay';
      overlay.innerHTML='<section class="hb-card" role="dialog" aria-modal="true" aria-labelledby="dmIntroTitle"><header><div><small>PAPİ İLE OYUN ZAMANI</small><h2 id="dmIntroTitle"></h2></div><button data-close aria-label="Kapat">×</button></header><div class="hb-body"><div class="hb-intro"><img src="papi-welcome-v2.png" alt="Papi"><p></p></div><p class="dm-entry-rules"></p><h3>Sınıfını seç</h3><div id="dmIntroClasses" class="hb-classes"></div><div data-units><h3>Ünitelerini seç</h3><div id="dmIntroUnits" class="hb-units unite-secim-box"></div></div><p class="hb-status" role="status"></p><button data-start class="hb-primary">Oyuna başla 🌱</button></div></section>';
      overlay.querySelector('h2').textContent=title;overlay.querySelector('.hb-intro p').textContent=description;overlay.querySelector('.dm-entry-rules').textContent=ruleText;
      const parent=window.dmViewHistory?.capture(),state={key,classNo:1,units:[1]},previous=document.activeElement;
      function close(){overlay.remove();window.dmViewHistory?.leave(overlay);previous?.focus?.();}
      function choose(n){state.classNo=n;overlay.querySelectorAll('[data-class]').forEach(b=>b.classList.toggle('active',Number(b.dataset.class)===n));genericSinifGuncelle(n,'dmIntroUnits',u=>state.units=u);}
      for(let n=1;n<=8;n++){const b=document.createElement('button');b.className='sinif-btn';b.dataset.class=n;b.textContent=n+'. Sınıf';b.onclick=()=>choose(n);overlay.querySelector('.hb-classes').append(b);}
      // Sentence bank is level-based, so only show the class selection it actually supports.
      if(key==='cumle'){overlay.querySelector('[data-units]').hidden=true;overlay.querySelector('.hb-intro p').textContent+=' Cümleler seçtiğin sınıfın seviyesine göre gelir.';}
      document.body.append(overlay);window.dmViewHistory?.track(overlay,{parent,close});sinifGridKisitlamaUygula('dmIntroClasses',n=>state.classNo=n,choose);
      overlay.querySelector('[data-close]').onclick=close;
      overlay.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const f=[...overlay.querySelectorAll('button:not(:disabled)')].filter(x=>x.getClientRects().length);if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}}};
      overlay.querySelector('[data-start]').onclick=()=>{if(key==='dikte'&&oyunHavuzGetir(state.classNo,state.units).filter(k=>/^[a-zA-Z]{3,10}$/.test(k.ingilizce||k.en||'')).length<8){overlay.querySelector('.hb-status').textContent='En az 8 kelime için başka bir ünite daha seç.';return;}window.dmSelectedIntro=state;if(!window.dmViewHistory)close();try{original();const child=document.getElementById('yoModal');if(child?.classList.contains('acik'))child.dataset.dmSelectedGame=key;if(child?.classList.contains('acik'))window.dmViewHistory?.track(child,{parent:window.dmViewHistory.capture(),close:()=>window.yoModalKapat?.()});}finally{window.dmSelectedIntro=null;}};
      overlay.querySelector('[data-close]').focus();
    };
  }
  // Every shared-core game, including those without an old timer, shows elapsed seconds.
  const badge=document.createElement('div');badge.id='dmGameClock';badge.className='dm-game-clock';badge.hidden=true;document.body.append(badge);
  function updateClock(){
    const d=window.OC?.aktif;if(!d||d.bitti){badge.hidden=true;return;}
    const visible=[...document.querySelectorAll('.game-modal-overlay,.yo-modal,.hb-overlay,.bc-perde,.bz-perde,#kpKelimeOyunEkrani')].some(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden');
    const intro=[...document.querySelectorAll('#dmGameIntro,.dm-entry-open')].some(el=>el.getClientRects().length>0);
    const root=[...document.querySelectorAll('.game-modal-content,#baOyunEkrani,#kpKelimeOyunEkrani,.oyun-modal')].find(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
    badge.hidden=!d||d.bitti||!visible||intro||!root;
    if(!badge.hidden){
      if(badge.parentElement!==root)root.prepend(badge);
      badge.textContent='⏱ '+OC.sure().toFixed(1)+' sn · '+OC.puan()+' puan';
    }
  }
  setInterval(updateClock,200);
  window.dmGameExperience={decorate,updateClock};
})();

/* Approved eight game boards: retain native answer, timer, reward and verification handlers. */
(()=>{
 'use strict';
 const configs=[
  ['jpOyunOverlay',['jpBalonEkrani','jpSoruEkrani'],'balloons'],
  ['yagmurOyunOverlay','yagmurOyunEkrani','storm'],
  ['kelimebulOyunOverlay','kelimebulOyunEkrani','code'],
  ['esOyunOverlay','esOyunEkrani','match'],
  ['trenOyunOverlay','trenOyunEkrani','train']
 ];
 const displayed=el=>!!el&&el.getClientRects().length>0&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
 function updateBoardState(){
  for(const [rootId,playId,theme] of configs){
   const root=document.getElementById(rootId),plays=(Array.isArray(playId)?playId:[playId]).map(id=>document.getElementById(id));
   if(!root||!plays.some(Boolean))continue;
   root.dataset.dmDesign=theme;
   root.classList.toggle('dm-designed-playing',displayed(root)&&plays.some(displayed));
  }
  const yo=document.getElementById('yoModal');
  const active=window.OC?.aktif;
  if(yo&&displayed(yo)){
   const game=active?.oyun;
   if(game==='cumle'||game==='dikte')yo.dataset.dmSelectedGame=game;
   else if(yo.dataset.dmSelectedGame)delete yo.dataset.dmSelectedGame;
  }
 }
 // Listen only to state of known game containers; avoid subtree observers on the large portal.
 for(const [rootId,playId] of configs){
  for(const id of [rootId,...(Array.isArray(playId)?playId:[playId])]){
   const node=document.getElementById(id);if(node)new MutationObserver(updateBoardState)
    .observe(node,{attributes:true,attributeFilter:['style','class']});
  }
 }
 const yo=document.getElementById('yoModal');
 if(yo)new MutationObserver(updateBoardState).observe(yo,{attributes:true,attributeFilter:['class','style']});
 updateBoardState();

 // Answer cues are generated from the same scoring decision used by the native games.
 // This avoids guessing correctness from the label or from selected button position.
 let audio=null,choice=null,cueTimer=0;
 const gameRoots=['harfBahcesiOverlay','jpOyunOverlay','yagmurOyunOverlay',
  'kelimebulOyunOverlay','esOyunOverlay','trenOyunOverlay'];
 const currentRoot=()=>{
  const active=window.OC?.aktif;
  if(!active||active.bitti)return null;
  const yo=document.getElementById('yoModal');
  if((active.oyun==='cumle'||active.oyun==='dikte')&&displayed(yo))return yo;
  return gameRoots.map(id=>document.getElementById(id)).find(displayed)||null;
 };
 function noteChoice(e){
  const root=currentRoot();
  if(!root||!root.contains(e.target))return;
  const target=e.target.closest('button,.es-k,[data-cell],input');
  if(!target||target.closest('.game-close-btn,[data-close],[data-skip],.jk-bar'))return;
  const input=target.closest('#kbTahminInput,#yoDikteInput');
  choice=input||target;
  if(choice.matches('button,.es-k,[data-cell]')){
   choice.classList.add('dm-touch-picked');
   setTimeout(()=>choice?.classList.remove('dm-touch-picked'),440);
  }
 }
 document.addEventListener('pointerdown',noteChoice,true);
 document.addEventListener('click',noteChoice,true); // keyboard and assistive clicks
 function effect(correct){
  try{
   const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
   if(!audio)audio=new C();
   if(audio.state==='suspended')audio.resume().catch(()=>{});
   const start=audio.currentTime;
   const notes=correct?[[660,0,.095],[880,.105,.14]]:[[290,0,.12],[210,.14,.16]];
   for(const [freq,delay,duration] of notes){
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=correct?'sine':'triangle';osc.frequency.value=freq;
    gain.gain.setValueAtTime(.0001,start+delay);
    gain.gain.exponentialRampToValueAtTime(.10,start+delay+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,start+delay+duration);
    osc.connect(gain);gain.connect(audio.destination);
    osc.start(start+delay);osc.stop(start+delay+duration+.01);
   }
  }catch{/* Never block scoring if audio is unavailable. */}
 }
 function cue(correct){
  const root=currentRoot();if(!root)return;
  // Most games already play their native success/failure sounds; no duplicate tone.
  if(root.id==='harfBahcesiOverlay'||(root.id!=='yoModal'&&typeof window.genelSesEfektiCal!=='function'))effect(correct);
  if(root.id==='yoModal'&&root.dataset.dmSelectedGame==='cumle'){
   root.querySelectorAll('.yo-cevap-alan .yo-chip').forEach(chip=>{
    chip.classList.add(correct?'dm-answer-right':'dm-answer-wrong');
   });
  }
  const element=choice?.isConnected&&root.contains(choice)?choice:
   root.id==='kelimebulOyunOverlay'?root.querySelector('#kbTahminInput'):null;
  if(element){
   element.classList.remove('dm-answer-right','dm-answer-wrong');
   element.classList.add(correct?'dm-answer-right':'dm-answer-wrong');
   setTimeout(()=>element.classList.remove('dm-answer-right','dm-answer-wrong'),1000);
  }
  const toastId='dmSelectedAnswerCue';
  let notice=document.getElementById(toastId);
  if(!notice){notice=document.createElement('div');notice.id=toastId;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');document.body.append(notice);}
  notice.className=correct?'dm-cue-correct':'dm-cue-wrong';
  notice.textContent=correct?'✓ Doğru!':'✕ Tekrar dene';
  notice.hidden=false;
  clearTimeout(cueTimer);cueTimer=setTimeout(()=>{notice.hidden=true},850);
  choice=null;
 }
 // Keep existing OC logic and score values fully intact.
 function bindFeedback(){
  const OC=window.OC;if(!OC)return false;
  for(const [method,correct] of [['dogru',true],['yanlis',false]]){
   const previous=OC[method];if(typeof previous!=='function'||previous.dmSelectedAudioWrapped)continue;
   const wrapped=function(...args){const result=previous.apply(this,args);cue(correct);return result;};
   wrapped.dmSelectedAudioWrapped=true;OC[method]=wrapped;
  }
  return true;
 }
 bindFeedback();
 const clock=setInterval(()=>{updateBoardState();if(bindFeedback())clearInterval(clock)},300);
 window.dmSelectedGameBoards={updateBoardState};
})();
