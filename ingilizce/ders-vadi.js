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
    kart.hidden = true; // Eski macera tetikleyicisi DOM'da kalsın, derste görünmesin.
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


/* Konu Macerası hızlı tıklama ve mobil görünüm koruması.
 * Ana soru/ödül fonksiyonlarını değiştirmez; mevcut Devam düğümünün
 * event handler'ını korur ve bir düğümün ikinci kez tetiklenmesini engeller. */
(function () {
  'use strict';
  const css = `
#kmPerde.km-perde{box-sizing:border-box!important;height:100dvh!important;max-height:100dvh!important;min-height:0!important;overflow:hidden!important;background:#fcfaf3!important;color:#173e35!important;padding-top:env(safe-area-inset-top,0px)!important;padding-bottom:env(safe-area-inset-bottom,0px)!important}
#kmPerde .km-ust{flex-shrink:0!important;background:#fffefa!important;border-bottom:1px solid #e4e9de!important;padding:12px 16px!important}
#kmPerde .km-bar{background:#e0e9df!important}#kmPerde .km-bar i{background:linear-gradient(90deg,#357654,#72b88a)!important}
#kmPerde .km-adim{color:#357654!important}#kmPerde .km-kapat{color:#357654!important}
#kmPerde .km-govde{flex:1 1 0!important;min-height:0!important;overflow-y:auto!important;padding:18px 18px 28px!important;overscroll-behavior:contain}
#kmPerde .km-alt{flex:0 0 auto!important;min-height:0!important;position:relative!important;z-index:2!important;background:#fffefa!important;border-top:1px solid #dfebdd!important;padding:12px 18px calc(16px + env(safe-area-inset-bottom,0px))!important;box-shadow:0 -5px 20px #214a3220!important}
#kmPerde .km-alt:empty{padding:0!important;border:0!important;box-shadow:none!important}
#kmPerde .km-btn{background:#357654!important;color:white!important;box-shadow:0 4px 0 #214c36!important;border-radius:16px!important;min-height:53px!important;font-weight:900!important}
#kmPerde .km-btn:disabled{background:#e6ebe3!important;color:#84998a!important;box-shadow:none!important}
#kmPerde .km-btn.ikincil{background:#fff!important;color:#357654!important;border:2px solid #bed3bf!important;box-shadow:none!important}
#kmPerde .km-kart,#kmPerde .km-soru{background:#fffefa!important;border:2px solid #d9e6d6!important;border-radius:22px!important;padding:20px 17px!important;box-shadow:0 6px 22px #34604414!important;color:#173e35!important}
#kmPerde .km-soru{font-size:clamp(19px,4.8vw,24px)!important;line-height:1.45!important;margin:10px 0 19px!important}
#kmPerde .km-soru small{color:#65826c!important}
#kmPerde .km-soru-tip{color:#438166!important;font-weight:900!important}
#kmPerde .km-sec,#kmPerde .km-cip{background:#fffefa!important;color:#173e35!important;border:2px solid #c8d9c8!important;border-radius:15px!important;box-shadow:0 3px 0 #dbe8d9!important;min-height:46px!important;touch-action:manipulation}
#kmPerde .km-sec.dogru,#kmPerde .km-cip.eslesti{background:#def8e5!important;border-color:#28a262!important}
#kmPerde .km-sec.yanlis{background:#ffe8e8!important;border-color:#df6868!important}
#kmPerde .km-cevap{background:repeating-linear-gradient(transparent 0 48px,#d3e5d6 48px 50px)!important;min-height:72px!important}
#kmPerde .km-geri.iyi{background:#def7e5!important;color:#246643!important}
#kmPerde .km-geri.kotu{background:#ffe5e3!important;color:#923832!important}
#kmPerde .km-sonuc h2{color:#173e35!important}#kmPerde .km-sonuc p{color:#537260!important}
@media(max-width:420px){#kmPerde .km-govde{padding:14px!important}#kmPerde .km-soru{padding:16px!important}}
`;
  function install() {
    if (!document.getElementById('kmMobileFixStyle')) {
      const style = document.createElement('style');style.id='kmMobileFixStyle';style.textContent=css;document.head.append(style);
    }
    if (document.documentElement.dataset.kmFixBound) return;
    document.documentElement.dataset.kmFixBound='1';
    let active=null, footerObserver=null, lastContinue=null, used=new WeakSet();
    function watch(perde) {
      if (perde===active) return;
      if (footerObserver) footerObserver.disconnect();
      active=perde;lastContinue=null;used=new WeakSet();
      if (!perde) return;
      const footer=perde.querySelector('#kmAlt');
      const body=perde.querySelector('#kmGovde');
      if (!footer||!body) return;
      footerObserver=new MutationObserver(()=>{
        const next=footer.querySelector('#kmIleri');
        if(next){lastContinue=next;return;}
        // Geri bildirim varken kaybolan Devam düğümünü aynı onclick ile geri getir.
        if(body.querySelector('.km-geri') && !footer.querySelector('button') && lastContinue && !footer.contains(lastContinue)) {
          footer.replaceChildren(lastContinue);
        }
      });
      footerObserver.observe(footer,{childList:true,subtree:false});
    }
    new MutationObserver(()=>watch(document.getElementById('kmPerde'))).observe(document.body,{childList:true,subtree:true});
    watch(document.getElementById('kmPerde'));
    document.addEventListener('click',e=>{
      const button=e.target.closest?.('#kmPerde #kmIleri');
      if(!button)return;
      if(used.has(button)){e.preventDefault();e.stopImmediatePropagation();return;}
      used.add(button);
      button.disabled=true;
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
