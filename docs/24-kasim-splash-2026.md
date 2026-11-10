# 24 Kasım Öğretmenler Günü açılışı

- Seçilen tasarım: 1. görsel, Papi ve öğrencilerin çiçekli sınıf kutlaması.
- Gösterim: Her yıl Türkiye saatine göre 21–27 Kasım (dahil).
- Tam ekran: mevcut üç açılış katmanı (#splashEkrani, #dmBootSplash, #oturumYuklemeOverlay).
- Hareket yok: yalnızca mevcut yükleme ilerlemesine bağlı tek yatay çubuk.
- Yönetici: Giriş Animasyonları bölümünde otomatik/manuel seçim ve 24 Kasım'ı devre dışı bırakma.
- Görsel hedefi: ingilizce/holiday-splashes/24-kasim-1.jpg (9:16, Papi'li seçilen çalışma).
- Kod değişiklikleri güvenli şekilde ayrı dalda; bu görsel depoya yüklenmeden birleştirilmemelidir.
- Değişiklikler birleştirildikten sonra Supabase splash-settings Edge Function ayrıca deploy edilmelidir; yalnızca GitHub değişikliği sunucu ayar kataloğunu güncellemez.
- Güncel açılış dosyalarının önbelleği kök index.html'de v=20261111-teachers-1 ile yenilenir.
