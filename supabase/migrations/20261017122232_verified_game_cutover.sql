create table public.dm_security_settings(key text primary key,value boolean not null);
alter table public.dm_security_settings enable row level security;
revoke all on public.dm_security_settings from public,anon,authenticated;
grant select,insert,update on public.dm_security_settings to service_role;
-- Stage backend support before Pages changes. Flip only after the client is live.
insert into public.dm_security_settings values('verified_games_required',false);
create function public.dm_verified_required() returns boolean language sql set search_path='' as $$
 select coalesce((select value from public.dm_security_settings where key='verified_games_required'),true);
$$;
revoke all on function public.dm_verified_required() from public,anon,authenticated;
grant execute on function public.dm_verified_required() to service_role;
