-- Every fixture account/credit is rolled back; existing awards and student state stay unchanged.
begin;
do $qa$
declare sid uuid; rid text; result jsonb; prior_xp numeric; final_xp numeric;
 before_runs int; tier int; cases int[][3]:=array[[1,0,0],[2,2,6],[3,5,2],[4,8,1],[5,10,0]];
 game_code text; correct_count int; wrong_count int; idx int; ledger_xp int; ledger_gold int;
begin
 select count(*) into before_runs from public.dm_game_reward_runs;
 if public.dm_solo_fair_percent('ky',0,0)<>0
 or public.dm_solo_fair_percent('ky',2,6)<>35
 or public.dm_solo_fair_percent('ky',5,2)<>60
 or public.dm_solo_fair_percent('ky',8,1)<>80
 or public.dm_solo_fair_percent('ky',10,0)<>100
 or public.dm_solo_fair_percent('hafiza',6,4)<>60
 or public.dm_solo_fair_percent('asmaca',6,2)<>80
 then raise exception 'Genre-adaptive policy thresholds wrong';end if;
 for idx in 1..5 loop
  sid:=gen_random_uuid();rid:='solo-fair-test-'||replace(sid::text,'-','');
  correct_count:=cases[idx][2];wrong_count:=cases[idx][3];
  game_code:=case idx when 1 then 'ky' when 2 then 'bosluk' when 3 then 'hafiza' when 4 then 'asmaca' else 'cumle' end;
  insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at)
  values(sid,'fair-solo-test-'||sid,'not-a-login','approved',30,30,now());
  insert into public.extra_data(student_id,key_name,value)
  values(sid,'yo','{"totalXp":5000,"altin":100,"guncelleme":1,"xpGun":{"tarih":"2026-10-17","xp":0},"log":{}}');
  select (value->>'totalXp')::numeric into prior_xp from public.extra_data where student_id=sid and key_name='yo';
  result:=public.dm_solo_fair_claim(sid,rid,game_code,2,array[1],correct_count,wrong_count,90,1);
  if not (result->>'ok')::boolean then raise exception 'Claim not accepted: %',result;end if;
  select xp,gold into ledger_xp,ledger_gold from public.dm_game_reward_runs where student_id=sid and run_id=rid;
  if ledger_xp<>(result->>'xp')::int or ledger_gold<>(result->>'gold')::int
   or (result->>'fairPercent')::int<>public.dm_solo_fair_percent(game_code,correct_count,wrong_count)
  then raise exception 'Fair reward does not reconcile: %',result;end if;
  select (value->>'totalXp')::numeric into final_xp from public.extra_data where student_id=sid and key_name='yo';
  if final_xp-prior_xp<>ledger_xp then raise exception 'Wallet XP mismatch in case %',idx;end if;
  result:=public.dm_solo_fair_claim(sid,rid,game_code,2,array[1],12,0,1,4);
  if not coalesce((result->>'duplicate')::boolean,false)
   or (result->>'xp')::int<>ledger_xp
   or (select count(*) from public.dm_game_reward_runs where student_id=sid)<>1
  then raise exception 'Fake retry increased reward: %',result;end if;
 end loop;
 if (select count(*) from public.dm_game_reward_runs)<>before_runs+5
 then raise exception 'Unexpected reward ledger side effects';end if;
 if has_function_privilege('anon','public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer)','EXECUTE')
   or has_function_privilege('authenticated','public.dm_solo_fair_percent(text,integer,integer)','EXECUTE')
 then raise exception 'Unauthorized fairness RPC access';end if;
end $qa$;
rollback;
