(function(){
  'use strict';
  const paths={
    path:'<path d="M6 20c0-7 12-3 12-10S6 12 6 5"/><circle cx="6" cy="4" r="2"/><circle cx="18" cy="5" r="2"/>',
    book:'<path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Z"/><path d="M12 5v15"/>',
    chat:'<path d="M21 11a9 8 0 0 1-9 8H5l-3 3 1-7a8 8 0 1 1 18-4Z"/>',
    cards:'<rect x="5" y="3" width="14" height="18" rx="3"/><path d="m10 8 4 4-4 4-3-4Z"/>',
    game:'<path d="M7 7h10c4 0 6 12 3 13-2 1-4-4-6-4h-4c-2 0-4 5-6 4C1 19 3 7 7 7Z"/><path d="M7 10v5m-2-2h4m6-2h.1m3 3h.1"/>',
    spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
    shop:'<path d="M5 7h14l2 14H3L5 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
    profile:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2Z"/>',
    flow:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7m9 2h-7m-2 9v-7m-9-2h7"/>'
  };
  const icon=k=>'<span class="dm-icon" aria-hidden="true"><svg viewBox="0 0 24 24">'+(paths[k]||paths.path)+'</svg></span>';
  window.dmParkurIcon=icon;
  window.dmParkurBaslik=function(d){return `<header class="dm-parkur-head"><div class="dm-parkur-brand">Diji-Medu</div><div class="dm-parkur-title-row"><h1>Öğrenme Parkurun</h1><div class="dm-parkur-wallet"><button type="button" data-dm-wallet="energy" aria-label="Enerji ve altın bilgileri">⚡ <span data-dm-energy>${d.energy}/${d.max}</span></button><button type="button" data-dm-wallet="gold" aria-label="Mağazayı aç">🪙 <span data-dm-gold>${d.gold}</span></button></div></div><div class="dm-parkur-welcome"><img src="mascot-welcome.webp" width="86" height="100" alt="Seni karşılayan Diji-Medu papağanı"><div><b>Hazırsan devam edelim!</b><p>Her adımda biraz daha iyi.</p></div></div><div class="dm-parkur-tabs" role="tablist" aria-label="Parkurlar"><button type="button" role="tab" aria-selected="true" data-dm-tab="ba">${icon('path')}Parkur</button><button type="button" role="tab" aria-selected="false" data-dm-tab="kp">${icon('book')}Kelimeler</button><button type="button" role="tab" aria-selected="false" data-dm-tab="sh">${icon('chat')}Konuşma</button><button type="button" role="tab" aria-selected="false" data-dm-tab="kk">${icon('cards')}Kartlar</button></div></header>`;};
  const originals=new Map();
  const navIcon={'tab-dunya':'path','tab-meduakis':'flow','tab-sanaozel':'spark','tab-aktiviteler':'game','tab-derscalis':'book','tab-magaza':'shop','tab-profil':'profile'};
  function sync(){
    const tab=document.getElementById('tab-dunya');
    const open=!!(tab&&tab.classList.contains('active')&&tab.classList.contains('bz-yeni')&&tab.querySelector('.dm-parkur-head'));
    if(document.body.classList.contains('dm-parkur-open')!==open)document.body.classList.toggle('dm-parkur-open',open);
    document.querySelectorAll('#bottomNavMobile .bn-item').forEach(b=>{const i=b.querySelector('.bn-icon'),k=navIcon[b.dataset.ekran];if(!i||!k)return;if(open&&!originals.has(i)){originals.set(i,i.innerHTML);i.innerHTML=icon(k);}else if(!open&&originals.has(i)){i.innerHTML=originals.get(i);originals.delete(i);}});
  }
  function wallet(){
    const e=document.querySelector('[data-dm-energy]'),g=document.querySelector('[data-dm-gold]');
    if(e&&typeof window.genelEnerjiKalan==='number'){const v=window.genelEnerjiKalan+'/'+(window.genelEnerjiMax||30);if(e.textContent!==v)e.textContent=v;}
    if(g&&typeof yo!=='undefined'&&yo){const v=String(yo.altin||0);if(g.textContent!==v)g.textContent=v;}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('button[data-dm-tab],button[data-dm-wallet]');if(!b)return;if(b.dataset.dmTab){const target=document.querySelector('#pkSekmeler [data-p="'+b.dataset.dmTab+'"]');if(target)target.click();}else if(b.dataset.dmWallet==='energy'){if(typeof window.dijiEnerjiPaneliAc==='function')window.dijiEnerjiPaneliAc();}else if(typeof window.magazaAc==='function')window.magazaAc();});
  const tab=document.getElementById('tab-dunya');if(tab)new MutationObserver(sync).observe(tab,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  const nav=document.getElementById('bottomNavMobile');if(nav)new MutationObserver(sync).observe(nav,{childList:true,subtree:true});
  sync();setInterval(wallet,1000);
})();
