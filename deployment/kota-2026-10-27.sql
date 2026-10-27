-- [Kota 27 Eki 2026] Canlıya uygulandı.
-- 1) Aktif süre: istemci 2 dakikada bir gönderir; tek istekte en fazla 150 sn
--    (kredi yine gerçek geçen süreyle sınırlı, hile koruması aynı).
--    dm_active_time_tick içinde: 'active_seconds not between 0 and 45' -> '... 0 and 150'
--    ve 'least(active_seconds,45,' -> 'least(active_seconds,150,'.
-- 2) E-posta işçisi cron'u yalnız gönderilecek e-posta varken çağrılır:
select cron.schedule('dm-papi-progress-dispatch','* * * * *', $cmd$
 select net.http_post(
  url := 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/papi-progress-worker',
  headers := jsonb_build_object('Content-Type','application/json',
   'x-papi-worker',(select secret from dm_private.dm_papi_worker_secret where key_name='mail_worker')),
  body := '{}'::jsonb, timeout_milliseconds := 30000)
 where exists (select 1 from public.dm_papi_progress_outbox q where q.sent_at is null and q.attempts<5 and q.send_after<=now());
$cmd$);
