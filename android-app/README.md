# Diji Medu Android · Capacitor

Paket adı (üretim): `com.dijimedu.ingilizce`. Deneme APK'sı `com.dijimedu.ingilizce.preview` adını kullanır; mevcut Play Store uygulamasının yanına kurulabilir. Deneme uygulamasında yeniden giriş gerekir. Aynı kullanıcı adı ve şifre ile sunucudaki hesabına girilir; tarayıcı oturumu veya parola kopyalanmaz.

## Hazır olanlar

- Capacitor 8 ve kilitlenmiş bağımlılıklar; `npm ci` ile tekrarlanabilir kurulum.
- İngilizce uygulaması ve bağlı yerel içerikler pakette. `server.url` ve uzaktaki bir siteye native köprü erişimi yok.
- Uygulama `/ingilizce/` yolundan başlar; service worker paket sürümünü değiştiremez.
- Papi simgeleri, dikey ekran, HTTPS, mikrofon izni yalnızca mikrofon düğmesine basıldığında.
- Mevcut Web Speech kullanan oyunlar için Android konuşma tanıma ve seslendirme köprüleri. Cihazda konuşma motoru yoksa mevcut seçenekli yardım akışı devreye girer.
- Donanım geri tuşu, kayıtlı oyun/panel kapatma işlevlerini kullanır; uygulamadan çıkışta onay sorar.
- Mevcut e-posta/kullanıcı adı girişi ve Supabase sunucu bağlantısı korunur. Mevcut Play sürümünde olduğu gibi Google/Apple girişi bu adayda gizlidir. Google ile girişin yeniden açılması, ayrı sistem tarayıcısı + doğrulanmış dönüş akışı ve uçtan uca cihaz testi gerektirir; WebView içinde OAuth açılmaz.
- Yalnızca kullanıcı dokunuşuyla Google'ın ödüllü **test** reklamı; çocuk/yaşı bilinmeyen kullanıcı etiketleri ve genel içerik seviyesi. Reklam kimliği izni manifest birleşiminden çıkarılır.
- Öğretmen oturumunda reklam engellenir. Test reklamları öğrenciye XP, altın veya enerji vermez.
- Android otomatik yedekleme kapalı; uygulama oturumları sistem yedeğine dahil edilmez.
- Android testleri ve GitHub Actions ile APK derleme/yükleme.

## Kurulum ve deneme

Gereksinimler: Node 24, JDK 21, Android SDK 36 ve Android Studio veya komut satırı araçları.

```sh
cd android-app
npm ci
npm test
npm run apk
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
GitHub Actions → **Diji Medu Android Capacitor** → başarılı çalışma → **DijiMedu-Capacitor-Test-APK**.

Uygulamada öğrenci hesabıyla oturum aç. Enerji göstergesini açıp enerji panelindeki **Test reklamını dene · enerji verilmez** düğmesini kullan. Öğretmen modunda bu düğme görünmez. Canlı reklama tıklayarak test yapılmaz.

## Yayından önce tamamlanması gerekenler

Bu bir test adayıdır; üretime hazır olarak gösterilmez. `bundleRelease`/`assembleRelease` bilerek yayın hatası verir. Mevcut kullanıcıları etkileyen bir Play Store sürümü yüklenmemiştir.

1. Play Console'daki mevcut yükleme anahtarı (.jks/.keystore), alias ve ilgili gizli bilgiler güvenli imzalama ortamına bağlanmalı. Anahtar veya parola repoya konulmamalı. Play App Signing kullanılıyorsa Google'ın uygulama imzalama anahtarı yerine mevcut upload key ile AAB imzalanır.
2. Son Play sürümünden büyük `ANDROID_VERSION_CODE` belirlenmeli; varsayılan 2'nin uygun olduğu varsayılmamalı.
3. AdMob **uygulama kimliği** (`ca-app-pub-…~…`) ve **ödüllü reklam birimi kimliği** (`ca-app-pub-…/…`) alınmalı. `app-ads.txt` içindeki `pub-…` bu iki kimliğin yerine kullanılamaz.
4. AdMob uygulama doğrulaması, çocuk kitle ayarları, gerekli UMP izin mesajları, reklam SDK veri açıklamaları ve Play Console reklam/veri güvenliği beyanları tamamlanmalı. Web gizlilik metni şu an reklamsız sürümü anlatır; canlı reklamlı sürüm için güncellenmeli.
5. Gerçek reklam ödülü, AdMob SSV imzasını doğrulayan ve işlem kimliğini tekilleştiren sunucu endpoint'i üzerinden verilmeli. İstemcinin “izledim” demesi enerji vermek için yeterli değildir. Günlük ödül limiti ve mevcut 25 enerji tavanı sunucuda uygulanmalı. Bu test paketinde canlı ödül endpoint'i yoktur.
6. Gerçek Android cihazında giriş, hesap değiştirme/çıkış, öğrenci ilerlemesi, tüm oyunlar, mikrofon reddi/kabulü, ses, geri tuşu, çevrimdışı durum, reklamdan dönüş, telefon/tablet ve mevcut Play sürümünden imzalı güncelleme test edilmeli.
7. Önce Play Console dahili testine yüklenmeli. Fiziksel cihaz testi tamamlanmadan üretime geçilmemeli.

## Güncelleme

Web dosyaları pakette olduğu için web kodundaki değişiklikler `npm run sync` + yeni Android sürümü gerektirir. Sunucudan okunan veriler ve ders kayıtları mevcut sunucudan gelmeye devam eder. Eski tarayıcı/TWA localStorage alanı bu WebView'e otomatik taşınmaz; sunucuyla eşitlenmemiş yerel verilerin aktarılmış olduğu iddia edilmez.

## Altın reklamı adayı (30 Ekim 2026)

İki isteğe bağlı teklif vardır: 3 enerji ve 100 altın. Altın teklifi bakiye 100'ün altındayken veya seçilen enerji paketine yetmediğinde enerji/mağaza panelinde görünür. Her iki seçenek de test reklamıdır, canlı bakiyeyi değiştirmez. Reklam otomatik açılmaz. Öğretmen oturumları engellenir.

Gerçek uygulama kimliği `admob.config.json` içinde kayıtlıdır. Ekran görüntülerindeki iki reklam biriminin adı gösterilmediğinden enerji/altın eşlemesi doğrulanana kadar `units` alanları boştur; üretim kapalıdır. Bu dosya test manifestindeki Google örnek uygulama kimliğini değiştirmez.

## Reklam yerleşimleri (30 Ekim 2026)

- Ödüllü enerji: öğrencinin dokunuşuyla, günlük en fazla 5 tamamlanan reklam.
- Ödüllü 100 altın: altın 100'ün altındayken veya ürün/enerji paketine yetmediğinde isteğe bağlı teklif, günlük en fazla 3 tamamlanan reklam.
- Geçiş: ortak sonuç ekranını kullanan tamamlanmış tek kişilik oyunlarda her 3 oyundan sonra sonuçtan çıkarken; herhangi bir tam ekran reklamdan sonra en az 5 dakika ara. Yarım bırakılan oyunlar, parkur, öğretmen/sınıf oyunları sayılmaz. Hazır olmayan reklam için çıkış bekletilmez ve sonraki sayfada gecikmiş reklam açılmaz.
- Banner: yalnızca mağaza ve oyunlar listesinde. Oyun, sonuç, soru, iletişim kutusu, arka plan ve öğretmen modunda kaldırılır. Alt menü için ek boşluk ayrılır; gerçek telefon/tablet üzerinde konum testi hâlâ gereklidir.
- Ödüllü reklamın yanında banner veya geçiş reklamı açılmaz. Reklam yükleme hatalarında 30 saniye yeniden deneme aralığı vardır.

Bu aday Google test reklamı kimlikleri kullanır ve gerçek hesaba enerji/altın yazmaz. Günlük sayaçlar bu adayda cihaz üzerinde deneyim kontrolüdür; üretimde sunucu doğrulaması ve limitleri gerekir. AdMob'da ayrıca bir **Geçiş** ve bir **Banner** reklam birimi oluşturulmalıdır. Kimlikler ve enerji/altın eşlemesi doğrulanmadan üretim açılmaz. Canlı web güncelleme sistemi bu test paketinde henüz yoktur; yayın mimarisinde ayrıca tamamlanmalıdır.
