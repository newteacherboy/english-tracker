/* Supplementary practice. Both maps, their rewards and the six destinations stay intact. */
(()=>{'use strict';
const $=id=>document.getElementById(id),bank=window.DMLearningDialogues||[];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const identity=()=>who()+'|'+(localStorage.getItem('ing_token')||'');
const student=()=>!!who()&&who().toLowerCase()!=='teacher'&&!!localStorage.getItem('ing_token')&&!window.dmGuestMode;
const visible=el=>!!el&&el.getClientRects().length>0;
const today=()=>new Date(Date.now()+10800000).toISOString().slice(0,10);
const papi='<img class="lc-papi" src="route-assets/papi-profile.png" alt="Papi" decoding="async">';
let summary=null,owner='',loaded=0,inflight=null,scheduled=false,routePending=false;
async function api(islem,data={},teacher=false){
 const at=teacher?(sessionStorage.getItem('ing_ogr_token')||''):localStorage.getItem('ing_token')||'';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem,t:at,...data}),signal:controller.signal});const d=await response.json();if(!response.ok||d.ok===false)throw Error(d.mesaj||d.message||'İşlem tamamlanamadı.');return d;}
 catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. Tekrar deneyebilirsin.');throw e;}finally{clearTimeout(timer);}
}
function reset(){const at=identity();if(at===owner)return;owner=at;summary=null;loaded=0;inflight=null;routePending=false;$('lcPlan')?.remove();document.querySelectorAll('.lc-dialog').forEach(x=>x.remove());}
async function load(force=false){
 reset();if(!student())return null;const at=owner;
 if(summary?.day===today()&&!force&&Date.now()-loaded<60000)return summary;
 if(inflight)return inflight;
 const promise=api('companionSummary').then(d=>{if(at!==identity())return null;summary=d;loaded=Date.now();paintPlan();return d;}).finally(()=>{if(inflight===promise)inflight=null;});inflight=promise;return promise;
}
function sheet(title,html,id){
 const view=window.dmMemberUI?.sheet(title,html,id);if(!view)return null;
 view.el.classList.add('lc-dialog');const at=identity();
 const stop=()=>{try{speechSynthesis.cancel();}catch{}};view.el.addEventListener('dm:sheet-close',stop,{once:true});
 view.alive=()=>view.el.isConnected&&at===identity();return view;
}
const action=(label,id,extra='')=>'<button type="button" class="lc-button" data-lc="'+id+'" '+extra+'>'+label+'</button>';
function planMarkup(){
 const d=summary,reviewDone=d?.reviewDone||d?.review?.total>0&&d.review.due===0;
 const state=[reviewDone,!!d?.routeDone,!!d?.dialogueDone],steps=[['repeat',d?.review?.due?Math.min(3,d.review.due)+' kelimeyi hatırla':d?'Bugünkü tekrarın tamam':'Kelimelerini tekrar et'],['route','Bölümüne devam et'],['dialogues','Kısa bir diyalog çalış']];
 return '<div class="lc-plan-head"><span class="lc-plan-mark" aria-hidden="true">✦</span><div><h2>Bugünkü Planım</h2><small>Senin hızında · '+state.filter(Boolean).length+' / 3 adım</small></div>'+action('⌄','toggle','aria-label="Plan adımlarını göster" aria-expanded="false"')+'</div><div class="lc-plan-steps" hidden>'+steps.map(([id,label],i)=>action((state[i]?'✓ ':'')+label,id)).join('')+'<small>Haritadan doğrudan da devam edebilirsin.</small></div><div class="lc-plan-foot"><span>'+(d?d?.review?.due?'Bugün '+d.review.due+' kelimenin tekrar zamanı.:'Küçük bir adımla öğrenmeye devam et.':'Planın hazırlanıyor…')+'</span>'+action(state.every(Boolean)?'Yeniden çalış':'Planıma Başla','start')+'</div>';
}
function paintPlan(){const el=$('lcPlan');if(!el)return;const sig=JSON.stringify([owner,summary?.day,summary?.review,summary?.reviewDone,summary?.routeDone,summary?.dialogueDone]);if(el.dataset.signature===sig)return;const expanded=el.querySelector('[data-lc="toggle"]')?.getAttribute('aria-expanded')==='true';el.innerHTML=planMarkup();el.dataset.signature=sig;if(expanded){el.querySelector('.lc-plan-steps').hidden=false;el.querySelector('[data-lc="toggle"]').setAttribute('aria-expanded','true');}}
function mount(){
 scheduled=false;reset();if(!student())return;
 const map=$('tab-dunya'),root=map?.querySelector('.rt-root');
 if(root&&visible(map)){
  let plan=$('lcPlan');if(!plan){plan=document.createElement('section');plan.id='lcPlan';plan.className='lc-plan';plan.setAttribute('aria-label','Bugünkü çalışma planın');root.prepend(plan);paintPlan();}
  else if(plan.parentElement!==root)root.prepend(plan);
  load().catch(e=>{const note=$('lcPlan')?.querySelector('.lc-plan-foot>span');if(note)note.textContent='Plan alınamadı. Başla ile tekrar dene.';});
 }
 const study=$('suLevels');if(study&&visible(study)&&!$('lcDialogueEntry')){
  const entry=document.createElement('section');entry.id='lcDialogueEntry';entry.className='lc-entry';entry.innerHTML=papi+'<div><h3>Hikâye ve Diyalog</h3><p>Oku, dinle ve günlük hayatta kullan.</p></div>'+action('Keşfet →','dialogues');study.append(entry);
 }
 const menu=$('rtProfileBackdrop')?.querySelector('.rt-profile-grid');if(menu&&!menu.querySelector('[data-lc="report"]')){
  const b=document.createElement('button');b.type='button';b.dataset.lc='report';b.innerHTML='<img src="route-assets/repeat.svg" alt=""><b>Öğrenme Karnem</b><small>XP’den ayrı çalışma özeti</small>';menu.querySelector('[data-profile="progress"]')?.after(b);
 }
 const teacher=$('ogretmenMenuModal')?.querySelector('.rubric-content');if(teacher&&visible(teacher)&&!$('lcTeacherEntry')){
  const b=document.createElement('button');b.type='button';b.id='lcTeacherEntry';b.className='ogretmen-menu-btn';b.dataset.lc='teacher';b.innerHTML='<span>🧭 Sınıfımın Öğrenme Özeti</span>';teacher.append(b);
 }
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(mount);}
async function repeat(){if(!student())return;await window.dmWrongWords?.review({limit:3,onComplete:()=>load(true).catch(()=>{})});}
async function route(){routePending=true;const p=window.dmLearningRoute?.purpose?.();if(p==='independent')return window.dmThematicLearning?.continueRoute();const current=document.querySelector('#tab-dunya .rt-start');if(current)return current.click();await window.dunyaAc?.();return document.querySelector('#tab-dunya .rt-start')?.click();}
async function start(){const b=$('lcPlan')?.querySelector('[data-lc="start"]');if(b)b.disabled=true;try{const d=await load(true);if(!d)return;if(d.review?.due&&!d.reviewDone)return repeat();if(!d.routeDone)return route();return dialogues();}catch(e){window.yoToast?.(e.message);}finally{if(b?.isConnected)b.disabled=false;}}
function skillBar(label,correct,total,icon){return '<article class="lc-skill"><span aria-hidden="true">'+icon+'</span><div><b>'+label+'</b><small>'+(total?correct+' / '+total+' doğru':'Henüz yeterli çalışma yok')+'</small></div><progress aria-label="'+label+' alıştırma doğruluğu" max="'+(total||1)+'" value="'+correct+'"></progress></article>';}
async function report(){
 if(!student())return;$('rtProfileBackdrop')?.remove();const v=sheet('Öğrenme Karnem','<p role="status">Çalışmaların yükleniyor…</p>','lcReport');if(!v)return;
 try{const d=await load(true);if(!v.alive()||!d)return;
  v.body.innerHTML='<p class="lc-muted">XP’den ayrı · Kaydedilen alıştırmaların özeti</p><div class="lc-skill-list">'+skillBar('Kelime',d.review.correct,d.review.attempts,'📖')+[['listening','Dinleme','🎧'],['reading','Okuma','📚'],['writing','Yazma','✎']].map(([id,label,icon])=>skillBar(label,d.skills[id].correct,d.skills[id].total,icon)).join('')+'</div><div class="lc-achievement">'+papi+'<div><b>'+d.review.strengthening+' kelimeyi farklı günlerde pekiştirdin.</b><p>'+d.review.reviewed+' kelimeyi tekrar ettin; '+d.review.due+' kelimenin tekrar zamanı geldi.</p></div></div><p class="lc-muted">Kelime sonuçları kişisel tekrardan; diğer sonuçlar hikâye ve diyalog alıştırmalarından gelir. Son 100 diyalog çalışması gösterilir. Bu bir CEFR seviyesi veya resmî yeterlilik ölçümü değildir.</p>'+action(d.review.due?'Kelimelerimi tekrar et':'Bir diyalog çalış',d.review.due?'report-repeat':'report-story');
 }catch(e){if(v.alive())v.body.textContent=e.message;}
}
function dialogues(){
 if(!student())return;const v=sheet('Hikâye ve Diyalog','<p class="lc-muted">Günlük hayattan kısa konuşmalar · Enerji harcanmaz</p><div class="lc-story-grid">'+bank.map(s=>'<button type="button" data-story="'+s.id+'"><span class="lc-story-icon" aria-hidden="true">'+s.icon+'</span><span><small>'+s.level+' · Oku / Dinle</small><b>'+esc(s.title)+'</b><small>'+esc(s.scene)+'</small></span><span>›</span></button>').join('')+'</div>','lcDialogues');if(!v)return;
 v.body.querySelectorAll('[data-story]').forEach(b=>b.onclick=()=>{v.close();openStory(b.dataset.story);});
}
function say(text,rate,finished,failed){
 try{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)throw Error('Ses desteklenmiyor.');speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';utterance.rate=rate;utterance.onend=finished;utterance.onerror=failed;speechSynthesis.speak(utterance);}catch(e){failed(e);}
}
async function openStory(id){
 const story=bank.find(s=>s.id===id);if(!story||!student())return;
 const v=sheet(story.title,'<p role="status">Diyalog yükleniyor…</p>','lcStory');if(!v)return;
 let state=null,played=false,audioBusy=false,slow=false,answering=false;
 const transcript=()=>'<details class="lc-transcript-panel" open><summary>Konuşma metni</summary><div class="lc-transcript">'+story.lines.map(([person,text])=>'<p><small>'+esc(person)+'</small><span>'+esc(text)+'</span></p>').join('')+'</div></details>';
 function audio(){return '<div class="lc-audio">'+action('▶ Dinle','audio')+action('Yavaş dinle','slow')+'</div><p class="lc-audio-note" role="status"></p>';}
 function bindAudio(){
  const play=()=>{if(audioBusy)return;audioBusy=true;const b=v.body.querySelector('[data-lc="audio"]');if(b)b.disabled=true;const note=v.body.querySelector('.lc-audio-note');note.textContent='Dinliyorsun…';const done=()=>{audioBusy=false;if(!v.alive())return;played=true;note.textContent='Dinledin. Şimdi soruyu yanıtlayabilirsin.';if(b)b.disabled=false;v.body.querySelectorAll('[data-option]').forEach(x=>x.disabled=false);};
   const fail=()=>{audioBusy=false;if(!v.alive())return;note.textContent='Ses oynatılamadı. Metni okuyarak devam edebilirsin; bu soru okuma olarak kaydedilir.';played=false;if(b)b.disabled=false;v.body.querySelector('[data-transcript]')?.removeAttribute('hidden');v.body.querySelectorAll('[data-option]').forEach(x=>x.disabled=false);};say(story.lines.map(x=>x[1]).join(' '),slow?.65:.85,done,fail);
  };v.body.querySelector('[data-lc="audio"]')?.addEventListener('click',play);v.body.querySelector('[data-lc="slow"]')?.addEventListener('click',e=>{slow=!slow;e.target.textContent=slow?'Normal hız':'Yavaş dinle';});
 }
 function render(){
  if(!v.alive())return;played=false;audioBusy=false;
  if(state.cursor>=story.questions.length){const results=Object.values(state.answers||{}),count=results.filter(r=>r.correct).length;v.body.innerHTML='<div class="lc-complete">'+papi+'<h3>Bir konuşma daha öğrendin!</h3><p>'+count+' / '+story.questions.length+' doğru · Bugünkü çalışman kayıtlı.</p></div>'+transcript()+'<div class="lc-word-chips">'+story.words.map(w=>'<span>'+esc(w.en)+' · '+esc(w.tr)+'</span>').join('')+'</div>'+action('Başka bir diyalog seç','another')+action('Parkuruma dön','back-route');v.body.querySelector('[data-lc="another"]').onclick=()=>{v.close();dialogues();};v.body.querySelector('[data-lc="back-route"]').onclick=()=>{v.close();window.dunyaAc?.();};load(true).catch(()=>{});return;}
  const i=state.cursor,q=story.questions[i],listening=q.skill==='listening';
  v.body.innerHTML='<div class="lc-story-kicker"><span>'+story.icon+' '+story.level+' · '+({reading:'Okuma',listening:'Dinleme',writing:'Kısa yazma'}[q.skill])+'</span><b>'+(i+1)+' / '+story.questions.length+'</b></div><progress class="lc-story-progress" max="'+story.questions.length+'" value="'+i+'"></progress>'+audio()+(listening?'<div data-transcript hidden>'+transcript()+'</div>':transcript())+'<h3 class="lc-question">'+esc(q.prompt)+'</h3>'+(q.options?'<div class="lc-options">'+q.options.map(text=>'<button type="button" data-option="'+esc(text)+'" '+(listening?'disabled':'')+'>'+esc(text)+'</button>').join('')+'</div>':'<form class="lc-writing"><label>İngilizce cevabın<input name="answer" maxlength="140" autocomplete="off" autocapitalize="none" spellcheck="false" required></label><button class="lc-button" type="submit">Kontrol et</button></form>')+'<div class="lc-answer-note" role="status" aria-live="polite"></div>'+(listening?action('Ses olmadan metinle çalış','read-instead'):'');
  bindAudio();
  v.body.querySelector('[data-lc="read-instead"]')?.addEventListener('click',e=>{try{speechSynthesis.cancel();}catch{}audioBusy=false;played=false;v.body.querySelector('[data-transcript]').hidden=false;v.body.querySelectorAll('[data-option]').forEach(x=>x.disabled=false);const play=v.body.querySelector('[data-lc="audio"]');if(play)play.disabled=false;e.target.disabled=true;v.body.querySelector('.lc-audio-note').textContent='Metinle çalışıyorsun; bu soru okuma olarak kaydedilecek.';});
  async function answer(text,button){
   if(answering||!v.alive())return;answering=true;v.body.querySelectorAll('[data-option],.lc-writing button').forEach(x=>x.disabled=true);const note=v.body.querySelector('.lc-answer-note');note.textContent='Kontrol ediliyor…';
   try{const r=await api('companionDialogueAnswer',{story:id,index:i,version:state.version,answer:text,audioPlayed:played});if(!v.alive())return;
    state={...state,cursor:r.cursor,version:r.version,answers:{...state.answers,[i]:r}};button?.classList.add(r.correct?'lc-correct':'lc-wrong');
    v.body.querySelectorAll('[data-option]').forEach(x=>{if(x.dataset.option===r.answer)x.classList.add('lc-correct');});
    window.dmAnswerFeedback?.(r.correct);v.body.querySelectorAll('.lc-transcript-panel').forEach(x=>x.open=false);note.className='lc-answer-note '+(r.correct?'lc-correct-note':'lc-explain');note.innerHTML='<b>'+(r.correct?'✓ Doğru!':'Birlikte düzeltelim')+'</b><p>'+esc(r.explanation)+'</p>'+(!r.correct?'<p>Doğru cevap: <strong>'+esc(r.answer)+'</strong></p>':'');
    const next=document.createElement('button');next.type='button';next.className='lc-button';next.textContent=i===story.questions.length-1?'Çalışmayı tamamla':'Sonraki adım →';next.onclick=render;v.body.append(next);next.focus();
   }catch(e){if(v.alive()){note.textContent=e.message;v.body.querySelectorAll('[data-option],.lc-writing button').forEach(x=>x.disabled=false);}}finally{answering=false;}
  }
  v.body.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>answer(b.dataset.option,b));v.body.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();answer(new FormData(e.target).get('answer'),e.target.querySelector('button'));});
 }
 try{state=await api('companionDialogueOpen',{story:id});if(v.alive())render();}catch(e){if(v.alive())v.body.textContent=e.message;}
}
async function teacherSummary(){
 const v=sheet('Sınıfımın Öğrenme Özeti','<p role="status">Sınıfların yükleniyor…</p>','lcTeacherSummary');if(!v)return;v.el.classList.add('dm-teacher-child');
 const teacherToken=sessionStorage.getItem('ing_ogr_token');
 try{const [d,homework]=await Promise.all([api('teacherLearningSummary',{},true),api('odevListesiOgretmen',{},true)]);if(!v.alive()||teacherToken!==sessionStorage.getItem('ing_ogr_token'))return;
  if(!d.classes.length){v.body.textContent='Henüz sana bağlı aktif öğrenci bulunmuyor.';return;}
  v.body.innerHTML='<label class="lc-class-picker">Sınıf / Şube<select>'+d.classes.map(c=>'<option value="'+esc(c.classNo+'|'+c.branch)+'">'+esc(c.classNo+'/'+(c.branch||'Şubesiz'))+'</option>').join('')+'</select></label><div data-summary></div>';
  function paint(){const [classNo,branch]=v.body.querySelector('select').value.split('|'),pupils=d.pupils.filter(p=>String(p.classNo)===classNo&&String(p.branch||'')===branch),words=d.weak.filter(w=>String(w.classNo)===classNo&&String(w.branch||'')===branch).slice(0,5),tasks=(homework.liste||[]).filter(o=>String(o.sinif)===classNo&&(!o.sube||o.sube===branch)),assignments=tasks.reduce((n,o)=>n+o.hedef,0),done=tasks.reduce((n,o)=>n+o.yapanlar.length,0);
   v.body.querySelector('[data-summary]').innerHTML='<div class="lc-teacher-stats"><article><small>Tamamlanan ödev teslimi</small><b>'+done+' / '+assignments+'</b></article><article><small>Tekrar zamanı gelen öğrenci</small><b>'+pupils.filter(p=>p.needsReview).length+' / '+pupils.length+'</b></article></div><h3>Sınıfın tekrar edebileceği kelimeler</h3><div class="lc-weak-list">'+(words.map(w=>'<article><span><b>'+esc(w.en)+'</b><small>'+esc(w.tr)+'</small></span><span>'+w.students+' öğrenci</span></article>').join('')||'<p>Henüz tekrar önerilecek kelime kaydı yok.</p>')+'</div><p class="lc-muted">Kelimeler kişisel tekrar kayıtlarından gelir. Teslim sayısı tüm aktif ödevleri kapsar; öğrenci sayısı değildir.'+(d.limited?' Çok sayıda kayıt olduğu için özet sınırlıdır.':'')+'</p>'+action('Tekrar Ödevi Hazırla →','assign');
   v.body.querySelector('[data-lc="assign"]').onclick=async()=>{v.close();await window.odevEkraniAc?.();const c=$('odSinif');if(c){c.value=classNo;c.dispatchEvent(new Event('change'));}const section=$('odSube');if(section)section.value=branch;const note=$('odNot');if(note&&words.length)note.value=('Tekrar önerisi: '+words.map(w=>w.en+' ('+w.tr+')').join(', ')+'.').slice(0,300);const game=document.querySelector('#odOyunlar input[data-o="ky"]');if(game&&!game.checked){game.checked=true;game.dispatchEvent(new Event('change'));}};
  }v.body.querySelector('select').onchange=paint;paint();
 }catch(e){if(v.alive())v.body.textContent=e.message;}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-lc]');if(!b||b.disabled)return;const id=b.dataset.lc;if(id==='toggle'){const steps=$('lcPlan')?.querySelector('.lc-plan-steps');if(steps){steps.hidden=!steps.hidden;b.setAttribute('aria-expanded',String(!steps.hidden));}return;}
 const actions={start,repeat,route,dialogues,report,teacher:teacherSummary,'report-repeat':()=>{$('lcReport')?.querySelector('.dm-member-close')?.click();repeat();},'report-story':()=>{$('lcReport')?.querySelector('.dm-member-close')?.click();dialogues();}};
 if(actions[id]){e.preventDefault();actions[id]();}
});
let completionInFlight='';
async function lessonDone(){
 if(!student())return;
 const account=identity(),day=today(),key=account+'|'+day;
 if(completionInFlight===key)return;
 completionInFlight=key;
 routePending=false;
 try{
  await api('companionPlanStep',{step:'route'});
  if(identity()===account&&today()===day)await load(true);
 }catch{}finally{if(completionInFlight===key)completionInFlight='';}
}
document.addEventListener('dm:learning-progress',e=>{if(e.detail?.completed&&e.detail.owner===who())lessonDone();});
document.addEventListener('dm:lesson-completed',lessonDone);
document.addEventListener('dm:school-lesson-completed',lessonDone);
document.addEventListener('dm:review-completed',()=>{load(true).catch(()=>{});});
document.addEventListener('dm:login',()=>{reset();schedule();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
// Observe screen switches and replaced map/profile content, not the full game tree.
for(const id of ['tab-dunya','tab-derscalis','ogretmenMenuModal']){const el=$(id);if(el)new MutationObserver(schedule).observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.id==='rtProfileBackdrop')))schedule();}).observe(document.body,{childList:true});
window.dmLearningCompanion={refresh:()=>load(true),report,dialogues,openStory,teacherSummary,mount,markRouteComplete:lessonDone};
schedule();
})();
