# Konu Oyunları · A1 yayın raporu

43 konu ve 86 oyun main’e birleştirildi (PR #151). İçerik dosyaları istemci ve sunucuda birebir aynıdır. Telaffuz ve A2+ oyunları kapsam dışındadır.

## Yayın ve testler

- Migration: `20261021112338_konu_oyunlari_a1.sql`, production’a uygulandı.
- `diji-api`: ACTIVE sürüm 184. Diğer edge function’lar değiştirilmedi.
- Yeni testler: **413/413 geçti**, atlanan yok. CI: 39612689670.
- Main (`9f5286d4923dae97739affce75035a8cc2441842`) ve dal tam paketleri aynı Node 22.21.1 ortamında çalıştırıldı. Başarısız test adları ve zaman aşımı dosyaları karşılaştırıldı: **yeni başarısızlık 0, farklı başarısızlık 0**. Eski hatalara dokunulmadı.
- Son karşılaştırmalı koşu: main 631 geçen/30 başarısız, dal 1044 geçen/30 başarısız. Her iki tarafta aynı `evening-ui.test.cjs` dosyası 90 saniye sınırını aştı. Rapor tamamlanmamış dosyayı başarılı saymaz. Önceki tam koşunun mevcut 32 başarısızlığı da karşılaştırmada aynıydı.
- Ayrıntılı dosya ve başarısız test adları: `konu-oyunlari-a1-regresyon.json`.
- Son önbellek etiketi düzeltmesinden sonra 360px Chromium UI testi tekrar geçti. Oyunlar sekmesi JS/CSS sürümleri güncellendi; service worker v213.

Migration ön kontrolündeki rollback fixture çağrısı yeniden denendi; connector `Invalid or expired requestState` hatası verdi. Bu ön kontrol başarılı sayılmadı. Migration uygulama çağrısı başarılıdır; tablo/RPC izinleri ve 43 DB konu anahtarı sonrasında salt okunur sorgularla doğrulandı. Gerçek PostgreSQL testleri yerel PGlite’ta 10/10 geçti.

Güvenlik danışmanında yeni WARN/ERROR yok. Önceden mevcut “Leaked Password Protection Disabled” Auth uyarısı değişmedi. RLS açık/politikasız run tablosu yalnızca service role erişimi için kasıtlıdır.

## Canlı kontrol

Public demo hesabında gerçek UI ve production API ile test edildi:

- Boya Kovası %100: ilk üç tur +70/+70/+70 XP; dördüncü tur 0 XP ve “Bu oyundan bugünkü XP hakkın doldu, yarın yine kazanabilirsin” mesajı.
- İlk ödülde 100120 → 100190 XP. Sayfa yenilendi, 100190 korundu; DB sorgusu aynı değeri doğruladı. Dört tur sonunda 100330 XP.
- DB: 3 makbuz/210 XP, tamamlanan kova run’ı 0, konu oyunu skor kaydı 0, konu oyunu feed kaydı 0. Altın 35691 olarak değişmedi.
- Am/Is/Are → Balon Patlat açıldı; Türkçe anlam cümlenin üstünde. Selamlaşma ve Tanışma → Sohbet Et açılışı ayrıca kontrol edildi.
- Gerçek öğrenci hesabı kullanılmadı; mevcut makbuzlar/bakiyeler silinmedi.

## İçerik kontrolü

352 dil bilgisi sorusu için tek tek bağımsız beklenen cevap denetimi vardır. Soruya özel seçenek listeleri tekil/çoğulda cat/cats veya box/boxes; geniş zamanda play/plays veya do/does şeklindedir. Balon renkleri şık kelimesine göre sabittir. Çoğul iyelik kaldırıldı; tekil `'s / s / is` seçenekleri kullanılır ve ek isme bitişir. Anlama dayalı sorular işaretlidir; bütün dil bilgisi ekranlarında Türkçe anlam İngilizceden önce, büyük ve kalın gösterilir.

Kişisel Bilgiler meslek içermez: boy, girl, man, woman, baby, name, birthday, address, phone number, email, country, city, street, family. Tek anlamlı görseli olmayan age ve surname kullanılmadı. Renkler havuzunda ayırt edilebilir renkler kullanılır; gün ve ay adları emojiye zorlanmadı.

## Dosyalar

Yeni:

- `ingilizce/konu-oyunlari.js`
- `ingilizce/konu-oyunlari.css`
- `ingilizce/konu-oyunlari-a1.js`
- `ingilizce/topic-games-core.mjs`
- `supabase/functions/diji-api/konu-oyunlari-a1.js`
- `supabase/functions/diji-api/topic-games-core.mjs`
- `supabase/functions/diji-api/topic-games-api.ts`
- `supabase/migrations/20261021112338_konu_oyunlari_a1.sql`
- `tests/topic-games.test.cjs`
- `tests/topic-games-db.test.cjs`
- `tests/topic-games-ui.test.cjs`
- `tests/topic-games-live-db.sql`
- `tests/topic-games-topics.json`
- `.github/workflows/topic-games-a1.yml`
- `docs/konu-oyunlari-a1-durum.md`
- `docs/konu-oyunlari-a1-regresyon.json`

Değişen:

- `ingilizce/activity-ui.js`
- `ingilizce/activity-ui.css`
- `ingilizce/index.html`
- `ingilizce/sw.js`
- `supabase/functions/diji-api/index.ts`
- `tests/evening-ui.test.cjs`
- `tests/mola-vakti-dom.test.cjs`
