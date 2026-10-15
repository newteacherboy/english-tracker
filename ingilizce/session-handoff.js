/* Runs before application startup: outgoing page saves use its own session. */
(()=>{'use strict';
 const KEY='dm_session_handoff_v1';let next;
 try{next=JSON.parse(sessionStorage.getItem(KEY)||'null');sessionStorage.removeItem(KEY);}catch{return;}
 if(!next||!next.token||!next.name||!['ogrenci','ogretmen'].includes(next.role)||Date.now()-next.at>60000||next.at>Date.now()+5000)return;
 if((localStorage.getItem('ing_token')||'')!==next.previous)return;
 const keys=['ing_token','ing_aktifOgrenci','ing_oturumAcik','ing_toplamSaniye','ing_google_auth'];
 const previous=keys.map(k=>[k,localStorage.getItem(k)]),teacher=sessionStorage.getItem('ing_ogr_token');
 try{
  localStorage.setItem('ing_token',next.token);localStorage.setItem('ing_aktifOgrenci',next.name);localStorage.setItem('ing_oturumAcik','true');localStorage.setItem('ing_toplamSaniye','0');
  if(next.google)localStorage.setItem('ing_google_auth','true');else localStorage.removeItem('ing_google_auth');
  if(next.role==='ogretmen')sessionStorage.setItem('ing_ogr_token',next.token);else sessionStorage.removeItem('ing_ogr_token');
  sessionStorage.removeItem('ing_oturum_bitti');
 }catch{
  for(const [k,v]of previous)try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{}
  try{if(teacher===null)sessionStorage.removeItem('ing_ogr_token');else sessionStorage.setItem('ing_ogr_token',teacher);}catch{}
 }
})();
