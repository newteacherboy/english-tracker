begin;
create table if not exists public.dm_route_graduations (
 id uuid not null default gen_random_uuid() unique,
 student_id uuid not null references public.students(id) on delete cascade,
 route text not null check(route in ('school','learning')),
 level text not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 issued_at timestamptz not null default now(),
 notified_at timestamptz,
 primary key(student_id,route,level),
 check((route='school' and level in ('1','2','3','4','5','6','7','8')) or (route='learning' and level in ('A1','A2','B1','B2')))
);
alter table public.dm_route_graduations enable row level security;
revoke all on public.dm_route_graduations from public,anon,authenticated;
grant select,insert,update on public.dm_route_graduations to service_role;
comment on table public.dm_route_graduations is 'Server-verified class/CEFR completion snapshots; no client grants or reward minting.';
commit;
