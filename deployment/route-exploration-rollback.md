# 3D parkur — yayın ve geri alma kaydı

Kullanıcı 23 Ekim 2026 tarihinde yayına onay verdi. Geri alma komutu: **“3D parkuru geri al.”** Bu komut bu özelliği kapatmak ve önceki durak haritasını yeniden yayınlamak anlamına gelir; başka güncellemeler veya öğrenci verileri sıfırlanmamalı.

## Yayından önceki doğrulanmış sürüm

- GitHub main: `05ed77d84b68f5a060fa78081c831fe46a8b035d`.
- Korunan dal: `backup/pre-3d-route-20261023`.
- Supabase projesi: `nxfqlutulxqzqgwewssd`.
- diji-api: sürüm **189**, verify_jwt=false. Yayındaki 45 dosyanın tamamı yukarıdaki main kaynağıyla birebir karşılaştırıldı ve eşleşti.
- Yeni API: sürüm **190**; yalnızca index.ts içindeki yeni import/işlem yönlendirmesi ve route-exploration.mjs eklendi. Diğer 44 dosya sürüm 189 ile aynıdır.
- Yeni SQL: `route_exploration_verified_corner_rewards` migration'ı. Yeni RPC `dm_route_exploration`; mevcut tablolar kullanılır, veri sıfırlanmaz. RPC security invoker'dır; anon ve authenticated çalıştıramaz, yalnızca service_role çalıştırabilir.

## “3D parkuru geri al” denince

1. Güncel main'i al. Tüm siteyi eski commit'e resetleme; sonradan gelen ilgisiz değişiklikleri koru.
2. `ingilizce/index.html` dosyasından `route-exploration.js` script'ini ve `route-exploration.css` stil yüklemesini kaldır. `oyna-v2.js` içindeki `window.dmRouteExploration?.mount(...)` çağrısı isteğe bağlı olduğundan eski harita çalışmaya devam eder; istenirse yalnız bu çağrı da kaldırılır.
3. `ingilizce/sw.js` cache sürümünü ve değiştirilmiş JS URL sürümlerini artır; ön yüzü yayınla. Açık uygulama yeni sayfa yüklemesinde eski haritaya döner. Kullanıcıdan sayfayı yenilemesini iste.
4. İlerleme, profil, XP, altın, enerji, `dm_progress_rewards` ve `energy_transactions` kayıtlarını SİLME veya eski yedeğe döndürme. Kazanılmış haklar korunur, aynı bonusun tekrar verilmesi önlenir.
5. Yalnızca 3D haritanın kapatılması için API'yi veya SQL'i geri almak gerekmez. API kaynaklı bir sorun da varsa güncel API'den yalnız `routeExplorationAPI` import/yönlendirmesini çıkararak deploy et. Tam API geri dönüşü zorunluysa korunan daldaki `supabase/functions/diji-api` kaynağı sürüm 189'un doğrulanmış kaynağıdır; sonraki ilgisiz API değişikliklerini korumayı değerlendir.
6. Canlı sayfada 3D script/stilinin yüklenmediğini, mevcut haritanın ve bölüm açmanın çalıştığını doğrula.

Bu işlem veritabanı yedeği geri yükleme işlemi değildir. Öğrencilerin ilerlemesi ve toplanmış ödülleri korunur.
