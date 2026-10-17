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

  // Approved compact game skins: Memory Chest concept 2, Missing Letter concept 1.
  const gameSkin=document.createElement('style');gameSkin.id='dm-approved-compact-games';
  gameSkin.textContent=`
  #hafizaOyunOverlay,#boslukOyunOverlay{--dm-play-height:100dvh;box-sizing:border-box;overscroll-behavior:contain}
  #hafizaOyunOverlay .game-modal-content,#boslukOyunOverlay .game-modal-content{box-sizing:border-box;max-height:100dvh!important;height:100dvh!important;overflow:hidden!important;display:flex;flex-direction:column;padding:clamp(5px,1.1dvh,12px)!important;border-radius:0!important}
  #hafizaOyunEkrani,#boslukOyunEkrani{box-sizing:border-box;height:100%;max-height:100%;min-height:0;overflow:hidden!important;display:flex;flex-direction:column;gap:clamp(2px,.5dvh,7px);padding:clamp(3px,.7dvh,9px)!important}
  #hafizaOyunEkrani{background:linear-gradient(180deg,#f3f0ff 0%,#e7f7ff 48%,#fff5dd 100%);border-radius:18px}
  #hafizaKartGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(6,minmax(0,1fr))!important;gap:clamp(2px,.45dvh,7px)!important;flex:1 1 0;min-height:0;overflow:hidden!important}
  #hafizaKartGrid>*{min-width:0;min-height:0;max-height:100%;height:100%!important;box-sizing:border-box;border-radius:clamp(7px,1.5vw,15px)!important;border:1.5px solid #a9dbee!important;background:linear-gradient(155deg,#e2f8ff,#d9efff)!important;color:#193a63!important;box-shadow:0 2px 0 #aacbe4!important;padding:clamp(2px,.5vw,8px)!important;font-size:clamp(9px,2.5vw,14px)!important;line-height:1.12!important;overflow-wrap:anywhere;display:flex;align-items:center;justify-content:center;text-align:center}
  #hafizaKartGrid>*:nth-child(n+13){background:linear-gradient(160deg,#fff9e9,#ffedc5)!important;border-color:#f3c979!important;color:#654114!important;box-shadow:0 2px 0 #d9ae64!important}
  #hafizaOyunEkrani :is(h1,h2,h3),#boslukOyunEkrani :is(h1,h2,h3){margin:0!important;line-height:1.13!important}
  #hafizaOyunEkrani :is(p,small),#boslukOyunEkrani :is(p,small){margin-block:1px!important}
  #boslukOyunEkrani{background:linear-gradient(180deg,#bceaff,#f4f6d7 26%,#e6f7d8 100%);border-radius:18px}
  #boslukSatirlarContainer{display:flex!important;flex-direction:column!important;flex:1 1 0!important;min-height:0!important;overflow:hidden!important;gap:clamp(3px,.65dvh,9px)!important}
  #boslukSatirlarContainer>*{flex:1 1 0!important;min-height:0!important;max-height:33.333%;box-sizing:border-box;margin:0!important;padding:clamp(3px,.75dvh,9px)!important;border:2px solid #d0a15a!important;border-radius:16px!important;background:linear-gradient(145deg,#fff7d9,#ffedc6)!important;box-shadow:0 3px 0 #bb8747!important;overflow:hidden!important;display:flex;flex-direction:column;align-items:center;justify-content:space-evenly}
  #boslukSatirlarContainer button{min-width:0!important;max-height:clamp(22px,4.7dvh,37px)!important;border-radius:9px!important}
  #boslukOyunEkrani :is(.jokerler,.joker-panel,[id*="Joker"],[class*="joker-box"]){flex-shrink:0;max-height:18dvh!important;overflow:hidden}
  @media(max-width:500px){#hafizaOyunOverlay .game-modal-content,#boslukOyunOverlay .game-modal-content{padding-bottom:max(5px,env(safe-area-inset-bottom))!important}#hafizaOyunEkrani,#boslukOyunEkrani{font-size:clamp(10px,2.8vw,14px)}}
  @media(max-height:680px){#hafizaOyunEkrani,#boslukOyunEkrani{gap:2px!important}#hafizaKartGrid{gap:2px!important}#boslukSatirlarContainer{gap:2px!important}#hafizaOyunEkrani :is(p,small),#boslukOyunEkrani :is(p,small){font-size:10px!important}}
  `;
  document.head.append(gameSkin);

  // Approved illustrations and board details, applied to the actual live game DOM.
  const approvedArt=document.createElement('style');approvedArt.id='dm-approved-game-art';
  approvedArt.textContent=`
  #hafizaOyunEkrani{position:relative;isolation:isolate;background:linear-gradient(180deg,#edf1ff 0%,#e8faff 47%,#fff1ce 100%)!important;border:2px solid #b8a9e7;box-shadow:inset 0 0 0 2px #fff9;--dm-game-ink:#322168}
  #boslukOyunEkrani{position:relative;isolation:isolate;background:linear-gradient(180deg,#8fdbff 0%,#d1f5ff 22%,#ddf1bc 73%,#92d685 100%)!important;border:2px solid #72b8e4;box-shadow:inset 0 0 0 2px #fff9;--dm-game-ink:#502d12}
  #hafizaOyunEkrani:before,#boslukOyunEkrani:before{content:"";position:absolute;inset:0 0 auto 0;height:clamp(50px,12dvh,112px);z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 16% 90%,#fff9 0 16%,transparent 17%),radial-gradient(ellipse at 70% 40%,#fff9 0 12%,transparent 13%),linear-gradient(180deg,#a9ecff99,transparent);border-radius:17px 17px 0 0}
  #hafizaOyunEkrani:after,#boslukOyunEkrani:after{content:"";position:absolute;inset:auto 0 0;height:clamp(8px,3dvh,25px);background:linear-gradient(165deg,transparent 26%,#6abd70 27% 44%,transparent 45%),linear-gradient(15deg,transparent 23%,#94de87 24% 51%,transparent 52%);pointer-events:none;z-index:-1}
  #hafizaOyunEkrani .dm-approved-head,#boslukOyunEkrani .dm-approved-head{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:clamp(5px,1.5vw,11px);flex:0 0 auto;min-height:clamp(34px,6.5dvh,58px);max-height:11dvh;padding:3px 6px;color:var(--dm-game-ink);text-align:left;overflow:hidden}
  #hafizaOyunEkrani .dm-approved-head img{object-fit:contain;width:clamp(35px,8vw,58px);height:100%;max-height:58px;filter:drop-shadow(0 3px 4px #376c6840)}
  #hafizaOyunEkrani .dm-approved-head b,#boslukOyunEkrani .dm-approved-head b{display:block;font-size:clamp(14px,4vw,23px);font-weight:1000;line-height:1.1;color:var(--dm-game-ink);text-shadow:0 2px 0 #fff}
  #hafizaOyunEkrani .dm-approved-head small,#boslukOyunEkrani .dm-approved-head small{display:block;font-size:clamp(9px,2.3vw,12px);font-weight:750;line-height:1.15;color:#34526b}
  #hafizaOyunEkrani .dm-approved-head{background:linear-gradient(105deg,#d5f7ffdd,#f7f4ffde);border-radius:14px;border:1px solid #c4e9fb}
  #boslukOyunEkrani .dm-approved-head{background:linear-gradient(178deg,#ffe5a8,#e6a858);border:2px solid #b47631;border-radius:11px;box-shadow:0 3px 0 #94561f, inset 0 2px 1px #fff7}
  #boslukOyunEkrani .dm-approved-head .dm-approved-mascot{display:grid;place-items:center;font-size:clamp(22px,6vw,39px)}
  #hafizaOyunEkrani .dm-approved-labels{display:grid;grid-template-columns:1fr 1fr;gap:5px;flex:0 0 auto;color:#293470;font-size:clamp(9px,2.8vw,13px);font-weight:950;text-align:center}
  #hafizaOyunEkrani .dm-approved-labels span{background:#ffffffd9;border:1px solid #d2c5f4;border-radius:20px;padding:3px 4px}
  #hafizaOyunEkrani .dm-approved-foot{flex:0 0 auto;display:flex;align-items:center;justify-content:center;min-height:clamp(20px,3.7dvh,34px);border-radius:12px;background:#fff9eacc;border:1px solid #f2d59a;color:#4c3a67;font-size:clamp(9px,2.8vw,12px);font-weight:850;text-align:center}
  #boslukOyunEkrani .dm-approved-foot{flex:0 0 auto;text-align:center;color:#704512;font-size:clamp(10px,3vw,14px);font-weight:950;background:linear-gradient(#f5d69f,#ddad69);border:2px solid #b57a36;border-radius:12px;padding:3px}
  #hafizaOyunEkrani .dm-approved-head~*:not(#hafizaKartGrid),#boslukOyunEkrani .dm-approved-head~*:not(#boslukSatirlarContainer){min-height:0}
  #hafizaKartGrid>*{transition:background .12s,transform .12s!important}
  #hafizaKartGrid>*:active{transform:scale(.97)}
  #boslukSatirlarContainer>*{position:relative}
  #boslukSatirlarContainer>*:before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:linear-gradient(#efbc6d,#b97b33);pointer-events:none;border-radius:16px 0 0 16px}
  #boslukOyunEkrani button,#hafizaOyunEkrani button{touch-action:manipulation}
  @media(max-height:700px){#hafizaOyunEkrani .dm-approved-head,#boslukOyunEkrani .dm-approved-head{min-height:28px;max-height:7dvh}#hafizaOyunEkrani .dm-approved-foot,#boslukOyunEkrani .dm-approved-foot{min-height:16px;padding:0}}
  `;
  document.head.append(approvedArt);
  function addApprovedDecor(){
    const specs=[
      ['hafizaOyunEkrani','📦','Hafıza Sandığı','İngilizce ve Türkçe kartları eşleştir!','🇬🇧 İngilizce Kartlar','🇹🇷 Türkçe Kartlar','Eşleşen kartları bul, tüm çiftleri tamamla!'],
      ['boslukOyunEkrani','🐱','Eksik Harf','Kelimelerdeki eksik kutucukları doldur!','','','🌟 Jokerlerini kullan, kelimeleri tamamla!']
    ];
    for(const [id,mascot,title,sub,left,right,footer] of specs){
      const el=document.getElementById(id);if(!el||el.querySelector('.dm-approved-head'))continue;
      const head=document.createElement('div');head.className='dm-approved-head';head.setAttribute('aria-label',title);
      const icon=document.createElement('span');icon.className='dm-approved-mascot';icon.textContent=mascot;
      const caption=document.createElement('div');const h=document.createElement('b');h.textContent=title;const detail=document.createElement('small');detail.textContent=sub;caption.append(h,detail);head.append(icon,caption);
      el.prepend(head);
      if(left){const labels=document.createElement('div');labels.className='dm-approved-labels';const first=document.createElement('span');first.textContent=left;const second=document.createElement('span');second.textContent=right;labels.append(first,second);head.after(labels);}
      // Explanatory decoration is optional: never displace the actual controls.
      // Keep it off small screens, where room belongs to answer buttons.
      if(window.innerHeight>850){const foot=document.createElement('div');foot.className='dm-approved-foot';foot.textContent=footer;el.append(foot);}
    }
  }
  addApprovedDecor();
  const approvedObserver=new MutationObserver(addApprovedDecor);
  for(const id of ['hafizaOyunEkrani','boslukOyunEkrani']){const el=document.getElementById(id);if(el)approvedObserver.observe(el,{childList:true});}
  const ruleText = 'Doğru +100 · Seri bonusları · Hız bonusu · Yanlış −40 puan / turdan −3 XP';
  function decorate() {
    for (const [id,modal,title,description] of entries) {
      const entry=document.getElementById(id),root=document.getElementById(modal);
      if (!entry||!root) continue;
      entry.classList.add('dm-garden-entry');
      if (!entry.querySelector('.dm-entry-intro')) {
        const intro=document.createElement('div');intro.className='dm-entry-intro';
        intro.innerHTML='<img src="papi-welcome-v2.png" alt="Papi"><p></p>';
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
