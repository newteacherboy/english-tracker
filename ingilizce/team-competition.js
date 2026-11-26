(() => {
  'use strict';

  const escaped = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const token = () => localStorage.getItem('ing_token') || '';
  const number = value => (Number(value) || 0).toLocaleString('tr-TR');
  const image = emblem => '<img class="dm-team-crest" alt="" src="friends-assets/team-crests/' +
    Math.min(20, Math.max(1, Number(emblem) || 1)) + '.webp?v=2">';
  const button = (action, label, data = '') => '<button type="button" data-team-action="' + action + '"' +
    (data ? ' data-team-id="' + escaped(data) + '"' : '') + '>' + label + '</button>';
  const games = {
    'word-goal': ['Kelime Golü', () => window.dmPremiumSkillGames.open('word-goal', {team:true})],
    'papizzle': ['Papizzle', () => window.papizzleAc({team:true})],
    'tower': ['Dengesiz Kule', () => window.dmPremiumSkillGames.open('tower', {team:true})],
    'cloud-flight': ['Kaptan Pilot Papi', () => window.premiumBulutUcusuAc({team:true})],
    'word-blocks': ['Block Papi', () => window.premiumKelimeBloklariAc({team:true})],
    rally: ['Kelime Rallisi', () => window.ralliOyunAc({team:true})]
  };

  let owner = '';
  let snapshot = null;
  let awards = [];
  let bonus = 0;
  let error = '';
  let loadedAt = 0;
  let loading = false;
  let working = false;
  let dialog = null;
  const announcedRequests = new Set();
  let searchVersion = 0;
  let premiumSessionOwner = '';
  const premiumTickets = new Map();
  const cardToGame = {
    kelimeGoluSolo: 'word-goal',
    papizzleActivity: 'papizzle',
    towerActivity: 'tower',
    premiumCloudFlightActivity: 'cloud-flight',
    premiumWordBlocksActivity: 'word-blocks'
  };
  const norm = value => String(value || '').trim().toLocaleLowerCase('tr');
  const armPremiumSession = () => { premiumSessionOwner = token(); };
  const clearPremiumSession = () => { premiumSessionOwner = ''; };
  const isPremiumSession = () => Boolean(premiumSessionOwner && premiumSessionOwner === token() && snapshot?.team);
  function launchPremiumCard(card) {
    if (!isPremiumSession() || !card) return false;
    let key = cardToGame[card.id];
    if (!key && /ralliOyunAc/i.test(String(card.getAttribute?.('onclick') || ''))) key = 'rally';
    if (!key || !games[key]) return false;
    void games[key][1]();
    return true;
  }
  document.addEventListener('click', event => {
    const tab = event.target?.closest?.('#bottomNavMobile [data-ekran]');
    if (tab && tab.dataset.ekran !== 'tab-aktiviteler') clearPremiumSession();
  }, true);
  document.addEventListener('dm:logout', clearPremiumSession);

  async function rpc(method, args = {}) {
    const identity = token();
    if (!identity) throw Error('Takımım için öğrenci hesabınla giriş yap.');
    const client = window.supabaseClient;
    let result;
    if (client?.rpc) {
      const {data, error:failure} = await client.rpc(method, {p_token:identity, ...args});
      if (failure) throw Error('Takım servisine ulaşılamadı. Tekrar dene.');
      result = data;
    } else {
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + method, {
        method:'POST', headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({p_token:identity, ...args}), signal:AbortSignal.timeout(12000)
      });
      if (!res.ok) throw Error('Takım servisine ulaşılamadı. Tekrar dene.');
      result = await res.json();
    }
    if (identity !== token()) throw Error('Öğrenci oturumu değişti.');
    if (!result?.ok) throw Error(result?.message || 'Takım işlemi tamamlanamadı.');
    return result;
  }

  const manage = (action, data = {}) => rpc('dm_team_manage', {p_action:action,p_data:data});
  const refreshHome = () => window.dmFriends?.redrawArena?.();

  async function load(force = false) {
    const current = token();
    if (current !== owner) {
      owner = current; snapshot = null; awards = []; bonus = 0; loadedAt = 0; error = ''; loading = false;
      clearPremiumSession(); dialog?.close(); premiumTickets.clear(); announcedRequests.clear();
    }
    if (!current || working || loading || (!force && Date.now()-loadedAt<30000)) return;
    loading = true;
    try {
      const [state, rewards] = await Promise.all([manage('state'),rpc('dm_team_rewards')]);
      if (current !== token()) return;
      snapshot = state; awards = rewards.awards; bonus = rewards.bonusEnergy; error = '';
    } catch (failure) {
      if (current === token()) error = failure.message;
    } finally {
      if (current === token()) {
        loadedAt = Date.now(); loading = false; refreshHome(); maybeOpenRequest();
      }
    }
  }

  function tasks() {
    const items = [
      ['Premium Turu',snapshot.tasks.premium,3],
      ['Düello Günü',snapshot.tasks.duel,3],
      ['Birlikte Oyna',snapshot.tasks.people,2]
    ];
    const icons=['<img src="premium-assets/kelime-eslestirme/icon-crown.webp" alt="">','<span aria-hidden="true">⚔</span>','<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M1 20v-2a7 7 0 0 1 14 0v2zm16 0v-2a9 9 0 0 0-1.8-5.4A5.5 5.5 0 0 1 23 18v2z"/></svg>'];
    return '<section class="dm-team-card dm-team-tasks"><h3>Günlük Görevler</h3>' + items.map(([label, done, goal],index) =>
      '<div class="dm-team-task"><i class="dm-team-task-art">'+icons[index]+'</i><span>'+label+'</span><b>'+Math.min(done,goal)+'/'+goal+
      '</b><progress max="'+goal+'" value="'+Math.min(done,goal)+'" aria-label="'+label+'"></progress></div>').join('') +
      (items.every(([,done,goal])=>done>=goal)?'<small>Görevler tamamlandı. Puan toplamaya devam edebilirsin.</small>':'')+'</section>';
  }

  function pendingRequests(kind) {
    return (snapshot?.requests || []).filter(item =>
      (!kind || item.kind===kind) && (!item.expiresAt || Date.parse(item.expiresAt)>Date.now()));
  }

  function requestRows(items) {
    return items.map(item => {
      const message = item.kind==='invite' ? item.name+' seni takıma davet etti.' :
        item.kind==='transfer' ? item.name+' kaptanlığı sana devretmek istiyor.' : item.person+' takıma katılmak istiyor.';
      return '<div class="dm-team-info"><p>'+escaped(message)+'</p>'+
        (item.expiresAt?'<small data-team-expires="'+escaped(item.expiresAt)+'"></small>':'')+
        '<div class="dm-team-buttons">'+
        button('accept','Kabul Et',item.id)+button('reject','Reddet',item.id)+'</div></div>';
    }).join('');
  }

  function requestSection(kind, title) {
    const count=pendingRequests(kind).length;
    return '<section class="dm-team-card"><div class="dm-team-buttons">'+
      button('requests',title+(count?' <strong style="color:#b91f39">('+count+')</strong>':''),kind)+'</div></section>';
  }

  function openRequests(kind, onlyId) {
    const rows=pendingRequests(kind).filter(item=>!onlyId || item.id===onlyId);
    const title=kind==='invite'?'Davetler':kind==='join'?'Başvurular':'Takım İstekleri';
    sheet(title,requestRows(rows)||'<p>Bekleyen istek bulunmuyor.</p>');
    dialog.dataset.requestKind=kind || '';
    for (const item of rows) announcedRequests.add(item.id);
    paintExpiry();
  }

  function maybeOpenRequest() {
    if (dialog || working || document.hidden || document.querySelector('dialog[open],.dm-center-detail-layer,.dm-center-layer')) return;
    const item=pendingRequests().find(item=>['join','invite'].includes(item.kind)&&!announcedRequests.has(item.id));
    if (item) openRequests(item.kind,item.id);
  }

  function paintExpiry() {
    if (!dialog) return;
    for (const label of dialog.querySelectorAll('[data-team-expires]')) {
      const remaining=Math.max(0,Math.ceil((Date.parse(label.dataset.teamExpires)-Date.now())/60000));
      label.textContent=remaining?'Kalan süre: '+Math.floor(remaining/60)+' sa '+remaining%60+' dk':'İsteğin süresi doldu.';
      if (!remaining) for (const control of label.parentElement.querySelectorAll('button')) control.disabled=true;
    }
  }

  async function navigateRequests(kind) {
    window.dmFriends?.showArena?.('team');
    if (loading) {
      for (let i=0;i<40&&loading;i++) await new Promise(resolve=>setTimeout(resolve,300));
    } else await load(true);
    if (owner===token() && token()) openRequests(kind);
  }

  function rewardRows() {
    return awards.map((award,index)=>'<div class="dm-team-info"><strong>'+escaped(award.name)+' · '+escaped(award.week)+'</strong><p>'+
      (award.claimed?'':number(award.gold)+' altın · '+number(award.xp)+' XP · ')+
      number(award.energy)+' enerji</p>'+button('claim',award.claimed?'Enerjiyi Al':'Sandığını Aç',String(index))+'</div>').join('');
  }

  function html() {
    if (owner!==token() || !snapshot) return '<section class="dm-team-card" role="status">'+
      (error?escaped(error)+button('refresh','Tekrar Dene'):'Takım yükleniyor…')+'</section>';
    const team=snapshot.team;
    const portraits=snapshot.members.map(person=>'<span title="'+escaped(person.name)+'">'+
      (window.karakterSvg?.(person.name,24)||escaped(person.name.slice(0,1)))+'</span>').join('');
    const reward = rewardRows();
    if (!team) return '<section class="dm-team-intro">'+image(1)+
      '<div><h2>Takımını Kur</h2><p>Arkadaşlarınla birlikte yarış.</p></div></section>'+
      '<div class="dm-team-entry">'+
      button('create','<i class="dm-team-entry-art" aria-hidden="true"></i><span><b>Takım Oluştur</b></span><em aria-hidden="true">›</em>')+
      button('search','<i class="dm-team-entry-art" aria-hidden="true"></i><span><b>Takıma Katıl</b><small>Var olan bir takıma katılarak hemen yarışa başla.</small></span><em aria-hidden="true">›</em>')+'</div>'+
      requestSection('invite','Davetler')+requestRows(pendingRequests('transfer'))+reward;
    const emptySlots = Math.max(0, 3 - snapshot.members.length);
    const isCaptain = team.captain === snapshot.me;
    const emptySlotHtml = Array.from({ length: emptySlots }, () =>
      isCaptain
        ? '<button type="button" class="dm-team-slot-empty" data-team-action="invite" aria-label="Boş üye yuvası, üye davet et">+</button>'
        : '<span class="dm-team-slot-empty" aria-hidden="true">+</span>'
    ).join('');
    const pointsVal = Number(snapshot.points) || 0;
    const thresholdPct = Math.min(100, Math.round((pointsVal / 150) * 100));
    return '<div class="dm-team-hero-wrap">' +
      '<div class="dm-team-crest-stage" aria-hidden="true"><span class="dm-team-crest-halo"></span>' + image(team.crest) + '</div>' +
      '<section class="dm-team-card dm-team-summary dm-team-summary-v2">' +
        '<div class="dm-team-settings-pin">' + button('settings', '<span aria-hidden="true">⚙</span><span class="dm-arena-visually-hidden">Takım ayarları</span>') + '</div>' +
        '<h2>' + escaped(team.name) + '</h2>' +
        '<div class="dm-team-members-row">' +
          '<div class="dm-team-portraits">' + portraits + emptySlotHtml + '</div>' +
          '<span class="dm-team-member-count">' + snapshot.members.length + '/3 üye</span>' +
        '</div>' +
        '<div class="dm-team-score-bar">' +
          '<div class="dm-team-score-progress">' +
            '<div class="dm-team-score-nums"><strong>' + number(pointsVal) + ' puan</strong><small>/ 150 eşik</small></div>' +
            '<div class="dm-team-threshold-bar" role="progressbar" aria-label="Ödül eşiği" aria-valuenow="' + Math.min(pointsVal, 150) + '" aria-valuemin="0" aria-valuemax="150"><i style="width:' + thresholdPct + '%"></i></div>' +
          '</div>' +
          (isCaptain ? '<div class="dm-team-invite-cta">' + button('invite', '+ Üye Davet Et') + '</div>' : '') +
        '</div>' +
      '</section></div>' +
      '<div class="dm-team-buttons">'+button('premium','<img class="dm-team-action-icon" src="premium-assets/kelime-eslestirme/icon-crown.webp" alt=""><span>Premium Oyna</span>')+button('duel','<span class="dm-team-action-icon" aria-hidden="true">⚔</span><span>Düello Başlat</span>')+'</div>'+
      tasks()+(snapshot.latest?'<p class="dm-team-info">'+escaped(snapshot.latest.name)+' takıma +10 puan kazandırdı.</p>':'')+(isCaptain?requestSection('join','Başvurular'):'')+requestRows(pendingRequests('transfer'))+reward+
      (bonus?'<p class="dm-team-info">Takım ödülünden kullanılabilir +'+number(bonus)+' enerji</p>':'');
  }

  function sheet(title, content) {
    dialog?.close();
    const panel = document.createElement('dialog');
    panel.className='dm-team-sheet';
    panel.setAttribute('aria-labelledby','dmTeamSheetTitle');
    panel.innerHTML='<header><h2 id="dmTeamSheetTitle">'+escaped(title)+'</h2>'+button('close','Kapat')+
      '</header><p class="dm-team-error" role="status"></p><div class="dm-team-sheet-body">'+content+'</div>';
    panel.addEventListener('click', event => {
      const control=event.target.closest('[data-team-action]');
      if(control) void act(control);
    });
    panel.addEventListener('submit', event => {
      event.preventDefault();
      const data=Object.fromEntries(new FormData(event.target));
      void submit(event.target.dataset.form,data);
    });
    panel.addEventListener('close',()=>{panel.remove();if(dialog===panel)dialog=null;});
    document.body.append(panel); dialog=panel; panel.showModal();
  }

  function teamForm(team) {
    const crests=Array.from({length:20},(_,i) => '<label><input type="radio" required name="crest" value="'+(i+1)+'"'+
      ((team?.crest || 1)===i+1?' checked':'')+' aria-label="Papi arması '+(i+1)+'">'+image(i+1)+'</label>').join('');
    return '<form data-form="'+(team?'edit':'create')+'"><label>Takım adı<input name="name" required minlength="3" maxlength="30" value="'+
      escaped(team?.name)+'"></label><fieldset><legend>Takım logosu</legend><div class="dm-team-crests">'+crests+
      '</div></fieldset><button type="submit">'+(team?'Değişiklikleri Kaydet':'Takım Oluştur')+'</button></form>';
  }

  function settings() {
    const {team, me, members}=snapshot;
    const captain=team.captain===me;
    const roster=members.map(member=>'<div class="dm-team-info"><strong>'+escaped(member.name)+
      (member.id===team.captain?' · Kaptan':'')+'</strong><p>'+number(member.points)+' haftalık katkı</p>'+
      (captain&&member.id!==me?'<div class="dm-team-buttons">'+button('remove','Üye Çıkar',member.id)+
      button('transfer','Kaptanlığı Devret',member.id)+'</div>':'')+'</div>').join('');
    const pending=(snapshot.outgoing||[]).map(item=>'<div class="dm-team-info"><strong>'+escaped(item.person)+'</strong><p>'+
      (item.kind==='transfer'?'Kaptanlık teklifi bekliyor':'Takım daveti bekliyor')+'</p>'+button('withdraw','Geri Çek',item.id)+'</div>').join('');
    sheet('Takım Ayarları',roster+pending+(captain ?
      button('edit','Takım Adı veya Logosunu Değiştir')+button('invite','Üye Davet Et')+button('leave','Takımdan Ayrıl')+button('delete','Takımı Sil') :
      button('leave','Takımdan Ayrıl')));
  }

  function openTeamSearch() {
    sheet('Takıma Katıl',
      '<form data-form="search"><label>Takım ara<input name="name" maxlength="30" placeholder="Takım adı yaz…" autocomplete="off"></label><button type="submit">Ara</button></form>'+
      '<h3 style="margin:4px 0">Mevcut Takımlar</h3><div data-team-results aria-live="polite"></div>');
    return searchTeams('');
  }

  async function searchTeams(name) {
    const panel=dialog;
    const host=panel?.querySelector('[data-team-results]');
    if (!host) return;
    const version=++searchVersion;
    const identity=token();
    host.innerHTML='<p>Takımlar yükleniyor…</p>';
    panel.querySelector('.dm-team-error').textContent='';
    try {
      const result=await manage('search',{name:String(name || '').trim()});
      if (panel!==dialog || version!==searchVersion || identity!==token()) return;
      const rows=Array.isArray(result.rows)?result.rows:[];
      host.innerHTML=rows.map(row=>'<div class="dm-team-list-row">'+image(row.crest)+
        '<b>'+escaped(row.name)+'</b>'+
        (row.requested?
          '<span class="dm-team-invite-sent">Başvuruldu ✓</span>':
          button('join','Başvur',row.id))+'</div>').join('')||
        '<p>Takım bulunamadı.</p>';
      if (rows.length===30) host.insertAdjacentHTML('beforeend','<p><small>İlk 30 takım gösteriliyor. Diğer takımları adlarıyla arayabilirsin.</small></p>');
    } catch (failure) {
      if (panel===dialog && version===searchVersion && identity===token())
        host.innerHTML='<p>'+escaped(failure.message)+'</p>'+button('retry-search','Tekrar Dene');
    }
  }

  async function submit(action, data) {
    if (action==='duel-invite') { dialog?.close();return window.dmLiveDuel?.invite(data.name,{team:true}); }
    if (action==='search') return searchTeams(data.name);
    if (working) return;
    const panel=dialog;
    working=true;
    try {
      snapshot=await manage(action,data);
      if (action==='join') {
        
        if (panel===dialog && panel?.querySelector('[data-team-results]')) {
          panel.querySelector('.dm-team-error').textContent='';
          for (const control of panel.querySelectorAll('[data-team-action="join"]')) {
            if (control.dataset.teamId===data.id)
              control.outerHTML='<span class="dm-team-invite-sent">Başvuruldu ✓</span>';
          }
        }
        refreshHome();
        window.yoToast?.('Katılma isteğin gönderildi.');
        return;
      }
      if (dialog===panel) {
        if (panel && Object.hasOwn(panel.dataset,'requestKind') && (action==='accept'||action==='reject')) {
          openRequests(panel.dataset.requestKind);
          window.yoToast?.(action==='accept'?'İstek kabul edildi.':'İstek reddedildi.');
        } else dialog?.close();
      }
      refreshHome();
      if (action==='invite') window.yoToast?.('Takım daveti gönderildi.');
      if (action==='transfer') window.yoToast?.('Kaptanlık teklifi gönderildi.');
    } catch (failure) {
      const status=dialog?.querySelector('.dm-team-error');
      if (status) status.textContent=failure.message;
      else window.yoToast?.(failure.message);
    } finally { working=false; }
  }

  async function teamRanks(action) {
    const result=await manage('ranking',{period:action});
    sheet(action==='all'?'Tüm Zamanlar':'Haftalık Takım Sıralaması',
      result.rows.map((row,i)=>'<div class="dm-team-list-row"><b>'+(i+1)+'.</b>'+image(row.crest)+
      '<b>'+escaped(row.name)+'</b><strong>'+number(row.points)+' puan</strong></div>').join('')||
      '<p>Henüz sıralamaya giren takım yok.</p>');
  }

  async function openInviteSheet() {
    sheet('Üye Davet Et',
      '<form data-form="invite"><label>Arkadaşının kullanıcı adı<input name="name" required maxlength="80" placeholder="Kullanıcı adı yaz…"></label><button type="submit">Davet Gönder</button></form>' +
      '<div class="dm-team-invite-section"><div class="dm-team-invite-head"><strong>Ligde Aktif Öğrenciler</strong><small>Son 30</small></div>' +
      '<div class="dm-team-invite-list" data-team-active-list role="status"><p class="dm-team-invite-empty">Aktif öğrenciler yükleniyor…</p></div></div>');
    const host = dialog?.querySelector('[data-team-active-list]');
    if (!host) return;
    try {
      let students = [];
      if (typeof window.dmLeagueUI?.activeStudents === 'function') {
        students = await window.dmLeagueUI.activeStudents(30);
      } else if (typeof apiURL === 'string' && apiURL) {
        const res = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ islem: 'seviyeLigListesi', t: token() }),
          signal: AbortSignal.timeout(10000)
        });
        const data = res.ok ? await res.json() : null;
        students = (Array.isArray(data?.liste) ? data.liste : [])
          .filter(p => !p.is_virtual && p.name && Number(p.xp) > 0)
          .slice(0, 30)
          .map(p => ({ name: p.name, xp: Number(p.xp) || 0, league: p.league === 'sampiyon' ? 'Şampiyonlar' : p.league === 'super' ? 'Süper Lig' : 'Yerel Lig' }));
      }
      if (!host.isConnected) return;
      const myName = norm(typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '');
      const memberSet = new Set((snapshot?.members || []).map(m => norm(m.name)));
      const invitedSet = new Set((snapshot?.outgoing || []).filter(o => o.kind === 'invite').map(o => norm(o.person)));
      const list = students.filter(s => {
        const key = norm(s.name);
        return key && key !== myName && !memberSet.has(key);
      }).slice(0, 30);
      if (!list.length) {
        host.innerHTML = '<p class="dm-team-invite-empty">Şu an davet edilebilecek aktif öğrenci bulunamadı.</p>';
        return;
      }
      host.innerHTML = list.map(student => {
        const already = invitedSet.has(norm(student.name));
        const face = window.karakterSvg?.(student.name, 34) || '<span>' + escaped(student.name.slice(0, 1)) + '</span>';
        return '<div class="dm-team-invite-row"><span class="dm-team-invite-avatar">' + face + '</span>' +
          '<div class="dm-team-invite-meta"><b>' + escaped(student.name) + '</b><small>' + escaped(student.league) + ' · ' + number(student.xp) + ' XP</small></div>' +
          (already
            ? '<span class="dm-team-invite-sent">Davet edildi ✓</span>'
            : '<button type="button" class="dm-team-invite-btn" data-team-action="invite-direct" data-team-id="' + escaped(student.name) + '">Davet Et</button>') +
          '</div>';
      }).join('');
    } catch {
      if (host.isConnected) host.innerHTML = '<p class="dm-team-invite-empty">Aktif öğrenci listesi şu anda yüklenemedi.</p>';
    }
  }

  function duelSheetHtml() {
    return '<div class="dm-team-duel-panel">' +
      '<div class="dm-team-duel-badge"><span aria-hidden="true">⚔️</span> Tamamlanan her düello takımına <strong>+10 puan</strong> kazandırır!</div>' +
      '<button type="button" class="dm-team-duel-card is-live" data-team-action="live">' +
        '<span class="dm-team-duel-art" aria-hidden="true">⚡</span>' +
        '<span class="dm-team-duel-copy"><span class="dm-team-duel-tag">Anlık Eşleşme</span><b>Canlı Düello</b><small>Gerçek bir rakibe karşı yarış, takımını zirveye taşı</small></span>' +
        '<em class="dm-team-duel-go" aria-hidden="true">›</em>' +
      '</button>' +
      '<button type="button" class="dm-team-duel-card is-papi" data-team-action="papi">' +
        '<span class="dm-team-duel-art is-papi-art" aria-hidden="true"></span>' +
        '<span class="dm-team-duel-copy"><span class="dm-team-duel-tag">Hızlı Maç</span><b>Papi’ye Karşı Oyna</b><small>Beklemeden Papi ile yarışıp takım görevini tamamla</small></span>' +
        '<em class="dm-team-duel-go" aria-hidden="true">›</em>' +
      '</button>' +
    '</div>';
  }

  async function act(control) {
    const {teamAction:action,teamId:id}=control.dataset;
    try {
      switch(action) {
        case 'refresh': return load(true);
        case 'close': return dialog?.close();
        case 'create': return sheet('Takım Oluştur',teamForm(null));
        case 'edit': return sheet('Takım Adı ve Logosu',teamForm(snapshot.team));
        case 'settings': return settings();
        case 'invite': return void openInviteSheet();
        case 'invite-direct': {
          if (working || !id) return;
          working = true;
          control.disabled = true;
          control.textContent = 'Gönderiliyor…';
          try {
            snapshot = await manage('invite', { name: id });
            refreshHome();
            control.outerHTML = '<span class="dm-team-invite-sent">Davet edildi ✓</span>';
            window.yoToast?.(id + ' için takım daveti gönderildi.');
          } catch (failure) {
            control.disabled = false;
            control.textContent = 'Davet Et';
            const status = dialog?.querySelector('.dm-team-error');
            if (status) status.textContent = failure.message;
            else window.yoToast?.(failure.message);
          } finally { working = false; }
          return;
        }
        case 'search': return openTeamSearch();
        case 'requests': return openRequests(id);
        case 'retry-search': return searchTeams(dialog?.querySelector('input[name="name"]')?.value);
        case 'join': {
          if (working || !id) return;
          control.disabled=true;
          control.textContent='Gönderiliyor…';
          await submit('join',{id});
          if (control.isConnected) {
            control.disabled=false;
            control.textContent='Başvur';
          }
          return;
        }
        case 'weekly': case 'all': return await teamRanks(action);
        case 'premium': {
          armPremiumSession();
          dialog?.close();
          window.dmOpenGamesHome?.();
          window.dmGamesUI?.enter?.();
          window.yoToast?.('Takım katkısı aktif! Buradan oynadığın Premium oyunlar takımına +10 puan kazandırır.');
          return;
        }
        case 'game': dialog?.close(); return await games[id]?.[1]();
        case 'duel': return sheet('Takım için Düello Başlat', duelSheetHtml());
        case 'live': case 'papi': dialog?.close();return window.dmLiveDuel?.[action==='live'?'startLive':'startPapi']({team:true});
        case 'delete': case 'leave': case 'remove':
          return sheet(control.textContent,'<p>Bu işlemi onaylıyor musun?</p><div class="dm-team-buttons">'+
            button('close','Vazgeç')+button('confirm-'+action,'Onayla',id)+'</div>');
        case 'confirm-delete': case 'confirm-leave': case 'confirm-remove':
          return submit(action.slice('confirm-'.length),{id});
        case 'accept': case 'reject': case 'transfer': case 'withdraw': return submit(action,{id});
        case 'claim': {
          if (working) return;
          const award=awards[Number(id)]; if (!award) return;
          working=true;
          try {
            const result=await rpc('dm_team_rewards',{p_week:award.week,p_team:award.team});
            if(result.yo) window.dmApplyRewardState?.(result.yo,typeof aktifOgrenciAdi!=='undefined'?aktifOgrenciAdi:'');
            awards=result.awards;bonus=result.bonusEnergy;refreshHome();
            window.dmProgression?.refresh?.(true);
          } finally {working=false;}
          return;
        }
      }
    } catch (failure) { window.yoToast?.(failure.message); }
  }

  document.addEventListener('dm:login',()=>void load(true));
  document.addEventListener('dm:logout',()=>{owner='';snapshot=null;announcedRequests.clear();dialog?.close();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token())void load(true);});
  setInterval(()=>{if(token()&&!document.hidden){paintExpiry();maybeOpenRequest();void load();}},30000);
  setTimeout(()=>{if(token()&&!document.hidden)void load();},1500);
  window.dmTeam={
    navigateRequests,
    html, load, act, settings,
    isPremiumSession, launchPremiumCard, clearPremiumSession,
    ticket:async kind=>(await manage('ticket',{kind})).ticket,
    premiumTicket(runId) {
      const identity=token();
      for(const [key,value] of premiumTickets)if(value.owner!==identity||value.until<Date.now())premiumTickets.delete(key);
      if(!premiumTickets.has(runId)){
        const request=manage('ticket',{kind:'premium'}).then(data=>data.ticket).catch(error=>{premiumTickets.delete(runId);throw error;});
        premiumTickets.set(runId,{owner:identity,until:Date.now()+14*60000,request});
      }
      return premiumTickets.get(runId).request;
    },
    credited:points=>{window.yoToast?.('Takımına +'+points+' puan');void load(true);}
  };
})();
