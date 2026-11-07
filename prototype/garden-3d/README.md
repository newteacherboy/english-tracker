# Macera Bahçesi — bağımsız yürünebilir 3D çalışma

**Yayınlanmadı. Mevcut uygulama, eski parkur haritası ve Supabase değiştirilmez.**

Referans: bu konuşmadaki ilk Macera Bahçesi konsepti. Amaç referanstaki taş kapı, köprü, şelale, orman yolu ve sırt çantalı karakter için daha ayrıntılı, çalışan bir sahne hazırlamaktır. Bu çalışma referans çizimin birebir kopyası veya bitmiş mobil oyun olarak sunulmamalı.

Çalıştırma: repository kökünde `python -m http.server 8080`, ardından `/prototype/garden-3d/index.html`.

- Gerçek 3D geometri, dokulu GLB doğa modelleri, PBR malzemeler ve dinamik gölgeler.
- Kodla modellenmiş kapı, köprü, taşlar, kitap, fenerler ve ayrı parçalı karakter rig'i.
- Hareketli su, şelale, sis parçacıkları, portal ışığı ve dalgalanan kitap.
- Sürükleme, sol kumanda ve WASD/ok tuşlarıyla yürüme; üç inceleme kamerası.
- Kız/erkek karakter örnekleri, çarpışma ve köprü üzerinde geçiş.
- Yan açıklıklarda deneme bonusları; gerçek hesap/cüzdan veya ders işlemi yoktur.
- Ses kapalı başlar; yalnız kullanıcının isteğiyle açılır.

`studio.mjs` sahne ve kontrolleri, `models.mjs` model yüklemeyi ve karakter oluşturmayı içerir. Kaynak/lisanslar: `ASSET-CREDITS.md`.

Önemli sınır: bu sahne görsel ve etkileşim incelemesi içindir. Fiziksel iPhone/iPad performansı ölçülmemiştir. Yazılım tabanlı Chromium renderı mobil GPU performansını temsil etmez; bu çalışma 60 FPS iddiasıyla sunulmamalı. Uygulamaya entegrasyon ve mobil optimizasyon ancak görünüm onaylandıktan sonra yapılmalıdır.

## Tek dosyalık çıktı ve kontrol

Bu dizinde `npm install`, ardından `npm run build` çalıştırılabilir. `output/Macera_Bahcesi_3D.html`, bütün motor ve modelleri içinde taşır; çalışma anında internet, CDN veya hesap gerektirmez. Bu dosyayı masaüstünde Chrome/Edge/Firefox ile açın. Telefonda dosya önizleyicisi JavaScript çalıştırmıyorsa normal tarayıcıdan sunulan kaynak sayfasını kullanmak gerekir.

`npm test`, oluşturulmuş tek dosyayı Chromium'da açar; gerçek tuş/fare sürükleme hareketini, bırakınca durmayı, karakter değişimini, kamera düğmesini, köprü/dere sınırlarını ve 360×740 / 768×1024 / 1440×900 yerleşimini doğrular. Chromium ayrı olarak `npx playwright install chromium` ile kurulabilir. Gerekirse `GARDEN_HTML` ve `GARDEN_BROWSER_PATH` mutlak yolları verilir.

Tanıtım videosu, aynı 3D sahnenin farklı kameralardan alınan renderlarıdır; gerçek cihaz FPS ölçümü değildir.
