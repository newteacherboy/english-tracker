-- Diji-Medu reward policy v2: REVIEW/STAGING ONLY.
-- Do not apply to production until all award/progression call sites are migrated.
-- This is a standalone deployment candidate, not a recorded Supabase migration.
create or replace function public.dm_success_reward_v2(
  p_correct integer,
  p_total integer,
  p_timed boolean,
  p_time_score numeric,
  p_max_xp integer,
  p_max_gold integer
)
returns jsonb language plpgsql immutable set search_path = '' as $policy$
declare
  accuracy numeric;
  performance numeric;
  multiplier numeric;
  passed boolean;
begin
  if p_total is null or p_total <= 0 or p_correct is null
     or p_correct < 0 or p_correct > p_total
     or p_max_xp is null or p_max_xp < 0
     or p_max_gold is null or p_max_gold < 0
     or p_timed is null
     or (p_timed and (p_time_score is null or p_time_score < 0 or p_time_score > 100))
  then
    raise exception 'Invalid reward policy input' using errcode = '22023';
  end if;

  accuracy := 100::numeric * p_correct / p_total;
  performance := case when p_timed then accuracy * 0.8 + p_time_score * 0.2 else accuracy end;
  -- Accuracy is a mandatory gate: speed cannot rescue incorrect answers.
  passed := accuracy >= 60 and performance >= 60;
  multiplier := case
    when not passed then 0
    when performance >= 100 then 1
    when performance >= 90 then 0.9
    when performance >= 80 then 0.8
    when performance >= 70 then 0.65
    else 0.5
  end;

  return jsonb_build_object(
    'passed', passed,
    'accuracy', round(accuracy, 2),
    'performance', round(performance, 2),
    'multiplier', multiplier,
    'xp', round(p_max_xp * multiplier)::integer,
    'gold', round(p_max_gold * multiplier)::integer
  );
end;
$policy$;

-- Internal-only helper. Do not let clients submit fabricated scores for payment.
revoke all on function public.dm_success_reward_v2(integer,integer,boolean,numeric,integer,integer)
  from public, anon, authenticated;
grant execute on function public.dm_success_reward_v2(integer,integer,boolean,numeric,integer,integer)
  to service_role;
