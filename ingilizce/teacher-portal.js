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
 function hideTeacherHeader(){
  for(const el of document.querySelectorAll('body button,body a')){
   if(/^(çık|çıkış)$/i.test((el.textContent||'').trim())&&/öğretmen modu/i.test(el.parentElement?.textContent||''))el.parentElement.style.display='none';
  }
 }
 function addPersonalSwitch(){
  if(!mode)return;
  const badge=[...document.querySelectorAll('body button,body a')].find(e=>/^(Çık|Çıkış)$/.test(e.textContent.trim())&&e.closest('.tp-participant,[class*="teacher-mode"],[class*="teacher-banner"]'));
  if(badge&&!badge.dataset.tpPersonal){
    badge.dataset.tpPersonal='1';badge.textContent='Kişisel hesabıma geç';
    badge.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();window.dmTeacherPortalExit?.();};
  }
 }
 function teacherDock(){
  if(!mode)return;
  const native=document.getElementById('bottomNavMobile');
  if(native)native.style.setProperty('display','none','important');
  let dock=document.getElementById('tpTeacherDock');
  if(!dock){
   dock=document.createElement('nav');dock.id='tpTeacherDock';dock.setAttribute('aria-label','Öğretmen menüsü');
   dock.innerHTML='<button type="button" data-route="home"><span>🏠</span>Ana Sayfa</button><button type="button" data-route="games"><span>🎮</span>Oyunlar</button><button type="button" data-route="study"><span>📖</span>Ders Çalış</button><button type="button" data-route="panel"><span>🎓</span>Öğretmen Paneli</button>';
   document.body.append(dock);
   dock.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(!b)return;e.preventDefault();e.stopPropagation();const route=b.dataset.route;if(route==='home')teacherHomeShow();else if(route==='panel')teacherDashboardShow();else teacherDestination(route);});
  }
  dock.querySelectorAll('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===(document.body.classList.contains('tp-dash-active')?'panel':document.body.classList.contains('tp-home-active')?'home':'other')));
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
  teacherDock();
  const nav=document.getElementById('bottomNavMobile');
  // Profile settings are now under the Teacher Panel sidebar.
  nav?.querySelectorAll('.bn-item').forEach(item=>{if((/profil/i.test(item.textContent||'')||item.dataset.ekran==='tab-profil'||item.dataset.ekran==='tab-profile-menu')&&!/öğretmen paneli/i.test(item.textContent||'')&&!item.dataset.tpHomeNav)item.remove();});
  if(nav&&nav.parentElement!==document.body)document.body.append(nav);
  if(nav&&!nav.querySelector('[data-tp-home-nav]')){
   const b=document.createElement('button');b.type='button';b.className='bn-item tp-home-nav';b.dataset.tpHomeNav='1';b.innerHTML='<span class="tp-nav-home-icon">🏠</span><span class="bn-label">Ana Sayfa</span>';b.onclick=()=>teacherHomeShow();nav.prepend(b);
   nav.addEventListener('click',e=>{const target=e.target.closest('.bn-item:not([data-tp-home-nav])');if(!target)return;
    if(/öğretmen paneli/i.test(target.textContent||'')||target.dataset.tpPanelNav==='1'){e.preventDefault();e.stopImmediatePropagation();teacherDashboardShow();return;}
    if(target.dataset.ekran==='tab-profile-menu'){e.preventDefault();e.stopImmediatePropagation();teacherDashboardShow();return;}
    if(/oyun/i.test(target.textContent||'')){e.preventDefault();e.stopImmediatePropagation();teacherDestination('games');return;}
    if(/ders çalış/i.test(target.textContent||'')){e.preventDefault();e.stopImmediatePropagation();teacherDestination('study');return;}
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
   panel.innerHTML='<div class="tp-dash-wrap"><header class="tp-dash-hero"><span class="tp-teacher-pair"><img src="discovery-assets/ogretmen.webp" alt="Kadın öğretmen"><span class="tp-teacher-male" role="img" aria-label="Erkek öğretmen">👨‍🏫</span></span><div><h1>Öğretmen Paneli</h1><p>Sınıflarını yönet, etkinlik oluştur ve öğrenci gelişimini takip et.</p></div><div class="tp-dash-header-actions"><button type="button" data-dash="sync">🔄 Verileri Otomatik Çek</button><button type="button" data-dash="home">⌂ Ana Sayfa</button></div></header><section class="tp-dash-metrics"><div>👥 <b data-dash-students>—</b><small>Öğrenci</small></div><div>🏫 <b data-dash-classes>—</b><small>Sınıf</small></div><div>🎮 <b>Oyunlar</b><small>Sınıf etkinlikleri</small></div><div>📋 <b>Ödevler</b><small>Öğrenci çalışmaları</small></div></section><div class="tp-dash-layout"><nav class="tp-dash-menu" aria-label="Öğretmen araçları"><button data-dash="performance">🏫 Ders İçi Performans</button><button data-dash="individual">📊 Öğrenci Bireysel Raporları</button><button data-dash="weak">🎯 Sınıfın Zayıf Noktaları</button><button data-dash="parent">🗓️ Haftalık Veli Özetleri</button><button data-dash="messages">💬 Öğrenci Mesajları</button><button data-dash="announcements">📢 Duyuru Oluştur</button><button data-dash="rubric">📋 Özel Ders Rubrik Değerlendirme</button><button data-dash="studentDetails">🔐 Öğrenci Bilgilerini Değiştir</button><button data-dash="code">🔑 Giriş Kodunu Değiştir</button><button data-dash="settings">⚙️ Ayarlar</button><button data-dash="logout" class="tp-dash-logout">🚪 Çıkış Yap</button></nav><section class="tp-dash-main"><h2>Bugün ne yapmak istersiniz?</h2><p>Öğretmen araçlarına tek dokunuşla ulaşın.</p><div class="tp-dash-tiles tp-real-tools"><button type="button" data-dash="homework"><span aria-hidden="true">📝</span><strong>Ödev Ver</strong><small>Sınıf ve şube ödevleri</small></button><button type="button" data-dash="rubric"><span aria-hidden="true">📊</span><strong>Rubrik Paneli</strong><small>Öğrenci değerlendirmeleri</small></button><button type="button" data-dash="performance"><span aria-hidden="true">🏫</span><strong>Ders İçi Performans</strong><small>Sınıf puanları ve katılım</small></button><button type="button" data-dash="announcements"><span aria-hidden="true">📣</span><strong>Duyurular</strong><small>Bağlı öğrencilere duyuru</small></button><button type="button" data-dash="messages"><span aria-hidden="true">💬</span><strong>Öğrenci Sohbetleri</strong><small>Öğrenci mesajlarını yanıtla</small></button><button type="button" data-dash="weak"><span aria-hidden="true">🎯</span><strong>Sınıfın Zayıf Noktaları</strong><small>Sınıfın gelişim alanları</small></button><button type="button" data-dash="parent"><span aria-hidden="true">👨‍👩‍👧</span><strong>Haftalık Veli Özetleri</strong><small>Haftalık öğrenci raporları</small></button><button type="button" data-dash="studentDetails"><span aria-hidden="true">🔑</span><strong>Öğrenci Şifresi Sıfırla</strong><small>Öğrenci hesabı yönetimi</small></button><button type="button" data-dash="exams"><span aria-hidden="true">📑</span><strong>Seviye Sınavı Sonuçları</strong><small>Seviye sınavı kayıtları</small></button><button type="button" data-dash="oral"><span aria-hidden="true">🎤</span><strong>Sözlü Yap</strong><small>Kelime sözlü uygulaması</small></button></div></section></div></div>';
   document.body.append(panel);
   panel.addEventListener('click',e=>{const b=e.target.closest('[data-dash]');if(b)teacherDashboardAction(b.dataset.dash);});
  }
  if(typeof yo!=='undefined'&&yo?.karakter?.s?.ogretmenKombin!=null){
   const i=Number(yo.karakter.s.ogretmenKombin);
   const hero=panel.querySelector('.tp-dash-hero img,.tp-dash-hero .tp-look-art');
   if(hero&&Number.isInteger(i)&&i>=0&&i<10){
    const badge=document.createElement('span');badge.className='tp-look-art';
    badge.textContent=(yo.karakter.cins==='k'?'👩':'👨')+['👔','🥼','🧥','📚','🎓','🎨','🌿','🗣️','💻','⭐'][i];
    hero.replaceWith(badge);
   }
  }
  panel.classList.add('is-visible');document.body.classList.add('tp-dash-active');teacherDock();refreshTeacherStats();
  document.querySelector('[data-tp-home-nav]')?.classList.remove('active');
  document.querySelector('#bottomNavMobile [data-tp-panel-nav]')?.classList.add('active');
 }
 function teacherDashboardHide(){document.body.classList.remove('tp-legacy-inline');document.getElementById('ogretmenMenuModal')?.style.setProperty('display','none');document.getElementById('tpDashboard')?.classList.remove('is-visible');document.body.classList.remove('tp-dash-active');}
 function openBulkStudents(){
  const v=sheet('👥 Öğrencini Üye Yap','<p>En fazla 50 öğrenciyi aynı anda ekleyebilirsin. Kullanıcı adı gerçek isim içermeyen bir takma ad olmalıdır. Başlangıç şifresi hesap güvenliği için en az 8 karakterdir. Öğrenciler girişten sonra e-posta, telefon ve e-posta doğrulama işlemlerini normal üyelik kurallarıyla tamamlar.</p><div class="tp-bulk-defaults"><label>Varsayılan sınıf<select name="sinif">'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'. sınıf</option>').join('')+'</select></label><label>Varsayılan şube<input name="sube" value="A" required maxlength="10"></label></div><label>Okul (isteğe bağlı)<input name="okul" maxlength="120"></label><label>Öğrenciler (her satır: kullanıcı_adı,şifre)<textarea name="ogrenciler" rows="9" required placeholder="ogrenci101,Guvenli2026!\nogrenci102,Guvenli2026!"></textarea></label><p>⚠️ Şifreleri güvenli şekilde paylaş; bu alanda kalıcı olarak saklanmaz. Yeni hesaplar aynı öğretmenin sınıfına bağlanır.</p><button class="tp-primary" type="submit">Öğrencileri kaydet</button>');
  submit(v,async f=>{
   const cls=Number(f.get('sinif')),branch=String(f.get('sube')||'').trim(),school=String(f.get('okul')||'').trim();
   const rows=String(f.get('ogrenciler')||'').trim().split(/\r?\n/).filter(Boolean);
   if(!rows.length||rows.length>50)throw Error('1–50 öğrenci gir.');
   const ogrenciler=rows.map((line,i)=>{const cut=line.indexOf(',');if(cut<1)throw Error((i+1)+'. satırda kullanıcı adı ve şifreyi virgülle ayır.');const kullanici=line.slice(0,cut).trim(),sifre=line.slice(cut+1).trim();if(sifre.length<8||sifre.length>64)throw Error((i+1)+'. satır şifresi 8–64 karakter olmalı.');return {kullanici,sifre,sinif:cls,sube:branch,okul:school};});
   const result=await api('ogretmenOgrenciOlustur',{ogrenciler});
   v.form.replaceChildren();const msg=document.createElement('p');msg.textContent=result.mesaj||ogrenciler.length+' öğrenci kaydedildi.';v.form.append(msg);
  });
 }
 function legacyTool(pattern){
  const menu=document.getElementById('ogretmenMenuModal');
  // Use existing wired legacy buttons: cloning them would lose event listeners.
  const originals=[...(menu?.querySelectorAll('button.ogretmen-menu-btn')||[])];
  const target=originals.find(b=>pattern.test(b.dataset.dmTeacherTitle||b.querySelector('.dm-teacher-card-title')?.textContent||b.textContent||''));
  if(!target){sheet('Araç açılamadı','<p>Eski öğretmen panelindeki ilgili araç henüz yüklenmedi. Hesabınla tekrar giriş yap.</p>');return;}
  const modalBefore=[...document.querySelectorAll('.rubric-modal,.cog-perde,.sm-overlay,.dm-member-overlay,.dm-account-overlay,.dm-perde,.yo-modal,.yo-perde,#yoModalPerde,#omSifreModal,#odModal,.game-modal-overlay,.gso-overlay')].filter(e=>e.getClientRects().length);
  try{target.click();}catch(error){console.error('[Legacy teacher tool]',error);sheet('Araç açılamadı','<p>Öğretmen aracı açılırken hata oluştu.</p>');return;}
  if(menu){menu.classList.remove('dm-teacher-open');menu.style.setProperty('display','none');}
  // Restore dashboard when the existing dialog is closed; don't block its event handlers.
  const visible=()=>[...document.querySelectorAll('.rubric-modal,.cog-perde,.sm-overlay,.dm-member-overlay,.dm-account-overlay,.dm-perde,.yo-modal,.yo-perde,#yoModalPerde,#omSifreModal,#odModal,.game-modal-overlay,.gso-overlay')].some(el=>el.isConnected&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none');
  requestAnimationFrame(()=>document.body.classList.toggle('tp-legacy-child-open',visible()));
  if(!window.tpLegacyToolObserver){let queued=false;window.tpLegacyToolObserver=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;document.body.classList.toggle('tp-legacy-child-open',visible());});});window.tpLegacyToolObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden']});}
 }
 async function chooseTeacherStudent(title,next){
  const v=sheet(title,'<p>Yalnızca hesabına bağlı öğrencileri seçebilirsin.</p><label>Sınıf<select name="grade"><option value="">Tüm sınıflar</option>'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'. sınıf</option>').join('')+'</select></label><label>Öğrenci<select name="studentId" required><option value="">Öğrenci seç</option></select></label><button class="tp-primary">Devam Et</button>');
  let data=[];
  try{const r=await api('teacherPortalStudents');data=r.items||[];}catch(e){v.error(e.message);}
  const select=v.form.elements.studentId,fill=()=>{const grade=v.form.elements.grade.value;select.replaceChildren(new Option('Öğrenci seç',''));data.filter(x=>!grade||String(x.class_no||'')===grade).forEach(x=>select.add(new Option((x.full_name||x.username)+' · '+(x.class_no||'?')+'. sınıf',x.id)));};
  v.form.elements.grade.onchange=fill;fill();
  submit(v,async form=>{const student=data.find(x=>x.id===form.get('studentId'));if(!student)throw Error('Bağlı bir öğrenci seç.');v.close();await next(student);});
 }
 async function refreshTeacherStats(){
  const panel=document.getElementById('tpDashboard');if(!panel)return;
  try{const result=await api('teacherPortalStudents');const students=result.items||[];
   panel.querySelector('[data-dash-students]').textContent=String(students.length);
   panel.querySelector('[data-dash-classes]').textContent=String(new Set(students.map(s=>s.class_no).filter(Boolean)).size);
  }catch(e){console.warn('[Teacher panel summary]',e);}
 }
 function openTeacherCodeSync(){
  const v=sheet('🔄 Verileri Otomatik Çek','<p>Öğrencilerin öğretmenine bağlanırken kullandığı öğretmen kodunu gir. Yalnızca senin doğrulanmış öğretmen hesabına ait kod kabul edilir.</p><label>Öğretmen bağlantı kodu<input name="teacherCode" autocomplete="off" required maxlength="32" placeholder="Öğretmen kodun"></label><button type="submit" class="tp-primary">Kodumu Doğrula ve Verileri Çek</button>');
  submit(v,async values=>{
   const code=String(values.get('teacherCode')||'').trim();if(!code)throw Error('Öğretmen bağlantı kodunu gir.');
   const result=await api('teacherPortalSyncStudents',{code});
   v.form.replaceChildren();
   const p=document.createElement('p');p.textContent=(result.count||0)+' bağlı öğrenci bulundu. Öğretmen paneli verileri güncellendi.';v.form.append(p);
   await refreshTeacherStats();
  });
 }

 async function pickClass(title,done){
  const v=sheet(title,'<label>Sınıf<select name="grade">'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'. sınıf</option>').join('')+'</select></label><button type="submit" class="tp-primary">Raporu Göster</button>');
  submit(v,async f=>{const grade=Number(f.get('grade'));v.close();await done(grade);});
 }
 function showClassAnalytics(title,grade,report){
  const v=sheet(title,'<div class="tp-class-analytics"><p data-summary></p><h3>En çok yanlış yapılan oyun türleri</h3><div data-games></div><h3>Bu hafta oyun çalışması olmayan öğrenciler</h3><div data-inactive></div><h3>Öğrencilerin haftalık gelişimi</h3><div data-students></div><button type="button" data-copy>Haftalık özeti kopyala</button></div>');
  const summary='Sınıf '+grade+' · Oyunlar: '+report.summary.plays+' · Doğru: '+report.summary.correct+' · Yanlış: '+report.summary.wrong+' · Ortalama toplam XP: '+report.summary.averageXp;
  v.shade.querySelector('[data-summary]').textContent=summary;
  const games=v.shade.querySelector('[data-games]');(report.summary.wrongByGame||[]).forEach(([key,count])=>{const p=document.createElement('p');p.textContent=key+' — '+count+' yanlış';games.append(p);});
  if(!games.childNodes.length)games.textContent='Bu hafta oyun verisi bulunamadı.';
  v.shade.querySelector('[data-inactive]').textContent=report.inactive.length?report.inactive.join(', '):'Tüm öğrenciler bu hafta oyun çalışması yapmış.';
  const list=v.shade.querySelector('[data-students]');
  report.students.forEach(st=>{const p=document.createElement('p');p.textContent=st.name+' · XP: '+(st.xp||0)+' · Oyun: '+st.plays;list.append(p);});
  v.shade.querySelector('[data-copy]').onclick=()=>{const text=[summary,'Yanlış yapılan oyunlar: '+(report.summary.wrongByGame||[]).map(x=>x.join(': ')).join(', '),'Çalışma yapmayanlar: '+report.inactive.join(', '),...report.students.map(x=>x.name+': '+x.plays+' oyun, '+x.xp+' XP')].join('\n');navigator.clipboard?.writeText(text);};
 }
 function classroom(action){
  pickClass(action==='parent'?'Haftalık Veli Özetleri':'Sınıfımın Öğrenme Özeti',async grade=>{
   try{const report=await api('teacherPortalClassAnalytics',{grade});showClassAnalytics(action==='parent'?'Haftalık Veli Özetleri':'Sınıfımın Öğrenme Özeti',grade,report);}
   catch(e){sheet('Rapor alınamadı','<p>'+String(e.message).replace(/[<>&]/g,'')+'</p>');}
  });
 }
 function teacherPerformance(){
  chooseTeacherStudent('Ders İçi Performans',async student=>{
   const v=sheet('Ders İçi Performans','<h3 data-name></h3><p>Öğrencinin ders içi performansını değerlendir.</p><div class="tp-score-buttons"><button type="button" data-score="0.3">+ Katılım (+0,3)</button><button type="button" data-score="-2">− Performans (−2)</button></div><p role="status" data-result></p>');
   v.shade.querySelector('[data-name]').textContent=student.full_name||student.username;
   v.shade.querySelectorAll('[data-score]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const r=await api('teacherPortalPerformance',{studentId:student.id,delta:Number(button.dataset.score)});v.shade.querySelector('[data-result]').textContent='Güncel puan: '+r.points;}catch(e){v.shade.querySelector('[data-result]').textContent=e.message;}finally{button.disabled=false;}});
  });
 }
 function teacherRubric(){
  chooseTeacherStudent('Özel Ders Rubrik Değerlendirme',async student=>{
   const fields=[['reading_score','Okuma'],['writing_score','Yazma'],['vocabulary_score','Kelime'],['speaking_score','Konuşma'],['grammar_score','Dil bilgisi']];
   const html='<h3>'+String(student.username).replace(/[<>&]/g,'')+'</h3>'+fields.map(([k,label])=>'<label>'+label+' (0–100)<input type="number" name="'+k+'" min="0" max="100" required value="70"></label>').join('')+'<button class="tp-primary" type="submit">Rubriği Kaydet</button>';
   const v=sheet('Özel Ders Rubrik Değerlendirme',html);
   submit(v,async form=>{const values={studentId:student.id};fields.forEach(([k])=>values[k]=Number(form.get(k)));const r=await api('teacherPortalRubric',values);v.form.textContent='Değerlendirme kaydedildi. Genel ortalama: '+r.average;});
  });
 }
 function teacherAnnouncement(){
  const v=sheet('📢 Duyuru Oluştur','<p>Yalnızca sana bağlı öğrencilere gösterilir. Tüm platform duyurusu gönderilemez.</p><label>Başlık<input name="title" maxlength="120" required></label><label>Duyuru<textarea name="message" maxlength="2000" required rows="5"></textarea></label><button class="tp-primary" type="submit">Duyuruyu Yayınla</button>');
  submit(v,async form=>{await api('teacherPortalAnnouncement',{title:form.get('title'),message:form.get('message')});v.form.textContent='Duyuru öğrencilerine gönderildi.';});
 }
 function teacherStudentDetails(){
  chooseTeacherStudent('Öğrenci Bilgilerini Değiştir',async student=>{
   const info=await api('teacherPortalStudentContact',{studentId:student.id});
   const v=sheet('Öğrenci Bilgilerini Değiştir','<p data-name></p><p>E-posta doğrulama, parola ve öğretmen değişikliği öğrencinin güvenli hesap işlemleriyle yapılır. Öğretmen yalnızca telefon bilgisini güncelleyebilir.</p><label>E-posta (salt okunur)<input name="email" readonly></label><label>Telefon<input name="phone" inputmode="tel" maxlength="12"></label><button type="submit" class="tp-primary">Telefonu Kaydet</button>');
   v.shade.querySelector('[data-name]').textContent=student.username;
   v.form.elements.email.value=info.student.email||'';v.form.elements.phone.value=info.student.phone||'';
   submit(v,async form=>{const r=await api('teacherPortalStudentContact',{studentId:student.id,save:true,phone:form.get('phone')});v.form.textContent=r.mesaj;});
  });
 }
 function teacherDashboardAction(action){
  if(action==='home'){teacherDashboardHide();teacherHomeShow();return;}
  if(action==='sync'){openTeacherCodeSync();return;}
  if(action==='logout'){window.dmTeacherPortalExit?.();return;}
  if(action==='code'||action==='settings'){openProfile();return;}
  if(action==='students'){openBulkStudents();return;}
  if(action==='games'||action==='library'){teacherDashboardHide();teacherDestination(action==='games'?'games':'study');return;}
  if(action==='oral'){legacyTool(/sözlü yap/i);return;}
  const map={
   performance:/ders içi performans/i,
   individual:/bireysel rapor|öğrenci ilerleme|öğrenci rapor/i,
   weak:/sınıfın zayıf noktaları|zayıf noktalar/i,
   parent:/haftalık veli özetleri|veli özetleri/i,
   messages:/öğrenci sohbetleri|öğrenci mesajları/i,
   announcements:/duyurular|duyuru oluştur/i,
   rubric:/rubrik/i,
   studentDetails:/öğrenci şifresi sıfırla|öğrenci bilgileri/i,
   summary:/sınıfımın öğrenme özeti|öğrenme özeti/i,
   exams:/seviye sınavı sonuçları/i,
   homework:/ödev ver/i,
   reports:/rapor/i
  };
  if(map[action])legacyTool(map[action]);
 }

 function teacherHomeShow(){
  teacherDashboardHide();
  if(!mode)return;document.getElementById('tpTeacherHome')?.classList.add('is-visible');
  document.body.classList.add('tp-home-active');document.documentElement.classList.remove('tp-home-starting');teacherDock();
  document.querySelector('[data-tp-home-nav]')?.classList.add('active');
 }
 function teacherHomeHide(){document.getElementById('tpTeacherHome')?.classList.remove('is-visible');document.body.classList.remove('tp-home-active');document.querySelector('[data-tp-home-nav]')?.classList.remove('active');}
 function teacherDestination(action){
  if(action==='panel'){teacherDashboardShow();return;}
  teacherHomeHide();teacherDashboardHide();teacherDock();
  if(action==='oral'){window.dmTeacherOral?.open?.();return;}
  const id=action==='study'?'tab-derscalis':action==='games'?'tab-aktiviteler':'tab-profile-menu';
  const launch=action==='study'?window.dersCalisTamEkranAc:window.aktivitelerTamEkranAc;
  if(typeof launch==='function')launch();else document.querySelector('#bottomNavMobile [data-ekran="'+id+'"]')?.click();

 }

 window.dmTeacherPortal={openLogin,openProfile,beforeGame,management};
 if(document.body.dataset.teacherReset==='1'){resetPage();return;}
 if(mode){document.body.classList.add('dm-teacher-portal');document.documentElement.classList.add('dm-teacher-portal');document.documentElement.classList.add('tp-home-starting');window.cikisYap=window.dmTeacherPortalExit;window.siniftaOyunModuAc=()=>{document.getElementById('ogretmenMenuModal')?.style.setProperty('display','none');window.aktivitelerTamEkranAc?.();};}
 let scheduled=false;const observe=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();if(mode){suppressPreviewPrompts();hideTeacherHeader();const n=document.getElementById('bottomNavMobile');n?.querySelectorAll('.bn-item').forEach(i=>{if((i.dataset.ekran==='tab-profil'||/^(profil|profilim)$/i.test((i.textContent||'').trim())))i.remove();});}});};new MutationObserver(observe).observe(document.body,{childList:true,subtree:true});decorate();wrapGames();
 document.addEventListener('dm:state',wrapGames);document.addEventListener('dm:login',wrapGames);if(mode)document.addEventListener('click',()=>{if(window.tpHomeInitialized){teacherHome();suppressPreviewPrompts();}}, {capture:false});
 // First paint must be the private teacher home even if the learner route fails.
 if(mode){
  const bootHome=()=>{try{teacherHome();if(!document.body.classList.contains('tp-dash-active'))teacherHomeShow();}catch(err){console.error('[Teacher home]',err);}};
  if(document.body)bootHome();else document.addEventListener('DOMContentLoaded',bootHome,{once:true});
 }
 let opened=false;const timer=setInterval(()=>{wrapGames();if(mode&&!opened&&document.body){opened=true;teacherHome();teacherDock();suppressPreviewPrompts();prepareTeacherAppearance();sessionStorage.removeItem('dm_tp_pending');}if(opened)clearInterval(timer);},500);setTimeout(()=>clearInterval(timer),30000);
 if(new URLSearchParams(location.search).get('ogretmenGiris')==='1'){window.dmFirstDiscovery?.openLogin?.();openLogin();}
})();
