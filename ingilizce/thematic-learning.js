/* Papi arena: all learning task types share the approved game panel. Theme-led learning: 20 themes, 240 short lessons; the server owns progress and rewards. */
(()=>{'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const token=()=>who().toLowerCase()==='teacher'?(sessionStorage.getItem('ing_ogr_token')||''):(localStorage.getItem('ing_token')||'');
const identity=()=>who()+'|'+token();
let data=null,loading=null,progress=[],inherited=0,owner='',statusPromise=null,loadedAt=0,modal=null,session=null,chapter=null,epoch=0,busy=false,accepted=false,voice=true,origin=null;
const core=window.DMLearningCore;

let reviewSnapshots=new Map(),reviewScope='';
function saveAnsweredSnapshot(index){
 if(!modal||!Number.isInteger(index)||reviewSnapshots.has(index))return;
 const source=modal.querySelector('.ml-task');if(!source)return;
 const copy=source.cloneNode(true);
 copy.querySelectorAll('.ml-reference-controls,.ml-reference-sheet,[data-next]').forEach(el=>el.remove());
 copy.querySelectorAll('button,input,textarea,select').forEach(el=>{el.disabled=true;el.removeAttribute('autofocus');});
 reviewSnapshots.set(index,{html:copy.innerHTML,feedback:modal.querySelector('.ml-feedback')?.textContent||''});
}
function showAnsweredSnapshot(index){
 if(!modal||modal.classList.contains('ml-entry')||!reviewSnapshots.has(index))return;
 const keys=[...reviewSnapshots.keys()].sort((a,b)=>a-b),item=reviewSnapshots.get(index),at=keys.indexOf(index),previous=document.activeElement;
 modal.querySelector('.ml-history-overlay')?.remove();
 const overlay=document.createElement('div');overlay.className='ml-history-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Cevaplanmış sorular');
 overlay.innerHTML='<section class="ml-history-card"><header><strong>📖 Tamamladığın '+(index===0?'öğrenme aşaması':index+'. soru')+'</strong><button type="button" data-review-exit aria-label="Kapat">×</button></header>'+
 '<p class="ml-history-note">Cevabın kayıtlıdır. İncelemek puan veya ödüllerini değiştirmez.</p><div class="ml-history-body">'+item.html+'</div><p class="ml-history-feedback">'+esc(item.feedback||'Bu aşama tamamlandı.')+'</p>'+
 '<nav class="ml-history-navigation" aria-label="Soru geçmişi"><button type="button" data-review-prev '+(at===0?'disabled':'')+'>← Önceki</button><button type="button" data-review-next '+(at===keys.length-1?'disabled':'')+'>Sonraki →</button></nav><button type="button" class="ml-history-return" data-review-exit>Soruya dön ↩</button></section>';
 const leave=()=>{overlay.remove();previous?.focus?.({preventScroll:true});};
 overlay.querySelectorAll('[data-review-exit]').forEach(b=>b.onclick=leave);
 overlay.querySelector('[data-review-prev]').onclick=()=>showAnsweredSnapshot(keys[at-1]);
 overlay.querySelector('[data-review-next]').onclick=()=>showAnsweredSnapshot(keys[at+1]);
 overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();leave();}};
 modal.append(overlay);overlay.querySelector('[data-review-exit]')?.focus({preventScroll:true});
}
if(!document.getElementById('dm-parkur-history-ui-css')){
 const link=document.createElement('link');link.id='dm-parkur-history-ui-css';link.rel='stylesheet';link.href='parkur-question-parity.css?v=20261017-lesson-2';document.head.append(link);
}

let economy={energy:null,energyMax:30,gold:null,combo:0},progressRevision=0,fitFrame=0,layoutObserver=null,lastComboReward='';
async function curriculum(){if(data)return data;if(loading)return loading;loading=fetch('thematic-curriculum.json?v=20261017-letters-11',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('İçerikler yüklenemedi.');return r.json();}).then(d=>{if(d.version!==5||d.chapters.length!==240||d.themes.length!==20||d.chapters.some((c,i)=>c.id!==1000+i))throw Error('Öğrenme içeriği doğrulanamadı.');data=d;return d;}).finally(()=>loading=null);return loading;}
async function api(action,payload={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(String(apiURL).replace(/\/diji-api(?:\?.*)?$/,'/thematic-learning'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,t:token(),deckVersion:7,...payload}),signal:controller.signal}),d=await r.json();if(!r.ok||!d.ok)throw Object.assign(Error(d.mesaj||'İşlem tamamlanamadı.'),{energyEmpty:d.energyEmpty,enerjiKalan:d.enerjiKalan,enerjiMax:d.enerjiMax});return d;}catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. İlerlemen kayıtlı; tekrar deneyebilirsin.');throw e;}finally{clearTimeout(timer);}}
async function status(force=false){const at=identity();if(owner!==at){owner=at;progress=[];loadedAt=0;statusPromise=null;}if(!force&&loadedAt&&Date.now()-loadedAt<30000)return;if(statusPromise)return statusPromise;statusPromise=(async()=>{await curriculum();const revision=progressRevision,r=await api('status');if(identity()!==at||revision!==progressRevision)return;progress=r.progress;inherited=r.inherited;loadedAt=Date.now();})().finally(()=>{if(owner===at)statusPromise=null;});return statusPromise;}
const done=id=>progress.some(p=>p.chapter===id&&p.completed),next=()=>data.chapters.find(c=>!done(c.id))||data.chapters.at(-1);
function speech(text,lang='en-US'){if(!voice)return;try{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.83;speechSynthesis.speak(u);}catch{}}
function art(card,hidden=false){const im=card?.image;if(!im)return '';let style='',inner='';if(im.type==='sprite')style='background-image:url(learning-assets/objects-0'+im.sheet+'.png);background-size:600% 600%;background-position:'+(im.index%6*20)+'% '+(Math.floor(im.index/6)*20)+'%';if(im.type==='color')style='--ml-color:'+({red:'#ed4040',blue:'#3288df',yellow:'#f9cb31',green:'#36ad68',black:'#253041',white:'#fff'}[im.value]||'#888');if(im.type==='number')inner=esc(im.value);if(im.type==='shape')inner='<span class="ml-shape-'+esc(im.value)+'"></span>';return '<span class="ml-art ml-art-'+esc(im.type)+'" style="'+style+'" '+(hidden?'aria-hidden="true"':'role="img" aria-label="'+esc(card.tr||card.en)+'"')+'>'+inner+'</span>';}
function dialogKeys(el,close){el.addEventListener('keydown',e=>{if(e.defaultPrevented)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const all=[...el.querySelectorAll('button:not(:disabled),summary')].filter(x=>x.getClientRects().length),i=all.indexOf(document.activeElement);if(all.length){e.preventDefault();all[(i+(e.shiftKey?-1:1)+all.length)%all.length].focus();}}});}
async function overview(options={}){await status(!!options.force);const c=next();return {completedCount:data.chapters.filter(c=>done(c.id)).length,total:240,title:c.topicTitle,cefr:'Tema '+c.themeId,theme:c.theme,thematic:true,inherited,chapters:data.chapters.map(x=>({id:x.id,title:x.title,cefr:'Tema '+x.themeId,theme:x.theme,topic:x.topic,part:x.part,current:x.id===c.id,done:done(x.id),available:done(x.id)||x.id===c.id}))};}
async function openAll(){
 document.getElementById('mlThemeList')?.remove();
 const el=document.createElement('div');el.id='mlThemeList';el.className='ml-overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Öğrenme Yolum');
 el.innerHTML='<section class="ml-theme-panel"><header class="ml-theme-cover"><div class="ml-theme-cover-copy"><small>DİJİ-MEDU</small><h2>Öğrenme Yolum</h2><p>Adım adım ilerle, her temayı tamamla ve bilgilerini pekiştir.</p></div><div class="ml-theme-cover-art" aria-hidden="true">📚<span>⭐</span></div><button type="button" data-close aria-label="Kapat">×</button></header><div data-content role="status">Temalar ve ilerlemen yükleniyor…</div></section>';
 document.body.append(el);
 const previous=document.activeElement,close=()=>{el.remove();previous?.focus?.();};
 el.querySelector('[data-close]').onclick=close;dialogKeys(el,close);el.querySelector('[data-close]').focus();const at=identity();
 async function paint(){
  try{
   await status(true);if(!el.isConnected||at!==identity())return;
   const current=next(),completed=data.chapters.filter(c=>done(c.id)).length,total=data.chapters.length,percent=Math.round(completed/Math.max(total,1)*100);
   el.querySelector('[data-content]').removeAttribute('role');
   el.querySelector('[data-content]').innerHTML='<div class="ml-summary-card"><div class="ml-summary-ring" role="progressbar" aria-label="Öğrenme yolu ilerlemesi" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+completed+'" style="--ml-done:'+percent+'%"><div><b>'+completed+'</b><small>/'+total+'</small></div></div><div class="ml-summary-info"><strong>20 tema · '+total+' bölüm</strong><p>Her bölümde öğretim + 11 soru var.</p><div class="ml-summary-track"><span style="width:'+percent+'%"></span></div><small>%'+percent+' tamamlandı</small></div></div>'+
    (inherited?'<p class="ml-inherited"><span aria-hidden="true">💡</span><span>Önceki yolundaki <b>'+inherited+' tamamlanmış bölüm</b>, başlangıç ilerlemene eklendi. Bu bölümleri ödülsüz tekrar edebilirsin.</span></p>':'')+
    '<h3 class="ml-theme-list-heading">Temalarım <small>20 tema</small></h3>'+
    data.themes.map(t=>{
     const rows=data.chapters.filter(c=>c.themeId===t.id),finished=rows.filter(c=>done(c.id)).length,percent=Math.round(finished/Math.max(rows.length,1)*100),isCurrent=t.id===current.themeId;
     return '<details class="ml-theme'+(isCurrent?' ml-theme-current':'')+'" '+(isCurrent?'open':'')+'><summary><span class="ml-theme-number">'+t.id+'</span><span class="ml-theme-info"><strong>'+esc(t.title)+'</strong><small>6 konu · 12 bölüm · '+finished+'/12 tamamlandı</small><span class="ml-theme-track" aria-hidden="true"><span style="width:'+percent+'%"></span></span></span><span class="ml-theme-state" aria-label="'+(finished===12?'Tamamlandı':'Yüzde '+percent+' tamamlandı')+'">'+(finished===12?'✓':percent+'%')+'</span><span class="ml-theme-chevron" aria-hidden="true">⌄</span></summary><div class="ml-theme-body"><div class="ml-topic-heading"><strong>Bu temadaki konular</strong><small>6 konu</small></div><div class="ml-topic-grid">'+t.topics.map((topic,i)=>{
      const pair=rows.filter(c=>c.topic===topic.number),topicFinished=pair.filter(c=>done(c.id)).length,icon=['🏠','👥','📖','💡','🎨','🎯'][i%6],full=topicFinished===pair.length,available=pair.some(c=>done(c.id)||c.id===current.id);
      return '<article class="ml-topic-card'+(full?' is-complete':available?' is-current':'')+'"><div class="ml-topic-head"><span class="ml-topic-number">'+topic.number+'</span><span class="ml-topic-icon" aria-hidden="true">'+icon+'</span><div class="ml-topic-copy"><h3>'+esc(topic.title)+'</h3><p>'+esc(topic.objective)+'</p></div><span class="ml-topic-status'+(full?' is-done':'')+'" aria-label="'+topicFinished+' / '+pair.length+' bölüm tamamlandı"><b>'+(full?'✓':topicFinished+'/'+pair.length)+'</b><small>'+topicFinished+'/'+pair.length+'</small></span></div><div class="ml-topic-steps">'+pair.map(c=>{const complete=done(c.id),unlocked=complete||c.id===current.id;return '<button type="button" data-chapter="'+c.id+'" class="ml-topic-step'+(unlocked?'':' locked')+(complete?' is-done':'')+'" aria-disabled="'+!unlocked+'"><span>'+(complete?'✓':unlocked?'▶':'🔒')+' '+(c.part===1?'Tanı ve anla':'Kullan ve pekiştir')+'</span><small>'+c.number+'. bölüm</small></button>';}).join('')+'</div></article>';
     }).join('')+'</div></div></details>';
    }).join('');
   el.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>{if(b.getAttribute('aria-disabled')==='true'){window.yoToast?.('Önce sıradaki bölümü tamamla.');return;}const id=+b.dataset.chapter;close();open(id);});
  }catch(e){if(el.isConnected){el.querySelector('[data-content]').textContent=e.message;const b=document.createElement('button');b.textContent='Tekrar dene';b.onclick=paint;el.querySelector('[data-content]').append(b);}}
 }
 paint();
}
function close(force=false){const wasOpen=!!modal;if(!force&&window.dmPapiFirstPractice?.locked('independent'))return;if(!force)window.dmPapiFirstPractice?.complete('independent');epoch++;layoutObserver?.disconnect();layoutObserver=null;if(fitFrame)cancelAnimationFrame(fitFrame);fitFrame=0;try{speechSynthesis.cancel();}catch{}modal?.remove();modal=null;busy=false;accepted=false;document.body.classList.remove('dm-story-open');if(wasOpen)document.dispatchEvent(new CustomEvent('dm:story-close'));origin?.focus?.();origin=null;}
async function open(id,options={}){if(busy)return false;await curriculum();if(!options.intro)await status();id=Number(id);if(id>=0&&id<80)id=1000+id;const C=data.chapters.find(c=>c.id===id);if(!C)return false;if(modal&&window.dmPapiFirstPractice?.locked('independent')&&!options.intro)return false;close(!!options.intro);origin=document.activeElement;chapter=C;owner=identity();const scope=owner+'|'+C.id;if(reviewScope!==scope){reviewScope=scope;reviewSnapshots.clear();}const at=owner,ticket=++epoch;modal=document.createElement('div');modal.id='dmStoryLesson';modal.className='ml-lesson ml-overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',C.title);document.body.append(modal);watchLessonLayout();document.body.classList.add('dm-story-open');modal.innerHTML='<section class="ml-loading">Bölüm hazırlanıyor…<button type="button">Geri dön</button></section>';modal.querySelector('button').onclick=()=>close();busy=true;try{const r=await api('open',{chapter:id});if(ticket!==epoch||identity()!==at)return false;session=r;busy=false;wallet(r);entry();return true;}catch(e){if(ticket===epoch&&modal){busy=false;modal.querySelector('.ml-loading').firstChild.textContent=e.message;const retry=document.createElement('button');retry.textContent='Yeniden dene';retry.onclick=()=>open(id,options);modal.querySelector('section').append(retry);}return false;}}
function entry(){
 if(!modal||!session||!chapter)return;
 const count=core.deck(chapter,data.chapters[chapter.number-2]).filter(t=>t.kind!=='teach').length,resume=session.cursor>0&&!session.finished,replay=!!session.replay,mascot=pickEntryMascot();
 const label=session.needsRecovery?'Pekiştirmeye Devam Et':resume?'Öğrenme Yolunda Devam Et':replay?'Yolu Yeniden Keşfet':'Öğrenme Yoluna Başla';
 modal.classList.add('ml-entry');
 modal.innerHTML='<section class="ml-entry-card"><div class="ml-entry-journey" aria-hidden="true">✦ · ✧ · ✦</div><img class="ml-entry-papi" data-ml-character="'+mascot+'" src="learning-assets/characters/'+mascot+'.webp" alt="'+esc(mascot)+' maskotu" width="200" height="200" decoding="async"><button type="button" class="ml-entry-close" data-back aria-label="Öğrenme yoluna dön">×</button><small class="ml-entry-badge">ÖĞRENME YOLU · '+chapter.number+'. BÖLÜM</small><h2>'+esc(chapter.topicTitle)+'</h2><p class="ml-entry-theme">'+esc(chapter.theme)+'</p><div class="ml-entry-prize"><div class="ml-prize-art" aria-hidden="true">⭐<span>🪙</span></div><div class="ml-prize-copy"><b>'+(replay?'Tekrar turu':'Olası ödül')+'</b><strong>'+(replay?'Bilgilerini pekiştir':'XP ve altın')+'</strong><span>'+(replay?'Bu bölüm daha önce tamamlandı. Tekrarında ek ödül verilmez.':'İlk tamamlamada, başarına göre hesabına eklenir.')+'</span></div></div><div class="ml-entry-stats" aria-label="Bölüm içeriği"><div><span aria-hidden="true">📖</span><b>'+chapter.cards.length+' kelime</b></div><div><span aria-hidden="true">❔</span><b>'+count+' soru</b></div><div><span aria-hidden="true">📗</span><b>Öğrenme kartları</b></div></div>'+(resume?'<p class="ml-entry-resume">✓ İlerlemen kayıtlı. Kaldığın sorudan devam edeceksin.</p>':'')+'<button type="button" class="ml-entry-start"><span class="ml-entry-start-icon" aria-hidden="true">⚑</span><span>'+label+'</span><span class="ml-entry-start-arrow" aria-hidden="true">→</span></button></section>';
 bindMascotFallback(modal);
 modal.querySelector('[data-back]').onclick=()=>close();dialogKeys(modal,()=>close());
 const ticket=epoch,at=identity();modal.querySelector('.ml-entry-start').onclick=()=>{if(ticket!==epoch||identity()!==at||!modal)return;modal.classList.remove('ml-entry');render();modal.querySelector('[data-back]')?.focus();};
 modal.querySelector('.ml-entry-start').focus({preventScroll:true});
}
// Approved DijiMedu discovery crew: one character per question, stable for retries.
const LEARNING_MASCOTS=['lumo','tiko','mimo','pofin','ziri','kori','fora','bumbi','nori','vela'];
let lastEntryMascot='';
function pickEntryMascot(){
 let previous=lastEntryMascot;
 try{previous=sessionStorage.getItem('dm-learning-last-entry-mascot')||previous;}catch{}
 const choices=LEARNING_MASCOTS.filter(name=>name!==previous);
 const selected=choices[Math.floor(Math.random()*choices.length)]||LEARNING_MASCOTS[0];
 lastEntryMascot=selected;
 try{sessionStorage.setItem('dm-learning-last-entry-mascot',selected);}catch{}
 return selected;
}

function mascotAt(cursor){return LEARNING_MASCOTS[(Math.max(1,Number(cursor)||1)-1)%LEARNING_MASCOTS.length];}
function bindMascotFallback(root){root.querySelectorAll('img[data-ml-character]').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.mlFallback)return;img.dataset.mlFallback='1';img.src='learning-assets/papi-arena-guide.webp';},{once:true}));}
function arenaHero(content,extra=''){const name=mascotAt(session?.cursor);return '<div class="ml-arena-hero '+extra+'"><img class="ml-arena-papi" data-ml-character="'+name+'" src="learning-assets/characters/'+name+'.webp" alt="" aria-hidden="true" width="240" height="300" decoding="async"><div class="ml-speech">'+content+'</div></div>';}
function lessonTheme(){try{return localStorage.getItem('dm-learning-theme')||document.documentElement.dataset.dmTheme||'day';}catch{return document.documentElement.dataset.dmTheme||'day';}}
function applyLessonTheme(value){modal.dataset.appearance=value;const b=modal.querySelector('[data-lesson-theme]');if(b){b.textContent=value==='night'?'☀️':'🌙';b.setAttribute('aria-label',value==='night'?'Gündüz moduna geç':'Gece moduna geç');}}
function shell(){const q=Math.max(0,Math.min(11,session.cursor));modal.innerHTML='<section class="ml-shell"><header class="ml-header"><button type="button" data-back aria-label="Öğrenme yoluna dön">‹</button><div><small>'+esc(chapter.theme)+' · '+chapter.number+'. bölüm</small><h1>'+esc(chapter.topicTitle)+'</h1></div><button type="button" data-lesson-theme aria-label="Gece moduna geç">🌙</button><button type="button" data-voice aria-pressed="'+voice+'" aria-label="Sesi aç veya kapat">'+(voice?'🔊':'🔇')+'</button></header>'+hudMarkup()+'<div class="ml-arena-title" aria-hidden="true"><span>✦</span> DijiMedu ile Öğren <span>✦</span></div><div class="ml-progress"><progress max="11" value="'+q+'" aria-label="Bölüm ilerlemesi"></progress><span>'+ (session.cursor===0?'Önce öğren':q+' / 11 soru')+'</span><nav class="ml-question-history" aria-label="Bölüm içinde gezin"><button type="button" data-ml-review-open aria-label="Önceki cevaplanmış soruyu gör" '+(reviewSnapshots.size?'':'disabled')+'>←</button><button type="button" aria-label="Sonraki soruya ilerle" disabled>→</button></nav></div><main class="ml-board"><div class="ml-stage"><div class="ml-task"></div><div class="ml-feedback" role="status" aria-live="polite"></div><div class="ml-actions"></div></div></main><footer>Öğrenme kartları + 11 soru'+(session.replay?' · Tekrar turu, ek ödül verilmez':'')+'</footer></section>';applyLessonTheme(lessonTheme());modal.querySelector('[data-lesson-theme]').onclick=()=>{const value=modal.dataset.appearance==='night'?'day':'night';try{localStorage.setItem('dm-learning-theme',value);}catch{}applyLessonTheme(value);};modal.scrollTop=0;modal.querySelector('[data-back]').onclick=()=>close();modal.querySelector('[data-voice]').onclick=()=>{voice=!voice;modal.querySelector('[data-voice]').textContent=voice?'🔊':'🔇';modal.querySelector('[data-voice]').setAttribute('aria-pressed',String(voice));if(!voice)window.speechSynthesis?.cancel();};modal.querySelector('[data-ml-review-open]')?.addEventListener('click',()=>showAnsweredSnapshot(Math.max(...reviewSnapshots.keys())));dialogKeys(modal,()=>close());scheduleLessonFit();}

function scheduleLessonFit(){if(!modal)return;if(fitFrame)cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(fitLesson);}
function fitLesson(){
 fitFrame=0;if(!modal||modal.classList.contains('ml-entry'))return;
 const stage=modal.querySelector('.ml-stage'),board=modal.querySelector('.ml-board');if(!stage||!board)return;
 const viewport=window.visualViewport,height=viewport?.height||window.innerHeight;
 modal.style.setProperty('--ml-view-height',Math.floor(height)+'px');modal.classList.remove('ml-scroll-fallback');stage.style.zoom='1';stage.style.height='auto';
 const style=getComputedStyle(board),available=Math.max(100,board.clientHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0));
 let natural=0;for(let level=0;level<=2;level++){modal.dataset.fit=String(level);natural=stage.scrollHeight;if(natural<=available+1)break;}
 const scale=Math.min(1,available/Math.max(1,natural));
 // Do not crop controls or make large accessibility text unreadable.
 if((viewport?.scale||1)>1.1||scale<.86){modal.classList.add('ml-scroll-fallback');stage.style.zoom='1';}
 else {stage.style.zoom=String(Math.floor(scale*1000)/1000);if(!matchMedia('(min-width:600px) and (max-height:520px)').matches&&modal.dataset.taskKind!=='complete')stage.style.height=Math.max(natural,available*.80)/scale+'px';}
 modal.scrollTop=0;
}
function watchLessonLayout(){
 layoutObserver?.disconnect();if(typeof MutationObserver==='function'){layoutObserver=new MutationObserver(scheduleLessonFit);layoutObserver.observe(modal,{childList:true,subtree:true,characterData:true});}
 modal.addEventListener('load',scheduleLessonFit,true);
}
function showComboReward(r){
 const gain=Number(r.comboGain),key=identity()+'|'+r.chapter+'|'+r.version;if(!Number.isFinite(gain)||gain<=0||key===lastComboReward)return;lastComboReward=key;
 const ticket=epoch,at=identity();queueMicrotask(()=>{if(ticket!==epoch||!modal||identity()!==at)return;
  if(typeof window.DMRouteQuestions?.celebrate==='function'){
   window.DMRouteQuestions.celebrate(modal,gain);
   const burst=modal.querySelector('.rq-combo-burst');if(burst){burst.setAttribute('aria-label',gain+' enerji kazandın! Beş doğru üst üste.');const label=burst.querySelector('.rq-bonus-streak');if(label)label.textContent='5 doğru üst üste!';}
  }else{const el=modal.querySelector('.ml-combo-toast');if(el){el.textContent='🪶 5 doğru! +'+gain+' enerji';setTimeout(()=>{if(ticket===epoch&&el.isConnected)el.textContent='';},3000);}}
 });
}

function feedback(text,correct=false){const el=modal?.querySelector('.ml-feedback');if(el){el.textContent=text;el.classList.toggle('is-correct',correct);}}
function remember(r){
 if(!Number.isInteger(r.chapter))return;
 const old=progress.find(p=>p.chapter===r.chapter);progress=progress.filter(p=>p.chapter!==r.chapter);progress.push({chapter:r.chapter,cursor:r.cursor,completed:!!(old?.completed||r.completed),version:r.version});progressRevision++;loadedAt=0;
 if(r.finished)document.dispatchEvent(new CustomEvent('dm:learning-progress',{detail:{owner:who(),chapter:r.chapter,completed:true}}));
}
const hudIcons={energy:'<svg viewBox="0 0 32 38" aria-hidden="true"><path d="M20 2 4 22h11l-3 14L29 15H18Z" fill="#ffc642" stroke="#aa7b20" stroke-width="1.6"/></svg>',gold:'<svg viewBox="0 0 36 38" aria-hidden="true"><ellipse cx="18" cy="19" rx="14" ry="16" fill="#ffd461" stroke="#b68423" stroke-width="2"/><ellipse cx="18" cy="19" rx="10" ry="12" fill="none" stroke="#e7a924" stroke-width="2"/><path d="M15 12v14m6-14v14M12 16h12m-12 6h12" stroke="#ad7b1b" stroke-width="2"/></svg>',feather:'<svg viewBox="0 0 32 38" aria-hidden="true"><path d="M27 2C9 5 4 15 7 29 21 28 29 18 27 2Z" fill="#52c8d4" stroke="#c3a24d" stroke-width="1.5"/><path d="M4 36 25 5M9 27l10-1M12 22l11-2M16 16l9-2M13 23l-3-8m7 2-2-9" fill="none" stroke="#e6d09b" stroke-width="1"/></svg>'};
function hudMarkup(){const energy=economy.energy??(typeof genelEnerjiKalan!=='undefined'?genelEnerjiKalan:'–'),gold=economy.gold??(typeof yo!=='undefined'?yo?.altin:0)??0,combo=Number(economy.combo)||0,count=combo>0&&combo%5===0?5:combo%5;return '<div class="ml-wallet" role="group" aria-label="Altın, enerji ve kombo"><div class="ml-wallet-chip" aria-label="Enerji">'+hudIcons.energy+'<b data-ml-energy>'+esc(energy)+'<small> / '+esc(economy.energyMax||30)+'</small></b></div><div class="ml-wallet-chip" aria-label="Altın">'+hudIcons.gold+'<b data-ml-gold>'+esc(gold)+'</b></div><div class="ml-wallet-chip" aria-label="Kuş tüyü kombo">'+hudIcons.feather+'<b data-ml-combo>'+count+'<small> / 5</small></b></div></div><div class="ml-combo-toast" role="status" aria-live="polite"></div>';}
function paintHud(){const bar=modal?.querySelector('.ml-wallet');if(bar)bar.outerHTML=hudMarkup().split('<div class="ml-combo-toast"')[0];}
function wallet(r){
 if(r.wallet)economy={...economy,...r.wallet};
 if(r.enerjiKalan!=null)economy.energy=r.enerjiKalan;if(r.enerjiMax!=null)economy.energyMax=r.enerjiMax;if(r.combo!=null)economy.combo=r.combo;
 if(economy.energy!=null){window.genelEnerjiKalan=economy.energy;window.headerEnerjiGoster?.(economy.energy,economy.energyMax);}
 const state=r.yo||(!r.stale&&!r.alreadyCompleted&&r.finished&&!r.replay?r.reward?.yo:null);if(state)window.dmApplyRewardState?.(state,who());paintHud();
 if(r.comboGain>0&&!r.stale&&!r.alreadyCompleted)showComboReward(r);
 if(r.finished){window.dmProgression?.refresh?.(true);window.dmPapiFirstPractice?.complete('independent');}
}
async function submit(answer,clicked){if(busy||accepted||!modal)return;const ticket=epoch,at=identity(),answeredCursor=session.cursor,task=core.deck(chapter,data.chapters[chapter.number-2])[session.cursor];busy=true;modal.setAttribute('aria-busy','true');modal.querySelectorAll('.ml-task button,.ml-actions button').forEach(b=>b.disabled=true);feedback('Kontrol ediliyor…');try{const r=await api('advance',{chapter:chapter.id,cursor:session.cursor,version:session.version,answer});if(ticket!==epoch||!modal||identity()!==at)return;session=r;busy=false;modal.removeAttribute('aria-busy');remember(r);wallet(r);if(r.stale){render();feedback('Diğer ekranındaki ilerlemen yüklendi.');return;}if(r.needsRecovery){render();feedback('Papi ile üç kısa pekiştirme sorusu çözelim.');return;}if(!r.accepted){window.dmAnswerFeedback?.(false);render();feedback(r.explanation||'Bir daha deneyelim.');return;}accepted=true;if(task.kind==='teach'||task.kind==='review'){saveAnsweredSnapshot(answeredCursor);render();return;}window.dmAnswerFeedback?.(true);clicked?.classList.add('is-correct');feedback(r.explanation||'Doğru!',true);saveAnsweredSnapshot(answeredCursor);const back=modal.querySelector('[data-ml-review-open]');if(back)back.disabled=false;const nextNav=modal.querySelector('.ml-question-history button:last-child');if(nextNav){nextNav.disabled=false;nextNav.onclick=()=>modal.querySelector('.ml-actions .ml-primary[data-next]')?.click();}const actions=modal.querySelector('.ml-actions');actions.innerHTML='<button type="button" class="ml-primary" data-next>'+(r.finished?'Bölümü tamamla':'Devam et →')+'</button>';actions.querySelector('button').onclick=render;actions.querySelector('button').focus();}catch(e){if(ticket===epoch&&modal){busy=false;modal.removeAttribute('aria-busy');if(e.energyEmpty)wallet(e);render();feedback(e.message);if(e.energyEmpty)window.DijiMeduPapiFeedback?.energy();}}}
function reference(area,cards,label='Öğrenme kartlarına tekrar bak'){
 let group=area.querySelector('.ml-reference-controls');if(!group){group=document.createElement('div');group.className='ml-reference-controls';area.append(group);}
 const button=document.createElement('button');button.type='button';button.className='ml-reference-toggle';button.textContent='📖 '+(label.startsWith('Konu sözlüğü')?'Konu sözlüğü':label.startsWith('Bu ifadeleri')?'Cümle örnekleri':'Öğrenme kartları');button.setAttribute('aria-label',label);
 button.onclick=()=>openReference(cards,label);group.append(button);
}
function openReference(cards,label){
 if(!modal)return;modal.querySelector('.ml-reference-sheet')?.remove();const previous=document.activeElement,shell=modal.querySelector('.ml-shell'),sheet=document.createElement('section');sheet.className='ml-reference-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label',label);
 sheet.innerHTML='<div class="ml-reference-panel"><header><h2>'+esc(label)+'</h2><button type="button" data-reference-close aria-label="Kapat">×</button></header><div class="ml-reference-list">'+cards.map((c,i)=>'<button type="button" data-reference="'+i+'"><b lang="en">'+esc(c.en)+'</b><span>'+esc(c.tr)+'</span><small>🔊 Dinle</small></button>').join('')+'</div></div>';
 if(shell)shell.inert=true;const dismiss=()=>{sheet.remove();if(shell)shell.inert=false;previous?.focus?.({preventScroll:true});};sheet.querySelector('[data-reference-close]').onclick=dismiss;sheet.addEventListener('click',e=>{if(e.target===sheet)dismiss();});sheet.querySelectorAll('[data-reference]').forEach(b=>b.onclick=()=>speech(cards[+b.dataset.reference].en));dialogKeys(sheet,dismiss);modal.append(sheet);sheet.querySelector('[data-reference-close]').focus({preventScroll:true});
}
async function submitRecovery(answer){
 if(busy||!modal||!session?.needsRecovery)return;
 const ticket=epoch,at=identity(),step=session.recovery?.step;
 busy=true;modal.setAttribute('aria-busy','true');
 modal.querySelectorAll('.ml-task button,.ml-actions button').forEach(b=>b.disabled=true);
 feedback('Kontrol ediliyor…');
 try{
  const r=await api('recover',{chapter:chapter.id,version:session.version,step,answer});
  if(ticket!==epoch||!modal||identity()!==at)return;
  session=r;busy=false;modal.removeAttribute('aria-busy');
  remember(r);wallet(r);render();
  if(r.stale){feedback('Kaldığın pekiştirme sorusu yüklendi.');return;}
  if(r.finished){window.dmAnswerFeedback?.(true);return;}
  window.dmAnswerFeedback?.(!!r.accepted);
  feedback(r.accepted?'Harika! Bir adım daha ilerledin.':'Birlikte yeniden deneyelim. Kartlara tekrar bakabilirsin.',!!r.accepted);
 }catch(e){if(ticket===epoch&&modal){busy=false;modal.removeAttribute('aria-busy');render();feedback(e.message);}}
}
function renderRecovery(){
 shell();modal.dataset.taskKind='recovery';
 const q=session.recovery,area=modal.querySelector('.ml-task'),actions=modal.querySelector('.ml-actions');
 if(!q||!Array.isArray(q.options)){area.textContent='Pekiştirme yüklenemedi. Geri dönüp tekrar açabilirsin.';return;}
 const score=session.firstAttempt,summary=score&&Number.isFinite(Number(score.correct))?'İlk deneme: '+score.correct+' / 11 doğru. ':'';
 area.innerHTML='<p class="ml-eyebrow">PAPİ İLE PEKİŞTİRME</p>'+arenaHero('<h2>'+esc(q.prompt)+'</h2><p>'+esc(q.support||'Doğru İngilizce ifadeyi seç.')+'</p>')+
 '<p class="ml-recovery-status" role="status">'+esc(summary)+'Bölümü tamamlamak için 3 kısa soruyu doğru yanıtla. Bu turda ödül %30 olur.</p>'+
 '<p class="ml-question-instruction">Pekiştirme '+(Number(q.step)+1)+' / 3</p>'+
 '<div class="ml-choices ml-recovery-choices">'+q.options.map((choice,i)=>'<button type="button" data-recovery-choice="'+i+'" lang="en">'+esc(choice)+'</button>').join('')+'</div>';
 bindMascotFallback(area);
 area.querySelectorAll('[data-recovery-choice]').forEach(b=>b.onclick=()=>submitRecovery(q.options[+b.dataset.recoveryChoice]));
 actions.innerHTML='<button type="button" data-reference-recovery>Öğrenme kartlarını gör</button>';
 actions.querySelector('button').onclick=()=>openReference(chapter.cards,'Pekiştirme için öğrenme kartları');
 scheduleLessonFit();
}
function render(){if(!modal)return;accepted=false;if(session?.needsRecovery&&!session.finished){renderRecovery();return;}shell();if(session.finished||session.cursor>=12){finish();return;}const tasks=core.deck(chapter,data.chapters[chapter.number-2]),task=tasks[session.cursor],area=modal.querySelector('.ml-task'),actions=modal.querySelector('.ml-actions');modal.dataset.taskKind=task.kind;area.innerHTML='<p class="ml-eyebrow">'+esc(task.label)+'</p>';
 const speaker=(text,lang='en-US',label='Dinle')=>{const b=document.createElement('button');b.type='button';b.className='ml-speaker';b.textContent='🔊 '+label;b.onclick=()=>speech(text,lang);return b;};
 if(task.kind==='teach'){area.innerHTML+=arenaHero('<h2>'+esc(chapter.part===1?'Yeni ifadelerle tanış':'İfadeleri cümlede kullan')+'</h2><p>'+esc(chapter.objective)+'</p>')+'<div class="ml-teach">'+task.cards.map((c,i)=>'<button type="button" data-learn="'+i+'">'+art(c)+'<b lang="en">'+esc(c.en)+'</b><span>'+esc(c.tr)+'</span><small>🔊 Dinle</small></button>').join('')+'</div><p class="ml-hint">Kartlara dokunarak dinle. Hazır olduğunda 11 soruya geç.</p>';area.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>speech(task.cards[+b.dataset.learn].en));reference(area,chapter.examples,'Bu ifadeleri cümlede gör');if(chapter.reference)reference(area,chapter.reference,'Konu sözlüğü · Dinle ve öğren');actions.innerHTML='<button type="button" class="ml-primary">11 soruya başla →</button>';actions.querySelector('button').onclick=()=>submit(true);bindMascotFallback(area);return;}
 if(task.kind!=='review')area.innerHTML+=arenaHero('<h2 '+(task.language==='en'?'lang="en"':'')+'>'+esc(task.prompt)+'</h2>'+(task.support?'<p class="ml-support">'+esc(task.support)+'</p>':'')+(task.picture?art(task.picture):''));if(task.kind!=='review')bindMascotFallback(area);
 const audioArea=area.querySelector('.ml-speech')||area;
 if(task.audio){audioArea.append(speaker(task.audio));if(task.images){const hint=document.createElement('button');hint.type='button';hint.className='ml-speaker';hint.textContent='Yazılı ipucu';hint.onclick=()=>{hint.textContent=task.audio;hint.lang='en';};audioArea.append(hint);}if(!voice)audioArea.insertAdjacentHTML('beforeend','<p class="ml-hint" lang="en">'+esc(task.audio)+'</p>');}
 if(task.label==='Cümleyi tamamla'&&task.prompt.includes('____'))audioArea.append(speaker(task.prompt.replace('____',task.answer),'en-US','Cümleyi dinle'));
 if(task.promptAudio)audioArea.append(speaker(task.promptAudio,'tr-TR','Türkçe anlamını dinle'));
 if(task.kind==='review'){
  let index=0,answers=[],locked=false;const ticket=epoch,atCursor=session.cursor;
  const box=document.createElement('section');box.className='ml-final-review';area.append(box);
  const paint=()=>{const card=task.cards[index];box.innerHTML='<p class="ml-review-count">Kart '+(index+1)+' / '+task.cards.length+'</p><div class="ml-review-track" aria-hidden="true">'+task.cards.map((_,i)=>'<span class="'+(i<index?'is-done':i===index?'is-current':'')+'">'+(i<index?'★':'✦')+'</span>').join('')+'</div>'+arenaHero('<small>İNGİLİZCE</small><h2 lang="en">'+esc(card.en)+'</h2>','ml-review-hero')+'<p class="ml-question-instruction">Türkçe karşılığını seç.</p><div class="ml-choices">'+card.options.map((s,i)=>'<button type="button" data-review-choice="'+i+'">'+esc(s)+'</button>').join('')+'</div><p class="ml-review-note" role="status" aria-live="polite"></p>';
   bindMascotFallback(box);box.querySelector('.ml-speech').append(speaker(card.en));modal.scrollTop=0;
   box.querySelectorAll('[data-review-choice]').forEach(b=>b.onclick=()=>{if(locked||busy)return;locked=true;const answer=card.options[+b.dataset.reviewChoice],correct=answer===card.tr;answers.push(answer);
    box.querySelectorAll('[data-review-choice]').forEach(x=>{x.disabled=true;if(card.options[+x.dataset.reviewChoice]===card.tr)x.classList.add('is-correct');else if(x===b&&!correct)x.classList.add('is-wrong');});
    window.dmAnswerFeedback?.(correct);box.querySelector('.ml-review-note').textContent=correct?'Doğru! Sonraki karta geçiliyor…':'Doğru cevap: '+card.tr+' — Sonraki karta geçiliyor…';
    setTimeout(()=>{if(ticket!==epoch||!modal||session.cursor!==atCursor)return;index++;locked=false;if(index<task.cards.length){paint();box.querySelector('[data-review-choice]')?.focus();}else{submit(answers);}},correct?750:1800);
   });
  };paint();return;
 }
 if(task.kind==='letters'){
  const selected=task.missing.map(()=>null),wrap=document.createElement('section');wrap.className='ml-letter-puzzle';
  const groups=task.en.match(/\S+|\s+/g)||[];let position=0;
  const phrase=groups.map(group=>{const start=position;position+=group.length;if(/^\s+$/.test(group))return '<span class="ml-letter-space" aria-hidden="true"></span>';return '<span class="ml-letter-word">'+[...group].map((ch,j)=>{const slot=task.missing.indexOf(start+j);return slot<0?'<span class="ml-letter-fixed">'+esc(ch)+'</span>':'<button type="button" class="ml-letter-gap" data-letter-slot="'+slot+'" aria-label="'+(slot+1)+'. eksik harf">_</button>';}).join('')+'</span>';}).join('');
  wrap.innerHTML='<p class="ml-question-instruction">'+task.missing.length+' eksik harfi tamamla.</p><div class="ml-letter-line" aria-label="Eksik harfli ifade" lang="en">'+phrase+'</div><div class="ml-letter-bank">'+task.tokens.map((letter,i)=>'<button type="button" data-letter-token="'+i+'" aria-label="'+esc(letter)+' harfi">'+esc(letter)+'</button>').join('')+'</div><p class="ml-hint">Harf seçmek için dokun. Değiştirmek için doldurduğun kutuya dokun.</p>';
  area.append(wrap);actions.innerHTML='<button type="button" data-letter-clear>Temizle</button><button type="button" class="ml-primary" data-letter-check disabled>Kontrol et</button>';
  const sync=()=>{wrap.querySelectorAll('[data-letter-slot]').forEach(b=>{const n=+b.dataset.letterSlot,token=selected[n],filled=token!==null,letter=filled?task.tokens[token]:null,correct=filled&&letter.toLocaleLowerCase('en')===task.en[task.missing[n]].toLocaleLowerCase('en');b.textContent=filled?letter:'_';b.classList.toggle('is-filled',filled);b.classList.toggle('ml-live-correct',correct);b.classList.toggle('ml-live-wrong',filled&&!correct);b.setAttribute('aria-label',(n+1)+'. eksik harf'+(filled?(correct?', doğru: ':', yanlış: ')+letter+'; değiştirmek için dokun':''));});wrap.querySelectorAll('[data-letter-token]').forEach(b=>b.disabled=selected.includes(+b.dataset.letterToken));actions.querySelector('[data-letter-check]').disabled=selected.some(x=>x===null);};
  wrap.querySelectorAll('[data-letter-token]').forEach(b=>b.onclick=()=>{const slot=selected.indexOf(null);if(slot<0||busy||accepted)return;selected[slot]=+b.dataset.letterToken;sync();});
  wrap.querySelectorAll('[data-letter-slot]').forEach(b=>b.onclick=()=>{if(busy||accepted)return;selected[+b.dataset.letterSlot]=null;sync();});
  actions.querySelector('[data-letter-clear]').onclick=()=>{selected.fill(null);sync();};actions.querySelector('[data-letter-check]').onclick=()=>{if(selected.some(x=>x===null))return;const value=[...task.en];task.missing.forEach((p,i)=>value[p]=task.tokens[selected[i]]);submit(value.join(''));};
 }
 if(task.kind==='choice'){const choices=document.createElement('div');choices.className='ml-choices'+(task.images?' ml-image-choices':'');choices.innerHTML=task.options.map((s,i)=>{const c=task.images?.find(x=>x.en===s);return '<button type="button" data-answer="'+i+'" '+(c?'aria-label="'+esc(c.tr)+'"':'')+'>'+ (c?art(c,true):esc(s))+'</button>';}).join('');area.append(choices);choices.querySelectorAll('button').forEach(b=>b.onclick=()=>submit(task.options[+b.dataset.answer],b));}
 if(task.kind==='match'){let selected=null,matched=[],locked=false;const wrap=document.createElement('div');wrap.className='ml-matches';wrap.innerHTML='<div>'+task.pairs.map((c,i)=>'<button type="button" data-left="'+i+'">'+esc(c.en)+'</button>').join('')+'</div><div>'+[2,0,1].map(i=>'<button type="button" data-right="'+i+'">'+(task.pairs.every(c=>c.image)?art(task.pairs[i]):esc(task.pairs[i].tr))+'</button>').join('')+'</div>';area.append(wrap);wrap.querySelectorAll('[data-left]').forEach(b=>b.onclick=()=>{if(locked)return;selected=+b.dataset.left;wrap.querySelectorAll('[data-left]').forEach(x=>x.classList.toggle('is-selected',x===b));speech(task.pairs[selected].en);});wrap.querySelectorAll('[data-right]').forEach(b=>b.onclick=()=>{if(locked||selected===null)return;const i=+b.dataset.right;if(i!==selected){feedback('Bu ikisi eşleşmiyor. Bir daha dene.');window.dmAnswerFeedback?.(false);return;}const left=wrap.querySelector('[data-left="'+i+'"]');left.disabled=b.disabled=true;left.classList.add('is-correct');b.classList.add('is-correct');matched.push(task.pairs[i]);selected=null;if(matched.length===3){locked=true;submit(matched);}});}
 if(task.kind==='order'){let parts=[];area.insertAdjacentHTML('beforeend','<div class="ml-sentence" aria-live="polite">Cümlen burada oluşacak.</div><div class="ml-tokens">'+task.tokens.map((s,i)=>({s,i})).sort((a,b)=>((a.i+chapter.number)%task.tokens.length)-((b.i+chapter.number)%task.tokens.length)).map(x=>'<button type="button" data-token="'+x.i+'">'+esc(x.s)+'</button>').join('')+'</div>');const sentence=area.querySelector('.ml-sentence');const sync=()=>{sentence.innerHTML=parts.length?parts.map((token,slot)=>{const correct=core.norm(task.tokens[token])===core.norm(task.tokens[slot]);return '<button type="button" class="ml-sentence-token '+(correct?'ml-live-correct':'ml-live-wrong')+'" data-placed-token="'+slot+'" aria-label="'+esc((correct?'Doğru yerde: ':'Yanlış yerde: ')+task.tokens[token]+'. Geri almak için dokun')+'">'+esc(task.tokens[token])+'</button>';}).join(' '):'Cümlen burada oluşacak.';area.querySelectorAll('[data-token]').forEach(b=>b.disabled=parts.includes(+b.dataset.token));sentence.querySelectorAll('[data-placed-token]').forEach(b=>b.onclick=()=>{if(busy||accepted)return;parts.splice(+b.dataset.placedToken,1);sync();});};area.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{if(busy||accepted||parts.includes(+b.dataset.token))return;parts.push(+b.dataset.token);sync();});actions.innerHTML='<button type="button" data-clear>Yeniden sırala</button><button type="button" class="ml-primary" data-check>Kontrol et</button>';actions.querySelector('[data-clear]').onclick=render;actions.querySelector('[data-check]').onclick=()=>submit(parts.map(i=>task.tokens[i]).join(' '));}
 reference(area,[...chapter.cards,...chapter.examples,...(chapter.reference||[])].filter((c,i,a)=>a.findIndex(x=>x.en===c.en)===i));
}
function finish(){
 modal.dataset.taskKind='complete';const area=modal.querySelector('.ml-task'),actions=modal.querySelector('.ml-actions'),reward=session.reward||{},xp=!session.replay?Number(reward.xp)||0:0,gold=!session.replay?Number(reward.gold)||0:0,stars=!session.replay&&Number.isInteger(reward.stars)?Math.max(0,Math.min(3,reward.stars)):0;
 area.innerHTML='<div class="ml-complete"><div class="ml-result-sparks" aria-hidden="true">'+Array.from({length:14},(_,i)=>'<i style="--i:'+i+'"></i>').join('')+'</div><div class="ml-result-mascot"><img src="papi-reward-v2.png" alt="Kutlayan Papi"></div><p class="ml-eyebrow">'+(session.replay?'TEKRAR TAMAMLANDI':chapter.themeFinal?'TEMA TAMAMLANDI':'BÖLÜM TAMAMLANDI')+'</p><h2>'+esc(chapter.topicTitle)+'</h2>'+(Number.isInteger(reward.fairPercent)?'<p class="ml-result-fair">İlk deneme: '+esc(session.firstAttempt?.correct??'—')+' / 11 doğru · Ödül oranı %'+reward.fairPercent+(reward.fairTier==='recovery'?' · Pekiştirerek tamamlandı':'')+'</p>':'')+(stars?'<div class="ml-result-stars" aria-label="'+stars+' yıldız">'+Array.from({length:3},(_,i)=>'<span class="'+(i<stars?'is-earned':'')+'" style="--i:'+i+'" aria-hidden="true">★</span>').join('')+'</div>':'')+'<p class="ml-result-message">'+(session.replay?'Tekrar ederek bilgini güçlendirdin!':'Harika! Öğrenme yolunda bir adım daha attın.')+'</p><div class="ml-result-stats"><span>✓ 11 soru tamamlandı</span><span>📚 '+chapter.cards.length+' ifade tekrarlandı</span></div>'+((xp||gold)?'<div class="ml-result-rewards">'+(xp?'<div><span>⭐</span><b>+'+xp+'</b><small>Kazanılan XP</small></div>':'')+(gold?'<div><span>🪙</span><b>+'+gold+'</b><small>Kazanılan altın</small></div>':'')+'</div>':'<p class="ml-result-replay">'+(session.replay?'Bu tekrar turunda ek ödül verilmez.':'Öğrendiklerin seninle!')+'</p>')+'<p class="ml-result-words" lang="en">'+esc(chapter.cards.map(c=>c.en).join(' · '))+'</p></div>';
 actions.innerHTML='<button type="button" data-list>Öğrenme yolum</button>'+(chapter.number<240?'<button type="button" class="ml-primary" data-next-lesson>Sonraki bölüm →</button>':'');
 actions.querySelector('[data-list]').onclick=()=>{close();openAll();};actions.querySelector('[data-next-lesson]')?.addEventListener('click',()=>open(chapter.id+1));loadedAt=0;window.dmPapiFirstPractice?.complete('independent');scheduleLessonFit();
}
const API={overview,open,close,openAll,continueRoute:async()=>{await status();return open(next().id);},mount:()=>{},gender:()=> 'neutral',curriculum,mascotAt};window.dmThematicLearning=API;
document.addEventListener('dm:login',()=>{close(true);owner='';progress=[];loadedAt=0;economy={energy:null,energyMax:30,gold:null,combo:0};progressRevision++;lastComboReward='';document.getElementById('mlThemeList')?.remove();});
window.addEventListener('resize',scheduleLessonFit);window.visualViewport?.addEventListener('resize',scheduleLessonFit);document.fonts?.ready?.then(scheduleLessonFit);
setInterval(()=>{if(modal&&identity()!==owner)close(true);},1000);
})();
