# Oyunların adil ödül dengesi — 17 Ekim 2026

## Kural
Bu değişiklikte solo oyunların farklı mekanikleri farklı ağırlıklarla değerlendirilir. Temel XP ve altın eski sunucu hesaplamasından gelir, sonra kademeye göre düşürülür. Oyun sonu puanı/sıralama/enerji akışı değişmez.

| Kategori | Oyun anahtarları | Yanlış cevap etkisi |
|---|---|---|
| Kelime/quiz | ky, jp, bosluk, yagmur, tren, dikte, cumle, kp | Her yanlış 1 hata |
| Hafıza/eşleştirme | hafiza, eslestirme | Her başarısız deneme 0,4 hata |
| Harf/kelime tahmini | asmaca, harfbahcesi, kelimebul | Her yanlış 0,6 hata |
| 15 soruluk Kelime Rallisi | ralli | Sunucu doğruluğu, 2 can ve ulaşılan soru |
| Ana Parkur | ba | 12 soruluk ayrı kayıt defteri, 3 kurtarma sorusu |
| Öğrenme Yolu | thematic-learning | 11 soru, 3 kurtarma sorusu |
| Meteor/Çark çok oyunculu | meteor / wheel | Var olan sunucu doğrulamalı skor ve sıralama; yeni XP basılmıyor |

### Solo ödül yüzdeleri
- 0 doğru: %0.
- 1–2 doğru veya düşük isabet: temel ödülün %35'i (küçük pratik ödülü).
- 3+ doğru ve ağırlıklı isabet en az %60: %60.
- 5+ doğru ve ağırlıklı isabet en az %80: %80.
- 6+ doğru ve ağırlıklı isabet en az %97: %100.

Doğruluk yüzdesi = doğru / (doğru + ağırlıklı yanlış). Başarısız eşleştirme denemesi kelime testindeki yanlış cevapla aynı ağırlıkta değerlendirilmez.

### Kelime Rallisi
- 15/15 doğru ve sıfır hata: %100.
- 12+ doğru ve 1 veya daha az hata: %80.
- 8+ doğru: %60.
- 1–7 doğru: %35.
- 0 doğru: %0.

### Güvenlik ve uyumluluk
- Önceki XP, altın, seviye ve ödül kayıtları değiştirilmez.
- Aynı run ID tek sefer ödüllüdür. Tekrar isteklerde daha büyük doğru sayısı ödülü artıramaz.
- Aynı gün aynı oyun/sınıf/ünite için yeni run ID kullanılsa bile ödül çift birikmez. Daha iyi sonuçta yalnız XP/altın farkı ödenir; Ralli de aynı kurala tabidir.
- Solo ödüller mevcut günlük çarpan, hız bonusu ve ödül sınırları üzerinden sunucuda işlenir.
- Öğrenme Yolu, Ders Çalış, Ana Parkur ve Rally kendi sunucu kayıtlarını korur.
- **Sınırlama:** Eski istemci tabanlı solo oyunlar ilk cevapları sunucuda doğrulamıyor. Doğru/yanlış istemciden geliyor. Tam sahteciliğe direnç için soru ve cevaplar sunucuya taşınmalı; bu güncelleme tam koruma iddiasında değildir.
- MeduPro ve ana API'nin **solo** oyunları aynı adil ödül kanalını kullanır. MeduPro'nun eski Ana Parkur kimlikleri farklı olduğundan eski Ana Parkur (`ba`) yolu henüz yeni parkur kapısına dönüştürülmemiştir; bu uyumluluk ve hile engeli ayrıca doğrulanmalıdır. Canlı MeduPro sunucu sürümü GitHub'daki dosyadan eski olabileceğinden, dağıtımda yalnız mevcut sürümün ödül çağrısı değiştirilmelidir.
- Öğretmen paneli, sınıf oyunları ve düelloların kendi puanlaması etkilenmez; bunlara yeni otomatik XP/altın eklenmez.

### Kontroller
Rollback SQL testleri: tests/solo-game-fair-db.sql, tests/rally-fair-rewards-db.sql, tests/parkur-fair-ledger-db.sql, tests/thematic-fair-recovery-db.sql. GitHub Actions: All game fairness. Diji ve MeduPro Edge Function'larının ayrıca dağıtılması gerekir.
