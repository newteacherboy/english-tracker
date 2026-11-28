-- Preserve historical gifts and retire peer messages/gifts.
CREATE OR REPLACE FUNCTION public.dm_social_action(actor uuid, target uuid, action text, arg text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare me public.students; them public.students;
begin
 if action is null or action not in ('status','block','unblock') then raise exception 'Öğrenciler arası mesaj ve hediye gönderme kaldırıldı.';end if;
 if actor is null or actor=target then raise exception 'Geçersiz öğrenci.';end if;
 perform pg_advisory_xact_lock(hashtextextended(least(actor::text,target::text)||greatest(actor::text,target::text),0));
 select * into me from public.students where id=actor and status='approved';
 select * into them from public.students where id=target and status='approved';
 if me.id is null or them.id is null then raise exception 'Öğrenci bulunamadı.';end if;
 if action='status' then return jsonb_build_object('ok',true,'blocked',public.dm_blocked(actor,target),'mine',exists(select 1 from public.student_blocks where blocker_id=actor and blocked_id=target));end if;
 if action='unblock' then delete from public.student_blocks where blocker_id=actor and blocked_id=target;return jsonb_build_object('ok',true);end if;
 if action='block' then
  insert into public.student_blocks values(actor,target,now()) on conflict do nothing;
  delete from public.feed_events where event_type='takip' and ((student_id=actor and target_student_id=target) or (student_id=target and target_student_id=actor));
  -- Remove outstanding invitations rather than allowing an acceptance after a block.
  delete from public.duels where status in ('pending','accepted') and ((sender_student_id=actor and receiver_student_id=target) or (sender_student_id=target and receiver_student_id=actor));
  delete from public.notifications where read_at is null and ((sender_student_id=actor and recipient_student_id=target) or (sender_student_id=target and recipient_student_id=actor));
  update public.dm_matches set status='cancelled' where status in ('waiting','playing') and ((player_a=actor and player_b=target) or (player_a=target and player_b=actor));
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Geçersiz işlem.';
end $function$;

CREATE OR REPLACE FUNCTION dm_private.bildirim_liste(sid uuid, p_tumu boolean)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with son as (
  select n.*, snd.username as gonderen_ad, snd.frozen_at as gonderen_donuk,
   'duels'::text f
  from public.notifications n left join public.students snd on snd.id=n.sender_student_id
  where n.recipient_student_id=sid and (p_tumu or n.read_at is null)
    and (n.sender_student_id is null or n.type not in ('mesaj','hediye','enerji'))
  order by n.created_at desc limit 200)
 select coalesce(jsonb_agg(jsonb_build_object(
   'sat',x.id,'tarih',x.created_at,'gonderen',coalesce(x.gonderen_ad,''),'tur',x.type,'metin',x.message,
   'okundu',x.read_at is not null,
   'duyuruId',case when x.payload->'duyuruId' is null or x.payload->'duyuruId' in ('null'::jsonb,'0'::jsonb,'""'::jsonb,'false'::jsonb) then null else x.payload->'duyuruId' end
  ) order by x.created_at desc),'[]'::jsonb)
 from son x
 left join public.dm_social_controls vc on vc.student_id=sid
 left join public.dm_social_controls sc on sc.student_id=x.sender_student_id
 where (x.sender_student_id is null or (
    dm_private.sosyal_izin(vc,x.f) and not exists(select 1 from public.students v where v.id=sid and v.frozen_at is not null)
    and x.gonderen_donuk is null and dm_private.sosyal_izin(sc,x.f)
    and not exists(select 1 from public.student_blocks b where (b.blocker_id=sid and b.blocked_id=x.sender_student_id) or (b.blocked_id=sid and b.blocker_id=x.sender_student_id))))
  and x.sender_student_id is distinct from 'dcde2026-1015-4000-8000-000000000001'::uuid
  and not exists(select 1 from unnest(array[x.gonderen_ad,x.payload->>'target_name',x.payload->>'student_name']) nm(v)
                 where lower(btrim(coalesce(nm.v,'')))='dijimedu_demo' or coalesce(nm.v,'') ~ ' · Öğretmen Denemesi [a-f0-9]{8}$')
$function$;

drop trigger if exists dm_gift_retention on public.extra_data;
