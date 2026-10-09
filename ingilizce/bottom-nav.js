/* Diji-Medu: approved compact sticker navigation. Existing button handlers stay in place. */
(() => {
 'use strict';
 const icons = {'tab-dunya':0,'tab-meduakis':1,'tab-sanaozel':5,'tab-aktiviteler':2,'tab-derscalis':3,'tab-magaza':4,'tab-profil':5,'tab-dunyam':5};
 const positions = ['0% 0%','50% 0%','100% 0%','0% 100%','50% 100%','100% 100%'];
 const layout = [['tab-dunya','Oyna'],['tab-meduakis','Arkadaşlar'],['tab-aktiviteler','Oyunlar'],['tab-derscalis','Ders Çalış'],['tab-magaza','Mağaza'],['tab-dunyam','Benim Dünyam']];
  let observer;
 function decorate() {
  const nav = document.getElementById('bottomNavMobile');
  if (!nav) return;
  nav.setAttribute('aria-label','Ana menü');
  const ordered = layout.map(([id]) => nav.querySelector('[data-ekran="'+id+'"]')).filter(Boolean);
  const hidden = [...nav.children].filter(b => !ordered.includes(b));
  // Keep the same six equal buttons; World stays last for existing menu hooks.
  [...hidden,...ordered].forEach((b,i) => { if (nav.children[i] !== b) nav.insertBefore(b,nav.children[i] || null); });
  for (const [id,name] of layout) {
    const b = nav.querySelector('[data-ekran="'+id+'"]'); if (!b) continue;
    const label = b.querySelector('.bn-label'); if (label && label.textContent !== name) label.textContent = name;
    if (b.classList.contains('dm-nav-play')) b.classList.remove('dm-nav-play');
  }
  nav.querySelectorAll('.bn-item').forEach(button => {
   const index = icons[button.dataset.ekran], icon = button.querySelector('.bn-icon');
   if (index === undefined || !icon) return;
   if (!icon.querySelector('.dm-nav-art')) {
    const art = document.createElement('span');
    art.className = 'dm-nav-art';
    art.setAttribute('aria-hidden','true');
    art.style.backgroundPosition = positions[index];
    icon.replaceChildren(art);
   }
   const existingArt = icon.querySelector('.dm-nav-art');
   if (existingArt && existingArt.style.backgroundPosition !== positions[index]) existingArt.style.backgroundPosition = positions[index];
   const label = button.querySelector('.bn-label');
   if (label) button.setAttribute('aria-label',label.textContent.trim());
   if (button.classList.contains('active')) button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  });
  if (!observer) {
   observer = new MutationObserver(decorate);
   observer.observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-ekran']});
  }
 }
 decorate();
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',decorate,{once:true});
})();

