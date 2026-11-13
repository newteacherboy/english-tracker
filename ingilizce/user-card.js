/* Compact, anchored user card. Opening it never navigates or redraws Friends. */
(()=>{'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
 const token=()=>localStorage.getItem('ing_token')||'';
 const norm=x=>String(x||'').trim().toLocaleLowerCase('tr');
 const leagues={yerel:'Yerel Lig',super:'Süper Lig',sampiyon:'Şampiyonlar Ligi'};
 const icons={message:'<rect x="3" y="4" width="18" height="14" rx="4"/><path d="m7 18-3 3v-5M8 9h8M8 13h5"/>',gift:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M3 6h18v4H3zM12 6v15M12 6C5 7 4 0 8 2c3 0 4 4 4 4Zm0 0c7 1 8-6 4-4-3 0-4 4-4 4Z"/>',duel:'<path d="m4 3 17 17M20 3 3 20M3 3l2 6 4-4-6-2Zm18 0-2 6-4-4 6-2ZM3 17l4 4M17 21l4-4"/>',follow:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M20 8v8M16 12h8"/>',block:'<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',report:'<path d="M5 22V3c6-5 8 5 15 0v12c-7 5-9-5-15 0"/>'};
 const icon=k=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icons[k]+'</svg>';
 let view=null,lastAnchor=null,cacheOwner='',cache=new Map();
 function close(restore=true){if(!view)return;const v=view;view=null;v.controller.abort();v.el.remove();v.anchorEl?.removeAttribute('aria-expanded');if(restore&&v.origin?.isConnected)v.origin.focus?.({preventScroll:true});}
 function alive(v){return view===v&&v.owner===who()&&v.token===token()&&v.el.isConnected;}
 function place(v){
  if(!alive(v))return;
  const viewport=window.visualViewport,w=viewport?.width||innerWidth,h=viewport?.height||innerHeight,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
  const r=v.anchorEl?.isConnected?v.anchorEl.getBoundingClientRect():v.rect;
  v.el.style.maxHeight=Math.max(120,h-32)+'px';v.el.style.width=Math.min(348,w-24)+'px';
  const box=v.el.getBoundingClientRect(),x=Math.max(left+12,Math.min(r.right+8,left+w-box.width-12));
  const y=Math.max(top+16,Math.min(r.top-box.height+34,top+h-box.height-16));
  v.el.style.left=x+'px';v.el.style.top=y+'px';
  v.el.dataset.arrow=r.left+r.width/2<x?'left':'bottom';
  v.el.style.setProperty('--tip-y',Math.max(28,Math.min(box.height-28,r.top+r.height/2-y))+'px');
  v.el.style.setProperty('--tip-x',Math.max(22,Math.min(box.width-22,r.left+r.width/2-x))+'px');
 }
 function character(data){
  const k=data.character;
  try{if(k?.cins&&k.s&&window.dolapTamBoySVG)return window.dolapTamBoySVG({...window.KA_VARSAYILAN?.[k.cins],...k.s},k.cins,174);
   if(k?.cins&&window.dmAdventureAvatar)return window.dmAdventureAvatar.render(k.s||{},{cins:k.cins,px:174,full:true});
  }catch{}
  return '<img src="friends-assets/papi-friends.png" alt="Papi karakteri" width="94" height="154">';
 }
 const button=(action,label,cls='')=>'<button type="button" class="uc-action '+cls+'" data-user-action="'+action+'" disabled>'+icon(action)+'<span>'+label+'</span></button>';
 async function open(id,anchor){
  id=id==='ben'?who():String(id||'').trim();if(!id)return;
  const anchorEl=anchor?.getBoundingClientRect?anchor:lastAnchor?.el;
  const rect=anchor?.left!==undefined?anchor:anchorEl?.getBoundingClientRect?.()||lastAnchor?.rect||{left:20,right:52,top:innerHeight*.7,width:32,height:32};
  const origin=anchorEl?.matches?.('button,a,[tabindex]')?anchorEl:document.activeElement;
  close(false);
  const account=who()+'|'+token();if(cacheOwner!==account){cache.clear();cacheOwner=account;}
  const el=document.createElement('section');el.id='dmUserCard';el.className='dm-user-card';el.setAttribute('role','dialog');el.setAttribute('aria-modal','false');el.setAttribute('aria-labelledby','dmUserCardName');
  el.innerHTML='<button type="button" class="uc-close" aria-label="Bilgi kartını kapat">×</button><div class="uc-identity"><div class="uc-character" aria-label="Boydan karakter"></div><div class="uc-details"><h2 id="dmUserCardName">'+esc(id)+'</h2><div class="uc-stats" aria-live="polite">Yükleniyor…</div></div></div><div class="uc-actions">'+button('message','Mesaj Gönder','uc-primary')+button('gift','Hediye Gönder')+button('duel','Düello')+button('follow','Takip Et','uc-follow')+'</div><footer>'+button('block','Engelle')+button('report','Kullanıcıyı Bildir')+'</footer><p class="uc-notice" role="status" hidden></p>';
  const v={el,anchorEl,rect,origin,owner:who(),token:token(),id,controller:new AbortController(),data:null};view=v;document.body.append(el);anchorEl?.setAttribute('aria-expanded','true');
  el.querySelector('.uc-close').onclick=()=>close();el.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-user-action]');if(b)void act(v,b);});
  place(v);el.querySelector('.uc-close').focus({preventScroll:true});
  try{
   let data=cache.get(id);if(!data||Date.now()-data.at>30000){
    const response=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:v.controller.signal,body:JSON.stringify({islem:'kullaniciBilgiKarti',kullanici:id,t:v.token})});
    data=await response.json();if(!response.ok||data.ok===false)throw Error(data.mesaj||'Kullanıcı bilgisi alınamadı.');
    if(!alive(v))return;data={...data,at:Date.now()};cache.set(id,data);if(cache.size>30)cache.delete(cache.keys().next().value);
   }
   if(!alive(v))return;v.data=data;v.id=data.name;
   el.querySelector('h2').textContent=data.name;el.querySelector('.uc-character').innerHTML=character(data);
   el.querySelector('.uc-stats').innerHTML='<span><i aria-hidden="true">🏆</i>'+esc(leagues[data.league]||'Lig henüz açılmadı')+'</span><span><i aria-hidden="true">🔥</i>'+Math.max(0,Number(data.streak)||0)+' gün seri</span><span><i aria-hidden="true">▥</i>'+Math.max(1,Number(data.level)||1)+'. seviye</span>';
   const own=norm(v.id)===norm(v.owner);el.querySelectorAll('[data-user-action]').forEach(b=>b.disabled=own);
   const following=typeof maTakip!=='undefined'&&maTakip.has(v.id);el.querySelector('[data-user-action="follow"] span').textContent=following?'Takip Ediliyor':'Takip Et';
   if(own){const n=el.querySelector('.uc-notice');n.hidden=false;n.textContent='Bu senin bilgi kartın.';}place(v);
  }catch(e){if(!alive(v)||e.name==='AbortError')return;el.querySelector('.uc-stats').textContent=e.message;place(v);}
 }
 async function act(v,b){
  if(!alive(v)||!v.data||b.disabled)return;const action=b.dataset.userAction,id=v.id;
  const feature={message:'hazir_mesaj',gift:'enerji_hediye',duel:'duello',follow:'takip'}[action];
  if(feature&&window.dmProgression?.require&&!window.dmProgression.require(feature))return;
  if(action==='message'){close(false);return window.dmMessageAc?.(id);}
  if(action==='gift'){close(false);return window.dmGiftAc?.(id);}
  if(action==='duel'){close(false);return window.dmDuelAc?.(id);}
  if(action==='report'){close(false);return window.dmSocialSafety?.report('user',id);}
  b.disabled=true;
  try{
   if(action==='follow'){
    await window.maTakipDegistir(id,b);
    if(alive(v)){const t=typeof maTakip!=='undefined'&&maTakip.has(id);b.innerHTML=icon('follow')+'<span>'+(t?'Takip Ediliyor':'Takip Et')+'</span>';}
   }else if(action==='block'){
    await window.dmMeduPro.api('ogrenciEngelle',{alici:id});if(!alive(v))return;
    if(typeof maTakip!=='undefined')maTakip.delete(id);cache.delete(id);close();window.maCiz?.();window.maToast?.('Kullanıcı engellendi.');
   }
  }catch(e){if(alive(v)){const n=v.el.querySelector('.uc-notice');n.hidden=false;n.textContent=e.message;}}
  finally{if(alive(v))b.disabled=false;}
 }
 document.addEventListener('click',e=>{
  if(view&&!view.el.contains(e.target))close(false);
  const el=e.target.closest?.('[data-person],[data-o],[data-lig-person]');
  lastAnchor=el?{el,rect:el.getBoundingClientRect()}:null;
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&view){e.preventDefault();e.stopImmediatePropagation();close();}},true);
 document.addEventListener('scroll',e=>{if(view&&!view.el.contains(e.target))close(false);},true);
 window.addEventListener('resize',()=>{if(view)place(view);});window.visualViewport?.addEventListener('resize',()=>{if(view)place(view);});
 document.addEventListener('dm:login',()=>{close(false);cache.clear();});
 document.addEventListener('dm:state',()=>{cache.clear();if(view&&(!alive(view)||!document.getElementById('tab-meduakis')?.classList.contains('active')))close(false);});
 const root=document.getElementById('tab-meduakis');if(root)new MutationObserver(()=>{if(view&&!root.classList.contains('active'))close(false);}).observe(root,{attributes:true,attributeFilter:['class']});
 window.dmUserCard={open,close};
})();
