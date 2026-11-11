/* [11 Kas 2026] Ödevden açılan Ders Çalış konusu.
   Ders Çalış öğrencilerin menüsünde yok (yalnızca öğretmen panelinde). Öğretmen "Ders Çalış konusu" ödevi verdiyse
   öğrenci Ödevlerim'de ödeve basınca konu doğrudan açılır. Bu modda geri / çıkış düğmeleri Ders Çalış'ın diğer
   sayfalarına değil, öğrencinin geldiği Ödevlerim'e döner. Konu, test, puan ve ödev tamamlama akışı değişmez. */
(()=>{'use strict';
 const root=()=>document.getElementById('tab-derscalis');
 const on=()=>!!root()?.classList.contains('dc-odev-modu');
 function exit(){
  root()?.classList.remove('dc-odev-modu');
  window.dersCalisTamEkranKapat?.();
  if(!window.dmTeacherPortalMode)setTimeout(()=>{window.sanaOzelTamEkranAc?.();window.dmOdevYenile?.();},0);
 }
 function wrap(name){
  const f=window[name];if(typeof f!=='function'||f.__dmOdev)return;
  const g=function(...a){if(on())return exit();return f.apply(this,a);};g.__dmOdev=true;window[name]=g;
 }
 function install(){
  ['dcGeriGit','dcAnaEkranaDon','dcTestSonrasiKonuListesineDon'].forEach(wrap);
  const k=window.dersCalisTamEkranKapat;
  if(typeof k==='function'&&!k.__dmOdev){const g=function(...a){root()?.classList.remove('dc-odev-modu');return k.apply(this,a);};g.__dmOdev=true;window.dersCalisTamEkranKapat=g;}
 }
 window.dmDersOdevModu={start(){install();root()?.classList.add('dc-odev-modu');},active:on};
 if(document.readyState==='complete')install();else addEventListener('load',install,{once:true});
})();
