begin;
-- A database guard covers every reward, shop, gift and legacy RPC writer.
create or replace function public.dm_energy_fixed_capacity() returns trigger
language plpgsql set search_path='' as $$
begin
 new.energy_max:=25;
 new.energy:=greatest(0,least(25,coalesce(new.energy,25)));
 return new;
end $$;
revoke all on function public.dm_energy_fixed_capacity() from public,anon,authenticated;
create trigger dm_energy_fixed_capacity before insert or update of energy,energy_max on public.students
for each row execute function public.dm_energy_fixed_capacity();
alter table public.students alter column energy_max set default 25;
alter table public.students alter column energy set default 25;
update public.students set energy_max=25,energy=least(25,greatest(0,energy));
alter table public.students add constraint dm_energy_capacity_25 check(energy_max=25 and energy between 0 and 25);
-- The owner has no personal pupil account. A null-linked grant is reserved for teacher.
alter table public.teacher_portal_access alter column student_id drop not null;
create or replace function public.dm_teacher_owner_grant_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.student_id is null and not exists(select 1 from public.teachers where id=new.teacher_id and username='teacher' and is_admin and active and frozen_at is null) then
  raise exception 'Only the active teacher owner may use an owner grant';
 end if;
 return new;
end $$;
revoke all on function public.dm_teacher_owner_grant_guard() from public,anon,authenticated;
create trigger dm_teacher_owner_grant_guard before insert or update on public.teacher_portal_access
for each row execute function public.dm_teacher_owner_grant_guard();
-- Keep returned amounts and ledger balances consistent with the fixed cap.
do $$ declare fn text; begin
 select pg_get_functiondef('public.dm_progress_lesson_energy(uuid,text,text,text)'::regprocedure) into fn;
 execute replace(fn,'coalesce(st.energy_max,30)+10-st.energy','25-st.energy');
 select pg_get_functiondef('public.dm_daily_energy_bonus(uuid)'::regprocedure) into fn;
 execute replace(replace(fn,'cap+10-balance','cap-balance'),'coalesce(nullif(s.energy_max,0),30)','25');
end $$;
commit;
