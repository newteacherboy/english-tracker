#!/bin/sh
# Diji Medu iOS projesini Mac'te hazırlar. Kullanım:  cd ios-app && sh kur-ios.sh
# Not: Normal sürümler GitHub'daki "iOS sürümü" iş akışıyla Mac gerekmeden derlenip TestFlight'a gönderilir.
set -e
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "❌ Node.js bulunamadı. nodejs.org'dan LTS sürümünü kurup tekrar dene."; exit 1; }
xcode-select -p >/dev/null 2>&1 || { echo "❌ Xcode bulunamadı. App Store'dan Xcode'u kurup bir kez aç, sonra tekrar dene."; exit 1; }
sh scripts/hazirla.sh
echo "✅ Hazır. Xcode açılıyor…"
npx cap open ios
