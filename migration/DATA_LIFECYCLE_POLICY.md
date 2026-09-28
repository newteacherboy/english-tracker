# Diji-Medu Veri Yaşam Politikası — Taslak v1

Bu belge politika taslağıdır. Üretim cleanup davranışı oluşturmaz.
Hiçbir kritik veri bu belgeye dayanarak otomatik silinemez.

## A — Korunan / otomatik silinmez
İngilizce; DersKonulari; DersUygulamaTest; Kelimeler; KonusmaEsAnlamlar; Kategoriler; BoslukDoldurma; Dogru_Yanlis_Sorular; OzellikIzinleri; Rozetler.

## B — Uzun dönemli / arşivlenebilir
Dersler; DersIlerleme; DersBilmiyordum; SeviyeIlerleme; KonusmaSeviyeIlerleme; BuyuIlerleme; Puanlama; Kitaplar; Okuma_Hizi; Oturum Saniye; XP_Tablosu; XP_Haftalik; Duello; Sohbet; Etkinlik_Yapilan; Video_Izlenenler; AtamaGunlugu; SinifIciPerformans; LiderlikBonusVerilenler.

B grubunda varsayılan yaklaşım:
1. Ana kaydı koru.
2. Gerekirse arşivle.
3. Hard delete uygulama.
4. Retention süresi ayrıca onaylanmadan belirlenmiş sayılmaz.

## C — Operasyonel / süreli aday
Oturumlar; Bildirimler; BildirimGunlugu; DuyuruGorulenler; PuanBildirimDurumu; Akis_Olaylari; Guvenlik_Log.

C grubu için bile doğrudan silme yoktur. Kayıt türü, gereklilik, son kullanım zamanı, arşiv ve backup durumu ayrıca doğrulanır.

## D — Arşiv adayı
Örneğin AktiviteKartlarieskii. D grubu silinecek anlamına gelmez; ilk tercih arşivdir.

## Özel inceleme
EkVeri tek tabloda farklı yaşam sürelerine sahip state'ler barındırıyor. Sheet'in tamamına tek retention süresi uygulanamaz; anahtar değerleri ayrı sınıflandırılmalıdır.

Duello:
- aktif/bekleyen: realtime/operasyonel
- tamamlanmış: tarihçe
- ödül/idempotency kayıtları: korunmalı

XP ve enerji:
- güncel state korunmalı
- olay/tarihçe ayrı ele alınmalı

## Cleanup güvenlik kuralı
Production cleanup ancak şu koşullardan sonra değerlendirilebilir:
1. Veri politikası açıkça onaylanmış olmalı.
2. Backup alınmış ve doğrulanmış olmalı.
3. Dry-run raporu üretilmiş olmalı.
4. Sonuçlar incelenmiş olmalı.
5. Migration sağlıklı doğrulanmış olmalı.
6. Silinecek veri türü açıkça tanımlanmış olmalı.
7. Kritik/A/B veriler için hard delete yasak olmalı.
8. İşlem audit loguna yazılmalı.
9. Rollback/restore yolu doğrulanmış olmalı.

İlk production cleanup çalıştırmasında deleted=0 olmalı; yalnızca dry-run raporu üretilmelidir.

## Hedef mimari
Google Sheets: uzun dönemli öğrenme geçmişi, raporlama, öğretmen yönetimi, tarihçe, backup/archive.

Realtime backend: aktif düello, presence, canlı bildirim, sohbet teslimi, canlı XP/enerji state'i, geçici bağlantı/queue state.

Browser: localStorage/IndexedDB, offline queue, cache, lifecycle-safe time tracking.

Bu ayrım ayrı migration adımlarıyla üretime alınacaktır.
