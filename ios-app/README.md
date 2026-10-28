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
