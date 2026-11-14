/* Demo hesap da normal sohbet ve hesap yönetimi arayüzlerini kullanır. */
(()=>{'use strict';
 const paint=()=>document.body.classList.toggle('dm-demo-account',typeof aktifOgrenciAdi!=='undefined'&&String(aktifOgrenciAdi).toLowerCase()==='dijimedu_demo');
 for(const event of ['dm:login','dm:state'])document.addEventListener(event,paint);
 paint();
})();
