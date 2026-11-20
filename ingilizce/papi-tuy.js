/* [17 Kas 2026] Papi'nin Kanadı: ateş serisinin yerine geçer (eski daily-gift.js'in yerine yüklenir).
   O gün en az 1 durak bitiren öğrenci günün tüyünü alır; tüy, canlı 3D Papi'nin arkasındaki yelpazede açılır.
   7 tüy = kanat dolar: +10 enerji, kanat seviyesi +1. Kaçan gün 1 tüy düşürür (3+ gün: kanat sıfırlanır, seviye kalır).
   Tarih, sayım ve enerji tamamen sunucuda (papi-rewards → dm_papi_feather). Cüzdan aynı arayüzü (window.DijiDailyGift) kullanır. */
(()=>{'use strict';
const $=id=>document.getElementById(id),who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const eligible=()=>!!who()&&!['teacher','dijimedu_demo'].includes(who().toLowerCase())&&!window.dmGuestMode&&!window.dmTeacherPortalMode&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const parked=()=>!!$('tab-dunya')?.classList.contains('active')&&!document.hidden&&!document.body.classList.contains('dm-play-session');
const key=owner=>'dm_papi_wing_v1:'+owner.toLocaleLowerCase('tr');
const NEED=7,REWARD=7;
let owner='',state=null,inflight=null,layer=null,origin=null,message='',turn=0,lastCheck=0,celebrate=null,fresh=-1,queued=false,buying=false;

const FEATHER='M0 0C13-38 17-92 0-150C-17-92-13-38 0 0z';
const COLORS=['#1FB5A8','#22BFB2','#1AA3A8','#1688A3','#3E6BD6','#6A47E8','#FFC93C'];
const ICON='<svg class="dm-tuy-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="M33 4C20 6 10 16 8 30l-3 6 3-1c14-2 24-12 25-31z" fill="#1FB5A8"/><path d="M33 4C22 12 14 22 6 36" stroke="#0E7C73" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M15 21l6 1M12 27l6 1M19 15l6 1" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/></svg>';
const BOLT='<svg class="dm-tuy-bolt" viewBox="0 0 40 40" aria-hidden="true"><path d="M22 3L8 22h11l-2 15 15-20H21z" fill="#FFC93C" stroke="#E0A400" stroke-width="1.5"/></svg>';
function fan(filled,newest){
 const angles=[-78,-52,-26,0,26,52,78];
 return '<svg class="dm-tuy-fan" viewBox="0 0 360 230" aria-hidden="true"><g transform="translate(180 215)">'+angles.map((a,i)=>i<filled
  ?'<g transform="rotate('+a+')"><path class="'+(i===newest?'dm-tuy-new':'')+'" d="'+FEATHER+'" fill="'+COLORS[i]+'"/><path d="M0 -6V-140" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/></g>'
  :'<g transform="rotate('+a+')"><path d="'+FEATHER+'" fill="#fff" fill-opacity=".55" stroke="'+(i===6?'#E0A400':'#9FC9C4')+'" stroke-width="2.5" stroke-dasharray="6 5"/></g>').join('')+'</g></svg>';
}
function papi(mood){
 try{if(window.DMPapi?.html)return '<div class="dm-tuy-papi">'+window.DMPapi.html(mood,'Papi')+'</div>';}catch{}
 return '<div class="dm-tuy-papi"><img src="daily-gift-assets/papi-streak-3d.webp" alt="Papi" width="200" height="216"></div>';
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=n=>Math.max(0,Math.min(NEED,Math.floor(Number(n)||0)));

function cacheRead(){try{const v=JSON.parse(localStorage.getItem(key(who()))||'null');return v?.day===today()?v:null;}catch{return null;}}
function close(){if(!layer)return;layer.remove();layer=null;fresh=-1;if(origin?.isConnected)origin.focus({preventScroll:true});origin=null;}
function reset(){if(owner===who())return;turn++;close();owner=who();state=eligible()?cacheRead():null;inflight=null;message='';celebrate=null;lastCheck=0;decorateAll();}
function shown(){return state?(state.wingDone?NEED:count(state.feathers)):null;}
function decorateButton(button){
 if(!button.querySelector('.dm-tuy-icon')){button.innerHTML=ICON+'<b data-daily-count>·</b><small>Tüy</small>';button.classList.add('dm-tuy-button');}
 const n=shown(),ready=!!state&&!state.todayDone;
 button.classList.toggle('dm-daily-ready',false);button.classList.toggle('dm-tuy-waiting',ready);
 const text=button.querySelector('[data-daily-count]'),value=n==null?'·':n+'/'+NEED;if(text&&text.textContent!==value)text.textContent=value;
 const label="Papi'nin Kanadı"+(n==null?'':' · '+n+'/'+NEED+' tüy')+(ready?' · Bugün giriş yap, tüyünü al':'');if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
}
function decorateAll(){if(!window.document)return;document.querySelectorAll('[data-dm-daily-streak]').forEach(decorateButton);}
function endpoint(){return typeof apiURL==='string'?apiURL.replace(/\/diji-api(?:\?.*)?$/,'/papi-rewards'):'';}
function token(){return sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'';}
function setEnergy(d){
 if(typeof d.enerjiKalan!=='number')return;
 window.headerEnerjiGoster?.(d.enerjiKalan,d.enerjiMax);
 try{window.genelEnerjiKalan=d.enerjiKalan;kpEnerjiKalan=d.enerjiKalan;kpEnerjiMax=d.enerjiMax;window.kpEnerjiSatiriniGuncelle?.();}catch{}
}
function apply(d){
 if(!d?.ok||!Number.isInteger(d.feathers)||typeof d.day!=='string')throw Error("Papi'nin Kanadı yüklenemedi.");
 state={...d};
 try{localStorage.setItem(key(owner),JSON.stringify(state));}catch{}
 if($('headerStreakNum'))$('headerStreakNum').textContent='🪶 '+shown()+'/'+NEED;
 decorateAll();
}
async function request(){
 const url=endpoint(),t=token();if(!url.endsWith('/papi-rewards')||!t)throw Error('Öğrenci hesabınla giriş yap.');
 // [18 Kas 2026] Jeton gövdede, düz metin: ayrı ön kontrol (OPTIONS) isteği oluşmaz. Sunucu b.t'yi okur.
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action:'tuy',t})});
 const d=await response.json();if(response.ok===false||!d?.ok)throw Error(d?.mesaj||'Bağlantı kurulamadı. Tekrar dene.');return d;
}
async function check({force=false,auto=true}={}){
 reset();if(!eligible())return null;
 // Bugünün tüyü alındıysa gün değişene kadar sunucuya gitmeye gerek yok; alınmadıysa durak sonrası kısa aralıkla yeniden sorulur.
 if(!force&&state?.day===today()&&(state.todayDone||Date.now()-lastCheck<20000)){if(auto)maybeAuto();return state;}
 if(inflight)return inflight;
 const account=owner,ticket=turn;lastCheck=Date.now();
 const task=(async()=>{try{const d=await request();if(account!==who()||ticket!==turn)return null;apply(d);message='';
   if(d.justEarned){celebrate=d.wingDone?'wing':'feather';fresh=d.wingDone?6:count(d.feathers)-1;}
   if(d.eklenen>0&&!d.wingDone){setEnergy(d);window.genelEnerjiDegisimGoster?.(d.eklenen);}if(d.justEarned)window.dmNotificationCenter?.refresh?.(true);
   if(layer)render();if(auto)maybeAuto();return state;}
  catch(e){if(account===who()&&ticket===turn){message=e.message;if(layer)render();}return null;}})();
 inflight=task;try{return await task;}finally{if(inflight===task)inflight=null;}
}
function blocked(){return [...document.querySelectorAll('[role="dialog"],#yoModal.acik,#dmStoryLesson,.game-modal-overlay')].some(e=>!layer?.contains(e)&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');}
function maybeAuto(){
 if(!celebrate||!state||layer||!parked()||!eligible()||blocked())return;
 const kind=celebrate;celebrate=null;open(kind==='wing'?'wing':'panel',true);
}
function notice(){
 if(message)return message;
 if(!state)return '';
 if(state.shieldUsed>0)return 'Tüy Yağı kanadını korudu: kaçan '+state.shieldUsed+' günde tüy düşmedi.';
 if(state.justEarned&&state.lost>0)return state.lost+' tüy düşmüştü; bugünkü tüyünle kanadın yeniden doluyor.';
 if(state.justEarned)return 'Bugünün tüyü kanadına eklendi!';
 if(!state.todayDone&&state.atRisk>0)return 'Ara verdin: bugün giriş yapmazsan '+state.atRisk+' tüy düşecek.';
 if(!state.todayDone)return 'Her gün giriş yap, bir tüy ve 1 enerji kazan.';
 if(state.bekleyenEnerji>0)return 'Enerjin dolu. +'+state.bekleyenEnerji+' enerji, enerjin azalınca eklenecek.';
 return 'Bugünün tüyünü aldın. Yarın yine gel!';
}
function strip(){
 const done=new Set(state?.days||[]),out=[];const base=new Date(today()+'T12:00:00Z');
 for(let i=6;i>=0;i--){const d=new Date(base.getTime()-i*86400000),stamp=d.toISOString().slice(0,10),name=i===0?'Bugün':new Intl.DateTimeFormat('tr-TR',{weekday:'short',timeZone:'UTC'}).format(d).replace('.','');
  out.push('<li class="'+(done.has(stamp)?'is-on':'')+(i===0?' is-today':'')+'" aria-label="'+esc(name)+(done.has(stamp)?', tüy alındı':', tüy alınmadı')+'">'+ICON+'<span>'+esc(name)+'</span></li>');}
 return '<ol class="dm-tuy-days" aria-label="Son 7 gün">'+out.join('')+'</ol>';
}
function shieldInfo(){const y=typeof yo==='undefined'?{}:yo||{},price=typeof YO_DONDURUCU_FIYAT==='number'?YO_DONDURUCU_FIYAT:150;return {owned:Math.max(0,Math.floor(Number(y.dondurucu)||0)),price};}
function render(){
 if(!layer)return;
 const sheet=layer.querySelector('.dm-tuy-sheet');
 const x='<button type="button" class="dm-tuy-close" data-tuy-close aria-label="Kapat">×</button>';
 if(layer.dataset.kind==='wing'){
  layer.classList.add('dm-tuy-wing-layer');
  sheet.className='dm-tuy-sheet dm-tuy-wing';
  sheet.innerHTML=x+'<p class="dm-tuy-badge">KANAT SEVİYESİ '+esc(state?.level||1)+'</p><h2 id="dmTuyTitle">Papi’nin kanadı doldu!</h2><p class="dm-tuy-sub">7 gün boyunca giriş yaptın.</p><div class="dm-tuy-stage dm-tuy-stage-wing">'+fan(NEED,6)+papi('cosku')+'</div><div class="dm-tuy-prize">'+BOLT+'+'+REWARD+' enerji</div><p class="dm-tuy-status" role="status">'+esc(state?.bekleyenEnerji>0?'Enerjin dolu. Kalan +'+state.bekleyenEnerji+' enerji, enerjin azalınca eklenecek.':'')+'</p><button type="button" class="dm-tuy-primary dm-tuy-gold" data-tuy-collect>Topla</button>';
 }else{
  layer.classList.remove('dm-tuy-wing-layer');
  sheet.className='dm-tuy-sheet';
  const n=state?count(state.feathers):0,left=NEED-n,{owned,price}=shieldInfo();
  sheet.innerHTML=x+'<span class="dm-tuy-grip" aria-hidden="true"></span><header><h2 id="dmTuyTitle">'+ICON+' Kuş Tüyü Serisi</h2></header>'+
   '<div class="dm-tuy-stage"><div class="dm-tuy-summary"><strong>'+n+' / '+NEED+' tüy</strong><small>'+esc(state?.todayDone?'Bugünkü tüyünü aldın':state?'Kanat seviyesi '+state.level:'Kanadın yükleniyor…')+'</small></div><div class="dm-tuy-art">'+fan(n,fresh)+papi(state?.todayDone?'mutlu':'merhaba')+'</div></div>'+
   strip()+'<p class="dm-tuy-next">'+(state?(left>0?left+' tüy daha · <b>+'+REWARD+' enerji</b>':'Kanat doldu!'):'')+'</p>'+
   '<div class="dm-tuy-rewards"><div>⚡ Günlük ödül · <b>+1 enerji</b></div></div>'+
   (state?.bekleyenEnerji>0||state?.atRisk>0||message?'<p class="dm-tuy-status" role="status">'+esc(notice())+'</p>':'')+
   '<div class="dm-tuy-time" data-wing-time></div>'+
   '<div class="dm-tuy-actions"><button type="button" class="dm-tuy-oil" data-tuy-oil '+(buying?'disabled':'')+' aria-label="Tüy Yağı al, '+price+' altın. Elinde '+owned+' / 2">Tüy Yağı · '+price+'<small>'+owned+'/2</small></button></div>'+
   (message?'<button type="button" class="dm-tuy-retry" data-tuy-retry>Tekrar dene</button>':'');
 }
 paintTime();sheet.querySelectorAll('[data-tuy-close]').forEach(b=>b.onclick=close);
 sheet.querySelector('[data-tuy-retry]')?.addEventListener('click',()=>{message='';render();void check({force:true,auto:false});});
 sheet.querySelector('[data-tuy-collect]')?.addEventListener('click',collect);
 sheet.querySelector('[data-tuy-oil]')?.addEventListener('click',buyOil);
}
function paintTime(){
 const box=layer?.querySelector('[data-wing-time]');if(!box)return;
 const value=window.dmActiveTime?.summary?.();
 if(!value){box.textContent='Aktif süre yükleniyor…';return;}
 const seconds=Math.max(0,Math.floor(Number(value.seconds)||0));
 const elapsed=seconds%6000,minutes=Math.floor(elapsed/60);
 const totalMinutes=Math.floor(seconds/60),hours=Math.floor(totalMinutes/60);
 if(box.dataset.minute===String(totalMinutes))return;
 box.dataset.minute=String(totalMinutes);
 const total=(hours?hours+' sa ':'')+totalMinutes%60+' dk';
 box.innerHTML='<div><b>Aktif süre · '+total+'</b><small>'+minutes+' / 100 dk</small></div><progress max="100" value="'+minutes+'" aria-label="100 dakikalık aktif süre ilerlemesi"></progress>';
}
document.addEventListener('dm:time',paintTime);
setInterval(paintTime,15000);
function collect(){
 const d=state;close();
 // Kanat doldu: yeni kanat 0 tüyle başlar (sunucuda da öyle kaydedildi).
 if(d?.wingDone){state={...d,wingDone:false,feathers:0,justEarned:false};try{localStorage.setItem(key(owner),JSON.stringify(state));}catch{}decorateAll();}
 if(d?.eklenen>0){setEnergy(d);window.genelEnerjiDegisimGoster?.(d.eklenen);}
 window.DijiMeduPapiWallet?.refresh();
}
async function buyOil(){
 const {owned,price}=shieldInfo();
 if(buying)return;
 if(owned>=2){message='En fazla 2 Tüy Yağı taşıyabilirsin.';render();message='';return;}
 const gold=typeof yo==='undefined'?0:Number(yo?.altin)||0;
 if(gold<price){message=(price-gold)+' altın daha lazım.';render();message='';return;}
 if(!window.dmEkonomi?.islem){message='Mağaza şu an açılamadı.';render();message='';return;}
 buying=true;render();
 try{const d=await window.dmEkonomi.islem('dondurucuAl');message=d?.ok?'Tüy Yağı alındı! Kaçan bir günde tüyün düşmez.':(d?.mesaj||'Satın alma tamamlanamadı.');}
 catch(e){message=e.message||'Satın alma tamamlanamadı.';}
 finally{buying=false;render();message='';window.DijiMeduPapiWallet?.refresh();}
}
function open(kind='panel',auto=false){
 reset();if(!eligible())return;
 if(!auto)fresh=-1;origin=document.activeElement;
 if(!layer){layer=document.createElement('div');layer.className='dm-tuy-layer';layer.innerHTML='<section class="dm-tuy-sheet" role="dialog" aria-modal="true" aria-labelledby="dmTuyTitle" tabindex="-1"></section>';document.body.append(layer);layer.addEventListener('click',e=>{if(e.target===layer)(layer.dataset.kind==='wing'?collect:close)();});}
 layer.dataset.kind=kind;render();layer.querySelector('.dm-tuy-sheet').focus({preventScroll:true});
 if(!auto&&kind==='panel')void check({force:true,auto:false});
}
document.addEventListener('keydown',e=>{
 if(!layer)return;if(e.key==='Escape'){e.preventDefault();(layer.dataset.kind==='wing'?collect:close)();return;}
 if(e.key==='Tab'){const controls=[...layer.querySelectorAll('button:not(:disabled)')];if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!window.document)return;reset();if(layer&&layer.dataset.kind!=='wing'&&!eligible())close();if(parked())void check();});}
const park=$('tab-dunya');if(park)new MutationObserver(schedule).observe(park,{attributes:true,attributeFilter:['class','style']});
document.addEventListener('dm:login',()=>{turn++;owner='';reset();void check();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
// Durak bitince sonuç ekranı kapanıp parkura dönülür; bu an tüyün geldiği andır.
document.addEventListener('dm:state',()=>{if(parked())void check();});
window.DijiDailyGift={check,open:()=>open('panel'),decorateButton,onParkurVisible:maybeAuto,state:()=>state};
window.DijiPapiWing=window.DijiDailyGift;
window.gunlukEnerjiBonusuKontrolEt=()=>check();
window.DijiMeduPapiWallet?.refresh();
reset();setTimeout(()=>void check(),5000);
})();
