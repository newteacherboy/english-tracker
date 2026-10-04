# Diji-Medu Android

Bu proje mevcut HTTPS uygulamasını Trusted Web Activity ile açar. Google girişi tarayıcı tarafından yürütülür; gömülü WebView kullanılmaz. Kaynak ve derleme akışı hazırdır; imzalı mağaza paketi ve gerçek cihaz onayı ayrıca gereklidir.

- Paket: `com.ogretmencocuk.dijimedu` (ilk mağaza kaydından sonra değiştirilemez).
- Başlangıç: `https://panel.ogretmencocuk.com/ingilizce/`
- Android 16 / API 36, minimum API 24, JDK 17, Gradle 8.13, AGP 8.13.2.
- Android Browser Helper 2.7.4; Apache-2.0 lisansı.

## Derleme

Android Studio ile `android` klasörünü aç veya JDK 17 + Gradle 8.13 + Android SDK 36 ortamında `gradle :app:lint :app:assembleDebug :app:bundleRelease` çalıştır. GitHub Actions aynı işlemi yapar ve APK, AAB, lint raporunu saklar. İlk otomatik AAB imzasız inceleme paketidir; Play'e yüklenemez.

## İmzalı sürüm

Kullanıcının upload keystore'u özel tutulmalıdır. GitHub repository secrets: `DIJI_KEYSTORE_BASE64`, `DIJI_KEYSTORE_PASSWORD`, `DIJI_KEY_ALIAS`, `DIJI_KEY_PASSWORD`. Actions > Diji-Medu Android bundle > Run workflow > signed_release seç. Kimlik bilgilerini kod veya sohbette paylaşma.

Yerelde `DIJI_KEYSTORE_PATH`, `DIJI_KEYSTORE_PASSWORD`, `DIJI_KEY_ALIAS`, `DIJI_KEY_PASSWORD` ile `gradle :app:requireReleaseSigning :app:bundleRelease` çalıştır.

## Tam ekran alan adı doğrulaması

Play App Signing etkinleştirildikten sonra Play Console > App integrity > App signing certificate bölümündeki gerçek SHA-256 parmak iziyle:

```sh
python3 android/make-assetlinks.py --sha256 GERCEK_PARMAK_IZI --output .well-known/assetlinks.json
```

Bu dosya `https://panel.ogretmencocuk.com/.well-known/assetlinks.json` adresinde HTTPS 200 ve JSON olarak erişilmelidir. Upload key parmak izi ile Play app signing parmak izi aynı olmak zorunda değildir. Bu bilgi gelmeden sahte assetlinks dosyası yayınlanmaz. Doğrulama eksikse uygulama güvenli tarayıcı sekmesinde, adres çubuğuyla açılır.

## Gerçek cihaz kabul testi

Google giriş/yeni kayıt/mevcut hesabı bağlama; şifreli giriş; mikrofon iznini reddetme ve verme; geri düğmesi; ekran döndürme; düşük enerji; Harf Bahçesi; bütün mevcut oyunlar; çevrimdışı açılış ve tekrar bağlanma; çıkış/başka öğrenci; hesap silme; uygulamayı kaldırıp yeniden kurma. İmzalı Play internal test sürümünde alan adı doğrulaması ayrıca kontrol edilir.

Kaynaklar: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start ; https://support.google.com/googleplay/android-developer/answer/11926878 ; https://developer.android.com/build/releases/agp-8-13-0-release-notes
