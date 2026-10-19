/* Read-only mission views; progress and league rewards come from the server. */
(()=>{'use strict';
let owner='',value=null;
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const goals={daily:[['route','1 bölüm tamamla',1,'path'],['game','1 oyun oyna',1,'game'],['review','3 kelime tekrar et',3,'book']],weekly:[['route','10 bölüm tamamla',10,'path'],['game','20 oyun oyna',20,'game'],['days','5 gün çalış',5,'goal']]};
window.dmRouteMissions={set(data,name){if(name!==who())return;owner=name;value=data||null;window.dmRefreshRouteCards?.();celebrate();},markup(period){const data=owner===who()?value?.[period]:null;return '<section class="'+(period==='daily'?'rt-tasks':'rt-week')+' rt-card rt-missions" aria-label="'+(period==='daily'?'Günün 3 Görevi':'Haftanın 3 Görevi')+'"><div class="rt-task-list">'+goals[period].map(([event,label,target,icon])=>{const count=data?Math.min(target,Math.max(0,Number(data[event])||0)):null;return '<button type="button" data-rt="task" data-event="'+event+'" aria-label="'+label+' · '+(count===null?'yükleniyor':count+'/'+target)+'"><img src="route-assets/'+icon+'.svg" alt=""><span class="rt-mission-copy"><b>'+label+'</b><progress max="'+target+'" value="'+(count||0)+'" aria-label="'+label+' ilerlemesi"></progress></span><span class="rt-mission-count">'+(count===null?'…':count+'/'+target)+'</span><span aria-hidden="true">›</span></button>';}).join('')+'</div></section>';}};

/* All three daily missions done: celebrate once per student per day and preview tomorrow. Waits while an activity is open. */
const today=()=>new Date(Date.now()+10800000).toISOString().slice(0,10);
function dailyDone(){const d=value?.daily;return !!d&&goals.daily.every(([event,,target])=>(Number(d[event])||0)>=target);}
function ddStyle(){if(document.getElementById('dm-daily-done-style'))return;const s=document.createElement('style');s.id='dm-daily-done-style';s.textContent='#dmDailyDone{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;padding:16px;background:#0f2a3a66;animation:ddIn .25s ease-out}#dmDailyDone .dd-card{width:min(360px,100%);background:#fffdf5;border:2px solid #f6d77a;border-radius:24px;padding:20px 18px;text-align:center;color:#17324d;font:600 14px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 18px 50px #0f2a3a40}#dmDailyDone img{width:120px;height:120px;object-fit:contain;margin:-6px auto 4px;display:block}#dmDailyDone h2{margin:0 0 6px;font:900 20px/1.25 system-ui,sans-serif;color:#0e6251}#dmDailyDone p{margin:0 0 12px}#dmDailyDone .dd-next{display:grid;gap:6px;text-align:left;background:#eef9f3;border-radius:16px;padding:12px 14px;margin-bottom:14px}#dmDailyDone .dd-next b{font-weight:900;color:#0e6251}#dmDailyDone button{border:0;border-radius:14px;padding:12px 16px;width:100%;background:#1d9e75;color:#fff;font:900 15px system-ui,sans-serif;cursor:pointer;min-height:44px}@keyframes ddIn{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){#dmDailyDone{animation:none}}';document.head.append(s);}
let celebrateTimer=0;const stopTimer=()=>{if(celebrateTimer&&typeof clearTimeout==='function')clearTimeout(celebrateTimer);celebrateTimer=0;};
function celebrate(tries=0){
 stopTimer();if(!owner||typeof document==='undefined'||!document.body||owner!==who()||!dailyDone())return;
 const key='dm_daily_done:'+owner.toLowerCase();let seen='';try{seen=localStorage.getItem(key)||'';}catch{}
 if(seen===today()||document.getElementById('dmDailyDone'))return;
 if((window.dmFirstDiscovery?.activityOpen?.()||document.hidden)&&tries<40&&typeof setTimeout==='function'){celebrateTimer=setTimeout(()=>celebrate(tries+1),3000);return;}
 try{localStorage.setItem(key,today());}catch{}
 ddStyle();
 const box=document.createElement('div');box.id='dmDailyDone';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','dmDailyDoneTitle');
 box.innerHTML='<div class="dd-card"><img src="papi-reward-v2.png" width="120" height="120" alt=""><h2 id="dmDailyDoneTitle">Bugünün 3 görevi tamam! 🎉</h2><p>Bir bölüm, bir oyun ve kelime tekrarı… Papi seninle gurur duyuyor.</p><div class="dd-next"><b>Yarın seni bekleyenler</b><span>🗺️ Parkurda yeni bir bölüm</span><span>🎮 Yeni bir oyun turu</span><span>🔁 Unutmadan önce kelime tekrarı</span></div><button type="button">Harika, yarın görüşürüz!</button></div>';
 const close=()=>{box.remove();document.removeEventListener('keydown',esc);};const esc=e=>{if(e.key==='Escape')close();};
 box.querySelector('button').onclick=close;box.addEventListener('click',e=>{if(e.target===box)close();});document.addEventListener('keydown',esc);
 document.body.append(box);box.querySelector('button').focus({preventScroll:true});
}
document.addEventListener('dm:login',()=>{owner='';value=null;stopTimer();});
})();
