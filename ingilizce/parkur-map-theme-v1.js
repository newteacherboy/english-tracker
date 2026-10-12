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
  const chapterTitles=["Temel Kelimeler","Harf Avı","Kelime Ustası","Usta Seviye"];
  const chapterNames=[["İlk Tüy","Merhaba Ormanı","Renkli Yapraklar","Sayı Köprüsü","Minik Dostlar","Oyuncak Sandığı","Aile Ağacı","Neşeli Ev","Gökkuşağı Kapısı","Papi’nin Çantası","Saklı Bahçe","Tatlı Sofra","Uçan Balonlar","Güneşli Sabah","Kayıp Anahtar","Ormanın Işığı"],["Kar Tanesi","Buzlu Köprü","Kutup Feneri","Kristal İzler","Beyaz Kanatlar","Sıcak Kulübe","Kardan Dost","Gümüş Çan","Donmuş Göl","Kuzey Yıldızı","Fısıldayan Çam","Buz Mağarası","Minik Çığ","Parlayan Pusula","Karlı Patika","Kutup Rüzgârı","Gizli Geçit","Aurora Dansı","Mavi Taç","Karlar Krallığı"],["Kristal Kapı","Şelale Sırrı","Tahta Köprü","Uçan Kütüphane","Kayıp Harita","Işıklı Sokak","Bilge Baykuş","Eski Saat","Yankı Kuyusu","Zümrüt Bahçe","Sihirli Kalem","Gizli Mektup","Ay Işığı","Masal Pazarı","Papi’nin Keşfi","Köyün Hazinesi"],["Altın Kapı","Saray Bahçesi","Mor Kule","Cesaret Meydanı","Yıldız Merdiveni","Anka Tüyü","Kadim Kitap","Ejder Sırrı","Işık Aynası","Taç Atölyesi","Usta Kanatlar","Gizemli Salon","Sonsuz Ufuk","Bilgelik Çanı","Son Anahtar","Keşif Tacı"]];
  window.dmParkurDurakAdi=(b,d)=>chapterNames[b]?.[d]||'Yeni Keşif '+(d+1);
  const mapGlyph=state=>'<svg viewBox="0 0 32 32" aria-hidden="true">'+(state==='done'?'<path d="m7 16 6 6L25 9" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>':state==='current'?'<path d="m10 5 18 11-18 11Z" fill="currentColor"/>':'<path d="M10 14V9a6 6 0 0 1 12 0v5" fill="none" stroke="currentColor" stroke-width="3"/><rect x="7" y="13" width="18" height="16" rx="4" fill="currentColor"/><path d="M16 19v5" stroke="#8c8b7b" stroke-width="2.5" stroke-linecap="round"/>')+'</svg>';
  const chapterArt=(i,z)=>i%3===1?'<svg viewBox="0 0 80 80"><path d="M12 21Q26 15 40 23Q54 15 68 21V60Q54 55 40 63Q26 55 12 60Z" fill="#fff8df" stroke="#0b7a76" stroke-width="3"/><path d="M40 23V63M20 30h12m-12 9h12m16-9h12m-12 9h12" stroke="#8abbaa" stroke-width="3"/><path d="m53 8 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#f1cd71"/></svg>':i%3===2?'<svg viewBox="0 0 80 80"><path d="M40 65V27" stroke="#9b805f" stroke-width="7"/><path d="M13 43Q3 24 22 20Q25 3 42 13Q63 5 67 25Q81 42 60 49H25Z" fill="#8ecaaa" stroke="#fff8df" stroke-width="3"/><circle cx="26" cy="29" r="5" fill="#f2b9bc"/><circle cx="51" cy="36" r="5" fill="#f1cd71"/><path d="M14 67h52" stroke="#c9dfb1" stroke-width="7" stroke-linecap="round"/></svg>':'<svg viewBox="0 0 80 80"><path d="M8 60Q40 45 72 60L65 70H15Z" fill="#d4e9b7"/><path d="M15 58V32L36 14L57 32V58Z" fill="#fff8df"/><path d="m9 33 27-24 27 24" fill="none" stroke="'+['#d9877f','#60adb1','#bd8a58','#929bd0'][z]+'" stroke-width="8" stroke-linejoin="round"/><rect x="29" y="40" width="14" height="20" rx="6" fill="#0b7a76"/><rect x="20" y="29" width="9" height="9" rx="2" fill="#f1cd71"/><path d="M61 57V40" stroke="#618577" stroke-width="4"/><path d="m61 25 12 19H49Z" fill="#71b495"/><circle cx="65" cy="18" r="7" fill="#f3cd72"/></svg>';
  window.dmParkurSahne=function({steps,current,total=steps.length,offset=0}){
    current=Math.max(0,Math.min(steps.length-1,Number.isInteger(current)?current:0));
    const active=steps[current],next=active?.available&&!active.done?active:steps.find(s=>s.available&&!s.done)||steps.filter(s=>s.done&&s.available).at(-1);
    return '<section class="dm-parchment-map" data-map-current="'+current+'" aria-label="Macera Haritası"><h2 class="dm-map-heading">Macera Haritası</h2><div class="dm-map-track" tabindex="0" aria-label="Öğrenme durakları, diğer duraklar için kaydır"><div class="dm-map-route"><svg class="dm-map-trail" aria-hidden="true" preserveAspectRatio="none"><path class="dm-map-trail-shadow"/><path class="dm-map-trail-dots"/></svg>'+steps.map((s,i)=>{
      const number=offset+i+1,zone=Math.min(3,Math.floor((number-1)*4/Math.max(1,total)));const name=window.dmParkurDurakAdi(s.b,s.d),state=s.done?'done':i===current&&s.available?'current':'locked';
      return '<button type="button" data-b="'+s.b+'" data-d="'+s.d+'" data-route-index="'+i+'" data-zone="'+zone+'" data-stop-number="'+number+'" class="dm-adventure-node dm-map-stop '+state+(number%10===0?' zone-gate':number%5===0?' reward-chest':'')+'" aria-label="'+safe(name)+(s.done?', tamamlandı':s.available?', sıradaki':', kilitli')+'"'+(state==='current'?' aria-current="step"':'')+'><span class="dm-map-location" aria-hidden="true"></span><span class="dm-map-chapter-art" aria-hidden="true">'+chapterArt(i,zone)+'</span><span class="dm-map-badge">'+mapGlyph(state)+'</span><b class="dm-map-name">'+safe(name)+'</b></button>';
    }).join('')+'</div></div><img class="dm-map-papi" src="parkur-okul-assets/papi-v1.webp" alt="Papi" draggable="false">'+(next?'<button type="button" class="dm-map-continue" data-b="'+next.b+'" data-d="'+next.d+'">Devam et <span aria-hidden="true">›</span></button>':'')+'</section>';
  };
  // One viewport-sized painting, with a real scrolling route above it. Never stretch
  // or repeat the landscape, castle, or mascot to accommodate the 68 real units.
  window.dmParkurMapMount=function(root){
    const map=root?.querySelector('.dm-parchment-map');if(!map)return;
    const track=map.querySelector('.dm-map-track'),route=map.querySelector('.dm-map-route'),nodes=[...map.querySelectorAll('.dm-map-stop')],current=+map.dataset.mapCurrent;
    let firstLayout=true,lastGap=0;
    function layout(){
      if(!map.isConnected){observer?.disconnect();return;}
      const dock=document.getElementById('bottomNavMobile'),dockHeight=Math.ceil(dock?.getBoundingClientRect().height||0);
      root.parentElement?.style.setProperty('--dm-map-dock',dockHeight+'px');
      const W=map.clientWidth,H=map.clientHeight;if(W<1||H<1)return;
      // Paint the map and the safety gap as one image, keeping controls in the original scene.
      const frame=root.parentElement;
      if(frame){
        const sceneRect=map.getBoundingClientRect(),frameRect=frame.getBoundingClientRect();
        const sceneBottom=dock?dock.getBoundingClientRect().top:sceneRect.bottom;
        frame.style.setProperty('--dm-scene-left',(sceneRect.left-frameRect.left)+'px');
        frame.style.setProperty('--dm-scene-top',(sceneRect.top-frameRect.top)+'px');
        frame.style.setProperty('--dm-scene-width',sceneRect.width+'px');
        frame.style.setProperty('--dm-scene-height',Math.max(sceneRect.height,sceneBottom-sceneRect.top)+'px');
        frame.classList.add('dm-map-extended');
      }
      const size=Math.max(50,Math.min(92,W*.20,H*.16)),first=Math.max(H*.16,56+size/2),last=H-62-size/2-23;
      const gap=Math.max(size*.58,(last-first)/4),height=first+Math.max(0,nodes.length-1)*gap+H*.35;
      const oldIndex=lastGap?track.scrollTop/lastGap:Math.max(0,current-2);
      map.style.setProperty('--dm-map-medallion',size+'px');
      route.style.height=height+'px';
      const points=nodes.map((node,i)=>{const x=i%2?70:i%4===0?37:47,y=first+i*gap;node.style.left=x+'%';node.style.top=y+'px';return [x*W/100,y];});
      let d='';points.forEach(([x,y],i)=>{if(!i)d='M '+x+' '+y;else {const [px,py]=points[i-1],mid=(py+y)/2;d+=' C '+px+' '+mid+' '+x+' '+mid+' '+x+' '+y;}});
      const svg=map.querySelector('.dm-map-trail');svg.setAttribute('viewBox','0 0 '+W+' '+height);svg.setAttribute('height',height);svg.querySelectorAll('path').forEach(p=>p.setAttribute('d',d));
      track.scrollTop=Math.max(0,(firstLayout?Math.max(0,current-2):oldIndex)*gap);firstLayout=false;lastGap=gap;visible();
    }
    function visible(){const nearest=nodes.reduce((best,n)=>Math.abs(parseFloat(n.style.top)-track.scrollTop-map.clientHeight*.4)<Math.abs(parseFloat(best.style.top)-track.scrollTop-map.clientHeight*.4)?n:best,nodes[0]);if(nearest){map.dataset.zone=nearest.dataset.zone;const zones=['bahar','yaz','sonbahar','kis'],z=Number(nearest.dataset.zone);map.style.setProperty('--pk-scene',"url('parkur-okul-assets/bolge"+(z+1)+'-'+zones[z]+"-v2.svg')");if(z<3&&map.dataset.preloaded!==String(z+1)){const img=new Image();img.src='parkur-okul-assets/bolge'+(z+2)+'-'+zones[z+1]+'-v2.svg';map.dataset.preloaded=String(z+1);}}const papi=map.querySelector('.dm-map-papi'),active=nodes[current];if(papi&&active){papi.style.left=active.style.left;papi.style.top=(parseFloat(active.style.top)-track.scrollTop+track.offsetTop-30)+'px';papi.hidden=parseFloat(active.style.top)-track.scrollTop<70||parseFloat(active.style.top)-track.scrollTop>map.clientHeight-90;}const size=parseFloat(map.style.getPropertyValue('--dm-map-medallion'))||50;nodes.forEach(node=>{const y=parseFloat(node.style.top)-track.scrollTop;node.style.visibility=y<52+size/2||y>map.clientHeight-62-size/2-18?'hidden':'visible';});}
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(layout):null;
    observer?.observe(map);const dock=document.getElementById('bottomNavMobile');if(dock)observer?.observe(dock);track.addEventListener('scroll',visible,{passive:true});layout();
    nodes.forEach(node=>node.addEventListener('focus',()=>{const top=parseFloat(node.style.top)-track.scrollTop;if(top<50||top>map.clientHeight-90)track.scrollTo({top:Math.max(0,parseFloat(node.style.top)-map.clientHeight*.45),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
  };
  function sync(){
    profileAvatar();
    const tab=document.getElementById('tab-dunya');
    const open=!!(tab&&tab.classList.contains('active')&&tab.classList.contains('bz-yeni')&&tab.querySelector('.dm-parkur-head,.rt-top'));
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
  document.addEventListener('click',e=>{const cover=e.target.closest('[data-dm-book-chapter]');if(cover){window.dmParkurBookOpen?.(+cover.dataset.dmBookChapter,cover.dataset.dmBookPage===undefined?undefined:+cover.dataset.dmBookPage);return;}const b=e.target.closest('button[data-dm-tab],button[data-dm-wallet]');if(!b)return;if(b.dataset.dmTab==='pro'){window.dmMeduProAc?.();}else if(b.dataset.dmTab){const target=document.querySelector('#pkSekmeler [data-p="'+b.dataset.dmTab+'"]');if(target)target.click();}else if(b.dataset.dmWallet==='profile'){window.profilAc?.();}else if(b.dataset.dmWallet==='level'){window.dmProgressPanel?.open();}else if(b.dataset.dmWallet==='energy'){if(typeof window.dijiEnerjiPaneliAc==='function')window.dijiEnerjiPaneliAc();}else if(typeof window.magazaAc==='function')window.magazaAc();});
  const tab=document.getElementById('tab-dunya');if(tab)new MutationObserver(sync).observe(tab,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});

  const avatar=document.getElementById('userAvatarLetter');if(avatar)new MutationObserver(profileAvatar).observe(avatar,{childList:true,subtree:true,characterData:true,attributes:true});
  sync();setInterval(wallet,1000);
})();
