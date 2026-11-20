-- Rank against one XP calculation per eligible student, using the same
-- statement snapshot for the ledger, rank order and returned values.
set local lock_timeout = '2s';
set local statement_timeout = '15s';

create or replace function public.dm_progress_league(
  week date default (date_trunc('week', now() at time zone 'Europe/Istanbul'))::date
)
returns jsonb
language sql
stable
set search_path to ''
as $function$
  with eligible as materialized (
    select s.id, s.username, s.class_no,
      public.dm_student_level(coalesce((e.value->>'totalXp')::numeric, 0)) as level
    from public.students s
    left join public.extra_data e on e.student_id = s.id and e.key_name = 'yo'
    where s.status = 'approved' and s.role = 'student'
      and s.id <> 'dcde2026-1015-4000-8000-000000000001'::uuid
  ),
  base as materialized (
    select e.*, public.dm_competitive_xp(e.id, week) as xp
    from eligible e where e.level >= 5
  ),
  tier as (
    select *, case
      when level >= 15 and xp >= 1800 then 'sampiyon'
      when level >= 10 and xp >= 750 then 'super'
      else 'yerel'
    end as league
    from base
  ),
  ranks as (
    select *, row_number() over (partition by league order by xp desc, username, id) as rank
    from tier
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', username, 'class', class_no, 'level', level, 'xp', xp,
    'league', league, 'rank', rank, 'membership_tier', public.dm_plan(id, 'student')
  ) order by xp desc, username, id), '[]')
  from ranks;
$function$;
