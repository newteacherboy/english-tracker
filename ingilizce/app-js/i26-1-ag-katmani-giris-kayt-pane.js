
(function () {
  const $ = id => document.getElementById(id);
  const kac = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kucuk = x => String(x || '').trim().toLocaleLowerCase('tr');
  const OGRT = () => { try { return sessionStorage.getItem('ing_ogr_token') || ''; } catch (e) { return ''; } };
  const PORTAL = location.origin + location.pathname;
  const kopyala = (metin, btn) => { try { navigator.clipboard.writeText(metin); if (btn) { let e = btn.textContent; btn.textContent = '✓ Kopyalandı'; setTimeout(() => btn.textContent = e, 1500); } } catch (e) { prompt('Kopyala:', metin); } };
  const jsonYanit = obj => new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } });

  /* =====================================================================
     1) AĞ KATMANI: giriş, kayıt, panel şifresi, bildirimler
     ===================================================================== */
  const DUELLO_ANAHTAR = () => 'diji_duello_gosterilen_' + kucuk(typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '');
  const orgFetch = window.fetch;
  window.fetch = async function (url, opt) {
    let u = typeof url === 'string' ? url : (url && url.url) || '';
    let govde = null;
    if (opt && typeof opt.body === 'string' && opt.body[0] === '{') { try { govde = JSON.parse(opt.body); } catch (e) {} }
    let islem = (govde && govde.islem) || (u.match(/[?&]islem=(\w+)/) || [])[1] || '';
    /* Öğrenci kaydı: isteğe bağlı öğretmen kodu */
    if (islem === 'kayitOl' && govde) {
      let k = $('kayitOlOgretmenKodu'); govde.ogretmenKodu = k ? k.value.trim() : '';
      let tl = String(govde.telefon || '').replace(/\D/g, ''), ep = String(govde.email || '').trim();
      if (!/^(0?5\d{9}|905\d{9})$/.test(tl)) return jsonYanit({ status: 'error', message: 'Geçerli bir veli cep telefonu yaz (05XX XXX XX XX).' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(ep)) return jsonYanit({ status: 'error', message: 'Geçerli bir veli e-posta adresi yaz. Onay ve gelişim raporları bu adrese gelecek.' });
      opt = Object.assign({}, opt, { body: JSON.stringify(govde) });
    }
    /* Duyuru: sınıf / şube hedefi */
    if (islem === 'duyuruEkle' && govde && (duyuruHedef.tip === 'sinif' || duyuruHedef.tip === 'sube')) {
      if (!duyuruHedef.liste.length) return jsonYanit({ status: 'error', message: duyuruHedef.tip === 'sinif' ? 'En az bir sınıf seç.' : 'En az bir şube seç.' });
      govde.hedefTipi = duyuruHedef.tip; govde.hedefListesi = duyuruHedef.liste.slice();
      opt = Object.assign({}, opt, { body: JSON.stringify(govde) });
    }
    /* Panel şifresi: başka bir öğretmen kullanıcı adı yazdıysa */
    if (islem === 'ogretmenGiris' && govde) {
      let k = $('cogPanelKullanici'); if (k && k.value.trim()) { govde.kullanici = k.value.trim(); opt = Object.assign({}, opt, { body: JSON.stringify(govde) }); }
    }
    let r = await orgFetch.call(this, url, opt);
    try {
      /* Öğretmen girişi: sayfa içinde her öğretmen "teacher" kimliğiyle çalışır (gerçek adı ayrıca saklanır).
         Hangi öğrencilerin görüneceğini sunucu, oturum anahtarından belirler. */
      if (islem === 'giris') {
        let d = await r.clone().json();
        if (d && d.ok && d.rol === 'ogretmen') {
          try { sessionStorage.setItem('ing_ogr_ad', d.ogrenci || ''); sessionStorage.setItem('ing_ogr_yonetici', d.yonetici ? '1' : ''); } catch (e) {}
          return jsonYanit(Object.assign({}, d, { ogrenci: 'teacher' }));
        }
      }
      if (islem === 'ogretmenGiris') {
        let d = await r.clone().json();
        if (d && d.ok) { try { sessionStorage.setItem('ing_ogr_ad', d.ogretmen || ''); sessionStorage.setItem('ing_ogr_yonetici', d.yonetici ? '1' : ''); } catch (e) {} setTimeout(ogretmenKartiCiz, 300); }
      }
      if (islem === 'kayitOl') {
        let d = await r.clone().json();
        if (d && d.status === 'success') setTimeout(() => { let m = $('kayitOlSonucMesaj'); if (m) m.innerText += d.ogretmen ? `\n👩‍🏫 Öğretmenin: ${d.ogretmen}. Kaydın ona iletildi.` : '\n🎒 Bağımsız öğrenci olarak kayıt oldun.'; }, 50);
      }
      /* Düello davetleri: bir kez açılır pencere olarak gösterilen davet bir daha pencere olarak açılmaz (zilde durur) */
      if (islem === 'bildirimlerim' && !/[?&]tumu=1/.test(u) && !(govde && govde.tumu)) {
        let d = await r.clone().json();
        if (d && Array.isArray(d.liste)) {
          let gor = new Set(); try { gor = new Set(JSON.parse(localStorage.getItem(DUELLO_ANAHTAR()) || '[]')); } catch (e) {}
          let degisti = false;
          d.liste.forEach(b => { if (b.tur === 'duello') { let k = String(b.sat); if (gor.has(k)) { b.tur = 'duello_gosterildi'; degisti = true; } else gor.add(k); } });
          try { localStorage.setItem(DUELLO_ANAHTAR(), JSON.stringify([...gor].slice(-200))); } catch (e) {}
          if (degisti) return jsonYanit(d);
        }
      }
    } catch (e) {}
    return r;
  };

  /* =====================================================================
     2) KAYIT OL: önce rol seçimi
     ===================================================================== */
  function kodAlaniEkle() {
    if ($('kayitOlOgretmenKodu')) return;
    let email = $('kayitOlEmail'); if (!email) return;
    let alan = email.closest('.rubric-field');
    let d = document.createElement('div'); d.className = 'rubric-field';
    d.innerHTML = `<label for="kayitOlOgretmenKodu">Öğretmen kodu (varsa):</label><input type="text" id="kayitOlOgretmenKodu" maxlength="10" autocomplete="off" autocapitalize="characters" placeholder="Örn: K7M4QX" style="text-transform:uppercase;letter-spacing:2px">
      <small style="display:block;font-size:10.5px;color:#64748b;margin-top:3px">Öğretmenin sana bir kod verdiyse yaz. Yoksa boş bırak, bağımsız kayıt olursun.</small>`;
    alan.parentNode.insertBefore(d, alan);
    let kod = new URLSearchParams(location.search).get('kod'); if (kod) $('kayitOlOgretmenKodu').value = kod.toUpperCase();
  }
  kodAlaniEkle(); setInterval(kodAlaniEkle, 2000);
  /* Telefon ve e-posta artık zorunlu: etiketleri güncelle */
  function zorunluEtiketler() {
    [['kayitOlTelefon', 'Telefon numarası (zorunlu):', '05XX XXX XX XX'], ['kayitOlEmail', 'E-posta adresi (zorunlu):', 'ornek@mail.com']].forEach(([id, etiket, ph]) => {
      let i = $(id); if (!i || i.dataset.zorunlu) return; i.dataset.zorunlu = '1'; i.placeholder = ph; i.required = true;
      if (id === 'kayitOlTelefon') { i.type = 'tel'; i.inputMode = 'tel'; } else i.type = 'email';
      let l = i.closest('.rubric-field') && i.closest('.rubric-field').querySelector('label'); if (l) l.textContent = etiket;
    });
  }
  zorunluEtiketler(); setInterval(zorunluEtiketler, 2000);
  let orgKayitAc = window.kayitOlAc;
  function perde(html, kapatFn) {
    let p = document.createElement('div'); p.className = 'cog-perde'; if (html.includes('dm-auth-mascot')) p.classList.add('dm-auth-dialog'); p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
    p.innerHTML = `<div class="cog-kart"><button class="cog-x" type="button" aria-label="Kapat">✕</button>${html}</div>`;
    document.body.appendChild(p);
    const kapat = () => { p.remove(); if (kapatFn) kapatFn(); };
    p.querySelector('.cog-x').onclick = kapat; p.onclick = e => { if (e.target === p) kapat(); };
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && document.body.contains(p)) { kapat(); document.removeEventListener('keydown', esc); } });
    return p;
  }
  window.kayitOlAc = function () {
    let p = perde(`<div class="dm-auth-mascot"><img src="papi-loading.webp" width="1145" height="1374" alt="Seni karşılayan Diji-Medu papağanı"></div><h3>Aramıza hoş geldin</h3><p class="alt">Portala kim olarak katılıyorsun?</p>
      <div class="cog-rol"><button type="button" data-r="ogr"><span class="ik">🎒</span><span><b>Öğrenciyim</b><small>Oyunlarla İngilizce öğren, herkesle yarış</small></span></button>
      <button type="button" data-r="ogrt"><span class="ik">👩‍🏫</span><span><b>Öğretmenim</b><small>Kendi öğrencilerini takip et, değerlendir, ödev ver</small></span></button></div>`);
    p.querySelector('[data-r="ogr"]').onclick = () => { p.remove(); kodAlaniEkle(); if (typeof orgKayitAc === 'function') orgKayitAc.apply(this, arguments); setTimeout(kodAlaniEkle, 100); };
    p.querySelector('[data-r="ogrt"]').onclick = () => { p.remove(); ogretmenKayit(); };
    setTimeout(() => p.querySelector('[data-r="ogr"]').focus(), 50);
  };
  /* Davet linkiyle gelen (…/?kod=XXXX) doğrudan öğrenci kaydına */
  if (new URLSearchParams(location.search).get('kod')) setTimeout(() => { if (typeof girisli === 'function' ? !girisli() : !localStorage.getItem('ing_token')) { kodAlaniEkle(); if (typeof orgKayitAc === 'function') orgKayitAc(); } }, 1500);

  function ogretmenKayit() {
    let p = perde(`<div class="dm-auth-mascot"><img src="papi-loading.webp" width="1145" height="1374" alt="Öğretmenleri karşılayan Diji-Medu papağanı"></div><h3>Öğretmen kaydı</h3><p class="alt">Hesabın hemen açılır ve sana özel bir öğretmen kodu verilir. Öğrencilerin kayıt olurken bu kodu yazınca sana bağlanır.</p>
      <div class="cog-alan"><label for="cogAd">Ad Soyad</label><input id="cogAd" autocomplete="name" placeholder="Örn: Ayşe Yılmaz"></div>
      <div class="cog-alan"><label for="cogKul">Kullanıcı adı (girişte kullanacaksın)</label><input id="cogKul" autocomplete="username" autocapitalize="off" placeholder="Örn: ayseogretmen"></div>
      <div class="cog-alan"><label for="cogEposta">E-posta (öğrenci bildirimleri buraya gelir)</label><input id="cogEposta" type="email" autocomplete="email" placeholder="ornek@okul.k12.tr"></div>
      <div class="cog-alan"><label for="cogTel">Cep telefonu</label><input id="cogTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="05XX XXX XX XX"></div>
      <div class="cog-alan"><label for="cogKurum">Okul / kurum (isteğe bağlı)</label><input id="cogKurum" placeholder="Örn: Atatürk İlkokulu"></div>
      <div class="cog-alan"><label for="cogS1">Şifre (en az 6 karakter)</label><input id="cogS1" type="password" autocomplete="new-password"></div>
      <div class="cog-alan"><label for="cogS2">Şifre (tekrar)</label><input id="cogS2" type="password" autocomplete="new-password"></div>
      <label class="cog-onay"><input type="checkbox" id="cogOnay"><span>Öğrencilerimin bilgilerini yalnızca eğitim amacıyla, KVKK'ya uygun olarak kullanacağımı kabul ediyorum.</span></label>
      <button type="button" class="cog-btn" id="cogGonder">Öğretmen hesabımı aç</button><div class="cog-mesaj" id="cogMesaj" role="alert"></div>`);
    const hata = m => { let e = $('cogMesaj'); e.className = 'cog-mesaj kotu'; e.textContent = m; };
    $('cogGonder').onclick = async () => {
      let tel = $('cogTel').value.trim(), ad = $('cogAd').value.trim(), kul = $('cogKul').value.trim(), ep = $('cogEposta').value.trim(), kurum = $('cogKurum').value.trim(), s1 = $('cogS1').value, s2 = $('cogS2').value;
      if (!ad || !kul || !ep || !s1 || !tel) return hata('Ad soyad, kullanıcı adı, e-posta, telefon ve şifre zorunlu.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(ep)) return hata('Geçerli bir e-posta adresi yaz.');
      if (!/^(0?5\d{9}|905\d{9})$/.test(tel.replace(/\D/g, ''))) return hata('Geçerli bir cep telefonu yaz (05XX XXX XX XX).');
      if (s1.length < 6) return hata('Şifre en az 6 karakter olmalı.');
      if (s1 !== s2) return hata('Şifreler birbiriyle uyuşmuyor.');
      if (!$('cogOnay').checked) return hata('Devam etmek için onay kutusunu işaretle.');
      let b = $('cogGonder'); b.disabled = true; b.textContent = 'Hesap açılıyor…';
      let d = null; try { let r = await orgFetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'ogretmenKayitOl', adSoyad: ad, kullaniciAdi: kul, email: ep, telefon: tel, kurum, sifre: s1 }) }); d = await r.json(); } catch (e) {}
      b.disabled = false; b.textContent = 'Öğretmen hesabımı aç';
      if (!d || !d.ok) return hata((d && d.mesaj) || 'Sunucuya ulaşılamadı, internetini kontrol et.');
      p.remove();
      let link = `${PORTAL}?kod=${d.kod}`;
      let p2 = perde(`<h3>${d.onayBekliyor ? '📨 Başvurun alındı!' : '🎉 Hesabın hazır!'}</h3><p class="alt">${d.onayBekliyor ? 'Hesabın yönetici onayından sonra açılacak; onaylanınca e-posta alacaksın. Onaydan sonra öğrencilerin kayıt olurken bu kodu yazınca sana bağlanır.' : 'Öğrencilerin kayıt olurken bu kodu yazınca sana bağlanır. Kod e-posta adresine de gönderildi.'}</p>
        <div class="cog-kod" aria-label="Öğretmen kodun">${kac(d.kod)}</div>
        <button type="button" class="cog-btn" id="cogKodKopya">📋 Kodu kopyala</button>
        <button type="button" class="cog-btn ikincil" id="cogLinkKopya">🔗 Öğrenci davet linkini kopyala</button>
        <button type="button" class="cog-btn ikincil" id="cogCreateAfterSignup"${d.onayBekliyor ? ' hidden' : ''}>🎒 İstersen öğrenci hesaplarını şimdi ekle</button><div id="cogCreateSignupMessage" role="status"></div>
        <button type="button" class="cog-btn ikincil" id="cogGiris"${d.onayBekliyor ? ' hidden' : ''}>➡️ Şimdi giriş yap</button>`);
      $('cogCreateAfterSignup').onclick = async () => {
        const b=$('cogCreateAfterSignup');b.disabled=true;
        let r;try{r=await (await orgFetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'giris',ogrenci:kul,sifre:s1})})).json();}catch{}
        b.disabled=false;
        if(!r?.ok || r.rol!=='ogretmen'){$('cogCreateSignupMessage').textContent=r?.mesaj||'Giriş kurulamadı. Öğretmen panelinden öğrenci ekleyebilirsin.';return;}
        sessionStorage.setItem('ing_ogr_token',r.token);p2.remove();window.dmStudentManagement.openCreate();
      };
      $('cogKodKopya').onclick = e => kopyala(d.kod, e.target);
      $('cogLinkKopya').onclick = e => kopyala(link, e.target);
      $('cogGiris').onclick = () => { p2.remove(); if (typeof kayitOlKapat === 'function') try { kayitOlKapat(); } catch (e) {} let o = $('ogrenci'); if (o) { o.value = d.kullanici; let s = $('sifre'); if (s) s.focus(); } };
    };
    setTimeout(() => $('cogAd').focus(), 50);
  }

  /* =====================================================================
     3) ÖĞRETMEN PANELİ: kodum kartı, yönetici için öğretmen listesi, başka öğretmen girişi
     ===================================================================== */
  async function ogretmenKartiCiz(preloaded) {
    let menu = document.querySelector('#ogretmenMenuModal .rubric-content'); if (!menu || !OGRT()) return;
    let k = $('cogOgretmenKart');
    if (!k) { k = document.createElement('div'); k.id = 'cogOgretmenKart'; k.className = 'cog-ogretmen-kart'; let h = menu.querySelector('h3'); (h || menu.firstElementChild).insertAdjacentElement('afterend', k); }
    k.innerHTML = '<small>Öğretmen bilgilerin yükleniyor…</small>';
    let d = preloaded?.ok?preloaded:null; if(!d)try { let r = await fetch(`${apiURL}?islem=ogretmenBilgim&_=${Date.now()}`); d = await r.json(); } catch (e) {}
    if (!d || !d.ok) { k.innerHTML = '<small>Öğretmen bilgileri alınamadı.</small>'; return; }
    let link = `${PORTAL}?kod=${d.kod}`;
    k.innerHTML = `<b>👩‍🏫 ${kac(d.adSoyad || d.kullanici)}${d.yonetici ? ' · Yönetici' : ''}</b>${d.kurum ? `<small>${kac(d.kurum)}</small>` : ''}
      <div><span class="kod" aria-label="Öğretmen kodun">${kac(d.kod || '—')}</span><button type="button" id="cogK1">📋 Kodu kopyala</button><button type="button" id="cogK2">🔗 Davet linki</button>${d.yonetici ? '<button type="button" id="cogK3">👥 Öğretmenler</button>' : ''}<button type="button" id="cogCreateStudents">🎒 Öğrenci hesabı ekle</button>${d.ogrenciYonetimi ? '<button type="button" id="cogManageStudents">🔐 Öğrenci hesaplarını yönet</button>' : ''}${d.ogrenciYonetimi ? '<button type="button" id="cogContacts">📇 Üye iletişim listesi</button>' : ''}</div>
      <small>${d.yonetici ? 'Yönetici olarak tüm öğrencileri görüyorsun' : `${d.ogrenciSayisi} öğrencin var · sadece sana kayıtlı öğrencileri görürsün`}${d.email ? ' · bildirimler: ' + kac(d.email) : ''}</small>`;
    $('cogK1').onclick = e => kopyala(d.kod, e.target);
    $('cogK2').onclick = e => kopyala(link, e.target);
    if ($('cogK3')) $('cogK3').onclick = () => { $('ogretmenMenuModal').style.display = 'none'; ogretmenListesi(); };
    $('cogCreateStudents').onclick = () => window.dmStudentManagement.openCreate();
    if($('cogManageStudents')) $('cogManageStudents').onclick = () => window.dmStudentManagement.openAdmin();
    if($('cogContacts')) $('cogContacts').onclick = () => window.dmStudentManagement.openContacts();
  }
  window.dmRefreshTeacherIdentity=ogretmenKartiCiz;
  let sonMenu = false;
  setInterval(() => {
    let m = $('ogretmenMenuModal'), acik = !!(m && getComputedStyle(m).display !== 'none');
    if (acik && (!sonMenu || !$('cogOgretmenKart'))) ogretmenKartiCiz();
    sonMenu = acik;
    /* panel şifre penceresine "başka öğretmen" alanı */
    let sm = $('sifreModal'), inp = $('yoneticiSifreInput');
    if (sm && inp && !$('cogPanelKullaniciKutu')) {
      let d = document.createElement('div'); d.id = 'cogPanelKullaniciKutu'; d.style.cssText = 'margin:0 0 8px;text-align:left';
      d.innerHTML = `<button type="button" id="cogBaskaOgrt" style="border:0;background:none;color:#0f766e;font:800 12px Nunito,system-ui,sans-serif;cursor:pointer;padding:2px 0">👩‍🏫 Bu öğrencinin öğretmeni değil misin? Kullanıcı adını yaz</button>
        <input id="cogPanelKullanici" placeholder="Öğretmen kullanıcı adın" autocomplete="username" style="display:none;width:100%;box-sizing:border-box;margin-top:6px;border:2px solid #e2e8f0;border-radius:10px;padding:9px;font:700 13px Nunito,system-ui,sans-serif">`;
      inp.parentNode.insertBefore(d, inp);
      $('cogBaskaOgrt').onclick = () => { let i = $('cogPanelKullanici'); i.style.display = 'block'; i.focus(); };
    }
  }, 700);
  async function ogretmenListesi() {
    let p = perde(`<h3>👥 Öğretmenler</h3><p class="alt">Her öğretmen sadece kendi kodunu giren öğrencileri görür. Pasif yapılan öğretmen giriş yapamaz.</p><div id="cogListe">Yükleniyor…</div>`);
    const ciz = async () => {
      let d = null; try { let r = await fetch(`${apiURL}?islem=ogretmenleriGetir&_=${Date.now()}`); d = await r.json(); } catch (e) {}
      let alan = $('cogListe'); if (!alan) return;
      if (!d || !d.ok) { alan.textContent = (d && d.mesaj) || 'Liste alınamadı.'; return; }
      alan.innerHTML = `<div class="cog-liste-satir" style="background:#f8fafc"><span class="m"><b>🎒 Bağımsız öğrenciler</b><small>Öğretmen kodu girmeden kayıt olanlar · senin sorumluluğunda</small></span><b>${d.bagimsiz}</b></div>` +
        d.liste.map(t => `<div class="cog-liste-satir"><span class="m"><b>${kac(t.adSoyad || t.kullanici)}${t.yonetici ? ' · 👑' : ''}${t.aktif ? '' : ' · ⛔ pasif'}</b>
          <small>${kac(t.kullanici)}${t.kurum ? ' · ' + kac(t.kurum) : ''} · kod <b style="display:inline;letter-spacing:1px">${kac(t.kod || '—')}</b> · ${t.ogrenci} öğrenci${t.email ? ' · ' + kac(t.email) : ''}</small></span>
          ${t.yonetici ? '' : `<button type="button" data-id="${kac(t.id)}" data-a="${t.aktif ? 0 : 1}" style="background:${t.aktif ? '#fee2e2;color:#991b1b' : '#dcfce7;color:#166534'}">${t.aktif ? 'Pasif yap' : 'Aktif yap'}</button>`}</div>`).join('');
      alan.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => {
        if (b.dataset.a === '0' && !confirm('Bu öğretmen pasif yapılsın mı? Giriş yapamaz; öğrencileri ve verileri silinmez.')) return;
        try { await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'ogretmenAktifPasif', id: b.dataset.id, aktif: b.dataset.a === '1' }) }); } catch (e) {}
        ciz();
      });
    };
    ciz();
  }

  /* =====================================================================
     4) BAĞIMSIZ ÖĞRENCİ: öğretmen koduyla sonradan bağlan
     ===================================================================== */
  function baglaKarti() {
    let p = $('soPanel'); if (!p || $('cogBagla')) return;
    let ad = typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '';
    if (!ad || kucuk(ad) === 'teacher') return;
    let u = (Array.isArray(globalDataCache) ? globalDataCache : []).find(x => kucuk(x.ogrenci) === kucuk(ad));
    if (!u || u.ogretmenBagli !== false) return;            /* bilgi yoksa ya da zaten bağlıysa gösterme */
    let k = document.createElement('div'); k.id = 'cogBagla'; k.className = 'cog-bagla';
    k.innerHTML = `<h3>👩‍🏫 Öğretmenine bağlan</h3><p>Öğretmenin sana bir kod verdiyse yaz: değerlendirmelerini, ödevlerini ve mesajlarını o takip eder. Ligde herkesle yarışmaya devam edersin.</p>
      <div class="satir"><input id="cogBaglaKod" maxlength="10" placeholder="KOD" aria-label="Öğretmen kodu"><button type="button" id="cogBaglaBtn">Bağlan</button></div><div class="cog-mesaj" id="cogBaglaMesaj" role="status"></div>`;
    p.insertBefore(k, p.firstChild);
    $('cogBaglaBtn').onclick = async () => {
      let kod = $('cogBaglaKod').value.trim(); if (!kod) return;
      let d = null; try { let r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'ogretmenKoduBagla', ogrenci: ad, kod }) }); d = await r.json(); } catch (e) {}
      let m = $('cogBaglaMesaj');
      if (d && d.ok) { k.innerHTML = `<h3>✅ ${kac(d.ogretmen)} artık öğretmenin!</h3><p>Mesajların ve ödevlerin artık ona gidecek.</p>`; u.ogretmenBagli = true; }
      else { m.className = 'cog-mesaj kotu'; m.textContent = (d && d.mesaj) || 'Bağlanılamadı, internetini kontrol et.'; }
    };
  }
  setInterval(baglaKarti, 2500);

  /* =====================================================================
     6) DUYURULAR ÖĞRENCİDE GÖRÜNSÜN
        (sayfadaki "her girişte duyuru kontrolü" yanlış fonksiyonu çağırıyordu; duyuru penceresi hiç açılmıyordu)
     ===================================================================== */
  let duyuruIlk = false, duyuruSon = 0, duyuruAcikti = false;
  const ogrenciGirisli = () => { let p = $('panel-alani'); return !!(p && p.style.display === 'block' && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && kucuk(aktifOgrenciAdi) !== 'teacher'); };
  const duyuruAcik = () => { let o = $('duyuruOverlay'); return !!(o && getComputedStyle(o).display !== 'none' && o.getClientRects().length); };
  setInterval(() => {
    if (!ogrenciGirisli() || typeof window.duyuruKontrolEt !== 'function') return;
    let acik = duyuruAcik();
    if (duyuruAcikti && !acik) duyuruSon = Date.now() - 5 * 60000 + 3000;   /* biri kapandıysa sıradakine 3 sn sonra bak */
    duyuruAcikti = acik;
    if (acik) return;
    if (!duyuruIlk) { duyuruIlk = true; duyuruSon = Date.now(); setTimeout(() => window.duyuruKontrolEt(), 3500); return; }
    if (Date.now() - duyuruSon > 5 * 60000) { duyuruSon = Date.now(); window.duyuruKontrolEt(); }
  }, 1500);

  /* =====================================================================
     7) DUYURU HEDEFİ: yönetici → herkes / sınıf / şube / seçili
                       öğretmen → tüm öğrencilerim / sınıf / şube / seçili
     ===================================================================== */
  const duyuruHedef = { tip: 'herkes', liste: [] };
  const yoneticiMi = () => { try { return sessionStorage.getItem('ing_ogr_yonetici') === '1'; } catch (e) { return false; } };
  function duyuruHedefCiz() {
    let cb = $('duyuruHerkesCb'); if (!cb) return;
    let kutu = $('cogDuyuruHedef');
    if (!kutu) {
      kutu = document.createElement('div'); kutu.id = 'cogDuyuruHedef'; kutu.style.cssText = 'margin:6px 0 10px;text-align:left';
      let yer = cb.closest('label') || cb.parentElement; yer.parentNode.insertBefore(kutu, yer); yer.style.display = 'none';
    }
    let ogr = (Array.isArray(globalDataCache) ? globalDataCache : []).filter(u => u && u.ogrenci && kucuk(u.ogrenci) !== 'teacher');
    let siniflar = [...new Set(ogr.map(u => String(u.Sinif || u.sinif || '')).filter(Boolean))].sort((a, b) => a - b);
    let subeler = [...new Set(ogr.map(u => `${u.Sinif || u.sinif || ''}|${String(u.sube || u.Sube || '').trim()}`).filter(x => !/^\||\|$/.test(x)))].sort();
    const SEC = [['herkes', yoneticiMi() ? '🌍 Herkes (tüm portal)' : '👩‍🏫 Tüm öğrencilerim'], ['sinif', '🏫 Sınıf'], ['sube', '🚪 Şube'], ['secili', '🙋 Seçili öğrenciler']];
    let imza = duyuruHedef.tip + '|' + duyuruHedef.liste.join(',') + '|' + siniflar.join(',') + '|' + subeler.join(',') + '|' + yoneticiMi();
    if (kutu.dataset.imza === imza) return; kutu.dataset.imza = imza;
    const cip = (deger, etiket, secili, veri) => `<button type="button" ${veri}="${kac(deger)}" style="border:1.5px solid ${secili ? '#7c3aed' : '#e2e8f0'};background:${secili ? '#7c3aed' : '#fff'};color:${secili ? '#fff' : '#334155'};border-radius:999px;padding:6px 11px;font:800 12px Nunito,system-ui,sans-serif;margin:0 5px 5px 0;cursor:pointer">${etiket}</button>`;
    kutu.innerHTML = `<div style="font:800 11.5px Nunito,system-ui,sans-serif;color:#475569;margin-bottom:5px">Kime gönderilsin?</div>` + SEC.map(([k, e]) => cip(k, e, duyuruHedef.tip === k, 'data-tip')).join('') +
      (duyuruHedef.tip === 'sinif' ? `<div style="margin-top:4px">${siniflar.map(x => cip(x, x + '. sınıf', duyuruHedef.liste.includes(x), 'data-deger')).join('') || '<small>Öğrenci yok</small>'}</div>` : '') +
      (duyuruHedef.tip === 'sube' ? `<div style="margin-top:4px">${subeler.map(x => cip(x, x.replace('|', '/') + ' şubesi', duyuruHedef.liste.includes(x), 'data-deger')).join('') || '<small>Şube bilgisi olan öğrenci yok</small>'}</div>` : '') +
      (!yoneticiMi() && duyuruHedef.tip === 'herkes' ? '<div style="font:700 11px Nunito,system-ui,sans-serif;color:#64748b">Genel (tüm portal) duyuruyu sadece yönetici yapabilir.</div>' : '');
    kutu.querySelectorAll('[data-tip]').forEach(b => b.onclick = () => { duyuruHedef.tip = b.dataset.tip; duyuruHedef.liste = []; uygula(); });
    kutu.querySelectorAll('[data-deger]').forEach(b => b.onclick = () => { let v = b.dataset.deger, i = duyuruHedef.liste.indexOf(v); i >= 0 ? duyuruHedef.liste.splice(i, 1) : duyuruHedef.liste.push(v); uygula(); });
    function uygula() {
      /* "Seçili öğrenciler" dışındaki seçimlerde sayfanın kendi "Herkes" kutusu işaretli kalır (doğrulama geçsin), hedef gönderirken değiştirilir */
      cb.checked = duyuruHedef.tip !== 'secili';
      cb.dispatchEvent(new Event('change', { bubbles: true })); try { if (typeof cb.onchange === 'function') cb.onchange(); } catch (e) {}
      kutu.dataset.imza = ''; duyuruHedefCiz();
    }
  }
  setInterval(duyuruHedefCiz, 1000);

  /* =====================================================================
     8) ÖĞRETMENİN GERÇEK ADI: sayfa içinde öğretmen "teacher" kimliğiyle çalışır; ekranda gerçek adı görünür
     ===================================================================== */
  let gercekAd = ''; try { gercekAd = sessionStorage.getItem('ing_ogr_ad') || ''; } catch (e) {}
  let adSoruldu = false;
  async function gercekAdiAl() {
    if (adSoruldu) return; adSoruldu = true;
    try { let r = await fetch(`${apiURL}?islem=ogretmenBilgim&_=${Date.now()}`); let d = await r.json(); if (d && d.ok && (d.adSoyad || d.kullanici)) { gercekAd = d.adSoyad || d.kullanici; sessionStorage.setItem('ing_ogr_ad', gercekAd); sessionStorage.setItem('ing_ogr_yonetici', d.yonetici ? '1' : ''); } } catch (e) {}
    setTimeout(() => { adSoruldu = false; }, 60000);   /* alınamadıysa bir dakika sonra yeniden dene */
  }
  const ADI_DEGIS = /^(\s*)teacher(\s*\(sen\))?(\s*)$/i;
  setInterval(() => {
    if (typeof aktifOgrenciAdi === 'undefined' || kucuk(aktifOgrenciAdi) !== 'teacher') return;
    if (!gercekAd || kucuk(gercekAd) === 'teacher') { try { gercekAd = sessionStorage.getItem('ing_ogr_ad') || ''; } catch (e) {} }
    if (!gercekAd || kucuk(gercekAd) === 'teacher') { gercekAdiAl(); return; }
    let kok = $('panel-alani') || document.body;
    let w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, { acceptNode: n => ADI_DEGIS.test(n.nodeValue) && !(n.parentElement && /^(INPUT|TEXTAREA|SCRIPT|STYLE|OPTION)$/.test(n.parentElement.tagName)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    let l = []; while (w.nextNode()) l.push(w.currentNode);
    l.forEach(n => { n.nodeValue = n.nodeValue.replace(ADI_DEGIS, (m, a, sen, b) => `${a}${gercekAd}${sen || ''}${b}`); });
  }, 1500);

  /* =====================================================================
     5) DERS ÇALIŞ: testten geri dönünce Örnekler/Test panelleri seviye ekranında kalmasın
        (bu iki panel sayfada konu ekranının dışında duruyor; konu ekranı kapalıyken gizlenir)
     ===================================================================== */
  setInterval(() => {
    let detay = $('dcScreenDetail'); if (!detay) return;
    let acik = detay.classList.contains('active') && getComputedStyle(detay).display !== 'none';
    ['dcTab-ornek', 'dcTab-test'].forEach(id => { let p = $(id); if (!p) return; if (!acik) { if (p.style.display !== 'none') p.style.display = 'none'; } else if (p.style.display === 'none') p.style.display = ''; });
  }, 250);
})();
