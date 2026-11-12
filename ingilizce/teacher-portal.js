(()=>{'use strict';
 const endpoint='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',mode=!!window.dmTeacherPortalMode;
 function saveState(s){sessionStorage.setItem('dm_tp_session',JSON.stringify(s));window.dmTeacherDevice?.remember(s);}
 function rememberRoute(route){const s=state();if(s){s.route=route;saveState(s);}}
 const state=()=>{try{return JSON.parse(sessionStorage.getItem('dm_tp_session')||'null');}catch{return null;}};
 // Direct calls keep owner, participant and personal tokens explicit.
 const nativeFetch=window.fetch.bind(window);
 async function api(islem,data={},token){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{const response=await nativeFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({islem,...data,t:token??(mode?state()?.teacherToken:sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'')})});const d=await response.json();if(!response.ok||d.ok===false||d.status==='error'||d.hata)throw Error(d.mesaj||d.message||'İşlem tamamlanamadı.');return d;}
  catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. Verileri yenileyerek tekrar dene.');throw e;}finally{clearTimeout(timeout);}
 }

 function sheet(title,html){document.querySelector('.tp-shade')?.remove();const shade=document.createElement('div');shade.className='tp-shade';shade.innerHTML='<section class="tp-card" role="dialog" aria-modal="true" tabindex="-1"><button class="tp-close" aria-label="Kapat">×</button><h1></h1><form>'+html+'<p class="tp-error" role="status" aria-live="polite"></p></form></section>';shade.querySelector('h1').textContent=title;const before=document.activeElement;const close=()=>{shade.remove();before?.focus?.();};shade.querySelector('.tp-close').onclick=close;shade.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const items=[...shade.querySelectorAll('input,select,button,a[href]')].filter(x=>!x.disabled&&x.type!=='hidden'&&!x.closest('[hidden]')),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});document.body.append(shade);shade.querySelector('input,select,button').focus();return {shade,close,form:shade.querySelector('form'),error:m=>shade.querySelector('.tp-error').textContent=m};}
 const codeField=(name,label)=>'<label>'+label+'<input name="'+name+'" type="password" inputmode="numeric" pattern="[0-9]{6}|[0-9]{8}" minlength="6" maxlength="8" autocomplete="off" required></label>';
 function submit(v,fn,validate){v.form.onsubmit=async e=>{e.preventDefault();if(!v.form.reportValidity()||validate?.()===false)return;const buttons=[...v.form.querySelectorAll('button:not(:disabled)')];buttons.forEach(b=>b.disabled=true);v.error('');try{await fn(new FormData(v.form));}catch(e){v.error(e.message);}finally{buttons.forEach(b=>b.disabled=false);}};}
 function openLogin(){const v=sheet('Öğretmen Girişi','<p>Özel öğretmen platformuna erişmek için e-postana gönderilen 6 veya 8 haneli kodu yaz.</p>'+codeField('code','Öğretmen giriş kodun')+'<button class="tp-primary">Giriş Yap</button><button type="button" data-reset>Kodumu Unuttum</button><small>E-posta doğrulaması ve teacher hesabının erişim onayı gerekir.</small>');v.shade.querySelector('[data-reset]').onclick=resetRequest;submit(v,async f=>{const r=await api('teacherPortalLogin',{code:f.get('code')},'');const preview=await api('teacherPortalParticipant',{self:true},r.token);saveState({teacherToken:r.token,name:r.name,participant:preview,playAsSelf:true,route:'home'});location.assign('./?ogretmen=1');});}
 function resetRequest(){const v=sheet('Öğretmen Kodumu Unuttum','<label>Kişisel kullanıcı adın<input name="username" required maxlength="40" autocomplete="username"></label><label>Kayıtlı e-posta adresin<input name="email" required type="email" autocomplete="email"></label><button class="tp-primary">Yenileme bağlantısı gönder</button>');submit(v,async f=>{const r=await api('teacherPortalResetRequest',Object.fromEntries(f),'');v.error(r.mesaj);});}
 async function resetPage(){const token=new URLSearchParams(location.hash.slice(1)).get('token');history.replaceState(null,'',location.pathname);const v=sheet('Yeni Öğretmen Giriş Kodu',codeField('code','Yeni 6 veya 8 haneli kod')+codeField('confirm','Yeni kodu tekrar yaz')+'<button class="tp-primary">Kodumu Yenile</button>');v.shade.querySelector('.tp-close').onclick=()=>location.assign('./?ogretmenGiris=1');submit(v,async f=>{if(f.get('code')!==f.get('confirm'))throw Error('Kodlar eşleşmiyor.');const r=await api('teacherPortalReset',{resetToken:token,code:f.get('code')},'');v.form.replaceChildren();const message=document.createElement('p');message.textContent=r.mesaj;const link=document.createElement('a');link.href='./?ogretmenGiris=1';link.textContent='Öğretmen girişine dön';v.form.append(message,link);});}
 async function management(){const v=sheet('👥 Öğretmen Yönetimi','<p>Başvurular yükleniyor…</p>');try{const r=await api('teacherPortalList');v.form.replaceChildren();const intro=document.createElement('section');intro.className='tp-grant';const title=document.createElement('h2');title.textContent='Yeni öğretmen ekle';const info=document.createElement('p');info.textContent='Önce öğretmenin kendi kişisel hesabını açması ve e-postasını doğrulaması gerekir. Öğretmenim seçeneğini seçenlerin erişim başvuruları burada listelenir. Kayıt sırasında özel giriş kodu hazırlanır. Sen onay verdiğinde öğretmene “Öğretmen onayınız tamamlandı” e-postası gönderilir. E-posta doğrulaması tamamlanana kadar özel öğretmen yetkileri kapalı kalır.';const form=document.createElement('div');form.className='tp-admin-create';form.innerHTML='<label>Kullanıcı adı<input name="username" maxlength="20" autocomplete="off"></label><label>Ad soyad<input name="fullName" maxlength="80"></label><label>E-posta<input name="email" type="email" autocomplete="off"></label><label>Başlangıç şifresi<input name="password" type="password" minlength="6" maxlength="64"></label><button type="button" class="tp-primary">Kişisel hesap ve başvuru oluştur</button><p role="status"></p>';form.querySelector('button').onclick=async()=>{const button=form.querySelector('button'),data=Object.fromEntries([...form.querySelectorAll('input')].map(el=>[el.name,el.value]));button.disabled=true;try{const result=await api('teacherPortalAdminCreate',data);form.querySelector('[role="status"]').textContent=result.mesaj+' Öğretmen normal giriş ekranından e-postasını doğrulayıp kişisel hesabını kullanabilir.';form.querySelector('[name="password"]').value='';}catch(e){form.querySelector('[role="status"]').textContent=e.message;}finally{button.disabled=false;}};intro.append(form);const link=document.createElement('a');link.href='./';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Kişisel hesap açma ekranını aç';const copy=document.createElement('button');copy.type='button';copy.textContent='Kayıt bağlantısını kopyala';copy.onclick=()=>{const url=new URL('./',location.href).href;navigator.clipboard?.writeText(url).then(()=>{copy.textContent='Bağlantı kopyalandı';}).catch(()=>v.error('Bağlantı kopyalanamadı.'));};intro.append(title,info,link,copy);v.form.append(intro);if(!r.items.length){const empty=document.createElement('p');empty.textContent='Henüz başvuru yok.';v.form.append(empty);}for(const row of r.items){const s=row.students||{},box=document.createElement('article');box.className='tp-grant';const h=document.createElement('h2');h.textContent=s.full_name||s.username;const p=document.createElement('p');p.textContent=s.username+' · '+s.email+'\nE-posta: '+(s.email_verified_at?'Doğrulandı':'Bekliyor')+' · Erişim: '+({pending:'Bekliyor',approved:'Onaylı',rejected:'Reddedildi',revoked:'Kaldırıldı'}[row.state]||row.state);const school=document.createElement('p');school.textContent='Okul bilgileri · '+(s.school||'Eklenmemiş');
 const phone=document.createElement('p');phone.textContent='Kayıtlı telefon · '+(s.phone||'Eklenmemiş');
 box.append(h,p,school,phone);if(row.state==='pending'&&row.codeReady){const code=document.createElement('p');code.textContent='🔐 Kişisel öğretmen kodu kayıt sırasında gösterildi; yönetici onayı bekliyor.';box.append(code);}
 if(row.state==='approved'){
  const status=document.createElement('p');
  status.textContent=row.code_sent_at?'🔒 Giriş kodu e-postaya gönderim kuyruğuna alındı.':row.codeReady?'🔐 Giriş kodu kayıt sırasında öğretmene gösterildi.':'✉️ Kod henüz oluşturulmadı; öğretmen e-postasını doğrulamalı.';
  box.append(status);
  const issue=document.createElement('button');issue.type='button';issue.textContent=row.codeReady||row.code_sent_at?'Yeni kod oluştur ve e-postala':'Kodu oluştur ve e-postala';
  issue.disabled=!s.email_verified_at;
  issue.onclick=async()=>{if((row.codeReady||row.code_sent_at)&&!confirm('Yeni kod, eski kodu ve açık öğretmen oturumlarını geçersiz kılar. Devam edilsin mi?'))return;
   issue.disabled=true;try{const result=await api('teacherPortalIssueCode',{id:row.id});const note=document.createElement('p');note.textContent='Yeni özel giriş kodu: '+result.issuedCode+' · Öğretmenin e-postasına gönderim kuyruğuna alındı. Bu kod yalnızca şimdi gösterilir.';box.append(note);issue.remove();}catch(e){v.error(e.message);issue.disabled=false;}};
  box.append(issue);
 }
 for(const [decision,label]of [['approved','Onayla'],['rejected','Reddet'],['revoked','Erişimi Kaldır']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=row.state===decision;button.onclick=async()=>{button.disabled=true;try{const result=await api('teacherPortalDecide',{id:row.id,decision});if(result.issuedCode){v.error('Özel giriş kodu: '+result.issuedCode+' · E-posta kuyruğuna alındı. Bu kod yalnızca şimdi gösterilir.');button.textContent='Onaylandı';button.disabled=true;}else management();}catch(e){v.error(e.message);button.disabled=false;}};box.append(button);}v.form.append(box);}}catch(e){v.error(e.message);}}
 function openProfile(){const v=sheet('Öğretmen Profilim','<p>Öğretmen alanında enerji harcanmaz ve ödül kazanılmaz. Yalnızca sıralama kaydedilir.</p><p>✅ Kişisel öğretmen hesabının e-posta adresi doğrulanmış. Bu doğrulama, özel kodla giriş için zaten zorunludur.</p><p data-name></p><button type="button" data-game-player>🎮 Oyunlarda öğretmen / öğrenci seç</button><button type="button" data-appearance>🎨 Kişisel Karakterimi Düzenle</button><button type="button" data-change class="tp-primary">Giriş Kodumu Değiştir</button><button type="button" data-personal>Kişisel Hesabıma Dön</button><button type="button" data-exit>Öğretmen Alanından Çık</button>');v.shade.querySelector('[data-name]').textContent=state()?.name||'';v.shade.querySelector('[data-game-player]').onclick=()=>{v.close();const s=state();s.playAsSelf=!s.playAsSelf;saveState(s);window.yoToast?.(s.playAsSelf?'Oyunlar öğretmen olarak açılacak.':'Oyun açılırken öğrenci veya misafir seçebilirsin.');};v.shade.querySelector('[data-appearance]').onclick=()=>{v.close();window.dmCharacterBuilder?.open?.();};v.shade.querySelector('[data-personal]').onclick=window.dmTeacherPortalPersonal;v.shade.querySelector('[data-exit]').onclick=async()=>{const s=state();try{await api('cikis',{},s?.teacherToken);await api('cikis',{},s?.participant?.token);}catch{}window.dmTeacherPortalExit();};v.shade.querySelector('[data-change]').onclick=()=>{const c=sheet('Giriş Kodumu Değiştir',codeField('currentCode','Mevcut giriş kodun')+codeField('code','Yeni 6 veya 8 haneli kod')+codeField('confirm','Yeni kodu tekrar yaz')+'<button class="tp-primary">Kodu Değiştir</button>');submit(c,async f=>{if(f.get('code')!==f.get('confirm'))throw Error('Kodlar eşleşmiyor.');await api('teacherPortalChangeCode',Object.fromEntries(f));window.dmTeacherPortalExit();});};}
 let choosing=null,replay=false;
 function chooseParticipant(){if(choosing)return choosing;choosing=new Promise(resolve=>{const v=sheet('Bu oyunu kim oynayacak?','<p>Yalnızca oyun puanı ve sıralama kaydedilir. Enerji harcanmaz; XP ve altın kazanılmaz.</p><label>Bağlı öğrencin<select name="studentId"><option value="">Öğrenci seç</option></select></label><p>veya üye olmayan öğrenci için:</p><label>Sıralamada görünecek ad<input name="guestName" minlength="3" maxlength="32" autocomplete="off"></label><button class="tp-primary">Bu öğrenciyle devam et</button>');const guest=v.form.elements.guestName;guest.oninput=()=>{const short=guest.value.trim().length>0&&[...guest.value.trim()].length<3;guest.setCustomValidity(short?'En az 3 harf girin.':'');v.error(short?'En az 3 harf girin.':'');};v.form.elements.studentId.onchange=()=>{if(v.form.elements.studentId.value){guest.value='';guest.setCustomValidity('');v.error('');}};const finish=value=>{v.close();choosing=null;resolve(value);};v.shade.querySelector('.tp-close').onclick=()=>finish(null);v.shade.addEventListener('keydown',e=>{if(e.key==='Escape')finish(null);});api('teacherPortalStudents').then(r=>{for(const s of r.items){const o=document.createElement('option');o.value=s.id;o.textContent=(s.full_name?s.full_name+' · ':'')+s.username+(s.class_no?' · '+s.class_no+'. sınıf':'');v.form.elements.studentId.append(o);}}).catch(e=>v.error(e.message));submit(v,async f=>{const studentId=f.get('studentId'),guestName=String(f.get('guestName')||'').trim();if(!!studentId===!!guestName)throw Error('Bir öğrenci seç veya yalnızca misafir adını yaz.');if(guestName&&[...guestName].length<3)throw Error('En az 3 harf girin.');const r=await api('teacherPortalParticipant',{studentId,guestName});finish(r);});});return choosing;}
 async function beforeGame(target,args=[]){
  if(!mode||replay||window.dmGameReopeningSetup)return true;
  const initial=state();if(!initial?.teacherToken)return false;
  let participant;try{participant=initial.playAsSelf===false?await chooseParticipant():await api('teacherPortalParticipant',{self:true},initial.teacherToken);}catch(e){window.yoToast?.(e.message||'Öğretmen oyun oturumu açılamadı. Yeniden dene.');return false;}if(!participant)return false;
  const s=state(),changed=s.participant?.name!==participant.name;s.participant=participant;saveState(s);
  localStorage.setItem('ing_token',participant.token);localStorage.setItem('ing_aktifOgrenci',participant.name);
  // The legacy games use a global lexical binding, not the window property.
  try{aktifOgrenciAdi=participant.name;}catch{}window.aktifOgrenciAdi=participant.name;
  try{siniftaOynananOgrenci='';}catch{}window.dmGuestMode=false;window.dmTeacherToolsActive=false;window.dmClassroomOnlineOwner=null;
  try{if(typeof globalDataCache!=='undefined'&&Array.isArray(globalDataCache)&&!globalDataCache.some(x=>x.ogrenci===participant.name))globalDataCache.push({ogrenci:participant.name,Sinif:1,SinifSube:'',genelPuan:0});}catch{}
  window.yoHazirla?.(participant.name);
  if(changed)document.dispatchEvent(new CustomEvent('dm:login',{detail:{teacherParticipantChanged:true}}));
  teacherDestination('games');return true;
 }

 const paths={'mola':['dmMola','open'],'topic':['dmTopicGames','openTopic'],'meteor':['dmMeteor','open'],'wheel':['dmWordWheel','open'],'cards':['dmPapiCards','open']};
 async function runPending(){const raw=sessionStorage.getItem('dm_tp_pending');if(!raw)return;sessionStorage.removeItem('dm_tp_pending');try{const next=JSON.parse(raw),path=paths[next.target];await window.dmLazyGames?.ready();wrapGames();replay=true;const object=path?window[path[0]]:window,fn=path?object?.[path[1]]:object[next.target];if(typeof fn!=='function')throw Error('Oyun henüz yüklenemedi. Yeniden aç.');await fn.apply(object,next.args||[]);}catch(e){window.yoToast?.(e.message);}finally{replay=false;}}
 const gameFunctions=['kelimeGoluAc','kelimeYarismasiAc','jpOyunAc','boslukOyunAc','hafizaOyunAc','yagmurOyunAc','asmacaOyunAc','kelimebulOyunAc','esOyunAc','trenOyunAc','dikteAc','cumleAc','harfBahcesiAc','ralliOyunAc','dmArenaAc','dmMatchAc','dmInviteAc'];
 function wrapGames(){if(!mode)return;for(const name of gameFunctions){const old=window[name];if(typeof old!=='function'||old.__tp)continue;const fn=async function(...args){if(await beforeGame(name,args))return old.apply(this,args);};Object.assign(fn,old);fn.__tp=true;window[name]=fn;}}
 const applicationTitle='Öğretmen kodunla sınıfına özel paneli aç!';
 const applicationBenefits=[
  ['board','Akıllı tahtada birlikte oynayın','Sınıfına ve ünitesine uygun oyunları ve dersleri aç.'],
  ['class','Sınıfını tek yerden yönet','Öğrencilerini ekle, ödev ver ve ilerlemelerini izle.'],
  ['report','Kimin neye ihtiyacı var, gör','Raporlarla gelişimi ve tekrar gerektiren konuları gör.']
 ];
 const pendingApplication='Okul bilgilerinle öğretmen başvurun alındı. Yönetici onayından sonra sana “Öğretmen onayınız tamamlandı” e-postası gönderilecek. Öğretmen kodunu kullanabilmek için kişisel e-posta adresini mutlaka doğrula.';
 const locationSearchKey=value=>value.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
 function locationPicker(form,name,label,placeholder,onSelect){
  // Native select avoids the custom menu being clipped by the scrolling application dialog.
  const input=form.elements[name];
  const initial=String(input.value||'');
  const select=document.createElement('select');
  select.name=name;select.required=true;select.className='tp-location-native';
  select.setAttribute('aria-label',label);
  const wrapper=document.createElement('label');
  wrapper.className='tp-location';
  wrapper.append(document.createTextNode(label),select);
  input.closest('label').replaceWith(wrapper);
  const update=(items,selected)=>{
   const current=selected===undefined?select.value:String(selected||'');
   const options=[...new Set(Array.isArray(items)?items:[])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr'));
   select.replaceChildren(new Option(placeholder,''));
   for(const entry of options)select.add(new Option(entry,entry));
   select.value=options.find(item=>locationSearchKey(item)===locationSearchKey(current))||'';
   select.disabled=!options.length;
  };
  select.addEventListener('change',()=>onSelect?.(select.value));
  return {setChoices:update,focus:()=>select.focus(),value:()=>select.value,initial};
 }
 function renderApplication(v,r,token){
  const card=v.form.closest('.tp-card'),heading=card.querySelector('h1');
  const login='<button type="button" data-panel-login>Kodum Var, Giriş Yap</button>';
  if(r.state==='none'||r.state==='pending'&&r.offer){
   card.classList.add('tp-application');
   heading.textContent=applicationTitle;
   heading.id='tp-application-title';
   card.setAttribute('aria-labelledby',heading.id);
   heading.insertAdjacentHTML('beforebegin','<div class="tp-application-hero"><div class="tp-application-copy"><span class="tp-application-badge"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="m12 2 12 6-12 6L0 8l12-6ZM5 12l7 3.5 7-3.5v5l-7 4-7-4v-5Zm17-1 2-1v8h-2v-7Z"/></svg> Öğretmenlere Özel</span><span class="tp-application-free">Ücretsiz</span><p>Öğretmen kodunu ücretsiz al, Diji Medu’yu sınıfında kullanmaya başla.</p></div><img src="school-assets/teacher-invite-papi-key.webp" alt="" width="313" height="259"></div>');
   const copy=card.querySelector('.tp-application-copy');
   copy.insertBefore(heading,copy.querySelector('p'));
   v.form.innerHTML=`
    <div class="tp-application-benefits">${applicationBenefits.map(([icon,title,description])=>`
     <div class="tp-application-benefit tp-benefit-${icon}"><img src="school-assets/teacher-invite-${icon}.webp" alt=""><div><strong>${title}</strong><p>${description}</p></div></div>
    `).join('')}</div>
    <div class="tp-application-note"><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10v2"/></svg><p>Öğretmen olduğunu doğrulayabilmemiz için okul bilgilerini paylaş. Başvurun onaylanıp e-postan doğrulandığında kodun sana gönderilir.</p></div>
    <div class="tp-application-location">
     <label>İl<input name="city" maxlength="40" required placeholder="İl seç"></label>
     <label>İlçe<input name="district" maxlength="60" required placeholder="İlçe seç"></label>
    </div>
    <small class="tp-application-hint">Listeden seçebilir veya yazarak arayabilirsin.</small>
    <label>Okul adı<input name="school" maxlength="120" required placeholder="Okulunun adını yaz"></label>
    ${!r.hasPhone?'<label>Telefon numarası<input name="phone" type="tel" maxlength="20" autocomplete="tel" required placeholder="05XX XXX XX XX"></label>':''}
    <button class="tp-primary"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="8" r="5"/><path d="m12.5 11.5-9 9m3-3 2 2m-4 0 2 2"/></svg> Öğretmen Kodumu İste</button>
    <div class="tp-application-actions">${login}<button type="button" data-later>Daha Sonra</button></div>
    <p class="tp-error" role="status" aria-live="polite"></p>`;
   for(const key of ['city','district','school'])v.form.elements[key].value=r.school?.[key]||'';
   const locations=window.dmTeacherSchoolLocations;
   let city,district;
   if(locations){
    city=locationPicker(v.form,'city','İl','İl seç',value=>district.setChoices(locations[value]));
    district=locationPicker(v.form,'district','İlçe','İlçe seç');
    city.setChoices(Object.keys(locations),r.school?.city);
    district.setChoices(locations[v.form.elements.city.value]||[],r.school?.district);
   }else{
    v.form.querySelector('.tp-application-hint').textContent='İlini ve ilçeni yaz.';
   }
   v.form.querySelector('[data-later]').onclick=v.close;
   submit(v,async form=>{
    if(localStorage.getItem('ing_token')!==token)throw Error('Hesap değişti. Lütfen yeniden giriş yap.');
    await api('teacherPortalApply',{...Object.fromEntries(form),confirm:true},token);
    if(v.shade.isConnected){
     renderApplication(v,{state:'pending',offer:false},token);
     v.form.querySelector('[data-panel-login]').focus();
    }
   },()=>{
    if(city&&!v.form.elements.city.value){v.error('Lütfen ilini seç.');city.focus();return false;}
    if(district&&!v.form.elements.district.value){v.error('Lütfen ilçeni seç.');district.focus();return false;}
   });
  }else{
   if(card.classList.contains('tp-application')){
    const hero=card.querySelector('.tp-application-hero');
    hero.replaceWith(heading);
    card.classList.remove('tp-application');
   }
   heading.textContent='Öğretmen Paneli';
   v.form.innerHTML='<p data-panel-status></p>'+login+'<p class="tp-error" role="status" aria-live="polite"></p>';
   v.form.querySelector('[data-panel-status]').textContent=({pending:pendingApplication,approved:r.codeSent?'Özel panel giriş kodun e-postana gönderilmek üzere sıraya alındı.':'Başvurun onaylandı. E-posta adresini doğruladığında kodun gönderilecek.',rejected:'Başvurun reddedildi. Destek ekibiyle görüşebilirsin.',revoked:'Öğretmen paneli erişimin kaldırıldı.'})[r.state]||'Başvuru durumu alınamadı.';
  }
  v.form.querySelector('[data-panel-login]').onclick=openLogin;
 }
 function statusButton(){
  if(mode)return;
  const menu=document.getElementById('rtProfileBackdrop');
  const button=menu?.querySelector('[data-profile=teacher]');
  if(!button||button.dataset.tpAccess||typeof aktifOgrenciAdi!=='undefined'&&aktifOgrenciAdi==='teacher')return;
  button.dataset.tpAccess='1';
  button.addEventListener('click',async e=>{
   e.preventDefault();e.stopPropagation();
   const token=localStorage.getItem('ing_token')||'';
   const v=sheet('Öğretmen Paneli','<p>Durum yükleniyor…</p>');
   try{const r=await api('teacherPortalStatus',{},token);if(v.shade.isConnected)renderApplication(v,r,token);}catch(e){v.error(e.message);}
  },true);
 }

 // Check once per personal session and wait for character selection and other dialogs.
 let noticeToken='',noticeResult=null;
 function teacherApplicationNotice(){
  if(mode||window.dmGuestMode||sessionStorage.getItem('ing_ogr_token'))return;
  const token=localStorage.getItem('ing_token');
  const current=typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
  if(!token||!current||current==='teacher'||noticeToken===token&&!noticeResult?.offer)return;
  const hasCharacter=typeof yo!=='undefined'&&!!yo?.karakter?.cins;
  if(!hasCharacter&&!sessionStorage.getItem('dm_teacher_notice_character_ready'))return;
  const isVisible=el=>!!el&&el.isConnected&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
  if(document.querySelector('.tp-shade')||[...document.querySelectorAll('#duyuruOverlay,.dm-announcement-overlay,.dm-urgent-announcement,[data-urgent-announcement],.dm-first-character,[role="dialog"][aria-modal="true"]')].some(isVisible))return;
  const shownKey='dm_teacher_application_offer_v2:'+current.toLocaleLowerCase('tr-TR');
  if(sessionStorage.getItem(shownKey))return;
  if(noticeToken!==token){
   noticeToken=token;
   noticeResult=null;
   api('teacherPortalStatus',{offerOnly:true},token).then(r=>{if(noticeToken===token){noticeResult=r;teacherApplicationNotice();}}).catch(()=>{});
   return;
  }
  if(!noticeResult?.offer)return;
  sessionStorage.setItem(shownKey,'1');
  sessionStorage.removeItem('dm_teacher_notice_character_ready');
  renderApplication(sheet(applicationTitle,''),noticeResult,token);
 }
 if(!mode){
  const characterReady=()=>{sessionStorage.setItem('dm_teacher_notice_character_ready','1');setTimeout(teacherApplicationNotice,700);};
  window.addEventListener('dm:first-character-chosen',characterReady);
  window.addEventListener('dm:first-character-skipped',characterReady);
  document.addEventListener('dm:login',teacherApplicationNotice);
  setInterval(teacherApplicationNotice,1500);
 }

 // Put approval management inside the existing top Teachers list, instead of a separate dashboard tile.
 function attachTeacherApprovals(){
  if(!mode)return;
  const panel=document.getElementById('tpDashboard');
  if(!panel?.classList.contains('is-visible'))return;
  const candidates=[...document.querySelectorAll('[role="dialog"],.cog-perde,.rubric-modal,.dm-member-overlay')];
  const teachers=candidates.find(el=>el.getClientRects().length&&/bağımsız öğrenciler/i.test(el.textContent||'')&&/öğretmenler/i.test(el.textContent||''));
  if(!teachers||teachers.querySelector('[data-tp-unified-approvals]'))return;
  const button=document.createElement('button');
  button.type='button';button.dataset.tpUnifiedApprovals='1';button.className='tp-primary';
  button.textContent='🔐 Erişim başvurularını ve özel panel kodlarını yönet';
  button.style.cssText='display:block;width:100%;margin:12px 0;padding:12px';
  button.onclick=()=>management();
  const head=teachers.querySelector('h1,h2,h3');
  if(head)head.insertAdjacentElement('afterend',button);else teachers.prepend(button);
 }
 if(mode){const observe=new MutationObserver(()=>{requestAnimationFrame(attachTeacherApprovals);});if(document.body)observe.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});else document.addEventListener('DOMContentLoaded',()=>observe.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']}),{once:true});}
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
    badge.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();window.dmTeacherPortalPersonal?.();};
  }
 }
 function teacherDock(){
  if(!mode)return;
  const native=document.getElementById('bottomNavMobile');
  if(native)native.style.setProperty('display','none','important');
  let dock=document.getElementById('tpTeacherDock');
  if(!dock){
   dock=document.createElement('nav');dock.id='tpTeacherDock';dock.setAttribute('aria-label','Öğretmen menüsü');
   dock.innerHTML='<button type="button" data-route="home"><span class="dm-teacher-icon dm-teacher-icon--home" aria-hidden="true"></span>Ana Sayfa</button><button type="button" data-route="games"><span class="dm-teacher-icon dm-teacher-icon--games" aria-hidden="true"></span>Oyunlar</button><button type="button" data-route="study"><span class="dm-teacher-icon dm-teacher-icon--book" aria-hidden="true"></span>Konu Anlat</button><button type="button" data-route="league"><span aria-hidden="true">🏆</span>Sınıfım</button><button type="button" data-route="panel"><span class="dm-teacher-icon dm-teacher-icon--cap" aria-hidden="true"></span>Öğretmen Paneli</button>';
   document.body.append(dock);
   dock.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(!b)return;e.preventDefault();e.stopPropagation();const route=b.dataset.route;if(route==='league'){if(window.dmTeacherLeagueOpen)window.dmTeacherLeagueOpen();else window.yoToast?.('Sınıfım yüklenemedi. Sayfayı yenile.');return;}window.dmTeacherLeagueClose?.();if(route==='home')teacherHomeShow();else if(route==='panel')teacherDashboardShow();else teacherDestination(route);});
  }
  const route=document.body.classList.contains('tp-league-active')?'league':document.body.classList.contains('tp-dash-active')?'panel':document.body.classList.contains('tp-home-active')?'home':state()?.route;
  dock.querySelectorAll('[data-route]').forEach(b=>{
   const selected=b.dataset.route===route;
   b.classList.toggle('active',selected);
   if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
 }
 window.dmTeacherDockSync=teacherDock;
 function teacherHome(){
  if(!mode)return;
  let home=document.getElementById('tpTeacherHome');
  if(!home){
   home=document.createElement('main');home.id='tpTeacherHome';home.setAttribute('aria-label','Öğretmen Ana Sayfa');
   home.innerHTML='<div class="tp-home-inner"><section class="tp-home-hero"><div><h1>Merhaba Öğretmenim! 👋</h1><p>Diji Medu ile sınıfınızda öğrenmeyi daha eğlenceli ve etkili hale getirin.</p></div><img src="discovery-assets/papi-merhaba.webp" alt="Papi öğretmen maskotu"></section><h2>Bugün ne yapmak istersiniz?</h2><p class="tp-home-sub">Aşağıdaki seçeneklerden birini seçerek hemen başlayın.</p><div class="tp-home-actions"><button data-tp-action="study" class="tp-home-card tp-mint"><span class="tp-home-art">📖💡</span><strong>Yeni bir konu anlat</strong><small>Konuyu anlat, örnekleri paylaş ve alıştırmalarla pekiştir.</small><span class="tp-home-arrow">›</span></button><button data-tp-action="games" class="tp-home-card tp-lilac"><span class="tp-home-art">🎮✨</span><strong>Öğrencilerle oyun oyna</strong><small>Konu oyunlarıyla öğrenmeyi daha eğlenceli hale getir.</small><span class="tp-home-arrow">›</span></button><button data-tp-action="oral" class="tp-home-card tp-cream"><span class="tp-home-art">🎙️💬</span><strong>Sözlü yap</strong><small>Öğrencilerine sözlü sorular sor ve anında değerlendir.</small><span class="tp-home-arrow">›</span></button><button data-tp-action="panel" class="tp-home-card tp-blue"><span class="tp-home-art">📊⚙️</span><strong>Öğretmen paneline git</strong><small>Sınıfını yönet, ilerlemeleri gör ve raporları incele.</small><span class="tp-home-arrow">›</span></button><button data-tp-action="class" class="tp-home-card tp-mint"><span class="tp-home-art">🏫👩‍🎓</span><strong>Sınıf Oluştur</strong><small>Sınıfını kur, öğrencilerini kolayca ekle.</small><span class="tp-home-arrow">›</span></button></div><h2 class="tp-quick-title">⚡ Hızlı başlangıç</h2><div class="tp-home-shortcuts"><button data-tp-action="panel">👥 <span><strong>Öğrencilerini yönet</strong><small>Öğrenci ekle, listeni düzenle.</small></span> ›</button><button data-tp-action="study">📋 <span><strong>Hazır içerikleri keşfet</strong><small>Sınıfına uygun içerikleri bul.</small></span> ›</button></div></div>';
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
  if(!window.tpHomeInitialized){
   // Game and study routes depend on scripts loaded later. Start on a stable page.
   const route=state()?.route||'home';
   try{if(route==='panel')teacherDashboardShow();else teacherHomeShow();window.tpHomeInitialized=true;}
   catch(error){window.tpHomeInitialized=false;console.error('[Teacher route]',error);teacherHomeShow();}
  }
 }

 function teacherProfileShow(){
  teacherHomeHide();teacherDashboardHide();
  openProfile();
 }
 function paginateDashboard(){
  const panel=document.getElementById('tpDashboard'),tiles=panel?.querySelector('.tp-real-tools');if(!tiles)return;
  const buttons=[...tiles.children].filter(x=>x.tagName==='BUTTON'),columns=window.innerWidth>900?3:2,available=tiles.clientHeight,size=available>0?Math.max(columns,Math.min(window.innerWidth>900?12:10,Math.floor((available+7)/58)*columns)):(window.innerWidth>900?12:10),pages=Math.max(1,Math.ceil(buttons.length/size)),page=Math.min(Number(panel.dataset.toolPage)||0,pages-1);
  panel.dataset.toolPage=page;buttons.forEach((b,i)=>b.hidden=Math.floor(i/size)!==page);
  tiles.style.setProperty('--tp-tool-rows',Math.ceil(Math.min(size,buttons.length-page*size)/(window.innerWidth>900?3:2)));
  let pager=panel.querySelector('.tp-tools-pager');if(!pager){pager=document.createElement('nav');pager.className='tp-tools-pager';pager.setAttribute('aria-label','Öğretmen araç sayfaları');tiles.after(pager);}
  pager.replaceChildren();pager.hidden=pages===1;
  for(const [delta,label] of [[-1,'‹ Önceki'],[1,'Sonraki ›']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=page+delta<0||page+delta>=pages;b.onclick=()=>{panel.dataset.toolPage=page+delta;paginateDashboard();};pager.append(b);if(delta===-1){const s=document.createElement('span');s.textContent=(page+1)+' / '+pages;pager.append(s);}}
 }
 window.addEventListener('resize',paginateDashboard);
 function teacherDashboardShow(){
  window.dmTeacherToolsActive=true;
  if(!mode)return;
  rememberRoute('panel');teacherHomeHide();
  let panel=document.getElementById('tpDashboard');
  if(!panel){
   panel=document.createElement('main');panel.id='tpDashboard';panel.setAttribute('aria-label','Öğretmen Paneli');
   panel.innerHTML='<div class="tp-dash-wrap"><header class="tp-dash-hero"><span class="tp-teacher-pair"><img src="discovery-assets/ogretmen.webp" alt="Kadın öğretmen"><span class="tp-teacher-male" role="img" aria-label="Erkek öğretmen">👨‍🏫</span></span><div><h1>Öğretmen Paneli</h1><p>Sınıflarını yönet, etkinlik oluştur ve öğrenci gelişimini takip et.</p></div><div class="tp-dash-header-actions"><button type="button" data-dash="sync">🔄 Verileri yenile</button><button type="button" data-dash="home">⌂ Ana Sayfa</button></div></header><section class="tp-dash-identity" aria-label="Öğretmen hesabı ve sınıf kodu"><p role="status" class="tp-dash-status">Öğretmen bilgileri yükleniyor…</p><div data-teacher-identity></div></section><section class="tp-dash-metrics"><div>👥 <b data-dash-students>—</b><small>Öğrenci</small></div><div>🏫 <b data-dash-classes>—</b><small>Sınıf</small></div><div>🎮 <b>Oyunlar</b><small>Sınıf etkinlikleri</small></div><div>📋 <b>Ödevler</b><small>Öğrenci çalışmaları</small></div></section><div class="tp-dash-layout"><nav class="tp-dash-menu" aria-label="Öğretmen araçları"><button data-dash="performance">🏫 Ders İçi Performans</button><button data-dash="individual">📊 Öğrenci Bireysel Raporları</button><button data-dash="weak">🎯 Sınıfın Zayıf Noktaları</button><button data-dash="parent">🗓️ Haftalık Veli Özetleri</button><button data-dash="messages">💬 Öğrenci Mesajları</button><button data-dash="announcements">📢 Duyuru Oluştur</button><button data-dash="rubric">📋 Özel Ders Rubrik Değerlendirme</button><button data-dash="studentDetails">🔑 Öğrenci Şifresi Sıfırla</button><button data-dash="code">🔑 Giriş Kodunu Değiştir</button><button data-dash="switchAccount">⇄ Hesap Değiştir</button><button data-dash="settings">⚙️ Ayarlar</button><button data-dash="logout" class="tp-dash-logout">🚪 Çıkış Yap</button></nav><section class="tp-dash-main"><h2>Bugün ne yapmak istersiniz?</h2><p>Öğretmen araçlarına tek dokunuşla ulaşın.</p><div class="tp-dash-tiles tp-real-tools"><button type="button" data-dash="homework"><span aria-hidden="true">📝</span><strong>Ödev Ver</strong><small>Sınıf ve şube ödevleri</small></button><button type="button" data-dash="rubric"><span aria-hidden="true">📊</span><strong>Rubrik Paneli</strong><small>Öğrenci değerlendirmeleri</small></button><button type="button" data-dash="performance"><span aria-hidden="true">🏫</span><strong>Ders İçi Performans</strong><small>Sınıf puanları ve katılım</small></button><button type="button" data-dash="announcements"><span aria-hidden="true">📣</span><strong>Sınıfına Duyuru Yap</strong><small>Yalnızca kendi sınıfına ve öğrencilerine</small></button><button type="button" data-dash="messages"><span aria-hidden="true">💬</span><strong>Öğrenci Sohbetleri</strong><small>Öğrenci mesajlarını yanıtla</small></button><button type="button" data-dash="reports"><span aria-hidden="true">📊</span><strong>Raporlar</strong><small>Performans, eksikler, veli ve sınav sonuçları</small></button><button type="button" data-dash="weak"><span aria-hidden="true">🎯</span><strong>Sınıfın Zayıf Noktaları</strong><small>Sınıfın gelişim alanları</small></button><button type="button" data-dash="parent"><span aria-hidden="true">👨‍👩‍👧</span><strong>Haftalık Veli Özetleri</strong><small>Haftalık öğrenci raporları</small></button><button type="button" data-dash="studentDetails"><span aria-hidden="true">🔑</span><strong>Öğrenci Şifresi Sıfırla</strong><small>Öğrenci hesabı yönetimi</small></button><button type="button" data-dash="exams"><span aria-hidden="true">📑</span><strong>Seviye Sınavı Sonuçları</strong><small>Seviye sınavı kayıtları</small></button><button type="button" data-dash="oral"><span aria-hidden="true">🎤</span><strong>Sözlü Yap</strong><small>Kelime sözlü uygulaması</small></button></div></section></div></div>';
   panel.querySelectorAll('.tp-dash-menu [data-dash]').forEach(b=>{if(['performance','individual','weak','parent','messages','announcements','rubric'].includes(b.dataset.dash))b.remove();});
   document.body.append(panel);
   panel.addEventListener('click',e=>{const b=e.target.closest('[data-dash]');if(b)teacherDashboardAction(b.dataset.dash);});
   // Existing admin student-management controls use the same class-creation workspace.
   panel.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button||button.closest('[data-dash]'))return;
    const label=String(button.textContent||'').trim().toLocaleLowerCase('tr-TR');
    if(/öğrenci hesaplarını yönet|öğrenci hesabı ekle/.test(label)){
     e.preventDefault();e.stopPropagation();openBulkStudents();
    }
   },true);
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
  document.documentElement.classList.remove('tp-home-starting');document.getElementById('tpTeacherEmergency')?.remove();document.body.classList.remove('tp-legacy-child-open');panel.classList.add('is-visible');document.body.classList.add('tp-dash-active');observeTeacherChildren();teacherDock();void prepareTeacherTools().catch(showTeacherToolError);
  document.querySelector('[data-tp-home-nav]')?.classList.remove('active');
  document.querySelector('#bottomNavMobile [data-tp-panel-nav]')?.classList.add('active');
 }
 function teacherDashboardHide(){window.dmTeacherToolsActive=false;document.body.classList.remove('tp-legacy-child-open');document.getElementById('ogretmenMenuModal')?.classList.remove('dm-teacher-open');document.body.classList.remove('tp-legacy-inline');document.getElementById('ogretmenMenuModal')?.style.setProperty('display','none');document.getElementById('tpDashboard')?.classList.remove('is-visible');document.body.classList.remove('tp-dash-active');}
 function openBulkStudents(){
  const row=(n)=>'<div class="tp-pupil-row" data-pupil-row><span class="tp-pupil-num">'+n+'</span><label>Kullanıcı adı<input name="pupil_user" autocomplete="off" maxlength="20" placeholder="ogrenci'+String(n).padStart(2,'0')+'"></label><label>Başlangıç şifresi<input name="pupil_pass" type="password" autocomplete="new-password" minlength="6" maxlength="64" placeholder="En az 6 karakter"></label><button type="button" class="tp-pupil-remove" aria-label="Öğrenciyi kaldır">×</button></div>';
  const v=sheet('🏫 Sınıf Oluştur','<p>Önce sınıfını seç, sonra her öğrenci için ayrı bir kullanıcı adı ve şifre gir. En fazla 50 hesap tek seferde oluşturulabilir. Herkese görünen kullanıcı adları gerçek isim içermeyen takma adlar olmalıdır.</p><div class="tp-bulk-defaults"><label>Sınıf<select name="sinif">'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'" '+(i===4?'selected':'')+'>'+(i+1)+'. sınıf</option>').join('')+'</select></label><label>Şube<input name="sube" value="A" required maxlength="10"></label></div><label>Okul (isteğe bağlı)<input name="okul" maxlength="120"></label><h2 class="tp-pupil-heading">Öğrenciler</h2><div class="tp-pupil-rows">'+row(1)+row(2)+row(3)+'</div><div class="tp-pupil-actions"><button type="button" data-add-pupils="1">+ Öğrenci ekle</button><button type="button" data-add-pupils="5">+ 5 satır</button><button type="button" data-add-pupils="10">+ 10 satır</button></div><label class="tp-pupil-common"><input type="checkbox" name="common_pass"> Hepsine aynı başlangıç şifresi ver</label><label class="tp-pupil-shared" hidden>Ortak şifre<input name="shared_pass" type="password" minlength="6" maxlength="64" placeholder="En az 6 karakter"></label><label class="tp-pupil-common"><input type="checkbox" name="reveal_pass"> Şifreleri göster</label><p class="tp-pupil-hint">Yeni hesaplar mevcut öğretmen oturumuna otomatik bağlanır. Kayıt öncesinde kullanıcı adlarını ve şifrelerini kontrol et. Şifreleri güvenli şekilde öğrencilere ilet.</p><button class="tp-primary" type="submit">Öğrencileri kaydet</button>');
  const list=v.form.querySelector('.tp-pupil-rows'),common=v.form.querySelector('[name="common_pass"]'),shared=v.form.querySelector('.tp-pupil-shared'),reveal=v.form.querySelector('[name="reveal_pass"]');
  const update=()=>{
   const rows=[...list.querySelectorAll('[data-pupil-row]')];
   rows.forEach((r,i)=>{r.querySelector('.tp-pupil-num').textContent=String(i+1);r.querySelector('.tp-pupil-remove').disabled=rows.length===1;const pass=r.querySelector('[name="pupil_pass"]');pass.disabled=common.checked;pass.required=false;pass.type=reveal.checked?'text':'password';});
   shared.hidden=!common.checked;shared.querySelector('input').required=common.checked;shared.querySelector('input').type=reveal.checked?'text':'password';
   v.form.querySelectorAll('[data-add-pupils]').forEach(b=>b.disabled=rows.length>=50);
  };
  v.form.querySelectorAll('[data-add-pupils]').forEach(b=>b.onclick=()=>{
   const count=Math.min(Number(b.dataset.addPupils),50-list.children.length);
   for(let i=0;i<count;i++)list.insertAdjacentHTML('beforeend',row(list.children.length+1));
   update();
  });
  list.addEventListener('click',e=>{if(e.target.closest('.tp-pupil-remove')){e.target.closest('[data-pupil-row]').remove();update();}});
  common.onchange=update;reveal.onchange=update;update();
  submit(v,async f=>{
   const cls=Number(f.get('sinif')),branch=String(f.get('sube')||'').trim(),school=String(f.get('okul')||'').trim();
   const input=[...list.querySelectorAll('[data-pupil-row]')].map((r,i)=>({i,kullanici:r.querySelector('[name="pupil_user"]').value.trim(),sifre:common.checked?shared.querySelector('input').value:r.querySelector('[name="pupil_pass"]').value}));
   const rows=input.filter(r=>r.kullanici||r.sifre);
   if(!rows.length||rows.length>50)throw Error('1–50 öğrenci gir.');
   const usernames=new Set();
   const ogrenciler=rows.map(r=>{
    if(!r.kullanici||!r.sifre)throw Error((r.i+1)+'. öğrencinin kullanıcı adı ve şifresi zorunlu.');
    if(r.sifre.length<6||r.sifre.length>64)throw Error((r.i+1)+'. öğrencinin şifresi 6–64 karakter olmalı.');
    const key=r.kullanici.toLocaleLowerCase('tr-TR');
    if(usernames.has(key))throw Error(r.kullanici+' aynı listede tekrar ediyor.');
    usernames.add(key);
    return {kullanici:r.kullanici,sifre:r.sifre,sinif:cls,sube:branch,okul:school};
   });
   const result=await api('ogretmenOgrenciOlustur',{ogrenciler});
   v.form.replaceChildren();const msg=document.createElement('p');msg.textContent=result.mesaj||ogrenciler.length+' öğrenci kaydedildi.';v.form.append(msg);
  });
 }
 let preparingTools=null;
 const teacherChildren='.rubric-modal,.cog-perde,.sm-overlay,.dm-member-overlay,.dm-account-overlay,.dm-perde,.yo-modal,.yo-perde,#yoModalPerde,#omSifreModal,#odModal,.game-modal-overlay,.gso-overlay,#dmTeacherOral,.dm-teacher-child';
 function teacherToolVisible(){
  return [...document.querySelectorAll(teacherChildren)].some(el=>{
   if(el.id==='ogretmenMenuModal'||el.id==='sifreModal'||el.hidden||el.closest('[hidden],[aria-hidden="true"],.tp-shade'))return false;
   const style=getComputedStyle(el),rect=el.getBoundingClientRect();
   return style.display!=='none'&&style.visibility==='visible'&&Number(style.opacity)>0&&rect.width>0&&rect.height>0&&rect.bottom>0&&rect.right>0&&rect.top<innerHeight&&rect.left<innerWidth;
  });
 }
 function observeTeacherChildren(){
  const sync=()=>{const visible=document.body.classList.contains('tp-dash-active')&&teacherToolVisible();document.body.classList.toggle('tp-legacy-child-open',visible);const menu=document.getElementById('ogretmenMenuModal');if(menu?.style.display==='flex')menu.style.display='none';};
  requestAnimationFrame(sync);
  if(window.tpLegacyToolObserver)return;
  let queued=false;window.tpLegacyToolObserver=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});});
  window.tpLegacyToolObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden']});
 }
 function showTeacherToolError(error){const status=document.querySelector('.tp-dash-status');if(status)status.textContent='Öğretmen verileri yüklenemedi: '+(error.message||'Bağlantıyı kontrol edip Verileri yenile düğmesine bas.');}
 async function prepareTeacherTools(){
  if(preparingTools)return preparingTools;
  const token=state()?.teacherToken;if(!token)throw Error('Öğretmen oturumu bulunamadı. Kodla tekrar giriş yap.');
  preparingTools=(async()=>{
   const [info,rows]=await Promise.all([api('ogretmenBilgim',{},token),api('',{},token)]);
   if(token!==state()?.teacherToken)throw Error('Öğretmen hesabı değişti. Paneli yeniden aç.');
   if(!Array.isArray(rows))throw Error('Öğrenci listesi alınamadı. Verileri yenileyerek tekrar dene.');
   // Use the exact legacy dataset and selection controls, including the empty-list case.
   globalDataCache=rows;
   const pupils=rows.filter(x=>x.ogrenci&&String(x.ogrenci).toLowerCase()!=='teacher');
   const studentsCount=document.querySelector('[data-dash-students]'),classesCount=document.querySelector('[data-dash-classes]');
   if(studentsCount)studentsCount.textContent=String(pupils.length);
   if(classesCount)classesCount.textContent=String(new Set(pupils.map(x=>String(x.Sinif||x.sinif||'')+'|'+String(x.Sube||x.sube||'')).filter(x=>x!=='|')).size);
   sessionStorage.setItem('ing_ogr_token',token);
   sessionStorage.setItem('ing_ogr_ad',info.adSoyad||info.kullanici||'');
   sessionStorage.setItem('ing_ogr_yonetici',info.yonetici?'1':'');
   window.ogretmenSelectDoldur?.();window.yoOgretmenButonlariEkle?.();window.dmTeacherWorkspace?.prepare?.();
   await window.dmRefreshTeacherIdentity?.(info);
   const tiles=document.querySelector('#tpDashboard .tp-real-tools');
   if(tiles&&info.kullanici==='teacher'&&info.yonetici===true){
    await decorate();
    const existing=[...tiles.querySelectorAll('[data-dash]')].map(b=>b.dataset.dash),patterns={homework:/ödev ver/i,rubric:/rubrik/i,performance:/ders içi performans/i,announcements:/duyurular/i,messages:/öğrenci sohbetleri/i,weak:/zayıf noktalar/i,parent:/veli özetleri/i,studentDetails:/öğrenci şifresi/i,exams:/seviye sınavı/i,oral:/sözlü yap/i};
    for(const target of document.querySelectorAll('#ogretmenMenuModal button.ogretmen-menu-btn')){
     const title=String(target.dataset.dmTeacherTitle||target.querySelector('.dm-teacher-card-title')?.textContent||target.textContent).trim();
     if(/öğretmen erişim onayları/i.test(title))continue;
     if(existing.some(key=>patterns[key]?.test(title.toLocaleLowerCase('tr-TR'))))continue;
     if([...tiles.querySelectorAll('[data-native-title]')].some(b=>b.dataset.nativeTitle===title))continue;
     const b=document.createElement('button');b.type='button';b.dataset.nativeTitle=title;const icon=document.createElement('span'),label=document.createElement('strong');icon.textContent='⚙️';icon.setAttribute('aria-hidden','true');label.textContent=title;b.append(icon,label);b.onclick=()=>{window.dmTeacherToolsActive=true;target.click();observeTeacherChildren();};tiles.append(b);
    }
   }
   const slot=document.querySelector('[data-teacher-identity]'),card=document.getElementById('cogOgretmenKart');if(slot&&card&&card.parentElement!==slot)slot.replaceChildren(card);
   tiles?.querySelectorAll('[data-native-title]').forEach(b=>{if(/öğretmen erişim onayları/i.test(b.dataset.nativeTitle||''))b.remove();});
   const status=document.querySelector('.tp-dash-status');if(status)status.textContent=rows.length+' öğrenci · Öğretmen araçları hazır.';
   paginateDashboard();requestAnimationFrame(paginateDashboard);return rows;
  })();
  try{return await preparingTools;}finally{preparingTools=null;}
 }
 async function legacyTool(pattern){
  if(window.dmTeacherToolOpening)return;
  window.dmTeacherToolOpening=true;window.dmTeacherToolsActive=true;
  const buttons=[...document.querySelectorAll('#tpDashboard [data-dash]')];buttons.forEach(b=>b.disabled=true);
  try{
   await prepareTeacherTools();
   const menu=document.getElementById('ogretmenMenuModal');
   const target=[...(menu?.querySelectorAll('button.ogretmen-menu-btn')||[])].find(b=>pattern.test(String(b.dataset.dmTeacherTitle||b.querySelector('.dm-teacher-card-title')?.textContent||b.textContent||'').toLocaleLowerCase('tr-TR')));
   if(!target)throw Error('İlgili öğretmen aracı henüz hazır değil. Verileri yenileyerek tekrar dene.');
   target.click();
   if(menu){menu.classList.remove('dm-teacher-open');menu.style.setProperty('display','none');}
   observeTeacherChildren();
  }catch(error){showTeacherToolError(error);}
  finally{window.dmTeacherToolOpening=false;buttons.forEach(b=>b.disabled=false);}
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
 function classroom(){if(window.dmTeacherOwnedTools?.reports)return window.dmTeacherOwnedTools.reports();window.yoToast?.('Raporlar yüklenemedi. Sayfayı yenile.');}
 function teacherPerformance(){if(window.dmTeacherOwnedTools?.performance)return window.dmTeacherOwnedTools.performance();window.yoToast?.('Performans ekranı yüklenemedi. Sayfayı yenile.');}
 function teacherRubric(){
  chooseTeacherStudent('Özel Ders Rubrik Değerlendirme',async student=>{
   const fields=[['reading_score','Okuma'],['writing_score','Yazma'],['vocabulary_score','Kelime'],['speaking_score','Konuşma'],['grammar_score','Dil bilgisi']];
   const html='<h3>'+String(student.username).replace(/[<>&]/g,'')+'</h3>'+fields.map(([k,label])=>'<label>'+label+' (0–100)<input type="number" name="'+k+'" min="0" max="100" required value="70"></label>').join('')+'<button class="tp-primary" type="submit">Rubriği Kaydet</button>';
   const v=sheet('Özel Ders Rubrik Değerlendirme',html);
   submit(v,async form=>{const values={studentId:student.id};fields.forEach(([k])=>values[k]=Number(form.get(k)));const r=await api('teacherPortalRubric',values);v.form.textContent='Değerlendirme kaydedildi. Genel ortalama: '+r.average;});
  });
 }
 function teacherAnnouncement(){
  // Reuse the original teacher-portal sheet. Only the missing own-class and
  // individual recipient controls are inserted; original copy and flow remain.
  const v=sheet('📢 Duyuru Oluştur','<p>Yalnızca sana bağlı öğrencilere gösterilir. Tüm platform duyurusu gönderilemez.</p>'+
   '<label>Sınıf / Şube<select name="classId" required><option value="">Sınıf yükleniyor…</option></select></label>'+
   '<label>Alıcı<select name="studentId"><option value="">Sınıfın tamamı</option></select></label>'+
   '<label>Başlık<input name="title" maxlength="120" required></label>'+
   '<label>Duyuru<textarea name="message" maxlength="2000" required rows="5"></textarea></label>'+
   '<button class="tp-primary" type="submit">Duyuruyu Yayınla</button>');
  let classes=[];
  const gradeSelect=v.form.elements.classId,studentSelect=v.form.elements.studentId;
  const refreshPupils=()=>{
   const selected=classes.find(x=>x.id===gradeSelect.value);
   studentSelect.replaceChildren(new Option('Sınıfın tamamı',''));
   for(const pupil of selected?.students||[]){
    studentSelect.add(new Option(pupil.fullName||pupil.username,pupil.id));
   }
  };
  gradeSelect.onchange=refreshPupils;
  (async()=>{
   try{
    if(typeof window.dmTeacherOwnedTools?.classes!=='function')throw Error('Sınıf listesi yüklenemedi.');
    classes=await window.dmTeacherOwnedTools.classes();
    if(!v.shade.isConnected)return;
    gradeSelect.replaceChildren(new Option('Sınıf seç',''));
    for(const c of classes)gradeSelect.add(new Option((c.name?c.name+' · ':'')+c.classNo+'. sınıf / '+c.branch+' şubesi',c.id));
    if(classes.length===1){gradeSelect.value=classes[0].id;refreshPupils();}
    if(!classes.length)v.error('Önce Sınıflarım bölümünden sınıf oluştur.');
   }catch(e){if(v.shade.isConnected)v.error(e.message);}
  })();
  submit(v,async form=>{
   const selected=classes.find(x=>x.id===form.get('classId'));
   if(!selected)throw Error('Önce kendi oluşturduğun sınıfı seç.');
   const response=await api('teacherPortalAnnouncement',{
    classId:selected.id,studentId:form.get('studentId')||'',
    title:form.get('title'),message:form.get('message')});
   v.form.textContent='Duyuru '+response.studentCount+' öğrenciye gönderildi.';
  });
 }
 window.dmTeacherLegacyAnnouncementOpen=teacherAnnouncement;
 function teacherStudentDetails(){
  chooseTeacherStudent('Öğrenci Bilgilerini Değiştir',async student=>{
   const info=await api('teacherPortalStudentContact',{studentId:student.id});
   const v=sheet('Öğrenci Bilgilerini Değiştir','<p data-name></p><p>E-posta doğrulama, parola ve öğretmen değişikliği öğrencinin güvenli hesap işlemleriyle yapılır. Öğretmen yalnızca telefon bilgisini güncelleyebilir.</p><label>E-posta (salt okunur)<input name="email" readonly></label><label>Telefon<input name="phone" inputmode="tel" maxlength="12"></label><button type="submit" class="tp-primary">Telefonu Kaydet</button>');
   v.shade.querySelector('[data-name]').textContent=student.username;
   v.form.elements.email.value=info.student.email||'';v.form.elements.phone.value=info.student.phone||'';
   submit(v,async form=>{const r=await api('teacherPortalStudentContact',{studentId:student.id,save:true,phone:form.get('phone')});v.form.textContent=r.mesaj;});
  });
 }
 function individualReport(){
  chooseTeacherStudent('Öğrenci Bireysel Raporları',async student=>{
   const v=sheet('Öğrenci Bireysel Raporu','<p>Rapor yükleniyor…</p>');
   try{const report=await api('teacherPortalStudentReport',{studentId:student.id});if(!v.shade.isConnected)return;
    v.form.replaceChildren();const heading=document.createElement('h2');heading.textContent=report.student.fullName||report.student.username;v.form.append(heading);
    const stats=document.createElement('div');stats.className='tp-report-stats';
    for(const [label,value]of [['XP',report.student.xp],['Genel puan',report.student.points],['Çalışma serisi',report.student.streak],['Oyun',report.totals.plays],['Doğru',report.totals.correct],['Yanlış',report.totals.wrong]]){const box=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small');b.textContent=String(value??0);small.textContent=label;box.append(b,small);stats.append(box);}v.form.append(stats);
    const history=document.createElement('div');history.className='tp-report-history';for(const row of report.reports){const p=document.createElement('p');p.textContent=(window.DMTime?.format(row.report_date)||row.report_date)+' · Okuma: '+(row.reading_score??'—')+' · Yazma: '+(row.writing_score??'—')+' · Kelime: '+(row.vocabulary_score??'—')+' · Konuşma: '+(row.speaking_score??'—')+' · Dil bilgisi: '+(row.grammar_score??'—');history.append(p);}if(!history.children.length)history.textContent='Henüz rubrik değerlendirmesi yok.';v.form.append(history);
   }catch(e){v.error(e.message);}
  });
 }
 function teacherDashboardAction(action){
  if(action==='home'){teacherDashboardHide();teacherHomeShow();return;}
  if(action==='sync'){void prepareTeacherTools().catch(showTeacherToolError);return;}
  if(action==='logout'){const s=state();Promise.allSettled([api('cikis',{},s?.teacherToken),api('cikis',{},s?.participant?.token)]).finally(()=>window.dmTeacherPortalExit?.());return;}
  if(action==='switchAccount'){window.dmHesapDegistirAc?.();return;}
  if(action==='code'||action==='settings'){openProfile();return;}
  if(action==='students'){openBulkStudents();return;}
  if(action==='individual'){individualReport();return;}
  if(action==='games'||action==='library'){teacherDashboardHide();teacherDestination(action==='games'?'games':'study');return;}
  if(action==='oral'){void openTeacherOral();return;}
  if(action==='announcements'){void window.dmTeacherOwnedTools?.legacyAnnouncement?.();return;}
  if(['performance','homework','reports','weak','parent','exams'].includes(action)){
   const tool=action==='performance'?'performance':action==='homework'?'legacyHomework':'reports';
   const launch=async()=>{if(typeof window.dmTeacherOwnedTools?.[tool]!=='function')throw Error('Sınıf araçları henüz yüklenmedi. Sayfayı yenile.');await window.dmTeacherOwnedTools[tool]();};
   void launch().catch(e=>window.yoToast?.(e.message));return;
  }
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
   registrations:/bekleyen kayıt/i,
   homework:/ödev ver/i,
   reports:/rapor/i
  };
  if(map[action])legacyTool(map[action]);
 }

 function teacherHomeShow(){
  teacherDashboardHide();
  if(!mode)return;rememberRoute('home');document.getElementById('tpTeacherEmergency')?.remove();document.getElementById('tpTeacherHome')?.classList.add('is-visible');
  document.body.classList.add('tp-home-active');document.documentElement.classList.remove('tp-home-starting');teacherDock();
  document.querySelector('[data-tp-home-nav]')?.classList.add('active');
 }
 function teacherHomeHide(){document.getElementById('tpTeacherHome')?.classList.remove('is-visible');document.body.classList.remove('tp-home-active');document.querySelector('[data-tp-home-nav]')?.classList.remove('active');}
 async function openTeacherOral(){
  const current=state(),teacherToken=current?.teacherToken;
  if(!teacherToken){window.yoToast?.('Sözlü yapmak için öğretmen kodunla giriş yapmalısın.');return;}
  // Oral authentication uses the same teacher session as class creation.
  // Set it every time so newly entered teachers do not depend on opening the legacy dashboard.
  sessionStorage.setItem('ing_ogr_token',teacherToken);
  sessionStorage.setItem('ing_ogr_ad',current?.name||'');
  try{
   if(typeof window.dmTeacherOral?.open!=='function')throw Error('Sözlü ekranı henüz yüklenemedi.');
   await window.dmTeacherOral.open();
  }catch(error){window.yoToast?.(error.message||'Sözlü ekranı açılamadı.');}
 }
 function teacherDestination(action){
  if(action==='class'){openBulkStudents();return;}
  if(action==='panel'){teacherDashboardShow();return;}
  if(action==='oral'){void openTeacherOral();return;}
  rememberRoute(action);teacherHomeHide();teacherDashboardHide();teacherDock();
  const id=action==='study'?'tab-derscalis':action==='games'?'tab-aktiviteler':'tab-profile-menu';
  const launch=action==='study'?window.dersCalisTamEkranAc:window.aktivitelerTamEkranAc;
  const target=document.querySelector('#bottomNavMobile [data-ekran="'+id+'"]');
  const recover=error=>{console.error('[Teacher navigation]',error);teacherHomeShow();window.yoToast?.('Bu ekran açılamadı. Öğretmen ana sayfasına döndün.');};
  try{
   if(typeof launch!=='function'&&!target)throw Error('Hedef ekran henüz yüklenmedi.');
   const result=typeof launch==='function'?launch():target.click();
   if(result&&typeof result.then==='function')result.catch(recover);
  }catch(error){recover(error);}

 }


 // A personal teacher account remains a normal learner for its first tour.
 // A PREVIEW never gets a teacher token. Only the server can issue one after
 // the owner's explicit approval and verified personal email.
 const teacherTools=[
  ['📖','Konu Anlat','Dersleri aç, örneklerle konuyu anlat, akıllı tahtada tekrar yaptır.'],
  ['🎮','Yarışma Yaptır','Öğrencilerinle kelime ve bilgi oyunları oynat, sınıf sonuçlarını gör.'],
  ['🏫','Sınıf Oluştur','Sınıfını düzenle ve öğrencilerini güvenli şekilde bağla.'],
  ['🎤','Sözlü Yap','Öğrencilerin kelime bilgisini değerlendir.'],
  ['📝','Ödev Ver','Ödevleri planla ve tamamlanma durumlarını takip et.'],
  ['📊','Raporlar','Öğrencilerinin güçlü ve gelişecek yönlerini incele.']
 ];
 let teacherAccountToken='',teacherAccount=null,teacherStatusLoading=false,teacherCodeReceipt=null,lastTeacherCodeShown='';
 let teacherEmailReminderChecked=false,teacherEmailReminderScheduled=false;
 async function scheduleTeacherEmailReminder(token){
  if(mode||teacherEmailReminderChecked||teacherEmailReminderScheduled||!teacherAccount?.teacherAccount||!token)return;
  teacherEmailReminderScheduled=true;
  try{
   const account=await api('memberStatus',{},token);
   if(token!==localStorage.getItem('ing_token')||!teacherAccount?.teacherAccount)return;
   teacherEmailReminderChecked=true;
   if(account.emailVerified)return;
   let checks=0;
   const showWhenReady=()=>{
    if(token!==localStorage.getItem('ing_token')||!teacherAccount?.teacherAccount)return;
    const busy=[...document.querySelectorAll('.tp-shade,#dmTeacherPreview,#dmDiscovery,.dm-announcement-overlay,.deg-overlay,[role="dialog"][aria-modal="true"]')].some(el=>el.getClientRects().length>0);
    if(busy||!document.body||!localStorage.getItem('ing_token')){
     if(++checks<60)setTimeout(showWhenReady,1800);return;
    }
    const v=sheet('Öğretmen Hesabını Doğrula','<p>Öğretmen hesabını kullanabilmen için kişisel e-posta adresini mutlaka doğrulamalısın.</p><p>Yönetici onay verince sana <strong>“Öğretmen onayınız tamamlandı”</strong> e-postası gönderilecek. Ardından öğretmen giriş kodunla giriş yapabilirsin.</p><button type="button" class="tp-primary" data-verify-guide>📨 E-postamı Doğrula</button><button type="button" data-verify-later>Parkur’u Keşfetmeye Devam Et</button>');
    v.form.querySelector('[data-verify-guide]').onclick=()=>{v.close();window.dmEmailGuide?.open?.('help');};
    v.form.querySelector('[data-verify-later]').onclick=v.close;
   };
   setTimeout(showWhenReady,7500);
  }catch(e){console.warn('[Teacher email reminder]',e?.message||e);}
  finally{teacherEmailReminderScheduled=false;}
 }

 const teacherStyle=document.createElement('style');
 teacherStyle.textContent=String.raw`
 #dmTeacherParkurSwitch,#dmTeacherBackToParkur{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(82px + env(safe-area-inset-bottom));z-index:700;padding:11px 15px;border:2px solid #80bcff;border-radius:24px;background:#e5f3ff;color:#174d8c;box-shadow:0 5px 17px #11365a35;font-weight:800;font-size:13px;cursor:pointer}
 #dmTeacherBackToParkur{bottom:calc(86px + env(safe-area-inset-bottom));background:#ecfbea;border-color:#92d4a2;color:#175c2d}
 #dmTeacherPreview{position:fixed;inset:0;z-index:1900;background:var(--surface,#f5f8ff);overflow:auto;padding:calc(15px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));color:var(--text-color,#172a43)}
 #dmTeacherPreview .tpv-head{display:flex;align-items:center;justify-content:space-between;gap:14px;max-width:740px;margin:0 auto 16px}
 #dmTeacherPreview .tpv-hero,#dmTeacherPreview .tpv-status,#dmTeacherPreview .tpv-detail{max-width:740px;margin:0 auto 14px;padding:16px;border-radius:18px;background:rgba(134,179,241,.15)}
 #dmTeacherPreview .tpv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:740px;margin:0 auto 16px}
 #dmTeacherPreview .tpv-tool{background:var(--card-bg,#fff);color:inherit;border:1px solid #9cbbdd66;border-radius:17px;padding:16px 9px;display:flex;flex-direction:column;gap:8px;align-items:center;cursor:pointer;text-align:center}
 #dmTeacherPreview button:focus-visible{outline:3px solid #2679cf;outline-offset:2px}
 #dmTeacherPreview .tpv-actions{display:flex;gap:8px;flex-wrap:wrap;max-width:740px;margin:0 auto}
 #dmTeacherPreview .tpv-actions button,#dmTeacherPreview .tpv-head button{padding:11px 13px;border:1px solid #7daccb;border-radius:12px;background:#e4f2ff;color:#194e83;font-weight:700;cursor:pointer}
 #dmTeacherPreview .tpv-tool strong{font-size:13px}
 #dmTeacherPreview .tpv-tool small{font-size:11px;opacity:.7}
 #dmTeacherPreview .tpv-status{line-height:1.6}
 @media(max-width:380px){#dmTeacherParkurSwitch{padding:10px;font-size:12px}#dmTeacherPreview .tpv-grid{gap:8px}}
 `;
 document.head.append(teacherStyle);
 const teacherToken=()=>localStorage.getItem('ing_token')||'';
 function renderTeacherSwitch(){
  if(mode)return;
  const route=document.querySelector('.rt-medal-route');
  const show=!!teacherAccount?.teacherAccount&&!!teacherToken()&&!!route&&route.getClientRects().length>0&&!document.getElementById('dmTeacherPreview');
  let button=document.getElementById('dmTeacherParkurSwitch');
  if(!show){button?.remove();return;}
  if(!button){button=document.createElement('button');button.id='dmTeacherParkurSwitch';button.type='button';button.textContent='🎓 Öğretmen Panelim';button.onclick=()=>openPersonalTeacherPanel();document.body.append(button);}
 }
 async function refreshTeacherAccount(force=false){
  if(mode||window.dmGuestMode||sessionStorage.getItem('ing_ogr_token'))return;
  const token=teacherToken();
  if(!token){teacherAccount=null;teacherAccountToken='';renderTeacherSwitch();return;}
  if(teacherStatusLoading||!force&&teacherAccountToken===token)return;
  teacherAccountToken=token;teacherStatusLoading=true;
  try{const r=await api('teacherPortalStatus',{offerOnly:true},token);if(token!==teacherToken())return;teacherAccount=r;renderTeacherSwitch();if(r.teacherAccount)scheduleTeacherEmailReminder(token);}
  catch{if(token===teacherToken())teacherAccount=null;}
  finally{teacherStatusLoading=false;}
 }
 function previewTeacherPanel(status){
  document.getElementById('dmTeacherPreview')?.remove();
  const wrap=document.createElement('main');wrap.id='dmTeacherPreview';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','Öğretmen paneli önizleme');
  const head=document.createElement('header');head.className='tpv-head';
  const title=document.createElement('h2');title.textContent='🎓 Öğretmen Panelim';
  const back=document.createElement('button');back.textContent='← Parkur’a Dön';back.onclick=()=>{wrap.remove();renderTeacherSwitch();};
  head.append(title,back);
  const hero=document.createElement('section');hero.className='tpv-hero';
  hero.textContent='Diji-Medu ile sınıfını yönet, yarışmalar düzenle, konu anlat ve öğrencilerinin gelişimini takip et.';
  const statusText=document.createElement('section');statusText.className='tpv-status';
  statusText.textContent=status.state==='approved'?'Öğretmen yetkin onaylandı. Özellikleri kullanmak için e-posta doğrulamanın da tamamlanması gerekiyor.':status.state==='pending'?'Öğretmen başvurun alındı. Yetkini yönetici onayladıktan ve e-postanı doğruladıktan sonra tüm özellikler açılacak.':'Öğretmen erişimin şu anda etkin değil. Destek ekibimizle iletişime geçebilirsin.';
  const grid=document.createElement('section');grid.className='tpv-grid';
  const detail=document.createElement('section');detail.className='tpv-detail';detail.setAttribute('role','status');detail.hidden=true;
  for(const [emoji,label,description] of teacherTools){
   const button=document.createElement('button');button.type='button';button.className='tpv-tool';
   const icon=document.createElement('span');icon.textContent=emoji;icon.style.fontSize='28px';
   const name=document.createElement('strong');name.textContent=label;
   const note=document.createElement('small');note.textContent='🔒 Tanıtımı gör';
   button.append(icon,name,note);
   button.onclick=()=>{detail.hidden=false;detail.textContent=description+' Bu özelliği kullanmak için kişisel e-posta doğrulaman ve yönetici öğretmen onayın tamamlanmalı.';detail.scrollIntoView({block:'nearest',behavior:'smooth'});};
   grid.append(button);
  }
  const actions=document.createElement('div');actions.className='tpv-actions';
  const check=document.createElement('button');check.textContent='🔄 Erişimimi Kontrol Et';check.onclick=async()=>{check.disabled=true;try{await refreshTeacherAccount(true);if(teacherAccount?.state==='approved'){wrap.remove();await openPersonalTeacherPanel();}else{statusText.textContent=teacherAccount?.state==='pending'?'Başvurun hâlâ inceleniyor. Parkur’u keşfetmeye devam edebilirsin.':'Öğretmen erişimi henüz etkin değil.';}}finally{check.disabled=false;}};
  const login=document.createElement('button');login.textContent='🔑 Kodla Giriş';login.onclick=()=>{wrap.remove();openLogin();};
  actions.append(check);if(status.state==='approved')actions.append(login);
  wrap.append(head,hero,statusText,grid,detail,actions);
  document.body.append(wrap);back.focus();
 }
 async function openPersonalTeacherPanel(){
  const token=teacherToken();
  if(!token)return;
  try{
   const status=await api('teacherPortalStatus',{},token);
   if(!status.teacherAccount){return;}
   teacherAccount=status;
   if(status.state!=='approved'||!status.codeReady){previewTeacherPanel(status);return;}
   try{
    const r=await api('teacherPortalEnter',{},token);
    const participant=await api('teacherPortalParticipant',{self:true},r.token);
    saveState({teacherToken:r.token,name:r.name,participant,playAsSelf:true,route:'home'});
    location.assign('./?ogretmen=1');
   }catch(error){previewTeacherPanel(status);}
  }catch(error){window.yoToast?.(error.message||'Öğretmen paneline ulaşılamadı.');}
 }
 function queueTeacherCodeReceipt(code){
  if(!/^\d{6}$/.test(code)||lastTeacherCodeShown===code||teacherCodeReceipt===code)return;
  teacherCodeReceipt=code;
  setTimeout(()=>{if(teacherCodeReceipt===code){teacherCodeReceipt=null;lastTeacherCodeShown=code;if(!window.dmTeacherSignupCodeHandled)showSignupTeacherCode(code);}},1600);
 }
 function showSignupTeacherCode(code){
  if(!/^\d{6}$/.test(code))return;
  const v=sheet('Öğretmen Kodun Hazır!','<p>Bu 6 haneli kodu güvenli bir yere kaydet. <strong>Kişisel e-posta adresini mutlaka doğrula.</strong> Yönetici onay verdiğinde sana “Öğretmen onayınız tamamlandı” e-postası gönderilecek. Sonrasında Öğretmen Girişi ekranında bu kodu kullanabilirsin.</p><div data-teacher-code style="font-size:30px;font-weight:800;letter-spacing:7px;text-align:center;padding:16px;border-radius:16px;background:#e5f3ff;color:#164f84"></div><button type="button" data-copy class="tp-primary">Kodu Kopyala</button><button type="button" data-confirm>Kodumu Kaydettim, Devam Et</button><small>Kodunu unutursan “Kodumu Unuttum” bağlantısından yenileyebilirsin. Öğrencilerin sınıfa katılım kodu farklıdır.</small>');
  v.shade.querySelector('[data-teacher-code]').textContent=code;
  v.shade.querySelector('[data-copy]').onclick=()=>{if(!navigator.clipboard?.writeText){v.error('Kodu elle not alabilirsin.');return;}navigator.clipboard.writeText(code).then(()=>v.error('Kod kopyalandı.')).catch(()=>v.error('Kodu elle not alabilirsin.'));};
  v.shade.querySelector('[data-confirm]').onclick=()=>{v.close();refreshTeacherAccount(true);};
 }
 // The registration code is delivered only to the original registration response;
 // never persist it in localStorage, sessionStorage, analytics or query params.
 if(!mode){
  window.addEventListener('dm:teacher-signup-code',e=>queueTeacherCodeReceipt(e.detail?.code));
  const oldFetch=window.fetch;
  window.fetch=function(url,options){
   let request=null;try{request=typeof options?.body==='string'?JSON.parse(options.body):null;}catch{}
   const result=oldFetch.apply(this,arguments);
   if(request&&['kayitOl','ogretmenKayitOl'].includes(request.islem)){
    result.then(r=>r.clone().json()).then(d=>{
     if(d?.status==='success'&&d?.teacherAccount&&/^\d{6}$/.test(d.teacherCode||'')){
      queueTeacherCodeReceipt(d.teacherCode);
     }
    }).catch(()=>{});
   }
   return result;
  };
  document.addEventListener('dm:login',()=>{teacherEmailReminderChecked=false;teacherEmailReminderScheduled=false;refreshTeacherAccount(true);});
  document.addEventListener('dm:logout',()=>{teacherAccount=null;teacherAccountToken='';teacherEmailReminderChecked=false;teacherEmailReminderScheduled=false;renderTeacherSwitch();});
  setInterval(()=>{refreshTeacherAccount();renderTeacherSwitch();},2500);
 }
 if(mode){
  const switchToParkur=()=>{
   if(document.getElementById('dmTeacherBackToParkur'))return;
   const b=document.createElement('button');b.type='button';b.id='dmTeacherBackToParkur';b.textContent='🌿 Parkur’a Geç';b.onclick=()=>window.dmTeacherPortalParkur?.();
   document.body.append(b);
  };
  if(document.body)switchToParkur();else document.addEventListener('DOMContentLoaded',switchToParkur,{once:true});
 }

 window.dmTeacherPortal={openMessages:()=>teacherDashboardAction('messages'),openLogin,openProfile,beforeGame,management,prepareTools:prepareTeacherTools,returnToGames:()=>{if(!mode||state()?.route!=='games')return;window.dmViewHistory?.clear?.();teacherDestination('games');}};
 if(document.body.dataset.teacherReset==='1'){resetPage();return;}
 if(mode){document.body.classList.add('dm-teacher-portal');document.documentElement.classList.add('dm-teacher-portal');document.documentElement.classList.add('tp-home-starting');window.cikisYap=window.dmTeacherPortalExit;window.siniftaOyunModuAc=()=>{document.getElementById('ogretmenMenuModal')?.style.setProperty('display','none');window.aktivitelerTamEkranAc?.();};}
 let scheduled=false;const observe=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();if(mode){suppressPreviewPrompts();hideTeacherHeader();const n=document.getElementById('bottomNavMobile');n?.querySelectorAll('.bn-item').forEach(i=>{if((i.dataset.ekran==='tab-profil'||/^(profil|profilim)$/i.test((i.textContent||'').trim())))i.remove();});}});};new MutationObserver(observe).observe(document.body,{childList:true,subtree:true});decorate();wrapGames();
 document.addEventListener('dm:state',wrapGames);document.addEventListener('dm:login',wrapGames);if(mode)document.addEventListener('click',()=>{if(window.tpHomeInitialized){teacherHome();suppressPreviewPrompts();}}, {capture:false});
 // First paint must be the private teacher home even if the learner route fails.
 if(mode){
  const bootHome=()=>{try{teacherHome();if(!window.tpHomeInitialized)throw Error('Öğretmen sayfası başlatılamadı.');}catch(err){
   console.error('[Teacher home]',err);document.documentElement.classList.remove('tp-home-starting');
   const home=document.getElementById('tpTeacherHome');
   if(home){home.classList.add('is-visible');document.body.classList.add('tp-home-active');}
  }};
  if(document.body)bootHome();else document.addEventListener('DOMContentLoaded',bootHome,{once:true});
 }
 let opened=false;const timer=setInterval(()=>{wrapGames();if(mode&&!opened&&document.body){opened=true;teacherHome();teacherDock();suppressPreviewPrompts();prepareTeacherAppearance();sessionStorage.removeItem('dm_tp_pending');}if(opened)clearInterval(timer);},500);setTimeout(()=>clearInterval(timer),30000);
 if(new URLSearchParams(location.search).get('ogretmenGiris')==='1'){window.dmFirstDiscovery?.openLogin?.();openLogin();}
})();
