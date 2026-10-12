# Diji-Medu · Paper Valley / Sky Islands

Dal: `design/paper-valley-sky-islands-v1`
Başlangıç: `0a3d4e9ac847fc7fbc4bc6ea6aa642bc77753791`
Bu çalışma main’e birleştirilmedi ve canlıya yayınlanmadı.

## Ekran sahipliği ve yaklaşım

| Dosya | Gerçek görev | Değişiklik |
|---|---|---|
| `oyna-v2.js/.css` | Güncel, hesaba göre seçilen ana yol; hedef kartları | Tek yerel harita çizimine bağlandı; hedefler açılır alanda korundu |
| `parkur-map-theme-v1.js/.css` | Oyun Parkuru harita çizimi ve koordinat hesabı | Paper Valley kaplaması, dikişli şerit, mühür/sandık/kapı |
| `story-path.js/.css` | Öğrenme yolu ilerleme haritası ve ders kabuğu | Sky Islands; yerel ada/kapı/sandık SVG’leri, köprü görünümü |
| `story-v2-ui.js` | Yeni derslerin cevap arayüzü | Enjekte edilen eski CSS kaldırıldı; gerçek DOM ve cevap işleyicileri korundu |
| `question-panels-v1.css` | Soru renkleri ve ortak kontroller | Paper/Sky değişkenleri, 2 sütun seçenekler, joker ikonları, Tüy Serisi |
| `question-calm-v1.js/.css`, `selected-play.js/.css` | Yerleşim, viewport ve giriş kartları | Tek soru kartı, hafif geri bildirim, klavye ve dock boşluğu |
| `game-feedback.*`, `papi-feedback.js` | Paylaşılan görsel geri bildirim | Kombo etiketi Tüy Serisi; yeni soru ekranlarında çift Papi bildirimi bastırıldı |
| `game-experience.css` | Paylaşılan süre göstergesi | Yalnızca yeni soru kabuklarında fazladan süre HUD’si gizlendi |

`parkur-theme.js/.css` ana index’te yüklenmiyor; önizleme bağımlılıkları nedeniyle değiştirilmedi. `progression-ui.*`, `story-exercises.js`, `story-final-cards.js`, Supabase, fetch katmanları, joker stokları/kullanım kuralları ve skor/enerji/ödül hesapları değiştirilmedi.

Güncel repo, bağlamdaki eski `.dm-story-mode` sekmesinden farklı olarak `dmLearningPurpose` seçimini kullanıyor. Bu tercihi ve Ayarlar akışını korudum; eski seçiciyi yeniden ekleyerek iki katman oluşturmadım. Eski `.dm-story-mode` kodu önizleme/yerel harita kullanımında korunuyor.

## Haritalar

- Oyun Parkuru gerçek durak sayısını çalışma anında `DURAK` → `all.length` üzerinden alır; 40’a zorlanmaz. Dört bölgenin oranı toplam/offset ile hesaplanır. Koordinat formülü korunur. Beşinci ve onuncu durakların görünümü sandık/kapıdır; yeni ödül verilmez.
- Öğrenme Yolu, mevcut sunucu bayrağı açıkken 80, kapalıyken 40 bölümdür. 80’de 20’şer, 40’ta 10’ar bölgeler kullanılır. x:29/71 ve aktif:50; açılma ve devam kuralları korunur.
- Bölgeler: Şafak Adaları, Bulut Bahçeleri, Gün Batımı Takımadaları, Yıldızlı Krallık.
- Bölge görselleri yerel SVG dilimleridir; ilk anda yalnızca görünür alan ve sonraki bölge yüklenir. Papi referans görüntüsü yeni poz çizilmeden 300 px WebP’ye küçültüldü.
- Yeni varlıklar iki izinli klasörde; dosya başına 250 KB ve rota başına 1,5 MB sınırının çok altında. En büyük yeni dosya: 19.702 bayt.

## Korunan kurallar ve tasarım sınırları

1. Büyü Akademisi’nde mevcut joker seti dört tanedir; üç ilk sıra + ikinci şans/mağaza alt sırası kullanılır. Üç joker kalması için bir hakkı kaldırmadım. Uygun olmayanlar devre dışı kalır.
2. Öğrenme Yolu’nda bu ortak joker sistemi yoktur. Sunum işi içinde yeni joker hakları ve kullanım mantığı eklenmedi.
3. Bazı eski çoktan seçmeli türler seçime dokununca değerlendirme yapar; yeni sürümdeki sorular mevcut Kontrol et/Devam akışını kullanır. Yanlışta sunucunun yeniden deneme kuralı korunur; yanlış cevabı atlayan yeni Devam veya otomatik geçiş eklenmedi.
4. Dört tüy, mevcut sayaçların görünümüdür. Dördüncü tüyde görsel Papi hareketi ve “4 tüy” rozeti vardır; ek ödül oluşturmaz.
5. `komboOdul`: yorum +5 altın/+2 enerji, metin +3 altın, gerçek çağrı `yoXpEkle(0,5)`. Günlük 5 sınırı ve hesaplar korunur; tutarsızlık çözülmedi. Ayrı `genelKomboGoster` görseli 5’te, yeni parkur enerji akışı da kendi sunucu kuralında tetiklenir; bunlar tek ödül sistemiymiş gibi birleştirilmedi.
6. Konseptler temiz varlık değildir; ekran görüntüleri kırpılıp arka plan yapılmadı. Mevcut görünüm özgün SVG/CSS uyarlamasıdır, piksel eşliği iddiası yoktur.

## Eksik rasterler

| Rota | Sonradan üretilebilecek temiz varlıklar |
|---|---|
| Paper Valley | 1170×2532 yazısız bahar, yaz, sonbahar, kış arka planları; birleşen kenarlar; düğüm sprite sayfası |
| Sky Islands | 1170×2532 yazısız şafak, bulut, gün batımı, yıldızlı krallık arka planları; birleşen kenarlar; ada sprite sayfası |
| Papi | Aynı karakterin ayrı uçuş, bekleme, aktif durakta durma ve ödül pozları |

Rasterler gelince WebP’ye dönüştürülüp dikey dilimlenmeli; tek dosya ≤250 KB, rota ≤1,5 MB olmalı. Şu anda SVG/CSS düğümleri ve aynı referans pozunun CSS hareketi kullanılıyor.

## Doğrulama

- 30 ilgili otomatik davranış kontrolü geçti: kayıtlı yol tercihi, hesap yarışı, ödül kaydı, enerji yenilemesi, XP/altın ve hız puanlama, soru/final motorları, inline JavaScript bütünlüğü.
- Playwright: 360×740, 390×844, 414×896, 768×1024. Her iki haritanın başlangıç/orta/son durumları; çoktan seçmeli/cümle kurma; doğru/yanlış panelleri; tamamlanmış/aktif/kilitli görünüm; misafir sunumu; azaltılmış hareket. 74 ekran görüntüsü.
- Gerçek index’in iki mount çağrısı test edildi; çift harita/sekme oluşmuyor. Aktif düğüm kaydırması, soru panelinin scrollHeight sınırı ve dock üstünde kalması doğrulandı. Yeni konsol hatası yok.
- Testler gerçek çizim ve cevap modülleri üzerinde, sahte API yanıtlarıyla çalışır. Canlı öğrenci hesabı, gerçek Supabase ödül yazımı, mikrofon izinleri ve 10 dakikalık misafir oturumunun uçtan uca süresi bu görsel testlerin kapsamı değildir.
- Eski parkur-learning testlerinin üç kaynak metni beklentisi başlangıç sürümünde de başarısızdı; bu tasarım işi içinde soru motoru bu eski beklentilere göre yeniden yazılmadı.
- Kaynak manifesti doğrulandı. Önceden kayıt bulunmayan 22 route-assets dosyası, başlangıç commit’ine dayanarak “pre-existing-unverified” kaydedildi; kaynak sahipliği hakkında yeni iddia eklenmedi.

## Silinenler

Referans taraması sonrası üç eski dosya silindi:
- `ingilizce/story-space-background.png`
- `ingilizce/story-space-sprites.png`
- `ingilizce/parkur-map-stops-v1.svg`

İlk varlık commit’inde eklenip kullanılmadığı belirlenen iki çapraz kopya da temizlendi: `parkur-okul-assets/island-v1.svg`, `yol-assets/seal-v1.svg`.

Eski `parkur-map-landscape-v1.svg` ve `parkur-map-papi-v1.svg` diğer ekran/ortak bildirimlerde kullanılıyor; diğer eski parkur görselleri de önizleme veya yüklenmeyen eski tema kaynaklarınca referans ediliyor. Körlemesine silinmedi. Kökteki önizleme HTML dosyaları değişmedi. Eski enjekte edilen soru teması ve tekrar eden rota/soru CSS kuralları yerinde kaldırıldı; yeni override dosyası yok.

## Sürümler

Değiştirilen ve doğrudan yüklenen CSS/JS için index sürümü: `?v=20261012-paper-sky-v1`. `story-v2-ui.js` dinamik yükleyicide aynı sürüme yükseltildi; index’e gereksiz erken yükleme eklenmedi.
Service worker: `diji-v110-paper-sky-branch`.

## Değişen dosyalar

- `.github/workflows/oyna-carousel.yml`
- `.github/workflows/selected-play.yml`
- `docs/media-rights-manifest.json`
- `docs/paper-sky-assets.json`
- `docs/space-learning-design.md`
- `ingilizce/game-experience.css`
- `ingilizce/game-feedback.css`
- `ingilizce/game-feedback.js`
- `ingilizce/index.html`
- `ingilizce/oyna-v2.css`
- `ingilizce/oyna-v2.js`
- `ingilizce/papi-feedback.js`
- `ingilizce/parkur-map-stops-v1.svg`
- `ingilizce/parkur-map-theme-v1.css`
- `ingilizce/parkur-map-theme-v1.js`
- `ingilizce/parkur-okul-assets/bolge1-bahar-v1.svg`
- `ingilizce/parkur-okul-assets/bolge2-yaz-v1.svg`
- `ingilizce/parkur-okul-assets/bolge3-sonbahar-v1.svg`
- `ingilizce/parkur-okul-assets/bolge4-kis-v1.svg`
- `ingilizce/parkur-okul-assets/chest-v1.svg`
- `ingilizce/parkur-okul-assets/gate-v1.svg`
- `ingilizce/parkur-okul-assets/joker-bakis-v1.svg`
- `ingilizce/parkur-okul-assets/joker-can-v1.svg`
- `ingilizce/parkur-okul-assets/joker-cift-v1.svg`
- `ingilizce/parkur-okul-assets/joker-dondur-v1.svg`
- `ingilizce/parkur-okul-assets/joker-harf-v1.svg`
- `ingilizce/parkur-okul-assets/joker-ikinci-v1.svg`
- `ingilizce/parkur-okul-assets/joker-kalkan-v1.svg`
- `ingilizce/parkur-okul-assets/joker-papagan-v1.svg`
- `ingilizce/parkur-okul-assets/joker-pas-v1.svg`
- `ingilizce/parkur-okul-assets/joker-yari-v1.svg`
- `ingilizce/parkur-okul-assets/papi-v1.webp`
- `ingilizce/parkur-okul-assets/seal-v1.svg`
- `ingilizce/question-calm-v1.css`
- `ingilizce/question-calm-v1.js`
- `ingilizce/question-panels-v1.css`
- `ingilizce/selected-play.css`
- `ingilizce/selected-play.js`
- `ingilizce/story-path.css`
- `ingilizce/story-path.js`
- `ingilizce/story-space-background.png`
- `ingilizce/story-space-sprites.png`
- `ingilizce/story-v2-ui.js`
- `ingilizce/sw.js`
- `ingilizce/yol-assets/bolge1-gokyuzu-v1.svg`
- `ingilizce/yol-assets/bolge2-gokyuzu-v1.svg`
- `ingilizce/yol-assets/bolge3-gokyuzu-v1.svg`
- `ingilizce/yol-assets/bolge4-gokyuzu-v1.svg`
- `ingilizce/yol-assets/chest-v1.svg`
- `ingilizce/yol-assets/gate-v1.svg`
- `ingilizce/yol-assets/island-done-v1.svg`
- `ingilizce/yol-assets/island-v1.svg`
- `ingilizce/yol-assets/papi-v1.webp`
- `tests/dual-route.test.cjs`
- `tests/oyna-carousel.test.cjs`
- `tests/paper-sky-ui.cjs`
- `tests/story-integration-ui.cjs`
