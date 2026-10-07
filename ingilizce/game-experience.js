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
    ['trenGirisEkrani','trenOyunOverlay','Kelime Treni','Vagonları sırala, doğru İngilizce cümleyi kur.'],
    ['kpKelimeGirisEkrani','tab-konusmapratigi','Kelime Modu','Kelimeyi İngilizce söyle veya yazarak cevapla.']
  ];
  const ruleText = 'Doğru +100 · Seri bonusları · Hız bonusu · Yanlış −40 puan / turdan −3 XP';
  function decorate() {
    for (const [id,modal,title,description] of entries) {
      const entry=document.getElementById(id),root=document.getElementById(modal);
      if (!entry||!root) continue;
      entry.classList.add('dm-garden-entry');
      if (!entry.querySelector('.dm-entry-intro')) {
        const intro=document.createElement('div');intro.className='dm-entry-intro';
        intro.innerHTML='<img src="papi-welcome-v2.png" alt="Papi"><p></p>';
        const heading=document.createElement('header');heading.className='dm-entry-heading';heading.innerHTML='<small>PAPİ İLE OYUN ZAMANI</small><h2></h2>';heading.querySelector('h2').textContent=title;heading.querySelector('h2').style.setProperty('color','#234e45','important');entry.prepend(heading);
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
      const state={key,classNo:1,units:[1]},previous=document.activeElement;
      function close(){overlay.remove();previous?.focus?.();}
      function choose(n){state.classNo=n;overlay.querySelectorAll('[data-class]').forEach(b=>b.classList.toggle('active',Number(b.dataset.class)===n));genericSinifGuncelle(n,'dmIntroUnits',u=>state.units=u);}
      for(let n=1;n<=8;n++){const b=document.createElement('button');b.className='sinif-btn';b.dataset.class=n;b.textContent=n+'. Sınıf';b.onclick=()=>choose(n);overlay.querySelector('.hb-classes').append(b);}
      // Sentence bank is level-based, so only show the class selection it actually supports.
      if(key==='cumle'){overlay.querySelector('[data-units]').hidden=true;overlay.querySelector('.hb-intro p').textContent+=' Cümleler seçtiğin sınıfın seviyesine göre gelir.';}
      document.body.append(overlay);sinifGridKisitlamaUygula('dmIntroClasses',n=>state.classNo=n,choose);
      overlay.querySelector('[data-close]').onclick=close;
      overlay.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const f=[...overlay.querySelectorAll('button:not(:disabled)')].filter(x=>x.getClientRects().length);if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}}};
      overlay.querySelector('[data-start]').onclick=()=>{if(key==='dikte'&&oyunHavuzGetir(state.classNo,state.units).filter(k=>/^[a-zA-Z]{3,10}$/.test(k.ingilizce||k.en||'')).length<8){overlay.querySelector('.hb-status').textContent='En az 8 kelime için başka bir ünite daha seç.';return;}window.dmSelectedIntro=state;close();try{original();}finally{window.dmSelectedIntro=null;}};
      overlay.querySelector('[data-close]').focus();
    };
  }
  // Every shared-core game, including those without an old timer, shows elapsed seconds.
  const badge=document.createElement('div');badge.id='dmGameClock';badge.className='dm-game-clock';badge.hidden=true;document.body.append(badge);
  function updateClock(){
    const d=window.OC?.aktif;if(!d||d.bitti){badge.hidden=true;return;}
    const visible=[...document.querySelectorAll('.game-modal-overlay,.yo-modal,.hb-overlay,.bc-perde,.bz-perde,#kpKelimeOyunEkrani')].some(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden');
    badge.hidden=!d||d.bitti||!visible;
    if(!badge.hidden)badge.textContent='⏱ '+OC.sure().toFixed(1)+' sn · '+OC.puan()+' puan';
  }
  setInterval(updateClock,200);
  window.dmGameExperience={decorate,updateClock};
})();
