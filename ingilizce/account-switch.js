/* A single account picker. The existing password form is moved only while adding an account. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 let dialog=null,previousFocus=null,marker=null,form=null,attempt=null,formControl=null,managing=false;
 function keydown(event){
  if(!dialog)return;
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const nodes=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);
  if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 function restoreForm(){
  if(marker&&form){marker.replaceWith(form);marker=null;}
  if($('sifre'))$('sifre').value='';
  if($('mesaj'))$('mesaj').textContent='';
 }
 function close(){
  attempt?.abort();attempt=null;formControl?.abort();formControl=null;window.dmSwitchLoginSignal=null;
  formControl?.abort();formControl=null;window.dmSwitchLoginSignal=null;
  restoreForm();window.dmAccountSwitchPending=false;
  document.removeEventListener('keydown',keydown);
  dialog?.parentElement.remove();dialog=null;
  document.body.classList.remove('dm-switch-active');
  if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;
 }
 function message(text){const node=$('dmSwitchStatus');if(node)node.textContent=text;}
 function addAccount(name=''){
  if(!dialog)return;
  attempt?.abort();attempt=null;
  $('dmSwitchAccounts').hidden=true;$('dmSwitchAdd').hidden=true;$('dmSwitchManage').hidden=true;
  $('dmSwitchBack').hidden=false;
  const target=$('dmSwitchForm');target.hidden=false;
  if(!marker){marker=document.createComment('account-switch-form');form.before(marker);target.append(form);}
  formControl?.abort();formControl=new AbortController();window.dmSwitchLoginSignal=formControl.signal;
  window.dmAccountSwitchPending=true;
  if($('ogrenci'))$('ogrenci').value=name;
  if($('sifre'))$('sifre').value='';
  if($('girisBtn')){$('girisBtn').disabled=false;$('girisBtn').textContent='Giriş yap ve geç';}
  message(name?'Oturum sona ermiş. Şifrenle yeniden giriş yap.':'Mevcut hesabın açık kalacak.');
  (name?$('sifre'):$('ogrenci'))?.focus();
 }
 function accounts(){
  if(!dialog)return;
  formControl?.abort();formControl=null;window.dmSwitchLoginSignal=null;
  restoreForm();window.dmAccountSwitchPending=false;
  $('dmSwitchForm').hidden=true;$('dmSwitchAccounts').hidden=false;$('dmSwitchAdd').hidden=false;$('dmSwitchManage').hidden=false;$('dmSwitchBack').hidden=true;
  const store=window.dmSavedSessions,area=$('dmSwitchAccounts');area.replaceChildren();store?.remember();const active=store?.current();
  $('dmSwitchManage').textContent=managing?'Bitti':'Düzenle';
  for(const entry of store?.list()||[]){
   const current=entry.token===active?.token,row=document.createElement('div');row.className='dm-account-row'+(current?' is-current':'');
   const button=document.createElement('button');button.type='button';button.className='dm-account-choice';button.disabled=current;
   const avatar=document.createElement('span');avatar.className='dm-account-initial';avatar.setAttribute('aria-hidden','true');avatar.textContent=entry.name.trim().slice(0,1).toLocaleUpperCase('tr');
   const label=document.createElement('span');label.className='dm-account-label';
   const name=document.createElement('strong');name.textContent=entry.name;
   const info=document.createElement('small');info.textContent=current?'Şu an bu hesaptasın':entry.role==='ogretmen'?'Öğretmen hesabı':'Öğrenci hesabı';label.append(name,info);
   const end=document.createElement('span');end.className='dm-account-end';end.textContent=current?'✓':'›';end.setAttribute('aria-hidden','true');button.append(avatar,label,end);
   button.onclick=async()=>{
    if(attempt)return;attempt=new AbortController();const run=attempt;
    area.querySelectorAll('button').forEach(b=>b.disabled=true);button.classList.add('is-loading');end.textContent='…';message(entry.name+' hesabı açılıyor…');
    try{await store.activate(entry,{signal:run.signal});}
    catch(error){if(dialog&&attempt===run){attempt=null;if(error.expired)addAccount(entry.name);else{accounts();message(error.message);}}}
   };
   row.append(button);
   if(managing&&!current){const remove=document.createElement('button');remove.type='button';remove.className='dm-account-remove';remove.textContent='Kaldır';remove.setAttribute('aria-label',entry.name+' hesabından bu cihazda çıkış yap');remove.onclick=async()=>{remove.disabled=true;try{await store.remove(entry);if(dialog)accounts();}catch(error){if(dialog){remove.disabled=false;message(error.message);}}};row.append(remove);}
   area.append(row);
  }
  if(!area.children.length){const empty=document.createElement('p');empty.className='dm-account-empty';empty.textContent='Henüz kayıtlı hesap yok. Bir hesap ekleyebilirsin.';area.append(empty);}
 }
 function open(){
  if(dialog)return;form=$('loginForm');if(!form||!window.dmSavedSessions)return;
  previousFocus=document.activeElement;managing=false;
  const shade=document.createElement('div');shade.id='dmSwitchBackdrop';
  shade.innerHTML='<section id="dmSwitchDialog" role="dialog" aria-modal="true" aria-labelledby="dmSwitchTitle"><header class="dm-switch-header"><span class="dm-switch-emblem" aria-hidden="true">⇄</span><button type="button" id="dmSwitchClose" aria-label="Pencereyi kapat">×</button><h2 id="dmSwitchTitle">Hesap değiştir</h2><p>Devam etmek istediğin hesabı seç.</p></header><div class="dm-switch-content"><div class="dm-switch-listbar"><button type="button" id="dmSwitchBack" hidden>‹ Hesaplara dön</button><button type="button" id="dmSwitchManage">Düzenle</button></div><div id="dmSwitchAccounts"></div><div id="dmSwitchForm" hidden></div><p id="dmSwitchStatus" role="status" aria-live="polite"></p><button type="button" id="dmSwitchAdd"><span aria-hidden="true">＋</span> Başka hesap ekle</button></div><footer><button type="button" id="dmSwitchCancel">Vazgeç</button><small>Yalnızca bu cihazdaki açık hesaplar</small></footer></section>';
  document.body.append(shade);dialog=$('dmSwitchDialog');document.body.classList.add('dm-switch-active');
  $('dmSwitchClose').onclick=close;$('dmSwitchCancel').onclick=close;$('dmSwitchBack').onclick=()=>{attempt?.abort();attempt=null;accounts();message('');};
  $('dmSwitchAdd').onclick=()=>addAccount();$('dmSwitchManage').onclick=()=>{if(attempt)return;managing=!managing;accounts();};
  shade.onclick=e=>{if(e.target===shade)close();};
  document.addEventListener('keydown',keydown);accounts();$('dmSwitchClose').focus();
 }
 function install(){if($('dmAccountSwitchButton'))return;const exit=document.querySelector('.header-btn.btn-cikis');if(!exit)return;const button=document.createElement('button');button.id='dmAccountSwitchButton';button.type='button';button.className=exit.className;button.textContent='⇄ Hesap Değiştir';button.onclick=open;exit.before(button);}
 window.dmHesapDegistirAc=open;
 document.addEventListener('DOMContentLoaded',install);if(document.readyState!=='loading')install();
})();
