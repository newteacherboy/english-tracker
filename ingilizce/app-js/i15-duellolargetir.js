/* [18 Kas 2026] Eski düello sistemi (ayrı ayrı oynanan düello davetleri) kaldırıldı.
   Bu dosya artık sunucuya istek atmaz; yalnız eski çağrılar hata vermesin diye
   duelloOyununuAc tanımı kalır. Düellolar artık canlı düello (live-duel.js) ile oynanır. */
(function () {
  window.duelloOyununuAc = function () {
    if (typeof dcTumTamEkranlariKapat === 'function') dcTumTamEkranlariKapat();
    if (typeof meduAkisAc === 'function') meduAkisAc();
  };
})();
