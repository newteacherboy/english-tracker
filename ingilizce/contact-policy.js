(function(){
  'use strict';
  const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
  let token='',checking=false,deadline=0,deadlineTimer=null,focusBefore=null;
  function studentToken(){try{return sessionStorage.getItem('ing_ogr_token')?'':localStorage.getItem('ing_token')||'';}catch{return '';}}
  function remove(id){document.getElementById(id)?.remove();}
  function styles(){if(document.getElementById('cpStyle'))return;const s=document.createElement('style');s.id='cpStyle';s.textContent=`.cp-banner{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:12px;right:12px;z-index:10000000;max-width:620px;margin:auto;padding:14px;background:#fff3cd;border:2px solid #e8bc51;border-radius:18px;color:#4b390d;box-shadow:0 8px 30px #153e3630;animation:cpDown .25s ease-out}.cp-banner p{font-weight:800;font-size:14px;line-height:1.4;margin:0 0 10px}.cp-banner button,.cp-block button{padding:10px 14px;border:0;border-radius:12px;background:#147e64;color:white;font:800 14px inherit;cursor:pointer;margin-right:8px}.cp-banner .cp-dismiss{background:#ecdfb1;color:#584314}.cp-block{position:fixed;inset:0;z-index:100000000;background:#fffdf4;display:flex;align-items:center;justify-content:center;padding:20px;color:#174839}.cp-card{max-width:450px;text-align:center}.cp-card h2{margin:15px 0;font-size:24px}.cp-card p{margin:12px 0;line-height:1.6}.cp-card img{width:110px;border-radius:50%}@keyframes cpDown{from{transform:translateY(-120%)}to{transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.cp-banner{animation:none}}`;document.head.appendChild(s);}
  function clear(){
    window.dmContactFrozen=false;deadline=0;clearTimeout(deadlineTimer);remove('cpBanner');remove('cpBlock');
    document.querySelectorAll('[data-cp-inert]').forEach(el=>{el.inert=false;el.removeAttribute('data-cp-inert');});
    if(focusBefore?.isConnected)focusBefore.focus();focusBefore=null;
  }
  function freeze(){
    if(!studentToken())return clear();
    styles();remove('cpBanner');window.dmContactFrozen=true;
    if(document.getElementById('cpBlock'))return;
    focusBefore=document.activeElement;
    const p=document.createElement('div');p.id='cpBlock';p.className='cp-block';p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label','İletişim bilgilerini tamamla');
    p.innerHTML='<div class="cp-card"><img src="papi-app-icon-v3.png" alt="Medu"><h2>Hesap bilgilerini tamamla</h2><p>15 günlük süren doldu. Devam etmek için hesap bilgilerine geçerli bir telefon ve e-posta adresi ekle. Bilgilerin kaydedilince uygulama yeniden açılır.</p><button type="button" id="cpComplete">Hesap bilgilerimi aç</button></div>';
    document.body.appendChild(p);
    // Background controls cannot receive taps or keyboard focus while the account is frozen.
    [...document.body.children].forEach(el=>{if(!el.inert && el!==p && !el.classList.contains('kb-perde') && !['SCRIPT','STYLE','LINK'].includes(el.tagName)){el.inert=true;el.setAttribute('data-cp-inert','1');}});
    p.querySelector('button').onclick=()=>window.kisiselBilgilerAc?.({zorunlu:true});
    p.querySelector('button').focus();
    window.kisiselBilgilerAc?.({zorunlu:true});
  }
  function show(s){
    if(!s.eksik)return clear();
    deadline=Date.parse(s.sonTarih||'');clearTimeout(deadlineTimer);
    if(s.donuk || (Number.isFinite(deadline)&&deadline<=Date.now()))return freeze();
    if(Number.isFinite(deadline))deadlineTimer=setTimeout(freeze,Math.min(2147483647,Math.max(1,deadline-Date.now())));
    if(!s.uyari)return;
    styles();remove('cpBanner');
    const p=document.createElement('div');p.id='cpBanner';p.className='cp-banner';p.setAttribute('role','alert');
    p.innerHTML='<p></p><button class="cp-open" type="button">Bilgilerimi tamamla</button><button class="cp-dismiss" type="button">Bugün kapat</button>';
    p.querySelector('p').textContent=`Telefon ve e-postanı hesap bilgilerinden tamamla. ${s.kalanGun} günün kaldı; süre bitince uygulamaya devam etmek için bu bilgiler gerekli.`;
    p.querySelector('.cp-open').onclick=()=>{p.remove();window.kisiselBilgilerAc?.();};p.querySelector('.cp-dismiss').onclick=()=>p.remove();document.body.appendChild(p);
  }
  async function check(){
    const t=studentToken();
    if(!t){token='';return clear();}
    if(checking)return;
    if(token!==t){clear();token=t;}
    checking=true;
    try{
      const r=await fetch(API,{method:'POST',body:JSON.stringify({islem:'iletisimDurumu',t})});const s=await r.json();
      if(studentToken()===t&&s.ok)show(s);
    }catch{}finally{checking=false;}
  }
  document.addEventListener('dm:contact-block',e=>{if(studentToken())show(e.detail);});
  document.addEventListener('dm:login',check);
  document.addEventListener('dm:kisisel-bilgiler',()=>{clear();check();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  window.addEventListener('storage',check);
  setInterval(()=>{if(!document.hidden)check();},600000);setTimeout(check,500);
})();
