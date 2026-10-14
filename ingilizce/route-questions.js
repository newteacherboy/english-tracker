/* Approved text/audio route panels. Vocabulary comes from the current route only. */
(function(root){'use strict';
if(typeof document!=='undefined'&&!document.getElementById('rq-forest-reference-style')){const link=document.createElement('link');link.id='rq-forest-reference-style';link.rel='stylesheet';link.href='route-forest-reference.css?v=20261014-1';document.head.append(link);}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const TYPES=['teach','hatirla','soyle','dinleSec','eslestir','eksik','lab','wordOrder','patternOrder','patternComplete','patternListen','patternTranslate'];
const titles={teach:'Dinle ve öğren',hatirla:'İngilizcesini seç',soyle:'Dinle ve söyle',dinleSec:'Dinle ve seç',eslestir:'Anlamları eşleştir',eksik:'Eksik harfi tamamla',lab:'Türkçesini seç',wordOrder:'Kelimeleri sıraya koy',patternOrder:'İfadeyi sıraya koy',patternComplete:'Eksik kelimeyi tamamla',patternListen:'İfadeyi dinle ve seç',patternTranslate:'Anlamından bul',sesliFinal:'Kelime kartları'};
let recognition=null,recognitionTimer=null;
function cancelSpeech(){clearTimeout(recognitionTimer);try{recognition?.abort()}catch{}recognition=null;}
function choices(word,pool,read,shuffle,count=3){return shuffle([read(word),...shuffle(pool.filter(x=>norm(read(x))!==norm(read(word)))).map(read).filter((x,i,a)=>a.indexOf(x)===i).slice(0,count-1)]);}
function sentence(word,pool,read){const target=norm(read(word));return pool.find(x=>norm(read(x)).split(' ').length>1&&(' '+norm(read(x))+' ').includes(' '+target+' '))||word;}
function renderTask(s,area,c){
 area.dataset.rqKind=s.tip;if(s.k){area.dataset.rqEn=c.en(s.k);area.dataset.rqTr=c.tr(s.k);}
 if(s.tip==='eksik'&&c.en(s.k).length>20)return renderTask({...s,tip:'patternComplete'},area,c);
 if(!['teach','soyle','dinleSec','wordOrder','patternOrder','patternComplete','patternListen','patternTranslate'].includes(s.tip))return false;
 cancelSpeech();const {en,tr,pool,shuffle,speak,answer,current}=c;const text=en(s.k),meaning=tr(s.k);
 const put=html=>{const progress=area.querySelector('.rq-progress');area.innerHTML='<div class="bz-etiket" data-rq-title="1">'+titles[s.tip]+'</div>'+html;if(progress)area.prepend(progress)};
 const button=(label,fn,cls='bz-btn')=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=()=>{if(current())fn(b)};return b;};
 const audio=value=>{const b=button('Tekrar dinle',()=>speak(value),'bz-ses rq-listen');b.innerHTML='<span aria-hidden="true" class="rq-speaker-disc"></span><small>Tekrar dinle</small>';b.setAttribute('aria-label','Tekrar dinle');return b;};
 const select=(values,expected)=>{const box=document.createElement('div');box.className='bz-secenekler';for(const value of values){const b=button(value,()=>{const good=norm(value)===norm(expected);box.querySelectorAll('button').forEach(x=>{x.disabled=true;if(norm(x.textContent)===norm(expected))x.classList.add('dogru')});if(!good)b.classList.add('yanlis');answer(good,expected)},'bz-sec');box.append(b)}area.append(box)};
 if(s.tip==='teach'){
  const words=s.l||[s.k];let i=0;
  const draw=()=>{if(!current())return;const w=words[i];put('<div class="rq-teach-progress">'+(i+1)+' / '+words.length+'</div><div class="bz-soru" lang="en">'+esc(en(w))+'</div><div class="bz-tr-anlam">'+esc(tr(w))+'</div>');area.append(audio(en(w)),button(i+1<words.length?'Sonraki kelime →':'Öğrendim, devam et →',()=>{if(++i<words.length)draw();else answer(true,'Kelimeleri öğrendin')}));speak(en(w))};draw();return true;
 }
 if(s.tip==='soyle'){
  put('<div class="bz-soru" lang="en">'+esc(text)+'</div><div class="bz-tr-anlam">'+esc(meaning)+'</div>');area.append(audio(text));
  const status=document.createElement('p');status.className='rq-mic-status';status.setAttribute('role','status');status.textContent='Mikrofona dokun ve söyle.';
  const fallback=document.createElement('div');fallback.className='rq-speech-fallback';fallback.hidden=true;
  const values=choices(s.k,pool,en,shuffle);values.forEach(value=>fallback.append(button(value,()=>{if(norm(value)===norm(text)){cancelSpeech();answer(true,text)}else{c.feedback(false);status.textContent='Tekrar dene.'}},'bz-sec')));
  const fail=message=>{if(!current())return;cancelSpeech();mic.disabled=false;mic.classList.remove('listening');fallback.hidden=false;status.textContent=message+' Aşağıdan duyduğun kelimeyi seç.';};
  const mic=button('🎤',()=>{cancelSpeech();const SR=root.SpeechRecognition||root.webkitSpeechRecognition;if(!SR)return fail('Mikrofon desteklenmiyor.');mic.disabled=true;mic.classList.add('listening');status.textContent='Seni dinliyorum…';let received=false;const r=recognition=new SR();r.lang='en-US';r.continuous=false;r.interimResults=false;r.maxAlternatives=3;
   r.onresult=e=>{if(!current())return;received=true;const results=Array.from(e.results?.[0]||[]).map(x=>x.transcript);if(results.some(v=>norm(v)===norm(text))){cancelSpeech();answer(true,text)}else{c.feedback(false);fail('Duyduğum kelime eşleşmedi.')}};
   r.onerror=()=>{received=true;fail('Ses alınamadı.')};r.onend=()=>{if(!received)fail('Ses algılanmadı.')};try{r.start();recognitionTimer=setTimeout(()=>fail('Dinleme süresi doldu.'),8000)}catch{fail('Mikrofon açılamadı.')}
  },'rq-microphone');mic.setAttribute('aria-label','Mikrofona konuş');area.append(mic,status,fallback);speak(text);return true;
 }
 const phrase=sentence(s.k,pool,en),full=en(phrase),translation=tr(phrase);if(s.tip.startsWith('pattern')||s.tip==='wordOrder'){area.dataset.rqEn=full;area.dataset.rqTr=translation;}
 if(s.tip==='wordOrder'||s.tip==='patternOrder'){
  const multi=full.trim().split(/\s+/).filter(Boolean),letters=multi.length<2,tokens=letters?Array.from(full):multi,join=letters?'':' ';let picked=[];
  put('<div class="bz-soru">'+esc(translation)+'</div><div class="rq-built" aria-live="polite"></div><div class="rq-token-pool"></div>');
  if(letters)area.querySelector('.bz-etiket').textContent='Harflerle kelimeyi kur';
  const built=area.querySelector('.rq-built'),tray=area.querySelector('.rq-token-pool');shuffle(tokens.map((value,id)=>({value,id}))).forEach(t=>tray.append(button(t.value,b=>{if(norm(t.value)!==norm(tokens[picked.length])){b.classList.add('yanlis');c.feedback(false);setTimeout(()=>b.classList.remove('yanlis'),450);return}picked.push(t.value);b.disabled=true;const tile=document.createElement('span');tile.className='rq-token-correct';tile.textContent=t.value;built.append(tile);c.feedback(true);if(picked.length===tokens.length)answer(true,picked.join(join))},'bz-cip2')));area.append(audio(full));return true;
 }
 if(s.tip==='patternComplete'){
  const parts=full.trim().split(/\s+/),at=parts.length>1?parts.length-1:0,expected=parts[at];put('<div class="bz-soru">'+esc(parts.map((v,i)=>i===at?'___':v).join(' '))+'</div><div class="bz-tr-anlam">'+esc(translation)+'</div>');
  const distractors=shuffle(pool.flatMap(x=>en(x).split(/\s+/))).filter(x=>norm(x)!==norm(expected));select(shuffle([expected,...[...new Set(distractors)].slice(0,2)]),expected);return true;
 }
 if(s.tip==='dinleSec'||s.tip==='patternListen'){const w=s.tip==='patternListen'?phrase:s.k;put('');area.append(audio(en(w)));select(choices(w,pool,en,shuffle),en(w));speak(en(w));return true;}
 put('<div class="bz-soru">'+esc(translation)+'</div>');select(choices(phrase,pool,en,shuffle),full);return true;
}
let watchedRoot=null,layoutObserver=null,layoutFrame=0;
function fitRoute(){layoutFrame=0;const r=watchedRoot;if(!r?.isConnected)return;const area=r.querySelector('.ds-task')||r.querySelector('#bzAlan');if(!area)return;if(r.id==='bzPerde')area.querySelectorAll('.bz-btn').forEach(b=>{if(b.textContent.startsWith('Devam →'))b.textContent=b.textContent.replace('Devam →','Devam et →')});const feedback=r.querySelector('.bz-geri-bildirim')||r.querySelector('.ds-feedback.correct');if(feedback&&area.dataset.rqEn&&area.dataset.rqTr&&area.dataset.rqKind!=='teach'){const text=(feedback.classList.contains('kotu')?'✕ Doğru cevap: ':'✓ Doğru! ')+area.dataset.rqEn+' = '+area.dataset.rqTr;if(feedback.textContent!==text)feedback.textContent=text;}r.classList.remove('rq-compact','rq-tight');if(area.scrollHeight>area.clientHeight+2)r.classList.add('rq-compact');if(area.scrollHeight>area.clientHeight+2)r.classList.add('rq-tight');}
function scheduleFit(){if(!layoutFrame)layoutFrame=requestAnimationFrame(fitRoute);}
function watchLayout(r){if(watchedRoot!==r){layoutObserver?.disconnect();watchedRoot=r;if(typeof MutationObserver==='function'){layoutObserver=new MutationObserver(scheduleFit);layoutObserver.observe(r,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});}}scheduleFit();}
if(typeof root.addEventListener==='function'){root.addEventListener('resize',scheduleFit);root.visualViewport?.addEventListener('resize',scheduleFit);}
function hudHTML(combo,energy,gold,max=30){return '<img class="rq-papi" src="route-assets/papi-school.png" alt="Papi"><span class="rq-wallet" aria-label="Enerji"><span aria-hidden="true" class="rq-icon-energy">⚡</span> <b data-rq-energy>'+esc(energy)+'</b><small>/ '+esc(max)+'</small></span><span class="rq-wallet" aria-label="Altın"><span aria-hidden="true" class="rq-icon-coin">🪙</span> <b data-rq-gold>'+esc(gold)+'</b></span><span class="rq-wallet" aria-label="Tüy kombosu"><span aria-hidden="true" class="rq-icon-feather">🪶</span> <b data-rq-combo>'+esc(combo>0?(combo-1)%3+1:0)+'</b><small>/ 3</small></span>';}
function mountSchool(root,step,total,combo){root.classList.add('rq-approved');root.dataset.rqLastCombo=String(combo||0);watchLayout(root);const old=root.querySelector('.bz-oyun-ust');if(old){const close=old.querySelector('#bzCik'),review=old.querySelector('#bzGeriSoru');let hud=root.querySelector('.rq-hud');if(!hud){hud=document.createElement('header');hud.className='rq-hud';root.prepend(hud)}hud.innerHTML=hudHTML(combo,window.genelEnerjiKalan??'–',typeof yo!=='undefined'?yo.altin||0:0,window.genelEnerjiMax||30);const area=root.querySelector('#bzAlan');const bar=document.createElement('div');bar.className='rq-progress';bar.innerHTML='<span>'+step+' / '+total+'</span><div><i style="width:'+step/total*100+'%"></i></div>';if(review){review.className='rq-review';review.textContent=String(step).padStart(2,'0');review.setAttribute('aria-label','Önceki soruları gözden geçir');bar.prepend(review)}if(close){close.className='rq-close';bar.append(close)}area.prepend(bar)}const title=root.querySelector('.bz-etiket');if(title&&!title.dataset.rqTitle){const type=root.querySelector('[data-question-type]')?.dataset.questionType;title.textContent=titles[type]||title.textContent;}}
function updateSchool(root,combo){if(!root)return;const previous=Number(root.dataset.rqLastCombo||0);root.dataset.rqLastCombo=String(combo||0);if(root.id==='bzPerde'&&combo>previous&&combo%3===0)celebrate(root,0);const el=root.querySelector('[data-rq-combo]');if(el)el.textContent=combo>0?(combo-1)%3+1:0;const e=root.querySelector('[data-rq-energy]');if(e)e.textContent=window.genelEnerjiKalan??'–';}
function celebrate(root,gain){
 if(!root||gain<0)return;
 if(gain<1)return;
 const existing=root.querySelector('.rq-combo-burst');
 if(existing){if(gain>0)existing.querySelector('b').textContent='+'+Number(gain)+' enerji';return;}
 const el=document.createElement('div');el.className='rq-combo-burst';el.setAttribute('role','status');
 el.innerHTML='<strong>3 doğru üst üste!</strong><b>'+(gain>0?'+'+Number(gain)+' enerji':'Harika seri!')+'</b>';
 {
  const feathers=document.createElement('div');feathers.className='rq-feather-flight';feathers.setAttribute('aria-hidden','true');
  for(let i=0;i<8;i++){const f=document.createElement('span');f.className='rq-flying-feather';f.style.setProperty('--i',i);f.style.setProperty('--spin',(i%2?-1:1)*24+'deg');feathers.append(f);}
  el.append(feathers);root.classList.add('rq-combo-active');
 }
 root.append(el);setTimeout(()=>{el.remove();root.classList.remove('rq-combo-active');},2800);
}
function storyHud(modal,combo,close){modal.classList.add('rq-approved');watchLayout(modal);const header=modal.querySelector('.ds-lesson-header');if(!header)return;let hud=header.querySelector('.rq-hud');if(!hud){hud=document.createElement('div');hud.className='rq-hud';header.prepend(hud)}hud.innerHTML=hudHTML(combo,window.genelEnerjiKalan??'–',typeof yo!=='undefined'?yo.altin||0:0,window.genelEnerjiMax||30);let x=header.querySelector('.rq-close');if(!x){x=document.createElement('button');x.type='button';x.className='rq-close';x.setAttribute('aria-label','Kapat');x.textContent='✕';x.onclick=close;header.append(x)}x.disabled=!!window.dmPapiFirstPractice?.locked('independent');}
root.DMRouteQuestions={TYPES,titles,renderTask,mountSchool,updateSchool,celebrate,cancelSpeech};root.dmSelectedStoryHud=storyHud;
})(typeof window!=='undefined'?window:globalThis);
