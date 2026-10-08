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
