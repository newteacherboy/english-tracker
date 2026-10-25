/* Diji Medu | Cumle Yarisi. One-screen two-team classroom game; no student rewards. */
(function(){
'use strict';
if(window.dmSentenceRace)return;
var TOTAL=12, BASE=100, WRONG=40, DEFAULT_TIME=15;
var overlay=null,session=null,ticker=null,previousFocus=null;
function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function shuffle(input){var a=input.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=a[i];a[i]=a[j];a[j]=tmp;}return a;}
function bank(){return (Array.isArray(window.masterKelimeHavuzu)?window.masterKelimeHavuzu:[]).map(function(w){return {en:clean(w.ingilizce||w.english||w.en),tr:clean(w.turkce||w.turkish||w.tr),cl:Number(w.sinif||w.class_no),unit:Number(w.unite||w.unit_no)};}).filter(function(w){return w.en&&w.tr&&w.cl>=1&&w.cl<=8&&Number.isInteger(w.unit)&&w.unit>=1&&w.unit<=25&&w.en.length<=100&&w.tr.length<=100&&/^[a-zA-Z]/.test(w.en);});}
function scope(items,cl,units){var set=new Set(units.map(Number));var seen=new Set();return items.filter(function(w){if(w.cl!==Number(cl)||!set.has(w.unit))return false;var k=w.en.toLocaleLowerCase('en')+'|'+w.tr.toLocaleLowerCase('tr');if(seen.has(k))return false;seen.add(k);return true;});}
function questionPool(items){
 var words=items.filter(function(w){return w.en.split(' ').length<=9;});
 var english=[...new Set(words.map(function(w){return w.en.toLocaleLowerCase('en');}))];
 var turkish=[...new Set(words.map(function(w){return w.tr.toLocaleLowerCase('tr');}))];
 if(english.length<3||turkish.length<3)return [];
 var out=[];
 function make(w,kind){
  var answer=kind===0?w.en:w.tr,source=kind===0?words.map(function(x){return x.en;}):words.map(function(x){return x.tr;});
  var wrongs=shuffle([...new Set(source.filter(function(x){return x.toLocaleLowerCase(kind===0?'en':'tr')!==answer.toLocaleLowerCase(kind===0?'en':'tr');}))]).slice(0,2);
  if(wrongs.length<2)return;
  var prompt=kind===0?'In English, “'+w.tr+'” is ___.':'In Turkish, “'+w.en+'” means ___.';
  var tip=kind===0?'Doğru İngilizce ifadeyi seç':'Doğru Türkçe anlamı seç';
  out.push({id:w.cl+'-'+w.unit+'-'+w.en+'-'+kind,prompt:prompt,tip:tip,answer:answer,choices:shuffle([answer].concat(wrongs)),kind:kind});
 }
 function contextual(w){
  if(w.en.split(' ').length!==1)return;
  var en=w.en.toLocaleLowerCase('en'),line='',answers=[];
  var forms={
    has:['She ___ a dog.','have','having'],
    have:['I ___ a pencil.','has','having'],
    go:['They ___ to school every day.','goes','going'],
    is:['She ___ a student.','am','are'],
    are:['They ___ students.','is','am'],
    am:['I ___ a student.','is','are'],
    like:['I ___ music.','likes','liking'],
    can:['I ___ swim.','cans','can to'],
    plays:['She ___ football after school.','play','playing'],
    play:['We ___ football after school.','plays','playing'],
    likes:['He ___ reading.','like','liking'],
    goes:['She ___ to school by bus.','go','going'],
    eats:['He ___ breakfast every morning.','eat','eating'],
    eat:['I ___ breakfast every morning.','eats','eating'],
    drink:['I ___ water every day.','drinks','drinking'],
    read:['I ___ books every day.','reads','reading'],
    write:['I ___ a letter.','writes','writing']
  };
  if(forms[en]){line=forms[en][0];answers=forms[en].slice(1);}
  else{
    var animals=new Set(['bird','cat','cow','dog','duck','elephant','fish','horse','lion','rabbit','sheep','turtle','monkey','bear','tiger','giraffe','zebra','penguin']);
    var stationery=new Set(['pen','pencil','ruler','book','notebook','eraser','desk','chair','bag','backpack','computer','table','dictionary']);
    var food=new Set(['apple','banana','orange','peach','pear','carrot','egg','lemon','grape']);
    var verbs=new Set(['run','walk','jump','swim','sing','dance','sleep','draw','listen','watch','open','close']);
    var feelings=new Set(['happy','sad','angry','tired','hungry','thirsty','scared','excited']);
    var colors=new Set(['red','blue','green','yellow','black','white','purple','pink','brown','orange']);
    var article=/^[aeiou]/.test(en)?'an':'a';
    if(animals.has(en))line='I can see '+article+' ___ in the picture.';
    else if(stationery.has(en))line='There is '+article+' ___ in the classroom.';
    else if(food.has(en))line='There is '+article+' ___ on the table.';
    else if(verbs.has(en))line='I can ___ in my free time.';
    else if(feelings.has(en))line='I feel ___ today.';
    else if(colors.has(en))line='The ball is ___.';
  }
  if(!line)return;
  var other=words.map(function(x){return x.en;}).filter(function(x){return x!==w.en&&!x.includes(' ');});
  if(!answers.length)answers=shuffle([...new Set(other)]).slice(0,2);
  if(answers.length<2)return;
  out.push({id:w.cl+'-'+w.unit+'-'+w.en+'-2',prompt:line+'  ('+w.tr+')',tip:'Cümlede boşluğu tamamla',answer:w.en,choices:shuffle([w.en].concat(answers)),kind:2});
 }
 for(var i=0;i<words.length;i++){make(words[i],0);make(words[i],1);contextual(words[i]);}
 return shuffle(out);
}
function makeDeck(items){
 var q=questionPool(items);
 if(q.length<TOTAL*2)return null;
 var distinct=new Map();q.forEach(function(c){var k=c.id.replace(/-[012]$/,'');if(!distinct.has(k))distinct.set(k,[]);distinct.get(k).push(c);});
 var keys=shuffle([...distinct.keys()]);
 // Each team gets 12 distinct targets. When content has 24+ words no targets overlap.
 if(keys.length<12)return null;
 var aKeys=keys.slice(0,12),bKeys=keys.length>=24?keys.slice(12,24):keys.slice(-12);
 var a=aKeys.map(function(k){return shuffle(distinct.get(k))[0];});
 var ids=new Set(a.map(function(c){return c.id;}));
 var b=bKeys.map(function(k){return shuffle(distinct.get(k)).find(function(c){return !ids.has(c.id);});});
 if(b.some(function(c){return !c;}))return null;
 return [shuffle(a),shuffle(b)];
}
function root(html){if(!overlay)return;overlay.innerHTML=html;overlay.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',close);});}
function status(message){var p=overlay&&overlay.querySelector('[data-status]');if(p)p.textContent=message;}
function close(){clearInterval(ticker);ticker=null;session=null;if(overlay){overlay.remove();overlay=null;}document.body.classList.remove('dm-sr-active');window.dmPapiNotices?.resume?.();if(previousFocus&&document.contains(previousFocus))previousFocus.focus({preventScroll:true});}
function open(){if(overlay)return;previousFocus=document.activeElement;overlay=document.createElement('div');overlay.className='dm-sr-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Cümle Yarışı');document.body.appendChild(overlay);document.body.classList.add('dm-sr-active');window.dmPapiNotices?.pause?.();overlay.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){var f=[...overlay.querySelectorAll('button:not([disabled]),select:not([disabled])')].filter(function(el){return el.getClientRects().length;});if(!f.length)return;var at=f.indexOf(document.activeElement);if(e.shiftKey&&at===0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&at===f.length-1){e.preventDefault();f[0].focus();}}});setup();}
function setup(){
 clearInterval(ticker);ticker=null;session=null;
 var values=bank(),classes=shuffle([...new Set(values.map(function(w){return w.cl;}).sort(function(a,b){return a-b;}) )]).sort(function(a,b){return a-b;});
 root('<section class="dm-sr-shell dm-sr-setup"><header class="dm-sr-header"><div><small>🏁 DİJİ MEDU · SINIF İÇİ KAPIŞMA</small><h2>Cümle Yarışı <span>🏎️</span></h2><p>İki takım · iki farklı soru havuzu · 12’şer soru</p></div><button type="button" data-close class="dm-sr-close" aria-label="Oyunu kapat">×</button></header><div class="dm-sr-intro"><div class="dm-sr-mini-car">🏎️ <span>🔵 MAVİ TAKIM</span></div><div class="dm-sr-mini-car">🏎️ <span>🌸 PEMBE TAKIM</span></div></div><div class="dm-sr-setup-body"><label>Sınıf<select data-class aria-label="Sınıf seç">'+classes.map(function(n){return '<option value="'+n+'">'+n+'. Sınıf</option>';}).join('')+'</select></label><fieldset><legend>Üniteler / temalar (birden fazla seçilebilir)</legend><div data-units class="dm-sr-units"></div></fieldset><label>Soru başına süre<select data-duration><option value="10">10 saniye · Hızlı</option><option value="15" selected>15 saniye · Normal</option><option value="20">20 saniye · Rahat</option></select></label><div class="dm-sr-rule"><b>🏆 Puanlama</b><p>Doğru cevap: +100 puan + kalan saniye × 10. Yanlış veya süre bitimi: −40 puan. Süreler iki takım için bağımsız işler. Yüksek puanlı araç daha çok yol alır.</p><p>Bu sınıf oyununda enerji, altın ve XP etkilenmez.</p></div><p data-status role="status" class="dm-sr-status"></p><button class="dm-sr-primary" type="button" data-start>🏁 Yarışı Başlat</button></div></section>');
 var selector=overlay.querySelector('[data-class]'),unitsEl=overlay.querySelector('[data-units]'),selected=new Set();
 function fill(){
  unitsEl.innerHTML='';selected.clear();var classNo=Number(selector.value),units=[...new Set(values.filter(function(w){return w.cl===classNo;}).map(function(w){return w.unit;}))].sort(function(a,b){return a-b;});
  units.forEach(function(n){var btn=document.createElement('button');btn.type='button';btn.className='dm-sr-unit';btn.textContent=n+'. Ünite';btn.dataset.unit=String(n);btn.setAttribute('aria-pressed','false');btn.onclick=function(){if(selected.has(n))selected.delete(n);else selected.add(n);update();};unitsEl.append(btn);});
  if(units.length)units.forEach(function(n){selected.add(n);});update();
 }
 function update(){
  unitsEl.querySelectorAll('button').forEach(function(b){var chosen=selected.has(Number(b.dataset.unit));b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});
  var words=scope(values,Number(selector.value),[...selected]),usable=questionPool(words);
  var ready=words.length>=TOTAL&&usable.length>=TOTAL*2;
  overlay.querySelector('[data-start]').disabled=!ready;
  status(!values.length?'Kelime havuzu henüz yüklenmedi. Oyunlar sayfasını yenileyip tekrar deneyin.':!selected.size?'Başlamak için en az bir ünite seç.':ready?'Hazır: '+words.length+' kelime / '+usable.length+' farklı soru. Her takım 12 soru çözecek.':'En az 12 farklı kelime/ifade gerekiyor. Başka üniteler de seç ('+words.length+' kelime).');
 }
 selector.onchange=fill;
 overlay.querySelector('[data-start]').onclick=function(){var units=[...selected];var words=scope(bank(),Number(selector.value),units);var decks=makeDeck(words);if(!decks){status('Soru hazırlanamıyor; başka üniteler ekle.');return;}start(decks,Number(overlay.querySelector('[data-duration]').value),Number(selector.value),units);};
 fill();overlay.querySelector('[data-close]')?.focus();
}
function start(decks,duration,cl,units){
 session={duration:duration,classNo:cl,units:units,started:performance.now(),finished:false,teams:decks.map(function(deck,i){return {deck:deck,index:0,score:0,correct:0,wrong:0,timeout:0,deadline:performance.now()+duration*1000,locked:false,last:null,team:i};})};
 root('<section class="dm-sr-shell dm-sr-play"><header class="dm-sr-header dm-sr-game-head"><div><small>🏁 DİJİ MEDU · 12 SORULUK KAPIŞMA</small><h2>Cümle Yarışı</h2></div><div class="dm-sr-game-meta"><b>'+safe(cl)+'. Sınıf · '+units.map(safe).join(', ')+'. Ünite</b><button type="button" data-close aria-label="Yarışı kapat" class="dm-sr-close">×</button></div></header><div class="dm-sr-track"><span class="dm-sr-startflag">BAŞLANGIÇ</span><div class="dm-sr-track-lanes"><div class="dm-sr-lane dm-sr-blue"><span class="dm-sr-lane-label">Mavi Takım</span><div class="dm-sr-track-line"><div data-car="0" class="dm-sr-car">🚙</div></div></div><div class="dm-sr-lane dm-sr-pink"><span class="dm-sr-lane-label">Pembe Takım</span><div class="dm-sr-track-line"><div data-car="1" class="dm-sr-car">🚗</div></div></div></div><span class="dm-sr-finishflag">🏁 BİTİŞ</span></div><div class="dm-sr-dual"><section class="dm-sr-side dm-sr-side-blue" data-side="0"></section><section class="dm-sr-side dm-sr-side-pink" data-side="1"></section></div><p class="dm-sr-game-footer">⚡ Doğru ve hızlı cevap arabanı ilerletir · ❌ Yanlış veya süre bitimi −40 puan</p></section>');
 session.teams.forEach(function(t){drawTeam(t);});drawCars();
 ticker=setInterval(tick,100);
}
function drawTeam(team){
 if(!overlay||!session)return;
 var side=overlay.querySelector('[data-side="'+team.team+'"]');if(!side)return;
 var name=team.team?'Pembe Takım':'Mavi Takım',label=team.team?'🌸':'🔵';
 if(team.index>=TOTAL){side.innerHTML='<header><h3>'+label+' '+name+'</h3><b>'+team.score+' puan</b></header><div class="dm-sr-done">🏁<h4>12 soru tamamlandı!</h4><p>✅ '+team.correct+' doğru · ❌ '+team.wrong+' yanlış · ⌛ '+team.timeout+' süre doldu</p><p>Diğer takımın bitirmesi bekleniyor.</p></div>';return;}
 var q=team.deck[team.index];
 side.innerHTML='<header><h3>'+label+' '+name+'</h3><b data-score>'+team.score+' puan</b></header><div class="dm-sr-side-meta"><span>Soru '+(team.index+1)+' / '+TOTAL+'</span><strong data-clock aria-label="Kalan süre">'+session.duration+' sn</strong></div><div class="dm-sr-time-track"><div data-time-bar></div></div><div class="dm-sr-question"><small>'+safe(q.tip)+'</small><p>'+safe(q.prompt)+'</p></div><div class="dm-sr-choices">'+q.choices.map(function(c,i){return '<button type="button" data-answer="'+i+'">'+safe(c)+'</button>';}).join('')+'</div><p class="dm-sr-feedback" data-feedback role="status" aria-live="polite"></p><div class="dm-sr-counts">✅ '+team.correct+' doğru <span>❌ '+team.wrong+' yanlış</span> <span>⌛ '+team.timeout+' süre</span></div>';
 side.querySelectorAll('[data-answer]').forEach(function(btn){btn.onclick=function(){answer(team,q.choices[Number(btn.dataset.answer)]);};});
}
function grade(remaining,correct){return correct?BASE+Math.max(0,Math.ceil(remaining/1000))*10:-WRONG;}
function answer(team,value){
 if(!session||session.finished||team.locked||team.index>=TOTAL)return;
 var left=team.deadline-performance.now();if(left<=0){finishQuestion(team,null,true);return;}
 finishQuestion(team,value,false);
}
function finishQuestion(team,value,timedOut){
 if(!session||session.finished||team.locked||team.index>=TOTAL)return;
 var q=team.deck[team.index],correct=!timedOut&&value===q.answer;
 var left=Math.max(0,team.deadline-performance.now());
 team.score=Math.max(0,team.score+grade(left,correct));
 if(correct)team.correct++;else if(timedOut)team.timeout++;else team.wrong++;
 team.locked=true;
 var side=overlay.querySelector('[data-side="'+team.team+'"]');if(side){
  side.querySelectorAll('[data-answer]').forEach(function(btn){btn.disabled=true;var text=btn.textContent;if(text===q.answer)btn.classList.add('correct');else if(text===value)btn.classList.add('incorrect');});
  var fb=side.querySelector('[data-feedback]');if(fb)fb.textContent=correct?'✅ +'+grade(left,true)+' puan!':timedOut?'⌛ Süre doldu · −40 puan. Doğru cevap: '+q.answer:'❌ −40 puan. Doğru cevap: '+q.answer;
  var num=side.querySelector('[data-score]');if(num)num.textContent=team.score+' puan';
 }
 drawCars();
 // Match all animations to the current round. Cleanup is guarded on close/restart.
 var current=session;
 setTimeout(function(){if(!session||session!==current)return;team.index++;team.locked=false;team.deadline=performance.now()+current.duration*1000;drawTeam(team);if(current.teams.every(function(t){return t.index>=TOTAL;}))result();},850);
}
function drawCars(){if(!session||!overlay)return;var max=TOTAL*(BASE+session.duration*10);session.teams.forEach(function(team){var car=overlay.querySelector('[data-car="'+team.team+'"]');if(car)car.style.left=Math.min(91,Math.round(team.score/max*91))+'%';});}
function tick(){if(!session||session.finished||!overlay)return;var now=performance.now();session.teams.forEach(function(team){if(team.index>=TOTAL||team.locked)return;var remain=team.deadline-now;if(remain<=0){finishQuestion(team,null,true);return;}var side=overlay.querySelector('[data-side="'+team.team+'"]');if(!side)return;var seconds=Math.ceil(remain/1000),clock=side.querySelector('[data-clock]'),bar=side.querySelector('[data-time-bar]');if(clock){clock.textContent=seconds+' sn';clock.classList.toggle('urgent',seconds<=5);}if(bar){bar.style.width=Math.max(0,remain/session.duration/10)+'%';bar.classList.toggle('urgent',seconds<=5);}});}
function result(){
 if(!session||session.finished)return;session.finished=true;clearInterval(ticker);ticker=null;
 var a=session.teams[0],b=session.teams[1],win=a.score===b.score?'Berabere!':a.score>b.score?'🏆 Mavi Takım Kazandı!':'🏆 Pembe Takım Kazandı!';
 var rows=session.teams.map(function(t){return '<div class="dm-sr-final-team '+(t.team?'pink':'blue')+'"><h3>'+(t.team?'🌸 Pembe Takım':'🔵 Mavi Takım')+'</h3><strong>'+t.score+' puan</strong><p>✅ '+t.correct+' doğru · ❌ '+t.wrong+' yanlış · ⌛ '+t.timeout+' süre doldu</p></div>';}).join('');
 root('<section class="dm-sr-shell dm-sr-final"><button data-close class="dm-sr-close dm-sr-final-close" aria-label="Kapat">×</button><div class="dm-sr-trophy">🏆</div><h2>'+win+'</h2><p>12 soruluk yarış tamamlandı</p><div class="dm-sr-final-grid">'+rows+'</div><div class="dm-sr-final-actions"><button type="button" data-again class="dm-sr-primary">🔄 Yeniden Yarış</button><button type="button" data-close class="dm-sr-secondary">Oyunlara Dön</button></div><p>Bu karşılaşma yalnızca sınıf içinde oynandı; öğrenci puanlarına ve sıralamalara aktarılmadı.</p></section>');
 overlay.querySelector('[data-again]').onclick=setup;
}
window.dmSentenceRace={open:open,close:close,questionPool:questionPool,makeDeck:makeDeck,grade:grade,scope:scope,bank:bank};
})();