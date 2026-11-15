-- Disposable fixture only; never run against an application database.
create role anon; create role authenticated; create role service_role;
create table public.students(id uuid primary key, username text, gold numeric default 0);
create table public.extra_data(student_id uuid references public.students(id), key_name text, value jsonb, updated_at timestamptz default now(), primary key(student_id,key_name));
create table public.dm_game_reward_runs(student_id uuid,run_id text,game_key text,class_no integer,units integer[],xp integer,gold integer,created_at timestamptz default now(),topic_key text,primary key(student_id,run_id));
create table public.dm_topic_game_runs(run_id uuid primary key,student_id uuid,topic_key text,game text,answer_key jsonb,question_count integer,started_at timestamptz default now(),expires_at timestamptz default now()+interval '30 minutes',ranking_only boolean default false);
create table public.game_scores(student_id uuid,student_name text,game_key text,score numeric,correct_count integer,wrong_count integer,duration_seconds integer,extra jsonb);
CREATE OR REPLACE FUNCTION public.dm_teacher_topic_game_finish(actor uuid, run_key uuid, picks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.dm_topic_game_runs; v jsonb; i int; c int:=0; n int; x int:=0; used int; ver bigint;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='accuracy'; prior_scope text;
begin
 -- Serialize both wallet writes and daily quota checks across simultaneous runs.
 perform 1 from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_topic_game_runs where run_id=run_key and student_id=actor for update;
 if not found then return jsonb_build_object('ok',false,'sebep','missing','mesaj','Oyun oturumu bulunamadı veya tamamlandı.');end if;
 if r.expires_at<=clock_timestamp() then
  delete from public.dm_topic_game_runs where run_id=run_key;
  return jsonb_build_object('ok',false,'sebep','expired','mesaj','Oyun oturumunun süresi doldu.');
 end if;
 if jsonb_typeof(picks) is distinct from 'array' or jsonb_array_length(picks)<>r.question_count then raise exception 'Geçersiz cevaplar.';end if;
 n:=r.question_count;
 for i in 0..n-1 loop
  if jsonb_typeof(picks->i) is distinct from 'string' or not (r.answer_key->i->'allowed' @> jsonb_build_array(picks->i)) then raise exception 'Geçersiz cevaplar.';end if;
  if picks->>i=r.answer_key->i->>'correct' then c:=c+1;end if;
 end loop;
 select count(*) into used from public.dm_game_reward_runs where student_id=actor and topic_key=r.topic_key
 and game_key='konu:'||r.game and xp>0
 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul'
 and created_at<(day::date+1)::timestamp at time zone 'Europe/Istanbul';
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 x:=0;reason:='ranking_only';
 insert into public.game_scores(student_id,student_name,game_key,score,correct_count,wrong_count,duration_seconds,extra) select actor,username,'konu:'||r.game,round(c*100.0/n),c,n-c,greatest(1,extract(epoch from clock_timestamp()-r.started_at))::int,jsonb_build_object('ranking_only',true,'run_id',run_key,'topic',r.topic_key) from public.students where id=actor;
 delete from public.dm_topic_game_runs where run_id=run_key;
 delete from public.dm_topic_game_runs where expires_at<=now();
 return jsonb_build_object('ok',true,'dogru',c,'toplam',n,'yuzde',round(c*100.0/n),'xp',x,'xpHakkiKaldi',greatest(0,3-used-case when x>0 then 1 else 0 end),'sebep',reason,'yo',v);
end $function$
