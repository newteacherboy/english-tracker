(function(){
 const $=id=>document.getElementById(id);
 if(window.dmGuestMode)return;
 const msg=$('mesaj');if(msg){const b=document.createElement('button');b.type='button';b.id='dmVerificationResend';b.textContent='📩 Doğrulama e-postasını yeniden gönder';b.hidden=true;b.style.cssText='margin:10px 0;padding:10px;border:0;border-radius:12px;color:#245b4a;background:#e1f2e7;cursor:pointer';msg.insertAdjacentElement('afterend',b);new MutationObserver(()=>{b.hidden=!/E-posta adresine gönderdiğimiz/.test(msg.textContent);}).observe(msg,{subtree:true,childList:true,characterData:true});b.onclick=async()=>{b.disabled=true;try{const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'emailDogrulamaTekrar',ogrenci:$('ogrenci').value.trim(),sifre:$('sifre').value})});const d=await r.json();msg.textContent=d.mesaj||'Gönderim tamamlanamadı.';}catch(e){msg.textContent='Bağlantı kurulamadı. Tekrar dene.';}finally{b.disabled=false;}};}
 if(new URLSearchParams(location.search).get('kayit')==='1'&&!window.dmDiscoveryContext){history.replaceState(null,'',location.pathname);setTimeout(()=>{if(typeof kayitOlAc==='function')kayitOlAc();},600);}
})();
