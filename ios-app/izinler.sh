#!/bin/sh
# iOS izin metinlerini ve App Store ayarlarını Info.plist'e yazar. Tekrar çalıştırmak güvenlidir.
# Kullanım:  cd ios-app && sh izinler.sh
set -e
ADMOB_APP_ID="ca-app-pub-3940256099942544~1458002511"
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

# Google iOS quick-start SKAdNetwork list, retrieved 2026-10-30.
# https://developers.google.com/admob/ios/quick-start
yaz GADApplicationIdentifier string "$ADMOB_APP_ID"
# No ATT usage description or tracking authorization request.
plutil -replace SKAdNetworkItems -json '[
  {
    "SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "4fzdc2evr5.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "2fnua5tdw4.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "ydx93a7ass.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "p78axxw29g.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "v72qych5uu.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "ludvb6z3bs.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "cp8zw746q7.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "3sh42y64q3.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "c6k4g5qg8m.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "s39g8k73mm.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "wg4vff78zm.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "3qy4746246.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "f38h382jlk.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "hs6bdukanm.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "mlmmfzh3r3.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "v4nxqhlyqp.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "wzmmz9fp6w.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "su67r6k2v3.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "yclnxrl5pm.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "t38b2kh725.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "7ug5zh24hu.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "gta9lk7p23.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "vutu7akeur.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "y5ghdn5j9k.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "v9wttpbfk9.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "n38lu8286q.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "47vhws6wlr.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "kbd757ywx3.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "9t245vhmpl.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "a2p9lx4jpn.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "22mmun2rn5.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "44jx6755aq.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "k674qkevps.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "4468km3ulz.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "2u9pt9hc89.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "8s468mfl3y.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "klf5c3l5u5.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "ppxm28t8ap.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "kbmxgpxpgc.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "uw77j35x4d.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "578prtvx9j.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "4dzt52r2t5.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "tl55sbb4fm.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "c3frkrj4fj.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "e5fvkxwrpn.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "8c4e2ghe7u.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "3rd42ekr43.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "97r2b46745.skadnetwork"
  },
  {
    "SKAdNetworkIdentifier": "3qcr597p9d.skadnetwork"
  }
]' "$PLIST"
