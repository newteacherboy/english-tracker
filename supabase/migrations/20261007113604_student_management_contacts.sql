-- Student management is available only through the authenticated Edge API.
alter table public.students add column if not exists contact_deadline timestamptz;
alter table public.students add column if not exists contact_notice_day date;

create or replace function public.student_contacts_complete(p_phone text,p_email text)
returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(regexp_replace(p_phone,'[^0-9]','','g') ~ '^(05[0-9]{9}|905[0-9]{9})$',false)
    and coalesce(trim(p_email) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$',false);
$$;

-- Existing accounts receive a full grace period; untouched new accounts start at first login.
update public.students set contact_deadline=now()+interval '15 days'
where role='student' and contact_deadline is null
and not public.student_contacts_complete(phone,email);

create or replace function public.student_contact_state(p_student uuid,p_claim boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.students; d date := (now() at time zone 'Europe/Istanbul')::date; notify boolean:=false;
begin
 select * into s from public.students where id=p_student and role='student' for update;
 if not found then raise exception 'Student not found' using errcode='P0002'; end if;
 if public.student_contacts_complete(s.phone,s.email) then
   return jsonb_build_object('eksik',false,'donuk',false,'uyari',false);
 end if;
 if s.contact_deadline is null then
   s.contact_deadline:=now()+interval '15 days';
   update public.students set contact_deadline=s.contact_deadline where id=s.id;
 end if;
 if p_claim and now()<s.contact_deadline and s.contact_notice_day is distinct from d then
   notify:=true; update public.students set contact_notice_day=d where id=s.id;
 end if;
 return jsonb_build_object('eksik',true,'donuk',now()>=s.contact_deadline,'uyari',notify,
   'sonTarih',s.contact_deadline,'kalanGun',greatest(0,ceil(extract(epoch from(s.contact_deadline-now()))/86400)::int));
end $$;

create or replace function public.admin_student_update(p_actor uuid,p_student uuid,p_expected timestamptz,p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.students; v text; credential_change boolean;
begin
 if not exists(select 1 from public.teachers where id=p_actor and active and is_admin and username='teacher') then
   raise exception 'Owner only' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(7783912);
 select * into s from public.students where id=p_student and role='student' for update;
 if not found then raise exception 'Student not found' using errcode='P0002'; end if;
 if s.updated_at is distinct from p_expected then raise exception 'Stale update' using errcode='40001'; end if;
 v:=trim(p_changes->>'username');
 if length(v) not between 3 and 50 or v ~ '[<>[:cntrl:]]' or
    coalesce((p_changes->>'class_no')::int,0) not between 1 and 8 or
    coalesce(length(trim(p_changes->>'branch')),0) not between 1 and 10 or
    (coalesce(p_changes->>'school','')<>'' and length(p_changes->>'school') not between 3 and 120) then
   raise exception 'Invalid fields' using errcode='22023';
 end if;
 if exists(select 1 from public.students where lower(username)=lower(v) and id<>s.id) or
    exists(select 1 from public.teachers where lower(username)=lower(v)) then
   raise exception 'Username already used' using errcode='23505';
 end if;
 if p_changes ? 'password_hash' and not (p_changes->>'password_hash' like 'pbkdf2$210000$%') then
   raise exception 'Invalid password hash' using errcode='22023';
 end if;
 credential_change := s.username<>v or p_changes ? 'password_hash';
 update public.students set username=v,school=nullif(p_changes->>'school',''),
   class_no=(p_changes->>'class_no')::int,selected_class=(p_changes->>'class_no')::int,
   branch=trim(p_changes->>'branch'),password_hash=coalesce(p_changes->>'password_hash',password_hash),updated_at=clock_timestamp()
 where id=s.id;
 if s.username<>v then
   update public.game_scores set student_name=v where student_id=s.id;
   update public.student_xp_weekly set student_name=v where student_id=s.id;
   update public.badges set student_name=v where student_name=s.username;
 end if;
 if credential_change then delete from public.portal_sessions where student_id=s.id; end if;
 insert into public.audit_logs(actor_role,actor_id,operation,target,payload)
 values('teacher',p_actor,'admin_student_update',s.id::text,jsonb_build_object('fields',jsonb_build_array('username','school','class_no','branch'),'password_changed',p_changes ? 'password_hash'));
 return (select jsonb_build_object('id',id,'username',username,'school',school,'class_no',class_no,'branch',branch,'status',status,'updated_at',updated_at)
   from public.students where id=s.id);
end $$;

create or replace function public.teacher_students_create(p_actor uuid,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; v text; result jsonb:='[]'; s public.students;
begin
 if not exists(select 1 from public.teachers where id=p_actor and active) then raise exception 'Teacher only' using errcode='42501'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 50 then raise exception 'Invalid batch' using errcode='22023'; end if;
 -- Serialize bulk creation and owner renames to avoid case-insensitive collisions.
 perform pg_catalog.pg_advisory_xact_lock(7783912);
 for r in select value from jsonb_array_elements(p_rows) loop
   v:=trim(r->>'username');
   if coalesce(length(v),0) not between 3 and 50 or v ~ '[<>[:cntrl:]]' or
      coalesce((r->>'class_no')::int,0) not between 1 and 8 or coalesce(length(trim(r->>'branch')),0) not between 1 and 10 or
      not coalesce(r->>'password_hash' like 'pbkdf2$210000$%',false) or
      (coalesce(r->>'school','')<>'' and length(r->>'school') not between 3 and 120) then raise exception 'Invalid student' using errcode='22023'; end if;
   if exists(select 1 from public.students where lower(username)=lower(v)) or exists(select 1 from public.teachers where lower(username)=lower(v)) then
     raise exception 'Username already used: %',v using errcode='23505';
   end if;
   insert into public.students(username,password_hash,class_no,selected_class,branch,school,teacher_id,role,status,email_verification_required)
     values(v,r->>'password_hash',(r->>'class_no')::int,(r->>'class_no')::int,trim(r->>'branch'),nullif(r->>'school',''),p_actor,'student','approved',false)
     returning * into s;
   result:=result || jsonb_build_array(jsonb_build_object('id',s.id,'username',s.username,'class_no',s.class_no,'branch',s.branch));
 end loop;
 insert into public.audit_logs(actor_role,actor_id,operation,target,payload)
 values('teacher',p_actor,'teacher_students_create',p_actor::text,jsonb_build_object('count',jsonb_array_length(result)));
 return result;
end $$;

revoke all on function public.student_contacts_complete(text,text), public.student_contact_state(uuid,boolean),
 public.admin_student_update(uuid,uuid,timestamptz,jsonb),public.teacher_students_create(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.student_contacts_complete(text,text), public.student_contact_state(uuid,boolean),
 public.admin_student_update(uuid,uuid,timestamptz,jsonb),public.teacher_students_create(uuid,jsonb) to service_role;
