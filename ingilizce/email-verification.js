/* Consume the email ticket once, then open the verified student's normal session. */
(()=>{'use strict';
 const ticket=new URLSearchParams(location.hash.slice(1)).get('token')||'';
 history.replaceState(null,'',location.pathname);
 const button=document.getElementById('verify'),status=document.getElementById('status'),login=document.getElementById('login');
 let busy=false;
 async function verify(){
  if(busy)return;busy=true;button.disabled=true;status.textContent='E-posta adresin doğrulanıyor…';
  try{
   const response=await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({islem:'emailDogrula',token:ticket})});
   const result=await response.json();
   if(!response.ok||!result.ok||!result.token||!result.ogrenci){status.textContent=result.mesaj||'Doğrulama tamamlanamadı. Yeni bağlantı iste.';button.hidden=true;login.hidden=false;return;}
   localStorage.setItem('ing_token',result.token);
   localStorage.setItem('ing_aktifOgrenci',result.ogrenci);
   localStorage.setItem('ing_oturumAcik','true');
   sessionStorage.removeItem('ing_ogr_token');
   localStorage.setItem('dm_email_verified',JSON.stringify({student:result.ogrenci,at:Date.now()}));
   status.textContent='E-posta adresin doğrulandı. Uygulama açılıyor…';button.hidden=true;
   location.replace('./');
  }catch{status.textContent='Bağlantı kurulamadı. Yeniden dene.';button.hidden=false;button.disabled=false;button.textContent='Yeniden dene';login.hidden=false;}
  finally{busy=false;}
 }
 button.onclick=verify;
 if(!ticket){status.textContent='Doğrulama bağlantısı eksik. E-postandaki bağlantıyı yeniden aç.';button.hidden=true;login.hidden=false;}
 else verify();
})();
