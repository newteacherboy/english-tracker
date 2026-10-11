/* Approved study presentation. Existing content, gates, scoring and rewards stay authoritative. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id),root=$('tab-derscalis');if(!root)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ico=n=>`<svg class="su-icon" aria-hidden="true"><use href="study-assets/icons.svg#${n}"></use></svg>`;
 const art=(n,c='')=>`<img class="su-papi ${c}" src="study-assets/papi-${n}.png" alt="" decoding="async">`;
 const cats={grammar:['Dil bilgisi','book'],vocab:['Kelimeler','sun'],comm:['İletişim','chat'],pron:['Telaffuz','sound']};
 const levels={A1:'Başlangıç',A2:'Temel',B1:'Orta',B2:'Orta-Üstü'};
 let filter='all',category='all',query='',question=0,lastSignature='',owner='',details=[],detailReady=false,resumeState={},contentSignature='';
 const actor=()=>String(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi||'').trim().toLocaleLowerCase('tr');
 const key=k=>[k.seviye,k.kategori,k.konuAdi].join('|');
 const storage=()=> 'dm-study-resume-v1:'+actor();
 function read(){try{return JSON.parse(localStorage.getItem(storage())||'{}');}catch{return {};}}
 function save(stage){if(!dcAktifKonu)return;try{localStorage.setItem(storage(),JSON.stringify({level:dcAktifSeviye,category:dcAktifKategori,topic:dcAktifKonu,stage,signature:contentSignature,read:!!dcAnlatimOnaylandiMi,listened:[...dcOrnekDinlenenSet],time:Date.now()}));}catch{}}
 function signature(d){let h=2166136261;const s=JSON.stringify([d.anlatimHTML,d.ornekler,d.testJSON,d.kelimeSozlugu]);for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return String(h>>>0);}
 function topicRows(){return (dcTumKonularCache||[]).filter(k=>k.seviye===dcAktifSeviye).slice().sort((a,b)=>Object.keys(cats).indexOf(a.kategori)-Object.keys(cats).indexOf(b.kategori)||(Number(a.siraNo)||0)-(Number(b.siraNo)||0));}
 function activeScreen(){return root.querySelector('.dc-screen.active')?.id;}
 function refreshView(){
  const screen=activeScreen();root.dataset.studyScreen=screen||'';
  root.classList.toggle('su-active',!!screen&&screen!=='dcScreenLevels');
  if(screen==='dcScreenCats'||screen==='dcScreenTopics')renderTopics();
  if(screen==='dcScreenDetail'){if($('dcCrumb'))$('dcCrumb').textContent=dcAktifSeviye+' konuları';paintStages();}
  dockSpace();
 }
 function renderTopics(){
  if(!['dcScreenCats','dcScreenTopics'].includes(activeScreen()))return;
  if(owner!==actor()){owner=actor();filter='all';category='all';query='';lastSignature='';}
  const rows=topicRows(),resume=read();
  const current=rows.find(k=>k.konuAdi===resume.topic&&k.kategori===resume.category&&k.durum!=='tamamlandi');
  const next=current||rows.find(k=>k.durum!=='tamamlandi')||rows[0];
  const done=rows.filter(k=>k.durum==='tamamlandi').length;
  const subset=rows.filter(k=>(category==='all'||k.kategori===category)&&(filter==='all'||filter==='done'&&k.durum==='tamamlandi'||filter==='progress'&&(k.durum==='basarisiz'||current===k))&&k.konuAdi.toLocaleLowerCase('tr').includes(query.trim().toLocaleLowerCase('tr')));
  const signature=JSON.stringify([activeScreen(),dcAktifSeviye,category,filter,query,rows.map(k=>[key(k),k.durum,k.bilmiyordum]),resume]);
  if(signature===lastSignature&&$('suTopics'))return;lastSignature=signature;
  let hub=$('suTopics');if(!hub){hub=document.createElement('div');hub.id='suTopics';}
  $(activeScreen()).append(hub);
  const focus=hub.contains(document.activeElement)?document.activeElement.dataset.suFocus:'';
  const pos=focus?document.activeElement.selectionStart:null;
  hub.innerHTML=`<button class="su-back" data-su="levels">‹ Ders Çalış</button><button class="su-level" data-su="levels">${esc(dcAktifSeviye)} · ${esc(levels[dcAktifSeviye]||'')} <span>⌄</span></button><div class="su-progress"><b>${done} / ${rows.length} konu tamamlandı</b><div class="su-bar"><i style="width:${rows.length?done/rows.length*100:0}%"></i></div></div><label class="su-search">${ico('search')}<input data-su-focus="search" aria-label="Bu seviyede konu ara" placeholder="Konu ara" value="${esc(query)}"></label>${next?`<section class="su-resume">${art('read')}<div><small>${current?'Kaldığın yerden devam et':done===rows.length?'Öğrendiklerini tekrar et':'Birlikte öğrenmeye başlayalım'}</small><b>${esc(next.konuAdi)}</b><button class="su-primary" data-su="open" data-topic="${esc(key(next))}">${current?'Devam et':'Çalışmaya başla'} →</button></div></section>`:''}<div class="su-filters" aria-label="Konu durumları">${[['all','Tümü'],['progress','Devam eden'],['done','Tamamlanan']].map(([id,label])=>`<button data-su="filter" data-value="${id}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div><div class="su-categories" aria-label="Konu alanları">${[['all','Tüm alanlar'],...Object.entries(cats).map(([k,v])=>[k,v[0]])].map(([id,label])=>`<button data-su="category" data-value="${id}" aria-pressed="${category===id}">${label}</button>`).join('')}</div><div class="su-topic-list">${subset.map(k=>{
   const complete=k.durum==='tamamlandi',partial=k===current||k.durum==='basarisiz',stage=k===current?Math.max(1,Math.min(3,Number(resume.stage)||1)):1;
   return `<button class="su-topic ${complete?'su-complete':partial?'su-started':''}" data-su="open" data-topic="${esc(key(k))}"><span class="su-number">${rows.indexOf(k)+1}</span><span class="su-topic-icon">${ico(cats[k.kategori]?.[1]||'book')}</span><span class="su-topic-text"><b>${esc(k.konuAdi)}</b><small>${esc(cats[k.kategori]?.[0]||k.kategori)}${k.bilmiyordum?' · İşaretledin':''}</small>${partial?`<span class="su-mini-progress"><i style="width:${stage/3*100}%"></i></span><small>${stage} / 3 aşama${k.durum==='basarisiz'?' · Tekrar dene':''}</small>`:''}</span><span class="su-topic-status">${complete?ico('check'):partial?'Çalış':'›'}</span></button>`;
  }).join('')||`<p class="su-empty" role="status">${rows.length?'Bu filtreye uygun konu yok.':dcYuklemePromise?'Konular yükleniyor…':'Bu seviye için konu bulunamadı.'}</p>`}</div>`;
  if(focus){const input=hub.querySelector('[data-su-focus="'+focus+'"]');input?.focus({preventScroll:true});if(typeof pos==='number')input?.setSelectionRange(pos,pos);}
 }
 function openTopic(id){
  const topic=topicRows().find(k=>key(k)===id);if(!topic)return;
  dcAktifKategori=topic.kategori;
  if(activeScreen()!=='dcScreenCats'&&activeScreen()!=='dcScreenTopics'){dcGecmis=['dcScreenLevels','dcScreenCats'];dcEkranGoster('dcScreenCats');}
  window.dcKonuAc(topic.konuAdi);
 }
 function paintStages(){
  const complete=!!dcAktifKonuTamamlanmisMi,readDone=complete||dcAnlatimOnaylandiMi,listened=detailReady&&dcOrnekDinlenenSet.size>=dcOrnekToplamSayisi;
  root.querySelectorAll('.dc-tab-btn').forEach((b,i)=>{
   const code=b.dataset.tab,done=code==='anlatim'?readDone:code==='ornek'?complete||listened:complete;
   const blocked=!detailReady||code==='ornek'&&!readDone||code==='test'&&(!readDone||!complete&&!listened);
   b.classList.toggle('su-done',done);b.setAttribute('aria-selected',String(b.classList.contains('active')));b.setAttribute('aria-disabled',String(blocked));
   let n=b.querySelector('.su-stage-number');if(!n){n=document.createElement('span');n.className='su-stage-number';b.prepend(n);}const content=done?ico('check'):String(i+1);if(n.innerHTML!==content)n.innerHTML=content;
  });
  const footer=$('suExampleNext');if(footer){footer.disabled=!complete&&!listened;footer.textContent=footer.disabled?'Teste geçmek için örnekleri dinle':'Testi aç →';}
  const hint=$('suExampleHint');if(hint)hint.hidden=complete||listened;
 }
 function decorateExamples(){
  const panel=$('dcOrnekIcerik');if(!panel)return;
  const rows=panel.querySelectorAll('.dc-example-row');
  rows.forEach((r,i)=>{
   const done=dcOrnekDinlenenSet.has(i);r.classList.toggle('su-listened',done);
   const play=r.querySelector('.dc-ex-play');if(play){play.innerHTML=ico('play');play.setAttribute('aria-label','Örneği dinle: '+(details[i]?.en||''));}
   if(!r.querySelector('.su-slow')){const b=document.createElement('button');b.type='button';b.className='su-slow';b.dataset.su='slow';b.dataset.index=i;b.innerHTML=ico('slow')+' Yavaş dinle';r.append(b);}
   let badge=r.querySelector('.su-listen-check');if(!badge){badge=document.createElement('span');badge.className='su-listen-check';badge.innerHTML=ico('check');badge.setAttribute('aria-label','Dinlendi');r.append(badge);}badge.hidden=!done;
  });
  const count=$('dcOrnekIlerleme');if(count){count.textContent=`${dcOrnekDinlenenSet.size} / ${dcOrnekToplamSayisi} örnek dinlendi`;}
  let hero=$('suListenHero');if(!hero){hero=document.createElement('div');hero.id='suListenHero';hero.className='su-listen-hero';hero.innerHTML=art('explain')+'<span>Dinle, anlamı keşfet!</span>';panel.prepend(hero);}
  let bar=$('suListenBar');if(!bar){bar=document.createElement('div');bar.id='suListenBar';bar.className='su-bar';bar.innerHTML='<i></i>';if(count)count.after(bar);else hero.after(bar);}bar.firstElementChild.style.width=(rows.length?dcOrnekDinlenenSet.size/rows.length*100:0)+'%';
  if(!$('suExampleNext')){const footer=document.createElement('div');footer.className='su-example-footer';footer.innerHTML='<button id="suExampleNext" class="su-primary" data-su="test">Testi aç →</button><small id="suExampleHint">Önce tüm örnekleri dinle.</small>';$('dcTab-ornek').append(footer);}
  paintStages();
 }
 function decorateDetail(){
  if(!$('suLessonHero')){const hero=document.createElement('div');hero.id='suLessonHero';hero.className='su-lesson-hero';hero.innerHTML=art('explain')+'<p>Hadi bu konuyu<br>birlikte keşfedelim!</p>';$('dcAnlatimIcerik').before(hero);}
  if(!$('suWordHint')){const hint=document.createElement('p');hint.id='suWordHint';hint.className='su-word-hint';hint.textContent='Kelimeye dokun, anlamını öğren.';$('dcAnlatimIcerik').after(hint);}
  root.querySelectorAll('.dc-word').forEach(w=>{w.tabIndex=0;w.setAttribute('role','button');w.setAttribute('aria-label',w.textContent+': '+(w.dataset.tr||'anlamını öğren'));});
  decorateExamples();refreshView();
 }
 function setupQuiz(){
  question=0;const panel=$('dcTestIcerik');if(!panel||!panel.querySelector('.dc-quiz-q'))return;
  const head=document.createElement('div');head.id='suQuizProgress';head.className='su-progress';panel.prepend(head);
  const footer=document.createElement('div');footer.className='su-quiz-footer';footer.innerHTML='<button class="su-primary" id="suQuizNext" data-su="next" disabled>Sonraki soru →</button>';panel.append(footer);
  paintQuiz();
 }
 function paintQuiz(){
  const cards=[...root.querySelectorAll('#dcTestIcerik .dc-quiz-q')];if(!cards.length)return;
  question=Math.min(question,cards.length-1);cards.forEach((c,i)=>{c.hidden=i!==question;});
  const head=$('suQuizProgress');if(head){head.innerHTML=`<b>Soru ${question+1} / ${cards.length}</b><div class="su-bar"><i style="width:${(question+1)/cards.length*100}%"></i></div>`;}
  const answered=dcQuizCevaplari[question]!==-1,correct=cards[question].querySelector('.dogru')&&!cards[question].querySelector('.yanlis');
  const next=$('suQuizNext');if(next){next.disabled=!answered||!correct;next.textContent=question===cards.length-1?'Testi bitir →':'Sonraki soru →';}
  const feedback=cards[question].querySelector('.dt-aciklama');if(answered&&feedback){feedback.hidden=false;feedback.classList.add('su-feedback');if(!feedback.querySelector('.su-feedback-title')){const label=document.createElement('b');label.className='su-feedback-title';label.textContent=correct?'✓ Doğru!':'Tekrar deneyelim';feedback.prepend(label);feedback.insertAdjacentHTML('beforeend',art('celebrate'));}}
 }
 function wordMeaning(w){const popup=$('dcHoverBalon');if(!popup)return;popup.innerHTML='<b>'+esc(w.textContent)+'</b> · '+esc(w.dataset.tr||'')+(w.dataset.alt?'<small>'+esc(w.dataset.alt)+'</small>':'');popup.style.display='block';const r=w.getBoundingClientRect(),width=Math.min(280,window.innerWidth-24);popup.style.width=width+'px';popup.style.left=Math.max(12,Math.min(r.left,window.innerWidth-width-12))+'px';popup.style.top=Math.max(12,Math.min(r.bottom+8,window.innerHeight-100))+'px';}
 function dockSpace(){const h=$('bottomNavMobile')?.getBoundingClientRect().height||76;root.style.setProperty('--su-dock',Math.max(84,h+16)+'px');}
 function install(){
  document.body.classList.add('dm-study-design');
  for(const id of ['dcTab-ornek','dcTab-test'])if($(id)&&$(id).parentElement!==$('dcScreenDetail'))$('dcScreenDetail').append($(id));
  if($('dcBilmiyordumBtn'))$('dcTopicHeader').append($('dcBilmiyordumBtn'));
  $('dcBilmiyordumBtn')?.setAttribute('aria-label','Konuyu tekrar çalışmak için işaretle');
  const wrap=(name,after)=>{const old=window[name];if(typeof old!=='function')return;window[name]=function(){const result=old.apply(this,arguments);after?.apply(this,arguments);return result;};};
  wrap('dcSeviyeSec',()=>{filter='all';category='all';query='';lastSignature='';refreshView();if(dcYuklemePromise)Promise.resolve(dcYuklemePromise).then(refreshView);});
  wrap('dcKategoriSec',function(k){category=k;lastSignature='';refreshView();});
  for(const n of ['dcEkranGoster','dcGeriGit','dcAnaEkranaDon','dcKategoriIcerikCiz','dcTestSonrasiKonuListesineDon'])wrap(n,refreshView);
  const oldTopic=window.dcKonuAc;window.dcKonuAc=function(){resumeState=read();detailReady=false;details=[];contentSignature='';const result=oldTopic.apply(this,arguments);if(activeScreen()==='dcScreenDetail'){if(resumeState.topic!==dcAktifKonu||resumeState.level!==dcAktifSeviye||resumeState.category!==dcAktifKategori)save(1);refreshView();root.scrollTop=0;}return result;};
  wrap('dcKonuDetayiCiz',function(d){detailReady=true;try{details=JSON.parse(d.ornekler||'[]');}catch{details=[];}contentSignature=signature(d);
   const restore=resumeState.signature===contentSignature&&resumeState.topic===dcAktifKonu&&resumeState.level===dcAktifSeviye&&resumeState.category===dcAktifKategori;
   if(restore&&resumeState.read){dcAnlatimOnaylandiMi=true;clearInterval(dcAnlatimTimerInterval);const b=$('dcOkudumBtn');if(b){b.disabled=true;b.textContent='Anlatımı tamamladın';}}
   if(restore&&Array.isArray(resumeState.listened))dcOrnekDinlenenSet=new Set(resumeState.listened.filter(i=>Number.isInteger(i)&&i>=0&&i<details.length));
   decorateDetail();
   if(restore&&resumeState.read&&Number(resumeState.stage)>1){const t=Number(resumeState.stage)===3&&dcOrnekDinlenenSet.size>=dcOrnekToplamSayisi?'test':'ornek';window.dcSekmeSec(t,root.querySelector('[data-tab="'+t+'"]'));}
   save(restore?resumeState.stage:1);});
  wrap('dcOkudumAnladimOnayla',()=>{paintStages();if(dcAnlatimOnaylandiMi){save(2);window.dcSekmeSec('ornek',root.querySelector('[data-tab="ornek"]'));}});
  const oldTab=window.dcSekmeSec;window.dcSekmeSec=function(t,b){if(!detailReady||t==='test'&&!dcAktifKonuTamamlanmisMi&&!dcAnlatimOnaylandiMi){window.dcToastGoster?.('Önce anlatımı oku ve onayla.');return;}return oldTab.apply(this,arguments);};
  wrap('dcSekmeSec',function(t){paintStages();if(root.querySelector('[data-tab="'+t+'"]')?.classList.contains('active')){save(t==='anlatim'?1:t==='ornek'?2:3);root.scrollTop=0;}});
  wrap('dcOrnekSesOku',()=>{decorateExamples();save(2);});
  wrap('dcTestCiz',setupQuiz);
  wrap('dcQuizCevapVer',paintQuiz);
  root.addEventListener('input',e=>{if(e.target.matches('[data-su-focus="search"]')){query=e.target.value;renderTopics();}});
  root.addEventListener('click',e=>{
   const w=e.target.closest('.dc-word');if(w)wordMeaning(w);
   const b=e.target.closest('[data-su]');if(!b||b.disabled)return;
   if(b.dataset.su==='levels'){window.dcAnaEkranaDon();return;}
   if(b.dataset.su==='open'){openTopic(b.dataset.topic);return;}
   if(b.dataset.su==='filter'){filter=b.dataset.value;renderTopics();return;}
   if(b.dataset.su==='category'){category=b.dataset.value;renderTopics();return;}
   if(b.dataset.su==='test'){window.dcSekmeSec('test',root.querySelector('[data-tab="test"]'));return;}
   if(b.dataset.su==='slow'){
    const i=Number(b.dataset.index),text=details[i]?.en;if(!text)return;
    if(!('speechSynthesis' in window)){window.dcToastGoster?.('Bu cihazda sesli okuma desteklenmiyor.');return;}
    // Use the existing listener/progress handler, then replace the utterance with the slower voice.
    window.dcOrnekSesOku(i,text);window.dcSesDurdur();const u=new SpeechSynthesisUtterance(text);u.rate=.45;u.lang=dcSesTercihi==='uk'?'en-GB':'en-US';if(dcSecilenVoice)u.voice=dcSecilenVoice;window.speechSynthesis.speak(u);return;
   }
   if(b.dataset.su==='next'){
    const cards=root.querySelectorAll('#dcTestIcerik .dc-quiz-q');
    if(question===cards.length-1){root.querySelector('#dcTestIcerik .dc-quiz-bitir-btn')?.click();return;}
    question++;paintQuiz();$('dcTab-test').scrollIntoView({block:'start',behavior:'smooth'});
   }
  });
  root.addEventListener('keydown',e=>{const w=e.target.closest('.dc-word');if(w&&(e.key==='Enter'||e.key===' ')){e.preventDefault();w.click();}if(e.key==='Escape'&&$('dcHoverBalon'))$('dcHoverBalon').style.display='none';});
  document.addEventListener('click',e=>{if(!e.target.closest('.dc-word,#dcHoverBalon')&&$('dcHoverBalon'))$('dcHoverBalon').style.display='none';});
  // Observe only screen transitions; rendering a list or a question cannot retrigger the observer.
  const observer=new MutationObserver(refreshView);root.querySelectorAll('.dc-screen').forEach(s=>observer.observe(s,{attributes:true,attributeFilter:['class']}));
  window.addEventListener('resize',dockSpace,{passive:true});if(window.ResizeObserver&&$('bottomNavMobile'))new ResizeObserver(dockSpace).observe($('bottomNavMobile'));
  setInterval(()=>{if(root.getClientRects().length&&root.classList.contains('su-active')){if(activeScreen()==='dcScreenDetail')paintStages();else renderTopics();}},800);
  window.dmStudyUI={refresh:refreshView,topics:renderTopics};refreshView();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
