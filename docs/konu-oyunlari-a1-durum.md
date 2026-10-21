# Konu Oyunları · A1 uygulama ve doğrulama durumu

21 Ekim 2026. Temel commit: `9f5286d4923dae97739affce75035a8cc2441842`.

## Yayın durumu

**Yayın hazırlığı güncellendi.** Yeni şart: yeni testler yeşil ve main’e göre yeni başarısızlık yok. Main ile dalın tam paketleri aynı Node 22 ortamında karşılaştırıldı; aynı 32 başarısızlık görüldü, yeni başarısızlık yok. Migration production’a uygulandı; yalnızca diji-api version 184, verify_jwt=false ile deploy edildi. Frontend merge ve canlı XP kontrolü bu raporun sonraki durum güncellemesinde tamamlanacaktır.

Dokunulmamış main üzerinde Node 22.21.1 ile çalıştırılan mevcut pakette 32 başarısız assertion doğrulandı. Örnek alanlar: Google kayıt ekranı, eski mikro bölüm ilerlemesi, Meteor, parkur içerik uyumluluğu, profil hesap değiştirme, öğrenci yönetimi, haftalık görev kartı. Bazı arayüz test dosyaları açık zamanlayıcıları nedeniyle ayrıca süre sınırına takılıyor. Mevcut 32 hata kapsam dışında bırakıldı; bunları gizlemek için testler atlanmadı veya ilgisiz uygulama davranışları değiştirilmedi. Yalnızca yeni beşinci sekmenin gerektirdiği iki mevcut kategori testi güncellendi.

## Eklenen davranış

- Canlı lesson_topics sorgusundan alınan 43 aktif A1 anahtarıyla birebir eşleşen 12 kelime, 22 dil bilgisi ve 9 iletişim konusu; toplam 86 oyun.
- Boya/Kelime Kovası, Renk/Konu Çarkı, Balon Patlat, Doğru mu Yanlış mı, Sohbet Et ve Ne Dersin görünümleri.
- A2/B1/B2 “Yakında”; telaffuz yok. Sadece dokunarak seçim, klavye/mikrofon/harf dizme yok.
- İçerik ve soru üretim çekirdeği yalnızca sekme ilk açıldığında yüklenir. Canvas, yeni büyük resim veya uygulama kütüphanesi eklenmedi.
- Sunucunun ürettiği sorular, izinli seçim kimlikleri, sahiplik, 30 dakika süre sınırı, soru başına ortalama 1,5 saniye ve İstanbul gününe göre konu+oyun başına üç ödül hakkı.
- En az %80 için `least(70, dm_game_xp_cap())`; altın/enerji/boost yok. Öğretmen alıştırması XP üretmez; gerçek misafirler yerelde sonuç görür. Demo öğrenci mevcut öğrenci oturum kuralını izler.
- Bitirilen run silinir. Başlatma ve bitirme sırasında süresi dolan run'lar temizlenir. Cevap/başarı geçmişi tutulmaz.
- XP mevcut `extra_data.yo` alanına ve `dm_game_reward_runs` makbuzuna yazılır. Makbuza nullable `topic_key` eklenir; eski makbuz ve bakiyeler değiştirilmez.
- Makbuz ve cüzdan tetikleyicilerinden yeni bir feed olayı çıkması engellenir. Eski oyunların günlük çarpan sayımı yeni `konu:` makbuzlarını hariç tutar; katsayıları ve XP/seviye eğrisi değişmez.

## Doğrulama

- İçerik/API/saf soru üretimi ve gerçek PostgreSQL (PGlite): **58/58 geçti**. Bütün 86 oyun destesinin soru/şık benzersizliği, iki içerik kopyasının eşitliği, gün sınırı, tam %80 eşiği, tekrar ödülü, süre/sahiplik, run silinmesi, özel tablo/RPC izinleri ve feed/skor yazılmaması dahil.
- Gerçek Chromium, 360×740: **1/1 uçtan uca test geçti**; altı görünümün hepsi sonuç ekranına ulaştı, XP durumunun mevcut yenileme fonksiyonuna aktarılması, misafir rozeti, klavye sekme geçişi, kilitli seviyeler, kalan hak, hesap değişimi ve taşma denetlendi. Sunucu yanıtları bu UI testinde kontrollü fixture'dır; production doğrulaması sayılmaz.
- Mola Vakti mevcut DOM paketi: **14/14 geçti**.
- Mevcut online/kapışma sekmesi klavye testi: **1/1 geçti**.
- Son genel tarama: 671 geçen, 29 başarısız assertion; beş dosya süre sınırını aştı. Yeni PostgreSQL dosyası toplu yük altında süre sınırına takıldığı için ayrıca bağımsız çalıştırıldı ve 10/10 geçti. Bu sayılar tam yeşil paket anlamına gelmez.
- Canlı DB konu anahtarları okundu ve snapshot ile eşlendi. Production üzerinde migration+test+rollback ön kontrolü `Invalid or expired requestState` araç hatası nedeniyle tamamlanamadı; uygulanmış kabul edilmedi.
- Mevcut güvenlik danışmanı: “Leaked Password Protection Disabled” uyarısı migration öncesinde de var. RLS açık/politikasız tablolar service-role tasarımına ait INFO kayıtlarıdır. Görev dışındaki Auth ayarı değiştirilmedi.
- Production oyun/70 XP kalıcılığı/dördüncü oyun kontrolü **yapılmadı**, çünkü yayın kapısı kapalı.

## Migration

`supabase/migrations/20261021112338_konu_oyunlari_a1.sql`

Yeni run tablosu, özel bitirme RPC'si, nullable makbuz konu anahtarı ve indeksler ekler. Mevcut XP makbuzlarını/bakiyeleri silmez veya yeniden hesaplamaz. Bilinen iki eski günlük sayım fonksiyonunda yalnızca yeni konu oyunlarının sayılmaması için dar bir filtre ekler; beklenen eski filtre bulunamazsa migration durur. Feed tetikleyicileri konu oyunu işlem kapsamı dışında mevcut davranışını korur.

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

Değişen:

- `ingilizce/activity-ui.js`
- `ingilizce/activity-ui.css`
- `ingilizce/index.html`
- `ingilizce/sw.js`
- `supabase/functions/diji-api/index.ts`
- `tests/evening-ui.test.cjs`
- `tests/mola-vakti-dom.test.cjs`

## Yeniden çalıştırma

Test bağımlılıkları uygulamaya paketlenmez. CI tanımı gerekli Node 22 ve sabit sürümlü test araçlarını Ubuntu 24.04 üzerinde kurar. Ubuntu 26.04 ile eski Playwright arasındaki uyumsuzluk nedeniyle runner sürümü sabitlendi.

```sh
npm install --prefix /tmp/topic-qa --no-save jsdom@26.1.0 @electric-sql/pglite@0.3.14 playwright@1.51.1
node /tmp/topic-qa/node_modules/playwright/cli.js install --with-deps chromium
NODE_PATH=/tmp/topic-qa/node_modules node --test tests/topic-games.test.cjs tests/topic-games-db.test.cjs tests/topic-games-ui.test.cjs
```

`tests/topic-games-live-db.sql`, migration uygulanmış bir veritabanında **BEGIN/ROLLBACK** içinde çalıştırılmak üzere hazırlanmış fixture testidir; production'da kendiliğinden çalışmaz.

## İçerik notu

Görselle tek anlamlı gösterilemeyen “surname” gibi soyut kişisel bilgi kelimeleri kullanılmadı. Kişisel Bilgiler havuzu meslek içermez: boy, girl, man, woman, baby, name, birthday, address, phone number, email, country, city, street ve family. Age için tek anlamlı görsel olmadığı için kullanılmadı. Renkler konusunun kova/çark havuzu ayırt edilebilir 14 renk tonu içerir; gün ve ay adları görsel şıklarına zorlanmadı. Sayılar, tarihler ve saatler dil bilgisi setinde ayrıca yer alır. Kelime/bağlaç/edat gibi anlamı bağlama bağlı sorularda Türkçe anlam açıkça gösterilir; Doğru/Yanlış yönergesi cümlenin bu anlamla eşleşmesini sorar.

## İçerik düzeltmeleri · yayın öncesi

352 dil bilgisi sorusu tek tek gözden geçirildi. Tekil/çoğul ve geniş zaman setlerinde soru bazında item.options kullanılır. Balon rengi kelimeye göre sabittir. Çoğul iyelik kaldırıldı; tekil ’s/s/is seçeneklerinde ek kelimeye bitişik gösterilir. Anlama dayalı sorular meaningRequired olarak işaretlidir; bütün dil bilgisi görünümlerinde Türkçe anlam İngilizceden önce, büyük ve kalın gösterilir. Her soru için İngilizce uyum/sayı veya Türkçe anlamdan bağımsız çıkarılan cevap denetimi eklendi.
