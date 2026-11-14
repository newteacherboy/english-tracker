begin;
do $patch$
declare definition text; original text:='percentage:=public.dm_solo_fair_percent(game_code,right_count,wrong_count);'; replacement text:=$source$
-- student-level-tiers-v1: server-verified first-attempt outcomes
if exists(select 1 from public.dm_verified_runs where student_id=actor and run_id=run_key and (deck->0) ? 'soloLevel') then
 percentage:=case right_count when 12 then 100 when 11 then 80 when 10 then 60 when 9 then 35 else case when right_count>0 then 20 else 0 end end;
else
 percentage:=public.dm_solo_fair_percent(game_code,right_count,wrong_count);
end if;
$source$;
begin
 select pg_get_functiondef('public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer)'::regprocedure) into definition;
 if position('student-level-tiers-v1' in definition)=0 then
  if position(original in definition)=0 then raise exception 'Reward function changed: review before deploying';end if;
  execute replace(definition,original,replacement);
 end if;
end $patch$;
commit;
