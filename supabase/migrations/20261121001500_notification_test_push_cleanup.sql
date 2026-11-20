-- Stop legacy test push messages from being backfilled and deduplicate same-day dispatches.
create or replace function dm_private.center_sync_announcements(s public.students)
returns void language plpgsql security definer set search_path='' as $$
declare a record; campaign boolean;
begin
 for a in select x.* from public.announcements x
 where x.active and x.created_at>=greatest(s.created_at,now()-interval '30 days')
 and (x.teacher_id is null or x.teacher_id=s.teacher_id or exists(select 1 from public.teachers t where t.id=x.teacher_id and t.is_admin and t.active))
 and (x.target_type in ('all','tumogrenciler','herkes','ogretmen')
 or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(x.target_list)='array' then x.target_list else '[]'::jsonb end) e(v)
 where case x.target_type when 'sinif' then e.v#>>'{}'=s.class_no::text when 'sube' then dm_private.tr_ad(e.v#>>'{}')=dm_private.tr_ad(s.class_no::text||'|'||coalesce(s.branch,'')) else dm_private.tr_ad(e.v#>>'{}')=dm_private.tr_ad(s.username) end))
 and not exists(select 1 from public.notifications n where n.id=md5('center-v1:'||s.id::text||':announcement:'||x.id::text)::uuid)
 loop
 campaign:=(a.title||' '||a.message) ~* '(24 kasım|öğretmenimle zirveye)';
 perform dm_private.center_event(s.id,'announcement:'||a.id,'duyuru',a.title,a.message,
 jsonb_build_object('duyuruId',a.id,'routeTab',case when campaign then 'campaign' else null end));
 end loop;
 for a in select distinct on (x.target,lower(btrim(x.title)),lower(btrim(x.body)),(x.created_at at time zone 'Europe/Istanbul')::date) x.*
 from public.dm_push_log x where x.created_at>=greatest(s.created_at,now()-interval '30 days')
 and (x.target='all' or (left(x.target,5)='user:' and dm_private.tr_ad(substring(x.target from 6))=dm_private.tr_ad(s.username)))
 and not (x.title='Ücretsiz Yarışma Başladı' and lower(btrim(coalesce(x.body,'')))='geç kalma')
 order by x.target,lower(btrim(x.title)),lower(btrim(x.body)),(x.created_at at time zone 'Europe/Istanbul')::date,x.id
 loop
  if exists(select 1 from public.notifications n
      where n.recipient_student_id=s.id and n.type='duyuru' and n.title=a.title and n.message=a.body
      and n.payload ? 'pushLogId' and (n.payload->>'pushLogId') ~ '^[0-9]+$'
      and exists(select 1 from public.dm_push_log prior where prior.id=(n.payload->>'pushLogId')::bigint
      and (prior.created_at at time zone 'Europe/Istanbul')::date=(a.created_at at time zone 'Europe/Istanbul')::date))
  then continue;end if;
  campaign:=(coalesce(a.title,'')||' '||coalesce(a.body,'')) ~* '(24 kasım|öğretmenimle zirveye|ücretsiz yarışma)';
  perform dm_private.center_event(s.id,'push:'||a.id,'duyuru',a.title,a.body,
   jsonb_build_object('pushLogId',a.id,'routeTab',case when campaign then 'campaign' else a.route_tab end));
 end loop;
end $$;
revoke all on function dm_private.center_sync_announcements(public.students) from public,anon,authenticated;
-- These were short, duplicate Nov 18 test pushes, not useful alerts.
delete from public.notifications n using public.dm_push_log p
where p.id in (1,2,3) and p.title='Ücretsiz Yarışma Başladı'
  and lower(btrim(p.body))='geç kalma' and n.type='duyuru'
  and n.id=md5('center-v1:'||n.recipient_student_id::text||':push:'||p.id::text)::uuid
  and n.title=p.title and n.message=p.body;
-- Clarify the Nov 20 competition broadcast and make the retained alert actionable.
update public.notifications n set
 title='24 Kasım Yarışması: Premium Pro ödülü!',
 message='Öğretmenimle Zirveye yarışmasına katıl, sıralamanı ve Premium Pro ödüllerini incele. Ayrıntılar için dokun.',
 payload=coalesce(n.payload,'{}'::jsonb)||jsonb_build_object('routeTab','campaign')
from public.dm_push_log p
where p.id=4 and n.id=md5('center-v1:'||n.recipient_student_id::text||':push:'||p.id::text)::uuid
 and n.type='duyuru' and n.title=p.title;
notify pgrst,'reload schema';
