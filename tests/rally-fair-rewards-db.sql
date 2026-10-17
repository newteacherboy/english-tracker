begin;
do $qa$
declare sid uuid; runid uuid; result jsonb; reward jsonb; st jsonb;
 i integer; c integer; w integer; expected_percent integer;
 xp_before numeric; xp_after numeric; receipt integer;
begin
 for i in 1..3 loop
 sid:=gen_random_uuid();runid:=gen_random_uuid();
 c:=case i when 1 then 2 when 2 then 12 else 15 end;
 w:=case i when 1 then 2 when 2 then 1 else 0 end;
 expected_percent:=case i when 1 then 35 when 2 then 80 else 100 end;
 insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at)
 values(sid,'rally-tier-test-'||sid,'not-a-login','approved',30,30,now());
 insert into public.extra_data(student_id,key_name,value)
 values(sid,'yo','{"totalXp":5000,"altin":100,"guncelleme":1,"xpGun":{"tarih":"2026-10-17","xp":0},"log":{}}');
 st:=jsonb_build_object('index',c+w,'score',c*100,'wrong',w,'correct',c,
   'hearts',greatest(0,2-w),'elapsed',greatest(80,10*(c+w)),'answers','[]'::jsonb,'combo',0,'bestCombo',0);
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck,state,status)
 values(runid,sid,2,array[1],'normal','[]'::jsonb,st,'playing');
 select (value->>'totalXp')::numeric into xp_before from public.extra_data where student_id=sid and key_name='yo';
 result:=public.dm_rally_finish(sid,runid);
 reward:=result->'reward';
 if (reward->>'fairPercent')::integer<>expected_percent then
  raise exception 'Rally expected %, got %',expected_percent,reward;end if;
 select xp into receipt from public.dm_game_reward_runs where student_id=sid and run_id=runid::text;
 select (value->>'totalXp')::numeric into xp_after from public.extra_data where student_id=sid and key_name='yo';
 if receipt<>(reward->>'xp')::integer or receipt<>(xp_after-xp_before)
  then raise exception 'Rally XP ledger mismatch %, %, %',receipt,xp_before,xp_after;end if;
 result:=public.dm_rally_finish(sid,runid);
 if (select count(*) from public.dm_game_reward_runs where student_id=sid)<>1
  or (result#>>'{reward,xp}')::integer<>receipt
 then raise exception 'Rally duplicate paid twice';end if;
 end loop;
end $qa$;
rollback;
