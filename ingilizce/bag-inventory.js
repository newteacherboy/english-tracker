/* Çantam is a separate view over existing owned items; store purchases remain unchanged. */
(()=>{'use strict';if(window.dmBagInventory)return;
const $=id=>document.getElementById(id);
const assetBase=new URL('.',document.currentScript?.src||location.href).href;
const asset=name=>new URL(name,assetBase).href;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types=[['all','Tümü','▦'],['chests','Sandıklar','🎁'],['jokers','Jokerler','🃏'],['badges','Rozetler','🏅'],['characters','Karakterler','🦜'],['clothing','Kıyafetler','👕'],['items','Eşyalar','🎒'],['energy','Enerji','⚡']];
const arr=x=>Array.isArray(x)?x:[];
const st=()=>typeof yo==='undefined'?{}:yo||{};
const norm=x=>typeof x==='string'?{id:x}:x&&typeof x==='object'?x:null;
const readable=x=>String(x||'').replace(/^d:/,'').replace(/[|:_-]+/g,' ').replace(/#[a-f0-9]{6}/gi,'').trim();
let active=false,category='all',popupEl=null,priorFocus=null,priorNavZ='',popupRequested=false,popupFrame=0;
function lookup(id){
 const c=window.KA_KATALOG;if(!c||typeof c!=='object')return {};
 if(c[id]&&typeof c[id]==='object')return c[id];
 for(const list of Object.values(c)){
  if(Array.isArray(list)){const v=list.find(x=>x&&String(x.id||x.kod||x.key)===id);if(v)return v;}
  else if(list&&typeof list==='object'&&list[id])return list[id];
 }
 return {};
}
function entries(){
 const y=st(),closet=y.karakter||{},items=[],seen=new Set(),shop=window.dmStoreWardrobe;
 const add=(kind,id,name,more={})=>{
  id=String(id||'');const key=kind+':'+id;if(!id||seen.has(key))return;
  seen.add(key);items.push({kind,id,name:String(name||readable(id)||'Ürün'),...more});
 };
 // Purchases use ownership keys such as "d:<product id>" and "category:part".
 // Resolve to the SAME catalog ID accepted by storefront's dmStoreWardrobe.art().
 for(const raw of arr(closet.sahip)){
  const o=norm(raw);if(!o)continue;
  const ownedId=String(o.id||o.kod||o.key||'');if(!ownedId)continue;
  const productId=ownedId.startsWith('d:')?ownedId.slice(2):
   ownedId.startsWith('a|')?ownedId:
   ownedId.includes(':')?'a|'+ownedId.replace(':','|'):ownedId;
  const bits=productId.split('|'),atelier=bits[0]==='a',cat=atelier?bits[1]:'';
  const catalog=atelier?window.KA_KATALOG?.[cat]?.liste?.find(x=>String(x.id)===bits.slice(2).join('|')):null;
  let parts=[];try{parts=arr(shop?.parts?.(productId));}catch{}
  const detectedCategory=cat||parts[0]?.category||'';
  const accessory=['aks','cik','arka','cerceve','dost','sapka','gozluk','sac','sacRenk','ten','goz','agiz','detay','durus'].includes(detectedCategory);
  const names=parts.map(p=>p?.name).filter(Boolean);
  const storeName=names.length>1?names.slice(0,2).join(' + '):names[0];
  const name=o.ad||o.name||catalog?.ad||storeName||readable(productId);
  add(accessory?'items':'clothing',ownedId,name,{productId,origin:'wardrobe'});
 }
 // Previously purchased characters and characters unlocked by progress are both owned.
 const roster=typeof window._krkListe==='function'?arr(window._krkListe()):[];
 for(const character of roster){
  if(character?.acik&&character.ad)add('characters',character.ad,character.ad,{origin:'character'});
 }
 for(const raw of arr(y.krkSatin)){
  const name=typeof raw==='string'?raw:raw?.ad||raw?.name||raw?.id;
  if(name)add('characters',name,name,{origin:'character'});
 }
 // Profile badge module stores stable earned badge IDs here (not only in yo.rozetler).
 const badges=arr(window.dmRozetKatalogu);
 const badgeIds=new Set(arr(y.dmWorldBadges?.ids).map(String));
 for(const raw of arr(y.rozetler)){
  const obj=norm(raw);
  const id=String(obj?.id||obj?.kod||obj?.ad||obj?.name||'');
  if(!id)continue;
  const found=badges.find(b=>b.id===id||b.ad===id);
  if(found)badgeIds.add(found.id);
  else add('badges',id,obj?.ad||obj?.name||readable(id),{emoji:obj?.emoji||obj?.ikon||'🏅'});
 }
 for(const id of badgeIds){
  const badge=badges.find(b=>b.id===id);if(!badge)continue;
  add('badges',id,badge.ad,{pictureUrl:badge.resim,emoji:badge.ikon||'🏅'});
 }
 // Real remaining quantities, named and illustrated with the existing joker shop catalog.
 const jokerCatalog=arr(window.JOKER_MAGAZA);
 for(const [id,val] of Object.entries(y.jokerEnv&&typeof y.jokerEnv==='object'?y.jokerEnv:{})){
  const n=Math.floor(Math.max(0,Number(val)||0));if(!n)continue;
  const j=jokerCatalog.find(x=>x.tur===id||x.id===id);
  add('jokers',id,j?.ad||readable(id),{count:n,emoji:j?.e||'🃏',origin:'joker'});
 }
 for(const [id,name,count] of [['dondurucu','Seri Dondurucu',y.dondurucu],['extra-joker','Ek Joker',y.dmExtraJoker],['joker-stok','Yedek Joker',y.jokerStok]]){
  if(Number(count)>0)add('jokers',id,name,{count:Math.floor(Number(count)),emoji:id==='dondurucu'?'❄️':'🃏'});
 }
 // Server-authoritative parkur chests: only READY and CLAIMED ones belong in the bag.
 const status=window.dmProgression?.status?.();
 const chestCatalog=arr(window.DijiProgressionCatalog?.chests);
 for(const chest of chestCatalog){
  const flag=status?.chests?.[chest.id];if(flag!=='claimed'&&flag!=='ready')continue;
  add('chests',chest.id,chest.name+' Sandık',{chestState:flag,pictureUrl:'route-assets/chest.svg',tier:chest.id});
 }
 // Legacy adventure chests are opened rewards, not reusable unopened inventory.
 const classic=y.sandik&&typeof y.sandik==='object'?y.sandik:{};
 for(const [id,name] of [['ba','Büyü Akademisi'],['kp','Kelime Oyunu'],['sh','Sohbet'],['kk','Koleksiyon']]){
  const n=Math.floor(Math.max(0,Number(classic[id])||0));
  if(n)add('chests','legacy-'+id,name+' Sandıkları',{count:n,chestState:'opened',pictureUrl:'route-assets/chest.svg',tier:'legacy'});
 }
 const current=Number(window.genelEnerjiKalan);
 if(Number.isFinite(current)&&current>0)add('energy','energy','Mevcut Enerji',{count:current,emoji:'⚡'});
 return items;
}
function pict(item){
 // Product artwork and styles come from the same store preview renderer as Mağaza.
 if(item.origin==='wardrobe'){
  let html='';
  try{html=window.dmStoreWardrobe?.art?.(item.productId)||window.dmStoreWardrobe?.preview?.(item.productId,160)||'';}catch{}
  if(typeof html==='string'&&html.length<40000&&/<(?:svg|img)\b/i.test(html))return html;
 }
 if(item.kind==='characters'){
  let html='';
  try{html=window.dmCharacterArt?.(item.id,160)||'';}catch{}
  if(typeof html==='string'&&html.length<40000&&/<svg\b/i.test(html))return html;
 }
 if(item.pictureUrl&&/^(?:profile-assets|route-assets)\/[a-z0-9._-]+\.(?:png|webp|svg)$/i.test(item.pictureUrl)){
  return '<img src="'+esc(asset(item.pictureUrl))+'" alt="" loading="lazy">';
 }
 return '<span class="dm-bag-symbol" aria-hidden="true">'+esc(item.emoji||{characters:'🎭',clothing:'👕',badges:'🏅',jokers:'🃏',chests:'🎁',items:'🎒',energy:'⚡'}[item.kind]||'📦')+'</span>';
}
function nav(){return document.querySelector('#bottomNavMobile [data-ekran="tab-magaza"]');}
function hidePopup(){popupRequested=false;if(popupFrame)cancelAnimationFrame(popupFrame);popupFrame=0;popupEl?.remove();popupEl=null;}
function requestPopup(){
 popupRequested=true;if(popupFrame)return;
 popupFrame=requestAnimationFrame(()=>{popupFrame=0;if(popupRequested)showPopup();});
}
// A tab may finish opening after the click handler; retain that single tap intent.
const storePanel=$('tab-magaza');
if(storePanel)new MutationObserver(()=>{if(popupRequested&&storePanel.classList.contains('active'))requestPopup();else if(!storePanel.classList.contains('active')){if(popupEl)hidePopup();}}).observe(storePanel,{attributes:true,attributeFilter:['class']});
function showPopup(){
 if(active||!nav()||!$('tab-magaza')?.classList.contains('active'))return;
 hidePopup();
 const r=nav().getBoundingClientRect(),el=document.createElement('div');el.id='dmBagPopup';
 el.style.left=Math.max(4,Math.min(window.innerWidth-97,r.left+r.width/2-46))+'px';
 el.style.bottom=(window.innerHeight-r.top+10)+'px';
 el.innerHTML='<button type="button" aria-label="Çantam sayfasını aç"><img src="'+asset('bag-purple.svg')+'" alt=""><strong>Çantam</strong></button>';
 el.querySelector('button').onclick=e=>{e.preventDefault();e.stopPropagation();openBag();};
 document.body.appendChild(el);popupEl=el;
}
function closeBag(restore=true){
 hidePopup();if(!active)return;active=false;$('dmBagPage')?.remove();
 const b=$('bottomNavMobile');if(b)b.style.zIndex=priorNavZ;
 if(restore){window.magazaAc?.();priorFocus?.focus?.();}
}
function render(){
 const el=$('dmBagPage');if(!el)return;
 const data=entries(),groups=types.slice(1).map(([key,label])=>({key,label,items:data.filter(v=>v.kind===key)}));
 const sections=(category==='all'?groups:groups.filter(g=>g.key===category));
 el.innerHTML='<main class="dm-bag-inner '+(category==='all'?'dm-bag-overview':'dm-bag-detail')+'"><header class="dm-bag-header"><button type="button" class="dm-bag-back" data-bag-back aria-label="Mağazaya dön">‹</button><h1><img src="'+asset('bag-orange.svg')+'" alt=""><span>Çantam<small>Koleksiyonun burada</small></span></h1></header>'+
 '<nav class="dm-bag-tabs"  aria-label="Çantam kategorileri">'+types.map(([key,label,icon])=>'<button type="button"  data-bag-tab="'+key+'" aria-pressed="'+(category===key)+'"><span class="dm-bag-tab-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>').join('')+'</nav>'+
 (sections.map(g=>category==='all'?'<section class="dm-bag-shelf"><div class="dm-bag-shelf-label"><h2>'+esc(g.label)+'</h2><small>'+ (g.key==='chests'?g.items.filter(i=>i.chestState==='ready').length+' açılmaya hazır':g.items.reduce((n,i)=>n+(i.count||1),0)+' adet')+'</small></div><div class="dm-bag-previews">'+g.items.slice(0,2).map(i=>'<button type="button" class="dm-bag-mini" data-bag-view="'+g.key+'" aria-label="'+esc(i.name)+(i.count?' · '+i.count+' adet':'')+'">'+pict(i)+(i.count?'<b>×'+i.count+'</b>':'')+'</button>').join('')+(!g.items.length?'<small class="dm-bag-none">Henüz yok</small>':'')+'</div>'+(g.key==='chests'&&g.items.some(i=>i.chestState==='ready')?'<button type="button" class="dm-bag-quick-open" data-bag-manage="chests">Aç</button>':'<button type="button" class="dm-bag-showall" data-bag-tab="'+g.key+'">Tümü ›</button>')+'</section>':'<section class="dm-bag-section"><header><h2>'+esc(g.label)+'</h2><button type="button" class="dm-bag-showall" data-bag-tab="'+g.key+'">Tümünü Gör ›</button></header><div class="dm-bag-grid">'+(!g.items.length?'<p class="dm-bag-empty">Bu kategoride henüz ürün yok.</p>':'')+g.items.map(i=>'<article class="dm-bag-card"><div class="dm-bag-picture">'+pict(i)+'<span class="dm-bag-owned" aria-label="Sahip olunan">✓</span></div><span class="dm-bag-name">'+esc(i.name)+(i.count?' · '+i.count+' adet':'')+'</span><button type="button" class="dm-bag-action" data-bag-manage="'+i.kind+'" data-bag-id="'+esc(i.id)+'">'+(i.kind==='chests'?(i.chestState==='ready'?'Sandığı aç':i.chestState==='opened'?'Açılmış':'Alındı'):(i.kind==='characters'||i.kind==='clothing'?'Kuşan':'İncele'))+'</button></article>').join('')+'</div></section>').join('')||'<p class="dm-bag-empty">'+(category==='all'?'Çantanda henüz kayıtlı ürün yok. Mağazadan aldıkların burada görünecek.':'Bu kategoride henüz sahip olduğun bir ürün yok.')+'</p>')+'</main>';
 el.querySelector('[data-bag-back]').onclick=()=>{if(category!=='all'){category='all';render();el.scrollTop=0;}else closeBag();};
 el.querySelectorAll('[data-bag-view]').forEach(b=>b.onclick=()=>{category=b.dataset.bagView;render();el.scrollTop=0;});
 el.querySelectorAll('[data-bag-tab]').forEach(b=>b.onclick=()=>{category=b.dataset.bagTab;render();el.scrollTop=0;});
 el.querySelectorAll('[data-bag-manage]').forEach(b=>b.onclick=()=>{
  const kind=b.dataset.bagManage;closeBag(false);
  if(kind==='characters')document.querySelector('#dmStoreFront [data-ds="collection"]')?.click();
  else if(kind==='clothing'||kind==='items')document.querySelector('#dmStoreFront [data-ds="clothing"]')?.click();
  else if(kind==='badges')window.dmBasarilarimAc?.();
  else if(kind==='jokers')document.querySelector('#dmStoreFront [data-ds="jokers"]')?.click();
  else if(kind==='chests')window.dmProgression?.chests?.();
  else if(kind==='energy')window.yoToast?.('Mevcut enerjini parkurda ve oyunlarda kullanabilirsin.');
 });
}
function openBag(){
 if(active)return;hidePopup();priorFocus=document.activeElement;category='all';
 if(!$('tab-magaza')?.classList.contains('active'))window.magazaAc?.();
 const b=$('bottomNavMobile');priorNavZ=b?.style.zIndex||'';
 if(b)b.style.setProperty('z-index','100000020','important');
 const el=document.createElement('div');el.id='dmBagPage';el.setAttribute('role','region');el.setAttribute('aria-label','Çantam: satın alınan ve kazanılan ürünler');
 el.style.setProperty('--dm-bag-bottom',Math.max(70,b?.getBoundingClientRect()?.height||74)+'px');
 document.body.appendChild(el);active=true;render();el.querySelector('[data-bag-back]')?.focus({preventScroll:true});
 const owner=typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
 Promise.resolve().then(()=>window.dmProgression?.refresh?.(true)).then(()=>{if(active&&String(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi||'')===owner)render();}).catch(()=>{});
}
function loadStyle(){if($('dmBagStyle'))return;const link=document.createElement('link');link.id='dmBagStyle';link.rel='stylesheet';link.href=asset('bag-inventory.css?v=20261019-compact-3');document.head.appendChild(link);}
loadStyle();
document.addEventListener('click',e=>{
 const store=e.target?.closest?.('#bottomNavMobile [data-ekran="tab-magaza"]');
 if(store){if(active)closeBag(false);requestPopup();return;}
 if(e.target?.closest?.('#dmBagPopup,#dmBagPage'))return;
 if(e.target?.closest?.('#bottomNavMobile [data-ekran]')){hidePopup();if(active)closeBag(false);return;}
 hidePopup();
},true);
// Browsing dismisses the shortcut until the user taps the shop tab again.
// Opening the store scrolls it to the top: that is not a user dismissal.
for(const event of ['pointerdown','touchmove','wheel'])document.addEventListener(event,e=>{
 if((popupEl||popupRequested)&&!e.target?.closest?.('#dmBagPopup,#bottomNavMobile [data-ekran="tab-magaza"]'))hidePopup();
},{capture:true,passive:true});
window.addEventListener('resize',()=>{if(popupEl||popupRequested)requestPopup();},{passive:true});
document.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)&&!e.target?.closest?.('#dmBagPopup'))hidePopup();if(e.key==='Escape'){if(active){e.preventDefault();closeBag();}else hidePopup();}});
document.addEventListener('dm:login',()=>closeBag(false));
window.dmBagInventory={open:openBag,close:closeBag,refresh:()=>{if(active)render();}};
})();