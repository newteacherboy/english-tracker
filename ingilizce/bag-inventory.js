/* Çantam is a separate view over existing owned items; store purchases remain unchanged. */
(()=>{'use strict';if(window.dmBagInventory)return;
const $=id=>document.getElementById(id);
const asset=name=>new URL(name, document.currentScript?.src || location.href).href;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types=[['all','Tümü','▦'],['characters','Karakterler','👧'],['clothing','Kıyafetler','👕'],['badges','Rozetler','⭐'],['items','Eşyalar','📦'],['energy','Enerji','⚡']];
const arr=x=>Array.isArray(x)?x:[];
const st=()=>typeof yo==='undefined'?{}:yo||{};
const norm=x=>typeof x==='string'?{id:x}:x&&typeof x==='object'?x:null;
const readable=x=>String(x||'').replace(/^d:/,'').replace(/[|:_-]+/g,' ').replace(/#[a-f0-9]{6}/gi,'').trim();
let active=false,category='all',popupEl=null,priorFocus=null,priorNavZ='';
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
 const y=st(),items=[],keys=new Set(),closet=y.karakter||{};
 function add(kind,id,name,n=0){
  id=String(id||'');if(!id||keys.has(kind+id))return;keys.add(kind+id);
  items.push({kind,id,name:String(name||readable(id)||'Ürün'),n:Math.max(0,Number(n)||0)});
 }
 for(const raw of arr(closet.sahip)){
  const o=norm(raw);if(!o)continue;const id=String(o.id||o.kod||o.key||'');if(!id)continue;
  const m=lookup(id),k=String(o.kategori||o.category||m.kategori||m.category||'').toLowerCase();
  const kind=/aksesuar|aks|eşya|esya|arka|çerçeve|cerceve|dost/.test(k)?'items':'clothing';
  add(kind,id,o.ad||o.name||m.ad||m.name||readable(id));
 }
 const roster=typeof window._krkListe==='function'?arr(window._krkListe()):[];
 for(const raw of arr(y.krkSatin)){
  const o=norm(raw);if(!o)continue;const id=String(o.id||o.kod||o.key||o.ad||'');if(!id)continue;
  const m=roster.find(x=>String(x.id||x.kod||x.ad)===id);
  add('characters',id,o.ad||o.name||m?.ad||m?.name||readable(id));
 }
 for(const raw of arr(y.rozetler)){
  const o=norm(raw);if(!o)continue;const id=String(o.id||o.kod||o.name||o.ad||'');
  if(id)add('badges',id,o.ad||o.name||readable(id));
 }
 for(const [id,num] of Object.entries(y.jokerEnv&&typeof y.jokerEnv==='object'?y.jokerEnv:{})){
  const n=Math.max(0,Number(num)||0);if(!n)continue;
  const info=arr(window.JOKER_MAGAZA).find(j=>j.tur===id||j.id===id);
  add('items',id,info?.ad||readable(id),n);
 }
 if(Number(y.dondurucu)>0)add('items','dondurucu','Seri Dondurucu',y.dondurucu);
 if(Number(y.dmExtraJoker)>0)add('items','extra-joker','Ek Joker',y.dmExtraJoker);
 const energy=Number(window.genelEnerjiKalan);
 if(Number.isFinite(energy)&&energy>0)add('energy','energy','Mevcut Enerji',energy);
 return items;
}
function pict(item){
 if(item.kind==='clothing'){
  const html=window.dmStoreWardrobe?.art?.(item.id);
  if(typeof html==='string'&&html.length<12000&&/<(?:svg|img)\b/i.test(html))return html;
 }
 const symbols={characters:'🦜',clothing:'👕',badges:'🏅',items:'🎁',energy:'⚡'};
 return '<span class="dm-bag-symbol" aria-hidden="true">'+(symbols[item.kind]||'📦')+'</span>';
}
function nav(){return document.querySelector('#bottomNavMobile [data-ekran="tab-magaza"]');}
function hidePopup(){popupEl?.remove();popupEl=null;}
function showPopup(){
 if(active||!nav())return;hidePopup();
 const r=nav().getBoundingClientRect(),el=document.createElement('div');el.id='dmBagPopup';
 el.style.left=Math.max(4,Math.min(window.innerWidth-97,r.left+r.width/2-46))+'px';
 el.style.bottom=(window.innerHeight-r.top+10)+'px';
 el.innerHTML='<button type="button" aria-label="Çantam sayfasını aç"><img src="'+asset('bag-purple.svg')+'" alt=""><strong>Çantam</strong></button>';
 el.querySelector('button').onclick=e=>{e.preventDefault();e.stopPropagation();openBag();};
 document.body.append(el);popupEl=el;
}
function closeBag(restore=true){
 hidePopup();if(!active)return;active=false;$('dmBagPage')?.remove();
 const b=$('bottomNavMobile');if(b)b.style.zIndex=priorNavZ;
 if(restore){window.magazaAc?.();priorFocus?.focus?.();}
}
function render(){
 const el=$('dmBagPage');if(!el)return;
 const data=entries(),groups=types.slice(1).map(([key,label])=>({key,label,items:data.filter(v=>v.kind===key)}));
 const sections=(category==='all'?groups:groups.filter(g=>g.key===category)).filter(g=>g.items.length);
 el.innerHTML='<main class="dm-bag-inner"><header class="dm-bag-header"><button type="button" class="dm-bag-back" data-bag-back aria-label="Mağazaya dön">‹</button><h1><img src="'+asset('bag-orange.svg')+'" alt="">Çantam</h1></header>'+
 '<nav class="dm-bag-tabs" role="tablist" aria-label="Çantam kategorileri">'+types.map(([key,label,icon])=>'<button type="button" role="tab" data-bag-tab="'+key+'" aria-selected="'+(category===key)+'"><span class="dm-bag-tab-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>').join('')+'</nav>'+
 (sections.map(g=>'<section class="dm-bag-section"><header><h2>'+esc(g.label)+'</h2><button type="button" class="dm-bag-showall" data-bag-tab="'+g.key+'">Tümünü Gör ›</button></header><div class="dm-bag-grid">'+g.items.map(i=>'<article class="dm-bag-card"><div class="dm-bag-picture">'+pict(i)+'<span class="dm-bag-owned" aria-label="Sahip olunan">✓</span></div><span class="dm-bag-name">'+esc(i.name)+(i.n?' · '+i.n:'')+'</span><button type="button" class="dm-bag-action" data-bag-manage="'+i.kind+'">'+(i.kind==='characters'||i.kind==='clothing'?'Kuşan':'İncele')+'</button></article>').join('')+'</div></section>').join('')||'<p class="dm-bag-empty">'+(category==='all'?'Çantanda henüz kayıtlı ürün yok. Mağazadan aldıkların burada görünecek.':'Bu kategoride henüz sahip olduğun bir ürün yok.')+'</p>')+'</main>';
 el.querySelector('[data-bag-back]').onclick=()=>closeBag();
 el.querySelectorAll('[data-bag-tab]').forEach(b=>b.onclick=()=>{category=b.dataset.bagTab;render();el.scrollTop=0;});
 el.querySelectorAll('[data-bag-manage]').forEach(b=>b.onclick=()=>{
  const kind=b.dataset.bagManage;closeBag(false);
  if(kind==='characters')document.querySelector('#dmStoreFront [data-ds="collection"]')?.click();
  else if(kind==='clothing')document.querySelector('#dmStoreFront [data-ds="clothing"]')?.click();
  else if(kind==='badges')window.dmBasarilarimAc?.();
  else window.yoToast?.('Bu ürünü ilgili oyun veya parkur bölümünde kullanabilirsin.');
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
}
function loadStyle(){if($('dmBagStyle'))return;const link=document.createElement('link');link.id='dmBagStyle';link.rel='stylesheet';link.href=asset('bag-inventory.css');document.head.appendChild(link);}
loadStyle();
document.addEventListener('click',e=>{
 const store=e.target?.closest?.('#bottomNavMobile [data-ekran="tab-magaza"]');
 if(store){if(!active)setTimeout(()=>{if($('tab-magaza')?.classList.contains('active'))showPopup();},0);return;}
 if(e.target?.closest?.('#dmBagPopup,#dmBagPage'))return;
 if(e.target?.closest?.('#bottomNavMobile [data-ekran]')){hidePopup();if(active)closeBag(false);return;}
 hidePopup();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(active){e.preventDefault();closeBag();}else hidePopup();}});
document.addEventListener('dm:login',()=>closeBag(false));
window.dmBagInventory={open:openBag,close:closeBag,refresh:()=>{if(active)render();}};
})();