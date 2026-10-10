# Papi ilerleme e-postası kurulumu

Durum: 10 Ekim 2026 itibarıyla üretim veritabanında 3 günlük, izin odaklı ayrı rapor kuyruğu ve gönderici servisi kurulmuştur.

ÖNEMLİ: Mevcut öğrenci ve veli adresleri otomatik abone yapılmamıştır. Doğrulanmış açık izin olmadan hiçbir alıcıya e-posta gönderilmez. Bu aşamada izinli alıcı sayısı 0'dır.

Veritabanı: dm_progress_mail_preferences, dm_papi_unsubscribe_tokens, dm_papi_progress_outbox, dm_papi_progress_queue, dm_papi_take_due, dm_papi_mail_result, dm_papi_progress_unsubscribe, dm_mail_slot (tüm e-postalar için 200 günlük sınır).
Edge Functions: papi-progress-worker, papi-progress-unsubscribe.
Zamanlayıcı: dm-papi-progress-prepare (günlük 05:05 UTC); dm-papi-progress-dispatch (30 dakikada bir).
Özet içerik: 7 günlük oyun, ders, parkur, süre ve seri göstergeleri, Papi mesajı ve uygulamaya devam bağlantısı.

Yapılan kontroller: sıfır izin durumunda hazırlanan e-posta sıfırdır; iki cron kaydı bulundu; 200 günlük kota fonksiyonu doğrulandı; geçersiz çıkış tokeni reddedildi.

TAMAMLANMASI GEREKEN: öğrencinin ve yetkili velinin ayrı açık iznini alan uygulama içi tercihler ekranı; her adrese gönderilecek doğrulama e-postası; veli-öğrenci ilişkisinin doğrulanması; izin değişikliğinin backend'e güvenli bağlanması; kontrollü test adresleriyle uçtan uca gerçek e-posta teslim/çıkış testleri. İzin kaydı yokken kullanıcıları topluca abone etmek yasaktır.

Canlı SQL ve Edge kodu üretim Supabase'inde bulunur. Bu dosya bir durum kaydıdır; migration ve Edge kaynaklarının GitHub'a tam eşitlenmesi henüz yapılmadı.