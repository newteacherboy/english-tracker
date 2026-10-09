/* Ders Çalış konu sayfası · "Vadi Defteri" görünümü.
   Sadece süsleme ekler: vadi manzarası, Papi görselleri ve konuşma balonu.
   Kilitler, sayaç, sesler, test ve Konu Macerası eski kodla aynen çalışır. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const gorsel = (src, sinif, alt) => {
    const img = document.createElement('img');
    img.src = src; img.className = sinif; img.alt = alt; img.decoding = 'async'; img.loading = 'lazy';
    return img;
  };

  function kur() {
    const ekran = $('dcScreenDetail'), baslik = $('dcTopicHeader');
    if (!ekran || !baslik) return false;
    document.body.classList.add('dc-vadi');

    if (!ekran.querySelector('.dv-vadi')) {
      const vadi = document.createElement('div');
      vadi.className = 'dv-vadi';
      const bilmiyordum = $('dcBilmiyordumBtn');
      if (bilmiyordum) vadi.appendChild(bilmiyordum);
      baslik.insertAdjacentElement('beforebegin', vadi);
    }
    if (!baslik.querySelector('.dv-papi-kitap')) baslik.appendChild(gorsel('ders-vadi/papi-kitap.png', 'dv-papi-kitap', ''));

    const anlatim = $('dcAnlatimIcerik');
    if (anlatim && !document.querySelector('.dv-papi-anlatir')) {
      const kutu = document.createElement('div');
      kutu.className = 'dv-papi-anlatir';
      kutu.appendChild(gorsel('ders-vadi/papi-buyutec.png', '', 'Büyüteçli Papi'));
      const balon = document.createElement('p');
      balon.textContent = 'Hadi bu konuyu birlikte keşfedelim! Altı çizili kelimelere dokunursan nasıl okunduğunu dinleyebilirsin.';
      kutu.appendChild(balon);
      anlatim.insertAdjacentElement('beforebegin', kutu);
    }
    return true;
  }

  /* Konu Macerası kartını anlatımın sonuna taşı ve yıldızlı Papi'yi ekle */
  function maceraYerlestir() {
    const kart = $('kmBaslangic'), panel = $('dcTab-anlatim');
    if (!kart || !panel) return;
    if (kart.parentElement !== panel) panel.appendChild(kart);
    if (!kart.querySelector('.dv-papi-yildiz')) kart.appendChild(gorsel('ders-vadi/papi-yildiz.png', 'dv-papi-yildiz', ''));
    kart.hidden = true; // Özgün Konu Macerası butonu ve işleyicisi korunur.
    // Başlığın hemen altında kısa bir giriş düğmesi; animasyonlu bitiş ekranı da kalır.
    const baslik = $('dcTopicHeader');
    if (!baslik) return;
    let giris = $('dvMaceraKisayol');
    if (!giris) {
      giris = document.createElement('button');
      giris.id = 'dvMaceraKisayol';
      giris.type = 'button';
      giris.className = 'dv-macera-kisayol';
      giris.innerHTML = '<span aria-hidden="true">🌟</span><span>Konu Macerası</span><span class="dv-kisayol-basla">Başla →</span>';
      giris.addEventListener('click', () => {
        const asil = $('kmBaslangic')?.querySelector('button');
        if (asil && !asil.disabled) asil.click();
      });
    }
    if (giris.previousElementSibling !== baslik) baslik.insertAdjacentElement('afterend', giris);
    const asil = kart.querySelector('button');
    giris.disabled = !asil || asil.disabled;
  }

  /* Konunun testi başarıyla tamamlandığında maceraya tam ekran geçiş. */
  function maceraGecisi() {
    if (document.getElementById('dvMaceraGecisi')) return;
    const kart = $('kmBaslangic');
    const eskiBasla = kart && kart.querySelector('button');
    if (!eskiBasla) return;
    const perde = document.createElement('div');
    perde.id = 'dvMaceraGecisi';
    perde.className = 'dv-macera-gecisi';
    perde.setAttribute('role', 'dialog');
    perde.setAttribute('aria-modal', 'true');
    perde.setAttribute('aria-label', 'Ders çalışma tamamlandı');
    perde.innerHTML = '<div class="dv-macera-isilti" aria-hidden="true">✦ ✧ ✦ ✧ ✦</div>' +
      '<div class="dv-macera-panel">' +
      '<img class="dv-macera-papi" src="ders-vadi/papi-yildiz.png" alt="Kutlayan Papi">' +
      '<span class="dv-macera-onay">🎉 Harika iş çıkardın!</span>' +
      '<h2>Ders çalışma bitti!</h2>' +
      '<p>Şimdi uygulama zamanı!</p>' +
      '<span class="dv-macera-bilgi">🃏 4 kart &nbsp;·&nbsp; ❓ 6 soru &nbsp;·&nbsp; 🏆 final</span>' +
      '<button class="dv-macera-basla" type="button">Başla <span aria-hidden="true">➜</span></button>' +
      '<button class="dv-macera-sonra" type="button">Daha sonra</button>' +
      '</div>';
    const kapat = () => { document.removeEventListener('keydown', tus); perde.remove(); };
    const tus = e => { if (e.key === 'Escape') kapat(); };
    perde.querySelector('.dv-macera-basla').addEventListener('click', () => {
      kapat();
      eskiBasla.click(); // Var olan Konu Macerası ve ödül akışı korunur.
    });
    perde.querySelector('.dv-macera-sonra').addEventListener('click', kapat);
    document.body.appendChild(perde);
    document.addEventListener('keydown', tus);
    perde.querySelector('.dv-macera-basla').focus();
  }

  function testBitisiniBagla() {
    const eski = window.dcTestiBitir;
    if (typeof eski !== 'function' || eski.__dvSarildi) return;
    const sarili = function (soruSayisi) {
      const toplam = Number(soruSayisi);
      const dogru = typeof dcQuizDogruSayisi !== 'undefined' ? Number(dcQuizDogruSayisi) : -1;
      const cevaplandi = typeof dcQuizCevaplari !== 'undefined' &&
        Array.isArray(dcQuizCevaplari) && dcQuizCevaplari.length === toplam &&
        dcQuizCevaplari.every(x => x !== -1);
      const tamamlandi = toplam > 0 && cevaplandi && dogru === toplam;
      const sonuc = eski.apply(this, arguments);
      // Testte eksik/yanlış cevap varsa eski doğrulama akışını değiştirme.
      if (tamamlandi) {
        if (sonuc && typeof sonuc.then === 'function') {
          return sonuc.then(deger => { maceraGecisi(); return deger; });
        }
        maceraGecisi();
      }
      return sonuc;
    };
    sarili.__dvSarildi = true;
    window.dcTestiBitir = sarili;
  }

  function bagla() {
    const eski = window.dcKonuDetayiCiz;
    if (typeof eski !== 'function' || eski.__dvSarildi) return;
    const sarili = function () {
      const sonuc = eski.apply(this, arguments);
      try { kur(); maceraYerlestir(); } catch (e) { console.warn('Vadi görünümü kurulamadı', e); }
      return sonuc;
    };
    sarili.__dvSarildi = true;
    window.dcKonuDetayiCiz = sarili;
  }

  function basla() { kur(); bagla(); maceraYerlestir(); testBitisiniBagla(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla);
  else basla();
  window.addEventListener('load', () => { bagla(); testBitisiniBagla(); });
})();

/* Çalışma Defteri menüleri. Özgün konu düğümleri ve işleyicileri korunur. */
(function () {
  'use strict';
  const norm = s => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const $ = id => document.getElementById(id);
  function filtrele(q) {
    const kartlar = document.querySelectorAll('#maPatika .ma-tas');
    let adet = 0;
    kartlar.forEach(b => { b.hidden = !norm(b.dataset.arama || b.textContent).includes(norm(q).trim()); if (!b.hidden) adet++; });
    const bos = $('dnAramaBos');
    if (bos) bos.hidden = !kartlar.length || adet > 0;
  }
  function kategorileriSusle() {
    const defter = $('maAdaIc');
    if (!defter) return;
    const tabela = defter.querySelector('.ma-tabela');
    if (tabela && !tabela.dataset.defterKategori) {
      tabela.dataset.defterKategori = '1';
      const alt = tabela.querySelector('small');
      const baslik = document.createElement('strong');
      baslik.textContent = (tabela.childNodes[0]?.textContent || 'A1').replace(' Adası', '') + ' Çalışma Defteri';
      tabela.replaceChildren(baslik);
      if (alt) { alt.textContent = alt.textContent.replace('keşfedildi', 'tamamlandı'); tabela.append(alt); }
      const papi = document.createElement('span'); papi.className = 'dn-category-papi'; papi.setAttribute('aria-hidden', 'true'); tabela.parentElement.append(papi);
      const aciklama = document.createElement('p'); aciklama.className = 'dn-category-intro'; aciklama.textContent = 'Bugün hangi bölümü çalışalım?'; tabela.parentElement.append(aciklama);
    }
    const resimler = {grammar:0, vocab:6, comm:3, pron:1};
    const ingilizce = {grammar:'Grammar', vocab:'Vocabulary', comm:'Communication', pron:'Pronunciation'};
    defter.querySelectorAll('.ma-yapi').forEach(kart => {
      if (kart.dataset.defterKategori) return;
      kart.dataset.defterKategori = '1';
      const resim = kart.querySelector('.ev'), etiket = kart.querySelector('.et');
      const key = kart.dataset.k, i = resimler[key] ?? 8;
      if (resim) { resim.textContent = ''; resim.setAttribute('aria-hidden', 'true'); resim.style.backgroundPosition = `${i % 3 * 50}% ${Math.floor(i / 3) * 50}%`; }
      if (etiket) { const sub = document.createElement('span'); sub.className = 'dn-category-en'; sub.textContent = ingilizce[key] || ''; etiket.querySelector('small')?.before(sub); }
      const ok = document.createElement('span'); ok.className = 'dn-category-open'; ok.textContent = 'Keşfet ›'; ok.setAttribute('aria-hidden', 'true'); kart.append(ok);
    });
  }
  let aramaYeri, aramaNode;
  function susle() {
    document.body.classList.add('dc-defter');
    kategorileriSusle();
    const aktif = $('dcScreenTopics')?.classList.contains('active') && document.body.classList.contains('dc-ada');
    document.body.classList.toggle('dn-topics', !!aktif);
    const arama = aramaNode || $('dcAramaInput')?.parentElement;
    if (arama) aramaNode = arama;
    if (arama && !aramaYeri) { aramaYeri = document.createComment('konu araması'); arama.before(aramaYeri); }
    if (!aktif && aramaYeri?.parentElement && arama) aramaYeri.after(arama);

    const k = $('maPatika');
    if (!k) return;
    const tabela = k.querySelector('.ma-tabela');
    if (tabela && !tabela.dataset.defter) {
      tabela.dataset.defter = '1';
      const alt = tabela.querySelector('small');
      const baslik = document.createElement('strong');
      baslik.textContent = tabela.childNodes[0]?.textContent.replace(/ patikası$/, '').replace(/^[^\p{L}]+/u, '') || 'Konular';
      tabela.replaceChildren(baslik);
      if (alt) { const sayi = alt.textContent.match(/(\d+)\/(\d+)/); alt.textContent = sayi ? `${sayi[1]} / ${sayi[2]} tamamlandı` : alt.textContent; tabela.append(alt); }
      const papi = document.createElement('span'); papi.setAttribute('aria-hidden', 'true'); papi.className = 'dn-menu-papi'; tabela.parentElement.append(papi);
      const bar = document.createElement('div'); bar.className = 'dn-progress';
      const fill = document.createElement('span');
      const txt = alt?.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      fill.style.width = txt && +txt[2] ? (+txt[1] / +txt[2] * 100) + '%' : '0%';
      bar.append(fill); tabela.parentElement.append(bar);
    }
    k.querySelectorAll('.ma-tas').forEach((b, i) => {
      if (b.dataset.defter) return;
      b.dataset.defter = '1';
      const titre = b.querySelector('.et b'), alt = b.querySelector('.et small'), tas = b.querySelector('.tas');
      if (!titre || !alt || !tas) return;
      b.dataset.arama = titre.textContent;
      const parts = titre.textContent.split(/\s+[—–]\s+/);
      if (parts.length > 1) {
        const en = parts.shift(); titre.textContent = parts.join(' — ');
        const sub = document.createElement('span'); sub.className = 'dn-en'; sub.textContent = en; titre.after(sub);
      }
      const earned = Math.min(3, (alt.textContent.match(/⭐|★/g) || []).length);
      const next = !!b.querySelector('.bayrak'); b.querySelector('.bayrak')?.remove();
      b.classList.toggle('dn-next', next); b.classList.toggle('dn-done', tas.textContent === '✓');
      tas.removeAttribute('style'); tas.textContent = String(i + 1);
      alt.hidden = true;
      const text = norm(b.dataset.arama);
      const kind = /alphabet|alfabe/.test(text) ? 0 : /possessive adjective|iyelik sifat/.test(text) ? 4 : /pronoun|zamir/.test(text) ? 3 : /article|a \/ an/.test(text) ? 5 : /have|sahiplik/.test(text) ? 2 : /\bbe\b|olmak/.test(text) ? 1 : 8;
      const titles = ['Alfabe ve Heceleme', 'Olmak Fiili', 'Sahiplik Bildirme', 'Zamirler', 'İyelik Sıfatları', 'A / An'];
      const subtitles = ['Alphabet & Spelling', 'Am / Is / Are', 'Have / Has Got', 'Pronouns', 'Possessive Adjectives', 'Articles'];
      if (kind < 6) { titre.textContent = titles[kind]; let sub = b.querySelector('.dn-en'); if (!sub) { sub = document.createElement('span'); sub.className = 'dn-en'; titre.after(sub); } sub.textContent = subtitles[kind]; }
      const doodle = document.createElement('span'); doodle.className = 'dn-doodle dn-sprite'; doodle.setAttribute('aria-hidden', 'true');
      doodle.style.backgroundPosition = `${kind % 3 * 50}% ${Math.floor(kind / 3) * 50}%`;
      b.append(doodle);
      if (next) {
        const go = document.createElement('span'); go.className = 'dn-go'; go.textContent = 'Devam et'; b.append(go);
      } else {
        const stars = document.createElement('span'); stars.className = 'dn-stars'; stars.setAttribute('aria-label', `${earned} / 3 yıldız`);
        for (let j = 0; j < 3; j++) { const star = document.createElement('span'); star.textContent = '★'; star.className = j < earned ? 'earned' : ''; star.setAttribute('aria-hidden', 'true'); stars.append(star); }
        b.append(stars);
      }
      const arrow = document.createElement('span'); arrow.className = 'dn-chevron'; arrow.textContent = '›'; arrow.setAttribute('aria-hidden', 'true'); b.append(arrow);

    });
    if (aktif) {
      let tabs = $('dnLevelTabs');
      if (!tabs) {
        tabs = document.createElement('nav'); tabs.id = 'dnLevelTabs'; tabs.setAttribute('aria-label', 'Ders seviyesi');
        ['A1', 'A2', 'B1', 'B2'].forEach(level => {
          const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = level;
          btn.onclick = () => { const kategori = dcAktifKategori; dcSeviyeSec(level, {A1:'Başlangıç', A2:'Temel', B1:'Orta', B2:'Orta-Üstü'}[level]); dcKategoriSec(kategori, dcKategoriRenkleri[kategori]?.label || kategori); };
          tabs.append(btn);
        }); k.before(tabs);
      }
      tabs.querySelectorAll('button').forEach(btn => { const selected = btn.textContent === dcAktifSeviye; btn.classList.toggle('active', selected); btn.setAttribute('aria-current', selected ? 'page' : 'false'); });
      let search = k.querySelector('.dn-search');
      if (!search) { search = document.createElement('div'); search.className = 'dn-search'; const books = document.createElement('span'); books.className = 'dn-books dn-sprite'; books.setAttribute('aria-hidden', 'true'); search.append(books); k.querySelector('.ma-ust')?.after(search); }
      if (arama) search.prepend(arama);
    }
    if (!$('dnAramaBos')) { const e = document.createElement('p'); e.id = 'dnAramaBos'; e.className = 'dn-empty'; e.setAttribute('role', 'status'); e.textContent = 'Bu aramayla eşleşen konu bulunamadı.'; e.hidden = true; k.querySelector('.ma-patika')?.append(e); }
    filtrele($('dcAramaInput')?.value || '');
  }
  function basla() {
    susle();
    const alan = $('dcAnaIcerik');
    if (alan) new MutationObserver(() => {
      if (document.querySelector('#maAdaIc .ma-yapi:not([data-defter-kategori])') || document.querySelector('#maAdaIc .ma-tabela:not([data-defter-kategori])') || document.querySelector('#maPatika .ma-tas:not([data-defter])') || document.querySelector('#maPatika .ma-tabela:not([data-defter])')) susle();
    }).observe(alan, {childList:true, subtree:true});
    const org = window.dcAramaYap;
    window.dcAramaYap = function(q) {
      if ($('dcScreenTopics')?.classList.contains('active') && document.body.classList.contains('dc-ada')) {
        const sonuclar = $('dcAramaSonuclari'); if (sonuclar) sonuclar.style.display = 'none';
        filtrele(q); return;
      }
      return org?.apply(this, arguments);
    };
    ['dcIleriGit', 'dcKategoriIcerikCiz', 'dcSeviyeSec', 'dcKategoriSec', 'dcGeriGit', 'dcAnaEkranaDon', 'dersCalisBaslat', 'dcTestSonrasiKonuListesineDon'].forEach(ad => {
      const org = window[ad]; if (typeof org !== 'function') return;
      window[ad] = function() { const result = org.apply(this, arguments); susle(); return result; };
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
})();


/* Konu Macerası: tamamlanmış eşleştirmelerin yeniden seçilmesini önle.
   Orijinal skor ve Devam et onclick kodu korunur. */
(function () {
  'use strict';
  document.addEventListener('click', function (event) {
    const btn = event.target.closest?.('#kmPerde .km-es .km-cip');
    if (!btn) return;
    if (btn.classList.contains('eslesti') || btn.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
