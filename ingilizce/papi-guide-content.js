/* Yardım Köşesi içeriği (Ekim 2026 güncel). Her bölüm: id, icon, title, context
   (ilgili sayfa), selector (varsa ilgili alan), text (düz metin, arama için) ve
   html (Yardım'da gösterilen biçim). Paragraflar "p" dizisinden üretilir. */
(function(root){'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bold=x=>esc(x).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const S=(id,icon,title,context,selector,p)=>({id,icon,title,context,selector,text:p.map(x=>x.replace(/\*\*/g,'')).join(' '),html:p.map(x=>'<p>'+bold(x)+'</p>').join('')});
const sections=[
 S('whats-new-2026','✨','Yenilikler','ana',null,[
  '**Yeni soru ekranları:** Macera Haritası ve Öğrenme Yolu soruları daha sade. Üstte kapat, ilerleme, enerji ve tüy; altta tek bir ana düğme var.',
  '**Papi tanıtımları:** İlk girişte Papi uygulamayı kısaca gezdirir. Sonraki girişlerde her seferinde bir sayfayı ayrıntılı tanıtmayı önerir.',
  '**Günün 3 Görevi ve haftalık hedef:** Parkur › Görevler’de ve Profil › Ödevlerim’de.',
  '**Oyunlar:** Konu Oyunları ve Mola Vakti eklendi. Her oyun turu ödül kazandırır.'
 ]),
 S('welcome','🦜','Papi ile başlangıç','ana',null,[
  'Üye olduktan sonra önce yolunu (Macera Haritası ya da Öğrenme Yolu) ve karakterini seçersin. Ardından Papi uygulamayı 1 dakikada gezdirir; bu tanıtım bir kez gösterilir.',
  'Sonraki girişlerde Papi sırayla Parkur, Arkadaşlar, Oyunlar, Mağaza ve Çantam, Ders Çalış ve Profil sayfalarını ayrıntılı tanıtmayı önerir. “Sonra” dersen öneri bir sonraki girişine kalır.'
 ]),
 S('navigation','🧭','Alt menü ve üst çubuk','ana','#bottomNavMobile',[
  '**Alt menü** soldan sağa: Parkur, Arkadaşlar, Oyunlar, Ders Çalış, Mağaza ve Profil.',
  '**Üst çubuk:** enerjin, altının, XP’n ve aktif kullanım yıldızların. Enerjiye dokunursan dolum bilgisini, altına dokunursan Mağaza’yı, XP’ye dokunursan İlerlemem’i açarsın.',
  'Kilit işareti olan bir özellik, yanında yazan seviyeye ulaşınca açılır.'
 ]),
 S('routes','🗺️','İki yol: Macera Haritası ve Öğrenme Yolu','ana','.rt-v3-switch',[
  '**Macera Haritası (Okul Yolum):** 1–8. sınıf öğrencileri için. Okuldaki sınıf ve ünite sırasıyla ilerler.',
  '**Öğrenme Yolu:** Kendi hedefin için. İngilizce seviyene (A1, A2…) göre temalar ve kısa derslerle ilerler.',
  'Yolunu Parkur’daki değiştir düğmesinden ya da Profil › Parkur Değiştir’den değiştirebilirsin. İki yoldaki ilerlemen de korunur.',
  'Sınıfı kayıtlı öğrenciler Öğrenme Yolu’na geçmeden önce seviye testini çözmelidir.'
 ]),
 S('mainpath','🏁','Parkur sayfası','ana','.rt-v3-map',[
  '**Üst kart:** sınıfın ya da seviyen, ünite ve kaç durak bitirdiğin. Dokunursan tüm durakların listesi açılır.',
  '**Durak haritası:** kaydırarak gezersin. Bitirdiğin duraklar işaretlenir, sıradaki durak öne çıkar, kilitli duraklar sırası gelince açılır.',
  '**Devam et:** kaldığın duraktan başlar.',
  '**Planım:** bugün çalışman önerilen dersler. **Görevler:** günlük ve haftalık görevlerin. **Sandık:** hazır olunca üzerinde AÇ yazar.'
 ]),
 S('stops','🧩','Duraklar ve soru türleri','ana',null,[
  'Her durak önce yeni kelimeleri dinleyip öğrendiğin bir adımla başlar, sonra sorular gelir.',
  '**Soru türleri:** İngilizcesini ya da Türkçesini seç, dinle ve seç, dinle ve söyle, anlamları eşleştir, eksik harfi tamamla, harflerle kelime kur, ifadeyi ya da cümleyi sıraya koy, cümleyi tamamla. Durağın sonunda kelime kartlarıyla son bir tekrar yaparsın.',
  'Yanlış cevapta doğrusu gösterilir ve kelime Kelime Tekrarı listene eklenir.',
  '**Dinle ve söyle:** mikrofon çalışmazsa duyduğun kelimeyi seçenekler arasından seçebilirsin.'
 ]),
 S('energy','⚡','Enerji','ana','.dm-unified-wallet [data-pw="energy"]',[
  'Enerjin en fazla 30 olur ve her 15 dakikada 1 dolar.',
  'Parkurda öğrenme adımı ve ilk soru ücretsizdir; sonraki her soru 1 enerji harcar. Seviye testi ve Kelime Tekrarı enerji harcamaz.',
  'Macera Haritası’nda üst üste 3 doğru cevap bonus enerji kazandırabilir.',
  'Enerjin biterse Mağaza › Enerji al bölümünden altınla paket alabilirsin: 5 enerji 100, 10 enerji 130, 15 enerji 180 altın. Günde en fazla 3 paket alabilirsin; paket, enerji kapasiteni aşacaksa alınamaz.'
 ]),
 S('currency','🪙','Altın, XP ve seviye','ana','#dmLevelBadge',[
  '**XP** seviye atlamanı sağlar ve haftalık ligde sıralamanı belirler. **Altın** Mağaza’da harcanır. Ders çalıştıkça, oynadıkça ve görev tamamladıkça ikisini de kazanırsın.',
  '1’den 40’a kadar seviye vardır; ileri seviyeler daha fazla XP ister. Her seviyede yeni bir rozet, oyun ya da özellik açılır. Ayrıntılar Profil › İlerlemem’de.',
  '**Bazı açılışlar:** 3 Kelime Laboratuvarı, 5 Lig ve Bronz sandık, 10 Keşfet ve tebrik, 15 Takip, vitrin ve jokerler, 18 Joker dükkânı, 20 Düello, 25 Hazır mesajlar, 30 İki kişilik oyunlar ve enerji hediyesi, 35 Aksesuar hediyesi, 40 Efsane sandık.'
 ]),
 S('goals','🎯','Günün 3 Görevi ve haftalık hedef','tab-sanaozel','[data-rt="missions"]',[
  'Günün 3 Görevi her gün yenilenir; haftalık hedef haftaya yayılır. İkisini de Parkur › Görevler’den ya da Profil › Ödevlerim’den izleyebilirsin.',
  'Görevler hesap bilgilerin yüklendikten sonra otomatik güncellenir. Boş görünürse internet bağlantını kontrol et.'
 ]),
 S('homework','📝','Ödevlerim','tab-sanaozel',null,[
  'Profil › Ödevlerim’de öğretmeninin verdiği ödevler, Günün 3 Görevi, haftalık hedefin, Okuma Stüdyosu, Pomodoro sayacı ve Zor Kelimelerim yer alır.',
  'Ödev kartından ilgili çalışmayı aç ve tamamlanma koşulunu kontrol et; çalışmayı açmak tek başına ödevi bitirmez.'
 ]),
 S('placement','📊','Seviye Testi','ana',null,[
  'Profil › Seviye Testi’nden İngilizce seviyeni ölçebilirsin. Okuma, dinleme ve dil kullanımı soruları vardır; yaklaşık 20–25 dakika sürer ve enerji harcamaz.',
  'Sonuç yaklaşık bir CEFR (A1–B2) ön değerlendirmesidir ve sana uygun başlangıç önerir. Bu, uygulamadaki 1–40 gelişim seviyesinden farklıdır.'
 ]),
 S('review','🔁','Kelime Tekrarı','ana',null,[
  'Profil › Kelime Tekrarı’nda yanlış yaptığın kelimeleri enerji harcamadan tekrar edersin. Kelimeler kalıcı olsun diye farklı günlerde yeniden karşına çıkar.'
 ]),
 S('lessons','📚','Ders Çalış','tab-derscalis','#tab-derscalis .dc-level-grid',[
  'A1’den B2’ye seviyeni seç; her seviyede dil bilgisi, kelime ve iletişim konuları vardır. Üst seviyeler önceki seviyeyi bitirince açılır.',
  'Bir konuda anlatımı ve örnekleri oku, cümleleri dinle, sonra testi çöz. Konuyu bitirince Konu Macerası ile uygulama yaparsın.',
  'Arama kutusuna konu adını yazarak hızlıca bulabilir, örnek cümleleri Amerikan ya da İngiliz aksanıyla dinleyebilirsin.'
 ]),
 S('games','🎮','Oyunlar sayfası','tab-aktiviteler','#tab-aktiviteler .gg-tabs',[
  '**Tek Kişilik:** kelime oyunları. Seviye atladıkça yeni oyunlar açılır; “Sıradaki oyun” kartı bir sonrakinin ne zaman açılacağını gösterir.',
  '**Online Çift Kişilik:** takip ettiğin bir arkadaşınla aynı anda ya da 24 saat içinde farklı zamanlarda oynarsın (30. seviye).',
  '**Kapışma:** kartlarla öğren, aynı cihazda bir arkadaşınla yarış.',
  '**Konu Oyunları:** Ders Çalış konularını oyunla pekiştir; %80 ve üzeri başarıda 70 XP kazanırsın.',
  '**Mola Vakti:** derslerden bağımsız kısa oyunlar. Altın toplarsın; her oyun için günde 2 hakkın var.',
  'Her oyun turu ödül kazandırır; kazandığın XP ve altını sonuç ekranında görürsün.'
 ]),
 S('gamelevels','🔓','Oyunların açıldığı seviyeler','tab-aktiviteler',null,[
  'Kelime Laboratuvarı 3, Hafıza Sandığı 6, Okuma Stüdyosu 8, Eksik Harf 11, Harf Avı 14, Kelime Rallisi 15, Eş Bul 19, Risk Balonları 22, Kulak Dedektifi 24, Şifre Kırıcı 27, Hız Fırtınası 28, Kelime Uçuşu ve Cümle Rotası 30, Kelime Treni 31, Cümle Ustası 36, Harf Bahçesi 39.'
 ]),
 S('joker','🃏','Jokerler','oyun',null,[
  'Jokerler 15. seviyede açılır: oyun başına 15. seviyede 1, 20. seviyede 2, 30. seviyede 3 joker kullanabilirsin.',
  'Joker dükkânı 18. seviyede açılır; jokerleri Mağaza › Jokerler’den altınla alırsın ve Çantam’da görürsün.'
 ]),
 S('friends','👫','Arkadaşlar sayfası','tab-meduakis','.fr-home',[
  '**Arkadaş ekle:** kullanıcı adıyla arkadaşını ara ve takip et (15. seviye).',
  '**Arkadaşlarım:** takip ettiklerin ve kimin çevrimiçi olduğu. “Davet et” ile oyun daveti gönderirsin.',
  '**Vitrin:** rozetlerini sergilediğin alan (15. seviye). **Arkadaş akışı:** arkadaşlarının başarılarını görüp tebrik edersin (10. seviye).',
  '**Karşılaşmalarım:** düellolarının ve davetlerinin sonuçları (20. seviye).',
  'Hazır mesajlar 25., enerji hediyesi 30., aksesuar hediyesi 35. seviyede açılır. Birini engellersen takip, mesaj, hediye ve düello karşılıklı kapanır.'
 ]),
 S('league','🏆','Haftalık lig','tab-meduakis',null,[
  'Lig o hafta kazandığın XP ile sıralanır ve her hafta yenilenir; toplam XP’n silinmez.',
  'Yerel Lig 5. seviyede açılır. Süper Lig için 10. seviye ve haftalık 750 XP, Şampiyonlar Ligi için 15. seviye ve haftalık 1800 XP gerekir. Efsaneler Ligi toplam XP sıralamasıdır (15. seviye).'
 ]),
 S('shop','🛍️','Mağaza ve karakter','tab-magaza','#tab-magaza .ds-home',[
  '**Karakterin:** “Tipimi tasarla” ile görünümünü düzenle, “Alışveriş Yap” ile kıyafet ve aksesuar al. Kız ya da erkek karakter seçimini istediğin zaman değiştirebilirsin.',
  'Yeni ürün türleri seviyeyle açılır: saç stilleri 17, üst giyim 20, alt giyim 23, ayakkabı 26, aksesuar 29, baş aksesuarı 32, kombinler 35, görünüm efektleri 38.',
  '**Enerji al**, **Jokerler**, **Sandıklar** ve **Karakter koleksiyonum** da Mağaza’dadır.'
 ]),
 S('bag','🎒','Çantam','tab-magaza',null,[
  'Mağaza düğmesine dokununca üstünde Çantam açılır. Satın aldığın ve kazandığın her şeyi burada görürsün: sandıklar, jokerler, rozetler, karakterler, kıyafetler, eşyalar ve enerji.'
 ]),
 S('chests','🎁','Sandıklar','tab-magaza',null,[
  'Seviye sandıkları: Bronz 5, Gümüş 14, Altın 24, Kristal 34, Efsane 40. Sandığın durumu (hazır, kilitli, alındı) sandık ekranında görünür.',
  'Parkur’daki Sandık düğmesinde AÇ yazıyorsa kazandığın bir sandık seni bekliyor.'
 ]),
 S('profile','👤','Profil menüsü','tab-profil','#rtProfileBackdrop',[
  '**Profilim:** kişisel bilgilerin. **İlerlemem:** seviyen, XP’n ve grafiklerin. **Başarılarım:** rozetlerin. **Karnelerim:** tamamladığın sınıf ve seviyelerin karneleri.',
  '**Ödevlerim**, **Seviye Testi**, **Kelime Tekrarı**, **Öğretmene Mesaj Gönder** ve **Parkur Değiştir** de buradadır.',
  '**Veli Kontrolü**, **Güvenlik ve Bildirimlerim**, **Ayarlar**, **Yardım & Destek**, **Hesap Değiştir** ve **Çıkış Yap** menünün sonundadır.'
 ]),
 S('account','🔐','Hesap, şifre ve giriş','tab-profil',null,[
  'Ayarlar’dan kişisel bilgilerini ve şifreni yönetebilirsin. Şifreni unuttuysan giriş ekranındaki şifre yenileme bağlantısını kullan.',
  'Hesap Değiştir ile başka bir hesaba geçebilirsin; yeni hesap doğrulanana kadar önceki girişin korunur.',
  'E-posta doğrulama bağlantısı kayıtlı (veli) e-posta adresine gider. Gelmediyse spam/gereksiz klasörüne bak ya da yeniden gönder.'
 ]),
 S('delete','🗑️','Hesabı dondurma ve silme','tab-profil',null,[
  'Hesabını dondurma ve silme işlemleri ayrı sayfalarda, doğrulama ve son onayla yapılır. Hangi verilerin silindiğini o sayfada oku. Bu işlemler çıkış yapmakla aynı değildir.'
 ]),
 S('audiohelp','🔊','Ses ve mikrofon sorunları','oyun',null,[
  'Ses gelmiyorsa cihazın medya sesini ve soru ekranındaki ses düğmesini kontrol et. Android’de metin okuma motorunda İngilizce sesin yüklü olmalı.',
  'Mikrofon için uygulamaya izin ver. Çalışmazsa “Dinle ve söyle” sorusunda seçeneklerden cevap verebilirsin.'
 ]),
 S('connection','📶','Bağlantı ve kayıt sorunları','ana',null,[
  'Cevabın kaydedilemezse aynı sorudan devam edebilirsin; ilerlemen korunur. İnterneti kontrol edip “Tekrar dene”ye bas.',
  'Bir yenilik görünmüyorsa uygulamayı tamamen kapatıp yeniden aç. Sorun sürerse Profil › Öğretmene Mesaj Gönder ile bildir.'
 ]),
 S('support','💬','Yardım ve destek','ana',null,[
  'Yardım’daki arama kutusuna özellik, oyun ya da sorun adını yaz. Bulamadığın bir şey olursa öğretmenine mesaj gönder.'
 ])
];
root.DijiPapiGuide={version:3,sections,tours:{}};
})(typeof window!=='undefined'?window:globalThis);
