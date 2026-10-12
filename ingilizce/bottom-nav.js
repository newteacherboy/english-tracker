/* Six icon-only destinations and the approved profile popover. */
(()=>{'use strict';
const layout=[['tab-dunya','Parkur','path'],['tab-meduakis','Arkadaşlar','friends'],['tab-aktiviteler','Oyunlar','game'],['tab-derscalis','Ders Çalış','book'],['tab-magaza','Mağaza','shop'],['tab-dunyam','Profil','profile']];
function close(){const panel=document.getElementById('rtProfileBackdrop');if(!panel)return;panel.remove();document.getElementById('bottomNavMobile')?.querySelector('[data-ekran="tab-dunyam"]')?.setAttribute('aria-expanded','false');window.dcBottomNavSenkronize?.();}
window.dmProfileMenuAc=function(){if(document.getElementById('rtProfileBackdrop')){close();return;}const nav=document.getElementById('bottomNavMobile'),last=nav?.querySelector('[data-ekran="tab-dunyam"]');if(!last)return;const el=document.createElement('div');el.id='rtProfileBackdrop';el.className='rt-profile-backdrop';const name=typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||'Profilim'):'Profilim',level=window.dmProgression?.level?.()||1;
const items=[['Profilim','user','profile'],['İlerlemem','chart','progress'],['Başarılarım','medal','badges'],['Dolabım','bag','closet'],['Öğretmen Paneli','teacher','teacher'],['Seviye Testi','exam','exam'],['Kelime Tekrarı','repeat','repeat'],['AI Koç','ai-coach','coach'],['Ayarlar','gear','settings'],['Yardım & Destek','help','help'],['Çıkış Yap','logout','logout']];el.innerHTML='<section class="rt-profile" role="dialog" aria-modal="true" aria-labelledby="rtProfileTitle"><header><img src="route-assets/papi-profile.png" alt=""><div><strong id="rtProfileTitle"></strong><small>Seviye '+level+'</small></div><button type="button" class="rt-close" aria-label="Profil menüsünü kapat">×</button></header><div class="rt-profile-grid">'+items.map(([label,art,action])=>'<button type="button" data-profile="'+action+'"><img src="route-assets/'+art+'.svg" alt=""><b>'+label+'</b>'+(action==='settings'?'<small>Öğrenme yolunu değiştir</small>':action==='repeat'?'<small>Yanlış kelimeler</small>':action==='exam'?'<small>Seviye belirleme</small>':'')+'</button>').join('')+'</div></section>';el.querySelector('strong').textContent=name;el.onclick=e=>{if(e.target===el||e.target.closest('.rt-close')){close();last.focus();return;}const b=e.target.closest('[data-profile]');if(!b)return;close();({profile:()=>window.kisiselBilgilerAc?.(),progress:()=>window.benimDunyamAc?.('istatistik'),badges:()=>window.benimDunyamAc?.('rozetler'),closet:()=>window.benimDunyamAc?.('karakter'),teacher:()=>{if(typeof window.ogretmenPaneliAc==='function')window.ogretmenPaneliAc();else window.yoToast?.('Öğretmen paneli yüklenemedi.');},exam:()=>{if(typeof window.seviyeTestAc==='function')window.seviyeTestAc();else window.benimDunyamAc?.('sanaozel');},repeat:()=>{if(typeof window.yoZkAc==='function')window.yoZkAc();else window.benimDunyamAc?.('sanaozel');},coach:()=>window.dmTeacherChatOpen(),settings:()=>window.dmHesapAyarlariAc?.(),help:()=>window.yardimAc?.(),logout:()=>{if(window.confirm('Çıkış yapmak istiyor musun?'))window.cikisYap?.();}})[b.dataset.profile]?.();};el.onkeydown=e=>{if(e.key==='Escape'){close();last.focus();}if(e.key==='Tab'){const buttons=[...el.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};document.body.append(el);nav.querySelectorAll('.bn-item').forEach(b=>b.classList.toggle('active',b===last));last.setAttribute('aria-expanded','true');el.querySelector('.rt-close').focus();};

window.dmTeacherChatOpen=function(){
  document.getElementById('dmTeacherChat')?.remove();
  const owner=typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
  if(!owner){window.yoToast?.('Sohbet için öğrenci hesabına giriş yap.');return;}
  const e=document.createElement('div');e.id='dmTeacherChat';e.className='dm-teacher-chat-overlay';
  e.innerHTML='<section class="dm-teacher-chat" role="dialog" aria-modal="true" aria-labelledby="dmChatTitle"><header><strong id="dmChatTitle">💬 AI Koç · Öğretmeninle Mesajlaş</strong><button type="button" data-chat-close aria-label="Kapat">×</button></header><div class="dm-chat-log" role="log" aria-live="polite"></div><form class="dm-chat-form"><textarea maxlength="1000" rows="2" placeholder="Öğretmenine mesaj yaz..." aria-label="Mesajın" required></textarea><button type="submit">Gönder</button></form><p class="dm-chat-status" role="status"></p></section>';
  const log=e.querySelector('.dm-chat-log'),form=e.querySelector('form'),send=form.querySelector('button'),input=form.querySelector('textarea'),status=e.querySelector('.dm-chat-status');
  const previous=document.activeElement;let alive=true;
  const close=()=>{alive=false;e.remove();previous?.focus?.();};
  e.addEventListener('click',ev=>{if(ev.target===e||ev.target.closest('[data-chat-close]'))close();});
  e.addEventListener('keydown',ev=>{if(ev.key==='Escape')close();});
  const api=async payload=>{
    if(typeof apiURL!=='string'||!apiURL)throw Error('Mesajlaşma bağlantısı hazır değil.');
    const response=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,ogrenci:owner,t:localStorage.getItem('ing_token')||''})});
    const data=await response.json();
    if(!response.ok||data?.hata||data?.status==='error')throw Error(data?.mesaj||data?.message||'Mesajlaşma servisine ulaşılamadı.');
    return data;
  };
  const load=async()=>{try{const result=await api({islem:'sohbetGetir'});if(!alive)return;const messages=Array.isArray(result)?result:Array.isArray(result.mesajlar)?result.mesajlar:[];log.replaceChildren();if(!messages.length){const empty=document.createElement('p');empty.textContent='Merhaba! Buradan öğretmenine doğrudan mesaj gönderebilirsin.';log.append(empty);}for(const m of messages){const item=document.createElement('div');item.className='dm-chat-bubble '+(m.gonderen==='ogretmen'?'teacher':'student');item.textContent=String(m.mesaj||'');log.append(item);}log.scrollTop=log.scrollHeight;status.textContent='';}catch(err){if(alive)status.textContent=err.message;}};
  form.addEventListener('submit',async ev=>{ev.preventDefault();const mesaj=input.value.trim();if(!mesaj)return;send.disabled=true;status.textContent='Mesaj gönderiliyor…';try{const result=await api({islem:'sohbetMesajGonder',mesaj});if(result.status!=='success')throw Error(result.status==='limit_doldu'?'Günlük mesaj sınırına ulaştın.':result.mesaj||'Mesaj gönderilemedi.');input.value='';await load();}catch(err){status.textContent=err.message;}finally{if(alive)send.disabled=false;}});
  document.body.append(e);input.focus();load();
};

function decorate(){const nav=document.getElementById('bottomNavMobile');if(!nav)return;
 // The previous release physically removed Parkur from the HTML; recreate its button.
 if(!nav.querySelector('[data-ekran="tab-dunya"]')){
  const sample=nav.querySelector('[data-ekran="tab-aktiviteler"]');
  if(sample){
   const b=sample.cloneNode(true);
   b.dataset.ekran='tab-dunya';b.classList.remove('active');b.removeAttribute('aria-current');
   b.removeAttribute('onclick');b.onclick=null;
   b.setAttribute('aria-label','Parkur');
   const label=b.querySelector('.bn-label');if(label)label.textContent='Parkur';
   const slot=b.querySelector('.bn-icon');if(slot)slot.innerHTML='<img src="route-assets/path.svg" alt="" decoding="async">';
   nav.insertBefore(b,nav.firstElementChild);
  }
 }
 nav.querySelectorAll('[data-bc="profil"]').forEach(b=>b.remove());for(const [id,label,icon] of layout){const b=nav.querySelector('[data-ekran="'+id+'"]');if(!b)continue;b.setAttribute('aria-label',label);const l=b.querySelector('.bn-label');if(l&&l.textContent!==label)l.textContent=label;const slot=b.querySelector('.bn-icon');const src='route-assets/'+(icon.endsWith('.png')?icon:icon+'.svg');if(slot&&!slot.querySelector('img'))slot.innerHTML='<img src="'+src+'" alt="" decoding="async">';if(id==='tab-dunyam'){b.removeAttribute('onclick');b.onclick=window.dmProfileMenuAc;b.setAttribute('aria-haspopup','dialog');if(!b.hasAttribute('aria-expanded'))b.setAttribute('aria-expanded','false');}if(b.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
// The new parkur is independent of the legacy story engines.
(function loadNewParkur(){
 const css=document.createElement('link');css.rel='stylesheet';css.href='new-parkur-v2.css?v=8';document.head.append(css);
 const js=document.createElement('script');js.src='new-parkur-v2.js?v=8';document.head.append(js);
})();
window.dmOpenGamesHome=function(){
 const btn=document.querySelector('#bottomNavMobile [data-ekran="tab-aktiviteler"]');if(btn){btn.click();return true;}return false;
};
document.addEventListener('click',e=>{
 const b=e.target.closest?.('#bottomNavMobile [data-ekran="tab-dunya"]');
 if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();window.dmNewParkurOpen?.();
},true);
document.addEventListener('click',e=>{
 const b=e.target.closest?.('#bottomNavMobile [data-ekran]:not([data-ekran="tab-dunya"])');
 if(b)window.dmNewParkurClose?.();
},true);
decorate();const nav=document.getElementById('bottomNavMobile');if(nav){new MutationObserver(decorate).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-ekran']});nav.addEventListener('click',e=>{const b=e.target.closest('[data-ekran]');if(b&&b.dataset.ekran!=='tab-dunyam')close();});}
document.addEventListener('dm:login',close);
// Keep installed PWA clients updated without requiring account logout.
if('serviceWorker' in navigator){
 let updating=false,lastCheck=0;
 const check=async()=>{if(document.hidden||updating||Date.now()-lastCheck<60000)return;updating=true;lastCheck=Date.now();try{const reg=await navigator.serviceWorker.getRegistration();await reg?.update();}catch(e){console.warn('PWA güncellemesi kontrol edilemedi',e);}finally{updating=false}};
 window.addEventListener('pageshow',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
 setTimeout(check,2500);
 let refreshed=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(refreshed||document.hidden)return;
  const busy=!!document.querySelector('.dmp-quiz,.dm-solo-fullstage.active,#bzParkur.active,.game-modal-content:not([hidden])');
  if(busy)return;refreshed=true;location.reload();
 });
}
})();
