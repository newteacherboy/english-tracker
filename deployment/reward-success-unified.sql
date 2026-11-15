-- Unified reward gate integration. Deploy only after integration tests.
-- Requires deployment/reward-success-policy-v2.sql.
-- All patches fail closed when live function definitions differ.
begin;
create or replace function pg_temp.dm_replace_once(sig regprocedure, before_text text, after_text text)
returns void language plpgsql as $patch$
declare definition text; occurrences integer;
begin
 definition:=pg_get_functiondef(sig);
 occurrences:=(length(definition)-length(replace(definition,before_text,'')))/nullif(length(before_text),0);
 if occurrences is distinct from 1 then raise exception 'Unexpected function shape: %, matches %',sig,occurrences;end if;
 execute replace(definition,before_text,after_text);
end $patch$;

-- Two premium question-based games: score from server-held answers.
select pg_temp.dm_replace_once(sig,
$old$  s:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  passed:=correct*100>=total*70;
  if passed then
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,160);$old$,
$new$  -- reward-v2: first-attempt accuracy gates both progression and payout.
  s:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct*100>=total*60 then 1 else 0 end;
  passed:=correct*100>=total*60;
  if passed then
    select (award->>'xp')::integer,(award->>'gold')::integer into x,g
    from (select public.dm_success_reward_v2(correct,total,false,null,300,100) award) policy;$new$)
from (values ('public.dm_tower_finish(uuid,uuid,integer[])'::regprocedure),
             ('public.dm_goal_finish(uuid,uuid,integer[])'::regprocedure)) x(sig);

select pg_temp.dm_replace_once(sig,'else x:=10; g:=2;','else x:=0; g:=0;')
from (values ('public.dm_tower_finish(uuid,uuid,integer[])'::regprocedure),
             ('public.dm_goal_finish(uuid,uuid,integer[])'::regprocedure)) x(sig);

-- Cloud Flight / Block Papi: failed or crashed rounds never pay or unlock.
select pg_temp.dm_replace_once(sig,
$old$  s:=case when crashed then 0 when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  if s=0 then
    x:=10; g:=2;
  else$old$,
$new$  -- reward-v2: crash or <60% is a failed round.
  s:=case when crashed or correct*100<total*60 then 0
          when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 else 1 end;
  if s=0 then
    x:=0; g:=0;
  else$new$)
from (values ('public.dm_cloud_finish(uuid,uuid,integer[])'::regprocedure),
             ('public.dm_blocks_finish(uuid,uuid,integer[])'::regprocedure)) x(sig);

select pg_temp.dm_replace_once(
 'public.dm_cloud_finish(uuid,uuid,integer[])'::regprocedure,
 'if not crashed then' || chr(10) || '    update public.dm_cloud_progress',
 'if s>0 then' || chr(10) || '    update public.dm_cloud_progress');
select pg_temp.dm_replace_once(
 'public.dm_blocks_finish(uuid,uuid,integer[])'::regprocedure,
 'if not crashed then' || chr(10) || '    update public.dm_blocks_progress',
 'if s>0 then' || chr(10) || '    update public.dm_blocks_progress');

-- Replace the old level-dependent payout while preserving replay discounts.
select pg_temp.dm_replace_once(
 'public.dm_cloud_finish(uuid,uuid,integer[])'::regprocedure,
$old$    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,
      case when r.has_more then greatest(r.level_no+1,public.dm_premium_route_levels(0)) else r.level_no end);$old$,
$new$    select (award->>'xp')::integer,(award->>'gold')::integer into x,g
    from (select public.dm_success_reward_v2(correct,total,false,null,300,100) award) policy;$new$);
select pg_temp.dm_replace_once(
 'public.dm_blocks_finish(uuid,uuid,integer[])'::regprocedure,
$old$    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,
      case when r.has_more then greatest(r.level_no+1,public.dm_premium_route_levels(1)) else r.level_no end);$old$,
$new$    select (award->>'xp')::integer,(award->>'gold')::integer into x,g
    from (select public.dm_success_reward_v2(correct,total,false,null,300,100) award) policy;$new$);

-- Papizzle: first wrong picks remain errors even if the puzzle is eventually solved.
select pg_temp.dm_replace_once('public.dm_papizzle_finish(uuid,uuid,integer[])'::regprocedure,
$old$  update public.dm_papizzle_progress set level_no=level_no+1 where student_id=actor and level_no=r.level_no;
  if found then
    -- Papizzle can continue indefinitely; its reward scale uses 40 levels.
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,40);
  end if;$old$,
$new$  -- reward-v2: completion requires >=60% first-try accuracy.
  if correct*100 >= (correct+wrong)*60 then
    update public.dm_papizzle_progress set level_no=level_no+1 where student_id=actor and level_no=r.level_no;
    if found then
      select (award->>'xp')::integer,(award->>'gold')::integer into x,g
      from (select public.dm_success_reward_v2(correct,correct+wrong,false,null,300,100) award) policy;
    end if;
  end if;$new$);

-- Topic games: server-verified answer key; existing daily quota and teacher mode.
select pg_temp.dm_replace_once('public.dm_topic_game_finish(uuid,uuid,jsonb)'::regprocedure,
$old$elsif c*100>=n*80 then x:=(public.dm_reward_limits('konu:'||r.game)->>'xp')::int;reason:='awarded';end if;$old$,
$new$elsif c*100>=n*60 then
  x:=(public.dm_success_reward_v2(c,n,false,null,90,25)->>'xp')::integer;
  reason:='awarded';
end if;$new$);

-- Parkur: use the 12 recorded first answers, never the client-requested score.
-- The existing recovery flow stays available, but a failed first attempt cannot
-- be promoted to a reward-bearing clear merely by finishing recovery questions.
select pg_temp.dm_replace_once(
 'public.dm_parkur_fair_claim(uuid,text,integer,integer,numeric)'::regprocedure,
 'if correct_count<8 and not rec.completed then',
 'if correct_count<8 then');

-- Lesson and duel RPCs are intentionally not patched without a server-owned
-- per-question receipt. Client-submitted tiers cannot establish 60% accuracy.
-- Do not claim end-to-end coverage until those receipts are migrated.

-- Verified solo levels use the same tier schedule as the reward policy.
select pg_temp.dm_replace_once(
 'public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer)'::regprocedure,
 'percentage:=case right_count when 12 then 100 when 11 then 80 when 10 then 60 when 9 then 35 else case when right_count>0 then 20 else 0 end end;',
 'percentage:=case when right_count=12 then 100 when right_count=11 then 90 when right_count=10 then 80 when right_count=9 then 65 when right_count>=8 then 50 else 0 end;');

-- Solo: use verified first-try correct count for the success gate; no payout under 60%.
-- Existing reward claim and replay ledger remain authoritative.
select pg_temp.dm_replace_once(
 'public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer)'::regprocedure,
 'earned_x:=floor(base_x*percentage/100.0)::int;' || chr(10) || ' earned_g:=floor(base_g*percentage/100.0)::int;',
 'earned_x:=case when right_count*100 >= (right_count+wrong_count)*60 and right_count+wrong_count>0 then floor(base_x*percentage/100.0)::int else 0 end;' || chr(10) ||
 ' earned_g:=case when right_count*100 >= (right_count+wrong_count)*60 and right_count+wrong_count>0 then floor(base_g*percentage/100.0)::int else 0 end;');

commit;
