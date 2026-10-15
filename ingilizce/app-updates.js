/* Check for new workers without interrupting a lesson or clearing account data. */
(()=>{'use strict';
 if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;
 let registration,checking=false,lastCheck=0,shown=false;
 const hadController=!!navigator.serviceWorker.controller;
 function offerUpdate(){
  if(shown||!hadController)return;
  shown=true;
  const box=document.createElement('aside');box.id='dm-app-update';box.setAttribute('role','status');
  box.style.cssText='position:fixed;bottom:calc(88px + env(safe-area-inset-bottom,0px));left:12px;right:12px;max-width:440px;margin:auto;z-index:2147483646;display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #86efac;border-radius:16px;background:#f0fdf4;color:#14532d;box-shadow:0 4px 20px #0003;font:600 14px system-ui';
  const label=document.createElement('span');label.textContent='Yeni sürüm hazır. Uygun olduğunda yenileyebilirsin.';
  const button=document.createElement('button');button.type='button';button.textContent='Yenile';
  button.style.cssText='border:0;border-radius:10px;padding:10px 14px;background:#166534;color:#fff;font:700 14px system-ui;cursor:pointer';
  button.addEventListener('click',()=>{if(window.confirm('Sayfa yenilenecek. Devam eden etkinliğini tamamladıysan yenileyebilirsin.'))location.reload();});
  box.append(label,button);document.body.append(box);
 }
 navigator.serviceWorker.addEventListener('controllerchange',offerUpdate);
 async function check(){
  if(!registration||checking||navigator.onLine===false||document.visibilityState==='hidden'||Date.now()-lastCheck<60000)return;
  checking=true;lastCheck=Date.now();
  try{await registration.update();}catch{}finally{checking=false;}
 }
 async function start(){
  try{
   registration=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});
   await check();
   document.addEventListener('visibilitychange',check);
   window.addEventListener('online',check);
   setInterval(check,30*60*1000);
  }catch{/* Offline first visit: the next visit retries registration. */}
 }
 if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();
