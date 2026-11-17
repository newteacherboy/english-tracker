CREATE OR REPLACE FUNCTION public.dm_competitive_xp(actor uuid, week date)
RETURNS numeric LANGUAGE sql STABLE SET search_path TO '' AS $function$
with bounds as (select week::timestamp at time zone 'Europe/Istanbul' a,(week+7)::timestamp at time zone 'Europe/Istanbul' b),
ev as (
 select (r.created_at at time zone 'Europe/Istanbul')::date d,r.xp p from public.dm_game_reward_runs r,bounds where r.student_id=actor and r.xp>0 and r.created_at>=bounds.a and r.created_at<bounds.b
 union all
 select (p.first_at at time zone 'Europe/Istanbul')::date,80 from (select min(completed_at) first_at from public.lesson_progress where student_id=actor and test_success group by level,category,topic_name) p,bounds where p.first_at>=bounds.a and p.first_at<bounds.b
)
select coalesce(sum(least(3500,day_points)),0) from (select d,sum(p) day_points from ev group by d) x;
$function$;
