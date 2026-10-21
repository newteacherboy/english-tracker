-- Gizlilik politikası 1.4: gönderilmiş ilerleme e-postalarının uygulamadaki kopyası
-- gönderimden 10 gün sonra silinir (mail_queue için uygulanan kuralla aynı).
-- Gönderilemeyen ve 30 günden eski kayıtlar da temizlenir.
-- NOT: Bu dosya henüz uygulanmadı. Politika yayımlanmadan önce veya aynı anda uygulanmalı.
select cron.schedule('dm-papi-outbox-retention','27 3 * * *', $job$
 delete from public.dm_papi_progress_outbox where sent_at is not null and sent_at < now() - interval '10 days';
 delete from public.dm_papi_progress_outbox where sent_at is null and created_at < now() - interval '30 days';
$job$);
