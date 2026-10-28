#!/bin/sh
# iOS izin metinlerini ve App Store ayarlarını Info.plist'e yazar. Tekrar çalıştırmak güvenlidir.
# Kullanım:  cd ios-app && sh izinler.sh
set -e
cd "$(dirname "$0")"
PLIST="ios/App/App/Info.plist"
[ -f "$PLIST" ] || { echo "❌ $PLIST bulunamadı. Önce: sh kur-ios.sh"; exit 1; }
yaz() { # anahtar tür değer  (plutil -replace: varsa değiştirir, yoksa ekler)
  plutil -replace "$1" -"$2" "$3" "$PLIST"
}

# Konuşma alıştırmaları (SpeechRecognition) bu iki izni ister; metin yoksa iOS uygulamayı kapatır.
yaz NSMicrophoneUsageDescription string "Konuşma alıştırmalarında söylediğin İngilizce kelimeleri dinleyip doğru söyleyip söylemediğini kontrol etmek için mikrofonu kullanır. Sesin Diji Medu sunucularına kaydedilmez."
yaz NSSpeechRecognitionUsageDescription string "Konuşma alıştırmalarında söylediğin İngilizce kelimeleri yazıya çevirip kontrol etmek için konuşma tanımayı kullanır."

# Yalnızca standart HTTPS kullanılıyor: her yüklemede şifreleme sorusu çıkmasın.
yaz ITSAppUsesNonExemptEncryption bool NO

# Ana ekrandaki ad.
yaz CFBundleDisplayName string "Diji Medu"

echo "✅ İzin metinleri ve ayarlar Info.plist'e yazıldı."
