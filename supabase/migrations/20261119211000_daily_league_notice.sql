-- Read-only daily league notice; never modifies XP or rewards.
create or replace function public.dm_daily_league_notice(p_t text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.students; d date:=(now() at time zone 'Europe/Istanbul')::date; a timestamptz; z timestamptz; xp numeric;
begin
 s:=dm_private.rpc_ogrenci(p_t,'');
 if s.id is null then return null; end if;
 a:=d::timestamp at time zone 'Europe/Istanbul'; z:=(d+1)::timestamp at time zone 'Europe/Istanbul';
 select coalesce(sum(p),0) into xp from (
 select r.xp p from public.dm_game_reward_runs r where r.student_id=s.id and r.xp>0 and r.created_at>=a and r.created_at<z
 union all
 select 80 from (select min(completed_at) first_at from public.lesson_progress where student_id=s.id and test_success group by level,category,topic_name) q where q.first_at>=a and q.first_at<z
 ) ev;
 -- During the transitional week both calculations must be capped to avoid a premature notice.
 if d<date '2026-11-23' then xp:=least(xp,dm_private.competitive_xp_legacy(s.id,d)-dm_private.competitive_xp_legacy(s.id,d+1)); end if;
 return jsonb_build_object('day',d,'reached',xp>=3500,'account',s.id);
end $$;
revoke all on function public.dm_daily_league_notice(text) from public;
grant execute on function public.dm_daily_league_notice(text) to anon,authenticated;
