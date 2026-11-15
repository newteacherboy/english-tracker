-- Run against a disposable/test database AFTER loading reward-success-policy-v2.sql.
-- Read-only assertions; no student balances are touched.
begin;
do $qa$
declare r jsonb;
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
end $qa$;
rollback;
