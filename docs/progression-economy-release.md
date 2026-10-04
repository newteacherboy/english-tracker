# Kalıcı seviye ve orman parkuru

Kullanıcı 2026-10-04 tarihinde newteacherboy/english-tracker ana dalına gönderim ve canlı yayını açıkça onayladı.

## Davranış

- İlk beş seviye: toplam 0, 40, 100, 180, 300 XP. Her geçiş bir öncekinden daha fazla XP ister. Seviye 15: 5.950 XP; seviye 40: 47.200 XP.
- `yo.totalXp`, harcanmayan ve haftalık lig sıfırlamasından bağımsız seviye sayacıdır. Geçişte mevcut toplam ile elde kalan log toplamı/günlük/haftalık XP'nin en yükseği korunur. Daha önce silinmiş 21 günden eski logların tüm geçmiş XP'si bu kayıtlardan yeniden üretilemez.
- Ortak sekiz soruluk oyun ödülü tek yoldan hesaplanır: sıfır doğru veya sıfır tur XP'si altın üretmez. Günlük bonus ve seri bonusu korunur; Çift Puan ve ilgili güçlendirici birbirleriyle katlanmaz. Tur XP tabanı en fazla 96.
- Son 200 turun ödül kimliği kullanıcı kaydında tutulur. Aynı sonuç ekranı tekrar açılması veya sayfanın yenilenmesi ikinci bir ödül oluşturmaz. Bu istemci koruması, sunucuda doğrulanmış işlem defterinin yerine geçmez; eski genel `ekVeriKaydet` sınırları korunur.
- Güçlendiriciler/jokerler seviye 15'ten önce kullanılıp tüketilmez; mevcut envanter silinmez.
- Dolap: temel parça 300, özel 750, efsane 1500; temel aksesuar 150; özel kombin 2000, efsane kombin 3500. Çıkartmalar 150/400/900. Ücretsiz ürünler ücretsiz ve satın alınmış ürünler sahip olunmuş olarak kalır. İlk dolap alışverişi hesap başına bir kez %25; vitrin %30 ile birleşmez. Geçmiş ilk alımı olan hesaplara ikinci ilk-alışveriş indirimi tanımlanmaz. Mevcut bir defalık karşılama paketi korunur.
- Parkur: resimli orman ve saray, Papi, etkileşimli mor-altın duraklar, kalıcı seviye/enerji/altın üst çubuğu, ana devam eylemi. Eski tam harita `Tüm durakları görüntüle` bölümündedir. Öğrenme durakları, içerikleri, kilit denetimleri ve tamamlanma kaydı aynı fonksiyonları kullanır. MeduPro ve diğer menüler korunur.
- Seviye paneli: toplam XP, mevcut seviyenin ilerleme çubuğu, sonraki seviyeye kalan XP, yolculuk kilometre taşları. Kilometre taşları planı gösterir; bu değişiklik tek başına diğer bütün özelliklerin sunucu açılış kapılarını uygulamaz.

## Kontroller

70 Node testi başarılı. Inline JavaScript blokları ve yeni harici JS dosyaları derlendi. Yeni testler eşikler, seviye sınırları, veri geçişi, başarısız tur, güçlendirici birleşmesi, indirim birleşmesi, gerçek ödül hook'unda tekrar ödülü ve parkur şablonunun buton bağlantılarını denetler.

Bu oturumda gerçek tarayıcı görsel kontrolü yapılmadı. `ingilizce/parkur-seviye-onizleme.html`, gerçek yeni şablon/CSS kullanılarak oluşturulmuş, görselleri içine gömülü etkileşimli tasarım önizlemesidir. Canlı hesaplara bağlanmaz.
