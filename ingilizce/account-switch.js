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
  get('dmSwitchCancel')?.remove();get('dmSwitchBackdrop')?.remove();
  if(previousFocus?.isConnected)previousFocus.focus();
  previousFocus=null;
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
  const btn=document.createElement('button');btn.type='button';btn.id='dmSwitchCancel';
  btn.textContent='← Mevcut hesabıma dön';btn.addEventListener('click',close);
  form.after(btn);
  const msg=get('mesaj');if(msg)msg.textContent='Geçmek istediğin hesabın kullanıcı adı ve şifresini gir.';
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
  button.textContent='⇄ Hesap Değiştir';
  button.addEventListener('click',open);
  exit.parentElement.insertBefore(button,exit);
 }
 window.dmHesapDegistirAc=open;
 document.addEventListener('DOMContentLoaded',install);
 if(document.readyState!=='loading')install();
})();
