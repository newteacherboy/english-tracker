-- All reads/writes go through the existing authenticated portal APIs.
create table public.dm_release_flags(code text primary key, enabled boolean not null default true, updated_at timestamptz not null default now(), updated_by uuid references public.teachers(id) on delete set null);
alter table public.dm_release_flags enable row level security;
revoke all on public.dm_release_flags from public,anon,authenticated;
grant all on public.dm_release_flags to service_role;
create table public.dm_league_weeks(week_start date primary key, settled_at timestamptz);
create table public.dm_weekly_xp(student_id uuid references public.students(id) on delete cascade, week_start date not null, xp numeric not null default 0 check(xp>=0), active_days integer not null default 0, updated_at timestamptz not null default now(), primary key(student_id,week_start));
create table public.dm_weekly_results(student_id uuid references public.students(id) on delete cascade, week_start date not null, rank_no integer not null, league text not null, xp numeric not null, active_days integer not null, gold integer not null default 0, energy integer not null default 0, summary jsonb not null, awarded_at timestamptz, shown_at timestamptz, primary key(student_id,week_start));
create index dm_weekly_results_pending on public.dm_weekly_results(student_id,week_start desc) where shown_at is null;
alter table public.dm_league_weeks enable row level security;
alter table public.dm_weekly_xp enable row level security;
alter table public.dm_weekly_results enable row level security;
revoke all on public.dm_league_weeks,public.dm_weekly_xp,public.dm_weekly_results from public,anon,authenticated;
grant all on public.dm_league_weeks,public.dm_weekly_xp,public.dm_weekly_results to service_role;

create function public.dm_week_start(w text) returns date language plpgsql immutable set search_path='' as $$
declare y int; n int; b date;
begin
 if w !~ '^\d{4}-H([1-9]|[1-4][0-9]|5[0-3])$' then return null; end if;
 y:=split_part(w,'-H',1)::int; n:=split_part(w,'-H',2)::int;
 if y<2020 or y>2100 then return null; end if;
 b:=date_trunc('week',make_date(y,1,4)::timestamp)::date + (n-1)*7;
 if extract(isoyear from b)<>y then return null; end if;
 return b;
end $$;
create function public.dm_capture_weekly_xp() returns trigger language plpgsql set search_path='' as $$
declare v jsonb; w date; days int; x numeric;
begin
 if new.key_name<>'yo' or jsonb_typeof(new.value)<>'object' then return new; end if;
 -- Preserve a freshly issued server reward against an older in-flight device save.
 if tg_op='UPDATE' and old.value ? 'dmRewardVersion' and coalesce((new.value->>'dmRewardVersion')::bigint,0)<coalesce((old.value->>'dmRewardVersion')::bigint,0) then
  new.value:=old.value; return new; -- stale device must reload the awarded balance
 end if;
 v:=new.value; w:=public.dm_week_start(v#>>'{lig,hafta}');
 if w is null or w<>date_trunc('week',now() at time zone 'Europe/Istanbul')::date then return new; end if;
 x:=greatest(0,least(1000000,coalesce((v#>>'{lig,xp}')::numeric,0)));
 select count(*) into days from jsonb_each(case when jsonb_typeof(v->'log')='object' then v->'log' else '{}'::jsonb end) d where d.key>=w::text and d.key<(w+7)::text and d.value::text ~ '^[0-9]+(\.[0-9]+)?$' and d.value::text::numeric>0;
 insert into public.dm_weekly_xp(student_id,week_start,xp,active_days) values(new.student_id,w,x,days)
 on conflict(student_id,week_start) do update set xp=greatest(dm_weekly_xp.xp,excluded.xp),active_days=greatest(dm_weekly_xp.active_days,excluded.active_days),updated_at=now();
 return new;
end $$;
create trigger dm_weekly_xp_capture before insert or update on public.extra_data for each row execute function public.dm_capture_weekly_xp();
-- Seed only the current week. No retrospective rewards from incomplete historical data.
insert into public.dm_league_weeks(week_start) values(date_trunc('week',now() at time zone 'Europe/Istanbul')::date);
insert into public.dm_weekly_xp(student_id,week_start,xp,active_days)
select s.id,date_trunc('week',now() at time zone 'Europe/Istanbul')::date,
 greatest(coalesce(case when public.dm_week_start(e.value#>>'{lig,hafta}')=date_trunc('week',now() at time zone 'Europe/Istanbul')::date then (e.value#>>'{lig,xp}')::numeric end,0),coalesce(case when public.dm_week_start(s.profile#>>'{lig,hafta}')=date_trunc('week',now() at time zone 'Europe/Istanbul')::date then (s.profile#>>'{lig,xp}')::numeric end,0)),
 (select count(*) from jsonb_each(case when jsonb_typeof(e.value->'log')='object' then e.value->'log' else '{}'::jsonb end) d where d.key>=date_trunc('week',now() at time zone 'Europe/Istanbul')::date::text and d.key<(date_trunc('week',now() at time zone 'Europe/Istanbul')::date+7)::text and d.value::text ~ '^[0-9]+(\.[0-9]+)?$' and d.value::text::numeric>0)
from public.students s left join public.extra_data e on e.student_id=s.id and e.key_name='yo' where s.status='approved' and s.role='student';

create function public.dm_week_metrics(sid uuid, b date) returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object(
 'games',(select count(*) from public.game_scores where student_id=sid and created_at>=b::timestamp at time zone 'Europe/Istanbul' and created_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'correct',(select coalesce(sum(correct_count),0) from public.game_scores where student_id=sid and created_at>=b::timestamp at time zone 'Europe/Istanbul' and created_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'wrong',(select coalesce(sum(wrong_count),0) from public.game_scores where student_id=sid and created_at>=b::timestamp at time zone 'Europe/Istanbul' and created_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'gameSeconds',(select coalesce(sum(duration_seconds),0) from public.game_scores where student_id=sid and created_at>=b::timestamp at time zone 'Europe/Istanbul' and created_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'topics',(select count(distinct topic_name) from public.lesson_progress where student_id=sid and test_success and completed_at>=b::timestamp at time zone 'Europe/Istanbul' and completed_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'levels',(select count(*) from public.level_completions where student_id=sid and completed_at>=b::timestamp at time zone 'Europe/Istanbul' and completed_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'videos',(select count(*) from public.student_videos where student_id=sid and watched_at>=b::timestamp at time zone 'Europe/Istanbul' and watched_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'activities',(select count(*) from public.student_activities where student_id=sid and completed_at>=b::timestamp at time zone 'Europe/Istanbul' and completed_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'homework',(select count(*) from public.assignment_status where student_id=sid and done_at>=b::timestamp at time zone 'Europe/Istanbul' and done_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'reading',(select count(*) from public.reading_results where student_id=sid and created_at>=b::timestamp at time zone 'Europe/Istanbul' and created_at<(b+7)::timestamp at time zone 'Europe/Istanbul'),
 'matches',(select count(*) from public.dm_matches where ((player_a=sid and result_a is not null) or (player_b=sid and result_b is not null)) and created_at>=b::timestamp at time zone 'Europe/Istanbul' and created_at<(b+7)::timestamp at time zone 'Europe/Istanbul')
);
$$;
create function public.dm_settle_weeks() returns integer language plpgsql set search_path='' as $$
declare b date; cur date:=date_trunc('week',now() at time zone 'Europe/Istanbul')::date; r record; g int; en int; c int:=0; enabled boolean;
begin
 perform pg_advisory_xact_lock(8031051);
 select coalesce(bool_and(f.enabled),true) into enabled from public.dm_release_flags f where f.code in ('lig','lig_odul');
 insert into public.dm_league_weeks(week_start) values(cur) on conflict do nothing;
 for b in select week_start from public.dm_league_weeks where week_start<cur and settled_at is null order by week_start loop
  for r in select s.id,s.username,coalesce(x.xp,0) xp,coalesce(x.active_days,0) active_days,
   row_number() over(order by coalesce(x.xp,0) desc,coalesce(nullif(s.profile->>'genelOrtalama','')::numeric,(select avg((tr.reading_score+tr.writing_score+tr.vocabulary_score+tr.speaking_score+tr.grammar_score)/5) from public.teacher_reports tr where tr.student_id=s.id),0) desc,s.username,s.id) rn
   from public.students s left join public.dm_weekly_xp x on x.student_id=s.id and x.week_start=b
   where s.status='approved' and s.role='student' and s.created_at<(b+7)::timestamp at time zone 'Europe/Istanbul' loop
   g:=0;en:=0;
   if enabled and r.rn<=10 and r.xp>0 then
    g:=(array[100,75,50,35,25,20,15,10,8,5])[r.rn::int];en:=(array[15,12,10,8,6,5,4,3,2,1])[r.rn::int];
   end if;
   insert into public.dm_weekly_results(student_id,week_start,rank_no,league,xp,active_days,gold,energy,summary)
   values(r.id,b,r.rn,case when r.rn<=10 then 'sampiyon' when r.rn<=30 then 'super' else 'yerel' end,r.xp,r.active_days,g,en,public.dm_week_metrics(r.id,b)) on conflict do nothing;
   c:=c+1;
  end loop;
  update public.dm_league_weeks set settled_at=now() where week_start=b;
 end loop;
 return c;
end $$;
-- Atomic award ledger: a week can credit a student only once, including two devices.
create function public.dm_weekly_claim(actor uuid) returns jsonb language plpgsql set search_path='' as $$
declare r public.dm_weekly_results; v jsonb; st public.students; ver bigint;
begin
 if not exists(select 1 from public.students where id=actor and status='approved' and role='student') then raise exception 'Öğrenci bulunamadı'; end if;
 select * into r from public.dm_weekly_results where student_id=actor and shown_at is null order by week_start desc limit 1 for update;
 if not found then return null; end if;
 if r.awarded_at is null then
  select * into st from public.students where id=actor for update;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  v:=coalesce(v,'{}'::jsonb);ver:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  if r.gold>0 or r.energy>0 then
   v:=jsonb_set(v,'{altin}',to_jsonb(greatest(coalesce((v->>'altin')::numeric,0),st.gold)+r.gold));
   v:=jsonb_set(v,'{guncelleme}',to_jsonb(ver));v:=jsonb_set(v,'{dmRewardVersion}',to_jsonb(ver));
   insert into public.extra_data(student_id,key_name,value,updated_at) values(actor,'yo',v,now()) on conflict(student_id,key_name) do update set value=excluded.value,updated_at=excluded.updated_at;
   update public.students set gold=(v->>'altin')::numeric,energy=least(500,energy+r.energy) where id=actor;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,r.energy,least(500,st.energy+r.energy),'Haftalık Şampiyonlar Ligi '||r.week_start);
  end if;
  update public.dm_weekly_results set awarded_at=now() where student_id=actor and week_start=r.week_start;
 end if;
 update public.dm_weekly_results set shown_at=now() where student_id=actor and week_start=r.week_start;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 return to_jsonb(r)||jsonb_build_object('yo',v,'energyBalance',(select energy from public.students where id=actor));
end $$;
-- Acknowledgement is scoped by the authenticated actor in the API.
create function public.dm_weekly_ack(actor uuid, week date) returns boolean language sql set search_path='' as $$
 with ack as (update public.dm_weekly_results set shown_at=coalesce(shown_at,now()) where student_id=actor and week_start=week returning 1) select exists(select 1 from ack);
$$;

create function public.dm_parent_report(actor uuid, class_filter int) returns jsonb language sql stable set search_path='' as $$
with auth as (select id,is_admin from public.teachers where id=actor and active), bounds as (select date_trunc('week',now() at time zone 'Europe/Istanbul')::date b), rows as (
 select s.id,s.username,s.class_no,s.branch,s.phone,s.total_seconds,s.streak,s.points,s.xp,s.gold,s.last_login_at,s.profile,
 coalesce(e.value,'{}'::jsonb) yo,b.b,
 coalesce((select xp from public.dm_weekly_xp where student_id=s.id and week_start=b.b),0) weekxp,
 coalesce((select active_days from public.dm_weekly_xp where student_id=s.id and week_start=b.b),0) days
 from public.students s cross join auth a cross join bounds b left join public.extra_data e on e.student_id=s.id and e.key_name='yo'
 where s.status='approved' and s.role='student' and (a.is_admin or s.teacher_id=a.id) and (class_filter is null or s.class_no=class_filter)
)
select coalesce(jsonb_agg(jsonb_build_object(
 'name',r.username,'class',r.class_no,'branch',r.branch,'phone',r.phone,'weekStart',r.b,'weekXP',r.weekxp,'activeDays',r.days,
 'metrics',public.dm_week_metrics(r.id,r.b),'totalXP',r.xp,'gold',r.gold,'points',r.points,'streak',r.streak,'totalSeconds',r.total_seconds,'lastLogin',r.last_login_at,
 'level',r.yo->'seviye','target',r.yo->'hedef','conversation',r.yo->'sohbet','dailyLog',r.yo->'log',
 'difficultWords',(select coalesce(jsonb_agg(z),'[]'::jsonb) from (select d.value z from jsonb_each(case when jsonb_typeof(r.yo->'zk')='object' then r.yo->'zk' else '{}'::jsonb end) d where coalesce((d.value->>'kutu')::int,0)<5 order by coalesce((d.value->>'yanlis')::int,0) desc limit 10) a),
 'learnedWords',(select count(*) from jsonb_each(case when jsonb_typeof(r.yo->'zk')='object' then r.yo->'zk' else '{}'::jsonb end) d where coalesce((d.value->>'kutu')::int,0)>=5),
 'gameDetails',(select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) from (select game_key,count(*) games,sum(correct_count) correct,sum(wrong_count) wrong,round(avg(score),1) avg_score,max(score) best_score,sum(duration_seconds) seconds from public.game_scores where student_id=r.id and created_at>=r.b::timestamp at time zone 'Europe/Istanbul' and created_at<(r.b+7)::timestamp at time zone 'Europe/Istanbul' group by game_key) g),
 'totalGames',(select count(*) from public.game_scores where student_id=r.id),
 'topics',(select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from (select level,topic_name,test_success,knew_it,completed_at from public.lesson_progress where student_id=r.id order by completed_at desc limit 25) l),
 'totalTopics',(select count(distinct topic_name) from public.lesson_progress where student_id=r.id and test_success),
 'totalLevels',(select count(*) from public.level_completions where student_id=r.id),
 'levels',(select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from (select mode,class_no,unit_no,level_no,completed_at from public.level_completions where student_id=r.id order by completed_at desc limit 15) l),
 'reading',(select coalesce(jsonb_agg(to_jsonb(z)),'[]'::jsonb) from (select words_read,duration_seconds,wpm,text_title,created_at from public.reading_results where student_id=r.id order by created_at desc limit 10) z),
 'reports',(select coalesce(jsonb_agg(to_jsonb(t)-'id'-'student_id'-'teacher_id'),'[]'::jsonb) from (select * from public.teacher_reports where student_id=r.id order by report_date desc limit 5) t),
 'homeworks',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from (select h.title,h.kind,h.due_date,h.note,x.done_at,x.score,x.stars from public.assignments h left join public.assignment_status x on x.assignment_id=h.id and x.student_id=r.id where h.active and h.class_no=r.class_no and (h.branch is null or h.branch='' or h.branch=r.branch) and (h.teacher_id=(select teacher_id from public.students where id=r.id)) order by h.due_date desc nulls last limit 20) a),
 'videos',(select coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) from (select vd.title,sv.watched_at from public.student_videos sv join public.videos vd on vd.id=sv.video_id where sv.student_id=r.id order by sv.watched_at desc nulls last limit 15) v),
 'activities',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from (select ac.display_name,sa.status,sa.completed_at,sa.result from public.student_activities sa join public.activities ac on ac.id=sa.activity_id where sa.student_id=r.id order by sa.assigned_at desc limit 15) a),
 'planCompleted',(select count(*) from public.student_plan_progress where student_id=r.id and completed),
 'badges',(select coalesce(jsonb_agg(jsonb_build_object('name',bd.name,'emoji',bd.emoji)),'[]'::jsonb) from public.badges bd where bd.required_points<=r.points and (bd.student_name is null or bd.student_name='' or lower(bd.student_name)='herkes' or bd.student_name=r.username)),
 'latestLeague',(select to_jsonb(z)-'student_id'-'yo' from public.dm_weekly_results z where student_id=r.id order by week_start desc limit 1)
) order by r.username),'[]'::jsonb) from rows r;
$$;
revoke execute on function public.dm_week_start(text),public.dm_capture_weekly_xp(),public.dm_week_metrics(uuid,date),public.dm_settle_weeks(),public.dm_weekly_claim(uuid),public.dm_weekly_ack(uuid,date),public.dm_parent_report(uuid,int) from public,anon,authenticated;
grant execute on function public.dm_week_start(text),public.dm_capture_weekly_xp(),public.dm_week_metrics(uuid,date),public.dm_settle_weeks(),public.dm_weekly_claim(uuid),public.dm_weekly_ack(uuid,date),public.dm_parent_report(uuid,int) to service_role;
-- Monday 00:05 Türkiye (UTC+3); small delay lets the last saves finish.
select cron.schedule('dm-weekly-league-settlement','5 21 * * 0','select public.dm_settle_weeks();');
