# Giriş Animasyonları — yönetici öğretmen kontrolü

Öğretmen koduyla giriş yapan **yönetici teacher** hesabı, Öğretmen Paneli > Giriş Animasyonları bölümünden:
- **Otomatik takvim** (varsayılan, mevcut yıllık iki tasarım dönüşümü)
- **Normal Papi girişi** (bayram görsellerini kapatır)
- **Seçilen özel tasarımı göster** (tarihten bağımsız elle seçim)
- Her özel gün için ayrı aç/kapat kontrolü

Ayarlar Supabase public.dm_splash_preferences tablosunda tutulur; RLS açıktır ve anon/authenticated rolleri yetkisizdir. Edge Function GET herkese yalnızca görünen ayarı döndürür, POST sadece sunucudaki teacherPortalList sahibi doğrulamasından sonra çalışır. Geçerli görsel yolları sunucuda whitelist ile kontrol edilir. Mevcut Diyanet takvimi ve 2027/2028 yıllık dönüşüm korunmuştur.

İlk açılış cached ayarlarla anında çizilir; arka planda güncel ayar alınır. Değişiklikler yeni açılışlarda cihazlara yayılır.

Sunucu: `splash-settings` (project nxfqlutulxqzqgwewssd), deploy on 2026-10-30.
Migration executed via Supabase: `dm_owner_splash_preferences_v1`.
