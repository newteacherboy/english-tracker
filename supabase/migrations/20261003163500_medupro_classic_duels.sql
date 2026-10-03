create or replace function public.dm_classic_result(actor uuid,game text,score numeric,seconds numeric) returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.duels; mine jsonb; other jsonb; winner text; out jsonb:='[]';
begin
 for d in select * from public.duels where actor in(sender_student_id,receiver_student_id) and status='accepted' and sender_payload->>'oyun'=game and responded_at>now()-interval '24 hours' order by id for update loop
  if public.dm_blocked(d.sender_student_id,d.receiver_student_id) then continue;end if;
  mine:=jsonb_build_object('puan',score,'sure',seconds);
  if actor=d.sender_student_id then d.sender_payload:=d.sender_payload||jsonb_build_object('result',mine);else d.receiver_payload:=coalesce(d.receiver_payload,'{}')||jsonb_build_object('result',mine);end if;
  if d.sender_payload ? 'result' and d.receiver_payload ? 'result' then
   if (d.sender_payload#>>'{result,puan}')::numeric>(d.receiver_payload#>>'{result,puan}')::numeric then select username into winner from public.students where id=d.sender_student_id;
   elsif (d.sender_payload#>>'{result,puan}')::numeric<(d.receiver_payload#>>'{result,puan}')::numeric then select username into winner from public.students where id=d.receiver_student_id;
   elsif (d.sender_payload#>>'{result,sure}')::numeric<(d.receiver_payload#>>'{result,sure}')::numeric then select username into winner from public.students where id=d.sender_student_id;
   elsif (d.sender_payload#>>'{result,sure}')::numeric>(d.receiver_payload#>>'{result,sure}')::numeric then select username into winner from public.students where id=d.receiver_student_id;
   else winner:='berabere';end if;
   d.status:='finished';d.sender_payload:=d.sender_payload||jsonb_build_object('kazanan',winner);
   insert into public.notifications(recipient_student_id,type,message) values(d.sender_student_id,'duelloSonuc','Düello tamamlandı: '||winner),(d.receiver_student_id,'duelloSonuc','Düello tamamlandı: '||winner);
  end if;
  update public.duels set sender_payload=d.sender_payload,receiver_payload=d.receiver_payload,status=d.status where id=d.id;
  other:=case when actor=d.sender_student_id then d.receiver_payload->'result' else d.sender_payload->'result' end;
  out:=out||jsonb_build_array(jsonb_build_object('id',d.id,'status',d.status,'myResult',mine,'opponentResult',other,'winner',winner));
 end loop;
 return out;
end $$;
revoke all on function public.dm_classic_result(uuid,text,numeric,numeric) from public,anon,authenticated;
grant execute on function public.dm_classic_result(uuid,text,numeric,numeric) to service_role;
-- Received gifts remain in the recipient's closet after ordinary saves.
create or replace function public.dm_keep_gifts() returns trigger language plpgsql security invoker set search_path='' as $$
declare items jsonb;
begin
 if new.key_name='yo' and jsonb_typeof(new.value)='object' and new.value ? 'karakter' then
  select jsonb_agg(distinct x) into items from (select value x from jsonb_array_elements(coalesce(new.value#>'{karakter,sahip}','[]')) union select to_jsonb('d:'||item_id) from public.dm_accessory_gifts where recipient_id=new.student_id) t;
  new.value:=jsonb_set(new.value,'{karakter,sahip}',coalesce(items,'[]'));
 end if;return new;
end $$;
create trigger dm_gift_retention before insert or update on public.extra_data for each row execute function public.dm_keep_gifts();
