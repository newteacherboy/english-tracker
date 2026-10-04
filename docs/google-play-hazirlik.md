# Diji-Medu Google Play hazırlığı — 4 Ekim 2026

Bu inceleme `newteacherboy/english-tracker` güncel kaynak koduna ve aşağıdaki resmi kaynaklara dayanır. Yayın onayı veya eksiksiz hukuki uygunluk belgesi değildir. Koçluk sistemi kapsam dışıdır.

## Hazırlananlar

- Harf Bahçesi: özgün bahçe görünümü, kendi kelime bankası, mevcut sınıf kısıtları ve çoklu ünite seçimi, 8 kelime, adil 1000 puan, 3 enerji, ortak sonuç/ödül/haftalık rapor sistemleri.
- Yeni oyun aç/kapat kontrolü ve kendi skor/akış kaydı; tekrar kayıt isteği aynı oyun kimliğinde ikinci skor oluşturmuyor.
- Android TWA kaynak projesi: `android/`, `com.ogretmencocuk.dijimedu`, API 36, minimum API 24, JDK 17.
- İmzasız inceleme AAB/APK ve imzalı sürüm oluşturma GitHub Actions akışı.
- Gerçek uygulama imza sertifikası ile Digital Asset Links üretici; sahte parmak izi yayınlanmadı.
- Önceden bulunan gizlilik ve hesap silme sayfaları.

## Senin yapman gereken son adımlar

1. Kendi adına Google Play geliştirici hesabını aç veya mevcut hesabına giriş yap; kimlik ve gerektiğinde gerçek Android cihaz doğrulamasını tamamla. Hesap sahipliği ve beyanlarını senin yerine uyduramayız. Güncel ücreti ödeme ekranından teyit et.
2. Uygulama oluştur: ad **Diji-Medu İngilizce**, kategori Eğitim, dil Türkçe. Paket kimliğini ilk yüklemeden önce kesinleştir.
3. Upload imza anahtarını oluşturup özel olarak sakla. Android Studio veya README'deki dört GitHub secret üzerinden imzalı AAB üret. Anahtar/parolayı açık depoya koyma.
4. Play App Signing'i kur; **app signing certificate** SHA-256 parmak izini al. `android/make-assetlinks.py` ile JSON üret ve `https://panel.ogretmencocuk.com/.well-known/assetlinks.json` adresinde yayınla. Upload sertifikası tek başına Play'den yüklenen uygulamayı doğrulamaz.
5. Internal testing'e imzalı AAB yükle. Gerçek Android'de Google ile yeni kayıt ve eski hesabı bağlama, şifreli giriş, bütün oyunlar, mikrofon, geri tuşu, çevrimdışı bağlantı, kullanıcı değiştirme ve hesap silme testlerini tamamla.
6. Gizlilik URL: `https://panel.ogretmencocuk.com/ingilizce/gizlilik.html`. Silme URL: `https://panel.ogretmencocuk.com/ingilizce/hesap-sil.html`. Formlara bu adresleri gir; global erişimi kontrol et.
7. Data Safety, hedef kitle/çocuklar, IARC içerik derecelendirme, reklam ve uygulama erişimi formlarını aşağıdaki gerçek durumla doldur. İnceleme ekibine yalnızca test hesabı ver.
8. Mağaza görselleri: 512×512 uygulama ikonu, 1024×500 feature graphic, gerçek uygulamadan en az 2 telefon ekran görüntüsü. Öğrenci adı veya özel veri görünmesin. Mevcut maskot ikonu kullanılabilir; final mağaza görselleri henüz hazırlanmış sayılmaz.
9. Yeni kişisel hesap koşullarına tabiysen en az **12 katılımcının 14 gün kesintisiz** kapalı test katılımını sağla; sonra production erişimi için başvur. Bu süre yarına kadar mağazada herkese açılmayı engelleyebilir.
10. Yayın başvurusundan önce aşağıdaki çocuk, veri aktarımı ve lisans açıklarını kapat. Google değerlendirmesinin süresi ve sonucu garanti edilemez.

## Data Safety çalışma taslağı

Bu tablo doğrudan forma otomatik yapıştırılacak kesin beyan değildir. Kullandığın üçüncü tarafların gerçek veri akışları ayrıca doğrulanmalı.

| Veri | Kodda gözlenen kullanım | Formda kontrol edilecek |
|---|---|---|
| Ad/kullanıcı adı, hesap kimliği | Giriş, profil, sosyal ad, sıralama | Personal info / User IDs; hesap yönetimi ve işlevsellik |
| Veli/öğretmen e-posta ve telefon | Kayıt, rapor, destek | Personal info / Email, Phone; zorunlu alanlar ve amaç |
| Sınıf, şube, öğrenme kayıtları | Test, oyun, ödev, XP, süre ve rapor | Other personal info ve App activity / App interactions |
| Öğrenci–öğretmen yazışması, sosyal içerik | İletişim ve akış | Messages / Other in-app messages; kullanıcıların görebildiği içerik |
| Mikrofon / konuşma çözümlemesi | Web Speech API | Tarayıcı/ses hizmetinin uzaktan işlem yapıp yapmadığına göre Audio files veya ephemeral processing değerlendirmesi |
| Oturum ve teknik günlükler | Oturum güvenliği, deneme sınırı | User IDs, Diagnostics kapsamını gerçek loglarla eşleştir |

Kodda kendi sunucumuzda ses dosyası kaydetme işlevi görmedik; bu, tarayıcı veya konuşma sağlayıcısına ses aktarılmadığını kanıtlamaz. Hizmet sağlayıcıya aktarım ile Google'ın formundaki sharing istisnaları aynı şey değildir; sözleşmelerle doğrula. HTTPS var. Silme talebi uygulama içi ve dış bağlantıda sunuluyor; gerçek cihazda son doğrulama gerekli.

## Somut riskler ve eksikler

### 1. Çocuk kullanıcıların sosyal özellikleri — yayın öncesi yüksek öncelik

Uygulama ilkokul/ortaokul sınıflarını içeriyor; hedef kitleyi gerçeğe aykırı biçimde yalnız yetişkin seçmek çözüm değildir. Google Families kuralları çocuklara açık sosyal içeriklerde çevrimiçi güvenlik uyarısı, yetişkinlerin sosyal özellikleri yönetebilmesi ve kişisel bilgi paylaşımını açmadan önce yetişkin işlemi gerektiriyor. Mevcut global yönetici aç/kapat düğmeleri **veli bazlı doğrulanmış yetki** ile aynı şey değildir. Hazır mesaj/engelleme mevcut; serbest metin/akış/öğretmen sohbeti için uyarı, şikâyet, moderasyon, veli kontrolleri ve kişisel veri görünürlüğü ayrıca doğrulanmalı. Google OAuth ve diğer API'lerin çocuk odaklı kullanım şartları da kontrol edilmeli; Google girişi isteğe bağlı olmalı, mevcut şifreli giriş korunuyor.

### 2. KVKK ve yurt dışı aktarım — doğrulanmamış

Supabase, Google giriş, Google fontları/CDN, YouTube gömmeleri ve tarayıcı konuşma hizmeti dış hizmet temaslarıdır. Veri işleyen sözleşmeleri, işlem yeri, alt işleyenler ve Türkiye'den yurt dışına aktarım mekanizması belgelenmeli. KVKK'nın standart sözleşme yolu seçilirse imzadan itibaren beş iş günü bildirim şartı vardır. Veli onay kutusu tek başına bütün düzenli yurt dışı aktarımı hukuka uygun hâle getirmez. Kayıt beyanı velinin kimliğini bağımsız doğrulamaz. Gizlilik metnindeki “Öğretmen Çocuk” işletmeci adının gerçek veri sorumlusu kimliği ve mağaza işletmecisiyle eşleşmesi teyit edilmeli.

### 3. Görsel, ses, ders içeriği ve marka hakları — kanıt eksik

Depodaki MP3, maskot/harita görselleri, kelime/cümle/okuma bankası ve dış video kaynaklarının lisans belgeleri bu incelemede bulunmadı. Hak sahibi, kullanım izni, ticari kullanım, atıf ve değişiklik izinlerini bir envanterde sakla. Dosyanın depoda olması kullanım hakkını kanıtlamaz. YouTube videosunu uygulamada açmak yeniden yükleme hakkı vermez; gömme, çocuklara uygun içerik ve harici reklamları da incele. Harf Bahçesi, Wordcraft adı/logosu/görsel dosyalarını kullanmıyor; ekranın renkleri, düzeni, metinleri ve kodu bağımsız. Oyun mekaniğinden esinlenme her türlü telif/marka riskinin sıfırlandığı anlamına gelmez. “Diji-Medu” marka uygunluğu için tescil araştırması henüz yapılmadı.

### 4. Mikrofon, yapay zekâ ve üçüncü taraflar

Web Speech API'nin ses işlemesini, çocuk kullanımı ve saklama koşullarını cihaz/tarayıcı bazında doğrula. Mikrofon istemeden önce anlaşılır açıklama ve kullanıcı eylemi olmalı. Yapay zekâ koçu varsa içerik güvenliği, prompt'a gönderilen kişisel veriler ve sağlayıcı sözleşmesi ayrıca kontrol edilmeli; sadece bir sohbet panelinin varlığı gerçek yapay zekâ sağlayıcısını kanıtlamaz.

### 5. Gerçek para, reklam ve memuriyet

İncelenen oyun altın/XP sistemi için gerçek para ödeme entegrasyonu eklenmedi. İleride dijital özellik satışı veya reklam açılırsa Play ödeme ve çocuk reklam kuralları yeniden değerlendirilir. Gelir veya işletme sahipliğinin memuriyet açısından durumu ayrı bir hukuki konudur; yakının hesabını kullanmak otomatik uygunluk sağlamaz. Bu incelemede buna dair kişiye özel hukuki sonuç belirlenmedi.

## Mağaza açıklaması taslağı

**Kısa açıklama:** Oyunlar, kelime parkurları ve öğretmen takibiyle İngilizce çalış.

**Tam açıklama:** Diji-Medu İngilizce, öğrencilerin kelime ve dil becerilerini oyunlar ve kısa çalışmalarla geliştirmesine yardımcı olur. Sınıf ve ünite seçerek kelime oyunları oyna, Harf Bahçesi'nde harfleri birleştir, konu anlatımları ve testlerle çalış. İlerlemeni, günlük hedeflerini ve başarılarını takip et. Öğretmen bağlantısı olan öğrenciler ödev ve rapor özelliklerinden yararlanabilir. İnternet bağlantısı ve hesap, hizmetin birçok özelliği için gereklidir. Mikrofon isteyen çalışmalar kullanıcı eylemiyle başlatılır.

“Resmî MEB uygulaması”, “kusursuz”, “kesin başarı”, “tamamen çevrimdışı” veya doğrulanmamış sertifika iddiaları kullanılmamalı.

## Kaynaklar

- Google API 36: https://support.google.com/googleplay/android-developer/answer/11926878
- Yeni kişisel hesap test koşulları: https://support.google.com/googleplay/android-developer/answer/14151465
- Families / sosyal özellikler: https://support.google.com/googleplay/android-developer/answer/9893335
- User Data / hesap silme: https://support.google.com/googleplay/android-developer/answer/10144311
- TWA ve alan adı doğrulama: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- KVKK yurt dışı aktarım: https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim
- KVKK rehber: https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi
