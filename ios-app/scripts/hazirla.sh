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
# Açılış ekranı: simgesiz düz derin turkuaz (Papi giriş animasyonuyla aynı renk)
node -e "const s=require('sharp');const b={create:{width:2732,height:2732,channels:3,background:'#0A5560'}};Promise.all([s(b).png().toFile('resources/splash.png'),s(b).png().toFile('resources/splash-dark.png')]).then(()=>console.log('splash.png hazır'))"
npx @capacitor/assets generate --ios --iconBackgroundColor '#A5DBA9' --splashBackgroundColor '#0A5560' --splashBackgroundColorDark '#0A5560'

npx cap sync ios
sh izinler.sh

echo "🔧 Yerel dosyalar Xcode projesine…"
cp native/DmBillingPlugin.swift native/MainViewController.swift native/native-runtime.js native/App.entitlements ios/App/App/
# Ana ekran denetleyicisi: eklentiyi kaydeder ve yerel katmanı sayfaya ekler.
sed -i '' 's/customClass="CAPBridgeViewController" customModule="Capacitor"/customClass="MainViewController" customModule="App" customModuleProvider="target"/' ios/App/App/Base.lproj/Main.storyboard
grep -q 'customClass="MainViewController"' ios/App/App/Base.lproj/Main.storyboard || { echo "❌ Main.storyboard güncellenemedi"; exit 1; }
# Capacitor 8.5+ (UIScene): ana ekranı SceneDelegate kodla kurar, storyboard'daki sınıf KULLANILMAZ.
# 1.1 (107) bu yüzden yerel katmanı (ödeme, reklam) hiç başlatmadı. Kök denetleyici burada MainViewController olur.
if [ -f ios/App/App/SceneDelegate.swift ]; then
  python3 - <<'PY'
import re
p='ios/App/App/SceneDelegate.swift'; s=open(p).read()
if 'MainViewController()' not in s:
    s2, n = re.subn(r'\bCAPBridgeViewController\(\)', 'MainViewController()', s)
    if n == 0:
        s2, n = re.subn(r'(rootViewController\s*=\s*)[A-Za-z_.]*\(\)', r'\1MainViewController()', s)
    assert n > 0, 'SceneDelegate içinde kök denetleyici bulunamadı'
    open(p, 'w').write(s2)
print('SceneDelegate kök denetleyicisi: MainViewController')
PY
  grep -q 'MainViewController()' ios/App/App/SceneDelegate.swift || { echo "❌ SceneDelegate MainViewController kullanmıyor"; exit 1; }
fi
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
