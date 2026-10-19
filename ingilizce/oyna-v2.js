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
function heading(o={}){return '<header class="rt-top"><h1>'+ (purpose()==='school'?'Okul Yolum':'İngilizce Yolum')+'</h1><div class="rt-wallet"><button type="button" data-rt-wallet="energy" aria-label="Enerji bilgileri">⚡ <b data-dm-energy>'+esc(o.energy??'–')+'</b></button><button type="button" data-rt-wallet="gold" aria-label="Mağaza ve altın">🪙 <b data-dm-gold>'+esc(o.gold??Y()?.altin??0)+'</b></button></div></header>';}
let weeklyClaimOwner='',weeklyError='';
function weekly(){return window.dmRouteMissions?.markup('weekly')||'<section class="rt-week rt-card"><p>Haftalık görevler hazırlanıyor…</p></section>';}

async function claimWeekly(){const owner=who();if(!owner||weeklyClaimOwner)return;weeklyClaimOwner=owner;weeklyError='';refreshCards();try{
 const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'haftalikHedefOdulAl',ogrenci:owner,t:localStorage.getItem('ing_token')||''})}),d=await r.json();if(!r.ok||!d.ok||!d.haftaHedef)throw Error(d.mesaj||d.message||'Ödül şu an alınamadı. Tekrar dene.');if(owner!==who())return;
 if(d.yo&&window.dmApplyRewardState)window.dmApplyRewardState(d.yo,owner);else if(Number.isFinite(Number(d.altin)))Y().altin=Number(d.altin);
 Y().haftaHedef=d.haftaHedef;window.yoKaydet?.();if(d.newlyAwarded)tell('🎉 Hedef tamamlandı! +'+(d.awardedGold||0)+' altın');
 }catch(e){if(owner===who())weeklyError=e.message;}finally{if(weeklyClaimOwner===owner)weeklyClaimOwner='';if(owner===who())refreshCards();}}

function tasks(){return window.dmRouteMissions?.markup('daily')||'<section class="rt-tasks rt-card"><p>Günlük görevler hazırlanıyor…</p></section>';}

function schoolInfo(s){const m=/(\d+)\.\s*sınıf\s+(\d+)\.\s*ünite\s*·\s*(\d+)\s*\/\s*(\d+)/i.exec(s?.label||'');return m?{grade:m[1],unit:m[2],part:m[3],count:m[4]}:{grade:1,unit:1,part:1,count:1};}
function node(s,i,current,learn){const state=s.done?'done':s.current||i===current?'current':s.available?'open':'locked';const label=learn?s.cefr+' · '+s.title:s.label;const attrs=learn?'data-rt="chapter" data-chapter="'+s.id+'"':'data-b="'+s.b+'" data-d="'+s.d+'"';return '<button type="button" class="rt-node '+state+(learn?'':' dm-adventure-node')+'" '+attrs+' aria-label="'+esc((label||'Bölüm')+(state==='done'?', tamamlandı':state==='current'?', sıradaki':state==='locked'?', kilitli':', açık'))+'" '+(!s.available?'disabled':'')+' '+(state==='current'?'aria-current="step"':'')+'><span aria-hidden="true">'+(s.done?'✓':state==='locked'?'🔒':'▶')+'</span></button>';}
function chestReady(){return Object.values(window.dmProgression?.status?.()?.chests||{}).some(state=>state==='ready');}
function chestMarkup(){const ready=chestReady();return '<button type="button" class="rt-map-chest'+(ready?' is-ready':'')+'" data-rt="chests" aria-label="'+(ready?'Kazandığın sandığı aç':'Parkur sandıklarını göster')+'">'+art('chest','rt-chest-art')+'<span class="rt-chest-open"'+(ready?'':' hidden')+'>AÇ</span></button>';}
function paintChests(){const ready=chestReady();document.querySelectorAll('.rt-map-chest').forEach(b=>{b.classList.toggle('is-ready',ready);b.setAttribute('aria-label',ready?'Kazandığın sandığı aç':'Parkur sandıklarını göster');const label=b.querySelector('.rt-chest-open');if(label)label.hidden=!ready;});}
async function refreshChests(){await window.dmProgression?.refresh?.(true);paintChests();}
function pathMarkup(steps,current,learn){const s=steps[current],from=Math.max(0,current-1),shown=steps.slice(from,from+3);return '<section class="rt-path '+(learn?'rt-islands':'rt-reward-route')+'" aria-label="'+(learn?'Ada Yolculuğu':'Ödül Rotası')+' · Öğrenme durakları"><button type="button" class="rt-map-switch" data-rt="switch-route" aria-label="Parkur değiştir"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/></svg><span>Parkur değiştir</span></button><svg class="rt-trail" viewBox="0 0 400 230" preserveAspectRatio="none" aria-hidden="true"><path d="M55 120C105 35 170 220 225 117S305 50 345 132"/></svg><div class="rt-stones">'+shown.map((x,i)=>'<div class="rt-stop">'+node(x,from+i,current,learn)+(from+i===current?'<button type="button" class="rt-path-papi-btn" data-rt="all" aria-label="Tüm bölümleri göster">'+img(learn?'papi-english.png':'papi-school.png','rt-papi')+'</button>':'')+'<span class="rt-stop-label">'+(learn?(from+i+1)+'. Bölüm':schoolInfo(x).part+'. Bölüm')+'</span></div>').join('')+'</div><div class="rt-continue"><b>'+(learn?esc(s?.title||'İlk Adımlarım'):schoolInfo(s).part+'. Bölüm')+'</b>'+(s&&s.available?'<button type="button" class="rt-start '+(learn?'':'dm-map-continue')+'" '+(learn?'data-rt="continue"':'data-b="'+s.b+'" data-d="'+s.d+'"')+'>DEVAM ET</button>':'')+'</div>'+chestMarkup()+'</section>';}
function banner(info,learn=false){return '<div class="rt-badge">'+esc(learn?info.cefr:info.grade+'. Sınıf')+'</div><div class="rt-banner">'+art(learn?'help':'book')+'<span><small>'+esc(learn?info.cefr+' · Öğrenme Yolu':'Ünite '+info.unit)+'</small><b>'+esc(learn?info.title:(Number(info.unit)===1?'İlk Kelimelerim':info.unit+'. Ünite Kelimelerim'))+'</b></span><button type="button" class="rt-parrot-btn" data-rt="all" aria-label="Geçmiş ve gelecek tüm bölümleri göster">'+img(learn?'papi-english.png':'papi-school.png','rt-banner-papi')+'</button><button type="button" class="rt-all-link" data-rt="all" aria-label="Bölüm listesi">›</button></div>';}
function scene(o={}){latest=o;const steps=o.steps||[],current=Math.max(0,Math.min(steps.length-1,Number(o.current)||0)),learn=purpose()==='independent';return '<div class="rt-root '+(learn?'rt-english':'rt-school')+'">'+(learn?'<div class="rt-route-area" role="status">İngilizce yolun hazırlanıyor…</div>':banner(schoolInfo(steps[current])))+weekly()+tasks()+(learn?'':pathMarkup(steps,current,false))+'</div>';}
async function paintLearning(root,force=false){const owner=who(),turn=++epoch;try{const info=await window.dmStoryPath.overview({force});if(!root.isConnected||owner!==who()||turn!==epoch||purpose()!=='independent')return;const cur=Math.max(0,info.chapters.findIndex(c=>c.current));const area=root.querySelector('.rt-route-area');root.querySelectorAll('.rt-badge,.rt-banner,.rt-completion-count,.rt-path').forEach(el=>el.remove());const summary=banner(info,true)+'<p class="rt-completion-count">'+(info.completedCount??info.chapters.filter(c=>c.done).length)+' / '+(info.total||info.chapters.length)+' bölüm tamamlandı · '+(info.thematic?'20 tema · 120 konu':'A1–B2')+'</p>';if(area)area.outerHTML=summary;else root.insertAdjacentHTML('afterbegin',summary);root.insertAdjacentHTML('beforeend',pathMarkup(info.chapters,cur,true));}catch(e){const area=root.querySelector('.rt-route-area');if(area){area.innerHTML='<p>İngilizce yolun yüklenemedi.</p><button type="button" data-rt="retry">Tekrar dene</button>';}}}
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
function dialog(title,html){document.getElementById('rtDialog')?.remove();const prior=document.activeElement,el=document.createElement('div');el.id='rtDialog';el.className='rt-overlay';el.innerHTML='<section class="rt-dialog" role="dialog" aria-modal="true" aria-labelledby="rtDialogTitle"><button type="button" class="rt-close" aria-label="Kapat">×</button><h2 id="rtDialogTitle">'+esc(title)+'</h2>'+html+'</section>';const close=()=>{el.remove();prior?.focus?.({preventScroll:true});};el.onclick=e=>{if(e.target===el||e.target.closest('.rt-close'))close();};el.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const f=[...el.querySelectorAll('button,a,input')].filter(b=>!b.disabled),i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length]?.focus();}};document.body.append(el);el.querySelector('button').focus();return {el,close};}
function goal(){const {el,close}=dialog('Haftalık hedefini seç','<img class="dm-goal-papi" src="papi-welcome-v2.png" alt="Papi"><p>Kendine uygun bir hedef seç. Her küçük adım sayılır!</p><div class="rt-choices">'+[1000,1500,2500].map((n,i)=>'<button type="button" data-goal="'+n+'"><span>'+['🌱','🚀','🏆'][i]+'</span><strong>'+n+' XP</strong><small>'+['Rahat başlangıç','Dengeli ilerleme','Büyük hedef'][i]+'</small></button>').join('')+'</div><p class="rt-status" role="status"></p>');el.querySelectorAll('[data-goal]').forEach(b=>b.onclick=async()=>{const owner=who();el.querySelectorAll('[data-goal]').forEach(x=>x.disabled=true);try{if(!Y()||!owner)throw Error('Hesap bilgilerin hazırlanıyor.');const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'haftalikHedefSec',ogrenci:owner,xp:Number(b.dataset.goal),t:localStorage.getItem('ing_token')||''})}),d=await r.json();if(!r.ok||!d.ok||!d.haftaHedef)throw Error(d.mesaj||'Hedef kaydedilemedi.');if(owner!==who()){close();return;}Y().haftaHedef=d.haftaHedef;window.yoKaydet?.();refreshCards();close();}catch(e){el.querySelector('.rt-status').textContent=e.message;el.querySelectorAll('[data-goal]').forEach(x=>x.disabled=false);}});}
function allSchool(){if(window.dmSchoolJourney?.open){window.dmSchoolJourney.open(latest?.allSteps||latest?.steps||[]);return;}const {el,close}=dialog('Okul Yolum','<div class="rt-all">'+(latest?.allSteps||latest?.steps||[]).map(s=>'<button type="button" data-b="'+s.b+'" data-d="'+s.d+'" '+(!s.available?'disabled':'')+'>'+esc(s.label)+' '+(s.done?'✓':s.available?'▶':'🔒')+'</button>').join('')+'</div><small>1–8. sınıf · tüm üniteler ve bölümler</small>');el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const original=document.querySelector('.rt-root .dm-adventure-node[data-b="'+b.dataset.b+'"][data-d="'+b.dataset.d+'"]');if(original){close();original.click();}else{const host=$('dmParkurScroll');const trigger=document.createElement('button');trigger.className='dm-adventure-node';trigger.dataset.b=b.dataset.b;trigger.dataset.d=b.dataset.d;host.append(trigger);window.dmSchoolStopOpen?.(+b.dataset.b,+b.dataset.d);trigger.remove();close();}});}
function mount(host){const root=host?.querySelector('.rt-root');if(!root)return;if(!host.dataset.rtBound){host.dataset.rtBound='1';host.addEventListener('click',e=>{const b=e.target.closest('[data-rt]');if(!b||b.disabled)return;const action=b.dataset.rt;if(action==='chests'){window.dmProgression?.chests?.();return;}if(action==='all'){e.preventDefault();e.stopPropagation();if(purpose()==='independent'){if(typeof window.dmStoryPath?.openAll==='function')window.dmStoryPath.openAll();else tell('Bölüm listesi yüklenemedi.');}else allSchool();return;}if(action==='switch-route'){e.preventDefault();e.stopPropagation();window.dmMemberExperience?.chooseRoute(true);}else if(action==='goal')goal();else if(action==='claim-goal')claimWeekly();else if(action==='retry')window.dunyaAc?.();else if(action==='continue')window.dmStoryPath.continueRoute().catch(e=>tell(e.message));else if(action==='chapter')window.dmStoryPath.open(Number(b.dataset.chapter));else if(action==='all')purpose()==='independent'?window.dmStoryPath.openAll():allSchool();else if(action==='task'){const ev=b.dataset.event;if(ev==='review'){window.dmWrongWords?.review?.();return;}if(ev==='game')window.aktivitelerTamEkranAc?.();else if(ev==='ders')window.dersCalisTamEkranAc?.();else if(ev==='oyun'||ev==='yildiz3')window.aktivitelerTamEkranAc?.();else window.dmLearningRoute.continue();}});}if(purpose()==='independent')paintLearning(root);refreshChests();fit();}
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
if(typeof document!=='undefined'&&document.createElement&&document.head&&!document.querySelector('script[data-dm-school-journey]')){const loader=document.createElement('script');loader.src='school-journey.js?v=20261017-1';loader.defer=true;loader.dataset.dmSchoolJourney='1';document.head.append(loader);}
})();
