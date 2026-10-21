# Konu Oyunları · A1 düzeltmeleri ve A2 yayın raporu

A1 ortak oyun ekranları düzeltildi; A2'nin aktif 43 konusu için 86 oyun eklendi. PR #152 main'e birleştirildi: `42846ad75b94530073482acea1f5b1ddb42ed727`.

## Yayın

- Supabase projesi: `nxfqlutulxqzqgwewssd`.
- Yalnızca `diji-api` yayınlandı; son sürüm **186 / ACTIVE**, `verify_jwt=false`, giriş dosyası `index.ts`.
- Migration/SQL değişikliği uygulanmadı. Mevcut metin türündeki `topic_key` ve ödül RPC'si A2'yi destekliyor.
- Main'e eşzamanlı eklenen yönetim modülü değişikliği korunarak son fonksiyon paketi main ile eşitlendi; bu modül PR #152'nin değişikliği değildir.
- Güvenlik ve performans danışmanlarında yeni WARN/ERROR yok. Önceden mevcut parola koruması uyarısı ve dört mükerrer indeks uyarısı değişmedi.
- İstemci önbellek etiketleri güncellendi; service worker `diji-v215-konu-a2-release-20261021`. A2 kataloğu açılışta indirilmez, çip seçilince yüklenir ve ilk kullanımda önbelleğe alınır.

## Test ve regresyon

Hedef paket: **461/461 geçti**, başarısız/atlanan yok. İçerik, API, gerçek PostgreSQL/PGlite ve Chromium testleri birlikte çalıştırıldı.

CI: https://github.com/newteacherboy/english-tracker/actions/runs/39636856012

Aynı Node **v22.23.3** ve aynı bağımlılıklarla karşılaştırma:

| Kaynak | Test dosyası | Geçen | Mevcut başarısız |
|---|---:|---:|---:|
| Main `363dfbce` | 141 | 1044 | 30 |
| Test edilen dal `e672c95d` | 143 | 1092 | 30 |

**Yeni başarısızlık: 0.** CJS ve 7 ESM test dosyası kapsandı. Her iki tarafta aynı `evening-ui.test.cjs` dosyası 90 saniye sınırını aştı; zaman aşımı başarılı sayılmadı. Dosya ve başarısız test adları `konu-oyunlari-a2-regresyon.json` içindedir.

Tarayıcı denetimleri:

- A1/A2 × açık/koyu cihaz modu × 6 oyun: soru ve sonuç yüzdesi kontrastı ≥ 4.5; doğru sayısı ve seçenekler de kontrol edildi.
- Soru öncesi Türkçe çeviri yok. Ne Dersin'in Türkçe durum sorusu korunur.
- Çark 360×740, 768×1024 ve 1440×900 ekranlarda 240–460 px aralığında; çark ve seçenekler kaydırmadan sığıyor. CI görüntüleri artefakta kaydedildi.
- Web Audio mock'u doğru/yanlış ve sonuç notalarını, tek AudioContext kullanımını, efektten sonra İngilizce seslendirme sırasını ve hesap başına sessize alma tercihini doğruluyor.
- A2 kapalı öğrenci açıklama notunu görüyor; sunucu 403 ile reddediyor. Açık öğrenci, öğretmen ve güvenilir demo kimliği geçiyor. Seviye kontrolü hatasında sunucu erişim vermiyor.

## Canlı kontrol

Canlı A2 doğrulaması: https://github.com/newteacherboy/english-tracker/actions/runs/39639540905

Altı A1 oyunu + A2 arayüzü/ses/yenileme: https://github.com/newteacherboy/english-tracker/actions/runs/39640609758 (**başarılı**).

- İlk A2 Past Simple → Balon Patlat denemelerinde ilk üç tur **+70 / +70 / +70 XP**, dördüncü tur **0 XP / daily_limit** döndü. Veritabanında üç ödül fişi ve toplam 210 XP doğrulandı; tamamlanan Balon run’ları silindi. Yenilemede 100540 XP korundu.
- Son canlı testte A1’in altı oyunu koyu cihaz modunda soru ve sonuç ekranlarına kadar oynandı. Kova, yanlış cevap ve düşük sonuç sesini sınamak için bilerek %0 tamamlandı. Çark %100, Balon %90, Doğru/Yanlış %100, Sohbet %100 ve Ne Dersin %100 sonuç verdi; bu beş tur +70’er XP kazandırdı.
- A2 Past Simple, gerçek arayüzden %100 tamamlandı; günlük üç ödül önceden tüketildiği için 0 XP / daily_limit döndü. A2 Duygular çarkı PC’de **460×460 px** ölçüldü; Günlük Durumlar sohbeti açıldı. Soru öncesi çeviri kutusu ve sohbet mesajı altı çeviri yok.
- Gerçek AudioContext üzerinde doğru **660/880 Hz**, yanlış **220/165 Hz**, kazanma **523/659/784/1047 Hz**, düşük sonuç **392 Hz** çağrıları kaydedildi. İngilizce seslendirme 73 kez çağrıldı. Bu, tarayıcı ses API’lerinin çalıştığını doğrular; fiziksel hoparlör dinleme testi değildir.
- Son yenilemede cüzdan **100890 XP** gösterdi ve sunucunun son ödül toplamıyla eşleşti. Altın 35691 olarak değişmedi.
- Soru/sonuç görüntüleri ve çark/sohbet ekranları son CI çalışmasının `topic-a2-live` artefaktındadır. Açılıp bitirilmeden kapatılan çark/sohbet run’ları normal süre sonu temizliğine bırakıldı; test verisi silinmedi.

Canlı test, normal yükleme ekranını ve etkinlik sekmesinin çizilmesini bekler; girişteki seviye kutlamasını kendi düğmeleriyle kapatır. Üretim CSP’si korunur; kontroller DOM seçicileriyle yapılır. Web Audio ve seslendirme çağrıları gerçek tarayıcı API’leri çalışmaya devam ederken gözlemlenir. Bu test uyarlamaları uygulama davranışını değiştirmez.

## İçerik denetimi

- A2: 12 kelime + 22 dil bilgisi + 9 iletişim konusu. Anahtarlar aktif `lesson_topics` kayıtlarıyla birebir karşılaştırıldı; telaffuz yok.
- Her iki seviyede 352 dil bilgisi maddesi vardır. Türkçe ipucuna bağımlı A1 sorularına İngilizce bağlam eklendi; sayı/tarih ve sıklık ipuçları belirginleştirildi. Bütün maddelerde `contextOk:true` işareti test ediliyor.
- Doğru/Yanlış'ın yanlış kartları dil bilgisi hatası içerir; yalnız anlamı farklı olan dil bilgisi bakımından doğru cümleler yanlış sayılmaz. Anlama göre yanlış seçenek seçmek yerine bağımsız `falseSentence` kullanılır.
- A2 zaman karşılaştırmalarında last year, yesterday, since, yet gibi işaretler kullanıldı. Eşdeğer kipler ve who/that gibi iki doğru doğuracak seçenekler birlikte verilmedi.
- A2'de 168 kelime öğesi, 352 dil bilgisi maddesi, 72 sohbet turu ve 90 durum sorusu vardır. Sohbetler konu başına 8 sıralı turdur.
- Belirsiz hastalık ikonları (headache/cough/fever/broken arm) ve emojiyle ayırt edilemeyen kişilik sıfatları kelime oyunlarına alınmadı; sağlık konusunda somut vücut/sağlık nesneleri kullanıldı.
- A1 sohbetindeki bağlama uygun ikinci cevap olabilecek seçenekler değiştirildi. Türkçe çeviriler cevap sonrası geri bildirimde kalır.
- İstemci/sunucu A1, A2 ve ortak soru üretici kopyaları birebir test edildi.

## Dosyalar

PR #152 kapsamındaki dosyalar:

- `.github/workflows/topic-games-a1.yml`
- `.github/workflows/topic-games-live.yml`
- `ingilizce/activity-ui.js`
- `ingilizce/index.html`
- `ingilizce/konu-oyunlari-a1.js`
- `ingilizce/konu-oyunlari-a2.js`
- `ingilizce/konu-oyunlari.css`
- `ingilizce/konu-oyunlari.js`
- `ingilizce/sw.js`
- `ingilizce/topic-games-core.mjs`
- `supabase/functions/diji-api/konu-oyunlari-a1.js`
- `supabase/functions/diji-api/konu-oyunlari-a2.js`
- `supabase/functions/diji-api/topic-games-api.ts`
- `supabase/functions/diji-api/topic-games-core.mjs`
- `tests/topic-games-a2-topics.json`
- `tests/topic-games-a2-ui.test.cjs`
- `tests/topic-games-a2.test.cjs`
- `tests/topic-games-live.cjs`
- `tests/topic-games-regression.cjs`
- `tests/topic-games-ui.test.cjs`
- `tests/topic-games.test.cjs`

Yayın raporu ve karşılaştırma dökümü:

- `docs/konu-oyunlari-a2-durum.md`
- `docs/konu-oyunlari-a2-regresyon.json`

