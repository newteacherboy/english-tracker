-- New oral grading policy: +20 XP for known, up to -20 XP for unknown (never below zero).
-- Past graded questions retain their original XP; duplicate grading remains idempotent.
create or replace function public.dm_oral_grade(actor uuid,question_id uuid,known boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare delta int;answer_known boolean;expired boolean; t public.teachers;s public.students;q public.dm_oral_questions;v jsonb;ver bigint;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 select * into t from public.teachers where id=actor and active is not false;
 if not found then raise exception 'Aktif öğretmen hesabı gerekli.';end if;
 select * into q from public.dm_oral_questions where id=question_id and teacher_id=actor;
 if not found or known is null then raise exception 'Soru bulunamadı.';end if;
 select * into s from public.students where id=q.student_id and status='approved' and role='student' for update;
 if not found or (not coalesce(t.is_admin,false) and s.teacher_id is distinct from actor) then raise exception 'Bu öğrenciye erişim yetkiniz yok.';end if;
 select * into q from public.dm_oral_questions where id=question_id for update;
 if q.status<>'pending' then return jsonb_build_object('ok',true,'alreadyGraded',true,'xp',q.xp,'question',to_jsonb(q));end if;
 expired:=q.expires_at is not null and clock_timestamp()>=q.expires_at;
 answer_known:=known;
  select value into v from public.extra_data where student_id=s.id and key_name='yo' for update;
  if v is null then raise exception 'Öğrenci hesap bilgileri hazır değil.';end if;
  delta:=case when answer_known then 20 else -least(20,greatest(0,coalesce((v->>'totalXp')::numeric,0)))::int end;
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+delta,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
  v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+delta));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+delta));
  update public.extra_data set value=v,updated_at=now() where student_id=s.id and key_name='yo';
 update public.dm_oral_questions set status=case when answer_known then 'correct' else 'wrong' end,xp=delta,timed_out=expired,graded_at=now() where id=question_id returning * into q;
 return jsonb_build_object('ok',true,'xp',q.xp,'question',to_jsonb(q));
end $$;

