# Diji Medu · iOS uygulaması

Capacitor kabuğu. Uygulama içeriği canlı siteden gelir (`https://app.dijimedu.com/ingilizce/`),
yani web'e yaptığın her güncelleme iPhone'a da anında yansır; yeni App Store sürümü gerekmez.
Yeni sürüm yalnızca bu klasördeki ayarlar (ikon, izinler, native eklentiler) değişince gerekir.

## Native özellikler (web tarafı: `ingilizce/native-app.js`)
- **Titreşim:** mevcut `navigator.vibrate` çağrıları iPhone'un titreşim motoruna yönlendirilir.
- **Seri hatırlatıcısı:** ilk açılıştan ~25 sn sonra izin sorulur; her akşam 19:00 yerel bildirim
  (o gün uygulama açıldıysa gönderilmez). Sunucu/Supabase kullanmaz.
- **Bağlantı yok:** açılışta internet yoksa `www/offline.html`, kullanım sırasında koparsa üst bant.
- **Giriş:** Play Store sürümündeki gibi Google girişi gizli (Apple girişi de gerekmez).

## Mac'te ilk kurulum
```sh
git clone https://github.com/newteacherboy/english-tracker.git
cd english-tracker/ios-app
sh kur-ios.sh
```
Xcode açılınca: sol üstte **App** → **Signing & Capabilities** → Team: developer hesabın.
Ek bir capability eklemen gerekmez; yerel bildirimler "Push Notifications" istemez.

## İzin metinleri
`izinler.sh` mikrofon ve konuşma tanıma izin metinlerini, şifreleme beyanını ve ana ekran adını
`Info.plist`'e yazar (`kur-ios.sh` bunu otomatik çalıştırır). Konuşma alıştırmaları bu izinler olmadan çöker.

## Sonraki açılışlar
```sh
cd english-tracker && git pull && cd ios-app && npm run ac
```

## Reklam — iOS 1.1 (yalnız test dalı)

Bu çalışma `feature/odullu-reklam` dalındadır. **1.0 incelemesi bitmeden main'e
birleştirmeyin; web dosyalarını, migration'ı veya Edge Function'ı canlıya dağıtmayın.**
Web ve AdMob eklentisi olmayan 1.0 kabuğunda modül hiçbir arayüz, depolama veya ağ
işlemi yapmadan çıkar. Android'in ayrı reklam akışı değiştirilmez.

- Uygulama test kimliği: `ios-app/izinler.sh` başındaki `ADMOB_APP_ID`.
- Üç reklam birimi: `ingilizce/odullu-reklam.js` başındaki `IDS`.
- Gerçek kimlikler bu dalda yoktur. Gerçek yayına geçerken bu iki yerdeki değerleri
  değiştirin; `initializeForTesting` ve `isTesting` seçeneklerini de kapatın.
- AdMob **8.3.0**, Capacitor core/iOS/CLI **8.6.0** kullanılır.
- Çocuk/yaş-altı etiketleri SDK genelinde; `npa:true` her reklam isteğinde uygulanır.
  Eklenti `General` değerini Google'ın **G** derecesine çevirir. `G` doğrudan
  initialize'a verilmez: 8.3.0 bunu tanımıyor.
- UMP önce çalışır; `canRequestAds` yoksa reklam istenmez. ATT anahtarı veya ATT
  çağrısı eklenmez. SKAdNetwork dizisi Google'ın
  [iOS başlangıç dokümanından](https://developers.google.com/admob/ios/quick-start)
  alınan 50 kimliği içerir (30 Ekim 2026); script diziyi her çalışmada yeniler.
- Ortak `reklamGosterilsinMi()` demo, öğretmen/öğretmen kodu oturumu ve gelecekteki
  reklamsız abonelik için `yo.premium` / `window.dmAdsDisabled` kontrolünü yapar.
  Abonelik sunucusu bağlandığında bu değerler doğrulanmış abonelik durumundan beslenmelidir.

Ödüllü: +7 enerji (25 tavan), +100 altın; İstanbul gününde 5/2 hak; ödüller arası
30 saniye. İstemci yalnız native Rewarded olayından sonra ödül ister. Sunucu tek
transaction içinde limitleri ve bakiyeyi kontrol eder; ürün fiyatını kendi
kataloğundan, kıyafette ilk alışveriş/vitrin indirimini de hesaba katarak çözer.
İstek UUID'si aynı ödülün iki kere verilmesini önler. Bu iOS sürümünde SSV henüz
bağlanmamıştır: sunucu limitleri uygular fakat videonun izlendiğine dair Google
imzalı kanıt doğrulamaz. Android'in mevcut SSV fonksiyonu değiştirilmemiştir.

Banner yalnız Mağaza ve oyun listesinde; native alt bant ile taşınan menü arasında
16px boşluk bırakılır. Oyun/sonuç/ders/dialog açılınca kaldırılır. Geçişler ortak
`sonucKapandi` noktasında sayılır; klasik oyunlar, Konu Oyunları, Mola Vakti ve
Kelime Rallisi buna bağlanır. Üç oyun, beş dakika ve oturumda dört gösterim sınırı
birlikte uygulanır. Hazır reklam yoksa, ödül hâlâ işleniyorsa veya listeye
dönülmemişse o geçiş atlanır; sayaç korunur.

### Mac'te hazırlama

```sh
git fetch origin
git switch feature/odullu-reklam
cd ios-app
sh kur-ios.sh
```

Eklenti daha önce kurulduysa:

```sh
cd ios-app
npx cap sync ios && sh izinler.sh
npx cap open ios
```

Xcode'da Version **1.1**, Build ise son yüklenenden büyük bir sayı olmalı.
`kur-ios.sh` eklentiyi ekler; yalnız `cap sync` ilk seferde paketi kurmaz.

**Dalın TestFlight testi:** kabuk varsayılan olarak canlı web'i yüklediğinden,
yalnız bu dalı derlemek yeni web kodunu test etmeye yetmez. Bu dalın web içeriğini
ayrı bir HTTPS test adresine, migration/Edge değişikliklerini ayrı bir test
Supabase projesine hazırlayın. Test derlemesinde `capacitor.config.json` içindeki
`server.url` / `allowNavigation` ve web API yapılandırması bu test ortamına
bakmalı. Bu yerel ortam değişikliklerini main'e taşımayın. Canlıya geçiş bu
çalışmanın parçası olarak yapılmadı.

### Doğrulama

Repo kökünde:

```sh
npm ci --prefix tests/ios-admob
node --test tests/ios-admob.test.cjs
```

Testler PGlite üzerinde gerçek migration fonksiyonunu ve DOM/native köprü
mock'larını çalıştırır. Canlı Supabase'e bağlanmaz. Migration:
`supabase/migrations/20261030155841_ios_admob_rewards.sql`.
Edge dosyaları: `diji-api/index.ts` ve `diji-api/ios-ad-rewards.mjs`.

Cihaz/TestFlight kontrolleri (otomatik testlerin yerine geçmez):

- Eklentisiz 1.0, tarayıcı, demo ve öğretmende reklam öğesi bulunmamalı.
- Enerji bitince tam video +7 (en fazla 25); yarıda kapatma sıfır ödül.
- Enerjide beş, altında iki ödülden sonra seçenek kaybolmalı; İstanbul gece
  yarısında hak yenilenmeli. Altın 100 ve üzerindeyken yalnız pahalı ürün uyarısı
  reklam teklif etmeli. Ağ hatası hiçbir zaman istemcide bakiye artırmamalı.
- Mağaza ve oyun listesinde banner; oyun/ders/sonuç/profil/sohbette sıfır banner.
  Küçük iPhone, çentikli iPhone ve iPad'de menü/son kart ile bant mesafesini ölçün;
  banner yükleme hatasında ayrılan alan kapanmalı.
- Her üç tek oyunculu sonucun kapatılmasında, beş dakika geçmişse geçiş;
  tekrar oyun sırasında, sonuç açıkken veya ödül animasyonu sürerken sıfır geçiş.
  Oturumda en fazla dört; hazır değilse sayaç korunmalı.
- UMP formu gereken test bölgesinde izin akışı, gerekmeyende sessiz geçiş;
  ATT penceresi bulunmamalı. Gerçek cihazda reklam SDK'sının davranışı ve App
  Store gizlilik beyanları 1.1 gönderiminden önce ayrıca doğrulanmalı.
