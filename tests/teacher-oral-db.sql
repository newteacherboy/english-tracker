begin;
set local role service_role;
do $$
declare tid uuid:=gen_random_uuid();other uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();v jsonb;a jsonb;qid uuid;first_id uuid;seen text[]:='{}';denied boolean:=false;prefix text:='oralqa'||replace(sid::text,'-','');before_xp numeric;
begin
 insert into public.teachers(id,username,password_hash) values(tid,'qa_'||tid,'test-disabled'),(other,'qa_'||other,'test-disabled');
 insert into public.students(id,username,password_hash,role,status,teacher_id,class_no) values(sid,'qa_'||sid,'test-disabled','student','approved',tid,8);
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":1000,"altin":321,"guncelleme":1}');
 insert into public.word_bank(class_no,unit_no,english,turkish,active) values(8,99,prefix||' apple','elma',true),(8,99,prefix||' bread','ekmek',true),(8,99,upper(prefix)||' APPLE','elma',true);
 begin perform public.dm_oral_draw(other,sid,8,99,gen_random_uuid());exception when others then denied:=true;end;
 if not denied then raise exception 'foreign teacher access';end if;
 -- Ignore any existing real unit-99 words by marking them as previously asked inside this rolled-back fixture.
 insert into public.dm_oral_questions(id,teacher_id,student_id,class_no,unit_no,word_key,english,turkish,status)
 select gen_random_uuid(),tid,sid,8,99,lower(regexp_replace(btrim(english),'\s+',' ','g')),min(english),min(turkish),'wrong' from public.word_bank where class_no=8 and unit_no=99 and active and english not ilike prefix||'%' group by lower(regexp_replace(btrim(english),'\s+',' ','g'));
 for i in 1..2 loop
  qid:=gen_random_uuid();v:=public.dm_oral_draw(tid,sid,8,99,qid);
  if v->>'exhausted'='true' then raise exception 'unexpected exhaustion';end if;
  if extract(epoch from ((v#>>'{question,expires_at}')::timestamptz-clock_timestamp())) not between 14 and 15.1 then raise exception 'question must start with fifteen seconds';end if;
  if v#>>'{question,word_key}'=any(seen) then raise exception 'repeated word';end if;
  seen:=array_append(seen,v#>>'{question,word_key}');
  a:=public.dm_oral_draw(tid,sid,8,99,gen_random_uuid());if a#>>'{question,id}'<>v#>>'{question,id}' then raise exception 'duplicate pending draw';end if;
  a:=public.dm_oral_grade(tid,qid,i=1);a:=public.dm_oral_grade(tid,qid,true);
  if i=1 then first_id:=qid;end if;
 end loop;
 select (value->>'totalXp')::numeric into before_xp from public.extra_data where student_id=sid and key_name='yo';
 if before_xp<>1000 or (select value->>'altin' from public.extra_data where student_id=sid and key_name='yo')<>'321' then raise exception 'wrong, repeated or non-exact XP credit';end if;
 a:=public.dm_oral_draw(tid,sid,8,99,first_id);if a#>>'{question,id}'<>first_id::text then raise exception 'request replay drew another word';end if;
 v:=public.dm_oral_draw(tid,sid,8,99,gen_random_uuid());if v->>'exhausted'<>'true' then raise exception 'word repeated after exhaustion';end if;
 qid:=gen_random_uuid();
 insert into public.dm_oral_questions(id,teacher_id,student_id,class_no,unit_no,word_key,english,turkish,expires_at) values(qid,tid,sid,8,99,prefix||' timeout',prefix||' timeout','süre',clock_timestamp()-interval '1 second');
 v:=public.dm_oral_draw(tid,sid,8,99,qid);
 if v#>>'{question,status}'<>'pending' or (select (value->>'totalXp')::numeric from public.extra_data where student_id=sid and key_name='yo')<>1000 then raise exception 'timeout changed XP without teacher decision';end if;
 v:=public.dm_oral_grade(tid,qid,true);a:=public.dm_oral_grade(tid,qid,false);
 if (v->>'xp')::int<>100 or v#>>'{question,status}'<>'correct' or v#>>'{question,timed_out}'<>'true' or (select (value->>'totalXp')::numeric from public.extra_data where student_id=sid and key_name='yo')<>1100 then raise exception 'teacher correct after expiry or duplicate decision';end if;
 update public.extra_data set value=jsonb_set(value,'{totalXp}','35') where student_id=sid and key_name='yo';
 qid:=gen_random_uuid();insert into public.dm_oral_questions(id,teacher_id,student_id,class_no,unit_no,word_key,english,turkish) values(qid,tid,sid,8,99,prefix||' low',prefix||' low','az');
 v:=public.dm_oral_grade(tid,qid,false);a:=public.dm_oral_grade(tid,qid,false);
 if (v->>'xp')::int<>-35 or (select (value->>'totalXp')::numeric from public.extra_data where student_id=sid and key_name='yo')<>0 then raise exception 'XP below zero or repeated penalty';end if;
 update public.students set teacher_id=other where id=sid;delete from public.teachers where id=tid;
 if (select count(*) from public.dm_oral_questions where student_id=sid and teacher_id is null and word_key like prefix||'%')<>4 then raise exception 'teacher deletion erased word history';end if;
 if has_function_privilege('anon','public.dm_oral_grade(uuid,uuid,boolean)','EXECUTE') or has_table_privilege('authenticated','public.dm_oral_questions','SELECT') then raise exception 'public oral access';end if;
end $$;
select 'PASS: teacher scope, persistent deduplication, pending/replayed requests, exactly 100 XP once, wrong minus 100, expiry reveals without grading, late teacher correct accepted, zero XP floor, unchanged gold and exhausted pool' as result;
rollback;
