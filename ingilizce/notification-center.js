/* Personal inbox. Uses the existing portal session and server-side social policy. */
(()=>{'use strict';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const token=()=>sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||'';
const eligible=()=>!!who()&&!['teacher','dijimedu_demo'].includes(who().toLowerCase())&&!window.dmGuestMode&&!window.dmTeacherPortalMode&&!window.siniftaOynananOgrenci;
const bell=document.createElement('button');bell.type='button';bell.className='dm-center-bell';bell.setAttribute('aria-label','Bildirimler');bell.setAttribute('aria-haspopup','dialog');bell.setAttribute('aria-expanded','false');bell.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8.5-3 9.5h18c0-1-3-2.5-3-9.5Z"/><path d="M10 21h4"/></svg><span class="dm-center-count" hidden></span>';
let owner='',session='',items=[],unread=0,layer=null,trigger=null,secondary=null,history=false,last=0,pending=null,serial=0,failed=false;
function reset(){const next=eligible()?who():'',t=next?token():'';if(next===owner&&t===session)return;serial++;close();owner=next;session=t;items=[];unread=0;last=0;pending=null;failed=false;paintBadge();}
function paintBadge(){
 for(const button of [bell,secondary].filter(Boolean)){
  const badge=button.querySelector('span');
  badge.hidden=!unread;badge.textContent=unread>9?'+9':unread?String(unread):'';
  button.setAttribute('aria-label','Bildirimler'+(unread?', '+unread+' okunmamış bildirim':''));
 }
 document.dispatchEvent(new CustomEvent('dm:notifications-updated',{detail:{unread}}));
}
async function rpc(action='list',id=null){
 if(!session)throw Error('Öğrenci oturumu gerekli.');
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
 try{const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/dm_notification_center',{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:session,p_action:action,p_id:id}),signal:ctrl.signal});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.message||'Bildirimler yüklenemedi.');return d;}finally{clearTimeout(timer);}
}
function apply(d){items=Array.isArray(d.items)?d.items:[];unread=Math.max(0,Number(d.unread)||0);last=Date.now();failed=false;paintBadge();render();}
async function refresh(force=false){reset();if(!owner||!session||document.hidden||(!force&&!bell.isConnected&&!secondary?.getClientRects().length))return;if(pending)return pending;if(!force&&Date.now()-last<120000)return;const at=serial;const task=(async()=>{try{const d=await rpc();if(at===serial)apply(d);}catch(e){if(at===serial){failed=!items.length;last=Date.now();render();}}})();pending=task;try{await task;}finally{if(pending===task)pending=null;}}
const styles={canliDuelloDavet:['⚔️','Canlı düello daveti'],sureSandik:['🎁','Öğrenme sandığı'],ogretmen:['👨‍🏫','Öğretmen bildirimi'],canliDuelloSonuc:['⚔️','Düello sonucu'],sanalDuelloSonuc:['⚔️','Düello sonucu'],duello:['⚔️','Düello daveti'],duelloSonuc:['⚔️','Düello sonucu'],duelloYanit:['⚔️','Düello yanıtı'],oyunDavet:['🎮','Oyun daveti'],rozet:['🏅','Yeni rozet'],odul:['🎁','Ödül'],tuy:['🪶','Kuş tüyü'],mesaj:['💬','Yeni mesaj'],takip:['👥','Yeni takipçi'],hediye:['🎁','Hediye'],enerji:['⚡','Enerji hediyesi'],duyuru:['📢','Duyuru'],lig:['🏆','Lig'],gorev:['📋','Görev'],uyelik:['👑','Üyelik']};
function date(x){if(!x)return '';try{return new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(x));}catch{return '';}}
const resultTypes=new Set(['canliDuelloSonuc','sanalDuelloSonuc','duelloSonuc']);

function duelResult(n){
 const text=String(n.title||'')+' '+String(n.metin||'');
 if(/berabere/i.test(text))return {label:'Berabere',className:'draw'};
 if(/kazandın|kazandin/i.test(String(n.title||'')))return {label:'Galibiyet',className:'win'};
 if(/kaybettin|rövanşa ne dersin/i.test(text))return {label:'Mağlubiyet',className:'loss'};
 return {label:'Tamamlandı',className:'neutral'};
}
function score(n){
 const match=String(n.metin||'').match(/(?:skor(?:u)?\s*[:：]?\s*)(\d+)\s*[–—-]\s*(\d+)/i);
 return match?[match[1],match[2]]:null;
}
function summary(n){
 const points=resultTypes.has(n.tur)&&score(n);
 if(points)return 'Sen '+points[0]+' · '+String(n.opponent||n.gonderen||'Rakip')+' '+points[1];
 return String(n.metin||'').replace(/\s+/g,' ').trim();
}
function headline(n){
 const sender=String(n.gonderen||'').trim();
 const opponent=String(n.opponent||sender).trim();
 const title=String(n.title||''),body=String(n.metin||'');
 if(resultTypes.has(n.tur)&&opponent){
  if(/berabere/i.test(title))return opponent+' ile berabere kaldın';
  if(/kazandın/i.test(title))return 'Rakip: '+opponent+' · Kazandın';
  if(/kaybettin/i.test(title)||/rövanşa ne dersin/i.test(body))return opponent+' seni düelloda yendi';
  return 'Düello rakibin: '+opponent;
 }
 if((n.tur==='canliDuelloDavet'||n.tur==='duello')&&opponent)return opponent+' sana düello daveti gönderdi';
 if(n.tur==='mesaj'&&sender)return sender+' sana mesaj gönderdi';
 if(n.tur==='takip'&&sender)return sender+' seni takip etmeye başladı';
 if(n.tur==='oyunDavet'&&sender)return sender+' seni oyuna davet etti';
 if(n.tur==='hediye'&&sender)return sender+' sana hediye gönderdi';
 if(n.tur==='enerji'&&sender)return sender+' sana '+(body.match(/\d+\s+enerji/i)?.[0]||'enerji')+' gönderdi';
 return title||styles[n.tur]?.[1]||'Bildirim';
}
function notificationIcon(type){
 const kind=resultTypes.has(type)||/Duello|duello/.test(type)?'swords':type==='enerji'?'bolt':type==='takip'?'people':type==='lig'?'trophy':'';
 if(kind)return '<svg viewBox="0 0 32 32" aria-hidden="true"><use href="friends-assets/icons.svg#'+kind+'"></use></svg>';
 const path=type==='mesaj'
  ?'<path d="M4 5h16v12H9l-5 4z"/>'
  :type==='hediye'||type==='odul'||type==='sureSandik'
  ?'<path d="M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8C1 8 7-3 12 8c5-11 11 0 0 0Z"/>'
  :'<path d="m4 9 14-5v16L4 15zM4 9H2v6h2m3 1 2 5h3"/>';
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
}
function close(restoreFocus=true){
 if(!layer)return;
 layer.remove();layer=null;
 trigger?.setAttribute('aria-expanded','false');
 if(restoreFocus&&trigger?.isConnected)trigger.focus({preventScroll:true});
 trigger=null;
}
function locate(){
 if(!layer||!trigger?.isConnected)return;
 const r=trigger.getBoundingClientRect(),panel=layer.firstElementChild,vp=window.visualViewport;
 const width=vp?.width||innerWidth,height=vp?.height||innerHeight,left=vp?.offsetLeft||0,top0=vp?.offsetTop||0;
 const w=Math.min(350,width-24);
 const top=history?top0+Math.max(12,(height-Math.min(260,height*.5))/2):Math.max(top0+12,Math.min(r.bottom+10,top0+height*.25));
 const right=history?innerWidth-left-(width+w)/2:Math.max(innerWidth-left-width+8,Math.min(innerWidth-r.right,innerWidth-left-w-8));
 panel.style.width=w+'px';panel.style.top=top+'px';panel.style.right=right+'px';
 panel.style.maxHeight=Math.max(80,Math.min(history?290:360,height*.55,top0+height-top-12))+'px';
}
function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;}
function button(txt,fn){const b=el('button','',txt);b.type='button';b.onclick=fn;return b;}
function render(){
 if(!layer)return;
 const panel=layer.firstElementChild,previous=panel.querySelector('.dm-center-list')?.scrollTop||0;
 panel.replaceChildren();
 const top=el('header','dm-center-top'),x=button('×',()=>close());
 x.className='dm-center-close';x.setAttribute('aria-label','Kapat');
 top.append(el('h2','',history?'Geçmiş Düellolar':'Bildirimler'));
 if(history)top.append(el('small','dm-center-period','Son 30 gün'));
 else if(unread)top.append(el('small','dm-center-unread',unread+' yeni'));
 top.append(x);panel.append(top);
 panel.classList.toggle('is-history',history);
 const list=el('div','dm-center-list');panel.append(list);
 const rows=history?items.filter(n=>resultTypes.has(n.tur)):items;
 if(failed){list.append(el('p','dm-center-empty','Bağlantı kurulamadı.'),button('Tekrar dene',()=>refresh(true)));}
 else if(!rows.length)list.append(el('p','dm-center-empty',last?(history?'Son 30 günde gösterilecek düello sonucu yok.':'Henüz bildirimin yok.'):'Yükleniyor…'));
 else for(const n of rows){
  const style=styles[n.tur]||['🔔','Bildirim'],row=el('div','dm-center-item'+(n.okundu?'':' is-new'));
  const b=el('button','dm-center-row'),icon=el('span','dm-center-icon',style[0]),copy=el('span','dm-center-copy');
  b.type='button';icon.setAttribute('aria-hidden','true');icon.innerHTML=notificationIcon(n.tur);
  const label=headline(n);b.title=label;
  if(history){
   const opponent=String(n.opponent||n.gonderen||'Papi');
   const portrait=window.karakterSvg?.(opponent,27);
   if(portrait)icon.innerHTML=portrait;
   if(opponent.toLocaleLowerCase('tr')==='papi')icon.innerHTML='<img src="friends-assets/papi-fencer.webp" alt="" width="27" height="27">';
   copy.append(el('b','',String(n.opponent||n.gonderen||'Papi')));
   const timestamp=el('time','dm-center-date',date(n.tarih));
   copy.append(timestamp);
   const outcome=duelResult(n),points=score(n),result=el('span','dm-center-result '+outcome.className);
   if(points)result.append(el('b','',points.join(' – ')));
   result.append(el('small','',outcome.label));
   b.append(icon,copy,result,el('span','dm-center-chevron','›'));
  }else{
   copy.append(el('b','',label));
   const preview=summary(n);if(preview&&preview!==label)copy.append(el('span','dm-center-preview',preview));
   b.append(icon,copy,el('time','dm-center-date',date(n.tarih)));
   if(!n.okundu)b.append(el('i','dm-center-dot'));
  }
  b.onclick=()=>choose(n);row.append(b);list.append(row);
 }
 if(!history&&unread){
  const footer=el('footer','dm-center-footer'),markAll=button('Tümünü okundu işaretle',()=>mark('read_all'));
  footer.append(markAll);panel.append(footer);
 }
 list.scrollTop=previous;locate();
}
async function mark(action,id=null){const at=serial;try{if(pending)await pending;if(at!==serial)return;const d=await rpc(action,id);if(at===serial)apply(d);}catch{if(at===serial){failed=true;render();}}}
function detail(n,onAction=null){
 const title=String(n.title||'Diji-Medu bildirimi'),description=String(n.metin||'Bildirimini görüntüledin.');
 const host=el('div','dm-center-detail-layer'),box=el('section','dm-center-detail');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);
 box.append(el('h3','',title),el('p','',description),el('time','dm-center-date',date(n.tarih)));
 if(onAction)box.append(button(n.tur==='canliDuelloSonuc'?'Sonucu aç':'İlgili ekranı aç',()=>{host.remove();onAction();}));
 box.append(button('Kapat',()=>host.remove()));host.append(box);host.onclick=e=>{if(e.target===host)host.remove();};document.body.append(host);box.querySelector('button').focus();return host;
}
function campaign(){const fn=window.dmZirve?.openStudentHub;if(typeof fn==='function'){fn();return true;}return false;}
function navigateTab(tab){
 if(tab==='campaign'||tab==='zirve')return campaign();
 const ids={parkur:'tab-dunya',oyunlar:'tab-aktiviteler',derscalis:'tab-derscalis',magaza:'tab-magaza',arkadaslar:'tab-meduakis',profil:'tab-profile-menu'};
 const dest=ids[tab],button=dest&&document.querySelector('#bottomNavMobile [data-ekran="'+dest+'"]');
 if(button){button.click();return true;}
 const f={parkur:window.dunyaAc,oyunlar:window.aktivitelerTamEkranAc,derscalis:window.dersCalisTamEkranAc,magaza:window.magazaAc,arkadaslar:window.meduAkisAc,profil:window.dmProfileMenuAc}[tab];
 if(typeof f!=='function')return false;f();return true;
}
function friends(tab){window.dmFriends?.open?.();if(tab)window.dmFriends?.detail?.(tab);}
async function choose(n){
 const at=serial,item={...n},opened=layer,fromHistory=history;
 if(!item.okundu)await mark('read',item.sat);
 if(at!==serial||layer!==opened)return;
 close();
 const action=fromHistory
  ?(item.tur==='canliDuelloSonuc'&&item.duelId&&window.dmLiveDuel?.openResult?()=>navigate(item):null)
  :()=>navigate(item);
 return detail({...item,title:headline(item)},action);
}
function navigate(item){
 if(item.routeTab==='team-requests'||(item.tur==='gorev'&&/Takıma katılma isteği|Takım daveti|Kaptanlık teklifi/i.test(item.title||''))){
  const kind=/katılma isteği/i.test(item.title||'')?'join':/takım daveti/i.test(item.title||'')?'invite':'transfer';
  return window.dmTeam?.navigateRequests?.(kind);
 }
 switch(item.tur){
 case 'canliDuelloDavet':return typeof window.dmLiveDuel?.openInvite==='function'?window.dmLiveDuel.openInvite(item.duelId,item.opponent):window.dmLeagueUI?.openDuelChooser?.();
 case 'sureSandik':{let chest=Number(item.chestIndex);if(window.dmActiveTime?.unclaimed?.().includes(chest))return window.dmActiveTime.openChest(chest);return window.DijiDailyGift?.open?.();}
 case 'canliDuelloSonuc':if(item.duelId&&window.dmLiveDuel?.openResult)return window.dmLiveDuel.openResult(item.duelId);return window.dmLeagueUI?.openDuelChooser?.();
 case 'sanalDuelloSonuc':if(item.virtualBot&&typeof window.dmLeagueUI?.openVirtualById==='function')return window.dmLeagueUI.openVirtualById(item.virtualBot);return window.dmLeagueUI?.openDuelChooser?.();
 case 'duello':case 'duelloSonuc':case 'duelloYanit':return window.dmLeagueUI?.openDuelChooser?.();
 case 'oyunDavet':return item.matchId?window.dmMatchAc?.(item.matchId):window.dmArenaAc?.();
 case 'mesaj':return detail(item);
 case 'takip':case 'tebrik':case 'hediye':case 'enerji':return item.gonderen?window.maProfilAc?.(item.gonderen):window.dmIlerlememAc?.();
 case 'tuy':return window.DijiDailyGift?.open?.();
 case 'rozet':return typeof window.dmBasarilarimAc==='function'?window.dmBasarilarimAc():window.dmProfileMenuAc?.();
 case 'odul':return window.dmIlerlememAc?.();
 case 'lig':return window.dmLeagueUI?.openWeekly?.()||friends('lig');
 case 'duyuru':if((item.routeTab==='campaign'||/öğretmenimle zirveye|24 kasım|premium pro hediyeni|ücretsiz yarışma/i.test((item.title||'')+' '+(item.metin||'')))&&campaign())return;if(item.routeTab&&navigateTab(item.routeTab))return;return detail(item);
 case 'ogretmen':return detail(item);
 case 'gorev':return typeof window.sanaOzelTamEkranAc==='function'?window.sanaOzelTamEkranAc():detail(item);
 case 'uyelik':return window.magazaAc?.();
 default:return friends('akis');
 }}
function open(anchor=bell,duelHistory=false){
 reset();if(!owner)return;
 if(layer&&trigger===anchor){close();return;}
 if(layer)close(false);
 trigger=anchor;history=duelHistory;
 layer=el('div','dm-center-layer');const panel=el('section','dm-center-panel');
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',history?'Geçmiş Düellolar':'Bildirimler');
 layer.append(panel);layer.addEventListener('pointerdown',e=>{if(e.target===layer)close();});
 document.body.append(layer);anchor.setAttribute('aria-expanded','true');render();panel.querySelector('.dm-center-close')?.focus({preventScroll:true});
 if(Date.now()-last>15000)void refresh(true);
}
bell.onclick=()=>open();
function mountSecondary(host){
 if(!host)return;
 reset();if(!owner){host.replaceChildren();return;}
 if(!secondary){
  secondary=bell.cloneNode(true);secondary.classList.add('dm-center-bell-secondary');
  secondary.setAttribute('aria-expanded','false');secondary.onclick=()=>open(secondary);
 }
 if(secondary.parentElement!==host)host.append(secondary);
 paintBadge();void refresh();
}
function closeSecondary(){if(trigger===secondary||history)close(false);}
document.addEventListener('pointerdown',e=>{if(layer&&!layer.contains(e.target)&&!trigger?.contains(e.target)&&!bell.contains(e.target)&&!secondary?.contains(e.target))close(false);},true);
document.addEventListener('keydown',e=>{
 const dialog=document.querySelector('.dm-center-detail-layer')||layer;
 if(!dialog)return;
 if(e.key==='Escape'){if(dialog!==layer)dialog.remove();else close();}
 if(e.key==='Tab'){
  const controls=[...dialog.querySelectorAll('button:not([disabled])')];
  const first=controls[0],last=controls.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }
});
window.addEventListener('resize',locate);
window.visualViewport?.addEventListener('resize',locate);
function mount(hud){reset();if(!eligible())return;if(bell.parentElement!==hud){hud.append(bell);void refresh();}if(layer)requestAnimationFrame(locate);}
function detach(){if(trigger===bell)close(false);bell.remove();}
document.addEventListener('dm:login',()=>{reset();void refresh(true);});document.addEventListener('dm:logout',()=>{serial++;close();owner='';session='';items=[];unread=0;pending=null;last=0;paintBadge();bell.remove();secondary?.remove();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});setInterval(()=>{if(bell.isConnected||secondary?.getClientRects().length)void refresh();},120000);
window.dmNotificationCenter={mount,mountSecondary,detach,refresh,close,closeSecondary,open:()=>open(),openDuelHistory:anchor=>open(anchor,true),getUnread:()=>unread};
})();