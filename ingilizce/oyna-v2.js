/* Diji-Medu: one account-selected route, using the existing two progress engines. */
(()=>{'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Y=()=>typeof yo!=='undefined'&&yo?yo:null,who=()=>typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
const img=(name,cls='')=>'<img class="'+cls+'" src="route-assets/'+name+'" alt="" decoding="async">';
const art=(name,cls='')=>img(name+'.svg',cls);
const tell=m=>window.yoToast?.(m);
let preview=null,latest=null,epoch=0;
function purpose(){return preview||(Y()?.dmLearningPurpose==='independent'?'independent':'school');}
function week(){const d=new Date(Date.now()+10800000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
function heading(o={}){return '<header class="rt-top"><h1>'+ (purpose()==='school'?'Okul Yolum':'Öğrenme Yolum')+'</h1><div class="rt-wallet"><button type="button" data-rt-wallet="energy" aria-label="Enerji bilgileri">⚡ <b data-dm-energy>'+esc(o.energy??'–')+'</b></button><button type="button" data-rt-wallet="gold" aria-label="Mağaza ve altın">🪙 <b data-dm-gold>'+esc(o.gold??Y()?.altin??0)+'</b></button></div></header>';}
let weeklyClaimOwner='',weeklyError='';
function weekly(){return window.dmRouteMissions?.markup('weekly')||'<section class="rt-week rt-card"><p>Haftalık görevler hazırlanıyor…</p></section>';}

async function claimWeekly(){const owner=who();if(!owner||weeklyClaimOwner)return;weeklyClaimOwner=owner;weeklyError='';refreshCards();try{
 const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'haftalikHedefOdulAl',ogrenci:owner,t:localStorage.getItem('ing_token')||''})}),d=await r.json();if(!r.ok||!d.ok||!d.haftaHedef)throw Error(d.mesaj||d.message||'Ödül şu an alınamadı. Tekrar dene.');if(owner!==who())return;
 if(d.yo&&window.dmApplyRewardState)window.dmApplyRewardState(d.yo,owner);else if(Number.isFinite(Number(d.altin)))Y().altin=Number(d.altin);
 Y().haftaHedef=d.haftaHedef;window.yoKaydet?.();if(d.newlyAwarded)tell('🎉 Hedef tamamlandı! +'+(d.awardedGold||0)+' altın');
 }catch(e){if(owner===who())weeklyError=e.message;}finally{if(weeklyClaimOwner===owner)weeklyClaimOwner='';if(owner===who())refreshCards();}}

function tasks(){return window.dmRouteMissions?.markup('daily')||'<section class="rt-tasks rt-card"><p>Günlük görevler hazırlanıyor…</p></section>';}

function schoolInfo(s){const label=String(s?.label||''),grade=/(\d+)\.\s*sınıf/i.exec(label),unit=/(\d+)\.\s*ünite/i.exec(label),part=/·\s*(\d+)\s*\/\s*(\d+)/.exec(label);return {grade:Number(grade?.[1]||1),unit:unit?.[1]||'Karışık',part:Number(part?.[1]||1),count:Number(part?.[2]||1)};}
function node(s,i,current,learn){const state=s.done?'done':s.current||i===current?'current':s.available?'open':'locked';const label=learn?s.cefr+' · '+s.title:s.label;const attrs=learn?'data-rt="chapter" data-chapter="'+s.id+'"':'data-b="'+s.b+'" data-d="'+s.d+'"';return '<button type="button" class="rt-node '+state+(learn?'':' dm-adventure-node')+'" '+attrs+' aria-label="'+esc((label||'Bölüm')+(state==='done'?', tamamlandı':state==='current'?', sıradaki':state==='locked'?', kilitli':', açık'))+'" '+(!s.available?'disabled':'')+' '+(state==='current'?'aria-current="step"':'')+'><span aria-hidden="true">'+(learn?(state==='current'?'▶':icon('book')):(s.done?'✓':state==='locked'?'🔒':'▶'))+'</span></button>';}
function chestReady(){return Object.values(window.dmProgression?.status?.()?.chests||{}).some(state=>state==='ready');}
function chestMarkup(){const ready=chestReady();return '<button type="button" class="rt-map-chest'+(ready?' is-ready':'')+'" data-rt="chests" aria-label="'+(ready?'Kazandığın sandığı aç':'Parkur sandıklarını göster')+'">'+img('chest-three.svg','rt-chest-art')+'<span class="rt-v3-chest-label">Sandık</span><span class="rt-chest-open"'+(ready?'':' hidden')+'>AÇ</span></button>';}
function paintChests(){const ready=chestReady();document.querySelectorAll('.rt-map-chest').forEach(b=>{b.classList.toggle('is-ready',ready);b.setAttribute('aria-label',ready?'Kazandığın sandığı aç':'Parkur sandıklarını göster');const label=b.querySelector('.rt-chest-open');if(label)label.hidden=!ready;});}
async function refreshChests(){await window.dmProgression?.refresh?.(true);paintChests();}
function routeTitle(s,learn){
 if(learn)return String(s?.title||'Öğrenme durağı').replace(/^\d+\.\s*Durak\s*·\s*/i,'');
 return window.dmParkurDurakAdi?.(s.b,s.d)||('Kelime çalışması · '+schoolInfo(s).part);
}
function routeNumber(s,i,learn){if(learn)return Number(/^([0-9]+)\./.exec(s.title||'')?.[1]||i+1);const group=(latest?.allSteps||latest?.steps||[]).filter(x=>schoolInfo(x).grade===schoolInfo(s).grade),at=group.findIndex(x=>x.b===s.b&&x.d===s.d);return at>=0?at+1:Number(s.d??i)+1;}
function routeGroup(s,learn){const info=schoolInfo(s);return learn?(s.theme||s.cefr+' · Öğrenme Yolu'):(info.grade+'. Sınıf · Ünite '+info.unit);}
function pathMarkup(steps,current,learn){
 const active=steps[current],from=Math.max(0,Math.min(current-2,steps.length-5)),shown=steps.slice(from,from+5);
 const all=learn?steps:(latest?.allSteps||steps),group=all.filter(x=>learn?x.cefr===active?.cefr:schoolInfo(x).grade===schoolInfo(active).grade);
 const done=group.filter(x=>x.done).length,total=group.length,info=schoolInfo(active),level=learn?(active?.cefr||'A1'):info.grade+'. Sınıf';
 const xs=learn?[42,32,42,52,42]:[49,39,49,59,49],ys=[9,27,45,63,81];
 const trail=shown.map((x,i)=>(i?'C'+xs[i-1]+' '+(ys[i-1]+9)+' '+xs[i]+' '+(ys[i]-9)+' '+xs[i]+' '+ys[i]:'M'+xs[i]+' '+ys[i])).join(' ');
 return '<section class="rt-path rt-v3-map '+(learn?'rt-islands':'rt-reward-route')+'" aria-label="'+esc(level)+' · Öğrenme durakları">'+
 '<header class="rt-v3-summary"><button type="button" data-rt="all" class="rt-v3-level">'+icon('book')+'<span><b>'+esc(level)+(learn?'':' · Ünite '+info.unit)+'</b><small>'+done+' / '+total+' durak tamamlandı</small><progress value="'+done+'" max="'+Math.max(1,total)+'" aria-label="'+esc(level)+' ilerlemesi"></progress></span></button><button type="button" data-rt="all" class="rt-v3-all">'+icon('map')+'<span>Tüm duraklar</span></button><button type="button" class="rt-v3-switch" data-rt="switch-route" aria-label="Parkur değiştir">'+icon('switch')+'</button></header>'+
 '<div class="rt-v3-canvas"><svg class="rt-v3-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="'+trail+'"/></svg><div class="rt-v3-theme"><b>'+esc(routeGroup(shown[0]||active,learn))+'</b><small>'+esc(learn?'Temanı adım adım keşfet':'Kelimelerini öğren, tekrar et.')+'</small></div>'+
 '<aside class="rt-v3-tools" aria-label="Parkur araçları"><button type="button" data-rt="plan">'+icon('calendar')+'<span>Planım</span><small>Bugünün dersleri</small></button><button type="button" data-rt="missions">'+icon('tasks')+'<span>Görevler</span><small>Günlük ve haftalık</small></button>'+chestMarkup()+'</aside>'+
 shown.map((x,i)=>{const n=from+i,state=x.done?'done':n===current?'current':x.available?'open':'locked';return '<div class="rt-stop rt-v3-stop '+state+'" style="--x:'+xs[i]+'%;--y:'+ys[i]+'%">'+node(x,n,current,learn)+'<span class="rt-v3-number">'+routeNumber(x,n,learn)+'</span>'+(x.done?'<span class="rt-v3-check" aria-hidden="true">✓</span>':'')+'<span class="rt-stop-label">'+esc(routeTitle(x,learn))+'</span>'+(n===current?'<button type="button" class="rt-path-papi-btn" data-rt="all" aria-label="Tüm durakları göster">'+img(learn?'papi-english.webp':'papi-school.webp','rt-papi')+'</button>':'')+'</div>';}).join('')+
 shown.map((x,i)=>i&&routeGroup(x,learn)!==routeGroup(shown[i-1],learn)?'<div class="rt-v3-next-theme" style="top:'+Math.max(2,ys[i]-10)+'%">'+esc(routeGroup(x,learn))+'</div>':'').join('')+'</div><div class="rt-continue">'+(active?.available?'<button type="button" class="rt-start '+(learn?'':'dm-map-continue')+'" '+(learn?'data-rt="continue"':'data-b="'+active.b+'" data-d="'+active.d+'"')+'><span aria-hidden="true">▶</span> Devam et</button>':'<span class="rt-v3-empty">'+(steps.length?'Tüm duraklar ile parkurunu keşfet.':'Parkurun hazırlanıyor…')+'</span>')+'</div></section>';
}
function icon(name){const paths={book:'M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3zM12 6v15',map:'M3 5l6-2 6 3 6-2v15l-6 2-6-3-6 2zM9 3v15M15 6v15',switch:'M4 7h16l-4-4M20 17H4l4 4',calendar:'M5 5h14v16H5zM8 3v4M16 3v4M5 10h14M9 14h2M14 14h2M9 17h2',tasks:'M9 5H5v16h14V5h-4M9 3h6v5H9zM8 14l2 2 5-5'};return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';}
function missionsDialog(){
 const view=dialog('Görevlerim','<div class="rt-v3-mission-tabs" role="tablist" aria-label="Görev dönemi"><button type="button" role="tab" aria-selected="true" data-mission-tab="daily">Günlük</button><button type="button" role="tab" aria-selected="false" data-mission-tab="weekly">Haftalık</button></div><div data-mission-panel="daily">'+tasks()+'</div><div data-mission-panel="weekly" hidden>'+weekly()+'</div>');
 view.el.addEventListener('click',e=>{const tab=e.target.closest('[data-mission-tab]');if(tab){view.el.querySelectorAll('[data-mission-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===tab)));view.el.querySelectorAll('[data-mission-panel]').forEach(p=>p.hidden=p.dataset.missionPanel!==tab.dataset.missionTab);return;}const task=e.target.closest('[data-rt="task"]');if(task){view.close();runTask(task.dataset.event);}});
}
function runTask(ev){if(ev==='review')window.dmWrongWords?.review?.();else if(['game','oyun','yildiz3'].includes(ev))window.aktivitelerTamEkranAc?.();else if(ev==='ders')window.dersCalisTamEkranAc?.();else window.dmLearningRoute.continue();}
function scene(o={}){latest=o;const steps=o.steps||[],current=Math.max(0,Math.min(steps.length-1,Number(o.current)||0)),learn=purpose()==='independent';return '<div class="rt-root '+(learn?'rt-english':'rt-school')+'" data-route-design="3">'+(learn?'<div class="rt-route-area" role="status">Öğrenme yolun hazırlanıyor…</div>':'')+(learn?'':pathMarkup(steps,current,false))+'</div>';}
async function paintLearning(root,force=false){const owner=who(),turn=++epoch;try{const info=await window.dmStoryPath.overview({force});if(!root.isConnected||owner!==who()||turn!==epoch||purpose()!=='independent')return;if(!info?.chapters?.length)throw Error('Parkur içeriği henüz hazır değil.');const cur=Math.max(0,info.chapters.findIndex(c=>c.current));const area=root.querySelector('.rt-route-area');root.querySelectorAll('.rt-badge,.rt-banner,.rt-completion-count,.rt-path').forEach(el=>el.remove());const summary='';if(area)area.outerHTML=summary;else root.insertAdjacentHTML('afterbegin',summary);root.insertAdjacentHTML('beforeend',pathMarkup(info.chapters,cur,true));}catch(e){const area=root.querySelector('.rt-route-area');if(area){area.innerHTML='<p>Öğrenme yolun yüklenemedi.</p><button type="button" data-rt="retry">Tekrar dene</button>';}}}
let cardStamp='';if(typeof window.setInterval==='function')window.setInterval(()=>{if(document.hidden)return;paintChests();const stamp=JSON.stringify([Y()?.log,Y()?.haftaHedef,Y()?.lig?.xp,tasks()]);if(stamp!==cardStamp){cardStamp=stamp;refreshCards();}},1500);
function refreshCards(){paintChests();document.querySelectorAll('.rt-week').forEach(el=>el.outerHTML=weekly());document.querySelectorAll('.rt-tasks').forEach(el=>el.outerHTML=tasks());}
let routeSaveInProgress=false;
async function setPurpose(p,{save=true,reopen=true}={}){
 if(!['school','independent'].includes(p)||routeSaveInProgress)return false;
 const owner=who();
 if(!Y()||!owner){tell('Hesap bilgilerin hazırlanıyor, kısa süre sonra tekrar dene.');return false;}
 routeSaveInProgress=true;
 let state=null,previous=null,changed=false;
 try{
  // Readiness includes the initial server version, not merely the local yo
  // object. Do not change any route selection before this resolves.
  if(save&&typeof window.dmMemberSaveReady==='function')await window.dmMemberSaveReady(owner);
  else if(save&&typeof window.dmPrepareMemberState==='function')await window.dmPrepareMemberState();
  if(owner!==who())return false;
  state=Y();
  if(!state)return false;
  previous=state.dmLearningPurpose;
  preview=null;
  if(previous===p){if(reopen)await window.dunyaAc?.();return true;}
  state.dmLearningPurpose=p;changed=true;
  window.yoKaydet?.();
  if(save){
   if(typeof window.yoHemenKaydet!=='function')throw Error('Kaydetme bağlantısı henüz hazır değil.');
   let saved=false,lastError=null;
   for(let attempt=0;attempt<3;attempt++){
    if(owner!==who()||Y()!==state)return false;
    if(attempt)await new Promise(resolve=>setTimeout(resolve,300*attempt));
    try{
     await window.yoHemenKaydet(true);
     saved=true;break;
    }catch(e){lastError=e;}
   }
   if(!saved)throw lastError||Error('Kaydetme işlemi tamamlanamadı.');
   if(owner!==who()||Y()!==state)return false;
  }
  if(reopen)await window.dunyaAc?.();
  return true;
 }catch(e){
  if(changed&&owner===who()&&Y()===state){
   state.dmLearningPurpose=previous;
   window.yoKaydet?.();
  }
  tell(e?.message||'Parkur seçimin kaydedilemedi. Bağlantını kontrol edip tekrar deneyebilirsin.');
  return false;
 }finally{routeSaveInProgress=false;}
}
function dialog(title,html){const parent=window.dmViewHistory?.capture();document.getElementById('rtDialog')?.remove();const prior=document.activeElement,el=document.createElement('div');el.id='rtDialog';el.className='rt-overlay';el.innerHTML='<section class="rt-dialog" role="dialog" aria-modal="true" aria-labelledby="rtDialogTitle"><button type="button" class="rt-close" aria-label="Kapat">×</button><h2 id="rtDialogTitle">'+esc(title)+'</h2>'+html+'</section>';const close=()=>{el.remove();window.dmViewHistory?.leave(el);prior?.focus?.({preventScroll:true});};el.onclick=e=>{if(e.target===el||e.target.closest('.rt-close'))close();};el.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const f=[...el.querySelectorAll('button,a,input')].filter(b=>!b.disabled),i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length]?.focus();}};document.body.append(el);window.dmViewHistory?.track(el,{parent,close});el.querySelector('button').focus();return {el,close};}
function goal(){const {el,close}=dialog('Haftalık hedefini seç','<img class="dm-goal-papi" src="papi-welcome-v2.png" alt="Papi"><p>Kendine uygun bir hedef seç. Her küçük adım sayılır!</p><div class="rt-choices">'+[1000,1500,2500].map((n,i)=>'<button type="button" data-goal="'+n+'"><span>'+['🌱','🚀','🏆'][i]+'</span><strong>'+n+' XP</strong><small>'+['Rahat başlangıç','Dengeli ilerleme','Büyük hedef'][i]+'</small></button>').join('')+'</div><p class="rt-status" role="status"></p>');el.querySelectorAll('[data-goal]').forEach(b=>b.onclick=async()=>{const owner=who();el.querySelectorAll('[data-goal]').forEach(x=>x.disabled=true);try{if(!Y()||!owner)throw Error('Hesap bilgilerin hazırlanıyor.');const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'haftalikHedefSec',ogrenci:owner,xp:Number(b.dataset.goal),t:localStorage.getItem('ing_token')||''})}),d=await r.json();if(!r.ok||!d.ok||!d.haftaHedef)throw Error(d.mesaj||'Hedef kaydedilemedi.');if(owner!==who()){close();return;}Y().haftaHedef=d.haftaHedef;window.yoKaydet?.();refreshCards();close();}catch(e){el.querySelector('.rt-status').textContent=e.message;el.querySelectorAll('[data-goal]').forEach(x=>x.disabled=false);}});}
function allSchool(){if(window.dmSchoolJourney?.open){window.dmSchoolJourney.open(latest?.allSteps||latest?.steps||[]);return;}const {el,close}=dialog('Okul Yolum','<div class="rt-all">'+(latest?.allSteps||latest?.steps||[]).map(s=>'<button type="button" data-b="'+s.b+'" data-d="'+s.d+'" '+(!s.available?'disabled':'')+'>'+esc(s.label)+' '+(s.done?'✓':s.available?'▶':'🔒')+'</button>').join('')+'</div><small>1–8. sınıf · tüm üniteler ve bölümler</small>');el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const original=document.querySelector('.rt-root .dm-adventure-node[data-b="'+b.dataset.b+'"][data-d="'+b.dataset.d+'"]');if(original){close();original.click();}else{const host=$('dmParkurScroll');const trigger=document.createElement('button');trigger.className='dm-adventure-node';trigger.dataset.b=b.dataset.b;trigger.dataset.d=b.dataset.d;host.append(trigger);window.dmSchoolStopOpen?.(+b.dataset.b,+b.dataset.d);trigger.remove();close();}});}
function mount(host){const root=host?.querySelector('.rt-root');if(!root)return;if(!host.dataset.rtBound){host.dataset.rtBound='1';host.addEventListener('click',e=>{const b=e.target.closest('[data-rt]');if(!b||b.disabled)return;const action=b.dataset.rt;if(action==='plan'){window.dmLearningCompanion?.openPlan?.();return;}if(action==='missions'){missionsDialog();return;}if(action==='chests'){window.dmProgression?.chests?.();return;}if(action==='all'){e.preventDefault();e.stopPropagation();if(purpose()==='independent'){if(typeof window.dmStoryPath?.openAll==='function')window.dmStoryPath.openAll();else tell('Bölüm listesi yüklenemedi.');}else allSchool();return;}if(action==='switch-route'){e.preventDefault();e.stopPropagation();window.dmMemberExperience?.chooseRoute(true);}else if(action==='goal')goal();else if(action==='claim-goal')claimWeekly();else if(action==='retry')window.dunyaAc?.();else if(action==='continue')window.dmStoryPath.continueRoute().catch(e=>tell(e.message));else if(action==='chapter')window.dmStoryPath.open(Number(b.dataset.chapter));else if(action==='all')purpose()==='independent'?window.dmStoryPath.openAll():allSchool();else if(action==='task'){const ev=b.dataset.event;runTask(ev);}});}if(purpose()==='independent')paintLearning(root);refreshChests();fit();}
function fit(){const host=$('dmParkurScroll');if(!host?.querySelector('.rt-root'))return;const nav=$('bottomNavMobile'),vp=window.visualViewport;host.style.setProperty('--rt-space',Math.max(280,(nav?.getBoundingClientRect().top||(vp?.height||innerHeight))-host.getBoundingClientRect().top-10)+'px');}
/* Remove superseded header tabs even if legacy scripts regenerate them after login. */
function removeLegacyTopTabs(){const screen=document.getElementById('tab-dunya');if(!screen)return;screen.querySelectorAll('.dm-parkur-tabs,#pkSekmeler').forEach(el=>el.remove());}
const oldTabScreen=document.getElementById('tab-dunya');if(oldTabScreen){removeLegacyTopTabs();new MutationObserver(removeLegacyTopTabs).observe(oldTabScreen,{childList:true,subtree:true});}
window.dmRefreshRouteCards=refreshCards;window.dmParkurBaslik=heading;window.dmParkurSahne=scene;window.dmParkurMapMount=mount;
window.dmLearningRoute={purpose, set:setPurpose,preview:async p=>{preview=p;await window.dunyaAc?.();},continue:()=>purpose()==='independent'?window.dmStoryPath.continueRoute():document.querySelector('.rt-start')?.click(),settings:()=>{const {el,close}=dialog('Öğrenme Yolum','<p>Yolunu değiştirsen de iki parkurdaki ilerlemen korunur.</p><div class="rt-choices"><button data-purpose="school">'+art('book')+'Okul Yolum<small>1. sınıftan 8. sınıfa</small></button><button data-purpose="independent">'+art('path')+'İngilizce Yolum<small>Tematik günlük İngilizce</small></button></div>');el.querySelectorAll('[data-purpose]').forEach(b=>{b.setAttribute('aria-pressed',String(purpose()===b.dataset.purpose));b.onclick=async()=>{close();await setPurpose(b.dataset.purpose);};});}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-rt-wallet]');if(b)(b.dataset.rtWallet==='gold'?window.magazaAc:window.dijiEnerjiPaneliAc)?.();});
function refreshLearning(){if(purpose()!=='independent')return;document.querySelectorAll('.rt-root').forEach(root=>paintLearning(root,true));}
document.addEventListener('dm:learning-progress',e=>{if(e.detail?.owner===who()){refreshLearning();refreshChests();}});document.addEventListener('dm:story-close',refreshLearning);
document.addEventListener('dm:state',()=>{preview=null;refreshCards();});document.addEventListener('dm:login',()=>{weeklyClaimOwner='';weeklyError='';preview=null;latest=null;epoch++;});window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
// School route uses its own theme and expanded grade/unit navigator.
if(typeof document!=='undefined'&&document.createElement&&document.head&&!document.querySelector('script[data-dm-school-journey]')){const loader=document.createElement('script');loader.src='school-journey.js?v=20261020-design-three-1';loader.defer=true;loader.dataset.dmSchoolJourney='1';document.head.append(loader);}
})();
