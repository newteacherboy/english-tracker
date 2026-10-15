-- Rollback-only integration assertions; no real student data is changed.
begin;
do $$ declare test_actor uuid:=gen_random_uuid(); r1 jsonb; r2 jsonb;
begin
 insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at,streak) values(test_actor,'energy_check_'||substr(test_actor::text,1,8),'unused-test-hash','approved',10,30,now(),1);
 r1:=public.dm_daily_energy_bonus(test_actor);r2:=public.dm_daily_energy_bonus(test_actor);
 assert (r1->>'eklenen')::int=5, 'first claim';
 assert (r2->>'eklenen')::int=0 and (r2->>'enerjiKalan')::int=15, 'repeat claim';
 delete from public.extra_data where student_id=test_actor;delete from public.energy_transactions where student_id=test_actor;
 update public.students set energy=40,streak=7 where id=test_actor;
 r1:=public.dm_daily_energy_bonus(test_actor);
 assert (r1->>'eklenen')::int=0 and (r1->>'claimed')::boolean, 'capped claim is recorded';
 update public.students set energy=10 where id=test_actor;
 r2:=public.dm_daily_energy_bonus(test_actor);
 assert (r2->>'eklenen')::int=0, 'spending after capped claim cannot re-claim';
 delete from public.extra_data where student_id=test_actor;delete from public.energy_transactions where student_id=test_actor;
 r1:=public.dm_daily_energy_bonus(test_actor);
 assert (r1->>'eklenen')::int=10, 'seventh day bonus';
 delete from public.extra_data where student_id=test_actor;delete from public.energy_transactions where student_id=test_actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason,created_at) values(test_actor,5,15,'gunluk',((now() at time zone 'Europe/Istanbul')::date::timestamp at time zone 'Europe/Istanbul')+interval '1 minute');
 r1:=public.dm_daily_energy_bonus(test_actor);
 assert (r1->>'eklenen')::int=0, 'honor existing Istanbul-day claim';
 assert r1->>'day'=((now() at time zone 'Europe/Istanbul')::date)::text, 'Istanbul date';
end $$;
select 'repeat, cap, seventh-day and legacy Istanbul-day assertions passed' as verification;
rollback;
