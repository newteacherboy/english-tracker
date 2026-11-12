/* Papi'nin Harf Adasi • isolated replacement for the asmaca play screen.
   Existing class/unit selection, OC scoring, energy debit and server leaderboards remain authoritative. */
(() => {
  'use strict';
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const letters = word => [...new Set(String(word).toUpperCase().replace(/[^A-Z]/g, '').split(''))];
  // [12 Kas 2026] Sade Ada: klavyede yalnız kelimenin harfleri (tekrar edenler kadar). Harfler sırayla yazılır.
  function makeKeys(word, random=Math.random) {
    const a=String(word).toUpperCase().replace(/[^A-Z]/g,'').split('');
    for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  const solved = (word,guessed)=>letters(word).every(ch=>guessed.has(ch));
  const quota = ()=>0;
  window.dmHarfAdasiCore=Object.freeze({makeKeys,solved,quota,letters});
  const id='asmacaOyunOverlay',get=sel=>document.querySelector('#'+id+' '+sel);
  let current=null,timeout=null,ticker=null,run=0;
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
  const HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>';
  function drawHeader(){
    const total=asmacaKelimeler.length,index=asmacaAktifIndex+1,pct=Math.round(100*asmacaAktifIndex/Math.max(1,total));
    return '<header class="ha-hud"><div class="ha-pill ha-clock"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg><span data-ia-timer>0.0 sn</span></div>'+
      '<div class="ia-hearts ha-hearts" data-ia-lives aria-label="Kalan can: 5"></div>'+
      '<div class="ha-pill ha-score" aria-label="Puan"><b data-ia-score>'+asmacaPuan+'</b></div></header>'+
      '<section class="ha-trip" aria-label="Sandığa yolculuk"><div class="ha-trip-top"><span>Sandığa yolculuk</span><span data-ia-round>'+index+' / '+total+' kelime</span></div>'+
      '<div class="ha-road"><i style="width:'+pct+'%"></i><span class="ha-papi" style="left:calc('+pct+'% - 11px)"></span><span class="ha-chest" aria-hidden="true"></span></div></section>';
  }
  function drawScene(){return '<span class="ia-feedback" aria-live="polite"></span>';}
  function drawAnswers(){
    return '<section class="ha-clue"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/></svg><span data-ia-clue>'+esc(current.clue)+'</span></section>'+
      '<div class="ha-slots" aria-label="Gizli kelime" data-ia-slots></div>';
  }
  function drawKeys(){
    const n=current.keys.length,cols=n<=6?n:n<=12?6:n<=21?7:8;
    return '<div class="ha-keys" aria-label="Harfler" data-ia-keyboard style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+
      current.keys.map((ch,i)=>'<button type="button" data-ia-letter="'+ch+'" data-ia-tile="'+i+'" aria-label="'+ch+' harfi">'+ch+'</button>').join('')+'</div>';
  }
  function drawTools(){
    return '<footer class="ha-tools">'+
      '<button type="button" class="ha-skip" data-ia-skip disabled>Kelimeyi geç</button></footer>'+
      '<p class="ia-message" role="status" aria-live="polite">Harfleri kelimedeki sırayla seç.</p>';
  }
  function slotsHtml(){
    const done=current.seq.slice(0,current.pos).map(x=>x.i);let k=0;
    return current.word.split(' ').map(part=>{
      const cells=[...part].map(ch=>{const at=k++;if(!/[A-Z]/.test(ch))return '<span class="ia-slot fixed">'+esc(ch)+'</span>';
        const shown=done.includes(at)||current.locked&&current.reveal,cur=!current.locked&&current.seq[current.pos]?.i===at;
        return '<span class="ia-slot'+(shown?' on':'')+(cur?' cur':'')+'">'+(shown?esc(ch):'')+'</span>';}).join('');
      k++;return '<span class="ha-word">'+cells+'</span>';
    }).join('');
  }
  function refresh(){
    if(!current)return;
    const row=get('[data-ia-slots]'),keyboard=get('[data-ia-keyboard]');
    if(!row||!keyboard)return;
    row.innerHTML=slotsHtml();
    keyboard.querySelectorAll('[data-ia-tile]').forEach(btn=>{
      const i=+btn.dataset.iaTile;btn.disabled=current.locked||current.used.has(i);btn.classList.toggle('correct',current.used.has(i));
    });
    let h=get('[data-ia-lives]');if(h){h.innerHTML=Array.from({length:5},(_,i)=>'<span class="'+(i>=current.lives?'lost':'')+'">'+HEART+'</span>').join('');h.setAttribute('aria-label','Kalan can: '+current.lives);}
    const sc=get('[data-ia-score]');if(sc)sc.textContent=asmacaPuan;
    const skip=get('[data-ia-skip]');if(skip)skip.disabled=current.locked||current.mistakes<2;
  }
  function flash(symbol,good){
    const feedback=get('.ia-feedback');if(!feedback)return;
    feedback.textContent=symbol;feedback.classList.toggle('bad',!good);
    setTimeout(()=>{if(feedback.isConnected)feedback.textContent='';},620);
  }
  function finishWord(success){
    if(current&&!current.locked)window.dmVerifiedGames?.record(asmacaKelimeler[asmacaAktifIndex],success?current.word:null);
    if(!current||current.locked)return;
    current.locked=true;
    const word=current.word,hadMistakes=current.mistakes>0,token=run;
    if(success){
      OC.dogru(hadMistakes||current.assisted?.5:1,!hadMistakes&&!current.assisted);
      asmacaDogruSayi++;
      asmacaKombo=hadMistakes?0:asmacaKombo+1;
      sound('dogru');flash('✓',true);
      try{if(typeof genelKomboGoster==='function')genelKomboGoster(asmacaKombo,document.querySelector('#asmacaOyunOverlay .game-modal-content'))}catch(_){}
      status(word+' · Harika!');
    }else{
      asmacaYanlisSayi++;asmacaKombo=0;OC.yanlis(false);
      try{window.dmWrongWords?.add(asmacaKelimeler[asmacaAktifIndex]);}catch(_){}
      sound('yanlis');flash('✕',false);status('Tekrar çalış: '+word+' = '+current.clue);
      current.reveal=true;
    }
    asmacaPuan=OC.puan();
    refresh();
    timeout=setTimeout(()=>{if(token!==run)return;asmacaAktifIndex++;window.asmacaSonrakiKelime();},success?1000:1700);
  }
  function pick(tile){
    if(!current||current.locked||current.used.has(tile))return;
    const ch=current.keys[tile];if(!ch)return;
    window.dmVerifiedGames?.record(asmacaKelimeler[asmacaAktifIndex],{letter:ch});
    const need=current.seq[current.pos]?.ch;
    if(ch===need){
      current.used.add(tile);current.pos++;asmacaTahminEdilenHarfler=current.seq.slice(0,current.pos).map(x=>x.ch);
      sound('dogru');refresh();
      if(current.pos>=current.seq.length)finishWord(true);
    }else{
      current.mistakes++;asmacaYanlisSayisi=current.mistakes;current.lives=Math.max(0,5-current.mistakes);asmacaCan=current.lives;
      sound('yanlis');flash('✕',false);
      const b=get('[data-ia-tile="'+tile+'"]');if(b){b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');}
      refresh();
      if(current.lives===0)finishWord(false);else status('Sıradaki harf bu değil. Kalan can: '+current.lives);
    }
  }
  function next(){
    clearTimeout(timeout);timeout=null;clearInterval(ticker);
    const overlay=document.getElementById(id),body=document.getElementById('asmacaOyunEkrani');
    if(!overlay||!body||body.style.display==='none')return;
    if(asmacaAktifIndex>=asmacaKelimeler.length){
      stop();return originalFinish();
    }
    run++;
    const k=asmacaKelimeler[asmacaAktifIndex];
    asmacaAktifKelime=String(k.ingilizce||k.en||'').trim().toUpperCase();
    asmacaTahminEdilenHarfler=[];asmacaYanlisSayisi=0;asmacaCan=5;
    asmacaKelimeBaslangicZamani=Date.now();
    const seq=[...asmacaAktifKelime].map((ch,i)=>({ch,i})).filter(x=>/[A-Z]/.test(x.ch));
    current={word:asmacaAktifKelime,clue:String(k.turkce||k.tr||''),begin:Date.now(),lives:5,locked:false,
      keys:makeKeys(asmacaAktifKelime),seq,pos:0,used:new Set(),mistakes:0,usedTypes:new Set(),assisted:false,reveal:false};
    const bar=document.getElementById('jkBar');if(bar)overlay.querySelector('.game-modal-content')?.appendChild(bar);
    overlay.classList.remove('ia-intro');overlay.classList.add('ia-playing');
    body.innerHTML='<main class="ia-screen ha-v2" aria-label="Papi’nin Harf Adası oyunu">'+drawHeader()+drawScene()+drawAnswers()+'<div class="ha-bottom">'+drawKeys()+drawTools()+'</div></main>';
    body.querySelectorAll('[data-ia-close]').forEach(b=>b.addEventListener('click',exitToGames));
    body.querySelectorAll('[data-ia-tile]').forEach(b=>b.addEventListener('click',()=>pick(+b.dataset.iaTile)));
    body.querySelector('[data-ia-skip]').addEventListener('click',()=>{if(current&&!current.locked&&current.mistakes>=2)finishWord(false);});
    refresh();timerStart();
  }
  if(typeof window.asmacaSonrakiKelime!=='function'||typeof window.asmacaOyunuBitir!=='function')return;
  const originalFinish=window.asmacaOyunuBitir,originalClose=window.asmacaOyunKapat,originalOpen=window.asmacaOyunAc;
  window.asmacaSonrakiKelime=next;
  window.asmacaOyunuBitir=function(){stop();return originalFinish.apply(this,arguments);};
  window.asmacaOyunKapat=function(){const r=originalClose.apply(this,arguments);if(document.getElementById(id)?.style.display==='none')stop();return r;};
  window.asmacaOyunAc=function(){stop();const r=originalOpen.apply(this,arguments);const title=get('.game-title');if(title)title.textContent='🏝️ Papi’nin Harf Adası';document.getElementById(id)?.classList.add('ia-intro');return r;};
})();
