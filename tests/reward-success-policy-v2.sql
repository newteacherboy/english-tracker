-- Run against a disposable/test database AFTER loading reward-success-policy-v2.sql.
-- Read-only assertions; no student balances are touched.
begin;
do $qa$
declare r jsonb; category record; boundary record; bad record;
begin
  r := public.dm_success_reward_v2(7,12,false,null,300,100);
  if (r->>'passed')::boolean or (r->>'xp')::int <> 0 then raise exception '7/12 must fail'; end if;
  r := public.dm_success_reward_v2(8,12,false,null,300,100);
  if not (r->>'passed')::boolean or (r->>'xp')::int <> 150 or (r->>'gold')::int <> 50 then raise exception '8/12 must pass at 50%%'; end if;
  r := public.dm_success_reward_v2(9,10,false,null,300,100);
  if (r->>'xp')::int <> 270 then raise exception '90%% tier failed'; end if;
  r := public.dm_success_reward_v2(10,10,false,null,300,100);
  if (r->>'xp')::int <> 300 or (r->>'gold')::int <> 100 then raise exception '100%% tier failed'; end if;
  r := public.dm_success_reward_v2(5,10,true,100,300,100);
  if (r->>'passed')::boolean then raise exception 'Speed bypassed accuracy gate'; end if;
  r := public.dm_success_reward_v2(9,10,true,80,300,100);
  if (r->>'performance')::numeric <> 88 or (r->>'xp')::int <> 240 then raise exception '80/20 weighting failed'; end if;
  r := public.dm_success_reward_v2(6,10,true,0,300,100);
  if (r->>'passed')::boolean then raise exception 'Combined score under 60 must fail'; end if;
  if has_function_privilege('anon','public.dm_success_reward_v2(integer,integer,boolean,numeric,integer,integer)','EXECUTE') then
    raise exception 'Reward policy RPC exposed to anon';
  end if;
  if has_function_privilege('authenticated','public.dm_success_reward_v2(integer,integer,boolean,numeric,integer,integer)','EXECUTE') then
    raise exception 'Reward policy RPC exposed to authenticated';
  end if;
  for category in select * from (values
    ('premium',300,100),('duel',250,85),('parkur',200,70),('lesson',180,60),
    ('solo',140,45),('duo',120,40),('topic',90,25),('break',60,20)
  ) t(name,xp,gold) loop
    for boundary in select * from (values
      (0,0::numeric),(59,0),(60,.5),(69,.5),(70,.65),(79,.65),
      (80,.8),(89,.8),(90,.9),(99,.9),(100,1)
    ) t(accuracy,multiplier) loop
      r:=public.dm_success_reward_v2(boundary.accuracy,100,false,null,category.xp,category.gold);
      if (r->>'passed')::boolean is distinct from (boundary.accuracy>=60)
        or (r->>'xp')::integer<>round(category.xp*boundary.multiplier)
        or (r->>'gold')::integer<>round(category.gold*boundary.multiplier)
        then raise exception 'Boundary failure: % at %',category.name,boundary.accuracy; end if;
    end loop;
    r:=public.dm_success_reward_v2(7,12,false,null,category.xp,category.gold);
    if (r->>'passed')::boolean or (r->>'gold')::int<>0 then raise exception '7/12 bypass: %',category.name; end if;
    r:=public.dm_success_reward_v2(8,12,false,null,category.xp,category.gold);
    if not (r->>'passed')::boolean or (r->>'xp')::int<>round(category.xp*.5)
      or (r->>'gold')::int<>round(category.gold*.5) then raise exception '8/12 failure: %',category.name; end if;
    -- Never round 59.999% into a pass, even with a perfect time score.
    r:=public.dm_success_reward_v2(59999,100000,true,100,category.xp,category.gold);
    if (r->>'passed')::boolean or (r->>'xp')::int<>0 then raise exception 'Rounded gate: %',category.name; end if;
    r:=public.dm_success_reward_v2(90,100,true,80,category.xp,category.gold);
    if (r->>'performance')::numeric<>88 or (r->>'xp')::int<>round(category.xp*.8)
      then raise exception 'Timed weighting failure: %',category.name; end if;
  end loop;
  for bad in select * from (values
    (null::integer,10,false,null::numeric,300,100),(1,null,false,null,300,100),
    (0,0,false,null,300,100),(-1,12,false,null,300,100),(13,12,false,null,300,100),
    (1,12,null,null,300,100),(1,12,false,null,-1,100),(1,12,false,null,300,-1),
    (1,12,false,null,null,100),(1,12,false,null,300,null),
    (12,12,true,null,300,100),(12,12,true,-1,300,100),(12,12,true,101,300,100),
    (12,12,true,'NaN'::numeric,300,100),(12,12,true,'Infinity'::numeric,300,100)
  ) t(correct,total,timed,time_score,xp,gold) loop
    begin
      perform public.dm_success_reward_v2(bad.correct,bad.total,bad.timed,bad.time_score,bad.xp,bad.gold);
      raise exception 'Invalid input accepted: %',row_to_json(bad);
    exception when sqlstate '22023' then null;
    end;
  end loop;
end $qa$;
rollback;
