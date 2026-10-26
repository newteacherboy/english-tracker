/* Diji Medu seasonal splash selector: synchronous first paint; no loading delay. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)api.install(root);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const holidays=[
  {id:'10-kasim',month:11,day:10,before:2,after:1,priority:100,variants:2},
  {id:'15-temmuz',month:7,day:15,before:2,after:2,priority:95,variants:1},
  {id:'ramazan-bayrami',religious:'ramadanEid',before:3,after:3,priority:80,variants:1},
  {id:'kurban-bayrami',religious:'kurbanEid',before:3,after:3,priority:80,variants:1},
  {id:'29-ekim',month:10,day:29,before:3,after:3,priority:60,variants:2},
  {id:'30-agustos',month:8,day:30,before:3,after:3,priority:50,variants:2},
  {id:'19-mayis',month:5,day:19,before:3,after:3,priority:50,variants:2},
  {id:'23-nisan',month:4,day:23,before:3,after:3,priority:50,variants:2},
  {id:'ramazan-ayi',religious:'ramadan',before:0,after:0,priority:10,variants:1}
 ];
 const imageNames={'15-temmuz':'15-temmuz-1','ramazan-bayrami':'ramazan-bayrami-1','kurban-bayrami':'kurban-bayrami-2','ramazan-ayi':'ramazan-ayi-2'};
 const end2026='2026-11-02';
 function addDays(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
 function turkeyDate(now){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
 function periodsFor(cal,rule,year){
  if(rule.religious)return cal?.periods?.[rule.religious]||[];
  return [year-1,year,year+1].map(y=>{const date=y+'-'+String(rule.month).padStart(2,'0')+'-'+String(rule.day).padStart(2,'0');return [date,date];});
 }
 function resolve(date,calendar){
  const today=turkeyDate(date), year=+today.slice(0,4);
  // 2026 is an intentionally extended 29 Ekim campaign (22 Oct–2 Nov);
  // display the user's approved variant 2, not the superseded legacy splash.
  if(today>='2026-10-22'&&today<=end2026){
   return {id:'29-ekim',year:2026,variant:2,priority:60,file:'29-ekim-2.jpg',today};
  }
  let best=null;
  for(const rule of holidays){
   for(const [from,to] of periodsFor(calendar,rule,year)){
    if(today<addDays(from,-rule.before)||today>addDays(to,rule.after))continue;
    if(best&&best.priority>=rule.priority)continue;
    const eventYear=+from.slice(0,4);
    const number=rule.variants===2?(eventYear%2===1?1:2):1;
    const file=imageNames[rule.id]||(rule.id+'-'+number);
    best={id:rule.id,year:eventYear,variant:number,priority:rule.priority,file:file+'.jpg',today};
   }
  }
  return best;
 }
 function install(win){
  const doc=win.document;
  const src=doc.currentScript?.src||new URL('holiday-splash.js',doc.baseURI).href;
  const base=new URL('.',src);
  let calendar=win.DM_HOLIDAY_DATES||{periods:{}};
  try{
   const saved=JSON.parse(win.localStorage.getItem('dm-holiday-calendar'));
   if(saved?.periods&&Number(saved?.verified?.replace(/-/g,''))>Number(calendar.verified?.replace(/-/g,'')))calendar=saved;
  }catch(_){}
  const chosen=resolve(new Date(),calendar);
  if(chosen){
   // Same approved art and dimensions, encoded as WebP to reduce the cold download.
   const file=chosen.file==='29-ekim-2.jpg'?'29-ekim-2.webp':chosen.file;
   const image=new URL(file,base).href;
   doc.documentElement.classList.add('dm-holiday-active');
   doc.documentElement.style.setProperty('--dm-holiday-art','url("'+image+'")');
   doc.documentElement.dataset.dmHoliday=chosen.id;
   doc.documentElement.dataset.dmHolidayVariant=String(chosen.variant);
   const preload=doc.createElement('link');preload.rel='preload';preload.as='image';preload.href=image;doc.head.appendChild(preload);
   // The three approved originals now contain the genuine archival Atatürk photograph.
  }
  const current=win.DM_HOLIDAY_DATES?.verified||'';
  function syncRemote(){
   try{
    const key='dm-holiday-last-check',last=Number(win.localStorage.getItem(key)||0);
    if(Date.now()-last<24*60*60*1000)return;
    win.localStorage.setItem(key,String(Date.now()));
    // Refreshed by a scheduled GitHub Action, independent of GitHub Pages caches.
    const url='https://raw.githubusercontent.com/newteacherboy/english-tracker/main/ingilizce/holiday-splashes/dates.json';
    win.fetch(url,{cache:'no-store',signal:win.AbortSignal?.timeout?.(8000)}).then(r=>{if(!r.ok)throw Error('calendar offline');return r.json();}).then(data=>{
     if(data?.periods&&/^\d{4}-\d{2}-\d{2}$/.test(data.verified)&&data.verified>=current){
      win.localStorage.setItem('dm-holiday-calendar',JSON.stringify(data));
     }
    }).catch(()=>{win.localStorage.removeItem(key);});
   }catch(_){}
  }

  function attach(){
   for(const id of ['splashEkrani','dmBootSplash','oturumYuklemeOverlay']){
    const screen=doc.getElementById(id);
    if(!screen||!chosen||screen.querySelector?.('.dm-holiday-art'))continue;
    const frame=doc.createElement('div');frame.className='dm-holiday-art';
    frame.setAttribute('aria-label','Diji Medu '+chosen.id+' özel giriş tasarımı');
    screen.insertBefore(frame,screen.firstChild);
    const bar=doc.createElement('div');bar.className='dm-holiday-progress';bar.setAttribute('aria-hidden','true');
    bar.innerHTML='<div class="dm-holiday-progress-fill"></div>';
    frame.appendChild(bar);
   }
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
  if(typeof win.requestIdleCallback==='function')win.requestIdleCallback(syncRemote);else win.addEventListener('load',syncRemote,{once:true});
  // In long-running single-page sessions, re-evaluate at local midnight.
  if(chosen&&typeof win.setInterval==='function')win.setInterval(()=>{
   const next=resolve(new Date(),calendar);
   if((next?.file||'')!==(chosen?.file||''))win.location.reload();
  },60*60*1000);
 }
 return {resolve,turkeyDate,addDays,holidays,install};
});
