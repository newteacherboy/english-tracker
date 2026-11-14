-- Explicit, idempotent review setup. Never run on login or recreate a deleted learner.
begin;
do $$
declare demo_id uuid:='dcde2026-1015-4000-8000-000000000001';
        demo_teacher_id uuid:='dcde2026-1015-4000-8000-000000000002';
begin
 if not exists(select 1 from public.students where id=demo_id and username='dijimedu_demo' and status='approved' and frozen_at is null) then
  raise exception 'Active existing demo learner required';
 end if;
 insert into public.teachers(id,username,password_hash,display_name,full_name,active,is_admin,invite_code)
 values(demo_teacher_id,'dijimedu_demo_teacher','disabled-review-login:'||gen_random_uuid()::text,'Demo Öğretmen','Demo Öğretmen',true,false,upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)))
 on conflict(id) do nothing;
 if not exists(select 1 from public.teachers where id=demo_teacher_id and username='dijimedu_demo_teacher' and is_admin=false and active and frozen_at is null) then
  raise exception 'Demo teacher identity conflict';
 end if;
 insert into public.teacher_portal_access(student_id,teacher_id,state,code_digest,decided_at)
 values(demo_id,demo_teacher_id,'approved','demo-direct:'||gen_random_uuid()::text,now())
 on conflict(student_id) do nothing;
 if not exists(select 1 from public.teacher_portal_access where student_id=demo_id and teacher_id=demo_teacher_id and state='approved') then
  raise exception 'Demo grant identity conflict';
 end if;
end $$;
commit;
