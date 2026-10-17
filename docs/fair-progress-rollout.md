# DijiMedu — Adil ilerleme ve ödül sistemi

## Durum ve yayın sınırı
Bu değişiklikte ortak başarı politikası **altyapı olarak** oluşturulmuştur; sistemdeki var olan ödül fonksiyonları otomatik değiştirilmemiştir. Özellikle etkinliğin ilk cevapları sunucuda kaydedilmeden bir istemci yüzdesine güvenerek altın/XP vermek güvenli değildir. Bu dosya etkinlik sınırlarını belgelendirir, canlı etkinleştirme anlamına gelmez.

## Başarı eşikleri
| Mod | İlk deneme tamamlama | Yüksek başarı | Kusursuz | Kurtarma |
| --- | --- | --- | --- | --- |
| Ana parkur | 8/12 | 10/12 | 12/12 | 3 yeni soru |
| Öğrenme Yolu | 8/11 | 10/11 | 11/11 | 3 yeni soru |
| Ders Çalış | 4/6 | 5/6 | 6/6 | 3 yeni soru |

Ödül oranları sırasıyla %60 / %80 / %100, doğrulanmış kurtarmada %30, henüz başarı yoksa %0. Kısmi ya da kusursuz ödüller, aynı çalışma için yalnızca **en iyi seviyeye yükseltme farkı** kadar ödenir.

## Mevcut uygulamayla etkileşim
- Ders Çalış'da `5f7f5c8` değişikliğiyle sunucu tarafı ilk cevap değerlendirmesi, kurtarma ve geçmiş kayıt koruması bulunuyor. Bu akış korunacak; modülün oranlarıyla uyumluluğu denetlenecek.
- Öğrenme Yolu `dm_story_apply` RPC ile soru başına yanıt doğruluyor, fakat şu anda yanlış cevabı tekrar ettirerek ilk-deneme başarısını ayrı takip etmiyor. Soru tamamlandı diye %100 ödül verilmemesi için sunucuda yeni `first_attempt_correct`, `first_attempt_total`, kurtarma aşaması ve idempotent en iyi seviye ödül defteri gerekiyor. Var olan `mistakes`, `route_combo` ve tekrar akışının verileri geriye dönük silinmemeli.
- Ana parkur `dm_parkur_question_step` ve `dm_game_reward_claim` ile çalışıyor. Sunucu yeni 12 soru/8 doğru koşulunu istemciden gelen `correct` alanına güvenmeden doğrulamalı; aksi halde istemci sahte tamamlama gönderebilir.
- Kelime Rallisi mevcut iki can ve erken bitiş mekanizmasını korumalı. Diğer oyunların her biri ayrı soru sayısı/süre/can ve sıralama kurallarıyla değerlendirilir; aynı eşik körü körüne uygulanmaz.
- Papi Kartları ve Kelime Çarkı'nın yalnız skor tablosuna kaydedilen etkinlikler olduğu mevcut yardım bilgisinde belirtilir; XP/altın sağlamayan oyunlara yeni ödeme yaratılmaz.
- Var olan tamamlanmış bölümler, bakiyeler ve tekrarsız ödüller korunur; geçmişe dönük geri alma yapılmaz.

## Yayına alma kontrolü
1. Her modun soru bazlı ilk yanıtları yalnız sunucunun yönettiği kayıt defterine yazılmalı; istemci `basariliMi`, `correct`, `recovered` değerleri ödül yetkisi sayılmamalı.
2. Geçemeyen öğrenciye yeni 3 soruluk kurtarma sunulmalı; aynı ezberlenen sorular tekrar ödül üretmemeli.
3. Sunucunun tamamlandı kararı, bölüm açılışını ve ödül işlemini birlikte belirlemeli; yarım kalmış denemeler devam etmeli.
4. Eşzamanlı iki cihaz, ağ tekrar denemesi, eski istemci ve aynı `runId` ile yinelenen çağrılar çift ödül üretmemeli.
5. Mobil tarayıcıda küçük ekran, öğretmen hesabı, enerji tükenmesi ve önceki kayıtları taşıyan öğrenci denemeleri yapılmalı; önceden başarısız olan CI kontrolleri ayrı düzeltilmeli.
6. Ancak bu testler ve veritabanı geçişi tamamlandıktan sonra canlı davranış değiştirilmelidir.

## Saf politika modülü
`ingilizce/fair-progress-policy.js` eklenmiştir; sunucu ve istemci matematiksel kararlar için kullanabilir, **tek başına herhangi bir ödül ödeme yetkisi vermez**.
