/* Arkadaşlar: one shared home, existing feed/showcase/league detail routes. */
(function () {
  'use strict';
  const root = document.getElementById('tab-meduakis');
  if (!root || typeof window.maCiz !== 'function') return;
  const $ = id => document.getElementById(id);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const who = () => typeof aktifOgrenciAdi === 'undefined' ? '' : String(aktifOgrenciAdi || '');
  const norm = x => String(x || '').trim().toLocaleLowerCase('tr');
  const icon = (name, cls = '') => `<svg class="fr-icon ${cls}" aria-hidden="true"><use href="friends-assets/icons.svg#${name}"></use></svg>`;
  const art = (name, cls = '') => `<img class="${cls}" src="friends-assets/${name}.png" alt="" decoding="async">`;
  root.querySelector('.akis-baslik h2')?.insertAdjacentHTML('afterend',`<div class="fr-header-actions"><button type="button" class="fr-showcase-link" data-friend-action="vitrin" data-friends-gate="vitrin">${icon('star')} Vitrinim</button></div>`);
  const permitted = code => window.dmFeatureEnabled?.(code) !== false && window.dmProgression?.allowed?.(code) !== false;
  function requireFeature(code) {
    if (window.dmFeatureEnabled?.(code) === false) { window.maToast?.('Bu özellik şu anda kapalı.'); return false; }
    return window.dmProgression?.require?.(code) !== false;
  }
  const originalDraw = window.maCiz, originalOpen = window.meduAkisAc, originalSelect = window.maSekmeSec;
  const originalFeed = window.maAkisListeHtml;
  let account = '', followed = [], invites = [], loaded = false, busy = false, lastLoad = 0, epoch = 0, frame = 0;
  const online = id => !!window.dmSocialPresence?.isOnline?.(id);
  function resetAccount() {
    if (account === who()) return;
    account = who(); followed = []; invites = []; loaded = false; busy = false; lastLoad = 0; epoch++;
  }
  function avatar(id, size) {
    let svg = typeof window.karakterSvg === 'function' ? window.karakterSvg(id, size) : '';
    if (!svg) svg = `<span>${typeof window.ogrenciMaskotSec === 'function' ? window.ogrenciMaskotSec(id) : '🦜'}</span>`;
    return `<span class="fr-avatar" style="--avatar-size:${size}px">${svg}</span>`;
  }
  function badge(id) { return `<span class="dm-online-badge compact" data-online-person="${esc(id)}">Durum kontrol ediliyor…</span>`; }
  function mine() { return typeof window.maBen === 'function' ? window.maBen() : {ad:who(),rozetler:[]}; }
  function league() {
    const list = [...(window.maLigSiralama?.().liste || [])].sort((a,b)=>Number(a.sira)-Number(b.sira));
    const me = list.find(x => x.benMi || norm(x.ad) === norm(who()));
    const code = me?.kod || 'yerel';
    return {me, info:MA_LIGLER[code] || MA_LIGLER.yerel};
  }
  function level() { return window.dmProgression?.level?.() || mine().playerLevel || 1; }
  function people() {
    const ids = new Set([...(typeof maTakip !== 'undefined' ? maTakip : []), ...followed.map(x=>x.ad)]);
    return [...ids].filter(id=>norm(id)!==norm(who())).sort((a,b)=>Number(online(b))-Number(online(a)));
  }
  function peopleHtml() {
    const known = typeof maTumListe !== 'undefined' ? maTumListe : [];
    const friends = people().slice(0,3).map(id=>`<button type="button" class="fr-person" data-friend-action="profile" data-person="${esc(id)}" aria-label="${esc(id)} vitrinini aç">${avatar(known.find(x=>norm(x.id)===norm(id))?.ad || id,58)}${badge(id)}<b>${esc(id)}</b></button>`).join('');
    const empty = friends ? '' : `<p class="fr-empty">${loaded?'Takip ettiğin arkadaşların burada görünür.':'Arkadaşların yükleniyor…'}</p>`;
    return empty+friends+`<button type="button" class="fr-invite-cta" data-friend-action="share">${icon('add')}<b>Davet et</b></button>`;
  }
  function tilesHtml() {
    const {me,info} = league();
    const pending = invites.some(x=>x.durum==='bekliyor'&&norm(x.alici)===norm(who()));
    return `<div class="fr-summaries">
      <button type="button" class="fr-tile fr-duel-tile" data-friend-action="matches" data-friends-gate="duello">${icon('swords')}<span><strong>Düello</strong><small>${pending?'Yeni oyun daveti':'Kapışma merkezi'}</small></span>${icon('chevron')}</button>
      <button type="button" class="fr-tile fr-league-tile" data-friend-action="lig" data-friends-gate="lig">${icon('trophy')}<span><strong>${esc(info.ad)}</strong><small>${me?esc(me.sira)+'. sıra · '+(Number(me.xp)||0)+' XP':'Sıralamayı gör'}</small></span>${icon('chevron')}</button>
    </div>`;
  }
  const filterOptions = [['herkes','Herkes'],['takip','Takip ettiklerim'],['online','Çevrimiçi']];
  function filters() {
    return `<div class="filtre fr-filters">${filterOptions.map(([id,label])=>`<button data-friend-action="filter" data-filter="${id}" aria-pressed="${maFiltre===id}" class="${maFiltre===id?'aktif':''}">${label}</button>`).join('')}<span class="ma-canli">● Canlı</span></div>`;
  }
  function invitationHtml() {
    const d = invites.find(x=>x.durum==='bekliyor'&&norm(x.alici)===norm(who()));
    if (!d) return '';
    return `<aside class="fr-invitation" role="status">${avatar(d.gonderen,36)}<span><b>${esc(d.gonderen)}</b> seni oyuna davet ediyor<small>${esc(window.dmMeduPro?.games?.[d.oyun]?.[0]||d.oyun)}</small></span><button data-friend-action="accept" data-invite-id="${esc(d.id)}" data-friends-gate="duello">Kabul et</button><button data-friend-action="dismiss" data-invite-id="${esc(d.id)}" aria-label="Daveti şimdilik gizle">×</button></aside>`;
  }
  function clubHeader(){return `<header class="club-hero"><button type="button" class="club-back" data-friend-action="home" aria-label="Arkadaşlar ana ekranına dön">‹</button><h2>Arkadaş akışı</h2><button type="button" data-friend-action="share" aria-label="Davet et">＋</button></header>`;}
  function homeHtml() {
    const options=filterOptions.map(([id,label])=>`<option value="${id}"${maFiltre===id?' selected':''}>${label}</option>`).join('');
    return `<div class="fr-home fr-compact">
      <section class="fr-friends"><div class="fr-section-head"><h3>${icon('people')} Arkadaşlarım</h3><button type="button" class="fr-link" data-friend-action="people">Tümünü gör ${icon('chevron')}</button></div><div class="fr-people">${peopleHtml()}</div></section>
      ${tilesHtml()}
      <section class="fr-feed"><div class="fr-section-head"><h3>${icon('bolt')} Etkinlikler</h3><select class="fr-filter-select" aria-label="Etkinlik filtresi">${options}</select></div><div id="maAkisListe">${window.maAkisListeHtml()}</div></section>
      <button type="button" class="fr-all-feed" data-friend-action="akis">Tüm etkinlikleri gör ${icon('chevron')}</button>
    </div>`;
  }
  function fullFeedHtml() {
    return `<div class="fr-home">${clubHeader()}${filters()}<section class="fr-feed" aria-label="Etkinlikler"><div id="maAkisListe">${window.maAkisListeHtml()}</div></section><div id="frInvitation">${invitationHtml()}</div></div>`;
  }
  function compactFeedHtml(rows) {
    if(!rows.length)return '<div class="ma-bos">'+(maAkisYuklendi?'Bu filtrede henüz etkinlik yok.':'Etkinlikler yükleniyor…')+'</div>';
    return rows.map((event,index)=>{
      const id=String(event.k), congratulated=maTebrik.has('akis-'+id);
      const person=typeof maTumListe!=='undefined'?maTumListe.find(x=>norm(x.id)===norm(event.ogr)):null;
      const action=event.tur==='eksi'?'':`<button type="button" class="fr-congrats${congratulated?' basili':''}" data-friend-action="congratulate" data-event="${esc(id)}" aria-pressed="${congratulated}">${congratulated?'✓ Tebrik edildi':icon('applause')+' Tebrik et'}</button>`;
      return `<article class="fr-event" data-fr-color="${index}" data-safety-event="${esc(id)}"><button type="button" class="fr-event-person" data-o="${esc(event.ogr)}" data-person="${esc(event.ogr)}" data-friend-action="profile">${avatar(person?.ad||event.ogr,44)}<span><b>${esc(event.ad||event.ogr)}</b><small title="${esc(event.metin)}">${esc(window.DMFriendsFeed.summarize?.(event) ?? event.metin)}</small></span></button>${action}</article>`;
    }).join('');
  }
  function viewHeader() {
    const home = maSekme === 'hub' && !maProfilId;
    root.classList.toggle('fr-home-view',home);
    root.classList.toggle('fr-club-view',maSekme==='akis'&&!maProfilId);
    root.dataset.friendsView = maProfilId ? 'profile' : maSekme;
    const back = root.querySelector('.fr-back'); if(back) back.hidden=home;
    root.querySelectorAll('#maSegment button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.s===maSekme));b.classList.toggle('aktif',b.dataset.s===maSekme);});
  }
  function renderHome() {
    if (maSekme!=='hub'||maProfilId) return;
    const scroll = root.scrollTop;
    $('maEkran').innerHTML=homeHtml();
    viewHeader();paintLocks();dockSpace();root.scrollTop=scroll;
  }
  function paintLocks() {
    root.querySelectorAll('[data-friends-gate]').forEach(b=>{const blocked=!permitted(b.dataset.friendsGate);b.classList.toggle('fr-locked',blocked);b.setAttribute('aria-disabled',String(blocked));});
    window.dmProgression?.paint?.();
  }
  async function loadHome(force=false) {
    resetAccount();if(busy||!force&&Date.now()-lastLoad<30000)return;
    busy=true;const owner=account, ticket=epoch;
    const results=await Promise.allSettled([
      Promise.resolve().then(()=>window.maTumGetir?.()),
      Promise.resolve().then(()=>window.maAkisYukle?.()),
      Promise.resolve().then(()=>window.maOlaylariYukle?.()),
      Promise.resolve().then(()=>window.dmProgression?.refresh?.()),
      permitted('takip')?window.dmMeduPro?.api?.('takipDavetListesi'):Promise.resolve(null),
      permitted('duello')?window.dmMeduPro?.api?.('duellolarim'):Promise.resolve(null)
    ]);
    if(owner!==who()||ticket!==epoch)return;
    if(results[4].status==='fulfilled'&&Array.isArray(results[4].value?.liste))followed=results[4].value.liste;
    if(results[5].status==='fulfilled'&&Array.isArray(results[5].value?.liste))invites=results[5].value.liste;
    busy=false;loaded=true;lastLoad=Date.now();renderHome();
    await window.dmSocialPresence?.refresh?.(true);
  }
  function decorateDetail() {
    viewHeader();
    if(maSekme==='lig'&&!maProfilId){
      const card=root.querySelector('.ml-ben');
      if(card&&!card.querySelector('.fr-league-papi'))card.insertAdjacentHTML('beforeend',art('papi-league','fr-league-papi'));
    }
    if(maSekme==='vitrin'||maProfilId){
      const stage=root.querySelector('.sahne');
      if(stage&&!stage.querySelector('.fr-vitrin-papi'))stage.insertAdjacentHTML('beforeend',art('papi-friends','fr-vitrin-papi'));
    }
    paintLocks();
  }
  window.maAkisHtml=function(){return fullFeedHtml();};
  window.maAkisListeHtml=function(){
    const saved=maAkisVeri, filter=maFiltre;
    let rows=window.DMFriendsFeed.select(saved).filter(e=>filter==='takip'?maTakip.has(e.ogr):filter==='online'?online(e.ogr):true);
    if(maSekme==='hub'&&!maProfilId)return compactFeedHtml(rows.slice(0,4));
    let html;
    try{maAkisVeri=rows;maFiltre='herkes';html=originalFeed.call(this);}finally{maAkisVeri=saved;maFiltre=filter;}
    if(!rows.length&&saved.length)html='<div class="ma-bos">'+(filter==='online'?'Şu anda çevrimiçi arkadaşlarından bir paylaşım yok.':filter==='takip'?'Takip ettiklerinden henüz bir paylaşım yok.':'Henüz bir paylaşım yok.')+'</div>';
    const box=document.createElement('div');box.innerHTML=html;
    box.querySelectorAll('.akis-kart').forEach(card=>{
      const row=card.querySelector('.akis-ust'),id=row?.dataset.o;if(!id)return;
      card.dataset.person=id;
      card.querySelector('.akis-ikon')?.remove();
      const sentence = card.querySelector('.akis-metin');
      const event=rows.find(x=>String(x.k)===card.dataset.safetyEvent),meta=event?.club;if(!meta)return;
      if(sentence)sentence.innerHTML=esc(sentence.textContent)+'<button type="button" class="club-content-link" data-club-open="'+esc(event.k)+'">'+esc(meta.label)+' ›</button>';
      card.querySelectorAll('[onclick*="maBegen"]').forEach(b=>b.remove());
      const congratulate=card.querySelector('[onclick*="maTebrikEt"]');
      if(congratulate){congratulate.removeAttribute('onclick');congratulate.dataset.friendAction='congratulate';congratulate.dataset.event=String(event.k);paintCongratulation(congratulate);}
      const stamp=document.createElement('i');stamp.className='club-event-badge';stamp.setAttribute('aria-hidden','true');stamp.style.backgroundPosition=(meta.badge%3*50)+'% '+Math.floor(meta.badge/3)*50+'%';if(meta.kind==='game'&&meta.game[1]!=='hafizaOyunAc'){const atlas={kelimeYarismasiAc:0,jpOyunAc:5,boslukOyunAc:3,yagmurOyunAc:6,asmacaOyunAc:4,kelimebulOyunAc:7,esOyunAc:8,trenOyunAc:9,dikteAc:10,cumleAc:11,harfBahcesiAc:15}[meta.game[1]];if(atlas!==undefined){stamp.style.backgroundImage="url('games-assets/game-atlas-v1.webp')";stamp.style.backgroundSize='400% 400%';stamp.style.backgroundPosition=(atlas%4*100/3)+'% '+Math.floor(atlas/4)*100/3+'%';stamp.style.borderRadius='20px';}}if(maSekme==='akis'&&!maProfilId)card.append(stamp);
      const time=row.querySelector('small');if(time)time.textContent=window.DMTime.format(event.t);
      const person=typeof maTumListe!=='undefined'?maTumListe.find(x=>norm(x.id)===norm(id)):null;
      const n=row.querySelector('b');
      const ownLevel=norm(id)===norm(who())?level():person?.playerLevel;
      const oldLevels=row.querySelectorAll('.dm-mini-level');oldLevels.forEach(x=>x.remove());
      row.querySelector('.dm-avatar-level')?.classList.add('fr-feed-avatar');
      if(n){n.innerHTML=`${esc(n.textContent)}${ownLevel?` <span class="fr-level">Sv. ${ownLevel}</span>`:''}${badge(id)}`;}
      const menu=document.createElement('button');menu.className='fr-more';menu.dataset.friendAction='profile';menu.dataset.person=id;menu.setAttribute('aria-label',id+' profil ve iletişim seçenekleri');menu.textContent='⋮';card.append(menu);
      if(meta.kind==='game'&&meta.game[3]&&permitted('duello')&&norm(id)!==norm(who()))card.querySelector('.aksiyon')?.insertAdjacentHTML('beforeend',`<button class="fr-card-invite" data-friend-action="invite" data-person="${esc(id)}" data-game="${esc(meta.game[3])}" data-friends-gate="duello">Davet et</button>`);
    });return box.innerHTML;
  };
  window.maCiz=async function(){
    resetAccount();viewHeader();
    if(maSekme==='hub'&&!maProfilId){++maCizNo;maOzetGeriKoy();window.yoGomuluHedef=null;renderHome();void loadHome();return;}
    const result=await originalDraw.apply(this,arguments);decorateDetail();return result;
  };
  window.maSekmeSec=function(s){
    if(s==='parkur'||s==='kesfet'||s==='hub'){
      ++maCizNo;maSekme='hub';maProfilId=null;viewHeader();renderHome();void loadHome();root.scrollTop=0;
      if(s==='kesfet')void openMatches();return;
    }
    if(['akis','vitrin','lig'].includes(s)&&!requireFeature(s))return;
    return originalSelect.apply(this,arguments);
  };
  window.meduAkisAc=function(){
    if(maSekme==='magaza')return originalOpen.apply(this,arguments);
    maSekme='hub';maProfilId=null;
    const result=originalOpen.apply(this,arguments);
    document.dispatchEvent(new Event('dm:friends-open'));
    return result;
  };
  function paintCongratulation(button) {
    const sent=maTebrik.has('akis-'+button.dataset.event);
    button.innerHTML=sent?'✓ Tebrik edildi':icon('applause')+' Tebrik et';
    button.setAttribute('aria-pressed',String(sent));
  }
  function openPeople() {
    const sheet=window.dmMeduPro?.sheet?.('Arkadaşlarım','Profilini açmak için arkadaşına dokun.');
    if(!sheet)return;
    sheet.p.classList.add('fr-friend-sheet');
    sheet.body.innerHTML=people().map(id=>`<div class="fr-search-person">${avatar(id,40)}<button type="button" class="fr-search-name" data-person="${esc(id)}"><b>${esc(id)}</b>${badge(id)}</button></div>`).join('')||'<p class="fr-empty">Henüz takip ettiğin bir arkadaş yok.</p>';
    sheet.body.querySelectorAll('[data-person]').forEach(button=>button.onclick=()=>{sheet.close();window.maAkisKisiAc?.(button.dataset.person);});
    void window.dmSocialPresence?.refresh?.();
  }
  async function shareInvite() {
    const url='https://app.dijimedu.com/ingilizce/';
    try{
      if(navigator.share){await navigator.share({title:'Diji Medu İngilizce',text:'Diji Medu’da birlikte İngilizce öğrenelim!',url});return;}
      if(navigator.clipboard){await navigator.clipboard.writeText(url);window.maToast?.('Davet bağlantısı kopyalandı.');return;}
    }catch(error){if(error.name==='AbortError')return;}
    const sheet=window.dmMeduPro?.sheet?.('Davet et','Bu bağlantıyı arkadaşınla paylaş.');
    if(sheet)sheet.body.innerHTML=`<a href="${url}">${url}</a>`;
  }
  function openMatches() {
    if(!requireFeature('duello'))return;
    if(!invitationHtml())return window.dmArenaAc?.();
    const sheet=window.dmMeduPro?.sheet?.('Düello','Gelen davetler ve kapışmalar.');
    if(!sheet)return;
    sheet.p.classList.add('fr-duel-sheet');
    sheet.body.innerHTML=`<div>${invitationHtml()}</div><button type="button" class="fr-duel-arena">Kapışmalarım</button>`;
    sheet.body.querySelector('.fr-duel-arena').onclick=()=>{sheet.close();window.dmArenaAc?.();};
    sheet.body.addEventListener('click',event=>{
      const button=event.target.closest('[data-invite-id]');
      if(!button)return;
      if(button.dataset.friendAction==='accept')void acceptInvite(button.dataset.inviteId,button).then(ok=>{if(ok)sheet.close();});
      else {invites=invites.filter(x=>String(x.id)!==button.dataset.inviteId);button.closest('.fr-invitation').remove();renderHome();}
    });
  }
  function openInvite(id,game){
    if(!requireFeature('duello'))return;
    window.maProfilAc(id);
    const inviteOwner=who();
    const apply=()=>{if(who()!==inviteOwner)return true;const panel=[...root.querySelectorAll('.dm-social')].find(x=>x.dataset.person===id);if(!panel)return false;const select=panel.querySelector('.dm-game');if(select&&game&&[...select.options].some(o=>o.value===game)){select.value=game;select.dispatchEvent(new Event('change',{bubbles:true}));}panel.scrollIntoView({block:'start',behavior:'smooth'});return true;};
    if(!apply()){const observer=new MutationObserver(()=>{if(apply())observer.disconnect();});observer.observe(root,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),5000);}
  }
  async function acceptInvite(id,btn){
    if(!requireFeature('duello'))return;
    const d=invites.find(x=>String(x.id)===String(id));if(!d)return;
    btn.disabled=true;
    try{
      const r=await window.dmMeduPro.api('duelloYanit',{id:d.id,kabul:true});
      if(r?.hata)throw Error(r.mesaj||'Davet kabul edilemedi.');
      invites=invites.filter(x=>x!==d);
      if($('frInvitation'))$('frInvitation').innerHTML=invitationHtml();
      renderHome();
      window.duelloOyununuAc?.(d.oyun);
      return true;
    }catch(e){window.maToast?.(e.message||'Davet kabul edilemedi.');btn.disabled=false;}
  }
  root.addEventListener('click',e=>{
    const link=e.target.closest('[data-club-open]');if(link){const event=maAkisVeri.find(x=>String(x.k)===link.dataset.clubOpen),meta=event&&window.DMFriendsFeed.classify(event);if(!meta)return;if(meta.kind==='game'){if(!requireFeature(meta.game[2]))return;const fn=window[meta.game[1]]||(meta.game[1]==='kelimebulOyunAc'?window.kelimeBulOyunAc:null);if(typeof fn==='function')fn();else window.aktivitelerTamEkranAc?.();}else if(meta.kind==='route')window.dmLearningRoute?.continue?.();else if(meta.kind==='story'){if(/hikâye|hikaye/i.test(event.metin))window.dmLearningCompanion?.nextStory?.();else window.dmLearningCompanion?.nextDialogue?.();}else if(meta.kind==='mission')window.dmLearningCompanion?.openMissions?.(/hafta/i.test(event.metin)?'weekly':'daily');else if(meta.kind==='league')window.maSekmeSec('lig');else if(meta.kind==='badge')window.dmBasarilarimAc?.();else if(meta.kind==='streak')window.dmLearningCompanion?.report?.();else window.dmIlerlememAc?.();return;}

    const b=e.target.closest('[data-friend-action]');if(!b)return;
    const action=b.dataset.friendAction;
    if(['home','akis','vitrin','lig'].includes(action)){window.maSekmeSec(action==='home'?'hub':action);return;}
    if(action==='share')return void shareInvite();
    if(action==='people')return openPeople();
    if(action==='congratulate'){window.maTebrikEt('akis-'+b.dataset.event,b);paintCongratulation(b);return;}
    if(action==='profile'){window.maAkisKisiAc?.(b.dataset.person);return;}
    if(action==='invite')return openInvite(b.dataset.person,b.dataset.game);
    if(action==='matches')return openMatches();
    if(action==='filter'){
      maFiltre=b.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('aktif',x.dataset.filter===maFiltre);x.setAttribute('aria-pressed',String(x.dataset.filter===maFiltre));});
      const draw=()=>{if($('maAkisListe'))$('maAkisListe').innerHTML=window.maAkisListeHtml();paintLocks();};
      draw();if(maFiltre==='online')Promise.resolve(window.dmSocialPresence?.refresh?.(true)).then(draw);return;
    }
    if(action==='accept')return void acceptInvite(b.dataset.inviteId,b);
    if(action==='dismiss'){invites=invites.filter(x=>String(x.id)!==b.dataset.inviteId);$('frInvitation').innerHTML=invitationHtml();}
  });
  root.addEventListener('change',e=>{
    if(!e.target.matches('.fr-filter-select'))return;
    maFiltre=e.target.value;
    const draw=()=>{if(maSekme==='hub'&&$('maAkisListe'))$('maAkisListe').innerHTML=window.maAkisListeHtml();};
    draw();if(maFiltre==='online')Promise.resolve(window.dmSocialPresence?.refresh?.(true)).then(draw);
  });
  const observer=new MutationObserver(()=>{
    if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(root.classList.contains('active')){decorateDetail();dockSpace();}});
  });
  // Only observe structure. Badge text/attribute updates must not cause a render loop.
  observer.observe($('maEkran'),{childList:true,subtree:true});
  setInterval(()=>{if(root.classList.contains('active')&&!document.hidden){resetAccount();paintLocks();if(maSekme==='hub'&&!maProfilId)void loadHome();}},60000);
  window.dmFriends={open:()=>window.meduAkisAc(),home:()=>window.maSekmeSec('hub'),detail:s=>window.maSekmeSec(s),refresh:()=>loadHome(true)};
  function dockSpace(){
    const dock=$('bottomNavMobile');
    if(!dock)return;
    const rect=dock.getBoundingClientRect();
    root.style.setProperty('--fr-nav-space',Math.max(84,rect.height+18)+'px');
    if(root.classList.contains('active')){
      const top=root.getBoundingClientRect().top;
      const bottom=rect.height?rect.top:top+root.clientHeight;
      root.style.setProperty('--fr-home-height',Math.max(0,bottom-top)+'px');
    }
  }
  const viewport = document.querySelector('meta[name="viewport"]');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let previousChrome;
  function syncHomeChrome() {
    const home = root.classList.contains('active') && root.classList.contains('fr-home-view');
    if (home) {
      previousChrome ||= {viewport:viewport?.content, color:themeColor?.content};
      if (viewport && !/viewport-fit\s*=/.test(viewport.content)) viewport.content += ', viewport-fit=cover';
      const surface = getComputedStyle(root).getPropertyValue('--fr-surface').trim();
      if (themeColor && surface && themeColor.content!==surface) themeColor.content=surface;
    } else if (previousChrome) {
      if (viewport) viewport.content=previousChrome.viewport;
      if (themeColor) themeColor.content=previousChrome.color;
      previousChrome=undefined;
    }
  }
  new MutationObserver(syncHomeChrome).observe(root,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',syncHomeChrome);
  window.addEventListener('resize',dockSpace,{passive:true});
  const dock=document.getElementById('bottomNavMobile');if(dock&&window.ResizeObserver)new ResizeObserver(dockSpace).observe(dock);
  dockSpace();viewHeader();
  // League movement is account-bound and deduplicated across reloads.
  if (!document.querySelector('script[data-dm-league-momentum]')) {
    const boost = document.createElement('script'); boost.src = 'league-momentum.js?v=20261028-2gun-1'; boost.defer = true;
    boost.dataset.dmLeagueMomentum = '1'; document.head.append(boost);
  }
})();
