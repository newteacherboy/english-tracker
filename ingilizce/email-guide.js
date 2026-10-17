/* DijiMedu • visual email verification helper for new and existing accounts.
   All account changes are performed by the existing authenticated API. */
(()=>{'use strict';
 if(window.dmEmailGuide)return;
 const VERSION='20261017-v1',PREFIX='dm-eg';
 const css=document.createElement('link');css.rel='stylesheet';css.href='email-guide.css?v='+VERSION;document.head.append(css);
 const $=id=>document.getElementById(id);
 const locale=s=>String(s||'').trim().toLocaleLowerCase('tr');
 const account=()=>String(localStorage.getItem('ing_aktifOgrenci')||'').trim();
 const session=()=>localStorage.getItem('ing_token')||'';
 const signedIn=()=>!!account()&&!!session()&&localStorage.getItem('ing_oturumAcik')==='true';
 const providers={
  gmail:{title:'Gmail',badge:'M',link:'https://mail.google.com/mail/u/0/',tip:'Gmail',steps:[
   ['Gmail uygulamasını aç','Telefonunda renkli M simgeli Gmail uygulamasını bul ve dokun.'],
   ['Gelen kutuna bak','Gelen Kutusu bölümünde DijiMedu veya doğrulama yazarak ara.'],
   ['Spam klasörünü kontrol et','Sol üstte menüyü aç. Spam ve Tanıtımlar klasörlerine de bak.'],
   ['Mesajı aç, Spam değil de','DijiMedu e-postasını bulursan Spam değil seçeneğini kullan.'],
   ['Doğrulama bağlantısına dokun','E-postadaki Hesabımı doğrula düğmesine dokun; sonra uygulamaya dön.']
  ]},
  outlook:{title:'Outlook / Hotmail',badge:'O',link:'https://outlook.live.com/mail/0/',tip:'Outlook',steps:[
   ['Outlook uygulamasını aç','Telefonunda mavi O simgeli Outlook uygulamasını aç.'],
   ['Gelen kutunu kontrol et','Gelen Kutusu bölümünde DijiMedu e-postasını ara.'],
   ['Gereksiz klasörüne bak','Klasörler veya sol menüden Gereksiz E-postalar bölümünü aç.'],
   ['DijiMedu mesajını aç','E-postayı bulursan Gereksiz değil seçeneğiyle Gelen Kutusuna taşı.'],
   ['Doğrulama bağlantısına dokun','Mesajdaki Hesabımı doğrula bağlantısını aç; uygulamaya dön.']
  ]},
  other:{title:'Diğer e-posta',badge:'✉',link:null,tip:'E-posta',steps:[
   ['E-posta uygulamanı aç','Telefonundaki Mail, Yahoo veya kullandığın e-posta uygulamasını bul.'],
   ['Gelen kutunu kontrol et','Doğrulama veya DijiMedu kelimesiyle e-postalarını ara.'],
   ['Spam ve gereksize bak','Gereksiz, Spam ve Tanıtımlar gibi diğer klasörleri de kontrol et.'],
   ['Mesajı güvenli konuma taşı','Mesajı bulursan Spam değil ya da Gelen Kutusuna taşı seçeneğini seç.'],
   ['Doğrulama bağlantısına dokun','DijiMedu e-postasındaki doğrulama bağlantısını aç.']
  ]}
 };
 let screen=null,provider='',step=0,previous=null,owner='',resending=false,checking=false,lastStatus=null,signupPending='';
 const providerIcon=p=>'<span aria-hidden="true" class="deg-brand deg-'+p+'">'+providers[p].badge+'</span>';
 function status(msg,type=''){const el=screen?.querySelector('[data-eg-status]');if(el){el.textContent=msg;el.dataset.kind=type;}}
 function api(islem,payload={}){return fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',{
  method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
  body:JSON.stringify({islem,t:session(),...payload})
 }).then(async r=>{const d=await r.json();if(!r.ok||d.ok===false)throw Error(d.mesaj||d.message||'İşlem tamamlanamadı.');return d;});}
 function visual(index,p){
  const tip=providers[p].tip;
  if(index===0)return '<div class="deg-phone deg-phone-home"><div class="deg-phone-top">9:41 ◖◖◖</div><div class="deg-apps"><span>📷</span>'+providerIcon(p)+'<span>📸</span><span>📅</span></div><div class="deg-hint">Uygulamayı bul</div></div>';
  if(index===1)return '<div class="deg-phone"><div class="deg-phone-top">☰　'+tip+'　⌕</div><div class="deg-mail-row is-selected">📥 <b>Gelen Kutusu</b> <em>3</em></div><div class="deg-mail-row">✉　DijiMedu</div><div class="deg-mail-row muted">✉　Diğer mesaj</div></div>';
  if(index===2)return '<div class="deg-phone"><div class="deg-phone-top">☰　Klasörler</div><div class="deg-mail-row">📥　Gelen Kutusu</div><div class="deg-mail-row is-selected">⚠　'+(p==='outlook'?'Gereksiz E-posta':'Spam')+'</div><div class="deg-mail-row">⭐　Yıldızlı</div></div>';
  if(index===3)return '<div class="deg-phone"><div class="deg-phone-top">←　✉　⋮</div><div class="deg-mail-row">📨　<b>DijiMedu</b></div><div class="deg-mail-subject">E-posta adresini doğrula</div><div class="deg-fake-action">✓ Spam değil</div></div>';
  return '<div class="deg-phone"><div class="deg-phone-top">✉　DijiMedu</div><div class="deg-mail-subject">Hoş geldin!</div><div class="deg-fake-lines"></div><div class="deg-fake-action green">✓ Hesabımı doğrula</div></div>';
 }
 function renderChooser(){
  provider='';step=0;
  const wrap=screen.querySelector('[data-eg-content]');
  wrap.innerHTML='<div class="deg-hello"><h2>E-postanı doğrulayalım!</h2><p>Sana bir doğrulama e-postası gönderdik. Bulamazsan Papi ile beraber bulalım.</p></div>'+
    '<div class="deg-provider-box"><strong>💡 E-postam gelmedi, ne yapacağım?</strong><small>Kullandığın uygulamayı seç, sana adım adım gösterelim.</small>'+
    Object.keys(providers).map(p=>'<button type="button" class="deg-provider" data-eg-provider="'+p+'">'+providerIcon(p)+'<span>'+providers[p].title+'</span><b aria-hidden="true">›</b></button>').join('')+'</div>'+
    '<button type="button" class="deg-main" data-eg-app-open>✉ E-posta uygulamasını aç</button>'+
    '<button type="button" class="deg-secondary" data-eg-resend>↻ Doğrulama e-postasını tekrar gönder</button>'+
    '<button type="button" class="deg-text-action" data-eg-change>✎ E-posta adresimi değiştir</button>';
  wrap.querySelectorAll('[data-eg-provider]').forEach(b=>b.addEventListener('click',()=>renderSteps(b.dataset.egProvider,0)));
  bindCommon(wrap);
 }
 function renderSteps(type,num=0){
  if(!providers[type])return renderChooser();
  provider=type;step=Math.min(4,Math.max(0,num));const info=providers[type],current=info.steps[step];
  const wrap=screen.querySelector('[data-eg-content]');
  wrap.innerHTML='<div class="deg-track"><button type="button" class="deg-back" data-eg-back aria-label="Uygulama seçimine dön">‹</button>'+
   '<h2>'+info.title+' ile doğrula</h2><span>'+String(step+1)+' / 5</span></div>'+
   '<div class="deg-progress" aria-label="Adım '+(step+1)+'/5">'+info.steps.map((_,i)=>'<button type="button" aria-label="'+(i+1)+'. adıma git" data-eg-step="'+i+'" class="'+(i===step?'active':'')+'"></button>').join('')+'</div>'+
   '<div class="deg-step-card"><div class="deg-step-heading"><span class="deg-count">'+(step+1)+'</span><div><strong>'+current[0]+'</strong><p>'+current[1]+'</p></div></div>'+
   '<div class="deg-simulator" role="img" aria-label="'+info.title+' uygulamasında '+current[0]+' için temsilî ekran">'+visual(step,type)+'</div>'+
   '<div class="deg-papi-note">🦜 <span>'+(step===0?'Önce e-posta uygulamanı açalım!':step===4?'Harika! Bağlantıya dokunduktan sonra geri gel.':'Harika gidiyorsun, sıradaki adıma geç!')+'</span></div></div>'+
   '<div class="deg-step-nav"><button type="button" data-eg-prev '+(step===0?'disabled':'')+'>← Geri</button><button type="button" class="deg-main" data-eg-next>'+(step===4?'Tamam, kontrol et ✓':'İleri →')+'</button></div>'+
   '<button type="button" class="deg-secondary" data-eg-app-open>'+(info.link?'✉ E-postanı aç':'✉ Mail uygulamasını nasıl açarım?')+'</button>'+
   '<button type="button" class="deg-text-action" data-eg-resend>↻ E-postayı tekrar gönder</button>';
  wrap.querySelector('[data-eg-back]').onclick=renderChooser;
  wrap.querySelectorAll('[data-eg-step]').forEach(b=>b.onclick=()=>renderSteps(type,Number(b.dataset.egStep)));
  wrap.querySelector('[data-eg-prev]').onclick=()=>renderSteps(type,step-1);
  wrap.querySelector('[data-eg-next]').onclick=()=>step===4?check():renderSteps(type,step+1);
  bindCommon(wrap);
 }
 function bindCommon(wrap){
  wrap.querySelector('[data-eg-app-open]')?.addEventListener('click',()=>{
   const link=providers[provider]?.link;
   if(!link){status('Telefonundaki Mail uygulamasını ana ekrandan aç. E-posta kutunu kontrol et.','info');return;}
   // A user gesture opens the actual mailbox in browser or an installed app if
   // the device associates the link with it; do not open an empty compose form.
   window.open(link,'_blank','noopener,noreferrer');
   status('Yeni sekmede e-postanı aç. Uygulaman otomatik açılmazsa telefonunun ana ekranından simgesine dokun.','info');
  });
  wrap.querySelector('[data-eg-resend]')?.addEventListener('click',resend);
  wrap.querySelector('[data-eg-change]')?.addEventListener('click',()=>{
   if(typeof window.kisiselBilgilerAc==='function'){close();window.kisiselBilgilerAc();}
   else status('Profil > Kişisel Bilgiler bölümünden kayıtlı e-postanı değiştirebilirsin.','info');
  });
 }
 function close(){
  if(!screen)return;const el=screen;screen=null;el.remove();
  try{previous?.focus?.({preventScroll:true})}catch{}
  previous=null;
 }
 function open(source='help'){
  if(!document.body)return;
  close();previous=document.activeElement;
  owner=account();screen=document.createElement('div');screen.id='dmEmailGuide';screen.className='deg-overlay';
  screen.innerHTML='<section class="deg-dialog" role="dialog" aria-modal="true" aria-labelledby="degTitle">'+
   '<div class="deg-hero"><img src="papi-welcome-v2.png" alt="Papi yardım ediyor"><div><b>DijiMedu</b><h1 id="degTitle">E-posta doğrulama yardımı</h1><span>Papi sana yardımcı olacak 💚</span></div><button type="button" class="deg-close" aria-label="Rehberi kapat">×</button></div>'+
   '<div class="deg-scroll"><div data-eg-content></div><p class="deg-live" role="status" aria-live="polite" data-eg-status></p>'+
   '<button class="deg-later" type="button" data-eg-later>Şimdilik devam et</button></div></section>';
  screen.addEventListener('click',e=>{if(e.target===screen)close();});
  screen.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();close();}
   if(e.key==='Tab'){const buttons=[...screen.querySelectorAll('button:not([disabled])')].filter(b=>b.getClientRects().length);
    const i=buttons.indexOf(document.activeElement);if(!buttons.length)return;
    if(e.shiftKey&&i===0){e.preventDefault();buttons.at(-1).focus();}
    else if(!e.shiftKey&&i===buttons.length-1){e.preventDefault();buttons[0].focus();}
   }
  });
  screen.querySelector('.deg-close').onclick=close;screen.querySelector('[data-eg-later]').onclick=close;
  document.body.appendChild(screen);renderChooser();
  if(source==='signup')status('Kayıt tamamlandı! Veli e-postanı doğrulamak için bu adımları izleyebilirsin.','info');
  screen.querySelector('.deg-close').focus({preventScroll:true});
 }
 async function resend(){
  if(resending||!signedIn()){status('Önce öğrenci hesabına giriş yapman gerekiyor.','error');return;}
  resending=true;const a=account();const list=[...screen.querySelectorAll('[data-eg-resend]')];list.forEach(b=>b.disabled=true);
  status('Doğrulama bağlantısı isteniyor…','info');
  try{
   const result=await api('memberEmailResend');
   if(a!==account())return close();
   status(result.verified?'Bu e-posta zaten doğrulanmış.':result.mesaj||'Yeni e-posta gönderildi.',result.verified?'success':'info');
   if(result.verified)document.dispatchEvent(new Event('dm:email-guide-updated'));
  }catch(e){status(e.message||'E-posta gönderilemedi.','error');}
  finally{resending=false;list.forEach(b=>{if(b.isConnected)b.disabled=false;});}
 }
 async function check(){
  if(checking||!signedIn()){status('Önce hesabına giriş yap.','info');return;}
  checking=true;const name=account();status('Doğrulama durumu kontrol ediliyor…','info');
  try{const d=await api('memberStatus');if(name!==account())return close();
    if(d.emailVerified){lastStatus=d;status('Tebrikler! E-posta adresin doğrulandı. 🎉','success');document.dispatchEvent(new Event('dm:email-guide-updated'));setTimeout(close,1100);}
    else status('Henüz doğrulanmadı. E-postadaki bağlantıya dokunup tekrar kontrol et.','info');
  }catch(e){status(e.message||'Kontrol şu an yapılamıyor.','error');}
  finally{checking=false;}
 }
 function profileCard(){
  const root=$('tab-profil');if(!root)return;
  let card=$('dmEmailSecurityCard');
  const d=window.dmMemberBadgeStatus;
  if(!signedIn()||!d||d.owner&&locale(d.owner)!==locale(account())){card?.remove();return;}
  if(!card){card=document.createElement('div');card.id='dmEmailSecurityCard';card.className='deg-security-card';
   const area=root.querySelector('.pr-kap')||root;area.append(card);}
  const verified=!!d.emailVerified;
  card.replaceChildren();
  const header=document.createElement('strong');header.textContent='✉ Hesap Güvenliği';card.append(header);
  const detail=document.createElement('p');detail.textContent=verified?'✓ E-posta adresin doğrulandı.':'⚠ E-posta adresin henüz doğrulanmadı.';card.append(detail);
  if(!verified){
   const help=document.createElement('button');help.type='button';help.textContent='📖 E-posta doğrulama yardımını aç';help.onclick=()=>open('profile');
   const send=document.createElement('button');send.type='button';send.textContent='↻ Doğrulama e-postasını tekrar gönder';send.onclick=()=>{open('profile');resend();};
   const edit=document.createElement('button');edit.type='button';edit.textContent='✎ E-posta adresimi değiştir';edit.onclick=()=>{window.kisiselBilgilerAc?.();};
   card.append(help,send,edit);
  }
 }
 function helpEntry(){
  const dialog=$('yardimModal');if(!dialog)return;
  const root=dialog.querySelector('.yardim-topbar')||dialog.querySelector('.yardim-frame')||dialog;
  if(root.querySelector('#dmEmailGuideHelpEntry'))return;
  const btn=document.createElement('button');btn.type='button';btn.id='dmEmailGuideHelpEntry';btn.className='deg-help-entry';
  btn.textContent='📨 E-posta doğrulama rehberi';btn.onclick=()=>{window.yardimKapat?.();open('help');};
  root.append(btn);
 }
 function setup(){
  profileCard();helpEntry();
  document.addEventListener('dm:member-status',profileCard);
  document.addEventListener('dm:login',()=>{close();setTimeout(()=>{profileCard();showPending();},1400);});
  document.addEventListener('dm:email-guide-updated',()=>{window.dmMemberExperience?.check?.(true,true);setTimeout(profileCard,700);});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-ekran="tab-profile-menu"],[aria-label="Profil"]'))setTimeout(profileCard,180);},true);
  window.addEventListener('focus',()=>{if(screen&&signedIn())check();});
  // Registration is successful only when the server returns a new, authenticated
  // student token. No help screen is shown after failed registration.
  const nativeFetch=window.fetch;
  window.fetch=function(url,opt){
   let request;try{request=typeof opt?.body==='string'?JSON.parse(opt.body):null;}catch{}
   const response=nativeFetch.apply(this,arguments);
   if(request&&['kayitOl','googleKayit'].includes(request.islem)){
    response.then(r=>r.clone().json()).then(d=>{
     if(d?.token&&(d.status==='success'||d.kayitOlustu)&&d.ogrenci){
      signupPending=locale(d.ogrenci);
      try{sessionStorage.setItem('dm_email_signup_pending',signupPending);}catch{}
      setTimeout(showPending,1900);
     }
    }).catch(()=>{});
   }
   return response;
  };
  setTimeout(showPending,2300);
 }
 function showPending(){
  let pending=signupPending;
  try{pending=pending||sessionStorage.getItem('dm_email_signup_pending')||'';}catch{}
  if(!pending||!signedIn()||locale(account())!==pending)return;
  const visible=$('panel-alani')?.style.display==='block';
  if(!visible){setTimeout(showPending,1100);return;}
  signupPending='';
  try{sessionStorage.removeItem('dm_email_signup_pending');}catch{}
  if(window.dmMemberBadgeStatus?.emailVerified)return;
  open('signup');
 }
 window.dmEmailGuide={open,openProvider:(p)=>{open('help');renderSteps(p,0);},close,resend,check,profileCard};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
