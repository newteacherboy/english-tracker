-- Exercise real deductions and receipts with a new fixture, then roll everything back.
begin;
do $$
declare actor uuid:=gen_random_uuid(); result jsonb; old_result jsonb; n integer; expected integer; rejected boolean;
begin
 insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at,gold)
 values(actor,'price_check_'||substr(actor::text,1,8),'unused-test-hash','approved',0,100,now(),5000);
 insert into public.extra_data(student_id,key_name,value) values(actor,'yo','{"altin":5000}')
 on conflict(student_id,key_name) do update set value=excluded.value;
 foreach n in array array[5,10,15] loop
  update public.students set energy=0,energy_updated_at=now() where id=actor;
  expected:=case n when 5 then 350 when 10 then 600 when 15 then 850 end;
  result:=public.dm_energy_shop_buy(actor,'price_check_pack_'||n,n);
  assert (result->>'price')::integer=expected, 'correct current price';
  assert (result->>'added')::integer=n, 'correct energy';
 end loop;
 assert (result->>'gold')::integer=3200 and (result->>'energy')::integer=15,'all three packages deducted 1800 gold; last package adds 15 energy';
 assert (select gold=3200 and energy=15 from public.students where id=actor),'student wallet matches';
 assert (select (value->>'altin')::integer=3200 from public.extra_data where student_id=actor and key_name='yo'),'extra_data wallet matches';
 assert (select sum(gold_price)=1800 from public.dm_energy_shop_purchases where student_id=actor),'receipts match deductions';
 old_result:=public.dm_energy_shop_buy(actor,'price_check_pack_5',5);
 assert (old_result->>'duplicate')::boolean and (old_result->>'gold')::integer=3200,'retries never deduct twice';
 rejected:=false;
 begin perform public.dm_energy_shop_buy(actor,'price_check_fourth',5);exception when others then rejected:=position('3 enerji' in SQLERRM)>0;end;
 assert rejected,'daily cap remains three';
 delete from public.dm_energy_shop_purchases where student_id=actor;
 update public.extra_data set value='{"altin":349}' where student_id=actor and key_name='yo';
 update public.students set energy=0,gold=349,energy_updated_at=now() where id=actor;
 rejected:=false;
 begin perform public.dm_energy_shop_buy(actor,'price_check_poor',5);exception when others then rejected:=SQLERRM='Yetersiz altın';end;
 assert rejected,'349 gold cannot buy 5 energy';
 assert (select gold=349 and energy=0 from public.students where id=actor),'failed purchase leaves balance unchanged';
 update public.extra_data set value='{"altin":5000}' where student_id=actor and key_name='yo';
 update public.students set energy=24,energy_max=25,gold=5000,energy_updated_at=now() where id=actor;
 rejected:=false;
 begin perform public.dm_energy_shop_buy(actor,'price_check_capacity',5);exception when others then rejected:=SQLERRM='Enerji kapasitesi aşılıyor';end;
 assert rejected,'capacity limit preserved';
 insert into public.dm_energy_shop_purchases(student_id,request_key,energy_amount,gold_price) values(actor,'legacy_price_receipt',5,230);
 result:=public.dm_energy_shop_buy(actor,'legacy_price_receipt',5);
 assert (result->>'duplicate')::boolean and (result->>'price')::integer=230 and (result->>'gold')::integer=5000,'old receipts retain original prices without another deduction';
 assert not has_function_privilege('anon','public.dm_energy_shop_buy(uuid,text,integer)','execute'),'anon denied';
 assert not has_function_privilege('authenticated','public.dm_energy_shop_buy(uuid,text,integer)','execute'),'direct authenticated calls denied';
 assert has_function_privilege('service_role','public.dm_energy_shop_buy(uuid,text,integer)','execute'),'API service retains access';
end $$;
select '350/600/850 deductions, wallet parity, idempotency, daily cap, insufficient funds, capacity, legacy receipts and permissions passed' as verification;
rollback;
