# İlk keşif ve kayıt — yayınlanmamış taslak

Base: `0c36e9730553c36e0e7d16d9bafd360efd1beb19`. Branch: `draft/first-discovery-registration`.

## Kullanıcının göreceği sıra

1. Mevcut açılış animasyonu korunur. İlk ziyaretçi animasyon sonunda yeni Başla ekranında bekler; giriş formu arkada görünmez.
2. Başla, mevcut sunucu kontrollü misafir platformunu açar. Yeni keşif ana ekranında alt sekmeler ve etkinlik erişimi bulunur.
3. Özgün görsellerle altı soruluk kısa tanışma etkinliği açılır: apple, book, ball, cat, pencil, dog. Doğru/yanlış seçim anında gösterilir. Etkinlik gerçek XP veya altın üretmez.
4. Sonuçtan sonra Keşif kartımı oluştur / Biraz daha keşfet sunulur. Etkinlik oynanmazsa üç sekme ve iki dakika aktif keşiften sonra davet edilir. Aktif oyun/sonuç açıkken davet bekler.
5. Öğrenci, veli, öğretmen seçimi. Veli seçimi mevcut sisteme uygun olarak çocuk için öğrenci hesabı oluşturur; bağımsız veli hesabı oluşturduğu söylenmez.
6. İsim, soyisim ve kullanıcı adı. Gerçek ad soyad mevcut `full_name` alanında birleşir; herkese görünen ad `username` olarak korunur.
7. Öğrencide sınıf, şube, isteğe bağlı okul adı ve Öğretmen kodu (varsa). Öğretmende isteğe bağlı okul adı mevcut kurum alanına bağlanır.
8. Telefon numarası ve E-posta adresi. Alan başlıklarında veli ön eki yoktur. Gizlilik ve temsilci kayıt beyanı korunur.
9. Öğrencide etkin Google sağlayıcısı varsa Google seçeneği; e-posta yolunda şifre. Öğretmen mevcut e-posta/şifre başvurusu üzerinden kayıt olur.
10. Bilgileri kontrol et ve Kaydı tamamla. Sunucu yanıtı başarılı olmadan başarı ekranı açılmaz. Şifre kalıcı depoya yazılmaz.
11. E-posta kaydında doğrulama kontrolü ve tekrar gönderimi mevcut üye API'lerini kullanır. Mevcut sunucu hemen erişim verdiği için Şimdi uygulamaya devam et seçeneği vardır. Google yolu bu ayrı adımı atlar. Öğretmen başvurusu gerçek yönetici onayı durumunu gösterir.
12. Keşif sonucu hesap sahibinin `extra_data` alanına aktarılır; gerçek ekonomi alanları değiştirilmez. Yeni sınıf hesabının başlangıç rotası okul yolu olarak atanır. Daha sonra mevcut rota değiştirme özelliğiyle değiştirilebilir.

## Görseller

17 yeni uygulama varlığı; yaklaşık 346 KB. Dört Papi pozu, sekiz soru nesnesi, üç rol görseli, keşif adaları ve mevcut Google SVG işareti. Türkçe dosya adları. PNG üretimleri WebP olarak uygulamaya aktarılmıştır. Kaynak ve hash kayıtları media manifestindedir. Piksel düzeyinde birebir eşleşme henüz tarayıcıda doğrulanmamıştır.

## Teknik sınırlar ve kontroller

- Çalışma dalı yayına bağlı ana dala birleştirilmemiştir; Supabase işlevi dağıtılmamıştır.
- Yeni tablolar veya migrasyon gerekmez. `students.school` mevcut alanı iki öğrenci kayıt yolunda da doldurulur.
- Gerçek üye tokenı misafir sandbox'ına taşınmaz. Kayıt için yalnızca sabit işlem listesi içeren ayrı bağlantı kullanılır; server authorization değişmez.
- Kayıt taslağı yalnızca sekme sessionStorage'ında bir saat saklanır. Şifre bellekte tutulur ve kayıt yanıtından sonra silinir. Taslak tamamlandığında silinir.
- Misafir süre ve tek-deneme hakları mevcut sunucuda tutulur. Sunucudaki süre şu anda duvar saatine bağlıdır; arka plandayken durdurulmuş süre veya toplam üç etkinlik sınırı bu paket tarafından eklenmez. Yerel iki dakikalık kayıt daveti görünür sayfada geçen süreyi sayar.
- Yalnızca yeni keşif modunda eski misafir bilgi balonları gizlenir; mevcut üyelerin sekme ve oyun tasarımları korunur.
- Kod, kayıt/Google/email/guest sözleşme testleri, inline JavaScript ve medya manifesti kontrol edilmiştir. Gerçek tarayıcıda mobil taşma, klavye, geçişler ve canlı OAuth/e-posta gönderimi henüz doğrulanmamıştır. Bu ortamda gerekli control-browser yeteneği bulunmadığı için tarayıcı QA başlatılmamıştır.

## Önizleme

`ingilizce/discovery-preview.html` yeni CSS, JS ve görselleri kullanır; API örnek yanıtları yereldir. Hiçbir gerçek kayıt, e-posta veya Supabase isteği yapılmaz. Tek dosyalık kopya `docs/dijimedu-kayit-onizleme.html` içinde aynı kaynaklar ve görseller gömülerek oluşturulur. Mevcut açılış animasyonu ve uygulamanın diğer gerçek sekmeleri bu tek dosyalık önizlemenin kapsamı değildir.

## Yayın öncesi kalan doğrulamalar

320/390/768 px ve masaüstü; iOS klavye; ilk ziyaret ve eski hesap giriş/çıkış; altı soruda yanlış/doğru seçim; aktif oyunda davetin beklemesi; Google yeni ve mevcut hesap dönüşü; öğretmen kodu geçerli/geçersiz; okul boş/dolu; gerçek e-posta bağlantısı ve tekrar gönderme; yarım kayıt/yenileme; offline/zaman aşımı. Bu kontroller tamamlanmadan hatasız veya yayına hazır olarak nitelendirilmez.

## Onay sonrası yayın sırası

Önce yalnızca geriye uyumlu okul alanı kayıt değişikliğiyle diji-api dağıtılır. Ardından yeni ekranlar, 17 varlık ve service-worker sürümü birlikte tek frontend yayını olarak ana dala alınır. Canlı kayıt ve mevcut giriş smoke kontrolleri yapılır. Beklenmeyen sorunda bu paketin frontend commit'i geri alınır; mevcut okul alanındaki kayıt bilgileri silinmez.
