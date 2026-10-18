/* Arkadaşlar: one shared home, existing feed/showcase/league detail routes. */
(function () {
  'use strict';
  const root = document.getElementById('tab-meduakis');
  if (!root || typeof window.maCiz !== 'function') return;
  const $ = id => document.getElementById(id);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const who = () => typeof aktifOgrenciAdi === 'undefined' ? '' : String(aktifOgrenciAdi || '');
  // Highlight meaningful facts without trusting feed text as HTML.
  function feedHighlights(raw) {
    const content = String(raw ?? '');
    const important = /(?:\d+(?:[.,]\d+)?\.\s*(?:sınıf|ünite|durak|durağı|bölüm|sıra|sıradan|sıraya)|\d+(?:[.,]\d+)?\s*(?:XP|altın|enerji|puan)|Macera Haritası|Öğrenme Yolu|Şampiyonlar Ligi|Süper Lig|Yerel Lig|yeni bir (?:kıyafet|karakter|aksesuar|çanta|tişört|pantolon|rozet)|satın aldı|tamamladı|yükseldi|kazandı|koleksiyonuna kattı|tebrik etti|seni geçti)/giu;
    const hits = [...content.matchAll(important)].filter(m => m[0]);
    if (!hits.length) {
      const prefix = /^.{1,32}?(?=\s|$)/u.exec(content)?.[0] || '';
      return prefix ? '<strong class="fr-feed-key fr-feed-key-1">' + esc(prefix) + '</strong>' + esc(content.slice(prefix.length)) : esc(content);
    }
    let out = '', cursor = 0;
    hits.forEach((m, i) => {
      if (m.index < cursor) return;
      out += esc(content.slice(cursor, m.index));
      out += '<strong class="fr-feed-key fr-feed-key-' + (i % 4 + 1) + '">' + esc(m[0]) + '</strong>';
      cursor = m.index + m[0].length;
    });
    return out + esc(content.slice(cursor));
  }

  const norm = x => String(x || '').trim().toLocaleLowerCase('tr');
  const icon = (name, cls = '') => `<svg class="fr-icon ${cls}" aria-hidden="true"><use href="friends-assets/icons.svg#${name}"></use></svg>`;
  const art = (name, cls = '') => `<img class="${cls}" src="friends-assets/${name}.png" alt="" decoding="async">`;
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
    return {me, info:MA_LIGLER[code] || MA_LIGLER.yerel, list:list.filter(x=>x.kod===code).slice(0,3)};
  }
  function level() { return window.dmProgression?.level?.() || mine().playerLevel || 1; }
  function peopleHtml() {
    const known = typeof maTumListe !== 'undefined' ? maTumListe : [];
    const ids = new Set([...(typeof maTakip !== 'undefined' ? maTakip : []), ...followed.map(x=>x.ad)]);
    const people = [...ids].filter(id=>norm(id)!==norm(who())).sort((a,b)=>Number(online(b))-Number(online(a)));
    return people.length ? people.slice(0,6).map(id=>`<button class="fr-person" data-friend-action="profile" data-person="${esc(id)}" aria-label="${esc(id)} vitrinini aç">${avatar(known.find(x=>norm(x.id)===norm(id))?.ad || id,52)}${badge(id)}<b>${esc(id)}</b></button>`).join('') : `<div class="fr-empty">${loaded?'Takip ettiğin arkadaşların burada görünür.':'Arkadaşların yükleniyor…'}<button data-friend-action="find">${loaded?'Arkadaş ekle':'Arkadaş ara'}</button></div>`;
  }
  function showcaseSummary(o) {
    const allBadges = Array.isArray(o.rozetler) ? o.rozetler : [];
    const selections = typeof maVitrinSecim !== 'undefined' && Array.isArray(maVitrinSecim) ? maVitrinSecim : [];
    const chosen = [...new Set(selections)].filter(i=>Number.isInteger(i)&&i>=0&&i<allBadges.length).map(i=>allBadges[i]).filter(Boolean).slice(0,3);
    const earned = chosen.length ? chosen : allBadges.filter(Boolean).slice(-3).reverse();
    const badges = Array.from({length:3},(_,i)=>earned[i]?`<span class="fr-earned" title="${esc(earned[i][1])}">${earned[i][0]||icon('medal')}</span>`:'<span class="fr-badge-slot" aria-label="Henüz seçilmemiş rozet">+</span>').join('');
    return `<section class="fr-summary fr-showcase"><div class="fr-section-head"><h3>${icon('people')} Vitrinim</h3><span class="fr-level">Sv. ${level()}</span></div><div class="fr-showcase-body">${avatar(who(),86)}${art('papi-friends','fr-showcase-papi')}<div class="fr-showcase-info"><span class="fr-streak">🔥 ${Math.max(0,Number(o.seri)||0)} gün</span><div class="fr-badges">${badges}</div></div></div><button class="fr-open" data-friend-action="vitrin" data-friends-gate="vitrin">${permitted('vitrin')?'Vitrinimi aç':'🔒 Vitrinim · 15. seviye'} ${icon('chevron')}</button></section>`;
  }
  function leagueSummary() {
    const {me,info,list} = league();
    return `<section class="fr-summary fr-league"><div class="fr-section-head"><h3>${icon('trophy')} Ligim</h3><span class="fr-league-name">${esc(info.kisa)}</span></div><div class="fr-league-position"><strong>${me?esc(me.sira)+'. sıra':'—'}</strong><span>⭐ ${me?Number(me.xp)||0:0} XP</span></div><div class="fr-podium-mini">${list.length?list.map((p,i)=>`<button data-friend-action="profile" data-person="${esc(p.ad)}"><span class="fr-rank fr-rank-${i+1}">${p.sira}</span>${avatar(p.ad,22)}<b>${esc(p.benMi?'Sen':p.ad)}</b><small>${Number(p.xp)||0} XP</small></button>`).join(''):`<p class="fr-empty">${permitted('lig')?'Bu haftanın sıralaması hazırlanıyor.':'Lig 5. seviyede açılır.'}</p>`}</div><button class="fr-open" data-friend-action="lig" data-friends-gate="lig">${permitted('lig')?'Ligi aç':'🔒 Lig · 5. seviye'} ${icon('chevron')}</button></section>`;
  }
  function filters() {
    return `<div class="filtre fr-filters">${[['herkes','Herkes'],['takip','Takip ettiklerim'],['online','Çevrimiçi']].map(([id,label])=>`<button data-friend-action="filter" data-filter="${id}" aria-pressed="${maFiltre===id}" class="${maFiltre===id?'aktif':''}">${label}</button>`).join('')}<span class="ma-canli">● Canlı</span></div>`;
  }
  function invitationHtml() {
    const d = invites.find(x=>x.durum==='bekliyor'&&norm(x.alici)===norm(who()));
    if (!d) return '';
    return `<aside class="fr-invitation" role="status">${avatar(d.gonderen,36)}<span><b>${esc(d.gonderen)}</b> seni oyuna davet ediyor<small>${esc(window.dmMeduPro?.games?.[d.oyun]?.[0]||d.oyun)}</small></span><button data-friend-action="accept" data-invite-id="${esc(d.id)}" data-friends-gate="duello">Kabul et</button><button data-friend-action="dismiss" data-invite-id="${esc(d.id)}" aria-label="Daveti şimdilik gizle">×</button></aside>`;
  }
  function homeHtml() {
    const o = mine();
    return `<div class="fr-home"><section class="fr-welcome">${art('papi-friends','fr-welcome-papi')}<p>Birlikte öğren, birlikte yüksel! <span>♥</span></p><button class="fr-add" data-friend-action="find">${icon('add')} Arkadaş ekle</button></section><section class="fr-friends fr-card"><div class="fr-section-head"><h3>${icon('people')} Arkadaşlarım</h3><button class="fr-link fr-invite-link" data-friend-action="friends" data-mode="invite">Davet et ${icon('chevron')}</button></div><div class="fr-people">${peopleHtml()}</div></section><div class="fr-summaries">${showcaseSummary(o)}${leagueSummary()}</div><section class="fr-feed fr-card"><div class="fr-section-head"><h3>${icon('people')} Arkadaş akışı</h3><button class="fr-link" data-friend-action="akis">Tümünü gör ${icon('chevron')}</button></div>${filters()}<div id="maAkisListe">${window.maAkisListeHtml()}</div></section><div id="frInvitation">${invitationHtml()}</div><button class="fr-matches" data-friend-action="matches" data-friends-gate="duello">⚔️ Karşılaşmalarım ${icon('chevron')}</button></div>`;
  }
  function viewHeader() {
    const home = maSekme === 'hub' && !maProfilId;
    root.classList.toggle('fr-home-view',home);
    root.dataset.friendsView = maProfilId ? 'profile' : maSekme;
    const back = root.querySelector('.fr-back'); if(back) back.hidden=home;
    root.querySelectorAll('#maSegment button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.s===maSekme));b.classList.toggle('aktif',b.dataset.s===maSekme);});
  }
  function renderHome() {
    if (maSekme!=='hub'||maProfilId) return;
    const scroll = root.scrollTop;
    $('maEkran').innerHTML=homeHtml();
    viewHeader();paintLocks();root.scrollTop=scroll;
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
    if(maSekme==='akis'&&!maProfilId&&!$('frFeedHero')){
      const hero=document.createElement('section');hero.id='frFeedHero';hero.className='fr-welcome fr-detail-welcome';
      hero.innerHTML=art('papi-friends','fr-welcome-papi')+'<p>Birlikte öğren,<br>birlikte yüksel!</p><button class="fr-add" data-friend-action="find">'+icon('add')+' Arkadaş ekle</button>';
      $('maEkran').querySelector('.ma-gir')?.prepend(hero);
    }
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
  window.maAkisHtml=function(){return filters()+`<div id="maAkisListe">${window.maAkisListeHtml()}</div>`;};
  window.maAkisListeHtml=function(){
    const saved=maAkisVeri, filter=maFiltre;
    let rows=saved.filter(e=>filter==='takip'?maTakip.has(e.ogr):filter==='online'?online(e.ogr):true);
    if(maSekme==='hub'&&!maProfilId)rows=rows.slice(0,2);
    let html;
    try{maAkisVeri=rows;maFiltre='herkes';html=originalFeed.call(this);}finally{maAkisVeri=saved;maFiltre=filter;}
    if(!rows.length&&saved.length)html='<div class="ma-bos">'+(filter==='online'?'Şu anda çevrimiçi arkadaşlarından bir paylaşım yok.':filter==='takip'?'Takip ettiklerinden henüz bir paylaşım yok.':'Henüz bir paylaşım yok.')+'</div>';
    const box=document.createElement('div');box.innerHTML=html;
    box.querySelectorAll('.akis-kart').forEach(card=>{
      const row=card.querySelector('.akis-ust'),id=row?.dataset.o;if(!id)return;
      card.dataset.person=id;
      card.querySelector('.akis-ikon')?.remove();
      const sentence = card.querySelector('.akis-metin');
      if (sentence) sentence.innerHTML = feedHighlights(sentence.textContent);
      const person=typeof maTumListe!=='undefined'?maTumListe.find(x=>norm(x.id)===norm(id)):null;
      const n=row.querySelector('b');
      const ownLevel=norm(id)===norm(who())?level():person?.playerLevel;
      const oldLevels=row.querySelectorAll('.dm-mini-level');oldLevels.forEach(x=>x.remove());
      row.querySelector('.dm-avatar-level')?.classList.add('fr-feed-avatar');
      if(n){n.innerHTML=`${esc(n.textContent)}${ownLevel?` <span class="fr-level">Sv. ${ownLevel}</span>`:''}${badge(id)}`;}
      const menu=document.createElement('button');menu.className='fr-more';menu.dataset.friendAction='profile';menu.dataset.person=id;menu.setAttribute('aria-label',id+' profil ve iletişim seçenekleri');menu.textContent='⋮';card.append(menu);
      if(norm(id)!==norm(who())&&maTakip.has(id))card.querySelector('.aksiyon')?.insertAdjacentHTML('beforeend',`<button class="fr-card-invite" data-friend-action="invite" data-person="${esc(id)}" data-friends-gate="duello">Davet et</button>`);
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
      if(s==='kesfet')void findFriends(false);return;
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
  async function findFriends(inviteOnly=false) {
    if(!requireFeature(inviteOnly?'duello':'takip'))return;
    const m=window.dmMeduPro;if(!m?.sheet)return;
    const sheet=m.sheet(inviteOnly?'Arkadaşını davet et':'Arkadaş ekle',inviteOnly?'Takip ettiğin arkadaşını seç, oyun davetini profilinden gönder.':'Arkadaşını bul ve takip et.');
    sheet.p.classList.add('fr-friend-sheet');let closed=false;sheet.p._close=()=>{closed=true;};
    sheet.body.innerHTML='<p role="status">Arkadaşlar yükleniyor…</p>';
    try{
      await window.maTumGetir?.();if(closed)return;
      const people=maTumListe.filter(x=>norm(x.id)!==norm(who())&&(!inviteOnly||maTakip.has(x.id)));
      sheet.body.innerHTML='<label class="fr-search-label">Arkadaş ara<input type="search" class="fr-search" placeholder="Kullanıcı adı" autocomplete="off"></label><div class="fr-search-results"></div>';
      const list=sheet.body.querySelector('.fr-search-results');
      function draw(q=''){
        const filtered=people.filter(x=>norm(x.ad).includes(norm(q))).slice(0,80);
        list.innerHTML=filtered.length?filtered.map(o=>`<div class="fr-search-person">${avatar(o.ad,40)}<button class="fr-search-name" data-person="${esc(o.id)}"><b>${esc(o.ad)}</b><small>Sv. ${o.playerLevel||1}${o.sinif?' · '+esc(o.sinif)+'. sınıf':''}</small>${badge(o.id)}</button><button class="fr-search-follow ${maTakip.has(o.id)?'takipte':''}" data-person="${esc(o.id)}">${inviteOnly?'Davet et':maTakip.has(o.id)?'Takipte':'Takip et'}</button></div>`).join(''):'<p class="fr-empty">'+(inviteOnly?'Henüz takip ettiğin bir arkadaşın yok. Arkadaş ekle bölümünden birini takip et.':'Bu isimde bir arkadaş bulunamadı.')+'</p>';
        list.querySelectorAll('.fr-search-name').forEach(b=>b.onclick=()=>{sheet.close();window.maProfilAc(b.dataset.person);});
        list.querySelectorAll('.fr-search-follow').forEach(b=>b.onclick=async()=>{
          if(inviteOnly){sheet.close();openInvite(b.dataset.person);return;}
          await window.maTakipDegistir(b.dataset.person,b);if(!closed){renderHome();b.focus({preventScroll:true});}
        });void window.dmSocialPresence?.refresh?.();
      }
      draw();sheet.body.querySelector('input').oninput=e=>draw(e.target.value);sheet.body.querySelector('input').focus();
    }catch(e){if(!closed)sheet.body.textContent='Arkadaşlar yüklenemedi. Lütfen tekrar dene.';}
  }
  function openInvite(id){
    if(!requireFeature('duello'))return;
    window.maProfilAc(id);
    requestAnimationFrame(()=>root.querySelector('.dm-social')?.scrollIntoView({block:'start',behavior:'smooth'}));
  }
  async function acceptInvite(id,btn){
    if(!requireFeature('duello'))return;
    const d=invites.find(x=>String(x.id)===String(id));if(!d)return;
    btn.disabled=true;
    try{
      const r=await window.dmMeduPro.api('duelloYanit',{id:d.id,kabul:true});
      if(r?.hata)throw Error(r.mesaj||'Davet kabul edilemedi.');
      invites=invites.filter(x=>x!==d);$('frInvitation').innerHTML=invitationHtml();
      window.duelloOyununuAc?.(d.oyun);
    }catch(e){window.maToast?.(e.message||'Davet kabul edilemedi.');btn.disabled=false;}
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-friend-action]');if(!b)return;
    const action=b.dataset.friendAction;
    if(['home','akis','vitrin','lig'].includes(action)){window.maSekmeSec(action==='home'?'hub':action);return;}
    if(action==='find')return void findFriends(false);
    if(action==='friends')return void findFriends(true);
    if(action==='profile'){window.maAkisKisiAc?.(b.dataset.person);return;}
    if(action==='invite')return openInvite(b.dataset.person);
    if(action==='matches'){if(requireFeature('duello'))window.dmArenaAc?.();return;}
    if(action==='filter'){
      maFiltre=b.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('aktif',x.dataset.filter===maFiltre);x.setAttribute('aria-pressed',String(x.dataset.filter===maFiltre));});
      const draw=()=>{if($('maAkisListe'))$('maAkisListe').innerHTML=window.maAkisListeHtml();paintLocks();};
      draw();if(maFiltre==='online')Promise.resolve(window.dmSocialPresence?.refresh?.(true)).then(draw);return;
    }
    if(action==='accept')return void acceptInvite(b.dataset.inviteId,b);
    if(action==='dismiss'){invites=invites.filter(x=>String(x.id)!==b.dataset.inviteId);$('frInvitation').innerHTML=invitationHtml();}
  });
  const observer=new MutationObserver(()=>{
    if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(root.classList.contains('active'))decorateDetail();});
  });
  // Only observe structure. Badge text/attribute updates must not cause a render loop.
  observer.observe($('maEkran'),{childList:true,subtree:true});
  setInterval(()=>{if(root.classList.contains('active')&&!document.hidden){resetAccount();paintLocks();if(maSekme==='hub'&&!maProfilId)void loadHome();}},60000);
  window.dmFriends={open:()=>window.meduAkisAc(),home:()=>window.maSekmeSec('hub'),detail:s=>window.maSekmeSec(s),refresh:()=>loadHome(true),find:()=>findFriends(false)};
  function dockSpace(){const dock=document.getElementById('bottomNavMobile');if(dock){const h=dock.getBoundingClientRect().height;root.style.setProperty('--fr-nav-space',Math.max(84,h+18)+'px');}}
  window.addEventListener('resize',dockSpace,{passive:true});
  const dock=document.getElementById('bottomNavMobile');if(dock&&window.ResizeObserver)new ResizeObserver(dockSpace).observe(dock);
  dockSpace();viewHeader();
  // League movement is account-bound and deduplicated across reloads.
  if (!document.querySelector('script[data-dm-league-momentum]')) {
    const boost = document.createElement('script'); boost.src = 'league-momentum.js?v=20261017-1'; boost.defer = true;
    boost.dataset.dmLeagueMomentum = '1'; document.head.append(boost);
  }
})();
