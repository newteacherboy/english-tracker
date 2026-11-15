-- REVIEW-ONLY PATCH: tower game, guarded against unexpected function drift.
-- Requires deployment/reward-success-policy-v2.sql to be installed first.
-- Apply only in a disposable database until API result semantics are checked.
begin;
do $patch$
declare definition text; original text; replacement text;
begin
  select pg_get_functiondef('public.dm_tower_finish(uuid,uuid,integer[])'::regprocedure)
    into definition;
  if position('reward-policy-v2-tower' in definition)>0 then return; end if;

  original := $old$
  s:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  passed:=correct*100>=total*70;
  if passed then
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,160);
    update public.dm_tower_progress set level_no=least(160,level_no+1),completed=not r.has_more
      where student_id=actor and level_no=r.level_no and not completed;
    if not found then x:=0; g:=0; end if;
  else x:=10; g:=2;
  end if;
$old$;

  replacement := $new$
  -- reward-policy-v2-tower: award only after verified first-attempt accuracy >=60%.
  -- Keep the existing star thresholds for presentation, but do not use stars for pass.
  s:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct*100>=total*60 then 1 else 0 end;
  passed:=correct*100>=total*60;
  if passed then
    select (award->>'xp')::integer, (award->>'gold')::integer into x,g
    from (select public.dm_success_reward_v2(correct,total,false,null,300,100) as award) policy;
    update public.dm_tower_progress set level_no=least(160,level_no+1),completed=not r.has_more
      where student_id=actor and level_no=r.level_no and not completed;
    if not found then x:=0; g:=0; end if;
  else x:=0; g:=0;
  end if;
$new$;

  if strpos(definition, original)=0 then
    raise exception 'Tower function drifted; inspect current definition before patching';
  end if;
  if strpos(substr(definition,strpos(definition,original)+length(original)),original)>0 then
    raise exception 'Ambiguous tower function patch';
  end if;
  execute replace(definition,original,replacement);
end $patch$;
rollback; -- INTENTIONALLY NO-OP: remove only in a verified test/deploy process.
