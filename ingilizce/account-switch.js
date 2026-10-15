/* Switch account without discarding the current session before verification. */
(function(){
 'use strict';
 const get=id=>document.getElementById(id);
 let switching=false,previousFocus=null,previousDisplay='',previousRole=null,previousAriaModal=null,previousAriaLabel=null;
 function keydown(event){
  if(!switching)return;
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const login=get('login-container'),cancel=get('dmSwitchCancel');
  const nodes=[...(login?.querySelectorAll('input:not([disabled]),button:not([disabled]),select:not([disabled]),a[href]')||[])];
  const closeButton=get('dmSwitchClose');if(closeButton)nodes.unshift(closeButton);
  if(cancel)nodes.push(cancel);
  const visible=nodes.filter(el=>el.getClientRects().length>0);
  if(!visible.length)return;
  const first=visible[0],last=visible[visible.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 function close(){
  if(!switching)return;
  switching=false;window.dmAccountSwitchPending=false;
  document.removeEventListener('keydown',keydown);
  document.body.classList.remove('dm-switch-active');
  const pass=get('sifre');if(pass)pass.value='';
  const login=get('login-container');
  if(login){
   login.style.display=previousDisplay;
   if(previousRole===null)login.removeAttribute('role');else login.setAttribute('role',previousRole);
   if(previousAriaModal===null)login.removeAttribute('aria-modal');else login.setAttribute('aria-modal',previousAriaModal);
   if(previousAriaLabel===null)login.removeAttribute('aria-label');else login.setAttribute('aria-label',previousAriaLabel);
  }
  const msg=get('mesaj');if(msg)msg.textContent='';
  get('dmSwitchSaved')?.remove();get('dmSwitchCancel')?.remove();get('dmSwitchBackdrop')?.remove();get('dmSwitchTitle')?.remove();get('dmSwitchClose')?.remove();
  if(previousFocus?.isConnected)previousFocus.focus();
  previousFocus=null;
 }
 function savedList(form){
  get('dmSwitchSaved')?.remove();
  const store=window.dmSavedSessions;if(!store)return;
  store.remember();
  const section=document.createElement('section');section.id='dmSwitchSaved';
  const title=document.createElement('h3');title.textContent='Bu cihazdaki hesaplar';section.appendChild(title);
  const status=document.createElement('p');status.setAttribute('role','status');status.className='dm-saved-status';
  const active=store.current();
  for(const entry of store.list()){
   const row=document.createElement('div');row.className='dm-saved-row';
   const button=document.createElement('button');button.type='button';button.className='dm-saved-account';
   const name=document.createElement('strong');name.textContent=entry.name;
   const info=document.createElement('small');info.textContent=entry.token===active.token?'Şu an açık':(entry.role==='ogretmen'?'Öğretmen · Dokun ve geç':'Öğrenci · Dokun ve geç');
   button.append(name,info);button.disabled=entry.token===active.token;
   button.onclick=async()=>{
    section.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Oturum kontrol ediliyor…';
    try{await store.activate(entry);}catch(error){
     savedList(form);const message=get('dmSwitchSaved')?.querySelector('[role="status"]');if(message)message.textContent=error.message;
     if(get('ogrenci'))get('ogrenci').value=entry.name;
    }
   };
   row.appendChild(button);
   if(entry.token!==active.token){
    const remove=document.createElement('button');remove.type='button';remove.className='dm-saved-remove';remove.textContent='Kaldır';remove.setAttribute('aria-label',entry.name+' hesabından bu cihazda çıkış yap');
    remove.onclick=async()=>{remove.disabled=true;try{await store.remove(entry);savedList(form);}catch(error){status.textContent=error.message;remove.disabled=false;}};
    row.appendChild(remove);
   }
   section.appendChild(row);
  }
  section.appendChild(status);
  const label=document.createElement('p');label.className='dm-saved-add';label.textContent='Başka bir hesap ekle';section.appendChild(label);
  form.before(section);
 }
 function open(){
  if(switching)return;
  const panel=get('panel-alani'),login=get('login-container'),form=get('loginForm');
  if(!panel||!login||!form)return;
  previousFocus=document.activeElement;
  previousDisplay=login.style.display;
  previousRole=login.getAttribute('role');
  previousAriaModal=login.getAttribute('aria-modal');
  previousAriaLabel=login.getAttribute('aria-label');
  switching=true;window.dmAccountSwitchPending=true;
  const shade=document.createElement('div');shade.id='dmSwitchBackdrop';
  shade.setAttribute('role','presentation');shade.addEventListener('click',close);
  document.body.appendChild(shade);
  document.body.classList.add('dm-switch-active');
  login.setAttribute('role','dialog');
  login.setAttribute('aria-modal','true');
  login.setAttribute('aria-label','Hesap değiştir');
  login.style.display='block';
  const heading=document.createElement('div');heading.id='dmSwitchTitle';
  heading.innerHTML='<span class="dm-switch-symbol" aria-hidden="true">⇄</span><span><strong>Hesap Değiştir</strong><small>Yeni hesaba güvenle geç</small></span>';
  const x=document.createElement('button');x.type='button';x.id='dmSwitchClose';x.textContent='×';x.setAttribute('aria-label','Pencereyi kapat');x.addEventListener('click',close);
  heading.appendChild(x);form.before(heading);
  savedList(form);
  const btn=document.createElement('button');btn.type='button';btn.id='dmSwitchCancel';
  btn.textContent='İptal · Mevcut hesabıma dön';btn.addEventListener('click',close);
  form.after(btn);
  const msg=get('mesaj');if(msg)msg.textContent='Geçmek istediğin hesabın kullanıcı adı ve şifresini gir. Başarılı girişe kadar mevcut oturumun korunur.';
  const pass=get('sifre');if(pass)pass.value='';
  document.addEventListener('keydown',keydown);
  (get('ogrenci')||btn).focus();
 }
 function install(){
  if(get('dmAccountSwitchButton'))return;
  const exit=document.querySelector('.header-btn.btn-cikis');
  if(!exit)return;
  const button=document.createElement('button');button.type='button';
  button.id='dmAccountSwitchButton';button.className=exit.className;
  button.innerHTML='<span aria-hidden="true">⇄</span> Hesap Değiştir';
  button.addEventListener('click',open);
  exit.parentElement.insertBefore(button,exit);
 }
 window.dmHesapDegistirAc=open;
 document.addEventListener('DOMContentLoaded',install);
 if(document.readyState!=='loading')install();
})();
