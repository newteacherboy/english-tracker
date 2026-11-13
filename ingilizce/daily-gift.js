/* Approved Lila & Altın daily gift. Server owns dates, streaks and all energy credits. */
(()=>{'use strict';
const $=id=>document.getElementById(id),who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const eligible=()=>!!who()&&!['teacher','dijimedu_demo'].includes(who().toLowerCase())&&!window.dmGuestMode&&!window.dmTeacherPortalMode&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const parked=()=>!!$('tab-dunya')?.classList.contains('active')&&!document.hidden&&!document.body.classList.contains('dm-play-session');
const number=n=>Math.max(1,Math.floor(Number(n)||1)),key=owner=>'dm_daily_gift_v1:'+owner.toLocaleLowerCase('tr');
let owner='',state=null,inflight=null,claiming=false,layer=null,view='gift',origin=null,message='',turn=0,queued=false;
const asset=name=>'daily-gift-assets/papi-'+name+'-3d.webp';
function cacheRead(){try{const v=JSON.parse(localStorage.getItem(key(who()))||'null');return v?.day===today()?v:null;}catch{return null;}}
function close(){if(!layer)return;layer.remove();layer=null;if(origin?.isConnected)origin.focus({preventScroll:true});origin=null;}
function reset(){if(owner===who())return;turn++;close();owner=who();state=eligible()?cacheRead():null;inflight=null;claiming=false;message='';decorateAll();}
function decorateButton(button){
 const count=state?number(state.streak):null,ready=!!state&&!state.alreadyClaimed&&!state.claimed;
 button.classList.toggle('dm-daily-ready',ready);
 const text=button.querySelector('[data-daily-count]');if(text&&text.textContent!==String(count??'·'))text.textContent=String(count??'·');
 const label='Günlük seri'+(count?' · '+count+' gün':'')+(ready?' · Günlük hediyeni al':'');if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
}
function decorateAll(){if(!window.document)return;document.querySelectorAll('[data-dm-daily-streak]').forEach(decorateButton);}
function apply(d){
 if(!d?.ok||!Number.isInteger(d.streak)||d.streak<1||typeof d.day!=='string')throw Error('Günlük seri bilgisi alınamadı.');
 state={...d,alreadyClaimed:!!(d.alreadyClaimed||d.claimed)};
 try{localStorage.setItem(key(owner),JSON.stringify(state));localStorage.setItem('dm_login_day:'+owner.toLowerCase(),d.day);localStorage.setItem('dm_login_streak:'+owner.toLowerCase(),String(d.streak));localStorage.setItem('ing_girisSerisiSonTarih',d.day);localStorage.setItem('ing_girisSerisiSayisi',String(d.streak));}catch{}
 if($('headerStreakNum'))$('headerStreakNum').textContent='🔥 '+d.streak;
 if(typeof d.enerjiKalan==='number'){
  window._kpEnerjiCache=d;
  window.headerEnerjiGoster?.(d.enerjiKalan,d.enerjiMax);
  try{kpEnerjiKalan=d.enerjiKalan;kpEnerjiMax=d.enerjiMax;window.kpEnerjiSatiriniGuncelle?.();}catch{}
 }
 decorateAll();
}
async function request(claim=false){
 const response=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:claim?'enerjiDegistir':'gunlukSeriDurumu',ogrenci:who(),t:sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'',...(claim?{sebep:'gunluk',fark:1}:{})})});
 const d=await response.json();if(response.ok===false||!d?.ok)throw Error(d?.mesaj||'Bağlantı kurulamadı. Tekrar dene.');return d;
}
async function check({force=false,auto=true}={}){
 reset();if(!eligible())return null;
 if(state?.day===today()&&!force){if(auto)maybeAuto();return state;}
 if(inflight)return inflight;
 const account=owner,ticket=turn;
 const task=(async()=>{try{const d=await request();if(account!==who()||ticket!==turn)return null;apply(d);message='';if(layer)render();if(auto)maybeAuto();return state;}catch(e){if(account===who()&&ticket===turn){message=e.message;if(layer)render();}return null;}})();
 inflight=task;try{return await task;}finally{if(inflight===task)inflight=null;}
}
function maybeAuto(){
 if(!state||state.day!==today()||state.alreadyClaimed||layer||!parked()||!eligible())return;
 if([...document.querySelectorAll('[role="dialog"],#yoModal.acik,#dmStoryLesson,.game-modal-overlay')].some(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'))return;
 const seen='dm_daily_gift_seen:'+owner.toLocaleLowerCase('tr');try{if(localStorage.getItem(seen)===state.day)return;localStorage.setItem(seen,state.day);}catch{}
 open('gift');
}
function tile(day){
 const current=day===state.streak,past=day<state.streak,done=state.claimedDays?.includes(day)||(current&&state.alreadyClaimed);
 return '<div class="dg-day '+(current?'dg-today ':past&&done?'dg-done ':'')+'"'+(current?' aria-current="date"':'')+'><b>'+day+'. gün</b><strong>⚡ +'+day+'</strong><small>'+(current?(done?'Alındı':'Bugün'):done?'✓':past?'Geçti':'🔒')+'</small></div>';
}
function render(){
 if(!layer)return;
 const dialog=layer.querySelector('.dg-dialog');
 const closeButton='<button class="dg-close" data-dg-close aria-label="Kapat">×</button>';
 if(!state||state.day!==today()){
  dialog.className='dg-dialog dg-loading';dialog.innerHTML=closeButton+'<h2 id="dgTitle">Günlük seri</h2><p role="status">'+(message?'Günlük seri yüklenemedi.':'Serin yükleniyor…')+'</p>'+(message?'<button class="dg-primary" data-dg-retry>Tekrar dene</button>':'');
 }else{
  const n=number(state.streak),reward=number(state.rewardAmount),next=number(state.nextReward),done=state.alreadyClaimed;
  dialog.className='dg-dialog '+(view==='series'?'dg-series':'dg-gift');
  const heading=view==='series'?'Günlük seri':'Günlük hediyen';
  const hero=view==='series'?'<h2 id="dgTitle">'+heading+'</h2><div class="dg-series-hero"><img src="'+asset('streak')+'" alt="Başardın diyen Papi" width="148" height="160"><div><strong>'+n+'</strong><b>günlük seri</b></div></div>':'<div class="dg-gift-hero"><img src="'+asset('gift')+'" alt="Hediye getiren 3D Papi" width="230" height="230"></div><h2 id="dgTitle">'+heading+'</h2><div class="dg-energy">⚡ +'+reward+' enerji</div><p class="dg-sub">'+n+' gündür arka arkaya buradasın!</p>';
  const start=number(state.windowStart||Math.floor((n-1)/7)*7+1);
  const calendar=view==='series'?'<div class="dg-days">'+Array.from({length:7},(_,i)=>tile(start+i)).join('')+'</div><p class="dg-sub">Her gün gel, hediyen büyüsün.</p>':'';
  const cap=state.enerjiKalan>=state.enerjiMax;
  const note=message||(done?'Bugünkü hediyen alındı.':cap?'Enerjin dolu. Hediye enerji kapasiten kadar eklenir.':'');
  dialog.innerHTML=closeButton+hero+calendar+'<p class="dg-status" role="status">'+note+'</p><button class="dg-primary" '+(claiming?'disabled':'')+' '+(done?'data-dg-close':'data-dg-claim')+'>'+(claiming?'Hediyen ekleniyor…':done?'Harika!':view==='series'?'Bugünün hediyesini al':'Hediyemi al')+'</button><div class="dg-next">Yarın +'+next+' enerji</div>'+(view==='gift'?'<button class="dg-calendar-link" data-dg-calendar>Seri takvimini gör ›</button>':'');
 }
 dialog.querySelectorAll('[data-dg-close]').forEach(b=>b.onclick=close);
 dialog.querySelector('[data-dg-calendar]')?.addEventListener('click',()=>{view='series';render();});
 dialog.querySelector('[data-dg-retry]')?.addEventListener('click',()=>{message='';render();void check({force:true,auto:false});});
 dialog.querySelector('[data-dg-claim]')?.addEventListener('click',claim);
}
async function claim(){
 if(claiming||!eligible())return;
 reset();if(!state||state.alreadyClaimed)return;
 const account=owner,ticket=turn;claiming=true;message='';render();
 try{const d=await request(true);if(account!==who()||ticket!==turn)return;apply(d);message=d.claimed?(d.eklenen>0?'+'+d.eklenen+' enerji eklendi!':'Enerjin dolu. Bugünkü hediyen kaydedildi.'):'Bu hediyeyi bugün zaten aldın.';
  if(d.claimed&&d.eklenen>0)window.genelEnerjiDegisimGoster?.(d.eklenen);
 }catch(e){if(account===who()&&ticket===turn)message=e.message;}
 finally{if(account===who()&&ticket===turn){claiming=false;render();}}
}
function open(kind='series'){
 reset();if(!eligible())return;
 view=kind;message='';origin=document.activeElement;
 if(!layer){layer=document.createElement('div');layer.className='dg-layer';layer.innerHTML='<section class="dg-dialog" role="dialog" aria-modal="true" aria-labelledby="dgTitle" tabindex="-1"></section>';document.body.append(layer);layer.addEventListener('click',e=>{if(e.target===layer)close();});}
 if(state?.day===today())try{localStorage.setItem('dm_daily_gift_seen:'+owner.toLocaleLowerCase('tr'),state.day);}catch{}
 render();layer.querySelector('.dg-dialog').focus({preventScroll:true});
 if(kind==='series'||!state||state.day!==today())void check({force:true,auto:false});
}
document.addEventListener('keydown',e=>{
 if(!layer)return;if(e.key==='Escape'){e.preventDefault();close();return;}
 if(e.key==='Tab'){const controls=[...layer.querySelectorAll('button:not(:disabled)')];if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===layer.firstChild)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!window.document)return;reset();if(layer&&(!parked()||!eligible()))close();maybeAuto();});}
const park=$('tab-dunya');if(park)new MutationObserver(schedule).observe(park,{attributes:true,attributeFilter:['class','style']});
document.addEventListener('dm:login',()=>{turn++;owner='';reset();void check();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
window.DijiDailyGift={check,open:()=>open('series'),decorateButton,onParkurVisible:maybeAuto};
window.gunlukEnerjiBonusuKontrolEt=()=>check();
window.DijiMeduPapiWallet?.refresh();
reset();setTimeout(()=>void check(),5000);
})();
