/* Papi tours and searchable Help share one verified content source. */
(function (root) {
  'use strict';
  const sections = [
  {
    "id": "welcome",
    "icon": "🦜",
    "title": "Papi ile başlangıç",
    "context": "ana",
    "selector": null,
    "text": "Ben Papi! Parkur, Ders Çalış, Aktiviteler, Sana Özel, Medu Akış, Mağaza ve Profil bölümlerini birlikte keşfedelim. İleri ve Geri ile gezebilir, Geç ile çıkabilir, Yardım’dan istediğin turu yeniden açabilirsin.",
    "html": "<p>Ben Papi! Parkur, Ders Çalış, Aktiviteler, Sana Özel, Medu Akış, Mağaza ve Profil bölümlerini birlikte keşfedelim. İleri ve Geri ile gezebilir, Geç ile çıkabilir, Yardım’dan istediğin turu yeniden açabilirsin.</p>"
  },
  {
    "id": "navigation",
    "icon": "🧭",
    "title": "Bölümler ve alt menü",
    "context": "ana",
    "selector": "#dcBottomNav, #bottomNavMobile",
    "text": "Alt menüden bölümler arasında geç. Parkur & MeduPro üst seçicisinde ana öğrenme yolunu ve diğer parkurları bulursun. Kilit işareti gereken seviyeyi gösterir; bazı özellikleri öğretmenin de yönetebilir.",
    "html": "<p>Alt menüden bölümler arasında geç. Parkur & MeduPro üst seçicisinde ana öğrenme yolunu ve diğer parkurları bulursun. Kilit işareti gereken seviyeyi gösterir; bazı özellikleri öğretmenin de yönetebilir.</p>"
  },
  {
    "id": "mainpath",
    "icon": "🗺️",
    "title": "Ana parkur ve duraklar",
    "context": "ana",
    "selector": ".bc-d.simdi",
    "text": "Ana parkur ilk seviyede açıktır. Papi’nin bulunduğu sıradaki durağa dokun, başlangıç kartını oku ve soruları çöz. Tamamlanan duraklarda ilerlemeni ve yıldızlarını görebilirsin. Tüm durakları göster ile yolun tamamına bak.",
    "html": "<p>Ana parkur ilk seviyede açıktır. Papi’nin bulunduğu sıradaki durağa dokun, başlangıç kartını oku ve soruları çöz. Tamamlanan duraklarda ilerlemeni ve yıldızlarını görebilirsin. Tüm durakları göster ile yolun tamamına bak.</p>"
  },
  {
    "id": "pathprogress",
    "icon": "🚪",
    "title": "Dört parkur ve seviye kapıları",
    "context": "ana",
    "selector": "#pkSekmeler",
    "text": "Ana parkur açıktır; diğer parkurlar 10., 20. ve 30. seviyelerde açılır. MeduPro’da Kelime Modu, Papağanla Sohbet ve Kelime Kartları yer alır. Kilitli bölümde gereken seviye yazısını kontrol et.",
    "html": "<p>Ana parkur açıktır; diğer parkurlar 10., 20. ve 30. seviyelerde açılır. MeduPro’da Kelime Modu, Papağanla Sohbet ve Kelime Kartları yer alır. Kilitli bölümde gereken seviye yazısını kontrol et.</p>"
  },
  {
    "id": "levels",
    "icon": "🌟",
    "title": "40 seviye ve açılan özellikler",
    "context": "ana",
    "selector": "#dmLevelBadge",
    "text": "Seviye rozetine dokunarak ilerlemeni, kalan XP’yi ve yeni açılan özellikleri incele. Toplam XP gelişim seviyen, haftalık XP lig yarışın içindir. 40 seviyenin tüm açılışları Yardım’daki tabloda yer alır.",
    "html": "<p>Seviye rozetine dokunarak ilerlemeni, kalan XP’yi ve yeni açılan özellikleri incele. Toplam XP gelişim seviyen, haftalık XP lig yarışın içindir. 40 seviyenin tüm açılışları Yardım’daki tabloda yer alır.</p><div class=\"yd-level-scroll\"><table class=\"yd-level-table\"><caption>40 seviyenin adı ve açılan özellikleri</caption><thead><tr><th>Seviye</th><th>Unvan</th><th>Açılan özellikler</th></tr></thead><tbody><tr><th>1</th><td>Yumurtadan Çıkan Papi</td><td>Ana parkur · Ders Çalış · A1</td></tr><tr><th>2</th><td>Meraklı Yavru</td><td>Meraklı Yavru rozeti</td></tr><tr><th>3</th><td>Oyuncu Yavru</td><td>Kelime Laboratuvarı</td></tr><tr><th>4</th><td>Parlayan Tüy</td><td>Parlayan Tüy rozeti</td></tr><tr><th>5</th><td>Minik Kanat</td><td>Yerel Lig · Parkur altın hediyeleri · Bronz sandık</td></tr><tr><th>6</th><td>Hatırlayan Gaga</td><td>Hafıza Sandığı</td></tr><tr><th>7</th><td>Cesur Yavru</td><td>Cesur Yavru rozeti</td></tr><tr><th>8</th><td>Hikâye Kuşu</td><td>Okuma Stüdyosu</td></tr><tr><th>9</th><td>Sözcük Çırağı</td><td>A2 dersleri · A1 tamamlanınca</td></tr><tr><th>10</th><td>Kâşif Papağan</td><td>İkinci parkur · Keşfet · Beğeni ve tebrik · Süper Lig · haftalık 750 XP · MeduPro · Kelime Modu</td></tr><tr><th>11</th><td>Dikkatli Gaga</td><td>Eksik Harf</td></tr><tr><th>12</th><td>Görev Kanadı</td><td>Günlük görevler</td></tr><tr><th>13</th><td>Sabırlı Papağan</td><td>Pomodoro</td></tr><tr><th>14</th><td>Gümüş Tüy</td><td>Harf Avı · Gümüş sandık</td></tr><tr><th>15</th><td>Renkli Kanat</td><td>Mağaza ve ilk vitrin · Avatar seçimi · Zor kelimeler · Takip · Oyun başına 1 joker · Şampiyonlar Ligi · haftalık 1800 XP</td></tr><tr><th>16</th><td>Hedef Kanadı</td><td>Haftalık hedef · B1 dersleri · A2 tamamlanınca</td></tr><tr><th>17</th><td>Süslü Tepe</td><td>Saç stilleri</td></tr><tr><th>18</th><td>Sihirli Gaga</td><td>Joker dükkânı</td></tr><tr><th>19</th><td>Uyumlu Kanat</td><td>Eşini Bul</td></tr><tr><th>20</th><td>Meydan Okuyan Papi</td><td>Üçüncü parkur · Düello · Karakter koleksiyonu · İkinci vitrin · Üst giyim · Oyun başına 2 joker · Papağanla Sohbet</td></tr><tr><th>21</th><td>Yıldız Tüy</td><td>Yıldız Tüy rozeti</td></tr><tr><th>22</th><td>Cesur Gaga</td><td>Risk Balonları</td></tr><tr><th>23</th><td>Bilge Papağan</td><td>B2 dersleri · B1 tamamlanınca · Alt giyim</td></tr><tr><th>24</th><td>Altın Kanat</td><td>Dikte · Altın sandık</td></tr><tr><th>25</th><td>Sohbetçi Papağan</td><td>Mesaj gönderme · Tüm orta seviye ürünler · Üçüncü vitrin</td></tr><tr><th>26</th><td>Çevik Pençe</td><td>Ayakkabılar</td></tr><tr><th>27</th><td>Sözcük Avcısı</td><td>Şifre Kırıcı</td></tr><tr><th>28</th><td>Işıltılı Tüy</td><td>Hız Fırtınası · Işıltılı Tüy rozeti</td></tr><tr><th>29</th><td>Zarif Kanat</td><td>Aksesuarlar</td></tr><tr><th>30</th><td>Dost Kanat</td><td>Dördüncü parkur · İki kişilik oyunlar · Enerji hediyesi · Pro ürünler · Dördüncü vitrin · Oyun başına 3 joker · Kelime Kartları</td></tr><tr><th>31</th><td>Gezgin Papağan</td><td>Kelime Treni</td></tr><tr><th>32</th><td>Taçlı Tepe</td><td>Baş aksesuarları</td></tr><tr><th>33</th><td>Usta Gaga</td><td>Usta Gaga rozeti</td></tr><tr><th>34</th><td>Kristal Kanat</td><td>Kristal sandık</td></tr><tr><th>35</th><td>Görkemli Papağan</td><td>Diğer hediyeler · Kombinler · Beşinci vitrin</td></tr><tr><th>36</th><td>Cümle Ustası Papi</td><td>Cümle Kurma</td></tr><tr><th>37</th><td>Efsane Tüy</td><td>Efsane Tüy rozeti</td></tr><tr><th>38</th><td>Işığın Kanadı</td><td>Görünüm efektleri</td></tr><tr><th>39</th><td>Ormanın Sesi</td><td>Harf Bahçesi</td></tr><tr><th>40</th><td>Efsane Papağan</td><td>Altıncı vitrin · Efsane Papağan rozeti · Efsane sandık · En değerli parkur altını</td></tr></tbody></table></div><p>Kilitli özelliklerde ayrıca parkur tamamlama, haftalık XP veya ilerleme koşulu gösterilebilir. Özelliğin kendi kilit açıklamasını da kontrol et.</p>"
  },
  {
    "id": "energy",
    "icon": "⚡",
    "title": "Enerji: kazanma ve harcama",
    "context": "ana",
    "selector": "#ybEnerji",
    "text": "Enerji düğmesi kalan miktarı ve dolum durumunu gösterir. Klasik oyun girişi 3 enerji, ana parkurda 2 soru 1 enerjidir. İki kişilik Kelime Uçuşu ve Cümle Rotası 4 enerji ister. Papi Kartları ve Kelime Çarkı enerji harcamaz.",
    "html": "<p>Enerjini enerji düğmesinden kontrol et; tavan, dolum, bonus ve paket bilgilerini orada görürsün. <b>Klasik mini oyun: 3 enerji.</b> Ana parkurda her 2 soru 1 enerji. Kelime Uçuşu ve Cümle Rotası karşılaşmaları 4 enerji. Öğretmenin verdiği ödev oyunlarında enerji muafiyeti uygulanabilir. Ders Çalış ve Papi Kartları/Kelime Çarkı etkinlikleri enerji harcamaz. Diğer parkurlarda başlangıç kartındaki maliyeti kontrol et; enerji eksikse dolum, ders çalışması, uygun hediyeler ve paket seçeneklerine bak.</p>"
  },
  {
    "id": "currency",
    "icon": "🪙",
    "title": "Altın, XP ve oyun puanı",
    "context": "ana",
    "selector": null,
    "text": "Oyun puanın sıralama içindir; XP gelişim ve lig içindir; altın mağazada harcanır. Bunlar aynı şey değildir. Papi Kartları ve Kelime Çarkı kendi sıralamalarına sonuç kaydeder; altın, XP veya hediye vermez.",
    "html": "<p>Oyun puanın sıralama içindir; XP gelişim ve lig içindir; altın mağazada harcanır. Bunlar aynı şey değildir. Papi Kartları ve Kelime Çarkı kendi sıralamalarına sonuç kaydeder; altın, XP veya hediye vermez.</p>"
  },
  {
    "id": "goals",
    "icon": "🎯",
    "title": "Günlük görevler ve haftalık hedef",
    "context": "tab-sanaozel",
    "selector": "#yoGorevler, #gunlukGorevAlani",
    "text": "Günün 3 görevini ve haftalık hedefini ayrı ayrı kontrol et. Günlük görevler 12., haftalık hedef 16. seviyede açılır. Giriş sonrası duyurulardan seçim yapabilir, Sana Özel’den ilerlemeni izleyebilirsin.",
    "html": "<p>Günün 3 görevini ve haftalık hedefini ayrı ayrı kontrol et. Günlük görevler 12., haftalık hedef 16. seviyede açılır. Giriş sonrası duyurulardan seçim yapabilir, Sana Özel’den ilerlemeni izleyebilirsin.</p>"
  },
  {
    "id": "homework",
    "icon": "📝",
    "title": "Ödevler ve öğretmen kodu",
    "context": "tab-sanaozel",
    "selector": null,
    "text": "Öğretmenin sınıfına veya şubene konu, ünite ve oyun ödevi verebilir. Ödev kartından ilgili çalışmayı aç; tamamlanma ve yıldız koşulunu kontrol et. Öğretmen bağlantısı istenirse sana verilen kodu kullan.",
    "html": "<p>Öğretmenin sınıfına veya şubene konu, ünite ve oyun ödevi verebilir. Ödev kartından ilgili çalışmayı aç; tamamlanma ve yıldız koşulunu kontrol et. Öğretmen bağlantısı istenirse sana verilen kodu kullan.</p>"
  },
  {
    "id": "reports",
    "icon": "📋",
    "title": "Raporlar ve veli özeti",
    "context": "tab-sanaozel",
    "selector": "#kartRaporlarim",
    "text": "Raporlarım’da öğretmeninin değerlendirmelerini, beceri puanlarını ve yorumlarını görürsün. Veli özetleri ilgili öğrencinin haftalık çalışmasına göre hazırlanır; veli iletişim bilgilerini Hesap ayarlarında doğru tut.",
    "html": "<p>Raporlarım’da öğretmeninin değerlendirmelerini, beceri puanlarını ve yorumlarını görürsün. Veli özetleri ilgili öğrencinin haftalık çalışmasına göre hazırlanır; veli iletişim bilgilerini Hesap ayarlarında doğru tut.</p>"
  },
  {
    "id": "reading",
    "icon": "📖",
    "title": "Okuma Stüdyosu",
    "context": "tab-sanaozel",
    "selector": "#kartOkumaStudyosu",
    "text": "8. seviyede açılır. Süreyi başlat, metni oku ve son okuduğun kelimeyi işaretle; dakikadaki kelime sayını izle. Çalışma bittiğinde kelimelerin anlamlarını inceleyip önceki sonuçlarınla karşılaştır.",
    "html": "<p>8. seviyede açılır. Süreyi başlat, metni oku ve son okuduğun kelimeyi işaretle; dakikadaki kelime sayını izle. Çalışma bittiğinde kelimelerin anlamlarını inceleyip önceki sonuçlarınla karşılaştır.</p>"
  },
  {
    "id": "pomodoro",
    "icon": "🍅",
    "title": "Pomodoro",
    "context": "tab-sanaozel",
    "selector": "#kartPomodoro",
    "text": "13. seviyede açılır. Çalışma ve mola sürelerini ayarlayıp odaklanma sayacını başlat. Sayacı durdurabilir, düzenli kısa çalışmalarla günlük planını sürdürebilirsin.",
    "html": "<p>13. seviyede açılır. Çalışma ve mola sürelerini ayarlayıp odaklanma sayacını başlat. Sayacı durdurabilir, düzenli kısa çalışmalarla günlük planını sürdürebilirsin.</p>"
  },
  {
    "id": "tasks",
    "icon": "🎬",
    "title": "Etkinlikler ve videolar",
    "context": "tab-sanaozel",
    "selector": null,
    "text": "Öğretmeninin atadığı etkinlik ve videoları ilgili kartlardan aç. Tamamlanma koşulunu karşıla; sadece açmak çalışmanın bittiği anlamına gelmez. Sonuç ve ödül bilgisi kartta gösterilir.",
    "html": "<p>Öğretmeninin atadığı etkinlik ve videoları ilgili kartlardan aç. Tamamlanma koşulunu karşıla; sadece açmak çalışmanın bittiği anlamına gelmez. Sonuç ve ödül bilgisi kartta gösterilir.</p>"
  },
  {
    "id": "weak",
    "icon": "🔁",
    "title": "Zor Kelimelerim",
    "context": "tab-sanaozel",
    "selector": null,
    "text": "15. seviyede açılır. Yanlış yaptığın kelimeleri aralıklı tekrarlarla çalış. Biliyorum ve tekrar seçeneklerini dürüstçe kullan; amaç kelimeyi kalıcı öğrenmektir.",
    "html": "<p>15. seviyede açılır. Yanlış yaptığın kelimeleri aralıklı tekrarlarla çalış. Biliyorum ve tekrar seçeneklerini dürüstçe kullan; amaç kelimeyi kalıcı öğrenmektir.</p>"
  },
  {
    "id": "placement",
    "icon": "📊",
    "title": "Seviye tespit",
    "context": "tab-sanaozel",
    "selector": null,
    "text": "Seviye tespit, A1–B2 dil düzeyine yönelik başlangıç önerisi verir. Bu sonuç, uygulamanın 1–40 gelişim seviyesinden farklıdır. Daha üst dersler için gelişim seviyesi ve önceki dersleri bitirme koşulları devam eder.",
    "html": "<p>Seviye tespit, A1–B2 dil düzeyine yönelik başlangıç önerisi verir. Bu sonuç, uygulamanın 1–40 gelişim seviyesinden farklıdır. Daha üst dersler için gelişim seviyesi ve önceki dersleri bitirme koşulları devam eder.</p>"
  },
  {
    "id": "gameintro",
    "icon": "🎮",
    "title": "Tek kişilik oyunlar ve ünite seçimi",
    "context": "tab-aktiviteler",
    "selector": "#tab-aktiviteler .az-grid2x2",
    "text": "Tek kişilik veya iki kişilik sekmesini seç. Klasik kelime oyunlarında başlangıç ekranındaki sınıf ve ünite seçimi havuzu belirler. Kilitli oyun gereken seviyede açılır; cümle oyunlarında içerik sınıf seviyesine göre seçilebilir.",
    "html": "<p>Tek kişilik veya iki kişilik sekmesini seç. Klasik kelime oyunlarında başlangıç ekranındaki sınıf ve ünite seçimi havuzu belirler. Kilitli oyun gereken seviyede açılır; cümle oyunlarında içerik sınıf seviyesine göre seçilebilir.</p>"
  },
  {
    "id": "lab",
    "icon": "🔬",
    "title": "Kelime Laboratuvarı",
    "context": "tab-aktiviteler",
    "selector": "#tab-aktiviteler [onclick*='kelimeYarismasiAc']",
    "text": "Kelimeyi gör ve dinle, doğru Türkçe anlamı seç. 3. seviyede açılır.",
    "html": "<p>Kelimeyi gör ve dinle, doğru Türkçe anlamı seç. 3. seviyede açılır.</p>"
  },
  {
    "id": "memory",
    "icon": "🧠",
    "title": "Hafıza Sandığı",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "İngilizce ve Türkçe kartları eşleştir. Açtığın kartları aklında tut; hatalı eşleşmeleri azalt. 6. seviyede açılır.",
    "html": "<p>İngilizce ve Türkçe kartları eşleştir. Açtığın kartları aklında tut; hatalı eşleşmeleri azalt. 6. seviyede açılır.</p>"
  },
  {
    "id": "missing",
    "icon": "✏️",
    "title": "Eksik Harf",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "Kelimedeki eksik harfleri tamamla ve kontrol et. 11. seviyede açılır.",
    "html": "<p>Kelimedeki eksik harfleri tamamla ve kontrol et. 11. seviyede açılır.</p>"
  },
  {
    "id": "hangman",
    "icon": "🔤",
    "title": "Harf Avı",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "Harfleri seçerek gizli kelimeyi bul. Yanlış harf hakkını ekrandan izle. 14. seviyede açılır.",
    "html": "<p>Harfleri seçerek gizli kelimeyi bul. Yanlış harf hakkını ekrandan izle. 14. seviyede açılır.</p>"
  },
  {
    "id": "match",
    "icon": "🔗",
    "title": "Eş Bul",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "İngilizce kelimeler ile Türkçe karşılıklarını eşleştir. 19. seviyede açılır.",
    "html": "<p>İngilizce kelimeler ile Türkçe karşılıklarını eşleştir. 19. seviyede açılır.</p>"
  },
  {
    "id": "risk",
    "icon": "🎈",
    "title": "Risk Balonları",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "Balon ve soru seçimini yap; doğru anlamı bul. Zorluk ve puan bilgilerini oyun ekranında kontrol et. 22. seviyede açılır.",
    "html": "<p>Balon ve soru seçimini yap; doğru anlamı bul. Zorluk ve puan bilgilerini oyun ekranında kontrol et. 22. seviyede açılır.</p>"
  },
  {
    "id": "listening",
    "icon": "🎧",
    "title": "Kulak Dedektifi",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "Dinle ile kelimeyi duy, İngilizcesini yazıp Kontrol et’e bas. Kaplumbağa düğmesi yavaş okur. 24. seviyede açılır.",
    "html": "<p>Dinle ile kelimeyi duy, İngilizcesini yazıp Kontrol et’e bas. Kaplumbağa düğmesi yavaş okur. 24. seviyede açılır.</p>"
  },
  {
    "id": "cipher",
    "icon": "🔐",
    "title": "Şifre Kırıcı",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "Kelimeyi tahmin et; renkli harf ipuçlarını izleyerek doğru harfi doğru yere koy. 27. seviyede açılır.",
    "html": "<p>Kelimeyi tahmin et; renkli harf ipuçlarını izleyerek doğru harfi doğru yere koy. 27. seviyede açılır.</p>"
  },
  {
    "id": "storm",
    "icon": "🌪️",
    "title": "Hız Fırtınası",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "Kelime düşmeden doğru anlamı seç; hız ve doğruluğu birlikte koru. 28. seviyede açılır.",
    "html": "<p>Kelime düşmeden doğru anlamı seç; hız ve doğruluğu birlikte koru. 28. seviyede açılır.</p>"
  },
  {
    "id": "train",
    "icon": "🚂",
    "title": "Kelime Treni",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "Türkçe anlamı verilen cümlenin İngilizce kelimelerini sırayla yerleştir; varsa fazla kelimeleri kullanma. 31. seviyede açılır.",
    "html": "<p>Türkçe anlamı verilen cümlenin İngilizce kelimelerini sırayla yerleştir; varsa fazla kelimeleri kullanma. 31. seviyede açılır.</p>"
  },
  {
    "id": "sentence",
    "icon": "🧱",
    "title": "Cümle Ustası",
    "context": "tab-aktiviteler",
    "selector": null,
    "text": "Karışık kelimelerden doğru İngilizce cümleyi oluştur. Sınıf düzeyine uygun cümlelerle çalış. 36. seviyede açılır.",
    "html": "<p>Karışık kelimelerden doğru İngilizce cümleyi oluştur. Sınıf düzeyine uygun cümlelerle çalış. 36. seviyede açılır.</p>"
  },
  {
    "id": "garden",
    "icon": "🌿",
    "title": "Harf Bahçesi",
    "context": "tab-aktiviteler",
    "selector": "#hbActivityCard",
    "text": "Harflerden istenen İngilizce kelimeyi oluştur. Oyunun ipucu, kontrol ve joker düğmelerini kullan. 39. seviyede açılır.",
    "html": "<p>Harflerden istenen İngilizce kelimeyi oluştur. Oyunun ipucu, kontrol ve joker düğmelerini kullan. 39. seviyede açılır.</p>"
  },
  {
    "id": "papicards",
    "icon": "🃏",
    "title": "Papi Kartları",
    "context": "tab-aktiviteler",
    "selector": "#papiCardsActivity",
    "text": "Sınıfını ve üniteni seç; isim isteğe bağlıdır. Kart gelir gelmez İngilizce okunur. Hoparlör tekrar okur, Çevir Türkçeyi açar. Biliyorum ve Tekrar çalış ile ilerle. Süre sınırı yok; ilk tur değerlendirmen ayrı sıralamaya kaydedilir.",
    "html": "<p>Sınıf ve ünite seçilir; isim alanı boş kalabilir veya istediğin isim yazılabilir. Seçilen ünitenin bütün uygun kelimeleri kullanılır, her yeni başlangıçta sıra karıştırılır. Kart geldiğinde İngilizce sesli okunur; hoparlör tekrar dinletir. <b>Çevir</b> Türkçeyi açar; ardından <b>Biliyorum</b> veya <b>Tekrar çalış</b> seç. Tekrar kelimeleri desteye geri döner. Puan ilk tur öz değerlendirmenden hesaplanır; tekrarlar puanı şişirmez. Sonuç o sınıf ve üniteye özel sıralamaya yazılır. Süre sınırı, enerji harcaması, altın, XP veya hediye yoktur.</p>"
  },
  {
    "id": "wheel",
    "icon": "🎡",
    "title": "Papi’nin Kelime Çarkı",
    "context": "tab-aktiviteler",
    "selector": "#wordWheelActivity",
    "text": "1 veya 2 kişi seç; sınıf ve üniteni belirle. Çark 50–1000 arası 12 puandan birini verir. Doğru cevapta eklenir, yanlışta düşülür. Ses düğmesinden çark sesini kapatabilirsin. Oyunu sonlandır ile mevcut puan kaydedilir.",
    "html": "<p>1 veya 2 kişi, sınıf ve ünite seç; oyuncu isimleri isteğe bağlıdır. Seçilen ünitenin mevcut ve ek kelimeleri karıştırılır; iki oyuncu sırayla oynar. Çark puanları: <b>50, 100, 150, 200, 250, 300, 400, 500, 600, 750, 900, 1000.</b> Çark durunca soru gelir. Doğru cevap puanı ekler, yanlış çıkarır; puan eksiye düşebilir. Çark sesi açılıp kapatılabilir. <b>Oyunu sonlandır</b> mevcut puanları kaydeder; cevaplanmamış soru puan getirmez. Kaldığım oyuna dön seçeneğiyle devam edebilirsin. Sonuç ve sıralama ayrı tutulur; altın, XP, hediye veya enerji maliyeti yoktur.</p>"
  },
  {
    "id": "scoring",
    "icon": "🏁",
    "title": "Hız, kombo, yıldız ve sonuç",
    "context": "oyun",
    "selector": null,
    "text": "Klasik oyunlarda doğru cevap ve seri bonusu puana eklenir; hız bonusu hızlı doğruyu destekler. Yanlış cevap −40 puan ve tur XP’sinden −3 getirir. Puan 1000’de kesilmez. Yıldızlar doğruluğa göre, ödüller sonuç ekranında gösterilir.",
    "html": "<p>Klasik oyun puanı temel puan + hız bonusu − hata cezasıdır; 1000 puan tavanı yoktur. Yanlış cevap −40 puan, tur XP’sinden −3 getirir. Hız bonusu doğru cevaplarla oluşur; hiç doğru yoksa altın ve XP verilmez. Art arda doğru cevaplar kombo animasyonu ve oyunun seri bonusunu tetikler. Yıldızlar doğru oranına göre belirlenir. Sonuç ekranında temel puan, süre, doğru/yanlış, kazanılan XP ve altın ile sıralama durumunu kontrol et. Papi Kartları ve Kelime Çarkı bu ödül sistemine dahil değildir.</p>"
  },
  {
    "id": "rewardrepeat",
    "icon": "⏳",
    "title": "Tekrar oynama ve kayıt durumu",
    "context": "oyun",
    "selector": null,
    "text": "Aynı oyun ve ünitede ödül aldıktan sonraki 24 saat içinde tekrar turu sıralama için oynayabilirsin; ikinci altın ve XP ödülü verilmez. Sonuç ekranındaki kayıt uyarısını kontrol et. Bağlantı kesilirse yeniden bağlanınca kaydı kontrol et.",
    "html": "<p>Ödüllü klasik oyunda aynı oyun ve ünite için 24 saatlik ödül bekleme süresi bulunur. Tekrar turu liderlik sonucu sağlayabilir; aynı ödülü tekrar vermez. Günün ilk 3 uygun oyunu çift ödül, 12. oyundan sonraki oyunlar yarım ödül kuralına tabidir; güçlendiriciler ve doğruluk koşulları ayrıca uygulanır. <b>Kaydediliyor</b> ile <b>kaydedildi</b> farklı durumlardır. İnternet kesilirse uygulamayı yeniden bağla, sonuç uyarısını ve tekrar dene düğmesini kullan; aynı tur için ikinci ödül oluşmaz.</p>"
  },
  {
    "id": "joker",
    "icon": "🃏",
    "title": "Joker hakları ve güçlendiriciler",
    "context": "oyun",
    "selector": "#jkBar",
    "text": "Jokerler 15. seviyede açılır: oyun başına 15’te 1, 20’de 2, 30’da 3 kullanım. 30’dan sonra satın alınan ek hakla dördüncü kullanım mümkündür. Joker türleri ve eldeki miktarları çubukta gör; güçlendiricinin açıklamasını oku.",
    "html": "<p>Joker çubuğu oyunun desteklediği ipuçlarını gösterir: yanlış şıkları azaltma, harf açma, cevabı fısıldama, pas ve kalkan gibi. 15. seviyede 1, 20. seviyede 2, 30. seviyede 3 kullanım hakkı bulunur. 30. seviyeden sonra dolaptan alınan ek joker hakkıyla 4. kullanım yapılabilir. Joker dükkânı 18. seviyede açılır. Satın alınan stok ile tur kullanım sınırı farklıdır. Çift Puan, XP Tılsımı, Altın Mıknatısı ve Bedava Bilet gibi güçlendiricilerin hangi değeri etkilediğini ve kullanım koşulunu ürün açıklamasından kontrol et.</p>"
  },
  {
    "id": "lessons",
    "icon": "📘",
    "title": "Ders Çalış: konu, örnek ve test",
    "context": "tab-derscalis",
    "selector": "#tab-derscalis .dc-hero",
    "text": "Konuyu seç, anlatım ve örnekleri incele, örnek cümleleri dinle, testi tamamla. Konu Macerası varsa kartlar ve final adımıyla ilerle. İlk tamamlama ve tekrar ödülü farklı olabilir; gerçek kazanımı sonuç ekranında gör.",
    "html": "<p>Konuyu seç, anlatım ve örnekleri incele, örnek cümleleri dinle, testi tamamla. Konu Macerası varsa kartlar ve final adımıyla ilerle. İlk tamamlama ve tekrar ödülü farklı olabilir; gerçek kazanımı sonuç ekranında gör.</p>"
  },
  {
    "id": "lessonlevels",
    "icon": "🎚️",
    "title": "A1–B2 ders kilitleri",
    "context": "tab-derscalis",
    "selector": "#tab-derscalis .dc-level-grid",
    "text": "A1 1., A2 9., B1 16., B2 23. gelişim seviyesinde açılır. A2, B1 ve B2 için önceki ders seviyesinin tamamı bitmelidir. Öğretmenin verdiği ödevin erişim kuralı farklı olabilir.",
    "html": "<p>A1 1., A2 9., B1 16., B2 23. gelişim seviyesinde açılır. A2, B1 ve B2 için önceki ders seviyesinin tamamı bitmelidir. Öğretmenin verdiği ödevin erişim kuralı farklı olabilir.</p>"
  },
  {
    "id": "lessonsearch",
    "icon": "🔎",
    "title": "Konu arama, kelime anlamı ve aksan",
    "context": "tab-derscalis",
    "selector": "#dcAramaInput",
    "text": "Arama alanına konu adını yaz. Açıklamadaki işaretli kelimelere dokunarak anlamlarını gör. Amerikan/İngiliz aksanı seçeneği cihazındaki seslere bağlıdır; Dinle düğmesi örnek cümleyi yeniden okur.",
    "html": "<p>Arama alanına konu adını yaz. Açıklamadaki işaretli kelimelere dokunarak anlamlarını gör. Amerikan/İngiliz aksanı seçeneği cihazındaki seslere bağlıdır; Dinle düğmesi örnek cümleyi yeniden okur.</p>"
  },
  {
    "id": "medupro",
    "icon": "🦜",
    "title": "MeduPro parkurları",
    "context": "tab-konusmapratigi",
    "selector": null,
    "text": "MeduPro 10. seviyede açılır. Kelime Modu 10., Papağanla Sohbet 20., Kelime Kartları 30. seviyede açılır. Bu parkurlar, Aktiviteler’deki Papi Kartları etkinliğinden farklıdır.",
    "html": "<p>MeduPro 10. seviyede açılır. Kelime Modu 10., Papağanla Sohbet 20., Kelime Kartları 30. seviyede açılır. Bu parkurlar, Aktiviteler’deki Papi Kartları etkinliğinden farklıdır.</p>"
  },
  {
    "id": "wordmode",
    "icon": "🔤",
    "title": "Kelime Modu: söyle veya yaz",
    "context": "kp-oyun",
    "selector": "#kpMikBtn",
    "text": "Türkçe kelimenin İngilizcesini mikrofona söyle. Mikrofon izni gerekiyorsa kabul et; çalışmazsa Yazarak cevapla seçeneğini kullan. Atladığın veya yanlış yaptığın kelimeleri sonra tekrar çalış; joker çubuğundaki hakkını kontrol et.",
    "html": "<p>Türkçe kelimenin İngilizcesini mikrofona söyle. Mikrofon izni gerekiyorsa kabul et; çalışmazsa Yazarak cevapla seçeneğini kullan. Atladığın veya yanlış yaptığın kelimeleri sonra tekrar çalış; joker çubuğundaki hakkını kontrol et.</p>"
  },
  {
    "id": "chat",
    "icon": "💬",
    "title": "Papağanla Sohbet",
    "context": "tab-sohbet",
    "selector": null,
    "text": "Seviyene uygun diyalogda Papi’nin sorusunu dinle, yazarak veya mikrofonla cevapla. İpucu ve örnek cevapları incele. Bölüm veya dil seviyesi kilitliyse ekrandaki koşulu tamamlayıp yeniden dene.",
    "html": "<p>Seviyene uygun diyalogda Papi’nin sorusunu dinle, yazarak veya mikrofonla cevapla. İpucu ve örnek cevapları incele. Bölüm veya dil seviyesi kilitliyse ekrandaki koşulu tamamlayıp yeniden dene.</p>"
  },
  {
    "id": "islands",
    "icon": "🏝️",
    "title": "MeduPro Kelime Kartları",
    "context": "kk",
    "selector": "#seviyeYolAlani",
    "text": "Adalar sınıf ve ünite çalışmalarını temsil eder. Sıradaki açık adayı seç, verilen kelimeleri incele ve tamamlanma koşulunu yerine getir. Tamamlanan ve kilitli adaları haritadan izle; Papi Kartları ayrı bir etkinliktir.",
    "html": "<p>Adalar sınıf ve ünite çalışmalarını temsil eder. Sıradaki açık adayı seç, verilen kelimeleri incele ve tamamlanma koşulunu yerine getir. Tamamlanan ve kilitli adaları haritadan izle; Papi Kartları ayrı bir etkinliktir.</p>"
  },
  {
    "id": "feed",
    "icon": "📰",
    "title": "Medu Akış, Keşfet ve takip",
    "context": "tab-meduakis",
    "selector": "#maSegment",
    "text": "Akışta başarıları izle ve uygun seviyede beğen/tebrik et. Keşfet’te öğrencileri ara; profilinden takip et. Çevrimiçi etiketi yakın zamandaki etkinliği gösterir. Akış erişimi hesabının açılış koşullarına bağlıdır.",
    "html": "<p>Akışta başarıları izle ve uygun seviyede beğen/tebrik et. Keşfet’te öğrencileri ara; profilinden takip et. Çevrimiçi etiketi yakın zamandaki etkinliği gösterir. Akış erişimi hesabının açılış koşullarına bağlıdır.</p>"
  },
  {
    "id": "showcase",
    "icon": "🎪",
    "title": "Vitrin ve bildirimler",
    "context": "tab-meduakis",
    "selector": "#zlBtn",
    "text": "Vitrininde rozetlerini ve gelişimini göster. Bildirim zilinde takip, tebrik, mesaj, hediye ve düello haberlerini kontrol et. Okunmamış sayısına ve ilgili karşılaşmanın durumuna bak.",
    "html": "<p>Vitrininde rozetlerini ve gelişimini göster. Bildirim zilinde takip, tebrik, mesaj, hediye ve düello haberlerini kontrol et. Okunmamış sayısına ve ilgili karşılaşmanın durumuna bak.</p>"
  },
  {
    "id": "duels",
    "icon": "⚔️",
    "title": "Düello ve karşılaşmalar",
    "context": "tab-meduakis",
    "selector": null,
    "text": "Düello 20. seviyede açılır. Öğrenci profilindeki Düelloya çağır bölümünden uygun oyunu seç. Klasik davet ve kabul sonrası oynama süreleri 24 saattir. Sonuçlar iki oyuncu tamamlayınca karşılaştırılır.",
    "html": "<p>Düello 20. seviyede açılır. Öğrenci profilindeki Düelloya çağır bölümünden uygun oyunu seç. Klasik davet ve kabul sonrası oynama süreleri 24 saattir. Sonuçlar iki oyuncu tamamlayınca karşılaştırılır.</p>"
  },
  {
    "id": "duogames",
    "icon": "👥",
    "title": "İki kişilik oyunlar ve davet",
    "context": "tab-aktiviteler",
    "selector": "#dmDuoTab",
    "text": "30. seviyede açılır. Kelime Uçuşu’nda kelimenin, Cümle Rotası’nda cümlenin anlamını seç. Aynı anda modunda iki oyuncu Hazırım der; farklı zamanda modunda 24 saat içinde oynar. 8 soru, soru başına 12 saniye, 4 enerji.",
    "html": "<p>İki kişilik sekmesinden oyun seç ve takip ettiğin kişilerden davet gönder. <b>Kelime Uçuşu</b> İngilizce kelimenin anlamını, <b>Cümle Rotası</b> cümlenin anlamını buldurur. İki oyuncu aynı soruları görür; farklı sınıflarda küçük sınıfın havuzu kullanılır. Aynı anda modunda herkes Hazırım der ve ortak geri sayım başlar. Farklı zamanda modunda 24 saat içinde ayrı turlar tamamlanır. 8 soru, her soruya 12 saniye ve 4 enerji kuralı vardır. Bağlantı koparsa karşılaşmayı yeniden aç; süre işlemeye devam edebilir. Papi’nin Kelime Çarkı’nın 2 kişilik modu ise aynı ekranda sırayla oynanır.</p>"
  },
  {
    "id": "messages",
    "icon": "💌",
    "title": "Hazır mesaj, engelleme ve hediyeler",
    "context": "tab-meduakis",
    "selector": null,
    "text": "Hazır mesajlar 25., enerji hediyesi 30., aksesuar hediyesi 35. seviyede açılır. Profilden hazır mesajı seç veya hediye fiyatını onayla. Engelleme iki tarafın takip, mesaj, hediye ve düellosunu kapatır; engeli kaldırabilirsin.",
    "html": "<p>Hazır mesajlar 25., enerji hediyesi 30., aksesuar hediyesi 35. seviyede açılır. Profilden hazır mesajı seç veya hediye fiyatını onayla. Engelleme iki tarafın takip, mesaj, hediye ve düellosunu kapatır; engeli kaldırabilirsin.</p>"
  },
  {
    "id": "league",
    "icon": "🏆",
    "title": "Haftalık lig ve ödüller",
    "context": "tab-meduakis",
    "selector": null,
    "text": "Lig haftalık XP’yi kullanır. Yerel Lig 5. seviyede; Süper Lig için 10. seviye ve haftalık 750 XP, Şampiyonlar için 15. seviye ve 1800 XP gerekir. Haftalık sıfırlama toplam gelişim XP’ni silmez.",
    "html": "<p>Ligler haftalık XP ve seviye koşuluyla belirlenir; sadece ilk 10’a bakılarak lig atanmaz. Yerel Lig 5. seviyede, Süper Lig 10. seviyede ve haftalık 750 XP’de, Şampiyonlar Ligi 15. seviyede ve haftalık 1800 XP’de açılır. Ödül koşullarını ve tutarlarını Lig ekranında gör: Şampiyonlar Ligi ilk 3’ü özel ödüllendirilir; diğer uygun dereceler daha küçük ödül alır, kapsam dışındaki sıralara ödül verilmez. Haftalık sıfırlamada lig XP’si yenilenir, toplam gelişim XP’n korunur. Haftalık performans özeti geçmiş haftanı gösterir.</p>"
  },
  {
    "id": "shop",
    "icon": "🛍️",
    "title": "Mağaza, Dolap ve avatar",
    "context": "tab-magaza",
    "selector": "#bcMgBar",
    "text": "Mağaza, Dolap ve avatar seçimi 15. seviyede açılır. Sahip olduğun ürünü tak; kilitli ürünün seviyesini, fiyatını ve altınını kontrol et. Satın alma öncesi ürünü dene; kategoriler ilerledikçe açılır.",
    "html": "<p>Mağaza, Dolap ve avatar seçimi 15. seviyede açılır. Sahip olduğun ürünü tak; kilitli ürünün seviyesini, fiyatını ve altınını kontrol et. Satın alma öncesi ürünü dene; kategoriler ilerledikçe açılır.</p>"
  },
  {
    "id": "collection",
    "icon": "🎭",
    "title": "Koleksiyon ve vitrinler",
    "context": "tab-magaza",
    "selector": null,
    "text": "Karakter koleksiyonu 20. seviyede açılır. Dolapta sahip olduklarını ve kilitli ürünleri filtrele. Vitrinler 15, 20, 25, 30, 35 ve 40. seviyelerde genişler; profilinde kullanmak istediğin görseli seç.",
    "html": "<p>Karakter koleksiyonu 20. seviyede açılır. Dolapta sahip olduklarını ve kilitli ürünleri filtrele. Vitrinler 15, 20, 25, 30, 35 ve 40. seviyelerde genişler; profilinde kullanmak istediğin görseli seç.</p>"
  },
  {
    "id": "chests",
    "icon": "🎁",
    "title": "Sandıklar ve koşulları",
    "context": "tab-magaza",
    "selector": null,
    "text": "Seviye sandıkları: Bronz 5, Gümüş 14, Altın 24, Kristal 34, Efsane 40. Yalnız seviye yetmez; ilgili parkur ilerlemesi de gerekir. Sandık ekranında Hazır, Kilitli veya Alındı durumunu kontrol et.",
    "html": "<p>Seviye sandıkları <b>5/14/24/34/40</b> seviyelerde açılır. Bronz için ana parkurda ilk 3 durak, Gümüş için ana parkurun yarısı, Altın için ilk 2 parkur, Kristal için ilk 3 parkur, Efsane için tüm parkurlar koşulu vardır. Hem seviyen hem ilerlemen sağlanınca Aç düğmesi etkinleşir; alınmış sandık yeniden ödül vermez. Diğer sandık/ürün seçeneklerinde fiyat ve açıklamayı ayrıca kontrol et.</p>"
  },
  {
    "id": "profile",
    "icon": "👤",
    "title": "Profil, rozetler ve grafikler",
    "context": "tab-profil",
    "selector": "#bdKart",
    "text": "Profilinde gerçek profil görselini, küçük seviye rozetini, genel puanını ve ilerlemeni gör. Grafiklerde çalışma ve beceri gelişimini incele; kitap/sayfa hedeflerini ve kazandığın rozetleri takip et.",
    "html": "<p>Profilinde gerçek profil görselini, küçük seviye rozetini, genel puanını ve ilerlemeni gör. Grafiklerde çalışma ve beceri gelişimini incele; kitap/sayfa hedeflerini ve kazandığın rozetleri takip et.</p>"
  },
  {
    "id": "account",
    "icon": "🔐",
    "title": "Hesap ayarları ve giriş",
    "context": "tab-profil",
    "selector": null,
    "text": "Hesap ayarlarından kişisel bilgilerini ve şifreni yönet, gizlilik politikasını incele. Google ile girişten sonra eksik kullanıcı/sınıf bilgilerini tamamla. Şifremi unuttum ile yenileme isteyebilir, çıkış yapabilirsin.",
    "html": "<p>E-posta/şifre veya Google girişini kullan. Google ile ilk girişte istenen kullanıcı adı ve diğer bilgileri tamamla; yeni Google hesapları öğretmen onayı beklemez. E-postayla kayıt akışında doğrulama bağlantısını aç. Hesap ayarları kişisel bilgiler, şifre değiştirme ve gizlilik bağlantısını içerir. Okul/veli iletişim bilgileri isteniyorsa doğru gir. Şifre yenilemede gelen son bağlantıyı kullan; şifreni kimseyle paylaşma.</p>"
  },
  {
    "id": "delete",
    "icon": "🗑️",
    "title": "Hesap silme ve kişisel veriler",
    "context": "tab-profil",
    "selector": null,
    "text": "Hesap ayarları › Hesabımı sil bağlantısını aç. Ayrı sayfada doğrulama ve son onay istenir. Kalıcı silme koşullarını ve hangi verilerin silindiğini o sayfada oku; bu işlem uygulamadan çıkış yapmakla aynı değildir.",
    "html": "<p>Hesap ayarları › Hesabımı sil bağlantısını aç. Ayrı sayfada doğrulama ve son onay istenir. Kalıcı silme koşullarını ve hangi verilerin silindiğini o sayfada oku; bu işlem uygulamadan çıkış yapmakla aynı değildir.</p>"
  },
  {
    "id": "guest",
    "icon": "👀",
    "title": "Misafir denemesi",
    "context": "ana",
    "selector": null,
    "text": "Misafir modu 10 dakikalık keşif sağlar; oyun ve işlemler sınırlıdır. Gerçek kişilere mesaj, hediye veya düello gönderilemez. Deneme verileri üye hesabının kalıcı puanı değildir; süre sonunda üye olup devam edebilirsin.",
    "html": "<p>Misafir modu 10 dakikalık keşif sağlar; oyun ve işlemler sınırlıdır. Gerçek kişilere mesaj, hediye veya düello gönderilemez. Deneme verileri üye hesabının kalıcı puanı değildir; süre sonunda üye olup devam edebilirsin.</p>"
  },
  {
    "id": "audiohelp",
    "icon": "🔊",
    "title": "Ses, Android ve mikrofon sorunları",
    "context": "oyun",
    "selector": null,
    "text": "Ses için Dinle veya hoparlöre dokun; kaplumbağa yavaş okur. Android’de medya sesini, İngilizce metinden sese motorunu ve cihazdaki İngilizce sesini kontrol et. Mikrofon iznini aç; çalışmazsa yazılı cevabı kullan.",
    "html": "<p>Telefonun <b>medya sesini</b> yükselt; Bluetooth veya kulaklığa ses yönlenip yönlenmediğini kontrol et. Android’de metinden sese motorunun ve İngilizce ses verisinin etkin olduğundan emin ol; ses bulunamazsa uygulama uyarı verir. Dinle düğmesine yeniden dokun, gerekirse güncel Chrome’dan dene. Mikrofon için tarayıcı/uygulama izinlerinde mikrofonu aç. Cihazın konuşma tanıma desteği yoksa Yazarak cevapla seçeneğini kullan. Amerikan/İngiliz aksanı seçenekleri cihazda bulunan seslere bağlıdır.</p>"
  },
  {
    "id": "connection",
    "icon": "🌐",
    "title": "Bağlantı, kayıt ve e-posta sorunları",
    "context": "ana",
    "selector": null,
    "text": "Kaydedildi mesajını görmeden sonucun sunucuya ulaştığını varsayma. İnterneti kontrol et ve varsa Tekrar dene’ye bas. E-posta gelmezse spam/gereksiz klasörüne bak. Güncelleme görünmüyorsa uygulamayı kapatıp yeniden aç.",
    "html": "<p>Kaydedildi mesajını görmeden sonucun sunucuya ulaştığını varsayma. İnterneti kontrol et ve varsa Tekrar dene’ye bas. E-posta gelmezse spam/gereksiz klasörüne bak. Güncelleme görünmüyorsa uygulamayı kapatıp yeniden aç.</p>"
  },
  {
    "id": "support",
    "icon": "❓",
    "title": "Yardım ve Papi turlarını yeniden açma",
    "context": "ana",
    "selector": "#ybArac",
    "text": "Yardım aramasına özellik, oyun veya sorun adını yaz. Genel turu veya bir bölüm turunu yeniden başlat. Açılmamış özellikler de tanıtılır; kullanabilmek için yazan seviyeyi ve öğretmen izinlerini tamamla.",
    "html": "<p>Yardım aramasına özellik, oyun veya sorun adını yaz. Genel turu veya bir bölüm turunu yeniden başlat. Açılmamış özellikler de tanıtılır; kullanabilmek için yazan seviyeyi ve öğretmen izinlerini tamamla.</p>"
  }
];
  const tours = {
  "ana": [
    [
      null,
      "Papi ile başlangıç",
      "Ben Papi! Parkur, Ders Çalış, Aktiviteler, Sana Özel, Medu Akış, Mağaza ve Profil bölümlerini birlikte keşfedelim. İleri ve Geri ile gezebilir, Geç ile çıkabilir, Yardım’dan istediğin turu yeniden açabilirsin. "
    ],
    [
      "#dcBottomNav, #bottomNavMobile",
      "Bölümler ve alt menü",
      "Alt menüden bölümler arasında geç. Parkur & MeduPro üst seçicisinde ana öğrenme yolunu ve diğer parkurları bulursun. Kilit işareti gereken seviyeyi gösterir; bazı özellikleri öğretmenin de yönetebilir. "
    ],
    [
      ".bc-d.simdi",
      "Ana parkur ve duraklar",
      "Ana parkur ilk seviyede açıktır. Papi’nin bulunduğu sıradaki durağa dokun, başlangıç kartını oku ve soruları çöz. Tamamlanan duraklarda ilerlemeni ve yıldızlarını görebilirsin. Tüm durakları göster ile yolun tamamına bak. "
    ],
    [
      "#pkSekmeler",
      "Dört parkur ve seviye kapıları",
      "Ana parkur açıktır; diğer parkurlar 10., 20. ve 30. seviyelerde açılır. MeduPro’da Kelime Modu, Papağanla Sohbet ve Kelime Kartları yer alır. Kilitli bölümde gereken seviye yazısını kontrol et. "
    ],
    [
      "#dmLevelBadge",
      "40 seviye ve açılan özellikler",
      "Seviye rozetine dokunarak ilerlemeni, kalan XP’yi ve yeni açılan özellikleri incele. Toplam XP gelişim seviyen, haftalık XP lig yarışın içindir. 40 seviyenin tüm açılışları Yardım’daki tabloda yer alır."
    ],
    [
      "#ybEnerji",
      "Enerji: kazanma ve harcama",
      "Enerjini enerji düğmesinden kontrol et; tavan, dolum, bonus ve paket bilgilerini orada görürsün. Klasik mini oyun: 3 enerji. Ana parkurda her 2 soru 1 enerji. Kelime Uçuşu ve Cümle Rotası karşılaşmaları 4 enerji. Öğretmenin verdiği ödev oyunlarında enerji muafiyeti uygulanabilir. Ders Çalış ve Papi Kartları/Kelime Çarkı etkinlikleri enerji harcamaz. Diğer parkurlarda başlangıç kartındaki maliyeti kontrol et; enerji eksikse dolum, ders çalışması, uygun hediyeler ve paket seçeneklerine bak. "
    ],
    [
      null,
      "Altın, XP ve oyun puanı",
      "Oyun puanın sıralama içindir; XP gelişim ve lig içindir; altın mağazada harcanır. Bunlar aynı şey değildir. Papi Kartları ve Kelime Çarkı kendi sıralamalarına sonuç kaydeder; altın, XP veya hediye vermez. "
    ],
    [
      null,
      "Misafir denemesi",
      "Misafir modu 10 dakikalık keşif sağlar; oyun ve işlemler sınırlıdır. Gerçek kişilere mesaj, hediye veya düello gönderilemez. Deneme verileri üye hesabının kalıcı puanı değildir; süre sonunda üye olup devam edebilirsin. "
    ],
    [
      null,
      "Bağlantı, kayıt ve e-posta sorunları",
      "Kaydedildi mesajını görmeden sonucun sunucuya ulaştığını varsayma. İnterneti kontrol et ve varsa Tekrar dene’ye bas. E-posta gelmezse spam/gereksiz klasörüne bak. Güncelleme görünmüyorsa uygulamayı kapatıp yeniden aç. "
    ],
    [
      "#ybArac",
      "Yardım ve Papi turlarını yeniden açma",
      "Yardım aramasına özellik, oyun veya sorun adını yaz. Genel turu veya bir bölüm turunu yeniden başlat. Açılmamış özellikler de tanıtılır; kullanabilmek için yazan seviyeyi ve öğretmen izinlerini tamamla. "
    ]
  ],
  "tab-sanaozel": [
    [
      "#yoGorevler, #gunlukGorevAlani",
      "Günlük görevler ve haftalık hedef",
      "Günün 3 görevini ve haftalık hedefini ayrı ayrı kontrol et. Günlük görevler 12., haftalık hedef 16. seviyede açılır. Giriş sonrası duyurulardan seçim yapabilir, Sana Özel’den ilerlemeni izleyebilirsin. "
    ],
    [
      null,
      "Ödevler ve öğretmen kodu",
      "Öğretmenin sınıfına veya şubene konu, ünite ve oyun ödevi verebilir. Ödev kartından ilgili çalışmayı aç; tamamlanma ve yıldız koşulunu kontrol et. Öğretmen bağlantısı istenirse sana verilen kodu kullan. "
    ],
    [
      "#kartRaporlarim",
      "Raporlar ve veli özeti",
      "Raporlarım’da öğretmeninin değerlendirmelerini, beceri puanlarını ve yorumlarını görürsün. Veli özetleri ilgili öğrencinin haftalık çalışmasına göre hazırlanır; veli iletişim bilgilerini Hesap ayarlarında doğru tut. "
    ],
    [
      "#kartOkumaStudyosu",
      "Okuma Stüdyosu",
      "8. seviyede açılır. Süreyi başlat, metni oku ve son okuduğun kelimeyi işaretle; dakikadaki kelime sayını izle. Çalışma bittiğinde kelimelerin anlamlarını inceleyip önceki sonuçlarınla karşılaştır. "
    ],
    [
      "#kartPomodoro",
      "Pomodoro",
      "13. seviyede açılır. Çalışma ve mola sürelerini ayarlayıp odaklanma sayacını başlat. Sayacı durdurabilir, düzenli kısa çalışmalarla günlük planını sürdürebilirsin. "
    ],
    [
      null,
      "Etkinlikler ve videolar",
      "Öğretmeninin atadığı etkinlik ve videoları ilgili kartlardan aç. Tamamlanma koşulunu karşıla; sadece açmak çalışmanın bittiği anlamına gelmez. Sonuç ve ödül bilgisi kartta gösterilir. "
    ],
    [
      null,
      "Zor Kelimelerim",
      "15. seviyede açılır. Yanlış yaptığın kelimeleri aralıklı tekrarlarla çalış. Biliyorum ve tekrar seçeneklerini dürüstçe kullan; amaç kelimeyi kalıcı öğrenmektir. "
    ],
    [
      null,
      "Seviye tespit",
      "Seviye tespit, A1–B2 dil düzeyine yönelik başlangıç önerisi verir. Bu sonuç, uygulamanın 1–40 gelişim seviyesinden farklıdır. Daha üst dersler için gelişim seviyesi ve önceki dersleri bitirme koşulları devam eder. "
    ]
  ],
  "tab-aktiviteler": [
    [
      "#tab-aktiviteler .az-grid2x2",
      "Tek kişilik oyunlar ve ünite seçimi",
      "Tek kişilik veya iki kişilik sekmesini seç. Klasik kelime oyunlarında başlangıç ekranındaki sınıf ve ünite seçimi havuzu belirler. Kilitli oyun gereken seviyede açılır; cümle oyunlarında içerik sınıf seviyesine göre seçilebilir. "
    ],
    [
      "#tab-aktiviteler [onclick*='kelimeYarismasiAc']",
      "Kelime Laboratuvarı",
      "Kelimeyi gör ve dinle, doğru Türkçe anlamı seç. 3. seviyede açılır. "
    ],
    [
      null,
      "Hafıza Sandığı",
      "İngilizce ve Türkçe kartları eşleştir. Açtığın kartları aklında tut; hatalı eşleşmeleri azalt. 6. seviyede açılır. "
    ],
    [
      null,
      "Eksik Harf",
      "Kelimedeki eksik harfleri tamamla ve kontrol et. 11. seviyede açılır. "
    ],
    [
      null,
      "Harf Avı",
      "Harfleri seçerek gizli kelimeyi bul. Yanlış harf hakkını ekrandan izle. 14. seviyede açılır. "
    ],
    [
      null,
      "Eş Bul",
      "İngilizce kelimeler ile Türkçe karşılıklarını eşleştir. 19. seviyede açılır. "
    ],
    [
      null,
      "Risk Balonları",
      "Balon ve soru seçimini yap; doğru anlamı bul. Zorluk ve puan bilgilerini oyun ekranında kontrol et. 22. seviyede açılır. "
    ],
    [
      null,
      "Kulak Dedektifi",
      "Dinle ile kelimeyi duy, İngilizcesini yazıp Kontrol et’e bas. Kaplumbağa düğmesi yavaş okur. 24. seviyede açılır. "
    ],
    [
      null,
      "Şifre Kırıcı",
      "Kelimeyi tahmin et; renkli harf ipuçlarını izleyerek doğru harfi doğru yere koy. 27. seviyede açılır. "
    ],
    [
      null,
      "Hız Fırtınası",
      "Kelime düşmeden doğru anlamı seç; hız ve doğruluğu birlikte koru. 28. seviyede açılır. "
    ],
    [
      null,
      "Kelime Treni",
      "Türkçe anlamı verilen cümlenin İngilizce kelimelerini sırayla yerleştir; varsa fazla kelimeleri kullanma. 31. seviyede açılır. "
    ],
    [
      null,
      "Cümle Ustası",
      "Karışık kelimelerden doğru İngilizce cümleyi oluştur. Sınıf düzeyine uygun cümlelerle çalış. 36. seviyede açılır. "
    ],
    [
      "#hbActivityCard",
      "Harf Bahçesi",
      "Harflerden istenen İngilizce kelimeyi oluştur. Oyunun ipucu, kontrol ve joker düğmelerini kullan. 39. seviyede açılır. "
    ],
    [
      "#papiCardsActivity",
      "Papi Kartları",
      "Sınıf ve ünite seçilir; isim alanı boş kalabilir veya istediğin isim yazılabilir. Seçilen ünitenin bütün uygun kelimeleri kullanılır, her yeni başlangıçta sıra karıştırılır. Kart geldiğinde İngilizce sesli okunur; hoparlör tekrar dinletir. Çevir Türkçeyi açar; ardından Biliyorum veya Tekrar çalış seç. Tekrar kelimeleri desteye geri döner. Puan ilk tur öz değerlendirmenden hesaplanır; tekrarlar puanı şişirmez. Sonuç o sınıf ve üniteye özel sıralamaya yazılır. Süre sınırı, enerji harcaması, altın, XP veya hediye yoktur. "
    ],
    [
      "#wordWheelActivity",
      "Papi’nin Kelime Çarkı",
      "1 veya 2 kişi, sınıf ve ünite seç; oyuncu isimleri isteğe bağlıdır. Seçilen ünitenin mevcut ve ek kelimeleri karıştırılır; iki oyuncu sırayla oynar. Çark puanları: 50, 100, 150, 200, 250, 300, 400, 500, 600, 750, 900, 1000. Çark durunca soru gelir. Doğru cevap puanı ekler, yanlış çıkarır; puan eksiye düşebilir. Çark sesi açılıp kapatılabilir. Oyunu sonlandır mevcut puanları kaydeder; cevaplanmamış soru puan getirmez. Kaldığım oyuna dön seçeneğiyle devam edebilirsin. Sonuç ve sıralama ayrı tutulur; altın, XP, hediye veya enerji maliyeti yoktur. "
    ],
    [
      "#dmDuoTab",
      "İki kişilik oyunlar ve davet",
      "İki kişilik sekmesinden oyun seç ve takip ettiğin kişilerden davet gönder. Kelime Uçuşu İngilizce kelimenin anlamını, Cümle Rotası cümlenin anlamını buldurur. İki oyuncu aynı soruları görür; farklı sınıflarda küçük sınıfın havuzu kullanılır. Aynı anda modunda herkes Hazırım der ve ortak geri sayım başlar. Farklı zamanda modunda 24 saat içinde ayrı turlar tamamlanır. 8 soru, her soruya 12 saniye ve 4 enerji kuralı vardır. Bağlantı koparsa karşılaşmayı yeniden aç; süre işlemeye devam edebilir. Papi’nin Kelime Çarkı’nın 2 kişilik modu ise aynı ekranda sırayla oynanır. "
    ]
  ],
  "oyun": [
    [
      null,
      "Hız, kombo, yıldız ve sonuç",
      "Klasik oyun puanı temel puan + hız bonusu − hata cezasıdır; 1000 puan tavanı yoktur. Yanlış cevap −40 puan, tur XP’sinden −3 getirir. Hız bonusu doğru cevaplarla oluşur; hiç doğru yoksa altın ve XP verilmez. Art arda doğru cevaplar kombo animasyonu ve oyunun seri bonusunu tetikler. Yıldızlar doğru oranına göre belirlenir. Sonuç ekranında temel puan, süre, doğru/yanlış, kazanılan XP ve altın ile sıralama durumunu kontrol et. Papi Kartları ve Kelime Çarkı bu ödül sistemine dahil değildir. "
    ],
    [
      null,
      "Tekrar oynama ve kayıt durumu",
      "Ödüllü klasik oyunda aynı oyun ve ünite için 24 saatlik ödül bekleme süresi bulunur. Tekrar turu liderlik sonucu sağlayabilir; aynı ödülü tekrar vermez. Günün ilk 3 uygun oyunu çift ödül, 12. oyundan sonraki oyunlar yarım ödül kuralına tabidir; güçlendiriciler ve doğruluk koşulları ayrıca uygulanır. Kaydediliyor ile kaydedildi farklı durumlardır. İnternet kesilirse uygulamayı yeniden bağla, sonuç uyarısını ve tekrar dene düğmesini kullan; aynı tur için ikinci ödül oluşmaz. "
    ],
    [
      "#jkBar",
      "Joker hakları ve güçlendiriciler",
      "Joker çubuğu oyunun desteklediği ipuçlarını gösterir: yanlış şıkları azaltma, harf açma, cevabı fısıldama, pas ve kalkan gibi. 15. seviyede 1, 20. seviyede 2, 30. seviyede 3 kullanım hakkı bulunur. 30. seviyeden sonra dolaptan alınan ek joker hakkıyla 4. kullanım yapılabilir. Joker dükkânı 18. seviyede açılır. Satın alınan stok ile tur kullanım sınırı farklıdır. Çift Puan, XP Tılsımı, Altın Mıknatısı ve Bedava Bilet gibi güçlendiricilerin hangi değeri etkilediğini ve kullanım koşulunu ürün açıklamasından kontrol et. "
    ],
    [
      null,
      "Ses, Android ve mikrofon sorunları",
      "Telefonun medya sesini yükselt; Bluetooth veya kulaklığa ses yönlenip yönlenmediğini kontrol et. Android’de metinden sese motorunun ve İngilizce ses verisinin etkin olduğundan emin ol; ses bulunamazsa uygulama uyarı verir. Dinle düğmesine yeniden dokun, gerekirse güncel Chrome’dan dene. Mikrofon için tarayıcı/uygulama izinlerinde mikrofonu aç. Cihazın konuşma tanıma desteği yoksa Yazarak cevapla seçeneğini kullan. Amerikan/İngiliz aksanı seçenekleri cihazda bulunan seslere bağlıdır. "
    ]
  ],
  "tab-derscalis": [
    [
      "#tab-derscalis .dc-hero",
      "Ders Çalış: konu, örnek ve test",
      "Konuyu seç, anlatım ve örnekleri incele, örnek cümleleri dinle, testi tamamla. Konu Macerası varsa kartlar ve final adımıyla ilerle. İlk tamamlama ve tekrar ödülü farklı olabilir; gerçek kazanımı sonuç ekranında gör. "
    ],
    [
      "#tab-derscalis .dc-level-grid",
      "A1–B2 ders kilitleri",
      "A1 1., A2 9., B1 16., B2 23. gelişim seviyesinde açılır. A2, B1 ve B2 için önceki ders seviyesinin tamamı bitmelidir. Öğretmenin verdiği ödevin erişim kuralı farklı olabilir. "
    ],
    [
      "#dcAramaInput",
      "Konu arama, kelime anlamı ve aksan",
      "Arama alanına konu adını yaz. Açıklamadaki işaretli kelimelere dokunarak anlamlarını gör. Amerikan/İngiliz aksanı seçeneği cihazındaki seslere bağlıdır; Dinle düğmesi örnek cümleyi yeniden okur. "
    ]
  ],
  "tab-konusmapratigi": [
    [
      null,
      "MeduPro parkurları",
      "MeduPro 10. seviyede açılır. Kelime Modu 10., Papağanla Sohbet 20., Kelime Kartları 30. seviyede açılır. Bu parkurlar, Aktiviteler’deki Papi Kartları etkinliğinden farklıdır. "
    ],
    [
      "#kpMikBtn",
      "Kelime Modu: söyle veya yaz",
      "Türkçe kelimenin İngilizcesini mikrofona söyle. Mikrofon izni gerekiyorsa kabul et; çalışmazsa Yazarak cevapla seçeneğini kullan. Atladığın veya yanlış yaptığın kelimeleri sonra tekrar çalış; joker çubuğundaki hakkını kontrol et. "
    ],
    [
      null,
      "Ses, Android ve mikrofon sorunları",
      "Telefonun medya sesini yükselt; Bluetooth veya kulaklığa ses yönlenip yönlenmediğini kontrol et. Android’de metinden sese motorunun ve İngilizce ses verisinin etkin olduğundan emin ol; ses bulunamazsa uygulama uyarı verir. Dinle düğmesine yeniden dokun, gerekirse güncel Chrome’dan dene. Mikrofon için tarayıcı/uygulama izinlerinde mikrofonu aç. Cihazın konuşma tanıma desteği yoksa Yazarak cevapla seçeneğini kullan. Amerikan/İngiliz aksanı seçenekleri cihazda bulunan seslere bağlıdır. "
    ]
  ],
  "kp-oyun": [
    [
      "#kpMikBtn",
      "Kelime Modu: söyle veya yaz",
      "Türkçe kelimenin İngilizcesini mikrofona söyle. Mikrofon izni gerekiyorsa kabul et; çalışmazsa Yazarak cevapla seçeneğini kullan. Atladığın veya yanlış yaptığın kelimeleri sonra tekrar çalış; joker çubuğundaki hakkını kontrol et. "
    ],
    [
      null,
      "Hız, kombo, yıldız ve sonuç",
      "Klasik oyun puanı temel puan + hız bonusu − hata cezasıdır; 1000 puan tavanı yoktur. Yanlış cevap −40 puan, tur XP’sinden −3 getirir. Hız bonusu doğru cevaplarla oluşur; hiç doğru yoksa altın ve XP verilmez. Art arda doğru cevaplar kombo animasyonu ve oyunun seri bonusunu tetikler. Yıldızlar doğru oranına göre belirlenir. Sonuç ekranında temel puan, süre, doğru/yanlış, kazanılan XP ve altın ile sıralama durumunu kontrol et. Papi Kartları ve Kelime Çarkı bu ödül sistemine dahil değildir. "
    ],
    [
      null,
      "Tekrar oynama ve kayıt durumu",
      "Ödüllü klasik oyunda aynı oyun ve ünite için 24 saatlik ödül bekleme süresi bulunur. Tekrar turu liderlik sonucu sağlayabilir; aynı ödülü tekrar vermez. Günün ilk 3 uygun oyunu çift ödül, 12. oyundan sonraki oyunlar yarım ödül kuralına tabidir; güçlendiriciler ve doğruluk koşulları ayrıca uygulanır. Kaydediliyor ile kaydedildi farklı durumlardır. İnternet kesilirse uygulamayı yeniden bağla, sonuç uyarısını ve tekrar dene düğmesini kullan; aynı tur için ikinci ödül oluşmaz. "
    ],
    [
      "#jkBar",
      "Joker hakları ve güçlendiriciler",
      "Joker çubuğu oyunun desteklediği ipuçlarını gösterir: yanlış şıkları azaltma, harf açma, cevabı fısıldama, pas ve kalkan gibi. 15. seviyede 1, 20. seviyede 2, 30. seviyede 3 kullanım hakkı bulunur. 30. seviyeden sonra dolaptan alınan ek joker hakkıyla 4. kullanım yapılabilir. Joker dükkânı 18. seviyede açılır. Satın alınan stok ile tur kullanım sınırı farklıdır. Çift Puan, XP Tılsımı, Altın Mıknatısı ve Bedava Bilet gibi güçlendiricilerin hangi değeri etkilediğini ve kullanım koşulunu ürün açıklamasından kontrol et. "
    ],
    [
      null,
      "Ses, Android ve mikrofon sorunları",
      "Telefonun medya sesini yükselt; Bluetooth veya kulaklığa ses yönlenip yönlenmediğini kontrol et. Android’de metinden sese motorunun ve İngilizce ses verisinin etkin olduğundan emin ol; ses bulunamazsa uygulama uyarı verir. Dinle düğmesine yeniden dokun, gerekirse güncel Chrome’dan dene. Mikrofon için tarayıcı/uygulama izinlerinde mikrofonu aç. Cihazın konuşma tanıma desteği yoksa Yazarak cevapla seçeneğini kullan. Amerikan/İngiliz aksanı seçenekleri cihazda bulunan seslere bağlıdır. "
    ]
  ],
  "tab-sohbet": [
    [
      null,
      "Papağanla Sohbet",
      "Seviyene uygun diyalogda Papi’nin sorusunu dinle, yazarak veya mikrofonla cevapla. İpucu ve örnek cevapları incele. Bölüm veya dil seviyesi kilitliyse ekrandaki koşulu tamamlayıp yeniden dene. "
    ]
  ],
  "kk": [
    [
      "#seviyeYolAlani",
      "MeduPro Kelime Kartları",
      "Adalar sınıf ve ünite çalışmalarını temsil eder. Sıradaki açık adayı seç, verilen kelimeleri incele ve tamamlanma koşulunu yerine getir. Tamamlanan ve kilitli adaları haritadan izle; Papi Kartları ayrı bir etkinliktir. "
    ]
  ],
  "tab-meduakis": [
    [
      "#maSegment",
      "Medu Akış, Keşfet ve takip",
      "Akışta başarıları izle ve uygun seviyede beğen/tebrik et. Keşfet’te öğrencileri ara; profilinden takip et. Çevrimiçi etiketi yakın zamandaki etkinliği gösterir. Akış erişimi hesabının açılış koşullarına bağlıdır. "
    ],
    [
      "#zlBtn",
      "Vitrin ve bildirimler",
      "Vitrininde rozetlerini ve gelişimini göster. Bildirim zilinde takip, tebrik, mesaj, hediye ve düello haberlerini kontrol et. Okunmamış sayısına ve ilgili karşılaşmanın durumuna bak. "
    ],
    [
      null,
      "Düello ve karşılaşmalar",
      "Düello 20. seviyede açılır. Öğrenci profilindeki Düelloya çağır bölümünden uygun oyunu seç. Klasik davet ve kabul sonrası oynama süreleri 24 saattir. Sonuçlar iki oyuncu tamamlayınca karşılaştırılır. "
    ],
    [
      null,
      "Hazır mesaj, engelleme ve hediyeler",
      "Hazır mesajlar 25., enerji hediyesi 30., aksesuar hediyesi 35. seviyede açılır. Profilden hazır mesajı seç veya hediye fiyatını onayla. Engelleme iki tarafın takip, mesaj, hediye ve düellosunu kapatır; engeli kaldırabilirsin. "
    ],
    [
      null,
      "Haftalık lig ve ödüller",
      "Ligler haftalık XP ve seviye koşuluyla belirlenir; sadece ilk 10’a bakılarak lig atanmaz. Yerel Lig 5. seviyede, Süper Lig 10. seviyede ve haftalık 750 XP’de, Şampiyonlar Ligi 15. seviyede ve haftalık 1800 XP’de açılır. Ödül koşullarını ve tutarlarını Lig ekranında gör: Şampiyonlar Ligi ilk 3’ü özel ödüllendirilir; diğer uygun dereceler daha küçük ödül alır, kapsam dışındaki sıralara ödül verilmez. Haftalık sıfırlamada lig XP’si yenilenir, toplam gelişim XP’n korunur. Haftalık performans özeti geçmiş haftanı gösterir. "
    ]
  ],
  "tab-magaza": [
    [
      "#bcMgBar",
      "Mağaza, Dolap ve avatar",
      "Mağaza, Dolap ve avatar seçimi 15. seviyede açılır. Sahip olduğun ürünü tak; kilitli ürünün seviyesini, fiyatını ve altınını kontrol et. Satın alma öncesi ürünü dene; kategoriler ilerledikçe açılır. "
    ],
    [
      null,
      "Koleksiyon ve vitrinler",
      "Karakter koleksiyonu 20. seviyede açılır. Dolapta sahip olduklarını ve kilitli ürünleri filtrele. Vitrinler 15, 20, 25, 30, 35 ve 40. seviyelerde genişler; profilinde kullanmak istediğin görseli seç. "
    ],
    [
      null,
      "Sandıklar ve koşulları",
      "Seviye sandıkları 5/14/24/34/40 seviyelerde açılır. Bronz için ana parkurda ilk 3 durak, Gümüş için ana parkurun yarısı, Altın için ilk 2 parkur, Kristal için ilk 3 parkur, Efsane için tüm parkurlar koşulu vardır. Hem seviyen hem ilerlemen sağlanınca Aç düğmesi etkinleşir; alınmış sandık yeniden ödül vermez. Diğer sandık/ürün seçeneklerinde fiyat ve açıklamayı ayrıca kontrol et. "
    ]
  ],
  "tab-profil": [
    [
      "#bdKart",
      "Profil, rozetler ve grafikler",
      "Profilinde gerçek profil görselini, küçük seviye rozetini, genel puanını ve ilerlemeni gör. Grafiklerde çalışma ve beceri gelişimini incele; kitap/sayfa hedeflerini ve kazandığın rozetleri takip et. "
    ],
    [
      null,
      "Hesap ayarları ve giriş",
      "E-posta/şifre veya Google girişini kullan. Google ile ilk girişte istenen kullanıcı adı ve diğer bilgileri tamamla; yeni Google hesapları öğretmen onayı beklemez. E-postayla kayıt akışında doğrulama bağlantısını aç. Hesap ayarları kişisel bilgiler, şifre değiştirme ve gizlilik bağlantısını içerir. Okul/veli iletişim bilgileri isteniyorsa doğru gir. Şifre yenilemede gelen son bağlantıyı kullan; şifreni kimseyle paylaşma. "
    ],
    [
      null,
      "Hesap silme ve kişisel veriler",
      "Hesap ayarları › Hesabımı sil bağlantısını aç. Ayrı sayfada doğrulama ve son onay istenir. Kalıcı silme koşullarını ve hangi verilerin silindiğini o sayfada oku; bu işlem uygulamadan çıkış yapmakla aynı değildir. "
    ]
  ],
  "ba-oyun": [
    [
      ".bc-d.simdi",
      "Ana parkur ve duraklar",
      "Ana parkur ilk seviyede açıktır. Papi’nin bulunduğu sıradaki durağa dokun, başlangıç kartını oku ve soruları çöz. Tamamlanan duraklarda ilerlemeni ve yıldızlarını görebilirsin. Tüm durakları göster ile yolun tamamına bak. "
    ],
    [
      "#pkSekmeler",
      "Dört parkur ve seviye kapıları",
      "Ana parkur açıktır; diğer parkurlar 10., 20. ve 30. seviyelerde açılır. MeduPro’da Kelime Modu, Papağanla Sohbet ve Kelime Kartları yer alır. Kilitli bölümde gereken seviye yazısını kontrol et. "
    ],
    [
      null,
      "Hız, kombo, yıldız ve sonuç",
      "Klasik oyun puanı temel puan + hız bonusu − hata cezasıdır; 1000 puan tavanı yoktur. Yanlış cevap −40 puan, tur XP’sinden −3 getirir. Hız bonusu doğru cevaplarla oluşur; hiç doğru yoksa altın ve XP verilmez. Art arda doğru cevaplar kombo animasyonu ve oyunun seri bonusunu tetikler. Yıldızlar doğru oranına göre belirlenir. Sonuç ekranında temel puan, süre, doğru/yanlış, kazanılan XP ve altın ile sıralama durumunu kontrol et. Papi Kartları ve Kelime Çarkı bu ödül sistemine dahil değildir. "
    ],
    [
      null,
      "Tekrar oynama ve kayıt durumu",
      "Ödüllü klasik oyunda aynı oyun ve ünite için 24 saatlik ödül bekleme süresi bulunur. Tekrar turu liderlik sonucu sağlayabilir; aynı ödülü tekrar vermez. Günün ilk 3 uygun oyunu çift ödül, 12. oyundan sonraki oyunlar yarım ödül kuralına tabidir; güçlendiriciler ve doğruluk koşulları ayrıca uygulanır. Kaydediliyor ile kaydedildi farklı durumlardır. İnternet kesilirse uygulamayı yeniden bağla, sonuç uyarısını ve tekrar dene düğmesini kullan; aynı tur için ikinci ödül oluşmaz. "
    ],
    [
      "#jkBar",
      "Joker hakları ve güçlendiriciler",
      "Joker çubuğu oyunun desteklediği ipuçlarını gösterir: yanlış şıkları azaltma, harf açma, cevabı fısıldama, pas ve kalkan gibi. 15. seviyede 1, 20. seviyede 2, 30. seviyede 3 kullanım hakkı bulunur. 30. seviyeden sonra dolaptan alınan ek joker hakkıyla 4. kullanım yapılabilir. Joker dükkânı 18. seviyede açılır. Satın alınan stok ile tur kullanım sınırı farklıdır. Çift Puan, XP Tılsımı, Altın Mıknatısı ve Bedava Bilet gibi güçlendiricilerin hangi değeri etkilediğini ve kullanım koşulunu ürün açıklamasından kontrol et. "
    ],
    [
      null,
      "Ses, Android ve mikrofon sorunları",
      "Telefonun medya sesini yükselt; Bluetooth veya kulaklığa ses yönlenip yönlenmediğini kontrol et. Android’de metinden sese motorunun ve İngilizce ses verisinin etkin olduğundan emin ol; ses bulunamazsa uygulama uyarı verir. Dinle düğmesine yeniden dokun, gerekirse güncel Chrome’dan dene. Mikrofon için tarayıcı/uygulama izinlerinde mikrofonu aç. Cihazın konuşma tanıma desteği yoksa Yazarak cevapla seçeneğini kullan. Amerikan/İngiliz aksanı seçenekleri cihazda bulunan seslere bağlıdır. "
    ]
  ],
  "papi-cards": [
    [
      "#papiCardsActivity",
      "Papi Kartları",
      "Sınıf ve ünite seçilir; isim alanı boş kalabilir veya istediğin isim yazılabilir. Seçilen ünitenin bütün uygun kelimeleri kullanılır, her yeni başlangıçta sıra karıştırılır. Kart geldiğinde İngilizce sesli okunur; hoparlör tekrar dinletir. Çevir Türkçeyi açar; ardından Biliyorum veya Tekrar çalış seç. Tekrar kelimeleri desteye geri döner. Puan ilk tur öz değerlendirmenden hesaplanır; tekrarlar puanı şişirmez. Sonuç o sınıf ve üniteye özel sıralamaya yazılır. Süre sınırı, enerji harcaması, altın, XP veya hediye yoktur. "
    ],
    [
      null,
      "Ses, Android ve mikrofon sorunları",
      "Telefonun medya sesini yükselt; Bluetooth veya kulaklığa ses yönlenip yönlenmediğini kontrol et. Android’de metinden sese motorunun ve İngilizce ses verisinin etkin olduğundan emin ol; ses bulunamazsa uygulama uyarı verir. Dinle düğmesine yeniden dokun, gerekirse güncel Chrome’dan dene. Mikrofon için tarayıcı/uygulama izinlerinde mikrofonu aç. Cihazın konuşma tanıma desteği yoksa Yazarak cevapla seçeneğini kullan. Amerikan/İngiliz aksanı seçenekleri cihazda bulunan seslere bağlıdır. "
    ]
  ],
  "word-wheel": [
    [
      "#wordWheelActivity",
      "Papi’nin Kelime Çarkı",
      "1 veya 2 kişi, sınıf ve ünite seç; oyuncu isimleri isteğe bağlıdır. Seçilen ünitenin mevcut ve ek kelimeleri karıştırılır; iki oyuncu sırayla oynar. Çark puanları: 50, 100, 150, 200, 250, 300, 400, 500, 600, 750, 900, 1000. Çark durunca soru gelir. Doğru cevap puanı ekler, yanlış çıkarır; puan eksiye düşebilir. Çark sesi açılıp kapatılabilir. Oyunu sonlandır mevcut puanları kaydeder; cevaplanmamış soru puan getirmez. Kaldığım oyuna dön seçeneğiyle devam edebilirsin. Sonuç ve sıralama ayrı tutulur; altın, XP, hediye veya enerji maliyeti yoktur. "
    ],
    [
      null,
      "Ses, Android ve mikrofon sorunları",
      "Telefonun medya sesini yükselt; Bluetooth veya kulaklığa ses yönlenip yönlenmediğini kontrol et. Android’de metinden sese motorunun ve İngilizce ses verisinin etkin olduğundan emin ol; ses bulunamazsa uygulama uyarı verir. Dinle düğmesine yeniden dokun, gerekirse güncel Chrome’dan dene. Mikrofon için tarayıcı/uygulama izinlerinde mikrofonu aç. Cihazın konuşma tanıma desteği yoksa Yazarak cevapla seçeneğini kullan. Amerikan/İngiliz aksanı seçenekleri cihazda bulunan seslere bağlıdır. "
    ]
  ],
  "level-guide": [
    [
      null,
      "1. seviye · Yumurtadan Çıkan Papi",
      "Ana parkur. Ders Çalış · A1. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "2. seviye · Meraklı Yavru",
      "Meraklı Yavru rozeti. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "3. seviye · Oyuncu Yavru",
      "Kelime Laboratuvarı. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "4. seviye · Parlayan Tüy",
      "Parlayan Tüy rozeti. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "5. seviye · Minik Kanat",
      "Yerel Lig. Parkur altın hediyeleri. Bronz sandık. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "6. seviye · Hatırlayan Gaga",
      "Hafıza Sandığı. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "7. seviye · Cesur Yavru",
      "Cesur Yavru rozeti. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "8. seviye · Hikâye Kuşu",
      "Okuma Stüdyosu. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "9. seviye · Sözcük Çırağı",
      "A2 dersleri · A1 tamamlanınca. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "10. seviye · Kâşif Papağan",
      "İkinci parkur. Keşfet. Beğeni ve tebrik. Süper Lig · haftalık 750 XP. MeduPro. Kelime Modu. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "11. seviye · Dikkatli Gaga",
      "Eksik Harf. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "12. seviye · Görev Kanadı",
      "Günlük görevler. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "13. seviye · Sabırlı Papağan",
      "Pomodoro. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "14. seviye · Gümüş Tüy",
      "Harf Avı. Gümüş sandık. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "15. seviye · Renkli Kanat",
      "Mağaza ve ilk vitrin. Avatar seçimi. Zor kelimeler. Takip. Oyun başına 1 joker. Şampiyonlar Ligi · haftalık 1800 XP. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "16. seviye · Hedef Kanadı",
      "Haftalık hedef. B1 dersleri · A2 tamamlanınca. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "17. seviye · Süslü Tepe",
      "Saç stilleri. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "18. seviye · Sihirli Gaga",
      "Joker dükkânı. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "19. seviye · Uyumlu Kanat",
      "Eşini Bul. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "20. seviye · Meydan Okuyan Papi",
      "Üçüncü parkur. Düello. Karakter koleksiyonu. İkinci vitrin. Üst giyim. Oyun başına 2 joker. Papağanla Sohbet. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "21. seviye · Yıldız Tüy",
      "Yıldız Tüy rozeti. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "22. seviye · Cesur Gaga",
      "Risk Balonları. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "23. seviye · Bilge Papağan",
      "B2 dersleri · B1 tamamlanınca. Alt giyim. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "24. seviye · Altın Kanat",
      "Dikte. Altın sandık. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "25. seviye · Sohbetçi Papağan",
      "Mesaj gönderme. Tüm orta seviye ürünler. Üçüncü vitrin. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "26. seviye · Çevik Pençe",
      "Ayakkabılar. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "27. seviye · Sözcük Avcısı",
      "Şifre Kırıcı. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "28. seviye · Işıltılı Tüy",
      "Hız Fırtınası. Işıltılı Tüy rozeti. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "29. seviye · Zarif Kanat",
      "Aksesuarlar. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "30. seviye · Dost Kanat",
      "Dördüncü parkur. İki kişilik oyunlar. Enerji hediyesi. Pro ürünler. Dördüncü vitrin. Oyun başına 3 joker. Kelime Kartları. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "31. seviye · Gezgin Papağan",
      "Kelime Treni. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "32. seviye · Taçlı Tepe",
      "Baş aksesuarları. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "33. seviye · Usta Gaga",
      "Usta Gaga rozeti. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "34. seviye · Kristal Kanat",
      "Kristal sandık. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "35. seviye · Görkemli Papağan",
      "Diğer hediyeler. Kombinler. Beşinci vitrin. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "36. seviye · Cümle Ustası Papi",
      "Cümle Kurma. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "37. seviye · Efsane Tüy",
      "Efsane Tüy rozeti. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "38. seviye · Işığın Kanadı",
      "Görünüm efektleri. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "39. seviye · Ormanın Sesi",
      "Harf Bahçesi. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ],
    [
      null,
      "40. seviye · Efsane Papağan",
      "Altıncı vitrin. Efsane Papağan rozeti. Efsane sandık. En değerli parkur altını. Özelliğin kilit kartında ek ilerleme koşulu varsa onu da tamamla."
    ]
  ]
};
  root.DijiPapiGuide = { version: 1, sections, tours };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DijiPapiGuide;
})(typeof window !== 'undefined' ? window : globalThis);
