# Öğretmenimle Zirveye! — kurulum ve doğrulama

Kullanıcının son tarih değişikliği uygulanmıştır:

| Olay | Europe/Istanbul | UTC |
|---|---|---|
| Başlangıç | 20 Kasım 2026 00.00 | 19 Kasım 21.00 |
| Son geçerli dakika | 10 Aralık 2026 23.59 | 10 Aralık 20.59 |
| Bitiş / sonuç hazırlama | 11 Aralık 2026 00.00 | 10 Aralık 21.00 |

Bitiş aralığı sağdan açıktır; 10 Aralık 23:59:59.999 dahildir. Saat ve günlük haklar istemci saatine bağlı değildir.

## Mimari

- `dm_campaign` özel şeması: kampanya, öğretmen grubu/davet kodu, bağımsız katılım, KP olay defteri, günlük oyun kullanımı, ödüller, onay/dağıtım günlüğü. Tüm tablolarda RLS açık; anon/authenticated erişimi yoktur. Public RPC'ler yalnızca service_role tarafından çağrılır.
- `campaign-api.mjs` mevcut portal oturum doğrulamasından gelen kimliği kullanır. İstemcinin öğrenci/öğretmen kimliği, KP, tarih veya plan beyanı kullanılmaz. Sınıf içi misafir oturumları katılamaz.
- Öğretmen bağlantısı doğrulanmış öğretmenin ilk kampanya isteğinde tembel oluşturulur, sonra aynı kalır. Yeni öğretmen onayı sonrası aynı mekanizma çalışır. Tüm öğretmenleri dolaşan toplu iş/sorgu yoktur.
- Katılım öğrenci başına tek ve değiştirilemez. Sınıf ve mevcut `students.teacher_id` değişmez; normal 10 kişilik sınıf yönetimi kotası kullanılmaz. Kampanya kapasitesine 30 kişilik üst sınır da konulmamıştır.
- Davet `?zirve=<UUIDv4>` ile taşınır. Giriş/kayıt/OAuth dönüşü boyunca yerel bekleyen davet korunur; normal hesabın girişinden sonra tek sefer katılım yapılır. Geçersiz veya başka gruba ait ikinci davet yeni katılım yaratmaz.
- KP, doğrulanmış tamamlamalardan veritabanı tetikleyicileriyle üretilir. Ek istemci puan çağrısı, Realtime aboneliği veya sıralama polling'i yoktur. Durum ekranı isteğe bağlı yenilenir ve 60 saniye hesap bazlı önbellek kullanır; sayaç yalnızca cihaz üzerinde güncellenir.
- Okul Yolum: `dm_game_reward_runs` + `dm_verified_runs`; Öğrenme Yolu: `papi_story_progress`; Günün Planı / diyalog-hikâye: sunucu tarafından korunan `practice_reward:*` kayıtları; konu oyunları: doğrulanmış ödül makbuzu ve henüz silinmemiş çalışma kaydı; canlı sohbet: tamamlanmış `dm_papi_dialogue_runs`. Başarısız seviyeyi sonradan düzeltilen cevaplarla başarılı göstermemek için solo başarı ilk cevap doğruluğunu kullanır.
- Kelime Golü ve Candy Papiş başlangıcı mevcut öğrenci satır kilidi altında kampanya hakkını ayırır. Kelimeler/oyun hazırlığı hata verirse aynı işlem geri alınır. Normal hak sayaçları kampanya oyunlarını saymaz. Bu 5+5 oyun enerji harcamaz. Başlangıç yanıtı kaybolursa aynı sunucu oyunu yeniden açılır; Candy için aynı tahta tohumu ve yerel hamle günlüğü korunur. Başlamış bir oyundan isteyerek çıkmak yeni hak oluşturmaz.
- Candy'nin KP'si yalnızca sunucunun aynı deterministik çekirdekle hamle günlüğünü yeniden oynattığı sonuçtan verilir. Eski istemcilerin normal ödül davranışı korunur fakat doğrulanmamış Candy sonucu KP vermez. İki çekirdek kopyasının eşitliği test edilir.
- Grup sıralaması ilk 5 KP toplamı; aktif öğrenci = KP > 0. En az 5 aktif öğrencili gruplar ödül sıralamasında öndedir. Sonra puan, aktif sayısı, puana erişim zamanı sıralanır. Tam eşitlikte sabit kimlik sırası kullanılır.
- Genel tabloda isim/kullanıcı adı/öğrenci kimliği/iletişim bilgisi yoktur. Öğretmen kendi ilk 5 öğrencisinin adını görebilir; öğrenci ekranında anonim sıra etiketleri kullanılır.
- Mevcut 3D Papi varlığı kullanılır. Yeni maskot üretilmez. Duyuru her öğretmen alanı oturumunda bir kez açılır, kapatıldıktan sonra aynı oturumda yinelenmez. Yeniden girişte açılır; bitişte otomatik kapanır. Kampanya düğmeleri bağımsız eklenir.

## Puan ve günlük sınırlar

İstenmeyen sınırsız tekrar avantajını engellemek için belirtilmemiş günlük KP sınırları aşağıdaki şekilde tamamlandı ve uygulama kurallarında açıkça gösterildi:

| Etkinlik | KP | Günlük KP kazanımı |
|---|---:|---|
| Okul Yolum / Öğrenme Yolu | 100 | Her durak yalnızca ilk tamamlamada |
| Günün Planı | 60 | 1 |
| Kelime Golü | 40 | Yalnızca ilk 5 kampanya hakkı |
| Candy Papiş | 40 | Yalnızca ilk 5 kampanya hakkı; sunucuda hamle doğrulaması |
| Diğer tek kişilik oyunlar | 30 | Tüm solo oyunlar toplam 3 başarılı tamamlama |
| Konu oyunları | 25 | Toplam 3 başarılı tamamlama |
| Diyalog / hikâye | 40 | Toplam 3 başarılı tamamlama |
| Canlı sohbet | 50 | 1 başarılı tamamlama |

Katılımdan önce başlayan etkinlikler ve yinelenen tamamlanma olayları sayılmaz. Ücretli ek oyunlar kampanya sınırlarını artırmaz. Sohbet ve diğer etkinliklerin mevcut erişim kuralları değiştirilmez; kampanyaya katılım ile iki özel oyundaki günlük 5+5 hak için abonelik gerekmez.

## Ödül kontrolü

11 Aralık'ta tek zamanlanmış iş `dm_campaign_finalize()` ile sıralama anlık görüntüsünü ve 6 bekleyen ödülü hazırlar; kendisini zamanlayıcıdan kaldırır. Yeterli aktif öğrenciye sahip grup yoksa ödül oluşturulmaz. Yönetici yarışma ekranında “Sonuçları incele” ile hesapları ve süreleri kontrol edip ayrı “Kontrol ettim, 6 ödülü dağıt” düğmesine basar. `campaignApprove` hem API hem veritabanında yönetici doğrular; ikinci dağıtım engellenir.

Hediye yetkileri ayrı `dm_campaign.rewards` kayıtlarından mevcut `dm_plan()` sonucuna eklenir. Apple/Google/web ödeme işlemleri ve `dm_entitlements` kayıtları değiştirilmez. Süre dolduğunda halen geçerli ücretli plan varsa o plan, yoksa Free geçerli olur. Otomatik ücretli abonelik başlatılmaz.

## Canlıya geçiş sırası — henüz uygulanmadı

1. Önce `supabase/migrations/20261115064905_ogretmenimle_zirveye_2026.sql` migration'ını **diji-medu-english / nxfqlutulxqzqgwewssd** üzerinde uygulayın. Migration mevcut `dm_game_access`, `dm_goal_start`, `dm_pwm_start`, `dm_pwm_status`, `dm_plan` tanımlarını kampanya entegrasyonuyla günceller. Mevcut kayıtları silmez.
2. `pg_cron` üretimde kurulu olduğu salt okunur sorguyla doğrulandı. Migration sonrası aşağıdaki zamanlayıcı kontrolünü yapın. Cron saat dilimi UTC olmalıdır; mevcut Supabase varsayılanıyla `0 21 10 12 *` = 11 Aralık 00.00 İstanbul.
3. Migration'dan **sonra** PR birleştirilebilir. Mevcut GitHub iş akışları main'e geçişte `diji-api` ve `premium-games` Edge Function dağıtımlarını başlatır; `SUPABASE_ACCESS_TOKEN` gerekir. Bu gizlinin varlığı/deploy yetkisi bu çalışma sırasında doğrulanmadı. Yeni gizli anahtar gerekmiyor.
4. Mevcut web barındırma dağıtımını tamamlayın; yeni `teacher-campaign` dosyaları, güncellenmiş lazy-game sürümü ve service-worker sürümü birlikte çıkmalıdır. Normal dağıtımın dışında Supabase şemasını herkese açmayın.
5. Staging/üretimde gerçek doğrulanmış öğretmen ve yeni/mevcut öğrenci ile kayıt/OAuth bağlantı dönüşünü, WhatsApp ve panoyu kontrol edin. Android/iOS gerçek cihaz, uygulama içi bağlantı açılması ve safe-area kontrolleri ayrıca yapılmalıdır. Yerel tarayıcı testi bu kontrollerin yerine geçmez.

```sql
select id, starts_at at time zone 'Europe/Istanbul' as starts_local,
 ends_at at time zone 'Europe/Istanbul' as ends_exclusive_local,
 results_at at time zone 'Europe/Istanbul' as results_local
from dm_campaign.campaigns;
select jobname,schedule,command from cron.job where jobname='zirve-2026-finalize';
select public.dm_campaign_status('<doğrulanmış-öğretmen-uuid>','teacher');
```

Bu PR sırasında üretime migration uygulanmadı, Edge Function dağıtılmadı, abonelik/ödül verilmedi ve kullanıcıya mesaj/e-posta gönderilmedi. Kampanya kullanıcı katılımı veya puanı erken başlatılmadı.

## Doğrulama

- 44 Node testi geçti: kampanya API yetkilendirmesi, davetin giriş boyunca korunması, yeni/mevcut hesap katılımı, duyuru oturumu, Candy hamle doğrulaması; mevcut solo seviye, öğretmen erişimi, oyun mekanikleri ve duyuru koordinatörü regresyonları.
- Yerel PostgreSQL (PGlite, üretimden yalnızca şema/fonksiyon tanımları): tek grup/tekrar katılım, 31 katılımcı, sınıf bağı/ilerleme izolasyonu, gerçek Kelime Golü başlangıç/sonuçları, başlatma hatasında rollback, iki ayrı günlük hak kovası, sabit Candy tohumu, KP kaynak adaptörleri, başarısız seviyenin KP almaması, yinelenen olaylar, günlük sınırlar, ilk 5 ve iki eşitlik kuralı, tarih sınırları, İstanbul gece yarısı, arşiv, yönetici onayı, tekrar dağıtım engeli, hediye bitişi/ücretli plana dönüş, RLS ve RPC izinleri geçti.
- Headless Chromium: 360×740 / 390×844 mobil ve 1280×800 masaüstü; yatay taşma, duyuru kapatma/yeniden giriş, sıralama, davet sonrası giriş, otomatik katılım ve Escape/odak kontrolleri geçti. Dört ekran görüntüsü alınıp incelendi.
- `deno check supabase/functions/premium-games/index.ts` geçti; değişen istemci JS dosyalarında sözdizimi kontrolü ve `git diff --check` geçti.
- `diji-api` tam strict Deno kontrolü **geçmiyor**: ana dalda da aynı 80 strict tip tanısı var (örn. implicit any, unknown catch, nullability). Aynı Supabase 2.118.0 tipleriyle ana dal ve bu dalın tanı kümeleri/sayıları karşılaştırıldı; yeni tanı eklenmedi. Bu kontrol temizmiş gibi raporlanmamalıdır. İlgisiz mevcut tip sorunları bu kampanya PR'sinde değiştirilmedi.
- Yeni CI iş akışı aynı Node/PostgreSQL/tarayıcı kontrollerini PR üzerinde çalıştırır. Gerçek Android/iOS cihaz testleri ve canlı migration/dağıtım smoke testleri bekliyor.

Tekrarlama komutları `.github/workflows/teacher-campaign.yml` ve `tests/campaign-*.{mjs,cjs}` dosyalarındadır. Test şema anlık görüntüsü gerçek kullanıcı verisi içermez.
