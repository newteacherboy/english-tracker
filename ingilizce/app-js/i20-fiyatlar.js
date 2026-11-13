
(function () {
  const $ = id => document.getElementById(id);
  const kac = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const yoVar = () => typeof yo !== 'undefined' && yo && typeof yoHazirMi === 'function' && yoHazirMi();
  const toast = m => { if (typeof yoToast === 'function') yoToast(m); };
  const renkK = (c, k) => { try { return window.kaKoyu(c, k); } catch (e) { return c; } };
  const renkA = (c, k) => { try { return window.kaAcik(c, k); } catch (e) { return c; } };

  /* ================= FİYATLAR ================= */
  const FIYAT = { temel: 850, ozel: 3000, efsane: 5500 };
  const KOMBIN_FIYAT = { ozel: 9000, efsane: 13500 };
  const CIK_FIYAT = { temel: 400, ozel: 3000, efsane: 5500 };
  const SANDIK = [
    { ad: 'Bronz Sandık', ikon: '🧰', f: 200, adet: 1, sans: [85, 15, 0], alt: '1 öğe · %85 temel, %15 özel', renk: '#fdf2e9' },
    { ad: 'Gümüş Sandık', ikon: '🗃️', f: 450, adet: 2, sans: [65, 30, 5], garanti: 'ozel', alt: '2 öğe · en az 1 özel · %5 efsane', renk: '#f1f5f9' },
    { ad: 'Altın Sandık', ikon: '💰', f: 1000, adet: 3, sans: [45, 40, 15], garanti: 'ozel', alt: '3 öğe · en az 1 özel · %15 efsane', renk: '#fffbeb' },
    { ad: 'Efsane Sandık', ikon: '👑', f: 1800, adet: 3, sans: [30, 45, 25], garanti: 'efsane', alt: '3 öğe · 1 efsane garanti', renk: '#f5f0ff' }
  ];

  /* ================= KATALOG ================= */
  const R = { lila: ['#a78bfa', 'Lila'], pembe: ['#f472b6', 'Pembe'], mavi: ['#60a5fa', 'Mavi'], lacivert: ['#1e3a8a', 'Lacivert'], yesil: ['#34d399', 'Yeşil'],
    haki: ['#65a30d', 'Haki'], bordo: ['#9f1239', 'Bordo'], krem: ['#f5e6c8', 'Krem'], siyah: ['#334155', 'Füme'], beyaz: ['#f8fafc', 'Beyaz'], sari: ['#fbbf24', 'Hardal'],
    turuncu: ['#fb923c', 'Turuncu'], kirmizi: ['#ef4444', 'Kırmızı'], turkuaz: ['#22d3ee', 'Turkuaz'], kahve: ['#92400e', 'Kahve'], gri: ['#94a3b8', 'Gri'], mor: ['#7c3aed', 'Mor'] };
  const KAT = {
    bas: { ad: 'Baş', ikon: '🧕' }, ust: { ad: 'Üst', ikon: '👕' }, alt: { ad: 'Alt', ikon: '👖' }, tek: { ad: 'Tek parça', ikon: '👗' },
    dis: { ad: 'Dış giyim', ikon: '🧥' }, ayak: { ad: 'Ayakkabı', ikon: '👟' }, aks: { ad: 'Aksesuar', ikon: '🎒' }, cik: { ad: 'Çıkartma', ikon: '🏷️' }
  };
  const OGE = [];
  function ekle(kat, tip, adTip, renkler, seviye, desen) {
    renkler.forEach(r => {
      let [hex, rAd] = R[r];
      OGE.push({ id: `${kat[0]}:${tip}:${hex}:${desen || 'duz'}`, kat, tip, renk: hex, desen: desen || 'duz', ad: `${rAd} ${adTip}`, sv: typeof seviye === 'function' ? seviye(r) : seviye });
    });
  }
  /* Baş (başörtüleri) */
  ekle('bas', 'klasik', 'başörtüsü', ['lila', 'pembe', 'lacivert', 'krem', 'siyah', 'yesil'], 'temel');
  ekle('bas', 'klasik', 'desenli başörtüsü', ['pembe', 'mavi', 'bordo'], 'ozel', 'cicek');
  ekle('bas', 'klasik', 'puantiyeli başörtüsü', ['lacivert', 'kirmizi'], 'ozel', 'puantiye');
  ekle('bas', 'spor', 'spor başörtüsü', ['siyah', 'turkuaz', 'pembe', 'mor'], 'temel');
  ekle('bas', 'sal', 'şal', ['krem', 'bordo', 'haki', 'lila'], 'ozel');
  ekle('bas', 'bone', 'boneli eşarp', ['beyaz', 'gri', 'pembe'], 'ozel');
  ekle('bas', 'sal', 'ipek şal', ['sari'], 'efsane', 'yildiz');
  /* Üst */
  ekle('ust', 'tisort', 'tişört', ['lila', 'pembe', 'mavi', 'yesil', 'sari', 'kirmizi'], 'temel');
  ekle('ust', 'gomlek', 'gömlek', ['beyaz', 'mavi', 'pembe'], 'temel');
  ekle('ust', 'gomlek', 'ekose gömlek', ['kirmizi', 'lacivert'], 'ozel', 'ekose');
  ekle('ust', 'kazak', 'balıkçı kazak', ['krem', 'bordo', 'haki', 'lacivert'], 'temel');
  ekle('ust', 'kazak', 'çizgili kazak', ['turuncu', 'mavi'], 'ozel', 'cizgi');
  ekle('ust', 'tunik', 'tunik', ['lila', 'turkuaz', 'krem'], 'temel');
  ekle('ust', 'tunik', 'çiçekli tunik', ['pembe', 'yesil'], 'ozel', 'cicek');
  ekle('ust', 'sweat', 'kapüşonlu', ['gri', 'mor', 'turkuaz', 'siyah'], 'ozel');
  ekle('ust', 'bluz', 'fırfırlı bluz', ['beyaz', 'pembe', 'sari'], 'ozel', 'puantiye');
  ekle('ust', 'yoresel', 'yöresel yelekli üst', ['bordo'], 'efsane');
  /* Alt */
  ekle('alt', 'uzunetek', 'uzun etek', ['lacivert', 'siyah', 'kahve', 'bordo', 'haki', 'lila'], 'temel');
  ekle('alt', 'pileli', 'pileli etek', ['lacivert', 'gri', 'kirmizi', 'pembe'], 'temel');
  ekle('alt', 'klos', 'kloş etek', ['sari', 'turkuaz', 'pembe'], 'ozel');
  ekle('alt', 'klos', 'çiçekli kloş etek', ['krem'], 'ozel', 'cicek');
  ekle('alt', 'pantolon', 'pantolon', ['lacivert', 'siyah', 'kahve', 'krem', 'haki'], 'temel');
  ekle('alt', 'kot', 'kot', ['mavi', 'lacivert', 'siyah'], 'temel');
  ekle('alt', 'esofman', 'eşofman altı', ['gri', 'lacivert', 'mor'], 'temel');
  /* Tek parça */
  ekle('tek', 'elbise', 'uzun elbise', ['lila', 'pembe', 'turkuaz', 'bordo', 'krem'], 'ozel');
  ekle('tek', 'elbise', 'çiçekli elbise', ['mavi', 'yesil'], 'ozel', 'cicek');
  ekle('tek', 'ferace', 'ferace', ['lacivert', 'haki', 'kahve', 'siyah'], 'ozel');
  ekle('tek', 'tulum', 'tulum', ['mavi', 'sari', 'yesil', 'pembe'], 'ozel');
  ekle('tek', 'elbise', 'simli bayramlık elbise', ['mor', 'bordo'], 'efsane', 'yildiz');
  /* Dış giyim */
  ekle('dis', 'ceket', 'ceket', ['lacivert', 'krem', 'bordo', 'siyah'], 'temel');
  ekle('dis', 'hirka', 'hırka', ['krem', 'lila', 'gri', 'yesil'], 'temel');
  ekle('dis', 'yagmurluk', 'yağmurluk', ['sari', 'kirmizi', 'turkuaz'], 'ozel');
  ekle('dis', 'mont', 'mont', ['lacivert', 'pembe', 'haki', 'mor'], 'ozel');
  ekle('dis', 'yelek', 'yelek', ['kahve', 'lacivert', 'bordo'], 'temel');
  ekle('dis', 'onluk', 'doktor önlüğü', ['beyaz'], 'ozel');
  ekle('dis', 'itfaiye', 'itfaiyeci montu', ['kirmizi'], 'efsane');
  /* Ayakkabı */
  ekle('ayak', 'spor', 'spor ayakkabı', ['beyaz', 'pembe', 'mavi', 'siyah', 'yesil'], 'temel');
  ekle('ayak', 'bot', 'bot', ['kahve', 'siyah', 'bordo'], 'temel');
  ekle('ayak', 'babet', 'babet', ['pembe', 'lacivert', 'krem', 'kirmizi'], 'temel');
  ekle('ayak', 'sandalet', 'sandalet', ['kahve', 'krem', 'turkuaz'], 'temel');
  ekle('ayak', 'bot', 'parlak çizme', ['mor'], 'efsane', 'yildiz');
  /* Aksesuar */
  ekle('aks', 'canta', 'sırt çantası', ['kirmizi', 'mavi', 'yesil', 'mor'], 'temel');
  ekle('aks', 'atki', 'atkı', ['kirmizi', 'sari', 'lacivert', 'pembe'], 'temel');
  ekle('aks', 'saat', 'kol saati', ['siyah', 'sari'], 'ozel');
  ekle('aks', 'rozet', 'yıldız rozeti', ['sari'], 'ozel');
  ekle('aks', 'rozet', 'kalp rozeti', ['pembe'], 'ozel');
  /* Çıkartmalar (karakterin köşesinde görünür) */
  [['⭐', 'Yıldız', 'temel'], ['🌈', 'Gökkuşağı', 'temel'], ['🦜', 'Papi', 'temel'], ['📚', 'Kitap kurdu', 'temel'], ['🎧', 'Müzik', 'temel'],
   ['⚽', 'Futbol', 'temel'], ['🌸', 'Çiçek', 'temel'], ['🚀', 'Roket', 'ozel'], ['🧠', 'Beyin', 'ozel'], ['🏆', 'Kupa', 'ozel'], ['🦄', 'Unicorn', 'ozel'],
   ['🐉', 'Ejderha', 'efsane'], ['👑', 'Taç', 'efsane'], ['💎', 'Elmas', 'efsane'], ['🔥', 'Seri ateşi', 'efsane']].forEach(([e, ad, sv]) => OGE.push({ id: 'c:' + e, kat: 'cik', tip: 'cik', emoji: e, ad, sv }));
  OGE.push(...[{"id":"u:kahraman:#14b8a6:kanat","kat":"ust","tip":"kahraman","renk":"#14b8a6","desen":"kanat","ad":"Işık Kanadı kahraman üstü","sv":"efsane","c":"e","f":5500},{"id":"u:kahraman:#8b5cf6:kanat","kat":"ust","tip":"kahraman","renk":"#8b5cf6","desen":"kanat","ad":"Işık Kanadı kahraman üstü","sv":"efsane","c":"k","f":5500},{"id":"u:kahraman:#8b5cf6:kristal","kat":"ust","tip":"kahraman","renk":"#8b5cf6","desen":"kristal","ad":"Kristal Gaga kahraman üstü","sv":"efsane","c":"e","f":5500},{"id":"u:kahraman:#22d3ee:kristal","kat":"ust","tip":"kahraman","renk":"#22d3ee","desen":"kristal","ad":"Kristal Gaga kahraman üstü","sv":"efsane","c":"k","f":5500},{"id":"u:kahraman:#2563eb:firtina","kat":"ust","tip":"kahraman","renk":"#2563eb","desen":"firtina","ad":"Fırtına Tüyü kahraman üstü","sv":"efsane","c":"e","f":5500},{"id":"u:kahraman:#f59e0b:firtina","kat":"ust","tip":"kahraman","renk":"#f59e0b","desen":"firtina","ad":"Fırtına Tüyü kahraman üstü","sv":"efsane","c":"k","f":5500}]);
  /* Prestige sets share the server catalog and require level 40. */
  OGE.push(...[{"id":"u:kahraman:#ef4444:anka","kat":"ust","tip":"kahraman","renk":"#ef4444","desen":"anka","ad":"Anka Hükümdarı pelerinli üst","sv":"efsane","legendary":true,"f":20000},{"id":"a:pantolon:#ef4444:yildiz","kat":"alt","tip":"pantolon","renk":"#ef4444","desen":"yildiz","ad":"Anka Hükümdarı pantolon","sv":"efsane","legendary":true,"f":12000},{"id":"a:bot:#fbbf24:yildiz","kat":"ayak","tip":"bot","renk":"#fbbf24","desen":"yildiz","ad":"Anka Hükümdarı bot","sv":"efsane","legendary":true,"f":8000},{"id":"u:kahraman:#6366f1:galaksi","kat":"ust","tip":"kahraman","renk":"#6366f1","desen":"galaksi","ad":"Galaksi Koruyucusu pelerinli üst","sv":"efsane","legendary":true,"f":24000},{"id":"a:pantolon:#6366f1:yildiz","kat":"alt","tip":"pantolon","renk":"#6366f1","desen":"yildiz","ad":"Galaksi Koruyucusu pantolon","sv":"efsane","legendary":true,"f":16000},{"id":"a:bot:#22d3ee:yildiz","kat":"ayak","tip":"bot","renk":"#22d3ee","desen":"yildiz","ad":"Galaksi Koruyucusu bot","sv":"efsane","legendary":true,"f":8000},{"id":"u:kahraman:#059669:ejderha","kat":"ust","tip":"kahraman","renk":"#059669","desen":"ejderha","ad":"Zümrüt Ejderha pelerinli üst","sv":"efsane","legendary":true,"f":28000},{"id":"a:pantolon:#059669:yildiz","kat":"alt","tip":"pantolon","renk":"#059669","desen":"yildiz","ad":"Zümrüt Ejderha pantolon","sv":"efsane","legendary":true,"f":20000},{"id":"a:bot:#a3e635:yildiz","kat":"ayak","tip":"bot","renk":"#a3e635","desen":"yildiz","ad":"Zümrüt Ejderha bot","sv":"efsane","legendary":true,"f":8000}]);
  OGE.forEach(o => { o.f = DijiProgressionCatalog.price(o); });
  const OGE_ID = Object.fromEntries(OGE.map(o => [o.id, o]));
  const bul = (kat, tip, r, desen) => OGE.find(o => o.kat === kat && o.tip === tip && o.renk === R[r][0] && (!desen || o.desen === desen));

  /* Kombinler (parçalardan yaklaşık %25 ucuz) */
  const KOMBIN = [
    ['🏫', 'Okul kombini', 'ozel', [bul('ust', 'gomlek', 'beyaz'), bul('alt', 'pileli', 'lacivert'), bul('dis', 'yelek', 'lacivert'), bul('ayak', 'babet', 'lacivert')]],
    ['⚽', 'Sporcu', 'ozel', [bul('ust', 'sweat', 'turkuaz'), bul('alt', 'esofman', 'lacivert'), bul('ayak', 'spor', 'beyaz'), bul('bas', 'spor', 'turkuaz')]],
    ['🩺', 'Doktor', 'ozel', [bul('ust', 'gomlek', 'mavi'), bul('alt', 'pantolon', 'lacivert'), bul('dis', 'onluk', 'beyaz'), bul('ayak', 'spor', 'beyaz')]],
    ['🔬', 'Bilim insanı', 'ozel', [bul('ust', 'kazak', 'krem'), bul('alt', 'uzunetek', 'kahve'), bul('dis', 'onluk', 'beyaz'), bul('aks', 'saat', 'siyah')]],
    ['🎨', 'Ressam', 'ozel', [bul('ust', 'tunik', 'turkuaz'), bul('alt', 'kot', 'mavi'), bul('bas', 'klasik', 'pembe', 'cicek'), bul('ayak', 'sandalet', 'krem')]],
    ['❄️', 'Kış kombini', 'ozel', [bul('ust', 'kazak', 'bordo'), bul('alt', 'uzunetek', 'siyah'), bul('dis', 'mont', 'lacivert'), bul('ayak', 'bot', 'kahve'), bul('aks', 'atki', 'kirmizi')]],
    ['🌧️', 'Yağmurlu gün', 'ozel', [bul('ust', 'tisort', 'mavi'), bul('alt', 'kot', 'lacivert'), bul('dis', 'yagmurluk', 'sari'), bul('ayak', 'bot', 'siyah')]],
    ['✨', 'Şık kombin', 'ozel', [bul('tek', 'ferace', 'lacivert'), bul('ayak', 'babet', 'krem'), bul('aks', 'canta', 'mor')]],
    ['🚒', 'İtfaiyeci', 'efsane', [bul('dis', 'itfaiye', 'kirmizi'), bul('ust', 'tisort', 'kirmizi'), bul('alt', 'pantolon', 'siyah'), bul('ayak', 'bot', 'siyah')]],
    ['🪡', 'Yöresel', 'efsane', [bul('ust', 'yoresel', 'bordo'), bul('alt', 'uzunetek', 'bordo'), bul('bas', 'sal', 'krem'), bul('ayak', 'babet', 'kirmizi')]],
    ['🎉', 'Bayramlık', 'efsane', [bul('tek', 'elbise', 'mor', 'yildiz'), bul('bas', 'sal', 'sari', 'yildiz'), bul('ayak', 'bot', 'mor', 'yildiz'), bul('aks', 'rozet', 'sari')]]
  ].map(([ikon, ad, sv, parca]) => {
    parca = parca.filter(p => p && p.kat !== 'bas');             /* baş seçimi öğrencinin: kombinde başörtüsü yok */
    let f = KOMBIN_FIYAT[sv];
    return { id: 'k:' + ad, ikon, ad, sv, parca, f };
  });

  KOMBIN.push(...[{"id":"k:Okul kâşifi","ikon":"🦜","ad":"Okul kâşifi","sv":"ozel","parca":[{"id":"u:gomlek:#f8fafc:duz","kat":"ust","tip":"gomlek","renk":"#f8fafc","desen":"duz","ad":"Beyaz gömlek","sv":"temel","f":850},{"id":"a:pantolon:#1e3a8a:duz","kat":"alt","tip":"pantolon","renk":"#1e3a8a","desen":"duz","ad":"Lacivert pantolon","sv":"temel","f":850},{"id":"d:yelek:#1e3a8a:duz","kat":"dis","tip":"yelek","renk":"#1e3a8a","desen":"duz","ad":"Lacivert yelek","sv":"temel","f":850},{"id":"a:spor:#f8fafc:duz","kat":"ayak","tip":"spor","renk":"#f8fafc","desen":"duz","ad":"Beyaz spor ayakkabı","sv":"temel","f":850}],"c":"e","f":9000},{"id":"k:Bilim kâşifi","ikon":"🦜","ad":"Bilim kâşifi","sv":"ozel","parca":[{"id":"u:kazak:#f5e6c8:duz","kat":"ust","tip":"kazak","renk":"#f5e6c8","desen":"duz","ad":"Krem balıkçı kazak","sv":"temel","f":850},{"id":"a:pantolon:#92400e:duz","kat":"alt","tip":"pantolon","renk":"#92400e","desen":"duz","ad":"Kahve pantolon","sv":"temel","f":850},{"id":"d:onluk:#f8fafc:duz","kat":"dis","tip":"onluk","renk":"#f8fafc","desen":"duz","ad":"Beyaz doktor önlüğü","sv":"ozel","f":3000},{"id":"a:saat:#334155:duz","kat":"aks","tip":"saat","renk":"#334155","desen":"duz","ad":"Füme kol saati","sv":"ozel","f":3000}],"c":"e","f":9000},{"id":"k:Kış kâşifi","ikon":"🦜","ad":"Kış kâşifi","sv":"ozel","parca":[{"id":"u:kazak:#9f1239:duz","kat":"ust","tip":"kazak","renk":"#9f1239","desen":"duz","ad":"Bordo balıkçı kazak","sv":"temel","f":850},{"id":"a:pantolon:#334155:duz","kat":"alt","tip":"pantolon","renk":"#334155","desen":"duz","ad":"Füme pantolon","sv":"temel","f":850},{"id":"d:mont:#1e3a8a:duz","kat":"dis","tip":"mont","renk":"#1e3a8a","desen":"duz","ad":"Lacivert mont","sv":"ozel","f":3000},{"id":"a:bot:#92400e:duz","kat":"ayak","tip":"bot","renk":"#92400e","desen":"duz","ad":"Kahve bot","sv":"temel","f":850}],"c":"e","f":9000},{"id":"k:Işık Kanadı-e","ikon":"🦜","ad":"Işık Kanadı · erkek kombini","sv":"efsane","c":"e","parca":[{"id":"u:kahraman:#14b8a6:kanat","kat":"ust","tip":"kahraman","renk":"#14b8a6","desen":"kanat","ad":"Işık Kanadı kahraman üstü","sv":"efsane","c":"e","f":5500},{"id":"a:pantolon:#1e3a8a:duz","kat":"alt","tip":"pantolon","renk":"#1e3a8a","desen":"duz","ad":"Lacivert pantolon","sv":"temel","f":850},{"id":"a:spor:#f8fafc:duz","kat":"ayak","tip":"spor","renk":"#f8fafc","desen":"duz","ad":"Beyaz spor ayakkabı","sv":"temel","f":850}],"f":13500},{"id":"k:Işık Kanadı-k","ikon":"🦜","ad":"Işık Kanadı · kız kombini","sv":"efsane","c":"k","parca":[{"id":"u:kahraman:#8b5cf6:kanat","kat":"ust","tip":"kahraman","renk":"#8b5cf6","desen":"kanat","ad":"Işık Kanadı kahraman üstü","sv":"efsane","c":"k","f":5500},{"id":"a:pantolon:#1e3a8a:duz","kat":"alt","tip":"pantolon","renk":"#1e3a8a","desen":"duz","ad":"Lacivert pantolon","sv":"temel","f":850},{"id":"a:spor:#f8fafc:duz","kat":"ayak","tip":"spor","renk":"#f8fafc","desen":"duz","ad":"Beyaz spor ayakkabı","sv":"temel","f":850}],"f":13500},{"id":"k:Kristal Gaga-e","ikon":"🦜","ad":"Kristal Gaga · erkek kombini","sv":"efsane","c":"e","parca":[{"id":"u:kahraman:#8b5cf6:kristal","kat":"ust","tip":"kahraman","renk":"#8b5cf6","desen":"kristal","ad":"Kristal Gaga kahraman üstü","sv":"efsane","c":"e","f":5500},{"id":"a:pantolon:#1e3a8a:duz","kat":"alt","tip":"pantolon","renk":"#1e3a8a","desen":"duz","ad":"Lacivert pantolon","sv":"temel","f":850},{"id":"a:spor:#f8fafc:duz","kat":"ayak","tip":"spor","renk":"#f8fafc","desen":"duz","ad":"Beyaz spor ayakkabı","sv":"temel","f":850}],"f":13500},{"id":"k:Kristal Gaga-k","ikon":"🦜","ad":"Kristal Gaga · kız kombini","sv":"efsane","c":"k","parca":[{"id":"u:kahraman:#22d3ee:kristal","kat":"ust","tip":"kahraman","renk":"#22d3ee","desen":"kristal","ad":"Kristal Gaga kahraman üstü","sv":"efsane","c":"k","f":5500},{"id":"a:pantolon:#1e3a8a:duz","kat":"alt","tip":"pantolon","renk":"#1e3a8a","desen":"duz","ad":"Lacivert pantolon","sv":"temel","f":850},{"id":"a:spor:#f8fafc:duz","kat":"ayak","tip":"spor","renk":"#f8fafc","desen":"duz","ad":"Beyaz spor ayakkabı","sv":"temel","f":850}],"f":13500},{"id":"k:Fırtına Tüyü-e","ikon":"🦜","ad":"Fırtına Tüyü · erkek kombini","sv":"efsane","c":"e","parca":[{"id":"u:kahraman:#2563eb:firtina","kat":"ust","tip":"kahraman","renk":"#2563eb","desen":"firtina","ad":"Fırtına Tüyü kahraman üstü","sv":"efsane","c":"e","f":5500},{"id":"a:pantolon:#1e3a8a:duz","kat":"alt","tip":"pantolon","renk":"#1e3a8a","desen":"duz","ad":"Lacivert pantolon","sv":"temel","f":850},{"id":"a:spor:#f8fafc:duz","kat":"ayak","tip":"spor","renk":"#f8fafc","desen":"duz","ad":"Beyaz spor ayakkabı","sv":"temel","f":850}],"f":13500},{"id":"k:Fırtına Tüyü-k","ikon":"🦜","ad":"Fırtına Tüyü · kız kombini","sv":"efsane","c":"k","parca":[{"id":"u:kahraman:#f59e0b:firtina","kat":"ust","tip":"kahraman","renk":"#f59e0b","desen":"firtina","ad":"Fırtına Tüyü kahraman üstü","sv":"efsane","c":"k","f":5500},{"id":"a:pantolon:#1e3a8a:duz","kat":"alt","tip":"pantolon","renk":"#1e3a8a","desen":"duz","ad":"Lacivert pantolon","sv":"temel","f":850},{"id":"a:spor:#f8fafc:duz","kat":"ayak","tip":"spor","renk":"#f8fafc","desen":"duz","ad":"Beyaz spor ayakkabı","sv":"temel","f":850}],"f":13500}]);
  KOMBIN.push(...[{"id":"k:efsane-anka","ikon":"👑","ad":"Anka Hükümdarı seti","sv":"efsane","legendary":true,"parca":[{"id":"u:kahraman:#ef4444:anka","kat":"ust","tip":"kahraman","renk":"#ef4444","desen":"anka","ad":"Anka Hükümdarı pelerinli üst","sv":"efsane","legendary":true,"f":20000},{"id":"a:pantolon:#ef4444:yildiz","kat":"alt","tip":"pantolon","renk":"#ef4444","desen":"yildiz","ad":"Anka Hükümdarı pantolon","sv":"efsane","legendary":true,"f":12000},{"id":"a:bot:#fbbf24:yildiz","kat":"ayak","tip":"bot","renk":"#fbbf24","desen":"yildiz","ad":"Anka Hükümdarı bot","sv":"efsane","legendary":true,"f":8000}],"f":30000},{"id":"k:efsane-galaksi","ikon":"👑","ad":"Galaksi Koruyucusu seti","sv":"efsane","legendary":true,"parca":[{"id":"u:kahraman:#6366f1:galaksi","kat":"ust","tip":"kahraman","renk":"#6366f1","desen":"galaksi","ad":"Galaksi Koruyucusu pelerinli üst","sv":"efsane","legendary":true,"f":24000},{"id":"a:pantolon:#6366f1:yildiz","kat":"alt","tip":"pantolon","renk":"#6366f1","desen":"yildiz","ad":"Galaksi Koruyucusu pantolon","sv":"efsane","legendary":true,"f":16000},{"id":"a:bot:#22d3ee:yildiz","kat":"ayak","tip":"bot","renk":"#22d3ee","desen":"yildiz","ad":"Galaksi Koruyucusu bot","sv":"efsane","legendary":true,"f":8000}],"f":36000},{"id":"k:efsane-ejderha","ikon":"👑","ad":"Zümrüt Ejderha seti","sv":"efsane","legendary":true,"parca":[{"id":"u:kahraman:#059669:ejderha","kat":"ust","tip":"kahraman","renk":"#059669","desen":"ejderha","ad":"Zümrüt Ejderha pelerinli üst","sv":"efsane","legendary":true,"f":28000},{"id":"a:pantolon:#059669:yildiz","kat":"alt","tip":"pantolon","renk":"#059669","desen":"yildiz","ad":"Zümrüt Ejderha pantolon","sv":"efsane","legendary":true,"f":20000},{"id":"a:bot:#a3e635:yildiz","kat":"ayak","tip":"bot","renk":"#a3e635","desen":"yildiz","ad":"Zümrüt Ejderha bot","sv":"efsane","legendary":true,"f":8000}],"f":42000}]);
  const uygun = o => DijiProgressionCatalog.compatible(o,kk()?.cins||'e');

  /* ================= ÇİZİM =================
     Büst (200×200) avatarSVG'nin içinden çağrılır; tam boy (200×390) sadece Dolap'ta. */
  const ESKI_RENK = { 'tisort-mor': '#a06bff', 'tisort-mavi': '#4d96ff', 'tisort-yesil': '#34b36a', forma: '#f8fafc', kazak: '#ff8a3d', esofman: '#0ea5e9', buyucu: '#6d28d9', kahraman: '#2563eb', astronot: '#f1f5f9' };
  function parcala(kod) { let p = String(kod || '').split(':'); return { kat: p[0], tip: p[1], renk: p[2] || '#a78bfa', desen: p[3] || 'duz' }; }
  function desenCiz(desen, renk, x1, y1, x2, y2) {
    let a = '', beyaz = renkA(renk, .75), koyuR = renkK(renk, .3);
    if (desen === 'cizgi') for (let y = y1 + 6; y < y2; y += 13) a += `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="5" fill="${beyaz}" opacity=".7"/>`;
    if (desen === 'puantiye') for (let y = y1 + 7, r = 0; y < y2; y += 12, r++) for (let x = x1 + (r % 2 ? 12 : 6); x < x2; x += 12) a += `<circle cx="${x}" cy="${y}" r="2.2" fill="${beyaz}"/>`;
    if (desen === 'ekose') { for (let y = y1 + 8; y < y2; y += 14) a += `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="3" fill="${koyuR}" opacity=".45"/>`; for (let x = x1 + 8; x < x2; x += 14) a += `<rect x="${x}" y="${y1}" width="3" height="${y2 - y1}" fill="${koyuR}" opacity=".45"/>`; }
    if (desen === 'cicek') for (let y = y1 + 10, r = 0; y < y2; y += 18, r++) for (let x = x1 + (r % 2 ? 18 : 9); x < x2; x += 18) a += `<circle cx="${x}" cy="${y}" r="3.2" fill="${beyaz}"/><circle cx="${x}" cy="${y}" r="1.4" fill="#fde047"/>`;
    if (desen === 'yildiz') for (let y = y1 + 9, r = 0; y < y2; y += 16, r++) for (let x = x1 + (r % 2 ? 16 : 8); x < x2; x += 16) a += `<text x="${x - 4}" y="${y + 3}" font-size="8" fill="#fde68a">✦</text>`;
    return a;
  }
  /* Üst / tek parça (büst gövdesi) */
  window.dolapUstCiz = function (kod, h) {
    let o = parcala(kod), r = o.renk, k = renkK(r, .25), ay = '', pel = '';
    if (o.tip === 'tisort' || o.tip === 'elbise') ay = `<path d="M88 149 Q100 162 112 149" fill="none" stroke="${k}" stroke-width="3"/>`;
    if (o.tip === 'gomlek') ay = h.P('M86 150 L100 162 L94 171 L81 157 Z', renkA(r, .45)) + h.P('M114 150 L100 162 L106 171 L119 157 Z', renkA(r, .45)) + [172, 184, 196].map(y => `<circle cx="100" cy="${y}" r="2.3" fill="${k}"/>`).join('');
    if (o.tip === 'kazak') ay = `<rect x="84" y="138" width="32" height="16" rx="7" fill="${k}"/>` + [90, 96, 102, 108].map(x => `<line x1="${x}" y1="140" x2="${x}" y2="152" stroke="${renkA(r, .3)}" stroke-width="1.5"/>`).join('');
    if (o.tip === 'tunik' || o.tip === 'ferace') ay = `<path d="M86 149 Q100 166 114 149" fill="none" stroke="${k}" stroke-width="3"/>` + (o.tip === 'ferace' ? `<line x1="100" y1="164" x2="100" y2="200" stroke="${k}" stroke-width="2.5"/>` : [80, 90, 100, 110, 120].map(x => `<circle cx="${x}" cy="${162 + Math.abs(100 - x) * .15}" r="1.8" fill="#fde68a"/>`).join(''));
    if (o.tip === 'sweat') { pel = h.P('M58 152 C54 120 146 120 142 152 Z', renkK(r, .12)); ay = `<path d="M88 150 L92 172 M112 150 L108 172" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><rect x="78" y="182" width="44" height="16" rx="6" fill="${renkK(r, .1)}"/>`; }
    if (o.tip === 'bluz') ay = [84, 90, 96, 102, 108, 114].map((x, i) => `<circle cx="${x + 2}" cy="${151 + (i === 0 || i === 5 ? 0 : 5)}" r="4.5" fill="${renkA(r, .6)}"/>`).join('');
    if (o.tip === 'tulum') ay = `<rect x="70" y="150" width="12" height="50" fill="${k}"/><rect x="118" y="150" width="12" height="50" fill="${k}"/><rect x="74" y="172" width="52" height="30" rx="5" fill="${renkK(r, .12)}"/><circle cx="76" cy="176" r="3" fill="#fde68a"/><circle cx="124" cy="176" r="3" fill="#fde68a"/>`;
    if(o.tip==='kahraman'){
      pel=h.P('M48 158 L30 200 L170 200 L152 158 Z',renkK(r,.35));
      const emblem=o.desen==='kristal'?'<path d="M100 164 L112 178 L100 194 L88 178 Z" fill="#a5f3fc" stroke="#fff" stroke-width="2"/>':o.desen==='firtina'?'<path d="M105 164 L90 182 H100 L95 194 L112 174 H102 Z" fill="#fde047" stroke="#fff" stroke-width="1.5"/>':'<path d="M100 190 C72 182 78 166 97 174 L100 181 L103 174 C122 166 128 182 100 190 Z" fill="#fde68a" stroke="#fff" stroke-width="1.5"/>';
      const legendSymbols={"anka":"<path d=\"M100 130 C66 122 49 94 50 70 L81 91 L90 53 L100 35 L110 53 L119 91 L150 70 C151 94 134 122 100 130 Z\" fill=\"#ffe08a\" stroke=\"#fff\" stroke-width=\"3\"/><path d=\"M100 112 L100 137 M83 122 L76 139 M117 122 L124 139\" stroke=\"#ff9b45\" stroke-width=\"6\" stroke-linecap=\"round\"/>","galaksi":"<path d=\"M100 64 L110 90 L138 91 L116 108 L124 134 L100 118 L76 134 L84 108 L62 91 L90 90 Z\" fill=\"#a5f3fc\" stroke=\"#fff\" stroke-width=\"3\"/><ellipse cx=\"100\" cy=\"101\" rx=\"48\" ry=\"14\" transform=\"rotate(-25 100 101)\" fill=\"none\" stroke=\"#fde68a\" stroke-width=\"4\"/>","ejderha":"<path d=\"M66 73 L69 42 L89 66 L107 56 L126 37 L126 73 L146 94 L130 129 L100 143 L71 125 L55 96 Z\" fill=\"#bef264\" stroke=\"#fff\" stroke-width=\"3\"/><path d=\"M72 94 L88 102 M128 94 L112 102 M87 124 Q100 130 113 124\" stroke=\"#166534\" stroke-width=\"5\" stroke-linecap=\"round\"/>"};
      const heroMark=legendSymbols[o.desen]?'<g transform="translate(78 158) scale(.22)">'+legendSymbols[o.desen]+'</g>':emblem;
      ay=heroMark+'<path d="M76 156 L88 160 M112 160 L124 156" stroke="#fff" stroke-width="3"/>';
    }
    if (o.tip === 'yoresel') ay = h.P('M34 200 C36 172 56 156 84 150 L90 200 Z', '#1e1b4b') + h.P('M166 200 C164 172 144 156 116 150 L110 200 Z', '#1e1b4b') + [[60, 176], [70, 190], [56, 192], [140, 176], [130, 190], [144, 192]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fbbf24"/>`).join('') + `<path d="M88 149 Q100 160 112 149" fill="none" stroke="#fbbf24" stroke-width="2.5"/>`;
    return { renk: r, ayrinti: desenCiz(o.desen, r, 34, 150, 166, 200) + ay, pelerin: pel };
  };
  /* Dış giyim (büstte açık önlü panel) */
  window.dolapDisCiz = function (kod, h) {
    let o = parcala(kod), r = o.renk, k = renkK(r, .25);
    if (o.tip === 'onluk') r = '#ffffff';
    let sol = h.P('M34 200 C34 170 52 153 84 149 L92 200 Z', r), sag = h.P('M166 200 C166 170 148 153 116 149 L108 200 Z', r), ek = '';
    if (o.tip === 'ceket' || o.tip === 'onluk') ek = h.P('M84 149 L94 170 L88 176 L80 158 Z', k) + h.P('M116 149 L106 170 L112 176 L120 158 Z', k);
    if (o.tip === 'hirka') ek = [168, 180, 192].map(y => `<circle cx="95" cy="${y}" r="2.2" fill="${k}"/>`).join('');
    if (o.tip === 'mont' || o.tip === 'itfaiye') ek = [168, 184].map(y => `<path d="M34 ${y} L92 ${y} M108 ${y} L166 ${y}" stroke="${k}" stroke-width="2" opacity=".6"/>`).join('');
    if (o.tip === 'itfaiye') ek += `<rect x="34" y="186" width="58" height="6" fill="#fde047"/><rect x="108" y="186" width="58" height="6" fill="#fde047"/>`;
    if (o.tip === 'yagmurluk') ek = [170, 186].map(y => `<rect x="86" y="${y}" width="10" height="4" rx="2" fill="${k}"/>`).join('');
    if (o.tip === 'onluk') ek += `<rect x="46" y="178" width="18" height="12" rx="2" fill="none" stroke="#cbd5e1" stroke-width="2"/><text x="130" y="186" font-size="12">➕</text>`;
    return sol + sag + ek;
  };
  /* Başörtüsü: saç ve şapka gizlenir, yüz açık kalır */
  window.dolapBasCiz = function (kod, h) {
    let o = parcala(kod), r = o.renk, k = renkK(r, .18), cer = '', arka = '';
    let dis = 'M100 34 C152 34 164 76 162 108 C160 134 150 148 134 154 L66 154 C50 148 40 134 38 108 C36 76 48 34 100 34 Z';
    let yuzDelik = 'M62 98 A38 43 0 1 0 138 98 A38 43 0 1 0 62 98 Z';
    if (o.tip === 'spor') { dis = 'M100 38 C148 38 158 76 156 106 C154 130 146 144 132 150 L68 150 C54 144 46 130 44 106 C42 76 52 38 100 38 Z'; arka = h.P('M62 132 C60 154 72 164 100 166 C128 164 140 154 138 132 Z', r); }
    else if (o.tip === 'sal') arka = h.P('M40 116 C32 168 50 186 28 200 L172 200 C150 186 168 168 160 116 Z', r) + [40, 58, 142, 160].map(x => `<line x1="${x}" y1="196" x2="${x}" y2="200" stroke="${k}" stroke-width="2"/>`).join('');
    else arka = h.P('M44 118 C40 158 56 176 40 200 L160 200 C144 176 160 158 156 118 Z', r);
    cer = `<path d="${dis} ${yuzDelik}" fill="${h.D(r)}" fill-rule="evenodd"${h.S}/>`;
    if (o.tip === 'bone') cer += `<path d="M64 66 C76 54 124 54 136 66 L133 74 C120 63 80 63 67 74 Z" fill="${renkA(r, .55)}"/>`;
    cer += `<path d="M62 96 C62 72 80 55 100 55 C120 55 138 72 138 96" fill="none" stroke="${k}" stroke-width="2" opacity=".5"/>`;
    if (o.desen !== 'duz') { let noktalar = [[56, 70], [144, 70], [48, 110], [152, 110], [70, 44], [130, 44], [100, 40], [60, 140], [140, 140]];
      cer += noktalar.map(([x, y]) => o.desen === 'yildiz' ? `<text x="${x - 4}" y="${y + 3}" font-size="9" fill="#fde68a">✦</text>` : o.desen === 'cicek' ? `<circle cx="${x}" cy="${y}" r="3.5" fill="${renkA(r, .75)}"/><circle cx="${x}" cy="${y}" r="1.5" fill="#fde047"/>` : `<circle cx="${x}" cy="${y}" r="2.6" fill="${renkA(r, .75)}"/>`).join(''); }
    return { arka, on: cer, sacGizle: true, sapkaGizle: true };
  };

  function ustRenk(s) {
    if (s.tek) return parcala(s.tek).renk;
    if (s.ust) return parcala(s.ust).renk;
    return ESKI_RENK[s.kiyafet] || '#a06bff';
  }
  /* Tam boy: alt vücut, kollar, alt giyim, ayakkabı + büst */
  window.dolapTamBoySVG = function (s, cins, px) {
    s = Object.assign({}, s);
    let ten = '#f1c7a5'; try { ten = window.KA_TEN[Number(s.ten) || 0][0]; } catch (e) {}
    let ust = ustRenk(s), tek = s.tek ? parcala(s.tek) : null;
    let alt = tek ? null : parcala(s.alt || 'a:pantolon:#1e3a8a:duz');           /* çıplak kalmaz: varsayılan lacivert pantolon */
    let ayak = parcala(s.ayak || 'y:spor:#ffffff:duz'), dis = s.dis ? parcala(s.dis) : null, aks = s.aks ? parcala(s.aks) : null;
    let govdeBas = (typeof window.avatarSVG === 'function' && window.avatarSVG(Object.assign({}, s, { _tamBoy: true }), 'c', 200, cins)) || { defs: '', ic: '' };
    let kolRenk = dis ? (dis.tip === 'onluk' ? '#ffffff' : dis.tip === 'yelek' ? ust : dis.renk) : ust;
    let out = '';
    if(s.ust&&parcala(s.ust).tip==='kahraman'){const cape=renkK(ust,.35);out+='<path d="M56 156 L28 338 Q100 364 172 338 L144 156 Z" fill="'+cape+'"/><path d="M43 325 Q100 345 157 325" fill="none" stroke="#ffffff55" stroke-width="3"/>';}
    /* bacaklar (etek/elbise altında her zaman tayt) */
    let bacakRenk = alt && ['pantolon', 'kot', 'esofman'].includes(alt.tip) ? alt.renk : '#475569';
    out += `<rect x="70" y="290" width="26" height="72" rx="10" fill="${bacakRenk}"/><rect x="104" y="290" width="26" height="72" rx="10" fill="${bacakRenk}"/>`;
    /* ayakkabı */
    let aR = ayak.renk, aK = renkK(aR, .3);
    if (ayak.tip === 'bot') out += `<rect x="66" y="344" width="32" height="26" rx="8" fill="${aR}"/><rect x="102" y="344" width="32" height="26" rx="8" fill="${aR}"/>`;
    out += `<ellipse cx="80" cy="370" rx="20" ry="9" fill="${aR}"/><ellipse cx="120" cy="370" rx="20" ry="9" fill="${aR}"/><path d="M60 372 H100 M100 372 H140" stroke="${aK}" stroke-width="3"/>`;
    if (ayak.tip === 'sandalet') out += `<path d="M68 364 H92 M108 364 H132" stroke="${aK}" stroke-width="3"/>`;
    if (ayak.tip === 'spor') out += `<path d="M72 366 L88 366 M112 366 L128 366" stroke="${aK}" stroke-width="2"/>`;
    if (ayak.desen === 'yildiz') out += `<text x="74" y="364" font-size="9" fill="#fde68a">✦</text><text x="114" y="364" font-size="9" fill="#fde68a">✦</text>`;
    /* gövdenin alt kısmı */
    let etekBoy = tek ? (tek.tip === 'tulum' ? 0 : 358) : 0;
    out += `<path d="M38 196 L162 196 L158 296 L42 296 Z" fill="${ust}"/>`;
    if (!tek && s.ust) out += `<g>${desenCiz(parcala(s.ust).desen, ust, 42, 198, 158, 294)}</g>`;
    /* alt giyim */
    if (tek) {
      if (tek.tip === 'tulum') out += `<rect x="42" y="236" width="116" height="60" fill="${tek.renk}"/><rect x="70" y="290" width="26" height="62" rx="8" fill="${tek.renk}"/><rect x="104" y="290" width="26" height="62" rx="8" fill="${tek.renk}"/><rect x="74" y="240" width="52" height="22" rx="4" fill="${renkK(tek.renk, .12)}"/>`;
      else { out += `<path d="M42 240 L158 240 L${tek.tip === 'ferace' ? 170 : 172} ${etekBoy} L${tek.tip === 'ferace' ? 30 : 28} ${etekBoy} Z" fill="${tek.renk}"/>` + desenCiz(tek.desen, tek.renk, 40, 196, 160, etekBoy - 4);
        if (tek.tip === 'ferace') out += `<line x1="100" y1="196" x2="100" y2="${etekBoy}" stroke="${renkK(tek.renk, .3)}" stroke-width="2.5"/><rect x="42" y="238" width="116" height="7" fill="${renkK(tek.renk, .2)}"/>`;
        else out += `<rect x="46" y="236" width="108" height="7" rx="3" fill="${renkA(tek.renk, .4)}"/>`; }
    } else {
      let r = alt.renk, k = renkK(r, .25);
      out += `<rect x="42" y="280" width="116" height="16" rx="4" fill="${r}"/>`;
      if (alt.tip === 'uzunetek') out += `<path d="M42 286 L158 286 L170 356 L30 356 Z" fill="${r}"/>`;
      if (alt.tip === 'pileli') { out += `<path d="M42 286 L158 286 L168 334 L32 334 Z" fill="${r}"/>`; for (let x = 48; x < 160; x += 14) out += `<line x1="${x}" y1="290" x2="${x - 4 + (x - 100) * .1}" y2="334" stroke="${k}" stroke-width="2"/>`; }
      if (alt.tip === 'klos') out += `<path d="M42 286 L158 286 C178 320 180 336 174 344 L26 344 C20 336 22 320 42 286 Z" fill="${r}"/>` + desenCiz(alt.desen, r, 34, 290, 166, 340);
      if (['pantolon', 'kot', 'esofman'].includes(alt.tip)) { out += `<rect x="66" y="286" width="32" height="70" rx="8" fill="${r}"/><rect x="102" y="286" width="32" height="70" rx="8" fill="${r}"/>`;
        if (alt.tip === 'kot') out += `<path d="M82 292 V352 M118 292 V352" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3 3"/>`;
        if (alt.tip === 'esofman') out += `<path d="M68 292 V354 M132 292 V354" stroke="#fff" stroke-width="3"/>`; }
    }
    /* dış giyim (gövdede uzar) */
    if (dis && dis.tip !== 'yelek') { let boy = ['yagmurluk', 'mont', 'itfaiye', 'onluk'].includes(dis.tip) ? 318 : 292, r = dis.tip === 'onluk' ? '#ffffff' : dis.renk;
      out += `<path d="M38 196 L90 196 L90 ${boy} L36 ${boy} Z" fill="${r}"/><path d="M162 196 L110 196 L110 ${boy} L164 ${boy} Z" fill="${r}"/>`;
      if (dis.tip === 'itfaiye') out += `<rect x="36" y="272" width="54" height="7" fill="#fde047"/><rect x="110" y="272" width="54" height="7" fill="#fde047"/>`; }
    if (dis && dis.tip === 'yelek') out += `<path d="M42 196 L90 196 L90 280 L44 280 Z" fill="${dis.renk}"/><path d="M158 196 L110 196 L110 280 L156 280 Z" fill="${dis.renk}"/>`;
    const posed=window.dmCharacterPoses?.has(s.durus);
    /* kollar */
    if(!posed)out += `<path d="M36 186 C22 200 20 250 26 288 L44 288 C44 250 46 214 54 196 Z" fill="${kolRenk}"/><path d="M164 186 C178 200 180 250 174 288 L156 288 C156 250 154 214 146 196 Z" fill="${kolRenk}"/>`;
    if(!posed)out += `<circle cx="35" cy="296" r="10" fill="${ten}"/><circle cx="165" cy="296" r="10" fill="${ten}"/>`;
    /* aksesuar */
    if (aks && aks.tip === 'canta') out += `<path d="M58 196 L150 290" stroke="${renkK(aks.renk, .25)}" stroke-width="6"/><rect x="138" y="270" width="34" height="38" rx="9" fill="${aks.renk}"/><rect x="144" y="284" width="22" height="12" rx="4" fill="${renkK(aks.renk, .15)}"/>`;
    if (!posed && aks && aks.tip === 'saat') out += `<rect x="25" y="280" width="20" height="8" rx="3" fill="${aks.renk}"/><circle cx="35" cy="284" r="5" fill="#fff" stroke="${aks.renk}" stroke-width="2"/>`;
    /* açık renkli kıyafetler (beyaz önlük gibi) zeminde kaybolmasın: ince kontur */
    out = out.replace(/<(path|rect|ellipse) (?![^>]*stroke=)/g, '<$1 stroke="rgba(30,27,75,.2)" stroke-width="1.4" ');
    /* büst (baş, yüz, omuz) */
    out = `<g transform="translate(100 0) scale(${{ince:.85,normal:1,genis:1.05}[s.govdeTip]||1} 1) translate(-100 0)">${out}</g>` + govdeBas.ic;
    if(posed)out += `<g transform="translate(100 0) scale(${{ince:.85,normal:1,genis:1.05}[s.govdeTip]||1} 1) translate(-100 0)">${window.dmCharacterPoses.arms(s,kolRenk,ten,aks?.tip==='saat'?aks.renk:null)}</g>`;
    if (aks && aks.tip === 'atki') out += `<path d="M70 146 C80 158 120 158 130 146 L134 158 C120 170 80 170 66 158 Z" fill="${aks.renk}"/><rect x="110" y="160" width="14" height="40" rx="4" fill="${aks.renk}"/>`;
    if (aks && aks.tip === 'rozet') out += `<circle cx="128" cy="210" r="10" fill="${aks.renk}" stroke="#fff" stroke-width="2"/><text x="121" y="215" font-size="12">${aks.renk === '#f472b6' ? '💗' : '⭐'}</text>`;
    let cik = s.cik ? String(s.cik).replace(/^c:/, '') : '';
    if (cik) out += `<circle cx="170" cy="36" r="22" fill="#fff" stroke="#e4dafc" stroke-width="3"/><text x="170" y="45" font-size="24" text-anchor="middle">${cik}</text>`;
    return `<svg viewBox="${posed?'-25 0 250 390':'0 0 200 390'}" width="${Math.round(px * (posed?250:200) / 390)}" height="${px}" role="img" aria-label="Karakterin tam boy"><defs>${govdeBas.defs}</defs>${window.dmCharacterBuilder?.poseOpen(s,390)||''}${out}${window.dmCharacterBuilder?'</g>':''}</svg>`;
  };

  /* ================= DURUM ================= */
  const kk = () => (yoVar() && yo.karakter && yo.karakter.cins) ? yo.karakter : null;
  const ATOLYE = { sac: ['sac', 'sacRenk'], yuz: ['ten', 'goz', 'agiz', 'detay'], sapka: ['sapka', 'gozluk'], dost: ['dost', 'arka', 'cerceve'], klasik: ['kiyafet'] };
  const KATALOG_ = () => window.KA_KATALOG || {};
  /* Atölye öğesi kimliği: "a|kat|id" (sahiplik Atölye ile aynı: "kat:id") */
  function atolyeOgeleri(grup) {
    let K = KATALOG_(), cins = kk() ? kk().cins : 'k', out = [];
    (ATOLYE[grup] || []).forEach(kat => { let k = K[kat]; if (!k) return;
      out.push({ baslik: `${k.ikon} ${k.ad}`, liste: k.liste.filter(x => !x.c || x.c === cins).map(x => ({ id: `a|${kat}|${x.id}`, atolye: true, kat, itemId: x.id, ad: x.ad, f: x.f || 0, sv: x.dmTier || 'temel' })) }); });
    return out;
  }
  function ogeBul(id) {
    if (OGE_ID[id]) return OGE_ID[id];
    if (String(id).startsWith('a|')) { let [, kat, itemId] = id.split('|'), k = KATALOG_()[kat], x = k && k.liste.find(y => y.id === itemId); if (x) return { id, atolye: true, kat, itemId, ad: x.ad, f: x.f || 0, sv: x.dmTier || 'temel' }; }
    return KOMBIN.find(x => x.id === id) || null;
  }
  const sahip = id => { let k = kk(); if (!k) return false; let o = ogeBul(id); if (o && o.atolye) return o.f === 0 || (k.sahip || []).includes(o.kat + ':' + o.itemId); return (k.sahip || []).includes('d:' + id); };
  function sahiplen(id) { let k = kk(); k.sahip = k.sahip || []; let o = ogeBul(id), anahtar = o && o.atolye ? o.kat + ':' + o.itemId : 'd:' + id; if (!k.sahip.includes(anahtar)) k.sahip.push(anahtar); }
  function giyiliMi(o, s) { s = s || (kk() && kk().s) || {}; if (o.atolye) return o.kat === 'kiyafet' ? (s.kiyafet === o.itemId && !s.ust && !s.tek) : s[o.kat] === o.itemId; return s[o.kat] === o.id; }
  function giy(s, o) {
    if (o.atolye) { s[o.kat] = o.itemId; if (o.kat === 'kiyafet') { s.ust = ''; s.tek = ''; } return; }
    s[o.kat] = o.id;
    if (o.kat === 'ust' || o.kat === 'alt') s.tek = '';
  }
  function cikar(s, kat) { s[kat] = ''; }
  const bugun = () => (typeof yoBugun === 'function' ? yoBugun() : new Date().toISOString().slice(0, 10));
  function vitrinOgesi() {
    let aday = OGE.filter(o => uygun(o) && o.sv !== 'temel' && !sahip(o.id)); if (!aday.length) return null;
    let h = 0; for (const c of bugun() + (typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return aday[h % aday.length];
  }
  function fiyatHesapla(o, kombinMi) {
    let f = o.f, notlar = [];
    if (yoVar() && f > 0) {
      yo.dolapIlkAlim = yo.dolapIlkAlim || {};
      let kat = kombinMi ? 'kombin' : (o.atolye ? 'a-' + o.kat : o.kat);
      const first = !yo.dolapIlkIndirimKullanildi && !Object.keys(yo.dolapIlkAlim).length;
      const v = vitrinOgesi(), showcase = !kombinMi && v && v.id === o.id;
      f = DijiProgressRules.discount(f, {first, showcase});
      if (first) notlar.push('İlk alışveriş %25');
      else if (showcase) notlar.push('Günün vitrini %30');
    }
    return { f, not: notlar.join(' · ') };
  }
  function hosGeldinUygun() {
    return false;
    if (!yo.dolapIlkGun) { yo.dolapIlkGun = bugun(); if (typeof yoKaydet === 'function') yoKaydet(); }
    return (Date.parse(bugun()) - Date.parse(yo.dolapIlkGun)) / 86400000 <= 7 && !yo.dolapHosGeldin;
  }

  /* Storefront uses the same wardrobe catalog, discounts and server purchase. */
  window.dmStoreWardrobe = {
    ready: () => !!kk(),
    gender: () => kk()?.cins||'',
    changeGender: async c => {
      if(!['k','e'].includes(c)||!kk()||kk().cins===c)return;
      const previous=JSON.parse(JSON.stringify(kk())),profile=yo.profilKrk;
      const next=Object.assign({},window.KA_VARSAYILAN[c],previous.s);
      const hair=KATALOG_().sac?.liste.find(x=>x.id===next.sac);
      if(hair?.c&&hair.c!==c)next.sac=window.KA_VARSAYILAN[c].sac;
      for(const kat of ['bas','ust','alt','tek','dis','ayak','aks','cik']){const item=ogeBul(next[kat]);if(item&&!DijiProgressionCatalog.compatible(item,c))next[kat]='';}
      yo.karakter={...previous,cins:c,s:next};yo.profilKrk='';
      try{await window.dmProgression.sync();window.yoKaydet?.();window.yoAvatarUygula?.();D=null;if($('magazaAlan')?.querySelector('.dl-gomulu'))ac($('magazaAlan'));window.dmStoreFront?.refresh();toast('✓ Karakter seçimin kaydedildi. Aldığın ürünler dolabında korunuyor.');}
      catch(e){yo.karakter=previous;yo.profilKrk=profile;throw e;}
    },
    character: (px = 220) => {
      if (!kk()) return '';
      if (yo.profilKrk && typeof window.karakterSvg === 'function') return window.karakterSvg(aktifOgrenciAdi, px);
      return dolapTamBoySVG(Object.assign({}, window.KA_VARSAYILAN[kk().cins], kk().s), kk().cins, px);
    },
    preview: (id, px = 150) => {
      const o = ogeBul(id); if (!o || !kk()) return '';
      const s = Object.assign({}, window.KA_VARSAYILAN[kk().cins], kk().s);
      if(!uygun(o))return '';
      (o.parca || [o]).forEach(p => giy(s, p));
      return dolapTamBoySVG(s, kk().cins, px);
    },
    art: id => { const o=ogeBul(id); return window.dmBoutiqueArt?.(o)||window.dmStoreWardrobe.preview(id,170); },
    parts: id => { const o = ogeBul(id); return (o?.parca || (o ? [o] : [])).slice(0, 3).map(p => ({id:p.id, category:p.kat, color:p.renk || '#9b64ef', tip:p.tip || p.kat, emoji:p.emoji || '', preview:window.dmBoutiqueArt?.(p)||window.dmStoreWardrobe.preview(p.id,90), name:p.ad})); },
    offers: () => {
      if (!kk()) return [];
      const allowed = o => !!window.dmProgression?.itemAllowed(o, true);
      let h = 0; for (const ch of bugun() + aktifOgrenciAdi) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const compatibleCombos=KOMBIN.filter(uygun);
      const combos = compatibleCombos.filter(o => allowed(o) && !o.parca.every(p => sahip(p.id)));
      const combo = (combos.length ? combos : compatibleCombos)[h % (combos.length || compatibleCombos.length)];
      let daily = vitrinOgesi();
      const alternatives = OGE.filter(o => uygun(o) && allowed(o) && !sahip(o.id));
      if (!daily || !allowed(daily)) daily = alternatives[h % (alternatives.length || 1)] || OGE.find(o=>uygun(o)&&allowed(o)) || OGE.find(uygun);
      return [combo, daily].filter(Boolean).map((o, i) => ({
        id: o.id, name: o.ad, title: i === 0 ? 'Sana özel kombin' : 'Günün fırsatı',
        price: fiyatHesapla(o, !!o.parca).f, note: fiyatHesapla(o, !!o.parca).not,
        level: DijiProgressionCatalog.itemLevel(o), allowed: allowed(o),
        owned: o.parca ? o.parca.every(p => sahip(p.id)) : sahip(o.id),
        equipped: o.parca ? o.parca.every(p => giyiliMi(p)) : giyiliMi(o),
        count: o.parca ? o.parca.length : 1
      }));
    },
    buy: async id => {
      const o = ogeBul(id); if (!o || !kk()) throw Error('Önce karakterini oluşturmalısın.');if(!uygun(o))throw Error('Bu ürün diğer karakter seçimine ait.');
      if (!window.dmProgression?.itemAllowed(o)) return false;
      const has = o.parca ? o.parca.every(p => sahip(p.id)) : sahip(o.id);
      if (has) {
        (o.parca || [o]).forEach(p => giy(kk().s, p)); yo.profilKrk = '';
        window.yoKaydet?.(); window.yoAvatarUygula?.(); toast('✓ Görünümün kaydedildi!'); return true;
      }
      if (Number(yo.altin || 0) < fiyatHesapla(o, !!o.parca).f) {window.DijiReklam?.altinEksik({tip:'kiyafet',id:o.id});throw Error('Bu ürün için yeterli altının yok.');}
      await window.dmProgression.sync();
      const r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'seviyeUrunAl', ogrenci: aktifOgrenciAdi, t: localStorage.getItem('ing_token') || '', item: o.id }) });
      const result = await r.json(); if (!r.ok || !result.ok) throw Error(result.mesaj || 'Satın alma tamamlanamadı.');
      Object.assign(yo, result.yo); window.yoAvatarUygula?.(); window.dmProgression.refresh(true);
      toast(`🎉 ${o.ad} artık senin!`); return true;
    }
  };

  /* ================= ARAYÜZ (Mağaza'daki Atölye alanına gömülü) ================= */
  let D = null;
  function ac(hedef) {
    if (!yoVar()) { toast('Önce giriş yapmalısın.'); return; }
    if(!window.dmProgression?.require('magaza')) return;
    if (!hedef) { if (typeof magazaAc === 'function') magazaAc(); return; }   /* tek yer: Mağaza */
    if (!kk()) { eskiAtolye && eskiAtolye(); return; }                          /* önce kız/erkek seçimi */
    if (!D || D.hedef !== hedef) D = { sekme: 'vitrin', deneme: Object.assign({}, kk().s), secili: null, hedef };
    hedef.innerHTML = `<div class="dl-gomulu">
      <div class="dl-ust"><h2>🎨 Karakter & Giyim</h2><span class="dl-altin" id="dlAltin"></span></div>
      <button type="button" class="dl-sahne-btn" onclick="window.dmCharacterBuilder.open()">🎨 Karakterimi tasarla</button>
      <div class="dl-gender" role="group" aria-label="Karakter seçimi"><button type="button" data-gender="k" aria-pressed="${kk().cins==='k'}">Kız karakter</button><button type="button" data-gender="e" aria-pressed="${kk().cins==='e'}">Erkek karakter</button><small>Aldığın ürünler korunur.</small></div>
      <div class="dl-ana"><div class="dl-sahne"><div class="dl-onizleme" id="dlOnizleme"></div><div class="dl-dugmeler"><button class="dl-sahne-btn geri" id="dlGeriAl">↺ Denemeyi bırak</button></div></div>
      <div class="dl-sag"><div class="dl-sekmeler" id="dlSekmeler" role="tablist"></div><div class="dl-izgara" id="dlIzgara"></div><div class="dl-eylem" id="dlEylem" style="display:none"></div></div></div></div>`;
    hedef.querySelectorAll('[data-gender]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await window.dmStoreWardrobe.changeGender(b.dataset.gender);}catch(e){toast(e.message);b.disabled=false;}});
    $('dlGeriAl').onclick = () => { D.deneme = Object.assign({}, kk().s); D.secili = null; ciz(); };
    ciz();
  }
  function kaydet(mesaj) {
    let s = D.deneme, gercek = kk().s;
    /* sadece sahip olunanlar kalıcı olur */
    ['bas', 'ust', 'alt', 'tek', 'dis', 'ayak', 'aks', 'cik'].forEach(k => { if (s[k] && !sahip(s[k])) s[k] = gercek[k] || ''; });
    Object.keys(ATOLYE).forEach(g => ATOLYE[g].forEach(kat => { if (s[kat] && !sahip(`a|${kat}|${s[kat]}`)) s[kat] = gercek[kat]; }));
    Object.assign(gercek, s); delete gercek._tamBoy;
    /* profil resmi giydirilen karakter olsun (koleksiyon karakteri seçiliyse ona dönülmez, Profil'den yeniden seçilebilir) */
    let profilDegisti = false;
    if (yo.profilKrk) { yo.profilKrk = ''; profilDegisti = true; }
    if (typeof yoKaydet === 'function') yoKaydet();
    if (typeof yoAvatarUygula === 'function') yoAvatarUygula();
    if (mesaj !== false) toast(mesaj || (profilDegisti ? '✓ Kaydedildi. Profil resmin artık giydirdiğin karakterin!' : '✓ Görünümün kaydedildi!'));
    D.deneme = Object.assign({}, gercek);
    ciz();
  }
  function onizle() { $('dlOnizleme').innerHTML = dolapTamBoySVG(D.deneme, kk().cins, 300); $('dlAltin').innerText = `🪙 ${yo.altin || 0}`; }
  const SEKMELER = [['vitrin', '⭐ Vitrin'], ['efsane40', '👑 Efsane Vitrini'], ['sac', '💇 Saç'], ['bas', '🧕 Başörtüsü'], ['ust', '👕 Üst'], ['alt', '👖 Alt'], ['tek', '👗 Tek parça'], ['dis', '🧥 Dış'], ['ayak', '👟 Ayak'],
    ['sapka', '🎩 Şapka · gözlük'], ['aks', '🎒 Aksesuar'], ['yuz', '🙂 Yüz'], ['dost', '🐾 Dost · arka plan'], ['kombin', '🧥 Kombinler'], ['cik', '🏷️ Çıkartma'], ['sandik', '🎁 Sandıklar']];
  function ikonHtml(o) {
    const art = window.dmBoutiqueArt?.(o); if(art) return art;
    if (o.parca) return window.dmStoreWardrobe.preview(o.id,150);
    if (o.kat === 'cik') return `<span style="font-size:28px;line-height:1.2">${o.emoji}</span>`;
    if (o.atolye) { try { let V = window.KA_VARSAYILAN[kk().cins], s = Object.assign({}, V, D.deneme, { [o.kat]: o.itemId, bas: '' }); if (o.kat === 'kiyafet') { s.ust = ''; s.tek = ''; } return `<span class="mini">${window.avatarSVG(s, 'c', 100, kk().cins)}</span>`; } catch (e) { return '<span class="mini">🎨</span>'; } }
    return window.dmStoreWardrobe.preview(o.id,88);
  }
  function ogeKart(o) {
    let kombinMi = !!o.parca, has = kombinMi ? o.parca.every(p => sahip(p.id)) : sahip(o.id), fh = fiyatHesapla(o, kombinMi);
    if(!window.dmProgression?.itemAllowed(o,true)) return `<button type="button" class="dl-oge dm-level-locked" data-id="${kac(o.id)}">${ikonHtml(o)}<span class="ad">${kac(o.ad)}</span><span class="fiyat">🔒 Seviye ${DijiProgressionCatalog.itemLevel(o)} · ${Number(fh.f).toLocaleString('tr-TR')} 🪙</span></button>`;
    let giyili = !kombinMi && giyiliMi(o, D.deneme);
    let etiket = o.f === 0 ? 'Ücretsiz' : has ? '✓ Sende' : (fh.f < o.f ? `<s style="opacity:.6">${o.f}</s> ` : '') + fh.f + ' 🪙';
    return `<button type="button" class="dl-oge${D.secili && D.secili.id === o.id ? ' secili' : ''}${giyili ? ' giyili' : ''}" data-id="${kac(o.id)}" aria-label="${kac(o.ad)}${has || o.f === 0 ? ', sende var' : ', ' + fh.f + ' altın'}">
      ${o.f > 0 ? `<span class="seviye sv-${o.sv}">${o.sv === 'efsane' ? 'EFSANE' : o.sv === 'ozel' ? 'ÖZEL' : 'TEMEL'}</span>` : ''}
      ${ikonHtml(o)}<span class="ad">${kac(o.ad)}</span><span class="fiyat${has || o.f === 0 ? ' sahip' : ''}">${etiket}</span></button>`;
  }
  function ciz() {
    if (!D || !D.hedef || !document.body.contains(D.hedef)) return;
    onizle();
    $('dlSekmeler').innerHTML = SEKMELER.filter(([k])=>k!=='bas'||kk().cins==='k').map(([k, ad]) => `<button type="button" role="tab" class="dl-sekme${k==='efsane40'?' dl-legend-tab':''}${D.sekme === k ? ' aktif' : ''}" aria-selected="${D.sekme === k}" data-s="${k}">${`<span class="dl-category-icon" aria-hidden="true">${ad.split(' ')[0]}</span><span class="dl-category-label">${kac(ad.slice(ad.indexOf(' ')+1).replace('Şapka · gözlük','Şapka/Gözlük').replace('Dost · arka plan','Dost/Arka plan').replace('Kombinler','Kombin').replace('Sandıklar','Sandık'))}</span>`}</button>`).join('');
    $('dlSekmeler').querySelectorAll('.dl-sekme').forEach(b => b.onclick = () => { D.sekme = b.dataset.s; D.secili = null; ciz(); });
    let G = $('dlIzgara'), html = '', S = D.sekme;
    const bolum = (baslik, liste) => (baslik ? `<div class="dl-alt-baslik">${baslik}</div>` : '') + liste.filter(uygun).sort((a,b)=>DijiProgressionCatalog.itemLevel(a)-DijiProgressionCatalog.itemLevel(b)).map(ogeKart).join('');
    if (S === 'vitrin') {
      const items=OGE.filter(uygun), level=window.dmProgression?.level()||1;
      html += bolum('🌿 Başlangıç Ürünleri', items.filter(o=>DijiProgressionCatalog.itemLevel(o)===1));
      html += bolum('✨ Sana Uygun Kombinler', KOMBIN.filter(uygun));
      html += bolum('🔒 Yeni Açılacaklar', items.filter(o=>DijiProgressionCatalog.itemLevel(o)>level).sort((a,b)=>DijiProgressionCatalog.itemLevel(a)-DijiProgressionCatalog.itemLevel(b)).slice(0,6));
    } else if (S === 'efsane40') {
      const level=window.dmProgression?.level()||1;
      html += '<div class="dl-legend-hero"><span class="dl-legend-crown" aria-hidden="true">👑</span><div><small>SEVİYE 40 · EFSANE VİTRİNİ</small><h3>Zirveye ulaş. Efsaneni kuşan.</h3><p>Özel pelerinler, parlayan detaylar ve tam setler. '+(level<40?'40. seviyeye '+(40-level)+' seviye kaldı.':'Zirveye ulaştın! Şimdi tarzını seç.')+'</p></div></div>';
      html += bolum('👑 Efsane Setler',KOMBIN.filter(o=>DijiProgressionCatalog.itemLevel(o)===40));
      html += bolum('✨ 40. Seviye Parçaları',OGE.filter(o=>DijiProgressionCatalog.itemLevel(o)===40));
    } else if (ATOLYE[S]) {
      if (S === 'sapka' && D.deneme.bas) html += `<div class="dl-not">🧕 Başörtüsü takılıyken şapka görünmez.</div>`;
      atolyeOgeleri(S).forEach(g => { html += bolum(g.baslik, g.liste); });
    } else if (S === 'kombin') html += `<div class="dl-not">Kombin, parçaları tek tek almaktan %25 ucuz. Baş (saç ya da başörtüsü) senin seçimin, kombine dahil değil.</div>` + KOMBIN.filter(uygun).sort((a,b)=>DijiProgressionCatalog.itemLevel(a)-DijiProgressionCatalog.itemLevel(b)).map(ogeKart).join('');
    else if (S === 'sandik') html += '<div class="dl-not">Sandıklar parkur ilerlemenle kazanılır. Altın harcanmaz.</div><button class="dl-oge" data-sandik="0">🧰 Sandıklarımı gör</button>';
    else {
      if (S === 'bas') html += `<button type="button" class="dl-oge${!D.deneme.bas ? ' giyili' : ''}" data-cikar="bas"><span style="font-size:28px">💇</span><span class="ad">Başörtüsü yok · saçım görünsün</span><span class="fiyat sahip">Bedava</span></button><div class="dl-not">Saç modelini "💇 Saç" sekmesinden seçebilirsin. Başörtüsü takınca saç görünmez.</div>`;
      else if (['dis', 'aks', 'cik', 'tek'].includes(S)) html += `<button type="button" class="dl-oge" data-cikar="${S}"><span style="font-size:28px">🚫</span><span class="ad">Çıkar</span><span class="fiyat sahip">Bedava</span></button>`;
      if (S === 'ust') html += `<div class="dl-not">👕 Karakterin hiçbir zaman kıyafetsiz kalmaz: üst çıkarılınca klasik kıyafete döner.</div>`;
      if (S === 'alt') html += `<div class="dl-not">👖 Alt çıkarılınca okul pantolonuna döner.</div><button type="button" class="dl-oge" data-cikar="alt"><span style="font-size:28px">🏫</span><span class="ad">Okul pantolonu</span><span class="fiyat sahip">Bedava</span></button>`;
      html += OGE.filter(o => o.kat === S&&uygun(o)).sort((a,b)=>DijiProgressionCatalog.itemLevel(a)-DijiProgressionCatalog.itemLevel(b)).map(ogeKart).join('');
      if (S === 'ust') atolyeOgeleri('klasik').forEach(g => { html += bolum('👕 Klasik üstler', g.liste); });
    }
    G.innerHTML = html;
    G.querySelectorAll('[data-id]').forEach(b => b.onclick = () => sec(b.dataset.id));
    G.querySelectorAll('[data-cikar]').forEach(b => b.onclick = () => { let k = b.dataset.cikar; cikar(D.deneme, k); let g = kk().s; g[k] = ''; if (k === 'ust' || k === 'alt') {} D.secili = null; kaydet(false); });
    G.querySelectorAll('[data-sandik]').forEach(b => b.onclick = () => sandikSor(+b.dataset.sandik));
    let hg = $('dlHosGeldin'); if (hg) hg.onclick = hosGeldinAl;
    let pb = $('dlProfilBen'); if (pb) pb.onclick = () => { yo.profilKrk = ''; if (typeof yoKaydet === 'function') yoKaydet(); if (typeof yoAvatarUygula === 'function') yoAvatarUygula(); toast('✓ Profilinde artık giydirdiğin karakter görünüyor'); ciz(); };
    let dd = $('dlDondurucu'); if (dd) dd.onclick = () => { if (typeof yoDondurucuAl === 'function') { yoDondurucuAl(); setTimeout(ciz, 400); } };
    eylemCiz();
  }
  function sec(id) {
    let o = ogeBul(id); if (!o||!uygun(o)) return;
    if(!window.dmProgression?.itemAllowed(o)) return;
    let kombinMi = !!o.parca, has = kombinMi ? o.parca.every(p => sahip(p.id)) : sahip(o.id);
    if (has) {                                       /* sahip olunan: hemen giy ve kaydet */
      (kombinMi ? o.parca : [o]).forEach(p => giy(D.deneme, p));
      D.secili = null; kaydet(false);
      if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('dogru');
      return;
    }
    D.secili = o;                                    /* sahip olunmayan: dene */
    (kombinMi ? o.parca : [o]).forEach(p => giy(D.deneme, p));
    ciz();
  }
  function eylemCiz() {
    let E = $('dlEylem'), o = D.secili;
    if (!o) { E.style.display = 'none'; return; }
    E.style.display = 'flex';
    let kombinMi = !!o.parca, fh = fiyatHesapla(o, kombinMi), yeter = (yo.altin || 0) >= fh.f;
    E.innerHTML = `<span class="bilgi">${kac(o.ad)} · ${fh.f} 🪙<small>${fh.not || (kombinMi ? o.parca.length + ' parça birden' : 'Deniyorsun, beğenirsen al')}${yeter ? '' : ` · ${fh.f - (yo.altin || 0)} altın daha lazım`}</small></span><button type="button" id="dlEylemBtn" ${yeter ? '' : 'disabled'}>🛍️ Satın al</button>`;
    $('dlEylemBtn').onclick = () => satinAl(o, kombinMi);
  }
  async function satinAl(o, kombinMi) {
    if(!window.dmProgression?.itemAllowed(o)) return;
    const btn=$('dlEylemBtn');if(btn)btn.disabled=true;
    try { await window.dmProgression.sync(); const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'seviyeUrunAl',ogrenci:aktifOgrenciAdi,item:o.id})});const result=await r.json();if(!r.ok||!result.ok)throw Error(result.mesaj||'Satın alma tamamlanamadı');Object.assign(yo,result.yo);try{localStorage.setItem('ing_yo_'+aktifOgrenciAdi,JSON.stringify(yo));}catch(_){}D.deneme=Object.assign({},kk().s);D.secili=null;window.yoAvatarUygula?.();window.dmProgression.refresh(true);ciz();toast(`🎉 ${o.ad} artık senin!`); }
    catch(e){toast(e.message);if(btn)btn.disabled=false;}
  }
  function hosGeldinAl() {
    return toast("🎨 Başlangıç ürünleri Vitrin’de. Kombinler 35. seviyede açılır.");
    if ((yo.altin || 0) < 120) return toast(`Hoş Geldin Paketi için ${120 - (yo.altin || 0)} altın daha lazım 🪙`);
    let k = KOMBIN[0]; yo.altin -= 120; yo.dolapHosGeldin = 1;
    k.parca.forEach(p => { sahiplen(p.id); giy(D.deneme, p); });
    kaydet('🎁 Okul kombini senin! Hoş geldin!');
  }
  /* ---------- Sandık ---------- */
  function rastgeleOge(sv, haric) {
    let aday = OGE.filter(o => o.sv === sv && !haric.includes(o.id)), yeni = aday.filter(o => !sahip(o.id));
    let havuz = yeni.length && Math.random() < 0.8 ? yeni : aday;
    return havuz[Math.floor(Math.random() * havuz.length)];
  }
  function svSec(sans) { let r = Math.random() * 100; return r < sans[0] ? 'temel' : r < sans[0] + sans[1] ? 'ozel' : 'efsane'; }
  function sandikSor(i) {
    return window.dmProgression?.chests();
    let s = SANDIK[i];
    if ((yo.altin || 0) < s.f) return toast(`${s.ad} için ${s.f - (yo.altin || 0)} altın daha lazım 🪙`);
    let p = document.createElement('div'); p.className = 'dl-acilis'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
    p.innerHTML = `<div class="dl-acilis-kart"><div style="font-size:54px">${s.ikon}</div><h3>${s.ad}</h3><p style="margin:0 0 14px;font-weight:700;color:#64748b">${s.alt}<br>${s.f} 🪙 harcansın mı?</p><button id="dlSandikEvet" style="width:100%;border:0;border-radius:14px;padding:12px;font-weight:900;color:#fff;background:linear-gradient(135deg,#f59e0b,#ea580c);cursor:pointer;font-family:inherit;font-size:15px">🎁 Aç</button><button id="dlSandikHayir" style="width:100%;margin-top:8px;border:0;background:none;font-weight:800;color:#6d28d9;cursor:pointer;font-family:inherit;padding:8px">Vazgeç</button></div>`;
    document.body.appendChild(p);
    $('dlSandikHayir').onclick = () => p.remove();
    $('dlSandikEvet').onclick = () => { p.remove(); window.dolapSandikAc(i, false); };
    setTimeout(() => $('dlSandikEvet') && $('dlSandikEvet').focus(), 50);
  }
  window.dolapSandikAc = function (i, bedava) {
    return window.dmProgression?.chests();
    if (!yoVar() || !kk()) { toast('Önce karakterini seç! 🎨'); return; }
    let s = SANDIK[i];
    if (!bedava) { if ((yo.altin || 0) < s.f) return toast('Yeterli altının yok 🪙'); yo.altin -= s.f; }
    let cikan = [], iade = 0;
    for (let n = 0; n < s.adet; n++) {
      let sv = n === 0 && s.garanti ? s.garanti : svSec(s.sans), o = rastgeleOge(sv, cikan.map(c => c.id)); if (!o) continue;
      let vardi = sahip(o.id); if (vardi) iade += Math.round(o.f / 2); else sahiplen(o.id);
      cikan.push(Object.assign({}, o, { vardi }));
    }
    yo.altin = (yo.altin || 0) + iade;
    if (typeof yoKaydet === 'function') yoKaydet();
    let p = document.createElement('div'); p.className = 'dl-acilis'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
    const RENK = { temel: '#cbd5e1', ozel: '#a78bfa', efsane: '#f59e0b' };
    p.innerHTML = `<div class="dl-acilis-kart"><h3>🎉 ${s.ad} açıldı!</h3><div class="dl-acilis-liste">${cikan.map(o => `<div style="border-color:${RENK[o.sv]}"><div style="font-size:28px">${o.emoji || `<span style="display:inline-block;width:34px;height:34px;border-radius:10px;background:${o.renk}"></span>`}</div>${kac(o.ad)}<br><small style="color:${o.vardi ? '#b45309' : '#16a34a'}">${o.vardi ? `Sende vardı: +${Math.round(o.f / 2)} 🪙` : 'Yeni!'}</small></div>`).join('')}</div>
      <button id="dlSandikTamam" style="width:100%;border:0;border-radius:14px;padding:12px;font-weight:900;color:#fff;background:linear-gradient(135deg,#7c3aed,#ec4899);cursor:pointer;font-family:inherit;font-size:15px">Harika!</button></div>`;
    document.body.appendChild(p);
    if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('dogru');
    $('dlSandikTamam').onclick = () => { p.remove(); if (D) ciz(); };
    setTimeout(() => $('dlSandikTamam') && $('dlSandikTamam').focus(), 50);
  };

  /* ================= BAĞLANTILAR ================= */
  /* Atölye = Karakter & Giyim: Mağaza'nın Atölye alanına (ve Arkadaşlar'taki mağazaya) çizilir */
  let eskiAtolye = window.yoMagazaAc;
  window.yoMagazaAc = function () {
    if (typeof yoHazirMi === 'function' && !yoHazirMi()) return;
    let hedef = window.yoGomuluHedef && document.getElementById(window.yoGomuluHedef);
    if (!hedef || !kk()) return eskiAtolye && eskiAtolye.apply(this, arguments);   /* hedef yoksa ya da kız/erkek seçilmediyse eski akış */
    ac(hedef);
  };
  /* Kız/erkek seçimi yapıldıktan sonra eski Atölye çizilirse yerine yenisini koy */
  setInterval(() => {
    let h = window.yoGomuluHedef && document.getElementById(window.yoGomuluHedef);
    if (h && kk() && h.querySelector('.ka-wrap') && !h.querySelector('.dl-gomulu')) ac(h);
  }, 600);
  window.dolapAc = () => ac(null);                       /* eski bağlantılar Mağaza'yı açar */
  document.querySelectorAll('#dlSanaOzelKart, #dlMagazaBanner').forEach(e => e.remove());

  /* Atölye fiyatları yeni tabloya (bedava olanlar bedava kalır) ve koleksiyon karakter fiyatı */
  try { Object.values(window.KA_KATALOG || {}).forEach(k => k.liste.forEach(u => { if (u.f > 0 && !u._eskiF) { u._eskiF = u.f; u.dmTier=u.f<=30?'temel':u.f<=60?'ozel':'efsane';u.f=DijiProgressionCatalog.price({kat:Object.keys(window.KA_KATALOG).find(key=>window.KA_KATALOG[key]===k),sv:u.dmTier}); } })); } catch (e) {}
  window.krkFiyat = k => (Number(k && k.sv) || 0) >= 20 ? 2500 : 1200;
})();
