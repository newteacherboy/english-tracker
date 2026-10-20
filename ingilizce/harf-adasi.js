/* Papi'nin Harf Adasi • isolated replacement for the asmaca play screen.
   Existing class/unit selection, OC scoring, energy debit and server leaderboards remain authoritative. */
(() => {
  'use strict';
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const letters = word => [...new Set(String(word).toUpperCase().replace(/[^A-Z]/g, '').split(''))];
  function makeKeys(word, random=Math.random) {
    const needed = letters(word);
    const distractors = ABC.split('').filter(ch=>!needed.includes(ch));
    for(let i=distractors.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[distractors[i],distractors[j]]=[distractors[j],distractors[i]];}
    const minimum = needed.length<=12 ? 12 : needed.length<=18 ? 18 : 26;
    const a=needed.concat(distractors.slice(0,Math.max(0,minimum-needed.length)));
    for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  const solved = (word,guessed)=>letters(word).every(ch=>guessed.has(ch));
  const quota = level=>level>=30?3:level>=20?2:level>=15?1:0;
  window.dmHarfAdasiCore=Object.freeze({makeKeys,solved,quota,letters});
  const id='asmacaOyunOverlay',get=sel=>document.querySelector('#'+id+' '+sel);
  let current=null,timeout=null,ticker=null,run=0,usedBoosts=0,maxBoosts=0;
  function progressLevel(){
    try { const p=window.dmProgression;const n=p && typeof p.level==='function'?p.level():Number(window.level||window.yo?.level||1);return Number(n)||1; }
    catch(_){return 1;}
  }
  function stop(){
    run++;clearTimeout(timeout);clearInterval(ticker);timeout=null;ticker=null;current=null;
    document.getElementById(id)?.classList.remove('ia-playing','ia-intro');
  }
  /* Oyun sırasında ← / × doğrudan Oyunlar sekmesine döner. Eskiden ilk dokunuş oyunu
     giriş formuna döndürmeye çalışıyor, ia-playing sınıfı kaldığı için oyun ekranı
     açık kalıyor ve çıkış çalışmıyor gibi görünüyordu. */
  function exitToGames(){
    stop();
    const overlay=document.getElementById(id),entry=document.getElementById('asmacaGirisEkrani'),play=document.getElementById('asmacaOyunEkrani'),finish=document.getElementById('asmacaBitisEkrani');
    if(play)play.style.display='none';if(finish)finish.style.display='none';if(entry)entry.style.display='block';
    try{window.asmacaOyunKapat?.();}catch(_){}
    if(overlay&&overlay.style.display!=='none'){overlay.style.display='none';try{window.asmacaMuzikDurdur?.();}catch(_){}}
    overlay?.classList.remove('dm-entry-open');
  }
  function status(message){let el=get('.ia-message');if(el)el.textContent=message;}
  function sound(type){
    try{if(typeof genelSesEfektiCal==='function')genelSesEfektiCal(type);}
    catch(_){}
  }
  function speak(word){
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance){status('Seslendirme bu tarayıcıda desteklenmiyor.');return false;}
    try{
      window.speechSynthesis.cancel();
      const say=new SpeechSynthesisUtterance(word.toLowerCase());say.lang='en-US';say.rate=.82;say.volume=.85;
      window.speechSynthesis.speak(say);return true;
    }catch(_){status('Sesli ipucu açılamadı.');return false;}
  }
  function timerStart(){
    clearInterval(ticker);
    const update=()=>{let label=get('[data-ia-timer]');if(label && current)label.textContent=((Date.now()-current.begin)/1000).toFixed(1)+' sn';};
    ticker=setInterval(update,200);update();
  }
  function drawHeader(){
    const total=asmacaKelimeler.length,index=asmacaAktifIndex+1;
    return '<header class="ia-top">'+
      '<div class="ia-nav"><button class="ia-round" type="button" data-ia-close aria-label="Oyundan çık">←</button>'+
      '<div class="ia-clock">⏱ <span data-ia-timer>0.0 sn</span></div>'+
      '<button class="ia-round" type="button" data-ia-close aria-label="Oyunu kapat">×</button></div>'+
      '<h2 class="ia-title">Papi’nin Harf Adası</h2>'+
      '<p class="ia-subtitle">İpucunu kullan, harfleri bul ve sandığa ulaş!</p>'+
      '<div class="ia-hud"><div class="ia-wood">Kelime<b data-ia-round>'+index+'/'+total+'</b></div>'+
      '<div class="ia-wood">⭐ Puan<b data-ia-score>'+asmacaPuan+'</b></div></div>'+
      '<div class="ia-hearts" aria-label="Kalan can: 5" data-ia-lives>'+Array(5).fill('<span>♥</span>').join('')+'</div></header>';
  }
  function drawScene(){
    return '<section class="ia-scene" aria-label="Papi adada sandığa doğru ilerliyor">'+
      '<span class="ia-art-chest" aria-hidden="true"></span><span class="ia-parrot ia-art-papi" role="img" aria-label="Papi, maceracı papağan" style="--ia-papi-left:4%"></span>'+
      '<div class="ia-flag">Başla</div><div class="ia-tip-path">Papi her doğru harfte ilerler!</div>'+
      '<span class="ia-feedback" aria-live="polite"></span></section>';
  }
  function drawAnswers(){
    return '<section class="ia-answers"><div class="ia-clue"><span aria-hidden="true">💡</span>'+
      '<strong>İpucu:</strong><span data-ia-clue>'+esc(current.clue)+'</span></div>'+
      '<div class="ia-slots" aria-label="Gizli kelime" data-ia-slots></div></section>';
  }
  function drawKeys(){
    return '<div class="ia-keys" aria-label="Harf klavyesi" data-ia-keyboard style="grid-template-columns:repeat('+ (current.keys.length>18?7:6) +',minmax(0,1fr))">'+
      current.keys.map(ch=>'<button type="button" data-ia-letter="'+ch+'" aria-label="'+ch+' harfini seç">'+ch+'</button>').join('')+'</div>';
  }
  function drawTools(){
    return '<footer class="ia-tools"><div class="ia-boosters">'+
      '<button type="button" class="ia-booster" data-ia-boost="reveal"><span aria-hidden="true">💡</span>Harf Göster</button>'+
      '<button type="button" class="ia-booster eraser" data-ia-boost="erase"><span aria-hidden="true">🧽</span>Yanlışları Sil</button>'+
      '<button type="button" class="ia-booster audio" data-ia-boost="speak"><span aria-hidden="true">🔊</span>Sesli İpucu</button></div>'+
      '<div class="ia-bottomline" data-ia-boost-count>🃏 Kalan joker: '+(maxBoosts-usedBoosts)+'/'+maxBoosts+'</div>'+
      '<button type="button" class="ia-skip" data-ia-skip disabled>» Kelimeyi geç</button>'+
      '<p class="ia-message" role="status" aria-live="polite">Doğru harfleri seçerek Papi’yi sandığa ulaştır!</p></footer>';
  }
  function refresh(){
    if(!current)return;
    const row=get('[data-ia-slots]'),keyboard=get('[data-ia-keyboard]'),scene=get('.ia-scene');
    if(!row||!keyboard||!scene)return;
    row.innerHTML=[...current.word].map(ch=>{
      const fixed=!/[A-Z]/.test(ch),visible=fixed||current.guessed.has(ch);
      return '<span class="ia-slot'+(fixed?' fixed':'')+'">'+esc(visible?ch:'_')+'</span>';
    }).join('');
    const unique=Math.max(1,letters(current.word).length),ratio=letters(current.word).filter(ch=>current.guessed.has(ch)).length/unique;
    get('.ia-parrot')?.style.setProperty('--ia-papi-left',(4+Math.min(52,ratio*52)).toFixed(1)+'%');
    keyboard.querySelectorAll('[data-ia-letter]').forEach(btn=>{
      const ch=btn.dataset.iaLetter,used=current.guessed.has(ch)||current.wrong.has(ch);
      btn.disabled=current.locked||used||current.removed.has(ch);
      btn.classList.toggle('correct',current.guessed.has(ch));
      btn.classList.toggle('wrong',current.wrong.has(ch));
      btn.classList.toggle('removed',current.removed.has(ch));
    });
    let h=get('[data-ia-lives]');if(h){h.innerHTML=Array.from({length:5},(_,i)=>'<span class="'+(i>=current.lives?'lost':'')+'">♥</span>').join('');h.setAttribute('aria-label','Kalan can: '+current.lives);}
    const sc=get('[data-ia-score]');if(sc)sc.textContent=asmacaPuan;
    const skip=get('[data-ia-skip]');if(skip)skip.disabled=current.locked||current.wrong.size<2;
    const budget=get('[data-ia-boost-count]');if(budget)budget.textContent='🃏 Kalan joker: '+Math.max(0,maxBoosts-usedBoosts)+'/'+maxBoosts;
    get('[data-ia-boost="reveal"]')?.toggleAttribute('disabled',current.locked||usedBoosts>=maxBoosts||current.usedTypes.has('reveal')||solved(current.word,current.guessed));
    get('[data-ia-boost="erase"]')?.toggleAttribute('disabled',current.locked||usedBoosts>=maxBoosts||current.usedTypes.has('erase')||ABC.split('').filter(x=>!current.word.includes(x)&&current.keys.includes(x)&&!current.wrong.has(x)).length===0);
    get('[data-ia-boost="speak"]')?.toggleAttribute('disabled',current.locked||usedBoosts>=maxBoosts||current.usedTypes.has('speak'));
  }
  function flash(symbol,good){
    const scene=get('.ia-scene'),feedback=get('.ia-feedback');if(!scene||!feedback)return;
    scene.classList.remove('ia-wrong','ia-correct');void scene.offsetWidth;
    scene.classList.add(good?'ia-correct':'ia-wrong');feedback.textContent=symbol;
    setTimeout(()=>{if(scene.isConnected){scene.classList.remove('ia-wrong','ia-correct');feedback.textContent='';}},620);
  }
  function finishWord(success){
    if(current&&!current.locked)window.dmVerifiedGames?.record(asmacaKelimeler[asmacaAktifIndex],success?current.word:null);
    if(!current||current.locked)return;
    current.locked=true;
    const word=current.word,hadMistakes=current.wrong.size>0,token=run;
    if(success){
      OC.dogru(hadMistakes||current.assisted?.5:1,!hadMistakes&&!current.assisted);
      asmacaDogruSayi++;
      asmacaKombo=hadMistakes?0:asmacaKombo+1;
      sound('dogru');flash('✅',true);
      try{if(typeof genelKomboGoster==='function')genelKomboGoster(asmacaKombo,document.querySelector('#asmacaOyunOverlay .game-modal-content'))}catch(_){}
      status('🎉 '+word+' — Sandığa ulaştın!');
    }else{
      asmacaYanlisSayi++;asmacaKombo=0;OC.yanlis(false);
      try{window.dmWrongWords?.add(asmacaKelimeler[asmacaAktifIndex]);}catch(_){}
      sound('yanlis');flash('💔',false);status('Tekrar çalış: '+word+' = '+current.clue);
      get('[data-ia-slots]').innerHTML=[...word].map(ch=>'<span class="ia-slot">'+esc(ch)+'</span>').join('');
    }
    asmacaPuan=OC.puan();const sc=get('[data-ia-score]');if(sc)sc.textContent=asmacaPuan;
    refresh();
    timeout=setTimeout(()=>{if(token!==run)return;asmacaAktifIndex++;window.asmacaSonrakiKelime();},success?1100:1700);
  }
  function pick(ch){
    if(current&&!current.locked)window.dmVerifiedGames?.record(asmacaKelimeler[asmacaAktifIndex],{letter:ch});
    if(!current||current.locked||current.guessed.has(ch)||current.wrong.has(ch)||current.removed.has(ch)||!current.keys.includes(ch))return;
    if(current.word.includes(ch)){
      current.guessed.add(ch);asmacaTahminEdilenHarfler=[...current.guessed];sound('dogru');flash('✓',true);
      refresh();
      if(solved(current.word,current.guessed))finishWord(true);
      else status('Harika! Papi bir taş daha ilerledi.');
    }else{
      current.wrong.add(ch);asmacaYanlisSayisi=current.wrong.size;current.lives=Math.max(0,5-current.wrong.size);asmacaCan=current.lives;
      sound('yanlis');flash('✕',false);refresh();
      if(current.lives===0)finishWord(false);else status('Bu harf kelimede yok. Kalan can: '+current.lives);
    }
  }
  function boost(type){
    if(!current||current.locked||usedBoosts>=maxBoosts||current.usedTypes.has(type))return;
    if(type==='reveal'){
      const a=letters(current.word).filter(ch=>!current.guessed.has(ch));
      if(!a.length)return;
      current.assisted=true;current.usedTypes.add(type);usedBoosts++;pick(a[0]);
      status('💡 Bir harf açıldı.');refresh();return;
    }
    if(type==='erase'){
      const a=current.keys.filter(ch=>!current.word.includes(ch)&&!current.wrong.has(ch)&&!current.removed.has(ch));
      if(!a.length)return;
      current.usedTypes.add(type);usedBoosts++;a.slice(0,Math.min(2,a.length)).forEach(ch=>current.removed.add(ch));
      status('🧽 İki yanlış seçenek kaldırıldı.');refresh();return;
    }
    if(type==='speak'){
      if(!speak(current.word))return;
      current.usedTypes.add(type);usedBoosts++;status('🔊 Kelimenin İngilizce okunuşunu dinle.');refresh();
    }
  }
  function next(){
    clearTimeout(timeout);timeout=null;clearInterval(ticker);
    const overlay=document.getElementById(id),body=document.getElementById('asmacaOyunEkrani');
    if(!overlay||!body||body.style.display==='none')return;
    if(asmacaAktifIndex>=asmacaKelimeler.length){
      stop();return originalFinish();
    }
    if(asmacaAktifIndex===0){usedBoosts=0;maxBoosts=quota(progressLevel());}
    run++;
    const k=asmacaKelimeler[asmacaAktifIndex];
    asmacaAktifKelime=String(k.ingilizce||k.en||'').trim().toUpperCase();
    asmacaTahminEdilenHarfler=[];asmacaYanlisSayisi=0;asmacaCan=5;
    asmacaKelimeBaslangicZamani=Date.now();
    current={word:asmacaAktifKelime,clue:String(k.turkce||k.tr||''),begin:Date.now(),lives:5,locked:false,
      keys:makeKeys(asmacaAktifKelime),guessed:new Set(),wrong:new Set(),removed:new Set(),usedTypes:new Set(),assisted:false};
    const bar=document.getElementById('jkBar');if(bar)overlay.querySelector('.game-modal-content')?.appendChild(bar);
    overlay.classList.remove('ia-intro');overlay.classList.add('ia-playing');
    body.innerHTML='<main class="ia-screen" aria-label="Papi’nin Harf Adası oyunu">'+drawHeader()+drawScene()+drawAnswers()+drawKeys()+drawTools()+'</main>';
    body.querySelectorAll('[data-ia-close]').forEach(b=>b.addEventListener('click',exitToGames));
    body.querySelectorAll('[data-ia-letter]').forEach(b=>b.addEventListener('click',()=>pick(b.dataset.iaLetter)));
    body.querySelectorAll('[data-ia-boost]').forEach(b=>b.addEventListener('click',()=>boost(b.dataset.iaBoost)));
    body.querySelector('[data-ia-skip]').addEventListener('click',()=>{if(current&&!current.locked&&current.wrong.size>=2)finishWord(false);});
    refresh();timerStart();
  }
  if(typeof window.asmacaSonrakiKelime!=='function'||typeof window.asmacaOyunuBitir!=='function')return;
  const originalFinish=window.asmacaOyunuBitir,originalClose=window.asmacaOyunKapat,originalOpen=window.asmacaOyunAc;
  window.asmacaSonrakiKelime=next;
  window.asmacaOyunuBitir=function(){stop();return originalFinish.apply(this,arguments);};
  window.asmacaOyunKapat=function(){const r=originalClose.apply(this,arguments);if(document.getElementById(id)?.style.display==='none')stop();return r;};
  window.asmacaOyunAc=function(){stop();const r=originalOpen.apply(this,arguments);const title=get('.game-title');if(title)title.textContent='🏝️ Papi’nin Harf Adası';document.getElementById(id)?.classList.add('ia-intro');return r;};
})();
