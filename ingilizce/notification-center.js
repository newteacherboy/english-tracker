/* Personal inbox. Uses the existing portal session and server-side social policy. */
(()=>{'use strict';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const token=()=>sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'';
const eligible=()=>!!who()&&!['teacher','dijimedu_demo'].includes(who().toLowerCase())&&!window.dmGuestMode&&!window.dmTeacherPortalMode&&!window.siniftaOynananOgrenci;
const bell=document.createElement('button');bell.type='button';bell.className='dm-center-bell';bell.setAttribute('aria-label','Bildirimler');bell.setAttribute('aria-haspopup','dialog');bell.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5c-7 0-11 5-11 12v6l-4 5h30l-4-5v-6C31 10 27 5 20 5Z" fill="#FFC93C" stroke="#D89419" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 31a4 4 0 0 0 8 0" fill="#D89419"/><path d="M13 16a8 8 0 0 1 4-7" stroke="#fff3ae" stroke-width="3" stroke-linecap="round"/></svg><span class="dm-center-count" hidden></span>';
const badge=bell.querySelector('span');let owner='',session='',items=[],unread=0,layer=null,all=false,last=0,pending=null,serial=0,failed=false;
function reset(){const next=eligible()?who():'',t=next?token():'';if(next===owner&&t===session)return;serial++;close();owner=next;session=t;items=[];unread=0;last=0;pending=null;failed=false;paintBadge();}
function paintBadge(){badge.hidden=!unread;badge.textContent=unread?'+'+unread:'';bell.setAttribute('aria-label','Bildirimler'+(unread?', '+unread+' yeni bildirim':''));}
async function rpc(action='list',id=null){
 if(!session)throw Error('Öğrenci oturumu gerekli.');
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
 try{const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/dm_notification_center',{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:session,p_action:action,p_id:id}),signal:ctrl.signal});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.message||'Bildirimler yüklenemedi.');return d;}finally{clearTimeout(timer);}
}
function apply(d){items=Array.isArray(d.items)?d.items:[];unread=Math.max(0,Number(d.unread)||0);last=Date.now();failed=false;paintBadge();render();}
async function refresh(force=false){reset();if(!owner||!session||document.hidden||(!force&&!bell.isConnected))return;if(pending)return pending;if(!force&&Date.now()-last<120000)return;const at=serial;const task=(async()=>{try{const d=await rpc();if(at===serial)apply(d);}catch(e){if(at===serial){failed=true;last=Date.now();render();}}})();pending=task;try{await task;}finally{if(pending===task)pending=null;}}
const styles={canliDuelloDavet:['⚔️','Canlı düello daveti'],sureSandik:['🎁','Öğrenme sandığı'],ogretmen:['👨‍🏫','Öğretmen bildirimi'],canliDuelloSonuc:['⚔️','Düello sonucu'],sanalDuelloSonuc:['⚔️','Düello sonucu'],duello:['⚔️','Düello daveti'],duelloSonuc:['⚔️','Düello sonucu'],duelloYanit:['⚔️','Düello yanıtı'],oyunDavet:['🎮','Oyun daveti'],rozet:['🏅','Yeni rozet'],odul:['🎁','Ödül'],tuy:['🪶','Kuş tüyü'],mesaj:['💬','Yeni mesaj'],takip:['👥','Yeni takipçi'],hediye:['🎁','Hediye'],enerji:['⚡','Enerji hediyesi'],duyuru:['📢','Duyuru'],lig:['🏆','Lig'],gorev:['📋','Görev'],uyelik:['👑','Üyelik']};
function date(x){try{return new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(x));}catch{return '';}}
function close(){if(!layer)return;layer.remove();layer=null;bell.setAttribute('aria-expanded','false');if(bell.isConnected)bell.focus({preventScroll:true});}
function locate(){if(!layer)return;const r=bell.getBoundingClientRect(),panel=layer.firstElementChild;panel.style.top=Math.max(8,r.bottom+8)+'px';panel.style.right=Math.max(8,innerWidth-r.right)+'px';panel.style.maxHeight=Math.max(160,innerHeight-r.bottom-18)+'px';}
function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;}
function button(txt,fn){const b=el('button','',txt);b.type='button';b.onclick=fn;return b;}
function render(){if(!layer)return;const panel=layer.firstElementChild;panel.replaceChildren();const top=el('header','dm-center-top');top.append(el('h2','','Bildirimler'),button('×',close));panel.append(top);
const controls=el('div','dm-center-controls');controls.append(el('span','',unread?unread+' yeni bildirim':'Güncelsin!'),button('Tümünü okundu işaretle',()=>mark('read_all')));panel.append(controls);
if(failed){panel.append(el('p','dm-center-empty','Bağlantı kurulamadı.'),button('Tekrar dene',()=>refresh(true)));}
else if(!items.length)panel.append(el('p','dm-center-empty',last?'Henüz bildirimin yok.':'Bildirimlerin yükleniyor…'));
else for(const [i,n] of (all?items:items.slice(0,4)).entries()){const style=styles[n.tur]||['🔔','Bildirim'],row=el('div','dm-center-item'+(n.okundu?'':' is-new')),b=el('button','dm-center-row'),icon=el('span','dm-center-icon',style[0]),copy=el('span','dm-center-copy');b.type='button';copy.append(el('b','',n.title||style[1]),el('span','',n.metin||''),el('small','',date(n.tarih)));b.append(icon,copy);if(!n.okundu)b.append(el('i','dm-center-dot'));b.onclick=()=>choose(n);row.append(b);panel.append(row);if(n.tur==='duello'||n.tur==='oyunDavet'){row.dataset.notificationIndex=i;}}
if(items.length>4)panel.append(button(all?'Daha az göster':'Tümünü gör',()=>{all=!all;render();}));
if(window.DMNotificationActions&&items.some(n=>n.tur==='duello'||n.tur==='oyunDavet'))window.DMNotificationActions.mount(panel,all?items:items.slice(0,4),{owner,currentOwner:who,onNavigate:close}).catch(()=>{});
locate();}
async function mark(action,id=null){const at=serial;try{if(pending)await pending;if(at!==serial)return;const d=await rpc(action,id);if(at===serial)apply(d);}catch{if(at===serial){failed=true;render();}}}
function detail(n){const text=document.createElement('p');text.textContent=n.metin||'';return window.dmMemberUI?.sheet(n.title||'Bildirim',text.outerHTML);}
function navigateTab(tab){const f={parkur:window.dunyaAc,oyunlar:window.aktivitelerTamEkranAc,derscalis:window.dersCalisTamEkranAc,magaza:window.magazaAc,arkadaslar:window.meduAkisAc,profil:window.dmProfileMenuAc}[tab];if(typeof f!=='function')return false;f();return true;}
function friends(tab){window.dmFriends?.open?.();if(tab)window.dmFriends?.detail?.(tab);}
async function choose(n){const at=serial;const item={...n};if(!item.okundu)await mark('read',item.sat);if(at!==serial)return;close();switch(item.tur){
 case 'canliDuelloDavet':return window.dmLiveDuel?.openInvite?.(item.duelId,item.opponent);
 case 'sureSandik':{let chest=Number(item.chestIndex);if(window.dmActiveTime?.unclaimed?.().includes(chest))return window.dmActiveTime.openChest(chest);return window.DijiDailyGift?.open?.();}
 case 'canliDuelloSonuc':if(item.duelId&&window.dmLiveDuel?.openResult)return window.dmLiveDuel.openResult(item.duelId);return window.dmLeagueUI?.openDuelChooser?.();
 case 'sanalDuelloSonuc':if(item.virtualBot&&window.dmLeagueUI?.openVirtualDirect)return window.dmLeagueUI.openVirtualById?.(item.virtualBot);return window.dmLeagueUI?.openDuelChooser?.();
 case 'duello':case 'duelloSonuc':case 'duelloYanit':return window.dmLeagueUI?.openDuelChooser?.();
 case 'oyunDavet':return item.matchId?window.dmMatchAc?.(item.matchId):window.dmArenaAc?.();
 case 'mesaj':return window.dmMessageAc?.(item.gonderen);
 case 'takip':case 'tebrik':case 'hediye':case 'enerji':return item.gonderen?window.maProfilAc?.(item.gonderen):window.dmIlerlememAc?.();
 case 'tuy':return window.DijiDailyGift?.open?.();
 case 'rozet':return typeof window.dmBasarilarimAc==='function'?window.dmBasarilarimAc():window.dmProfileMenuAc?.();
 case 'odul':return window.dmIlerlememAc?.();
 case 'lig':return friends('lig');
 case 'duyuru':if(/öğretmenimle zirveye|24 kasım/i.test(item.title||'')&&window.dmZirve?.openStudentHub)return window.dmZirve.openStudentHub();if(item.routeTab&&navigateTab(item.routeTab))return;return detail(item);
 case 'ogretmen':return detail(item);
 case 'gorev':return typeof window.sanaOzelTamEkranAc==='function'?window.sanaOzelTamEkranAc():detail(item);
 case 'uyelik':return window.magazaAc?.();
 default:return friends('akis');
 }}
function open(){reset();if(!owner)return;if(layer){close();return;}all=false;layer=el('div','dm-center-layer');const panel=el('section','dm-center-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Bildirimler');layer.append(panel);layer.addEventListener('pointerdown',e=>{if(e.target===layer)close();});document.body.append(layer);bell.setAttribute('aria-expanded','true');render();void refresh(true);}
bell.onclick=open;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&layer)close();});window.addEventListener('resize',locate);
function mount(hud){reset();if(!eligible())return;if(bell.parentElement!==hud){hud.append(bell);void refresh();}}
function detach(){close();bell.remove();}
document.addEventListener('dm:login',()=>{reset();void refresh(true);});document.addEventListener('dm:logout',()=>{serial++;close();owner='';session='';items=[];unread=0;pending=null;last=0;paintBadge();bell.remove();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});setInterval(()=>{if(bell.isConnected)void refresh();},120000);
window.dmNotificationCenter={mount,detach,refresh,close};
})();