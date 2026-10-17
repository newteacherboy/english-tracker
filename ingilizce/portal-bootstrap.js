/* One session activation path. Password login does not reload the document. */
(()=>{'use strict';
let epoch=0,pending=null;
// Bound only startup reads; reward and save requests keep their own protocols.
window.dmStartupFetch=async function(url){
 const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),12000);
 try{return await fetch(url,{signal:controller.signal});}finally{clearTimeout(deadline);}
};
const $=id=>document.getElementById(id),name=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');

// Shared visual progress for the existing portal loading layer.
// Milestones represent finished startup stages, not downloaded bytes.
let dmProgressObserver=null,dmProgressTimer=null,dmProgressValue=0;
function dmProgressOverlay(){
 const overlay=$('oturumYuklemeOverlay');if(!overlay)return null;
 let widget=overlay.querySelector('#dmPortalProgress');
 if(!widget){
  widget=document.createElement('div');widget.id='dmPortalProgress';
  widget.setAttribute('role','progressbar');widget.setAttribute('aria-label','İngilizce portalı yükleniyor');
  widget.setAttribute('aria-valuemin','0');widget.setAttribute('aria-valuemax','100');
  widget.innerHTML='<div class="dm-portal-track"><div class="dm-portal-fill"></div></div><strong class="dm-portal-percent">0%</strong>';
  overlay.append(widget);
 }
 if(!document.getElementById('dmPortalProgressStyle')){
  const css=document.createElement('style');css.id='dmPortalProgressStyle';
  css.textContent='#dmPortalProgress{box-sizing:border-box;display:flex;gap:12px;align-items:center;width:min(270px,82vw);margin:16px auto 0;color:#70f6d4;font:800 16px system-ui,sans-serif;position:relative;z-index:5}#dmPortalProgress .dm-portal-track{flex:1;height:11px;border-radius:99px;background:#a2ffdc33;overflow:hidden;border:1px solid #8dfcdd66}#dmPortalProgress .dm-portal-fill{width:0;height:100%;border-radius:99px;background:linear-gradient(90deg,#00ac9c,#7ef7cc);transition:width .2s ease}#dmPortalProgress strong{width:48px;text-align:right;font-variant-numeric:tabular-nums}@media(prefers-reduced-motion:reduce){#dmPortalProgress .dm-portal-fill{transition:none}}';
  document.head.append(css);
 }
 return widget;
}
function dmSetProgress(n){
 const widget=dmProgressOverlay();if(!widget)return;
 dmProgressValue=Math.max(dmProgressValue,Math.min(100,Math.floor(n)));
 widget.querySelector('.dm-portal-fill').style.width=dmProgressValue+'%';
 widget.querySelector('.dm-portal-percent').textContent=dmProgressValue+'%';
 widget.setAttribute('aria-valuenow',String(dmProgressValue));
}
function dmStartProgress(){
 clearInterval(dmProgressTimer);dmProgressValue=0;dmSetProgress(8);
 // Hold at 90% until the requested route really opens.
 dmProgressTimer=setInterval(()=>{if(dmProgressValue<90)dmSetProgress(dmProgressValue+Math.max(1,Math.ceil((90-dmProgressValue)/15)));},220);
}
function dmEndProgress(){
 clearInterval(dmProgressTimer);dmSetProgress(100);
}
window.dmPortalProgress={start:dmStartProgress,set:dmSetProgress,finish:dmEndProgress};

const safe=(fn,...args)=>{if(typeof fn!=='function')return;try{return fn(...args);}catch(e){console.warn('Panel bileşeni açılamadı',e);}};
window.dmOpenPortalSession=function({student,seconds=0,refreshProfile=false}={}){
 const owner=String(student||'').trim();if(!owner)return Promise.resolve(false);
 if(pending?.owner===owner)return pending.task;
 const turn=++epoch;
 const task=(async()=>{
  aktifOgrenciAdi=owner;toplamSaniye=Number(seconds)||0;
  $('login-container').style.display='none';$('oturumYuklemeOverlay').style.display='flex';dmStartProgress();
  try{
   if(refreshProfile){
    const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),12000);
    try{const r=await fetch(apiURL,{cache:'no-store',signal:controller.signal}),rows=await r.json();if(r.ok&&Array.isArray(rows)&&turn===epoch&&name()===owner){globalDataCache=rows;safe(window.dijiGlobalCacheYaz,rows);}}catch(e){console.warn('Giriş profil bilgileri yenilenemedi',e);}finally{clearTimeout(deadline);}
   }
   if(turn!==epoch||name()!==owner)return false;
   dmSetProgress(55);
   const user=(typeof globalDataCache==='undefined'?[]:globalDataCache||[]).find(u=>String(u.ogrenci||'').trim().toLocaleLowerCase('tr')===owner.toLocaleLowerCase('tr'));
   if(user)toplamSaniye=Number(user.toplamsure)||toplamSaniye;
   sessionStorage.setItem('toplamSaniye',String(toplamSaniye));
   if($('ogrenciAdiText'))$('ogrenciAdiText').innerText=owner;
   if($('userAvatarLetter'))$('userAvatarLetter').innerText=window.ogrenciMaskotSec?.(owner)||'🦜';
   if(user)safe(window.veriArayuzeIsle,user);
   // Keep the branded loading layer until the selected route has finished rendering.
   // Otherwise an uninitialized/default panel flashes between login and the home route.
   $('panel-alani').style.display='block';
   safe(window.girisSerisiGuncelleVeGetir);safe(window.baslatSayac);safe(window.arkaPlanVeriYenilemeBaslat);
   dmSetProgress(70);
   await window.dmPrepareMemberState?.();
   dmSetProgress(82);
   if(turn!==epoch||name()!==owner)return false;
   // The chosen learning route is always the student's home screen.
   if(owner.toLowerCase()==='teacher')await window.meduAkisAc?.();else await window.dunyaAc?.();
   if(turn!==epoch||name()!==owner)return false;
   dmEndProgress();$('oturumYuklemeOverlay').style.display='none';
   document.dispatchEvent(new Event('dm:login'));
   // Announcements and daily bonus checks are not required for first paint.
   // Queue after a frame so home navigation remains interactive immediately.
   const afterPaint=()=>{
    setTimeout(()=>{
     if(turn!==epoch||name()!==owner)return;
     safe(window.anaPanelDuyuruBildirimleriYukle);
     safe(window.gunlukEnerjiBonusuKontrolEt);
    },0);
   };
   if(typeof requestAnimationFrame==='function')requestAnimationFrame(afterPaint);
   else afterPaint();
   return true;
  }catch(e){
   if(turn===epoch&&name()===owner){clearInterval(dmProgressTimer);$('panel-alani').style.display='block';$('oturumYuklemeOverlay').style.display='none';safe(window.yoToast,'Bir bölüm yüklenemedi. Oyunlar sekmesinden tekrar deneyebilirsin.');}
   console.warn('Portal açılışı tamamlanamadı',e);return false;
  }
 })();pending={owner,task};task.finally(()=>{if(pending?.task===task)pending=null;});return task;
};
})();
