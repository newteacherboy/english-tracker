#!/bin/sh
# iOS projesini sıfırdan üretir ve Diji Medu'nun yerel parçalarını ekler. GitHub (macOS) derlemesi ve Mac'te kur-ios.sh kullanır.
#   DM_PRODUCTION_ADS=1  → gerçek reklam birimleri (admob.config.json → ios.productionEnabled de true olmalı)
set -e
cd "$(dirname "$0")/.."
ROOT="$(cd .. && pwd)"

echo "📦 Capacitor paketleri…"
npm install --no-audit --no-fund \
  @capacitor/core@8.6.0 @capacitor/ios@8.6.0 @capacitor/app@8.1.2 \
  @capacitor-community/admob@8.3.0 @capacitor/push-notifications@8.1.3 \
  @capacitor/haptics@8.0.2 @capacitor/local-notifications@8 @capacitor/network@8.0.1 @capacitor/share@8
npm install --no-audit --no-fund --save-dev @capacitor/cli@8.6.0 @capacitor/assets@3 sharp@0.34.5

echo "🧩 Ortak yerel katman (reklam, üyelik, bildirim)…"
(cd "$ROOT/android-app" && npm install --no-audit --no-fund && node scripts/build-ios-runtime.mjs "$ROOT/ios-app/native/native-runtime.js")

if [ ! -d ios ]; then npx cap add ios --packagemanager SPM; fi

echo "🎨 Simge (yeni Papi logosu)…"
mkdir -p resources
node -e "require('sharp')('$ROOT/ingilizce/app-icons/papi-logo-1024.png').resize(1024,1024).flatten({background:'#A5DBA9'}).removeAlpha().png().toFile('resources/icon.png').then(()=>console.log('icon.png hazır'))"
npx @capacitor/assets generate --ios --iconBackgroundColor '#A5DBA9' --splashBackgroundColor '#FAF8F5'

npx cap sync ios
sh izinler.sh

echo "🔧 Yerel dosyalar Xcode projesine…"
cp native/DmBillingPlugin.swift native/MainViewController.swift native/native-runtime.js native/App.entitlements ios/App/App/
# Ana ekran denetleyicisi: eklentiyi kaydeder ve yerel katmanı sayfaya ekler.
sed -i '' 's/customClass="CAPBridgeViewController" customModule="Capacitor"/customClass="MainViewController" customModule="App" customModuleProvider="target"/' ios/App/App/Base.lproj/Main.storyboard
grep -q 'customClass="MainViewController"' ios/App/App/Base.lproj/Main.storyboard || { echo "❌ Main.storyboard güncellenemedi"; exit 1; }
# Anlık bildirim jetonunu Capacitor'a ilet (Capacitor belgelerindeki iki yöntem).
if ! grep -q capacitorDidRegisterForRemoteNotifications ios/App/App/AppDelegate.swift; then
  python3 - <<'PY'
p='ios/App/App/AppDelegate.swift'; s=open(p).read()
anchor='class AppDelegate: UIResponder, UIApplicationDelegate {'
assert anchor in s, 'AppDelegate yapısı beklenenden farklı'
s=s.replace(anchor, anchor+'''

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
''',1)
open(p,'w').write(s)
PY
fi
ruby -rxcodeproj -e1 2>/dev/null || gem install xcodeproj 2>/dev/null || sudo gem install xcodeproj
ruby scripts/yerel-ekle.rb
echo "✅ iOS projesi hazır."
