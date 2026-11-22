/* Parent transitions and home practice use explicit student/parent sessions. */
(()=>{
 'use strict';
 const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
 let dialog=null;
 async function call(islem,extra={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({islem,t:localStorage.getItem('ing_token')||'',...extra})});const result=await response.json();if(!response.ok||result.ok===false)throw Error(result.mesaj||'İşlem tamamlanamadı.');return result;}finally{clearTimeout(timer);}
 }
 function close(){dialog?.remove();dialog=null;}
 function open(){
  close();dialog=document.createElement('dialog');dialog.className='dm-parent-dialog';
  dialog.innerHTML='<form method="dialog"><button class="dm-parent-close" aria-label="Kapat">×</button></form><h2>Veli Hesabına Geç</h2><p>Aynı e-posta adresindeki veli hesabının 6 haneli kodunu gir.</p><form data-parent-switch><label>Veli geçiş kodu<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="off"></label><button type="submit">Veli Hesabına Geç</button></form><button type="button" data-parent-code>Veli Bağlama Kodumu Al</button><p>Farklı e-postadaki velin bu kodla hesabını bağlayabilir.</p><a href="veli-paneli.html?ogrenci=1">Evde Pratik Çalışmalarım</a><p class="dm-parent-message" role="status"></p>';
  document.body.append(dialog);dialog.showModal();
  const message=text=>{dialog.querySelector('.dm-parent-message').textContent=text;};
  dialog.querySelector('[data-parent-switch]').onsubmit=async event=>{
   event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
   try{const pin=new FormData(event.target).get('pin');const result=await call('parentSwitch',{pin});localStorage.setItem('dm_parent_session_v1',result.token);location.assign('veli-paneli.html');}catch(e){message(e.message);}finally{button.disabled=false;}
  };
  dialog.querySelector('[data-parent-code]').onclick=async event=>{
   const button=event.currentTarget;button.disabled=true;
   try{const result=await call('parentStudentCode');message('Veli bağlama kodun '+result.code+'. 24 saat geçerli. Öğrenci geçiş kodun da e-postana gönderildi.');}catch(e){message(e.message);}finally{button.disabled=false;}
  };
 }
 function mount(){
  if(window.dmTeacherPortalMode||!localStorage.getItem('ing_token'))return;
  const agenda=document.querySelector('.rt-agenda');
  if(agenda&&!agenda.parentElement.querySelector('.dm-parent-switch')){
   const group=document.createElement('div');group.className='dm-parent-route-tools';
   const button=document.createElement('button');button.type='button';button.className='dm-parent-switch';button.textContent='Veli Hesabına Geç';button.onclick=open;
   const practice=document.createElement('a');practice.href='veli-paneli.html?ogrenci=1';practice.textContent='Evde Pratik';
   group.append(button,practice);agenda.after(group);
  }
  const profile=document.querySelector('#tab-profil #dmForestActions');
  if(profile&&!profile.querySelector('[data-parent-profile]')){
   const button=document.createElement('button');button.type='button';button.dataset.parentProfile='1';button.className='header-btn';button.textContent='Veli Bağlantısı';button.onclick=open;profile.append(button);
  }
 }
 const style=document.createElement('style');style.textContent='.dm-parent-route-tools{display:grid;gap:6px;margin-top:7px}.dm-parent-switch,.dm-parent-route-tools>a{border:1px solid #819aaa;background:#edf9f5;color:#12334a;border-radius:12px;min-height:42px;padding:10px 12px;font:700 12px system-ui;text-align:center;text-decoration:none;cursor:pointer}.dm-parent-dialog{max-width:min(430px,calc(100vw - 32px));max-height:85dvh;overflow:auto;border:1px solid #cfdae7;border-radius:22px;padding:24px;color:#142039;background:#f4f9fc;font:15px/1.5 system-ui;z-index:2147483647}.dm-parent-dialog::backdrop{background:#12304780;backdrop-filter:blur(6px)}.dm-parent-dialog h2{font-size:23px;color:#142039}.dm-parent-dialog p{color:#40536a}.dm-parent-dialog input{display:block;width:100%;padding:12px;border:1px solid #8797ac;border-radius:10px;font-size:20px;letter-spacing:7px;background:white;color:#142039;margin:8px 0}.dm-parent-dialog button:not(.dm-parent-close){display:block;width:100%;min-height:45px;margin:12px 0;padding:12px;border:1px solid #006e68;border-radius:11px;background:#006e68;color:white;font-weight:700;cursor:pointer}.dm-parent-dialog a{color:#005a58}.dm-parent-close{float:right;border:0;background:none;font-size:26px;color:#142039;cursor:pointer}.dm-parent-message{overflow-wrap:anywhere}';document.head.append(style);
 let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount();});};
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('dm:login',schedule);schedule();
})();
