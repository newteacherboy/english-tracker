/* Mission views. Progress comes from the server; daily and weekly rewards are verified and credited by the server once per period. */
(()=>{'use strict';
let owner='',value=null;
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const goals={daily:[['route','1 bölüm tamamla',1,'path'],['game','1 oyun oyna',1,'game'],['review','3 kelime tekrar et',3,'book']],weekly:[['route','10 bölüm tamamla',10,'path'],['game','20 oyun oyna',20,'game'],['days','5 gün çalış',5,'goal']]};
/* Rewards shown on the button and in the announcement; the server decides and credits the same amounts. */
const PERIOD={
 daily:{op:'gunlukGorevOdul',gold:30,xp:70,chips:['1 bölüm','1 oyun','3 tekrar'],cls:'rt-tasks',label:'Günün 3 Görevi',
  title:'Bugünün 3 görevi tamam! 🎉',text:'Bir bölüm, bir oyun ve kelime tekrarı… Papi seninle gurur duyuyor.',nextTitle:'Yarın seni bekleyenler',
  next:['🗺️ Parkurda yeni bir bölüm','🎮 Yeni bir oyun turu','🔁 Unutmadan önce kelime tekrarı'],done:'✅ Ödül alındı · yarın yeni görevler seni bekliyor',again:'Bugünün ödülünü zaten aldın. Yarın yeni görevler gelecek!',close:'Harika, yarın görüşürüz!'},
 weekly:{op:'haftalikGorevOdul',gold:100,xp:120,chips:['10 bölüm','20 oyun','5 gün'],cls:'rt-week',label:'Haftanın 3 Görevi',
  title:'Haftanın 3 görevi tamam! 🏆',text:'10 bölüm, 20 oyun ve 5 gün çalışma… Bu hafta harikaydın!',nextTitle:'Yeni hafta seni bekliyor',
  next:['🗺️ Yeni bölümler ve hikâyeler','🎮 Yeni oyun turları','🏅 Yeni haftalık ödül'],done:'✅ Haftalık ödül alındı · pazartesi yeni görevler',again:'Bu haftanın ödülünü zaten aldın. Pazartesi yeni görevler gelecek!',close:'Süper, yeni haftada görüşürüz!'}
};
const today=()=>new Date(Date.now()+10800000).toISOString().slice(0,10);
const monday=()=>{const d=new Date(Date.now()+10800000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
const stamp=period=>period==='weekly'?monday():today();
const store={get(k){try{return localStorage.getItem(k)||'';}catch{return '';}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const claimKey=period=>'dm_'+(period==='weekly'?'weekly':'daily')+'_claim:'+who().toLowerCase();
const claimed=period=>store.get(claimKey(period))===stamp(period);
function done(period){const d=owner===who()?value?.[period]:null;return !!d&&goals[period].every(([event,,target])=>(Number(d[event])||0)>=target);}
const member=()=>{const n=who();return !!n&&n.toLowerCase()!=='teacher'&&!(typeof window!=='undefined'&&window.dmGuestMode);};

/* Cards render before the summary arrives on first load: ask for it once instead of showing "…" until a tap. */
let lastAsk=0;
function askForData(){
 if(!member()||typeof setTimeout!=='function'||Date.now()-lastAsk<10000)return;lastAsk=Date.now();
 setTimeout(()=>{if(!(owner===who()&&value))window.dmLearningCompanion?.refresh?.()?.catch?.(()=>{});},0);
}

/* Visual-only refresh: mission state, events and reward handling are unchanged. */
function missionVisualStyle(){
 if(document.getElementById('dm-mission-visual-v2'))return;
 const s=document.createElement('style');s.id='dm-mission-visual-v2';
 s.textContent=`
.rt-missions.rt-done.dm-mission-v2{box-sizing:border-box!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:center!important;gap:9px!important;padding:10px 14px!important;overflow:hidden!important;background:linear-gradient(155deg,#fff 0%,#fbfaff 100%)!important;border-radius:17px!important}
.dm-mission-v2 .rt-done-summary{width:100%!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;margin:0!important;padding:0!important;position:relative!important;isolation:isolate!important}
.dm-mission-v2 .rt-done-summary:before{content:"";position:absolute;z-index:-1;left:15%;right:15%;top:23px;height:5px;background:#e4ddfb;border-radius:9px}
.dm-mission-v2 .rt-done-summary span{min-width:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:3px!important;padding:0!important;background:transparent!important;border:0!important;color:#31206c!important;font:800 11px/1.2 system-ui,sans-serif!important;text-align:center!important;box-shadow:none!important}
.dm-mission-v2 .dm-task-medallion{display:grid;place-items:center;position:relative;width:48px;height:48px;border-radius:50%;font-size:24px;box-shadow:0 3px 8px #352a6430,inset 0 2px 4px #ffffff70;border:3px solid #fff;color:#fff}
.dm-mission-v2 .dm-task-medallion:after{content:"✓";position:absolute;right:-5px;top:-5px;width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:#22c66d;color:#fff;font:bold 12px system-ui;box-shadow:0 1px 4px #195d3a50;border:2px solid white}
.dm-mission-v2 .dm-medal-0{background:linear-gradient(145deg,#ffdc68,#f8a81c)}
.dm-mission-v2 .dm-medal-1{background:linear-gradient(145deg,#9b6afa,#6929db)}
.dm-mission-v2 .dm-medal-2{background:linear-gradient(145deg,#55d8f9,#158edb)}
.dm-mission-v2 .dm-task-caption{display:block!important;max-width:100%;padding:3px 8px;border-radius:15px;background:#f0ebff;color:#30206a;white-space:nowrap}
.dm-mission-v2 .rt-claim-done{box-sizing:border-box!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:2px!important;min-height:40px!important;margin:0!important;padding:5px 8px!important;border:0!important;border-radius:13px!important;background:linear-gradient(110deg,#159e91,#0e9a70)!important;color:white!important;text-align:center!important;font:800 13px/1.2 system-ui,sans-serif!important;box-shadow:none!important}
.dm-mission-v2 .dm-claim-title{font-size:13px;font-weight:900}.dm-mission-v2 .dm-claim-sub{font-size:11px;font-weight:600;color:#eafff3}
.dm-mission-v2 .rt-claim{box-sizing:border-box!important;min-height:43px!important;margin:0!important;border-radius:13px!important;background:linear-gradient(110deg,#159e91,#0d9e70)!important;color:#fff!important;font-weight:900!important;box-shadow:0 3px 7px #159e9130!important}
.dm-mission-v2 .rt-claim small{color:#eafff3!important}
/* Reference 2: connected oversized round medallions, floating labels, emerald chest reward. */
.rt-missions.rt-done.dm-mission-v2{min-height:0!important;height:100%!important;gap:8px!important;padding:10px 12px 12px!important;background:linear-gradient(180deg,#fff 5%,#faf9ff 100%)!important;border:1px solid #eee5ff!important;box-shadow:0 5px 16px #45308512!important}
.dm-mission-v2 .rt-done-summary{flex:1 1 auto!important;align-content:center!important;gap:5px!important}
.dm-mission-v2 .rt-done-summary:before{left:15%!important;right:15%!important;top:31px!important;height:6px!important;background:#e6e0fa!important}
.dm-mission-v2 .rt-done-summary>span{gap:4px!important}
.dm-mission-v2 .rt-done-summary .dm-task-medallion{box-sizing:border-box!important;width:62px!important;height:62px!important;font-size:28px!important;border:4px solid #fff!important;box-shadow:0 4px 10px #38256d30,inset 0 3px 5px #ffffff7d!important;text-shadow:0 2px 5px #0002!important;line-height:1!important}
.dm-mission-v2 .rt-done-summary .dm-task-medallion:after{width:21px!important;height:21px!important;top:-5px!important;right:-5px!important;font-size:13px!important}
.dm-mission-v2 .rt-done-summary .dm-task-caption{box-sizing:border-box!important;padding:4px 7px!important;min-width:0!important;background:linear-gradient(180deg,#f3efff,#ebe6fc)!important;border-radius:25px!important;box-shadow:0 2px 4px #6d4ca01c!important;color:#2b216c!important;font:800 11px/1.1 system-ui,sans-serif!important}
.dm-mission-v2 .rt-claim-done,.dm-mission-v2 .rt-claim{position:relative!important;flex:0 0 auto!important;align-items:flex-start!important;text-align:left!important;justify-content:center!important;width:100%!important;min-height:49px!important;padding:7px 49px 7px 13px!important;margin:0!important;border-radius:15px!important;background:linear-gradient(105deg,#1daba3 0%,#13a37e 62%,#1dc68c 100%)!important;border:0!important;box-shadow:inset 0 1px 1px #ffffff55,0 4px 9px #147c7830!important;overflow:hidden!important;color:#fff!important}
.dm-mission-v2 .rt-claim-done:after{content:"🏆";position:absolute;right:7px;top:50%;transform:translateY(-50%);font-size:33px;filter:drop-shadow(0 2px 3px #30523355)}
.dm-mission-v2 .rt-claim:not(:disabled):after{content:"🎁";position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:27px}
.dm-mission-v2 .dm-claim-title{font:900 14px/1.25 system-ui,sans-serif!important}
.dm-mission-v2 .dm-claim-sub{font:600 10px/1.2 system-ui,sans-serif!important;color:#eafff4!important}
@media(max-width:480px){.rt-missions.rt-done.dm-mission-v2{padding:8px 9px!important;gap:6px!important}.dm-mission-v2 .rt-done-summary .dm-task-medallion{width:46px!important;height:46px!important;font-size:22px!important}.dm-mission-v2 .rt-done-summary:before{top:23px!important}.dm-mission-v2 .rt-done-summary .dm-task-caption{font-size:10px!important;padding:3px 4px!important}.dm-mission-v2 .rt-claim-done,.dm-mission-v2 .rt-claim{min-height:42px!important;padding:5px 41px 5px 11px!important}.dm-mission-v2 .rt-claim-done:after{font-size:27px}.dm-mission-v2 .dm-claim-title{font-size:12px!important}.dm-mission-v2 .dm-claim-sub{font-size:9px!important}}
@media(max-width:350px){.dm-mission-v2 .rt-done-summary .dm-task-medallion{width:40px!important;height:40px!important;font-size:20px!important}.dm-mission-v2 .rt-done-summary:before{top:20px!important}.dm-mission-v2 .rt-done-summary .dm-task-caption{font-size:9px!important}}
@media(prefers-reduced-motion:reduce){.dm-mission-v2 *{transition:none!important;animation:none!important}}
`;
 document.head.append(s);
}
function claimRow(period){
 const p=PERIOD[period];
 return claimed(period)
  ?'<p class="rt-claim-done" role="status"><span class="dm-claim-title">✓ '+(period==='daily'?'Ödül alındı':'Haftalık ödül alındı')+'</span><span class="dm-claim-sub">'+(period==='daily'?'Yarın yeni görevler seni bekliyor':'Pazartesi yeni görevler seni bekliyor')+'</span></p>'
  :'<button type="button" class="rt-claim" data-rt="claim-mission" data-period="'+period+'">🎁 Ödülünü Al <small>+'+p.gold+' 🪙 +'+p.xp+' XP</small></button>';
}

window.dmRouteMissions={
 finished(period){return (period==='daily'||period==='weekly')&&done(period)&&claimed(period);},
 /* Harita kartındaki rozet: alınmayı bekleyen ödül sayısı ve bitmemiş görev var mı */
 badge(){if(!member()||owner!==who()||!value){askForData();return null;}const periods=['daily','weekly'];return {claimable:periods.filter(p=>done(p)&&!claimed(p)).length,open:!done('daily')};},
 data(period){return owner&&owner===who()?(value?.[period]||null):null;},
 set(data,name){if(name!==who())return;owner=name;value=data||null;window.dmRefreshRouteCards?.();},
 markup(period){
  const data=owner===who()?value?.[period]:null;if(!data)askForData();const p=PERIOD[period];
  // All three done: a compact card (fits the fixed-height carousel) with the reward button or the claimed note.
  if(p&&done(period)){missionVisualStyle();return '<section class="'+p.cls+' rt-card rt-missions rt-done dm-mission-v2" aria-label="'+p.label+' tamamlandı"><div class="rt-done-summary">'+p.chips.map((x,i)=>'<span><span class="dm-task-medallion dm-medal-'+i+'" aria-hidden="true">'+(i===0?'📖':i===1?'🎮':'🔁')+'</span><span class="dm-task-caption">'+x+'</span></span>').join('')+'</div>'+claimRow(period)+'</section>';}
  return '<section class="'+(period==='daily'?'rt-tasks':'rt-week')+' rt-card rt-missions" aria-label="'+(period==='daily'?'Günün 3 Görevi':'Haftanın 3 Görevi')+'"><div class="rt-task-list">'+goals[period].map(([event,label,target,icon])=>{const count=data?Math.min(target,Math.max(0,Number(data[event])||0)):null;return '<button type="button" data-rt="task" data-event="'+event+'" aria-label="'+label+' · '+(count===null?'yükleniyor':count+'/'+target)+'"><img src="route-assets/'+icon+'.svg" alt=""><span class="rt-mission-copy"><b>'+label+'</b><progress max="'+target+'" value="'+(count||0)+'" aria-label="'+label+' ilerlemesi"></progress></span><span class="rt-mission-count">'+(count===null?'…':count+'/'+target)+'</span><span aria-hidden="true">›</span></button>';}).join('')+'</div></section>';
 }
};

/* Rotate the existing two mission tabs, without adding duplicate controls. */
let dmMissionTabChange=0,dmMissionLastPeriod='';
function dmCycleExistingMissionTabs(){
 if(document.hidden||!member())return;
 const candidates=Array.from(document.querySelectorAll('button,[role="tab"]')).filter(el=>!el.closest('[hidden],[aria-hidden="true"]')&&/^(?:📋\s*)?Günün 3 Görevi$|^(?:🎯\s*)?Haftanın 3 Görevi$/.test((el.textContent||'').trim()));
 const daily=candidates.find(el=>(el.textContent||'').includes('Günün 3 Görevi'));
 const weekly=candidates.find(el=>(el.textContent||'').includes('Haftanın 3 Görevi'));
 if(!daily||!weekly)return;
 const target=claimed('daily')&&done('daily')&&!(claimed('weekly')&&done('weekly'))?'weekly'
  :claimed('weekly')&&done('weekly')&&!(claimed('daily')&&done('daily'))?'daily':null;
 const active=el=>el.getAttribute('aria-selected')==='true'||el.classList.contains('active')||el.classList.contains('aktif')||el.classList.contains('selected');
 const current=active(daily)?'daily':active(weekly)?'weekly':dmMissionLastPeriod||'daily';
 const now=Date.now();
 if(target){
  if(target!==current){(target==='daily'?daily:weekly).click();dmMissionLastPeriod=target;}
  dmMissionTabChange=now;
  return;
 }
 if(now-dmMissionTabChange<5000)return;
 const next=current==='daily'?'weekly':'daily';
 (next==='daily'?daily:weekly).click();
 dmMissionLastPeriod=next;dmMissionTabChange=now;
}
if(typeof window!=='undefined'&&typeof window.setInterval==='function')window.setInterval(dmCycleExistingMissionTabs,1000);

/* Remove only the redundant short offline toast; retain Medu's detailed notice. */
function dmHideDuplicateOfflineToast(){
 if(navigator.onLine!==false)return;
 document.querySelectorAll('[role="alert"],[role="status"],.toast,.toast-message,.yo-toast').forEach(el=>{
  const msg=(el.textContent||'').replace(/\s+/g,' ').trim();
  if(msg.length>150||!/(internet yok|internet bağlantısı yok)/i.test(msg)||/Medu|Çevrimdışı mod/i.test(msg))return;
  if(el.querySelector('button,[role="button"],img'))return;
  el.style.setProperty('display','none','important');
 });
}
if(typeof window!=='undefined'&&typeof window.setInterval==='function')window.setInterval(dmHideDuplicateOfflineToast,1200);

/* Announcement shown after a successful claim, with the rewards that were just credited. */
function style(){
 if(document.getElementById('dm-mission-reward-style'))return;const s=document.createElement('style');s.id='dm-mission-reward-style';
 s.textContent='#dmMissionReward{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;padding:16px;background:#0f2a3a66;animation:mrIn .25s ease-out}'+
 '#dmMissionReward .mr-card{box-sizing:border-box;width:min(360px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;background:#fffdf5;border:2px solid #f6d77a;border-radius:24px;padding:20px 18px;text-align:center;color:#17324d;font:600 14px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 18px 50px #0f2a3a40}'+
 '#dmMissionReward.weekly .mr-card{border-color:#c9b8f5}#dmMissionReward img{width:120px;height:120px;object-fit:contain;margin:-6px auto 4px;display:block}'+
 '#dmMissionReward h2{margin:0 0 6px;font:900 20px/1.25 system-ui,sans-serif;color:#0e6251}#dmMissionReward.weekly h2{color:#553088}#dmMissionReward p{margin:0 0 12px}'+
 '#dmMissionReward .mr-rewards{display:flex;justify-content:center;gap:10px;margin:2px 0 14px}#dmMissionReward .mr-rewards span{display:flex;flex-direction:column;align-items:center;min-width:92px;padding:9px 12px;border-radius:16px;font-size:12px;font-weight:800;animation:mrPop .5s cubic-bezier(.2,1.6,.4,1) both}'+
 '#dmMissionReward .mr-rewards b{font-size:24px;line-height:1.1}#dmMissionReward .mr-gold{background:#fff0bc;color:#8a6212;animation-delay:.15s!important}#dmMissionReward .mr-xp{background:#e9e0ff;color:#553088;animation-delay:.3s!important}'+
 '#dmMissionReward .mr-offline{margin:0 0 10px;padding:8px 10px;border-radius:12px;background:#fff6dc;color:#7a5a12;font-size:12px;font-weight:800;line-height:1.35}#dmMissionReward .mr-next{display:grid;gap:6px;text-align:left;background:#eef9f3;border-radius:16px;padding:12px 14px;margin-bottom:14px}#dmMissionReward.weekly .mr-next{background:#f4efff}#dmMissionReward .mr-next b{font-weight:900;color:#0e6251}#dmMissionReward.weekly .mr-next b{color:#553088}'+
 '#dmMissionReward button{border:0;border-radius:14px;padding:12px 16px;width:100%;background:#1d9e75;color:#fff;font:900 15px system-ui,sans-serif;cursor:pointer;min-height:44px}#dmMissionReward.weekly button{background:#7c3aed}'+
 '@keyframes mrIn{from{opacity:0}to{opacity:1}}@keyframes mrPop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}@media (prefers-reduced-motion:reduce){#dmMissionReward,#dmMissionReward .mr-rewards span{animation:none}}';
 document.head.append(s);
}
function announce(period,gold,xp,queued){
 const p=PERIOD[period];document.getElementById('dmMissionReward')?.remove();style();
 const box=document.createElement('div');box.id='dmMissionReward';box.className=period;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','dmMissionRewardTitle');
 box.innerHTML='<div class="mr-card"><img src="papi-reward-v2.png" width="120" height="120" alt=""><h2 id="dmMissionRewardTitle">'+p.title+'</h2><p>'+p.text+'</p><div class="mr-rewards" aria-label="Kazandığın ödüller"><span class="mr-gold"><b>+'+gold+'</b>🪙 Altın</span><span class="mr-xp"><b>+'+xp+'</b>⭐ XP</span></div>'+(queued?'<p class="mr-offline" role="status">📶 Şu an internet yok — ödülün cihazına kaydedildi, bağlantı gelince hesabına eklenecek.</p>':'')+'<div class="mr-next"><b>'+p.nextTitle+'</b>'+p.next.map(x=>'<span>'+x+'</span>').join('')+'</div><button type="button">'+p.close+'</button></div>';
 const close=()=>{box.remove();document.removeEventListener('keydown',esc);};const esc=e=>{if(e.key==='Escape')close();};
 box.querySelector('button').onclick=close;box.addEventListener('click',e=>{if(e.target===box)close();});document.addEventListener('keydown',esc);
 document.body.append(box);box.querySelector('button').focus({preventScroll:true});
}

/* Claim: the server re-checks the missions and credits gold and XP once per period, then returns the wallet. */
let claiming=false;
async function claim(button){
 const period=button.dataset.period==='weekly'?'weekly':'daily',p=PERIOD[period];
 if(claiming||!member())return;claiming=true;
 const label=button.innerHTML;button.disabled=true;button.textContent='Ödül kaydediliyor…';
 try{
  // Offline: the reward is stored on the device and sent when the connection returns.
  const d=await (window.dmEkonomi?.odulIslem?.(p.op) ?? window.dmEkonomi?.islem?.(p.op));
  if(!d)throw Error('Ödül şu anda alınamadı, yeniden dene.');
  if(!d.ok)throw Error(d.mesaj||'Ödül şu anda alınamadı, yeniden dene.');
  store.set(claimKey(period),stamp(period));
  if(d.yo)window.dmApplyRewardState?.(d.yo,who());
  if(d.kuyrukta)announce(period,p.gold,p.xp,true);
  else if(Number(d.eklenen)>0)announce(period,Number(d.eklenen)||p.gold,Number(d.xp)||p.xp);
  else window.yoToast?.(p.again);
  window.dmRefreshRouteCards?.();
 }catch(e){window.yoToast?.(e.message);if(button.isConnected){button.disabled=false;button.innerHTML=label;}}
 finally{claiming=false;}
}
if(typeof document!=='undefined'&&document.addEventListener){
 document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-rt="claim-mission"]');if(!b)return;e.preventDefault();e.stopPropagation();claim(b);},true);
 /* Only a real account change clears missions; a repeated login event for the same student keeps them. */
 document.addEventListener('dm:login',()=>{if(owner&&owner===who())return;owner='';value=null;lastAsk=0;document.getElementById('dmMissionReward')?.remove();});
}
})();
