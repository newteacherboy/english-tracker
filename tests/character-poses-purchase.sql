begin;
do $$
declare actor uuid; v jsonb; balance numeric; denied boolean; purchases int;
begin
 insert into public.students(username,password_hash,status,role,class_no,gold) values('dm_fixture_pose_'||gen_random_uuid(),'fixture-only-no-login','approved','student',2,10000) returning id into actor;
 insert into public.extra_data(student_id,key_name,value) values(actor,'yo','{"altin":10000,"totalXp":0,"karakter":{"cins":"e","s":{"durus":"dik"},"sahip":[]}}');
 denied:=false;begin perform public.dm_progress_purchase(actor,'a|durus|zafer',false);exception when others then if sqlerrm like '%seviyede açılır%' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'Level 1 bought a locked pose';end if;
 update public.extra_data set value=jsonb_set(value,'{totalXp}','10000000') where student_id=actor and key_name='yo';
 if (public.dm_progress_context(actor)->>'level')::int<>40 then raise exception 'Fixture level was not initialized';end if;
 v:=public.dm_progress_purchase(actor,'a|durus|zafer',false);
 if (v->>'price')::int<>75 or not (v#>'{yo,karakter,sahip}') @> '["durus:zafer"]' or v#>>'{yo,karakter,s,durus}'<>'zafer' then raise exception 'Purchase or existing first discount failed';end if;
 select gold into balance from public.students where id=actor;
 if balance<>9925 then raise exception 'Wrong gold deduction: %',balance;end if;
 denied:=false;begin perform public.dm_progress_purchase(actor,'a|durus|zafer',false);exception when others then if sqlerrm like '%zaten sahipsin%' then denied:=true;else raise;end if;end;
 if not denied or (select gold from public.students where id=actor)<>balance then raise exception 'Duplicate purchase charged twice';end if;
 v:=public.dm_progress_purchase(actor,'a|durus|kutlama',false);
 if (v->>'price')::int<>1850 or v#>>'{yo,karakter,s,durus}'<>'kutlama' then raise exception 'Level 40 pose failed';end if;
 select count(*) into purchases from public.dm_progress_rewards where student_id=actor and kind='purchase';
 if purchases<>2 then raise exception 'Purchase ledger duplicated';end if;
 if has_table_privilege('anon','public.dm_progress_items','INSERT') or has_function_privilege('authenticated','public.dm_progress_purchase(uuid,text,boolean)','EXECUTE') then raise exception 'Purchase access leak';end if;
end $$;
rollback;
select 'PASS: level lock, ownership, first discount, exact gold, duplicate protection, level 40, service-only purchase; fixtures rolled back' as result;
