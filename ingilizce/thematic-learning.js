/* Papi arena: all learning task types share the approved game panel. Theme-led learning: 20 themes, 240 short lessons; the server owns progress and rewards. */
(()=>{'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const token=()=>who().toLowerCase()==='teacher'?(sessionStorage.getItem('ing_ogr_token')||''):(localStorage.getItem('ing_token')||'');
const identity=()=>who()+'|'+token();
let data=null,loading=null,progress=[],inherited=0,access=null,selectedStart=null,owner='',statusPromise=null,loadedAt=0,modal=null,session=null,chapter=null,epoch=0,busy=false,accepted=false,voice=true,origin=null;
const core=window.DMLearningCore;
let answerOrder=core.presentation(),visualDeck=false;
const optionOrder=(key,values)=>answerOrder(chapter.id+'|'+session.cursor+'|'+key,values);
const v8Enabled=()=>window.DM_THEMATIC_V8_ENABLED!==false;
let teachingHeard=new Set(),teachingSpeech=0,flightShown=false;
let schoolBridge=null,comboBreakPromise=Promise.resolve(),comboRewardPromise=Promise.resolve(),finalReviewDraft=null;
const questionsFor=()=>schoolBridge?10:session?.deckVersion===8?10:stepsFor()-1;
const stepsFor=()=>session?.deckVersion===8?14:session?.deckVersion===6?11:session?.deckVersion===5?10:12;
const taskDeck=(c,previous,version)=>c.schoolTasks|| (version===8?window.DMThematicV8Candidate?.build(c,previous,visualDeck,data?.chapters||[]):core.deck(c,previous,version));
let v8Loading=null;
function preloadV8(){if(!v8Enabled()||window.DMThematicV8Candidate)return Promise.resolve();if(v8Loading)return v8Loading;v8Loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='thematic-v8-candidate.js?v=20261126-visual2';script.onload=resolve;script.onerror=()=>reject(Error('Yeni öğrenme kartları yüklenemedi.'));document.head.appendChild(script);}).finally(()=>{v8Loading=null;});return v8Loading;}

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

let economy={energy:null,energyMax:25,gold:null,combo:0},progressRevision=0,fitFrame=0,layoutObserver=null,lastComboReward='';
async function curriculum(){if(data)return data;if(loading)return loading;loading=fetch('thematic-curriculum.json?v=20261020-b1b2-50',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('İçerikler yüklenemedi.');return r.json();}).then(d=>{if(d.version!==5||d.chapters.length!==412||d.themes.length!==46||new Set(d.chapters.map(c=>c.id)).size!==412||d.chapters.some(c=>!['A1','A2','B1','B2'].includes(c.cefr)))throw Error('Öğrenme içeriği doğrulanamadı.');data=d;return d;}).finally(()=>loading=null);return loading;}
async function api(action,payload={}){if(schoolBridge)return schoolBridge.request(action,payload);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{/* [18 Kas 2026] düz metin: tarayıcı ayrı ön kontrol (OPTIONS) isteği atmaz; sunucu gövdeyi türüne bakmadan JSON okur. */const r=await fetch(String(apiURL).replace(/\/diji-api(?:\?.*)?$/,'/thematic-learning'),{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,t:token(),routeVisualQuestions:action==='open'?(window.DMThematicV8Candidate?.visualRevision||window.DMThematicV8Candidate?.visualQuestions===true):visualDeck,deckVersion:(session?.deckVersion===8||session?.deckVersion===7||session?.deckVersion===5||session?.deckVersion===6?session.deckVersion:v8Enabled()?8:7),...payload}),signal:controller.signal}),d=await r.json();if(!r.ok||!d.ok)throw Object.assign(Error(d.mesaj||'İşlem tamamlanamadı.'),{energyEmpty:d.energyEmpty,enerjiKalan:d.enerjiKalan,enerjiMax:d.enerjiMax});return d;}catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. İlerlemen kayıtlı; tekrar deneyebilirsin.');throw e;}finally{clearTimeout(timer);}}
async function status(force=false){const at=identity();if(owner!==at){owner=at;progress=[];access=null;selectedStart=null;loadedAt=0;statusPromise=null;}if(!force&&loadedAt&&Date.now()-loadedAt<30000)return;if(statusPromise)return statusPromise;statusPromise=(async()=>{await curriculum();const revision=progressRevision,r=await api('status');if(identity()!==at||revision!==progressRevision)return;progress=r.progress;inherited=r.inherited;access=r.access||null;selectedStart=data.chapters.some(c=>c.id===Number(r.startChapter))?Number(r.startChapter):null;loadedAt=Date.now();})().finally(()=>{if(owner===at)statusPromise=null;});return statusPromise;}
const LEVELS=['A1','A2','B1','B2'];
let doneCache={ref:null,size:-1,set:new Set()};
// Sets instead of scanning progress per chapter: the theme list checks all 412 chapters on every paint.
const done=id=>{if(doneCache.ref!==progress||doneCache.size!==progress.length)doneCache={ref:progress,size:progress.length,set:new Set(progress.filter(p=>p.completed).map(p=>p.chapter))};return doneCache.set.has(id);};
/* Server access: levels up to maxCefr are open; inside a level chapters stay in order. */
const levelOpen=code=>!access||LEVELS.indexOf(code)<=LEVELS.indexOf(access.maxCefr);
const levelNext=code=>data.chapters.find(c=>c.cefr===code&&!done(c.id));
let nextCache={key:'',map:{}};
const levelNextCached=code=>{const key=String(progress.length);if(nextCache.ref!==progress||nextCache.key!==key)nextCache={key,ref:progress,map:Object.fromEntries(LEVELS.map(c=>[c,levelNext(c)?.id]))};return nextCache.map[code];};
// A chosen start is owned by the authenticated account on the server, across devices.
const indexOfChapter=id=>data.chapters.findIndex(c=>c.id===id);
const prevDone=c=>{const i=indexOfChapter(c.id),p=data.chapters[i-1];return !!p&&(selectedStart||p.cefr===c.cefr)&&done(p.id);};
function pickedNext(){const i=indexOfChapter(selectedStart);return i<0?null:data.chapters.slice(i).find(c=>!done(c.id))||data.chapters.at(-1);}
const unlockedChapter=c=>done(c.id)||(selectedStart?c.id===selectedStart||indexOfChapter(c.id)>indexOfChapter(selectedStart)&&prevDone(c):levelOpen(c.cefr)&&(levelNextCached(c.cefr)===c.id||prevDone(c)));
const levelOrder=()=>{const start=Math.max(0,LEVELS.indexOf(access?.startCefr));return [...LEVELS.slice(start),...LEVELS.slice(0,start).reverse()].filter(levelOpen);};
const next=()=>{const picked=pickedNext();if(picked)return picked;for(const code of levelOrder()){const c=levelNext(code);if(c)return c;}return data.chapters.at(-1);};
let activeLessonSpeech=null;
function speech(text,lang='en-US',after){
 const previous=activeLessonSpeech;activeLessonSpeech=null;
 window.dmSharedVoice?.cancel();window.speechSynthesis?.cancel();previous?.();
 let finished=false;const done=()=>{if(finished)return;finished=true;clearTimeout(timer);if(activeLessonSpeech===done)activeLessonSpeech=null;after?.();};
 const timer=setTimeout(done,Math.min(14000,1800+String(text).length*110));activeLessonSpeech=done;
 if(!voice){done();return;}
 try{const u=typeof window.SpeechSynthesisUtterance==='function'?new SpeechSynthesisUtterance(text):{text};u.lang=lang;u.rate=.83;u.onend=done;u.onerror=done;
 if(window.dmSharedVoice?.play(u))return;
 if(window.speechSynthesis&&window.SpeechSynthesisUtterance)speechSynthesis.speak(u);else done();
 }catch{done();}
}
/* Approved Diji-Medu pilot images: exact English + Turkish pairing prevents ambiguous matches. */
const dmPilotArt=new Map([["a bird can fly|kuş uçabilir","assets/word-images/pilot/a-bird-can-fly-1a1c9b658b.png"],["a bottle of|bir şişe","assets/word-images/pilot/a-bottle-of-8dc76877fd.png"],["a butterfly has wings|kelebeğin kanatları vardır","assets/word-images/pilot/a-butterfly-has-wings-0ad0e46d91.png"],["a cat has got a small nose|bir kedinin küçük bir burnu var","assets/word-images/pilot/a-cat-has-got-a-small-nose-f4c82a7726.png"],["a cat has got claws|bir kedinin pençeleri var","assets/word-images/pilot/a-cat-has-got-claws-ca09f5b8d8.png"],["a convincing essay considers a relevant counterargument|i kna edici bir yazı ilgili bir karşı savı değerlendirir","assets/word-images/pilot/a-convincing-essay-considers-a-relevant-count-717da52d5f.png"],["a doctor helps people|doktor insanlara yardım eder","assets/word-images/pilot/a-doctor-helps-people-1d7e51bfcb.png"],["a dog has got paws|bir köpeğin patileri var","assets/word-images/pilot/a-dog-has-got-paws-f0e27b3790.png"],["a farmer grows vegetables|çiftçi sebze yetiştirir","assets/word-images/pilot/a-farmer-grows-vegetables-47f22caaa0.png"],["a fish can swim|balık yüzebilir","assets/word-images/pilot/a-fish-can-swim-3334b883b7.png"],["a horse is fast|at hızlıdır","assets/word-images/pilot/a-horse-is-fast-1db41175c3.png"],["a kilo of apples please|bir kilo elma lütfen","assets/word-images/pilot/a-kilo-of-apples-please-051f0d8a28.png"],["a mouse is small|fare küçüktür","assets/word-images/pilot/a-mouse-is-small-19a0f2dd0f.png"],["a nurse works in a hospital|hemşire hastanede çalışır","assets/word-images/pilot/a-nurse-works-in-a-hospital-e79cfe5986.png"],["a teacher works at a school|öğretmen okulda çalışır","assets/word-images/pilot/a-teacher-works-at-a-school-f07b0f6f07.png"]]);
const dmNumberedArt=new Map([["bye|güle güle","assets/word-images/pilot/numbered/0001.png"],["hello|merhaba","assets/word-images/pilot/numbered/0002.png"],["see you|görüşürüz","assets/word-images/pilot/numbered/0003.png"],["angry|kızgın","assets/word-images/pilot/numbered/0004.png"],["how are you|nasılsın","assets/word-images/pilot/numbered/0005.png"],["sad|üzgün","assets/word-images/pilot/numbered/0006.png"],["black|siyah","assets/word-images/pilot/numbered/0007.png"],["gray|gri","assets/word-images/pilot/numbered/0008.png"],["purple|mor","assets/word-images/pilot/numbered/0009.png"],["eight|sekiz","assets/word-images/pilot/numbered/0010.png"],["nine|dokuz","assets/word-images/pilot/numbered/0011.png"],["ten|on","assets/word-images/pilot/numbered/0012.png"],["bag|çanta","assets/word-images/pilot/numbered/0013.png"],["desk|sıra","assets/word-images/pilot/numbered/0014.png"],["pencil|kurşun kalem","assets/word-images/pilot/numbered/0015.png"],["baby|bebek","assets/word-images/pilot/numbered/0016.png"],["family|aile","assets/word-images/pilot/numbered/0017.png"],["grandfather|büyükbaba","assets/word-images/pilot/numbered/0018.png"],["bird|kuş","assets/word-images/pilot/numbered/0019.png"],["duck|ördek","assets/word-images/pilot/numbered/0020.png"],["lion|aslan","assets/word-images/pilot/numbered/0021.png"],["close|kapatmak","assets/word-images/pilot/numbered/0022.png"],["listen|dinlemek","assets/word-images/pilot/numbered/0023.png"],["run|koşmak","assets/word-images/pilot/numbered/0024.png"],["good morning|günaydın","assets/word-images/pilot/numbered/0025.png"],["fine|iyi","assets/word-images/pilot/numbered/0026.png"],["blue|mavi","assets/word-images/pilot/numbered/0027.png"],["eleven|on bir","assets/word-images/pilot/numbered/0028.png"],["book|kitap","assets/word-images/pilot/numbered/0029.png"],["boy|erkek çocuk","assets/word-images/pilot/numbered/0030.png"],["cat|kedi","assets/word-images/pilot/numbered/0031.png"],["drink|içmek","assets/word-images/pilot/numbered/0032.png"],["good night|iyi geceler","assets/word-images/pilot/numbered/0033.png"],["great|harika","assets/word-images/pilot/numbered/0034.png"],["brown|kahverengi","assets/word-images/pilot/numbered/0035.png"],["five|beş","assets/word-images/pilot/numbered/0036.png"],["chair|sandalye","assets/word-images/pilot/numbered/0037.png"],["brother|erkek kardeş","assets/word-images/pilot/numbered/0038.png"],["cow|inek","assets/word-images/pilot/numbered/0039.png"],["eat|yemek yemek","assets/word-images/pilot/numbered/0040.png"],["classroom|derslik sınıf","assets/word-images/pilot/numbered/0041.png"],["garden|bahçe","assets/word-images/pilot/numbered/0042.png"],["he is a headmaster|o bir okul müdürü erkek","assets/word-images/pilot/numbered/0043.png"],["headmaster|erkek okul müdürü","assets/word-images/pilot/numbered/0044.png"],["hi|selam","assets/word-images/pilot/numbered/0045.png"],["it is a classroom|bu bir derslik","assets/word-images/pilot/numbered/0046.png"],["it is a playground|bu bir oyun alanı","assets/word-images/pilot/numbered/0047.png"],["it is monday|bugün pazartesi","assets/word-images/pilot/numbered/0048.png"],["it is tuesday|bugün salı","assets/word-images/pilot/numbered/0049.png"],["library|kütüphane","assets/word-images/pilot/numbered/0050.png"],["my name is alice|benim adım alice","assets/word-images/pilot/numbered/0051.png"],["nice to meet you too|ben de tanıştığımıza memnun oldum","assets/word-images/pilot/numbered/0052.png"],["pupil|öğrenci","assets/word-images/pilot/numbered/0053.png"],["she is a girl|o bir kız çocuk","assets/word-images/pilot/numbered/0054.png"],["she is in the playground|o oyun alanında kız","assets/word-images/pilot/numbered/0055.png"],["teacher|öğretmen","assets/word-images/pilot/numbered/0056.png"],["they are friends|onlar arkadaşlar","assets/word-images/pilot/numbered/0057.png"],["thursday|perşembe","assets/word-images/pilot/numbered/0058.png"],["what is this|bu ne","assets/word-images/pilot/numbered/0059.png"],["where is the boy|erkek çocuk nerede","assets/word-images/pilot/numbered/0060.png"],["where is the pupil|öğrenci nerede","assets/word-images/pilot/numbered/0061.png"],["you re welcome|rica ederim","assets/word-images/pilot/numbered/0062.png"],["a sharpener is red|bir kalemtıraş kırmızıdır","assets/word-images/pilot/numbered/0063.png"],["can i|yapabilir miyim","assets/word-images/pilot/numbered/0064.png"],["colour it please|onu boya lütfen","assets/word-images/pilot/numbered/0065.png"],["eighteen|on sekiz","assets/word-images/pilot/numbered/0066.png"],["green|yeşil","assets/word-images/pilot/numbered/0067.png"],["is it a|bu bir mi","assets/word-images/pilot/numbered/0068.png"],["look at my notebook|defterime bak","assets/word-images/pilot/numbered/0069.png"],["nineteen|on dokuz","assets/word-images/pilot/numbered/0070.png"],["open the window brad|pencereyi aç brad","assets/word-images/pilot/numbered/0071.png"],["pass the pencil|kalemi uzat","assets/word-images/pilot/numbered/0072.png"],["pink|pembe","assets/word-images/pilot/numbered/0073.png"],["put your book in the bag|kitabını çantaya koy","assets/word-images/pilot/numbered/0074.png"],["rubber|silgi","assets/word-images/pilot/numbered/0075.png"],["seventeen|on yedi","assets/word-images/pilot/numbered/0076.png"],["sixteen|on altı","assets/word-images/pilot/numbered/0077.png"],["tablet|tablet","assets/word-images/pilot/numbered/0078.png"],["three|üç","assets/word-images/pilot/numbered/0079.png"],["what color is it|bu ne renk","assets/word-images/pilot/numbered/0080.png"],["yellow|sarı","assets/word-images/pilot/numbered/0081.png"],["arm|kol","assets/word-images/pilot/numbered/0082.png"],["body|vücut gövde","assets/word-images/pilot/numbered/0083.png"],["ear|kulak","assets/word-images/pilot/numbered/0084.png"],["face|yüz","assets/word-images/pilot/numbered/0085.png"],["foot|ayak","assets/word-images/pilot/numbered/0086.png"],["hair|saç","assets/word-images/pilot/numbered/0087.png"],["has he got|onun var mı","assets/word-images/pilot/numbered/0088.png"],["have you got|var mı","assets/word-images/pilot/numbered/0089.png"],["hot|sıcak","assets/word-images/pilot/numbered/0090.png"],["how many eyes have you got|kaç tane gözün var","assets/word-images/pilot/numbered/0091.png"],["i have got a purple bag|mor bir çantaya sahibim","assets/word-images/pilot/numbered/0092.png"],["i have got an orange coat|turuncu bir monta sahibim","assets/word-images/pilot/numbered/0093.png"],["i have got one mouth|bir ağza sahibim","assets/word-images/pilot/numbered/0094.png"],["i have got two eyes|i ki göze sahibim","assets/word-images/pilot/numbered/0095.png"],["is it a leg|bu bir bacak mı","assets/word-images/pilot/numbered/0096.png"],["it is cold but it is ok i have got a coat|hava soğuk ama sorun değil montum var","assets/word-images/pilot/numbered/0097.png"],["it is raining today i have got a yellow umbrella|bugün yağmur yağıyor sarı bir şemsiyem var","assets/word-images/pilot/numbered/0098.png"],["jeans|kot pantolon","assets/word-images/pilot/numbered/0099.png"],["leg|bacak","assets/word-images/pilot/numbered/0100.png"],["no he hasn t|hayır sahip değil","assets/word-images/pilot/numbered/0101.png"],["no she hasn t|hayır sahip değil","assets/word-images/pilot/numbered/0102.png"],["raincoat|yağmurluk","assets/word-images/pilot/numbered/0103.png"],["scarf|atkı","assets/word-images/pilot/numbered/0104.png"],["shoes|ayakkabılar","assets/word-images/pilot/numbered/0105.png"],["skirt|etek","assets/word-images/pilot/numbered/0106.png"],["sunday|pazar","assets/word-images/pilot/numbered/0107.png"],["teeth|dişler","assets/word-images/pilot/numbered/0108.png"],["toes|ayak parmakları","assets/word-images/pilot/numbered/0109.png"],["wednesday|çarşamba","assets/word-images/pilot/numbered/0110.png"],["what is it|o nedir","assets/word-images/pilot/numbered/0111.png"],["yes it is|evet öyle","assets/word-images/pilot/numbered/0112.png"],["aunt|hala teyze","assets/word-images/pilot/numbered/0113.png"],["blonde|sarışın","assets/word-images/pilot/numbered/0114.png"],["daughter|kız evlat","assets/word-images/pilot/numbered/0115.png"],["he has got short hair|o kısa saça sahip","assets/word-images/pilot/numbered/0116.png"],["he is çınar s brother|o çınar ın erkek kardeşi","assets/word-images/pilot/numbered/0117.png"],["hi i m mehmet|selam ben mehmet","assets/word-images/pilot/numbered/0118.png"],["is he your|o senin mı","assets/word-images/pilot/numbered/0119.png"],["long|uzun saç","assets/word-images/pilot/numbered/0120.png"],["my cat has short legs|kedimin kısa bacakları var","assets/word-images/pilot/numbered/0121.png"],["she is emel s daughter|o emel in kızı","assets/word-images/pilot/numbered/0122.png"],["she is my mother she has blonde hair|o benim annem onun sarı saçları var","assets/word-images/pilot/numbered/0123.png"],["son|erkek evlat","assets/word-images/pilot/numbered/0124.png"],["this is a lovely baby|bu çok sevimli bir bebek","assets/word-images/pilot/numbered/0125.png"],["uncle|amca dayı","assets/word-images/pilot/numbered/0126.png"],["who are they|onlar kim","assets/word-images/pilot/numbered/0127.png"],["you have got|senin var","assets/word-images/pilot/numbered/0128.png"],["a cat has got a small nose|bir kedinin küçük bir burnu var","assets/word-images/pilot/numbered/0129.png"],["bathroom|banyo","assets/word-images/pilot/numbered/0130.png"],["coffee table|sehpa","assets/word-images/pilot/numbered/0131.png"],["eyes|gözler","assets/word-images/pilot/numbered/0132.png"],["has got|sahip olmak var","assets/word-images/pilot/numbered/0133.png"],["house|ev","assets/word-images/pilot/numbered/0134.png"],["it has got a beak|onun bir gagası var","assets/word-images/pilot/numbered/0135.png"],["kitchen|mutfak","assets/word-images/pilot/numbered/0136.png"],["rabbit|tavşan","assets/word-images/pilot/numbered/0137.png"],["sofa|kanepe","assets/word-images/pilot/numbered/0138.png"],["the chair is in the dining room|sandalye yemek odasında","assets/word-images/pilot/numbered/0139.png"],["the table is in the kitchen|masa mutfakta","assets/word-images/pilot/numbered/0140.png"],["there are two fish in the tank|akvaryumda iki balık var","assets/word-images/pilot/numbered/0141.png"],["there is a nice sofa in the sitting room|oturma odasında hoş bir kanepe var","assets/word-images/pilot/numbered/0142.png"],["toilet|tuvalet","assets/word-images/pilot/numbered/0143.png"],["where are the books|kitaplar nerede","assets/word-images/pilot/numbered/0144.png"],["where is the dog|köpek nerede","assets/word-images/pilot/numbered/0145.png"],["you have got a small bedroom|senin küçük bir yatak odan var","assets/word-images/pilot/numbered/0146.png"],["apple|elma","assets/word-images/pilot/numbered/0147.png"],["banana|muz","assets/word-images/pilot/numbered/0148.png"],["broccoli|brokoli","assets/word-images/pilot/numbered/0149.png"],["can i have some fish|biraz balık alabilir miyim","assets/word-images/pilot/numbered/0150.png"],["cherry|kiraz","assets/word-images/pilot/numbered/0151.png"],["cucumber|salatalık","assets/word-images/pilot/numbered/0152.png"],["do you like coffee|kahve sever misin","assets/word-images/pilot/numbered/0153.png"],["fish|balık","assets/word-images/pilot/numbered/0154.png"],["is there a tomato in the kitchen|mutfakta bir domates var mı","assets/word-images/pilot/numbered/0155.png"],["milk|süt","assets/word-images/pilot/numbered/0156.png"],["pear|armut","assets/word-images/pilot/numbered/0157.png"],["strawberry|çilek","assets/word-images/pilot/numbered/0158.png"],["there aren t|yok çoğul","assets/word-images/pilot/numbered/0159.png"],["there isn t|yok tekil","assets/word-images/pilot/numbered/0160.png"],["yes i do|evet severim","assets/word-images/pilot/numbered/0161.png"]]);
// Numbered illustrations have unique English phrases. The school word bank may use
// different Turkish translations, so preserve exact bilingual matches first and
// safely fall back to the unique English expression for numbered assets.
const dmNumberedByEnglish=new Map([...dmNumberedArt].map(([key,path])=>[key.split('|')[0],path]));
function dmPilotImage(card,exact=false){
 const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const english=normalize(card?.en),turkish=normalize(card?.tr);
 if(!english)return null;
 return dmPilotArt.get(english+'|'+turkish)||dmNumberedArt.get(english+'|'+turkish)||(!exact&&dmNumberedByEnglish.get(english))||null;
}
function art(card,hidden=false,exact=false){const pilot=dmPilotImage(card,exact);if(pilot){const imageUrl='/ingilizce/'+(pilot.startsWith('/')?pilot.slice(1):pilot);return '<span class="ml-art ml-art-pilot" '+(hidden?'aria-hidden="true"':'role="img" aria-label="'+esc(card.tr||card.en)+'"')+'><img src="'+esc(imageUrl)+'" alt="'+esc(card.en||'')+'" loading="eager" decoding="async" style="display:block;width:100%;height:100%;object-fit:contain" onerror="this.style.display=&#39;none&#39;;this.parentElement.classList.add(&#39;ml-art-load-failed&#39;);this.parentElement.textContent=&#39;Görsel yüklenemedi&#39;"></span>';} const im=card?.image;if(!im)return '';let style='',inner='';if(im.type==='sprite')style='background-image:url(learning-assets/objects-0'+im.sheet+'.webp);background-size:600% 600%;background-position:'+(im.index%6*20)+'% '+(Math.floor(im.index/6)*20)+'%';if(im.type==='color')style='--ml-color:'+({red:'#ed4040',blue:'#3288df',yellow:'#f9cb31',green:'#36ad68',black:'#253041',white:'#fff'}[im.value]||'#888');if(im.type==='school-soft')return '<span class="ml-art ml-art-soft ml-art-soft-'+esc(im.value)+'" role="img" aria-label="'+esc(card.tr||card.en)+'"></span>';if(im.type==='number')inner=esc(im.value);if(im.type==='shape')inner='<span class="ml-shape-'+esc(im.value)+'"></span>';return '<span class="ml-art ml-art-'+esc(im.type)+'" style="'+style+'" '+(hidden?'aria-hidden="true"':'role="img" aria-label="'+esc(card.tr||card.en)+'"')+'>'+inner+'</span>';}
function dialogKeys(el,close){el.addEventListener('keydown',e=>{if(e.defaultPrevented)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const all=[...el.querySelectorAll('button:not(:disabled),summary')].filter(x=>x.getClientRects().length),i=all.indexOf(document.activeElement);if(all.length){e.preventDefault();all[(i+(e.shiftKey?-1:1)+all.length)%all.length].focus();}}});}
async function overview(options={}){await status(!!options.force);const c=next();return {completedCount:data.chapters.filter(c=>done(c.id)).length,total:data.chapters.length,themeCount:data.themes.length,topicCount:data.themes.reduce((n,t)=>n+t.topics.length,0),title:c.topicTitle,cefr:c.cefr,theme:c.theme,thematic:true,inherited,chapters:data.chapters.map(x=>({id:x.id,title:x.routeNumber+'. Durak · '+x.title,cefr:x.cefr,theme:x.theme,topic:x.topic,topicTitle:x.topicTitle,part:x.part,current:x.id===c.id,done:done(x.id),available:x.id===c.id||unlockedChapter(x)}))};}
async function openAll(){
 const navTicket=window.dmViewHistory?.ticket();
 if(window.dmViewHistory&&!window.dmViewHistory.valid(navTicket))return;document.getElementById('mlThemeList')?.remove();
 const el=document.createElement('div');el.id='mlThemeList';el.className='ml-overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Öğrenme Yolum');
 el.innerHTML='<section class="ml-theme-panel"><header class="ml-theme-cover"><div class="ml-theme-cover-copy"><small>DİJİ-MEDU</small><h2>Öğrenme Yolum</h2><p>Adım adım ilerle, her temayı tamamla ve bilgilerini pekiştir.</p></div><div class="ml-theme-cover-art" aria-hidden="true">📚<span>⭐</span></div><button type="button" data-close aria-label="Kapat">×</button></header><div data-content role="status">Temalar ve ilerlemen yükleniyor…</div></section>';
 document.body.append(el);
 const parent=window.dmViewHistory?.capture(),previous=document.activeElement,close=()=>{el.remove();window.dmViewHistory?.leave(el);previous?.focus?.();};window.dmViewHistory?.track(el,{parent,close});
 el.querySelector('[data-close]').onclick=close;dialogKeys(el,close);el.querySelector('[data-close]').focus();const at=identity();
 async function paint(){
  try{
   await status(true);if(!el.isConnected||at!==identity())return;
   const current=next(),completed=data.chapters.filter(c=>done(c.id)).length,total=data.chapters.length,percent=Math.round(completed/Math.max(total,1)*100);
   el.querySelector('[data-content]').removeAttribute('role');
   el.querySelector('[data-content]').innerHTML='<div class="ml-summary-card"><div class="ml-summary-ring" role="progressbar" aria-label="Öğrenme yolu ilerlemesi" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+completed+'" style="--ml-done:'+percent+'%"><div><b>'+completed+'</b><small>/'+total+'</small></div></div><div class="ml-summary-info"><strong>'+data.themes.length+' tema · '+total+' bölüm</strong><p>Her bölümde öğretim ve alıştırmalar var.</p><div class="ml-summary-track"><span style="width:'+percent+'%"></span></div><small>%'+percent+' tamamlandı</small></div></div>'+
    (inherited?'<p class="ml-inherited"><span aria-hidden="true">💡</span><span>Önceki yolundaki <b>'+inherited+' tamamlanmış bölüm</b>, başlangıç ilerlemene eklendi. Bu bölümleri ödülsüz tekrar edebilirsin.</span></p>':'')+
    '<h3 class="ml-theme-list-heading">Temalarım <small>A1 → A2 → B1 → B2</small></h3>'+
    data.themes.map(t=>{
     const rows=data.chapters.filter(c=>c.themeId===t.id),finished=rows.filter(c=>done(c.id)).length,percent=Math.round(finished/Math.max(rows.length,1)*100),isCurrent=t.id===current.themeId;
     return '<details class="ml-theme'+(isCurrent?' ml-theme-current':'')+'" '+(isCurrent?'open':'')+'><summary><span class="ml-theme-number">'+t.id+'</span><span class="ml-theme-info"><strong>'+esc(t.cefr+' · '+t.title)+'</strong><small>'+t.topics.length+' konu · '+rows.length+' durak · '+finished+'/'+rows.length+' tamamlandı</small><span class="ml-theme-track" aria-hidden="true"><span style="width:'+percent+'%"></span></span></span><span class="ml-theme-state" aria-label="'+(finished===rows.length?'Tamamlandı':'Yüzde '+percent+' tamamlandı')+'">'+(finished===rows.length?'✓':percent+'%')+'</span><span class="ml-theme-chevron" aria-hidden="true">⌄</span></summary><div class="ml-theme-body"><div class="ml-topic-heading"><strong>Bu temadaki konular</strong><small>'+t.topics.length+' konu</small></div><div class="ml-topic-grid">'+t.topics.map((topic,i)=>{
      const pair=rows.filter(c=>c.topic===topic.number),topicFinished=pair.filter(c=>done(c.id)).length,icon=['🏠','👥','📖','💡','🎨','🎯'][i%6],full=topicFinished===pair.length,available=pair.some(c=>unlockedChapter(c));
      return '<article class="ml-topic-card'+(full?' is-complete':available?' is-current':'')+'"><div class="ml-topic-head"><span class="ml-topic-number">'+topic.number+'</span><span class="ml-topic-icon" aria-hidden="true">'+icon+'</span><div class="ml-topic-copy"><h3>'+esc(topic.title)+'</h3><p>'+esc(topic.objective)+'</p></div><span class="ml-topic-status'+(full?' is-done':'')+'" aria-label="'+topicFinished+' / '+pair.length+' bölüm tamamlandı"><b>'+(full?'✓':topicFinished+'/'+pair.length)+'</b><small>'+topicFinished+'/'+pair.length+'</small></span></div><div class="ml-topic-steps">'+pair.map(c=>{const complete=done(c.id),unlocked=unlockedChapter(c);return '<button type="button" data-chapter="'+c.id+'" class="ml-topic-step'+(unlocked?'':' locked')+(complete?' is-done':'')+'" aria-disabled="'+!unlocked+'"><span>'+(complete?'✓':unlocked?'▶':'🔒')+' '+(c.part===1?'Tanı ve anla':'Kullan ve pekiştir')+'</span><small>'+c.cefr+' · '+c.routeNumber+'. durak</small></button>';}).join('')+'</div></article>';
     }).join('')+'</div></div></details>';
    }).join('');
   el.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>{if(b.getAttribute('aria-disabled')==='true'){const c=data.chapters.find(x=>x.id===+b.dataset.chapter);window.yoToast?.(c&&!levelOpen(c.cefr)?'🔒 '+c.cefr+' bölümleri, '+access.maxCefr+' bölümleri bitince veya başlangıç testiyle açılır.':'Önce sıradaki bölümü tamamla.');return;}const id=+b.dataset.chapter;if(!window.dmViewHistory)close();open(id);});
  }catch(e){if(el.isConnected){el.querySelector('[data-content]').textContent=e.message;const b=document.createElement('button');b.textContent='Tekrar dene';b.onclick=paint;el.querySelector('[data-content]').append(b);}}
 }
 paint();
}
function close(force=false){const wasOpen=!!modal;if(!force&&window.dmPapiFirstPractice?.locked('independent'))return;window.dmRoutePracticeFlight?.cancel();teachingHeard.clear();teachingSpeech++;flightShown=false;if(!force)window.dmPapiFirstPractice?.complete('independent');epoch++;visualDeck=false;answerOrder=core.presentation();layoutObserver?.disconnect();layoutObserver=null;if(fitFrame)cancelAnimationFrame(fitFrame);fitFrame=0;try{speechSynthesis.cancel();}catch{}const closed=modal;modal?.remove();modal=null;window.dmViewHistory?.leave(closed);busy=false;accepted=false;document.body.classList.remove('dm-story-open');if(wasOpen)document.dispatchEvent(new CustomEvent('dm:story-close'));const bridge=schoolBridge;schoolBridge=null;comboBreakPromise=Promise.resolve();comboRewardPromise=Promise.resolve();finalReviewDraft=null;bridge?.onClose?.();origin?.focus?.();origin=null;}
// School Route supplies its bank-backed tasks and verified session; the view is shared.
async function openSchool(bridge){
 close(true);schoolBridge=bridge;chapter=bridge.chapter;session=bridge.session;owner=identity();origin=document.activeElement;reviewSnapshots.clear();reviewScope=owner+'|school|'+chapter.id;
 const parent=window.dmViewHistory?.capture();modal=document.createElement('div');modal.id='dmStoryLesson';modal.className='ml-lesson ml-overlay';modal.dataset.route='school';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Okul Yolum');document.body.append(modal);window.dmViewHistory?.track(modal,{parent,close:()=>close(true),back});watchLessonLayout();document.body.classList.add('dm-story-open');wallet(session);entry();return true;
}
function breakCombo(localOnly=false){
 if(!modal||!session)return;economy.combo=0;paintHud();if(localOnly)return;const ticket=epoch,at=identity(),cursor=session.cursor,version=session.version;
 comboBreakPromise=comboBreakPromise.catch(()=>{}).then(async()=>{if(ticket!==epoch||!modal||identity()!==at||cursor!==session.cursor)return;try{const r=await api('comboReset',{chapter:chapter.id,cursor,version});if(ticket===epoch&&modal&&identity()===at){if(!r.stale&&r.cursor===session?.cursor&&Number(r.version)>Number(session?.version)){session={...session,version:r.version};}wallet(r);}}catch(e){if(ticket===epoch&&modal){feedback('Kombo kaydedilemedi. Bağlantı gelince tekrar dene.');throw e;}}});comboBreakPromise.catch(()=>{});
}
async function open(id,options={}){const navTicket=window.dmViewHistory?.ticket();const returnView=window.dmViewHistory?.parent(modal);if(busy)return false;await curriculum();await preloadV8();if(!options.intro)await status();if(window.dmViewHistory&&!window.dmViewHistory.valid(navTicket))return false;id=Number(id);if(id>=0&&id<80)id=1000+id;const C=data.chapters.find(c=>c.id===id);if(!C)return false;if(modal&&window.dmPapiFirstPractice?.locked('independent')&&!options.intro)return false;close(!!options.intro);origin=document.activeElement;chapter=C;session=null;owner=identity();const scope=owner+'|'+C.id;if(reviewScope!==scope){reviewScope=scope;reviewSnapshots.clear();}const at=owner,ticket=++epoch;modal=document.createElement('div');modal.id='dmStoryLesson';modal.className='ml-lesson ml-overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',C.title);document.body.append(modal);window.dmViewHistory?.track(modal,{parent:returnView,close:()=>close(true),back});watchLessonLayout();document.body.classList.add('dm-story-open');modal.innerHTML='<section class="ml-loading">Bölüm hazırlanıyor…<button type="button">Geri dön</button></section>';modal.querySelector('button').onclick=()=>close();busy=true;try{const r=await api('open',{chapter:id});if(ticket!==epoch||identity()!==at)return false;session=r;visualDeck=r.routeVisualQuestions===2?2:r.routeVisualQuestions===true;busy=false;wallet(r);entry();return true;}catch(e){if(ticket===epoch&&modal){busy=false;modal.querySelector('.ml-loading').firstChild.textContent=e.message;const retry=document.createElement('button');retry.textContent='Yeniden dene';retry.onclick=()=>open(id,options);modal.querySelector('section').append(retry);}return false;}}
function back(){if(busy||!modal)return;if(!modal.classList.contains('ml-entry')){if(!modal.querySelector('.ml-complete')&&typeof window.dmSoruPanel?.confirmExit==='function'){const ticket=epoch;window.dmSoruPanel.confirmExit(()=>{if(ticket===epoch&&modal)close();});return;}try{speechSynthesis.cancel();}catch{}entry();scheduleLessonFit();return;}close();}
function teachingCards(task){const cards=[...(session.deckVersion===8||schoolBridge?chapter.cards:task.cards)];if(session.deckVersion===8&&cards.length<4&&!schoolBridge){for(const c of chapter.examples||[])if(cards.length<4&&!cards.some(x=>core.norm(x.en)===core.norm(c.en)))cards.push(c);}return cards;}
function entry(){
 if(!modal||!session||!chapter)return;
 const count=taskDeck(chapter,data?.chapters.find(c=>c.id===chapter.previousId),session.deckVersion).filter(t=>t.kind!=='teach').length,resume=session.cursor>0&&!session.finished,replay=!!session.replay||!!schoolBridge?.entryMeta?.completed,mascot=pickEntryMascot(),meta=schoolBridge?.entryMeta,firstTask=taskDeck(chapter,data?.chapters.find(c=>c.id===chapter.previousId),session.deckVersion).find(t=>t.kind==='teach'),expressions=firstTask?teachingCards(firstTask).length:chapter.cards.length;
 const label=schoolBridge?(resume?'Okul Yolunda Devam Et':'Okul Yoluna Başla'):session.needsRecovery?'Pekiştirmeye Devam Et':resume?'Öğrenme Yolunda Devam Et':replay?'Yolu Yeniden Keşfet':'Öğrenme Yoluna Başla';
 const short=session.needsRecovery?'Pekiştir':resume?'Devam et':replay?'Tekrar et':'Başla';
 modal.classList.add('ml-entry');
 modal.innerHTML='<section class="ml-entry-card"><div class="ml-entry-journey" aria-hidden="true">✦ · ✧ · ✦</div>'+(window.dmLivePapi?.markup?'<span class="ml-entry-papi ml-pop-papi dm-lp" aria-hidden="true">'+window.dmLivePapi.markup()+'</span>':window.DMPapi?'<span class="ml-entry-papi dm-papi-host" aria-hidden="true">'+window.DMPapi.html('merhaba','Papi',{tap:true})+'</span>':'<img class="ml-entry-papi" data-ml-character="'+mascot+'" src="learning-assets/characters/'+mascot+'.webp" alt="'+esc(mascot)+' maskotu" width="200" height="200" decoding="async">')+'<button type="button" class="ml-entry-close" data-back aria-label="Öğrenme yoluna dön">×</button><small class="ml-entry-badge">ÖĞRENME YOLU · '+chapter.cefr+' · '+chapter.routeNumber+'. DURAK</small><h2>'+esc(meta?.title||chapter.topicTitle)+'</h2><p class="ml-entry-theme">'+esc(chapter.theme)+(meta?.part&&meta?.total?' · Parça '+esc(meta.part)+' / '+esc(meta.total):'')+'</p><div class="ml-entry-prize"><div class="ml-prize-art" aria-hidden="true">⭐<span>🪙</span></div><div class="ml-prize-copy"><b>'+(replay?'Tekrar turu':'Olası ödül')+'</b><strong>'+(replay?'Bilgilerini pekiştir':'XP ve altın')+'</strong><span>'+(replay?'Bu bölüm daha önce tamamlandı. Tekrarında ek ödül verilmez.':'İlk tamamlamada, başarına göre hesabına eklenir.')+'</span></div></div><div class="ml-entry-stats" aria-label="Bölüm içeriği"><div><span aria-hidden="true">📖</span><b>'+expressions+' ifade</b></div><div><span aria-hidden="true">❔</span><b>'+count+' soru</b></div><div><span aria-hidden="true">📗</span><b>Öğrenme kartları</b></div></div>'+(resume?'<p class="ml-entry-resume">✓ İlerlemen kayıtlı. Kaldığın sorudan devam edeceksin.</p>':'')+'<button type="button" class="ml-entry-start" aria-label="'+label+'"><span class="ml-entry-start-icon" aria-hidden="true">⚑</span><span class="ml-entry-start-label">'+short+'</span>'+(replay?'':'<span class="ml-entry-pill" aria-hidden="true">XP + altın</span>')+'<span class="ml-entry-start-arrow" aria-hidden="true">→</span></button></section>';
 if(schoolBridge){modal.querySelector('.ml-entry-badge').textContent='OKUL YOLUM · '+chapter.cefr+' · '+chapter.routeNumber+'. DURAK';modal.querySelector('[data-back]').setAttribute('aria-label','Okul yoluna dön');}
 bindMascotFallback(modal);
 modal.querySelector('[data-back]').onclick=back;dialogKeys(modal,back);
 const ticket=epoch,at=identity();modal.querySelector('.ml-entry-start').onclick=()=>{if(ticket!==epoch||identity()!==at||!modal||!modal.classList.contains('ml-entry'))return;if(typeof window.genelEnerjiKalan==='number'&&window.genelEnerjiKalan<=0&&!window.dmTeacherPortalMode&&who().toLowerCase()!=='teacher'&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci)&&!window.dmOdevEnerjiMuaf?.()){window.DijiMeduPapiFeedback?.energy();return;}modal.classList.remove('ml-entry');render();modal.querySelector('[data-back]')?.focus();};
 window.dmDurakBaslat?.place(modal);
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
const SCHOOL_PARROTS=['papi-welcome-v2.png','study-assets/papi-explain.png','study-assets/papi-read.png','study-assets/papi-celebrate.png','route-assets/papi-school.webp','route-assets/papi-english.webp','profile-assets/papi-selam.png','papi-help-v2.png','discovery-assets/papi-merhaba.webp','papi-reward-v2.png'];
function arenaHero(content,extra='',variation=0){if(schoolBridge){const src=SCHOOL_PARROTS[(Math.max(0,(Number(session?.cursor)||0)-1)+variation)%SCHOOL_PARROTS.length],img='<img class="ml-arena-papi" data-ml-character="school-parrot" src="'+src+'" alt="Papi" width="160" height="180" decoding="async">';const teach=modal?.dataset.taskKind==='teach',label=modal?.querySelector('.ml-eyebrow')?.textContent||'',instruction=['Anlamı keşfet','Bu dersten hatırla','Son tekrar'].includes(label)?'Türkçe karşılığını seç.':label==='İngilizcesini bul'?'İngilizce karşılığını seç.':label||'Türkçe karşılığını seç.';return '<div class="ml-arena-hero '+extra+'">'+(teach?img:'<div class="ml-school-question-head"><small class="ml-school-count">'+Math.max(1,(Number(session?.cursor)||0)-1)+' / 10</small>'+img+'<p class="ml-school-instruction">'+esc(instruction)+'</p></div>')+'<div class="ml-speech">'+content+'</div></div>';}const name=mascotAt(session?.cursor);return '<div class="ml-arena-hero '+extra+'"><img class="ml-arena-papi" data-ml-character="'+name+'" src="learning-assets/characters/'+name+'.webp" alt="" aria-hidden="true" width="240" height="300" decoding="async"><div class="ml-speech">'+content+'</div></div>';}
/* Images in Learning Path are resolved only from the exact two-language card.
   Never infer the correct asset from an English choice/distractor alone. */
function dmLearningImagePair(task){
 if(task?.picture?.en&&task.picture.tr)return task.picture;
 if(task?.en&&task.tr)return task;
 if(!task||task.kind==='match'||task.kind==='review'||task.kind==='teach'||task.images)return null;
 const previous=data?.chapters?.find(c=>c.id===chapter?.previousId);
 const source=[...(chapter?.cards||[]),...(chapter?.examples||[]),...(chapter?.themeReview||[]),...(previous?.cards||[])];
 const seen=new Set(),pairs=source.filter(p=>{if(!p?.en||!p?.tr)return false;const k=JSON.stringify([p.en,p.tr]);if(seen.has(k))return false;seen.add(k);return true;});
 const matches=pairs.filter(p=>{
  const explanation=String(task.explanation||'');
  if(explanation===p.en+' = '+p.tr||explanation===p.en+' — '+p.tr)return true;
  if(task.answer===p.en+' → '+p.tr)return true;
  const exactContext=task.audio===p.en||task.prompt===p.en||task.prompt===p.tr||task.promptAudio===p.tr;
  return exactContext&&(task.answer===p.en||task.answer===p.tr);
 });
 return matches.length===1?matches[0]:null;
}
function dmLearningShowPicture(task,area){
 const pair=dmLearningImagePair(task),slot=area?.querySelector('.ml-arena-hero .ml-speech');
 if(pair&&slot)void window.DMWordImagePool?.decorate(slot,pair.en,pair.tr,'learning');
}
function lessonTheme(){return window.dmDayNightTheme?.themeFor()||document.documentElement.dataset.dmTheme||'day';}
function applyLessonTheme(value){if(modal)modal.dataset.appearance=value;}
document.addEventListener('dm:theme',()=>applyLessonTheme(lessonTheme()));
function shell(){const q=Math.max(0,Math.min(stepsFor(),session.cursor));modal.innerHTML='<section class="ml-shell"><header class="ml-header"><button type="button" data-back aria-label="Öğrenme yoluna dön">‹</button><div><small>'+esc(chapter.cefr+' · '+chapter.theme)+' · '+chapter.routeNumber+'. durak</small><h1>'+esc(chapter.topicTitle)+'</h1></div><button type="button" data-voice aria-pressed="'+voice+'" aria-label="Sesi aç veya kapat">'+(voice?'🔊':'🔇')+'</button></header>'+hudMarkup()+'<div class="ml-arena-title" aria-hidden="true"><span>✦</span> DijiMedu ile Öğren <span>✦</span></div><div class="ml-progress"><progress max="'+stepsFor()+'" value="'+q+'" aria-label="Bölüm ilerlemesi"></progress><span>'+ ((session.deckVersion===8&&session.cursor<4||schoolBridge&&session.cursor<2)?'Dinle ve Öğren':(schoolBridge?Math.max(1,q-1):session.deckVersion===8?Math.max(1,q-3):q)+' / '+questionsFor()+' soru')+'</span><nav class="ml-question-history" aria-label="Bölüm içinde gezin"><button type="button" data-ml-review-open aria-label="Önceki cevaplanmış soruyu gör" '+(reviewSnapshots.size?'':'disabled')+'>←</button><button type="button" aria-label="Sonraki soruya ilerle" disabled>→</button></nav></div><main class="ml-board"><div class="ml-stage"><div class="ml-task"></div><div class="ml-feedback" role="status" aria-live="polite"></div><div class="ml-actions"></div></div></main><footer>Öğrenme kartları + '+questionsFor()+' soru'+(session.replay?' · Tekrar turu, ek ödül verilmez':'')+'</footer></section>';applyLessonTheme(lessonTheme());modal.scrollTop=0;modal.querySelector('[data-back]').onclick=back;modal.querySelector('[data-voice]').onclick=()=>{voice=!voice;modal.querySelector('[data-voice]').textContent=voice?'🔊':'🔇';modal.querySelector('[data-voice]').setAttribute('aria-pressed',String(voice));if(!voice)window.speechSynthesis?.cancel();};modal.querySelector('[data-ml-review-open]')?.addEventListener('click',()=>showAnsweredSnapshot(Math.max(...reviewSnapshots.keys())));dialogKeys(modal,back);scheduleLessonFit();}

function scheduleLessonFit(){if(!modal)return;if(fitFrame)cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(fitLesson);}
function fitLesson(){
 if(modal)modal.querySelectorAll('.ml-wave-word h2').forEach(h=>{
  h.style.removeProperty('font-size'); h.style.setProperty('overflow-wrap','normal','important');h.style.setProperty('word-break','normal','important');
  if(!/\s/.test(h.textContent.trim())){h.style.setProperty('white-space','nowrap','important');let size=parseFloat(getComputedStyle(h).fontSize);while(h.clientWidth>0&&h.scrollWidth>h.clientWidth+1&&size>12){size-=1;h.style.setProperty('font-size',size+'px','important');}}
 });

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
 const ticket=epoch,at=identity();comboRewardPromise=new Promise(resolve=>queueMicrotask(async()=>{try{if(ticket!==epoch||!modal||identity()!==at)return;
  if(typeof window.dmComboSteps?.play==='function'){
   await window.dmComboSteps.play({gain,isCurrent:()=>ticket===epoch&&!!modal&&identity()===at,sound:voice,host:modal});
  }else if(typeof window.dmRoutePracticeFlight?.playCombo==='function'){
   await window.dmRoutePracticeFlight.playCombo({gain,isCurrent:()=>ticket===epoch&&!!modal&&identity()===at,onExit:()=>close(true),sound:voice});
  }else if(typeof window.DMRouteQuestions?.celebrate==='function'){
   window.DMRouteQuestions.celebrate(modal,gain,5);
  }else{const el=modal.querySelector('.ml-combo-toast');if(el){el.textContent='🪶 5 doğru! +'+gain+' enerji';setTimeout(()=>{if(ticket===epoch&&el.isConnected)el.textContent='';},3000);}}
 }catch{}finally{resolve();}}));
}

function feedback(text,correct=false){const el=modal?.querySelector('.ml-feedback');if(el){el.textContent=text;el.classList.toggle('is-correct',correct);}}
function remember(r){
 if(schoolBridge)return;
 if(!Number.isInteger(r.chapter))return;
 const old=progress.find(p=>p.chapter===r.chapter);progress=progress.filter(p=>p.chapter!==r.chapter);progress.push({chapter:r.chapter,cursor:r.cursor,completed:!!(old?.completed||r.completed),version:r.version});progressRevision++;loadedAt=0;
 if(r.finished)document.dispatchEvent(new CustomEvent('dm:learning-progress',{detail:{owner:who(),chapter:r.chapter,completed:true}}));
}
const hudIcons={energy:'<svg viewBox="0 0 32 38" aria-hidden="true"><path d="M20 2 4 22h11l-3 14L29 15H18Z" fill="#ffc642" stroke="#aa7b20" stroke-width="1.6"/></svg>',gold:'<svg viewBox="0 0 36 38" aria-hidden="true"><ellipse cx="18" cy="19" rx="14" ry="16" fill="#ffd461" stroke="#b68423" stroke-width="2"/><ellipse cx="18" cy="19" rx="10" ry="12" fill="none" stroke="#e7a924" stroke-width="2"/><path d="M15 12v14m6-14v14M12 16h12m-12 6h12" stroke="#ad7b1b" stroke-width="2"/></svg>',feather:'<svg viewBox="0 0 32 38" aria-hidden="true"><path d="M27 2C9 5 4 15 7 29 21 28 29 18 27 2Z" fill="#52c8d4" stroke="#c3a24d" stroke-width="1.5"/><path d="M4 36 25 5M9 27l10-1M12 22l11-2M16 16l9-2M13 23l-3-8m7 2-2-9" fill="none" stroke="#e6d09b" stroke-width="1"/></svg>'};
function hudMarkup(){const energy=economy.energy??(typeof genelEnerjiKalan!=='undefined'?genelEnerjiKalan:'–'),gold=economy.gold??(typeof yo!=='undefined'?yo?.altin:0)??0,combo=Number(economy.combo)||0,count=combo>0&&combo%5===0?5:combo%5;return '<div class="ml-wallet" role="group" aria-label="Altın, enerji ve kombo"><div class="ml-wallet-chip" aria-label="Enerji">'+hudIcons.energy+'<b data-ml-energy>'+esc(energy)+'<small> / '+esc(economy.energyMax||25)+'</small></b></div><div class="ml-wallet-chip" aria-label="Altın">'+hudIcons.gold+'<b data-ml-gold>'+esc(gold)+'</b></div><div class="ml-wallet-chip" aria-label="Kuş tüyü kombo">'+hudIcons.feather+'<b data-ml-combo>'+count+'<small> / 5</small></b></div></div><div class="ml-combo-toast" role="status" aria-live="polite"></div>';}
function paintHud(){const bar=modal?.querySelector('.ml-wallet');if(!bar)return;const old=bar.querySelector('[data-ml-energy]'),before=Number(old?.firstChild?.nodeValue);bar.outerHTML=hudMarkup().split('<div class="ml-combo-toast"')[0];const now=modal.querySelector('[data-ml-energy]');if(window.dmRewardFx&&now&&Number.isFinite(before)&&Number(economy.energy)>before&&now.firstChild?.nodeType===3){now.firstChild.nodeValue=String(before);now.dataset.dmCounting='1';}}
function wallet(r){
 if(r.wallet)economy={...economy,...r.wallet};
 if(r.enerjiKalan!=null)economy.energy=r.enerjiKalan;if(r.enerjiMax!=null)economy.energyMax=r.enerjiMax;if(r.combo!=null)economy.combo=r.combo;
 if(economy.energy!=null){window.genelEnerjiKalan=economy.energy;window.headerEnerjiGoster?.(economy.energy,economy.energyMax);}
 const state=r.yo||(!r.stale&&!r.alreadyCompleted&&r.finished&&!r.replay?r.reward?.yo:null);if(state)window.dmApplyRewardState?.(state,who());paintHud();
 if(r.comboGain>0&&r.accepted!==false&&!r.stale&&!r.alreadyCompleted&&!r.replay)showComboReward(r);
 if(r.finished){window.dmProgression?.refresh?.(true);window.dmPapiFirstPractice?.complete('independent');}
}
async function reconcileLesson(ticket,at,error){
 if(ticket!==epoch||!modal||identity()!==at)return;
 const previousCursor=session?.cursor;
 try{
  const r=await api('open',{chapter:chapter.id,deckVersion:session.deckVersion});
  if(ticket!==epoch||!modal||identity()!==at)return;
  session=r;visualDeck=r.routeVisualQuestions===2?2:r.routeVisualQuestions===true;remember(r);wallet(r);busy=false;modal.removeAttribute('aria-busy');render();
  feedback(r.cursor!==previousCursor?'Cevabın sunucuda kayıtlı. Kaldığın yerden devam edebilirsin.':'Bağlantı kesildi; bu sorudan yeniden deneyebilirsin.');
 }catch{
  if(ticket!==epoch||!modal||identity()!==at)return;
  busy=false;modal.removeAttribute('aria-busy');render();
  feedback('Bağlantı kurulamadı. Sorunu kapatmadan tekrar deneyebilirsin.');
  const actions=modal.querySelector('.ml-actions');
  if(actions){const retry=document.createElement('button');retry.type='button';retry.className='ml-primary';retry.textContent='Bağlantıyı yeniden kur';retry.onclick=()=>{if(busy||ticket!==epoch||identity()!==at)return;busy=true;retry.disabled=true;modal.setAttribute('aria-busy','true');void reconcileLesson(ticket,at,error);};actions.appendChild(retry);}
 }
}
function correctResponse(task){
 if(task.kind==='review')return Array.isArray(task.cards)?task.cards.map(c=>c.tr):task.answer;
 if(task.kind==='match')return task.pairs.map(p=>({en:p.en,tr:p.tr}));
 return task.answer??task.en;
}
function correctionText(task){
 if(task.kind==='review')return task.cards.map(c=>c.en+' — '+c.tr).join(' · ');
 if(task.kind==='match')return task.pairs.map(c=>c.en+' — '+c.tr).join(' · ');
 const answer=String(task.answer??task.en??'');
 const detail=String(task.explanation||'').trim();
 return (answer?answer:'Doğru eşleştirme')+(detail&&detail!==answer?' · '+detail:'');
}
function reportSnapshot(task,answer,cursor){if(modal)modal.dmQuestionReport={route:schoolBridge?'school':'learning',chapter:String(chapter.id),cursor,task:{kind:task.kind,label:task.visualMatch?"Papi'nin Hatası":task.label,prompt:task.visualMatch?'Görsele bak; Papi doğru mu söylüyor?':task.prompt,audio:task.audio,options:task.options,tokens:task.tokens,pairs:task.pairs,expected:correctResponse(task)},answer};}
function manualNext(fn){const actions=modal.querySelector('.ml-actions');actions.innerHTML='<button type="button" class="ml-primary" data-next>Devam et →</button>';actions.querySelector('button').onclick=()=>{if(busy)return;actions.querySelector('button').disabled=true;fn();};scheduleLessonFit();}
function pauseForCorrection(task,continueAction){
 accepted=true;
 feedback('Yanlış cevap. Doğrusu: '+correctionText(task));
 modal.querySelector('.ml-feedback')?.classList.add('is-answer-wrong');
 const actions=modal.querySelector('.ml-actions');
 actions.innerHTML='<button type="button" class="ml-primary" data-next>Devam Et →</button>';
 const btn=actions.querySelector('[data-next]');
 btn.onclick=()=>{
  if(!modal||busy||!accepted)return;
  btn.disabled=true;
  continueAction();
 };
 scheduleLessonFit();
 btn.focus({preventScroll:true});
}
async function submit(answer,clicked,{guided=false,alreadySpoken=false}={}){
 if(busy||accepted||!modal)return;
 window.dmRoutePracticeFlight?.prepare();
 const submitEpoch=epoch;
 const initialCursor=session.cursor;
 const spokenTask=taskDeck(chapter,data?.chapters.find(c=>c.id===chapter.previousId),session.deckVersion)[session.cursor];
 const spokenAnswer=typeof answer==='string'&&!guided&&(spokenTask.kind==='letters'||spokenTask.kind==='order'||(spokenTask.kind==='choice'&&spokenTask.language!=='en'))?answer:'';

 const answerAudio=spokenAnswer&&!alreadySpoken?new Promise(resolve=>speech(spokenAnswer.split(' → ')[0],'en-US',resolve)):Promise.resolve();
 busy=true;
 try{await comboBreakPromise;}catch{breakCombo();try{await comboBreakPromise;}catch{if(submitEpoch===epoch)busy=false;return;}}
 if(submitEpoch!==epoch||accepted||!modal||session.cursor!==initialCursor){if(submitEpoch===epoch)busy=false;return;}
 const ticket=epoch,at=identity(),answeredCursor=session.cursor;
 const task=taskDeck(chapter,data?.chapters.find(c=>c.id===chapter.previousId),session.deckVersion)[session.cursor];
 busy=true;modal.setAttribute('aria-busy','true');
 modal.querySelectorAll('.ml-task button,.ml-actions button').forEach(b=>b.disabled=true);
 feedback('Kontrol ediliyor…');
 try{
  const r=await api('advance',{chapter:chapter.id,cursor:session.cursor,version:session.version,answer});
  if(ticket!==epoch||!modal||identity()!==at)return;
  if(spokenTask.kind==='order'||(spokenTask.kind==='choice'&&/_{2,}/.test(spokenTask.prompt||'')))await answerAudio;
  if(ticket!==epoch||!modal||identity()!==at)return;
  if(r.accepted&&r.correct!==false&&spokenAnswer&&spokenTask.kind==='choice'&&/_{2,}/.test(spokenTask.prompt||'')){await new Promise(resolve=>speech(spokenTask.prompt.replace(/_{2,}/g,spokenAnswer),'en-US',resolve));if(ticket!==epoch||!modal||identity()!==at)return;}
  reportSnapshot(task,answer,answeredCursor);session=r;busy=false;modal.removeAttribute('aria-busy');remember(r);wallet(r);
  if(r.stale){render();feedback('Diğer ekranındaki ilerlemen yüklendi.');return;}
  if(r.needsRecovery){
   if(r.correct===false&&task.kind!=='teach'){
    window.dmAnswerFeedback?.(false);
    pauseForCorrection(task,()=>{render();feedback('Papi ile üç kısa pekiştirme sorusu çözelim.');});
   }else{render();feedback('Papi ile üç kısa pekiştirme sorusu çözelim.');}
   return;
  }
  if(!r.accepted){
   economy.combo=0;paintHud();window.dmAnswerFeedback?.(false);
   const word=[...chapter.cards,...(chapter.usage||[])].find(w=>core.norm(w.en)===core.norm(task.prompt)||core.norm(w.tr)===core.norm(task.prompt));
   if(word)window.dmWrongWords?.add({...word,source:schoolBridge?'okul-yolum':'ogrenme-yolu'});
   if(r.cursor!==answeredCursor){
    pauseForCorrection(task,()=>render()); // future server versions may already advance on wrong
   }else{
    pauseForCorrection(task,()=>{accepted=false;void submit(correctResponse(task),null,{guided:true});});
   }
   return;
  }
  // School's final review can advance with an incorrect answer while preserving
  // the truthful first-attempt score. Show the explanation; never label it correct.
  if(r.correct===false&&task.kind==='review'&&r.cursor>answeredCursor){saveAnsweredSnapshot(answeredCursor);render();return;}
  if(r.correct===false){
   window.dmAnswerFeedback?.(false);
   pauseForCorrection(task,()=>render());
   return;
  }
  accepted=true;
  if(task.kind==='teach'||task.kind==='review'){
   saveAnsweredSnapshot(answeredCursor);
   if(task.kind==='review'){await comboRewardPromise;if(ticket!==epoch||!modal||identity()!==at)return;}
   render();return;
  }
  if(!guided){window.dmAnswerFeedback?.(true);clicked?.classList.add('is-correct');feedback('✓ Doğru!',true);}
  else{feedback('Cevabı öğrendin. Sonraki soruya geçiliyor…',true);}
  saveAnsweredSnapshot(answeredCursor);
  const nextCursor=session.cursor;
  const renderNext=()=>{if(ticket===epoch&&modal&&identity()===at&&session.cursor===nextCursor)render();};
  // A combo already provides feedback time: advance in the same promise turn it ends.
  manualNext(async()=>{if(r.comboGain>0&&!r.alreadyCompleted&&!r.replay){try{await comboRewardPromise;}catch{}}renderNext();});
 }catch(e){
  if(e.energyEmpty){busy=false;modal?.removeAttribute('aria-busy');wallet(e);render();feedback(e.message);window.DijiMeduPapiFeedback?.energy();}
  else await reconcileLesson(ticket,at,e);
 }
}
// One teaching screen acknowledges the existing consecutive teaching steps in order.
// The deck, graded questions, cursor/version checks and rewards stay server-owned.
async function startQuestions(){
 if(busy||accepted||!modal)return;
 const ticket=epoch,at=identity();busy=true;modal.setAttribute('aria-busy','true');
 modal.querySelectorAll('.ml-task button,.ml-actions button').forEach(b=>b.disabled=true);feedback('Sorular hazırlanıyor…');
 try{
  const tasks=taskDeck(chapter,data?.chapters.find(c=>c.id===chapter.previousId),session.deckVersion);
  const learnedWords=tasks[session.cursor]?.kind==='teach'?teachingCards(tasks[session.cursor]).slice(0,4):[];
  for(let i=0;i<tasks.length&&tasks[session.cursor]?.kind==='teach';i++){
   const cursor=session.cursor,r=await api('advance',{chapter:chapter.id,cursor,version:session.version,answer:true});
   if(ticket!==epoch||!modal||identity()!==at)return;
   session=r;remember(r);wallet(r);
   if(r.stale||!r.accepted||r.cursor<=cursor){busy=false;modal.removeAttribute('aria-busy');render();feedback(r.stale?'Diğer ekranındaki ilerlemen yüklendi. Hazır olduğunda devam edebilirsin.':'Öğrenme aşaması kaydedilemedi. Tekrar deneyebilirsin.');return;}
   saveAnsweredSnapshot(cursor);
  }
  if(!flightShown&&window.dmRoutePracticeFlight){flightShown=true;const complete=await window.dmRoutePracticeFlight.play({isCurrent:()=>ticket===epoch&&!!modal&&identity()===at,onExit:()=>close(true),sound:voice,words:learnedWords});if(!complete||ticket!==epoch||!modal||identity()!==at)return;}
  busy=false;modal.removeAttribute('aria-busy');render();
 }catch(e){await reconcileLesson(ticket,at,e);}
}
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
async function submitRecovery(answer,alreadySpoken=false){
 if(busy||!modal||!session?.needsRecovery)return;
 const ticket=epoch,at=identity(),step=session.recovery?.step;reportSnapshot({...session.recovery,kind:'recovery',label:'Pekiştirme'},answer,session.cursor);
 const answerAudio=alreadySpoken?Promise.resolve():new Promise(resolve=>speech(answer,'en-US',resolve));
 busy=true;modal.setAttribute('aria-busy','true');
 modal.querySelectorAll('.ml-task button,.ml-actions button').forEach(b=>b.disabled=true);
 feedback('Kontrol ediliyor…');
 try{
  const r=await api('recover',{chapter:chapter.id,version:session.version,step,answer});
  if(ticket!==epoch||!modal||identity()!==at)return;
  await answerAudio;if(ticket!==epoch||!modal||identity()!==at)return;
  session=r;busy=false;modal.removeAttribute('aria-busy');
  remember(r);wallet(r);
  if(r.stale){render();feedback('Kaldığın pekiştirme sorusu yüklendi.');return;}
  window.dmAnswerFeedback?.(!!r.accepted);
  feedback(r.accepted?'Harika! Bir adım daha ilerledin.':'Birlikte yeniden deneyelim.',!!r.accepted);if(!r.accepted)modal.querySelector('.ml-feedback').classList.add('is-answer-wrong');manualNext(render);
 }catch(e){await reconcileLesson(ticket,at,e);}
}
function renderRecovery(){
 shell();modal.dataset.taskKind='recovery';
 const q=session.recovery,area=modal.querySelector('.ml-task'),actions=modal.querySelector('.ml-actions');
 if(!q||!Array.isArray(q.options)){area.textContent='Pekiştirme yüklenemedi. Geri dönüp tekrar açabilirsin.';return;}
 const score=session.firstAttempt,summary=score&&Number.isFinite(Number(score.correct))?'İlk deneme: '+score.correct+' / '+questionsFor()+' doğru. ':'';
 area.innerHTML='<p class="ml-eyebrow">PAPİ İLE PEKİŞTİRME</p>'+arenaHero('<h2>'+esc(q.prompt)+'</h2><p>'+esc(q.support||'Doğru İngilizce ifadeyi seç.')+'</p>')+
 '<p class="ml-recovery-status" role="status">'+esc(summary)+'Bölümü tamamlamak için 3 kısa soruyu doğru yanıtla. Bu turda ödül %30 olur.</p>'+
 '<p class="ml-question-instruction">Pekiştirme '+(Number(q.step)+1)+' / 3</p>'+
 '<div class="ml-choices ml-recovery-choices">'+optionOrder('recovery:'+q.step,q.options).map(i=>'<button type="button" data-recovery-choice="'+i+'" lang="en">'+esc(q.options[i])+'</button>').join('')+'</div>';
 bindMascotFallback(area);
 dmLearningShowPicture(q,area);
 let chosen=null;const buttons=[...area.querySelectorAll('[data-recovery-choice]')];buttons.forEach(b=>b.onclick=()=>{if(busy)return;chosen=b;buttons.forEach(x=>x.classList.toggle('is-selected',x===b));actions.querySelector('[data-recovery-check]').disabled=false;speech(q.options[+b.dataset.recoveryChoice]);});
 actions.innerHTML='<button type="button" data-reference-recovery>Öğrenme kartlarını gör</button><button type="button" class="ml-primary" data-recovery-check disabled>Kontrol et →</button>';actions.querySelector('[data-recovery-check]').onclick=()=>{if(chosen)submitRecovery(q.options[+chosen.dataset.recoveryChoice],true);};
 actions.querySelector('button').onclick=()=>openReference(chapter.cards,'Pekiştirme için öğrenme kartları');
 scheduleLessonFit();
}
function render(){if(!modal)return;accepted=false;if(session?.needsRecovery&&!session.finished){renderRecovery();return;}shell();if(session.finished||session.cursor>=taskDeck(chapter,data?.chapters.find(c=>c.id===chapter.previousId),session.deckVersion).length){finish();return;}const tasks=taskDeck(chapter,data?.chapters.find(c=>c.id===chapter.previousId),session.deckVersion),task=tasks[session.cursor],area=modal.querySelector('.ml-task'),actions=modal.querySelector('.ml-actions');modal.dataset.taskKind=task.kind;modal.dataset.schoolShort=String((task.prompt||'').length<=16);area.innerHTML='<p class="ml-eyebrow">'+esc(task.label)+'</p>';
 const speaker=(text,lang='en-US',label='Dinle')=>{const b=document.createElement('button');b.type='button';b.className='ml-speaker';b.setAttribute('aria-label',label);b.innerHTML='<span class="ml-wave-play" aria-hidden="true">▶</span><span class="ml-live-wave" aria-hidden="true">'+[8,15,25,12,36,44,23,34,16,27,12,8].map((h,i)=>'<i style="--wave-h:'+h+'px;--wave-delay:'+i*45+'ms"></i>').join('')+'</span>';b.playVoice=()=>{speech(text,lang,()=>b.classList.remove('is-playing'));if(voice&&activeLessonSpeech)b.classList.add('is-playing');};b.onclick=b.playVoice;return b;};
 if(task.kind==='teach'){
  const cards=teachingCards(task),ticket=epoch,at=identity(),cursor=session.cursor;
  const current=()=>ticket===epoch&&identity()===at&&!!modal&&session.cursor===cursor&&!busy&&area.isConnected;
  const rendered=window.DMRouteQuestions?.renderTask({tip:'teach',k:cards[0],l:cards},area,{
   en:c=>c?.en||'',tr:c=>c?.tr||'',pool:cards,shuffle:values=>values,
   speak:english=>{if(current()){window.dmRoutePracticeFlight?.prepare();speech(english,'en-US');}},
   answer:()=>{if(current())void startQuestions();},current
  });
  if(!rendered){area.innerHTML='<p class="ml-hint">Kelime kartları yüklenemedi. Tekrar dene.</p>';actions.innerHTML='<button type="button" class="ml-primary">Tekrar dene</button>';actions.querySelector('button').onclick=render;return;}
  area.querySelector('.bz-etiket')?.remove();
  const start=area.querySelector('.rq-teach-start');start.classList.add('ml-primary');actions.replaceChildren(start);
  scheduleLessonFit();
  return;
 }

 // Papi's mistake: one illustrated clue at a time, preserving the graded match slot.
 if(task.kind==='match'&&task.visualMatch===true&&task.pairs?.length){
  modal.dataset.taskKind='choice';modal.dataset.schoolShort='false';
  area.querySelector('.ml-eyebrow').textContent="Papi'nin Hatası";
  const pairs=task.pairs,ticket=epoch,cursor=session.cursor,matched=[];
  const current=()=>ticket===epoch&&!!modal&&identity()===owner&&session.cursor===cursor&&area.isConnected&&!busy&&!accepted;
  const order=optionOrder('papi-error-clues',pairs);
  const firstTrue=optionOrder('papi-error-first',[true,false])[0]===0;
  const bank=[...pairs,...(chapter.cards||[]),...(chapter.examples||[]),...(chapter.reference||[])];
  const fallback=[{en:'apple',tr:'elma'},{en:'book',tr:'kitap'},{en:'water',tr:'su'},{en:'school',tr:'okul'},{en:'friend',tr:'arkadaş'},{en:'bird',tr:'kuş'}];
  const stage=document.createElement('section');stage.className='ml-papi-error';area.append(stage);
  let index=0;
  function draw(){
   if(!current())return;
   const target=pairs[order[index]],seen=new Set([core.norm(target.en)]);
   const distractors=[...bank,...fallback].filter(w=>{
    if(!w?.en||!w?.tr||core.norm(w.tr)===core.norm(target.tr)||seen.has(core.norm(w.en)))return false;
    seen.add(core.norm(w.en));return true;
   }).map(w=>w.en);
   const alternatives=optionOrder('papi-error-distractors:'+index,distractors).map(i=>distractors[i]);
   const truth=alternatives.length===0||(index%2===0?firstTrue:!firstTrue);
   const guess=truth?target.en:alternatives[0];
   stage.innerHTML='<p class="ml-review-count">İpucu '+(index+1)+' / '+pairs.length+'</p>'+
    '<div class="ml-papi-error-picture" data-papi-picture role="img" aria-label="'+esc(target.tr)+'"></div>'+
    arenaHero('<p class="ml-papi-error-intro">Papi diyor ki…</p><h2 lang="en" data-papi-guess>'+esc(guess)+'</h2>','ml-papi-error-hero',index)+
    '<div class="ml-choices ml-papi-error-vote"><button type="button" data-papi-vote="true">✓ Doğru söylüyor!</button><button type="button" data-papi-vote="false">✕ Papi yanılıyor!</button></div>'+
    '<p class="ml-review-note" role="status" aria-live="polite"></p>';
   bindMascotFallback(stage);
   const picture=stage.querySelector('[data-papi-picture]'),note=stage.querySelector('.ml-review-note');
   const fallbackText=()=>{if(!picture.isConnected)return;picture.textContent=target.tr;picture.classList.add('is-text-fallback');scheduleLessonFit();};
   const markup=art(target,true,true);
   if(markup){
    picture.innerHTML=markup;const img=picture.querySelector('img');if(img){img.alt='';img.addEventListener('error',fallbackText,{once:true});}
   }else if(window.DMWordImagePool?.resolve){
    picture.textContent='Görsel yükleniyor…';
    const timer=setTimeout(fallbackText,1800);
    Promise.resolve(window.DMWordImagePool.resolve(target.en,target.tr,512)).then(url=>{
     if(!picture.isConnected)return;
     if(!url){clearTimeout(timer);fallbackText();return;}
     const img=document.createElement('img');img.alt='';img.decoding='async';img.draggable=false;
     img.onload=()=>{clearTimeout(timer);if(picture.isConnected){picture.classList.remove('is-text-fallback');picture.replaceChildren(img);scheduleLessonFit();}};
     img.onerror=()=>{clearTimeout(timer);fallbackText();};img.src=url;
    }).catch(()=>{clearTimeout(timer);fallbackText();});
   }else fallbackText();
   const votes=[...stage.querySelectorAll('[data-papi-vote]')];
   actions.innerHTML='<button type="button" class="ml-primary" disabled>Devam et →</button>';
   const next=actions.querySelector('button');let phase='vote';
   const miss=(b,message)=>{b.disabled=true;b.classList.add('is-wrong');breakCombo();window.dmAnswerFeedback?.(false);note.textContent=message;};
   const solved=()=>{
    if(phase==='solved')return;phase='solved';matched.push({en:target.en,tr:target.tr});
    window.dmAnswerFeedback?.(true);note.textContent='✓ Harika! Papi öğrendi.';
    next.disabled=false;next.textContent=index+1===pairs.length?'Kontrol et →':'Sonraki ipucu →';
    next.onclick=()=>{if(!current()||phase!=='solved'||next.disabled)return;next.disabled=true;if(index+1===pairs.length){void submit(matched);return;}index++;draw();};
    scheduleLessonFit();
   };
   votes.forEach(b=>b.onclick=()=>{
    if(!current()||phase!=='vote'||b.disabled)return;
    if((b.dataset.papiVote==='true')!==truth){miss(b,'Tekrar düşün. Papi doğru mu söylüyor?');return;}
    votes.forEach(x=>x.disabled=true);b.classList.add('is-correct');
    if(truth){solved();return;}
    phase='correct';window.dmAnswerFeedback?.(true);
    note.textContent='Papi yanıldı! Doğru İngilizce karşılığı seç.';
    const values=[target.en,...alternatives.slice(0,3)],choices=stage.querySelector('.ml-papi-error-vote');
    choices.classList.add('ml-papi-error-corrections');
    choices.innerHTML=optionOrder('papi-error-correct:'+index,values).map(i=>'<button type="button" data-papi-correct="'+i+'" lang="en">'+esc(values[i])+'</button>').join('');
    const buttons=[...choices.querySelectorAll('button')];
    buttons.forEach(x=>x.onclick=()=>{
     if(!current()||phase!=='correct'||x.disabled)return;
     const value=values[+x.dataset.papiCorrect];speech(value,'en-US');
     if(core.norm(value)!==core.norm(target.en)){miss(x,'Bir daha dene!');return;}
     buttons.forEach(y=>y.disabled=true);x.classList.add('is-correct');solved();
    });scheduleLessonFit();
   });
   stage.querySelector('[data-papi-guess]').addEventListener('click',()=>{if(current())speech(guess,'en-US');});
   speech(guess,'en-US');scheduleLessonFit();
  }
  draw();return;
 }
 const visualTranslation=task.label==='Görselden hatırla'&&task.picture?.tr;
 const fillVisual=task.visualFill===true||['İfadeyi tamamla','Cümleyi tamamla','Duruma uygun söyle'].includes(task.label);
 if(task.kind!=='review')area.innerHTML+=arenaHero('<h2 '+(task.language==='en'?'lang="en"':'')+'>'+esc(visualTranslation||task.prompt)+'</h2>'+(task.support?'<p class="ml-support">'+esc(task.support)+'</p>':''));if(task.kind!=='review')bindMascotFallback(area);
 if(fillVisual){const pair=task.picture||dmLearningImagePair(task)||[...(chapter.cards||[]),...(chapter.examples||[])].find(p=>p.en&&p.tr&&String(task.explanation||'').includes(p.en+' — '+p.tr));const slot=area.querySelector('.ml-speech');if(pair&&slot){const markup=art(pair);if(markup)slot.insertAdjacentHTML('beforeend',markup);else void window.DMWordImagePool?.decorate(slot,pair.en,pair.tr,'learning');}}
 const audioArea=area.querySelector('.ml-speech')||area;
 if(task.audio&&!/_{2,}/.test(task.prompt||'')){const audioButton=speaker(task.audio);audioArea.prepend(audioButton);if(task.language==='en'&&task.prompt===task.audio)audioArea.classList.add('ml-wave-word');audioButton.playVoice();if(!voice)audioArea.insertAdjacentHTML('beforeend','<p class="ml-hint" lang="en">'+esc(task.audio)+'</p>');}

 // Cümleyi tamamla: yalnız İngilizce cümleyi okuyan buton kalır (Türkçe ikinci buton kaldırıldı).
 if(task.kind==='letters'&&task.en){const audioButton=speaker(task.en);audioArea.prepend(audioButton);audioButton.playVoice();}
 if(task.kind==='review'){
  const scope=identity()+'|'+chapter.id+'|'+session.cursor;
  if(finalReviewDraft?.scope!==scope)finalReviewDraft={scope,answers:[]};
  const answers=finalReviewDraft.answers;let index=answers.length,locked=false;const ticket=epoch,atCursor=session.cursor;
  const box=document.createElement('section');box.className='ml-final-review';area.append(box);
  const paint=()=>{if(index>=task.cards.length){box.innerHTML=arenaHero('<h2>Yanıtların hazır!</h2><p>Sonucunu görmek için cevaplarını kaydet.</p>')+'<p class="ml-review-count">'+task.cards.length+' / '+task.cards.length+' kart yanıtlandı</p>';actions.innerHTML='<button type="button" class="ml-primary" data-review-retry>Sonucu göster →</button>';actions.querySelector('button').onclick=()=>submit(answers);bindMascotFallback(box);return;}const card=task.cards[index];box.innerHTML='<p class="ml-review-count">Kart '+(index+1)+' / '+task.cards.length+'</p><div class="ml-review-track" aria-hidden="true">'+task.cards.map((_,i)=>'<span class="'+(i<index?'is-done':i===index?'is-current':'')+'">'+(i<index?'★':'✦')+'</span>').join('')+'</div>'+arenaHero('<h2 lang="en">'+esc(card.en)+'</h2>','ml-review-hero',index)+'<p class="ml-question-instruction">Türkçe karşılığını seç.</p><div class="ml-choices">'+optionOrder('review:'+index,card.options).map(i=>'<button type="button" data-review-choice="'+i+'">'+esc(card.options[i])+'</button>').join('')+'</div><p class="ml-review-note" role="status" aria-live="polite"></p>';
   bindMascotFallback(box);
   // Review cards change in place: always use the active English+Turkish pair.
   // Final translation cards intentionally contain no word image.
   const audioButton=speaker(card.en);box.querySelector('.ml-speech').prepend(audioButton);box.querySelector('.ml-speech').classList.add('ml-wave-word');audioButton.playVoice();scheduleLessonFit();modal.scrollTop=0;
   actions.innerHTML='';box.querySelectorAll('[data-review-choice]').forEach(b=>b.onclick=()=>{if(locked||busy)return;locked=true;b.classList.add('is-selected');b.setAttribute('aria-pressed','true');const answer=card.options[+b.dataset.reviewChoice],correct=answer===card.tr;answers.push(answer);
    box.querySelectorAll('[data-review-choice]').forEach(x=>{x.disabled=true;if(card.options[+x.dataset.reviewChoice]===card.tr)x.classList.add('is-correct');else if(x===b&&!correct)x.classList.add('is-wrong');});
    if(!correct)breakCombo(true);window.dmAnswerFeedback?.(correct);
    box.querySelector('.ml-review-note').textContent=correct?'✓ Harika!':'Yanlış cevap. Doğrusu: '+card.en+' — '+card.tr;
    const advanceCard=()=>{if(ticket!==epoch||!modal||session.cursor!==atCursor)return;index++;locked=false;if(index<task.cards.length){actions.innerHTML='';paint();box.querySelector('[data-review-choice]')?.focus();}else{actions.innerHTML='';void submit(answers);}};
    reportSnapshot({kind:'review',label:'Genel tekrar',prompt:card.en,options:card.options,answer:card.tr},answer,atCursor);feedback(correct?'✓ Doğru!':'Yanlış cevap. Doğrusu: '+card.tr,correct);if(!correct)modal.querySelector('.ml-feedback').classList.add('is-answer-wrong');const nextCard=()=>{if(ticket!==epoch||!modal||session.cursor!==atCursor)return;modal.querySelector('.ml-feedback').classList.remove('is-answer-wrong');feedback('');advanceCard();};if(correct)setTimeout(nextCard,650);else{manualNext(nextCard);const b=actions.querySelector('[data-next]');b.textContent='Öğrendim →';b.setAttribute('data-review-continue','');}

   });
  };paint();return;
 }
 if(task.kind==='letters'){
  const selected=task.missing.map(()=>null),wrap=document.createElement('section');wrap.className='ml-letter-puzzle';
  const groups=task.en.match(/\S+|\s+/g)||[];let position=0;
  const phrase=groups.map(group=>{const start=position;position+=group.length;if(/^\s+$/.test(group))return '<span class="ml-letter-space" aria-hidden="true"></span>';return '<span class="ml-letter-word">'+[...group].map((ch,j)=>{const slot=task.missing.indexOf(start+j);return slot<0?'<span class="ml-letter-fixed">'+esc(ch)+'</span>':'<button type="button" class="ml-letter-gap" data-letter-slot="'+slot+'" aria-label="'+(slot+1)+'. eksik harf">_</button>';}).join('')+'</span>';}).join('');
  wrap.innerHTML='<p class="ml-question-instruction">'+task.missing.length+' eksik harfi tamamla.</p><div class="ml-letter-line" aria-label="Eksik harfli ifade" lang="en">'+phrase+'</div><div class="ml-letter-bank">'+optionOrder('letters',task.tokens).map(i=>'<button type="button" data-letter-token="'+i+'" aria-label="'+esc(task.tokens[i])+' harfi">'+esc(task.tokens[i])+'</button>').join('')+'</div><p class="ml-hint">Harf seçmek için dokun. Değiştirmek için doldurduğun kutuya dokun.</p>';
  area.append(wrap);actions.innerHTML='<button type="button" data-letter-clear>Temizle</button><button type="button" class="ml-primary" data-letter-check disabled>Kontrol et</button>';
  const sync=()=>{wrap.querySelectorAll('[data-letter-slot]').forEach(b=>{const n=+b.dataset.letterSlot,token=selected[n],filled=token!==null,letter=filled?task.tokens[token]:null,correct=filled&&letter.toLocaleLowerCase('en')===task.en[task.missing[n]].toLocaleLowerCase('en');b.textContent=filled?letter:'_';b.classList.toggle('is-filled',filled);b.classList.toggle('ml-live-correct',correct);b.classList.toggle('ml-live-wrong',filled&&!correct);b.setAttribute('aria-label',(n+1)+'. eksik harf'+(filled?(correct?', doğru: ':', yanlış: ')+letter+'; değiştirmek için dokun':''));});wrap.querySelectorAll('[data-letter-token]').forEach(b=>b.disabled=selected.includes(+b.dataset.letterToken));actions.querySelector('[data-letter-check]').disabled=selected.some(x=>x===null);};
  wrap.querySelectorAll('[data-letter-token]').forEach(b=>b.onclick=()=>{const slot=selected.indexOf(null);if(slot<0||busy||accepted)return;selected[slot]=+b.dataset.letterToken;const good=task.tokens[selected[slot]].toLowerCase()===task.en[task.missing[slot]].toLowerCase();if(!good)breakCombo();window.dmAnswerFeedback?.(good,'letter');sync();});
  wrap.querySelectorAll('[data-letter-slot]').forEach(b=>b.onclick=()=>{if(busy||accepted)return;selected[+b.dataset.letterSlot]=null;sync();});
  actions.querySelector('[data-letter-clear]').onclick=()=>{selected.fill(null);sync();};actions.querySelector('[data-letter-check]').onclick=()=>{if(selected.some(x=>x===null))return;const value=[...task.en];task.missing.forEach((p,i)=>value[p]=task.tokens[selected[i]]);submit(value.join(''));};
 }
 if(task.kind==='choice'){const choices=document.createElement('div');choices.className='ml-choices';choices.innerHTML=optionOrder('choice',task.options).map(i=>'<button type="button" data-answer="'+i+'" aria-pressed="false">'+esc(task.options[i])+'</button>').join('');area.append(choices);let chosen=null;const buttons=[...choices.querySelectorAll('button')];if(buttons.length===3)choices.classList.add('ml-three-choices');actions.innerHTML='<button type="button" class="ml-primary" disabled>Kontrol et →</button>';const check=actions.querySelector('button');buttons.forEach(b=>b.onclick=()=>{if(busy||accepted)return;chosen=b;buttons.forEach(x=>{x.classList.toggle('is-selected',x===b);x.setAttribute('aria-pressed',String(x===b));x.style.setProperty('border-color',x===b?'#2687e8':'','important');x.style.setProperty('background',x===b?'#e1f1ff':'','important');x.style.setProperty('color',x===b?'#145ca8':'','important');});check.disabled=false;if(task.language!=='en')speech(task.options[+b.dataset.answer]);});check.onclick=()=>{if(chosen){buttons.forEach(x=>['border-color','background','color'].forEach(p=>x.style.removeProperty(p)));submit(task.options[+chosen.dataset.answer],chosen,{alreadySpoken:true});}};}
 if(task.kind==='match'){
  let selected=null,matched=[],wrong=null,wrongTimer;const done=new Set(),pairs=task.pairs,visual=task.visualMatch===true;
  const wrap=document.createElement('div');wrap.className='ml-matches ml-linked-match'+(visual?' ml-visual-match':'');
  wrap.innerHTML='<div>'+optionOrder('match-left',pairs).map(i=>'<button type="button" data-left="'+i+'" lang="'+(visual?'tr':'en')+'" aria-label="'+(visual?esc(pairs[i].tr):'Listen '+(i+1))+'">'+(visual?'<span class="ml-visual-art" style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;overflow:hidden">'+(art(pairs[i],true,true)||'<span class="ml-visual-fallback">'+esc(pairs[i].tr)+'</span>')+'</span>':'<span class="ml-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>')+'</button>').join('')+'</div><div>'+optionOrder('match-right',pairs).map(i=>'<button type="button" data-right="'+i+'" lang="'+(visual?'en':'tr')+'">'+esc(visual?pairs[i].en:pairs[i].tr)+'</button>').join('')+'</div><svg class="ml-match-lines" aria-hidden="true"></svg>';
  area.append(wrap);
  if(visual){
   wrap.querySelectorAll('[data-left]').forEach(b=>{
    const pair=pairs[+b.dataset.left],slot=b.querySelector('.ml-visual-art');
    // Never show an unrelated picture: an unavailable asset keeps its Turkish fallback.
    if(!slot.querySelector('.ml-art'))void window.DMWordImagePool?.resolve(pair.en,pair.tr,256).then(url=>{
     if(!url||!slot.isConnected)return;
     const img=document.createElement('img');img.alt=pair.tr;img.loading='eager';img.decoding='async';img.className='ml-visual-picture';img.style.cssText='width:100%;height:100%;object-fit:contain;pointer-events:none';
     img.onload=()=>{if(slot.isConnected){slot.replaceChildren(img);scheduleLessonFit();}};img.src=url;
    }).catch(()=>{});
   });
  }
  // Ordinary listening matches remain audio-only.
  wrap.style.setProperty('position','relative','important');wrap.style.setProperty('display','grid','important');wrap.style.setProperty('grid-template-columns','minmax(0,1fr) minmax(0,1fr)','important');wrap.style.setProperty('column-gap',visual?'clamp(20px,6vw,42px)':'clamp(44px,12vw,100px)','important');
  const svg=wrap.querySelector('svg');wrap.style.setProperty('--match-rows',String(pairs.length));
  function fitTranslations(){wrap.querySelectorAll('[data-right]').forEach(b=>{b.style.removeProperty('font-size');let size=parseFloat(getComputedStyle(b).fontSize);while(b.scrollHeight>b.clientHeight&&size>10){size-=.5;b.style.setProperty('font-size',size+'px','important');}});}
  fitTranslations();
  actions.innerHTML='<button type="button" class="ml-primary" disabled>Kontrol et →</button>';
  const next=actions.querySelector('button'),left=i=>wrap.querySelector('[data-left="'+i+'"]'),right=i=>wrap.querySelector('[data-right="'+i+'"]');
  function draw(){
   if(!wrap.isConnected)return;
   const bounds=wrap.getBoundingClientRect();svg.setAttribute('viewBox','0 0 '+bounds.width+' '+bounds.height);svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;overflow:visible;';svg.replaceChildren();
   const line=(a,b,bad)=>{const l=left(a).getBoundingClientRect(),r=right(b).getBoundingClientRect(),x=l.right-bounds.left,y=l.top+l.height/2-bounds.top,X=r.left-bounds.left,Y=r.top+r.height/2-bounds.top,m=(x+X)/2;const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d','M '+x+' '+y+' C '+m+' '+y+' '+m+' '+Y+' '+X+' '+Y);p.setAttribute('class',bad?'ml-link-bad':'ml-link-good');p.setAttribute('fill','none');p.setAttribute('stroke',bad?'#ef4444':'#22c55e');p.setAttribute('stroke-width','4');p.setAttribute('stroke-linecap','round');svg.append(p);};
   done.forEach(i=>line(i,i,false));if(wrong)line(wrong[0],wrong[1],true);
   next.setAttribute('aria-label','Kontrol et, '+done.size+' / '+pairs.length+' eşleştirme');next.disabled=done.size!==pairs.length;next.style.opacity=next.disabled?'.45':'';
  }
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{fitTranslations();draw();}):null;observer?.observe(wrap);
  const cleanup=new MutationObserver(()=>{if(!wrap.isConnected){observer?.disconnect();cleanup.disconnect();clearTimeout(wrongTimer);}});cleanup.observe(modal,{childList:true,subtree:true});
  wrap.querySelectorAll('[data-left]').forEach(b=>b.onclick=()=>{if(busy||accepted)return;const i=+b.dataset.left;wrap.querySelectorAll('[data-left]').forEach(x=>x.classList.remove('is-playing'));if(!visual){b.classList.add('is-playing');speech(pairs[i].en,'en-US',()=>b.classList.remove('is-playing'));}if(done.has(i))return;selected=i;wrap.querySelectorAll('[data-left]').forEach(x=>x.classList.toggle('is-selected',x===b));});
  wrap.querySelectorAll('[data-right]').forEach(b=>b.onclick=()=>{if(busy||accepted||selected===null)return;const i=+b.dataset.right;if(done.has(i))return;clearTimeout(wrongTimer);wrong=null;if(i!==selected){wrong=[selected,i];breakCombo();window.dmAnswerFeedback?.(false);left(selected).classList.remove('is-selected');selected=null;draw();wrongTimer=setTimeout(()=>{wrong=null;draw();},650);return;}done.add(i);matched.push(pairs[i]);left(i).classList.remove('is-selected');left(i).classList.add('is-correct');b.classList.add('is-correct');b.disabled=true;selected=null;window.dmAnswerFeedback?.(true,'match');if(visual)speech(pairs[i].en);draw();});
  next.onclick=()=>{if(done.size===pairs.length)submit(matched);};draw();
 }
 if(task.kind==='order'){let parts=[];area.insertAdjacentHTML('beforeend','<div class="ml-sentence" aria-live="polite">Cümlen burada oluşacak.</div><div class="ml-tokens">'+optionOrder('tokens',task.tokens).map(i=>({s:task.tokens[i],i})).map(x=>'<button type="button" data-token="'+x.i+'">'+esc(x.s)+'</button>').join('')+'</div>');const sentence=area.querySelector('.ml-sentence');const sync=()=>{actions.querySelector('[data-check]').disabled=parts.length!==task.tokens.length;sentence.innerHTML=parts.length?parts.map((token,slot)=>{const correct=core.norm(task.tokens[token])===core.norm(task.tokens[slot]);return '<button type="button" class="ml-sentence-token '+(correct?'ml-live-correct':'ml-live-wrong')+'" data-placed-token="'+slot+'" aria-label="'+esc((correct?'Doğru yerde: ':'Yanlış yerde: ')+task.tokens[token]+'. Geri almak için dokun')+'">'+esc(task.tokens[token])+'</button>';}).join(' '):'Cümlen burada oluşacak.';area.querySelectorAll('[data-token]').forEach(b=>b.disabled=parts.includes(+b.dataset.token));sentence.querySelectorAll('[data-placed-token]').forEach(b=>b.onclick=()=>{if(busy||accepted)return;if(task.join!=='')speech(task.tokens[parts[+b.dataset.placedToken]]);parts.splice(+b.dataset.placedToken,1);sync();});};area.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{if(busy||accepted||parts.includes(+b.dataset.token))return;parts.push(+b.dataset.token);const good=core.norm(task.tokens[parts.at(-1)])===core.norm(task.tokens[parts.length-1]);if(!good)breakCombo();sync();if(task.join!=='')speech(task.tokens[parts.at(-1)]);else window.dmAnswerFeedback?.(good,'letter');});actions.innerHTML='<button type="button" data-clear>Yeniden sırala</button><button type="button" class="ml-primary" data-check disabled>Kontrol et</button>';actions.querySelector('[data-clear]').onclick=render;actions.querySelector('[data-check]').onclick=()=>{if(parts.length===task.tokens.length)submit(parts.map(i=>task.tokens[i]).join(task.join??' '));};}
 reference(area,[...chapter.cards,...chapter.examples,...(chapter.reference||[])].filter((c,i,a)=>a.findIndex(x=>x.en===c.en)===i));
}
function finish(){
 if(schoolBridge){const bridge=schoolBridge;bridge.finish(session);return;}
 if(!session.replay)document.dispatchEvent(new Event('dm:lesson-completed'));
 modal.dataset.taskKind='complete';const area=modal.querySelector('.ml-task'),actions=modal.querySelector('.ml-actions'),reward=session.reward||{},xp=!session.replay?Number(reward.xp)||0:0,gold=!session.replay?Number(reward.gold)||0:0,stars=!session.replay&&Number.isInteger(reward.stars)?Math.max(0,Math.min(3,reward.stars)):0;
 // Durak yıldızı haritada gösterilir: en iyi sonuç öğrencinin kaydında tutulur.
 try{if(stars&&typeof yo!=='undefined'&&yo&&chapter?.id){yo.mlYildiz=yo.mlYildiz||{};if(stars>(Number(yo.mlYildiz[chapter.id])||0)){yo.mlYildiz[chapter.id]=stars;if(typeof yoKaydet==='function')yoKaydet();}}}catch{}
 area.innerHTML='<div class="ml-complete"><div class="ml-result-sparks" aria-hidden="true">'+Array.from({length:14},(_,i)=>'<i style="--i:'+i+'"></i>').join('')+'</div><div class="ml-result-mascot">'+(window.DMPapi?'<span class="dm-papi-host ml-result-papi">'+window.DMPapi.html(window.DMPapi.resultMood({yildiz:stars||0,dogru:Number(session.firstAttempt?.correct)||0,yanlis:Math.max(0,questionsFor()-(Number(session.firstAttempt?.correct)||0))}),'Papi',{tap:true,ms:3600,then:'mutlu'})+'</span>':'<img src="papi-reward-v2.png" alt="Kutlayan Papi">')+'</div><p class="ml-eyebrow">'+(session.replay?'TEKRAR TAMAMLANDI':chapter.themeFinal?'TEMA TAMAMLANDI':'BÖLÜM TAMAMLANDI')+'</p><h2>'+esc(chapter.topicTitle)+'</h2>'+(Number.isInteger(reward.fairPercent)?'<p class="ml-result-fair">İlk deneme: '+esc(session.firstAttempt?.correct??'—')+' / '+questionsFor()+' doğru · Ödül oranı %'+reward.fairPercent+(reward.fairTier==='recovery'?' · Pekiştirerek tamamlandı':'')+'</p>':'')+(stars?'<div class="ml-result-stars" aria-label="'+stars+' yıldız">'+Array.from({length:3},(_,i)=>'<span class="'+(i<stars?'is-earned':'')+'" style="--i:'+i+'" aria-hidden="true">★</span>').join('')+'</div>':'')+'<p class="ml-result-message">'+(session.replay?'Tekrar ederek bilgini güçlendirdin!':'Harika! Öğrenme yolunda bir adım daha attın.')+'</p><div class="ml-result-stats"><span>✓ '+questionsFor()+' soru tamamlandı</span><span>📚 '+chapter.cards.length+' ifade tekrarlandı</span></div>'+((xp||gold)?'<div class="ml-result-rewards">'+(xp?'<div><span>⭐</span><b>+'+xp+'</b><small>Kazanılan XP</small></div>':'')+(gold?'<div><span>🪙</span><b>+'+gold+'</b><small>Kazanılan altın</small></div>':'')+'</div>'+(Number.isFinite(Number(session.firstAttempt?.correct))&&questionsFor()?'<div class="ml-result-acc"><span>🎯</span><b>%'+Math.round(Math.max(0,Math.min(1,Number(session.firstAttempt.correct)/questionsFor()))*100)+'</b><small>Doğruluk</small></div>':''):'<p class="ml-result-replay">'+(session.replay?'Bu tekrar turunda ek ödül verilmez.':'Öğrendiklerin seninle!')+'</p>')+'<p class="ml-result-words" lang="en">'+esc(chapter.cards.map(c=>c.en).join(' · '))+'</p></div>';
 const following=data.chapters[chapter.routeNumber],levelEnd=!following||!selectedStart&&following.cefr!==chapter.cefr;
 actions.innerHTML='<button type="button" data-list>Öğrenme yolum</button><button type="button" class="ml-primary" data-next-lesson>'+(levelEnd?'Başarımı kutla 🎉':'Sonraki bölüm →')+'</button>';
 actions.querySelector('[data-list]').onclick=()=>{close();if(!document.getElementById('mlThemeList'))openAll();};actions.querySelector('[data-next-lesson]')?.addEventListener('click',()=>{if(levelEnd){close();if(window.dmGraduations)window.dmGraduations.check(true);else openAll();}else open(following.id);});loadedAt=0;window.dmPapiFirstPractice?.complete('independent');scheduleLessonFit();
}
async function startHere(id){
 const at=identity();await curriculum();await status();id=Number(id);
 if(identity()!==at||!data.chapters.some(c=>c.id===id))return false;
 await api('startHere',{chapter:id});
 if(identity()!==at)return false;
 loadedAt=0;await status(true);
 if(identity()!==at)return false;
 document.dispatchEvent(new CustomEvent('dm:learning-start-changed',{detail:{chapter:id}}));
 return open(id);
}
const API={overview,open,openSchool,close,openAll,startHere,continueRoute:async()=>{await status();return open(next().id);},mount:()=>{},gender:()=> 'neutral',curriculum,mascotAt};window.dmThematicLearning=API;
document.addEventListener('dm:login',()=>{close(true);owner='';progress=[];loadedAt=0;economy={energy:null,energyMax:25,gold:null,combo:0};progressRevision++;lastComboReward='';document.getElementById('mlThemeList')?.remove();});
window.addEventListener('resize',scheduleLessonFit);window.visualViewport?.addEventListener('resize',scheduleLessonFit);document.fonts?.ready?.then(scheduleLessonFit);
setInterval(()=>{if(modal&&identity()!==owner)close(true);},1000);
})();
