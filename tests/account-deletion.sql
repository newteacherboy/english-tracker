-- LOCAL TEST DATABASE ONLY. Invoked by account-deletion-db.mjs, never production.
-- Only generated synthetic accounts and their synthetic records are present.
do $$
declare
  teacher uuid:=gen_random_uuid(); student_a uuid:=gen_random_uuid(); student_b uuid:=gen_random_uuid();
  teacher_name text:='deletion-test-teacher-'||teacher;
  name_a text:='deletion-test-a-'||student_a; name_b text:='deletion-test-b-'||student_b;
  ticket_a text:=encode(extensions.gen_random_bytes(32),'hex');
  ticket_t text:=encode(extensions.gen_random_bytes(32),'hex');
  result jsonb; assignment bigint; sessions_before integer;
begin
  insert into public.teachers(id,username,password_hash,active,is_admin) values(teacher,teacher_name,'test-hash',true,false);
  insert into public.game_scores(game_key,student_name,score) values('test',teacher_name,25);
  insert into public.students(id,username,password_hash,status,teacher_id,points)
    values(student_a,name_a,'test-hash','approved',teacher,100),(student_b,name_b,'test-hash','approved',teacher,200);
  insert into public.portal_sessions(token_hash,student_id,role,expires_at) values(ticket_a,student_a,'student',now()+interval '1 day');
  insert into public.game_scores(game_key,student_id,student_name,score)
    values('test',student_a,name_a,50),('test',null,name_a,40),('test',student_b,name_b,30);
  insert into public.badges(student_name,name) values(name_a,'Synthetic badge');
  insert into public.assignments(teacher_id,class_no,kind,title) values(teacher,5,'ders','Synthetic lesson') returning id into assignment;
  insert into public.assignment_status(assignment_id,student_id) values(assignment,student_a),(assignment,student_b);
  insert into public.mail_queue(student_id,to_email,subject) values(student_a,'test@example.invalid','Synthetic mail');
  insert into public.notifications(recipient_student_id,sender_student_id,message)
    values(student_b,student_a,'Synthetic gift'),(student_b,null,'Unrelated system notice');
  insert into public.extra_data(student_id,key_name,value)
    values(student_b,'test',jsonb_build_object('opponent',name_a,'score',123,'own',name_b));
  insert into public.class_point_actions(teacher_id,student_ids,change_amount)
    values(teacher,jsonb_build_array(name_a,name_b),10);
  insert into public.legacy_import_rows(sheet_name,source_row_no,source_headers,source_row)
    values('Synthetic',1,jsonb_build_array('Öğrenci'),jsonb_build_object('Öğrenci',name_a));
  insert into public.legacy_unmapped_rows(sheet_name,source_row,source_row_data)
    values('Synthetic',1,jsonb_build_object('OgrenciAdi',name_a));
  insert into public.diji_deletion_tickets(token_hash,account_id,account_role,password_hash_snapshot)
    values(ticket_a,student_a,'student','test-hash');
  begin
    perform public.diji_delete_account(ticket_a,'WRONG');
    raise exception 'test_failed_confirmation';
  exception when others then
    if sqlerrm='test_failed_confirmation' then raise; end if;
    if sqlerrm<>'confirmation_required' then raise; end if;
  end;
  if not exists(select 1 from public.students where id=student_a) then raise exception 'test_deleted_before_confirmation'; end if;
  result:=public.diji_delete_account(ticket_a,'HESABIMI SİL');
  if not (result->>'ok')::boolean then raise exception 'test_student_not_deleted'; end if;
  if exists(select 1 from public.students where id=student_a)
    or exists(select 1 from public.game_scores where student_name=name_a)
    or exists(select 1 from public.portal_sessions where student_id=student_a)
    or exists(select 1 from public.assignment_status where student_id=student_a)
    or exists(select 1 from public.mail_queue where student_id=student_a)
    or exists(select 1 from public.notifications where sender_student_id=student_a)
    or exists(select 1 from public.legacy_import_rows where source_row->>'Öğrenci'=name_a)
    or exists(select 1 from public.legacy_unmapped_rows where source_row_data->>'OgrenciAdi'=name_a)
    then raise exception 'test_residual_student_records'; end if;
  if not exists(select 1 from public.students where id=student_b and points=200)
    or not exists(select 1 from public.game_scores where student_id=student_b and score=30)
    or not exists(select 1 from public.assignment_status where student_id=student_b)
    or not exists(select 1 from public.extra_data where student_id=student_b and value->>'score'='123' and value->>'opponent'='Silinen hesap')
    then raise exception 'test_other_student_changed'; end if;
  if public.diji_delete_account(ticket_a,'HESABIMI SİL') is distinct from result then raise exception 'test_retry_not_idempotent'; end if;
  insert into public.diji_deletion_tickets(token_hash,account_id,account_role,password_hash_snapshot)
    values(ticket_t,teacher,'teacher','test-hash');
  perform public.diji_delete_account(ticket_t,'HESABIMI SİL');
  if exists(select 1 from public.teachers where id=teacher) then raise exception 'test_teacher_not_deleted'; end if;
  if exists(select 1 from public.game_scores where student_name=teacher_name) then raise exception 'test_teacher_scores_remain'; end if;
  if not exists(select 1 from public.students where id=student_b and teacher_id is null and points=200)
    or not exists(select 1 from public.assignments where id=assignment and teacher_id is null)
    then raise exception 'test_teacher_deleted_student_or_content'; end if;
  if not public.diji_deletion_rate_allow('synthetic-test-rate') then raise exception 'test_rate_first'; end if;
  perform public.diji_deletion_rate_allow('synthetic-test-rate');
  perform public.diji_deletion_rate_allow('synthetic-test-rate');
  perform public.diji_deletion_rate_allow('synthetic-test-rate');
  perform public.diji_deletion_rate_allow('synthetic-test-rate');
  if public.diji_deletion_rate_allow('synthetic-test-rate') then raise exception 'test_rate_limit_missing'; end if;
end $$;
