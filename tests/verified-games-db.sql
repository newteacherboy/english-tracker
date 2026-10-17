begin;
do $qa$
declare sid uuid:=gen_random_uuid();r jsonb;rid text:='verified-test-'||gen_random_uuid();i int;deck jsonb:='[]';failed boolean:=false;
begin
 if has_table_privilege('anon','public.dm_verified_runs','SELECT') or has_function_privilege('authenticated','public.dm_verified_answer(uuid,text,integer,text,boolean,boolean)','EXECUTE') then raise exception 'Verification API exposed';end if;
 insert into public.students(id,username,password_hash,status,role,energy,energy_max) values(sid,'verified-qa-'||sid,'not-a-login','approved','student',30,30);
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":5000,"altin":100,"guncelleme":1}');
 perform public.dm_verified_start(sid,rid,'hafiza',2,array[1],0,'[{"en":"bus","tr":"otobüs","kind":"tr"},{"en":"car","tr":"araba","kind":"tr"}]');
 perform public.dm_verified_answer(sid,rid,0,'event-wrong-123456',false,false);
 perform public.dm_verified_answer(sid,rid,0,'event-wrong-123456',false,false);
 perform public.dm_verified_answer(sid,rid,0,'event-right-123456',true,true);
 r:=public.dm_verified_result(sid,rid,'hafiza',2,array[1],0);
 if (r->>'correct')::int<>1 or (r->>'wrong')::int<>2 then raise exception 'Duplicate or fake counters: %',r;end if;
 begin perform public.dm_verified_result(sid,rid,'hafiza',3,array[1],0);exception when others then failed:=true;end;if not failed then raise exception 'Class scope bypass';end if;
 failed:=false;begin perform public.dm_verified_result(gen_random_uuid(),rid,'hafiza',2,array[1],0);exception when others then failed:=true;end;if not failed then raise exception 'Owner scope bypass';end if;
 rid:='verified-parkur-'||gen_random_uuid();
 for i in 0..11 loop deck:=deck||jsonb_build_array(jsonb_build_object('en','bus','tr','otobüs','kind','en'));end loop;
 perform public.dm_verified_start(sid,rid,'ba',2,array[1],220151,deck);
 perform public.dm_verified_answer(sid,rid,0,'parkur-event-zero1',true,true);
 failed:=false;begin perform public.dm_verified_result(sid,rid,'ba',2,array[1],220151);exception when others then failed:=true;end;if not failed then raise exception 'Incomplete parkur bypass';end if;
 for i in 1..11 loop perform public.dm_verified_answer(sid,rid,i,'parkur-event-long-'||i,i<>3,true);end loop;
 -- Simulate a legacy row claiming a wrong answer was correct; verified snapshot repairs it.
 update public.dm_parkur_question_ledger set correct=true where student_id=sid and run_id=rid;
 r:=public.dm_verified_result(sid,rid,'ba',2,array[1],220151);
 if (r->>'correct')::int<>11 or (select count(*) from public.dm_parkur_question_ledger where student_id=sid and run_id=rid and correct)<>11 then raise exception 'Legacy correctness bypass: %',r;end if;
 r:=public.dm_parkur_fair_claim(sid,rid,2,220151,120);
 if (r->>'fairPercent')::int<>80 then raise exception 'Verified fair claim failed: %',r;end if;
end $qa$;
rollback;
