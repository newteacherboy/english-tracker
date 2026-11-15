-- Papizzle: staged server-verified 60% pass policy, first clear only.
-- Requires deployment/reward-success-policy-v2.sql.
-- This file is NOT applied to production; test with representative runs first.
begin;
do $patch$
declare definition text; old_text text; new_text text;
begin
 definition:=pg_get_functiondef('public.dm_papizzle_finish(uuid,uuid,integer[])'::regprocedure);
 if strpos(definition,'reward-policy-v2-papizzle')>0 then return; end if;
 old_text:=$old$
  update public.dm_papizzle_progress set level_no=level_no+1 where student_id=actor and level_no=r.level_no;
  if found then
    -- Papizzle can continue indefinitely; its reward scale uses 40 levels.
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,40);
  end if;
$old$;
 new_text:=$new$
  -- reward-policy-v2-papizzle: every wrong first selection remains a mistake.
  -- Successful matching alone is not proof of >=60% accuracy.
  if correct*100 >= (correct+wrong)*60 then
    update public.dm_papizzle_progress set level_no=level_no+1
      where student_id=actor and level_no=r.level_no;
    if found then
      select (award->>'xp')::integer,(award->>'gold')::integer into x,g
      from (select public.dm_success_reward_v2(correct,correct+wrong,false,null,300,100) award) policy;
    end if;
  end if;
$new$;
 if strpos(definition,old_text)=0 then raise exception 'Papizzle definition drifted';end if;
 execute replace(definition,old_text,new_text);
end $patch$;
commit;
