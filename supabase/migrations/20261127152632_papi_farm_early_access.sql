create table if not exists public.dm_papi_farm_early_access(student_id uuid primary key references public.students(id) on delete cascade, expires_at timestamptz not null);
alter table public.dm_papi_farm_early_access enable row level security;
revoke all on public.dm_papi_farm_early_access from public, anon, authenticated;
grant select on public.dm_papi_farm_early_access to service_role;
