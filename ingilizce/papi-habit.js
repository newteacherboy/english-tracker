/* Papi habit layer: a daily greeting, a gentle break suggestion after 30 active minutes and a Sunday week summary.
   Client-only and read-only: no rewards, no currency, no server writes. Each prompt shows at most once per student per day/week,
   never during an open activity, and never uses guilt or countdown language. */
(()=>{'use strict';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const member=()=>{const n=who();return !!n&&n.toLowerCase()!=='teacher'&&!window.dmGuestMode;};
const dayOf=t=>new Date(t+10800000).toISOString().slice(0,10);
const today=()=>dayOf(Date.now());
const weekKey=()=>{const d=new Date(Date.now()+10800000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
const isSunday=()=>new Date(Date.now()+10800000).getUTCDay()===0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k){try{return localStorage.getItem(k)||'';}catch{return '';}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const key=(name)=>'dm_habit_'+name+':'+who().toLowerCase();
const busy=()=>!!(window.dmFirstDiscovery?.activityOpen?.()||document.hidden||document.querySelector('#dmDailyDone,#dmMissionReward,#dmWeekDone,#suStudyResult,.dc-fullscreen-overlay.active'));
const later=(fn,ms)=>typeof setTimeout==='function'?setTimeout(fn,ms):0;

function style(){
 if(document.getElementById('dm-papi-habit-style'))return;
 const s=document.createElement('style');s.id='dm-papi-habit-style';
 s.textContent='.dm-habit-card{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483630;box-sizing:border-box;width:min(420px,calc(100vw - 24px));display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:#fffdf5;border:2px solid #cfeedd;border-radius:20px;box-shadow:0 10px 30px #0f2a3a26;color:#17324d;font:600 14px/1.45 system-ui,-apple-system,sans-serif;animation:dmHabitIn .3s ease-out}'+
 '.dm-habit-card img{width:52px;height:52px;object-fit:contain;flex-shrink:0}.dm-habit-card b{display:block;font-weight:900;color:#0e6251;margin-bottom:2px}.dm-habit-card p{margin:0}'+
 '.dm-habit-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.dm-habit-actions button{border:0;border-radius:12px;padding:9px 12px;min-height:40px;font:800 13px system-ui,sans-serif;cursor:pointer;background:#1d9e75;color:#fff}.dm-habit-actions button.ghost{background:#eef6f2;color:#0e6251}'+
 '.dm-habit-x{margin-left:auto;border:0;background:transparent;color:#5b7083;font:24px system-ui;min-width:36px;min-height:36px;cursor:pointer;line-height:1}'+
 '#dmWeekDone{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;padding:16px;background:#0f2a3a66}#dmWeekDone .wd-card{box-sizing:border-box;width:min(360px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;background:#fffdf5;border:2px solid #c9b8f5;border-radius:24px;padding:20px 18px;text-align:center;color:#17324d;font:600 14px/1.45 system-ui,sans-serif}'+
 '#dmWeekDone img{width:110px;height:110px;object-fit:contain}#dmWeekDone h2{margin:4px 0 6px;font:900 20px/1.25 system-ui,sans-serif;color:#553088}#dmWeekDone .wd-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}#dmWeekDone .wd-stats span{background:#f1ebff;border-radius:14px;padding:10px 4px;font-size:12px}#dmWeekDone .wd-stats b{display:block;font-size:22px;color:#553088}'+
 '#dmWeekDone button{border:0;border-radius:14px;padding:12px;width:100%;min-height:44px;background:#7c3aed;color:#fff;font:900 15px system-ui,sans-serif;cursor:pointer}'+
 '@keyframes dmHabitIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}@media (prefers-reduced-motion:reduce){.dm-habit-card{animation:none}}';
 document.head.append(s);
}

/* Small, non-blocking card that dismisses itself. */
function card(id,img,title,text,actions=[],autoHideMs=12000){
 document.getElementById(id)?.remove();style();
 const el=document.createElement('aside');el.id=id;el.className='dm-habit-card';el.setAttribute('role','status');
 el.innerHTML='<img src="'+img+'" alt="" width="52" height="52"><div><b>'+esc(title)+'</b><p>'+esc(text)+'</p>'+(actions.length?'<div class="dm-habit-actions">'+actions.map((a,i)=>'<button type="button" data-i="'+i+'"'+(a.ghost?' class="ghost"':'')+'>'+esc(a.label)+'</button>').join('')+'</div>':'')+'</div><button type="button" class="dm-habit-x" aria-label="Kapat">×</button>';
 const close=()=>el.remove();
 el.querySelector('.dm-habit-x').onclick=close;
 el.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{close();actions[+b.dataset.i].run?.();});
 document.body.append(el);if(autoHideMs)later(()=>{if(el.isConnected&&!el.matches(':hover,:focus-within'))close();},autoHideMs);
 return el;
}

/* 1) Daily greeting: welcome back without guilt, celebrate the streak, point at words due for review. */
let status=null,review=null,greetTimer=0;
function greet(tries=0){
 if(!member()||!status||status.owner!==who())return;
 const k=key('greet');if(store.get(k)===today())return;
 if(busy()&&tries<20){greetTimer=later(()=>greet(tries+1),3000);return;}
 const lastSeen=store.get(key('seen')),name=who(),streak=Number(status.loginStreak)||0;
 const gap=lastSeen?Math.round((Date.parse(today())-Date.parse(lastSeen))/86400000):0;
 let title,text;
 if(gap>=3){title='Seni özledim, '+name+'! 🦜';text='Kaldığın yerden birlikte devam edelim. Küçük bir adım bile yeter.';}
 else if(streak>=2){title=streak+'. gün, harika gidiyorsun!';text='Her gün biraz çalışmak kelimeleri kalıcı yapar.';}
 else{title='Merhaba '+name+'! 🦜';text='Bugün ne öğrenelim? Günün 3 görevi seni bekliyor.';}
 const due=Number(review?.due)||0,actions=[];
 if(due>0&&typeof window.dmWrongWords?.review==='function'){text+=' Tekrar zamanı gelen '+due+' kelimen var.';actions.push({label:'🔁 Kelimeleri tekrar et',run:()=>window.dmWrongWords.review({limit:Math.min(due,5)})});}
 store.set(k,today());store.set(key('seen'),today());
 card('dmHabitGreet','papi-welcome-v2.png',title,text,actions);
}

/* 2) Gentle break after 30 active minutes in a day (counted only while the child is actually interacting). */
const BREAK_AFTER=30*60;let tick=0;
function countActive(){
 if(!member()||document.hidden)return;
 const last=Number(window.dmLastActiveAt)||0;if(!last||Date.now()-last>90000)return;
 const k=key('active:'+today());const s=(Number(store.get(k))||0)+15;store.set(k,String(s));
 if(s>=BREAK_AFTER)offerBreak();
}
function offerBreak(){
 const k=key('break');if(store.get(k)===today()||busy())return;
 store.set(k,today());
 card('dmHabitBreak','papi-help-v2.png','Bugün 30 dakika çalıştın 🌟','Gözlerini dinlendirmek için kısa bir mola iyi gelir. Biraz su iç, esne; Papi burada seni bekler.',[{label:'Tamam, mola veriyorum'},{label:'Biraz daha devam',ghost:true}],0);
}

/* 3) Sunday summary of the week, once per week. Only shown when the week has real activity. */
function weekSummary(tries=0){
 if(!member()||!isSunday())return;
 const k=key('week');if(store.get(k)===weekKey()||document.getElementById('dmWeekDone'))return;
 const w=window.dmRouteMissions?.data?.('weekly');if(!w)return;
 const route=Number(w.route)||0,game=Number(w.game)||0,days=Number(w.days)||0;if(!route&&!game&&!days)return;
 if(busy()&&tries<20){later(()=>weekSummary(tries+1),3000);return;}
 store.set(k,weekKey());style();
 const box=document.createElement('div');box.id='dmWeekDone';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','dmWeekDoneTitle');
 box.innerHTML='<div class="wd-card"><img src="papi-reward-v2.png" alt="" width="110" height="110"><h2 id="dmWeekDoneTitle">Haftanın özeti 🏅</h2><p>Bu hafta emek verdin, Papi seninle gurur duyuyor!</p><div class="wd-stats"><span><b>'+route+'</b>bölüm</span><span><b>'+game+'</b>oyun</span><span><b>'+days+'</b>gün</span></div><p>Yeni hafta yarın başlıyor; yeni bölümler ve oyunlar seni bekliyor.</p><button type="button">Süper!</button></div>';
 const close=()=>{box.remove();document.removeEventListener('keydown',escClose);};const escClose=e=>{if(e.key==='Escape')close();};
 box.querySelector('button').onclick=close;box.addEventListener('click',e=>{if(e.target===box)close();});document.addEventListener('keydown',escClose);
 document.body.append(box);box.querySelector('button').focus({preventScroll:true});
}

document.addEventListener('dm:member-status',()=>{const d=window.dmMemberBadgeStatus;if(!d||d.owner!==who())return;status=d;later(()=>greet(),4000);});
document.addEventListener('dm:companion-summary',e=>{const d=e.detail||{};if(d.owner!==who())return;review=d.review;later(()=>weekSummary(),6000);});
document.addEventListener('dm:login',()=>{status=null;review=null;if(greetTimer&&typeof clearTimeout==='function')clearTimeout(greetTimer);['dmHabitGreet','dmHabitBreak','dmWeekDone'].forEach(id=>document.getElementById(id)?.remove());});
if(typeof setInterval==='function')tick=setInterval(countActive,15000);
window.dmPapiHabit={greet,offerBreak,weekSummary,countActive,BREAK_AFTER};
})();
