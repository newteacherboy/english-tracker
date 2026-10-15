-- All test data is rolled back; no real student's allowance or history changes.
begin;
set local role service_role;
do $$
declare sid uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); r jsonb; rid uuid; i int;
begin
 insert into public.students(id,username,password_hash,status,role) values(sid,'qa_chat_'||replace(sid::text,'-',''),'disabled-test-only','approved','student'),(other_id,'qa_chat_peer_'||replace(other_id::text,'-',''),'disabled-test-only','approved','student');
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":1000000}'),(other_id,'yo','{"totalXp":1000000}');
 r:=public.dm_papi_chat(sid,'status');if r->>'remaining'<>'5' then raise exception 'initial quota %',r;end if;
 for i in 1..5 loop
  rid:=gen_random_uuid();r:=public.dm_papi_chat(sid,'reserve',jsonb_build_object('requestId',rid,'hash','h','topic','school','text','I like art.'));
  if r->>'state'<>'reserved' then raise exception 'reserve %',r;end if;
  r:=public.dm_papi_chat(sid,'reserve',jsonb_build_object('requestId',rid,'hash','h','topic','school','text','I like art.'));if r->>'state'<>'pending' then raise exception 'duplicate pending %',r;end if;
  r:=public.dm_papi_chat(sid,'reserve',jsonb_build_object('requestId',gen_random_uuid(),'hash','h','topic','school','text','Another.'));if r->>'ok'='true' then raise exception 'parallel call admitted';end if;
  perform public.dm_papi_chat(sid,'finish',jsonb_build_object('requestId',rid,'result',jsonb_build_object('reply','What do you like?')));
  r:=public.dm_papi_chat(sid,'reserve',jsonb_build_object('requestId',rid,'hash','h','topic','school','text','I like art.'));if r->>'state'<>'done' then raise exception 'retry result %',r;end if;
  update public.dm_papi_chat_turns set created_at=now()-interval '10 seconds' where student_id=sid;
 end loop;
 r:=public.dm_papi_chat(sid,'reserve',jsonb_build_object('requestId',gen_random_uuid(),'hash','h','topic','school','text','Sixth.'));if r->>'code'<>'daily_limit' then raise exception 'sixth message %',r;end if;
 r:=public.dm_papi_chat(other_id,'status');if r->>'remaining'<>'5' then raise exception 'foreign quota %',r;end if;
 rid:=gen_random_uuid();perform public.dm_papi_chat(other_id,'reserve',jsonb_build_object('requestId',rid,'hash','h','topic','food','text','I like apples.'));
 perform public.dm_papi_chat(other_id,'fail',jsonb_build_object('requestId',rid));r:=public.dm_papi_chat(other_id,'status');if r->>'remaining'<>'5' then raise exception 'refund %',r;end if;
 perform public.dm_papi_chat(other_id,'quota',jsonb_build_object('requestId',rid));r:=public.dm_papi_chat(sid,'status');if r->>'globalAvailable'<>'false' then raise exception 'global breaker %',r;end if;
end $$;
select 'PASS: five messages, idempotency, concurrent pending, isolated accounts, refund and shared quota breaker' result;
rollback;
