/* Six icon-only destinations and the approved profile popover. */
(()=>{'use strict';
const layout=[['tab-dunya','Parkur','path'],['tab-meduakis','Arkadaşlar','friends'],['tab-aktiviteler','Oyunlar','game'],['tab-derscalis','Ders Çalış','book'],['tab-magaza','Mağaza','shop'],['tab-profile-menu','Profil','profile']];
// A profile dialog always has a real primary destination beneath it.
let primaryId='tab-dunya';
function rememberPrimary(){const id=layout.slice(0,-1).map(x=>x[0]).find(id=>document.getElementById(id)?.classList.contains('active'));if(id)primaryId=id;}
function restorePrimary(){
 rememberPrimary();
 if(document.querySelector('.dc-fullscreen-overlay.active'))return;
 const base=document.getElementById(primaryId)||document.getElementById('tab-dunya');
 if(base){base.classList.add('active');const nav=document.getElementById('bottomNavMobile');nav?.querySelectorAll('[data-ekran]').forEach(b=>b.classList.toggle('active',b.dataset.ekran===base.id));}
 else if(typeof window.dunyaAc==='function')window.dunyaAc();
}
function close(restore=true){const panel=document.getElementById('rtProfileBackdrop');if(!panel)return;if(restore)restorePrimary();panel.remove();document.getElementById('bottomNavMobile')?.querySelector('[data-ekran="tab-profile-menu"]')?.setAttribute('aria-expanded','false');window.dcBottomNavSenkronize?.();}
window.dmProfileMenuAc=function(){if(document.getElementById('rtProfileBackdrop')){close();return;}rememberPrimary();restorePrimary();const nav=document.getElementById('bottomNavMobile'),last=nav?.querySelector('[data-ekran="tab-profile-menu"]');if(!last)return;const el=document.createElement('div');el.id='rtProfileBackdrop';el.className='rt-profile-backdrop';const name=typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||'Profilim'):'Profilim',level=window.dmProgression?.level?.()||1;
const route=typeof yo!=='undefined'&&['school','independent'].includes(yo?.dmLearningPurpose)?(window.dmLearningRoute?.purpose?.()||yo.dmLearningPurpose):null;const routeLabel=route==='school'?'Macera Haritası':route==='independent'?'Öğrenme Yolu':'Parkurunu seç';
const items=[['Profilim','user','profile'],['İlerlemem','chart','progress'],['Başarılarım','medal','badges'],['Karnelerim','book','certificates'],['Ödevlerim','homework-icon','daily'],['Öğretmen Paneli','teacher','teacher'],['Seviye Testi','placement-icon','exam'],['Kelime Tekrarı','repeat','repeat'],['Öğretmene Mesaj Gönder','ai-coach','coach'],['Parkur Değiştir','path','route'],['Veli Kontrolü','family-icon','guardian'],['Güvenlik ve Bildirimlerim','safety-icon','safety'],['Ayarlar','gear','settings'],['Yardım & Destek','support-icon','help'],['Hesap Değiştir','repeat','switchAccount'],['Çıkış Yap','logout','logout']];el.innerHTML='<section class="rt-profile" role="dialog" aria-modal="true" aria-labelledby="rtProfileTitle"><header><img src="route-assets/papi-profile.png" alt=""><div><strong id="rtProfileTitle"></strong><small>Seviye '+level+'</small></div><button type="button" class="rt-close" aria-label="Profil menüsünü kapat">×</button></header><div class="rt-profile-grid">'+items.map(([label,art,action])=>'<button type="button" data-profile="'+action+'"><img src="route-assets/'+art+'.svg" alt=""><b>'+label+'</b>'+(action==='route'?'<small class="dm-profile-current-route">'+(route?'Şu an: '+routeLabel:routeLabel)+'</small>':action==='repeat'?'<small>Yanlış kelimeler</small>':action==='exam'?'<small>Seviye belirleme</small>':'')+'</button>').join('')+'</div></section>';if(!document.getElementById('dm-profile-compact-fit')){const st=document.createElement('style');st.id='dm-profile-compact-fit';st.textContent='@media(max-height:620px){#rtProfileBackdrop .rt-profile{max-height:calc(100dvh - 12px)!important;overflow-y:auto!important}#rtProfileBackdrop .rt-profile-grid{gap:5px!important}#rtProfileBackdrop .rt-profile-grid button{min-height:44px!important;padding:4px!important}}';document.head.append(st);}el.querySelector('strong').textContent=name;const art=window.karakterSvg?.(name,72);if(art){const avatar=document.createElement('span');avatar.className='dm-menu-avatar';avatar.innerHTML=art;el.querySelector('header>img').replaceWith(avatar);}el.querySelector('header small').classList.add('dm-menu-level');el.onclick=e=>{if(e.target===el||e.target.closest('.rt-close')){close();last.focus();return;}const b=e.target.closest('[data-profile]');if(!b)return;close();window.dmProfileReturnPending=b.dataset.profile!=='logout';({certificates:()=>window.dmGraduations?.openLibrary(),profile:()=>window.kisiselBilgilerAc?.(),daily:()=>window.sanaOzelTamEkranAc?.(),progress:()=>window.dmIlerlememAc?.(),badges:()=>window.dmBasarilarimAc?.(),teacher:()=>{if(typeof window.ogretmenPaneliAc==='function')window.ogretmenPaneliAc();else window.yoToast?.('Öğretmen paneli yüklenemedi.');},exam:()=>{if(typeof window.seviyeTestAc==='function')window.seviyeTestAc();else window.sanaOzelTamEkranAc?.();},repeat:()=>{if(typeof window.yoZkAc==='function')window.yoZkAc();else window.sanaOzelTamEkranAc?.();},coach:()=>window.dmTeacherChatOpen(),route:()=>window.dmMemberExperience?.chooseRoute(true),guardian:()=>window.dmSocialSafety?.parent(),safety:()=>window.dmSocialSafety?.help(),settings:()=>window.dmHesapAyarlariAc?.(),help:()=>window.yardimAc?.(),switchAccount:()=>window.dmHesapDegistirAc?.(),logout:()=>{if(window.confirm('Çıkış yapmak istiyor musun?'))window.cikisYap?.();}})[b.dataset.profile]?.();};el.onkeydown=e=>{if(e.key==='Escape'){close();last.focus();}if(e.key==='Tab'){const buttons=[...el.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};document.body.append(el);window.dmTeacherWorkspace?.paintBadge();nav.querySelectorAll('.bn-item').forEach(b=>b.classList.toggle('active',b===last));last.setAttribute('aria-expanded','true');el.querySelector('.rt-close').focus();};

// Return to the profile menu after closing a profile sub-screen.
window.dmProfileDismiss=function(){if(window.dmViewHistory?.isDirect()||!window.dmProfileReturnPending)return;if(window.dmViewHistory?.hasReturn()||document.querySelector('.dm-member-overlay:not([data-dm-nav-suspended]),.rt-overlay:not([data-dm-nav-suspended]),.dc-fullscreen-overlay.active:not(#tab-dunya):not(#tab-aktiviteler):not(#tab-derscalis):not(#tab-meduakis):not(#tab-magaza)'))return;window.dmProfileReturnPending=false;window.dmProfileMenuGeriDon();};
window.dmProfileMenuGeriDon=function(){
  window.dmProfileReturnPending=false;
  window.dcTumTamEkranlariKapat?.();
  restorePrimary();
  document.getElementById('rtProfileBackdrop')?.remove();
  requestAnimationFrame(()=>{
    if(!document.getElementById('rtProfileBackdrop'))window.dmProfileMenuAc?.();
  });
};

window.dmTeacherChatOpen=function(){
  document.getElementById('dmTeacherChat')?.remove();
  const owner=typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
  if(!owner){window.yoToast?.('Sohbet için öğrenci hesabına giriş yap.');return;}
  const e=document.createElement('div');e.id='dmTeacherChat';e.className='dm-teacher-chat-overlay';
  e.innerHTML='<section class="dm-teacher-chat" role="dialog" aria-modal="false" aria-labelledby="dmChatTitle"><header><strong id="dmChatTitle">💬 Öğretmene Mesaj Gönder</strong><button type="button" data-chat-close aria-label="Kapat">×</button></header><div class="dm-chat-log" role="log" aria-live="polite"></div><form class="dm-chat-form"><textarea maxlength="1000" rows="1" placeholder="Öğretmenine mesaj yaz..." aria-label="Mesajın" required></textarea><button type="submit">Gönder</button></form><p class="dm-chat-status" role="status"></p></section>';
  const log=e.querySelector('.dm-chat-log'),form=e.querySelector('form'),send=form.querySelector('button'),input=form.querySelector('textarea'),status=e.querySelector('.dm-chat-status');
  const previous=document.activeElement;let alive=true;
  const close=()=>{alive=false;e.remove();window.dmProfileDismiss?.();previous?.focus?.();};
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
 // Older saved pages still include tab-profil instead of the new profile-menu destination.
 let profile=nav.querySelector('[data-ekran="tab-profile-menu"]');
 if(!profile){profile=nav.querySelector('[data-ekran="tab-profil"]');if(profile)profile.dataset.ekran='tab-profile-menu';}
 if(!profile){profile=document.createElement('button');profile.type='button';profile.className='bn-item';profile.dataset.ekran='tab-profile-menu';profile.innerHTML='<span class="bn-icon"></span><span class="bn-label">Profil</span>';nav.append(profile);}
 const expected=new Set(layout.map(x=>x[0]));
 nav.querySelectorAll('.bn-item[data-ekran]').forEach(b=>{if(!expected.has(b.dataset.ekran))b.remove();});
 const current=[...nav.querySelectorAll('.bn-item[data-ekran]')].map(b=>b.dataset.ekran);if(current.join('|')!==layout.map(x=>x[0]).filter(id=>current.includes(id)).join('|')){for(const [id] of layout){const b=nav.querySelector('[data-ekran="'+id+'"]');if(b)nav.append(b);}}

 nav.querySelectorAll('[data-bc="profil"]').forEach(b=>b.remove());for(const [id,label,icon] of layout){const b=nav.querySelector('[data-ekran="'+id+'"]');if(!b)continue;b.setAttribute('aria-label',label);const l=b.querySelector('.bn-label');if(l&&l.textContent!==label)l.textContent=label;const slot=b.querySelector('.bn-icon');const cell=layout.findIndex(x=>x[0]===id);if(slot&&!slot.querySelector('.dm-nav-art'))slot.innerHTML='<span class="dm-nav-art" aria-hidden="true" style="background-position:'+(cell%3*50)+'% '+(cell<3?0:100)+'%"></span>';b.title=label;if(id==='tab-profile-menu'){b.removeAttribute('onclick');b.onclick=window.dmProfileMenuAc;b.setAttribute('aria-haspopup','dialog');if(!b.hasAttribute('aria-expanded'))b.setAttribute('aria-expanded','false');}if(b.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
window.dmOpenGamesHome=function(){
 const btn=document.querySelector('#bottomNavMobile [data-ekran="tab-aktiviteler"]');if(btn){btn.click();return true;}return false;
};

document.addEventListener('click',e=>{const b=e.target.closest('#bottomNavMobile [data-ekran]');if(!b||b.disabled||b.classList.contains('active')||b.getAttribute('aria-disabled')==='true')return;try{navigator.vibrate?.(20);}catch{}},true);
decorate();const nav=document.getElementById('bottomNavMobile');if(nav){new MutationObserver(decorate).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-ekran']});nav.addEventListener('click',e=>{const b=e.target.closest('[data-ekran]');if(b&&b.dataset.ekran!=='tab-profile-menu'){window.dmProfileReturnPending=false;close();}});}
document.addEventListener('dm:login',()=>{window.dmProfileReturnPending=false;primaryId='tab-dunya';close(false);});
document.addEventListener('click',e=>{
 if(!window.dmProfileReturnPending||e.target.closest('#rtProfileBackdrop,.dm-teacher-child,#dmWordReview,#dmPlacementExam'))return;
 const button=e.target.closest('button');if(!button||!button.matches('.kb-x,.cog-x,.dm-account-close,.dm-switch-close,#dmSwitchClose,.game-close-btn,.dc-exit-btn,.dm-profile-back,.yo-kapat,[aria-label*="kapat" i],[aria-label="Kapat"]'))return;
 setTimeout(()=>window.dmProfileDismiss?.(),0);
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.dmProfileReturnPending&&!document.querySelector('#rtProfileBackdrop,.dm-member-overlay,.dm-teacher-child'))setTimeout(()=>window.dmProfileDismiss?.(),0);});
// Keep installed PWA clients updated without requiring account logout.
if('serviceWorker' in navigator){
 let updating=false,lastCheck=0;
 const check=async()=>{if(document.hidden||updating||Date.now()-lastCheck<60000)return;updating=true;lastCheck=Date.now();try{const reg=await navigator.serviceWorker.getRegistration();await reg?.update();}catch(e){console.warn('PWA güncellemesi kontrol edilemedi',e);}finally{updating=false}};
 window.addEventListener('pageshow',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
 setTimeout(check,2500);
 // The active worker serves future requests; don't restart the full app automatically.
 // Users can apply the new page version with their next normal refresh.
}
})();
