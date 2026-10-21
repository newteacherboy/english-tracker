/* The school-route navigator follows Learning Path's accordion layout, with its own color and theme. */
(()=>{'use strict';
if(window.dmSchoolJourney)return;
const characters=['bumbi','fora','kori','lumo','mimo','nori','pofin','tiko','vela','ziri'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const currentRoute=()=>window.dmLearningRoute?.purpose?.()==='school';
let visit=0,steps=[],entrySource=null,lastContext={grade:1,unit:1,part:1};
const themeKey='dm-school-route-theme-v1';
function theme(){try{return localStorage.getItem(themeKey)==='night'?'night':'day'}catch{return 'day';}}
function themeSet(t){
 const choice=t==='night'?'night':'day';try{localStorage.setItem(themeKey,choice)}catch{}
 document.querySelectorAll('.rt-root.rt-school,.rt-school-modal,#bzPerde.dm-school-game,.sp-adventure-entry.dm-school-start').forEach(x=>{if(x.dataset.schoolAppearance!==choice)x.dataset.schoolAppearance=choice;});
 document.querySelectorAll('[data-school-theme]').forEach(b=>{b.textContent=b.classList.contains('dm-school-head-theme')?(choice==='night'?'☀️':'🌙'):(choice==='night'?'☀️ Gündüz':'🌙 Gece');b.setAttribute('aria-label',choice==='night'?'Gündüz görünümüne geç':'Gece görünümüne geç');});
}
const mascot=(n=0)=>characters[((Math.abs(n)+visit)%characters.length)];
const art=(n,cls='')=>'<img class="'+cls+'" src="learning-assets/characters/'+mascot(n)+'.webp" alt="" loading="lazy" width="100" height="100" decoding="async">';
function parse(s){
 const label=String(s?.label||'');
 const m=/(\d+)\.\s*sınıf[^\d]*(\d+)\.\s*ünite/i.exec(label);
 const part=/[·|]\s*(\d+)\s*\/\s*(\d+)/i.exec(label);
 return {grade:Number(m?.[1]||0),unit:Number(m?.[2]||0),part:Number(part?.[1]||0),total:Number(part?.[2]||0)};
}
function group(rows){
 const grades=Array.from({length:8},(_,i)=>({grade:i+1,units:new Map(),completed:0,total:0}));
 (rows||[]).forEach((step,index)=>{
   const info=parse(step);if(info.grade<1||info.grade>8||info.unit<1||info.unit>10)return;
   const g=grades[info.grade-1];
   if(!g.units.has(info.unit))g.units.set(info.unit,[]);
   g.units.get(info.unit).push({...step,...info,index});
   g.total++;if(step.done)g.completed++;
 });
 return grades;
}
function getCurrent(rows,index){
 const steps=rows||[],active=steps[index]||steps.find(x=>x.available&&!x.done)||steps[0];
 return {step:active,info:parse(active),done:steps.filter(x=>x.done).length,total:steps.length};
}
function preview(state){
 if(!currentRoute())return '';
 const rows=state.allSteps||state.steps||[];steps=rows;
 const summary=getCurrent(state.steps||rows,state.current||0);
 const grades=group(rows), grade=summary.info.grade||1;
 const done=grades.reduce((n,g)=>n+g.completed,0),total=grades.reduce((n,g)=>n+g.total,0),pct=Math.round(done/Math.max(1,total)*100);
 visit++;
 return '<section class="rt-school-main" aria-label="Okul Yolum sınıflar, üniteler ve duraklar">'+
 '<header class="rt-school-main-header"><div><small>DİJİMEDU · MACERA PARKURU</small><h2>Okul Yolum</h2><p>Her sınıfta yeni kelimeler ve keşfedilecek duraklar seni bekliyor.</p></div>'+
 art(grade*11,'rt-school-main-hero')+'</header>'+
 '<div class="ml-summary-card rt-school-overall"><div class="ml-summary-ring" role="progressbar" aria-label="Okul Yolum ilerlemesi" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+done+'" style="--ml-done:'+pct+'%"><div><b>'+done+'</b><small>/ '+total+'</small></div></div>'+
 '<div class="ml-summary-info"><strong>8 sınıf · Macera yolculuğun</strong><p>Üniteleri sırayla keşfet, tamamlanan durakları tekrar çalış.</p><div class="ml-summary-track"><span style="width:'+pct+'%"></span></div><small>%'+pct+' tamamlandı</small></div></div>'+
 '<div class="rt-school-overview-actions"><button type="button" data-school-theme aria-label="Görünümü değiştir">'+(theme()==='night'?'☀️ Gündüz':'🌙 Gece')+'</button><button type="button" data-school-open>⤢ Tam ekran</button></div>'+
 '<h3 class="ml-theme-list-heading">Sınıflarım <small>8 sınıf</small></h3>'+
 '<div class="rt-school-grades">'+grades.map(g=>renderGrade(g,grade)).join('')+'</div></section>';
}
function progressHtml(n,total,caption){
 const p=Math.round(n/Math.max(1,total)*100);
 return '<div class="ml-theme-track" role="progressbar" aria-label="'+esc(caption)+'" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+n+'"><span style="width:'+p+'%"></span></div>';
}
function renderGrade(g,activeGrade){
 const entries=[...g.units.entries()].sort((a,b)=>a[0]-b[0]);
 const gradeComplete=g.total>0&&g.total===g.completed,pct=Math.round(g.completed/Math.max(1,g.total)*100);
 const n=g.grade;
 return '<details class="ml-theme rt-school-grade'+(n===activeGrade?' ml-theme-current':'')+'" '+(n===activeGrade?'open':'')+'>'+
  '<summary><span class="rt-school-grade-icon">'+art(n*3)+'</span><span class="ml-theme-info"><strong>'+n+'. Sınıf Maceraları</strong><small>'+(entries.length?entries.length+' ünite · '+g.completed+'/'+g.total+' durak':'Henüz bölüm içeriği açılmadı')+'</small>'+
  progressHtml(g.completed,g.total,'Sınıf ilerlemesi')+'</span><span class="ml-theme-state">'+(gradeComplete?'✓':pct+'%')+'</span><span class="ml-theme-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="ml-theme-body"><div class="ml-topic-heading"><strong>Ünite haritan</strong><small>'+entries.length+' ünite</small></div>'+
  (entries.length?'<div class="ml-topic-grid">'+entries.map(([unit,items])=>renderUnit(n,unit,items)).join('')+'</div>':'<p class="rt-school-unavailable">Bu sınıfın kelimeleri hazır olduğunda üniteleri burada göreceksin.</p>')+'</div></details>';
}
function renderUnit(grade,unit,items){
 const done=items.filter(s=>s.done).length;
 const active=items.some(s=>s.available&&!s.done),complete=done===items.length;
 const flavor=['Kelime Macerası','Keşif Bahçesi','Bilgi Adası','Neşeli Yolculuk','Sürpriz Durağı'][unit%5];
 return '<article class="ml-topic-card rt-school-topic'+(complete?' is-complete':active?' is-current':'')+'">'+
 '<div class="ml-topic-head"><span class="rt-school-unit-icon">'+art(grade*10+unit)+'</span><div class="ml-topic-copy"><h3>'+unit+'. Ünite · '+flavor+'</h3><p>Kelimeleri öğren, bilgilerini pekiştir ve yeni duraklar aç.</p></div>'+
 '<span class="ml-topic-status'+(complete?' is-done':'')+'"><b>'+(complete?'✓':done+'/'+items.length)+'</b><small>durak</small></span></div>'+
 progressHtml(done,items.length,unit+'. Ünite ilerlemesi')+
 '<div class="ml-topic-steps">'+items.map((s,i)=>'<button type="button" class="ml-topic-step'+(s.done?' is-done':'')+(!s.available?' locked':'')+'" data-school-b="'+esc(s.b)+'" data-school-d="'+esc(s.d)+'" '+(!s.available?'disabled':'')+'><span>'+(s.done?'✓':s.available?'▶':'🔒')+' '+esc(s.part?s.part+'. Durak':String(i+1)+'. Durak')+'</span><small>'+(s.done?'Tamamlandı':s.available?'Oyna':'Kilitli')+'</small></button>').join('')+'</div></article>';
}
function open(rows,gradeHint){
 if(!currentRoute())return;
 steps=Array.isArray(rows)?rows:steps;visit++;
 const groups=group(steps);
 const first=steps.find(x=>x.current)||steps.find(x=>x.available&&!x.done)||steps[0];
 const active=Number(gradeHint)||parse(first).grade||1;
 const done=steps.filter(s=>s.done).length,total=steps.length,pct=Math.round(done/Math.max(total,1)*100);
 document.getElementById('mlThemeList')?.remove();
 const el=document.createElement('div');el.id='mlThemeList';el.className='ml-overlay rt-school-modal';el.dataset.schoolAppearance=theme();
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Okul Yolum sınıf ve ünite haritası');
 el.innerHTML='<section class="ml-theme-panel"><header class="ml-theme-cover"><div class="ml-theme-cover-copy"><small>DİJİMEDU · MACERA</small><h2>Okul Yolum</h2><p>8 sınıflık macera! Üniteleri aç, kelimeleri öğren, her durakta güçlen.</p></div>'+
 art(active*11,'rt-school-cover-mascot')+
 '<button type="button" data-school-close data-close aria-label="Haritayı kapat">×</button></header>'+
 '<div class="ml-summary-card"><div class="ml-summary-ring" role="progressbar" aria-label="Tüm macera ilerlemesi" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+done+'" style="--ml-done:'+pct+'%"><div><b>'+done+'</b><small>/ '+total+'</small></div></div><div class="ml-summary-info"><strong>8 sınıf · Tam yolculuğun</strong><p>Her ünitede yeni bir macera, her durakta yeni kelimeler.</p>'+
 '<div class="ml-summary-track"><span style="width:'+pct+'%"></span></div><small>%'+pct+' tamamlandı</small></div></div>'+
 '<div class="rt-school-overview-actions"><button type="button" data-school-theme>'+(theme()==='night'?'☀️ Gündüz':'🌙 Gece')+'</button><span>Görünüm yalnızca Okul Yolum için değişir.</span></div>'+
 '<h3 class="ml-theme-list-heading">Sınıflarım <small>8 sınıf</small></h3>'+
 groups.map(g=>renderGrade(g,active)).join('')+'</section>';
 const parent=window.dmViewHistory?.capture(),before=document.activeElement;
 const close=()=>{el.remove();window.dmViewHistory?.leave(el);before?.focus?.({preventScroll:true});};
 document.body.append(el);window.dmViewHistory?.track(el,{parent,close});
 el.querySelectorAll('[data-school-close]').forEach(b=>b.onclick=close);
 el.onclick=e=>{if(e.target===el)close();};
 el.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const options=[...el.querySelectorAll('button:not(:disabled),summary')].filter(x=>x.getClientRects().length),idx=options.indexOf(document.activeElement);if(options.length){e.preventDefault();options[(idx+(e.shiftKey?-1:1)+options.length)%options.length]?.focus();}}};
 el.querySelectorAll('[data-school-b]').forEach(btn=>btn.onclick=()=>{const step=steps.find(s=>String(s.b)===btn.dataset.schoolB&&String(s.d)===btn.dataset.schoolD);if(!step||!step.available)return;if(!window.dmViewHistory)close();launchStep(step);});
 el.querySelector('[data-school-close]')?.focus({preventScroll:true});
 if(gradeHint)el.querySelector('.rt-school-grade:nth-of-type('+active+')')?.scrollIntoView?.({block:'nearest'});
}
// Original school stop buttons retain ownership of question creation and rewards.
function launchStep(step){
 if(!step?.available||!currentRoute())return;
 if(typeof window.dmSchoolStopOpen==='function'){
  window.dmSchoolStopOpen(Number(step.b),Number(step.d));return;
 }
 const host=document.getElementById('dmParkurScroll');
 const target=host?.querySelector('.dm-adventure-node[data-b="'+step.b+'"][data-d="'+step.d+'"]');
 target?.click();
}
let lastIntroMascot='',introSerial=0;
function nextIntroMascot(){
 let last=lastIntroMascot;try{last=sessionStorage.getItem('dm-school-last-intro-character')||last;}catch{}
 const choices=characters.filter(v=>v!==last);
 const selected=choices[Math.floor(Math.random()*choices.length)]||characters[0];
 lastIntroMascot=selected;
 try{sessionStorage.setItem('dm-school-last-intro-character',selected);}catch{}
 return selected;
}
function decorateEntrance(){
 if(!currentRoute())return;
 const entry=document.querySelector('.sp-adventure-entry');
 if(!entry||entry.dataset.dmSchoolIntro)return;
 const card=entry.querySelector('.bz-alt-kart,.sp-start-card,.bz-panel-kart');
 const start=entry.querySelector('#bzOyna');
 if(!card||!start)return;
 const name=nextIntroMascot();
 entry.classList.add('dm-school-start');
 entry.dataset.dmSchoolIntro=String(++introSerial);
 entry.dataset.schoolAppearance=theme();
 card.insertAdjacentHTML('afterbegin','<div class="dm-school-intro-head" aria-hidden="true"><img src="learning-assets/characters/'+name+'.webp" alt="" decoding="async"><small>✦ OKUL YOLUM · MACERA PARKURU ✦</small></div>');
 if(!start.disabled&&!/tekrar/i.test(start.textContent))start.textContent='🚩 Macera Parkuruna Başla →';
}
function decorateQuestion(){
 if(!currentRoute())return;
 const modal=document.getElementById('bzPerde');
 if(!modal?.classList.contains('rq-approved')||!modal.querySelector('.bz-oyun'))return;
 modal.classList.add('dm-school-game');
 if(modal.dataset.schoolAppearance!==theme())modal.dataset.schoolAppearance=theme();
 const closer=modal.querySelector('#bzCik');
 let header=modal.querySelector('.dm-school-lesson-head');
 if(!header){
  header=document.createElement('header');header.className='dm-school-lesson-head';
  header.innerHTML='<button type="button" class="dm-school-back" data-school-exit aria-label="Macera haritasına dön">✕</button>'+
   '<div class="dm-school-lesson-title"><small>'+esc(lastContext.grade)+'. Sınıf · '+esc(lastContext.unit)+'. Ünite · '+esc(lastContext.part)+'. Durak</small><strong>Macera Parkuru</strong></div>'+
   '<button type="button" data-school-theme class="dm-school-head-theme" aria-label="Görünümü değiştir">'+(theme()==='night'?'☀️':'🌙')+'</button>';
  modal.prepend(header);
  header.querySelector('[data-school-exit]').onclick=()=>closer?.click();
 }
 let movement=modal.querySelector('.dm-school-question-nav');
 if(!movement){
  movement=document.createElement('nav');movement.className='dm-school-question-nav';movement.setAttribute('aria-label','Cevaplanmış sorular arasında gezin');
  movement.innerHTML='<button type="button" data-school-previous>← Önceki</button><span>Yanıtlananları incele</span><button type="button" data-school-next disabled>Sonraki →</button>';
  (modal.querySelector('.rq-hud')||header).after(movement);
  movement.querySelector('[data-school-previous]').onclick=()=>{const review=modal.querySelector('#bzInceleme');if(review&&review.style.display!=='none')review.querySelector('#bzIncOnce:not(:disabled)')?.click();else modal.querySelector('#bzGeriSoru:not(:disabled)')?.click();};
  movement.querySelector('[data-school-next]').onclick=()=>{const review=modal.querySelector('#bzInceleme');if(review&&review.style.display!=='none')review.querySelector('#bzIncSonra:not(:disabled)')?.click();else modal.querySelector('#bzAlan .bz-btn.mor:not(:disabled)')?.click();};
 }
 // V4 single top bar: close · progress · energy · feather. Only existing nodes
 // move (their ids and click handlers stay intact); gold is hidden by CSS.
 const freshProgress=modal.querySelector('#bzAlan>.rq-progress');
 if(freshProgress){header.querySelectorAll('.rq-progress').forEach(x=>{if(x!==freshProgress)x.remove();});header.querySelector('.dm-school-back')?.after(freshProgress);}
 const wallet=modal.querySelector(':scope>.rq-hud');
 if(wallet)header.append(wallet);
 const review=modal.querySelector('#bzInceleme'),reviewVisible=!!(review&&review.style.display!=='none');
 movement.querySelector('[data-school-previous]').disabled=reviewVisible?!review.querySelector('#bzIncOnce:not(:disabled)'):!modal.querySelector('#bzGeriSoru:not(:disabled)');
 movement.querySelector('[data-school-next]').disabled=reviewVisible?!review.querySelector('#bzIncSonra:not(:disabled)'):!modal.querySelector('#bzAlan .bz-geri-bildirim ~ .bz-btn.mor:not(:disabled),#bzAlan .bz-btn.mor:not(:disabled)');
 const area=modal.querySelector('#bzAlan'),board=area?.querySelector('.sp-question-board');
 if(!area)return;
 const progress=modal.querySelector('.rq-progress span')?.textContent||'';
 const title=area.querySelector('.bz-etiket')?.textContent||'';
 const signature=progress+'|'+title;
 if(area.dataset.dmSchoolQuestion!==signature){
  area.dataset.dmSchoolQuestion=signature;
  const match=/\d+/.exec(progress);
  const index=match?Number(match[0])-1:0;
  const image=characters[(Math.max(0,index)+introSerial)%characters.length];
  modal.style.setProperty('--dm-school-question-art','url("learning-assets/characters/'+image+'.webp")');
 }
 if(board){
  board.classList.add('dm-school-question-board');
  const isTeach=area.dataset.rqKind==='teach';
  board.dataset.schoolTask=isTeach?'teach':'question';
  if(isTeach&&!board.querySelector('.dm-school-teach-message')){
   board.insertAdjacentHTML('beforeend','<div class="dm-school-teach-message"><h2>Yeni kelimelerle tanış</h2><p>Bu duraktaki kelimeleri dinle ve anlamlarını öğren.</p></div>');
  }
 }

}
let designQueued=false;
function refreshDesign(){
 if(designQueued)return;designQueued=true;
 requestAnimationFrame(()=>{designQueued=false;decorateEntrance();decorateQuestion();});
}
if(typeof MutationObserver==='function'){
 const relevantSelectors='#bzPerde,.sp-adventure-entry';
 const observer=new MutationObserver(items=>{
  if(!currentRoute())return;
  const relevant=items.some(m=>{
   if(m.target?.closest?.(relevantSelectors))return true;
   return Array.from(m.addedNodes||[]).some(n=>n.nodeType===1&&
     (n.matches?.(relevantSelectors)||n.querySelector?.(relevantSelectors)));
  });
  if(relevant)refreshDesign();
 });
 observer.observe(document.body,{childList:true,subtree:true});
}
document.addEventListener('dm:login',()=>{lastIntroMascot='';introSerial=0;});
const scene=window.dmParkurSahne;
if(typeof scene==='function'){
 window.dmParkurSahne=function(data={}){
  const html=scene.call(this,data);
  if(!currentRoute())return html;
  const prefix='class="rt-root rt-school"';
  if(!html.includes(prefix))return html;
  // Keep the same compact banner / weekly goal / 3-stop map as Learning Path.
  // The full school grades belong exclusively to the separate explorer dialog.
  steps=Array.isArray(data.allSteps)&&data.allSteps.length?data.allSteps:(data.steps||[]);
  const info=parse((data.steps||[])[data.current||0]);lastContext={grade:info.grade||1,unit:info.unit||1,part:info.part||1};
 const grade=parse((data.steps||[])[data.current||0]).grade||1;
  const displayMascot=characters[(grade*3+(visit++))%characters.length];
  if(html.includes('data-route-design="3"'))return html;
  const themed=html.replace(prefix,prefix+' data-school-appearance="'+theme()+'"')
    .replaceAll('src="route-assets/papi-school.webp"','src="learning-assets/characters/'+displayMascot+'.webp"');
  // Small theme control stays inside the banner, rather than taking an extra row.
  const toggle='<button type="button" class="rt-school-home-theme" data-school-theme aria-label="Okul Yolum görünümünü değiştir">'+(theme()==='night'?'☀️':'🌙')+'</button>';
  return themed.replace('<button type="button" class="rt-all-link"',toggle+'<button type="button" class="rt-all-link"');
 };
}
document.addEventListener('click',e=>{
 const stop=e.target.closest('[data-school-b][data-school-d]');
 if(stop&&!stop.disabled&&currentRoute()&&!stop.closest('#mlThemeList')){
  e.preventDefault();e.stopPropagation();const step=steps.find(x=>String(x.b)===stop.dataset.schoolB&&String(x.d)===stop.dataset.schoolD);launchStep(step);return;
 }
 const toggle=e.target.closest('[data-school-theme]');
 if(toggle){e.preventDefault();e.stopPropagation();themeSet(theme()==='night'?'day':'night');return;}
 const openButton=e.target.closest('[data-school-open]');
 if(openButton){e.preventDefault();e.stopPropagation();if(currentRoute())open(steps,Number(openButton.dataset.schoolGrade)||null);}
});
if(!document.getElementById('dm-school-journey-css')){
 const link=document.createElement('link');link.id='dm-school-journey-css';link.rel='stylesheet';link.href='school-journey.css?v=20261017-1';document.head.append(link);
}
if(!document.getElementById('dm-school-adventure-v2-css')){
 const link=document.createElement('link');link.id='dm-school-adventure-v2-css';link.rel='stylesheet';link.href='school-adventure-v2.css?v=20261017-home-restore-3';document.head.append(link);
}
if(!document.getElementById('dm-parkur-history-ui-css')){
 const link=document.createElement('link');link.id='dm-parkur-history-ui-css';link.rel='stylesheet';link.href='parkur-question-parity.css?v=20261017-lesson-2';document.head.append(link);
}
// Loaded last so the calm single-frame question design wins over older layers.
if(!document.getElementById('dm-school-question-v4-css')){
 const link=document.createElement('link');link.id='dm-school-question-v4-css';link.rel='stylesheet';link.href='school-question-v4.css?v=20261022-1';document.head.append(link);
}
window.dmSchoolJourney={open,preview,theme,themeSet,group,parse,launchStep};
})();
