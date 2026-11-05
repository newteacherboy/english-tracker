-- Record verified level changes on the shared XP wallet. The status request
-- collects the refill with the student row locked, outside the XP transaction.
create function public.dm_mark_level_energy() returns trigger
language plpgsql set search_path = '' as $$
declare
  previous_level integer;
  next_level integer;
  previous_award jsonb;
begin
  new.value := new.value - 'dmLevelEnergy';
  if tg_op = 'INSERT' then return new; end if;

  previous_award := old.value->'dmLevelEnergy';
  if new.value->'totalXp' is distinct from old.value->'totalXp' then
    previous_level := public.dm_student_level(coalesce((old.value->>'totalXp')::numeric, 0));
    next_level := public.dm_student_level(coalesce((new.value->>'totalXp')::numeric, 0));
    if next_level > greatest(previous_level, coalesce((previous_award->>'level')::integer, 0)) then
      previous_award := jsonb_build_object('level', next_level);
    end if;
  end if;
  if previous_award is not null then
    new.value := new.value || jsonb_build_object('dmLevelEnergy', previous_award);
  end if;
  return new;
end $$;

create trigger dm_02_mark_level_energy
before insert or update of value on public.extra_data
for each row when (new.key_name = 'yo') execute function public.dm_mark_level_energy();

create function public.dm_collect_level_energy(actor uuid, earned_level integer) returns jsonb
language plpgsql set search_path = '' as $$
declare
  student public.students;
  previous_energy integer;
  verified_level integer;
begin
  if earned_level is null or earned_level not between 2 and 40 then return null; end if;
  if exists (
    select 1 from public.dm_progress_rewards
    where student_id = actor and kind = 'level_energy' and reward_key = earned_level::text
  ) then return null; end if;

  select * into student from public.students
  where id = actor and status = 'approved' and role = 'student' for update;
  if not found then return null; end if;

  select (value#>>'{dmLevelEnergy,level}')::integer into verified_level
  from public.extra_data where student_id = actor and key_name = 'yo';
  if verified_level is distinct from earned_level then return null; end if;

  insert into public.dm_progress_rewards (student_id, kind, reward_key)
  values (actor, 'level_energy', earned_level::text) on conflict do nothing;
  if not found then return null; end if;

  previous_energy := student.energy;
  if previous_energy < student.energy_max then
    update public.students set energy = energy_max, energy_updated_at = now()
    where id = actor returning * into student;
    insert into public.energy_transactions (student_id, change_amount, balance_after, reason)
    values (actor, student.energy - previous_energy, student.energy, 'level_up');
  end if;
  return jsonb_build_object(
    'level', earned_level, 'before', previous_energy, 'energy', student.energy, 'max', student.energy_max
  );
end $$;

revoke all on function public.dm_mark_level_energy(), public.dm_collect_level_energy(uuid, integer)
from public, anon, authenticated;
grant execute on function public.dm_mark_level_energy(), public.dm_collect_level_energy(uuid, integer)
to service_role;
