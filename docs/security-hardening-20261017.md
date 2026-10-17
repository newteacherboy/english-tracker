# DijiMedu güvenlik sertleştirmesi — 17 Ekim 2026

## Tamamlanan doğrulamalar
- Servis rolüne özel çalışan oyun ekonomisi RPC'leri ve RLS erişim kontrolleri denetlendi.
- Anonim çağrılabildiği görülen SECURITY DEFINER veri-temizlik fonksiyonu artık sadece servis rolü tarafından çağrılabilir. Trigger helper'ların kamusal EXECUTE izni kaldırıldı.
- Kelime havuzunun anon / authenticated rolleri için fazla geniş doğrudan tablo yetkileri kaldırıldı. Servis rolü okuması korunuyor.
- Saldırı trafiğini sınırlamak için veritabanında atomik, IP ve hedef hesap düzeyinde zaman pencereli sayaçlar; hassas öğrenci/ödül operasyonları için öğrenci-bazlı sayaçlar.
- İstek gövdesi sınırı: standart API JSON istekleri 256 KiB, geçerli gizli import anahtarıyla imzalanmış içe aktarmalar 4 MiB. Hatalı JSON ve dizi/primitif kök payload reddedilir.
- Reddedilmiş / askıya alınmış öğrenci hesaplarının mevcut 30 günlük oturumları artık geçersiz sayılır.
- Yanıtlar no-store / nosniff / no-referrer / deny-frame başlıkları taşır.
- SQL işlemi tek transaction ile yarış durumunda da istek sınırı uygular. Süresi geçmiş sayaçlar cron ile her gün temizlenir.

## Gerçek uygulama sınırları — açık işler
Bu güvenlik düzeltmeleri **tam hile koruması** değildir:
1. Klasik kelime, harf ve hafıza oyunları tarayıcının rapor ettiği doğru/yanlış sayılarını alıp XP hesaplıyor. Sunucu yalnızca puanı, ödül tavanını ve idempotent kayıtları kontrol ediyor. Bütün soru üretimi / cevap denetimi server authoritative akışa taşınmadan hile tamamen engellenemez.
2. Ana Parkur ilk soru doğruluk bilgisi eski istemciden geliyor. Pekiştirmeler sunucuda doğrulanıyor fakat parkur soru doğrulaması için de server-run challenge gerekli.
3. Eski MeduPro Ana Parkur farklı durak biçimi kullanıyor; canlı geriye uyumlu yol kontrollü göçe ihtiyaç duyuyor.
4. Mevcut uygulama yerel depolamada oturum belirteci saklıyor. Tam XSS savunması, doğrulanmış CSP'nin site sunucusunda HTTP başlığıyla etkinleştirilmesi, DOM innerHTML denetimi ve HttpOnly güvenli cookie mimarisiyle tamamlanmalıdır.
5. IP adresi reverse proxy başlıklarına dayalıdır; CDN/WAF katmanında güvenilir kaynak IP ve edge request budget konfigürasyonu da gereklidir. Rate limit dışarıdan servis saldırılarını tek başına durduramaz.
6. Supabase Security Advisor, **Auth leaked-password protection** ayarının açılmasını öneriyor: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Mevcut yönetim bağlayıcısıyla bu ayar değiştirilemiyor; proje Auth ayarlarından açılmalıdır.
7. GitHub Pages kaynaklı statik site üzerinde HTTP güvenlik başlıkları, alan adının reverse proxy/CDN ayarıyla denetlenmelidir; API'ye eklenen başlıklar web sayfasının CSP'si yerine geçmez.

## Acil geri dönüş
Diji API Edge Function önceki sürüme döndürülebilir; güvenli veritabanı izin daraltmaları ve saldırı sayaçları korunmalıdır. Yeniden açılmaması gereken güvenlik açığı: diji_veri_temizligi fonksiyonunu PUBLIC rolüne vermek.

## İzleme
Giriş ve ekonomi işlemlerinde 429, 503 yanıtları, Supabase Edge Function hata günlükleri, Supabase Security Advisor ve şüpheli ödül claim hacmi izlenmeli. Gizli anahtarlar asla GitHub commit'lerine ya da statik dosyalara eklenmemeli.

## Devam paketi — istemci cüzdanı ve yan API
- `ekonomi/altinKazan` artık istemcinin `miktar` değerini ödemez. Oyun, parkur ve ders ödülleri kendi sunucu işlemlerinden gelir. Eski istemcinin yalnızca yerelde hesapladığı ek altın ödülleri bu yoldan aktarılamaz.
- Günlük hedefin mevcut +5 altını, sunucuda kayıtlı günlük XP hedefe ulaştığında, hedefOdul günüyle bir kez verilir. Eski ödenmiş işaretler korunur. CAS tekrarında callback güncel kaydı tekrar okur; timestamp aynı milisaniyede bile ilerler.
- `ekVeriKaydet/yo` istemci protokol işaretini atar; totalXp, günlük XP, XP logu, ödül sürümü, haftalık hedef ve günlük ödeme işaretleri son sunucu kaydından korunur. İlk cihaz kaydı da XP oluşturamaz. Lig, mevcut haftanın sunucu günlüğünden hesaplanır; geçmiş haftalık XP kaydı değiştirilmez.
- `weekly_target`, doğrudan kullanıcı anahtar kaydıyla yazılamaz. Resmî hedef seçim/ödül API'leri çalışmaya devam eder.
- MeduPro API de aynı 256 KiB gövde sınırını, sunucuya bağlı işlem bütçesini ve no-store başlıklarını kullanır. Bütçe anahtarları Diji API ile aynı olduğundan iki API arasında dönüşümlü çağrı limitleri aşmaz.
- Mevcut sınırlama devam eder: klasik oyun ve Ana Parkur cevapları tam server-grade değildir. Bu paket sahte cüzdan kaydını ve miktar bazlı altın musluğunu kapatır; soru oturumlarının göçünü tamamlamaz. Yerel hesaplanan eski etkinlik/kombo ödülleri için ayrı doğrulanmış sunucu olayları gereklidir.
- Doğrulama: güvenlik/haftalık ödül regresyonları; kod ayrıştırma; üretim veritabanı izin ve rate-limit rollback kontrolü. Genel progression testlerinde mevcut katalog eşitliği ve eski haftalık hedef kaynak beklentisi bu değişiklikten önce de başarısızdır.
