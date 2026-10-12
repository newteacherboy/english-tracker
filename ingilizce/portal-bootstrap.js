/* One session activation path. Password login does not reload the document. */
(()=>{'use strict';
let epoch=0,pending=null;
// Bound only startup reads; reward and save requests keep their own protocols.
window.dmStartupFetch=async function(url){
 const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),12000);
 try{return await fetch(url,{signal:controller.signal});}finally{clearTimeout(deadline);}
};
const $=id=>document.getElementById(id),name=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const safe=(fn,...args)=>{if(typeof fn!=='function')return;try{return fn(...args);}catch(e){console.warn('Panel bileşeni açılamadı',e);}};
window.dmOpenPortalSession=function({student,seconds=0,refreshProfile=false}={}){
 const owner=String(student||'').trim();if(!owner)return Promise.resolve(false);
 if(pending?.owner===owner)return pending.task;
 const turn=++epoch;
 const task=(async()=>{
  aktifOgrenciAdi=owner;toplamSaniye=Number(seconds)||0;
  $('login-container').style.display='none';$('oturumYuklemeOverlay').style.display='flex';
  try{
   if(refreshProfile){
    const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),12000);
    try{const r=await fetch(apiURL,{cache:'no-store',signal:controller.signal}),rows=await r.json();if(r.ok&&Array.isArray(rows)&&turn===epoch&&name()===owner){globalDataCache=rows;safe(window.dijiGlobalCacheYaz,rows);}}catch(e){console.warn('Giriş profil bilgileri yenilenemedi',e);}finally{clearTimeout(deadline);}
   }
   if(turn!==epoch||name()!==owner)return false;
   const user=(typeof globalDataCache==='undefined'?[]:globalDataCache||[]).find(u=>String(u.ogrenci||'').trim().toLocaleLowerCase('tr')===owner.toLocaleLowerCase('tr'));
   if(user)toplamSaniye=Number(user.toplamsure)||toplamSaniye;
   sessionStorage.setItem('toplamSaniye',String(toplamSaniye));
   if($('ogrenciAdiText'))$('ogrenciAdiText').innerText=owner;
   if($('userAvatarLetter'))$('userAvatarLetter').innerText=window.ogrenciMaskotSec?.(owner)||'🦜';
   if(user)safe(window.veriArayuzeIsle,user);
   $('panel-alani').style.display='block';$('oturumYuklemeOverlay').style.display='none';
   safe(window.girisSerisiGuncelleVeGetir);safe(window.baslatSayac);safe(window.arkaPlanVeriYenilemeBaslat);
   await window.dmPrepareMemberState?.();
   if(turn!==epoch||name()!==owner)return false;
   // The chosen learning route is always the student's home screen.
   if(owner.toLowerCase()==='teacher')await window.meduAkisAc?.();else window.dmOpenGamesHome?.();
   if(turn!==epoch||name()!==owner)return false;
   safe(window.anaPanelDuyuruBildirimleriYukle);safe(window.gunlukEnerjiBonusuKontrolEt);
   document.dispatchEvent(new Event('dm:login'));
   return true;
  }catch(e){
   if(turn===epoch&&name()===owner){$('panel-alani').style.display='block';$('oturumYuklemeOverlay').style.display='none';safe(window.yoToast,'Bir bölüm yüklenemedi. Oyunlar sekmesinden tekrar deneyebilirsin.');}
   console.warn('Portal açılışı tamamlanamadı',e);return false;
  }
 })();pending={owner,task};task.finally(()=>{if(pending?.task===task)pending=null;});return task;
};
})();
