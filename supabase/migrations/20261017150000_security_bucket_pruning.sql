-- Bound security-bucket storage without retaining user identifiers indefinitely.
do $cron$
begin
 if not exists(select 1 from cron.job where jobname='diji-security-rate-prune') then
  perform cron.schedule('diji-security-rate-prune','45 3 * * *',
    $cmd$delete from public.dm_security_buckets where expires_at < now()-interval '1 day'$cmd$);
 end if;
end $cron$;
