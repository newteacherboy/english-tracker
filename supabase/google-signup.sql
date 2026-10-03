-- Only the verified server can call this transaction. Existing students are never overwritten.
begin;
create function public.register_google_student(p_auth_user_id uuid, p_payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_student_id uuid; v_username text := p_payload->>'username';
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_auth_user_id::text, 0));
  select student_id into v_student_id from public.student_google_accounts where auth_user_id = p_auth_user_id;
  if v_student_id is not null then return v_student_id; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pg_catalog.lower(v_username), 1));
  if exists (select 1 from public.students where pg_catalog.lower(username) = pg_catalog.lower(v_username))
     or exists (select 1 from public.teachers where pg_catalog.lower(username) = pg_catalog.lower(v_username)) then
    raise exception 'Username already registered' using errcode = '23505';
  end if;
  insert into public.students(username,password_hash,phone,class_no,branch,email,status,teacher_id,kvkk_approved_at)
  values(v_username,p_payload->>'password_hash',p_payload->>'phone',(p_payload->>'class_no')::integer,
    p_payload->>'branch',p_payload->>'email','approved',(p_payload->>'teacher_id')::uuid,pg_catalog.now())
  returning id into v_student_id;
  insert into public.student_google_accounts(auth_user_id,student_id) values(p_auth_user_id,v_student_id);
  return v_student_id;
end;
$$;
revoke all on function public.register_google_student(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.register_google_student(uuid,jsonb) to service_role;
commit;
