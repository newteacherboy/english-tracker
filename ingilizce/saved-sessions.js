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
 async function activate(entry){
  const before=localStorage.getItem('ing_token');
  const response=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'oturumBilgisi',t:entry.token})});
  const d=await response.json();
  if(!response.ok||!d.ok){if(response.status===401||response.status===403)forget(entry.token);throw Error(d.mesaj||'Oturum kontrol edilemedi. Tekrar dene.');}
  if(localStorage.getItem('ing_token')!==before)throw Error('Başka bir sekmede hesap değişti. Listeyi yeniden aç.');
  remember();
  const selected={name:d.ogrenci,token:entry.token,role:d.rol,google:entry.google};
  remember(selected);
  localStorage.setItem('ing_token',selected.token);localStorage.setItem('ing_aktifOgrenci',selected.name);localStorage.setItem('ing_oturumAcik','true');localStorage.setItem('ing_toplamSaniye','0');
  if(selected.google)localStorage.setItem('ing_google_auth','true');else localStorage.removeItem('ing_google_auth');
  if(selected.role==='ogretmen')sessionStorage.setItem('ing_ogr_token',selected.token);else sessionStorage.removeItem('ing_ogr_token');
  sessionStorage.removeItem('ing_oturum_bitti');
  window.location.reload();
 }
 async function remove(entry){
  // Explicit removal means sign out this saved session; other device sessions are untouched.
  const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'cikis',t:entry.token})});
  if(!r.ok)throw Error('Hesap kaldırılamadı. Bağlantını kontrol et.');
  forget(entry.token);
 }
 window.dmSavedSessions={remember,current,forget,list:read,activate,remove};
 remember();document.addEventListener('dm:login',()=>remember());
})();
