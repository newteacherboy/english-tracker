create index if not exists dm_verified_runs_expiry on public.dm_verified_runs(expires_at);
select cron.schedule('dm_verified_runs_cleanup','23 3 * * *', $cron$delete from public.dm_verified_runs where expires_at<now()-interval '2 days'$cron$);
