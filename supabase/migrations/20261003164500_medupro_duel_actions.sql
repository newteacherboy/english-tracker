create or replace function public.dm_duel_action(actor uuid,action text,arg jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare target uuid;d public.duels;g text;listed jsonb;
begin
 if not exists(select from public.students where id=actor and status='approved') then raise exception 'Öğrenci bulunamadı.';end if;
 if action='create' then
  target:=(arg->>'target')::uuid;g:=arg->>'game';
  if target=actor or not exists(select from public.students where id=target and status='approved') then raise exception 'Geçersiz rakip.';end if;
  perform pg_advisory_xact_lock(hashtextextended('duel:'||actor::text,0));
  perform pg_advisory_xact_lock(hashtextextended(least(actor::text,target::text)||greatest(actor::text,target::text),0));
  if public.dm_blocked(actor,target) then raise exception 'Bu kişiyle iletişim kapalı.';end if;
  if (select count(*) from public.duels where sender_student_id=actor and created_at>=(now() at time zone 'Europe/Istanbul')::date::timestamp at time zone 'Europe/Istanbul')>=3 then raise exception 'Bugün 3 düello gönderdin. Yarın yine gel!';end if;
  insert into public.duels(sender_student_id,receiver_student_id,sender_payload) values(actor,target,jsonb_build_object('oyun',g));
  insert into public.notifications(recipient_student_id,sender_student_id,type,message) values(target,actor,'duello',g);
  return jsonb_build_object('ok',true,'status','success');
 elsif action='reply' then
  select * into d from public.duels where id=(arg->>'id')::uuid and receiver_student_id=actor for update;
  if d.id is null or d.status<>'pending' or d.created_at<now()-interval '24 hours' then raise exception 'Davet artık geçerli değil.';end if;
  if public.dm_blocked(actor,d.sender_student_id) then raise exception 'Bu kişiyle iletişim kapalı.';end if;
  update public.duels set status=case when (arg->>'accept')::boolean then 'accepted' else 'rejected' end,responded_at=now() where id=d.id;
  return jsonb_build_object('ok',true,'status','success');
 elsif action='list' then
  select coalesce(jsonb_agg(x),'[]') into listed from (select jsonb_build_object('id',dl.id,'gonderen',a.username,'alici',b.username,'durum',case when dl.status='finished' then 'bitti' when dl.status='rejected' then 'red' when coalesce(dl.responded_at,dl.created_at)<now()-interval '24 hours' then 'sure_doldu' when dl.status='accepted' then 'kabul' else 'bekliyor' end,'oyun',dl.sender_payload->>'oyun','kazanan',dl.sender_payload->>'kazanan','benPuan',case when actor=dl.sender_student_id then dl.sender_payload#>'{result,puan}' else dl.receiver_payload#>'{result,puan}' end,'rakipPuan',case when actor=dl.sender_student_id then dl.receiver_payload#>'{result,puan}' else dl.sender_payload#>'{result,puan}' end,'benSure',case when actor=dl.sender_student_id then dl.sender_payload#>'{result,sure}' else dl.receiver_payload#>'{result,sure}' end,'rakipSure',case when actor=dl.sender_student_id then dl.receiver_payload#>'{result,sure}' else dl.sender_payload#>'{result,sure}' end,'kalanDk',greatest(0,1440-floor(extract(epoch from now()-coalesce(dl.responded_at,dl.created_at))/60))) x from public.duels dl join public.students a on a.id=dl.sender_student_id join public.students b on b.id=dl.receiver_student_id where actor in(dl.sender_student_id,dl.receiver_student_id) order by dl.created_at desc limit 50) t;
  return jsonb_build_object('ok',true,'liste',listed);
 end if;raise exception 'Geçersiz işlem.';
end $$;
revoke all on function public.dm_duel_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dm_duel_action(uuid,text,jsonb) to service_role;
-- Update the recipient's persisted closet immediately; keep the version monotonic.
create or replace function public.dm_deliver_accessory() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 update public.extra_data set value=jsonb_set(value,'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000))),updated_at=now() where student_id=new.recipient_id and key_name='yo' and jsonb_typeof(value)='object';
 return new;
end $$;
create trigger dm_gift_delivery after insert on public.dm_accessory_gifts for each row execute function public.dm_deliver_accessory();
