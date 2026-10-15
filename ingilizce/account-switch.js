/* Switch account without discarding the current session before verification. */
(function(){
 'use strict';
 const get=id=>document.getElementById(id);
 let switching=false;
 function close(){
  if(!switching)return;
  switching=false;window.dmAccountSwitchPending=false;
  document.body.classList.remove('dm-switch-active');
  const pass=get('sifre');if(pass)pass.value='';
  const login=get('login-container');if(login)login.style.display='none';
  const msg=get('mesaj');if(msg)msg.textContent='';
  get('dmSwitchCancel')?.remove();get('dmSwitchBackdrop')?.remove();
 }
 function open(){
  if(switching)return;
  if(!get('panel-alani')||!get('login-container'))return;
  switching=true;window.dmAccountSwitchPending=true;
  const shade=document.createElement('div');shade.id='dmSwitchBackdrop';
  shade.setAttribute('role','presentation');shade.addEventListener('click',close);
  document.body.appendChild(shade);
  document.body.classList.add('dm-switch-active');
  const login=get('login-container');login.style.display='block';
  const btn=document.createElement('button');btn.type='button';btn.id='dmSwitchCancel';
  btn.textContent='← Mevcut hesabıma dön';btn.addEventListener('click',close);
  get('loginForm')?.after(btn);
  const msg=get('mesaj');if(msg)msg.textContent='Geçmek istediğin hesabın kullanıcı adı ve şifresini gir.';
  const pass=get('sifre');if(pass)pass.value='';
  get('ogrenci')?.focus();
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
