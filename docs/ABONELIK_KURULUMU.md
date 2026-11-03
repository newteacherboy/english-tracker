# Diji Medu abonelikleri: kurulum ve yayın adımları

Plan dokümanı: Diji Medu Üyelik Planları (Free / Pro / Premium Pro ve öğretmen planları).

## Bu dalda hazır olanlar

| Parça | Dosya | Durum |
| --- | --- | --- |
| Plan kuralları (veritabanı) | `supabase/migrations/20261104090000_uyelik_planlari.sql` | Yazıldı, uygulanmadı |
| Google Play doğrulama + bildirimler | `supabase/functions/billing/` | Yazıldı, yayınlanmadı |
| Android ödeme köprüsü (Play Billing 8) | `android-app/android/app/src/main/java/.../DmBillingPlugin.java` | Yazıldı |
| Planlar ekranı, veli kapısı, reklam kapatma | `android-app/src/billing*.js`, `ad-placements.js`, `runtime.js` | Yazıldı |
| Premium Oyunlar "Planları gör" | `ingilizce/premium-word-match.js` | Yalnızca Android'de görünür |

Çalışan kurallar: günlük enerji 25 / 40 / sınırsız, günlük altın 0 / +30 / +75, ayda seri kalkanı 0 / 2 / 5,
Mola Vakti 2 / 3 / 5, Premium Oyunlar 3 deneme / günde 5 bölüm / sınırsız, Pro ve Premium Pro'da banner ve geçiş
reklamı yok, ödüllü enerji reklamı +7, herkes için ligde günlük 3.500 puan sınırı.

Bu sürümde **olmayanlar** (planlar ekranında da yazılmaz): Pro'da 1,5 kat enerji dolumu, Premium Pro'da ayda 10
hediye güçlendirici, yöneticiyle iletişim, haftalık veli raporu, profil rozetleri, öğretmen sınıf/öğrenci sınırları.
Öğretmen planları ekranda "Yakında" görünür, satılmaz.

## Yayın sırası

1. **Play Console → Para kazanma → Abonelikler:** dört abonelik oluştur. Her birine iki temel plan ekle:
   `aylik` (1 ay, otomatik yenilenen) ve `yillik` (1 yıl, otomatik yenilenen).
   - `diji_pro`: 45 TL / 380 TL — `diji_premium_pro`: 79 TL / 700 TL
   - `teacher_pro`: 59 TL / 490 TL — `teacher_premium_pro`: 149 TL / 1.190 TL (şimdilik taslak kalabilir)
   - Yıllık planlara 7 günlük ücretsiz deneme teklifi (yeni müşteriler için) ekle.
2. **Google Cloud (yapıldı, 4 Kas):** proje `project-ca6bc8db-2969-4bca-8b2`, Google Play Android Developer API açık,
   servis hesabı `diji-medu-play-billing@project-ca6bc8db-2969-4bca-8b2.iam.gserviceaccount.com`,
   Pub/Sub konusu `play-rtdn` (Google Play bildirim hesabına Publisher izni verildi) ve push aboneliği
   `play-rtdn-supabase` → `https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/billing/rtdn`.
   - Kalan: Play Console → Kullanıcılar ve izinler → servis hesabını davet et, "Finansal verileri görüntüleme" ve
     "Siparişleri ve abonelikleri yönetme" izinlerini ver.
3. **Servis hesabı anahtarı:** Cloud → IAM → Servis hesapları → diji-medu-play-billing → Anahtarlar → JSON anahtar oluştur.
   İndirilen dosyanın tamamını Supabase → Edge Functions → Secrets'a `GOOGLE_PLAY_SERVICE_ACCOUNT` adıyla ekle.
   (Kuruluş politikası anahtar oluşturmayı engellerse `iam.disableServiceAccountKeyCreation` bu proje için kapatılmalı.)
4. **Play bildirimleri:** Play Console → Para kazanma ayarları → Gerçek zamanlı geliştirici bildirimleri →
   konu: `projects/project-ca6bc8db-2969-4bca-8b2/topics/play-rtdn` → "Test bildirimi gönder".
5. **AdMob:** "Enerji Kazan" biriminde ödül miktarını 3'ten 7'ye çek (sunucu geçiş süresince ikisini de kabul eder).
6. **Veritabanı:** migration'ı uygula. Sonra kontrol: `select public.dm_plan('<öğrenci id>','student');` → `free`.
7. **PR'ı birleştir:** `billing` ve `premium-games` fonksiyonları main'e girince otomatik yayınlanır.
8. **İmzalı AAB:** README'deki yayın adımları (upload key, version code) tamamlanınca dahili teste yükle.
   Lisans test kullanıcısı ile satın al, iptal et, yükselt (Pro → Premium Pro) ve geri yükle senaryolarını dene.
9. **Gizlilik ve mağaza metni:** abonelik koşulları, otomatik yenileme ve iptal bilgisi gizlilik/koşullar sayfasına
   ve Play mağaza açıklamasına eklenmeli. Play Console'daki "Veri güvenliği" formu "satın alma geçmişi" ile güncellenmeli.

## Notlar

- Satın alma, Play'in `obfuscatedAccountId` alanıyla Diji Medu hesabına bağlanır. Başka bir hesapta
  "Satın alımları geri yükle" denenirse sunucu reddeder.
- Hak yalnızca sunucuda tutulur (`dm_entitlements`). Uygulamadaki plan görüntüsü bilgi amaçlıdır.
- Web ve iOS'ta satın alma yok; Android'de alınan plan aynı hesapla her yerde geçerlidir (enerji, Premium Oyunlar,
  Mola Vakti ve altın kuralları sunucuda). iOS uygulama içi satın alma ayrı bir iş olarak eklenecek.
