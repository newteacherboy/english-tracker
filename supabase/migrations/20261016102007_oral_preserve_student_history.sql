-- Keep each student word history when a teacher account is removed.
alter table public.dm_oral_questions drop constraint dm_oral_questions_teacher_id_fkey;
alter table public.dm_oral_questions alter column teacher_id drop not null;
alter table public.dm_oral_questions add constraint dm_oral_questions_teacher_id_fkey foreign key (teacher_id) references public.teachers(id) on delete set null;
create or replace function public.dm_oral_draw(actor uuid,pupil uuid,grade int,unit_id int,request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.teachers;s public.students;q public.dm_oral_questions;w record;
begin
 select * into t from public.teachers where id=actor and active is not false;
 if not found then raise exception 'Aktif öğretmen hesabı gerekli.';end if;
 select * into s from public.students where id=pupil and status='approved' and role='student' for update;
 if not found or (not coalesce(t.is_admin,false) and s.teacher_id is distinct from actor) then raise exception 'Bu öğrenciye erişim yetkiniz yok.';end if;
 if grade not between 1 and 8 or grade is null or s.class_no is distinct from grade or unit_id is null or unit_id not between 1 and 100 then raise exception 'Öğrenci sınıfı ve ünite seçimini kontrol edin.';end if;
 select * into q from public.dm_oral_questions where id=request_id;
 if found then
  if q.teacher_id is distinct from actor or q.student_id<>pupil or q.class_no<>grade or q.unit_no<>unit_id then raise exception 'Geçersiz soru isteği.';end if;
  return jsonb_build_object('ok',true,'question',to_jsonb(q));
 end if;
 select * into q from public.dm_oral_questions where teacher_id=actor and student_id=pupil and class_no=grade and unit_no=unit_id and status='pending' order by created_at limit 1;
 if found then return jsonb_build_object('ok',true,'question',to_jsonb(q));end if;
 select b.english,b.turkish,lower(regexp_replace(btrim(b.english),'\s+',' ','g')) as word_key into w
 from public.word_bank b where b.active and b.class_no=grade and b.unit_no=unit_id
 and nullif(btrim(b.english),'') is not null and nullif(btrim(b.turkish),'') is not null
 and not exists(select 1 from public.dm_oral_questions h where h.student_id=pupil and h.word_key=lower(regexp_replace(btrim(b.english),'\s+',' ','g')))
 order by random() limit 1;
 if not found then return jsonb_build_object('ok',true,'exhausted',true,'mesaj','Bu ünitedeki tüm kelimeler bu öğrenciye soruldu. Başka bir ünite seçin.');end if;
 insert into public.dm_oral_questions(id,teacher_id,student_id,class_no,unit_no,word_key,english,turkish)
 values(request_id,actor,pupil,grade,unit_id,w.word_key,w.english,w.turkish) returning * into q;
 return jsonb_build_object('ok',true,'question',to_jsonb(q));
end $$;
