# Tematik öğrenme yolu

20 Ekim 2026: 46 tema, 206 konu ve toplam 412 durak. A1: 156, A2: 156, B1: 50 (10 tema), B2: 50 (10 tema). Güncel içerik ve geçiş ayrıntıları `docs/route-expansion-20261020.md` dosyasındadır. Önceki 240 bölümün kimlikleri korunur. Her bölümde bir öğretim adımı ve dokuz doğrulanan soru bulunur (toplam 2.160 soru). Birinci bölüm temel ifadeleri tanıtır; ikinci bölüm aynı konuyu günlük cümlelerle kullandırır. Bu yolun tamamlanması B2 yeterlilik belgesi anlamına gelmez.

İçeriğin düzenlenebilir kaynakları `content/thematic-topics.txt` ve sayılar, günler, aylar gibi konuların ek sözlükleri için `content/thematic-reference.json`; derleyici `scripts/build-thematic-learning.py`. Her satırda tema, konu, üç kelime/ifade ve üç günlük kullanım örneği yer alır. Derleyici aynı veriyi tarayıcı ve Edge Function için üretir. `learning-core.js` deterministiktir ve her iki ortamda aynı soru akışını oluşturur.

İki özgün görsel atlası 72 nesne içerir. Renkler, şekiller ve sayılar kesin CSS biçimleriyle çizilir. Bir kavram için güvenilir görsel yoksa görsel varmış gibi sunulmaz; kelime/dinleme sorusu kullanılır. Bazı bölümlerde birden fazla görselli soru ve görselle eşleştirme vardır. Görsellerin kaynak ve dosya hash kayıtları medya manifestindedir.

`thematic-learning` bağımsız Edge Function, mevcut portal oturumlarını SHA-256 token hash ile doğrular. Öğrenci/öğretmen durumu, hesap sahipliği, bölüm sırası, cursor ve version sunucuda kontrol edilir. İlerleme `papi_story_progress` içinde 1000–1239 kimliklerinde tutulur; 0–79 eski kayıtları silinmez veya yeniden yorumlanmaz.

İlk girişte `dm_thematic_enrollment`, eski tamamlanan bölüm sayısını bir kez kaydeder. O sayıda yeni başlangıç bölümü tamamlanmış kabul edilir; aktarım sırasında yeni XP/altın verilmez. Bu bölümleri yeniden açan kişi ödülsüz tekrar turuna girer. Eski yarım bölüm kayıtları tarihçe olarak korunur; farklı içerikteki bir soruya taşınmaz. Eski XP, altın ve okul parkuru kayıtları değişmez.

Yeni yanıtlar mevcut atomik `dm_story_apply` RPC'sine sunucunun hesapladığı doğrulukla gönderilir. Dokuz soru iki soruda bir enerji kuralına tabidir; mevcut kombo sistemi korunur. Tamamlanma ödülü tekrar verilmez; sürüm uyuşmazlığında yeni kayıt gösterilir. Ağ hatası aynı adımdan yeniden denemeye izin verir. Öğretmen hesabı öğretmen denemesi olarak ilerler, öğrenci cüzdanı kullanmaz.

Kurulum: `scripts/install-thematic-learning.sql` işlem bütünlüğü içinde ek kimlik aralığını ve RLS açık, servis erişimli geçiş tablosunu hazırlar. Canlı RPC'nin ekonomi ve kombo gövdesi korunarak yalnız bölüm aralığı genişletilir. Sosyal akış bölüm numaralarını 1–240 olarak gösterir ve tekrar turunu yayımlamaz. Ardından `supabase/functions/thematic-learning` dağıtılır. Eski endpoint ve eski soru motorları korunur.

Doğrulama: `node --test tests/thematic-learning.test.cjs`; `node tests/thematic-learning-ui.cjs` (Playwright gerekir). CI 320, 390, 768 ve yatay 844 pikselde tema listesi, görselli öğretim, dokuz soruluk tam bölüm, sonuç ve sonraki bölüm akışını test eder. SQL ekonomi testi rollback ile çalışır.
