/* Approved study presentation. Existing content, gates, scoring and rewards stay authoritative. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id),root=$('tab-derscalis');if(!root)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ico=n=>`<svg class="su-icon" aria-hidden="true"><use href="study-assets/icons.svg#${n}"></use></svg>`;
 const art=(n,c='')=>`<img class="su-papi ${c}" src="study-assets/papi-${n}.png" alt="" loading="lazy" decoding="async">`;
 const cats={grammar:['Dil bilgisi','book'],vocab:['Kelimeler','sun'],comm:['İletişim','chat'],pron:['Telaffuz','sound']};
 const levels={A1:'Başlangıç',A2:'Temel',B1:'Orta',B2:'Orta-Üstü'};
 let filter='all',category='all',query='',question=0,lastSignature='',owner='',details=[],detailReady=false,resumeState={},contentSignature='',wrongUntil=[],reviewed=new Set(),waitTimer=0,finishing=false,completedRun=false,quizRun=0,levelSignature='';
 let studyRunId='',studyRecovery=false,studyRecoveryIndices=[],studyOriginalQuestions=[],studyTopic='';
 root.addEventListener('click',e=>{const exit=e.target.closest('.dc-exit-btn');if(!exit)return;const screen=root.querySelector('.dc-screen.active');if(screen&&screen.id!=='dcScreenLevels'){e.preventDefault();e.stopImmediatePropagation();if(typeof dcGecmis!=='undefined'&&dcGecmis.length>1)window.dcGeriGit?.();else window.dcAnaEkranaDon?.();}},true);
 const actor=()=>String(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi||'').trim().toLocaleLowerCase('tr');
 const key=k=>[k.seviye,k.kategori,k.konuAdi].join('|');
 const storage=()=> 'dm-study-resume-v1:'+actor();
 function read(){try{return JSON.parse(localStorage.getItem(storage())||'{}');}catch{return {};}}
 function studyLevelOpen(code){
  const order=Object.keys(levels),index=order.indexOf(code);if(index<0)return false;
  if(window.dmGuestMode||!actor()||actor()==='teacher')return true;
  const access=window.dmProgression?.status?.()?.studyAccess;
  return !access||access[code]!==false;
 }
 function studyStartTarget(rows,resume){
  const order=Object.keys(levels),categories=Object.keys(cats),start=Math.max(0,order.indexOf(window.dmProgression?.status?.()?.startPath?.startCefr)),place=code=>{const i=order.indexOf(code);return i>=start?i-start:order.length+start-i;},open=rows.filter(k=>studyLevelOpen(k.seviye)).slice().sort((a,b)=>place(a.seviye)-place(b.seviye)||categories.indexOf(a.kategori)-categories.indexOf(b.kategori)||(Number(a.siraNo)||0)-(Number(b.siraNo)||0));
  const saved=[resume?.level,resume?.category,resume?.topic].join('|');
  return open.find(k=>key(k)===saved&&k.durum!=='tamamlandi')||open.find(k=>k.durum!=='tamamlandi')||open[0];
 }
 function save(stage){if(!dcAktifKonu)return;try{localStorage.setItem(storage(),JSON.stringify({level:dcAktifSeviye,category:dcAktifKategori,topic:dcAktifKonu,stage,signature:contentSignature,read:!!dcAnlatimOnaylandiMi,listened:[...dcOrnekDinlenenSet],time:Date.now()}));}catch{}}
 function signature(d){let h=2166136261;const s=JSON.stringify([d.anlatimHTML,d.ornekler,d.testJSON,d.kelimeSozlugu]);for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return String(h>>>0);}
 function topicRows(){return (dcTumKonularCache||[]).filter(k=>k.seviye===dcAktifSeviye).slice().sort((a,b)=>Object.keys(cats).indexOf(a.kategori)-Object.keys(cats).indexOf(b.kategori)||(Number(a.siraNo)||0)-(Number(b.siraNo)||0));}
 function activeScreen(){return root.querySelector('.dc-screen.active')?.id;}
 function refreshView(){
  const screen=activeScreen();root.dataset.studyScreen=screen||'';
  root.classList.toggle('su-active',!!screen&&screen!=='dcScreenLevels');
  if(screen==='dcScreenLevels')renderLevels();
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
  if(hub.parentElement!==$(activeScreen())) $(activeScreen()).append(hub);
  const markup=`<button class="su-back" data-su="levels">‹ Ders Çalış</button><button class="su-level" data-su="levels">${esc(dcAktifSeviye)} · ${esc(levels[dcAktifSeviye]||'')} <span>⌄</span></button><div class="su-progress"><b>${done} / ${rows.length} konu tamamlandı</b><div class="su-bar"><i style="width:${rows.length?done/rows.length*100:0}%"></i></div></div><label class="su-search">${ico('search')}<input data-su-focus="search" aria-label="Bu seviyede konu ara" placeholder="Konu ara" value="${esc(query)}"></label>${next?`<section class="su-resume">${art('read')}<div><small>${current?'Kaldığın yerden devam et':done===rows.length?'Öğrendiklerini tekrar et':'Birlikte öğrenmeye başlayalım'}</small><b>${esc(next.konuAdi)}</b><button class="su-primary" data-su="open" data-topic="${esc(key(next))}">${current?'Devam et':'Çalışmaya başla'} →</button></div></section>`:''}<div class="su-filters" aria-label="Konu durumları">${[['all','Tümü'],['progress','Devam eden'],['done','Tamamlanan']].map(([id,label])=>`<button data-su="filter" data-value="${id}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div><div class="su-categories" aria-label="Konu alanları">${[['all','Tüm alanlar'],...Object.entries(cats).map(([k,v])=>[k,v[0]])].map(([id,label])=>`<button data-su="category" data-value="${id}" aria-pressed="${category===id}">${label}</button>`).join('')}</div><div class="su-topic-list">${subset.map(k=>{
   const complete=k.durum==='tamamlandi',partial=k===current||k.durum==='basarisiz',stage=k===current?Math.max(1,Math.min(3,Number(resume.stage)||1)):1;
   return `<button class="su-topic ${complete?'su-complete':partial?'su-started':''}" data-su="open" data-topic="${esc(key(k))}"><span class="su-number">${rows.indexOf(k)+1}</span><span class="su-topic-icon">${ico(cats[k.kategori]?.[1]||'book')}</span><span class="su-topic-text"><b>${esc(k.konuAdi)}</b><small>${esc(cats[k.kategori]?.[0]||k.kategori)}${k.bilmiyordum?' · İşaretledin':''}</small>${partial?`<span class="su-mini-progress"><i style="width:${stage/3*100}%"></i></span><small>${stage} / 3 aşama${k.durum==='basarisiz'?' · Tekrar dene':''}</small>`:''}</span><span class="su-topic-status">${complete?ico('check'):partial?'Çalış':'›'}</span></button>`;
  }).join('')||`<p class="su-empty" role="status">${rows.length?'Bu filtreye uygun konu yok.':dcYuklemePromise?'Konular yükleniyor…':'Bu seviye için konu bulunamadı.'}</p>`}</div>`;
  const search=hub.querySelector('[data-su-focus="search"]');
  if(!search){hub.innerHTML=markup;}
  else {
   // Keep the connected input node: replacing/refocusing it dismisses the iOS keyboard.
   const next=document.createElement('div');next.innerHTML=markup;
   const oldChildren=[...hub.children];
   const nextChildren=[...next.children];
   nextChildren.forEach((child,index)=>{
    if(child.classList.contains('su-search'))return;
    if(oldChildren[index])oldChildren[index].replaceWith(child);else hub.append(child);
   });
   while(hub.children.length>nextChildren.length)hub.lastElementChild.remove();
   if(search.value!==query)search.value=query;
  }
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
  if(studyTopic!==dcAktifKonu){studyTopic=dcAktifKonu;studyRecovery=false;studyRecoveryIndices=[];studyOriginalQuestions=[];}
  if(!studyRecovery){studyOriginalQuestions=Array.isArray(dcAktifTestSorulari)?dcAktifTestSorulari.slice():[];studyRunId=crypto.randomUUID();}
  question=0;quizRun++;finishing=false;completedRun=false;wrongUntil=[];reviewed=new Set();clearInterval(waitTimer);waitTimer=0;const panel=$('dcTestIcerik');if(!panel||!panel.querySelector('.dc-quiz-q'))return;
  const head=document.createElement('div');head.id='suQuizProgress';head.className='su-progress';panel.prepend(head);
  const footer=document.createElement('div');footer.className='su-quiz-footer';footer.innerHTML='<button class="su-primary" id="suQuizNext" data-su="next" disabled>Sonraki soru →</button>';panel.append(footer);
  paintQuiz();
 }
 function paintQuiz(){
  const cards=[...root.querySelectorAll('#dcTestIcerik .dc-quiz-q')];if(!cards.length)return;
  question=Math.min(question,cards.length-1);cards.forEach((c,i)=>{c.hidden=i!==question;});
  const head=$('suQuizProgress');if(head){head.innerHTML=`<b>Soru ${question+1} / ${cards.length}</b><div class="su-bar"><i style="width:${(question+1)/cards.length*100}%"></i></div>`;}
  const answered=dcQuizCevaplari[question]!==-1,correct=cards[question].querySelector('.dogru')&&!cards[question].querySelector('.yanlis'),remaining=Math.max(0,Math.ceil(((wrongUntil[question]||0)-Date.now())/1000));
  const next=$('suQuizNext');if(next){next.disabled=!answered||remaining>0||finishing||completedRun;next.textContent=remaining?`Doğru cevabı incele · ${remaining} sn`:answered&&!correct?'Devam et →':question===cards.length-1?'Testi bitir →':'Sonraki soru →';}
  const feedback=cards[question].querySelector('.dt-aciklama');if(answered&&feedback){feedback.hidden=false;feedback.classList.add('su-feedback');if(!feedback.querySelector('.su-feedback-title')){const label=document.createElement('b');label.className='su-feedback-title';label.textContent=correct?'✓ Doğru!':'Doğrusunu birlikte öğrenelim';feedback.prepend(label);feedback.insertAdjacentHTML('beforeend',art(correct?'celebrate':'explain'));}}
 }
 function recordAnswer(qi,selected,right){
  if(dcQuizCevaplari[qi]!==-1)return;dcQuizCevaplari[qi]=selected;
  const chosen=$(`dcQOpt${qi}_${selected}`),answer=$(`dcQOpt${qi}_${right}`),card=root.querySelector(`.dc-quiz-q[data-q="${qi}"]`);
  chosen?.classList.add(selected===right?'dogru':'yanlis');
  card?.querySelectorAll('button').forEach(b=>b.disabled=true);
  if(selected===right){dcQuizDogruSayisi++;window.DijiMeduPapiFeedback?.correct({anchor:chosen,duration:900});}
  else{answer?.classList.add('dogru');wrongUntil[qi]=Date.now()+5000;clearInterval(waitTimer);waitTimer=setInterval(()=>{paintQuiz();if(Date.now()>=wrongUntil[qi]){clearInterval(waitTimer);waitTimer=0;}},100);}
  paintQuiz();
 }
 function showRecoveryPrompt(info){
  $('suStudyRecovery')?.remove();
  const indices=Array.isArray(info.recoveryIndices)?info.recoveryIndices:[];
  const fullRetry=indices.length!==3;
  studyRecoveryIndices=indices;
  const dialog=document.createElement('div');dialog.className='su-result-overlay';dialog.id='suStudyRecovery';
  dialog.innerHTML='<section class="su-result-card su-recovery-card" role="dialog" aria-modal="true" aria-labelledby="suRecoveryTitle">'+art('explain')+'<h2 id="suRecoveryTitle">Papi ile güçlen!</h2><p>İlk denemede '+Number(info.firstCorrect)+' / '+Number(info.total)+' soruyu doğru bildin.</p><p>'+(fullRetry?'Bu kısa testi yeniden deneyerek konuyu pekiştirebilirsin.':'Bütün testi yeniden yapmana gerek yok. Üç soruluk kısa bir pekiştirme yapalım.')+'</p><small>Başarılı olursan konuyu tamamlayabilir ve başarı düzeyine uygun ödül kazanabilirsin.</small><button type="button" class="su-result-done">'+(fullRetry?'Testi yeniden dene →':'3 soruyu çöz →')+'</button></section>';
  dialog.querySelector('button').onclick=()=>{dialog.remove();studyRecovery=!fullRetry;window.dcTestCiz(fullRetry?studyOriginalQuestions:indices.map(i=>studyOriginalQuestions[i]),dcAktifTestAccent);root.querySelector('#dcTab-test')?.scrollIntoView({block:'start'});};
  document.body.append(dialog);dialog.querySelector('button').focus();
 }
 async function finishLesson(total){
  if(finishing||completedRun||!total||dcQuizCevaplari.length!==total||dcQuizCevaplari.some(x=>x===-1))return;
  if(wrongUntil.some((t,i)=>t&&(!reviewed.has(i)||Date.now()<t)))return;
  const name=actor(),topic=dcAktifKonu,level=dcAktifSeviye,cat=dcAktifKategori,wasComplete=dcAktifKonuTamamlanmisMi,run=quizRun;
  const answers=Array.isArray(window.dmStudyAnswers)?window.dmStudyAnswers.slice():[];
  if(answers.length!==total||answers.some(a=>typeof a!=='string'||!a.trim())){window.dcToastGoster?.('Cevaplar tamamlanamadı. Testi yeniden aç.');return;}
  finishing=true;const button=$('suQuizNext');if(button){button.disabled=true;button.textContent='Sonucun doğrulanıyor…';}
  try{
   const response=await fetch(apiURL,{method:'POST',body:JSON.stringify({
    islem:'dersTestSonucKaydet',ogrenci:aktifOgrenciAdi,seviye:level,kategori:cat,konuAdi:topic,
    runId:studyRunId,phase:studyRecovery?'recovery':'first',answers
   })}),data=await response.json();
   if(!response.ok||data.ok===false)throw Error(data.message||data.mesaj||'Sonucun kaydedilemedi. Tekrar deneyebilirsin.');
   if(name!==actor()||run!==quizRun||topic!==dcAktifKonu)return;
   if(data.status==='needs_recovery'){showRecoveryPrompt(data);return;}
   if(data.status!=='success')throw Error('Başarı sonucu alınamadı. Yeniden dene.');
   if(data.yo)window.dmApplyRewardState?.(data.yo,name);
   const amount=Math.max(0,Number(data.eklenenEnerji)||0);
   if(Number.isFinite(Number(data.enerjiKalan))){window.genelEnerjiKalan=Number(data.enerjiKalan);window.headerEnerjiGoster?.(data.enerjiKalan,data.enerjiMax);}
   const row=dcTumKonularCache.find(x=>x.seviye===level&&x.kategori===cat&&x.konuAdi===topic);if(row)row.durum='tamamlandi';
   try{localStorage.setItem('diji_ders_konulari_v1_'+name,JSON.stringify({zaman:Date.now(),veri:dcTumKonularCache}));}catch{}
   completedRun=true;dcAktifKonuTamamlanmisMi=true;
   const result={topic,correct:Number(data.firstCorrect)||0,wrong:(Number(data.total)||total)-(Number(data.firstCorrect)||0),
    xp:Number(data.xp)||0,gold:Number(data.gold)||0,energy:amount,repeat:wasComplete,
    tier:Number(data.tier)||0,recovered:!!data.recovered};
   window.dmStudyUI.lastResult=result;showLessonResult(result);paintStages();void window.dmProgression?.refresh?.(true);
   if(Array.isArray(data.odevTamamlandi)&&data.odevTamamlandi.length){window.dcToastGoster?.('✅ Öğretmeninin verdiği ödev tamamlandı.');void window.dmOdevYenile?.();}
  }catch(e){if(name===actor())window.dcToastGoster?.(e.message);}
  finally{if(run===quizRun){finishing=false;if(name===actor())paintQuiz();}}
 }
 function showLessonResult(r){
  $('suStudyResult')?.remove();const overlay=document.createElement('div');overlay.id='suStudyResult';overlay.className='su-result-overlay';
  const heading=r.recovered?'Pekiştirerek tamamladın!':r.tier===100?'Kusursuz başarı!':'Konuyu tamamladın!';
  overlay.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="suResultTitle" class="su-result-card">'+art('celebrate')+'<h2 id="suResultTitle">'+heading+'</h2><p>'+esc(r.topic)+'</p><p class="su-fair-tier">İlk deneme: '+r.correct+' / '+(r.correct+r.wrong)+' doğru · Ödül oranı %'+r.tier+'</p><div class="su-result-score"><span><b>'+r.correct+'</b> Doğru</span><span><b>'+r.wrong+'</b> Pekiştirilecek</span></div><div class="su-result-rewards"><span><b>+'+r.xp+'</b> XP</span><span><b>+'+r.gold+'</b> Altın</span><span><b>+'+r.energy+'</b> Enerji</span></div><small>'+(r.xp||r.gold||r.energy?'Başarına uygun ödülün hesabına eklendi.':'Bu çalışmada ek ödül yok; tekrar ederek öğrendiklerini güçlendirdin.')+'</small>'+(typeof window.aktivitelerTamEkranAc==='function'?'<button class="su-result-play" type="button">🎮 '+(r.energy?'Kazandığın enerjiyle oyna':'Şimdi oyunla pekiştir')+'</button>':'')+'<button class="su-result-done" type="button">Konulara dön →</button></section>';
  const back=()=>{overlay.remove();window.dcTestSonrasiKonuListesineDon();};
  // Learn first, then play: the lesson result leads straight into games.
  const play=()=>{overlay.remove();window.dcTestSonrasiKonuListesineDon();setTimeout(()=>window.aktivitelerTamEkranAc?.(),0);};
  const buttons=[...overlay.querySelectorAll('button')];overlay.querySelector('.su-result-done').onclick=back;const playButton=overlay.querySelector('.su-result-play');if(playButton)playButton.onclick=play;
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape')back();if(e.key==='Tab'){e.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?buttons.length-1:1))%buttons.length].focus();}});document.body.append(overlay);(playButton||buttons[0]).focus();
 }
 function renderLevels(){
  const rows=dcTumKonularCache||[],resume=read(),player=window.dmProgression?.level?.()||1,status=window.dmProgression?.status?.();
  const signature=JSON.stringify([actor(),rows.map(k=>[key(k),k.durum]),resume,player,status?.lessons,status?.studyAccess,status?.studyPlacementLevel,status?.startPath]);if(signature===levelSignature&&$('suLevels'))return;levelSignature=signature;
  let panel=$('suLevels');if(!panel){panel=document.createElement('div');panel.id='suLevels';$('dcScreenLevels').append(panel);}
  const count=rows.filter(k=>k.durum==='tamamlandi').length,target=studyStartTarget(rows,resume),resuming=target&&key(target)===[resume?.level,resume?.category,resume?.topic].join('|')&&target.durum!=='tamamlandi';
  panel.innerHTML=`<div class="su-levels-heading"><h1>${ico('book')} Ders Çalış</h1></div><section class="su-levels-welcome"><div><h2>Bugün ne öğrenelim?</h2><p>Küçük adımlar, büyük keşifler.</p>${status?.studyPlacementLevel?`<p>Seviye testiyle <b>${esc(status.studyPlacementLevel)}</b> ve altındaki tüm konuların açık.</p>`:''}</div>${art('read')}</section><div class="su-levels-progress"><b>Öğrenme yolculuğun</b><span>${count} / ${rows.length} konu</span><div class="su-bar"><i style="width:${rows.length?count/rows.length*100:0}%"></i></div></div><div class="su-level-cards">${Object.entries(levels).map(([code,label],i)=>{
   const lessons=rows.filter(k=>k.seviye===code),done=lessons.filter(k=>k.durum==='tamamlandi').length,locked=!studyLevelOpen(code);
   return `<button class="su-level-card ${locked?'su-level-locked':''}" data-su="level" data-level="${code}" aria-disabled="${!!locked}" style="--su-level-color:${['#dcfff1','#eee3ff','#fff0d8','#e1f2ff'][i]}"><img class="su-island" loading="lazy" src="study-assets/island-${code.toLowerCase()}.png" alt="" decoding="async"><b>${code}</b><strong>${label}</strong><span class="su-level-count">${done} / ${lessons.length} konu</span><span class="su-level-bar"><i style="width:${lessons.length?done/lessons.length*100:0}%"></i></span><span class="su-level-action">${locked?ico('lock'):''}${locked?'Önce '+Object.keys(levels)[i-1]+'’i bitir veya testi çöz':'Konuları aç →'}</span></button>`;
  }).join('')}</div><p class="su-levels-steps">${ico('book')} Anlatım <span>→</span> ${ico('sound')} Örnekler <span>→</span> ${ico('check')} Test</p><button class="su-levels-resume" data-su="resume" ${target?'':'disabled'}>${resuming?'Kaldığın yerden devam et':'Öğrenmeye başla'} →</button>`;
 }
 function wordMeaning(w){const popup=$('dcHoverBalon');if(!popup)return;popup.innerHTML='<b>'+esc(w.textContent)+'</b> · '+esc(w.dataset.tr||'')+(w.dataset.alt?'<small>'+esc(w.dataset.alt)+'</small>':'');popup.style.display='block';const r=w.getBoundingClientRect(),width=Math.min(280,window.innerWidth-24);popup.style.width=width+'px';popup.style.left=Math.max(12,Math.min(r.left,window.innerWidth-width-12))+'px';popup.style.top=Math.max(12,Math.min(r.bottom+8,window.innerHeight-100))+'px';}
 function dockSpace(){
  const dock=$('bottomNavMobile'),d=dock?.getBoundingClientRect(),h=d?.height||76;root.style.setProperty('--su-dock',Math.max(84,h+16)+'px');
  const panel=$('suLevels');if(activeScreen()!=='dcScreenLevels'||!panel||!root.getClientRects().length)return;
  const viewport=window.visualViewport,bottom=viewport?viewport.offsetTop+viewport.height:window.innerHeight;
  const dockTop=d&&dock.getClientRects().length&&d.height?d.top:bottom;
  const available=Math.floor(Math.min(bottom,dockTop,root.getBoundingClientRect().bottom)-panel.getBoundingClientRect().top-10);
  if(available>0)panel.style.setProperty('--su-level-height',available+'px');
  root.scrollTop=0;
 }
 function install(){
  document.body.classList.add('dm-study-design');
  for(const id of ['dcTab-ornek','dcTab-test'])if($(id)&&$(id).parentElement!==$('dcScreenDetail'))$('dcScreenDetail').append($(id));
  if($('dcBilmiyordumBtn'))$('dcTopicHeader').append($('dcBilmiyordumBtn'));
  $('dcBilmiyordumBtn')?.setAttribute('aria-label','Konuyu tekrar çalışmak için işaretle');
  const wrap=(name,after)=>{const old=window[name];if(typeof old!=='function')return;window[name]=function(){const result=old.apply(this,arguments);after?.apply(this,arguments);return result;};};
  wrap('dcSeviyeSec',()=>{filter='all';category='all';query='';lastSignature='';refreshView();if(dcYuklemePromise)Promise.resolve(dcYuklemePromise).then(refreshView);});
  wrap('dcKategoriSec',function(k){category=k;lastSignature='';refreshView();});
  const screenPositions=new Map(),showStudyScreen=window.dcEkranGoster;
  if(typeof showStudyScreen==='function')window.dcEkranGoster=function(id){const previous=activeScreen(),at=actor();if(previous)screenPositions.set(at+'|'+previous,root.scrollTop);const result=showStudyScreen.apply(this,arguments);refreshView();const offset=screenPositions.get(at+'|'+id)||0;requestAnimationFrame(()=>{if(actor()===at&&activeScreen()===id)root.scrollTop=offset;});return result;};
  for(const n of ['dcGeriGit','dcAnaEkranaDon','dcKategoriIcerikCiz','dcTestSonrasiKonuListesineDon'])wrap(n,refreshView);
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
  window.dcQuizCevapVer=recordAnswer;
  // This presentation owns the completion dialog, replacing the legacy adventure popup.
  finishLesson.__dvSarildi=true;window.dcTestiBitir=finishLesson;
  root.addEventListener('input',e=>{if(e.target.matches('[data-su-focus="search"]')){query=e.target.value;renderTopics();}});
  root.addEventListener('click',e=>{
   const w=e.target.closest('.dc-word');if(w)wordMeaning(w);
   const b=e.target.closest('[data-su]');if(!b||b.disabled)return;
   if(b.dataset.su==='levels'){window.dcAnaEkranaDon();return;}
   if(b.dataset.su==='level'){window.dcSeviyeSec(b.dataset.level,levels[b.dataset.level]);return;}
   if(b.dataset.su==='resume'){const target=studyStartTarget(dcTumKonularCache||[],read());if(!target)return;window.dcSeviyeSec(target.seviye,levels[target.seviye]);if(dcAktifSeviye===target.seviye&&activeScreen()==='dcScreenCats')openTopic(key(target));return;}
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
    if(b.disabled||Date.now()<(wrongUntil[question]||0))return;reviewed.add(question);
    const cards=root.querySelectorAll('#dcTestIcerik .dc-quiz-q');
    if(question===cards.length-1){root.querySelector('#dcTestIcerik .dc-quiz-bitir-btn')?.click();return;}
    question++;paintQuiz();$('dcTab-test').scrollIntoView({block:'start',behavior:'smooth'});
   }
  });
  root.addEventListener('keydown',e=>{const w=e.target.closest('.dc-word');if(w&&(e.key==='Enter'||e.key===' ')){e.preventDefault();w.click();}if(e.key==='Escape'&&$('dcHoverBalon'))$('dcHoverBalon').style.display='none';});
  document.addEventListener('click',e=>{if(!e.target.closest('.dc-word,#dcHoverBalon')&&$('dcHoverBalon'))$('dcHoverBalon').style.display='none';});
  // Observe only screen transitions; rendering a list or a question cannot retrigger the observer.
  const observer=new MutationObserver(refreshView);root.querySelectorAll('.dc-screen').forEach(s=>observer.observe(s,{attributes:true,attributeFilter:['class']}));
  window.addEventListener('resize',dockSpace,{passive:true});window.visualViewport?.addEventListener('resize',dockSpace,{passive:true});window.visualViewport?.addEventListener('scroll',dockSpace,{passive:true});if(window.ResizeObserver)new ResizeObserver(dockSpace).observe(root);if(window.ResizeObserver&&$('bottomNavMobile'))new ResizeObserver(dockSpace).observe($('bottomNavMobile'));
  setInterval(()=>{if(root.getClientRects().length){if(activeScreen()==='dcScreenDetail')paintStages();else if(activeScreen()==='dcScreenLevels')renderLevels();else renderTopics();}},800);
  window.dmStudyUI={refresh:refreshView,topics:renderTopics};refreshView();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
