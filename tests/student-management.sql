-- Synthetic students only. Every change, including sessions and audits, is rolled back.
begin;
do $$
declare owner_id uuid; teacher_id uuid; sid uuid; before_row public.students; after_row public.students;
 result jsonb; state jsonb; suffix text:=substr(gen_random_uuid()::text,1,8); oldname text; newname text;
begin
 select id into strict owner_id from public.teachers where username='teacher' and active and is_admin;
 insert into public.teachers(username,password_hash,active,is_admin) values('test_teacher_'||suffix,'test',true,false) returning id into teacher_id;
 oldname:='test_student_'||suffix;newname:='test_renamed_'||suffix;
 result:=public.teacher_students_create(teacher_id,jsonb_build_array(jsonb_build_object('username',oldname,'password_hash','pbkdf2$210000$test$test','class_no',5,'branch','A','school','Test school')));
 sid:=(result->0->>'id')::uuid;
 select * into before_row from public.students where id=sid;
 assert before_row.teacher_id=teacher_id and before_row.status='approved' and before_row.contact_deadline is null, 'direct approved teacher link; no pre-login deadline';
 state:=public.student_contact_state(sid,true);
 assert (state->>'uyari')::boolean and not (state->>'donuk')::boolean and (state->>'kalanGun')::int=15, 'first login starts full 15 days';
 state:=public.student_contact_state(sid,true);
 assert not (state->>'uyari')::boolean,'warning at most once per Istanbul calendar day';
 update public.students set contact_notice_day=(now() at time zone 'Europe/Istanbul')::date-1 where id=sid;
 assert (public.student_contact_state(sid,true)->>'uyari')::boolean,'next day warns again';
 update public.students set contact_deadline=now()-interval '1 second' where id=sid;
 assert (public.student_contact_state(sid,false)->>'donuk')::boolean,'deadline freezes';
 update public.students set phone='05321234567' where id=sid;
 assert (public.student_contact_state(sid,false)->>'donuk')::boolean,'phone alone cannot unlock';
 update public.students set email='parent@example.test' where id=sid;
 assert not (public.student_contact_state(sid,false)->>'eksik')::boolean,'both valid contacts immediately unlock';
 insert into public.portal_sessions(token_hash,student_id,role,expires_at) values('test_hash_'||suffix,sid,'student',now()+interval '1 day');
 begin
   perform public.admin_student_update(teacher_id,sid,before_row.updated_at,jsonb_build_object('username',newname,'school','New school','class_no',6,'branch','B'));
   raise exception 'Non-owner unexpectedly edited student';
 exception when insufficient_privilege then null; end;
 result:=public.admin_student_update(owner_id,sid,before_row.updated_at,jsonb_build_object('username',newname,'school','New school','class_no',6,'branch','B','password_hash','pbkdf2$210000$new$new'));
 select * into after_row from public.students where id=sid;
 assert after_row.username=newname and after_row.class_no=6 and after_row.selected_class=6 and after_row.branch='B','owner updates fields';
 assert after_row.teacher_id=teacher_id and after_row.points=before_row.points and after_row.xp=before_row.xp and after_row.profile=before_row.profile,'identity, teacher and progress preserved';
 assert not exists(select 1 from public.portal_sessions where student_id=sid),'credentials revoke student sessions';
 assert not(result ? 'password_hash'),'hash never returned';
 begin
   perform public.admin_student_update(owner_id,sid,before_row.updated_at,jsonb_build_object('username',newname,'class_no',6,'branch','B'));
   raise exception 'Stale edit unexpectedly succeeded';
 exception when serialization_failure then null; end;
 begin
   perform public.teacher_students_create(teacher_id,jsonb_build_array(jsonb_build_object('username',upper(newname),'password_hash','pbkdf2$210000$test$test','class_no',5,'branch','A')));
   raise exception 'Duplicate username unexpectedly succeeded';
 exception when unique_violation then null; end;
 assert not has_function_privilege('anon','public.student_contact_state(uuid,boolean)','execute');
 assert not has_function_privilege('authenticated','public.admin_student_update(uuid,uuid,timestamptz,jsonb)','execute');
 assert not has_function_privilege('authenticated','public.teacher_students_create(uuid,jsonb)','execute');
 assert has_function_privilege('service_role','public.teacher_students_create(uuid,jsonb)','execute');
end $$;
rollback;
select 'student management, permissions and contact deadlines passed' as result;
