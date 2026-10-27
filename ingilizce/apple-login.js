/* Enable Apple only after the provider configuration actually becomes available. */
(()=>{'use strict';
 // iOS uygulamasında Google girişi gösterilmediği için Apple girişine de gerek yok (Apple 4.8 yalnızca üçüncü taraf giriş varsa ister).
 let native=false;try{native=!!window.Capacitor?.isNativePlatform?.();}catch(_){}
 let enabled=false,busy=false;
 const label='Apple ile giriş yap';
 async function start(){if(!enabled||busy||!window.supabaseClient?.auth)return;busy=true;try{
  const callback=new URL(location.pathname,location.origin);callback.searchParams.set('kesifKayit','apple');
  const {error}=await window.supabaseClient.auth.signInWithOAuth({provider:'apple',options:{redirectTo:callback.href}});if(error)throw error;
 }catch(e){window.alert('Apple ile giriş başlatılamadı. Lütfen tekrar dene.');busy=false;}}
 function mount(){
  const login=document.getElementById('login-container');
  if(login&&!login.querySelector('[data-reactivate]')){const link=document.createElement('a');link.dataset.reactivate='';link.href='hesap-ac.html';link.textContent='Dondurulan hesabımı yeniden aç';link.style.cssText='display:block;text-align:center;margin-top:16px;color:#126573;font-size:14px';login.append(link);}
  if(!enabled||native)return;
  for(const target of [login?.querySelector('.dm-login-actions'),...document.querySelectorAll('#dmDiscovery [data-action="google"]')].filter(Boolean)){
   const host=target.matches('[data-action="google"]')?target.parentElement:target;
   if(host.querySelector('[data-apple-login]'))continue;
   const button=document.createElement('button');button.type='button';button.dataset.appleLogin='';button.textContent=label;button.setAttribute('aria-label',label);button.style.cssText='display:block;box-sizing:border-box;width:100%;min-height:48px;margin-top:10px;border:1px solid #111;border-radius:9px;background:#111;color:#fff;font:600 15px system-ui;cursor:pointer';button.onclick=start;host.append(button);
  }
 }
 const observer=new MutationObserver(mount);
 for(const root of [document.getElementById('login-container'),document.getElementById('dmDiscovery')].filter(Boolean))observer.observe(root,{childList:true,subtree:true});
 mount();
 fetch('https://nxfqlutulxqzqgwewssd.supabase.co/auth/v1/settings',{headers:{apikey:'sb_publishable_K9h4CnyaL8xb8B98o8aaFw_s9cMikuF'}}).then(r=>r.json()).then(settings=>{enabled=!!settings.external?.apple;mount();}).catch(()=>{});
})();
