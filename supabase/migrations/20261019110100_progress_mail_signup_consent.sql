-- Progress/league e-mail recipients: students registered before the cutoff keep the owner-instructed legacy
-- enrolment; students registered after it are enrolled only with the optional signup checkbox
-- (extra_data progress_mail_consent_v1). Service mail (verification, security, account) is unaffected.
create or replace function public.dm_sync_registered_mail_recipients()
 returns integer
 language plpgsql
 set search_path to ''
as $function$
declare n integer;
begin
 insert into public.dm_progress_mail_preferences(student_id,recipient_kind,email,opted_in_at,consent_source,unsubscribe_token_hash)
 select s.id,'parent',lower(btrim(s.email)),now(),
  case when c.student_id is not null then 'registration_checkbox' else 'registration_existing_consent_owner_instruction_20261018' end,
  md5(gen_random_uuid()::text)
 from public.students s
 left join public.extra_data c on c.student_id=s.id and c.key_name='progress_mail_consent_v1'
  and lower(btrim(coalesce(c.value->>'email','')))=lower(btrim(s.email))
 where s.role='student' and s.status='approved'
 and btrim(coalesce(s.email,'')) ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
 and (s.created_at < '2026-10-19T11:01:00Z'::timestamptz or c.student_id is not null)
 and not exists(select 1 from public.dm_progress_mail_preferences p where p.student_id=s.id and lower(p.email)=lower(btrim(s.email)))
 on conflict do nothing;
 get diagnostics n=row_count; return n;
end $function$;
