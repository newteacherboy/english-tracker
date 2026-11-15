# Kampanya: yalnız yönetici önizlemesi

Bu yayın yalnız `teacher` kullanıcı adlı, aktif ve `is_admin=true` olan mevcut yönetici öğretmen oturumuna açıktır. Yerel yönetici işareti yalnız gereksiz istekleri azaltmak içindir; yetki Supabase'deki portal oturumu ve öğretmen/grant kayıtlarıyla sunucuda doğrulanır. Başka yönetici hesapları da reddedilir.

Öğretmen Paneli içinde **🏆 24 Kasım Kampanya Önizlemesi** düğmesi bulunur. Yetkili hesapta ilk açılışta duyuru da gösterilir. Öğretmen ekranı, öğrenci ekranı, duyuru ve örnek sonuçlar üst düğmelerle incelenebilir. Tüm katılımcı adları, KP'ler ve sıralamalar örnektir; hiçbir gerçek öğrenci verisi okunmaz.

`teacher-campaign-preview` bağımsız, salt okunur bir Edge Function'dır. Portal token doğrulaması yaptığı için `verify_jwt=false` ile dağıtılır. Yalnız POST `op=status` kabul eder. Veritabanına sadece GET istekleri yapar; katılma, oyun başlatma, puan yazma ve ödül onaylama operasyonları yoktur. WhatsApp düğmesi yalnız paylaşım metnini gösterir; davet göndermez. Örnek bağlantı gerçek katılım sağlamaz.

**Gerçek kampanya kurulmadı ve genel kullanıma açılmadı.** Tam kampanya PR #509 taslak kalır. `dm_campaign` migration'ı uygulanmaz, oyun/XP/enerji/abonelik kodu veya mevcut API'ler dağıtılmaz. 20 Kasım'da otomatik genel açılış yapılmaz; bunun için ayrıca açık yayın talimatı gerekir. Tarihler 20 Kasım–10 Aralık 2026, sonuç günü 11 Aralık'tır.

Kontroller: 4 sunucu yetkilendirme testi + 3 DOM testi, Deno tip kontrolü ve Headless Chromium (360/390 mobil, masaüstü) geçti. Başka hesap/forged client flag, iptal edilmiş/süresi dolmuş oturum, öğretmen/öğrenci/sonuç ekranları, gerçek oyun/ödül/paylaşım yapılmaması ve yatay taşma test edildi. Canlı Edge endpoint anonim için 401, geçersiz token için 403 döndürdü. Gerçek yönetici oturum anahtarı okunmadı veya test için yeni yönetici oturumu üretilmedi.

Geri alma: `index.html` önizleme script/CSS bağlantılarını kaldırmak arayüzü kapatır. Genel kampanyaya geçmeden önce bu yönetici önizlemesi kaldırılmalıdır; tam kampanya ayrı migration/deploy sırasıyla yayımlanır.
