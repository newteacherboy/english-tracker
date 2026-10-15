# Papi AI sohbetini etkinleştirme

Kod ve veritabanı hazır olsa da gerçek AI yanıtları Cloudflare hesabı bağlanana kadar kapalıdır. Mevcut diyalog alıştırmaları kullanılabilir.

1. Cloudflare Workers **Free** hesabında Workers AI → Use REST API bölümünü açın. Ücretli Workers planına veya AI Gateway kredilerine geçmeyin. Bu uygulama hesap planını API üzerinden değiştirmez veya yükseltmez.
2. Workers AI token şablonuyla yalnız ilgili hesap için **Workers AI Read / Edit** yetkili bir token oluşturun. Account ID bilgisini alın. Token'ı sohbete, GitHub'a veya tarayıcı koduna yapıştırmayın.
3. Supabase projesi `nxfqlutulxqzqgwewssd` → Edge Functions → Secrets alanına ekleyin:

| Secret adı | Değer |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_AI_TOKEN` | Yalnız Workers AI yetkili token |
| `PAPI_CHAT_FREE_ONLY` | Free planın doğrulandığını belirtmek için `true` |
| `PAPI_CHAT_ENABLED` | Gerçek hesap testi tamamlandıktan sonra `true`; kapatmak için `false` |

`PAPI_CHAT_FREE_ONLY` bir işletmeci beyanıdır; Cloudflare faturalandırma ayarını otomatik doğrulamaz. Cloudflare hesabı Free kalmalıdır. Aynı hesabın başka AI kullanımları da ücretsiz kotayı tüketir. Kodda ücretli modele veya başka sağlayıcıya geçiş yoktur.

## İlk gerçek hesap kontrolü

20. seviye veya üzerindeki demo hesabında MeduPro → Papağanla Sohbet'i açın. Dört konuyu, düzeltmeyi, çeviriyi ve 5 mesaj sınırını sınayın. Cloudflare kullanım ekranında hem sohbet hem güvenlik modelinin tüketimini izleyin. Model erişimi/token yetkisi veya yanıt biçimi başarısız olursa etkinleştirmeyi kapatın; istemciye hiçbir API anahtarı gönderilmez.

- Sohbet modeli sabittir: `@cf/meta/llama-3.1-8b-instruct-fp8-fast`.
- Yanıt güvenlik modeli: `@cf/meta/llama-guard-3-8b`. Güvenlik kontrolü de kota tüketir. Gerçek öğrenci kapasitesi ölçülmeden garanti edilmez.
- Öğrenci kotası İstanbul gününe göre 5 başarılı/bekleyen mesaj; en fazla 10 deneme. Aynı öğrenci için eşzamanlı yeni çağrı reddedilir.
- Ortak sınır UTC gününe göre 100 farklı öğrenci ve 500 denemedir; Cloudflare kotası daha erken bitebilir. 429 sonrası ortak erişim UTC gün sonuna kadar durur.
- Yanıt alınamazsa kişisel hak iade edilir; deneme ortak bütçede sayılmaya devam eder. Aynı requestId ikinci kez model çağırmaz.
- İstemciden öğrenci kimliği, seviye veya konuşma geçmişi kabul edilmez. Kısa geçmiş, yalnız oturum sahibinin aynı gün aynı konudaki son iki başarılı mesajından gelir.
- Kayıtlar sosyal akışa gönderilmez. 48 saatten eski kayıtlar saatlik temizlenir; hesap silindiğinde yabancı anahtar üzerinden silinir.
- Otomatik güvenlik kontrolü kusursuzluk garantisi değildir. Gerçek hesap testi ve öğrenci yaş grubuna uygunluk incelemesi olmadan yaygın kullanıma açmayın.

Resmî belgeler:
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/data-usage/
- https://supabase.com/docs/guides/functions/secrets
