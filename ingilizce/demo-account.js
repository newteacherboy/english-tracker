/* Presentation restrictions complement server checks bound to the demo student UUID. */
(()=>{'use strict';
 const demo=()=>typeof aktifOgrenciAdi!=='undefined'&&String(aktifOgrenciAdi).toLowerCase()==='dijimedu_demo';
 /* Demo hesabı her şeye erişir; yalnızca öğretmene mesaj, şifre değiştirme, hesap dondurma ve silme kapalı. */
 const selector='[data-profile="coach"],#dmAccountSettings [data-is="sifre"],#dmAccountSettings .dm-account-delete,#dmAccountSettings a[href="hesap-dondur.html"]';
 function paint(){
  document.body.classList.toggle('dm-demo-account',demo());
  document.querySelectorAll(selector).forEach(el=>{if(!demo())return;el.setAttribute('aria-disabled','true');el.title='Demo hesabında kapalı';el.style.opacity='.45';});
 }
 document.addEventListener('click',e=>{if(demo()&&e.target.closest(selector)){e.preventDefault();e.stopImmediatePropagation();window.yoToast?.('Demo hesabında bu işlem kapalı.');}},true);
 for(const event of ['dm:login','dm:state'])document.addEventListener(event,paint);
 let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;paint();});}).observe(document.body,{childList:true,subtree:true});
 paint();
})();
