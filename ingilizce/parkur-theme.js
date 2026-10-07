(function(){
  'use strict';
  const paths={
    door:'<path d="M5 21V4a1 1 0 0 1 1-1h12v18M3 21h18M7 21V6h9v15"/><circle cx="13" cy="13" r=".8"/>',
    tools:'<path d="m14 3-2 3 2 4 4 2 3-2a7 7 0 0 1-8 8l-5 4a3 3 0 0 1-4-4l4-5a7 7 0 0 1 6-10Z"/>',
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
    return `<header class="dm-parkur-head"><div class="dm-adventure-brand-row"><div class="dm-adventure-brand"><div class="dm-parkur-brand">Diji-Medu<span aria-hidden="true">🪶</span></div><small>İngilizce, büyük bir macera!</small></div><div class="dm-parkur-wallet dm-parkur-top-status" role="group" aria-label="Seviye, enerji ve altın"><button type="button" data-dm-wallet="level" class="dm-adventure-level" aria-label="Seviye ${p.level}, ilerlemeni görüntüle"><span>Sv. <b data-dm-level>${p.level}</b></span><i class="dm-adventure-level-track"><i data-dm-level-fill style="width:${p.ratio*100}%"></i></i></button><button type="button" data-dm-wallet="energy" aria-label="Enerji bilgileri"><span aria-hidden="true">⚡</span><span data-dm-energy>${d.energy}/${d.max}</span></button><button type="button" data-dm-wallet="gold" aria-label="Mağazayı aç"><span aria-hidden="true">🪙</span><span data-dm-gold>${d.gold}</span></button></div><button type="button" class="dm-adventure-profile" data-dm-wallet="profile" aria-label="Profilimi aç"><span aria-hidden="true">👤</span></button></div><h1>Merhaba${name?', '+safe(name):''}</h1><div class="dm-parkur-tabs" role="tablist" aria-label="Parkurlar"><button type="button" role="tab" aria-selected="true" data-dm-tab="ba"><span>🗺️ Parkur</span></button><button type="button" role="tab" aria-selected="false" data-dm-tab="pro"><span>✨ MeduPro</span></button></div></header>`;};
  window.dmParkurSahne=function({steps,current,complete}){
    const H=420+steps.length*56;
    const course=[[0,50],[.1,53],[.2,55],[.3,48],[.4,53],[.5,45],[.6,55],[.7,49],[.8,55],[.9,48],[1,55]];
    function riverX(r){for(let j=1;j<course.length;j++){if(r<=course[j][0]){const a=course[j-1],b=course[j];return a[1]+(b[1]-a[1])*(r-a[0])/(b[0]-a[0]);}}return 55;}
    const points=steps.map((s,i)=>{const y=H-110-i*56;return [Math.max(16,Math.min(84,riverX(y/H)+(i%2?18:-18))),y];});
    let path=points.map(([x,y],i)=>i?'C '+(points[i-1][0]*4)+' '+((points[i-1][1]+y)/2)+' '+(x*4)+' '+((points[i-1][1]+y)/2)+' '+(x*4)+' '+y:'M '+(x*4)+' '+y).join(' ');
    const last=points[points.length-1];if(last)path+=' Q '+(last[0]*4)+' 300 200 160';
    const here=points[current]||points[0]||[50,H-110];
    return '<section class="dm-unified-scene dm-river-world" style="height:'+H+'px" aria-label="Papi, tek nehir boyunca bütün öğrenme durakları"><div class="dm-unified-palace-label">🏰 Keşif Sarayı</div><svg class="dm-unified-path dm-river-water" viewBox="0 0 400 '+H+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+path+'" fill="none" stroke="#a2bc8f" stroke-width="90" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="#168fa1" stroke-width="77" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="#60decb" stroke-width="65" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="#e0ffff" stroke-width="2" stroke-dasharray="15 24" opacity=".6"/></svg>'+steps.map((s,i)=>{
      const [x,y]=points[i],active=i===current&&!s.done;
      return '<button type="button" data-b="'+s.b+'" data-d="'+s.d+'" data-route-index="'+i+'" class="dm-adventure-node dm-river-dock'+(active?' current':s.done?' done':' locked')+'" style="left:'+x+'%;top:'+y+'px" aria-label="'+(i+1)+'. durak, '+safe(s.label)+(s.done?', tamamlandı':s.available?', sıradaki':', kilitli')+'"><span aria-hidden="true">'+(s.done?'✓':active?'★':'🔒')+'</span><small>'+(i+1)+'. durak · '+safe(s.short)+'</small></button>';
    }).join('')+'<div class="dm-river-raft" style="left:'+riverX((here[1]+52)/H)+'%;top:'+(here[1]+52)+'px"><img src="papi-welcome-v2.png" alt="Salıyla yolculuk eden Papi"></div></section>';
  };
  function sync(){
    profileAvatar();
    const tab=document.getElementById('tab-dunya');
    const open=!!(tab&&tab.classList.contains('active')&&tab.classList.contains('bz-yeni')&&tab.querySelector('.dm-parkur-head'));
    const gates=!!(tab&&tab.classList.contains('active')&&tab.classList.contains('bz-yeni')&&tab.querySelector('.bz-kapilar'));
    document.body.classList.toggle('dm-parkur-gates',gates);
    if(document.body.classList.contains('dm-parkur-open')!==open)document.body.classList.toggle('dm-parkur-open',open);

  }
  // Reuse the avatar already rendered for the signed-in user's profile.
  // Clone its visual only; preserve the original profile node and button action.
  let avatarVersion=0;
  const avatarSignatures=new WeakMap();
  function profileAvatar(){
    const source=document.getElementById('userAvatarLetter');
    if(!source || !source.childNodes.length)return;
    document.querySelectorAll('.dm-adventure-profile').forEach(button=>{
      const signature=source.innerHTML;
      if(avatarSignatures.get(button)===signature)return;
      const visual=document.createElement('span');visual.className='dm-adventure-avatar';visual.setAttribute('aria-hidden','true');
      source.childNodes.forEach(node=>visual.append(node.cloneNode(true)));
      // SVG avatars may contain gradients/clip paths: keep IDs unique in the copy.
      const ids=new Map(),prefix='dm-parkur-avatar-'+(++avatarVersion)+'-';
      visual.querySelectorAll('[id]').forEach(el=>{const old=el.id;ids.set(old,prefix+old);el.id=prefix+old;});
      visual.querySelectorAll('*').forEach(el=>{
        for(const attr of [...el.attributes]){
          let value=attr.value;
          ids.forEach((next,old)=>{value=value.split('url(#'+old+')').join('url(#'+next+')');if((attr.name==='href'||attr.name==='xlink:href')&&value==='#'+old)value='#'+next;});
          if(value!==attr.value)el.setAttribute(attr.name,value);
        }
      });
      button.replaceChildren(visual);avatarSignatures.set(button,signature);
    });
  }
  function wallet(){
    const e=document.querySelector('[data-dm-energy]'),g=document.querySelector('[data-dm-gold]');
    const p=progression(),level=document.querySelector('[data-dm-level]'),fill=document.querySelector('[data-dm-level-fill]');if(level)level.textContent=p.level;if(fill)fill.style.width=p.ratio*100+'%';
    if(e&&typeof window.genelEnerjiKalan==='number'){const v=window.genelEnerjiKalan+'/'+(window.genelEnerjiMax||30);if(e.textContent!==v)e.textContent=v;}
    if(g&&typeof yo!=='undefined'&&yo){const v=String(yo.altin||0);if(g.textContent!==v)g.textContent=v;}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('button[data-dm-tab],button[data-dm-wallet]');if(!b)return;if(b.dataset.dmTab==='pro'){window.dmMeduProAc?.();}else if(b.dataset.dmTab){const target=document.querySelector('#pkSekmeler [data-p="'+b.dataset.dmTab+'"]');if(target)target.click();}else if(b.dataset.dmWallet==='profile'){window.profilAc?.();}else if(b.dataset.dmWallet==='level'){window.dmProgressPanel?.open();}else if(b.dataset.dmWallet==='energy'){if(typeof window.dijiEnerjiPaneliAc==='function')window.dijiEnerjiPaneliAc();}else if(typeof window.magazaAc==='function')window.magazaAc();});
  const tab=document.getElementById('tab-dunya');if(tab)new MutationObserver(sync).observe(tab,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});

  const avatar=document.getElementById('userAvatarLetter');if(avatar)new MutationObserver(profileAvatar).observe(avatar,{childList:true,subtree:true,characterData:true,attributes:true});
  sync();setInterval(wallet,1000);
})();
