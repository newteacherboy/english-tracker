create table if not exists public.dm_papi_farms(
 student_id uuid primary key references public.students(id) on delete cascade,
 state jsonb not null check(jsonb_typeof(state)='object' and pg_column_size(state)<65536),
 revision integer not null check(revision>0),
 last_action uuid not null,
 updated_at timestamptz not null default now()
);
alter table public.dm_papi_farms enable row level security;
revoke all on public.dm_papi_farms from public, anon, authenticated;
grant select,insert,update,delete on public.dm_papi_farms to service_role;
create or replace function public.dm_papi_farm_write(p_actor uuid,p_revision integer,p_action uuid,p_state jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_revision=0 then
  insert into public.dm_papi_farms(student_id,state,revision,last_action) values(p_actor,p_state,1,p_action) on conflict do nothing;
 else
  update public.dm_papi_farms set state=p_state,revision=revision+1,last_action=p_action,updated_at=now()
  where student_id=p_actor and revision=p_revision and last_action<>p_action;
 end if;
 get diagnostics n=row_count;
 return n=1;
end; $$;
revoke all on function public.dm_papi_farm_write(uuid,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dm_papi_farm_write(uuid,integer,uuid,jsonb) to service_role;
