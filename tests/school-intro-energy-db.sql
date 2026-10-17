-- Synthetic account only; no account or energy changes survive this test.
begin;
do $qa$
declare sid uuid:=gen_random_uuid();rid text:='intro-test-'||gen_random_uuid();r jsonb;failed boolean:=false;
begin
 insert into public.students(id,username,password_hash,status,role,energy,energy_max,energy_updated_at)
 values(sid,'intro-qa-'||sid,'not-a-login','approved','student',0,30,now());
 r:=public.dm_parkur_question_step(sid,rid,1,null);
 if (r->>'energy')::int<>0 or (r->>'charged')::int<>0 then raise exception 'Teaching charged energy: %',r;end if;
 perform public.dm_parkur_question_step(sid,rid,1,true);
 r:=public.dm_parkur_question_step(sid,rid,2,null);
 if (r->>'energy')::int<>0 or (r->>'charged')::int<>0 then raise exception 'First question charged energy: %',r;end if;
 perform public.dm_parkur_question_step(sid,rid,2,false);
 begin perform public.dm_parkur_question_step(sid,rid,3,null);exception when others then failed:=true;end;
 if not failed then raise exception 'Later question allowed without energy';end if;
 update public.students set energy=5 where id=sid;
 r:=public.dm_parkur_question_step(sid,rid,3,null);
 if (r->>'energy')::int<>4 or (r->>'charged')::int<>1 then raise exception 'Later question charge failed: %',r;end if;
 r:=public.dm_parkur_question_step(sid,rid,3,null);
 if (r->>'energy')::int<>4 or not (r->>'duplicate')::boolean then raise exception 'Retry double charged: %',r;end if;
 perform public.dm_parkur_question_step(sid,rid,3,true);
 -- The answer fallback also exempts the first question when no charge preceded it.
 rid:='fallback-test-'||gen_random_uuid();
 perform public.dm_parkur_question_step(sid,rid,1,true);
 r:=public.dm_parkur_question_step(sid,rid,2,true);
 if (r->>'energy')::int<>4 then raise exception 'Fallback charged introductory steps: %',r;end if;
 if (select count(*) from public.energy_transactions where student_id=sid and change_amount<0)<>1 then raise exception 'Incorrect debit ledger';end if;
end $qa$;
rollback;
