/* [17 Kas 2026] Parkurda Sürpriz Yumurta: haritadaki sandığın yerinde yuvada bir yumurta durur.
   Her 3 durakta bir çatlar; çatlama parkurun üstünde olur: canlı 3D Papi gelir, yumurtayı gagalar,
   ödüller (altın + enerji) üst çubuğa uçar. [18 Kas 2026] Çatlama artık tüm ekranda oynar.
   Sayım ve ödüller sunucuda (papi-rewards → dm_papi_egg). Eski sandıklar Mağaza > Sandıklarım'da durur. */
(()=>{'use strict';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const eligible=()=>!!who()&&!['teacher','dijimedu_demo'].includes(who().toLowerCase())&&!window.dmGuestMode&&!window.dmTeacherPortalMode&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci);
const parked=()=>!!document.getElementById('tab-dunya')?.classList.contains('active')&&!document.hidden&&!document.body.classList.contains('dm-play-session');
const KIND={benekli:{name:'Benekli yumurta',fill:'#FFF6E0',stroke:'#E7C98A'},gumus:{name:'Gümüş yumurta',fill:'#E6ECF3',stroke:'#A9B6C8'},altin:{name:'Altın yumurta',fill:'#FFE08A',stroke:'#E0A400'}};
let owner='',state=null,inflight=null,lastCheck=0,turn=0,busy=false,bubbleTimer=0,queued=false;
const autoKey=n=>'dm_egg_auto:'+who().toLocaleLowerCase('tr')+':'+n;

function egg(kind,cls=''){
 const k=KIND[kind]||KIND.benekli;
 const marks=kind==='benekli'?'<circle cx="20" cy="40" r="5" fill="#7BD3C9"/><circle cx="38" cy="28" r="4" fill="#B79CF2"/><circle cx="36" cy="54" r="6" fill="#FFC93C"/>'
  :'<path d="M14 34l8 6 6-8 6 8 8-6" stroke="'+(kind==='altin'?'#B37C00':'#7E8FA6')+'" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+(kind==='altin'?'<ellipse cx="22" cy="22" rx="5" ry="9" fill="#fff" fill-opacity=".55" transform="rotate(-20 22 22)"/>':'');
 return '<svg class="rt-egg-shell '+cls+'" viewBox="0 0 60 76" aria-hidden="true"><path d="M30 2C14 2 4 30 4 46c0 16 12 28 26 28s26-12 26-28C56 30 46 2 30 2z" fill="'+k.fill+'" stroke="'+k.stroke+'" stroke-width="2.5"/>'+marks+'</svg>';
}
function cracked(kind){
 const k=KIND[kind]||KIND.benekli;
 return '<svg class="rt-egg-cracked" viewBox="0 0 100 80" aria-hidden="true"><path class="rt-egg-half rt-egg-left" d="M20 40c0 22 12 34 30 34V44l-8-8-7 9-7-8z" fill="'+k.fill+'" stroke="'+k.stroke+'" stroke-width="2.5" stroke-linejoin="round"/><path class="rt-egg-half rt-egg-right" d="M80 40c0 22-12 34-30 34V44l8-8 7 9 7-8z" fill="'+k.fill+'" stroke="'+k.stroke+'" stroke-width="2.5" stroke-linejoin="round"/><path class="rt-egg-cap" d="M28 34c2-20 12-30 22-30s20 10 22 30l-7-6-7 8-8-9-8 9-7-8z" fill="'+k.fill+'" stroke="'+k.stroke+'" stroke-width="2.5" stroke-linejoin="round"/></svg>';
}
const NEST='<svg class="rt-egg-nest" viewBox="0 0 100 40" aria-hidden="true"><path d="M2 10c8 28 88 28 96 0z" fill="#B07A45"/><path d="M6 12c14 6 26 2 36 6M50 16c12-4 26 0 44-6M14 24c20 4 50 4 72-2" stroke="#7A4E25" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>';
function ring(progress,need){const c=289,on=Math.round(c*Math.max(0,Math.min(1,progress/need)));return '<svg class="rt-egg-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="#D5E3F3" stroke-width="7"/><circle cx="50" cy="50" r="46" fill="none" stroke="'+(progress>=need?'#FFC93C':'#2F80ED')+'" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+on+' '+c+'" transform="rotate(-90 50 50)"/></svg>';}

function paint(){
 document.querySelectorAll('.rt-medal-egg').forEach(b=>{
  if(b.classList.contains('is-hatching'))return;
  b.hidden=!eligible();if(b.hidden)return;
  const s=state,kind=s?.kind||'benekli',progress=s?Math.min(s.need,s.progress):0,need=s?.need||3,ready=!!s?.ready;
  const sig=[kind,progress,need,ready].join('|');if(b.dataset.sig===sig)return;b.dataset.sig=sig;
  b.dataset.kind=kind;b.classList.toggle('is-ready',ready);b.classList.toggle('is-close',!ready&&progress===need-1);
  b.innerHTML='<span class="rt-egg-art">'+ring(progress,need)+egg(kind)+NEST+'</span><span class="rt-egg-label">'+(s?(ready?'Çatlat!':progress+'/'+need+' durak'):'Yumurtam')+'</span>';
  b.setAttribute('aria-label',(KIND[kind]||KIND.benekli).name+(s?(ready?' çatlamaya hazır, dokun':' · '+progress+'/'+need+' durak · '+(need-progress)+' durak daha'):''));
 });
}
function endpoint(){return typeof apiURL==='string'?apiURL.replace(/\/diji-api(?:\?.*)?$/,'/papi-rewards'):'';}
function token(){return sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'';}
async function call(action){
 const url=endpoint(),t=token();if(!url.endsWith('/papi-rewards')||!t)throw Error('Öğrenci hesabınla giriş yap.');
 // [18 Kas 2026] Jeton gövdede, düz metin: tarayıcı ayrı ön kontrol (OPTIONS) isteği atmaz (günde ~600 çağrı). Sunucu b.t'yi okur.
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,t})});
 const d=await r.json();if(r.ok===false||!d?.ok)throw Object.assign(Error(d?.mesaj||'Bağlantı kurulamadı. Tekrar dene.'),{code:d?.code});return d;
}
function reset(){if(owner===who())return;turn++;owner=who();state=null;inflight=null;lastCheck=0;document.querySelectorAll('.rt-medal-egg').forEach(b=>delete b.dataset.sig);paint();}
async function check({force=false}={}){
 reset();if(!eligible()||busy)return state;
 if(!force&&state&&Date.now()-lastCheck<15000){paint();maybeAuto();return state;}
 if(inflight)return inflight;
 const account=owner,ticket=turn;lastCheck=Date.now();
 const task=(async()=>{try{const d=await call('yumurta');if(account!==who()||ticket!==turn)return null;state=d;paint();maybeAuto();return d;}catch{return null;}})();
 inflight=task;try{return await task;}finally{if(inflight===task)inflight=null;}
}
function visibleEgg(){
 const b=document.querySelector('#tab-dunya .rt-medal-egg');if(!b)return null;
 const r=b.getBoundingClientRect(),mid=r.top+r.height/2;return r.width&&mid>=80&&mid<=innerHeight-90?b:null;
}
function blocked(){return [...document.querySelectorAll('[role="dialog"],#yoModal.acik,#dmStoryLesson,.game-modal-overlay,.dm-tuy-layer')].some(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');}
function maybeAuto(){
 if(!state?.ready||busy||!parked()||!eligible()||blocked())return;
 const b=visibleEgg();if(!b)return;
 try{if(sessionStorage.getItem(autoKey(state.number)))return;sessionStorage.setItem(autoKey(state.number),'1');}catch{}
 setTimeout(()=>{if(state?.ready&&!busy&&parked()&&!blocked()&&b.isConnected)hatch(b);},700);
}
function bubble(b,html,ms=2600){
 clearTimeout(bubbleTimer);document.querySelectorAll('.rt-egg-bubble').forEach(e=>e.remove());
 const el=document.createElement('div');el.className='rt-egg-bubble';el.setAttribute('role','status');el.innerHTML=html;
 b.parentElement?.append(el);el.style.top=b.offsetTop+'px';
 bubbleTimer=setTimeout(()=>el.remove(),ms);
}
function tap(b){
 if(busy)return;
 if(!state){void check({force:true}).then(()=>state&&tap(b));return;}
 if(state.ready){hatch(b);return;}
 const left=state.need-state.progress;
 bubble(b,'<b>'+(KIND[state.kind]||KIND.benekli).name+'</b><span>'+left+' durak daha bitir, çatlasın.</span><small>İçinde ne var? Sürpriz!</small>');
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// [18 Kas 2026] Çatlama tüm ekranda: yumurta büyür, Papi gagalar, yumurta çatlar, ödüller büyük görünür.
// Sahne kapanınca ödüller üst çubuğa uçar.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function hatch(b){
 if(busy||!state?.ready)return;busy=true;
 const kind=state.kind,account=who(),reduced=matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const name=(KIND[kind]||KIND.benekli).name;
 b.classList.add('is-hatching');b.classList.remove('is-ready');document.body.classList.add('dm-egg-hatching');
 let mascot='';try{mascot=window.DMPapi?.html?window.DMPapi.html('merhaba','Papi'):'';}catch{}
 const stage=document.createElement('div');stage.className='egg-stage egg-k-'+(KIND[kind]?kind:'benekli');
 stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');stage.setAttribute('aria-label',name+' çatlıyor');
 stage.innerHTML='<div class="egg-stage-rays" aria-hidden="true"></div><div class="egg-stage-burst" aria-hidden="true"></div>'
  +'<p class="egg-stage-kicker">SÜRPRİZ YUMURTA</p><h2 class="egg-stage-title">'+esc(name)+'</h2>'
  +'<div class="egg-stage-scene"><div class="egg-stage-papi" aria-hidden="true">'+mascot+'</div><div class="egg-stage-egg" aria-hidden="true">'+egg(kind)+'</div></div>'
  +'<div class="egg-stage-prizes" role="status"></div><button type="button" class="egg-stage-ok" hidden>Harika!</button>'
  +'<i class="egg-stage-spark" aria-hidden="true"></i><i class="egg-stage-spark" aria-hidden="true"></i><i class="egg-stage-spark" aria-hidden="true"></i><i class="egg-stage-spark" aria-hidden="true"></i><i class="egg-stage-spark" aria-hidden="true"></i><i class="egg-stage-spark" aria-hidden="true"></i>';
 document.body.append(stage);
 document.documentElement.classList.add('egg-stage-open');
 requestAnimationFrame(()=>stage.classList.add('is-in'));
 const request=call('yumurta_cat').then(d=>({d}),e=>({e}));
 let d=null,failed=null;
 try{
  await wait(reduced?0:700);stage.classList.add('is-pecking');window.dmPapiHaptics?.light?.();
  const res=await request;
  if(res.e||account!==who()){throw res.e||Error('Hesap değişti.');}
  d=res.d;
  await wait(reduced?0:1000);
  const art=stage.querySelector('.egg-stage-egg');art.querySelector('.rt-egg-shell')?.remove();art.insertAdjacentHTML('beforeend',cracked(kind));
  const mapArt=b.querySelector('.rt-egg-art');if(mapArt){mapArt.querySelector('.rt-egg-shell')?.remove();mapArt.insertAdjacentHTML('beforeend',cracked(kind));}
  stage.classList.remove('is-pecking');stage.classList.add('is-open');try{window.DMPapi?.react?.(stage.querySelector('.egg-stage-papi'),'sevinc',2400,'mutlu');}catch{}
  try{window.genelSesEfektiCal?.('kombo');}catch{}
  window.dmPapiHaptics?.success?.();
  const got=d.opened||{};
  stage.querySelector('.egg-stage-prizes').innerHTML='<span><i class="rt-egg-coin"></i>+'+Number(got.gold||0)+' <small>altın</small></span><span><i class="rt-egg-bolt"></i>+'+Number(got.energy||0)+' <small>enerji</small></span>';
  const ok=stage.querySelector('.egg-stage-ok');
  await wait(reduced?200:700);ok.hidden=false;try{ok.focus({preventScroll:true});}catch{}
  // Dokununca ya da 3,5 sn sonra kendiliğinden kapanır.
  await new Promise(r=>{const t=setTimeout(r,reduced?2500:3500);ok.onclick=()=>{clearTimeout(t);r();};stage.addEventListener('click',e=>{if(e.target===stage){clearTimeout(t);r();}});});
 }catch(e){failed=e;}
 stage.classList.add('is-out');await wait(reduced?0:260);stage.remove();
 if(!document.querySelector('.egg-stage'))document.documentElement.classList.remove('egg-stage-open');
 try{
  if(failed)throw failed;
  // Ödülleri uygula: cüzdan artışı görünce ikonları göstergeye uçurur.
  if(d.yo)window.dmApplyRewardState?.(d.yo,account);else if(typeof yo!=='undefined'&&yo&&typeof d.altin==='number')yo.altin=d.altin;
  const got=d.opened||{};
  if(typeof d.enerjiKalan==='number'){window.headerEnerjiGoster?.(d.enerjiKalan,d.enerjiMax);try{window.genelEnerjiKalan=d.enerjiKalan;}catch{}if(got.eklenen>0)window.genelEnerjiDegisimGoster?.(got.eklenen);}
  window.DijiMeduPapiWallet?.refresh();
  state={...d,opened:null};
 }catch(e){
  bubble(b,'<b>Yumurta çatlamadı</b><span>'+String(e?.message||'Tekrar dene.').replace(/[<>&]/g,'')+'</span>',3200);
  void check({force:true});
 }finally{
  b.classList.remove('is-hatching','is-pecked');delete b.dataset.sig;document.body.classList.remove('dm-egg-hatching');busy=false;paint();
 }
}
/* [18 Kas 2026] Supabase yükü: parkurdaki her sınıf/stil değişiminde (Papi yürürken sürekli) 15 sn'de bir sunucuya
   soruluyordu. Yumurta durumu yalnız durak bitince (dm:state), girişte ve uygulamaya dönünce değişir; burada
   yalnız ekrandaki yumurta yeniden çizilir, durum hiç alınmadıysa bir kez sorulur. */
let stale=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reset();paint();if(parked()){if(state&&!stale)maybeAuto();else{stale=false;void check({force:true});}}});}
// Durak bitince sayı değişir: parkura dönüldüğünde (harita yeniden çizilince) durum bir kez yeniden alınır.
for(const ev of ['dm:school-lesson-completed','dm:lesson-completed','dm:learning-progress'])document.addEventListener(ev,()=>{stale=true;});
const tab=document.getElementById('tab-dunya');
if(tab){new MutationObserver(ms=>{if(ms.some(m=>m.type==='attributes'||[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.rt-medal-egg')||n.querySelector?.('.rt-medal-egg')))))schedule();}).observe(tab,{attributes:true,attributeFilter:['class','style'],childList:true,subtree:true});
 tab.addEventListener('scroll',()=>{if(state?.ready)maybeAuto();},{capture:true,passive:true});}
document.addEventListener('dm:login',()=>{turn++;owner='';reset();void check({force:true});});
document.addEventListener('dm:state',()=>{if(parked())void check();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&parked())void check();});
window.DijiPapiEgg={tap,check,state:()=>state,paint};
setTimeout(()=>void check(),4000);
})();
