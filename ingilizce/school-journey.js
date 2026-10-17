/* The school-route navigator follows Learning Path's accordion layout, with its own color and theme. */
(()=>{'use strict';
if(window.dmSchoolJourney)return;
const characters=['bumbi','fora','kori','lumo','mimo','nori','pofin','tiko','vela','ziri'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const currentRoute=()=>window.dmLearningRoute?.purpose?.()==='school';
let visit=0,steps=[],entrySource=null;
const themeKey='dm-school-route-theme-v1';
function theme(){try{return localStorage.getItem(themeKey)==='night'?'night':'day'}catch{return 'day';}}
function themeSet(t){
 const choice=t==='night'?'night':'day';try{localStorage.setItem(themeKey,choice)}catch{}
 document.querySelectorAll('.rt-root.rt-school,.rt-school-modal').forEach(x=>x.dataset.schoolAppearance=choice);
 document.querySelectorAll('[data-school-theme]').forEach(b=>{b.textContent=choice==='night'?'☀️ Gündüz':'🌙 Gece';b.setAttribute('aria-label',choice==='night'?'Gündüz görünümüne geç':'Gece görünümüne geç');});
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
 const grade=summary.info.grade||1,unit=summary.info.unit||1,grades=group(rows);
 visit++;
 return '<section class="rt-school-journey" aria-label="Okul Yolum macera ekranı">'+
   '<div class="rt-school-journey-cover"><span class="rt-school-eyebrow">DİJİMEDU · OKUL YOLUM</span>'+
   '<div class="rt-school-cover-title"><div><h2>Macera Parkurum</h2><p>Sınıfları, üniteleri ve ödül duraklarını keşfet.</p></div>'+art(grade*7+unit,'rt-school-main-mascot')+'</div>'+
   '<div class="rt-school-cover-actions"><button type="button" data-school-open>🗺️ Tüm sınıfları gör <span aria-hidden="true">↗</span></button>'+
   '<button type="button" data-school-theme aria-label="Görünümü değiştir">'+(theme()==='night'?'☀️ Gündüz':'🌙 Gece')+'</button></div></div>'+
   '<div class="rt-school-current-unit">'+art(grade*5+unit+1,'rt-school-unit-mascot')+
   '<div><small>ŞU ANKİ MACERAN</small><h3>'+grade+'. Sınıf · '+unit+'. Ünite</h3><p>Başarıların korunuyor. Yeni duraklara kendi hızında ilerle.</p></div>'+
   '<span class="rt-school-unit-status">'+summary.done+' <small>✓</small></span></div>'+
   '<div class="rt-school-mini-grades">'+Array.from({length:8},(_,i)=>{const n=i+1;
    const g=grades[i],done=g.total>0&&g.total===g.completed;
    return '<button type="button" data-school-open data-school-grade="'+n+'" '+(n===grade?'aria-current="true"':'')+'><span>'+art(n*3,'rt-school-small-mascot')+'</span><b>'+n+'. Sınıf</b><small>'+(done?'✓ Tamam':g.total?g.completed+'/'+g.total:'Keşfet')+'</small></button>';
   }).join('')+'</div></section>';
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
 const first=steps.find(x=>x.available&&!x.done)||steps[0];
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
 const before=document.activeElement;
 const close=()=>{el.remove();before?.focus?.({preventScroll:true});};
 document.body.append(el);
 el.querySelectorAll('[data-school-close]').forEach(b=>b.onclick=close);
 el.onclick=e=>{if(e.target===el)close();};
 el.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const options=[...el.querySelectorAll('button:not(:disabled),summary')].filter(x=>x.getClientRects().length),idx=options.indexOf(document.activeElement);if(options.length){e.preventDefault();options[(idx+(e.shiftKey?-1:1)+options.length)%options.length]?.focus();}}};
 el.querySelectorAll('[data-school-b]').forEach(btn=>btn.onclick=()=>{
  const step=steps.find(s=>String(s.b)===btn.dataset.schoolB&&String(s.d)===btn.dataset.schoolD);
  if(!step||!step.available)return;
  close();
  const host=document.getElementById('dmParkurScroll');
  const target=host?.querySelector('.dm-adventure-node[data-b="'+step.b+'"][data-d="'+step.d+'"]');
  if(target)target.click();
  else window.dmSchoolStopOpen?.(+step.b,+step.d);
 });
 el.querySelector('[data-school-close]')?.focus({preventScroll:true});
 if(gradeHint)el.querySelector('.rt-school-grade:nth-of-type('+active+')')?.scrollIntoView?.({block:'nearest'});
}
const scene=window.dmParkurSahne;
if(typeof scene==='function'){
 window.dmParkurSahne=function(data={}){
  const html=scene.call(this,data);
  if(!currentRoute())return html;
  const prefix='class="rt-root rt-school"';
  if(!html.includes(prefix))return html;
  const card=preview(data);
  return html.replace(prefix,prefix+' data-school-appearance="'+theme()+'"')
    .replace('<section class="rt-week',card+'<section class="rt-week');
 };
}
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-school-theme]');
 if(toggle){e.preventDefault();e.stopPropagation();themeSet(theme()==='night'?'day':'night');return;}
 const openButton=e.target.closest('[data-school-open]');
 if(openButton){e.preventDefault();e.stopPropagation();if(currentRoute())open(steps,Number(openButton.dataset.schoolGrade)||null);}
});
if(!document.getElementById('dm-school-journey-css')){
 const link=document.createElement('link');link.id='dm-school-journey-css';link.rel='stylesheet';link.href='school-journey.css?v=20261017-2';document.head.append(link);
}
window.dmSchoolJourney={open,preview,theme,themeSet,group,parse};
})();
