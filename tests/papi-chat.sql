-- All test data is rolled back; no real student's allowance or history changes.
begin;
set local role service_role;
do $$
declare sid uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); r jsonb; rid uuid; i int; tx uuid:=gen_random_uuid(); tx2 uuid:=gen_random_uuid();
begin
 insert into public.students(id,username,password_hash,status,role) values(sid,'qa_chat_'||replace(sid::text,'-',''),'disabled-test-only','approved','student'),(other_id,'qa_chat_peer_'||replace(other_id::text,'-',''),'disabled-test-only','approved','student');
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":1000000}'),(other_id,'yo','{"totalXp":1000000}');
 r:=public.dm_papi_chat(sid,'status');if r->>'code'<>'premium' then raise exception 'high level free bypass %',r;end if;
 insert into public.dm_payment_transactions(id,account_id,account_role,provider,provider_transaction_id,product_key,state,verified_at) values(tx,sid,'student','web','qa_chat_'||tx,'diji_pro','verified',now()),(tx2,other_id,'student','web','qa_chat_'||tx2,'diji_premium_pro','verified',now());
 insert into public.dm_entitlements(account_id,account_role,product_key,provider,transaction_id,state,valid_until) values(sid,'student','diji_pro','web',tx,'active',now()+interval '1 hour');
 r:=public.dm_papi_chat(sid,'status');if r->>'code'<>'premium' then raise exception 'Pro bypass %',r;end if;
 update public.dm_entitlements set product_key='diji_premium_pro',state='expired',valid_until=now()-interval '1 hour' where account_id=sid;
 r:=public.dm_papi_chat(sid,'status');if r->>'code'<>'premium' then raise exception 'expired Premium Pro bypass %',r;end if;
 update public.dm_payment_transactions set product_key='diji_premium_pro' where id=tx;
 update public.dm_entitlements set state='active',valid_until=now()+interval '1 hour' where account_id=sid;
 update public.extra_data set value='{"totalXp":0}' where student_id=sid and key_name='yo';
 r:=public.dm_papi_chat(sid,'status');if r->>'ok'<>'true' then raise exception 'level one Premium Pro rejected %',r;end if;
 insert into public.dm_entitlements(account_id,account_role,product_key,provider,transaction_id,state,valid_until) values(other_id,'student','diji_premium_pro','web',tx2,'active',now()+interval '1 hour');
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
select 'PASS: Free and Pro denial, expiry, level-one Premium Pro access, five messages, idempotency, concurrent pending, isolated accounts, refund and shared quota breaker' result;
rollback;
