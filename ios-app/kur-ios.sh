#!/bin/sh
# Diji Medu iOS projesini Mac'te hazırlar. Kullanım:  cd ios-app && sh kur-ios.sh
set -e
cd "$(dirname "$0")"

echo "🦜 Diji Medu iOS kurulumu başlıyor…"

command -v node >/dev/null 2>&1 || { echo "❌ Node.js bulunamadı. nodejs.org'dan LTS sürümünü kurup tekrar dene."; exit 1; }
xcode-select -p >/dev/null 2>&1 || { echo "❌ Xcode bulunamadı. App Store'dan Xcode'u kurup bir kez aç, sonra tekrar dene."; exit 1; }

echo "📦 Paketler kuruluyor (birkaç dakika sürebilir)…"
npm install --no-audit --no-fund \
  @capacitor/core@latest @capacitor/ios@latest \
  @capacitor/haptics@latest @capacitor/local-notifications@latest @capacitor/network@latest
npm install --no-audit --no-fund --save-dev @capacitor/cli@latest @capacitor/assets@latest

if [ ! -d ios ]; then
  echo "📱 iOS projesi oluşturuluyor…"
  npx cap add ios --packagemanager SPM
fi

echo "🎨 Uygulama ikonu üretiliyor…"
npx @capacitor/assets generate --ios --iconBackgroundColor '#1E88E5' --splashBackgroundColor '#FAF8F5' || \
  echo "⚠️ İkon üretilemedi; Xcode'da Assets → AppIcon'a resources/icon.png'yi elle sürükleyebilirsin."

npx cap sync ios
sh izinler.sh

echo "✅ Hazır. Xcode açılıyor…"
npx cap open ios
