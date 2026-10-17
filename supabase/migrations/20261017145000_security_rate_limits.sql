-- Atomic, service-role-only request abuse controls; no user balances touched.
begin;
create table if not exists public.dm_security_buckets (
 bucket_key text not null primary key check (length(bucket_key) between 16 and 180),
 hits integer not null default 0 check(hits>=0),
 window_start timestamptz not null default now(),
 expires_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.dm_security_buckets enable row level security;
revoke all on table public.dm_security_buckets from public,anon,authenticated;
grant select,insert,update,delete on table public.dm_security_buckets to service_role;

create or replace function public.dm_security_rate_check(
 bucket_key text, max_hits integer, window_seconds integer
) returns jsonb language plpgsql security invoker set search_path='' as $guard$
declare row public.dm_security_buckets;now_at timestamptz:=clock_timestamp();
begin
 if bucket_key is null or length(bucket_key) not between 16 and 180
 or max_hits not between 1 and 10000 or window_seconds not between 10 and 86400
 then raise exception 'Geçersiz güvenlik sınırı';end if;
 -- Concurrent requests for the same security bucket must count atomically.
 perform pg_advisory_xact_lock(hashtextextended(bucket_key,37));
 select * into row from public.dm_security_buckets where dm_security_buckets.bucket_key=dm_security_rate_check.bucket_key for update;
 if not found then
  insert into public.dm_security_buckets(bucket_key,hits,window_start,expires_at,updated_at)
  values(bucket_key,1,now_at,now_at+make_interval(secs=>window_seconds),now_at);
  return jsonb_build_object('allowed',true,'remaining',max_hits-1,'retryAfter',0);
 end if;
 if row.expires_at<=now_at then
  update public.dm_security_buckets set hits=1,window_start=now_at,
  expires_at=now_at+make_interval(secs=>window_seconds),updated_at=now_at
  where dm_security_buckets.bucket_key=dm_security_rate_check.bucket_key;
  return jsonb_build_object('allowed',true,'remaining',max_hits-1,'retryAfter',0);
 end if;
 if row.hits>=max_hits then
  return jsonb_build_object('allowed',false,'remaining',0,'retryAfter',greatest(1,ceil(extract(epoch from row.expires_at-now_at))::int));
 end if;
 update public.dm_security_buckets set hits=hits+1,updated_at=now_at
 where dm_security_buckets.bucket_key=dm_security_rate_check.bucket_key;
 return jsonb_build_object('allowed',true,'remaining',max_hits-row.hits-1,'retryAfter',0);
end $guard$;
revoke all on function public.dm_security_rate_check(text,integer,integer) from public,anon,authenticated;
grant execute on function public.dm_security_rate_check(text,integer,integer) to service_role;
-- Expired buckets can be pruned by scheduled maintenance without storing IP or usernames.
commit;
