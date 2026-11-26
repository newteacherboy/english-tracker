/* A verified rewarded video unlocks one play in the selected game. */
(() => {
 'use strict';
 const games=new Set(['word-match','papizzle','cloud-flight','word-goal','rally']);
 const base=new URL('.',document.currentScript?.src||location.href).href;
 const token=()=>localStorage.getItem('ing_token')||'';
 let current=null;
 async function request(op,game,extra={},expected=token()) {
  if(!expected||token()!==expected)throw Error('Hesabına yeniden giriş yap.');
  const url=(typeof apiURL==='string'?apiURL:'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/,'premium-games');
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:expected,game,op,...extra}),signal:AbortSignal.timeout(15000)});
  const d=await r.json();
  if(token()!==expected)throw Error('Öğrenci oturumu değişti.');
  if(!r.ok||d.ok===false)throw Error(d.mesaj||'Oyun hakkın doğrulanamadı. Tekrar dene.');
  return d;
 }
 function close(){current?.close();}
 function open({game,onReady,onPlans}={}) {
  if(!games.has(game))return;
  close();
  const owner=token(),previous=document.activeElement,veil=document.createElement('dialog');
  veil.className='dmpo-veil';veil.setAttribute('role','dialog');veil.setAttribute('aria-modal','true');veil.setAttribute('aria-labelledby','dmpo-title');
  veil.innerHTML='<section class="dmpo-card"><button type="button" class="dmpo-x" data-close aria-label="Kapat">×</button><div class="dmpo-hero"><img src="'+base+'premium-assets/papi-game-offer.webp" alt="Oyun kumandasıyla Papi" width="180" height="180"></div><h2 id="dmpo-title">Bugünkü oyun<br>hakkın doldu!</h2><p class="dmpo-copy">Eğlenceye devam etmek için seçimini yap.</p><button type="button" class="dmpo-video" data-video><span aria-hidden="true">▶</span><b>Reklam izle ve oyna</b></button><p class="dmpo-hint">Reklamı tamamla, 1 oyun hakkı kazan.</p><button type="button" class="dmpo-pro" data-pro><span aria-hidden="true">∞</span><b>Premium Pro ile<br>Sınırsız oyna</b></button><p class="dmpo-hint">Oyun keyfin hiç bitmesin!</p><p class="dmpo-status" role="status" aria-live="polite"></p><button type="button" class="dmpo-later" data-close>Daha sonra</button></section>';
  const video=veil.querySelector('[data-video]'),msg=veil.querySelector('.dmpo-status');
  let busy=false,offerId=null,recheck=false;
  const alive=()=>current?.node===veil&&veil.isConnected&&token()===owner;
  const dismiss=()=>{veil.close?.();veil.remove();document.removeEventListener('keydown',keys,true);document.removeEventListener('dm:login',login);window.dmViewHistory?.leave?.(veil);if(current?.node===veil)current=null;if(previous?.isConnected)previous.focus({preventScroll:true});};
  const login=()=>{if(token()!==owner)dismiss();};
  function keys(e){if(!alive())return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!busy)dismiss();}if(e.key==='Tab'){const buttons=[...veil.querySelectorAll('button:not(:disabled)')];const i=buttons.indexOf(document.activeElement);e.preventDefault();e.stopImmediatePropagation();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}}
  current={node:veil,close:dismiss};
  veil.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(!busy)dismiss();});
  veil.onclick=e=>{if(e.target===veil&&!busy)dismiss();};
  veil.querySelector('[data-pro]').onclick=()=>{if(busy)return;dismiss();onPlans?.();if(window.DMSatis?.planlar)window.DMSatis.planlar('premium-oyun-hakki','premium_pro');else if(window.dmAndroidBilling?.available)window.dmAndroidBilling.open('premium-oyun-hakki');else window.yoToast?.('Paketleri uygulamanın Mağaza bölümünden görebilirsin.');};
  const enabled=window.dmAndroidPlacements?.rewardEnabled?.()!==false;
  const available=typeof window.dmAndroidAds?.show==='function'&&enabled&&!window.dmAndroidIsTeacher?.();
  if(!available){video.disabled=true;msg.textContent='Ödüllü reklam şu anda kullanılamıyor. Reklam destekli uygulamada tekrar deneyebilirsin.';}
  else if(window.dmAndroidPlacements?.rewardAllowed?.('energy')===false){video.disabled=true;msg.textContent='Bugünkü reklam hakkın da doldu. Yarın tekrar oynayabilirsin.';}
  video.onclick=async()=>{
   if(busy||!alive())return;busy=true;veil.querySelectorAll('button').forEach(b=>b.disabled=true);msg.textContent=recheck?'Oyun hakkın kontrol ediliyor…':'Reklam hazırlanıyor…';
   try{
    if(!recheck){const offer=await request('ad-prepare',game,{},owner);offerId=offer.offerId;if(!alive())return;
     const result=await window.dmAndroidAds.show('energy');if(!alive())return;
     if(result.test)throw Error('Test reklamları gerçek oyun hakkı kazandırmaz.');
     if(!result.completed)throw Error('Reklamı tamamladığında 1 oyun hakkı kazanabilirsin.');
     recheck=true;
     if(typeof result.energy==='number'){window.genelEnerjiKalan=result.energy;window.headerEnerjiGoster?.(result.energy,window.genelEnerjiMax||25);}
    }
    const d=await request('ad-redeem',game,{offerId},owner);if(!alive())return;
    if(!d.claimed){msg.textContent='Reklam ödülün doğrulanıyor. Birazdan hakkını tekrar kontrol et.';video.querySelector('b').textContent='Oyun hakkımı kontrol et';return;}
    dismiss();await onReady?.(d);
   }catch(e){if(alive())msg.textContent=e.message||'Reklam açılamadı. Tekrar deneyebilirsin.';}
   finally{busy=false;if(alive())veil.querySelectorAll('button').forEach(b=>b.disabled=false);}
  };
  document.body.append(veil);veil.showModal?.();document.addEventListener('keydown',keys,true);document.addEventListener('dm:login',login);window.dmViewHistory?.track?.(veil,{close:()=>{if(!busy)dismiss();}});veil.querySelector('[data-close]').focus({preventScroll:true});
  return veil;
 }
 window.dmPremiumPlayOffer={open,close,request};
})();
