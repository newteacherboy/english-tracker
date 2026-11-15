-- Staged integration for two Premium word games. NOT applied to production.
-- Prerequisite: deployment/reward-success-policy-v2.sql
-- Uses server-verified answers stored in the run deck; no client-provided success rate.
begin;
do $patch$
declare definition text; original text; replacement text; target regprocedure;
begin
  foreach target in array array[
    'public.dm_tower_finish(uuid,uuid,integer[])'::regprocedure,
    'public.dm_goal_finish(uuid,uuid,integer[])'::regprocedure
  ] loop
    definition := pg_get_functiondef(target);
    if position('reward-policy-v2-word-games' in definition)>0 then continue; end if;
    original := $old$
  s:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  passed:=correct*100>=total*70;
  if passed then
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,160);
$old$;
    replacement := $new$
  -- reward-policy-v2-word-games: server-side correctness is authoritative.
  s:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct*100>=total*60 then 1 else 0 end;
  passed:=correct*100>=total*60;
  if passed then
    select (award->>'xp')::integer,(award->>'gold')::integer into x,g
      from (select public.dm_success_reward_v2(correct,total,false,null,300,100) award) policy;
$new$;
    if strpos(definition,original)=0 then raise exception 'Unexpected function definition for %',target; end if;
    definition:=replace(definition,original,replacement);
    if strpos(definition,'else x:=10; g:=2;')=0 then raise exception 'Missing consolation branch in %',target; end if;
    definition:=replace(definition,'else x:=10; g:=2;','else x:=0; g:=0;');
    execute definition;
  end loop;
end $patch$;
commit;
