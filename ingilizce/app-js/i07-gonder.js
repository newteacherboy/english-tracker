
(function () {
  const $ = id => document.getElementById(id);
  const kucuk = x => String(x || '').trim().toLowerCase();
  const enc = encodeURIComponent;
  const girisli = () => { let p = $('panel-alani'); return !!(p && p.style.display === 'block' && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && kucuk(aktifOgrenciAdi) !== 'teacher'); };

  /* ---- Mağaza boş kalırsa yeniden çiz ---- */
  let orgMagaza = window.magazaAc;
  if (typeof orgMagaza === 'function') window.magazaAc = function () {
    let r = orgMagaza.apply(this, arguments);
    setTimeout(() => {
      let a = $('magazaAlan');
      if (a && !a.innerHTML.trim()) { window.yoGomuluHedef = 'magazaAlan'; if (typeof yoMagazaAc === 'function') yoMagazaAc(); }
      if (a && !a.innerHTML.trim()) a.innerHTML = '<div style="text-align:center;padding:40px 10px;font-weight:800;color:#8a78b8">Mağaza yükleniyor… Birkaç saniye sonra tekrar dene.</div>';
    }, 400);
    return r;
  };

  /* ---- Bildirim gönderme (paylaşım anahtarı ile) ---- */
  function gonder(alici, tur, metin, k) {
    if (!alici || kucuk(alici) === kucuk(aktifOgrenciAdi)) return;
    fetch(`${apiURL}?islem=bildirimGonder&alici=${enc(alici)}&gonderen=${enc(aktifOgrenciAdi)}&tur=${enc(tur)}&metin=${enc(String(metin || '').slice(0, 100))}&k=${enc(k || '')}`).catch(() => {});
  }
  window.maBildirimGonder = function (hedef, tur) {
    let olay = (typeof maAkisVeri !== 'undefined' ? maAkisVeri : []).find(e => e.k === hedef);
    gonder(olay ? olay.ogr : hedef, tur, olay ? olay.metin : '', olay ? olay.k : '');
  };
  [['maBegen', 'begeni', () => maBegeni], ['maTebrikEt', 'tebrik', () => maTebrik]].forEach(([ad, tur, kume]) => {
    let org = window[ad];
    if (typeof org !== 'function') return;
    window[ad] = function (id) {
      let once = kume().has(id);
      let r = org.apply(this, arguments);
      // The original reaction function owns notification dispatch.
      return r;
    };
  });
  let orgTakip = window.maTakipDegistir;
  if (typeof orgTakip === 'function') window.maTakipDegistir = function (id) {
    let once = maTakip.has(id);
    let r = orgTakip.apply(this, arguments);
    if (!once && maTakip.has(id)) gonder(id, 'takip', 'seni takip etmeye başladı', '');
    return r;
  };

  /* ---- Akışta beğeni / tebrik sayıları herkese görünsün ---- */
  let orgListe = window.maAkisListeHtml;
  if (typeof orgListe === 'function') window.maAkisListeHtml = function () {
    let html = orgListe.apply(this, arguments);
    let say = {};
    (typeof maAkisVeri !== 'undefined' ? maAkisVeri : []).forEach(e => { say[e.k] = e; });
    return html
      .replace(/maBegen\('akis-([^']+)', this\)">([^<]*)<\/button>/g, (m, k, t) => say[k] && say[k].b ? m.replace(t + '</button>', `${t} · ${say[k].b}</button>`) : m)
      .replace(/maTebrikEt\('akis-([^']+)', this\)">([^<]*)<\/button>/g, (m, k, t) => say[k] && say[k].tb ? m.replace(t + '</button>', `${t} · ${say[k].tb}</button>`) : m);
  };

  /* ---- Tür metinleri ---- */
  const TUR = {
    begeni: ['❤️', b => `${b.gonderen} paylaşımını beğendi`],
    tebrik: ['🎉', b => `${b.gonderen} seni tebrik etti`],
    takip: ['👋', b => `${b.gonderen} seni takip etmeye başladı`],
    enerji: ['⚡', b => `${b.gonderen} sana 2 enerji gönderdi`],
    duello: ['⚔️', b => `${b.gonderen} seni düelloya çağırdı`],
    hediye: ['🎁', b => `${b.gonderen} sana hediye gönderdi`],
    mesaj: ['💬', b => `${b.gonderen} sana mesaj gönderdi`],
    oyunDavet: ['🎮', b => `${b.gonderen} seni karşılaşmaya davet etti`]
  };
  const turMetin = b => (TUR[b.tur] || ['🔔', x => `${x.gonderen||'DijiMedu'}: ${x.metin||x.mesaj||x.message||x.icerik||'Yeni bildirimin var.'}`])[1](b);
  const turIkon = b => (TUR[b.tur] || ['🔔'])[0];

  async function unreadCount(list,owner){
    return list.length;   /* [27 Eki 2026] eski duyuru sayımı kaldırıldı */
  }
  /* ---- Oturum açıldığında okunmamış bildirimleri yükle ---- */
  let girisBakildi = '';
  setInterval(() => {
    if (!girisli() || girisBakildi === kucuk(aktifOgrenciAdi)) return;
    girisBakildi = kucuk(aktifOgrenciAdi);
    zilYokla();
  }, 1500);

  /* ---- Arkadaşlar: 🔔 bildirim merkezi ---- */
  let zilSayi = 0, zilFiltre = 'hepsi';
  function zilCiz() {
    const nav=document.querySelector('#bottomNavMobile [data-ekran="tab-meduakis"]');
    if(nav){
      let dot=nav.querySelector('.dm-friends-unread');
      if(zilSayi&&!dot){
        dot=document.createElement('span');dot.className='dm-friends-unread';dot.setAttribute('aria-hidden','true');nav.append(dot);
      }else if(!zilSayi)dot?.remove();
      nav.setAttribute('aria-label',zilSayi?'Arkadaşlar · '+zilSayi+' okunmamış bildirim':'Arkadaşlar');
    }
    let h2 = document.querySelector('#tab-meduakis .club-hero') || document.querySelector('#tab-meduakis .akis-baslik h2');
    if (!h2) return;
    let b = $('zlBtn');
    if(b&&b.parentElement!==h2)h2.appendChild(b);
    if (!b) {
      b = document.createElement('button');
      b.id = 'zlBtn'; b.className = 'zl-btn'; b.setAttribute('aria-label', 'Bildirimler');
      b.onclick = zilAc;
      h2.style.width = '100%';
      h2.appendChild(b);
    }
    b.setAttribute('aria-label','Bildirimler · '+zilSayi+' okunmamış');
    if(b.dataset.unread!==String(zilSayi)){
      b.dataset.unread=String(zilSayi);
      b.innerHTML='🔔'+(zilSayi?'<span class="zl-rozet" aria-hidden="true"></span>':'');
    }
  }
  setInterval(zilCiz, 1500);
  document.addEventListener('dm:login',()=>{girisBakildi='';zilSayi=0;zilCiz();});
  async function zilYokla() {
    if (!girisli() || document.hidden) return;
    const notifyOwner=kucuk(aktifOgrenciAdi);
    try {
      let r = await fetch(`${apiURL}?islem=bildirimlerim&ogrenci=${enc(aktifOgrenciAdi)}`);
      let d = await r.json(), n = await unreadCount((d && d.liste) || [],notifyOwner);
      if(notifyOwner!==kucuk(aktifOgrenciAdi))return;
      if (n > zilSayi) { let b = $('zlBtn'); if (b) { b.classList.remove('sallan'); void b.offsetWidth; b.classList.add('sallan'); } }
      zilSayi = n; zilCiz();
    } catch (e) {}
  }
  setInterval(zilYokla,120000);
  function zamanOnce(t) { return window.DMTime.format(t); }
  window.dmNotifications={open:()=>zilAc()};
  async function zilAc() {
    let p = document.createElement('div');
    p.className = 'zl-perde'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Bildirimler');
    p.innerHTML = `<div class="zl-panel"><div class="zl-ust"><h3>🔔 Bildirimler</h3><button id="zlKapat">Kapat</button></div><div class="zl-filtre" id="zlFiltre"></div><div id="zlListe"><div style="text-align:center;padding:30px;color:#8a78b8;font-weight:800">Yükleniyor…</div></div></div>`;
    document.body.appendChild(p);
    const navigation=e=>{if(e.target.closest('[data-ekran],[data-nav],[data-profile]'))kapat();};
    let kapat = () => {document.removeEventListener('click',navigation,true);p.remove();};document.addEventListener('click',navigation,true);
    p.querySelector('#zlKapat').onclick = kapat;
    p.addEventListener('click', e => { if (e.target === p) kapat(); });
    const notifyOwner=kucuk(aktifOgrenciAdi);
    let sosyal = [];
    try {
      let r = await fetch(`${apiURL}?islem=bildirimlerim&tumu=1&ogrenci=${enc(aktifOgrenciAdi)}`);
      let d = await r.json(); sosyal = (d && d.liste) || [];
    } catch (e) {}
    /* [Kas 2026] Medu Akış kaldırıldı: kendi kazançlarım tüm akış yerine yalnız kendi hareketlerimden okunur. */
    let hareketler = [];
    try {
      let r = await fetch(`${apiURL}?islem=benimHareketlerim&ogrenci=${enc(aktifOgrenciAdi)}`);
      let d = await r.json(); hareketler = (d && d.liste) || [];
    } catch (e) {}
    let benim = hareketler.map(e => ({ tarih: e.t, tur: 'kazanc', ikon: e.ikon, metin: e.metin, yeni: false }));
    let sosyalS = sosyal.map(b => ({ source:b, tarih: b.tarih, tur: b.tur, gonderen: b.gonderen, ikon: turIkon(b), metin: turMetin(b) + ((b.metin||b.mesaj||b.message||b.icerik) && TUR[b.tur] && b.tur !== 'takip' && b.tur !== 'duello' ? ` · “${b.metin||b.mesaj||b.message||b.icerik}”` : ''), yeni: !b.okundu, sat: b.sat }));
    let duyuru = [],announcementId='';
    /* [27 Eki 2026] Eski duyuru sistemi kaldırıldı; duyurular yeni duyuru kutusunda gösterilir. */
    let hepsi = [...sosyalS, ...duyuru].sort((a, b) => (window.DMTime.parse(b.tarih)||0) - (window.DMTime.parse(a.tarih)||0));
    zilFiltre='hepsi';const FILTRELER = [['hepsi','Hepsi']];
    async function ciz() {
      $('zlFiltre').innerHTML = FILTRELER.map(([k, t]) => `<button class="${k === zilFiltre ? 'aktif' : ''}" data-f="${k}">${t}</button>`).join('');
      $('zlFiltre').querySelectorAll('button').forEach(b => b.onclick = () => { zilFiltre = b.dataset.f; ciz(); });
      let l = hepsi.filter(x => zilFiltre === 'hepsi' || (zilFiltre === 'sosyal' ? TUR[x.tur] : x.tur === zilFiltre));
      $('zlListe').innerHTML = l.length ? l.map((x, i) => {
        let av = x.gonderen && typeof karakterSvg === 'function' ? karakterSvg(x.gonderen, 38) : '';
        return `<div class="zl-satir${x.yeni ? ' yeni' : ''}" style="animation-delay:${Math.min(i, 12) * 0.03}s"><div class="zl-ikon">${av || x.ikon}</div><div class="zl-metin" data-notification-index="${i}">${av ? x.ikon + ' ' : ''}${guvenliMetin(x.metin)}<small>${zamanOnce(x.tarih)}</small></div></div>`;
      }).join('') : '<div style="text-align:center;padding:30px;color:#8a78b8;font-weight:800">Burada henüz bir şey yok.</div>';
      await window.DMNotificationActions?.mount(p.querySelector('#zlListe'),l.map(x=>x.source||x),{owner:notifyOwner,currentOwner:()=>aktifOgrenciAdi,onNavigate:kapat});
    }
    if(notifyOwner!==kucuk(aktifOgrenciAdi)){kapat();return;}
    await ciz();
    let okunmamis = sosyal.filter(b => !b.okundu).map(b => b.sat);
    try{if(okunmamis.length){const ack=await fetch(`${apiURL}?islem=bildirimOkundu&ogrenci=${enc(notifyOwner)}&satirlar=${enc(okunmamis.join(','))}`);if(!ack.ok)throw Error('read failed');}if(notifyOwner!==kucuk(aktifOgrenciAdi))return;if(announcementId)localStorage.setItem('dm_notice_seen:'+notifyOwner,announcementId);zilSayi=0;zilCiz();}catch{/* Failed acknowledgement leaves the unread count intact. */}
  }
})();
