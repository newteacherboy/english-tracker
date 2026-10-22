/* Approved text/audio route panels. Vocabulary comes from the current route only. */
(function(root){'use strict';
if(typeof document!=='undefined'&&!document.getElementById('rq-forest-reference-style')){const link=document.createElement('link');link.id='rq-forest-reference-style';link.rel='stylesheet';link.href='route-forest-reference.css?v=20261014-1';document.head.append(link);}
if(typeof document!=='undefined'&&!document.getElementById('dm-route-feedback-profile-style')){const link=document.createElement('link');link.id='dm-route-feedback-profile-style';link.rel='stylesheet';link.href='route-feedback-profile.css?v=20261014-1';document.head.append(link);}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const TYPES=['teach','hatirla','soyle','dinleSec','eslestir','eksik','lab','wordOrder','patternOrder','patternComplete','patternListen','patternTranslate'];
const titles={teach:'Dinle ve öğren',hatirla:'İngilizcesini seç',soyle:'Dinle ve söyle',dinleSec:'Dinle ve seç',eslestir:'Anlamları eşleştir',eksik:'Eksik harfi tamamla',lab:'Türkçesini seç',wordOrder:'Kelimeleri sıraya koy',patternOrder:'İfadeyi sıraya koy',patternComplete:'Eksik kelimeyi tamamla',patternListen:'İfadeyi dinle ve seç',patternTranslate:'Anlamından bul',sesliFinal:'Kelime kartları'};
let recognition=null,recognitionTimer=null;
function cancelSpeech(){clearTimeout(recognitionTimer);try{recognition?.abort()}catch{}recognition=null;}
// Rotate supporting matching words across all stops for this learner.
// The shuffled tie-break keeps a fresh pool random; least-recently-used words get priority.
const matchingHistory=new Map();
function matchingWords(target,pool,en,tr,shuffle,owner,count=4){
 const key='dm-route-matching-words-v1:'+encodeURIComponent(String(owner||'guest'));
 let history=matchingHistory.get(key);
 if(!history){try{history=JSON.parse(root.localStorage?.getItem(key)||'null')}catch{}if(!history||!Array.isArray(history.used))history={serial:0,used:[]};}
 const used=new Map(history.used),seenEn=new Set([norm(en(target))]),seenTr=new Set([norm(tr(target))]);
 const candidates=shuffle(pool.filter(w=>en(w)&&tr(w))).sort((a,b)=>(Number(used.get(norm(en(a))))||0)-(Number(used.get(norm(en(b))))||0));
 const result=[target];let serial=Number(history.serial)||0;
 for(const word of candidates){
  const e=norm(en(word)),t=norm(tr(word));if(seenEn.has(e)||seenTr.has(t))continue;
  if(result.length>=count)break;
  result.push(word);seenEn.add(e);seenTr.add(t);used.set(e,++serial);
 }
 history={serial,used:Array.from(used).sort((a,b)=>b[1]-a[1]).slice(0,2000)};matchingHistory.set(key,history);
 try{root.localStorage?.setItem(key,JSON.stringify(history))}catch{}
 return result;
}
// Seviye testinden B1 veya B2 alan öğrenciler için seçmeli sorular zorlaşır: 4 seçenek ve
// doğru cevaba uzunluk/ilk harf olarak benzeyen çeldiriciler.
function advancedLearner(){const s=root.dmProgression?.status?.();return ['B1','B2'].includes(String(s?.studyPlacementLevel||s?.startPath?.testLevel||'').toUpperCase());}
function choices(word,pool,read,shuffle,count){
 const hard=advancedLearner();count=count||(hard?4:3);const target=read(word),t=norm(target);
 let others=shuffle(pool.filter(x=>norm(read(x))!==t)).map(read).filter((x,i,a)=>a.indexOf(x)===i);
 if(hard){const score=x=>Math.abs(x.length-target.length)+(norm(x)[0]===t[0]?0:3);others=others.map((x,i)=>[x,score(x)+i*0.01]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]);}
 return shuffle([target,...others.slice(0,count-1)]);
}
function sentence(word,pool,read){const target=norm(read(word));return pool.find(x=>norm(read(x)).split(' ').length>1&&(' '+norm(read(x))+' ').includes(' '+target+' '))||word;}
// Konuşma sorusunda mikrofon yerine seçenekten verilen cevabın işareti (sunucu bunu ödülsüz sayar).
const ASSISTED='~yardim~';
function renderTask(s,area,c){
 area._rqSpeakEnglish=c.speak;
 if(s.tip==='eslestir')area.addEventListener('click',event=>{const b=event.target.closest?.('#bzMatchEn .dm-match-option');if(b&&!b.disabled&&c.current())c.speak(b.textContent.trim());},true);
 area.dataset.rqKind=s.tip;if(s.k){area.dataset.rqEn=c.en(s.k);area.dataset.rqTr=c.tr(s.k);}
 if(s.tip==='eksik'&&c.en(s.k).length>20)return renderTask({...s,tip:'patternComplete'},area,c);
 if(!['teach','soyle','dinleSec','wordOrder','patternOrder','patternComplete','patternListen','patternTranslate'].includes(s.tip))return false;
 cancelSpeech();const {en,tr,pool,shuffle,speak,answer,current}=c;const text=en(s.k),meaning=tr(s.k);
 const put=html=>{const progress=area.querySelector('.rq-progress');area.innerHTML='<div class="bz-etiket" data-rq-title="1">'+titles[s.tip]+'</div>'+html;if(progress)area.prepend(progress)};
 const button=(label,fn,cls='bz-btn')=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=()=>{if(current())fn(b)};return b;};
 const audio=value=>{const b=button('Tekrar dinle',()=>speak(value),'bz-ses rq-listen');b.innerHTML='<span aria-hidden="true" class="rq-speaker-disc"></span><small>Tekrar dinle</small>';b.setAttribute('aria-label','Tekrar dinle');return b;};
 const select=(values,expected)=>{const box=document.createElement('div');box.className='bz-secenekler';for(const value of values){const b=button(value,()=>{const good=norm(value)===norm(expected);box.querySelectorAll('button').forEach(x=>{x.disabled=true;if(norm(x.textContent)===norm(expected))x.classList.add('dogru')});if(!good)b.classList.add('yanlis');if(s.tip==='patternComplete')speak(area.querySelector('.bz-soru').textContent.replace(/_{2,}/g,value));answer(good,expected,value)},'bz-sec');box.append(b)}area.append(box)};
 if(s.tip==='teach'){
  const words=s.l||[s.k];let i=0;
  // Preserve legacy renderer in older game fixtures; new cards are school-route only.
  if(!root.dmSchoolJourney?.theme||root.dmLearningRoute?.purpose?.()!=='school'){
   const draw=()=>{if(!current())return;const w=words[i];put('<div class="rq-teach-progress">'+(i+1)+' / '+words.length+'</div><div class="bz-soru" lang="en">'+esc(en(w))+'</div><div class="bz-tr-anlam">'+esc(tr(w))+'</div>');area.append(audio(en(w)),button(i+1<words.length?'Sonraki kelime →':'Öğrendim, devam et →',()=>{if(++i<words.length)draw();else answer(true,'Kelimeleri öğrendin',true)}));speak(en(w))};draw();return true;
  }
  // Teach remains one verified question: cards are a preview, not four forced steps.
  // Audio only plays when a learner touches a word.
  put('<div class="dm-school-words" aria-label="Bu duraktaki kelimeler">'+words.map((word,n)=>
   '<button type="button" class="dm-school-word" data-rq-word="'+n+'" aria-label="'+esc(en(word))+' - '+esc(tr(word))+', dinle"><span><strong lang="en">'+esc(en(word))+'</strong><small>'+esc(tr(word))+'</small></span><span class="dm-school-word-listen">🔊 Dinle</span></button>').join('')+'</div>');
  area.querySelectorAll('[data-rq-word]').forEach(b=>b.onclick=()=>{if(current())speak(en(words[Number(b.dataset.rqWord)]));});
  let submitted=false;
  const go=button('Sorulara geç →',()=>{if(submitted)return;submitted=true;go.remove();area.querySelector('.dm-school-words')?.remove();answer(true,'Kelimeleri öğrendin',true);},'bz-btn mor dm-school-start-questions');
  area.append(go);
  return true
 }
 if(s.tip==='soyle'){
  put('<div class="bz-soru" lang="en">'+esc(text)+'</div><div class="bz-tr-anlam">'+esc(meaning)+'</div>');area.append(audio(text));
  const status=document.createElement('p');status.className='rq-mic-status';status.setAttribute('role','status');status.textContent='Mikrofona dokun ve söyle.';
  const fallback=document.createElement('div');fallback.className='rq-speech-fallback';fallback.hidden=true;
  const values=choices(s.k,pool,en,shuffle);values.forEach(value=>fallback.append(button(value,()=>{if(norm(value)===norm(text)){cancelSpeech();/* Seçerek geçilen konuşma sorusu ilerletir ama ödül ve kombo vermez; kelime Hatırlama Zamanı'na girer. */root.dmWrongWords?.add?.({en:text,tr:meaning,source:'konusma-yardim'});answer(true,text,ASSISTED+value)}else{c.record?.(value);c.feedback(false);status.textContent='Tekrar dene.'}},'bz-sec')));
  const fail=message=>{if(!current())return;cancelSpeech();mic.disabled=false;mic.classList.remove('listening');fallback.hidden=false;status.textContent=message+' Tekrar söyleyebilir ya da aşağıdan seçebilirsin; sesli söylersen tam ödül alırsın.';};
  const mic=button('🎤',()=>{cancelSpeech();const SR=root.SpeechRecognition||root.webkitSpeechRecognition;if(!SR)return fail('Mikrofon desteklenmiyor.');mic.disabled=true;mic.classList.add('listening');status.textContent='Seni dinliyorum…';let received=false;const r=recognition=new SR();r.lang='en-US';r.continuous=false;r.interimResults=false;r.maxAlternatives=3;
   r.onresult=e=>{if(!current())return;received=true;const results=Array.from(e.results?.[0]||[]).map(x=>x.transcript);if(results.some(v=>norm(v)===norm(text))){cancelSpeech();answer(true,text,results.join('|'))}else{c.record?.(results.join('|'));c.feedback(false);fail('Duyduğum kelime eşleşmedi.')}};
   r.onerror=()=>{received=true;fail('Ses alınamadı.')};r.onend=()=>{if(!received)fail('Ses algılanmadı.')};try{r.start();recognitionTimer=setTimeout(()=>fail('Dinleme süresi doldu.'),8000)}catch{fail('Mikrofon açılamadı.')}
  },'rq-microphone');mic.setAttribute('aria-label','Mikrofona konuş');area.append(mic,status,fallback);speak(text);return true;
 }
 const phrase=sentence(s.k,c.targetPool||pool,en),full=en(phrase),translation=tr(phrase);if(s.tip.startsWith('pattern')||s.tip==='wordOrder'){area.dataset.rqEn=full;area.dataset.rqTr=translation;}
 if(s.tip==='wordOrder'||s.tip==='patternOrder'){
  const multi=full.trim().split(/\s+/).filter(Boolean),letters=multi.length<2,tokens=letters?Array.from(full):multi,join=letters?'':' ';let picked=[];
  put('<div class="bz-soru">'+esc(translation)+'</div><div class="rq-built" lang="en" aria-live="polite"></div><div class="rq-token-pool" lang="en"></div>');
  if(letters)area.querySelector('.bz-etiket').textContent='Harflerle kelimeyi kur';
  const built=area.querySelector('.rq-built'),tray=area.querySelector('.rq-token-pool');shuffle(tokens.map((value,id)=>({value,id}))).forEach(t=>tray.append(button(t.value,b=>{if(norm(t.value)!==norm(tokens[picked.length])){c.record?.([...picked,t.value].join(join));b.classList.add('yanlis');c.feedback(false);setTimeout(()=>b.classList.remove('yanlis'),450);return}picked.push(t.value);b.disabled=true;const tile=document.createElement('span');tile.className='rq-token-correct';tile.textContent=t.value;built.append(tile);c.feedback(true);if(picked.length===tokens.length)answer(true,picked.join(join),picked.join(join))},'bz-cip2')));return true;
 }
 if(s.tip==='patternComplete'){
  const parts=full.trim().split(/\s+/),at=parts.length>1?parts.length-1:0,expected=parts[at];put('<div class="bz-soru">'+esc(parts.map((v,i)=>i===at?'___':v).join(' '))+'</div><div class="bz-tr-anlam">'+esc(translation)+'</div>');
  const distractors=shuffle(pool.flatMap(x=>en(x).split(/\s+/))).filter(x=>norm(x)!==norm(expected));select(shuffle([expected,...[...new Set(distractors)].slice(0,2)]),expected);speak(parts.map((v,i)=>i===at?'…':v).join(' '));return true;
 }
 if(s.tip==='dinleSec'||s.tip==='patternListen'){const w=s.tip==='patternListen'?phrase:s.k;put('');area.append(audio(en(w)));select(choices(w,pool,en,shuffle),en(w));speak(en(w));return true;}
 put('<div class="bz-soru">'+esc(translation)+'</div>');select(choices(phrase,pool,en,shuffle),full);return true;
}
let watchedRoot=null,layoutObserver=null,layoutFrame=0;
function fitRoute(){layoutFrame=0;const r=watchedRoot;if(!r?.isConnected)return;const area=r.querySelector('.ds-task')||r.querySelector('#bzAlan');if(!area)return;if(r.id==='bzPerde')area.querySelectorAll('.bz-btn').forEach(b=>{if(b.textContent.startsWith('Devam →'))b.textContent=b.textContent.replace('Devam →','Devam et →')});const feedback=r.querySelector('.bz-geri-bildirim')||r.querySelector('.ds-feedback.correct');const card=area.querySelector('.dm-final-current strong')?.textContent.trim();if(card&&area.dataset.rqSpokenCard!==card){area.dataset.rqSpokenCard=card;area._rqSpeakEnglish?.(card);}if(feedback&&area.dataset.rqEn&&area.dataset.rqTr&&area.dataset.rqKind!=='teach'){const text=(feedback.classList.contains('kotu')?'✕ Doğru cevap: ':'✓ Doğru! ')+area.dataset.rqEn+' = '+area.dataset.rqTr;if(feedback.textContent!==text)feedback.textContent=text;}offerEnergyAfterAnswer(r,area);r.classList.remove('rq-compact','rq-tight');if(area.scrollHeight>area.clientHeight+2)r.classList.add('rq-compact');if(area.scrollHeight>area.clientHeight+2)r.classList.add('rq-tight');}

/* Route-only energy refill: keep the answered question in place until the
   server confirms a purchase. The existing economy API remains authoritative. */
function offerEnergyAfterAnswer(route,area){
 if(route.id!=='bzPerde'||!route.querySelector('.bz-oyun'))return;
 const next=area.querySelector('.bz-btn.mor');
 if(!next||!(/⚡\s*[−-]1/.test(next.dataset.rqOriginal||next.textContent)))return;
 if(Number(root.genelEnerjiKalan)>0){
  if(next.dataset.rqOriginal){next.textContent=next.dataset.rqOriginal;delete next.dataset.rqOriginal;}
  return;
 }
 if(!area.querySelector('.bz-geri-bildirim'))return;
 if(!next.dataset.rqOriginal)next.dataset.rqOriginal=next.textContent;
 if(next.textContent!=='⚡ Enerji al ve devam et')next.textContent='⚡ Enerji al ve devam et';
 const step=route.querySelector('.rq-progress span')?.textContent.trim()||'';
 const question=area.querySelector('.bz-soru')?.textContent.trim()||'';
 const key=step+'|'+question;
 if(route.dataset.rqEnergyOffered===key)return;
 route.dataset.rqEnergyOffered=key;
 setTimeout(()=>{
  if(route.isConnected&&next.isConnected&&Number(root.genelEnerjiKalan)===0
      &&!document.querySelector('.sa-perde[aria-label="Enerji paketleri"]')){
   root.genelEnerjiBittiGoster?.();
  }
 },300);
}
if(typeof document!=='undefined')document.addEventListener('click',async event=>{
 const buy=event.target?.closest?.('.sa-perde[aria-label="Enerji paketleri"] .dm-energy-buy');
 if(!buy||!document.querySelector('#bzPerde .bz-oyun'))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(buy.disabled)return;
 const original=buy.textContent;
 buy.disabled=true;buy.textContent='⏳ Satın alınıyor…';
 let paid=false;
 try{paid=await root.enerjiPaketiAl?.(Number(buy.dataset.amount))===true;}
 catch{root.yoToast?.('Enerji alınamadı. Lütfen tekrar dene.');}
 if(!paid){buy.disabled=false;buy.textContent=original;return;}
 buy.closest('.sa-perde')?.remove();
 const next=document.querySelector('#bzPerde #bzAlan .bz-btn.mor');
 if(next&&Number(root.genelEnerjiKalan)>0){
  if(next.dataset.rqOriginal){next.textContent=next.dataset.rqOriginal;delete next.dataset.rqOriginal;}
  next.click(); // same saved question, then the normal server-verified energy step
 }
},true);

function scheduleFit(){if(!layoutFrame)layoutFrame=requestAnimationFrame(fitRoute);}
function watchLayout(r){if(watchedRoot!==r){layoutObserver?.disconnect();watchedRoot=r;if(typeof MutationObserver==='function'){layoutObserver=new MutationObserver(scheduleFit);layoutObserver.observe(r,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});}}scheduleFit();}
if(typeof root.addEventListener==='function'){root.addEventListener('resize',scheduleFit);root.visualViewport?.addEventListener('resize',scheduleFit);}
function hudHTML(combo,energy,gold,max=30){return '<img class="rq-papi" src="route-assets/papi-school.webp" alt="Papi"><span class="rq-wallet" aria-label="Enerji"><span aria-hidden="true" class="rq-icon-energy">⚡</span> <b data-rq-energy>'+esc(energy)+'</b><small>/ '+esc(max)+'</small></span><span class="rq-wallet" aria-label="Altın"><span aria-hidden="true" class="rq-icon-coin">🪙</span> <b data-rq-gold>'+esc(gold)+'</b></span><span class="rq-wallet" aria-label="Tüy kombosu"><span aria-hidden="true" class="rq-icon-feather">🪶</span> <b data-rq-combo>'+esc(combo>0?(combo-1)%3+1:0)+'</b><small>/ 3</small></span>';}
// Three small dots under the progress line show the current correct streak (Kombo B).
function streakDots(combo){const n=combo>0?(combo-1)%3+1:0;return '<span class="rq-streak" aria-hidden="true">'+[1,2,3].map(i=>'<i class="'+(i<=n?'is-on':'')+(i===n&&combo>0?' is-new':'')+(n===3?' is-hot':'')+'"></i>').join('')+'</span>';}
function mountSchool(root,step,total,combo){root.classList.add('rq-approved');root.dataset.rqLastCombo=String(combo||0);watchLayout(root);const old=root.querySelector('.bz-oyun-ust');if(old){const close=old.querySelector('#bzCik'),review=old.querySelector('#bzGeriSoru');let hud=root.querySelector('.rq-hud');if(!hud){hud=document.createElement('header');hud.className='rq-hud';root.prepend(hud)}hud.innerHTML=hudHTML(combo,window.genelEnerjiKalan??'–',typeof yo!=='undefined'?yo.altin||0:0,window.genelEnerjiMax||30);const area=root.querySelector('#bzAlan');const bar=document.createElement('div');bar.className='rq-progress';bar.innerHTML='<span>'+step+' / '+total+'</span><div><i style="width:'+step/total*100+'%"></i></div>'+streakDots(combo);if(review){review.className='rq-review';review.textContent=String(step).padStart(2,'0');review.setAttribute('aria-label','Önceki soruları gözden geçir');bar.prepend(review)}if(close){close.className='rq-close';bar.append(close)}area.prepend(bar)}const title=root.querySelector('.bz-etiket');if(title&&!title.dataset.rqTitle){const type=root.querySelector('[data-question-type]')?.dataset.questionType;title.textContent=titles[type]||title.textContent;}}
function updateSchool(root,combo){if(!root)return;const previous=Number(root.dataset.rqLastCombo||0);root.dataset.rqLastCombo=String(combo||0);const el=root.querySelector('[data-rq-combo]');if(el)el.textContent=combo>0?(combo-1)%3+1:0;const dots=root.querySelector('.rq-streak');if(dots&&combo!==previous)dots.outerHTML=streakDots(combo);const e=root.querySelector('[data-rq-energy]'),next=window.genelEnerjiKalan??'–';if(e&&!e.dataset.dmCounting&&!(window.dmRewardFx&&Number(next)>Number(e.textContent)))e.textContent=next;}
function celebrate(root,gain,streak=3){
 const amount=Number(gain);if(!root||!Number.isFinite(amount)||amount<1)return;
 // Kombo B: a slim strip under the top bar and one shimmer on the progress line.
 if(window.dmRewardFx?.combo){window.dmRewardFx.combo(root,{streak,gain:amount});return;}
 window.yoToast?.(streak+' doğru üst üste! +'+amount+' enerji');
}
function storyHud(modal,combo,close){modal.classList.add('rq-approved');watchLayout(modal);const header=modal.querySelector('.ds-lesson-header');if(!header)return;let hud=header.querySelector('.rq-hud');if(!hud){hud=document.createElement('div');hud.className='rq-hud';header.prepend(hud)}hud.innerHTML=hudHTML(combo,window.genelEnerjiKalan??'–',typeof yo!=='undefined'?yo.altin||0:0,window.genelEnerjiMax||30);let x=header.querySelector('.rq-close');if(!x){x=document.createElement('button');x.type='button';x.className='rq-close';x.setAttribute('aria-label','Kapat');x.textContent='✕';x.onclick=close;header.append(x)}x.disabled=!!window.dmPapiFirstPractice?.locked('independent');}
root.DMRouteQuestions={ASSISTED,advancedLearner,TYPES,titles,matchingWords,renderTask,mountSchool,updateSchool,celebrate,cancelSpeech};root.dmSelectedStoryHud=storyHud;
})(typeof window!=='undefined'?window:globalThis);
