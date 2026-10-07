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

  function basla() { kur(); bagla(); maceraYerlestir(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla);
  else basla();
  window.addEventListener('load', bagla);
})();
