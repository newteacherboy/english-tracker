(function(){'use strict';
 window.dmHesapAyarlariAc=function(){
  if(document.getElementById('dmAccountSettings'))return;
  const previous=document.activeElement,overlay=document.createElement('div');overlay.id='dmAccountSettings';overlay.className='dm-account-overlay';
  overlay.innerHTML='<section class="dm-account-card" role="dialog" aria-modal="true" aria-labelledby="dmAccountTitle"><button class="dm-account-close" aria-label="Hesap ayarlarını kapat">×</button><h2 id="dmAccountTitle">Hesap ayarları</h2><p>Bilgilerini, giriş ayarlarını ve hesabını buradan yönet.</p><button class="dm-account-password dm-account-info" data-is="bilgi">👤 Kişisel bilgiler</button><button class="dm-account-password" data-is="sifre">🔑 Şifremi değiştir</button><a class="dm-account-privacy" href="gizlilik.html">Gizlilik ve kişisel veriler</a><a class="dm-account-delete" href="hesap-sil.html">Hesabımı sil</a><small>Silme talebi ayrı bir sayfada doğrulanır.</small></section>';
  document.body.append(overlay);
  const close=()=>{document.removeEventListener('keydown',key);overlay.remove();previous?.focus();};
  function key(e){if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const f=[...overlay.querySelectorAll('button,a')],first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  document.addEventListener('keydown',key);overlay.querySelector('.dm-account-close').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close();};
  overlay.querySelector('[data-is="bilgi"]').onclick=()=>{close();window.kisiselBilgilerAc?.();};
  overlay.querySelector('[data-is="sifre"]').onclick=()=>{close();window.sifreDegistirAc?.();};
  overlay.querySelector('.dm-account-close').focus();
 };
})();
