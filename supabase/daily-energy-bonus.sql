-- Daily welcome energy is a per-student Istanbul-day claim, never a device claim.
create or replace function public.dm_daily_energy_bonus(actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 s public.students; day date := (now() at time zone 'Europe/Istanbul')::date;
 start_at timestamptz; claim_key text; cap int; before_energy int; balance int; amount int; added int;
 steps int; stamp timestamptz; already boolean;
begin
 select * into s from public.students where id=actor and status='approved' for update;
 if not found then raise exception 'Aktif öğrenci hesabı gerekli'; end if;
 start_at:=day::timestamp at time zone 'Europe/Istanbul';claim_key:='energy_daily:'||day::text;
 cap:=coalesce(nullif(s.energy_max,0),30);before_energy:=coalesce(s.energy,0);balance:=before_energy;stamp:=coalesce(s.energy_updated_at,now());
 -- Regenerate under the same row lock so parallel devices cannot overwrite the balance.
 if balance<cap then
  steps:=greatest(0,floor(extract(epoch from (now()-stamp))/900)::int);
  if steps>0 then
   balance:=least(cap,balance+steps);stamp:=case when balance>=cap then now() else stamp+steps*interval '15 minutes' end;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,balance-before_energy,balance,'dolum');
  end if;
 elsif now()-stamp>interval '15 minutes' then stamp:=now();
 end if;
 -- Honor pre-upgrade claims as well as the new durable marker (including zero-credit claims).
 already:=exists(select 1 from public.extra_data where student_id=actor and key_name=claim_key)
 or exists(select 1 from public.energy_transactions where student_id=actor and reason='gunluk' and change_amount>0 and created_at>=start_at and created_at<start_at+interval '1 day');
 if already then
  update public.students set energy=balance,energy_updated_at=stamp where id=actor;
  insert into public.extra_data(student_id,key_name,value) values(actor,claim_key,jsonb_build_object('day',day,'legacy',true)) on conflict(student_id,key_name) do nothing;
  return jsonb_build_object('ok',true,'status','success','claimed',false,'alreadyClaimed',true,'day',day,'eklenen',0,'enerjiKalan',balance,'enerjiMax',cap,'mesaj','Günlük hediyeni bugün zaten aldın.');
 end if;
 amount:=case when coalesce(s.streak,0)>0 and s.streak%7=0 then 10 else 5 end;
 added:=greatest(0,least(amount,cap+10-balance));balance:=balance+added;
 update public.students set energy=balance,energy_updated_at=stamp,updated_at=now() where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,added,balance,'gunluk');
 insert into public.extra_data(student_id,key_name,value) values(actor,claim_key,jsonb_build_object('day',day,'amount',added)) on conflict(student_id,key_name) do nothing;
 return jsonb_build_object('ok',true,'status','success','claimed',true,'alreadyClaimed',false,'day',day,'eklenen',added,'enerjiKalan',balance,'enerjiMax',cap);
end $$;
revoke all on function public.dm_daily_energy_bonus(uuid) from public,anon,authenticated;
grant execute on function public.dm_daily_energy_bonus(uuid) to service_role;
