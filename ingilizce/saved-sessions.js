/* Device-local portal sessions. Passwords and personal profile data are never stored here. */
(()=>{'use strict';
 const KEY='dm_saved_sessions_v1';
 const read=()=>{try{const list=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(list)?list.filter(x=>x&&typeof x.token==='string'&&x.token&&typeof x.name==='string'&&['ogrenci','ogretmen'].includes(x.role)):[];}catch{return [];}};
 const write=list=>{try{localStorage.setItem(KEY,JSON.stringify(list));return true;}catch{return false;}};
 const current=()=>({name:localStorage.getItem('ing_aktifOgrenci')||'',token:localStorage.getItem('ing_token')||'',role:sessionStorage.getItem('ing_ogr_token')===localStorage.getItem('ing_token')?'ogretmen':'ogrenci',google:localStorage.getItem('ing_google_auth')==='true'});
 function remember(entry=current()){
  if(!entry.name||!entry.token)return;
  const list=read().filter(x=>x.name.toLocaleLowerCase('tr')!==entry.name.toLocaleLowerCase('tr')||x.role!==entry.role);
  list.unshift({name:entry.name,token:entry.token,role:entry.role,google:!!entry.google});write(list);
 }
 function forget(token){write(read().filter(x=>x.token!==token));}
 function queue(selected,previous=localStorage.getItem('ing_token')||''){
  if(!selected.name||!selected.token||!['ogrenci','ogretmen'].includes(selected.role))throw Error('Hesap bilgileri doğrulanamadı. Yeniden giriş yap.');
  remember();remember(selected);
  try{sessionStorage.setItem('dm_session_handoff_v1',JSON.stringify({...selected,previous,at:Date.now()}));}
  catch{throw Error('Tarayıcı oturumu kaydedemiyor. Depolama iznini kontrol et.');}
  // Do not change the active token until next startup: pagehide must save the outgoing owner.
  window.location.reload();
 }
 async function request(body,signal){
  const controller=new AbortController();
  const cancel=()=>controller.abort();if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',cancel,{once:true});
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetch(apiURL,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await r.json();return {response:r,data};
  }catch(e){if(signal?.aborted)throw Object.assign(Error('Hesap geçişi iptal edildi.'),{cancelled:true});if(controller.signal.aborted)throw Error('Bağlantı uzun sürdü. Hesabın açık kaldı; tekrar deneyebilirsin.');throw Error('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');}
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
 }
 async function activate(entry,{signal}={}){
  const before=localStorage.getItem('ing_token')||'';
  const {response,data:d}=await request({islem:'oturumBilgisi',t:entry.token},signal);
  if(signal?.aborted)throw Object.assign(Error('Hesap geçişi iptal edildi.'),{cancelled:true});
  if(!response.ok||!d.ok){const expired=response.status===401||response.status===403;if(expired)forget(entry.token);throw Object.assign(Error(d.mesaj||'Oturum kontrol edilemedi. Tekrar dene.'),{expired});}
  if((localStorage.getItem('ing_token')||'')!==before)throw Error('Başka bir sekmede hesap değişti. Listeyi yeniden aç.');
  queue({name:d.ogrenci,token:entry.token,role:d.rol,google:entry.google},before);
 }
 async function remove(entry){
  // Explicit removal means sign out this saved session; other device sessions are untouched.
  const {response:r,data}=await request({islem:'cikis',t:entry.token});
  if(!r.ok||data.ok===false)throw Error('Hesap kaldırılamadı. Bağlantını kontrol et.');
  forget(entry.token);
 }
 window.dmSavedSessions={remember,current,forget,list:read,activate,remove,queue,verifyLogin:(body,signal)=>request({islem:'giris',...body},signal)};
 remember();document.addEventListener('dm:login',()=>remember());
})();
