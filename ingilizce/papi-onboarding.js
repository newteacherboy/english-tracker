/* The old guided tour is retired. Only the dismissible route chooser remains. */
(()=>{'use strict';
const choose=()=>window.dmMemberExperience?.chooseRoute(false);
window.turBaslat=choose;window.uygulamaTuru=choose;
window.turAcikMi=()=>false;window.turBitti=()=>true;
Object.defineProperty(window,'turAcik',{configurable:true,get:()=>false});
window.dmPapiTour={start:choose,active:()=>false,preview:()=>false};
window.dmPapiPreview=false;
document.body.classList.remove('dm-papi-preview','dm-papi-notices-paused');
})();
