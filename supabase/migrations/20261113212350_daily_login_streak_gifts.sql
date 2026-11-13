-- One server-dated login series and one atomic daily claim across all devices.
-- Existing login evidence and earned streak shields remain valid; no client count is trusted.
create or replace function public.dm_daily_gift(actor uuid, claim boolean default false)
returns jsonb language plpgsql set search_path='' as $$
declare
 s public.students; day date := (now() at time zone 'Europe/Istanbul')::date;
 start_at timestamptz; claim_key text; cap int; before_energy int; balance int; added int:=0;
 steps int; stamp timestamptz; already boolean; streak_count int; window_start int;
 series_start date; claimed_days jsonb; is_new boolean:=false;
begin
 select * into s from public.students where id=actor and status='approved' for update;
 if not found then raise exception 'Aktif öğrenci hesabı gerekli'; end if;
 start_at:=day::timestamp at time zone 'Europe/Istanbul';claim_key:='energy_daily:'||day::text;
 insert into public.extra_data(student_id,key_name,value) values(actor,'member_login:'||day::text,jsonb_build_object('day',day)) on conflict(student_id,key_name) do nothing;
 with evidence as (
  select distinct substring(key_name from position(':' in key_name)+1)::date as d
  from public.extra_data where student_id=actor and key_name ~ '^(member_login|energy_daily|streak_shield):[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 ), ordered as (select d,row_number() over(order by d desc)::int as n from evidence where d<=day)
 select greatest(1,count(*)::int) into streak_count from ordered where d=day-(n-1);
 series_start:=day-(streak_count-1);window_start:=((streak_count-1)/7)*7+1;
 cap:=coalesce(nullif(s.energy_max,0),25);before_energy:=coalesce(s.energy,0);balance:=before_energy;stamp:=coalesce(s.energy_updated_at,now());
 if balance<cap then
  steps:=greatest(0,floor(extract(epoch from (now()-stamp))/900)::int);
  if steps>0 then
   balance:=least(cap,balance+steps);stamp:=case when balance>=cap then now() else stamp+steps*interval '15 minutes' end;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,balance-before_energy,balance,'dolum');
  end if;
 elsif now()-stamp>interval '15 minutes' then stamp:=now(); end if;
 already:=exists(select 1 from public.extra_data where student_id=actor and key_name=claim_key)
 or exists(select 1 from public.energy_transactions where student_id=actor and reason='gunluk' and change_amount>0 and created_at>=start_at and created_at<start_at+interval '1 day');
 if already then
  -- A legacy client may have claimed before the durable marker was introduced.
  insert into public.extra_data(student_id,key_name,value) values(actor,claim_key,jsonb_build_object('day',day,'legacy',true)) on conflict(student_id,key_name) do nothing;
 elsif claim then
  added:=greatest(0,least(streak_count,cap-balance));balance:=balance+added;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,added,balance,'gunluk');
  insert into public.extra_data(student_id,key_name,value) values(actor,claim_key,jsonb_build_object('day',day,'amount',added,'reward',streak_count,'streak',streak_count));
  is_new:=true;
 end if;
 update public.students set energy=balance,energy_updated_at=stamp where id=actor;
 select coalesce(jsonb_agg((substring(key_name from 14)::date-series_start)+1 order by key_name),'[]'::jsonb) into claimed_days
 from public.extra_data where student_id=actor and key_name between 'energy_daily:'||(series_start+window_start-1)::text and claim_key;
 return jsonb_build_object('ok',true,'status','success','day',day,'serverNow',now(),'streak',streak_count,'rewardAmount',streak_count,'nextReward',streak_count+1,
 'windowStart',window_start,'claimedDays',claimed_days,'claimed',is_new,'alreadyClaimed',already,'eklenen',added,'enerjiKalan',balance,'enerjiMax',cap);
end $$;
revoke all on function public.dm_daily_gift(uuid,boolean) from public,anon,authenticated;
grant execute on function public.dm_daily_gift(uuid,boolean) to service_role;
-- Preserve the old authenticated Edge API contract for clients that have not refreshed yet.
create or replace function public.dm_daily_energy_bonus(actor uuid) returns jsonb
language sql set search_path='' as $$ select public.dm_daily_gift(actor,true) $$;
revoke all on function public.dm_daily_energy_bonus(uuid) from public,anon,authenticated;
grant execute on function public.dm_daily_energy_bonus(uuid) to service_role;
