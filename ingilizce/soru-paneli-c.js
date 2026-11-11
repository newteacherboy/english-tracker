/* [11 Kas 2026] Soru paneli · tasarım C. Görünüm: soru-paneli-c.css
   - Doğru / yanlış sonucu alttan Papili kart olarak gösterir (asıl .ml-feedback ve "Devam Et" butonu yerinde kalır, kart onları kullanır).
   - Şıklara ve butonlara basınca hafif titreşim.
   - ✕ (çıkış) onay ister: "enerjin boşa gider" · Devam et / Çık (thematic-learning.js back() bunu çağırır).
   Sunucu, cevap, enerji ve kombo kuralları değişmez. */
(()=>{
 'use strict';
 if(window.dmSoruPanel)return;
 const papi=cls=>window.dmLivePapi?.markup?'<span class="dm-lp dm-lp-mini '+cls+'" aria-hidden="true">'+window.dmLivePapi.markup()+'</span>':'<img class="'+cls+'" src="study-assets/papi-explain.png" alt="" aria-hidden="true" style="object-fit:contain">';
 const buzz=ms=>{try{navigator.vibrate?.(ms);}catch{}};

 function sheetFor(modal){
  let s=modal.querySelector(':scope>.qc-sheet');
  if(!s){
   s=document.createElement('div');s.className='qc-sheet';s.setAttribute('role','status');s.setAttribute('aria-live','polite');
   s.innerHTML=papi('qc-papi')+'<div class="qc-copy"><div class="qc-head"></div><div class="qc-sub"></div></div><button type="button" class="qc-btn">ANLADIM</button>';
   s.querySelector('.qc-btn').addEventListener('click',()=>{buzz(12);modal.querySelector('.ml-actions [data-next]')?.click();});
   modal.append(s);
  }
  return s;
 }

 function backButton(modal){
  const b=modal.querySelector('.ml-header>[data-back]');if(!b||modal.classList.contains('ml-entry'))return;
  if(b.textContent!=='✕')b.textContent='✕';
  b.setAttribute('aria-label','Çık');
  // Oturum geri butonu stili (play-navigation, CSS katmanı) satır içi !important ile ezilir.
  for(const [k,v] of [['position','static'],['background','transparent'],['border','0'],['box-shadow','none'],['color','#9AAEC6'],['font','900 26px/1 Nunito, system-ui, sans-serif'],['width','40px'],['height','40px']])b.style.setProperty(k,v,'important');
 }

 function update(modal){
  if(!modal.isConnected)return;
  if(modal.classList.contains('ml-entry')){modal.classList.remove('qc-result','qc-wrong');modal.querySelector(':scope>.qc-sheet')?.classList.remove('is-on');return;}
  backButton(modal);
  const fb=modal.querySelector('.ml-feedback');
  const ok=!!fb?.classList.contains('is-correct')&&!!fb.textContent.trim();
  const no=!!fb?.classList.contains('is-answer-wrong');
  modal.classList.toggle('qc-result',ok||no);modal.classList.toggle('qc-wrong',no);
  const s=(ok||no)?sheetFor(modal):modal.querySelector(':scope>.qc-sheet');if(!s)return;
  if(!ok&&!no){s.classList.remove('is-on');return;}
  const text=fb.textContent.trim();
  s.classList.toggle('is-ok',ok);s.classList.toggle('is-no',no);
  s.querySelector('.qc-head').textContent=ok?'✓ Harika!':'✕ Olmadı';
  s.querySelector('.qc-sub').textContent=ok?(/^✓/.test(text)?'Böyle devam! 🔥':text):text.replace(/^Yanlış cevap\.\s*/,'');
  if(no&&lastPick?.isConnected&&modal.contains(lastPick)&&!lastPick.classList.contains('is-correct'))lastPick.classList.add('is-wrong');
  const had=s.classList.contains('is-on');s.classList.add('is-on');
  if(no&&!had)requestAnimationFrame(()=>s.querySelector('.qc-btn')?.focus({preventScroll:true}));
 }

 const watched=new WeakSet();
 function watch(modal){
  if(watched.has(modal))return;watched.add(modal);
  let q=0;const run=()=>{q=0;update(modal);};
  new MutationObserver(()=>{if(!q)q=requestAnimationFrame(run);}).observe(modal,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  update(modal);
 }
 new MutationObserver(()=>{const m=document.getElementById('dmStoryLesson');if(m&&m.classList.contains('ml-lesson'))watch(m);}).observe(document.body,{childList:true});

 let lastPick=null;
 document.addEventListener('click',e=>{const b=e.target?.closest?.('#dmStoryLesson .ml-choices>button');if(b)lastPick=b;},true);
 document.addEventListener('pointerdown',e=>{
  if(e.target?.closest?.('#dmStoryLesson.ml-lesson:not(.ml-entry) :is(.ml-task button,.ml-actions button),.qc-exit button'))buzz(10);
 },{capture:true,passive:true});

 let open=null;
 function confirmExit(onLeave){
  if(open)return;
  buzz([30,40,30]);
  const el=document.createElement('div');el.className='qc-exit';el.setAttribute('role','alertdialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','qcExitTitle');
  el.innerHTML='<div>'+papi('qc-exit-papi')+'<h3 id="qcExitTitle">Çıkmak istediğine emin misin?</h3><p>Şimdi çıkarsan bu durak için harcadığın <b>⚡ enerji boşa gider</b> ve ilerlemen kaydedilmez.</p><button type="button" class="qc-stay">DEVAM ET</button><button type="button" class="qc-leave">Çık</button></div>';
  const prev=document.activeElement;
  const done=leave=>{if(!open)return;open=null;el.classList.remove('is-on');document.removeEventListener('keydown',key,true);setTimeout(()=>el.remove(),260);if(leave)onLeave();else prev?.focus?.({preventScroll:true});};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(false);}};
  el.querySelector('.qc-stay').onclick=()=>done(false);
  el.querySelector('.qc-leave').onclick=()=>done(true);
  el.addEventListener('click',e=>{if(e.target===el)done(false);});
  document.addEventListener('keydown',key,true);
  document.body.append(el);open=el;
  requestAnimationFrame(()=>{el.classList.add('is-on');el.querySelector('.qc-stay').focus({preventScroll:true});});
 }
 window.dmSoruPanel={confirmExit,isExitOpen:()=>!!open};
})();
