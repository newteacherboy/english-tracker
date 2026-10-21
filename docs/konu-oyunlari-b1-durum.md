# Konu Oyunları · B1 yayın raporu

B1: 43 aktif konu / 86 oyun; telaffuz kapsam dışı. Yayın ve CI doğrulaması sürüyor; bu taslak yayın yapıldığı anlamına gelmez.

## Yayın

- Proje: `nxfqlutulxqzqgwewssd`. Yalnız `diji-api`, `verify_jwt=false`, giriş `index.ts` hedefleniyor.
- Migration/SQL değişikliği yok. Mevcut metin `topic_key` ve genel ödül RPC’si kullanılacak.
- İstemci/sunucu katalogları birebir; B1 katalog seçilince tembel yüklenir ve önbelleğe alınır.
- B1 kapalı öğrenci 403; erişim kontrolü hatası 503; öğretmen ve güvenilir demo kimliği geçer.

## Test ve regresyon

Yerel içerik/API/PGlite paketi ilk koşuda 507/507 geçti. Son tam paket, Chromium, CI ve regresyon sonuçları tamamlandığında buraya işlenecek. Yerel tam Chromium soket kısıtına takıldı; headless Chromium Shell ile kontroller sürüyor. Başarısız başlatma başarılı sayılmadı.

## Canlı kontrol

Henüz yapılmadı. Yalnız public demo kullanılacak; makbuz/bakiye/test verisi silinmeyecek. Altın değişmeyecek.

## İçerik denetimi

- DB’den çekilen anahtarlar: `tests/topic-games-b1-topics.json`. 12 kelime, 22 dil bilgisi, 9 iletişim konusu.
- 168 kelime öğesi; 352 dil bilgisi maddesi; 72 sohbet turu ve 90 durum sorusu.
- 352 madde için katalogdan bağımsız beklenen cevap listesi; yanlış kartların hata gerekçeleri `tests/topic-games-b1-false-audit.json` içinde.
- Her öğe `contextOk:true`; Türkçe yalnız geri bildirimde, Ne Dersin durum sorusu istisnasıyla.
- Kullanıcının onayıyla yalnız üç kelime konusunda İngilizce tanım istisnası vardır. Diğer dokuz konu emojiyle kalır. Tanımlar en fazla 10 kelime; cevap veya kökü içermez. Tanımlar soru kartındadır; seçenek/dilim/kova etiketlerinde yoktur.
- Kelime sayısı eksik konu yoktur. Soyut sözcükler uydurma ikonlarla tamamlanmamıştır.

### Tanımla gösterilen kelimeler

- **Society and social issues — Toplum ve Sosyal Sorunlar**: volunteer, charity, poverty, equality, pollution, unemployment, community, donation, petition, election, public transport, homelessness.

- **Crime and law — Suç ve Hukuk**: court, lawyer, witness, jury, law, fine, licence, police station, evidence, legal aid, verdict.

- **Abstract nouns (opportunity, change, etc.) — Soyut İsimler**: opportunity, courage, patience, trust, advice, success, curiosity, honesty, friendship, freedom, decision, imagination, kindness, improvement.

### İkon belirsizliği nedeniyle değiştirilen veya çıkarılan adaylar

- İnsanlar ve İlişkiler: twins/dancing-people eşleştirmesi belirsiz olduğu için çıkarıldı; handshake kullanıldı.
- Toplum ve Sosyal Sorunlar: poverty, equality, unemployment gibi kavramlara simgesel bina/kişi emojisi atanmadı; yukarıdaki tanımlar kullanıldı.
- Suç ve Hukuk: court, lawyer, witness gibi kavramlar aynı ikonla gösterilmedi; tanım kullanıldı. Silah, kan ve hapishane parmaklığı kullanılmadı.
- Soyut İsimler: bütün 14 kelime tanımla gösterilir; duygu emojileriyle kişilik/kavram tahmini yaptırılmaz.
- Çevre: waterfall için dalga emojisi uygun bulunmadı; doğrudan wave kullanıldı.

## Dosyalar

B1 katalogları, içerik/arayüz testleri, DB anahtarları, yanlış kart denetimi, ortak soru üretici, seviye kapısı, istemci sürümleri ve iki CI iş akışı güncellendi.
