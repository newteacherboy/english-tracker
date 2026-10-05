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
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const progression=()=>window.DijiProgressRules?.progress(typeof yo!=='undefined'&&yo?window.DijiProgressRules.migrate(yo):0)||{level:1,ratio:0};
  window.dmParkurBaslik=function(d){const p=progression(),name=typeof aktifOgrenciAdi!=='undefined'?aktifOgrenciAdi.split(/\s+/)[0]:'';
    return `<header class="dm-parkur-head"><div class="dm-adventure-brand-row"><div><div class="dm-parkur-brand">Diji-Medu<span aria-hidden="true">🪶</span></div><small>İngilizce, büyük bir macera!</small></div><button type="button" class="dm-adventure-profile" onclick="profilAc()" aria-label="Profilim">${icon('profile')}</button></div><h1>Merhaba${name?', '+safe(name):''}</h1><div class="dm-parkur-wallet"><button type="button" data-dm-wallet="level" class="dm-adventure-level" aria-label="Seviye ${p.level}, ilerlemeni görüntüle"><span>🛡️ Sv. <b data-dm-level>${p.level}</b></span><i class="dm-adventure-level-track"><i data-dm-level-fill style="width:${p.ratio*100}%"></i></i></button><button type="button" data-dm-wallet="energy" aria-label="Enerji bilgileri"><span aria-hidden="true">⚡</span> <span data-dm-energy>${d.energy}/${d.max}</span></button><button type="button" data-dm-wallet="gold" aria-label="Mağazayı aç"><span aria-hidden="true">🪙</span> <span data-dm-gold>${d.gold}</span></button></div><div class="dm-parkur-tabs" role="tablist" aria-label="Parkurlar"><button type="button" role="tab" aria-selected="true" data-dm-tab="ba"><span>🗺️ Parkur</span></button><button type="button" role="tab" aria-selected="false" data-dm-tab="pro"><span>✨ MeduPro</span></button></div></header>`;};
  window.dmParkurSahne=function({next,total,complete,section,steps,full=false}){
    const shown=full?steps:steps.slice(Math.max(0,next-1),Math.min(total,next+3));
    const places=[[51,79],[65,64],[58,48],[78,34]];
    return `<section class="dm-adventure-scene" aria-label="${safe(section)}, saraya uzanan öğrenme yolu"><div class="dm-adventure-palace-label">🏰 Keşif Sarayı</div><div class="dm-adventure-route-name">${safe(section)} · ${complete}/${total} durak</div><img class="dm-adventure-papi" src="papi-welcome-v2.png" alt="Öğrenme arkadaşın Papi"><div class="dm-adventure-papi-note">Haydi keşfedelim!</div>${shown.map((step,i)=>{const [x,y]=places[i],active=step.index===next&&!step.done;return `<button type="button" data-d="${step.index}" class="dm-adventure-node${active?' current':step.done?' done':' locked'}" style="left:${x}%;top:${y}%" aria-label="${safe(step.label)}${step.done?', tamamlandı':active?', sıradaki':', kilitli'}"><span>${step.done?'✓':active?'★':'🔒'}</span><small>${step.index+1}. durak</small></button>`;}).join('')}<button type="button" class="dm-adventure-go" data-d="${next}">${complete===total?'Son durağı tekrar et':'Parkura devam et'} <span aria-hidden="true">›</span></button></section>`;
  };
  function sync(){
    const tab=document.getElementById('tab-dunya');
    const open=!!(tab&&tab.classList.contains('active')&&tab.classList.contains('bz-yeni')&&tab.querySelector('.dm-parkur-head'));
    const gates=!!(tab&&tab.classList.contains('active')&&tab.classList.contains('bz-yeni')&&tab.querySelector('.bz-kapilar'));
    document.body.classList.toggle('dm-parkur-gates',gates);
    if(document.body.classList.contains('dm-parkur-open')!==open)document.body.classList.toggle('dm-parkur-open',open);

  }
  function wallet(){
    const e=document.querySelector('[data-dm-energy]'),g=document.querySelector('[data-dm-gold]');
    const p=progression(),level=document.querySelector('[data-dm-level]'),fill=document.querySelector('[data-dm-level-fill]');if(level)level.textContent=p.level;if(fill)fill.style.width=p.ratio*100+'%';
    if(e&&typeof window.genelEnerjiKalan==='number'){const v=window.genelEnerjiKalan+'/'+(window.genelEnerjiMax||30);if(e.textContent!==v)e.textContent=v;}
    if(g&&typeof yo!=='undefined'&&yo){const v=String(yo.altin||0);if(g.textContent!==v)g.textContent=v;}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('button[data-dm-tab],button[data-dm-wallet]');if(!b)return;if(b.dataset.dmTab==='pro'){window.dmMeduProAc?.();}else if(b.dataset.dmTab){const target=document.querySelector('#pkSekmeler [data-p="'+b.dataset.dmTab+'"]');if(target)target.click();}else if(b.dataset.dmWallet==='level'){window.dmProgressPanel?.open();}else if(b.dataset.dmWallet==='energy'){if(typeof window.dijiEnerjiPaneliAc==='function')window.dijiEnerjiPaneliAc();}else if(typeof window.magazaAc==='function')window.magazaAc();});
  const tab=document.getElementById('tab-dunya');if(tab)new MutationObserver(sync).observe(tab,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});

  sync();setInterval(wallet,1000);
})();
