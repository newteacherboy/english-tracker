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
  root.querySelector('.akis-baslik')?.insertAdjacentHTML('beforebegin','<div class="fr-wallet-host"></div>');
  const permitted = code => window.dmFeatureEnabled?.(code) !== false && window.dmProgression?.allowed?.(code) !== false;
  function requireFeature(code) {
    if (window.dmFeatureEnabled?.(code) === false) { window.maToast?.('Bu özellik şu anda kapalı.'); return false; }
    return window.dmProgression?.require?.(code) !== false;
  }
  const originalDraw = window.maCiz, originalOpen = window.meduAkisAc, originalSelect = window.maSekmeSec;
  const originalFeed = window.maAkisListeHtml;
  let account = '', followed = [], invites = [], busy = false, lastLoad = 0, epoch = 0, frame = 0;
  // [17 Kas 2026] Düello kartındaki günlük hak etiketi (60 sn önbellekli tek istek).
  let liveFree = '';
  const duelLabel = r => !r ? '' : r.unlimited ? 'Sınırsız düello' : Number(r.live?.remaining) > 0 ? r.live.remaining + ' ücretsiz hak' : '';
  function refreshDuelLabel() {
    const p = window.dmLiveDuel?.status?.();
    if (!p) return;
    p.then(r => { const t = duelLabel(r); if (t !== liveFree) { liveFree = t; renderHome(); } }).catch(() => {});
  }
  document.addEventListener('dm:duel-rights', e => { const t = duelLabel(e.detail); if (t !== liveFree) { liveFree = t; renderHome(); } });
  const online = id => !!window.dmSocialPresence?.isOnline?.(id);
  function resetAccount() {
    if (account === who()) return;
    closePeople(false);
    account = who(); followed = []; invites = []; busy = false; lastLoad = 0; epoch++;
  }
  function avatar(id, size, tier='free') {
    let svg = typeof window.karakterSvg === 'function' ? window.karakterSvg(id, size) : '';
    if (!svg) svg = `<span>${typeof window.ogrenciMaskotSec === 'function' ? window.ogrenciMaskotSec(id) : '🦜'}</span>`;
    const cls=tier==='pro'?' dm-member-pro':tier==='premium_pro'?' dm-member-premium':'';
    return `<span class="fr-avatar${cls}" style="--avatar-size:${size}px">${svg}${cls?'<span class="dm-member-badge" aria-label="'+(tier==='pro'?'Pro Üye':'Premium Pro Üye')+'">'+(tier==='pro'?'PRO':'PRO+')+'</span>':''}</span>`;
  }
  function badge(id) { return `<span class="dm-online-badge compact" data-online-person="${esc(id)}">Durum kontrol ediliyor…</span>`; }
  function mine() { return typeof window.maBen === 'function' ? window.maBen() : {ad:who(),rozetler:[]}; }
  function level() { return window.dmProgression?.level?.() || mine().playerLevel || 1; }
  function people() {
    const ids = new Set([...(typeof maTakip !== 'undefined' ? maTakip : []), ...followed.map(x=>x.ad)]);
    return [...ids].filter(id=>norm(id)!==norm(who())).sort((a,b)=>a.localeCompare(b,'tr'));
  }
  const xp = value => Math.max(0,Number(value)||0).toLocaleString('tr-TR');
  function leagueHtml() {
    const allowed=permitted('lig');
    const data=allowed?window.dmLeagueUI?.weeklyPreview?.():null;
    const crown='<svg class="fr-podium-crown" viewBox="0 0 40 26" aria-hidden="true"><path d="m4 7 9 7 7-11 7 11 9-7-4 16H8z" fill="#ffda64" stroke="#ffefaa" stroke-width="1.5" stroke-linejoin="round"/><g fill="#fff0a6"><circle cx="4" cy="7" r="3"/><circle cx="20" cy="3" r="3"/><circle cx="36" cy="7" r="3"/></g></svg>';
    const leaders=(data?.top || []).slice(0,3).map((player,index)=>{
      const rank=index+1,size=rank===1?74:60;
      const portrait=player.is_virtual?(window.dmLeagueUI?.virtualMemberAvatar?.(player,size,'friends')||'<img width="60" src="friends-assets/papi-fencer.webp" alt="Papi">'):avatar(player.name,size,player.membership_tier);
      return `<button type="button" class="fr-podium-player fr-podium-place-${rank}" data-friend-action="${player.is_virtual?'virtual-duel':'profile'}" data-person="${esc(player.name)}" data-bot-id="${player.is_virtual?esc(player.id):''}">
        <span class="fr-podium-copy"><strong>${esc(player.name)}</strong><b>${xp(player.xp)} XP</b></span>
        <span class="fr-podium-face">${portrait}${rank===1?crown:''}</span>
        <span class="fr-podium-block" aria-label="${esc(player.displayRank??player.rank??rank)}. sıra">${esc(player.displayRank??player.rank??rank)}</span>
        ${player.is_virtual?'<small class="fr-podium-virtual">Sanal Rakip</small>':''}
      </button>`;
    }).join('');
    const list=(data?.rows||[]).slice(0,12).map(player=>{
      const self=norm(player.name)===norm(who())&&!player.is_virtual;
      const face=player.is_virtual?window.dmLeagueUI?.virtualMemberAvatar?.(player,32,'friends'):avatar(player.name,32,player.membership_tier);
      return `<div class="dm-arena-rank-row${self?' is-self':''}"><b>${esc(player.displayRank??player.rank)}.</b>${face||''}<span>${esc(player.name)}</span><strong>${xp(player.xp)} XP</strong></div>`;
    }).join('');
    const status=!allowed?'Lig 5. seviyede açılır.':data?.error&&!data.loaded?'Sıralama şu anda alınamadı.':data?.loaded?'Bu ligde henüz sıralama yok.':'Sıralama yükleniyor…';
    return `<section class="fr-league-board fr-weekly-podium" aria-label="Haftalık lig">
      <div class="fr-podium-heading"><h3>${icon('trophy')} ${esc(data?.title||'Yerel Lig')}</h3></div>
      ${leaders?'<div class="fr-podium-stage">'+leaders+'</div>':'<p class="fr-league-status" role="status">'+status+'</p>'}
      ${list?'<div class="dm-arena-rank-list">'+list+'</div>':''}
      <div class="fr-podium-footer">
        ${data?.me?`<div class="fr-league-self">${avatar(who(),27,data.me.membership_tier)}<b>Sen · ${esc(data.me.rank)}. sıra · ${xp(data.me.xp)} XP</b></div>`:''}
        <button type="button" class="fr-link" data-friend-action="lig" data-friends-gate="lig">Sıralamayı gör ${icon('chevron')}</button>
      </div>
    </section>`;
  }
  function tilesHtml(){return '';}
  let duelLeaders=[],duelLeadersAt=0,duelLeadersBusy=false,duelLeadersError=false;
  async function loadDuelLeaders(){
    if(duelLeadersBusy||Date.now()-duelLeadersAt<120000)return;
    const sb=window.supabaseClient;
    duelLeadersBusy=true;
    try{
      const {data,error}=sb?.rpc?await sb.rpc('dm_duel_champions_v1',{p_limit:50}):await (async()=>{const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/dm_duel_champions_v1',{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_limit:50})});return {data:response.ok?await response.json():null,error:response.ok?null:new Error('Sıralama sunucusu yanıt vermedi')};})();
      if(error)throw error;
      duelLeaders=Array.isArray(data)?data:[];duelLeadersError=false;duelLeadersAt=Date.now();
      if(maSekme==='hub'&&!maProfilId){const panel=root.querySelector('.fr-duel-league');if(panel)panel.outerHTML=duelLeagueHtml();}
    }catch(e){duelLeadersError=true;duelLeadersAt=Date.now();console.warn('Düello ligi yüklenemedi',e);}
    finally{duelLeadersBusy=false;renderDuelRanking();if(arenaView==='ranking'&&rankView==='duel')renderHome();}
  }
  function renderDuelRanking(){
    const box=document.querySelector('#dmDuelRanking .fr-duel-ranking-content');if(!box)return;
    const note=document.querySelector('#dmDuelRanking .fr-duel-ranking-note');
    note.textContent='G = Galibiyet · M = Mağlubiyet';
    box.innerHTML=duelLeaders.map((p,i)=>{
      const self=norm(p.player_name)===norm(who());
      return '<div class="fr-duel-ranking-row'+(self?' is-self':'')+'"><span class="fr-duel-rank">'+(i+1)+'</span>'+avatar(p.player_name,36,p.membership_tier)+'<div class="fr-duel-rank-copy"><b>'+esc(p.player_name)+(self?' · Sen':'')+'</b></div><span class="fr-duel-rank-record">'+xp(p.wins)+' / '+xp(p.losses)+'</span><strong>'+xp(p.duel_xp)+'</strong></div>';
    }).join('')||'<p class="fr-duel-ranking-status" role="status">'+(duelLeadersBusy?'Sıralama yükleniyor…':duelLeadersError?'Sıralama alınamadı. Yenile düğmesiyle tekrar deneyebilirsin.':'Henüz tamamlanmış düello yok.')+'</p>';
  }
  window.dmDuelRankingOpen=function(){
    document.getElementById('dmDuelRanking')?.remove();
    const previous=document.activeElement;
    const layer=document.createElement('div');layer.id='dmDuelRanking';layer.className='fr-duel-ranking-layer';
    layer.innerHTML='<section class="fr-duel-ranking-panel" role="dialog" aria-modal="true" aria-label="Düello Şampiyonları"><header><h2>Düello Şampiyonları</h2><button type="button" aria-label="Kapat">×</button></header><p class="fr-duel-ranking-scope">Tüm zamanlar · İlk 50 oyuncu</p><div class="fr-duel-ranking-labels"><span>Sıra / Oyuncu</span><span>G / M</span><span>XP</span></div><div class="fr-duel-ranking-content"></div><div class="fr-duel-ranking-tools"><p class="fr-duel-ranking-note"></p><button type="button" data-rank-refresh>Yenile</button></div></section>';
    const close=()=>{document.removeEventListener('keydown',keys);layer.remove();if(previous?.isConnected)previous.focus({preventScroll:true});};
    const keys=e=>{
      if(e.key==='Escape')close();
      if(e.key==='Tab'){
        const controls=[...layer.querySelectorAll('button')],first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    layer.onclick=e=>{if(e.target===layer||e.target.closest('header button'))close();};
    layer.querySelector('[data-rank-refresh]').onclick=async e=>{
      if(duelLeadersBusy)return;
      const button=e.currentTarget;button.disabled=true;
      duelLeadersAt=0;await loadDuelLeaders();button.disabled=false;
    };
    document.body.append(layer);document.addEventListener('keydown',keys);
    void loadDuelLeaders();renderDuelRanking();layer.querySelector('header button').focus();
  };
  function duelLeagueHtml(){
    const leaders=duelLeaders.slice(0,12).map((player,index)=>{
      const rank=index+1, name=esc(player.player_name);
      const record=index===0?'<small aria-label="'+xp(player.wins)+' galibiyet, '+xp(player.losses)+' mağlubiyet">'+xp(player.wins)+' G / '+xp(player.losses)+' M</small>':'';
      return '<div class="fr-arena-player fr-arena-player-'+rank+'"><span class="fr-arena-rank" aria-label="'+rank+'. sıra">'+rank+'</span>'+
        avatar(player.player_name,index===0?64:28,player.membership_tier)+'<div class="fr-arena-player-data"><strong title="'+name+'">'+name+
        '</strong><b>'+xp(player.duel_xp)+' XP</b>'+record+'</div></div>';
    }).join('');
    const mine=duelLeaders.find(p=>norm(p.player_name)===norm(who()));
    const status=duelLeadersError?'Düello ligi şu anda alınamadı.':duelLeadersAt?'Henüz tamamlanmış düello yok.':'Sıralama yükleniyor…';
    return '<section class="fr-duel-league fr-arena-league" aria-label="Düello Şampiyonları"><h3 class="fr-arena-title">'+icon('swords')+
      ' Düello Şampiyonları</h3>'+(leaders?'<div class="fr-arena-leaders">'+leaders+'</div>':'<p class="fr-arena-status" role="status">'+status+'</p>')+
      '<div class="fr-arena-footer">'+(mine?'<small>Sen · '+xp(mine.wins)+' G / '+xp(mine.losses)+' M · '+xp(mine.duel_xp)+' XP</small>':'')+
      '<button type="button" data-friend-action="duel-rank">Sıralamayı gör '+icon('chevron')+'</button></div></section>';
  }
  /* Bugünkü Durumun: planın sınırlı hakları. Mola ve Premium oyun hakları 10 dakikada en fazla bir kez sorulur. */
  const CROWN = '<svg class="fr-crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 5 7l4.5 4L12 5l2.5 6L19 7l2 11z" fill="currentColor"/></svg>';
  const PLAN = {
    free:{name:'Free plan',mola:2,pwm:3,shields:null,gold:null,ads:true},
    pro:{name:'Pro',mola:3,pwm:5,shields:'2/ay',gold:'+30',ads:false},
    premium_pro:{name:'Premium Pro',mola:5,pwm:null,shields:'5/ay',gold:'+75',ads:false}
  };
  let quota = {owner:'',at:0,mola:null,pwm:null}, quotaBusy = false;
  function planId() {
    const p = window.dmAndroidPlan?.plan;
    if (PLAN[p]) return p;
    const cap = Number(window.genelEnerjiMax)||0;
    return cap>=60?'premium_pro':cap>=40?'pro':'free';
  }
  async function loadQuota(force=false) {
    const owner=who();
    if(!owner||quotaBusy||(!force&&quota.owner===owner&&Date.now()-quota.at<600000))return;
    quotaBusy=true;
    const token=(window.dmTeacherPortalMode?sessionStorage.getItem('ing_ogr_token'):'')||localStorage.getItem('ing_token')||'';
    const base=(typeof apiURL!=='undefined'?apiURL:'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api');
    const [mola,pwm]=await Promise.allSettled([
      Promise.resolve().then(()=>window.dmMola?.refresh?.()),
      planId()==='premium_pro'?Promise.resolve(null):fetch(base.replace(/diji-api.*$/,'premium-games'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'status',t:token}),cache:'no-store'}).then(r=>r.ok?r.json():null)
    ]);
    quotaBusy=false;
    if(owner!==who())return;
    const games=mola.status==='fulfilled'?mola.value?.games:null;
    const left=games?Object.values(games).map(g=>Number(g?.remaining)).filter(Number.isFinite):[];
    quota={owner,at:Date.now(),mola:left.length?Math.max(...left):null,pwm:pwm.status==='fulfilled'&&Number.isFinite(Number(pwm.value?.remaining))?Number(pwm.value.remaining):null};
    const box=root.querySelector('.fr-status');if(box)box.outerHTML=statusHtml();
  }
  function statusHtml() {
    if(window.dmTeacherPortalMode||!who())return '';
    const id=planId(), p=PLAN[id], own=quota.owner===who();
    const pill=(text,cls='')=>`<span class="fr-status-pill ${cls}">${text}</span>`;
    const pro=`<span class="fr-status-pill fr-status-pro">${CROWN}Pro</span>`;
    const count=(left,max)=>left===null||left===undefined?pill(own?'—':'…','fr-status-wait'):pill(`${left}/${max}`,left>0?'fr-status-ok':'fr-status-out');
    const energyLeft=Math.max(0,Number(window.genelEnerjiKalan)||0), energyMax=Number(window.genelEnerjiMax)||(id==='pro'?40:25);
    // Her satır ilgili yere gider; kilitli (Pro) satırlar paketleri açar (iOS dahil).
    const locked='plans';
    const rows=[
      ['bolt','Enerji',id==='premium_pro'?pill('Sınırsız','fr-status-free'):count(energyLeft,energyMax),'energy'],
      ['break','Mola Vakti',count(own?quota.mola:null,p.mola),'mola'],
      ['game','Premium oyun',p.pwm===null?pill('Sınırsız','fr-status-free'):count(own?quota.pwm:null,p.pwm),'premium'],
      ['shield','Seri kalkanı',p.shields?pill(p.shields,'fr-status-free'):pro,p.shields?'streak':locked],
      ['coin','Günlük altın',p.gold?pill(p.gold,'fr-status-free'):pro,p.gold?'shop':locked],
      ['noads','Reklamsız',p.ads?pro:pill('Açık','fr-status-free'),locked]
    ];
    const art={bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#f5a524"/>',break:'<path d="M12 3c4 0 7 2.5 7 6H5c0-3.5 3-6 7-6zm-1 7h2v8h4v2H7v-2h4z" fill="#23a36f"/>',game:'<path d="M7 8h10a4 4 0 0 1 4 4v3a3 3 0 0 1-5.4 1.8L14 15h-4l-1.6 1.8A3 3 0 0 1 3 15v-3a4 4 0 0 1 4-4z" fill="#5b55d6"/>',shield:'<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" fill="#3a63e8"/>',coin:'<circle cx="12" cy="12" r="9" fill="#f2c94c" stroke="#d9a520" stroke-width="2"/>',noads:'<circle cx="12" cy="12" r="10" fill="#e86a6a"/><path d="M6 11h12v2H6z" fill="#fff"/>'};
    const badge=id==='premium_pro'?CROWN+'Premium Pro':id==='pro'?'★ Pro':'Free';
    return `<section class="fr-status fr-plan-${id}" aria-labelledby="frStatusTitle">
      <div class="fr-status-head"><h3 id="frStatusTitle">Bugünkü Durumun</h3><span class="fr-status-plan">${badge}</span></div>
      <div class="fr-status-grid">${rows.map(([k,label,val,go])=>go?`<button type="button" class="fr-status-row" data-friend-action="status-go" data-go="${go}"><svg viewBox="0 0 24 24" aria-hidden="true">${art[k]}</svg><span>${label}</span>${val}</button>`:`<div class="fr-status-row"><svg viewBox="0 0 24 24" aria-hidden="true">${art[k]}</svg><span>${label}</span>${val}</div>`).join('')}</div>
      ${id==='premium_pro'?'':`<button type="button" class="fr-status-cta" data-friend-action="plans">${CROWN}Premium Pro ile sınırsız enerji</button>`}
    </section>`;
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
  function clubHeader(){return `<header class="club-hero"><button type="button" class="club-back" data-friend-action="home" aria-label="Arkadaşlar ana ekranına dön">‹</button><h2>Medu Akış</h2><button type="button" data-friend-action="share" aria-label="Davet et">＋</button></header>`;}
  let arenaView = 'team';
  let rankView = 'weekly';
  window.dmArenaTabs = active => `<nav class="dm-arena-tabs" aria-label="Takımım bölümleri">${[['team','Takımım'],['duel','Düello'],['ranking','Sıralamam']].map(([value,label])=>`<button type="button" data-arena-view="${value}" aria-pressed="${value===active}">${label}</button>`).join('')}</nav>`;

  function homeHtml() {
    const ranking = arenaView === 'ranking';
    return `<div class="fr-home dm-arena-home">
      ${window.dmArenaTabs(arenaView)}
      ${ranking ? `<nav class="dm-arena-tabs dm-arena-ranks" aria-label="Sıralama türü">
        <button type="button" data-rank-view="weekly" aria-pressed="${rankView==='weekly'}">Haftalık Lig</button>
        <button type="button" data-rank-view="duel" aria-pressed="${rankView==='duel'}">Düello Şampiyonları</button>
      </nav>${rankView==='weekly'?leagueHtml():duelLeagueHtml()}` : (window.dmTeam?.html() || '')}
      <div id="frInvitation">${invitationHtml()}</div>
    </div>`;
  }
  function showArena(view) {
    if (view==='duel') return window.dmDuelHomeAc?.();
    window.dmDuelHomeClose?.();
    arenaView=view;
    if(!root.classList.contains('active')) {
      maSekme='hub';maProfilId=null;
      originalOpen.call(window);
    }
    window.maSekmeSec('hub');
    if(view==='ranking'&&rankView==='duel')void loadDuelLeaders();
  }
  function fullFeedHtml() {
    return `<div class="fr-home">${clubHeader()}${filters()}<section class="fr-feed" aria-label="Medu Akış"><div id="maAkisListe">${window.maAkisListeHtml()}</div></section><div id="frInvitation">${invitationHtml()}</div></div>`;
  }
  function compactFeedHtml(rows) {
    if(!rows.length)return '<div class="ma-bos">'+(maAkisYuklendi?'Bu filtrede henüz etkinlik yok.':'Etkinlikler yükleniyor…')+'</div>';
    return rows.map((event,index)=>{
      const id=String(event.k), congratulated=maTebrik.has('akis-'+id);
      const person=typeof maTumListe!=='undefined'?maTumListe.find(x=>norm(x.id)===norm(event.ogr)):null;
      const action=event.tur==='eksi'?'':`<button type="button" class="fr-congrats${congratulated?' basili':''}" data-friend-action="congratulate" data-event="${esc(id)}" aria-pressed="${congratulated}" aria-label="${congratulateLabel(congratulated)}">${congratulateLabel(congratulated)}</button>`;
      return `<article class="fr-event" data-fr-color="${index}" data-safety-event="${esc(id)}"><button type="button" class="fr-event-person" data-o="${esc(event.ogr)}" data-person="${esc(event.ogr)}" data-friend-action="profile">${avatar(person?.ad||event.ogr,44,person?.membership_tier)}<span><b>${esc(event.ad||event.ogr)}</b><small title="${esc(event.metin)}">${esc(window.DMFriendsFeed.summarize?.(event) ?? event.metin)}</small></span></button>${action}</article>`;
    }).join('');
  }
  function viewHeader() {
    const home = maSekme === 'hub' && !maProfilId;
    root.classList.toggle('fr-home-view',home);
    root.classList.toggle('fr-club-view',maSekme==='akis'&&!maProfilId);
    root.dataset.friendsView = maProfilId ? 'profile' : maSekme;
    if(home){
      const title=root.querySelector('.akis-baslik h2');
      const label=arenaView==='ranking'?'Sıralamam':'Takımım';
      if(title&&title.textContent!==label)title.textContent=label;
    }
    const back = root.querySelector('.fr-back'); if(back) back.hidden=home;
    mountPeopleButton();
    if(!home)closePeople(false);
    root.querySelectorAll('#maSegment button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.s===maSekme));b.classList.toggle('aktif',b.dataset.s===maSekme);});
  }
  function renderHome() {
    if (maSekme!=='hub'||maProfilId) return;
    const screen = $('maEkran');
    const scroll = screen.scrollTop;
    screen.innerHTML=homeHtml();
    viewHeader();paintLocks();dockSpace();screen.scrollTop=scroll;
    if(arenaView==='team')void window.dmTeam?.load();
  }
  function paintLocks() {
    root.querySelectorAll('[data-friends-gate]').forEach(b=>{
      if(b.matches('.fr-duel-start'))return; // The start button explains the lock on activation.
      const blocked=!permitted(b.dataset.friendsGate);
      b.classList.toggle('fr-locked',blocked);b.setAttribute('aria-disabled',String(blocked));
    });
    window.dmProgression?.paint?.();
  }
  async function loadHome(force=false) {
    resetAccount();
    if(permitted('lig'))void window.dmLeagueUI?.refreshWeekly?.();
    /* [18 Kas 2026] Supabase yükü: sekmeye her dönüşte değil, 90 sn'de bir (zorunlu yenilemeler aynen). */if(busy||!force&&Date.now()-lastLoad<90000)return;
    busy=true;const owner=account, ticket=epoch;
    const results=await Promise.allSettled([
      Promise.resolve().then(()=>window.maTumGetir?.()),
      Promise.resolve().then(()=>window.maOlaylariYukle?.()),
      Promise.resolve().then(()=>window.dmProgression?.refresh?.()),
      permitted('takip')?window.dmMeduPro?.api?.('takipDavetListesi'):Promise.resolve(null)
      // [18 Kas 2026] Eski düello davetleri (duellolarim) artık yüklenmez.
    ]);
    if(owner!==who()||ticket!==epoch)return;
    if(results[3].status==='fulfilled'&&Array.isArray(results[3].value?.liste))followed=results[3].value.liste;
    busy=false;lastLoad=Date.now();renderHome();
    if(permitted('lig'))void window.dmLeagueUI?.refreshWeekly?.();
    void loadQuota();
  }
  root.addEventListener('dm:weekly-league',()=>{
    if(maSekme==='hub'&&!maProfilId){
      const board=root.querySelector('.fr-league-board');
      if(board)board.outerHTML=leagueHtml();
    }
  });
  function decorateDetail() {
    viewHeader();
    if(maSekme==='lig'&&!maProfilId){
      const card=root.querySelector('.ml-ben');
      if(card&&!card.querySelector('.fr-league-papi'))card.insertAdjacentHTML('beforeend',art('papi-league','fr-league-papi'));
    }
    paintLocks();
  }
  window.maAkisHtml=function(){return fullFeedHtml();};
  window.maAkisListeHtml=function(){
    const saved=maAkisVeri, filter=maFiltre;
    let rows=window.DMFriendsFeed.select(saved).filter(e=>filter==='takip'?maTakip.has(e.ogr):filter==='online'?online(e.ogr):true);
    if(maSekme==='hub'&&!maProfilId)return compactFeedHtml(rows.slice(0,2));
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
    closePeople(false);
    window.dmUserCard?.close();
    if(s==='parkur'||s==='kesfet'||s==='hub'||s==='akis'){
      ++maCizNo;maSekme='hub';maProfilId=null;viewHeader();renderHome();void loadHome();$('maEkran').scrollTop=0;
      return;
    }
    if(s==='vitrin')return window.maSekmeSec('hub');
    if(s==='lig'&&!requireFeature(s))return;
    return originalSelect.apply(this,arguments);
  };
  window.meduAkisAc=function(){
    arenaView='team';
    if(maSekme==='magaza')return originalOpen.apply(this,arguments);
    maSekme='hub';maProfilId=null;
    const result=originalOpen.apply(this,arguments);
    document.dispatchEvent(new Event('dm:friends-open'));
    return result;
  };
  function congratulateLabel(sent){return sent?'Tebrik edildi':'Tebrik et';}
  function paintCongratulation(button) {
    const sent=maTebrik.has('akis-'+button.dataset.event);
    button.classList.add('fr-congrats');
    const label=congratulateLabel(sent);
    button.textContent=label;
    button.setAttribute('aria-label',label);
    button.setAttribute('aria-pressed',String(sent));
  }
  // Başlığa bağlı, arama yapılabilen arkadaş listesi; mevcut profil ve takip akışlarını kullanır.
  let peopleView=null;
  document.addEventListener('dm:duel-home-close',()=>{if(peopleView?.duel)closePeople(false);});
  function mountPeopleButton(){
    const header=root.querySelector('.akis-baslik');if(!header)return;
    let actions=header.querySelector('.fr-unified-actions');
    if(!actions){actions=document.createElement('div');actions.className='fr-unified-actions';header.append(actions);}
    let button=header.querySelector('.fr-people-toggle');
    if(!button){
      button=document.createElement('button');button.type='button';button.className='fr-people-toggle';
      button.dataset.friendAction='people';button.setAttribute('aria-haspopup','dialog');
      button.setAttribute('aria-controls','frPeopleDropdown');
      button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="8" cy="7" r="3.5"/><circle cx="17" cy="8" r="2.9" opacity=".65"/><path d="M1 20v-2a7 7 0 0 1 14 0v2z"/><path d="M17 20v-2a9 9 0 0 0-1.6-5.1A6 6 0 0 1 23 19v1z" opacity=".65"/></svg>';
      actions.append(button);
    }
    if(!header.querySelector('.fr-invite-top')){
      const invite=document.createElement('button');invite.type='button';invite.className='fr-invite-top';invite.dataset.friendAction='share';invite.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="9" cy="7" r="3.8"/><path d="M1 21v-2a8 8 0 0 1 16 0v2z"/><path d="M19 6v8m-4-4h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';invite.setAttribute('aria-label','Arkadaşlarını Diji-Medu’ya davet et');actions.append(invite);
    }
    // Single notification entry lives in the shared HUD. Do not duplicate it in Friends actions.
    header.querySelectorAll('.fr-notifications-top').forEach(old=>old.remove());
    for(const node of [header.querySelector('.fr-invite-top'),button])if(node&&node.parentElement!==actions)actions.append(node);
    button.setAttribute('aria-label','Arkadaşlarım, '+people().length+' arkadaş');
    button.setAttribute('aria-expanded',String(!!peopleView));
  }
  function closePeople(focus=true){
    if(!peopleView)return;
    const v=peopleView;peopleView=null;v.host.remove();
    v.anchor.setAttribute('aria-expanded','false');
    if(focus&&v.anchor.isConnected&&(v.duel||root.classList.contains('active')))v.anchor.focus({preventScroll:true});
  }
  function positionPeople(){
    const v=peopleView;if(!v)return;
    if(v.owner!==who()||(v.duel?v.anchor.closest('[hidden]'):!root.classList.contains('active')||!root.classList.contains('fr-home-view'))){closePeople(false);return;}
    const viewport=window.visualViewport,r=v.anchor.getBoundingClientRect();
    const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,w=viewport?.width||innerWidth,h=viewport?.height||innerHeight;
    const width=Math.min(316,w-24),x=Math.max(left+12,Math.min(r.right-width,left+w-width-12)),y=Math.max(top+8,r.bottom+12);
    const dock=$('bottomNavMobile')?.getBoundingClientRect(),bottom=Math.min(top+h-12,dock?.height&&dock.top>y+180?dock.top-10:top+h-12);
    v.panel.style.cssText='left:'+x+'px;top:'+y+'px;width:'+width+'px;max-height:'+Math.max(130,bottom-y)+'px;--fr-people-pointer:'+Math.max(20,Math.min(width-20,r.left+r.width/2-x))+'px';
    v.host.style.setProperty('--fr-people-shade-top',Math.max(0,r.bottom+6)+'px');
  }
  function drawPeople(){
    const v=peopleView;if(!v||v.owner!==who())return;
    const friends=people(),query=norm(v.input.value),known=typeof maTumListe==='undefined'?[]:maTumListe;
    const ids=v.add?[...new Set(known.map(p=>p.id||p.ad).filter(Boolean))].filter(id=>norm(id)!==norm(who())&&!friends.some(f=>norm(f)===norm(id))):friends;
    const list=ids.filter(id=>norm(id).includes(query));
    v.panel.querySelector('.fr-people-count').textContent=String(friends.length);
    v.panel.querySelector('h3').textContent=v.duel?'Düello rakibini seç':v.add?'Arkadaş ekle':'Arkadaşlarım';
    v.panel.querySelector('.fr-people-add').textContent=v.add?'‹ Arkadaşlarıma dön':'+ Arkadaş ekle';
    v.input.placeholder=v.add?'Öğrenci ara…':'Arkadaş ara…';
    v.list.innerHTML=list.map(id=>{
      const person=typeof maBul==='function'?maBul(id):known.find(p=>norm(p.id||p.ad)===norm(id));
      const lv=Number(person?.playerLevel||person?.seviye),subtitle=Number.isFinite(lv)&&lv>0?'Seviye '+lv:'';
      return `<button type="button" class="fr-search-person fr-people-row" data-person="${esc(id)}">${avatar(id,40)}<span class="fr-people-name"><b>${esc(id)}</b>${subtitle?'<small>'+esc(subtitle)+'</small>':''}</span><span class="fr-people-chevron" aria-hidden="true">›</span></button>`;
    }).join('')||'<p class="fr-people-empty" role="status">'+(query?'Bu isimde bir arkadaş bulunamadı.':v.add?'Ekleyebileceğin bir öğrenci bulunamadı.':'Henüz takip ettiğin bir arkadaş yok. Arkadaş ekle ile başlayabilirsin.')+'</p>';
    positionPeople();
  }
  function openPeople(duelAnchor=null){
    if(peopleView){closePeople();return;}
    mountPeopleButton();
    const anchor=duelAnchor||root.querySelector('.fr-people-toggle');if(!anchor)return;
    const host=document.createElement('div');host.className='fr-people-layer';
    host.innerHTML='<div class="fr-people-shade" aria-hidden="true"></div><section id="frPeopleDropdown" class="fr-people-dropdown" role="dialog" aria-modal="false" aria-labelledby="frPeopleTitle"><header><h3 id="frPeopleTitle">Arkadaşlarım</h3><span class="fr-people-count"></span><button type="button" class="fr-people-close" aria-label="Arkadaş listesini kapat">×</button></header><label class="fr-people-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input type="search" aria-label="Arkadaş ara" placeholder="Arkadaş ara…" autocomplete="off"></label><div class="fr-people-list" role="region" aria-label="Arkadaşlar"></div><button type="button" class="fr-people-add">+ Arkadaş ekle</button></section>';
    const panel=host.querySelector('section');
    peopleView={host,panel,anchor,owner:who(),input:host.querySelector('input'),list:host.querySelector('.fr-people-list'),add:false,duel:!!duelAnchor};
    document.body.append(host);anchor.setAttribute('aria-expanded','true');
    host.querySelector('.fr-people-shade').onclick=()=>closePeople();
    host.querySelector('.fr-people-close').onclick=()=>closePeople();
    peopleView.input.oninput=drawPeople;
    host.querySelector('.fr-people-add').onclick=()=>{const v=peopleView;v.add=!v.add;v.input.value='';drawPeople();v.input.focus({preventScroll:true});};
    panel.addEventListener('click',e=>{
      const row=e.target.closest('[data-person]');if(!row)return;
      const id=row.dataset.person,rect=row.getBoundingClientRect();closePeople(false);if(duelAnchor)void window.dmLiveDuel?.invite?.(id);else window.maAkisKisiAc?.(id,rect);
    });
    drawPeople();panel.querySelector('.fr-people-close').focus({preventScroll:true});
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&peopleView){e.preventDefault();closePeople();}});
  document.addEventListener('pointerdown',e=>{if(peopleView&&!peopleView.host.contains(e.target)&&!peopleView.anchor.contains(e.target))closePeople(false);},true);
  document.addEventListener('dm:login',()=>{closePeople(false);resetAccount();mountPeopleButton();});

  document.addEventListener('focusin',e=>{if(peopleView&&!peopleView.host.contains(e.target)&&!peopleView.anchor.contains(e.target))closePeople(false);});
  window.addEventListener('resize',positionPeople,{passive:true});
  window.visualViewport?.addEventListener('resize',positionPeople,{passive:true});
  window.visualViewport?.addEventListener('scroll',positionPeople,{passive:true});
  async function shareInvite() {
    const url='https://app.dijimedu.com/ingilizce/';
    try{
      if(navigator.share){await navigator.share({title:'Diji Medu İngilizce',text:'Diji Medu’da birlikte İngilizce öğrenelim!',url});return;}
      if(navigator.clipboard){await navigator.clipboard.writeText(url);window.maToast?.('Davet bağlantısı kopyalandı.');return;}
    }catch(error){if(error.name==='AbortError')return;}
    const sheet=window.dmMeduPro?.sheet?.('Davet et','Bu bağlantıyı arkadaşınla paylaş.');
    if(sheet)sheet.body.innerHTML=`<a href="${url}">${url}</a>`;
  }
  root.addEventListener('click',e=>{
    const team=e.target.closest('[data-team-action]');
    if(team){void window.dmTeam?.act(team);return;}
    const arena=e.target.closest('[data-arena-view]');
    if(arena){showArena(arena.dataset.arenaView);return;}
    const rank=e.target.closest('[data-rank-view]');
    if(rank){
      rankView=rank.dataset.rankView;
      renderHome();
      root.querySelector('[data-rank-view="'+rankView+'"]')?.focus();
      if(rankView==='duel')void loadDuelLeaders();
      return;
    }
    const link=e.target.closest('[data-club-open]');if(link){const event=maAkisVeri.find(x=>String(x.k)===link.dataset.clubOpen),meta=event&&window.DMFriendsFeed.classify(event);if(!meta)return;if(meta.kind==='game'){if(!requireFeature(meta.game[2]))return;const fn=window[meta.game[1]]||(meta.game[1]==='kelimebulOyunAc'?window.kelimeBulOyunAc:null);if(typeof fn==='function')fn();else window.aktivitelerTamEkranAc?.();}else if(meta.kind==='route')window.dmLearningRoute?.continue?.();else if(meta.kind==='story'){if(/hikâye|hikaye/i.test(event.metin))window.dmLearningCompanion?.nextStory?.();else window.dmLearningCompanion?.nextDialogue?.();}else if(meta.kind==='mission')window.dmLearningCompanion?.openMissions?.(/hafta/i.test(event.metin)?'weekly':'daily');else if(meta.kind==='league')window.maSekmeSec('lig');else if(meta.kind==='badge')window.dmBasarilarimAc?.();else if(meta.kind==='streak')window.dmLearningCompanion?.report?.();else window.dmIlerlememAc?.();return;}

    const b=e.target.closest('[data-friend-action]');if(!b)return;
    const action=b.dataset.friendAction;
    if(action==='lig'&&window.dmLeagueUI?.openWeekly)return window.dmLeagueUI.openWeekly();
    if(['home','akis','vitrin','lig'].includes(action)){window.maSekmeSec(action==='home'?'hub':action);return;}
    if(action==='share')return void shareInvite();
    if(action==='duel-rank')return void window.dmDuelRankingOpen?.();
    if(action==='notifications')return void window.dmNotificationCenter?.open?.();
    if(action==='status-go'){
      const go=b.dataset.go;
      if(go==='energy'){if(window.DMSatis?.enerji)return window.DMSatis.enerji('arkadaslar-durum');return window.dijiEnerjiPaneliAc?.();}
      if(go==='mola'){window.aktivitelerTamEkranAc?.();let tries=0;const pick=()=>{const cat=document.querySelector('#tab-aktiviteler [data-gg-party="break"]');if(cat)cat.click();else if(++tries<12)setTimeout(pick,150);};setTimeout(pick,200);return;}
      if(go==='premium')return window.aktivitelerTamEkranAc?.();
      if(go==='streak'){if(typeof window.dmIlerlememAc==='function')return window.dmIlerlememAc();return window.maSekmeSec?.('profil');}
      if(go==='shop'){if(typeof window.magazaAc==='function')return window.magazaAc();return window.maSekmeSec?.('magaza');}
      if(go==='plans'){if(window.DMSatis?.planlar)return window.DMSatis.planlar('arkadaslar-durum');return window.dmAndroidOpenPlans?.();}
      return;
    }
    if(action==='plans'){if(window.DMSatis?.planlar)return window.DMSatis.planlar('arkadaslar-durum');return window.dmAndroidOpenPlans?.();}
    if(action==='people')return openPeople();
    if(action==='congratulate'){window.maTebrikEt('akis-'+b.dataset.event,b);paintCongratulation(b);return;}
    if(action==='virtual-duel'){const id=b.dataset.botId;const bot=window.dmLeagueUI?.weeklyPreview?.().top?.find(p=>p.id===id&&p.is_virtual);if(bot)void window.dmLeagueUI?.openVirtualDirect?.(bot);return;}
    if(action==='profile'){window.maAkisKisiAc?.(b.dataset.person);return;}
    if(action==='invite')return void window.dmLiveDuel?.invite?.(b.dataset.person);
    if(action==='matches'){if(window.dmLeagueUI?.openDuelChooser)return window.dmLeagueUI.openDuelChooser();return;}
    if(action==='live-duel')return void window.dmLiveDuel?.startLive();
    if(action==='papi-duel')return void window.dmLiveDuel?.startPapi();
    if(action==='filter'){
      maFiltre=b.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('aktif',x.dataset.filter===maFiltre);x.setAttribute('aria-pressed',String(x.dataset.filter===maFiltre));});
      const draw=()=>{if($('maAkisListe'))$('maAkisListe').innerHTML=window.maAkisListeHtml();paintLocks();};
      draw();if(maFiltre==='online')Promise.resolve(window.dmSocialPresence?.refresh?.(true)).then(draw);return;
    }
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
  setInterval(()=>{if(root.classList.contains('active')&&!document.hidden){resetAccount();paintLocks();if(maSekme==='hub'&&!maProfilId)void loadHome();}},180000);
  window.dmFriends={showArena,redrawArena:()=>{if(arenaView==='team')renderHome();},open:()=>window.meduAkisAc(),home:()=>window.maSekmeSec('hub'),detail:s=>window.maSekmeSec(s),chooseDuelFriend:anchor=>{if(anchor&&requireFeature('duello')){openPeople(anchor);void loadHome().then(()=>{if(peopleView?.duel)drawPeople();});}},refresh:()=>loadHome(true)};
  function dockSpace(){
    const dock=$('bottomNavMobile');
    if(!dock)return;
    const rect=dock.getBoundingClientRect();
    root.style.setProperty('--fr-nav-space',Math.max(84,rect.height+18)+'px');
    if(root.classList.contains('active')){
      const bounds=root.getBoundingClientRect();
      const viewport=window.visualViewport;
      const viewportBottom=viewport?viewport.offsetTop+viewport.height:innerHeight;
      const bottom=Math.min(bounds.bottom,viewportBottom,rect.height?rect.top:viewportBottom);
      root.style.setProperty('--fr-home-height',Math.max(0,Math.floor(bottom-bounds.top))+'px');
    }
  }
  new MutationObserver(()=>{dockSpace();if(!root.classList.contains('active'))closePeople(false);}).observe(root,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',dockSpace);
  window.addEventListener('resize',dockSpace,{passive:true});
  window.visualViewport?.addEventListener('resize',dockSpace,{passive:true});
  window.visualViewport?.addEventListener('scroll',dockSpace,{passive:true});
  const dock=document.getElementById('bottomNavMobile');if(dock&&window.ResizeObserver)new ResizeObserver(dockSpace).observe(dock,{box:'border-box'});
  dockSpace();viewHeader();
})();
