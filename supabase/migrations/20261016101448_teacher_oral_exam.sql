-- Persistent per-student vocabulary history and teacher-authorized, exactly-once XP.
create table public.dm_oral_questions (
 id uuid primary key, teacher_id uuid not null references public.teachers(id),
 student_id uuid not null references public.students(id) on delete cascade,
 class_no int not null check(class_no between 1 and 8), unit_no int not null,
 word_key text not null, english text not null, turkish text not null,
 status text not null default 'pending' check(status in ('pending','correct','wrong')),
 xp int not null default 0 check(xp in (0,100)), created_at timestamptz not null default now(), graded_at timestamptz,
 unique(student_id,word_key)
);
create index dm_oral_teacher_history on public.dm_oral_questions(teacher_id,created_at desc);
alter table public.dm_oral_questions enable row level security;
revoke all on public.dm_oral_questions from public,anon,authenticated;
grant all on public.dm_oral_questions to service_role;

create function public.dm_oral_draw(actor uuid,pupil uuid,grade int,unit_id int,request_id uuid)
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
  if q.teacher_id<>actor or q.student_id<>pupil or q.class_no<>grade or q.unit_no<>unit_id then raise exception 'Geçersiz soru isteği.';end if;
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

create function public.dm_oral_grade(actor uuid,question_id uuid,known boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.teachers;s public.students;q public.dm_oral_questions;v jsonb;ver bigint;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 select * into t from public.teachers where id=actor and active is not false;
 if not found then raise exception 'Aktif öğretmen hesabı gerekli.';end if;
 select * into q from public.dm_oral_questions where id=question_id and teacher_id=actor;
 if not found or known is null then raise exception 'Soru bulunamadı.';end if;
 select * into s from public.students where id=q.student_id and status='approved' and role='student' for update;
 if not found or (not coalesce(t.is_admin,false) and s.teacher_id is distinct from actor) then raise exception 'Bu öğrenciye erişim yetkiniz yok.';end if;
 select * into q from public.dm_oral_questions where id=question_id for update;
 if q.status<>'pending' then return jsonb_build_object('ok',true,'alreadyGraded',true,'xp',q.xp,'question',to_jsonb(q));end if;
 if known then
  select value into v from public.extra_data where student_id=s.id and key_name='yo' for update;
  if v is null then raise exception 'Öğrenci hesap bilgileri hazır değil.';end if;
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+100,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
  v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+100));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+100));
  update public.extra_data set value=v,updated_at=now() where student_id=s.id and key_name='yo';
 end if;
 update public.dm_oral_questions set status=case when known then 'correct' else 'wrong' end,xp=case when known then 100 else 0 end,graded_at=now() where id=question_id returning * into q;
 return jsonb_build_object('ok',true,'xp',q.xp,'question',to_jsonb(q));
end $$;
revoke all on function public.dm_oral_draw(uuid,uuid,int,int,uuid),public.dm_oral_grade(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.dm_oral_draw(uuid,uuid,int,int,uuid),public.dm_oral_grade(uuid,uuid,boolean) to service_role;
