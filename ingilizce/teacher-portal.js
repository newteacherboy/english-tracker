(()=>{'use strict';
 const endpoint='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',mode=!!window.dmTeacherPortalMode;
 const state=()=>{try{return JSON.parse(sessionStorage.getItem('dm_tp_session')||'null');}catch{return null;}};
 // Direct calls keep owner, participant and personal tokens explicit.
 const nativeFetch=window.fetch.bind(window);
 async function api(islem,data={},token){const response=await nativeFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem,...data,t:token??(mode?state()?.teacherToken:sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'')})});const d=await response.json();if(!response.ok||d.ok===false||d.status==='error')throw Error(d.mesaj||d.message||'İşlem tamamlanamadı.');return d;}
 function sheet(title,html){document.querySelector('.tp-shade')?.remove();const shade=document.createElement('div');shade.className='tp-shade';shade.innerHTML='<section class="tp-card" role="dialog" aria-modal="true" tabindex="-1"><button class="tp-close" aria-label="Kapat">×</button><h1></h1><form>'+html+'<p class="tp-error" role="status" aria-live="polite"></p></form></section>';shade.querySelector('h1').textContent=title;const before=document.activeElement;const close=()=>{shade.remove();before?.focus?.();};shade.querySelector('.tp-close').onclick=close;shade.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const items=[...shade.querySelectorAll('input,select,button,a[href]')].filter(x=>!x.disabled),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});document.body.append(shade);shade.querySelector('input,select,button').focus();return {shade,close,form:shade.querySelector('form'),error:m=>shade.querySelector('.tp-error').textContent=m};}
 const codeField=(name,label)=>'<label>'+label+'<input name="'+name+'" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="off" required></label>';
 function submit(v,fn){v.form.onsubmit=async e=>{e.preventDefault();if(!v.form.reportValidity())return;const buttons=[...v.form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);v.error('');try{await fn(new FormData(v.form));}catch(e){v.error(e.message);}finally{buttons.forEach(b=>b.disabled=false);}};}
 function openLogin(){const v=sheet('Öğretmen Girişi','<p>Özel öğretmen platformuna erişmek için e-postana gönderilen 6 haneli kodu yaz.</p>'+codeField('code','Öğretmen giriş kodun')+'<button class="tp-primary">Giriş Yap</button><button type="button" data-reset>Kodumu Unuttum</button><small>E-posta doğrulaması ve teacher hesabının erişim onayı gerekir.</small>');v.shade.querySelector('[data-reset]').onclick=resetRequest;submit(v,async f=>{const r=await api('teacherPortalLogin',{code:f.get('code')},'');const preview=await api('teacherPortalParticipant',{preview:true},r.token);sessionStorage.setItem('dm_tp_session',JSON.stringify({teacherToken:r.token,name:r.name,participant:preview}));location.assign('./?ogretmen=1');});}
 function resetRequest(){const v=sheet('Öğretmen Kodumu Unuttum','<label>Kişisel kullanıcı adın<input name="username" required maxlength="40" autocomplete="username"></label><label>Kayıtlı e-posta adresin<input name="email" required type="email" autocomplete="email"></label><button class="tp-primary">Yenileme bağlantısı gönder</button>');submit(v,async f=>{const r=await api('teacherPortalResetRequest',Object.fromEntries(f),'');v.error(r.mesaj);});}
 async function resetPage(){const token=new URLSearchParams(location.hash.slice(1)).get('token');history.replaceState(null,'',location.pathname);const v=sheet('Yeni Öğretmen Giriş Kodu',codeField('code','Yeni 6 haneli kod')+codeField('confirm','Yeni kodu tekrar yaz')+'<button class="tp-primary">Kodumu Yenile</button>');v.shade.querySelector('.tp-close').onclick=()=>location.assign('./?ogretmenGiris=1');submit(v,async f=>{if(f.get('code')!==f.get('confirm'))throw Error('Kodlar eşleşmiyor.');const r=await api('teacherPortalReset',{resetToken:token,code:f.get('code')},'');v.form.replaceChildren();const message=document.createElement('p');message.textContent=r.mesaj;const link=document.createElement('a');link.href='./?ogretmenGiris=1';link.textContent='Öğretmen girişine dön';v.form.append(message,link);});}
 async function management(){const v=sheet('Öğretmen Erişim Onayları','<p>Başvurular yükleniyor…</p>');try{const r=await api('teacherPortalList');v.form.replaceChildren();if(!r.items.length)v.form.textContent='Henüz başvuru yok.';for(const row of r.items){const s=row.students||{},box=document.createElement('article');box.className='tp-grant';const h=document.createElement('h2');h.textContent=s.full_name||s.username;const p=document.createElement('p');p.textContent=s.username+' · '+s.email+'\nE-posta: '+(s.email_verified_at?'Doğrulandı':'Bekliyor')+' · Erişim: '+({pending:'Bekliyor',approved:'Onaylı',rejected:'Reddedildi',revoked:'Kaldırıldı'}[row.state]||row.state);box.append(h,p);
 if(row.state==='approved'){
  const status=document.createElement('p');
  status.textContent=row.code_sent_at?'🔒 Özel giriş kodu e-postaya gönderim kuyruğuna alındı. Güvenlik için eski kod görüntülenmez.':'✉️ Kod henüz gönderilmedi; öğretmen e-postasını doğrulamalı.';
  box.append(status);
  const issue=document.createElement('button');issue.type='button';issue.textContent=row.code_sent_at?'Yeni kod oluştur ve e-postala':'Kodu oluştur ve e-postala';
  issue.disabled=!s.email_verified_at;
  issue.onclick=async()=>{if(row.code_sent_at&&!confirm('Yeni kod, eski kodu ve açık öğretmen oturumlarını geçersiz kılar. Devam edilsin mi?'))return;
   issue.disabled=true;try{const result=await api('teacherPortalIssueCode',{id:row.id});const note=document.createElement('p');note.textContent='Yeni özel giriş kodu: '+result.issuedCode+' · Öğretmenin e-postasına gönderim kuyruğuna alındı. Bu kod yalnızca şimdi gösterilir.';box.append(note);issue.remove();}catch(e){v.error(e.message);issue.disabled=false;}};
  box.append(issue);
 }
 for(const [decision,label]of [['approved','Onayla'],['rejected','Reddet'],['revoked','Erişimi Kaldır']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=row.state===decision;button.onclick=async()=>{button.disabled=true;try{const result=await api('teacherPortalDecide',{id:row.id,decision});if(result.issuedCode){v.error('Özel giriş kodu: '+result.issuedCode+' · E-posta kuyruğuna alındı. Bu kod yalnızca şimdi gösterilir.');button.textContent='Onaylandı';button.disabled=true;}else management();}catch(e){v.error(e.message);button.disabled=false;}};box.append(button);}v.form.append(box);}}catch(e){v.error(e.message);}}
 function openProfile(){const v=sheet('Öğretmen Profilim','<p>Öğretmen alanında enerji harcanmaz ve ödül kazanılmaz. Yalnızca sıralama kaydedilir.</p><p>✅ Kişisel öğretmen hesabının e-posta adresi doğrulanmış. Bu doğrulama, özel kodla giriş için zaten zorunludur.</p><p data-name></p><button type="button" data-appearance>🎨 Kişisel Karakterimi Düzenle</button><button type="button" data-change class="tp-primary">Giriş Kodumu Değiştir</button><button type="button" data-personal>Kişisel Hesabıma Dön</button><button type="button" data-exit>Öğretmen Alanından Çık</button>');v.shade.querySelector('[data-name]').textContent=state()?.name||'';v.shade.querySelector('[data-appearance]').onclick=()=>{v.close();window.dmCharacterBuilder?.open?.();};v.shade.querySelector('[data-personal]').onclick=window.dmTeacherPortalExit;v.shade.querySelector('[data-exit]').onclick=async()=>{const s=state();try{await api('cikis',{},s?.teacherToken);await api('cikis',{},s?.participant?.token);}catch{}window.dmTeacherPortalExit();};v.shade.querySelector('[data-change]').onclick=()=>{const c=sheet('Giriş Kodumu Değiştir',codeField('currentCode','Mevcut giriş kodun')+codeField('code','Yeni 6 haneli kod')+codeField('confirm','Yeni kodu tekrar yaz')+'<button class="tp-primary">Kodu Değiştir</button>');submit(c,async f=>{if(f.get('code')!==f.get('confirm'))throw Error('Kodlar eşleşmiyor.');await api('teacherPortalChangeCode',Object.fromEntries(f));window.dmTeacherPortalExit();});};}
 let choosing=null,replay=false;
 function chooseParticipant(){if(choosing)return choosing;choosing=new Promise(resolve=>{const v=sheet('Bu oyunu kim oynayacak?','<p>Yalnızca oyun puanı ve sıralama kaydedilir. Enerji harcanmaz; XP ve altın kazanılmaz.</p><label>Bağlı öğrencin<select name="studentId"><option value="">Öğrenci seç</option></select></label><p>veya üye olmayan öğrenci için:</p><label>Sıralamada görünecek ad<input name="guestName" minlength="2" maxlength="32" autocomplete="off"></label><button class="tp-primary">Bu öğrenciyle devam et</button>');const finish=value=>{v.close();choosing=null;resolve(value);};v.shade.querySelector('.tp-close').onclick=()=>finish(null);v.shade.addEventListener('keydown',e=>{if(e.key==='Escape')finish(null);});api('teacherPortalStudents').then(r=>{for(const s of r.items){const o=document.createElement('option');o.value=s.id;o.textContent=(s.full_name?s.full_name+' · ':'')+s.username+(s.class_no?' · '+s.class_no+'. sınıf':'');v.form.elements.studentId.append(o);}}).catch(e=>v.error(e.message));submit(v,async f=>{const studentId=f.get('studentId'),guestName=String(f.get('guestName')||'').trim();if(!!studentId===!!guestName)throw Error('Bir öğrenci seç veya yalnızca misafir adını yaz.');const r=await api('teacherPortalParticipant',{studentId,guestName});finish(r);});});return choosing;}
 async function beforeGame(target,args=[]){if(!mode||replay)return true;const participant=await chooseParticipant();if(!participant)return false;const s=state();if(s.participant.name===participant.name){return true;}s.participant=participant;sessionStorage.setItem('dm_tp_session',JSON.stringify(s));localStorage.setItem('ing_token',participant.token);localStorage.setItem('ing_aktifOgrenci',participant.name);try{window.aktifOgrenciAdi=participant.name;}catch{};try{document.dispatchEvent(new Event('dm:login'));}catch{};return true;}
 const paths={'mola':['dmMola','open'],'topic':['dmTopicGames','openTopic'],'meteor':['dmMeteor','open'],'wheel':['dmWordWheel','open'],'cards':['dmPapiCards','open']};
 async function runPending(){const raw=sessionStorage.getItem('dm_tp_pending');if(!raw)return;sessionStorage.removeItem('dm_tp_pending');try{const next=JSON.parse(raw),path=paths[next.target];await window.dmLazyGames?.ready();wrapGames();replay=true;const object=path?window[path[0]]:window,fn=path?object?.[path[1]]:object[next.target];if(typeof fn!=='function')throw Error('Oyun henüz yüklenemedi. Yeniden aç.');await fn.apply(object,next.args||[]);}catch(e){window.yoToast?.(e.message);}finally{replay=false;}}
 const gameFunctions=['kelimeYarismasiAc','jpOyunAc','boslukOyunAc','hafizaOyunAc','yagmurOyunAc','asmacaOyunAc','kelimebulOyunAc','esOyunAc','trenOyunAc','dikteAc','cumleAc','harfBahcesiAc','ralliOyunAc','dmArenaAc','dmMatchAc','dmInviteAc'];
 function wrapGames(){if(!mode)return;for(const name of gameFunctions){const old=window[name];if(typeof old!=='function'||old.__tp)return;const fn=async function(...args){if(await beforeGame(name,args))return old.apply(this,args);};Object.assign(fn,old);fn.__tp=true;window[name]=fn;}}
 async function statusButton(){if(mode)return;const menu=document.getElementById('rtProfileBackdrop');if(!menu||menu.querySelector('[data-tp-access]'))return;const grid=menu.querySelector('.rt-profile-grid');if(!grid)return;const name=typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi);if(name==='teacher')return;const b=menu.querySelector('[data-profile=teacher]');if(!b)return;b.dataset.tpAccess='1';b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const v=sheet('Öğretmen Platformuna Erişim','<p>Durum yükleniyor…</p>');try{const r=await api('teacherPortalStatus',{},localStorage.getItem('ing_token')||'');v.form.textContent=({none:'Özel öğretmen platformu için başvuru yapabilirsin.',pending:'Başvurun teacher hesabının onayını bekliyor.',approved:r.codeSent?'Giriş kodun e-posta kuyruğuna alındı.':'Onayın var. E-posta adresini doğruladığında kodun gönderilecek.',rejected:'Başvurun reddedildi.',revoked:'Öğretmen platformu erişimin kaldırıldı.'})[r.state];if(r.state==='none'){const apply=document.createElement('button');apply.type='button';apply.className='tp-primary';apply.textContent='Öğretmen erişimi iste';apply.onclick=async()=>{try{await api('teacherPortalApply',{},localStorage.getItem('ing_token')||'');v.form.textContent='Başvurun teacher hesabının onayına gönderildi.';}catch(e){v.error(e.message);}};v.form.append(apply);}const login=document.createElement('button');login.type='button';login.textContent='Kodla Öğretmen Girişi';login.onclick=openLogin;v.form.append(login);}catch(e){v.error(e.message);}},true);}
 let checkedToken='',canManage=false;
 async function decorate(){statusButton();const menu=document.getElementById('ogretmenMenuModal');if(!menu)return;const token=sessionStorage.getItem('ing_ogr_token')||'';if(!token)return;if(checkedToken!==token){checkedToken=token;canManage=false;try{const d=await api('ogretmenBilgim',{},token);canManage=d.kullanici==='teacher'&&d.yonetici===true;}catch{}}if(canManage&&!menu.querySelector('[data-tp-manage]')){const b=document.createElement('button');b.type='button';b.className='ogretmen-menu-btn';b.dataset.tpManage='1';b.textContent='🔐 Öğretmen Erişim Onayları';b.onclick=management;menu.querySelector('.rubric-content')?.append(b);}}

 // Private teacher home: separate from the learner home and onboarding tours.
 // A private teacher login already requires the linked teacher's verified email.
 // Guest-preview prompts must not impersonate the teacher's personal account.
 function suppressPreviewPrompts(){
  if(!mode)return;
  for(const e of document.querySelectorAll('body [role="dialog"],body [aria-modal="true"],body .dm-first-character,body .character-choice-overlay')){
   if(e.closest('#tpTeacherHome,#tpDashboard,.tp-shade'))continue;
   const heading=e.querySelector('h1,h2,h3')?.textContent?.trim()||'';
   if(/karakterini seç/i.test(heading)&&e.style.display!=='none'){e.style.display='none';e.setAttribute('aria-hidden','true');}
  }
  // Suppress the preview pupil's generic notices, but keep teacher-manager announcements.
  for(const id of ['dmEmailVerifyBanner','dmEmailVerification','dmGoalAnnouncement','dmWeeklyPanel','dmLevelUp','dmNudge','dmPlacementInvite']){
   const e=document.getElementById(id);if(e&&e.style.display!=='none'){e.style.display='none';e.setAttribute('aria-hidden','true');}
  }
  const studentAnnouncement=document.getElementById('duyuruOverlay');
  if(studentAnnouncement&&!studentAnnouncement.dataset.teacherAdminAnnouncement&&studentAnnouncement.style.display!=='none'){
   studentAnnouncement.style.display='none';studentAnnouncement.setAttribute('aria-hidden','true');
  }
  for(const e of document.querySelectorAll('body section,body aside')){
   if(e.closest('#tpTeacherHome,#tpDashboard,.tp-shade'))continue;
   const title=e.querySelector('h2,h3,strong')?.textContent?.trim()||'';
   if(/e.postanı henüz doğrulamadın/i.test(title)&&e.textContent.length<600&&e.style.display!=='none')e.style.display='none';
  }
 }
 let teacherAppearanceReady=false;
 async function prepareTeacherAppearance(){
  if(!mode||teacherAppearanceReady||typeof yo==='undefined'||!yo)return;
  teacherAppearanceReady=true;
  try{
   const r=await api('teacherPortalAppearance');
   if(r.appearance?.cins&&r.appearance?.s){
    yo.karakter={...(yo.karakter||{}),...r.appearance};
    window.yoKaydet?.();
   }
  }catch(e){teacherAppearanceReady=false;console.warn('[Öğretmen karakteri]',e);}
 }
 if(mode)document.addEventListener('click',e=>{
  if(!e.target.closest?.('#dmBuilderSave'))return;
  setTimeout(async()=>{
   try{if(typeof yo==='undefined'||!yo?.karakter)return;await api('teacherPortalAppearance',{save:true,appearance:{cins:yo.karakter.cins,s:yo.karakter.s}});}
   catch(error){console.warn('[Öğretmen karakteri kaydı]',error);}
  },400);
 },true);
 function addPersonalSwitch(){
  if(!mode)return;
  const badge=[...document.querySelectorAll('body button,body a')].find(e=>/^(Çık|Çıkış)$/.test(e.textContent.trim())&&e.closest('.tp-participant,[class*="teacher-mode"],[class*="teacher-banner"]'));
  if(badge&&!badge.dataset.tpPersonal){
    badge.dataset.tpPersonal='1';badge.textContent='Kişisel hesabıma geç';
    badge.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();window.dmTeacherPortalExit?.();};
  }
 }
 function teacherHome(){
  if(!mode)return;
  let home=document.getElementById('tpTeacherHome');
  if(!home){
   home=document.createElement('main');home.id='tpTeacherHome';home.setAttribute('aria-label','Öğretmen Ana Sayfa');
   home.innerHTML='<div class="tp-home-inner"><section class="tp-home-hero"><div><h1>Merhaba Öğretmenim! 👋</h1><p>Diji Medu ile sınıfınızda öğrenmeyi daha eğlenceli ve etkili hale getirin.</p></div><img src="discovery-assets/papi-merhaba.webp" alt="Papi öğretmen maskotu"></section><h2>Bugün ne yapmak istersiniz?</h2><p class="tp-home-sub">Aşağıdaki seçeneklerden birini seçerek hemen başlayın.</p><div class="tp-home-actions"><button data-tp-action="study" class="tp-home-card tp-mint"><span class="tp-home-art">📖💡</span><strong>Yeni bir konu anlat</strong><small>Konuyu anlat, örnekleri paylaş ve alıştırmalarla pekiştir.</small><span class="tp-home-arrow">›</span></button><button data-tp-action="games" class="tp-home-card tp-lilac"><span class="tp-home-art">🎮✨</span><strong>Öğrencilerle oyun oyna</strong><small>Konu oyunlarıyla öğrenmeyi daha eğlenceli hale getir.</small><span class="tp-home-arrow">›</span></button><button data-tp-action="oral" class="tp-home-card tp-cream"><span class="tp-home-art">🎙️💬</span><strong>Sözlü yap</strong><small>Öğrencilerine sözlü sorular sor ve anında değerlendir.</small><span class="tp-home-arrow">›</span></button><button data-tp-action="panel" class="tp-home-card tp-blue"><span class="tp-home-art">📊⚙️</span><strong>Öğretmen paneline git</strong><small>Sınıfını yönet, ilerlemeleri gör ve raporları incele.</small><span class="tp-home-arrow">›</span></button></div><h2 class="tp-quick-title">⚡ Hızlı başlangıç</h2><div class="tp-home-shortcuts"><button data-tp-action="panel">👥 <span><strong>Öğrencilerini yönet</strong><small>Öğrenci ekle, listeni düzenle.</small></span> ›</button><button data-tp-action="study">📋 <span><strong>Hazır içerikleri keşfet</strong><small>Sınıfına uygun içerikleri bul.</small></span> ›</button></div></div>';
   document.body.append(home);
   home.addEventListener('click',e=>{const b=e.target.closest('[data-tp-action]');if(b)teacherDestination(b.dataset.tpAction);});
  }
  const nav=document.getElementById('bottomNavMobile');
  if(nav&&nav.parentElement!==document.body)document.body.append(nav);
  if(nav&&!nav.querySelector('[data-tp-home-nav]')){
   const b=document.createElement('button');b.type='button';b.className='bn-item tp-home-nav';b.dataset.tpHomeNav='1';b.innerHTML='<span class="tp-nav-home-icon">🏠</span><span class="bn-label">Ana Sayfa</span>';b.onclick=()=>teacherHomeShow();nav.prepend(b);
   nav.addEventListener('click',e=>{const target=e.target.closest('.bn-item:not([data-tp-home-nav])');if(!target)return;
    if(/öğretmen paneli/i.test(target.textContent||'')||target.dataset.tpPanelNav==='1'){e.preventDefault();e.stopImmediatePropagation();teacherDashboardShow();return;}
    if(target.dataset.ekran==='tab-profile-menu'){e.preventDefault();e.stopImmediatePropagation();teacherProfileShow();return;}
    teacherHomeHide();teacherDashboardHide();
   },true);
  }
  if(nav){
   for(const item of nav.querySelectorAll('.bn-item')){
    if(/öğretmen paneli/i.test(item.textContent||'')){
     item.dataset.tpPanelNav='1';
     const oldIcon=item.querySelector('.bn-icon');if(oldIcon)oldIcon.style.setProperty('display','none','important');
     let badge=item.querySelector(':scope > .tp-panel-visible-icon');
     if(!badge){badge=document.createElement('span');badge.className='tp-panel-visible-icon';badge.setAttribute('aria-hidden','true');badge.textContent='🎓';item.insertBefore(badge,item.querySelector('.bn-label'));}

    }
   }
  }
  if(!window.tpHomeInitialized){window.tpHomeInitialized=true;teacherHomeShow();}
 }

 function teacherProfileShow(){
  teacherHomeHide();teacherDashboardHide();
  openProfile();
 }
 function teacherDashboardShow(){
  if(!mode)return;
  teacherHomeHide();
  let panel=document.getElementById('tpDashboard');
  if(!panel){
   panel=document.createElement('main');panel.id='tpDashboard';panel.setAttribute('aria-label','Öğretmen Paneli');
   panel.innerHTML='<div class="tp-dash-wrap"><header class="tp-dash-hero"><img src="discovery-assets/ogretmen.webp" alt="Öğretmen maskotu"><div><h1>Öğretmen Paneli</h1><p>Sınıflarını yönet, etkinlik oluştur ve öğrenci gelişimini takip et.</p></div><button type="button" data-dash="home">⌂ Ana Sayfa</button></header><section class="tp-dash-metrics"><div>👥 <b data-dash-students>—</b><small>Öğrenci</small></div><div>🏫 <b data-dash-classes>—</b><small>Sınıf</small></div><div>🎮 <b>Oyunlar</b><small>Sınıf etkinlikleri</small></div><div>📋 <b>Ödevler</b><small>Öğrenci çalışmaları</small></div></section><div class="tp-dash-layout"><nav class="tp-dash-menu" aria-label="Öğretmen araçları"><button data-dash="students">👥 Sınıflarım</button><button data-dash="homework">📋 Ödevler</button><button data-dash="games">🎮 Sınıf Oyunları</button><button data-dash="oral">🎙️ Sözlü Yap</button><button data-dash="reports">📊 Raporlar</button><button data-dash="library">📚 İçerik Kütüphanesi</button><button data-dash="settings">⚙️ Ayarlar</button></nav><section class="tp-dash-main"><h2>Bugün ne yapmak istersiniz?</h2><p>Öğretmen araçlarına tek dokunuşla ulaşın.</p><div class="tp-dash-tiles"><button data-dash="students">👥<strong>Sınıflarımı Yönet</strong><small>Öğrenci ve sınıf listesi</small></button><button data-dash="homework">📝<strong>Ödev Ver</strong><small>Yeni çalışma oluştur</small></button><button data-dash="games">🎮<strong>Sınıf Oyunları</strong><small>Birlikte oyun başlat</small></button><button data-dash="oral">🎤<strong>Sözlü Yap</strong><small>Sözlü sınav oluştur</small></button><button data-dash="reports">📊<strong>Raporlar</strong><small>İlerlemeleri incele</small></button><button data-dash="library">📖<strong>İçerik Kütüphanesi</strong><small>Konu anlatımına geç</small></button></div></section></div></div>';
   document.body.append(panel);
   panel.addEventListener('click',e=>{const b=e.target.closest('[data-dash]');if(b)teacherDashboardAction(b.dataset.dash);});
  }
  const legacy=document.querySelector('#ogretmenMenuModal .rubric-content');
  const tools=panel.querySelector('.tp-dash-main');
  if(legacy&&tools){
   let list=tools.querySelector('.tp-dash-legacy');
   if(!list){list=document.createElement('section');list.className='tp-dash-legacy';list.innerHTML='<h2>Tüm öğretmen araçları</h2><div class="tp-dash-tool-grid"></div>';tools.append(list);}
   const grid=list.querySelector('.tp-dash-tool-grid');grid.replaceChildren();
   for(const original of legacy.querySelectorAll('button.ogretmen-menu-btn')){
    if(original.disabled||!original.textContent.trim())continue;
    const b=document.createElement('button');b.type='button';b.textContent=original.textContent.trim();
    b.onclick=()=>{document.body.classList.add('tp-legacy-inline');original.click();};
    grid.append(b);
   }
  }
  panel.classList.add('is-visible');document.body.classList.add('tp-dash-active');
  document.querySelector('[data-tp-home-nav]')?.classList.remove('active');
  document.querySelector('#bottomNavMobile [data-ekran="tab-profile-menu"]')?.classList.add('active');
 }
 function teacherDashboardHide(){document.body.classList.remove('tp-legacy-inline');document.getElementById('ogretmenMenuModal')?.style.setProperty('display','none');document.getElementById('tpDashboard')?.classList.remove('is-visible');document.body.classList.remove('tp-dash-active');}
 function teacherDashboardAction(action){
  if(action==='home'){teacherDashboardHide();teacherHomeShow();return;}
  if(action==='oral'){window.dmTeacherOral?.open?.();return;}
  if(action==='games'||action==='library'){teacherDashboardHide();teacherDestination(action==='games'?'games':'study');return;}
  // Use the existing, permission-checked teacher management functions.
  const menu=document.getElementById('ogretmenMenuModal');
  if(menu){document.body.classList.add('tp-legacy-inline');menu.style.display='flex';const candidates=[...menu.querySelectorAll('button')];const pattern=({students:/öğrenci|sınıf|liste/i,homework:/ödev/i,reports:/rapor|istatistik/i,settings:/ayar/i})[action];const target=candidates.find(b=>pattern?.test(b.textContent||''));if(target)target.click();else window.yoToast?.('Bu işlem için öğretmen panelindeki ilgili aracı seç.');}
 }

 function teacherHomeShow(){
  teacherDashboardHide();
  if(!mode)return;document.getElementById('tpTeacherHome')?.classList.add('is-visible');
  document.body.classList.add('tp-home-active');document.documentElement.classList.remove('tp-home-starting');
  document.querySelector('[data-tp-home-nav]')?.classList.add('active');
 }
 function teacherHomeHide(){document.getElementById('tpTeacherHome')?.classList.remove('is-visible');document.body.classList.remove('tp-home-active');document.querySelector('[data-tp-home-nav]')?.classList.remove('active');}
 function teacherDestination(action){
  if(action==='panel'){teacherDashboardShow();return;}
  teacherHomeHide();
  if(action==='oral'){window.dmTeacherOral?.open?.();return;}
  const id=action==='study'?'tab-derscalis':action==='games'?'tab-aktiviteler':'tab-profile-menu';
  const button=document.querySelector('#bottomNavMobile [data-ekran="'+id+'"]');
  if(button)button.click();
  else ({study:window.dersCalisTamEkranAc,games:window.aktivitelerTamEkranAc,panel:window.dmProfileMenuAc})[action]?.();

 }

 window.dmTeacherPortal={openLogin,openProfile,beforeGame,management};
 if(document.body.dataset.teacherReset==='1'){resetPage();return;}
 if(mode){document.body.classList.add('dm-teacher-portal');document.documentElement.classList.add('tp-home-starting');window.cikisYap=window.dmTeacherPortalExit;window.siniftaOyunModuAc=()=>{document.getElementById('ogretmenMenuModal')?.style.setProperty('display','none');window.aktivitelerTamEkranAc?.();};}
 let scheduled=false;const observe=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();if(mode){suppressPreviewPrompts();addPersonalSwitch();}});};new MutationObserver(observe).observe(document.body,{childList:true,subtree:true});decorate();wrapGames();
 document.addEventListener('dm:state',wrapGames);document.addEventListener('dm:login',wrapGames);if(mode)document.addEventListener('click',()=>{if(window.tpHomeInitialized){teacherHome();suppressPreviewPrompts();}}, {capture:false});
 let opened=false;const timer=setInterval(()=>{wrapGames();if(mode&&!opened&&document.getElementById('bottomNavMobile')){opened=true;teacherHome();suppressPreviewPrompts();prepareTeacherAppearance();sessionStorage.removeItem('dm_tp_pending');}if(opened)clearInterval(timer);},500);setTimeout(()=>clearInterval(timer),30000);
 if(new URLSearchParams(location.search).get('ogretmenGiris')==='1'){window.dmFirstDiscovery?.openLogin?.();openLogin();}
})();
