/* Five icon-only student destinations (Ders Çalış only in the teacher panel, 11 Kas 2026) and the approved profile popover. */
(()=>{'use strict';
const layout=window.dmTeacherPortalMode?[['tab-aktiviteler','Oyunlar','game'],['tab-derscalis','Ders Çalış','book'],['tab-profile-menu','Profilim','profile'],['tab-teacher-portal','Öğretmen Paneli','teacher']]:[['tab-dunya','Parkur','path'],['tab-aktiviteler','Oyunlar','game'],['tab-duel-home','Düello','duel'],['tab-meduakis','Takımım','friends'],['tab-profile-menu','Profil','profile']];
// A profile dialog always has a real primary destination beneath it.
let primaryId=window.dmTeacherPortalMode?'tab-aktiviteler':'tab-dunya';
function rememberPrimary(){const id=layout.slice(0,-1).map(x=>x[0]).find(id=>document.getElementById(id)?.classList.contains('active'));if(id)primaryId=id;}
function restorePrimary(){
 rememberPrimary();
 if(document.querySelector('.dc-fullscreen-overlay.active'))return;
 const base=document.getElementById(primaryId)||document.getElementById('tab-dunya');
 if(base){base.classList.add('active');const nav=document.getElementById('bottomNavMobile');nav?.querySelectorAll('[data-ekran]').forEach(b=>b.classList.toggle('active',b.dataset.ekran===base.id));}
 else if(typeof window.dunyaAc==='function')window.dunyaAc();
}
function syncProfileDock(){
 const panel=document.getElementById('rtProfileBackdrop'),dock=document.getElementById('bottomNavMobile');
 if(!panel||!dock)return;
 const top=dock.getBoundingClientRect().top;
 if(top>0)panel.style.setProperty('--dm-profile-dock-space',Math.ceil(window.innerHeight-top+12)+'px');
}
function close(restore=true){const panel=document.getElementById('rtProfileBackdrop');if(!panel)return;if(restore)restorePrimary();panel.remove();document.getElementById('bottomNavMobile')?.querySelector('[data-ekran="tab-profile-menu"]')?.setAttribute('aria-expanded','false');window.dcBottomNavSenkronize?.();}
let profileReturnPane='main';
const centreItems=[['İlerlemem','Gelişimimi keşfet','progress',0],['Başarılarım','Rozetlerimi gör','badges',1],['Karnelerim','Notlarımı incele','certificates',2],['Ödevlerim','Görevlerimi tamamla','daily',3],['Kelime Tekrarı','Kelimeleri pekiştir','repeat',5],['Parkur Değiştir','Yeni maceralara geç','route',6],['Veli Kontrolü','Ayarlar ve raporlar','guardian',7],['Öğretmen Paneli','Sınıfıma geç','teacherPanel',5,'account-icons']];
// 11 Kas 2026 · Benim Merkezim (Claude Design Profil A): Seviye Testi yalnızca Parkur Değiştir'den; Veli Kontrolü'nün yanında Öğretmen Paneli.
const accountItems=[['Profilim','Kişisel bilgilerimi düzenle','profile',0],['Ayarlar','Uygulama tercihlerini yönet','settings',1],['Hesap Değiştir','Farklı bir hesapla devam et','switchAccount',2],['Yardım ve Destek','Sık sorulan sorular ve iletişim','help',3],['Güvenlik ve Bildirimlerim','Hesap güvenliği ve bildirim ayarları','safety',4],['Öğretmen Paneli','Öğretmen araçlarına erişim','teacher',5],['Öğretmene Mesaj Gönder','Sorularını ilet','coach',6],['Çıkış Yap','Güvenli bir şekilde çıkış yap','logout',7]];
const centreArt=(name,cell)=>'<i class="au-art au-'+name+'" style="--au-x:'+(cell%3*50)+'%;--au-y:'+Math.floor(cell/3)*50+'%" aria-hidden="true"></i>';
const centreIcons=['26 668 192 178','245 668 191 178','463 668 191 178','682 668 192 178','26 937 192 175','245 937 191 175','463 937 191 175','682 937 192 175','56 1273 135 117','500 1266 122 125','46 1469 96 77','16 174 162 121'];
const centreIcon=index=>{
 const [x,y,width,height]=centreIcons[index].split(' ');
 const clip='pa-icon-clip-'+index;
 return `<svg class="pa-reference-art" aria-hidden="true" viewBox="${centreIcons[index]}">
  <defs><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs>
  <g clip-path="url(#${clip})"><image href="friends-assets/centre-reference.webp" width="900" height="1748"/></g>
 </svg>`;
};
const parentSwitchIcon='<svg class="pa-reference-art pa-parent-art" viewBox="0 0 40 38" aria-hidden="true"><rect x="2" y="2" width="36" height="34" rx="10" fill="#dff7f0" stroke="#7ecbb8" stroke-width="1.5"/><circle cx="15.5" cy="13.5" r="4.4" fill="#136a60"/><path d="M8.5 27.5c0-4.2 3.1-6.8 7-6.8s7 2.6 7 6.8" fill="#136a60"/><circle cx="26.2" cy="17.2" r="3.2" fill="#209e89"/><path d="M21 27.5c.3-3 2.4-4.9 5.2-4.9s4.9 1.9 5.2 4.9" fill="#209e89"/><circle cx="31.5" cy="9.5" r="5.5" fill="#f59e0b" stroke="#fff" stroke-width="1.5"/><path d="M29.4 9.5h4.2m-1.5-1.7 1.7 1.7-1.7 1.7" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
window.dmProfileMenuAc=function(initial='main'){
 if(window.dmTeacherPortalMode)return window.dmTeacherPortal?.openProfile();
 if(document.getElementById('rtProfileBackdrop')){close();return;}
 rememberPrimary();restorePrimary();const nav=document.getElementById('bottomNavMobile'),last=nav?.querySelector('[data-ekran="tab-profile-menu"]');if(!last)return;
 const el=document.createElement('div');el.id='rtProfileBackdrop';el.className='rt-profile-backdrop au-centre-backdrop';let pane=initial==='account'?'account':'main';
 const name=typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||'Profilim'):'Profilim',level=window.dmProgression?.level?.()||1;
 const xp=Number(typeof yo!=='undefined'?yo?.totalXp:0)||0,progress=window.DijiProgressRules?.progress?.(xp),ratio=progress?.ratio||0;
 function paint(){
  const account=pane==='account',items=account?accountItems:centreItems;
  el.innerHTML='<section class="rt-profile au-centre '+(account?'au-account':'pa-reference')+'" role="dialog" aria-modal="true" aria-labelledby="rtProfileTitle"><button type="button" class="rt-close" aria-label="Profil menüsünü kapat">×</button>'+(account?'<button class="au-back" type="button" data-centre="back">‹ Benim Merkezim</button><header class="au-account-head">'+centreArt('center-icons',8)+'<h2 id="rtProfileTitle">Hesap ve Destek</h2><p>Tüm hesap işlemlerin ve destek seçeneklerin burada!</p></header>':'<div class="pa-body"><div class="pa-hero"><div class="pa-hero-copy"><span class="pa-wordmark">Diji-Medu</span><h2 id="rtProfileTitle" style="color:var(--pa-ink)!important;-webkit-text-fill-color:var(--pa-ink)!important">Benim Merkezim</h2></div><span class="pa-hero-papi dm-lp dm-lp-mini" aria-hidden="true">'+centreIcon(11)+'</span></div><div class="pa-user"><span class="pa-avatar"></span><div class="pa-user-copy"><div class="pa-name-row"><strong></strong><small class="pa-level">Seviye '+level+'</small></div><progress value="'+ratio+'" max="1" aria-label="Seviye ilerlemen"></progress><div class="pa-xp-row"><span class="au-xp">'+(progress?.next===null?'En yüksek seviye':Math.max(0,xp-(progress?.start||0)).toLocaleString('tr-TR')+' / '+Math.max(1,(progress?.next||40)-(progress?.start||0)).toLocaleString('tr-TR')+' XP')+'</span></div></div><button type="button" class="pa-edit" data-profile="profile" aria-label="Profilimi düzenle">✎</button></div>')+'<div class="'+(account?'rt-profile-grid au-centre-grid':'pa-grid')+'">'+items.map(([label,note,action,cell,sheet],index)=>'<button type="button" data-profile="'+action+'">'+(account?centreArt(sheet||'account-icons',cell):centreIcon(index))+'<span><b>'+label+'</b>'+(account?'<small>'+note+'</small>':'')+'</span><em aria-hidden="true">›</em></button>').join('')+ '</div>'+(!account?'<div class="dm-profile-shop-row"><button type="button" data-profile="shop">'+centreIcon(8)+'<span>Mağaza</span><i aria-hidden="true">›</i></button><button type="button" data-profile="parentSwitch">'+parentSwitchIcon+'<span>Veli Hesabına Geç</span><i aria-hidden="true">›</i></button></div>':'')+(account?'':'</div>')+(!account?'<button type="button" class="au-account-entry" data-centre="account">'+centreIcon(10)+'<span><b>Hesap ve Destek</b></span><em aria-hidden="true">›</em></button>':'')+'</section>';
  const themeButton=window.dmDayNightTheme?.createButton();
  if(themeButton)el.querySelector('.rt-profile').prepend(themeButton);
  if(!account){
   const toolbar=document.createElement('div');toolbar.className='pa-toolbar';
   if(themeButton)toolbar.append(themeButton);
   toolbar.append(el.querySelector('.rt-close'));
   el.querySelector('.pa-body').before(toolbar);
  }
  if(!account){el.querySelector('.pa-user strong').textContent=name;const avatar=el.querySelector('.pa-avatar');const art=window.karakterSvg?.(name,88);if(art)avatar.innerHTML=art;else avatar.innerHTML='<img src="route-assets/papi-profile.png" alt="">';}
  window.dmTeacherWorkspace?.paintBadge();el.querySelector(account?'.au-back':'.rt-close').focus();
 }
 el.onclick=e=>{if(e.target===el||e.target.closest('.rt-close')){close();last.focus();return;}const local=e.target.closest('[data-centre]');if(local){pane=local.dataset.centre==='account'?'account':'main';paint();return;}const b=e.target.closest('[data-profile]');if(!b)return;profileReturnPane=pane;close();window.dmProfileReturnPending=b.dataset.profile!=='logout';({shop:()=>window.magazaAc?.(),parentSwitch:()=>{if(typeof window.dmParentBridge?.open==='function')window.dmParentBridge.open();else location.assign('veli-paneli.html');},certificates:()=>window.dmGraduations?.openLibrary(),profile:()=>window.kisiselBilgilerAc?.(),daily:()=>window.sanaOzelTamEkranAc?.(),progress:()=>window.dmIlerlememAc?.(),badges:()=>window.dmBasarilarimAc?.(),teacher:()=>{if(!window.dmTeacherPortalMode&&name.toLowerCase()!=='teacher'){window.dmTeacherPortal?.openLogin();return;}if(typeof window.ogretmenPaneliAc==='function')window.ogretmenPaneliAc();else window.yoToast?.('Öğretmen paneli yüklenemedi.');},exam:()=>{if(typeof window.seviyeTestAc==='function')window.seviyeTestAc();else window.sanaOzelTamEkranAc?.();},repeat:()=>{if(typeof window.yoZkAc==='function')window.yoZkAc();else window.sanaOzelTamEkranAc?.();},coach:()=>window.dmTeacherChatOpen(),route:()=>window.dmMemberExperience?.chooseRoute(true),guardian:()=>window.dmSocialSafety?.parent(),safety:()=>window.dmSocialSafety?.help(),settings:()=>window.dmHesapAyarlariAc?.(),help:()=>window.yardimAc?.(),switchAccount:()=>window.dmHesapDegistirAc?.(),logout:()=>{if(window.confirm('Çıkış yapmak istiyor musun?'))window.cikisYap?.();},pro:()=>window.DMSatis?.planlar?.('profil'),teacherPanel:()=>{if(window.dmTeacherSwitch?.available?.())return window.dmTeacherSwitch.open();if(typeof window.ogretmenPaneliAc==='function'&&name.toLowerCase()==='teacher')return window.ogretmenPaneliAc();window.dmTeacherPortal?.openLogin?.();}})[b.dataset.profile]?.();};
 el.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();if(pane==='account'){pane='main';paint();}else{close();last.focus();}}if(e.key==='Tab'){const buttons=[...el.querySelectorAll('button')].filter(b=>b.getClientRects().length),i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};
 document.body.append(el);paint();nav.querySelectorAll('.bn-item').forEach(b=>b.classList.toggle('active',b===last));last.setAttribute('aria-expanded','true');syncProfileDock();
};



// Return to the profile menu after closing a profile sub-screen.
window.dmProfileDismiss=function(){if(window.dmViewHistory?.isDirect()||!window.dmProfileReturnPending)return;if(window.dmViewHistory?.hasReturn()||document.querySelector('.dm-member-overlay:not([data-dm-nav-suspended]),.rt-overlay:not([data-dm-nav-suspended]),.dc-fullscreen-overlay.active:not(#tab-dunya):not(#tab-aktiviteler):not(#tab-derscalis):not(#tab-meduakis):not(#tab-magaza)'))return;window.dmProfileReturnPending=false;window.dmProfileMenuGeriDon();};
window.dmProfileMenuGeriDon=function(){
  window.dmProfileReturnPending=false;
  window.dcTumTamEkranlariKapat?.();
  restorePrimary();
  document.getElementById('rtProfileBackdrop')?.remove();
  requestAnimationFrame(()=>{
    if(!document.getElementById('rtProfileBackdrop'))window.dmProfileMenuAc?.(profileReturnPane);
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
 if(window.dmTeacherPortalMode&&!nav.querySelector('[data-ekran="tab-teacher-portal"]')){const b=document.createElement('button');b.type='button';b.className='bn-item';b.dataset.ekran='tab-teacher-portal';b.innerHTML='<span class="bn-icon"><img class="tp-nav-image" src="route-assets/teacher.svg" alt=""></span><span class="bn-label">Öğretmen Paneli</span>';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.ogretmenPaneliAc?.();},true);nav.append(b);}
 if(!window.dmTeacherPortalMode&&!nav.querySelector('[data-ekran="tab-duel-home"]')){
  const button=document.createElement('button');
  button.type='button';button.className='bn-item';button.dataset.ekran='tab-duel-home';
  button.innerHTML='<span class="bn-icon"></span><span class="bn-label">Düello</span>';
  nav.append(button);
 }
 const expected=new Set(layout.map(x=>x[0]));
 nav.querySelectorAll('.bn-item[data-ekran]').forEach(b=>{if(!expected.has(b.dataset.ekran))b.remove();});
 const current=[...nav.querySelectorAll('.bn-item[data-ekran]')].map(b=>b.dataset.ekran);if(current.join('|')!==layout.map(x=>x[0]).filter(id=>current.includes(id)).join('|')){for(const [id] of layout){const b=nav.querySelector('[data-ekran="'+id+'"]');if(b)nav.append(b);}}

 nav.querySelectorAll('[data-bc="profil"]').forEach(b=>b.remove());for(const [id,label,icon] of layout){const b=nav.querySelector('[data-ekran="'+id+'"]');if(!b)continue;if(id!=='tab-profile-menu'||!b.dataset.membershipLabel)b.setAttribute('aria-label',label);const l=b.querySelector('.bn-label');if(l&&l.textContent!==label)l.textContent=label;const slot=b.querySelector('.bn-icon');const cell=layout.findIndex(x=>x[0]===id);if(slot&&!slot.querySelector('.dm-nav-art,.tp-nav-image'))slot.innerHTML='<span class="dm-nav-art" aria-hidden="true" style="background-position:'+(cell%3*50)+'% '+(cell<3?0:100)+'%"></span>';b.title=b.dataset.membershipLabel||label;if(id==='tab-duel-home'){b.removeAttribute('onclick');b.onclick=window.dmDuelHomeAc;}if(id==='tab-profile-menu'){b.removeAttribute('onclick');b.onclick=window.dmProfileMenuAc;b.setAttribute('aria-haspopup','dialog');if(!b.hasAttribute('aria-expanded'))b.setAttribute('aria-expanded','false');}if(b.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
const duelArtIcon = name => `<svg class="dm-duel-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="friends-assets/icons.svg#${name}"></use></svg>`;
const duelChevron = duelArtIcon('chevron').replace('dm-duel-icon','dm-duel-chevron');
const duelShield = '<svg class="dm-duel-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e74475" d="M12 1 2 5v6c0 6 4 10 10 12 6-2 10-6 10-12V5z"/><path fill="#ffb2c9" d="M12 4 5 7v4c0 4 2.6 7 7 9 4.4-2 7-5 7-9V7z"/></svg>';
const duelXp = '<svg class="dm-duel-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#742ee4" d="m12 1 10 5.5v11L12 23 2 17.5v-11z"/><path d="m6 9 4 6m0-6-4 6m7 0V9h3a1.5 1.5 0 0 1 0 3h-3" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
window.dmDuelHomeAc=function(){
 if(window.dmTeacherPortalMode)return;
 let el=document.getElementById('dmDuelHome');
 if(!el){
  el=document.createElement('section');el.id='dmDuelHome';el.className='dm-duel-page';el.setAttribute('aria-label','Düello arenası');
  el.innerHTML=`<div class="dm-duel-page-inner">
   <header class="dm-duel-page-head"><div class="dm-duel-brand">Diji-Medu <small>English</small></div><h1>Düello</h1><span data-duel-inbox></span></header>
   <div class="dm-duel-arena">
    <div class="dm-duel-hero-stage">
     <div class="dm-duel-hero-copy">
      <span class="dm-duel-live-pill"><span class="dm-duel-live-dot" aria-hidden="true"></span>Anlık Eşleşme</span>
      <h2>Rakibini Bul,<br>XP Kazan!</h2>
     </div>
    </div>
    <button type="button" class="dm-duel-quick" data-duel="live">${duelArtIcon('bolt')} Canlı Düello</button>
   </div>
   <div class="dm-duel-options">
    <button type="button" data-duel="friend"><span class="dm-duel-option-icon" aria-hidden="true">${duelArtIcon('people')}</span><span>Arkadaşına<br>Meydan Oku</span></button>
    <button type="button" data-duel="papi"><span class="dm-duel-option-icon dm-duel-face" aria-hidden="true"></span><span>Papi’ye<br>Karşı Oyna</span></button>
   </div>
   <div class="dm-duel-stats-card">
    <div class="dm-duel-stats-head">
     <span class="dm-duel-stats-title">Senin İstatistiklerin</span>
     <button type="button" class="dm-duel-history" data-duel="history">Geçmiş Düellolar ${duelChevron}</button>
    </div>
    <div class="dm-duel-personal" role="status">Düello istatistikleri yükleniyor…</div>
   </div>
  </div>`;
  el.addEventListener('click',e=>{
   const action=e.target.closest('[data-duel]')?.dataset.duel;
   if(action==='live')window.dmLiveDuel?.startLive?.();
   if(action==='papi')window.dmLiveDuel?.startPapi?.();
   if(action==='friend')window.dmFriends?.chooseDuelFriend?.(e.target.closest('button'));
   if(action==='history')window.dmNotificationCenter?.openDuelHistory?.(e.target.closest('button'));
  });
  document.body.append(el);
 }
 el.hidden=false;
 window.dmNotificationCenter?.mountSecondary?.(el.querySelector('[data-duel-inbox]'));
 const dock=document.getElementById('bottomNavMobile');if(dock){if(!dock.dataset.duelPreviousZ)dock.dataset.duelPreviousZ=dock.style.zIndex||'auto';dock.style.setProperty('z-index','100000020','important');el.style.setProperty('--dm-duel-bottom',Math.max(68,window.innerHeight-dock.getBoundingClientRect().top)+'px');}
 document.querySelectorAll('#bottomNavMobile .bn-item').forEach(b=>{const yes=b.dataset.ekran==='tab-duel-home';b.classList.toggle('active',yes);if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 const owner=typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
 const target=el.querySelector('.dm-duel-personal');
 if(target.dataset.owner!==owner){target.dataset.owner=owner;target.textContent='Düello istatistikleri yükleniyor…';}
 const request=window.supabaseClient?.rpc?.('dm_duel_champions_v1',{p_limit:50});
 const current=()=>el.isConnected&&!el.hidden&&target.dataset.owner===owner&&String(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi||'')===owner;
 const fail=()=>{if(current()){target.textContent='İstatistikler şu anda yüklenemedi.';}};
 if(!request){fail();return;}
 request.then(({data,error})=>{
  if(error){fail();return;}
  if(!current())return;
  const rows=Array.isArray(data)?data:[];
  const normOwner=owner.trim().toLocaleLowerCase('tr');
  const myIndex=rows.findIndex(p=>String(p.player_name||'').trim().toLocaleLowerCase('tr')===normOwner);
  const me=myIndex>=0?rows[myIndex]:null;
  if(!me){
   target.textContent='Düello istatistiklerin burada görünecek.';
  }else{
   target.innerHTML=[[duelArtIcon('trophy'),'Galibiyet',me.wins],[duelShield,'Mağlubiyet',me.losses],[duelXp,'Düello XP',me.duel_xp]].map(([icon,label,value])=>'<span>'+icon+'<b>'+Number(value||0).toLocaleString('tr-TR')+'</b><small>'+label+'</small></span>').join('');
  }
 }).catch(fail);

};
window.dmDuelHomeClose=function(){window.dmNotificationCenter?.closeSecondary?.();const el=document.getElementById('dmDuelHome');if(el&&!el.hidden){el.hidden=true;document.dispatchEvent(new Event('dm:duel-home-close'));}const dock=document.getElementById('bottomNavMobile');if(dock&&dock.dataset.duelPreviousZ){const z=dock.dataset.duelPreviousZ;dock.style.zIndex=z==='auto'?'':z;delete dock.dataset.duelPreviousZ;}};
document.addEventListener('click',e=>{const tab=e.target.closest('#bottomNavMobile [data-ekran]');if(tab&&tab.dataset.ekran!=='tab-duel-home')window.dmDuelHomeClose();},true);
window.dmOpenGamesHome=function(){
 const btn=document.querySelector('#bottomNavMobile [data-ekran="tab-aktiviteler"]');if(btn){btn.click();return true;}return false;
};

document.addEventListener('click',e=>{const b=e.target.closest('#bottomNavMobile [data-ekran]');if(!b||b.disabled||b.classList.contains('active')||b.getAttribute('aria-disabled')==='true')return;try{navigator.vibrate?.(20);}catch{}},true);
decorate();const nav=document.getElementById('bottomNavMobile');if(nav){if(window.ResizeObserver)new ResizeObserver(syncProfileDock).observe(nav);window.addEventListener('resize',syncProfileDock);new MutationObserver(decorate).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-ekran']});nav.addEventListener('click',e=>{const b=e.target.closest('[data-ekran]');if(b&&b.dataset.ekran!=='tab-profile-menu'){window.dmProfileReturnPending=false;close();}});}
document.addEventListener('dm:logout',()=>window.dmDuelHomeClose());
document.addEventListener('dm:login',()=>{window.dmDuelHomeClose();window.dmProfileReturnPending=false;primaryId=window.dmTeacherPortalMode?'tab-aktiviteler':'tab-dunya';close(false);});
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
