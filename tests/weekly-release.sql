begin;
do $$
declare sid uuid; b date:=date_trunc('week',now() at time zone 'Europe/Istanbul')::date-7; cur date:=b+7; i int; v jsonb; sid1 uuid; sid11 uuid; count1 int; num_gold numeric; actor uuid; ids uuid[]:=array[]::uuid[];
begin
 for i in 1..12 loop
  insert into public.students(username,password_hash,status,role,class_no,created_at,gold,energy) values('dm_fixture_week_'||i,'fixture-only-no-login','approved','student',2,b-1,0,10) returning id into sid;
  ids:=array_append(ids,sid);if i=1 then sid1:=sid;end if;if i=11 then sid11:=sid;end if;
  insert into public.extra_data(student_id,key_name,value) values(sid,'yo',jsonb_build_object('altin',0,'guncelleme',1,'lig',jsonb_build_object('hafta',to_char(cur,'IYYY')||'-H'||extract(week from cur)::int,'xp',150),'log',jsonb_build_object(cur::text,150)));
  if not exists(select 1 from public.dm_weekly_xp where student_id=sid and week_start=cur and xp=150 and active_days=1) then raise exception 'XP trigger failed';end if;
  insert into public.dm_weekly_xp(student_id,week_start,xp,active_days) values(sid,b,10000-i*100,5);
 end loop;
 insert into public.dm_league_weeks(week_start) values(b) on conflict do nothing;
 perform public.dm_settle_weeks();
 if not exists(select 1 from public.dm_weekly_results where student_id=sid1 and week_start=b and rank_no=1 and gold=100 and energy=15) then raise exception 'First prize failed';end if;
 if not exists(select 1 from public.dm_weekly_results where student_id=ids[10] and week_start=b and rank_no=10 and gold=5 and energy=1) then raise exception 'Tenth prize failed';end if;
 if not exists(select 1 from public.dm_weekly_results where student_id=sid11 and week_start=b and gold=0 and energy=0 and league='super') then raise exception 'Non champion prize exclusion failed';end if;
 select count(*) into count1 from public.dm_weekly_results where week_start=b;
 perform public.dm_settle_weeks();
 if count1<>(select count(*) from public.dm_weekly_results where week_start=b) then raise exception 'Settlement duplicated';end if;
 v:=public.dm_weekly_claim(sid1);if (v->>'gold')::int<>100 then raise exception 'Claim wrong';end if;
 if public.dm_weekly_claim(sid1) is not null then raise exception 'One-time panel failed';end if;
 select gold into num_gold from public.students where id=sid1;if num_gold<>100 then raise exception 'Gold credit failed';end if;
 if (select energy from public.students where id=sid1)<>25 then raise exception 'Energy credit failed';end if;
 -- Simulate a second device whose save began before the reward was credited.
 update public.extra_data set value=jsonb_build_object('altin',0,'guncelleme',1,'lig',jsonb_build_object('hafta',to_char(cur,'IYYY')||'-H'||extract(week from cur)::int,'xp',150)) where student_id=sid1 and key_name='yo';
 if (select (value->>'altin')::numeric from public.extra_data where student_id=sid1 and key_name='yo')<>100 then raise exception 'Stale device erased prize';end if;
 -- No teacher identity returns no student data.
 if jsonb_array_length(public.dm_parent_report(sid1,2))<>0 then raise exception 'Teacher scope failed';end if;
 if has_function_privilege('anon','public.dm_weekly_claim(uuid)','EXECUTE') or has_function_privilege('authenticated','public.dm_parent_report(uuid,integer)','EXECUTE') then raise exception 'Public RPC leak';end if;
 raise notice 'PASS: weekly snapshot, top-10 rewards, lower-league exclusion, repeated settlement, once-only claim, stale-device preservation, report role scope, service-only RPC';
end $$;
rollback;
